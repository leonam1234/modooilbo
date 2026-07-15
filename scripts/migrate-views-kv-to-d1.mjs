#!/usr/bin/env node
/**
 * 구 KV 조회수(views:<article>) → D1 article_views 이관 (2026-07-15, 1회용)
 *
 * ⚠️ **아직 실행하지 않았다.** 실행 여부는 사람이 결정한다.
 *   작성 시점 운영 KV의 최대 조회수가 4라 이관 가치가 사실상 없다고 보고 기본은 미실행으로 뒀다.
 *   그래도 유실이 신경 쓰이면 아래 순서대로 쓰면 된다.
 *
 * 실행 순서(반드시 이 순서):
 *   1) db/migrations/0002_counters.sql 을 원격 D1에 먼저 적용
 *   2) node scripts/migrate-views-kv-to-d1.mjs           # dry-run(기본) — 무엇이 옮겨질지만 출력
 *   3) node scripts/migrate-views-kv-to-d1.mjs --live    # 실제 반영
 *
 * 성질:
 *   · 멱등(재실행 안전) — MAX(기존값, KV값)로 덮으므로 여러 번 돌려도 값이 부풀지 않는다.
 *     (신규 코드가 이미 D1에 카운트를 쌓고 있는 상태에서 돌려도 그 값을 깎지 않는다.)
 *   · 조회수 카운터만 옮긴다. 일일 중복방지 키(viewed:*)는 하루면 의미가 사라지므로 옮기지 않는다.
 *   · 구 KV 키는 지우지 않는다(롤백 여지 보존). 정리는 나중에 수동으로.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";

const REPO = join(homedir(), "GIT/modooilbo");
const WRANGLER = join(REPO, "node_modules/.bin/wrangler");
const KV_BINDING_ID = "b73697771f59450790ada8c6b695374c"; // wrangler.jsonc의 REACTIONS 네임스페이스
const LIVE = process.argv.includes("--live");

const sh = (args) => execFileSync(WRANGLER, args, { cwd: REPO }).toString();
const sql = (s) => s.replace(/'/g, "''");

// 1) KV에서 views:* 키 전부 나열
const keys = JSON.parse(sh(["kv", "key", "list", "--namespace-id", KV_BINDING_ID, "--prefix", "views:"]));
if (!keys.length) {
  console.log("이관할 views:* 키가 없습니다.");
  process.exit(0);
}

// 2) 값 읽기
const rows = [];
for (const { name } of keys) {
  const article = name.slice("views:".length);
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/i.test(article)) {
    console.warn(`건너뜀(기사 id 형식 아님): ${name}`);
    continue;
  }
  const raw = sh(["kv", "key", "get", name, "--namespace-id", KV_BINDING_ID]).trim();
  const views = parseInt(raw, 10);
  if (!Number.isFinite(views) || views <= 0) continue;
  rows.push({ article, views });
}
rows.sort((a, b) => b.views - a.views);

console.log(`\n이관 대상 ${rows.length}건 (상위 10):`);
for (const r of rows.slice(0, 10)) console.log(`  ${String(r.views).padStart(5)}  ${r.article}`);

if (!LIVE) {
  console.log(`\n[dry-run] 실제 반영하려면 --live 를 붙여 실행하세요. (선행: 0002 마이그레이션 원격 적용)`);
  process.exit(0);
}

// 3) D1 반영 — 기존값과 비교해 큰 쪽 유지(멱등)
const stmts = rows
  .map(
    (r) =>
      `INSERT INTO article_views (article_id, views) VALUES ('${sql(r.article)}', ${r.views}) ` +
      `ON CONFLICT(article_id) DO UPDATE SET views = MAX(views, ${r.views}), updated_at = datetime('now','+9 hours');`,
  )
  .join("\n");
sh(["d1", "execute", "modooilbo-members", "--remote", "--command", stmts]);
console.log(`\n반영 완료: ${rows.length}건. 구 KV 키는 남겨 뒀습니다(롤백 여지).`);
