import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { openDiary, dayAt } from "../src/lib/diary-store.mjs";
import { writePublicAssets } from './public-assets.mjs';
import { publicContent } from '../src/lib/public-content.mjs';
import { createExportSourceFilter } from './export-source-filter.mjs';
import { prepareLocalExport } from './local-export.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: options.env || process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data;
      if (options.stream) process.stdout.write(data);
    });
    child.stderr.on("data", (data) => {
      stderr += data;
      if (options.stream) process.stderr.write(data);
    });
    let timedOut = false;
    const timer = options.timeoutMs ? setTimeout(() => { timedOut = true; child.kill(); }, options.timeoutMs) : null;
    child.on("error", error => { if (timer) clearTimeout(timer); reject(error); });
    child.on("close", code => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        const error = new Error(`请求超过 ${options.timeoutMs / 1000} 秒未完成。`);
        error.code = 'PROCESS_TIMEOUT';
        reject(error);
      } else if (code === 0) resolve(stdout);
      else reject(new Error(`${command} 执行失败：${(stderr || stdout).slice(-2500)}`));
    });
    child.stdin.on('error', error => { if (error.code !== 'EPIPE') reject(error); });
    child.stdin.end(options.input || undefined);
  });
}
export async function exportSite({ onStage = () => {}, expectedRevision, configOverride } = {}) {
  const configured = JSON.parse(await fs.readFile(path.join(root, "publish-config.json"), "utf8"));
  const config = configOverride || (configured.owner ? configured : { ...configured, basePath: '/tomorrow-letters', url: 'https://example.invalid/tomorrow-letters' });
  const raw = await fs.readFile(path.join(root, "src/content/site.json"), "utf8");
  const contentRevision = createHash("sha256").update(raw).digest("hex");
  if (expectedRevision && expectedRevision !== contentRevision)
    throw new Error("内容版本已变化，请重新保存后发布。");
  const store = openDiary(process.env.DIARY_DATA_DIR || path.join(root, '.diary-data'));
  let quotes;
  try { quotes = store.publicQuotes(dayAt()).map(({date, text}) => ({date, text})); }
  finally { store.close(); }
  const publicSnapshot = JSON.stringify(quotes);
  const originalContent = JSON.parse(raw);
  const stage = path.join(root, ".publish-build/site");
  if (path.relative(root, stage).replaceAll('\\', '/') !== '.publish-build/site') throw new Error('导出目录校验失败');
  await fs.mkdir(path.join(root, ".publish-build"), { recursive: true });
  await fs.rm(stage, { recursive: true, force: true });
  await fs.mkdir(stage, { recursive: true });
  for (const name of ["package.json", "package-lock.json", "tsconfig.json", "next.config.mjs"])
    await fs.copyFile(path.join(root, name), path.join(stage, name));
  const tsconfig = JSON.parse(await fs.readFile(path.join(stage, 'tsconfig.json'), 'utf8'));
  tsconfig.include = ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'];
  tsconfig.exclude = ['node_modules'];
  await fs.writeFile(path.join(stage, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  await fs.writeFile(
    path.join(stage, "next-env.d.ts"),
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
  );
  await fs.cp(path.join(root, "src"), path.join(stage, "src"), {
    recursive: true,
    filter: createExportSourceFilter(path.join(root, 'src'), publicContent(originalContent)),
  });
  // Freeze the content snapshot for this publication, including the version marker.
  await writePublicAssets(root, stage, originalContent);
  await fs.writeFile(path.join(stage, 'src/content/public-quotes.json'), publicSnapshot);
  const extensionSettings = await prepareLocalExport(stage, config);
  const revision = createHash('sha256').update(raw).update(publicSnapshot).update(extensionSettings).digest('hex');
  // Junctions work without Developer Mode or administrator privileges on Windows.
  await fs.symlink(
    path.join(root, "node_modules"),
    path.join(stage, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await onStage("正在生成可公开访问的网页…");
  await run(
    process.execPath,
    [path.join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
    {
      cwd: stage,
      stream: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        STATIC_EXPORT: "1",
        NEXT_DIST_DIR: '.next',
        NEXT_PUBLIC_STATIC_SITE: '1',
        NEXT_PUBLIC_BASE_PATH: config.basePath,
        NEXT_PUBLIC_SITE_URL: config.url,
        NEXT_PUBLIC_CONTENT_REVISION: revision,
      },
    },
  );
  const output = path.join(stage, "out");
  await fs.writeFile(path.join(output, ".nojekyll"), "");
  await fs.writeFile(
    path.join(output, ".homepage-generated"),
    "Personal Homepage / generated publication files only\n",
  );
  await fs.writeFile(
    path.join(output, "README.md"),
    `# Personal homepage\n\nPublished website: ${config.url}/\n\nThis repository contains generated public website files. Content is managed in the owner's local content studio.\n\nBuilt with Magic Portfolio / Once UI. See LICENSE and THIRD_PARTY_NOTICES.md.\n`,
  );
  for (const name of ["LICENSE", "THIRD_PARTY_NOTICES.md"])
    await fs.copyFile(path.join(root, name), path.join(output, name));
  for (const forbidden of ["studio", "diary", "api", "src", ".diary-data", ".analytics-data", ".content-backups", "publish-config.json"]) {
    try {
      await fs.access(path.join(output, forbidden));
      throw new Error(`发布文件中出现了不应公开的目录：${forbidden}`);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  return { output, config, revision };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  exportSite({ onStage: console.log })
    .then((result) => console.log(`Export ready: ${result.output}`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

