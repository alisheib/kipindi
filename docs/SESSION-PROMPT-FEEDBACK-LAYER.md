# SESSION PROMPT — THE FEEDBACK LAYER: haptics · popups · toasts · notifications, on EVERY action

**Paste this whole file as your opening prompt.** Repo: `C:\kipindi-main`, branch `main`.
⚠️ **Every push to `main` deploys LIVE to `https://50pick.tz`.**

Commissioned by Ali, 2026-08-15: *"finalise the haptics, options, notifications, popups and
toasts perfectly and fully on every needed action in the platform — focus just on those."*

---

## §0 · THE TREE IS YOURS — and one unbuilt modal comes with it

Two sessions ran this clone on 2026-08-15 and **both have finished and pushed**. `origin/main` is
at `1b7bf6d3`. Still, before you touch anything:

```bash
git fetch --all --prune && git log --since="today" --format="%ci %h %s" origin/main && git status --short
```

### ⭐ THE UP & DOWN BET CONFIRMATION MODAL IS UNBUILT, AND IT IS YOURS

`docs/SESSION-PROMPT-UPDOWN-POLLS-FINALISATION.md` is that session's RECORD, not a prompt. §5a
(every position visible) **shipped** as `d5863587`. **§5b — the Up & Down bet confirmation modal —
says "STILL TO BUILD · NOT STARTED", and its last commit only corrected the brief.** It is a popup
on a consequential money action, so it is squarely this session's subject. Read that record's §5b
in full; it is a good spec and it did real groundwork:

- **The i18n is already live** — 16 `udRc*` keys in `src/lib/i18n-dict.ts`, EN + SW + ZH:
  `udRcProjected` · `udRcOpenPrice` · `udRcBetsClose` · `udRcResultDue` ·
  `udRcExitLabel`/`udRcExitValue` · `udRcNoExitLabel`/`udRcNoExitValue` · `udRcKeepPlaying` ·
  `udRcWatchRound`. ⛔ Reuse, do not restate: `udBetPlaced`, `udUp`/`udDown`, `udStake`,
  `udRoundLabel`, and **`udEstimateNote`** (the projection disclaimer already says the right thing,
  so the card and the receipt cannot drift).
- **The shape:** `OperationResultModal`, never a new primitive; sibling to
  `updown-bet-blocked-modal.tsx` (the refusal case — read it first so the success modal is its
  sibling, not a second dialect). `stripTone={side === "UP" ? "yes" : "no"}`, auto-dismiss at the
  shared 5s. ⛔ It must not gate repeat taps — repeat taps are repeat bets; a burst COALESCES into
  one modal showing the latest bet, never a stack.
- **The remaining work is threading:** `UpDownStakeControls` receives only `bet`, `pricing`,
  `assetName`, `size`. The receipt also needs `durationMinutes`, `selectionClosedAt`, `closesAt`,
  `openPrice` + `decimals`, the source class, the round href, and the market's **frozen**
  `freeExitGraceMinutes`.

### ⛔ THREE FACTS THAT MODAL MUST NOT GET WRONG — measured, and they contradict the old brief

1. **The locked window is NOT one minute wide.** It is the result phase and it SCALES:
   `resultPhaseMinutes(d) = max(1, ceil(lead/60))`, `lead = min(d·60, max(30, round(d·60 × 0.2)))`
   (`src/lib/updown-durations.ts`) → 3m/5m rounds get 1m, 10m→2m, 15m→3m, 30m→6m, 60m→12m.
2. **There are no 60-second rounds.** `ALLOWED_DURATIONS = [3, 5, 10, 15, 30, 60]` **minutes**.
3. **Free cancellation usually does NOT apply to Up & Down.** `cashOutValue` gates on runway:
   `hadRunway = graceMs > 0 && closesAt - placedAt >= graceMs`. On a 3-minute round it is
   **never** available; `market-service.ts`'s own comment calls the TOO_SHORT refusal "the
   ORDINARY branch". ⛔ **So the receipt's "way out" row must be COMPUTED per bet, never stated as
   a constant** — which is why both the exit and the no-exit copy already exist in the dictionary.

### The four rules that make parallel sessions survivable (a third session may start at any time)

1. ⛔ **NEVER `git add -A` / `git add .`** — measured 2026-08-06: a parallel session's `git add -A`
   swept six of another session's in-flight files into its own commit and pushed them **without
   the four that make them compile**. `main` was broken for 19 minutes. **Stage by explicit path**,
   and commit with `git commit -F msg -- <paths>`.
2. ⚠️ **`main` moves under you.** `git fetch origin` and re-read
   `git rev-list --left-right --count origin/main...HEAD` **immediately before every commit**.
3. ⚠️ **Shared ports and ONE database.** `netstat -ano | grep LISTENING | grep :300` first; take a
   free port (`:3013` is yours by convention) and kill only your own PID. Say what you are about
   to seed before you seed it.
4. ⚠️ **Shared id registers.** Re-grep `E-…` / `UD-…` ids at the moment you file one.

### ⛔ DO NOT COME BACK UNTIL IT IS FULLY DONE

Ali's standing instruction: finish, test, verify live, document, commit, push. No partial
hand-offs, no "shall I continue?". If something is genuinely blocked, finish **everything else in
full** first, then say exactly what is blocked and why.

---

## §1 · THE SCOPE — five channels, one question

**The question this session answers: for every consequential action in the platform, what does the
player (or officer) SEE, FEEL and RECEIVE — and is it the same answer for the same kind of action
everywhere?**

The five channels:

| Channel | What it is |
|---|---|
| **Popups** | `Modal` / `ConfirmModal` / `OperationResultModal` / `BetConfirmModal` / `SellConfirmModal` / the blocked-bet modal / admin `action-overlay` / the new `<details>` filter sheet |
| **Toasts** | `toast()` immediate, `deferToast()` on the settled edge, via `useDeferredToast(pending)` |
| **Haptics** | `src/lib/haptics.ts` and every call site |
| **Notifications** | in-app centre · web push · **47 email templates** (`src/lib/server/comms-registry.ts`) |
| **The options inside them** | the CHOICES a dialog offers — confirm/cancel, the ghost second action, "undo", the exit a failure hands you. A dialog that states a problem and offers no way out is a dead end |

⛔ **Out of scope, deliberately:** new features, new money logic, layout/design changes beyond
what a correct dialog requires, and `src/components/updown/**` while the other session holds it.

---

## §2 · THE BAR — Ali, verbatim

> *"perfectly working, no glitches, 100% functional, no workarounds, clean code"* ·
> *"no half work accepted. only full work"* · *"visually perfect and data perfect"* ·
> *"you should perfectly finish, tested, validated, re-validated and re-analysed, then we push"*

**You act as ALL NINE roles on every change** (`.claude/skills/50pick-standards/SKILL.md` §1).

### The five rules that override convenience

1. **VERIFIED MEANS EXECUTED.** Run it, quote the output. A doc naming a file is not evidence.
2. **ASK OF EVERY CHECK: would it still pass if the feature were absent? Would it fail even if
   the product were fine?** Every refusal check needs a positive control in the same run.
3. **A DEFECT CAN BE INVISIBLE TO EVERY GATE AND OBVIOUS IN A FRAME.** Read every screenshot.
4. **NEVER `git add -A`** (§0 rule 1).
5. **DOCS TRAVEL WITH THE CODE, IN THE SAME COMMIT**, and a gate nothing runs is not a guard.

---

## §3 · READ FIRST, IN THIS ORDER

1. `CLAUDE.md` — especially the **"UX commitments (kit-faithful)"** block, which is the closest
   thing this platform has to a feedback law today.
2. `.claude/skills/50pick-standards/SKILL.md` — **§5b in full**: twelve numbered ways an
   instrument on this codebase has lied. Several are about exactly this layer.
3. `docs/DESIGN_AUTHORITY.md` **§0** (the filing law) — read before creating ANY design doc, and
   its gold-discipline and motion sections.
4. `docs/RULES.md` — the money authority, including the standard every failure message must meet.
   ⛔ Never restate a rate anywhere.
5. `docs/FAILURE-INVENTORY.md` — **the map for a large part of this session** (see §6).
6. `src/components/ui/modal.tsx` — read it end to end before touching any dialog. Its header
   comments are the contract.

---

## §4 · THE METHOD — build the matrix before you change anything

⭐ **"Every needed action" needs a denominator.** Do not start by fixing things you notice. Start
by enumerating every consequential mutation, then fill in what each one gives back.

**Step 1 — the action inventory.** Enumerate every `"use server"` mutation across
`src/app/**/actions.ts`, `src/app/_actions/**`, and the admin surfaces. Group them: money-in ·
money-out · betting · settlement/resolution · account & RG · social · admin/compliance.

**Step 2 — the matrix.** One row per action, one column per channel, plus the failure path:

| action | popup | toast | haptic | in-app | push | email | what a FAILURE shows |
|---|---|---|---|---|---|---|---|

**Step 3 — judge by SIBLINGS, not by taste.** The defect you are hunting is *inconsistency*: two
actions of the same kind and consequence that answer the player differently. A missing toast is
only a defect if its sibling has one, or if the action is consequential enough to demand one.

**Step 4 — write the law down.** The end state is not "more toasts". It is a **stated rule** —
which class of action gets which channels — filed per `DESIGN_AUTHORITY.md` §0, with a gate that
holds it. ⛔ One definition site. If you find a value or a rule in two places, delete one.

⛔ **A matrix built from greps is a lie.** Open the call sites. `useDeferredToast` wraps things;
a `pushOnly(` can be short-circuited with `void 0 &&` and leave every character of its name in
place (that is E-57, and it killed a loss notification while the guard stayed green).

---

## §5 · WHAT IS ALREADY LAW — verified in the code, do not reinvent it

Everything in this section was read directly during the session that wrote this prompt.

### The dialog primitive — `src/components/ui/modal.tsx`

- `Modal` portals to `document.body`, takes `useModalLock(open)` (body scroll lock + Android
  viewport-zoom reset), traps focus, **returns** focus to the trigger, closes on Escape, and
  renders an inert `tabIndex={-1}` scrim at `bg-black/60`. It has a `sheet` variant that docks to
  the bottom below `sm`.
- 🔴 **Its focus effect depends on `[open]` ALONE, and that is a scar.** It once depended on
  `onClose` too; every caller passes a fresh inline arrow, so the effect re-ran on EVERY render
  and dragged focus onto the primary button — **once a second on the bet-confirm dialog, whose
  countdown ticks**. A keyboard user who tabbed to Cancel had focus pulled onto Confirm, on a
  money dialog. ⛔ Never add a dependency to that effect. Callbacks live in refs.
- `ConfirmModal` has two tiers: `medium` (one explicit confirm) and `hard` (type-the-word to arm,
  e.g. `SEAL`). `loading` disables both buttons, blocks scrim/Esc/✕, and sets `aria-busy`.
- ⛔ **Gold is deliberately NOT a confirm tone.** Tones are `claret` / `warning` / `brand`.

### The rules `CLAUDE.md` already commits to

- **Every consequential mutation goes through the unified `OperationResultModal`** — large ✓/✗
  crest, eyebrow + headline + bilingual subtitle, optional detail rows, primary + ghost CTAs.
  **Success auto-dismisses at 5s; failures stay until dismissed** (LCCP informed-consent).
- **Confirmations:** bet → `BetConfirmModal`, sell → `SellConfirmModal`.
  ⛔ **Never `confirm()`/`alert()`** — always a portalled kit modal. The corner toast is a
  **secondary** signal only.
- **`useDeferredToast(pending)`** — success toasts fire on the FALLING EDGE of `useTransition`
  pending (when `router.refresh()` commits), errors fire immediately via `toast()`.
  **Zero `setTimeout` in the codebase** — keep it that way.
- **Gold budget:** gold marks money that was **EARNED**. `stripTone`: `"gold"` = sell/settlement,
  `"yes"|"no"` = bet placed, `"brand"` = admin. The BetConfirmModal quote-hold strip is
  brand-blue, **not** gold. ⛔ A projected figure is never gilded.
- **Loss notifications use direct language** ("Bet lost · TZS X") — no euphemism that could delay
  awareness of a loss (LCCP harm-prevention). Apply the same standard to any new copy.

### Email — the inventory is CODE, not prose

`src/lib/server/comms-registry.ts` holds all **47** templates with trigger module, audience,
chrome and whether it is on a money path. `npm run test:cert-c1` renders all 47 and fails if the
registry and the code disagree.
⛔ **`sendEmail` never throws.** `SendResult.reason` distinguishes `sent` · `stub` · `no-address`
· `suppressed` · `failed` — **a caller that PROMISES the player an email must read it**. Hunt for
callers that say "we've emailed you" without checking. That is a lie told on a money path.
⚠️ Emails are **EN + SW in ONE message**, locale-independent, **no Chinese, no per-locale
variant** — a recorded position, not an oversight. Do not "fix" it.

---

## §6 · THE KNOWN STARTING POINTS

### ▶ 6a · The 8 surfaces that say only that something failed

`docs/FAILURE-INVENTORY.md` §1.5, second row. Named, counted, and **not started**:

`watch-star.tsx:81` · `position-share.tsx:56` · `push-settings.tsx:58` · `:62` · `:80` ·
`security-client.tsx` · `password-section.tsx:47`

None is on the betting path, which is why they were deferred — and they are exactly this
session's subject. Each one currently tells a player that an action failed **without telling them
why or what to do**. `docs/RULES.md` states the standard a failure message must meet; make each
of these meet it, in EN + SW + ZH.

### ▶ 6b · The overloaded codes still reaching players through phrase-matching

`docs/SESSION-PROMPT-RATES-SESSION-4.md` §3 ▶1: `INVALID` and `SUSPENDED` each mean four things,
so they are deliberately **not** mapped by `reasonForCode`; those refusals reach the player
through `errorCopy`'s phrase matching. §8 of `test:failure-reasons` pins every phrase to the
server's actual string so the seam cannot rot silently — **but the seam is there**. Teach the
services to emit their own `reason`, one family at a time (wallet → KYC → auth), deleting each
phrase test as its reason lands.
⚠️ Coordinate: that is the RULES programme's last ⏳. If a session is on it, leave it.

### ▶ 6c · Push may not be enabled at all

A live check once matched a `[role="switch"]` in the page chrome while the panel it was testing
plainly read *"Push isn't available on this deployment yet."* **Establish the real state of web
push on production before writing a single line about it** — and if it is off, say so on the
surface honestly rather than offering a toggle that does nothing.

### ▶ 6d · Everything else comes from YOUR matrix (§4)

⚠️ **The prompt deliberately does not hand you a gap list.** A previous prompt asserted three
things about this codebase that turned out to be false, and the receiving session had to correct
them mid-task. Measure, then act.

---

## §7 · TRAPS THAT HAVE COST REAL TIME HERE

- ⛔ **Assert the VALUE, not the symbol** (§5b). A guard counted `pushOnly(` occurrences; prefixing
  one with `void 0 &&` killed a loss notification while leaving every character of the name in
  place. Count calls in **statement position** and assert `mentions === statements`.
- ⛔ **Where a component renders different controls per state, the control's PRESENCE is the
  state.** Read the element and its `aria-checked` — never parse prose. `/on\b/` matches
  "turn this **off** any time".
- ⛔ **Scope every selector to the thing under test.** A page-wide confirm click once matched
  "Resolve YES" on the card *behind* the modal, and only the product's scrim stopped a money write.
- ⛔ **A closed control photographs perfectly.** Open every dialog, at 360/768/1280/1920, in
  EN + SW + ZH. A topic panel measured **4px — 1%, zero of eight options reachable** while every
  automated check was green.
- ⛔ **A rect is not visibility.** A control inside a CLOSED `<details>` reports `display: flex`,
  `visibility: visible` and a real **81×44 box**. Use `checkVisibility()`.
- ⛔ **NEVER regex a CSS colour** — tokens are `oklch()`; a `[\d.]+` scrape reads lightness,
  chroma and hue as R, G, B and once scored a button at 1.24:1. Paint into a 1×1 canvas.
- ⛔ **Language comes from the `kp-locale` COOKIE**; there is no `/api/locale`. Set it on the
  Playwright *context*, read `<html lang>` back, and refuse to capture on a mismatch.
  ⚠️ `退出登录` (sign OUT) contains `登录` (sign in) — a ZH predicate needs the lookbehind.
- ⛔ **Tailwind's spacing scale is OVERRIDDEN**: `h-8` = 48px, `h-9` = 64px, `mt-12` = 128px.
  `min-h-[44px]` is an arbitrary value on purpose.
- ⛔ **`node -e` and shell heredocs eat a backslash layer**, and **PowerShell's `Get-Content`
  mangles UTF-8** — never shell-edit the i18n dict. Use the editor.
- ⚠️ **Reduced motion and haptics are different consents.** `prefers-reduced-motion` is not
  permission to vibrate. Check whether a user preference exists, whether it is honoured, and
  whether anything vibrates on a non-action (a render, a poll, a background refresh).
- ⚠️ **`.env.qa.local` on this machine is dated 11 Aug and is STALE** — the six QA personas were
  re-minted on 14 Aug from the office PC. A sign-in that lands back on the signed-out shell is
  that staleness, not a product defect. Re-mint or copy before concluding anything from a live
  authed driver.

---

## §8 · DEFINITION OF DONE

- **The matrix exists**, is complete over the action inventory, and is checked in as the record
  (extend an existing doc — ⛔ no new tracker files).
- **The law is written once** — which class of action gets which channels — filed per
  `DESIGN_AUTHORITY.md` §0, with a **gate** that holds it and a **RED proof seen to fail** on
  each defect the gate names.
- Every one of §6a's 8 surfaces meets the failure-message standard, in EN + SW + ZH.
- No native `confirm()`/`alert()` anywhere; every consequential mutation ends in the shared
  primitive; no double signal (modal *and* toast for one action) unless the toast is deliberately
  the secondary one.
- **Frames read** at 360/768/1280/1920 × EN/SW/ZH for every dialog you touch, **opened**, plus
  its failure state. A green suite is a pre-flight check, not evidence.
- `npx tsc --noEmit` · `npm run build` · `npm run test:all` · **`npm run red:all` at the END of
  the session**, not only the suites you touched. ⛔ A RED harness with a stale anchor is an
  ABSENT test, and it fails in the direction of looking fine.
- Verified **on production** after the push: HTTP 200, a clean `railway logs -s 50pick` boot, and
  a frame actually read.
- Docs updated **in the same commits**; committed **by explicit path**; pushed.
- ⭐ **Then EMPTY this file** — a spent prompt that still says "paste this as your opening prompt"
  sends the next session to redo finished work.
