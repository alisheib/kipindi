/**
 * Topographic backdrop — Tanzanian highland contour pattern, very subtle.
 * Ported from `kit/banners.jsx`. Use as a background layer on hero blocks.
 */
import * as React from "react";

export function BrandTopo({ id = "topo", opacity = 0.09 }: { id?: string; opacity?: number }) {
  const pid = `${id}-${React.useId().replace(/:/g, "")}`;
  return (
    <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none" style={{ opacity }} aria-hidden>
      <defs>
        <pattern id={pid} x="0" y="0" width="240" height="180" patternUnits="userSpaceOnUse">
          <path d="M 0 90 Q 60 60 120 90 T 240 90"  fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
          <path d="M 0 60 Q 80 30 160 60 T 320 60"  fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
          <path d="M 0 120 Q 40 100 100 120 T 220 120 T 340 120" fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
          <path d="M -40 150 Q 60 130 140 150 T 280 150" fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
}
