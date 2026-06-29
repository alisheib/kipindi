import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input, Field as KitField } from "@/components/ui/input";
import { Cash } from "@/components/ui/cash";
import { WithdrawConfirm } from "./withdraw-confirm";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { withdrawAction } from "./actions";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.wallet.withdrawTitle };
}

const PROVIDERS = [
  { id: "MPESA",        name: "M-Pesa",        hue: 152 },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  hue: 22 },
  { id: "HALO_PESA",    name: "HaloPesa",      hue: 80 },
  { id: "MIXX",         name: "Mixx by Yas",   hue: 280 },
  { id: "BANK_TRANSFER",name: "Bank transfer", hue: 200 },
] as const;

export default async function WithdrawPage({ searchParams }: { searchParams: Promise<{ error?: string; provider?: string; amount?: string; msisdn?: string }> }) {
  const { t } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/wallet/withdraw");

  const sp = await searchParams;
  const errorMsg = sp.error ? decodeURIComponent(sp.error) : null;
  // Restore form values on error redirect so the player doesn't re-enter everything
  const prevProvider = sp.provider ?? "";
  const prevAmount = sp.amount ?? "";
  const prevMsisdn = sp.msisdn ?? "";

  const wallet = await db.wallet.findByUserId(session.userId);
  const kyc = await db.kyc.findByUserId(session.userId);
  const kycApproved = kyc?.status === "APPROVED";

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <I.chevronLeft s={14} />
        {t.wallet.title}
      </Link>

      <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 0% 100%, oklch(45% 0.13 22 / 0.18), transparent 60%), " +
              "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={180} />
        </div>
        <div className="relative z-10 p-5 lg:p-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
              {t.wallet.withdrawTitle}
            </p>
            <h1 className="mt-1 font-display text-[24px] lg:text-[26px] font-bold text-text leading-tight tracking-[-0.02em]">
              {t.wallet.moveFundsOut}
            </h1>
            <p className="mt-1 text-[13px] italic text-text-subtle">{t.wallet.mobileMoney}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{t.wallet.available}</p>
            <Cash className="font-display font-bold text-[22px] tabular-nums text-text leading-none block">
              {`TZS ${(wallet?.balance ?? 0).toLocaleString()}`}
            </Cash>
            {(wallet?.hold ?? 0) > 0 && (
              <Cash className="mt-1 font-mono text-[10.5px] tabular-nums text-warning-fg block">
                {`${t.wallet.holdWarning} ${(wallet?.hold ?? 0).toLocaleString()}`}
              </Cash>
            )}
          </div>
        </div>
      </header>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-no-700/60 bg-no-500/[0.10] px-4 py-3">
          <I.alertCircle s={16} />
          <div className="text-[12.5px] leading-snug">
            <p className="font-display font-semibold text-text">{t.wallet.withdrawFailed}</p>
            <p className="mt-0.5 text-text-muted">{errorMsg}</p>
          </div>
        </div>
      )}

      {!kycApproved && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-bg/30 p-4">
          <I.shieldcheck s={18} />
          <div className="min-w-0">
            <p className="font-display font-semibold text-text">{t.wallet.verifyFirst}</p>
            <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
              {t.wallet.verifyFirstBody}
            </p>
            <Link href="/profile/kyc" className="btn btn-gold btn-sm mt-3">
              {t.wallet.continueKyc}
            </Link>
          </div>
        </div>
      )}

      <form
        action={withdrawAction}
        className={`rounded-xl glass-panel p-5 lg:p-6 space-y-5 ${kycApproved ? "" : "opacity-60"}`}
      >
        <fieldset disabled={!kycApproved}>
          <legend className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
            {t.wallet.destination}
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDERS.map((p, i) => (
              <label
                key={p.id}
                className="relative flex flex-col items-center gap-2 px-2 py-3.5 rounded-md border border-border cursor-pointer transition-colors hover:border-gold-700 has-[:checked]:border-gold-500 has-[:checked]:bg-gold-500/10"
                style={{ background: "var(--bg-inset)" }}
              >
                <input type="radio" name="provider" value={p.id} required defaultChecked={prevProvider ? p.id === prevProvider : i === 0} className="sr-only peer" />
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md font-display font-bold text-[12px] text-text"
                  style={{ background: `linear-gradient(135deg, oklch(45% 0.10 ${p.hue}), oklch(30% 0.08 ${p.hue}))` }}
                >
                  {p.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                </span>
                <span className="font-display text-[12px] font-semibold text-text text-center leading-tight">{p.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <KitField
          label={t.wallet.amount}
          hint={t.wallet.amountHint}
        >
          <Input
            id="amount"
            name="amount"
            type="number"
            required
            inputMode="numeric"
            min={1000}
            max={Math.min(5_000_000, wallet?.balance ?? 0)}
            step={1}
            placeholder="10000"
            defaultValue={prevAmount || undefined}
            disabled={!kycApproved}
            prefix="TZS"
            mono
            className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          />
        </KitField>

        <KitField label={t.wallet.destinationPhone}>
          <Input
            id="msisdn"
            name="msisdn"
            type="tel"
            inputMode="numeric"
            pattern="\d{9}"
            maxLength={9}
            required
            placeholder="712 345 678"
            defaultValue={prevMsisdn || undefined}
            disabled={!kycApproved}
            prefix="+255"
            mono
          />
        </KitField>

        <div className="flex items-start gap-2.5 rounded-md border border-info-border bg-info-bg/30 px-3 py-2.5 text-[12.5px] leading-snug">
          <I.shieldcheck s={14} />
          <div>
            <p className="font-display font-semibold text-text">{t.wallet.securedByKyc}</p>
            <p className="mt-0.5 text-text-muted">
              {t.wallet.securedBody}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-warning-border bg-warning-bg/30 px-3 py-2.5 text-[12.5px] leading-snug">
          <I.alertCircle s={14} />
          <div>
            <p className="font-display font-semibold text-text">{t.wallet.taxNotice}</p>
            <p className="mt-0.5 text-text-muted">
              {t.wallet.taxBody}
            </p>
          </div>
        </div>

        {kycApproved ? <WithdrawConfirm /> : <SubmitButton label={t.common.confirm} pendingLabel={t.common.loading} />}
      </form>
    </main>
  );
}
