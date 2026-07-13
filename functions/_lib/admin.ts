/**
 * 관리자(편집국) 인증 게이트 — 기존 세션 인증(auth.ts getUser)을 재사용.
 *
 * 관리자 판별: 로그인 사용자의 이메일이 `ADMIN_EMAILS`(콤마 구분) 허용목록에 있으면 관리자.
 *   - ADMIN_EMAILS는 Cloudflare Pages 환경변수/시크릿으로 설정(대시보드 또는 wrangler).
 *   - 코드·문서·채팅에 이메일 원문 하드코딩 금지 → env에서만 읽는다.
 *   - 미설정(빈 값)이면 관리자 0명 → 전면 거부(안전 기본값).
 */
import { getUser, json, type AuthEnv } from "./auth";

export interface AdminEnv extends AuthEnv {
  ADMIN_EMAILS?: string; // "a@x.com,b@y.com" 형식
}

function adminSet(env: AdminEnv): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

/** 로그인 + 관리자 이메일이면 사용자 반환, 아니면 null. */
export async function getAdmin(env: AdminEnv, request: Request): Promise<AdminUser | null> {
  const user = await getUser(env, request);
  if (!user) return null;
  const allow = adminSet(env);
  if (allow.size === 0) return null;
  return allow.has(user.email.toLowerCase()) ? user : null;
}

/**
 * 관리자 게이트 헬퍼: 관리자면 user 반환, 아니면 즉시 Response(401/403).
 * 사용: `const g = await requireAdmin(env, req); if (g instanceof Response) return g;`
 */
export async function requireAdmin(env: AdminEnv, request: Request): Promise<AdminUser | Response> {
  const user = await getUser(env, request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  const allow = adminSet(env);
  if (allow.size === 0 || !allow.has(user.email.toLowerCase())) {
    return json({ error: "관리자 권한이 필요합니다." }, 403);
  }
  return user;
}
