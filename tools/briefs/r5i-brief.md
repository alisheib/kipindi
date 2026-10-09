# R5-I brief — every state in its own ink: the betting colours only for betting, one way to refuse (follow-up)

You are helper R5-I in the follow-up round of 50pick's visual pass for Vodacom. Read first, completely:
S\briefs\r5-common.md (the rules — CONSISTENCY above all; where it says "1699302a" read the tip named below), then
docs/design-system/DESIGN_AUTHORITY.md's §B2a, §B11, §C4 and the F-section on feedback (F2–F4), and R5-C's commit
message (`git log --format=%B --grep "R5-C" -1` in your worktree) — its one rule for colour, which you extend to the
state inks, and its suite (scripts/visual-pass-r5c.test.mts: the census technique and REGISTRY style).
Worktree: F:\kipindi-r5i (branch vodacom-visual-r5i at vodacom-visual's tip 95ff793b: R5-F, R5-D, R5-B and R5-C merged; R5-A and R5-E are still finishing in
F:\kipindi-r5a / F:\kipindi-r5e and merge later — read their diffs there if you touch a file they touch, never edit
them). Working at the same time: R5-A (the dialogs' ✕), R5-E (text wrapping, keep-words), R5-G (names, counts, the
regulator's name — starts after R5-A merges), R5-H (loading ghosts, the journey flag), R5-I (state inks).
Suite: scripts/visual-pass-r5i.test.mts → test:visual-pass-r5i (extend test:feedback-law / test:betting-ink where they
already own the rule — read them first; red:feedback-law must stay red-capable).
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

YOUR ITEMS (R5-C found them; they are not gold, so it left them)
I-1 The betting NO ink (rose/`--no-*`, the HAPANA side's colour) used for APP state (§B2a: the betting pair is for the
    two sides of a bet, never for "error" or "danger"): the avatar clear-button hover, the old dial's over/under chips,
    OperationResultModal's success/danger crests, global-error's error box. And the mirror: the YES ink (`--yes-*`) used
    for "success". Census every use of `--no-*`/`--yes-*` (and `no-500`, `yes-400`… classes, hand-typed hue ~22 / ~152
    oklch literals) in player code; rule each (a side of a bet / a probability / a position's side = allowed; app
    state = the app-state tokens `--danger-*` / `--success-*`) and fix the rest, with siblings.
I-2 Fixable refusals shown as popups where F2 says a toast (R5-C: the old dial's refusals). Find every refusal a player
    can fix themselves (a stake under the minimum, over the balance, outside a limit…) and how it is shown; bring each to
    the feedback law's one form, or state why it differs. ⛔ Never reword or remove an RG sentence, notice or limit
    control; the dial is shelved in the journey (S8 replaces it) but classic players use it today — a shared body.
I-3 Dormant grant chips use the warning tone for every word (R5-C): the warning family is for "somebody must act"
    (§B11). Rule each chip state of a grant/bonus/cashback (dormant, pending, granted, expired) and bring the family to
    one convention (granted money is gold — R5-C's rule; the rest per §B11).

PROOF as r5-common.md says (suite with a census ratchet like R5-C's §1, controls/plants, mutation proof under S\r5i\,
every suite that reads a touched file). Contrast: every new ink pair measured (≥4.5:1 text, ≥3:1 marks). Name the
files that need tsc and what a lock turn must re-tile.
