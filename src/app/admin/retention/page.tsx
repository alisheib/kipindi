/**
 * Data retention schedule · /admin/retention
 *
 * Single source of truth for how long each class of data is kept and on what
 * legal basis. The table below is the dataset GBT / TRA / FIU expect to see
 * during a periodic review.
 */
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { db } from "@/lib/server/store";
import { I } from "@/components/ui/glyphs";

export const metadata = { title: "Admin · Data retention" };
export const dynamic = "force-dynamic";

type Row = {
  category: string;
  swahili: string;
  retentionYears: number | string;
  legalBasis: string;
  trigger: string;
  storage: string;
};

const SCHEDULE: Row[] = [
  { category: "Account + KYC documents", swahili: "Akaunti na vitambulisho", retentionYears: 7, legalBasis: "POCA Cap 423 §16; FATF R.11", trigger: "From account closure", storage: "Encrypted S3 + Postgres" },
  { category: "Transactions (deposit/withdraw/bet)", swahili: "Miamala", retentionYears: 7, legalBasis: "POCA Cap 423 §16; TRA Income Tax Act §80", trigger: "From transaction date", storage: "Postgres + signed daily snapshot" },
  { category: "Audit log (HMAC-chained)", swahili: "Kumbukumbu", retentionYears: 7, legalBasis: "ISO 27001 A.12.4; GLI-19 §11", trigger: "From event date", storage: "In-memory ring → Postgres → cold archive" },
  { category: "Self-exclusion register entries", swahili: "Kujizuia", retentionYears: 5, legalBasis: "LCCP SR Code 3.4.4", trigger: "From end of exclusion", storage: "Postgres + cross-operator SFTP daily" },
  { category: "Marketing-consent records", swahili: "Idhini ya matangazo", retentionYears: 3, legalBasis: "Tanzania PDPA §15", trigger: "From withdrawal of consent", storage: "Postgres" },
  { category: "OTP code hashes", swahili: "Misimbo ya OTP", retentionYears: "30 days", legalBasis: "Operational only", trigger: "From issue", storage: "Postgres (purged nightly)" },
  { category: "Session cookies", swahili: "Vidakuzi vya kikao", retentionYears: "7 days max TTL", legalBasis: "Operational only", trigger: "Per cookie expiry", storage: "Browser only (HMAC-signed)" },
  { category: "Customer-support tickets", swahili: "Tiketi za usaidizi", retentionYears: 3, legalBasis: "Tanzania PDPA §22", trigger: "From ticket close", storage: "Postgres" },
  { category: "Behavioural-marker logs (RG)", swahili: "Alama za tabia", retentionYears: 5, legalBasis: "LCCP SR Code 3.4.1", trigger: "From event date", storage: "Postgres" },
  { category: "Backup snapshots (HMAC-signed)", swahili: "Nakala rudufu", retentionYears: "90 days rolling", legalBasis: "DR/BCP", trigger: "Per snapshot date", storage: "S3 with SSE-KMS" },
];

export default async function AdminRetentionPage() {
  const userCount = (await db.user.list()).length;
  const closed = (await db.user.list()).filter((u) => u.status === "CLOSED").length;
  const auditEntries = (globalThis as { __50PICK_AUDIT_RING?: unknown[] }).__50PICK_AUDIT_RING?.length ?? 0;

  return (
    <>
      <AdminPageHead
        title="Data retention schedule"
        sw="Ratiba ya kuhifadhi data"
        period={false}
        actions={<Chip size="md" variant="neutral">{SCHEDULE.length} categories</Chip>}
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Live users"      sw="Watumiaji hai"      value={userCount.toLocaleString()}   delta="active records" />
          <AdminKpi label="Closed accounts" sw="Akaunti zilizofungwa" value={closed.toLocaleString()}    delta="7y retention" />
          <AdminKpi label="Audit entries"   sw="Kumbukumbu"          value={auditEntries.toLocaleString()} delta="HMAC-chained" />
          <AdminKpi label="Default class"   sw="Aina kuu"            value="7y"                        delta="POCA Cap 423 §16" />
        </div>

        <AdminCard
          title="Schedule · category × retention × legal basis"
          sw="Ratiba"
          padding="p-0"
        >
          <div className="overflow-x-auto">
            <table className="admin-tbl">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                <tr>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Retention</th>
                  <th className="text-left p-3">Trigger</th>
                  <th className="text-left p-3">Legal basis</th>
                  <th className="text-left p-3">Storage</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {SCHEDULE.map((row, i) => (
                  <tr key={i} className="border-t border-border-subtle/50 align-top">
                    <td className="p-3">
                      <p className="text-text font-medium">{row.category}</p>
                      <p className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">{row.swahili}</p>
                    </td>
                    <td className="p-3">
                      <Chip size="sm" variant={typeof row.retentionYears === "number" && row.retentionYears >= 5 ? "warning" : "neutral"}>
                        {typeof row.retentionYears === "number" ? `${row.retentionYears}y` : row.retentionYears}
                      </Chip>
                    </td>
                    <td className="p-3 text-text-tertiary">{row.trigger}</td>
                    <td className="p-3 font-mono text-micro tracking-[0.10em] uppercase text-text-secondary">{row.legalBasis}</td>
                    <td className="p-3 text-text-tertiary">{row.storage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard className="border-info-border bg-info-bg/15">
            <div className="flex items-start gap-3">
              <I.archive size={18} className="text-info shrink-0 mt-0.5" />
              <div className="text-caption text-text-secondary space-y-1">
                <p className="text-text font-bold">Automated purge <span className="font-normal text-text-tertiary">· target architecture (not yet enforced)</span></p>
                <p>
                  Planned: a nightly cron <code className="font-mono">retention.purge.daily</code> at 02:30 EAT purging
                  OTP hashes &gt; 30 days, sessions &gt; 7 days, and tickets &gt; 3 years from close, each emitting a
                  <code className="font-mono"> SYSTEM</code> audit row. This job is not wired in the current build.
                </p>
              </div>
            </div>
          </AdminCard>
          <AdminCard className="border-warning-border bg-warning-bg/15">
            <div className="flex items-start gap-3">
              <I.alertCircle s={18} />
              <div className="text-caption text-text-secondary space-y-1">
                <p className="text-text font-bold">Erasure-vs-AML conflict <span className="font-normal text-text-tertiary">· policy (routine not yet wired)</span></p>
                <p>
                  Policy: where a player invokes erasure (PDPA §31 / GDPR Art. 17) and we hold AML records subject to
                  POCA Cap 423 §16 (7-year minimum), we partially fulfil — PII fields pseudonymised (hashed-NIDA replaces
                  full name + phone), financial record retained for the statutory period. The automated routine is not yet
                  wired, so manual erasure-fulfillment is currently blocked in the DSAR queue (escalate to engineering).
                </p>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
