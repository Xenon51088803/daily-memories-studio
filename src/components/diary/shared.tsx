"use client";
import { useEffect, useState } from "react";

export type Quote = { date: string; text: string };
export const localDay = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function shiftDay(day: string, amount = 1) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export const displayDate = (day: string) =>
  new Date(day + "T12:00:00Z").toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "UTC",
  });
export async function api(action: string, payload: object = {}) {
  const res = await fetch("/api/diary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "操作失败，请重试");
  return data;
}
export function Calendar({
  selected,
  onSelect,
  today,
  quoteDays = [],
  diaryDays = [],
}: {
  selected: string;
  onSelect: (date: string) => void;
  today: string;
  quoteDays?: string[];
  diaryDays?: string[];
}) {
  const [month, setMonth] = useState(selected.slice(0, 7));
  useEffect(() => setMonth(selected.slice(0, 7)), [selected]);
  const [year, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const first = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  function move(amount: number) {
    const d = new Date(Date.UTC(year, m - 1 + amount, 1));
    setMonth(d.toISOString().slice(0, 7));
  }
  return (
    <div className="paper-calendar">
      <div className="calendar-head">
        <strong>
          {year} 年 <span>{String(m).padStart(2, "0")} 月</span>
        </strong>
        <div>
          <button type="button" aria-label="上个月" onClick={() => move(-1)}>
            ←
          </button>
          <button
            type="button"
            className="calendar-today"
            onClick={() => {
              setMonth(today.slice(0, 7));
              onSelect(today);
            }}
          >
            今天
          </button>
          <button
            type="button"
            aria-label="下个月"
            disabled={month >= today.slice(0, 7)}
            onClick={() => move(1)}
          >
            →
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {"一二三四五六日".split("").map((x) => (
          <span className="weekday" key={x}>
            {x}
          </span>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = `${month}-${String(i + 1).padStart(2, "0")}`;
          return (
            <button
              type="button"
              key={day}
              aria-label={day}
              aria-pressed={selected === day}
              disabled={day > today}
              onClick={() => onSelect(day)}
              className={`${selected === day ? "selected" : ""} ${day === today ? "is-today" : ""}`}
            >
              <span>{i + 1}</span>
              <i className="day-dots">
                {quoteDays.includes(day) && <b />}
                {diaryDays.includes(day) && <b className="diary-dot" />}
              </i>
            </button>
          );
        })}
      </div>
      <div className="calendar-key">
        <span>
          <i /> 有一句话
        </span>
        {diaryDays.length > 0 && (
          <span>
            <i className="diary-dot" /> 有日记
          </span>
        )}
        <span className="key-note">点击日期，翻开那一天</span>
      </div>
    </div>
  );
}
