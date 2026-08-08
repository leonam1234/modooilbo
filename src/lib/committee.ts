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

/** 위촉된 위원. 위촉 전에는 빈 배열을 유지한다. */
export const COMMITTEE_MEMBERS: CommitteeMember[] = [];

/** 회의록. 최신 회차가 앞에 오도록 정렬해 사용한다. */
export const COMMITTEE_MINUTES: CommitteeMinutes[] = [];
