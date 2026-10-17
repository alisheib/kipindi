/**
 * THE MILLIONEA WORDING, READ AS EACH RENDERING — `scripts/lib/millionea-wording-source.mts` (MASWALI-BUILD S5; the lead's
 * decision of 2026-10-18, under Ali's delegation).
 *
 * ⭐ WHY THIS EXISTS. /legal/privacy draws §7's Maswali Millionea paragraph inside a `MillioneaWording` element
 * (`src/lib/server/legal/millionea-wording.tsx`): its children print only while the server's ceiling admits Millionea, and
 * nothing at all prints below it. The guards that read the page as SOURCE read it as one of its two renderings:
 *   · `millioneaDarkSource` — every wrapper removed WITH its children: the notice production prints (WITHDRAWN);
 *   · `millioneaPublishedSource` — only the wrapper's tags removed: the notice printed above the ceiling.
 * ⭐ ONE reader of both, so the guards can never disagree about what each rendering is (the `policy-line-source.mts`
 * precedent: one helper, never forty copies).
 * ⛔ An unclosed wrapper is KEPT, not swallowed: text wrongly kept can only raise a false red, which is loud; text wrongly
 *    removed raises a false green, which is silent (`decomment.mts`'s rule).
 * ⛔ No backslash in this file: an editing tool decodes typed escapes (repo memory, 2026-10-02).
 */
const OPEN = "<MillioneaWording>";
const CLOSE = "</MillioneaWording>";

/** Every wrapper a source holds, each with its children, in order — a caller's control, so a reader that finds none
 *  cannot pass. */
export function millioneaWordingBlocks(src: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const a = src.indexOf(OPEN, from);
    if (a < 0) return out;
    const b = src.indexOf(CLOSE, a);
    if (b < 0) return out;
    out.push(src.slice(a, b + CLOSE.length));
    from = b + CLOSE.length;
  }
}

/** ⭐ The page as it prints below the ceiling: every wrapper gone, with everything inside it. */
export function millioneaDarkSource(src: string): string {
  let out = src;
  for (;;) {
    const a = out.indexOf(OPEN);
    if (a < 0) return out;
    const b = out.indexOf(CLOSE, a);
    if (b < 0) return out;
    out = out.slice(0, a) + out.slice(b + CLOSE.length);
  }
}

/** ⭐ The page as it prints above the ceiling: the wrapper's tags gone, its children where they were. */
export function millioneaPublishedSource(src: string): string {
  return src.split(OPEN).join("").split(CLOSE).join("");
}
