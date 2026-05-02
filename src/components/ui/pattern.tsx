import { cn } from "@/lib/utils";

type PatternKind = "mwangaza" | "sokoni" | "mfumo";

const TILE_SIZE: Record<PatternKind, number> = {
  mwangaza: 96,
  sokoni: 128,
  mfumo: 64,
};

/**
 * Brand pattern overlay — Maasai/Kente structurally inspired (NEVER literal).
 * Drop on a relative-positioned parent. Spec §2.1 calls these patterns
 * Mwangaza (light bars), Sokoni (diamond grid), Mfumo (interlocking weave).
 */
export function Pattern({
  kind = "sokoni",
  opacity = 0.06,
  color = "currentColor",
  className,
}: {
  kind?: PatternKind;
  opacity?: number;
  color?: string;
  className?: string;
}) {
  const tile = TILE_SIZE[kind];
  return (
    <svg
      className={cn("absolute inset-0 w-full h-full pointer-events-none", className)}
      aria-hidden
      style={{ opacity }}
    >
      <defs>
        <pattern id={`kp-pat-${kind}`} x={0} y={0} width={tile} height={tile} patternUnits="userSpaceOnUse">
          {kind === "mwangaza" && (
            <g fill={color}>
              <rect x={0}   y={0} width={2}  height={tile} />
              <rect x={10}  y={0} width={4}  height={tile} />
              <rect x={26}  y={0} width={2}  height={tile} />
              <rect x={42}  y={0} width={8}  height={tile} />
              <rect x={62}  y={0} width={2}  height={tile} />
              <rect x={72}  y={0} width={4}  height={tile} />
              <rect x={86}  y={0} width={2}  height={tile} />
            </g>
          )}
          {kind === "sokoni" && (
            <g fill="none" stroke={color} strokeWidth={1}>
              <path d="M64 14 L114 64 L64 114 L14 64 Z" />
              <path d="M64 44 L84 64 L64 84 L44 64 Z" />
              <circle cx={64} cy={64} r={1.5} fill={color} stroke="none" />
              <circle cx={0}   cy={0}   r={1.5} fill={color} stroke="none" />
              <circle cx={128} cy={0}   r={1.5} fill={color} stroke="none" />
              <circle cx={0}   cy={128} r={1.5} fill={color} stroke="none" />
              <circle cx={128} cy={128} r={1.5} fill={color} stroke="none" />
            </g>
          )}
          {kind === "mfumo" && (
            <g fill={color}>
              <rect x={0}  y={0}  width={28} height={3} />
              <rect x={36} y={32} width={28} height={3} />
              <rect x={0}  y={32} width={3}  height={28} />
              <rect x={61} y={0}  width={3}  height={28} />
            </g>
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#kp-pat-${kind})`} />
    </svg>
  );
}
