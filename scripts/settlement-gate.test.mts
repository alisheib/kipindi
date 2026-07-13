/**
 * F11 — THE SETTLEMENT GATE. The suite that would have caught the original lie.
 *
 * Before this, `objectionsClosedAt` was decoration: resolveMarket stamped a 24h
 * "objection window" and then paid the winners on the very next line, inside the
 * same function. A player "objecting" was arguing about money that had already
 * left the pool, and there was no remedy path at all — emergencyVoidMarket
 * refuses a settled market. Meanwhile docs/REGULATOR_STRESS_REPORT.md told a
 * regulator that "settlement is gated on objectionsClosedAt".
 *
 * Every assertion below fails on that old code. That is the point:
 *
 *   1. GATE      — a resolved market pays NOBODY while its window is open. The
 *                  pool is intact, positions are OPEN, settledAt is null.
 *   2. SWEEP     — once the window closes, the lifecycle sweep pays exactly once.
 *   3. FREEZE    — an OPEN objection blocks settlement even past the window, so
 *                  an officer always reads it before the money moves.
 *   4. REMEDY    — an upheld objection can VOID or REVERSE the verdict, because
 *                  the money is still there to be re-directed. This is the whole
 *                  reason for gating.
 *   5. STANDING  — only a player with money at risk may object; once, not twice.
 *   6. NO DOUBLE-PAY — settling twice pays once.
 *
 * Run: npx tsx scripts/settlement-gate.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { marketStore, positionStore } from "../src/lib/server/market-dal.ts";
import {
  createMarket, buyPosition, getMarket, resolveMarket, settleMarket, settleDueMarkets,
  emergencyVoidMarket,
} from "../src/lib/server/market-service.ts";
import {
  fileObjection, upholdObjection, rejectObjection, withdrawObjection,
  countOpenObjections, objectionEligibility,
} from "../src/lib/server/objections-service.ts";
import { getGlobalConfig } from "../src/lib/server/market-config.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string, balance = 100_000): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
const pool = async (mid: string) => { const m = (await getMarket(mid))!; return m.yesPool + m.noPool; };

/** Ruling on an objection moves money, so it is gated at the SERVICE layer to
 *  ADMIN/COMPLIANCE. The ruling officer must genuinely hold the role. */
await fundedUser("gate_officer", 0);
await db.user.update("gate_officer", { role: "COMPLIANCE" });

async function makeMarket(): Promise<string> {
  const m = await createMarket({
    titleEn: "Gate market", titleSw: null as unknown as string, category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  return m.id;
}

/** Two-officer adjudication. Records the verdict; must move NO money. */
async function adjudicate(mid: string, outcome: "YES" | "NO" | "VOID") {
  await resolveMarket({ marketId: mid, outcome, officerId: "gate_alpha" });
  return resolveMarket({ marketId: mid, outcome, officerId: "gate_beta" });
}

/** Fast-forward a market past its objection window (what the clock would do). */
async function closeWindow(mid: string): Promise<void> {
  const m = (await marketStore.get(mid))!;
  m.objectionsClosedAt = new Date(Date.now() - 1000).toISOString();
  await marketStore.set(m);
}

// ═══ 1 · THE GATE — a verdict pays nobody ══════════════════════════════════
{
  const mid = await makeMarket();
  await fundedUser("g1_win");
  await fundedUser("g1_lose");
  await buyPosition("g1_win", { marketId: mid, side: "YES", stake: 10_000 });
  await buyPosition("g1_lose", { marketId: mid, side: "NO", stake: 10_000 });

  const winBefore = await bal("g1_win");
  const poolBefore = await pool(mid);

  const r = await adjudicate(mid, "YES");
  const m = (await getMarket(mid))!;

  ok("1: adjudication completes", r.ok && r.data?.stage === "complete");
  ok("1: market is RESOLVED", m.status === "RESOLVED", `status=${m.status}`);
  ok("1: verdict recorded", m.resolvedOutcome === "YES");
  ok("1: objection window is OPEN", !!m.objectionsClosedAt && Date.parse(m.objectionsClosedAt) > Date.now());
  // THE HEADLINE — this is the assertion the old code fails.
  ok("1: winner is NOT paid while the window is open", (await bal("g1_win")) === winBefore,
     `delta=${(await bal("g1_win")) - winBefore}`);
  ok("1: settledAt is null (money has not moved)", m.settledAt === null, `settledAt=${m.settledAt}`);
  ok("1: the pool is still intact", (await pool(mid)) === poolBefore, `pool=${await pool(mid)} was=${poolBefore}`);
  const positions = await positionStore.listForMarket(mid);
  ok("1: every position is still OPEN", positions.every((p) => p.status === "OPEN"),
     positions.map((p) => p.status).join(","));

  // And settlement REFUSES while the window is open.
  const early = await settleMarket(mid);
  ok("1: settleMarket refuses inside the window", !early.ok && early.code === "TOO_EARLY", JSON.stringify(early));
  const swept = await settleDueMarkets();
  ok("1: the sweep does not settle it either", swept.settled === 0, JSON.stringify(swept));
  ok("1: still unpaid after the sweep", (await bal("g1_win")) === winBefore);
}

// ═══ 2 · THE SWEEP — once the window closes, the money moves, exactly once ══
{
  const mid = await makeMarket();
  await fundedUser("g2_win");
  await fundedUser("g2_lose");
  await buyPosition("g2_win", { marketId: mid, side: "YES", stake: 10_000 });
  await buyPosition("g2_lose", { marketId: mid, side: "NO", stake: 10_000 });
  await adjudicate(mid, "YES");

  const winBefore = await bal("g2_win");
  await closeWindow(mid);

  const swept = await settleDueMarkets();
  ok("2: the sweep settles the due market", swept.settled === 1, JSON.stringify(swept));

  const m = (await getMarket(mid))!;
  const delta = (await bal("g2_win")) - winBefore;
  ok("2: the winner is paid", delta > 0, `delta=${delta}`);
  ok("2: settledAt is stamped", !!m.settledAt);
  const win = (await positionStore.listForMarket(mid)).find((p) => p.userId === "g2_win")!;
  const lose = (await positionStore.listForMarket(mid)).find((p) => p.userId === "g2_lose")!;
  ok("2: winner position is WIN", win.status === "WIN", `status=${win.status}`);
  ok("2: loser position is LOSS", lose.status === "LOSS", `status=${lose.status}`);

  // NO DOUBLE-PAY: sweep again, settle again — the money must not move twice.
  const paid = await bal("g2_win");
  await settleDueMarkets();
  const again = await settleMarket(mid, { force: true });
  ok("2: a second settle is refused", !again.ok, JSON.stringify(again));
  ok("2: the winner is NOT paid twice", (await bal("g2_win")) === paid,
     `bal=${await bal("g2_win")} expected=${paid}`);
}

// ═══ 3 · THE FREEZE — an open objection blocks settlement past the window ═══
{
  const mid = await makeMarket();
  await fundedUser("g3_win");
  await fundedUser("g3_lose");
  await buyPosition("g3_win", { marketId: mid, side: "YES", stake: 10_000 });
  await buyPosition("g3_lose", { marketId: mid, side: "NO", stake: 10_000 });
  await adjudicate(mid, "YES");

  const f = await fileObjection("g3_lose", {
    marketId: mid, reason: "SOURCE_CONTRADICTS",
    detail: "The official source reports NO, not YES. Please re-read the citation.",
  });
  ok("3: the losing stakeholder can object", f.ok, JSON.stringify(f));
  ok("3: the objection is counted as open", (await countOpenObjections(mid)) === 1);

  // The window elapses — but the objection is still standing.
  await closeWindow(mid);
  const winBefore = await bal("g3_win");
  const blocked = await settleMarket(mid);
  ok("3: settlement is FROZEN by the open objection", !blocked.ok && blocked.code === "OBJECTION_OPEN", JSON.stringify(blocked));
  const swept = await settleDueMarkets();
  ok("3: the sweep will not settle a frozen market", swept.settled === 0, JSON.stringify(swept));
  ok("3: money is still in the pool", (await bal("g3_win")) === winBefore);

  // The officer reads it and rejects — the verdict stands, the freeze lifts.
  const rej = await rejectObjection((await db.objection.listForMarket(mid))[0].id, "gate_officer",
    "Checked the source: it does report YES. Verdict stands.");
  ok("3: officer can reject with a reason", rej.ok, JSON.stringify(rej));
  ok("3: no open objections remain", (await countOpenObjections(mid)) === 0);

  const after = await settleDueMarkets();
  ok("3: the market settles once the freeze lifts", after.settled === 1, JSON.stringify(after));
  ok("3: the winner is finally paid", (await bal("g3_win")) > winBefore);
}

// ═══ 4 · THE REMEDY — an upheld objection can still change the money ════════
// REVERSE: the other side actually won. Only possible because nothing was paid.
{
  const mid = await makeMarket();
  await fundedUser("g4_yes");
  await fundedUser("g4_no");
  await buyPosition("g4_yes", { marketId: mid, side: "YES", stake: 10_000 });
  await buyPosition("g4_no", { marketId: mid, side: "NO", stake: 10_000 });
  await adjudicate(mid, "YES"); // WRONG verdict

  const yesBefore = await bal("g4_yes");
  const noBefore = await bal("g4_no");

  const f = await fileObjection("g4_no", {
    marketId: mid, reason: "WRONG_OUTCOME",
    detail: "The event did not happen. The source says NO. I staked NO and should win.",
  });
  ok("4: the aggrieved player objects", f.ok);
  const objId = (await db.objection.listForMarket(mid))[0].id;

  const up = await upholdObjection(objId, "gate_officer", {
    remedy: "REVERSE", note: "Confirmed against the source — the correct outcome is NO.",
  });
  ok("4: officer upholds with REVERSE", up.ok, JSON.stringify(up));
  ok("4: the verdict is flipped to NO", up.ok && up.data?.newOutcome === "NO");

  const m = (await getMarket(mid))!;
  ok("4: still unsettled (nothing was paid to the wrong side)", m.settledAt === null);
  ok("4: a REVERSE re-opens the window for the newly-losing side",
     !!m.objectionsClosedAt && Date.parse(m.objectionsClosedAt) > Date.now());

  await closeWindow(mid);
  await settleDueMarkets();

  ok("4: the player who was RIGHT gets paid", (await bal("g4_no")) > noBefore,
     `delta=${(await bal("g4_no")) - noBefore}`);
  ok("4: the player who was WRONGLY declared winner is paid NOTHING",
     (await bal("g4_yes")) === yesBefore, `delta=${(await bal("g4_yes")) - yesBefore}`);
}

// VOID: nobody was right — every stake comes back in full.
{
  const mid = await makeMarket();
  await fundedUser("g5_a");
  await fundedUser("g5_b");
  const aStart = await bal("g5_a");
  const bStart = await bal("g5_b");
  await buyPosition("g5_a", { marketId: mid, side: "YES", stake: 10_000 });
  await buyPosition("g5_b", { marketId: mid, side: "NO", stake: 7_000 });
  await adjudicate(mid, "YES");

  const f = await fileObjection("g5_b", {
    marketId: mid, reason: "AMBIGUOUS_CRITERION",
    detail: "The criterion does not decide this case either way — it should be voided.",
  });
  ok("5: objection filed", f.ok);
  const objId = (await db.objection.listForMarket(mid))[0].id;

  const up = await upholdObjection(objId, "gate_officer", {
    remedy: "VOID", note: "Criterion is genuinely ambiguous. Voiding and refunding every stake.",
  });
  ok("5: officer upholds with VOID", up.ok, JSON.stringify(up));
  ok("5: the market is VOIDED", (await getMarket(mid))!.status === "VOIDED");

  await settleDueMarkets(); // a VOID does not need a fresh window — refunds harm nobody

  ok("5: stake fully refunded to the YES bettor", (await bal("g5_a")) === aStart, `bal=${await bal("g5_a")} start=${aStart}`);
  ok("5: stake fully refunded to the NO bettor", (await bal("g5_b")) === bStart, `bal=${await bal("g5_b")} start=${bStart}`);
  const positions = await positionStore.listForMarket(mid);
  ok("5: every position is VOID", positions.every((p) => p.status === "VOID"));
}

// ═══ 6 · STANDING — who may object, and how often ═══════════════════════════
{
  const mid = await makeMarket();
  await fundedUser("g6_bettor");
  await fundedUser("g6_opp");
  await fundedUser("g6_bystander"); // never staked
  await buyPosition("g6_bettor", { marketId: mid, side: "YES", stake: 5_000 });
  await buyPosition("g6_opp", { marketId: mid, side: "NO", stake: 5_000 });

  // Cannot object before there is a verdict.
  const tooEarly = await fileObjection("g6_bettor", { marketId: mid, reason: "OTHER", detail: "I don't like this market at all." });
  ok("6: cannot object before the market is adjudicated", !tooEarly.ok, JSON.stringify(tooEarly));

  await adjudicate(mid, "YES");

  // A bystander with no money at risk has no standing — this is the anti-spam rule.
  const bystander = await fileObjection("g6_bystander", { marketId: mid, reason: "WRONG_OUTCOME", detail: "I think this is wrong, though I never staked." });
  ok("6: a non-stakeholder CANNOT object", !bystander.ok, JSON.stringify(bystander));
  const elig = await objectionEligibility("g6_bystander", mid);
  ok("6: eligibility says why (NO_POSITION)", !elig.eligible && elig.why === "NO_POSITION", JSON.stringify(elig));

  // Too-short detail is rejected — an objection must actually say something.
  const empty = await fileObjection("g6_opp", { marketId: mid, reason: "WRONG_OUTCOME", detail: "no" });
  ok("6: an empty objection is rejected", !empty.ok);

  // One open objection per player per market — a double-submit is not a second case.
  const first = await fileObjection("g6_opp", { marketId: mid, reason: "WRONG_OUTCOME", detail: "The source clearly reports the opposite result." });
  const second = await fileObjection("g6_opp", { marketId: mid, reason: "WRONG_OUTCOME", detail: "The source clearly reports the opposite result." });
  ok("6: the first objection lands", first.ok);
  ok("6: a double-submit is rejected", !second.ok, JSON.stringify(second));
  ok("6: exactly one open objection exists", (await countOpenObjections(mid)) === 1);

  // An officer may not rule on their own objection. To prove the SELF-REVIEW block
  // specifically (not just the role gate) the objector must genuinely hold the
  // ruling role — so promote them, then watch separation-of-duties still refuse.
  const objId = (await db.objection.listForMarket(mid))[0].id;
  await db.user.update("g6_opp", { role: "COMPLIANCE" });
  const selfReview = await rejectObjection(objId, "g6_opp", "Nothing to see here, dismissing my own case.");
  ok("6: even a COMPLIANCE officer cannot rule on their OWN objection", !selfReview.ok && selfReview.code === "CONFLICT", JSON.stringify(selfReview));
  await db.user.update("g6_opp", { role: "PLAYER" });

  // The player can withdraw, which releases the freeze.
  const wd = await withdrawObjection("g6_opp", objId);
  ok("6: the objector can withdraw", wd.ok);
  ok("6: withdrawing releases the freeze", (await countOpenObjections(mid)) === 0);

  // Once settled, the objection route is closed and says so honestly.
  await closeWindow(mid);
  await settleDueMarkets();
  const late = await fileObjection("g6_opp", { marketId: mid, reason: "WRONG_OUTCOME", detail: "Actually I changed my mind, I want to dispute this again." });
  ok("6: cannot object to a market that has already paid out", !late.ok, JSON.stringify(late));
  const eligLate = await objectionEligibility("g6_opp", mid);
  ok("6: eligibility says ALREADY_SETTLED", !eligLate.eligible && eligLate.why === "ALREADY_SETTLED", JSON.stringify(eligLate));
}

// ═══ 7 · The window is CONFIGURABLE, not a hardcoded 24 ═════════════════════
{
  const cfg = await getGlobalConfig();
  ok("7: objectionWindowHours is a real config knob", typeof cfg.objectionWindowHours === "number",
     `value=${cfg.objectionWindowHours}`);
  ok("7: it defaults to 24h", cfg.objectionWindowHours === 24, `value=${cfg.objectionWindowHours}`);

  const mid = await makeMarket();
  await fundedUser("g7_a");
  await fundedUser("g7_b");
  await buyPosition("g7_a", { marketId: mid, side: "YES", stake: 1_000 });
  await buyPosition("g7_b", { marketId: mid, side: "NO", stake: 1_000 });
  await adjudicate(mid, "YES");
  const m = (await getMarket(mid))!;
  const windowMs = Date.parse(m.objectionsClosedAt!) - Date.parse(m.resolutionStage2At!);
  const expected = cfg.objectionWindowHours * 3600_000;
  ok("7: the stamped window matches the configured hours",
     Math.abs(windowMs - expected) < 2000, `windowMs=${windowMs} expected=${expected}`);
}

// ═══ 8 · THE ESCAPE HATCH — emergency void works while money is still there ══
// An upheld objection needs a way to kill a market NOW. Before the gate, an
// emergency void refused any RESOLVED market — which meant a resolved market was
// beyond rescue the instant it was adjudicated. It now refuses only a SETTLED
// one, because that is the only state where the money is genuinely gone.
{
  const mid = await makeMarket();
  // The void is hard-gated to ADMIN/COMPLIANCE at the SERVICE layer (not just the
  // route), so the officer must genuinely hold the role.
  await fundedUser("gate_compliance", 0);
  await db.user.update("gate_compliance", { role: "COMPLIANCE" });
  await fundedUser("g8_a");
  await fundedUser("g8_b");
  const aStart = await bal("g8_a");
  const bStart = await bal("g8_b");
  await buyPosition("g8_a", { marketId: mid, side: "YES", stake: 12_000 });
  await buyPosition("g8_b", { marketId: mid, side: "NO", stake: 8_000 });
  await adjudicate(mid, "YES"); // verdict recorded, money NOT moved

  const killed = await emergencyVoidMarket({
    marketId: mid, officerId: "gate_compliance",
    reason: "Source was retracted after the verdict — killing the market before payout.",
  });
  ok("8: an emergency void CAN kill a RESOLVED-but-unsettled market", killed.ok, JSON.stringify(killed));
  ok("8: every stake is refunded in full", (await bal("g8_a")) === aStart && (await bal("g8_b")) === bStart,
     `a=${await bal("g8_a")}/${aStart} b=${await bal("g8_b")}/${bStart}`);
  const m = (await getMarket(mid))!;
  ok("8: the void stamps settledAt (money moved here)", !!m.settledAt);

  // …and the sweep must NOT then settle it a second time.
  const swept = await settleDueMarkets();
  ok("8: the sweep does not re-settle a voided market", swept.settled === 0, JSON.stringify(swept));
  ok("8: balances unchanged after the sweep", (await bal("g8_a")) === aStart && (await bal("g8_b")) === bStart);

  // Once settled, the hatch is closed — we never claw money back out of wallets.
  const late = await emergencyVoidMarket({
    marketId: mid, officerId: "gate_compliance", reason: "Trying to void an already-settled market.",
  });
  ok("8: an emergency void is REFUSED once the money has moved", !late.ok, JSON.stringify(late));
}

// ═══ 9 · HARDENING — the remedy is a money act, so it is gated like one ══════
{
  const mid = await makeMarket();
  await fundedUser("g9_a");
  await fundedUser("g9_b");
  await buyPosition("g9_a", { marketId: mid, side: "YES", stake: 5_000 });
  await buyPosition("g9_b", { marketId: mid, side: "NO", stake: 5_000 });
  await adjudicate(mid, "YES");
  await fileObjection("g9_b", { marketId: mid, reason: "WRONG_OUTCOME", detail: "The source plainly reports the opposite result." });
  const objId = (await db.objection.listForMarket(mid))[0].id;

  // A MODERATOR may run the console, but MUST NOT be able to move money. The
  // same tier that cannot emergency-void a market cannot reverse one either.
  await fundedUser("g9_mod", 0);
  await db.user.update("g9_mod", { role: "MODERATOR" });
  const modUphold = await upholdObjection(objId, "g9_mod", { remedy: "VOID", note: "Trying to void as a moderator." });
  ok("9: a MODERATOR cannot UPHOLD (money act)", !modUphold.ok, JSON.stringify(modUphold));
  const modReject = await rejectObjection(objId, "g9_mod", "Trying to release the freeze as a moderator.");
  ok("9: a MODERATOR cannot REJECT (releases a settlement freeze)", !modReject.ok, JSON.stringify(modReject));

  // A plain PLAYER certainly cannot.
  const playerRule = await upholdObjection(objId, "g9_a", { remedy: "REVERSE", note: "I would like to win please." });
  ok("9: a PLAYER cannot rule on an objection", !playerRule.ok, JSON.stringify(playerRule));

  // The blocked attempts are on the SECURITY trail, not silently dropped.
  const { auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");
  await auditFlush();
  const blocked = getAuditPage({ limit: 500 }).filter((e) => e.action === "privilege_escalation_blocked");
  ok("9: the blocked attempts are audited as privilege escalation", blocked.length >= 3, `count=${blocked.length}`);

  // …and the money never moved through any of it.
  ok("9: the objection is still OPEN after every blocked attempt",
     (await countOpenObjections(mid)) === 1);
  ok("9: the market is still unsettled", (await getMarket(mid))!.settledAt === null);

  // A mandatory reason: an officer cannot rule silently.
  const noNote = await rejectObjection(objId, "gate_officer", "");
  ok("9: a ruling with no reason is refused", !noNote.ok, JSON.stringify(noNote));

  // A hostile payload cannot become an objection: the detail is capped, and a
  // bogus reason code is refused rather than stored.
  const huge = "A".repeat(50_000);
  const bogus = await fileObjection("g9_a", { marketId: mid, reason: "DROP TABLE" as never, detail: huge });
  ok("9: an invalid reason code is refused", !bogus.ok, JSON.stringify(bogus));
  const capped = await fileObjection("g9_a", { marketId: mid, reason: "OTHER", detail: huge });
  ok("9: a 50k-char paste is accepted only as a capped record", capped.ok);
  const stored = (await db.objection.listForMarket(mid)).find((o) => o.userId === "g9_a");
  ok("9: the stored detail is capped at 1000 chars", (stored?.detail.length ?? 0) === 1000, `len=${stored?.detail.length}`);

  // The real officer CAN rule, and that releases the freeze.
  const good = await rejectObjection(objId, "gate_officer", "Verified against the source — the verdict is correct.");
  ok("9: a COMPLIANCE officer CAN rule", good.ok, JSON.stringify(good));
}

console.log(`\nsettlement-gate: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
