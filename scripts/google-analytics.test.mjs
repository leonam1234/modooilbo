#!/usr/bin/env node

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

test("GA4 configuration is fixed, server-gated after notice, and token paths stay blocked", async () => {
  const config = await loadAnalyticsConfig();
  assert.equal(config.GA4_MEASUREMENT_ID, EXPECTED_ID);
  assert.equal(config.GA4_SCRIPT_URL, EXPECTED_URL);
  assert.equal(config.GA4_ACTIVATION_AT, "2026-09-10T12:00:00+09:00");
  assert.equal(config.GA4_ACTIVATION_STATUS_URL, "/api/analytics-status");
  assert.equal(config.isGa4ActiveAt(Date.parse("2026-09-10T11:59:59+09:00")), false);
  assert.equal(config.isGa4ActiveAt(Date.parse("2026-09-10T12:00:00+09:00")), true);

  for (const pathname of [
    "/reset",
    "/reset/",
    "/verify-signup/",
    "/verify-email/",
    "/forgot/",
  ]) {
    assert.equal(config.isThirdPartyTokenPath(pathname), true, pathname);
  }
  assert.equal(config.isThirdPartyTokenPath("/article/example/"), false);
});

test("one global Basic Consent implementation owns the only GA/GTM measurement ID", async () => {
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

  const component = await readFile(path.join(ROOT, "src/components/GoogleAnalytics.tsx"), "utf8");
  assert.equal(countMatches(component, /src=\{GA4_SCRIPT_URL\}/g), 1);
  assert.equal(countMatches(component, /gtag\('config', '\$\{GA4_MEASUREMENT_ID\}'/g), 1);
  assert.match(component, /analytics_storage:\s*["']denied["']/);
  assert.match(component, /analytics_storage:\s*["']granted["']/);
  assert.match(component, /active\s*&&\s*!blocked\s*&&\s*consent\s*===\s*"granted"/);
  assert.match(component, /allow_google_signals:\s*false/);
  assert.match(component, /allow_ad_personalization_signals:\s*false/);
  assert.match(component, /modooPageReferrer\s*=\s*document\.referrer/);
  assert.match(component, /modooPageReferrer\s*=\s*['"]{2}/);
  assert.match(component, /page_referrer:\s*modooPageReferrer/);
  assert.match(component, /fetch\(GA4_ACTIVATION_STATUS_URL/);
  assert.doesNotMatch(component, /Date\.now\(/, "client clock must not activate GA4");
  assert.match(component, /window\.location\.assign/, "token routes must force a fresh document");

  const activationFunction = await readFile(
    path.join(ROOT, "functions/api/analytics-status.ts"),
    "utf8",
  );
  assert.match(activationFunction, /const\s+serverNow\s*=\s*Date\.now\(\)/);
  assert.match(activationFunction, /isGa4ActiveAt\(serverNow\)/);
  assert.match(activationFunction, /new Date\(serverNow\)\.toISOString\(\)/);
  assert.match(activationFunction, /cache-control["']?:\s*["']no-store/i);

  const thirdParty = await readFile(path.join(ROOT, "src/components/ThirdPartyScripts.tsx"), "utf8");
  assert.equal(countMatches(thirdParty, /<GoogleAnalytics\b/g), 1);
  assert.match(thirdParty, /<GoogleAnalytics blocked=\{blocked\}/);
  const layout = await readFile(path.join(ROOT, "src/app/layout.tsx"), "utf8");
  assert.equal(countMatches(layout, /<ThirdPartyScripts\s*\/>/g), 1);

  const tokenMiddleware = await readFile(
    path.join(ROOT, "functions/_lib/strip-token-third-party-scripts.ts"),
    "utf8",
  );
  assert.match(
    tokenMiddleware,
    /headers\.set\(\s*["']Referrer-Policy["']\s*,\s*["']no-referrer["']\s*\)/,
  );
  assert.match(tokenMiddleware, /headers\.set\(\s*["']Cache-Control["']\s*,\s*["']no-store, max-age=0["']/);
  assert.match(tokenMiddleware, /headers\.delete\(\s*["']ETag["']\s*\)/);
  assert.match(tokenMiddleware, /upstreamHeaders\.delete\(name\)/);
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

test("CSP and privacy notice cover GA4 while pre-consent export contains no active Google tag", async () => {
  const headers = await readFile(path.join(ROOT, "public/_headers"), "utf8");
  const reportOnly = parseCspDirectives(headers, "Content-Security-Policy-Report-Only");
  assertCspSources(reportOnly, "script-src", [
    "https://www.googletagmanager.com",
  ]);
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
  assert.match(privacy, /시행 예정일: 2026-09-10 12:00 KST/);
  assert.match(privacy, /분석 쿠키 설정/);
  assert.match(privacy, /1600 Amphitheatre Parkway/);
  assert.match(privacy, /14개월을\s+초과해\s+보유하지\s+않도록/);

  assert.ok(existsSync(OUT), "out/ is missing; run npm run build first");
  const htmlFiles = await walk(OUT, new Set([".html"]));
  assert.ok(htmlFiles.length > 0, "out/ contains no HTML");
  const violations = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    if (/<script\b[^>]*src=["'][^"']*googletagmanager\.com\/gtag\/js/i.test(html)) {
      violations.push(path.relative(ROOT, file));
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Basic Consent violation: pre-consent Google tag found in ${violations.join(", ")}`,
  );
  console.log(`checked ${htmlFiles.length} exported HTML files: pre-consent Google tag 0`);
});
