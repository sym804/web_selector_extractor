/**
 * Background Service Worker - 메시지 브릿지 + 상태 관리
 */

// 탭별 활성 상태
const tabStates = {};

// 확장 아이콘 클릭 시 사이드 패널 열기
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

// content script ↔ sidepanel 메시지 브릿지
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 셀렉터 추출 결과 → 사이드 패널로 전달
  if (msg.type === 'selectorExtracted') {
    chrome.runtime.sendMessage({
      type: 'newSelector',
      data: msg.data,
    }).catch(() => {
      // 사이드 패널이 닫혀있으면 무시
    });
  }

  // 팝업에서 토글 요청
  if (msg.type === 'toggleExtractor') {
    const tabId = msg.tabId;
    tabStates[tabId] = !tabStates[tabId];
    const active = tabStates[tabId];

    chrome.tabs.sendMessage(tabId, { type: 'toggle', active }).catch(() => {});

    // 활성화 시 사이드 패널 열기
    if (active) {
      chrome.sidePanel.open({ tabId }).catch(() => {});
    }

    sendResponse({ active });
  }

  // 상태 조회
  if (msg.type === 'getExtractorState') {
    sendResponse({ active: !!tabStates[msg.tabId] });
  }

  // 사이드 패널에서 닫기 요청
  if (msg.type === 'deactivate') {
    const tabId = msg.tabId;
    tabStates[tabId] = false;
    chrome.tabs.sendMessage(tabId, { type: 'toggle', active: false }).catch(() => {});
  }

  return true; // async sendResponse
});

// 탭 닫힐 때 정리
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabStates[tabId];
});
