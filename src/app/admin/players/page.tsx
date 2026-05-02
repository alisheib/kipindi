import { Card, CardBody } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Chip } from "@/components/ui/chip";

export const metadata = { title: "Admin · Players" };

/**
 * Player roster — production will paginate from Postgres. The dev/in-memory store
 * does not expose iteration, so this view is a placeholder that explains the
 * production shape and links to drill-down via the audit log.
 */
export default function AdminPlayersPage() {
  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Players" }]} />
      <header>
        <h1 className="font-display font-bold text-title-lg text-text">Players · Wachezaji</h1>
        <p className="text-body text-text-secondary">Search by phone number, NIDA, or user-id.</p>
      </header>

      <Card>
        <CardBody className="p-5 space-y-3">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              placeholder="Phone, NIDA, or user-id"
              className="flex-1 min-w-[260px] h-10 px-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none focus:border-border-focus"
            />
            <button type="submit" className="h-10 px-4 rounded-md bg-royal text-onBrand font-semibold text-body-sm">Search</button>
          </form>
          <p className="text-caption text-text-tertiary">
            In production this view drives: balance freeze, KYC override, manual self-exclusion, source-of-funds
            request, transaction reversal, and account closure. Every action is two-person approved
            (operator + compliance officer) and logged to <a className="text-royal hover:underline" href="/admin/audit?category=ADMIN">ADMIN audit category</a>.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-5 space-y-2">
          <h2 className="font-display font-bold text-title-sm text-text">Production data shape</h2>
          <p className="text-caption text-text-secondary">
            <code>StoredUser</code>: id · phoneE164 · role · status · KYC status (joined) · wallet balance (joined) ·
            registered · last login · region.
          </p>
          <div className="flex gap-2 pt-1 flex-wrap">
            <Chip size="sm" variant="brand">Filter: status=ACTIVE</Chip>
            <Chip size="sm" variant="warning">status=SUSPENDED</Chip>
            <Chip size="sm" variant="danger">status=SELF_EXCLUDED</Chip>
            <Chip size="sm">status=PENDING_KYC</Chip>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
