import fs from 'node:fs/promises';
import path from 'node:path';
import { publicContent, publicImages } from '../src/lib/public-content.mjs';

// The caller provides a fresh stage; never copy the entire local uploads folder.
export async function writePublicAssets(root, stage, originalContent) {
  await fs.mkdir(path.join(stage, 'src/content'), { recursive: true });
  await fs.writeFile(path.join(stage, 'src/content/site.json'), JSON.stringify(publicContent(originalContent), null, 2));
  for (const image of publicImages(originalContent)) {
    if (!/^\/images\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(image))
      throw new Error('图片路径无效，请在编辑页重新上传。');
    const dest = path.join(stage, 'public', image);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    try {
      await fs.copyFile(path.join(root, 'public', image), dest);
    } catch {
      throw new Error(`找不到图片 ${image}，请在编辑页重新上传或更换。`);
    }
  }
}
