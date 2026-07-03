/**
 * POST /api/auth/request-reset {email} — 비밀번호 재설정 링크 발송.
 * 계정 존재 여부를 숨기기 위해 항상 {ok:true} (이메일 열거 공격 방지).
 * 토큰: 랜덤 64hex, D1엔 SHA-256만, 1시간 유효 1회용.
 * 발송: CF Email Service — Pages는 send_email 바인딩 미지원이라 전용 Worker
 * (modooilbo-mailer, MAILER_URL+MAILER_KEY) 경유. 바인딩(EMAIL)이 생기면 그쪽 우선.
 * 남용 방지: 이메일당 15분 3회(KV).
 */
import { json, sha256Hex, type AuthEnv } from "../../_lib/auth";

type MailEnv = AuthEnv & { EMAIL?: any; MAILER_URL?: string; MAILER_KEY?: string };

function randHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendResetMail(env: MailEnv, to: string, name: string, link: string): Promise<boolean> {
  const subject = "[모두일보] 비밀번호 재설정 안내";
  const text = `${name}님, 모두일보 비밀번호 재설정 요청을 받았습니다.\n\n아래 링크에서 새 비밀번호를 설정해 주세요. 링크는 1시간 동안만 유효합니다.\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 계정은 안전합니다.\n\n모두일보 드림 · help@modooilbo.com`;
  const html = `<div style="font-family:'Apple SD Gothic Neo',AppleGothic,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#191919">
  <h2 style="font-weight:800;margin:0 0 16px">모두<span style="color:#6b6b73">일보</span></h2>
  <p style="line-height:1.7"><b>${name}</b>님, 비밀번호 재설정 요청을 받았습니다.<br/>아래 버튼을 눌러 새 비밀번호를 설정해 주세요. <b>1시간 동안만</b> 유효합니다.</p>
  <p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#191919;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">비밀번호 재설정</a></p>
  <p style="font-size:13px;color:#777;line-height:1.7">버튼이 안 되면 링크를 복사해 주소창에 붙여넣으세요:<br/><a href="${link}" style="color:#555">${link}</a></p>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0"/>
  <p style="font-size:12px;color:#999;line-height:1.7">본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 계정은 안전합니다.<br/>모두일보 · help@modooilbo.com</p>
</div>`;

  const from = { email: "no-reply@modooilbo.com", name: "모두일보" };
  try {
    if (env.EMAIL?.send) {
      await env.EMAIL.send({ to, from, subject, text, html, replyTo: { email: "help@modooilbo.com" } });
      return true;
    }
    if (env.MAILER_URL && env.MAILER_KEY) {
      const res = await fetch(env.MAILER_URL, {
        method: "POST",
        headers: { "x-mailer-key": env.MAILER_KEY, "content-type": "application/json" },
        body: JSON.stringify({
          to,
          from,
          replyTo: { email: "help@modooilbo.com" },
          subject,
          text,
          html,
        }),
      });
      return res.ok;
    }
  } catch {
    /* 발송 실패는 아래 false */
  }
  return false;
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
  if (email.endsWith("@users.modooilbo.com")) return ok;

  // 남용 방지: 이메일당 15분 3회
  if (env.REACTIONS) {
    const rlKey = `rst:${await sha256Hex(email)}`;
    const n = Number((await env.REACTIONS.get(rlKey)) || "0");
    if (n >= 3) return ok; // 표면상 동일 응답
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
