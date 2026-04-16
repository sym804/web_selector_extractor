# Selector Extractor 릴리즈 노트

## 버전 현황
- Frontend: 1.1.0.2

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
