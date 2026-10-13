import { pages, site } from "@/components/personal/data";
import { Column, Heading, Text } from "@once-ui-system/core";
import { projects, ProjectPreview } from "@/components/personal";
import styles from "@/components/personal/Personal.module.scss";

export const metadata = { title: "Projects · 项目", description: "把好奇心做成可以使用的小东西。" };
export default function Work() {
  return (
    <Column className={styles.shell}>
      <Column className={styles.workHeader}>
        <Text className={styles.eyebrow}>IDEAS, MADE TANGIBLE</Text>
        <Heading as="h1" className={styles.pageTitle} marginTop="16">
          {pages.workTitle}
        </Heading>
        <Text className={styles.pageSubtitle}>{pages.workIntro}</Text>
      </Column>
      <Column className={`${styles.projectGrid} ${styles.workList}`}>
        {projects.map((project) => (
          <ProjectPreview key={project.slug} project={project} />
        ))}
      </Column>
      {site.showSampleNotes && (
        <Text className={styles.endnote}>项目名称与介绍为排版示例，可替换为你的实际作品。</Text>
      )}
    </Column>
  );
}
