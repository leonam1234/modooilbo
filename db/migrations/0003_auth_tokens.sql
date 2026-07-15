-- 모두일보 · 이메일 인증 토큰 KV → D1 이전 (2026-07-15)
-- 대상 D1: modooilbo-members (binding DB).
-- 성격: additive(신규 테이블 1개 + 인덱스 2개). 기존 테이블 정의 변경·삭제 없음 → 기존 데이터 무영향.
-- 시각: KST 벽시계 규약(datetime('now','+9 hours')) — db/schema.sql 전역 규약과 동일.
-- 재실행 안전: 전부 IF NOT EXISTS (ALTER TABLE ADD COLUMN은 재실행 불가라 의도적으로 쓰지 않았다).
--
-- [배경] 이메일 인증 토큰만 유일하게 KV(REACTIONS)에 `emailreg:<평문토큰>` 키로 남아 있었다. 문제:
--   1) **평문 토큰이 곧 저장소 키**였다 → KV를 열람할 수 있는 주체(대시보드·API 토큰 유출 등)가
--      키 목록만 읽어도 남의 인증 링크를 그대로 완성할 수 있었다. 세션·비밀번호 재설정은 이미
--      "SHA-256만 저장" 규약(sessions.token_hash / password_resets.token_hash)인데 여기만 예외였다.
--   2) 소비(1회용 처리)가 `get` → 검증 → `delete`라 원자적이지 않았다 → 동시 요청이 같은 토큰으로
--      동시에 통과할 수 있었다(경합). D1로 옮기면 `DELETE ... RETURNING` 단일 문으로 원자 소비가 된다.
--   3) 발급 개수 상한이 없어 한 계정이 살아있는 토큰을 무제한 쌓을 수 있었다.
--
-- [원격 적용] (그룹장/수화님이 배포 **직전에** 실행 — 이 에이전트는 파일 작성까지만):
--   wrangler d1 execute modooilbo-members --remote --file db/migrations/0003_auth_tokens.sql
--   ⚠️ 반드시 코드 배포(deploy:cf)보다 **먼저** 적용할 것. 순서가 뒤집히면 새 코드가
--      없는 테이블을 조회해 이메일 인증 요청·확인이 일시적으로 실패한다.
--   ⚠️ 전환 순간 KV에 떠 있던 기존 인증 링크는 무효가 된다(새 코드는 D1만 본다).
--      실사용 회원 0명(테스트 4계정)이라 이관하지 않는다 — 사용자는 다시 요청하면 된다.
-- [로컬 검증]:
--   wrangler d1 execute modooilbo-members --local --file db/migrations/0003_auth_tokens.sql

-- ── 이메일 등록 인증 토큰(/api/auth/request-email → /api/auth/verify-email) ──
-- 구 KV: emailreg:<평문토큰> = {uid, email}, TTL 30분.
-- 신규 규약(password_resets·sessions와 동일):
--   · 토큰 **원문은 저장하지 않는다** — SHA-256(hex 64)만 PK로 둔다. DB가 통째로 새도
--     저장된 해시로는 링크를 되만들 수 없다(역상 저항성).
--   · 만료는 행에 명시(expires_at) — D1엔 KV 같은 TTL이 없으므로 앱이 만료를 판정하고
--     묵은 행을 청소한다(functions/api/auth/request-email.ts의 발급 시 purge).
--   · 1회용 — 소비는 `DELETE ... WHERE token_hash=?1 AND expires_at > now RETURNING user_id, email`
--     **단일 문**. 삭제에 성공한 요청만 값을 돌려받으므로 동시 재사용이 원리적으로 불가능하다.
CREATE TABLE IF NOT EXISTS email_verifications (
  token_hash TEXT PRIMARY KEY,                  -- SHA-256(토큰) hex. 평문 토큰은 메일로만 나간다.
  user_id TEXT NOT NULL REFERENCES users(id),   -- 인증 대상 계정
  email TEXT NOT NULL COLLATE NOCASE,           -- 등록하려는 이메일(발송 시점 값 — 확인 시 재검증한다)
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  expires_at TEXT NOT NULL                      -- 발급 + 30분(KST 벽시계)
);
-- 사용자별 정리(만료·상한 초과분 purge)와 살아있는 토큰 개수 판정용.
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id, created_at);
-- 만료 청소용 범위 스캔.
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);
