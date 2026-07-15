/**
 * 관리자(편집국) 인증 게이트 — 기존 세션 인증(auth.ts getUser)을 재사용.
 *
 * 관리자 판별: 로그인 사용자의 **users.id**가 `ADMIN_USER_IDS`(콤마 구분) 허용목록에 있으면 관리자.
 *   - ADMIN_USER_IDS는 Cloudflare Pages 환경변수/시크릿으로 설정(대시보드 또는 wrangler).
 *   - users.id는 서버가 발급한 UUID다 → 사용자가 값을 고를 수 없어 선점·위조가 불가능하다.
 *   - 미설정(빈 값)이면 관리자 0명 → 전면 거부(안전 기본값).
 *   - 값 확인: wrangler d1 execute modooilbo-members --remote \
 *       --command "SELECT id, name FROM users WHERE email = '<편집국 계정 이메일>';"
 *
 * ⚠️ 이메일(ADMIN_EMAILS)로 판별하지 않는 이유 — 의도적으로 제거했다:
 *   users.email은 **소유가 증명된 값이 아니다**. signup은 인증 메일을 보내지 않으므로
 *   ADMIN_EMAILS에 든 주소를 아무나 먼저 가입해 선점하면 그대로 관리자로 승격된다.
 *   게다가 users.email만 봐서는 '소셜이 검증해 준 이메일'과 'signup의 미검증 이메일'을
 *   구분할 수 없다(구분하려면 users.email_verified 같은 소유 증명 컬럼이 먼저 필요).
 *   → 이메일 문자열 대신 위조 불가능한 users.id로 판별한다.
 *   ADMIN_EMAILS를 설정해도 무시된다(권한이 생기지 않는다). ADMIN_USER_IDS를 쓸 것.
 */
import { getUser, json, type AuthEnv } from "./auth";

export interface AdminEnv extends AuthEnv {
  /** 관리자 users.id 허용목록: "uuid-1,uuid-2" 형식. */
  ADMIN_USER_IDS?: string;
  /** @deprecated 소유 증명이 없어 선점 가능 → 무시된다. ADMIN_USER_IDS를 쓸 것. */
  ADMIN_EMAILS?: string;
}

function adminIdSet(env: AdminEnv): Set<string> {
  return new Set(
    (env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean),
  );
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

/** 로그인 + 관리자 id면 사용자 반환, 아니면 null. */
export async function getAdmin(env: AdminEnv, request: Request): Promise<AdminUser | null> {
  const user = await getUser(env, request);
  if (!user) return null;
  const allow = adminIdSet(env);
  if (allow.size === 0) return null; // 미설정 = 관리자 없음(안전 기본값)
  return allow.has(user.id.toLowerCase()) ? user : null;
}

/**
 * 관리자 게이트 헬퍼: 관리자면 user 반환, 아니면 즉시 Response(401/403).
 * 사용: `const g = await requireAdmin(env, req); if (g instanceof Response) return g;`
 */
export async function requireAdmin(env: AdminEnv, request: Request): Promise<AdminUser | Response> {
  const user = await getUser(env, request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  const allow = adminIdSet(env);
  if (allow.size === 0 || !allow.has(user.id.toLowerCase())) {
    return json({ error: "관리자 권한이 필요합니다." }, 403);
  }
  return user;
}
