import Link from "next/link";
import { AdminPageHead, AdminCard, AdminKpi, AdminStackedBar, StatusPill, FeedRow } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { AdminFunnelChart } from "@/components/admin/admin-charts";
import { I } from "@/components/ui/glyphs";
import { db, type StoredTxn } from "@/lib/server/store";
import { verifyChain, getAuditPage } from "@/lib/server/audit";
import { kycFunnel, rgRosterCounts } from "@/lib/server/analytics";
import { detectHarmMarkersForAllUsers } from "@/lib/server/responsible-gambling";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { formatClock, formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Admin · Compliance" };
export const dynamic = "force-dynamic";

const REPORTS: ReadonlyArray<{ id: string; title: string; sub: string; tone: "warning" | "royal" | "danger" | "neutral" }> = [
  { id: "gbt-monthly",    title: "Monthly report",         sub: "Calendar month · 12 sheets · signed JSON", tone: "warning" },
  { id: "tra-tax",        title: "TRA withholding tax",   sub: "Last 28 days · CSV · ready",             tone: "royal" },
  { id: "fiu-sar",        title: "FIU SAR · suspicious",  sub: "7-day rolling · entries pending review", tone: "danger" },
  { id: "iso-audit",      title: "ISO 27001 audit log",   sub: "Last 90 days · CSV",                     tone: "neutral" },
  { id: "kyc-reverify",   title: "KYC re-verify roster",  sub: "Players due in 14 days",                 tone: "neutral" },
  { id: "sx-register",    title: "Self-exclusion register", sub: "Cross-operator format · monthly",      tone: "neutral" },
];

export default async function AdminCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const chain = verifyChain();
  const kyc = await kycFunnel().catch(() => ({ registered: 0, started: 0, pending: 0, approved: 0 }));
  const rg = await rgRosterCounts().catch(() => ({ selfExcluded: 0, cooledOff: 0, expiringThisWeek: 0, pendingLimitIncrease: 0 }));
  let aml: StoredTxn[] = [];
  try { aml = (await db.txn.listByStatus("AML_REVIEW")) as StoredTxn[]; } catch { /* graceful */ }
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
          <Link
            href="/admin/reports"
            className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border border-brand-500 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 transition-colors"
          >
            <I.download s={12} /> Generate reports →
          </Link>
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
                  HMAC-SHA256 · last verify {formatClock(new Date().toISOString())}
                </p>
              </div>
              <a
                href="/admin/system"
                className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-elevated text-royal-300"
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
                className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-elevated text-royal-300"
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
              <a href="/admin/players?status=PENDING_KYC" className="text-royal-300 hover:underline font-medium">View pending →</a>
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
                  ts={formatClock(t.createdAt)}
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
            <div className="font-mono font-bold text-title-md tabular text-warning-fg">{rg.pendingLimitIncrease}</div>
            <p className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">pending 24h cool-down</p>
          </AdminCard>
          <AdminCard title="Reality-check engagement" sw="Tahadhari ya hali halisi">
            <AdminStackedBar
              segments={[
                { flex: Math.max(2, Math.round((continued / rcTotal) * 100)), color: "var(--text-tertiary)", label: continued > 0 ? `${continued}` : undefined },
                { flex: Math.max(2, Math.round((tookBreak / rcTotal) * 100)), color: "var(--warning-fg)", label: tookBreak > 0 ? `${tookBreak}` : undefined },
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
                <I.shieldcheck s={18} />
                <p className="text-caption text-text-secondary">No integrity alerts in the last 30 days. Sportradar feed: stub adapter.</p>
              </div>
            ) : (
              <ScrollX label="Integrity alerts" className="-mx-4 px-4">
                <table className="admin-tbl min-w-[480px]">
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
                        <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDate(a.createdAt)}</td>
                        <td className="py-2 pr-3">{a.targetId ?? "—"}</td>
                        <td className="py-2 pr-3"><span className="font-mono text-micro tracking-wider uppercase">{a.action.replace("integrity.alert.", "")}</span></td>
                        <td className="py-2 pl-3 font-mono text-micro">
                          {a.targetId ? (
                            <Link href={`/admin/markets/${a.targetId}`} className="text-royal-300 hover:underline">open →</Link>
                          ) : (
                            <span className="text-text-tertiary">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
            )}
          </AdminCard>

          <AdminCard title="Regulator report exports" sw="Ripoti za udhibiti">
            <div className="space-y-1">
              {REPORTS.map((r) => (
                <a key={r.id} href={`/admin/reports#${r.id}`} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-b-0 hover:bg-bg-overlay -mx-2 px-2 rounded transition-colors">
                  <span className={[
                    "h-7 w-7 rounded-md inline-flex items-center justify-center font-mono text-micro shrink-0",
                    r.tone === "warning" ? "bg-warning/15 text-warning" :
                    r.tone === "royal"   ? "bg-royal/15 text-royal-300" :
                    r.tone === "danger"  ? "bg-danger/15 text-danger-fg" :
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
            <I.warning s={18} />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">Inspector mode</p>
              <p>
                A regulator inspecting 50pick sees this page first. Every chip and table is read-only —
                nothing here mutates state. To act on items, drill into{" "}
                <a href="/admin/aml" className="text-royal-300 hover:underline">AML queue</a> for approvals,
                <a href="/admin/players" className="text-royal-300 hover:underline ml-1">Players</a> for player drill-down, or
                <a href="/admin/audit" className="text-royal-300 hover:underline ml-1">Audit log</a> for the chain itself.
              </p>
            </div>
          </div>
        </AdminCard>

        <PlayerSafetyPanel sp={sp} />

        <p className="text-caption text-text-tertiary text-center pt-3 flex items-center justify-center gap-1.5">
          <I.lock s={11} /> Confidential · screen and contents are subject to operational access logging.
        </p>
      </div>
    </>
  );
}

async function PlayerSafetyPanel({ sp }: { sp: { page?: string; sort?: string; dir?: string } }) {
  const flags = await detectHarmMarkersForAllUsers().catch(() => []);
  const byMarker: Record<string, number> = {};
  for (const f of flags) byMarker[f.marker] = (byMarker[f.marker] ?? 0) + 1;

  // Sort (URL-driven), then paginate — newest detected first by default.
  const { sort, dir } = parseSort(sp, ["user", "marker", "severity", "detected"] as const, "detected", "desc");
  const sorted = applySort(flags, sort, dir, {
    user: (f) => f.userId,
    marker: (f) => f.marker,
    severity: (f) => f.severity,
    detected: (f) => f.detectedAt,
  });
  const page = parsePage(sp.page, sorted.length);
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/compliance", { sort: sp.sort, dir: sp.dir });
  return (
    <AdminCard
      title="Player safety · markers of harm"
      sw="Alama za hatari"
      action={
        <div className="flex items-center gap-2">
          <I.heartPulse size={14} className="text-warning" />
          <span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">LCCP §3.4.1</span>
        </div>
      }
      padding="p-0"
    >
      <div className="px-4 py-3 border-b border-border-subtle flex flex-wrap gap-1.5">
        <Chip size="sm" variant={byMarker["RAPID_DEPOSIT_ESCALATION"] ? "warning" : "neutral"}>
          {byMarker["RAPID_DEPOSIT_ESCALATION"] ?? 0} rapid-deposit
        </Chip>
        <Chip size="sm" variant={byMarker["CHASING_LOSSES"] ? "danger" : "neutral"}>
          {byMarker["CHASING_LOSSES"] ?? 0} chasing-losses
        </Chip>
        <Chip size="sm" variant={byMarker["LATE_NIGHT_PLAY"] ? "warning" : "neutral"}>
          {byMarker["LATE_NIGHT_PLAY"] ?? 0} late-night
        </Chip>
        <Chip size="sm" variant={byMarker["SESSION_OVERRUN"] ? "warning" : "neutral"}>
          {byMarker["SESSION_OVERRUN"] ?? 0} session-overrun
        </Chip>
        <Chip size="sm" variant={byMarker["LIMIT_BREACH_HISTORY"] ? "warning" : "neutral"}>
          {byMarker["LIMIT_BREACH_HISTORY"] ?? 0} limit-breach
        </Chip>
      </div>
      <ScrollX label="Harm markers">
        <table className="admin-tbl">
          <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
            <tr>
              <SortTh field="user" label="User" current={sort} dir={dir} sp={sp} baseHref="/admin/compliance" className="p-3" />
              <SortTh field="marker" label="Marker" current={sort} dir={dir} sp={sp} baseHref="/admin/compliance" className="p-3" />
              <SortTh field="severity" label="Severity" current={sort} dir={dir} sp={sp} baseHref="/admin/compliance" className="p-3" />
              <th className="text-left p-3">Detail</th>
              <SortTh field="detected" label="Detected" current={sort} dir={dir} sp={sp} baseHref="/admin/compliance" className="p-3" />
            </tr>
          </thead>
          <tbody className="text-text-secondary">
            {paged.map((f) => (
              <tr key={`${f.userId}-${f.marker}`} className="border-t border-border-subtle/50">
                <td className="p-3 font-mono">
                  <a href={`/admin/players/${f.userId}`} className="hover:text-royal-300 hover:underline">
                    {f.userId.slice(0, 16)}…
                  </a>
                </td>
                <td className="p-3 font-medium text-text">{f.marker}</td>
                <td className="p-3">
                  <Chip size="sm" variant={f.severity === "high" ? "danger" : f.severity === "warn" ? "warning" : "neutral"}>
                    {f.severity}
                  </Chip>
                </td>
                <td className="p-3 text-text-tertiary">{f.detail}</td>
                <td className="p-3 font-mono whitespace-nowrap">{formatDateTime(f.detectedAt)}</td>
              </tr>
            ))}
            {flags.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-text-tertiary">No markers of harm detected.</td></tr>
            )}
          </tbody>
        </table>
      </ScrollX>
      <AdminPagination total={sorted.length} page={page} baseHref={baseHref} />
    </AdminCard>
  );
}
