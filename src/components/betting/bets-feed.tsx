import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { cn, formatTzs } from "@/lib/utils";
import type { RecentBet } from "@/lib/mock-data";

export function BetsFeed({ bets, title = "Recent activity", className }: { bets: RecentBet[]; title?: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface/80", className)}>
      <div className="flex items-center justify-between px-3 h-10 border-b border-border-divider">
        <div className="flex items-center gap-2">
          <span aria-hidden className="relative inline-flex items-center justify-center">
            <span className="absolute h-2 w-2 rounded-pill bg-success kp-ping" />
            <span className="h-1.5 w-1.5 rounded-pill bg-success" />
          </span>
          <p className="font-display text-label font-bold uppercase tracking-wider text-text">{title}</p>
        </div>
        <span className="text-micro text-text-tertiary uppercase tracking-wider">Last hour</span>
      </div>
      <div className="divide-y divide-border-subtle">
        {bets.map((b) => (
          <div key={b.id} className="flex items-center gap-2 px-3 py-2">
            <Avatar initials={b.initials} size="sm" color={hashColor(b.user)} />
            <div className="flex-1 min-w-0">
              <p className="text-label font-semibold text-text truncate leading-tight">{b.user} <span className="text-text-tertiary font-normal">· {b.region}</span></p>
              <p className="text-micro text-text-tertiary tabular leading-tight mt-0.5">
                <Chip variant="brand" size="sm" className="mr-1">{b.windowLabel}</Chip>
                {b.outcome === "home" ? "Home" : b.outcome === "away" ? "Away" : "Draw"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-label font-bold tabular text-gold leading-tight">{formatTzs(b.stake)}</p>
              <p className="text-micro text-text-tertiary tabular leading-tight">{b.at}s ago</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tiny, deterministic color from a string — used for avatar tinting.
function hashColor(str: string): string {
  const palette = ["#1E3E94", "#1F7A4D", "#A5650D", "#C0392B", "#1E5A94", "#705210", "#525B70", "#0E7490"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}
