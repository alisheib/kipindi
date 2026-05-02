import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const rows = [
  { rank: 1, initials: "MJ", name: "Mwita J.",  roi: 62.1, color: "#1E3E94" },
  { rank: 2, initials: "AM", name: "Asha M.",   roi: 48.4, color: "#1F7A4D" },
  { rank: 3, initials: "HK", name: "Hassan K.", roi: 41.7, color: "#A5650D" },
  { rank: 4, initials: "AS", name: "You",       roi: 18.3, color: "#1E3E94", isYou: true },
  { rank: 5, initials: "NB", name: "Neema B.",  roi: 14.0, color: "#C0392B" },
];

export function MapigoLeaderboardMini({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface/80 overflow-hidden", className)}>
      <div className="flex items-center justify-between h-10 px-3 border-b border-border-divider">
        <p className="font-display text-label font-bold uppercase tracking-[0.16em] text-text">Top this session</p>
        <p className="text-micro text-text-tertiary uppercase tracking-[0.14em]">By ROI</p>
      </div>
      <div className="divide-y divide-border-subtle">
        {rows.map((r) => (
          <div key={r.rank} className={cn(
            "flex items-center gap-2.5 px-3 py-2",
            r.isYou && "bg-royal-subtle/60",
          )}>
            <span className={cn(
              "font-mono font-bold text-label tabular w-5",
              r.rank <= 3 ? "text-gold" : "text-text-tertiary",
            )}>{r.rank}</span>
            <Avatar initials={r.initials} size="sm" color={r.color} />
            <span className="text-label font-semibold text-text truncate flex-1">{r.name}{r.isYou && <span className="text-caption text-royal font-medium ml-1">· you</span>}</span>
            <span className="text-label font-bold tabular text-gold shrink-0">+{r.roi}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
