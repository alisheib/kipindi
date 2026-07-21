import { AdminPageHead, AdminCard, AdminKpi, FeedRow, AdminLoadError } from "@/components/admin/admin-shell";
import { CEREMONY } from "@/lib/admin-status-lexicon";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { db, type StoredTxn, type StoredSourceOfFunds } from "@/lib/server/store";
import { getAuditPage } from "@/lib/server/audit";
import { listPendingKyc } from "@/lib/server/kyc-service";
import { SofReviewRow } from "./sof-review-client";
import { formatDateTime, formatTzs } from "@/lib/utils";

export const metadata = { title: "Admin · Two-person approvals" };
export const dynamic = "force-dynamic";

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

  // KYC queue (prefix "kyc") — newest submission first by default.
  const kyc = parseSort(sp, ["submitted", "user", "name", "docs"] as const, "submitted", "desc", "kyc");
  const kycSorted = applySort(kycPendingAll, kyc.sort, kyc.dir, {
    submitted: (k) => k.submittedAt ?? k.updatedAt,
    user: (k) => k.userId,
    name: (k) => k.fullName ?? "",
    docs: (k) => k.documents.length,
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
      <AdminPageHead
        title="Two-person approvals"
        sw="Idhini ya watu wawili"
        period={false}
        actions={
          <span
            className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border"
            style={{ borderColor: "var(--aqua-400)", background: "color-mix(in oklab, var(--aqua-400) 12%, transparent)", color: "var(--aqua-400)" }}
          >
            <I.shieldcheck s={12} /> {CEREMONY.coSignRequired.en}
          </span>
        }
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="KYC pending" sw="Vitambulisho" value={kycFailed ? "" : kycPendingAll.length} unavailable={kycFailed} pulse={!kycFailed && kycPendingAll.length > 0} />
          <AdminKpi label="AML pending" sw="Inasubiri ukaguzi" value={amlFailed ? "" : amlAll.length} unavailable={amlFailed} pulse={!amlFailed && amlAll.length > 0} />
          <AdminKpi label="SOF declarations" sw="Asili ya pesa" value={sofFailed ? "" : sofAll.length} unavailable={sofFailed} pulse={!sofFailed && sofAll.length > 0} />
          <AdminKpi label="Avg cosign time" sw="Wastani"      value="—"  delta="last 7d" />
        </div>

        {/* KYC review queue */}
        <AdminCard
          title="KYC · awaiting verification"
          sw="Vitambulisho vinasubiri"
        >
          {kycFailed ? (
            <AdminLoadError what="the KYC queue" />
          ) : kycPendingAll.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <I.shieldcheck s={18} />
              <p className="text-caption text-text-secondary">No identity submissions pending. New submissions appear here the moment a player submits for review.</p>
            </div>
          ) : (
            <>
            <ScrollX label="KYC queue" className="-mx-4 px-4">
              <table className="admin-tbl min-w-[600px]">
                <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                  <tr>
                    <SortTh field="submitted" label="Submitted" current={kyc.sort} dir={kyc.dir} sp={sp} baseHref="/admin/approvals" prefix="kyc" className="py-2 pr-3" />
                    <SortTh field="user" label="User" current={kyc.sort} dir={kyc.dir} sp={sp} baseHref="/admin/approvals" prefix="kyc" className="py-2 pr-3" />
                    <SortTh field="name" label="Name (NIDA)" current={kyc.sort} dir={kyc.dir} sp={sp} baseHref="/admin/approvals" prefix="kyc" className="py-2 pr-3" />
                    <SortTh field="docs" label="Docs" current={kyc.sort} dir={kyc.dir} sp={sp} baseHref="/admin/approvals" prefix="kyc" className="py-2 pr-3" />
                    <th className="text-right py-2 pl-3">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {kycPending.map((k) => (
                    <tr key={k.id} className="border-b border-border-subtle/50 last:border-b-0">
                      <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateTime(k.submittedAt ?? k.updatedAt)}</td>
                      <td className="py-2 pr-3"><a href={`/admin/players/${k.userId}?tab=kyc`} className="font-mono text-royal-300 hover:underline">{k.userId.slice(0, 14)}…</a></td>
                      <td className="py-2 pr-3 font-medium text-text">{k.fullName ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono tabular">{k.documents.length}/3</td>
                      <td className="py-2 pl-3 text-right"><a href={`/admin/kyc/${k.userId}`} className="font-mono text-micro tracking-[0.10em] uppercase text-royal-300 hover:underline">workstation →</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
            <AdminPagination total={kycSorted.length} page={kycPage} baseHref={kycBase} param="kycpage" />
            </>
          )}
        </AdminCard>

        {/* AML queue */}
        <AdminCard
          title="AML queue · awaiting first signature"
          sw="Foleni ya AML"
          action={<a href="/admin/aml" className="font-mono text-micro tracking-[0.10em] uppercase text-royal-300">go to AML →</a>}
        >
          {amlFailed ? (
            <AdminLoadError what="the AML queue" />
          ) : amlAll.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <I.shieldcheck s={18} />
              <p className="text-caption text-text-secondary">Queue empty. New AML triggers appear here for first review.</p>
            </div>
          ) : (
            <>
            <ScrollX label="AML queue" className="-mx-4 px-4">
              <table className="admin-tbl min-w-[640px]">
                <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
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
                      <td className="py-2 pr-3 font-medium text-text">{t.type}</td>
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
              <I.shieldcheck s={18} />
              <p className="text-caption text-text-secondary">No SOF declarations pending. Players auto-trigger this when cumulative deposits exceed TZS 5M / 30 days.</p>
            </div>
          ) : (
            <>
            <ScrollX label="Source of funds" className="-mx-4 px-4">
              <table className="admin-tbl min-w-[600px]">
                <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                  <tr>
                    <SortTh field="submitted" label="Submitted" current={sofS.sort} dir={sofS.dir} sp={sp} baseHref="/admin/approvals" prefix="sof" className="py-2 pr-3" />
                    <SortTh field="user" label="User" current={sofS.sort} dir={sofS.dir} sp={sp} baseHref="/admin/approvals" prefix="sof" className="py-2 pr-3" />
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
            {recent.filter((e) => e.action.startsWith("aml.") || e.action.startsWith("sof.") || e.action.startsWith("player.")).slice(0, 30).map((e) => (
              <FeedRow
                key={e.id}
                ts={formatDateTime(e.createdAt)}
                category="ADMIN"
                variant="warning"
                body={`${e.action} · ${e.actorId?.slice(0, 12) ?? "system"} → ${e.targetType ?? ""}#${e.targetId?.slice(0, 12) ?? ""}`}
              />
            ))}
            {recent.length === 0 && <p className="text-caption text-text-tertiary py-4 text-center">No approval activity yet.</p>}
          </div>
        </AdminCard>

        <AdminCard className="border-warning-border bg-warning-bg/15">
          <div className="flex items-start gap-3">
            <I.warning s={18} />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">Two-person rule</p>
              <p>
                AML-held withdrawals (≥ TZS 1M) require two <em>different</em> officers: a first officer records
                stage&nbsp;1 with a reason; a second, different officer counter-signs to release. No officer can
                approve their own transaction. Both clicks are recorded in the <code>ADMIN</code> audit category
                with each reviewer&apos;s user-id and reason.
              </p>
            </div>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
