"use client";

import { cn, formatTzsCompact } from "@/lib/utils";
import type { Outcome } from "@/lib/mock-data";

export function OddsCard({
  homeName,
  awayName,
  windowPool,
  payRate,
  selected,
  onSelect,
}: {
  homeName: string;
  awayName: string;
  windowPool: number;
  payRate: number;
  selected: Outcome | null;
  onSelect: (o: Outcome) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <Btn label={homeName} sub="Home win · Mwenyeji" rate={payRate * 0.95} pool={windowPool * 0.45} active={selected === "home"} onClick={() => onSelect("home")} />
      <Btn label="Draw"     sub="Sare"                  rate={payRate * 1.10} pool={windowPool * 0.20} active={selected === "draw"} onClick={() => onSelect("draw")} />
      <Btn label={awayName} sub="Away win · Mgeni"      rate={payRate * 1.05} pool={windowPool * 0.35} active={selected === "away"} onClick={() => onSelect("away")} />
    </div>
  );
}

function Btn({ label, sub, rate, pool, active, onClick }: { label: string; sub: string; rate: number; pool: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border bg-surface text-left transition-all duration-micro ease-standard",
        active ? "border-gold shadow-glow-gold" : "border-border-subtle hover:bg-surface-hover hover:border-border-strong",
      )}
    >
      <span className="text-label font-semibold text-text truncate w-full">{label}</span>
      <span className="text-micro text-text-tertiary truncate w-full">{sub}</span>
      <span className="text-caption text-text-secondary tabular pt-1">×{rate.toFixed(2)}</span>
      <span className="text-micro text-text-tertiary tabular">Pool {formatTzsCompact(pool)}</span>
    </button>
  );
}
