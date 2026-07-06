/**
 * GET /api/auth/kakao/callback — 카카오 인가 코드 수신 → 토큰 교환 → 사용자 조회 →
 * 간편 회원가입/로그인:
 *   - identities(kakao, 카카오ID) 있으면 → 로그인
 *   - 카카오가 검증된 이메일을 주고 같은 이메일 계정이 있으면 → 그 계정에 kakao 연결(병합)
 *   - 없으면 → 자동 가입(비밀번호 없음). 이메일 미제공 시 합성 이메일(kakao_<id>@users.modooilbo.com)
 * 실패 시 /login/?error=kakao 로 리다이렉트.
 */
import { createSession, sessionCookie, getUser, type AuthEnv } from "../../../_lib/auth";
import { uniqueSignupName } from "../../../_lib/names";

function back(url: URL, ok: boolean, extraCookie?: string, dest?: string): Response {
  const headers: Record<string, string> = {
    location: dest ?? (ok ? `${url.origin}/` : `${url.origin}/login/?error=kakao`),
    "cache-control": "no-store",
  };
  const secure = url.protocol === "https:" ? "; Secure" : "";
  const clearState = `modoo_oauth_state=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`;
  const clearLink = `modoo_oauth_link=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`;
  // Set-Cookie 2개(세션+state 제거)를 위해 Headers 사용
  const h = new Headers(headers);
  if (extraCookie) h.append("set-cookie", extraCookie);
  h.append("set-cookie", clearState);
  h.append("set-cookie", clearLink);
  return new Response(null, { status: 302, headers: h });
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv & { KAKAO_REST_KEY?: string; KAKAO_CLIENT_SECRET?: string };
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = ctx.request.headers.get("Cookie") || "";
  const saved = (cookie.match(/(?:^|;\s*)modoo_oauth_state=([a-f0-9]{32})/) || [])[1];
  const linkMode = /(?:^|;\s*)modoo_oauth_link=1(?:;|$)/.test(cookie);

  if (!code || !state || !saved || state !== saved || !env.KAKAO_REST_KEY || !env.DB) {
    return back(url, false);
  }

  try {
    // 1) 토큰 교환
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.KAKAO_REST_KEY,
      redirect_uri: `${url.origin}/api/auth/kakao/callback`,
      code,
    });
    if (env.KAKAO_CLIENT_SECRET) body.set("client_secret", env.KAKAO_CLIENT_SECRET);
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: body.toString(),
    });
    const token = (await tokenRes.json()) as any;
    if (!tokenRes.ok || !token?.access_token) return back(url, false);

    // 2) 사용자 조회
    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const me = (await meRes.json()) as any;
    const kakaoId = me?.id ? String(me.id) : null;
    if (!meRes.ok || !kakaoId) return back(url, false);

    const nickname: string = me?.kakao_account?.profile?.nickname?.trim() || "카카오회원";
    const emailRaw: string | undefined = me?.kakao_account?.email;
    const emailVerified: boolean = me?.kakao_account?.is_email_verified === true;
    const email = emailRaw && emailVerified ? emailRaw.toLowerCase() : null;

    // 3) 기존 kakao identity → 로그인
    const ident = await env.DB.prepare(
      "SELECT user_id FROM identities WHERE provider = 'kakao' AND provider_user_id = ?1",
    )
      .bind(kakaoId)
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
            ? `${url.origin}/account/?linked=kakao`
            : `${url.origin}/account/?error=linked-other`,
        );
      }
      await env.DB.prepare(
        "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'kakao', ?2)",
      )
        .bind(current.id, kakaoId)
        .run();
      return back(url, true, undefined, `${url.origin}/account/?linked=kakao`);
    }

    let userId: string;
    if (ident) {
      userId = (ident as any).user_id;
    } else {
      // 4) 검증된 이메일이 기존 계정과 같으면 → 그 계정에 연결(병합)
      let existing: any = null;
      if (email) {
        existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?1").bind(email).first();
      }
      if (existing) {
        userId = existing.id;
        await env.DB.prepare(
          "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'kakao', ?2)",
        )
          .bind(userId, kakaoId)
          .run();
      } else {
        // 5) 신규 가입(간편 회원가입) — 이메일 없으면 합성(비라우팅 도메인, 유일성 보장)
        userId = crypto.randomUUID();
        const finalName = await uniqueSignupName(env, nickname, "카카오회원");
        const accountEmail = email ?? `kakao_${kakaoId}@users.modooilbo.com`;
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO users (id, email, name, password_hash, password_salt, newsletter, terms_agreed_at) VALUES (?1, ?2, ?3, NULL, NULL, 0, datetime('now','+9 hours'))",
          ).bind(userId, accountEmail, finalName),
          env.DB.prepare(
            "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'kakao', ?2)",
          ).bind(userId, kakaoId),
        ]);
      }
    }

    const session = await createSession(env, userId);
    return back(url, true, sessionCookie(session, ctx.request.url));
  } catch {
    return back(url, false);
  }
}
