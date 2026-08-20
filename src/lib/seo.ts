import type { Article } from "./types";

/**
 * 검색 결과용 설명문 — summary 가 짧으면 본문 앞부분을 이어 붙인다.
 *
 * 왜: 빙 웹마스터가 2026-08-20 "meta description 이 너무 짧다"로 57건을 지적했다.
 * 실측하니 표본 50건 중 40건이 150자 미만(중앙값 66자)이었다. 기사 summary 는
 * 한 문장 요약이라 그대로 쓰면 검색 결과에서 정보가 부족하다.
 *
 * ⚠️ 기사 본문·summary 자체는 건드리지 않는다. 화면에 보이는 요약은 그대로 두고
 *    메타 태그에만 확장본을 쓴다 — 원고를 임의로 늘리는 건 편집 영역이다.
 */
const TARGET = 155;
const MIN = 120;

export function metaDescription(article: Pick<Article, "summary" | "body">): string {
  const base = (article.summary || "").trim();
  if (base.length >= MIN) return base.slice(0, TARGET + 20);
  let out = base;
  for (const para of article.body ?? []) {
    // 소제목·출처 블록은 설명문에 넣지 않는다
    const t = para.trim();
    if (!t || t.startsWith("#") || t.startsWith("- ")) continue;
    for (const sent of t.split(/(?<=[.!?])\s+/)) {
      const s = sent.trim();
      if (!s) continue;
      if (out.length >= MIN) return out;
      out = out ? `${out} ${s}` : s;
      if (out.length >= TARGET) return out;
    }
  }
  return out;
}
