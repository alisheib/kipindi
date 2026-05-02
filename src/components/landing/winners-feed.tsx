import { Avatar } from "@/components/ui/avatar";
import { cn, formatTzs } from "@/lib/utils";

const winners = [
  { user: "Mwita J.",  initials: "MJ", region: "Dar",     amount: 8_900,  detail: "FT · Yanga Win",       at: "12s",  color: "#1F7A4D" },
  { user: "Asha M.",   initials: "AM", region: "Mwanza",  amount: 4_700,  detail: "15–30 · Simba Win",   at: "34s",  color: "#C0392B" },
  { user: "Hassan K.", initials: "HK", region: "Arusha",  amount: 3_400,  detail: "0–15 · Coastal Draw", at: "1m",   color: "#705210" },
  { user: "Neema B.",  initials: "NB", region: "Dar",     amount: 2_300,  detail: "Mapigo · SPIKE",      at: "2m",   color: "#1E3E94" },
  { user: "Salim D.",  initials: "SD", region: "Tanga",   amount: 1_800,  detail: "30–45 · Azam Win",    at: "3m",   color: "#1E5A94" },
  { user: "Grace O.",  initials: "GO", region: "Dodoma",  amount: 1_400,  detail: "Mapigo · DRIFT",      at: "4m",   color: "#1F7A4D" },
];

export function WinnersFeed({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface/70 backdrop-blur-md overflow-hidden flex flex-col", className)}>
      <div className="flex items-center justify-between h-9 px-3 border-b border-border-divider">
        <div className="flex items-center gap-2">
          <span aria-hidden className="relative inline-flex">
            <span className="absolute h-2 w-2 rounded-pill bg-gold kp-ping" />
            <span className="h-1.5 w-1.5 rounded-pill bg-gold" />
          </span>
          <p className="font-display text-caption font-bold uppercase tracking-[0.16em] text-text">Winners · Washindi</p>
        </div>
        <p className="text-micro text-text-tertiary uppercase tracking-[0.14em] tabular">Last hour</p>
      </div>
      <div className="divide-y divide-border-subtle">
        {winners.map((w, i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-2">
            <Avatar initials={w.initials} size="sm" color={w.color} />
            <div className="flex-1 min-w-0">
              <p className="text-label font-bold text-text truncate leading-tight">{w.user} <span className="text-text-tertiary font-normal">· {w.region}</span></p>
              <p className="text-micro text-text-tertiary truncate leading-tight mt-0.5">{w.detail}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-label font-bold tabular text-gold leading-tight">+{formatTzs(w.amount)}</p>
              <p className="text-micro text-text-tertiary tabular leading-tight font-mono">{w.at}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
