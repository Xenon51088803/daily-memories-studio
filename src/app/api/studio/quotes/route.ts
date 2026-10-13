import { NextResponse } from "next/server";
import { diaryStore, dayAt } from "@/lib/diary-store.mjs";
import { localEditorRequest } from "@/lib/editor-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });

export async function GET(request: Request) {
  if (!localEditorRequest(request)) return json({ error: "每日一句编辑仅在本机工作室可用" }, 404);
  try {
    const store = diaryStore();
    const today = dayAt();
    const date = new URL(request.url).searchParams.get("date") || today;
    return json({ today, quote: store.quote(date), quotes: store.editorQuotes() });
  } catch {
    return json({ error: "展示日期无效" }, 400);
  }
}

export async function PUT(request: Request) {
  if (!localEditorRequest(request, true)) return json({ error: "请从本机工作室保存句子" }, 403);
  try {
    if (Number(request.headers.get("content-length")) > 4096)
      return json({ error: "句子内容过长" }, 413);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 4096) return json({ error: "句子内容过长" }, 413);
    const store = diaryStore();
    const quote = store.saveQuote(JSON.parse(raw));
    return json({ today: dayAt(), quote, quotes: store.editorQuotes() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/日期|格式|其他窗口/.test(message))
      return json({ error: message }, message.includes("其他窗口") ? 409 : 400);
    console.error("Quote save failed", error);
    return json({ error: "保存失败，请稍后重试；当前文字仍保留在编辑框中。" }, 400);
  }
}
