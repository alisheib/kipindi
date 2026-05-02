import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { ShieldCheck, Clock, Pause, Lock, AlertTriangle } from "lucide-react";
import { currentSession } from "@/lib/server/auth-service";
import { getRgSettings } from "@/lib/server/responsible-gambling";
import { setLimitsAction, selfExcludeAction, coolOffAction } from "./actions";
import { formatTzs } from "@/lib/utils";

export const metadata = { title: "Responsible gambling · Mchezo salama" };
export const dynamic = "force-dynamic";

const SELF_EXCLUSION_OPTIONS = [
  { id: "24h",  label: "24 hours",   sw: "Saa 24" },
  { id: "1w",   label: "1 week",     sw: "Wiki 1" },
  { id: "1m",   label: "1 month",    sw: "Mwezi 1" },
  { id: "6m",   label: "6 months",   sw: "Miezi 6" },
  { id: "perm", label: "Permanent",  sw: "Daima" },
];

const COOLING_OFF_OPTIONS = [
  { id: "1h",   label: "1 hour",   sw: "Saa 1" },
  { id: "24h",  label: "24 hours", sw: "Saa 24" },
  { id: "1w",   label: "1 week",   sw: "Wiki 1" },
];

export default async function ResponsibleGamblingPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const rg = getRgSettings(session.userId);
  const hasPendingIncrease = rg.pendingIncreaseTo !== null && rg.pendingIncreaseEffectiveAt !== null;

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-start justify-center px-3 py-8">
      <Pattern kind="sokoni" opacity={0.03} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-3xl space-y-5">
        <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "Responsible gambling", labelSw: "Mchezo salama" }]} />
        <header>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-success" />
            <p className="font-mono text-caption uppercase tracking-[0.32em] text-success font-bold">Player protection</p>
          </div>
          <h1 className="font-display font-bold text-title-lg text-text mt-1.5">Responsible gambling · Mchezo salama</h1>
          <p className="text-body text-text-secondary mt-2 max-w-prose">
            Set deposit and time limits, take a break, or self-exclude. We follow the UK Gambling Commission's LCCP standards
            and the Tanzania Gaming Board's player-protection guidance.
            <br /><span className="italic">Weka mipaka ya amana na muda, pumzika, au jizuie kabisa.</span>
          </p>
        </header>

        {/* DEPOSIT + TIME LIMITS */}
        <Card className="border-2 border-border-strong">
          <CardBody className="p-5 lg:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-royal" />
              <h2 className="font-display font-bold text-title-sm text-text">Deposit &amp; session limits</h2>
            </div>
            <p className="text-caption text-text-secondary">
              Decreases take effect immediately. Increases to your daily deposit limit are deferred 24 hours
              (LCCP SR 3.4.3). Leave any field blank to remove that limit.
            </p>
            {hasPendingIncrease && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-warning-bg/30 border border-warning-border">
                <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                <div className="text-caption">
                  <p className="font-bold text-text">Pending increase to {formatTzs(rg.pendingIncreaseTo!)}</p>
                  <p className="text-text-secondary">Effective {new Date(rg.pendingIncreaseEffectiveAt!).toLocaleString("en-GB")} (24h cooling period).</p>
                </div>
              </div>
            )}
            <form action={setLimitsAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field name="dailyDepositLimit"   label="Daily deposit (TZS)"   defaultValue={rg.dailyDepositLimit}   placeholder="e.g. 50000" />
              <Field name="weeklyDepositLimit"  label="Weekly deposit (TZS)"  defaultValue={rg.weeklyDepositLimit}  placeholder="e.g. 200000" />
              <Field name="monthlyDepositLimit" label="Monthly deposit (TZS)" defaultValue={rg.monthlyDepositLimit} placeholder="e.g. 500000" />
              <Field name="dailyLossLimit"      label="Daily loss (TZS)"      defaultValue={rg.dailyLossLimit}      placeholder="e.g. 30000" />
              <Field name="sessionTimeLimitMin" label="Session time (minutes)" defaultValue={rg.sessionTimeLimitMin} placeholder="e.g. 60" />
              <Field name="realityCheckIntervalMin" label="Reality check (minutes)" defaultValue={rg.realityCheckIntervalMin} placeholder="30" />
              <div className="sm:col-span-2 pt-2">
                <Button type="submit" variant="primary" size="lg">Save limits · Hifadhi</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* COOLING-OFF */}
        <Card className="border-2 border-border-strong">
          <CardBody className="p-5 lg:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Pause size={18} className="text-info" />
              <h2 className="font-display font-bold text-title-sm text-text">Take a break · Pumzika</h2>
            </div>
            <p className="text-caption text-text-secondary">
              A short, one-way pause. You will be signed out and cannot bet, deposit, or sign in until it ends.
            </p>
            <form action={coolOffAction} className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="block text-caption uppercase tracking-[0.14em] font-bold text-text-secondary mb-1.5">Break length</span>
                <select name="period" aria-label="Cooling-off period" title="Cooling-off period" className="h-10 px-3 rounded-md border border-border bg-surface text-text text-body-sm">
                  {COOLING_OFF_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label} · {o.sw}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="secondary" size="lg" leading={<Pause size={14} />}>Start break</Button>
            </form>
          </CardBody>
        </Card>

        {/* SELF-EXCLUSION */}
        <Card className="border-2 border-danger/40 bg-danger-bg/10">
          <CardBody className="p-5 lg:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-danger" />
              <h2 className="font-display font-bold text-title-sm text-text">Self-exclude · Jizuie</h2>
              <Chip size="sm" variant="danger">One-way</Chip>
            </div>
            <p className="text-caption text-text-secondary max-w-prose">
              Self-exclusion <strong>cannot be reversed by you</strong> until the period ends. Your account is frozen,
              your wallet is locked, and we will not contact you with marketing. Permanent self-exclusion is final and
              requires a documented review process to reopen.
              <br /><span className="italic">Hutaweza kufuta hii mwenyewe hadi muda umeisha.</span>
            </p>
            <form action={selfExcludeAction} className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="block text-caption uppercase tracking-[0.14em] font-bold text-text-secondary mb-1.5">Exclusion period</span>
                <select name="period" aria-label="Self-exclusion period" title="Self-exclusion period" className="h-10 px-3 rounded-md border border-border bg-surface text-text text-body-sm">
                  {SELF_EXCLUSION_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label} · {o.sw}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="danger" size="lg" leading={<Lock size={14} />}>Self-exclude · Jizuie</Button>
            </form>
            <p className="text-micro text-text-tertiary pt-2">
              Need help now? Tanzania Helpline · <span className="font-mono">+255 22 211 5811</span>. International support at <span className="font-mono">begambleaware.org</span>.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Field({
  name, label, defaultValue, placeholder,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-caption uppercase tracking-[0.14em] font-bold text-text-secondary mb-1.5">{label}</span>
      <input
        name={name}
        type="number"
        min={0}
        step={1000}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm tabular focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-[var(--border-focus)]/40 transition-colors"
      />
    </label>
  );
}
