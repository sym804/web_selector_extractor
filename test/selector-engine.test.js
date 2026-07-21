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

// iframe 내부 실행을 흉내낸다 (same-origin: frameElement 접근 가능)
function enterFrame(frameEl, href) {
  global.window = { top: {}, self: {}, frameElement: frameEl };
  global.location = { href };
}

// cross-origin iframe: frameElement 접근이 막힌 상황
function enterFrameCrossOrigin(href) {
  global.window = {
    top: {}, self: {},
    get frameElement() { throw new Error('cross-origin'); },
  };
  global.location = { href };
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

// ---- iframe 지원 ----

test('최상위 프레임에서는 inFrame=false', () => {
  setup('<div>x</div>');
  const fc = SelectorEngine.getFrameContext();
  assert.strictEqual(fc.inFrame, false);
  assert.strictEqual(fc.frameSelector, null);
});

test('iframe 안에서는 부모 기준 프레임 셀렉터를 만든다 (id 우선)', () => {
  const doc = setup('<div><iframe id="pay" name="payframe" src="/pay"></iframe></div>');
  enterFrame(doc.querySelector('iframe'), 'https://shop.example/pay');
  const fc = SelectorEngine.getFrameContext();
  assert.strictEqual(fc.inFrame, true);
  assert.strictEqual(fc.frameSelector, '#pay');
  assert.strictEqual(fc.frameUrl, 'https://shop.example/pay');
});

test('id 가 없으면 name -> src 순으로 프레임 셀렉터', () => {
  const doc1 = setup('<div><iframe name="payframe" src="/pay"></iframe></div>');
  enterFrame(doc1.querySelector('iframe'), 'https://shop.example/pay');
  assert.strictEqual(SelectorEngine.getFrameContext().frameSelector, 'iframe[name="payframe"]');

  const doc2 = setup('<div><iframe src="/checkout"></iframe></div>');
  enterFrame(doc2.querySelector('iframe'), 'https://shop.example/checkout');
  assert.strictEqual(SelectorEngine.getFrameContext().frameSelector, 'iframe[src="/checkout"]');
});

test('cross-origin(frameElement 접근 불가)이면 현재 URL 로 src 폴백', () => {
  setup('<div>x</div>');
  enterFrameCrossOrigin('https://pg.example/checkout');
  const fc = SelectorEngine.getFrameContext();
  assert.strictEqual(fc.inFrame, true);
  assert.strictEqual(fc.frameSelector, 'iframe[src="https://pg.example/checkout"]');
});

test('프레임 컨텍스트가 있으면 Playwright 코드가 frame_locator 로 감싸진다', () => {
  const doc = setup('<button data-testid="pay">x</button>');
  const best = SelectorEngine.extract(doc.querySelector('button')).find(r => r.type === 'data-testid');
  const frame = { inFrame: true, frameSelector: '#pay', frameUrl: 'https://x/pay' };
  assert.strictEqual(
    SelectorEngine.toPlaywright(best, frame),
    'page.frame_locator("#pay").get_by_test_id("pay")'
  );
  assert.strictEqual(
    SelectorEngine.toPlaywrightAction(best, 'click', frame),
    'await page.frame_locator("#pay").get_by_test_id("pay").click()'
  );
});

// ---- Shadow DOM 지원 ----

// host 에 open shadow root 를 붙이고 내부 HTML 을 넣는다
function attachShadow(host, html) {
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = html;
  return sr;
}

test('일반 요소는 inShadow=false', () => {
  const doc = setup('<button id="go">x</button>');
  const sc = SelectorEngine.getShadowContext(doc.querySelector('button'));
  assert.strictEqual(sc.inShadow, false);
  assert.deepStrictEqual(sc.hostPath, []);
});

test('shadow 내부 요소는 host 체인을 만든다', () => {
  const doc = setup('<my-app></my-app>');
  const sr = attachShadow(doc.querySelector('my-app'), '<button id="go">x</button>');
  const sc = SelectorEngine.getShadowContext(sr.querySelector('button'));
  assert.strictEqual(sc.inShadow, true);
  assert.deepStrictEqual(sc.hostPath, ['my-app']);
});

test('중첩 shadow 는 host 체인이 바깥->안 순서로 쌓인다', () => {
  const doc = setup('<my-app></my-app>');
  const outer = attachShadow(doc.querySelector('my-app'), '<my-button></my-button>');
  const inner = attachShadow(outer.querySelector('my-button'), '<button id="go">x</button>');
  const sc = SelectorEngine.getShadowContext(inner.querySelector('button'));
  assert.deepStrictEqual(sc.hostPath, ['my-app', 'my-button']);
});

test('유일성 검사가 document 가 아니라 ShadowRoot 기준으로 계산된다', () => {
  // 같은 id 가 메인 문서에도 있지만, shadow 안에서는 그 안에서만 세야 한다
  const doc = setup('<div id="go">바깥</div><my-app></my-app>');
  const sr = attachShadow(doc.querySelector('my-app'), '<button id="go">x</button>');
  const results = SelectorEngine.extract(sr.querySelector('button'));
  const byId = results.find(r => r.type === 'id');
  assert.strictEqual(byId.selector, '#go');
  assert.strictEqual(byId.unique, true, 'ShadowRoot 안에서는 유일해야 한다');
  assert.strictEqual(byId.matchCount, 1);
});

test('shadow 내부에서는 XPath 를 제공하지 않는다 (경계를 못 넘음)', () => {
  const doc = setup('<my-app></my-app>');
  const sr = attachShadow(doc.querySelector('my-app'), '<button id="go">x</button>');
  const results = SelectorEngine.extract(sr.querySelector('button'));
  assert.strictEqual(results.find(r => r.type === 'xpath'), undefined);
});

test('hostPath 가 있으면 Playwright 코드가 host 를 거쳐 내려간다', () => {
  const doc = setup('<my-app></my-app>');
  const sr = attachShadow(doc.querySelector('my-app'), '<button data-testid="submit">x</button>');
  const best = SelectorEngine.extract(sr.querySelector('button')).find(r => r.type === 'data-testid');
  const ctx = SelectorEngine.getShadowContext(sr.querySelector('button'));
  assert.strictEqual(
    SelectorEngine.toPlaywright(best, ctx),
    'page.locator("my-app").get_by_test_id("submit")'
  );
});

test('iframe + shadow 가 겹치면 frame_locator 뒤에 host 체인이 붙는다', () => {
  const best = { type: 'id', selector: '#go' };
  const ctx = { inFrame: true, frameSelector: '#pay', inShadow: true, hostPath: ['my-app', 'my-button'] };
  assert.strictEqual(
    SelectorEngine.toPlaywright(best, ctx),
    'page.frame_locator("#pay").locator("my-app").locator("my-button").locator("#go")'
  );
});

test('프레임이 없으면 기존과 동일하게 page 루트를 쓴다 (회귀)', () => {
  const doc = setup('<button data-testid="pay">x</button>');
  const best = SelectorEngine.extract(doc.querySelector('button')).find(r => r.type === 'data-testid');
  assert.strictEqual(SelectorEngine.toPlaywright(best), 'page.get_by_test_id("pay")');
  assert.strictEqual(SelectorEngine.toPlaywrightAction(best, 'click'), 'await page.get_by_test_id("pay").click()');
});
