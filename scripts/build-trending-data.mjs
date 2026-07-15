#!/usr/bin/env node
/**
 * 인기 해시태그용 데이터 생성.
 * 전체 기사(하드코딩 articles.ts/articles2.ts + 생성 content.generated.ts)에서
 * 태그별 { count, 최신 발행시각 } 과 기사별 { slug, tags, publishedAt } 을 뽑아
 * src/lib/trending-data.generated.json 으로 저장한다.
 *
 * → Cloudflare Pages Function(/api/trending-tags)이 이 파일을 import 해서
 *   접속시각(KST) 기준 최신성 가중으로 순위를 매기고 1시간 캐시로 시간당 갱신한다.
 *   (추후 실제 조회 트래픽 신호를 여기에 합산 — C 혼합)
 *
 * 사용: node scripts/build-trending-data.mjs (prebuild에서 자동 실행)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "lib", "trending-data.generated.json");

/** 하드코딩 기사 파일(articles.ts류): 객체 블록으로 나눠 slug/publishedAt/tags 추출 */
function parseHardcoded(file) {
  const p = join(ROOT, "src", "lib", file);
  if (!existsSync(p)) return [];
  const src = readFileSync(p, "utf8");
  const out = [];
  // 각 기사 객체는 2칸 들여쓰기 "{"로 시작 → 그 경계로 분할
  for (const chunk of src.split(/\n {2}\{\n/).slice(1)) {
    const slug = chunk.match(/\bslug:\s*"([^"]+)"/);
    const pub = chunk.match(/\bpublishedAt:\s*"([^"]+)"/);
    const tagsM = chunk.match(/\btags:\s*\[([^\]]*)\]/);
    // 태그가 없어도 기사 자체는 랭킹 풀(/api/most-read)에 반드시 포함시킨다 — slug만 필수.
    if (!slug) continue;
    const idM = chunk.match(/\bid:\s*"([^"]+)"/);
    const tags = tagsM ? [...tagsM[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
    out.push({ id: idM ? idM[1] : slug[1], slug: slug[1], publishedAt: pub ? pub[1] : "", tags });
  }
  return out;
}

/** 생성 기사(content.generated.ts): JSON 배열 부분을 그대로 파싱 */
function parseGenerated() {
  const p = join(ROOT, "src", "lib", "content.generated.ts");
  if (!existsSync(p)) return [];
  const src = readFileSync(p, "utf8");
  // 주의: 첫 "["는 타입 표기(Article[])의 대괄호 — 배열 리터럴은 "= [" 뒤에서 시작한다.
  const assign = src.indexOf("= [");
  const s = assign === -1 ? -1 : assign + 2;
  const e = src.lastIndexOf("]");
  if (s === -1 || e === -1) return [];
  let arr;
  try {
    arr = JSON.parse(src.slice(s, e + 1));
  } catch {
    return [];
  }
  return arr.map((a) => ({ id: a.id || a.slug, slug: a.slug, publishedAt: a.publishedAt || "", tags: Array.isArray(a.tags) ? a.tags : [] }));
}

// ⚠️ 태그 유무로 거르지 않는다. 이 배열은 (a) 태그 색인과 (b) 랭킹 풀(data.articles)의
//    공통 원천인데, 예전엔 `a.tags.length` 필터가 태그 없는 기사를 통째로 버려서
//    /api/most-read 가 그 기사를 영영 보지 못했다(조회수가 아무리 높아도 랭킹 제외).
//    태그 색인 루프는 태그가 없으면 자연히 아무것도 더하지 않으므로 필터 없이도 안전하다.
const articles = [
  ...parseHardcoded("articles.ts"),
  ...parseHardcoded("articles2.ts"),
  ...parseGenerated(),
].filter((a) => a.slug);

// 태그 색인: count + 최신 발행시각 (태그 없는 기사는 여기 기여분이 0)
const index = new Map();
for (const a of articles) {
  for (const raw of a.tags) {
    const tag = raw.trim();
    if (!tag) continue;
    const cur = index.get(tag) || { tag, count: 0, latest: "" };
    cur.count += 1;
    if (a.publishedAt && a.publishedAt > cur.latest) cur.latest = a.publishedAt;
    index.set(tag, cur);
  }
}

const data = {
  articleCount: articles.length,
  tags: [...index.values()].sort((x, y) => y.count - x.count),
  // 추후 트래픽 신호(조회 많은 기사 경로→태그)용 매핑
  articles: articles.map((a) => ({ id: a.id, slug: a.slug, tags: a.tags, publishedAt: a.publishedAt })),
};
writeFileSync(OUT, JSON.stringify(data));
console.log(`인기태그 데이터: 기사 ${articles.length}건 / 고유 태그 ${data.tags.length}개 → src/lib/trending-data.generated.json`);
console.log(`  상위 10: ${data.tags.slice(0, 10).map((t) => `#${t.tag}(${t.count})`).join(" ")}`);
