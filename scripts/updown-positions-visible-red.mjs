/**
 * RED proof for `test:updown-positions-visible`.
 *
 * ⛔ D1–D4 restore the pre-fix visibility defects; D5–D14 plant named silent-read
 * fallbacks on the current paths. D5 now targets the indexed per-market read that
 * replaced the old account-wide board read. A guard and a RED proof that share a wrong
 * locator agree with each other and are both wrong, so every anchor is required to land.
 *
 * Each defect is restored ON ITS OWN and the guard is run against it, so this proves each
 * assertion GROUP is load-bearing — not merely that the suite goes red when the file is
 * damaged in some way. A single combined mutation could be caught by one assertion while
 * three others were silently vacuous.
 *
 * Run: `npm run red:updown-positions-visible`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const HISTORY = "src/app/updown/history/page.tsx";
const ROUND = "src/app/updown/[roundId]/page.tsx";
const BOARD = "src/lib/server/updown-board.ts";
// 2026-10-21 · the viewer filter lives in the read itself since U43 Release B (4e9d9bcbe), so D15–D18 plant leaks there.
const DAL = "src/lib/server/market-dal.ts";

const FILES = [HISTORY, ROUND, BOARD, DAL];
const original = new Map(FILES.map((f) => [f, readFileSync(f, "utf8")]));

/** Restore every file to the working-tree text we started from. */
function restore() {
  for (const [f, text] of original) writeFileSync(f, text, "utf8");
}

/** Apply a replacement; throw loudly if the anchor is not found (a no-op mutation would
 *  otherwise "pass" this proof while changing nothing — the exact silent-degradation
 *  failure two RED harnesses on this repo shipped with for four days). */
/**
 * ⛔ EOL-AWARE, and that is not a detail. These files are CRLF on the Windows checkout, so
 * a multi-line anchor written with "\n" matches NOTHING while every single-line anchor in
 * the same case applies cleanly — the harness then reports a partly-applied mutation as if
 * it were the real defect. Caught by the anchor assertion below on the first run.
 */
const eolOf = (text) => (text.includes("\r\n") ? "\r\n" : "\n");

function mutate(file, rawFrom, rawTo, label) {
  const before = readFileSync(file, "utf8");
  const eol = eolOf(before);
  const from = rawFrom.replace(/\n/g, eol);
  const to = rawTo.replace(/\n/g, eol);
  if (!before.includes(from)) {
    restore();
    console.error(`\n✗ ANCHOR NOT FOUND for "${label}" in ${file}`);
    console.error("  This proof is stale: the code moved and the mutation applied nothing.");
    console.error("  A RED harness with a stale anchor is an ABSENT test — fix the anchor.");
    process.exit(2);
  }
  writeFileSync(file, before.replace(from, to), "utf8");
}

function guardIsRed(suite = "visible", expected = "") {
  const command = suite === "fault"
    ? "npx tsx scripts/updown-position-read-fail.test.mts"
    : "npx tsx scripts/updown-positions-visible.test.mts";
  try {
    execSync(command, { stdio: "pipe" });
    return false; // exited 0 — the guard did NOT catch it
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    return !expected || output.includes(expected);
  }
}

const cases = [
  {
    name: "D1 · the history card caps the chip row at two bets + a bare `+N`",
    apply: () => {
      mutate(HISTORY,
        "              const roundLink = r.roundId ? `/updown/${r.roundId}` : null;",
        "              const shown = g.bets.slice(0, 2);\n"
        + "              const extra = g.bets.length - shown.length;\n"
        + "              const roundLink = r.roundId ? `/updown/${r.roundId}` : null;",
        "reinstate shown/extra");
      mutate(HISTORY,
        "                    {g.bets.map((b) => (",
        "                    {shown.map((b) => (",
        "chip row maps the truncated list");
      mutate(HISTORY,
        "                  </div>\n\n                  {/* Money: staked",
        "                    {extra > 0 && <span className=\"chip\">+{extra}</span>}\n"
        + "                  </div>\n\n                  {/* Money: staked",
        "restore the +N chip");
    },
  },
  {
    name: "D2 · the 400-row read cap is silent again",
    apply: () => {
      mutate(HISTORY,
        "  const allRows = await getMyUpDownHistory(session.userId, UD_HISTORY_LIMIT);",
        "  const allRows = await getMyUpDownHistory(session.userId, 400);",
        "bare literal instead of the named limit");
      mutate(HISTORY,
        "  const capped = allRows.length >= UD_HISTORY_LIMIT;",
        "",
        "remove the truncation detector");
    },
  },
  {
    name: "D3 · the round panel shows one aggregated line again",
    apply: () => {
      mutate(ROUND,
        "                {myPosition.items.length > 1 && (",
        "                {false && (",
        "stop itemising");
    },
  },
  {
    // 2026-10-21 · U43 Release B (4e9d9bcbe) reads the detail's rows at the call site, so the pre-fix read returns there.
    name: "D4 · the round detail caps across ALL rounds, then filters to this one",
    expected: "FAIL 4.2",
    apply: () => {
      mutate(BOARD,
        "  const mine = userId ? (await myStakesByMarket(userId, [r.marketId])).get(r.marketId) : undefined;",
        "  const mine = userId ? { positions: (await listPositionsForUser(userId, 500, \"UPDOWN\").catch(() => [])).filter((p) => p.marketId === r.marketId) } : undefined;",
        "restore the global-cap-then-filter read");
    },
  },
  {
    name: "D5 · a failed board position read claims the player has no stake",
    suite: "fault",
    expected: "board must not turn failed position read into no stake",
    apply: () => mutate(BOARD,
      '.map((marketId) => positionStore.listForUserAndMarket(userId, marketId))',
      '.map((marketId) => positionStore.listForUserAndMarket(userId, marketId).catch(() => []))',
      "restore the board's silent-empty fallback on each indexed read"),
  },
  {
    name: "D6 · a failed history position read claims the player has no bets",
    suite: "fault",
    expected: "history must not turn failed position read into no bets",
    apply: () => mutate(BOARD,
      '  const positions = await listPositionsForUser(userId, limit, "UPDOWN");',
      '  const positions = await listPositionsForUser(userId, limit, "UPDOWN").catch(() => []);',
      "restore the history's silent-empty fallback"),
  },
  {
    // 2026-10-21 · U43 Release B (4e9d9bcbe): the detail's own read is its `myStakesByMarket` call; the fallback is
    // planted there alone (the board's read stays honest), so only the detail's fault assertion can catch it.
    name: "D7 · a failed round position read claims the player never bet",
    suite: "fault",
    expected: "detail must not turn failed position read into no stake",
    apply: () => mutate(BOARD,
      "  const mine = userId ? (await myStakesByMarket(userId, [r.marketId])).get(r.marketId) : undefined;",
      "  const mine = userId ? (await myStakesByMarket(userId, [r.marketId]).catch(() => new Map())).get(r.marketId) : undefined;",
      "restore the round's silent-empty fallback"),
  },
  {
    name: "D8 · a failed asset catalog read claims there are no markets",
    suite: "fault",
    expected: "player board must not turn failed asset catalog read into an empty market",
    // 2026-10-21 · U43 Release B (c29cb7526) put a dev-only fault probe in front of this read, so the real catalog read
    // is now the probe's `: …` arm; the fallback is planted on that arm, exactly where a player's request goes.
    apply: () => mutate(BOARD,
      "      : assetStore.list({ enabledOnly: true }),",
      "      : assetStore.list({ enabledOnly: true }).catch(() => [] as StoredAsset[]),",
      "restore the asset catalog's silent-empty fallback"),
  },
  {
    name: "D9 · a failed chain catalog read claims there are no rounds",
    suite: "fault",
    expected: "player board must not turn failed chain catalog read into an empty market",
    apply: () => mutate(BOARD,
      "    chainStore.list(),",
      "    chainStore.list().catch(() => [] as StoredChain[]),",
      "restore the chain catalog's silent-empty fallback"),
  },
  {
    name: "D10 · a failed round list claims the live board is empty",
    suite: "fault",
    expected: "player board must not turn failed round list read into an empty market",
    apply: () => mutate(BOARD,
      "  const raw = await roundStore.list({ chainId: chain.id, limit: 24 });",
      "  const raw = await roundStore.list({ chainId: chain.id, limit: 24 }).catch(() => []);",
      "restore the round list's silent-empty fallback"),
  },
  {
    name: "D11 · a failed history round lookup becomes Unknown",
    suite: "fault",
    expected: "history must not turn failed round lookup into Unknown",
    apply: () => mutate(BOARD,
      "round = await roundStore.getByMarketId(p.marketId);",
      "round = await roundStore.getByMarketId(p.marketId).catch(() => null);",
      "restore the round lookup's silent-null fallback"),
  },
  {
    name: "D12 · a failed history chain lookup becomes Unknown",
    suite: "fault",
    expected: "history must not turn failed chain lookup into Unknown",
    apply: () => mutate(BOARD,
      "chain = await chainStore.get(round.chainId);",
      "chain = await chainStore.get(round.chainId).catch(() => null);",
      "restore the chain lookup's silent-null fallback"),
  },
  {
    name: "D13 · a failed history asset lookup becomes Unknown",
    suite: "fault",
    expected: "history must not turn failed asset lookup into Unknown",
    apply: () => mutate(BOARD,
      "asset = await assetStore.get(chain.assetId);",
      "asset = await assetStore.get(chain.assetId).catch(() => null);",
      "restore the asset lookup's silent-null fallback"),
  },
  {
    name: "D14 · a failed successor lookup claims there is no next round",
    suite: "fault",
    expected: "detail must not turn failed successor lookup into no next round",
    apply: () => mutate(BOARD,
      "  const pool = siblings ?? await roundStore.list({ chainId: chain.id, limit: 4 });",
      "  const pool = siblings ?? await roundStore.list({ chainId: chain.id, limit: 4 }).catch(() => []);",
      "restore the detail successor's silent-empty fallback"),
  },
  // 2026-10-21 · U43 Release B (4e9d9bcbe) moved the viewer filter into the read itself. Each leak below must be seen
  // by 4.3's source check AND, where the memory store can show it, by the two-player fixture in the fault guard.
  {
    name: "D15 · the memory store's own-position read returns every player's rows on the market",
    expected: "FAIL 4.3",
    apply: () => mutate(DAL,
      "    return Array.from(positions.values()).filter((p) => p.userId === userId && p.marketId === marketId);",
      "    return Array.from(positions.values()).filter((p) => p.marketId === marketId);",
      "drop the memory store's user key"),
  },
  {
    name: "D16 · …and the two-player fixture sees the other player's row handed to the viewer",
    suite: "fault",
    expected: "the indexed own-position read returns the viewer's row and nobody else's",
    apply: () => mutate(DAL,
      "    return Array.from(positions.values()).filter((p) => p.userId === userId && p.marketId === marketId);",
      "    return Array.from(positions.values()).filter((p) => p.marketId === marketId);",
      "drop the memory store's user key"),
  },
  {
    name: "D17 · the PostgreSQL store's own-position read drops its user key",
    expected: "FAIL 4.3",
    apply: () => mutate(DAL,
      "    const rows = await (tx ?? pc()).position.findMany({ where: { userId, marketId } });",
      "    const rows = await (tx ?? pc()).position.findMany({ where: { marketId } });",
      "drop the PostgreSQL store's user key"),
  },
  {
    name: "D18 · a guest reaches the own-position read (PostgreSQL reads `userId: undefined` as every player)",
    expected: "FAIL 4.3",
    apply: () => mutate(BOARD,
      "  if (!userId || marketIds.length === 0) return out;",
      "  if (marketIds.length === 0) return out;",
      "remove the guest shortcut"),
  },
  {
    name: "D19 · the board and detail read every player's rows on the market",
    expected: "FAIL 4.3",
    apply: () => mutate(BOARD,
      ".map((marketId) => positionStore.listForUserAndMarket(userId, marketId))",
      ".map((marketId) => positionStore.listForMarket(marketId))",
      "read the market-wide list"),
  },
  {
    name: "D20 · …and the two-player fixture sees the other player's stake on the viewer's card",
    suite: "fault",
    expected: "board must not show another player's stake as the viewer's",
    apply: () => mutate(BOARD,
      ".map((marketId) => positionStore.listForUserAndMarket(userId, marketId))",
      ".map((marketId) => positionStore.listForMarket(marketId))",
      "read the market-wide list"),
  },
];

console.log("RED · restoring each pre-fix defect on its own and requiring the guard to catch it\n");

// Sanity: the guard must be GREEN before we break anything. A proof that starts red
// proves nothing about the mutations.
if (guardIsRed()) {
  restore();
  console.error("✗ the guard is ALREADY red on the unmodified tree — fix that first");
  process.exit(2);
}
console.log("  ok   baseline · the guard is green on the current tree\n");
if (guardIsRed("fault")) {
  restore();
  console.error("✗ the position-read fault guard is ALREADY red on the unmodified tree");
  process.exit(2);
}
console.log("  ok   baseline · the real position-read fault guard is green\n");

let caught = 0;
for (const c of cases) {
  restore();
  c.apply();
  const red = guardIsRed(c.suite, c.expected);
  console.log(`  ${red ? "ok  " : "FAIL"} ${c.name} → guard ${red ? "went RED" : "STAYED GREEN"}`);
  if (red) caught++;
}
restore();

console.log(`\nred:updown-positions-visible: ${caught}/${cases.length} defects caught`);
if (caught !== cases.length) {
  console.error("✗ at least one real defect slips past the guard — the gate is not a gate");
  process.exit(1);
}
console.log("red:updown-positions-visible: OK — every pre-fix defect is seen, and the tree is restored");
