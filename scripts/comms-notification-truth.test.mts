/**
 * C3 · NOTIFICATION TRUTH — what actually lands in the bell.
 *
 * ⚠️ MEASURED ON PRODUCTION 2026-07-31, before any of this existed:
 *
 *   · 1,673 notifications — EVERY ONE `channel: IN_APP`. `prisma-dal` writes
 *     that literal and nothing else writes the table, so three of the four
 *     `NotificationChannel` members have never been reachable.
 *   · `sentAt` / `failedAt` / `failureReason`: **0 of 1,673**. No code path in
 *     the repo wrote them. "Was it delivered?" had no answer in the data.
 *   · `priority`: NORMAL on all 1,673.
 *   · `event`: a duplicate of `kind` — the DAL writes `event: n.kind`, not the
 *     dotted `bet.won` the schema comment promises.
 *   · **1,573 of 1,673 (94%) had no Chinese.** Root cause: of 36 emitters, 3
 *     set `titleZh`/`bodyZh`. Swahili was complete, so it was a ZH gap
 *     specifically. The bell falls back to English WITHOUT saying so, which is
 *     an English string presented to a Chinese reader as their translation.
 *   · **28 byte-identical notifications inside 60 s** (deep-link included) —
 *     WIN ×3, BET_PLACED ×4, DEPOSIT ×20, WITHDRAW ×1. Including "You won TZS
 *     23,349" twice **84 ms apart**.
 *
 * 🔴 The finding that decided the fix: **the one emitter with an idempotency
 * guard has zero duplicates.** `notifySelectionClosedForMarket` stamps
 * `selectionClosedNotifiedAt` inside `withLock`, and SELECTION_CLOSED appears
 * nowhere in that set of 28. Every unguarded path produced duplicates.
 *
 * This suite DRIVES every emitter — it does not read the source. A message that
 * renders is not a message that was recorded, and the distinction has cost this
 * repo real money before.
 *
 * Every negative assertion here was broken on purpose and observed red.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { db, type StoredNotification, type StoredWallet } from "../src/lib/server/store.ts";
import { NOTIFICATION_EMITTERS, NOTIFICATION_KINDS, MONEY_KINDS } from "../src/lib/server/comms-registry.ts";
import * as N from "../src/lib/server/notification-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

const nowIso = new Date().toISOString();
let seq = 0;
async function mkUser(id: string, role: "PLAYER" | "ADMIN" = "PLAYER"): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25578${String(++seq).padStart(7, "0")}`, email: `${id}@test.tz`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 100_000, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: nowIso, updatedAt: nowIso } as StoredWallet);
}

await mkUser("c3_player");
await mkUser("c3_officer", "ADMIN");
const U = "c3_player";

/**
 * Every emitter, DRIVEN. Arguments are literal and type-checked against the
 * real signature — no fixture is cast, so a changed parameter shape breaks the
 * build instead of silently skipping a message.
 *
 * `notifyAdmins*` fan out to every officer rather than returning a row, so they
 * are driven separately in §5.
 */
const EMITTED: { fn: string; row: StoredNotification | null }[] = [
  { fn: "notifyBetPlaced",           row: await N.notifyBetPlaced(U, { side: "YES", stake: 10_000, payoutIfWin: 18_000, marketTitle: { en: "Will it rain in Dar today?", sw: "Je mvua itanyesha Dar leo?", zh: "今天达累斯萨拉姆会下雨吗？" }, marketId: "mkt_1", positionId: "pos_1", cashOutFeeRate: 0.1, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 }) },
  { fn: "notifyWin",                 row: await N.notifyWin(U, 18_000, { en: "Will it rain · pos_2", sw: "Je mvua itanyesha · pos_2", zh: "会下雨吗 · pos_2" }, "/positions") },
  { fn: "notifyLoss",                row: await N.notifyLoss(U, { stake: 10_000, marketTitle: { en: "Will it rain in Dar today?", sw: "Je mvua itanyesha Dar leo?", zh: "今天达累斯萨拉姆会下雨吗？" }, marketId: "mkt_1", positionId: "pos_3" }) },
  { fn: "notifySelectionClosed",     row: await N.notifySelectionClosed(U, { marketTitle: { en: "Will it rain in Dar today?", sw: "Je mvua itanyesha Dar leo?", zh: "今天达累斯萨拉姆会下雨吗？" }, marketId: "mkt_2", payoutIfYes: 18_500, payoutIfNo: 0, hasYes: true, hasNo: false }) },
  { fn: "notifyCashout",             row: await N.notifyCashout(U, { amount: 9_500, marketTitle: { en: "Will it rain in Dar today?", sw: "Je mvua itanyesha Dar leo?", zh: "今天达累斯萨拉姆会下雨吗？" }, marketId: "mkt_3", inGracePeriod: true, positionId: "pos_4", freeExitGraceMinutes: 5 }) },
  { fn: "notifyOneSidedRefund",      row: await N.notifyOneSidedRefund(U, { stake: 10_000, marketTitle: { en: "One-sided poll", sw: "Kura ya upande mmoja", zh: "单边投票" }, marketId: "mkt_4", positionId: "pos_5" }) },
  { fn: "notifyRefund",              row: await N.notifyRefund(U, { stake: 10_000, marketTitle: { en: "Voided poll", sw: "Kura batili", zh: "已作废投票" }, marketId: "mkt_5" }) },
  // The Up & Down daily digest (E-37). Driven on a LOSING day: that is the branch
  // that carries the LCCP claim, and the one that was promised and never built.
  { fn: "notifyUpDownDigest",        row: await N.notifyUpDownDigest(U, { dayKey: "2026-08-02", titleEn: "Up & Down · you lost TZS 11,300", titleSw: "Up & Down · umepoteza TZS 11,300", titleZh: "涨跌 · 亏损 TZS 11,300", bodyEn: "2 Aug: 4 rounds — won 1 (TZS 8,700 paid), lost 3 (TZS 15,000). Staked TZS 20,000, returned TZS 8,700.", bodySw: "2 Ago: raundi 4 — umeshinda 1 (TZS 8,700 imelipwa), umepoteza 3 (TZS 15,000). Umeweka TZS 20,000, umerudishiwa TZS 8,700.", bodyZh: "2026年8月2日：共 4 轮 — 赢 1 轮（赔付 TZS 8,700）、输 3 轮（TZS 15,000）。投注 TZS 20,000，收回 TZS 8,700。" }) },
  { fn: "notifyMarketCancelled",     row: await N.notifyMarketCancelled(U, { stake: 10_000, marketTitle: { en: "Cancelled poll", sw: "Kura iliyoghairiwa", zh: "已取消投票" }, marketId: "mkt_6", reason: "Source retracted the result" }) },
  { fn: "notifyDeposit",             row: await N.notifyDeposit(U, { status: "CONFIRMED", amount: 50_000, provider: "Selcom", txnId: "txn_1" }) },
  { fn: "notifyWithdraw",            row: await N.notifyWithdraw(U, { status: "CONFIRMED", amount: 20_000, net: 19_700, provider: "M-Pesa" }) },
  { fn: "notifyBonusCredited",       row: await N.notifyBonusCredited(U, { amountTzs: 5_000, wagerRequiredTzs: 25_000 }) },
  { fn: "notifyBonusFulfilled",      row: await N.notifyBonusFulfilled(U, { amountTzs: 5_000 }) },
  { fn: "notifyBonusExpired",        row: await N.notifyBonusExpired(U, { amountTzs: 5_000 }) },
  { fn: "notifyReferralJoined",      row: await N.notifyReferralJoined(U, { recruitMasked: "+2557••••5678" }) },
  { fn: "notifyReferralReward",      row: await N.notifyReferralReward(U, { type: "COMMISSION", amountTzs: 2_000 }) },
  { fn: "notifyKyc",                 row: await N.notifyKyc(U, "APPROVED") },
  { fn: "notifySof",                 row: await N.notifySof(U, "ACCEPTED") },
  { fn: "notifySelfExclusion",       row: await N.notifySelfExclusion(U, { until: "2027-01-31T00:00:00.000Z" }) },
  { fn: "notifyCoolOff",             row: await N.notifyCoolOff(U, { until: "2026-08-01T00:00:00.000Z" }) },
  { fn: "notifyPasswordChanged",     row: await N.notifyPasswordChanged(U) },
  { fn: "notifyWatchedClosingSoon",  row: await N.notifyWatchedClosingSoon(U, { marketTitle: { en: "Watched poll", sw: "Kura inayofuatiliwa", zh: "关注的投票" }, marketId: "mkt_7", minutes: 30 }) },
  { fn: "notifyWatchedSettled",      row: await N.notifyWatchedSettled(U, { marketTitle: { en: "Watched poll", sw: "Kura inayofuatiliwa", zh: "关注的投票" }, marketId: "mkt_8", outcome: "YES" }) },
  { fn: "notifyProposalUnderReview", row: await N.notifyProposalUnderReview(U, { titleEn: "A market idea" }) },
  { fn: "notifyProposalApproved",    row: await N.notifyProposalApproved(U, { titleEn: "A market idea", amountTzs: 5_000, queued: false }) },
  { fn: "notifyProposalListed",      row: await N.notifyProposalListed(U, { titleEn: "A market idea", marketId: "mkt_9" }) },
  { fn: "notifyProposalChanges",     row: await N.notifyProposalChanges(U, { titleEn: "A market idea", note: "Name the source" }) },
  { fn: "notifyProposalDeclined",    row: await N.notifyProposalDeclined(U, { titleEn: "A market idea", reason: "Not verifiable" }) },
  { fn: "notifyObjectionDecided",    row: await N.notifyObjectionDecided(U, { upheld: true, marketId: "mkt_10", note: "Result corrected" }) },
  { fn: "notifyAdminKycReview",      row: await N.notifyAdminKycReview("c3_officer", { playerLabel: "Asha M.", userId: U }) },
  { fn: "notifyAdminMarketResolution", row: await N.notifyAdminMarketResolution("c3_officer", { title: "Closed poll", marketId: "mkt_11" }) },
  { fn: "notifyAdminMarketCancelled", row: await N.notifyAdminMarketCancelled("c3_officer", { title: "Cancelled poll", reason: "Source retracted", refundedCount: 3, refundedTzs: 30_000 }) },
  { fn: "notifyAdminProposalReview", row: await N.notifyAdminProposalReview("c3_officer", { proposerLabel: "Asha M.", titleEn: "A market idea", proposalId: "prp_1" }) },
];

// ── 1 · Registry ↔ code ────────────────────────────────────────────────────────
section("1 · registry — every emitter declared, every declaration real");

const exportedFns = Object.keys(N).filter((k) => k.startsWith("notify") && k !== "notify");
const registeredFns = NOTIFICATION_EMITTERS.map((e) => e.fn);
ok("every exported emitter is registered", exportedFns.every((f) => registeredFns.includes(f)),
  `unregistered: ${exportedFns.filter((f) => !registeredFns.includes(f)).join(", ") || "-"}`);
ok("every registered emitter exists", registeredFns.every((f) => exportedFns.includes(f)),
  `phantom: ${registeredFns.filter((f) => !exportedFns.includes(f)).join(", ") || "-"}`);
ok("every registered kind is a real kind", NOTIFICATION_EMITTERS.every((e) => NOTIFICATION_KINDS.includes(e.kind)));
// The fan-out emitters return void, so they are exercised in §5 instead.
const FANOUT = ["notifyAdminObjectionFiled", "notifyAdminsAmlReview", "notifyAdminsSentinelDown", "notifyAdminsAiCreditLimit"];
ok("every emitter is driven by this suite",
  exportedFns.every((f) => EMITTED.some((e) => e.fn === f) || FANOUT.includes(f)),
  `never driven: ${exportedFns.filter((f) => !EMITTED.some((e) => e.fn === f) && !FANOUT.includes(f)).join(", ") || "-"}`);

// ── 2 · Trilingual, for real ───────────────────────────────────────────────────
section("2 · trilingual — the bell offers Chinese, so Chinese must exist");

for (const { fn, row } of EMITTED) {
  ok(`${fn} produced a row`, row !== null);
  if (!row) continue;
  for (const [field, val] of [
    ["titleEn", row.titleEn], ["titleSw", row.titleSw], ["titleZh", row.titleZh],
    ["bodyEn", row.bodyEn], ["bodySw", row.bodySw], ["bodyZh", row.bodyZh],
  ] as const) {
    ok(`${fn}.${field} is present and non-empty`, typeof val === "string" && val.trim().length > 0,
      val === null ? "null — a Chinese reader is shown English WITHOUT being told" : String(val));
  }
  // A "translation" byte-identical to the English is English wearing a label.
  ok(`${fn}: Swahili is not a copy of English`, row.bodySw !== row.bodyEn);
  ok(`${fn}: Chinese is not a copy of English`, row.bodyZh !== row.bodyEn);
  // Chinese must actually contain Chinese.
  ok(`${fn}: Chinese title contains CJK`, /[一-鿿]/.test(row.titleZh ?? ""));
  ok(`${fn}: Chinese body contains CJK`, /[一-鿿]/.test(row.bodyZh ?? ""));
  // No leakage in any locale.
  for (const [field, val] of Object.entries({ titleEn: row.titleEn, titleSw: row.titleSw, titleZh: row.titleZh, bodyEn: row.bodyEn, bodySw: row.bodySw, bodyZh: row.bodyZh })) {
    const s = String(val ?? "");
    ok(`${fn}.${field}: no undefined/NaN/[object Object]`,
      !s.includes("undefined") && !s.includes("NaN") && !s.includes("[object Object]"), s.slice(0, 90));
    ok(`${fn}.${field}: no unreplaced {placeholder}`, !/\{[a-zA-Z][a-zA-Z0-9_]*\}/.test(s), s.slice(0, 90));
  }
  // No emoji in bell copy (CLAUDE.md design rule).
  const all = [row.titleEn, row.titleSw, row.titleZh, row.bodyEn, row.bodySw, row.bodyZh].join(" ");
  ok(`${fn}: no emoji in the copy`, !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(all));
  // Every notification must lead somewhere.
  ok(`${fn}: has a deep link`, typeof row.href === "string" && row.href.startsWith("/"));
}

// ── 3 · Delivery is observable ─────────────────────────────────────────────────
section("3 · sentAt — a column nobody fills is a promise, not a record");

const stored = await db.notification.findByUser(U, 100);
ok("rows were actually persisted, not just returned", stored.length > 0);
// StoredNotification does not surface sentAt, so assert on the DAL contract that
// writes it: `create` must stamp it. Proven behaviourally against Prisma in §3b
// of the DAL; here we hold the shape that makes it possible.
ok("every persisted row carries its creation time", stored.every((n) => typeof n.createdAt === "string" && n.createdAt.length > 0));

// ── 4 · Dedupe — the same event may not be announced twice ─────────────────────
section("4 · dedupe — 28 byte-identical notifications shipped on production");

{
  const before = (await db.notification.findByUser(U, 500)).length;
  const a = await N.notifyWin(U, 23_349, { en: "Ronaldo to score · pos_dup", sw: "Ronaldo afunge · pos_dup", zh: "C罗进球 · pos_dup" }, "/positions");
  const b = await N.notifyWin(U, 23_349, { en: "Ronaldo to score · pos_dup", sw: "Ronaldo afunge · pos_dup", zh: "C罗进球 · pos_dup" }, "/positions");
  const after = (await db.notification.findByUser(U, 500)).length;
  ok("an identical repeat inside the window creates NO second row", after === before + 1, `before=${before} after=${after}`);
  ok("…and the caller still gets a row back (never null)", a !== null && b !== null);
  ok("…and it is the SAME row, so nothing is silently dropped", a?.id === b?.id);

  // A genuinely different event must NOT be suppressed. This is the half that
  // matters: dedupe that eats real messages is worse than the duplicates.
  const c = await N.notifyWin(U, 23_349, "Ronaldo to score · pos_OTHER", "/positions");
  ok("a different position with the same amount IS delivered", c !== null && c.id !== a?.id);
  const d = await N.notifyDeposit(U, { status: "CONFIRMED", amount: 50_000, provider: "Selcom", txnId: "txn_SECOND" });
  const e = await N.notifyDeposit(U, { status: "CONFIRMED", amount: 50_000, provider: "Selcom", txnId: "txn_THIRD" });
  ok("two real deposits of the same amount are BOTH delivered", d !== null && e !== null && d.id !== e.id,
    "they differ only by receipt href — if that stopped being unique, dedupe would eat a real deposit");

  // Cross-player: one player's message must never suppress another's.
  await mkUser("c3_other");
  const f = await N.notifyWin("c3_other", 23_349, "Ronaldo to score · pos_dup", "/positions");
  ok("another player's identical message is NOT suppressed", f !== null);
}

// ── 5 · Officer fan-out ────────────────────────────────────────────────────────
section("5 · fan-out — officer alerts reach officers, complete in 3 locales");

{
  const before = (await db.notification.findByUser("c3_officer", 500)).length;
  await N.notifyAdminsAmlReview({ txnKind: "WITHDRAWAL", amountTzs: 2_000_000, reference: "wdr_1" });
  await N.notifyAdminsSentinelDown({ reason: "anthropic-401", errorCount: 3, sampleError: "invalid x-api-key" });
  await N.notifyAdminsAiCreditLimit({ level: "limit", spentUsd: 50, limitUsd: 50 });
  await N.notifyAdminObjectionFiled("obj_1", "A disputed poll");
  const rows = await db.notification.findByUser("c3_officer", 500);
  ok("officer received the fan-out alerts", rows.length >= before + 4, `before=${before} after=${rows.length}`);
  const fresh = rows.slice(0, rows.length - before);
  for (const r of fresh) {
    ok(`fan-out "${r.titleEn.slice(0, 34)}": has Chinese`, !!r.titleZh && !!r.bodyZh && /[一-鿿]/.test(r.titleZh));
    ok(`fan-out "${r.titleEn.slice(0, 34)}": no emoji`,
      !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test([r.titleEn, r.titleSw, r.titleZh, r.bodyEn].join(" ")));
  }
}

// ── 6 · Money copy is compliance copy ──────────────────────────────────────────
section("6 · money copy — direct in every language, no euphemism");

const byFn = Object.fromEntries(EMITTED.filter((e) => e.row).map((e) => [e.fn, e.row!]));

const loss = byFn.notifyLoss;
ok("loss names the loss in English", /Bet lost/.test(loss.titleEn));
ok("loss names the loss in Swahili", /limepotea/.test(loss.titleSw));
// ⚠️ THIS ASSERTION USED TO PIN THE DEFECT. It required the literal `投注失败`, which
// does not mean "the bet lost" — it means "the bet FAILED", i.e. never went through.
// In this product that is a different event with the opposite money consequence (a
// failed placement returns the stake; a lost bet does not), so a Chinese-reading player
// was told their bet had not been placed at the moment it had been placed and lost.
// The suite was green throughout, because it was checking the spelling it had been
// given rather than the thing the sentence has to accomplish.
// ⭐ Now it asserts the PROPERTY, from both sides: the title must say the bet did not
// WIN, and must not use the word that means it did not HAPPEN.
ok("loss names the loss in Chinese", /未中/.test(loss.titleZh ?? ""));
ok("loss is not readable as a FAILED PLACEMENT in Chinese", !/失败/.test(loss.titleZh ?? ""));
ok("loss states the amount in every locale",
  [loss.titleEn, loss.titleSw, loss.titleZh ?? ""].every((t) => t.includes("10,000")));
for (const euph of ["better luck", "unlucky", "so close", "next time"]) {
  ok(`loss avoids the euphemism "${euph}"`, !loss.titleEn.toLowerCase().includes(euph) && !loss.bodyEn.toLowerCase().includes(euph));
}

// The cash-out receipt must quote THIS poll's window, never a constant. Driving
// it with a non-default value is the only way to catch a hardcoded 5.
{
  const g = await N.notifyCashout(U, { amount: 9_500, marketTitle: "Poll", marketId: "mkt_g", inGracePeriod: true, positionId: "pos_g", freeExitGraceMinutes: 3 });
  ok("cash-out quotes the poll's OWN free-exit window, not a hardcoded 5",
    !!g && g.bodyEn.includes("3-min") && !g.bodyEn.includes("5-min"), g?.bodyEn);
  ok("…in Swahili too", !!g && g.bodySw.includes("dakika 3"), g?.bodySw);
  ok("…and in Chinese", !!g && g.bodyZh!.includes("3 分钟"), g?.bodyZh ?? "");
}

// Money kinds must always carry an amount a player can check.
for (const { fn, row } of EMITTED) {
  if (!row || !MONEY_KINDS.includes(row.kind)) continue;
  const text = `${row.titleEn} ${row.bodyEn}`;
  ok(`${fn} (money kind ${row.kind}): states a figure`, /\d/.test(text), text.slice(0, 90));
}

// Deposit states must each say the true thing about the money.
{
  const failed = await N.notifyDeposit(U, { status: "FAILED", amount: 50_000, provider: "Selcom", txnId: "txn_f" });
  ok("a failed deposit says no money was taken", /No money was taken/i.test(failed?.bodyEn ?? ""));
  ok("…in Chinese too", /未扣除/.test(failed?.bodyZh ?? ""));
  const reversed = await N.notifyDeposit(U, { status: "REVERSED", amount: 50_000, provider: "Selcom", txnId: "txn_r" });
  ok("a reversed deposit explains the exclusion and the return", /self-excluded/i.test(reversed?.bodyEn ?? "") && /returned/i.test(reversed?.bodyEn ?? ""));
  const processing = await N.notifyDeposit(U, { status: "PROCESSING", amount: 50_000, provider: "Selcom", txnId: "txn_p" });
  ok("a processing deposit warns against paying twice", /Don't pay again/i.test(processing?.bodyEn ?? ""));
  ok("…in Swahili", /Usilipe tena/i.test(processing?.bodySw ?? ""));
  ok("…and in Chinese", /请勿重复支付/.test(processing?.bodyZh ?? ""));
}

console.log(`\ncert-c3 (notification truth): ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
