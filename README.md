# Selector Extractor

QA 자동화용 웹 엘리먼트 셀렉터 추출 크롬 확장 프로그램

## 주요 기능

- **7가지 셀렉터 자동 추출**: ID, data-testid, Class, CSS Selector, XPath, ARIA Role, Text Content
- **유니크 셀렉터 우선 정렬**: 페이지에서 1개만 매치되는 셀렉터를 최상위로 추천
- **Playwright 코드 자동 생성**: locator(), get_by_role(), get_by_test_id(), get_by_text() + 6가지 액션
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
| 2 | data-testid | `[data-testid="value"]`, data-test-id, data-cy |
| 3 | 유니크 클래스 | 페이지에서 1개만 매치되는 클래스 |
| 4 | CSS Selector | 조합된 CSS 셀렉터 |
| 5 | XPath | 최대 6단계 깊이 |
| 6 | ARIA Role | 18가지 HTML 태그 암묵적 역할 매핑 |
| 7 | Text Content | 요소 텍스트 기반 |

추출된 셀렉터는 유니크 여부 > 매치 수 > 기본 우선순위 순으로 자동 정렬됩니다.

## 기술 스택

- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- Side Panel API
- Storage API
- Runtime Messaging

## 라이선스

MIT License
