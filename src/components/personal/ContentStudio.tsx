"use client";
import { studioExtensions } from '@/content/local-extensions';

import { useEffect, useMemo, useState } from "react";
import { Column, Row, Heading, Text } from "@once-ui-system/core";
import { validateContent, type SiteContent } from "@/lib/content-schema";
import styles from "./Studio.module.scss";
import { DailyQuoteEditor } from "./DailyQuoteEditor";
import { AlbumStudio } from "./AlbumStudio";
import { MarkdownEditor } from "@/components/markdown/MarkdownEditor";
import { readMarkdownFile, sectionsToMarkdown } from "@/lib/markdown";

type Panel = "quotes" | "home" | "journal" | "photographs" | "projects" | "settings" | `extension:${string}`;
type PublishState = {
  status: "idle" | "running" | "success" | "error";
  message: string;
  url?: string;
  finishedAt?: string;
};
function Field({
  label,
  value,
  onChange,
  multiline = false,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
  type?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ContentStudio({
  initial,
  publicUrl,
}: { initial: { content: SiteContent; revision: string }; publicUrl: string }) {
  const [content, setContent] = useState(initial.content);
  const [revision, setRevision] = useState(initial.revision);
  const [saved, setSaved] = useState(JSON.stringify(initial.content));
  const [panel, setPanel] = useState<Panel>("home");
  const [selected, setSelected] = useState(0);
  const [quoteDirty, setQuoteDirty] = useState(false);
  const [extensionDirty,setExtensionDirty]=useState(false);
  const ExtensionPanel=studioExtensions.find(extension=>panel===`extension:${extension.id}`)?.Component;
  const [quoteBusy, setQuoteBusy] = useState(false);
  useEffect(() => {
    const openQuoteTab = () => {
      const extension=studioExtensions.find(item=>window.location.hash===`#${item.id}`);
      if(extension)setPanel(`extension:${extension.id}`);
      if (window.location.hash === "#daily-quote") setPanel("quotes");
      if (window.location.hash === "#photographs") setPanel("photographs");
    };
    openQuoteTab();
    window.addEventListener('hashchange',openQuoteTab);
    return () => window.removeEventListener('hashchange',openQuoteTab);
  }, []);
  const [saving, setSaving] = useState(false),
    [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("内容保存在这台电脑的项目中，保存后即可预览。");
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<SiteContent | null>(null);
  const [publish, setPublish] = useState<PublishState>({
    status: "idle",
    message: "首次发布后，别人就能通过公网网址访问。",
  });
  const dirty = useMemo(() => JSON.stringify(content) !== saved, [content, saved]);
  const busy = saving || uploading || importing || quoteBusy || publish.status === "running";
  const post = content.journal[selected],
    project = content.projects[selected];

  useEffect(() => {
    if (!dirty && !extensionDirty && !uploading) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty,extensionDirty,uploading]);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const response = await fetch("/api/studio/publish", { cache: "no-store" });
        if (!response.ok) return;
        const state = await response.json();
        if (alive) {
          setPublish(state);
          if (state.status === "running") timer = setTimeout(check, 2500);
        }
      } catch {
        if (alive && publish.status === "running") timer = setTimeout(check, 4000);
      }
    };
    check();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [publish.status]);
  const edit = (change: (draft: SiteContent) => void) => {
    setContent((current) => {
      const next = structuredClone(current);
      change(next);
      return next;
    });
    setUndo(null);
    setError("");
  };
  const switchPanel = (next: Panel) => {
    if (next === panel) return;
    if (quoteDirty && !window.confirm("每日一句还没有保存，确定切换栏目并放弃修改吗？")) return;
    if (extensionDirty && !window.confirm("当前页面的修改尚未保存，确定放弃修改吗？")) return;
    setExtensionDirty(false);
    setPanel(next);
    setSelected(0);
  };
  const save = async () => {
    setError("");
    setSaving(true);
    try {
      const valid = validateContent(content);
      const response = await fetch("/api/studio/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Homepage-Editor": "1" },
        body: JSON.stringify({ content: valid, revision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRevision(result.revision);
      setSaved(JSON.stringify(valid));
      setContent(valid);
      setUndo(null);
      setMessage(
        `已保存到网页 · ${new Date(result.savedAt).toLocaleTimeString("zh-CN")} · 上一个版本已自动备份`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };
  const upload = async (
    file: File,
    apply: (draft: SiteContent, src: string, orientation: "vertical" | "horizontal") => void,
  ) => {
    setError("");
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/studio/upload", {
        method: "POST",
        headers: { "X-Homepage-Editor": "1" },
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      edit((c) => apply(c, result.src, result.orientation));
      setMessage("图片已加入，点击「保存到网页」后生效。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  };
  const imageField = (
    label: string,
    src: string,
    apply: (draft: SiteContent, src: string, orientation?: "vertical" | "horizontal") => void,
  ) => (
    <Column gap="12" className={styles.imageField}>
      {src && <img src={src} alt={`${label}预览`} />}
      <label className={styles.upload}>
        <span>{uploading ? "正在处理图片…" : `上传${label}`}</span>
        <input
          type="file"
          aria-label={`上传${label}`}
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const input = e.currentTarget;
            const file = input.files?.[0];
            if (file) await upload(file, apply);
            input.value = "";
          }}
        />
      </label>
      <Field
        label={`${label}路径`}
        value={src}
        onChange={(v) => edit((c) => apply(c, v))}
        hint="支持 JPEG、PNG、WebP，单张不超过 20 MB。上传时生成适合网页的图片，电脑上的原图不会改变。"
      />
    </Column>
  );
  const remove = (kind: "journal" | "projects", index: number) => {
    const previous = content;
    edit((c) => c[kind].splice(index, 1));
    setUndo(previous);
    setSelected(Math.max(0, index - 1));
    setMessage("已从列表移除，保存后生效。可以撤销这次删除。");
  };
  const add = () => {
    const id = Date.now().toString();
    if (panel === "journal") {
      setSelected(content.journal.length);
      edit((c) =>
        c.journal.push({
          slug: `new-post-${id}`,
          title: "新文章",
          date: new Date().toLocaleDateString("en-CA"),
          category: "随笔",
          summary: "",
          cover: "",
          sample: false,
          sections: [{ title: "", text: "" }],
          markdown: "",
        }),
      );
    }
    if (panel === "projects") {
      setSelected(content.projects.length);
      edit((c) =>
        c.projects.push({
          slug: `project-${id}`,
          name: "新项目",
          eyebrow: "SELECTED PROJECT",
          type: "个人项目",
          stack: "",
          summary: "",
          visual: "grid",
          cover: "",
          url: "",
          featured: true,
          sample: false,
          details: [""],
        }),
      );
    }
  };
  const importMarkdown = async (file: File) => {
    setError("");
    setImporting(true);
    try {
      if (content.journal.length >= 300) throw new Error("文章最多 300 篇，请整理后再导入。");
      const imported = await readMarkdownFile(file);
      edit(c => c.journal.push({
        ...imported,
        slug: `post-${crypto.randomUUID()}`,
        date: new Date().toLocaleDateString("en-CA"),
        category: "随笔",
        summary: "",
        cover: "",
        sample: false,
        sections: [{ title: "", text: "" }],
      }));
      setSelected(content.journal.length);
      setMessage(`已导入「${file.name}」。检查标题、日期与正文后，点击「保存到网页」，再发布到公网。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Markdown 导入失败，请重试。");
    } finally {
      setImporting(false);
    }
  };
  const exportBackup = () => {
    const file = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `homepage-content-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const publishWebsite = async () => {
    setError("");
    try {
      const response = await fetch("/api/studio/publish", {
        method: "POST",
        headers: { "X-Homepage-Editor": "1", "Content-Type": "application/json" },
        body: JSON.stringify({ revision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPublish(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法开始发布");
    }
  };
  const titles: Record<string,string> = {
    ...Object.fromEntries(studioExtensions.map(extension=>[`extension:${extension.id}`,extension.title])),
    quotes: "每日一句",
    home: "首页与关于",
    journal: "博客",
    photographs: "摄影",
    projects: "项目",
    settings: "站点设置",
  };
  const items =
    panel === "journal"
      ? content.journal.map((p) => p.title)
      : panel === "projects"
          ? content.projects.map((p) => p.name)
          : [];
  return (
    <Column className={styles.studio}>
      <Row
        horizontal="between"
        vertical="end"
        gap="24"
        s={{ direction: "column", horizontal: "start" }}
      >
        <Column gap="12">
          <Text className={styles.eyebrow}>YOUR PERSONAL PUBLISHING SPACE</Text>
          <Heading as="h1" className={styles.title}>
            内容工作室
          </Heading>
          <Text onBackground="neutral-weak">修改内容，保存预览，再发布到你的公网网站。</Text>
        </Column>
        <a className={styles.preview} href="/" target="_blank" rel="noreferrer">
          打开网站预览 ↗
        </a>
      </Row>
      {panel !== "quotes" && !ExtensionPanel && (
        <>
          <Row className={styles.toolbar} horizontal="between" vertical="center" gap="16">
            <Text className={styles.saveState}>
              {importing ? "正在读取 Markdown 文件" : uploading ? "正在上传图片" : dirty ? "有未保存的修改" : "所有修改已保存"}
            </Text>
            <Row gap="12">
              <button
                type="button"
                className={styles.secondary}
                disabled={busy}
                onClick={exportBackup}
              >
                导出内容备份
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={busy || !dirty}
                onClick={save}
              >
                {saving ? "保存中…" : "保存到网页"}
              </button>
            </Row>
          </Row>
          <Column gap="8" className={styles.status} aria-live="polite">
            <Text role={error ? "alert" : undefined}>{error || message}</Text>
            {undo && (
              <button
                className={styles.inlineButton}
                type="button"
                onClick={() => {
                  setContent(undo);
                  setUndo(null);
                  setMessage("已撤销删除。");
                }}
              >
                撤销删除
              </button>
            )}
          </Column>
        </>
      )}
      <Row
        className={styles.tabs}
        style={panel === "quotes" || ExtensionPanel ? { marginTop: 32 } : undefined}
        gap="8"
        role="group"
        aria-label="选择编辑内容"
      >
        {(Object.keys(titles) as Panel[]).map((key) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            aria-pressed={panel === key}
            onClick={() => switchPanel(key)}
          >
            {titles[key]}
            {key === "journal"
              ? ` ${content.journal.length}`
              : key === "photographs"
                ? ` ${content.photographs.length}`
                : key === "projects"
                  ? ` ${content.projects.length}`
                  : ""}
          </button>
        ))}
      </Row>
      {ExtensionPanel ? <ExtensionPanel onDirtyChange={setExtensionDirty}/> : panel === "quotes" ? (
        <DailyQuoteEditor onDirtyChange={setQuoteDirty} onBusyChange={setQuoteBusy} />
      ) : panel === "photographs" ? (
        <fieldset disabled={busy} className={styles.editor}><AlbumStudio content={content} onEdit={edit} onBusyChange={setUploading} /></fieldset>
      ) : (
        <fieldset disabled={busy} className={styles.editor}>
          {(panel === "journal" || panel === "projects") && (
            <Column className={styles.itemList} gap="8">
              <button className={styles.add} type="button" onClick={add}>
                ＋ 新增{panel === "journal" ? "文章" : "项目"}
              </button>
              {panel === "journal" && (
                <div className={styles.markdownImport}>
                  <label className={styles.upload}>
                    <span>导入 Markdown 文件</span>
                    <input type="file" aria-label="导入 Markdown 文件" accept=".md,.markdown"
                      onChange={async e => {
                        const input = e.currentTarget;
                        const file = input.files?.[0];
                        if (file) await importMarkdown(file);
                        input.value = "";
                      }} />
                  </label>
                  <p className={styles.help}>导入为新文章，文件名作为标题，正文原文保留。支持 UTF-8 编码，最多 10 万字符。图片请单独上传。</p>
                </div>
              )}
              {items.map((title, index) => (
                <button
                  type="button"
                  key={index}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {title || "未命名"}
                </button>
              ))}
            </Column>
          )}
          <Column className={styles.form} gap="24">
            {panel === "home" && (
              <>
                <Heading as="h2" variant="heading-strong-l">
                  首页文字
                </Heading>
                <Column className={styles.twoColumns}>
                  <Field
                    label="首页小标签"
                    value={content.home.badge}
                    onChange={(v) => edit((c) => (c.home.badge = v))}
                  />
                  <Field
                    label="显示姓名"
                    value={content.site.name}
                    onChange={(v) => edit((c) => (c.site.name = v))}
                  />
                  <Field
                    label="首页主标题"
                    value={content.home.headline}
                    onChange={(v) => edit((c) => (c.home.headline = v))}
                  />
                  <Field
                    label="第二行标题"
                    value={content.home.subheadline}
                    onChange={(v) => edit((c) => (c.home.subheadline = v))}
                  />
                </Column>
                <Field
                  label="首页介绍"
                  value={content.home.intro}
                  onChange={(v) => edit((c) => (c.home.intro = v))}
                  multiline
                  hint="按回车换行。"
                />
                <Heading as="h2" variant="heading-strong-l">
                  首页摄影封面
                </Heading>
                {imageField("首页封面", content.home.cover, (c, src) => (c.home.cover = src))}
                <Column className={styles.twoColumns}>
                  <Field
                    label="封面第一行标题"
                    value={content.home.coverTitle}
                    onChange={(v) => edit((c) => (c.home.coverTitle = v))}
                  />
                  <Field
                    label="封面第二行标题"
                    value={content.home.coverSubtitle}
                    onChange={(v) => edit((c) => (c.home.coverSubtitle = v))}
                  />
                </Column>
                <Field
                  label="封面说明"
                  value={content.home.coverDescription}
                  onChange={(v) => edit((c) => (c.home.coverDescription = v))}
                />
                <Field
                  label="图片内容描述"
                  value={content.home.coverAlt}
                  onChange={(v) => edit((c) => (c.home.coverAlt = v))}
                  hint="描述画面，方便使用屏幕阅读器的访客理解。"
                />
                <Heading as="h2" variant="heading-strong-l">
                  关于我
                </Heading>
                <Column className={styles.twoColumns}>
                  <Field
                    label="关于页标题"
                    value={content.about.title}
                    onChange={(v) => edit((c) => (c.about.title = v))}
                  />
                  <Field
                    label="问候语"
                    value={content.about.greeting}
                    onChange={(v) => edit((c) => (c.about.greeting = v))}
                  />
                </Column>
                <Field
                  label="个人介绍"
                  value={content.about.body}
                  onChange={(v) => edit((c) => (c.about.body = v))}
                  multiline
                  hint="段落之间空一行。"
                />
                <Field
                  label="兴趣与关键词"
                  value={content.about.interests}
                  onChange={(v) => edit((c) => (c.about.interests = v))}
                />
              </>
            )}
            {panel === "journal" &&
              (post ? (
                <>
                  <Row horizontal="between" vertical="center">
                    <Heading as="h2" variant="heading-strong-l">
                      编辑文章
                    </Heading>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => remove("journal", selected)}
                    >
                      删除文章
                    </button>
                  </Row>
                  <Field
                    label="文章标题"
                    value={post.title}
                    onChange={(v) => edit((c) => (c.journal[selected].title = v))}
                  />
                  <Column className={styles.twoColumns}>
                    <Field
                      label="文章日期"
                      type="date"
                      value={post.date}
                      onChange={(v) => edit((c) => (c.journal[selected].date = v))}
                    />
                    <Select
                      label="文章分类"
                      value={post.category}
                      options={["技术", "随笔", "摄影"].map((v) => ({ label: v, value: v }))}
                      onChange={(v) =>
                        edit((c) => (c.journal[selected].category = v as typeof post.category))
                      }
                    />
                  </Column>
                  <Field
                    label="文章链接标识"
                    value={post.slug}
                    onChange={(v) => edit((c) => (c.journal[selected].slug = v))}
                    hint="使用小写英文、数字和连字符，例如 first-post。发布后修改会改变文章网址。"
                  />
                  <Field
                    label="文章摘要"
                    value={post.summary}
                    onChange={(v) => edit((c) => (c.journal[selected].summary = v))}
                    multiline
                  />
                  {imageField(
                    "文章封面（可选）",
                    post.cover,
                    (c, src) => (c.journal[selected].cover = src),
                  )}
                  {post.markdown !== undefined ? (
                    <MarkdownEditor label="文章正文" value={post.markdown}
                      onChange={value => edit(c => { c.journal[selected].markdown = value; })} />
                  ) : <>
                  <button type="button" className={styles.secondary} onClick={() => {
                    edit(c => { c.journal[selected].markdown = sectionsToMarkdown(post.sections); });
                  }}>改用 Markdown 编辑（保留原有文字）</button>
                  <Heading as="h3" variant="heading-strong-m">
                    正文段落
                  </Heading>
                  {post.sections.map((section, index) => (
                    <Column className={styles.section} gap="16" key={index}>
                      <Row horizontal="between" vertical="center">
                        <Text>段落 {index + 1}</Text>
                        {post.sections.length > 1 && (
                          <button
                            type="button"
                            className={styles.remove}
                            onClick={() =>
                              edit((c) => c.journal[selected].sections.splice(index, 1))
                            }
                          >
                            移除段落
                          </button>
                        )}
                      </Row>
                      <Field
                        label={`段落 ${index + 1} 标题（可选）`}
                        value={section.title}
                        onChange={(v) =>
                          edit((c) => (c.journal[selected].sections[index].title = v))
                        }
                      />
                      <Field
                        label={`段落 ${index + 1} 正文`}
                        value={section.text}
                        onChange={(v) =>
                          edit((c) => (c.journal[selected].sections[index].text = v))
                        }
                        multiline
                      />
                    </Column>
                  ))}
                  <button
                    type="button"
                    className={styles.add}
                    onClick={() =>
                      edit((c) => c.journal[selected].sections.push({ title: "", text: "" }))
                    }
                  >
                    ＋ 添加段落
                  </button>
                  </>}
                  <Toggle
                    label="显示“示例文章”说明"
                    checked={post.sample}
                    onChange={(v) => edit((c) => (c.journal[selected].sample = v))}
                  />
                </>
              ) : (
                <Text>点击左侧“新增文章”，写下第一篇博客。</Text>
              ))}
            {panel === "projects" &&
              (project ? (
                <>
                  <Row horizontal="between" vertical="center">
                    <Heading as="h2" variant="heading-strong-l">
                      编辑项目
                    </Heading>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => remove("projects", selected)}
                    >
                      删除项目
                    </button>
                  </Row>
                  <Field
                    label="项目名称"
                    value={project.name}
                    onChange={(v) => edit((c) => (c.projects[selected].name = v))}
                  />
                  <Field
                    label="项目简介"
                    value={project.summary}
                    onChange={(v) => edit((c) => (c.projects[selected].summary = v))}
                    multiline
                  />
                  <Column className={styles.twoColumns}>
                    <Field
                      label="项目类别"
                      value={project.type}
                      onChange={(v) => edit((c) => (c.projects[selected].type = v))}
                    />
                    <Field
                      label="技术栈"
                      value={project.stack}
                      onChange={(v) => edit((c) => (c.projects[selected].stack = v))}
                    />
                    <Field
                      label="项目小标题"
                      value={project.eyebrow}
                      onChange={(v) => edit((c) => (c.projects[selected].eyebrow = v))}
                    />
                    <Select
                      label="卡片样式"
                      value={project.visual}
                      options={[
                        { value: "notes", label: "笔记窗口" },
                        { value: "photo", label: "摄影封面" },
                        { value: "grid", label: "交互格点" },
                      ]}
                      onChange={(v) =>
                        edit((c) => (c.projects[selected].visual = v as typeof project.visual))
                      }
                    />
                  </Column>
                  <Field
                    label="项目链接标识"
                    value={project.slug}
                    onChange={(v) => edit((c) => (c.projects[selected].slug = v))}
                    hint="使用小写英文、数字和连字符。"
                  />
                  <Field
                    label="项目公开网址（可选）"
                    value={project.url}
                    onChange={(v) => edit((c) => (c.projects[selected].url = v))}
                    hint="填写完整 HTTPS 链接，例如 GitHub 仓库或在线演示。"
                  />
                  {imageField(
                    "项目封面（可选）",
                    project.cover,
                    (c, src) => (c.projects[selected].cover = src),
                  )}
                  <Field
                    label="项目详细介绍"
                    value={project.details.join("\n\n")}
                    onChange={(v) =>
                      edit((c) => (c.projects[selected].details = v.split(/\n\s*\n/)))
                    }
                    multiline
                    hint="段落之间空一行。"
                  />
                  <Toggle
                    label="展示在首页"
                    checked={project.featured}
                    onChange={(v) => edit((c) => (c.projects[selected].featured = v))}
                  />
                  <Toggle
                    label="显示“示例项目”说明"
                    checked={project.sample}
                    onChange={(v) => edit((c) => (c.projects[selected].sample = v))}
                  />
                </>
              ) : (
                <Text>点击左侧“新增项目”，介绍你的作品。</Text>
              ))}
            {panel === "settings" && (
              <>
                <Heading as="h2" variant="heading-strong-l">
                  网站信息
                </Heading>
                <Column className={styles.twoColumns}>
                  <Field
                    label="显示姓名"
                    value={content.site.name}
                    onChange={(v) => edit((c) => (c.site.name = v))}
                  />
                  <Field
                    label="网站标题"
                    value={content.site.title}
                    onChange={(v) => edit((c) => (c.site.title = v))}
                  />
                </Column>
                <Field
                  label="网站描述"
                  value={content.site.description}
                  onChange={(v) => edit((c) => (c.site.description = v))}
                  multiline
                />
                <Field
                  label="导航右侧标语"
                  value={content.site.tagline}
                  onChange={(v) => edit((c) => (c.site.tagline = v))}
                />
                <Column className={styles.twoColumns}>
                  <Field
                    label="联系邮箱（可选）"
                    value={content.site.email}
                    onChange={(v) => edit((c) => (c.site.email = v))}
                  />
                  <Field
                    label="GitHub 主页（可选）"
                    value={content.site.github}
                    onChange={(v) => edit((c) => (c.site.github = v))}
                  />
                </Column>
                <Toggle
                  label="显示网站中的示例内容说明"
                  checked={content.site.showSampleNotes}
                  onChange={(v) => edit((c) => (c.site.showSampleNotes = v))}
                />
                <Heading as="h2" variant="heading-strong-l">
                  页面标题与说明
                </Heading>
                <Column className={styles.twoColumns}>
                  <Field
                    label="博客页标题"
                    value={content.pages.blogTitle}
                    onChange={(v) => edit((c) => (c.pages.blogTitle = v))}
                  />
                  <Field
                    label="博客页副标题"
                    value={content.pages.blogIntro}
                    onChange={(v) => edit((c) => (c.pages.blogIntro = v))}
                  />
                  <Field
                    label="摄影页第一行标题"
                    value={content.pages.galleryTitle}
                    onChange={(v) => edit((c) => (c.pages.galleryTitle = v))}
                  />
                  <Field
                    label="摄影页第二行标题"
                    value={content.pages.gallerySubtitle}
                    onChange={(v) => edit((c) => (c.pages.gallerySubtitle = v))}
                  />
                </Column>
                <Field
                  label="摄影页介绍"
                  value={content.pages.galleryIntro}
                  onChange={(v) => edit((c) => (c.pages.galleryIntro = v))}
                  multiline
                />
                <Column className={styles.twoColumns}>
                  <Field
                    label="摄影署名"
                    value={content.pages.galleryCredit}
                    onChange={(v) => edit((c) => (c.pages.galleryCredit = v))}
                    hint="替换示例照片后，可改成自己的摄影署名。"
                  />
                  <Field
                    label="摄影署名链接（可选）"
                    value={content.pages.galleryCreditUrl}
                    onChange={(v) => edit((c) => (c.pages.galleryCreditUrl = v))}
                  />
                  <Field
                    label="项目页标题"
                    value={content.pages.workTitle}
                    onChange={(v) => edit((c) => (c.pages.workTitle = v))}
                  />
                  <Field
                    label="项目页介绍"
                    value={content.pages.workIntro}
                    onChange={(v) => edit((c) => (c.pages.workIntro = v))}
                  />
                </Column>
                <Heading as="h2" variant="heading-strong-l">
                  恢复内容备份
                </Heading>
                <Text className={styles.help}>
                  导出的 JSON
                  包含文字和图片路径。完整备份请同时保留项目中的图片文件夹。导入后先检查，再保存。
                </Text>
                <label className={styles.upload}>
                  <span>导入 JSON 内容备份</span>
                  <input
                    type="file"
                    aria-label="导入 JSON 内容备份"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      const input = e.currentTarget;
                      const file = input.files?.[0];
                      if (!file) return;
                      try {
                        if (file.size > 4_000_000) throw new Error("备份不能超过 4 MB");
                        const next = validateContent(JSON.parse(await file.text()));
                        setContent(next);
                        setUndo(null);
                        setMessage("备份已载入，检查后点击「保存到网页」。");
                        setError("");
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "无法读取备份");
                      }
                      input.value = "";
                    }}
                  />
                </label>
              </>
            )}
          </Column>
        </fieldset>
      )}
      <Column className={styles.publish} gap="16">
        <Heading as="h2" variant="heading-strong-l">
          日记版的网站发布
        </Heading>
        <Text onBackground="neutral-weak">
          保存会更新本机的公开内容。每日一句可在上方编辑，私人日记在私人空间管理。
        </Text>
        <Text className={styles.help}>
          对外展示：保存后双击项目中的「发布公开主页.cmd」，仅上传网页、公开照片和已到展示日期的句子。日记与私密照片留在本机。具体步骤见
          docs/GITHUB_PAGES.md。
        </Text>
      </Column>
    </Column>
  );
}
