/**
 * POST /api/auth/request-reset {email} — 비밀번호 재설정 링크 발송.
 * 계정 존재 여부를 숨기기 위해 항상 {ok:true} (이메일 열거 공격 방지).
 * 토큰: 랜덤 64hex, D1엔 SHA-256만, 1시간 유효 1회용.
 * 발송: CF Email Service — Pages는 send_email 바인딩 미지원이라 전용 Worker
 * (modooilbo-mailer, MAILER_URL+MAILER_KEY) 경유. 바인딩(EMAIL)이 생기면 그쪽 우선.
 * 남용 방지: 이메일당 15분 3회 + IP당 15분 5회(KV).
 */
import { json, sha256Hex, type AuthEnv } from "../../_lib/auth";
import { isReservedEmail } from "../../_lib/reserved-email";
import { escapeHtml, mailButton, mailShell, randHex, sendMail, type MailerEnv } from "../../_lib/mailer";

type MailEnv = AuthEnv & MailerEnv;

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

  // 남용 방지: IP당 15분 5회 + 이메일당 15분 3회 (초과해도 표면상 동일 응답)
  if (env.REACTIONS) {
    const ipKey = `rstip:${await sha256Hex("modoo-reset-v1" + (ctx.request.headers.get("CF-Connecting-IP") || ""))}`;
    const ipN = Number((await env.REACTIONS.get(ipKey)) || "0");
    if (ipN >= 5) return ok;
    await env.REACTIONS.put(ipKey, String(ipN + 1), { expirationTtl: 900 });

    const rlKey = `rst:${await sha256Hex(email)}`;
    const n = Number((await env.REACTIONS.get(rlKey)) || "0");
    if (n >= 3) return ok;
    await env.REACTIONS.put(rlKey, String(n + 1), { expirationTtl: 900 });
  }

  const user = (await env.DB.prepare("SELECT id, name FROM users WHERE email = ?1").bind(email).first()) as any;
  if (!user) return ok;

  const token = randHex(32);
  await env.DB.prepare(
    "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?1, ?2, datetime('now','+9 hours','+1 hour'))",
  )
    .bind(await sha256Hex(token), user.id)
    .run();

  const link = `${new URL(ctx.request.url).origin}/reset/?token=${token}`;
  await sendResetMail(env, email, user.name, link);
  return ok;
}
