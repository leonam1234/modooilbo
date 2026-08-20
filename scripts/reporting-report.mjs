#!/usr/bin/env node
/**
 * 취재 유형 집계 — 포털 제휴 심사의 '자체기사 비율' 근거를 내부에서 확인한다.
 *
 * 비율 정의: direct ÷ (direct + desk)
 *   sponsored(광고·협찬·기업소식)와 wire(외부 제공)는 분자·분모 양쪽에서 뺀다.
 *   '분자에서만 제외'하면 광고를 낼수록 비율이 떨어져 지표가 왜곡된다.
 *
 * ⚠️ 빌드 산출물이 아니라 content/articles/*.md 원고를 직접 읽는다.
 *    빌드 없이 돌고, 아직 발행하지 않은 원고에도 그대로 쓸 수 있다.
 *
 * ⚠️ 과거 기사는 소급 추정하지 않는다. 필드가 없으면 unknown 이고,
 *    규약 시행일(2026-08-21) 이전 발행분은 애초에 집계 대상이 아니다.
 *
 *   node scripts/reporting-report.mjs             # 일별·7일·30일 요약
 *   node scripts/reporting-report.mjs --json      # 기계 판독용
 *   node scripts/reporting-report.mjs --days 14   # 최근 N일 일별 표
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "content", "articles");
const SINCE = "2026-08-21"; // 규약 시행일 — 이전 발행분은 집계 제외
const TARGET_LO = 20, TARGET_HI = 30;

const asJson = process.argv.includes("--json");
const daysArg = process.argv.indexOf("--days");
const DAYS = daysArg > -1 ? Number(process.argv[daysArg + 1]) || 7 : 7;

function fm(text) {
  const t = text.replace(/^﻿/, "").trim();
  if (!t.startsWith("---")) return {};
  const end = t.indexOf("\n---", 3);
  if (end === -1) return {};
  const out = {};
  for (const line of t.slice(3, end).trim().split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

const rows = [];
for (const f of readdirSync(DIR)) {
  if (!f.endsWith(".md")) continue;
  const m = fm(readFileSync(join(DIR, f), "utf8"));
  const day = (m.publishedAt || m.date || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
  rows.push({ file: f, day, reporting: (m.reporting || "").trim() || "unknown", reportingType: (m.reportingType || "").trim() || null });
}
rows.sort((a, b) => (a.day < b.day ? 1 : -1));

/** 한 묶음의 집계. 비율 분모는 direct+desk 뿐이다. */
function tally(list) {
  const c = { direct: 0, desk: 0, sponsored: 0, wire: 0, unknown: 0 };
  const types = {};
  for (const r of list) {
    c[r.reporting] = (c[r.reporting] ?? 0) + 1;
    if (r.reporting === "direct" && r.reportingType) types[r.reportingType] = (types[r.reportingType] || 0) + 1;
  }
  const base = c.direct + c.desk;
  return { ...c, total: list.length, base, pct: base ? (c.direct / base) * 100 : null, types };
}

const inScope = rows.filter((r) => r.day >= SINCE);
const days = [...new Set(inScope.map((r) => r.day))].slice(0, DAYS);
const win = (n) => {
  const ds = [...new Set(inScope.map((r) => r.day))].slice(0, n);
  return tally(inScope.filter((r) => ds.includes(r.day)));
};

const result = {
  since: SINCE,
  generatedFrom: "content/articles",
  daily: days.map((d) => ({ day: d, ...tally(inScope.filter((r) => r.day === d)) })),
  window7: win(7),
  window30: win(30),
  preRuleArticles: rows.length - inScope.length,
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const pct = (v) => (v === null ? "  —  " : `${v.toFixed(1)}%`.padStart(6));
  const mark = (v) => (v === null ? "" : v >= TARGET_LO && v <= TARGET_HI ? "  ✔ 목표" : v < TARGET_LO ? "  ▼ 미달" : "  ▲ 초과");
  console.log(`\n■ 취재 유형 집계 (규약 시행 ${SINCE} 이후)\n`);
  console.log(`  ${"일자".padEnd(12)}${"direct".padStart(7)}${"desk".padStart(6)}${"광고".padStart(6)}${"외부".padStart(6)}${"미표기".padStart(7)}${"비율".padStart(8)}`);
  for (const d of result.daily) {
    console.log(`  ${d.day.padEnd(12)}${String(d.direct).padStart(7)}${String(d.desk).padStart(6)}${String(d.sponsored).padStart(6)}${String(d.wire).padStart(6)}${String(d.unknown).padStart(7)}${pct(d.pct)}${mark(d.pct)}`);
  }
  for (const [label, w] of [["7일 이동", result.window7], ["30일 이동", result.window30]]) {
    console.log(`\n  ${label}  direct ${w.direct} / 대상 ${w.base}  ${pct(w.pct)}${mark(w.pct)}   (목표 ${TARGET_LO}~${TARGET_HI}%)`);
    const t = Object.entries(w.types).sort((a, b) => b[1] - a[1]);
    if (t.length) console.log(`    세부  ${t.map(([k, v]) => `${k} ${v}`).join(" · ")}`);
    if (w.unknown) console.log(`    ⚠ 미표기 ${w.unknown}건 — 비율 분모에서 빠져 있습니다.`);
  }
  console.log(`\n  규약 적용 전 기사 ${result.preRuleArticles}건은 집계에서 제외했습니다(소급 추정 안 함).\n`);
}
