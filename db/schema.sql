-- 모두일보 회원 시스템 스키마 (D1: modooilbo-members)
-- 설계: 간편 회원가입 대비 — 사람(users) 1명에 로그인 수단(identities) 여러 개.
--   이메일 가입 후 카카오/네이버/구글을 같은 계정에 연결(동일 이메일 충돌 시 병합 유도).
-- 시각은 KST 벽시계(datetime('now','+9 hours')) 규약.
--
-- [마이그레이션 노트 2026-07-04] idx_comments_user 추가 — 이미 운영 중인 DB에는 아래를 직접 실행할 것:
--   wrangler d1 execute modooilbo-members --remote --command "CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id, created_at);"

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                          -- UUID
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,    -- 계정 기준 키
  name TEXT NOT NULL,
  password_hash TEXT,                           -- 소셜 전용 가입자는 NULL
  password_salt TEXT,
  newsletter INTEGER NOT NULL DEFAULT 0,        -- 뉴스레터 수신 동의(선택)
  terms_agreed_at TEXT,                         -- 필수 약관(이용약관·개인정보) 동의 시각(KST). 소셜 간편가입=가입 시각으로 간주 기록
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours'))
);

CREATE TABLE IF NOT EXISTS identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,                       -- email | kakao | naver | google
  provider_user_id TEXT NOT NULL,               -- email이면 이메일 주소, 소셜이면 각 사 고유 ID
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  UNIQUE(provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_identities_user ON identities(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,                  -- 세션 토큰의 SHA-256(원문 저장 안 함)
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 댓글 (2026-07-03): 기사별 댓글 + 답글 1단 + 공감. 삭제는 소프트(작성자 표시 유지).
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,                          -- UUID
  article_id TEXT NOT NULL,                     -- 기사 id/slug
  user_id TEXT NOT NULL REFERENCES users(id),
  parent_id TEXT REFERENCES comments(id),       -- NULL=원댓글, 값=답글(1단만)
  body TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,          -- 신고 누적(3회) 자동 가림
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours'))
);
CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id, created_at);
-- 댓글 신고 (2026-07-03): 회원당 1회, 3회 누적 시 comments.is_hidden=1
CREATE TABLE IF NOT EXISTS comment_reports (
  comment_id TEXT NOT NULL REFERENCES comments(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  PRIMARY KEY (comment_id, user_id)
);
CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id TEXT NOT NULL REFERENCES comments(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  PRIMARY KEY (comment_id, user_id)
);

-- 스크랩 (2026-07-03): 회원별 기사 저장. 토글이라 행 존재 = 저장됨.
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL REFERENCES users(id),
  article_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  PRIMARY KEY (user_id, article_id)
);

-- 비밀번호 재설정 (2026-07-03): 토큰은 SHA-256만 저장, 1시간 유효, 1회용
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

-- 기자 구독 (2026-07-06): 회원별 기자 팔로우. 행 존재 = 구독중.
CREATE TABLE IF NOT EXISTS reporter_subs (
  user_id TEXT NOT NULL REFERENCES users(id),
  reporter_slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  PRIMARY KEY (user_id, reporter_slug)
);

-- 뉴스레터 구독 (2026-07-07): 비회원도 이메일만으로 구독. 수신거부 = 행 삭제.
CREATE TABLE IF NOT EXISTS newsletter_subs (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 기업 데이터 뉴스 · 계층3 기사 후보/편집 대기열 (2026-07-13)
--   증분 마이그레이션 정본: db/migrations/0001_article_candidates.sql (원격 적용은 그 파일로).
--   여기(schema.sql)에도 동일 정의를 두어 전체 스키마의 단일 사본을 유지한다.
--   paseco 원천(programs)은 read-only 조회만, 기사·회원 데이터는 이 D1(modooilbo-members) 전용.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_candidates (
  cand_id TEXT PRIMARY KEY,             -- 관례: `${raw_source}:${raw_source_id}`
  raw_source TEXT,                      -- 'kstartup' | 'bizinfo' | 'nara' | 'gov24'
  raw_source_id TEXT,                   -- 원본 고유키(원천 programs.source_id)
  raw_content_hash TEXT,               -- 스냅샷 당시 원천 content_hash(변경 감지)
  score INTEGER,                        -- 종합 점수 0~100(7항목 합)
  score_breakdown TEXT,                -- 항목별 점수 JSON
  status TEXT NOT NULL DEFAULT '수집',  -- 수집·후보·초안·검증중·승인·발행대기·발행완료·제외
  assigned_reporter TEXT,               -- 배정 기자 slug
  menu TEXT,                            -- '지원사업' | '입찰·조달' 등
  video_score INTEGER,                  -- 쇼츠 대기열 판정용 0~100
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  published_slug TEXT                   -- 발행완료 시 content/articles slug
);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON article_candidates(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_candidates_menu ON article_candidates(menu, status);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON article_candidates(raw_source, raw_source_id);

CREATE TABLE IF NOT EXISTS candidate_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,   -- 동시각 이벤트 정렬용 대리키(추가분)
  cand_id TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  from_status TEXT,
  to_status TEXT,
  actor TEXT,                             -- 'system' | 관리자 이메일 | 기자 slug
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_candidate_events_cand ON candidate_events(cand_id, at);

-- ─────────────────────────────────────────────────────────────────────────────
-- KV 카운터 → D1 원자 증감 이전 + 레이트리밋 + 뉴스레터 double opt-in (2026-07-15)
--   증분 마이그레이션 정본: db/migrations/0002_counters.sql (원격 적용은 그 파일로).
--   여기(schema.sql)에도 동일 정의를 두어 전체 스키마의 단일 사본을 유지한다.
--   KV(REACTIONS)엔 원자 증감이 없어 get→+1→put이 동시 요청에서 서로를 덮어썼다
--   → 증감은 UPSERT 단일 문(n = n + 1), 중복방지는 유니크 제약으로 원자화.
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 이메일 인증 토큰 KV → D1 이전 (2026-07-15)
--   증분 마이그레이션 정본: db/migrations/0003_auth_tokens.sql (원격 적용은 그 파일로).
--   여기(schema.sql)에도 동일 정의를 두어 전체 스키마의 단일 사본을 유지한다.
--   구 KV는 `emailreg:<평문토큰>` = {uid,email} — **평문 토큰이 곧 키**라 KV 열람만으로
--   남의 인증 링크를 완성할 수 있었고, 소비(get→delete)가 비원자라 동시 재사용이 가능했다.
--   → sessions·password_resets와 동일하게 SHA-256만 저장 + DELETE...RETURNING 원자 소비.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verifications (
  token_hash TEXT PRIMARY KEY,                  -- SHA-256(토큰) hex. 평문 토큰은 메일로만 나간다.
  user_id TEXT NOT NULL REFERENCES users(id),   -- 인증 대상 계정
  email TEXT NOT NULL COLLATE NOCASE,           -- 등록하려는 이메일(발송 시점 값 — 확인 시 재검증한다)
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  expires_at TEXT NOT NULL                      -- 발급 + 30분(KST 벽시계)
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);
