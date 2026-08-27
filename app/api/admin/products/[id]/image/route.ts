import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { putApprovedProductImage } from "@/lib/storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isAdmin(session.user.email))
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const formData = await request.formData();
  const file = formData.get("image");
  const marketId = formData.get("marketId");
  if (
    !(file instanceof File) ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size === 0 ||
    file.size > 5 * 1024 * 1024
  )
    return NextResponse.json(
      { error: "Envie uma imagem PNG, JPG ou WebP de até 5 MB." },
      { status: 400 },
    );
  const { id } = await params;
  await db.product.findUniqueOrThrow({ where: { id } });
  if (typeof marketId !== "string" || !marketId)
    return NextResponse.json(
      { error: "Selecione o supermercado da imagem." },
      { status: 400 },
    );
  await db.market.findUniqueOrThrow({ where: { id: marketId } });
  const image = await putApprovedProductImage(file, id);
  const record = await db.productImage.create({
    data: {
      productId: id,
      marketId,
      url: image.url,
      storageKey: image.key,
      source: "WEB",
      status: "APPROVED",
    },
  });
  await db.reviewLog.create({
    data: {
      entity: "ProductImage",
      entityId: record.id,
      decision: "APPROVED_BY_ADMIN_UPLOAD",
      reviewer: session.user.email ?? "admin",
    },
  });
  return NextResponse.json({ id: record.id, url: record.url }, { status: 201 });
}
