import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length);
assert.match(html, /<title>Dot<\/title>/);
assert.doesNotMatch(html, /做到了|做成的事|記為待做|連續 <b>/);

class Element {
  constructor() {
    this.listeners = {};
    this.children = [];
    this.parts = {};
    this.style = {};
    this.value = '';
    this.textContent = '';
    this.hidden = false;
  }
  set innerHTML(value) { this.html = value; this.children = []; this.parts = {}; }
  get innerHTML() { return this.html || ''; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  setAttribute(name, value) { this[name] = value; }
  appendChild(child) { this.children.push(child); }
  querySelector(selector) { return this.parts[selector] ||= new Element(); }
  focus(options) { this.focused = true; this.focusOptions = options; }
  blur() { this.focused = false; }
  click() { this.listeners.click?.call(this, { target: this }); }
}

function boot(initial = {}, now = Date.now()) {
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  const document = Object.assign(new Element(), {
    getElementById: id => elements[id], createElement: () => new Element(), visibilityState: 'visible',
  });
  const window = new Element();
  let stored = JSON.stringify(initial);
  let writes = 0;
  let timerId = 0;
  const timers = new Map();
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  vm.runInNewContext(script, {
    document,
    localStorage: { getItem: () => stored, setItem: (key, value) => { assert.equal(key, 'wins.v1'); stored = value; writes++; } },
    window,
    requestAnimationFrame: fn => fn(),
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout: id => timers.delete(id),
    confirm: () => true,
    Date: Clock,
  });
  return {
    elements, document, window, data: () => JSON.parse(stored), writes: () => writes,
    setNow: value => { now = value; }, timers,
    flushTimers: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(timer => timer.fn()); },
  };
}

const { elements: el, data, flushTimers } = boot();
assert.match(el.list.innerHTML, /這天還沒有記錄/);
el.btnPlan.click();
assert.equal(el.sheetInput.focused, true, 'Plan input must focus synchronously, before timers run');
assert.equal(el.sheetInput.focusOptions.preventScroll, true);
assert.equal(el.sheetText.textContent, '寫計劃');
assert.equal(el.sheetUndone.hidden, true);
el.sheetOk.click();
assert.deepEqual(data(), {});
el.sheetInput.value = '聯絡供應商';
el.sheetOk.click();
const date = Object.keys(data())[0];
assert.equal(data()[date][0].done, false);
assert.equal(el.sheetFeedback.textContent, '已新增：聯絡供應商');
assert.equal(el.sheetInput.value, '');
assert.equal(el.overlay.hidden, false);
el.sheetInput.value = '整理桌面';
el.sheetOk.click();
assert.equal(data()[date].length, 2);
el.sheetCancel.click();
flushTimers();
assert.equal(el.sheetInput.focused, false, 'Closing must not leave a delayed focus callback');
el.list.children[0].children[0].click();
assert.equal(el.sheetInput.focused, true, 'Result input must focus synchronously');
el.sheetInput.value = '沒有聯絡上，留了訊息';
el.sheetOk.click();
assert.equal(data()[date][0].done, true);
assert.equal(data()[date][0].note, '沒有聯絡上，留了訊息');
assert.equal(el.list.children[0].className, 'entries');
assert.equal(el.list.children[0].children[0].className, 'entry recorded');
assert.equal(el.list.children[0].children[1].className, 'entry');
el.list.children[0].children[0].click();
assert.equal(el.sheetUndone.hidden, false);
el.sheetUndone.click();
assert.equal(data()[date][0].done, false);
assert.equal(data()[date][0].note, '沒有聯絡上，留了訊息');
el.btnDone.click();
assert.equal(el.sheetInput.focused, true, 'Record input must focus synchronously, before timers run');
el.sheetInput.value = '試了新食譜，沒有成功';
el.sheetInput.listeners.keydown({ key: 'Enter', isComposing: true });
assert.equal(data()[date].length, 2);
el.sheetInput.listeners.keydown({ key: 'Enter', isComposing: false });
assert.equal(data()[date][2].done, true);
el.sheetCancel.click();
el.prevDay.click();
assert.match(el.stats.innerHTML, /當日 <b>0<\/b>/);
el.nextDay.click();
assert.match(el.stats.innerHTML, /當日 <b>3<\/b>/);
assert.equal(boot(data()).elements.list.children[0].children.length, 3);
const legacy = boot({ [date]: [{ id: 'old', text: '舊記錄', status: 'open', ts: Date.now() }] });
legacy.elements.list.children[0].children[0].click();
assert.equal(legacy.elements.sheetUndone.hidden, true);
const at = value => new Date(value).getTime();
const item = (id, done = false) => ({ id, text: id, done, ts: at('2026-09-01T10:00:00') });
const earlier = { ...item('earlier'), note: '保留原有備註' };
const attempted = { ...item('attempted', true), note: '沒有成功', doneTs: at('2026-09-05T12:00:00') };
const initial = {
  '2026-09-01': [earlier],
  '2026-09-05': [item('yesterday'), attempted],
  '2026-09-06': [item('today')],
  '2026-09-07': [item('future')],
};
const rollover = boot(initial, at('2026-09-06T10:00:00'));
assert.deepEqual(rollover.data()['2026-09-06'], [item('today'), earlier, item('yesterday')]);
assert.deepEqual(rollover.data()['2026-09-05'], [attempted]);
assert.equal(rollover.data()['2026-09-01'], undefined);
assert.deepEqual(rollover.data()['2026-09-07'], [item('future')]);
assert.equal(rollover.writes(), 1);
rollover.window.listeners.focus();
rollover.window.listeners.pageshow();
assert.equal(rollover.writes(), 1, 'Repeated checks must not duplicate or rewrite records');
assert.deepEqual(boot(rollover.data(), at('2026-09-06T11:00:00')).data(), rollover.data());
rollover.elements.prevDay.click();
assert.equal(rollover.elements.list.children[0].children.length, 1);
rollover.setNow(at('2026-09-10T08:00:00'));
rollover.document.listeners.visibilitychange();
assert.equal(rollover.elements.datePicker.value, '2026-09-05', 'Do not interrupt browsing history');
assert.equal(rollover.data()['2026-09-10'].length, 4);
assert.equal(rollover.data()['2026-09-06'], undefined);
assert.equal(rollover.data()['2026-09-07'], undefined);
assert.deepEqual(rollover.data()['2026-09-05'], [attempted]);

const midnight = boot({ '2026-12-31': [item('open'), attempted] }, at('2026-12-31T23:59:59'));
assert.equal([...midnight.timers.values()][0].delay, 1000);
midnight.elements.list.children[0].children[0].click();
midnight.elements.sheetInput.value = '跨年時仍在寫的結果';
midnight.setNow(at('2027-01-01T00:00:00'));
midnight.flushTimers();
assert.equal(midnight.elements.datePicker.value, '2027-01-01');
assert.equal(midnight.elements.sheetInput.value, '跨年時仍在寫的結果');
assert.equal(midnight.elements.overlay.hidden, false);
assert.deepEqual(midnight.data()['2026-12-31'], [attempted]);
midnight.elements.sheetOk.click();
assert.equal(midnight.data()['2027-01-01'][0].done, true);
assert.equal(midnight.data()['2027-01-01'][0].note, '跨年時仍在寫的結果');

const delayed = boot({ '2026-09-06': [item('pending')] }, at('2026-09-06T23:59:59'));
delayed.elements.list.children[0].children[0].click();
delayed.elements.sheetInput.value = '回到頁面後直接儲存';
delayed.setNow(at('2026-09-07T08:00:00'));
delayed.elements.sheetOk.click();
assert.equal(delayed.data()['2026-09-06'], undefined);
assert.equal(delayed.data()['2026-09-07'][0].done, true);
const draft = boot({}, at('2026-09-06T23:59:59'));
draft.elements.btnPlan.click();
draft.elements.sheetInput.value = '跨日新增';
draft.setNow(at('2026-09-07T00:00:01'));
draft.elements.sheetOk.click();
assert.equal(draft.data()['2026-09-07'][0].text, '跨日新增');
assert.equal(draft.elements.sheetInput.focused, true);

const leap = boot({ '2028-02-28': [item('leap')] }, at('2028-02-28T23:59:59'));
leap.setNow(at('2028-02-29T00:00:00'));
leap.flushTimers();
assert.equal(leap.elements.datePicker.value, '2028-02-29');
assert.equal(leap.data()['2028-02-29'][0].id, 'leap');
for (const [start, end] of [['2026-03-08T00:00:00', '2026-03-09T00:00:00'], ['2026-11-01T00:00:00', '2026-11-02T00:00:00']]) {
  const boundary = boot({}, at(start));
  assert.equal([...boundary.timers.values()][0].delay, at(end) - at(start), 'Schedule local midnight, not a fixed 24 hours');
}
const completedOnly = boot({ '2026-09-05': [attempted] }, at('2026-09-06T12:00:00'));
assert.equal(completedOnly.writes(), 0);
completedOnly.elements.prevDay.click();
completedOnly.elements.list.children[0].children[0].click();
completedOnly.elements.sheetUndone.click();
assert.equal(completedOnly.data()['2026-09-05'], undefined);
assert.equal(completedOnly.data()['2026-09-06'][0].done, false);
console.log('PASS: existing flows, synchronous focus, rollover on startup/focus/visibility/midnight, catch-up, stable IDs/notes/counts, future/history preservation, drafts, year and leap-day boundaries');
