/**
 * BotMark — the AI Help Companion's non-anthropomorphic glyph.
 *
 * A single inscribed mark on the cardinal axis: thin outer "instrument
 * bezel" + asymmetric crosshair + solid center node. Reads as a
 * compass-rose / typographic pilcrow, never as a creature. The kit
 * forbids mascots; this glyph is hand-drawn to the same stroke
 * conventions the rest of the kit uses (Sora/Inter at 1.6 stroke).
 */

export function BotMark({
  size = 18,
  stroke = 1.6,
  color = "var(--pearl)",
}: {
  size?: number;
  stroke?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" opacity="0.4" />
      <path d="M12 4 L12 20" />
      <path d="M7 12 L17 12" opacity="0.7" />
      <circle cx="12" cy="12" r="1.6" fill={color} stroke="none" />
    </svg>
  );
}

/** Plate-mounted variant — the BotMark inside a 24/32/40 px tile, used
 *  as an avatar in the panel header and handoff card. */
export function BotAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = { sm: 24, md: 32, lg: 40 }[size];
  const mark = { sm: 14, md: 18, lg: 22 }[size];
  return (
    <span className={`cm-avatar cm-avatar-${size}`} style={{ width: dim, height: dim }} aria-hidden>
      <BotMark size={mark} />
    </span>
  );
}
