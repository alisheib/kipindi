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
import { getAuditPage } from "@/lib/server/audit";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";
import { chainStore, assetStore, roundStore } from "@/lib/server/updown-dal";
import { PurgeChainCard } from "./purge-chain-card";
import { getFirstSignature } from "./purge-stage1-store";
import { currentSession } from "@/lib/server/auth-service";

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
  // ⭐ CORRECTED 2026-08-21 (Ali's decision, audit F-01). This row said "3 years · From
  // withdrawal of consent" while /legal/privacy §5 told the PLAYER "until withdrawn or 2 years
  // of inactivity", in all three locales. Two different periods AND two different triggers for
  // the same data class — one shown to the Gaming Board, one to the data subject.
  //
  // It was corrected DOWN to match the player, not the other way round, and the direction is
  // the whole argument: under PDPA 2022 you may not retain personal data longer than the
  // purpose you disclosed to the person it belongs to, and the player-facing policy IS that
  // disclosure. Raising the player's number to 3 years would have told players their data is
  // kept longer than they were previously told — a change requiring notice, and the only one
  // of the two options carrying exposure. Lowering this one requires notice to nobody.
  //
  // The business case for 3 years was weak in any event: what is actually stored is
  // `User.marketingOptIn`, a boolean, plus the audit trail of consent changes. There is no
  // rich marketing dataset here being preserved.
  { category: "Marketing-consent records", swahili: "Idhini ya matangazo", retentionYears: 2, legalBasis: "Tanzania PDPA §15", trigger: "From last activity (matches the player-facing policy)", storage: "Postgres" },
  { category: "OTP code hashes", swahili: "Misimbo ya OTP", retentionYears: "30 days", legalBasis: "Operational only", trigger: "From issue", storage: "Postgres (purged nightly)" },
  { category: "Session cookies", swahili: "Vidakuzi vya kikao", retentionYears: "7 days max TTL", legalBasis: "Operational only", trigger: "Per cookie expiry", storage: "Browser only (HMAC-signed)" },
  // ⚠️ MARKED N/A 2026-08-21 (Ali's decision, audit F-01). This published a 3-year retention
  // period for data the platform does not hold: there is no ticket store, and customer care is
  // still unbuilt (NEXT-PLAN queue, Unit K · #12 + #13). Publishing a period for a system that
  // does not exist is the same defect as the rest of F-01 — a schedule describing a platform we
  // are not. The intent is kept rather than deleted so it is picked up when Unit K ships, which
  // is the same treatment the Session row gets.
  { category: "Customer-support tickets", swahili: "Tiketi za usaidizi", retentionYears: "n/a — no ticket store yet (Unit K)", legalBasis: "Tanzania PDPA §22 — applies once built", trigger: "From ticket close", storage: "— not yet stored" },
  { category: "Behavioural-marker logs (RG)", swahili: "Alama za tabia", retentionYears: 5, legalBasis: "LCCP SR Code 3.4.1", trigger: "From event date", storage: "Postgres" },
  { category: "Backup snapshots (HMAC-signed)", swahili: "Nakala rudufu", retentionYears: "90 days rolling", legalBasis: "DR/BCP", trigger: "Per snapshot date", storage: "S3 with SSE-KMS" },
];

export default async function AdminRetentionPage() {
  const allUsers = await db.user.list();
  const userCount = allUsers.length;
  const closed = allUsers.filter((u) => u.status === "CLOSED").length;

  /* The purge ceremony's inputs. ⛔ ARCHIVED ONLY — archiving is the required prior step, and
     it is the one that can be undone. Reading the first signatures here rather than in the
     client keeps the durable store server-side; the card only needs to know WHETHER one
     exists and whose it is, so it can tell officer A they are waiting on someone else. */
  const allChains = await chainStore.list();
  const archived = allChains.filter((c) => c.state === "ARCHIVED");
  const archivedChains = await Promise.all(
    archived.map(async (c) => {
      const asset = await assetStore.get(c.assetId);
      return {
        id: c.id,
        label: `${asset?.key ?? c.assetId} ${c.durationMinutes}m`,
        rounds: await roundStore.count({ chainId: c.id }),
      };
    }),
  );
  /* Who is looking — so the card can tell "I signed" from "someone else signed" and never
     offer officer A a confirm the server would refuse. */
  const session = await currentSession();
  const viewer = session?.userId ?? "";
  const stage1Map: Record<string, { actorId: string; at: string } | undefined> = {};
  for (const c of archivedChains) {
    const sig = await getFirstSignature(c.id);
    if (sig) stage1Map[c.id] = { actorId: sig.actorId, at: sig.at };
  }
  // Read through the audit API (like /admin/system) rather than poking the
  // globalThis ring directly — best-effort, capped read.
  const auditEntries = getAuditPage({ limit: 100_000 }).length;

  return (
    <>
      <AdminPageHead
        title="Data retention schedule"
        sw="Ratiba ya kuhifadhi data"
        actions={<Chip size="md" variant="neutral">{SCHEDULE.length} categories</Chip>}
      />
      <AdminBody>
        <KpiGrid>
          <AdminKpi label="Live users"      sw="Watumiaji hai"      value={userCount.toLocaleString()}   delta="active records" />
          <AdminKpi label="Closed accounts" sw="Akaunti zilizofungwa" value={closed.toLocaleString()}    delta="7y retention" />
          <AdminKpi label="Audit entries"   sw="Kumbukumbu"          value={auditEntries.toLocaleString()} delta="HMAC-chained" />
          <AdminKpi label="Default class"   sw="Aina kuu"            value="7y"                        delta="POCA Cap 423 §16" />
        </KpiGrid>

        <AdminCard
          title="Schedule · category × retention × legal basis"
          sw="Ratiba"
          padding="p-0"
        >
          <ScrollX label="Retention schedule">
            <table className="admin-tbl min-w-[720px]">
              <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
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
          </ScrollX>
        </AdminCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard className="border-info-border bg-info-bg">
            <div className="flex items-start gap-3">
              <I.archive s={18} className="text-info shrink-0 mt-0.5" />
              <div className="text-caption text-text-secondary space-y-1">
                <p className="text-text font-bold">Automated purge <span className="font-normal text-success-fg">· LIVE since 2026-08-20</span></p>
                <p>
                  <code className="font-mono">retention.purge.daily</code> runs once every 24 hours inside the
                  lifecycle pass (leader-leased, so one container only), deleting in-app notifications older than
                  180 days and OTP hashes older than 30 days from issue. Each run that deletes anything writes a
                  <code className="font-mono"> SYSTEM</code> audit row naming the counts per class; a run that
                  deletes nothing writes none, because a daily &ldquo;nothing happened&rdquo; entry in a log that
                  cannot be pruned is noise forever.
                </p>
                <p className="text-text-tertiary">
                  Two honest differences from the plan this card used to describe. It runs on a 24-hour interval
                  rather than at 02:30 EAT — every other chore in the lifecycle pass works that way, it needs no
                  timezone reasoning, and for deleting aged rows the hour is not a property anyone depends on.
                  And it does not purge sessions: that model has never been written to (the platform uses a signed
                  cookie plus <code className="font-mono">ActiveSession</code>), so a prune there would be a
                  permanent no-op dressed as a control. Support tickets are still policy-only.
                </p>
                <p className="text-text-tertiary">
                  ⛔ It cannot reach money, identity or audit records: it names the two classes it deletes.
                  <code className="font-mono"> docs/DATA-RETENTION.md</code> is the authority for the full schedule
                  and marks which rows are enforced by code and which remain policy.
                </p>
              </div>
            </div>
          </AdminCard>
          <AdminCard className="border-warning-border bg-warning-bg">
            <div className="flex items-start gap-3">
              <I.alertCircle s={18} />
              <div className="text-caption text-text-secondary space-y-1">
                <p className="text-text font-bold">Erasure-vs-AML conflict <span className="font-normal text-success-fg">· LIVE since 2026-08-21</span></p>
                <p>
                  Where a player invokes erasure (PDPA §31 / GDPR Art. 17) and we hold AML records subject to
                  POCA Cap 423 §16 (7-year minimum), we <strong>partially fulfil</strong>, and pressing
                  <em> Fulfil</em> on an ERASURE request in the DSAR queue now runs it. Contact details, password,
                  profile, in-app messages, push registrations and the name and number on the identity record are
                  erased immediately — the identity number is replaced by a <strong>keyed HMAC of itself</strong>,
                  never blanked, so one document still cannot open two accounts. The financial record and the
                  identity <strong>images</strong> are retained for the statutory 7 years from closure; the request
                  stays in the queue marked <em>Partly done · docs held</em> and carries the release date, because
                  nothing else on the platform remembers it.
                </p>
                <p className="text-text-tertiary">
                  ⛔ The routine refuses an account that is not CLOSED, and it cannot reach a wallet, a transaction,
                  a ledger entry, a position or the audit chain — it names what it writes.
                  <code className="font-mono"> npm run test:erasure</code> proves the identity document is still spent
                  after erasure; <code className="font-mono">npm run red:erasure</code> puts each defect back and
                  requires the suite to catch it.
                </p>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* ⭐ THE PURGE CEREMONY LIVES HERE, not on /admin/updown, which is a `trading` route:
            a `compliance` control there is Owner-only in practice and logs every legitimate
            compliance click as `privilege_escalation_blocked` (the documented E-18/E-23
            failure, which voidUpDownRound had to be corrected for within the hour).
            /admin/updown carries a link to this card instead. */}
        {/* ⚠️ THE CARD CHROME IS RENDERED HERE, in the server component, and the interactive
            body is the client one. `AdminCard` lives in admin-shell, which imports the server
            store, control-gates and roles — so importing it from a "use client" file drags that
            whole graph into the browser bundle and the build fails on ioredis reaching for
            node:dns. This split is the reason, not a preference. */}
        <AdminCard title="Purge a chain and its history" sw="Futa msururu na historia yake">
          <PurgeChainCard chains={archivedChains} stage1={stage1Map} viewerId={viewer} />
        </AdminCard>
      </AdminBody>
    </>
  );
}
