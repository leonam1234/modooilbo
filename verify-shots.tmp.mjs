import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = "http://localhost:3001";
const OUT = "/Users/beko/.claude/jobs/df9814b3/tmp/shots2";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

// 1) 홈 데스크톱 라이트 (유리 헤더 + 세그먼트 탭)
let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
let page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" }).catch(() => {});
await page.evaluate(() => window.scrollTo(0, 350)); // 헤더 아래 콘텐츠가 비치는지
await page.waitForTimeout(500);
await page.screenshot({ path: OUT + "/home-pc-glass.png" });
await ctx.close();

// 2) 태블릿 768 홈 (신규 md 레이아웃 + GNB 노출)
ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" }).catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + "/home-tablet.png" });
// 태블릿 기사 상세 (md 사이드바)
await page.goto(BASE + "/article/2026-07-03-robocup-2026-incheon-schedule/", { waitUntil: "networkidle" }).catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + "/article-tablet.png" });
await ctx.close();

// 3) 모바일 드로어 (유리 패널) 다크
ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" }).catch(() => {});
await page.evaluate(() => { localStorage.setItem("modoo-theme", "dark"); document.documentElement.classList.add("dark"); });
await page.waitForTimeout(300);
await page.click('button[aria-label="전체 메뉴 열기"]');
await page.waitForTimeout(600);
await page.screenshot({ path: OUT + "/drawer-mobile-dark.png" });
await ctx.close();
await browser.close();
console.log("done");
