/**
 * Side Panel - 히스토리 관리, 검색, 내보내기
 */
(() => {
  let history = [];
  const historyList = document.getElementById('historyList');
  const searchInput = document.getElementById('searchInput');
  const statsCount = document.getElementById('statsCount');
  const statsPage = document.getElementById('statsPage');

  // 저장된 히스토리 로드
  chrome.storage.local.get('selectorHistory', (data) => {
    if (data.selectorHistory) {
      history = data.selectorHistory;
      renderHistory();
    }
  });

  // 새 셀렉터 수신
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'newSelector') {
      history.unshift(msg.data);
      saveHistory();
      renderHistory();
    }
  });

  // 검색
  searchInput.addEventListener('input', () => {
    renderHistory();
  });

  // 전체 삭제
  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (history.length === 0) return;
    history = [];
    saveHistory();
    renderHistory();
  });

  // JSON 내보내기
  document.getElementById('btnExportJson').addEventListener('click', () => {
    if (history.length === 0) return;
    const exportData = history.map(item => ({
      url: item.url,
      element: item.elementInfo,
      selectors: item.selectors,
      playwright: item.playwright,
      timestamp: item.timestamp,
    }));
    downloadFile(
      JSON.stringify(exportData, null, 2),
      `selectors-${formatDate(new Date())}.json`,
      'application/json'
    );
  });

  // CSV 내보내기
  document.getElementById('btnExportCsv').addEventListener('click', () => {
    if (history.length === 0) return;
    const header = 'Timestamp,URL,Tag,Best Selector Type,Best Selector,Playwright Locator\n';
    const rows = history.map(item => {
      const best = item.selectors[0] || {};
      const pw = item.playwright?.locator || '';
      return [
        item.timestamp,
        `"${item.url}"`,
        item.elementInfo.tag,
        best.type || '',
        `"${(best.selector || '').replace(/"/g, '""')}"`,
        `"${pw.replace(/"/g, '""')}"`,
      ].join(',');
    }).join('\n');
    downloadFile(
      header + rows,
      `selectors-${formatDate(new Date())}.csv`,
      'text/csv'
    );
  });

  function renderHistory() {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = query
      ? history.filter(item =>
          item.selectors.some(s => s.selector.toLowerCase().includes(query)) ||
          item.elementInfo.tag.includes(query) ||
          (item.elementInfo.text && item.elementInfo.text.toLowerCase().includes(query))
        )
      : history;

    statsCount.textContent = `${filtered.length}개 항목`;
    if (history.length > 0) {
      const latestUrl = new URL(history[0].url);
      statsPage.textContent = latestUrl.hostname;
    }

    if (filtered.length === 0) {
      historyList.innerHTML = `
        <div class="sp-empty">
          <div class="sp-empty-icon">&#128270;</div>
          <div class="sp-empty-text">${query ? '검색 결과 없음' : '엘리먼트를 클릭하면<br>셀렉터가 여기에 쌓입니다'}</div>
        </div>
      `;
      return;
    }

    historyList.innerHTML = '';
    filtered.forEach((item, idx) => {
      const realIdx = history.indexOf(item);
      const el = createHistoryItem(item, realIdx);
      historyList.appendChild(el);
    });
  }

  function createHistoryItem(item, idx) {
    const div = document.createElement('div');
    div.className = 'sp-item';

    const time = new Date(item.timestamp);
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

    // Header
    const header = document.createElement('div');
    header.className = 'sp-item-header';
    header.innerHTML = `
      <span class="sp-item-tag">&lt;${item.elementInfo.tag}&gt;</span>
      <span class="sp-item-meta">
        <span class="sp-item-time">${timeStr}</span>
        <button class="sp-item-delete" data-idx="${idx}" title="삭제">&times;</button>
        <span class="sp-item-chevron">&#9654;</span>
      </span>
    `;

    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('sp-item-delete')) {
        e.stopPropagation();
        history.splice(idx, 1);
        saveHistory();
        renderHistory();
        return;
      }
      div.classList.toggle('open');
    });

    div.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'sp-item-body';

    const content = document.createElement('div');
    content.className = 'sp-item-content';

    // 텍스트 미리보기
    if (item.elementInfo.text) {
      const preview = document.createElement('div');
      preview.style.cssText = 'font-size:11px;color:#6B7076;margin-bottom:8px;line-height:1.4;';
      preview.textContent = item.elementInfo.text.slice(0, 60) + (item.elementInfo.text.length > 60 ? '...' : '');
      content.appendChild(preview);
    }

    // 셀렉터 목록
    item.selectors.forEach(s => {
      const row = document.createElement('div');
      row.className = 'sp-selector-row';
      const badge = s.unique
        ? '<span class="sp-unique">UNIQUE</span>'
        : (s.matchCount && s.matchCount < 999 ? `<span class="sp-match-count">${s.matchCount}</span>` : '');
      row.innerHTML = `
        <span class="sp-selector-type">${s.type}</span>
        ${badge}
        <span class="sp-selector-value">${escapeHtml(s.selector)}</span>
        <button class="sp-copy-btn">Copy</button>
      `;
      const btn = row.querySelector('.sp-copy-btn');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(s.selector);
        btn.textContent = 'OK';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1200);
      });
      content.appendChild(row);
    });

    // Playwright 섹션
    if (item.playwright) {
      const pwSection = document.createElement('div');
      pwSection.className = 'sp-pw-section';
      pwSection.innerHTML = `<div class="sp-pw-title">Playwright</div>`;

      const actions = [
        { label: 'Locator', code: item.playwright.locator },
        { label: 'Click', code: item.playwright.click },
        { label: 'Fill', code: item.playwright.fill },
        { label: 'Assert', code: item.playwright.visible },
      ];

      actions.forEach(a => {
        const row = document.createElement('div');
        row.className = 'sp-pw-row';
        row.innerHTML = `
          <span class="sp-pw-label">${a.label}</span>
          <span class="sp-pw-code">${escapeHtml(a.code)}</span>
          <button class="sp-copy-btn">Copy</button>
        `;
        const btn = row.querySelector('.sp-copy-btn');
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          copyToClipboard(a.code);
          btn.textContent = 'OK';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1200);
        });
        pwSection.appendChild(row);
      });

      content.appendChild(pwSection);
    }

    body.appendChild(content);
    div.appendChild(body);

    return div;
  }

  function saveHistory() {
    // 최대 200개 유지
    if (history.length > 200) {
      history = history.slice(0, 200);
    }
    chrome.storage.local.set({ selectorHistory: history });
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(d) {
    return `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}_${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}`;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
