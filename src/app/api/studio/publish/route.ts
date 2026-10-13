import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir, unlink, open } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { localEditorRequest, readContent } from "@/lib/editor-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const folder = path.join(process.cwd(), ".publish-state");
const lock = path.join(folder, "lock");
async function status() {
  try {
    const state = JSON.parse(await readFile(path.join(folder, "job.json"), "utf8"));
    if (state.status === "running" && state.pid) {
      try {
        process.kill(state.pid, 0);
      } catch {
        state.status = "error";
        state.message = "上次发布已中断，可以重新发布。";
        await unlink(lock).catch(() => {});
        await writeFile(path.join(folder, "job.json"), JSON.stringify(state));
      }
    }
    return state;
  } catch {
    return { status: "idle", message: "保存后，点击发布即可更新公网网站。" };
  }
}
export async function GET(request: Request) {
  if (!localEditorRequest(request))
    return NextResponse.json({ error: "仅限本机编辑页" }, { status: 404 });
  return NextResponse.json(await status(), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (!localEditorRequest(request, true))
    return NextResponse.json({ error: "请从本机编辑页发布" }, { status: 403 });
  const current = await readContent();
  const body = await request.json().catch(() => null);
  if (body?.revision !== current.revision)
    return NextResponse.json(
      { error: "内容版本已变化，请重新打开编辑页后发布。" },
      { status: 409 },
    );
  await mkdir(folder, { recursive: true });
  await status();
  try {
    await writeFile(lock, "starting", { flag: "wx" });
  } catch {
    return NextResponse.json({ error: "已有发布正在进行" }, { status: 409 });
  }
  try {
    const log = await open(path.join(folder, "publish.log"), "w");
    const child = spawn(
      process.execPath,
      [
        path.join(process.cwd(), "scripts/publish.mjs"),
        "--locked",
        `--revision=${current.revision}`,
      ],
      { cwd: process.cwd(), env: process.env, detached: true, windowsHide: true, stdio: ["ignore", log.fd, log.fd] },
    );
    const state = {
      status: "running",
      message: "正在准备发布…",
      pid: child.pid,
      updatedAt: new Date().toISOString(),
    };
    await writeFile(path.join(folder, "job.json"), JSON.stringify(state));
    child.on("error", async () => {
      await writeFile(
        path.join(folder, "job.json"),
        JSON.stringify({ status: "error", message: "无法启动发布，请重试。" }),
      );
      await unlink(lock).catch(() => {});
    });
    child.unref();
    await log.close();
    return NextResponse.json(state, { status: 202 });
  } catch {
    await unlink(lock).catch(() => {});
    return NextResponse.json({ error: "无法启动发布" }, { status: 500 });
  }
}
