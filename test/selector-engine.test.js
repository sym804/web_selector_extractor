const { test } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const SelectorEngine = require('../lib/selector-engine.js');

// 표준 CSS.escape 폴리필 (Mathias Bynens). 브라우저엔 네이티브로 있지만 jsdom 엔 없다.
function cssEscape(value) {
  const string = String(value);
  const length = string.length;
  const firstCodeUnit = string.charCodeAt(0);
  let index = -1;
  let result = '';
  while (++index < length) {
    const codeUnit = string.charCodeAt(index);
    if (codeUnit === 0x0000) { result += '�'; continue; }
    if (
      (codeUnit >= 0x0001 && codeUnit <= 0x001f) || codeUnit === 0x007f ||
      (index === 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (index === 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit === 0x002d)
    ) {
      result += '\\' + codeUnit.toString(16) + ' ';
      continue;
    }
    if (index === 0 && length === 1 && codeUnit === 0x002d) {
      result += '\\' + string.charAt(index);
      continue;
    }
    if (
      codeUnit >= 0x0080 || codeUnit === 0x002d || codeUnit === 0x005f ||
      (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
      (codeUnit >= 0x0061 && codeUnit <= 0x007a)
    ) {
      result += string.charAt(index);
      continue;
    }
    result += '\\' + string.charAt(index);
  }
  return result;
}

// 엔진이 참조하는 브라우저 전역을 jsdom 으로 주입한다.
function setup(html) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  global.window = dom.window;
  global.document = dom.window.document;
  global.Node = dom.window.Node;
  global.CSS = (dom.window.CSS && dom.window.CSS.escape) ? dom.window.CSS : { escape: cssEscape };
  return dom.window.document;
}

// extract 결과를 { type: selector } 맵으로
function typesOf(el) {
  return SelectorEngine.extract(el).reduce((m, r) => { m[r.type] = r.selector; return m; }, {});
}

test('data-cy 요소는 [data-cy=...] 셀렉터를 낸다 (회귀: 예전엔 [data-testid=...] 오출력)', () => {
  const doc = setup('<button data-cy="login-btn">Login</button>');
  const el = doc.querySelector('button');
  const t = typesOf(el);
  assert.strictEqual(t['data-cy'], '[data-cy="login-btn"]');
  assert.strictEqual(t['data-testid'], undefined, 'data-cy 를 data-testid 로 오매핑하면 안 된다');
  // 실제로 그 요소를 매치해야 한다
  assert.strictEqual(doc.querySelectorAll(t['data-cy']).length, 1);
});

test('data-test-id 요소는 [data-test-id=...] 셀렉터를 낸다', () => {
  const doc = setup('<div data-test-id="hero">x</div>');
  const el = doc.querySelector('div');
  const t = typesOf(el);
  assert.strictEqual(t['data-test-id'], '[data-test-id="hero"]');
  assert.strictEqual(doc.querySelectorAll(t['data-test-id']).length, 1);
});

test('data-testid 는 get_by_test_id 로 변환된다', () => {
  const doc = setup('<div data-testid="submit">x</div>');
  const el = doc.querySelector('div');
  const res = SelectorEngine.extract(el).find(r => r.type === 'data-testid');
  assert.strictEqual(res.selector, '[data-testid="submit"]');
  assert.strictEqual(SelectorEngine.toPlaywright(res), 'page.get_by_test_id("submit")');
});

test('data-testid 우선순위가 data-cy 보다 높다', () => {
  const doc = setup('<button data-testid="a" data-cy="b">x</button>');
  const el = doc.querySelector('button');
  const res = SelectorEngine.extract(el).find(r => r.priority === 2);
  assert.strictEqual(res.type, 'data-testid');
  assert.strictEqual(res.selector, '[data-testid="a"]');
});

test('특수문자 id 는 escape 되어 실제로 매치된다', () => {
  const doc = setup('<div id="user.name:1">x</div>');
  const el = doc.querySelector('div');
  const t = typesOf(el);
  assert.strictEqual(t.id, '#' + cssEscape('user.name:1'));
  assert.strictEqual(doc.querySelectorAll(t.id).length, 1, 'escape 안 하면 무효 셀렉터가 됨');
});

test('css-해시 동적 클래스는 class 셀렉터에서 제외된다', () => {
  const doc = setup('<span class="css-1a2b3c">x</span>');
  const el = doc.querySelector('span');
  const t = typesOf(el);
  assert.strictEqual(t.class, undefined);
});

test('data-cy 값의 큰따옴표는 escape 된다', () => {
  const doc = setup(`<button data-cy='a"b'>x</button>`);
  const el = doc.querySelector('button');
  const t = typesOf(el);
  assert.strictEqual(t['data-cy'], '[data-cy="a\\"b"]');
  assert.strictEqual(doc.querySelectorAll(t['data-cy']).length, 1);
});
