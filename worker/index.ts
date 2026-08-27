import * as cheerio from "cheerio";
import { db } from "../lib/db";

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

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const parsePrice = (value: string) =>
  Number(value.replace("R$", "").replace(".", "").replace(",", ".").trim());

function extractOffers(html: string) {
  const $ = cheerio.load(html);
  const offers = new Map<string, { name: string; price: number }>();
  $("article, li, .product, .produto, .item").each((_, element) => {
    const text = $(element).text().replace(/\s+/g, " ").trim();
    const priceText = text.match(/R\$\s*[\d.]+,\d{2}/)?.[0];
    const name =
      $(element).find("img").first().attr("alt")?.trim() ||
      text.replace(/R\$\s*[\d.]+,\d{2}.*/, "").trim();
    if (priceText && name.length > 2 && name.length < 180)
      offers.set(normalize(name), { name, price: parsePrice(priceText) });
  });
  return [...offers.values()];
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
        ? extractOffers(html)
        : []) {
        discovered++;
        const product = await db.product.upsert({
          where: { normalized: normalize(offer.name) },
          update: { name: offer.name },
          create: { name: offer.name, normalized: normalize(offer.name) },
        });
        await db.offer.create({
          data: {
            productId: product.id,
            marketId: market.id,
            storeId: store.id,
            price: offer.price,
            kind: "CURRENT",
            source: source.kind,
            sourceUrl: source.url,
            validFrom: new Date(),
          },
        });
        published++;
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
