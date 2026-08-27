import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { putMarketLogo } from "@/lib/storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isAdmin(session.user.email))
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const file = (await request.formData()).get("logo");
  if (
    !(file instanceof File) ||
    !file.type.startsWith("image/") ||
    file.size > 2 * 1024 * 1024
  )
    return NextResponse.json(
      { error: "Envie uma imagem quadrada de até 2 MB." },
      { status: 400 },
    );
  const { slug } = await params;
  const logo = await putMarketLogo(file, slug);
  const market = await db.market.update({
    where: { slug },
    data: { logoUrl: logo.url, logoStorageKey: logo.key },
  });
  return NextResponse.json({ logoUrl: market.logoUrl });
}
