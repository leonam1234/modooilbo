---
title: 온리오피스 구버전 취약점 KEV 신규 등재…JWT 사용 서버도 점검
slug: onlyoffice-kev-jwt-legacy-documentserver-2026
category: industry
author: 유승현 / 사회부 기자
publishedAt: 2026-10-10 09:29
reporting: desk
sourceBasis: primary
visualType: ai-illustration
aiRole: research-assist, draft-assist, copyedit, image
judgment: high
verificationNote: CISA 현행 KEV 화면·JSON의 CVE-2021-3199 항목, NVD 공개 API, 공급자 고정 리비전 변경기록의 5.6.3 수정 항목, BOD 26-04 적용범위를 10월 10일 KST 대조했다. 인증 우회·침투 시험은 하지 않았다.
addedValue: 문서 협업 시스템 운영자가 JWT 사용 여부만으로 안전을 판단하지 않고 실제 Document Server 버전·공급자 수정·침해 대응 기록을 확인하도록 안내한다. 미국 연방기관 기한을 국내 공통 법정 마감으로 오인하지 않도록 범위를 구분한다.
reviewedBy: 모두일보 독립 리뷰 담당
reviewedAt: 2026-10-10 09:15
reporterInsight: CISA 현행 JSON의 등재일·10월 11일 기한·포렌식 항목, NVD의 JWT 사용 5.6.3 이전 범위와 공급자 수정기록을 확인했습니다. 미국 민간 연방기관 지침을 국내 공통 법정 마감으로 확대하지 않았습니다.
readerChecklist: 협업 서비스 이름과 별도로 실제 ONLYOFFICE Document Server 설치 버전과 운영 주체를 확인하세요. | 공급자 변경기록과 현재 지원 릴리스를 대조해 적용할 업데이트 경로를 정하세요. | 인증 설정을 약화하지 말고 운영 로그 보존과 침해 의심 징후 점검을 함께 진행하세요. | 외부 서비스라면 제공자의 조치 내역을 확인하고 자체 운영 서버와 구분해 기록하세요.
tags: [온리오피스, ONLYOFFICE, DocumentServer, CVE-2021-3199, KEV, CISA, 문서협업보안, JWT, 취약점관리, 보안업데이트]
summary: CISA는 10월 8일 ONLYOFFICE Docs의 CVE-2021-3199를 실제 악용 취약점 목록에 추가했다. NVD는 JWT를 사용하는 Document Server 5.6.3 이전 버전을 설명한다. 과거 수정 버전만을 현재의 안전 보증으로 읽지 말고 운영 버전과 최신 지원 경로를 확인해야 한다.
image: /stock/2026-10-10-onlyoffice-kev-jwt-legacy-documentserver-2026.jpg
imageCaption: AI 생성 이미지. 실제 사진이 아닙니다.
---

JWT 인증을 쓰는 문서 협업 서버라도 구버전 취약점 점검을 생략할 수는 없다. 미국 사이버보안·인프라보안국 CISA는 10월 8일 ONLYOFFICE Docs의 CVE-2021-3199를 실제 악용이 확인된 취약점 목록인 KEV에 추가했다. 오래된 취약점이지만 새로 악용 목록에 올랐다는 점에서, 해당 문서서버를 운영하는 기업은 설치 버전과 조치 기록을 확인할 필요가 있다.

## 인증 기능과 서버 버전을 함께 확인

미국 국립표준기술연구소의 NVD 기록은 JWT를 사용하는 ONLYOFFICE Document Server 5.6.3 이전 버전에서 발생할 수 있는 경로 탐색 취약점을 설명한다. 원격 코드 실행으로 이어질 수 있다는 내용도 포함돼 있다. CISA의 현재 항목 역시 JWT 사용 조건과 원격 코드 실행 가능성을 제시한다.

따라서 JWT를 켰다는 사실만으로 이번 취약점의 영향에서 벗어났다고 판단할 수 없다. 반대로 이 경고가 JWT를 끄라는 뜻도 아니다. 인증 설정을 약화하는 대신 실제 설치된 문서서버의 버전과 공급자 수정 사항을 대조해야 한다. 협업 서비스의 표시 이름이나 화면 디자인만으로 내부 문서서버 버전을 확정하기도 어렵다.

## 과거 수정 버전은 최신 안전 보증이 아니다

공급자의 변경기록에는 5.6.3 버전의 백엔드 수정으로 이미지 업로드 매개변수를 통한 경로 탐색 취약점을 고쳤다는 항목이 있다. NVD의 영향 범위도 5.6.3 이전 버전으로 표시돼 있어 이번 취약점의 과거 수정 지점을 확인할 수 있다.

그렇다고 지금 5.6.3만 설치하면 다른 취약점까지 모두 해결된다는 의미는 아니다. 운영자는 현재 지원되는 릴리스와 이후 보안 수정, 자신이 사용하는 배포 방식의 업데이트 경로를 별도로 확인해야 한다. 외부 협업 서비스를 이용한다면 자체 설치 서버의 조치와 서비스 제공자의 조치를 구분해 확인할 필요가 있다.

## 목록의 기한과 국내 운영 일정을 구분

10월 10일 KST 확인한 KEV 항목에는 조치기한이 2026년 10월 11일로 표시돼 있다. 이 항목이 연결하는 BOD 26-04의 적용 대상은 미국 민간 연방행정부 기관의 연방정보시스템이다. CISA는 해당 지침에서 계약상 별도 적용이 정해진 경우를 제외하면 계약업체에 직접 적용되지 않는다고 설명한다.

이를 국내 모든 기업에 공통으로 적용되는 법정 업데이트 마감으로 받아들일 사안은 아니다. 다만 실제 악용 목록에 포함됐다는 사실은 해당 버전이 남아 있는지 확인하고 조치 우선순위를 판단할 때 고려할 정보다.

## 업데이트 기록과 침해 점검을 분리해 남겨야

CISA는 공급자 지침에 따른 완화 조치를 적용하고, 완화가 불가능하면 제품 사용을 중단하도록 안내한다. 해당 KEV 항목은 연방 지침에 따른 포렌식 분류 점검 항목도 표시하고 있다. 국내 운영자는 자신의 환경과 대응 절차에 맞춰 조치 여부를 판단해야 한다.

운영 기록에는 확인한 제품·버전, 적용한 수정, 완료 시점, 남은 점검을 구분해 남기는 것이 유용하다. 보안 업데이트 설치와 이미 침해가 있었는지 살피는 작업은 같지 않다. 의심 징후가 있으면 로그를 보존하고 담당 보안팀의 사고 대응 절차로 연결해야 한다. 목록 등재만으로 모든 사용자 서버가 침해됐다고 단정할 수는 없다.

## 출처 메모
- 미국 CISA: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- 미국 CISA: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
- 미국 NIST NVD: https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2021-3199
- ONLYOFFICE: https://raw.githubusercontent.com/ONLYOFFICE/DocumentServer/903fe5ab7a275bd69c3c3346af2d21cf87ebeabf/CHANGELOG.md
- 미국 CISA: https://www.cisa.gov/news-events/directives/bod-26-04-prioritizing-security-updates-based-risk
