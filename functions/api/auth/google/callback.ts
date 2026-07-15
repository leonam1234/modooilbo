/**
 * GET /api/auth/google/callback — 구글 인가 코드 → 토큰 교환 → 사용자 조회 →
 * 간편 회원가입/로그인 (identities(google) 로그인 / 신규 자동가입).
 * 기존 계정과의 "동일 이메일 자동 병합"은 하지 않는다 — 계정 선점(pre-hijacking) 방지.
 * 기존 계정에 구글을 붙이는 것은 로그인 상태에서 /account의 [연결하기](link=1)로만.
 * (naver/callback.ts와 동일한 원칙)
 * 실패 시 /login/?error=google 로 리다이렉트.
 */
import { createSession, sessionCookie, getUser, type AuthEnv } from "../../../_lib/auth";
import { uniqueSignupName } from "../../../_lib/names";
import { syntheticEmail } from "../../../_lib/reserved-email";

function back(url: URL, ok: boolean, extraCookie?: string, dest?: string): Response {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  const h = new Headers({
    location: dest ?? (ok ? `${url.origin}/` : `${url.origin}/login/?error=google`),
    "cache-control": "no-store",
  });
  if (extraCookie) h.append("set-cookie", extraCookie);
  h.append("set-cookie", `modoo_oauth_state=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`);
  h.append("set-cookie", `modoo_oauth_link=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`);
  return new Response(null, { status: 302, headers: h });
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv & { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = ctx.request.headers.get("Cookie") || "";
  const saved = (cookieHeader.match(/(?:^|;\s*)modoo_oauth_state=([a-f0-9]{32})/) || [])[1];
  const linkMode = /(?:^|;\s*)modoo_oauth_link=1(?:;|$)/.test(cookieHeader);

  if (!code || !state || !saved || state !== saved || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.DB) {
    return back(url, false);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${url.origin}/api/auth/google/callback`,
        code,
      }).toString(),
    });
    const token = (await tokenRes.json()) as any;
    if (!tokenRes.ok || !token?.access_token) return back(url, false);

    const meRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const me = (await meRes.json()) as any;
    const sub = me?.sub ? String(me.sub) : null;
    if (!meRes.ok || !sub) return back(url, false);

    const name: string = (me?.name || "").trim() || "구글회원";
    const email: string | null =
      me?.email && me?.email_verified === true ? String(me.email).toLowerCase() : null;

    const ident = await env.DB.prepare(
      "SELECT user_id FROM identities WHERE provider = 'google' AND provider_user_id = ?1",
    )
      .bind(sub)
      .first();

    // 연결 모드: 현재 로그인된 계정에 이 소셜을 연결(새 계정 생성 X)
    if (linkMode) {
      const current = await getUser(env, ctx.request);
      if (!current) return back(url, false, undefined, `${url.origin}/login/`);
      if (ident) {
        const owner = (ident as any).user_id;
        return back(
          url,
          true,
          undefined,
          owner === current.id
            ? `${url.origin}/account/?linked=google`
            : `${url.origin}/account/?error=linked-other`,
        );
      }
      await env.DB.prepare(
        "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'google', ?2)",
      )
        .bind(current.id, sub)
        .run();
      return back(url, true, undefined, `${url.origin}/account/?linked=google`);
    }

    let userId: string;
    if (ident) {
      userId = (ident as any).user_id;
    } else {
      // 신규 가입(간편 회원가입) — 기존 계정에 자동으로 붙이지 않는다.
      //
      // ⚠️ 계정 선점(pre-hijacking) 방지: users.email은 소유가 증명된 값이 아니다.
      //    signup은 인증 메일 없이 이메일을 받으므로, 공격자가 victim@example.com으로 먼저
      //    가입해 두면 피해자의 구글 로그인이 공격자 계정에 병합돼 공격자가 자기 비밀번호로
      //    피해자 신분에 계속 접근하게 된다. → 이메일이 같아도 절대 병합하지 않는다.
      //    기존 계정에 붙이려면 로그인 상태에서 /account의 [연결하기](link=1) —
      //    현재 세션 소유자 확인이 곧 소유 증명이다.
      userId = crypto.randomUUID();
      const finalName = await uniqueSignupName(env, name, "구글회원");
      // 계정 키: 구글이 email_verified=true로 준 이메일만 사용(소유 증명됨).
      // 그 이메일을 이미 다른 계정이 쓰고 있으면 병합 대신 합성 이메일(수신 불가)로 분리.
      let accountEmail = email ?? syntheticEmail("google", sub);
      if (email) {
        const taken = await env.DB.prepare("SELECT 1 FROM users WHERE email = ?1 LIMIT 1")
          .bind(email)
          .first();
        if (taken) accountEmail = syntheticEmail("google", sub);
      }
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO users (id, email, name, password_hash, password_salt, newsletter, terms_agreed_at) VALUES (?1, ?2, ?3, NULL, NULL, 0, datetime('now','+9 hours'))",
        ).bind(userId, accountEmail, finalName),
        env.DB.prepare(
          "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'google', ?2)",
        ).bind(userId, sub),
      ]);
    }

    const session = await createSession(env, userId);
    return back(url, true, sessionCookie(session, ctx.request.url));
  } catch {
    return back(url, false);
  }
}
