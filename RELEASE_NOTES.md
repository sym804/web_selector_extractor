# Selector Extractor 릴리즈 노트

## 작성 규칙

- 제목: `## <컴포넌트> <버전> - [유형] <요약> (YYYY-MM-DD)`. 버전 축이 여럿이면 ` / <축> <버전>` 으로 잇는다
- 유형: `feat` / `fix` / `perf` / `refactor` / `chore` / `docs`. 요약은 60자 이내 명사형("~ 추가", "~ 수정")
- 본문: `### 이슈`, `### 변경`, `### 영향` 은 필수. 이슈는 한 줄에 하나, `GH#12 <이슈 제목> (<유형>/<심각도>/<영역>)`
- `### 조치` 는 배포자가 손으로 할 일이 있을 때만 쓴다. 없으면 블록을 뺀다
- 분량: D 5줄, C 900자, B 1,200자, A 1,600자 이내. 회고, 서술형 종결, 장식 기호 금지
- 커밋할 때 pre-commit 훅이 새 절을 검사한다. 손으로는 `python ~/.claude/tools/release-lint/run.py check <이 파일>`

## 버전 현황
- Frontend: 1.3.2 (manifest 와 동일한 3자리 표기로 통일)

=========== 2026/11/07 릴리즈 노트 ===========

## Selector Extractor 1.3.2 - [fix] 태그명 이스케이프 누락 수정(SYM-213) (2026-11-07)

### 이슈

SYM-213 태그명을 이스케이프하지 않고 innerHTML 에 넣는다 (bug/minor/security)

### 변경
- `content.js` 툴팁 헤더와 `sidepanel.js` 기록 헤더의 태그명을 `escapeHtml(String(x ?? ''))` 로 감쌈
- manifest·package 버전을 노트와 같은 1.3.2 로 맞춤(이전 1.3.1 때 1.3.0 에 머물러 있었음)

### 영향
- 화면 변화 없음. 태그명이 없는 옛 기록도 목록이 그려짐
- 검증: `npm test` 통과, QA 2인과 세션 3·4 검토 통과

=========== 2026/09/16 릴리즈 노트 ===========

## Selector Extractor 1.3.1 - [fix] 공개 레포 개인 절대경로 제거(SYM-99) (2026-09-16)
버그 수정

- [보안] 공개 레포에 남아 있던 개인 절대경로 제거 (SYM-99, bug/minor/security)
  - `icons/generate_icons.py` 의 `FONT_DIR` 이 로컬 플러그인 캐시 경로를 하드코딩해 Windows 사용자명과 설치 구조가 드러남
  - `FONT_DIR` 과 `ImageFont` import 를 삭제. 둘 다 157줄 파일 어디에서도 쓰이지 않던 죽은 코드
  - 확장 런타임에는 영향 없음. 아이콘 생성 스크립트만 해당
  - git 히스토리에는 남으므로 효과는 앞으로의 노출 축소에 한정

=========== 2026/04/02 릴리즈 노트 ===========

## Selector Extractor 1.0.0.0 - [feat] 크롬 확장 초기 릴리즈(셀렉터 추출 엔진, Playwright 코드 생성) (2026-04-02)
- 크롬 확장 프로그램 최초 생성
- 셀렉터 추출 엔진 (id, data-testid, class, css, xpath, role, text)
- 말풍선 UI + 사이드 패널 히스토리
- Playwright 코드 생성 (locator, click, fill, assert)
- 클립보드 복사, JSON/CSV 내보내기
- 우선순위: id > data-testid > unique class > css > xpath > role > text

## Selector Extractor 1.1.0.1 - [feat] 유니크 셀렉터 우선 정렬 + 매치 수 뱃지, se- 클래스 필터링 수정 (2026-04-02)
12:10 기능 추가 + 마이너 패치
- [기능 추가] 유니크 셀렉터 우선 정렬: 페이지에서 1개만 매치되는 셀렉터를 최상위로 추천
- [기능 추가] 유니크/매치 수 뱃지 표시: 말풍선 및 사이드 패널에 UNIQUE(초록) / 매치수(노란) 뱃지
- [마이너 패치] se- 접두사 클래스 필터링: 확장 프로그램 자체 클래스(se-highlight 등)가 셀렉터에 포함되지 않도록 수정
- [마이너 패치] 셀렉터 추출 순서 수정: se-highlight-clicked 클래스 추가 전에 셀렉터 추출하도록 변경
  Frontend: 1.0.0.0 -> 1.1.0.1

## Selector Extractor 1.1.0.2 - [chore] 아이콘 교체(placeholder → 정식 아이콘) (2026-04-02)
12:30 마이너 패치
- [마이너 패치] 아이콘 교체: placeholder → 정식 아이콘 (Precision Signal 디자인, 크로스헤어 + 그리드 + 초록 포커스 포인트)
- 16x16, 48x48, 128x128, 512x512(웹스토어용) 생성
  Frontend: 1.1.0.1 -> 1.1.0.2

=========== 2026/07/22 릴리즈 노트 ===========

## Selector Extractor 1.2.0 - [feat] iframe 내부 요소 선택 지원 + data-cy/escape 버그 수정 (2026-07-22)
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

## Selector Extractor 1.3.0 - [feat] Shadow DOM(open) 내부 요소 선택 지원 (2026-07-22)
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
