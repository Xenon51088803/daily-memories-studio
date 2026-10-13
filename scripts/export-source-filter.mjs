import path from 'node:path';

// Next 16's static exporter rejects dynamic routes with zero generated paths,
// even when generateStaticParams exists. Omit only those detail routes from the
// disposable export source; keep index pages and the owner's editable source.
export function createExportSourceFilter(sourceRoot, publicContent) {
  const omitted = ['app/api', 'app/studio', 'app/diary'];
  if (publicContent.projects.length === 0) omitted.push('app/work/[slug]');
  if (publicContent.journal.length === 0) omitted.push('app/blog/[slug]');
  return source => {
    const relative = path.relative(sourceRoot, source).replaceAll('\\', '/');
    if (omitted.some(directory => relative === directory || relative.startsWith(`${directory}/`))) return false;
    return !['diary-store.mjs', 'DiarySpace.tsx'].includes(path.basename(source));
  };
}
