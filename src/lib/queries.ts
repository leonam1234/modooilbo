import type { Article, CategorySlug } from "./types";
import { ALL_ARTICLES as ARTICLES } from "./news";
import { isBizCategory } from "./categories";

// 종합뉴스 홈 히어로/서브리드/속보는 종합뉴스 축만 노출한다(사업 축=정부지원금 등이 대문
// 톱기사·속보 티커를 점유해 종합뉴스 톤을 흐리지 않도록). 사업 축 기사는 홈의 별도 '기업 데이터'
// 섹션군(BizSectionGroup)과 자기 카테고리 페이지·헤더 사업 메뉴로 노출된다.
const isGeneralNews = (a: Article) => !isBizCategory(a.category);

const byNewest = (a: Article, b: Article) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

// 최신순 정렬 결과를 모듈 로드 시 1회만 계산해 캐시(빌드 타임).
// 호출부는 결과를 변형하지 않고 filter/find/slice/index만 하므로 공유 참조 반환이 안전.
// (이전엔 매 호출 [...ARTICLES].sort → getMostRead가 isHomeFresh를 2N회 부르며 O(N²·logN))
let _sorted: Article[] | null = null;
export function getAllArticles(): Article[] {
  return (_sorted ??= [...ARTICLES].sort(byNewest));
}

/** 홈 신선도(5일) — 속보 시효와 같은 방식: 최신 발행 시각 기준 상대 나이라 빌드 결정적.
 *  오래된 글을 홈에서 제외하진 않되(빈 섹션 방지) 우선순위만 강등한다. */
const HOME_FRESH_MS = 5 * 24 * 60 * 60 * 1000;
export function isHomeFresh(a: Pick<Article, "publishedAt">): boolean {
  const newest = getAllArticles()[0];
  if (!newest) return true;
  return new Date(newest.publishedAt).getTime() - new Date(a.publishedAt).getTime() <= HOME_FRESH_MS;
}

export function getLeadArticle(): Article {
  const marked = ARTICLES.find((a) => a.isLead && isGeneralNews(a));
  if (marked && isHomeFresh(marked)) return marked;
  // 지정 리드가 낡았으면 최신 일반(종합뉴스) 기사가 대문을 차지
  return (
    getAllArticles().find((a) => a.type !== "opinion" && isGeneralNews(a)) ??
    getAllArticles().find((a) => a.type !== "opinion") ??
    getAllArticles()[0]
  );
}

export function getSubLeads(count = 4): Article[] {
  const lead = getLeadArticle();
  return getAllArticles()
    .filter((a) => a.id !== lead.id && a.type !== "opinion" && isGeneralNews(a))
    .slice(0, count);
}

/** 속보 시효(48시간) — 벽시계(Date.now) 대신 '가장 최신 발행 시각' 기준이라 빌드 결정적.
 *  발행이 이어지는 한 이틀 지난 기사는 속보 취급이 자동 해제된다. */
const BREAKING_TTL_MS = 48 * 60 * 60 * 1000;
export function isBreakingFresh(a: Pick<Article, "isBreaking" | "publishedAt">): boolean {
  if (!a.isBreaking) return false;
  const newest = getAllArticles()[0];
  if (!newest) return false;
  return new Date(newest.publishedAt).getTime() - new Date(a.publishedAt).getTime() <= BREAKING_TTL_MS;
}

export function getBreaking(count = 6): Article[] {
  // 속보 티커는 종합뉴스 전면 요소 — 사업 축(정부지원금 등)은 제외(폴백 최신글에도 섞이지 않게).
  const general = getAllArticles().filter(isGeneralNews);
  const breaking = general.filter(isBreakingFresh);
  return (breaking.length ? breaking : general).slice(0, count);
}

export function getByCategory(slug: CategorySlug, count?: number): Article[] {
  const list = getAllArticles().filter((a) => a.category === slug);
  return count ? list.slice(0, count) : list;
}

export function getMostRead(count = 5): Article[] {
  // 신선한 글 먼저(조회수순), 모자라면 오래된 글(조회수순)로 채움
  const byRead = (a: Article, b: Article) => b.readCount - a.readCount;
  const fresh = ARTICLES.filter(isHomeFresh).sort(byRead);
  const stale = ARTICLES.filter((a) => !isHomeFresh(a)).sort(byRead);
  return [...fresh, ...stale].slice(0, count);
}

export function getOpinion(count = 4): Article[] {
  return getAllArticles()
    .filter((a) => a.type === "opinion" || a.category === "opinion")
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
    if (p.startsWith("#")) continue; // 소제목(## / ###) 문단 제외
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
