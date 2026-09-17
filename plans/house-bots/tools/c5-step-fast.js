export const meta = {
  name: 'c5-step-fast',
  description: 'One Commit 5 step, fast: build the rulings, 3-lens adversarial review (+ visual lens), fix with cases seen red first (mutations batched at the commit close)',
  phases: [
    { title: 'Build', detail: 'one implementer: the step rulings, suites green, renders read, push' },
    { title: 'Review', detail: 'read-only lenses: conformance, D19 leak hunt, test strength (+ visual when the step renders)' },
    { title: 'Fix', detail: 'apply confirmed findings and carried mutation misses, re-run, push' },
  ],
}

// args: { step, rulings, tag, baseSha, task, nextRuling, scratch, visual?, conformanceExtra?, d19Extra?, strengthExtra?,
//         visualExtra?, carryMisses?, machine?, root?, baseline?, mainCheckout?, heavyLock? }
// Machine defaults are OMEGA-COMPILE01. On Ali-Blade15 pass machine: "Ali-Blade15", root: "C:/kipindi-house-bots",
// baseline: "C:/kipindi-old-build", mainCheckout: "C:/kipindi-main", scratch: <that session's scratchpad>, and heavyLock:
// "bash /c/Users/Ali/heavy-node-lock.sh run <session-name> <command>" only when another 50pick session runs there.
// Committed from the tenth session's c5-step-fast (2026-09-17); the eleventh session made the scratchpad and the next
// ruling number arguments, the machine paths arguments, and added ruling 259's console-gate law and D20 to the standing rules.
const A = args
if (!A.scratch) throw new Error('args.scratch is required: the scratchpad directory of the session running this workflow')
const SCR = A.scratch
const MACHINE = A.machine || 'OMEGA-COMPILE01 (Windows 10, 32 GB, 12 CPUs)'
const ROOT = A.root || 'F:/kipindi-house-bots'
const BASE = A.baseline || 'F:/kipindi-old-build'
const MAIN = A.mainCheckout || 'F:/kipindi-main'
const LOCK = A.heavyLock ? `
- Heavy Node (tsc, next build/start/dev, Playwright, any Postgres suite, test:all, test:house-bot-migrations) runs through the shared lock: ${A.heavyLock}.` : ''
const NEXT = A.nextRuling || 260
const RULES = `
STANDING RULES (non-negotiable):
- Machine ${MACHINE}. Repo worktree ${ROOT}, branch house-bots (confirm with git branch --show-current before every commit). Push ONLY with: git push origin house-bots. NEVER push main, never put main in a refspec, never rebase, never force, never skip hooks. Never touch production (no railway, no production database, not even a read). Never turn the house-bot master switch on outside a scratch database. Never edit, stage, check out or build in ${MAIN} (another session's checkout). ${BASE} is a clean origin/main worktree with its own node_modules: run a suite there only to compare a red, and leave it clean.
- You are the only writer in ${ROOT} while you run (agents of one workflow run one at a time). Never run npm ci, npm install, npm rebuild or npx prisma generate in ${ROOT} (if a step truly needs one, stop and report it in openIssues). Your scratch Postgres is 127.0.0.1:5433 (scripts/db-scratch.mts); never use ports 5434-5450.
- Owner ruling D19 outranks everything: nothing about house bots may reach a player or the holder (no public text, no chip, no label, no notice, no house word/identifier/prop name/action name in client JavaScript, no house key/id/word in a releasable export or a public API route or a player-callable server action result).
- ⛔ Owner ruling D20 (Ali, 2026-09-17), just below D19: house bots are ordinary players in every report. Never build a house-liquidity report, statement or CSV column, a staff-edge alert, a house line on an admin screen, a house key in a decision audit, a report memo, column, split or exclusion, or an internal record. plans/house-bots/C5-D20-REPLAN.md outranks C5-SPEC.md wherever they differ: read it before the rulings. A ruling it strikes is never built; where it was built, checkpoint C5-5b removes its code as the replan's section 3 exit says, and no mutation is planned for it (C5-5b's mutations guard only the un-build).
- ⛔ Ruling 259 (a layout is not a gate): every console page, route handler and server action under src/app/admin streams its payload to ANY signed-in account (the layout's redirect and AdminSectionGate change what is painted, not what is sent; a flight whose router state names the admin layouts skips them). So every house read a console surface renders or returns goes through src/lib/server/house-console-read.ts, which decides on the viewer's STORED role for that route and fails closed. A new console surface that reads house data without it is a D19 defect.
- The governing spec is plans/house-bots/C5-SPEC.md as re-planned by plans/house-bots/C5-D20-REPLAN.md (rulings 168-258 plus §6.J's rulings from 259, as far as the replan keeps them; §3 build order, §4 suites, §5 surfaces, §7 guards). Read the rulings for your step IN FULL, plus §3's entry for the step, §4's rows naming those rulings and §7, before writing code, and re-derive every file:line anchor (measured at d15eeb70; lines have moved). Where the code disagrees with a ruling's factual premise, trust the code, apply the ruling's intent, and report the deviation. plans/house-bots/PROGRESS.md RESUME AT item 4b-0 holds the record of earlier steps of this commit.
- Run heavy Node (npx tsc, next build/start/dev, Playwright, any Postgres suite, test:all, test:house-bot-migrations) one at a time within your own agent. If a process dies with a V8 fatal error or 0xC0000005, or a Postgres case throws "Can't reach database server" once under load, re-run once before believing anything.
- Pace (Ali, 2026-09-17, ruling 275 in C5-D20-REPLAN.md §5 — read it): the INITIAL check of a change runs exactly as it always has; what is dropped is REPETITION. STILL REQUIRED, once: npx tsc --noEmit 0 before every push; every suite this checkpoint's changed files can actually REACH, on BOTH stores where the logic is store-dependent, with a case for each new or changed behaviour; test:guards-exist before a commit adding a suite citation; a render opened and READ at 1280 and 360 of any screen this checkpoint changes. NOT RUN AGAIN: a suite no changed file can reach; a second full two-store pass of a suite already green whose code a later fix did not touch; a fresh next build + verify:house-bot-bundle where the change can only REMOVE house words from the public bundle (the result is certain; C5-8 measures it once); test:all red-by-red, which is C5-8's alone; the mutation batch, which C5-8 runs once for the whole commit. While iterating, run only the cases you changed through the memory child directly (npx tsx scripts/lib/<cases>.mts with the memory env the runner passes) or a section filter — never a full two-store run after every small slice. EVERY run you skip goes in notMeasured AND as a row you APPEND to plans/house-bots/DEFERRED-TESTS.md §1 (checkpoint, exact command, store, what it would prove, why the skip is safe), committed by name with your last slice: a skip is tracked, not remembered, and a skipped test is never a passed test. No guard moves at any pace; a test:house-bot-reports minPass floor only falls to a count you MEASURED by running the suite, never to an arithmetic guess.
- Suites: npm run --silent test:<key> prints NOTHING for a wrong key — grep package.json first. Two-store suites run through scripts/lib/house-bot-two-stores.mts (runTwoStores); a Postgres half that never reached its store is NOT MEASURED, never passed. test:house-bot-reports has per-store minPass floors (read them in scripts/house-bot-reports.test.mts) — raise a floor to the new measured count when you add cases (a floor may only rise). Run npx esbuild <cases file> --outfile=/dev/null (Git Bash) before a long run of an edited cases file.
- Servers only on port 3021 (never 3009/3011/3013/3014). Kill a server with PowerShell taskkill /T /F /PID <pid> (only a PID you started), then list node.exe processes and kill orphaned .next postcss workers of ${ROOT} only. Admin renders use next start on a scratch database seeded by scripts/seed-admin-local.mts (+ scripts/seed-staff-local.mts where a staff role is needed) with DISABLE_ADMIN_TOTP=true (PROGRESS standing fact "Local render method"). Screenshots are VIEWPORT tiles at 1280 and 360 (never fullPage, nextjs-portal hidden), saved under ${SCR}/shots-${A.tag}, and you must OPEN and READ every PNG with the Read tool; a surface you did not read is NOT MEASURED. The platform UI kit (docs/DESIGN_AUTHORITY.md, the kit components, neighbouring cards) is the only look; invented look or wording is a defect.
- Traps: Tailwind scans comments and strings in src — never write class-shaped tokens like w-[..] in comments. The Edit tool and inline node -e decode backslash escapes into raw characters — write escape-sensitive code with the Write tool into a file and byte-check it. A replacement passed to String.prototype.replace must be a function (() => text). Git Bash mangles /-leading env values (MSYS_NO_PATHCONV=1). A module reached by import() and CommonJS loads twice; shared state lives on globalThis under Symbol.for. Memory-store db.* returns plain values (try/catch, never .catch). Wait on the database clock, never sleep margins. Assert that a pass DECIDES before asserting what it did not decide. Postgres rows carry houseBotId:null keys that memory rows omit — key-presence proofs belong to the Postgres half. Postgres raw SQL: bind ISO times as ::timestamp (naive UTC), cast enum columns ::text, sums ::text then Number(), count(*)::int. House DAL pageLimit clamps list readers at 500 — never build a total from a paged reader. Fixture ids reused across sections collide on unique indexes only in a FULL run — use per-section unique ids. A raw-text guard reads comments too — reword prose, never the guard. test:failure-reasons 9b reads any code: "X" literal under src/lib/server; 8c pins checkLossLimit callers. The scratch Postgres runs Asia/Beirut. Scratch scripts importing F:/ paths need pathToFileURL; a scratchpad script needing pg loads it with createRequire('${ROOT}/package.json'). A served-page scan reads the body with the shared vocabulary AND the bot's label and id; a stack trace naming the folder kipindi-house-bots is not a leak (strip the root path, keep a planted control).
- Money paths: read the bet-concurrency rules in src/lib/server/market-service.ts before touching one; an abort must escape withLock; writes inside a lock take the caller's tx; emits after the outer lock; never pass a lock's tx to a new house read unless the ruling says so.
- Guards: never raise a ratchet or ceiling (test:type-scale, test:labels ADMIN_PROSE_RATCHET, test:decomment CARRIER_CEILING=20, test:red-anchors UNDECLARED_CEILING=65, test:orphans), never widen an exemption, never weaken an assertion to make it pass. Read a guard's printed population before moving a pin. Import scripts/lib/decomment.mts, never write a new comment stripper. Absence proofs import scripts/lib/house-bot-vocabulary.mjs (ruling 175) and never declare their own house regex. test:guards-exist refuses a cited suite key that package.json lacks. Every new store member gets both twins and a test:dal-parity case in the same commit. When you edit a line a red-anchors harness quotes, re-anchor it to the same defect.
- Known inherited reds on clean origin/main b726cb7f (compare the failing LINES, never assume, never weaken): test:red-anchors 4 (rg-doors x2, 4.1/4.2 66 vs 65), read-tiers 7.1, type-scale 909 vs 908, decomment 2.1 (21 vs 20), orphans (plus 2 of ours recorded as L56), lock-tx-threading 2.3, failure-reasons 10.1/10.2, updown-digest §7, recategorise 5, updown-source-class §2, grid-paging 2.2, chart-one-home 3.1, popup-fit 1.1, admin-act-gate §1, updown-handover 8.4d; admin-section-gate, revoked-deadend and needle-rest hard-code port 3009 (NOT MEASURED).
- Git: stage files BY NAME (never git add -A / git add .). Commit messages start "WIP house-bots: C5 · " and end with a blank line then "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>". Commit and push only green states (run test:guards-exist before a commit that adds a citation); verify with git ls-remote origin refs/heads/house-bots. Do NOT edit plans/house-bots/PROGRESS.md (the orchestrator owns it) — report what it needs instead. You MAY append a newly needed ruling to C5-SPEC.md §6.J ("Added during the build") only if the step cannot be built without one; number it from ${NEXT} upward (read §6.J first — never reuse a number) and report it.${LOCK}
- Report measured numbers only (suite name, store, passed/failed as printed). Anything you could not run is NOT MEASURED, stated plainly.
`

const REPORT = {
  type: 'object',
  properties: {
    done: { type: 'array', items: { type: 'string' }, description: 'each ruling/clause implemented or verified, one line each with files' },
    commits: { type: 'array', items: { type: 'string' }, description: 'sha + subject, pushed' },
    headSha: { type: 'string', description: 'the full sha of house-bots HEAD after your last push' },
    suites: { type: 'array', items: { type: 'string' }, description: 'suite · store · printed result' },
    renders: { type: 'array', items: { type: 'string' }, description: 'screenshot path · what was read in it' },
    notMeasured: { type: 'array', items: { type: 'string' } },
    deviations: { type: 'array', items: { type: 'string' }, description: 'ruling · what differs · why (code over plan)' },
    mutationsPlanned: { type: 'array', items: { type: 'string' }, description: 'id · file · exact from-text (occurs once) → replacement · suite (+ HB_*_SECTIONS filter if any) · the assertion id(s) that must go red, with store' },
    openIssues: { type: 'array', items: { type: 'string' }, description: 'incl. PROGRESS register rows proposed (W/X/L), new rulings, anything for Ali' },
  },
  required: ['done', 'commits', 'headSha', 'suites', 'renders', 'notMeasured', 'deviations', 'mutationsPlanned', 'openIssues'],
}
const FINDINGS = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
      where: { type: 'string', description: 'file:line' }, what: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' },
    }, required: ['id', 'severity', 'where', 'what', 'evidence', 'fix'] } },
    unconfirmedClaims: { type: 'array', items: { type: 'string' }, description: 'implementer claims you could not confirm in the code' },
  },
  required: ['findings', 'unconfirmedClaims'],
}

phase('Build')
const build = await agent(`${RULES}

YOUR TASK — Commit 5 ${A.step} (C5-SPEC.md §3), rulings ${A.rulings}. Base sha ${A.baseSha}.
${A.task}
- Commit in coherent green slices and push after each.
- In mutationsPlanned, list EVERY mutation that must be run against the step's new or changed code (at least one per new assertion, branch and SQL predicate; both twins of a store member separately; every mutation the rulings' Proof lines name), each naming the exact file, the exact textual change (a 'from' text that occurs exactly once in that file, and its replacement), the suite to run (with a section filter where the suite supports one) and the assertion id that must go red with its store. Do not run them; a later agent will.
Research first, build, then write your whole report ONCE at the end through the structured output.`, { label: `build:${A.tag}`, phase: 'Build', schema: REPORT })

const LENSES = [
  { key: 'conformance', prompt: `LENS: RULING CONFORMANCE. For each of rulings ${A.rulings} in plans/house-bots/C5-SPEC.md, check the implementation clause by clause against the code now on branch house-bots (git log --oneline ${A.baseSha}..HEAD; git diff ${A.baseSha}..HEAD). Also check each ruling's Proof line and §4's rows for this step: does a case exist on the right store that can actually fail when the behaviour breaks (not vacuous, planted control present)? Check every guard §7 says the step moves was moved honestly (same defect, never weakened). Report each missing clause, wrong behaviour, vacuous case or undocumented deviation. ${A.conformanceExtra || ''}` },
  { key: 'd19-hunt', prompt: `LENS: D19 LEAK HUNT. Assume the implementation missed something. Hunt for ANY way this step's changes let house-bot information reach a player, the holder, a trigger player or a signed-out visitor: public API routes, player-callable server actions and their return values, both data-rights doors (exportUserData, buildDsarBundle), an officer's own export, RSC payloads of player pages, console pages/route handlers/server actions requested by a NON-staff session (ruling 259: a layout is not a gate), 'use client' modules and every module they value-import (words, identifiers, prop names, action export names), free-text fields that reach players (void reasons, objection notes, resolution evidence, KYC notes), notices and emails to players, log text echoed to responses, admin client chunks. Also check admin-only surfaces cannot render for the wrong audience where a ruling restricts it. ${A.d19Extra || ''}` },
  { key: 'test-strength', prompt: `LENS: TEST STRENGTH AND CORRECTNESS. For every new or changed assertion in git diff ${A.baseSha}..HEAD -- scripts, design the single-line source mutation that should turn it red and check by reading that it would; flag vacuous assertions (a store where the property cannot differ, a missing control, >= where exact is needed, a fixture that cannot exercise the branch, a total built from a paged reader, a case that passes because an earlier section left state behind). Check the SQL twins against their memory twins for semantic drift (NULL handling, ordering, boundaries, CASHED_OUT/VOID statuses, naive-UTC casts, Decimal conversion). For any money path, check the platform's four transaction rules. Also check the implementer's mutationsPlanned: flag any planned mutation whose from-text does not occur exactly once or that could not turn its named assertion red. ${A.strengthExtra || ''}` },
]
if (A.visual) LENSES.push({ key: 'visual', prompt: `LENS: VISUAL AND KIT CONSISTENCY (Ali: visuals must be perfect and consistent with the platform kit). Open and READ with the Read tool every PNG the implementer lists under renders (and list the folder ${SCR}/shots-${A.tag} for any it did not list). For each surface compare against its kit neighbour named in C5-SPEC §5 and docs/DESIGN_AUTHORITY.md: typography role and size, colour tokens (side words, muted text, never gold for money), spacing and alignment with the neighbouring row, separators, wrapping at 360 (a 'SIDE TZS x' group must never break inside itself; nothing clipped, overlapping or overflowing), sentence case, the same words for the same things as neighbouring surfaces, no double spaces or stray or faint separators, no English left in a sw/zh render, empty states and failed-read states. Also check every surface §5 lists for this step was actually rendered at BOTH 1280 and 360 (a missing one is a finding). Report each visual defect with the PNG path, what is wrong, the kit reference and the exact fix (file:line). ${A.visualExtra || ''}` })

const verified = await pipeline(
  LENSES,
  (l) => agent(`${RULES}

You are a READ-ONLY adversarial reviewer (do not edit, stage, commit or run heavy Node; reading files and git is fine; a single pure tsx suite may be run only if essential). The implementer's report:
${JSON.stringify(build)}

${l.prompt}
For every finding give: id (prefix ${l.key}-), severity, file:line, what is wrong, evidence (quote the code), exact fix. Research first; report once at the end through the structured output.`, { label: `review:${l.key}`, phase: 'Review', schema: FINDINGS }),
  (rev, l) => ({ lens: l.key, unconfirmedClaims: (rev && rev.unconfirmedClaims) || [], findings: ((rev && rev.findings) || []).map((f) => ({ ...f, lens: l.key })) }),
)

phase('Fix')
const fix = await agent(`${RULES}

You are the FIXER for Commit 5 ${A.step} (rulings ${A.rulings}). Below: the implementer's report, every review finding, and (if any) MISSED mutations carried from an earlier mutation run.
For EACH finding: read the code yourself and try to refute it first (reviewers can be wrong). If it is real, fix it; if a register row or ruling already records it as accepted or deferred, name that record; otherwise record precisely why it is refuted. Fix each real finding with a case that fails without the fix (both stores where logic is involved) and SEE that case red on the unfixed code first. Also chase every unconfirmed implementer claim.
For EACH carried MISSED mutation: strengthen the case in ${ROOT} so the mutation would go red (see it red by applying the mutation in the main worktree, running the case, and restoring the original bytes with git diff --quiet on that file before anything else), or show precisely why the mutation is equivalent.
Then re-run every suite the fixes touch, npx tsc --noEmit, and — if any 'use client' file, the vocabulary or a client-reachable module changed — a fresh next build + verify:house-bot-bundle + test:house-bot-disclosure. Re-render and READ any surface a fix changed. Commit green slices by name and push.

IMPLEMENTER REPORT: ${JSON.stringify(build)}

REVIEW FINDINGS:
${JSON.stringify(verified)}

CARRIED MISSED MUTATIONS FROM THE PREVIOUS STEP: ${JSON.stringify(A.carryMisses || [])}

In mutationsPlanned return the FINAL complete mutation list for THIS step (the implementer's list, corrected where reviews showed a planned mutation would not go red, targets the wrong assertion or has a from-text that is not unique, plus one for every fix you made), each with exact file, exact from-text occurring once at headSha, replacement, suite (+ section filter), and the assertion id(s) with store. Also WRITE that final list as a JSON array of strings to plans/house-bots/tools/c5-${A.tag}-mutations.json, commit it by name and push. Set headSha to the full sha after your last push. In done, list each finding id with FIXED / REFUTED (why) / RECORDED (where), and each carried miss with STRENGTHENED (commit) / EQUIVALENT (why). Research first; report once at the end through the structured output.`, { label: `fix:${A.tag}`, phase: 'Fix', schema: REPORT })

return { build, verified, fix }
