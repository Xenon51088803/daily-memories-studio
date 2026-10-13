"use client";
import { useEffect, useState } from "react";
import { shiftDay } from "@/components/diary/shared";
import styles from "./Studio.module.scss";

type Quote = { date: string; text: string; version: number };
type Summary = { date: string; text: string };
export function DailyQuoteEditor({
  onDirtyChange,
  onBusyChange,
}: { onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void }) {
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [text, setText] = useState("");
  const [quotes, setQuotes] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const dirty = quote !== null && text !== quote.text;
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange(saving);
    return () => onBusyChange(false);
  }, [saving, onBusyChange]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/studio/quotes${date ? `?date=${date}` : ""}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setToday(data.today);
        setQuote(data.quote);
        setText(data.quote.text);
        setQuotes(data.quotes);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, retry]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const leave = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a");
      if (
        dirty &&
        link &&
        link.target !== "_blank" &&
        !window.confirm("每日一句还没有保存，确定离开吗？")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty]);
  function choose(value: string) {
    if (!value || loading || saving || value === quote?.date) return;
    if (dirty && !window.confirm("每日一句还没有保存，确定切换日期并放弃修改吗？")) return;
    setQuote(null);
    setDate(value);
    setNotice("");
  }
  async function save() {
    if (!quote) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/studio/quotes", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Homepage-Editor": "1" },
        body: JSON.stringify({ ...quote, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuote(data.quote);
      setText(data.quote.text);
      setQuotes(data.quotes);
      setToday(data.today);
      setNotice(
        data.quote.text
          ? data.quote.date > data.today
            ? "已保存明天的每日一句。到展示日期后，再发布到公网。"
            : "已保存，本机预览已更新。发布公开主页后，公网才会更新。"
          : "已清空这一天的句子。重新发布后，公网页面才会同步移除。",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className={styles.quoteEditor} aria-label="每日一句编辑器">
      <div className={styles.quoteIntro}>
        <div>
          <h2>每日一句</h2>
          <p>一句感想，一段摘录，给这一天留个注脚。</p>
        </div>
        <a className={styles.preview} href="/diary">
          写私人日记 ↗
        </a>
      </div>
      <p className={styles.quoteHint}>
        选择的是<strong>展示日期</strong>。日记正文始终留在私人空间，这里只编辑公开的一句话。
      </p>
      <div className={styles.quoteLayout}>
        <div className={styles.quoteForm}>
          <div className={styles.quoteDates}>
            <label className={styles.field}>
              展示日期
              <input
                aria-label="每日一句展示日期"
                type="date"
                min="1900-01-01"
                max={today ? shiftDay(today) : undefined}
                value={date || quote?.date || ""}
                disabled={loading || saving}
                onChange={(e) => choose(e.target.value)}
              />
            </label>
            <div className={styles.quoteQuick}>
              <button
                className={styles.secondary}
                disabled={!today || loading || saving}
                onClick={() => choose(today)}
              >
                今天展示
              </button>
              <button
                className={styles.secondary}
                disabled={!today || loading || saving}
                onClick={() => choose(shiftDay(today))}
              >
                提前写明天
              </button>
            </div>
          </div>
          {error && (
            <div className="paper-error" role="alert">
              {error}
              {!quote && (
                <button className={styles.inlineButton} onClick={() => setRetry((v) => v + 1)}>
                  重新读取
                </button>
              )}
            </div>
          )}
          {loading ? (
            <p role="status">正在读取这一天的句子…</p>
          ) : (
            quote && (
              <>
                <label className={styles.field} htmlFor="studio-daily-quote">
                  这一天的一句话
                  <textarea
                    id="studio-daily-quote"
                    placeholder="写下想留给那一天的话……按 Enter 可换行"
                    maxLength={200}
                    rows={5}
                    value={text}
                    disabled={saving}
                    onChange={(e) => {
                      setText(e.target.value);
                      setNotice("");
                    }}
                  />
                </label>
                <div className={styles.quoteMeta}>
                  <span>
                    {quote.date > today
                      ? "尚未到展示日期，不会提前上传"
                      : quote.text
                        ? "已到展示日期，可发布到公网"
                        : "这一天暂时没有句子"}
                  </span>
                  <span>{text.length} / 200 字</span>
                </div>
                <div className={styles.quotePreview}>
                  <span>{quote.date} · 主页展示预览</span>
                  <p>{text.trim() || "这一天，留了一点空白。"}</p>
                </div>
                <div className={styles.quoteActions}>
                  <span role="status">{dirty ? "有未保存的句子" : notice || "当前内容已保存"}</span>
                  <button className={styles.primary} disabled={!dirty || saving} onClick={save}>
                    {saving ? "保存中…" : "保存每日一句"}
                  </button>
                </div>
                <p className={styles.help}>
                  保存只更新本机。要更新 GitHub
                  Pages，请双击项目中的「发布公开主页.cmd」；未来日期的句子需到当天再发布。清空文字并保存可撤回句子。
                </p>
              </>
            )
          )}
        </div>
        <aside className={styles.quoteHistory}>
          <h3>已经留下的话</h3>
          {quotes.length === 0 ? (
            <p className={styles.help}>还没有句子，从今天开始留下一句话吧。</p>
          ) : (
            quotes.map((item) => (
              <button
                key={item.date}
                disabled={loading || saving}
                aria-pressed={quote?.date === item.date}
                onClick={() => choose(item.date)}
              >
                <span>
                  {item.date}
                  {item.date > today ? " · 待展示" : ""}
                </span>
                <p>{item.text}</p>
              </button>
            ))
          )}
        </aside>
      </div>
    </section>
  );
}
