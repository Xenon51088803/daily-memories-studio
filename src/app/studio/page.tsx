import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { readContent } from "@/lib/editor-store";
import { ContentStudio } from "@/components/personal/ContentStudio";
import config from "../../../publish-config.json";
export const dynamic = "force-dynamic";
export const metadata = { title: "内容工作室", robots: { index: false, follow: false } };
export default async function Studio() {
  const host = (await headers()).get("host") || "";
  if (
    process.env.NODE_ENV !== "development" ||
    !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
  )
    notFound();
  return <ContentStudio initial={await readContent()} publicUrl={config.url} />;
}
