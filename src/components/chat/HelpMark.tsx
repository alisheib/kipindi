"use client";

/**
 * HelpMark — a universally recognized chat-bubble icon in 50pick's
 * brand colors. The speech bubble shape reads as "tap to chat" at any
 * size. Uses the chat surface's PEARL + indigo palette (gold-discipline:
 * the launcher is chrome, so no gilt) so it belongs visually without
 * being mistaken for a floating logo.
 *
 * The actual FiftyMark coin appears inside the chat panel header —
 * not on the FAB, where clarity of function beats brand presence.
 */

export type HelpMarkProps = {
  size?: number;
  variant?: "gilt" | "indigo" | "halo";
  chord?: boolean;
  pulse?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function HelpMark({
  size = 34,
  className,
  "aria-label": ariaLabel = "50pick Help",
}: HelpMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
      aria-label={ariaLabel}
    >
      {/* Chat bubble body — PEARL (the chat surface's emphasis colour), not
          gilt: the launcher is support chrome, so gold-discipline keeps it off
          gold (gold = earned-money only). Matches the FAB's pearl scheme. */}
      <path
        d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5l-3.5 3.5L8 18H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
        fill="oklch(86% 0.040 268)"
        stroke="oklch(70% 0.050 268)"
        strokeWidth="0.5"
      />
      {/* Three dots — typing / conversation indicator */}
      <circle cx="8" cy="11" r="1.3" fill="oklch(20% 0.090 268)" />
      <circle cx="12" cy="11" r="1.3" fill="oklch(20% 0.090 268)" />
      <circle cx="16" cy="11" r="1.3" fill="oklch(20% 0.090 268)" />
    </svg>
  );
}
