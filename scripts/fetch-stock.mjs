#!/usr/bin/env node
/**
 * 스톡 이미지 셀프호스팅 — loremflickr(느린 외부 핫링크)를 한 번 받아 public/stock/<id>.jpg 로 저장.
 * 이후 사이트는 우리 도메인(CF CDN)에서 서빙 → 빠르고 캐시됨.
 *
 * 사용: node scripts/fetch-stock.mjs [--force]
 *   --force : 이미 있는 파일도 다시 받음
 *
 * 기사 데이터(id·category)는 src/lib/articles*.ts 에서 텍스트로 추출(런타임 TS import 회피).
 * 키워드/lock 규칙은 src/lib/stock.ts 와 동일해야 한다.
 */
import { readFileSync, mkdirSync, existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "stock");
const FORCE = process.argv.includes("--force");
const SIZE = "1024/683"; // 받을 원본 크기(히어로 충분, 썸네일 object-cover)

const STOCK_KEYWORD = {
  politics: "parliament",
  economy: "finance",
  society: "city",
  world: "earth",
  culture: "art",
  sports: "stadium",
  tech: "technology",
  opinion: "newspaper",
};
function lockFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 900) + 1;
}

// articles.ts / articles2.ts 에서 {id, category} 쌍 추출
function extractArticles() {
  const pairs = [];
  for (const f of ["articles.ts", "articles2.ts"]) {
    const src = readFileSync(join(ROOT, "src", "lib", f), "utf8");
    // 객체 단위로 id 다음에 나오는 category를 짝짓는다
    const re = /\bid:\s*"([^"]+)"[\s\S]*?\bcategory:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(src))) pairs.push({ id: m[1], category: m[2] });
  }
  return pairs;
}

async function download(url, dest, tries = 3) {
  for (let t = 1; t <= tries; t++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) throw new Error(`too small ${buf.length}B`);
      writeFileSync(dest, buf);
      return buf.length;
    } catch (e) {
      if (t === tries) throw e;
      await new Promise((r) => setTimeout(r, 800 * t));
    }
  }
}

async function run() {
  mkdirSync(OUT, { recursive: true });
  const arts = extractArticles();
  console.log(`기사 ${arts.length}건 → public/stock/ 다운로드 (size ${SIZE})`);

  let done = 0,
    skip = 0,
    fail = 0;
  const queue = [...arts];
  const CONC = 8;
  async function worker() {
    while (queue.length) {
      const a = queue.shift();
      const dest = join(OUT, `${a.id}.jpg`);
      if (!FORCE && existsSync(dest) && statSync(dest).size > 1000) {
        skip++;
        continue;
      }
      const kw = STOCK_KEYWORD[a.category] ?? "news";
      const url = `https://loremflickr.com/${SIZE}/${kw}?lock=${lockFromId(a.id)}`;
      try {
        const n = await download(url, dest);
        done++;
        process.stdout.write(`  ✓ ${a.id} (${a.category}) ${(n / 1024) | 0}KB\n`);
      } catch (e) {
        fail++;
        process.stdout.write(`  ✗ ${a.id} 실패: ${e.message}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`완료: 받음 ${done} · 건너뜀 ${skip} · 실패 ${fail}`);
  if (fail) process.exit(1);
}

run();
