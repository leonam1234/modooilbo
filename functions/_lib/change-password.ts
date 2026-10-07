import { createSessionToken, hashPassword, SESSION_DAYS, type AuthEnv } from "./auth";
import { isReservedEmail } from "./reserved-email";

type Authority =
  | { resetTokenHash: string }
  | { sessionTokenHash: string; previousHash: string | null; previousSalt: string | null };

/** One transaction: authority check, credentials, token revocation and replacement session.
 * The fresh salt gates every dependent statement if a concurrent request won first.
 * No separately claimed token can survive another successful password change.
 */
export async function changePassword(
  env: AuthEnv,
  user: { id: string; email: string },
  password: string,
  authority: Authority,
): Promise<string | null> {
  const { hash, salt } = await hashPassword(password);
  const { token, tokenHash } = await createSessionToken();
  const reset = "resetTokenHash" in authority;
  const update = reset
    ? env.DB.prepare(`UPDATE users SET password_hash = ?3, password_salt = ?4
        WHERE id = ?1 AND email = ?2 AND EXISTS (
          SELECT 1 FROM password_resets WHERE user_id = ?1 AND token_hash = ?5
          AND used = 0 AND expires_at > datetime('now','+9 hours'))`)
        .bind(user.id, user.email, hash, salt, authority.resetTokenHash)
    : env.DB.prepare(`UPDATE users SET password_hash = ?3, password_salt = ?4
        WHERE id = ?1 AND email = ?2 AND password_hash IS ?5 AND password_salt IS ?6
        AND EXISTS (SELECT 1 FROM sessions WHERE user_id = ?1 AND token_hash = ?7
          AND expires_at > datetime('now','+9 hours'))`)
        .bind(user.id, user.email, hash, salt, authority.previousHash, authority.previousSalt, authority.sessionTokenHash);
  const changed = "EXISTS (SELECT 1 FROM users WHERE id = ?1 AND password_salt = ?2)";
  const statements = [
    update,
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1 AND ${changed}`).bind(user.id, salt),
    env.DB.prepare(`DELETE FROM password_resets WHERE user_id = ?1 AND ${changed}`).bind(user.id, salt),
    env.DB.prepare(`INSERT OR IGNORE INTO identities (user_id, provider, provider_user_id)
      SELECT ?1, 'email', ?3 WHERE ${changed}`).bind(user.id, salt, user.email),
  ];
  if (reset && !isReservedEmail(user.email)) {
    statements.push(env.DB.prepare(`INSERT INTO user_email_verified (user_id, email, method, verified_at)
      SELECT ?1, ?3, 'password-reset', datetime('now','+9 hours') WHERE ${changed}
      ON CONFLICT(user_id) DO UPDATE SET email = excluded.email,
        method = excluded.method, verified_at = excluded.verified_at`).bind(user.id, salt, user.email));
  }
  statements.push(env.DB.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at)
    SELECT ?3, ?1, datetime('now','+9 hours', ?4) WHERE ${changed}`)
    .bind(user.id, salt, tokenHash, `+${SESSION_DAYS} days`));
  const results = await env.DB.batch(statements);
  return results[0]?.meta?.changes === 1 ? token : null;
}
