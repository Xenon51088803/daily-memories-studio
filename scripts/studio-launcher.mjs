import { createHash } from "node:crypto";
import { createConnection } from "node:net";
import { existsSync } from 'node:fs';
import path from 'node:path';

export const studioPort = 3310;
export const studioUrl = `http://127.0.0.1:${studioPort}/studio`;
export const workspaceId = (directory) => createHash("sha256").update(directory).digest("hex");

export function portIsListening(port = studioPort) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (listening) => { socket.destroy(); resolve(listening); };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(1500, () => finish(false));
  });
}

export function browserCommand(platform, env = process.env, exists = existsSync) {
  if (platform === "win32") {
    const candidates = [
      env.ProgramFiles && path.win32.join(env.ProgramFiles, 'Google/Chrome/Application/chrome.exe'),
      env.LOCALAPPDATA && path.win32.join(env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
      env['ProgramFiles(x86)'] && path.win32.join(env['ProgramFiles(x86)'], 'Microsoft/Edge/Application/msedge.exe'),
      env.ProgramFiles && path.win32.join(env.ProgramFiles, 'Microsoft/Edge/Application/msedge.exe'),
    ].filter(Boolean);
    const browser = candidates.find(exists);
    if (browser) return [browser, ['--new-window', studioUrl]];
    return ['powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Start-Process -FilePath '${studioUrl}' -ErrorAction Stop`]];
  }
  if (platform === "darwin") return ["open", [studioUrl]];
  return ["xdg-open", [studioUrl]];
}

export async function probeStudio(directory, url = `http://127.0.0.1:${studioPort}/api/studio/content`) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return "other";
    if (response.headers.get("x-homepage-workspace") !== workspaceId(directory)) return "other";
    const data = await response.json();
    return data?.content?.site && typeof data.revision === "string" ? "ready" : "other";
  } catch {
    return "unavailable";
  }
}
