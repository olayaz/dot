import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

if (!process.argv[2]) throw new Error('Pass the path to an installed playwright/index.mjs');
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const typeIntoSheet = async text => {
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'sheetInput');
    await page.keyboard.insertText(text);
  };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8080');
  await page.getByRole('button', { name: '寫計劃', exact: true }).click();
  await typeIntoSheet('聯絡供應商');
  await page.getByRole('button', { name: '新增', exact: true }).click();
  await typeIntoSheet('整理讀書筆記');
  await page.getByRole('button', { name: '新增', exact: true }).click();
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  assert.equal(await page.locator('.entry').count(), 2);
  const compactRow = await page.locator('.entry').first().boundingBox();
  assert.ok(compactRow.height >= 44 && compactRow.height <= 50, 'Single-line entries should stay compact and tappable');
  const deleteButton = await page.locator('.entry .del').first().boundingBox();
  assert.ok(deleteButton.y >= compactRow.y && deleteButton.y + deleteButton.height <= compactRow.y + compactRow.height);
  await page.locator('.entry').first().click();
  await typeIntoSheet('沒有聯絡上，留了訊息。等對方回覆。');
  await page.getByRole('button', { name: '儲存', exact: true }).click();
  assert.equal(await page.locator('.entry > .dot.done').count(), 1);
  assert.equal(await page.locator('.entry.recorded > .dot').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.getByRole('button', { name: '寫記錄', exact: true }).click();
  await typeIntoSheet('出門走了二十分鐘');
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
  await typeIntoSheet('這是一段比較長的記錄，用來確認小螢幕下內容換行和輸入後的回饋不會超出視窗。'.repeat(3));
  await page.getByRole('button', { name: '新增', exact: true }).click();
  assert.equal(await page.locator('.sheet').evaluate(el => el.scrollWidth <= el.clientWidth), true);
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const rolloverContext = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Taipei', reducedMotion: 'reduce' });
  const rollover = await rolloverContext.newPage();
  rollover.on('pageerror', error => errors.push(error.message));
  await rollover.clock.install({ time: new Date('2026-09-06T23:50:00+08:00') });
  await rollover.clock.pauseAt(new Date('2026-09-06T23:59:58+08:00'));
  await rollover.addInitScript(() => {
    if (localStorage.getItem('wins.v1')) return;
    localStorage.setItem('wins.v1', JSON.stringify({
      '2026-09-05': [
        { id: 'pending', text: '昨天的計劃', done: false, note: '保留備註', ts: 1788602400000 },
        { id: 'attempted', text: '已經嘗試', done: true, note: '沒有成功', ts: 1788602400000 },
      ],
      '2026-09-08': [{ id: 'future', text: '未來的計劃', done: false, ts: 1788602400000 }],
    }));
  });
  await rollover.goto('http://127.0.0.1:8080');
  assert.equal(await rollover.locator('.entry').count(), 1);
  assert.equal(await rollover.locator('.entry .text').textContent(), '昨天的計劃');
  await rollover.locator('.entry').click();
  await rollover.locator('#sheetInput').fill('午夜前輸入的草稿');
  await rollover.clock.runFor(2000);
  assert.equal(await rollover.locator('#datePicker').inputValue(), '2026-09-07');
  assert.equal(await rollover.locator('#sheetInput').inputValue(), '午夜前輸入的草稿');
  assert.equal(await rollover.evaluate(() => document.activeElement.id), 'sheetInput');
  await rollover.getByRole('button', { name: '儲存', exact: true }).click();
  const saved = await rollover.evaluate(() => JSON.parse(localStorage.getItem('wins.v1')));
  assert.equal(saved['2026-09-06'], undefined);
  assert.equal(saved['2026-09-05'].length, 1);
  assert.equal(saved['2026-09-05'][0].id, 'attempted');
  assert.equal(saved['2026-09-07'][0].id, 'pending');
  assert.equal(saved['2026-09-07'][0].done, true);
  assert.equal(saved['2026-09-07'][0].note, '午夜前輸入的草稿');
  assert.equal(saved['2026-09-08'][0].id, 'future');
  await rollover.reload();
  assert.equal(await rollover.locator('.entry').count(), 1);
  await rollover.getByRole('button', { name: '前一天', exact: true }).click();
  assert.equal(await rollover.locator('.entry').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: real Chrome flows, direct focus, compact/responsive layout, startup and midnight rollover, preserved drafts, reload persistence, no page errors');
} finally {
  await browser.close();
}
