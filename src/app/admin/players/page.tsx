import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/server/store";
import { formatTzs, formatDate } from "@/lib/utils";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { displayLabel, displayInitials } from "@/lib/display-label";

export const metadata = { title: "Admin · Players" };
export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  ACTIVE: "success",
  PENDING_KYC: "warning",
  SUSPENDED: "danger",
  SELF_EXCLUDED: "danger",
  COOLED_OFF: "warning",
  CLOSED: "neutral",
};

export default async function AdminPlayersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; sort?: string; dir?: string; page?: string }> }) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().toLowerCase();
  const statusFilter = sp.status ?? "";
  const sortField = (["joined", "login", "balance"] as const).includes(sp.sort as never) ? sp.sort! : "joined";
  const sortDir = sp.dir === "asc" ? "asc" : "desc";

  // A-5: distinguish a failed population read from a genuinely empty player base,
  // so the headline counts show "n/a" (not a fabricated "0 players") on failure.
  let all: Awaited<ReturnType<typeof db.user.list>> = [];
  let usersFailed = false;
  try { all = await db.user.list(); } catch { usersFailed = true; }
  const filtered = all.filter((u) => {
    if (statusFilter && u.status !== statusFilter) return false;
    if (!query) return true;
    return (
      u.id.toLowerCase().includes(query) ||
      u.phoneE164.toLowerCase().includes(query) ||
      (u.displayName ?? "").toLowerCase().includes(query) ||
      // Auto-handle search — operator can paste "Player #A3F2K8" or
      // just "A3F2K8" and it resolves to the right account.
      displayLabel(u).toLowerCase().includes(query)
    );
  });

  // Sort
  if (sortField === "balance") {
    // Batch-load all wallets in one query instead of N+1 per-user lookups.
    let allWallets: Awaited<ReturnType<typeof db.wallet.listAll>> = [];
    try { allWallets = await db.wallet.listAll(); } catch { /* graceful */ }
    const balanceMap = new Map<string, number>();
    for (const w of allWallets) balanceMap.set(w.userId, w.balance);
    filtered.sort((a, b) => {
      const cmp = (balanceMap.get(a.id) ?? 0) - (balanceMap.get(b.id) ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
  } else {
    filtered.sort((a, b) => {
      const cmp = sortField === "login"
        ? (a.lastLoginAt ?? "").localeCompare(b.lastLoginAt ?? "")
        : a.createdAt.localeCompare(b.createdAt);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  // Paginate
  const page = parsePage(sp.page, filtered.length);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/players", { q: sp.q, status: sp.status, sort: sp.sort, dir: sp.dir });

  // One pass over the population → the status→count map that feeds both the KPI
  // band and the status-mix bar (was seven separate .filter() passes).
  const statusCounts: Record<string, number> = {};
  for (const u of all) statusCounts[u.status] = (statusCounts[u.status] ?? 0) + 1;
  const counts = {
    total: all.length,
    active: statusCounts.ACTIVE ?? 0,
    pending_kyc: statusCounts.PENDING_KYC ?? 0,
    suspended: statusCounts.SUSPENDED ?? 0,
    self_excluded: statusCounts.SELF_EXCLUDED ?? 0,
  };
  const blocked = counts.suspended + counts.self_excluded;

  return (
    <>
      <AdminPageHead title="Players" sw="Wachezaji" period={false} />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Headline KPIs — replaces the header count-chips with the console-standard
            band (matches overview / cohorts). Blocked = suspended + self-excluded. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Total players" sw="Jumla ya wachezaji" value={usersFailed ? "" : counts.total.toLocaleString()} unavailable={usersFailed} />
          <AdminKpi label="Active" sw="Hai" value={usersFailed ? "" : counts.active.toLocaleString()} unavailable={usersFailed} tone="success" delta={`${counts.total ? Math.round((counts.active / counts.total) * 100) : 0}%`} deltaDir="up" />
          <AdminKpi label="Pending KYC" sw="Inasubiri KYC" value={usersFailed ? "" : counts.pending_kyc.toLocaleString()} unavailable={usersFailed} delta={counts.pending_kyc > 0 ? "needs review" : "clear"} deltaDir={counts.pending_kyc > 0 ? "up" : "flat"} />
          <AdminKpi label="Blocked" sw="Zimezuiwa" value={usersFailed ? "" : blocked.toLocaleString()} unavailable={usersFailed} tone={blocked > 0 ? "danger" : undefined} delta={`${counts.suspended} susp · ${counts.self_excluded} excl`} deltaDir="flat" />
        </div>

        {/* Population status mix — one at-a-glance segmented bar (green Active /
            amber pending / rose blocked / grey closed). Complements the numeric
            band; the detailed per-status breakdown lives on Cohorts. */}
        <StatusMix counts={statusCounts} />

        <AdminCard padding="p-3">
          <form className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[260px]">
              <I.search size={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Phone (+255…), display name, or usr_…"
                aria-label="Search players"
                className="h-8 w-full rounded-md border border-border bg-bg-overlay pl-9 pr-3 text-[12.5px] text-text outline-none admin-focus transition-colors placeholder:text-text-subtle"
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select
                name="status"
                defaultValue={statusFilter}
                size="xs"
                placeholder="All statuses"
                options={[
                  { value: "", label: "All statuses" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "PENDING_KYC", label: "Pending KYC" },
                  { value: "SUSPENDED", label: "Suspended" },
                  { value: "SELF_EXCLUDED", label: "Self-excluded" },
                  { value: "COOLED_OFF", label: "Cooled off" },
                  { value: "CLOSED", label: "Closed" },
                ]}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm h-8">
              Search
            </button>
            {(query || statusFilter) && (
              <a href="/admin/players" className="btn btn-ghost btn-sm h-8">
                Clear
              </a>
            )}
          </form>
          <p className="mt-2 text-caption text-text-tertiary">
            {filtered.length} of {counts.total} {counts.total === 1 ? "player" : "players"}
          </p>
        </AdminCard>

        <AdminCard padding="p-0">
          <ScrollX label="Players" className="max-h-[calc(100vh-280px)] overflow-y-auto">
            <table className="admin-tbl">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="text-left">Player</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Status</th>
                  <SortTh field="balance" label="Wallet" current={sortField} dir={sortDir} align="right" sp={sp} baseHref="/admin/players" />
                  <SortTh field="joined" label="Joined" current={sortField} dir={sortDir} sp={sp} baseHref="/admin/players" />
                  <SortTh field="login" label="Last login" current={sortField} dir={sortDir} sp={sp} baseHref="/admin/players" />
                  <th className="text-left">Drill-down</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {await Promise.all(paged.map(async (u) => {
                  const wallet = await db.wallet.findByUserId(u.id);
                  const label = displayLabel(u);
                  const initials = displayInitials(u);
                  const isAutoHandle = !((u.displayName ?? "").trim().length > 0);
                  return (
                    <tr key={u.id}>
                      <td>
                        <a href={`/admin/players/${u.id}`} className="flex items-center gap-2.5 min-w-0 hover:text-royal-300">
                          <Avatar initials={initials} size="sm" seed={u.id} />
                          <div className="min-w-0">
                            <p className={`text-body-sm font-medium text-text truncate ${isAutoHandle ? "font-mono" : ""}`}>{label}</p>
                            <p className="text-micro font-mono text-text-tertiary truncate">{u.id}</p>
                          </div>
                        </a>
                      </td>
                      {/* Masked in the broad list view — full number only on the detail page (PII minimization). Search still matches the full number. */}
                      <td className="font-mono whitespace-nowrap">{u.phoneE164.length > 6 ? `${u.phoneE164.slice(0, 4)}****${u.phoneE164.slice(-2)}` : u.phoneE164}</td>
                      <td><Chip size="sm" variant={STATUS_VARIANT[u.status] ?? "neutral"}>{u.status}</Chip></td>
                      <td className="font-mono tabular text-right whitespace-nowrap">{wallet ? formatTzs(wallet.balance) : "—"}</td>
                      <td className="font-mono whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="font-mono whitespace-nowrap">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}</td>
                      <td>
                        <a href={`/admin/players/${u.id}`} className="text-royal-300 hover:underline font-medium font-mono text-micro tracking-[0.10em] uppercase">profile →</a>
                      </td>
                    </tr>
                  );
                }))}
                {filtered.length === 0 && (
                  usersFailed ? (
                    <tr><td colSpan={7} className="p-4"><AdminLoadError what="the player list" /></td></tr>
                  ) : (
                    <AdminTableEmpty
                      colSpan={7}
                      kind="admin"
                      title="No players match"
                      body="No players match the current filter — try clearing it."
                    />
                  )
                )}
              </tbody>
            </table>
          </ScrollX>
          <AdminPagination total={filtered.length} page={page} baseHref={baseHref} />
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">Privileged actions</p>
            <p>Live today: suspend / restore, KYC decisions, credential changes, and data export — each is ADMIN/COMPLIANCE-tier, requires step-up 2FA, and is recorded in the <code>ADMIN</code>/<code>COMPLIANCE</code> audit category with the reviewer&apos;s user-id and reason. <em>Target architecture (not yet enforced):</em> two-person approval on wallet freeze / transaction reversal / account closure, and IP capture.</p>
          </div>
        </AdminCard>
      </div>
    </>
  );
}

/* Population status mix — a single segmented bar + legend, reusing the console's
   semantic status colours (green Active · amber pending/cooling · rose blocked ·
   grey closed). Zero-count statuses are dropped so the bar and legend stay clean. */
const MIX_ORDER: ReadonlyArray<{ key: string; label: string; color: string }> = [
  { key: "ACTIVE",        label: "Active",        color: "var(--yes-500)" },
  { key: "PENDING_KYC",   label: "Pending KYC",   color: "var(--warning-500)" },
  { key: "COOLED_OFF",    label: "Cooled off",    color: "var(--warning-500)" },
  { key: "SUSPENDED",     label: "Suspended",     color: "var(--no-500)" },
  { key: "SELF_EXCLUDED", label: "Self-excluded", color: "var(--no-500)" },
  { key: "CLOSED",        label: "Closed",        color: "var(--border-strong)" },
];

function StatusMix({ counts }: { counts: Record<string, number> }) {
  const segs = MIX_ORDER.map((m) => ({ ...m, value: counts[m.key] ?? 0 })).filter((m) => m.value > 0);
  const total = segs.reduce((s, m) => s + m.value, 0);
  if (total === 0) return null;
  return (
    <AdminCard title="Population mix" sw="Mchanganyiko wa hadhi">
      <div className="flex h-3 w-full overflow-hidden rounded-pill" role="img" aria-label="Player status distribution">
        {segs.map((m) => (
          <div key={m.key} style={{ width: `${(m.value / total) * 100}%`, background: m.color }} title={`${m.label}: ${m.value}`} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segs.map((m) => (
          <span key={m.key} className="inline-flex items-center gap-1.5 text-caption text-text-secondary">
            <span className="h-2 w-2 rounded-pill shrink-0" style={{ background: m.color }} aria-hidden />
            {m.label}
            <span className="font-mono tabular text-text">{m.value}</span>
            <span className="font-mono text-micro text-text-tertiary">· {Math.round((m.value / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </AdminCard>
  );
}
