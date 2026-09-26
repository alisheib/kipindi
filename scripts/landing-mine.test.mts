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
  ok("3: ⭐ the trust lines stay ABOVE it for a player too (R4(5), L21)",
     hero.indexOf("<TrustLines t={t} />") > 0 && hero.indexOf("<TrustLines t={t} />") < hero.indexOf("<SignedInAct"));
  ok("3: ⛔ a failed picks read renders nothing — the figures are gated on `picks`, not defaulted",
     /\{picks && \(noPicks \?/.test(act));
  ok("3: no picks at all is ONE sentence, not three zeros", /<p className="kp-mine__lead">\{t\.home\.picksNone\}<\/p>/.test(act));
  ok("3: …and at zero balance the empty-balance prompt says it alone (the two sentences said it twice)",
     /emptyWallet \? null : <p className="kp-mine__lead">\{t\.home\.picksNone\}/.test(act) && /const emptyWallet = !held && balance !== null && balance <= 0/.test(act));
  const link = (href: string) => { const at = act.indexOf(`href="${href}"`); return at < 0 ? "" : act.slice(act.lastIndexOf("<Link", at), act.indexOf(">", at)); };
  const dep = link("/wallet/deposit"), wd = link("/wallet/withdraw");
  const geom = (s: string) => (s.match(/className="btn (?:gilt-metal|btn-ghost) ([^"]+)"/) ?? [])[1] ?? null;
  ok("3: ⭐ Deposit and Withdraw at the SAME size — the Wallet's pair (V19)", !!dep && !!wd && geom(dep) === geom(wd), `${geom(dep)} vs ${geom(wd)}`);
  const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
  ok("3: ⭐ …and equal columns BY CONSTRUCTION — minmax(0, 1fr); a bare 1fr grows to fit the longer label",
     /\.kp-mine__pair \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/.test(css));
  ok("3: ⛔ a frozen wallet gets no money buttons — `held` is decided BEFORE the pair",
     act.indexOf("{held ? (") > 0 && act.indexOf("{held ? (") < act.indexOf('href="/wallet/withdraw"'));
  ok("3: at zero: the empty-balance prompt with Deposit, and no Withdraw", (() => {
    const empty = act.slice(act.indexOf("kp-mine__empty"), act.indexOf("</div>\n      ) : null}"));
    return /t\.home\.emptyBalance/.test(empty) && /href="\/wallet\/deposit"/.test(empty) && !/\/wallet\/withdraw/.test(empty);
  })());
  ok("3: the money figures obey the eye (<Cash>)", (act.match(/<Cash>/g) ?? []).length === 2);
  ok("3: Set limits closes the block", /href="\/profile\/responsible-gambling"[\s\S]*t\.footer\.setLimits/.test(act));
  ok("3: ⛔ the page turns a FAILED read into null, never into a zero (B-1)",
     /landingPicks\(session\.userId, nowMs\)\.catch\(\(\) => null\)/.test(page) &&
     /balance: wallet === undefined \? null :/.test(page));
  ok("3: the hero's balance is the header's wallet row (db.wallet.findByUserId)", /db\.wallet\.findByUserId\(session\.userId\)/.test(page));
}

console.log(`\nlanding-mine: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
