/**
 * Selector Engine - 엘리먼트에서 다양한 셀렉터를 추출하는 핵심 로직
 * 우선순위: id > data-testid > unique class > css > xpath > role > text
 */
const SelectorEngine = (() => {

  function extract(el) {
    const results = [];

    const id = getById(el);
    if (id) results.push({ type: 'id', selector: id.selector, priority: 1, stability: 'high' });

    const testId = getByTestId(el);
    if (testId) results.push({ type: 'data-testid', selector: testId.selector, priority: 2, stability: 'high' });

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
      return { selector: `#${el.id}` };
    }
    return null;
  }

  function getByTestId(el) {
    const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-cy');
    if (testId) {
      return { selector: `[data-testid="${testId}"]` };
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
      return { selector: `role=${role}[name="${name}"]` };
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
      return { selector: `text="${directText}"` };
    }
    if (text.length <= 80) {
      return { selector: `text="${text}"` };
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
      return document.querySelectorAll(selector).length;
    } catch { return 999; }
  }

  function isUniqueSelector(selector) {
    try {
      return document.querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  }

  function isValidSelector(selector) {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  // Playwright 코드 생성
  function toPlaywright(selectorResult) {
    const { type, selector } = selectorResult;
    switch (type) {
      case 'id':
        return `page.locator("${selector}")`;
      case 'data-testid':
        return `page.get_by_test_id("${selector.replace(/\[data-testid="(.+)"\]/, '$1')}")`;
      case 'role': {
        const match = selector.match(/^role=(\w+)(?:\[name="(.+)"\])?$/);
        if (match) {
          const [, role, name] = match;
          return name
            ? `page.get_by_role("${role}", name="${name}")`
            : `page.get_by_role("${role}")`;
        }
        return `page.locator("[role='${selector.replace('role=', '')}']")`;
      }
      case 'text': {
        const text = selector.replace(/^text="(.+)"$/, '$1');
        return `page.get_by_text("${text}")`;
      }
      case 'xpath':
        return `page.locator("xpath=${selector}")`;
      default:
        return `page.locator("${selector}")`;
    }
  }

  // Playwright 액션 코드 생성
  function toPlaywrightAction(selectorResult, action = 'click') {
    const locator = toPlaywright(selectorResult);
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

  return { extract, toPlaywright, toPlaywrightAction, getElementInfo };
})();

if (typeof window !== 'undefined') {
  window.SelectorEngine = SelectorEngine;
}
