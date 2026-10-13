import { journal, projects } from "@/components/personal/data";
import { baseURL } from "@/resources";
export const dynamic = "force-static";
export default function sitemap() {
  return [
    ...["", "/about", "/blog", "/gallery", "/work", "/credits"].map((path) => ({ url: `${baseURL}${path}/` })),
    ...journal.map((p) => ({ url: `${baseURL}/blog/${p.slug}/`, lastModified: p.date })),
    ...projects.map((p) => ({ url: `${baseURL}/work/${p.slug}/` })),
  ];
}
