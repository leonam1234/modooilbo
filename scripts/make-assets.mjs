// 모두일보 브랜드 자산 생성 — og.png / logo.png / icon.png
// 사용: node scripts/make-assets.mjs
// Playwright 헤드리스 크로미움으로 HTML을 렌더해 PNG로 저장한다(웹폰트 로드 후 캡쳐).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const RED = "#dc1f10"; // signal red (브랜드 액센트)
const INK = "#0f1419"; // near-black
const fontHead = `
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
  <style>* { margin:0; padding:0; box-sizing:border-box; } body { -webkit-font-smoothing:antialiased; }</style>
`;

const serif = "'Nanum Myeongjo', serif";
const sans = "Pretendard, -apple-system, sans-serif";

// ── OG 카드 1200×630 ────────────────────────────────────────────────
const ogHtml = `<!doctype html><html><head>${fontHead}</head><body>
<div style="width:1200px;height:630px;position:relative;background:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:${serif};overflow:hidden;">
  <div style="position:absolute;top:0;left:0;right:0;height:14px;background:${RED};"></div>
  <div style="position:absolute;top:44px;right:52px;font-family:${sans};font-size:28px;color:#94a3b8;letter-spacing:1px;">modooilbo.com</div>
  <div style="display:flex;align-items:center;gap:32px;">
    <div style="width:140px;height:140px;border-radius:28px;background:${RED};display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(220,31,16,.28);">
      <span style="color:#fff;font-size:96px;font-weight:800;line-height:1;">M</span>
    </div>
    <span style="font-size:156px;font-weight:800;color:${INK};letter-spacing:-3px;">모두일보</span>
  </div>
  <div style="margin-top:34px;font-size:48px;color:#334155;font-weight:400;">모두를 위한 신뢰의 뉴스</div>
  <div style="position:absolute;bottom:56px;font-family:${sans};font-size:26px;color:#94a3b8;letter-spacing:.5px;">정치 · 경제 · 사회 · 국제 · 문화 · 스포츠 · 테크 · 오피니언</div>
</div>
</body></html>`;

// ── 스키마 로고 512×512 (흰 배경) ──────────────────────────────────
const logoHtml = `<!doctype html><html><head>${fontHead}</head><body>
<div style="width:512px;height:512px;background:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;font-family:${serif};">
  <div style="width:200px;height:200px;border-radius:40px;background:${RED};display:flex;align-items:center;justify-content:center;">
    <span style="color:#fff;font-size:140px;font-weight:800;line-height:1;">M</span>
  </div>
  <span style="font-size:86px;font-weight:800;color:${INK};letter-spacing:-1px;">모두일보</span>
</div>
</body></html>`;

// ── 파비콘 512×512 (레드 배경, 흰 M) ───────────────────────────────
const iconHtml = `<!doctype html><html><head>${fontHead}</head><body>
<div style="width:512px;height:512px;background:${RED};display:flex;align-items:center;justify-content:center;font-family:${serif};">
  <span style="color:#fff;font-size:340px;font-weight:800;line-height:1;">M</span>
</div>
</body></html>`;

const jobs = [
  { html: ogHtml, w: 1200, h: 630, out: "public/og.png" },
  { html: logoHtml, w: 512, h: 512, out: "public/logo.png" },
  { html: iconHtml, w: 512, h: 512, out: "src/app/icon.png" },
];

mkdirSync("public", { recursive: true });
const browser = await chromium.launch();
for (const job of jobs) {
  const ctx = await browser.newContext({
    viewport: { width: job.w, height: job.h },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.setContent(job.html, { waitUntil: "networkidle" });
  try {
    await page.evaluate(() => document.fonts.ready);
  } catch {}
  await page.waitForTimeout(700);
  await page.screenshot({ path: job.out, clip: { x: 0, y: 0, width: job.w, height: job.h } });
  await ctx.close();
  console.log(`✓ ${job.out} (${job.w}×${job.h})`);
}
await browser.close();
console.log("done");
