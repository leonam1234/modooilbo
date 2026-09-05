# 09 · 발행·검증 시스템 (Publishing & Verification)

> 편집 품질 우선 발행 체제의 정본 문서. 기존 24편은 생산능력 상한이며 일일 할당량이 아니다.
> 코드 게이트(강제)는 `scripts/build-content.mjs`, 운영 파이프라인은 이 문서가 기준이다. 어긋나면 코드가 우선.
> 2026-09-05 최신 지시: 기사별 독립 리뷰 PASS와 동적·최종 게이트 PASS가 확정되고
> `reviewedBy`·`reviewedAt`·`reporterInsight`가 완성되는 즉시 상시 자동 승인으로
> CMS·Git·빌드·Preview·Production·라이브 검증까지 진행한다. HOLD·`WAIT_SOURCE_UNTIL`·
> 엠바고·미래 `publishedAt`·기사별 검증·빌드·Preview 실패는 해당 기사만 제외하며 이미 READY인
> PASS 기사를 막지 않는다. 조건부 PASS는 동적 재확인 뒤 PASS 승격 시 자동 배포하고,
> 사용자의 현재 중지·보류 지시가 항상 우선한다.

## 1. 일일 발행 파이프라인 (품질 통과분만 출고, 최대 24편)

```
원고·이미지 패키지
  → 08:50~08:59 패키지 snapshot·1차 정적 게이트
  → 09:00 동시 분기
      ├─ 독립 리뷰 담당: 6편 × 4개 기사 shard 병렬 검수
      └─ 개발 및 배포 담당: 6편 × 4개 동적 원출처 lane 병렬 재확인
  → 독립 리뷰 담당 1명이 slug별 증거·PASS/HOLD를 합산
  → 개발 및 배포 담당자 수정분 재검수·최종 게이트
  → slug별 READY 확정 즉시 상시 자동 배포 승인 적용
  → 현재 READY 기사만 CMS·게이트·빌드·Git 커밋·Preview 검증·Production·라이브 재검증
  → 신규 기사 canonical URL 전건을 색인 담당자에게 인계
```

- **일일 편성 12종**: 종합 6(economy·society·world·culture·sports·opinion — `tech`는 동결) + 사업 6(grants·bids·startup·industry·labor·deals). 카테고리별 2편은 상한이며, 취재 증거와 독자 가치가 없으면 비워 둔다.
- **패키지 자체 판정을 최종 결과로 쓰지 않는다** — PASS 원고에서도 독립 리뷰와 발행 직전 게이트가 오류를 잡은 전례가 다수다(전화 응대시간을 접수시각으로 오독, 조건절 누락으로 수치 2배 오독, 구원 등판 순서 뒤바뀜 등).
- **자동 배포 조건은 기사별로 판정한다.** 같은 slug의 독립 리뷰 PASS와 동적·최종 게이트 PASS,
  완성된 사람 검수 필드가 있으면 즉시 READY로 자동 배포한다. HOLD·`WAIT_SOURCE_UNTIL`·시간 제한·
  기사별 검증·빌드·Preview 실패는 해당 기사만 현재 회차에서 제외한다. 사용자의 현재 중지·보류
  지시는 상시 승인보다 우선한다.
- 독립 리뷰 창구는 `모두일보 독립 리뷰 담당` Codex 작업 ID `01a05a60-a035-7921-8154-7aa4a7024f31`이다. 기사별 `reviewedBy`·`reviewedAt`·`reporterInsight`, PASS/HOLD, 수정 요구를 회수한다.
- 라이브 검증 뒤 신규 기사 URL을 받는 창구는 `색인 담당자` Codex 작업 ID `019ef3e0-e684-7be0-a164-3cdfacfeb6fa`다. `handoff_sent`·엔진별 요청 접수·`indexed_current`를 같은 상태로 쓰지 않는다.
- **요약 도구 불신 원칙**: WebFetch류 요약이 "기성금 80%"라 한 것이 원문(EUC-KR)에선 "잔금 80%"였던 사례. 수치·시각·법적 효과는 반드시 원문 직접 확인·검산.
- 문자열 매칭은 문맥으로 검증: '취소' 27회 매칭이 전부 메뉴명("예매·취소 안내")이던 사례 — 매칭 수가 아니라 실제 공지 패턴을 본다.
- publishedAt은 출고 직전 시각으로 재배치하는 것이 관행. 허용 범위의 근거 문서 **`최종마감.md`는 리포 밖(총괄 보관)** 에 있다.

### 09:00 병렬 검수·동적 게이트 편성 (2026-09-03 시행)

| KST | 실행 | 완료 기준 |
|---|---|---|
| 08:50~08:59 | 패키지 원고·이미지·검수문서 동결, slug 목록과 파일 해시 snapshot | 이후 본문 변경은 새 해시로 재검수 대상 |
| 09:00 | 독립 리뷰 4개 shard와 동적 원출처 4개 lane을 **동시에 dispatch** | 한 묶음 완료를 기다리지 않고 전부 실행·대기열 등록 |
| 09:00~09:20 | 결과가 오는 즉시 slug별 판정표에 병합하고 수정 요청을 원 제작자에게 반환 | shard 단위가 아니라 기사 단위로 PASS/HOLD/WAIT_SOURCE 기록 |
| 09:20 | 첫 READY 기사 처리 목표 | 대기 마감시각이 아니다. 조건을 먼저 충족한 기사부터 즉시 처리 |
| 각 원출처 개시시각 | `WAIT_SOURCE_UNTIL` 기사만 별도 micro-lane으로 재실행 | 열린 화면을 실제 확인한 뒤 PASS/HOLD 확정 |
| 각 기사 READY 직후 | 별도 승인 질문 없이 CMS·빌드·Preview·Production·라이브 검증 | 해당 기사의 독립 리뷰·동적/최종 게이트 PASS·사람 검수 필드 완성 필수 |

24편 패키지의 카테고리별 두 기사는 패키지 `기사목록_24건.md`의 순서를 `-1`·`-2`로
고정한다. 목록에 순서가 없으면 slug 오름차순을 쓴다. 이 snapshot 뒤에는 shard 균형을 맞추려고
번호를 다시 매기지 않는다.

| 리뷰 shard | 6편 배정 | 균형 기준 |
|---|---|---|
| R-A | `economy-1` · `society-1` · `culture-1` · `opinion-1` · `bids-1` · `world-1` | 6명 기자별 1편 |
| R-B | `economy-2` · `society-2` · `culture-2` · `opinion-2` · `bids-2` · `world-2` | 6명 기자별 1편 |
| R-C | `deals-1` · `startup-1` · `sports-1` · `industry-1` · `grants-1` · `labor-1` | 6명 기자별 1편 |
| R-D | `deals-2` · `startup-2` · `sports-2` · `industry-2` · `grants-2` · `labor-2` | 6명 기자별 1편 |

네 하위 리뷰 작업은 원고를 수정하지 않고 `slug`, 확인한 원출처, 확인시각 KST, 핵심 대조값,
PASS/HOLD, 수정 요구만 반환한다. **독립 리뷰 담당 1명이 유일한 합산 책임자**다. 하위 작업의
묶음 결론을 그대로 복사하지 않고 기사별 근거를 읽은 뒤 `reviewedBy`·`reviewedAt`·
`reporterInsight`와 최종 PASS/HOLD를 정본 검수표에 기록한다. 같은 기사에 판단 충돌이 있으면
PASS로 다수결하지 않고 HOLD 또는 재검수로 보낸다.

| 동적 lane | 6편 배정 | 발행 직전 확인 초점 |
|---|---|---|
| D-A 공고·접수 | `bids` 2 · `grants` 2 · `startup` 2 | 차수·정정·취소·첨부·마감·실제 신청 상태 |
| D-B 시효·개시 | `labor` 2 · `culture` 2 · `society` 2 | 늦게 열리는 지원 화면·예매 회차·당일 공지·현재 상태 |
| D-C 공시·통계 | `deals` 2 · `economy` 2 · `world` 2 | DART 정정·철회, 통계 정정표·기준·원시값 |
| D-D 기록·정책 | `sports` 2 · `industry` 2 · `opinion` 2 | 공식 기록 수정, 정책 원문 변경·귀속·후속 공지 |

동적 lane도 6편 전체가 끝날 때까지 결과를 쥐고 있지 않고 기사별 결과를 즉시 반환한다.
09:00·10:00 등 뒤늦게 열리는 화면은 그 기사만 `WAIT_SOURCE_UNTIL=<YYYY-MM-DD HH:mm KST>`로
분리한다. `WAIT_SOURCE`는 PASS도 HOLD도 아니므로 현재 release에 넣지 않는다. HOLD·시간 제한·
기사별 검증·빌드·Preview 실패도 해당 기사만 제외한다. 반대로 두 게이트를 통과한 READY 기사는 다른 기사
때문에 대기시키지 않고 즉시 release한다. 조건부 기사는 동적 원출처 확인 뒤 PASS로 승격되는
순간 같은 규칙으로 자동 배포한다.

기사별 결합 조건은 다음과 같다.

```text
READY = independentReview == PASS
     && dynamicGate == PASS
     && finalGate == PASS
     && correctionPending == false
     && reviewedBy/reviewedAt/reporterInsight complete
```

release에는 그 시점의 `READY` 기사만 넣고 **별도 사용자 승인 질문·대기 없이** 즉시 다음 단계로
간다. HOLD·`WAIT_SOURCE_UNTIL`·시간 제한·기사별 검증·빌드·Preview 실패는 해당 기사만 제외하며 이미 READY인
PASS 기사의 release를 중단하지 않는다. 단, 사용자의 현재 중지·보류 지시는 언제나 이를 중단한다.

### 병렬화에서 바꾸지 않는 추적·보안 불변식

- 공개 페이지 GA4 `G-R2MDE3WDFY`는 `<head>` 첫 부분의 조건 없는 구글 표준 직접 스니펫
  1개다. 동의·시간 게이트나 `afterInteractive` 지연 주입으로 바꾸지 않는다.
- 인증 토큰 경로 `/reset`·`/verify-signup`·`/verify-email`·`/forgot`는 Pages middleware가
  GA4·AdSense·Cloudflare 태그와 Next Flight 복제 노드를 제거하고 no-referrer/no-store를 유지한다.
- AdSense 실제 스크립트는 React hydration 뒤 `afterInteractive`로 1회 로드한다. raw async head
  실행으로 되돌리면 WebKit hydration 오류가 재발할 수 있다.
- 병렬 검수 변경은 위 코드에 손대지 않는다. 관련 변경이 별도로 필요하면 `docs/tracking.md`를
  기준으로 `npm run test:analytics`까지 독립 회귀 검증한다.

### 편집 품질 8.5 게이트(2026-09-01 시행)

- 독립 리뷰·최종 게이트 PASS 뒤 CMS 변환 단계에서 `npm run check:editorial`(`--strict`)을 차단 게이트로 실행한다. `npm run report:editorial`은 같은 점수표를 보여 주는 보고용이며 실패를 차단하지 않는다. 배점은 출처 20 + 취재·검증 25 + 독자 가치 20 + 완결성 15 + 투명성 10 + 발행 위생 10이다.
- **80점 미만은 HOLD**, 신규 기사 이동평균 목표는 85점이다. 이는 검색엔진 점수 예측이 아니라 내부 출고 기준이다.
- `verificationNote`에는 무엇을 확인했는지, `addedValue`에는 원자료보다 무엇을 더했는지 쓴다.
- 배포 전 기자가 원문과 기사 수치·자격·기한을 대조하고 `reviewedBy`·`reviewedAt`을 남긴다. 포괄 명칭 대신 책임 기자 실명을 쓴다.
- `reporterInsight`에는 공고 요약을 반복하지 않고, 기자가 판단한 핵심 함정·영향·우선 확인사항을 근거와 함께 40~350자로 적는다. 사실 본문과 섞지 않는다.
- `interview`·`inquiry`·`follow-up`을 direct로 표기하려면 실제 답변을 받은 `contactStatus: replied`가 필요하다.
- 같은 분에 5편 이상 배정하면 빌드 실패한다. 예약 시각을 인위적으로 흩뜨리는 것이 아니라 실제 편집 완료 흐름대로 기록한다.
- AI 역할(`aiRole`)과 취재 방식(`reporting`)은 별도 축이다. AI를 썼어도 실제 질의·인터뷰가 있으면 그 행위를 증명하고, AI를 안 썼어도 공개자료 재작성은 직접취재가 아니다.
- 공식 목표와 단계별 KPI는 [AS-IS/TO-BE 설계](../docs/editorial-quality-as-is-to-be.md)가 정본이다.

### 공고 기반 기사 출고 순서

1. 원 공고문·접수 화면·첨부문서를 확보한다.
2. 작성자가 사실·수치·기한·자격을 기사로 구조화한다.
3. `모두일보 개발 및 배포 담당자`가 패키지를 인수해 정적 규격과 원문·접수화면·API 동적 값을 1차 게이트로 확인한다.
4. `모두일보 독립 리뷰 담당`(작업 ID `01a05a60-a035-7921-8154-7aa4a7024f31`)에게 기사별 검수를 요청한다.
5. 기사별 `reviewedBy`·`reviewedAt`·`reporterInsight`, PASS/HOLD, 수정 요구를 회수해 충돌은 질의·교정·HOLD하고 변경 기사는 재검수한다.
6. 개발 및 배포 담당자가 수정 반영본의 최종 정적·동적 게이트를 끝내고 PASS/HOLD·수정·미확인을 기록한다.
7. 기사별 독립 리뷰·동적·최종 게이트가 PASS이고 사람 검수 필드가 완성되면 즉시 상시 자동 배포 승인을 적용한다. 해당 READY 기사만 CMS 변환하고 80점 코드 게이트와 빌드를 수행해 생성물을 포함한 비-master 릴리스 브랜치에 Git 커밋한다.
8. Preview에서 기본 3경로(`/`·`/policy/`·`/newsroom/`)와 신규 기사 전건을 엔진·뷰포트 4조합으로 검사한다. 24편이면 총 27경로다. 자동 PASS 외에도 비교 이미지, HTTP 상태, canonical, index/follow, OG, 대표 이미지 응답을 확인한다.
9. PASS한 정확한 SHA를 `master`에 push하고 HEAD·`origin/master`·원격 `master`를 대조한다. 같은 릴리스 worktree에서 이 3자 일치를 재확인한 경우 `--force-branch`로, clean master를 쓸 수 있으면 일반 명령으로 Production 배포한다. 운영에서는 브라우저 4환경·자산 전수검사를 반복하지 않고 신규 기사 URL마다 HTTP·canonical·index/follow·OG를 각 1회만 확인한다.
10. 라이브 HTTP 200·self-canonical·index/follow를 확인한 신규 기사 canonical URL 전건을 색인 담당자에게 발행일·건수·사이트 커밋·IndexNow 결과와 함께 보낸다.

`reviewedBy`는 생성 에이전트가 초안 단계에서 미리 채우는 값이 아니다. 실제로 원문을 다시 본
책임 기자가 검수를 마친 뒤 입력한다. 현재 파일 기반 CMS는 로그인 서명까지 증명하지 못하므로,
이 규칙은 운영상 분리 원칙이다. 향후 기자 계정 CMS를 도입하면 승인 로그를 서버 기록으로 승격한다.

검수 뒤 기사 내용이 바뀌면 검수 대상과 실제 발행본이 달라진다. 변경 기사만 독립 리뷰와
최종 동적 게이트에 다시 보내고 해당 기사의 PASS를 다시 확인한다. 기계적 변환 실패처럼 본문을 바꾸지 않는 기술
수정은 기술 게이트를 다시 수행하되, 기사 내용 변경 여부를 명시한다.

## 2. HOLD 제도 — 두 종류를 혼동하지 말 것

| | (A) 코드 게이트 | (B) 운영 HOLD |
|---|---|---|
| 방식 | frontmatter `status`에 "보류"/"발행보류" → **빌드 실패**로 해당 기사 식별 후 current release에서 제외·재실행 | 검수 미통과 원고의 **파일 자체를 커밋하지 않음** |
| 위치 | `build-content.mjs` BLOCKED_STATUS | 커밋 이력에만 존재 |
| 해제 | status 수정 또는 `_` 접두사 | 코덱스 재검수 → 원자료 재현 → 해제분만 추가 커밋 |

- HOLD 사유 실례: 금액·마감·자격의 원자료 재현 미완료 / 원출처 간 값 충돌(공고문 vs 포털 메타) / 공고 표지 결격('긴급공고'+'최종 공고 아님' 동시 표시).
- HOLD·`WAIT_SOURCE_UNTIL`·시간 제한·기사별 코드 게이트·빌드·Preview 실패는 기사 단위 상태다.
  해당 기사만 staging에서 제외하고 남은 READY PASS 기사의 배포를 즉시 재개한다.
- 값 충돌이 해소 불가면 임의로 한쪽을 고르지 않고 **본문에 충돌 사실을 공개**하고 발행하는 3안이 있다.
- `status: 인증전보관`은 **발행 완료 라벨**이다(보관 ≠ 보류). 07월분에만 존재하는 역사적 라벨.

## 3. 공공 API 검증 게이트 (`scripts/`)

사업 축 기사(특히 bids·labor·grants — 일 6편)는 발행 전 공공 오픈API로 원자료를 대조한다. **전부 수동 호출**(자동화 미연결)이며 `.dev.vars`의 `DATA_GO_KR_KEY`가 필요하다.

| 스크립트 | 게이트 | 원천 | 핵심 |
|---|---|---|---|
| `nara.mjs` | (공통) | — | 키 인코딩 정규화·오류 3중 봉투 처리·함정 5종 문서화. **모든 나라장터 스크립트는 이 모듈 경유 필수** |
| `check-bid.mjs` | bids | 나라장터 입찰공고 | `inqryDiv=2+bidNtceNo`로 전 차수 일괄 — 취소/변경/재공고/긴급 표지, 자격등록마감 |
| `check-contract.mjs` | bids 후속 | 계약과정 통합 | 유찰·재공고로 기발행 기사가 죽은 값이 되는 것 탐지 |
| `find-order-plan.mjs` | bids 선행 | 발주계획 | 공고 전 발주계획 연결 |
| `check-hire.mjs` | labor | 잡알리오 | 접수기간·인원·전형. `nonatchRsn`은 채용 취소가 아니라 직무기술서 미첨부 사유 |
| `check-grant.mjs` | grants | 기업마당 | 신청기간·대상 + `updtPnttm`으로 발행 후 공고 정정 감지 |

**API 사용 함정(전부 실제로 걸린 것들):**
1. 인증키 이중 인코딩 금지 — Encoding/Decoding 두 형태를 `nara.readKey()`가 정규화
2. `NO_OPENAPI_SERVICE_ERROR` = "주소 없음"(권한 아님) — `/ad/` vs `/ao/` 경로 확인
3. 날짜 파라미터 자릿수 서비스별 상이(12자리 vs 8자리) — 틀리면 resultCode=08
4. 서버가 필터를 조용히 무시하고 최근 목록 반환(3개 API 공통) — 클라이언트 재필터 필수
5. 상세 응답이 목록 필드를 null로 덮음 — **API 응답 스프레드 금지**, 값 있는 필드만 덧씌울 것
6. 이 게이트들은 시각 주장을 "의심하게" 해줄 뿐 확정하지 못한다 — 시각은 공고문 원문 확인

## 4. 정정·수정·개인정보 규약

- **공식 정정** = `correction: { at, note }` 필드로만 → /corrections 자동 등재. 빌드가 짝을 강제(시각만·내용만 있으면 실패 — 언론중재법 요건).
- `updatedAt`은 오타·속보 갱신용 단순 수정 — 정정과 혼용 금지. 시제 오류 같은 비사실관계 문제는 correction 없이 수정.
- 기발행 기사 수정 시 표준: **slug·파일명·image 경로·publishedAt 불변, diff 최소, URL 변경 없음**을 커밋에 명시.
- 개인정보: 공고문에 있는 담당자 개인 연락처라도 기사에 재배포하지 않는다 — "공고는 마감일에 끝나지만 기사는 남는다."
- 관계사 기사: `author: 모두일보 편집국 / 기업소식`(기자 바이라인 금지) + 첫 문단 `[관계사 고지]` + 제목에 직접 인용부호 금지.

## 5. 날짜 규약 (불변식 — [08-conventions](08-conventions.md) §8과 동일)

`publishedAt`은 **KST 벽시계-as-Z**(예: KST 14:30 → `T14:30:00Z`로 저장, 진짜 UTC 아님).
- 기계 노출(JSON-LD·`<time datetime>`·news-sitemap)은 `toKstIso()` 경유
- sitemap lastmod는 −9h 보정(`sitemap-parts.toUtc`), RSS는 `+0900` 부착 — 각자 방식, 중복 적용 금지
- 예약 발행: 미래 publishedAt은 그 시각 전 빌드에서 제외(build-content가 now+9h와 비교)
- news-sitemap은 최신 기사 기준 **24h 창**을 쓰며, 창 안의 비광고 기사를 수량과 무관하게 모두 담는다. 정적 파일이 하루 묵어도 최근 2일 범위 안에 남기기 위한 안전 여유이며, 24편 할당량을 전제로 하지 않는다.

## 6. 알려진 미해결 사항

- 검증 게이트의 CI/자동화 연결 없음(package.json 미등록, .github 부재) — 전부 수동
- 운영 크론 3종(뉴스레터·업타임·D1백업)+배포가 특정 macOS launchd·키체인 의존(SPOF) — [operations](operations/README.md) 이관 과제
- 코덱스 검수 등급의 상세 기준("CMS 본문 8규칙"·"frontmatter 9필드"·"공개 금지표현")은 코덱스 측 문서로, 리포에 사본 없음
- 확장성: content.generated 단일 모듈·클라이언트 검색 인덱스·Pages 파일 한도가 1~2년 내 임계 — 검색 서버화·데이터 샤딩·Workers 승급 로드맵 필요
