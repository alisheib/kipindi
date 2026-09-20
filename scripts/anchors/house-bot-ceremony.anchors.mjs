/**
 * Anchors for `test:house-bot-rules` §7 — the two typed ceremony words the console actually ships
 * (`CONSOLE_SWITCH_ON_WORD` = "SWITCH ON", `CONSOLE_REMOVE_WORD` = "REMOVE").
 *
 * ⭐ WHY THIS FILE EXISTS. §7 used to be a five-row truth table over `isTypedWord` /
 * `normaliseTypedWord` / `TYPED_WORD` in `constants.ts` — a module with ZERO production callers. It
 * was green on every run and measured nothing the product contains, which is worse than no test: a
 * green row reads as coverage. The helpers are deleted and §7 now pins the comparison that RUNS.
 * ⛔ A section that moved from a dead module to a live one has to prove it can still go red against
 * the LIVE one, and `test:house-bot-rules` has no `red:*` harness of its own — so the mutations are
 * declared here and `test:red-anchors` §3 keeps them pointed at the product.
 *
 * ⛔ WHY THE HELPERS WERE DELETED RATHER THAN ADOPTED, since that was a real choice: the shipped
 * ceremonies compare with a plain `.trim()`, deliberately, and `normaliseTypedWord` upper-cased and
 * collapsed whitespace. Adopting it would have let "switch on" and "remove" arm an irreversible
 * removal and the master switch of a live money feature — and would have made a shipped sentence
 * false, because the refusal an officer reads promises capitals.
 *
 * `expect` names the `ok("…")` label that must turn red; `suite` is `rules`
 * (`npx tsx scripts/house-bot-rules.test.mts`, pure — no database, no network).
 */
const CONSOLE = "src/lib/server/house-console-read.ts";
const DESK = "src/app/admin/desk/[id]/account-actions.tsx";

export const MUTATIONS = [
  {
    name: "ceremony-fold-remove · the removal's server re-check case-folds, so a crafted POST carrying \"remove\" deletes an account",
    file: CONSOLE,
    from: `    if ((typeof input.typed === "string" ? input.typed.trim() : "") !== CONSOLE_REMOVE_WORD) {`,
    to: `    if ((typeof input.typed === "string" ? input.typed.trim().toUpperCase() : "") !== CONSOLE_REMOVE_WORD) {`,
    expect: "7.server.remove · …and the removal the same way, so a crafted POST meets the same ceremony the dialog does",
    suite: "rules",
  },
  {
    /* ⭐ THE ONE THAT PROVES 7.nofold EARNS ITS PLACE. The fold happens BEFORE the ceremony, on the
     * way in — a shape real code reaches for whenever an input object is tidied up at the top of a
     * handler — and the comparison line itself is left BYTE-IDENTICAL. So `7.server.switch` and
     * `7.client`, which pin the SHAPE of the comparison, stay GREEN on a build where "switch on"
     * now arms the master switch. Only the sweep sees it. ⛔ A first draft of this mutation rewrote
     * the comparison line too, and the drive caught it going red for a WIDER reason than it claimed. */
    name: "ceremony-prefold-switch · the typed value is folded on its way IN, leaving the comparison line byte-identical — the shape-pins cannot see this one",
    file: CONSOLE,
    from: `  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < CONSOLE_REASON_MIN) return { ok: false, error: SWITCH_COPY.reasonShort };`,
    to: `  input = { ...input, typed: typeof input.typed === "string" ? input.typed.toUpperCase() : input.typed };
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < CONSOLE_REASON_MIN) return { ok: false, error: SWITCH_COPY.reasonShort };`,
    expect: "7.nofold · ⛔ neither ceremony case-folds or re-spaces what was typed (5 foldings swept on 2 files)",
    suite: "rules",
  },
  {
    name: "ceremony-fold-client · the DIALOG case-folds, so the officer is never made to type the capitals the refusal promises",
    file: DESK,
    from: `  if (copy.word !== null && v.typed.trim() !== copy.word) return false;`,
    to: `  if (copy.word !== null && v.typed.trim().toUpperCase() !== copy.word) return false;`,
    expect: "7.client · the dialog arms on that SAME plain trim, never a case-fold",
    suite: "rules",
  },
  {
    name: "ceremony-word-drift · the switch's ceremony word stops being the literal the refusal quotes",
    file: CONSOLE,
    from: `export const CONSOLE_SWITCH_ON_WORD = "SWITCH ON";`,
    to: `export const CONSOLE_SWITCH_ON_WORD = "SWITCHON";`,
    expect: "7.word.switch · the master switch's ceremony word is the literal \"SWITCH ON\"",
    suite: "rules",
  },
  {
    name: "ceremony-normaliser-returns · the retired normaliser comes back WITH a caller — the exact regression 7.retired exists to catch",
    file: CONSOLE,
    from: `export const CONSOLE_REMOVE_WORD = "REMOVE";`,
    to: `export const CONSOLE_REMOVE_WORD = "REMOVE";\nconst normaliseTypedWord = (s: string) => s.normalize("NFKC").trim().replace(/\\s+/g, " ").toUpperCase();\nexport const typedRemoveMatches = (s: string) => normaliseTypedWord(s) === CONSOLE_REMOVE_WORD;`,
    expect: "7.retired · ⛔ no file under src/ names the retired normaliser (3 names swept over 1087 files)",
    suite: "rules",
  },
];
