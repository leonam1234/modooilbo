/**
 * GET /api/auth/kakao/callback — 카카오 인가 코드 수신 → 토큰 교환 → 사용자 조회 →
 * 간편 회원가입/로그인:
 *   - identities(kakao, 카카오ID) 있으면 → 로그인
 *   - 카카오가 검증한 이메일을 **우리도 검증한** 기존 계정이 있으면 → 그 계정에 병합
 *   - 아니면 → 자동 가입(비밀번호 없음). 이메일 미제공·충돌 시 합성 이메일(kakao_<id>@users.modooilbo.com)
 * 실패 시 /login/?error=kakao 로 리다이렉트.
 *
 * ⚠️ 2026-07-15 — "동일 이메일 자동 병합"을 **양방향 검증 조건부로 복원**했다.
 *   경위: 1차 감사에서 병합을 통째로 제거했다. 구 signup이 인증 메일 없이 계정을 만들어 줘
 *     users.email이 소유 증명이 아니었기 때문이다 — 공격자가 victim@example.com으로 선가입해 두면
 *     피해자의 카카오 로그인이 공격자 계정에 병합됐다(계정 선점). 그 대신 "이메일+비번 가입자가
 *     같은 주소로 카카오 로그인하면 계정이 하나 더 생기는" UX 손해를 떠안았다.
 *   지금: signup이 이메일 인증 기반으로 바뀌어(pending_signups → verify-signup) **미검증 로컬
 *     계정이 존재할 수 없다**. 그래서 아래 조건을 만족할 때만 병합한다:
 *       ① 카카오가 is_email_verified=true로 단언한 주소이고(제공자측 증명)
 *       ② 그 주소를 **검증한** 기존 계정이 있을 때(우리측 증명 — user_email_verified)
 *     둘 다여야 한다. 하나라도 미검증이면 병합하지 않고 합성 이메일로 분리한다(1차 동작 유지).
 *   ⚠️ 이 조건을 느슨하게 만들면(예: users.email 일치만으로 병합) 1차에서 막은 선점이 그대로
 *     되살아난다. 규칙 본체는 _lib/social-signin.ts에 **단일 정의**로 두었다(google과 공용) —
 *     여기서 다시 구현하지 말 것. 이 파일의 책임은 "카카오가 검증했다고 단언한 이메일만
 *     넘긴다"까지다.
 */
import { createSession, sessionCookie, getUser, type AuthEnv } from "../../../_lib/auth";
import { resolveSocialUser } from "../../../_lib/social-signin";

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

    // 계정 결정(로그인/병합/신규)은 google과 공용 규칙 하나로 — _lib/social-signin.ts.
    // ⚠️ email은 위에서 is_email_verified===true일 때만 채웠다. 그 조건을 빼면 병합 조건 ①이 무너진다.
    const { userId } = await resolveSocialUser(env, "kakao", kakaoId, email, nickname, "카카오회원");

    const session = await createSession(env, userId);
    return back(url, true, sessionCookie(session, ctx.request.url));
  } catch {
    return back(url, false);
  }
}
