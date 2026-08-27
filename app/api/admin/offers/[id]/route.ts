import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isAdmin(session.user.email))
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = (await request.json()) as { decision?: string };
  if (body.decision !== "APPROVED" && body.decision !== "REJECTED")
    return NextResponse.json({ error: "Decisão inválida" }, { status: 400 });

  const { id } = await params;
  const offer = await db.offer.update({
    where: { id },
    data: { reviewState: body.decision },
  });
  await db.reviewLog.create({
    data: {
      entity: "Offer",
      entityId: offer.id,
      decision: body.decision,
      reviewer: session.user.email,
    },
  });
  return NextResponse.json({ id: offer.id, status: offer.reviewState });
}
