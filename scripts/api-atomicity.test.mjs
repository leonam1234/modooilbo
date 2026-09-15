import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function miniflareFrom(source, name) {
  const bundle = await build({
    stdin: { contents: source, resolveDir: ROOT },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
  });
  return new Miniflare(convertV4MiniflareOptions({
    name,
    modules: true,
    script: bundle.outputFiles[0].text,
    compatibilityDate: "2026-06-10",
    d1Databases: ["DB"],
  }));
}

async function createTables(db, migration, names) {
  for (const name of names) {
    const ddl = migration.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\([\\s\\S]*?;`))?.[0];
    assert.ok(ddl, `${name} schema exists`);
    await db.prepare(ddl).run();
  }
}

test("candidate transition and audit event commit atomically under failure and races", async (t) => {
  const mf = await miniflareFrom(
    `import { applyTransition } from './functions/_lib/candidate-status.ts';
     export default { async fetch(request, env) {
       try {
         const body = await request.json();
         return Response.json(await applyTransition(env, body.candId, body.to, body.actor, body.opts));
       } catch { return Response.json({ error: 'failed' }, { status: 503 }); }
     } };`,
    "candidate-atomicity-test",
  );
  t.after(() => mf.dispose());
  const db = await mf.getD1Database("DB");
  const migration = await readFile(path.join(ROOT, "db/migrations/0001_article_candidates.sql"), "utf8");
  await createTables(db, migration, ["article_candidates", "candidate_events"]);
  await db.prepare("INSERT INTO article_candidates (cand_id, status) VALUES ('cand-1', '초안')").run();

  const transition = async (to, actor = "admin") => {
    const response = await mf.dispatchFetch("https://example.test/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candId: "cand-1", to, actor, opts: { note: actor } }),
    });
    return { status: response.status, body: await response.json() };
  };
  const state = async () => (await db.prepare("SELECT status FROM article_candidates WHERE cand_id='cand-1'").first()).status;
  const events = async () => (await db.prepare("SELECT from_status, to_status, actor FROM candidate_events ORDER BY id").all()).results;

  await db.prepare(`CREATE TRIGGER fail_candidate_event BEFORE INSERT ON candidate_events
    BEGIN SELECT RAISE(ABORT, 'test-only event failure'); END`).run();
  assert.equal((await transition("검증중")).status, 503);
  assert.equal(await state(), "초안");
  assert.deepEqual(await events(), []);
  await db.prepare("DROP TRIGGER fail_candidate_event").run();

  const retry = await transition("검증중", "retry-admin");
  assert.equal(retry.status, 200);
  assert.equal(retry.body.ok, true);
  assert.equal(await state(), "검증중");
  assert.deepEqual(await events(), [{ from_status: "초안", to_status: "검증중", actor: "retry-admin" }]);

  await db.prepare("UPDATE article_candidates SET status='초안' WHERE cand_id='cand-1'").run();
  await db.prepare("DELETE FROM candidate_events").run();
  const raced = await Promise.all([
    transition("검증중", "admin-a"),
    transition("후보", "admin-b"),
  ]);
  assert.equal(raced.filter((result) => result.body.ok).length, 1);
  assert.equal(raced.filter((result) => !result.body.ok).length, 1);
  const recorded = await events();
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].from_status, "초안");
  assert.equal(recorded[0].to_status, await state());
});

test("reaction choice and aggregate counters commit atomically under failure and concurrency", async (t) => {
  const mf = await miniflareFrom(
    `import { onRequestPost } from './functions/api/reactions.ts';
     export default { fetch(request, env, ctx) {
       return onRequestPost({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
     } };`,
    "reaction-atomicity-test",
  );
  t.after(() => mf.dispose());
  const db = await mf.getD1Database("DB");
  const migration = await readFile(path.join(ROOT, "db/migrations/0002_counters.sql"), "utf8");
  await createTables(db, migration, ["reaction_counts", "reaction_choices", "rate_limits"]);
  const data = JSON.parse(await readFile(path.join(ROOT, "src/lib/trending-data.generated.json"), "utf8"));
  const article = data.articles[0].id;

  const react = async (ip, type) => {
    const response = await mf.dispatchFetch("https://example.test/api/reactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0",
        "CF-Connecting-IP": ip,
      },
      body: JSON.stringify({ article, type }),
    });
    return { status: response.status, body: await response.json() };
  };
  const count = async (table) => (await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n;

  await db.prepare(`CREATE TRIGGER fail_reaction_count BEFORE INSERT ON reaction_counts
    BEGIN SELECT RAISE(ABORT, 'test-only count failure'); END`).run();
  assert.equal((await react("192.0.2.1", "info")).status, 503);
  assert.equal(await count("reaction_choices"), 0);
  assert.equal(await count("reaction_counts"), 0);
  await db.prepare("DROP TRIGGER fail_reaction_count").run();

  assert.equal((await react("192.0.2.1", "info")).body.chosen, "info");
  assert.equal((await react("192.0.2.1", "interesting")).body.chosen, "interesting");
  assert.equal((await react("192.0.2.1", "interesting")).body.chosen, null);

  const distinct = await Promise.all(
    Array.from({ length: 9 }, (_, index) => react(`192.0.2.${index + 10}`, "insight")),
  );
  assert.equal(distinct.filter((result) => result.status === 200).length, 9);
  const sameIp = await Promise.all(Array.from({ length: 8 }, () => react("192.0.2.100", "empathy")));
  assert.equal(sameIp.filter((result) => result.status === 200).length, 8);

  const actual = (await db.prepare("SELECT type, n FROM reaction_counts WHERE article_id=?1 AND n > 0 ORDER BY type").bind(article).all()).results;
  const expected = (await db.prepare(
    "SELECT type, COUNT(*) AS n FROM reaction_choices WHERE article_id=?1 AND type IS NOT NULL GROUP BY type ORDER BY type",
  ).bind(article).all()).results;
  assert.deepEqual(actual, expected);
  assert.deepEqual(actual, [{ type: "insight", n: 9 }]);
});
