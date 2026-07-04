import type { Article, CategorySlug } from "./types";
import { ALL_ARTICLES as ARTICLES } from "./news";
import { AUTHORS, type AuthorProfile } from "./authors";

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

export function getAuthors(): AuthorProfile[] {
  return AUTHORS;
}

export function getAuthorBySlug(slug: string): AuthorProfile | undefined {
  return AUTHORS.find((p) => p.slug === slug);
}

export function getByAuthor(slug: string, count?: number): Article[] {
  const author = getAuthorBySlug(slug);
  if (!author) return [];
  const list = getAllArticles().filter((a) => a.author.name === author.name); // getAllArticles가 이미 최신순
  return count ? list.slice(0, count) : list;
}
