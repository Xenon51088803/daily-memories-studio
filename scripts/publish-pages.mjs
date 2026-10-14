import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { api, ghPath, ghConfigDirectory, explainGithubError, setGithubReporter } from './github.mjs';
import { publishDirectoryViaApi } from './github-api.mjs';
import { exportSite, root } from './export-site.mjs';
import { publishLogLine } from './publish-time.mjs';

// Only the generated public directory is uploaded; no source or diary backup.
const statePath = path.join(root, '.publish-state');
const configFile = path.join(root, 'publish-config.json');
await fs.mkdir(statePath, {recursive:true});
const lock = path.join(statePath, 'pages.lock');
const logFile = path.join(statePath, 'pages.log');
const checkOnly = process.argv.includes('--check');
const attemptFile = path.join(statePath, checkOnly ? 'check.json' : 'attempt.json');
const attemptState = {status:'running', startedAt:new Date().toISOString(), pid:process.pid, windowsUser:os.userInfo().username,
  node:process.execPath, ghPath, ghConfigDirectory:ghConfigDirectory || 'CLI default',
  environment:Object.fromEntries(['APPDATA','USERPROFILE','HOME','XDG_CONFIG_HOME','GH_CONFIG_DIR'].map(key=>[key,process.env[key] || null]))};
let reporting = Promise.resolve();
function report(message) {
  const now = new Date();
  const line = publishLogLine(message, now);
  const state = {...attemptState,message,updatedAt:now.toISOString()};
  console.log(line);
  // Concurrent file uploads must not race while rewriting attempt.json.
  reporting = reporting.then(async () => {
    await fs.appendFile(logFile, `${line}\n`, 'utf8');
    await fs.writeFile(attemptFile,JSON.stringify(state,null,2));
  });
  return reporting;
}
setGithubReporter(report);
let locked = false;
try {
  await fs.writeFile(lock, String(process.pid), {flag:'wx'});
  locked = true;
  await report(checkOnly ? '开始检查发布连接（不会生成或上传网页）。' : '开始发布。生成、上传和等待 GitHub Pages 构建期间，请保持此窗口打开。');
  await report('日志时间使用北京时间（UTC+08:00）；旧记录中结尾的 Z 表示 UTC，需要加 8 小时。');
  await report(`Windows 用户：${attemptState.windowsUser}；GitHub 配置：${attemptState.ghConfigDirectory}`);
  await report('正在连接 GitHub 并检查登录状态…');
  const login = await api('user');
  const saved = JSON.parse(await fs.readFile(configFile,'utf8'));
  if (saved.owner && saved.owner.toLowerCase() !== login.login.toLowerCase()) throw new Error(`请使用 ${saved.owner} 的 GitHub 账号登录。`);
  const owner = login.login;
  let repository = saved.repository || 'tomorrow-letters';
  let exists = false;
  for(let suffix=1; suffix<=20; suffix++) {
    try {
      const repo = await api(`repos/${owner}/${repository}`);
      try {
        const marker = await api(`repos/${owner}/${repository}/contents/.homepage-generated`);
        if (Buffer.from(marker.content || '', 'base64').toString('utf8') !== 'Personal Homepage / generated publication files only\n') throw new Error('仓库标记不匹配');
        if (repo.private) throw new Error('网页仓库必须是公开仓库');
        exists = true; break;
      } catch(error) {
        if (!error.message.includes('404')) throw error;
        if (saved.repository) throw new Error('目标仓库不是已识别的公开网页仓库，已停止以避免覆盖。');
        repository = `tomorrow-letters-${suffix + 1}`;
      }
    } catch(error) {
      if (error.message.includes('404')) break;
      throw error;
    }
    if(suffix === 20) throw new Error('请在 publish-config.json 中指定新的仓库名称。');
  }
  if (checkOnly) {
    attemptState.status='success';
    await report(`连接检查通过：已登录 ${login.login}，GitHub API 可访问。${exists ? '网页仓库校验通过。' : '网页仓库尚未创建。'}`);
  } else {
  const basePath = repository.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '' : `/${repository}`;
  const config = {owner, repository, sourceRepository:saved.sourceRepository || '', branch:'main', basePath, url:`https://${owner.toLowerCase()}.github.io${basePath}`};
  await fs.writeFile(configFile,JSON.stringify(config,null,2)+'\n');
  await report(`将发布到 ${config.url}/`);
  const {output, revision} = await exportSite({configOverride:config,onStage:report,expectedRevision:process.argv.find(arg=>arg.startsWith('--revision='))?.slice(11)});
  const repoName = `${owner}/${repository}`;
  if(!exists) {
    await report('正在创建公开网页仓库…');
    await api('user/repos','POST',{name:repository,description:'日常留存 · Personal homepage and daily memories',private:false,auto_init:true});
  }
  await report('正在上传公开网页和图片…');
  const commit = await publishDirectoryViaApi(repoName,'main',output,`Publish public homepage ${revision.slice(0,12)}`, {report});
  let pages;
  try {pages = await api(`repos/${repoName}/pages`);}
  catch(error) {
    if(!error.message.includes('404')) throw error;
    pages = await api(`repos/${repoName}/pages`,'POST',{source:{branch:'main',path:'/'},build_type:'legacy'});
  }
  if(pages.build_type !== 'legacy' || pages.source?.branch !== 'main' || pages.source?.path !== '/') {
    pages = await api(`repos/${repoName}/pages`,'PUT',{source:{branch:'main',path:'/'},build_type:'legacy'});
  }
  const url = pages.html_url || `${config.url}/`;
  await fs.writeFile(path.join(statePath,'pages.json'),JSON.stringify({url,repo:repoName,commit,revision,status:'uploaded'},null,2));
  await report(`网页已上传，等待 Pages 发布：${url}`);
  let built = false;
  for(let attempt=0; attempt<48; attempt++) {
    try {
      const build = await api(`repos/${repoName}/pages/builds/latest`);
      if(build.commit===commit && build.status==='built') {built=true;break;}
      if(build.commit===commit && build.status==='errored') throw new Error(`Pages 构建失败：${build.error?.message || '请查看仓库 Actions'}`);
    } catch(error) {if(!error.message.includes('404')) throw error;}
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  if(!built) throw new Error(`文件已上传，Pages 仍在处理中：${url}`);
  await fs.writeFile(path.join(statePath,'pages.json'),JSON.stringify({url,repo:repoName,commit,revision,status:'built'},null,2));
  attemptState.status='success';
  await report(`发布成功！GitHub Pages 已完成构建：${url}`);
  await report('可以打开网站查看。若已打开的页面仍是旧内容，请按 Ctrl+F5 刷新。');
  }
} catch(error) {
  const message = !locked && error.code === 'EEXIST'
    ? '已有发布任务占用此目录，请查看原发布窗口；若原窗口已关闭，请检查 .publish-state/pages.lock 中的进程是否仍在运行。'
    : explainGithubError(error);
  console.error(`本次发布未完成：${message}`);
  if (locked) {
    attemptState.status='error';
    await report(`未完成：${message}`).catch(()=>{});
    if (message !== error.message) await fs.appendFile(logFile, `${publishLogLine(`原始错误：${error.message}`)}\n`, 'utf8').catch(()=>{});
  }
  console.error(`发布记录：${logFile}`);
  process.exitCode=1;
}
finally {if(locked) await fs.unlink(lock).catch(()=>{});}
