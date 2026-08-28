import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const exec = promisify(execFile);

export type FlyerOffer = { name: string; price: number; confidence: number };
export type FlyerProductImage = {
  data: Buffer;
  text: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
};
export type FlyerValidity = { validFrom: Date; validUntil: Date };

function parseMoney(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function dateAtEndOfDay(day: number, month: number, year: number) {
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function normalizeYear(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const year = Number(value);
  return year < 100 ? 2_000 + year : year;
}

/** Extracts the validity printed on Brazilian flyers, without inferring dates. */
export function extractFlyerValidity(
  text: string,
  fallbackYear = new Date().getFullYear(),
): FlyerValidity | null {
  const range = text.match(
    /v[aá]lid(?:ade|as)?\s*(?:de)?\s*(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\s*(?:a|at[eé])\s*(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/i,
  );
  if (!range) return null;
  const [, fromDay, fromMonth, fromYear, untilDay, untilMonth, untilYear] =
    range;
  const startYear = normalizeYear(
    fromYear,
    normalizeYear(untilYear, fallbackYear),
  );
  const endYear = normalizeYear(untilYear, startYear);
  const validFrom = new Date(startYear, Number(fromMonth) - 1, Number(fromDay));
  const validUntil = dateAtEndOfDay(
    Number(untilDay),
    Number(untilMonth),
    endYear,
  );
  if (Number.isNaN(validFrom.valueOf()) || validUntil < validFrom) return null;
  return { validFrom, validUntil };
}

const ignoredName =
  /\b(?:exclusivo|oferta|preco|preço|desconto|pague|leve|unidade|cada|r\$)\b/i;
const packageTerm =
  /\b(?:\d+(?:[.,]\d+)?\s?(?:g|kg|ml|l)|sach[eê]|cápsula|pcte|pacote|unid(?:ade)?s?)\b/gi;

function candidateConfidence(name: string) {
  const words = name.match(/[a-záàâãéêíóôõúç]{3,}/gi) ?? [];
  const productWords = words.filter(
    (word) =>
      !/^(gramas?|litros?|metros?|unidades?|fragrancias?|sabores?)$/i.test(
        word,
      ),
  );
  const packages = name.match(packageTerm)?.length ?? 0;
  const separators = (name.match(/\|/g) ?? []).length;

  if (
    ignoredName.test(name) ||
    productWords.length === 0 ||
    separators > 1 ||
    packages > 2
  )
    return 0;
  if (productWords.length === 1 && packages === 0) return 0.45;
  return packages > 0 ? 0.9 : 0.7;
}

/**
 * Produces conservative candidates: a candidate always needs a Brazilian price
 * and nearby descriptive text. Low-confidence candidates stay in admin review.
 */
export function extractFlyerOffers(text: string): FlyerOffer[] {
  const candidates = new Map<string, FlyerOffer>();
  const money = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})?,\d{2})/g;
  for (const match of text.matchAll(money)) {
    const matchIndex = match.index ?? 0;
    const before = text.slice(Math.max(0, matchIndex - 220), matchIndex);
    const lines = before
      .split(/\n| {3,}/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(
        (line) =>
          line.length > 2 && !/^(de|por|r\$|exclusivo|preço)/i.test(line),
      );
    const name = lines
      .slice(-3)
      .join(" ")
      .replace(/\b\d+[.,]\d{2}\b/g, "")
      .trim();
    const price = parseMoney(match[1]);
    if (name.length < 4 || name.length > 120 || price <= 0) continue;
    const confidence = candidateConfidence(name);
    if (confidence === 0) continue;
    candidates.set(`${name}-${price}`, { name, price, confidence });
  }
  return [...candidates.values()];
}

async function ocrPages(pdfPath: string, directory: string) {
  const prefix = join(directory, "page");
  await exec("pdftoppm", ["-r", "220", "-png", pdfPath, prefix]);
  const { stdout } = await exec("sh", [
    "-c",
    `for f in ${prefix}-*.png; do tesseract "$f" stdout -l por 2>/dev/null; done`,
  ]);
  return stdout;
}

function cardsPerRow(count: number) {
  if (count <= 4) return count;
  if (count <= 7) return 7;
  return 5;
}

/**
 * Flyer artwork often places several products in one flattened page image,
 * rather than embedding one image per product. Render and crop those official
 * pages into card-sized images so every extracted offer can still display the
 * visual supplied by the supermarket.
 */
async function extractOfferCardImages(
  pdfPath: string,
  directory: string,
  offersByPage: FlyerOffer[][],
) {
  try {
    const prefix = join(directory, "offer-page");
    await exec("pdftoppm", ["-r", "150", "-png", pdfPath, prefix]);
    const renderedPages = (await readdir(directory))
      .filter((file) => file.startsWith("offer-page-") && /\.png$/i.test(file))
      .sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true }),
      );
    const images: FlyerProductImage[] = [];

    for (const [pageIndex, offers] of offersByPage.entries()) {
      if (!offers.length) continue;
      const renderedPage = renderedPages[pageIndex];
      if (!renderedPage) continue;
      const pagePath = join(directory, renderedPage);
      const page = sharp(pagePath);
      const metadata = await page.metadata();
      if (!metadata.width || !metadata.height) continue;

      const columns = cardsPerRow(offers.length);
      const rows = Math.ceil(offers.length / columns);
      const cellWidth = Math.floor(metadata.width / columns);
      const cellHeight = Math.floor(metadata.height / rows);
      const horizontalInset = Math.floor(cellWidth * 0.025);
      const verticalInset = Math.floor(cellHeight * 0.025);

      for (const [offerIndex, offer] of offers.entries()) {
        const column = offerIndex % columns;
        const row = Math.floor(offerIndex / columns);
        const left = column * cellWidth + horizontalInset;
        const top = row * cellHeight + verticalInset;
        const width = Math.min(
          cellWidth - horizontalInset * 2,
          metadata.width - left,
        );
        const height = Math.min(
          cellHeight - verticalInset * 2,
          metadata.height - top,
        );
        if (width < 32 || height < 32) continue;
        const data = await sharp(pagePath)
          .extract({ left, top, width, height })
          .webp({ quality: 88 })
          .toBuffer();
        images.push({ data, text: offer.name, contentType: "image/webp" });
      }
    }
    return images;
  } catch (error) {
    console.warn("Não foi possível recortar as ofertas do panfleto", error);
    return [];
  }
}

export async function extractPdfOffers(pdf: Buffer) {
  const directory = await mkdtemp(join(tmpdir(), "economizagv-flyer-"));
  const pdfPath = join(directory, "flyer.pdf");
  try {
    await writeFile(pdfPath, pdf);
    let text = "";
    try {
      await exec("pdftotext", [
        "-layout",
        "-enc",
        "UTF-8",
        pdfPath,
        join(directory, "flyer.txt"),
      ]);
      text = await readFile(join(directory, "flyer.txt"), "utf8");
    } catch {
      // OCR below is the intended fallback for image-only PDFs.
    }
    if (text.replace(/\s/g, "").length < 200)
      text = await ocrPages(pdfPath, directory);
    const offersByPage = text
      .split("\f")
      .map((pageText) => extractFlyerOffers(pageText));
    const offers = offersByPage.flat();
    const images = await extractOfferCardImages(
      pdfPath,
      directory,
      offersByPage,
    );
    return {
      text,
      offers,
      images,
      validity: extractFlyerValidity(text),
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
