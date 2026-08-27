import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  const products = await db.product.findMany({
    where: {
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
      offers: { some: { reviewState: "APPROVED" } },
    },
    include: {
      images: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      offers: {
        where: { reviewState: "APPROVED" },
        include: { market: true, store: true },
        orderBy: { capturedAt: "desc" },
      },
    },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(products);
}
