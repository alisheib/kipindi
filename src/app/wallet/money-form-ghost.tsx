import type { ReactNode } from "react";
import { FieldLegend } from "@/components/ui/field-legend";
import { ChipGhost, GhostText } from "@/components/ui/ghost-text";
import { moneyRuns } from "@/lib/fill-nodes";
import { fill } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";

/**
 * THE MONEY FORMS WHILE THEY LOAD — /wallet/deposit's and /wallet/withdraw's (round 5 of the Vodacom visual pass, follow-up
 * R5-K, 2026-10-09). Both pages draw one form card (`rounded-xl glass-panel p-5 lg:p-6`, its rhythm on an inner
 * `space-y-5`) out of the same kit parts — the provider tiles (`ProviderRadioGrid`), the amount field (`AmountField`:
 * the 48px box, the quick-amount pills, the hint) — so their ghosts are one drawing of those parts, here, in each part's
 * own classes and the page's own words set and not shown (`ghost-text.tsx`), as the money books share one bar ghost
 * (`money-bar-ghost.tsx`, R5-H). Measured against the pages from the classes and the repo's fonts (S/r5k/m-deposit.mts,
 * m-rest.mts): the deposit ghost drew no card, the amount before the providers, 86px tiles for the page's 106.25, no
 * quick amounts, a 10px hint bar for a hint of three to eight lines, no phone hint, no "use another number" button and
 * no trust strip — the page ended 347–589px below it; the withdraw ghost drew a 138px spinner panel where the page has a
 * form of 730–1,210px (and its hero was 48px short on a phone: the balance block stacks under the head there).
 * ⭐ THE CASE DRAWN: mobile money (the page's first rail is pre-selected, so the card's billing block is hidden), no
 * notice above the form (payouts open, no promo, money in open), and for a withdrawal a verified player — the form, not
 * the identity panel (the brief's ruling) — whose balance covers the whole quick-amount ladder (six pills: two rows on a
 * phone). A KYC-gated reader is drawn this form and then shown `KycGatePanel` in its place; a balance under 100,000 shows
 * fewer pills (under 25,000 one row on a phone, under 5,000 none).
 * ⛔ No figure is drawn: the limits in the hints, the fee's rate, the registered number and the balance are shapes
 * (`ghostShape`; measured from the fonts, each wraps as the page's figure does — S/r5k/m-figures.mts), and
 * the form's words are set and not shown. Nothing here is a control.
 */

/** The deposit's rails in the page's order (`deposit/page.tsx` PROVIDERS; "Card" is a word, the rest brand names). */
export const depositRails = (t: Dict): string[] => ["M-Pesa", "Airtel Money", "HaloPesa", "Mixx by Yas", t.wallet.methodCard];
/** The withdrawal's rails (`withdraw/page.tsx` PROVIDERS — mobile money only). */
export const WITHDRAW_RAILS: readonly string[] = ["M-Pesa", "Airtel Money", "HaloPesa", "Mixx by Yas"];
/** The hints' limits as shapes: TZS 1,000 – 2,000,000 per deposit, 1,015 – 5,000,000 per withdrawal at the live fee
 *  (validators.ts, `withdrawMinFor`). */
export const LIMIT_SHAPES = { min: "0,000", max: "0,000,000" } as const;
/** The withdrawal fee's rate in the tax notice, as a shape: the page prints `pctNum(rate)` — "1.5" at the default and live
 *  1.5% (`DEFAULT_WITHDRAWAL_FEE_RATE`, payout.ts) — so the ghost sets "0.0", not a one-digit stand-in. */
export const FEE_PCT_SHAPE = "0.0";
/** How many quick-amount pills the page offers (`DEPOSIT_QUICK_AMOUNTS`; the withdrawal's ladder is as long). */
export const QUICK_PILLS = 6;

/** `ProviderRadioGrid` while it loads: the same grid class (a short last row shares the row), each tile its box. */
export function ProviderGridGhost({ names }: { names: readonly string[] }) {
  return (
    <div className={names.length === 4 ? "kp-provgrid kp-provgrid--quarters" : "kp-provgrid kp-provgrid--thirds"}>
      {names.map((name) => (
        <div key={name} className="relative flex flex-col items-center gap-2 rounded-md border border-border px-2 py-[14px]" style={{ background: "var(--bg-inset)" }}>
          {/* `PaymentLogo`'s 48px slot. */}
          <span className="inline-flex h-[48px] w-[48px] shrink-0 border border-border bg-bg-overlay" style={{ borderRadius: "var(--r-md)" }} />
          <span className="font-medium text-body-sm text-center leading-tight"><GhostText>{name}</GhostText></span>
        </div>
      ))}
    </div>
  );
}

/** A field's label (`FieldLegend`, as the page writes it over a fieldset or a box), its words set and not shown. */
function LegendGhost({ children }: { children: ReactNode }) {
  return <FieldLegend as="p" className="block mb-2"><GhostText>{children}</GhostText></FieldLegend>;
}

/** `AmountField` while it loads: the label, the 48px box (`<Input size="lg">`), the quick-amount pills, the hint. */
export function AmountFieldGhost({ label, hint, pills }: { label: string; hint: string; pills: number }) {
  return (
    <div>
      <LegendGhost>{label}</LegendGhost>
      <div className="h-[48px] w-full rounded-lg border border-border bg-bg-inset" />
      {pills > 0 && (
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {Array.from({ length: pills }, (_, i) => <div key={i} className="h-[44px] rounded-pill bg-bg-overlay" />)}
        </div>
      )}
      <p className="mt-2 text-body-sm text-balance break-keep [overflow-wrap:anywhere]"><GhostText>{moneyRuns(hint)}</GhostText></p>
    </div>
  );
}

/** The form's last control — the confirm (`btn btn-primary btn-lg w-full`, --h-control-lg), brand as its button. */
function CommitGhost() {
  return <div className="h-[var(--h-control-lg)] w-full rounded-control bg-brand-500/25" />;
}

/** /wallet/deposit's form card and the trust strip under it (`deposit/page.tsx`), for a mobile-money deposit. */
export function DepositFormGhost({ t }: { t: Dict }) {
  return (
    <>
      <div className="rounded-xl glass-panel p-5 lg:p-6 kp-shimmer-track" aria-hidden>
        <div className="space-y-5">
          {/* The provider-first order of the page: the rails, then the amount. */}
          <div>
            <LegendGhost>{t.wallet.choosePaymentMethod}</LegendGhost>
            <ProviderGridGhost names={depositRails(t)} />
          </div>
          <AmountFieldGhost label={t.common.depositAmountLabel} hint={fill(t.common.depositAmountHint, LIMIT_SHAPES)} pills={QUICK_PILLS} />
          {/* The handset: its label, the `PhoneInput` box (--h-input), its hint, and "use another number" (`btn-sm`, 12px
              over it — the box of the page's inline button, whose line is 12 + 40). */}
          <div>
            <LegendGhost>{t.wallet.mobileMoneyNumber}</LegendGhost>
            <div className="h-[var(--h-input)] w-full rounded-lg border border-border bg-bg-inset" />
            <p className="mt-1.5 text-body-sm text-balance"><GhostText>{t.wallet.mobileMoneyNumberHint}</GhostText></p>
            <div className="mt-2 flex h-[var(--h-control-sm)] w-fit items-center rounded-control border border-transparent bg-bg-overlay px-2">
              <span className="text-body-sm tracking-normal font-semibold text-transparent">{t.wallet.useAnotherNumber}</span>
            </div>
          </div>
          <CommitGhost />
        </div>
      </div>
      {/* The trust strip (money in open): the 40px placeholder and its sentence. */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated/60 px-4 py-3" aria-hidden>
        <span className="h-[40px] w-[40px] shrink-0 border border-dashed border-border" style={{ borderRadius: "var(--r-md)" }} />
        <p className="text-body-sm leading-relaxed"><GhostText>{t.wallet.securedDepositBody}</GhostText></p>
      </div>
    </>
  );
}

/**
 * The withdraw hero's balance block (`withdraw/page.tsx`): the label and the 22px figure line, stacked under the head on a
 * phone (the hero is `flex-col gap-2` there) and beside it from `sm`. ⛔ A shape — the label's words set and not shown, the
 * figure a bar of its line (`leading-none`, 22px): never a number a player could read as their balance (§C).
 */
export function WithdrawBalanceGhost({ t }: { t: Dict }) {
  return (
    <div className="sm:text-right shrink-0" aria-hidden>
      {/* The page's label takes back its trailing tracking from `sm`, where it is right-aligned (F19, round 6 · C11); the
          same class here keeps the label's box the page's (merged 2026-10-09). */}
      <p className="font-mono text-micro uppercase eyebrow kp-track-end"><GhostText>{t.wallet.available}</GhostText></p>
      <div className="h-[22px] w-[132px] rounded-sm bg-bg-overlay sm:ml-auto" />
    </div>
  );
}

/** One row of the withdraw notices panel (`NoticeRow`): the 15px glyph, the title, the sentence. */
function NoticeGhost({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-[10px] px-[14px] py-3 text-body-sm leading-snug">
      <span className="mt-0.5 h-[15px] w-[15px] shrink-0" />
      <div>
        <p className="font-display font-semibold"><GhostText>{title}</GhostText></p>
        <p className="mt-0.5 text-balance"><GhostText>{body}</GhostText></p>
      </div>
    </div>
  );
}

/** /wallet/withdraw's form card (`withdraw/page.tsx`), for a verified player with payouts open. */
export function WithdrawFormGhost({ t }: { t: Dict }) {
  return (
    <div className="rounded-xl glass-panel p-5 lg:p-6 kp-shimmer-track" aria-hidden>
      <div className="space-y-5">
        <div>
          <LegendGhost>{t.wallet.destination}</LegendGhost>
          <ProviderGridGhost names={WITHDRAW_RAILS} />
        </div>
        <AmountFieldGhost label={t.wallet.amount} hint={fill(t.wallet.amountHint, LIMIT_SHAPES)} pills={QUICK_PILLS} />
        {/* The stated destination: its key and the `sm` chip (wrapping as units), the number's 24px line, the rule. */}
        <div className="rounded-xl border border-border bg-bg-inset/60 px-[14px] py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <FieldLegend><GhostText>{t.wallet.destinationPhone}</GhostText></FieldLegend>
            <ChipGhost size="sm" nowrap>{t.wallet.destinationRegistered}</ChipGhost>
          </div>
          <p className="mt-1.5 font-mono text-body-lg tabular-nums"><GhostText>{"+255 000 000 000"}</GhostText></p>
          <p className="mt-1.5 text-body-sm leading-snug"><GhostText>{t.wallet.destinationLockedBody}</GhostText></p>
        </div>
        <div className="rounded-xl border border-border bg-bg-elevated/50 divide-y divide-border/60">
          <NoticeGhost title={t.wallet.securedByKyc} body={t.wallet.securedBody} />
          <NoticeGhost title={t.wallet.taxNotice} body={fill(t.wallet.taxBody, { pct: FEE_PCT_SHAPE })} />
        </div>
        <CommitGhost />
      </div>
    </div>
  );
}

