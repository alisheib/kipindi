"use client";

import { cn, formatTzsCompact } from "@/lib/utils";
import type { MapigoCall } from "@/lib/mapigo-data";

const callStyle = {
  SPIKE: { tint: "from-danger/12 to-transparent",  glow: "shadow-[0_0_24px_rgba(248,113,113,0.18)]", text: "text-danger",  border: "border-danger/40",   icon: "▲", labelEn: "Spike", labelSw: "Mwiba",   hintEn: "Big peak in next 60s",  hintSw: "Mwiba mkubwa" },
  DRIFT: { tint: "from-gold/14 to-transparent",    glow: "shadow-[0_0_24px_rgba(222,188,84,0.22)]", text: "text-gold",    border: "border-gold-subtleHover/50",   icon: "∿", labelEn: "Drift", labelSw: "Tetemeka", hintEn: "Gentle rise or fall",   hintSw: "Kupanda taratibu" },
  CALM:  { tint: "from-info/12 to-transparent",    glow: "shadow-[0_0_24px_rgba(126,151,216,0.18)]", text: "text-info",    border: "border-info/40",   icon: "—", labelEn: "Calm",  labelSw: "Tulivu",   hintEn: "No notable events",     hintSw: "Hakuna matukio" },
} as const;

export function PredictionTray({
  selected,
  onSelect,
  poolByCall,
  payRate,
  disabled,
  className,
}: {
  selected: MapigoCall | null;
  onSelect: (c: MapigoCall) => void;
  poolByCall: Record<MapigoCall, number>;
  payRate: Record<MapigoCall, number>;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-2", className)}>
      {(Object.keys(callStyle) as MapigoCall[]).map((call) => {
        const s = callStyle[call];
        const isSel = selected === call;
        return (
          <button
            key={call}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(call)}
            aria-pressed={isSel ? "true" : "false"}
            className={cn(
              "group relative flex flex-col items-start gap-1 px-3 py-3 rounded-lg border bg-surface/60 backdrop-blur-sm transition-all duration-medium ease-standard text-left overflow-hidden",
              isSel ? `${s.border} ${s.glow}` : "border-border-subtle hover:border-border-strong",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <span aria-hidden className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-80 transition-opacity duration-medium", s.tint)} />
            <div className="relative z-10 flex items-center justify-between w-full">
              <span className={cn("font-mono text-title-sm leading-none", s.text)}>{s.icon}</span>
              <span className={cn("text-micro font-bold uppercase tracking-[0.16em]", s.text)}>×{payRate[call].toFixed(2)}</span>
            </div>
            <div className="relative z-10 mt-1.5">
              <p className={cn("font-display font-bold text-body leading-none", s.text)}>{s.labelEn}</p>
              <p className="text-micro text-text-tertiary tracking-wide mt-0.5 truncate">{s.labelSw} · {s.hintEn}</p>
            </div>
            <div className="relative z-10 flex items-center justify-between w-full pt-1.5 border-t border-border-subtle/60 mt-1.5">
              <span className="text-micro text-text-tertiary uppercase tracking-wide">Pool</span>
              <span className="text-caption font-bold tabular text-text">{formatTzsCompact(poolByCall[call])}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
