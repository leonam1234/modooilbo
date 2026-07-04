#!/usr/bin/env node
/**
 * 콘텐츠 빌드 — content/articles/*.md(에이전트가 쓴 기사 파일)를 읽어
 * src/lib/content.generated.ts(사이트가 읽는 데이터)로 변환한다.
 *
 * 기사 1건 = 파일 1개. 파일 맨 위 "머리표(frontmatter)"가 카테고리·기자 등을 지정.
 * 이미지가 없으면 카테고리 키워드로 무료 스톡을 받아 public/stock/<slug>.jpg에 셀프호스팅.
 *
 * 사용: node scripts/build-content.mjs   (npm run content / 빌드·배포 시 자동 실행)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "content", "articles");
const OUT_TS = join(ROOT, "src", "lib", "content.generated.ts");
const STOCK_DIR = join(ROOT, "public", "stock");

const VALID_CATEGORIES = [
  "politics", "economy", "society", "world", "culture", "sports", "tech", "opinion",
];
const STOCK_KEYWORD = {
  politics: "parliament", economy: "finance", society: "city", world: "earth",
  culture: "art", sports: "stadium", tech: "technology", opinion: "newspaper",
};
function lockFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 900) + 1;
}

// 기존 하드코딩 기사에서 카테고리별 대표 스톡 id 맵(이미지 fallback용)
function existingStockByCategory() {
  const map = {};
  for (const f of ["articles.ts", "articles2.ts"]) {
    const p = join(ROOT, "src", "lib", f);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    const re = /\bid:\s*"([^"]+)"[\s\S]*?\bcategory:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(src))) {
      (map[m[2]] ||= []).push(m[1]);
    }
  }
  return map;
}

// 아주 단순한 frontmatter 파서 (key: value, tags는 콤마 구분)
function parse(md) {
  const t = md.replace(/^﻿/, "").trim();
  const fm = {};
  let body = t;
  if (t.startsWith("---")) {
    const end = t.indexOf("\n---", 3);
    if (end !== -1) {
      const head = t.slice(3, end).trim();
      body = t.slice(end + 4).trim();
      for (const line of head.split("\n")) {
        const i = line.indexOf(":");
        if (i === -1) continue;
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        fm[k] = v;
      }
    }
  }
  const paragraphs = body.split(/\n\s*\n+/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  return { fm, paragraphs };
}

// "YYYY-MM-DD HH:MM"(KST 벽시계) → 표시 일관성 위해 "...Z"로 저장(기존 데이터 규약과 동일)
function normDate(s) {
  // 기본값도 KST 벽시계-as-Z 규약을 따른다 (UTC 벽시계를 넣으면 9시간 이르게 표시됨)
  if (!s) return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16) + ":00Z";
  let v = s.trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) v += "T09:00";
  v = v.replace(/[zZ]|[+-]\d{2}:?\d{2}$/, ""); // TZ 제거(벽시계 취급)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) v += ":00";
  return v + "Z";
}

async function download(url, dest, tries = 3) {
  for (let t = 1; t <= tries; t++) {
    try {
      const ctrl = AbortSignal.timeout(20000);
      const res = await fetch(url, { redirect: "follow", signal: ctrl });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) throw new Error("too small");
      writeFileSync(dest, buf);
      return true;
    } catch {
      if (t === tries) return false;
      await new Promise((r) => setTimeout(r, 700 * t));
    }
  }
  return false;
}

async function run() {
  mkdirSync(STOCK_DIR, { recursive: true });
  if (!existsSync(CONTENT_DIR)) {
    writeFileSync(OUT_TS, header() + "export const CONTENT_ARTICLES: Article[] = [];\n");
    console.log("content/articles 없음 → 빈 데이터 생성");
    return;
  }
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  const fallback = existingStockByCategory();
  const articles = [];
  const slugs = new Set();

  for (const file of files.sort()) {
    const slug = file.replace(/\.md$/, "");
    if (slugs.has(slug)) {
      console.warn(`  ⚠ 중복 슬러그 건너뜀: ${slug}`);
      continue;
    }
    const { fm, paragraphs } = parse(readFileSync(join(CONTENT_DIR, file), "utf8"));
    const category = (fm.category || "").trim();
    if (!VALID_CATEGORIES.includes(category)) {
      console.warn(`  ⚠ ${file}: category가 잘못됨("${category}") → 건너뜀. (가능: ${VALID_CATEGORIES.join(", ")})`);
      continue;
    }
    if (!fm.title || !paragraphs.length) {
      console.warn(`  ⚠ ${file}: title 또는 본문 없음 → 건너뜀`);
      continue;
    }
    slugs.add(slug);

    // 발행 시각(KST). 미래글(예약)은 발행시각 전 빌드에선 게시하지 않는다.
    // (정적 사이트라 그 시각 이후 빌드/배포 때 자동으로 나타남)
    const publishedAt = normDate(fm.publishedAt || fm.date);
    if (new Date(publishedAt).getTime() > Date.now() + 9 * 60 * 60 * 1000) {
      console.log(`  ⏳ 예약: ${slug} (${(fm.publishedAt || fm.date || "").trim()} KST) — 발행시각 전이라 건너뜀`);
      continue;
    }

    // 이미지: image 지정 우선 → 없으면 스톡 다운로드 → 실패 시 카테고리 fallback
    let imageUrl = (fm.image || "").trim();
    if (!imageUrl) {
      const dest = join(STOCK_DIR, `${slug}.jpg`);
      let ok = existsSync(dest) && statSync(dest).size > 1000;
      if (!ok) {
        const kw = STOCK_KEYWORD[category];
        ok = await download(`https://loremflickr.com/1024/683/${kw}?lock=${lockFromId(slug)}`, dest);
      }
      if (ok) imageUrl = `/stock/${slug}.jpg`;
      else {
        const pool = fallback[category] || ["a01"];
        imageUrl = `/stock/${pool[lockFromId(slug) % pool.length]}.jpg`;
        console.warn(`  ⚠ ${slug}: 스톡 다운로드 실패 → 카테고리 대표 이미지 사용`);
      }
    }

    const [name, role] = (fm.author || "모두일보 / 기자").split("/").map((s) => s.trim());
    const tags = (fm.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
    // 수정 시각(선택). 발행 시각보다 앞서면 무시.
    const updatedRaw = (fm.updated || fm.updatedAt || "").trim();
    const updatedAt = updatedRaw ? normDate(updatedRaw) : undefined;
    articles.push({
      id: slug,
      slug,
      title: fm.title.trim(),
      summary: (fm.summary || paragraphs[0] || "").trim(),
      body: paragraphs,
      category,
      author: { name: name || "모두일보", role: role || "기자" },
      publishedAt,
      ...(updatedAt && updatedAt > publishedAt ? { updatedAt } : {}),
      imageUrl,
      imageCaption: (fm.imageCaption || "").trim() || undefined,
      tags,
      // isLead는 콘텐츠에서 설정 불가(불변식: 전체 1건만). 항상 false.
      isBreaking: /^(true|1|y|yes)$/i.test(fm.breaking || ""),
      readCount: 0,
      type: ["opinion", "photo", "video"].includes(fm.type) ? fm.type : (category === "opinion" ? "opinion" : "article"),
    });
    console.log(`  ✓ ${slug} [${category}] "${fm.title.trim()}"`);
  }

  writeFileSync(OUT_TS, header() + `export const CONTENT_ARTICLES: Article[] = ${JSON.stringify(articles, null, 2)};\n`);
  console.log(`완료: 콘텐츠 기사 ${articles.length}건 → src/lib/content.generated.ts`);
}

function header() {
  return `// 자동 생성 파일 — 직접 수정 금지. content/articles/*.md 에서 \`npm run content\`로 생성.\nimport type { Article } from "./types";\n\n`;
}

run();
