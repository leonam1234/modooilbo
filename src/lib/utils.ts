/** 조건부 className 결합 (의존성 없는 경량 cn) */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * "KST 벽시계-as-Z" 저장 문자열(예: 04:30 KST가 "...T04:30:00Z"로 저장됨)을
 * 화면 표시와 일치하는 +09:00 오프셋 ISO로 변환한다.
 * 기계가 읽는 시각(JSON-LD datePublished/dateModified, <time datetime>, news-sitemap
 * publication_date)에 반드시 이걸 경유시킬 것 — 원문 "...Z"를 그대로 내보내면
 * 04:30 KST가 04:30 UTC(=13:30 KST)로 해석돼 9시간 미래가 된다.
 * (sitemap.ts는 -9h 보정, rss.xml은 +0900 부착으로 이미 같은 규약을 처리한다.)
 */
export function toKstIso(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+09:00`;
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
