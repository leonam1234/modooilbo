#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assessEditorialQuality, QUALITY_PASS, QUALITY_SINCE, QUALITY_TARGET } from "./lib/editorial-quality.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "content", "articles");
const strict = process.argv.includes("--strict");
const asJson = process.argv.includes("--json");

function parse(text) {
  const t = text.replace(/^﻿/, "").trim();
  const fm = {};
  let body = t;
  if (t.startsWith("---")) {
    const end = t.indexOf("\n---", 3);
    if (end !== -1) {
      body = t.slice(end + 4).trim();
      for (const line of t.slice(3, end).trim().split("\n")) {
        const i = line.indexOf(":");
        if (i !== -1) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
    }
  }
  return { fm, paragraphs: body.split(/\n\s*\n+/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean) };
}

const raw = readdirSync(DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_")).map((file) => {
  const parsed = parse(readFileSync(join(DIR, file), "utf8"));
  const publishedAt = String(parsed.fm.publishedAt || parsed.fm.date || "").replace(" ", "T");
  return { file, ...parsed, publishedAt, minute: publishedAt.slice(0, 16) };
});
const minuteCounts = raw.reduce((map, row) => map.set(row.minute, (map.get(row.minute) || 0) + 1), new Map());
const rows = raw.map((row) => assessEditorialQuality({ ...row, sameMinuteCount: minuteCounts.get(row.minute) || 1 }));
const inScope = rows.filter((r) => r.inScope);
const latest = [...rows].sort((a, b) => b.pubDay.localeCompare(a.pubDay)).slice(0, 100);
const average = (items) => items.length ? items.reduce((sum, r) => sum + r.score, 0) / items.length : null;
const recentDays = [...new Set(rows.map((r) => r.pubDay))].sort().reverse().slice(0, 30);
const recent30 = rows.filter((r) => recentDays.includes(r.pubDay) && ["direct", "desk"].includes(r.reporting));
const humanTypes = new Set(["inquiry", "interview", "field", "follow-up"]);
const percent = (n, d) => d ? (n / d) * 100 : null;
const originalCount = recent30.filter((r) => r.reporting === "direct").length;
const humanCount = recent30.filter((r) => r.reporting === "direct" && humanTypes.has(r.reportingType)).length;
const reviewedLatest = latest.filter((r) => r.reviewedBy && r.reviewedAt && r.reporterInsight).length;
const result = {
  model: "editorial-quality-v1",
  target: QUALITY_TARGET,
  publishFloor: QUALITY_PASS,
  enforcedSince: QUALITY_SINCE,
  corpus: { articles: rows.length, average: average(rows) },
  latest100: { articles: latest.length, average: average(latest) },
  enforced: { articles: inScope.length, average: average(inScope), failures: inScope.filter((r) => r.errors.length).length },
  kpi30: {
    eligibleArticles: recent30.length,
    originalArticles: originalCount,
    originalPercent: percent(originalCount, recent30.length),
    humanReportedArticles: humanCount,
    humanReportedPercent: percent(humanCount, recent30.length),
  },
  reviewCoverage: { latest100: percent(reviewedLatest, latest.length), reviewed: reviewedLatest, total: latest.length },
  failures: inScope.filter((r) => r.errors.length),
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const fmt = (v) => v === null ? "—" : `${v.toFixed(1)}점`;
  console.log("\n■ 모두일보 편집 품질 리포트");
  console.log(`  모델: 100점 만점 · 출고선 ${QUALITY_PASS} · 목표 ${QUALITY_TARGET} · 강제일 ${QUALITY_SINCE}`);
  console.log("  주의: 강제일 이전 점수는 신규 메타데이터 준비도이며 과거 기사 품질의 소급 판정이 아닙니다.");
  console.log(`  전체 ${result.corpus.articles}편 평균 ${fmt(result.corpus.average)}`);
  console.log(`  최신 100편 평균 ${fmt(result.latest100.average)}`);
  console.log(`  강제 대상 ${result.enforced.articles}편 평균 ${fmt(result.enforced.average)} · 미달 ${result.enforced.failures}편\n`);
  const pct = (v) => v === null ? "—" : `${v.toFixed(1)}%`;
  console.log(`  최근 30개 발행일 자체취재·분석 ${result.kpi30.originalArticles}/${result.kpi30.eligibleArticles} (${pct(result.kpi30.originalPercent)}) · 30일 목표 30%`);
  console.log(`  최근 30개 발행일 사람 직접취재 ${result.kpi30.humanReportedArticles}/${result.kpi30.eligibleArticles} (${pct(result.kpi30.humanReportedPercent)}) · 30일 목표 15%\n`);
  console.log(`  최신 100편 기자 검수·해설 기록 ${result.reviewCoverage.reviewed}/${result.reviewCoverage.total} (${pct(result.reviewCoverage.latest100)}) · 시행 후 목표 100%\n`);
  for (const row of result.failures.slice(0, 20)) {
    console.log(`  ✖ ${row.file} — ${row.score}점`);
    for (const error of row.errors) console.log(`    · ${error}`);
  }
}

if (strict && result.enforced.failures) process.exit(1);
