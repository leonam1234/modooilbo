/** KST 저장 문자열 → 상대 시각. */
export function timeAgo(kst: string): string {
  const t = new Date(`${kst.replace(" ", "T")}+09:00`).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "방금 전";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
  return kst.slice(0, 10).replaceAll("-", ".") + ".";
}
