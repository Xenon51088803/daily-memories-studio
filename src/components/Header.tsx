"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Row, Text, Line, ToggleButton } from "@once-ui-system/core";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.scss";

export const Header = ({ name, tagline }: { name: string; tagline: string }) => {
  const pathname = usePathname() ?? "/";
  const links = [
    { path: "/blog", label: "博客", icon: "book" },
    { path: "/gallery", label: "摄影", icon: "gallery" },
    { path: "/work", label: "项目", icon: "grid" },
    { path: "/about", label: "关于", icon: "person" },
  ];
  return (
    <>
      <Row className={styles.mobileBrand} horizontal="between" fillWidth>
        <Text>{name}</Text>
        <Text>个人空间 / EST. 2026</Text>
      </Row>
      <Row
        as="header"
        className={styles.header}
        fillWidth
        horizontal="between"
        vertical="center"
        gap="24"
      >
        <Link href="/" className={styles.wordmark} aria-label={`${name} 首页`}>
          {name}
          <span> /</span>
        </Link>
        <Row
          as="nav"
          aria-label="主导航"
          className={styles.navigation}
          gap="4"
          vertical="center"
          padding="4"
          radius="l"
          border="neutral-alpha-weak"
          data-border="rounded"
        >
          <ToggleButton prefixIcon="home" href="/" selected={pathname === "/"} aria-label="首页" />
          <Line background="neutral-alpha-medium" vert maxHeight="20" />
          {links.map((link) => (
            <ToggleButton
              key={link.path}
              href={link.path}
              label={link.label}
              selected={pathname.startsWith(link.path)}
              aria-current={pathname.startsWith(link.path) ? "page" : undefined}
              className={styles.navItem}
            />
          ))}
          <Line background="neutral-alpha-medium" vert maxHeight="20" />
          <ThemeToggle />
        </Row>
        <Text className={styles.headerNote}>{tagline}</Text>
      </Row>
    </>
  );
};
