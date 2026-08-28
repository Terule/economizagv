import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const updateItem = z.object({
  quantity: z.number().int().positive().optional(),
  manualPrice: z.number().positive().nullable().optional(),
  productId: z.string().nullable().optional(),
  label: z.string().trim().min(1).max(180).optional(),
});

async function ownedItem(request: Request, listId: string, itemId: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const item = await db.listItem.findFirst({
    where: { id: itemId, listId, list: { userId: session.user.id } },
  });
  return { item, session };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;
  const owned = await ownedItem(request, id, itemId);
  if (!owned?.session)
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  if (!owned.item)
    return NextResponse.json(
      { error: "Item não encontrado." },
      { status: 404 },
    );
  const input = updateItem.safeParse(await request.json());
  if (!input.success)
    return NextResponse.json({ error: "Item inválido." }, { status: 400 });
  const item = await db.listItem.update({
    where: { id: itemId },
    data: input.data,
  });
  return NextResponse.json(item);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;
  const owned = await ownedItem(request, id, itemId);
  if (!owned?.session)
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  if (!owned.item)
    return NextResponse.json(
      { error: "Item não encontrado." },
      { status: 404 },
    );
  await db.listItem.delete({ where: { id: itemId } });
  return new NextResponse(null, { status: 204 });
}
