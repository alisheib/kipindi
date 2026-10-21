/** U43 B3: a stale older confirming round must not outrank the latest settled one. */
import { latestNonOverlappingResult } from "../src/lib/updown-board-order.ts";

export function staleConfirmingIssues(board, selectResult = latestNonOverlappingResult) {
  const issues = [];
  if (!board.includes('import { latestNonOverlappingResult } from "@/lib/updown-board-order";')) {
    issues.push("board no longer imports its non-overlapping result selector");
  }
  const begin = board.indexOf("const current = started[0] ?? null;");
  // 2026-10-21 · U43 Release B (3bcbec37e) attaches the viewer's positions AFTER the selection: the picks become
  // `selectedBare`, are re-drawn with their indexed money rows (`await myStakesByMarket(…)`, TypeScript casts), and only
  // that hydrated list reaches `withSuccessors`. The hydration chooses no card and cannot run in `new Function`, so the
  // evaluated slice now ends where the selection is consumed — the very statements it evaluated before, unchanged — and
  // the hand-on is pinned instead: the three picks in their order, mapped in that order into what `withSuccessors` gets.
  const end = board.indexOf("const selectedBare = ", begin);
  if (begin < 0 || end < 0) return ["board round selection missing"];
  const handOn = board.slice(end, board.indexOf("\n", board.indexOf("const selected = await withSuccessors(", end)));
  if (!handOn.startsWith("const selectedBare = [current, justClosed, lastDone].filter(Boolean) as BoardRound[];")) {
    issues.push("board no longer hands on its picks as current, just closed, last result");
  }
  if (!/\n\s*const selectedWithMine = \(await Promise\.all\(selectedBare\.map\(async \(round\) => \{/.test(handOn)
    || !/\n\s*const selected = await withSuccessors\(selectedWithMine, chain, raw\);/.test(handOn)) {
    issues.push("board hydration no longer hands the selected picks, in order, to its successors");
  }
  let select;
  try {
    select = new Function("mapped", "started", "latestNonOverlappingResult", `${board.slice(begin, end)}; return { current, justClosed, lastDone };`);
  } catch {
    return ["board round selection cannot be evaluated"];
  }
  const round = (id, state, minute) => ({
    roundId: id, state,
    opensAt: new Date(Date.UTC(2026, 9, 19, 15, minute)).toISOString(),
    closesAt: new Date(Date.UTC(2026, 9, 19, 15, minute + 6)).toISOString(),
  });
  const pick = (mapped) => select(mapped, mapped.filter((r) => r.state !== "resolved" && r.state !== "void"), selectResult);
  try {
    const olderStale = pick([round("26", "open", 48), round("25", "resolved", 42), round("24", "confirming", 36)]);
    if (olderStale.current?.roundId !== "26" || olderStale.justClosed !== null || olderStale.lastDone?.roundId !== "25")
      issues.push("older confirming round displaced the latest settled result");
    const actualPredecessor = pick([round("26", "open", 48), round("25", "confirming", 42), round("24", "resolved", 36)]);
    if (actualPredecessor.current?.roundId !== "26" || actualPredecessor.justClosed?.roundId !== "25")
      issues.push("immediately preceding confirming round disappeared");
    const outage = pick([round("26", "confirming", 48), round("25", "confirming", 42)]);
    if (outage.current?.roundId !== "26" || outage.justClosed !== null)
      issues.push("two older confirming rounds became live board cards");
    const settledOnly = pick([round("25", "resolved", 42)]);
    if (settledOnly.current !== null || settledOnly.justClosed !== null || settledOnly.lastDone?.roundId !== "25")
      issues.push("settled-only board lost its last result");
    const overlappingResult = pick([round("26", "open", 48), round("25", "resolved", 45), round("24", "resolved", 39)]);
    if (overlappingResult.current?.roundId !== "26" || overlappingResult.lastDone !== null)
      issues.push("a resolved window overlapping the open round appeared as its last result");
  } catch {
    issues.push("board round selection failed on a real phase fixture");
  }
  return issues;
}
