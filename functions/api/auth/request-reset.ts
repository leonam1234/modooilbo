/**
 * POST /api/auth/request-reset {email} — 비밀번호 재설정 링크 발송.
 * 계정 존재 여부를 숨기기 위해 항상 {ok:true} (이메일 열거 공격 방지).
 * 토큰: 랜덤 64hex, D1엔 SHA-256만, 1시간 유효 1회용.
 * 발송: CF Email Service — Pages는 send_email 바인딩 미지원이라 전용 Worker
 * (modooilbo-mailer, MAILER_URL+MAILER_KEY) 경유. 바인딩(EMAIL)이 생기면 그쪽 우선.
 * 남용 방지: 이메일당 15분 3회 + IP당 15분 5회(D1 원자 카운터).
 *
 * ⚠️ 2026-07-15 — 시도 제한을 KV → D1로(login.ts와 동일 규약). 왜:
 *  1) 비원자: `kv.get` → `+1` → `kv.put`이라 동시 요청이 서로의 증가를 덮어써 제한이 뚫렸다
 *     → 메일 폭탄(피해자 주소로 대량 발송) 억제가 무력. D1 단일 UPSERT + RETURNING n으로 원자화.
 *  2) fail-open: `if (env.REACTIONS)`로 감싸여 바인딩이 없으면 제한이 통째로 사라졌다 → fail-closed.
 *
 * 계정 열거 방지(유지·강화): 정상·차단·예약도메인 **전부 동일한 {ok:true}**를 돌려준다.
 *   제한 판정은 계정 조회보다 **먼저** 하므로 차단 시 DB 조회조차 없다(타이밍도 동일).
 *   저장소 장애 시의 503도 이메일 값과 무관하게 발생하므로 존재 여부가 새지 않는다.
 *
 * ⚠️ 배포 전 db/migrations/0002_counters.sql 원격 적용 필요(rate_limits 테이블).
 */
import { json, sha256Hex, type AuthEnv } from "../../_lib/auth";
import { isReservedEmail } from "../../_lib/reserved-email";
import { escapeHtml, mailButton, mailShell, randHex, sendMail, type MailerEnv } from "../../_lib/mailer";
import { clientIp, hitRateLimits, rateBucket } from "../../_lib/rate-limit";

type MailEnv = AuthEnv & MailerEnv;

const MAX_IP_TRIES = 5; // IP당 15분
const MAX_EMAIL_TRIES = 3; // 주소당 15분(메일 폭탄 억제)
const WINDOW_SECS = 900;
/** 한 계정이 동시에 들고 있을 수 있는 살아있는 재설정 링크 수(초과·만료분은 발급 시 정리). */
const MAX_LIVE_TOKENS = 3;

async function sendResetMail(env: MailEnv, to: string, name: string, link: string): Promise<boolean> {
  const safeName = escapeHtml(name); // HTML 본문 전용(텍스트 본문은 원문 유지)
  return sendMail(env, {
    to,
    subject: "[모두일보] 비밀번호 재설정 안내",
    text: `${name}님, 모두일보 비밀번호 재설정 요청을 받았습니다.\n\n아래 링크에서 새 비밀번호를 설정해 주세요. 링크는 1시간 동안만 유효합니다.\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 계정은 안전합니다.\n\n모두일보 드림 · help@modooilbo.com`,
    html: mailShell(
      `<p style="line-height:1.7"><b>${safeName}</b>님, 비밀번호 재설정 요청을 받았습니다.<br/>아래 버튼을 눌러 새 비밀번호를 설정해 주세요. <b>1시간 동안만</b> 유효합니다.</p>
  ${mailButton(link, "비밀번호 재설정")}`,
      `본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 계정은 안전합니다.<br/>모두일보 · help@modooilbo.com`,
    ),
  });
}

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as MailEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);

  let email = "";
  try {
    email = String((await ctx.request.json())?.email || "").trim().toLowerCase();
  } catch {
    /* noop */
  }
  if (!email || !email.includes("@") || email.length > 200) {
    return json({ error: "이메일 주소를 확인해 주세요." }, 400);
  }

  // 합성 이메일(소셜 전용)은 수신 불가 — 존재 노출 없이 조용히 ok
  const ok = json({ ok: true });
  if (isReservedEmail(email)) return ok;

  // 남용 방지: IP당 15분 5회 + 이메일당 15분 3회 (초과해도 표면상 동일 응답 = ok).
  // 계정 조회보다 **먼저** — 차단 응답이 계정 존재 여부와 무관해야 한다(열거 방지).
  let allowed: boolean;
  try {
    allowed = await hitRateLimits(
      env,
      [
        { bucket: await rateBucket("reset", "ip", clientIp(ctx.request)), limit: MAX_IP_TRIES, windowSecs: WINDOW_SECS },
        { bucket: await rateBucket("reset", "acct", email), limit: MAX_EMAIL_TRIES, windowSecs: WINDOW_SECS },
      ],
      Date.now(),
      ctx.waitUntil?.bind(ctx),
    );
  } catch {
    // 저장소를 못 쓰면 제한을 못 건다 → 메일을 보내지 않는다(fail-closed).
    // 503은 이메일 값과 무관하게 나므로 존재 여부를 노출하지 않는다.
    return json({ error: "unavailable" }, 503);
  }
  if (!allowed) return ok;

  const user = (await env.DB.prepare("SELECT id, name FROM users WHERE email = ?1").bind(email).first()) as any;
  if (!user) return ok;

  const token = randHex(32);
  await env.DB.prepare(
    "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?1, ?2, datetime('now','+9 hours','+1 hour'))",
  )
    .bind(await sha256Hex(token), user.id)
    .run();

  // 정리: 이 계정의 **사용됨·만료됨·상한 초과(오래된)** 토큰을 한 문장으로 purge.
  // D1엔 KV 같은 TTL이 없어 두면 무한히 쌓인다. 살아있는 최신 MAX_LIVE_TOKENS개만 남긴다
  // → 한 계정이 유효 링크를 무제한 축적하지 못한다(방금 발급한 토큰은 최신이라 항상 살아남는다).
  // 실패해도 발송은 계속한다(청소는 요청 성패와 무관).
  try {
    await env.DB.prepare(
      `DELETE FROM password_resets
        WHERE user_id = ?1
          AND token_hash NOT IN (
            SELECT token_hash FROM password_resets
             WHERE user_id = ?1 AND used = 0 AND expires_at > datetime('now','+9 hours')
             ORDER BY created_at DESC, rowid DESC
             LIMIT ?2)`,
    )
      .bind(user.id, MAX_LIVE_TOKENS)
      .run();
  } catch {
    /* noop */
  }

  const link = `${new URL(ctx.request.url).origin}/reset/?token=${token}`;
  await sendResetMail(env, email, user.name, link);
  return ok;
}
