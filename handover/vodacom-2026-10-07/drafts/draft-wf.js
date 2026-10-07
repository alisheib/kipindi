export const meta = {
  name: 'a8i2-a8j-draft',
  description: 'Draft A8i-2 (held key + dialog stack) and A8j (implicit submit skips confirm) as reviewed change sets',
  phases: [
    { title: 'Draft', detail: 'two writers on disjoint files' },
    { title: 'Review', detail: 'three lenses per change set' },
    { title: 'Revise', detail: 'apply the reviews' },
  ],
}

const OLD = 'C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0cb4430f-1841-4f87-b929-7c29d30c9a10/scratchpad/s6'
const CONFIRMED = 'THE FINDINGS FILE: C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/4d434d2f-fa0e-4e9b-8bfa-71eeeb679f82/scratchpad/a8i2/findings.json (23 findings: read it FIRST, whole, with python and PYTHONIOENCODING=utf-8; each has id, title, severity, origin, scenario, evidence, proposedFix, lenses).'

const CTX = [
  'You are drafting a LIVE money-safety fix for 50pick (Kipindi), a real-money prediction-market platform in Tanzania (sw/en/zh; most players on phones, some on keyboards). Today is 2026-10-07.',
  'THE TREE: C:/kipindi-journey at origin/main 7d4b0ad5, which includes S6 A8i (commit 23f762f4: a dialog acts on Enter only where it is pressed - the bet confirm, Sell confirm and result dialog lost their window Enter listeners; Modal swallows a held key auto-repeat via src/lib/held-key.ts; Select scoped). Read code THERE (a proof chain is running in that worktree: read only, never write). The A8i diff: git -C C:/kipindi-journey show 23f762f4 -- src scripts package.json.',
  'A five-lens adversarial review of A8i REPORTED these findings (JSON, merged across lenses, with scenarios, evidence and proposed fixes). Two are PROVEN in a real browser on 2026-10-07 by a 12-case drive on the A8i tree: W2 (the Sell confirm open, the win seal over it, two Enters about 60 ms apart: the second, landing on "Uza" while the seal was still leaving, SOLD the ticket - a real sale) and K (Enter held on "Hifadhi nafasi" closed the confirm and its repeats opened it again; no sale). Independent skeptics are verifying the rest in parallel: CHECK EVERY CLAIM AGAINST THE CODE BEFORE YOU FIX IT; a claim the code refutes is skipped with a note saying why. A8i itself is LIVE on main (commit 23f762f4); its records are written (do not re-do them):',
  CONFIRMED,
  '',
  'HARD RULES: READ-ONLY - never edit, create or delete any file; never run node, npm, npx, tsx, next or playwright (this laptop has failing RAM; the coordinator runs every gate). Use Read, Grep, Glob and read-only git. Never Read a file over ~60 KB whole (Grep, then offset/limit). Return ONLY through the structured output tool.',
  'CHANGE-SET RULES (the coordinator applies them with a strict tool): edits are {file, find, replace}; each find must occur EXACTLY ONCE in the file at HEAD (newline style does not matter); newFiles are {path, content}. NO BACKSLASH CHARACTER anywhere in any find, replace or content (this pipeline mangles them): write regexes with character classes ([0-9], [.]) or avoid them, and use String.fromCharCode(10) for a newline in code. Tailwind scans comments: no class-shaped strings in comments. Match the surrounding code: its comment density and style (the repo writes long, precise, plain-English comments with the defect they close), naming, idiom. No word, figure, markup, class or CSS changes a player sees unless the defect needs one (say so).',
  'GATES the repo requires: a tsx suite in scripts/ (npm test:* key in package.json, added to the predeploy chain where money is concerned) with an IN-PROCESS red twin (--prove-red: every defect planted IN MEMORY, each caught by its named check) - model on scripts/enter-where-pressed.test.mts and scripts/sell-grace-truth.test.mts; and a real-browser drive case (model on scripts/qa-enter-where-pressed.mjs; local in-memory server only). Records (VODACOM-PLAN etc.) are NOT yours: the coordinator writes them.',
  '',
].join('\n')

const CS = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    newFiles: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
    edits: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, find: { type: 'string' }, replace: { type: 'string' } }, required: ['file', 'find', 'replace'] } },
    packageJsonKeys: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' }, predeploy: { type: 'boolean' } }, required: ['key', 'value', 'predeploy'] }, description: 'package.json script keys to add (the coordinator merges them; do NOT edit package.json yourself)' },
    driveCases: { type: 'array', items: { type: 'string' }, description: 'the real-browser cases to add to qa:enter-where-pressed (or a new drive file in newFiles), each with its expected outcome and its control' },
    callsForAli: { type: 'array', items: { type: 'string' }, description: 'decisions taken under delegation, each as: the decision, why, and the overrule Ali may choose' },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'newFiles', 'edits', 'packageJsonKeys', 'driveCases', 'callsForAli', 'notes'],
}
const REV = {
  type: 'object',
  properties: { problems: { type: 'array', items: { type: 'object', properties: {
    where: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' },
    severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
  }, required: ['where', 'problem', 'evidence', 'fix', 'severity'] } } },
  required: ['problems'],
}

const TASKS = [
  {
    key: 'a8i2',
    task: [
      'TASK A8i-2 - "a key held down presses once, wherever it is; and nothing behind the top dialog takes a key or focus". Close every CONFIRMED finding in the held-key / focus / dialog-stack family (the Up & Down held-Enter bet burst and the board wrapper that starves the rule, the receipt bounce, K (a held Enter on Keep/Cancel reopens the confirm), focus returned or taken behind the top dialog (a confirm lapsing or opening under the win seal), W2 (a second fresh Enter while the seal leaves sells underneath), the double press on a just-opened money confirm, one Escape closing every dialog, the bet confirm reopening with a disabled Confirm, the stale comments in sell-button.tsx and select.tsx, and the guard blind spots).',
      'THE COORDINATOR\'S DESIGN (follow it unless the code proves it wrong; say so in notes):',
      '1. ONE app-wide held-key guard in the window CAPTURE phase: a repeat Enter/Space that src/lib/held-key.ts says would press something gets preventDefault AND stopPropagation, whether or not a dialog is open. Installed once (a module flag) by a tiny client component mounted in AppShell (src/components/layout/app-shell.tsx is a server component; render a client child) AND by Modal on mount, so admin pages without AppShell are covered. The per-Modal bubble call goes (one rule, one place). A deliberate fresh press is never touched (Ali: repeat TAPS on Up & Down are repeat bets).',
      '2. A module-level stack of open Modals (a new pure module, e.g. src/lib/modal-stack.ts, testable in-process): ordered by zIndex, then by open order (a later one of equal z is on top). Only the TOP dialog runs Escape and the Tab trap. Its initial-focus timer focuses only if it is the top at timer time. On close: if focus is inside the closing panel or nowhere (body/null/detached - A8h NOWHERE test in src/components/markets/sell-result-host.tsx), restore to its restoreTo only if that is inside the new top dialog or no dialog remains; if a dialog remains on top and restoreTo is behind it, focus the new top dialog initial target instead; if the closing dialog was NOT the top, do not move focus at all, and hand its restoreTo to any dialog above whose restoreTo lies inside the closing panel. While any dialog is open, a fresh Enter/Space keydown whose target is OUTSIDE the top panel is swallowed (nothing behind the top dialog takes a key).',
      '3. An ARMING BEAT: for about 300 ms after a dialog takes focus (on open, and when a dialog drawn over it closes and it is the top again), a fresh Enter/Space keydown inside it is swallowed, so a double press, key chatter or the seal auto-dismiss race cannot confirm money. Same under reduced motion (it is input, not motion). Say the number and why.',
      '4. bet-confirm-modal.tsx: reset the quote countdown to the full hold when the confirm closes, so a reopening never renders Confirm disabled; Modal: if the initial-focus target is disabled or missing at the timer, retry on the next frame (bounded) and then fall back to the first enabled focusable in the panel.',
      '5. Guard: extend scripts/enter-where-pressed.test.mts (and its --prove-red plants) - run keyTargetOf on fake elements; the app-wide guard is capture-phase, calls stopPropagation, is installed by AppShell and Modal; the stack rules run as pure functions (order, top, close hand-off, uncover arms, nothing behind the top takes a key); close the census blind spots the review confirmed (the scoped exemption, a same-named handler shadowed, Enter matched only as a quoted literal). Every new check has a plant.',
      '6. Drive cases for qa:enter-where-pressed: K, W2, the Up & Down held Enter on UP (exactly one bet), the receipt held Enter (no further bet), a seal over the bet confirm with the quote lapsing then Enter twice (no bet), a double Enter on the dial within 150 ms (no bet), one Escape closes only the top dialog - each with its expected outcome; write them into the drive file as real code (a new section), keeping today\'s cases.',
      'Touch only: src/lib/held-key.ts, a new src/lib/modal-stack.ts (or similar), src/components/ui/modal.tsx, a new tiny client component for the guard, src/components/layout/app-shell.tsx (to mount it), src/components/markets/bet-confirm-modal.tsx, sell-button.tsx and select.tsx comments, scripts/enter-where-pressed.test.mts, scripts/qa-enter-where-pressed.mjs. If a confirmed finding needs another file, say so in notes instead of editing it.',
    ].join('\n'),
  },
  {
    key: 'a8j',
    task: [
      'TASK A8j - "Enter in a form never skips its confirm" (pre-existing, every player, money). CONFIRMED: on /wallet/withdraw the form has one text field and no submit button, so Enter in the amount box submits it implicitly and the withdrawal goes out without the Confirm withdrawal dialog (no amount, fee, net or recipient shown); the same pattern closes an account from /profile/account without its final dialog. Find EVERY <form action=...> (or form with an action prop / onSubmit that commits) whose commit is meant to sit behind a ConfirmDialog / ConfirmModal / a confirm step, in src/ (player AND admin), and decide for each whether Enter can bypass the confirm.',
      'DESIGN: Enter in such a form must do what the trigger does - open the confirm - never submit. Prefer a form-level onSubmit guard: if the submit did not come from the confirm (a ref flag set right before the confirm calls requestSubmit), preventDefault and open the confirm through the same path the trigger uses (its openGuard/onOpen). If that is not clean for a component, use a disabled default submit button as the first submit control (per the HTML spec it blocks implicit submission) and say why. Keep every word, figure and markup a player sees unchanged unless needed.',
      'GATE: a new tsx suite (e.g. scripts/implicit-submit.test.mts, key test:implicit-submit, in predeploy) with an in-process red twin: a census of every form whose commit sits behind a confirm, each proven to block implicit submission by its chosen mechanism, plus plants that remove each guard; and drive cases (local in-memory server): type an amount on /wallet/withdraw and press Enter -> the confirm opens and the balance is unchanged; the same for close-account (the account stays open).',
      'Touch only the form/confirm components you find, the new test file, and a drive file. Say in notes which forms you checked and found safe, with the reason (e.g. two text fields).',
    ].join('\n'),
  },
]

phase('Draft')
const drafts = await pipeline(TASKS,
  (t) => agent(CTX + t.task, { label: 'draft:' + t.key, phase: 'Draft', schema: CS }),
  async (draft, t) => {
    if (!draft) return null
    const LENSES = [
      'LENS correctness and money safety: trace each changed path in real browsers (Chrome desktop/Android, Safari, Firefox): does it close every confirmed scenario it claims, and does it break any flow (a deliberate press, typing, a form, a screen reader, a dialog with a text field, the admin confirms, nested dialogs, reduced motion)? Any way left for a key to move money unasked?',
      'LENS change-set mechanics: every find must occur exactly once at HEAD in C:/kipindi-journey (check with Grep -F counts); no backslash anywhere; no class-shaped strings in comments; the TS compiles in your reading (types, imports, hooks rules); the tests import what exists; plants really change what their check reads.',
      'LENS gates and proof: each new behaviour has a check and an in-process plant that the check catches; the drive cases are real code that would fail on the old behaviour and pass on the new; nothing is asserted vacuously; the predeploy wiring is right.',
    ]
    const reviews = await parallel(LENSES.map((l, i) => () => agent(CTX + t.task + '\n' + l + '\nTHE DRAFT:\n' + JSON.stringify(draft), { label: 'review:' + t.key + ':' + i, phase: 'Review', schema: REV })))
    const problems = reviews.filter(Boolean).flatMap((r) => r.problems)
    if (!problems.length) return { key: t.key, final: draft, problems }
    const final = await agent(CTX + t.task + '\nTASK: revise the draft to fix every review problem below; return the COMPLETE revised change set.\nDRAFT:\n' + JSON.stringify(draft) + '\nPROBLEMS:\n' + JSON.stringify(problems), { label: 'revise:' + t.key, phase: 'Revise', schema: CS })
    return { key: t.key, final: final || draft, problems }
  })
return { drafts }
