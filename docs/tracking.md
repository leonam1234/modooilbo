# 모두일보 트래킹 / 지표 기준 (tracking.md)

> 이 문서는 모두일보의 운영 지표 **정의·데이터 출처·집계 기준**을 못 박는 정본입니다.
> 핵심 원칙: **실제로 저장·집계되지 않는 값은 절대 숫자로 만들지 않는다 → `확인 불가 / unavailable`.**
> 리포트 실행: `npm run report:tracking` (옵션 `-- --date=YYYY-MM-DD --json`).

최종 갱신: 2026-06-30 (KST)

---

## 0. 현재 구현 상태 점검 결과 (정직한 audit)

| 영역 | 현황 | 결론 |
|---|---|---|
| 사이트 구조 | Next.js **정적 export** + Cloudflare Pages. **백엔드/Functions/DB 바인딩 없음** | 서버에 저장할 곳이 없음 |
| 애널리틱스 | GA·CF Web Analytics·Plausible 등 **미설치** (코드에 beacon/gtag 없음) | 트래픽 수집 안 됨 |
| `/register` | `RegisterForm`은 `useState`만 변경, 화면에 "데모 환경이므로 실제 계정은 생성되지 않습니다" 표시 | **가입자 저장 안 됨 (데모)** |
| `/newsletter` | `NewsletterToggle`은 `useState` 토글뿐 | **구독자 저장 안 됨 (데모)** |
| `/subscribe` | 정적 안내 페이지, 결제·후원 연동 없음 | **유료/후원 집계 안 됨 (데모)** |

➡️ **따라서 현재 8개 지표는 전부 `unavailable`이 정상입니다.** 데모 버튼 클릭·프론트 상태 변경은 **집계에 절대 포함하지 않습니다.**

---

## 1. 지표 정의 (8종) — 절대 혼용 금지

페이지뷰를 "유입자"나 "가입자"로 부르지 않는다. 세 가지는 완전히 다른 개념이다.

### 트래픽 (일일)
| 지표 | 정의 | 데이터 출처(예정) | 현재 |
|---|---|---|---|
| 일일 유입자 (unique visitors) | KST 하루 동안 사이트를 방문한 **고유 방문자 수** (중복 제거) | Cloudflare Web Analytics | `unavailable` |
| 일일 방문 세션 (sessions) | KST 하루 동안 발생한 **세션 수** (방문 단위, 30분 비활동 시 종료) | Cloudflare Web Analytics | `unavailable` |
| 일일 페이지뷰 (pageviews) | KST 하루 동안 로드된 **페이지 수**. 유입자·가입자와 **무관** | Cloudflare Web Analytics | `unavailable` |

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
4. **미구현 = `unavailable`.** 데이터 소스가 없으면 0이나 추정치를 만들지 않고 `확인 불가 / unavailable`로 표기한다.
5. **출처 명시.** 모든 숫자는 어느 소스에서 왔는지(또는 왜 unavailable인지) 함께 표기한다.

## 3. 개인정보 / 보안

- 리포트에는 **집계 수치만** 출력한다. 이메일·이름·전화·결제정보·토큰·chat id·고객 상세는 **절대 출력 금지**.
- API 키/토큰은 코드·로그·리포트에 평문 저장 금지. 환경변수로만 주입한다(아래).
- 리포트 산출물(파일)에도 PII가 들어가지 않도록, 소스 쿼리는 **COUNT/집계만** 수행한다.

## 4. 데이터 소스 연동 방법 (구현 시 = unavailable 해제)

리포트 도구(`scripts/tracking-report.mjs`)는 아래 환경변수가 채워지면 자동으로 해당 지표를 실집계한다. 비어 있으면 `unavailable`.

| 지표군 | 필요한 것 | 환경변수(예) |
|---|---|---|
| 트래픽 3종 | ① 사이트에 CF Web Analytics beacon 삽입(`NEXT_PUBLIC_CF_BEACON_TOKEN`) ② 조회용 CF API 토큰 | `CLOUDFLARE_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_WEB_ANALYTICS_SITE_TAG` |
| 회원(신규/누적) | 회원 DB(예: Cloudflare D1) + 가입 API(Pages Functions) | `MEMBERS_DB`(D1 바인딩) 또는 `DATABASE_URL` |
| 뉴스레터(신규/누적) | ESP 계정 + 구독 API | `ESP_PROVIDER`, `ESP_API_KEY`, `ESP_LIST_ID` |
| 유료/후원 | 결제 PG 계정 + 웹훅 기록 | `PAY_PROVIDER`, `PAY_API_KEY` |

> ⚠️ 정적 export 사이트라 **폼 저장·결제·웹훅은 백엔드가 필요**하다(Cloudflare Pages Functions + D1, 또는 외부 ESP/PG). 이 백엔드는 별도 구현·승인 대상이다. 트래픽(CF Web Analytics)은 beacon만 넣으면 수집이 시작된다.

## 5. 관리자 리포트

- 현재: **CLI 리포트** `npm run report:tracking` (트래킹 담당자가 로컬/Codex에서 하루 단위 실행).
- 향후(백엔드 생기면): 인증 보호된 관리자 API(`/admin/metrics`, Pages Function + 토큰)로 동일 집계를 노출 가능. 이때도 위 4·5·6 기준을 그대로 적용한다.
