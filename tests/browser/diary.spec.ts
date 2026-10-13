import { test, expect } from "@playwright/test";
import { localDay, shiftDay } from "../../src/components/diary/shared";
import content from "../../src/content/site.json";

test("write, reload, recall, publish only released sentences and lock private entries", async ({
  page,
  request,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const today = localDay();
  const yesterday = shiftDay(today, -1);
  const origin = "http://127.0.0.1:3311";
  const diaryText = '## PRIVATE_TEST_MARKER\n\n这段**文字**只属于我。\n\n- [x] 记录生活';
  await page.goto("/");
  await expect(page.getByText("今天，暂且留白。")).toBeVisible();
  await expect(page.locator('.hero-copy>p')).toHaveText(content.home.intro);
  await expect(page.locator('.hero-copy h1')).toContainText(content.home.headline);
  await expect(page.locator('.paper-brand')).toContainText(content.site.name);
  await expect(page.locator('body')).not.toContainText('明日来信');
  await page.screenshot({ path: "test-results/home-desktop.png", fullPage: true });
  expect((await request.get("/api/diary?date=" + today)).status()).toBe(401);
  expect((await request.get("/api/diary?action=backup")).status()).toBe(401);
  expect(
    (
      await request.post("/api/diary", {
        headers: { origin: "https://example.com" },
        data: { action: "setup", password: "test-password-123" },
      })
    ).status(),
  ).toBe(403);
  await page.getByRole("link", { name: "私人空间" }).click();
  await page.getByLabel("设置密码（至少 10 个字符）").fill("test-only-password-2026");
  await page.getByLabel("再输入一次密码").fill("test-only-password-2026");
  await page.getByRole("button", { name: "设置密码，开始记录" }).click();
  await expect(page.getByLabel("今天的日记", { exact: true })).toBeVisible();
  await page.getByLabel("日记标题").fill("测试日记：一段普通的生活");
  await page.getByLabel("今天的日记", { exact: true }).fill(diaryText);
  await expect(page.getByRole('region', { name: '今天的日记实时预览' }).getByRole('heading', { name: 'PRIVATE_TEST_MARKER' })).toBeVisible();
  await page.getByLabel("下一天的每日一句").fill("FUTURE_TEST_MARKER 明天再见。");
  await page.getByRole("button", { name: "☀ 晴朗" }).click();
  await page.getByRole("button", { name: "保存这一天" }).click();
  await expect(page.getByRole("status")).toContainText("已经好好收起来了");
  await page.reload();
  await expect(page.getByLabel("今天的日记", { exact: true })).toHaveValue(diaryText);
  await expect(page.getByLabel('正文格式')).toHaveValue('markdown');
  await page.screenshot({ path: "test-results/diary-desktop.png", fullPage: true });
  // Fill a past day; the associated next-day note is released today.
  const session = page.context().request;
  let res = await session.post("/api/diary", {
    headers: { origin },
    data: {
      action: "save",
      entry: {
        date: yesterday,
        title: "昨天",
        body: "PRIVATE_YESTERDAY",
        mood: "平静",
        tomorrow: "愿你在平凡的一天里，也能遇见一点小小的欢喜。",
        version: 0,
      },
    },
  });
  expect(res.status(), await res.text()).toBe(200);
  res = await session.post("/api/diary", {
    headers: { origin },
    data: {
      action: "save",
      entry: {
        date: yesterday,
        title: "旧版本",
        body: "overwrite",
        mood: "",
        tomorrow: "overwrite",
        version: 0,
      },
    },
  });
  expect(res.status()).toBe(409);
  if (today.slice(0, 7) !== yesterday.slice(0, 7))
    await page.getByRole("button", { name: "上个月", exact: true }).click();
  await page.getByRole("button", { name: yesterday, exact: true }).click();
  await expect(page.getByLabel("今天的日记", { exact: true })).toHaveValue("PRIVATE_YESTERDAY");
  await expect(page.getByLabel('正文格式')).toHaveValue('plain');
  await expect(page.getByLabel("下一天的每日一句")).toHaveValue(
    "愿你在平凡的一天里，也能遇见一点小小的欢喜。",
  );
  const backup = await session.get("/api/diary?action=backup");
  expect((await backup.json()).entries).toHaveLength(2);
  // Anonymous visitors see the released sentence, never diary text or tomorrow's letter.
  const anonymous = await browser.newContext();
  const publicPage = await anonymous.newPage();
  await publicPage.goto(origin);
  await expect(
    publicPage.getByText("愿你在平凡的一天里，也能遇见一点小小的欢喜。").first(),
  ).toBeVisible();
  const projection = await (
    await anonymous.request.get(origin + "/api/diary?action=public")
  ).text();
  expect(projection).not.toMatch(/PRIVATE_|FUTURE_/);
  expect((await anonymous.request.get(origin + "/api/diary?date=" + yesterday)).status()).toBe(401);
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await expect(publicPage.locator("body")).not.toContainText("PRIVATE_");
  expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await publicPage.screenshot({ path: "test-results/home-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/diary-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "锁上日记本" }).click();
  await expect(page.getByRole("heading", { name: "欢迎回到自己的角落" })).toBeVisible();
  expect((await session.get("/api/diary?date=" + today)).status()).toBe(401);
  await page.getByLabel("你的密码").fill("wrong-password");
  await page.getByRole("button", { name: "打开我的日记本" }).click();
  await expect(page.locator(".paper-error")).toContainText("密码不正确");
  await page.getByLabel("你的密码").fill("test-only-password-2026");
  await page.getByRole("button", { name: "打开我的日记本" }).click();
  await expect(page.getByLabel("今天的日记", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await anonymous.close();
});
