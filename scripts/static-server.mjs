// out/ 정적 사이트 서빙 (Cloudflare Pages 동작 근사) — 외부 의존성 없음
import { createServer } from "node:http";
import { readFile, stat, realpath } from "node:fs/promises";
import { join, extname, normalize, relative, isAbsolute, sep } from "node:path";

const ROOT = await realpath(join(process.cwd(), "out"));
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
    const inside = (file) => {
      const rel = relative(ROOT, file);
      return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
    };
    if (!inside(fp)) continue;
    try {
      const resolved = await realpath(fp);
      if (!inside(resolved)) continue; // 출력 폴더 안 심볼릭 링크로 외부 파일 노출 금지
      const s = await stat(resolved);
      if (s.isFile()) return resolved;
    } catch {}
  }
  return null;
}

const server = createServer(async (req, res) => {
  let fp;
  try {
    fp = await resolveFile(req.url);
  } catch (error) {
    res.writeHead(error instanceof URIError ? 400 : 500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error instanceof URIError ? "Bad request" : "Server error");
    return;
  }
  let status = 200;
  if (!fp) {
    fp = await resolveFile("/404.html");
    status = 404;
  }
  try {
    if (!fp) throw new Error("Not found");
    const data = await readFile(fp);
    res.writeHead(status, { "Content-Type": MIME[extname(fp)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const address = server.address();
  console.log(`static server: http://127.0.0.1:${address.port} (root: ${ROOT})`);
});
