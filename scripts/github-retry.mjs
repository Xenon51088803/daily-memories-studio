// Retry only connection establishment failures: the request has not reached GitHub.
// Authentication, permissions, validation and ambiguous write failures are not retried.
export async function retryGithubConnection(action, {
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
  report = message => console.warn(message),
  readOnly = false,
} = {}) {
  for (let attempt = 1; ; attempt++) {
    try { return await action(); }
    catch (error) {
      const retryable = /dial tcp|TLS handshake timeout|connect ETIMEDOUT|connect ECONNREFUSED/i.test(error.message)
        || (readOnly && error.code === 'PROCESS_TIMEOUT');
      if (attempt >= 3 || !retryable) throw error;
      await report(`连接 GitHub 暂时失败，正在重试（${attempt}/2）…`);
      await wait(attempt * 2000);
    }
  }
}
