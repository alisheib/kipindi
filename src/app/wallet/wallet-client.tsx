"use client";

import Link from "next/link";
import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { EmptyState } from "@/components/ui/empty-state";
import type { Transaction } from "@/lib/ui-stubs";
import { Cash } from "@/components/ui/cash";
import { CashbackPromo } from "@/components/ui/cashback-promo";
import { formatDateTimeSafe } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const TXNS_PER_PAGE = 12;

const fmt = (n: number, currency = "TZS") => `${currency} ${n.toLocaleString("en-US")}`;

function BalanceCard({
  balance, pending, hold, currency,
}: { balance: number; pending: number; hold: number; currency: string }) {
  const { t } = useT();
  return (
    <section className="relative overflow-hidden rounded-xl"
      style={{
        background: "linear-gradient(135deg, oklch(23% 0.075 268), oklch(16% 0.05 268))",
        border: "1px solid oklch(78% 0.13 80 / 0.3)",
        boxShadow: "inset 0 1px 0 oklch(92% 0.06 84 / 0.15), 0 12px 34px oklch(8% 0.05 264 / 0.5)",
      }}
    >
      <div className="absolute -right-8 -bottom-8 opacity-[0.07]" aria-hidden>
        <FiftyMark size={220} />
      </div>
      <div className="relative z-10 p-5 lg:p-6">
        <div className="flex items-center gap-1.5 text-gold-300">
          <I.wallet s={13} />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] font-bold">{t.common.available2}</p>
        </div>
        <p
          data-testid="wallet-balance"
          data-balance={balance}
          className="mt-1.5 font-mono text-[38px] font-bold tabular-nums text-text leading-none tracking-[-0.02em]"
        >
          <Cash>{fmt(balance, currency)}</Cash>
        </p>
        {balance === 0 && pending === 0 && hold === 0 && (
          <Link
            href="/wallet/deposit"
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-gold-300 hover:text-gold-200 transition-colors"
          >
            <I.plus s={12} />
            {t.common.addFunds}
          </Link>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <SubStat label={t.common.pending} value={fmt(pending, currency)} />
          <SubStat label={t.common.onHold}  value={fmt(hold, currency)} hint={hold > 0 ? t.common.pendingHoldHint : undefined} />
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
 * Bonus wallet — the "prize money" counterpart to the royal main balance card.
 * Uses the platform's gold/jackpot accent (--g-jackpot / --glow-jackpot) so it
 * reads as a glowing reward and stays ON-palette, while the warm gold clearly
 * sets it apart from the cool-royal main wallet. A play-through meter (gold →
 * emerald) turns bonus into withdrawable cash. Shown beside the main wallet
 * always (friendly empty state when the player has no bonuses).
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
    <section
      className="relative overflow-hidden rounded-xl"
      style={{
        background: "linear-gradient(135deg, oklch(30% 0.085 80), oklch(18% 0.055 72))",
        border: "1px solid var(--border-gold)",
        boxShadow: "inset 0 1px 0 oklch(92% 0.10 84 / 0.18), var(--glow-jackpot)",
      }}
    >
      {/* warm gift motif + jackpot glow */}
      <div className="absolute -right-6 -top-8 opacity-[0.12] text-gold-300 animate-pulse" aria-hidden style={{ animationDuration: "3.5s" }}>
        <I.gift s={150} />
      </div>
      <div className="absolute -left-10 -bottom-12 h-40 w-40 rounded-full opacity-30" aria-hidden
        style={{ background: "radial-gradient(circle, oklch(82% 0.16 82 / 0.5), transparent 70%)" }} />

      <div className="relative z-10 p-5 lg:p-6">
        <div className="flex items-center gap-1.5 text-gold-300">
          <I.gift s={13} />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] font-bold">{t.common.bonus}</p>
          <span className="ml-auto inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] font-bold bg-gold-500/15 text-gold-200">
            {t.common.playToUnlock}
          </span>
        </div>

        <p
          data-testid="bonus-balance"
          data-bonus={bonusBalance}
          className="mt-1.5 font-mono text-[38px] font-bold tabular-nums text-text leading-none tracking-[-0.02em]"
        >
          <Cash>{fmt(bonusBalance, currency)}</Cash>
        </p>

        {hasBonus ? (
          <>
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold-200/80">
                  {t.common.unlockProgress}
                </p>
                <p className="font-mono text-[12px] font-bold text-text tabular-nums">{overallPct}%</p>
              </div>
              <div className="h-2.5 w-full rounded-pill overflow-hidden bg-bg-sunken/70">
                <div className={`h-full rounded-pill transition-[width] duration-500 ${overallPct > 0 && overallPct < 100 ? "prog-sweep" : ""}`}
                  style={{ width: `${overallPct}%`, background: "linear-gradient(90deg, var(--gold-500), var(--yes-400))" }} />
              </div>
              {totalRemainingWager > 0 && (
                <p className="mt-2 text-[12px] text-gold-100/90">
                  <span className="font-mono font-bold text-text"><Cash>{fmt(totalRemainingWager, currency)}</Cash></span>
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
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-gold-200/80 flex items-center gap-1.5">
                          {BONUS_SOURCE_LABEL[g.source] ?? g.source}
                          {isQueued && (
                            <span className="inline-flex items-center rounded-pill px-1.5 py-px text-[8px] font-bold bg-warning-bg/40 border border-warning-border text-warning-fg">
                              {t.common.queued}
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-[12px] font-bold text-text tabular-nums"><Cash>{fmt(g.remainingTzs, currency)}</Cash></span>
                      </div>
                      {isQueued ? (
                        <p className="mt-1.5 text-[9.5px] text-text-muted italic">
                          {t.common.queuedHint}
                        </p>
                      ) : (
                        <>
                          <div className="mt-1.5 h-1.5 w-full rounded-pill overflow-hidden bg-bg-sunken/70">
                            <div className={`h-full rounded-pill ${g.progressPct > 0 && g.progressPct < 100 ? "prog-sweep" : ""}`} style={{ width: `${g.progressPct}%`, background: "var(--gold-400)" }} />
                          </div>
                          <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-gold-200/55">
                            <span>{fmt(g.wageredTzs, currency)} / {fmt(g.wagerRequiredTzs, currency)} {t.common.played}</span>
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

function SubStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-3 py-2.5 backdrop-blur-md">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.10em] text-text-faint">{label}</p>
      <p className="font-mono font-bold text-[14px] tabular-nums text-text leading-tight"><Cash>{value}</Cash></p>
      {hint && <p className="mt-0.5 text-[9.5px] text-text-faint">{hint}</p>}
    </div>
  );
}

function TxnRow({ tx }: { tx: Transaction }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const isCredit = tx.amount > 0;
  const statusTone =
    tx.status === "confirmed" ? "text-yes-300"
    : tx.status === "pending" ? "text-warning-fg"
    : tx.status === "review"  ? "text-info-fg"
    : "text-no-300";
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
            <Cash>{`${isCredit ? "+" : ""}${fmt(Math.abs(tx.amount))}`}</Cash>
          </p>
          <p className={`mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] font-semibold ${statusTone}`}>
            {tx.status}
          </p>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-0 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{t.common.txnType}</p>
            <p className="font-semibold text-text">{tx.type}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{t.wallet.amount}</p>
            <p className="font-mono font-bold tabular-nums text-text">{fmt(Math.abs(tx.amount))}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{t.error.reference}</p>
            <p className="font-mono text-text-muted truncate">{tx.id.slice(0, 16)}</p>
          </div>
          {tx.positionId && (
            <Link
              href="/positions"
              className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5 hover:border-gold-700 transition-colors block"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{t.common.ticket}</p>
              <p className="font-mono text-[11px] tracking-[0.04em] text-brand-300 tabular-nums underline-offset-2 hover:underline">{tx.positionId}</p>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Client pager — visually identical to the shared <Pagination> (numbered
 *  buttons + "X–Y of Z" count) but driven by client state, since the wallet
 *  activity list is client-rendered inside tabs. `page` is 0-indexed. */
function TxnPager({
  page, pageCount, total, perPage, onGoto,
}: { page: number; pageCount: number; total: number; perPage: number; onGoto: (p: number) => void }) {
  const { t } = useT();
  const cur = page + 1; // 1-indexed for display
  const pages: (number | "...")[] = [];
  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i++) pages.push(i);
  } else {
    pages.push(1);
    if (cur > 3) pages.push("...");
    for (let i = Math.max(2, cur - 1); i <= Math.min(pageCount - 1, cur + 1); i++) pages.push(i);
    if (cur < pageCount - 2) pages.push("...");
    pages.push(pageCount);
  }
  const btnBase = "inline-flex items-center justify-center h-8 min-w-[32px] px-2 rounded-md font-mono text-[11px] tracking-[0.10em] transition-colors";
  const btnActive = "border border-brand-500 bg-brand-500/15 text-brand-300 font-bold";
  const btnInactive = "border border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text";
  const btnDisabled = "border border-border bg-bg-elevated text-text-subtle/40 pointer-events-none";
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 border-t border-border" aria-label={t.wallet.activityPages}>
      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle tabular-nums">
        {(page * perPage + 1).toLocaleString()}–{Math.min((page + 1) * perPage, total).toLocaleString()} {t.common.of} {total.toLocaleString()}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <button type="button" onClick={() => onGoto(page - 1)} disabled={page === 0} className={`${btnBase} ${page > 0 ? btnInactive : btnDisabled}`} aria-label={t.common.previousPage}>
          <I.chevronLeft s={14} />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`d${i}`} className="px-1 text-text-subtle">…</span>
          ) : (
            <button type="button" key={p} onClick={() => onGoto(p - 1)} className={`${btnBase} ${p === cur ? btnActive : btnInactive}`}>
              {p}
            </button>
          ),
        )}
        <button type="button" onClick={() => onGoto(page + 1)} disabled={page >= pageCount - 1} className={`${btnBase} ${page < pageCount - 1 ? btnInactive : btnDisabled}`} aria-label={t.common.nextPage}>
          <I.chevronRight s={14} />
        </button>
      </div>
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
  bonusBalance, bonusActiveCount, bonusWagerRemaining, bonusGrants,
  cashbackPercent = 0,
  cashbackMode = "REQUEST",
  isAuthed,
}: {
  balance: number; pending: number; hold: number; currency: string;
  transactions: Transaction[];
  bonusBalance: number; bonusActiveCount: number; bonusWagerRemaining: number; bonusGrants: (BonusGrantView & { status?: "ACTIVE" | "QUEUED" })[];
  cashbackPercent?: number;
  cashbackMode?: "REQUEST" | "AUTO";
  isAuthed: boolean;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<TabValue>("activity");
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(transactions.length / TXNS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedTxns = transactions.slice(safePage * TXNS_PER_PAGE, safePage * TXNS_PER_PAGE + TXNS_PER_PAGE);

  const tabs: { v: TabValue; label: string }[] = [
    { v: "activity", label: t.common.activity },
    { v: "methods",  label: t.common.methods },
    { v: "limits",   label: t.common.limits },
  ];

  const txnCaps = [
    { label: t.common.perDeposit,    value: "TZS 500 – 2,000,000" },
    { label: t.common.perWithdrawal, value: "TZS 1,000 – 5,000,000" },
  ];

  const selfExclusionOptions = ["24h", "7d", "30d", "6m", t.common.permanent];

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.common.walletLabel}</p>
          <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">{t.common.yourFunds}</h1>
        </div>
        {isAuthed && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/wallet/deposit" className="btn btn-gold btn-md inline-flex" style={{ borderRadius: "var(--r-pill)" }}>
              <I.arrowDown s={14} />
              {t.common.deposit}
            </Link>
            <Link href="/wallet/withdraw" className="btn btn-ghost btn-md inline-flex" style={{ borderRadius: "var(--r-pill)" }}>
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
        <p className="sr-only">{t.common.bonus}: {fmt(bonusWagerRemaining, currency)}</p>
      )}

      {cashbackPercent > 0 && <CashbackPromo percent={cashbackPercent} mode={cashbackMode} />}

      {/* Kit tabs — line variant rebuilt inline so we don't pull the legacy Tabs component. */}
      <nav role="tablist" aria-label={t.common.walletLabel} className="flex items-center gap-1 border-b border-border">
        {tabs.map((tb) => {
          const active = tab === tb.v;
          return (
            <button
              key={tb.v}
              type="button"
              role="tab"
              aria-selected={active ? "true" : "false"}
              onClick={() => setTab(tb.v)}
              className={`relative h-9 px-3.5 font-display text-[13px] font-semibold transition-colors ${
                active ? "text-text" : "text-text-subtle hover:text-text-muted"
              }`}
            >
              {tb.label}
              {active && (
                <span aria-hidden className="absolute left-2 right-2 -bottom-px h-[2px] rounded-pill bg-gold-500" />
              )}
            </button>
          );
        })}
      </nav>

      {tab === "activity" && (
        transactions.length > 0 ? (
          <section className="space-y-3">
            <div className="rounded-xl glass-panel overflow-hidden">
              {pagedTxns.map((tx) => <TxnRow key={tx.id} tx={tx} />)}
              {pageCount > 1 && (
                <TxnPager
                  page={safePage}
                  pageCount={pageCount}
                  total={transactions.length}
                  perPage={TXNS_PER_PAGE}
                  onGoto={(p) => setPage(Math.min(Math.max(0, p), pageCount - 1))}
                />
              )}
            </div>
          </section>
        ) : (
          <EmptyState
            kind="audit"
            title={t.common.noActivityYet}
            body={t.common.firstDepositHint}
            action={
              isAuthed ? (
                <Link href="/wallet/deposit" className="btn btn-gold btn-md">
                  {t.common.depositCta}
                </Link>
              ) : undefined
            }
          />
        )
      )}

      {tab === "methods" && (
        <section className="space-y-3">
          <p className="text-[12.5px] text-text-muted leading-snug">
            {t.common.supportedChannels}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {METHODS.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated p-4"
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md font-display font-bold text-[13px] text-text shrink-0"
                  style={{ background: `linear-gradient(135deg, oklch(45% 0.10 ${m.hue}), oklch(30% 0.08 ${m.hue}))` }}
                >
                  {m.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                </span>
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
          <p className="text-[12.5px] text-text-muted leading-snug">
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
              <p className="mt-0.5 text-[11.5px] text-text-subtle">{t.common.dailyWeeklyLimits}</p>
            </div>
            <I.chevronRight s={16} className="text-text-subtle" />
          </Link>
          <div className="rounded-xl glass-panel p-4 space-y-2">
            <p className="font-display text-[13.5px] font-semibold text-text">
              {t.common.selfExclusion}
            </p>
            <p className="text-[12.5px] text-text-muted leading-snug">
              {t.common.selfExclusionHint}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selfExclusionOptions.map((o) => (
                <Link
                  key={o}
                  href="/profile/responsible-gambling"
                  className="inline-flex h-8 items-center px-3 rounded-pill border border-border bg-bg-overlay font-mono text-[11.5px] font-semibold text-text-muted hover:text-text hover:border-no-700 transition-colors"
                >
                  {o}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
