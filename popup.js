/**
 * Popup - ON/OFF 토글
 */
const toggle = document.getElementById('toggleSwitch');
const statusEl = document.getElementById('status');

// 현재 상태 로드
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return;
  chrome.runtime.sendMessage(
    { type: 'getExtractorState', tabId: tabs[0].id },
    (res) => {
      if (res) {
        toggle.checked = res.active;
        updateStatus(res.active);
      }
    }
  );
});

// 토글
toggle.addEventListener('change', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.runtime.sendMessage(
      { type: 'toggleExtractor', tabId: tabs[0].id },
      (res) => {
        if (res) {
          updateStatus(res.active);
        }
      }
    );
  });
});

function updateStatus(active) {
  if (active) {
    statusEl.textContent = 'ON - 엘리먼트를 클릭하세요';
    statusEl.className = 'status active';
  } else {
    statusEl.textContent = 'OFF - 비활성';
    statusEl.className = 'status';
  }
}
