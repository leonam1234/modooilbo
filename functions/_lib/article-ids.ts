/**
 * 실재하는 기사 id 화이트리스트 — D1에 행을 만드는 모든 엔드포인트의 공통 관문.
 *
 * [왜 형식 검사만으로는 부족한가]
 * 형식 검사(영숫자·하이픈 81자)만 통과시키면 임의 문자열이 전부 유효해진다.
 * 무인증 POST 엔드포인트(view·reactions)는 그 문자열마다 D1에 행을 만들었고,
 * 지우는 코드가 없는 테이블(article_views·reaction_counts)은 **영구히 쌓인다**.
 * 스크립트 하나로 저장 한도·요금·백업 크기를 밀어올릴 수 있었다.
 * → 실재하는 기사가 아니면 **D1에 닿기 전에** 거절한다.
 *
 * [드리프트 방지]
 * 2026-07-21 감사에서 view.ts 에만 이 방어가 들어갔고 reactions.ts 는 빠져 있었다.
 * 같은 규칙이 파일마다 복제되면 한쪽만 고쳐지는 일이 반복되므로 여기 한 곳에 둔다.
 * 새로 D1에 기사 id를 쓰는 엔드포인트를 만들면 반드시 isKnownArticle() 을 통과시켜라.
 *
 * [데이터 출처]
 * prebuild 가 만드는 trending-data.generated.json — 하드코딩 기사 + content.generated
 * 를 합친 사이트 렌더 기사 전량이다. ViewBeacon 이 보내는 article.id 체계와 같다.
 * ⚠️ 함수 번들에 빌드 시점 값으로 박힌다 → 기사를 추가하면 재배포해야 한다
 *   (기사 추가는 어차피 정적 재빌드·재배포를 동반하므로 새로운 제약은 아니다).
 */
import trending from "../../src/lib/trending-data.generated.json";

/** 기사 id 형식. 화이트리스트 조회 전에 명백한 쓰레기를 먼저 걸러 해시·조회 비용을 아낀다. */
export const ARTICLE_ID_RE = /^[a-z0-9][a-z0-9-]{0,80}$/i;

const VALID_IDS: Set<string> = new Set(
  ((trending as { articles?: { id?: string }[] }).articles ?? [])
    .map((a) => a.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0),
);

/** 화이트리스트 크기 — 생성 파일이 비어 있는 사고를 조기에 알아채기 위한 관측점. */
export const KNOWN_ARTICLE_COUNT = VALID_IDS.size;

/**
 * 입력을 정규화하고 실재하는 기사인지 판정한다.
 * @returns 정규화된 기사 id, 아니면 null(형식 불량 또는 미존재)
 */
export function cleanArticleId(a: unknown): string | null {
  if (typeof a !== "string") return null;
  const s = a.trim();
  if (!s || !ARTICLE_ID_RE.test(s)) return null;
  return VALID_IDS.has(s) ? s : null;
}

/** 실재 여부만 볼 때. 정규화가 필요하면 cleanArticleId() 를 써라. */
export function isKnownArticle(id: string): boolean {
  return VALID_IDS.has(id);
}
