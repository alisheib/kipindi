/**
 * RECEIPTS — every deposit and withdrawal kept in the app (owner ruling, Ali, 2026-10-07).
 *
 *   npm run test:wallet-receipts
 *
 * Ali: *"to make sure users have all their receipts on withdrawals or deposits, in the user profile we need a tab for
 * internal receipts."* `/wallet/receipts` lists them; `/wallet/receipt/[id]` shows one. One contract file
 * (`src/lib/wallet/receipts.ts`) decides what has a receipt and how the list is queried; this suite holds both pages to it.
 *
 * SECTIONS
 *   §1  the store read: own rows only, deposits and withdrawals only, newest first with a stable tie-break, the limit kept
 *   §2  what has a receipt — and how a status is shown (a deposit held for return reads Reversed; a withdrawal keeps its word)
 *   §3  the URL contract: defaults omitted, junk falls back, the page number survives
 *   §4  filters, cross-filtered counts and the empty states' causes and exits — over a real, mixed book
 *   §5  the words: every key in all three languages; a card is "Kadi" / "银行卡"; every status has a word
 *   §6  the doors: the profile row and the wallet link exist once each; "View receipt" asks the STORED type
 *   §7  the receipt page: a non-receipt id is a 404, the status tone is the shared one, no gold, no betting ink
 *   §8  the two store twins say the same thing (the in-memory twin is a blind cast of the Prisma one)
 *
 * ⛔ Runs on the IN-MEMORY store. The Postgres half is `npm run db:probe-wallet-receipts` (needs the scratch cluster).
 */
import { readFileSync } from "node:fs";
import { db, type StoredTxn, type StoredWallet } from "../src/lib/server/store.ts";
import { dict } from "../src/lib/i18n-dict.ts";
import {
  RECEIPT_TYPES, RECEIPT_ROW_CAP, RECEIPT_DEFAULT_STATE, hasReceipt, presentedStatus, parseReceiptParams, buildReceiptsHref,
  hasActiveReceiptFilters, receiptsSheetCount, filterReceipts, receiptCounts, receiptEmptyView, receiptsWereCapped,
  receiptTypeWord, receiptStatusWord, methodLabel, receiptLensLabel, anyInFlight, RG_RETURN_MARK, type ReceiptRowData,
} from "../src/lib/wallet/receipts.ts";
import { refundAmlRejection } from "../src/lib/server/wallet-service.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s}`);
const J = (v: unknown) => JSON.stringify(v);
const src = (rel: string) => decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8")).replace(/\s+/g, " ");

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-07T09:00:00.000Z"); // 12:00 EAT

// ── §1 ────────────────────────────────────────────────────────────────────────────────────────────
section("§1 · the store read");
{
  const mk = async (id: string) => {
    await db.user.create({ id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, role: "PLAYER", status: "ACTIVE",
      locale: "EN", createdAt: new Date(NOW).toISOString(), updatedAt: new Date(NOW).toISOString() } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE",
      createdAt: new Date(NOW).toISOString(), updatedAt: new Date(NOW).toISOString() } as StoredWallet);
  };
  await mk("rc_me"); await mk("rc_other");
  let n = 0;
  const row = async (userId: string, type: StoredTxn["type"], status: StoredTxn["status"], atMs: number, id?: string) => {
    const tid = id ?? `txn_rc_${String(++n).padStart(3, "0")}`;
    await db.txn.create({ id: tid, walletId: `wal_${userId}`, userId, type, status, amount: type === "WITHDRAWAL" || type === "BET_PLACED" ? -5_000 : 5_000,
      fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null, msisdn: null, description: "x",
      positionId: null, amlReason: null, createdAt: new Date(atMs).toISOString(), updatedAt: new Date(atMs).toISOString(), completedAt: null, idempotencyKey: null } as never);
    return tid;
  };
  await row("rc_me", "DEPOSIT", "CONFIRMED", NOW - 3 * DAY);
  await row("rc_me", "BET_PLACED", "CONFIRMED", NOW - 2 * DAY);
  await row("rc_me", "WITHDRAWAL", "PROCESSING", NOW - 1 * DAY);
  await row("rc_me", "BONUS_CREDIT", "CONFIRMED", NOW - 1 * DAY + 1);
  await row("rc_me", "HOUSE_FEE", "CONFIRMED", NOW - 1 * DAY + 2);
  await row("rc_other", "DEPOSIT", "CONFIRMED", NOW - 1 * DAY + 3);
  // Two rows at the SAME instant: the tie must break by id, descending, in both twins.
  await row("rc_me", "DEPOSIT", "FAILED", NOW - 5 * DAY, "txn_rc_tie_a");
  await row("rc_me", "DEPOSIT", "CANCELLED", NOW - 5 * DAY, "txn_rc_tie_b");
  const got = (await db.txn.findByUserTypes("rc_me", RECEIPT_TYPES, 50)) as StoredTxn[];
  ok("1.1 ★ only this player's rows", got.every((t) => t.userId === "rc_me") && got.length > 0, J(got.map((t) => t.userId)));
  ok("1.2 ★ only deposits and withdrawals — no stake, bonus or fee rides in", got.every((t) => hasReceipt(t.type)), J(got.map((t) => t.type)));
  ok("1.3 all four of this player's receipts, newest first", J(got.map((t) => t.id)) === J(["txn_rc_003", "txn_rc_001", "txn_rc_tie_b", "txn_rc_tie_a"]), J(got.map((t) => t.id)));
  ok("1.4 the limit is kept", ((await db.txn.findByUserTypes("rc_me", RECEIPT_TYPES, 2)) as StoredTxn[]).length === 2);
  ok("1.5 the cap is answered by the extra row, never guessed from length === cap",
    receiptsWereCapped(RECEIPT_ROW_CAP + 1) && !receiptsWereCapped(RECEIPT_ROW_CAP) && !receiptsWereCapped(0));
}

// ── §2 ────────────────────────────────────────────────────────────────────────────────────────────
section("§2 · what has a receipt, and the status a player is shown");
{
  ok("2.1 a deposit and a withdrawal have receipts", hasReceipt("DEPOSIT") && hasReceipt("WITHDRAWAL"));
  ok("2.2 ⛔ nothing else does (S10-02: a bonus read \"Deposit\", a house fee \"Withdrawal\")",
    ["BET_PLACED", "BET_PAYOUT", "BET_REFUND", "BONUS_CREDIT", "ADJUSTMENT_CREDIT", "ADJUSTMENT_DEBIT", "CASHOUT", "HOUSE_FEE",
      "AGENT_COMMISSION", "AGENT_COMMISSION_REVERSAL", "AGENT_REGISTRATION_FEE", "", null, undefined].every((t) => !hasReceipt(t as string)));
  const P = (type: string, status: StoredTxn["status"], amlReason: string | null = null) => presentedStatus({ type, status, amlReason });
  ok("2.3 ★ a deposit held for return (AML_REVIEW) reads REVERSED — never \"in review\", never in flight",
    P("DEPOSIT", "AML_REVIEW", `${RG_RETURN_MARK}SELF_EXCLUDED`) === "REVERSED" && P("DEPOSIT", "AML_REVIEW") === "REVERSED");
  ok("2.4 …a withdrawal in review keeps its own word", P("WITHDRAWAL", "AML_REVIEW") === "AML_REVIEW");
  ok("2.5 every other status passes through unchanged (no return mark)",
    (["PENDING", "PROCESSING", "CONFIRMED", "FAILED", "REVERSED", "CANCELLED"] as const).every((s) => P("DEPOSIT", s) === s && P("WITHDRAWAL", s) === s));
  // 2026-10-07 (money-and-compliance review): the officer's return writes FAILED — the deposit must still read REVERSED.
  ok("2.6 ★ a held deposit an officer has RETURNED (FAILED, mark kept) still reads REVERSED",
    P("DEPOSIT", "FAILED", `${RG_RETURN_MARK}COOLED_OFF · returned to card`) === "REVERSED");
  ok("2.7 control · a FAILED deposit without the mark stays FAILED; a withdrawal with a mark-like reason stays FAILED",
    P("DEPOSIT", "FAILED", "provider declined") === "FAILED" && P("WITHDRAWAL", "FAILED", `${RG_RETURN_MARK}X`) === "FAILED");

  // Behaviour, on the store: the officer's refund keeps the mark in front of the reason, for a deposit only.
  const at = new Date(NOW).toISOString();
  await db.txn.create({ id: "txn_rc_held", walletId: "wal_rc_me", userId: "rc_me", type: "DEPOSIT", status: "AML_REVIEW", amount: 7_000,
    fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "CARD", providerRef: "ord_rc_held", msisdn: null,
    description: "held", positionId: null, amlReason: `${RG_RETURN_MARK}COOLED_OFF`, createdAt: at, updatedAt: at, completedAt: null,
    idempotencyKey: null } as never);
  await refundAmlRejection((await db.txn.findById("txn_rc_held")) as StoredTxn, "returned to the card");
  const back = (await db.txn.findById("txn_rc_held")) as StoredTxn;
  ok("2.8 ★ refundAmlRejection keeps a held deposit's mark before the officer's reason, and the row still reads REVERSED",
    back.status === "FAILED" && back.amlReason === `${RG_RETURN_MARK}COOLED_OFF · returned to the card` && presentedStatus(back) === "REVERSED",
    `${back.status} · ${back.amlReason}`);
  const ws = src("src/lib/server/wallet-service.ts");
  ok("2.9 the card return reads the same rule: a held deposit is REVERSED there, never FAILED (\"nothing was taken\")",
    ws.includes("const shown = presentedStatus(txn);") && ws.includes('shown === "REVERSED" ? "REVERSED" :'));
}

// ── §3 ────────────────────────────────────────────────────────────────────────────────────────────
section("§3 · the URL contract");
{
  ok("3.1 a bare URL is the default view", J(parseReceiptParams({})) === J(RECEIPT_DEFAULT_STATE));
  ok("3.2 junk falls back to the defaults, never a crash", J(parseReceiptParams({ type: "bets", state: "lost", when: "1y" })) === J(RECEIPT_DEFAULT_STATE));
  ok("3.3 a real choice is read", J(parseReceiptParams({ type: "out", state: "flight", when: "7d" })) === J({ type: "out", state: "flight", when: "7d" }));
  ok("3.4 a clean view has a clean URL (defaults omitted)", buildReceiptsHref(RECEIPT_DEFAULT_STATE) === "/wallet/receipts");
  // The shared builder's rule (lib/query/href.ts): a CHANGED filter starts again at page 1; a pager link carries no patch
  // and keeps its page.
  const reset = buildReceiptsHref(RECEIPT_DEFAULT_STATE, { type: "in", when: "30d" }, { page: 2 });
  ok("3.5 a filter change carries the filters and starts again at page 1", /type=in/.test(reset) && /when=30d/.test(reset) && !/page=/.test(reset), reset);
  const pager = buildReceiptsHref({ type: "in", state: "any", when: "30d" }, {}, { page: 2 });
  ok("3.5b …while a pager link on a filtered view keeps its filters AND its page", /type=in/.test(pager) && /when=30d/.test(pager) && /page=2/.test(pager), pager);
  ok("3.6 the filter badge counts the sheet's axes only (state, window — the lens stays on the bar)",
    receiptsSheetCount({ type: "in", state: "flight", when: "7d" }) === 2 && hasActiveReceiptFilters({ type: "in", state: "any", when: "all" })
      && !hasActiveReceiptFilters(RECEIPT_DEFAULT_STATE));
}

// ── §4 ────────────────────────────────────────────────────────────────────────────────────────────
section("§4 · filters, cross-filtered counts, empty states");
{
  const R = (id: string, type: "DEPOSIT" | "WITHDRAWAL", status: ReceiptRowData["status"], ageDays: number): ReceiptRowData =>
    ({ id, type, status, amount: 5_000, provider: "MPESA", createdAtMs: NOW - ageDays * DAY });
  const book: ReceiptRowData[] = [
    R("d1", "DEPOSIT", "CONFIRMED", 0.1), R("d2", "DEPOSIT", "FAILED", 2), R("d3", "DEPOSIT", "PROCESSING", 10),
    R("w1", "WITHDRAWAL", "CONFIRMED", 1), R("w2", "WITHDRAWAL", "CANCELLED", 40), R("d4", "DEPOSIT", "REVERSED", 3),
  ];
  const ids = (rows: ReceiptRowData[]) => rows.map((r) => r.id).join(",");
  ok("4.1 the Deposits lens shows deposits only", ids(filterReceipts(book, { ...RECEIPT_DEFAULT_STATE, type: "in" }, NOW)) === "d1,d2,d3,d4");
  ok("4.2 the Withdrawals lens shows withdrawals only", ids(filterReceipts(book, { ...RECEIPT_DEFAULT_STATE, type: "out" }, NOW)) === "w1,w2");
  ok("4.3 the state lens is the wallet's: failed = FAILED + CANCELLED", ids(filterReceipts(book, { ...RECEIPT_DEFAULT_STATE, state: "failed" }, NOW)) === "d2,w2");
  ok("4.4 the window is the EAT day boundary (today = since 00:00 EAT)", ids(filterReceipts(book, { ...RECEIPT_DEFAULT_STATE, when: "today" }, NOW)) === "d1");
  const counts = receiptCounts(book, { type: "out", state: "any", when: "30d" }, NOW);
  ok("4.5 ★ counts are cross-filtered: each lens count respects the OTHER axes (30 days)",
    counts.type.all === 5 && counts.type.in === 4 && counts.type.out === 1, J(counts.type));
  ok("4.6 …and each state count respects the lens and window", counts.state.confirmed === 1 && counts.state.failed === 0, J(counts.state));
  const noRows = receiptEmptyView([], 0, RECEIPT_DEFAULT_STATE, NOW);
  ok("4.7 an empty book is \"no rows\" — and offers no exits", noRows.cause === "no-rows" && noRows.exits.length === 0, J(noRows));
  const onlyDeposits = book.filter((r) => r.type === "DEPOSIT");
  const lens = receiptEmptyView(onlyDeposits, 0, { ...RECEIPT_DEFAULT_STATE, type: "out" }, NOW);
  ok("4.8 ★ \"no withdrawals yet\" is a HEALTHY empty, not a failure of the page", lens.cause === "lens-empty", J(lens.cause));
  const win = receiptEmptyView(book, 0, { ...RECEIPT_DEFAULT_STATE, when: "yesterday", state: "reversed" }, NOW);
  ok("4.9 a filtered-empty view names a cause and offers exits that lead somewhere (real counts)",
    !!win.cause && win.cause !== "no-rows" && win.exits.length > 0 && win.exits.every((e) => (e as { count: number }).count > 0), J(win));
  ok("4.10 the page re-reads itself only while something is in flight", anyInFlight([R("x", "DEPOSIT", "PROCESSING", 0)]) && !anyInFlight([R("y", "DEPOSIT", "CONFIRMED", 0)]));
}

// ── §5 ────────────────────────────────────────────────────────────────────────────────────────────
section("§5 · the words, in all three languages");
{
  const LOCS = ["en", "sw", "zh"] as const;
  const KEYS = ["title", "settingSub", "subtitle", "lensDeposits", "lensWithdrawals", "oneResult", "nResults", "filterAria",
    "filtersTitle", "listLabel", "emptyTitle", "emptyBody", "emptyFilter", "capped", "allReceipts"] as const;
  const d = dict as unknown as Record<string, Record<string, Record<string, string>>>;
  for (const loc of LOCS) {
    const missing = KEYS.filter((k) => !(typeof d[loc]?.receipts?.[k] === "string" && d[loc].receipts[k].trim()));
    ok(`5.1.${loc} · every receipts.* key is written`, missing.length === 0, missing.join(", "));
  }
  ok("5.2 ⛔ no English left inside the Swahili or Chinese list words",
    (["sw", "zh"] as const).every((loc) => !/\b(Receipts?|Deposits|Withdrawals|No receipts)\b/.test(KEYS.map((k) => d[loc].receipts[k]).join(" | "))));
  ok("5.3 the count templates carry {n}", LOCS.every((loc) => d[loc].receipts.nResults.includes("{n}") && d[loc].receipts.capped.includes("{n}")));
  ok("5.4 ★ a card reads Card / Kadi / 银行卡 — a WORD, translated", methodLabel(dict.en as never, "CARD") === dict.en.wallet.methodCard
    && methodLabel(dict.sw as never, "CARD") === dict.sw.wallet.methodCard && /Kadi/.test(dict.sw.wallet.methodCard) && /银行卡/.test(dict.zh.wallet.methodCard));
  ok("5.5 …a brand stays a brand, and nothing reads as \"—\"", methodLabel(dict.sw as never, "MPESA") === "M-Pesa" && methodLabel(dict.en as never, null) === "—");
  const STATUSES = ["PENDING", "PROCESSING", "AML_REVIEW", "CONFIRMED", "FAILED", "REVERSED", "CANCELLED"] as const;
  ok("5.6 every one of the seven statuses has a word in every language",
    LOCS.every((loc) => STATUSES.every((s) => receiptStatusWord(dict[loc] as never, s).trim().length > 0)));
  ok("5.7 the type words and lens labels resolve in every language",
    LOCS.every((loc) => receiptTypeWord(dict[loc] as never, "DEPOSIT") && receiptTypeWord(dict[loc] as never, "WITHDRAWAL")
      && receiptLensLabel(dict[loc] as never, "in") === d[loc].receipts.lensDeposits && receiptLensLabel(dict[loc] as never, "out") === d[loc].receipts.lensWithdrawals));
}

// ── §6 ────────────────────────────────────────────────────────────────────────────────────────────
section("§6 · the doors");
{
  const profile = src("src/app/profile/page.tsx");
  ok("6.1 ★ the profile holds ONE row to /wallet/receipts", (profile.match(/href="\/wallet\/receipts"/g) ?? []).length === 1
    && /<SettingRow icon=\{I\.receipt\} title=\{t\.receipts\.title\} subtitle=\{t\.receipts\.settingSub\} href="\/wallet\/receipts" \/>/.test(profile));
  const client = src("src/app/wallet/wallet-client.tsx");
  ok("6.2 the wallet's list holds ONE \"All receipts\" link", (client.match(/href="\/wallet\/receipts"/g) ?? []).length === 1 && client.includes('data-testid="wallet-all-receipts"'));
  ok("6.3 ★ \"View receipt\" asks the STORED type (tx.hasReceipt), never the folded token", client.includes("{tx.hasReceipt && (")
    && !/tx\.type === "deposit" \|\| tx\.type === "withdraw"/.test(client));
  const walletPage = src("src/app/wallet/page.tsx");
  ok("6.4 …and the wallet page sets it from the stored type", walletPage.includes("hasReceipt: hasReceipt(t.type),"));
  const list = src("src/app/wallet/receipts/page.tsx");
  ok("6.5 the list reads CAP + 1 through the typed store read (the type filter is in the store)",
    list.includes("db.txn.findByUserTypes(session.userId, RECEIPT_TYPES, RECEIPT_ROW_CAP + 1)"));
  ok("6.6 ⛔ a money read is never swallowed: no try/catch around the list read", !/try \{[^}]*findByUserTypes/.test(list));
  ok("6.7 the signed-out visitor is sent to sign in and brought back to THIS view", list.includes('redirect(`/auth/login?next=${encodeURIComponent(pathWithQuery("/wallet/receipts", sp))}`)'));
}

// ── §7 ────────────────────────────────────────────────────────────────────────────────────────────
section("§7 · the single receipt");
{
  const page = src("src/app/wallet/receipt/[id]/page.tsx");
  ok("7.1 ★ not found, not yours and not a receipt are the SAME 404", page.includes("if (!txn || txn.userId !== session.userId || !hasReceipt(txn.type)) notFound();"));
  ok("7.2 the type is named from the STORED type, never the sign of the amount", page.includes("receiptTypeWord(t, txn.type)") && !/isCredit/.test(page));
  ok("7.3 the status tone is the shared dictionary's (§B11)", page.includes("playerStatusChip(status)") && !/STATUS_TONE\s*:|const STATUS_TONE/.test(page));
  ok("7.4 ⛔ no betting ink and no gold on a payment (§B2a, §M3a D1)", !/\b(?:yes|no)-(?:300|500|700)\b|gold/.test(page));
  ok("7.5 the amount is the headline in the money face", page.includes('title={<span className="amount"><Cash>{formatTzs(Math.abs(txn.amount))}</Cash></span>}'));
  ok("7.6 the way back says \"Back\" and falls back to the list of receipts", page.includes('<BackLink fallbackHref="/wallet/receipts" label={t.common.back} />'));
  ok("7.7 ★ every figure on the receipt is masked by the privacy eye (`<Cash>`)",
    (page.match(/formatTzs\(/g) ?? []).length > 0 && (page.match(/formatTzs\(/g) ?? []).length === (page.match(/<Cash>\{formatTzs\(/g) ?? []).length);
  const ret = src("src/app/wallet/deposit/return/page.tsx");
  ok("7.8 …and on the card-return page, which also names a held deposit as reversed and offers no new deposit for it",
    (ret.match(/formatTzs\(/g) ?? []).length === (ret.match(/<Cash>\{formatTzs\(/g) ?? []).length
      && ret.includes('outcome.state === "REVERSED" ? t.wallet.returnReversedTitle')
      && ret.includes('{outcome.state === "FAILED" && ('));
}

// ── §8 ────────────────────────────────────────────────────────────────────────────────────────────
section("§8 · the two store twins agree");
{
  const prisma = src("src/lib/server/prisma-dal.ts");
  const memory = src("src/lib/server/store.ts");
  ok("8.1 the Prisma read filters by type and orders createdAt desc, then id desc",
    /findByUserTypes: async \(userId: string, types: readonly StoredTxn\["type"\]\[\], limit: number\)[^]*?where: \{ userId, type: \{ in: \[\.\.\.types\] \} as never \}, orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\], take: limit,/.test(prisma));
  ok("8.2 the in-memory twin exists with the same signature", /findByUserTypes: \(userId: string, types: readonly StoredTxn\["type"\]\[\], limit: number\): StoredTxn\[\] =>/.test(memory));
}

console.log(`\nwallet-receipts: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
