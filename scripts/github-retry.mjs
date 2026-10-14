// Immutable blobs/trees can be recreated safely; commits and branch updates cannot.
export function isReplaySafeGitObject(endpoint, method) {
  return method === 'POST' && /^repos\/[^/]+\/[^/]+\/git\/(?:blobs|trees)$/.test(endpoint);
}

export async function retryGithubConnection(action, {
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
  report = message => console.warn(message),
  readOnly = false,
  replaySafe = false,
} = {}) {
  for (let attempt = 1; ; attempt++) {
    try { return await action(); }
    catch (error) {
      const rejected = /HTTP (?:400|401|403|404|409|422)|gh auth login|Bad credentials/i.test(error.message);
      const interrupted = error.code === 'PROCESS_TIMEOUT'
        || /\bEOF\b|EPIPE|ECONNRESET|connection reset|HTTP (?:500|502|503|504)/i.test(error.message);
      const retryable = !rejected && (/dial tcp|TLS handshake timeout|connect ETIMEDOUT|connect ECONNREFUSED/i.test(error.message)
        || ((readOnly || replaySafe) && interrupted));
      if (attempt >= 3 || !retryable) throw error;
      await report(`连接 GitHub 暂时失败，正在重试（${attempt}/2）… 原因：${error.message.slice(-500)}`);
      await wait(attempt * 2000);
    }
  }
}
