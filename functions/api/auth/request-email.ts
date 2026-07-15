/**
 * POST /api/auth/request-email {email} — 간편가입 계정의 이메일 등록: 인증 메일 발송.
 * 대상: 합성 이메일(@users.modooilbo.com) 계정만. 로그인 필요.
 * 토큰: 랜덤 64hex → KV(REACTIONS)에 30분 TTL로 {uid, email} 저장(신규 테이블 불필요).
 * 남용 방지: 계정당 15분 3회 + IP당 15분 5회.
 */
import { json, getUser, sha256Hex, type AuthEnv } from "../../_lib/auth";
import { isReservedEmail } from "../../_lib/reserved-email";

type MailEnv = AuthEnv & { EMAIL?: any; MAILER_URL?: string; MAILER_KEY?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function randHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendVerifyMail(env: MailEnv, to: string, name: string, link: string): Promise<boolean> {
  const safeName = escapeHtml(name);
  const subject = "[모두일보] 이메일 인증 안내";
  const text = `${name}님, 모두일보 계정에 이 이메일을 등록하려는 요청을 받았습니다.\n\n아래 링크에서 인증을 완료해 주세요. 링크는 30분 동안만 유효합니다.\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.\n\n모두일보 드림 · help@modooilbo.com`;
  const html = `<div style="font-family:'Apple SD Gothic Neo',AppleGothic,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#191919">
  <h2 style="font-weight:800;margin:0 0 16px">모두<span style="color:#6b6b73">일보</span></h2>
  <p style="line-height:1.7"><b>${safeName}</b>님, 계정에 이 이메일을 등록하려는 요청을 받았습니다.<br/>아래 버튼을 눌러 인증을 완료해 주세요. <b>30분 동안만</b> 유효합니다.</p>
  <p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#191919;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">이메일 인증</a></p>
  <p style="font-size:13px;color:#777;line-height:1.7">버튼이 안 되면 링크를 복사해 주소창에 붙여넣으세요:<br/><a href="${link}" style="color:#555">${link}</a></p>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0"/>
  <p style="font-size:12px;color:#999;line-height:1.7">본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.<br/>모두일보 · help@modooilbo.com</p>
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
        body: JSON.stringify({ to, from, replyTo: { email: "help@modooilbo.com" }, subject, text, html }),
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

  // 남용 방지: 계정당 15분 3회 + IP당 15분 5회
  if (env.REACTIONS) {
    const ipKey = `emlip:${await sha256Hex("modoo-email-v1" + (ctx.request.headers.get("CF-Connecting-IP") || ""))}`;
    const ipN = Number((await env.REACTIONS.get(ipKey)) || "0");
    if (ipN >= 5) return json({ error: "요청이 너무 많습니다. 15분 후 다시 시도해 주세요." }, 429);
    await env.REACTIONS.put(ipKey, String(ipN + 1), { expirationTtl: 900 });

    const uKey = `emlu:${user.id}`;
    const n = Number((await env.REACTIONS.get(uKey)) || "0");
    if (n >= 3) return json({ error: "인증 메일을 이미 보냈습니다. 15분 후 다시 시도해 주세요." }, 429);
    await env.REACTIONS.put(uKey, String(n + 1), { expirationTtl: 900 });

    const token = randHex(32);
    await env.REACTIONS.put(`emailreg:${token}`, JSON.stringify({ uid: user.id, email }), {
      expirationTtl: 1800,
    });
    const link = `${new URL(ctx.request.url).origin}/verify-email/?token=${token}`;
    const sent = await sendVerifyMail(env, email, me.name || user.name || "회원", link);
    if (!sent) return json({ error: "메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502);
    return json({ ok: true });
  }
  return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);
}
