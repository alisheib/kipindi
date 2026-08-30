import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { AdminMeter } from "@/components/admin/admin-charts";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { PaymentLogo } from "@/components/wallet/payment-logo";
import { allMnoHealth, getKillSwitches, reconcile, retryQueue } from "@/lib/server/payment-ops";
import { getPaymentControls } from "@/lib/server/payment-control";
import { getFloatBalance, refreshRailProbes, PAYOUT_LADDER } from "@/lib/server/payments";
import { PAYOUT_RAILS } from "@/lib/server/selcom";
import { formatTzs, formatTzsCompact, formatDateTime } from "@/lib/utils";
import { KillSwitch } from "./kill-switch-toggle";
import { ControlPlane } from "./control-plane";
import { txnTypeLabel, txnProviderLabel } from "@/components/admin/status-badge";
import { RetryControls } from "./retry-controls";
import { ReconcileControls } from "./reconcile-controls";
import { BulkRetryControls } from "./bulk-retry-controls";
import { StuckPayoutControls } from "./stuck-payout-controls";
import { PayoutStatusControl } from "./payout-status-control";
import { getPayoutStatus } from "@/lib/server/payout-status";
import { db } from "@/lib/server/store";
import { AdminBody } from "@/components/admin/admin-body";
import { SelcomStatementCard } from "./selcom-statement-card";
import { buildSelcomStatement, asRailTotals, TALLY_TYPES } from "@/lib/server/selcom-statement";

export const metadata = { title: "Admin · Payments ops" };
export const dynamic = "force-dynamic";

const MNO_HUE: Record<string, number> = { MPESA: 150, AIRTEL_MONEY: 25, HALO_PESA: 240, MIXX: 290 };
const ms = (n: number | null) => (n === null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`);
const ageLabel = (msv: number) => {
  const h = Math.floor(msv / 3_600_000);
  if (h >= 1) return `${h}h`;
  return `${Math.max(0, Math.floor(msv / 60_000))}m`;
};

export default async function PaymentsOpsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  // `railProbes` asks each Selcom payout endpoint whether it is provisioned for this
  // vendor. It moves NO money (a signed status query for a transid that does not
  // exist) and it is the thing that answers, in seconds, the question that cost an
  // entire evening on 2026-07-29: is the rail down, or was it never switched on?
  // B-1: failed reads carry an explicit `null` = "couldn't read" (rendered via
  // AdminLoadError / an honest Unavailable line) — never an empty [] that hides
  // a live alarm list or a probe result behind a benign blank.
  const [health, kill, recon, queue, controls, floatBal, railProbes, payouts] = await Promise.all([
    allMnoHealth(), getKillSwitches(), reconcile(), retryQueue(), getPaymentControls(),
    getFloatBalance().catch(() => null),
    refreshRailProbes().catch(() => null),
    getPayoutStatus(),
  ]);
  // ⭐ THREE DB-SIDE TALLIES, NOT A LEDGER WALK. `report-money.ts` records what walking
  // this table costs — 3,176 ms and 333 MB of heap — and the Transaction table already
  // holds 20,000+ rows. B-1: a failed read is an explicit `null`, so the card renders the
  // honest load-error branch instead of a statement full of fabricated zeros, which on a
  // regulator-facing page would read as "no money has ever moved".
  const railTotalsRaw = await db.txn.totalsByType([...TALLY_TYPES]).catch(() => null);
  const railTotals = railTotalsRaw === null ? null : asRailTotals(railTotalsRaw);
  // Payouts frozen in PROCESSING. A withdrawal whose provider call was refused
  // outright (e.g. Selcom's 403 "endpoint not enabled") never becomes terminal, so
  // nothing automatic can resolve it and the player's money stays held. Surfaced
  // here, oldest first, so an officer can see and release them.
  const FROZEN_AFTER_MS = 30 * 60 * 1000;
  const frozenPayoutsRead = await db.txn.listByStatus("PROCESSING").catch(() => null);
  const frozenPayouts = frozenPayoutsRead === null ? null : frozenPayoutsRead
    .filter((t) => t.type === "WITHDRAWAL" && Date.now() - Date.parse(t.createdAt) > FROZEN_AFTER_MS)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(0, 25);
  const page = parsePage(sp.page, queue.length);
  const queueRows = queue.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const base = buildBaseHref("/admin/payments", sp);

  return (
    <>
      <AdminPageHead
        title="Payments operations"
        sw="Operesheni za malipo"
        actions={
          <span className="font-mono text-micro uppercase eyebrow text-text-subtle">MNO health · 24h window</span>
        }
      />

      <AdminBody>
        {/* Operations control-plane — mode indicator + runtime payment toggles. */}
        <AdminCard title="Operations control-plane" sw="Udhibiti wa uendeshaji">
          <ControlPlane controls={controls} />
        </AdminCard>

        {/* F1 — what players are told about withdrawals. First card after the control-plane
            because while payouts cannot be paid it is the most consequential thing on the page. */}
        <AdminCard title="What players are told about withdrawals" sw="Wanachoambiwa wachezaji kuhusu kutoa pesa">
          <PayoutStatusControl
            declared={payouts.declared}
            derived={payouts.derived}
            effective={payouts.status}
            note={payouts.note}
            stuckCount={payouts.stuckCount}
            oldestStuckHours={payouts.oldestStuckHours}
            derivedOverrodeDeclared={payouts.derivedOverrodeDeclared}
          />
        </AdminCard>

        {/* ⭐ THE SELCOM SURFACE — Jay's #7. Both balances (one live, one honestly absent
            because Selcom does not publish it) plus the statement of what actually crossed
            the rail. ⛔ It REPLACED a bare disbursement-float strip rather than sitting
            beside it: two Selcom money cards on one page is how an officer ends up reading
            the wrong one. Every provenance label is derived from the figure it sits under —
            see `selcom-statement-card.tsx`. */}
        <AdminCard title="Selcom" sw="Selcom">
          {railTotals === null
            ? <AdminLoadError what="the Selcom statement tallies" />
            : <SelcomStatementCard statement={buildSelcomStatement(railTotals, floatBal?.balance ?? null)} />}
        </AdminCard>

        {/* Payout rails — which Selcom disbursement products are actually provisioned
            for this vendor. Probed live (money-free status queries) on every load.
            A payout tries the ladder in order and skips anything marked NOT ENABLED. */}
        {railProbes === null && (
          <AdminCard title="Payout rails" sw="Njia za malipo">
            <AdminLoadError what="the payout-rail probes" />
          </AdminCard>
        )}
        {railProbes !== null && railProbes.length > 0 && (
          <AdminCard title="Payout rails" sw="Njia za malipo">
            <div className="space-y-2">
              {railProbes.map((p) => {
                const rung = PAYOUT_LADDER.indexOf(p.rail);
                const tone = p.verdict === "ENABLED" ? "text-success" : p.verdict === "NOT_ENABLED" ? "text-danger" : "text-warning";
                return (
                  <div key={p.rail} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={`font-mono text-micro uppercase tracking-[0.12em] ${tone}`}>
                      {p.verdict === "ENABLED" ? "enabled" : p.verdict === "NOT_ENABLED" ? "not enabled" : "unknown"}
                    </span>
                    <span className="font-mono text-[11px] text-text">{PAYOUT_RAILS[p.rail].label}</span>
                    <span className="font-mono text-[10px] text-text-subtle">
                      {rung >= 0 ? `fallback #${rung + 1}` : "manual only"}
                    </span>
                    <span className="font-mono text-[10px] text-text-tertiary break-all">{p.detail}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 font-mono text-[10px] text-text-tertiary">
              A payout walks the ladder in order and skips a rail Selcom has told us is not provisioned.
              It advances ONLY on a definitive refusal — never on a timeout, which might still be in flight.
              &ldquo;Manual only&rdquo; rails are implemented and reachable, but never substituted automatically.
            </p>
          </AdminCard>
        )}

        {/* Frozen payouts — a player's money held with nothing able to release it.
            B-1: a FAILED read renders the explicit load-error card, never a blank
            (a hidden alarm list is indistinguishable from "all clear"). */}
        {frozenPayouts === null && (
          <AdminCard>
            <AdminLoadError what="the frozen-payouts alarm list" />
          </AdminCard>
        )}
        {frozenPayouts !== null && frozenPayouts.length > 0 && (
          <AdminCard>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-2 font-mono text-micro uppercase eyebrow text-danger">
                <I.alertCircle s={14} /> Frozen payouts · {frozenPayouts.length}
              </span>
              <span className="font-mono text-[10px] text-text-tertiary">
                In PROCESSING over 30 minutes — the player&rsquo;s money is held and nothing automatic can release it.
              </span>
            </div>
            <ul className="mt-3 space-y-2 border-t border-border-subtle pt-3">
              {frozenPayouts.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <p className="amount text-caption text-text-secondary">
                      {formatTzs(Math.abs(t.amount))} · {t.msisdn ?? "—"} · held {ageLabel(Date.now() - Date.parse(t.createdAt))}
                    </p>
                    {/* What the gateway last said. Before 2026-07-29 this was never
                        recorded and a frozen payout was completely unexplainable. */}
                    <p className="font-mono text-[9.5px] text-text-tertiary break-all">
                      {t.id} · {t.providerStatus ?? "no provider response recorded"}
                    </p>
                  </div>
                  <StuckPayoutControls txnId={t.id} amountLabel={formatTzs(Math.abs(t.amount))} />
                </li>
              ))}
            </ul>
          </AdminCard>
        )}

        {/* Reconciliation strip — ledger vs PSP settlement. */}
        <AdminCard>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="inline-flex items-center gap-2 font-mono text-micro uppercase eyebrow text-text-subtle">
              <I.reconcile s={14} className="text-text-tertiary" /> Reconciliation · Ulinganishaji · 24h
            </span>
            <Stat label="Matched" value={recon.matched.toLocaleString()} />
            <Stat label="Unmatched" value={recon.unmatched.toLocaleString()} tone={recon.unmatched > 0 ? "danger" : "ok"} />
            {/* Was a THIRD hand-rolled copy of <Stat> two lines under two uses of
                it — same span, same 15px mono value, same danger/plain ternary.
                Identical output, one definition. */}
            <Stat label="Drift" value={formatTzs(recon.driftTzs)} tone={recon.driftTzs !== 0 ? "danger" : "ok"} />
            {recon.driftTzs !== 0 && (
              <Link href={"/admin/audit?category=WALLET" as Route} className="ml-auto inline-flex items-center gap-1 font-mono text-caption uppercase tracking-[0.08em] text-claret-300 hover:underline">
                <I.search s={12} /> Investigate
              </Link>
            )}
          </div>
          <p className="mt-2 font-mono text-[10px] text-text-tertiary">A confirmed movement reconciles when it carries the PSP correlation ref. Drift must be TZS 0.</p>
          {recon.unmatchedRefs.length > 0 && (
            <div className="mt-3 border-t border-border-subtle pt-3">
              {/* ⛔ DG-A-12 · §T3/§T4 — THIS IS PROSE, AND IT WAS DRESSED AS AN EYEBROW.
                  §T3: the sub-micro tier is UPPERCASE mono tracking microlabels only and
                  ⛔ "never reading copy"; §T4 puts the reading floor at 12.5px. A nine-word
                  instruction — "match to a PSP ref or write off" — is a sentence, so at 9.5px
                  uppercase it broke both. `text-body-sm` (13) is the first rung at or above the
                  floor. ⛔ It is EXEMPTED BY NAME in `qa:dg-eyebrow`: the sweep that moved the
                  other 134 sites onto `text-micro` would have pushed this one a rung FURTHER
                  below the floor and counted it as a win. `font-mono` stays — the note directly
                  above it (L210) is mono, and matching the neighbour is the rule here. */}
              <p className="font-mono text-body-sm text-text-subtle mb-2">Unmatched movements — match to a PSP ref or write off (A3)</p>
              <ul className="space-y-1.5">
                {recon.unmatchedRefs.map((id) => (
                  <li key={id} className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-mono text-[10.5px] text-text-tertiary">{id}</span>
                    <ReconcileControls txnId={id} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AdminCard>

        {/* Per-MNO health cards. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {health.map((h) => {
            const k = kill[h.id] ?? { deposits: false, withdrawals: false };
            const anyPaused = k.deposits || k.withdrawals;
            const pip = h.successRate === null ? "neutral" : h.successRate >= 98 ? "yes" : h.successRate >= 95 ? "warning" : "no";
            return (
              <AdminCard key={h.id} className={anyPaused ? "border-claret-edge" : ""}>
                {/* Header — claret-tinted when a flow is paused. */}
                <div className="flex items-center gap-2.5">
                  <PaymentLogo id={h.id} name={h.label} hue={MNO_HUE[h.id] ?? 220} size={34} />
                  <div className="min-w-0">
                    <p className="font-display text-[14px] font-bold text-text leading-tight">{h.label}</p>
                    {anyPaused && k.at ? (
                      <p className="font-mono text-micro uppercase tracking-[0.1em] text-claret-300">
                        PAUSED{k.by ? ` BY ${k.by.slice(0, 10)}` : ""} · {formatDateTime(k.at)}
                      </p>
                    ) : (
                      <p className="font-mono text-micro uppercase tracking-[0.1em] text-text-subtle">Live · malipo</p>
                    )}
                  </div>
                  <div className="ml-auto text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: pip === "yes" ? "var(--yes-400)" : pip === "warning" ? "var(--warning-fg)" : pip === "no" ? "var(--no-400)" : "var(--text-subtle)" }} />
                      <span className="font-mono text-[20px] font-bold tabular-nums leading-none" style={{ color: pip === "no" ? "var(--no-300)" : "var(--text)" }}>
                        {h.successRate === null ? "—" : `${h.successRate.toFixed(1)}%`}
                      </span>
                    </div>
                    <p className="font-mono text-micro uppercase eyebrow text-text-subtle">success · 24h</p>
                  </div>
                </div>

                {/* Latency + last failure. */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-border-subtle pt-2.5 text-[11px]">
                  <Metric label="p50" value={ms(h.p50Ms)} />
                  <Metric label="p95" value={ms(h.p95Ms)} />
                  <Metric label="txns" value={`${h.confirmed}✓ ${h.failed}✕`} />
                </div>
                {h.lastFailure && (
                  <p className="mt-1.5 font-mono text-[10px] text-no-300 truncate" title={h.lastFailure.reason}>
                    last fail: {h.lastFailure.reason} · {formatDateTime(h.lastFailure.at)}
                  </p>
                )}

                {/* Deposit / withdraw split meters. */}
                <div className="mt-3 space-y-2">
                  <AdminMeter label="Deposits (24h)" value={h.deposits.volume} cap={Math.max(h.deposits.volume, h.withdrawals.volume, 1)} thresholdPct={0} format={(n) => formatTzsCompact(n)} />
                  <AdminMeter label="Withdrawals (24h)" value={h.withdrawals.volume} cap={Math.max(h.deposits.volume, h.withdrawals.volume, 1)} thresholdPct={0} format={(n) => formatTzsCompact(n)} />
                </div>

                {/* Kill-switches. */}
                <div className="mt-3 border-t border-dashed border-border-subtle pt-2.5">
                  <p className="mb-1.5 font-mono text-micro uppercase eyebrow text-text-subtle">Kill-switch · Zima</p>
                  <KillSwitch provider={h.id} label={h.label} deposits={k.deposits} withdrawals={k.withdrawals} />
                </div>
              </AdminCard>
            );
          })}
        </div>

        {/* Retry queue. */}
        <AdminCard title="Retry queue · Foleni ya majaribio" sw="Failed deposits & withdrawals" padding={queue.length ? "p-0" : "p-4"} action={queue.length > 1 ? <BulkRetryControls /> : undefined}>
          {queue.length === 0 ? (
            <div className="flex items-center gap-2.5 text-caption text-text-secondary">
              <I.checkCircle s={16} className="text-yes-300" /> No failed transactions — the rails are clear.
            </div>
          ) : (
            <ScrollX label="Retry queue">
              <table className="admin-tbl min-w-[640px]">
                <thead>
                  <tr>
                    <th className="text-left">Ref</th>
                    <th className="text-left">MNO</th>
                    <th className="text-left">Type</th>
                    <th className="text-right">Amount</th>
                    <th className="text-left">Reason</th>
                    <th className="text-right">Age</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queueRows.map((r) => (
                    <tr key={r.id} className={r.ageMs > 3_600_000 ? "border-l-2 border-no-500" : ""}>
                      <td className="font-mono text-text-subtle">{r.id.slice(0, 14)}…</td>
                      <td className="font-mono">{txnProviderLabel(r.provider)}</td>
                      <td><Chip size="sm" variant={r.type === "DEPOSIT" ? "info" : "neutral"}>{txnTypeLabel(r.type)}</Chip></td>
                      <td className="font-mono tabular text-right">{formatTzs(r.amount)}</td>
                      <td className="text-no-300 text-[12px] truncate max-w-[220px]" title={r.reason}>{r.reason}</td>
                      <td className={`font-mono tabular text-right ${r.ageMs > 3_600_000 ? "text-no-300" : "text-text-tertiary"}`}>{ageLabel(r.ageMs)}</td>
                      <td className="text-right"><RetryControls txnId={r.id} type={r.type} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
          {queue.length > 0 && <AdminPagination total={queue.length} page={page} baseHref={base} />}
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg">
          <p className="text-caption text-text-secondary">
            <span className="text-text font-bold">Live telemetry.</span> Success rate, latency, failures and reconciliation are computed from the real
            transaction record over the last 24h — no data is fabricated. Latency percentiles come only from movements that recorded a settlement time.
            A per-MNO settlement-file feed will replace the ref-based reconciliation when the aggregator contract is signed.
          </p>
        </AdminCard>
      </AdminBody>
    </>
  );
}

/**
 * ⛔ NOT YET FOLDED ONTO `ui/stat.tsx`, AND ON PURPOSE — stage 9b, 2026-08-21.
 *
 * `ui/stat.tsx` was widened to absorb these two: its LABEL dictionary names
 * `quiet` "admin/payments Stat" and `tiny` "admin/payments Metric", and both
 * labels do match, character for character. The VALUES do not, and folding them
 * anyway would repaint this strip:
 *
 *   Stat · tone      here `text-danger` = --danger-500 = oklch(57% 0.22 25).
 *                    The kit's nearest tone is `no` = --no-300 = oklch(80% 0.14
 *                    22) — a far lighter red, on the one figure an officer reads
 *                    to decide whether the ledger and the PSP disagree. There is
 *                    no `danger` tone to ask for.
 *   Stat · leading   here the value inherits body 1.5 (22.5px on a 15px figure);
 *                    every kit rung hard-codes `leading-tight`/`leading-none`, so
 *                    the strip would lose ~3.75px of height. No prop reaches it.
 *   Metric · size    here the value carries NO font-size and NO weight — it
 *                    inherits the 11px of its `text-[11px]` grid. The kit's
 *                    smallest rung is 13.5px and it always applies `font-bold`.
 *                    There is no "inherit" rung.
 *
 * A migration that changes what an officer sees is not a migration, so these
 * stay until `ui/stat.tsx` grows: a `danger` tone, a `lead` escape (or an
 * `inherit`/`none` rung), and a way to opt out of `font-bold`. That file is not
 * this group's to edit; this note is the request, and it is the whole remaining
 * distance.
 *
 * ⚠️ Whoever closes it: the third copy of `Stat` — the "Drift" tile — is already
 * folded into this one, so there are now exactly two definitions to remove, not
 * three.
 */
function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  return (
    <div>
      <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{label}</span>
      <p className={`font-mono text-[15px] font-bold tabular-nums ${tone === "danger" ? "text-danger" : "text-text"}`}>{value}</p>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{label}</span>
      <p className="font-mono tabular-nums text-text">{value}</p>
    </div>
  );
}
