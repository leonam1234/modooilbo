export const RUM_HOSTS = Object.freeze(["modooilbo.com", "www.modooilbo.com"]);

export function classifyRumReferer(host) {
  const normalized = String(host || "").toLowerCase();
  if (!normalized) return "direct";
  if (normalized.includes("naver")) return "naver";
  if (normalized.includes("google")) return "google";
  if (normalized.includes("daum") || normalized.includes("kakao")) return "daum";
  if (normalized.includes("bing")) return "bing";
  if (RUM_HOSTS.includes(normalized)) return "internal";
  return "other";
}

export function aggregateRumRows(rows) {
  const bySource = { naver: 0, google: 0, daum: 0, bing: 0, direct: 0, other: 0 };
  let pageloads = 0;
  let visits = 0;

  for (const row of rows) {
    pageloads += row?.count ?? 0;
    const source = classifyRumReferer(row?.dimensions?.refererHost);
    if (source === "internal") continue;
    const sourceVisits = row?.sum?.visits ?? 0;
    visits += sourceVisits;
    bySource[source] += sourceVisits;
  }

  return { pageloads, visits, bySource };
}
