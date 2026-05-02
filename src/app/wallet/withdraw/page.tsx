import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ArrowUpFromLine, ChevronLeft, ShieldCheck } from "lucide-react";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { withdrawAction } from "./actions";

export const metadata = { title: "Withdraw · Toa" };

const PROVIDERS = [
  { id: "MPESA",        name: "M-Pesa",        color: "#1F7A4D", initials: "MP" },
  { id: "TIGO_PESA",    name: "Tigo Pesa",     color: "#1E5A94", initials: "TG" },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  color: "#C0392B", initials: "AM" },
  { id: "HALO_PESA",    name: "HaloPesa",      color: "#A5650D", initials: "HP" },
  { id: "MIXX",         name: "Mixx by Yas",   color: "#1E3E94", initials: "MX" },
  { id: "BANK_TRANSFER",name: "Bank transfer", color: "#525B70", initials: "BK" },
] as const;

export default async function WithdrawPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const wallet = db.wallet.findByUserId(session.userId);
  const kyc = db.kyc.findByUserId(session.userId);
  const kycApproved = kyc?.status === "APPROVED";

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-start justify-center px-3 py-6">
      <Pattern kind="sokoni" opacity={0.03} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-2xl space-y-4">
        <Breadcrumbs items={[{ label: "Wallet", href: "/wallet" }, { label: "Withdraw", labelSw: "Toa" }]} />
        <div className="flex items-center gap-2">
          <Link href="/wallet" aria-label="Back to wallet" className="text-text-tertiary hover:text-text transition-colors">
            <ChevronLeft size={18} aria-hidden />
          </Link>
          <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Withdraw · Toa</p>
        </div>
        <h1 className="font-display font-bold text-title-lg text-text">Move funds to mobile money or bank</h1>

        {!kycApproved && (
          <Card className="border-2 border-warning-border bg-warning-bg/30">
            <CardBody className="flex items-start gap-2 p-4">
              <ShieldCheck size={18} className="text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-display font-bold text-body text-text">Verify your identity first</p>
                <p className="text-body-sm text-text-secondary mt-0.5">Tanzania Gaming Act requires NIDA verification before any withdrawal.</p>
                <Link href="/profile/kyc" className="inline-block mt-2 text-label font-bold text-royal hover:text-royal-hover transition-colors">
                  Continue KYC →
                </Link>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className={`border-2 ${kycApproved ? "border-border-strong" : "border-border-subtle opacity-60"}`}>
          <CardBody className="p-5 lg:p-6 space-y-4">
            <div className="flex items-end justify-between gap-2 pb-2 border-b border-border-divider">
              <div>
                <p className="text-caption uppercase tracking-[0.16em] text-text-tertiary font-bold">Available balance</p>
                <p className="font-display font-bold text-title-md tabular text-text">
                  <span className="text-gold">TZS </span>{(wallet?.balance ?? 0).toLocaleString()}
                </p>
              </div>
              {(wallet?.hold ?? 0) > 0 && (
                <div className="text-right">
                  <p className="text-caption uppercase tracking-[0.16em] text-text-tertiary font-bold">On hold</p>
                  <p className="font-display font-bold text-body tabular text-warning">TZS {(wallet?.hold ?? 0).toLocaleString()}</p>
                </div>
              )}
            </div>

            <form action={withdrawAction} className="space-y-4">
              <fieldset disabled={!kycApproved}>
                <legend className="text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-2">Destination · Mahali</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROVIDERS.map((p, i) => (
                    <label key={p.id}
                      className="relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-md border border-border bg-surface hover:border-border-strong cursor-pointer transition-colors has-[:checked]:border-gold has-[:checked]:bg-gold-subtle/30">
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
                  <input id="amount" name="amount" type="number" required min={1_000} max={5_000_000} step={500}
                    inputMode="numeric" placeholder="10,000" disabled={!kycApproved}
                    className="flex-1 h-12 px-3 rounded-r-md bg-surface border border-border text-text font-display font-bold text-title-md tabular focus:outline-none focus:border-gold focus:ring-2 focus:ring-[var(--gold)]/30 transition-colors disabled:opacity-50"
                  />
                </div>
                <p className="text-micro text-text-tertiary mt-1.5">Withdrawals ≥ <span className="font-mono">TZS 1,000,000</span> trigger AML review (typically 2 hours).</p>
              </div>

              <div>
                <label htmlFor="msisdn" className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">Destination phone · Simu</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 h-11 rounded-l-md bg-bg-sunken border border-r-0 border-border text-text-secondary font-mono text-body-sm">+255</span>
                  <input id="msisdn" name="msisdn" type="tel" inputMode="numeric" placeholder="712 345 678" disabled={!kycApproved}
                    className="flex-1 h-11 px-3 rounded-r-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-[var(--border-focus)]/40 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="otpCode" className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">Confirmation code · Msimbo</label>
                <input id="otpCode" name="otpCode" type="text" required pattern="\d{6}" maxLength={6} inputMode="numeric"
                  placeholder="6-digit code from SMS" defaultValue="000000" disabled={!kycApproved}
                  className="w-full h-11 px-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm tracking-[0.4em] focus:outline-none focus:border-gold focus:ring-2 focus:ring-[var(--gold)]/30 transition-colors disabled:opacity-50"
                />
                <p className="text-micro text-text-tertiary mt-1.5">For dev: any 6-digit code is accepted.</p>
              </div>

              <div className="rounded-md border border-warning-border bg-warning-bg/20 p-3 text-body-sm text-text-secondary">
                <p className="font-bold text-warning">Tax notice</p>
                <p className="mt-1">Tanzania withholds a tax on declared winnings at withdrawal per the Income Tax Act (Cap 332). The amount you receive is net of tax — your withdrawal screen shows the exact amounts.</p>
              </div>

              <Button type="submit" variant="primary" size="xl" fullWidth disabled={!kycApproved} leading={<ArrowUpFromLine size={18} />}>
                Confirm withdrawal · Thibitisha
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
