import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { CEREMONY } from "@/lib/admin-status-lexicon";
import { txnTypeLabel, amlFlagTypeLabel } from "@/components/admin/status-badge";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { Chip } from "@/components/ui/chip";
import { db, type StoredTxn } from "@/lib/server/store";
import { formatTzs, formatDateTime, adminCount } from "@/lib/utils";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { AmlActionRow } from "./aml-actions-client";
import { detectSuspiciousBets } from "@/lib/server/analytics";
import { TWO_PERSON_THRESHOLD_TZS } from "./constants";
import { WITHDRAW_MAX_TZS } from "@/lib/server/validators";
import { listFirstSignatures } from "./stage1-store";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

export const metadata = { title: "Admin · AML queue" };
export const dynamic = "force-dynamic";

type AmlProps = {
  searchParams: Promise<{ rpage?: string; rsort?: string; rdir?: string; spage?: string; ssort?: string; sdir?: string }>;
};

/** W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. The section layout is skipped by a flight
 *  request whose router state names it, so the gate the page cannot lose is the one it carries itself. */
export default async function AdminAmlPage(props: AmlProps) {
  return <AdminPageGate title="AML"><AdminAmlContent {...props} /></AdminPageGate>;
}

async function AdminAmlContent({ searchParams }: AmlProps) {
  const sp = await searchParams;
  // A-5: track whether each read FAILED (vs genuinely empty). A DB blip must not
  // render a clean AML EDD queue or a fabricated "0 pending / 0 flags" — that is a
  // false compliance all-clear. Show an explicit "couldn't load" instead.
  let inReviewAll: StoredTxn[] = [];
  let amlFailed = false;
  try { inReviewAll = (await db.txn.listByStatus("AML_REVIEW")) as StoredTxn[]; } catch { amlFailed = true; }
  let flagsFailed = false;
  const flagsAll = await detectSuspiciousBets().catch(() => { flagsFailed = true; return []; });
  // B-9: which txns already carry a stage-1 signature (awaiting the second
  // officer) — read from the DURABLE config-store the actions write, not the
  // audit ring. The old getAuditPage({category:"ADMIN"}) scan was doubly wrong:
  // stage-1 is audited under COMPLIANCE, and the ring forgets on deploy — so
  // the badge + KPI never populated and officers couldn't see who signed first.
  const stage1 = await listFirstSignatures(inReviewAll.map((t) => t.id));

  // Review queue (prefix "r") — newest first by default.
  const r = parseSort(sp, ["time", "type", "amount", "provider"] as const, "time", "desc", "r");
  const inReviewSorted = applySort(inReviewAll, r.sort, r.dir, {
    time: (t) => t.createdAt,
    type: (t) => t.type,
    amount: (t) => Math.abs(t.amount),
    provider: (t) => t.provider ?? "",
  });
  const rPage = parsePage(sp.rpage, inReviewSorted.length);
  const inReview = inReviewSorted.slice((rPage - 1) * PER_PAGE, rPage * PER_PAGE);
  const rBaseHref = buildBaseHref("/admin/aml", sp, "rpage");

  // Suspicious-bet flags (prefix "s") — most suspicious (highest multiple) first.
  const s = parseSort(sp, ["multiple", "stake", "median", "type"] as const, "multiple", "desc", "s");
  const flagsSorted = applySort(flagsAll, s.sort, s.dir, {
    multiple: (f) => f.multiple,
    stake: (f) => f.stake,
    median: (f) => f.median,
    type: (f) => f.type,
  });
  const sPage = parsePage(sp.spage, flagsSorted.length);
  const flags = flagsSorted.slice((sPage - 1) * PER_PAGE, sPage * PER_PAGE);
  const sBaseHref = buildBaseHref("/admin/aml", sp, "spage");

  // Summary metrics for the KPI band — gives this high-stakes queue the same
  // at-a-glance hierarchy its compliance-queue peers (privacy/self-exclusions/
  // approvals/retention) already lead with, instead of diving straight to a table.
  // ⚠️ 2026-09-13 — no withdrawal is held for review any more (payments.ts WITHDRAWAL_AML_HOLD = false, owner
  // ruling). The two-officer rule in approveAmlAction still binds a withdrawal held BEFORE that date, so this
  // counts those LEGACY holds only. A deposit owed back is never two-officer (the action refuses a deposit
  // before that rule), so counting it here — as the old amount-only filter did — overstated the two-officer load.
  const legacyTwoOfficer = (t: StoredTxn) => t.type === "WITHDRAWAL" && Math.abs(t.amount) >= TWO_PERSON_THRESHOLD_TZS;
  const largeCount = inReviewAll.filter(legacyTwoOfficer).length;
  const awaitingSecond = inReviewAll.filter((t) => stage1.has(t.id)).length;

  /* ⭐ ONE NAME PER DESTINATION (§L1). Sidebar "AML queue", tab title "Admin · AML queue",
     crumb "AML", h1 "AML · EDD queue" — four surfaces, three names. Two of the four already
     said the nav label, and the nav label is the canonical name (`admin-nav-groups.ts` is
     the only place a destination is DECLARED). "EDD" is not lost: the "Pending review" KPI
     immediately below is captioned "EDD queue". */
  return (
    <>
      <AdminPageHead
        title="AML queue"
        sw="Foleni ya AML"
        actions={<Chip size="md" variant={!amlFailed && inReviewAll.length > 0 ? "warning" : "neutral"}>{amlFailed ? "n/a" : `${inReviewAll.length} pending`}</Chip>}
      />
      <AdminBody>
        <KpiGrid>
          <AdminKpi label="Pending review" sw="Inasubiri" value={amlFailed ? "" : inReviewAll.length.toLocaleString()} unavailable={amlFailed} pulse={!amlFailed && inReviewAll.length > 0} delta="EDD queue" spark={false} />
          <AdminKpi label="Legacy holds · 2-officer" sw="Zilizozuiliwa awali" value={amlFailed ? "" : largeCount.toLocaleString()} unavailable={amlFailed} delta={`≥ ${formatTzs(TWO_PERSON_THRESHOLD_TZS)} · held before 2026-09-13`} spark={false} />
          <AdminKpi label={CEREMONY.awaitingSecondSignature.en} sw={CEREMONY.awaitingSecondSignature.sw} value={amlFailed ? "" : awaitingSecond.toLocaleString()} unavailable={amlFailed} delta="legacy hold · stage 1 recorded" spark={false} />
          <AdminKpi label="Suspicious-bet flags" sw="Bendera za shaka" value={flagsFailed ? "" : flagsAll.length.toLocaleString()} unavailable={flagsFailed} tone={!flagsFailed && flagsAll.length > 0 ? "danger" : undefined} delta="stake spike / velocity" spark={false} />
        </KpiGrid>
        <AdminCard padding="p-0">
          {amlFailed ? (
            <div className="p-4"><AdminLoadError what="the AML queue" /></div>
          ) : (
            <>
          <ScrollX label="AML review queue">
            <table className="admin-tbl">
              <thead>
                <tr>
                  <SortTh field="time" label="Time" current={r.sort} dir={r.dir} sp={sp} baseHref="/admin/aml" prefix="r" />
                  <SortTh field="type" label="Type" current={r.sort} dir={r.dir} sp={sp} baseHref="/admin/aml" prefix="r" />
                  <th className="text-left">User</th>
                  <SortTh field="amount" label="Amount" current={r.sort} dir={r.dir} sp={sp} baseHref="/admin/aml" prefix="r" align="right" />
                  <SortTh field="provider" label="Provider" current={r.sort} dir={r.dir} sp={sp} baseHref="/admin/aml" prefix="r" />
                  <th className="text-left">Reason</th>
                  <th className="text-left">Action</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {inReview.map((t) => {
                  const requiresTwo = legacyTwoOfficer(t);
                  const sig = stage1.get(t.id);
                  return (
                    <tr key={t.id}>
                      <td className="font-mono whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                      <td className="font-medium text-text">{txnTypeLabel(t.type)}</td>
                      <td className="font-mono">
                        <a href={`/admin/players?q=${encodeURIComponent(t.userId)}`} className="hover:text-royal-300 hover:underline">
                          {t.userId.slice(0, 16)}
                        </a>
                      </td>
                      <td className="font-mono tabular text-right">
                        {formatTzs(Math.abs(t.amount))}
                        {requiresTwo && (
                          <Chip size="sm" variant="warning" className="ml-2">
                            <I.users s={10} /> Legacy · 2-officer
                          </Chip>
                        )}
                        {sig && (
                          <span className="block font-mono text-micro text-warning mt-1">
                            stage 1 by {sig.actorId?.slice(0, 12) ?? "—"}…
                          </span>
                        )}
                      </td>
                      <td>{t.provider ?? "—"}</td>
                      <td>{t.amlReason ?? "—"}</td>
                      <td>
                        <AmlActionRow txnId={t.id} amount={Math.abs(t.amount)} isWithdrawal={t.type === "WITHDRAWAL"} legacyTwoOfficer={requiresTwo} />
                      </td>
                    </tr>
                  );
                })}
                {inReviewAll.length === 0 && (
                  <AdminTableEmpty colSpan={7} kind="admin" title="Queue clear" body="No transactions are awaiting review." />
                )}
              </tbody>
            </table>
          </ScrollX>
          <AdminPagination total={inReviewSorted.length} page={rPage} baseHref={rBaseHref} param="rpage" />
            </>
          )}
        </AdminCard>

        {/* ⚠️ 2026-09-13 — this card WAS a warning headed "Two-person approval" saying every amount of TZS 1M or
            more needs two officers. Since the owner's ruling of that date no withdrawal is held for review at all
            (payments.ts WITHDRAWAL_AML_HOLD), so the card says what the queue still holds. ⛔ Do not restore the
            old claim: the two-officer rule binds only a row held before that date. ⛔ And do not say Reject
            "returns" a deposit: rejectAmlAction moves wallet money for a WITHDRAWAL only, so a deposit owed back
            leaves the queue with its money still owed. Each sentence sits on ONE source line — a JSX text run
            that spans lines after an inline element loses its space (the /legal/terms defect). */}
        <AdminCard>
          <div className="flex items-start gap-3">
            <I.info s={18} className="shrink-0" />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">No withdrawal is held for review since <span className="whitespace-nowrap">2026-09-13</span></p>
              <p>Owner ruling: any withdrawal up to the <span className="whitespace-nowrap">{formatTzs(WITHDRAW_MAX_TZS)}</span> per-withdrawal cap is sent once identity is approved, and no officer reviews it first. Rows here were held before that date, or are deposits owed back to excluded players.</p>
              <p>Approve dispatches a held withdrawal; Reject returns it to the player&apos;s wallet. A held withdrawal of {formatTzs(TWO_PERSON_THRESHOLD_TZS)} or more still needs two different officers: the first records stage&nbsp;1, a second releases it.</p>
              <p>A deposit owed back cannot be approved, and Reject only closes its row: it sends no money, so the return is still owed. No self-review; each decision and its reason are recorded in the audit log.</p>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding="p-0">
          {/* Stacks below the small breakpoint (2026-09-14). As one unwrapping row at 390 it hyphen-broke the heading over
              four lines, squeezed the icon to a speck and folded the flag count onto two lines. On a phone the criteria
              drop under the heading and the count takes its own line; from 640px up it is the same single row as before.
              The chip's nowrap goes through `style` because Chip sets white-space inline (G-7). */}
          <div className="px-4 py-3 border-b border-border-subtle flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <I.activity s={16} className="shrink-0" />
              <p className="font-bold text-text">Suspicious-bet detector · Tabia za shaka</p>
              <span className="basis-full text-caption text-text-tertiary sm:basis-auto">stake spike ≥ 10× user 30-day median; or velocity ≥ 100/24h</span>
            </div>
            <Chip size="md" className="shrink-0 self-start sm:self-auto" style={{ whiteSpace: "nowrap" }} variant={!flagsFailed && flagsAll.length > 0 ? "warning" : "neutral"}>{flagsFailed ? "n/a" : adminCount(flagsAll.length, "flag")}</Chip>
          </div>
          {flagsFailed ? (
            <div className="p-4"><AdminLoadError what="suspicious-bet flags" /></div>
          ) : (
            <>
          <ScrollX label="Suspicious bets">
            <table className="admin-tbl">
              <thead>
                <tr>
                  <th className="text-left">User</th>
                  <SortTh field="type" label="Type" current={s.sort} dir={s.dir} sp={sp} baseHref="/admin/aml" prefix="s" />
                  <SortTh field="stake" label="Stake" current={s.sort} dir={s.dir} sp={sp} baseHref="/admin/aml" prefix="s" align="right" />
                  <SortTh field="median" label="Median" current={s.sort} dir={s.dir} sp={sp} baseHref="/admin/aml" prefix="s" align="right" />
                  <SortTh field="multiple" label="×" current={s.sort} dir={s.dir} sp={sp} baseHref="/admin/aml" prefix="s" align="right" />
                  <th className="text-left">Detail</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {flags.map((f) => (
                  <tr key={`${f.userId}-${f.txnId}-${f.type}`}>
                    <td className="font-mono">
                      <a href={`/admin/players?q=${encodeURIComponent(f.userId)}`} className="hover:text-royal-300 hover:underline">
                        {f.userId.slice(0, 16)}
                      </a>
                    </td>
                    <td>
                      {/* ⛔ WAS `{f.type}` — the chip printed the storage token STAKE_SPIKE at
                          a compliance officer, on the queue that decides whether a Suspicious
                          Activity Report is filed. §L2: `amlFlagTypeLabel` is now the single
                          definition site (status-badge.tsx / SURVEILLANCE in the lexicon).
                          ⚠️ The variant ternary beside it is a §B11 site (a hand-typed tone
                          next to a label) and is deliberately left for that row: `status-tone`
                          keys on status WORDS, and a flag TYPE is a taxonomy, not a status. */}
                      <Chip size="sm" variant={f.type === "STAKE_SPIKE" ? "warning" : "danger"}>
                        {amlFlagTypeLabel(f.type)}
                      </Chip>
                    </td>
                    <td className="font-mono tabular text-right">{formatTzs(f.stake)}</td>
                    <td className="font-mono tabular text-right text-text-tertiary">{formatTzs(f.median)}</td>
                    <td className="font-mono tabular text-right text-warning">{f.multiple.toFixed(1)}×</td>
                    <td className="text-text-tertiary">{f.detail}</td>
                  </tr>
                ))}
                {flagsAll.length === 0 && (
                  <AdminTableEmpty colSpan={6} kind="admin" title="No flags" body="No suspicious betting patterns detected." />
                )}
              </tbody>
            </table>
          </ScrollX>
          <AdminPagination total={flagsSorted.length} page={sPage} baseHref={sBaseHref} param="spage" />
            </>
          )}
        </AdminCard>
      </AdminBody>
    </>
  );
}
