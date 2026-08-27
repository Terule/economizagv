import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getObject } from "@/lib/storage";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  if (key.some((segment) => segment === ".."))
    return new NextResponse(null, { status: 400 });
  try {
    const object = await getObject(key.join("/"));
    if (!object.Body) return new NextResponse(null, { status: 404 });
    return new NextResponse(
      Readable.toWeb(object.Body as Readable) as ReadableStream,
      {
        headers: {
          "Content-Type": object.ContentType ?? "application/octet-stream",
          "Cache-Control": "public, max-age=86400",
        },
      },
    );
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
