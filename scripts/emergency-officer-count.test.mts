/**
 * An emergency void counts refunded OPEN positions. A player can own two, so
 * officer confirmations must name stakes rather than distinct people.
 * This drives the real bell emitter and email renderer in the memory store.
 */
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;
delete process.env.VERIFY_DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";
process.env.POSTMARK_API_KEY = "";
process.env.VAPID_PRIVATE_KEY = "";
process.env.SMS_PROVIDER = "console";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";

const { db } = await import("../src/lib/server/store.ts");
const { notifyAdminMarketCancelled, notifyMarketCancelled } = await import("../src/lib/server/notification-service.ts");
const { marketCancelledAdminHtml, marketCancelledRefundHtml } = await import("../src/lib/server/email.ts");
const { formatTzs } = await import("../src/lib/utils.ts");

let passed = 0;
function check(label: string, condition: unknown) {
  assert.ok(condition, `FAIL ${label}`);
  console.log(`PASS ${label}`);
  passed++;
}

const stamp = new Date().toISOString();
async function user(id: string, role: "PLAYER" | "ADMIN") {
  await db.user.create({
    id, phoneE164: role === "ADMIN" ? "+255780000002" : "+255780000001", email: null,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
    createdAt: stamp, updatedAt: stamp, lastLoginAt: null, closedAt: null,
  } as never);
}
await user("officer_count_player", "PLAYER");
await user("officer_count_admin", "ADMIN");

const title = { en: "Two bets on one market", sw: "Madau mawili katika soko moja", zh: "同一市场的两笔投注" };
const first = await notifyMarketCancelled("officer_count_player", {
  stake: 4_000, bonusStakeTzs: 1_000, marketTitle: title,
  marketId: "officer_count_market", reason: "Source corrected", positionId: "pos_officer_count_1",
});
const second = await notifyMarketCancelled("officer_count_player", {
  stake: 3_000, bonusStakeTzs: 0, marketTitle: title,
  marketId: "officer_count_market", reason: "Source corrected", positionId: "pos_officer_count_2",
});
check("same player receives two distinct position receipts", first && second && first.id !== second.id &&
  (await db.notification.findByUser("officer_count_player", 10)).filter((n) => n.kind === "REFUND").length === 2);
check("mixed player receipt names main and bonus credits in all three languages", first &&
  [first.bodyEn, first.bodySw, first.bodyZh].every((body) =>
    body?.includes(formatTzs(3_000)) && body.includes(formatTzs(1_000))) &&
  /main balance/.test(first.bodyEn) && /salio kuu/.test(first.bodySw) && /主余额/.test(first.bodyZh ?? "") &&
  /bonus balance/.test(first.bodyEn) && /salio la bonasi/.test(first.bodySw) && /奖金余额/.test(first.bodyZh ?? ""));

const officer = await notifyAdminMarketCancelled("officer_count_admin", {
  title: title.en, reason: "Source corrected", refundedCount: 2, refundedTzs: 7_000,
});
check("officer bell counts two refunded stakes, never two players, in EN SW ZH", officer &&
  /2 stakes refunded/.test(officer.titleEn) && /2 open stakes were refunded/.test(officer.bodyEn) &&
  /Madau yaliyorejeshwa: 2/.test(officer.titleSw) && /madau 2 yaliyokuwa wazi/.test(officer.bodySw) &&
  /已退回 2 笔投注/.test(officer.titleZh ?? "") && /2 笔未结投注/.test(officer.bodyZh ?? "") &&
  [officer.bodyEn, officer.bodySw, officer.bodyZh].every((body) => body?.includes(formatTzs(7_000))) &&
  !/players|wamerejeshewa|位玩家/.test([officer.titleEn, officer.bodyEn, officer.titleSw, officer.bodySw, officer.titleZh, officer.bodyZh].join(" ")));

const singular = await notifyAdminMarketCancelled("officer_count_admin", {
  title: "One bet", reason: "Source corrected", refundedCount: 1, refundedTzs: 1_000,
});
check("one refunded stake uses a singular English count", singular &&
  /1 stake refunded/.test(singular.titleEn) && /1 open stake was refunded/.test(singular.bodyEn));

const officerHtml = marketCancelledAdminHtml({
  title: title.en, reason: "Source corrected", refundedCount: 2, refundedTzs: 7_000,
});
check("officer email labels the position count and total, not a player count",
  officerHtml.includes("Stakes refunded") && officerHtml.includes(formatTzs(7_000)) &&
  officerHtml.includes("earlier cash-outs kept their paid amount") &&
  !officerHtml.includes("Players refunded") && !officerHtml.includes("players refunded"));

const playerHtml = marketCancelledRefundHtml({
  title: title.en, reason: "Source corrected", amount: 4_000,
  bonusStakeTzs: 1_000, reference: "pos_officer_count_1",
});
check("mixed player email keeps both credited destinations and Chinese copy",
  playerHtml.includes("Credited to main at refund") &&
  playerHtml.includes("Credited to bonus at refund") &&
  playerHtml.includes(formatTzs(3_000)) && playerHtml.includes(formatTzs(1_000)) &&
  playerHtml.includes("主余额") && playerHtml.includes("奖金余额"));

console.log(`ALL PASS — ${passed} passed, 0 failed`);
