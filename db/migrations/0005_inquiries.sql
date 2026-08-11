-- 모두일보 · 제보·문의·채용·광고 접수 저장소 (2026-08-11)
-- 대상 D1: modooilbo-members (binding DB).
-- 성격: additive(신규 테이블 1개 + 인덱스 2개). 기존 테이블 정의 변경·삭제 없음 → 기존 데이터 무영향.
-- 시각: KST 벽시계 규약(datetime('now','+9 hours')) — db/schema.sql 전역 규약과 동일.
--
-- 재실행 안전: 전부 IF NOT EXISTS. ALTER TABLE ADD COLUMN 쓰지 않는다(0002~0004와 동일 원칙).
--
-- [배경] 2026-08-11 감사에서 확인된 것:
--   /tips · /contact · /careers · /advertise 네 폼이 **서버로 아무것도 보내지 않으면서**
--   "정상적으로 접수되었습니다"와 클라이언트에서 만든 가짜 접수번호(MI-YYYYMMDD-NNNN)를
--   띄우고 있었다. 제보자는 접수번호를 보관하지만 데이터는 브라우저 메모리에서 사라진다.
--   언론사 제보 창구이고 /contact 가 정정요청까지 이 폼으로 유도하고 있어 그대로 둘 수 없다.
--
--   메일 발송만으로 끝내지 않고 D1 에도 남기는 이유: 메일러(send_email 바인딩)는 검증된
--   목적지로만 보낼 수 있어 help@modooilbo.com 수신은 되지만, 메일 한 통이 유실되면
--   제보가 통째로 사라진다. 접수 원본은 DB에, 알림은 메일로 — 둘을 분리한다.
--
-- [원격 적용] (배포 직전에 실행):
--   wrangler d1 execute modooilbo-members --remote --file db/migrations/0005_inquiries.sql

CREATE TABLE IF NOT EXISTS inquiries (
  receipt_no  TEXT PRIMARY KEY,          -- MI-YYYYMMDD-NNNN. 서버가 발급한다(클라이언트 생성 금지)
  kind        TEXT NOT NULL,             -- tip | contact | careers | advertise
  category    TEXT,                      -- 폼별 분류값(제보 유형, 문의 유형, 지원 직군 등)
  title       TEXT,
  body        TEXT NOT NULL,
  name        TEXT,
  email       TEXT,
  phone       TEXT,
  attachment_name TEXT,                  -- 파일명만 기록한다. 실제 업로드는 받지 않는다
  client_ip   TEXT,
  user_agent  TEXT,
  mail_sent   INTEGER NOT NULL DEFAULT 0,-- 알림 메일 발송 성공 여부(0/1). 실패해도 접수는 유효
  created_at  TEXT NOT NULL DEFAULT (datetime('now','+9 hours'))
);

-- 접수함을 최신순으로 훑는 경로
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);
-- 유형별로 걸러 보는 경로(제보만, 광고문의만 등)
CREATE INDEX IF NOT EXISTS idx_inquiries_kind_created ON inquiries(kind, created_at DESC);
