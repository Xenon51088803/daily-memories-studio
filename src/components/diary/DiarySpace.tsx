"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, Calendar, displayDate, localDay, Quote, shiftDay } from "./shared";
import { MarkdownEditor } from "@/components/markdown/MarkdownEditor";

type Entry = {
  date: string;
  title: string;
  body: string;
  format: "plain" | "markdown";
  mood: string;
  tomorrow: string;
  received: string;
  version: number;
  updated: string;
};
type Mark = { date: string; diary: number };
export function DiarySpace() {
  const [session, setSession] = useState<{ configured: boolean; authenticated: boolean } | null>(
    null,
  );
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const serial = useRef(0);
  async function checkSession() {
    try {
      const res = await fetch("/api/diary?action=session", { cache: "no-store" });
      if (!res.ok) throw new Error("暂时无法打开私人空间，请重试");
      const data = await res.json();
      setSession(data);
      setToday(data.today);
      setDate((current) => current || data.today);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    checkSession();
  }, []);
  useEffect(() => {
    const tick = setInterval(() => setToday(localDay()), 30000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const click = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (
        dirty &&
        target &&
        !target.hasAttribute("download") &&
        !window.confirm("还有未保存的文字。确定离开吗？")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  useEffect(() => {
    if (!session?.authenticated || !date) return;
    const id = ++serial.current;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/diary?date=${date}`, { cache: "no-store" }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      }),
      fetch("/api/diary?action=public", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([data, pub]) => {
        if (id === serial.current) {
          setEntry(data.entry);
          setMarks(data.calendar);
          setQuotes(pub.quotes || []);
          setDirty(false);
        }
      })
      .catch((e) => {
        if (id === serial.current) setError(e.message);
      })
      .finally(() => {
        if (id === serial.current) setLoading(false);
      });
    return () => {
      serial.current++;
    };
  }, [date, session?.authenticated, retry]);
  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!session?.configured && password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setBusy(true);
    try {
      await api(session?.configured ? "login" : "setup", { password, setupToken });
      setPassword("");
      setConfirm("");
      await checkSession();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function choose(day: string) {
    if (busy || loading || day === date) return;
    if (dirty && !window.confirm("还有未保存的文字。确定切换日期并放弃这些修改吗？")) return;
    setDate(day);
    setNotice("");
    setDirty(false);
    setEntry(null);
  }
  function edit(patch: Partial<Entry>) {
    setEntry((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
    setNotice("");
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const data = await api("save", { entry });
      setEntry(data.entry);
      setMarks(data.calendar);
      setDirty(false);
      setNotice("已经好好收起来了。");
      const res = await fetch("/api/diary?action=public");
      if (res.ok) setQuotes((await res.json()).quotes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (dirty && !window.confirm("还有未保存的文字。确定退出吗？")) return;
    setBusy(true);
    try {
      await api("logout");
      setEntry(null);
      setMarks([]);
      setQuotes([]);
      setDirty(false);
      setSession({ configured: true, authenticated: false });
      setNotice("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!session)
    return (
      <div className="login-shell">
        <p>{error || "正在打开你的日记本…"}</p>
        {error && (
          <button className="paper-button" onClick={checkSession}>
            重新打开
          </button>
        )}
      </div>
    );
  if (!session.authenticated)
    return (
      <section className="login-shell">
        <div className="login-art">
          <span className="eyebrow">A ROOM OF YOUR OWN</span>
          <h1>
            有些日子，
            <br />
            只写给自己。
          </h1>
          <p>
            记下生活的细节，
            <br />
            留住只有自己知道的心情。
          </p>
          <div className="login-memory-mark" aria-hidden="true">days<br />kept.</div>
          <span className="subtle">只有你，能翻开这本日记。</span>
        </div>
        <form className="login-form" onSubmit={authenticate}>
          <span className="small-label">♧ 私人空间</span>
          <h2>{session.configured ? "欢迎回到自己的角落" : "为日记本配一把钥匙"}</h2>
          <p>
            {session.configured
              ? "输入密码，继续写你的日常。"
              : "第一次来，先设置只有你知道的密码。"}
          </p>
          <label htmlFor="diary-password">
            {session.configured ? "你的密码" : "设置密码（至少 10 个字符）"}
          </label>
          <input
            id="diary-password"
            autoComplete={session.configured ? "current-password" : "new-password"}
            type="password"
            required
            minLength={session.configured ? 1 : 10}
            maxLength={200}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {!session.configured && (
            <>
              <label htmlFor="confirm-password">再输入一次密码</label>
              <input
                id="confirm-password"
                autoComplete="new-password"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <details>
                <summary>在服务器上首次使用？</summary>
                <label htmlFor="setup-token">首次设置码（本机开发时不需要）</label>
                <input
                  id="setup-token"
                  type="password"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                />
              </details>
            </>
          )}
          {error && (
            <div className="paper-error" role="alert">
              {error}
            </div>
          )}
          <button className="paper-button" disabled={busy}>
            {busy ? "正在打开…" : session.configured ? "打开我的日记本 →" : "设置密码，开始记录 →"}
          </button>
          <span className="login-privacy">日记仅自己可见。每日一句在对应日期公开展示。</span>
          <Link href="/" className="quiet-link">
            ← 回到公开主页
          </Link>
        </form>
      </section>
    );
  return (
    <div className="diary-space">
      <div className="diary-heading">
        <div>
          <div className="eyebrow">A PRIVATE RECORD OF DAYS</div>
          <h1>把今天，记在这里。</h1>
          <p>写下当时的生活，留给以后的自己翻阅。</p>
        </div>
        <div className="diary-tools">
          <a href="/api/diary?action=backup" download>
            导出备份 ↓
          </a>
          <button disabled={busy} onClick={logout}>
            锁上日记本 ↗
          </button>
        </div>
      </div>
      <div className="diary-layout">
        <aside>
          <div className="private-badge">♧ 这里的日记，只有你能看见</div>
          {date && (
            <Calendar
              selected={date}
              today={today}
              onSelect={choose}
              quoteDays={quotes.map((q) => q.date)}
              diaryDays={marks.filter((m) => m.diary).map((m) => m.date)}
            />
          )}
          <div className="sidebar-note">
            <span>给生活一点留白</span>
            <p>可以补写过去的日记，也可以什么都不写。你有自己的节奏。</p>
            <span className="subtle">
              已记下 {marks.filter((m) => m.diary).length} 天生活 · 上海时间
            </span>
          </div>
          <Link href="/" className="quiet-link">
            查看公开主页 ↗
          </Link>
        </aside>
        <div className="writing-space">
          {error && (
            <div className="paper-error" role="alert">
              {error}
              {!entry && <button onClick={() => setRetry((x) => x + 1)}>重新读取</button>}
            </div>
          )}
          {loading ? (
            <div className="editor-loading">正在翻到这一天…</div>
          ) : (
            entry && (
              <>
                <div className="editor-date">
                  <span>{displayDate(date)}</span>
                  <span className="small-label">{date === today ? "TODAY" : date}</span>
                </div>
                {entry.received && (
                  <div className="received-note">
                    <span>这一天的每日一句</span>
                    <p>“{entry.received}”</p>
                  </div>
                )}
                <fieldset disabled={busy} className="editor-fields">
                  <div className="mood-row">
                    <span>今天的心情</span>
                    {["晴朗", "平静", "充实", "低落", "疲惫"].map((m, i) => (
                      <button
                        type="button"
                        key={m}
                        aria-pressed={entry.mood === m}
                        className={entry.mood === m ? "active" : ""}
                        onClick={() => edit({ mood: entry.mood === m ? "" : m })}
                      >
                        {["☀", "☁", "✳", "☂", "☾"][i]} {m}
                      </button>
                    ))}
                  </div>
                  <label className="sr-only" htmlFor="diary-title">
                    日记标题
                  </label>
                  <input
                    className="diary-title"
                    id="diary-title"
                    maxLength={100}
                    placeholder="给今天起个名字（可选）"
                    value={entry.title}
                    onChange={(e) => edit({ title: e.target.value })}
                  />
                  <label className="diary-format">正文格式
                    <select value={entry.format || "plain"} onChange={e => edit({ format: e.target.value as Entry["format"] })}>
                      <option value="markdown">Markdown</option>
                      <option value="plain">纯文本（保留原样）</option>
                    </select>
                  </label>
                  <MarkdownEditor label="今天的日记" value={entry.body} maxLength={50000}
                    plain={entry.format !== "markdown"} onChange={body => edit({ body })} />
                  <div className="word-count">
                    <span>♧ 私密日记 · 仅自己可见</span>
                  </div>
                  <div className="tomorrow-editor">
                    <div>
                      <label htmlFor="tomorrow-note">
                        下一天的每日一句
                      </label>
                      <span className="small-label">提前记录 · {shiftDay(date)} 展示</span>
                    </div>
                    <textarea
                      id="tomorrow-note"
                      placeholder="比如：别着急，慢慢来，你已经走了很远。"
                      maxLength={200}
                      value={entry.tomorrow}
                      onChange={(e) => edit({ tomorrow: e.target.value })}
                    />
                    <div className="word-count">
                      <span>
                        {shiftDay(date) <= today
                          ? "这句话保存后会出现在对应日期的公开回看中。"
                          : "这句话届时公开，日记正文不会公开。"}
                      </span>
                      <span>{entry.tomorrow.length} / 200</span>
                    </div>
                  </div>
                </fieldset>
                <div className="save-row">
                  <span className={dirty ? "unsaved" : "saved"} role="status">
                    {dirty
                      ? "● 有未保存的文字"
                      : notice || (entry.updated ? "✓ 已保存" : "文字会在点击保存后收好")}
                  </span>
                  <button className="paper-button" onClick={save} disabled={busy || !dirty}>
                    {busy ? "正在收好…" : "保存这一天 ↗"}
                  </button>
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
