/**
 * LIVE · UNIT C (#2c) — "can a player who has just seen a result tell, WITHOUT SCROLLING,
 * that the next round is open and bettable?"   `npm run qa:updown-next-playable`
 *
 *   LIVE_BASE=https://50pick.tz node scripts/live-updown-next-playable.mjs
 *
 * ── WHY THIS IS A DRIVE AND NOT A SUITE ──────────────────────────────────────────────────
 * The question is about a viewport, a scroll offset and a moment. `test:updown-handover`
 * proves the RULE that decides when to move a player; nothing in a node suite can say whether
 * the screen they land on offers them the game. So this puts real money on a real 3-minute
 * round on production, watches the real settle from fifteen viewports at once, lets the real
 * auto-advance carry each of them, and then measures ONE thing at `scrollY === 0`: is the bet
 * control inside the viewport, or below it?
 *
 * ── THE FIVE THINGS IT REFUSES TO GUESS ──────────────────────────────────────────────────
 *
 * 1 · ⛔ **BOTH SIDES ARE BACKED, BY TWO DIFFERENT PLAYERS.** Ali has asked twice for a real
 *      fleet rather than two personas, and the reason shows up here: a round with one side
 *      empty VOIDS and refunds, so the player sees a refund notice instead of a result and the
 *      screen under test is never rendered. UP and DOWN are staked by separate accounts.
 *
 * 2 · ⛔ **THE VIEWPORT HEIGHT IS NAMED IN EVERY CELL, because the answer depends on it.**
 *      "Below the fold" is meaningless without a fold. Each width is paired with a real device
 *      height (393×852 · 768×1024 · 1024×768 · 1280×800 · 1440×900) and the height is printed
 *      beside every verdict. A sweep that used one height for five widths would be comparing
 *      layouts against a fold none of those devices have.
 *
 * 3 · ⛔ **THE EMAIL BANNER IS MEASURED AND REPORTED SEPARATELY, NOT SUBTRACTED SILENTLY.**
 *      The QA fleet carries no email address, so every fleet frame also holds the 77px
 *      "Add an email address" nudge. ⚠️ It is NOT a fixture artefact: measured on production
 *      2026-08-24, **11 of 66 real players (17%) have no email** and see it too. So the run
 *      reports the gap BOTH ways — as photographed, and net of the banner — and says which
 *      population each number is about. Subtracting it silently would describe a screen 17% of
 *      players never see; ignoring it would describe one 83% never see.
 *
 * 4 · ⛔ **IT ASSERTS THE HANDOVER ACTUALLY MOVED THE PLAYER.** If the URL never changes, the
 *      cell is reported as NO-HANDOVER rather than measured on the settled page — the two are
 *      different screens and answering the question on the wrong one is worse than not
 *      answering it. ⚠️ There is a real case where it legitimately does not fire: `advanceChain`
 *      opens the successor when the predecessor SETTLES, and successions do sometimes skip a
 *      boundary. Seen on production 2026-08-24: round 2495 opened 07:27 and its successor
 *      opened **07:39**, not 07:31 — a four-minute window with no live round at all.
 *
 * 5 · ⛔ **`<html lang>` IS READ BACK PER CELL.** E-106 voided every SW/ZH screenshot ever taken
 *      in this campaign because nobody checked that the cookie had been honoured.
 *
 * 💰 IT SPENDS REAL MONEY: two bets at the chain's minimum stake, from two QA-fleet accounts,
 * on production. Prod minting and fleet play are pre-authorised (Ali, 2026-08-14). Both stakes
 * are reported, and so is which side won.
 */
import { mkdirSync } from "node:fs";
import { BASE, loginOnce, browser } from "./live/harness.mjs";
import { CLIP_PROBE } from "./live/clip.mjs";

const OUT = process.env.SHOT_DIR ?? ".50pick-shots/next-playable";
mkdirSync(OUT, { recursive: true });

/** Width paired with a REAL device height — see refusal 2. */
const CELLS = [
  { w: 393, h: 852 },   // iPhone 15/16 Pro
  { w: 768, h: 1024 },  // tablet portrait
  { w: 1024, h: 768 },  // tablet landscape / small laptop
  { w: 1280, h: 800 },  // laptop
  { w: 1440, h: 900 },  // laptop
];
const LOCALES = ["en", "sw", "zh"];

const WATCHER = process.env.WATCHER ?? "fleet:03";
const OTHER = process.env.OTHER ?? "fleet:04";
const ROUND = process.argv[2];
if (!ROUND) {
  console.error("usage: node scripts/live-updown-next-playable.mjs <openRoundId>");
  console.error("  find one:  node scripts/live/q.cjs <sql>   (a LIVE 3-minute round with >90s to its lock)");
  process.exit(2);
}

let pass = 0;
const fails = [];
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${label}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};
const die = (why) => { console.error(`\n🔴 PREMISE ABSENT — ${why}\n`); process.exit(2); };

/**
 * The bet control, the fold, and the banner — one read.
 *
 * ⛔ THE SIDE BUTTONS ARE FOUND STRUCTURALLY, NEVER BY THEIR WORDS. They are the two buttons
 * inside the section that holds the stake `[role="radiogroup"]`, whose `aria-label` carries the
 * em-dash the control composes (`"{side} — {asset} · {stake}"`). Matching on "Up"/"Juu"/"涨"
 * would put a copy of the lexicon in a driver, which is the defect `side-label.ts` exists to
 * prevent — and it would go quietly blind the day a translation changes.
 *
 * ⛔ AND IT IS A FUNCTION, NOT A STRING. See `live/clip.mjs`: a string `pageFunction` returns
 * `undefined` and every assertion below it would pass for the wrong reason (E-191).
 */
const READ = () => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const R = (el) => { const r = el.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height) }; };

  const rg = document.querySelector('[role="radiogroup"]');
  const section = rg ? rg.closest("section") : null;
  const sides = section
    ? [...section.querySelectorAll("button")]
        .filter((x) => (x.getAttribute("aria-label") || "").includes("—"))
        .map((x) => ({ ...R(x), name: x.getAttribute("aria-label"), disabled: x.disabled }))
    : [];

  // ⭐ THE COUNTDOWN POD — and this is the control that answers the question AS ASKED. Unit C
  // asks whether a player can TELL the next round is open and bettable, which is a different
  // (and lower) bar than being able to REACH the bet control. The pod carries the caption and
  // the live digits ("BETTING CLOSES IN 01:07" / "DAU LINAFUNGWA BAADA YA 01:03"), and it is
  // found by the kit's `.m-tick` class rather than by its words, so it cannot go blind on a
  // translation. Both facts are measured and reported separately; conflating them would let a
  // pass on one hide a failure on the other.
  const tick = document.querySelector(".m-tick");
  const pod = tick ? (tick.closest("section, div[class*='card'], div") || tick) : null;

  // The account nudge, when the viewer has no email on file. Found by its own landmark rather
  // than by its words: it is the only <a href="/profile"> banner above the page header.
  const banner = [...document.querySelectorAll("section, div")]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.top < 200 && r.height > 40 && r.height < 140; })
    .find((e) => e.querySelector('a[href*="/profile"], a[href*="/auth"]') && /@|email|barua|邮/i.test(e.innerText || ""));

  return {
    vw, vh,
    scrollY: window.scrollY,
    docH: document.documentElement.scrollHeight,
    sides,
    pod: pod ? { ...R(pod), text: (pod.innerText || "").replace(/\s+/g, " ").trim().slice(0, 60) } : null,
    bannerH: banner ? R(banner).h : 0,
    // The last-round strip the auto-advance supplies through `?from=` — its cost is the part of
    // the gap the handover itself is responsible for.
    hasFromStrip: /[?&]from=/.test(location.search),
    signedOut: !!document.querySelector('a[href*="/auth/login"]'),
  };
};

const b = (await browser()).b;

/**
 * ⛔ BOTH SIGN-INS HAPPEN BEFORE ANYTHING IS TIMED, and that is not tidiness — it is the only
 * way the bets can land at all.
 *
 * 📊 MEASURED ON PRODUCTION 2026-08-24 over 5,479 rounds in three days: a round is CREATED a
 * median **91.4 seconds after its own `opensAt`**, because `advanceChain` opens round N+1 only
 * when round N SETTLES, and settlement waits on the dated one-minute bar. So a "3-minute" round
 * exists, and is reachable by a player, for **88.6 of its 180 advertised seconds — 49.2%**.
 * (5m 69.5% · 10m 84.8% · 15m 89.8% · 30m 92.4% · 60m 96.2%.)
 *
 * ⚠️ A sign-in inside that window costs it. `loginOnce` is a real navigation plus a form post;
 * two of them, plus two page loads and two clicks, does not fit in 88 seconds reliably. Hoisted
 * here, the timed part is only: load the round, click a side, twice.
 */
const SESSIONS = new Map();
for (const who of [WATCHER, OTHER]) SESSIONS.set(who, await loginOnce(b, who));

// ── ① BOTH SIDES BACKED, BY TWO DIFFERENT PLAYERS ────────────────────────────────────────
/** Place one real bet through the real controls. Returns the accessible name of the side taken. */
async function placeBet(who, sideIndex) {
  const state = SESSIONS.get(who);
  const ctx = await b.newContext({ storageState: state, viewport: { width: 1440, height: 1000 } });
  await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/updown/${ROUND}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3500);
    const before = await page.evaluate(READ);
    if (before.signedOut) die(`${who} is not signed in — every frame below would be a guest frame (E-187)`);
    if (before.sides.length !== 2) die(`${who} sees ${before.sides.length} side control(s) on ${ROUND}, not 2 — the round is not bettable, so nothing can be staked`);
    const btn = page.locator(`section:has([role="radiogroup"]) button[aria-label*="—"]`).nth(sideIndex);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(4000);
    return before.sides[sideIndex].name;
  } finally { await ctx.close(); }
}

console.log(`\nUNIT C · the next round, seen without scrolling — ${BASE}/updown/${ROUND}\n`);
console.log("── ① both sides backed, by two different players ──");
const upName = await placeBet(WATCHER, 0);
console.log(`  ${WATCHER} took  ${upName}`);
const downName = await placeBet(OTHER, 1);
console.log(`  ${OTHER} took  ${downName}`);

// ── ② FIFTEEN VIEWPORTS WATCH THE SAME REAL SETTLE ───────────────────────────────────────
const state = SESSIONS.get(WATCHER);
console.log(`\n── ② ${CELLS.length} widths × ${LOCALES.length} locales watch the settle as ${WATCHER} ──`);

const cells = [];
for (const locale of LOCALES) {
  for (const { w, h } of CELLS) {
    const ctx = await b.newContext({ storageState: state, viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/updown/${ROUND}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(1500);
    const lang = (await page.getAttribute("html", "lang").catch(() => null)) ?? "";
    cells.push({ tag: `${locale}-${w}x${h}`, locale, w, h, ctx, page, lang, startedAt: page.url() });
  }
}
for (const c of cells) ok(`${c.tag} · mounted in ${c.locale}`, c.lang.toLowerCase().startsWith(c.locale), `<html lang="${c.lang}">`);

// ⛔ THE WATCHERS MUST BE MOUNTED BEFORE THE SETTLE. The auto-advance fires only on an OBSERVED
// `unsettled → settled` transition — a page that arrives already settled will never navigate,
// by design, so a player opening an old round from their history is not thrown forward.
console.log(`\n── ③ waiting for the real settle (a 3-minute round settles ~90s after its close) ──`);
const DEADLINE = Date.now() + 12 * 60_000;
const moved = new Set();
while (moved.size < cells.length && Date.now() < DEADLINE) {
  for (const c of cells) {
    if (moved.has(c.tag)) continue;
    if (!c.page.url().includes(ROUND)) { moved.add(c.tag); c.landedAt = c.page.url(); }
  }
  if (moved.size < cells.length) await new Promise((r) => setTimeout(r, 3000));
}
console.log(`  ${moved.size}/${cells.length} cells were carried by the handover`);

// ── ④ AT scrollY = 0, IS THE BET CONTROL IN THE VIEWPORT? ────────────────────────────────
console.log(`\n── ④ the question, answered from the frames ──`);
const rows = [];
for (const c of cells) {
  try {
    if (!moved.has(c.tag)) {
      ok(`${c.tag} · the handover carried the player forward`, false, `still on ${ROUND} after 12 min — no successor, or the advance did not fire`);
      await c.page.screenshot({ path: `${OUT}/${c.tag}-NO-HANDOVER.png` });
      continue;
    }
    await c.page.evaluate(() => window.scrollTo(0, 0));
    await c.page.waitForTimeout(1200);
    const lang = (await c.page.getAttribute("html", "lang").catch(() => null)) ?? "";
    ok(`${c.tag} · still in ${c.locale} after the advance`, lang.toLowerCase().startsWith(c.locale), `<html lang="${lang}">`);
    const m = await c.page.evaluate(READ);
    const clipped = await c.page.evaluate(CLIP_PROBE, "body");

    ok(`${c.tag} · the successor is BETTABLE at all`, m.sides.length === 2 && m.sides.every((s) => !s.disabled),
      `${m.sides.length} side control(s)${m.sides.some((s) => s.disabled) ? ", one disabled" : ""}`);
    ok(`${c.tag} · no unreachable control`, clipped.length === 0, clipped.join(" | "));

    // ⭐ THE QUESTION AS ASKED — can the player TELL, without scrolling, that the next round is
    // open and bettable? That is the live countdown, not the bet control. Separate assertion,
    // separate verdict; the two answers are genuinely different and both are worth having.
    ok(`${c.tag} · the "betting closes in" clock is above the fold`,
      !!m.pod && m.pod.b <= m.vh, m.pod ? `pod ${m.pod.t}..${m.pod.b}, fold ${m.vh} — "${m.pod.text}"` : "no countdown pod found");

    if (m.sides.length === 2) {
      const top = Math.min(...m.sides.map((s) => s.t));
      const bottom = Math.max(...m.sides.map((s) => s.b));
      const visible = bottom <= m.vh;
      const gapRaw = top - m.vh;               // >0 = this far BELOW the fold
      const gapNet = top - m.bannerH - m.vh;   // what the 83% with an email address see
      rows.push({ tag: c.tag, vh: m.vh, top, bottom, visible, gapRaw, gapNet, bannerH: m.bannerH, from: m.hasFromStrip, docH: m.docH });
      ok(`${c.tag} · the bet control is inside the viewport without scrolling`, visible,
        `top ${top}, bottom ${bottom}, fold ${m.vh}${m.bannerH ? ` (banner ${m.bannerH}px)` : ""}`);
    }
    await c.page.screenshot({ path: `${OUT}/${c.tag}.png` });
  } catch (e) {
    ok(`${c.tag} · measured`, false, e.message.split("\n")[0].slice(0, 90));
  }
}
for (const c of cells) await c.ctx.close();
await b.close();

console.log(`\n── the answer, per cell (scrollY = 0) ──`);
console.log(`  ${"cell".padEnd(14)} ${"fold".padStart(5)} ${"control".padStart(8)} ${"gap".padStart(6)} ${"net".padStart(6)}  banner  from-strip`);
for (const r of rows) {
  console.log(`  ${r.tag.padEnd(14)} ${String(r.vh).padStart(5)} ${String(r.top).padStart(8)} ${String(r.gapRaw > 0 ? `+${r.gapRaw}` : r.gapRaw).padStart(6)} ${String(r.gapNet > 0 ? `+${r.gapNet}` : r.gapNet).padStart(6)}  ${String(r.bannerH).padStart(6)}  ${r.from ? "yes" : "no"}   ${r.visible ? "VISIBLE" : "BELOW THE FOLD"}`);
}
console.log(`\n📸 ${OUT} — ⛔ OPEN THEM. The measurements say where the control is; only the image says whether the screen offers the game.`);
console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length ? 1 : 0);
