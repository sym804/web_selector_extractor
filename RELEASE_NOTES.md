# Selector Extractor 릴리즈 노트

## 버전 현황
- Frontend: 1.3.0 (manifest 와 동일한 3자리 표기로 통일)

=========== 2026/04/02 릴리즈 노트 ===========

### v1.0.0.0 (초기 릴리즈)
- 크롬 확장 프로그램 최초 생성
- 셀렉터 추출 엔진 (id, data-testid, class, css, xpath, role, text)
- 말풍선 UI + 사이드 패널 히스토리
- Playwright 코드 생성 (locator, click, fill, assert)
- 클립보드 복사, JSON/CSV 내보내기
- 우선순위: id > data-testid > unique class > css > xpath > role > text

### v1.1.0.1
12:10 기능 추가 + 마이너 패치
- [기능 추가] 유니크 셀렉터 우선 정렬: 페이지에서 1개만 매치되는 셀렉터를 최상위로 추천
- [기능 추가] 유니크/매치 수 뱃지 표시: 말풍선 및 사이드 패널에 UNIQUE(초록) / 매치수(노란) 뱃지
- [마이너 패치] se- 접두사 클래스 필터링: 확장 프로그램 자체 클래스(se-highlight 등)가 셀렉터에 포함되지 않도록 수정
- [마이너 패치] 셀렉터 추출 순서 수정: se-highlight-clicked 클래스 추가 전에 셀렉터 추출하도록 변경
  Frontend: 1.0.0.0 -> 1.1.0.1

### v1.1.0.2
12:30 마이너 패치
- [마이너 패치] 아이콘 교체: placeholder → 정식 아이콘 (Precision Signal 디자인, 크로스헤어 + 그리드 + 초록 포커스 포인트)
- 16x16, 48x48, 128x128, 512x512(웹스토어용) 생성
  Frontend: 1.1.0.1 -> 1.1.0.2

=========== 2026/07/22 릴리즈 노트 ===========

### v1.2.0
기능 추가 + 버그 수정. 버전 표기를 manifest 와 동일한 3자리로 통일(1.1.0.2 -> 1.2.0).
- [기능 추가] iframe 내부 요소 선택 지원: content script 를 모든 프레임(all_frames, about:blank/srcdoc 포함)에 주입.
  프레임 자체의 부모 기준 셀렉터(id > name > src > nth-of-type)를 계산해 Playwright 코드를
  `page.frame_locator("...")` 로 자동 래핑. cross-origin 프레임은 현재 URL 기준 `iframe[src="..."]` 폴백.
- [기능 추가] 말풍선 헤더에 iframe 뱃지 표시
- [버그 수정] data-cy / data-test-id 요소인데 항상 `[data-testid=...]` 로 출력되어 실제 페이지에서
  0 매치가 되던 문제 -> 매치된 속성명 그대로 생성
- [버그 수정] 특수문자 id 가 반환 셀렉터에서 escape 되지 않아 무효 셀렉터가 되던 문제
- [버그 수정] role / text 셀렉터 값의 큰따옴표 escape 누락
- [개선] 셀렉터 엔진 단위 테스트 13개 신설 (node --test + jsdom, `npm test`)
  Frontend: 1.1.0.2 -> 1.2.0

### v1.3.0
기능 추가
- [기능 추가] Shadow DOM(open) 내부 요소 선택 지원
  - 이벤트가 shadow host 로 리타깃되는 문제를 `composedPath()[0]` 로 해결
  - 유일성/매치 수를 document 가 아니라 해당 ShadowRoot 기준으로 계산
    (바깥에 같은 id 가 있어도 shadow 안에서 유일하면 UNIQUE)
  - host 체인을 계산해 Playwright 코드를 `page.locator("my-app").locator(...)` 로 연결. 중첩 shadow 지원
  - 확장 CSS 가 shadow 경계를 넘지 못하는 문제 -> 해당 shadow root 에 하이라이트 스타일 1회 주입
  - shadow 내부에서는 XPath 미제공(경계를 넘지 못해 무효 셀렉터가 됨)
- [기능 추가] 말풍선 헤더에 shadow 뱃지 표시
- [개선] 단위 테스트 13 -> 20개. 실제 Chrome 에 확장을 로드한 E2E 로 iframe/shadow 동작 검증
  Frontend: 1.2.0 -> 1.3.0
