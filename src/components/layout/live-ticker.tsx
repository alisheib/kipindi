import { Trophy, Coins, UserPlus, ChevronsUp, Crown } from "lucide-react";
import { cn, formatTzs } from "@/lib/utils";
import { tickerEvents, type TickerEvent } from "@/lib/mock-data";

const iconFor = (t: TickerEvent["type"]) => {
  switch (t) {
    case "win":     return Trophy;
    case "deposit": return Coins;
    case "join":    return UserPlus;
    case "streak":  return ChevronsUp;
    case "jackpot": return Crown;
  }
};
const tintFor = (t: TickerEvent["type"]) => {
  switch (t) {
    case "win":     return "text-gold";
    case "deposit": return "text-royal";
    case "join":    return "text-text-tertiary";
    case "streak":  return "text-gold";
    case "jackpot": return "text-gold";
  }
};

export function LiveTicker() {
  // Duplicate events to make seamless marquee
  const stream = [...tickerEvents, ...tickerEvents];
  return (
    <div className="relative bg-bg-elevated border-b border-border-divider overflow-hidden">
      <div className="absolute inset-y-0 left-0 z-10 w-12 pointer-events-none bg-gradient-to-r from-bg-elevated to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-12 pointer-events-none bg-gradient-to-l from-bg-elevated to-transparent" />
      <div className="flex items-center gap-2 h-9 px-3">
        <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-sm bg-bg-elevated border border-gold-subtleHover/40 text-gold text-micro font-bold uppercase tracking-[0.14em] shrink-0">
          <span aria-hidden className="relative inline-flex">
            <span className="absolute h-2 w-2 rounded-pill bg-gold kp-ping" />
            <span className="h-1.5 w-1.5 rounded-pill bg-gold" />
          </span>
          Live
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-7 kp-ticker-stream whitespace-nowrap">
            {stream.map((ev, i) => {
              const Icon = iconFor(ev.type);
              const tint = tintFor(ev.type);
              return (
                <span key={`${ev.id}-${i}`} className="inline-flex items-center gap-1.5 text-caption shrink-0">
                  <Icon size={12} strokeWidth={2} className={cn(tint)} />
                  <span className="font-semibold text-text">{ev.user}</span>
                  <span className="text-text-tertiary">·</span>
                  <span className="text-text-secondary">{ev.detail}</span>
                  {ev.amount && (
                    <span className={cn("font-bold tabular", tint)}>{formatTzs(ev.amount)}</span>
                  )}
                  <span className="text-text-tertiary tabular">{ev.at}s</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
