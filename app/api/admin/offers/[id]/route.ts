import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  const reviewer = session?.user.email;
  if (!session || !reviewer || !isAdmin(reviewer))
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const authenticatedReviewer = reviewer;

  const body = (await request.json()) as {
    decision?: "APPROVED" | "REJECTED" | "LINK";
    productId?: string;
  };
  if (
    body.decision !== "APPROVED" &&
    body.decision !== "REJECTED" &&
    body.decision !== "LINK"
  )
    return NextResponse.json({ error: "Decisão inválida" }, { status: 400 });
  const decision = body.decision;

  const { id } = await params;
  const offer = await db.$transaction(async (tx) => {
    if (decision !== "LINK") {
      const updated = await tx.offer.update({
        where: { id },
        data: { reviewState: decision },
      });
      await tx.reviewLog.create({
        data: {
          entity: "Offer",
          entityId: updated.id,
          decision,
          reviewer: authenticatedReviewer,
        },
      });
      return updated;
    }

    if (!body.productId)
      throw new Error("Selecione o produto de destino para vincular.");
    const current = await tx.offer.findUniqueOrThrow({ where: { id } });
    await tx.product.findUniqueOrThrow({ where: { id: body.productId } });
    const updated = await tx.offer.update({
      where: { id },
      data: { productId: body.productId, reviewState: "APPROVED" },
    });
    const [offerCount, listItemCount] = await Promise.all([
      tx.offer.count({ where: { productId: current.productId } }),
      tx.listItem.count({ where: { productId: current.productId } }),
    ]);
    if (
      current.productId !== body.productId &&
      offerCount === 0 &&
      listItemCount === 0
    )
      await tx.product.delete({ where: { id: current.productId } });
    await tx.reviewLog.create({
      data: {
        entity: "Offer",
        entityId: updated.id,
        decision: "LINKED_TO_PRODUCT",
        reviewer: authenticatedReviewer,
      },
    });
    return updated;
  });
  return NextResponse.json({ id: offer.id, status: offer.reviewState });
}
