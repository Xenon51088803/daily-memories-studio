import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from '../scripts/process-runner.mjs';

test('early stdin closure retains the child diagnostic instead of only write EOF', async () => {
  await assert.rejects(run(process.execPath, ['-e',
    "process.stdin.destroy();setTimeout(()=>{console.error('HTTP 403: synthetic refusal');process.exit(1)},40)",
  ], {input:'x'.repeat(8_000_000),timeoutMs:5000}), error => {
    assert.match(error.message,/HTTP 403: synthetic refusal/);
    assert.equal(error.exitCode,1);
    assert.ok(error.message.length<4000);
    return true;
  });
});

test('successful commands consume UTF-8 input and return output', async () => {
  const result = await run(process.execPath, ['-e',
    "let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',v=>input+=v);process.stdin.on('end',()=>process.stdout.write(input))",
  ], {input:'公开网页\n照片',timeoutMs:5000});
  assert.equal(result,'公开网页\n照片');
});
