import Link from "next/link";
import { AdminPageHead, AdminCard, AdminKpi, AdminStackedBar, StatusPill, FeedRow, AdminLoadError } from "@/components/admin/admin-shell";
import { KpiGrid } from "@/components/admin/admin-body";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AdminFunnelChart } from "@/components/admin/admin-charts";
import { I } from "@/components/ui/glyphs";
import { db, type StoredTxn } from "@/lib/server/store";
// E-103 · one denominator for a funnel column, and the card says which.
import { funnelShares } from "@/lib/funnel-share";
import { verifyChain, getAuditPage } from "@/lib/server/audit";
import { loadBackupRun, backupHealth } from "@/lib/server/backup/state";
import { isMonitoringEnabled } from "@/lib/server/monitoring";
import { kycFunnel, rgRosterCounts } from "@/lib/server/analytics";
import { detectHarmMarkersForAllUsers } from "@/lib/server/responsible-gambling";
import { Chip } from "@/components/ui/chip";
import { txnTypeLabel } from "@/components/admin/status-badge";
import { ScrollX } from "@/components/ui/scroll-x";
import { formatClock, formatDate, formatDateTime } from "@/lib/utils";
import { AdminBody } from "@/components/admin/admin-body";

export const metadata = { title: "Admin · Compliance" };
export const dynamic = "force-dynamic";

const REPORTS: ReadonlyArray<{ id: string; title: string; sub: string; tone: "warning" | "royal" | "danger" | "neutral" }> = [
  { id: "gbt-monthly",    title: "Monthly report",         sub: "Calendar month · 12 sheets · signed JSON", tone: "warning" },
  // "TRA withholding tax" card removed 2026-07 — we no longer withhold per-player
  // tax. The TRA levy on our commission is in the Daily Operations report.
  { id: "fiu-sar",        title: "FIU SAR · suspicious",  sub: "7-day rolling · entries pending review", tone: "danger" },
  { id: "iso-audit",      title: "ISO 27001 audit log",   sub: "Last 90 days · CSV",                     tone: "neutral" },
  { id: "kyc-reverify",   title: "KYC re-verify roster",  sub: "Players due in 14 days",                 tone: "neutral" },
  { id: "sx-register",    title: "Self-exclusion register", sub: "Cross-operator format · monthly",      tone: "neutral" },
];

export default async function AdminCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const chain = verifyChain();
  // A-5: on a regulator-facing surface a failed read must NOT render a fabricated
  // all-zero funnel or a false "nobody self-excluded". null → explicit "couldn't load".
  // Backup health, read from the row db:verify-backup writes. Fail CLOSED: if the
  // read itself errors we report "none" rather than assuming health — the whole
  // point of this card is that it never claims a backup it cannot evidence.
  const backup = backupHealth(await loadBackupRun().catch(() => null));
  // Read live, never assumed: this is the difference between "an error is recorded" and
  // "an error reaches a human", and only one of those is true today.
  const alerting = isMonitoringEnabled();
  const kyc = await kycFunnel().catch(() => null);
  const rg = await rgRosterCounts().catch(() => null);
  let aml: StoredTxn[] = [];
  let amlFailed = false;
  try { aml = (await db.txn.listByStatus("AML_REVIEW")) as StoredTxn[]; } catch { amlFailed = true; }
  const recentAml = aml.slice(0, 5);
  const recentApprovals = getAuditPage({ category: "ADMIN", limit: 50 }).filter((e) => e.action.startsWith("aml.")).slice(0, 8);
  const integrityAlerts = getAuditPage({ category: "BET", limit: 50 }).filter((e) => e.action.startsWith("integrity.alert.")).slice(0, 3);

  // Reality-check engagement — read from audit (rg.* events)
  const rgEvents = getAuditPage({ category: "COMPLIANCE", limit: 200 });
  const continued = rgEvents.filter((e) => e.action === "rg.reality_check.continued").length;
  const tookBreak = rgEvents.filter((e) => e.action === "rg.cooling_off.activated").length;
  const sxd = rgEvents.filter((e) => e.action === "rg.self_exclusion.activated").length;
  /* ⛔ NO `|| 1` (S-04, scan #1, 2026-08-28). Defaulting an empty denominator to 1 does not so
   * much avoid a division by zero as INVENT one observation, and every percentage below then
   * reads as a real measurement of nothing. The zero case is answered where it is RENDERED, by
   * saying there was no activity — not by choosing a denominator that makes the arithmetic run. */
  const rcTotal = continued + tookBreak + sxd;

  const kycConv = !kyc || kyc.registered === 0 ? 0 : (kyc.approved / kyc.registered) * 100;
  // ⭐ E-103 · SHARE OF THE TOP STAGE, from the shared rule — see `funnel-share.ts`.
  // 🔴 This column carried THREE different denominators: Started was a share of Registered,
  // while Pending and Approved were both shares of Started, all under one heading that called
  // them "conversion from the previous step". Pending and Approved are also SIBLINGS — a
  // submission is one or the other — so "Approved, as a fraction of the row above it" was
  // describing a relationship the data does not have. One denominator, named on the card.
  const kycSteps = kyc ? funnelShares([
    { label: "Registered", value: kyc.registered },
    { label: "Started",    value: kyc.started },
    { label: "Pending",    value: kyc.pending },
    { label: "Approved",   value: kyc.approved },
  ]) : [];

  return (
    <>
      <AdminPageHead
        title="Compliance"
        sw="Kanuni"
        actions={
          <Link
            href="/admin/reports"
            className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border border-brand-500 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 transition-colors"
          >
            <I.download s={12} /> Generate reports →
          </Link>
        }
      />

      <AdminBody>
        {/* §A — Audit chain + backup + error monitoring */}
        {/* ⛔ DG-A-22 (2026-08-30) — THREE CARDS, THREE COLUMNS. This band was
            `lg:grid-cols-2` with three children, so auto-placement put the third in row 2
            column 1 and left row 2 column 2 as a grid AREA WITH NO ITEM IN IT: 572px wide at
            1440 (1440 − 216 sidebar − 64 `lg:px-6`, minus one 16px gap, halved).
            ⛔ No alignment property can fix that, and the register's `auto-rows` prescription
            is the wrong lever: `auto-rows-*`, `items-*` and `align-content` all size or place
            an item INSIDE its area, and there is no item here to place. The only levers on an
            empty area are the column count, a `col-span` on a sibling, or a fourth card —
            and a `col-span-2` would claim "Error monitoring is worth twice the other two",
            which is false: all three are one-line platform-health statuses built from the
            same StatusPill + `flex-1 min-w-0` text block.
            The value is the neighbour that already ships this exact shape —
            `src/app/admin/players/cohorts/page.tsx` `grid grid-cols-1 lg:grid-cols-3 gap-3`
            with three AdminCards — and this page's own §C band below is 4-across at the same
            `lg`, so 3-across is narrower than a rhythm this page already keeps.
            ⚠️ `compliance/loading.tsx`'s §A band moves with this one, or the page jumps on
            every load — §B7 rule 3's defect ("a 152px jump on every load that no test could
            see") one level down, on the count and the breakpoint instead of the tier. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <AdminCard title="Audit chain · integrity" sw="Mlolongo wa ukaguzi">
            <div className="flex items-center gap-4">
              <StatusPill status={chain.valid ? "ok" : "fail"} label={chain.valid ? "OK" : "✗"} />
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-body-sm text-text">
                  {chain.valid ? "Chain valid" : `Chain broken at index ${chain.index}`}
                </p>
                <p className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">
                  HMAC-SHA256 · last verify {formatClock(new Date().toISOString())}
                </p>
              </div>
              <a
                href="/admin/system"
                className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-elevated text-royal-300"
              >
                verify now →
              </a>
            </div>
          </AdminCard>
          {/* ⚠️ 2026-07-29 — this card used to render a hardcoded green ✓ reading
              "Auto-snapshot on every mutation · HMAC-signed · last 12 retained ·
              disk-backed". NONE of it was real, and none of it was read from
              anything: there is no backup script in package.json, no code writes a
              snapshot, and nothing reads STORE_BACKUP_DIR (it survives only as a
              line in .gitignore). The card sat beside the audit-chain card, which
              DOES read live state — so the fabricated tick borrowed its credibility.

              That is RULES law 5 (real data or nothing) broken on the compliance
              page: the one screen where an officer, or a regulator over their
              shoulder, decides whether player balances and the settlement ledger
              are recoverable. A fabricated 50% misleads a player about one market;
              this misled the operator about whether the business can survive losing
              its database.

              ✅ 2026-07-30 — it now reads the REAL last run, exactly as that warning
              required. `backupHealth()` derives all five states from a row only
              `db:verify-backup` writes, and only AFTER restoring the dump into a
              scratch database and re-checking its money invariants. There is no
              static fallback: if nothing has ever run, `kind` is "none" and the card
              says so. An honest ✗ is a true statement; a green tick was not. */}
          <AdminCard title="Backup status" sw="Hali ya nakala">
            <div className="flex items-center gap-4">
              <StatusPill
                status={backup.kind === "ok" ? "ok" : backup.kind === "unverified" || backup.kind === "stale" ? "warn" : "fail"}
                label={backup.kind === "ok" ? "✓" : backup.kind === "unverified" || backup.kind === "stale" ? "!" : "✗"}
              />
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-body-sm text-text">
                  {backup.kind === "none" && "No backup has ever run"}
                  {backup.kind === "failed" && "Last backup FAILED"}
                  {/* Named separately from failed on purpose: the dump exists, so the
                      recovery story is "we have a file we have not proven", which is a
                      different conversation from "we have nothing". */}
                  {backup.kind === "unverified" && "Backup taken but NOT verified"}
                  {backup.kind === "stale" && "Backup is stale"}
                  {backup.kind === "ok" && "Backup verified"}
                </p>
                {/* DG-A-14 — the "none" branch of this line is an instruction the operator
                    is meant to carry out ("run npm run db:backup then db:verify-backup"), and
                    at 10px uppercase it rendered as RUN NPM RUN DB:BACKUP THEN DB:VERIFY-BACKUP
                    — a shell command dressed as an eyebrow, which is unreadable and untypeable
                    at once. The eyebrow dressing comes off the whole element; the metadata
                    branch loses nothing by being 13px and sentence-cased. */}
                <p className="font-mono text-body-sm text-text-tertiary">
                  {backup.kind === "none"
                    ? "run npm run db:backup then db:verify-backup"
                    : `${formatDateTime(backup.run.finishedAt)} · ${backup.run.rows.toLocaleString("en-US")} rows · ${(backup.run.sizeBytes / 1_048_576).toFixed(1)} MiB${backup.run.sealed ? " · sealed" : " · UNSEALED"}`}
                </p>
                {backup.kind === "failed" && backup.run.error ? (
                  <p className="font-mono text-micro text-danger mt-1 break-words">{backup.run.error}</p>
                ) : null}
                {backup.kind === "unverified" ? (
                  // `text-warning-fg`, not `text-warn` (2026-08-21): there is no `warn`
                  // colour family in tailwind.config.ts, so this line and the three below
                  // it rendered in the inherited body colour — a backup nobody restored
                  // read as ordinary prose. Same token the RG tiles at the foot of this
                  // page already use.
                  <p className="font-mono text-micro text-warning-fg mt-1">
                    a dump nobody restored is not a backup — run db:verify-backup
                  </p>
                ) : null}
                {/* Problems in the DATABASE, not in the backup — kept visually distinct
                    from a backup failure because the response is completely different.
                    A verified backup of a drifting ledger is a good backup and a bad
                    situation, and the first real drill found exactly that: TZS 100,000 in
                    a wallet with no ledger entry behind it. Shown on every state, because
                    the finding outlives whichever backup surfaced it. */}
                {backup.kind !== "none" && backup.run.sourceWarnings?.length ? (
                  <div className="mt-2 pt-2 border-t border-border-subtle">
                    <p className="font-mono text-micro eyebrow uppercase text-warning-fg">
                      Source database — found while verifying
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {backup.run.sourceWarnings.map((w) => (
                        <li key={w} className="font-mono text-micro text-warning-fg break-words">· {w}</li>
                      ))}
                    </ul>
                    <p className="font-mono text-micro text-text-tertiary mt-1">
                      the backup itself is sound — this is a live data problem to investigate
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </AdminCard>

          {/* Error monitoring — DURABLE and ALERTING are different promises, and the
              card says which one is actually kept. Server exceptions have persisted to
              the audit chain (scrubbed, deduped) since 2026-07-30, so nothing is lost;
              whether anyone is TOLD depends on a DSN only Ali can set. Stating "errors
              are monitored" without that distinction is the same class of claim as the
              hardcoded backup tick this page used to carry. */}
          <AdminCard title="Error monitoring" sw="Ufuatiliaji wa hitilafu">
            <div className="flex items-center gap-4">
              <StatusPill status={alerting ? "ok" : "warn"} label={alerting ? "✓" : "!"} />
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-body-sm text-text">
                  {alerting ? "Durable and alerting" : "Durable — but nobody is paged"}
                </p>
                {/* DG-A-14 — both branches of this line end in a clause you have to read
                    rather than scan ("PII scrubbed before it leaves", "set SENTRY_DSN to
                    activate the off-box mirror"), and uppercasing the second one buried the
                    env-var name in a wall of caps. Eyebrow dressing off, reading floor on;
                    the colour and every other class are untouched. */}
                <p className="font-mono text-body-sm text-text-tertiary">
                  {alerting
                    ? "audit chain + external monitor · PII scrubbed before it leaves"
                    : "audit chain only · set SENTRY_DSN to activate the off-box mirror"}
                </p>
                {!alerting ? (
                  <p className="font-mono text-micro text-warning-fg mt-1">
                    every server error is recorded and survives a log roll — but you have to come and look
                  </p>
                ) : null}
              </div>
            </div>
          </AdminCard>
        </div>

        {/* §B — KYC funnel + AML queue */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
          <AdminCard title="KYC conversion funnel" sw="Hatua za uthibitisho">
            {!kyc ? (
              <AdminLoadError what="the KYC funnel" />
            ) : (
              <>
                <AdminFunnelChart steps={kycSteps} />
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-border-subtle text-caption text-text-tertiary">
                  <span>End-to-end approval: <span className="font-semibold text-text">{kycConv.toFixed(1)}%</span></span>
                  <a href="/admin/players?status=PENDING_KYC" className="text-royal-300 hover:underline font-medium">View pending →</a>
                </div>
              </>
            )}
          </AdminCard>
          <AdminCard title="AML queue · 7-day" sw="Foleni ya AML">
            {/* ⭐ The kit band on the `2` rung, minted for this shape: a 2×2 INSIDE a card
                that must never step to 4-across. `gap-2` overrides the band's default
                `gap-3` through `twMerge` — verified on the emitted class list, not assumed. */}
            <KpiGrid cols="2" className="gap-2">
              <AdminKpi label="Pending"  sw="Inasubiri"  value={amlFailed ? "" : aml.length} unavailable={amlFailed} spark={false} pulse={!amlFailed && aml.length > 0} />
              <AdminKpi label="Approved" sw="Imekubaliwa" value={recentApprovals.filter((e) => e.action === "aml.approved").length} spark={false} />
              <AdminKpi label="Rejected" sw="Imekataliwa" value={recentApprovals.filter((e) => e.action === "aml.rejected").length} spark={false} />
              <AdminKpi label="Avg time" sw="Wastani"     value="—"             spark={false} />
            </KpiGrid>
            <div className="pt-3 mt-2 border-t border-border-subtle">
              <p className="font-mono text-micro eyebrow uppercase text-text-tertiary mb-1.5">Next in queue</p>
              {amlFailed ? (
                <AdminLoadError what="the AML queue" />
              ) : recentAml.length === 0 ? (
                <p className="text-caption text-text-tertiary py-2">Queue empty.</p>
              ) : recentAml.map((t) => (
                <FeedRow
                  key={t.id}
                  ts={formatClock(t.createdAt)}
                  category="AML"
                  variant="danger"
                  body={
                    <a href={`/admin/aml`} className="hover:underline">
                      {t.userId.slice(0, 12)}… · {txnTypeLabel(t.type)} · {t.amlReason ?? "review"}
                    </a>
                  }
                />
              ))}
            </div>
          </AdminCard>
        </div>

        {/* §C — Responsible-gambling row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminCard title="Self-exclusion" sw="Kujizuia">
            <div className="flex items-baseline justify-between">
              <span className={["font-mono font-bold text-title-md tabular", rg ? "text-text" : "text-text-tertiary"].join(" ")}>{rg ? rg.selfExcluded : "n/a"}</span>
              {rg && rg.expiringThisWeek > 0 && (
                <span className="font-mono text-micro text-warning tracking-wider">{rg.expiringThisWeek} expiring</span>
              )}
            </div>
            <p className={["font-mono text-micro eyebrow uppercase", rg ? "text-text-tertiary" : "text-warning-fg"].join(" ")}>{rg ? "active roster" : "couldn't load"}</p>
          </AdminCard>
          <AdminCard title="Cooling-off" sw="Kupumzika">
            <div className={["font-mono font-bold text-title-md tabular", rg ? "text-text" : "text-text-tertiary"].join(" ")}>{rg ? rg.cooledOff : "n/a"}</div>
            <p className={["font-mono text-micro eyebrow uppercase", rg ? "text-text-tertiary" : "text-warning-fg"].join(" ")}>{rg ? "in progress" : "couldn't load"}</p>
          </AdminCard>
          <AdminCard title="Limit-increase deferrals" sw="Kuongeza kikomo">
            <div className={["font-mono font-bold text-title-md tabular", rg ? "text-warning-fg" : "text-text-tertiary"].join(" ")}>{rg ? rg.pendingLimitIncrease : "n/a"}</div>
            <p className={["font-mono text-micro eyebrow uppercase", rg ? "text-text-tertiary" : "text-warning-fg"].join(" ")}>{rg ? "pending 24h cool-down" : "couldn't load"}</p>
          </AdminCard>
          <AdminCard title="Reality-check engagement" sw="Tahadhari ya hali halisi">
            {/* ⛔ NO FLOOR, AND NO BAR AT ALL WHEN THERE IS NOTHING TO SHOW (S-04 + S-15).
                Each segment was floored at `Math.max(2, …)` over a `|| 1` denominator, so with
                zero rg.* events all three landed on the floor and the card painted three EQUAL
                bands — including the rose self-exclusion band — under "0% continued · 0% break ·
                0% self-excluded". A regulator's eye goes to this row, and it was showing a
                distribution that did not exist.
                ⚠️ The raw counts used to ride on `label:` props that could NEVER render:
                AdminStackedBar only draws a label at height >= 18 and this bar passed 14, so
                three carefully conditioned props were dead (S-15). Rather than raise the height
                and inherit the segment-ink contrast question, the counts now sit in the caption
                where they are legible at any bar height — and the percentages keep their
                denominator beside them, which is what makes a small sample readable as small. */}
            {/* ⚠️ AND THE EMPTY CASE TAKES THE SHAPE OF ITS THREE SIBLINGS, which is a change I
                made only after LOOKING at the rendered row. The first fix was correct and read
                badly: a dashed box wrapping "no reality-check activity in window" over two lines
                at 10px, in a 4-up row where every other card is a big mono figure with a caption
                under it. Correct and inconsistent is still a defect on a regulator-facing row.
                ⛔ The em-dash is the honest zero here, not "0". A count of 0 would state a
                measured rate of nothing; there was no activity to measure. The siblings already
                make this distinction — they render "n/a" rather than 0 when the roster read
                fails — so this is the row's own established grammar, not a new one. */}
            {rcTotal === 0 ? (
              <>
                <div className="font-mono font-bold text-title-md tabular text-text-tertiary">—</div>
                <p className="font-mono text-micro eyebrow uppercase text-text-tertiary">
                  no activity in window
                </p>
              </>
            ) : (
              <>
                <AdminStackedBar
                  segments={[
                    { flex: continued, color: "var(--text-tertiary)" },
                    { flex: tookBreak, color: "var(--warning-fg)" },
                    { flex: sxd, color: "var(--bet-lose)" },
                  ]}
                  height={14}
                />
                <p className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">
                  {continued} continued · {tookBreak} break · {sxd} self-excluded{" "}
                  <span className="text-text-subtle">
                    ({Math.round((continued / rcTotal) * 100)}/{Math.round((tookBreak / rcTotal) * 100)}/
                    {Math.round((sxd / rcTotal) * 100)}% of {rcTotal})
                  </span>
                </p>
              </>
            )}
          </AdminCard>
        </div>

        {/* §D — Match-integrity + report exports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* ⛔ DG-A-22 (2026-08-30) — THE STRETCH IS NOT THE DEFECT; THE CONTENT PINNED TO
              THE TOP OF IT IS. This row is FULL — two cards, two columns — so there is no
              empty cell here, only a short card equalised to a tall one. Derived from the
              classes: "Regulator report exports" is 5 REPORTS × (`h-7` plate 40 + `py-2` 24 +
              1px border) + `space-y-1` 16 = 340, inside 20 + 32 header + 16 `mb-3` + 20 =
              **428px**; this card's empty state is 20 + 32 + 16 + (`py-4` 40 + an 18px icon)
              + 20 = **146px**. 282px — two thirds of the card — was empty glass under one
              line of text.
              ⛔ `items-start` on the grid would REVERSE a shipped ruling: `AdminKpi`'s delta
              comment in admin-shell.tsx says "wrapping costs a line of height that the grid
              row equalises anyway, and loses nothing" — the console relies on equal card
              bottoms, and un-stretching gives every band a ragged edge.
              ⛔ `h-full` on the child does NOT work here and would overflow: `AdminCard` is a
              plain block that renders its 48px header BEFORE `{children}`, so a child at
              height:100% resolves against the whole content box and hangs ~48px past the
              card. Making the CARD a flex column and giving the child `flex-1` is the only
              form that distributes the height the grid row already imposed — and it needs no
              guessed `min-h`, which is the trap in the register's `auto-rows` prescription.
              ⭐ It is unconditionally safe because `integrityAlerts` is `.slice(0, 3)`: this
              card can never be the taller of the two, and the branch being centred renders
              only when it holds one line. */}
          <AdminCard title="Match-integrity alerts · 30 days" sw="Tahadhari za uadilifu" className="flex flex-col">
            {integrityAlerts.length === 0 ? (
              <div className="flex flex-1 items-center justify-center gap-3 py-4">
                <I.shieldcheck s={18} />
                <p className="text-caption text-text-secondary">No integrity alerts in the last 30 days. Sportradar feed: stub adapter.</p>
              </div>
            ) : (
              <ScrollX label="Integrity alerts" className="-mx-4 px-4">
                <table className="admin-tbl min-w-[480px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                    <tr>
                      <th className="text-left py-2 pr-3">When</th>
                      <th className="text-left py-2 pr-3">Match</th>
                      <th className="text-left py-2 pr-3">Severity</th>
                      <th className="text-left py-2 pl-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrityAlerts.map((a) => (
                      <tr key={a.id} className="border-b border-border-subtle/50 last:border-b-0">
                        <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDate(a.createdAt)}</td>
                        <td className="py-2 pr-3">{a.targetId ?? "—"}</td>
                        <td className="py-2 pr-3"><span className="font-mono text-micro tracking-wider uppercase">{a.action.replace("integrity.alert.", "")}</span></td>
                        <td className="py-2 pl-3 font-mono text-micro">
                          {a.targetId ? (
                            <Link href={`/admin/markets/${a.targetId}`} className="text-royal-300 hover:underline">open →</Link>
                          ) : (
                            <span className="text-text-tertiary">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
            )}
          </AdminCard>

          <AdminCard title="Regulator report exports" sw="Ripoti za udhibiti">
            {/* ⛔ G-6. Each row carried `-mx-2 px-2` to bleed its hover strip 12px past
                the card on each side, and nothing absorbed it — so this list overflowed
                its card by 12px at EVERY width, not just on a phone. The highlight now
                aligns to the card's content box: a 12px difference in where a background
                starts, and no difference at all to the reader. */}
            <div className="space-y-1">
              {REPORTS.map((r) => (
                <a key={r.id} href={`/admin/reports#${r.id}`} className="min-h-[var(--tap-min)] flex items-center gap-3 py-2 border-b border-border-subtle last:border-b-0 hover:bg-bg-overlay px-2 rounded transition-colors">
                  <span className={[
                    "h-7 w-7 rounded-md inline-flex items-center justify-center font-mono text-micro shrink-0",
                    r.tone === "warning" ? "bg-warning/15 text-warning" :
                    r.tone === "royal"   ? "bg-royal/15 text-royal-300" :
                    r.tone === "danger"  ? "bg-danger/15 text-danger-fg" :
                                           "bg-bg-sunken text-text-tertiary",
                  ].join(" ")}>↓</span>
                  <span className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span className="text-body-sm font-semibold text-text truncate">{r.title}</span>
                    <span className="font-mono text-micro text-text-tertiary truncate">{r.sub}</span>
                  </span>
                </a>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* §E — Operational notes */}
        <AdminCard className="border-info-border bg-info-bg">
          <div className="flex items-start gap-3">
            <I.warning s={18} />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">Inspector mode</p>
              <p>
                A regulator inspecting 50pick sees this page first. Every chip and table is read-only —
                nothing here mutates state. To act on items, drill into{" "}
                <a href="/admin/aml" className="text-royal-300 hover:underline">AML queue</a> for approvals,
                <a href="/admin/players" className="text-royal-300 hover:underline ml-1">Players</a> for player drill-down, or
                <a href="/admin/audit" className="text-royal-300 hover:underline ml-1">Audit log</a> for the chain itself.
              </p>
            </div>
          </div>
        </AdminCard>

        <PlayerSafetyPanel sp={sp} />

        <p className="text-caption text-text-tertiary text-center pt-3 flex items-center justify-center gap-1.5">
          <I.lock s={11} /> Confidential · screen and contents are subject to operational access logging.
        </p>
      </AdminBody>
    </>
  );
}

async function PlayerSafetyPanel({ sp }: { sp: { page?: string; sort?: string; dir?: string } }) {
  // A-5: a failed harm-detector read must NOT render all-zero marker chips or a
  // "No markers of harm detected" table — on an LCCP §3.4.1 safety surface that is
  // a false all-clear. Show an explicit "couldn't load" instead.
  let harmFailed = false;
  const flags = await detectHarmMarkersForAllUsers().catch(() => { harmFailed = true; return []; });
  const byMarker: Record<string, number> = {};
  for (const f of flags) byMarker[f.marker] = (byMarker[f.marker] ?? 0) + 1;

  // Sort (URL-driven), then paginate — newest detected first by default.
  const { sort, dir } = parseSort(sp, ["user", "marker", "severity", "detected"] as const, "detected", "desc");
  const sorted = applySort(flags, sort, dir, {
    user: (f) => f.userId,
    marker: (f) => f.marker,
    severity: (f) => f.severity,
    detected: (f) => f.detectedAt,
  });
  const page = parsePage(sp.page, sorted.length);
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/compliance", { sort: sp.sort, dir: sp.dir });
  return (
    <AdminCard
      title="Player safety · markers of harm"
      sw="Alama za hatari"
      action={
        <div className="flex items-center gap-2">
          <I.heartPulse s={14} className="text-warning" />
          <span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">LCCP §3.4.1</span>
        </div>
      }
      padding="p-0"
    >
      <div className="px-4 py-3 border-b border-border-subtle flex flex-wrap gap-1.5">
        {harmFailed ? (
          <Chip size="sm" variant="warning">markers n/a</Chip>
        ) : (
          <>
        <Chip size="sm" variant={byMarker["RAPID_DEPOSIT_ESCALATION"] ? "warning" : "neutral"}>
          {byMarker["RAPID_DEPOSIT_ESCALATION"] ?? 0} rapid-deposit
        </Chip>
        <Chip size="sm" variant={byMarker["CHASING_LOSSES"] ? "danger" : "neutral"}>
          {byMarker["CHASING_LOSSES"] ?? 0} chasing-losses
        </Chip>
        <Chip size="sm" variant={byMarker["LATE_NIGHT_PLAY"] ? "warning" : "neutral"}>
          {byMarker["LATE_NIGHT_PLAY"] ?? 0} late-night
        </Chip>
        <Chip size="sm" variant={byMarker["SESSION_OVERRUN"] ? "warning" : "neutral"}>
          {byMarker["SESSION_OVERRUN"] ?? 0} session-overrun
        </Chip>
        <Chip size="sm" variant={byMarker["LIMIT_BREACH_HISTORY"] ? "warning" : "neutral"}>
          {byMarker["LIMIT_BREACH_HISTORY"] ?? 0} limit-breach
        </Chip>
          </>
        )}
      </div>
      {harmFailed ? (
        <div className="p-4"><AdminLoadError what="harm markers" /></div>
      ) : (
        <>
      <ScrollX label="Harm markers">
        <table className="admin-tbl">
          <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
            <tr>
              <SortTh field="user" label="User" current={sort} dir={dir} sp={sp} baseHref="/admin/compliance" className="p-3" />
              <SortTh field="marker" label="Marker" current={sort} dir={dir} sp={sp} baseHref="/admin/compliance" className="p-3" />
              <SortTh field="severity" label="Severity" current={sort} dir={dir} sp={sp} baseHref="/admin/compliance" className="p-3" />
              <th className="text-left p-3">Detail</th>
              <SortTh field="detected" label="Detected" current={sort} dir={dir} sp={sp} baseHref="/admin/compliance" className="p-3" />
            </tr>
          </thead>
          <tbody className="text-text-secondary">
            {paged.map((f) => (
              <tr key={`${f.userId}-${f.marker}`} className="border-t border-border-subtle/50">
                <td className="p-3 font-mono">
                  <a href={`/admin/players/${f.userId}`} className="hover:text-royal-300 hover:underline">
                    {f.userId.slice(0, 16)}…
                  </a>
                </td>
                <td className="p-3 font-medium text-text">{f.marker}</td>
                <td className="p-3">
                  <Chip size="sm" variant={f.severity === "high" ? "danger" : f.severity === "warn" ? "warning" : "neutral"}>
                    {f.severity}
                  </Chip>
                </td>
                <td className="p-3 text-text-tertiary">{f.detail}</td>
                <td className="p-3 font-mono whitespace-nowrap">{formatDateTime(f.detectedAt)}</td>
              </tr>
            ))}
            {flags.length === 0 && (
              <AdminTableEmpty colSpan={5} kind="admin" title="No harm markers" body="No markers of harm detected across players." />
            )}
          </tbody>
        </table>
      </ScrollX>
      <AdminPagination total={sorted.length} page={page} baseHref={baseHref} />
        </>
      )}
    </AdminCard>
  );
}
