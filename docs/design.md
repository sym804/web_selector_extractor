# Selector Extractor - Chrome Extension Design

## Overview
QA 자동화용 웹 엘리먼트 셀렉터를 빠르게 추출하는 크롬 확장 프로그램.

## Core Features
1. **셀렉터 추출**: 엘리먼트 클릭 시 다양한 형식의 셀렉터 생성
2. **말풍선 UI**: 클릭한 엘리먼트 옆에 셀렉터 목록 팝업
3. **사이드 패널**: 히스토리 누적, 검색, 내보내기
4. **코드 생성**: Playwright 테스트 코드 스니펫 자동 생성
5. **내보내기**: JSON/CSV 형식 지원

## Selector Priority
id > data-testid > unique class > css > xpath > role > text

## Output Formats
- CSS Selector
- XPath
- Playwright locator (`page.locator(...)`, `page.get_by_role(...)`)

## Architecture
- Manifest V3 + Vanilla JS
- content.js → selector-engine.js → background.js → sidepanel.js
