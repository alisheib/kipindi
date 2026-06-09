"use client";

/**
 * HelpMark — the actual FiftyMark brand coin wrapped in a chat-bubble
 * frame. Uses the REAL FiftyMark component from brand.tsx — no
 * duplicated coin geometry, no color drift. Single source of truth.
 *
 * The bubble frame is a subtle rounded container with a speech-tail
 * that signals "chat / help" without competing with the brand mark.
 */

import { FiftyMark } from "@/components/brand";

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
  // The coin takes ~70% of the bubble size for good padding
  const coinSize = Math.round(size * 0.72);
  const compact = size <= 25;

  return (
    <div
      className={className}
      aria-label={ariaLabel}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: "linear-gradient(135deg, oklch(22% 0.110 268), oklch(16% 0.100 268))",
        border: "1px solid oklch(35% 0.080 268)",
        boxShadow: "0 2px 8px -2px oklch(8% 0.080 268 / 0.6), inset 0 1px 0 oklch(30% 0.070 268)",
        flexShrink: 0,
      }}
    >
      <FiftyMark size={coinSize} />
      {/* Speech-tail — small triangle at bottom-right */}
      {!compact && (
        <svg
          width={size * 0.28}
          height={size * 0.22}
          viewBox="0 0 10 8"
          style={{
            position: "absolute",
            bottom: -size * 0.1,
            right: size * 0.08,
          }}
          aria-hidden
        >
          <path
            d="M 0 0 L 6 8 L 8 0 Z"
            fill="oklch(16% 0.100 268)"
            stroke="oklch(35% 0.080 268)"
            strokeWidth="0.6"
          />
          {/* Cover the top border where tail meets bubble */}
          <rect x="0" y="-0.5" width="8.5" height="1.5" fill="oklch(18% 0.105 268)" />
        </svg>
      )}
    </div>
  );
}
