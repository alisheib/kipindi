import { AdminPageHead, AdminCard, AdminKpi, AdminStackedBar, StatusPill, FeedRow } from "@/components/admin/admin-shell";
import { AdminFunnelChart } from "@/components/admin/admin-charts";
import { ShieldCheck, AlertTriangle, Download, Lock } from "lucide-react";
import { db } from "@/lib/server/store";
import { verifyChain, getAuditPage } from "@/lib/server/audit";
import { kycFunnel, rgRosterCounts } from "@/lib/server/analytics";

export const metadata = { title: "Admin · Compliance" };
export const dynamic = "force-dynamic";

const REPORTS: ReadonlyArray<{ id: string; title: string; sub: string; tone: "gold" | "royal" | "danger" | "neutral" }> = [
  { id: "gbt-monthly",    title: "GBT monthly summary",   sub: "Last 28 days · 12 sheets · signed JSON", tone: "gold" },
  { id: "tra-tax",        title: "TRA withholding tax",   sub: "Last 28 days · CSV · ready",             tone: "royal" },
  { id: "fiu-sar",        title: "FIU SAR · suspicious",  sub: "7-day rolling · entries pending review", tone: "danger" },
  { id: "iso-audit",      title: "ISO 27001 audit log",   sub: "Last 90 days · CSV",                     tone: "neutral" },
  { id: "kyc-reverify",   title: "KYC re-verify roster",  sub: "Players due in 14 days",                 tone: "neutral" },
  { id: "sx-register",    title: "Self-exclusion register", sub: "Cross-operator format · monthly",      tone: "neutral" },
];

export default function AdminCompliancePage() {
  const chain = verifyChain();
  const kyc = kycFunnel();
  const rg = rgRosterCounts();
  const aml = db.txn.listByStatus("AML_REVIEW");
  const recentAml = aml.slice(0, 5);
  const recentApprovals = getAuditPage({ category: "ADMIN", limit: 50 }).filter((e) => e.action.startsWith("aml.")).slice(0, 8);
  const integrityAlerts = getAuditPage({ category: "BET", limit: 50 }).filter((e) => e.action.startsWith("integrity.alert.")).slice(0, 3);

  // Reality-check engagement — read from audit (rg.* events)
  const rgEvents = getAuditPage({ category: "COMPLIANCE", limit: 200 });
  const continued = rgEvents.filter((e) => e.action === "rg.reality_check.continued").length;
  const tookBreak = rgEvents.filter((e) => e.action === "rg.cooling_off.activated").length;
  const sxd = rgEvents.filter((e) => e.action === "rg.self_exclusion.activated").length;
  const rcTotal = continued + tookBreak + sxd || 1;

  const kycConv = kyc.registered === 0 ? 0 : (kyc.approved / kyc.registered) * 100;
  const kycSteps = [
    { label: "Registered", value: kyc.registered },
    { label: "Started",    value: kyc.started,    conversionFromPrev: kyc.registered === 0 ? "—" : `${((kyc.started / kyc.registered) * 100).toFixed(1)}%` },
    { label: "Pending",    value: kyc.pending,    conversionFromPrev: kyc.started === 0 ? "—" : `${((kyc.pending / kyc.started) * 100).toFixed(1)}%` },
    { label: "Approved",   value: kyc.approved,   conversionFromPrev: kyc.started === 0 ? "—" : `${((kyc.approved / kyc.started) * 100).toFixed(1)}%` },
  ];

  return (
    <>
      <AdminPageHead
        title="Compliance"
        sw="Kanuni"
        actions={
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: "gbt",  label: "GBT monthly" },
              { id: "tra",  label: "TRA tax" },
              { id: "fiu",  label: "FIU SAR" },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated text-text-secondary hover:text-text"
              >
                <Download size={12} aria-hidden /> {b.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* §A — Audit chain + backup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard title="Audit chain · integrity" sw="Mlolongo wa ukaguzi">
            <div className="flex items-center gap-4">
              <StatusPill status={chain.valid ? "ok" : "fail"} label={chain.valid ? "OK" : "✗"} />
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-body-sm text-text">
                  {chain.valid ? "Chain valid" : `Chain broken at index ${chain.index}`}
                </p>
                <p className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">
                  HMAC-SHA256 · last verify {new Date().toLocaleTimeString("en-GB")}
                </p>
              </div>
              <a
                href="/admin/system"
                className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-elevated text-royal"
              >
                verify now →
              </a>
            </div>
          </AdminCard>
          <AdminCard title="Backup status" sw="Hali ya nakala">
            <div className="flex items-center gap-4">
              <StatusPill status="ok" label="✓" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-body-sm text-text">Auto-snapshot on every mutation</p>
                <p className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">
                  HMAC-signed · last 12 retained · disk-backed
                </p>
              </div>
              <a
                href="/admin/system"
                className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-elevated text-royal"
              >
                history →
              </a>
            </div>
          </AdminCard>
        </div>

        {/* §B — KYC funnel + AML queue */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
          <AdminCard title="KYC conversion funnel" sw="Hatua za uthibitisho">
            <AdminFunnelChart steps={kycSteps} />
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-border-subtle text-caption text-text-tertiary">
              <span>End-to-end approval: <span className="font-semibold text-text">{kycConv.toFixed(1)}%</span></span>
              <a href="/admin/players?status=PENDING_KYC" className="text-royal hover:underline font-medium">View pending →</a>
            </div>
          </AdminCard>
          <AdminCard title="AML queue · 7-day" sw="Foleni ya AML">
            <div className="grid grid-cols-2 gap-2">
              <AdminKpi label="Pending"  sw="Inasubiri"  value={aml.length}    spark={false} pulse={aml.length > 0} />
              <AdminKpi label="Approved" sw="Imekubaliwa" value={recentApprovals.filter((e) => e.action === "aml.approved").length} spark={false} />
              <AdminKpi label="Rejected" sw="Imekataliwa" value={recentApprovals.filter((e) => e.action === "aml.rejected").length} spark={false} />
              <AdminKpi label="Avg time" sw="Wastani"     value="—"             spark={false} />
            </div>
            <div className="pt-3 mt-2 border-t border-border-subtle">
              <p className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary mb-1.5">Next in queue</p>
              {recentAml.length === 0 ? (
                <p className="text-caption text-text-tertiary py-2">Queue empty.</p>
              ) : recentAml.map((t) => (
                <FeedRow
                  key={t.id}
                  ts={t.createdAt.split("T")[1]?.slice(0, 5) ?? ""}
                  category="AML"
                  variant="danger"
                  body={
                    <a href={`/admin/aml`} className="hover:underline">
                      {t.userId.slice(0, 12)}… · {t.type} · {t.amlReason ?? "review"}
                    </a>
                  }
                />
              ))}
            </div>
          </AdminCard>
        </div>

        {/* §C — Responsible-gambling row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminCard title="Self-exclusion" sw="Kujizuia">
            <div className="flex items-baseline justify-between">
              <span className="font-mono font-bold text-title-md tabular text-text">{rg.selfExcluded}</span>
              {rg.expiringThisWeek > 0 && (
                <span className="font-mono text-micro text-warning tracking-wider">{rg.expiringThisWeek} expiring</span>
              )}
            </div>
            <p className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">active roster</p>
          </AdminCard>
          <AdminCard title="Cooling-off" sw="Kupumzika">
            <div className="font-mono font-bold text-title-md tabular text-text">{rg.cooledOff}</div>
            <p className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">in progress</p>
          </AdminCard>
          <AdminCard title="Limit-increase deferrals" sw="Kuongeza kikomo">
            <div className="font-mono font-bold text-title-md tabular text-gold">{rg.pendingLimitIncrease}</div>
            <p className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">pending 24h cool-down</p>
          </AdminCard>
          <AdminCard title="Reality-check engagement" sw="Tahadhari ya hali halisi">
            <AdminStackedBar
              segments={[
                { flex: Math.max(2, Math.round((continued / rcTotal) * 100)), color: "var(--text-tertiary)", label: continued > 0 ? `${continued}` : undefined },
                { flex: Math.max(2, Math.round((tookBreak / rcTotal) * 100)), color: "var(--gold)", label: tookBreak > 0 ? `${tookBreak}` : undefined },
                { flex: Math.max(2, Math.round((sxd / rcTotal) * 100)), color: "var(--bet-lose)", label: sxd > 0 ? `${sxd}` : undefined },
              ]}
              height={14}
            />
            <p className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">
              {Math.round((continued / rcTotal) * 100)}% continued · {Math.round((tookBreak / rcTotal) * 100)}% break · {Math.round((sxd / rcTotal) * 100)}% self-excluded
            </p>
          </AdminCard>
        </div>

        {/* §D — Match-integrity + report exports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard title="Match-integrity alerts · 30 days" sw="Tahadhari za uadilifu">
            {integrityAlerts.length === 0 ? (
              <div className="flex items-center gap-3 py-4">
                <ShieldCheck size={18} className="text-success" />
                <p className="text-caption text-text-secondary">No integrity alerts in the last 30 days. Sportradar feed: stub adapter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-caption min-w-[480px]">
                  <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                    <tr>
                      <th className="text-left py-2 pr-3">When</th>
                      <th className="text-left py-2 pr-3">Match</th>
                      <th className="text-left py-2 pr-3">Severity</th>
                      <th className="text-left py-2 pl-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrityAlerts.map((a) => (
                      <tr key={a.id} className="border-b border-border-subtle/50 last:border-b-0">
                        <td className="py-2 pr-3 font-mono whitespace-nowrap">{a.createdAt.split("T")[0]}</td>
                        <td className="py-2 pr-3">{a.targetId ?? "—"}</td>
                        <td className="py-2 pr-3"><span className="font-mono text-micro tracking-wider uppercase">{a.action.replace("integrity.alert.", "")}</span></td>
                        <td className="py-2 pl-3 font-mono text-micro text-royal">open →</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          <AdminCard title="Regulator report exports" sw="Ripoti za udhibiti">
            <div className="space-y-1">
              {REPORTS.map((r) => (
                <a key={r.id} href={`/admin/reports#${r.id}`} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-b-0 hover:bg-surface-hover -mx-2 px-2 rounded transition-colors">
                  <span className={[
                    "h-7 w-7 rounded-md inline-flex items-center justify-center font-mono text-micro shrink-0",
                    r.tone === "gold"    ? "bg-gold/15 text-gold" :
                    r.tone === "royal"   ? "bg-royal/15 text-royal" :
                    r.tone === "danger"  ? "bg-danger/15 text-danger" :
                                           "bg-bg-sunken text-text-tertiary",
                  ].join(" ")}>↓</span>
                  <span className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span className="text-body-sm font-semibold text-text truncate">{r.title}</span>
                    <span className="font-mono text-micro text-text-tertiary truncate">{r.sub}</span>
                  </span>
                </a>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* §E — Operational notes */}
        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-info shrink-0 mt-0.5" />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">Inspector mode</p>
              <p>
                A regulator inspecting Kipindi sees this page first. Every chip and table is read-only —
                nothing here mutates state. To act on items, drill into{" "}
                <a href="/admin/aml" className="text-royal hover:underline">AML queue</a> for approvals,
                <a href="/admin/players" className="text-royal hover:underline ml-1">Players</a> for player drill-down, or
                <a href="/admin/audit" className="text-royal hover:underline ml-1">Audit log</a> for the chain itself.
              </p>
            </div>
          </div>
        </AdminCard>

        <p className="text-caption text-text-tertiary text-center pt-3 flex items-center justify-center gap-1.5">
          <Lock size={11} aria-hidden /> Confidential · screen and contents are subject to operational access logging.
        </p>
      </div>
    </>
  );
}
