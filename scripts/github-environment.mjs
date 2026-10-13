import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export function resolveGithubDirectory({env, pinned, username, exists}) {
  // A project binding contains a directory only, never a token. It makes
  // Explorer, terminal, login and publication use the same Windows vault entry.
  if (pinned?.windowsUser === username && pinned.directory) {
    // A fresh login must be allowed to create its configuration in this directory.
    return pinned.directory;
  }
  if (env.GH_CONFIG_DIR) return env.GH_CONFIG_DIR;
  if (env.XDG_CONFIG_HOME) return path.join(env.XDG_CONFIG_HOME,'gh');
  const candidates = [
    env.APPDATA && path.join(env.APPDATA,'GitHub CLI'),
    env.USERPROFILE && path.join(env.USERPROFILE,'AppData','Roaming','GitHub CLI'),
  ].filter(Boolean);
  return candidates.find(directory=>exists(path.join(directory,'hosts.yml')));
}

export function githubEnvironment() {
  const binding = fileURLToPath(new URL('../.publish-state/github-config.json', import.meta.url));
  const pinned = fs.existsSync(binding) ? JSON.parse(fs.readFileSync(binding,'utf8')) : undefined;
  if (pinned?.directory) pinned.directory = path.resolve(fileURLToPath(new URL('../',import.meta.url)),pinned.directory);
  const directory = resolveGithubDirectory({env:process.env,pinned,username:os.userInfo().username,exists:fs.existsSync});
  return {directory, env:{...process.env,...(directory ? {GH_CONFIG_DIR:directory} : {})}};
}
