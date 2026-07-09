/**
 * RG self-care sunrise — the SAME calm-sunrise line-art as the B3 `rg`
 * EmptyState illustration (horizon + rising sun + rays), reused as a shared
 * component. Deliberately NO gambling imagery. Core is yes-toned (not gold —
 * RG is care, not a reward), fitting the page's `yes` support tone.
 */
export function RgSunriseArt({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 56 56"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="10" y1="40" x2="46" y2="40" />
      <path d="M19 40 a9 9 0 0 1 18 0" />
      <line x1="28" y1="18" x2="28" y2="13" />
      <line x1="14.5" y1="25.5" x2="11" y2="22" />
      <line x1="41.5" y1="25.5" x2="45" y2="22" />
      <line x1="12" y1="40" x2="7" y2="40" />
      <line x1="44" y1="40" x2="49" y2="40" />
      <circle cx="28" cy="40" r="2.4" fill="var(--yes-300)" stroke="none" />
    </svg>
  );
}
