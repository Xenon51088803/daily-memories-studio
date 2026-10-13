import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { browserCommand, portIsListening, probeStudio, workspaceId } from "../scripts/studio-launcher.mjs";
import { makePublishConfig, validatePublishConfig } from "../scripts/publish-config.mjs";

test("Pages configuration handles project paths and username domains", () => {
  assert.equal(makePublishConfig("Alice", "site-source", "my-site").url, "https://alice.github.io/my-site");
  assert.equal(makePublishConfig("Alice", "site-source", "alice.github.io").basePath, "");
  assert.throws(() => makePublishConfig("Alice", "site", "SITE"), /不同名称/);
  assert.throws(() => makePublishConfig("Alice", "site-source", "../bad"), /有效/);
});

test("publication refuses unconfigured or mismatched destinations", () => {
  assert.throws(() => validatePublishConfig({}), /还没有配置/);
  const config = makePublishConfig("Alice", "site-source", "site");
  assert.equal(validatePublishConfig(config), config);
  assert.throws(() => validatePublishConfig({ ...config, url: "https://other.example" }), /不匹配/);
});

test("browser opening uses separate arguments on Windows and macOS", () => {
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  assert.deepEqual(browserCommand("win32", {ProgramFiles:'C:\\Program Files'}, candidate => candidate === chrome), [chrome, ['--new-window', 'http://127.0.0.1:3310/studio']]);
  const fallback = browserCommand('win32', {}, () => false);
  assert.equal(fallback[0], 'powershell.exe');
  assert.match(fallback[1].at(-1), /Start-Process.*3310\/studio/);
  assert.equal(browserCommand("darwin")[0], "open");
});

test("launcher reuses only the same project, including paths with Chinese and spaces", async (t) => {
  const directory = "C:\\Users\\Example User\\个人主页";
  let status = 200;
  const server = http.createServer((_req, res) => {
    res.writeHead(status, { "Content-Type": "application/json", "X-Homepage-Workspace": workspaceId(directory) });
    res.end(JSON.stringify({ content: { site: { name: "Example" } }, revision: "abc" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/studio/content`;
  assert.equal(await portIsListening(server.address().port), true);
  assert.equal(await probeStudio(directory, url), "ready");
  assert.equal(await probeStudio("C:\\another-site", url), "other");
  status = 404;
  assert.equal(await probeStudio(directory, url), "other");
});
