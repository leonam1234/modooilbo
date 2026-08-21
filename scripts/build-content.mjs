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
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "content", "articles");
const OUT_TS = join(ROOT, "src", "lib", "content.generated.ts");
const OUT_NEWEST = join(ROOT, "src", "lib", "newest.generated.ts");
const STOCK_DIR = join(ROOT, "public", "stock");

const VALID_CATEGORIES = [
  "economy", "society", "world", "culture", "sports", "tech", "opinion",
  // 기업 데이터 뉴스 '사업' 축 — 종합뉴스와 분리된 신규 카테고리(기사가 붙어 승격된 것).
  "grants", "startup", "industry", "labor", "deals", "bids",
];
const STOCK_KEYWORD = {
  economy: "finance", society: "city", world: "earth",
  culture: "art", sports: "stadium", tech: "technology", opinion: "newspaper",
  grants: "government",
  startup: "startup", industry: "factory", labor: "office", deals: "contract", bids: "government",
};

// frontmatter `status`에 이 말이 들어 있으면 발행 금지(데스크 보류 표시) → 빌드 중단.
// 조용히 건너뛰면 보류 원고가 사라진 건지 발행된 건지 아무도 모른다 → 명시적 실패로 알린다.
// 주의: 발행 완료 라벨 '인증전보관'에는 '보류'가 없다(보관 ≠ 보류) — 정상 기사는 걸리지 않는다.
const BLOCKED_STATUS = ["발행보류", "보류"];

/**
 * 취재 유형 분류(2026-08-21 도입) — 포털 제휴 심사의 '자체기사 비율' 근거 데이터.
 *
 * reporting 은 모든 신규 기사의 필수값이다.
 *   direct    자체 취재(질의·인터뷰·자체분석·현장·후속확인) — 비율의 분자
 *   desk      공개 원자료를 재구성한 기사              — 분모에만 포함
 *   sponsored 광고·협찬·기업소식                       — 분자·분모 양쪽에서 제외
 *   wire      외부에서 제공받은 원고                    — 분자·분모 양쪽에서 제외
 *
 * ⚠️ sponsored/wire 를 둔 이유: 종전 설계는 '분자에서만 제외'였는데 그러면
 *    광고를 낼수록 비율이 떨어지고, '외부 제공'은 식별 수단 자체가 없었다
 *    (source: 는 참고한 원출처 URL 이지 외부 원고라는 뜻이 아니다 — 오분류 위험).
 *    한 축으로 모아 비율 정의를 direct ÷ (direct + desk) 하나로 확정한다.
 *
 * reportingType 은 direct 일 때만 쓰고, 그 외 값에 붙으면 오류다.
 */
const REPORTING = ["direct", "desk", "sponsored", "wire"];
const REPORTING_TYPE = ["inquiry", "interview", "data-analysis", "field", "follow-up"];

/**
 * 유예 구간 — 규약 시행일(8/21)부터 한 주는 누락을 경고만 하고 통과시킨다.
 * 8/28 부터는 누락도 빌드 실패다. 그 전 발행분(과거 기사)은 소급 추정하지 않고 조용히 unknown.
 */
const REPORTING_SINCE = "2026-08-21";
const REPORTING_ENFORCE = "2026-08-28";

/**
 * 광고주 slug 화이트리스트 — src/lib/partners.ts 를 읽어 만든다.
 * 오타(bcmobilty 등)를 빌드에서 잡지 못하면 "광고인데 광고 표시가 안 붙은 기사"가
 * 그대로 나간다. 그건 표시 누락이라 광고자율규약 위반이다 → 반드시 실패시킨다.
 */
const PARTNER_SLUGS = (() => {
  try {
    const src = readFileSync(join(ROOT, "src", "lib", "partners.ts"), "utf8");
    return new Set([...src.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]));
  } catch {
    return new Set();
  }
})();

/** 수집한 오류를 한 번에 보여주고 빌드를 실패시킨다(첫 오류에서 끊지 않아 한 번에 다 고칠 수 있음). */
function failBuild(errors) {
  console.error(`\n✖ 콘텐츠 빌드 실패 — 기사 ${errors.length}건에 문제가 있습니다:\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error(
    "\n기사를 조용히 버리지 않고 중단했습니다. 위 파일의 머리표(frontmatter)를 고친 뒤 다시 빌드하세요.\n",
  );
  process.exit(1);
}
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
  // 검증 오류는 모아서 마지막에 한 번에 실패시킨다(경고 후 건너뛰기 금지 — 기사가 조용히 사라진다).
  const errors = [];
  // 경고는 빌드를 막지 않는다 — 유예 구간의 reporting 누락 등, 나중에 필수가 될 항목을 미리 알린다.
  const warnings = [];
  // 예약(미래 발행시각)으로 건너뛴 기사 — 종료 시 요약으로 다시 알린다.
  // ⚠️ 종전엔 스킵이 로그 한 줄로만 흘러가, 24편 패키지에서 4편이 통째로 빠진 것을
  //    건수를 세보기 전엔 아무도 몰랐다(2026-08-15). 발행 사고의 직접 원인이다.
  const scheduled = [];

  for (const file of files.sort()) {
    const slug = file.replace(/\.md$/, "");
    if (slugs.has(slug)) {
      errors.push(`${file}: 슬러그 중복("${slug}") — 같은 이름의 기사가 이미 있습니다.`);
      continue;
    }
    const { fm, paragraphs } = parse(readFileSync(join(CONTENT_DIR, file), "utf8"));

    // 데스크 보류 표시 원고는 발행하지 않는다 — 조용히 넘기지 말고 빌드를 끊는다.
    const status = (fm.status || "").trim();
    const blocked = BLOCKED_STATUS.find((w) => status.includes(w));
    if (blocked) {
      errors.push(
        `${file}: status가 "${status}" — 발행 보류 원고입니다. ` +
          `발행하려면 status를 발행 완료 상태(예: 인증전보관)로 바꾸거나 필드를 지우고, ` +
          `보류를 유지하려면 파일명 앞에 "_"를 붙여 빌드에서 제외하세요.`,
      );
      continue;
    }

    const category = (fm.category || "").trim();
    if (!VALID_CATEGORIES.includes(category)) {
      errors.push(`${file}: category가 잘못됨("${category}"). 가능: ${VALID_CATEGORIES.join(", ")}`);
      continue;
    }
    if (!fm.title) {
      errors.push(`${file}: title 없음(머리표에 title: 필요).`);
      continue;
    }
    if (!paragraphs.length) {
      errors.push(`${file}: 본문 없음(머리표 아래에 본문 문단 필요).`);
      continue;
    }
    slugs.add(slug);

    // 발행 시각(KST). 미래글(예약)은 발행시각 전 빌드에선 게시하지 않는다.
    // (정적 사이트라 그 시각 이후 빌드/배포 때 자동으로 나타남)
    const publishedAt = normDate(fm.publishedAt || fm.date);
    // 비정형 날짜("2026-8-14" 등)는 normDate가 그대로 통과시켜 Invalid Date가 된다 —
    // 예약 판정(NaN 비교=false)을 조용히 지나 즉시 발행되고 정렬·표시가 깨지므로 여기서 끊는다.
    if (Number.isNaN(new Date(publishedAt).getTime())) {
      errors.push(`${file}: publishedAt 형식 오류("${(fm.publishedAt || fm.date || "").trim()}") — "YYYY-MM-DD HH:MM"(KST)로 적어 주세요.`);
      continue;
    }
    if (new Date(publishedAt).getTime() > Date.now() + 9 * 60 * 60 * 1000) {
      console.log(`  ⏳ 예약: ${slug} (${(fm.publishedAt || fm.date || "").trim()} KST) — 발행시각 전이라 건너뜀`);
      scheduled.push(`${slug} (${(fm.publishedAt || fm.date || "").trim()} KST)`);
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
    // tags는 콤마 구분 문자열이 규약이지만, YAML 배열 표기(`[a, b]`)로 쓴 기사가 실제로
    // 들어와 첫/끝 태그에 대괄호가 섞인 채 발행됐다(2026-08-14 점검). 감싼 대괄호는 벗긴다.
    const tags = (fm.tags || "").replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
    // 수정 시각(선택). 발행 시각보다 앞서면 무시.
    // ⚠️ updatedAt은 '수정'일 뿐 정정(訂正)이 아니다 — 공식 정정 보도는 아래 correction으로만 표시한다.
    const updatedRaw = (fm.updated || fm.updatedAt || "").trim();
    // 유튜브 쇼츠 — URL이든 ID든 11자 영상 ID 추출 (youtube: 필드)
    const ytRaw = (fm.youtube || fm.youtubeId || "").trim();
    const youtubeId = ytRaw ? (ytRaw.match(/(?:v=|be\/|shorts\/|embed\/)?([A-Za-z0-9_-]{11})(?:[?&#].*)?$/) || [])[1] : undefined;
    const updatedAt = updatedRaw ? normDate(updatedRaw) : undefined;
    // 행사·접수 종료 시각(선택) — 지나면 기사 상단에 종료 안내가 붙는다.
    // 자동 추정하지 않는다(제목 날짜 파싱은 오탐이 난다). 원고가 명시할 때만 쓴다.
    const eventEndsRaw = (fm.eventEndsAt || fm.eventEnds || "").trim();
    const eventEndsAt = eventEndsRaw ? normDate(eventEndsRaw) : undefined;
    if (eventEndsAt && Number.isNaN(new Date(eventEndsAt).getTime())) {
      errors.push(`${file}: eventEndsAt 형식 오류("${eventEndsRaw}") — "YYYY-MM-DD HH:MM"(KST)로 적어 주세요.`);
      continue;
    }
    if (updatedAt && Number.isNaN(new Date(updatedAt).getTime())) {
      errors.push(`${file}: updatedAt 형식 오류("${updatedRaw}") — "YYYY-MM-DD HH:MM"(KST)로 적어 주세요.`);
      continue;
    }

    // 정정 기록(선택) — 머리표:
    //   correction: <무엇이 틀렸고 무엇을 바로잡았는지>   ← 정정 내용(필수)
    //   correctionAt: 2026-07-20 11:31                  ← 정정 반영 시각(생략 시 updatedAt)
    // 정정 내용 없이 시각만 남기면 언론중재법상 "정정 사실과 그 내용"을 못 밝히므로 빌드를 끊는다.
    const correctionNote = (fm.correction || fm.correctionNote || "").trim();
    const correctionAtRaw = (fm.correctionAt || "").trim();
    let correction;
    if (correctionNote) {
      const at = correctionAtRaw || updatedRaw;
      if (!at) {
        errors.push(
          `${file}: correction은 있는데 시각이 없습니다. correctionAt(또는 updatedAt)에 정정 반영 시각을 적어 주세요.`,
        );
        continue;
      }
      correction = { at: normDate(at), note: correctionNote };
    } else if (correctionAtRaw) {
      errors.push(
        `${file}: correctionAt만 있고 정정 내용(correction)이 없습니다. ` +
          `정정 보도는 무엇이 틀렸고 무엇을 바로잡았는지 함께 밝혀야 합니다. ` +
          `단순 수정이면 correctionAt을 지우고 updatedAt만 쓰세요.`,
      );
      continue;
    }

    // 광고성 콘텐츠 — frontmatter `sponsor:`(광고주 slug). 없으면 일반 기사다.
    const sponsor = (fm.sponsor || "").trim();
    if (sponsor && PARTNER_SLUGS.size && !PARTNER_SLUGS.has(sponsor)) {
      errors.push(
        `${file}: sponsor "${sponsor}" 가 src/lib/partners.ts 에 없습니다. ` +
          `오타면 고치고, 신규 광고주면 partners.ts 에 먼저 추가하세요 ` +
          `(광고주를 못 찾으면 광고 표시가 붙지 않은 채 발행됩니다).`,
      );
      continue;
    }

    // 취재 유형 — 값·조합 검증. 누락은 시행일/강제일 기준으로 단계 적용.
    const reporting = (fm.reporting || "").trim();
    const reportingType = (fm.reportingType || "").trim();
    const pubDay = publishedAt.slice(0, 10);
    if (reporting && !REPORTING.includes(reporting)) {
      errors.push(`${file}: reporting "${reporting}" 는 허용값이 아닙니다. 가능: ${REPORTING.join(", ")}`);
      continue;
    }
    if (reportingType && !REPORTING_TYPE.includes(reportingType)) {
      errors.push(`${file}: reportingType "${reportingType}" 는 허용값이 아닙니다. 가능: ${REPORTING_TYPE.join(", ")}`);
      continue;
    }
    if (reporting === "direct" && !reportingType) {
      errors.push(`${file}: reporting: direct 인데 reportingType 이 없습니다. 가능: ${REPORTING_TYPE.join(", ")}`);
      continue;
    }
    if (reporting && reporting !== "direct" && reportingType) {
      errors.push(`${file}: reporting: ${reporting} 에는 reportingType 을 쓰지 않습니다(direct 전용).`);
      continue;
    }
    if (!reporting && pubDay >= REPORTING_SINCE) {
      if (pubDay >= REPORTING_ENFORCE) {
        errors.push(`${file}: reporting 이 없습니다(${REPORTING_ENFORCE}부터 필수). 가능: ${REPORTING.join(", ")}`);
        continue;
      }
      warnings.push(`${file}: reporting 누락 — ${REPORTING_ENFORCE}부터는 빌드가 실패합니다.`);
    }

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
      ...(eventEndsAt ? { eventEndsAt } : {}),
      ...(correction ? { correction } : {}),
      ...(sponsor ? { sponsor } : {}),
      ...(reporting ? { reporting } : {}),
      ...(reportingType ? { reportingType } : {}),
      imageUrl,
      imageCaption: (fm.imageCaption || "").trim() || undefined,
      tags,
      // isLead는 콘텐츠에서 설정 불가(불변식: 전체 1건만). 항상 false.
      isBreaking: /^(true|1|y|yes)$/i.test(fm.breaking || ""),
      readCount: 0,
      ...(youtubeId ? { youtubeId } : {}),
      type: youtubeId ? "video" : (["opinion", "video"].includes(fm.type) ? fm.type : (category === "opinion" ? "opinion" : "article")),
    });
    console.log(`  ✓ ${slug} [${category}] "${fm.title.trim()}"`);
  }

  // 잘못된 기사가 하나라도 있으면 생성물을 쓰지 않고 중단 — 반쪽짜리 사이트가 배포되는 것 방지.
  if (errors.length) failBuild(errors);
  if (warnings.length) {
    console.warn(`\n⚠ 경고 ${warnings.length}건 (빌드는 계속합니다):`);
    for (const w of warnings) console.warn(`  • ${w}`);
  }

  writeFileSync(OUT_TS, header() + `export const CONTENT_ARTICLES: Article[] = ${JSON.stringify(articles, null, 2)};\n`);
  console.log(`완료: 콘텐츠 기사 ${articles.length}건 → src/lib/content.generated.ts`);

  // 예약 스킵은 정상 기능이지만 **조용히** 지나가면 안 된다. 발행 담당이 "24편 올렸다"고
  // 믿는 사이 실제로는 20편만 나가는 사고가 실제로 났다 → 끝에서 눈에 띄게 다시 알린다.
  if (scheduled.length) {
    console.warn(`\n⚠️  예약으로 건너뛴 기사 ${scheduled.length}건 — 이번 빌드에 포함되지 않았습니다:`);
    for (const s of scheduled) console.warn(`    ⏳ ${s}`);
    console.warn(
      `    발행시각이 현재보다 미래면 건너뜁니다. 지금 바로 내보내려면 publishedAt을 현재 시각 이하로 낮추세요.\n`,
    );
  }

  writeFileSync(OUT_NEWEST, newestModule(articles));
  console.log(`완료: 최신 발행시각 → src/lib/newest.generated.ts`);
}

/** 코퍼스를 구성하는 소스 = 콘텐츠 md에서 구운 기사 + 하드코딩 배치 2종. */
const LEGACY_BATCHES = ["articles.ts", "articles2.ts"];

/**
 * 속보 시효 판정에 필요한 값은 "가장 최신 발행 시각" 하나뿐인데,
 * 이걸 getAllArticles()로 구하면 속보 배지를 그리는 컴포넌트가 전체 기사 배열(수 MB)에
 * 의존하게 된다 → 클라이언트 경계를 넘는 순간 코퍼스 전체가 번들된다(과거 /search 3.5MB 원인).
 * 그래서 이 값만 따로 떼어 초경량 모듈로 굽는다. 소비처: src/lib/breaking.ts
 *
 * 같은 이유로 CONTENT_VERSION(코퍼스 지문)도 여기에 함께 굽는다. /articles-index.json을
 * 부르는 화면들이 이 상수만 임포트하면 되고, 코퍼스에는 손대지 않는다.
 */
function newestModule(articles) {
  const times = articles.map((a) => a.publishedAt);
  const fingerprint = createHash("sha256");
  // 인덱스에 실리는 필드만 지문에 넣는다 — 본문만 고친 정정 보도로는 캐시를 깨지 않게.
  // (필드 목록은 src/app/articles-index.json/route.ts 와 맞춰 유지할 것)
  // ⚠️ author는 {name, role} 객체라 문자열로 풀어 넣는다 — 그대로 join하면 항상
  //    "[object Object]"가 되어 바이라인만 고친 수정이 지문을 못 바꿨다(2026-08-14 점검).
  // ⚠️ 구분자는 반드시 ·  **이스케이프 표기**로 둘 것. 종전엔 같은 문자를 raw
  //    제어 바이트로 박아 뒀는데, 그러면 grep이 이 파일을 바이너리로 보고 **에러 없이 침묵**한다
  //    (`grep reporting build-content.mjs` → 결과 0줄). 실제로 그것 때문에 "검증 로직이 아예
  //    없다"고 오판한 적 있다(2026-08-21). 런타임 값은 둘이 완전히 같다 — 지문도 안 바뀐다.
  for (const a of articles) {
    fingerprint.update(
      [a.id, a.slug, a.title, a.summary, a.category, a.publishedAt, (a.tags ?? []).join("\u0001"), `${a.author.name}/${a.author.role}`, a.imageUrl, a.type, a.isBreaking].join("\u0000"),
    );
  }
  // 하드코딩 배치(articles.ts·articles2.ts)도 후보에 포함 — 콘텐츠가 비어 있어도 값이 남게.
  // 이 두 파일도 ALL_ARTICLES에 합류하므로 지문에 포함해야 한다(파일 전문을 그대로 해싱).
  for (const f of LEGACY_BATCHES) {
    const p = join(ROOT, "src", "lib", f);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    fingerprint.update(src);
    for (const m of src.matchAll(/\bpublishedAt:\s*"([^"]+)"/g)) times.push(m[1]);
  }
  const newest = times.sort().at(-1) ?? new Date(0).toISOString();
  const version = fingerprint.digest("hex").slice(0, 12);
  return (
    `// 자동 생성 파일 — 직접 수정 금지. \`npm run content\`로 생성.\n` +
    `// 전체 기사 중 가장 늦은 발행 시각(속보 시효 기준점).\n` +
    `export const NEWEST_PUBLISHED_AT = ${JSON.stringify(newest)};\n\n` +
    `// 코퍼스 지문 — /articles-index.json 의 캐시 무효화 키.\n` +
    `// 인덱스는 이름이 고정된 대용량 파일(gzip 160KB+)이라, 버전 쿼리 없이는\n` +
    `// public/_headers 에서 장기 캐시를 걸 수 없다(새 기사가 안 보임).\n` +
    `// 목차가 바뀔 때만 값이 바뀌므로 \`?v=\` 를 붙이면 장기 캐시가 안전해진다.\n` +
    `export const CONTENT_VERSION = ${JSON.stringify(version)};\n`
  );
}

function header() {
  return `// 자동 생성 파일 — 직접 수정 금지. content/articles/*.md 에서 \`npm run content\`로 생성.\nimport type { Article } from "./types";\n\n`;
}

run();
