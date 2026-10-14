import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { isUtf8 } from "node:buffer";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { api, git } from "./github.mjs";
import { createTreeBatch } from './github-tree.mjs';
const exec = promisify(execFile);
const bytes = async (args, cwd) =>
  (await exec("git", args, { cwd, encoding: "buffer", maxBuffer: 120_000_000 })).stdout;
const blobHash = (data) =>
  createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
async function pool(items, action) {
  let next = 0;
  let failure;
  await Promise.all(
    Array.from({ length: Math.min(4, items.length) }, async () => {
      while (!failure && next < items.length) {
        try { await action(items[next++]); }
        catch (error) { failure ||= error; }
      }
    }),
  );
  if (failure) throw failure;
}
async function remoteState(repo, branch) {
  try {
    const ref = await api(`repos/${repo}/git/ref/heads/${branch}`);
    const commit = await api(`repos/${repo}/git/commits/${ref.object.sha}`);
    const tree = await api(`repos/${repo}/git/trees/${commit.tree.sha}?recursive=1`);
    if (tree.truncated) throw new Error("仓库文件过多，无法完整读取。");
    return {
      sha: ref.object.sha,
      tree: commit.tree.sha,
      known: new Set(tree.tree.filter((v) => v.type === "blob").map((v) => v.sha)),
    };
  } catch (error) {
    if (error.message.includes("404") || error.message.includes("409"))
      return { sha: null, known: new Set() };
    throw error;
  }
}
async function uploadTree(repo, entries, known, report = async () => {}) {
  const unique = new Map(entries.filter((e) => !known.has(e.sha)).map((e) => [e.sha, e]));
  const inline = new Map();
  await report(`文件检查完成：共 ${entries.length} 个文件，${unique.size} 个新内容需要上传，其余复用已有内容。`);
  let uploaded = 0;
  await pool([...unique.values()], async (entry) => {
    const data = await entry.read();
    // Large text bundles also use blob uploads so a single entry cannot exceed
    // the bounded tree request size below (GitHub may time out on large content).
    if (data.length <= 128_000 && isUtf8(data) && !data.includes(0)) {
      inline.set(entry.sha, data.toString("utf8"));
      return;
    }
    const result = await api(`repos/${repo}/git/blobs`, "POST", {
      encoding: "base64",
      content: data.toString("base64"),
    });
    if (result.sha !== entry.sha) throw new Error("上传文件校验失败。");
    known.add(entry.sha);
    await report(`已上传文件 ${++uploaded}：${entry.path}`);
  });
  // Keep each tree request small enough for GitHub's processing limit.
  const existing = entries
    .filter((e) => !inline.has(e.sha))
    .map(({ path, mode, sha }) => ({ path, mode, type: "blob", sha }));
  await report('正在组装网页目录…');
  let tree = existing.length
    ? {sha:await createTreeBatch(repo,existing,null,api)}
    : null;
  let batch = [],
    size = 0;
  const flush = async () => {
    if (!batch.length) return;
    await report(`正在上传文本批次：${batch.length} 个文件，约 ${Math.ceil(size/1024)} KB…`);
    tree = {sha:await createTreeBatch(repo,batch,tree?.sha,api)};
    batch = [];
    size = 0;
  };
  for (const { path, mode, sha } of entries) {
    if (!inline.has(sha)) continue;
    const content = inline.get(sha);
    const length = Buffer.byteLength(content);
    if (batch.length && (batch.length >= 32 || size + length > 256_000)) await flush();
    batch.push({ path, mode, type: "blob", content });
    size += length;
  }
  await flush();
  if (!tree) throw new Error("没有可上传的文件。");
  for (const sha of inline.keys()) known.add(sha);
  return tree.sha;
}
function identity(line) {
  const m = line.match(/^(.*) <([^>]+)> (\d+) ([+-])(\d{2})(\d{2})$/);
  if (!m) throw new Error("无法读取 Git 提交作者。");
  const offset = (Number(m[5]) * 60 + Number(m[6])) * (m[4] === "+" ? 1 : -1);
  const local = new Date((Number(m[3]) + offset * 60) * 1000).toISOString().slice(0, 19);
  return { name: m[1], email: m[2], date: `${local}${m[4]}${m[5]}:${m[6]}` };
}
export async function pushSourceViaApi(repo, branch, cwd) {
  const remote = await remoteState(repo, branch);
  const head = (await git(["rev-parse", "HEAD"], cwd)).trim();
  if (remote.sha === head) return head;
  if (remote.sha) {
    try {
      await git(["merge-base", "--is-ancestor", remote.sha, head], cwd);
    } catch {
      throw new Error("GitHub 源码已有其他更新，请先同步仓库后再发布。");
    }
  }
  const commits = (
    await git(["rev-list", "--reverse", head, ...(remote.sha ? ["--not", remote.sha] : [])], cwd)
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const sha of commits) {
    const raw = await git(["cat-file", "commit", sha], cwd);
    const split = raw.indexOf("\n\n");
    const header = raw.slice(0, split).split("\n");
    const get = (key) => header.find((line) => line.startsWith(`${key} `))?.slice(key.length + 1);
    if (header.some((line) => line.startsWith("gpgsig ")))
      throw new Error("API 发布暂不支持签名提交，请通过 Git 推送该提交。");
    const records = (await bytes(["ls-tree", "-rz", "--full-tree", sha], cwd))
      .toString("utf8")
      .split("\0")
      .filter(Boolean);
    const entries = records.map((record) => {
      const [meta, file] = record.split("\t");
      const [mode, type, hash] = meta.split(" ");
      if (type !== "blob") throw new Error("不支持子模块发布。");
      return { path: file, mode, sha: hash, read: () => bytes(["cat-file", "blob", hash], cwd) };
    });
    const tree = await uploadTree(repo, entries, remote.known);
    if (tree !== get("tree")) throw new Error("源码目录校验失败。");
    const created = await api(`repos/${repo}/git/commits`, "POST", {
      message: raw.slice(split + 2),
      tree,
      parents: header.filter((v) => v.startsWith("parent ")).map((v) => v.slice(7)),
      author: identity(get("author")),
      committer: identity(get("committer")),
    });
    if (created.sha !== sha) throw new Error(`GitHub 提交校验失败：${sha} / ${created.sha}`);
  }
  if (remote.sha)
    await api(`repos/${repo}/git/refs/heads/${branch}`, "PATCH", { sha: head, force: false });
  else await api(`repos/${repo}/git/refs`, "POST", { ref: `refs/heads/${branch}`, sha: head });
  await git(["update-ref", `refs/remotes/origin/${branch}`, head], cwd);
  await git(["config", `branch.${branch}.remote`, "origin"], cwd);
  await git(["config", `branch.${branch}.merge`, `refs/heads/${branch}`], cwd);
  return head;
}
export async function publishDirectoryViaApi(repo, branch, directory, message, {report = async () => {}} = {}) {
  const remote = await remoteState(repo, branch);
  const entries = [];
  async function walk(folder, prefix = "") {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const name = prefix + entry.name;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) await walk(file, `${name}/`);
      else if (entry.isFile()) {
        const data = await fs.readFile(file);
        entries.push({ path: name, mode: "100644", sha: blobHash(data), read: async () => data });
      }
    }
  }
  await walk(directory);
  const tree = await uploadTree(repo, entries, remote.known, report);
  if (tree === remote.tree) return remote.sha;
  const commit = await api(`repos/${repo}/git/commits`, "POST", {
    message,
    tree,
    parents: remote.sha ? [remote.sha] : [],
  });
  if (remote.sha)
    await api(`repos/${repo}/git/refs/heads/${branch}`, "PATCH", { sha: commit.sha, force: false });
  else
    await api(`repos/${repo}/git/refs`, "POST", { ref: `refs/heads/${branch}`, sha: commit.sha });
  return commit.sha;
}
