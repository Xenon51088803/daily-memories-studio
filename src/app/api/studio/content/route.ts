import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { readContent, saveContent, localEditorRequest, ConflictError } from "@/lib/editor-store";
import { validateContent, ContentError } from "@/lib/content-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const error = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });
export async function GET(request: Request) {
  if (!localEditorRequest(request)) return error("编辑页仅在本机开发服务可用", 404);
  const data = await readContent();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "X-Homepage-Workspace": createHash("sha256").update(process.cwd()).digest("hex"),
    },
  });
}
export async function PUT(request: Request) {
  if (!localEditorRequest(request, true)) return error("请从本机编辑页保存内容", 403);
  if (Number(request.headers.get("content-length")) > 4_000_000)
    return error("内容过大，请减少文章篇幅或数量", 413);
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 4_000_000) return error("内容超过 4 MB", 413);
    const body = JSON.parse(raw);
    if (typeof body.revision !== "string") return error("缺少内容版本，请重新打开编辑页", 400);
    const content = validateContent(body.content);
    const saved = await saveContent(content, body.revision);
    revalidatePath("/", "layout");
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ConflictError) return error(e.message, 409);
    if (e instanceof ContentError || e instanceof SyntaxError) return error(e.message, 400);
    console.error("Content save failed", e);
    return error("保存失败，原文件未被覆盖。请重试。", 500);
  }
}
