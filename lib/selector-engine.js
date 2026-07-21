/**
 * Selector Engine - 엘리먼트에서 다양한 셀렉터를 추출하는 핵심 로직
 * 우선순위: id > data-testid > unique class > css > xpath > role > text
 */
const SelectorEngine = (() => {

  // 속성/문자열 셀렉터 값의 특수문자(\ 와 ")를 escape
  function escAttr(v) {
    return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  // 유일성/매치 수 검사의 기준 루트.
  // shadow DOM 안 요소면 document 가 아니라 그 ShadowRoot 를 기준으로 세야 한다.
  let queryRoot = null;
  function root() {
    return queryRoot || document;
  }

  function extract(el) {
    queryRoot = el.getRootNode ? el.getRootNode() : document;
    const results = [];

    const id = getById(el);
    if (id) results.push({ type: 'id', selector: id.selector, priority: 1, stability: 'high' });

    const testId = getByTestId(el);
    if (testId) results.push({ type: testId.attr, selector: testId.selector, priority: 2, stability: 'high' });

    const uniqueClass = getByUniqueClass(el);
    if (uniqueClass) results.push({ type: 'class', selector: uniqueClass.selector, priority: 3, stability: 'medium' });

    const css = getByCss(el);
    if (css) results.push({ type: 'css', selector: css.selector, priority: 4, stability: 'medium' });

    const xpath = getByXPath(el);
    if (xpath) results.push({ type: 'xpath', selector: xpath.selector, priority: 5, stability: 'low' });

    const role = getByRole(el);
    if (role) results.push({ type: 'role', selector: role.selector, priority: 6, stability: 'medium' });

    const text = getByText(el);
    if (text) results.push({ type: 'text', selector: text.selector, priority: 7, stability: 'low' });

    // 유니크 여부 체크 + 매치 수 측정
    results.forEach(r => {
      r.unique = checkUnique(r);
      r.matchCount = countMatches(r);
    });

    // 정렬: 유니크 우선 → 같으면 매치 수 적은 순 → 같으면 기존 priority
    return results.sort((a, b) => {
      if (a.unique !== b.unique) return a.unique ? -1 : 1;
      if (a.matchCount !== b.matchCount) return a.matchCount - b.matchCount;
      return a.priority - b.priority;
    });
  }

  function getById(el) {
    if (el.id && isUniqueSelector(`#${CSS.escape(el.id)}`)) {
      return { selector: `#${CSS.escape(el.id)}` };
    }
    return null;
  }

  function getByTestId(el) {
    // 매치된 속성명을 그대로 셀렉터에 사용해야 한다.
    // data-cy 요소에 [data-testid=...] 를 내면 페이지에서 0 매치가 된다.
    for (const attr of ['data-testid', 'data-test-id', 'data-cy']) {
      const val = el.getAttribute(attr);
      if (val) {
        return { selector: `[${attr}="${escAttr(val)}"]`, attr };
      }
    }
    return null;
  }

  function getByUniqueClass(el) {
    const classes = Array.from(el.classList);
    for (const cls of classes) {
      if (cls.length < 3) continue;
      // 확장 프로그램 자체 클래스 무시
      if (/^se-/.test(cls)) continue;
      // 동적 생성 클래스 패턴 무시 (hash 기반)
      if (/^[a-z]{1,3}-[a-zA-Z0-9]{5,}$/.test(cls)) continue;
      if (/^css-/.test(cls)) continue;
      if (/^_/.test(cls)) continue;

      const selector = `.${CSS.escape(cls)}`;
      if (isUniqueSelector(selector)) {
        return { selector };
      }
    }
    return null;
  }

  function getByCss(el) {
    const path = [];
    let current = el;

    while (current && current !== document.body && path.length < 5) {
      let segment = current.tagName.toLowerCase();

      if (current.id) {
        segment = `#${CSS.escape(current.id)}`;
        path.unshift(segment);
        break;
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          c => c.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          segment += `:nth-of-type(${index})`;
        }
      }

      // 의미있는 클래스 추가
      const meaningfulClass = Array.from(current.classList).find(cls =>
        cls.length >= 3 && !/^[a-z]{1,3}-[a-zA-Z0-9]{5,}$/.test(cls) && !/^css-/.test(cls)
      );
      if (meaningfulClass) {
        segment += `.${CSS.escape(meaningfulClass)}`;
      }

      path.unshift(segment);
      current = parent;
    }

    const selector = path.join(' > ');
    if (selector && isValidSelector(selector)) {
      return { selector };
    }
    return null;
  }

  function getByXPath(el) {
    // XPath 는 shadow 경계를 넘지 못한다 -> shadow 내부 요소에는 제공하지 않음
    if (root() !== document) return null;
    const parts = [];
    let current = el;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let part = current.tagName.toLowerCase();

      if (current.id) {
        parts.unshift(`//${part}[@id="${current.id}"]`);
        return { selector: parts.join('/') || parts[0] };
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          c => c.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          part += `[${index}]`;
        }
      }

      parts.unshift(part);
      current = parent;

      if (parts.length > 6) break;
    }

    return { selector: '//' + parts.join('/') };
  }

  function getByRole(el) {
    const role = el.getAttribute('role') || getImplicitRole(el);
    if (!role) return null;

    const name = el.getAttribute('aria-label')
      || el.getAttribute('title')
      || el.textContent?.trim().slice(0, 50);

    if (name) {
      return { selector: `role=${role}[name="${escAttr(name)}"]` };
    }
    return { selector: `role=${role}` };
  }

  function getImplicitRole(el) {
    const tag = el.tagName.toLowerCase();
    const roleMap = {
      'button': 'button',
      'a': 'link',
      'input': getInputRole(el),
      'select': 'combobox',
      'textarea': 'textbox',
      'img': 'img',
      'h1': 'heading', 'h2': 'heading', 'h3': 'heading',
      'h4': 'heading', 'h5': 'heading', 'h6': 'heading',
      'nav': 'navigation',
      'main': 'main',
      'form': 'form',
      'table': 'table',
      'ul': 'list', 'ol': 'list',
      'li': 'listitem',
    };
    return roleMap[tag] || null;
  }

  function getInputRole(el) {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    const map = {
      'text': 'textbox', 'email': 'textbox', 'tel': 'textbox',
      'url': 'textbox', 'search': 'searchbox', 'password': 'textbox',
      'checkbox': 'checkbox', 'radio': 'radio', 'button': 'button',
      'submit': 'button', 'range': 'slider', 'number': 'spinbutton',
    };
    return map[type] || 'textbox';
  }

  function getByText(el) {
    const text = el.textContent?.trim();
    if (!text || text.length > 80 || text.length < 1) return null;
    // 자식 요소의 텍스트가 아닌 직접 텍스트만
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent.trim())
      .join(' ')
      .trim();

    if (directText && directText.length <= 80) {
      return { selector: `text="${escAttr(directText)}"` };
    }
    if (text.length <= 80) {
      return { selector: `text="${escAttr(text)}"` };
    }
    return null;
  }

  function checkUnique(result) {
    const { type, selector } = result;
    // xpath, role, text는 querySelectorAll로 체크 불가 → 별도 처리
    if (type === 'xpath') {
      try {
        const xResult = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        return xResult.snapshotLength === 1;
      } catch { return false; }
    }
    if (type === 'role' || type === 'text') {
      // role/text는 Playwright 전용이라 DOM에서 정확한 유니크 체크 어려움
      return false;
    }
    return isUniqueSelector(selector);
  }

  function countMatches(result) {
    const { type, selector } = result;
    if (type === 'xpath') {
      try {
        const xResult = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        return xResult.snapshotLength;
      } catch { return 999; }
    }
    if (type === 'role' || type === 'text') {
      return 999; // 측정 불가 → 낮은 우선순위
    }
    try {
      return root().querySelectorAll(selector).length;
    } catch { return 999; }
  }

  function isUniqueSelector(selector) {
    try {
      return root().querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  }

  function isValidSelector(selector) {
    try {
      root().querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  // 열린 Shadow DOM 안이면 document 까지의 host 체인을 만든다.
  // Playwright 는 locator 단계마다 open shadow root 를 통과하므로,
  // host 를 차례로 locator 로 내려가면 shadow 내부 요소에 도달한다.
  function getShadowContext(el) {
    const hostPath = [];
    let rn = el.getRootNode ? el.getRootNode() : document;
    let guard = 0;
    while (rn && rn.host && guard++ < 10) {
      const host = rn.host;
      hostPath.unshift(hostSelector(host));
      rn = host.getRootNode ? host.getRootNode() : document;
    }
    return { inShadow: hostPath.length > 0, hostPath };
  }

  // host 엘리먼트를 "그 host 가 속한 루트" 기준으로 가리키는 셀렉터
  function hostSelector(host) {
    const hostRoot = host.getRootNode ? host.getRootNode() : document;
    const isUnique = (sel) => {
      try { return hostRoot.querySelectorAll(sel).length === 1; } catch { return false; }
    };
    if (host.id && isUnique(`#${CSS.escape(host.id)}`)) return `#${CSS.escape(host.id)}`;
    for (const attr of ['data-testid', 'data-test-id', 'data-cy']) {
      const v = host.getAttribute(attr);
      if (v) return `[${attr}="${escAttr(v)}"]`;
    }
    const tag = host.tagName.toLowerCase();
    if (isUnique(tag)) return tag; // 커스텀 엘리먼트는 대개 유일
    for (const cls of Array.from(host.classList)) {
      if (cls.length < 3 || /^se-/.test(cls)) continue;
      const sel = `${tag}.${CSS.escape(cls)}`;
      if (isUnique(sel)) return sel;
    }
    const parent = host.parentElement;
    if (parent) {
      const same = Array.from(parent.children).filter(c => c.tagName === host.tagName);
      if (same.length > 1) return `${tag}:nth-of-type(${same.indexOf(host) + 1})`;
    }
    return tag;
  }

  // 현재 실행 컨텍스트가 iframe 인지 + 부모에서 이 프레임을 가리키는 셀렉터
  function getFrameContext() {
    let inFrame;
    try {
      inFrame = window.top !== window.self;
    } catch {
      inFrame = true; // 크로스오리진이면 window.top 접근 자체가 막힘 = 프레임 안
    }
    if (!inFrame) return { inFrame: false, frameSelector: null, frameUrl: null };

    let frameSelector = null;
    try {
      // same-origin 에서만 접근 가능 (부모 문서의 iframe 엘리먼트)
      const fe = window.frameElement;
      if (fe) frameSelector = buildFrameSelector(fe);
    } catch {
      /* cross-origin -> 아래 src 폴백 */
    }
    if (!frameSelector) {
      // 부모는 src 로 이 프레임을 찾을 수 있다 (best-effort)
      frameSelector = `iframe[src="${escAttr(location.href)}"]`;
    }
    return { inFrame: true, frameSelector, frameUrl: location.href };
  }

  function buildFrameSelector(fe) {
    const tag = fe.tagName.toLowerCase(); // iframe | frame
    if (fe.id) return `#${CSS.escape(fe.id)}`;
    const name = fe.getAttribute('name');
    if (name) return `${tag}[name="${escAttr(name)}"]`;
    const src = fe.getAttribute('src');
    if (src) return `${tag}[src="${escAttr(src)}"]`;
    const parent = fe.parentElement;
    if (parent) {
      const sameTag = Array.from(parent.children).filter(c => c.tagName === fe.tagName);
      if (sameTag.length > 1) return `${tag}:nth-of-type(${sameTag.indexOf(fe) + 1})`;
    }
    return tag;
  }

  // Playwright 코드 생성.
  // ctx 는 프레임/shadow 컨텍스트를 담는다: { inFrame, frameSelector, hostPath }
  // frame 이면 frame_locator 로 감싸고, shadow host 가 있으면 host 를 차례로 내려간다.
  function toPlaywright(selectorResult, ctx) {
    let base = (ctx && ctx.inFrame && ctx.frameSelector)
      ? `page.frame_locator("${escAttr(ctx.frameSelector)}")`
      : 'page';
    if (ctx && ctx.hostPath && ctx.hostPath.length) {
      for (const h of ctx.hostPath) base += `.locator("${escAttr(h)}")`;
    }
    const root = base;
    const { type, selector } = selectorResult;
    switch (type) {
      case 'id':
        return `${root}.locator("${selector}")`;
      case 'data-testid':
        return `${root}.get_by_test_id("${selector.replace(/\[data-testid="(.+)"\]/, '$1')}")`;
      case 'role': {
        const match = selector.match(/^role=(\w+)(?:\[name="(.+)"\])?$/);
        if (match) {
          const [, role, name] = match;
          return name
            ? `${root}.get_by_role("${role}", name="${name}")`
            : `${root}.get_by_role("${role}")`;
        }
        return `${root}.locator("[role='${selector.replace('role=', '')}']")`;
      }
      case 'text': {
        const text = selector.replace(/^text="(.+)"$/, '$1');
        return `${root}.get_by_text("${text}")`;
      }
      case 'xpath':
        return `${root}.locator("xpath=${selector}")`;
      default:
        return `${root}.locator("${selector}")`;
    }
  }

  // Playwright 액션 코드 생성
  function toPlaywrightAction(selectorResult, action = 'click', ctx) {
    const locator = toPlaywright(selectorResult, ctx);
    switch (action) {
      case 'click': return `await ${locator}.click()`;
      case 'fill': return `await ${locator}.fill("")`;
      case 'check': return `await ${locator}.check()`;
      case 'hover': return `await ${locator}.hover()`;
      case 'visible': return `await expect(${locator}).to_be_visible()`;
      case 'text': return `await expect(${locator}).to_have_text("")`;
      default: return `await ${locator}.${action}()`;
    }
  }

  // 엘리먼트 정보 추출
  function getElementInfo(el) {
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: Array.from(el.classList),
      text: el.textContent?.trim().slice(0, 100) || null,
      attributes: getRelevantAttributes(el),
      rect: el.getBoundingClientRect(),
    };
  }

  function getRelevantAttributes(el) {
    const relevant = ['type', 'name', 'placeholder', 'aria-label', 'data-testid',
      'data-test-id', 'data-cy', 'role', 'href', 'src', 'alt', 'title', 'value'];
    const attrs = {};
    for (const name of relevant) {
      const val = el.getAttribute(name);
      if (val) attrs[name] = val;
    }
    return attrs;
  }

  return { extract, toPlaywright, toPlaywrightAction, getElementInfo, getFrameContext, getShadowContext };
})();

if (typeof window !== 'undefined') {
  window.SelectorEngine = SelectorEngine;
}

// Node(테스트) 환경에서 import 가능하게
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SelectorEngine;
}
