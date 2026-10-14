import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || projectRoot,
      env: options.env || process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '', stderr = '', inputError, timedOut = false;
    child.stdout.on('data', data => {
      stdout += data;
      if (options.stream) process.stdout.write(data);
    });
    child.stderr.on('data', data => {
      stderr += data;
      if (options.stream) process.stderr.write(data);
    });
    const timer = options.timeoutMs ? setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeoutMs) : null;
    child.on('error', error => {
      if (timer) clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        const error = new Error(`请求超过 ${options.timeoutMs / 1000} 秒未完成。${stderr.trim() ? `\n${stderr.slice(-2500)}` : ''}`);
        error.code = 'PROCESS_TIMEOUT';
        reject(error);
      } else if (code === 0 && !inputError) {
        resolve(stdout);
      } else {
        // A child can stop reading stdin before printing its actual error.
        // Wait for close so a pipe EOF cannot hide a GitHub HTTP/auth error.
        const detail = (stderr || stdout).trim().slice(-2500)
          || inputError?.message || `退出码 ${code}${signal ? ` (${signal})` : ''}`;
        const error = new Error(`${command} 执行失败：${detail}`);
        error.code = inputError?.code || 'PROCESS_FAILED';
        error.exitCode = code;
        reject(error);
      }
    });
    child.stdin.on('error', error => { inputError = error; });
    child.stdin.end(options.input);
  });
}
