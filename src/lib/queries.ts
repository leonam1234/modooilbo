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
