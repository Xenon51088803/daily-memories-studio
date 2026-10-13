import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { localEditorRequest } from "@/lib/editor-store";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!localEditorRequest(request, true))
    return NextResponse.json({ error: "请从本机编辑页上传图片" }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 21_000_000)
    return NextResponse.json({ error: "每张图片不能超过 20 MB" }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 20_000_000)
      return NextResponse.json(
        { error: "请选择 20 MB 以内的 JPEG、PNG 或 WebP 图片" },
        { status: 400 },
      );
    const buffer = Buffer.from(await file.arrayBuffer());
    const input = sharp(buffer, { limitInputPixels: 60_000_000 });
    const metadata = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
      return NextResponse.json(
        { error: "支持 JPEG、PNG、WebP；请先转换其他图片格式" },
        { status: 400 },
      );
    const name = `${randomUUID()}.webp`;
    const folder = path.join(process.cwd(), "public/images/uploads");
    await mkdir(folder, { recursive: true });
    const optimized = await input
      .rotate()
      .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
    await writeFile(path.join(folder, name), optimized, { flag: "wx" });
    return NextResponse.json({
      src: `/images/uploads/${name}`,
      orientation: (
        (metadata.orientation || 0) >= 5
          ? (metadata.width || 0) > (metadata.height || 0)
          : (metadata.height || 0) > (metadata.width || 0)
      )
        ? "vertical"
        : "horizontal",
    });
  } catch {
    return NextResponse.json(
      { error: "无法读取这张图片，请换一张有效的 JPEG、PNG 或 WebP 图片" },
      { status: 400 },
    );
  }
}
