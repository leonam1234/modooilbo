#!/usr/bin/env node

import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { normalizeInspectionTarget } from "./lib/inspection-safety.mjs";

const DEFAULTS = Object.freeze({
  articleSamples: 3,
  concurrency: 8,
  retries: 2,
  timeoutMs: 15_000,
});

const MAX_SITEMAPS = 100;
const MAX_URLS_PER_SITEMAP = 50_000;
const MAX_DISCOVERED_PAGES = 100_000;
const USER_AGENT = "Modooilbo-Preview-Asset-Check/1.0";

function usage() {
  return `
Usage:
  npm run check:preview-assets -- https://<preview>.modooilbo.pages.dev

Options:
  --all-articles          Check every article URL in the sitemap
  --article-samples <n>  Article samples per article sitemap (default: ${DEFAULTS.articleSamples})
  --concurrency <n>      Concurrent page/asset requests, 1-32 (default: ${DEFAULTS.concurrency})
  --timeout-ms <n>       Per-request timeout, 1000-120000 (default: ${DEFAULTS.timeoutMs})
  --retries <n>          Retries for network/429/5xx failures, 0-5 (default: ${DEFAULTS.retries})
  --help                 Show this help

Default coverage:
  Every URL in non-article sitemaps, plus evenly spaced article samples from
  each article sitemap. Every unique /_next/static/*.js URL referenced by the
  selected HTML is requested from the supplied Preview origin and must return
  HTTP 200 without a redirect.
`;
}

function parseInteger(name, raw, min, max) {
  if (!/^\d+$/.test(raw ?? "")) {
    throw new Error(`${name} must be an integer (${min}-${max}).`);
  }
  const value = Number(raw);
  if (value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}.`);
  }
  return value;
}

function takeOptionValue(argv, index, inlineValue, name) {
  if (inlineValue !== undefined) return { value: inlineValue, nextIndex: index };
  if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return { value: argv[index + 1], nextIndex: index + 1 };
}

export function parseArgs(argv) {
  const options = { ...DEFAULTS, allArticles: false, help: false };
  let baseUrl;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--all-articles") {
      options.allArticles = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      if (baseUrl) throw new Error(`Unexpected positional argument: ${arg}`);
      baseUrl = arg;
      continue;
    }

    const [name, inlineValue] = arg.split("=", 2);
    const accepted = new Map([
      ["--article-samples", ["articleSamples", 1, 100]],
      ["--concurrency", ["concurrency", 1, 32]],
      ["--timeout-ms", ["timeoutMs", 1_000, 120_000]],
      ["--retries", ["retries", 0, 5]],
    ]);
    const definition = accepted.get(name);
    if (!definition) throw new Error(`Unknown option: ${name}`);
    const { value, nextIndex } = takeOptionValue(argv, i, inlineValue, name);
    i = nextIndex;
    const [key, min, max] = definition;
    options[key] = parseInteger(name, value, min, max);
  }

  if (!options.help && !baseUrl) throw new Error("Preview base URL is required.");
  return { baseUrl, ...options };
}

export function normalizeBaseUrl(raw) {
  return normalizeInspectionTarget(raw, "Preview URL");
}

function decodeEntities(value) {
  return value.replace(
    /&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,
    (entity) => {
      const named = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
      };
      const lower = entity.toLowerCase();
      if (named[lower]) return named[lower];
      const hex = lower.startsWith("&#x");
      const digits = entity.slice(hex ? 3 : 2, -1);
      const codePoint = Number.parseInt(digits, hex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    },
  );
}

export function extractXmlLocs(xml) {
  const locs = [];
  const pattern = /<loc\b[^>]*>([\s\S]*?)<\/loc>/gi;
  for (const match of xml.matchAll(pattern)) {
    const value = decodeEntities(match[1].trim());
    if (value) locs.push(value);
  }
  return locs;
}

function remapToPreview(rawUrl, previewBase) {
  const source = new URL(rawUrl, previewBase);
  return new URL(`${source.pathname}${source.search}`, previewBase).href;
}

export function extractNextJsAssets(html, pageUrl, previewBase) {
  const assets = new Set();
  const attr = /\b(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  for (const match of html.matchAll(attr)) {
    const raw = decodeEntities(match[1] ?? match[2] ?? match[3] ?? "");
    if (!raw) continue;
    let resolved;
    try {
      resolved = new URL(raw, pageUrl);
    } catch {
      continue;
    }
    if (!resolved.pathname.startsWith("/_next/static/") || !resolved.pathname.endsWith(".js")) {
      continue;
    }
    assets.add(new URL(`${resolved.pathname}${resolved.search}`, previewBase).href);
  }
  return [...assets].sort();
}

export function evenlySample(items, count) {
  if (items.length <= count) return [...items];
  if (count === 1) return [items[0]];
  const selected = new Set();
  for (let i = 0; i < count; i += 1) {
    selected.add(Math.round((i * (items.length - 1)) / (count - 1)));
  }
  return [...selected].map((index) => items[index]);
}

async function mapLimit(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function failureMessage(error, timeoutMs) {
  if (error?.name === "AbortError" || error?.name === "TimeoutError") {
    return `timeout after ${timeoutMs}ms`;
  }
  return error instanceof Error ? error.message : String(error);
}

function shouldRetryStatus(status) {
  return status === 429 || status >= 500;
}

async function request(url, {
  fetchImpl,
  retries,
  timeoutMs,
  readBody,
  accept,
}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        headers: {
          accept,
          "user-agent": USER_AGENT,
        },
        redirect: "manual",
        signal: controller.signal,
      });
      const location = response.headers.get("location");
      if (response.status === 200) {
        const body = readBody ? await response.text() : undefined;
        if (!readBody) await response.body?.cancel();
        return { ok: true, status: 200, body, location: null, attempts: attempt + 1 };
      }
      await response.body?.cancel();
      if (attempt < retries && shouldRetryStatus(response.status)) {
        await delay(150 * (attempt + 1));
        continue;
      }
      return {
        ok: false,
        status: response.status,
        error: `HTTP ${response.status}${location ? ` -> ${location}` : ""}`,
        location,
        attempts: attempt + 1,
      };
    } catch (error) {
      if (attempt < retries) {
        await delay(150 * (attempt + 1));
        continue;
      }
      return {
        ok: false,
        status: null,
        error: failureMessage(error, timeoutMs),
        location: null,
        attempts: attempt + 1,
      };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("unreachable");
}

async function fetchSitemap(url, options) {
  const result = await request(url, {
    ...options,
    readBody: true,
    accept: "application/xml,text/xml;q=0.9,*/*;q=0.1",
  });
  if (!result.ok) throw new Error(`${url}: ${result.error}`);
  const xml = result.body;
  const isIndex = /<sitemapindex\b/i.test(xml);
  const isUrlSet = /<urlset\b/i.test(xml);
  if (!isIndex && !isUrlSet) {
    throw new Error(`${url}: response is neither sitemapindex nor urlset.`);
  }
  const locs = extractXmlLocs(xml);
  if (locs.length > MAX_URLS_PER_SITEMAP) {
    throw new Error(`${url}: ${locs.length} URLs exceed the ${MAX_URLS_PER_SITEMAP} safety limit.`);
  }
  return { isIndex, locs };
}

export async function discoverSitemapGroups(previewBase, requestOptions) {
  const queue = [new URL("/sitemap.xml", previewBase).href];
  const seen = new Set();
  const groups = [];
  let discoveredPages = 0;

  while (queue.length > 0) {
    const sitemapUrl = queue.shift();
    if (seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);
    if (seen.size > MAX_SITEMAPS) {
      throw new Error(`Sitemap count exceeds the ${MAX_SITEMAPS} safety limit.`);
    }

    const sitemap = await fetchSitemap(sitemapUrl, requestOptions);
    if (sitemap.isIndex) {
      for (const loc of sitemap.locs) {
        const child = remapToPreview(loc, previewBase);
        if (!seen.has(child)) queue.push(child);
      }
      continue;
    }

    const pageUrls = [...new Set(sitemap.locs.map((loc) => remapToPreview(loc, previewBase)))];
    discoveredPages += pageUrls.length;
    if (discoveredPages > MAX_DISCOVERED_PAGES) {
      throw new Error(`Discovered page count exceeds the ${MAX_DISCOVERED_PAGES} safety limit.`);
    }
    groups.push({
      sitemapUrl,
      isArticleSitemap: new URL(sitemapUrl).pathname.includes("/sitemap-articles/"),
      pageUrls,
    });
  }

  if (groups.length === 0) throw new Error("No URL sitemap was discovered from /sitemap.xml.");
  return { sitemapCount: seen.size, groups };
}

export function selectPages(groups, { articleSamples, allArticles }) {
  const selected = [];
  let discoveredArticlePages = 0;
  let selectedArticlePages = 0;
  let selectedMajorPages = 0;

  for (const group of groups) {
    const articleGroup = group.isArticleSitemap
      || (group.pageUrls.length > 0 && group.pageUrls.every((url) => new URL(url).pathname.startsWith("/article/")));
    if (articleGroup) {
      discoveredArticlePages += group.pageUrls.length;
      const articlePages = allArticles ? group.pageUrls : evenlySample(group.pageUrls, articleSamples);
      selectedArticlePages += articlePages.length;
      selected.push(...articlePages);
    } else {
      selectedMajorPages += group.pageUrls.length;
      selected.push(...group.pageUrls);
    }
  }

  return {
    pages: [...new Set(selected)],
    discoveredArticlePages,
    selectedArticlePages,
    selectedMajorPages,
  };
}

export async function auditPreviewAssets(rawBaseUrl, options = {}) {
  const settings = { ...DEFAULTS, allArticles: false, fetchImpl: globalThis.fetch, ...options };
  if (typeof settings.fetchImpl !== "function") throw new Error("A Fetch API implementation is required.");
  const previewBase = normalizeBaseUrl(rawBaseUrl);
  const requestOptions = {
    fetchImpl: settings.fetchImpl,
    retries: settings.retries,
    timeoutMs: settings.timeoutMs,
  };

  const discovery = await discoverSitemapGroups(previewBase, requestOptions);
  const selection = selectPages(discovery.groups, settings);
  if (selection.pages.length === 0) throw new Error("Sitemaps did not contain any page URLs.");

  const pageResults = await mapLimit(selection.pages, settings.concurrency, async (pageUrl) => {
    const response = await request(pageUrl, {
      ...requestOptions,
      readBody: true,
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    });
    if (!response.ok) return { url: pageUrl, ok: false, error: response.error, assets: [] };
    const assets = extractNextJsAssets(response.body, pageUrl, previewBase);
    if (assets.length === 0) {
      return { url: pageUrl, ok: false, error: "no /_next/static/*.js reference found", assets };
    }
    return { url: pageUrl, ok: true, error: null, assets };
  });

  const references = new Map();
  for (const page of pageResults) {
    for (const asset of page.assets) {
      if (!references.has(asset)) references.set(asset, new Set());
      references.get(asset).add(page.url);
    }
  }

  const assetUrls = [...references.keys()].sort();
  const assetResults = await mapLimit(assetUrls, settings.concurrency, async (assetUrl) => {
    const response = await request(assetUrl, {
      ...requestOptions,
      readBody: false,
      accept: "text/javascript,application/javascript;q=0.9,*/*;q=0.1",
    });
    return {
      url: assetUrl,
      ok: response.ok,
      status: response.status,
      error: response.ok ? null : response.error,
      referencedBy: [...references.get(assetUrl)],
    };
  });

  const failedPages = pageResults.filter((result) => !result.ok);
  const failedAssets = assetResults.filter((result) => !result.ok);
  return {
    pass: failedPages.length === 0 && failedAssets.length === 0 && assetResults.length > 0,
    previewBase: previewBase.href,
    sitemapCount: discovery.sitemapCount,
    sitemapGroups: discovery.groups.length,
    selectedPages: selection.pages.length,
    selectedMajorPages: selection.selectedMajorPages,
    selectedArticlePages: selection.selectedArticlePages,
    discoveredArticlePages: selection.discoveredArticlePages,
    pageResults,
    assetResults,
    failedPages,
    failedAssets,
  };
}

function printFailures(label, failures, render) {
  if (failures.length === 0) return;
  console.error(`\n${label} (${failures.length})`);
  const shown = failures.slice(0, 40);
  for (const failure of shown) console.error(`  - ${render(failure)}`);
  if (shown.length < failures.length) console.error(`  ... and ${failures.length - shown.length} more`);
}

export function printReport(report, { allArticles }) {
  const articleCoverage = allArticles
    ? `${report.selectedArticlePages}/${report.discoveredArticlePages} (all)`
    : `${report.selectedArticlePages}/${report.discoveredArticlePages} (sampled)`;
  console.log("\n■ Preview Next.js JS asset check");
  console.log(`  Preview     : ${report.previewBase}`);
  console.log(`  Sitemaps    : ${report.sitemapCount} fetched · ${report.sitemapGroups} URL sets`);
  console.log(`  Pages       : ${report.selectedPages} (${report.selectedMajorPages} major + ${articleCoverage} articles)`);
  console.log(`  JS assets   : ${report.assetResults.length} unique references`);
  console.log(`  Page result : ${report.pageResults.length - report.failedPages.length}/${report.pageResults.length} inspectable`);
  console.log(`  Asset result: ${report.assetResults.length - report.failedAssets.length}/${report.assetResults.length} HTTP 200`);

  printFailures("Page failures", report.failedPages, (failure) => `${failure.url} — ${failure.error}`);
  printFailures("JS asset failures", report.failedAssets, (failure) => {
    const samplePage = failure.referencedBy[0];
    return `${failure.url} — ${failure.error} (from ${samplePage})`;
  });
  console.log(`\n결론: ${report.pass ? "PASS" : "FAIL"}\n`);
}

async function main() {
  let cli;
  try {
    cli = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`\n✖ ${error.message}`);
    console.error(usage());
    process.exitCode = 2;
    return;
  }
  if (cli.help) {
    console.log(usage());
    return;
  }

  try {
    const base = normalizeBaseUrl(cli.baseUrl);
    const report = await auditPreviewAssets(base.href, cli);
    printReport(report, cli);
    if (!report.pass) process.exitCode = 1;
  } catch (error) {
    console.error(`\n✖ Preview asset check could not run: ${error.message}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) await main();
