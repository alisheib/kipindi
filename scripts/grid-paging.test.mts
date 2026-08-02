/**
 * ⭐ NO GRID WITHOUT PAGING — Ali's standing rule (LIVE-QA-CAMPAIGN §0.1b, finding G-1).
 *
 *   npx tsx scripts/grid-paging.test.mts     (npm run test:grid-paging)
 *
 * 🔴 THE FINDING (G-1, live QA campaign, production, 2026-08-02). `/admin/updown/rounds`
 * read `limit: 30` per chain, merged them, kept the newest 60, and titled the card
 * "Rounds · 60". Production held **1,402 rounds**. The operator's audit view of the game
 * was hiding 96% of it, and no control anywhere on the page could reach the rest.
 *
 * ⛔ THE REASON THIS IS WORSE THAN AN EMPTY GRID. An empty grid prompts a question. A
 * full-looking one that quietly stops at N answers a question the operator never asked,
 * with a number that is not the truth. Six other admin grids do the same thing, which is
 * why this guard scans the whole tree rather than pinning one page.
 *
 * THE TWO INVARIANTS PINNED HERE:
 *
 *   ⭐ §1 A grid whose row set can GROW is paged, and it is paged in the database —
 *      `count` and `list` answer the SAME filter, so the pager can never claim a page
 *      the table cannot fill, and no page is skipped or shown twice.
 *   ⭐ §2 No page.tsx renders a <table> off a silently-capped read. Either it uses the
 *      shared `AdminPagination`, or it is on the FIXED_GRIDS allowlist below with a
 *      written reason — a fixed 3-row config table does not need a pager, and saying so
 *      out loud is the difference between a judgement and an oversight.
 *
 * ⚠️ §2 is a source scan, and a source scan is the weakest kind of evidence — E-4's
 * lesson. So §1 does not scan anything: it drives the real `roundStore` through the real
 * filters and asserts on rows. §2 exists only to stop the NEXT grid shipping truncated.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { assetStore, chainStore, roundStore, __resetUpDownMemoryStores, type StoredRound } from "../src/lib/server/updown-dal.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

// ─────────────────────────────────────────────────────────────────────────────
// §1 · The paging CONTRACT, driven through the real store.
//
// 57 rounds across two chains of one asset plus one chain of another — deliberately
// not a multiple of the page size, because an exact multiple hides the off-by-one that
// an operator meets on the last page.
//
// ⚠️ ONE CHAIN CARRIES 35, AND THAT IS THE WHOLE POINT. The first draft gave the biggest
// chain 25: with nothing over the old 30-per-chain cap, the old read returned every row
// and 1.3 passed against the exact bug it was written to catch. A test that cannot fail
// is not evidence — the same lesson as E-4 and H-1.
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · roundStore pages in the database, and count agrees with list");

__resetUpDownMemoryStores();
const iso = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString();
await assetStore.upsert({
  id: "ast_a", key: "AAA", symbol: "A/USD", nameEn: "A", nameSw: "A", nameZh: null, iconKey: "gold",
  priceSourceUrl: "https://kitco.com/a", sourceDomain: "kitco.com", category: "macro",
  decimals: 2, minMoveTicks: 1, enabled: true, sortOrder: 0,
  createdBy: "test", createdAt: iso(0), updatedAt: iso(0),
} as never);
await assetStore.upsert({
  id: "ast_b", key: "BBB", symbol: "B/USD", nameEn: "B", nameSw: "B", nameZh: null, iconKey: "silver",
  priceSourceUrl: "https://kitco.com/b", sourceDomain: "kitco.com", category: "macro",
  decimals: 2, minMoveTicks: 1, enabled: true, sortOrder: 1,
  createdBy: "test", createdAt: iso(0), updatedAt: iso(0),
} as never);
for (const [id, assetId, dur] of [["chn_a5", "ast_a", 5], ["chn_a15", "ast_a", 15], ["chn_b15", "ast_b", 15]] as const) {
  await chainStore.upsert({
    id, assetId, durationMinutes: dur, state: "STOPPED", gridAnchorAt: iso(0), nextBoundaryAt: null,
    currentRoundId: null, minStake: null, maxStake: null, rateProfile: null, marginBps: null,
    createdBy: "test", createdAt: iso(0), updatedAt: iso(0),
  } as never);
}

const OUTCOMES = ["UP", "DOWN", "VOID", null] as const;
let made = 0;
for (const chainId of ["chn_a5", "chn_a15", "chn_b15"]) {
  const n = chainId === "chn_a5" ? 35 : chainId === "chn_a15" ? 15 : 7; // 57 total; 35 > the old 30-per-chain cap
  for (let i = 0; i < n; i++) {
    const outcome = OUTCOMES[made % 4];
    await roundStore.create({
      id: `udr_${chainId}_${i}`, chainId, marketId: `mkt_${chainId}_${i}`, roundNumber: i + 1,
      opensAt: iso(made), closesAt: iso(made + 1), boundaryAt: iso(made + 1),
      openObservationId: null, closeObservationId: null, openPrice: null, closePrice: null,
      marginBps: null, upTarget: null, downTarget: null,
      capturedSourceUrl: null, capturedSourceDomain: null,
      outcome, voidReason: null,
      resolvedAt: outcome ? iso(made + 2) : null,
      settledAt: outcome && made % 8 !== 0 ? iso(made + 3) : null,
      createdAt: iso(made), updatedAt: iso(made),
    } as StoredRound);
    made++;
  }
}

const total = await roundStore.count();
ok("1.1 · count() sees every round, not a capped read", total === 57, String(total));
ok("1.2 · an unbounded list() returns them all", (await roundStore.list()).length === 57);

// The bug in one assertion: the OLD page's read, run against the same data. 30-per-chain
// then slice(0,60) loses five of the 35 on `chn_a5` — and nothing about the result, or
// the page that rendered it, said so.
const oldRead = (await Promise.all(["chn_a5", "chn_a15", "chn_b15"].map((c) => roundStore.list({ chainId: c, limit: 30 }))))
  .flat().sort((a, b) => b.boundaryAt.localeCompare(a.boundaryAt)).slice(0, 60);
ok("1.3 · the read this replaced silently drops rows once a chain passes its cap",
   oldRead.length === 52 && oldRead.length < total, `${oldRead.length} of ${total}`);

// Walk every page and prove the walk is a partition of the set: no gap, no repeat.
const PER = 20;
const seen: string[] = [];
for (let p = 0; p * PER < total; p++) seen.push(...(await roundStore.list({ limit: PER, offset: p * PER })).map((r) => r.id));
ok("1.4 · paging visits every round exactly once — no gap, no duplicate",
   seen.length === total && new Set(seen).size === total, `${seen.length} rows, ${new Set(seen).size} unique`);
const lastPage = await roundStore.list({ limit: PER, offset: 40 });
ok("1.5 · the final page is short, not padded and not empty", lastPage.length === 17, String(lastPage.length));
ok("1.6 · an offset past the end returns nothing rather than wrapping to page 1",
   (await roundStore.list({ limit: PER, offset: 500 })).length === 0);

// count() and list() must answer the SAME question under every filter, or the pager
// labels a set it is not showing.
for (const [label, q] of [
  ["by asset (both cadences)", { chainIds: ["chn_a5", "chn_a15"] }],
  ["by one chain", { chainId: "chn_b15" }],
  ["by outcome VOID", { outcome: "VOID" as const }],
  ["by outcome PENDING", { outcome: "PENDING" as const }],
  ["unsettled only", { unsettledOnly: true }],
  ["asset + outcome together", { chainIds: ["chn_a5", "chn_a15"], outcome: "UP" as const }],
] as const) {
  const c = await roundStore.count(q);
  const rows = await roundStore.list(q);
  ok(`1.7 · count() === list().length — ${label}`, c === rows.length && c > 0, `${c} vs ${rows.length}`);
}

ok("1.8 · the asset filter covers BOTH of that asset's cadences",
   (await roundStore.count({ chainIds: ["chn_a5", "chn_a15"] })) === 50, String(await roundStore.count({ chainIds: ["chn_a5", "chn_a15"] })));
ok("1.9 · PENDING means 'no verdict yet', not the literal string",
   (await roundStore.list({ outcome: "PENDING" })).every((r) => r.outcome === null));
ok("1.10 · a filtered page is still a slice of THAT filter, not of everything",
   (await roundStore.list({ outcome: "VOID", limit: 5, offset: 0 })).every((r) => r.outcome === "VOID"));

// ─────────────────────────────────────────────────────────────────────────────
// §2 · The structural rule — no NEW grid ships truncated.
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · every page.tsx with a <table> either pages or declares why it does not");

/**
 * Grids whose row set is BOUNDED BY THE PRODUCT, not by a `limit`. Each needs a reason,
 * because "it is small today" is not one — the question is whether it can grow.
 * ⚠️ Adding a route here is a judgement call that must survive being read aloud.
 */
const FIXED_GRIDS: Record<string, string> = {
  "src/app/admin/insights/page.tsx": "renders a fixed analytic summary — the row count is the number of metrics, set in code",
  "src/app/admin/retention/page.tsx": "one row per retention policy; the policy set is defined in code, not by data",
  "src/app/admin/staff/page.tsx": "one row per staff account. Bounded by hiring, and an operator must see ALL of them at once — paging the privilege list is how a forgotten admin hides on page 2",
  "src/app/admin/staff/[id]/page.tsx": "one staff member's recent actions, explicitly a recent-activity excerpt with the full history a click away in the audit log",
  "src/app/admin/system/page.tsx": "fixed service/health rows plus a bounded cache-bucket sample, both defined in code",
  "src/app/admin/updown/page.tsx": "one row per chain. Chains are created by an operator one at a time and every one must be visible to be controlled",
  "src/app/admin/sources/page.tsx": "the trusted-source allowlist. It grows only when a compliance officer adds a domain, and the whole allowlist must be readable in one view to be auditable",
  "src/app/admin/live/page.tsx": "its table is live matches in progress — bounded by reality, not by a limit. Its two audit feeds are deliberately a newest-few glance, and each already links to /admin/audit?category=…, which IS fully paged and filterable. A second pager here would duplicate that surface on a page an operator refreshes constantly",
};

/**
 * ⏳ G-1 BACKLOG — grids that DO grow, are NOT paged yet, and are being worked through
 * one commit at a time. This is debt, written down, and the rules below make it behave
 * like debt: nothing may be ADDED to this map (2.2 fails on any grid not in either map),
 * and an entry whose page has since gained a pager must be DELETED (2.3b fails on a
 * stale one). So the list can only ever shrink, and a fix is not finished until its
 * line here is gone.
 *
 * ⛔ This is NOT a place to park a new grid. A grid that ships unpaged after 2026-08-02
 * belongs in neither map — it belongs paged.
 */
const UNPAGED_DEBT: Record<string, string> = {};

function pagesWithTables(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) pagesWithTables(p, out);
    else if (e === "page.tsx" && readFileSync(p, "utf8").includes("<table")) out.push(p);
  }
  return out;
}

const pages = pagesWithTables(join(ROOT, "src/app")).map((p) => relative(ROOT, p).replace(/\\/g, "/"));
ok("2.1 · the scan actually found the grids (a scan that finds nothing passes everything)",
   pages.length >= 30, `${pages.length} pages`);

const hasPager = (rel: string) => /\bAdminPagination\b|\bPagination\b/.test(readFileSync(join(ROOT, rel), "utf8"));
const undeclared = pages.filter((rel) => !hasPager(rel) && !FIXED_GRIDS[rel] && !UNPAGED_DEBT[rel]);
ok("2.2 · ⛔ no grid renders rows without a pager, a declared reason, or a backlog entry",
   undeclared.length === 0, undeclared.join(", "));

// An allowlist that names a route which no longer exists is a rule nobody is enforcing.
const stale = Object.keys(FIXED_GRIDS).filter((k) => !pages.includes(k));
ok("2.3 · the fixed-grid allowlist has no stale entries", stale.length === 0, stale.join(", "));

// ⛔ The ratchet. Once a backlog grid gains a pager its line must GO — otherwise the
// debt list slowly becomes a list of things that were once true, which is the state
// §0.1 calls worse than having no tracker at all.
const paidOff = Object.keys(UNPAGED_DEBT).filter((k) => !pages.includes(k) || hasPager(k));
ok("2.3b · a backlog grid that now pages has been removed from UNPAGED_DEBT",
   paidOff.length === 0, paidOff.join(", "));
console.log(`     ${Object.keys(UNPAGED_DEBT).length === 0 ? "✅ G-1 backlog is EMPTY" : `⏳ G-1 backlog remaining: ${Object.keys(UNPAGED_DEBT).length} grid(s)`}`);

// ── the three grids closed in the second half of session 8 ───────────────────
const proposalsSrc = readFileSync(join(ROOT, "src/app/admin/updown/proposals/page.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("2.10 · the AI proposal queue pages and filters by state",
   /<AdminPagination/.test(proposalsSrc) && /const STATES =/.test(proposalsSrc) && /stateFilter/.test(proposalsSrc));
ok("2.11 · ⛔ its AI-spend total stays LIFETIME, not per-page — a budget that moved when you turned a page would be worthless",
   /allProposals\.reduce\(\(s, p\) => s \+ p\.costUsd/.test(proposalsSrc) && !/\bconst spend = proposals\.reduce/.test(proposalsSrc));

const financeSrc = readFileSync(join(ROOT, "src/app/admin/finance/page.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("2.12 · the settlement-fee grid pages, on its own param so it cannot move the other lists",
   /<AdminPagination/.test(financeSrc) && /param="feepage"/.test(financeSrc) && !/rows\.slice\(0,\s*50\)/.test(financeSrc));

const liveSrc = readFileSync(join(ROOT, "src/app/admin/live/page.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("2.13 · the live bet feed reads exactly what it renders, and its title says how many",
   !/betEvents\.slice\(0,\s*10\)/.test(liveSrc) && /limit: BET_FEED/.test(liveSrc) && /last \$\{BET_FEED\}/.test(liveSrc));

// The player-facing grid, pinned by name: it is the only one in this sweep that a
// CUSTOMER meets, and its bug was the worst shape — the category filter ran INSIDE the
// truncation, so filtering could not reach what the cap had already discarded.
const acctSrc = readFileSync(join(ROOT, "src/app/profile/account/page.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("2.7 · a player can page their own activity, at the shared player page size",
   /<Pagination/.test(acctSrc) && /PLAYER_PER_PAGE/.test(acctSrc));
ok("2.8 · ⛔ their history is no longer fetched pre-truncated at 50",
   !/getOwnActivity\([^)]*,\s*50\s*\)/.test(acctSrc) && !/activity\.slice\(0,\s*30\)/.test(acctSrc));
// ⚠️ The first version of 2.9 compared two indexOf() positions and passed against the
// OLD code as well — vacuous, exactly like 1.3's first draft. What actually needs
// pinning is the ORDER of the two operations: the page slice must be taken from the
// FILTERED set. Slice first and filter second and a category search would only ever
// look at the 12 rows on screen.
ok("2.9 · ⛔ the page slice is taken from the FILTERED history, not the other way round",
   /const activityPage = activity\.slice\(/.test(acctSrc) && /parsePage\(sp\.page, activity\.length/.test(acctSrc));

// The specific regression: the rounds page must never go back to a hard slice.
// ⚠️ Comments are stripped FIRST. Without that, 2.4 failed on the fix itself — the new
// header quotes `.slice(0, 60)` while explaining what it removed, and the scan cannot
// tell a description of the bug from the bug.
const roundsSrc = readFileSync(join(ROOT, "src/app/admin/updown/rounds/page.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("2.4 · the rounds page pages in the DB rather than slicing a merged read",
   /\.list\(\{[^)]*offset:/.test(roundsSrc) && !/\.slice\(0,\s*60\)/.test(roundsSrc));
ok("2.5 · its card title and pager both quote the whole-set total, not the page length",
   /title=\{`Rounds · \$\{total\.toLocaleString\(\)\}`\}/.test(roundsSrc) && /total=\{total\}/.test(roundsSrc));
// ⛔ The money signal must not be a page-scoped read. Paging the table would otherwise
// make E-24's symptom INVISIBLE from page 1, which is strictly worse than truncation.
ok("2.6 · ⛔ the Overdue alarm is computed across the whole set, not the visible page",
   /unresolvedBefore\(/.test(roundsSrc) && !/stuck\s*=\s*enriched\.filter/.test(roundsSrc));

// ─────────────────────────────────────────────────────────────────────────────
// §3 · G-2 — the shared pager's controls are the size they LOOK like in the source.
//
// 🔴 THE FINDING (G-2, 2026-08-02, found while photographing the G-1 pager on
// production). `tailwind.config.ts` overrides the spacing scale: the key `10` is **80px**
// here, not the 40px it means in every other Tailwind project. The shared pager was
// written `h-10 min-w-[40px]` — plainly intending a ~40px square — and rendered a 40×80
// PORTRAIT pill on all 25 paginated screens, taller than the 44px filter chips directly
// above it and, on a phone, tall enough to push the next-page chevron onto its own row.
//
// ⛔ THE REASON NOTHING CAUGHT IT: the class list reads correct to anyone who knows
// Tailwind and not this config, and `min-w-[40px]` beside it looks like confirmation.
// Only a measurement in a real browser disagrees — which is why the campaign's own
// evidence bar is a screenshot, not a class name.
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · scale-token trap — controls sized in the scale mean what they look like");

const SCALE = JSON.parse(
  (readFileSync(join(ROOT, "tailwind.config.ts"), "utf8").match(/spacing:\s*\{([^}]*)\}/s)?.[1] ?? "")
    .replace(/(\w[\w.]*)\s*:/g, '"$1":').replace(/,\s*$/, "").replace(/^/, "{").replace(/$/, "}"),
);
ok("3.1 · the scale really is non-standard, so this section has something to guard",
   SCALE["10"] === "80px", `10 → ${SCALE["10"]}`);

const pagerSrc = readFileSync(join(ROOT, "src/components/ui/pagination.tsx"), "utf8");
const pagerCode = pagerSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("3.2 · ⛔ the pager control does not size itself with a scale token",
   !/\bh-(?:8|9|10|11|12)\b/.test(pagerCode), pagerCode.match(/\bh-\d+\b/)?.[0] ?? "");
ok("3.3 · it states its height literally, at or above the 44px tap-target floor",
   /h-\[(\d+)px\]/.test(pagerCode) && Number(pagerCode.match(/h-\[(\d+)px\]/)![1]) >= 44,
   pagerCode.match(/h-\[\d+px\]/)?.[0] ?? "none");
ok("3.4 · and its width floor matches, so a page button is not a portrait pill",
   /min-w-\[(\d+)px\]/.test(pagerCode) && Number(pagerCode.match(/min-w-\[(\d+)px\]/)![1]) >= 44,
   pagerCode.match(/min-w-\[\d+px\]/)?.[0] ?? "none");
ok("3.5 · the trap is written down where the next editor will read it",
   /80px|spacing scale/i.test(pagerSrc));

// ─────────────────────────────────────────────────────────────────────────────
// §4 · G-4 — the admin top bar must not crush its own navigation on a phone.
//
// 🔴 THE FINDING (G-4, 2026-08-02, found by measuring the box model at 360). The right
// action cluster is `shrink-0` and measures **302px**. On a 360 viewport that left the
// breadcrumb side **2px**, so: the breadcrumb rendered at a width of exactly **0**, and
// the mobile-nav trigger — the ONLY way into the admin menu on a phone — was squeezed
// from its 44px tap target to **18px**. On every admin page.
//
// ⛔ WHY NO EXISTING CHECK SAW IT: a 0px-wide `nav` reports no overflow, `truncate` on
// the crumbs was working exactly as written, and the bar still looked plausible in a
// screenshot. Only `getBoundingClientRect()` on the actual boxes disagreed.
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · the admin top bar keeps its nav trigger and role visible on a phone");

const shellSrc = readFileSync(join(ROOT, "src/components/admin/admin-shell.tsx"), "utf8");
const shellCode = shellSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const mobileSrc = readFileSync(join(ROOT, "src/components/admin/admin-mobile-nav.tsx"), "utf8");

ok("4.1 · ⛔ the mobile nav trigger is shrink-0 — the tap target is never what gives",
   /shrink-0"?>\s*<AdminMobileNavTrigger/s.test(shellCode.replace(/\s+/g, " ").replace(/" >/g, '">')) ||
   /<div className="shrink-0">\s*<AdminMobileNavTrigger/.test(shellCode));
ok("4.2 · the breadcrumb is hidden below md rather than collapsing to 0px",
   /aria-label="Breadcrumb" className="hidden md:flex/.test(shellCode));
ok("4.3 · the role chip yields the width below sm", /hidden sm:inline-flex[^"]*uppercase/.test(shellCode));
// ⛔ …but it must not simply VANISH. "Which role am I operating as" is a safety
// affordance on a licensed platform. The first draft of this fix hid the chip and left a
// comment claiming the drawer already showed the role — it did not. Pin the replacement.
ok("4.4 · ⭐ and the role is re-rendered in the mobile drawer, not dropped",
   /roleLabel=\{roleLabel\(session\.role\)\}/.test(shellCode) && /roleLabel &&/.test(mobileSrc));
ok("4.5 · the AdminKpi VALUE truncates — E-30 fixed the delta and left this assumed safe",
   /tabular-nums leading-none truncate/.test(shellCode) && /title=\{typeof value === "string"/.test(shellCode));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
