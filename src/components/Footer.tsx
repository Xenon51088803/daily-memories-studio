import { Column, Row, Text } from "@once-ui-system/core";
import Link from "next/link";

export const Footer = ({ name, showSampleNotes }: { name: string; showSampleNotes: boolean }) => (
  <Column as="footer" className="personal-footer" fillWidth horizontal="center">
    <Row
      fillWidth
      horizontal="between"
      gap="16"
      vertical="center"
      s={{ direction: "column" }}
      className="personal-footer-inner"
    >
      <Text>
        © {new Date().getFullYear()} · {name}
      </Text>
      <Text>
        <Link href="/credits">项目说明</Link>
      </Text>
      <Text>
        {process.env.NODE_ENV === "development" ? (
          <a href="/studio">编辑网站内容 ↗</a>
        ) : showSampleNotes ? (
          "个人主页 · 示例内容"
        ) : (
          "保持好奇，慢慢生长。"
        )}
      </Text>
    </Row>
  </Column>
);
