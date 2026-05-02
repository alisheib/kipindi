import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { LeaderRow } from "@/lib/mock-data";

export function LeaderboardRow({ row, isYou }: { row: LeaderRow; isYou?: boolean }) {
  const top3 = row.rank <= 3;
  return (
    <div className={cn(
      "flex items-center gap-3 py-2.5 px-2 rounded-md transition-colors duration-micro",
      isYou ? "bg-royal-subtle border border-royal/30" : "hover:bg-surface-hover",
    )}>
      <span
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-pill font-display font-bold tabular text-label shrink-0",
          top3 ? "text-gold-fg" : "bg-bg-sunken/70 text-text-tertiary",
        )}
        style={top3 ? { background: "var(--g-gold)", boxShadow: "var(--glow-gold)" } : undefined}
      >
        {row.rank}
      </span>
      <Avatar initials={row.initials} size="md" color={isYou ? "var(--royal)" : "var(--bg-sunken)"} />
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-text truncate leading-tight">
          {row.name}
          {isYou && <span className="ml-1.5 text-caption text-royal font-medium">· you</span>}
        </p>
        <p className="text-caption text-text-tertiary leading-tight">{row.region}</p>
      </div>
      <div className="text-right hidden sm:block">
        <p className="text-micro text-text-tertiary uppercase tracking-wide">Win rate</p>
        <p className="text-label font-semibold tabular text-text">{row.winRate}%</p>
      </div>
      <div className="text-right">
        <p className="text-micro text-text-tertiary uppercase tracking-wide">ROI</p>
        <p className="text-label font-bold tabular text-gold">+{row.roi}%</p>
      </div>
      {row.streak > 0 && (
        <span className="hidden sm:inline-flex items-center gap-1 h-6 px-2 rounded-sm bg-gold-subtle/40 text-gold border border-gold-subtleHover/30 text-micro font-bold tabular tracking-[0.14em] uppercase">
          ×{row.streak} <span className="opacity-70 font-normal">streak</span>
        </span>
      )}
    </div>
  );
}
