/**
 * 인증 공용 유틸 — Pages Functions 전용(Workers 런타임).
 * - 비밀번호: PBKDF2-SHA256(10만회) + 사용자별 랜덤 솔트. 원문 저장 안 함.
 * - 세션: 랜덤 토큰(64hex)을 httpOnly 쿠키로, D1엔 토큰의 SHA-256만 저장.
 * - 시각: KST 벽시계 규약(datetime('now','+9 hours')).
 */

export interface AuthEnv {
  DB: any;
  REACTIONS?: any; // 로그인 시도 제한(rate limit)에 재사용
}

export const COOKIE_NAME = "modoo_session";
const SESSION_DAYS = 30;
const PBKDF2_ITER = 100_000;

const enc = new TextEncoder();

export function json(obj: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buf as ArrayBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

export async function sha256Hex(s: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex ?? randHex(16);
  const saltBytes = new Uint8Array(salt.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: PBKDF2_ITER },
    key,
    256,
  );
  return { hash: toHex(bits), salt };
}

export async function verifyPassword(password: string, salt: string, expectedHex: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  const a = enc.encode(hash);
  const b = enc.encode(expectedHex);
  if (a.byteLength !== b.byteLength) return false;
  const subtle = crypto.subtle as any;
  return typeof subtle.timingSafeEqual === "function" ? subtle.timingSafeEqual(a, b) : hash === expectedHex;
}

export async function createSession(env: AuthEnv, userId: string): Promise<string> {
  const token = randHex(32);
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?1, ?2, datetime('now','+9 hours', ?3))",
  )
    .bind(tokenHash, userId, `+${SESSION_DAYS} days`)
    .run();
  return token;
}

/** 로컬(pages dev, http)에선 Secure를 빼야 쿠키가 동작한다. */
export function sessionCookie(token: string, requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

export function clearCookie(requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`;
}

export function readToken(request: Request): string | null {
  const c = request.headers.get("Cookie") || "";
  const m = c.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([a-f0-9]{64})`));
  return m ? m[1] : null;
}

export async function getUser(
  env: AuthEnv,
  request: Request,
): Promise<{ id: string; email: string; name: string } | null> {
  const token = readToken(request);
  if (!token || !env.DB) return null;
  const th = await sha256Hex(token);
  const row = await env.DB.prepare(
    "SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1 AND s.expires_at > datetime('now','+9 hours')",
  )
    .bind(th)
    .first();
  return (row as any) ?? null;
}

export async function deleteSession(env: AuthEnv, request: Request): Promise<void> {
  const token = readToken(request);
  if (!token || !env.DB) return;
  const th = await sha256Hex(token);
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(th).run();
}
