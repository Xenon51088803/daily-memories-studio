import { pages, photographs } from "@/components/personal/data";
import { Column, Row, Heading, Text } from "@once-ui-system/core";
import { Photography } from "@/components/personal";
import styles from "@/components/personal/Personal.module.scss";

export const metadata = {
  title: "摄影 · 曾经看见",
  description: "在光与影之间，留住一段安静的时间。",
};
export default function Gallery() {
  return (
    <Column className={styles.galleryPage}>
      <Column className={styles.galleryHeader}>
        <Row horizontal="between">
          <Text className={styles.eyebrow}>VISUAL JOURNAL</Text>
          <Text className={`${styles.eyebrow} ${styles.galleryMicro}`}>
            A COLLECTION OF STILL MOMENTS
          </Text>
        </Row>
        <Heading as="h1" className={styles.galleryTitle}>
          {pages.galleryTitle}
          <br />
          <em>{pages.gallerySubtitle}</em>
        </Heading>
        <Row horizontal="between" vertical="end" gap="16" className={styles.galleryIntroRow}>
          <Text className={styles.galleryIntro} style={{ whiteSpace: "pre-line" }}>
            {pages.galleryIntro}
          </Text>
          <Heading as="h2" className={styles.gallerySmallTitle}>
            留存的片刻 · {photographs.length} 张照片
          </Heading>
        </Row>
      </Column>
      <Photography />
      <Row
        className={styles.galleryCredit}
        horizontal="between"
        gap="20"
        s={{ direction: "column" }}
      >
        <Text>每一帧，都是一次停留。</Text>
        <Text>
          {pages.galleryCreditUrl ? (
            <a href={pages.galleryCreditUrl} target="_blank" rel="noreferrer">
              {pages.galleryCredit}
            </a>
          ) : (
            pages.galleryCredit
          )}
        </Text>
      </Row>
    </Column>
  );
}
