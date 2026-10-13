import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import styles from "./Markdown.module.scss";

export function MarkdownBody({ source, plain = false }: { source: string; plain?: boolean }) {
  return (
    <div className={`${styles.prose} ${plain ? styles.plain : ""}`}>
      {plain ? source : (
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false }]]} skipHtml components={{
          img: ({ alt }) => <span className={styles.imageNote}>[图片：{alt || "未命名"} · 正文插图暂不支持]</span>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
          table: ({ children }) => <div className={styles.tableScroll}><table>{children}</table></div>,
        }}>{source}</ReactMarkdown>
      )}
    </div>
  );
}
