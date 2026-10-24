/**
 * test:stake-share-receipts — EVERY WIN SURFACE STATES WHAT THE LEDGER RECORDED, AND A WIN PAID BELOW ITS STAKE IS NEVER A
 * GAIN (programme FEE-TAX-2026-10, release R3 lane b; `docs/FEE-TAX-PLAN.md` §3, ruling 1).
 *
 *   npm run test:stake-share-receipts     (memory store; forced, whatever the environment says)
 *
 * Drives the REAL chain — `createMarket` (stake-share stamped with the gate opened in THIS process only) → `buyPosition` →
 * the close (`notifySelectionClosedForMarket`) → `resolveMarket` → `settleMarket` — on three markets, and reads back what
 * the winner, the officer and the public read:
 *   · BALANCED  stake-share YES 10,000 (A) vs NO 10,000 (B), YES wins — A is paid 16,095 = 10,000 − 1,300 + 8,700 − 1,305;
 *   · LOPSIDED  stake-share YES 100,000 (C) vs NO 10,000 (D), YES wins — C is paid 94,395 = 100,000 − 13,000 + 8,700 −
 *               1,305: LESS than its stake (ruling 1);
 *   · LEGACY    loser-share YES 10,000 (E) vs NO 10,000 (F), YES wins — E is paid 18,700, and every word is as it was.
 *
 *   §1  the records hold together: Position.feeTzs / winningsTaxTzs / finalPayout = BET_PAYOUT taxWithheld / amount, and
 *       the receipt derived from them (`stakeShareWinReceipt`) is the figures above to the shilling; a legacy row has none
 *   §2  the bell: a gain names its parts under "You won {paid}"; a below-stake win reads "Returned … of your … stake", is
 *       filed ROUND_RESULT and says "won" in no language; the legacy win is the old row byte for byte
 *   §3  the letter: the same parts in the same order and the signed net; a below-stake letter is royal, its subject neutral
 *   §4  the share card: a below-stake win is neither minted nor resolved as a "Won on 50pick" card; a gain is
 *   §5  the wallet: a payout row's breakdown is the record (stake, own fee, tax) and is read for its owner only
 *   §6  the ticket, the card and the Up & Down truth: ticketPayout, the rendered PositionCard (no strike, no share below the
 *       stake), validRealizedPayout's net-stake floor, a below-stake WIN announced as MIXED
 *   §7  the public resolution panel: F, T and pool − F − T from the frozen rates, rendered; the officer's "as booked" sums
 *       agree; legacy markets get none and keep their rows
 *   §8  the officers' list: `taxWithheldOf` names a payout's winnings tax and an agent's withholding apart
 *   §9  the bet receipt and the betting-closed notice and letter: our fee and the pool; after the fee and the tax; below
 *       the stake said to the one-side holder; legacy unchanged
 *   §10 Up & Down: the round's bell (gain / below), the digest's returned clause and tax sentence, its letter's rows
 *   §11 the /agent waterfall on stakes: the same figures (130,000 / 13,000 / 6,500 / 110,500 / 11,050 / 553 / 10,497), the
 *       stakes words in every language; the winnings table unchanged
 *
 * ⚠️ EVERY EXPECTATION IS A LITERAL, AND IT IS ALSO RE-READ FROM THE RECORDS — the literal stops the suite agreeing with a
 * broken engine because both call one function (`commission-bounded.test.mts`'s rule), the record keeps it honest to the
 * ledger. ⛔ The new law is not in force (`fee-law-gate.ts`): the gate is opened in this process only to stamp.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// ⛔ MEMORY ONLY, BY CONSTRUCTION — set BEFORE the first import below (every import is dynamic for that).
process.env.DATABASE_URL = "";
process.env.USE_PRISMA_DAL = "false";
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";
process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.POSTMARK_API_KEY = "";
process.env.SMS_PROVIDER = "console";
process.env.MARKET_SCHEDULER = "false";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";
process.env.HOUSE_BOT_ENGINE = "false";

import { createRequire } from "node:module";

type Any = any;
await import("./lib/verified-fixtures.mts");
const { db }: Any = await import("../src/lib/server/store.ts");
const { marketStore, positionStore }: Any = await import("../src/lib/server/market-dal.ts");
const svc: Any = await import("../src/lib/server/market-service.ts");
const gate: Any = await import("../src/lib/fee-law-gate.ts");
const N: Any = await import("../src/lib/server/notification-service.ts");
const E: Any = await import("../src/lib/server/email.ts");
const R: Any = await import("../src/lib/stake-share-receipt.ts");
const P: Any = await import("../src/lib/payout.ts");
const { mintWinShareToken, resolveWinShareToken }: Any = await import("../src/lib/server/share-token.ts");
const { signSession }: Any = await import("../src/lib/server/crypto.ts");
const { winBreakdownsFor }: Any = await import("../src/lib/server/win-breakdowns.ts");
const { taxWithheldOf }: Any = await import("../src/lib/server/txn-filters.ts");
const { ticketPayout }: Any = await import("../src/components/journey/tickets/ticket-payout.ts");
const truth: Any = await import("../src/lib/updown-result-truth.ts");
const { digestCopy }: Any = await import("../src/lib/server/updown-digest.ts");
const { commissionWaterfall }: Any = await import("../src/lib/agent-commission.ts");
const { dict }: Any = await import("../src/lib/i18n-dict.ts");
const { formatTzs, fill }: Any = await import("../src/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (s: string) => console.log(`\n── ${s}`);
const j = (v: unknown) => JSON.stringify(v);
const T = (n: number) => formatTzs(n);
const LOCALES = ["en", "sw", "zh"] as const;

// ── fixtures ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const nowIso = new Date().toISOString();
const ahead = (min: number) => new Date(Date.now() + min * 60_000).toISOString();
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
let seq = 0;
/** A funded player with a CONFIRMED address, so the money letters reach the outbox (`confirmedOnly`). */
async function player(tag: string): Promise<string> {
  const id = `usr_ssr_${tag}_${process.pid}_${++seq}`;
  await db.user.create({
    id, phoneE164: `+25576${String(process.pid % 1000).padStart(3, "0")}${String(seq).padStart(4, "0")}`,
    email: `${id}@test.tz`, emailVerifiedAt: nowIso,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 300_000, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: nowIso, updatedAt: nowIso,
  } as never);
  return id;
}
const RATES = { platformFeeRate: 0.03, operatorFeeRate: 0.10, freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 };
async function market(model: "stake-share" | "loser-share", title: string): Promise<Any> {
  const input = {
    titleEn: title, titleSw: `${title} (sw)`, titleZh: `${title}（中文）`, category: "macro", sourceUrl: "https://bot.go.tz",
    resolutionCriterion: "Resolves at the official date.", resolutionAt: ahead(7 * 24 * 60), proposedBy: "usr_ssr_officer",
  };
  if (model === "loser-share") return svc.createMarket({ ...input, rateOverrides: { ...RATES, feeModel: "loser-share" } });
  gate.__setFeeLawLiveForTest(true);
  try {
    const m = await svc.createMarket({ ...input, rateOverrides: { ...RATES, feeModel: "stake-share", winningsTaxRate: 0.15 } });
    if (m.feeSnapshot?.feeModel !== "stake-share") throw new Error(`fixture: the market did not freeze stake-share (${j(m.feeSnapshot)})`);
    return m;
  } finally {
    gate.__setFeeLawLiveForTest(null);
  }
}
async function bet(userId: string, marketId: string, side: "YES" | "NO", stake: number): Promise<string> {
  const r = await svc.buyPosition(userId, { marketId, side, stake });
  if (!r.ok) throw new Error(`fixture bet refused: ${j(r)}`);
  return r.data.positionId;
}
async function closeAndSettle(marketId: string, outcome: "YES" | "NO"): Promise<void> {
  await marketStore.stamp(marketId, { selectionClosedAt: ago(1) });
  const closed = await svc.notifySelectionClosedForMarket(marketId);
  if (!closed.notified) throw new Error(`fixture: the close did not notify (${j(closed)})`);
  const r = await svc.resolveMarket({ marketId, outcome, officerId: "usr_ssr_officer_a" });
  if (r.ok && r.data?.stage === "stage1") await svc.resolveMarket({ marketId, outcome, officerId: "usr_ssr_officer_b" });
  else if (!r.ok) throw new Error(`fixture resolve refused: ${j(r)}`);
  const s = await svc.settleMarket(marketId, { force: true, actorId: "usr_ssr_officer_a" });
  if (!s.ok) throw new Error(`fixture settle refused: ${j(s)}`);
}
/** Settlement's notices and letters run after its commit, fire-and-forget: wait until `ready` holds (3 s at most). */
async function until(ready: () => Promise<boolean>): Promise<void> {
  for (let i = 0; i < 60; i++) { if (await ready()) return; await new Promise((res) => setTimeout(res, 50)); }
}
const bell = async (userId: string, kinds: string[]) => ((await db.notification.findByUser(userId, 100)) as Any[]).filter((n) => kinds.includes(n.kind));
const letters = (userId: string, tag: string) => (E.emailOutbox() as Any[]).filter((e) => e.to === `${userId}@test.tz` && e.tag === tag);
const plain = (html: string) => html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s{2,}/g, " ").trim();
const posOf = async (marketId: string, id: string) => ((await svc.listPositionsForMarket(marketId)) as Any[]).find((p) => p.id === id);
const payoutTxnOf = async (userId: string, positionId: string) => ((await db.txn.findByUser(userId, 100)) as Any[]).find((t) => t.type === "BET_PAYOUT" && t.positionId === positionId);

const A = await player("a"), B = await player("b"), C = await player("c"), D = await player("d"), Ep = await player("e"), F = await player("f");
const M1 = await market("stake-share", "Receipts balanced");
const M2 = await market("stake-share", "Receipts lopsided");
const M3 = await market("loser-share", "Receipts legacy");
const pA = await bet(A, M1.id, "YES", 10_000), pB = await bet(B, M1.id, "NO", 10_000);
const pC = await bet(C, M2.id, "YES", 100_000), pD = await bet(D, M2.id, "NO", 10_000);
const pE = await bet(Ep, M3.id, "YES", 10_000); await bet(F, M3.id, "NO", 10_000);
await until(async () => (await bell(A, ["BET_PLACED"])).length > 0 && (await bell(Ep, ["BET_PLACED"])).length > 0
  && letters(A, "bet-placed").length > 0 && letters(Ep, "bet-placed").length > 0);
for (const [m, o] of [[M1, "YES"], [M2, "YES"], [M3, "YES"]] as const) await closeAndSettle(m.id, o);
await until(async () => (await bell(A, ["WIN"])).length > 0 && (await bell(C, ["ROUND_RESULT", "WIN"])).length > 0
  && (await bell(Ep, ["WIN"])).length > 0 && letters(A, "win").length > 0 && letters(C, "win").length > 0 && letters(Ep, "win").length > 0
  && letters(C, "selection-closed").length > 0);

// ═══ §1 · the records ═════════════════════════════════════════════════════════════════════════════════════════════════
section("§1 · the records hold together, and the receipt is read from them");
const posA = await posOf(M1.id, pA), posB = await posOf(M1.id, pB), posC = await posOf(M2.id, pC), posE = await posOf(M3.id, pE);
const txA = await payoutTxnOf(A, pA), txC = await payoutTxnOf(C, pC), txE = await payoutTxnOf(Ep, pE);
ok("1.0 · CONTROL · every fixture settled: A and C won, B lost, E won the legacy market",
  posA?.status === "WIN" && posB?.status === "LOSS" && posC?.status === "WIN" && posE?.status === "WIN" && !!txA && !!txC && !!txE,
  j({ A: posA?.status, B: posB?.status, C: posC?.status, E: posE?.status }));
ok("1.1 · the balanced winner's records: fee 1,300, tax 1,305, paid 16,095 — on the position AND the payout row",
  posA?.feeTzs === 1_300 && posA?.winningsTaxTzs === 1_305 && posA?.finalPayout === 16_095 && txA?.amount === 16_095 && txA?.taxWithheld === 1_305 && txA?.fee === 0,
  j({ pos: [posA?.feeTzs, posA?.winningsTaxTzs, posA?.finalPayout], txn: [txA?.amount, txA?.taxWithheld, txA?.fee] }));
ok("1.2 · the lopsided winner's records: fee 13,000, tax 1,305, paid 94,395 — below its 100,000 stake",
  posC?.feeTzs === 13_000 && posC?.winningsTaxTzs === 1_305 && posC?.finalPayout === 94_395 && txC?.amount === 94_395 && txC?.taxWithheld === 1_305,
  j({ pos: [posC?.feeTzs, posC?.winningsTaxTzs, posC?.finalPayout], txn: [txC?.amount, txC?.taxWithheld] }));
ok("1.3 · the loser carries its own fee and no tax; the legacy winner carries neither and withholds nothing",
  posB?.feeTzs === 1_300 && posB?.winningsTaxTzs === 0 && posE?.feeTzs == null && posE?.winningsTaxTzs == null && txE?.taxWithheld === 0 && txE?.amount === 18_700,
  j({ B: [posB?.feeTzs, posB?.winningsTaxTzs], E: [posE?.feeTzs, posE?.winningsTaxTzs, txE?.taxWithheld, txE?.amount] }));
const rA = R.stakeShareWinReceipt({ stake: posA.stake, fee: posA.feeTzs, tax: posA.winningsTaxTzs, paid: posA.finalPayout });
const rC = R.stakeShareWinReceipt({ stake: posC.stake, fee: posC.feeTzs, tax: posC.winningsTaxTzs, paid: posC.finalPayout });
ok("1.4 · ★ A's receipt: 10,000 − 1,300 + 8,700 − 1,305 = 16,095, a gain of 6,095",
  j(rA) === j({ stake: 10_000, fee: 1_300, netStake: 8_700, grossWinnings: 8_700, tax: 1_305, paid: 16_095, net: 6_095, belowStake: false }), j(rA));
ok("1.5 · ★ C's receipt: 100,000 − 13,000 + 8,700 − 1,305 = 94,395 — 5,605 below the stake, `belowStake`",
  j(rC) === j({ stake: 100_000, fee: 13_000, netStake: 87_000, grossWinnings: 8_700, tax: 1_305, paid: 94_395, net: -5_605, belowStake: true }), j(rC));
ok("1.6 · the payout row reads to the same receipt as the position (the wallet's source and the ticket's agree)",
  j(R.stakeShareWinReceipt({ stake: posC.stake, fee: posC.feeTzs, tax: txC.taxWithheld, paid: txC.amount })) === j(rC));
ok("1.7 · a legacy row has no receipt (no fee on it), and a record that does not hold together has none either",
  R.stakeShareWinReceipt({ stake: posE.stake, fee: posE.feeTzs, tax: txE.taxWithheld, paid: posE.finalPayout }) === null
    && R.stakeShareWinReceipt({ stake: 10_000, fee: 1_300, tax: 0, paid: 8_699 }) === null
    && R.stakeShareWinReceipt({ stake: 10_000, fee: 10_001, tax: 0, paid: 9_000 }) === null
    && R.stakeShareWinReceipt({ stake: 10_000, fee: 1_300.5, tax: 0, paid: 16_000 }) === null);
ok("1.8 · CONTROL · the one below-stake predicate: 94,395 of 100,000 is below; 16,095 of 10,000, 10,000 of 10,000, a missing or negative figure are not",
  R.isBelowStakeWin(94_395, 100_000) && !R.isBelowStakeWin(16_095, 10_000) && !R.isBelowStakeWin(10_000, 10_000)
    && !R.isBelowStakeWin(null, 10_000) && !R.isBelowStakeWin(-1, 10_000) && !R.isBelowStakeWin(5, 0));

// ═══ §2 · the bell ════════════════════════════════════════════════════════════════════════════════════════════════════
section("§2 · the bell names the parts; a win paid below its stake is never a gain");
const wA = (await bell(A, ["WIN"]))[0], wC = (await bell(C, ["ROUND_RESULT", "WIN"]))[0], wE = (await bell(Ep, ["WIN"]))[0];
ok("2.0 · CONTROL · each winner has exactly one result row", !!wA && !!wC && !!wE
  && (await bell(A, ["WIN", "ROUND_RESULT"])).length === 1 && (await bell(C, ["WIN", "ROUND_RESULT"])).length === 1);
ok("2.1 · the gain keeps its title, the net credited: \"You won TZS 16,095\" / Umeshinda / 您赢得",
  wA?.titleEn === `You won ${T(16_095)}` && wA?.titleSw === `Umeshinda ${T(16_095)}` && wA?.titleZh === `您赢得 ${T(16_095)}`, j([wA?.titleEn, wA?.titleSw, wA?.titleZh]));
const partsIn = (s: string, fig: number[]) => fig.every((n) => s.includes(T(n)));
ok("2.2 · ★ …and its body names the stake, our fee, the winnings before tax and the tax withheld, in all three languages",
  [wA?.bodyEn, wA?.bodySw, wA?.bodyZh].every((s: string) => partsIn(s ?? "", [10_000, 1_300, 8_700, 1_305]))
    && /stake TZS 10,000 · our fee TZS 1,300 · winnings TZS 8,700 · winnings tax \(15%\) TZS 1,305$/.test(wA?.bodyEn ?? ""), wA?.bodyEn);
ok("2.3 · ★ the below-stake win: \"Returned TZS 94,395 of your TZS 100,000 stake\" in each language, filed ROUND_RESULT (the quiet plate), never WIN",
  wC?.kind === "ROUND_RESULT" && wC?.titleEn === `Returned ${T(94_395)} of your ${T(100_000)} stake`
    && wC?.titleSw === `Umerudishiwa ${T(94_395)} kati ya dau lako la ${T(100_000)}` && wC?.titleZh === `已返还 ${T(94_395)}（您的投注额为 ${T(100_000)}）`,
  j([wC?.kind, wC?.titleEn, wC?.titleSw, wC?.titleZh]));
ok("2.4 · ⛔ …and no title or body of it says \"won\" in any language — it says why, with the same parts",
  [wC?.titleEn, wC?.titleSw, wC?.titleZh].every((s: string) => !/You won|Umeshinda|您赢得|赢得/.test(s ?? ""))
    && !/You won|Umeshinda|您赢得/.test(`${wC?.bodyEn} ${wC?.bodySw} ${wC?.bodyZh}`)
    && [wC?.bodyEn, wC?.bodySw, wC?.bodyZh].every((s: string) => partsIn(s ?? "", [100_000, 13_000, 8_700, 1_305]))
    && wC?.bodyEn.includes("your side won, but the other side was small"), wC?.bodyEn);
ok("2.5 · the legacy win is the old row, byte for byte: \"You won TZS 18,700\" and \"… paid out. Tap to view.\"",
  wE?.kind === "WIN" && wE?.titleEn === `You won ${T(18_700)}` && wE?.bodyEn === `${M3.titleEn} paid out. Tap to view.`
    && wE?.bodySw === `${M3.titleSw} kimelipa. Bonyeza kuona.`, j([wE?.titleEn, wE?.bodyEn, wE?.bodySw]));
ok("2.6 · every stake-share row is complete in three languages with no placeholder left",
  [wA, wC].every((n: Any) => ["titleEn", "titleSw", "titleZh", "bodyEn", "bodySw", "bodyZh"].every((k) => typeof n?.[k] === "string" && n[k].length > 5 && !/\{[a-zA-Z]+\}/.test(n[k]))));

// ═══ §3 · the letter ══════════════════════════════════════════════════════════════════════════════════════════════════
section("§3 · the letter: the parts in order, the signed net; a below-stake letter is royal and its subject neutral");
const lA = letters(A, "win")[0], lC = letters(C, "win")[0], lE = letters(Ep, "win")[0];
ok("3.0 · CONTROL · one win letter reached each winner", letters(A, "win").length === 1 && letters(C, "win").length === 1 && letters(Ep, "win").length === 1);
const tA = plain(lA?.html ?? ""), tC = plain(lC?.html ?? ""), tE = plain(lE?.html ?? "");
ok("3.1 · the gain: subject \"You won · TZS 16,095\", the five parts and the net +TZS 6,095",
  lA?.subject === `You won · ${T(16_095)}` && tA.includes(`Our fee (13%) −${T(1_300)}`) && tA.includes(`Your winnings, before tax +${T(8_700)}`)
    && tA.includes(`Winnings tax withheld (15%) −${T(1_305)}`) && tA.includes(`Paid to you ${T(16_095)}`) && tA.includes(`Against your stake +${T(6_095)}`)
    && tA.includes("Position won"), tA.slice(0, 500));
ok("3.2 · ★ the below-stake letter: subject and heading \"Returned TZS 94,395 of your TZS 100,000 stake\", the net −TZS 5,605",
  lC?.subject === `Returned ${T(94_395)} of your ${T(100_000)} stake` && tC.includes(`Returned ${T(94_395)} of your ${T(100_000)} stake`)
    && tC.includes(`Against your stake −${T(5_605)}`) && tC.includes(`Our fee (13%) −${T(13_000)}`) && tC.includes(`Paid to you ${T(94_395)}`), tC.slice(0, 600));
ok("3.3 · ⛔ …which says no \"You won\", no \"Position won\", no \"Net profit\" — and gives the reason in English and Swahili",
  !/You won|Position won|Net profit|Umeshinda/.test(tC) && tC.includes(dict.en.payoutTax.belowReason) && tC.includes(dict.sw.payoutTax.belowReason), tC.slice(0, 300));
ok("3.4 · ⛔ …in the royal chrome: the gain letter's gilt heading and good-tone rows are the gain's alone",
  /<h1[^>]*>You won /.test(lA?.html ?? "") && !/<h1[^>]*>You won /.test(lC?.html ?? "") && (lA?.html ?? "").includes(dict.en.payoutTax.taxToTra) && (lC?.html ?? "").includes(dict.en.payoutTax.taxToTra));
ok("3.5 · the legacy letter is unchanged: \"You won · TZS 18,700\", Payout, \"Net profit +TZS 8,700\", Stake — and no stake-share row",
  lE?.subject === `You won · ${T(18_700)}` && tE.includes(`Net profit +${T(8_700)}`) && !tE.includes("Winnings tax withheld") && !tE.includes("Our fee"), tE.slice(0, 400));

// ═══ §4 · the share card ══════════════════════════════════════════════════════════════════════════════════════════════
section("§4 · a below-stake win has no public \"Won on 50pick\" card");
const mintC = await mintWinShareToken(C, pC);
const forgedC = signSession({ p: "win-share", pos: pC, exp: Date.now() + 60_000 });
const mintA = await mintWinShareToken(A, pA);
const shareA = mintA ? await resolveWinShareToken(mintA) : null;
ok("4.1 · ⛔ the owner of a win paid below its stake cannot mint a win card", mintC === null);
ok("4.2 · ⛔ …and a validly signed token naming it resolves to no card (the market card is drawn instead)", (await resolveWinShareToken(forgedC)) === null);
ok("4.3 · a stake-share GAIN is still shareable, its figures the ledger's (16,095 · net +6,095)",
  !!mintA && shareA?.payout === 16_095 && shareA?.net === 6_095 && shareA?.stake === 10_000, j(shareA));
ok("4.4 · CONTROL · the legacy win mints as it always did", (await mintWinShareToken(Ep, pE)) !== null);

// ═══ §5 · the wallet ══════════════════════════════════════════════════════════════════════════════════════════════════
section("§5 · the wallet's payout row breaks down to the record, for its owner only");
const rowsC = (await db.txn.findByUser(C, 100)) as Any[];
const bdC = await winBreakdownsFor(rowsC, C);
ok("5.1 · ★ C's payout row carries its position's stake and own fee beside the row's tax (100,000 · 13,000 · 1,305)",
  j(bdC.get(txC.id)) === j({ stake: 100_000, fee: 13_000, tax: 1_305 }) && bdC.size === 1, j([...bdC]));
ok("5.2 · …and the client's receipt of it, with the row's amount as paid, is the ledger's (paid 94,395, below the stake)",
  j(R.stakeShareWinReceipt({ ...bdC.get(txC.id), paid: txC.amount })) === j(rC));
ok("5.3 · ⛔ another player asking about C's rows gets nothing (owner-checked)", (await winBreakdownsFor(rowsC, A)).size === 0);
ok("5.4 · a legacy payout row withholds no tax and is never read", (await winBreakdownsFor((await db.txn.findByUser(Ep, 100)) as Any[], Ep)).size === 0);

// ═══ §6 · the ticket, the card, the Up & Down truth ═══════════════════════════════════════════════════════════════════
section("§6 · the ticket and the card never gild a win paid below its stake");
ok("6.1 · the journey ticket: C's 94,395 of 100,000 is not `won` (no gilt, no strike); A's 16,095 of 10,000 is",
  ticketPayout({ status: "WIN", finalPayout: 94_395, stake: 100_000 }).won === false && ticketPayout({ status: "WIN", finalPayout: 16_095, stake: 10_000 }).won === true);
ok("6.2 · CONTROL · a caller with no stake (the older shape) reads exactly as before", ticketPayout({ status: "WIN", finalPayout: 2_218 }).won === true
  && ticketPayout({ status: "LOSS", finalPayout: 0, stake: 1_000 }).won === false);
ok("6.3 · Up & Down truth: a stake-share WIN below its stake is a valid payout down to its NET stake, never under it",
  truth.validRealizedPayout({ status: "WIN", stake: 100_000, payout: 94_395, fee: 13_000 }) === true
    && truth.validRealizedPayout({ status: "WIN", stake: 100_000, payout: 86_999, fee: 13_000 }) === false);
ok("6.4 · ⛔ …while a WIN row with no fee (every older model) is still held to its stake", truth.validRealizedPayout({ status: "WIN", stake: 2_000, payout: 1_999 }) === false);
const annC = truth.roundAnnouncementFor([{ status: "WIN", side: "UP", stake: 100_000, payout: 94_395, fee: 13_000 }], true);
const annA = truth.roundAnnouncementFor([{ status: "WIN", side: "UP", stake: 10_000, payout: 16_095, fee: 1_300 }], true);
ok("6.5 · ★ a below-stake round result is announced as the factual totals (MIXED), never the WIN seal; a gain stays WIN",
  j(annC) === j({ status: "MIXED", side: "UP", stake: 100_000, payout: 94_395 }) && annA?.status === "WIN", j([annC, annA]));
// The rendered card — the root layout's providers (r5j's harness), loaded through one require so React is one instance.
const req = createRequire(import.meta.url);
let rendered: Record<string, string> | null = null;
try {
  const React = req("react") as Any;
  const h = React.createElement;
  const { renderToStaticMarkup } = req("react-dom/server") as Any;
  const { I18nProvider } = req("../src/lib/i18n.tsx") as Any;
  const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as Any;
  const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as Any;
  const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
  const inApp = (el: unknown) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: "/positions" }, h(I18nProvider, { initial: "en" }, el))));
  const { PositionCard } = req("../src/components/markets/position-card.tsx") as Any;
  const { ResolutionPanel } = req("../src/components/markets/resolution-panel.tsx") as Any;
  const card = (p: Any, title: string) => inApp(h(PositionCard, {
    marketId: p.marketId, marketTitle: title, side: p.side, productLine: "MARKET", stake: p.stake, current: p.finalPayout, payout: p.finalPayout,
    status: p.status, placedAt: p.placedAt, serverNow: Date.now(), positionId: p.id, fee: p.feeTzs ?? null, winningsTax: p.winningsTaxTzs ?? null,
  }));
  const panel = (m: Any, figures: Any) => inApp(h(ResolutionPanel, {
    marketId: m.id, outcome: "YES", resolvedAt: nowIso, twoOfficer: false, singleOfficer: true, sourceUrl: "https://bot.go.tz",
    objectionsClosedAt: null, serverNow: Date.now(), yesPool: m.yesPool, noPool: m.noPool,
    fee: P.poolFee(m.yesPool, m.noPool, svc.ratesFor(m), "YES"), rates: svc.ratesFor(m), stakeShare: figures, settledAt: nowIso,
  }));
  const m1 = await marketStore.get(M1.id), m3 = await marketStore.get(M3.id);
  rendered = {
    cardA: card(posA, M1.titleEn), cardC: card(posC, M2.titleEn), cardE: card(posE, M3.titleEn),
    panelM1: panel(m1, R.stakeShareMarketFigures({ ...m1, resolvedOutcome: "YES" }, svc.ratesFor(m1))),
    panelM3: panel(m3, null),
  };
} catch (e) {
  ok("6.r · the card and the panel RENDER in the root layout's providers", false, String((e as Error)?.stack ?? e).slice(0, 400));
}
if (rendered) {
  const text = (s: string) => plain(s);
  const shareWin = dict.en.share.shareWin;
  ok("6.6 · ★ the rendered card of a win paid below its stake: no struck gilt payout, no \"Share win\", and \"Less than your stake came back\"",
    !rendered.cardC.includes("gilt-ink") && !text(rendered.cardC).includes(shareWin) && text(rendered.cardC).includes(dict.en.payoutTax.belowShort), text(rendered.cardC).slice(0, 300));
  ok("6.7 · CONTROL · the gain's card strikes its payout in gilt, offers \"Share win\" and names the tax withheld under it",
    rendered.cardA.includes("gilt-ink") && text(rendered.cardA).includes(shareWin) && text(rendered.cardA).includes(fill(dict.en.payoutTax.afterTax, { amount: T(1_305) })), text(rendered.cardA).slice(0, 300));
  ok("6.8 · the legacy card is as it was: struck gilt, \"Share win\", no stake-share words",
    rendered.cardE.includes("gilt-ink") && text(rendered.cardE).includes(shareWin) && !text(rendered.cardE).includes("winnings tax"));
}

// ═══ §7 · the resolution panel and the officer's "as booked" ══════════════════════════════════════════════════════════
section("§7 · the public panel states the whole settlement; the officer's sums agree");
const m1Now = await marketStore.get(M1.id), m2Now = await marketStore.get(M2.id), m3Now = await marketStore.get(M3.id);
const fig1 = R.stakeShareMarketFigures({ ...m1Now, resolvedOutcome: "YES" }, svc.ratesFor(m1Now));
const fig2 = R.stakeShareMarketFigures({ ...m2Now, resolvedOutcome: "YES" }, svc.ratesFor(m2Now));
ok("7.1 · ★ the balanced market: our fee 2,600, the prize fund 8,700, the tax 1,305, paid to the winners 16,095 — at 13% and 15%",
  j(fig1) === j({ fee: 2_600, feeYes: 1_300, feeNo: 1_300, prizeFund: 8_700, winningsTax: 1_305, paidToWinners: 16_095, feePct: 13, taxPct: 15 }), j(fig1));
ok("7.2 · the lopsided market: fee 14,300, tax 1,305, paid 94,395 — pool − fee − tax, to the shilling",
  fig2?.fee === 14_300 && fig2?.winningsTax === 1_305 && fig2?.paidToWinners === 94_395 && 110_000 - 14_300 - 1_305 === 94_395, j(fig2));
ok("7.3 · ⛔ a legacy market, a void and a one-sided book have no stake-share figures",
  R.stakeShareMarketFigures({ ...m3Now, resolvedOutcome: "YES" }, svc.ratesFor(m3Now)) === null
    && R.stakeShareMarketFigures({ ...m1Now, resolvedOutcome: "VOID" }, svc.ratesFor(m1Now)) === null
    && R.stakeShareMarketFigures({ yesPool: 5_000, noPool: 0, resolvedOutcome: "YES" }, svc.ratesFor(m1Now)) === null);
const booked1 = R.stakeShareBooked(await svc.listPositionsForMarket(M1.id), fig1);
const booked2 = R.stakeShareBooked(await svc.listPositionsForMarket(M2.id), fig2);
ok("7.4 · ★ the officer's \"as booked\": Σ the positions' fees, taxes and winners' payouts equal the arithmetic, nothing missing",
  booked1.agrees && booked1.feeBooked === 2_600 && booked1.taxBooked === 1_305 && booked1.paidBooked === 16_095 && booked1.missing === 0 && booked2.agrees,
  j([booked1, booked2]));
ok("7.5 · CONTROL · a position stripped of its fee is named missing and the check refuses to agree",
  !R.stakeShareBooked([{ status: "WIN", finalPayout: 16_095, feeTzs: null, winningsTaxTzs: 1_305 }, { status: "LOSS", finalPayout: 0, feeTzs: 1_300, winningsTaxTzs: 0 }], fig1).agrees);
if (rendered) {
  const p1 = plain(rendered.panelM1), p3 = plain(rendered.panelM3);
  ok("7.6 · ★ the rendered panel: our fee (13% of every stake) 2,600 · winnings tax withheld (15%, for TRA) 1,305 · paid to the winners 16,095",
    p1.includes(`${fill(dict.en.payoutTax.panelFee, { pct: 13 })} ${T(2_600)}`) && p1.includes(`${fill(dict.en.payoutTax.panelTax, { pct: 15 })} ${T(1_305)}`)
      && p1.includes(`${dict.en.payoutTax.panelPaid} ${T(16_095)}`) && p1.includes(fill(dict.en.payoutTax.panelNote, { feePct: 13, taxPct: 15 })), p1.slice(0, 500));
  ok("7.7 · the legacy panel keeps its \"Platform fee\" row and carries no stake-share word",
    p3.includes(`${dict.en.market.resPlatformFee} ${T(1_300)}`) && !p3.includes("Winnings tax withheld") && !p3.includes("Paid to the winners"), p3.slice(0, 400));
}

// ═══ §8 · the officers' list ══════════════════════════════════════════════════════════════════════════════════════════
section("§8 · the officers' list names each tax a row withheld, and never sums them");
ok("8.1 · a stake-share payout row withheld the winnings tax: 1,305", j(taxWithheldOf(txC)) === j({ amount: 1_305, kind: "winnings" }), j(taxWithheldOf(txC)));
ok("8.2 · an agent's commission row withheld the agent's own withholding — named apart",
  j(taxWithheldOf({ type: "AGENT_COMMISSION", taxWithheld: 58 })) === j({ amount: 58, kind: "agent" })
    && taxWithheldOf({ type: "AGENT_COMMISSION_REVERSAL", taxWithheld: 58 })?.kind === "agent");
ok("8.3 · a legacy payout and a stake withhold nothing", taxWithheldOf(txE) === null && taxWithheldOf({ type: "BET_PLACED", taxWithheld: 0 }) === null);

// ═══ §9 · the bet receipt and the close ═══════════════════════════════════════════════════════════════════════════════
section("§9 · the bet receipt names our fee; the close says its figures are after the fee and the tax");
const betA = (await bell(A, ["BET_PLACED"]))[0], betE = (await bell(Ep, ["BET_PLACED"]))[0];
ok("9.1 · ★ the stake-share bet notice: \"our 13% fee TZS 1,300, TZS 8,700 in the pool\" — then the free-exit terms, unchanged",
  (betA?.bodyEn ?? "").includes(`our 13% fee ${T(1_300)}, ${T(8_700)} in the pool · free exit within 0 min`) && (betA?.bodySw ?? "").includes(`ada yetu ya 13% ni ${T(1_300)}`)
    && (betA?.bodyZh ?? "").includes(`我们的 13% 手续费为 ${T(1_300)}`), betA?.bodyEn);
ok("9.2 · the legacy bet notice is byte for byte its old sentence", betE?.bodyEn === `${M3.titleEn} · free exit within 0 min, then it locks to settlement.`, betE?.bodyEn);
const betLetterA = plain(letters(A, "bet-placed")[0]?.html ?? ""), betLetterE = plain(letters(Ep, "bet-placed")[0]?.html ?? "");
ok("9.3 · the stake-share bet letter: rows \"Our fee (13%) TZS 1,300\" and \"In the pool TZS 8,700\", the note with the 15% tax",
  betLetterA.includes(`Our fee (13%) ${T(1_300)}`) && betLetterA.includes(`In the pool ${T(8_700)}`) && betLetterA.includes(fill(dict.en.payoutTax.betFeeNote, { pct: 13, taxPct: 15 })), betLetterA.slice(0, 400));
ok("9.4 · the legacy bet letter has no fee row", betLetterE.length > 100 && !betLetterE.includes("Our fee") && !betLetterE.includes("In the pool"));
const closeC = (await bell(C, ["SELECTION_CLOSED"]))[0], closeD = (await bell(D, ["SELECTION_CLOSED"]))[0], closeA = (await bell(A, ["SELECTION_CLOSED"]))[0], closeE = (await bell(Ep, ["SELECTION_CLOSED"]))[0];
const after = fill(dict.en.payoutTax.closedAfter, { feePct: 13, taxPct: 15 });
const belowC = fill(dict.en.payoutTax.closedBelow, { stake: T(100_000) });
ok("9.5 · ★ the lopsided close tells C its 94,395 is after the fee and the tax AND less than its 100,000 stake",
  (closeC?.bodyEn ?? "").includes(`receive ${T(94_395)}.`) && (closeC?.bodyEn ?? "").includes(after) && (closeC?.bodyEn ?? "").includes(belowC)
    && (closeC?.bodySw ?? "").includes(fill(dict.sw.payoutTax.closedBelow, { stake: T(100_000) })), closeC?.bodyEn);
ok("9.6 · …the other side (D, paid 82,650 if NO wins) and the balanced winner are told the after-fee sentence only",
  (closeD?.bodyEn ?? "").includes(after) && !(closeD?.bodyEn ?? "").includes("less than your") && (closeA?.bodyEn ?? "").includes(after) && !(closeA?.bodyEn ?? "").includes("less than your"),
  j([closeD?.bodyEn, closeA?.bodyEn]));
ok("9.7 · the legacy close says nothing new", !!closeE && !(closeE.bodyEn ?? "").includes("our 13% fee") && !(closeE.bodyEn ?? "").includes(after), closeE?.bodyEn);
const closeLetterC = plain(letters(C, "selection-closed")[0]?.html ?? "");
ok("9.8 · the close letter carries the same two sentences in English and Swahili",
  closeLetterC.includes(after) && closeLetterC.includes(belowC) && closeLetterC.includes(fill(dict.sw.payoutTax.closedAfter, { feePct: 13, taxPct: 15 })), closeLetterC.slice(0, 400));

// ═══ §10 · Up & Down ══════════════════════════════════════════════════════════════════════════════════════════════════
section("§10 · Up & Down: the round's bell and the daily digest");
const U = await player("ud");
const TITLE = { en: "Bitcoin Up or Down", sw: "Bitcoin Juu au Chini", zh: "比特币涨跌" };
const udBelow = await N.notifyUpDownWin(U, { payout: 94_395, stake: 100_000, marketTitle: TITLE, roundHref: "/updown/udr_ssr_1", pushTag: "updown-result-mkt_ssr_1", positionId: "pos_ssr_1", stakeShare: { receipt: rC, taxPct: 15 } });
const udGain = await N.notifyUpDownWin(U, { payout: 16_095, stake: 10_000, marketTitle: TITLE, roundHref: "/updown/udr_ssr_2", pushTag: "updown-result-mkt_ssr_2", positionId: "pos_ssr_2", stakeShare: { receipt: rA, taxPct: 15 } });
const udLegacy = await N.notifyUpDownWin(U, { payout: 8_700, stake: 5_000, marketTitle: TITLE, roundHref: "/updown/udr_ssr_3", pushTag: "updown-result-mkt_ssr_3", positionId: "pos_ssr_3" });
ok("10.1 · ★ the round won below its stake is a result row, \"Returned …\", linked to its round — never a WIN",
  udBelow?.kind === "ROUND_RESULT" && udBelow?.titleEn === `Returned ${T(94_395)} of your ${T(100_000)} stake` && (udBelow?.href ?? "").startsWith("/updown/udr_ssr_1")
    && !/You won|Umeshinda|您赢得/.test(`${udBelow?.titleEn}${udBelow?.titleSw}${udBelow?.titleZh}`), j([udBelow?.kind, udBelow?.titleEn]));
ok("10.2 · the round's gain names its parts; the legacy round's win is its old row",
  udGain?.kind === "WIN" && partsIn(udGain?.bodyEn ?? "", [10_000, 1_300, 8_700, 1_305]) && udLegacy?.kind === "WIN"
    && udLegacy?.bodyEn === `${TITLE.en} · paid to your wallet.`, j([udGain?.bodyEn, udLegacy?.bodyEn]));
// The digest's aggregate over a stake-share day, on the memory twin (the SQL twin's columns are the same predicates).
const DAYKEY = "2026-08-02";
const { eatDayStartMs }: Any = await import("../src/lib/eat-day.ts");
const from = eatDayStartMs(DAYKEY), to = from + 24 * 3600_000;
await marketStore.set({ ...(await marketStore.get(M1.id)), id: "mkt_ssr_ud", productLine: "UPDOWN", titleEn: "ssr round" });
let k = 0;
const udPos = (o: Any) => positionStore.set({ id: `pos_ssr_ud_${++k}`, userId: U, marketId: "mkt_ssr_ud", side: "YES", bonusStakeTzs: 0, potentialPayout: 0, placedAt: nowIso, idempotencyKey: null, settledAt: new Date(from + k * 60_000).toISOString(), ...o });
await udPos({ status: "WIN", stake: 100_000, finalPayout: 94_395, feeTzs: 13_000, winningsTaxTzs: 1_305 });
await udPos({ status: "WIN", stake: 10_000, finalPayout: 16_095, feeTzs: 1_300, winningsTaxTzs: 1_305 });
await udPos({ status: "LOSS", stake: 5_000, finalPayout: 0, feeTzs: 650, winningsTaxTzs: 0 });
const totals = ((await positionStore.dailyTotalsByUser({ fromIso: new Date(from).toISOString(), toIso: new Date(to).toISOString(), productLine: "UPDOWN" })) as Any[]).find((t) => t.userId === U);
ok("10.3 · the aggregate counts the below-stake win apart and sums the tax withheld — and every win is still a win, never a refund (memory twin)",
  totals?.wins === 2 && totals?.losses === 1 && totals?.refunds === 0 && totals?.wonPayout === 110_490 && totals?.refundedStake === 0
    && totals?.belowStakeWins === 1 && totals?.belowStakePayout === 94_395 && totals?.belowStakeStake === 100_000 && totals?.winningsTax === 2_610,
  j(totals));
const copy = totals ? digestCopy({ userId: U, dayKey: DAYKEY, totals, net: totals.returned - totals.staked }) : null;
ok("10.4 · ★ the digest: \"won 1\" for the gain only, \"1 paid back less than staked (TZS 94,395 of TZS 100,000)\", and the tax sentence — in three languages",
  !!copy && copy.bodyEn.includes(`won 1 (${T(16_095)} paid)`) && copy.bodyEn.includes(fill(dict.en.payoutTax.digestBelow, { n: 1, paid: `TZS 94,395`, stake: `TZS 100,000` }))
    && copy.bodyEn.endsWith(fill(dict.en.payoutTax.digestTax, { amount: "TZS 2,610" })) && copy.bodySw.includes(fill(dict.sw.payoutTax.digestBelow, { n: 1, paid: "TZS 94,395", stake: "TZS 100,000" }))
    && copy.bodyZh.includes(fill(dict.zh.payoutTax.digestTax, { amount: "TZS 2,610" })), copy?.bodyEn);
ok("10.5 · ⛔ the day's title is its true net (it LOST 115,000 − 110,490 = 4,510), never a gain",
  !!copy && copy.titleEn === "Up & Down · you lost TZS 4,510", copy?.titleEn);
const legacyCopy = digestCopy({ userId: U, dayKey: DAYKEY, net: 7_400, totals: { userId: U, rounds: 2, ownRounds: 2, wins: 2, losses: 0, refunds: 0, wonPayout: 17_400, lostStake: 0, refundedStake: 0, staked: 10_000, returned: 17_400 } });
ok("10.6 · CONTROL · a day with no stake-share round reads exactly as before (no new clause, no tax sentence)",
  legacyCopy.bodyEn.endsWith(`— won 2 (TZS 17,400 paid). Staked TZS 10,000, returned TZS 17,400.`), legacyCopy.bodyEn);
const digestLetter = plain(E.updownDigestHtml({ dayLabel: "2 Aug", rounds: 3, wins: 2, losses: 1, refunds: 0, wonPayout: 110_490, lostStake: 5_000, refundedStake: 0, staked: 115_000, returned: 110_490, net: -4_510, belowStakeWins: 1, belowStakePayout: 94_395, winningsTax: 2_610 }));
ok("10.7 · the digest letter: \"Won (1)\" the gain's 16,095, its own \"Paid back less than staked (1)\" row, the tax row",
  digestLetter.includes(`Won (1) ${T(16_095)}`) && digestLetter.includes(`${fill(dict.en.payoutTax.digestBelowRow, { n: 1 })} ${T(94_395)}`)
    && digestLetter.includes(`${dict.en.payoutTax.winningsTax} ${T(2_610)}`), digestLetter.slice(0, 500));

// ═══ §11 · the /agent waterfall ═══════════════════════════════════════════════════════════════════════════════════════
section("§11 · the /agent waterfall on stakes: the same figures, the stakes words, never the winnings tax");
const WF = { platformFeeRate: 0.03, operatorFeeRate: 0.10, traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05, agentPct: 10, withholdingPct: 5 };
const onStakes = commissionWaterfall(1_000_000, { ...WF, base: "stakes" });
const onWinnings = commissionWaterfall(1_000_000, WF);
const amounts = (w: Any) => w.steps.map((s: Any) => s.amountTzs);
ok("11.1 · ★ re-based on stakes: 1,000,000 → 130,000 / 13,000 / 6,500 / 110,500 / 11,050 / 553 / 10,497, its first row `stakes`",
  onStakes.base === "stakes" && onStakes.steps[0].id === "stakes" && j(amounts(onStakes)) === j([1_000_000, 130_000, 13_000, 6_500, 110_500, 11_050, 553, 10_497])
    && Math.abs(onStakes.effectivePct - 1.0497) < 1e-9, j(amounts(onStakes)));
ok("11.2 · CONTROL · the winnings base is the table it always was, row for row", onWinnings.base === "winnings" && onWinnings.steps[0].id === "winnings" && j(amounts(onWinnings)) === j(amounts(onStakes)));
try {
  const React = req("react") as Any;
  const { renderToStaticMarkup } = req("react-dom/server") as Any;
  const { CommissionWaterfall } = req("../src/components/agent/commission-waterfall.tsx") as Any;
  for (const l of LOCALES) {
    const a = dict[l].agent;
    const s = plain(renderToStaticMarkup(React.createElement(CommissionWaterfall, { t: dict[l], rates: { ...WF, base: "stakes" } })));
    const w = plain(renderToStaticMarkup(React.createElement(CommissionWaterfall, { t: dict[l], rates: WF })));
    ok(`11.3.${l} · the stakes table speaks of stakes (base, fee row, effective line) and never of winnings; the winnings table is unchanged`,
      s.includes(a.wfStakes) && s.includes(fill(a.wfGrossFeeStakes, { pct: "13" })) && s.includes(fill(a.wfEffectiveStakes, { pct: "1.05" }))
        && !s.includes(a.wfWinnings) && !s.includes(a.wfGrossFeeNote) && w.includes(a.wfWinnings) && w.includes(fill(a.wfEffective, { pct: "1.05" })) && !w.includes(a.wfStakes),
      s.slice(0, 200));
  }
} catch (e) {
  ok("11.3 · the waterfall RENDERS", false, String((e as Error)?.stack ?? e).slice(0, 400));
}

console.log(`\nstake-share-receipts: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
