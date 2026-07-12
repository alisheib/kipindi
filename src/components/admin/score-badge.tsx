/**
 * ScoreBadge — renders a numeric score (0–100) coloured by its good/warn/bad
 * band. The shared replacement for the inline `<span style={{ color: v >= 80 ?
 * … }}>{v}%</span>` spans scattered across the admin score tables.
 *
 * `muted` selects the quiet table palette (bad = grey) vs the default alarm
 * palette (bad = claret). `suffix` appends a unit (e.g. "%"). Byte-identical to
 * the spans it replaces. Server-safe: pure, no hooks.
 */
import { band, BAND_TEXT, BAND_TEXT_MUTED } from "@/lib/score-band";

export function ScoreBadge({
  value,
  good,
  warn,
  muted = false,
  suffix = "",
  className = "",
}: {
  value: number;
  good: number;
  warn: number;
  muted?: boolean;
  suffix?: string;
  className?: string;
}) {
  const tone = (muted ? BAND_TEXT_MUTED : BAND_TEXT)[band(value, { good, warn })];
  return (
    <span className={className} style={{ color: tone }}>
      {value}{suffix}
    </span>
  );
}
