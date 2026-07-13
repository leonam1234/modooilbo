-- 모두일보 기업 데이터 뉴스 · 계층3(기사 후보·편집 대기열) 스키마
-- 대상 D1: modooilbo-members (binding DB). 기사·회원 데이터 전용 — paseco 원천과 물리적으로 분리.
-- 성격: additive(신규 테이블 2개 + 인덱스). 기존 회원/댓글/스크랩/뉴스레터 등 무영향.
-- 시각: KST 벽시계 규약(datetime('now','+9 hours')) — db/schema.sql 전역 규약과 동일.
--
-- [원격 적용] (그룹장이 확인 후 실행 — 이 에이전트는 로컬 --local 검증까지만):
--   wrangler d1 execute modooilbo-members --remote --file db/migrations/0001_article_candidates.sql
-- [로컬 검증]:
--   wrangler d1 execute modooilbo-members --local --file db/migrations/0001_article_candidates.sql

-- 기사 후보(계층3): paseco 원천 공고 1건 → 점수화·상태기계로 편집 대기열 관리.
-- cand_id는 원천(source+source_id)을 참조하는 느슨한 참조(FK 아님 — 원천 D1은 별도).
CREATE TABLE IF NOT EXISTS article_candidates (
  cand_id TEXT PRIMARY KEY,             -- 후보 식별자. 관례: `${raw_source}:${raw_source_id}`
  raw_source TEXT,                      -- 'kstartup' | 'bizinfo' | 'nara' | 'gov24'
  raw_source_id TEXT,                   -- 원본 고유키(원천 programs.source_id)
  raw_content_hash TEXT,               -- 스냅샷 당시 원천 content_hash(변경 감지·재점수화 트리거용)
  score INTEGER,                        -- 종합 점수 0~100(7항목 합)
  score_breakdown TEXT,                -- 항목별 점수 JSON: {"deadline":..,"targetScope":..,...}
  status TEXT NOT NULL DEFAULT '수집',  -- 상태기계: 수집·후보·초안·검증중·승인·발행대기·발행완료·제외
  assigned_reporter TEXT,               -- 배정 기자 slug(lib/reporters.ts) — 초안 단계에서 지정
  menu TEXT,                            -- '지원사업' | '입찰·조달' 등 파일럿 메뉴
  video_score INTEGER,                  -- 쇼츠 대기열 판정용 0~100(기사 점수와 별개 신호)
  created_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  published_slug TEXT                   -- 발행완료 시 content/articles slug(원문↔기사 추적)
);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON article_candidates(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_candidates_menu ON article_candidates(menu, status);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON article_candidates(raw_source, raw_source_id);

-- 상태 전이 감사 추적: 모든 전이(자동 수집→후보 포함)를 1행씩 남긴다.
-- id는 KST 초 단위 동시각 이벤트의 안정적 정렬을 위한 대리키(추가분) — 지정 6개 컬럼은 그대로 보존.
CREATE TABLE IF NOT EXISTS candidate_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cand_id TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now','+9 hours')),
  from_status TEXT,                     -- 최초 생성 시 NULL
  to_status TEXT,
  actor TEXT,                           -- 'system'(자동) | 관리자 이메일 | 기자 slug 등
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_candidate_events_cand ON candidate_events(cand_id, at);
