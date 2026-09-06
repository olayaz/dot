import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

if (!process.argv[2]) throw new Error('Pass the path to an installed playwright/index.mjs');
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8080');
  await page.getByRole('button', { name: '寫計劃', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('聯絡供應商');
  await page.getByRole('button', { name: '新增', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('整理讀書筆記');
  await page.getByRole('button', { name: '新增', exact: true }).click();
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  assert.equal(await page.locator('.entry').count(), 2);
  await page.locator('.entry').first().click();
  await page.getByRole('dialog').getByRole('textbox').fill('沒有聯絡上，留了訊息。等對方回覆。');
  await page.getByRole('button', { name: '儲存', exact: true }).click();
  assert.equal(await page.locator('.entry > .dot.done').count(), 1);
  assert.equal(await page.locator('.entry.recorded > .dot').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.getByRole('button', { name: '寫記錄', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('出門走了二十分鐘');
  await page.getByRole('button', { name: '新增', exact: true }).click();
  assert.match(await page.getByRole('status').textContent(), /已新增：出門走了二十分鐘/);
  await page.screenshot({ path: fileURLToPath(new URL('dot-dialog.png', import.meta.url)) });
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  await page.reload();
  assert.equal(await page.locator('.entry > .dot.done').count(), 2);
  assert.equal(await page.locator('.entry.recorded').count(), 0);
  await page.screenshot({ path: fileURLToPath(new URL('dot-records.png', import.meta.url)) });
  for (const width of [320, 390, 600, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const button = await page.locator('#btnDone').boundingBox();
    assert.ok(button.x >= 0 && button.x + button.width <= width && button.y + button.height <= 844);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: '寫記錄', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('這是一段比較長的記錄，用來確認小螢幕下內容換行和輸入後的回饋不會超出視窗。'.repeat(3));
  await page.getByRole('button', { name: '新增', exact: true }).click();
  assert.equal(await page.locator('.sheet').evaluate(el => el.scrollWidth <= el.clientWidth), true);
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS: real Chrome flows, persistence, reduced motion, 320/390/600/1440px layout, long input, no page errors');
} finally {
  await browser.close();
}
