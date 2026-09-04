export const INTERNAL_TRAFFIC_COOKIE = "modoo_internal";

// Hostname 경계로 비교한다. 단순 문자열/정규식 부분 일치는
// `google-analytics.com.example.test` 같은 무관한 호스트까지 막을 수 있다.
export const BLOCKED_ANALYTICS_HOST_SUFFIXES = Object.freeze([
  "cloudflareinsights.com",
  "googletagmanager.com",
  "google-analytics.com",
  "analytics.google.com",
  "clarity.ms",
  "googlesyndication.com",
  "doubleclick.net",
  "adtrafficquality.google",
]);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function hostnameMatches(hostname, suffix) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === suffix || normalized.endsWith(`.${suffix}`);
}

function parseUrl(value) {
  try {
    return value instanceof URL ? value : new URL(String(value));
  } catch {
    return null;
  }
}

export function isModooProductionRequest(value) {
  const url = parseUrl(value);
  if (!url) return false;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  return hostnameMatches(hostname, "modooilbo.com") || hostname === "modooilbo.pages.dev";
}

export function isBlockedAnalyticsRequest(value) {
  const url = parseUrl(value);
  if (!url) return false;
  return BLOCKED_ANALYTICS_HOST_SUFFIXES.some((suffix) => hostnameMatches(url.hostname, suffix));
}

export function isBlockedInspectionRequest(value) {
  return isBlockedAnalyticsRequest(value) || isModooProductionRequest(value);
}

export function normalizeInspectionTarget(raw, label = "검사 대상 URL") {
  let target;
  try {
    target = new URL(raw);
  } catch {
    throw new Error(`${label}이 올바른 URL이 아닙니다: ${raw}`);
  }

  if (target.username || target.password) {
    throw new Error(`${label}에 인증 정보를 포함할 수 없습니다.`);
  }

  const hostname = target.hostname.toLowerCase().replace(/\.$/, "");
  const isLoopback = LOOPBACK_HOSTS.has(hostname);
  const isPagesPreview = hostname.endsWith(".modooilbo.pages.dev");
  const isModooProduction = hostnameMatches(hostname, "modooilbo.com")
    || hostname === "modooilbo.pages.dev";

  if (isModooProduction) {
    throw new Error(`${label}은 모두일보 운영 도메인을 사용할 수 없습니다. Cloudflare Preview URL을 사용하세요.`);
  }
  if (!isLoopback && !isPagesPreview) {
    throw new Error(`${label}은 https://*.modooilbo.pages.dev 또는 loopback(localhost/127.0.0.1/::1)만 허용합니다.`);
  }
  if (isPagesPreview && target.protocol !== "https:") {
    throw new Error(`${label}의 Cloudflare Preview URL은 https://여야 합니다.`);
  }
  if (isLoopback && target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error(`${label}의 loopback URL은 http:// 또는 https://여야 합니다.`);
  }

  target.pathname = "/";
  target.search = "";
  target.hash = "";
  return target;
}

export async function protectPlaywrightInspectionContext(context, rawTarget) {
  const target = normalizeInspectionTarget(rawTarget);
  await context.route(
    (url) => isBlockedInspectionRequest(url),
    (route) => route.abort("blockedbyclient"),
  );
  await context.addCookies([{
    name: INTERNAL_TRAFFIC_COOKIE,
    value: "1",
    url: target.href,
    sameSite: "Lax",
  }]);
  return target;
}
