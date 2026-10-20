/** U43 local corruption fixture: route gates, bounded premise, and the actual
 * board/detail fail-closed copy. The browser driver is the rendered-value proof. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { roundAnnouncementFor, validRealizedPayout } from "../src/lib/updown-result-truth";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const route = read("src/app/api/dev-test/u43-failclosed-fixture/route.ts");
const board = read("src/lib/server/updown-board.ts");
const card = read("src/components/updown/updown-card.tsx");
const detail = read("src/app/updown/[roundId]/page.tsx");
let passed = 0;
function check(label: string, condition: unknown) {
  assert.ok(condition, label);
  passed++;
}

const handler = route.slice(route.indexOf("export async function POST"));
check("fixture has one POST handler", handler.startsWith("export async function POST") && !route.includes("export async function GET"));
const firstAwait = handler.indexOf("await ");
for (const [name, clause] of [
  ["development-only", 'process.env.NODE_ENV !== "development"'],
  ["localhost-only", "!localHost(req)"],
  ["no database", "process.env.DATABASE_URL || hasDatabase()"],
] as const) {
  const at = handler.indexOf(clause);
  check(`${name} gate precedes reads and writes`, at >= 0 && at < firstAwait);
}
check("host and origin are both local", /url\.hostname === "localhost"/.test(route)
  && /url\.hostname === "127\.0\.0\.1"/.test(route) && /origin === url\.origin/.test(route));
check("requires the session's synthetic demo user", /currentSession\(\)/.test(handler)
  && /user\.role !== "PLAYER"/.test(handler)
  && /user\.phoneE164 !== "\+255700000000"/.test(handler)
  && /user\.displayName !== "Demo Player"/.test(handler));
check("only own existing position on a settled Up & Down round", /market\.productLine !== "UPDOWN"/.test(handler)
  && /market\.id !== round\.marketId/.test(handler)
  && /position\.userId !== session\.userId/.test(handler)
  && /position\.marketId !== market\.id/.test(handler)
  && /!round\.settledAt \|\| !market\.settledAt/.test(handler)
  && /!validRealizedPayout\(\{ status: position\.status, stake: position\.stake, payout: position\.finalPayout \}\)/.test(handler));
check("one active mutation with own-session restore", /if \(globalThis\.__u43FailclosedFixture\)/.test(handler)
  && /active\.userId !== session\.userId/.test(handler)
  && /positionStore\.set\(active\.position\)/.test(handler)
  && /restoredPosition\.status !== active\.position\.status/.test(handler)
  && /restoredPosition\.finalPayout !== active\.position\.finalPayout/.test(handler)
  && /restoredMarket\.settledAt !== active\.marketSettledAt/.test(handler)
  && /restoredRound\.settledAt !== active\.roundSettledAt/.test(handler));
const secondActiveGate = handler.indexOf("if (globalThis.__u43FailclosedFixture != null)");
check("a concurrent apply cannot overwrite the restore snapshot after awaited reads",
  secondActiveGate > handler.indexOf("const round = await roundStore.get(input.roundId)")
  && secondActiveGate < handler.indexOf("const active: Active ="));
check("pending mode clears payment stamps and reopens one row", /input\.mode === "payment-pending"/.test(handler)
  && /status: "OPEN", finalPayout: null, settledAt: null/.test(handler)
  && /marketStore\.stamp\(market\.id, \{ settledAt: null \}\)/.test(handler)
  && /roundStore\.patch\(round\.id, \{ settledAt: null \}\)/.test(handler));
check("settled OPEN keeps market/round stamps", /input\.mode === "settled-open"/.test(handler)
  && /input\.mode === "payment-pending" \|\| input\.mode === "settled-open"/.test(handler)
  && /seenMarket\.settledAt !== \(input\.mode === "payment-pending" \? null : active\.marketSettledAt\)/.test(handler));
check("null and invalid payout modes do not invent payment", /input\.mode === "null-payout" \? null : -1/.test(handler)
  && /payoutValid: validRealizedPayout/.test(handler));
check("fixture self-labels synthetic corruption", route.includes("LOCAL SYNTHETIC DISPLAY STATE · NOT A MONEY LEDGER OR PRODUCTION FACT"));

check("OPEN row reaches board's fail-closed aggregate", /if \(p\.status === "OPEN"\) allSettled = false/.test(board)
  && /if \(marketSettled && !allSettled\) incompletePayout = true/.test(board)
  && /!allSettled \|\| incompletePayout/.test(board));
check("board card renders pending copy only before payment", /settledNow && !settled && \([\s\S]*?t\.market\.udPaymentPending/.test(card));
// 2026-10-20: the validated null gate wraps the whole paid-out fragment. A
// missing/invalid payout cannot leave a paid amount or earned-money ink behind.
const singleCardResult = card.split("{cardResults.length === 1 ? (")[1]?.split(") : (")[0] ?? "";
const validSinglePayout = singleCardResult.match(/\{cardResults\[0\]\.payout != null && <>([\s\S]*?)<\/>\}/)?.[1] ?? "";
check("board card renders unavailable payout with no WIN gold on invalid amount",
  /payout: validRealizedPayout\(r\) \? r\.payout : null/.test(card)
  && /cardResults\[0\]\.payout == null \? t\.market\.udPayoutUnavailable/.test(singleCardResult)
  && validSinglePayout.includes("{t.market.udPaidOut}")
  && validSinglePayout.includes('<span className="amount font-semibold"')
  && validSinglePayout.includes("{formatTzs(cardResults[0].payout)}")
  && /cardResults\[0\]\.status === "WIN" \? "var\(--gold-300\)" : "var\(--text\)"/.test(validSinglePayout));
check("detail renders pending copy and pending stake panel", /decided && !round\.settled && \([\s\S]*?t\.market\.udPaymentPending/.test(detail)
  && /decided && !round\.settled && pendingItems\.length > 0/.test(detail));
check("detail gives invalid payout neutral label, chip and amount", /myPosition\?\.incompletePayout \? t\.market\.udPayoutUnavailable/.test(detail)
  && /myPosition\?\.incompletePayout \? "neutral" as const/.test(detail)
  && /myPosition\?\.incompletePayout \? null/.test(detail)
  && /resultAmount == null \? t\.market\.udPayoutUnavailable/.test(detail));

const stake = 2_000;
check("invalid WIN and null VOID payouts are refused by the real predicate",
  !validRealizedPayout({ status: "WIN", stake, payout: -1 })
  && !validRealizedPayout({ status: "VOID", stake, payout: null }));
check("settled OPEN or invalid WIN cannot announce a paid result",
  roundAnnouncementFor([{ status: "OPEN", side: "UP", stake, payout: null }], true) === null
  && roundAnnouncementFor([{ status: "WIN", side: "UP", stake, payout: -1 }], true) === null);
console.log(`U43 fail-closed fixture: ${passed} passed, 0 failed`);
