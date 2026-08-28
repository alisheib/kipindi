/**
 * THE ANCHORS `red:chain-removal` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Jay (Gaming Board) item #3 — removing a chain must not be able to erase the settlement
 * record. `UpDownRound.chain` is `onDelete: Cascade`, and this platform has already lost
 * 1,915 rounds that way (`e63-window.cjs`).
 *
 * ⭐ THE FIRST IS THE CATASTROPHE ITSELF — the guard is removed and a chain carrying real
 * settlement history deletes cleanly, taking its rounds with it and reporting success.
 *
 * ⭐ THE LAST IS THE POSITIVE CONTROL, and it is the half people forget: it makes
 * `deleteChain` refuse EVERYTHING. Every refusal assertion passes harder, the audit trail is
 * perfectly safe, and the control the Board asked for does not work at all. **A control that
 * never works is not a safe control, it is a broken one.**
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree); no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const CFG = "src/lib/server/updown-config.ts";
const PAGE = "src/app/admin/updown/page.tsx";
const ACT = "src/app/admin/updown/actions.ts";
const SERVICE = "src/lib/server/updown-service.ts";
const ARCHIVED_GUARD = `  if (chain.state === "ARCHIVED") {`;

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "delete-stops-counting-rounds",
    why: "⭐ THE CATASTROPHE: the round count is never taken, so a chain carrying real settlement history deletes cleanly and CASCADES its rounds away — reporting success. This is the shape that already cost this platform 1,915 rounds",
    file: CFG,
    suite: "chain-removal",
    from: `  const rounds = await roundStore.count({ chainId: id });`,
    to: `  const rounds = 0;`,
    expect: "2: 🔴 deleting a chain WITH rounds is refused",
  },
  {
    name: "refusal-hides-the-count",
    why: "the refusal stops naming how many rounds are at stake, so an operator is told 'no' without being told what they nearly destroyed or what to do instead — the refusal becomes a wall rather than a remedy",
    file: CFG,
    suite: "chain-removal",
    from: `      error: \`This chain has \${rounds.toLocaleString()} round\${rounds === 1 ? "" : "s"} and cannot be deleted — deleting it would erase their settlement record. Archive it instead.\`,`,
    to: `      error: "This chain cannot be deleted.",`,
    expect: "2: …and the refusal states the COUNT",
  },
  {
    name: "archive-loses-the-rounds",
    why: "🔴 archive is implemented as a DELETE, which is the exact trade the whole item exists to prevent: the chain leaves the list, the operator sees success, and every round it ever ran goes with it",
    file: CFG,
    suite: "chain-removal",
    from: `  return setChainState(id, "ARCHIVED", officerId);`,
    to: `  await chainStore.delete(id); return { ok: true, data: cur };`,
    // ⚠️ It goes red on "it lands in ARCHIVED" first, which is the honest EARLIER signature:
    // a chain that was deleted cannot be in any state, so its disappearance is detected
    // before its rounds can be counted. Naming the round-count assertion would have been
    // naming a later symptom of the same one act.
    expect: "4: …and it lands in ARCHIVED",
  },
  {
    name: "running-chain-can-be-archived",
    why: "a RUNNING chain can be filed away while it is still opening rounds — the board disappears from the operator's list and keeps taking bets, which is the opposite of a safe control",
    file: CFG,
    suite: "chain-removal",
    from: `  if (cur.state === "RUNNING") {\n    return { ok: false, error: "Stop the chain before archiving it — a running chain is still opening rounds." };\n  }`,
    to: `  if (false) {\n    return { ok: false, error: "Stop the chain before archiving it — a running chain is still opening rounds." };\n  }`,
    expect: "4: 🔴 a RUNNING chain is refused, with the reason",
  },
  {
    name: "archived-chains-vanish-from-admin",
    why: "archived chains stop being listed for admins at all, so there is no way back to a board filed by mistake — a filing state that cannot be un-filed is a deletion with extra steps, and it would LOOK like a tidier console",
    file: PAGE,
    suite: "chain-removal",
    from: `  const archived = allChains.filter((c) => c.state === "ARCHIVED");`,
    to: `  const archived: typeof allChains = [];`,
    expect: "5: ⭐ …and they are still listed for admins",
  },
  {
    name: "control-delete-refuses-everything",
    why: "⭐ POSITIVE CONTROL — `deleteChain` refuses every chain, including one that never opened a round. Every refusal assertion passes HARDER and the audit trail is perfectly safe, while the control the Gaming Board asked for does not work at all. A control that never works is not a safe control, it is a broken one",
    file: CFG,
    suite: "chain-removal",
    from: `  if (rounds > 0) {`,
    to: `  if (rounds >= 0) {`,
    expect: "3: ⭐ a chain that never opened a round IS deleted",
  },

  /* ── §7 · S-16 (scan #1, 2026-08-28) — the state check on the round-opening path ──
   * `generateRoundNow` is the ONLY way a round comes into existence since E-67, and it never
   * read `chain.state`. The product's promise that an archived chain "disappears from the
   * player board" was kept solely by admin/updown/page.tsx filtering archived rows out of the
   * working table so the Generate button never rendered — a guarantee living in a LIST FILTER
   * rather than in the money path, one restored row or one ad-hoc call away from being false. */
  {
    name: "archived-can-open-a-round-again",
    why: "⭐ THE DEFECT AS IT SHIPPED. With the guard gone the suite does not merely lose a sentence — it OPENS A REAL BETTABLE ROUND ON AN ARCHIVED CHAIN, which §7's last check reports as \"(unexpectedly ok)\". The guarantee that an archived chain cannot take money must live in the money path, not in a page component's filter",
    file: SERVICE,
    suite: "chain-removal",
    from: ARCHIVED_GUARD,
    to: `  if (false) {`,
    expect: "7: 🔴 an ARCHIVED chain IS refused a round",
  },
  {
    name: "the-state-guard-refuses-every-state",
    why: "⭐ POSITIVE CONTROL, AND IT GUARDS THE DECISION RATHER THAN THE CODE. Refusing ARCHIVED only — allowing RUNNING, PAUSED and STOPPED — was the deliberate scope: since E-67 every chain sits STOPPED by design and rounds are generated by hand, so a guard that also refused STOPPED would take the entire console down while looking maximally safe. A suite asserting only \"ARCHIVED is refused\" would pass just as happily over that. Over-refusal is the more likely failure and it must go red too",
    file: SERVICE,
    suite: "chain-removal",
    from: ARCHIVED_GUARD,
    to: `  if (chain.state !== "NEVER_A_REAL_STATE") {`,
    expect: "7: ⭐ a RUNNING chain is NOT refused for its state",
  },

  /* ── §8 · S-18 — a destructive write that swallowed its own failure ──
   * `chainStore.delete` ended in `.catch(() => {})` and returns void either way, and
   * `deleteChain` never read back — so a delete that failed still returned ok AND wrote the
   * `updown.chain.deleted` audit row. The mirror image of a defect already recorded in the
   * reset script's own comment ("it verified the DELETION and never the audit"), and the
   * worse direction: the audit said yes and the data said no. */
  {
    name: "the-caller-stops-reading-back",
    why: "⭐ THE DEFECT AS IT SHIPPED. The store still throws, but the caller stops catching and verifying — so a failed delete is audited as `updown.chain.deleted` and the log asserts a deletion that never happened, on the one control that exists to answer the Gaming Board",
    file: CFG,
    suite: "chain-removal",
    from: `  const stillThere = await chainStore.get(id);`,
    to: `  const stillThere = null as Awaited<ReturnType<typeof chainStore.get>>;`,
    expect: "8: 🔴 a delete that SILENTLY does nothing is refused too",
  },
  {
    name: "the-delete-swallows-its-error-again",
    why: "The DAL half, restored verbatim: `.catch(() => {})` on the chain delete. This is the shape that made the caller's silence possible — the store reported success for an FK violation, a dropped connection or a vanished row, and returns void either way so nothing downstream could tell",
    file: "src/lib/server/updown-dal.ts",
    suite: "chain-removal",
    from: `  async delete(id) { await pc().upDownChain.delete({ where: { id } }); },`,
    to: `  async delete(id) { await pc().upDownChain.delete({ where: { id } }).catch(() => {}); },`,
    expect: "8: ⛔ no destructive DAL delete swallows its own error",
  },
  {
    name: "the-verified-delete-refuses-everything",
    why: "⭐ POSITIVE CONTROL for the verification itself. `deleteChain` treats every delete as failed: §8's refusal assertions all pass HARDER, no false audit row is ever written, and the control the Gaming Board asked for silently stops working. A guard that can only ever refuse is not a safe guard, it is a broken control that no refusal-only assertion can see",
    file: CFG,
    suite: "chain-removal",
    from: `  if (stillThere) {`,
    to: `  if (stillThere || true) {`,
    expect: "8: ⭐ a delete that WORKS is still permitted",
  },
];
