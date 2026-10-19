/** U43 B3: a stale older confirming round must not outrank the latest settled one. */
export function staleConfirmingIssues(board) {
  const issues = [];
  const begin = board.indexOf("const current = started[0] ?? null;");
  const end = board.indexOf("const selected = await withSuccessors(", begin);
  if (begin < 0 || end < 0) return ["board round selection missing"];
  let select;
  try {
    select = new Function("mapped", "started", `${board.slice(begin, end)}; return { current, justClosed, lastDone };`);
  } catch {
    return ["board round selection cannot be evaluated"];
  }
  const round = (id, state, minute) => ({ roundId: id, state, opensAt: new Date(Date.UTC(2026, 9, 19, 15, minute)).toISOString() });
  const pick = (mapped) => select(mapped, mapped.filter((r) => r.state !== "resolved" && r.state !== "void"));
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
  } catch {
    issues.push("board round selection failed on a real phase fixture");
  }
  return issues;
}
