// 모두일보 리뷰용 스크린샷 캡쳐 — PC(1440) / 모바일(390) 풀페이지
// 사용: node scripts/shoot.mjs <round> <theme:light|dark> <set:core|full>
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const round = process.argv[2] || "r1";
const theme = process.argv[3] === "dark" ? "dark" : "light";
const set = process.argv[4] || "full";
const mode = process.argv[5] || "fullpage"; // fullpage | fold
const outDir = `review-shots/${round}`;
mkdirSync(outDir, { recursive: true });

const DEVICES = [
  { id: "pc", viewport: { width: 1440, height: 900 } },
  { id: "mobile", viewport: { width: 390, height: 844 } },
];

const browser = await chromium.launch();

// 홈에서 기사 슬러그 하나 추출
let articlePath = "/article/none";
try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  const href = await page.$$eval('a[href^="/article/"]', (as) =>
    as.length ? as[0].getAttribute("href") : null,
  );
  if (href) articlePath = href;
  await ctx.close();
} catch (e) {
  console.log("slug discovery failed:", e.message);
}

const CORE = [
  ["home", "/"],
  ["politics", "/politics"],
  ["economy", "/economy"],
  ["opinion", "/opinion"],
  ["media", "/media"],
  ["search", "/search?q=" + encodeURIComponent("경제")],
  ["article", articlePath],
  ["notfound", "/__nonexistent__"],
];

const COMPANY = [
  ["about", "/about"],
  ["careers", "/careers"],
  ["subscribe", "/subscribe"],
  ["newsletter", "/newsletter"],
  ["advertise", "/advertise"],
  ["tips", "/tips"],
  ["contact", "/contact"],
  ["ethics", "/ethics"],
  ["login", "/login"],
  ["register", "/register"],
  ["terms", "/terms"],
  ["privacy", "/privacy"],
];

const routes = set === "core" ? CORE : [...CORE, ...COMPANY];

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = 700;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          setTimeout(res, 350);
        }
      }, 90);
    });
  });
}

const summary = [];
for (const dev of DEVICES) {
  const ctx = await browser.newContext({
    viewport: dev.viewport,
    deviceScaleFactor: 1,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  for (const [name, path] of routes) {
    try {
      const resp = await page.goto(BASE + path, { waitUntil: "load", timeout: 35000 });
      await autoScroll(page);
      await page.waitForTimeout(400);
      const file = `${outDir}/${name}-${dev.id}.png`;
      await page.screenshot({ path: file, fullPage: mode !== "fold" });
      const title = await page.title();
      summary.push(`${dev.id.padEnd(6)} ${name.padEnd(10)} ${resp ? resp.status() : "?"}  "${title}"  -> ${file}`);
    } catch (e) {
      summary.push(`${dev.id.padEnd(6)} ${name.padEnd(10)} ERROR  ${e.message}`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`\n=== round ${round} / ${theme} / ${set} ===`);
console.log(summary.join("\n"));
