// Interactive regression checks against a Preview or local export. No form submissions.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { normalizeInspectionTarget, protectPlaywrightInspectionContext } from './lib/inspection-safety.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = normalizeInspectionTarget(process.argv[2], '브라우저 회귀 검사 대상').origin;
const output = path.join(root, 'output/playwright/site-audit');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
let checks = 0;
try {
  for (const mode of ['desktop-light', 'mobile-dark']) {
    const mobile = mode === 'mobile-dark';
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      colorScheme: mobile ? 'dark' : 'light', isMobile: mobile, hasTouch: mobile,
    });
    await protectPlaywrightInspectionContext(context, base);
    // Images use the same local release source: no production R2 traffic during inspection.
    await context.route((url) => url.hostname === 'img.modooilbo.com', async (route) => {
      const name = decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
      if (!name || path.basename(name) !== name) return route.abort();
      try {
        const body = await readFile(path.join(root, 'public/stock', name));
        await route.fulfill({ body, contentType: name.endsWith('.webp') ? 'image/webp' : name.endsWith('.png') ? 'image/png' : 'image/jpeg' });
      } catch { await route.abort(); }
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let attempts = 0;
    await page.route('**/articles-index.json*', async (route) => {
      attempts++;
      if (attempts === 1) await route.fulfill({ status: 503, body: '{}' });
      else await route.continue();
    });
    await page.goto(`${base}/search/?q=${encodeURIComponent('라이더')}`, { waitUntil: 'networkidle' });
    const errorText = page.getByText('검색 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', { exact: true });
    await errorText.waitFor();
    const input = page.getByRole('textbox', { name: '검색어', exact: true });
    await input.fill('인사책');
    await input.press('Enter');
    await page.waitForURL(/q=%EC%9D%B8%EC%82%AC%EC%B1%85/);
    await page.locator('main a[href^="/article/"]').first().waitFor();
    assert.equal(await errorText.count(), 0, `${mode}: search recovers after failed index fetch`);
    assert.ok(attempts >= 2);
    checks++;
    await page.screenshot({ path: path.join(output, `${mode}-search.png`) });

    await page.goto(`${base}/article/2026-09-15-rider-sesang-beginner-rider-platform-interview-2026/`, { waitUntil: 'networkidle' });
    const hero = page.locator('#article-hero img').first();
    await hero.waitFor();
    await page.waitForFunction(() => document.querySelector('#article-hero img')?.getAttribute('role') === 'button');
    await hero.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: '이미지 크게 보기' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.equal(await hero.evaluate((el) => document.activeElement === el), true, `${mode}: focus restored`);
    await page.keyboard.press('Space');
    await page.getByRole('dialog', { name: '이미지 크게 보기' }).waitFor();
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    checks++;
    assert.equal(await page.locator('aside[data-nosnippet][aria-label="취재·이해관계 안내"]').count(), 1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `${mode}-article.png`) });

    // App Router can reuse the lightbox component between article routes.
    const nextArticle = await page.locator('main a[href^="/article/"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).find((href) => href !== window.location.pathname));
    assert.ok(nextArticle, `${mode}: related article link exists`);
    await page.locator(`main a[href=${JSON.stringify(nextArticle)}]`).first().click();
    await page.waitForURL(base + nextArticle);
    await page.waitForFunction(() => {
      const image = document.querySelector('#article-hero img');
      return image?.getAttribute('role') === 'button'
        && image.getAttribute('aria-label') === `${image.getAttribute('alt') || '기사 이미지'} 크게 보기`;
    });
    await page.locator('#article-hero img').first().focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: '이미지 크게 보기' }).waitFor();
    await page.keyboard.press('Escape');
    checks++;

    for (const route of ['/forgot/', '/reset/']) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      const missing = await page.locator('main input:not([type="hidden"]):not([type="checkbox"])').evaluateAll((inputs) =>
        inputs.filter((el) => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.labels?.length).length);
      assert.equal(missing, 0, `${mode}${route}: input names`);
      checks++;
      await page.screenshot({ path: path.join(output, `${mode}-${route.replaceAll('/', '')}.png`) });
    }
    assert.deepEqual(errors, [], `${mode}: no application JS errors`);
    await context.close();
  }
  console.log(`PASS: ${checks} interactive checks; screenshots: ${output}`);
} finally { await browser.close(); }
