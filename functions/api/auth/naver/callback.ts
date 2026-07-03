/**
 * GET /api/auth/naver/callback — 네이버 인가 코드 → 토큰 교환 → 프로필 조회 →
 * 간편 회원가입/로그인 (identities(naver) 로그인 / 동일이메일 병합 / 신규 자동가입).
 * 실패 시 /login/?error=naver 로 리다이렉트.
 */
import { createSession, sessionCookie, type AuthEnv } from "../../../_lib/auth";

function back(url: URL, ok: boolean, extraCookie?: string): Response {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  const h = new Headers({
    location: ok ? `${url.origin}/` : `${url.origin}/login/?error=naver`,
    "cache-control": "no-store",
  });
  if (extraCookie) h.append("set-cookie", extraCookie);
  h.append("set-cookie", `modoo_oauth_state=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`);
  return new Response(null, { status: 302, headers: h });
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv & { NAVER_CLIENT_ID?: string; NAVER_CLIENT_SECRET?: string };
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = ((ctx.request.headers.get("Cookie") || "").match(/(?:^|;\s*)modoo_oauth_state=([a-f0-9]{32})/) || [])[1];

  if (!code || !state || !saved || state !== saved || !env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET || !env.DB) {
    return back(url, false);
  }

  try {
    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env.NAVER_CLIENT_ID,
        client_secret: env.NAVER_CLIENT_SECRET,
        code,
        state,
      }).toString(),
    });
    const token = (await tokenRes.json()) as any;
    if (!tokenRes.ok || !token?.access_token) return back(url, false);

    const meRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const me = (await meRes.json()) as any;
    const naverId = me?.response?.id ? String(me.response.id) : null;
    if (!meRes.ok || me?.resultcode !== "00" || !naverId) return back(url, false);

    const name: string =
      (me.response?.nickname || me.response?.name || "").trim() || "네이버회원";
    // 네이버는 이메일 제공 동의 시 email을 준다(검증된 네이버 계정 이메일).
    const email: string | null = me.response?.email ? String(me.response.email).toLowerCase() : null;

    const ident = await env.DB.prepare(
      "SELECT user_id FROM identities WHERE provider = 'naver' AND provider_user_id = ?1",
    )
      .bind(naverId)
      .first();

    let userId: string;
    if (ident) {
      userId = (ident as any).user_id;
    } else {
      let existing: any = null;
      if (email) {
        existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?1").bind(email).first();
      }
      if (existing) {
        userId = existing.id;
        await env.DB.prepare(
          "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'naver', ?2)",
        )
          .bind(userId, naverId)
          .run();
      } else {
        userId = crypto.randomUUID();
        const accountEmail = email ?? `naver_${naverId}@users.modooilbo.com`;
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO users (id, email, name, password_hash, password_salt, newsletter) VALUES (?1, ?2, ?3, NULL, NULL, 0)",
          ).bind(userId, accountEmail, name.slice(0, 20)),
          env.DB.prepare(
            "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'naver', ?2)",
          ).bind(userId, naverId),
        ]);
      }
    }

    const session = await createSession(env, userId);
    return back(url, true, sessionCookie(session, ctx.request.url));
  } catch {
    return back(url, false);
  }
}
