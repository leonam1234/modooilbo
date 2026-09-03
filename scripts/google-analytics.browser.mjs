#!/usr/bin/env node

import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = (process.argv[2] || "http://localhost:4173").replace(/\/$/, "");
const BASE_ORIGIN = new URL(`${BASE}/`).origin;
const ID = ["G", "R2MDE3WDFY"].join("-");
const SCRIPT_URL = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
const ACTIVATION_URL = "/api/analytics-status";
const ACTIVATION_AT = "2026-09-03T09:30:00+09:00";
const STORAGE_KEY = "modoo-analytics-consent-v1";
const CLIENT_CLOCK_AFTER_ACTIVATION = Date.parse("2026-09-03T09:31:00+09:00");
const PAGE_VIEW_STABILITY_MS = 2000;
const PUBLIC_PATHS = [
  "/",
  "/article/2026-09-02-july-online-shopping-25tn-mobile-78-2026/",
  "/economy/",
  "/privacy/",
  "/policy/",
];
const TOKEN_PATHS = [
  "/reset/",
  "/verify-signup/",
  "/verify-email/",
  "/forgot/",
];
const ADSENSE_SCRIPT_SELECTOR =
  'script[src*="googlesyndication.com/pagead/js/adsbygoogle.js"]';
const CLOUDFLARE_BEACON_SELECTOR =
  'script[src*="static.cloudflareinsights.com/beacon.min.js"]';
const CLOUDFLARE_JSD_SELECTOR =
  'script[src*="/cdn-cgi/challenge-platform/scripts/jsd/"]';

function isHostOrSubdomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function isGoogleHostname(hostname) {
  const host = hostname.toLowerCase();
  return (
    [
      "google.com",
      "google-analytics.com",
      "googletagmanager.com",
      "googlesyndication.com",
      "doubleclick.net",
      "googleadservices.com",
      "googleapis.com",
      "googleusercontent.com",
      "gstatic.com",
      "adtrafficquality.google",
    ].some((domain) => isHostOrSubdomain(host, domain)) ||
    /^(?:[^.]+\.)*google\.[a-z]{2,}(?:\.[a-z]{2})?$/.test(host)
  );
}

function requestEvidence(record) {
  return `${record.url}\n${record.postData}\n${record.referer}`;
}

function isExactLoaderRecord(record) {
  return record.method === "GET" && record.url === SCRIPT_URL;
}

function isGa4CollectionRecord(record) {
  if (isExactLoaderRecord(record)) return false;
  let hostname = "";
  try {
    hostname = new URL(record.url).hostname;
  } catch {}
  return (
    isHostOrSubdomain(hostname, "google-analytics.com") ||
    isHostOrSubdomain(hostname, "analytics.google.com") ||
    requestEvidence(record).includes(ID)
  );
}

function isAdsenseRecord(record) {
  try {
    const hostname = new URL(record.url).hostname;
    return (
      isHostOrSubdomain(hostname, "googlesyndication.com") ||
      isHostOrSubdomain(hostname, "doubleclick.net") ||
      isHostOrSubdomain(hostname, "googleadservices.com") ||
      isHostOrSubdomain(hostname, "adtrafficquality.google")
    );
  } catch {
    return false;
  }
}

function isCloudflareAnalyticsUrl(url) {
  return (
    isHostOrSubdomain(url.hostname, "cloudflareinsights.com") ||
    (url.origin === BASE_ORIGIN && url.pathname.startsWith("/cdn-cgi/rum"))
  );
}

function isCloudflareBeaconRecord(record) {
  try {
    const url = new URL(record.url);
    return isCloudflareAnalyticsUrl(url);
  } catch {
    return false;
  }
}

function decodedVariants(value) {
  const variants = [String(value)];
  for (let depth = 0; depth < 3; depth += 1) {
    try {
      const decoded = decodeURIComponent(variants.at(-1));
      if (decoded === variants.at(-1)) break;
      variants.push(decoded);
    } catch {
      break;
    }
  }
  return variants;
}

function containsToken(value, token) {
  const encodedToken = encodeURIComponent(token);
  return decodedVariants(value).some((candidate) =>
    candidate.includes(token) || candidate.includes(encodedToken));
}

function describeRecords(records) {
  return JSON.stringify(records.map(({
    url,
    method,
    resourceType,
    frameUrl,
    postData,
    referer,
    action,
  }) => ({
    url,
    method,
    resourceType,
    frameUrl,
    postData,
    referer,
    action,
  })), null, 2);
}

async function installClientState(context, consent) {
  await context.addInitScript(({ now, key, value }) => {
    // 서버 게이트가 유일한 활성화 기준인지 증명하기 위해 브라우저 시계는 항상 미래로 둔다.
    Date.now = () => now;
    if (value === "granted" || value === "denied") localStorage.setItem(key, value);
  }, { now: CLIENT_CLOCK_AFTER_ACTIVATION, key: STORAGE_KEY, value: consent });
}

async function installLoaderExecutionProbe(context, storageKey) {
  await context.addInitScript(({ scriptUrl, key }) => {
    document.addEventListener("load", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLScriptElement) || target.src !== scriptUrl) return;
      const previous = Number(sessionStorage.getItem(key) || "0");
      sessionStorage.setItem(key, String(previous + 1));
    }, true);
  }, { scriptUrl: SCRIPT_URL, key: storageKey });
}

async function mockServerActivation(context, active) {
  const serverNow = active ? "2026-09-03T00:31:00.000Z" : "2026-09-03T00:29:59.000Z";
  await context.route(`**${ACTIVATION_URL}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({ active, activationAt: ACTIVATION_AT, serverNow }),
    });
  });
}

/**
 * 모든 외부 요청을 기록한다. Google 계열은 정확한 gtag.js GET 한 건만 통과시키고,
 * 나머지는 204로 종료해 운영 GA/AdSense 속성에 테스트 트래픽이 도달하지 않게 한다.
 */
async function installExternalRequestFirewall(context) {
  const records = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    let url;
    try {
      url = new URL(request.url());
    } catch {
      await route.fallback();
      return;
    }

    if (
      !/^https?:$/.test(url.protocol) ||
      (url.origin === BASE_ORIGIN && !isCloudflareAnalyticsUrl(url))
    ) {
      await route.fallback();
      return;
    }

    const headers = await request.allHeaders();
    let frameUrl = "";
    try {
      frameUrl = request.frame().url();
    } catch {}
    const record = {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      frameUrl,
      postData: request.postData() ?? "",
      referer: headers.referer ?? "",
      google: isGoogleHostname(url.hostname),
      adsense: false,
      cloudflareBeacon: false,
      action: "fallback",
    };
    record.adsense = isAdsenseRecord(record);
    record.cloudflareBeacon = isCloudflareBeaconRecord(record);
    records.push(record);

    if (isExactLoaderRecord(record)) {
      record.action = "allow-loader";
      await route.continue();
      return;
    }

    // Google 외 호스트로 ID가 흘러가는 잘못된 구현도 실제 네트워크로 내보내지 않는다.
    if (record.google || record.cloudflareBeacon || requestEvidence(record).includes(ID)) {
      record.action = "blocked";
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fallback();
  });
  return records;
}

function payloadCandidates(record) {
  let query;
  try {
    query = new URL(record.url).searchParams;
  } catch {
    return [];
  }

  const bodyLines = record.postData
    ? record.postData.split(/\r?\n/).filter(Boolean)
    : [""];
  return bodyLines.map((line) => {
    const body = new URLSearchParams(line);
    return {
      get(name) {
        return body.get(name) ?? query.get(name);
      },
    };
  });
}

function payloadPath(payload) {
  const pageLocation = payload.get("dl") || payload.get("dp") || "";
  try {
    return new URL(pageLocation || "/", `${BASE}/`).pathname;
  } catch {
    return "";
  }
}

function matchingPageViews(records, startIndex, pathname) {
  const matches = [];
  for (const record of records.slice(startIndex)) {
    for (const payload of payloadCandidates(record)) {
      if (
        payload.get("tid") === ID &&
        payload.get("en") === "page_view" &&
        payloadPath(payload) === pathname
      ) {
        matches.push({ record, payload });
      }
    }
  }
  return matches;
}

function pageViewCount(records, startIndex, pathname) {
  return matchingPageViews(records, startIndex, pathname).length;
}

async function waitForStablePageView(records, startIndex, pathname, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (pageViewCount(records, startIndex, pathname) > 0) {
      await new Promise((resolve) => setTimeout(resolve, PAGE_VIEW_STABILITY_MS));
      const stableCount = pageViewCount(records, startIndex, pathname);
      assert.equal(stableCount, 1, `${label}: page_view count after 2s stabilization`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(`${label}: page_view was not observed for ${pathname}`);
}

function assertNoGa4Traffic(records, startIndex, label) {
  const leaked = records.slice(startIndex).filter(isGa4CollectionRecord);
  assert.deepEqual(leaked, [], `${label}: unexpected GA4 traffic\n${describeRecords(leaked)}`);
}

function valueReferencesTokenPath(value) {
  if (!value) return false;
  return decodedVariants(value).some((candidate) => {
    try {
      const pathname = new URL(candidate, `${BASE}/`).pathname;
      return TOKEN_PATHS.some((tokenPath) =>
        pathname === tokenPath ||
        pathname === tokenPath.slice(0, -1) ||
        pathname.startsWith(tokenPath));
    } catch {
      return TOKEN_PATHS.some((tokenPath) =>
        candidate.includes(tokenPath) || candidate.includes(tokenPath.slice(0, -1)));
    }
  });
}

function isSafeDelayedTagDiagnostics(record) {
  let url;
  try {
    url = new URL(record.url);
  } catch {
    return false;
  }
  if (
    url.hostname !== "www.googletagmanager.com" ||
    url.pathname !== "/td" ||
    !["GET", "POST"].includes(record.method)
  ) return false;

  const payloads = payloadCandidates(record);
  return payloads.length > 0 && payloads.every((payload) => {
    const measurementId = payload.get("id") || payload.get("tid");
    const location = payload.get("dl");
    const pagePath = payload.get("dp");
    const referrer = payload.get("dr");
    return (
      measurementId === ID &&
      Boolean(location || pagePath) &&
      ![location, pagePath, referrer].some(valueReferencesTokenPath)
    );
  });
}

function assertNoUnexpectedGa4TrafficAfterTokenNavigation(records, startIndex, label) {
  const leaked = records.slice(startIndex).filter((record) =>
    isGa4CollectionRecord(record) && !isSafeDelayedTagDiagnostics(record));
  assert.deepEqual(
    leaked,
    [],
    `${label}: unexpected GA4 traffic beyond a safe delayed /td request\n${describeRecords(leaked)}`,
  );
}

function verifyTagDiagnosticsAllowlist() {
  const makeRecord = (params = {}, pathname = "/td") => {
    const url = new URL(pathname, "https://www.googletagmanager.com");
    url.searchParams.set("id", ID);
    url.searchParams.set("dl", `${BASE}/`);
    for (const [name, value] of Object.entries(params)) {
      if (value == null) url.searchParams.delete(name);
      else url.searchParams.set(name, value);
    }
    return {
      url: url.href,
      method: "GET",
      resourceType: "image",
      frameUrl: `${BASE}/`,
      postData: "",
      referer: `${BASE}/`,
    };
  };

  assert.equal(isSafeDelayedTagDiagnostics(makeRecord()), true);
  assert.equal(isSafeDelayedTagDiagnostics(makeRecord({ dp: "/reset/" })), false);
  assert.equal(isSafeDelayedTagDiagnostics(makeRecord({ dr: `${BASE}/verify-email/?token=x` })), false);
  assert.equal(isSafeDelayedTagDiagnostics(makeRecord({ dl: null, dp: null })), false);
  assert.equal(isSafeDelayedTagDiagnostics(makeRecord({}, "/g/collect")), false);
}

function verifyTokenLeakDetection() {
  const token = "SENSITIVE_TEST_TOKEN_:/?#";
  const pageUrl = `${BASE}/reset/?token=${encodeURIComponent(token)}`;
  const nestedCollectUrl =
    `https://www.google-analytics.com/g/collect?tid=${ID}&dl=${encodeURIComponent(pageUrl)}`;
  assert.equal(containsToken(nestedCollectUrl, token), true);
  assert.equal(valueReferencesTokenPath(encodeURIComponent(pageUrl)), true);
}

function assertGoogleFirewall(records, label) {
  const escaped = records.filter((record) =>
    record.google && record.action !== "blocked" && !isExactLoaderRecord(record));
  const invalidLoader = records.filter((record) =>
    record.action === "allow-loader" && !isExactLoaderRecord(record));
  assert.deepEqual(escaped, [], `${label}: non-loader Google request escaped\n${describeRecords(escaped)}`);
  assert.deepEqual(invalidLoader, [], `${label}: invalid loader exception\n${describeRecords(invalidLoader)}`);
}

function assertNoExternalTokenLeak(records, startIndex, token, label) {
  const leaked = records.slice(startIndex).filter((record) =>
    [record.url, record.postData, record.referer].some((value) => containsToken(value, token)));
  assert.deepEqual(
    leaked,
    [],
    `${label}: token leaked in external URL/body/Referer\n${describeRecords(leaked)}`,
  );
}

function assertNoTokenInGaReferrer(records, startIndex, pathname, token, label) {
  const pageViews = matchingPageViews(records, startIndex, pathname);
  assert.equal(pageViews.length, 1, `${label}: expected one GA4 page_view`);
  const leaked = pageViews.filter(({ payload }) =>
    containsToken(payload.get("dr") ?? "", token));
  assert.deepEqual(
    leaked.map(({ record }) => record),
    [],
    `${label}: token leaked in GA dr\n${describeRecords(leaked.map(({ record }) => record))}`,
  );
}

async function assertNoGoogleTag(page, label) {
  assert.equal(
    await page.locator('script[src*="googletagmanager.com/gtag/js"]').count(),
    0,
    `${label}: Google tag loader exists`,
  );
  assert.equal(await page.locator("#ga4-loader").count(), 0, `${label}: loader id exists`);
  assert.equal(await page.locator("#ga4-consent-bootstrap").count(), 0, `${label}: bootstrap exists`);
}

async function assertSingleGoogleTag(page, label) {
  assert.equal(
    await page.locator('script[src*="googletagmanager.com/gtag/js"]').count(),
    1,
    `${label}: Google tag loader count`,
  );
  assert.equal(await page.locator(`script[src="${SCRIPT_URL}"]`).count(), 1, `${label}: exact loader count`);
  assert.equal(await page.locator("#ga4-loader").count(), 1, `${label}: loader id count`);
  assert.equal(
    await page.locator("#ga4-loader").getAttribute("src"),
    SCRIPT_URL,
    `${label}: loader URL`,
  );
  assert.equal(await page.locator("#ga4-consent-bootstrap").count(), 1, `${label}: bootstrap count`);
}

async function assertNoAdsenseTag(page, label) {
  assert.equal(await page.locator(ADSENSE_SCRIPT_SELECTOR).count(), 0, `${label}: AdSense tag exists`);
}

async function assertNoCloudflareBeacon(page, label) {
  assert.equal(
    await page.locator(CLOUDFLARE_BEACON_SELECTOR).count(),
    0,
    `${label}: Cloudflare Web Analytics beacon exists`,
  );
}

async function assertNoCloudflareJsd(page, label) {
  assert.equal(
    await page.locator(CLOUDFLARE_JSD_SELECTOR).count(),
    0,
    `${label}: Cloudflare JavaScript Detection script exists`,
  );
}

function countRawAdsenseReferences(html) {
  const normalized = html.replace(/\\\//g, "/");
  return [...normalized.matchAll(
    /https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/gi,
  )].length;
}

function countRawCloudflareBeaconReferences(html) {
  const normalized = html.replace(/\\\//g, "/");
  return [...normalized.matchAll(
    /https:\/\/static\.cloudflareinsights\.com\/beacon(?:\.min)?\.js/gi,
  )].length;
}

function countRawCloudflareJsdReferences(html) {
  const normalized = html.replace(/\\\//g, "/");
  return [...normalized.matchAll(
    /\/cdn-cgi\/challenge-platform\/scripts\/jsd\//gi,
  )].length;
}

function assertTokenProtectionHeaders(headers, label) {
  const get = (name) => typeof headers.get === "function"
    ? headers.get(name)
    : headers[name.toLowerCase()] ?? null;
  assert.equal(get("referrer-policy"), "no-referrer", `${label}: Referrer-Policy`);
  assert.match(get("cache-control") ?? "", /(?:^|,)\s*no-store(?:\s*(?:,|$))/i, `${label}: Cache-Control`);
  assert.match(get("cache-control") ?? "", /(?:^|,)\s*no-transform(?:\s*(?:,|$))/i, `${label}: Cache-Control no-transform`);
  assert.equal(get("pragma"), "no-cache", `${label}: Pragma`);
  assert.equal(get("expires"), "0", `${label}: Expires`);
  assert.equal(get("etag"), null, `${label}: ETag must be removed`);
  assert.equal(get("last-modified"), null, `${label}: Last-Modified must be removed`);
}

async function verifyLiveServerGate() {
  const endpoint = `${BASE}${ACTIVATION_URL}`;
  const localStaticServer = /^(?:localhost|127\.0\.0\.1)$/i.test(new URL(`${BASE}/`).hostname);
  const response = await fetch(endpoint, { headers: { accept: "application/json" } });
  if (localStaticServer && response.status === 404) {
    console.log(`SKIP(edge-runtime): ${endpoint} returned 404 on a local static server`);
    return { edgeRuntime: false };
  }
  assert.equal(response.status, 200, `${endpoint}: status`);
  const payload = await response.json();
  assert.equal(payload.activationAt, ACTIVATION_AT);
  const serverNow = Date.parse(payload.serverNow);
  assert.ok(Number.isFinite(serverNow), `${endpoint}: invalid serverNow`);
  assert.equal(payload.active, serverNow >= Date.parse(ACTIVATION_AT));
  return { edgeRuntime: true, payload };
}

async function verifyEdgeTokenIsolation(browser, edgeRuntime) {
  if (!edgeRuntime) {
    console.log("SKIP(edge-runtime): raw/hydrated AdSense and token egress checks require Pages Preview");
    return;
  }

  for (const pathname of TOKEN_PATHS) {
    const slug = pathname.replace(/[^a-z]+/gi, "_").replace(/^_|_$/g, "").toUpperCase();
    const token = `SENSITIVE_EDGE_${slug}_:/?#_${Date.now()}`;
    const target = new URL(pathname, `${BASE}/`);
    target.searchParams.set("token", token);

    const rawResponse = await fetch(target, { headers: { accept: "text/html" } });
    assert.equal(rawResponse.status, 200, `${pathname}: raw edge document status`);
    assertTokenProtectionHeaders(rawResponse.headers, `${pathname}: raw edge document`);
    const rawHtml = await rawResponse.text();
    assert.equal(
      countRawAdsenseReferences(rawHtml),
      0,
      `${pathname}: raw edge HTML contains an AdSense reference`,
    );
    assert.equal(
      countRawCloudflareBeaconReferences(rawHtml),
      0,
      `${pathname}: raw edge HTML contains a Cloudflare Web Analytics beacon reference`,
    );
    assert.equal(
      countRawCloudflareJsdReferences(rawHtml),
      0,
      `${pathname}: raw edge HTML contains a Cloudflare JavaScript Detection reference`,
    );

    const context = await browser.newContext();
    await installClientState(context, "granted");
    // 실제 endpoint가 200인 환경에서 HTMLRewriter를 통과한 문서를 받고, 클라이언트는
    // 시행 후 상태로 만들어 token-path 차단이 서버 시각에 기대지 않음을 함께 증명한다.
    await mockServerActivation(context, true);
    const records = await installExternalRequestFirewall(context);
    const page = await context.newPage();
    await page.goto(target.href, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.ga4Active === "true");
    await page.waitForTimeout(PAGE_VIEW_STABILITY_MS);
    await assertNoGoogleTag(page, `${pathname} edge hydration`);
    await assertNoAdsenseTag(page, `${pathname} edge hydration`);
    await assertNoCloudflareBeacon(page, `${pathname} edge hydration`);
    await assertNoCloudflareJsd(page, `${pathname} edge hydration`);
    assert.equal(
      await page.evaluate((measurementId) => window[`ga-disable-${measurementId}`], ID),
      true,
      `${pathname}: GA disable flag`,
    );

    const thirdPartyTelemetry = records.filter((record) =>
      record.google || record.adsense || record.cloudflareBeacon);
    assert.deepEqual(
      thirdPartyTelemetry,
      [],
      `${pathname}: Google/AdSense/Cloudflare request escaped edge token isolation\n${describeRecords(thirdPartyTelemetry)}`,
    );
    assertNoExternalTokenLeak(records, 0, token, `${pathname} edge hydration`);
    assertGoogleFirewall(records, `${pathname} edge hydration`);

    // 브라우저 캐시가 stale validator를 보내도 middleware가 조건부 요청을 fresh 200으로
    // 바꾸고 no-referrer/no-store를 다시 붙이는지 실제 reload로 확인한다.
    let conditionalReloadSeen = false;
    const conditionalMatcher = (url) => url.href === target.href;
    const conditionalHandler = async (route) => {
      if (route.request().resourceType() !== "document") {
        await route.fallback();
        return;
      }
      conditionalReloadSeen = true;
      const headers = await route.request().allHeaders();
      headers["if-none-match"] = '"synthetic-stale-token-document"';
      headers["if-modified-since"] = "Wed, 01 Jan 2025 00:00:00 GMT";
      await route.continue({ headers });
    };
    await page.route(conditionalMatcher, conditionalHandler);
    const reloadStart = records.length;
    const reloadResponse = await page.reload({ waitUntil: "domcontentloaded" });
    await page.unroute(conditionalMatcher, conditionalHandler);
    assert.equal(conditionalReloadSeen, true, `${pathname}: conditional reload was not exercised`);
    assert.ok(reloadResponse, `${pathname}: conditional reload response missing`);
    assert.equal(reloadResponse.status(), 200, `${pathname}: conditional reload status`);
    assertTokenProtectionHeaders(await reloadResponse.allHeaders(), `${pathname}: conditional reload`);
    await page.waitForFunction(() => document.documentElement.dataset.ga4Active === "true");
    await page.waitForTimeout(PAGE_VIEW_STABILITY_MS);
    await assertNoGoogleTag(page, `${pathname} conditional reload`);
    await assertNoAdsenseTag(page, `${pathname} conditional reload`);
    await assertNoCloudflareBeacon(page, `${pathname} conditional reload`);
    await assertNoCloudflareJsd(page, `${pathname} conditional reload`);
    const reloadTelemetry = records.slice(reloadStart).filter((record) =>
      record.google || record.adsense || record.cloudflareBeacon);
    assert.deepEqual(
      reloadTelemetry,
      [],
      `${pathname}: telemetry request after conditional reload\n${describeRecords(reloadTelemetry)}`,
    );
    assertNoExternalTokenLeak(records, reloadStart, token, `${pathname} conditional reload`);

    // 토큰 문서에서 공개 문서로 이동한 뒤에도 브라우저 referrer와 GA dr 어느 쪽에도
    // 원 토큰이 남지 않아야 한다. full navigation으로 응답 헤더 정책까지 실제 적용한다.
    const publicStart = records.length;
    const publicTarget = new URL("/", `${BASE}/`);
    publicTarget.searchParams.set("from", "token-isolation-test");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      page.evaluate((url) => { window.location.href = url; }, publicTarget.href),
    ]);
    assert.equal(await page.evaluate(() => document.referrer), "", `${pathname}: public referrer`);
    await page.locator(`script[src="${SCRIPT_URL}"]`).waitFor({ state: "attached" });
    await waitForStablePageView(records, publicStart, "/", `${pathname} token-to-public`);
    await assertSingleGoogleTag(page, `${pathname} token-to-public`);
    assert.equal(
      records.slice(publicStart).filter(isExactLoaderRecord).length,
      1,
      `${pathname}: token-to-public gtag.js request count`,
    );
    assertNoExternalTokenLeak(records, publicStart, token, `${pathname} token-to-public`);
    assertNoTokenInGaReferrer(records, publicStart, "/", token, `${pathname} token-to-public`);
    assertGoogleFirewall(records, `${pathname} token-to-public`);

    await context.close();
  }
}

async function verifyTokenHistoryHardNavigation(browser, edgeRuntime) {
  if (!edgeRuntime) {
    console.log("SKIP(edge-runtime): token-origin history guard requires Pages Preview");
    return;
  }

  const token = `SENSITIVE_HISTORY_RESET_:/?#_${Date.now()}`;
  const target = new URL(TOKEN_PATHS[0], `${BASE}/`);
  target.searchParams.set("token", token);
  const context = await browser.newContext();
  await installClientState(context, "granted");
  const executionStorageKey = "ga4-loader-execution-count-history-test";
  await installLoaderExecutionProbe(context, executionStorageKey);
  await mockServerActivation(context, true);
  const records = await installExternalRequestFirewall(context);
  const page = await context.newPage();
  await page.goto(target.href, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.ga4Active === "true");
  await page.waitForTimeout(PAGE_VIEW_STABILITY_MS);
  await assertNoGoogleTag(page, "token history source");

  // token 문서에서 pushState로 공개 경로를 열려 해도 SPA 상태를 이어받지 않고
  // 깨끗한 문서로 교체해야 한다. sentinel 소멸로 실제 document navigation을 증명한다.
  const historySentinel = `TOKEN_HISTORY_SENTINEL_${Date.now()}`;
  await page.evaluate((value) => { window.__ga4TokenHistorySentinel = value; }, historySentinel);
  const historyStart = records.length;
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.evaluate(() => history.pushState({}, "", "/about/")),
  ]);
  assert.equal(page.url(), `${BASE}/about/`);
  assert.equal(
    await page.evaluate(() => window.__ga4TokenHistorySentinel),
    undefined,
    "token history guard did not replace the document",
  );
  assert.equal(await page.evaluate(() => document.referrer), "", "token history public referrer");
  await page.locator(`script[src="${SCRIPT_URL}"]`).waitFor({ state: "attached" });
  await waitForStablePageView(records, historyStart, "/about/", "token history to public");
  await assertSingleGoogleTag(page, "token history to public");
  assert.equal(
    await page.evaluate((key) => Number(sessionStorage.getItem(key) || "0"), executionStorageKey),
    1,
    "token history to public: loader execution count",
  );
  const configs = await page.evaluate((measurementId) =>
    (window.dataLayer || []).filter((entry) =>
      entry?.[0] === "config" && entry?.[1] === measurementId).length,
  ID);
  assert.equal(configs, 1, "token history to public: config count");
  const historyLoaders = records.slice(historyStart).filter(isExactLoaderRecord);
  const destinationLoaders = historyLoaders.filter((record) => {
    try {
      return new URL(record.frameUrl).pathname === "/about/";
    } catch {
      return false;
    }
  });
  assert.equal(
    destinationLoaders.length,
    1,
    `token history to public: executable-document loader request count\n${describeRecords(historyLoaders)}`,
  );
  const precommitPreloads = historyLoaders.filter((record) => !destinationLoaders.includes(record));
  assert.ok(
    precommitPreloads.length <= 1 && precommitPreloads.every((record) =>
      record.resourceType === "script" &&
      containsToken(record.frameUrl, token) &&
      record.referer === "" &&
      record.postData === ""),
    `token history to public: unexpected extra loader request\n${describeRecords(precommitPreloads)}`,
  );
  assertNoExternalTokenLeak(records, historyStart, token, "token history to public");
  assertNoTokenInGaReferrer(records, historyStart, "/about/", token, "token history to public");
  assertGoogleFirewall(records, "token history to public");
  await context.close();
}

verifyTagDiagnosticsAllowlist();
verifyTokenLeakDetection();

const browser = await chromium.launch({ headless: true });
try {
  const { edgeRuntime } = await verifyLiveServerGate();

  // 서버가 시행 전이면 방문자가 기기 시계를 미래로 바꾸고 허용값을 저장해도 완전 미로드한다.
  {
    const context = await browser.newContext();
    await mockServerActivation(context, false);
    await installClientState(context, "granted");
    const records = await installExternalRequestFirewall(context);
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.documentElement.dataset.ga4Active === "false",
    );
    await assertNoGoogleTag(page, "server before activation");
    assert.equal(await page.getByLabel("분석 쿠키 선택").count(), 0);
    assertNoGa4Traffic(records, 0, "server before activation");
    assert.equal(await page.evaluate((measurementId) => window[`ga-disable-${measurementId}`], ID), true);
    assertGoogleFirewall(records, "server before activation");
    await context.close();
  }

  // 서버 시행 후 최초 방문: 선택창은 보이지만 허용 전에는 Basic Consent로 완전 미로드한다.
  {
    const context = await browser.newContext();
    await mockServerActivation(context, true);
    await installClientState(context, null);
    const records = await installExternalRequestFirewall(context);
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const banner = page.getByLabel("분석 쿠키 선택");
    await banner.waitFor({ state: "visible" });
    await assertNoGoogleTag(page, "before consent");
    assertNoGa4Traffic(records, 0, "before consent");
    await banner.getByRole("button", { name: "거부" }).click();
    await banner.waitFor({ state: "hidden" });
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), "denied");
    const afterDenial = records.length;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.ga4Active === "true");
    await page.waitForTimeout(200);
    await assertNoGoogleTag(page, "after denial");
    assert.equal(await page.getByLabel("분석 쿠키 선택").count(), 0);
    assertNoGa4Traffic(records, afterDenial, "after denial");
    assertGoogleFirewall(records, "consent denied");
    await context.close();
  }

  // 실제 허용 버튼과 이후 철회가 loader·쿠키 수명주기를 올바르게 바꾸는지 확인한다.
  {
    const context = await browser.newContext();
    await mockServerActivation(context, true);
    await installClientState(context, null);
    const records = await installExternalRequestFirewall(context);
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const start = records.length;
    await page.getByRole("button", { name: "국외이전·분석 허용" }).click();
    await page.locator(`script[src="${SCRIPT_URL}"]`).waitFor({ state: "attached" });
    await waitForStablePageView(records, start, "/", "allow click");
    await assertSingleGoogleTag(page, "allow click");
    const configs = await page.evaluate((measurementId) =>
      (window.dataLayer || []).filter((entry) =>
        entry?.[0] === "config" && entry?.[1] === measurementId).length,
    ID);
    assert.equal(configs, 1, "allow click: config count");
    assert.equal(
      records.slice(start).filter(isExactLoaderRecord).length,
      1,
      "allow click: gtag.js request count",
    );
    await page.getByRole("button", { name: "분석 쿠키 설정" }).click();
    await page.getByLabel("분석 쿠키 선택").waitFor({ state: "visible" });
    // Footer 버튼을 화면에 보이게 하는 자동 스크롤이 기존 허용 상태의 90% 이벤트를 만들 수
    // 있으므로, Google의 지연 전송까지 먼저 비운 뒤 철회 클릭부터 새 요청이 없는지 검사한다.
    await page.waitForTimeout(6000);
    const withdrawalStart = records.length;
    await Promise.all([
      page.waitForEvent("load"),
      page.getByLabel("분석 쿠키 선택").getByRole("button", { name: "거부" }).click(),
    ]);
    await page.waitForFunction(() => document.documentElement.dataset.ga4Active === "true");
    await page.waitForTimeout(250);
    await assertNoGoogleTag(page, "after consent withdrawal");
    assertNoGa4Traffic(records, withdrawalStart, "after consent withdrawal");
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), "denied");
    assert.equal(
      await page.evaluate(() => document.cookie
        .split(";")
        .map((part) => part.split("=", 1)[0]?.trim())
        .some((name) => name === "_ga" || name?.startsWith("_ga_"))),
      false,
    );
    assertGoogleFirewall(records, "allow then withdraw");
    await context.close();
  }

  // 서버 시행 후 허용 저장 상태: 공개 경로의 loader/config와 실제 page_view가 각각 정확히 하나다.
  {
    const context = await browser.newContext();
    await mockServerActivation(context, true);
    await installClientState(context, "granted");
    const records = await installExternalRequestFirewall(context);
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    for (const pathname of PUBLIC_PATHS) {
      const start = records.length;
      await page.goto(`${BASE}${pathname}`, { waitUntil: "domcontentloaded" });
      await page.locator(`script[src="${SCRIPT_URL}"]`).waitFor({ state: "attached" });
      await waitForStablePageView(records, start, pathname, pathname);
      await assertSingleGoogleTag(page, pathname);
      const configs = await page.evaluate((measurementId) =>
        (window.dataLayer || []).filter((entry) =>
          entry?.[0] === "config" && entry?.[1] === measurementId).length,
      ID);
      assert.equal(configs, 1, `${pathname}: config count`);
      assert.equal(
        records.slice(start).filter(isExactLoaderRecord).length,
        1,
        `${pathname}: gtag.js request count`,
      );
    }

    let start = records.length;
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.locator(`script[src="${SCRIPT_URL}"]`).waitFor({ state: "attached" });
    await waitForStablePageView(records, start, "/", "SPA initial page");

    const spaSentinel = `SPA_SENTINEL_${Date.now()}`;
    await page.evaluate((value) => { window.__ga4SpaSentinel = value; }, spaSentinel);
    start = records.length;
    await page.getByRole("link", { name: "경제", exact: true }).first().click();
    await page.waitForURL(/\/economy\/$/);
    assert.equal(
      await page.evaluate(() => window.__ga4SpaSentinel),
      spaSentinel,
      "SPA navigation replaced the document",
    );
    await waitForStablePageView(records, start, "/economy/", "SPA navigation");
    assert.equal(
      records.slice(start).filter(isExactLoaderRecord).length,
      0,
      "SPA navigation re-requested gtag.js",
    );
    await assertSingleGoogleTag(page, "SPA navigation");

    // 프로그램 방식의 토큰 경로 전환도 pushState에 머물지 않고 새 문서로 강제된다.
    start = records.length;
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.locator(`script[src="${SCRIPT_URL}"]`).waitFor({ state: "attached" });
    await waitForStablePageView(records, start, "/", "token guard initial page");
    const hardNavigationSentinel = `HARD_NAV_SENTINEL_${Date.now()}`;
    await page.evaluate((value) => { window.__ga4HardNavigationSentinel = value; }, hardNavigationSentinel);
    start = records.length;
    const sensitiveToken = "SENSITIVE_TEST_TOKEN_:/?#";
    const expectedTokenUrl = new URL("/reset/", `${BASE}/`);
    expectedTokenUrl.searchParams.set("token", sensitiveToken);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      page.evaluate((url) => history.pushState({}, "", url), expectedTokenUrl.href),
    ]);
    assert.equal(page.url(), expectedTokenUrl.href);
    assert.equal(
      await page.evaluate(() => window.__ga4HardNavigationSentinel),
      undefined,
      "token guard did not replace the document",
    );
    await page.waitForTimeout(1000);
    await assertNoGoogleTag(page, "public to token hard navigation");
    assert.equal(await page.evaluate((measurementId) => window[`ga-disable-${measurementId}`], ID), true);
    // gtag.js may finish a delayed tag-diagnostics request for the preceding public
    // document after navigation starts. It is safe only when the payload still names
    // the public URL; any GA payload that names a token route remains a hard failure.
    assertNoUnexpectedGa4TrafficAfterTokenNavigation(
      records,
      start,
      "public to token hard navigation",
    );
    assertNoExternalTokenLeak(records, start, sensitiveToken, "public to token hard navigation");

    for (const pathname of TOKEN_PATHS) {
      const token = `SENSITIVE_DIRECT_${pathname.replace(/[^a-z]+/gi, "_")}_${Date.now()}`;
      const target = new URL(pathname, `${BASE}/`);
      target.searchParams.set("token", token);
      const directStart = records.length;
      const tokenPage = await context.newPage();
      await tokenPage.goto(target.href, { waitUntil: "domcontentloaded" });
      await tokenPage.waitForTimeout(1000);
      await assertNoGoogleTag(tokenPage, pathname);
      assertNoGa4Traffic(records, directStart, pathname);
      assertNoExternalTokenLeak(records, directStart, token, pathname);
      assert.equal(
        await tokenPage.evaluate((measurementId) => window[`ga-disable-${measurementId}`], ID),
        true,
        `${pathname}: disable flag`,
      );
      await tokenPage.close();
    }

    assertGoogleFirewall(records, "public/token navigation suite");
    const relevantErrors = consoleErrors.filter((message) =>
      /google-analytics|googletagmanager|content security policy/i.test(message));
    assert.deepEqual(relevantErrors, [], relevantErrors.join("\n"));
    await context.close();
  }

  await verifyEdgeTokenIsolation(browser, edgeRuntime);
  await verifyTokenHistoryHardNavigation(browser, edgeRuntime);

  console.log(
    `PASS: GA4 server gate + Basic Consent browser checks (${PUBLIC_PATHS.length} public + ${TOKEN_PATHS.length} token paths)`,
  );
} finally {
  await browser.close();
}
