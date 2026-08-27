import { db } from "../lib/db";

type CollectedOffer = {
  name: string;
  price: number;
  sourceUrl: string;
  validUntil?: Date;
  confidence: number;
};
export interface MarketConnector {
  slug: string;
  collect(): Promise<CollectedOffer[]>;
}

// Each connector is deliberately isolated: a website change affects only one retailer.
const connectors: MarketConnector[] = [
  {
    slug: "coelho-diniz",
    async collect() {
      return [];
    },
  },
  {
    slug: "big-mais",
    async collect() {
      return [];
    },
  },
  {
    slug: "supermercados-bh",
    async collect() {
      return [];
    },
  },
];

async function run() {
  for (const connector of connectors) {
    try {
      const offers = await connector.collect();
      console.info(`[${connector.slug}] ${offers.length} ofertas coletadas`);
      // Map normalized products and upsert only high-confidence structured data here.
      // PDF/image-only material is sent to the ReviewStatus.PENDING queue for OCR review.
    } catch (error) {
      console.error(`[${connector.slug}] coleta falhou`, error);
    }
  }
  await db.$disconnect();
}
run();
