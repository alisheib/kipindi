import { Trophy, ArrowUpRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn, formatTzs } from "@/lib/utils";
import { tickerEvents, type TickerEvent } from "@/lib/mock-data";

const iconFor = (k: TickerEvent["kind"]) => {
  switch (k) {
    case "PREDICT":  return ArrowUpRight;
    case "RESOLVE":  return Trophy;
    case "DEPOSIT":  return ArrowDownToLine;
    case "WITHDRAW": return ArrowUpFromLine;
  }
};
const tintFor = (k: TickerEvent["kind"]) => {
  switch (k) {
    case "PREDICT":  return "text-teal-300";
    case "RESOLVE":  return "text-gold-300";
    case "DEPOSIT":  return "text-yes-300";
    case "WITHDRAW": return "text-text-muted";
  }
};

function relTime(iso: string): string {
  const sec = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export function LiveTicker() {
  // Duplicate events to make seamless marquee
  const stream = [...tickerEvents, ...tickerEvents];
  return (
    <div className="relative bg-bg-elevated border-b border-border overflow-hidden">
      <div className="absolute inset-y-0 left-0 z-10 w-12 pointer-events-none bg-gradient-to-r from-bg-elevated to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-12 pointer-events-none bg-gradient-to-l from-bg-elevated to-transparent" />
      <div className="flex items-center gap-2 h-9 px-3">
        <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-sm bg-bg-elevated border border-danger-border/40 text-danger-fg text-[10px] font-bold uppercase tracking-[0.14em] shrink-0">
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          Live
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-7 kp-ticker-stream whitespace-nowrap">
            {stream.map((ev, i) => {
              const Icon = iconFor(ev.kind);
              const tint = tintFor(ev.kind);
              return (
                <span key={`${ev.id}-${i}`} className="inline-flex items-center gap-1.5 text-[12px] shrink-0">
                  <Icon size={12} strokeWidth={2} className={cn(tint)} />
                  <span className="text-text-secondary">{ev.text}</span>
                  {ev.amount !== undefined && (
                    <span className={cn("font-mono font-bold tabular-nums", tint)}>{formatTzs(ev.amount)}</span>
                  )}
                  <span className="font-mono text-text-subtle">{relTime(ev.at)}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
