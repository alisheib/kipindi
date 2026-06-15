import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/server/store";
import { formatTzs } from "@/lib/utils";
import { I } from "@/components/ui/glyphs";
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

  const all = await db.user.list();
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
    const balanceMap = new Map<string, number>();
    for (const u of filtered) {
      const w = await db.wallet.findByUserId(u.id);
      balanceMap.set(u.id, w?.balance ?? 0);
    }
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

  const counts = {
    total: all.length,
    active: all.filter((u) => u.status === "ACTIVE").length,
    pending_kyc: all.filter((u) => u.status === "PENDING_KYC").length,
    suspended: all.filter((u) => u.status === "SUSPENDED").length,
    self_excluded: all.filter((u) => u.status === "SELF_EXCLUDED").length,
    cooled_off: all.filter((u) => u.status === "COOLED_OFF").length,
    closed: all.filter((u) => u.status === "CLOSED").length,
  };

  return (
    <>
      <AdminPageHead
        title="Players"
        sw="Wachezaji"
        period={false}
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Chip size="sm" variant="success">{counts.active} active</Chip>
            {counts.pending_kyc > 0 && <Chip size="sm" variant="warning">{counts.pending_kyc} pending KYC</Chip>}
            {(counts.suspended + counts.self_excluded) > 0 && <Chip size="sm" variant="danger">{counts.suspended + counts.self_excluded} blocked</Chip>}
          </div>
        }
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        <AdminCard padding="p-3">
          <form className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[260px]">
              <I.search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Phone (+255…), display name, or usr_…"
                aria-label="Search players"
                className="w-full h-9 pl-9 pr-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
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
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: 36 }}>
              Search
            </button>
            {(query || statusFilter) && (
              <a href="/admin/players" className="btn btn-ghost btn-sm" style={{ height: 36 }}>
                Clear
              </a>
            )}
          </form>
          <p className="mt-2 text-caption text-text-tertiary">
            {filtered.length} of {counts.total} {counts.total === 1 ? "player" : "players"}
          </p>
        </AdminCard>

        <AdminCard padding="p-0">
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
            <table className="admin-tbl">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="text-left">Player</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Status</th>
                  <SortTh field="balance" label="Wallet" current={sortField} dir={sortDir} align="right" sp={sp} />
                  <SortTh field="joined" label="Joined" current={sortField} dir={sortDir} sp={sp} />
                  <SortTh field="login" label="Last login" current={sortField} dir={sortDir} sp={sp} />
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
                        <a href={`/admin/players/${u.id}`} className="flex items-center gap-2.5 min-w-0 hover:text-royal">
                          <Avatar initials={initials} size="sm" seed={u.id} />
                          <div className="min-w-0">
                            <p className={`text-body-sm font-medium text-text truncate ${isAutoHandle ? "font-mono" : ""}`}>{label}</p>
                            <p className="text-micro font-mono text-text-tertiary truncate">{u.id}</p>
                          </div>
                        </a>
                      </td>
                      <td className="font-mono whitespace-nowrap">{u.phoneE164}</td>
                      <td><Chip size="sm" variant={STATUS_VARIANT[u.status] ?? "neutral"}>{u.status}</Chip></td>
                      <td className="font-mono tabular text-right whitespace-nowrap">{wallet ? formatTzs(wallet.balance) : "—"}</td>
                      <td className="font-mono whitespace-nowrap">{u.createdAt.split("T")[0]}</td>
                      <td className="font-mono whitespace-nowrap">{u.lastLoginAt ? u.lastLoginAt.split("T")[0] : "—"}</td>
                      <td>
                        <a href={`/admin/players/${u.id}`} className="text-royal hover:underline font-medium font-mono text-micro tracking-[0.10em] uppercase">profile →</a>
                      </td>
                    </tr>
                  );
                }))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="!py-6 text-center text-text-tertiary">No players match the current filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination total={filtered.length} page={page} baseHref={baseHref} />
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">Privileged actions (production)</p>
            <p>Freeze wallet, override KYC, manual self-exclusion, transaction reversal, and account closure are gated behind two-person approval (compliance officer + AML lead for amounts ≥ TZS 5M). Every action is recorded in the <code>ADMIN</code> audit category with the reviewer&apos;s user-id, IP, and reason.</p>
          </div>
        </AdminCard>
      </div>
    </>
  );
}

function SortTh({ field, label, current, dir, align, sp }: { field: string; label: string; current: string; dir: string; align?: string; sp: Record<string, string | undefined> }) {
  const isActive = current === field;
  const nextDir = isActive && dir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.status) params.set("status", sp.status);
  params.set("sort", field);
  params.set("dir", nextDir);
  return (
    <th className={align === "right" ? "text-right" : "text-left"}>
      <a href={`/admin/players?${params.toString()}`} className={`inline-flex items-center gap-1 hover:text-text ${isActive ? "text-text" : ""}`}>
        {label}
        {isActive && <span className="text-brand-300">{dir === "asc" ? "↑" : "↓"}</span>}
      </a>
    </th>
  );
}
