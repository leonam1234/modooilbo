/**
 * GET /api/auth/naver/callback — 네이버 인가 코드 → 토큰 교환 → 프로필 조회 →
 * 간편 회원가입/로그인 (identities(naver) 로그인 / 신규 자동가입).
 * 네이버는 이메일 검증 플래그를 주지 않아 미검증으로 취급 — 동일 이메일 자동 병합 없음
 * (google/kakao의 email_verified=false 처리와 동일한 경로. 기존 계정과 합치려면 계정 페이지에서 연결).
 * 실패 시 /login/?error=naver 로 리다이렉트.
 */
import { createSession, sessionCookie, getUser, type AuthEnv } from "../../../_lib/auth";
import { uniqueSignupName } from "../../../_lib/names";
import { syntheticEmail } from "../../../_lib/reserved-email";

function back(url: URL, ok: boolean, extraCookie?: string, dest?: string): Response {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  const h = new Headers({
    location: dest ?? (ok ? `${url.origin}/` : `${url.origin}/login/?error=naver`),
    "cache-control": "no-store",
  });
  if (extraCookie) h.append("set-cookie", extraCookie);
  h.append("set-cookie", `modoo_oauth_state=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`);
  h.append("set-cookie", `modoo_oauth_link=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`);
  return new Response(null, { status: 302, headers: h });
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv & { NAVER_CLIENT_ID?: string; NAVER_CLIENT_SECRET?: string };
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = ctx.request.headers.get("Cookie") || "";
  const saved = (cookieHeader.match(/(?:^|;\s*)modoo_oauth_state=([a-f0-9]{32})/) || [])[1];
  const linkMode = /(?:^|;\s*)modoo_oauth_link=1(?:;|$)/.test(cookieHeader);

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
    // 네이버 프로필의 email은 검증 여부 플래그가 없어 신뢰하지 않는다(계정 병합·저장에 사용 X).
    // 타인 이메일을 등록한 네이버 계정으로 기존 회원 계정을 탈취하는 경로를 막기 위함.

    const ident = await env.DB.prepare(
      "SELECT user_id FROM identities WHERE provider = 'naver' AND provider_user_id = ?1",
    )
      .bind(naverId)
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
            ? `${url.origin}/account/?linked=naver`
            : `${url.origin}/account/?error=linked-other`,
        );
      }
      await env.DB.prepare(
        "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'naver', ?2)",
      )
        .bind(current.id, naverId)
        .run();
      return back(url, true, undefined, `${url.origin}/account/?linked=naver`);
    }

    let userId: string;
    if (ident) {
      userId = (ident as any).user_id;
    } else {
      // 신규 가입(간편 회원가입) — 병합 없이 항상 합성 이메일로 새 계정.
      //
      // ⚠️ 2026-07-15 — google·kakao는 "제공자 검증 + 우리 검증" 양방향 조건부로 자동 병합을
      //    복원했지만 **네이버는 현행(병합 안 함)을 유지**한다. 이유는 UX 판단이 아니라
      //    **근거 부재**다: 네이버 회원 프로필 API에는 이메일 검증 여부를 알려주는 필드가 없다
      //    (google=email_verified, kakao=is_email_verified에 해당하는 값이 없다).
      //    검증 여부를 모르는 주소로 병합하면 "제공자측 증명" 자리가 비어 버리고, 그러면
      //    이메일 문자열이 같다는 이유만으로 남의 계정에 들어가는 것 = 계정 선점이 된다.
      //    그래서 이 콜백은 제공자 이메일을 **아예 쓰지 않는다**(계정 키로도 쓰지 않는다).
      //    네이버 사용자가 기존 계정에 네이버를 붙이려면 로그인 상태에서 /account의
      //    [연결하기](link=1) — 현재 세션 소유자 확인이 곧 소유 증명이다.
      //    (네이버가 검증 플래그를 제공하게 되면 google/kakao와 같은 조건으로 복원 가능.)
      userId = crypto.randomUUID();
      const finalName = await uniqueSignupName(env, name, "네이버회원"); // 기본닉 전원 동일 문제 해소
      const accountEmail = syntheticEmail("naver", naverId);
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO users (id, email, name, password_hash, password_salt, newsletter, terms_agreed_at) VALUES (?1, ?2, ?3, NULL, NULL, 0, datetime('now','+9 hours'))",
        ).bind(userId, accountEmail, finalName),
        env.DB.prepare(
          "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'naver', ?2)",
        ).bind(userId, naverId),
      ]);
    }

    const session = await createSession(env, userId);
    return back(url, true, sessionCookie(session, ctx.request.url));
  } catch {
    return back(url, false);
  }
}
