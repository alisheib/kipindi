export const meta = {
  name: 'c5-build-step',
  description: 'SUPERSEDED (2026-09-17) by c5-step-fast.js and owner ruling D20 — kept as the record of C5 steps 1–4; do not run. One Commit 5 build step: implement the given rulings, 3-lens adversarial review, fix, run every mutation from a scratchpad worktree',
  phases: [
    { title: 'Build', detail: 'one implementer: the step rulings, suites green, renders read, push' },
    { title: 'Review', detail: 'three read-only lenses: conformance, D19 leak hunt, test strength' },
    { title: 'Fix', detail: 'apply confirmed findings, re-run, push' },
    { title: 'Mutate', detail: 'run every mutation of the step from a temporary worktree, each red on its own assertion' },
  ],
}

const A = args
const RULES = `
STANDING RULES (non-negotiable):
- Repo worktree C:/kipindi-house-bots, branch house-bots (confirm with git branch --show-current before every commit). Push ONLY with: git push origin house-bots. NEVER push main, never put main in a refspec, never rebase, never force, never skip hooks. Never touch production (no railway, no production database, not even a read). Never turn the house-bot master switch on outside a scratch database.
- Owner ruling D19 outranks everything: nothing about house bots may reach a player or the holder (no public text, no chip, no label, no notice, no house word/identifier/prop name/action name in client JavaScript, no house key/id/word in a releasable export or a public API route or a player-callable server action result).
- The governing spec is plans/house-bots/C5-SPEC.md (rulings 168-258; §3 build order, §4 suites, §5 surfaces, §7 guards). Read the rulings for your step IN FULL before writing code, and re-derive every file:line anchor (they were measured at d15eeb70; steps since then moved lines). Where the code disagrees with a ruling's factual premise, trust the code, apply the ruling's intent, and report the deviation. plans/house-bots/PROGRESS.md RESUME AT item 4b-0 holds the record of earlier steps of this commit.
- This laptop (Ali-Blade15) has failing RAM. Run ANY heavy Node (npx tsc, next build/start/dev, Playwright, any Postgres suite, test:all, test:house-bot-migrations) through: bash /c/Users/Ali/heavy-node-lock.sh run hb-s9 <command>. Run heavy commands one at a time, never in parallel. A single pure tsx suite may run without the lock. If a process dies with a V8 fatal error or 0xC0000005, re-run once before believing anything.
- Suites: npm run --silent test:<key> prints NOTHING for a wrong key — grep package.json first. Two-store suites run through scripts/lib/house-bot-two-stores.mts (runTwoStores) and boot the scratch Postgres on 127.0.0.1:5433 via scripts/db-scratch.mts; a Postgres half that never reached its store is NOT MEASURED, never passed. test:house-bot-reports has per-store minPass floors — raise a floor to the new measured count when you add cases (a floor may only rise).
- Servers only on port 3021 (never 3009/3011/3013/3014). Kill a server with PowerShell taskkill /T /F /PID <pid>, then list node.exe processes and kill orphaned .next postcss workers of THIS worktree (never PID of the Railway MCP or anything outside C:/kipindi-house-bots). Admin renders use next start on a scratch database seeded by scripts/seed-admin-local.mts (+ scripts/seed-staff-local where a staff role is needed) with DISABLE_ADMIN_TOTP=true (PROGRESS standing fact "Local render method"; steps 1-2 used a render driver in the scratchpad dir shots-system — reuse its method). Screenshots are VIEWPORT tiles at 1280 and 360 (never fullPage, nextjs-portal hidden), and you must OPEN and READ every PNG with the Read tool; a surface you did not read is NOT MEASURED. The platform UI kit (docs/DESIGN_AUTHORITY.md, the kit components, neighbouring cards) is the only look; invented look or wording is a defect.
- Traps: Tailwind scans comments and strings in src — never write class-shaped tokens like w-[..] in comments. In PowerShell use --outfile=nul for esbuild, never /dev/null. The Edit tool and inline node -e decode backslash escapes into raw characters — write escape-sensitive code with the Write tool into a file and byte-check it. Git Bash mangles /-leading env values (MSYS_NO_PATHCONV=1). A module reached by import() and CommonJS loads twice; shared state lives on globalThis under Symbol.for. Memory-store db.* returns plain values (try/catch, never .catch). Wait on the database clock, never sleep margins. Assert that a pass DECIDES before asserting what it did not decide. Postgres rows carry houseBotId:null keys that memory rows omit — key-presence proofs belong to the Postgres half. Postgres raw SQL: bind ISO times as ::timestamp (naive UTC), cast enum columns ::text, sums ::text then Number(), count(*)::int. House DAL pageLimit clamps list readers at 500 — never build a total from a paged reader.
- Money paths: read the bet-concurrency rules in src/lib/server/market-service.ts before touching one; an abort must escape withLock; writes inside a lock take the caller's tx; emits after the outer lock; never pass a lock's tx to a new house read unless the ruling says so.
- Guards: never raise a ratchet or ceiling (test:type-scale, test:labels ADMIN_PROSE_RATCHET, test:decomment CARRIER_CEILING=20, test:red-anchors UNDECLARED_CEILING=65, test:orphans), never widen an exemption, never weaken an assertion to make it pass. Read a guard's printed population before moving a pin. Import scripts/lib/decomment.mts, never write a new comment stripper. Absence proofs import scripts/lib/house-bot-vocabulary.mjs (ruling 175) and never declare their own house regex. test:guards-exist refuses a cited suite key that package.json lacks. Every new store member gets both twins and a test:dal-parity case in the same commit.
- Known inherited reds on clean origin/main (compare, never assume, never weaken): test:red-anchors 4 (rg-doors ×2, 4.1/4.2 66 vs 65), read-tiers 7.1, type-scale 909 vs 908, decomment 2.1 (21 vs 20), orphans 6, lock-tx-threading 2.3, failure-reasons 10.1/10.2, updown-digest §7 and others. A clean origin/main worktree exists at C:/kipindi-old-build (detached b726cb7f, own node_modules) for comparing a red — do not edit it.
- Git: stage files BY NAME (never git add -A / git add .). Commit messages start "WIP house-bots: C5 · " and end with a blank line then "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>". Commit and push only green states (run test:guards-exist before a commit that adds a citation); verify with git ls-remote origin refs/heads/house-bots. Do NOT edit plans/house-bots/PROGRESS.md (the orchestrator owns it) — report what it needs instead.
- Report measured numbers only (suite name, store, passed/failed as printed). Anything you could not run is NOT MEASURED, stated plainly.
`

const REPORT = {
  type: 'object',
  properties: {
    done: { type: 'array', items: { type: 'string' }, description: 'each ruling/step implemented, one line each with files' },
    commits: { type: 'array', items: { type: 'string' }, description: 'sha + subject, pushed' },
    suites: { type: 'array', items: { type: 'string' }, description: 'suite · store · printed result' },
    renders: { type: 'array', items: { type: 'string' }, description: 'screenshot path · what was read in it' },
    notMeasured: { type: 'array', items: { type: 'string' } },
    deviations: { type: 'array', items: { type: 'string' }, description: 'ruling · what differs · why (code over plan)' },
    mutationsPlanned: { type: 'array', items: { type: 'string' }, description: 'id · file · exact textual mutation · the assertion(s) that must go red, with store' },
    openIssues: { type: 'array', items: { type: 'string' }, description: 'incl. PROGRESS register rows proposed and anything for Ali' },
  },
  required: ['done', 'commits', 'suites', 'renders', 'notMeasured', 'deviations', 'mutationsPlanned', 'openIssues'],
}

phase('Build')
const build = await agent(`${RULES}

YOUR TASK — Commit 5 build ${A.step} (C5-SPEC.md §3), rulings ${A.rulings}.
${A.task}
- Commit in coherent green slices and push after each.
- In mutationsPlanned, list EVERY mutation that must be run against your new or changed code (at least one per new assertion, branch and SQL predicate; both twins of a store member separately), each naming the exact file, the exact textual change (a 'from' text that occurs once, and its replacement) and the assertion that must go red with its store. Do not run them; a later agent will.
Research first, build, then write your whole report ONCE at the end through the structured output.`, { label: `build:${A.tag}`, phase: 'Build', schema: REPORT })

phase('Review')
const LENSES = [
  { key: 'conformance', prompt: `LENS: RULING CONFORMANCE. For each of rulings ${A.rulings} in plans/house-bots/C5-SPEC.md, check the implementation clause by clause against the code now on branch house-bots (git log --oneline ${A.baseSha}..HEAD; git diff ${A.baseSha}..HEAD). Also check each ruling's Proof line and §4's rows for this step: does a case exist on the right store that can actually fail when the behaviour breaks (not vacuous, planted control present)? Report each missing clause, wrong behaviour, vacuous case or undocumented deviation as a finding with file:line and the exact fix. ${A.conformanceExtra || ''}` },
  { key: 'd19-hunt', prompt: `LENS: D19 LEAK HUNT. Assume the implementation missed something. Hunt for ANY way this step's changes let house-bot information reach a player, the holder, a trigger player or a signed-out visitor: public API routes, player-callable server actions and their return values, both data-rights doors, RSC payloads of player pages, 'use client' modules and every module they value-import (words, identifiers, prop names, action export names), free-text fields that reach players, notices and emails to players, log text echoed to responses. Also check admin-only surfaces cannot render for the wrong audience where a ruling restricts it. Report each leak with the exact path to the viewer and the fix. ${A.d19Extra || ''}` },
  { key: 'test-strength', prompt: `LENS: TEST STRENGTH AND CORRECTNESS. For every new or changed assertion in git diff ${A.baseSha}..HEAD -- scripts, design the single-line source mutation that should turn it red and check by reading that it would; flag vacuous assertions (a store where the property cannot differ, a missing control, >= where exact is needed, a fixture that cannot exercise the branch, a total built from a paged reader). Check the SQL twins against their memory twins for semantic drift (NULL handling, ordering, boundaries, CASHED_OUT/VOID statuses, naive-UTC casts, Decimal conversion). For any money path, check the platform's four transaction rules. Report findings with file:line and the exact fix. ${A.strengthExtra || ''}` },
]
const reviews = await parallel(LENSES.map((l) => () => agent(`${RULES}

You are a READ-ONLY adversarial reviewer (do not edit, stage, commit or run heavy Node; reading files and git is fine; a single pure tsx suite may be run without the lock only if essential). The implementer's report:
${JSON.stringify(build)}

${l.prompt}
For every finding give: id, severity (blocker/major/minor), file:line, what is wrong, evidence, exact fix. Also list anything in the implementer's report you could NOT confirm in the code. Research first; write your whole answer once at the end.`, { label: `review:${l.key}`, phase: 'Review' })))

phase('Fix')
const fix = await agent(`${RULES}

You are the FIXER for Commit 5 ${A.step} (rulings ${A.rulings}). Three adversarial reviews and the implementer's report are below. For EACH finding: verify it against the code first (reviewers can be wrong); if real, fix it with a case that fails without the fix (both stores where logic is involved) and SEE that case red on the unfixed code first; if not real, record why. Then re-run every suite the fixes touch (heavy runs through the lock), npx tsc --noEmit, and — if any 'use client' file, the vocabulary or a client-reachable module changed — a fresh next build + verify:house-bot-bundle. Re-render and READ any surface a fix changed. Commit green slices by name and push.

IMPLEMENTER REPORT: ${JSON.stringify(build)}

REVIEWS:
${reviews.map((r, i) => `--- ${LENSES[i].key} ---\n${r}`).join('\n\n')}

In mutationsPlanned return the FINAL complete mutation list for this step (the implementer's list, corrected where reviews showed a planned mutation would not go red or targets the wrong assertion, plus one for every fix you made), each with exact file, exact 'from' text occurring once, replacement, and the assertion(s) with store. Research first; report once at the end through the structured output.`, { label: `fix:${A.tag}`, phase: 'Fix', schema: REPORT })

phase('Mutate')
const WT = `C:/kipindi-hb-mut${A.tag}`
const WTW = WT.replace(/\//g, '\\\\')
const mutate = await agent(`${RULES}

You are the MUTATION RUNNER for Commit 5 ${A.step}. Run EVERY mutation in the list below against the committed HEAD of house-bots from a temporary worktree, so the main worktree is never mutated:
1. git -C C:/kipindi-house-bots worktree add --detach ${WT} HEAD
2. PowerShell: New-Item -ItemType Junction -Path ${WTW}\\node_modules -Target C:\\kipindi-house-bots\\node_modules  (Prisma client is shared; never run prisma generate there).
3. Reuse or adapt the earlier harness C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/7d164087-6ebf-48ed-9538-2d18bae5d991/scratchpad/mutate-c5-s12.mjs into scratchpad/mutate-c5-${A.tag}.mjs: for each mutation check the 'from' text occurs EXACTLY once (re-anchor it if not, same defect), apply it with the file's own line endings, run the suite or the filtered section holding the target assertion through the heavy-node lock, classify from the target assertion's own PASS/FAIL line per store: RED-on-its-own-assertion / MISSED (green) / NOT MEASURED (store never reached or crash before the assertion — retry once), restore the original bytes, confirm git -C ${WT} diff --quiet. First run an UNMUTATED baseline of each suite (and filter) used and require it green; repeat the baselines after the last mutation and require identical counts.
4. For each MISSED mutation: decide whether the test is weak (then strengthen the case in the MAIN worktree C:/kipindi-house-bots, run the suite green, commit + push, and re-run that mutation against the new HEAD in a fresh worktree) or the mutation is equivalent (explain precisely why).
5. Cleanup, in this exact order: PowerShell [System.IO.Directory]::Delete('${WTW}\\node_modules', $false); Test-Path proves the junction gone AND C:\\kipindi-house-bots\\node_modules\\.bin still exists; only then git -C C:/kipindi-house-bots worktree remove --force ${WT}. Never cmd /c rmdir from Git Bash. Kill any postgres.exe/node.exe whose command line names ${WT} first. If node_modules got damaged, repair (npm install; npm i -D --no-save embedded-postgres@18.3.0-beta.17; npx prisma generate — through the lock) and prove it with one memory and one Postgres suite.

MUTATION LIST (from the fixer):
${JSON.stringify(fix && fix.mutationsPlanned)}

Return in the structured output: suites = one line per mutation "id · RED on <assertion> [store] | MISSED | NOT MEASURED (why)", plus the baseline lines; done = tests strengthened; commits = any pushed; notMeasured; openIssues. Research first; report once at the end.`, { label: `mutate:${A.tag}`, phase: 'Mutate', schema: REPORT })

return { build, reviews, fix, mutate }
