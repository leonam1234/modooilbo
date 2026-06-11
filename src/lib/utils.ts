/** 조건부 className 결합 (의존성 없는 경량 cn) */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** ISO 문자열 → "YYYY.MM.DD HH:mm" (한국식, SSR 안전·결정적) */
export function formatKoreanDateTime(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

/** ISO 문자열 → "M월 D일" */
export function formatKoreanDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

/** 큰 숫자 → "1.2만" / "3,456" 형식 */
export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  return n.toLocaleString("ko-KR");
}
