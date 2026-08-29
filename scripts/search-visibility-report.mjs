#!/usr/bin/env node
/**
 * 모두일보 검색·AI 가시성 리포트
 *
 * 실데이터가 있는 소스만 숫자를 출력한다. 인증/권한/플랜이 없으면 0으로 꾸미지 않고
 * unavailable과 이유를 남긴다. Cloudflare는 Wrangler OAuth를 자동 재사용할 수 있다.
 */
import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const SITE_HOST = "modooilbo.com";
const SITE_URL = `https://${SITE_HOST}`;
const AI_REFERRERS = [
  "chatgpt.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
];
const AI_CRAWLER_TOKENS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "meta-externalagent",
];
const CITATION_CRAWLERS = new Set([
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
]);

const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
const daysArg = Number((args.find((a) => a.startsWith("--days=")) || "").split("=")[1] || 7);
const days = Number.isInteger(daysArg) && daysArg >= 1 && daysArg <= 30 ? daysArg : 7;
const dateArg = (args.find((a) => a.startsWith("--date=")) || "").split("=")[1];

function kstDate(d = new Date()) {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function shiftDate(date, delta) {
  const d = new Date(`${date}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + delta);
  return kstDate(d);
}

// 완료된 어제까지를 기본값으로 삼는다. --date는 기간의 마지막 KST 날짜다.
const endDate = dateArg || shiftDate(kstDate(), -1);
const startDate = shiftDate(endDate, -(days - 1));
const generatedAt = new Date().toISOString();

function unavailable(reason, source) {
  return { status: "unavailable", source, reason };
}

function escapeGraphql(value) {
  return JSON.stringify(String(value));
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message = body?.errors?.[0]?.message || body?.error?.message || body?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body;
}

function wranglerOAuthToken() {
  const candidates = [
    join(homedir(), "Library", "Preferences", ".wrangler", "config", "default.toml"),
    join(homedir(), ".config", ".wrangler", "config", "default.toml"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const token = text.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
    if (token) return token;
  }
  return null;
}

async function cloudflareContext() {
  const token = process.env.CLOUDFLARE_API_TOKEN || wranglerOAuthToken();
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN도 Wrangler OAuth도 없음");
  let zoneId = process.env.CF_ZONE_ID;
  let accountId = process.env.CF_ACCOUNT_ID;
  if (!zoneId || !accountId) {
    const zones = await fetchJson(`https://api.cloudflare.com/client/v4/zones?name=${SITE_HOST}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const zone = zones?.result?.[0];
    if (!zone) throw new Error(`${SITE_HOST} Cloudflare zone을 찾지 못함`);
    zoneId ||= zone.id;
    accountId ||= zone.account?.id;
  }
  return { token, zoneId, accountId, auth: process.env.CLOUDFLARE_API_TOKEN ? "API token" : "Wrangler OAuth" };
}

async function cfGraphql(context, query) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const json = await fetchJson("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const message = json?.errors?.[0]?.message;
    if (!message) return json.data;
    if (!/budget depleted|rate limit/i.test(message) || attempt === 2) throw new Error(message);
    await new Promise((resolve) => setTimeout(resolve, 1_200 * (attempt + 1)));
  }
}

async function cloudflareTraffic(context) {
  const query = `{
    viewer { zones(filter: { zoneTag: ${escapeGraphql(context.zoneId)} }) {
      rows: httpRequests1dGroups(
        limit: ${days}
        filter: { date_geq: ${escapeGraphql(startDate)}, date_leq: ${escapeGraphql(endDate)} }
        orderBy: [date_ASC]
      ) { dimensions { date } sum { requests pageViews bytes } uniq { uniques } }
    } }
  }`;
  const data = await cfGraphql(context, query);
  const rows = data?.viewer?.zones?.[0]?.rows || [];
  const totals = rows.reduce(
    (sum, row) => ({
      requests: sum.requests + (row.sum?.requests || 0),
      pageViews: sum.pageViews + (row.sum?.pageViews || 0),
      bytes: sum.bytes + (row.sum?.bytes || 0),
      uniquesDailySum: sum.uniquesDailySum + (row.uniq?.uniques || 0),
    }),
    { requests: 0, pageViews: 0, bytes: 0, uniquesDailySum: 0 },
  );
  return {
    status: "ok",
    source: `Cloudflare Zone Analytics (${context.auth})`,
    note: "고유 방문자는 일별 uniques 합산이므로 기간 전체 중복 제거값이 아님",
    totals,
    daily: rows.map((row) => ({ date: row.dimensions.date, ...row.sum, uniques: row.uniq?.uniques || 0 })),
  };
}

function crawlerName(userAgent) {
  return AI_CRAWLER_TOKENS.find((token) => userAgent.includes(token)) || "Other";
}

async function cloudflareAiCrawlers(context) {
  const counts = new Map();
  const daily = [];
  for (let i = 0; i < days; i += 1) {
    const date = shiftDate(startDate, i);
    const start = new Date(`${date}T00:00:00+09:00`).toISOString();
    const end = new Date(new Date(`${date}T00:00:00+09:00`).getTime() + 86_400_000).toISOString();
    const filters = AI_CRAWLER_TOKENS.map((token) => `{ userAgent_like: ${escapeGraphql(`%${token}%`)} }`).join(",");
    const query = `{
      viewer { zones(filter: { zoneTag: ${escapeGraphql(context.zoneId)} }) {
        rows: httpRequestsAdaptiveGroups(
          limit: 500
          orderBy: [count_DESC]
          filter: {
            datetime_geq: ${escapeGraphql(start)}
            datetime_lt: ${escapeGraphql(end)}
            requestSource: "eyeball"
            OR: [${filters}]
          }
        ) { count dimensions { userAgent } }
      } }
    }`;
    const data = await cfGraphql(context, query);
    const rows = data?.viewer?.zones?.[0]?.rows || [];
    const dayCounts = new Map();
    for (const row of rows) {
      const name = crawlerName(row.dimensions?.userAgent || "");
      counts.set(name, (counts.get(name) || 0) + (row.count || 0));
      dayCounts.set(name, (dayCounts.get(name) || 0) + (row.count || 0));
    }
    daily.push({ date, crawlers: Object.fromEntries([...dayCounts].sort()) });
  }
  const crawlers = [...counts]
    .map(([name, requests]) => ({
      name,
      policy: CITATION_CRAWLERS.has(name) ? "search-citation-allowed" : "training-blocked",
      requests,
    }))
    .sort((a, b) => b.requests - a.requests);
  return {
    status: "ok",
    source: `Cloudflare HTTP requests (${context.auth})`,
    note: "User-Agent 문자열 기준 관측치이며 발신 IP 검증 전에는 진짜 봇으로 단정하지 않음",
    crawlers,
    daily,
  };
}

async function cloudflareAiReferrals(context) {
  const filters = AI_REFERRERS.flatMap((host) => [
    `{ clientRefererHost: ${escapeGraphql(host)} }`,
    `{ clientRefererHost_like: ${escapeGraphql(`%.${host}`)} }`,
  ]).join(",");
  try {
    const totals = new Map();
    for (let i = 0; i < days; i += 1) {
      const date = shiftDate(startDate, i);
      const start = new Date(`${date}T00:00:00+09:00`).toISOString();
      const end = new Date(new Date(`${date}T00:00:00+09:00`).getTime() + 86_400_000).toISOString();
      const query = `{
        viewer { zones(filter: { zoneTag: ${escapeGraphql(context.zoneId)} }) {
          rows: httpRequestsAdaptiveGroups(
            limit: 100
            orderBy: [count_DESC]
            filter: {
              datetime_geq: ${escapeGraphql(start)}
              datetime_lt: ${escapeGraphql(end)}
              requestSource: "eyeball"
              OR: [${filters}]
            }
          ) { count sum { visits } dimensions { clientRefererHost } }
        } }
      }`;
      const data = await cfGraphql(context, query);
      for (const row of data?.viewer?.zones?.[0]?.rows || []) {
        const host = row.dimensions?.clientRefererHost || "unknown";
        const current = totals.get(host) || { host, requests: 0, visits: 0 };
        current.requests += row.count || 0;
        current.visits += row.sum?.visits || 0;
        totals.set(host, current);
      }
    }
    return {
      status: "ok",
      source: "Cloudflare Referer Analytics",
      referrals: [...totals.values()].sort((a, b) => b.visits - a.visits || b.requests - a.requests),
    };
  } catch (error) {
    return unavailable(
      `현재 Cloudflare 플랜/권한에서 referer host 필드를 조회할 수 없음: ${error.message}`,
      "Cloudflare Referer Analytics",
    );
  }
}

function parseRobots(text) {
  const groups = new Map();
  let agents = [];
  let sawDirective = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (sawDirective) agents = [];
      agents.push(value);
      sawDirective = false;
      for (const agent of agents) {
        const rules = groups.get(agent) || { allow: [], disallow: [] };
        groups.set(agent, rules);
      }
      continue;
    }
    if (key === "allow" || key === "disallow") {
      sawDirective = true;
      for (const agent of agents) {
        const rules = groups.get(agent);
        rules[key].push(value);
      }
    }
    if (key === "content-signal") sawDirective = true;
    if (key === "sitemap") agents = [];
  }
  return groups;
}

async function livePolicyCheck() {
  const urls = {
    robots: `${SITE_URL}/robots.txt`,
    llms: `${SITE_URL}/llms.txt`,
    policy: `${SITE_URL}/policy/`,
    rss: `${SITE_URL}/rss.xml`,
  };
  const responses = await Promise.all(
    Object.entries(urls).map(async ([key, url]) => {
      const res = await fetch(url, { headers: { "User-Agent": "modooilbo-policy-monitor/1.0" } });
      return [key, { ok: res.ok, status: res.status, text: await res.text(), url }];
    }),
  );
  const page = Object.fromEntries(responses);
  const robots = parseRobots(page.robots.text);
  const blockedTraining = [...new Set(["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"])].filter((agent) =>
    robots.get(agent)?.disallow?.includes("/"),
  );
  const allowedCitation = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"].filter((agent) => {
    const rules = robots.get(agent);
    return rules?.allow?.includes("/") && !rules?.disallow?.includes("/");
  });
  const articleUrl = page.rss.text.match(/<link>(https:\/\/modooilbo\.com\/article\/[^<]+)<\/link>/)?.[1];
  let article = { ok: false, status: null, text: "", url: articleUrl || null };
  if (articleUrl) {
    const res = await fetch(articleUrl, { headers: { "User-Agent": "modooilbo-policy-monitor/1.0" } });
    article = { ok: res.ok, status: res.status, text: await res.text(), url: articleUrl };
  }
  const checks = {
    content_signal:
      /content-signal:\s*[^\n]*search=yes/i.test(page.robots.text) &&
      /content-signal:\s*[^\n]*ai-input=yes/i.test(page.robots.text) &&
      /content-signal:\s*[^\n]*ai-train=no/i.test(page.robots.text) &&
      /content-signal:\s*[^\n]*use=reference/i.test(page.robots.text),
    citation_crawlers_allowed: allowedCitation.length === 3,
    training_crawlers_blocked: blockedTraining.length === 4,
    llms_policy:
      page.llms.text.includes("검색·인용 허용 / AI 모델 학습 금지") &&
      page.llms.text.includes("원문 URL"),
    policy_page:
      page.policy.text.includes("검색·인용 및 AI 학습 정책") &&
      page.policy.text.includes("ai-train=no"),
    article_notice:
      article.ok && article.text.includes("검색·요약·인용 허용") && article.text.includes("AI 모델 학습 금지"),
  };
  return {
    status: Object.values(checks).every(Boolean) ? "ok" : "fail",
    source: "live modooilbo.com",
    checks,
    details: { allowedCitation, blockedTraining, articleUrl },
  };
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

async function googleAccessToken() {
  const direct = process.env.GSC_ACCESS_TOKEN || process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN;
  if (direct) return direct;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath || !existsSync(credentialsPath)) return null;
  const credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
  if (!credentials.client_email || !credentials.private_key) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: credentials.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(credentials.private_key).toString("base64url")}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const token = await fetchJson(credentials.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return token.access_token;
}

async function googleSearchConsole() {
  const token = await googleAccessToken();
  if (!token) {
    return unavailable(
      "GSC 읽기 OAuth가 없음(GSC_ACCESS_TOKEN 또는 GOOGLE_APPLICATION_CREDENTIALS 필요)",
      "Google Search Console API",
    );
  }
  const siteUrl = process.env.GSC_SITE_URL || `sc-domain:${SITE_HOST}`;
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  try {
    const [total, topQueries, topPages] = await Promise.all(
      [[], ["query"], ["page"]].map((dimensions) =>
        fetchJson(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: dimensions.length ? 10 : 1, dataState: "all" }),
        }),
      ),
    );
    const row = total.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    return {
      status: "ok",
      source: "Google Search Console API",
      siteUrl,
      totals: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
      topQueries: (topQueries.rows || []).map((r) => ({ query: r.keys?.[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      topPages: (topPages.rows || []).map((r) => ({ page: r.keys?.[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      note: total.metadata?.first_incomplete_date
        ? `${total.metadata.first_incomplete_date} 이후 데이터는 집계 중`
        : "Search Console 처리 지연으로 최근 수치가 바뀔 수 있음",
    };
  } catch (error) {
    return unavailable(error.message, "Google Search Console API");
  }
}

function normalizeBingRows(payload) {
  const rows = payload?.d || payload?.value || payload?.rows || [];
  return Array.isArray(rows) ? rows : [];
}

async function bingWebmaster() {
  const apiKey = process.env.BING_WEBMASTER_API_KEY;
  const customUrl = process.env.BING_WEBMASTER_QUERY_STATS_URL;
  const bearer = process.env.BING_WEBMASTER_ACCESS_TOKEN;
  if (!apiKey && !customUrl) {
    return unavailable(
      "Bing Webmaster 인증이 없음(BING_WEBMASTER_API_KEY 또는 새 REST용 BING_WEBMASTER_QUERY_STATS_URL 필요)",
      "Bing Webmaster Tools",
    );
  }
  const siteUrl = process.env.BING_SITE_URL || SITE_URL;
  let endpoint;
  let headers = { Accept: "application/json" };
  if (customUrl) {
    endpoint = customUrl.replaceAll("{siteUrl}", encodeURIComponent(siteUrl));
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
  } else {
    const query = new URLSearchParams({ siteUrl, apikey: apiKey });
    endpoint = `https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?${query}`;
  }
  try {
    const data = await fetchJson(endpoint, { headers });
    const rows = normalizeBingRows(data);
    const relevant = rows.filter((row) => {
      const raw = row.Date || row.date;
      const ms = typeof raw === "string" ? Number(raw.match(/\d{10,}/)?.[0]) : Date.parse(raw);
      if (!Number.isFinite(ms)) return true;
      const date = new Date(ms).toISOString().slice(0, 10);
      return date >= startDate && date <= endDate;
    });
    const totals = relevant.reduce(
      (sum, row) => ({ clicks: sum.clicks + (row.Clicks || row.clicks || 0), impressions: sum.impressions + (row.Impressions || row.impressions || 0) }),
      { clicks: 0, impressions: 0 },
    );
    return {
      status: "ok",
      source: customUrl ? "Bing Webmaster REST adapter" : "Bing Webmaster legacy JSON API",
      totals,
      topQueries: relevant
        .map((row) => ({ query: row.Query || row.query, clicks: row.Clicks || row.clicks || 0, impressions: row.Impressions || row.impressions || 0 }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10),
      note: customUrl ? "사용자 지정 REST 엔드포인트" : "Microsoft가 2026-08-31 종료 예고한 호환 경로 — 새 REST URL로 교체 필요",
    };
  } catch (error) {
    return unavailable(error.message, "Bing Webmaster Tools");
  }
}

let cfContext;
let cloudflare;
let aiCrawlers;
let aiReferrals;
try {
  cfContext = await cloudflareContext();
  // 데이터셋별 오류가 다른 소스까지 숨기지 않도록 순차 조회한다.
  cloudflare = await cloudflareTraffic(cfContext);
  aiCrawlers = await cloudflareAiCrawlers(cfContext);
  aiReferrals = await cloudflareAiReferrals(cfContext);
} catch (error) {
  cloudflare = unavailable(error.message, "Cloudflare Zone Analytics");
  aiCrawlers = unavailable(error.message, "Cloudflare AI crawler analytics");
  aiReferrals = unavailable(error.message, "Cloudflare Referer Analytics");
}

const [policy, gsc, bing] = await Promise.all([
  livePolicyCheck().catch((error) => unavailable(error.message, "live policy check")),
  googleSearchConsole(),
  bingWebmaster(),
]);

const report = {
  report: "modooilbo-search-ai-visibility",
  window: { start_kst: startDate, end_kst: endDate, days },
  generated_at: generatedAt,
  policy,
  cloudflare,
  ai_crawlers: aiCrawlers,
  ai_referrals: aiReferrals,
  google_search_console: gsc,
  bing_webmaster: bing,
};

if (jsonOut) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const num = new Intl.NumberFormat("ko-KR");
console.log(`\n■ 모두일보 검색·AI 가시성 리포트`);
console.log(`  기간(KST): ${startDate} ~ ${endDate} (${days}일)`);
console.log(`  원칙     : 검색·인용 허용 / AI 모델 학습 금지\n`);

console.log(`[정책 일치] ${policy.status === "ok" ? "정상" : "점검 필요"}`);
if (policy.checks) {
  for (const [key, value] of Object.entries(policy.checks)) console.log(`  ${value ? "✓" : "✗"} ${key}`);
} else console.log(`  ${policy.reason}`);

console.log(`\n[Cloudflare 트래픽]`);
if (cloudflare.status === "ok") {
  console.log(`  요청 ${num.format(cloudflare.totals.requests)} · 페이지뷰 ${num.format(cloudflare.totals.pageViews)} · 일별 고유방문자 합 ${num.format(cloudflare.totals.uniquesDailySum)}`);
  console.log(`  ${cloudflare.note}`);
} else console.log(`  확인 불가: ${cloudflare.reason}`);

console.log(`\n[AI 크롤러 요청]`);
if (aiCrawlers.status === "ok") {
  for (const row of aiCrawlers.crawlers) {
    const label = row.policy === "search-citation-allowed" ? "검색·인용" : "학습 차단 대상";
    console.log(`  ${row.name.padEnd(20)} ${num.format(row.requests).padStart(8)}회  ${label}`);
  }
  if (!aiCrawlers.crawlers.length) console.log("  관측 없음");
  console.log(`  주의: ${aiCrawlers.note}`);
} else console.log(`  확인 불가: ${aiCrawlers.reason}`);

console.log(`\n[AI 서비스 유입]`);
if (aiReferrals.status === "ok") {
  for (const row of aiReferrals.referrals) console.log(`  ${row.host}: 방문 ${num.format(row.visits)} · 요청 ${num.format(row.requests)}`);
  if (!aiReferrals.referrals.length) console.log("  관측 0건");
} else console.log(`  확인 불가: ${aiReferrals.reason}`);

for (const [label, data] of [["Google Search Console", gsc], ["Bing Webmaster", bing]]) {
  console.log(`\n[${label}]`);
  if (data.status === "ok") {
    const ctr = data.totals.ctr == null ? "-" : `${(data.totals.ctr * 100).toFixed(2)}%`;
    console.log(`  클릭 ${num.format(data.totals.clicks)} · 노출 ${num.format(data.totals.impressions)} · CTR ${ctr}`);
    if (data.note) console.log(`  ${data.note}`);
  } else console.log(`  확인 불가: ${data.reason}`);
}

const unavailableCount = [cloudflare, aiCrawlers, aiReferrals, gsc, bing].filter((item) => item.status === "unavailable").length;
console.log(`\n  요약: 데이터 소스 5개 중 ${unavailableCount}개 미연동/권한 제한. JSON: npm run --silent report:visibility -- --json\n`);
