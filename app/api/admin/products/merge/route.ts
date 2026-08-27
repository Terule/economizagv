import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const reviewer = session?.user.email;
  if (!session || !reviewer || !isAdmin(reviewer))
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const authenticatedReviewer = reviewer;
  const body = (await request.json()) as {
    sourceProductId?: string;
    targetProductId?: string;
  };
  if (
    !body.sourceProductId ||
    !body.targetProductId ||
    body.sourceProductId === body.targetProductId
  )
    return NextResponse.json({ error: "Produtos inválidos" }, { status: 400 });
  const sourceProductId = body.sourceProductId;
  const targetProductId = body.targetProductId;

  await db.$transaction(async (tx) => {
    await tx.product.findUniqueOrThrow({ where: { id: targetProductId } });
    await tx.product.findUniqueOrThrow({ where: { id: sourceProductId } });
    await tx.offer.updateMany({
      where: { productId: sourceProductId },
      data: { productId: targetProductId },
    });
    await tx.listItem.updateMany({
      where: { productId: sourceProductId },
      data: { productId: targetProductId },
    });
    await tx.productImage.updateMany({
      where: { productId: sourceProductId },
      data: { productId: targetProductId },
    });
    await tx.product.delete({ where: { id: sourceProductId } });
    await tx.reviewLog.create({
      data: {
        entity: "Product",
        entityId: sourceProductId,
        decision: `MERGED_INTO:${targetProductId}`,
        reviewer: authenticatedReviewer,
      },
    });
  });
  return NextResponse.json({ ok: true });
}
