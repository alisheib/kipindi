/**
 * Spinner — kit atom (kit/atoms.jsx → Spinner). Currents-color stroke
 * so it inherits the surrounding text colour. Used inside SubmitButton
 * and any in-flight indicator that shouldn't pull a brand colour.
 *
 * ⭐ THE ONE LOOP IN THIS CAMPAIGN THAT IS DELIBERATELY LEFT ALONE (§M6 / §M5).
 * Every other inline `animation` in a style attribute was moved onto a class so
 * the motion gates could see it. This one stays where it is, on purpose, and the
 * reasoning is worth more than the tidiness:
 *
 * · §M5 names this atom as THE in-flight indicator ("In-flight is the kit
 *   Spinner, not a spinning glyph"). A spinner is not decoration and not an
 *   ambient loop — it IS the answer to "did my tap land?", and it exists only
 *   while a real operation is outstanding.
 * · The third gate is a THROTTLE for ambient loops on low-end Android — which is
 *   exactly the device where a submit takes longest. Stopping the spinner there
 *   turns a slow request into a frozen button. Silence is the wrong answer to
 *   "still working".
 * · The two hard CLAMPS already reach it without any help: the universal
 *   `animation-duration: 0.01ms !important` in motion.css overrides an inline
 *   style, so a player who asked for no motion gets a still ring — and a still
 *   ring is still VISIBLE (`stroke-opacity` 0.25 plus the 90° arc), so the
 *   pending state is not conveyed by motion alone.
 *
 * ⚠️ WHAT THE KEYFRAME REGISTRY NEEDS TO KNOW, because this is a live deletion
 * trap: `test:keyframes` finds consumers by scanning for `animation:` followed by
 * a name, and its capture class excludes the quote character — so an animation
 * written in a JSX style attribute registers as NO consumer at all. `spin`
 * (defined at `globals.css:1820`) is referenced from nowhere else in the repo, so
 * the registry reports it as a dead name. It is not dead: it drives every
 * `SubmitButton` on the platform, deposit and withdraw included. Either the
 * registry's consumer scan learns to read a style attribute, or `spin` earns an
 * explicit entry on its keep list; deleting it on the registry's current word
 * would silently freeze every pending button in the product.
 */

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
