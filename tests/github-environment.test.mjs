import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {resolveGithubDirectory} from '../scripts/github-environment.mjs';

test('login and publish use the known directory even if desktop APPDATA is missing or different',()=>{
  const directory=path.join('C:','Users','owner','AppData','Roaming','GitHub CLI');
  for (const env of [{},{APPDATA:'incorrect'},{GH_CONFIG_DIR:'incorrect'}]) {
    assert.equal(resolveGithubDirectory({env,pinned:{windowsUser:'owner',directory},username:'owner',exists:p=>p===path.join(directory,'hosts.yml')}),directory);
  }
});
test('a missing config does not prevent login from creating it',()=>{
  assert.equal(resolveGithubDirectory({env:{},pinned:{windowsUser:'owner',directory:'missing'},username:'owner',exists:()=>false}),'missing');
});
test('a different Windows user does not reuse the owner binding',()=>{
  assert.equal(resolveGithubDirectory({env:{GH_CONFIG_DIR:'own-config'},pinned:{windowsUser:'owner',directory:'private-config'},username:'other',exists:()=>true}),'own-config');
});
