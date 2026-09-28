import { OPTOUT_TOKEN_CHARS, OPTOUT_PATH } from "./footer";

/**
 * U8 · THE OPT-OUT TOKEN, AS ARITHMETIC (OD43).
 *
 * ⛔ PURE AND CLIENT-SAFE ON PURPOSE. It imports nothing from `server/`, so the page that
 * renders a token and the service that mints one share ONE definition of what a token is.
 * The randomness lives on the server; the shape lives here.
 */

/**
 * 🔴 WHY THIS ALPHABET AND NOT HEX, WITH THE NUMBER WRITTEN OUT.
 *
 * OD43 pins the token at EIGHT characters and says it NEVER expires, so every collision is
 * permanent — two people sharing a link means one of them cannot leave, for ever.
 *
 * The obvious `randomId(4)` returns HEX (`crypto.ts:109-111`): 16⁸ = 4.3×10⁹. Against §3c's
 * 150,000-recipient campaign the birthday estimate n²/2N is ≈ **2.6 expected collisions** —
 * not a risk, a near-certainty, on the very first campaign.
 *
 * This is the repo's existing ambiguity-free alphabet (`agent-application-service.ts:1330`):
 * 32 characters, with I, O, 0 and 1 removed so nobody mistypes a link read off a phone screen.
 * 32⁸ = 1.1×10¹² gives ≈1% per campaign — better by three orders of magnitude, and still not
 * zero, which is why `mintOptOutToken` RETRIES on conflict instead of hoping.
 */
export const OPTOUT_TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Fold hex into the alphabet, without modulo bias.
 *
 * ⭐ THE BIAS IS ZERO BY ARITHMETIC, NOT BY LUCK: a byte is 0–255, the alphabet is 32 long, and
 * 256 is exactly 8 × 32 — so every character is reachable by exactly eight byte values. Change
 * the alphabet to a length that does not divide 256 and this silently starts favouring its
 * first characters, which is why the guard asserts the division.
 *
 * ⛔ Needs two hex characters per output character — `OPTOUT_TOKEN_CHARS * 2`.
 */
export function optOutTokenFromHex(hex: string): string {
  let out = "";
  for (let i = 0; i + 1 < hex.length && out.length < OPTOUT_TOKEN_CHARS; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) return "";
    out += OPTOUT_TOKEN_ALPHABET[byte % OPTOUT_TOKEN_ALPHABET.length];
  }
  return out.length === OPTOUT_TOKEN_CHARS ? out : "";
}

/**
 * Is this the shape of a token we could ever have minted?
 *
 * ⚠️ A SHAPE CHECK IS NOT AN EXISTENCE CHECK, and the page must not confuse them. This exists so
 * an obviously malformed path is refused without a database round trip per hit — `/s/` is public
 * and unauthenticated, so it is the cheapest thing on the site to point a script at. A token of
 * the right shape still has to be looked up, and a token of the wrong shape still gets the same
 * plainly-worded refusal as one that simply does not exist: ⛔ the page never tells a stranger
 * which of the two it was.
 */
export function isOptOutTokenShape(token: string): boolean {
  if (token.length !== OPTOUT_TOKEN_CHARS) return false;
  for (const ch of token) if (!OPTOUT_TOKEN_ALPHABET.includes(ch)) return false;
  return true;
}

/**
 * D6 · THE TOKEN AS SOMEBODY TYPED IT. The alphabet above has no lower-case members, so folding
 * case cannot make two minted tokens collide or widen the guessing space — it only stops a person
 * who typed `50pick.tz/s/k7mx…` into a phone's URL bar (which does not capitalise) from being told
 * the link does not work. ⛔ Every reader of a token goes through this before the shape check.
 */
export function normalizeOptOutToken(raw: string | null | undefined): string {
  return String(raw ?? "").trim().toUpperCase();
}

/**
 * ⛔ THE TOKEN IS A LIVE CREDENTIAL, so it is never written into evidence, `liftedReason` or an
 * audit payload in full: anybody who can read `/admin/audit` could otherwise open `/s/<token>`
 * and act as the person, recorded with `recordedBy: null` as if they had. Two leading characters
 * plus the row's own `identifier` still pick the link out of that number's tokens; the rest is
 * starred at a fixed width (`*` is this codebase's audit-log vocabulary, `phone-normalize.ts`).
 */
export const OPTOUT_TOKEN_REF_CHARS = 2;
export function optOutTokenRef(token: string): string {
  const t = normalizeOptOutToken(token);
  return `${t.slice(0, OPTOUT_TOKEN_REF_CHARS)}${"*".repeat(OPTOUT_TOKEN_CHARS - OPTOUT_TOKEN_REF_CHARS)}`;
}

/**
 * Is this request path the opt-out page? Bare `/s` and `/s/<one segment>` — the two routes that exist.
 * ⛔ A SEGMENT match, so `/settings` and `/support` are not. Built from `OPTOUT_PATH`, never re-typed
 * (the page's own rule).
 * 🔴 2026-09-27 · IT USED TO MATCH ANY `/s/…` PATH. `/s/<token>/<more>` has no route, so the root 404
 * rendered inside the stripped shell, and its soft `<Link>`s opened the landing page with no nav until a
 * hard reload. A deeper path now gets the full shell and its working 404.
 */
export function isOptOutPath(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  const bare = OPTOUT_PATH.replace(/\/$/, "");
  if (p === bare || p === OPTOUT_PATH) return true;
  if (!p.startsWith(OPTOUT_PATH)) return false;
  const rest = p.slice(OPTOUT_PATH.length).replace(/\/$/, "");
  return rest.length > 0 && !rest.includes("/");
}
