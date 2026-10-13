import Link from "next/link";
import { Column, Heading, Text } from "@once-ui-system/core";
import styles from "@/components/personal/Personal.module.scss";

export const metadata = { title: "项目说明", description: "网站的设计来源、代码与许可说明。" };

export default function Credits() {
  return (
    <Column maxWidth={42} paddingY="64" gap="32">
      <Column gap="16">
        <Text className={styles.eyebrow}>COLOPHON</Text>
        <Heading as="h1" className={styles.pageTitle}>项目说明</Heading>
        <Text className={styles.pageSubtitle}>关于这个网站，以及让它成为可能的作品。</Text>
      </Column>
      <Column gap="20">
        <Heading as="h2" variant="heading-strong-m">设计与代码</Heading>
        <Text as="p" variant="body-default-m" onBackground="neutral-medium">
          网站基于 Once UI 团队的 <a href="https://github.com/once-ui-system/magic-portfolio">Magic Portfolio</a> 改编，
          使用 <a href="https://once-ui.com">Once UI</a> 组件。
          在原作之上调整了博客归档、摄影排版、背景与交互，并加入本地内容工作室和静态发布功能。
        </Text>
        <Text as="p" variant="body-default-m" onBackground="neutral-medium">
          素描背景与博客结构参考 <a href="https://antfu.me">Anthony Fu</a>；
          格点鼠标轨迹参考 <a href="https://github.com/Ladvace/astro-bento-portfolio">Astro Bento Portfolio</a>；
          摄影标题的字体呈现参考 <a href="https://github.com/Cosmic-Themes/horizon">Horizon</a>。
          模板示例摄影来自 <a href="https://lorant.one">Lorant</a>，通过 Magic Portfolio 提供。
        </Text>
      </Column>
      <Column gap="20">
        <Heading as="h2" variant="heading-strong-m">许可与使用</Heading>
        <Text as="p" variant="body-default-m" onBackground="neutral-medium">
          本衍生模板沿用 <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>：
          可在署名并说明修改的前提下分享与改编，仅限非商业用途。Once UI 组件库与所引用的 MIT 代码保留各自许可。
          网站作者自行发布的文章、照片与项目内容，其权利归相应作者所有。
        </Text>
        <a className={styles.softLink} href="https://github.com/concorde-blade/personal-homepage-studio">
          查看项目源码与完整来源说明 ↗
        </a>
      </Column>
      <Link href="/" className={styles.softLink}>← 返回首页</Link>
    </Column>
  );
}
