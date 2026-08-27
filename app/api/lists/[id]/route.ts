import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const listSchema = z.object({ name: z.string().trim().min(1).max(80) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  const input = listSchema.safeParse(await request.json());
  if (!input.success)
    return NextResponse.json(
      { error: "Nome da lista inválido." },
      { status: 400 },
    );
  const { id } = await params;
  const list = await db.shoppingList.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!list)
    return NextResponse.json(
      { error: "Lista não encontrada." },
      { status: 404 },
    );
  const updated = await db.shoppingList.update({
    where: { id },
    data: { name: input.data.name },
  });
  return NextResponse.json(updated);
}
