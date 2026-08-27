import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/storage";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isAdmin(session.user.email))
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const { id } = await params;
  const reviewer = session.user.email;
  const receipt = await db.receipt.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedBy: reviewer,
    },
  });
  await db.reviewLog.create({
    data: {
      entity: "Receipt",
      entityId: id,
      decision: "APPROVED",
      reviewer,
    },
  });
  await deleteObject(receipt.storageKey);
  return NextResponse.json({ id: receipt.id, status: receipt.status });
}
