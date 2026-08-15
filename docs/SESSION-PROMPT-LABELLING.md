# SESSION PROMPT — LABELS: the right word, in the right place, in the right language

Repo: `C:\kipindi-main`, branch `main`. ⚠️ **Every push to `main` deploys LIVE to `https://50pick.tz`.**

Commissioned by Ali, 2026-08-15: *"work solely on labelling in the website. Make sure labels
are correct — for example in Up & Down polls, in activity, we have 'NO won' and 'YES won', but
it should be 'UP won' or 'DOWN won'. So many other labelling bugs exist similarly in all
languages. Go through the whole platform from user to admin, literally every layer of code, and
validate all labelling is correct — the right word in the right place and the right context."*

⛔ **THIS SESSION CHANGES WORDS, NOT BEHAVIOUR.** No money logic, no new features, no layout
work. If you find a behavioural defect, FILE it (§7) and keep going.

---

## §0 · BEFORE YOU TOUCH ANYTHING

```bash
git fetch --all --prune && git log --since="today" --format="%ci %h %s" origin/main && git status --short
```

Then read, in this order:
1. `CLAUDE.md` — the "Design rules" and "Working with Ali" blocks.
2. `.claude/skills/50pick-standards/SKILL.md` — **§5b in full** (twelve ways an instrument here
   has lied) and **§7 Copy discipline**.
3. `docs/DESIGN_AUTHORITY.md` **§0** (the filing law), **§C** (what the interface may say) and
   **§F** (the feedback law — which surface says what).
4. `docs/RULES.md` — ⛔ never restate a rate anywhere.
5. `docs/FAILURE-INVENTORY.md` §6 — the action × channel matrix, so you know which surfaces
   exist before you go looking for their words.

### The four rules that make parallel sessions survivable

1. ⛔ **NEVER `git add -A` / `git add .`** — stage by explicit path, commit with
   `git commit -F msg -- <paths>`. A parallel session's `git add -A` once broke `main` for 19
   minutes.
2. ⚠️ **`main` moves under you.** Re-read `git rev-list --left-right --count origin/main...HEAD`
   immediately before every commit.
3. ⚠️ **Shared ports and ONE database.** `netstat -ano | grep LISTENING | grep :300` first;
   `:3014` is yours by convention. Say what you will seed before you seed it.
4. ⛔ **NEVER `TaskStop` a RED harness.** Session 45 killed one mid-run and it **zeroed two
   source files** — the "restored byte-for-byte" contract only holds if the run completes. If
   you must, scan for NUL bytes afterwards and restore from git.

---

## §1 · WHAT "A LABEL" MEANS HERE, AND THE FOUR WAYS IT GOES WRONG

A **label** is any word the product uses to NAME something to a human: an outcome, a side, a
status, a column heading, a chip, a tab, a button, a filter, an email subject, an audit action
rendered to an officer, a notification title.

The four failure modes, each of which has a live instance (§2):

| # | Failure | Shape |
|---|---|---|
| **L1** | **Wrong vocabulary for the product** | a poll's YES/NO used for an Up & Down round, whose sides are UP/DOWN |
| **L2** | **A raw enum reaches a human** | `resolved ${outcome}` interpolating `"YES"`, `"UPDOWN"`, `"BET_PLACED"` straight into a sentence |
| **L3** | **An English token inside a translated string** | a Chinese sentence containing the literal `YES` |
| **L4** | **Right word, wrong context** | "Bet" where the product says "prediction"; "poll" on an Up & Down surface (the §3.2 defect, already fixed once) |

---

## §2 · WHAT IS ALREADY MEASURED — start here, it is real

⭐ **Verified in the source on 2026-08-15. These are not guesses; open them first.**

### ▶ 2a · `notifySelectionClosed` hard-codes YES/NO **inside all three languages**

`src/lib/server/notification-service.ts:405-417`, verbatim:

```
const side = opts.hasYes ? "YES" : "NO";
bodyEn: `… If YES wins you receive …; if NO wins you receive …`
bodySw: `Kuweka dau kumefungwa. YES ikishinda utapata …; NO ikishinda utapata …`
bodyZh: `… 投注已截止。若 YES 获胜您将获得 …；若 NO 获胜您将获得 …`
```

That is **L3 on its own** — a Swahili and a Chinese player both read the ASCII token `YES` —
and **L1 if this path is ever reached by an Up & Down round**, whose sides are UP and DOWN.

⚠️ **VERIFY THE SECOND HALF BEFORE YOU WRITE IT DOWN.** `perEventNotificationsSuppressed()`
returns true for `productLine === "UPDOWN"`, so per-event notifications may be suppressed for
Up & Down — meaning the L1 half may be unreachable today even though the L3 half is live for
every long-form poll. **Session 45 did not resolve this.** Establish it, then state it.

### ▶ 2b · `notifyWatchedSettled` interpolates the raw enum into three languages

`notification-service.ts:378-387` — `resolved ${opts.outcome}` / `matokeo: ${opts.outcome}` /
`结果：${opts.outcome}`. Whatever string the caller passes lands unmediated in all three. That
is **L2**, and it is the exact shape `errorCopy`'s phrase-matching defect took.

### ▶ 2c · There is NO single "what do I call this side" helper

Every surface hand-writes its own ternary. Measured call sites:

`market-card.tsx:245-248` · `resolution-panel.tsx:126` · `trust-band.tsx:127-128` ·
`fairness/page.tsx:163` · `markets/[id]/page.tsx:404` · `results/page.tsx:363` ·
`watchlist/page.tsx:64` · `ticker.ts:106`

⭐ **THE PATTERN, NOT THE COUNT, IS THE FINDING.** Eight copies of one rule is how a ninth
surface comes to disagree — the same defect `updown-source-label.ts` (`SOURCE_CLASS_KEY`) and
`updown-refund-reason.ts` (`REFUND_REASON_KEY`) were each created to end. **Those two files are
your model for the fix**: a `Record<enum, dictKey>` in ONE module, returning **dict keys, never
English**, consumed everywhere.

⚠️ **AND THEY ARE PROBABLY NOT BUGS TODAY.** `listMarkets()` defaults to
`productLine: "MARKET"`, and `/results`, `/fairness` and `/positions` were each checked and DO
filter to long-form — so these eight render YES/NO on markets that really are YES/NO. **The
risk is structural**: the day one of those surfaces gains `productLine: "ALL"`, all eight lie
at once, silently. Fix the structure; do not report them as live defects unless you prove one.

### ▶ 2d · `/updown/history` and `/positions` are CORRECT — do not "fix" them

`/updown/history` uses `udUpWins`/`udDownWins` and `b.side === "UP" ? "↑" : "↓"`.
`/positions` filters to `"MARKET"` at `page.tsx:41`. Both were checked. Leave them.

---

## §3 · THE METHOD — build the lexicon before you change a word

⭐ **"All labels" needs a denominator.** Do not start from what you notice.

**Step 1 — the enum inventory.** Every enum that can reach a human. Start from
`prisma/schema.prisma` and `src/lib/server/store.ts`: `Side` (YES/NO) · `ProductLine`
(MARKET/UPDOWN) · position `status` · market `status` · `resolvedOutcome` · Up & Down `outcome`
(UP/DOWN/VOID) · void reasons · transaction `type` · notification `kind` · KYC states · audit
`action`/`category` · role names.

**Step 2 — the render map.** For each enum, EVERY place it becomes words, and for whom:
player · officer · email · push · audit export · PDF.

| enum | value | player EN | player SW | player ZH | admin | email |
|---|---|---|---|---|---|---|

**Step 3 — judge by CONTEXT, not by taste.** The same enum legitimately reads differently in
different products: `Side.YES` is *"Yes"* on a poll and *"Up"* on an Up & Down round. **The
defect is a surface that cannot tell which it is holding.** Ask of every render site: *does it
know the productLine?* If not, that is the bug — not the word it happened to pick.

**Step 4 — one definition site.** A `Record<enum, dictKey>` per family, in ONE module, keyed by
product where the product matters. ⛔ Return **dict keys**, never English (`SOURCE_CLASS_KEY`'s
header says exactly why). ⛔ If you find a mapping in two places, DELETE one.

⛔ **A LEXICON BUILT FROM GREPS IS A LIE.** Open the render sites. A `t.common.yes` can be
correct on one page and wrong on the next, and only the surrounding context says which.

---

## §4 · ATOMIC UNITS — one family, one commit

Ali's instruction: **atomic**. Each unit below is independently shippable, independently
verifiable, and independently revertable. ⛔ Do not batch two families into one commit.

| # | Unit | Done when |
|---|---|---|
| **A** | The lexicon module + the enum inventory doc | the map exists, filed per `DESIGN_AUTHORITY` §0b; no code changed yet |
| **B** | **Side** (YES/NO ↔ UP/DOWN), product-aware | one helper; all 8 §2c sites consume it; `test:labels` §B green + RED |
| **C** | **Outcome** (resolved/void), incl. §2b's raw interpolation | no enum reaches a sentence in any language |
| **D** | **Status** (market · position · KYC · payout) | one lexicon; no ad-hoc status strings (perfection-plan §9.2 catalogues the drift) |
| **E** | **Notification + email** copy, incl. §2a | zero ASCII enum tokens inside SW/ZH strings |
| **F** | **Admin** labels — columns, audit actions, filters | English-only by design, but CORRECT and consistent |
| **G** | The guard + its RED proof | §5 |

---

## §5 · THE GUARD — and what it must NOT be

Add a `test:labels` suite and a `red:labels` harness — ⚠️ they do **not** exist yet; creating
them is unit G. Wire them into `test:all` and put the RED one **at the HEAD of `red:all`** (⛔ `red:all` is a `&&` chain — the first break starves everything after it, which
is how a guard at the tail becomes the defect it guards against; session 45 paid for this).

It must:
1. Enumerate every enum value from the **code**, not a hand-list, and assert each has a dict key
   in **all three** languages.
2. Assert **no ASCII enum token appears inside a SW or ZH string** — `/\b(YES|NO|UP|DOWN|VOID|
   OPEN|WIN|LOSS|MARKET|UPDOWN)\b/` inside the `sw:`/`zh:` blocks. This alone catches §2a.
3. Assert **no template literal interpolates an enum into a sentence** (§2b's shape).
4. Assert the side-label helper is the **only** definition site — count `=== "YES" ?` ternaries
   outside it and ratchet at zero.
5. ⭐ **Carry a POSITIVE CONTROL in the same run.** A scanner that has gone blind prints "0
   violations" in exactly the same words as a clean tree. Show it a string it MUST reject.
6. ⭐ **Prove it RED first**, one mutation per defect it names, each reverted byte-for-byte.

⛔ **ASSERT THE VALUE, NOT THE SYMBOL** (standards §5b). Count calls in **statement position**
and assert `mentions === statements`, or a `void 0 &&` short-circuit passes.
⛔ **Use `scripts/red-anchor.mjs`.** It is the shared anchor resolver and the LAST harness that
hand-rolled matching (`updown-chain-stats-red.mjs`) had **all five of its multi-line anchors
silently missing** on a CRLF checkout. Do not write a sixth copy.

---

## §6 · TRAPS THAT HAVE COST REAL TIME HERE

- ⛔ **`node -e` and shell heredocs eat a backslash layer**, and PowerShell's `Get-Content`
  mangles UTF-8. **NEVER shell-edit `src/lib/i18n-dict.ts`** — use the editor.
- ⛔ **Language comes from the `kp-locale` COOKIE**; there is no `/api/locale`. Set it on the
  Playwright **context**, read `<html lang>` back, and **refuse to capture on a mismatch**.
- ⚠️ **`退出登录` (sign OUT) contains `登录` (sign in)** — a ZH predicate needs the lookbehind.
- ⛔ **A trilingual product needs trilingual SELECTORS.** Session 45's frame harness filtered
  buttons on `/UP|JUU|涨/` and matched only Chinese, because EN renders "Up" and SW "Juu" —
  **case**. Prefer a class or `data-` attribute (`button.btn-yes`) over text.
- ⛔ **An ELLIPSIS is not a defect** — skip `text-overflow: ellipsis` elements, but REPORT how
  much is hidden: *"51% of the trust line is behind the ellipsis in Swahili"* is a human's call.
- ⛔ **A closed control photographs perfectly.** Use `checkVisibility()`, never a rect.
- ⚠️ **Longer words break layouts.** German-length Swahili in a chip is a labelling change with
  a visual consequence — read frames at 360 for every label you lengthen.
- ⚠️ **`.env.qa.local` on this machine is dated 11 Aug and is STALE.** A sign-in that lands back
  on the signed-out shell is that staleness, not a product defect.

---

## §7 · DEFINITION OF DONE

- **The lexicon exists**, complete over the enum inventory, filed per `DESIGN_AUTHORITY` §0b
  (⛔ extend an existing doc — no new tracker files beyond this prompt's own record).
- Every unit A–G shipped as its own commit, docs in the SAME commit.
- **One definition site per enum family.** Grep proves no second copy.
- **Zero ASCII enum tokens inside SW/ZH strings.** Zero enums interpolated into sentences.
- The `test:labels` suite green, and its `red:labels` harness catching 100% of its mutations.
- `npx tsc --noEmit` · `npm run build` · `npm run test:all` · **`npm run red:all` at the END**.
- **Frames read** at 360/768/1280/1920 × EN/SW/ZH for every surface whose words changed —
  opened, not just loaded. A green suite is a pre-flight check, not evidence.
- Verified **on production** after the push: HTTP 200, a clean `railway logs -s 50pick` boot,
  and a frame actually read.
- Behavioural defects found along the way are FILED, not fixed.
- ⭐ **Then EMPTY this file** — a spent prompt that still reads as live sends the next session
  to redo finished work.
