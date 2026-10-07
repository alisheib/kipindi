/**
 * A SENTENCE THE SERVER WROTE, CARRIED THROUGH ONE REDIRECT — SIGNED (2026-10-06).
 *
 * ⛔ The DEPOSIT and WITHDRAW pages printed whatever text arrived in their `?error=` parameter, under "Deposit failed" /
 * "Withdrawal failed". So a hand-made link put an attacker's sentence on 50pick.tz's own money pages — "Deposit failed.
 * Pay to agent number 07…" — signed in, on the real domain. A stray "%" also crashed them through a second
 * `decodeURIComponent` (the value arrives decoded).
 *
 * ⭐ Now the action signs its own sentence with the session secret, bound to the page it is for (`kind`) and to a
 * 15-minute expiry, and the page shows it only if all three hold. Anything else reads as null and the page shows its
 * own words or nothing. The token is URL-safe (base64url + "."), so it travels in the query like the text did.
 *
 * (Sign-up's `?message=` was the third such page; it was RETIRED on 2026-10-06. A refused sign-up now returns to the
 * mounted form and carries no message in any URL — `src/app/auth/register/refusal.ts`.)
 */
import { signSession, verifySession } from "./crypto";

export type FlashKind = "deposit-error" | "withdraw-error";

const TTL_MS = 15 * 60_000;
const MAX_LEN = 400;

/** Sign `message` for the page of `kind`. */
export function signFlash(kind: FlashKind, message: string): string {
  return signSession({ k: kind, m: message.slice(0, MAX_LEN), exp: Date.now() + TTL_MS });
}

/** The sentence an action signed for this page, or null — hand-made, tampered, expired or another page's reads as null. */
export function readFlash(kind: FlashKind, token: unknown): string | null {
  if (typeof token !== "string" || !token) return null;
  const p = verifySession<{ k?: unknown; m?: unknown }>(token);
  return p && p.k === kind && typeof p.m === "string" && p.m ? p.m : null;
}
