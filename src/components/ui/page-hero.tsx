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
 */
type Glow = "gold" | "info" | "yes" | "rose";

const GLOW: Record<Glow, string> = {
  gold: "oklch(58% 0.13 80 / 0.18)",
  info: "oklch(45% 0.10 240 / 0.18)",
  yes: "oklch(45% 0.10 152 / 0.18)",
  rose: "oklch(45% 0.13 22 / 0.18)",
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
