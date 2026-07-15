-- 모두일보 · KV 카운터 → D1 원자 증감 이전 + 레이트리밋 + 뉴스레터 double opt-in (2026-07-15)
-- 대상 D1: modooilbo-members (binding DB).
-- 성격: additive(신규 테이블 6개 + 인덱스). 기존 테이블 정의 변경·삭제 없음 → 기존 데이터 무영향.
-- 시각: KST 벽시계 규약(datetime('now','+9 hours')) — db/schema.sql 전역 규약과 동일.
-- 재실행 안전: 전부 IF NOT EXISTS (ALTER TABLE ADD COLUMN은 재실행 불가라 의도적으로 쓰지 않았다).
--
-- [배경] KV(REACTIONS)의 get → +1 → put(read-modify-write)은 동시 요청에서 서로의 갱신을
--   덮어써 카운트가 유실되고, 일일 중복방지·도배제한·로그인 시도제한도 같은 경합으로 우회됐다.
--   KV엔 원자 증감이 없다 → 이미 있는 D1의 원자적 SQL로 옮긴다:
--     · 증감    : INSERT ... ON CONFLICT(...) DO UPDATE SET n = n + 1   (단일 문 = 원자적)
--     · 중복방지 : PRIMARY KEY 유니크 제약이 승자를 판정(INSERT ... ON CONFLICT DO NOTHING RETURNING)
--
-- [원격 적용] (그룹장/수화님이 배포 **직전에** 실행 — 이 에이전트는 파일 작성까지만):
--   wrangler d1 execute modooilbo-members --remote --file db/migrations/0002_counters.sql
--   ⚠️ 반드시 코드 배포(deploy:cf)보다 **먼저** 적용할 것. 순서가 뒤집히면 새 코드가
--      없는 테이블을 조회해 조회수·반응·댓글쓰기·로그인이 일시적으로 실패한다.
-- [로컬 검증]:
--   wrangler d1 execute modooilbo-members --local --file db/migrations/0002_counters.sql

-- ── 1. 조회수(/api/view, /api/most-read) ────────────────────────────────────
-- 구 KV: views:<article> (get→+1→put). 신규: 단일 UPSERT로 원자 증감.
-- most-read는 이 테이블 하나만 정렬 조회한다(구현 전엔 기사 수만큼 KV get을 병렬 발사 →
--   기사 154건 = 서브리퀘스트 154회, 1000회 한도에 접근 중이었다).
CREATE TABLE IF NOT EXISTS article_views (
  article_id TEXT PRIMARY KEY,                  -- 기사 id/slug
  views INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours'))
);
-- 랭킹 정렬(ORDER BY views DESC LIMIT n) 전용 인덱스.
CREATE INDEX IF NOT EXISTS idx_article_views_rank ON article_views(views DESC);

-- 조회수 일일 중복방지: IP 해시 + KST 날짜. 구 KV(viewed:*)의 get→put 경합 대체.
-- PK 충돌이 곧 "이미 카운트함" 판정이라 동시 요청 중 정확히 1건만 통과한다.
-- IP 원문은 저장하지 않는다(SHA-256 해시).
CREATE TABLE IF NOT EXISTS view_dedup (
  article_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL,                            -- KST YYYYMMDD
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  PRIMARY KEY (article_id, ip_hash, day)
);
-- D1엔 KV 같은 TTL이 없다 → 앱이 오래된 날짜 행을 청소한다(functions/api/view.ts).
CREATE INDEX IF NOT EXISTS idx_view_dedup_day ON view_dedup(day);

-- ── 2. 기사 반응(/api/reactions) ────────────────────────────────────────────
-- 구 KV: react:<article>:<type> (get→+1→put). 신규: 단일 UPSERT로 원자 증감.
CREATE TABLE IF NOT EXISTS reaction_counts (
  article_id TEXT NOT NULL,
  type TEXT NOT NULL,                           -- info|interesting|empathy|insight|followup
  n INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  PRIMARY KEY (article_id, type)
);

-- 반응 선택(하루 1개, IP 해시 + KST 날짜). 구 KV: choice:<article>:<ip>:<day>.
--   type      = 현재 선택(NULL = 취소한 상태. 행을 지우지 않고 NULL로 둬야 UPSERT 한 방에 토글된다)
--   prev_type = 직전 선택. UPSERT의 DO UPDATE가 "옛 값"을 여기 적어 두고 RETURNING으로 돌려주므로,
--               각 요청은 자기 전이의 카운트 증감분(prev -1, new +1)을 원자적으로 확정할 수 있다.
CREATE TABLE IF NOT EXISTS reaction_choices (
  article_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL,                            -- KST YYYYMMDD
  type TEXT,
  prev_type TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  PRIMARY KEY (article_id, ip_hash, day)
);
CREATE INDEX IF NOT EXISTS idx_reaction_choices_day ON reaction_choices(day);

-- ── 3. 레이트리밋(댓글 도배·로그인 시도·뉴스레터) ──────────────────────────
-- 고정 창(fixed window) 카운터. 구 KV 구현은 get→+1→put이라 동시 요청으로 우회됐고,
-- 바인딩이 없으면 제한 자체가 통째로 사라졌다(fail-open). 신규는 D1 단일 UPSERT +
-- RETURNING n으로 "증가시키고 나서 판정" → 경합에서도 한도를 넘길 수 없다.
-- 저장소 접근이 안 되면 호출부가 거부한다(fail-closed) — functions/_lib/rate-limit.ts.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT NOT NULL,                         -- 예: 'comment:<userId>' 'login:ip:<hash>' 'login:acct:<hash>'
  window_start INTEGER NOT NULL,                -- floor(epochMs / 창길이ms) — 창 식별자
  n INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  PRIMARY KEY (bucket, window_start)
);
-- 오래된 창 청소용(앱이 주기적으로 쓸어 담는다 — rate-limit.ts sweep).
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated ON rate_limits(updated_at);

-- ── 4. 뉴스레터 double opt-in(/api/newsletter) ─────────────────────────────
-- 기존 newsletter_subs(=확인된 구독자)는 건드리지 않는다. 확인 전 대기 상태만 여기 둔다
-- → 기존 구독자 1명(2026-07-15 운영 D1 확인)이 조용히 해지되는 일이 없고,
--   발송 스크립트(scripts/send-newsletter.mjs)의 수신자 쿼리도 그대로 유효하다.
-- 토큰은 원문을 저장하지 않고 SHA-256만 보관(password_resets와 동일 규약).
CREATE TABLE IF NOT EXISTS newsletter_pending (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_newsletter_pending_email ON newsletter_pending(email);

-- ── 5. 댓글 페이지네이션 보조 인덱스 ───────────────────────────────────────
-- 원댓글(parent_id IS NULL)만 최신순 키셋 페이징한다 → 부분 인덱스로 정확히 그 경로만 태운다.
-- 기존 idx_comments_article(article_id, created_at)은 답글까지 섞여 있어 원댓글 페이징엔 헐겁다.
-- (rowid는 인덱스 컬럼으로 명시할 수 없다 — SQLite가 모든 인덱스 엔트리에 자동으로 포함한다.
--  커서 동점 처리(created_at 동일)는 rowid로 하고, 그 미세 정렬만 쿼리가 담당한다.)
CREATE INDEX IF NOT EXISTS idx_comments_article_roots
  ON comments(article_id, created_at DESC)
  WHERE parent_id IS NULL;

-- 답글 조회(parent_id IN (...))용. 기존 인덱스는 article_id 선두라 답글 묶음 조회를 못 태운다.
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id, created_at);
