/**
 * 기사 후보 점수화 — paseco 원천 공고(programs) 1건 → 100점 만점 7항목.
 *
 * 설계 원칙
 * - 순수 함수(외부 바인딩·전역 의존 없음) → 단위 검증 가능. 렌더 경로가 아니라 Functions에서만 호출.
 * - null 안전: 금액/마감/컬럼이 NULL이면 해당 항목 0점(과대평가 금지).
 * - 결정론: 마감·신규성은 기준시각 `nowMs`를 인자로 받는다(기본=현재). 같은 입력·같은 nowMs면 항상 같은 점수.
 *
 * 배점 (합 100)
 *   마감임박 20 · 대상범위 20 · 금액규모 15 · 신규성 15 · 행동명확성 15 · 필드완전성 10 · 영상화 5
 * 등급(triage)
 *   70↑ = 검토 / 50~69 = 브리핑묶음 / <50 = 저장만
 */

/** paseco `programs` 테이블 한 행(모두일보에서 read-only로 조회). NULL 허용. */
export interface ProgramRow {
  id?: string | null;
  title?: string | null;
  org?: string | null;
  field?: string | null;
  region?: string | null;
  target?: string | null;
  target_type?: string | null;
  biz_enyy?: string | null;
  period_end_raw?: string | null; // YYYYMMDD
  recruiting?: number | null;
  active?: number | null;
  url?: string | null;
  apply_url?: string | null;
  content?: string | null;
  source?: string | null;
  source_id?: string | null;
  content_hash?: string | null;
  amount_min?: number | null;
  amount_max?: number | null;
  industry_code?: string | null;
  first_seen?: string | null; // 'YYYY-MM-DD HH:MM:SS'(KST 벽시계) 또는 ISO
  last_seen?: string | null;
}

export interface ScoreBreakdown {
  deadline: number; // 마감임박 /20
  targetScope: number; // 대상범위 /20
  amount: number; // 금액규모 /15
  novelty: number; // 신규성 /15
  actionClarity: number; // 행동명확성 /15
  completeness: number; // 필드완전성 /10
  video: number; // 영상화 /5
}

export type CandidateGrade = "검토" | "브리핑묶음" | "저장만";

export interface ScoreResult {
  score: number; // 0~100
  grade: CandidateGrade;
  breakdown: ScoreBreakdown;
  videoScore: number; // 0~100(쇼츠 대기열 전용 신호 — 100점 총점과 별개)
  daysLeft: number | null; // 마감까지 남은 일수(참고). 파싱 실패 시 null
}

const DAY_MS = 86_400_000;

/** 'YYYYMMDD' → UTC 자정 ms. 실패 시 null. */
function parseYmd(raw?: string | null): number | null {
  if (!raw) return null;
  const s = String(raw).trim().replace(/[^0-9]/g, "");
  if (s.length !== 8) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const ms = Date.UTC(y, m - 1, d);
  return Number.isNaN(ms) ? null : ms;
}

/** 'YYYY-MM-DD HH:MM:SS' 또는 ISO → ms. 실패 시 null. */
function parseTs(raw?: string | null): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // SQLite datetime('now','+9 hours') 형식: 공백 구분 → ISO로 보정
  const iso = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s) ? s.replace(" ", "T") + "Z" : s;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function nonEmpty(v?: unknown): boolean {
  return v !== null && v !== undefined && String(v).trim() !== "";
}

// ── 항목 1: 마감임박 (max 20) ──────────────────────────────────────────────
// 마감이 없거나 이미 지났으면 뉴스가치 낮음 → 0. 임박할수록 높음.
function scoreDeadline(row: ProgramRow, nowMs: number): { pts: number; daysLeft: number | null } {
  const end = parseYmd(row.period_end_raw);
  if (end === null) return { pts: 0, daysLeft: null };
  const daysLeft = Math.floor((end - nowMs) / DAY_MS);
  if (daysLeft < 0) return { pts: 0, daysLeft }; // 마감 지남
  let pts: number;
  if (daysLeft <= 3) pts = 20;
  else if (daysLeft <= 7) pts = 16;
  else if (daysLeft <= 14) pts = 12;
  else if (daysLeft <= 30) pts = 8;
  else if (daysLeft <= 60) pts = 4;
  else pts = 2;
  return { pts, daysLeft };
}

// ── 항목 2: 대상범위 (max 20) ──────────────────────────────────────────────
// 대상이 넓을수록(많은 기업 해당) 뉴스가치 높음. target/target_type 자유텍스트 휴리스틱.
const BROAD_RE = /(전국|누구나|제한\s*없|모든|전체|중소기업|소상공인|자영업|1인\s*기업|예비창업|일반)/;
const NARROW_RE = /(지정|선정된|기존\s*참여|특정|한정|추천|협약|회원사|입주|졸업|재직|이전\s*수혜)/;
function scoreTargetScope(row: ProgramRow): number {
  const t = `${row.target ?? ""} ${row.target_type ?? ""} ${row.field ?? ""}`.trim();
  if (!nonEmpty(t)) return 0; // 컬럼 전부 비면 0
  if (BROAD_RE.test(t)) return 20;
  if (NARROW_RE.test(t)) return 6;
  return 8; // 존재하나 범위 판별 불가
}

// ── 항목 3: 금액규모 (max 15) ──────────────────────────────────────────────
// amount_max 우선, 없으면 amount_min. 둘 다 NULL이면 0.
function scoreAmount(row: ProgramRow): number {
  const amt = pickAmount(row);
  if (amt === null) return 0;
  if (amt >= 1_000_000_000) return 15; // 10억+
  if (amt >= 100_000_000) return 12; // 1억+
  if (amt >= 30_000_000) return 9; // 3천만+
  if (amt >= 10_000_000) return 6; // 1천만+
  if (amt > 0) return 3;
  return 0;
}
function pickAmount(row: ProgramRow): number | null {
  const max = typeof row.amount_max === "number" && row.amount_max > 0 ? row.amount_max : null;
  const min = typeof row.amount_min === "number" && row.amount_min > 0 ? row.amount_min : null;
  return max ?? min;
}

// ── 항목 4: 신규성 (max 15) ────────────────────────────────────────────────
// first_seen이 최근일수록 신규. first_seen 없으면 recruiting 플래그로 보수적 대체(없으면 0).
function scoreNovelty(row: ProgramRow, nowMs: number): number {
  const seen = parseTs(row.first_seen);
  if (seen !== null) {
    const days = Math.floor((nowMs - seen) / DAY_MS);
    if (days <= 1) return 15;
    if (days <= 3) return 12;
    if (days <= 7) return 8;
    if (days <= 14) return 4;
    return 1;
  }
  // first_seen 미상: 모집중이면 부분 인정, 아니면 0(과대평가 금지)
  return row.recruiting ? 6 : 0;
}

// ── 항목 5: 행동명확성 (max 15) ────────────────────────────────────────────
// 독자가 바로 신청할 수 있는가. apply_url 최상, url 차선, 둘 다 없으면 0.
function scoreActionClarity(row: ProgramRow): number {
  if (nonEmpty(row.apply_url)) return 15;
  if (nonEmpty(row.url)) return 9;
  return 0;
}

// ── 항목 6: 필드완전성 (max 10) ────────────────────────────────────────────
// 기사화에 필요한 핵심 필드 충족 비율. NULL 많을수록 낮음.
function scoreCompleteness(row: ProgramRow): number {
  const checks = [
    nonEmpty(row.title),
    nonEmpty(row.org),
    nonEmpty(row.field),
    nonEmpty(row.region),
    nonEmpty(row.target) || nonEmpty(row.target_type),
    parseYmd(row.period_end_raw) !== null,
    pickAmount(row) !== null,
    nonEmpty(row.url) || nonEmpty(row.apply_url),
    nonEmpty(row.industry_code),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 10);
}

// ── 항목 7: 영상화 (max 5) ─────────────────────────────────────────────────
// 쇼츠로 만들기 좋은 신호(큰 금액 + 임박 + 넓은 대상). 100점 총점에 포함되는 5점.
function scoreVideo(deadlinePts: number, amountPts: number, targetPts: number): number {
  let v = 0;
  if (amountPts >= 12) v += 2; // 1억+ 금액
  else if (amountPts >= 6) v += 1;
  if (deadlinePts >= 16) v += 2; // 7일 이내 임박
  else if (deadlinePts >= 12) v += 1;
  if (targetPts >= 20) v += 1; // 넓은 대상
  return Math.min(5, v);
}

/** 쇼츠 대기열 전용 0~100 신호(기사 총점과 별개). 임계 이상만 쇼츠 제작 후보. */
function computeVideoScore(b: ScoreBreakdown): number {
  // 금액(40) + 마감임박(30) + 대상범위(30) 가중 — 영상은 "임팩트 숫자·마감·해당범위"가 핵심.
  const amount = (b.amount / 15) * 40;
  const deadline = (b.deadline / 20) * 30;
  const scope = (b.targetScope / 20) * 30;
  return Math.round(amount + deadline + scope);
}

/**
 * 공고 1건을 점수화한다.
 * @param row  paseco programs 한 행(read-only)
 * @param nowMs 기준시각(ms). 기본 = 호출 시각. 테스트는 고정값 주입.
 */
export function scoreProgram(row: ProgramRow, nowMs: number = Date.now()): ScoreResult {
  const dl = scoreDeadline(row, nowMs);
  const targetScope = scoreTargetScope(row);
  const amount = scoreAmount(row);
  const novelty = scoreNovelty(row, nowMs);
  const actionClarity = scoreActionClarity(row);
  const completeness = scoreCompleteness(row);
  const video = scoreVideo(dl.pts, amount, targetScope);

  const breakdown: ScoreBreakdown = {
    deadline: dl.pts,
    targetScope,
    amount,
    novelty,
    actionClarity,
    completeness,
    video,
  };
  const score =
    breakdown.deadline +
    breakdown.targetScope +
    breakdown.amount +
    breakdown.novelty +
    breakdown.actionClarity +
    breakdown.completeness +
    breakdown.video;

  return {
    score,
    grade: gradeOf(score),
    breakdown,
    videoScore: computeVideoScore(breakdown),
    daysLeft: dl.daysLeft,
  };
}

export function gradeOf(score: number): CandidateGrade {
  if (score >= 70) return "검토";
  if (score >= 50) return "브리핑묶음";
  return "저장만";
}
