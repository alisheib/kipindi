import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ArrowDownToLine, ChevronLeft } from "lucide-react";
import { currentSession } from "@/lib/server/auth-service";
import { depositAction } from "./actions";

export const metadata = { title: "Deposit · Amana" };

const PROVIDERS = [
  { id: "MPESA",        name: "M-Pesa",        color: "#1F7A4D", initials: "MP" },
  { id: "TIGO_PESA",    name: "Tigo Pesa",     color: "#1E5A94", initials: "TG" },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  color: "#C0392B", initials: "AM" },
  { id: "HALO_PESA",    name: "HaloPesa",      color: "#A5650D", initials: "HP" },
  { id: "MIXX",         name: "Mixx by Yas",   color: "#1E3E94", initials: "MX" },
  { id: "CARD",         name: "Card",          color: "#525B70", initials: "CD" },
] as const;

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];

export default async function DepositPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-start justify-center px-3 py-6">
      <Pattern kind="sokoni" opacity={0.03} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-2xl space-y-4">
        <Breadcrumbs items={[{ label: "Wallet", href: "/wallet" }, { label: "Deposit", labelSw: "Amana" }]} />
        <div className="flex items-center gap-2">
          <Link href="/wallet" className="text-text-tertiary hover:text-text transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Deposit · Amana</p>
        </div>
        <h1 className="font-display font-bold text-title-lg text-text">Add funds to your wallet</h1>
        <p className="text-body text-text-secondary -mt-2">Choose a payment method · Chagua njia ya malipo.</p>

        <Card className="border-2 border-border-strong">
          <CardBody className="p-5 lg:p-6 space-y-4">
            <form action={depositAction} className="space-y-4">
              <fieldset>
                <legend className="text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-2">Method · Njia</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROVIDERS.map((p, i) => (
                    <label
                      key={p.id}
                      className="relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-md border border-border bg-surface hover:border-border-strong cursor-pointer transition-colors has-[:checked]:border-gold has-[:checked]:bg-gold-subtle/30"
                    >
                      <input type="radio" name="provider" value={p.id} required defaultChecked={i === 0} className="sr-only peer" />
                      <span className="h-8 w-8 rounded-md inline-flex items-center justify-center text-white font-display font-bold text-caption" style={{ backgroundColor: p.color }}>
                        {p.initials}
                      </span>
                      <span className="text-caption font-bold text-text text-center leading-tight">{p.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="amount" className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">Amount · Kiasi</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 h-12 rounded-l-md bg-bg-sunken border border-r-0 border-border text-text-secondary font-mono text-body-sm font-bold">TZS</span>
                  <input
                    id="amount" name="amount" type="number" required min={500} max={2_000_000} step={500}
                    inputMode="numeric" placeholder="10,000"
                    className="flex-1 h-12 px-3 rounded-r-md bg-surface border border-border text-text font-display font-bold text-title-md tabular focus:outline-none focus:border-gold focus:ring-2 focus:ring-[var(--gold)]/30 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mt-2">
                  {QUICK_AMOUNTS.map((v) => (
                    <button key={v} type="button" data-amount={v}
                      className="quick-amount h-8 rounded-md border border-border-subtle bg-surface text-text-secondary hover:bg-surface-hover hover:text-text text-caption font-bold tabular transition-colors">
                      {v >= 1_000 ? `${v / 1_000}K` : v}
                    </button>
                  ))}
                </div>
                <p className="text-micro text-text-tertiary mt-1.5">Min TZS 500 · Max TZS 2,000,000 per deposit. Your daily limit may apply.</p>
              </div>

              <div>
                <label htmlFor="msisdn" className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">Source phone · Simu (optional)</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 h-11 rounded-l-md bg-bg-sunken border border-r-0 border-border text-text-secondary font-mono text-body-sm">+255</span>
                  <input id="msisdn" name="msisdn" type="tel" inputMode="numeric" placeholder="712 345 678"
                    className="flex-1 h-11 px-3 rounded-r-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-[var(--border-focus)]/40 transition-colors"
                  />
                </div>
                <p className="text-micro text-text-tertiary mt-1.5">Leave blank to use your account number on file.</p>
              </div>

              <Button type="submit" variant="gold" size="xl" fullWidth leading={<ArrowDownToLine size={18} />}>
                Confirm deposit · Thibitisha
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="text-caption text-text-tertiary text-center pt-3">
          <p>Funds typically arrive within 60 seconds. Provider may charge a separate fee.</p>
          <p className="mt-1">Test failure: amount ending in <span className="font-mono text-warning">…13</span> is declined for QA.</p>
        </div>
      </div>
      {/* progressive enhancement: quick-amount buttons fill the input */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener("click", function(e) {
          const t = e.target.closest(".quick-amount");
          if (!t) return;
          const input = document.getElementById("amount");
          if (input) input.value = t.dataset.amount;
        });
      ` }} />
    </div>
  );
}
