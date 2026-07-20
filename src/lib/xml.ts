/**
 * XML 텍스트 이스케이프 — RSS·사이트맵 등 손으로 조립하는 XML 피드 공용.
 *
 * 기사 제목·요약에는 `&`, 따옴표, 부등호가 실제로 등장한다. 이스케이프를 빠뜨리면
 * 피드 전체가 파싱 실패(not well-formed)로 통째로 버려지므로, 피드에 넣는 모든
 * 텍스트 노드·속성값은 반드시 이 함수를 경유시킨다.
 */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
