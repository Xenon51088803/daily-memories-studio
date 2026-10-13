import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createExportSourceFilter } from '../scripts/export-source-filter.mjs';

test('static export supports empty projects/articles and restores detail routes when entries return', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'homepage-empty-routes-'));
  const source = path.join(root, '个人主页', 'src');
  const files = [
    'app/work/page.tsx', 'app/work/[slug]/page.tsx',
    'app/blog/page.tsx', 'app/blog/[slug]/page.tsx',
    'app/gallery/page.tsx', 'components/personal/Photography.tsx',
    'app/studio/page.tsx', 'app/diary/page.tsx', 'app/api/studio/content/route.ts',
    'lib/diary-store.mjs', 'components/personal/DiarySpace.tsx',
  ];
  try {
    for (const file of files) {
      await fs.mkdir(path.dirname(path.join(source, file)), {recursive:true});
      await fs.writeFile(path.join(source, file), file);
    }
    for (const [index, counts] of [[0,0],[0,1],[1,0],[1,1]].entries()) {
      const content = {projects:Array(counts[0]).fill({slug:'project'}), journal:Array(counts[1]).fill({slug:'article'})};
      const stage = path.join(root, `export-${index}`);
      await fs.cp(source, stage, {recursive:true, filter:createExportSourceFilter(source, content)});
      for (const file of files.slice(0,6)) {
        const omitted = (file === 'app/work/[slug]/page.tsx' && !counts[0]) || (file === 'app/blog/[slug]/page.tsx' && !counts[1]);
        if (omitted) await assert.rejects(fs.access(path.join(stage, file)), {code:'ENOENT'});
        else assert.equal(await fs.readFile(path.join(stage, file), 'utf8'), file);
      }
      for (const file of files.slice(6)) await assert.rejects(fs.access(path.join(stage, file)), {code:'ENOENT'});
    }
    for (const file of files) assert.equal(await fs.readFile(path.join(source, file), 'utf8'), file);
  } finally {
    // mkdtemp creates this exact disposable directory under the system temp root.
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    await fs.rm(root, {recursive:true, force:true});
  }
});
