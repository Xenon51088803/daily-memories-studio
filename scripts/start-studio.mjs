import { spawn, spawnSync } from "node:child_process";
import { access, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browserCommand, portIsListening, probeStudio, studioUrl, studioPort } from "./studio-launcher.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Next and the health endpoint must identify the same project, even from a shortcut.
process.chdir(root);

async function openBrowser() {
  console.log(`内容工作室已就绪：${studioUrl}`);
  if (process.argv.includes("--no-open")) return;
  const [command, args] = browserCommand(process.platform);
  const result = await new Promise((resolve) => {
    // This is the browser window the user requested, so it must remain visible.
    const browser = spawn(command, args, { stdio: "ignore", detached: true, windowsHide: false });
    let settled = false;
    const finish = (message) => { if (settled) return; settled = true; clearTimeout(timer); browser.unref(); resolve(message); };
    const timer = setTimeout(() => finish('已发送打开指令；如果没有看到窗口，请点击或复制上方网址。'), 1500);
    browser.once('error', error => finish(`浏览器未能自动打开（${error.code || error.message}），请点击或复制上方网址。`));
    browser.once('exit', code => finish(code === 0 ? '已发送打开指令；请查看新打开的浏览器窗口。' : `浏览器启动返回 ${code}，请点击或复制上方网址。`));
  });
  console.log(result);
  await appendFile(path.join(root, '.studio-launcher.log'), `${new Date().toISOString()} ${command} ${studioUrl} ${result}\n`).catch(() => {});
}

async function main() {
  console.log('正在检查本机网页编辑器，请稍候…');
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("请安装 Node.js 24 LTS，再重新打开启动器。");
  const next = path.join(root, "node_modules/next/dist/bin/next");
  await access(next).catch(() => { throw new Error("缺少依赖，请先运行 npm ci。"); });
  if (await portIsListening()) {
    // A running Next server may still be compiling its first API request.
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const existing = await probeStudio(root);
      if (existing === "ready") return openBrowser();
      if (existing === "other") break;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    throw new Error(`${studioPort} 端口已被其他项目占用或服务没有响应，请先关闭那个项目的启动窗口。`);
  }

  console.log("正在启动内容工作室；编辑期间请保持此窗口打开，结束时按 Ctrl+C。");
  const server = spawn(process.execPath, [next, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(studioPort)], {
    cwd: root, stdio: "inherit", windowsHide: true,
  });
  let ended = false;
  let startupError;
  const done = new Promise((resolve) => {
    server.once("error", (error) => { startupError = error; ended = true; resolve(); });
    server.once("exit", (code) => { ended = true; process.exitCode = code || 0; resolve(); });
  });
  const stop = () => {
    if (ended || !server.pid) return;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else server.kill("SIGTERM");
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    let ready = false;
    const deadline = Date.now() + 180_000;
    while (!ended && Date.now() < deadline) {
      const state = await probeStudio(root);
      if (ended) break;
      if (state === "ready") { ready = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    if (!ready) {
      stop();
      throw startupError || new Error("工作室未能启动，请查看上方错误；也可以在项目目录运行 npm run dev。");
    }
    await openBrowser();
    await done;
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
