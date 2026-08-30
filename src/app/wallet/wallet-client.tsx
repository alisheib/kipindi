"use client";

import Link from "next/link";
import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { PageHeader } from "@/components/ui/page-header";
import { FiftyMark } from "@/components/brand";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import type { Transaction } from "@/lib/ui-stubs";
import { Cash } from "@/components/ui/cash";
import { Stat } from "@/components/ui/stat";
import { CashbackPromo } from "@/components/ui/cashback-promo";
import { PaymentLogo } from "@/components/wallet/payment-logo";
import { formatDateTimeSafe, formatTzs, formatNumber } from "@/lib/utils";
// E-101 · one rule for "where does this ticket live", shared with the round page and the emails.
import { positionPermalinkHref } from "@/lib/position-permalink";
import { useT } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";

const TXNS_PER_PAGE = 12;

/** Wallet 30-day balance spark (A9) — aqua line + terminal pip (balance is
 *  state, not earnings → aqua, never gold). Hidden with fewer than 2 points. */
function BalanceSpark({ series, label }: { series: number[]; label: string }) {
  if (!series || series.length < 2) return null;
  const w = 320, h = 46, pad = 4;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = Math.max(max - min, 1);
  const xs = series.map((_, i) => pad + (i / (series.length - 1)) * (w - 2 * pad));
  const ys = series.map((v) => pad + (h - 2 * pad) - ((v - min) / range) * (h - 2 * pad));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  return (
    <div className="rounded-xl glass-panel p-3">
      <p className="mb-1.5 font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{label}</p>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block w-full" style={{ height: 46 }} aria-hidden>
        <path d={d} fill="none" stroke="var(--aqua-400)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.4" fill="var(--aqua-400)" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function BalanceCard({
  balance, pending, hold, currency,
}: { balance: number; pending: number; hold: number; currency: string }) {
  const { t } = useT();
  return (
    <section className="relative overflow-hidden rounded-xl"
      style={{
        background: "linear-gradient(135deg, oklch(23% 0.075 268), oklch(16% 0.05 268))",
        border: "1px solid oklch(78% 0.13 80 / 0.3)",
        /* M1 — the light becomes an EVEN ring: same colour, same alpha, all four sides.
           ⭐ The gold tint STAYS. This is the wallet balance panel, so the warm edge is
           earned-money identity (M3) rather than decoration.

           ⭐ D5 (Ali's ruling, 2026-08-21) — THIS CARD NOW CARRIES THE STRONGEST CAST ON
           THE PAGE, because it holds the only real money on it. The hand-typed
           `0 12px 34px oklch(8% 0.05 264 / 0.5)` is replaced by `--elev-modal`, the
           deepest rung in the M2 ladder short of a toast — so the Available balance sits
           physically above the bonus panel (`--elev-raised`) and the activity/limits
           panels (`.glass-panel`, a shallower cast), instead of below both as it did when
           the gold surfaces around it glowed and it did not.
           ⚠️ Composed, not adopted: the surface keeps its own gilt ring, so it cannot
           simply wear `.mat-modal` (which would also impose `--wash-modal` and
           `--border-strong` over the royal gradient and the gold edge). What it must not
           do — and no longer does — is INVENT a cast; the depth is read from the ladder.
           ⛔ `--elev-modal` carries no OUTER ring (only the inset `--edge-lit-strong`), so
           the call-site border stays: the drop-your-border rule in motion.css §C applies to
           `--elev-float` / `--elev-toast`, which do. Checked, not assumed. */
        boxShadow: "inset 0 0 0 1px oklch(92% 0.06 84 / 0.15), var(--elev-modal)",
      }}
    >
      <div className="absolute -right-8 -bottom-8 opacity-[0.07]" aria-hidden>
        <FiftyMark size={220} />
      </div>
      <div className="relative z-10 p-5 lg:p-6">
        <div className="flex items-center gap-1.5 text-gold-300">
          <I.wallet s={13} />
          <p className="font-mono text-micro uppercase eyebrow font-bold">{t.common.available2}</p>
        </div>
        {/* ⛔ §M4 — MONEY IS MONO, TABULAR AND NEVER LETTER-SPACED. This figure carried
            `tracking-[-0.02em]`: negative tracking on a 38px grouped TZS numeral pulls the
            digits toward the thousands separators, which is precisely the reading the
            tabular face exists to prevent. The tightening is gone; nothing else moves. */}
        <p
          data-testid="wallet-balance"
          data-balance={balance}
          className="mt-1.5 font-mono text-[38px] font-bold tabular-nums text-text leading-none"
        >
          <Cash>{formatTzs(balance)}</Cash>
        </p>
        {balance === 0 && pending === 0 && hold === 0 && (
          <Link
            href="/wallet/deposit"
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-caption uppercase tracking-[0.14em] text-gold-300 hover:text-gold-200 transition-colors"
          >
            <I.plus s={12} />
            {t.common.addFunds}
          </Link>
        )}
        {/* ⭐ Stage 9b — the local `SubStat` is DELETED; this is the kit `<Stat>`.
            `size="sm"` + `labelStyle="faint"` + `boxed="inset"` are that dialect's own
            metrics, catalogued in stat.tsx by name, so the box, the 9.5px/0.10em faint
            label and the 14px mono value are unchanged to the pixel. `money` is what the
            fork was missing a route to: it puts the figure through <Cash> (balance
            privacy) AND clamps it to mono/tabular/no-tracking per §M4, so no future
            caller can reach a tracked or display-face money numeral here. */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat size="sm" labelStyle="faint" boxed="inset" money label={t.common.pending} value={formatTzs(pending)} />
          <Stat size="sm" labelStyle="faint" boxed="inset" money label={t.common.onHold} value={formatTzs(hold)} hint={hold > 0 ? t.common.pendingHoldHint : undefined} />
        </div>
      </div>
    </section>
  );
}

type BonusGrantView = {
  id: string;
  amountTzs: number;
  remainingTzs: number;
  source: string;
  progressPct: number;
  wageredTzs: number;
  wagerRequiredTzs: number;
  remainingWagerTzs: number;
  expiresAt: string | null;
};

const BONUS_SOURCE_LABEL: Record<string, string> = {
  ADMIN: "Gift", REFERRAL: "Referral", PROPOSAL: "Proposal", INVITE: "Invite", PROMOTION: "Promo", CASHBACK: "Cashback",
};

/**
 * Bonus wallet — the locked-money counterpart to the main balance card.
 *
 * 🔴 D5 (Ali's ruling, 2026-08-21) — THE GOLD COSTUME IS GONE, AND THE REASON IS §M3.
 * This panel used to be a full warm-gold gradient wash with `--glow-jackpot` and a
 * radial gilt bloom behind it. At 1280 that made a **TZS 0** bonus the loudest object
 * on the wallet while the player's real Available balance was the quietest — struck
 * gold marking money that was neither earned nor even present. On a licensed
 * real-money product that is not a styling preference; it is the interface telling a
 * player the wrong thing about their own money.
 *
 * WHAT IT IS NOW: the royal panel rung (`.mat-raised`, M2 rung 1) with GOLD TEXT
 * ACCENTS ONLY — the eyebrow, the unlock meter, the per-grant figures. No gradient
 * wash, no jackpot glow, no gilt bloom. The bonus is still unmistakably the warm
 * column; it simply no longer outranks the balance.
 *
 * ⚠️ The old copy of this recipe in `ui/cashback-promo.tsx` is byte-identical and is
 * NOT this session's file to edit — it is still wearing the costume. See the report.
 *
 * A play-through meter (gold → emerald) still turns bonus into withdrawable cash, and
 * that gold IS legitimate: it measures progress toward money the player will own.
 * Shown beside the main wallet always (friendly empty state when there are no bonuses).
 */
function BonusWalletCard({
  bonusBalance, activeCount, grants, currency,
}: { bonusBalance: number; activeCount: number; grants: (BonusGrantView & { status?: "ACTIVE" | "QUEUED" })[]; currency: string }) {
  const { t } = useT();
  const totalReq = grants.reduce((s, g) => s + g.wagerRequiredTzs, 0);
  const totalWagered = grants.reduce((s, g) => s + Math.min(g.wageredTzs, g.wagerRequiredTzs), 0);
  const totalRemainingWager = grants.reduce((s, g) => s + g.remainingWagerTzs, 0);
  const overallPct = totalReq > 0 ? Math.min(100, Math.round((totalWagered / totalReq) * 100)) : 0;
  const hasBonus = bonusBalance > 0 || activeCount > 0;

  return (
    /* ⭐ D5 — THE PANEL PICKS A RUNG INSTEAD OF PAINTING ITSELF. `.mat-raised` (M2 rung 1)
       carries the royal wash, the neutral border and `--elev-raised` together, so the three
       inline declarations it replaces — a hand-typed gold gradient, `--border-gold` and a
       gilt ring + `--glow-jackpot` — are DELETED rather than left beside it. `data-rung` is
       the adoption ledger the modal primitive established: a surface that picks a rung says
       which one, in the markup.
       ⛔ Rung 1, not 2 or 3, and that is the whole point of the ruling: the Available card
       beside it now sits on `--elev-modal`. Raising this one would put the hierarchy back
       exactly where it was. */
    <section
      data-rung="raised"
      className="mat-raised relative overflow-hidden rounded-xl"
    >
      {/* The gift motif stays — it is what tells the two columns apart at a glance — but it
          is NO LONGER GOLD. A 150px gilt glyph washing the panel is the costume, not an
          accent; `--text-faint` keeps the motif and returns the gold to the words.
          M5 — a decorative glyph does not perform: it rests still (the infinite pulse was
          bespoke glyph motion outside the frozen ambient list).
          ⛔ The radial gilt bloom that used to sit under it is DELETED, not dimmed. */}
      <div className="absolute -right-6 -top-8 opacity-[0.12] text-text-faint" aria-hidden>
        <I.gift s={150} />
      </div>

      <div className="relative z-10 p-5 lg:p-6">
        <div className="flex items-center gap-1.5 text-gold-300">
          <I.gift s={13} />
          <p className="font-mono text-micro uppercase eyebrow font-bold">{t.common.bonus}</p>
          <span className="ml-auto inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-mono text-micro uppercase tracking-[0.12em] font-bold bg-gold-500/15 text-gold-200">
            {t.common.playToUnlock}
          </span>
        </div>

        {/* ⛔ §M4 — same rule as the main balance above: the `tracking-[-0.02em]` is gone.
            Money is never letter-spaced, and the two wallet headline figures must not
            disagree about it while sitting side by side on one page. */}
        <p
          data-testid="bonus-balance"
          data-bonus={bonusBalance}
          className="mt-1.5 font-mono text-[38px] font-bold tabular-nums text-text leading-none"
        >
          <Cash>{formatTzs(bonusBalance)}</Cash>
        </p>

        {hasBonus ? (
          <>
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="font-mono text-micro uppercase eyebrow text-gold-200/80">
                  {t.common.unlockProgress}
                </p>
                <p className="font-mono text-[12px] font-bold text-text tabular-nums">{overallPct}%</p>
              </div>
              {/* THE UNLOCK FILL SCALES; IT DOES NOT WIDEN. `transition-[width]` animated a
                  LAYOUT property for 500ms every time the wagering figure moved — on the
                  wallet, which refreshes after every settled bet. `transform: scaleX()` is
                  the same picture on the compositor. Model: `.admin-bar-grow`
                  (state-tokens.css).
                  ⭐ `.prog-sweep` COMPOSES WITH THE SCALE — checked, not assumed. Its
                  `::after` is `inset: 0` of this fill and travels in percentages of its OWN
                  width, so under `width: p%` it was a p·W band crossing p·W, and under a
                  full-width box scaled by p it is a W band crossing W, scaled by p. The two
                  are the same sweep on screen. The `::after` also keeps its own three
                  reduced-motion branches (globals.css) untouched — including the entry in
                  the §6 `[data-motion="reduced"]` list, which it needs because it is
                  `infinite` and this transition is not.
                  ⭐ The gradient reads identically too: a `90deg` ramp is laid out across
                  the element's own box, so `width: p%` compressed the whole gold → yes ramp
                  into the drawn length, and a scaled full-width box compresses exactly the
                  same ramp. (That is why this is scaleX and not a translate, which would
                  have shown a SLICE of the ramp instead.)
                  ⚠️ The cap, stated: scaleX squashes this element's 5px radius
                  horizontally. The track is `rounded-pill overflow-hidden`, so both visible
                  OUTER ends keep their shape and only the moving right edge flattens. No
                  child, no label — nothing can be squashed into a distorted word.
                  §M6 · no new branch is owed: motion.css's universal clamp already zeroes
                  `transition-duration` under the OS query, `html.kp-reduce-motion` and
                  `[data-motion="minimal"]`, exactly as it did for the width transition. */}
              <div className="h-2.5 w-full rounded-pill overflow-hidden bg-bg-sunken/70">
                <div className={`h-full w-full origin-left rounded-pill transition-transform duration-500 ${overallPct > 0 && overallPct < 100 ? "prog-sweep" : ""}`}
                  style={{ transform: `scaleX(${overallPct / 100})`, background: "linear-gradient(90deg, var(--gold-500), var(--yes-400))" }} />
              </div>
              {totalRemainingWager > 0 && (
                <p className="mt-2 text-body-sm text-gold-100/90">
                  <span className="font-mono font-bold text-text"><Cash>{formatTzs(totalRemainingWager)}</Cash></span>
                  {" — "}{t.common.playMoreToUnlock}
                </p>
              )}
            </div>

            {grants.length > 0 && (
              <div className="mt-4 space-y-2">
                {grants.slice(0, 5).map((g) => {
                  const isQueued = g.status === "QUEUED";
                  return (
                    <div key={g.id} className={`rounded-md px-3 py-2 border ${isQueued ? "bg-bg-overlay/40 border-border/40 opacity-70" : "bg-gold-500/[0.06] border-gold-700/25"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-micro uppercase tracking-[0.1em] text-gold-200/80 flex items-center gap-1.5">
                          {BONUS_SOURCE_LABEL[g.source] ?? g.source}
                          {isQueued && (
                            <span className="inline-flex items-center rounded-pill px-1.5 py-px text-[8px] font-bold bg-warning-bg border border-warning-border text-warning-fg">
                              {t.common.queued}
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-[12px] font-bold text-text tabular-nums"><Cash>{formatTzs(g.remainingTzs)}</Cash></span>
                      </div>
                      {isQueued ? (
                        <p className="mt-1.5 text-body-sm text-text-muted italic">
                          {t.common.queuedHint}
                        </p>
                      ) : (
                        <>
                          {/* The per-grant fill takes the SAME technique as the overall bar
                              above — one panel must not hold two ways of drawing one thing.
                              ⚠️ Honest scope: this one never had a transition, so the swap
                              buys no animation frames. What it removes is the LAYOUT that a
                              percentage width forces on every wallet refresh, once per
                              listed grant. `.prog-sweep` and the solid `--gold-400` compose
                              with the scale exactly as described above; there is no gradient
                              and no child here, and the 3px radius on this 6px bar means the
                              moving edge's squash is sub-pixel. */}
                          <div className="mt-1.5 h-1.5 w-full rounded-pill overflow-hidden bg-bg-sunken/70">
                            <div className={`h-full w-full origin-left rounded-pill ${g.progressPct > 0 && g.progressPct < 100 ? "prog-sweep" : ""}`} style={{ transform: `scaleX(${g.progressPct / 100})`, background: "var(--gold-400)" }} />
                          </div>
                          <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-gold-200/55">
                            <span>{formatTzs(g.wageredTzs)} / {formatTzs(g.wagerRequiredTzs)} {t.common.played}</span>
                            {g.expiresAt && <span>{t.common.exp} {formatDateTimeSafe(g.expiresAt).split(",")[0]}</span>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {grants.length > 3 && (
                  <p className="text-center font-mono text-[10px] text-gold-200/60">+{grants.length - 3} {grants.length - 3 > 1 ? t.common.moreBonuses : t.common.moreBonus}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mt-4">
            <p className="text-[13px] text-text/90 leading-snug">
              {t.common.noBonus}
            </p>
            <Link href="/profile/invite" className="btn btn-gold btn-sm rounded-pill mt-3 inline-flex">
              <I.gift s={12} />
              {t.profile.inviteEarn}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function TxnRow({ tx }: { tx: Transaction }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const isCredit = tx.amount > 0;
  // Tone AND label for every state the money can actually be in. The label was
  // previously the raw enum printed lowercase (`{tx.status}`) — the one place on
  // this screen that never got translated, so SW and ZH players read "pending".
  const statusTone =
    tx.status === "confirmed" ? "text-yes-300"
    : tx.status === "pending" || tx.status === "processing" ? "text-warning-fg"
    : tx.status === "review"  ? "text-info-fg"
    : "text-no-300";
  const statusLabel: Record<Transaction["status"], string> = {
    pending: t.wallet.txnStatusPending,
    processing: t.wallet.txnStatusProcessing,
    review: t.wallet.txnStatusReview,
    confirmed: t.wallet.txnStatusConfirmed,
    failed: t.wallet.txnStatusFailed,
    reversed: t.wallet.txnStatusReversed,
    cancelled: t.wallet.txnStatusCancelled,
  };
  const arrowBg =
    isCredit ? "bg-yes-500/10 text-yes-300" : "bg-no-500/10 text-no-300";
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 py-3 px-3 hover:bg-bg-overlay/30 transition-colors text-left"
      >
        <span className={`inline-flex h-[34px] w-[34px] items-center justify-center rounded-md shrink-0 ${arrowBg}`}>
          {isCredit ? <I.arrowDown s={16} /> : <I.arrowUp s={16} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[13.5px] font-semibold text-text leading-tight truncate">
            {tx.description ?? tx.type}
          </p>
          <p className="mt-0.5 font-mono text-[10.5px] text-text-subtle tabular-nums">
            {formatDateTimeSafe(tx.createdAt)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-mono text-[14px] font-bold tabular-nums ${isCredit ? "text-yes-300" : "text-text"}`}>
            <Cash>{`${isCredit ? "+" : ""}${formatTzs(Math.abs(tx.amount))}`}</Cash>
          </p>
          <p className={`mt-0.5 font-mono text-micro uppercase tracking-[0.14em] font-semibold ${statusTone}`}>
            {statusLabel[tx.status]}
          </p>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-0 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5">
            <p className="font-mono text-micro uppercase eyebrow text-text-faint">{t.common.txnType}</p>
            <p className="font-semibold text-text">{tx.type}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5">
            <p className="font-mono text-micro uppercase eyebrow text-text-faint">{t.wallet.amount}</p>
            <p className="font-mono font-bold tabular-nums text-text">{formatTzs(Math.abs(tx.amount))}</p>
          </div>
          {/* Both references, in FULL. This used to print `tx.id.slice(0, 16)`
              and nothing else — a truncated internal id is useless to quote at
              a bank, and the gateway reference (the one the bank and Selcom can
              actually look up) wasn't here at all. Same two labels as the
              receipt page, the return page and the deposit emails. */}
          <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5">
            <p className="font-mono text-micro uppercase eyebrow text-text-faint">{t.wallet.transactionId}</p>
            <p className="font-mono text-text-muted break-all">{tx.id}</p>
          </div>
          {tx.providerRef && (
            <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5">
              <p className="font-mono text-micro uppercase eyebrow text-text-faint">{t.wallet.gatewayReference}</p>
              <p className="font-mono text-text-muted break-all">{tx.providerRef}</p>
            </div>
          )}
          {(tx.type === "deposit" || tx.type === "withdraw") && (
            <Link
              href={`/wallet/receipt/${tx.id}`}
              className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5 hover:border-brand-400 transition-colors block"
            >
              <p className="font-mono text-micro uppercase eyebrow text-text-faint">{t.wallet.receiptEyebrow}</p>
              <p className="font-mono text-[11px] text-brand-300 underline-offset-2 hover:underline">{t.wallet.viewReceipt}</p>
            </Link>
          )}
          {tx.positionId && (
            /* ⭐ E-101 · THE TICKET LINKS TO THE TICKET. Ali, 2026-08-05: *"when I click on
               ticket it just opens positions, not the specific position I was in with
               details."* It went to `/positions` — the long-form list — for EVERY position,
               so an Up & Down bet landed on a page that queries `productLine: "MARKET"` and
               therefore renders "no positions yet" over a bet the player is holding.
               ⛔ The wallet cannot tell which game this was (a transaction carries only the
               id), and resolving it HERE would mean a store lookup per row on a page that
               loads 1,000 transactions. So it links to the permalink route, which resolves
               ownership and product line once, server-side, when the player actually taps. */
            <Link
              href={positionPermalinkHref(tx.positionId)}
              className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5 hover:border-brand-400 transition-colors block"
            >
              <p className="font-mono text-micro uppercase eyebrow text-text-faint">{t.common.ticket}</p>
              {/* 🔴 E-100 · `break-all`, like the two reference boxes above it. Found by Ali on a
                  real phone: `pos_e290a28e8e906b6255…` ran straight out of its box while
                  TRANSACTION ID beside it wrapped correctly — the two sit in the SAME grid and
                  only these ones lacked the rule. A ticket a player cannot read in full is a
                  ticket they cannot quote to support, which is the whole reason it is printed.
                  ⛔ `tabular-nums` is gone with it: this is an identifier with letters in it, not
                  a number, so the fixed-width figures bought nothing and cost width. */}
              <p className="font-mono text-[11px] tracking-[0.04em] text-brand-300 break-all underline-offset-2 hover:underline">{tx.positionId}</p>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}


type TabValue = "activity" | "methods" | "limits";

// Supported payment channels (not per-user saved accounts — saved methods aren't
// a feature yet). The player picks one and enters their number at deposit/withdrawal.
type Method = { id: string; name: string; hue: number };
const METHODS: Method[] = [
  { id: "MPESA",        name: "M-Pesa",       hue: 152 },
  { id: "AIRTEL_MONEY", name: "Airtel Money", hue: 22 },
  { id: "HALO_PESA",    name: "HaloPesa",     hue: 80 },
  { id: "MIXX",         name: "Mixx by Yas",  hue: 280 },
];

export function WalletPageClient({
  balance, pending, hold, currency,
  transactions,
  balanceSeries = [],
  bonusBalance, bonusActiveCount, bonusWagerRemaining, bonusGrants,
  cashbackPercent = 0,
  cashbackMode = "REQUEST",
  limits,
  isAuthed,
}: {
  balance: number; pending: number; hold: number; currency: string;
  transactions: Transaction[];
  /** 30-day end-of-day balance points for the A9 spark; <2 hides it. */
  balanceSeries?: number[];
  bonusBalance: number; bonusActiveCount: number; bonusWagerRemaining: number; bonusGrants: (BonusGrantView & { status?: "ACTIVE" | "QUEUED" })[];
  cashbackPercent?: number;
  cashbackMode?: "REQUEST" | "AUTO";
  /** Single-txn money caps, threaded from the server's zod validators (the
   *  single source of truth) so the Limits tab never drifts from enforcement. */
  limits: { depositMin: number; depositMax: number; withdrawMin: number; withdrawMax: number };
  isAuthed: boolean;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<TabValue>("activity");
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(transactions.length / TXNS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedTxns = transactions.slice(safePage * TXNS_PER_PAGE, safePage * TXNS_PER_PAGE + TXNS_PER_PAGE);

  const tabs = [
    { value: "activity", labelEn: t.common.activity },
    { value: "methods",  labelEn: t.common.methods },
    { value: "limits",   labelEn: t.common.limits },
  ];

  // Derived from the server validators (via props) — never a hand-typed literal.
  const capStr = (min: number, max: number) => `${formatTzs(min)} – ${formatNumber(max)}`;
  const txnCaps = [
    { label: t.common.perDeposit,    value: capStr(limits.depositMin, limits.depositMax) },
    { label: t.common.perWithdrawal, value: capStr(limits.withdrawMin, limits.withdrawMax) },
  ];

  const selfExclusionOptions = ["24h", "7d", "30d", "6m", t.common.permanent];

  return (
    <PageContainer tier="reading" className="space-y-6">
      <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader eyebrow={t.common.walletLabel} title={t.common.yourFunds} />
        {isAuthed && (
          <div className="flex items-center gap-2 shrink-0">
            {/* ⭐ D5 — ONE GOLD DEPOSIT CTA PER VIEWPORT, AND IT IS THE HEADER'S.
                The app header already carries the money-in CTA on struck gilt
                (`top-app-bar.tsx`, `.gilt-metal` — the control M3/ATOM D-2 names by
                hand as "Continue / Deposit / earned-money CTA"), and it is on screen
                on this page at every width. This second gold Deposit sat ~40px below
                it, and a third waited in the empty state; three struck-gold
                inducements to add money, none of them marking money the player had
                earned. This one and the empty-state one become `btn-primary`; the
                header's gilt is untouched. The action is identical — only its claim on
                the eye changes. */}
            <Link href="/wallet/deposit" className="btn btn-primary btn-md btn-pill inline-flex">
              <I.arrowDown s={14} />
              {t.common.deposit}
            </Link>
            <Link href="/wallet/withdraw" className="btn btn-ghost btn-md btn-pill inline-flex">
              <I.arrowUp s={14} />
              {t.common.withdraw}
            </Link>
          </div>
        )}
      </header>

      {/* Two wallets, one page: main (cool royal) + bonus (warm gold/jackpot). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <BalanceCard balance={balance} pending={pending} hold={hold} currency={currency} />
        <BonusWalletCard bonusBalance={bonusBalance} activeCount={bonusActiveCount} grants={bonusGrants} currency={currency} />
      </div>
      {bonusWagerRemaining > 0 && (
        <p className="sr-only">{t.common.bonus}: {formatTzs(bonusWagerRemaining)}</p>
      )}

      {cashbackPercent > 0 && <CashbackPromo percent={cashbackPercent} mode={cashbackMode} />}

      {/* Kit line tabs — the shared primitive (brand underline, gold-disciplined:
          wallet section tabs are navigation, not earned money). */}
      <Tabs
        variant="line"
        tabs={tabs}
        value={tab}
        onChange={(v) => setTab(v as TabValue)}
        ariaLabel={t.common.walletLabel}
      />

      {tab === "activity" && (
        transactions.length > 0 ? (
          <section className="space-y-3">
            <BalanceSpark series={balanceSeries} label={`${t.common.available2} · ${t.common.days30}`} />
            <div className="rounded-xl glass-panel overflow-hidden">
              {pagedTxns.map((tx) => <TxnRow key={tx.id} tx={tx} />)}
              <Pagination
                total={transactions.length}
                page={safePage + 1}
                perPage={TXNS_PER_PAGE}
                onNavigate={(p) => setPage(Math.min(Math.max(0, p - 1), pageCount - 1))}
                ofLabel={t.common.of}
                prevLabel={t.common.previousPage}
                nextLabel={t.common.nextPage}
firstLabel={t.common.firstPage}
lastLabel={t.common.lastPage}
              />
            </div>
          </section>
        ) : (
          <EmptyState
            kind="audit"
            title={t.common.noActivityYet}
            body={t.common.firstDepositHint}
            action={
              /* D5 — the third gold Deposit. Brand, for the reason stated on the
                 header CTA above: the header's gilt is the one. */
              isAuthed ? (
                <Link href="/wallet/deposit" className="btn btn-primary btn-md">
                  {t.common.depositCta}
                </Link>
              ) : undefined
            }
          />
        )
      )}

      {tab === "methods" && (
        <section className="space-y-3">
          <p className="text-body-sm text-text-muted leading-snug">
            {t.common.supportedChannels}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {METHODS.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated p-4"
              >
                <PaymentLogo id={m.id} name={m.name} hue={m.hue} size={40} />
                <div className="min-w-0">
                  <p className="font-display text-[13.5px] font-semibold text-text leading-tight truncate">{m.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-text-subtle">{t.common.mobileMoneyShort}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "limits" && (
        <section className="space-y-3">
          <p className="text-body-sm text-text-muted leading-snug">
            {t.common.platformLimits}
          </p>
          {txnCaps.map((l) => (
            <div
              key={l.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3.5"
            >
              <p className="font-display text-[13.5px] font-semibold text-text leading-tight">{l.label}</p>
              <span className="font-mono font-bold text-[14px] tabular-nums text-text">{l.value}</span>
            </div>
          ))}
          <Link
            href="/profile/responsible-gambling"
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-overlay px-4 py-3.5 hover:border-border-strong transition-colors"
          >
            <div>
              <p className="font-display text-[13.5px] font-semibold text-text leading-tight">{t.common.setPersonalLimits}</p>
              <p className="mt-0.5 text-body-sm text-text-subtle">{t.common.dailyWeeklyLimits}</p>
            </div>
            <I.chevronRight s={16} className="text-text-subtle" />
          </Link>
          <div className="rounded-xl glass-panel p-4 space-y-2">
            <p className="font-display text-[13.5px] font-semibold text-text">
              {t.common.selfExclusion}
            </p>
            <p className="text-body-sm text-text-muted leading-snug">
              {t.common.selfExclusionHint}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selfExclusionOptions.map((o) => (
                <Link
                  key={o}
                  href="/profile/responsible-gambling"
                  /* ⚠️ LITERAL, not `h-8` — the spacing scale is overridden
                     (tailwind.config.ts:200-215) so `h-8` is 48px, 8px above the
                     40px chip language every other rail speaks. */
                  className="inline-flex min-h-[40px] items-center px-3 rounded-pill border border-border bg-bg-overlay font-mono text-[11.5px] font-semibold text-text-muted hover:text-text hover:border-no-700 transition-colors"
                >
                  {o}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </PageContainer>
  );
}
