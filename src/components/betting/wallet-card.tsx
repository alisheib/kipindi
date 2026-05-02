import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pattern } from "@/components/ui/pattern";
import { CountUp } from "@/components/ui/count-up";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatTzs } from "@/lib/utils";

export function WalletCard({ balance, pending, hold }: { balance: number; pending: number; hold: number; currency?: string }) {
  return (
    <div className="relative rounded-2xl bg-g-brand text-onBrand overflow-hidden">
      <Pattern kind="sokoni" opacity={0.05} color="#FFFFFF" />
      <div
        aria-hidden
        className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(222,188,84,0.35) 0%, rgba(222,188,84,0) 70%)" }}
      />
      <div className="relative z-10 p-5 lg:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-caption uppercase tracking-[0.18em] opacity-80 font-medium">Available · Salio</p>
            <p className="font-display font-bold text-display-2 lg:text-display-1 tabular leading-none mt-1" data-testid="wallet-balance" data-balance={balance}>
              <span className="text-gold">TZS </span>
              <CountUp value={balance} format="number" durationMs={1300} />
            </p>
            <p className="text-caption opacity-70 tabular mt-1">Tanzania Shilling · Dar es Salaam</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link href="/wallet/deposit">
              <Button variant="gold" size="lg" leading={<ArrowDownToLine size={16} />} fullWidth>Deposit</Button>
            </Link>
            <Link href="/wallet/withdraw">
              <Button
                size="lg"
                leading={<ArrowUpFromLine size={16} />}
                className="bg-white/10 border border-white/20 text-onBrand hover:bg-white/20 backdrop-blur-sm"
                fullWidth
              >
                Withdraw
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/15">
          <div>
            <p className="text-caption uppercase tracking-[0.14em] opacity-70">Pending · Inasubiri</p>
            <p className="text-body-lg font-bold tabular mt-0.5">{formatTzs(pending)}</p>
          </div>
          <div>
            <p className="text-caption uppercase tracking-[0.14em] opacity-70">On hold · Imeshikwa</p>
            <p className="text-body-lg font-bold tabular mt-0.5">{formatTzs(hold)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
