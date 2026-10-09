import type { ReactNode, ElementType } from "react";
import { FiftyMark } from "@/components/brand";

/**
 * PageHero — the deep-royal form-page hero panel: one glow radial + the
 * shared --hero-panel-grad + a corner FiftyMark watermark. Wraps the header
 * content (typically a <PageHeader>). Replaces ~8 hand-rolled copies that
 * had drifted on glow corner (top-right vs bottom-left), radial size
 * (800×320 vs 900×360) and gradient string.
 *
 * `glow` tints the single radial to the page accent; the shape/position/alpha
 * are fixed (800×320 at 100% 0%, /0.18).
 * ⛔ NO `gold` (R5-C, 2026-10-09; Q5): a page's hero is never money. Its only callers, /proposals and /proposals/new,
 * take the default `info`, the glow seven other page heroes wear.
 * ⛔ NO `yes` AND NO `rose` EITHER (R5-I, 2026-10-09; DESIGN_AUTHORITY §B2a): the betting pair names the two sides of a
 * stake, and a page's hero names a page. `yes` had one caller — the responsible-gambling page, now `info` with the other
 * account pages — and `rose` none.
 */
type Glow = "info" | "aqua";

const GLOW: Record<Glow, string> = {
  info: "oklch(45% 0.10 240 / 0.18)",
  // aqua — the LIVE accent (matches the live pip / tipping / spark hue 195).
  aqua: "oklch(52% 0.10 195 / 0.18)",
};

export function PageHero({
  glow = "info",
  watermark = 180,
  as: Tag = "header",
  contentClassName = "relative z-10 p-5 lg:p-6",
  className,
  children,
}: {
  glow?: Glow;
  watermark?: number;
  as?: ElementType;
  contentClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={`relative overflow-hidden rounded-xl border border-border bg-bg-elevated ${className ?? ""}`}
    >
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background: `radial-gradient(800px 320px at 100% 0%, ${GLOW[glow]}, transparent 60%), var(--hero-panel-grad)`,
        }}
      />
      <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
        <FiftyMark size={watermark} />
      </div>
      <div className={contentClassName}>{children}</div>
    </Tag>
  );
}
