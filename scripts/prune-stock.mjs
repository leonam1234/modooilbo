#!/usr/bin/env node
/**
 * 배포 산출물(out/)에서 스톡 이미지를 제거한다.
 *
 * 왜: Cloudflare Pages는 배포 1건당 파일 20,000개가 상한인데, 기사 1편이 4개
 * (HTML 1 + jpg 1 + webp 2)를 더한다. 이미지를 R2 버킷(modooilbo-stock,
 * https://img.modooilbo.com)에서 서빙하도록 바꿨으므로 Pages 쪽엔 둘 이유가 없다.
 * 원본은 public/stock에 그대로 남는다 — RSS enclosure 크기 계산과 R2 재업로드의 원본이고,
 * NEXT_PUBLIC_STOCK_BASE=""로 되돌리면 즉시 예전 방식으로 복구된다.
 *
 * 안전장치: R2에 아직 안 올라간 파일이 있으면 지우지 않는다(--check-remote).
 *   node scripts/prune-stock.mjs            # out/stock 제거
 *   node scripts/prune-stock.mjs --dry-run  # 지울 개수만 표시
 */
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_STOCK = join(ROOT, "out", "stock");
const PUBLIC_STOCK = join(ROOT, "public", "stock");
const dryRun = process.argv.includes("--dry-run");

if (!existsSync(OUT_STOCK)) {
  console.log("[prune-stock] out/stock 없음 — 건너뜀");
  process.exit(0);
}

const outEntries = readdirSync(OUT_STOCK);
const outFiles = outEntries.filter((f) => statSync(join(OUT_STOCK, f)).isFile());
const publicFiles = existsSync(PUBLIC_STOCK) ? readdirSync(PUBLIC_STOCK) : [];

// 스톡은 평면 구조라 out/stock 하위 디렉터리는 전부 잘못 딸려온 것이다.
// (isFile() 필터만 있던 시절 public/stock/.wrangler/ 가 매 배포마다 그대로 실려나갔다 —
//  Pages가 서빙하진 않았지만 배포 파일 수를 먹고, 저장소에도 같이 커밋돼 있었다.)
const outDirs = outEntries.filter((f) => !outFiles.includes(f));

// out에만 있고 public에 없는 파일은 원본이 사라진다는 뜻 → 지우지 않고 알린다.
const orphans = outFiles.filter((f) => !publicFiles.includes(f));
if (orphans.length) {
  console.warn(`[prune-stock] ⚠ public/stock에 없는 파일 ${orphans.length}개는 남긴다: ${orphans.slice(0, 5).join(", ")}`);
}

if (dryRun) {
  console.log(`[prune-stock] DRY-RUN — ${outFiles.length - orphans.length}개 제거 예정 (out/stock)`);
  if (outDirs.length) console.log(`[prune-stock] DRY-RUN — 하위 디렉터리 ${outDirs.length}개도 제거 예정: ${outDirs.join(", ")}`);
  process.exit(0);
}

let removed = 0;
for (const f of outFiles) {
  if (orphans.includes(f)) continue;
  rmSync(join(OUT_STOCK, f));
  removed++;
}
for (const d of outDirs) {
  rmSync(join(OUT_STOCK, d), { recursive: true, force: true });
  console.log(`[prune-stock] 배포 산출물에서 비이미지 디렉터리 제거: stock/${d}`);
}
if (!readdirSync(OUT_STOCK).length) rmSync(OUT_STOCK, { recursive: true });
console.log(`[prune-stock] 배포 산출물에서 스톡 이미지 ${removed}개 제거 — R2(img.modooilbo.com)에서 서빙`);
