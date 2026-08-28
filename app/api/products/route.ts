import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  const visibleOffer = {
    reviewState: "APPROVED" as const,
    OR: [
      { kind: { not: "CURRENT" as const } },
      { kind: "CURRENT" as const, validUntil: { gte: new Date() } },
    ],
  };
  const products = await db.product.findMany({
    where: {
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
      offers: { some: visibleOffer },
    },
    include: {
      images: {
        where: { status: "APPROVED" },
        include: { market: true },
        orderBy: { createdAt: "desc" },
      },
      offers: {
        where: visibleOffer,
        include: { market: true, store: true },
        orderBy: { capturedAt: "desc" },
      },
    },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(products);
}
