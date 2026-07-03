/**
 * GET /api/auth/kakao/start — 카카오 로그인 시작.
 * CSRF 방지용 state를 쿠키에 심고 카카오 인가 페이지로 리다이렉트.
 * (간편 회원가입: 계정 없으면 callback에서 자동 가입)
 */

function randHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const key = ctx.env.KAKAO_REST_KEY;
  if (!key) return new Response("카카오 로그인이 아직 설정되지 않았습니다.", { status: 503 });

  const url = new URL(ctx.request.url);
  const redirectUri = `${url.origin}/api/auth/kakao/callback`;
  const state = randHex(16);

  const authorize = new URL("https://kauth.kakao.com/oauth/authorize");
  authorize.searchParams.set("client_id", key);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("state", state);

  const secure = url.protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      "set-cookie": `modoo_oauth_state=${state}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=600`,
      "cache-control": "no-store",
    },
  });
}
