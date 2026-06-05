/**
 * Tooltip — kit/atoms.jsx port. Hover or focus-within shows the popover
 * after a 400ms delay (CSS-driven, see globals.css .kp-tooltip-* rules).
 * Mono font, slate-950 in dark / cream-950 in light, with arrow.
 *
 * Usage:
 *   <Tooltip label="62% YES">
 *     <TippingBar yesPct={62} />
 *   </Tooltip>
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tooltip({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("kp-tooltip", className)} tabIndex={0}>
      <span role="tooltip" className="kp-tooltip-popover">{label}</span>
      {children}
    </span>
  );
}
