/**
 * E-37 / E-43 · THE UP & DOWN DAILY DIGEST — the guard.
 *
 * ⚠️ PROVEN RED FIRST. Before `updown-digest.ts` existed, §1 could not even
 * import; with the module present but the refunds left ungated, §5 fails 3. Each
 * negative below was broken on purpose and observed failing — the list of what was
 * broken and what it printed is in `docs/LIVE-QA-CAMPAIGN.md` §6x.
 *
 * WHAT IT MEASURES, and why each one is here rather than assumed:
 *
 *  1 · The digest exists and is reachable at all. The finding it closes was
 *      literally "the only two occurrences of 'daily digest' in src/ are the two
 *      comments promising it", so "the function is exported" is a real assertion.
 *  2 · The EAT day arithmetic, against hand-computed UTC instants. A digest that
 *      bins by the wrong day tells a player about someone else's Tuesday.
 *  3 · The aggregate counts and sums what settled INSIDE the window and nothing
 *      else — including the boundary rows at both ends, which is where an
 *      off-by-one lives.
 *  4 · THE COPY. This is the compliance half: a losing day must say "lost" with
 *      its own figure in all three languages, and must never present itself as a
 *      net number or as money returned. The old comment claimed exactly this
 *      about a system that did not exist.
 *  5 · E-43 — every per-round Up & Down message is behind the suppression
 *      predicate, refunds included. Asserted against the SOURCE, because the
 *      failure mode was a call site nobody had gated, not a wrong output.
 *  6 · IDEMPOTENCE, driven: run the digest twice over the same day and the second
 *      run must send nothing. This is the property that makes a 15-minute sweep
 *      safe, and the only honest way to test it is to actually run it twice.
 *  7 · The deep link the digest sends actually filters the page it points at.
 *
 * ⛔ It does NOT assert "a notification row exists" and stop there. A row that
 * says the wrong thing about someone's money is worse than no row.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { readFileSync } from "node:fs";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { positionStore, marketStore } from "../src/lib/server/market-dal.ts";
import {
  runUpDownDailyDigest, digestCopy, digestHref, type DigestLine,
} from "../src/lib/server/updown-digest.ts";
import { eatDayKey, eatDayStartMs, eatDayWindow, isInEatDay } from "../src/lib/eat-day.ts";
import type { StoredMarket, StoredPosition } from "../src/lib/server/market-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) pass++;
  else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

const nowIso = new Date().toISOString();
let seq = 0;
async function mkUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25579${String(++seq).padStart(7, "0")}`, email: `${id}@test.tz`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 100_000, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: nowIso, updatedAt: nowIso,
  } as StoredWallet);
}

async function mkMarket(id: string, productLine: "MARKET" | "UPDOWN"): Promise<void> {
  await marketStore.set({
    id, titleEn: `${id} title`, titleSw: `${id} sw`, titleZh: null,
    category: "OTHER", sourceUrl: "https://example.tz", resolutionCriterion: "n/a",
    resolutionAt: nowIso, selectionClosedAt: null, status: "RESOLVED",
    yesPool: 0, noPool: 0, predictorCount: 0, feeSnapshot: null,
    resolvedOutcome: "YES", resolutionStage1By: null, resolutionStage1At: null,
    resolutionStage2By: null, resolutionStage2At: null, resolutionEvidence: null,
    settledAt: nowIso, createdAt: nowIso, updatedAt: nowIso, productLine,
  } as unknown as StoredMarket);
}

let pseq = 0;
async function mkPosition(o: {
  userId: string; marketId: string; status: "WIN" | "LOSS" | "VOID" | "OPEN";
  stake: number; finalPayout: number | null; settledAt: string | null;
}): Promise<void> {
  await positionStore.set({
    id: `pos_${++pseq}`, userId: o.userId, marketId: o.marketId, side: "YES",
    stake: o.stake, bonusStakeTzs: 0, potentialPayout: o.stake * 1.8,
    status: o.status, finalPayout: o.finalPayout,
    placedAt: nowIso, settledAt: o.settledAt, idempotencyKey: null,
  } as unknown as StoredPosition);
}

// ── 1 · The thing exists ──────────────────────────────────────────────────────
section("1 · the digest exists (E-37: it did not, and two comments promised it)");
ok("runUpDownDailyDigest is exported", typeof runUpDownDailyDigest === "function");
ok("digestCopy is exported so the COPY can be asserted without sending",
  typeof digestCopy === "function");

const svc = readFileSync(new URL("../src/lib/server/updown-digest.ts", import.meta.url), "utf8");
ok("the digest moves no money", !/wallet\.adjust|withMoneyTx|postLedgerEntries|txn\.create/.test(svc),
  "a money write appeared in the digest — it reads settled positions, it does not settle them");

// ── 2 · EAT day arithmetic ────────────────────────────────────────────────────
section("2 · East Africa day boundaries (UTC+3, no DST)");
// 2026-08-02 21:00 UTC is 2026-08-03 00:00 EAT — the first instant of the 3rd.
ok("21:00 UTC belongs to the NEXT EAT day", eatDayKey(Date.parse("2026-08-02T21:00:00.000Z")) === "2026-08-03",
  eatDayKey(Date.parse("2026-08-02T21:00:00.000Z")));
ok("20:59 UTC is still the same EAT day", eatDayKey(Date.parse("2026-08-02T20:59:59.999Z")) === "2026-08-02",
  eatDayKey(Date.parse("2026-08-02T20:59:59.999Z")));
ok("an EAT day starts at 21:00 UTC the day before",
  new Date(eatDayStartMs("2026-08-02")).toISOString() === "2026-08-01T21:00:00.000Z",
  new Date(eatDayStartMs("2026-08-02")).toISOString());
ok("the deep link carries the day", digestHref("2026-08-02") === "/updown/history?day=2026-08-02");

// ── 3 · The aggregate ─────────────────────────────────────────────────────────
section("3 · the aggregate counts the window, the whole window and nothing else");
await mkUser("dg_a");
await mkUser("dg_b");
await mkMarket("mkt_ud", "UPDOWN");
await mkMarket("mkt_poll", "MARKET");

const DAY = "2026-08-02";
const from = eatDayStartMs(DAY);                       // 2026-08-01T21:00:00Z
const to = from + 24 * 60 * 60 * 1000;                 // 2026-08-02T21:00:00Z
const at = (ms: number) => new Date(ms).toISOString();

// dg_a — a real mixed day: 2 wins, 1 loss, 1 refund.
await mkPosition({ userId: "dg_a", marketId: "mkt_ud", status: "WIN",  stake: 5_000, finalPayout: 8_700, settledAt: at(from) });            // FIRST instant — inclusive
await mkPosition({ userId: "dg_a", marketId: "mkt_ud", status: "WIN",  stake: 5_000, finalPayout: 8_700, settledAt: at(from + 3_600_000) });
await mkPosition({ userId: "dg_a", marketId: "mkt_ud", status: "LOSS", stake: 5_000, finalPayout: 0,     settledAt: at(from + 7_200_000) });
await mkPosition({ userId: "dg_a", marketId: "mkt_ud", status: "VOID", stake: 2_000, finalPayout: 2_000, settledAt: at(to - 1) });          // LAST instant — inclusive
// …and four rows that must NOT be counted, one per exclusion rule.
await mkPosition({ userId: "dg_a", marketId: "mkt_ud",   status: "WIN",  stake: 9_999, finalPayout: 9_999, settledAt: at(to) });            // the next day starts here
await mkPosition({ userId: "dg_a", marketId: "mkt_ud",   status: "WIN",  stake: 9_999, finalPayout: 9_999, settledAt: at(from - 1) });      // the previous day
await mkPosition({ userId: "dg_a", marketId: "mkt_ud",   status: "OPEN", stake: 9_999, finalPayout: null,  settledAt: null });              // not settled
await mkPosition({ userId: "dg_a", marketId: "mkt_poll", status: "WIN",  stake: 9_999, finalPayout: 9_999, settledAt: at(from + 60_000) }); // a POLL, not a round
// dg_b — an all-refund day, the E-43 shape.
await mkPosition({ userId: "dg_b", marketId: "mkt_ud", status: "VOID", stake: 1_000, finalPayout: 1_000, settledAt: at(from + 60_000) });
await mkPosition({ userId: "dg_b", marketId: "mkt_ud", status: "VOID", stake: 1_000, finalPayout: 1_000, settledAt: at(from + 120_000) });

const totals = await positionStore.dailyTotalsByUser({
  fromIso: at(from), toIso: at(to), productLine: "UPDOWN",
});
const a = totals.find((r) => r.userId === "dg_a");
const b = totals.find((r) => r.userId === "dg_b");
ok("both players appear, and only them", totals.length === 2, `${totals.length}: ${totals.map((r) => r.userId).join(",")}`);
ok("the window is inclusive at the start and exclusive at the end", a?.rounds === 4, `rounds=${a?.rounds}`);
ok("wins counted", a?.wins === 2, `wins=${a?.wins}`);
ok("losses counted", a?.losses === 1, `losses=${a?.losses}`);
ok("refunds counted", a?.refunds === 1, `refunds=${a?.refunds}`);
ok("staked sums every settled round", a?.staked === 17_000, `staked=${a?.staked}`);
ok("returned sums winnings AND refunds, never the lost stake", a?.returned === 19_400, `returned=${a?.returned}`);
ok("won payout is WIN rows only", a?.wonPayout === 17_400, `wonPayout=${a?.wonPayout}`);
ok("lost stake is LOSS rows only", a?.lostStake === 5_000, `lostStake=${a?.lostStake}`);
ok("refunded is VOID rows only", a?.refundedStake === 2_000, `refundedStake=${a?.refundedStake}`);
ok("a poll on the same day is NOT in the Up & Down digest", (a?.staked ?? 0) < 20_000 && a?.rounds === 4);
ok("an all-refund day is still a day", b?.rounds === 2 && b?.refunds === 2 && b?.wins === 0);

// ── 4 · The copy — the compliance half ────────────────────────────────────────
section("4 · what it SAYS (LCCP: a loss is stated plainly, in all three languages)");

const line = (t: Partial<DigestLine["totals"]> & { staked: number; returned: number }): DigestLine => ({
  userId: "dg_a", dayKey: DAY,
  totals: {
    userId: "dg_a", rounds: 0, wins: 0, losses: 0, refunds: 0,
    wonPayout: 0, lostStake: 0, refundedStake: 0, ...t,
  } as DigestLine["totals"],
  net: t.returned - t.staked,
});

const losing = digestCopy(line({ rounds: 4, wins: 1, losses: 3, wonPayout: 8_700, lostStake: 15_000, staked: 20_000, returned: 8_700 }));
ok("a losing day says LOST in the title, in English", /lost/i.test(losing.titleEn), losing.titleEn);
ok("…and names the amount", losing.titleEn.includes("11,300"), losing.titleEn);
ok("…in Swahili", /umepoteza/i.test(losing.titleSw), losing.titleSw);
ok("…and in Chinese", /亏损/.test(losing.titleZh), losing.titleZh);
ok("a losing day never dresses itself as money returned",
  !/returned|refunded|umerudishiwa/i.test(losing.titleEn + losing.titleSw), losing.titleEn);
ok("the loss keeps its OWN count and figure in the body, not just a net",
  losing.bodyEn.includes("lost 3") && losing.bodyEn.includes("15,000"), losing.bodyEn);
ok("…in Swahili", losing.bodySw.includes("umepoteza 3") && losing.bodySw.includes("15,000"), losing.bodySw);
ok("…and in Chinese", /输 3 轮/.test(losing.bodyZh) && losing.bodyZh.includes("15,000"), losing.bodyZh);

const winning = digestCopy(line({ rounds: 2, wins: 2, wonPayout: 17_400, staked: 10_000, returned: 17_400 }));
ok("a winning day says so, with the amount", /up/i.test(winning.titleEn) && winning.titleEn.includes("7,400"), winning.titleEn);
ok("…and does not invent a loss line", !/lost/i.test(winning.bodyEn), winning.bodyEn);

const allRefund = digestCopy(line({ rounds: 2, refunds: 2, refundedStake: 2_000, staked: 2_000, returned: 2_000 }));
ok("an all-refund day names the refund (E-43: this is now the digest's job, not a per-round message)",
  /refunded/i.test(allRefund.titleEn) && allRefund.titleEn.includes("2,000"), allRefund.titleEn);
ok("…and does not claim a win or a loss", !/(you are up|you lost)/i.test(allRefund.titleEn), allRefund.titleEn);

for (const [name, c] of [["losing", losing], ["winning", winning], ["all-refund", allRefund]] as const) {
  ok(`${name}: all three languages present and distinct`,
    !!c.titleEn && !!c.titleSw && !!c.titleZh && c.titleEn !== c.titleZh &&
    !!c.bodyEn && !!c.bodySw && !!c.bodyZh && c.bodyEn !== c.bodySw);
  ok(`${name}: states a figure a player can check`, /\d/.test(c.titleEn + c.bodyEn));
  ok(`${name}: the day is in the deep link`, c.href === `/updown/history?day=${DAY}`, c.href);
}
ok("the day reads in the reader's own language",
  digestCopy(line({ rounds: 1, wins: 1, wonPayout: 2, staked: 1, returned: 2 })).bodySw.startsWith("2 Ago"),
  digestCopy(line({ rounds: 1, wins: 1, wonPayout: 2, staked: 1, returned: 2 })).bodySw.slice(0, 20));

// ── 5 · E-43 · every per-round message is behind the predicate ────────────────
section("5 · E-43 — no Up & Down outcome escapes the suppression (refunds included)");
const ms = readFileSync(new URL("../src/lib/server/market-service.ts", import.meta.url), "utf8");
// Anchor on the call, then look BACK for the gate. This is a source assertion on
// purpose: the defect was a call site nobody had gated, which produces no wrong
// output at all until a real round voids on production.
for (const emitter of ["notifyRefund", "notifyOneSidedRefund", "notifyWin", "notifyLoss", "notifyBetPlaced"]) {
  const callIdx = [...ms.matchAll(new RegExp(`^\\s*${emitter}\\(`, "gm"))].map((m) => m.index ?? -1);
  const gated = callIdx.filter((i) => {
    // The nearest enclosing 400 characters must contain the predicate. Every one
    // of these sits directly inside its `if (!perEventNotificationsSuppressed(m))`.
    const before = ms.slice(Math.max(0, i - 400), i);
    return /!perEventNotificationsSuppressed\(/.test(before);
  });
  // `notifyRefund` has one legitimately ungated caller: the orphaned-position
  // repair, which has NO market to ask (`marketId: ""`) and is a boot-time data
  // repair, not a round outcome. Named explicitly so the exception is a decision.
  const allowedUngated = emitter === "notifyRefund" ? 1 : 0;
  ok(`${emitter}: every round call site is gated (${gated.length}/${callIdx.length}, ${allowedUngated} exempt)`,
    callIdx.length - gated.length === allowedUngated,
    `ungated=${callIdx.length - gated.length}`);
}
// ⚠️ RE-ANCHORED 2026-08-15: the title is `localizedText("Orphaned position")` now — every
// player emitter carries all three languages (§7.2c), so the bare-string form is gone. The
// assertion is unchanged in substance: the ONE ungated `notifyRefund` must be the orphan
// repair, and it is identified by that phrase rather than by its position in the file.
ok("the one exempt notifyRefund is the orphan repair, not a round",
  /notifyRefund\(p\.userId, \{ stake: p\.stake, marketTitle: localizedText\("Orphaned position"\)/.test(ms));

// ── 6 · Idempotence, DRIVEN ───────────────────────────────────────────────────
section("6 · run it twice — the second run must send nothing");
// `now` is placed inside 2026-08-03 EAT and past the close grace, so the target
// day is 2026-08-02 — the day fixtures were written into.
const NOW = Date.parse("2026-08-03T00:00:00.000Z"); // 03:00 EAT on the 3rd

const dry = await runUpDownDailyDigest({ nowMs: NOW, dryRun: true });
ok("the run targets the last CLOSED EAT day", dry.dayKey === DAY, `${dry.dayKey}`);
ok("dry run finds both players", dry.candidates === 2, `${dry.candidates}`);
ok("dry run sends nothing", dry.sent === 0 && (await db.notification.findByUser("dg_a", 50)).length === 0);

const first = await runUpDownDailyDigest({ nowMs: NOW });
ok("first run sends one digest per player", first.sent === 2, `sent=${first.sent}`);
const inbox = await db.notification.findByUser("dg_a", 50);
ok("exactly ONE notification reached the player", inbox.length === 1, `${inbox.length}`);
ok("it is the digest kind", inbox[0]?.kind === "ROUND_RESULT", inbox[0]?.kind);
ok("it says what the aggregate measured", inbox[0]?.bodyEn.includes("4 rounds") === true, inbox[0]?.bodyEn);
ok("its net is +2,400 (17,000 staked → 19,400 back)", inbox[0]?.titleEn.includes("2,400") === true, inbox[0]?.titleEn);

const second = await runUpDownDailyDigest({ nowMs: NOW });
ok("the SECOND run sends nothing", second.sent === 0, `sent=${second.sent}`);
ok("…and says so, rather than silently doing nothing", second.alreadySent === 2, `alreadySent=${second.alreadySent}`);
ok("still exactly one notification in the inbox", (await db.notification.findByUser("dg_a", 50)).length === 1);

// A run inside the grace window must not read a day that may still be committing.
const inGrace = await runUpDownDailyDigest({ nowMs: eatDayStartMs("2026-08-04") + 60_000 });
ok("a run inside the close grace is skipped", inGrace.skipped === "grace" && inGrace.sent === 0, `${inGrace.skipped}`);

// ── 7 · the deep link actually filters the page it points at ──────────────────
section("7 · the link the digest sends is not a lie");
//
// ⚠️ THIS SECTION WAS REWRITTEN AFTER IT FAILED TO FAIL. The first version asserted
// that the page's SOURCE contained `dayWindow` and `filter(` — and the RED harness
// duly broke the filter while leaving both words in place, and the suite stayed
// green. A pattern that matches the text around a defect is not a test of the
// defect. The predicate now lives in one shared module and is DRIVEN here with the
// boundary cases; the page is only asserted to IMPORT it rather than grow its own.
ok("the first instant of the day is in it", isInEatDay("2026-08-01T21:00:00.000Z", "2026-08-02"));
ok("one millisecond earlier is not", !isInEatDay("2026-08-01T20:59:59.999Z", "2026-08-02"));
ok("the last instant of the day is in it", isInEatDay("2026-08-02T20:59:59.999Z", "2026-08-02"));
ok("the first instant of the NEXT day is not", !isInEatDay("2026-08-02T21:00:00.000Z", "2026-08-02"));
ok("midday is in it", isInEatDay("2026-08-02T09:00:00.000Z", "2026-08-02"));
ok("a null timestamp is in no day", !isInEatDay(null, "2026-08-02"));
ok("a junk timestamp is in no day", !isInEatDay("not-a-date", "2026-08-02"));
ok("a junk day key filters nothing rather than throwing", eatDayWindow("lol") === null);
ok("the window and the digest's own bounds are the SAME arithmetic",
  eatDayWindow(DAY)?.fromMs === eatDayStartMs(DAY));

const histPage = readFileSync(new URL("../src/app/updown/history/page.tsx", import.meta.url), "utf8");
ok("/updown/history reads the day param", /searchParams/.test(histPage) && /\bday\b/.test(histPage));
ok("…and filters with the SHARED predicate, not a copy of the offset",
  /isInEatDay\(/.test(histPage) && /from "@\/lib\/eat-day"/.test(histPage));
ok("…and has not re-derived the EAT offset locally",
  !/3 \* 60 \* 60 \* 1000/.test(histPage), "the page grew its own timezone maths again");
ok("…and offers a way back to every day", /udAllDays/.test(histPage));
// 🔴 CAUGHT ON PRODUCTION by `live-updown-digest.mjs`, not by reasoning here. The page
// validated the param for the CHIP but filtered on the RAW one, so `?day=lol` matched
// no round, hid every card, and — because the chip only renders for a valid day —
// showed "no rounds" with nothing saying what had been filtered and no way to clear it.
// One typo, one dead end. The filter, the chip and the empty state must all key off the
// SAME validated value.
ok("one validated day drives the filter, the chip AND the empty state",
  /const dayKey = dayWindow \? rawDay : null/.test(histPage) &&
  !/isInEatDay\([^)]*rawDay\)/.test(histPage),
  "the page filters on the raw query param again — `?day=lol` will empty the page");

console.log(`\nupdown-digest (E-37 + E-43): ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
