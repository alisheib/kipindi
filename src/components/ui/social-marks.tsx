/**
 * The Instagram and TikTok marks, in their own colours.
 *
 * ⛔ WHY THESE ARE NOT IN `glyphs.tsx`, AND COULD NOT BE. That file's `G` wrapper hard-codes
 * `fill="none" stroke="currentColor" strokeWidth="1.9"` — that IS the family contract, and it
 * is what makes 178 glyphs agree without anyone remembering to make them agree. A multi-path,
 * multi-fill, gradient-bearing vendor logo cannot satisfy it. Bending `G` to admit one would
 * not be extending the kit, it would be dissolving the rule the kit is made of (§K5,
 * "extend the kit; never fork it" — the point of which is that the kit stays one thing).
 *
 * ⭐ SO THEY LIVE BESIDE `brand.tsx`, UNDER ITS DOCUMENTED EXCEPTION. That file already
 * carries literal hexes (`#1EA362` / `#B03A3E` / `#E3BC66`) with the reason written down:
 * "a deliberate byte-identical port of the delivered logo … allowed to diverge from theme
 * tokens — brand identity ≠ theme tokens." A third party's registered mark is the same case,
 * only more so: we do not own these colours and are not free to re-hue them. The Definition
 * of Done's "zero new hex literals in components" is a rule about THEME values leaking into
 * components; these are not theme values and there is no token that could hold them.
 *
 * ⚠️ THE COLOURS ARE THE VENDORS', COPIED, NOT CHOSEN — do not "improve" them:
 *   Instagram  radial gradient #FDF497 → #FD5949 → #D6249F → #285AEB
 *   TikTok     cyan #25F4EE · red #FE2C55 · body #FFFFFF
 *
 * ⭐ TIKTOK'S BODY IS WHITE, AND THAT IS THE CORRECT VARIANT, NOT A CHOICE. TikTok publishes
 * two: a black-body note for light grounds and a white-body note for dark ones. 50pick has
 * exactly ONE surface — §B3, "single dark-royal theme, no light mode" — so the dark-ground
 * variant is unconditionally right here and a `bodyFill` prop would be speculative. The
 * owner-supplied PNG was the black-body version; on `--bg` its note would have disappeared
 * and left a cyan ghost and a red ghost with a hole between them.
 *
 * ⭐ THE SIZE PROP IS `s`, MATCHING THE GLYPH FAMILY ON PURPOSE. `scripts/icon-size-ratchet
 * .test.mts` discovers its population by matching `s={N}` across every `.tsx` under `src/`.
 * Spelling it `size` — as `brand.tsx` does — would have put these two marks OUTSIDE that
 * guard's population, which is a way of passing a gate by stepping around it. `s` opts them
 * in. 16 is `GLYPH.row` and already frozen, so nothing new enters the set.
 *
 * Chosen by the owner 2026-09-12 from a four-treatment render on the real footer surface:
 * the house-line interpretation was not recognisable as TikTok at 16px, and a hover-only
 * colour treatment resolves to plain monochrome on every phone, which is nearly every player.
 */

type MarkProps = { s?: number; className?: string };

/* ⭐ FIXED IDS, AND THE DUPLICATE CASE IS BENIGN BY CONSTRUCTION. These render once per page
   (the footer is the only consumer). If a second instance ever appears, the duplicate id
   resolves to the first definition — and because both definitions are byte-identical
   constants, the second instance still paints correctly. That is why this does not need
   `useId()`, which would also drag a client-only hook into a module a server component
   should stay free to import. */
const IG_GRADIENT_ID = "kp-ig-grad";
const TT_NOTE_ID = "kp-tt-note";

/** The official Instagram glyph outline — rounded frame, lens, and the top-right dot. */
const INSTAGRAM_D =
  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z";

/** The official TikTok note. */
const TIKTOK_D =
  "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";

export function InstagramMark({ s = 16, className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} className={className} aria-hidden>
      <defs>
        <radialGradient id={IG_GRADIENT_ID} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#FDF497" />
          <stop offset="5%" stopColor="#FDF497" />
          <stop offset="45%" stopColor="#FD5949" />
          <stop offset="60%" stopColor="#D6249F" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <path fill={`url(#${IG_GRADIENT_ID})`} d={INSTAGRAM_D} />
    </svg>
  );
}

export function TikTokMark({ s = 16, className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} className={className} aria-hidden>
      {/* ⭐ THE PATH IS DEFINED ONCE AND USED THREE TIMES. The mark is one note in three
          offset copies; writing the 900-byte path out three times would have tripled the
          markup on every player-facing page for no drawing anyone could see. The `<defs>`
          path carries NO fill, so each `<use>` supplies its own. */}
      <defs>
        <path id={TT_NOTE_ID} d={TIKTOK_D} />
      </defs>
      <use href={`#${TT_NOTE_ID}`} fill="#25F4EE" transform="translate(-0.9 0.9)" />
      <use href={`#${TT_NOTE_ID}`} fill="#FE2C55" transform="translate(0.9 -0.4)" />
      <use href={`#${TT_NOTE_ID}`} fill="#FFFFFF" />
    </svg>
  );
}

/** Keyed by `SocialAccount.labelKey` in `src/lib/social.ts` — one key, one mark, one label. */
export const SOCIAL_MARK = {
  instagram: InstagramMark,
  tiktok: TikTokMark,
} as const;
