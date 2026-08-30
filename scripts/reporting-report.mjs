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

/**
 * 목표치의 근거 (2026-08-28 감사에서 확인 — wiki/audits/2026-08-28-취재비율-근거와-AI지문.md)
 *
 * 30% 라는 숫자는 자의적이지 않다. 세 제도에서 같은 값이 반복된다.
 *   신문법 시행령 제2조제1항제1호  인터넷신문 30%   법정 등록 요건 (시행 2026.3.24)
 *   구 뉴스제휴평가위 규정 별표 1   인터넷신문 30%   제휴 신청 자격요건
 *   카카오 다음뉴스 신규 입점       자체기사 30%     입점 요건
 *
 * ⚠️ 그런데 우리 `direct` 는 저 기준들보다 훨씬 좁다. 제평위·카카오의 「자체기사」는
 *    보도자료·타매체 기사를 직접 분석·재구성한 기사까지 포함한다(별표 5). 즉
 *    우리 `desk` 대부분이 저 기준에서는 자체기사로 잡힌다.
 *    → 그래서 아래 두 값을 나눠 찍는다.
 *       ① 내부 direct 비율   direct ÷ (direct+desk)   자체 취재 역량을 보는 내부 지표
 *       ② 법·포털 기준 비율  (direct+desk) ÷ 분류된 전체   대외 방어용 숫자
 *    ①이 미달이어도 그것이 법정 30% 미달을 뜻하지 않는다. 혼동하지 말 것.
 *
 * ⚠️ 인용할 때 반드시 다는 단서 (과장 금지):
 *    · 법정 30%는 등록 서류에 이를 심사하는 절차가 없고, 「자체적으로 생산한 기사」의
 *      법적 정의가 법령에 없다. 직권말소 사유도 비율이 아니라 「1년 이상 미게재」다.
 *    · 제평위는 2023.5.22 활동 잠정 중단(해체 아님).
 *    · 네이버는 2026년 단독 뉴스제휴위로 재개했고 자체기사 비율이 정량 항목에
 *      존속하는 것은 확인되나 수치 임계값은 미공개다.
 *    · 카카오 30%는 2025년 회차 기준이며 2026년 재공고는 확인되지 않았다.
 *
 * 2026-08-30 편집 품질 8.5 설계부터 direct 안에서도 사람 직접취재와 자체분석을 나눈다.
 * 30일 목표: direct 30% 이상, 사람 직접취재 15% 이상. 90일 목표는 각각 40%, 25%다.
 */
const TARGET_LO = 30, TARGET_HI = 100;
const HUMAN_TARGET_LO = 15;
/** 과거 제도와 법령 문구를 비교하기 위한 참고선. 충족 여부를 법적 판정으로 표현하지 않는다. */
const LEGAL_MIN = 30;

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
  const humanDirect = list.filter(
    (r) => r.reporting === "direct" && ["inquiry", "interview", "field", "follow-up"].includes(r.reportingType),
  ).length;
  // 법·포털 기준 「자체기사」 = direct + desk (보도자료 재분석·재구성 포함).
  // 분모는 분류가 끝난 기사 전체 — 광고·외부제공은 분모에 남고 분자에서만 빠진다.
  // (미표기 unknown 은 판정 자체가 불가해 양쪽에서 뺀다.)
  const classified = base + c.sponsored + c.wire;
  return {
    ...c,
    total: list.length,
    base,
    pct: base ? (c.direct / base) * 100 : null,
    humanDirect,
    humanPct: base ? (humanDirect / base) * 100 : null,
    classified,
    selfPct: classified ? (base / classified) * 100 : null,
    types,
  };
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
  const mark = (v) => (v === null ? "" : v >= TARGET_LO && v <= TARGET_HI ? "  ✔ 목표" : "  ▼ 미달");
  console.log(`\n■ 취재 유형 집계 (규약 시행 ${SINCE} 이후)\n`);
  console.log(`  ${"일자".padEnd(12)}${"direct".padStart(7)}${"desk".padStart(6)}${"광고".padStart(6)}${"외부".padStart(6)}${"미표기".padStart(7)}${"비율".padStart(8)}`);
  for (const d of result.daily) {
    console.log(`  ${d.day.padEnd(12)}${String(d.direct).padStart(7)}${String(d.desk).padStart(6)}${String(d.sponsored).padStart(6)}${String(d.wire).padStart(6)}${String(d.unknown).padStart(7)}${pct(d.pct)}${mark(d.pct)}`);
  }
  for (const [label, w] of [["7일 이동", result.window7], ["30일 이동", result.window30]]) {
    console.log(`\n  ${label}  direct ${w.direct} / 대상 ${w.base}  ${pct(w.pct)}${mark(w.pct)}   (30일 목표 ${TARGET_LO}% 이상)`);
    const humanMark = w.humanPct !== null && w.humanPct >= HUMAN_TARGET_LO ? "✔ 목표" : "▼ 미달";
    console.log(`    사람 직접취재  ${w.humanDirect} / ${w.base}  ${pct(w.humanPct)}   ${humanMark} (30일 목표 ${HUMAN_TARGET_LO}% 이상)`);
    // 대외 방어용 숫자 — 이쪽이 법·포털이 실제로 재는 값이다.
    if (w.selfPct !== null) {
      const ok = w.selfPct >= LEGAL_MIN ? `참고선 ${LEGAL_MIN}% 이상` : `참고선 ${LEGAL_MIN}% 미만`;
      console.log(`    분류상 자체생산 추정  ${w.base} / ${w.classified}  ${pct(w.selfPct)}   ${ok} (법적 판정 아님)`);
    }
    const t = Object.entries(w.types).sort((a, b) => b[1] - a[1]);
    if (t.length) console.log(`    세부  ${t.map(([k, v]) => `${k} ${v}`).join(" · ")}`);
    if (w.unknown) console.log(`    ⚠ 미표기 ${w.unknown}건 — 비율 분모에서 빠져 있습니다.`);
  }
  console.log(`\n  규약 적용 전 기사 ${result.preRuleArticles}건은 집계에서 제외했습니다(소급 추정 안 함).\n`);
}
