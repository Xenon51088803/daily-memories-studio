import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
test('Windows entry points remain safe for cmd code pages and line parsing', () => {
  for (const file of ['启动日记主页.cmd', 'start-windows.cmd', '发布公开主页.cmd', '登录GitHub.cmd', '检查发布连接.cmd']) {
    const bytes = readFileSync(path.join(root, file));
    assert.ok(bytes.every(byte => byte < 128), `${file}: keep localized messages in Node, not batch files`);
    assert.doesNotMatch(bytes.toString('ascii'), /(?<!\r)\n/, `${file}: Windows batch requires CRLF`);
  }
});

test('actual cmd handles Chinese and English launcher filenames when Node is missing', {skip: process.platform !== 'win32'}, () => {
  for (const file of ['启动日记主页.cmd', 'start-windows.cmd']) {
    const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/c', `call "${file}"`], {
      cwd: root, input: '\n', encoding: 'utf8', windowsHide: true, windowsVerbatimArguments: true, timeout: 10000,
      env: {...process.env, Path: path.join(process.env.SystemRoot, 'System32'), PATH: path.join(process.env.SystemRoot, 'System32')},
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Please install Node\.js 24 LTS/);
    assert.equal(result.stderr, '');
  }
});
