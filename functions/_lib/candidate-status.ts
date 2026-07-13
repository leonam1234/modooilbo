/**
 * 기사 후보 상태기계 — 수집 → 후보 → 초안 → 검증중 → 승인 → 발행대기 → 발행완료 → 제외.
 *
 * 안전 규칙
 * - 유효 전이만 허용(불법 전이는 거부). 모든 전이는 candidate_events에 기록(감사 추적).
 * - **자동 전이는 `수집 → 후보`까지만.** 초안 이후는 사람 게이트(관리자 actor 필수) → 무검수 자동발행 금지.
 *
 * 순수부(STATUSES/TRANSITIONS/canTransition/isAutoTransition)는 DB 없이 단위 검증 가능.
 * DB부(applyTransition/insertEvent)는 modooilbo-members(D1)만 사용.
 */

export type CandidateStatus =
  | "수집"
  | "후보"
  | "초안"
  | "검증중"
  | "승인"
  | "발행대기"
  | "발행완료"
  | "제외";

export const STATUSES: CandidateStatus[] = [
  "수집",
  "후보",
  "초안",
  "검증중",
  "승인",
  "발행대기",
  "발행완료",
  "제외",
];

/**
 * 허용 전이표. 전진(정상 흐름) + 반려(뒤로) + 제외(대부분 상태에서 가능) + 복원.
 * 여기 없는 (from→to)는 전부 불법.
 */
export const TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  수집: ["후보", "제외"],
  후보: ["초안", "제외"],
  초안: ["검증중", "후보", "제외"], // 후보로 반려 가능
  검증중: ["승인", "초안", "제외"], // 초안으로 반려 가능
  승인: ["발행대기", "검증중", "제외"], // 검증중으로 되돌림
  발행대기: ["발행완료", "승인", "제외"],
  발행완료: ["제외"], // 게시 취소(내림)만
  제외: ["후보"], // 재검토 복원
};

/** 자동(actor='system')으로 허용되는 전이 — 오직 수집→후보. */
const AUTO_TRANSITIONS = new Set<string>(["수집>후보"]);

export function isValidStatus(s: unknown): s is CandidateStatus {
  return typeof s === "string" && (STATUSES as string[]).includes(s);
}

export function canTransition(from: CandidateStatus, to: CandidateStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isAutoTransition(from: CandidateStatus, to: CandidateStatus): boolean {
  return AUTO_TRANSITIONS.has(`${from}>${to}`);
}

export interface TransitionResult {
  ok: boolean;
  from?: CandidateStatus;
  to?: CandidateStatus;
  error?: string;
}

interface CandDB {
  DB: any;
}

/** candidate_events에 1행 기록(전이·생성 공용). */
export async function insertEvent(
  env: CandDB,
  candId: string,
  from: CandidateStatus | null,
  to: CandidateStatus,
  actor: string,
  note?: string,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO candidate_events (cand_id, from_status, to_status, actor, note) VALUES (?1, ?2, ?3, ?4, ?5)",
  )
    .bind(candId, from, to, actor, note ?? null)
    .run();
}

/**
 * 후보의 상태를 전이한다. 현재 상태를 읽어 유효성 검사 → 갱신 → 이벤트 기록.
 * - actor='system'인데 자동 허용 전이가 아니면 거부(사람 게이트).
 * - 불법 전이·미존재 후보는 ok:false.
 */
export async function applyTransition(
  env: CandDB,
  candId: string,
  to: CandidateStatus,
  actor: string,
  opts: { note?: string; publishedSlug?: string } = {},
): Promise<TransitionResult> {
  if (!isValidStatus(to)) return { ok: false, error: "잘못된 상태값입니다." };

  const row = (await env.DB.prepare(
    "SELECT status FROM article_candidates WHERE cand_id = ?1",
  )
    .bind(candId)
    .first()) as { status?: string } | null;
  if (!row || !isValidStatus(row.status)) {
    return { ok: false, error: "후보를 찾을 수 없습니다." };
  }
  const from = row.status as CandidateStatus;

  if (from === to) return { ok: false, from, to, error: "이미 해당 상태입니다." };
  if (!canTransition(from, to)) {
    return { ok: false, from, to, error: `허용되지 않은 전이입니다: ${from} → ${to}` };
  }
  if (actor === "system" && !isAutoTransition(from, to)) {
    return { ok: false, from, to, error: "자동 전이는 수집→후보까지만 가능합니다(사람 검수 필요)." };
  }

  // 발행완료 전이 시 published_slug 함께 기록(있으면).
  if (to === "발행완료" && opts.publishedSlug) {
    await env.DB.prepare(
      "UPDATE article_candidates SET status = ?2, published_slug = ?3, updated_at = datetime('now','+9 hours') WHERE cand_id = ?1",
    )
      .bind(candId, to, opts.publishedSlug)
      .run();
  } else {
    await env.DB.prepare(
      "UPDATE article_candidates SET status = ?2, updated_at = datetime('now','+9 hours') WHERE cand_id = ?1",
    )
      .bind(candId, to)
      .run();
  }

  await insertEvent(env, candId, from, to, actor, opts.note);
  return { ok: true, from, to };
}
