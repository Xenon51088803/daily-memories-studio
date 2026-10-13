import { notFound } from "next/navigation";
import { projects } from "@/components/personal/data";
import { ProjectArticle } from "@/components/personal/DetailPages";
export function generateStaticParams() {
  return projects.map((item) => ({ slug: item.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = projects.find((item) => item.slug === slug);
  return item ? { title: item.name, description: item.summary } : {};
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = projects.find((item) => item.slug === slug);
  if (!item) notFound();
  return <ProjectArticle project={item} />;
}
