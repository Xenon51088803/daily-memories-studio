import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { validateContent, type SiteContent } from "./content-schema";

const contentPath = path.join(process.cwd(), "src/content/site.json");
const backupPath = path.join(process.cwd(), ".content-backups");
const revisionOf = (raw: string) => createHash("sha256").update(raw).digest("hex");
export async function readContent() {
  const raw = await readFile(contentPath, "utf8");
  return { content: validateContent(JSON.parse(raw)), revision: revisionOf(raw) };
}
let pending: Promise<unknown> = Promise.resolve();
export class ConflictError extends Error {}
export function saveContent(content: SiteContent, revision: string) {
  const operation = pending.then(async () => {
    const current = await readFile(contentPath, "utf8");
    if (revisionOf(current) !== revision)
      throw new ConflictError("内容已在另一个页面更新，请先导出当前修改，再重新打开编辑页。");
    await mkdir(backupPath, { recursive: true });
    const savedAt = new Date().toISOString();
    await writeFile(
      path.join(backupPath, `${savedAt.replaceAll(":", "-")}-${randomUUID()}.json`),
      current,
      { flag: "wx" },
    );
    const raw = JSON.stringify(content, null, 2) + "\n";
    const temporary = path.join(path.dirname(contentPath), `.site-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, raw, { flag: "wx" });
      await rename(temporary, contentPath);
    } finally {
      await unlink(temporary).catch(() => {});
    }
    return { revision: revisionOf(raw), savedAt };
  });
  pending = operation.catch(() => {});
  return operation;
}
export function localEditorRequest(request: Request, mutation = false) {
  // Next's internal request URL can use a different loopback hostname.
  // Validate the browser's Host header and require the same origin for writes.
  const host = request.headers.get("host") || "";
  if (
    process.env.NODE_ENV !== "development" ||
    !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
  )
    return false;
  if (mutation) {
    const origin = request.headers.get("origin");
    if (
      !origin ||
      ![`http://${host}`, `https://${host}`].includes(origin) ||
      request.headers.get("x-homepage-editor") !== "1"
    )
      return false;
  }
  return true;
}
