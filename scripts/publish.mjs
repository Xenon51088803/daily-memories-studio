// The browser and Windows launcher share the static-only publication flow.
// Code sync uses Git separately; personal content is never committed.
import fs from 'node:fs/promises';
import path from 'node:path';
import { root, run } from './export-site.mjs';
const directory = path.join(root, '.publish-state');
const lock = path.join(directory, 'lock');
await fs.mkdir(directory, {recursive:true});
let ownsLock = process.argv.includes('--locked');
async function update(status, message, extra = {}) {
  const temporary = path.join(directory, 'job.json.tmp');
  await fs.writeFile(temporary, JSON.stringify({status,message,pid:process.pid,updatedAt:new Date().toISOString(),...extra}));
  await fs.rename(temporary, path.join(directory, 'job.json'));
}
try {
  if (!ownsLock) { await fs.writeFile(lock, String(process.pid), {flag:'wx'}); ownsLock=true; }
  await update('running', '正在生成并发布公开网页，请保持本机服务运行…');
  const revision = process.argv.find(arg=>arg.startsWith('--revision='));
  await run(process.execPath, [path.join(root,'scripts/publish-pages.mjs'), ...(revision?[revision]:[])], {stream:true});
  const result = JSON.parse(await fs.readFile(path.join(directory,'pages.json'),'utf8'));
  await update('success','GitHub Pages 已发布成功。个人内容未上传到源码仓库。', {url:result.url,commit:result.commit,revision:result.revision});
} catch (error) {
  if (ownsLock) await update('error',error.message);
  console.error(error.message);
  process.exitCode=1;
} finally {
  if (ownsLock) await fs.unlink(lock).catch(()=>{});
}
