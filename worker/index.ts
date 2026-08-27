import * as cheerio from "cheerio";
import { db } from "../lib/db";
import { normalizeProduct } from "../lib/product-normalization";
import { putOfficialProductImage } from "../lib/storage";
import { extractPdfOffers, type FlyerProductImage } from "./flyer-ocr";

type Source = { kind: "DAILY_OFFER" | "FLYER"; url: string };
type Market = {
  name: string;
  slug: string;
  store: string;
  district: string;
  sources: Source[];
};

const markets: Market[] = [
  {
    name: "Coelho Diniz",
    slug: "coelho-diniz",
    store: "Referência Centro",
    district: "Centro",
    sources: [
      {
        kind: "DAILY_OFFER",
        url: "https://www.coelhodiniz.com.br/ofertas-do-dia/",
      },
      { kind: "FLYER", url: "https://www.coelhodiniz.com.br/oferta/" },
    ],
  },
  {
    name: "Big Mais",
    slug: "big-mais",
    store: "Referência São Pedro",
    district: "São Pedro",
    sources: [
      { kind: "FLYER", url: "https://bigmais.com.br/folheto-de-ofertas/" },
    ],
  },
  {
    name: "Supermercados BH",
    slug: "supermercados-bh",
    store: "Referência Governador Valadares",
    district: "Governador Valadares",
    sources: [
      {
        kind: "DAILY_OFFER",
        url: "https://www.supermercadosbh.com.br/governador-valadares/ofertas/",
      },
    ],
  },
];

type ExtractedOffer = { name: string; price: number; imageUrl?: string };

const parsePrice = (value: string) =>
  Number(value.replace("R$", "").replace(".", "").replace(",", ".").trim());

function words(value: string) {
  return new Set(
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z]{4,}/g)
      ?.filter(
        (word) =>
          !["oferta", "preco", "precos", "unidade", "fragrancias"].includes(
            word,
          ),
      ) ?? [],
  );
}

function matchFlyerImage(
  offer: ExtractedOffer,
  images: FlyerProductImage[],
  usedImages: Set<number>,
) {
  const offerWords = words(offer.name);
  let winner: {
    image: FlyerProductImage;
    index: number;
    score: number;
  } | null = null;
  for (const [index, image] of images.entries()) {
    if (usedImages.has(index)) continue;
    const shared = [...offerWords].filter((word) =>
      words(image.text).has(word),
    );
    const score = shared.length / Math.max(1, offerWords.size);
    if (shared.length > 0 && (!winner || score > winner.score))
      winner = { image, index, score };
  }
  if (!winner || winner.score < 0.25) return null;
  usedImages.add(winner.index);
  return winner.image;
}

function extractOffers(html: string, sourceUrl: string) {
  const $ = cheerio.load(html);
  const offers = new Map<string, ExtractedOffer>();
  $("article, li, .product, .produto, .item").each((_, element) => {
    const text = $(element).text().replace(/\s+/g, " ").trim();
    const priceText = text.match(/R\$\s*[\d.]+,\d{2}/)?.[0];
    const name =
      $(element).find("img").first().attr("alt")?.trim() ||
      text.replace(/R\$\s*[\d.]+,\d{2}.*/, "").trim();
    const image = $(element).find("img").first();
    const imageUrl = image.attr("data-src") ?? image.attr("src");
    if (priceText && name.length > 2 && name.length < 180)
      offers.set(normalizeProduct(name).normalized, {
        name,
        price: parsePrice(priceText),
        imageUrl: imageUrl
          ? new URL(imageUrl, sourceUrl).toString()
          : undefined,
      });
  });
  return [...offers.values()];
}

async function persistOffer(
  offer: ExtractedOffer & { confidence?: number },
  marketId: string,
  storeId: string,
  marketSlug: string,
  sourceUrl: string,
  source: "DAILY_OFFER" | "FLYER",
) {
  const productData = normalizeProduct(offer.name);
  const product = await db.product.upsert({
    where: { normalized: productData.normalized },
    update: productData,
    create: productData,
  });
  if (offer.imageUrl) {
    try {
      await persistOfficialImage(
        offer.imageUrl,
        product.id,
        marketId,
        marketSlug,
      );
    } catch (error) {
      console.warn(`Imagem oficial indisponível para ${product.name}`, error);
    }
  }
  await db.offer.create({
    data: {
      productId: product.id,
      marketId,
      storeId,
      price: offer.price,
      kind: "CURRENT",
      source,
      sourceUrl,
      validFrom: new Date(),
      confidence: offer.confidence ?? 1,
      reviewState: (offer.confidence ?? 1) >= 0.8 ? "APPROVED" : "PENDING",
    },
  });
  return product;
}

async function persistOfficialImage(
  imageUrl: string,
  productId: string,
  marketId: string,
  marketSlug: string,
) {
  const existing = await db.productImage.findFirst({
    where: {
      productId,
      marketId,
      source: "MARKET",
      status: "APPROVED",
    },
  });
  if (existing) return;
  const response = await fetch(imageUrl, {
    headers: { "User-Agent": "EconomizaGV/1.0" },
  });
  const contentType = response.headers.get("content-type")?.split(";")[0];
  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    !response.ok ||
    !["image/jpeg", "image/png", "image/webp"].includes(contentType ?? "") ||
    bytes.length === 0 ||
    bytes.length > 5 * 1024 * 1024
  )
    throw new Error("arquivo de imagem inválido");
  const imageContentType = contentType as
    | "image/jpeg"
    | "image/png"
    | "image/webp";
  const image = await putOfficialProductImage(
    bytes,
    imageContentType,
    marketSlug,
    productId,
  );
  await db.productImage.create({
    data: {
      productId,
      marketId,
      url: image.url,
      storageKey: image.key,
      source: "MARKET",
      status: "APPROVED",
    },
  });
}

async function persistFlyerImage(
  flyerImage: FlyerProductImage,
  productId: string,
  marketId: string,
  marketSlug: string,
) {
  const existing = await db.productImage.findFirst({
    where: {
      productId,
      marketId,
      source: "MARKET",
      status: "APPROVED",
    },
  });
  if (existing) return;
  const image = await putOfficialProductImage(
    flyerImage.data,
    flyerImage.contentType,
    marketSlug,
    productId,
  );
  await db.productImage.create({
    data: {
      productId,
      marketId,
      url: image.url,
      storageKey: image.key,
      source: "MARKET",
      status: "APPROVED",
    },
  });
}

async function processFlyer(
  url: string,
  marketId: string,
  storeId: string,
  marketSlug: string,
) {
  const response = await fetch(url, {
    headers: { "User-Agent": "EconomizaGV/1.0" },
  });
  if (!response.ok) throw new Error(`${response.status} ao baixar ${url}`);
  const { text, offers, images } = await extractPdfOffers(
    Buffer.from(await response.arrayBuffer()),
  );
  const document = await db.sourceDocument.update({
    where: { marketId_url: { marketId, url } },
    data: {
      extractedText: text,
      ocrConfidence: offers.length
        ? Math.min(...offers.map((offer) => offer.confidence))
        : 0,
      processedAt: new Date(),
      status: offers.length ? "APPROVED" : "PENDING",
    },
  });
  await db.offer.deleteMany({
    where: { marketId, storeId, sourceUrl: document.url },
  });
  const usedImages = new Set<number>();
  for (const offer of offers) {
    const product = await persistOffer(
      offer,
      marketId,
      storeId,
      marketSlug,
      url,
      "FLYER",
    );
    const image = matchFlyerImage(offer, images, usedImages);
    if (image)
      try {
        await persistFlyerImage(image, product.id, marketId, marketSlug);
      } catch (error) {
        console.warn(
          `Imagem do panfleto indisponível para ${product.name}`,
          error,
        );
      }
  }
  return offers.length;
}

async function ingest(definition: Market) {
  const market = await db.market.upsert({
    where: { slug: definition.slug },
    update: { name: definition.name },
    create: { name: definition.name, slug: definition.slug },
  });
  const store = await db.store.upsert({
    where: { marketId_name: { marketId: market.id, name: definition.store } },
    update: { district: definition.district },
    create: {
      marketId: market.id,
      name: definition.store,
      district: definition.district,
    },
  });
  const run = await db.collectionRun.create({
    data: { marketId: market.id, status: "RUNNING" },
  });
  try {
    let discovered = 0;
    let published = 0;
    for (const source of definition.sources) {
      const response = await fetch(source.url, {
        headers: { "User-Agent": "EconomizaGV/1.0" },
      });
      if (!response.ok)
        throw new Error(`${response.status} ao buscar ${source.url}`);
      const html = await response.text();
      const $ = cheerio.load(html);
      const urls = [
        source.url,
        ...$("a[href$='.pdf']")
          .map((_, link) =>
            new URL($(link).attr("href") ?? "", source.url).toString(),
          )
          .get(),
      ];
      await Promise.all(
        urls.map((url) =>
          db.sourceDocument.upsert({
            where: { marketId_url: { marketId: market.id, url } },
            update: { fetchedAt: new Date() },
            create: {
              marketId: market.id,
              url,
              kind: url.endsWith(".pdf") ? "FLYER" : source.kind,
              status: url.endsWith(".pdf") ? "PENDING" : "APPROVED",
            },
          }),
        ),
      );
      for (const offer of source.kind === "DAILY_OFFER"
        ? extractOffers(html, source.url)
        : []) {
        discovered++;
        await persistOffer(
          offer,
          market.id,
          store.id,
          market.slug,
          source.url,
          source.kind,
        );
        published++;
      }
      for (const url of urls.filter((url) =>
        url.toLowerCase().includes(".pdf"),
      )) {
        const count = await processFlyer(url, market.id, store.id, market.slug);
        discovered += count;
        published += count;
      }
    }
    await db.collectionRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED", endedAt: new Date(), discovered, published },
    });
  } catch (error) {
    await db.collectionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        endedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

await Promise.all(markets.map(ingest));
await db.$disconnect();
