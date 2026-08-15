# SESSION PROMPT — THE RED FLEET: the guards that stopped guarding

Repo: `C:\kipindi-main`, branch `main`. ⚠️ **Every push to `main` deploys LIVE to `https://50pick.tz`.**

⭐ **THE MOTIVATING INCIDENT, 2026-08-15.** A debug override — literally `if (true)` — was
committed at 12:52 and served on production for about two hours. It made the one-side bonus
warning render for **every** hedging player, so a player with no grant read *"only one side
counts toward the **TZS 0** you still need to bet before your bonus can be withdrawn."* A false
statement about money, on a money surface, to every player who saw it. Production has **zero**
grants, so it was false every single time.

Nothing caught it. That is the subject of this session: **the RED fleet has been rotting faster
than anyone reads it, and `red:all` is currently red — which means it is telling nobody
anything.**

⛔ **THIS SESSION FIXES INSTRUMENTS, NOT PRODUCT.** If a repaired harness exposes a real product
defect, FILE it and keep going. Fixing it is a different session with a different risk profile.

---

## §0 · BEFORE YOU TOUCH ANYTHING

```bash
git fetch --all --prune && git log --since="today" --format="%ci %h %s" origin/main && git status --short
```

⚠️ **UP TO THREE SESSIONS HAVE RUN IN THIS SAME CLONE ON ONE DAY.** Not separate checkouts —
one filesystem. Measured 2026-08-15. So:

1. ⛔ **NEVER `git add -A`.** Stage by explicit path; `git commit -F msg -- <paths>`.
2. ⛔ **Before pushing, compare `git log -1 origin/main` with `git log -1 HEAD`.** If HEAD sits on
   another session's commits, push **only your own SHA** (`git push origin <sha>:main`).
3. 🔴 **AND THIS ONE IS THE WHOLE POINT OF THIS SESSION: NEVER RUN A RED HARNESS WHILE ANOTHER
   SESSION MAY BE EDITING.** These harnesses rewrite real source files and restore them **only if
   the run completes**. An interrupted run on 2026-08-15 **reduced two source files to NUL
   bytes**. Before starting, confirm the tree is quiet (`git status --short` shows nothing you do
   not recognise) and say so. After any interrupted run, scan for NUL bytes and restore from git.
4. ⛔ **Never run `next build` while a `next dev` server is up** — they share `.next/` and hang.
5. ⚠️ `:3016` is yours by convention.

Read: `.claude/skills/50pick-standards/SKILL.md` **§5b** (twelve ways an instrument here has
lied — this session is §5b applied to itself) and `scripts/red-anchor.mjs`'s header in full.

---

## §1 · WHAT IS ALREADY KNOWN — verified, with its confidence stated

⭐ **Four harnesses were repaired on 2026-08-15. Each had been an ABSENT test — green-looking,
proving nothing:**

| Harness | What was wrong | Stale for |
|---|---|---|
| `red-e64.cjs` | its `toast-replaces-aria-live` anchor targeted a single-line `setLiveMessage(...)`; UD-21 (`00a0595a`) split it over three lines — **and it was in no runner at all**, so nothing ran it | 8 days |
| `settlement-expectation-red.mjs` | still hand-spelled the retired `/^⏭️ \*\*RESUME AT:/m` — the ONE copy E-108's "put the locator in one module" repair missed | since E-108 |
| `updown-admin-options-red.mjs` | anchored `symbolReadiness(...)` with four arguments; `b382f994` added a fifth (`playbook`) and wrapped the call | 5 days |
| `updown-chain-stats-red.mjs` | the **last** harness still hand-rolling anchor matching instead of importing `red-anchor.mjs`; on a CRLF checkout **all five of its multi-line anchors missed** while every single-line one matched | unknown |

### 1.1 · What is still broken, and how confident each claim is

| Claim | Confidence |
|---|---|
| `red:updown-readiness` has **5 of 16** anchors not matching | 🟢 **HIGH — two independent measurements agree.** The labelling session reported it from a run; a static sweep found the same five |
| `red:all` currently **exits 1** and therefore starves every harness after the break | 🟢 HIGH — reported from a run |
| A static sweep flagged **27** non-matching anchors across ~6 harnesses | 🟡 **LOW — TREAT AS A LEAD, NOT A COUNT.** The sweep infers target files heuristically and only scans `src/**.{ts,tsx,mts}`, so harnesses whose anchors target **CSS** (`m1-even-light-red.mjs`, flagged 8/8) are almost certainly false positives. ⛔ Re-measure per harness; do not inherit this number |

⛔ **The 27 is exactly the kind of figure this repo has been burned by.** It is offered as a
starting list, not a finding. The sweep lives at nothing permanent — write a real one (§3).

---

## §2 · THE STRUCTURAL DEFECT — `red:all` is a `&&` chain

```
"red:all": "npm run red:feedback-law && npm run red:updown-bet-feedback && npm run red:aipoll-reap && …"
```

**The first non-zero exit stops the chain**, so every harness after it never runs and reports
nothing. That is not a hypothetical: `red-e64` sat unrun for 8 days partly because it was
appended at the tail, and today the chain stops at `red:updown-readiness` — everything past it
is unmeasured right now.

⭐ **A guard at the tail of a `&&` chain is the very defect it exists to catch: present in the
code, green in the log, running never.**

**Fix the runner:** run **every** harness, collect results, print a table, exit non-zero if any
failed. Model it on `scripts/test-all.mjs`, which already does exactly this for `test:*` (it
auto-discovers and reports `223/225 green · FAILED: …`). ⛔ Keep the exit code — a reporting
runner that always exits 0 is the same disease.

---

## §3 · THE GUARD THIS SESSION MUST LEAVE BEHIND

A harness whose anchor no longer matches is **worse than a missing harness**, because it reports
success. Nothing currently detects that across the fleet.

Build `test:red-anchors` (a `test:*`, so `test:all` runs it — it must not depend on the RED
runner it is auditing):

1. **Enumerate every `red:*` script** from `package.json` — ⛔ never a hand-written list, which is
   how `red-e64` stayed out of `red:all`.
2. For each harness, resolve **every** anchor against its real target using **`red-anchor.mjs`'s
   own `resolveAnchor`** — the same code the harnesses use, so the audit cannot disagree with
   them. It already handles CRLF and rejects an ambiguous (2+ match) anchor.
3. **Fail on any anchor that matches 0 or ≥2 times**, naming harness, anchor and target.
4. ⭐ **Assert every `red:*` script is reachable from `red:all`.** That check alone would have
   caught `red-e64`.
5. ⭐ **Positive control in the same run** — show the resolver an anchor that must NOT resolve.
   A blind scanner prints "0 stale" in exactly the same words as a clean fleet.
6. ⚠️ **The audit must be STATIC.** It reads files; it must never mutate one. That is what makes
   it safe to run in `test:all` and alongside another session.

⛔ **The hard part is target resolution**, and it is where the throwaway sweep failed: harnesses
declare their targets in several shapes (`new URL("../src/…")`, a `const FILE = "src/…"`, an
inline literal, and CSS/doc targets). Make each harness **declare** its targets in one exported
shape rather than having the auditor guess — a small edit per harness, and it makes the audit
exact instead of heuristic.

---

## §4 · ORDER OF WORK — one harness per commit

| # | Unit | Done when |
|---|---|---|
| **A** | `red:all` becomes a reporting runner (run all, table, non-zero on any failure) | the fleet's true state is visible in one run for the first time |
| **B** | Capture that baseline into the record — which harnesses pass, fail, or cannot find their anchors | a real count replaces §1.1's 🟡 lead |
| **C** | `red:updown-readiness` — the 5 confirmed anchors | 16/16, proven by running it |
| **D** | Each remaining harness B found, one commit each | each proven by running it |
| **E** | `test:red-anchors` + its own RED proof, wired into `test:all` | a stale anchor is now impossible to introduce quietly |
| **F** | Any harness still hand-rolling matching migrates to `red-anchor.mjs` | grep proves zero remain |

⚠️ **B BEFORE C.** Fixing the first break to discover the second is how a whole afternoon goes;
the reporting runner gives you the entire list at once.

---

## §5 · DEFINITION OF DONE

- `npm run red:all` runs **every** harness, reports a table, and exits non-zero iff any failed.
- **Every** harness catches 100% of its own mutations, proven by running it — ⛔ not by reading it.
- The `test:red-anchors` suite green (⚠️ it does not exist yet — creating it is unit E), with a
  positive control, and it **fails** if a `red:*` script
  is unreachable from `red:all` or an anchor stops resolving. RED-proven.
- Zero harnesses hand-roll anchor matching; all use `red-anchor.mjs`.
- Every product defect a repaired harness exposes is **FILED, not fixed**.
- `npx tsc --noEmit` · `npm run build` · `npm run test:all` · `npm run red:all` at the END.
- Docs in the same commits; `docs/LIVE-QA-CAMPAIGN.md` §6b handoff at the TOP.
- ⭐ **Then EMPTY this file.**

---

## §6 · TRAPS

- ⛔ **An `ERROR` in a log is not a defect, and a retry is not an outage.** A caught `P2002` still
  prints `prisma:error`. On 2026-08-15 an "Up & Down is down" claim was raised and withdrawn the
  same hour on exactly this mistake — production had live rounds the whole time. **Measure the
  OUTCOME, never the symptom.**
- ⛔ **A build that fails on commit X and succeeds on X-plus-two-markdown-files did not fail on
  the code.** One Railway build failed today (`c4e65006`, 14:32) and the next succeeded with only
  docs changed — transient. A failed build never swaps the deployment, so production was never
  affected. Check the diff before investigating the code.
- ⛔ **`node -e` and shell heredocs eat a backslash layer, and bash executes backticks inside a
  heredoc.** Write harness edits with the editor. Paid for twice on 2026-08-15.
- ⛔ **Assert the VALUE, not the symbol.** Count calls in statement position and assert
  `mentions === statements`; a `void 0 &&` prefix keeps every character of a name while killing
  the call (E-57).
- ⛔ **A guard and its own RED proof can agree with each other and both be wrong** (E-108) — if
  both locate the target the same wrong way. Make the audit resolve anchors through the same
  module the harnesses use, then check the thing you found is the thing you meant.
