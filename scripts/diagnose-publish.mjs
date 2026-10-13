import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {ghPath,ghConfigDirectory,githubEnv} from './github.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.publish-state', 'diagnostics.json');
const info = {
  checkedAt: new Date().toISOString(),
  windowsUser: os.userInfo().username,
  node: process.execPath,
  environment: Object.fromEntries(['APPDATA','USERPROFILE','HOME','XDG_CONFIG_HOME','GH_CONFIG_DIR'].map(k=>[k,process.env[k] || null])),
  hasTokenEnvironment: Boolean(process.env.GH_TOKEN || process.env.GITHUB_TOKEN),
  ghConfigDirectory:ghConfigDirectory || 'CLI default',
  status: 'checking',
};
await fs.mkdir(path.dirname(output), {recursive:true});
await fs.writeFile(output, JSON.stringify(info,null,2));
try {
  const result = await promisify(execFile)(ghPath, ['api','user','--hostname','github.com','--jq','.login'], {cwd:root,env:githubEnv,windowsHide:true,timeout:25000});
  info.status='success'; info.account=result.stdout.trim();
} catch (error) {
  process.exitCode=1;
  info.status='error'; info.error=(error.stderr || error.message).replace(/(?:gh[pousr]_[a-zA-Z0-9_]+|github_pat_[a-zA-Z0-9_]+)/g,'[REDACTED]');
}
await fs.writeFile(output, JSON.stringify(info,null,2));
console.log(`诊断已保存：${output}`);
