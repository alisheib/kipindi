import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { db } from "@/lib/server/store";
import { formatTzs } from "@/lib/utils";
import { Search } from "lucide-react";

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

export default async function AdminPlayersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().toLowerCase();
  const statusFilter = sp.status ?? "";

  const all = db.user.list();
  const filtered = all.filter((u) => {
    if (statusFilter && u.status !== statusFilter) return false;
    if (!query) return true;
    return (
      u.id.toLowerCase().includes(query) ||
      u.phoneE164.toLowerCase().includes(query) ||
      (u.displayName ?? "").toLowerCase().includes(query)
    );
  });

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
        <AdminCard>
          <form className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[260px]">
              <Search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Phone (+255…), display name, or usr_…"
                aria-label="Search players"
                className="w-full h-10 pl-9 pr-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none focus:border-border-focus"
              />
            </div>
            <label className="block">
              <span className="sr-only">Status filter</span>
              <select
                name="status"
                defaultValue={statusFilter}
                aria-label="Filter by status"
                title="Filter by status"
                className="h-10 px-3 rounded-md bg-surface border border-border text-text text-body-sm"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_KYC">Pending KYC</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="SELF_EXCLUDED">Self-excluded</option>
                <option value="COOLED_OFF">Cooled off</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>
            <button type="submit" className="h-10 px-4 rounded-md bg-royal text-onBrand font-semibold text-body-sm hover:bg-royal-hover transition-colors">
              Search
            </button>
            {(query || statusFilter) && (
              <a href="/admin/players" className="h-10 px-4 inline-flex items-center rounded-md border border-border text-text-secondary text-body-sm hover:bg-surface-hover">
                Clear
              </a>
            )}
          </form>
          <p className="text-caption text-text-tertiary">
            {filtered.length} of {counts.total} {counts.total === 1 ? "player" : "players"}
          </p>
        </AdminCard>

        <AdminCard padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary bg-bg-sunken/50 border-b border-border-subtle">
                <tr>
                  <th className="text-left p-3">Player</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Wallet</th>
                  <th className="text-left p-3">Joined</th>
                  <th className="text-left p-3">Last login</th>
                  <th className="text-left p-3">Drill-down</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {filtered.map((u) => {
                  const wallet = db.wallet.findByUserId(u.id);
                  const initials = (u.displayName ?? "").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
                  return (
                    <tr key={u.id} className="border-b border-border-subtle/40 last:border-b-0 hover:bg-surface-hover">
                      <td className="p-3">
                        <a href={`/admin/players/${u.id}`} className="flex items-center gap-2 min-w-0 hover:text-royal">
                          <Avatar initials={initials} size="sm" />
                          <div className="min-w-0">
                            <p className="text-body-sm font-medium text-text truncate">{u.displayName ?? "—"}</p>
                            <p className="text-micro font-mono text-text-tertiary truncate">{u.id}</p>
                          </div>
                        </a>
                      </td>
                      <td className="p-3 font-mono whitespace-nowrap">{u.phoneE164}</td>
                      <td className="p-3"><Chip size="sm" variant={STATUS_VARIANT[u.status] ?? "neutral"}>{u.status}</Chip></td>
                      <td className="p-3 font-mono tabular text-right whitespace-nowrap">{wallet ? formatTzs(wallet.balance) : "—"}</td>
                      <td className="p-3 font-mono whitespace-nowrap">{u.createdAt.split("T")[0]}</td>
                      <td className="p-3 font-mono whitespace-nowrap">{u.lastLoginAt ? u.lastLoginAt.split("T")[0] : "—"}</td>
                      <td className="p-3">
                        <a href={`/admin/players/${u.id}`} className="text-royal hover:underline font-medium font-mono text-micro tracking-[0.10em] uppercase">profile →</a>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-text-tertiary">No players match the current filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
