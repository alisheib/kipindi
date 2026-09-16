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
  // S1 (2026-09-13) — an officer's decision on a finally-refused player's balance, one row per outcome shape.
  { fn: "notifyRefusedFundsDecision", row: await N.notifyRefusedFundsDecision(U, { outcome: "RETURN_DEPOSITS", returnedTzs: 20_000, forfeitedTzs: 5_000, balanceTzs: 25_000 }) },
  { fn: "notifyRefusedFundsDecision", row: await N.notifyRefusedFundsDecision(U, { outcome: "HOLD_PENDING_APPEAL", returnedTzs: 0, forfeitedTzs: 0, balanceTzs: 25_000 }) },
  { fn: "notifyRefusedFundsDecision", row: await N.notifyRefusedFundsDecision(U, { outcome: "FORFEIT", returnedTzs: 0, forfeitedTzs: 25_000, balanceTzs: 25_000 }) },
  // 2026-09-14 — the follow-up when a decided return's payout failed: with a forfeited part, and without one.
  { fn: "notifyRefusedFundsReturnFailed", row: await N.notifyRefusedFundsReturnFailed(U, { amountTzs: 20_000, forfeitedTzs: 5_000 }) },
  { fn: "notifyRefusedFundsReturnFailed", row: await N.notifyRefusedFundsReturnFailed(U, { amountTzs: 25_000, forfeitedTzs: 0 }) },
  { fn: "notifySof",                 row: await N.notifySof(U, "ACCEPTED") },
  { fn: "notifySelfExclusion",       row: await N.notifySelfExclusion(U, { until: "2027-01-31T00:00:00.000Z" }) },
  { fn: "notifyCoolOff",             row: await N.notifyCoolOff(U, { until: "2026-08-01T00:00:00.000Z" }) },
  { fn: "notifyPasswordChanged",     row: await N.notifyPasswordChanged(U) },
  { fn: "notifyWatchedClosingSoon",  row: await N.notifyWatchedClosingSoon(U, { marketTitle: { en: "Watched poll", sw: "Kura inayofuatiliwa", zh: "关注的投票" }, marketId: "mkt_7", minutes: 30 }) },
  { fn: "notifyWatchedSettled",      row: await N.notifyWatchedSettled(U, { marketTitle: { en: "Watched poll", sw: "Kura inayofuatiliwa", zh: "关注的投票" }, marketId: "mkt_8", outcome: "YES" }) },
  { fn: "notifyProposalUnderReview", row: await N.notifyProposalUnderReview(U, { titleEn: "A market idea" }) },
  { fn: "notifyProposalApproved",    row: await N.notifyProposalApproved(U, { titleEn: "A market idea", amountTzs: 5_000, queued: false }) },
  // ── Up & Down per-round result rows (owner decision 2026-08-22). All four are driven,
  // because §1's "every emitter is driven by this suite" is what stops a new outcome from
  // shipping untested — and E-43 is the finding that proves a MISSING outcome is the
  // failure mode this product actually has.
  //
  // ⚠️ Distinct titles per outcome on purpose: §4's dedupe check and the 90-second window
  // in `notify()` key on the rendered message plus the href, so reusing one stake figure
  // and one href across all four would have the later three swallowed and the suite would
  // then assert `row !== null` against a deduped row rather than a fresh one.
  { fn: "notifyUpDownWin",             row: await N.notifyUpDownWin(U, { payout: 8_700, stake: 5_000, marketTitle: { en: "Bitcoin Up or Down", sw: "Bitcoin Juu au Chini", zh: "比特币涨跌" }, roundHref: "/updown/udr_c3_win", pushTag: "updown-result-mkt_c3_win", positionId: "pos_c3_win" }) },
  { fn: "notifyUpDownLoss",            row: await N.notifyUpDownLoss(U, { stake: 5_000, marketTitle: { en: "Bitcoin Up or Down", sw: "Bitcoin Juu au Chini", zh: "比特币涨跌" }, roundHref: "/updown/udr_c3_loss", pushTag: "updown-result-mkt_c3_loss", positionId: "pos_c3_loss" }) },
  { fn: "notifyUpDownRefund",          row: await N.notifyUpDownRefund(U, { stake: 5_000, marketTitle: { en: "Gold Up or Down", sw: "Dhahabu Juu au Chini", zh: "黄金涨跌" }, roundHref: "/updown/udr_c3_void", pushTag: "updown-result-mkt_c3_void", positionId: "pos_c3_void" }) },
  { fn: "notifyUpDownOneSidedRefund",  row: await N.notifyUpDownOneSidedRefund(U, { stake: 5_000, marketTitle: { en: "Gold Up or Down", sw: "Dhahabu Juu au Chini", zh: "黄金涨跌" }, roundHref: "/updown/udr_c3_one", pushTag: "updown-result-mkt_c3_one", positionId: "pos_c3_one" }) },
  { fn: "notifyProposalListed",      row: await N.notifyProposalListed(U, { titleEn: "A market idea", marketId: "mkt_9" }) },
  { fn: "notifyProposalChanges",     row: await N.notifyProposalChanges(U, { titleEn: "A market idea", note: "Name the source" }) },
  { fn: "notifyProposalDeclined",    row: await N.notifyProposalDeclined(U, { titleEn: "A market idea", reason: "Not verifiable" }) },
  { fn: "notifyObjectionDecided",    row: await N.notifyObjectionDecided(U, { upheld: true, marketId: "mkt_10", note: "Result corrected" }) },
  // The seal-time notice (management ruling ①, 2026-09-05). Driven in BOTH shapes it can take:
  // a first verdict and a corrected one, because the two say different words in three languages
  // and §6's money-copy rules must hold for each. `paysFrom` is a formatted instant, never a
  // number of hours — that is the whole reason this message can be sent about a market sealed
  // under the old window as well as the new one.
  { fn: "notifyVerdictRecorded",     row: await N.notifyVerdictRecorded(U, { marketTitle: { en: "Sealed poll", sw: "Kura iliyofungwa", zh: "已封存的投票" }, marketId: "mkt_12", outcome: "YES", paysFrom: "5 Sep 2026, 14:32" }) },
  { fn: "notifyVerdictRecorded",     row: await N.notifyVerdictRecorded(U, { marketTitle: { en: "Sealed poll", sw: "Kura iliyofungwa", zh: "已封存的投票" }, marketId: "mkt_12", outcome: "NO", paysFrom: "5 Sep 2026, 15:47", reversed: true }) },
  { fn: "notifyAdminKycReview",      row: await N.notifyAdminKycReview("c3_officer", { playerLabel: "Asha M.", userId: U }) },
  // ── Agent affiliate programme ─────────────────────────────────────────────
  { fn: "notifyAgentApplicationSubmitted", row: await N.notifyAgentApplicationSubmitted(U, { applicationId: "agp_c3" }) },
  { fn: "notifyAgentApproved",       row: await N.notifyAgentApproved(U, { agentCode: "50PICK-AG-ABC234", commissionPct: 20 }) },
  { fn: "notifyAgentRejected",       row: await N.notifyAgentRejected(U, { refundDue: true, amountTzs: 100_000, reason: "DOCUMENT_NOT_LEGIBLE" }) },
  { fn: "notifyAgentInfoRequested",  row: await N.notifyAgentInfoRequested(U, { note: "A clearer copy of the second referee's ID" }) },
  { fn: "notifyAgentFeeRefunded",    row: await N.notifyAgentFeeRefunded(U, { amountTzs: 100_000, reference: "RF-2026-0091" }) },
  { fn: "notifyAgentDeactivated",    row: await N.notifyAgentDeactivated(U) },
  { fn: "notifyAgentRevoked",        row: await N.notifyAgentRevoked(U, { reapplyAt: "2026-12-06T10:00:00.000Z" }) },
  { fn: "notifyAgentRateChanged",    row: await N.notifyAgentRateChanged(U, { beforePct: 20, afterPct: 25 }) },
  { fn: "notifyAgentCommissionReversed", row: await N.notifyAgentCommissionReversed(U, { amountTzs: 2_000, recoveredTzs: 500, marketId: "mkt_c3" }) },
  { fn: "notifyAgentCommission",     row: await N.notifyAgentCommission(U, { amountTzs: 2_000 }) },
  { fn: "notifyAdminAgentReview",    row: await N.notifyAdminAgentReview("c3_officer", { applicantLabel: "Asha M.", applicationId: "agp_c3" }) },
  { fn: "notifyAdminMarketResolution", row: await N.notifyAdminMarketResolution("c3_officer", { title: "Closed poll", marketId: "mkt_11" }) },
  { fn: "notifyAdminMarketCancelled", row: await N.notifyAdminMarketCancelled("c3_officer", { title: "Cancelled poll", reason: "Source retracted", refundedCount: 3, refundedTzs: 30_000 }) },
  { fn: "notifyAdminProposalReview", row: await N.notifyAdminProposalReview("c3_officer", { proposerLabel: "Asha M.", titleEn: "A market idea", proposalId: "prp_1" }) },
  // ── House bots: NO holder notice exists (D19c, C4 ruling 149) — every house row below the registry is an officer's.
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
const FANOUT = ["notifyAdminObjectionFiled", "notifyAdminsAmlReview", "notifyAdminsSentinelDown", "notifyAdminsAiCreditLimit", "notifyAdminsBackupUnhealthy", "notifyAdminsKycReviewOverdue", "notifyAdminsHouseBotErasureBlocked",
  // House bots (build commit 4, step 9): eight admin fan-outs, each driven in §5.
  "notifyAdminsHouseBotBet", "notifyAdminsHouseBotStaffChosen", "notifyAdminsHouseBotHourSummary", "notifyAdminsHouseBotPaused",
  "notifyAdminsHouseBotSwitch", "notifyAdminsHouseBotMoneyEvent", "notifyAdminsHouseBotAlert", "notifyAdminsHouseBotRoster"];
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
  // The backup watchdog (E-256) — driven with the real "stale" shape from
  // watchdog.ts §describeBackupAlert, not a minimal string.
  await N.notifyAdminsBackupUnhealthy({ kind: "stale", reason: "The last verified backup is 49 hours old — the nightly has not completed since. GitHub may be delaying, failing, or silently no longer running the schedule.", ageHours: 49, destination: "github-artifact" });
  await N.notifyAdminObjectionFiled("obj_1", "A disputed poll");
  // 2026-09-13 · an identity review past its target — driven with the shape the SLA chore passes.
  await N.notifyAdminsKycReviewOverdue({ kycId: "kyc_c3", userId: U, playerLabel: "Asha M.", submittedAt: "2026-09-12T08:00:00.000Z", hoursWaiting: 26 });
  // House bots (build commit 3) — an erasure refused while the account is still a house bot (04 R6).
  await N.notifyAdminsHouseBotErasureBlocked({ botId: "hb_c3erasure01", holderUserId: U });
  // House bots (build commit 4, step 9): the engine's eight admin fan-outs, driven in §5.
  await N.notifyAdminsHouseBotBet({ botId: "hb_c3bot01", label: "Bot A", side: "YES", stakeTzs: 8_000, marketTitle: "Will Dar get rain today?", marketId: "mkt_c3house", intentId: "hbi_c3bet01", at: "14:02:11" });
  await N.notifyAdminsHouseBotStaffChosen({ botId: "hb_c3bot01", label: "Bot A", side: "NO", stakeTzs: 12_000, marketTitle: "Will Dar get rain today?", marketId: "mkt_c3house", intentId: "hbi_c3staff01", entry: "MANUAL", byName: "Juma M.", sideRule: "the thinner side", at: "14:03:22" });
  await N.notifyAdminsHouseBotHourSummary({ fromHH: "13:00", toHH: "14:00", count: 25, stakeTzs: 180_000, beyondCap: 5, staffChosen: 2, at: "14:00:04" });
  await N.notifyAdminsHouseBotPaused({ variant: "A1", botId: "hb_c3bot01", label: "Bot A", holder: "Player #A3F2K8", how: "in their account settings", cancelled: 2, at: "14:04:10" });
  await N.notifyAdminsHouseBotSwitch({ state: "OFF", cause: "MANUAL", byName: "Juma M.", cancelled: 3, drain: "busy", at: "14:05:00" });
  await N.notifyAdminsHouseBotMoneyEvent({ botId: "hb_c3bot01", label: "Bot A", holder: "Player #A3F2K8", event: "withdrew", amountTzs: 50_000, txnId: "txn_c3house01", balanceTzs: 120_000, at: "14:06:30" }); // a CODE, localised by the emitter (ruling 142)
  await N.notifyAdminsHouseBotAlert({ code: "SETTLE_BLOCKED", botId: "hb_c3bot01", label: "Bot A", holder: "Player #A3F2K8", detail: { openStakeTzs: 240_000 }, at: "14:07:45" });
  await N.notifyAdminsHouseBotRoster({ botId: "hb_c3bot01", label: "Bot A", event: "RULES_SAVED", eventId: "hbe_c3roster01", at: "14:08:11", detail: { byName: "Juma M.", field: "daily loss cap", from: "TZS 50,000", to: "TZS 200,000" } });
  const rows = await db.notification.findByUser("c3_officer", 500);
  ok("officer received the fan-out alerts", rows.length >= before + 15, `before=${before} after=${rows.length}`);
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

// Refused funds (2026-09-14). A balance held PENDING APPEAL must say how to appeal; a return whose payout
// failed must say where the money is now — and neither may drift into an identity prompt.
{
  const held = EMITTED.find((e) => e.fn === "notifyRefusedFundsDecision" && e.row?.titleEn === "Your balance is held")?.row ?? null;
  ok("a held balance tells the player how to appeal, in every language",
    !!held && /contact support to appeal/.test(held.bodyEn) && /kukata rufaa/.test(held.bodySw) && /申诉/.test(held.bodyZh ?? ""),
    held?.bodyEn ?? "no row");
  const failed = EMITTED.filter((e) => e.fn === "notifyRefusedFundsReturnFailed").map((e) => e.row);
  ok("a failed return says the money is back and the account stays frozen, in every language",
    failed.length === 2 && failed.every((r) => !!r && /is in your account/.test(r.bodyEn) && /stays frozen/.test(r.bodyEn) && /imegandishwa/.test(r.bodySw) && /冻结/.test(r.bodyZh ?? "")),
    failed.map((r) => r?.bodyEn ?? "no row").join(" | "));
  ok("…names the part that will not be returned only when there is one",
    /5,000 will not be returned/.test(failed[0]?.bodyEn ?? "") && !/will not be returned/.test(failed[1]?.bodyEn ?? ""),
    failed.map((r) => r?.bodyEn ?? "no row").join(" | "));
  ok("⛔ …and carries no identity sentence, in any language (the quiet rule)",
    failed.every((r) => !!r && !/verif|identit|utambulisho|uthibitisho|身份|验证/i.test([r.titleEn, r.bodyEn, r.titleSw, r.bodySw, r.titleZh ?? "", r.bodyZh ?? ""].join("\n"))));
}

// ── 7 · Identity, quietly (owner, 2026-09-13) ──────────────────────────────────────
//
// ⭐ THE QUIET RULE. Identity is required before a WITHDRAWAL only, and a player meets it on the
// withdrawal screen, in one dismissible wallet notice from their first confirmed deposit, where they go
// to look (/profile/kyc, the profile pill, legal, help), and in answer to something that happened in
// verification (`notifyKyc`, `notifyRefusedFundsDecision`). ⛔ Never on a receipt, never in a reminder,
// never in a message sent because a withdrawal was refused for identity.
// 🔴 EARLIER THE SAME DAY THIS SECTION ASSERTED THE OPPOSITE — an identity sentence on the deposit, win,
// cash-out and Up & Down win rows, a once-ever reminder chore, a blocked-withdrawal prompt — and it was
// green. The owner ruled all of it out. A guard pinning the nudge would have turned its removal red, so
// this section pins the ABSENCE, on the rows and at the source, and every absence check has a control
// proving it can fail.
section("7 · identity, quietly — no receipt sentence, no reminder, no blocked-withdrawal prompt");
{
  const { readFileSync } = await import("node:fs");
  const { KYC_REVIEW_SLA_HOURS } = await import("../src/lib/kyc-sla.ts");
  const { getAuditForTargetDurable } = await import("../src/lib/server/audit.ts");
  const H = 3_600_000;
  type KycRow = Parameters<typeof db.kyc.upsert>[0];
  const mkKyc = async (userId: string, status: KycRow["status"], extra: Partial<KycRow> = {}) => {
    await db.kyc.upsert({
      id: `kyc_${userId}`, userId, status, rejectReason: null, rejectNote: null,
      fullName: "Asha Mwakalinga", dob: "1990-01-01", documents: [],
      reviewerId: null, reviewedAt: null, submittedAt: null,
      createdAt: nowIso, updatedAt: nowIso, ...extra,
    });
  };
  /** Any identity wording, in each of the three languages the bell carries. */
  const IDENTITY = /verif|identit|utambulisho|uthibitisho|身份|验证/i;
  const text = (r: StoredNotification) => [r.titleEn, r.bodyEn, r.titleSw, r.bodySw, r.titleZh ?? "", r.bodyZh ?? ""].join("\n");
  const quiet = (r: StoredNotification | null | undefined) => !!r && !IDENTITY.test(text(r));
  const T = { en: "Will it rain in Dar today?", sw: "Je mvua itanyesha Dar leo?", zh: "今天达累斯萨拉姆会下雨吗？" };

  // ── 7a · controls first — the matcher can go red, in every language ──
  // The removed sentence, one language at a time, so each alternative of the pattern is proven to fire.
  ok("7a control: the matcher catches the removed English sentence", IDENTITY.test("Before you withdraw, verify your identity once"));
  ok("7a control: …the Swahili one", IDENTITY.test("Kabla ya kutoa pesa, thibitisha utambulisho wako mara moja"));
  ok("7a control: …the Chinese one", IDENTITY.test("提现前，请先完成一次身份验证"));
  // …and a REAL row that must speak of identity, through the very predicate the assertions below use.
  await mkUser("c3_quiet_control");
  ok("7a control: a verification-event row IS caught, so `quiet` can answer false",
    !quiet(await N.notifyKyc("c3_quiet_control", "PENDING_REVIEW")));

  // ── 7b · money arriving says nothing about identity, to an account never verified ──
  // `U` has no KYC row at all — the commonest funded account from 2026-09-13. Its rows were driven above.
  for (const fn of ["notifyDeposit", "notifyWin", "notifyCashout", "notifyUpDownWin"] as const) {
    ok(`7b ⛔ ${fn}: an account never verified reads no identity sentence, in any language`,
      quiet(byFn[fn]), byFn[fn] ? text(byFn[fn]).slice(0, 160) : "no row");
  }
  // A fresh account, and one that has uploaded photos but not sent them (`IN_PROGRESS`) — the second state
  // the removed nudge targeted. Every receipt branch, including the paid cash-out.
  await mkUser("c3_quiet_new");
  await mkUser("c3_quiet_uploaded"); await mkKyc("c3_quiet_uploaded", "IN_PROGRESS");
  for (const who of ["c3_quiet_new", "c3_quiet_uploaded"]) {
    const rows: Record<string, StoredNotification | null> = {
      "deposit": await N.notifyDeposit(who, { status: "CONFIRMED", amount: 5_000, provider: "Selcom", txnId: `txn_${who}` }),
      "win": await N.notifyWin(who, 7_000, T, `/positions/pos_${who}`),
      "cash-out (free exit)": await N.notifyCashout(who, { amount: 4_000, marketTitle: T, marketId: "mkt_7b", inGracePeriod: true, positionId: `pos_g_${who}`, freeExitGraceMinutes: 5 }),
      "cash-out (paid)": await N.notifyCashout(who, { amount: 3_600, marketTitle: T, marketId: "mkt_7b", inGracePeriod: false, positionId: `pos_p_${who}`, freeExitGraceMinutes: 5 }),
      "Up & Down win": await N.notifyUpDownWin(who, { payout: 7_000, stake: 5_000, marketTitle: T, roundHref: `/updown/udr_${who}`, pushTag: `updown-result-${who}`, positionId: `pos_ud_${who}` }),
    };
    for (const [what, r] of Object.entries(rows)) {
      ok(`7b ⛔ ${who}: the ${what} row is delivered with no identity sentence`, r !== null && quiet(r), r ? text(r).slice(0, 160) : "no row");
    }
  }
  // ⛔ A receipt does not even ASK about identity: with the KYC read broken, it is delivered unchanged.
  await mkUser("c3_quiet_unreadable");
  const kycDal = db.kyc as unknown as { findByUserId: (id: string) => unknown };
  const realFind = kycDal.findByUserId;
  kycDal.findByUserId = () => { throw new Error("simulated KYC read failure"); };
  try {
    const r = await N.notifyDeposit("c3_quiet_unreadable", { status: "CONFIRMED", amount: 5_000, provider: "Selcom", txnId: "txn_quiet_unreadable" });
    ok("7b a deposit receipt is delivered, quietly, with the KYC read broken — it never reads it", r !== null && quiet(r), r ? text(r).slice(0, 120) : "no row");
  } finally {
    kycDal.findByUserId = realFind;
  }

  // ── 7c · at the source — the removed nudges cannot come back under their own names ──
  const SRC = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  /** A whole-token mention: never a substring of a longer identifier. */
  const mentions = (src: string, token: string) =>
    new RegExp(`(^|[^\\w$])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w$])`).test(src);
  /**
   * Every name the quiet rule removed on 2026-09-13: the receipt sentence and its decider, the template
   * option that carried it, the reminder chore and its letter, the blocked-withdrawal prompt and its
   * letter, and the audit markers and mail tags they wrote. ⚠️ One list, so the docs can quote it.
   */
  const REMOVED = [
    "identityExitNudgeDue", "identityExitClause", "identityExitNote", "verifyBeforeWithdrawal",
    "notifyKycFundedReminder", "runFundedUnverifiedReminders", "FundedReminderRun", "maybeRemindFundedUnverified", "kycFundedReminderHtml",
    "notifyKycWithdrawalBlocked", "promptIdentityAfterBlockedWithdrawal", "kycWithdrawalBlockedHtml", "BlockedWithdrawalState",
    "BLOCKED_WITHDRAWAL_COPY", "VERIFY_THEN_WITHDRAW_HREF",
    "kyc.prompt.funded_unverified", "kyc.prompt.withdrawal_blocked", "kyc-funded-reminder", "kyc-withdraw-blocked",
  ];
  ok("7c control: the matcher catches a removed definition", mentions("export async function identityExitNudgeDue(userId: string)", "identityExitNudgeDue"));
  ok("7c control: …and a removed audit action", mentions(`action: "kyc.prompt.withdrawal_blocked",`, "kyc.prompt.withdrawal_blocked"));
  ok("7c control: …but not a longer identifier that merely contains a name", !mentions("const identityExitNudgeDueLater = 1;", "identityExitNudgeDue"));
  // Each file carries a KEPT name as its own control: the file was really read, and the same matcher hits in it.
  for (const [file, kept] of [
    ["src/lib/server/notification-service.ts", "runKycReviewSlaAlerts"],
    ["src/lib/server/email.ts", "kycReviewOverdueAdminHtml"],
    ["src/lib/server/lifecycle.ts", "maybeWatchKycReviewSla"],
    ["src/lib/server/comms-registry.ts", "notifyAdminsKycReviewOverdue"],
    ["src/lib/server/wallet-service.ts", "notifyDeposit"],
    ["src/lib/server/market-service.ts", "winNotificationHtml"],
  ] as const) {
    const src = SRC(file);
    const name = file.split("/").pop();
    ok(`7c control: ${name} is real, and the matcher finds \`${kept}\` in it`, src.length > 5_000 && mentions(src, kept), `len=${src.length}`);
    const found = REMOVED.filter((t) => mentions(src, t));
    ok(`7c ⛔ ${name} defines and references none of the removed identity nudges`, found.length === 0, found.join(", "));
  }
  // The module surface too — read from the live exports, not the text.
  for (const gone of ["identityExitNudgeDue", "notifyKycFundedReminder", "runFundedUnverifiedReminders", "notifyKycWithdrawalBlocked", "promptIdentityAfterBlockedWithdrawal"]) {
    ok(`7c ⛔ notification-service no longer exports \`${gone}\``, !(gone in N));
  }
  ok("7c control: …while it still exports the officer's review-target chore and alert",
    "runKycReviewSlaAlerts" in N && "notifyAdminsKycReviewOverdue" in N);

  // ⛔ A withdrawal refused for identity sends the player NOTHING. The screen they are on already says it
  // (the payout identity panel); a bell row or an email on top of it is the nudge the rule removed.
  const CALL = /\b(?:notify\w*|sendEmail\w*|prompt\w*)\s*\(/;
  ok("7c control: the call matcher catches the removed hook", CALL.test("if (!operatorInitiated) void promptIdentityAfterBlockedWithdrawal(userId).catch(() => {});"));
  const WS = SRC("src/lib/server/wallet-service.ts").replace(/\r\n/g, "\n");
  const blockedAt = WS.indexOf('action: "withdraw.kyc_blocked"');
  const branch = blockedAt > 0 ? WS.slice(blockedAt, WS.indexOf("return { ok: false, error: `Identity not verified", blockedAt) + 1) : "";
  ok("7c control: the kyc_blocked branch is where this suite expects it, and still records the attempt",
    blockedAt > 0 && branch.length > 200 && branch.length < 6_000 && /operatorInitiated/.test(branch), `len=${branch.length}`);
  ok("7c ⛔ the kyc_blocked branch notifies, mails and prompts nobody", !CALL.test(branch), branch.match(CALL)?.[0] ?? "");

  // ── 7d · the review target — one OFFICER alert per breach (kept: not a player message) ──
  await mkUser("c3_sla_old"); await mkKyc("c3_sla_old", "PENDING_REVIEW", { submittedAt: new Date(Date.now() - (KYC_REVIEW_SLA_HOURS + 2) * H).toISOString() });
  await mkUser("c3_sla_new"); await mkKyc("c3_sla_new", "PENDING_REVIEW", { submittedAt: new Date(Date.now() - 1 * H).toISOString() });
  const overdue = async (uid: string) =>
    (await db.notification.findByUser("c3_officer", 500)).filter((n) => n.titleEn.startsWith("KYC review overdue") && n.href === `/admin/kyc/${uid}`);
  const s1 = await N.runKycReviewSlaAlerts();
  ok("7d a submission past the review target alerts the officers", (await overdue("c3_sla_old")).length === 1 && s1.alerted >= 1, JSON.stringify(s1));
  ok("7d ⛔ a submission inside the target does not", (await overdue("c3_sla_new")).length === 0);
  const s2 = await N.runKycReviewSlaAlerts();
  ok("7d ⛔ ONCE PER BREACH — the next tick raises nothing new", (await overdue("c3_sla_old")).length === 1 && s2.alerted === 0 && s2.alreadyAlerted >= 1, JSON.stringify(s2));
  // A resubmission that breaches again is a NEW breach: the dedupe key is the submission AND its submittedAt.
  await mkKyc("c3_sla_old", "PENDING_REVIEW", { submittedAt: new Date(Date.now() - (KYC_REVIEW_SLA_HOURS + 1) * H).toISOString() });
  const s3 = await N.runKycReviewSlaAlerts();
  ok("7d a resubmission that breaches again alerts again", s3.alerted >= 1 && (await overdue("c3_sla_old")).length === 2, JSON.stringify(s3));
  const marks = await getAuditForTargetDurable("Kyc", "kyc_c3_sla_old", { limit: 20 });
  ok("7d each breach is ONE COMPLIANCE fact on the submission itself",
    marks.entries.filter((e) => e.action === "kyc.review_sla_breached" && e.category === "COMPLIANCE").length === 2);
}

console.log(`\ncert-c3 (notification truth): ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
