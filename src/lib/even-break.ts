/**
 * ⭐ AN UNBROKEN TOKEN BREAKS ONLY BETWEEN NEAR-EQUAL CHUNKS — never one character alone on its last line (MASWALI-BUILD
 * FLOW 4, the lead's ruling of 2026-10-23, from FLOW's walk of the slip's deposit: the classic wallet's deposit result read
 * "txn_b7f5f7cd59628ee1bb86d11" over a lone "3" at 360).
 *
 * A reference — a transaction id, a serial, a provider's code — has no space, so `break-all` was the only way it could
 * wrap, and `break-all` breaks greedily: the line takes every character that fits, and whatever is left, one character
 * included, stands alone below it. Instead the token is cut into `n` chunks of near-equal length (`n` = 2, or one chunk
 * per ~14 characters for a longer token) with a break opportunity (`<wbr>`) between them and nowhere else. A token that
 * fits stays one line; one that does not breaks at a chunk edge, so its last line holds a whole chunk (7 characters at
 * the least) — two equal halves for the wallet's 28-character id. A copy of it is still the exact string (`<wbr>` adds no
 * character). The caller keeps `overflow-wrap: break-word` as the floor for a box narrower than one chunk.
 * Pure: the chunks only; `components/markets/operation-result-modal.tsx` draws them.
 */

/** Shorter than this, a token wraps as it always did (a short value fits; a sentence has spaces and wraps at them). */
export const EVEN_BREAK_MIN_LENGTH = 16;
/** The longest chunk: 14 characters of the 14px mono face is ~118px, far inside the narrowest detail box (320: ~224px). */
export const EVEN_BREAK_MAX_CHUNK = 14;

/** The near-equal chunks of an unbroken token, or null when the value is short or has whitespace (it wraps as text). */
export function evenBreakChunks(value: string): string[] | null {
  if (typeof value !== "string" || value.length < EVEN_BREAK_MIN_LENGTH || /\s/.test(value)) return null;
  const chars = Array.from(value);
  const n = Math.max(2, Math.ceil(chars.length / EVEN_BREAK_MAX_CHUNK));
  const base = Math.floor(chars.length / n), extra = chars.length % n;
  const out: string[] = [];
  for (let i = 0, at = 0; i < n; i++) {
    const len = base + (i < extra ? 1 : 0);
    out.push(chars.slice(at, at + len).join(""));
    at += len;
  }
  return out;
}
