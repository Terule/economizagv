import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const itemSchema = z.object({
  label: z.string().trim().min(1).max(180),
  productId: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  manualPrice: z.number().positive().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
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
  const input = itemSchema.safeParse(await request.json());
  if (!input.success)
    return NextResponse.json({ error: "Item inválido." }, { status: 400 });
  const item = await db.listItem.create({
    data: { listId: id, ...input.data },
  });
  return NextResponse.json(item, { status: 201 });
}
