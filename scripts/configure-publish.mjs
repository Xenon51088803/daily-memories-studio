import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { api, git } from "./github.mjs";
import { root } from "./export-site.mjs";
import { makePublishConfig } from "./publish-config.mjs";

try {
  const { values } = parseArgs({ options: { repository: { type: "string", default: "personal-homepage" } } });
  const remote = (await git(["remote", "get-url", "origin"], root)).trim();
  const match = remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([a-zA-Z0-9-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/);
  if (!match) throw new Error("请先按 docs/DEPLOY.md 创建并克隆自己的源码仓库。");
  const [, owner, sourceRepository] = match;
  const login = await api("user");
  if (login.login.toLowerCase() !== owner.toLowerCase())
    throw new Error(`请使用 ${owner} 的账号完成 gh auth login。`);
  const source = await api(`repos/${owner}/${sourceRepository}`);
  if ((await git(["branch", "--show-current"], root)).trim() !== "main")
    throw new Error("请在 main 分支配置发布。");
  const config = makePublishConfig(owner, sourceRepository, values.repository);
  await fs.writeFile(path.join(root, "publish-config.json"), JSON.stringify(config, null, 2) + "\n");
  console.log(`已配置：${config.url}/\n发布配置仅保存在本机，无需提交。然后启动工作室，保存内容并点击「发布到公网」。\n此命令只写入本机设置，首次发布时才会创建公开网页仓库。`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
