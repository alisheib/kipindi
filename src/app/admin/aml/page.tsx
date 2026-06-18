import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { Chip } from "@/components/ui/chip";
import { db, type StoredTxn } from "@/lib/server/store";
import { formatTzs } from "@/lib/utils";
import { I } from "@/components/ui/glyphs";
import { AmlActionRow } from "./aml-actions-client";
import { detectSuspiciousBets } from "@/lib/server/analytics";
import { TWO_PERSON_THRESHOLD_TZS } from "./constants";
import { getAuditPage } from "@/lib/server/audit";

export const metadata = { title: "Admin · AML queue" };
export const dynamic = "force-dynamic";

export default async function AdminAmlPage({
  searchParams,
}: {
  searchParams: Promise<{ rpage?: string; rsort?: string; rdir?: string; spage?: string; ssort?: string; sdir?: string }>;
}) {
  const sp = await searchParams;
  const inReviewAll = (await db.txn.listByStatus("AML_REVIEW")) as StoredTxn[];
  const flagsAll = await detectSuspiciousBets();
  // Track which txns already have a stage-1 signature (waiting on second officer)
  const stage1 = new Map<string, { actorId: string | null; at: string }>();
  for (const e of getAuditPage({ category: "ADMIN", limit: 200 })) {
    if (e.action === "aml.approve.stage1" && e.targetId) stage1.set(e.targetId, { actorId: e.actorId, at: e.createdAt });
  }

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

  return (
    <>
      <AdminPageHead
        title="AML · EDD queue"
        sw="Foleni ya AML"
        period={false}
        actions={<Chip size="md" variant={inReviewAll.length > 0 ? "warning" : "neutral"}>{inReviewAll.length} pending</Chip>}
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <AdminCard padding="p-0">
          <div className="overflow-x-auto">
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
                  const requiresTwo = Math.abs(t.amount) >= TWO_PERSON_THRESHOLD_TZS;
                  const sig = stage1.get(t.id);
                  return (
                    <tr key={t.id}>
                      <td className="font-mono whitespace-nowrap">{t.createdAt.replace("T", " ").slice(0, 19)}</td>
                      <td className="font-medium text-text">{t.type}</td>
                      <td className="font-mono">
                        <a href={`/admin/players?q=${encodeURIComponent(t.userId)}`} className="hover:text-royal hover:underline">
                          {t.userId.slice(0, 16)}
                        </a>
                      </td>
                      <td className="font-mono tabular text-right">
                        {formatTzs(Math.abs(t.amount))}
                        {requiresTwo && (
                          <Chip size="sm" variant="warning" className="ml-2">
                            <I.users s={10} /> 2-officer
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
                        <AmlActionRow txnId={t.id} amount={Math.abs(t.amount)} />
                      </td>
                    </tr>
                  );
                })}
                {inReviewAll.length === 0 && (
                  <tr><td colSpan={7} className="!py-6 text-center text-text-tertiary">No transactions awaiting review.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination total={inReviewSorted.length} page={rPage} baseHref={rBaseHref} param="rpage" />
        </AdminCard>

        <AdminCard className="border-warning-border bg-warning-bg/15">
          <div className="flex items-start gap-3">
            <I.warning s={18} />
            <div className="text-caption text-text-secondary">
              <p className="text-text font-bold">Two-person approval (production)</p>
              <p>In production, approve / reject for amounts ≥ TZS 5M requires (a) the on-shift compliance officer, plus (b) the AML lead. Both clicks are recorded in the <code>ADMIN</code> audit category with the reviewer&apos;s user-id, IP, and reason. This build records the single approval in audit so the workflow can be lifted directly when the second-officer flow is wired.</p>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding="p-0">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <I.activity s={16} />
              <p className="font-bold text-text">Suspicious-bet detector · Tabia za shaka</p>
              <span className="text-caption text-text-tertiary">stake spike ≥ 10× user 30-day median; or velocity ≥ 100/24h</span>
            </div>
            <Chip size="md" variant={flagsAll.length > 0 ? "warning" : "neutral"}>{flagsAll.length} flags</Chip>
          </div>
          <div className="overflow-x-auto">
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
                      <a href={`/admin/players?q=${encodeURIComponent(f.userId)}`} className="hover:text-royal hover:underline">
                        {f.userId.slice(0, 16)}
                      </a>
                    </td>
                    <td>
                      <Chip size="sm" variant={f.type === "STAKE_SPIKE" ? "warning" : "danger"}>
                        {f.type}
                      </Chip>
                    </td>
                    <td className="font-mono tabular text-right">{formatTzs(f.stake)}</td>
                    <td className="font-mono tabular text-right text-text-tertiary">{formatTzs(f.median)}</td>
                    <td className="font-mono tabular text-right text-warning">{f.multiple.toFixed(1)}×</td>
                    <td className="text-text-tertiary">{f.detail}</td>
                  </tr>
                ))}
                {flagsAll.length === 0 && (
                  <tr><td colSpan={6} className="!py-6 text-center text-text-tertiary">No suspicious patterns detected.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination total={flagsSorted.length} page={sPage} baseHref={sBaseHref} param="spage" />
        </AdminCard>
      </div>
    </>
  );
}
