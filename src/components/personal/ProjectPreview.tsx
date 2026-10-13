"use client";

import Link from "next/link";
import { Column, Row, Text, Heading, Media } from "@once-ui-system/core";
import { projects, assetPath } from "./data";
import styles from "./Personal.module.scss";

export function ProjectPreview({ project }: { project: (typeof projects)[number] }) {
  return (
    <Link href={`/work/${project.slug}`} className={styles.projectLink}>
      <Column className={`${styles.projectVisual} ${styles[project.visual]}`}>
        {project.visual === "notes" && !project.cover && (
          <Column className={styles.miniWindow}>
            <Row horizontal="between" className={styles.windowTop}>
              <Text>✳ fieldnotes</Text>
              <Text>↗</Text>
            </Row>
            <Row className={styles.windowBody}>
              <Column className={styles.windowSidebar} gap="12">
                <Text>Overview</Text>
                <Text>Writing</Text>
                <Text>Reading</Text>
                <Text>Bookmarks</Text>
              </Column>
              <Column gap="12" className={styles.windowContent}>
                <Text className={styles.windowLabel}>A SPACE FOR IDEAS</Text>
                <Heading as="h3">
                  Small thoughts,
                  <br />
                  growing together.
                </Heading>
                <Row className={styles.fakeLine} />
                <Row className={styles.fakeLine} style={{ width: "68%" }} />
                <Row gap="8">
                  <Text className={styles.miniTag}>Design</Text>
                  <Text className={styles.miniTag}>Life</Text>
                </Row>
              </Column>
            </Row>
          </Column>
        )}
        {project.cover && (
          <>
            <Media
              src={assetPath(project.cover)}
              alt={project.name}
              fill
              className={styles.projectPhoto}
              sizes="(max-width: 640px) 100vw, 500px"
            />
            <Text className={styles.photoWordmark}>{project.name}</Text>
          </>
        )}
        {(project.visual === "grid" || project.visual === "photo") && !project.cover && (
          <Column center fill className={styles.pixelVisual}>
            <Text className={styles.pixelFlower}>✳</Text>
            <Text className={styles.windowLabel}>FOLLOW YOUR CURIOSITY</Text>
          </Column>
        )}
      </Column>
      <Row horizontal="between" vertical="start" gap="12" paddingTop="20">
        <Column gap="8">
          <Heading as="h2" variant="heading-strong-l">
            {project.name}
          </Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {project.summary}
          </Text>
        </Column>
        <Text className={styles.projectArrow}>↗</Text>
      </Row>
      <Text className={styles.projectStack}>{project.stack}</Text>
    </Link>
  );
}
