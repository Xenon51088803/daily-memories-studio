import { test, expect } from '@playwright/test';
import { validateContent } from '../../src/lib/content-schema';

test('import a Markdown file as a new draft, preview and save without replacing existing articles', async ({ page, request }) => {
  const before = await (await request.get('/api/studio/content')).json();
  let savedContent: ReturnType<typeof validateContent> | undefined;
  await page.route('**/api/studio/content', async route => {
    if (route.request().method() !== 'PUT') return route.continue();
    savedContent = validateContent(route.request().postDataJSON().content);
    await route.fulfill({ json: { revision:'import-test', savedAt:new Date().toISOString() } });
  });
  await page.goto('/studio');
  await page.getByRole('button', { name:/^博客/ }).click();
  const importer = page.getByLabel('导入 Markdown 文件', {exact:true});
  const source = '## 秋日散步\n\n值得**记下**的一天。\n\n$$\nx^2\n$$\n\n```js\nconst day = 1;\n```\n';
  const file = {name:'秋天的记录.md',mimeType:'text/markdown',buffer:Buffer.from('\uFEFF'+source.replaceAll('\n','\r\n'))};
  await importer.setInputFiles(file);
  await expect(page.getByLabel('文章标题', {exact:true})).toHaveValue('秋天的记录');
  await expect(page.getByRole('textbox', {name:'文章正文',exact:true})).toHaveValue(source);
  const preview = page.getByRole('region', {name:'文章正文实时预览'});
  await expect(preview.getByRole('heading', {name:'秋日散步'})).toBeVisible();
  await expect(preview.locator('.katex-display')).toHaveCount(1);
  await importer.setInputFiles({name:'空白.md',mimeType:'text/markdown',buffer:Buffer.from(' ')});
  await expect(page.getByRole('alert').filter({hasText:'没有正文'})).toBeVisible();
  await expect(page.getByRole('textbox', {name:'文章正文',exact:true})).toHaveValue(source);
  await page.getByRole('button', {name:'保存到网页',exact:true}).click();
  await expect(page.getByText(/已保存到网页 ·/)).toBeVisible();
  expect(savedContent!.journal.slice(0,-1)).toEqual(before.content.journal);
  expect(savedContent!.journal.at(-1)).toMatchObject({title:'秋天的记录',markdown:source,sample:false});
  await importer.setInputFiles(file);
  await expect(page.getByText(/已导入「秋天的记录.md」/)).toBeVisible();
  await page.getByRole('button', {name:'保存到网页',exact:true}).click();
  await expect(page.getByText(/已保存到网页 ·/)).toBeVisible();
  expect(savedContent!.journal.length).toBe(before.content.journal.length+2);
  expect(new Set(savedContent!.journal.map(p=>p.slug)).size).toBe(savedContent!.journal.length);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/markdown-import-mobile.png',fullPage:true});
  expect((await (await request.get('/api/studio/content')).json()).revision).toBe(before.revision);
});

test('math renders in live preview with local fonts, code stays literal and malformed input is recoverable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/studio');
  await page.getByRole('button', { name: /^博客/ }).click();
  await page.getByRole('button', { name: '＋ 新增文章' }).click();
  const input = page.getByRole('textbox', { name: '文章正文', exact: true });
  const preview = page.getByRole('region', { name: '文章正文实时预览' });
  const source = String.raw`行内公式 $E=mc^2$，单行双美元 $$a^2+b^2=c^2$$。

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

$$
\begin{pmatrix}1 & 2 \\ 3 & 4\end{pmatrix}
$$

$$
${Array.from({length:30}, (_, i) => `x_{${i}}`).join('+')} = 0
$$

` + '`$literal$`\n\n```text\n$$not_a_formula$$\n```';
  await input.fill(source);
  await expect(preview.locator('.katex')).toHaveCount(5);
  await expect(preview.locator('.katex-display')).toHaveCount(3);
  await expect(preview.locator('annotation').first()).toHaveText('E=mc^2');
  await expect(preview.locator('pre code')).toHaveText('$$not_a_formula$$\n');
  await expect(preview.locator('pre .katex')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px KaTeX_Main'))).toBe(true);
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await preview.screenshot({ path: 'test-results/math-desktop.png' });
  await page.setViewportSize({ width:390, height:844 });
  await expect(preview.locator('.katex-display').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await preview.screenshot({ path: 'test-results/math-mobile.png' });
  await page.getByRole('button', { name: '分屏', exact: true }).click();
  await input.fill('$$\n\\frac{1}{\n$$');
  await expect(preview.locator('.katex-error')).toBeVisible();
  await input.fill('$$\nx^2\n$$');
  await expect(preview.locator('.katex')).toHaveCount(1);
  await expect(preview.locator('.katex-error')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('article Markdown preview, modes, safe rendering and save payload without changing owner content', async ({ page, request }) => {
  const errors: string[] = [];
  const imageRequests: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.url().includes('markdown-image-test')) imageRequests.push(r.url()); });
  const before = await (await request.get('/api/studio/content')).json();
  // Exercise serialization and validation while keeping the real owner's articles untouched.
  let savedMarkdown: string | undefined;
  await page.route('**/api/studio/content', async route => {
    if (route.request().method() !== 'PUT') return route.continue();
    const { content } = route.request().postDataJSON();
    const valid = validateContent(content);
    savedMarkdown = valid.journal.at(-1)?.markdown;
    await route.fulfill({ json: { revision: 'markdown-test', savedAt: new Date().toISOString() } });
  });
  await page.goto('/studio');
  await page.getByRole('button', { name: /^博客/ }).click();
  const convert = page.getByRole('button', { name: '改用 Markdown 编辑（保留原有文字）' });
  if (await convert.count()) {
    await convert.click();
    await expect(page.getByRole('textbox', { name: '文章正文', exact: true })).not.toHaveValue('');
  }
  await page.getByRole('button', { name: '＋ 新增文章' }).click();
  const source = '## 散步之后\n\n今天的**小事**，值得记下。\n\n> 慢慢来\n\n- [x] 出门散步\n- [ ] 读书\n\n| 时刻 | 记录 |\n| --- | --- |\n| 傍晚 | 天空很美 |\n\n```js\nconst day = "quiet";\n```\n\n[安全链接](https://example.com)\n\n[危险链接](javascript:alert(1))\n\n<script>window.markdownInjected = true</script>\n\n![测试图片](https://example.com/markdown-image-test.png)';
  const input = page.getByRole('textbox', { name: '文章正文', exact: true });
  const preview = page.getByRole('region', { name: '文章正文实时预览' });
  await input.fill(source);
  await expect(preview.getByRole('heading', { name: '散步之后' })).toBeVisible();
  await expect(preview.locator('strong')).toHaveText('小事');
  await expect(preview.locator('table')).toBeVisible();
  await expect(preview.locator('pre code')).toContainText('const day');
  await expect(preview.locator('script, img')).toHaveCount(0);
  await expect(preview.locator('a').filter({ hasText: '危险链接' })).not.toHaveAttribute('href', /javascript:/);
  expect(await page.evaluate(() => 'markdownInjected' in window)).toBe(false);
  await page.screenshot({ path: 'test-results/markdown-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(input).toHaveCount(0);
  await expect(preview).toBeVisible();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await expect(input).toHaveValue(source);
  await expect(preview).toHaveCount(0);
  await page.getByRole('button', { name: '分屏', exact: true }).click();
  await page.getByRole('button', { name: '保存到网页', exact: true }).click();
  await expect(page.getByText(/已保存到网页 ·/)).toBeVisible();
  expect(savedMarkdown).toBe(source);
  expect((await (await request.get('/api/studio/content')).json()).revision).toBe(before.revision);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/markdown-mobile.png', fullPage: true });
  expect(imageRequests).toEqual([]);
  expect(errors).toEqual([]);
});
