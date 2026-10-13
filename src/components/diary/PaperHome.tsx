"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Calendar, Quote, displayDate, localDay } from "./shared";
import { homeContent, journal, photographs, site, assetPath } from "@/components/personal/data";
import publishedQuotes from "@/content/public-quotes.json";
const staticSite = process.env.NEXT_PUBLIC_STATIC_SITE === "1";
export function PaperHome() {
  const [today, setToday] = useState("");
  const [selected, setSelected] = useState("");
  const lastDay = useRef("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        let data: { today: string; quotes: Quote[] };
        if (staticSite) {
          const day = localDay();
          data = { today: day, quotes: (publishedQuotes as Quote[]).filter((q) => q.date <= day) };
        } else {
          const res = await fetch("/api/diary?action=public", { cache: "no-store" });
          if (!res.ok) throw new Error();
          data = await res.json();
        }
        if (!active) return;
        const old = lastDay.current;
        setSelected((current) => (!current || current === old ? data.today : current));
        lastDay.current = data.today;
        setToday(data.today);
        setQuotes(data.quotes);
        setReady(true);
        setError("");
      } catch {
        if (active) {
          setError("暂时无法读取这一天的记录，稍后会自动重试。");
          setToday(localDay());
          setSelected((current) => current || localDay());
        }
      }
    }
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const quote = quotes.find((q) => q.date === today);
  const memory = quotes.find((q) => q.date === selected);
  const previous = quotes.filter(q => q.date < selected).sort((a,b) => b.date.localeCompare(a.date))[0];
  const next = quotes.filter(q => q.date > selected).sort((a,b) => a.date.localeCompare(b.date))[0];
  const latestPost = journal.find(post => !post.sample) || journal[0];
  const photo = photographs.find(item => item.src !== homeContent.cover) || photographs[0];
  return (
    <div className="paper-home memory-home">
      <section className="paper-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="green-dot" /> {homeContent.badge}
          </div>
          <h1>
            {homeContent.headline}
            <br />
            <span className="memory-headline">{homeContent.subheadline}</span>
          </h1>
          <p>
            {homeContent.intro}
          </p>
          <div className="hero-actions">
            <Link className="paper-button" href="/#calendar">
              翻翻往日 <span>↓</span>
            </Link>
            <Link className="quiet-link" href="/about">
              关于这个恋旧的人 <span>↗</span>
            </Link>
          </div>
          <div className="hero-footnote">
            <span className="memory-rule" /> {site.tagline}
          </div>
        </div>
        <figure className="hero-still memory-photo">
          <div className="memory-photo-index"><span>01 / 片刻留存</span><span>THE LITTLE THINGS</span></div>
          <div className="memory-photo-frame">
            {homeContent.cover ? <img src={assetPath(homeContent.cover)} alt={homeContent.coverAlt} /> : <span>把日常，慢慢留存。</span>}
          </div>
          <figcaption>
            <span>{homeContent.coverTitle}<br /><em>{homeContent.coverSubtitle}</em></span>
            <p>{homeContent.coverDescription}</p>
          </figcaption>
        </figure>
      </section>
      <section className="today-letter" aria-label="今日的一句话">
        <div className="letter-side">
          <span className="eyebrow">ONE DAY, ONE THOUGHT</span>
          <div>
            每日一句
          </div>
          <span className="subtle">把这一刻，留在今天。</span>
        </div>
        <div className="letter-content">
          <span className="quote-mark" aria-hidden="true">“</span>
          <p>{error || (!ready ? "正在翻开今天…" : quote?.text || "今天，暂且留白。")}</p>
          <span className="subtle">
            {quote
              ? "一句感想，或一句喜欢的话，都是这一天的注脚。"
              : "不必每天都有故事，想记下的时候再写。"}
          </span>
        </div>
        <div className="letter-date">
          <b>{today ? today.slice(8) : "—"}</b>
          <span>{today ? `${today.slice(0, 4)} / ${today.slice(5, 7)}` : "TODAY"}</span>
          <span className="date-caption">TODAY</span>
        </div>
      </section>
      <section id="calendar" className="time-section">
        <div className="section-title">
          <div>
            <div className="eyebrow">02 / THE DAYS WE KEEP</div>
            <h2>
              往日拾零<span>按日期，找回一个片刻</span>
            </h2>
          </div>
          <span className="archive-count">{String(quotes.length).padStart(2, "0")} <small>个日子，留有痕迹</small></span>
        </div>
        <div className="time-layout">
          {selected && (
            <Calendar
              selected={selected}
              today={today}
              onSelect={setSelected}
              quoteDays={quotes.map((q) => q.date)}
            />
          )}
          <div className="memory-page">
            <div className="memory-top">
              <span>{selected ? displayDate(selected) : "正在翻开日历…"}</span>
              <span className="public-tag">{memory ? "这一日 · 已留存" : "这一日 · 留白"}</span>
            </div>
            <span className="memory-quote" aria-hidden="true">“</span>
            <p>{error || (ready ? memory?.text || "这一天没有留下文字，\n也许只是好好地过了生活。" : "正在读取记录…")}</p>
            <div className="memory-bottom">
              <span>
                {memory
                  ? "再读到时，愿你还记得当时的心情。"
                  : "有些回忆，就留在心里。"}
              </span>
              <div className="memory-paging" aria-label="翻看已记录的日期">
                <button type="button" disabled={!previous} onClick={() => previous && setSelected(previous.date)}>← 上一条</button>
                <button type="button" disabled={!next} onClick={() => next && setSelected(next.date)}>下一条 →</button>
              </div>
            </div>
          </div>
        </div>
        <div className="calendar-caption">
          <span>点亮的日期，是记忆留下的路标。</span>
          {process.env.NODE_ENV === "development" && <Link href="/studio#daily-quote">记录今天的一句话 ↗</Link>}
        </div>
      </section>
      <section className="more-section">
        <div className="section-title">
          <div>
            <div className="eyebrow">03 / COLLECTED ALONG THE WAY</div>
            <h2>
              那些不想忘记的<span>写下来，也拍下来</span>
            </h2>
          </div>
          <Link className="quiet-link" href="/blog">
            全部文字 <span>↗</span>
          </Link>
        </div>
        <div className="more-grid">
          <Link className="article-teaser" href={latestPost ? `/blog/${latestPost.slug}` : "/blog"}>
            <span className="eyebrow">文字留存 / WORDS</span>
            <h3>{latestPost?.title || "一些琐碎，一些舍不得忘记"}</h3>
            <p>{latestPost?.summary || "把经历和想法放在这里，等以后慢慢翻。"}</p>
            <span className="teaser-bottom">
              {latestPost?.sample ? "模板示例 · " : ""}{latestPost?.date.replaceAll("-", ".") || "随时记下"} <span>读这一篇 ↗</span>
            </span>
          </Link>
          <Link className="gallery-teaser" href="/gallery">
            {(photo?.src || homeContent.cover) && <img src={assetPath(photo?.src || homeContent.cover)} alt={photo?.title || homeContent.coverAlt} />}
            <div>
              <span className="eyebrow">光影留存 / PHOTOGRAPHS</span>
              <h3>
                照片会记得 <span>↗</span>
              </h3>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
