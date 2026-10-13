import { notFound } from "next/navigation";
import { journal } from "@/components/personal/data";
import { JournalArticle } from "@/components/personal/DetailPages";
export function generateStaticParams() {
  return journal.map((item) => ({ slug: item.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = journal.find((item) => item.slug === slug);
  return item ? { title: item.title, description: item.summary } : {};
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = journal.find((item) => item.slug === slug);
  if (!item) notFound();
  return <JournalArticle entry={item} />;
}
