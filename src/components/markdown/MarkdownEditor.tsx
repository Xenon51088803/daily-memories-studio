"use client";

import { useId, useState } from "react";
import { MarkdownBody } from "./MarkdownBody";
import styles from "./Markdown.module.scss";

export function MarkdownEditor({ value, onChange, label, maxLength = 100000, plain = false }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  maxLength?: number;
  plain?: boolean;
}) {
  const id = useId();
  const [mode, setMode] = useState<"split" | "edit" | "preview">("split");
  return (
    <section className={styles.editor} aria-label={`${label}编辑器`}>
      <div className={styles.bar}>
        <label htmlFor={id}>{label} · {plain ? "纯文本" : "Markdown"}</label>
        <div className={styles.modes} role="group" aria-label="编辑视图">
          {([ ["edit", "编辑"], ["preview", "预览"], ["split", "分屏"] ] as const).map(([key, text]) => (
            <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}>{text}</button>
          ))}
        </div>
      </div>
      <div className={`${styles.panes} ${mode === "split" ? styles.split : ""}`}>
        {mode !== "preview" && <textarea id={id} aria-label={label} value={value}
          maxLength={maxLength} spellCheck={false}
          placeholder={plain ? "写下今天的生活……" : "## 今天的小事\n\n写下正文，右侧会实时显示排版效果。"}
          onChange={e => onChange(e.target.value)} />}
        {mode !== "edit" && <div className={styles.preview} role="region" aria-label={`${label}实时预览`}>
          <span className={styles.caption}>实时预览 · 尚未保存的修改也会显示</span>
          {value ? <MarkdownBody source={value} plain={plain} /> : <p className={styles.empty}>从一句话开始，预览会在这里展开。</p>}
        </div>}
      </div>
      <div className={styles.footnote}>
        <span>{plain ? "保留原文与换行；切换 Markdown 后才会解析格式。" : "支持标题、列表、表格、代码块及数学公式（$ 行内 / $$ 独立行）；暂不显示正文图片及 HTML。"}</span>
        <span>{value.length.toLocaleString()} / {maxLength.toLocaleString()}</span>
      </div>
    </section>
  );
}
