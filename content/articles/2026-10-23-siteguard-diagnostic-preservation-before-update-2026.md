---
title: SiteGuard Server Edition 보안 업데이트 전 진단정보 보존…통계기능·제품판부터 확인
slug: siteguard-diagnostic-preservation-before-update-2026
category: industry
author: 서영호 / 공공입찰 전담기자
publishedAt: 2026-10-23 10:10
reporting: desk
sourceBasis: primary
visualType: ai-illustration
aiRole: research-assist, draft-assist, copyedit, image
judgment: high
source: EG Secure Solutions 보안 공지, JVN 취약점 공지 및 CISA KEV 공식 데이터
verificationNote: 공급사와 JVN의 영향 제품판·통계기능·IIS 예외·수정 버전을 대조하고 CISA 공식 KEV의 해당 CVE 행을 확인했다. 미국 기관 조치일을 국내 기업 공통 의무기한으로 옮기지 않았고 실제 설치환경의 감염이나 패치 완료를 주장하지 않았다.
addedValue: 업데이트 전 진단정보 보존을 먼저 설명하고, 제품판·운영체제별 수정 버전과 통계기능의 조건을 분리해 일괄 패치 지시의 오류를 줄였다.
reviewedBy: 모두일보 독립 리뷰 담당
reviewedAt: 2026-10-23 09:33
reporterInsight: 대응 대상은 제품판·운영체제·버전 경계와 통계기능 활성 여부를 함께 봐야 합니다. 공급사가 안내한 진단정보 보존을 패치 전에 수행하고, IIS 예외와 FreeBSD 수정판을 구분해야 합니다. 미국 KEV의 조치일을 국내 모든 기업의 동일한 법적 기한으로 해석해서는 안 됩니다.
readerChecklist: SiteGuard Server Edition의 제품판·버전·통계기능 사용 여부를 확인한다 | 업데이트나 패치 전에 진단정보를 내려받아 안전하게 보관한다 | FreeBSD와 그 외 제품판의 수정 버전·공급사 지침을 구분한다
tags: SiteGuard, 서버보안, 웹방화벽, 취약점대응, 진단정보, 증거보존, CISA, JVN, 보안업데이트, CVE2026106931
summary: SiteGuard Server Edition의 통계기능 취약점은 실제 악용이 확인됐다. 공급사는 업데이트나 패치로 공격 흔적이 사라질 수 있어 적용 전에 진단정보를 보관하도록 안내하며, 제품판과 운영체제별 수정 버전을 구분해야 한다.
image: /stock/2026-10-23-siteguard-diagnostic-preservation-before-update-2026.jpg
imageCaption: AI 생성 이미지. 실제 사진이 아닙니다.
---

SiteGuard Server Edition을 운영하는 기업은 보안 업데이트를 하기 전에 진단정보부터 보존할 필요가 있다. 공급사 EG Secure Solutions는 통계기능의 운영체제 명령어 삽입 취약점인 CVE-2026-106931의 악용이 확인됐으며, 업데이트나 패치 적용으로 공격 흔적이 사라질 수 있다고 안내한다.

공급사가 제시한 대응 순서는 영향 여부를 확인하고, 웹 관리화면의 진단정보를 내려받아 보관한 뒤 업데이트 또는 패치를 적용하는 것이다. 단순히 최신판으로 바꾸는 작업만 끝내면 사고 조사에 필요한 자료가 남지 않을 수 있다는 점이 이번 대응에서 중요하다.

## 제품 이름뿐 아니라 통계기능까지 확인

영향 제품은 서버에 설치해 사용하는 호스트형 웹방화벽 SiteGuard Server Edition이다. 공급사와 일본 취약점정보 서비스 JVN에 따르면, 영향 대상은 이 제품 중 Ver2.20 이상이면서 통계기능이 활성화된 다음 수정 전 버전이다. FreeBSD를 제외한 Apache·Nginx·IIS판은 Ver8.00 Update5 미만, FreeBSD의 Apache·Nginx판은 Ver7.00 Update6 미만이다. 다만 IIS판의 Ver3.10부터 Ver4.00 Update4까지는 양끝 버전을 포함해 이번 취약점의 영향을 받지 않는다. 통계기능의 기본값은 활성화이지만 개별 서버의 실제 설정은 별도로 확인해야 한다.

제품명을 공유한다는 이유만으로 다른 제품판이나 클라우드형 서비스까지 모두 같은 영향 범위라고 확대해서는 안 된다.

공급사는 영향을 받는 서버에서 root 또는 SYSTEM 권한으로 임의의 운영체제 명령이 실행될 가능성을 설명한다. 다만 실제 악용이 확인됐다는 사실이 모든 설치 서버의 침해를 뜻하는 것은 아니다. 각 운영자는 자신의 설치 버전과 설정, 남아 있는 진단자료를 바탕으로 영향과 침해 여부를 나누어 판단해야 한다.

## FreeBSD와 그 외 수정 버전이 다르다

공급사 공지에서 Apache·Nginx·IIS판의 수정 버전은 FreeBSD를 제외하고 Ver8.00 Update5다. FreeBSD의 Apache·Nginx판은 Ver7.00 Update6으로 구분한다. 제품판과 운영체제를 확인하지 않고 한 가지 버전 번호만 전달하면 대응 대상과 적용 파일을 잘못 선택할 수 있다.

버전 업그레이드가 어려운 이용자를 위해서는 통계 처리 대상 파일을 바꾸는 패치도 제공한다고 안내한다. 공급사는 지원 종료 버전도 패치 제공 대상에 포함한다고 설명하지만, 이것을 제품 전체의 일반 지원이 재개됐다는 뜻으로 받아들여서는 안 된다. 실제 적용 파일과 절차는 공급사 지침을 따라야 한다.

이 기사에서는 취약점의 악용 방법이나 시험 명령을 제공하지 않는다. 기업의 대응 목적은 공격 재현이 아니라 대상 식별과 자료 보존, 필요한 보안 조치의 적용이다. 운영 중인 서버에 변경을 가하기 전에는 정상적인 관리 절차와 복구 준비도 함께 확인해야 한다.

## 미국 조치일을 국내 공통 마감으로 옮기지 않아야

미국 사이버보안·인프라보안국의 알려진 악용 취약점 목록인 KEV에는 이 취약점이 10월 20일 추가됐고, 해당 행에는 조치일이 10월 23일로 기재돼 있다. 이는 미국 기관의 지침 체계에서 다루는 항목이며, 국내 모든 기업에 같은 날짜의 법적 조치 의무가 생겼다는 뜻은 아니다.

KEV 등재는 이미 악용이 확인된 취약점을 관리 우선순위에 반영할 근거로 볼 수 있다. 기업은 자신이 사용하는 제품과 버전이 해당하는지 먼저 확인하고, 공급사의 진단정보 보존 안내를 빠뜨리지 않은 채 업데이트 계획을 세워야 한다.

진단정보에는 운영환경과 조사에 필요한 자료가 들어갈 수 있다. 내려받은 파일을 공개 게시판이나 불특정 다수에게 공유하기보다 조직의 사고 대응 절차에 따라 관리하는 것이 좋다. 보안 조치 뒤에도 적용 버전과 서비스 상태를 확인하고, 보존한 자료를 바탕으로 필요한 후속 점검을 이어가야 한다.

## 출처 메모
- EG Secure Solutions: https://www.eg-secure.co.jp/siteguard/news/alert-202610-1
- JPCERT/CC·IPA: https://jvn.jp/jp/JVN88474777/
- CISA: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
