import Link from "next/link";
import { Column, Row, Text, Heading, Media } from "@once-ui-system/core";
import { journal, projects, site, assetPath, readingMinutes, type JournalEntry } from "./data";
import { JournalRow } from "./Archive";
import styles from "./Personal.module.scss";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";

export function JournalArticle({ entry }: { entry: JournalEntry }) {
  return (
    <Column as="article" className={styles.articlePage}>
      <Link href="/blog" className={styles.softLink}>
        ← 所有文章
      </Link>
      <Heading as="h1" className={styles.articleTitle}>
        {entry.title}
      </Heading>
      <Text as="p" className={styles.articleSummary}>
        {entry.summary}
      </Text>
      <Row className={styles.articleMetadata}>
        <Text as="time" dateTime={entry.date}>
          {entry.date.replaceAll("-", ".")}
        </Text>
        <Text>{entry.category}</Text>
        <Text>{readingMinutes(entry)} min read</Text>
      </Row>
      {entry.cover && (
        <Media
          src={assetPath(entry.cover)}
          alt={entry.title}
          aspectRatio="16/9"
          marginTop="32"
          radius="m"
          sizes="(max-width: 672px) 100vw, 672px"
        />
      )}
      <Column className={styles.articleBody}>
        {entry.markdown !== undefined ? <MarkdownBody source={entry.markdown} /> : entry.sections.map((section, index) => (
          <Column as="section" key={index}>
            {section.title && <Heading as="h2">{section.title}</Heading>}
            <Text as="p" style={{whiteSpace:"pre-line"}}>{section.text}</Text>
          </Column>
        ))}
      </Column>
      {site.showSampleNotes && entry.sample && <Text className={styles.previewNote}>这是一篇用于预览阅读体验的示例文章。</Text>}
      <Column as="aside" marginTop="48">
        <Text className={styles.eyebrow} marginBottom="16">
          KEEP READING
        </Text>
        {journal
          .filter((p) => p.slug !== entry.slug)
          .slice(0, 2)
          .map((p) => (
            <JournalRow entry={p} key={p.slug} />
          ))}
      </Column>
    </Column>
  );
}

export function ProjectArticle({ project }: { project: (typeof projects)[number] }) {
  return (
    <Column as="article" className={styles.articlePage}>
      <Link href="/work" className={styles.softLink}>
        ← 所有项目
      </Link>
      <Text className={styles.eyebrow} marginTop="40">
        {project.eyebrow}
      </Text>
      <Heading as="h1" className={styles.articleTitle}>
        {project.name}
      </Heading>
      <Text as="p" className={styles.articleSummary}>
        {project.summary}
      </Text>
      <Row className={styles.articleMetadata}>
        <Text>{project.type}</Text>
        <Text>{project.stack}</Text>
      </Row>
      <Column className={styles.articleBody}>
        <Heading as="h2">从一个小想法开始</Heading>
        {project.details.map((text) => (
          <Text as="p" key={text}>
            {text}
          </Text>
        ))}
      </Column>
      {project.cover && (
        <Media
          src={assetPath(project.cover)}
          alt={project.name}
          aspectRatio="16/9"
          radius="m"
          sizes="(max-width: 672px) 100vw, 672px"
        />
      )}
      <Link
        href={project.url || (project.visual === "photo" ? "/gallery" : "/")}
        className={styles.solidLink}
        style={{ width: "fit-content" }}
      >
        {project.url ? "访问项目" : project.visual === "photo" ? "浏览摄影页" : "回到首页体验"}{" "}
        <span aria-hidden="true">↗</span>
      </Link>
      {site.showSampleNotes && project.sample && <Text className={styles.endnote}>项目展示示例 · 内容与实际项目链接待替换。</Text>}
    </Column>
  );
}
