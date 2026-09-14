import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard, AdminKpi, FeedRow, AdminLoadError } from "@/components/admin/admin-shell";
import { txnTypeLabel } from "@/components/admin/status-badge";
import { TWO_PERSON_THRESHOLD_TZS } from "../aml/constants";
import { WITHDRAW_MAX_TZS } from "@/lib/server/validators";
import { SOF_SINGLE_TXN_TZS, SOF_ROLLING_30D_TZS } from "@/lib/server/wallet-service";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { db, type StoredTxn, type StoredSourceOfFunds, type StoredKycStageRow } from "@/lib/server/store";
import { ID_DOC_SPECS, type IdDocType } from "@/lib/id-documents";
import { getAuditPage } from "@/lib/server/audit";
import { listPendingKyc } from "@/lib/server/kyc-service";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { kycMoneyRows } from "@/lib/server/kyc-money";
import {
  readKycQueueIdentity,
  readBlockedCashOuts,
  blockedCashOutsByPlayer,
  compareQueuePriority,
  kycHeldBucket,
  kycWaitedLabel,
  KYC_HELD_BUCKET_LABEL,
} from "@/lib/server/kyc-risk";
import { approvedEver } from "@/lib/kyc-approval";
import { walletHeldTzs } from "@/lib/kyc-stage";
import { SofReviewRow } from "./sof-review-client";
import { formatDateTime, formatTzs, formatTzsCompact } from "@/lib/utils";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

export const metadata = { title: "Admin · Approvals" };
export const dynamic = "force-dynamic";

type KycField = "priority" | "waited" | "user" | "name" | "docs" | "held";

/**
 * /admin/approvals — the officer queues that need a decision.
 *
 * ⭐ WHAT CHANGED ON 2026-09-13, AND WHY. From that date identity is asked before a WITHDRAWAL and before
 * nothing else (docs/COMPLIANCE-DECISIONS.md 2026-09-13), so every file in the KYC queue below can belong to
 * an account that already holds money, and a declaration in the source-of-funds queue can come from an
 * account whose identity was never approved. Three things on this page follow from that:
 *   · the dead "Avg cosign time" tile (it printed "—" and was never computed) is replaced by the one
 *     identity × money figure this page's officers need: funded accounts that have sent nothing;
 *   · the KYC queue's default order is money-weighted age for a viewer with money rights (see below);
 *   · the source-of-funds table says, per row, whether identity was ever approved.
 * The full identity queue — with us, with the player, funded — is /admin/kyc.
 */
export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    kycpage?: string; kycsort?: string; kycdir?: string;
    amlpage?: string; amlsort?: string; amldir?: string;
    sofpage?: string; sofsort?: string; sofdir?: string;
  }>;
}) {
  const sp = await searchParams;
  const now = Date.now();
  const session = await currentSession();
  // 🔴 ASKED BEFORE ANY WALLET IS READ (2026-09-13) — the gate /admin/kyc and the roster use. A viewer without
  // money rights gets the files, FIFO, and no balance, bucket or funded count.
  const canSeeMoney = session ? await canView(session.role, "accounting") : false;

  // A-5: track whether each queue read FAILED (vs genuinely empty), so a backend
  // error shows an explicit "couldn't load" state — never a false "queue empty"
  // that hides pending compliance work.
  let amlAll: StoredTxn[] = [];
  let amlFailed = false;
  try { amlAll = (await db.txn.listByStatus("AML_REVIEW")) as StoredTxn[]; } catch { amlFailed = true; }
  let sofAll: StoredSourceOfFunds[] = [];
  let sofFailed = false;
  try { sofAll = (await db.sourceOfFunds.listPending()) as StoredSourceOfFunds[]; } catch { sofFailed = true; }
  let kycFailed = false;
  const kycPendingAll = await listPendingKyc().catch(() => { kycFailed = true; return []; });
  const recent = getAuditPage({ category: "ADMIN", limit: 60 });
  // ⚠️ THE LOG'S EMPTY TEST READS THIS FILTERED LIST (2026-09-13). It read `recent` — every ADMIN row — so a
  // console with admin activity but no approval among it drew the card with nothing inside at all.
  const recentApprovals = recent.filter((e) => e.action.startsWith("aml.") || e.action.startsWith("sof.") || e.action.startsWith("player.")).slice(0, 30);

  // ⭐ ONE identity × money read (`readKycQueueIdentity`, shared with /admin/kyc) serves the funded tile, the
  // queue's held bucket and the source-of-funds identity column. ⛔ Each half's failure is its own state.
  const [identity, blocked] = await Promise.all([
    readKycQueueIdentity(canSeeMoney),
    readBlockedCashOuts().catch(() => null),
  ]);
  const { facts, wallets, walletsFailed } = identity;
  /** Money is APPLIED only for a viewer with money rights whose wallet read succeeded. */
  const moneyKnown = canSeeMoney && wallets !== null;
  const walletByUser = new Map((wallets ?? []).map((w) => [w.userId, w] as const));
  const factsByUser = new Map<string, StoredKycStageRow>();
  for (const f of facts ?? []) if (!factsByUser.has(f.userId)) factsByUser.set(f.userId, f);
  const attemptsByUser = blocked ? blockedCashOutsByPlayer(blocked) : null;

  // Funded, nothing submitted — `kycMoneyRows` is one row per WALLET, so an account with no submission row at
  // all (the normal state of a new player since 2026-09-13) is counted. Null = not computable, never zero.
  const funded = moneyKnown && facts && wallets
    ? kycMoneyRows(facts, wallets).filter((r) => r.stage === "funded_nothing_yet")
    : null;
  const fundedHeld = (funded ?? []).reduce((s, r) => s + r.heldTzs, 0);

  // ── KYC queue (prefix "kyc") ────────────────────────────────────────────────
  // ⛔ THE ORDERING DRIFT, FIXED 2026-09-13. `listPendingKyc` returns FIFO and this page re-sorted it NEWEST
  // first by default — the newest file on top of a queue whose oldest file may be a player waiting on their
  // own money. The default is now `compareQueuePriority` (kyc-risk.ts: a refused cash-out first, then the held
  // BUCKET, oldest first inside it — never balance × age) for a viewer with money rights, and oldest first for
  // everyone else. ⭐ "Waited · FIFO" sorts by time WAITED, so its first click (descending) IS oldest first.
  type KycRow = (typeof kycPendingAll)[number];
  const waitingSince = (k: KycRow) => k.submittedAt ?? k.updatedAt;
  const heldOf = (k: KycRow) => (moneyKnown ? walletHeldTzs(walletByUser.get(k.userId)) : 0);
  const attemptsOf = (k: KycRow) => attemptsByUser?.get(k.userId)?.count ?? 0;
  const kycAllowed: readonly KycField[] = moneyKnown
    ? ["priority", "waited", "user", "name", "docs", "held"]
    : ["waited", "user", "name", "docs"];
  const kyc = parseSort<KycField>(sp, kycAllowed, moneyKnown ? "priority" : "waited", "desc", "kyc");
  const kycSorted =
    kyc.sort === "priority"
      ? [...kycPendingAll].sort(
          compareQueuePriority<KycRow>((k) => ({ attemptedCashOut: attemptsOf(k) > 0, heldTzs: heldOf(k), waitingSince: waitingSince(k) }), kyc.dir),
        )
      : applySort(kycPendingAll, kyc.sort, kyc.dir, {
          waited: (k) => now - Date.parse(waitingSince(k)),
          user: (k) => k.userId,
          name: (k) => k.fullName ?? "",
          docs: (k) => k.documents.length,
          held: (k) => heldOf(k),
        });
  const kycPage = parsePage(sp.kycpage, kycSorted.length);
  const kycPending = kycSorted.slice((kycPage - 1) * PER_PAGE, kycPage * PER_PAGE);
  const kycBase = buildBaseHref("/admin/approvals", sp, "kycpage");

  // AML queue (prefix "aml") — newest first by default.
  const amlS = parseSort(sp, ["time", "type", "amount"] as const, "time", "desc", "aml");
  const amlSorted = applySort(amlAll, amlS.sort, amlS.dir, {
    time: (t) => t.createdAt,
    type: (t) => t.type,
    amount: (t) => Math.abs(t.amount),
  });
  const amlPage = parsePage(sp.amlpage, amlSorted.length);
  const aml = amlSorted.slice((amlPage - 1) * PER_PAGE, amlPage * PER_PAGE);
  const amlBase = buildBaseHref("/admin/approvals", sp, "amlpage");

  // SOF declarations (prefix "sof") — newest first by default.
  const sofS = parseSort(sp, ["submitted", "user", "source", "income"] as const, "submitted", "desc", "sof");
  const sofSorted = applySort(sofAll, sofS.sort, sofS.dir, {
    submitted: (s) => s.submittedAt,
    user: (s) => s.userId,
    source: (s) => s.declaredSource,
    income: (s) => s.declaredAnnualIncomeBand,
  });
  const sofPage = parsePage(sp.sofpage, sofSorted.length);
  const sof = sofSorted.slice((sofPage - 1) * PER_PAGE, sofPage * PER_PAGE);
  const sofBase = buildBaseHref("/admin/approvals", sp, "sofpage");

  return (
    <>
      {/* ⚠️ 2026-09-13 — WAS "Two-person approvals" with a "Co-sign required" chip. The only co-sign on this page
          was the AML withdrawal hold (KYC and source-of-funds decisions are single-officer), and since the owner's
          ruling of that date no withdrawal is held for review. The nav already names this destination "Approvals". */}
      <AdminPageHead title="Approvals" sw="Idhini" />

      <AdminBody>
        <KpiGrid>
          <AdminKpi label="KYC pending" sw="Vitambulisho" value={kycFailed ? "" : kycPendingAll.length} unavailable={kycFailed} pulse={!kycFailed && kycPendingAll.length > 0} />
          <AdminKpi label="AML pending" sw="Inasubiri ukaguzi" value={amlFailed ? "" : amlAll.length} unavailable={amlFailed} pulse={!amlFailed && amlAll.length > 0} />
          <AdminKpi label="SOF declarations" sw="Asili ya pesa" value={sofFailed ? "" : sofAll.length} unavailable={sofFailed} pulse={!sofFailed && sofAll.length > 0} />
          {/* ⛔ WAS "Avg cosign time", value "—", never computed (removed 2026-09-13). A tile that always
              reads "—" teaches an officer to skip the row it sits in. The count is money-derived, so a viewer
              without money rights is told why it is withheld rather than shown a zero. */}
          <AdminKpi
            label="Funded · none sent"
            sw="Wana pesa · hawajatuma"
            value={!canSeeMoney ? "—" : funded ? String(funded.length) : ""}
            unavailable={canSeeMoney && !funded}
            delta={!canSeeMoney ? "not in your role" : funded ? `${formatTzsCompact(fundedHeld)} held` : undefined}
          />
        </KpiGrid>

        {/* KYC review queue */}
        <AdminCard
          title="KYC · awaiting verification"
          sw="Vitambulisho vinasubiri"
          action={<Link href={"/admin/kyc" as Route} className="row-link font-mono text-micro text-royal-300">KYC queue →</Link>}
        >
          {kycFailed ? (
            <AdminLoadError what="the KYC queue" />
          ) : kycPendingAll.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              {/* shrink-0 (2026-09-13): at 390 the flex row squeezed this 18px glyph to about 8px beside the sentence. */}
              <I.shieldcheck s={18} className="shrink-0" />
              <p className="text-caption text-text-secondary">No identity submissions pending. New submissions appear here the moment a player submits for review.</p>
            </div>
          ) : (
            <>
            {moneyKnown ? (
              <p className="mb-3 text-body-sm text-text-muted max-w-[80ch]">
                Priority order: a refused cash-out first, then what the account holds, oldest first inside each group.
                &ldquo;Waited · FIFO&rdquo; orders by submission alone.
              </p>
            ) : canSeeMoney && walletsFailed ? (
              <p className="mb-3 text-body-sm text-warning-fg">
                Balances could not be read, so this queue is shown oldest first, without the holding column or the priority order.
              </p>
            ) : null}
            {!blocked ? (
              <p className="mb-3 text-body-sm text-warning-fg">
                Refused cash-outs could not be read, so no row is flagged for one{moneyKnown ? " and the priority order cannot put those players first" : ""}.
              </p>
            ) : blocked.truncated ? (
              <p className="mb-3 text-body-sm text-warning-fg">
                Refused cash-outs are read from the newest {blocked.rows.length} of {blocked.total} in the compliance log; an older one is not flagged here.
              </p>
            ) : null}
            <ScrollX label="KYC queue" className="-mx-4 px-4">
              <table className="admin-tbl min-w-[720px]">
                <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                  <tr>
                    {moneyKnown ? (
                      <SortTh field="priority" label="Priority" current={kyc.sort} dir={kyc.dir} sp={sp} baseHref="/admin/approvals" prefix="kyc" className="py-2 pr-3" />
                    ) : (
                      <th className="text-left py-2 pr-3">Flags</th>
                    )}
                    <SortTh field="waited" label="Waited · FIFO" current={kyc.sort} dir={kyc.dir} sp={sp} baseHref="/admin/approvals" prefix="kyc" className="py-2 pr-3" />
                    <SortTh field="user" label="User" current={kyc.sort} dir={kyc.dir} sp={sp} baseHref="/admin/approvals" prefix="kyc" className="py-2 pr-3" />
                    {/* ⚠️ NOT "Name (NIDA)". A player proves identity with any ONE of four
                        documents (docs/IDENTITY-POLICY.md) and this queue holds all four, so
                        naming one of them here told the officer the wrong thing about three
                        quarters of their own queue. The document a row actually used is on the
                        workstation screen, where the decision is made. */}
                    <SortTh field="name" label="Name (ID document)" current={kyc.sort} dir={kyc.dir} sp={sp} baseHref="/admin/approvals" prefix="kyc" className="py-2 pr-3" />
                    <SortTh field="docs" label="Docs" current={kyc.sort} dir={kyc.dir} sp={sp} baseHref="/admin/approvals" prefix="kyc" className="py-2 pr-3" />
                    {moneyKnown && <SortTh field="held" label="Holding" current={kyc.sort} dir={kyc.dir} sp={sp} baseHref="/admin/approvals" prefix="kyc" align="right" className="py-2 pr-3" />}
                    <th className="text-right py-2 pl-3">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {kycPending.map((k) => {
                    // ⚠️ THE DENOMINATOR IS PER DOCUMENT — IT WAS HARD-WRITTEN "/3".
                    // Three is the NIDA slot count (front · back · selfie). A COMPLETE passport,
                    // driving-licence or voter's-card file carries TWO (the document · selfie),
                    // so it was shown to the officer as "2/3" — a finished submission reading as
                    // one short, on the screen that gates a withdrawal. `requiredSlots` is the
                    // catalogue's own answer, so a fifth document needs no edit here.
                    // Where the type is missing we print the count alone rather than assert a
                    // requirement we cannot name (§C — no invented figure).
                    const slots = k.idType ? ID_DOC_SPECS[k.idType as IdDocType]?.requiredSlots.length : undefined;
                    const attempts = attemptsByUser?.get(k.userId);
                    const bucket = kycHeldBucket(heldOf(k));
                    const moreAsked = k.status === "ADDITIONAL_INFO_REQUIRED";
                    return (
                    <tr key={k.id} className="border-b border-border-subtle/50 last:border-b-0" data-kyc-approvals-row={k.userId}>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {/* nowrap through `style` (2026-09-14): Chip sets white-space inline (G-7), so a class cannot reach
                              it, and the auto-width column folded "More info asked" and "Holds nothing" onto two lines. */}
                          {attempts && <Chip size="sm" variant="danger" style={{ whiteSpace: "nowrap" }}>{attempts.count > 1 ? `Cash-out refused ×${attempts.count}` : "Cash-out refused"}</Chip>}
                          {moneyKnown && <Chip size="sm" variant={bucket >= 2 ? "warning" : "neutral"} style={{ whiteSpace: "nowrap" }}>{KYC_HELD_BUCKET_LABEL[bucket]}</Chip>}
                          {/* The PLAYER's move: `listPendingKyc` still holds it, so it is said rather than hidden. */}
                          {moreAsked && <Chip size="sm" variant="neutral" style={{ whiteSpace: "nowrap" }}>More info asked</Chip>}
                          {!moneyKnown && !attempts && !moreAsked && <span className="text-text-tertiary">—</span>}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono whitespace-nowrap">
                        {formatDateTime(waitingSince(k))}
                  <span className="block text-text-tertiary">{kycWaitedLabel(now - Date.parse(waitingSince(k)))}</span>
                      </td>
                      <td className="py-2 pr-3"><a href={`/admin/players/${k.userId}?tab=kyc`} className="font-mono text-royal-300 hover:underline">{k.userId.slice(0, 14)}…</a></td>
                      <td className="py-2 pr-3 font-medium text-text">{k.fullName ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono tabular">{slots ? `${k.documents.length}/${slots}` : k.documents.length}</td>
                      {moneyKnown && <td className="py-2 pr-3 font-mono tabular-nums text-right text-text">{formatTzs(heldOf(k))}</td>}
                      <td className="py-2 pl-3 text-right"><a href={`/admin/kyc/${k.userId}`} className="row-link whitespace-nowrap font-mono text-micro text-royal-300 hover:underline">workstation →</a></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
            <AdminPagination total={kycSorted.length} page={kycPage} baseHref={kycBase} param="kycpage" />
            </>
          )}
        </AdminCard>

        {/* AML queue */}
        <AdminCard
          title="AML queue · held before 2026-09-13 or refunds due"
          sw="Foleni ya AML"
          action={<a href="/admin/aml" className="font-mono text-micro tracking-[0.10em] uppercase text-royal-300">go to AML →</a>}
        >
          {amlFailed ? (
            <AdminLoadError what="the AML queue" />
          ) : amlAll.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <I.shieldcheck s={18} className="shrink-0" />
              <p className="text-caption text-text-secondary">Queue empty. No withdrawal is held for review since 2026-09-13; a deposit owed back to an excluded player still appears here.</p>
            </div>
          ) : (
            <>
            <ScrollX label="AML queue" className="-mx-4 px-4">
              <table className="admin-tbl min-w-[640px]">
                <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                  <tr>
                    <SortTh field="time" label="When" current={amlS.sort} dir={amlS.dir} sp={sp} baseHref="/admin/approvals" prefix="aml" className="py-2 pr-3" />
                    <th className="text-left py-2 pr-3">User</th>
                    <SortTh field="type" label="Type" current={amlS.sort} dir={amlS.dir} sp={sp} baseHref="/admin/approvals" prefix="aml" className="py-2 pr-3" />
                    <SortTh field="amount" label="Amount" current={amlS.sort} dir={amlS.dir} sp={sp} baseHref="/admin/approvals" prefix="aml" align="right" className="py-2 pr-3" />
                    <th className="text-left py-2 pl-3">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {aml.map((t) => (
                    <tr key={t.id} className="border-b border-border-subtle/50 last:border-b-0">
                      <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                      <td className="py-2 pr-3"><a href={`/admin/players/${t.userId}`} className="font-mono text-royal-300 hover:underline">{t.userId.slice(0, 14)}…</a></td>
                      <td className="py-2 pr-3 font-medium text-text">{txnTypeLabel(t.type)}</td>
                      <td className="py-2 pr-3 font-mono tabular text-right">{formatTzs(Math.abs(t.amount))}</td>
                      <td className="py-2 pl-3 text-text-secondary">{t.amlReason ?? "review"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
            <AdminPagination total={amlSorted.length} page={amlPage} baseHref={amlBase} param="amlpage" />
            </>
          )}
        </AdminCard>

        {/* SOF declarations */}
        <AdminCard title="Source-of-funds declarations · pending review" sw="Tamko za asili ya pesa">
          {sofFailed ? (
            <AdminLoadError what="the source-of-funds queue" />
          ) : sofAll.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <I.shieldcheck s={18} className="shrink-0" />
              {/* ⛔ THE THRESHOLDS ARE THE DEPOSIT CHECK'S OWN CONSTANTS (2026-09-14). This said "cumulative deposits exceed
                  TZS 5M / 30 days": it left out the single-deposit trigger and said "exceed" where the check is >=, so an
                  officer could not explain a declaration filed after one TZS 1,000,000 deposit. One source line, so no space is lost. */}
              <p className="text-caption text-text-secondary">No source-of-funds declarations pending. A single deposit of <span className="whitespace-nowrap">{formatTzs(SOF_SINGLE_TXN_TZS)}</span> or more, or one that brings a player&apos;s 30-day deposits to <span className="whitespace-nowrap">{formatTzs(SOF_ROLLING_30D_TZS)}</span> or more, is blocked until their declaration is accepted.</p>
            </div>
          ) : (
            <>
            {/* ⭐ IDENTITY BESIDE EVERY DECLARATION (2026-09-13). Identity is asked before a withdrawal and at no
                earlier step, so a TZS 5M declaration can now come from an account nobody has verified — a fact
                that changes how much weight the declaration can bear. It sits beside the player, not in a
                tooltip. `approvedEver` is the withdrawal gate's own predicate (src/lib/kyc-approval.ts). */}
            <p className="mb-3 text-body-sm text-text-muted max-w-[80ch]">
              A declaration can come from an account whose identity was never approved — identity is checked before a withdrawal only.
            </p>
            <ScrollX label="Source of funds" className="-mx-4 px-4">
              <table className="admin-tbl min-w-[680px]">
                <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                  <tr>
                    <SortTh field="submitted" label="Submitted" current={sofS.sort} dir={sofS.dir} sp={sp} baseHref="/admin/approvals" prefix="sof" className="py-2 pr-3" />
                    <SortTh field="user" label="User" current={sofS.sort} dir={sofS.dir} sp={sp} baseHref="/admin/approvals" prefix="sof" className="py-2 pr-3" />
                    <th className="text-left py-2 pr-3">Identity</th>
                    <SortTh field="source" label="Source" current={sofS.sort} dir={sofS.dir} sp={sp} baseHref="/admin/approvals" prefix="sof" className="py-2 pr-3" />
                    <SortTh field="income" label="Income band" current={sofS.sort} dir={sofS.dir} sp={sp} baseHref="/admin/approvals" prefix="sof" className="py-2 pr-3" />
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-right py-2 pl-3">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {sof.map((s) => (
                    <tr key={s.userId} className="border-b border-border-subtle/50 last:border-b-0">
                      <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateTime(s.submittedAt)}</td>
                      <td className="py-2 pr-3"><a href={`/admin/players/${s.userId}`} className="font-mono text-royal-300 hover:underline">{s.userId.slice(0, 14)}…</a></td>
                      <td className="py-2 pr-3" data-sof-identity={facts === null ? "unreadable" : approvedEver(factsByUser.get(s.userId)) ? "approved" : "never"}>
                        {facts === null ? (
                          <span className="text-warning-fg">not readable</span>
                        ) : approvedEver(factsByUser.get(s.userId)) ? (
                          <Chip size="sm" variant="success">Approved</Chip>
                        ) : (
                          <Chip size="sm" variant="warning">Never approved</Chip>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-medium text-text">{s.declaredSource}</td>
                      <td className="py-2 pr-3 font-mono">{s.declaredAnnualIncomeBand}</td>
                      <td className="py-2 pr-3"><Chip size="sm" variant="warning">{s.reviewStatus}</Chip></td>
                      <td className="py-2 pl-3"><div className="flex justify-end"><SofReviewRow userId={s.userId} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
            <AdminPagination total={sofSorted.length} page={sofPage} baseHref={sofBase} param="sofpage" />
            </>
          )}
        </AdminCard>

        {/* Approval log */}
        <AdminCard title="Recent approval activity" sw="Kumbukumbu ya idhini">
          <div className="max-h-[300px] overflow-y-auto">
            {recentApprovals.map((e) => (
              <FeedRow
                key={e.id}
                ts={formatDateTime(e.createdAt)}
                category="ADMIN"
                variant="warning"
                body={`${e.action} · ${e.actorId?.slice(0, 12) ?? "system"} → ${e.targetType ?? ""}#${e.targetId?.slice(0, 12) ?? ""}`}
              />
            ))}
            {recentApprovals.length === 0 && <p className="text-caption text-text-tertiary py-4 text-center">No approval activity yet.</p>}
          </div>
        </AdminCard>

        {/* ⚠️ 2026-09-13 — WAS a warning card headed "Two-person rule": "AML-held withdrawals (≥ TZS 1M) require two
            different officers". Since the owner's ruling of that date no withdrawal is held for review, so the card
            says what the AML queue still holds — the same notice as /admin/aml. ⛔ Do not restore the old claim. */}
        <AdminCard>
          <div className="flex items-start gap-3">
            {/* shrink-0 (2026-09-13): beside the long paragraph the flex row squeezed this 18px glyph to a dot. */}
            <I.info s={18} className="shrink-0" />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">No withdrawal is held for review since <span className="whitespace-nowrap">2026-09-13</span></p>
              {/* ONE SOURCE LINE PER SENTENCE (2026-09-13). A JSX text run that spans source lines AND holds an entity
                  is compiled WITHOUT its leading space after an inline element: the old card rendered
                  "differentofficers" and "COMPLIANCEaudit" until an explicit space was added. A single-line run
                  keeps its spaces; if a sentence here ever wraps in source again, put the explicit space back. */}
              <p>Owner ruling: any withdrawal up to the <span className="whitespace-nowrap">{formatTzs(WITHDRAW_MAX_TZS)}</span> per-withdrawal cap is sent once identity is approved, and no officer reviews it first. Rows in the AML queue were held before that date, or are deposits owed back to excluded players.</p>
              <p>On /admin/aml, Approve dispatches a held withdrawal; Reject returns it to the player&apos;s wallet. A held withdrawal of {formatTzs(TWO_PERSON_THRESHOLD_TZS)} or more still needs two different officers: the first records stage&nbsp;1, a second releases it.</p>
              <p>A deposit owed back cannot be approved, and Reject only closes its row: it sends no money, so the return is still owed. No self-review; each decision and its reason are recorded in the audit log.</p>
            </div>
          </div>
        </AdminCard>
      </AdminBody>
    </>
  );
}
