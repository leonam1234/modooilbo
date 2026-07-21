/**
 * POST /api/auth/delete-account — 회원 탈퇴(로그인 필요, confirm:"탈퇴" 필수).
 * 세션·로그인수단·계정을 삭제하고 쿠키를 제거한다.
 *
 * 참여 데이터 처리(FK 제약 대응 — 없으면 users DELETE가 FOREIGN KEY로 실패):
 *  - 내가 누른 공감·스크랩 → 삭제
 *  - 내가 한 **신고** → 시스템 계정(탈퇴회원)으로 이관(2026-07-21~). 삭제하면 신고 남용 추적
 *    근거가 사라져 탈퇴가 증거 인멸이 된다. 신고자 개인은 툼스톤에 흡수돼 식별되지 않는다.
 *  - 내가 쓴 댓글 → 시스템 계정(탈퇴회원)으로 넘기고 소프트 삭제
 *    (남의 답글이 달린 스레드가 끊기지 않도록 행은 보존, "삭제된 댓글" 자리 표시)
 *
 * ⚠️ users를 참조하는 테이블이 새로 생기면 **여기에도 반드시 추가**할 것. 빠뜨리면 그 행이 남아
 *   users DELETE가 FOREIGN KEY 위반으로 터지고 탈퇴가 500으로 실패한다(조용히 넘어가지 않는다).
 *   2026-07-15 정합성 점검에서 실제로 두 건이 누락돼 있던 것을 고쳤다:
 *     · email_verifications (0003에서 신설) — 이메일 인증 메일을 요청해 두고 확인 전에 탈퇴하면
 *       살아있는 토큰 행이 남아 **탈퇴가 실패**했다(4차 도입 시 이 파일 갱신 누락).
 *     · user_email_verified (0004에서 신설)
 *   (pending_signups는 계정 확정 **전** 상태라 user_id가 없다 → FK 없음. 여기서 지울 것도 없다.)
 */
import { json, getUser, clearCookie, type AuthEnv } from "../../_lib/auth";
import { RESERVED_EMAIL_DOMAIN } from "../../_lib/reserved-email";

// 로그인 불가 시스템 계정: 비밀번호 없음 + identities 없음. 탈퇴자 댓글의 FK 소유자.
// 이메일은 예약 도메인(수신 불가) — 외부 가입으로 선점되지 않도록 signup이 차단한다.
const DELETED_USER_ID = "system-deleted-user";
const DELETED_USER_EMAIL = `deleted@${RESERVED_EMAIL_DOMAIN}`;

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

  // INSERT OR IGNORE는 "이미 있음"과 "UNIQUE(email) 충돌로 못 만듦"을 구분하지 않고 둘 다 조용히 넘어간다.
  // 후자(예약 이메일이 다른 계정에 선점된 상태)면 아래 comments UPDATE가 FK 위반으로 터져
  // 탈퇴가 500으로 실패한다. 실패를 삼키지 말고 여기서 명시적으로 끊는다.
  const tombstone = await env.DB.prepare("SELECT id FROM users WHERE id = ?1")
    .bind(DELETED_USER_ID)
    .first();
  if (!tombstone) {
    return json(
      { error: "탈퇴 처리에 필요한 시스템 계정을 준비하지 못했습니다. 고객센터(help@modooilbo.com)로 알려 주세요." },
      500,
    );
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM identities WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM password_resets WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM email_verifications WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM user_email_verified WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM comment_likes WHERE user_id = ?1").bind(user.id),
    // 신고 이력은 **삭제하지 않고 툼스톤 계정으로 이관**한다(2026-07-21 보안 감사).
    // 지워 버리면 신고 남용(계정 여러 개로 댓글 은폐)을 사후에 추적할 근거가 통째로 사라진다 —
    // 탈퇴가 곧 증거 인멸 수단이 됐다. 댓글을 툼스톤으로 넘기는 아래 :comments UPDATE와 같은 규약.
    // ⚠️ PK가 (comment_id, user_id)라 **툼스톤이 같은 댓글을 이미 신고**한 상태면(다른 탈퇴자가
    //   먼저 이관됐거나 하는 경우) UPDATE는 PK 충돌로 터진다 → 탈퇴가 500으로 실패한다.
    //   그래서 UPDATE가 아니라 "INSERT OR IGNORE(충돌 시 조용히 버림) → 원본 DELETE" 2단계다.
    //   충돌해 버려지는 행은 이미 같은 (댓글, 툼스톤) 이력이 있는 경우뿐이라 손실이 아니다.
    env.DB.prepare(
      `INSERT OR IGNORE INTO comment_reports (comment_id, user_id, created_at)
       SELECT comment_id, ?2, created_at FROM comment_reports WHERE user_id = ?1`,
    ).bind(user.id, DELETED_USER_ID),
    env.DB.prepare("DELETE FROM comment_reports WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM bookmarks WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM reporter_subs WHERE user_id = ?1").bind(user.id),
    env.DB.prepare(
      "UPDATE comments SET user_id = ?2, is_deleted = 1, body = '' WHERE user_id = ?1",
    ).bind(user.id, DELETED_USER_ID),
    env.DB.prepare("DELETE FROM users WHERE id = ?1").bind(user.id),
  ]);
  return json({ ok: true }, 200, { "set-cookie": clearCookie(ctx.request.url) });
}
