import { parseQuery, matchesQuery, fieldNames, USER_SEARCH } from "@/lib/search";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AccountStatusBadge, accountStatusLabel, KycStageBadge, kycStageLabel } from "@/components/admin/status-badge";
import { kycStage, isKycStage, KYC_STAGES, type KycStage, type KycCell } from "@/lib/kyc-stage";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Sensitive } from "@/components/ui/sensitive";
import { db } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { formatTzs, formatDate } from "@/lib/utils";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { displayLabel, displayInitials } from "@/lib/display-label";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

export const metadata = { title: "Admin · Players" };
export const dynamic = "force-dynamic";

export default async function AdminPlayersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; kyc?: string; sort?: string; dir?: string; page?: string }> }) {
  const sp = await searchParams;
  // RBAC: only accounting-view roles see wallet balances (Support = roster, no money).
  const _session = await currentSession();
  const canSeeMoney = _session ? await canView(_session.role, "accounting") : false;
  const query = (sp.q ?? "").trim().toLowerCase();
  const statusFilter = sp.status ?? "";
  const sortField = (["joined", "login", "balance"] as const).includes(sp.sort as never) ? sp.sort! : "joined";
  const sortDir = sp.dir === "asc" ? "asc" : "desc";

  // A-5: distinguish a failed population read from a genuinely empty player base,
  // so the headline counts show "n/a" (not a fabricated "0 players") on failure.
  let all: Awaited<ReturnType<typeof db.user.list>> = [];
  let usersFailed = false;
  try { all = await db.user.list(); } catch { usersFailed = true; }

  /* -- KYC STAGE - the derived identity column (2026-09-11, Ali's request) ---
   *
   * ⭐ THE DEFECT IT FIXES, IN HIS WORDS: "it says pending kyc always — how do I
   * know who uploaded and how not." He is right, and the cause is structural: the
   * Status column beside this one is `User.status`, an ACCOUNT fact, so four
   * different people read one identical "Pending KYC" — someone with no submission
   * at all, someone who opened KYC and uploaded nothing, someone who uploaded every
   * photo and never pressed Confirm, and someone who submitted and is waiting on US.
   * The third group is invisible platform-wide: `listPendingKyc` reads only
   * PENDING_REVIEW + ADDITIONAL_INFO_REQUIRED, so nobody chases them.
   *
   * ⭐ ONE DERIVATION FEEDS THE ROWS, THE COUNTS AND THE FILTER. There is no SQL
   * pre-filter and no re-derivation, so a drift between the chip, the tally and the
   * filtered set is not merely unlikely — it is unexpressible.
   *
   * ⚠️ TWO FLAT READS OVER THE POPULATION, AND THEY ARE CHEAPER THAN THE READ THIS
   * PAGE ALREADY DOES. `db.user.list()` above hydrates every User row; this is six
   * narrow scalars per submission plus one aggregate over a narrow child table.
   * ⛔ NOT `db.kyc.list()` — findMany with no `where`, no `orderBy` and
   * `include: { documents: true }`: every inline base64 image, and a
   * non-deterministic winner for any user with two submissions.
   * ⛔ NOT `db.kyc.findByUserId(u.id)` in a loop — that is the N+1 this page spent
   * a release removing from the wallet column.
   */
  let stageRows: Awaited<ReturnType<typeof db.kyc.listStageFacts>> = [];
  let kycFailed = false;
  try { stageRows = await db.kyc.listStageFacts(); } catch { kycFailed = true; }

  // The DAL has already reduced to the NEWEST submission per user, ordered
  // (createdAt desc, id desc) — the same row `db.kyc.findByUserId` returns, so this
  // page and /admin/players/[id] cannot disagree about one player.
  const stageByUser = new Map<string, KycStage>();
  for (const r of stageRows) stageByUser.set(r.userId, kycStage(r));

  /**
   * ⛔ A MISS IS NOT AN ERROR — `kycStage(null)` is "nothing_yet". No registration
   * path writes a KycSubmission; the row is created LAZILY on the first render of
   * /profile/kyc, inside a `catch {}` that swallows failure.
   *
   * ⚠️ WHICH IS WHY THE WORD IS "Nothing yet" AND NEVER "never opened KYC". Both
   * sign-up doors now redirect a new account straight to `/profile/kyc?welcome=new`,
   * so a missing row today means a legacy account, an abandon between the redirect
   * and the render, a SWALLOWED `startKyc` failure, or a non-player (a bootstrap
   * admin is created ACTIVE and never routed to KYC). "Nothing yet" is honest for
   * all four; "never opened" would accuse a player the platform itself failed.
   *
   * ⛔ A-5 — A FAILED READ IS NEVER A FACT. `kycStage()` cannot emit "unreadable" -
   * tsc proves it, because `KycCell` carries that arm and `KycStage` does not — so
   * the PAGE owns that state, exactly as it already does for a failed wallet read.
   */
  const stageOf = (userId: string): KycCell =>
    kycFailed ? "unreadable" : (stageByUser.get(userId) ?? kycStage(null));

  /**
   * VALIDATED AGAINST THE CLOSED SET, exactly as `ACCOUNT_FILTER` is — a junk or
   * hostile `?kyc=` must not silently filter the roster to zero rows and let an
   * officer conclude a queue is empty.
   * ⛔ DROPPED WHEN THE READ FAILED: filtering on an empty map would render
   * "0 of 1,842 players", which reads as "this stage is empty" rather than "the
   * instrument is broken".
   * ⛔ NOTHING TO CLAMP BY ROLE. Only ADMIN / COMPLIANCE / SUPPORT reach this route,
   * and the page already publishes the coarser "Pending KYC" fact to all three — by
   * row, by KPI, by mix bar, and by `?status=PENDING_KYC`. Gating the refinement
   * would blind the SUPPORT desk (whose domain OWNS this page, and who field "why
   * can't I deposit?") while closing no leak at all. What stays privileged is the
   * submission's CONTENTS — number, images, DOB — and that is untouched here.
   */
  const kycFilter: KycStage | "" = !kycFailed && isKycStage(sp.kyc) ? sp.kyc : "";
  // Shared grammar (src/lib/search). Previously a single contiguous `.includes()`,
  // so an officer typing a name AND a phone fragment — the most natural way to
  // find one player — got nothing back. `displayLabel` is computed, not a column,
  // so it is supplied on the record here (see USER_SEARCH.handle).
  const parsed = parseQuery(query, { fields: fieldNames(USER_SEARCH) });
  const filtered = all.filter((u) => {
    if (statusFilter && u.status !== statusFilter) return false;
    // ⭐ THE SAME `stageOf` THE CHIP RENDERS — not a parallel predicate. The filtered
    // set and the column cannot disagree because they are one function.
    if (kycFilter && stageOf(u.id) !== kycFilter) return false;
    return matchesQuery(parsed, { ...u, displayLabel: displayLabel(u) } as unknown as Record<string, string | null | undefined>, USER_SEARCH);
  });

  // Sort
  // `sortBalances` deliberately OUTLIVES the branch below: when the balance sort runs it
  // has already loaded every wallet, and the table further down used to go and fetch the
  // twenty it needs all over again. See the balance resolution after pagination.
  let sortBalances: Map<string, number> | null = null;
  if (sortField === "balance") {
    // Batch-load all wallets in one query instead of N+1 per-user lookups.
    let allWallets: Awaited<ReturnType<typeof db.wallet.listAll>> = [];
    let walletsOk = true;
    try { allWallets = await db.wallet.listAll(); } catch { walletsOk = false; }
    const balanceMap = new Map<string, number>();
    for (const w of allWallets) balanceMap.set(w.userId, w.balance);
    // Only publish the map for REUSE if the read actually succeeded. On failure the map is
    // empty, and treating "empty" as "everyone has no wallet" would silently print "—" down
    // the whole money column — a failed read rendering as a fact, which is the A-5 defect.
    // The per-row path below is left to try again instead.
    if (walletsOk) sortBalances = balanceMap;
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
  /**
   * -- the stage tallies, from the SAME map the chips read ------------------
   * ⛔ ITERATE `all`, NOT `stageRows`. The population is the USERS. Counting the
   * submission rows silently drops every user who has none — legacy accounts, an
   * abandon, a swallowed `startKyc`, a bootstrap admin — from the tallies while they
   * still appear in the table. "Nothing yet" is the bucket this feature exists to
   * reveal, so it is the one that must not be counted by accident.
   * Seeded from `KYC_STAGES` so a stage with zero players reads 0, never undefined.
   */
  const stageCounts = Object.fromEntries(KYC_STAGES.map((s) => [s, 0])) as Record<KycStage, number>;
  if (!kycFailed) for (const u of all) stageCounts[stageByUser.get(u.id) ?? "nothing_yet"]++;

  /* !! `sp` WHOLESALE, AND IT IS A REAL DEFECT THIS CLOSES - not a style change.
   * `buildBaseHref` is a DENY-LIST OF ONE KEY: it keeps every truthy param it is
   * handed and drops only `pageParam`. The allow-list was the HAND-TYPED LITERAL
   * that used to sit here — `{ q, status, sort, dir }` — so a new `kyc` param would
   * have been dropped from every page link. Page 2 would then be
   * `/admin/players?...&page=2` with no filter, and the filter is recomputed from
   * the URL: an officer who filters to "Submitted — with us", pages forward and
   * works the list would be reading the GENERAL ROSTER believing it is a review
   * queue, while the count JUMPS UP to the unfiltered total. With only `?kyc=` set,
   * `entries.length === 0` and page 2 is the bare path — the filter evaporates.
   * ⛔ Do NOT "fix" this in pagination.tsx: there is no list in it to add to, and it
   * is shared by ~25 admin and money screens. Passing `sp` is what the sibling admin
   * pages (aml, approvals, ai-polls, config) already do, and it makes this page
   * immune to the whole class rather than to `kyc` alone.
   * ⚠️ Only visible above PER_PAGE rows — a 12-row result renders no pager at all,
   * which is how a regression here would look fine in a casual check. */
  const baseHref = buildBaseHref("/admin/players", sp);

  /**
   * ⚡ WALLET BALANCES ARE RESOLVED ONCE, HERE, FOR THE VISIBLE PAGE ONLY — 2026-08-21.
   *
   * The table body used to be `await Promise.all(paged.map(async (u) => { const wallet =
   * await db.wallet.findByUserId(u.id); … }))` — a query per rendered row, inside JSX.
   * Two things were wrong with that, and both are removed without changing a single
   * rendered character:
   *
   *  1. 🔴 IT RAN FOR VIEWERS WHO ARE NOT ALLOWED TO SEE THE ANSWER. The cell is
   *     `canSeeMoney && wallet ? … : "—"`, so for a SUPPORT officer — whose whole point
   *     is roster-without-money (RBAC, above) — the page fired twenty wallet reads per
   *     load and threw every one of them away. The gate is now asked BEFORE the query,
   *     not after it, which is also the right shape for a money read on a licensed
   *     platform: privileged data that is never fetched cannot leak.
   *
   *  2. IT RE-FETCHED WHAT THE BALANCE SORT HAD JUST LOADED. Sorting by Wallet pulls
   *     every wallet into `sortBalances`; the rows then queried twenty of them again,
   *     one at a time. Reusing the map also makes the column self-consistent — the
   *     figure a row shows is now from the same snapshot the ordering was computed from,
   *     where before the two could be read milliseconds apart and disagree.
   *
   * When neither shortcut applies the point queries still run, in parallel, for the
   * ≤20 visible rows — deliberately NOT `listAll()`, which would trade twenty indexed
   * reads for the entire wallet table and get worse with every player who signs up.
   * (`Promise.resolve` per the §9 gotcha: the dev in-memory store returns these values
   * synchronously while tsc only ever sees Prisma's async types.)
   */
  const pageBalances = new Map<string, number>();
  if (canSeeMoney) {
    if (sortBalances) {
      for (const u of paged) {
        const b = sortBalances.get(u.id);
        if (b !== undefined) pageBalances.set(u.id, b);
      }
    } else {
      const wallets = await Promise.all(paged.map((u) => Promise.resolve(db.wallet.findByUserId(u.id))));
      for (const w of wallets) if (w) pageBalances.set(w.userId, w.balance);
    }
  }

  // One pass over the population → the status→count map that feeds both the KPI
  // band and the status-mix bar (was seven separate .filter() passes).
  const statusCounts: Record<string, number> = {};
  for (const u of all) statusCounts[u.status] = (statusCounts[u.status] ?? 0) + 1;
  const counts = {
    total: all.length,
    active: statusCounts.ACTIVE ?? 0,
    suspended: statusCounts.SUSPENDED ?? 0,
    self_excluded: statusCounts.SELF_EXCLUDED ?? 0,
  };
  const blocked = counts.suspended + counts.self_excluded;

  return (
    <>
      <AdminPageHead title="Players" sw="Wachezaji" />

      <AdminBody>
        {/* Headline KPIs — replaces the header count-chips with the console-standard
            band (matches overview / cohorts). Blocked = suspended + self-excluded. */}
        <KpiGrid>
          <AdminKpi label="Total players" sw="Jumla ya wachezaji" value={usersFailed ? "" : counts.total.toLocaleString()} unavailable={usersFailed} />
          <AdminKpi label="Active" sw="Hai" value={usersFailed ? "" : counts.active.toLocaleString()} unavailable={usersFailed} tone="success" delta={`${counts.total ? Math.round((counts.active / counts.total) * 100) : 0}%`} deltaDir="up" />
          {/* ⭐ THE TILE NOW NAMES OUR WORK, NOT THE POPULATION'S STATE — and it is the
              tile Ali is reading when he says "it says pending kyc always". It used to
              count `User.status === "PENDING_KYC"` and caption it "needs review" with an
              UP arrow, which is FALSE for everyone who has uploaded nothing, i.e. most of
              the population. Leaving it would put two contradicting statements about one
              population in one viewport.
              ⭐ It carries the second number in its caption, so BOTH of his questions are
              answered on page load with no interaction: `with_us` is the only stage where
              the ball is in our court, and `uploaded` is the rescue list - every one of
              them a single nudge away from our review queue, and shown on NO other screen
              in the console.
              ⚠️ Both numbers are POPULATION-WIDE, like "Total players" beside them, and do
              NOT move under a filter.
              ⛔ `deltaDir="flat"`: a caption is not a movement - on a money console an
              upward arrow is a claim, not decoration.
              ⛔ No `sw`: there is no shipped Swahili for these words and the lexicon
              forbids inventing one. */}
          <AdminKpi
            label="KYC waiting on us"
            value={usersFailed || kycFailed ? "" : stageCounts.with_us.toLocaleString()}
            unavailable={usersFailed || kycFailed}
            delta={kycFailed ? undefined : `${stageCounts.uploaded.toLocaleString()} uploaded · not sent`}
            deltaDir="flat"
          />
          <AdminKpi label="Blocked" sw="Zimezuiwa" value={usersFailed ? "" : blocked.toLocaleString()} unavailable={usersFailed} tone={blocked > 0 ? "danger" : undefined} delta={`${counts.suspended} susp · ${counts.self_excluded} excl`} deltaDir="flat" />
        </KpiGrid>

        {/* Population status mix — one at-a-glance segmented bar (green Active /
            amber pending / rose blocked / grey closed). Complements the numeric
            band; the detailed per-status breakdown lives on Cohorts. */}
        <StatusMix counts={statusCounts} />

        <AdminCard>
          <form className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[260px]">
              <I.search s={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Phone (+255…), display name, or usr_…"
                aria-label="Search players"
                /* ⚠️ LITERAL, not `h-8` (48px on the overridden scale) — 32px = --h-control-xs,
                   the one admin-search height, matching the xs Selects beside it. */
                className="h-[var(--h-control-xs)] w-full rounded-md border border-border bg-bg-overlay pl-9 pr-3 text-[12.5px] text-text outline-none admin-focus transition-colors placeholder:text-text-subtle"
              />
            </div>
            <div className="w-full sm:w-[180px]">
              {/* The six words come from the lexicon, not from here: this list and the
                  population-mix legend below had each hand-typed them, and the chip in
                  the table beside them printed the raw column instead — three
                  renderings of one enum, which is the §L2 defect exactly. */}
              <Select
                name="status"
                defaultValue={statusFilter}
                size="xs"
                placeholder="All statuses"
                options={[
                  { value: "", label: "All statuses" },
                  ...ACCOUNT_FILTER.map((s) => ({ value: s, label: accountStatusLabel(s) })),
                ]}
              />
            </div>
            {/* ⛔ INSIDE THE FORM, and that is load-bearing. The form has no `action` and
                no `method`, so a GET submit REPLACES the whole query string with only its
                NAMED fields - a control outside it means pressing Search silently wipes
                the KYC filter. (The hazard is already proven on this page: the form
                carries no hidden sort/dir, so Search resets the sort today.)
                ⭐ The words come from the lexicon via `kycStageLabel`, never hand-typed
                here - three renderings of one enum is the defect this page already
                records paying for, twenty lines up.
                ⭐ The COUNT rides on each option, so the officer sees the size of every
                queue before choosing one. */}
            {/* ⚠️ 260px, MEASURED NOT GUESSED. At 200px the trigger wrapped to two lines
                ("Uploaded · not sent ·" / "1"), which made this control taller than the
                Search button beside it and broke the filter row's alignment — caught on a
                screenshot, not by any assertion. The longest option is "Rejected · after
                upload · 99"; 23 characters already wrapped at 200px, so it needs ~235px.
                ⛔ The fix is NOT `truncate` on the trigger: ui-consistency rules that an
                error and DG-A-05 calls it illegal — a filter whose selected value you
                cannot read is worse than a wide control. */}
            <div className="w-full sm:w-[260px]">
              <Select
                name="kyc"
                defaultValue={kycFilter}
                size="xs"
                placeholder="All KYC stages"
                ariaLabel="Filter by KYC stage"
                disabled={kycFailed}
                disabledReason={kycFailed ? "The KYC read failed — reload to try again." : undefined}
                options={[
                  { value: "", label: "All KYC stages" },
                  ...KYC_STAGES.map((s) => ({ value: s, label: `${kycStageLabel(s)} · ${stageCounts[s]}` })),
                ]}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-xs">
              Search
            </button>
            {(query || statusFilter || kycFilter) && (
              <a href="/admin/players" className="btn btn-ghost btn-xs">
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
                  {/* ⛔ THE HEADER MUST NOT BEGIN "sta". `scripts/admin-filter-drive.mjs`
                      matches columns by a 3-char lowercased prefix, so a header like
                      "Stage" would silently retarget the EXISTING filter gate onto these
                      cells while still reporting green. "KYC" is what an officer calls it
                      anyway. */}
                  <th className="text-left">KYC</th>
                  <SortTh field="balance" label="Wallet" current={sortField} dir={sortDir} align="right" sp={sp} baseHref="/admin/players" />
                  <SortTh field="joined" label="Joined" current={sortField} dir={sortDir} sp={sp} baseHref="/admin/players" />
                  <SortTh field="login" label="Last login" current={sortField} dir={sortDir} sp={sp} baseHref="/admin/players" />
                  <th className="text-left">Drill-down</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {paged.map((u) => {
                  const balance = pageBalances.get(u.id);
                  const label = displayLabel(u);
                  const initials = displayInitials(u);
                  const isAutoHandle = !((u.displayName ?? "").trim().length > 0);
                  return (
                    <tr key={u.id} data-row-id={u.id}>
                      <td>
                        <a href={`/admin/players/${u.id}`} className="flex items-center gap-2.5 min-w-0 hover:text-royal-300">
                          <Avatar initials={initials} size="sm" seed={u.id} />
                          <div className="min-w-0">
                            <p className={`text-body-sm font-medium text-text truncate ${isAutoHandle ? "font-mono" : ""}`}>{label}</p>
                            <p className="text-micro font-mono text-text-tertiary truncate">{u.id}</p>
                          </div>
                        </a>
                      </td>
                      {/* ⛔ THE COMMENT THAT USED TO SIT HERE SAID "Masked in the broad list view
                          — full number only on the detail page (PII minimization)", AND IT HAD
                          BEEN FALSE FOR MONTHS: the detail page masked too, so there was no
                          surface anywhere in the console that showed a full number. Ali ruled on
                          2026-09-06 that the roster is exactly where he needs to tell one player
                          from another, and that the eye belongs on every row. Each reveal is a
                          server round trip that writes a `pii.revealed` audit row, so a list is
                          not a bulk read — it is N individually recorded ones. Search still
                          matches the full number. `docs/COMPLIANCE-DECISIONS.md`, 2026-09-06. */}
                      <td className="font-mono whitespace-nowrap"><Sensitive field="phone" subjectId={u.id} value={u.phoneE164} /></td>
                      <td data-filter-value={u.status}><AccountStatusBadge status={u.status} /></td>
                      {/* ⛔ A WORKFLOW WORD ONLY — no idType, no idNumber, no expiry, no
                          date of birth, no filename, no thumbnail. Everything from the
                          submission ITSELF stays behind the PII gate and <Sensitive> on
                          the detail page. This cell says whose move it is, nothing more.
                          ⛔ Ungated by role, exactly like the chip beside it - see
                          `kycFilter` above for why gating it would blind the support desk
                          without closing anything. */}
                      <td data-kyc-stage={stageOf(u.id)}><KycStageBadge cell={stageOf(u.id)} /></td>
                      {/* `pageBalances` is empty unless the viewer passed the accounting
                          gate, so this stays exactly the old `canSeeMoney && wallet` cell:
                          a player with no wallet row, and a viewer with no money rights,
                          both read "—". */}
                      <td className="font-mono tabular text-right whitespace-nowrap">{balance !== undefined ? formatTzs(balance) : "—"}</td>
                      <td className="font-mono whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="font-mono whitespace-nowrap">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}</td>
                      <td>
                        <a href={`/admin/players/${u.id}`} className="row-link text-royal-300 hover:underline font-mono text-micro">profile →</a>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  usersFailed ? (
                    <tr><td colSpan={8} className="p-4"><AdminLoadError what="the player list" /></td></tr>
                  ) : (
                    <AdminTableEmpty
                      colSpan={8}
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

        <AdminCard className="border-info-border bg-info-bg">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">Privileged actions</p>
            <p>Live today: suspend / restore, KYC decisions, credential changes, and data export — each is ADMIN/COMPLIANCE-tier, requires step-up 2FA, and is recorded in the <code>ADMIN</code>/<code>COMPLIANCE</code> audit category with the reviewer&apos;s user-id and reason. <em>Target architecture (not yet enforced):</em> two-person approval on wallet freeze / transaction reversal / account closure, and IP capture.</p>
          </div>
        </AdminCard>
      </AdminBody>
    </>
  );
}

/* Population status mix — a single segmented bar + legend, reusing the console's
   semantic status colours (green Active · amber pending/cooling · rose blocked ·
   grey closed). Zero-count statuses are dropped so the bar and legend stay clean. */
const MIX_ORDER: ReadonlyArray<{ key: string; label: string; color: string }> = [
  { key: "ACTIVE",        color: "var(--yes-500)" },
  { key: "PENDING_KYC",   color: "var(--warning-500)" },
  { key: "COOLED_OFF",    color: "var(--warning-500)" },
  { key: "SUSPENDED",     color: "var(--no-500)" },
  { key: "SELF_EXCLUDED", color: "var(--no-500)" },
  { key: "CLOSED",        color: "var(--border-strong)" },
].map((m) => ({ ...m, label: accountStatusLabel(m.key) }));

/* The status filter's closed set, in the order an officer scans it. Same source as
   the legend above and the chip in the table — the words are the lexicon's. */
const ACCOUNT_FILTER = ["ACTIVE", "PENDING_KYC", "SUSPENDED", "SELF_EXCLUDED", "COOLED_OFF", "CLOSED"] as const;

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
