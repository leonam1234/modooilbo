export const CORE_FILES = ["articles-index.json", "robots.txt", "sitemap.xml", "sitemap-pages.xml", "news-sitemap.xml", "rss.xml"];

export function validateCoreFile(file, body) {
  if (file === "articles-index.json") {
    const rows = JSON.parse(body);
    if (!Array.isArray(rows) || !rows.length || rows.some(row =>
      !row || typeof row.slug !== "string" || typeof row.title !== "string" ||
      !Array.isArray(row.tags) || typeof row.author?.name !== "string")) {
      throw new Error("invalid articles-index.json schema");
    }
  } else if (file === "robots.txt") {
    if (!/^Sitemap:\s*https:\/\//im.test(body)) throw new Error("robots.txt is missing Sitemap");
  } else {
    const root = file === "rss.xml" ? "rss" : file === "sitemap.xml" ? "(?:sitemapindex|urlset)" : "urlset";
    if (!new RegExp(`^\\s*<\\?xml[^>]*>\\s*<(${root})\\b[^>]*>[\\s\\S]*<\\/\\1>\\s*$`).test(body)) {
      throw new Error(`invalid XML envelope: ${file}`);
    }
  }
}
