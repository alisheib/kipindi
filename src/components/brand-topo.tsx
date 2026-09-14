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
          {/* 2026-09-13: EVERY CONTOUR RUNS 0 → 240 AND ENDS AT THE HEIGHT IT STARTED, with the
              same slope, so each tile meets its neighbour. Three of the four used to run past the
              240 tile or start before it, so the lines jumped at every tile edge (visible seams
              on the auth pages at 1280). The four baselines, amplitudes and stroke are unchanged;
              the wavelengths now all repeat with the tile. */}
          <path d="M 0 90 Q 60 60 120 90 T 240 90"  fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
          <path d="M 0 60 Q 60 30 120 60 T 240 60"  fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
          <path d="M 0 120 Q 60 100 120 120 T 240 120" fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
          <path d="M 0 150 Q 60 130 120 150 T 240 150" fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
}
