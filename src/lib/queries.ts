import type { Article, CategorySlug } from "./types";
import { ALL_ARTICLES as ARTICLES } from "./news";

const byNewest = (a: Article, b: Article) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

export function getAllArticles(): Article[] {
  return [...ARTICLES].sort(byNewest);
}

export function getLeadArticle(): Article {
  return ARTICLES.find((a) => a.isLead) ?? getAllArticles()[0];
}

export function getSubLeads(count = 4): Article[] {
  const lead = getLeadArticle();
  return getAllArticles()
    .filter((a) => a.id !== lead.id && a.type !== "opinion")
    .slice(0, count);
}

export function getBreaking(count = 6): Article[] {
  const breaking = getAllArticles().filter((a) => a.isBreaking);
  return (breaking.length ? breaking : getAllArticles()).slice(0, count);
}

export function getByCategory(slug: CategorySlug, count?: number): Article[] {
  const list = getAllArticles().filter((a) => a.category === slug);
  return count ? list.slice(0, count) : list;
}

export function getMostRead(count = 5): Article[] {
  return [...ARTICLES].sort((a, b) => b.readCount - a.readCount).slice(0, count);
}

export function getOpinion(count = 4): Article[] {
  return getAllArticles()
    .filter((a) => a.type === "opinion" || a.category === "opinion")
    .slice(0, count);
}

export function getMultimedia(count = 4): Article[] {
  return getAllArticles()
    .filter((a) => a.type === "photo" || a.type === "video")
    .slice(0, count);
}

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/** 같은 카테고리에서 발행순으로 인접한 이전(더 과거)·다음(더 최신) 기사. */
export function getPrevNext(article: Article): { prev: Article | null; next: Article | null } {
  const cat = getAllArticles().filter((a) => a.category === article.category); // 최신순
  const i = cat.findIndex((a) => a.id === article.id);
  if (i === -1) return { prev: null, next: null };
  return {
    next: i > 0 ? cat[i - 1] : null, // 더 최신(다음)
    prev: i < cat.length - 1 ? cat[i + 1] : null, // 더 과거(이전)
  };
}

/** 문단에서 첫 문장만 추출(너무 길면 말줄임). 규칙 기반 — 외부 API 없음. */
function firstSentence(paragraph: string): string {
  const m = paragraph.match(/^.*?(?:다\.|요\.|[.!?])(?=["”')\]]*(?:\s|$))/);
  let s = (m ? m[0] : paragraph).trim();
  if (s.length > 90) s = `${s.slice(0, 88).trimEnd()}…`;
  return s;
}

/**
 * 세 줄 요약 — 본문 문단의 첫 문장 3개를 정적으로 추출(빌드 타임 결정적).
 * 리드 문단(summary)은 기사 상단에 이미 노출되므로 본문에서만 뽑는다.
 */
export function getThreeLineSummary(article: Article): string[] {
  const lines: string[] = [];
  for (const p of article.body) {
    if (lines.length >= 3) break;
    if (p.startsWith("![")) continue; // 인라인 이미지 문단 제외
    const s = firstSentence(p);
    if (s && s !== article.summary.trim() && !lines.includes(s)) lines.push(s);
  }
  return lines;
}

export function getRelated(article: Article, count = 4): Article[] {
  const sameCat = getAllArticles().filter(
    (a) => a.id !== article.id && a.category === article.category,
  );
  if (sameCat.length >= count) return sameCat.slice(0, count);
  const others = getAllArticles().filter(
    (a) => a.id !== article.id && a.category !== article.category,
  );
  return [...sameCat, ...others].slice(0, count);
}
