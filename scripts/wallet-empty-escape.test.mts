/**
 * WALLET FILTERS — an empty result must never be a dead end.
 *
 *   npx tsx scripts/wallet-empty-escape.test.mts   (npm run test:wallet-empty-escape)
 *
 * 🔴 E-332, reported from production by Ali 2026-09-10 on a wallet holding TZS 423,857:
 * *"as long as there is data per filter it works, but when I click a filter that doesn't have
 * data, I'm stuck — I cannot filter any more."*
 *
 * ⛔ ONE WRONG ARGUMENT, THREE SYMPTOMS. The wallet applies its date axis in the DATABASE, so
 * `windowRows` is already filtered — and `wallet/page.tsx` passed `windowRows.length` as
 * `emptyKind`'s `total`, which that function documents as *"how many rows exist before ANY
 * filter — the player's whole book"*. Picking a day with no transactions therefore answered
 * `"no-rows"`: **this account has never had any activity.** From that one wrong answer:
 *   ① the copy read "No activity yet · Make your first deposit" to a funded player;
 *   ② `exits` is skipped when the cause is `no-rows`, so every escape chip vanished;
 *   ③ `wallet-client.tsx:725` renders the bar only when the cause is NOT `no-rows`, so the
 *      FILTER BAR ITSELF came off the page.
 * No control left could change the filter that had emptied the page. The only way out was to
 * edit the URL by hand.
 *
 * ⭐ WHY THIS TESTS `ledgerEmptyView` AND NOT THE PAGE. The defect was never in a library — the
 * lib was right and said so in a comment. It was in the CALLER, and a guard that greps the
 * caller's source would be matching syntax, not meaning. So the two populations are now NAMED
 * PARAMETERS of one function, and this drives that function: passing one population twice is
 * still possible, but it is now a thing you have to write out and look at, and §4 catches it.
 *
 *   §1 an empty WINDOW on an account with history is never "no-rows"
 *   §2 …and it always hands back at least one exit
 *   §3 a genuinely empty account IS "no-rows", and correctly has no exits
 *   §4 ⚠️ POSITIVE CONTROL — passing the windowed rows as the book reproduces the trap
 */
import {
  LEDGER_DEFAULT_STATE,
  ledgerEmptyView,
  type LedgerRow,
} from "../src/lib/wallet/ledger.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const NOW = Date.parse("2026-09-10T09:00:00.000Z");
const DAY = 86_400_000;
const yes = () => true;

/** A book that looks like Ali's: real history, none of it in the last two days. */
const BOOK: LedgerRow[] = [
  { id: "t1", type: "DEPOSIT",    status: "CONFIRMED", token: "deposit", amount:  500_000, description: "M-Pesa", createdAtMs: NOW - 20 * DAY },
  { id: "t2", type: "BET_PLACED", status: "CONFIRMED", token: "bet",     amount:  -50_000, description: "bet",    createdAtMs: NOW - 18 * DAY },
  { id: "t3", type: "BET_PAYOUT", status: "CONFIRMED", token: "payout",  amount:   90_000, description: "won",    createdAtMs: NOW - 17 * DAY },
] as unknown as LedgerRow[];

// ── §1 + §2 — "yesterday" returns nothing, but the account is not empty ──────────────────
{
  const state = { ...LEDGER_DEFAULT_STATE, when: "yesterday" };
  const { cause, exits } = ledgerEmptyView([], BOOK, 0, state, NOW, yes);

  ok("§1 an empty window is NOT reported as an empty account", cause !== "no-rows", `cause=${cause}`);
  ok("§1 …it is reported as a window miss", cause === "window-miss", `cause=${cause}`);
  ok("§2 at least one exit is offered", exits.length > 0, `exits=${exits.length}`);
  ok(
    "§2 one of them clears the date window",
    exits.some((e) => e.id === "when"),
    `ids=${exits.map((e) => e.id).join(",") || "(none)"}`,
  );
  // ⛔ An exit chip counting 0 is the same dead end in different words — it must count the BOOK.
  const whenExit = exits.find((e) => e.id === "when");
  ok("§2 the exit counts the BOOK, not the empty window", (whenExit?.count ?? 0) === BOOK.length, `count=${whenExit?.count}`);
}

// ── §3 — a genuinely new account. The "first deposit" copy is CORRECT here, and the bar is
//        rightly hidden: there is nothing to filter. ─────────────────────────────────────
{
  const state = { ...LEDGER_DEFAULT_STATE };
  const { cause, exits } = ledgerEmptyView([], [], 0, state, NOW, yes);
  ok("§3 a truly empty account IS no-rows", cause === "no-rows", `cause=${cause}`);
  ok("§3 …and offers no exits (there is nothing to relax)", exits.length === 0, `exits=${exits.length}`);
}

// ── §4 — POSITIVE CONTROL. This is the exact call the page used to make: the windowed rows
//        handed in as the book. It must reproduce the trap, or §1 proves nothing. ────────
{
  const state = { ...LEDGER_DEFAULT_STATE, when: "yesterday" };
  const windowRows: LedgerRow[] = [];
  const { cause, exits } = ledgerEmptyView(windowRows, windowRows /* ⛔ the bug */, 0, state, NOW, yes);
  ok("§4 the old call shape DOES produce the trap", cause === "no-rows" && exits.length === 0, `cause=${cause} exits=${exits.length}`);
}

// ── §5 — a non-empty page is untouched: cause null, no exits, and the two populations agree.
{
  const state = { ...LEDGER_DEFAULT_STATE };
  const { cause, exits } = ledgerEmptyView(BOOK, BOOK, BOOK.length, state, NOW, yes);
  ok("§5 a page with rows has no empty state", cause === null, `cause=${cause}`);
  ok("§5 …and no exits", exits.length === 0, `exits=${exits.length}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
