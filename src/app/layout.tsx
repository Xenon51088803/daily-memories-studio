import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";
import "katex/dist/katex.min.css";
import "@/resources/custom.css";
import "@/components/diary/paper.css";
import "@/components/diary/memory-theme.css";
import { Providers } from "@/components";
import { PaperFrame } from "@/components/diary/PaperFrame";
import { site } from "@/components/personal/data";
import { PublicExtensions } from '@/content/local-extensions';
export const metadata = {
  title: { default: site.title, template: `%s · ${site.name} 的日常留存` },
  description: site.description,
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      data-theme="light"
      data-brand="moss"
      data-neutral="sand"
      data-accent="green"
      data-solid="contrast"
      data-solid-style="flat"
      data-border="rounded"
      data-surface="filled"
      data-transition="all"
      data-scaling="100"
      suppressHydrationWarning
    >
      <head>
        {process.env.NEXT_PUBLIC_CONTENT_REVISION && (
          <meta
            name="homepage-content-revision"
            content={process.env.NEXT_PUBLIC_CONTENT_REVISION}
          />
        )}
      </head>
      <body>
        <PublicExtensions />
        <Providers>
          <PaperFrame>{children}</PaperFrame>
        </Providers>
      </body>
    </html>
  );
}
