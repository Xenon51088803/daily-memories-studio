import {test,expect} from '@playwright/test';

test('homepage and editor have no access statistics or tracking integration',async({page})=>{
  const requests:string[]=[];
  page.on('request',request=>{if(/goatcounter|gc\.zgo\.at/.test(request.url()))requests.push(request.url());});
  await page.goto('/');
  await expect(page.locator('script[data-goatcounter]')).toHaveCount(0);
  await page.goto('/studio');
  await expect(page.getByRole('heading',{name:'内容工作室',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'访问统计',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'每日一句',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/摄影/})).toBeVisible();
  expect((await page.request.get('/api/studio/analytics')).status()).toBe(404);
  expect(requests).toEqual([]);
});
