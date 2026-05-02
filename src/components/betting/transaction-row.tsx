import { ArrowDownToLine, ArrowUpFromLine, CircleArrowRight, Trophy, Undo2 } from "lucide-react";
import { cn, formatTzs } from "@/lib/utils";
import type { Transaction } from "@/lib/mock-data";

const iconMap = {
  deposit: ArrowDownToLine,
  withdraw: ArrowUpFromLine,
  bet: CircleArrowRight,
  payout: Trophy,
  refund: Undo2,
};

const iconBg = {
  deposit:  "bg-bg-sunken text-text-secondary",
  withdraw: "bg-bg-sunken text-text-secondary",
  bet:      "bg-bg-sunken text-royal",
  payout:   "bg-bg-sunken text-gold",
  refund:   "bg-bg-sunken text-text-secondary",
} as const;

const statusLabel = {
  confirmed: { dot: "bg-gold",     text: "text-text-tertiary", label: "Confirmed · Imethibitishwa" },
  pending:   { dot: "bg-royal",    text: "text-text-tertiary", label: "Pending · Inasubiri" },
  review:    { dot: "bg-warning",  text: "text-warning",       label: "AML review · Inakaguliwa" },
  failed:    { dot: "bg-danger",   text: "text-danger",        label: "Failed · Imeshindwa" },
} as const;

export function TransactionRow({ tx }: { tx: Transaction }) {
  const Icon = iconMap[tx.type];
  const isCredit = tx.amount > 0;
  const status = statusLabel[tx.status];
  return (
    <div className="flex items-center gap-3 py-2.5 px-2 hover:bg-surface-hover rounded-md transition-colors duration-micro">
      <div className={cn("h-10 w-10 rounded-md inline-flex items-center justify-center shrink-0 border border-border-subtle", iconBg[tx.type])}>
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-text truncate leading-tight">{tx.description}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-pill shrink-0", status.dot)} />
          <span className={cn("text-caption tabular leading-tight", status.text)}>{status.label}</span>
          <span className="text-caption text-text-tertiary leading-tight">·</span>
          <span className="text-caption text-text-tertiary tabular leading-tight">
            {new Date(tx.at).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="text-caption text-text-tertiary leading-tight">·</span>
          <span className="text-caption text-text-tertiary tabular font-mono leading-tight">{tx.ref}</span>
        </div>
      </div>
      <div className="text-right">
        <p className={cn("text-body font-bold tabular leading-tight", isCredit ? "text-gold" : "text-text")}>
          {isCredit ? "+" : ""}{formatTzs(tx.amount)}
        </p>
      </div>
    </div>
  );
}
