---
title: 아틀라시안 파일접근 취약점 CISA 목록 추가…자체운영 제품 패치 확인
slug: atlassian-file-access-kev-oct16-2026
category: industry
author: 서영호 / 공공입찰 전담기자
publishedAt: 2026-10-16 09:21
reporting: desk
sourceBasis: primary
visualType: ai-illustration
aiRole: research-assist, draft-assist, copyedit, image
judgment: high
verificationNote: CISA 전체 KEV 피드의 10월15일 신규 항목과 Atlassian 공급사 권고의 제품·수정 버전·Cloud 구분·임시 완화책을 직접 대조했다. KEV 등재와 공급사의 Cloud 악용 미발견 설명을 서로 확대 귀속하지 않았다.
addedValue: 자체운영과 Cloud를 분리하고 운영·유지보수 담당자가 제품별 수정 버전, 외부 접근, 임시 조치와 패치 완료 여부를 따로 확인하도록 정리했다.
reviewedBy: 모두일보 독립 리뷰 담당
reviewedAt: 2026-10-16 09:07
reporterInsight: CISA 원피드와 공급사 권고를 대조해 등재일·제품별 수정 버전·파일접근 조건을 확인했습니다. Cloud에 대한 패치 완료와 악용 증거 미발견 설명을 자체운영 전체로 확대하지 않았습니다. 유지보수 담당자는 제품·버전 계열과 모든 인스턴스를 확인하고 임시 차단과 패치를 구분해야 합니다.
readerChecklist: Data Center 등 자체운영 제품인지 Cloud인지 확인 | 설치 제품과 버전 계열별 수정 버전 대조 | 외부 네트워크 접근과 임시 완화 적용 범위 확인 | 모든 대상 인스턴스의 패치 완료 여부 확인
tags: 아틀라시안, Atlassian, CVE-2026-21589, CISA KEV, Jira Data Center, Confluence Data Center, 보안 업데이트, 자체운영 서버, 취약점 관리, 유지보수
summary: CISA가 10월15일 아틀라시안 여러 제품의 파일접근 취약점 CVE-2026-21589를 KEV 목록에 추가했다. 자체운영 제품 관리자는 공급사 수정 버전과 임시 조치를 대조해야 하며 Cloud 고객 대상 설명과 구분해야 한다.
image: /stock/2026-10-16-atlassian-file-access-kev-oct16-2026.jpg
imageCaption: AI 생성 이미지. 실제 사진이 아닙니다.
---

지라·컨플루언스 등을 자체 서버에서 운영하는 조직은 파일접근 취약점 CVE-2026-21589의 패치 상태를 다시 확인할 필요가 있다. 미국 사이버보안·인프라보안국(CISA)은 15일 이 취약점을 실제 악용이 알려진 취약점 목록인 KEV에 추가했다. 한국시간 16일 새벽 확인한 피드에 신규 등재 사실이 반영돼 있다.

## 같은 제품명이라도 운영 방식부터 구분

공급사 아틀라시안의 권고 대상은 Bitbucket·Confluence·Jira Service Management·Jira Software·Bamboo·Crowd의 Data Center 제품과 Crucible, Fisheye다. 취약한 버전에서는 인증되지 않은 공격자가 웹 애플리케이션 루트 안의 특정 파일에 접근할 수 있다는 설명이다.

다만 공격에는 대상 파일의 정확한 이름과 경로를 미리 알아야 한다는 조건이 붙는다. 공급사는 디렉터리 내용을 열거하는 취약점은 아니라고 설명한다. 이를 서버의 모든 파일을 무조건 가져갈 수 있다는 의미로 확대하면 안 된다. 설정에 따라 민감한 파일이 존재할 수 있다는 점은 별도로 살펴야 한다.

Cloud에 대해서는 영향을 받는 제품의 패치를 마쳤으며 고객이 할 조치가 없다는 공급사 안내가 있다. 공급사가 Cloud 조사에서 악용 증거를 찾지 못했다는 설명을 자체운영 제품 전체의 악용 부재로 옮겨 읽어서도 안 된다. CISA 등재와 Cloud 설명은 적용 범위가 다르다.

## 최신이라는 말보다 수정 버전 대조

공급사는 각 설치본을 수정 버전 또는 최신 버전으로 패치하도록 권고한다. 예를 들어 Confluence Data Center 수정 버전은 9.2.26과 10.2.19이며 Jira Software Data Center는 9.12.40, 10.3.26, 11.3.12가 제시돼 있다. 제품과 사용 중인 버전 계열을 짝지어 비교해야 하며, 이 숫자를 다른 제품의 공통 기준으로 적용해서는 안 된다.

운영·유지보수를 외부 업체에 맡긴 조직도 업데이트했다는 답변만 받기보다 대상 제품, 변경 전후 버전, 누락된 인스턴스가 없는지를 확인하는 편이 낫다. 클러스터 환경이라면 일부 노드만 처리한 상태와 전체 조치를 구분해야 한다.

## 임시 차단은 패치 완료와 별개

즉시 패치하기 어렵다면 공급사는 가능한 경우 인터넷에서 인스턴스를 분리하고, 웹방화벽·프록시 규칙 등 제시된 완화책을 적용하도록 안내한다. 사용자 인증이 있는 외부 공개 인스턴스도 접근 제한 검토 대상이다. 인증 화면이 있다는 이유만으로 안전하다고 볼 수 없다는 뜻이다.

규칙 적용은 조직의 프록시와 제품 구성에 따라 달라지므로 임의의 공통 설정을 복사해 끝낼 사안이 아니다. 담당자는 공급사 원문의 제품별 절차와 백업·시험 조건을 확인하고 임시 완화와 버전 패치를 각각 기록해야 한다. KEV 추가는 점검 우선순위를 높일 근거이지만 개별 조직이 이미 침해됐다는 증거는 아니다.

## 출처 메모
- CISA: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
- Atlassian: https://confluence.atlassian.com/security/cve-2026-21589-arbitrary-file-access-vulnerability-impacts-multiple-products-1870495748.html
