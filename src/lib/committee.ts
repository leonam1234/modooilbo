/**
 * 이용자위원회 구성·회의 기록.
 *
 * ⚠️ 여기에 사람 이름을 임의로 채우지 말 것. 실제 위촉장을 드린 분만 올린다.
 *    위원회는 "만들었다"가 아니라 "굴리고 증빙이 있다"가 실체다. 명단만 있고 회의록이
 *    없으면 안 만든 것만 못하다(네이버 정량평가도 구성과 운영을 따로 채점한다).
 *
 * 회의록은 삭제하지 않는다. 규칙 제15조에 따라 3년 보존이 원칙이고, 포털 제휴 심사는
 * 과거 기록을 통째로 제출받으므로 지운 기록은 그 기간을 통째로 무효로 만든다.
 */

export type CommitteeMember = {
  name: string;
  affiliation: string; // 소속·직함
  role: "위원장" | "위원" | "간사";
  external: boolean; // 외부 위원 여부 — 규칙 제4조의 외부 과반 요건 확인용
  appointedAt: string; // 위촉일 YYYY-MM-DD
};

export type CommitteeMinutes = {
  round: number; // 회차
  heldAt: string; // 개최일 YYYY-MM-DD
  format: "대면" | "비대면" | "서면";
  attendees: string[];
  agenda: string[];
  opinions: string[]; // 위원회가 낸 의견·권고
  response: string; // 편집국 처리 결과 또는 계획 (규칙 제13조: 30일 내 통보)
  respondedAt?: string;
};

/**
 * 위촉된 위원. 위촉 전에는 빈 배열을 유지한다.
 *
 * ── 확정 구성안 (2026-08-10) ─────────────────────────────────
 * 5인 = 외부 3(그중 위원장 호선) + 내부 2. 외부 3인의 수락서가 모두
 * 걷힌 날, 아래 틀의 주석을 풀고 빈칸을 채워 한꺼번에 공개한다.
 * 내부 2명만 먼저 올리면 "외부 과반"(제4조 ②) 미달 상태가 공개되므로
 * 부분 공개는 하지 않는다.
 *
 * appointedAt 은 수락서의 서명일. 위원장은 첫 회의 호선 후 role 을
 * "위원장"으로 바꾼다(그 전까지는 전원 "위원").
 *
 * [외부1] { name: "", affiliation: "", role: "위원", external: true,  appointedAt: "" },
 * [외부2] { name: "", affiliation: "", role: "위원", external: true,  appointedAt: "" },
 * [외부3] { name: "", affiliation: "", role: "위원", external: true,  appointedAt: "" },
 * [내부1] { name: "남동균", affiliation: "모두일보 편집인", role: "위원", external: false, appointedAt: "" },
 * [내부2] { name: "박유주", affiliation: "모두일보 고충처리인", role: "간사", external: false, appointedAt: "" },
 *   — 간사는 규칙 제8조 ②에 따라 고충처리인이 자동 겸직(2026-08-20 기준 박유주).
 * ────────────────────────────────────────────────────────────
 */
export const COMMITTEE_MEMBERS: CommitteeMember[] = [];

/** 회의록. 최신 회차가 앞에 오도록 정렬해 사용한다. */
export const COMMITTEE_MINUTES: CommitteeMinutes[] = [];
