import test from 'node:test';
import assert from 'node:assert/strict';
import { retryGithubConnection } from '../scripts/github-retry.mjs';
import { run } from '../scripts/export-site.mjs';
import { explainGithubError } from '../scripts/github.mjs';

test('stalled commands terminate within a bounded time', async () => {
  await assert.rejects(run(process.execPath,['-e','setTimeout(()=>{},10000)'],{timeoutMs:100}), error=>error.code==='PROCESS_TIMEOUT');
});

test('process timeouts retry reads but never repeat an ambiguous write', async () => {
  for (const readOnly of [true,false]) {
    let calls=0;
    await assert.rejects(retryGithubConnection(async()=>{
      calls++; throw Object.assign(new Error('timeout'),{code:'PROCESS_TIMEOUT'});
    },{readOnly,wait:async()=>{},report:()=>{}}));
    assert.equal(calls,readOnly?3:1);
  }
});

test('authentication and network errors give different recovery steps', () => {
  assert.match(explainGithubError(new Error('please run gh auth login')),/登录GitHub.cmd/);
  assert.match(explainGithubError(new Error('dial tcp: timeout')),/api.github.com/);
  assert.equal(explainGithubError(new Error('Pages build error')),'Pages build error');
});

test('connection failures retry the same action and recover', async () => {
  let calls = 0;
  const delays = [];
  const result = await retryGithubConnection(async () => {
    if (++calls < 3) throw new Error('Patch https://api.github.com: dial tcp: connectex: timed out');
    return 'ok';
  }, {wait:async ms => delays.push(ms), report:()=>{}});
  assert.equal(result,'ok');
  assert.equal(calls,3);
  assert.deepEqual(delays,[2000,4000]);
});

test('persistent connection failures stop after three attempts', async () => {
  let calls = 0;
  await assert.rejects(retryGithubConnection(async () => {
    calls++; throw new Error('dial tcp: timeout');
  }, {wait:async()=>{},report:()=>{}}), /timeout/);
  assert.equal(calls,3);
});

test('auth errors and ambiguous write failures are not retried', async () => {
  for (const message of ['gh auth login', 'HTTP 403', 'HTTP 422', 'unexpected EOF', 'connection reset by peer']) {
    let calls = 0;
    await assert.rejects(retryGithubConnection(async () => {
      calls++; throw new Error(message);
    }, {wait:async()=>{},report:()=>{}}));
    assert.equal(calls,1);
  }
});
