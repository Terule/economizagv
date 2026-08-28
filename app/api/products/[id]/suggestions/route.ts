import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findBetterPackages } from "@/lib/value-suggestions";

const currentOffer = {
  reviewState: "APPROVED" as const,
  kind: "CURRENT" as const,
  validUntil: { gte: new Date() },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const products = await db.product.findMany({
    include: {
      images: {
        where: { status: "APPROVED" },
        include: { market: true },
        orderBy: { createdAt: "desc" },
      },
      offers: {
        where: currentOffer,
        include: { market: true, store: true },
        orderBy: { price: "asc" },
      },
    },
  });
  const source = products.find((product) => product.id === id);
  if (!source) return NextResponse.json({ suggestion: null }, { status: 404 });

  const matches = findBetterPackages(
    {
      id: source.id,
      name: source.name,
      brand: source.brand,
      variant: source.variant,
      packageSize: source.packageSize,
      prices: source.offers.map((offer) => ({ amount: Number(offer.price) })),
    },
    products.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      variant: product.variant,
      packageSize: product.packageSize,
      prices: product.offers.map((offer) => ({ amount: Number(offer.price) })),
    })),
  );
  const match = matches[0];
  if (!match) return NextResponse.json({ suggestion: null });
  const candidate = products.find(
    (product) => product.id === match.candidate.id,
  );
  if (!candidate) return NextResponse.json({ suggestion: null });
  const offer = candidate.offers.find(
    (item) => Number(item.price) === match.price.amount,
  );
  if (!offer) return NextResponse.json({ suggestion: null });
  const image = candidate.images.find(
    (item) => item.marketId === offer.marketId,
  );

  return NextResponse.json({
    suggestion: {
      product: {
        id: candidate.id,
        name: candidate.name,
        brand: candidate.brand ?? "Sem marca",
        packageSize: candidate.packageSize ?? "Embalagem não informada",
        image: image?.url,
        marketImages: candidate.images.flatMap((item) =>
          item.market ? [{ market: item.market.name, url: item.url }] : [],
        ),
        prices: [
          {
            id: offer.id,
            market: offer.market.name,
            district: offer.store.district,
            amount: Number(offer.price),
            type: "vigente",
            referenceDate: offer.capturedAt.toLocaleDateString("pt-BR"),
            validUntil: offer.validUntil?.toLocaleDateString("pt-BR"),
            image: image?.url,
          },
        ],
      },
      price: {
        id: offer.id,
        market: offer.market.name,
        district: offer.store.district,
        amount: Number(offer.price),
        type: "vigente",
        referenceDate: offer.capturedAt.toLocaleDateString("pt-BR"),
        validUntil: offer.validUntil?.toLocaleDateString("pt-BR"),
        image: image?.url,
      },
      unitPrice: match.unitPrice,
      unit: match.measure.baseUnit,
      savingsPercent: match.savingsPercent,
    },
  });
}
