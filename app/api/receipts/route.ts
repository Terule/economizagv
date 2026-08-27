import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { putTemporaryReceipt } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  }
  const form = await request.formData();
  const file = form.get("file");
  const marketId = form.get("marketId");
  const storeId = form.get("storeId");
  const purchasedAt = form.get("purchasedAt");
  if (
    !(file instanceof File) ||
    !marketId ||
    !storeId ||
    !purchasedAt ||
    file.size === 0
  )
    return NextResponse.json(
      { error: "Dados do cupom incompletos." },
      { status: 400 },
    );
  if (!file.type.startsWith("image/") && file.type !== "application/pdf")
    return NextResponse.json(
      { error: "Envie uma imagem ou PDF." },
      { status: 400 },
    );
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json(
      { error: "O arquivo pode ter no máximo 10 MB." },
      { status: 400 },
    );
  const storageKey = await putTemporaryReceipt(file);
  const receipt = await db.receipt.create({
    data: {
      userId: session.user.id,
      marketId: String(marketId),
      storeId: String(storeId),
      purchasedAt: new Date(String(purchasedAt)),
      fileName: file.name,
      storageKey,
    },
  });
  // The file belongs in temporary SeaweedFS storage and is deleted after review.
  // OCR compares declared market/store/date before the review is allowed to publish offers.
  return NextResponse.json(
    {
      id: receipt.id,
      status: "PENDING",
      message: "Cupom enviado para conferência.",
    },
    { status: 202 },
  );
}
