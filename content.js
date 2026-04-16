/**
 * Content Script - 페이지에 주입되어 엘리먼트 선택/하이라이트/말풍선 처리
 */
(() => {
  let isActive = false;
  let currentHighlight = null;
  let currentTooltip = null;

  // background에서 ON/OFF 메시지 수신
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'toggle') {
      isActive = msg.active;
      if (!isActive) {
        cleanup();
      }
      sendResponse({ ok: true });
    }
    if (msg.type === 'getState') {
      sendResponse({ active: isActive });
    }
  });

  // 마우스 오버 - 하이라이트
  document.addEventListener('mouseover', (e) => {
    if (!isActive) return;
    if (isOwnElement(e.target)) return;

    if (currentHighlight && currentHighlight !== e.target) {
      currentHighlight.classList.remove('se-highlight');
    }
    e.target.classList.add('se-highlight');
    currentHighlight = e.target;
  }, true);

  // 마우스 아웃 - 하이라이트 제거
  document.addEventListener('mouseout', (e) => {
    if (!isActive) return;
    if (isOwnElement(e.target)) return;
    e.target.classList.remove('se-highlight');
  }, true);

  // 클릭 - 셀렉터 추출
  document.addEventListener('click', (e) => {
    if (!isActive) return;
    if (isOwnElement(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    const el = e.target;

    // 셀렉터 추출 (하이라이트 클래스 추가 전에 실행)
    el.classList.remove('se-highlight');
    const selectors = SelectorEngine.extract(el);

    el.classList.add('se-highlight-clicked');
    const elementInfo = SelectorEngine.getElementInfo(el);

    // 말풍선 표시
    showTooltip(el, selectors, elementInfo);

    // 사이드 패널에 전송
    chrome.runtime.sendMessage({
      type: 'selectorExtracted',
      data: {
        selectors,
        elementInfo,
        playwright: selectors.length > 0 ? {
          locator: SelectorEngine.toPlaywright(selectors[0]),
          click: SelectorEngine.toPlaywrightAction(selectors[0], 'click'),
          fill: SelectorEngine.toPlaywrightAction(selectors[0], 'fill'),
          visible: SelectorEngine.toPlaywrightAction(selectors[0], 'visible'),
        } : null,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }
    });

    // 3초 후 클릭 하이라이트 제거
    setTimeout(() => {
      el.classList.remove('se-highlight-clicked');
    }, 3000);
  }, true);

  // ESC로 말풍선 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentTooltip) {
      removeTooltip();
    }
  });

  function showTooltip(el, selectors, elementInfo) {
    removeTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'se-tooltip';

    // 헤더
    const header = document.createElement('div');
    header.className = 'se-tooltip-header';
    header.innerHTML = `
      <span class="se-tag">&lt;${elementInfo.tag}&gt;</span>
      <span>${selectors.length} selectors</span>
      <button class="se-tooltip-close">&times;</button>
    `;
    header.querySelector('.se-tooltip-close').addEventListener('click', (e) => {
      e.stopPropagation();
      removeTooltip();
    });
    tooltip.appendChild(header);

    // 셀렉터 목록
    selectors.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'se-selector-item';
      const uniqueBadge = s.unique
        ? '<span class="se-unique">UNIQUE</span>'
        : `<span class="se-match-count">${s.matchCount}matches</span>`;
      item.innerHTML = `
        <span class="se-type">${s.type}</span>
        ${uniqueBadge}
        <span class="se-value">${escapeHtml(s.selector)}</span>
        <button class="se-copy-btn" data-selector="${escapeAttr(s.selector)}">Copy</button>
      `;

      const copyBtn = item.querySelector('.se-copy-btn');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(s.selector);
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('se-copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('se-copied');
        }, 1500);
      });

      tooltip.appendChild(item);
    });

    // Playwright 섹션
    if (selectors.length > 0) {
      const bestSelector = selectors[0];
      const pwSection = document.createElement('div');
      pwSection.className = 'se-playwright-section';

      const actions = [
        { label: 'Locator', code: SelectorEngine.toPlaywright(bestSelector) },
        { label: 'Click', code: SelectorEngine.toPlaywrightAction(bestSelector, 'click') },
        { label: 'Fill', code: SelectorEngine.toPlaywrightAction(bestSelector, 'fill') },
        { label: 'Assert', code: SelectorEngine.toPlaywrightAction(bestSelector, 'visible') },
      ];

      pwSection.innerHTML = `<div class="se-section-title">Playwright (Best Selector)</div>`;
      actions.forEach((action) => {
        const row = document.createElement('div');
        row.className = 'se-playwright-code';
        row.innerHTML = `
          <span class="se-type" style="min-width:50px">${action.label}</span>
          <span class="se-value">${escapeHtml(action.code)}</span>
          <button class="se-copy-btn" data-code="${escapeAttr(action.code)}">Copy</button>
        `;
        const btn = row.querySelector('.se-copy-btn');
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          copyToClipboard(action.code);
          btn.textContent = 'Copied!';
          btn.classList.add('se-copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('se-copied');
          }, 1500);
        });
        pwSection.appendChild(row);
      });

      tooltip.appendChild(pwSection);
    }

    // 위치 계산
    const rect = el.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    // 화면 밖으로 나가지 않게
    tooltip.style.visibility = 'hidden';
    document.body.appendChild(tooltip);

    const tooltipRect = tooltip.getBoundingClientRect();
    if (top + tooltipRect.height > window.innerHeight) {
      top = rect.top - tooltipRect.height - 8;
    }
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 8;
    }
    if (left < 8) left = 8;
    if (top < 8) top = 8;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.visibility = 'visible';

    currentTooltip = tooltip;
  }

  function removeTooltip() {
    if (currentTooltip) {
      currentTooltip.remove();
      currentTooltip = null;
    }
  }

  function cleanup() {
    removeTooltip();
    if (currentHighlight) {
      currentHighlight.classList.remove('se-highlight');
      currentHighlight.classList.remove('se-highlight-clicked');
      currentHighlight = null;
    }
    document.querySelectorAll('.se-highlight, .se-highlight-clicked').forEach(el => {
      el.classList.remove('se-highlight', 'se-highlight-clicked');
    });
  }

  function isOwnElement(el) {
    return el.closest('.se-tooltip') !== null;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
