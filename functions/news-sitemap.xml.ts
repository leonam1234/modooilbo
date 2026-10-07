/** Expire old news even when publishing/builds stop. ASSETS bypasses Functions. */
export const onRequestGet: PagesFunction<{ ASSETS: Fetcher }> = async ({ request, env }) => {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok || !asset.body) return new Response("Sitemap unavailable", { status: 503 });
  const reader = asset.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1024 * 1024) {
        await reader.cancel();
        return new Response("Sitemap too large", { status: 503 });
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const source = new TextDecoder().decode(bytes);
  if (!source.includes("<urlset") || !source.includes("</urlset>")) {
    return new Response("Invalid sitemap", { status: 503 });
  }
  const now = Date.now();
  const xml = source.replace(/<url\b[^>]*>[\s\S]*?<\/url>/g, entry => {
    const date = entry.match(/<news:publication_date>([^<]+)<\/news:publication_date>/)?.[1];
    const age = date ? now - new Date(date).getTime() : NaN;
    return age >= 0 && age < 48 * 60 * 60 * 1000 ? entry : "";
  });
  return new Response(xml, { headers: {
    "content-type": "application/xml; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  } });
};
