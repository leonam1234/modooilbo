import { formatKoreanDateTime } from "@/lib/utils";

/**
 * 종료된 행사·접수 안내 — 기사 상단에 붙는다.
 *
 * [왜 있나] 전시·공연·마감 기사는 기간이 끝나도 검색 노출이 그대로 남는다.
 * 2026-08-18 네이버 실측에서 국립중앙박물관 여름 연장운영 기사가 노출 36,703회를
 * 유지한 채 내용은 전날 만료된 상태였고, 그대로 두면 독자가 끝난 정보를 보고 헛걸음한다.
 *
 * 기사 본문은 손대지 않는다 — 뉴스는 발행 시점의 기록이므로 사후에 고쳐 쓰지 않고
 * "지금은 끝났다"는 사실만 덧붙인다. 표시 여부는 서버 렌더 시점(빌드)에 결정되며,
 * 정적 사이트라 다음 배포 때 갱신된다(하루 여러 번 배포하므로 실무상 충분하다).
 */
export function EventEndedNotice({ endsAt }: { endsAt?: string }) {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;
  // KST 벽시계-as-Z 규약 — 저장값끼리 비교해야 시차 오차가 없다.
  if (end > Date.now() + 9 * 60 * 60 * 1000) return null;

  return (
    <aside
      role="note"
      className="mt-6 rounded-lg border border-amber-300/70 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <b className="font-semibold">종료된 사안입니다.</b>{" "}
      이 기사가 다룬 행사·접수는 {formatKoreanDateTime(endsAt)}에 종료됐습니다. 기사는 발행 당시의 기록이며
      이후 변경된 내용은 반영돼 있지 않습니다. 현재 운영·접수 상황은 주관기관 공식 안내에서 확인하세요.
    </aside>
  );
}
