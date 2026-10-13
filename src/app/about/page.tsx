import { aboutContent, site } from "@/components/personal/data";
import Link from "next/link";
import { Column, Row, Heading, Text } from "@once-ui-system/core";
import styles from "@/components/personal/Personal.module.scss";

export const metadata = { title: "关于我", description: aboutContent.greeting };
export default function About() {
  return (
    <Column className={styles.aboutPage}>
      <Text className={styles.eyebrow}>THE PERSON BEHIND THE PIXELS</Text>
      <Heading as="h1" className={styles.aboutMark}>
        {aboutContent.title}
      </Heading>
      <Text className={styles.pageSubtitle}>{aboutContent.greeting}</Text>
      <Column gap="24" marginTop="40" className={styles.aboutCopy}>
        {aboutContent.body
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((paragraph, index) => (
            <Text as="p" key={index} style={{ whiteSpace: "pre-line" }}>
              {paragraph}
            </Text>
          ))}
      </Column>
      <Column className={styles.now} gap="12">
        <Text className={styles.eyebrow}>A FEW THINGS I KEEP COMING BACK TO</Text>
        <Text>{aboutContent.interests}</Text>
      </Column>
      <Row className={styles.aboutLinks} gap="32">
        <Link href="/blog" className={styles.softLink}>
          读一些文字 ↗
        </Link>
        <Link href="/gallery" className={styles.softLink}>
          看一些照片 ↗
        </Link>
        {site.email && (
          <a className={styles.softLink} href={`mailto:${site.email}`}>
            联系我 ↗
          </a>
        )}
        {site.github && (
          <a className={styles.softLink} href={site.github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        )}
      </Row>
    </Column>
  );
}
