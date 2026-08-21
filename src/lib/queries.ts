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

/**
 * 히어로 보조 기사 — 종합뉴스와 사업 축을 절반씩 섞는다(2026-08-21 결정).
 *
 * 종전엔 서브리드도 종합뉴스 전용이었는데, 발행량은 하루 24편 중 12편(누적 993편 중 470편,
 * 47%)이 사업 축이라 대문 상단이 발행 실태와 어긋나 있었다. 리드 1건과 속보 티커는
 * 종합뉴스 전용을 그대로 유지하고(톱기사 톤 보존), 보조 4칸만 50:50으로 맞춘다.
 *
 * 한쪽 축이 모자라면 다른 축이 채워 항상 count 를 채운다 — 빈 슬롯이 생기면 히어로
 * 레이아웃에 구멍이 난다.
 */
/**
 * 최신순 목록에서 n건을 뽑되 카테고리가 겹치지 않는 것을 먼저 채운다.
 *
 * 그냥 최신순 slice 를 쓰면 같은 카테고리가 나란히 걸린다 — 하루 24편이 카테고리별 2편씩
 * 묶여 같은 시각으로 들어오기 때문에 드문 일이 아니다(2026-08-21 홈에서 공공입찰 2건이
 * 연속으로 잡혔다). 서로 다른 축이 안 보이면 보조 4칸을 둔 의미가 없다.
 * 후보가 모자라면 남은 것으로 채워 항상 n 을 맞춘다.
 */
function pickVaried(list: Article[], n: number): Article[] {
  const seen = new Set<CategorySlug>();
  const picked = list.filter((a) => !seen.has(a.category) && (seen.add(a.category), true)).slice(0, n);
  if (picked.length < n) {
    const chosen = new Set(picked.map((a) => a.id));
    picked.push(...list.filter((a) => !chosen.has(a.id)).slice(0, n - picked.length));
  }
  return picked;
}

export function getSubLeads(count = 4): Article[] {
  const lead = getLeadArticle();
  const pool = getAllArticles().filter((a) => a.id !== lead.id && a.type !== "opinion");
  const biz = pickVaried(pool.filter((a) => !isGeneralNews(a)), Math.floor(count / 2));
  const general = pickVaried(pool.filter(isGeneralNews), count - biz.length);
  // 종합뉴스가 모자랐다면 남은 칸을 사업 축이 더 가져간다(위 biz slice 밖의 기사로 보충).
  const picked = [...general, ...biz];
  if (picked.length < count) {
    const chosen = new Set(picked.map((a) => a.id));
    picked.push(...pool.filter((a) => !chosen.has(a.id)).slice(0, count - picked.length));
  }
  // 뽑은 뒤 최신순으로 되돌린다 — 축별로 뭉쳐 있으면 발행 시각 순서와 어긋나 보인다.
  return picked.sort(byNewest);
}

/** 속보 시효 판정은 `lib/breaking`으로 옮겼다 — 전체 기사 배열이 아니라 최신 발행시각 상수만 쓴다.
 *  (속보 배지를 그리는 TypeBadge가 이 모듈을 임포트하면 클라이언트 번들에 코퍼스가 딸려온다)
 *  기존 임포트 경로 호환을 위해 여기서 다시 내보낸다. */
import { isBreakingFresh } from "./breaking";
export { isBreakingFresh, BREAKING_TTL_MS } from "./breaking";

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

/**
 * '많이 본' 정적 fallback — 신선한 글 먼저(조회수순), 모자라면 오래된 글(조회수순)로 채움.
 *
 * ⚠️ 실조회수 신호는 KV에만 있고(/api/most-read), 빌드 데이터의 readCount는 전 기사 0이다.
 *    즉 여기서 조회수 비교는 항상 동률 → 2차 기준이 없으면 정렬이 원본 배열 순서(=슬러그
 *    알파벳순 ≈ 오래된 글 먼저)로 새어 "많이 본"이라며 가장 오래된 글을 노출하게 된다.
 *    그래서 동률일 때 **최신 발행순**을 명시적 2차 기준으로 둔다.
 *    이는 /api/most-read 의 정렬(조회수 desc → 동률은 발행 desc)과 의미가 일치한다 —
 *    두 경로 모두 "조회 신호가 없으면 최신순"이라는 같은 약속을 지킨다.
 */
export function getMostRead(count = 5): Article[] {
  const byReadThenNewest = (a: Article, b: Article) => b.readCount - a.readCount || byNewest(a, b);
  // 광고(sponsor)는 랭킹 경쟁에서 제외한다 — 광고가 '많이 본 뉴스'에 뉴스처럼 오르면
  // 표기를 해도 매체가 자사 광고를 밀어주는 프레임으로 읽힌다(2026-08-20 외부 점검).
  const eligible = (a: Article) => !a.sponsor;
  // getAllArticles()는 공유 캐시 참조라 정렬 전 filter로 새 배열을 만든 뒤에만 sort한다.
  const fresh = getAllArticles().filter(eligible).filter(isHomeFresh).sort(byReadThenNewest);
  const stale = getAllArticles()
    .filter(eligible)
    .filter((a) => !isHomeFresh(a))
    .sort(byReadThenNewest);
  return [...fresh, ...stale].slice(0, count);
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
