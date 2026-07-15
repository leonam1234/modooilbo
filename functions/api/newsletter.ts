/**
 * 뉴스레터 구독 API — double opt-in(확인 메일) + 수신거부는 POST.
 *
 * POST /api/newsletter {email}                 → 확인 메일 발송. **이 시점엔 구독 아님**(대기).
 * GET  /api/newsletter?confirm=<token>         → 구독 확인 **페이지만** 표시(상태 변경 없음)
 * POST /api/newsletter?confirm=<token>         → 구독 확정(newsletter_subs 등록)
 * GET  /api/newsletter?unsub=<email>&t=<sig>   → 수신거부 확인 **페이지만** 표시(상태 변경 없음)
 * POST /api/newsletter?unsub=<email>&t=<sig>   → 수신거부 실행. sig = SHA-256(email + MAILER_KEY).
 *
 * ⚠️ 2026-07-15 두 가지를 고쳤다:
 *  1) **double opt-in 부재**: POST 한 번으로 남의 이메일이 곧바로 구독 등록됐다(제3자 무단 등록 →
 *     원치 않는 메일 = 스팸 신고·발신 도메인 평판 손상). 이제 확인 링크를 눌러야 등록된다.
 *     대기 상태는 신규 newsletter_pending에 두고, **newsletter_subs = 확인된 구독자**로 유지한다
 *     → 기존 구독자(운영 D1 1명)는 그대로 살고 발송 스크립트 쿼리도 바꿀 필요가 없다.
 *  2) **GET이 상태를 바꿨다**: 메일 보안 스캐너·프리페치가 링크를 미리 긁으면 본인 의사와 무관하게
 *     자동 수신거부됐다. GET은 확인 페이지만 보여주고 실제 해지는 POST로 옮겼다.
 *     (RFC 8058 One-Click 수신거부도 POST를 쓴다 — 이 POST 엔드포인트가 그대로 호환된다.
 *      메일에 List-Unsubscribe / List-Unsubscribe-Post 헤더를 붙이려면 메일러 워커가 커스텀
 *      헤더를 지원해야 해서 이번 범위 밖으로 뒀다.)
 *
 * ⚠️ 배포 전 db/migrations/0002_counters.sql 원격 적용 필요(newsletter_pending, rate_limits).
 */
import { json, sha256Hex, type AuthEnv } from "../_lib/auth";
import { clientIp, hitRateLimits, rateBucket } from "../_lib/rate-limit";
import { escapeHtml, mailButton, mailShell, randHex, sendMail, type MailerEnv } from "../_lib/mailer";

type Env = AuthEnv & MailerEnv & { MAILER_KEY?: string };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_RE = /^[a-f0-9]{64}$/;
const CONFIRM_TTL_HOURS = 48;

/** 확인/완료 안내 페이지. 색인 금지 + 캐시 금지(1회용 링크). */
function page(title: string, bodyHtml: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<meta name="robots" content="noindex,nofollow">` +
      `<body style="font-family:'Apple SD Gothic Neo',AppleGothic,sans-serif;text-align:center;padding:80px 20px;color:#191919">` +
      bodyHtml +
      `</body></html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    },
  );
}

/** 버튼 하나짜리 확인 폼 — 실제 상태 변경은 이 POST가 한다(GET은 절대 바꾸지 않는다). */
function confirmForm(action: string, heading: string, lead: string, button: string): Response {
  return page(
    heading,
    `<h2 style="font-weight:800">${escapeHtml(heading)}</h2>
     <p style="line-height:1.7;color:#555">${lead}</p>
     <form method="post" action="${escapeHtml(action)}" style="margin-top:24px">
       <button type="submit" style="background:#191919;color:#fff;border:0;font-weight:700;font-size:15px;padding:13px 28px;border-radius:8px;cursor:pointer">${escapeHtml(button)}</button>
     </form>
     <p style="margin-top:28px;font-size:13px"><a href="https://modooilbo.com" style="color:#999">모두일보 홈으로</a></p>`,
  );
}

const homeLink = `<p style="margin-top:24px"><a href="https://modooilbo.com" style="color:#555">모두일보 홈으로</a></p>`;

// ── 구독 신청(확인 메일 발송) ────────────────────────────────────────────────
async function requestSubscribe(ctx: any, env: Env): Promise<Response> {
  let email = "";
  try {
    email = String((await ctx.request.json())?.email || "").trim().toLowerCase();
  } catch {
    /* noop */
  }
  if (!EMAIL_RE.test(email) || email.length > 100) {
    return json({ error: "이메일 주소를 확인해 주세요." }, 400);
  }

  // 남용 방지: IP당 15분 5회 + **이메일당 하루 3회**(남의 주소로 확인 메일을 반복 발송하는 괴롭힘 차단).
  // 저장소를 못 쓰면 거부한다 — 구 KV 구현은 바인딩이 없으면 제한이 통째로 사라졌다(fail-open).
  const waitUntil = ctx.waitUntil?.bind(ctx);
  let allowed: boolean;
  try {
    allowed = await hitRateLimits(
      env,
      [
        { bucket: await rateBucket("newsletter", "ip", clientIp(ctx.request)), limit: 5, windowSecs: 900 },
        { bucket: await rateBucket("newsletter", "acct", email), limit: 3, windowSecs: 86400 },
      ],
      Date.now(),
      waitUntil,
    );
  } catch {
    return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
  if (!allowed) return json({ error: "잠시 후 다시 시도해 주세요." }, 429);

  // 이미 확인된 구독자면 메일을 또 보내지 않는다. 응답은 아래와 동일해서
  // "이 주소가 구독 중인지"를 응답으로 캐낼 수 없다(구독자 목록 열거 방지).
  const already = await env.DB.prepare("SELECT 1 FROM newsletter_subs WHERE email = ?1 LIMIT 1")
    .bind(email)
    .first();
  if (already) return json({ ok: true, pending: true });

  const token = randHex(32);
  await env.DB.prepare(
    `INSERT INTO newsletter_pending (token_hash, email, expires_at)
     VALUES (?1, ?2, datetime('now','+9 hours', ?3))`,
  )
    .bind(await sha256Hex(token), email, `+${CONFIRM_TTL_HOURS} hours`)
    .run();

  const link = `${new URL(ctx.request.url).origin}/api/newsletter?confirm=${token}`;
  const sent = await sendMail(env, {
    to: email,
    subject: "[모두일보] 뉴스레터 구독 확인",
    text: `모두일보 뉴스레터 구독 요청을 받았습니다.\n\n아래 링크에서 구독을 확인해 주세요. 확인 전까지는 메일을 보내지 않습니다. 링크는 ${CONFIRM_TTL_HOURS}시간 동안만 유효합니다.\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 아무 일도 일어나지 않습니다.\n\n모두일보 드림 · help@modooilbo.com`,
    html: mailShell(
      `<p style="line-height:1.7">모두일보 뉴스레터 구독 요청을 받았습니다.<br/>아래 버튼을 눌러 구독을 확인해 주세요. <b>확인 전까지는 메일을 보내지 않습니다.</b> 링크는 <b>${CONFIRM_TTL_HOURS}시간</b> 동안만 유효합니다.</p>
       ${mailButton(link, "구독 확인하기")}`,
      `본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 아무 일도 일어나지 않습니다.<br/>모두일보 · help@modooilbo.com`,
    ),
  });
  if (!sent) return json({ error: "확인 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502);

  // 만료된 대기 토큰 청소(D1엔 TTL이 없다).
  waitUntil?.(
    env.DB.prepare("DELETE FROM newsletter_pending WHERE expires_at < datetime('now','+9 hours')")
      .run()
      .catch(() => {}),
  );
  return json({ ok: true, pending: true });
}

// ── 구독 확인 ────────────────────────────────────────────────────────────────
async function confirmSubscribe(env: Env, token: string, exec: boolean): Promise<Response> {
  if (!TOKEN_RE.test(token) || !env.DB) return page("잘못된 링크", `<h2>링크가 올바르지 않습니다</h2>${homeLink}`, 400);

  const row = (await env.DB.prepare(
    "SELECT email FROM newsletter_pending WHERE token_hash = ?1 AND expires_at > datetime('now','+9 hours')",
  )
    .bind(await sha256Hex(token))
    .first()) as { email?: string } | null;
  if (!row?.email) {
    return page(
      "링크 만료",
      `<h2 style="font-weight:800">링크가 만료되었거나 이미 사용되었습니다</h2>
       <p style="line-height:1.7;color:#555">뉴스레터 구독을 원하시면 홈에서 다시 신청해 주세요.</p>${homeLink}`,
      410,
    );
  }

  // GET = 확인 페이지만(상태 변경 금지 — 스캐너가 긁어도 아무 일도 일어나지 않는다).
  if (!exec) {
    return confirmForm(
      `/api/newsletter?confirm=${token}`,
      "뉴스레터 구독을 확인해 주세요",
      `<b>${escapeHtml(row.email)}</b> 주소로 모두일보 뉴스레터를 받아보시려면 아래 버튼을 눌러 주세요.`,
      "구독 확인",
    );
  }

  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO newsletter_subs (email) VALUES (?1)").bind(row.email),
    env.DB.prepare("DELETE FROM newsletter_pending WHERE token_hash = ?1").bind(await sha256Hex(token)),
  ]);
  return page(
    "구독 완료",
    `<h2 style="font-weight:800">뉴스레터 구독이 완료되었습니다</h2>
     <p style="line-height:1.7;color:#555">매주 월요일 아침, 지난주 가장 많이 읽힌 뉴스를 보내드립니다.<br/>언제든 메일 하단의 수신거부로 해지할 수 있습니다.</p>${homeLink}`,
  );
}

// ── 수신거부 ─────────────────────────────────────────────────────────────────
async function unsubscribe(env: Env, email: string, t: string, exec: boolean): Promise<Response> {
  if (!email || !t || !env.DB || !env.MAILER_KEY) {
    return page("잘못된 요청", `<h2>잘못된 요청입니다</h2>${homeLink}`, 400);
  }
  const sig = await sha256Hex(email + env.MAILER_KEY);
  if (sig !== t) return page("잘못된 링크", `<h2>링크가 올바르지 않습니다</h2>${homeLink}`, 400);

  // GET = 확인 페이지만. 메일 보안 스캐너의 사전 크롤로 해지되던 경로를 여기서 끊는다.
  if (!exec) {
    return confirmForm(
      `/api/newsletter?unsub=${encodeURIComponent(email)}&t=${encodeURIComponent(t)}`,
      "뉴스레터 수신거부",
      `<b>${escapeHtml(email)}</b> 주소로 더 이상 모두일보 뉴스레터를 보내지 않습니다.<br/>아래 버튼을 눌러 수신거부를 완료해 주세요.`,
      "수신거부하기",
    );
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM newsletter_subs WHERE email = ?1").bind(email),
    env.DB.prepare("DELETE FROM newsletter_pending WHERE email = ?1").bind(email),
    env.DB.prepare("UPDATE users SET newsletter = 0 WHERE email = ?1").bind(email),
  ]);
  return page(
    "수신거부 완료",
    `<h2 style="font-weight:800">뉴스레터 수신거부가 완료되었습니다</h2>
     <p style="line-height:1.7;color:#555">그동안 함께해 주셔서 감사합니다.</p>${homeLink}`,
  );
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as Env;
  const url = new URL(ctx.request.url);
  const confirm = url.searchParams.get("confirm");
  if (confirm !== null) return confirmSubscribe(env, confirm, false);
  const unsub = url.searchParams.get("unsub");
  if (unsub !== null) {
    return unsubscribe(env, unsub.trim().toLowerCase(), url.searchParams.get("t") || "", false);
  }
  return page("잘못된 요청", `<h2>잘못된 요청입니다</h2>${homeLink}`, 400);
}

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as Env;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const url = new URL(ctx.request.url);

  // 확인/해지 실행은 쿼리로 구분한다(폼 POST라 본문은 JSON이 아니다).
  const confirm = url.searchParams.get("confirm");
  if (confirm !== null) return confirmSubscribe(env, confirm, true);
  const unsub = url.searchParams.get("unsub");
  if (unsub !== null) {
    return unsubscribe(env, unsub.trim().toLowerCase(), url.searchParams.get("t") || "", true);
  }

  return requestSubscribe(ctx, env);
}
