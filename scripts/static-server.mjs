// out/ 정적 사이트 서빙 (Cloudflare Pages 동작 근사) — 외부 의존성 없음
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const ROOT = join(process.cwd(), "out");
const PORT = process.env.PORT || 3001;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff2": "font/woff2",
};

async function resolveFile(url) {
  const clean = decodeURIComponent((url || "/").split("?")[0]);
  const candidates = [clean];
  if (clean.endsWith("/")) {
    candidates.push(join(clean, "index.html"));
  } else {
    candidates.push(`${clean}.html`);
    candidates.push(join(clean, "index.html"));
  }
  for (const c of candidates) {
    const fp = join(ROOT, normalize(c));
    if (!fp.startsWith(ROOT)) continue; // 경로 탈출 방지
    try {
      const s = await stat(fp);
      if (s.isFile()) return fp;
    } catch {}
  }
  return null;
}

const server = createServer(async (req, res) => {
  let fp = await resolveFile(req.url);
  let status = 200;
  if (!fp) {
    fp = join(ROOT, "404.html");
    status = 404;
  }
  try {
    const data = await readFile(fp);
    res.writeHead(status, { "Content-Type": MIME[extname(fp)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(PORT, () => console.log(`static server: http://localhost:${PORT} (root: ${ROOT})`));
