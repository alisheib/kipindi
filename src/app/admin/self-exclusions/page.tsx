import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage } from "@/components/admin/admin-pagination";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { db } from "@/lib/server/store";
import { rgRosterCounts } from "@/lib/server/analytics";
import { maskName } from "@/lib/server/affiliate-service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Admin · Self-exclusions" };
export const dynamic = "force-dynamic";

type RosterRow = {
  userId: string;
  displayName: string | null;
  phoneE164: string;
  status: "self_exclusion" | "cooling_off";
  until: string;
  daysLeft: number;
};

async function buildRoster() {
  const now = Date.now();
  const out: RosterRow[] = [];
  const [users, allRg] = await Promise.all([db.user.list(), db.responsible.listAll()]);
  const rgMap = new Map(allRg.map((r) => [r.userId, r]));
  for (const u of users) {
    const r = rgMap.get(u.id);
    if (!r) continue;
    const sxAt = r.selfExclusionUntil ? new Date(r.selfExclusionUntil).getTime() : 0;
    const coAt = r.coolingOffUntil    ? new Date(r.coolingOffUntil).getTime() : 0;
    if (sxAt > now) {
      out.push({
        userId: u.id,
        displayName: u.displayName,
        phoneE164: u.phoneE164,
        status: "self_exclusion",
        until: r.selfExclusionUntil!,
        daysLeft: Math.ceil((sxAt - now) / (24 * 3600_000)),
      });
    } else if (coAt > now) {
      out.push({
        userId: u.id,
        displayName: u.displayName,
        phoneE164: u.phoneE164,
        status: "cooling_off",
        until: r.coolingOffUntil!,
        daysLeft: Math.ceil((coAt - now) / (24 * 3600_000)),
      });
    }
  }
  return out.sort((a, b) => a.until.localeCompare(b.until));
}

export default async function AdminSelfExclusionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  // A-5: track each read's failure. A failed roster/count read must NOT render a
  // fabricated "0 excluded" — on a compliance surface that reads as a false
  // "nobody is self-excluded" safety signal. Show an explicit "couldn't load".
  let rosterFailed = false;
  const roster = await buildRoster().catch(() => { rosterFailed = true; return [] as Awaited<ReturnType<typeof buildRoster>>; });
  const page = parsePage(sp.page, roster.length);
  const paged = roster.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  let countsFailed = false;
  const counts = await rgRosterCounts().catch(() => { countsFailed = true; return { selfExcluded: 0, cooledOff: 0, expiringThisWeek: 0, pendingLimitIncrease: 0 }; });

  return (
    <>
      <AdminPageHead
        title="Self-exclusion roster"
        sw="Sajili ya kujizuia"
        period={false}
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            {countsFailed ? (
              <Chip size="sm" variant="neutral">counts n/a</Chip>
            ) : (
              <>
                <Chip size="sm" variant="danger">{counts.selfExcluded} excluded</Chip>
                <Chip size="sm" variant="warning">{counts.cooledOff} cooling-off</Chip>
              </>
            )}
          </div>
        }
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Self-excluded"        sw="Wamejizuia"         value={countsFailed ? "" : counts.selfExcluded.toLocaleString()} unavailable={countsFailed} delta="active roster" />
          <AdminKpi label="Cooling-off"           sw="Kupumzika"          value={countsFailed ? "" : counts.cooledOff.toLocaleString()} unavailable={countsFailed} delta="in progress" />
          <AdminKpi label="Expiring this week"    sw="Inakwisha wiki hii" value={countsFailed ? "" : counts.expiringThisWeek.toLocaleString()} unavailable={countsFailed} delta="follow-up window" />
          <AdminKpi label="Pending limit-increase" sw="Kuongeza kikomo"    value={countsFailed ? "" : counts.pendingLimitIncrease.toLocaleString()} unavailable={countsFailed} delta="24h cool-down" />
        </div>

        {/* Roster table */}
        <AdminCard
          title="Roster · in order of next expiry"
          sw="Orodha"
          action={<span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">{rosterFailed ? "—" : `${roster.length} active`}</span>}
        >
          {rosterFailed ? (
            <AdminLoadError what="the self-exclusion roster" />
          ) : (
          <ScrollX label="Self-exclusion roster">
            <table className="admin-tbl min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Player</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Until</th>
                  <th className="text-right">Days left</th>
                  <th className="text-left">Profile</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.userId}>
                    <td>
                      {/* PII-minimised in the roster (self-excluded players are a
                          sensitive cohort). Full identity only on the audited
                          detail page — matches the masked-phone column. */}
                      <a href={`/admin/players/${r.userId}`} className="font-medium text-text hover:text-royal-300 hover:underline">{maskName(r.displayName, r.phoneE164)}</a>
                      <span className="block font-mono text-micro text-text-tertiary">{r.userId.slice(0, 14)}…</span>
                    </td>
                    <td className="font-mono whitespace-nowrap">{r.phoneE164.length > 6 ? `${r.phoneE164.slice(0, 4)}****${r.phoneE164.slice(-2)}` : r.phoneE164}</td>
                    <td>
                      {r.status === "self_exclusion" ? (
                        <Chip size="sm" variant="danger"><I.lock s={10} /> excluded</Chip>
                      ) : (
                        <Chip size="sm" variant="warning"><I.pause s={10} /> cooling-off</Chip>
                      )}
                    </td>
                    <td className="font-mono whitespace-nowrap">{formatDateTime(r.until)}</td>
                    <td className="font-mono tabular text-right">{r.daysLeft}</td>
                    <td>
                      <a href={`/admin/players/${r.userId}`} className="font-mono text-micro tracking-[0.10em] uppercase text-royal-300 hover:underline">profile →</a>
                    </td>
                  </tr>
                ))}
                {roster.length === 0 && (
                  <AdminTableEmpty
                    colSpan={6}
                    kind="admin"
                    title="Roster empty"
                    body="No players are currently in self-exclusion or cooling-off."
                  />
                )}
              </tbody>
            </table>
          </ScrollX>
          )}
          {!rosterFailed && <AdminPagination total={roster.length} page={page} baseHref="/admin/self-exclusions" />}
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">Cross-operator register (planned, Q3 2026)</p>
            <p>
              The Tanzania Gaming Board&apos;s cross-operator self-exclusion register will accept a daily SFTP upload of
              this roster so a player who self-excludes on 50pick is also blocked at all other licensed operators.
              Format: hashed-NIDA + region + period; reviewed by GBT compliance unit.
            </p>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
