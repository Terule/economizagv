import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export type FlyerOffer = { name: string; price: number; confidence: number };

function parseMoney(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
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
    if (name.length < 4 || name.length > 180 || price <= 0) continue;
    const confidence = /\b(?:g|kg|ml|l|sach[eê]|cápsula|pcte|unid)/i.test(name)
      ? 0.82
      : 0.58;
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
    const offers = extractFlyerOffers(text);
    return { text, offers };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
