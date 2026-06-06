import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { db } from "@/lib/server/store";
import { rgRosterCounts } from "@/lib/server/analytics";

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

function buildRoster(): RosterRow[] {
  const now = Date.now();
  const out: RosterRow[] = [];
  for (const u of db.user.list()) {
    const r = db.responsible.get(u.id);
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

export default function AdminSelfExclusionsPage() {
  const roster = buildRoster();
  const counts = rgRosterCounts();

  return (
    <>
      <AdminPageHead
        title="Self-exclusion roster"
        sw="Sajili ya kujizuia"
        period={false}
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Chip size="sm" variant="danger">{counts.selfExcluded} excluded</Chip>
            <Chip size="sm" variant="warning">{counts.cooledOff} cooling-off</Chip>
          </div>
        }
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Self-excluded"        sw="Wamejizuia"         value={counts.selfExcluded.toLocaleString()} delta="active roster" />
          <AdminKpi label="Cooling-off"           sw="Kupumzika"          value={counts.cooledOff.toLocaleString()} delta="in progress" />
          <AdminKpi label="Expiring this week"    sw="Inakwisha wiki hii" value={counts.expiringThisWeek.toLocaleString()} delta="follow-up window" />
          <AdminKpi label="Pending limit-increase" sw="Kuongeza kikomo"    value={counts.pendingLimitIncrease.toLocaleString()} delta="24h cool-down" />
        </div>

        {/* Roster table */}
        <AdminCard
          title="Roster · in order of next expiry"
          sw="Orodha"
          action={<span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">{roster.length} active</span>}
        >
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-caption min-w-[640px]">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                <tr>
                  <th className="text-left py-2 pr-3">Player</th>
                  <th className="text-left py-2 pr-3">Phone</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2 pr-3">Until</th>
                  <th className="text-right py-2 pr-3">Days left</th>
                  <th className="text-left py-2 pl-3">Profile</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.userId} className="border-b border-border-subtle/40 last:border-b-0">
                    <td className="py-2 pr-3">
                      <a href={`/admin/players/${r.userId}`} className="font-medium text-text hover:text-royal hover:underline">{r.displayName ?? "—"}</a>
                      <span className="block font-mono text-micro text-text-tertiary">{r.userId.slice(0, 14)}…</span>
                    </td>
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{r.phoneE164}</td>
                    <td className="py-2 pr-3">
                      {r.status === "self_exclusion" ? (
                        <Chip size="sm" variant="danger"><I.lock s={10} /> excluded</Chip>
                      ) : (
                        <Chip size="sm" variant="warning"><I.pause s={10} /> cooling-off</Chip>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{new Date(r.until).toLocaleString("en-GB")}</td>
                    <td className="py-2 pr-3 font-mono tabular text-right">{r.daysLeft}</td>
                    <td className="py-2 pl-3">
                      <a href={`/admin/players/${r.userId}`} className="font-mono text-micro tracking-[0.10em] uppercase text-royal hover:underline">profile →</a>
                    </td>
                  </tr>
                ))}
                {roster.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-text-tertiary">No players currently in self-exclusion or cooling-off.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
