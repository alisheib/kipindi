import { AdminPageHead, AdminCard, FeedRow } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { getAuditPage } from "@/lib/server/audit";
import { GenerateButton } from "./generate-button";

export const metadata = { title: "Admin · Reports" };
export const dynamic = "force-dynamic";

const TEMPLATES = [
  {
    id: "daily-ops",
    title: "Daily operations report",
    sw: "Ripoti ya kila siku",
    body: "Total sales (stakes), number of tickets, GGR, TRA 10% withholding tax, GBT 5% levy, operator margin, hourly breakdown, deposits/withdrawals. One-page operational snapshot.",
    formats: ["Excel", "PDF"],
    cadence: "Daily",
    severity: "medium",
    target: "Internal · ops",
  },
  {
    id: "gbt-monthly",
    title: "Monthly report",
    sw: "Ripoti ya kila mwezi",
    body: "Tanzania Gaming Board · 12-sheet workbook covering player register changes, GGR, NGR, deposit/withdraw flows, AML triggers, self-exclusion roster, integrity alerts, audit-chain proof. Signed JSON + accompanying PDF.",
    formats: ["JSON (signed)", "PDF"],
    cadence: "Monthly · 5th of each month",
    severity: "high",
    target: "Regulator",
  },
  {
    id: "tra-tax",
    title: "TRA withholding tax remittance",
    sw: "Kodi · TRA",
    body: "Tanzania Revenue Authority · per-player withholding-tax filing, Income Tax Act Cap 332 schedule. Includes player NIDA, gross winnings, tax withheld, net paid, mobile-money provider reference.",
    formats: ["CSV (TRA-format)", "JSON"],
    cadence: "Monthly · 7th of each month",
    severity: "high",
    target: "TRA",
  },
  {
    id: "fiu-sar",
    title: "Suspicious activity report (FIU)",
    sw: "Ripoti ya tuhuma · FIU",
    body: "Financial Intelligence Unit · suspicious activity flagged by AML triggers (single transaction ≥ TZS 1M, structuring, rapid-cycle pattern, sanctions match). Filed within 7 days of identification per POCA Cap 423.",
    formats: ["FIU-format encrypted bundle"],
    cadence: "On-trigger · within 7 days",
    severity: "critical",
    target: "FIU",
  },
  {
    id: "iso-audit",
    title: "ISO 27001 audit log export",
    sw: "Kumbukumbu · ISO",
    body: "Audit-log dump for ISO 27001 A.12.4 compliance. Includes HMAC chain proof so an external auditor can verify the log is intact end-to-end.",
    formats: ["CSV", "JSON (signed)"],
    cadence: "Quarterly · or on demand",
    severity: "medium",
    target: "ISO 27001 auditor",
  },
  {
    id: "kyc-reverify",
    title: "KYC re-verification roster",
    sw: "Orodha · uthibitisho upya",
    body: "Players whose KYC is due for re-verification (every 24 months or on phone/region change). Drives the customer-comms team's outreach queue.",
    formats: ["CSV"],
    cadence: "Weekly",
    severity: "medium",
    target: "Internal · customer comms",
  },
  {
    id: "sx-register",
    title: "Cross-operator self-exclusion register",
    sw: "Sajili · kujizuia",
    body: "Anonymised + hashed list of currently self-excluded players, in the cross-operator format the GBT will adopt in Q3 2026. Blocks players from registering at any other licensed operator while excluded.",
    formats: ["GBT cross-operator CSV"],
    cadence: "Daily SFTP",
    severity: "high",
    target: "GBT cross-operator register",
  },
  {
    id: "rg-engagement",
    title: "Responsible-gambling engagement",
    sw: "Hali ya wachezaji",
    body: "Reality-check fire counts and player responses (continued / break / self-exclude), limit-change history, deferred increases. Used for LCCP-style RG audits.",
    formats: ["CSV", "PDF"],
    cadence: "Monthly",
    severity: "medium",
    target: "Internal · RG audit",
  },
  {
    id: "match-integrity",
    title: "Match-integrity quarterly review",
    sw: "Uadilifu wa mechi",
    body: "Aggregated Sportradar Integrity Services alerts, voided bets, refunded stakes, voided pools, with case file per alert.",
    formats: ["PDF"],
    cadence: "Quarterly",
    severity: "high",
    target: "Sportradar + GBT integrity unit",
  },
];

export default function AdminReportsPage() {
  // Generation log = audit entries from ADMIN with action starting "report."
  const generated = getAuditPage({ category: "ADMIN", limit: 30 }).filter((e) => e.action.startsWith("report."));

  return (
    <>
      <AdminPageHead
        title="Reports"
        sw="Ripoti"
        period={false}
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Templates list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <AdminCard key={t.id} className="hover:border-border-strong transition-colors">
              <div className="flex items-start gap-3">
                <span
                  className={[
                    "h-9 w-9 rounded-md inline-flex items-center justify-center font-mono shrink-0",
                    t.severity === "critical" ? "bg-danger/15 text-danger" :
                    t.severity === "high"     ? "bg-gold/15 text-gold" :
                                                "bg-royal/15 text-royal",
                  ].join(" ")}
                >
                  ↓
                </span>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="font-display font-bold text-[14px] text-text leading-snug">{t.title}</p>
                    <p className="text-[11px] text-text-tertiary italic mt-0.5">{t.sw}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip
                      size="sm"
                      variant={t.severity === "critical" ? "danger" : t.severity === "high" ? "gold" : "neutral"}
                    >
                      {t.target}
                    </Chip>
                    <span className="font-mono text-[10px] tracking-wider text-text-tertiary self-center">{t.cadence}</span>
                  </div>
                  <p className="text-[12px] text-text-secondary leading-relaxed">{t.body}</p>
                  <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-border-subtle">
                    <div className="flex flex-wrap gap-1">
                      {t.formats.map((f) => (
                        <span key={f} className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-sm bg-bg-sunken text-text-tertiary whitespace-nowrap">
                          {f}
                        </span>
                      ))}
                    </div>
                    <GenerateButton id={t.id} />
                  </div>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>

        {/* Generation log */}
        <AdminCard title="Generation log" sw="Kumbukumbu ya kuzalisha" padding={generated.length > 0 ? "p-0" : "p-4"}>
          {generated.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <I.shieldcheck s={18} />
              <p className="text-caption text-text-secondary">
                No reports generated yet. Each generated report is logged here with reviewer, timestamp,
                period covered, and a signed receipt the regulator can verify.
              </p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              <table className="admin-tbl">
                <thead>
                  <tr>
                    <th className="text-left">Timestamp</th>
                    <th className="text-left">Report</th>
                    <th className="text-left">Reviewer</th>
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  {generated.map((e) => (
                    <tr key={e.id}>
                      <td className="font-mono whitespace-nowrap text-text-subtle">{e.createdAt.replace("T", " ").slice(0, 19)}</td>
                      <td className="font-medium text-text">{e.action}</td>
                      <td className="font-mono">{e.actorId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">Generation pipeline (production)</p>
            <p>
              Each template runs against Postgres aggregations, signs the output with HMAC-chained envelopes
              (matching the audit-chain scheme), and uploads to the regulator&apos;s endpoint via SFTP / mTLS.
              Failed generations alert on-call. Every download is recorded under <code>ADMIN</code> with
              the reviewer&apos;s user-id, IP, and reason.
            </p>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
