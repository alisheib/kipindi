/**
 * Privacy operations · /admin/privacy
 * - DSAR queue (PDPA + GDPR)
 * - Per-user export bundle (machine-readable JSON)
 */
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { Chip } from "@/components/ui/chip";
import { Sensitive } from "@/components/ui/sensitive";
import { ScrollX } from "@/components/ui/scroll-x";
import { db } from "@/lib/server/store";
import { hasOpenRequest, listDsarRequests, listHeldIdentities, type HeldIdentity } from "@/lib/server/privacy";
import { maskedRosterLabel } from "@/lib/server/affiliate-service";
import { ExportDsarBundleButton, FulfillDsarButton, FileDsarOnBehalfButton } from "./dsar-controls";
import { formatDateTime } from "@/lib/utils";
import { I } from "@/components/ui/glyphs";
import { DsarStatusBadge, dsarTypeLabel, AccountStatusBadge } from "@/components/admin/status-badge";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

export const metadata = { title: "Admin · Privacy / DSAR" };
export const dynamic = "force-dynamic";

type AdminPrivacyProps = {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string; heldpage?: string }>;
};

/** W25 belt 2 — the stored-row gate, in the PAGE: a flight request naming this section's layout skips the layout. */
export default async function AdminPrivacyPage(props: AdminPrivacyProps) {
  return <AdminPageGate title="Privacy"><AdminPrivacyContent {...props} /></AdminPageGate>;
}

async function AdminPrivacyContent({ searchParams }: AdminPrivacyProps) {
  const sp = await searchParams;
  const requests = listDsarRequests();
  const pending = requests.filter((r) => r.status === "PENDING");
  const fulfilled = requests.filter((r) => r.status === "FULFILLED");
  // ⭐ PARTIAL is its own column of work, not a variety of "fulfilled". The contact details,
  // credentials and profile are gone; the identity record — since Part C (2026-10-11) the typed
  // name, date of birth and number as well as the photos — is held to a date under POCA Cap 423
  // §16, and nothing re-runs erasure at year seven. Folding these into `fulfilled` would retire
  // the reminder. (The held list below reads the same dates from the accounts themselves.)
  const partial = requests.filter((r) => r.status === "PARTIAL");
  // A-5: a failed player-list read must NOT show "No recent players" — a false
  // empty on the on-behalf export queue. Show an explicit "couldn't load" instead.
  // ONE read of the accounts serves both lists below: the recent players and the held identities.
  let allUsers: Awaited<ReturnType<typeof db.user.list>> = [];
  let recentFailed = false;
  try { allUsers = await db.user.list(); } catch { recentFailed = true; }
  const recentUsers = allUsers.slice(0, 8);
  /**
   * ⭐ THE HELD IDENTITIES, FROM THE DATA (Part C, 2026-10-11). The PARTIAL request carries the release date, but the
   * queue is one SystemConfig blob — so the reminder is ALSO derived from the accounts: every erased account (CLOSED, the
   * phone tombstoned) whose identity record is not yet pseudonymised, with the day its 7-year hold ends
   * (`listHeldIdentities`, the release's own predicate). ⛔ A failed read is "couldn't load", never "none held".
   */
  let held: HeldIdentity[] = [];
  let heldFailed = recentFailed;
  if (!recentFailed) {
    try { held = await listHeldIdentities(allUsers); } catch { heldFailed = true; }
  }
  const today = new Date().toISOString().slice(0, 10);
  const heldPage = parsePage(sp.heldpage, held.length);
  const heldPaged = held.slice((heldPage - 1) * PER_PAGE, heldPage * PER_PAGE);
  const heldBaseHref = buildBaseHref("/admin/privacy", { sort: sp.sort, dir: sp.dir, page: sp.page }, "heldpage");

  // Sort (URL-driven), then paginate — newest request first by default.
  const { sort, dir } = parseSort(sp, ["filed", "user", "type", "status"] as const, "filed", "desc");
  const sorted = applySort(requests, sort, dir, {
    filed: (r) => r.requestedAt,
    user: (r) => r.userId,
    type: (r) => r.type,
    status: (r) => r.status,
  });
  const page = parsePage(sp.page, sorted.length);
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/privacy", { sort: sp.sort, dir: sp.dir, heldpage: sp.heldpage });
  // The soonest release either source knows of, and the held identities the queue has lost track of (no open
  // ERASURE request to re-run) — the case the data-derived list exists for.
  const nextRelease = [...held.map((h) => h.heldUntil), ...partial.map((r) => r.erasureHeldUntil ?? null)]
    .filter((d): d is string => typeof d === "string" && d.length > 0).sort()[0] ?? null;
  const unqueued = held.filter((h) => !hasOpenRequest(h.userId, "ERASURE")).length;

  return (
    <>
      <AdminPageHead
        title="Privacy · DSAR queue"
        sw="Faragha · Maombi ya data"
        actions={<Chip size="md" variant={pending.length > 0 ? "warning" : "neutral"}>{pending.length} pending · 30d SLA</Chip>}
      />
      <AdminBody>
        <KpiGrid>
          <AdminKpi label="Pending"  sw="Inasubiri"  value={String(pending.length)}   delta="< 30 days SLA" />
          <AdminKpi label="Identity held" sw="Utambulisho umehifadhiwa" value={heldFailed ? "—" : String(held.length)}
            delta={heldFailed ? "couldn't load" : unqueued > 0 ? `${unqueued} not in the queue` : nextRelease ? `next release ${nextRelease}` : "none held"} />
          <AdminKpi label="Fulfilled" sw="Imekamilika" value={String(fulfilled.length)} delta="lifetime" />
          <AdminKpi label="Access"    sw="Kupata"     value={String(requests.filter((r) => r.type === "ACCESS").length)} delta="GDPR Art. 15" />
          <AdminKpi label="Erasure"   sw="Kufuta"     value={String(requests.filter((r) => r.type === "ERASURE").length)} delta="GDPR Art. 17" />
        </KpiGrid>

        <AdminCard
          title="Open requests"
          sw="Maombi yaliyofunguliwa"
          padding="p-0"
        >
          <ScrollX label="DSAR requests">
            <table className="admin-tbl">
              <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                <tr>
                  <SortTh field="filed" label="Filed" current={sort} dir={dir} sp={sp} baseHref="/admin/privacy" className="p-3" />
                  <SortTh field="user" label="User" current={sort} dir={dir} sp={sp} baseHref="/admin/privacy" className="p-3" />
                  <SortTh field="type" label="Type" current={sort} dir={dir} sp={sp} baseHref="/admin/privacy" className="p-3" />
                  <th className="text-left p-3">Reason</th>
                  <SortTh field="status" label="Status" current={sort} dir={dir} sp={sp} baseHref="/admin/privacy" className="p-3" />
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {paged.map((r) => (
                  <tr key={r.id} className="border-t border-border-subtle/50 align-top">
                    <td className="p-3 font-mono whitespace-nowrap">{formatDateTime(r.requestedAt)}</td>
                    <td className="p-3 font-mono">{r.userId.slice(0, 16)}…</td>
                    <td className="p-3">
                      <Chip size="sm" variant={r.type === "ERASURE" ? "danger" : "neutral"}>{dsarTypeLabel(r.type)}</Chip>
                    </td>
                    <td className="p-3 text-text-tertiary max-w-[260px] truncate">{r.reason ?? "—"}</td>
                    <td className="p-3">
                      <DsarStatusBadge status={r.status}
                        deletionFailed={!r.erasureHeldUntil && (r.erasureObjectsFailed ?? 0) > 0} />
                      {/* Why a PARTIAL is still open once the hold has ended: deletions the storage did not complete. */}
                      {r.status === "PARTIAL" && (r.erasureObjectsFailed ?? 0) > 0 && (
                        <p className="mt-1 font-mono text-micro text-danger-fg">
                          {`${r.erasureObjectsFailed === 1 ? "1 deletion" : `${r.erasureObjectsFailed} deletions`} failed`}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      {/* ⛔ PARTIAL KEEPS ITS BUTTON. The erasure routine is idempotent, and
                          this is the only door that finishes the job once the statutory hold
                          expires — take the button away and the held identity record (the
                          typed details since Part C, and the photos) can never be erased
                          through the product at all. Re-running before the release date is
                          harmless: it reports the same date back. */}
                      {r.status === "PENDING" || r.status === "PARTIAL" ? (
                        <div className="flex gap-2">
                          <ExportDsarBundleButton userId={r.userId} />
                          {/* type + status drive the copy: an ERASURE row's button DESTROYS
                              columns, and describing that as "mark fulfilled" tells the
                              officer the wrong thing about an irreversible action. */}
                          <FulfillDsarButton id={r.id} type={r.type} status={r.status} />
                        </div>
                      ) : (
                        <span className="font-mono text-micro text-text-tertiary uppercase tracking-[0.10em]">{r.fulfilledAt?.slice(0, 10) ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <AdminTableEmpty colSpan={6} kind="audit" title="No DSAR requests" body="No data-subject access requests are on file." />
                )}
              </tbody>
            </table>
          </ScrollX>
          <AdminPagination total={sorted.length} page={page} baseHref={baseHref} />
        </AdminCard>

        {/* ⭐ PART C (2026-10-11) · THE HELD IDENTITIES, READ FROM THE ACCOUNTS. An erased account's identity record
            — name, date of birth, document number, on every submission and every prior identity — is held 7 years
            from closure (the owner's ruling of 2026-10-10), and nothing re-runs erasure on the day it ends. The
            PARTIAL request above is one reminder; this list is the one that cannot be lost with the queue, because
            it asks the data (`listHeldIdentities`, the release's own predicate). Ids, dates and counts only —
            never a name or a number. A held account with no open request gets the on-behalf filing door, so the
            officer can put the request back and finish the job from the queue. */}
        <AdminCard
          title="Identity held until"
          sw="Utambulisho umehifadhiwa hadi"
          padding="p-0"
        >
          <p className="text-body-sm text-text-tertiary px-4 pt-3">
            Erased accounts whose identity record (name, date of birth, document number) is still held under the
            7-year AML hold, counted from closure (POCA Cap 423 §16). On the release date, run the erasure again from
            its request: the identity is then erased, except a coded form of the number that stops the same document
            opening another account, and the identity photos are destroyed.
          </p>
          {heldFailed ? (
            <div className="p-4"><AdminLoadError what="the held-identity list" /></div>
          ) : (
          <ScrollX label="Held identities">
            <table className="admin-tbl">
              <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                <tr>
                  <th className="text-left p-3">Account</th>
                  <th className="text-left p-3">Closed</th>
                  <th className="text-left p-3">Held until</th>
                  <th className="text-left p-3">Identities</th>
                  <th className="text-left p-3">Request</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {heldPaged.map((h) => {
                  const due = h.heldUntil !== null && h.heldUntil <= today;
                  return (
                    <tr key={h.userId} className="border-t border-border-subtle/50 align-top">
                      <td className="p-3 font-mono">{h.userId.slice(0, 16)}…</td>
                      <td className="p-3 font-mono whitespace-nowrap">{h.closedAt ? h.closedAt.slice(0, 10) : "—"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono whitespace-nowrap">{h.heldUntil ?? "No closure date on file"}</span>
                          <Chip size="sm" variant={due ? "warning" : "neutral"}>{due ? "Due — run the erasure again" : "Held"}</Chip>
                        </div>
                      </td>
                      <td className="p-3 font-mono">{h.identities}</td>
                      <td className="p-3">
                        {hasOpenRequest(h.userId, "ERASURE")
                          ? <span className="text-text-tertiary">In the queue</span>
                          : <FileDsarOnBehalfButton userId={h.userId} />}
                      </td>
                    </tr>
                  );
                })}
                {held.length === 0 && (
                  <AdminTableEmpty colSpan={5} kind="audit" title="No identity held" body="No erased account's identity record is waiting for its release date." />
                )}
              </tbody>
            </table>
          </ScrollX>
          )}
          <AdminPagination total={held.length} page={heldPage} baseHref={heldBaseHref} param="heldpage" />
        </AdminCard>

        <AdminCard
          title="On-behalf export · officer-initiated"
          sw="Toa data badala ya mtumiaji"
          action={<span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">{recentFailed ? "—" : `${recentUsers.length} recent users`}</span>}
        >
          <p className="text-caption text-text-tertiary mb-2">
            For walk-in or phone-in DSAR requests where the player has authenticated by phone OTP at the front-desk and the
            officer needs to hand them a copy of their data right now. Generates a JSON bundle with everything we hold.
          </p>
          {recentFailed ? (
            <AdminLoadError what="the recent-players list" />
          ) : (
          <ScrollX label="On-behalf export" className="-mx-4 px-4">
            <table className="admin-tbl min-w-[640px]">
              <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                <tr>
                  <th className="text-left py-2 pr-3">Player</th>
                  <th className="text-left py-2 pr-3">Phone</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2 pr-3">Created</th>
                  <th className="text-left py-2 pl-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 && (
                  <AdminTableEmpty colSpan={5} kind="admin" title="No recent players" body="No recently created player accounts to export." />
                )}
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border-subtle/40 last:border-b-0">
                    <td className="py-2 pr-3">
                      {/* PII-minimised in the list — this is a DSAR export queue.
                          Full identity only on the audited detail page; matches
                          the masked-phone column beside it. */}
                      <a href={`/admin/players/${u.id}`} className="font-medium text-text hover:text-royal-300 hover:underline">
                        {maskedRosterLabel(u, u.phoneE164)}
                      </a>
                      <span className="block font-mono text-micro text-text-tertiary">{u.id.slice(0, 14)}…</span>
                    </td>
                    <td className="py-2 pr-3 font-mono whitespace-nowrap"><Sensitive field="phone" subjectId={u.id} value={u.phoneE164} /></td>
                    <td className="py-2 pr-3">
                      <AccountStatusBadge status={u.status} />
                    </td>
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{u.createdAt.slice(0, 10)}</td>
                    <td className="py-2 pl-3">
                      <div className="flex gap-2">
                        <ExportDsarBundleButton userId={u.id} />
                        {/* 🔴 fileDsarAction's FIRST CALLER (E-33). Without it nothing on the
                            platform could put a request into the register, so this page read
                            "No data-subject access requests are on file" for ever — not
                            because nobody asked, but because asking was unrecordable. */}
                        <FileDsarOnBehalfButton userId={u.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
          )}
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg">
          <div className="flex items-start gap-3">
            <I.shieldQuestion s={18} className="text-info shrink-0 mt-0.5" />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">Legal frame</p>
              <p>
                Tanzania Personal Data Protection Act (2022) §29 grants the right of access, §30 correction, §31 erasure.
                GDPR Art. 15 + 17 mirror those rights for European residents using 50pick via roaming SIMs. Both regimes
                set a 30-day fulfilment window. AML retention (POCA Cap 423 §16) takes precedence over erasure for 7 years
                after closure on financial records and on the identity record — the name, date of birth, document number
                and any identity photos.
              </p>
            </div>
          </div>
        </AdminCard>
      </AdminBody>
    </>
  );
}
