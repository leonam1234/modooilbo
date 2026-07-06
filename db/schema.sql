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
