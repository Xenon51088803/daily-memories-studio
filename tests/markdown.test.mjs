import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateContent } from '../src/lib/content-schema.ts';
import { readMarkdownFile, sectionsToMarkdown } from '../src/lib/markdown.ts';

test('Markdown files preserve Chinese, formulas and code with UTF-8 BOM and Windows line breaks', async () => {
  const source = '## 散步\n\n$$\nx^2\n$$\n\n```js\nconst a = 1;\n```\n';
  const result = await readMarkdownFile(new File(['\uFEFF' + source.replaceAll('\n','\r\n')], '秋天的记录.MD'));
  assert.deepEqual(result, {title:'秋天的记录',markdown:source});
  assert.equal((await readMarkdownFile(new File(['正文'], '长文章.markdown'))).title,'长文章');
});

test('Markdown import rejects invalid files without silently truncating or corrupting text', async () => {
  for (const [file, message] of [
    [new File(['text'], 'article.pdf'), /请选择/],
    [new File([' \n'], 'empty.md'), /没有正文/],
    [new File([new Uint8Array([0xff, 0xfe])], 'encoding.md'), /UTF-8/],
    [new File(['hello\0world'], 'binary.md'), /非文本/],
    [new File(['x'.repeat(100001)], 'long.md'), /100,000/],
    [new File(['x'.repeat(400001)], 'large.md'), /400 KB/],
  ]) await assert.rejects(readMarkdownFile(file), message);
});

test('content validation preserves Markdown through JSON backups without reinterpreting legacy articles', () => {
  const content = JSON.parse(fs.readFileSync(new URL('../src/content/site.example.json', import.meta.url), 'utf8'));
  const original = structuredClone(content.journal[0]);
  delete content.journal[0].markdown;
  assert.equal(validateContent(content).journal[0].markdown, undefined);
  content.journal[0].markdown = '## 标题\n\n**正文**\n\n- [x] 完成';
  const saved = validateContent(content);
  assert.equal(validateContent(JSON.parse(JSON.stringify(saved))).journal[0].markdown, content.journal[0].markdown);
  assert.deepEqual(saved.journal[0].sections, original.sections);
  content.journal[0].markdown = '';
  assert.equal(validateContent(content).journal[0].markdown, '');
  content.journal[0].markdown = 'x'.repeat(100001);
  assert.throws(() => validateContent(content), /Markdown 正文/);
});

test('legacy conversion preserves literal Markdown punctuation and line breaks', () => {
  assert.equal(sectionsToMarkdown([{ title: '旧 *标题*', text: '# 普通文字\n1. 第二行' }]), '## 旧 \\*标题\\*\n\n\\# 普通文字  \n1\\. 第二行');
});
