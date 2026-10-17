---
title: Cisco 메일 보안장비 취약점 악용…파일 평판·검사도구 조건 함께 확인
slug: cisco-email-gateway-file-reputation-fix-2026
category: industry
author: 남동균 / 문화·스포츠부 기자
publishedAt: 2026-10-17 10:42
reporting: desk
verificationNote: KISA와 Cisco의 현재 공식 HTML을 HTTP 200으로 보존하고 파일 평판·검사도구 조건, 해결 버전, 실제 악용과 로그 대조 권고를 확인했다. 실제 장비나 브라우저 렌더링은 확인하지 않았다.
addedValue: 장비 운영체제와 별도 검사도구 업데이트를 구분하고 기능 활성화 조건 및 장비 외부 로그 대조 필요성을 정리했다.
reviewedBy: 모두일보 독립 리뷰 담당
reviewedAt: 2026-10-17 10:28
reporterInsight: 제품 보유만으로 영향 여부를 결정할 수 없습니다. 파일 평판 기능의 활성화·메일정책 할당과 Content Scanner Tools 버전을 함께 봐야 합니다. 도구 업데이트는 재부팅 없이 가능하지만, 침해 흔적을 숨길 수 있으므로 장비 밖 로그와의 교차 확인도 별도 조치입니다.
readerChecklist: 파일 평판 서비스의 메일 정책 연결, Content Scanner Tools 버전, AsyncOS 해결 분기, 업데이트 적용 여부, 외부 네트워크 로그
sourceBasis: primary
visualType: ai-illustration
aiRole: research-assist, draft-assist, copyedit, image
judgment: high
tags: Cisco, SecureEmailGateway, AsyncOS, 메일보안, 파일평판, ContentScannerTools, CVE202676519, 보안업데이트, KISA, 침해사고대응
summary: Cisco Secure Email Gateway 취약점 CVE-2026-76519의 실제 악용이 보고됐다. 파일 평판 서비스가 메일 정책에 연결되고 검사도구가 영향 버전인 환경이 대상이며, 제조사는 수정된 소프트웨어와 검사도구 업데이트 경로를 안내했다.
image: /stock/2026-10-17-cisco-email-gateway-file-reputation-fix-2026.jpg
imageCaption: AI 생성 이미지. 실제 사진이 아닙니다.
---

Cisco Secure Email Gateway 운영자는 AsyncOS 버전뿐 아니라 파일 평판 기능과 별도 검사도구의 상태를 함께 확인해야 한다. 한국인터넷진흥원은 CVE-2026-76519 취약점이 실제 공격에 악용되고 있다며 업데이트를 권고했다. Cisco도 10월 중 실제 악용을 인지했다고 밝혔다.

## 파일 평판 기능과 검사도구가 노출 조건

Cisco에 따르면 영향을 받는 AsyncOS를 실행하는 물리·가상 장비에서 두 조건이 함께 충족될 때 문제가 된다. AMP의 파일 평판 서비스가 활성화돼 메일 정책에 할당돼 있고, Content Scanner Tools 버전이 25.3.0.5525 미만인 경우다.

취약점은 메일 첨부파일을 처리하는 과정과 관련된다. 인증되지 않은 원격 공격자가 조작한 첨부파일을 포함한 메일을 장비에 통과시켜 임의 파일을 쓰거나 높은 권한의 명령 실행으로 이어질 수 있다는 것이 제조사 설명이다. Secure Email and Web Manager와 Secure Web Appliance는 이번 취약점의 비영향 제품으로 분류했다.

## 운영체제와 별도 검사도구의 수정 경로

AsyncOS 15.5 계열의 첫 해결 버전은 15.5.5-014, 16.5 계열은 16.5.0-780이다. 16.0 계열은 해결된 릴리스로 이전해야 한다. Cisco는 16.5 이전 릴리스 운영자에게 16.5.0-780으로의 이전을 강하게 권고한다.

제조사는 별도 Content Scanner Tools 패키지에도 수정 사항을 배포했다고 밝혔다. 25.3.0.5525 이상에는 수정이 포함되며 도구 업데이트에는 운영체제 업그레이드나 장비 재시작이 필요하지 않다. 자동 업데이트를 사용하는 경우에도 실제 적용 여부를 확인하고, 비활성화한 운영자는 수동 업데이트 경로를 살펴야 한다. 알려진 우회 해결책은 없다는 안내와 수정 패키지 배포를 혼동해서는 안 된다.

## 장비 로그만으로 안심하지 말아야

Cisco는 공격자가 높은 권한을 얻으면 침해 흔적을 지우거나 숨길 수 있다고 경고한다. 장비 내부 기록만이 아니라 영향 장비 외부의 네트워크·방화벽 로그를 교차 대조하라는 권고다. 의심스러운 외부 전송이나 다운로드 같은 활동도 확인 대상이다.

따라서 버전 확인, 수정 적용, 침해 징후 점검은 분리해서 진행해야 한다. 패치를 설치했다는 사실만으로 과거 침해 여부까지 판정할 수는 없다. 침해가 의심되는 물리 장비는 제조사 기술지원의 추가 안내를 받도록 권고돼 있다.

## 출처 메모
- 한국인터넷진흥원 보호나라: https://www.krcert.or.kr/kr/bbs/view.do?bbsId=B0000133&menuNo=205020&nttId=72217
- Cisco: https://sec.cloudapps.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-esa-afw-zqYJkjxp
