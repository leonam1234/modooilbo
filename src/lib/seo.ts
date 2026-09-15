import type { Article } from "./types";

export type ArticleContentBlock =
  | { kind: "content"; text: string }
  | { kind: "disclosure"; title: string; paragraphs: string[] };

// 고지 제목을 일반 H2로 내보내면 네이버가 기사 핵심 소제목으로 오인해 검색결과
// 바로가기 칩이나 설명문 후보로 선택할 수 있다. 정확히 이 용도의 제목만 묶고,
// "이해관계자"처럼 기사 주제 자체인 일반 소제목은 건드리지 않는다.
const EDITORIAL_DISCLOSURE_HEADING =
  /^#{2,3}\s*(취재[·\s]?이해관계\s*(?:안내|고지)|이해관계\s*(?:안내|고지)|관계사\s*고지)\s*$/;
// 새 H2 형식을 도입하기 전 발행된 원고의 한 줄 고지. 대괄호 뒤 한 문장만 고지로
// 분리하고 다음 일반 문단까지 삼키지 않는다.
const LEGACY_EDITORIAL_DISCLOSURE =
  /^\[(취재[·\s]?이해관계\s*(?:안내|고지)|이해관계\s*(?:안내|고지)|관계사\s*고지)\]\s*(.+)$/;
const SECTION_HEADING = /^#{2,3}\s+/;
// summary에 명확한 자사 이해관계 문장이 섞인 과거 원고만 메타 후보에서 분리한다.
// 본문에 실제 고지 블록이 있을 때만 적용하므로 일반 기사에서 같은 단어가 나온 경우는 건드리지 않는다.
const EDITORIAL_SUMMARY_SENTENCE =
  /(?:모두일보\s*발행인.{0,40}관여|공정거래법상\s*계열회사\s*관계|모두일보가\s*서비스를\s*독립적으로\s*(?:시험|평가))/;

/**
 * 본문 순서는 유지하면서 이해관계·관계사 고지 구간만 별도 의미 블록으로 묶는다.
 * 렌더러는 이를 H2가 아닌 aside로 표시하고, SEO 설명문 생성기는 이 블록을 제외한다.
 */
export function articleContentBlocks(body: string[]): ArticleContentBlock[] {
  const blocks: ArticleContentBlock[] = [];
  for (let i = 0; i < body.length; i += 1) {
    const text = body[i];
    const legacy = text.match(LEGACY_EDITORIAL_DISCLOSURE);
    if (legacy) {
      blocks.push({ kind: "disclosure", title: legacy[1], paragraphs: [legacy[2].trim()] });
      continue;
    }
    const heading = text.match(EDITORIAL_DISCLOSURE_HEADING);
    if (!heading) {
      blocks.push({ kind: "content", text });
      continue;
    }

    const paragraphs: string[] = [];
    let next = i + 1;
    while (next < body.length && !SECTION_HEADING.test(body[next])) {
      if (body[next].trim()) paragraphs.push(body[next]);
      next += 1;
    }

    // 내용 없는 제목은 일반 본문으로 보존한다. 잘못된 원고를 조용히 숨기지 않는다.
    if (!paragraphs.length) {
      blocks.push({ kind: "content", text });
      continue;
    }

    blocks.push({ kind: "disclosure", title: heading[1], paragraphs });
    i = next - 1;
  }
  return blocks;
}

/** 검색 요약·자동 요약 후보에서 편집상 고지 문단을 제외한 원문 블록. */
export function bodyWithoutEditorialDisclosures(body: string[]): string[] {
  return articleContentBlocks(body)
    .filter((block): block is Extract<ArticleContentBlock, { kind: "content" }> => block.kind === "content")
    .map((block) => block.text);
}

/** 본문에서 고지 블록이 확인된 기사에 한해 summary의 명백한 자사 이해관계 문장만 제외한다. */
function summaryWithoutEditorialDisclosure(summary: string, body: string[]): string {
  const base = summary.trim();
  if (!articleContentBlocks(body).some((block) => block.kind === "disclosure")) return base;
  return base
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !EDITORIAL_SUMMARY_SENTENCE.test(sentence))
    .join(" ")
    .trim();
}

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
  const body = article.body ?? [];
  const base = summaryWithoutEditorialDisclosure(article.summary || "", body);
  if (base.length >= MIN) return base.slice(0, TARGET + 20);
  let out = base;
  for (const para of bodyWithoutEditorialDisclosures(body)) {
    // 소제목·출처·편집상 고지 블록은 설명문에 넣지 않는다.
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
