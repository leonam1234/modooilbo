/**
 * GET /api/auth/naver/start — 네이버 로그인 시작.
 * CSRF 방지 state 쿠키 + 네이버 인가 페이지 리다이렉트. (간편 회원가입: callback에서 자동 가입)
 */

function randHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const id = ctx.env.NAVER_CLIENT_ID;
  if (!id) return new Response("네이버 로그인이 아직 설정되지 않았습니다.", { status: 503 });

  const url = new URL(ctx.request.url);
  const redirectUri = `${url.origin}/api/auth/naver/callback`;
  const state = randHex(16);

  const authorize = new URL("https://nid.naver.com/oauth2.0/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", id);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);

  const secure = url.protocol === "https:" ? "; Secure" : "";
  const h = new Headers({ location: authorize.toString(), "cache-control": "no-store" });
  h.append("set-cookie", `modoo_oauth_state=${state}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=600`);
  // 연결 모드(?link=1): 로그인된 계정에 이 소셜을 연결
  if (url.searchParams.get("link") === "1") {
    h.append("set-cookie", `modoo_oauth_link=1; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=600`);
  } else {
    h.append("set-cookie", `modoo_oauth_link=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`);
  }
  return new Response(null, { status: 302, headers: h });
}
