/**
 * 뉴스레터 구독 API.
 * POST /api/newsletter {email}                → 구독 등록(중복은 조용히 ok). IP 15분 5회 제한.
 * GET  /api/newsletter?unsub=<email>&t=<sig>  → 수신거부(행 삭제). sig = SHA-256(email + MAILER_KEY).
 */
import { json, sha256Hex, type AuthEnv } from "../_lib/auth";

type Env = AuthEnv & { MAILER_KEY?: string };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as Env;
  if (!env.DB) return json({ error: "unavailable" }, 503);

  let email = "";
  try {
    email = String((await ctx.request.json())?.email || "").trim().toLowerCase();
  } catch {
    /* noop */
  }
  if (!EMAIL_RE.test(email) || email.length > 100) {
    return json({ error: "이메일 주소를 확인해 주세요." }, 400);
  }

  // 남용 방지: IP당 15분 5회
  if (env.REACTIONS) {
    const ip = ctx.request.headers.get("CF-Connecting-IP") || "0";
    const rl = `nl:${await sha256Hex(ip)}`;
    const n = Number((await env.REACTIONS.get(rl)) || "0");
    if (n >= 5) return json({ error: "잠시 후 다시 시도해 주세요." }, 429);
    await env.REACTIONS.put(rl, String(n + 1), { expirationTtl: 900 });
  }

  await env.DB.prepare("INSERT OR IGNORE INTO newsletter_subs (email) VALUES (?1)").bind(email).run();
  return json({ ok: true });
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as Env;
  const url = new URL(ctx.request.url);
  const email = (url.searchParams.get("unsub") || "").trim().toLowerCase();
  const t = url.searchParams.get("t") || "";
  if (!email || !t || !env.DB || !env.MAILER_KEY) return json({ error: "잘못된 요청입니다." }, 400);

  const sig = await sha256Hex(email + env.MAILER_KEY);
  if (sig !== t) return json({ error: "링크가 올바르지 않습니다." }, 400);

  await env.DB.prepare("DELETE FROM newsletter_subs WHERE email = ?1").bind(email).run();
  await env.DB.prepare("UPDATE users SET newsletter = 0 WHERE email = ?1").bind(email).run();
  return new Response(
    "<!doctype html><meta charset=utf-8><title>수신거부 완료</title><body style='font-family:sans-serif;text-align:center;padding:80px 20px'><h2>뉴스레터 수신거부가 완료되었습니다</h2><p>그동안 함께해 주셔서 감사합니다. <a href='https://modooilbo.com'>모두일보 홈으로</a></p>",
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
