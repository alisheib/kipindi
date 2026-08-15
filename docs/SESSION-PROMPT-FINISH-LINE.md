# SESSION PROMPT — THE FINISH LINE: every open item, one session

Repo: `C:\kipindi-main`, branch `main`. ⚠️ **Every push to `main` deploys LIVE to `https://50pick.tz`.**

Commissioned by Ali, 2026-08-15: *"meet all the remaining issues so we clean out — all at once,
in one session."* This is the consolidated list. It supersedes and retires four session prompts.

⚠️ **ONE OTHER PROMPT IS ALSO LIVE, AND DELIBERATELY SO:**
[`SESSION-PROMPT-VISUAL-SWEEP.md`](SESSION-PROMPT-VISUAL-SWEEP.md) — Ali's separate
visual-only commission (every pixel, control, width and language against the design kit). The
two do not overlap: that one changes **how things look**, this one changes **the instruments,
the refusal plumbing and the labelling tail**. ⛔ If you are running this prompt, do not also
sweep the visuals — and take an isolated worktree (§2), because the visual session may be live
in `C:\kipindi-main` at the same time. The one shared item is **D2** below, which is small,
already decided, and belongs here because it is a rule in `DESIGN_AUTHORITY` §F rather than a
pixel judgement.

Any other prompt that looks live is spent — check this file first.

---

## ⭐ THE ONE STORY THAT EXPLAINS WHY THE ORDER BELOW IS THE ORDER

On 2026-08-15 a RED harness printed **"tree restored"** and exited 0 **while leaving two
mutations on disk** — its restore set was a hard-coded list of six files that did not include
what the newer mutations touched. One of those mutations, a bare `if (true)`, was swept into
commit `76efe614` as a third hunk and **deployed**. For roughly two hours every hedging player
on production read *"…only one side counts toward the **TZS 0** you still need to bet before
your bonus can be withdrawn"* — a false statement about money, on a money surface, and false
every single time because production holds **zero** grants.

Nothing caught it, because **`red:all` is a 41-segment `&&` chain that currently exits 1 early**,
so roughly thirty guards after the break run **never**.

⛔ **So the instruments come first (§3 A–E).** Fixing product defects while the fleet that
protects them is disarmed is how the next `if (true)` ships. Everything else in this prompt is
downstream of that.

---

## §1 · ALI HAS ALREADY DECIDED THESE — do not re-ask, do not re-litigate

| # | Decision | What to build |
|---|---|---|
| **D1** | **UD-20 — quote both outcomes on the round page.** | A hedged holder on a LOCKED round currently sees **no payout figure at all** on `/updown/[roundId]`, while the board card already shows two rows. Make the round page match the card exactly: *"If it closes UP you get X / If it closes DOWN you get Y"*, priced by the **same server function settlement uses** (`myPayoutIfUp`/`myPayoutIfDown` already exist on `BoardRound`). ⛔ Never resurrect a single blended number — `myExactPayout` priced `up + down` as if it all sat on UP and printed a confident wrong figure (A-5). A one-sided holder gets the same two rows and their losing row reads **0**, which is simply true. |
| **D2** | **Hide the corner toast while a result modal is open.** | At 360px the toast covers the bet receipt's crest for its first 3s (perfect at 768+). `DESIGN_AUTHORITY` §F1 already says the modal is the PRIMARY signal and the toast SECONDARY — so the secondary stands down while the primary is up. ⛔ **Do NOT restack z-index globally**: toasts sit above modals on purpose so a failure fired *during* a confirm dialog stays readable. Suppress at the source (the toast provider knows when a `[role="dialog"]` is mounted), and ⛔ never drop a **sticky** (`durationMs: 0`) money-path failure — queue it to fire when the modal closes. |
| **D3** | **Fix everything except money paths.** | Fix UI, copy, labels, tooling and doc defects outright. ⛔ **FILE — do not fix — anything touching settlement, payout, ledger, fee or wallet arithmetic.** Those get a dedicated session with its own scrutiny; a money change made mid-sweep gets less review, and every push here is a live deploy. Filing means a row in `docs/LIVE-QA-CAMPAIGN.md`'s register with evidence, not a sentence in a handoff. |

---

## §2 · BEFORE YOU TOUCH ANYTHING

```bash
git fetch --all --prune && git log --since="today" --format="%ci %h %s" origin/main && git status --short
```

### ⭐ TAKE AN ISOLATED WORKTREE. THIS IS MANDATORY, NOT ADVICE.

`docs/PARALLEL-SESSION-COORDINATION.md` already requires filesystem isolation, and 2026-08-15
proved why three times over: two sessions in one clone produced contaminated `tsc` runs, a
`next build` that hung fighting a `next dev` server over `.next/`, and an interrupted harness
that **reduced two source files to NUL bytes**.

```bash
git worktree add C:\kipindi-finish -b finish/all-open origin/main
cd C:\kipindi-finish && npm ci --prefer-offline
```

- ⚠️ **Do NOT junction `node_modules`** from the main clone — `tsx` tolerates it, Turbopack
  refuses (*"Symlink [project]/node_modules is invalid, it points out of the filesystem root"*).
  A real `npm ci` takes ~1 min. Copy `.env.qa.local` across.
- ⭐ Isolation is what makes RED harnesses **safe to run at all**, since mutations land only in
  your tree. Without it, §3 is not attemptable.
- Clean-up order at the end: kill leftover `node` processes **first** (a timed-out
  `test:responsive` holds handles and makes `worktree remove --force` fail with *Permission
  denied*), then remove, then `git worktree prune`. `Remove-Item` is blocked on top-level
  `C:\…` paths — use `rm -rf` from Bash.
- ⚠️ **There is already a stray worktree to clear:** `C:/kipindi-night` on
  `night/measure-search`. Check whether its branch holds anything unmerged before removing.

### The rules that survive a shared `origin`

1. ⛔ **NEVER `git add -A`.** Stage by explicit path; `git commit -F msg -- <paths>`.
2. ⛔ **Before pushing, compare `git log -1 origin/main` with `git log -1 HEAD`.** If HEAD sits on
   another session's commits, push **only your own SHA** (`git push origin <sha>:main`).
3. ⛔ **Never `TaskStop` a RED harness.** Its "restored byte-for-byte" contract only holds if the
   run completes. After any interrupted run, scan for NUL bytes and restore from git.
4. ⚠️ `:3017` is yours by convention.

**Read:** `.claude/skills/50pick-standards/SKILL.md` §5b · `docs/DESIGN_AUTHORITY.md` §0, §C, §F,
§L · `docs/RULES.md` §2.9 · `docs/FAILURE-INVENTORY.md` §1.5, §2.3, §3.8, §3.9, §6, §7 ·
`scripts/red-anchor.mjs`'s header.

---

## §3 · THE WORK — atomic units, in this order

⛔ **One unit per commit**, docs in the same commit. ⛔ Do not batch two units.

### ▶ INSTRUMENTS — do these first, everything else depends on them

| # | Unit | Done when |
|---|---|---|
| **A** | **`red:all` becomes a reporting runner.** Run **every** harness, collect results, print a table, exit non-zero iff any failed. Model on `scripts/test-all.mjs`, which already does this for `test:*` (*"223/225 green · FAILED: …"*). ⛔ Keep the non-zero exit — a runner that always exits 0 is the same disease. | one run shows the fleet's true state for the first time |
| **B** | **Capture that baseline into the record.** Which harnesses pass, fail, or cannot find their anchors. | a measured count replaces every estimate below |
| **C** | **`red:updown-readiness` — 5 of 16 anchors do not match.** 🟢 HIGH confidence: two independent measurements agree (a run, and a static sweep). Filed at `FAILURE-INVENTORY.md` §7.2c. | 16/16, proven by running it |
| **D** | **Every other harness B finds.** ⚠️ A static sweep flagged ~27 non-matching anchors across ~6 harnesses — 🟡 **treat as a LEAD, NOT A COUNT**: that sweep inferred targets heuristically and only scanned `src/**.{ts,tsx,mts}`, so CSS-targeting harnesses (`m1-even-light-red.mjs`) are almost certainly false positives. **Re-measure from A's output.** Also: check every harness for a **hard-coded restore list** — that is what let `if (true)` escape (§3.9). The root fix (snapshot on first touch) landed in one harness; verify no other still hard-codes. | each proven by running it |
| **E** | **`test:red-anchors`** — a **static** audit (it reads, never mutates, so it is safe in `test:all`). It must: enumerate every `red:*` from `package.json` (⛔ never a hand-list — that is how `red-e64` stayed out of `red:all` for 8 days); resolve every anchor via **`red-anchor.mjs`'s own `resolveAnchor`** so the audit cannot disagree with the harnesses; **fail on 0 or ≥2 matches**; ⭐ **assert every `red:*` is reachable from `red:all`**; and carry a **positive control** — a blind scanner prints "0 stale" exactly like a clean fleet. ⛔ Make each harness **declare** its targets in one exported shape rather than having the auditor guess. | RED-proven, wired into `test:all` |

### ▶ REFUSALS — the last ⏳ in `RULES.md`

| # | Unit | Done when |
|---|---|---|
| **F** | **`loss limit` is the last `INVALID` family still recovered from prose.** Its service has not been taught to emit a `reason`. ⛔ `INVALID` and `SUSPENDED` stay deliberately unmapped — they mean four things each. ⛔ **Do not delete `RULES.md` §2.9's ⏳ marker until this is closed AND verified on production.** | the reason is emitted, the phrase test it replaces is **deleted**, §2.9's ⏳ removed after prod verification |
| **G** | 🔴 **THE DEFECT WAS MOVED ONE LAYER UP, NOT REMOVED.** Where the registry's mapped codes *are* emitted (`PW_WEAK`, `VOTING_CLOSED`, `EMAIL_TAKEN`, …) they are **minted in the ACTION layer by phrase-matching the service's own English**. So the phrase-matching this whole programme exists to retire is still there, one layer higher. ⚠️ And five rows (`DOC_IMAGE`, `DOC_TOO_LARGE`, `DOCS_LOCKED`, `NIDA_TAKEN`, `NO_EXTRA_REQUEST`) were **unreachable** — no service emitted them. Move emission into the services. | no action layer decides a reason by reading English; every registry row is reachable or removed |
| **H** | **`qa:refusal-frames`' drive half is incomplete.** Its locale half passes 12/12 (`kp-locale` on the context, `<html lang>` read back, refuses on mismatch). The drive half cannot reach the banner surfaces: they are client-gated (close-account disables its button until the typed text matches) or post through the kit `Select`'s hidden input. ⛔ **Do NOT "fix" this by navigating straight to `?reason=…`** — that proves the renderer renders and nothing else. Mint a real reset token via the dev-test helpers, or drive `/profile/kyc` submit-for-review with fewer than three documents. | a REAL refusal is driven and photographed, 360/768/1280/1920 × EN/SW/ZH |

### ▶ PRODUCT — the decided items and the labelling tail

| # | Unit | Done when |
|---|---|---|
| **I** | **D1 — UD-20, quote both outcomes on `/updown/[roundId]`.** See §1. | the round page and the board card agree to the shilling |
| **J** | **D2 — suppress the toast while a result modal is open.** See §1. | read at 360 in all three languages, modal crest unobstructed, and a sticky money-path failure still survives |
| **K** | **Labelling tail.** `trust-band.tsx` renders **"NO"** for an *unrecorded* outcome — a word that means something specific, used for absence. Notification **TITLES** are still English in all three languages (`notification-service.ts`). The `test:labels` §4 ratchet stands at **15** with a reason recorded per survivor — lower it as each is fixed, ⛔ in the same commit. | ratchet lowered to its true floor; no enum word used for absence |

### ▶ HOUSEKEEPING — Ali asked for this explicitly

| # | Unit | Done when |
|---|---|---|
| **L** | **Retire every spent prompt and stale doc.** ⭐ *"We rely on these — when done, we clean."* A prompt that still reads live sends a session to redo finished work. Reduce each spent one to a short pointer (what it commissioned → where the result lives), keep `docs/README.md`'s status column and its **file count derived by listing, not by memory** (it has been wrong twice: it said 45 when the real number was 59), and remove the stray worktree. ⛔ Never silently edit a ⚪ RECORD — write the correction beneath it. | `test:docs` green, index complete, ⛔ **and THIS file emptied to a pointer as the last act** |

---

## §4 · DEFINITION OF DONE

- Units A–L each shipped as their own commit, docs in the same commit.
- `npm run red:all` runs **every** harness, reports a table, exits non-zero iff any failed — and
  **every** harness catches 100% of its own mutations, proven **by running it**, not by reading it.
- `test:red-anchors` green with a positive control; a stale anchor or an unreachable `red:*`
  fails it.
- `RULES.md` §2.9's ⏳ removed **only** after production verification.
- No action layer decides a refusal by phrase-matching English.
- Every money-path defect found is **FILED with evidence**, not fixed (D3).
- `npx tsc --noEmit` · `npm run build` · `npm run test:all` · `npm run red:all` at the END.
- **Frames read** at 360/768/1280/1920 × EN/SW/ZH for every surface touched — *triggered*, not
  merely loaded. A green suite is a pre-flight check, not evidence.
- Verified **on production** after the push: HTTP 200, a clean `railway logs -s 50pick`, and a
  frame actually read.
- `docs/LIVE-QA-CAMPAIGN.md` §6b handoff at the TOP, stating the money position explicitly.
- ⭐ **Then EMPTY this file.**

---

## §5 · TRAPS THAT HAVE COST REAL TIME HERE

- ⛔ **An `ERROR` in a log is not a defect, and a retry is not an outage.** A caught `P2002`
  still prints `prisma:error`. On 2026-08-15 an "Up & Down is down" claim was raised and
  withdrawn the same hour on exactly this — production had live rounds the whole time. **Measure
  the OUTCOME (are rounds opening?), never the symptom (is something retrying?).**
- ⛔ **A build that fails on commit X and succeeds on X-plus-two-markdown-files did not fail on
  the code.** One Railway build failed that day and the next succeeded with only docs changed —
  transient. A failed build never swaps the deployment, so production is never affected. Diff
  first.
- ⛔ **`node -e` and shell heredocs eat a backslash layer, and bash executes backticks inside a
  heredoc.** Never shell-edit `src/lib/i18n-dict.ts` or any doc containing code spans — use the
  editor. Paid for twice in one day.
- ⛔ **Assert the VALUE, not the symbol.** Count calls in **statement position** and assert
  `mentions === statements`; a `void 0 &&` prefix keeps every character of a name while killing
  the call (E-57). And `mentions === statements` alone is **not enough** — test the dead guard
  directly.
- ⛔ **A guard and its own RED proof can agree with each other and both be wrong** (E-108), if
  both locate the target the same wrong way. Check that the thing you found is the thing you meant.
- ⛔ **Language comes from the `kp-locale` COOKIE**; there is no `/api/locale`. Set it on the
  Playwright **context**, read `<html lang>` back, refuse to capture on a mismatch.
- ⛔ **Use a class or `data-` attribute, not text, to find a control.** A `/UP|JUU|涨/` filter
  matched only Chinese because EN renders "Up" and SW "Juu" — **case**.
- ⛔ **A rect is not visibility** — a control inside a closed `<details>` reports a real 81×44
  box. Use `checkVisibility()`.
- ⛔ **NEVER regex a CSS colour** — tokens are `oklch()`; a `[\d.]+` scrape reads lightness,
  chroma and hue as R, G, B and once scored a button at 1.24:1. Paint into a 1×1 canvas.
- ⚠️ **Tailwind's spacing scale is OVERRIDDEN**: `h-8` = 48px, `h-9` = 64px, `mt-12` = 128px.
- ⚠️ `.env.qa.local` is dated 11 Aug and is **STALE** — a sign-in landing back on the signed-out
  shell is that staleness, not a product defect.
