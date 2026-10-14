import { run } from './process-runner.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { retryGithubConnection, isReplaySafeGitObject } from './github-retry.mjs';
import { githubEnvironment } from './github-environment.mjs';
const portable = fileURLToPath(new URL('../.tools/gh/bin/gh.exe', import.meta.url));
export const ghPath = process.env.GH_PATH || (fs.existsSync(portable) ? portable : 'gh');
export const {directory:ghConfigDirectory, env:githubEnv} = githubEnvironment();
let report = message => console.warn(message);
export function setGithubReporter(reporter) { report = reporter; }

export function explainGithubError(error) {
  if (/gh auth login|not logged|Bad credentials|HTTP 401/i.test(error.message))
    return 'GitHub 登录凭据不可用。请在当前 Windows 用户下双击「登录GitHub.cmd」完成授权，再运行「检查发布连接.cmd」。重新发布不会修复缺失的授权。';
  if (error.code === 'PROCESS_TIMEOUT' || /dial tcp|TLS handshake|connectex|connection reset|\bEOF\b|EPIPE|ECONNRESET/i.test(error.message))
    return '连接 api.github.com 超时或中断。请确认当前网络能够访问 GitHub API；浏览器能打开 GitHub 不代表命令行也能连接。恢复网络后先运行「检查发布连接.cmd」，再重新发布。';
  if (/HTTP 403/i.test(error.message)) return 'GitHub 拒绝了请求（权限不足或请求额度限制）。请检查下方原始错误。';
  return error.message;
}

export async function api(endpoint, method = "GET", body) {
  try {
    const result = await retryGithubConnection(() => run(
      ghPath,
      [
        'api', '--hostname', 'github.com', endpoint,
        ...(method !== 'GET' ? ['--method', method] : []),
        ...(body ? ['--input', '-'] : []),
      ],
      {input:body ? JSON.stringify(body) : undefined, env:githubEnv, timeoutMs:method === 'GET' ? 25000 : 60000},
    ), {
      readOnly:method === 'GET', replaySafe:isReplaySafeGitObject(endpoint,method),
      report:message => report(`${method} ${endpoint.split('?')[0]}：${message}`),
    });
    return result.trim() ? JSON.parse(result) : null;
  } catch (error) {
    // Log the operation, never its body or authorization headers.
    error.message = `GitHub ${method} ${endpoint.split('?')[0]}：${error.message}`;
    throw error;
  }
}

export function git(args, cwd) {
  return run(
    "git",
    [
      "-c",
      "credential.helper=",
      "-c",
      "credential.helper=!gh auth git-credential",
      "-c",
      "http.lowSpeedLimit=1000",
      "-c",
      "http.lowSpeedTime=30",
      ...args,
    ],
    { cwd, env: { ...githubEnv, PATH: `${fs.existsSync(portable) ? fileURLToPath(new URL('../.tools/gh/bin/', import.meta.url)) + (process.platform === 'win32' ? ';' : ':') : ''}${process.env.PATH || ''}`, GIT_TERMINAL_PROMPT: "0" } },
  );
}
