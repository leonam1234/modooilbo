# 모두일보 트래킹 / 지표 기준 (tracking.md)

> 이 문서는 모두일보의 운영 지표 **정의·데이터 출처·집계 기준**을 못 박는 정본입니다.
> 핵심 원칙: **실제로 저장·집계되지 않는 값은 절대 숫자로 만들지 않는다 → `확인 불가 / unavailable`.**
> 리포트 실행: 트래픽 `npm run report:tracking`, 검색·AI 가시성 `npm run report:visibility`.

최종 갱신: 2026-09-03 (KST)

---

## 0. 현재 구현 상태 점검 결과 (정직한 audit)

| 영역 | 현황 | 결론 |
|---|---|---|
| 사이트 구조 | Next.js **정적 export** + Cloudflare Pages. D1/KV 바인딩은 있으나 회원·뉴스레터·결제 기능은 데모 | 제품 지표는 실제 저장 여부를 따로 확인 |
| Cloudflare 트래픽 | Zone Analytics GraphQL 어댑터가 Wrangler OAuth를 자동 재사용. 별도 beacon 없이 edge 요청·HTML 페이지뷰·visits·uniques 집계 | **실집계 가동** |
| Web Analytics(beacon) | 선택 기능. `NEXT_PUBLIC_CF_BEACON_TOKEN`이 있으면 RUM을 삽입하며, 없으면 Zone Analytics를 사용 | AI referrer host까지 보려면 RUM 연결 권장 |
| Google Analytics 4 | **2026-09-03부터 가동.** 측정 ID `G-R2MDE3WDFY`(`src/lib/google-analytics.ts`). 구글 표준 스니펫을 모든 공개 페이지 `<head>` 첫 자리에 **조건 없이** 삽입(부트스트랩 인라인 → async 로더) — 구글 "태그 감지"가 초기 HTML·로드 직후 히트를 보므로 동의 게이트·시간 게이트·지연 주입은 금지(9/3 실측: 동의 후에만 page_view 를 보내는 구성은 배포 뒤에도 "감지되지 않았습니다"). 처리방침 고지 방식(/privacy §5·6·8), 동의창 없음. 인증 토큰 경로 4종은 middleware 가 태그를 제거하고 부트스트랩도 config 를 건너뛴다 | **실집계 가동** — 페이지뷰·세션·유입경로·referrer host는 GA4 보고서. edge 기준 수치는 CF와 병행(정의가 달라 서로 대체하지 않음) |
| 검색·AI 가시성 | `scripts/search-visibility-report.mjs`: 라이브 정책, CF 트래픽, AI User-Agent, AI referrer, GSC, Bing을 한 리포트로 집계 | CF·정책은 즉시, GSC·Bing·referrer는 아래 권한 필요 |
| Google Search Console | 읽기 전용 API 어댑터 구현. 현재 실행 계정에는 `modooilbo.com` 속성 권한/OAuth 없음 | 권한 부여 후 실집계 |
| Bing Webmaster | API 키 및 사용자 지정 신규 REST URL 어댑터 구현. 현재 인증 없음 | Bing 로그인·API 인증 후 실집계 |
| AI 인용/유입 | AI 크롤러 요청은 CF에서 실집계. AI 서비스 referrer host는 현재 Zone 플랜 필드 제한으로 unavailable | CF Web Analytics 연결 시 보강 |
| `/register` | `RegisterForm`은 `useState`만 변경, 화면에 "데모 환경이므로 실제 계정은 생성되지 않습니다" 표시 | **가입자 저장 안 됨 (데모)** |
| `/newsletter` | `NewsletterToggle`은 `useState` 토글뿐 | **구독자 저장 안 됨 (데모)** |
| `/subscribe` | 정적 안내 페이지, 결제·후원 연동 없음 | **유료/후원 집계 안 됨 (데모)** |

➡️ **현재 보고 기준:** 트래픽 3종과 AI 크롤러 요청은 Wrangler OAuth로 실집계합니다. GSC·Bing·AI referrer는 인증/플랜이 갖춰지기 전까지 `unavailable`로 출력합니다. 회원·뉴스레터·유료 5종은 데모(실제 레코드 생성 없음)라 **`0` + 비고**로 출력합니다. 데모 버튼 클릭·프론트 상태 변경은 **집계에 절대 포함하지 않습니다.**

---

## 1. 지표 정의 (8종) — 절대 혼용 금지

페이지뷰를 "유입자"나 "가입자"로 부르지 않는다. 세 가지는 완전히 다른 개념이다.

### 트래픽 (일일)
| 지표 | 정의 | 데이터 출처(예정) | 현재 |
|---|---|---|---|
| 일일 유입자 (unique visitors) | KST 하루 동안 Cloudflare edge가 구분한 **고유 방문자 수** | Cloudflare Zone Analytics | 실집계 |
| 일일 방문 세션 (sessions) | Cloudflare `visits`: 외부 referrer 또는 직접 링크에서 시작된 방문 | Cloudflare Zone Analytics | 실집계 |
| 일일 페이지뷰 (pageviews) | 성공한 HTML 응답 수. 유입자·가입자와 **무관** | Cloudflare Zone Analytics | 실집계 |

### 멤버 / 구독 (일일 신규 + 누적)
| 지표 | 정의 | 데이터 출처(예정) | 현재 |
|---|---|---|---|
| 신규 회원가입자 | KST 하루 동안 **DB에 실제 생성된** 신규 회원 계정 수 (이메일 인증 완료 기준 권장) | 회원 DB (예: D1 `users`) | `unavailable` |
| 신규 뉴스레터 구독자 | KST 하루 동안 **ESP에 실제 등록된** 신규 구독자 (double opt-in 완료 기준) | ESP (예: Buttondown/Mailchimp/Stibee) | `unavailable` |
| 신규 유료 구독/후원자 | KST 하루 동안 **결제가 실제 승인된** 신규 유료/후원 건 | 결제(예: Toss/PortOne/Stripe) | `unavailable` |
| 누적 활성 회원 | 현재 **활성 상태**인 회원 총수 (탈퇴·정지 제외) | 회원 DB | `unavailable` |
| 누적 활성 뉴스레터 구독자 | 현재 **수신 동의 활성** 구독자 총수 (이탈·반송 제외) | ESP | `unavailable` |

---

## 2. 집계 기준 (불변)

1. **KST 일일 집계.** 하루 = `Asia/Seoul 00:00:00 ~ 23:59:59`. UTC로 저장된 타임스탬프는 +9h 변환 후 날짜 버킷팅.
2. **개념 분리.** 페이지뷰 ≠ 세션 ≠ 유입자 ≠ 가입자. 서로 대체 표기 금지.
3. **내부 계정 제외.** 공개 가입자/구독자 수에서 다음을 제외한다:
   - 역할이 `admin` / `reporter`(기자) / `editor`(편집자) 인 계정
   - `test` / `seed` / `demo` 플래그가 있거나 이메일이 내부 도메인·`+test`·`example.com` 등인 계정
   - 구현 시: DB 쿼리에 `WHERE role NOT IN ('admin','reporter','editor') AND is_test = 0 AND is_seed = 0` 류의 필터를 **항상** 건다.
4. **미구현 = `unavailable`.** 어댑터가 없거나 데이터 소스가 없으면 추정치를 만들지 않고 `확인 불가 / unavailable`로 표기한다. (단, 회원/뉴스레터/유료처럼 "백엔드가 없어 레코드가 0인 것이 사실"인 경우는 `0` + 비고로 표기.)
5. **출처 명시.** 모든 숫자는 어느 소스에서 왔는지(또는 왜 unavailable인지) 함께 표기한다.

## 3. 개인정보 / 보안

- 리포트에는 **집계 수치만** 출력한다. 이메일·이름·전화·결제정보·토큰·chat id·고객 상세는 **절대 출력 금지**.
- API 키/토큰은 코드·로그·리포트에 평문 저장 금지. 환경변수로만 주입한다(아래).
- 리포트 산출물(파일)에도 PII가 들어가지 않도록, 소스 쿼리는 **COUNT/집계만** 수행한다.
- GA4는 `/reset`, `/verify-signup`, `/verify-email`, `/forgot`에서 항상 제외한다. 두 겹이다: (1) Cloudflare Pages middleware(`functions/_lib/strip-token-third-party-scripts.ts`)가 정적 head와 Next Flight 데이터의 GA4·AdSense 및 조건부 Cloudflare Web Analytics 태그를 제거하고 `Referrer-Policy: no-referrer`를 강제한다. 응답의 `Cache-Control: no-store, no-transform, max-age=0`은 캐시를 금지하는 동시에 Cloudflare가 middleware 처리 뒤 Web Analytics beacon이나 JavaScript Detection 스크립트를 다시 주입하지 못하게 한다. 공개↔토큰 경계 이동은 새 문서로 전환하며, 토큰 URL에서 시작한 문서는 전환 직전의 렌더 구간까지 수명 전체를 서드파티 차단 상태로 유지한다. (2) 부트스트랩 스니펫도 같은 경로 목록에서 `gtag('config')`를 건너뛰고 `ga-disable`을 켠다 — middleware가 없는 로컬 정적 미리보기와 회귀 시의 안전판. 토큰 경로에서 넘어온 같은 오리진 referrer도 비운다.
- 공개 경로에서는 구글 표준 스니펫대로 로드 즉시 page_view가 나간다(동의창·기본 거부 설정 없음). 광고 신호(`allow_google_signals`)·광고 개인화 신호는 끈다 — GA는 방문 통계 용도이고 광고는 AdSense 태그가 별도다. 한국 개인정보보호법상 분석 쿠키는 처리방침 고지로 충분하다(/privacy §1·§5·§6·§8에 항목·위탁·국외이전·쿠키·거부 방법 고지).
- GA4 국외 이전 수령자는 **Google LLC**, 이전 국가는 **미국**, 주소는 **1600 Amphitheatre Parkway Mountain View CA 94043 USA**, 공식 개인정보 문의 URL은 <https://support.google.com/policies/troubleshooter/7575787>이다. 접속 IP 주소·쿠키·클라이언트 식별자·방문 페이지 URL·제목·유입 경로·접속 시각·기기 정보·페이지 이용 이벤트가 방문·이용 통계 분석 및 콘텐츠 개선 목적으로 이용자의 기기에서 Google 서버로 수시 자동 전송된다.
- Google Analytics 이용자·이벤트 단위 데이터 보유 기간은 GA4 속성 설정값(2개월 또는 14개월)을 따르며 처리방침에는 **최대 14개월**로 고지했다. 현재 실행 환경은 GA 관리자에 로그인되지 않아 속성의 실제 설정값을 확인하지 못했다 — 오너가 GA 관리 → 데이터 설정 → 데이터 보관에서 확인·조정할 것.
- 이용자의 거부 수단은 브라우저의 쿠키 차단·삭제, Google Analytics 차단 브라우저 부가기능(<https://tools.google.com/dlpage/gaoptout>), 개인정보보호책임자 요청이다. 거부해도 기사 열람 등 기본 서비스는 제한되지 않는다.

## 4. 검색·AI 가시성 정의

`npm run report:visibility -- --days=7`은 아래를 동시에 점검한다.

1. **정책 일치:** 라이브 `robots.txt`, `llms.txt`, 운영정책, 최신 기사 저작권 문구가 `검색·인용 허용 / AI 모델 학습 금지`와 일치하는지 확인한다. Content Signals 정본은 `search=yes, ai-input=yes, ai-train=no, use=reference`다.
2. **AI 크롤러 수요:** OAI-SearchBot·Claude-SearchBot·PerplexityBot 등 검색·인용용 요청과 GPTBot·ClaudeBot·Google-Extended·CCBot 등 학습 차단 대상 요청을 User-Agent 기준으로 분리한다. User-Agent는 위조 가능하므로 **요청 수를 곧 실제 업체의 크롤 또는 인용 수라고 부르지 않는다.**
3. **AI 서비스 유입:** `chatgpt.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com` referrer 방문을 집계한다. 현재 Zone Analytics 무료 필드로는 referrer host가 제한되어 `unavailable`; Web Analytics RUM을 연결하면 보강한다.
4. **검색 성과:** GSC 클릭·노출·CTR·평균순위, Bing 클릭·노출·상위 쿼리를 각각 공식 API에서 읽는다.

AI 답변 내부의 실제 인용 노출은 제공사별 공통 공식 API가 없으므로, **크롤 요청 → AI referrer 방문 → GSC/Bing 검색 성과**를 서로 다른 단계로 유지한다. 어느 하나를 다른 지표로 대신 부르지 않는다.

## 5. 데이터 소스 연동 방법 (구현 시 = unavailable 해제)

리포트 도구(`scripts/tracking-report.mjs`)는 **환경변수와 어댑터 구현이 모두 완료되면** 해당 지표를 실집계한다. 비어 있거나 어댑터가 없으면 `unavailable`(데모로 레코드가 0인 항목은 `0`+비고).

- **트래픽 3종·AI 크롤러**: CF GraphQL 어댑터 **가동 중** → Wrangler OAuth 자동 사용. CI에서는 최소 Zone Analytics Read 토큰을 주입.
- **회원·뉴스레터·유료**: 어댑터·백엔드 **미구현** → 환경변수와 어댑터가 **둘 다** 갖춰져야 실집계(현재는 데모라 0).

| 지표군 | 필요한 것 | 환경변수(예) |
|---|---|---|
| CF 트래픽·AI 크롤러 | 로컬은 Wrangler OAuth 자동 사용, CI는 Analytics Read 토큰 | `CLOUDFLARE_API_TOKEN`(선택), `CF_ZONE_ID`(선택) |
| AI referrer | CF Web Analytics 사이트 + beacon + 조회 권한 | `NEXT_PUBLIC_CF_BEACON_TOKEN`, `CF_ACCOUNT_ID`, `CF_WEB_ANALYTICS_SITE_TAG` |
| GSC | 속성 읽기 권한이 있는 OAuth access token 또는 서비스 계정(JSON 키는 로컬 secret만) | `GSC_ACCESS_TOKEN` 또는 `GOOGLE_APPLICATION_CREDENTIALS`, `GSC_SITE_URL`(기본 `sc-domain:modooilbo.com`) |
| Bing | Webmaster API 인증. 신규 REST는 전체 query-stats URL을 어댑터에 전달 | `BING_WEBMASTER_API_KEY` 또는 `BING_WEBMASTER_QUERY_STATS_URL` + `BING_WEBMASTER_ACCESS_TOKEN` |
| 회원(신규/누적) | 회원 DB(예: Cloudflare D1) + 가입 API(Pages Functions) | `MEMBERS_DB`(D1 바인딩) 또는 `DATABASE_URL` |
| 뉴스레터(신규/누적) | ESP 계정 + 구독 API | `ESP_PROVIDER`, `ESP_API_KEY`, `ESP_LIST_ID` |
| 유료/후원 | 결제 PG 계정 + 웹훅 기록 | `PAY_PROVIDER`, `PAY_API_KEY` |

> ⚠️ 정적 export 사이트라 **폼 저장·결제·웹훅은 백엔드가 필요**하다(Cloudflare Pages Functions + D1, 또는 외부 ESP/PG). 이 백엔드는 별도 구현·승인 대상이다.
>
> 트래픽: beacon이 없어도 Cloudflare edge의 Zone Analytics가 실집계된다. RUM beacon은 referrer·Core Web Vitals 등 브라우저 차원의 상세 분석을 추가할 때 사용한다.

## 6. 관리자 리포트

- 현재: **CLI 리포트** `npm run report:tracking` (트래킹 담당자가 로컬/Codex에서 하루 단위 실행).
- 향후(백엔드 생기면): 인증 보호된 관리자 API(`/admin/metrics`, Pages Function + 토큰)로 동일 집계를 노출 가능. 이때도 위 2·3 기준을 그대로 적용한다.

## 7. 검증 / CI 명령

| 명령 | 용도 |
|---|---|
| `npm run build` | 정적 export 빌드(타입 포함) |
| `npm run lint` | 비대화형 타입체크(`tsc --noEmit`). ESLint 설정 프롬프트 없이 pass/fail 반환 |
| `npm run test:analytics` | GA4 ID·시행일·Advanced Consent·토큰 경로·CSP·정적 산출물 회귀 검사 |
| `npm run test:analytics:browser -- <baseUrl>` | 시행 전/동의 전/허용/철회 및 공개·토큰 경로의 실제 브라우저 tag·요청 검사 |
| `npm run report:tracking -- --date=2026-06-29` | 사람용 표 리포트(KST) |
| `npm run report:tracking -- --date=2026-06-29 --json` | 기계용 JSON |
| `npm run report:visibility -- --days=7` | 정책·CF·AI 크롤러·AI 유입·GSC·Bing 통합 리포트 |
| `npm run --silent report:visibility -- --days=7 --json` | 자동화/저장용 JSON |

- **JSON을 파이프할 때**는 `npm run` 배너(stdout)가 섞이므로 `npm run --silent report:tracking -- --json` 또는 `node scripts/tracking-report.mjs --json`을 쓴다.
- API 키·OAuth·서비스 계정 JSON은 env/로컬 secret로만 주입하고 저장소나 리포트에 평문으로 남기지 않는다.
- Cloudflare adaptive 요청 데이터는 User-Agent 관측치다. verified bot 판정이나 발신 IP 검증을 하지 않은 상태에서는 업체별 실제 크롤로 단정하지 않는다.
