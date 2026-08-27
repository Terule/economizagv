import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createList = z.object({ name: z.string().trim().min(1).max(80) });

async function sessionUser(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function GET(request: Request) {
  const session = await sessionUser(request);
  if (!session)
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  const lists = await db.shoppingList.findMany({
    where: { userId: session.user.id },
    include: { items: { include: { product: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(lists);
}

export async function POST(request: Request) {
  const session = await sessionUser(request);
  if (!session)
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  const input = createList.safeParse(await request.json());
  if (!input.success)
    return NextResponse.json(
      { error: "Nome da lista inválido." },
      { status: 400 },
    );
  const list = await db.shoppingList.create({
    data: { userId: session.user.id, name: input.data.name },
  });
  return NextResponse.json(list, { status: 201 });
}
