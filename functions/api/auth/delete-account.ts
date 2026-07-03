/**
 * POST /api/auth/delete-account — 회원 탈퇴(로그인 필요, confirm:"탈퇴" 필수).
 * 세션·로그인수단·계정을 삭제하고 쿠키를 제거한다.
 *
 * 참여 데이터 처리(FK 제약 대응 — 없으면 users DELETE가 FOREIGN KEY로 실패):
 *  - 내가 누른 공감·신고·스크랩 → 삭제
 *  - 내가 쓴 댓글 → 시스템 계정(탈퇴회원)으로 넘기고 소프트 삭제
 *    (남의 답글이 달린 스레드가 끊기지 않도록 행은 보존, "삭제된 댓글" 자리 표시)
 */
import { json, getUser, clearCookie, type AuthEnv } from "../../_lib/auth";

// 로그인 불가 시스템 계정: 비밀번호 없음 + identities 없음. 탈퇴자 댓글의 FK 소유자.
const DELETED_USER_ID = "system-deleted-user";
const DELETED_USER_EMAIL = "deleted@users.modooilbo.com";

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  const user = await getUser(env, ctx.request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);

  let b: any;
  try {
    b = await ctx.request.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }
  if (String(b?.confirm ?? "") !== "탈퇴")
    return json({ error: "확인 문구가 일치하지 않습니다. '탈퇴'를 입력해 주세요." }, 400);

  await env.DB.prepare(
    "INSERT OR IGNORE INTO users (id, email, name, password_hash, password_salt, newsletter) VALUES (?1, ?2, '탈퇴회원', NULL, NULL, 0)",
  )
    .bind(DELETED_USER_ID, DELETED_USER_EMAIL)
    .run();

  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM identities WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM comment_likes WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM comment_reports WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM bookmarks WHERE user_id = ?1").bind(user.id),
    env.DB.prepare(
      "UPDATE comments SET user_id = ?2, is_deleted = 1, body = '' WHERE user_id = ?1",
    ).bind(user.id, DELETED_USER_ID),
    env.DB.prepare("DELETE FROM users WHERE id = ?1").bind(user.id),
  ]);
  return json({ ok: true }, 200, { "set-cookie": clearCookie(ctx.request.url) });
}
