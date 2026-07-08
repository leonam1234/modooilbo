#!/usr/bin/env node
/**
 * public/stock/*.jpg → 같은 이름의 .webp(원본 폭, 품질 80) + -640.webp(축소 썸네일) 생성 + 매니페스트 갱신.
 * - prebuild에서 실행: 새 기사 이미지(jpg)가 추가되면 자동으로 webp가 따라붙는다.
 * - 원본 jpg는 유지(og:image·RSS 등 스크레이퍼 호환용) — 표시용만 webp로 서빙(lib/stock.ts).
 * - -640.webp: 작은 카드 슬롯(compact/list/horizontal, ≤160px)이 원본 1200px 대신 받아 전송량 절감.
 *   원본 webp와 항상 쌍으로 생성되므로 stock.ts는 매니페스트(원본 webp 존재)만 보고 -640을 참조한다.
 * - sharp가 없거나 실패해도 빌드는 계속: 매니페스트는 "실존하는 webp"만 담으므로
 *   변환 안 된 이미지는 자연스럽게 jpg로 표시된다.
 * 산출물: src/lib/webp-manifest.generated.json (원본 webp가 존재하는 jpg 파일명 목록)
 */
import { readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STOCK = join(ROOT, "public", "stock");
const MANIFEST = join(ROOT, "src", "lib", "webp-manifest.generated.json");

let sharp = null;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.warn("[webp] sharp 미설치 — 변환 생략(기존 webp만 매니페스트에 반영)");
}

const jpgs = readdirSync(STOCK).filter((f) => f.endsWith(".jpg"));
let made = 0;
let skipped = 0;
let failed = 0;

const THUMB_W = 640; // 작은 카드 슬롯(≤160px) 레티나 커버

for (const f of jpgs) {
  const src = join(STOCK, f);
  const srcMtime = statSync(src).mtimeMs;
  const dstFull = src.replace(/\.jpg$/, ".webp");
  const dstThumb = src.replace(/\.jpg$/, "-640.webp");
  const fullFresh = existsSync(dstFull) && statSync(dstFull).mtimeMs >= srcMtime;
  const thumbFresh = existsSync(dstThumb) && statSync(dstThumb).mtimeMs >= srcMtime;
  if ((fullFresh && thumbFresh) || !sharp) {
    if (fullFresh && thumbFresh) skipped++;
    continue;
  }
  try {
    if (!fullFresh) {
      await sharp(src).webp({ quality: 80 }).toFile(dstFull);
      made++;
    }
    if (!thumbFresh) {
      await sharp(src).resize(THUMB_W).webp({ quality: 78 }).toFile(dstThumb);
      made++;
    }
  } catch (e) {
    failed++;
    console.warn(`[webp] 변환 실패: ${f} — ${e?.message ?? e}`);
  }
}

// 매니페스트 = 실제로 webp가 존재하는 jpg 목록 (표시 스왑의 근거)
const have = jpgs.filter((f) => existsSync(join(STOCK, f.replace(/\.jpg$/, ".webp"))));
writeFileSync(MANIFEST, JSON.stringify(have.sort(), null, 0) + "\n");
console.log(`[webp] 변환 ${made} · 최신 ${skipped} · 실패 ${failed} · 매니페스트 ${have.length}/${jpgs.length}`);
