/**
 * THE SIGNED-IN HERO — landing v3 · WP14 part 2 (Ali's ruling R1; the delivery's wallet scenario §4a/§4c).
 *
 * §1 · THE RULE, DRIVEN — `tallyPicks` splits OPEN positions by one question (is the market still
 *      taking picks?), drops a row whose market is missing exactly as /positions does, and counts as
 *      PAID only what a win or a cash-out paid since Monday 00:00 EAT.
 * §2 · THE WEEK — `eatWeekStartMs` on both sides of the Sunday→Monday midnight in Dar es Salaam.
 * §3 · THE HERO'S CONTRACT — a failed read renders nothing (never a zero), no picks is one sentence,
 *      the pair is the Wallet's pair (same rung, same box), a frozen wallet gets no money buttons, and
 *      the trust lines stay above it.
 *
 * Run: npm run test:landing-mine
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const { tallyPicks, eatWeekStartMs } = await import("../src/lib/server/landing-picks.ts");

// ── 2 · the week (asserted first: §1 leans on it) ──────────────────────────────
{
  // Monday 2026-09-28 00:00 EAT is Sunday 2026-09-27 21:00 UTC.
  const monday = Date.parse("2026-09-27T21:00:00Z");
  ok("2: Monday 00:00 EAT starts its own week", eatWeekStartMs(monday) === monday, new Date(eatWeekStartMs(monday)).toISOString());
  ok("2: one second before it is still LAST week (Sunday 23:59:59 EAT)",
     eatWeekStartMs(monday - 1000) === monday - 7 * 86_400_000, new Date(eatWeekStartMs(monday - 1000)).toISOString());
  ok("2: a Wednesday afternoon belongs to that Monday", eatWeekStartMs(Date.parse("2026-09-30T12:00:00Z")) === monday);
  ok("2: ⛔ UTC's Monday is not the week — Monday 01:00 UTC is already Monday 04:00 EAT, same week",
     eatWeekStartMs(Date.parse("2026-09-28T01:00:00Z")) === monday);
}

// ── 1 · the rule ────────────────────────────────────────────────────────────────
{
  const now = Date.parse("2026-09-30T12:00:00Z");                  // Wednesday
  const weekStart = Date.parse("2026-09-27T21:00:00Z");
  const iso = (ms: number) => new Date(ms).toISOString();
  const markets = new Map([
    ["live", { status: "LIVE", selectionClosedAt: iso(now + 3_600_000), resolutionAt: iso(now + 7_200_000) }],
    ["cutoff-passed", { status: "LIVE", selectionClosedAt: iso(now - 60_000), resolutionAt: iso(now + 3_600_000) }],
    ["closed-early", { status: "CLOSED", selectionClosedAt: iso(now + 3_600_000), resolutionAt: iso(now + 7_200_000) }],
    ["no-cutoff", { status: "LIVE", selectionClosedAt: null, resolutionAt: iso(now + 60_000) }],
    ["settled", { status: "RESOLVED", selectionClosedAt: iso(now - 86_400_000), resolutionAt: iso(now - 3_600_000) }],
  ]);
  const row = (marketId: string, status: string, finalPayout: number | null = null, settledAt: string | null = null) =>
    ({ marketId, status, finalPayout, settledAt });
  const r = tallyPicks([
    row("live", "OPEN"), row("live", "OPEN"),
    row("no-cutoff", "OPEN"),                                         // resolutionAt is the cut-off
    row("cutoff-passed", "OPEN"), row("closed-early", "OPEN"), row("settled", "OPEN"),
    row("gone", "OPEN"),                                               // market missing → dropped
    row("settled", "WIN", 5_000, iso(weekStart + 1000)),
    row("settled", "CASHED_OUT", 1_200, iso(now - 1000)),
    row("settled", "WIN", 9_999, iso(weekStart - 1000)),              // last week
    row("settled", "LOSS", 0, iso(now - 1000)),
    row("settled", "VOID", 3_000, iso(now - 1000)),                    // a refund is not "paid"
    row("gone", "WIN", 7_777, iso(now - 1000)),                        // market missing → dropped
  ], markets, now);
  ok("1: open = OPEN on a market still taking picks (own cut-off, or resolutionAt when none)", r.open === 3, JSON.stringify(r));
  ok("1: awaiting = OPEN after the cut-off, or on a CLOSED/RESOLVED market", r.awaiting === 3, JSON.stringify(r));
  ok("1: ⭐ open + awaiting is /positions' Open count — the missing-market row is dropped by BOTH", r.open + r.awaiting === 6);
  ok("1: paid = a win's payout + a cash-out's proceeds THIS week (not last week, not a loss, not a refund)",
     r.paidThisWeekTzs === 6_200, String(r.paidThisWeekTzs));
  const none = tallyPicks([], markets, now);
  ok("1: no positions → all three zero (the hero turns that into one sentence, §3)",
     none.open === 0 && none.awaiting === 0 && none.paidThisWeekTzs === 0);
}

// ── 3 · the hero's contract ─────────────────────────────────────────────────────
{
  const hero = decomment(readFileSync(join(ROOT, "src/components/home/landing-hero.tsx"), "utf8"));
  const page = decomment(readFileSync(join(ROOT, "src/app/page.tsx"), "utf8"));
  const act = hero.slice(hero.indexOf("function SignedInAct"), hero.indexOf("function", hero.indexOf("function SignedInAct") + 10));
  ok("3: a signed-in player gets SignedInAct where a visitor gets the CTAs",
     /\{isAuthed \? \(\s*<SignedInAct t=\{t\} mine=\{mine \?\? null\} \/>/.test(hero));
  // ⭐ Re-pointed 2026-09-27 (hero v3, spec §9): the trust rows moved from the act block into the
  // INTRO, above the featured card (R7). Same intent — one list, rendered for a visitor AND a player,
  // before the player's block — now asserted where the list actually lives.
  const intro = hero.slice(hero.indexOf('<div className="kp-hero__intro">'), hero.indexOf("{featured && ("));
  const trustAt = hero.indexOf("<TrustLines t={t} locale={locale} rails={rails} />");
  ok("3: ⭐ the trust lines stay ABOVE it for a player too — one list, inside .kp-hero__intro, for everyone (R7, L21)",
     /<TrustLines t=\{t\} locale=\{locale\} rails=\{rails\} \/>/.test(intro) &&
     (hero.match(/<TrustLines /g) ?? []).length === 1 &&
     trustAt > 0 && trustAt < hero.indexOf("<SignedInAct"));
  ok("3: ⛔ a failed picks read renders nothing — the figures are gated on `picks`, not defaulted",
     /\{picks && \(noPicks \?/.test(act));
  ok("3: no picks at all is ONE sentence, not three zeros", /<p className="kp-mine__lead">\{t\.home\.picksNone\}<\/p>/.test(act));
  ok("3: …and at zero balance the empty-balance prompt says it alone (the two sentences said it twice)",
     /emptyWallet \? null : <p className="kp-mine__lead">\{t\.home\.picksNone\}/.test(act) && /const emptyWallet = !held && balance !== null && balance <= 0/.test(act));
  const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
  const sheet = decomment(readFileSync(join(ROOT, "src/components/layout/wallet-sheet.tsx"), "utf8"));
  /* ⭐ R17 (Ali, 2026-09-28) · THE SIGNED-IN HERO HOLDS NO MONEY CONTROL AND NO BALANCE, and the six
     assertions below are that absence made checkable. They replace "Deposit and Withdraw at the SAME
     size" and "equal columns BY CONSTRUCTION", which measured a gilt pair a funded player met on the same
     viewport as the header capsule AND the rail's coin — three money-in routes on the page whose job is
     the book, and the hero's was the only one that scrolls away.
     ⛔ AN ABSENCE ASSERTION NEEDS A REACHABILITY ASSERTION BESIDE IT, or "no Deposit here" is just a
     hole. So the control below proves the pair still EXISTS, at equal size, inside the Wallet the capsule
     opens — which is where V19 measures it and where R1 put it — and `test:wallet-reach` §7 owns it. */
  ok("3: ⛔ R17 · no money control in the signed-in hero — no Deposit, no Withdraw, at any width",
     !/\/wallet\/deposit/.test(act) && !/\/wallet\/withdraw/.test(act) && !/hero-deposit|hero-withdraw/.test(act));
  ok("3: ⛔ …and no balance figure either — the header capsule states it at every value, zero included (R10)",
     !/t\.wallet\.available/.test(act) && !/kp-mine__amt|kp-mine__bal\b/.test(act));
  ok("3-control: the pair it replaced IS still reachable — the Wallet the capsule opens keeps both sides",
     /\/wallet\/deposit/.test(sheet) && /\/wallet\/withdraw/.test(sheet));
  /* ⛔ CSS COMMENTS STRIPPED BEFORE MATCHING, AND THIS WENT RED FIRST. The retirement note in
     globals.css deliberately NAMES the classes it retired — that note is the record — so a matcher over
     raw text convicts its own explanation: red on a correct tree, while a real re-addition would slip
     past unnoticed. `scripts/failure-reasons.test.mts` §8c records the same trap and the same fix
     ("that exact defect has shipped here before"). */
  const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, "");
  ok("3: ⛔ the retired hero-wallet rules are DELETED from globals.css, not left unreferenced",
     !/\.kp-mine__(?:wallet|bal|amt|pair|act)\b/.test(cssCode) && /\.kp-mine__links \{/.test(cssCode));
  ok("3-control: …and that matcher can still SEE such a rule, so the line above is not simply blind",
     /\.kp-mine__(?:wallet|bal|amt|pair|act)\b/.test(".kp-mine__pair { display: grid; }")
     && !/\.kp-mine__(?:wallet|bal|amt|pair|act)\b/.test("/* .kp-mine__pair left with R17 */".replace(/\/\*[\s\S]*?\*\//g, "")));
  ok("3: ⛔ a frozen wallet still SAYS so, and is decided before the empty-balance prompt",
     act.indexOf("{held ? (") > 0 && act.indexOf("{held ? (") < act.indexOf("t.home.emptyBalance")
     && /kycGate\.frozenTitle/.test(act));
  ok("3: at zero the empty-balance prompt is ONE sentence, and it names a METHOD rather than a location",
     /emptyWallet \? \(/.test(act) && /<p className="kp-mine__lead">\{t\.home\.emptyBalance\}<\/p>/.test(act));
  ok("3: the money figure obeys the eye (<Cash>) — ONE figure now, the week's payout",
     (act.match(/<Cash>/g) ?? []).length === 1);
  ok("3: the block's two doors are the player's own positions and the RG limits — neither is money",
     /className="kp-mine__links"/.test(act) && /t\.home\.myPositions/.test(act) && /t\.footer\.setLimits/.test(act));
  ok("3: Set limits closes the block", /href="\/profile\/responsible-gambling"[\s\S]*t\.footer\.setLimits/.test(act));
  ok("3: ⛔ the page turns a FAILED read into null, never into a zero (B-1)",
     /landingPicks\(session\.userId, nowMs\)\.catch\(\(\) => null\)/.test(page) &&
     /balance: wallet === undefined \? null :/.test(page));
  ok("3: the hero's balance is the header's wallet row (db.wallet.findByUserId)", /db\.wallet\.findByUserId\(session\.userId\)/.test(page));
}

console.log(`\nlanding-mine: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
