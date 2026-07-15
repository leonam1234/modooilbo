/**
 * GET /api/auth/google/callback — 구글 인가 코드 → 토큰 교환 → 사용자 조회 →
 * 간편 회원가입/로그인 (identities(google) 로그인 / 신규 자동가입 / **검증된 이메일 자동 병합**).
 * 실패 시 /login/?error=google 로 리다이렉트.
 *
 * ⚠️ 2026-07-15 — "동일 이메일 자동 병합"을 **양방향 검증 조건부로 복원**했다.
 *   경위: 1차 감사에서 병합을 통째로 제거했다. 구 signup이 인증 메일 없이 계정을 만들어 줘
 *     users.email이 소유 증명이 아니었기 때문이다 — 공격자가 victim@example.com으로 선가입해 두면
 *     피해자의 구글 로그인이 공격자 계정에 병합됐다(계정 선점). 그 대신 "이메일+비번 가입자가
 *     같은 주소로 구글 로그인하면 계정이 하나 더 생기는" UX 손해를 떠안았다.
 *   지금: signup이 이메일 인증 기반으로 바뀌어(pending_signups → verify-signup) **미검증 로컬
 *     계정이 존재할 수 없다**. 그래서 아래 조건을 만족할 때만 병합한다:
 *       ① 구글이 email_verified=true로 단언한 주소이고(제공자측 증명)
 *       ② 그 주소를 **검증한** 기존 계정이 있을 때(우리측 증명 — user_email_verified)
 *     둘 다여야 한다. 하나라도 미검증이면 병합하지 않고 합성 이메일로 분리한다(1차 동작 유지).
 *   ⚠️ 이 조건을 느슨하게 만들면(예: users.email 일치만으로 병합) 1차에서 막은 선점이 그대로
 *     되살아난다. 규칙 본체는 _lib/social-signin.ts에 **단일 정의**로 두었다(kakao와 공용) —
 *     여기서 다시 구현하지 말 것. 이 파일의 책임은 "구글이 검증했다고 단언한 이메일만
 *     넘긴다"까지다.
 */
import { createSession, sessionCookie, getUser, type AuthEnv } from "../../../_lib/auth";
import { resolveSocialUser } from "../../../_lib/social-signin";

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

    // 계정 결정(로그인/병합/신규)은 kakao와 공용 규칙 하나로 — _lib/social-signin.ts.
    // ⚠️ email은 위에서 email_verified===true일 때만 채웠다. 그 조건을 빼면 병합 조건 ①이 무너진다.
    const { userId } = await resolveSocialUser(env, "google", sub, email, name, "구글회원");

    const session = await createSession(env, userId);
    return back(url, true, sessionCookie(session, ctx.request.url));
  } catch {
    return back(url, false);
  }
}
