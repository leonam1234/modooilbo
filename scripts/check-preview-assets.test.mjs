#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import {
  auditPreviewAssets,
  evenlySample,
  extractNextJsAssets,
  parseArgs,
} from "./check-preview-assets.mjs";

let server;
let baseUrl;
let brokenAsset = false;
const requests = [];

function xml(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>${body}`;
}

function html(...assets) {
  return `<!doctype html><html><head>${assets
    .map((asset, index) => index % 2 === 0
      ? `<script src="${asset}"></script>`
      : `<link rel="preload" href="${asset}" as="script">`)
    .join("")}</head><body>ok</body></html>`;
}

before(async () => {
  server = createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    requests.push(url.pathname);
    response.setHeader("content-type", "text/plain; charset=utf-8");

    if (url.pathname === "/sitemap.xml") {
      response.setHeader("content-type", "application/xml");
      response.end(xml(`<sitemapindex>
        <sitemap><loc>https://modooilbo.com/sitemap-pages.xml</loc></sitemap>
        <sitemap><loc>https://modooilbo.com/sitemap-articles/2026/sitemap.xml</loc></sitemap>
      </sitemapindex>`));
      return;
    }
    if (url.pathname === "/sitemap-pages.xml") {
      response.setHeader("content-type", "application/xml");
      response.end(xml(`<urlset>
        <url><loc>https://modooilbo.com/</loc></url>
        <url><loc>https://modooilbo.com/policy/?a=1&amp;b=2</loc></url>
      </urlset>`));
      return;
    }
    if (url.pathname === "/sitemap-articles/2026/sitemap.xml") {
      response.setHeader("content-type", "application/xml");
      response.end(xml(`<urlset>${["a", "b", "c", "d", "e"]
        .map((slug) => `<url><loc>https://modooilbo.com/article/${slug}/</loc></url>`)
        .join("")}</urlset>`));
      return;
    }
    if (url.pathname === "/" || url.pathname === "/policy/") {
      response.setHeader("content-type", "text/html");
      response.end(html("/_next/static/chunks/common.js"));
      return;
    }
    if (["/article/a/", "/article/c/", "/article/e/"].includes(url.pathname)) {
      response.setHeader("content-type", "text/html");
      response.end(html(
        "https://modooilbo.com/_next/static/chunks/common.js",
        "/_next/static/chunks/article.js?build=abc&amp;mode=preview",
      ));
      return;
    }
    if (url.pathname === "/_next/static/chunks/common.js") {
      response.end("console.log('common')");
      return;
    }
    if (url.pathname === "/_next/static/chunks/article.js") {
      response.statusCode = brokenAsset ? 404 : 200;
      response.end(brokenAsset ? "missing" : "console.log('article')");
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("evenlySample includes first, middle, and last entries", () => {
  assert.deepEqual(evenlySample(["a", "b", "c", "d", "e"], 3), ["a", "c", "e"]);
});

test("extractNextJsAssets remaps canonical assets to the Preview origin", () => {
  const result = extractNextJsAssets(
    html(
      "https://modooilbo.com/_next/static/chunks/a.js",
      "/_next/static/chunks/b.js?x=1&amp;y=2",
      "/images/not-a-chunk.js",
    ),
    `${baseUrl}/policy/`,
    new URL(`${baseUrl}/`),
  );
  assert.deepEqual(result, [
    `${baseUrl}/_next/static/chunks/a.js`,
    `${baseUrl}/_next/static/chunks/b.js?x=1&y=2`,
  ]);
});

test("parseArgs accepts bounded concurrency and exhaustive article mode", () => {
  assert.deepEqual(
    parseArgs([baseUrl, "--all-articles", "--concurrency=4", "--retries", "0"]),
    {
      baseUrl,
      articleSamples: 3,
      concurrency: 4,
      retries: 0,
      timeoutMs: 15_000,
      allArticles: true,
      help: false,
    },
  );
});

test("audit checks all major pages, sampled articles, and unique JS assets", async () => {
  requests.length = 0;
  brokenAsset = false;
  const report = await auditPreviewAssets(baseUrl, {
    articleSamples: 3,
    concurrency: 3,
    retries: 0,
    timeoutMs: 2_000,
  });

  assert.equal(report.pass, true);
  assert.equal(report.sitemapCount, 3);
  assert.equal(report.selectedMajorPages, 2);
  assert.equal(report.discoveredArticlePages, 5);
  assert.equal(report.selectedArticlePages, 3);
  assert.equal(report.selectedPages, 5);
  assert.deepEqual(report.assetResults.map((asset) => new URL(asset.url).pathname), [
    "/_next/static/chunks/article.js",
    "/_next/static/chunks/common.js",
  ]);
  assert.ok(requests.includes("/article/a/"));
  assert.ok(requests.includes("/article/c/"));
  assert.ok(requests.includes("/article/e/"));
  assert.ok(!requests.includes("/article/b/"));
  assert.ok(!requests.includes("/article/d/"));
});

test("audit fails when a currently referenced JS asset is not HTTP 200", async () => {
  brokenAsset = true;
  const report = await auditPreviewAssets(baseUrl, {
    articleSamples: 3,
    concurrency: 3,
    retries: 0,
    timeoutMs: 2_000,
  });

  assert.equal(report.pass, false);
  assert.equal(report.failedAssets.length, 1);
  assert.equal(report.failedAssets[0].status, 404);
  assert.equal(new URL(report.failedAssets[0].url).pathname, "/_next/static/chunks/article.js");
});
