import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setupContent } from '../scripts/setup-content.mjs';
import { validateContent } from '../src/lib/content-schema.ts';

test('fresh installation creates usable examples without overwriting local personal content', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'homepage-setup-'));
  try {
    const example=JSON.parse(await fs.readFile(new URL('../src/content/site.example.json',import.meta.url),'utf8'));
    validateContent(example);
    await fs.mkdir(path.join(root,'src/content'),{recursive:true});
    await fs.writeFile(path.join(root,'src/content/site.example.json'),JSON.stringify(example));
    await fs.writeFile(path.join(root,'src/content/public-quotes.example.json'),'[]');
    await fs.writeFile(path.join(root,'publish-config.example.json'),'{}');
    await fs.writeFile(path.join(root,'src/content/local-extensions.example.tsx'),'export const studioExtensions=[];');
    await fs.mkdir(path.join(root,'scripts'),{recursive:true});
    await fs.writeFile(path.join(root,'scripts/local-export.example.mjs'),'export const prepareLocalExport=async()=>"";');
    await setupContent(root);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,'src/content/site.json'),'utf8')),example);
    const files=['src/content/site.json','src/content/public-quotes.json','publish-config.json','src/content/local-extensions.tsx','scripts/local-export.mjs'];
    for(const file of files)await fs.writeFile(path.join(root,file),'personal-local-content');
    await setupContent(root);
    for(const file of files)assert.equal(await fs.readFile(path.join(root,file),'utf8'),'personal-local-content');
  } finally {
    assert.equal(path.dirname(root),path.resolve(os.tmpdir()));
    await fs.rm(root,{recursive:true,force:true});
  }
});
