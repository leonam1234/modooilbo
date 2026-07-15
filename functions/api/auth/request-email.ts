/**
 * POST /api/auth/request-email {email} — 간편가입 계정의 이메일 등록: 인증 메일 발송.
 * 대상: 합성 이메일(@users.modooilbo.com) 계정만. 로그인 필요.
 * 토큰: 랜덤 64hex → **D1 email_verifications에 SHA-256만** 저장, 30분 유효 1회용.
 * 남용 방지: 계정당 15분 3회 + IP당 15분 5회(D1 원자 카운터).
 *
 * ⚠️ 2026-07-15 — 토큰 저장소·시도 제한을 KV → D1로. 왜:
 *  1) **평문 토큰이 곧 KV 키**였다(`emailreg:<토큰>`) → KV 열람 권한이 새면 키 목록만으로
 *     남의 인증 링크를 완성할 수 있었다. 세션·비밀번호 재설정은 이미 "해시만 저장" 규약인데
 *     여기만 예외였다 → password_resets와 동일하게 SHA-256만 저장한다.
 *  2) 소비가 `get`→검증→`delete`라 비원자 → 동시 요청이 같은 토큰으로 함께 통과할 수 있었다.
 *     → verify-email.ts에서 `DELETE ... RETURNING` 단일 문으로 원자 소비.
 *  3) 시도 제한이 `get→+1→put`(비원자) + `if (env.REACTIONS)`(바인딩 없으면 fail-open)였다
 *     → D1 원자 카운터 + fail-closed.
 *  4) 발급 상한이 없어 살아있는 토큰을 무제한 쌓을 수 있었다 → 최신 MAX_LIVE_TOKENS개만 유지.
 *
 * ⚠️ 배포 전 원격 적용 필요: db/migrations/0002_counters.sql(rate_limits) + 0003_auth_tokens.sql(email_verifications).
 */
import { json, getUser, sha256Hex, type AuthEnv } from "../../_lib/auth";
import { isReservedEmail } from "../../_lib/reserved-email";
import { escapeHtml, mailButton, mailShell, randHex, sendMail, type MailerEnv } from "../../_lib/mailer";
import { clientIp, hitRateLimits, rateBucket } from "../../_lib/rate-limit";

type MailEnv = AuthEnv & MailerEnv;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_IP_TRIES = 5; // IP당 15분
const MAX_USER_TRIES = 3; // 계정당 15분
const WINDOW_SECS = 900;
const TOKEN_TTL_MIN = 30;
/** 한 계정이 동시에 들고 있을 수 있는 살아있는 인증 링크 수(초과·만료분은 발급 시 정리). */
const MAX_LIVE_TOKENS = 3;
const TEMP_ERROR = "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.";

async function sendVerifyMail(env: MailEnv, to: string, name: string, link: string): Promise<boolean> {
  const safeName = escapeHtml(name);
  return sendMail(env, {
    to,
    subject: "[모두일보] 이메일 인증 안내",
    text: `${name}님, 모두일보 계정에 이 이메일을 등록하려는 요청을 받았습니다.\n\n아래 링크에서 인증을 완료해 주세요. 링크는 30분 동안만 유효합니다.\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.\n\n모두일보 드림 · help@modooilbo.com`,
    html: mailShell(
      `<p style="line-height:1.7"><b>${safeName}</b>님, 계정에 이 이메일을 등록하려는 요청을 받았습니다.<br/>아래 버튼을 눌러 인증을 완료해 주세요. <b>30분 동안만</b> 유효합니다.</p>
  ${mailButton(link, "이메일 인증")}`,
      `본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.<br/>모두일보 · help@modooilbo.com`,
    ),
  });
}

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as MailEnv;
  if (!env.DB) return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);
  const user = await getUser(env, ctx.request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);

  let email = "";
  try {
    email = String((await ctx.request.json())?.email || "").trim().toLowerCase();
  } catch {
    /* noop */
  }
  if (!EMAIL_RE.test(email) || email.length > 100) return json({ error: "이메일 주소를 확인해 주세요." }, 400);
  if (isReservedEmail(email)) return json({ error: "사용할 수 없는 이메일입니다." }, 400);

  // 대상 확인: 이미 실제 이메일이 있는 계정은 이 API 대상이 아님(이메일 변경은 추후 별도)
  const me = (await env.DB.prepare("SELECT email, name FROM users WHERE id = ?1").bind(user.id).first()) as any;
  if (!me?.email || !isReservedEmail(String(me.email))) {
    return json({ error: "이미 이메일이 등록된 계정입니다." }, 400);
  }

  const dup = await env.DB.prepare("SELECT 1 FROM users WHERE email = ?1 LIMIT 1").bind(email).first();
  if (dup) return json({ error: "이미 다른 계정에서 사용 중인 이메일입니다." }, 409);

  // 남용 방지: 계정당 15분 3회 + IP당 15분 5회 (원자 카운터 · 저장소 불가 시 거부)
  let allowed: boolean;
  try {
    allowed = await hitRateLimits(
      env,
      [
        { bucket: await rateBucket("emailreg", "ip", clientIp(ctx.request)), limit: MAX_IP_TRIES, windowSecs: WINDOW_SECS },
        { bucket: await rateBucket("emailreg", "user", user.id), limit: MAX_USER_TRIES, windowSecs: WINDOW_SECS },
      ],
      Date.now(),
      ctx.waitUntil?.bind(ctx),
    );
  } catch {
    // 저장소를 못 쓰면 제한을 못 건다 → 통과시키지 않는다(fail-closed).
    return json({ error: TEMP_ERROR }, 503);
  }
  if (!allowed) return json({ error: "인증 메일 요청이 너무 많습니다. 15분 후 다시 시도해 주세요." }, 429);

  // 토큰: 원문은 메일 링크로만 나가고, D1엔 SHA-256만 남긴다(password_resets와 동일 규약).
  const token = randHex(32);
  try {
    await env.DB.prepare(
      `INSERT INTO email_verifications (token_hash, user_id, email, expires_at)
       VALUES (?1, ?2, ?3, datetime('now','+9 hours', ?4))`,
    )
      .bind(await sha256Hex(token), user.id, email, `+${TOKEN_TTL_MIN} minutes`)
      .run();
  } catch {
    return json({ error: TEMP_ERROR }, 503);
  }

  // 정리: 이 계정의 **만료됨·상한 초과(오래된)** 토큰을 한 문장으로 purge.
  // D1엔 KV 같은 TTL이 없어 두면 무한히 쌓인다. 살아있는 최신 MAX_LIVE_TOKENS개만 남긴다
  // → 유효 링크 무제한 축적 방지(방금 발급한 토큰은 최신이라 항상 살아남는다).
  // 실패해도 발송은 계속한다(청소는 요청 성패와 무관).
  try {
    await env.DB.prepare(
      `DELETE FROM email_verifications
        WHERE user_id = ?1
          AND token_hash NOT IN (
            SELECT token_hash FROM email_verifications
             WHERE user_id = ?1 AND expires_at > datetime('now','+9 hours')
             ORDER BY created_at DESC, rowid DESC
             LIMIT ?2)`,
    )
      .bind(user.id, MAX_LIVE_TOKENS)
      .run();
  } catch {
    /* noop */
  }

  const link = `${new URL(ctx.request.url).origin}/verify-email/?token=${token}`;
  const sent = await sendVerifyMail(env, email, me.name || user.name || "회원", link);
  if (!sent) return json({ error: "메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  return json({ ok: true });
}
