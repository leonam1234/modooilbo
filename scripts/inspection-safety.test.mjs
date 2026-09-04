#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  BLOCKED_ANALYTICS_HOST_SUFFIXES,
  INTERNAL_TRAFFIC_COOKIE,
  isBlockedAnalyticsRequest,
  isBlockedInspectionRequest,
  isModooProductionRequest,
  normalizeInspectionTarget,
  protectPlaywrightInspectionContext,
} from "./lib/inspection-safety.mjs";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));

test("inspection targets allow only Cloudflare Preview and loopback", () => {
  assert.equal(
    normalizeInspectionTarget("https://build-123.modooilbo.pages.dev/article/a/?x=1#top").href,
    "https://build-123.modooilbo.pages.dev/",
  );
  assert.equal(normalizeInspectionTarget("http://localhost:3000/foo").href, "http://localhost:3000/");
  assert.equal(normalizeInspectionTarget("http://127.0.0.1:3001/").href, "http://127.0.0.1:3001/");
  assert.equal(normalizeInspectionTarget("http://[::1]:3002/").href, "http://[::1]:3002/");

  assert.throws(
    () => normalizeInspectionTarget("https://modooilbo.com/"),
    /운영 도메인을 사용할 수 없습니다/,
  );
  assert.throws(
    () => normalizeInspectionTarget("https://www.modooilbo.com/"),
    /운영 도메인을 사용할 수 없습니다/,
  );
  assert.throws(
    () => normalizeInspectionTarget("https://modooilbo.pages.dev/"),
    /운영 도메인을 사용할 수 없습니다/,
  );
  assert.throws(
    () => normalizeInspectionTarget("https://example.com/"),
    /modooilbo\.pages\.dev 또는 loopback/,
  );
  assert.throws(
    () => normalizeInspectionTarget("https://other-project.pages.dev/"),
    /modooilbo\.pages\.dev 또는 loopback/,
  );
  assert.throws(
    () => normalizeInspectionTarget("http://build-123.modooilbo.pages.dev/"),
    /Preview URL은 https:\/\//,
  );
});

test("analytics matcher blocks the required host families without substring false positives", () => {
  const required = [
    "https://static.cloudflareinsights.com/beacon.min.js",
    "https://www.googletagmanager.com/gtag/js?id=G-R2MDE3WDFY",
    "https://region1.google-analytics.com/g/collect",
    "https://www.clarity.ms/tag/example",
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    "https://stats.g.doubleclick.net/g/collect",
  ];
  for (const url of required) assert.equal(isBlockedAnalyticsRequest(url), true, url);

  assert.ok(BLOCKED_ANALYTICS_HOST_SUFFIXES.includes("cloudflareinsights.com"));
  assert.equal(isBlockedAnalyticsRequest("https://google-analytics.com.example.test/collect"), false);
  assert.equal(isBlockedAnalyticsRequest("https://example.test/path/google-analytics.com"), false);
  assert.equal(isBlockedAnalyticsRequest("not-a-url"), false);
});

test("inspection routing blocks production redirects and absolute production subresources", () => {
  for (const url of [
    "https://modooilbo.com/article/a/",
    "https://www.modooilbo.com/_next/static/chunks/app.js",
    "https://media.modooilbo.com/image.jpg",
    "https://modooilbo.pages.dev/article/a/",
  ]) {
    assert.equal(isModooProductionRequest(url), true, url);
    assert.equal(isBlockedInspectionRequest(url), true, url);
  }
  assert.equal(isBlockedInspectionRequest("https://build-123.modooilbo.pages.dev/article/a/"), false);
  assert.equal(isBlockedInspectionRequest("https://modooilbo.com.example.test/image.jpg"), false);
  assert.equal(isBlockedInspectionRequest("https://www.googletagmanager.com/gtag/js"), true);
});

test("Playwright context protection installs the route before the internal cookie", async () => {
  const calls = [];
  let matcher;
  let handler;
  const context = {
    async route(nextMatcher, nextHandler) {
      calls.push("route");
      matcher = nextMatcher;
      handler = nextHandler;
    },
    async addCookies(cookies) {
      calls.push("cookies");
      assert.deepEqual(cookies, [{
        name: INTERNAL_TRAFFIC_COOKIE,
        value: "1",
        url: "https://build-123.modooilbo.pages.dev/",
        sameSite: "Lax",
      }]);
    },
  };

  const target = await protectPlaywrightInspectionContext(
    context,
    "https://build-123.modooilbo.pages.dev/article/a/",
  );
  assert.equal(target.href, "https://build-123.modooilbo.pages.dev/");
  assert.deepEqual(calls, ["route", "cookies"]);
  assert.equal(matcher(new URL("https://www.googletagmanager.com/gtag/js")), true);
  assert.equal(matcher(new URL("https://modooilbo.com/article/redirect-target/")), true);
  assert.equal(matcher(new URL("https://build-123.modooilbo.pages.dev/_next/app.js")), false);

  let abortReason;
  await handler({ abort: async (reason) => { abortReason = reason; } });
  assert.equal(abortReason, "blockedbyclient");
});

test("every repository Playwright inspection context is paired with the shared protection", () => {
  const files = readdirSync(SCRIPTS_DIR, { recursive: true })
    .filter((file) => /\.(?:c?js|mjs)$/.test(file));
  const playwrightFiles = files.filter((file) => {
    const source = readFileSync(join(SCRIPTS_DIR, file), "utf8");
    return /from ["']playwright["']/.test(source);
  });

  assert.deepEqual(playwrightFiles.sort(), ["mobile-smoke.mjs", "shoot.mjs"]);
  for (const file of playwrightFiles) {
    const source = readFileSync(join(SCRIPTS_DIR, file), "utf8");
    const contexts = source.match(/\.newContext\s*\(/g) ?? [];
    const protections = source.match(/protectPlaywrightInspectionContext\s*\(/g) ?? [];
    assert.ok(contexts.length > 0, `${file}: Playwright context not found`);
    assert.equal(
      protections.length,
      contexts.length,
      `${file}: every newContext() must immediately use protectPlaywrightInspectionContext()`,
    );
  }
});
