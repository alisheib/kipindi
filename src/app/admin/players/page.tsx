import { parseQuery, matchesQuery, fieldNames, USER_SEARCH } from "@/lib/search";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AccountStatusBadge, accountStatusLabel, presentedAccountStatus, KycStageBadge, kycStageLabel, kycStageVariant, fundedAxisLabel } from "@/components/admin/status-badge";
import {
  kycStage, isKycStage, KYC_STAGES, MONEY_NOT_APPLIED, MONEY_ONLY_STAGES, MONEY_SPLIT_STAGES,
  stageTurnsOnMoney, walletHeldTzs, FUNDED_AXIS, isFundedAxis, fundedAxisOf, isFinalRefusalCell,
  type KycStage, type KycCell, type KycMoney, type FundedAxis,
} from "@/lib/kyc-stage";
import { REVIEW } from "@/lib/admin-status-lexicon";
import { Chip } from "@/components/ui/chip";
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

export default async function AdminPlayersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; kyc?: string; funded?: string; sort?: string; dir?: string; page?: string }> }) {
  const sp = await searchParams;
  // RBAC: only accounting-view roles see wallet balances (Support = roster, no money).
  const _session = await currentSession();
  const canSeeMoney = _session ? await canView(_session.role, "accounting") : false;
  const query = (sp.q ?? "").trim().toLowerCase();
  /**
   * ⛔ VALIDATED AGAINST THE CLOSED SET — 2026-09-13, like `?kyc=` and `?funded=` below. It used to
   * be matched raw, which was harmless while every stored status was also a filter option. From
   * 2026-09-13 `PENDING_KYC` is not an option (see ACCOUNT_FILTER), and a legacy
   * `?status=PENDING_KYC` link would have rendered "No players match" — which reads as a finding
   * about the population. It now falls back to "All statuses", and the Select says so.
   */
  const statusFilter: (typeof ACCOUNT_FILTER)[number] | "" =
    (ACCOUNT_FILTER as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof ACCOUNT_FILTER)[number]) : "";
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
   * (From 2026-09-13 that Status column never says "Pending KYC" at all — see
   * ACCOUNT_FILTER at the foot of this file.)
   *
   * ⭐ ONE DERIVATION FEEDS THE ROWS, THE COUNTS AND THE FILTER. There is no SQL
   * pre-filter and no re-derivation, so a drift between the chip, the tally and the
   * filtered set is not merely unlikely — it is unexpressible. From 2026-09-13 that
   * derivation also reads MONEY (`kycStage(facts, money)`), so "Funded · nothing
   * sent" joins the column, the tallies and the filter through the same function.
   *
   * ⚠️ FLAT READS OVER THE POPULATION. `db.user.list()` above hydrates every User row;
   * this is six narrow scalars per submission plus one aggregate over a narrow child
   * table, and the wallet read below is one narrow row per account.
   * ⛔ NOT `db.kyc.list()` — findMany with no `where`, no `orderBy` and
   * `include: { documents: true }`: every inline base64 image, and a
   * non-deterministic winner for any user with two submissions.
   * ⛔ NOT `db.kyc.findByUserId(u.id)` in a loop — that is the N+1 this page spent
   * a release removing from the wallet column.
   */
  let stageRows: Awaited<ReturnType<typeof db.kyc.listStageFacts>> = [];
  let kycFailed = false;
  try { stageRows = await db.kyc.listStageFacts(); } catch { kycFailed = true; }

  /**
   * ⚡ WALLETS: ONE POPULATION READ, ASKED FOR ONLY BY A VIEWER ALLOWED THE ANSWER — 2026-09-13.
   *
   * Until 2026-09-13 this page read at most twenty wallets by point query, for the visible rows,
   * and this comment argued AGAINST `listAll()` because it trades twenty indexed reads for the
   * whole wallet table. That trade is now forced, and it is the right one: the funded stage and
   * the `?funded=` axis must know every player's money BEFORE filtering and paging, or the tally,
   * the filter and the chip would each see a different population — the drift `kyc-stage.ts`
   * exists to make unexpressible. It is the same shape as `listStageFacts` above: one flat read
   * per population. The balance sort and the visible rows reuse this snapshot, so every money
   * figure on the page comes from one read.
   *
   * 🔴 THE RBAC GATE IS STILL ASKED BEFORE THE QUERY. Privileged data that is never fetched cannot
   * leak: a SUPPORT viewer's render reads no wallet at all.
   * 🔴 AND IT CLOSES A LEAK THAT WAS LIVE: the balance SORT used to load every wallet for ANY
   * viewer, so a SUPPORT officer could order the roster by standing balance and read the ranking
   * off a column of "—". Without money rights `?sort=balance` now falls back to "joined".
   * ⛔ A FAILED READ IS NOT "EVERYONE HOLDS NOTHING". `walletsFailed` renders "Not available" down
   * the money column, withholds `?funded=`, and marks "unreadable" exactly the KYC cells whose word
   * money decides (`stageTurnsOnMoney`) — no more, no fewer.
   */
  let wallets: Awaited<ReturnType<typeof db.wallet.listAll>> = [];
  let walletsFailed = false;
  if (canSeeMoney) {
    try { wallets = await db.wallet.listAll(); } catch { walletsFailed = true; }
  }
  const walletByUser = new Map(wallets.map((w) => [w.userId, w] as const));
  /** Money is APPLIED only for a viewer with money rights whose read succeeded. */
  const moneyKnown = canSeeMoney && !walletsFailed;
  /** A money-rights viewer whose wallet read failed: the money-split stages are undecidable. */
  const moneyStagesUnknown = canSeeMoney && walletsFailed;
  /** `balance + hold` — the liability basis, from the one shared definition. */
  const heldOf = (userId: string): number => walletHeldTzs(walletByUser.get(userId));
  /** ⛔ `MONEY_NOT_APPLIED` is not zero — see `KycMoney`. Never `{ heldTzs: 0 }` for an unread account. */
  const moneyOf = (userId: string): KycMoney => (moneyKnown ? { heldTzs: heldOf(userId) } : MONEY_NOT_APPLIED);

  // The DAL has already reduced to the NEWEST submission per user, ordered
  // (createdAt desc, id desc) — the same row `db.kyc.findByUserId` returns, so this
  // page and /admin/players/[id] cannot disagree about one player. First row wins.
  const factsByUser = new Map<string, (typeof stageRows)[number]>();
  for (const r of stageRows) if (!factsByUser.has(r.userId)) factsByUser.set(r.userId, r);
  // ⭐ Iterates the USERS, not the submission rows: a funded player with no row at all is the
  // population the money dimension exists to reveal, and a loop over rows would never meet them.
  const stageByUser = new Map<string, KycStage>();
  for (const u of all) stageByUser.set(u.id, kycStage(factsByUser.get(u.id) ?? null, moneyOf(u.id)));

  /**
   * ⛔ A MISS IS NOT AN ERROR — a user with no submission row has sent nothing, and
   * `kycStage(null, money)` decides which of its two words they get. No registration
   * path writes a KycSubmission; the row is created LAZILY on the first render of
   * /profile/kyc, inside a `catch {}` that swallows failure.
   *
   * ⚠️ WHICH IS WHY THE WORD IS "Nothing yet" AND NEVER "never opened KYC". From
   * 2026-09-05 to 2026-09-13 both sign-up doors redirected a new account straight to
   * /profile/kyc — this comment said so, and the ruling of 2026-09-13 ended it. A new
   * player now lands on their safe `next`, else on the deposit page with `welcome=new`
   * (auth/register/actions.ts, auth/login/actions.ts), because identity is asked before a
   * withdrawal and before nothing else. So a missing row is now the NORMAL state of a
   * brand-new player who deposits and plays — besides an abandon, a SWALLOWED `startKyc`
   * failure, or a non-player (a bootstrap admin is created ACTIVE and never routed to KYC).
   * "Nothing yet" is honest for all of them; "never opened" would accuse a player of
   * skipping a step the platform no longer asks of them.
   *
   * ⛔ A-5 — A FAILED READ IS NEVER A FACT. `kycStage()` cannot emit "unreadable" -
   * tsc proves it, because `KycCell` carries that arm and `KycStage` does not — so
   * the PAGE owns that state: the whole column on a failed KYC read, and exactly the
   * money-decided cells on a failed wallet read.
   */
  const stageOf = (userId: string): KycCell => {
    if (kycFailed) return "unreadable";
    const facts = factsByUser.get(userId) ?? null;
    if (moneyStagesUnknown && stageTurnsOnMoney(facts)) return "unreadable";
    return stageByUser.get(userId) ?? kycStage(facts, moneyOf(userId));
  };

  /**
   * THE STAGES THIS VIEWER MAY BE OFFERED.
   * ⛔ ROLE CLAMP — THE FILE STAGES ARE UNGATED, THE MONEY SPLIT IS NOT (2026-09-13). Only ADMIN /
   * COMPLIANCE / SUPPORT reach this route. Gating the FILE stages would blind the SUPPORT desk
   * (whose domain owns this page, and who field "why can't I withdraw?") while closing no leak;
   * what stays privileged there is the submission's CONTENTS — number, images, DOB — untouched
   * here. But "Funded · nothing sent" is a standing-balance fact, and SUPPORT reads
   * `money.figures` masked (roles.ts: movements yes, totals no). So a money-only stage is offered
   * only when money is known, and to SUPPORT the same person reads "Nothing yet" — which claims
   * only what it always claimed, that nothing was sent.
   * ⛔ After a failed wallet read, BOTH money-split stages are withheld: their sizes are unknown,
   * and a count that is right only by accident is a fabricated one.
   */
  const offeredStages: readonly KycStage[] = KYC_STAGES.filter((s) =>
    (MONEY_ONLY_STAGES as readonly KycStage[]).includes(s) ? moneyKnown
    : (MONEY_SPLIT_STAGES as readonly KycStage[]).includes(s) ? !moneyStagesUnknown
    : true);

  /**
   * VALIDATED AGAINST THE CLOSED SET, exactly as `ACCOUNT_FILTER` is — a junk or
   * hostile `?kyc=` must not silently filter the roster to zero rows and let an
   * officer conclude a queue is empty.
   * ⛔ DROPPED WHEN THE READ FAILED: filtering on an empty map would render
   * "0 of 1,842 players", which reads as "this stage is empty" rather than "the
   * instrument is broken". The same holds for a stage this viewer is not offered.
   */
  const kycFilter: KycStage | "" = !kycFailed && isKycStage(sp.kyc) && offeredStages.includes(sp.kyc) ? sp.kyc : "";
  /**
   * `?funded=held|none` — the MONEY axis (2026-09-13), validated against `FUNDED_AXIS` the same way.
   * ⛔ Honoured only when money is known: without money rights it would be a balance question
   * answered to a viewer who may not ask it, and after a failed read "none" would be a false claim
   * about every player.
   */
  const fundedFilter: FundedAxis | "" = moneyKnown && isFundedAxis(sp.funded) ? sp.funded : "";

  // Shared grammar (src/lib/search). Previously a single contiguous `.includes()`,
  // so an officer typing a name AND a phone fragment — the most natural way to
  // find one player — got nothing back. `displayLabel` is computed, not a column,
  // so it is supplied on the record here (see USER_SEARCH.handle).
  const parsed = parseQuery(query, { fields: fieldNames(USER_SEARCH) });
  const filtered = all.filter((u) => {
    // ⛔ The PRESENTED status — the word the chip in this row shows — so `?status=ACTIVE` returns a
    // `PENDING_KYC` straggler that reads "Active", instead of hiding a row the officer can see.
    if (statusFilter && presentedAccountStatus(u.status) !== statusFilter) return false;
    // ⭐ THE SAME `stageOf` THE CHIP RENDERS — not a parallel predicate. The filtered
    // set and the column cannot disagree because they are one function.
    if (kycFilter && stageOf(u.id) !== kycFilter) return false;
    // ⭐ The same `heldOf` the money cell and the funded tally read.
    if (fundedFilter && fundedAxisOf(heldOf(u.id)) !== fundedFilter) return false;
    return matchesQuery(parsed, { ...u, displayLabel: displayLabel(u) } as unknown as Record<string, string | null | undefined>, USER_SEARCH);
  });

  // Sort. ⛔ "balance" only for a viewer who can see balances and whose read succeeded — see the
  // wallet read above for the leak this closes.
  const sortRequested = (["joined", "login", "balance"] as const).includes(sp.sort as never) ? sp.sort! : "joined";
  const sortField = sortRequested === "balance" && !moneyKnown ? "joined" : sortRequested;
  if (sortField === "balance") {
    filtered.sort((a, b) => {
      const cmp = (walletByUser.get(a.id)?.balance ?? 0) - (walletByUser.get(b.id)?.balance ?? 0);
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
   * -- the stage tallies, from the SAME `stageOf` the chips read ---------------
   * ⛔ ITERATE `all`, NOT `stageRows`. The population is the USERS. Counting the
   * submission rows silently drops every user who has none — from 2026-09-13 the
   * ordinary new player — from the tallies while they still appear in the table.
   * "Nothing yet" and "Funded · nothing sent" are the buckets that must not be
   * counted by accident.
   * ⛔ An "unreadable" cell is counted nowhere: a failed read is not a population.
   * Seeded from `KYC_STAGES` so a stage with zero players reads 0, never undefined.
   */
  const stageCounts = Object.fromEntries(KYC_STAGES.map((s) => [s, 0])) as Record<KycStage, number>;
  const countStage = (c: KycCell) => { if (c !== "unreadable") stageCounts[c]++; };
  if (!kycFailed) for (const u of all) countStage(stageOf(u.id));
  /** The `?funded=` tallies — only when money is known, from the same `heldOf`. */
  const fundedCounts: Record<FundedAxis, number> = { held: 0, none: 0 };
  if (moneyKnown) for (const u of all) fundedCounts[fundedAxisOf(heldOf(u.id))]++;

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
   * ⭐ `?funded=` (2026-09-13) rides every page link for exactly this reason, with no
   * change here — which is the point of passing `sp`.
   * ⛔ Do NOT "fix" this in pagination.tsx: there is no list in it to add to, and it
   * is shared by ~25 admin and money screens. Passing `sp` is what the sibling admin
   * pages (aml, approvals, ai-polls, config) already do, and it makes this page
   * immune to the whole class rather than to `kyc` alone.
   * ⚠️ Only visible above PER_PAGE rows — a 12-row result renders no pager at all,
   * which is how a regression here would look fine in a casual check. */
  const baseHref = buildBaseHref("/admin/players", sp);

  // One pass over the population → the status→count map that feeds both the KPI
  // band and the status-mix bar (was seven separate .filter() passes).
  // ⛔ PRESENTED statuses (2026-09-13): a `PENDING_KYC` straggler counts as Active, which is the
  // word its chip shows — see `presentedAccountStatus`.
  const statusCounts: Record<string, number> = {};
  for (const u of all) {
    const s = presentedAccountStatus(u.status);
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }
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
              the population. From 2026-09-13 that status is not even presented as a word.
              ⭐ It carries the second number in its caption, so BOTH of his questions are
              answered on page load with no interaction: `with_us` is the only stage where
              the ball is in our court, and `uploaded` is the rescue list - every one of
              them a single nudge away from our review queue, and shown on NO other screen
              in the console.
              ⚠️ Both numbers are POPULATION-WIDE, like "Total players" beside them, and do
              NOT move under a filter. Neither reads money, so neither differs by role.
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
            amber cooling / rose blocked / grey closed). Complements the numeric
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
              {/* The words come from the lexicon, not from here: this list and the
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
                queue before choosing one. ⛔ Only OFFERED stages are listed - see
                `offeredStages` for why a money stage is not offered to every viewer. */}
            {/* ⚠️ 260px, MEASURED NOT GUESSED. At 200px the trigger wrapped to two lines
                ("Uploaded · not sent ·" / "1"), which made this control taller than the
                Search button beside it and broke the filter row's alignment — caught on a
                screenshot, not by any assertion. The longest option is "Rejected · after
                upload · 99"; 23 characters already wrapped at 200px, so it needs ~235px.
                "Funded · nothing sent · 99" (2026-09-13) is shorter than that longest one.
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
                  ...offeredStages.map((s) => ({ value: s, label: `${kycStageLabel(s)} · ${stageCounts[s]}` })),
                ]}
              />
            </div>
            {/* ⭐ THE MONEY AXIS (2026-09-13) — INSIDE THE FORM for the same reason as the KYC
                Select above, and rendered ONLY for a viewer with money rights: the control
                itself would tell SUPPORT which players hold money. Disabled, with its reason,
                when the wallet read failed — never silently empty. The option counts are
                population-wide, like the stage counts. */}
            {canSeeMoney && (
              <div className="w-full sm:w-[180px]">
                <Select
                  name="funded"
                  defaultValue={fundedFilter}
                  size="xs"
                  placeholder="All balances"
                  ariaLabel="Filter by money held"
                  disabled={walletsFailed}
                  disabledReason={walletsFailed ? "The wallet read failed — reload to try again." : undefined}
                  options={[
                    { value: "", label: "All balances" },
                    ...FUNDED_AXIS.map((f) => ({ value: f, label: `${fundedAxisLabel(f)} · ${fundedCounts[f]}` })),
                  ]}
                />
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-xs">
              Search
            </button>
            {(query || statusFilter || kycFilter || fundedFilter) && (
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
                  {/* ⛔ SORTABLE ONLY WITH MONEY RIGHTS (2026-09-13) — a sort by a figure the viewer
                      cannot see still reveals its ranking. Same header word either way, so the
                      column never moves and the colSpan below stays eight. */}
                  {moneyKnown
                    ? <SortTh field="balance" label="Wallet" current={sortField} dir={sortDir} align="right" sp={sp} baseHref="/admin/players" />
                    : <th className="text-right">Wallet</th>}
                  <SortTh field="joined" label="Joined" current={sortField} dir={sortDir} sp={sp} baseHref="/admin/players" />
                  <SortTh field="login" label="Last login" current={sortField} dir={sortDir} sp={sp} baseHref="/admin/players" />
                  <th className="text-left">Drill-down</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {paged.map((u) => {
                  const wallet = moneyKnown ? walletByUser.get(u.id) : undefined;
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
                      {/* ⛔ The PRESENTED status in the attribute too (2026-09-13), so the filter
                          gate that reads it and the chip beside it name the same word. */}
                      <td data-filter-value={presentedAccountStatus(u.status)}><AccountStatusBadge status={u.status} /></td>
                      {/* ⛔ A WORKFLOW WORD ONLY — no idType, no idNumber, no expiry, no
                          date of birth, no filename, no thumbnail. Everything from the
                          submission ITSELF stays behind the PII gate and <Sensitive> on
                          the detail page. This cell says whose move it is, nothing more.
                          ⛔ The FILE stages are ungated by role, exactly like the chip beside
                          it; the MONEY split is not — see `offeredStages` above. */}
                      {/* ⭐ A FINAL refusal reads "Finally refused" (2026-09-13) — the word /admin/kyc/refused and
                          `kycStatusLabel` use for the same row — never the retryable-sounding "Rejected · after
                          upload". Same stage (`data-kyc-stage`, filter, tally), same tone via `kycStageVariant`;
                          only the WORD changes. See `isFinalRefusalCell` for why it is not a ninth stage. */}
                      <td data-kyc-stage={stageOf(u.id)} data-kyc-refusal={isFinalRefusalCell(stageOf(u.id), factsByUser.get(u.id)?.rejectReason) ? "final" : undefined}>
                        {isFinalRefusalCell(stageOf(u.id), factsByUser.get(u.id)?.rejectReason)
                          ? <Chip size="sm" variant={kycStageVariant(stageOf(u.id))}><span className="whitespace-nowrap">{REVIEW.kycRefusedFinal.en}</span></Chip>
                          : <KycStageBadge cell={stageOf(u.id)} />}
                      </td>
                      {/* THE MONEY COLUMN — money-rights viewers only, from the one snapshot.
                          · no money rights           → "—", exactly as before, and nothing was read
                          · the wallet read failed    → "Not available", never a fabricated TZS 0
                          · no wallet row             → "—"
                          · otherwise the balance, and — when non-zero — the in-flight hold beneath
                            it, because the funded axis counts `balance + hold` and a row reading
                            TZS 0 under "Holding money" would look like a contradiction.
                          `data-funded` carries the axis value for the live driver. */}
                      <td
                        className="font-mono tabular text-right whitespace-nowrap"
                        data-funded={moneyKnown ? fundedAxisOf(heldOf(u.id)) : undefined}
                      >
                        {!canSeeMoney ? "—"
                          : walletsFailed ? <span className="text-text-tertiary">{fundedAxisLabel("unreadable")}</span>
                          : wallet ? (
                            <>
                              {formatTzs(wallet.balance)}
                              {(wallet.hold ?? 0) > 0 && (
                                <span className="block text-micro text-text-tertiary"><span className="font-mono tabular-nums">+{formatTzs(wallet.hold ?? 0)}</span> in flight</span>
                              )}
                            </>
                          )
                          : "—"}
                      </td>
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
   semantic status colours (green Active · amber cooling · rose blocked · grey
   closed). Zero-count statuses are dropped so the bar and legend stay clean. */
const MIX_ORDER: ReadonlyArray<{ key: string; label: string; color: string }> = [
  { key: "ACTIVE",        color: "var(--yes-500)" },
  { key: "COOLED_OFF",    color: "var(--warning-500)" },
  { key: "SUSPENDED",     color: "var(--no-500)" },
  { key: "SELF_EXCLUDED", color: "var(--no-500)" },
  { key: "CLOSED",        color: "var(--border-strong)" },
].map((m) => ({ ...m, label: accountStatusLabel(m.key) }));

/* The status filter's closed set, in the order an officer scans it. Same source as
   the legend above and the chip in the table — the words are the lexicon's.
   ⛔ `PENDING_KYC` IS NOT IN IT, AND NOT IN THE LEGEND ABOVE — 2026-09-13. It gated nothing,
   new accounts are created ACTIVE, and the migration normalises the rest; a straggler is
   PRESENTED as Active (`presentedAccountStatus`) and counted, filtered and painted as Active.
   Offering it would promise a population that the platform no longer has a meaning for, and it
   is the word that told an officer the whole roster "needs review". */
const ACCOUNT_FILTER = ["ACTIVE", "SUSPENDED", "SELF_EXCLUDED", "COOLED_OFF", "CLOSED"] as const;

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
