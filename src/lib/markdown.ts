export async function readMarkdownFile(file: File) {
  if (!/\.(md|markdown)$/i.test(file.name)) throw new Error("请选择 .md 或 .markdown 文件。");
  if (file.size > 400000) throw new Error("Markdown 文件不能超过 400 KB，正文最多 100,000 个字符。");
  const bytes = await file.arrayBuffer();
  let markdown: string;
  try {
    markdown = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("无法读取文件编码，请将文章另存为 UTF-8 编码后再导入。");
  }
  markdown = markdown.replace(/\r\n?/g, "\n");
  if (markdown.includes("\0")) throw new Error("文件包含非文本内容，请选择 UTF-8 编码的 Markdown 文件。");
  if (!markdown.trim()) throw new Error("这个文件没有正文，请选择有内容的 Markdown 文件。");
  if (markdown.length > 100000) throw new Error("Markdown 正文最多 100,000 个字符，文件未导入。");
  return { title: file.name.replace(/\.(md|markdown)$/i, "").trim().slice(0, 300) || "导入的文章", markdown };
}

// Escape existing plain text when the owner explicitly converts a legacy article.
export function sectionsToMarkdown(sections: { title: string; text: string }[]) {
  const escape = (text: string) => text.replace(/[\\`*{}\[\]()#+\-.!_>|~]/g, "\\$&");
  return sections.map(section => [
    section.title ? `## ${escape(section.title)}` : "",
    escape(section.text).replace(/\r?\n/g, "  \n"),
  ].filter(Boolean).join("\n\n")).join("\n\n");
}
