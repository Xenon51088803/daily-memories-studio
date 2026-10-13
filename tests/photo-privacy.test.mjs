import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { publicContent, publicImages } from '../src/lib/public-content.mjs';
import { writePublicAssets } from '../scripts/public-assets.mjs';

const fixture = () => ({
  home: { cover: '/images/private.webp', coverAlt: 'secret-alt', coverTitle: 'secret-title', coverSubtitle: 'secret-subtitle', coverDescription: 'secret-description' },
  journal: [{ cover: '/images/PRIVATE.webp' }],
  projects: [{ cover: '/images/private.webp' }],
  photographs: [
    { id: 'private-photo', src: '/images/private.webp', title: 'secret-photo', subtitle: 'secret-caption', private: true },
    { id: 'duplicate', src: '/images/PRIVATE.webp' },
    { id: 'legacy', src: '/images/public.webp' },
    { id: 'explicit-public', src: '/images/public.webp', private: false },
  ],
});

test('private photos, duplicates and reused covers are excluded without mutating local content', () => {
  const source = fixture();
  const before = structuredClone(source);
  const result = publicContent(source);
  assert.deepEqual(result.photographs.map(p => p.id), ['legacy', 'explicit-public']);
  assert.equal(result.home.cover, '');
  assert.equal(result.journal[0].cover, '');
  assert.equal(result.projects[0].cover, '');
  assert.doesNotMatch(JSON.stringify(result), /secret|private\.webp/i);
  assert.deepEqual(result, publicContent(result));
  assert.deepEqual(source, before);
  assert.deepEqual(publicImages(source), ['/images/public.webp']);
});

test('private images referenced by text fields cannot cause asset publication', () => {
  const source = fixture();
  source.note = '/images/private.webp';
  assert.deepEqual(publicImages(source), ['/images/public.webp']);
});

test('export writes only public JSON and referenced public files; unlisted uploads stay local', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'photo-privacy-'));
  try {
    await fs.mkdir(path.join(root, 'public/images'), { recursive: true });
    for (const name of ['private', 'public', 'unlisted'])
      await fs.writeFile(path.join(root, `public/images/${name}.webp`), name);
    const stage = path.join(root, 'stage');
    await writePublicAssets(root, stage, fixture());
    assert.deepEqual(await fs.readdir(path.join(stage, 'public/images')), ['public.webp']);
    assert.doesNotMatch(await fs.readFile(path.join(stage, 'src/content/site.json'), 'utf8'), /secret|private\.webp/i);
    assert.equal(await fs.readFile(path.join(root, 'public/images/private.webp'), 'utf8'), 'private');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('returning a private photo to public restores its original content', () => {
  const source = fixture();
  source.photographs[0].private = false;
  assert.equal(publicContent(source).photographs.length, 4);
  assert.equal(publicContent(source).home.cover, '/images/private.webp');
  assert.ok(publicImages(source).includes('/images/private.webp'));
});
