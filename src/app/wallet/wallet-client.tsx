"use client";

import Link from "next/link";
import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { EmptyState } from "@/components/ui/empty-state";
import type { Transaction } from "@/lib/ui-stubs";
import { Cash } from "@/components/ui/cash";
import { formatDateTimeSafe } from "@/lib/utils";

const TXNS_PER_PAGE = 12;

const fmt = (n: number, currency = "TZS") => `${currency} ${n.toLocaleString("en-US")}`;

function BalanceCard({
  balance, pending, hold, currency,
}: { balance: number; pending: number; hold: number; currency: string }) {
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
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] font-bold">Available · Salio</p>
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
            Add funds to start predicting · Weka pesa
          </Link>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <SubStat label="Pending" sw="Inasubiri" value={fmt(pending, currency)} />
          <SubStat label="On hold"  sw="Imezuiwa"  value={fmt(hold, currency)} hint={hold > 0 ? "Pending withdrawals or AML review" : undefined} />
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
}: { bonusBalance: number; activeCount: number; grants: BonusGrantView[]; currency: string }) {
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
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] font-bold">Bonus · Bonasi</p>
          <span className="ml-auto inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] font-bold bg-gold-500/15 text-gold-200">
            Play to unlock
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
                  Unlock progress · Maendeleo
                </p>
                <p className="font-mono text-[12px] font-bold text-text tabular-nums">{overallPct}%</p>
              </div>
              <div className="h-2.5 w-full rounded-pill overflow-hidden bg-bg-sunken/70">
                <div className={`h-full rounded-pill transition-[width] duration-500 ${overallPct > 0 && overallPct < 100 ? "prog-sweep" : ""}`}
                  style={{ width: `${overallPct}%`, background: "linear-gradient(90deg, var(--gold-500), var(--yes-400))" }} />
              </div>
              {totalRemainingWager > 0 && (
                <p className="mt-2 text-[12px] text-gold-100/90">
                  Play <span className="font-mono font-bold text-text"><Cash>{fmt(totalRemainingWager, currency)}</Cash></span> more to turn this into withdrawable cash.
                  <span className="block italic text-[10.5px] mt-0.5 text-gold-200/60">
                    Cheza zaidi ili kuibadilisha kuwa pesa unayoweza kutoa.
                  </span>
                </p>
              )}
            </div>

            {grants.length > 0 && (
              <div className="mt-4 space-y-2">
                {grants.slice(0, 3).map((g) => (
                  <div key={g.id} className="rounded-md px-3 py-2 bg-gold-500/[0.06] border border-gold-700/25">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-gold-200/80">
                        {BONUS_SOURCE_LABEL[g.source] ?? g.source}
                      </span>
                      <span className="font-mono text-[12px] font-bold text-text tabular-nums"><Cash>{fmt(g.remainingTzs, currency)}</Cash></span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-pill overflow-hidden bg-bg-sunken/70">
                      <div className={`h-full rounded-pill ${g.progressPct > 0 && g.progressPct < 100 ? "prog-sweep" : ""}`} style={{ width: `${g.progressPct}%`, background: "var(--gold-400)" }} />
                    </div>
                    <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-gold-200/55">
                      <span>{fmt(g.wageredTzs, currency)} / {fmt(g.wagerRequiredTzs, currency)} played</span>
                      {g.expiresAt && <span>exp {formatDateTimeSafe(g.expiresAt).split(",")[0]}</span>}
                    </div>
                  </div>
                ))}
                {grants.length > 3 && (
                  <p className="text-center font-mono text-[10px] text-gold-200/60">+{grants.length - 3} more bonus{grants.length - 3 > 1 ? "es" : ""}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mt-4">
            <p className="text-[13px] text-text/90 leading-snug">
              No bonuses yet — earn them by inviting friends and winning proposals.
              <span className="block italic text-[11px] mt-0.5 text-gold-200/60">
                Bado hujapata bonasi — zipate kwa kualika marafiki.
              </span>
            </p>
            <Link href="/profile/invite" className="btn btn-gold btn-sm rounded-pill mt-3 inline-flex">
              <I.gift s={12} />
              Invite &amp; earn · Alika upate
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function SubStat({ label, sw, value, hint }: { label: string; sw: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-3 py-2.5 backdrop-blur-md">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.10em] text-text-faint">{label}</p>
      <p className="font-mono font-bold text-[14px] tabular-nums text-text leading-tight"><Cash>{value}</Cash></p>
      <p className="text-[10px] italic text-text-subtle">{sw}</p>
      {hint && <p className="mt-0.5 text-[9.5px] text-text-faint">{hint}</p>}
    </div>
  );
}

function TxnRow({ tx }: { tx: Transaction }) {
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
            <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">Type</p>
            <p className="font-semibold text-text">{tx.type}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">Amount</p>
            <p className="font-mono font-bold tabular-nums text-text">{fmt(Math.abs(tx.amount))}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">Reference</p>
            <p className="font-mono text-text-muted truncate">{tx.id.slice(0, 16)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TxnPager({
  page, pageCount, total, onPrev, onNext,
}: { page: number; pageCount: number; total: number; onPrev: () => void; onNext: () => void }) {
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Activity pages">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-subtle tabular-nums">
        Page {page + 1} of {pageCount} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page === 0}
          aria-label="Previous page"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-bg-elevated px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted hover:text-text hover:border-brand-400 disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-muted transition-colors"
        >
          <I.chevronLeft s={13} /> Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pageCount - 1}
          aria-label="Next page"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-bg-elevated px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted hover:text-text hover:border-brand-400 disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-muted transition-colors"
        >
          Next <I.chevronRight s={13} />
        </button>
      </div>
    </nav>
  );
}

const TABS = [
  { v: "activity", en: "Activity",  sw: "Shughuli" },
  { v: "methods",  en: "Methods",   sw: "Njia" },
  { v: "limits",   en: "Limits",    sw: "Vikomo" },
] as const;

type Method = { id: string; name: string; phone: string; hue: number; default?: boolean };
const METHODS: Method[] = [
  { id: "MPESA",        name: "M-Pesa",        phone: "+2557*****99", default: true, hue: 152 },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  phone: "+2556*****20", hue: 22 },
  { id: "HALO_PESA",    name: "HaloPesa",      phone: "+2556*****11", hue: 80 },
  { id: "MIXX",         name: "Mixx by Yas",   phone: "+2557*****99", hue: 280 },
];

const LIMITS = [
  { label: "Daily deposit",   sw: "Amana ya siku",  value: "TZS 50,000" },
  { label: "Weekly deposit",  sw: "Amana ya wiki",  value: "TZS 250,000" },
  { label: "Monthly deposit", sw: "Amana ya mwezi", value: "TZS 1,000,000" },
  { label: "Daily loss",      sw: "Hasara ya siku", value: "TZS 20,000" },
  { label: "Session limit",   sw: "Muda wa kikao",  value: "60 min" },
];

export function WalletPageClient({
  balance, pending, hold, currency,
  transactions,
  bonusBalance, bonusActiveCount, bonusWagerRemaining, bonusGrants,
  isAuthed,
}: {
  balance: number; pending: number; hold: number; currency: string;
  transactions: Transaction[];
  bonusBalance: number; bonusActiveCount: number; bonusWagerRemaining: number; bonusGrants: BonusGrantView[];
  isAuthed: boolean;
}) {
  const [tab, setTab] = useState<typeof TABS[number]["v"]>("activity");
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(transactions.length / TXNS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedTxns = transactions.slice(safePage * TXNS_PER_PAGE, safePage * TXNS_PER_PAGE + TXNS_PER_PAGE);

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Wallet · Pochi</p>
          <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">Your funds</h1>
          <p className="text-[15px] italic text-text-subtle">Pesa zako</p>
        </div>
        {isAuthed && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/wallet/deposit" className="btn btn-gold btn-md inline-flex" style={{ borderRadius: "var(--r-pill)" }}>
              <I.arrowDown s={14} />
              Deposit
            </Link>
            <Link href="/wallet/withdraw" className="btn btn-ghost btn-md inline-flex" style={{ borderRadius: "var(--r-pill)" }}>
              <I.arrowUp s={14} />
              Withdraw
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
        <p className="sr-only">Bonus play-through remaining: {fmt(bonusWagerRemaining, currency)}</p>
      )}

      {/* Kit tabs — line variant rebuilt inline so we don't pull the legacy Tabs component. */}
      <nav role="tablist" aria-label="Wallet sections" className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = tab === t.v;
          return (
            <button
              key={t.v}
              type="button"
              role="tab"
              aria-selected={active ? "true" : "false"}
              onClick={() => setTab(t.v)}
              className={`relative h-9 px-3.5 font-display text-[13px] font-semibold transition-colors ${
                active ? "text-text" : "text-text-subtle hover:text-text-muted"
              }`}
            >
              {t.en}
              <span className="ml-1.5 text-[11px] italic font-normal text-text-subtle">· {t.sw}</span>
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
              {pagedTxns.map((t) => <TxnRow key={t.id} tx={t} />)}
            </div>
            {pageCount > 1 && (
              <TxnPager
                page={safePage}
                pageCount={pageCount}
                total={transactions.length}
                onPrev={() => setPage((p) => Math.max(0, p - 1))}
                onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              />
            )}
          </section>
        ) : (
          <EmptyState
            kind="audit"
            title="No activity yet"
            titleSw="Hakuna shughuli bado"
            body="Make your first deposit to start predicting."
            action={
              isAuthed ? (
                <Link href="/wallet/deposit" className="btn btn-gold btn-md">
                  Deposit · Weka pesa
                </Link>
              ) : undefined
            }
          />
        )
      )}

      {tab === "methods" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {METHODS.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md font-display font-bold text-[13px] text-text shrink-0"
                  style={{ background: `linear-gradient(135deg, oklch(45% 0.10 ${m.hue}), oklch(30% 0.08 ${m.hue}))` }}
                >
                  {m.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[13.5px] font-semibold text-text leading-tight truncate">{m.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-text-subtle tabular-nums">
                    <I.phone s={10} className="inline mr-1" />
                    {m.phone}
                  </p>
                </div>
              </div>
              {m.default ? (
                <span className="inline-flex items-center rounded-pill border border-gold-700 bg-gold-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-gold-300">
                  Default
                </span>
              ) : (
                <button type="button" disabled className="font-mono text-[11px] font-semibold text-text-subtle/60 uppercase tracking-[0.06em] cursor-not-allowed">
                  Set default
                </button>
              )}
            </div>
          ))}
          <div
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-bg-elevated/30 p-6 text-text-subtle/70 cursor-not-allowed"
          >
            <I.receipt s={15} />
            <span className="font-display text-[13px] font-semibold">Add a card · Ongeza kadi</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">Coming soon</span>
          </div>
        </section>
      )}

      {tab === "limits" && (
        <section className="space-y-3">
          {LIMITS.map((l) => (
            <div
              key={l.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3.5"
            >
              <div>
                <p className="font-display text-[13.5px] font-semibold text-text leading-tight">{l.label}</p>
                <p className="mt-0.5 text-[11.5px] italic text-text-subtle">{l.sw}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[14px] tabular-nums text-text">{l.value}</span>
                <Link
                  href="/profile/responsible-gambling"
                  className="inline-flex items-center px-2.5 h-7 rounded-md border border-border bg-bg-overlay text-text-muted hover:text-text font-mono text-[11px] font-semibold transition-colors"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
          <div className="rounded-xl glass-panel p-4 space-y-2">
            <p className="font-display text-[13.5px] font-semibold text-text">
              Self-exclusion <span className="text-text-subtle italic font-normal">· Kujitenga</span>
            </p>
            <p className="text-[12.5px] text-text-muted leading-snug">
              Take a break — we&apos;ll lock your account for the period you choose.
              <span className="block italic text-text-subtle text-[11.5px] mt-0.5">
                Pumzika. Tutafunga akaunti kwa muda uliochagua.
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["24h", "7d", "30d", "6m", "Permanent"].map((o) => (
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
