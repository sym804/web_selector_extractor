# Selector Extractor

QA 자동화용 웹 엘리먼트 셀렉터 추출 크롬 확장 프로그램

## 주요 기능

- **7가지 셀렉터 자동 추출**: ID, data-testid, Class, CSS Selector, XPath, ARIA Role, Text Content
- **유니크 셀렉터 우선 정렬**: 페이지에서 1개만 매치되는 셀렉터를 최상위로 추천
- **Playwright 코드 자동 생성**: locator(), get_by_role(), get_by_test_id(), get_by_text() + 6가지 액션
- **iframe 내부 요소 지원**: 프레임 안 요소도 선택 가능. Playwright 코드는 `page.frame_locator("...")` 로 자동 래핑
- **실시간 말풍선 UI**: 호버 시 블루 아웃라인, 클릭 시 그린 강조, UNIQUE/매치 수 뱃지
- **사이드 패널 히스토리**: 추출한 셀렉터 누적 저장, 실시간 검색, 페이지별 통계
- **데이터 내보내기**: JSON/CSV 형식, 날짜별 파일명 자동 생성
- **동적 클래스 필터링**: css-*, se-*, 해시 기반 자동생성 클래스 자동 제외

## 설치 방법

1. 이 레포지토리를 클론하거나 ZIP 다운로드
   ```bash
   git clone https://github.com/sym804/web_selector_extractor.git
   ```
2. Chrome 브라우저에서 `chrome://extensions` 접속
3. 우측 상단 **개발자 모드** 활성화
4. **압축해제된 확장 프로그램을 로드합니다** 클릭
5. 다운로드한 폴더 선택

## 사용법

### 기본 사용

1. 확장 프로그램 아이콘 클릭 후 **ON** 토글
2. 웹 페이지에서 원하는 요소에 마우스 호버 (블루 아웃라인 표시)
3. 요소 클릭 (그린 강조 + 말풍선에 셀렉터 목록 표시)
4. 원하는 셀렉터의 복사 버튼 클릭

### 사이드 패널

1. 확장 프로그램 아이콘 우클릭 > **사이드 패널에서 열기**
2. 추출한 셀렉터가 히스토리에 자동 누적
3. 검색창으로 원하는 셀렉터 필터링
4. JSON 또는 CSV로 내보내기 가능

### Playwright 코드 복사

말풍선 또는 사이드 패널에서 Playwright 코드를 직접 복사할 수 있습니다:

```python
# CSS Selector
page.locator(".btn-primary")

# Role 기반
page.get_by_role("button", name="Submit")

# Test ID 기반
page.get_by_test_id("login-button")

# Text 기반
page.get_by_text("로그인")
```

지원 액션: click, fill, check, hover, visible assertion, text assertion

## 셀렉터 우선순위

| 순위 | 타입 | 설명 |
|------|------|------|
| 1 | ID | `#element-id` |
| 2 | test id | `data-testid` / `data-test-id` / `data-cy` 를 각각 매치된 속성 그대로 (예: `[data-cy="value"]`) |
| 3 | 유니크 클래스 | 페이지에서 1개만 매치되는 클래스 |
| 4 | CSS Selector | 조합된 CSS 셀렉터 |
| 5 | XPath | 최대 6단계 깊이 |
| 6 | ARIA Role | 18가지 HTML 태그 암묵적 역할 매핑 |
| 7 | Text Content | 요소 텍스트 기반 |

추출된 셀렉터는 유니크 여부 > 매치 수 > 기본 우선순위 순으로 자동 정렬됩니다.

## 테스트

셀렉터 추출 엔진의 정확성은 단위 테스트로 검증합니다 (Node 내장 test runner + jsdom, 외부 프레임워크 없음).

```bash
npm install
npm test
```

`test/selector-engine.test.js` 가 검증하는 것:
- `data-testid` / `data-test-id` / `data-cy` 가 각각 **매치된 속성 그대로** 셀렉터를 내는지 (data-cy 를 data-testid 로 오매핑하지 않는지)
- test id 우선순위 (`data-testid` > `data-cy`)
- 특수문자 id 의 `CSS.escape` 처리 (실제 DOM 매치까지 확인)
- 속성 값의 큰따옴표 escape
- `css-*` 등 동적 해시 클래스 제외
- iframe 컨텍스트 감지(최상위/same-origin/cross-origin 폴백)와 `frame_locator` 래핑

## iframe 지원

content script 가 모든 프레임(`all_frames`, `about:blank`/`srcdoc` 포함)에 주입되어, iframe 안 요소도 그대로 클릭해 추출할 수 있습니다. 이때 프레임 자체를 부모 문서에서 어떻게 찾는지까지 계산해 Playwright 코드를 감쌉니다.

```python
# iframe 안 요소를 클릭한 경우 자동 생성되는 형태
page.frame_locator("#pay").get_by_test_id("submit").click()
```

프레임 셀렉터는 `id` → `name` → `src` → `nth-of-type` 순으로 결정합니다.

## 한계 (Limitations)

- open Shadow DOM 내부 요소는 shadow host 로 리타깃되어 정밀 선택이 어려울 수 있습니다.
- iframe 안에서는 말풍선이 그 프레임 영역 안에 그려집니다. 프레임이 작으면 잘려 보일 수 있으니 사이드 패널에서 확인하세요(기록은 정상).
- cross-origin iframe 은 부모 문서의 iframe 엘리먼트에 접근할 수 없어, 현재 URL 기준 `iframe[src="..."]` 로 대체합니다. 부모의 실제 `src` 속성과 다르면(리다이렉트/상대경로) 수동 보정이 필요합니다.

## 기술 스택

- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- Side Panel API / Storage API / Runtime Messaging
- 테스트: Node `node --test` + jsdom

## 라이선스

MIT License

## Author

[sym804](https://github.com/sym804)
