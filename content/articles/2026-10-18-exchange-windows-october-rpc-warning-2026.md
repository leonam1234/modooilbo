---
title: Exchange 메일 지연, 10월 윈도 서버 업데이트 영향…보안 패치 삭제는 비권고
slug: exchange-windows-october-rpc-warning-2026
category: industry
author: 서영호 / 공공입찰 전담기자
publishedAt: 2026-10-18 13:15
reporting: desk
sourceBasis: primary
visualType: ai-illustration
aiRole: research-assist, draft-assist, copyedit, image
judgment: high
verificationNote: Microsoft Exchange 팀의 10월 16일 장애 대응 공지와 보안 업데이트 공지에서 원인 패치·영향 범위·삭제 비권고를 구분했다.
addedValue: Exchange 자체 보안 업데이트와 운영체제 업데이트를 구별하고 버전별 KB 대조 및 재시작 후 재발 관찰을 대응 기준으로 제시했다.
reviewedBy: 모두일보 독립 리뷰 담당
reviewedAt: 2026-10-18 13:03
reporterInsight: 운영체제 업데이트와 Exchange 자체 보안 업데이트를 같은 원인으로 보면 대응을 잘못 선택할 수 있습니다. 서버 버전과 KB를 대조하고 공식 RPC 대응 지침을 검토하되, 재시작 뒤 잠깐 정상화된 상태를 영구 해결로 판단하지 않는 것이 중요합니다.
readerChecklist: 윈도 서버 버전과 설치된 KB 번호 대조하기 | 메일 대기열·OWA·DAG 증상을 함께 점검하기 | 공식 RPC 대응 지침 검토 뒤 재시작·재발 관찰하기
tags: [Exchange, 윈도서버, 메일서버, OWA, 메일지연, RPC, 보안업데이트, 서버운영, 장애대응, Microsoft]
summary: Microsoft가 일부 Exchange 서버의 메일 지연·OWA 접속 실패를 10월 윈도 서버 업데이트 영향으로 안내했다. Exchange 자체 보안 업데이트 설치와는 별개이며 윈도 서버 보안 업데이트 삭제 대신 공식 RPC 설정 대응과 재시작 후 관찰을 권고했다.
image: /stock/2026-10-18-exchange-windows-october-rpc-warning-2026.jpg
imageCaption: AI 생성 이미지. 실제 사진이 아닙니다.
---

10월 윈도 서버 업데이트 뒤 사내 메일이 밀리거나 웹메일 접속이 실패한다면 Exchange 자체 보안 업데이트만 의심해서는 안 된다. Microsoft Exchange 팀은 16일 공지에서 일부 서버의 불안정 현상을 운영체제 업데이트와 연결해 설명했다. 해당 문제 때문에 10월 윈도 서버 업데이트를 제거하지 말라는 것이 공식 권고다.

## 설치 내역은 서버 버전과 KB를 짝지어 대조

공지가 열거한 업데이트는 Windows Server 2025의 KB5126646, Server 2022의 KB5126655, Server 2019의 KB5126651, Server 2016의 KB5126868이다. 이 운영체제에서 실행되는 Exchange Server 2016·2019·Subscription Edition이 영향을 받을 수 있다.

증상은 OWA 접속 실패, 메일 대기열 증가와 전송 정체, DAG 구성원의 정족수 확보 문제 등으로 제시됐다. 재부팅 뒤 잠시 정상으로 보이는 경우도 보고됐다. 모든 서버가 같은 속도와 강도로 영향을 받는 것은 아니며 부하에 따라 차이가 있고 문제가 나타나지 않는 서버도 있을 수 있다.

따라서 재시작 한 번으로 정상화됐다는 이유만으로 원인이 해소됐다고 판단하기는 어렵다. 설치된 운영체제 패치와 시간대별 대기열, 웹메일 접속 상태, 고가용성 구성의 징후를 함께 살피는 편이 원인 범위를 좁히는 데 도움이 된다.

## Exchange 보안 업데이트와 혼동하지 말아야

Exchange 팀은 이번 장애 보고가 10월 Exchange 보안 업데이트 설치에 따른 문제는 아니라고 명시했다. Exchange 업데이트를 설치하지 않아도 영향을 받는 윈도 버전에서 실행 중이라면 문제가 생길 수 있다는 설명이다.

별도의 10월 Exchange 보안 업데이트 공지에도 16일 관련 경고 링크가 추가됐다. 보안 업데이트 공지와 운영체제 장애 대응 공지가 연결됐다는 이유로 두 패치를 같은 원인으로 취급하거나 모두 되돌리는 판단은 피해야 한다.

## RPC 대응 뒤에도 재발 여부를 관찰

Microsoft는 윈도 서버 업데이트를 삭제하는 대신 공식 지침에 따라 RPC 설정의 EpmapSavedContextCap 한도를 조정하고 서버를 재시작한 뒤 환경을 관찰하도록 안내했다. 재발하면 한도를 더 높이는 절차도 설명했다. 관리자 권한과 운영 변경을 수반하는 만큼 담당자는 해당 서버에 맞는 원문 지침을 검토하고 적용해야 한다.

이 안내는 확인 당시 보고된 사례에 대한 대응이지 모든 환경의 영구 해결을 선언한 것은 아니다. 부하가 낮을 때의 정상 응답만 보지 말고 재시작 뒤 실제 업무 시간의 메일 처리와 접속 상태를 계속 대조해야 한다. 후속 해결 업데이트나 권고 변경 여부도 함께 확인할 필요가 있다.

## 출처 메모
- Microsoft Exchange 팀: https://techcommunity.microsoft.com/blog/exchange/exchange-servers-may-become-unstable-after-installation-of-october-2026-windows-/4565382
- Microsoft Exchange 팀: https://techcommunity.microsoft.com/blog/exchange/released-october-2026-exchange-server-security-updates/4563014
