import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('view counts commit with deduplication and recover after database failure', async (t) => {
  // Run the production handler and SQL in workerd/D1, including real transaction rollback.
  const bundle = await build({
    stdin: {
      contents: `import { onRequestPost } from './functions/api/view.ts';
        export default { fetch(request, env, ctx) {
          return onRequestPost({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
        } };`,
      resolveDir: ROOT,
    },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022',
  });
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'view-test', modules: true, script: bundle.outputFiles[0].text,
    compatibilityDate: '2026-06-10', d1Databases: ['DB'],
  }));
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('DB');
  const migration = await readFile(path.join(ROOT, 'db/migrations/0002_counters.sql'), 'utf8');
  for (const table of ['article_views', 'view_dedup']) {
    const ddl = migration.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?;`))?.[0];
    assert.ok(ddl, `${table} schema exists`);
    await db.prepare(ddl).run();
  }
  const data = JSON.parse(await readFile(path.join(ROOT, 'src/lib/trending-data.generated.json'), 'utf8'));
  const article = data.articles[0].id;
  const send = async (ip, headers = {}) => {
    const res = await mf.dispatchFetch('https://example.test/api/view', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0', 'CF-Connecting-IP': ip, ...headers },
      body: JSON.stringify({ article }),
    });
    return res.json();
  };
  const count = async (table) => (await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n;

  // Force the second statement to fail: the first statement must be rolled back too.
  await db.prepare(`CREATE TRIGGER fail_dedup BEFORE INSERT ON view_dedup
    BEGIN SELECT RAISE(ABORT, 'test-only dedup failure'); END`).run();
  assert.equal((await send('192.0.2.1')).ok, false);
  assert.equal(await count('article_views'), 0);
  assert.equal(await count('view_dedup'), 0);
  await db.prepare('DROP TRIGGER fail_dedup').run();
  assert.deepEqual(await send('192.0.2.1'), { ok: true, counted: true });
  assert.deepEqual(await send('192.0.2.1'), { ok: true, counted: false });

  const simultaneous = await Promise.all(Array.from({ length: 8 }, () => send('192.0.2.2')));
  assert.equal(simultaneous.filter((r) => r.counted).length, 1);
  assert.equal((await db.prepare('SELECT views FROM article_views WHERE article_id = ?1').bind(article).first()).views, 2);
  assert.equal(await count('view_dedup'), 2);
  assert.equal((await send('192.0.2.3', { cookie: 'modoo_internal=1' })).counted, false);
  assert.equal((await send('192.0.2.4', { 'user-agent': 'Googlebot' })).counted, false);
  assert.equal(await count('view_dedup'), 2);
});
