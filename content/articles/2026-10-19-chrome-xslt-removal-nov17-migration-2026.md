---
title: 크롬 XSLT 11월 17일 제거 계획…XML 자체 지원 종료는 아냐
slug: chrome-xslt-removal-nov17-migration-2026
category: industry
author: 남동균 / 문화·스포츠부 기자
publishedAt: 2026-10-19 08:37
reporting: desk
sourceBasis: primary
visualType: ai-illustration
aiRole: research-assist, draft-assist, copyedit, image
judgment: high
verificationNote: Google의 현재 XSLT 제거 로드맵과 제거 대상·대체 방식을 확인했다. 날짜는 공식 계획이며 개별 장치 배포·사이트별 예외 적용이나 실제 전환 호환성은 확인하지 않았다.
addedValue: XML 파일 자체와 브라우저 내 변환 기능을 구분하고 기본 종료일·예외 종료일·실제 업무화면 테스트 대상을 분리했다.
reviewedBy: 모두일보 독립 리뷰 담당
reviewedAt: 2026-10-19 08:25
reporterInsight: 브라우저의 XSLT 변환 기능과 XML 자체의 지원을 구분해 공식 제거 계획을 확인했습니다. 일반 이용자와 예외 참여자의 종료 일정도 다릅니다. 예외가 자동 적용된다고 전제하지 말고 실제 의존성을 조사한 뒤 대체 방식의 화면·데이터 호환성을 별도로 시험해야 합니다.
readerChecklist: 업무 화면의 XSLTProcessor와 XSL 스타일시트 의존성 조사하기 | 서버 변환·대체 라이브러리의 실제 출력과 호환성 비교하기 | 예외 참여 여부와 종료 일정 확인 후 전환 책임자 정하기
tags: Google, Chrome, XSLT, XML, 브라우저, 레거시시스템, 웹호환성, 기업정책, OriginTrial, 시스템전환
summary: Google의 현재 계획상 Chrome 158은 11월 17일부터 일반 Stable 이용자의 XSLT 기능을 제거한다. XML 자체나 XML에 CSS를 적용하는 방식은 제거 대상이 아니며 Origin Trial·기업 정책 예외도 영구적이지 않다.
image: /stock/2026-10-19-chrome-xslt-removal-nov17-migration-2026.jpg
imageCaption: AI 생성 이미지. 실제 사진이 아닙니다.
---

XML 문서를 업무 화면으로 바꾸는 오래된 웹 시스템은 브라우저 의존성을 점검할 시점이다. Google의 현재 로드맵은 Chrome 158의 XSLT 지원을 11월 17일 Stable부터 제거하도록 제시한다. 예외에 참여하지 않는 이용자가 대상이며, 모든 기업의 모든 XML 화면이 그날 동시에 멈춘다는 뜻은 아니다.

## 파일 형식보다 변환 위치를 살펴야

제거 대상은 브라우저의 XSLT 변환 기능이다. 자바스크립트의 XSLTProcessor와 XSL 스타일시트를 지정하는 처리 지시문이 포함된다. XML 데이터를 보유하고 있다는 사실만으로 영향 여부를 판단할 수 없다.

Google은 XML 자체를 브라우저에서 없애려는 것이 아니라고 명확히 구분한다. XML에 CSS를 적용하는 방식도 유지 대상이다. 담당자는 파일 확장자 목록보다 실제 화면이 어디에서 어떤 방식으로 변환되는지를 조사해야 한다.

## 전환 유예와 영구 지원은 다르다

현재 계획은 Origin Trial과 기업 정책 참여자에게 일반 종료 이후의 예외를 둔다. 그러나 Chrome 176이 예정된 2027년 8월 17일에는 이 예외도 종료하는 일정이다. 예외가 존재한다는 안내만으로 자사 사이트나 관리 장치가 자동 포함된다고 볼 수는 없다.

일반 브라우저의 배포 일정과 회사의 업데이트 정책도 구분해야 한다. 지금 화면이 열린다는 사실은 이후 버전에서의 호환성까지 보장하지 않는다.

## 대체 방식은 실제 출력으로 비교

공식 문서는 서버에서 변환해 HTML을 보내거나 JSON 기반 화면으로 전환하는 방안, 자바스크립트 XSLT 라이브러리와 폴리필 등을 소개한다. 모든 시스템에 맞는 단일 대체 경로는 없다고 설명한다.

공통적으로 필요한 작업은 기존 의존성을 찾아 대체 경로에서 같은 업무 화면과 데이터가 유지되는지 비교하는 것이다. 예외 사용 여부, 전환 담당자, 테스트 범위를 먼저 정해야 한다. 이 계획만으로 특정 사이트의 전환 성공이나 개별 라이브러리의 완전한 호환성을 단정할 수는 없다.

## 출처 메모
- Google: https://developer.chrome.com/docs/web-platform/deprecating-xslt
