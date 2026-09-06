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
  focus() {}
  blur() {}
  click() { this.listeners.click?.call(this, { target: this }); }
}

function boot(initial = {}) {
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  let stored = JSON.stringify(initial);
  vm.runInNewContext(script, {
    document: { getElementById: id => elements[id], createElement: () => new Element() },
    localStorage: { getItem: () => stored, setItem: (key, value) => { assert.equal(key, 'wins.v1'); stored = value; } },
    window: {},
    requestAnimationFrame: fn => fn(),
    setTimeout: fn => fn(),
    confirm: () => true,
    Date,
  });
  return { elements, data: () => JSON.parse(stored) };
}

const { elements: el, data } = boot();
assert.match(el.list.innerHTML, /這天還沒有記錄/);
el.btnPlan.click();
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
el.list.children[0].children[0].click();
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
console.log('PASS: copy, empty state, plans, sequential entry, result editing, binary state, direct records, IME, date navigation, persistence, legacy migration');
