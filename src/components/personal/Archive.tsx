"use client";

import { useState } from "react";
import Link from "next/link";
import { Column, Row, Text } from "@once-ui-system/core";
import { journal, readingMinutes, type JournalEntry } from "./data";
import styles from "./Personal.module.scss";

export function JournalRow({ entry }: { entry: JournalEntry }) {
  return (
    <Link href={`/blog/${entry.slug}`} className={styles.journalLink}>
      <Text className={styles.journalTitle}>
        {entry.title}
        <span className={styles.rowArrow} aria-hidden="true">
          ↗
        </span>
      </Text>
      <Row gap="16" vertical="center" className={styles.journalMeta}>
        <Text as="time" dateTime={entry.date}>
          {entry.date.slice(5).replace("-", "/")}
        </Text>
        <Text className={styles.readTime}>{readingMinutes(entry)} min</Text>
      </Row>
    </Link>
  );
}

export function Archive() {
  const [category, setCategory] = useState("全部");
  const entries = journal.filter((p) => category === "全部" || p.category === category);
  const years = [...new Set(entries.map((p) => p.date.slice(0, 4)))];
  return (
    <Column fillWidth>
      <Row gap="24" className={styles.filters} role="group" aria-label="按文章分类筛选">
        {["全部", "技术", "随笔", "摄影"].map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            className={styles.filter}
          >
            {item}
            <span>
              {item === "全部" ? journal.length : journal.filter((p) => p.category === item).length}
            </span>
          </button>
        ))}
      </Row>
      <Column fillWidth aria-live="polite" className={styles.archive}>
        {years.map((year) => (
          <Column
            as="section"
            key={year}
            fillWidth
            className={styles.yearGroup}
            aria-label={`${year} 年文章`}
          >
            <Text as="h2" className={styles.year}>
              {year}
            </Text>
            {entries
              .filter((p) => p.date.startsWith(year))
              .map((entry) => (
                <JournalRow key={entry.slug} entry={entry} />
              ))}
          </Column>
        ))}
      </Column>
      <Text className={styles.endnote}>
        不定期更新，持续保持好奇。<span aria-hidden="true"> ✳</span>
      </Text>
    </Column>
  );
}
