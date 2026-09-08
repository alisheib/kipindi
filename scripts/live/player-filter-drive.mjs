#!/usr/bin/env node
/**
 * `npm run qa:player-filters` — do the PLAYER filters actually filter?
 *
 * ⛔ WHY THIS NEEDS DRIVING RATHER THAN ASSERTING. This platform has already shipped
 * `regex-advertised-never-executed`: three surfaces advertised a search, echoed the pattern back
 * as the operator typed, and matched it as literal characters — **returning zero rows and
 * reporting that as the answer**. Three independent signals said the filter had run. It never
 * had. ⭐ A filter that silently does nothing looks exactly like a filter over data that
 * genuinely has no matches.
 *
 * THE INVARIANT — TWO ARMS, borrowed verbatim from `qa:admin-filters`, because each alone is
 * satisfied by a broken filter:
 *
 *   1. **SUBSET**   — the filtered rows must be a subset of the unfiltered rows.
 *                     A filter that is IGNORED passes this trivially, which is why 2 exists.
 *   2. **MATCHING** — every row still visible must actually satisfy the filter.
 *                     A filter that returns NOTHING passes this vacuously, which is why the
 *                     count is checked too.
 *
 * ⭐ AND THE VALUE IS CHOSEN FROM THE DATA, NOT INVENTED — `qa:admin-filters`'s own rule. The
 * driver reads the unfiltered page first and picks a lens that is **present but not universal**,
 * so a correct filter MUST reduce the count. Hard-coding a lens that happens to be empty would
 * make "0 rows" the expected answer and the check could never fail.
 *
 * ── HOW MATCHING IS PROVEN WITHOUT READING A SINGLE WORD ─────────────────────────────────────
 * ⛔ The obvious implementation — read each card's status chip and check it says "Won" — is
 * locale-dependent, and a check that only works in English is not a check on a trilingual
 * product. Every queried row instead carries `data-row-id`, so this works over SETS:
 *
 *   · DISJOINT — the outcome lenses share no row. If `win` admitted a lost position, that row
 *     appears in two sets and the intersection is non-empty.
 *   · COVERING — their union is exactly the parent lens. If `win` DROPPED a won position, the
 *     union is missing a row the parent has.
 *
 * ⭐ Disjoint + covering IS matching, proven as arithmetic over the whole universe rather than as
 * membership over a sample — and a membership check can pass over a population where the defect
 * cannot appear, which is this programme's most expensive recurring lesson.
 *
 * ⚠️ IT PAGES. Comparing the twelve rows one page shows would make every set the same size and
 * every arm vacuous — the exact false finding `qa:admin-filters` records from its own first run.
 *
 * ⛔ LOCALHOST ONLY. Needs a signed-in fixture with real rows — see §0 of
 * `docs/PLAYER-QUERY-CAMPAIGN.md` for the seed recipe.
 *
 *   node scripts/live/player-filter-drive.mjs [baseUrl] [--only=/positions]
 */
import { chromium } from "playwright";

const BASE = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3031";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE)) {
  console.error(`REFUSED — localhost-only, got ${BASE}`);
  process.exit(1);
}
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const ONLY = arg("only", null);

/**
 * The surfaces, and the PARTITIONS each one claims.
 *
 * ⚠️ A partition is declared as `{ parent, parts }` and both halves are checked. Declaring only
 * the parts would let a lens quietly stop covering its parent; declaring only the parent would
 * let two lenses overlap.
 */
const SURFACES = [
  {
    id: "/positions",
    path: "/positions",
    param: "tab",
    all: "all",
    partitions: [
      { parent: "all", parts: ["open", "settled"] },
      { parent: "settled", parts: ["win", "loss", "void", "cashed"] },
    ],
  },
  {
    id: "/updown/history",
    path: "/updown/history",
    param: "tab",
    all: "all",
    partitions: [
      // ⚠️ SIX, NOT FIVE. A round whose bets have settled but whose settlement PRICE is still
      //    being confirmed is none of up/down/void — the card has always had a fifth chip for it.
      //    Leaving it out of the rail would leave those rounds reachable by no control, and this
      //    assertion is what would have caught that.
      { parent: "all", parts: ["inplay", "up", "down", "void", "pending"] },
    ],
  },
  {
    id: "/results",
    path: "/results",
    param: "out",
    all: "all",
    partitions: [
      // ⚠️ `void` also absorbs a row whose verdict the purge ceremony redacted (`null`) — a
      //    settlement the archive can no longer state is closer to "no side won" than to
      //    either side, and leaving it in no lens would break COVERING.
      { parent: "all", parts: ["yes", "no", "void"] },
    ],
  },
  {
    id: "/proposals",
    path: "/proposals",
    param: "lens",
    all: "all",
    partitions: [
      // ⚠️ SEVEN, AND `changes` IS THE ONE A PLAN WOULD DROP. `status-badge.tsx` gives
      //    `CHANGES_REQUESTED` its own word AND its own glyph, because it is the single state
      //    where the PROPOSER has to act — so folding it into "under review" would hide the one
      //    thing on this board that is waiting on the person reading it.
      //    ⛔ COVERING is enforced in the contract by the TYPE system: `LENS_OF` is a
      //    `Record<ProposalStatus, …>`, so a status added to the enum cannot compile until it has
      //    a lens. This assertion proves the rendering half of the same claim.
      { parent: "all", parts: ["review", "changes", "approved", "live", "resolved", "declined"] },
    ],
  },
  {
    id: "/watchlist",
    path: "/watchlist",
    param: "lens",
    all: "all",
    partitions: [
      // ⚠️ FIVE, NOT THE FOUR THE PLAN NAMED, and this assertion is what enforces both
      //    corrections. `progress` is the RESIDUAL arm — "not open and not settled" — so COVERING
      //    holds for every one of the five stored `PredictionMarketStatus` values including
      //    `DRAFT`, which `createMarket` never writes today but `@default(DRAFT)` keeps alive.
      //    ⛔ And `void` is its own part rather than being folded into `done`: the campaign's
      //    complaint ends "cannot tell won from lost from voided-and-refunded", so a single
      //    "Settled" pill would re-commit the defect on the page that names it.
      { parent: "all", parts: ["open", "progress", "done", "void"] },
    ],
  },
  {
    id: "/wallet",
    path: "/wallet",
    param: "type",
    all: "all",
    partitions: [
      { parent: "all", parts: ["in", "out", "bet", "payout", "refund", "bonus", "adjust", "commission"] },
    ],
  },
  /**
   * ⛔ `/notifications` IS DELIBERATELY ABSENT, AND THIS NOTE IS WHY — so nobody "fixes" the
   * omission by inventing a partition that is not there. Its five lenses answer THREE
   * different questions: `unread` is a read-state, `money`/`account` are kinds, `cleared` is a
   * visibility. An unread money row is in two of them at once, so DISJOINT is false by
   * construction and no set of them COVERS the parent.
   *
   * ⭐ THAT IS NOT A DEFECT — IT IS DOCUMENTED AND REASONED UPSTREAM. `notification-filters.ts`
   * states the one disjointness the product DOES enforce and why: *"a money row appearing
   * under two lenses reads as two events — this product has already shipped a duplicate-
   * notification defect where a player was told twice they had won (28 byte-identical rows on
   * production, 2026-07-31)"*, so `money ∩ account = ∅` and `all ∩ cleared = ∅`.
   *
   * ⚠️ DECLARING A FALSE PARTITION WOULD BE WORSE THAN DECLARING NONE: this driver would then
   * report a real failure about a page that is behaving exactly as designed. The claim that
   * matters here — every pill's number is what pressing it shows — is proved by
   * `qa:count-truth`, which needs no partition.
   */
  /**
   * DECLARED 2026-09-08 (PLAYER QUERY, task 4.6). ⛔ This SURFACES list is one of the four
   * declaration places §6 of the campaign doc does not name — see the note in
   * `count-truth-drive.mjs`, which states it once for all four.
   *
   * ⭐ UNLIKE `/notifications`, THIS ONE REALLY IS A PARTITION. Every audit row carries exactly one
   * `AuditCategory`, so the categories are disjoint by construction and their union is `all` — the
   * two arms this driver exists to check are both true here, and declaring them is what proves it
   * rather than asserting it.
   *
   * ⚠️ THE PARTS ARE THE WHOLE ENUM, THOUGH NO PERSONA PRODUCES ALL EIGHT. `getAuditForActorDurable`
   * filters on `actorId`, so `ADMIN` / `SECURITY` / `SYSTEM` rows do not normally reach a player's
   * own feed and their pills are simply not rendered. That is handled rather than fudged: the
   * driver filters to `present` before choosing a narrowing lens, and reports 🔶 rather than a pass
   * when an arm is unexercisable on the seeded data. ⛔ Declaring only the categories one fixture
   * happens to hold would make the partition a description of that fixture instead of of the enum,
   * and a category that stopped being covered would never be noticed.
   */
  {
    id: "/profile/account",
    path: "/profile/account",
    param: "act",
    all: "all",
    partitions: [
      { parent: "all", parts: ["AUTH", "KYC", "WALLET", "BET", "ADMIN", "COMPLIANCE", "SECURITY", "SYSTEM"] },
    ],
  },
];

const surfaces = ONLY ? SURFACES.filter((s) => s.id === ONLY || s.path === ONLY) : SURFACES;
if (surfaces.length === 0) {
  console.error(`🔴 --only=${ONLY} matched no surface — refusing to report a clean run over nothing.`);
  process.exit(3);
}

let pass = 0;
const fails = [];
/**
 * ⛔ A THIRD OUTCOME, AND IT IS NOT A PASS. Some assertions can only be made if the FIXTURE
 * happens to contain the right shape of data — "at least one lens is present but not universal"
 * needs a route where some rows are in one lens and some are not. On a fresh store every Up &
 * Down round a player holds is still in play, so that arm cannot be exercised at all.
 *
 * ⭐ REPORTING THAT AS A FAILURE WOULD BE A FALSE FINDING about a product that is fine, and
 * reporting it as a PASS would be the vacuous green this whole programme exists to refuse. So it
 * is neither: it is printed loudly, counted separately, and named in the summary — the same
 * honesty `qa:filter-scan` shows when it says "7 of 8 surfaces reached".
 * ⛔ A skip NEVER counts toward `pass`, so a run that skipped everything cannot read as coverage.
 */
const skips = [];
const skip = (label, why) => { skips.push(`${label} — ${why}`); console.log(`  SKIP ${label} — ${why}`); };
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fails.push(`${label}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

/**
 * Every row id across EVERY page of a view, plus the count the bar promised and the counts each
 * pill advertises.
 *
 * ⛔ It follows the pager. See the header: comparing one page's worth makes every set the same
 * size and every assertion vacuous.
 */
async function readView(page, path) {
  const ids = new Set();
  let promised = null;
  let chips = {};
  let pageNum = 1;
  // A hard stop, so a pager that loops cannot hang the run. 60 pages × 12 is far past any fixture.
  for (; pageNum <= 60; pageNum++) {
    const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}page=${pageNum}`;
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
    if (!res || res.status() >= 400) return { ids, promised, chips, error: `HTTP ${res ? res.status() : "none"}` };
    await page.waitForTimeout(250);
    const snap = await page.evaluate(() => ({
      rows: [...document.querySelectorAll("[data-row-id]")].map((n) => n.getAttribute("data-row-id")),
      promised: document.querySelector("[data-result-count]")?.getAttribute("data-result-count") ?? null,
      chips: Object.fromEntries(
        [...document.querySelectorAll("[data-chip][data-count]")].map((n) => [n.getAttribute("data-chip"), Number(n.getAttribute("data-count"))]),
      ),
      pages: [...document.querySelectorAll("nav[aria-label] a[href*='page='], a[href*='page=']")].length,
    }));
    if (pageNum === 1) { promised = snap.promised == null ? null : Number(snap.promised); chips = snap.chips; }
    const before = ids.size;
    snap.rows.forEach((r) => ids.add(r));
    // No new rows on this page ⇒ the pager has run out. (A repeated page would add nothing.)
    if (ids.size === before) break;
    if (promised != null && ids.size >= promised) break;
  }
  return { ids, promised, chips, pagesWalked: pageNum };
}

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const auth = await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
  if (!auth || auth.status() >= 400) {
    console.error("🔴 could not sign in at /auth/demo — REFUSING to continue. A run that was asked to sign in and could not has measured nothing.");
    process.exit(1);
  }

  for (const s of surfaces) {
    console.log(`\n── ${s.id} ───────────────────────────────────────────`);
    const base = await readView(page, s.path);
    if (base.error) { ok(`${s.id} loads`, false, base.error); continue; }

    // ⛔ THE VACUITY FLOOR. Everything below is arithmetic over this set; an empty one makes
    //    every arm trivially true. §0 of the campaign tracker: a live gate over an empty product
    //    is a SKIPPED RUN, not a pass.
    if (!ok(`${s.id} · 0.1 the unfiltered view has rows to reason about`, base.ids.size > 0, `${base.ids.size} rows`)) continue;
    ok(`${s.id} · 0.2 the bar publishes a result count`, base.promised != null);
    ok(`${s.id} · 0.3 …and it equals the rows actually delivered`,
      base.promised === base.ids.size, `promised ${base.promised}, delivered ${base.ids.size}`);

    for (const part of s.partitions) {
      const parentPath = part.parent === s.all ? s.path : `${s.path}?${s.param}=${part.parent}`;
      const parent = part.parent === s.all ? base : await readView(page, parentPath);
      if (parent.error) { ok(`${s.id} · ${part.parent} loads`, false, parent.error); continue; }

      const sets = {};
      for (const id of part.parts) {
        const v = await readView(page, `${s.path}?${s.param}=${id}`);
        if (v.error) { ok(`${s.id} · ${id} loads`, false, v.error); continue; }
        sets[id] = v;

        // ── ARM 1 · SUBSET ────────────────────────────────────────────────────────────────
        const stray = [...v.ids].filter((x) => !parent.ids.has(x));
        ok(`${s.id} · ${s.param}=${id} · SUBSET of ${part.parent}`, stray.length === 0,
          stray.length ? `${stray.length} row(s) appear under the lens but not its parent, e.g. ${stray[0]}` : "");

        // ── THE PROMISE ───────────────────────────────────────────────────────────────────
        // ⭐ The pill said a number BEFORE it was pressed; the page delivered one after. This is
        //    the 2026-08-10 defect in one assertion: "40 live" printed above zero cards.
        const promisedByPill = base.chips[`${s.param}:${id}`];
        if (promisedByPill != null) {
          ok(`${s.id} · ${s.param}=${id} · the pill's promise is what arrives`,
            promisedByPill === v.ids.size, `pill promised ${promisedByPill}, page delivered ${v.ids.size}`);
        }
      }

      const present = part.parts.filter((id) => sets[id] && sets[id].ids.size > 0);
      // ⭐ THE VALUE IS CHOSEN FROM THE DATA: a lens that is present but not universal, so a
      //    correct filter MUST reduce the count.
      const reducing = present.find((id) => sets[id].ids.size < parent.ids.size);
      const sizes = `sizes ${part.parts.map((i) => `${i}=${sets[i] ? sets[i].ids.size : "?"}`).join(" ")} vs parent ${parent.ids.size}`;
      if (reducing) {
        ok(`${s.id} · ${part.parent} · at least one lens is present but not universal`, true);
        ok(`${s.id} · ${s.param}=${reducing} · actually NARROWS the list`,
          sets[reducing].ids.size < parent.ids.size, `${sets[reducing].ids.size} vs ${parent.ids.size}`);
      } else {
        // ⚠️ Every row sits in ONE lens, so no lens can reduce the parent. That is a fact about
        //    the FIXTURE, not the filter — and the DISJOINT/COVERING arms below still run, so the
        //    lenses are not unchecked here, only this one arm is unexercisable.
        skip(`${s.id} · ${part.parent} · at least one lens is present but not universal`,
          `the fixture puts every row in one lens (${sizes}) — seed a mixed one to exercise this`);
      }

      // ── ARM 2 · MATCHING, as disjointness + covering ─────────────────────────────────────
      const seen = new Map();
      const overlaps = [];
      for (const id of Object.keys(sets)) {
        for (const row of sets[id].ids) {
          if (seen.has(row)) overlaps.push(`${row} in both ${seen.get(row)} and ${id}`);
          else seen.set(row, id);
        }
      }
      ok(`${s.id} · ${part.parent} · the lenses are DISJOINT — no row is admitted by two`,
        overlaps.length === 0, overlaps.slice(0, 2).join(" · "));

      const missing = [...parent.ids].filter((x) => !seen.has(x));
      ok(`${s.id} · ${part.parent} · …and together they COVER it — no row is admitted by none`,
        missing.length === 0, missing.length ? `${missing.length} row(s) reachable by no lens, e.g. ${missing[0]}` : "");
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${pass} passed · ${fails.length} failed · ${skips.length} could not be exercised by this fixture`);
if (skips.length) { console.log(""); skips.forEach((sk) => console.log("  🔶 " + sk)); }
if (fails.length) { console.error(""); fails.forEach((f) => console.error("  ✗ " + f)); process.exit(1); }
if (pass === 0) { console.error("🔴 ZERO assertions ran — a SKIPPED RUN, not a pass."); process.exit(3); }
console.log("\n✅ every player filter narrows the list, and every survivor belongs to exactly one lens.");
if (skips.length) console.log("⚠️  …but read the 🔶 lines: those arms were not exercised, and green here does not cover them.");
