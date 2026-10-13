import { pages } from "@/components/personal/data";
import { Column, Heading, Text } from "@once-ui-system/core";
import { Archive } from "@/components/personal";
import styles from "@/components/personal/Personal.module.scss";

export const metadata = {
  title: `${pages.blogTitle} · 博客`,
  description: pages.blogIntro,
};
export default function Blog() {
  return (
    <Column className={styles.writingPage}>
      <Text className={styles.eyebrow}>NOTES ALONG THE WAY</Text>
      <Heading as="h1" className={styles.pageTitle} marginTop="16">
        {pages.blogTitle}
      </Heading>
      <Text className={styles.pageSubtitle}>{pages.blogIntro}</Text>
      <Archive />
    </Column>
  );
}
