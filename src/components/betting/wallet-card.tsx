import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pattern } from "@/components/ui/pattern";
import { CountUp } from "@/components/ui/count-up";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatTzs } from "@/lib/utils";

export function WalletCard({ balance, pending, hold }: { balance: number; pending: number; hold: number; currency?: string }) {
  return (
    <div className="relative rounded-2xl bg-g-brand text-white overflow-hidden">
      <Pattern kind="sokoni" opacity={0.05} color="#FFFFFF" />
      <div
        aria-hidden
        className="hidden lg:block absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(222,188,84,0.35) 0%, rgba(222,188,84,0) 70%)" }}
      />
      <div className="relative z-10 p-5 lg:p-6 space-y-4 lg:space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-caption uppercase tracking-[0.18em] opacity-80 font-medium text-white">Available · Salio</p>
            <p
              className="font-display font-bold text-display-3 sm:text-display-2 lg:text-display-1 tabular leading-none mt-1.5 break-words"
              data-testid="wallet-balance"
              data-balance={balance}
            >
              <span className="text-gold">TZS </span>
              <span className="text-white">
                <CountUp value={balance} format="number" durationMs={1300} />
              </span>
            </p>
            <p className="text-caption opacity-70 tabular mt-1 text-white">Tanzania Shilling · Dar es Salaam</p>
          </div>
          <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2 lg:shrink-0">
            <Link href="/wallet/deposit">
              <Button variant="gold" size="lg" leading={<ArrowDownToLine size={16} />} fullWidth>Deposit</Button>
            </Link>
            <Link href="/wallet/withdraw">
              <Button
                size="lg"
                leading={<ArrowUpFromLine size={16} />}
                className="bg-white/10 border border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                fullWidth
              >
                Withdraw
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/25">
          <div>
            <p className="text-caption uppercase tracking-[0.14em] text-white/85 font-semibold">Pending · Inasubiri</p>
            <p className="text-body-lg font-bold tabular mt-0.5 text-white">{formatTzs(pending)}</p>
          </div>
          <div>
            <p className="text-caption uppercase tracking-[0.14em] text-white/85 font-semibold">On hold · Imeshikwa</p>
            <p className="text-body-lg font-bold tabular mt-0.5 text-white">{formatTzs(hold)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
