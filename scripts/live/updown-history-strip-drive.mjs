/**
 * U35's LAST STEP · D37 — watch the Up & Down history P&L strip, fed by REAL settled rounds,
 * hold still while the player turns the page.
 *
 *   npm run qa:updown-history-strip -- http://localhost:3000
 *   RED_SPILL=1  §3  restores the pre-fix markup (`.amount` on the whole price pair)
 *
 * 🔴 WHY THIS EXISTS AND WHY IT IS LOCAL. D37's arithmetic is proved by unit
 * (`test:updown-history-pnl`, 26 assertions, 6/6 mutations) and its FIT is proved against
 * production's own stylesheet (`ops/d37-tile-fit.mjs`). Neither watches the real strip carry real
 * money across a page turn, because **no production account has Up & Down history** — `mobile01`
 * is wallet 0, never funded, and Ali declined funding one. So this drive builds the history on the
 * dev store, through the production service functions.
 *
 * ⛔ IT REFUSES A NON-LOCAL BASE. It seeds, funds a wallet and drives chain boundaries through
 * `/api/dev-test/*`, which 404s in production and is blocked at the edge by `proxy.ts`.
 *
 * ── THREE THINGS THAT COST A DRIVE BEFORE ME, AND ONE THAT COST ME ───────────────────────────
 * 1. ⛔ **`updown-advance` CAN NEVER SETTLE A ROUND**, and the first version of this driver was
 *    built on it. Its own header says why: it sets `nextBoundaryAt = now − 1s`, so the round it
 *    opens closes a whole SPAN in the future and its `boundaryAt` never equals the chain's grid
 *    boundary — `advanceChain`'s close arm (`current.boundaryAt === boundaryIso`) can never match,
 *    so that round *"can only ever be voided by the healer"*. Measured here: three bets landed,
 *    three rounds VOIDED, three `+TZS 1,000` refunds, and a P&L strip reading `TZS 0 · 0 decided`
 *    — a green-looking run about nothing. `updown-advance` stands a board up; `updown-handover`
 *    is the only thing that settles.
 * 2. ⛔ **`/auth/demo` RESETS THE DEMO PLAYER'S BALANCE**, so funding before signing in is thrown
 *    away: `seed-wallet` answered `balance 5,100,000` and the page then read `TZS 100,000`. Sign
 *    in FIRST, fund SECOND, and re-read the balance from the page rather than trusting the reply.
 * 3. ⛔ **THE 09-24 DRIVE REPORTED "16 BETS PLACED" AND LANDED NONE** (§2, S19c) — it took its
 *    target round from the ADVANCE RESPONSE, which lists rounds that just CLOSED, and it counted
 *    CLICKS. Here every bet asserts the WALLET FELL, and two silent cycles in a row stop the run.
 * 4. ⚠️ **THE BALANCE READ WAS VERIFIED, NOT ASSUMED.** "Wallet fell by exactly the stake three
 *    times" is suggestive, not proof — so the figure was identified: the first `TZS` in
 *    `/wallet`'s text is the same value the header prints, for the user `whoami` confirms is
 *    signed in. A delta on a number nobody has identified is how an instrument lies quietly.
 *
 * ── §1 · THE HISTORY HAS TO BE TWO PAGES DEEP ────────────────────────────────────────────────
 * `PLAYER_PER_PAGE` is 12 (`components/ui/pagination.tsx:16`) and the strip groups by round, so
 * **13 settled rounds is the floor** — twelve cannot show a second page carrying the same money.
 * `arm` moves EVERY running chain at once, so one cycle yields as many rounds as there are chains.
 * ⚠️ `feedProvider: "mock-bars"` is not a nicety: the default `mock` returns one constant price
 * per symbol, so every round closes where it opened and settles VOID — a history with no P&L, and
 * a strip of zeroes that agrees with itself on every page for entirely the wrong reason.
 *
 * ── §2 · THE ONE THING NOBODY HAS SEEN ───────────────────────────────────────────────────────
 * Ali ruled on 2026-09-24 that the strip describes the WHOLE FILTERED VIEW, so the pager moves
 * the list and never the figures. Page 1 and page 2 must print identical Net return, staked →
 * returned, rounds, bets and win rate, while listing different rounds.
 * ⛔ AND "IDENTICAL" ALONE WOULD BE VACUOUS — it is also true of a strip that is page-scoped on a
 * history only one page deep, and of a strip of zeroes. So §2 refuses to pass unless it can show
 * BOTH that the pages list different rounds AND that the figures are non-zero. Anything less is
 * reported as BLIND, by name.
 *
 * ── §3 · THE SUB-LINE THAT USED TO SPILL ─────────────────────────────────────────────────────
 * `.amount` sets `white-space: nowrap` at doubled specificity, so "410,000 → 441,800" was one
 * unbreakable run in a ~124px tile. `.amount` now sits on each NUMBER and the arrow is the wrap
 * point. RED_SPILL puts the old rule back on the wrapper and §3 must fail.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || process.env.BASE || "http://localhost:3000";
if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(BASE)) {
  console.log(`\n⛔ REFUSING: ${BASE} is not local. This driver seeds data, funds a wallet and drives chain`);
  console.log(`   boundaries through /api/dev-test/*, which does not exist in production.`);
  process.exit(2);
}
const RED_SPILL = process.env.RED_SPILL === "1";
const WANT_ROUNDS = Number(process.env.WANT_ROUNDS || 13);
/**
 * ⛔ THE LEAD IS NOT A TASTE SETTING — IT IS ARITHMETIC, AND GETTING IT WRONG LOOKS LIKE AN OUTAGE.
 * `arm` opens a round whose close is `leadSeconds` from now. Betting stops at
 * `selectionClosesAt = close − resultPhaseMinutes(duration)` (`updown-durations.ts:251`), and
 * `resultPhaseMinutes = ceil(selectionCloseLeadSeconds/60)` where the lead is
 * `max(30, 0.2 × duration×60)`. So:
 *     5-minute chain  → lead 60s  → result phase 1 min → locks 60s before close
 *    15-minute chain  → lead 180s → result phase 3 min → locks 180s before close
 * A `leadSeconds` at or under 180 therefore opens every 15-minute round ALREADY LOCKED, and the
 * round page renders no commit button at all. Measured: at 40s, eight rounds in a row came back
 * "no commit button" and the run reported a history that was never created.
 * 200 clears the 15-minute lock with 20s to place the bet in.
 */
const LEAD = Number(process.env.LEAD_SECONDS || 200);
const PER_PAGE = 12;
const DEMO_PHONE = "+255700000000";

const failures = [];
const blind = [];
const fail = (s, m) => failures.push(`${s} ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const post = async (path, body) => {
  const r = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: r.status, json, text };
};

const b = await chromium.launch({ args: ["--no-sandbox"] });

// ── §0 · preflight ───────────────────────────────────────────────────────────────────────────
console.log("\n§0 · preflight");

const seed = await post("/api/dev-test/updown-seed", { durations: [5, 15], feedProvider: "mock-bars" });
if (seed.status !== 200 || !seed.json?.ok) { console.log(`⛔ updown-seed ${seed.status}: ${seed.text.slice(0, 200)}`); await b.close(); process.exit(2); }
const chains = (seed.json.chains || []).filter((c) => c.state === "RUNNING").length;
console.log(`  seeded ${(seed.json.assets || []).length} assets, ${chains} RUNNING chains`);
if (!chains) { console.log("⛔ no RUNNING chain — nothing can open and nothing can settle."); await b.close(); process.exit(2); }

const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true });
await ctx.addCookies([{ name: "kp-locale", value: "sw", url: BASE }]);
const page = await ctx.newPage();

// ⛔ ORDER MATTERS: sign in first. /auth/demo resets this player, so a wallet funded before it is
// funded into a balance that is about to be thrown away.
await page.goto(BASE + "/auth/demo", { waitUntil: "load", timeout: 300000 });
const whoami = await page.evaluate(async () => {
  const r = await fetch("/api/dev-test/whoami").catch(() => null);
  return r ? await r.json().catch(() => null) : null;
});
const userPhone = whoami?.session?.phoneE164 ?? null;
console.log(`  signed in as ${whoami?.session?.userId ?? "UNKNOWN"} (${userPhone})`);
if (userPhone !== DEMO_PHONE) {
  console.log(`⛔ expected the demo player ${DEMO_PHONE}; funding would credit someone else.`);
  await b.close();
  process.exit(2);
}
// ⛔ DO NOT FUND LARGE. The header and /wallet print the balance through a COMPACTING formatter,
// so a 2,000,000 top-up renders "TZS 2.1M" and a naive `TZS ([\d,]+)` read returns **2** — which
// this driver then reported as a balance too small to bet with. Measured, not theorised. The demo
// player starts with TZS 100,000, which covers 13 minimum stakes with room, and never compacts.
// Top up only if the balance is somehow short, and only to a figure that stays in full digits.

// ⛔ COUNT, NEVER A BOOLEAN. "any react props?" answers true for ~4 head nodes, and on an inert
// page every click reports success while no bet lands.
await page.goto(BASE + "/updown", { waitUntil: "load", timeout: 300000 });
await page.waitForTimeout(2500);
const hyd = await page.evaluate(() => {
  const all = document.querySelectorAll("*");
  return { n: [...all].filter((e) => Object.keys(e).some((k) => k.startsWith("__react"))).length, total: all.length };
});
console.log(`  hydration on /updown: ${hyd.n} of ${hyd.total}`);
if (hyd.n < 50) {
  console.log(`⛔ THE PAGE IS INERT (${hyd.n} hydrated). No click can become a bet. Stop — the sections`);
  console.log(`   below would report zeros that are not measurements.`);
  await b.close();
  process.exit(2);
}

/** The balance, read where it was IDENTIFIED: the first TZS figure on /wallet, which equals the
 *  header's. Returns null rather than a guess, so a failed read can never look like "no change". */
const walletNow = async () => {
  const p = await ctx.newPage();
  try {
    await p.goto(BASE + "/wallet", { waitUntil: "load", timeout: 300000 });
    await p.waitForTimeout(700);
    return await p.evaluate(() => {
      // ⛔ REFUSE A COMPACTED FIGURE RATHER THAN PARSE ONE. "TZS 2.1M" matches `TZS ([\d,]+)` as
      // "2", and a delta between two silently-truncated numbers is an instrument that lies without
      // ever erroring. Take the whole token and reject anything that is not pure digits/commas.
      const m = document.body.innerText.replace(/\s+/g, " ").match(/TZS\s*([\d.,]+[KMB]?)/);
      if (!m) return null;
      const tok = m[1];
      if (!/^[\d,]+$/.test(tok)) return { compacted: tok };
      return Number(tok.replace(/,/g, ""));
    });
  } finally { await p.close(); }
};

const opening = await walletNow();
if (opening && typeof opening === "object" && opening.compacted) {
  console.log(`⛔ the balance is printed COMPACTED as "${opening.compacted}" — this driver cannot read a`);
  console.log(`   truncated figure, and must not guess one. Lower the balance below the compaction`);
  console.log(`   threshold (the demo player's own TZS 100,000 is enough) and run again.`);
  await b.close();
  process.exit(2);
}
console.log(`  wallet as the player sees it: TZS ${opening}`);
if (typeof opening !== "number" || opening < WANT_ROUNDS * 1000) {
  console.log(`⛔ the balance (${opening}) cannot cover ${WANT_ROUNDS} minimum stakes — the commit button would be disabled.`);
  await b.close();
  process.exit(2);
}

// ── §1 · build a settled history, and prove every bet landed and every round resolved ────────
console.log(`\n§1 · build >=${WANT_ROUNDS} SETTLED rounds via arm/settle (lead ${LEAD}s, ${chains} chains per cycle)`);

const landed = [];       // round ids whose bet provably moved money
const resolved = [];     // round ids the settle call reported as resolved
let silent = 0;

for (let cycle = 1; landed.length < WANT_ROUNDS && silent < 2 && cycle <= 12; cycle++) {
  const armed = await post("/api/dev-test/updown-handover", { phase: "arm", leadSeconds: LEAD });
  if (armed.status !== 200 || !armed.json?.ok) { fail("1", `arm cycle ${cycle} returned ${armed.status}`); break; }
  // The endpoint reports the round it OPENED, by id — that is its documented contract, unlike
  // updown-advance whose reply lists rounds that just closed.
  const ids = (armed.json.out || []).map((o) => o.round?.id).filter(Boolean);
  if (!ids.length) { silent++; console.log(`  cycle ${cycle}: arm opened no round (silent ${silent}/2)`); continue; }

  let landedThisCycle = 0;
  for (const [k, id] of ids.entries()) {
    if (landed.length >= WANT_ROUNDS) break;
    const before = await walletNow();
    const side = (landed.length + k) % 2 === 0 ? "UP" : "DOWN";
    await page.goto(`${BASE}/updown/${id}?side=${side}`, { waitUntil: "load", timeout: 300000 });
    await page.waitForTimeout(1400);
    const gold = page.locator("button.btn-gold");
    if (!(await gold.count())) {
      // Say WHY, with the instants, rather than leaving a reader to guess at a lock.
      const phase = await page.evaluate(() => {
        const el = document.querySelector("[data-phase]");
        return el ? el.getAttribute("data-phase") : null;
      });
      console.log(`     ${id}: no commit button (data-phase=${phase}) — the round is past its lock; raise LEAD_SECONDS`);
      continue;
    }
    if (await gold.first().isDisabled()) {
      const why = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 140));
      console.log(`     ${id}: commit DISABLED — ${why}`);
      continue;
    }
    await gold.first().click();
    await page.waitForTimeout(2200);
    const after = await walletNow();
    // ⭐ THE ASSERTION IS THE MONEY, NOT THE CLICK.
    if (typeof before !== "number" || typeof after !== "number") {
      const note = [before, after].some((v) => v && typeof v === "object") ? "COMPACTED — refusing to parse a truncated figure" : "unreadable";
      console.log(`     ${id}: wallet ${note} (${JSON.stringify(before)} -> ${JSON.stringify(after)}) — not counted`);
      continue;
    }
    if (after >= before) { console.log(`     ${id}: wallet did NOT fall (${before} -> ${after}) — the bet did not land`); continue; }
    landed.push(id);
    landedThisCycle++;
    console.log(`     ${id} ${side}: wallet ${before} -> ${after} (−${before - after})`);
  }
  if (!landedThisCycle) { silent++; console.log(`  cycle ${cycle}: no bet landed (silent ${silent}/2)`); continue; }
  silent = 0;

  // wait out the lead, then settle — one advanceChain call closes this round and opens its heir
  const waitMs = LEAD * 1000 + 4000;
  console.log(`  cycle ${cycle}: ${landedThisCycle} bet(s) placed, waiting ${Math.round(waitMs / 1000)}s for the close…`);
  await sleep(waitMs);
  const settled = await post("/api/dev-test/updown-handover", { phase: "settle" });
  const closed = (settled.json?.out || []).map((o) => o.closed).filter(Boolean);
  const good = closed.filter((c) => c.resolvedAt);
  for (const c of good) if (landed.includes(c.id)) resolved.push(c.id);
  console.log(`  cycle ${cycle}: settle closed ${closed.length}, resolved ${good.length} — outcomes ${JSON.stringify(good.map((c) => c.outcome))}`);
  if (!good.length) fail("1", `cycle ${cycle} settled nothing — every round it closed came back unresolved, so no history was created`);
}

console.log(`  bets that moved money: ${landed.length} · rounds the settle call resolved: ${resolved.length}`);
if (silent >= 2) fail("1", `stopped after two silent cycles — ${landed.length} bets landed, not ${WANT_ROUNDS}`);
if (landed.length < WANT_ROUNDS) fail("1", `only ${landed.length} of ${WANT_ROUNDS} bets landed — a history under ${PER_PAGE + 1} rounds cannot show a second page`);
if (!resolved.length) fail("1", `no round the player bet on was ever RESOLVED — a history of unsettled rounds has no P&L to hold still`);

// ── §2 · the page turn ───────────────────────────────────────────────────────────────────────
console.log("\n§2 · the strip must not move when the list does");

const readHistory = async (p, pageNum) => {
  await p.goto(`${BASE}/updown/history${pageNum > 1 ? `?page=${pageNum}` : ""}`, { waitUntil: "load", timeout: 300000 });
  await p.waitForTimeout(1500);
  if (RED_SPILL) {
    // A faithful restoration of the pre-fix rule: nowrap back on the WRAPPER, at the doubled
    // specificity `.amount.amount` had, so the "staked → returned" pair is one unbreakable run.
    await p.addStyleTag({ content: ".amount, .amount.amount { white-space: nowrap !important; } .flex-wrap { flex-wrap: nowrap !important; }" });
    await p.waitForTimeout(200);
  }
  return p.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const strip = [...main.querySelectorAll("div")].find(
      (d) => /grid-cols-2/.test(String(d.className)) && /sm:grid-cols-3/.test(String(d.className)) && d.children.length === 3,
    );
    const out = { stripFound: !!strip, tiles: [], rows: [], cw: document.documentElement.clientWidth };
    if (strip) {
      const sr = strip.getBoundingClientRect();
      out.tiles = [...strip.children].map((t) => {
        const r = t.getBoundingClientRect();
        const lines = [...t.children].map((c) => (c.innerText || "").trim());
        return {
          label: lines[0] ?? "",
          figure: lines[1] ?? "",
          sub: lines.slice(2).join(" | "),
          w: Math.round(r.width), h: Math.round(r.height),
          left: Math.round(r.left), right: Math.round(r.right),
          spills: [...t.children].some((c) => c.getBoundingClientRect().right > r.right + 1),
          pastStrip: r.right > Math.round(sr.right) + 1,
          amounts: [...t.querySelectorAll(".amount")].map((a) => ({
            text: (a.innerText || "").trim(),
            w: Math.round(a.getBoundingClientRect().width),
            clipped: a.scrollWidth > a.clientWidth + 1,
          })),
        };
      });
    }
    out.rows = [...new Set([...main.querySelectorAll("a[href*='/updown/']")].map((a) => (a.getAttribute("href") || "").match(/udr_[a-z0-9]+/)?.[0]).filter(Boolean))];
    return out;
  });
};

const p1 = await readHistory(page, 1);
const p2 = await readHistory(page, 2);
if (!p1.stripFound) fail("2", "the P&L strip was not found on page 1 — nothing was measured, and that is not a pass");
if (!p2.stripFound) fail("2", "the P&L strip was not found on page 2 — nothing was measured, and that is not a pass");

if (p1.stripFound && p2.stripFound) {
  const sig = (r) => r.tiles.map((t) => `${t.label}=${t.figure.replace(/\s+/g, " ")}/${t.sub.replace(/\s+/g, " ")}`).join(" ;; ");
  console.log(`  page 1: ${sig(p1)}`);
  console.log(`  page 2: ${sig(p2)}`);
  console.log(`  page 1 lists ${p1.rows.length} rounds · page 2 lists ${p2.rows.length}`);

  if (sig(p1) !== sig(p2)) {
    fail("2", `the strip CHANGED when the player turned the page — D37 is back:\n        page 1: ${sig(p1)}\n        page 2: ${sig(p2)}`);
  }

  // ⛔ the anti-vacuity half — "identical" is also true of a one-page history and of all zeroes
  if (!p2.rows.length) blind.push(`2 page 2 listed no rounds — the history is not two pages deep, so the page turn was never exercised`);
  else if (p1.rows.join() === p2.rows.join()) blind.push(`2 both pages list the SAME rounds — there was no page turn to survive`);
  else console.log(`  ✓ the two pages list DIFFERENT rounds (${p1.rows.length} vs ${p2.rows.length}, no overlap: ${!p1.rows.some((x) => p2.rows.includes(x))})`);

  if (p1.rows.length && p1.rows.length !== PER_PAGE) blind.push(`2 page 1 listed ${p1.rows.length} rounds, not ${PER_PAGE} — the pager may not be engaged`);

  const zeroes = p1.tiles.every((t) => /^(TZS\s*0|0|—)$/.test(t.figure.trim()));
  if (zeroes) blind.push(`2 every figure in the strip is zero or an em-dash — a strip of zeroes agrees with itself on every page for the wrong reason, so this run proves nothing about the scope`);
  else console.log(`  ✓ the figures are non-zero, so agreeing across pages is a real result`);
}

// ── §3 · the sub-line fits ───────────────────────────────────────────────────────────────────
console.log("\n§3 · no tile spills, no figure is clipped, at every phone width");

for (const w of [320, 360, 412]) {
  const c = await b.newContext({ viewport: { width: w, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, storageState: await ctx.storageState() });
  await c.addCookies([{ name: "kp-locale", value: "sw", url: BASE }]);
  const p = await c.newPage();
  const r = await readHistory(p, 1);
  if (!r.stripFound) { fail("3", `${w}px the strip was not found — nothing was measured`); await c.close(); continue; }
  for (const [i, t] of r.tiles.entries()) {
    console.log(`  ${w}px tile#${i} "${t.label}" ${t.w}x${t.h} spans ${t.left}..${t.right}  ${t.amounts.map((a) => `${a.text}(${a.w}${a.clipped ? " CLIPPED" : ""})`).join(" ") || "—"}`);
    if (t.spills) fail("3", `${w}px tile#${i} ("${t.label}") has a child painting past its own right edge — that is D37's spill`);
    if (t.pastStrip) fail("3", `${w}px tile#${i} ("${t.label}") ends past the strip's own right edge`);
    if (t.right > r.cw + 1) fail("3", `${w}px tile#${i} ("${t.label}") ends at ${t.right}, past the ${r.cw}px viewport`);
    for (const a of t.amounts) if (a.clipped) fail("3", `${w}px tile#${i} figure "${a.text}" is clipped by its own box — money is never clipped (§5)`);
  }
  if (!r.tiles.some((t) => t.amounts.length)) blind.push(`3 ${w}px no .amount figure rendered in any tile — the very element D37 was about was not measured`);
  await c.close();
}

await b.close();

// ── verdict ──────────────────────────────────────────────────────────────────────────────────
const bySection = {};
for (const f of failures) (bySection[f[0]] ??= []).push(f.slice(2));
console.log("\n" + "=".repeat(92));
for (const s of ["1", "2", "3"]) {
  const n = (bySection[s] ?? []).length;
  console.log(`§${s} · ${n === 0 ? "ok" : `${n} failure(s)`}`);
  for (const line of bySection[s] ?? []) console.log("     " + line);
}
if (blind.length) {
  console.log("\n⚠️ BLIND — not measured, and must not be read as passes:");
  for (const x of blind) console.log("     " + x);
}

if (RED_SPILL) {
  const own = (bySection["3"] ?? []).length;
  const other = [...(bySection["1"] ?? []), ...(bySection["2"] ?? [])];
  if (!own) { console.log("\n⛔ BROKEN HARNESS: RED_SPILL reproduced nothing in §3. A control that cannot recreate its own defect certifies nothing."); process.exit(2); }
  if (other.length) { console.log(`\n⛔ BROKEN HARNESS: RED_SPILL also broke ${other.length} check(s) outside §3.`); process.exit(2); }
  console.log(`\n✅ RED CONTROL RED_SPILL broke §3 and only §3 — ${own} failure(s).`);
  process.exit(0);
}

const verdict = failures.length ? `${failures.length} FAILURES` : blind.length ? "GREEN, WITH BLIND SPOTS NAMED ABOVE" : "GREEN";
console.log(`\nUP & DOWN HISTORY STRIP — ${verdict} · ${landed.length} bets landed, ${resolved.length} rounds resolved`);
process.exit(failures.length ? 1 : 0);
