import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function setupContent(root) {
  const files = [
    ['src/content/site.example.json', 'src/content/site.json'],
    ['publish-config.example.json', 'publish-config.json'],
    ['src/content/public-quotes.example.json', 'src/content/public-quotes.json'],
    ['src/content/local-extensions.example.tsx', 'src/content/local-extensions.tsx'],
    ['scripts/local-export.example.mjs', 'scripts/local-export.mjs'],
  ];
  for (const [source, destination] of files) {
    await fs.mkdir(path.dirname(path.join(root, destination)), {recursive:true});
    try { await fs.copyFile(path.join(root, source), path.join(root, destination), fs.constants.COPYFILE_EXCL); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await setupContent(fileURLToPath(new URL('../', import.meta.url)));
  console.log('本机内容文件已就绪；已有内容保持不变。');
}
