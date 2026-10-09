const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/components/markets/conviction-dial.tsx", [
  [`import { formatBreakEnd } from "@/lib/break-end";`,
   `import { formatBreakEnd } from "@/lib/break-end";
import { dialScale } from "./dial-scale";`],
  // ── the scale ──
  [`          {/* Tachymeter detents — derived from the LIVE [baseStake, maxStake] (admin-
              tunable), never hardcoded, so the scale always spans the configured range
              (e.g. up to 1,000,000) and stays correct if the min/max change. */}
          {(() => {
            const nice = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
            const set = nice.map((k) => k * baseStake).filter((t) => t >= baseStake && t <= baseStake * maxMultiplier);
            // Guarantee the max edge is present as the final detent.
            const edge = Math.round(baseStake * maxMultiplier);
            if (!set.includes(edge)) set.push(edge);
            return set;
          })().flatMap((tzs) => {
            const m = tzs / baseStake;
            const dist = Math.sqrt(Math.max(0, (m - 1) / (maxMultiplier - 1)));
            const isEdge = tzs === Math.round(baseStake * maxMultiplier);
            return ["YES", "NO"].map((s) => {
              const px = s === "YES" ? (0.5 - 0.5 * dist) * width : (0.5 + 0.5 * dist) * width;
              return (
                <g key={\`\${s}-\${m}\`} aria-hidden>
                  <line
                    x1={px} x2={px}
                    y1={trackY - 4} y2={trackY + trackH + 4}
                    stroke="var(--text-muted)"
                    strokeWidth={isEdge ? 1 : 0.75}
                    opacity={isEdge ? 0.55 : 0.32}
                  />
                  {!isEdge && (
                    <text
                      x={px} y={trackY - 8}
                      textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="500"
                      fontSize="7.5"
                      fill="var(--text-muted)"
                      opacity={0.55}
                      letterSpacing="0.04em"
                    >`,
   `          {/* Tachymeter detents — derived from the LIVE [baseStake, maxStake] (admin-
              tunable), never hardcoded, so the scale always spans the configured range
              (e.g. up to 1,000,000) and stays correct if the min/max change.
              ⭐ R4-I (2026-10-09, tiles 034 038 042 067 071 075) · WHICH FIGURES, AND HOW BIG, IS \`dialScale\`'s
              (dial-scale.ts): 10px RENDERED (the SVG draws its viewBox into the track's width, so 7.5 units read 5.8px),
              in the subtle ink at full strength, and only where a figure clears the resting thumb and its neighbour —
              "100K" and "50K" overlapped each other under the thumb. Every detent keeps its tick. */}
          {(() => {
            const scaleMarks = dialScale({ width, pad: PAD, knobR, baseStake, maxMultiplier });
            return scaleMarks.ticks.map(({ tzs, side: s, x: px, isEdge, label }) => {
              const m = tzs / baseStake;
              return (
                <g key={\`\${s}-\${m}\`} aria-hidden>
                  <line
                    x1={px} x2={px}
                    y1={trackY - 4} y2={trackY + trackH + 4}
                    stroke="var(--text-muted)"
                    strokeWidth={isEdge ? 1 : 0.75}
                    opacity={isEdge ? 0.55 : 0.32}
                  />
                  {label && (
                    <text
                      x={px} y={trackY - 8}
                      textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="500"
                      fontSize={scaleMarks.fontSize}
                      fill="var(--text-subtle)"
                      letterSpacing="0.04em"
                    >`],
  [`                          \`stakeChipLabel\`, which answers the same question for the quick-bet
                          chips. */}
                      {tzs >= 1_000_000
                        ? \`\${tzs % 1_000_000 === 0 ? tzs / 1_000_000 : (tzs / 1_000_000).toFixed(1)}M\`
                        : tzs >= 1_000
                          ? \`\${tzs % 1_000 === 0 ? tzs / 1_000 : (tzs / 1_000).toFixed(1)}K\`
                          : String(tzs)}
                    </text>
                  )}
                </g>
              );
            });
          })}`,
   `                          \`stakeChipLabel\`, which answers the same question for the quick-bet
                          chips. The grammar now lives in \`dialTickLabel\` (dial-scale.ts), unchanged. */}
                      {label}
                    </text>
                  )}
                </g>
              );
            });
          })()}`],
]);
