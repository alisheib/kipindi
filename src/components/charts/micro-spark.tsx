/**
 * MicroSpark — THE inline micro-chart. One component behind every sparkline a
 * card, panel or row renders (market card 24h YES% · wallet 30-day balance).
 *
 * ⭐ THE MICRO/FULL COLOUR LAW (CHART-SPRINT 2026-09-04, from two dated rulings
 * this component inherits rather than re-decides):
 *   · A MICRO chart is a heartbeat — it states that activity exists and its
 *     shape. It is ALWAYS aqua (`--aqua-400`), never yes/no ink and never gold:
 *     the market card wrote "Aqua = live heartbeat (never gold)" and the wallet
 *     "balance is state, not earnings → aqua". A board of twenty cards each
 *     shouting green/rose direction would dilute the YES/NO button ink the
 *     money controls own — direction on a card belongs to the move chip.
 *   · A FULL chart (ProbabilityChart, PriceHero, the Up & Down round chart)
 *     answers "which way" and wears the yes/no families.
 * A micro chart that wants semantic colour is asking to be a full chart —
 * promote it, don't tint it.
 *
 * ⚠️ A-5: renders nothing below 2 points, and call sites may demand more (the
 * market card requires ≥4 REAL points before it shows a spark at all). This
 * component never receives fabricated data because no reader fabricates any.
 *
 * Hook-free on purpose — usable from server components (results, invite) and
 * client components (market card, wallet) alike.
 */
import { smoothPath, linePath, closeArea, seriesToXY } from "./chart-core";
import { cn } from "@/lib/utils";

export function MicroSpark({
  data,
  width,
  height,
  padX = 4,
  padY = 4,
  smooth = false,
  area = false,
  pip = false,
  stretch = false,
  lineClassName,
  className,
}: {
  data: number[];
  width: number;
  height: number;
  /** Inner padding in viewBox units. The market card runs padX 0 — its spark
   *  bleeds to the card edge by design. */
  padX?: number;
  padY?: number;
  /** Catmull-Rom smoothing — for dense event series; leave off when the few
   *  points ARE the statement. */
  smooth?: boolean;
  /** Faint fill under the line (market-card idiom). */
  area?: boolean;
  /** Terminal dot on the latest value (wallet idiom). */
  pip?: boolean;
  /** `preserveAspectRatio="none"` — the svg fills its column and the caller
   *  sizes it with CSS. Strokes stay uniform via non-scaling-stroke. */
  stretch?: boolean;
  /** Extra class on the line — e.g. the market card's draw-in animation class,
   *  which stays declared beside the card's other CSS (motion.css ladder). */
  lineClassName?: string;
  /** Class on the svg element itself. */
  className?: string;
}) {
  if (!Array.isArray(data) || data.length < 2) return null;
  const pts = seriesToXY(data, { x0: padX, x1: width - padX, y0: padY, y1: height - padY });
  const line = smooth ? smoothPath(pts) : linePath(pts);
  const [lastX, lastY] = pts[pts.length - 1];
  // 2026-09-13 · A STRETCHED PIP IS HTML, NOT SVG. `stretch` scales the viewBox on X only, so an
  // svg circle drew as a flattened oval on the wallet at 1280 (about 14 by 5 px). The line may
  // stretch; the dot must stay round. So the stretched pip is a dot laid over the svg at the same
  // point: x as a percentage of the width, y in px (the height is never scaled). An unstretched
  // spark scales uniformly and keeps its circle. The wrapper takes `className` so the caller's
  // sizing and the dot's percentage refer to the same box.
  const htmlPip = pip && stretch;
  const svg = (
    <svg
      className={htmlPip ? "block w-full" : className}
      width={stretch ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={stretch ? "none" : undefined}
      aria-hidden
    >
      {area && (
        <path d={closeArea(line, lastX, pts[0][0], height)} fill="var(--aqua-400)" fillOpacity={0.06} stroke="none" />
      )}
      <path
        className={lineClassName}
        d={line}
        pathLength={1}
        fill="none"
        stroke="var(--aqua-400)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {pip && !stretch && <circle cx={lastX} cy={lastY} r="2.4" fill="var(--aqua-400)" />}
    </svg>
  );
  if (!htmlPip) return svg;
  return (
    <span className={cn("relative block", className)} aria-hidden>
      {svg}
      {/* Same colour and size as the circle it replaces: r 2.4 at the unscaled 1:1 height. */}
      <span
        className="rounded-full"
        style={{
          position: "absolute",
          left: `${(lastX / width) * 100}%`,
          top: lastY,
          width: 4.8,
          height: 4.8,
          background: "var(--aqua-400)",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
    </span>
  );
}
