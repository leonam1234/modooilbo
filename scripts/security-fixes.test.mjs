import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash, pbkdf2Sync } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import vm from 'node:vm';

const root = new URL('../', import.meta.url).pathname;
const bundle = await build({ stdin: { contents: `
  import { onRequestPost as reset } from './functions/api/auth/reset.ts';
  import { onRequestPost as change } from './functions/api/auth/update-password.ts';
  export default { fetch(request, env, ctx) {
    const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };
    return new URL(request.url).pathname === '/reset' ? reset(context) : change(context);
  } };`, resolveDir: root }, bundle: true, write: false, format: 'esm', platform: 'browser' });
const mf = new Miniflare(convertV4MiniflareOptions({ name: 'security-regression', modules: true,
  script: bundle.outputFiles[0].text, compatibilityDate: '2026-06-10', d1Databases: ['DB'] }));
after(() => mf.dispose());
const DB = await mf.getD1Database('DB');
const schema = (await Promise.all(['db/schema.sql', 'db/migrations/0002_counters.sql', 'db/migrations/0004_verified_signup.sql']
  .map(p => readFile(new URL(p, new URL('../', import.meta.url)), 'utf8')))).join('\n');
for (const table of ['users', 'identities', 'sessions', 'password_resets', 'rate_limits', 'user_email_verified']) {
  await DB.prepare(schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?;`))[0]).run();
}
const sha = value => createHash('sha256').update(value).digest('hex');
const token = value => sha(value);
const initialPassword = 'FixturePassword1';
async function seed(id, resetTokens = []) {
  const salt = 'ab'.repeat(16);
  const hash = pbkdf2Sync(initialPassword, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
  await DB.prepare('INSERT INTO users (id,email,name,password_hash,password_salt) VALUES (?1,?2,?1,?3,?4)')
    .bind(id, `${id}@example.invalid`, hash, salt).run();
  for (const value of resetTokens) await DB.prepare("INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES (?1,?2,datetime('now','+9 hours','+1 hour'))")
    .bind(sha(value), id).run();
  const session = token(`session-${id}`);
  await DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?1,?2,datetime('now','+9 hours','+1 day'))")
    .bind(sha(session), id).run();
  return { session, hash };
}
async function call(path, body, session) {
  return mf.dispatchFetch(`https://fixture.invalid/${path}`, { method: 'POST',
    headers: { 'content-type': 'application/json', ...(session ? { cookie: `modoo_session=${session}` } : {}) },
    body: JSON.stringify(body) });
}
const count = async (table, id) => (await DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?1`).bind(id).first()).n;

test('reset revokes sibling tokens and prior sessions, preserving another user', async () => {
  const a = token('siblings-a'), b = token('siblings-b'), other = token('other');
  await seed('siblings', [a, b]);
  await seed('other', [other]);
  assert.equal((await call('reset', { token: a, password: 'ChangedPassword1' })).status, 200);
  assert.equal((await call('reset', { token: b, password: 'ChangedPassword2' })).status, 400);
  assert.equal((await call('reset', { token: a, password: 'ChangedPassword3' })).status, 400);
  assert.equal(await count('password_resets', 'siblings'), 0);
  assert.equal(await count('sessions', 'siblings'), 1);
  assert.equal(await count('password_resets', 'other'), 1);
  assert.equal(await count('sessions', 'other'), 1);
});

test('logged-in password change revokes reset links and rotates the session atomically', async () => {
  const value = token('change-reset');
  const { session } = await seed('change', [value]);
  const response = await call('change', { current: initialPassword, next: 'ChangedPassword1' }, session);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly.*Secure.*SameSite=Lax/);
  assert.equal((await call('reset', { token: value, password: 'ChangedPassword2' })).status, 400);
  assert.equal((await call('change', { current: 'ChangedPassword1', next: 'ChangedPassword2' }, session)).status, 401);
  assert.equal(await count('sessions', 'change'), 1);
});

test('concurrent sibling resets have one winner and only one replacement session', async () => {
  const a = token('race-a'), b = token('race-b');
  await seed('race', [a, b]);
  const responses = await Promise.all([a, b].map(value => call('reset', { token: value, password: 'ChangedPassword1' })));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
  assert.equal(await count('sessions', 'race'), 1);
  assert.equal(await count('password_resets', 'race'), 0);
});

test('transaction failure preserves credentials, unused reset token and old session for retry', async () => {
  const value = token('rollback-token');
  const { hash } = await seed('rollback', [value]);
  await DB.prepare("CREATE TRIGGER fail_session BEFORE INSERT ON sessions WHEN NEW.user_id = 'rollback' BEGIN SELECT RAISE(ABORT, 'fixture failure'); END").run();
  assert.equal((await call('reset', { token: value, password: 'ChangedPassword1' })).status, 500);
  assert.equal((await DB.prepare("SELECT password_hash FROM users WHERE id='rollback'").first()).password_hash, hash);
  assert.equal((await DB.prepare('SELECT used FROM password_resets WHERE token_hash=?1').bind(sha(value)).first()).used, 0);
  assert.equal(await count('sessions', 'rollback'), 1);
  await DB.prepare('DROP TRIGGER fail_session').run();
  assert.equal((await call('reset', { token: value, password: 'ChangedPassword1' })).status, 200);
});

async function load(entry, extra = {}) {
  const result = await build({ entryPoints: [new URL(entry, new URL('../', import.meta.url)).pathname],
    bundle: true, write: false, platform: 'node', format: 'cjs', target: 'es2022' });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, crypto: globalThis.crypto,
    TextEncoder, TextDecoder, Request, Response, Headers, URL, URLSearchParams, AbortController,
    setTimeout, clearTimeout, ...extra });
  return module.exports;
}

test('Kakao invalid or masked emails never merge distinct provider identities', async () => {
  let id = '100', valid = false, verified = true, email = 'masked***@example.invalid';
  const { onRequestGet } = await load('functions/api/auth/kakao/callback.ts', {
    fetch: async url => Response.json(String(url).includes('/oauth/token') ? { access_token: 'fixture' } :
      { id, kakao_account: { email, is_email_valid: valid, is_email_verified: verified, profile: { nickname: 'Fixture' } } }),
  });
  const state = 'a'.repeat(32);
  const invoke = () => onRequestGet({ request: new Request(`https://fixture.invalid/api/auth/kakao/callback?code=fixture&state=${state}`,
    { headers: { cookie: `modoo_oauth_state=${state}` } }), env: { DB, KAKAO_REST_KEY: 'fixture' } });
  assert.equal((await invoke()).status, 302);
  id = '101'; assert.equal((await invoke()).status, 302);
  valid = true; id = '102'; assert.equal((await invoke()).status, 302); // even a masked "valid" string is rejected
  const links = await DB.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM identities WHERE provider='kakao'").first();
  assert.equal(links.n, 3);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM user_email_verified WHERE email=?1').bind(email).first()).n, 0);
  email = 'valid-kakao@example.invalid'; id = '103'; assert.equal((await invoke()).status, 302);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM user_email_verified WHERE email=?1').bind(email).first()).n, 1);
  id = '104'; assert.equal((await invoke()).status, 302); // real verified email can still safely merge
  assert.equal((await DB.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM identities WHERE provider='kakao' AND provider_user_id IN ('103','104')").first()).n, 1);
  verified = false; id = '105'; assert.equal((await invoke()).status, 302);
  assert.equal((await DB.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM identities WHERE provider='kakao' AND provider_user_id IN ('104','105')").first()).n, 2);
});

test('newsletter pages suppress referrers and GA strips newsletter token URLs', async () => {
  const { onRequestGet } = await load('functions/api/newsletter.ts');
  const email = 'newsletter@example.invalid', key = 'fixture-key';
  const referrer = `https://modooilbo.com/api/newsletter?unsub=${encodeURIComponent(email)}&t=${sha(email + key)}`;
  for (const url of [referrer, 'https://modooilbo.com/api/newsletter']) {
    const response = await onRequestGet({ request: new Request(url), env: { DB: {}, MAILER_KEY: key } });
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.match(response.headers.get('cache-control'), /no-transform/);
    assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
  }
  const { GA4_HEAD_BOOTSTRAP } = await load('src/lib/google-analytics.ts');
  const window = { dataLayer: [] };
  vm.runInNewContext(GA4_HEAD_BOOTSTRAP, { window, dataLayer: window.dataLayer, document: { cookie: '', referrer },
    location: { pathname: '/', search: '', origin: 'https://modooilbo.com' }, URL, Date });
  assert.equal(window.dataLayer.find(args => args[0] === 'config')[2].page_referrer, '');
});

test('stalled market providers are aborted while healthy symbols still return', async () => {
  let aborted = 0;
  const { onRequestGet } = await load('functions/api/market.ts', {
    setTimeout: fn => setTimeout(fn, 5), caches: { default: { match: async () => null, put: async () => {} } },
    fetch: async (url, options) => {
      assert.ok(options.signal);
      if (String(url).includes('KS11')) return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => {
        aborted++; reject(new Error('aborted')); }, { once: true }));
      return Response.json({ chart: { result: [{ meta: { regularMarketPrice: 100, chartPreviousClose: 99 } }] } });
    },
  });
  const response = await onRequestGet();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).items.length, 4);
  assert.equal(aborted, 2);
});

test('news sitemap removes expired, future and invalid entries without requiring a rebuild', async () => {
  const { onRequestGet } = await load('functions/news-sitemap.xml.ts');
  const entry = date => `<url><loc>https://example.invalid/</loc><news:publication_date>${date}</news:publication_date></url>`;
  const now = Date.now();
  const source = '<?xml version="1.0"?><urlset>' + [now - 3600000, now - 49 * 3600000, now + 3600000]
    .map(time => entry(new Date(time).toISOString())).join('') + entry('invalid') + '</urlset>';
  const response = await onRequestGet({ request: new Request('https://fixture.invalid/news-sitemap.xml'),
    env: { ASSETS: { fetch: async () => new Response(source) } } });
  assert.equal((await response.text()).match(/<url>/g).length, 1);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('source URL punctuation is removed without breaking balanced URL parentheses', async () => {
  const { cleanSourceUrl } = await load('src/lib/source-url.ts');
  assert.equal(cleanSourceUrl('https://example.invalid/?id=123),'), 'https://example.invalid/?id=123');
  assert.equal(cleanSourceUrl('https://example.invalid/wiki/Title_(detail)'), 'https://example.invalid/wiki/Title_(detail)');
  assert.equal(cleanSourceUrl('https://example.invalid/wiki/Title_(detail)).'), 'https://example.invalid/wiki/Title_(detail)');
  assert.equal(cleanSourceUrl('https://example.invalid/path%29'), 'https://example.invalid/path%29');
});
