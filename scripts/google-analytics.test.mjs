#!/usr/bin/env node
// GA4 직접 설치 불변식 — `npm run build` 의 postbuild 에서 실행된다.
//
// 지키는 것:
//   1) 측정 ID 는 src/lib/google-analytics.ts 한 곳에만 있다.
//   2) RootLayout <head> 에 부트스트랩 인라인과 async 로더가 각각 정확히 한 번 들어간다
//      (구글 "태그 감지"는 초기 HTML 을 본다 — 동의 게이트·지연 주입 금지).
//   3) 부트스트랩은 구글 표준 스니펫과 같이 로드 즉시 page_view 를 보낸다(consent default 없음,
//      send_page_view:false 없음). 토큰 경로에서는 config 를 건너뛴다.
//   4) 인증 토큰 경로 4종의 Pages middleware 가 두 태그와 Flight 복제 노드를 제거한다.
//   5) CSP Report-Only·처리방침·운영 문서가 고지 방식(동의창 없음)과 일치한다.
//   6) 빌드 산출물 전 HTML 에 로더(async)·부트스트랩이 각각 정확히 한 번 있다(순서는 React 가 정한다).

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");
const EXPECTED_ID = ["G", "R2MDE3WDFY"].join("-");
const EXPECTED_URL = `https://www.googletagmanager.com/gtag/js?id=${EXPECTED_ID}`;
const CONFIG_SOURCE = path.join(ROOT, "src/lib/google-analytics.ts");

async function loadAnalyticsConfig() {
  const source = await readFile(CONFIG_SOURCE, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(module, exports){${compiled}\n})(module,module.exports);`, {
    module: loaded,
  });
  return loaded.exports;
}

async function walk(dir, extensions) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full, extensions));
    else if (entry.isFile() && extensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function parseCspDirectives(headers, headerName) {
  const prefix = `${headerName.toLowerCase()}:`;
  const matches = headers
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith(prefix));

  assert.equal(matches.length, 1, `${headerName} must appear exactly once`);
  const value = matches[0].slice(matches[0].indexOf(":") + 1).trim();
  const directives = new Map();
  for (const chunk of value.split(";")) {
    const [name, ...sources] = chunk.trim().split(/\s+/).filter(Boolean);
    if (!name) continue;
    assert.equal(directives.has(name), false, `CSP contains duplicate ${name}`);
    directives.set(name, new Set(sources));
  }
  return directives;
}

function assertCspSources(directives, directive, expectedSources) {
  const actual = directives.get(directive);
  assert.ok(actual, `CSP is missing ${directive}`);
  for (const source of expectedSources) {
    assert.ok(actual.has(source), `${directive} is missing ${source}`);
  }
}

/** 부트스트랩 스니펫을 가짜 window 에서 실행해 실제로 큐에 무엇이 쌓이는지 본다. */
function runBootstrap(bootstrap, { pathname, referrer, origin = "https://modooilbo.com", cookie = "", search = "" }) {
  const win = {};
  win.window = win;
  win.location = { pathname, origin, search };
  win.document = { referrer, cookie };
  win.URL = URL;
  vm.runInNewContext(bootstrap, win);
  return win;
}

test("GA4 config is fixed, sends page_view like the stock snippet, and skips token paths", async () => {
  const config = await loadAnalyticsConfig();
  assert.equal(config.GA4_MEASUREMENT_ID, EXPECTED_ID);
  assert.equal(config.GA4_SCRIPT_URL, EXPECTED_URL);
  assert.equal(config.GA4_BOOTSTRAP_ID, "ga4-consent-bootstrap");
  assert.equal(config.GA4_LOADER_ID, "ga4-loader");
  assert.equal(config.GA4_ACTIVATION_AT, undefined, "no time gate");
  assert.equal(config.GA4_CONSENT_STORAGE_KEY, undefined, "no consent storage");

  for (const pathname of ["/reset", "/reset/", "/verify-signup/", "/verify-email/", "/forgot/"]) {
    assert.equal(config.isThirdPartyTokenPath(pathname), true, pathname);
  }
  assert.equal(config.isThirdPartyTokenPath("/article/example/"), false);

  const bootstrap = config.GA4_HEAD_BOOTSTRAP;
  assert.equal(countMatches(bootstrap, /gtag\('config', 'G-R2MDE3WDFY'/g), 1);
  assert.doesNotMatch(bootstrap, /gtag\('consent'/, "no consent default — stock snippet semantics");
  assert.doesNotMatch(bootstrap, /send_page_view/, "page_view must go out on load");
  assert.match(bootstrap, /allow_google_signals:\s*false/);
  assert.match(bootstrap, /allow_ad_personalization_signals:\s*false/);

  // 공개 페이지: js + config 가 큐에 쌓이고 ga-disable 은 꺼져 있다.
  // (vm 컨텍스트의 배열은 바깥 realm 과 프로토타입이 달라 strict deepEqual 이 실패한다 —
  //  Array.from 으로 바깥 realm 배열로 옮겨 비교한다.)
  const pub = runBootstrap(bootstrap, { pathname: "/economy/", referrer: "https://www.google.com/" });
  const pubCalls = Array.from(pub.dataLayer, (args) => Array.from(args)[0]);
  assert.deepEqual(pubCalls, ["js", "config"]);
  assert.equal(pub[`ga-disable-${EXPECTED_ID}`], undefined);
  assert.equal(Array.from(pub.dataLayer[1])[2].page_referrer, "https://www.google.com/");

  // 토큰 경로: config 없음 + ga-disable.
  const tok = runBootstrap(bootstrap, { pathname: "/reset/", referrer: "" });
  assert.equal(tok.dataLayer.length, 0);
  assert.equal(tok[`ga-disable-${EXPECTED_ID}`], true);

  // 토큰 경로에서 넘어온 같은 오리진 referrer 는 비운다(그 URL 에 토큰이 있다).
  const fromToken = runBootstrap(bootstrap, {
    pathname: "/",
    referrer: "https://modooilbo.com/reset/?token=abc",
  });
  assert.equal(Array.from(fromToken.dataLayer[1])[2].page_referrer, "");

  // 내부 트래픽: 쿠키가 있으면 config 없음 + ga-disable. ?modoo-internal=1 은 쿠키를 심고 같은 결과.
  assert.equal(config.INTERNAL_TRAFFIC_COOKIE, "modoo_internal");
  assert.equal(config.hasInternalTrafficCookie("a=1; modoo_internal=1; b=2"), true);
  assert.equal(config.hasInternalTrafficCookie("modoo_internal=0"), false);
  assert.equal(config.hasInternalTrafficCookie(""), false);
  const internal = runBootstrap(bootstrap, { pathname: "/", referrer: "", cookie: "modoo_internal=1" });
  assert.equal(internal.dataLayer.length, 0);
  assert.equal(internal[`ga-disable-${EXPECTED_ID}`], true);
  const optIn = runBootstrap(bootstrap, { pathname: "/economy/", referrer: "", search: "?modoo-internal=1" });
  assert.match(String(optIn.document.cookie), /modoo_internal=1; Max-Age=31536000; Path=\/; SameSite=Lax/);
  assert.equal(optIn.dataLayer.length, 0);
  assert.equal(optIn[`ga-disable-${EXPECTED_ID}`], true);
});

test("one direct Google tag owns the only GA/GTM measurement ID; consent UI is gone", async () => {
  const files = await walk(path.join(ROOT, "src"), new Set([".ts", ".tsx", ".js", ".jsx"]));
  const ids = [];
  for (const file of files) {
    if (file.endsWith(".generated.ts")) continue;
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/\b(?:G|GTM|UA)-[A-Z0-9-]{6,}\b/g)) {
      ids.push({ file: path.relative(ROOT, file), id: match[0] });
    }
  }
  assert.deepEqual(ids, [{ file: "src/lib/google-analytics.ts", id: EXPECTED_ID }]);

  const layout = await readFile(path.join(ROOT, "src/app/layout.tsx"), "utf8");
  assert.equal(countMatches(layout, /id=\{GA4_BOOTSTRAP_ID\}/g), 1);
  assert.equal(countMatches(layout, /id=\{GA4_LOADER_ID\}/g), 1);
  assert.equal(countMatches(layout, /src=\{GA4_SCRIPT_URL\}/g), 1);
  assert.match(layout, /<script id=\{GA4_LOADER_ID\} async src=\{GA4_SCRIPT_URL\} \/>/, "loader must be async like the stock snippet");
  assert.ok(
    layout.indexOf("id={GA4_BOOTSTRAP_ID}") < layout.indexOf("id={GA4_LOADER_ID}"),
    "bootstrap (dataLayer/gtag definition) must precede the loader",
  );
  // 애드센스는 hydration #418 회피용으로 next/script 를 쓴다(b81d94f) — GA 로더만 raw <script> 여야 한다.
  assert.doesNotMatch(layout, /<Script[^>]*GA4_SCRIPT_URL/, "GA loader must not go through next/script");
  assert.equal(countMatches(layout, /<ThirdPartyScripts\s*\/>/g), 1);

  for (const removed of [
    "src/components/GoogleAnalytics.tsx",
    "src/components/AnalyticsConsentSettings.tsx",
    "functions/api/analytics-status.ts",
    "scripts/google-analytics.browser.mjs",
  ]) {
    assert.equal(existsSync(path.join(ROOT, removed)), false, `${removed} must stay removed`);
  }
  const packageJson = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts?.["test:analytics:browser"],
    undefined,
    "removed consent browser test must not be reintroduced",
  );
  const thirdParty = await readFile(path.join(ROOT, "src/components/ThirdPartyScripts.tsx"), "utf8");
  assert.doesNotMatch(thirdParty, /GoogleAnalytics/);
  assert.match(thirdParty, /useRef\(isThirdPartyTokenPath\(pathname\)\)/);
  assert.match(
    thirdParty,
    /documentStartedOnTokenPath\.current\s*\|\|\s*isThirdPartyTokenPath\(pathname\)/,
    "a document opened on a token path must remain blocked until unload",
  );
  const footer = await readFile(path.join(ROOT, "src/components/Footer.tsx"), "utf8");
  assert.doesNotMatch(footer, /AnalyticsConsentSettings/);

  const tokenMiddleware = await readFile(
    path.join(ROOT, "functions/_lib/strip-token-third-party-scripts.ts"),
    "utf8",
  );
  assert.match(
    tokenMiddleware,
    /headers\.set\(\s*["']Referrer-Policy["']\s*,\s*["']no-referrer["']\s*\)/,
  );
  assert.match(tokenMiddleware, /headers\.set\(\s*["']Cache-Control["']\s*,\s*["']no-store, no-transform, max-age=0["']/);
  assert.match(tokenMiddleware, /headers\.delete\(\s*["']ETag["']\s*\)/);
  assert.match(tokenMiddleware, /upstreamHeaders\.delete\(name\)/);
  assert.match(tokenMiddleware, /script#ga4-consent-bootstrap/);
  assert.match(tokenMiddleware, /script#ga4-loader/);
  assert.match(tokenMiddleware, /GA4_BOOTSTRAP_FLIGHT_SCRIPT_PATTERN/);
  assert.match(tokenMiddleware, /GA4_LOADER_FLIGHT_SCRIPT_PATTERN/);
  assert.match(tokenMiddleware, /GA4_BOOTSTRAP_FLIGHT_TEXT_SCRIPT_PATTERN/);
  assert.match(tokenMiddleware, /GA4_LOADER_FLIGHT_TEXT_SCRIPT_PATTERN/);
  assert.match(tokenMiddleware, /normalizedContentType\.startsWith\("text\/plain"\)/);
  for (const requestHeader of [
    "If-Match",
    "If-None-Match",
    "If-Modified-Since",
    "If-Unmodified-Since",
    "If-Range",
    "Range",
  ]) {
    assert.match(
      tokenMiddleware,
      new RegExp(`["']${requestHeader}["']`),
      `token middleware must strip ${requestHeader}`,
    );
  }
  for (const pathname of ["reset", "verify-signup", "verify-email", "forgot"]) {
    const middleware = await readFile(
      path.join(ROOT, `functions/${pathname}/_middleware.ts`),
      "utf8",
    );
    assert.match(middleware, /stripTokenPageThirdPartyScripts/, pathname);
  }
});

test("CSP, privacy notice, docs, and static output expose one detectable Google tag", async () => {
  const headers = await readFile(path.join(ROOT, "public/_headers"), "utf8");
  const reportOnly = parseCspDirectives(headers, "Content-Security-Policy-Report-Only");
  assertCspSources(reportOnly, "script-src", ["https://www.googletagmanager.com"]);
  assertCspSources(reportOnly, "img-src", [
    "https://*.google-analytics.com",
    "https://www.googletagmanager.com",
  ]);
  assertCspSources(reportOnly, "connect-src", [
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
  ]);

  const privacy = await readFile(path.join(ROOT, "src/app/privacy/page.tsx"), "utf8");
  assert.match(privacy, /Google Analytics/);
  assert.match(privacy, /tools\.google\.com\/dlpage\/gaoptout/, "opt-out add-on must be disclosed");
  assert.match(privacy, /시행일: 2026년 9월 10일 · 개정일: 2026년 9월 3일/, "7-day notice rule");
  assert.match(privacy, /1600 Amphitheatre Parkway/);
  for (const stale of [/분석 쿠키 설정/, /Consent Mode/, /선택창/, /제한 측정값/, /2026-09-03 09:30 KST/]) {
    assert.doesNotMatch(privacy, stale, `privacy must not describe the removed consent flow: ${stale}`);
  }

  for (const relativePath of ["docs/tracking.md", "wiki/operations/02-growth-and-revenue.md"]) {
    const doc = await readFile(path.join(ROOT, relativePath), "utf8");
    assert.match(doc, /G-R2MDE3WDFY/, `${relativePath}: measurement id`);
    for (const stale of [
      /Consent Mode/,
      /Advanced Consent/,
      /test:analytics:browser/,
      /분석 쿠키 설정/,
      /선택창/,
      /2026-09-03 09:30 KST/,
    ]) {
      assert.doesNotMatch(doc, stale, `${relativePath}: stale consent wording ${stale}`);
    }
  }

  assert.ok(existsSync(OUT), "out/ is missing; run npm run build first");
  const htmlFiles = await walk(OUT, new Set([".html"]));
  assert.ok(htmlFiles.length > 0, "out/ contains no HTML");
  const violations = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const loaderTags = html.match(/<script\b[^>]*\bid=["']ga4-loader["'][^>]*><\/script>/gi) ?? [];
    const bootstrapTags = html.match(/<script\b[^>]*\bid=["']ga4-consent-bootstrap["'][^>]*>/gi) ?? [];
    // 순서는 단언하지 않는다 — React 19 는 <script async src> 를 리소스로 head 앞쪽에 끌어올려
    // 산출 HTML 에서 로더가 인라인보다 먼저 나온다. 이는 구글 표준 스니펫의 원래 순서
    // (async 로더 → 인라인)와 같고, gtag.js 는 나중에 정의된 dataLayer 큐도 처리한다.
    if (
      loaderTags.length !== 1 ||
      bootstrapTags.length !== 1 ||
      !loaderTags[0].includes(EXPECTED_URL) ||
      !/\basync\b/.test(loaderTags[0])
    ) {
      violations.push({
        file: path.relative(ROOT, file),
        loaderCount: loaderTags.length,
        bootstrapCount: bootstrapTags.length,
        async: loaderTags[0] ? /\basync\b/.test(loaderTags[0]) : false,
      });
    }
  }
  assert.deepEqual(
    violations,
    [],
    `direct tag invariant failed: ${JSON.stringify(violations.slice(0, 10))}`,
  );
  console.log(`checked ${htmlFiles.length} exported HTML files: one direct async Google tag each`);
});
