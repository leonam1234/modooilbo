// ============================================================
// smoke.mjs — 모바일 엔진×뷰포트 스모크 (아무 웹앱이나, 윈도우/맥 공통)
//
// 왜: 아이폰은 크롬을 써도 내부 엔진이 사파리(웹킷) 강제라, 크롬에서만
//     테스트하면 아이폰 버그를 통째로 놓친다. 그래서 엔진 2종 × 화면 2종
//     = 4조합에서 JS 에러·빈 화면을 자동으로 잡고,
//     안드↔iOS 렌더링 비교 이미지(compare-*.png)도 만들어준다.
//
// 설치(최초 1회, 프로젝트 폴더에서):
//     npm i -D playwright
//     npx playwright install chromium webkit
// 사용:
//     node smoke.mjs https://내사이트.com / /login /about
//     (경로를 안 주면 / 한 장만. 결과는 smoke-shots/<시각>/ 폴더)
//     기본은 환경 2개씩 병렬 실행. 직렬 디버깅은 --serial 또는 SMOKE_SERIAL=1,
//     병렬 수 조절은 --concurrency=N 또는 SMOKE_CONCURRENCY=N (최대 4).
// 종료코드: 문제가 하나라도 있으면 1 → CI나 배포 스크립트에 && 로 연결 가능
// ============================================================
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as pw from 'playwright'
import { mapWithConcurrency, parseSmokeCli } from './mobile-smoke-concurrency.mjs'

let cli
try {
  cli = parseSmokeCli(process.argv.slice(2), process.env, 4)
} catch (error) {
  console.error(`옵션 오류: ${error.message}`)
  process.exit(1)
}
const { base, pages: PAGES, concurrency } = cli
if (!base) {
  console.error('사용: node smoke.mjs <baseUrl> [경로...] [--serial|--concurrency=N]')
  process.exit(1)
}
const out = join('smoke-shots', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))
mkdirSync(out, { recursive: true })

// 엔진 2종 × 화면 2종: app=홈화면 설치 웹앱(전체 화면), browser=주소창 있는 브라우저(짧은 화면)
const MATRIX = [
  { engine: 'chromium', vp: 'app',     w: 402, h: 874 },
  { engine: 'chromium', vp: 'browser', w: 402, h: 660 },
  { engine: 'webkit',   vp: 'app',     w: 402, h: 874 },
  { engine: 'webkit',   vp: 'browser', w: 402, h: 660 },
]
const slug = p => p.replace(/[^a-z0-9가-힣]+/gi, '_').replace(/^_+|_+$/g, '') || 'home'

// 서드파티(광고·분석) 스크립트가 낸 에러는 우리 버그가 아니다 → FAIL 로 세지 않는다.
// 실측: 애드센스가 사파리 교차출처 정책에 걸려 webkit 전 페이지에서 에러를 낸다.
//       그대로 두면 `&& npm run deploy` 자동 게이트가 항상 막혀 도구가 무용지물이 된다.
// 이 목록에 없는 에러는 전부 FAIL 이다 — 의심스러우면 넓히지 말고 그대로 두라.
const THIRD_PARTY = /doubleclick\.net|googlesyndication|googletagmanager|google-analytics|adservice\.google|googleads|pagead2|facebook\.net|connect\.facebook|hotjar|clarity\.ms|criteo|taboola|outbrain/i

const baseUrl = base.replace(/\/+$/, '')

// 분석·광고 요청은 아예 보내지 않는다 (2026-09-03).
// 스모크가 운영을 치면 Cloudflare Web Analytics·GA4·Clarity 에 "사람 방문"으로 잡혀 지표를 오염시킨다
// (8/28 도입 뒤 운영 RUM 페이지로드가 하루 수백 건 늘어난 것이 실측으로 확인됐다). 서드파티는
// route 로 끊고, 사이트 자체 집계(/api/view 등)는 modoo_internal=1 쿠키로 제외시킨다.
// 위 THIRD_PARTY 에러 필터는 그대로 둔다 — 다른 사이트에 이 도구를 쓸 때 여전히 필요하다.
const ANALYTICS_HOSTS = /cloudflareinsights\.com|googletagmanager\.com|google-analytics\.com|analytics\.google\.com|clarity\.ms|googlesyndication\.com|doubleclick\.net|adtrafficquality\.google/
async function excludeFromAnalytics(ctx) {
  await ctx.route(ANALYTICS_HOSTS, route => route.abort())
  try { await ctx.addCookies([{ name: 'modoo_internal', value: '1', url: baseUrl + '/' }]) } catch { /* 로컬 file: 등 쿠키 불가 환경 */ }
}

async function checkPage(ctx, matrixEntry, path) {
  const name = `${matrixEntry.engine}-${matrixEntry.vp}-${slug(path)}`
  let page
  try {
    page = await ctx.newPage()
    const errs = []      // 우리 책임 — FAIL
    const vendor = []    // 서드파티 — 알리기만 하고 통과
    page.on('pageerror', error => {
      const detail = String(error?.message || error) + ' ' + String(error?.stack || '')
      ;(THIRD_PARTY.test(detail) ? vendor : errs).push(String(error?.message || error))
    })
    await page.goto(baseUrl + path, { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(1200)   // 폰트·이미지·스크립트 정착 대기
    const textLen = await page.evaluate(() => (document.body?.innerText || '').trim().length)
    const blank = textLen < 100       // 빈 화면 휴리스틱: 본문 텍스트 100자 미만이면 의심
    await page.screenshot({ path: join(out, name + '.png'), fullPage: true })
      .catch(() => page.screenshot({ path: join(out, name + '.png') }))
    const bad = errs.length > 0 || blank
    const line = `${bad ? '❌' : '✓'} ${name} text=${textLen}자` +
      (errs.length ? ' | JS에러: ' + errs[0].slice(0, 120) : '') + (blank ? ' | 빈 화면 의심' : '') +
      (vendor.length ? ` | (서드파티 ${vendor.length}건 무시)` : '')
    console.log(line)
    return { bad, line }
  } catch (error) {
    const line = `❌ ${name} 접속 실패: ${error.message}`
    console.log(line)
    return { bad: true, line }
  } finally {
    await page?.close().catch(() => {})
  }
}

async function runEnvironment(matrixEntry) {
  let browser
  try {
    browser = await pw[matrixEntry.engine].launch()
    const ctx = await browser.newContext({
      viewport: { width: matrixEntry.w, height: matrixEntry.h }, deviceScaleFactor: 2, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    })
    await excludeFromAnalytics(ctx)
    const results = []
    // 한 환경 안에서는 페이지를 직렬로 열어 24개 기사 검사도 동시 요청 수를 제한한다.
    for (const path of PAGES) results.push(await checkPage(ctx, matrixEntry, path))
    return results
  } catch (error) {
    return PAGES.map(path => {
      const name = `${matrixEntry.engine}-${matrixEntry.vp}-${slug(path)}`
      const line = `❌ ${name} 환경 시작 실패: ${error.message}`
      console.log(line)
      return { bad: true, line }
    })
  } finally {
    await browser?.close().catch(() => {})
  }
}

console.log(`실행 모드: ${concurrency === 1 ? '직렬 디버깅' : `환경 최대 ${concurrency}개 병렬`} (페이지는 환경별 직렬)`)
const environmentResults = await mapWithConcurrency(MATRIX, concurrency, runEnvironment)
const fail = environmentResults.flat().filter(result => result.bad).length

// 안드↔iOS 대조 시트: 같은 페이지를 좌(크로뮴)·우(웹킷) 나란히 — 다르게 보이면 버그 후보
const sheet = await pw.chromium.launch()
const sp = await (await sheet.newContext({ viewport: { width: 1660, height: 900 } })).newPage()
for (const p of PAGES) {
  const n = slug(p)
  const a = join(process.cwd(), out, `chromium-app-${n}.png`)
  const b = join(process.cwd(), out, `webkit-app-${n}.png`)
  if (!existsSync(a) || !existsSync(b)) continue
  const tmp = join(process.cwd(), out, '_tmp.html')
  writeFileSync(tmp, `<body style="margin:0;background:#222;display:flex;gap:20px;padding:20px;align-items:flex-start;font-family:sans-serif">
    <div><div style="color:#fff;font-size:20px;padding:6px 0">chromium (안드로이드)</div><img src="${pathToFileURL(a).href}" style="width:790px"></div>
    <div><div style="color:#fff;font-size:20px;padding:6px 0">webkit (아이폰)</div><img src="${pathToFileURL(b).href}" style="width:790px"></div></body>`)
  await sp.goto(pathToFileURL(tmp).href)
  await sp.waitForTimeout(300)
  await sp.screenshot({ path: join(out, `compare-${n}.png`), fullPage: true })
  rmSync(tmp, { force: true })
}
await sheet.close()

console.log(fail
  ? `\n결론: FAIL — ${fail}건. ${out}/ 스크린샷 확인 후 배포 중단 판단.`
  : `\n결론: PASS — 4조합 이상 무. 안드↔iOS 비교: ${out}/compare-*.png`)
process.exit(fail ? 1 : 0)
