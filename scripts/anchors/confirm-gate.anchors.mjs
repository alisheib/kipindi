/**
 * THE ANCHORS `red:confirm-gate` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` must answer *"does every anchor still resolve, exactly
 * once?"* WITHOUT executing a harness that rewrites real source. One definition, imported
 * by both. ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * S-17 (scan #1, 2026-08-28): `ConfirmModal` computed `isHard = tier === "hard" && !!typedWord`,
 * so a hard tier with no word rendered an ordinary one-click confirm wearing the styling of a
 * gate. Four live sites did that; three were RBAC-destructive on the two OWNER_ONLY_PREFIXES.
 *
 * ⭐ 1 IS THE DEFECT ITSELF, at a call site. ⭐ 2 AND 4 ARE THE TWO WAYS THE PRIMITIVE CAN BE
 * QUIETLY UNDONE — reverting the union to optionals, and restoring the fail-open `armed`
 * expression. Both leave every call site untouched and every other assertion green, which is
 * exactly why the suite must read the primitive and not only its callers.
 *
 * ⭐ 3 GUARDS A DECISION RATHER THAN CODE: the two /admin/roles reset dialogs are adjacent tabs
 * of one screen, same tone, same confirm label, one word of difference in the title. Giving
 * them the same typed word re-creates the muscle memory the gate exists to interrupt, and no
 * type can see it.
 *
 * ⭐ 5 IS THE POSITIVE CONTROL. §1 can only report what it parsed; blind the element reader and
 * "every gate is armed" is printed in the same words as "I could not read a single element".
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree), and no replacement CONTAINS its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const MODAL = "src/components/ui/modal.tsx";
const ROLES = "src/app/admin/roles/roles-matrix.tsx";
const READS = "src/app/admin/roles/read-tiers-matrix.tsx";
const SUITE = "scripts/confirm-gate.test.mts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "a-hard-gate-loses-its-word",
    why: "⭐ THE DEFECT AS IT SHIPPED, at a call site: 'Reset all role permissions to defaults?' keeps its claret tone, its eyebrow and its hard styling, and becomes a one-click confirm. This is one of the three RBAC-destructive dialogs on an OWNER_ONLY surface that were live in exactly this state",
    file: ROLES,
    suite: "confirm-gate",
    from: `        typedWord="RESET PERMISSIONS"`,
    to: `        /* the word is gone and nothing says so */`,
    expect: `1: 🔴 every ConfirmModal that can reach tier="hard" carries a typedWord`,
  },
  {
    name: "the-union-reverts-to-two-optionals",
    why: "The primitive undone without touching a single call site. Every site still passes its word, so §1 stays green and the tree still builds — but the NEXT site can express hard-with-no-word again, which is how this defect arrived the first time",
    file: MODAL,
    suite: "confirm-gate",
    from: `  | { tier: "hard"; typedWord: string }`,
    to: `  | { tier?: "hard"; typedWord?: string }`,
    expect: "3: the hard arm REQUIRES the word",
  },
  {
    name: "the-two-roles-resets-share-a-word",
    why: "⭐ A DECISION, NOT A TYPE. Two adjacent tabs of one screen, same tone, same confirm label, one word of difference in the title. A shared word arms whichever dialog happens to be open — the exact muscle memory a typed gate exists to interrupt. No type system can see this and §1 passes happily",
    file: READS,
    suite: "confirm-gate",
    from: `        typedWord="RESET READ LEVELS"`,
    to: `        typedWord="RESET PERMISSIONS"`,
    expect: "2: ⛔ …and they are DIFFERENT words",
  },
  {
    name: "the-gate-fails-open-again",
    why: "Restores the fail-OPEN arming expression. A `typedWord` that arrives empty at runtime — an untyped caller, or a word computed from state that happened to be \"\" — then matches an empty input box, so the gate is on screen and armed before anyone types. The type cannot forbid an empty string; only the runtime can refuse it",
    file: MODAL,
    suite: "confirm-gate",
    from: `  const armed = !isHard || (gateWord !== "" && typed.trim().toUpperCase() === gateWord.toUpperCase());`,
    to: `  const armed = !isHard || typed.trim().toUpperCase() === gateWord.toUpperCase();`,
    expect: "3: the gate FAILS CLOSED",
  },
  {
    name: "the-element-reader-goes-blind",
    why: "⭐ THE POSITIVE CONTROL. §1 iterates what it parsed, so a reader that parses nothing reports zero unarmed gates — \"every gate is armed\" and \"I could not read a single element\" printed identically. The reconciliation must go red here, not §1",
    file: SUITE,
    suite: "confirm-gate",
    from: `    if (el === null) continue;`,
    to: `    if (el === null || true) continue;`,
    expect: "1: …and the element reader kept up with every <ConfirmModal in the tree",
  },
];
