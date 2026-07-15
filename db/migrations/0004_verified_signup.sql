-- 모두일보 · 가입 이메일 인증 도입 + 이메일 검증 상태 (2026-07-15)
-- 대상 D1: modooilbo-members (binding DB).
-- 성격: additive(신규 테이블 2개 + 인덱스 3개). 기존 테이블 정의 변경·삭제 없음 → 기존 데이터 무영향.
-- 시각: KST 벽시계 규약(datetime('now','+9 hours')) — db/schema.sql 전역 규약과 동일.
--
-- 재실행 안전: 전부 IF NOT EXISTS.
--   ⚠️ **ALTER TABLE ADD COLUMN을 쓰지 않는다**(0002·0003과 동일 원칙). SQLite의 ADD COLUMN에는
--      IF NOT EXISTS가 없어 두 번 실행하면 "duplicate column name"으로 마이그레이션이 통째로 실패한다.
--      users에 email_verified 컬럼을 붙이는 대신 **별도 테이블(user_email_verified)** 로 표현하면
--      가산적(additive)이고 몇 번을 돌려도 같은 결과다.
--      부수 효과로 설계도 더 정확해진다 — 아래 [왜 별도 테이블인가] 참조.
--
-- [원격 적용] (그룹장/수화님이 배포 **직전에** 실행 — 이 에이전트는 파일 작성까지만):
--   wrangler d1 execute modooilbo-members --remote --file db/migrations/0004_verified_signup.sql
--   ⚠️ 반드시 코드 배포(deploy:cf)보다 **먼저** 적용할 것. 순서가 뒤집히면 새 코드가 없는 테이블을
--      조회해 **회원가입·소셜 로그인이 전면 실패**한다(마이그는 additive라 먼저 적용해도 구 코드에 무해).
-- [로컬 검증]:
--   wrangler d1 execute modooilbo-members --local --file db/migrations/0004_verified_signup.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 이메일 검증 상태 (user_email_verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- [배경] users에는 이메일 검증 여부를 나타내는 값이 **아예 없었다**. 그래서 users.email은
--   "가입 폼에 타이핑된 문자열"일 뿐 소유가 증명된 값이 아니었고, 이것이 계정 선점
--   (pre-hijacking)의 뿌리였다(2026-07-15 1차 감사). 1차는 google·kakao의 자동 병합을
--   제거해 급한 불을 껐지만, 그 대가로 "이메일+비번 가입자가 같은 주소로 소셜 로그인하면
--   계정이 하나 더 생기는" UX 손해를 떠안았다. 이 테이블이 그 손해를 되돌리는 근거다.
--
-- [왜 별도 테이블인가]
--   1) 재실행 안전(ALTER TABLE 회피) — 위 참조.
--   2) **검증은 (계정, 주소) 쌍의 사실이지 계정의 속성이 아니다.** users.email은 바뀔 수 있다
--      (verify-email.ts가 합성 이메일 → 실주소로 교체한다). boolean 컬럼이었다면 주소가 바뀌는
--      순간 "예전 주소를 검증했다는 사실"이 새 주소의 검증으로 둔갑한다 → 그대로 병합 근거가 되어
--      선점 구멍이 다시 열린다. 여기서는 검증된 주소를 함께 적어 두고, 판정을 항상
--      `v.email = u.email`로 하므로 주소가 바뀌면 자동으로 미검증이 된다(가장 중요한 안전 속성).
--   3) 행이 없으면 미검증 — 기존 계정(테스트 4건)은 마이그레이션만으로 자동 미검증이 된다.
--      데이터 백필이 필요 없고, 안전한 쪽이 기본값이다(fail-closed).
--
-- [행이 생기는 경로 = 주소 소유가 증명되는 경로. 이 목록이 곧 신뢰 근거다]
--   · 'signup'         — 가입 확인 메일의 링크를 눌렀다(verify-signup.ts). 토큰은 그 주소로만 갔다.
--   · 'email-register' — 합성 이메일 계정이 실주소를 등록했다(verify-email.ts). 위와 동일.
--   · 'password-reset' — 재설정 메일의 링크로 비밀번호를 바꿨다(reset.ts). 그 주소의 수신함을
--                        통제한다는 증명이므로 검증으로 인정한다(구 미검증 계정의 정상 승격 경로).
--   · 'oauth:google' / 'oauth:kakao' — 제공자가 email_verified=true로 단언한 주소.
--   ⚠️ naver는 없다 — 네이버는 이메일 검증 플래그를 주지 않는다(callback이 제공자 이메일을
--      아예 쓰지 않고 항상 합성 이메일을 만든다).
CREATE TABLE IF NOT EXISTS user_email_verified (
  user_id TEXT PRIMARY KEY REFERENCES users(id),  -- 계정당 1행(현재 users.email에 대한 검증 사실)
  email TEXT NOT NULL COLLATE NOCASE,             -- **검증된 주소**. users.email과 다르면 미검증으로 판정한다.
  method TEXT NOT NULL,                           -- signup | email-register | password-reset | oauth:google | oauth:kakao
  verified_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours'))
);
-- 소셜 자동 병합 판정: "이 주소를 검증한 계정이 있는가"를 한 번에 찾는다.
CREATE INDEX IF NOT EXISTS idx_user_email_verified_email ON user_email_verified(email);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. 가입 대기(pending_signups) — 확인 메일을 누르기 전의 가입 요청
-- ─────────────────────────────────────────────────────────────────────────────
-- [배경] 구 signup.ts는 폼 제출 즉시 users 행을 만들고 세션까지 발급했다(소유 증명 0).
--   게다가 중복 이메일에 409를 돌려줘 "이 주소는 가입돼 있다"를 그대로 알려줬다(계정 열거).
--
-- [설계] 확인 전 상태를 users가 아니라 **여기**에 둔다. 그 결과:
--   · users에는 **미검증 로컬 계정이 원천적으로 존재할 수 없다** → login에 "미검증 차단" 게이트가
--     필요 없다(게이트를 두면 검증 개념이 없는 소셜 합성계정·기존 계정만 애꿎게 막힌다).
--     "확인 전 로그인 불가"가 코드의 분기가 아니라 **구조**로 보장된다.
--   · 닉네임·이메일이 확인 전에는 선점되지 않는다(미검증 가입으로 남의 닉네임 묶어두기 불가).
--   · 열거 차단: 신규/기존 주소 모두 여기에 행을 넣고 메일 1통을 보낸다 → 응답 문구·상태코드는
--     물론 DB 작업량·PBKDF2 횟수·발송 횟수까지 같아 **타이밍으로도** 구분되지 않는다.
--     (기존 주소로 들어온 행은 토큰이 메일로 나가지 않아 사용될 수 없고, 만료·상한으로 정리된다.)
--
-- [토큰 규약] sessions·password_resets·email_verifications와 동일 — **원문은 저장하지 않는다**.
--   SHA-256(hex 64)만 PK로 둔다. 소비는 `DELETE ... WHERE token_hash=?1 AND 미만료 RETURNING`
--   **단일 문**이라 삭제에 성공한 요청만 값을 받는다(동시 재사용 원천 불가·1회용).
--
-- ⚠️ password_hash는 PBKDF2-SHA256(10만회)+계정별 솔트 결과다(users와 동일 규약). 원문 비밀번호는
--   어디에도 저장하지 않는다. 확인 전 가입 요청이라도 평문을 들고 있지 않는다.
CREATE TABLE IF NOT EXISTS pending_signups (
  token_hash TEXT PRIMARY KEY,                  -- SHA-256(토큰) hex. 평문 토큰은 메일로만 나간다.
  email TEXT NOT NULL COLLATE NOCASE,           -- 가입하려는 주소(확인 시 재검증한다 — TOCTOU)
  name TEXT NOT NULL,                           -- 희망 닉네임(확인 시점에 중복이면 접미사로 회피)
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  newsletter INTEGER NOT NULL DEFAULT 0,        -- 선택 동의(마케팅 수신)
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),  -- = 약관 동의 시각(users.terms_agreed_at로 옮긴다)
  expires_at TEXT NOT NULL                      -- 발급 + 24시간(KST 벽시계)
);
-- 주소별 정리(만료·상한 초과분 purge)와 살아있는 대기 건수 판정용.
CREATE INDEX IF NOT EXISTS idx_pending_signups_email ON pending_signups(email, created_at);
-- 만료 청소용 범위 스캔(D1엔 KV 같은 TTL이 없다 → 앱이 발급 시 함께 쓸어 담는다).
CREATE INDEX IF NOT EXISTS idx_pending_signups_expires ON pending_signups(expires_at);
