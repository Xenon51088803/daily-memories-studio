import content from "@/content/site.json";
import { publicContent } from "@/lib/public-content.mjs";
import type { SiteContent, JournalEntry } from "@/lib/content-schema";

export type { JournalEntry, Project, Photograph, SiteContent } from "@/lib/content-schema";
export { assetPath } from "@/lib/content-schema";
export const siteContent = publicContent(content as SiteContent);
export const {
  site,
  home: homeContent,
  about: aboutContent,
  pages,
  projects,
  photographs,
} = siteContent;
export const journal = [...siteContent.journal].sort((a, b) => b.date.localeCompare(a.date));
export function readingMinutes(entry: JournalEntry) {
  return Math.max(1, Math.ceil((entry.markdown?.length ?? entry.sections.reduce((n, s) => n + s.text.length, 0)) / 300));
}
