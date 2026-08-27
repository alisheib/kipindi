# THE SHELL, THE CARE SYSTEM, AND THE INSTALL INVITATION — session 70's work order

> ✅ **CLOSED 2026-08-27 (session 70). ALL FOUR OF ALI'S ITEMS ARE ANSWERED AND EVERY ONE IS
> PUSHED AND DRIVEN.** This file is now HISTORY — read `docs/LIVE-QA-CAMPAIGN.md`'s topmost
> `RESUME AT (session 71)` instead, and `docs/RG-AUDIT-2026-08-27.md` for item 2.
>
> ✅ **§0.2 IS NOW CLOSED — 2026-08-28 (session 71). THE CERT WORKFLOW HAS BEEN OBSERVED RUNNING
> ON GITHUB ACTIONS FOR THE FIRST TIME: 5/5 PASS, both origin hosts, 48 days, expiring Oct 15.**
> ⛔ **AND THE REASON IT SAT OPEN IS WORTH KEEPING: the blocker was recorded as a fact about the
> PROJECT when it was a fact about ONE MACHINE.** This file said *"no `gh` on this machine,
> `GITHUB_TOKEN` and `GH_TOKEN` both ABSENT"* — true where it was written, and false on
> `C:\kipindi-main`, where `gh` is installed and authenticated as `alisheib` with the `workflow`
> scope. **One session verified its own environment and wrote the answer down as though it were
> the platform's.** Nothing was needed from Ali at all. ⚠️ Check WHICH machine a "cannot" was
> measured on before carrying it forward; this campaign runs on two.
>
> 🔴 **AND THE HEADLINE THIS FILE DID NOT PREDICT: EVERY CONTROL WORKED AND EVERY DEFECT WAS ONE
> LAYER DOWNSTREAM OF IT.** The RG gates were all wired and the WORDS were wrong (`E-232`); the
> words were right and the MODAL threw them away (`E-234`); the break blocked correctly and never
> ENDED (`E-238` — **a one-hour cooling-off was permanent**); the balance pill's live feed was
> built, hardened and fanned across containers and **nothing emitted into it from the play path**
> (`E-229`). ⚠️ **Item 1's premise did not survive measurement** — four scenarios were driven on
> production and all four were GREEN before any fix, so the navbar divergence is **not** claimed
> fixed and needs Ali's reproduction. See the register row.

> 📌 **WRITTEN 2026-08-27 (end of session 69) FROM FOUR ITEMS ALI RAISED DIRECTLY.** Two of them
> already have their **root cause read off the code** and are recorded below with file:line, so
> nobody re-derives them. Two are genuinely open work.
>
> ⛔ **READ `docs/LIVE-QA-CAMPAIGN.md` §0 AND ITS TOPMOST `RESUME AT` FIRST.** That register
> outranks this file. This file is a work order; the register is the truth.
>
> ⛔ **AND PROVE THE MACHINE BEFORE THE FIRST EDIT** (§0d.3 of
> `docs/SESSION-PROMPT-BONUS-AND-CARE-DESK.md`):
> ```
> node -v                            # 24.x
> node scripts/live/ops/census.cjs   # must print ✅ MATCH
> npm run qa:personas                # 17/0
> npm run test:read-tiers            # 52/0
> git diff --stat HEAD@{1}..HEAD -- prisma/schema.prisma   # moved? then npx prisma generate
> ```

---

## §0 · WHAT CARRIES OVER, AND ONE OF IT IS A LIVE MONEY CONTROL

| # | Carried item | State |
|---|---|---|
| **0.1** | ✅ **`qa:bonus-j` LIVE DRIVE OF THE E-224 RE-LOCK — DONE** | ✅ **DONE 2026-08-27 (session 70) — `qa:bonus-relock` 33/0 ON PRODUCTION, AND THE INTERIM CONTROL IS LIFTED.** ⭐ **`settle`'s check 6 could not have done it: it fires only on a VOIDED round.** The new `relock` leg drives the refund ON PURPOSE through the FREE EXIT — grant 2,000×1 ACTIVE → one cash-funded 2,000 stake into an EMPTY live poll → FULFILLED at placement with `remainingTzs` preserved → free exit, full refund → grant **ACTIVE** again, `balance` and `bonusBalance` back to their opening figures **to the shilling**. Ledger group sums to 0, `bonus.relocked` shows `shortfall 0` and the expiry **moving forward**, and check 11 proves the predicates DISCRIMINATE by returning 4/4 FALSE on the pre-fix grant still sitting on production. 🔴 **Both failures in the first run were in the INSTRUMENT** — `payload::text` on `jsonb` renders `"shortfallTzs": 0` with a space. *(the original work order follows, and is superseded by the verdict above — it is kept because it carries the reasoning that chose the route)* ⛔ **DO THIS FIRST.** The code is shipped, guarded and deployed (`f0521356`), but **it has never run on production**, so by §0's own definition E-224 is not done. 🔴 **THE INTERIM CONTROL STANDS UNTIL IT DOES: approve NO proposal and grant NO bonus to a non-fleet account.** Four proposals sit in `REVIEW`; two are real players who both logged in on 2026-08-27. ⚠️ `sequentialBonuses` is `true` on production, so a fresh grant lands **QUEUED** behind an existing one and can never fulfil — cancel the stale grant and let `activateNextQueued` promote it. |
| **0.2** | ⛔ **STILL OPEN — THE ONLY ITEM IN THIS FILE THAT IS. Session 70 verified the blocker rather than repeating it: no `gh`, `GITHUB_TOKEN` and `GH_TOKEN` both ABSENT, no token in `.env.qa.local`. The SCRIPT is re-proven live (`qa:cert-expiry` 5/5, 48 days, both hosts, expiring Oct 15). The RUNNER is still unobserved. ▶ One click, or wait for Mon 2026-08-31 06:00 UTC.** ⚠️ **OBSERVE THE CERT WORKFLOW GO GREEN** | `.github/workflows/cert-expiry.yml` shipped in `57c44a26` and its script is proven (`qa:cert-expiry` 5/5 live, `red:cert-expiry` 3/3) — **but the RUNNER has never been observed executing.** ⛔ **That is the exact class of defect E-227 was about, so it is not closed until a green run exists in Actions.** ▶ One click: Actions → "Origin certificate watch" → Run workflow. Next scheduled run is **Mon 2026-08-31 06:00 UTC**. (`gh` is not installed on the `F:` machine and no `GITHUB_TOKEN` is present, which is why session 69 could not do it.) |
| **0.3** | ⭐ **ANSWERED 2026-08-27 (session 70) — `E-231`, and IT IS NOT MONEY TAKEN.** 34 of 38 failures carry `reconcile-verified-failed`, which our reconciler writes only after the PROVIDER confirmed the payment did not complete; the other 4 never got a reference at all. The books agree both ways (0 failed touched the ledger, 0 confirmed missing from it). ⭐ **The real finding is the amount band:** `DEPOSIT_MAX_TZS = 2_000_000` is advertised while M-PESA has never confirmed above TZS 50,000 here. ▶ One operator question settles it: the Selcom decline codes for the 34 references. ⛔ Do NOT enforce a guessed ceiling. **The original framing follows.** | 🔴 **THE DEPOSITS — still the largest measured thing on the board** | **52 CONFIRMED (TZS 646,000) against 38 FAILED (TZS 630,500) lifetime — 42% by count, 49% by value.** Last 7 days: **1 confirmed against 4 failed.** Nine genuine player accounts affected; **one player alone carries 4 failures totalling TZS 311,000.** ⛔ **NOT AUDITED, NOT ON ANY LEDGER, AND IT OUTRANKS EVERY ITEM IN THIS FILE.** First question is the only one that matters: **is this money taken and not credited, or abandoned pushes?** Read the provider failure reasons against the Selcom console. ⚠️ Separately `/api/health` reports `sms.provider: "console"` — **no real SMS has ever been sent**, so a player whose deposit failed was never told. |
| **0.4** | ⚠️ **TEN RED SUITES IN `test:all`, EIGHT OF THEM UNDOCUMENTED** | `test:all` is **253/263**. §0b says only `test:responsive` and `test:motion` are expected to fail without a server. The other eight are `test:payments` (23/24), `test:withdrawal` (28/5), `test:concurrency` (31/3), `test:type-scale`, `test:measure`, `test:kyc-workstation-time`, `test:reconcile-announce`, `test:admin-act-gate`. ⭐ **Proven pre-existing, not session 69's**, by swapping HEAD's copies of all six touched files back in and re-running: the three money suites returned **byte-identical counts**. 🔴 **Three are MONEY suites failing on `payout_destination_not_registered`.** Either they are fixture rot or the payout-destination rule is refusing something it should not — and nobody has looked. |
| **0.5** | ⏸️ **`E-226`** | ⛔ **NOT ready to build — blocked on TWO OWNER DECISIONS, not on the email test alone.** See the register row; four traps are recorded there, two of which would have made the platform worse. |
| **0.6** | 🟡 **`E-228`** | XRP `source-failed` refunds. Mechanism read off the code and filed. Priority **stays low** while no real player has bet Up & Down since 2026-08-22, and the fix is a money-path concurrency change. |
| **0.7** | ❓ **`Ocean Logo/`** | Still untracked — 2.6 MB of `.ai`/`.psd`, not referenced by anything (the mark is embedded as base64). **Commit as design source, or gitignore. Ali's call, unanswered.** |

---

## §1 · ⭐ ITEM 1 AND ITEM 4 ARE THE SAME BUG, AND IT ALREADY HAS A NAME IN THIS REPO

> ⛔ **CORRECTED BY MEASUREMENT: THEY WERE NOT THE SAME BUG.** Item 4 (the legal nav) was exactly
> as diagnosed here — fixed, RED 4/3 → GREEN 7/0 live — and the enumeration found **two more
> instances nobody had reported** (`E-229`). **Item 1 was not.** Four scenarios were driven on
> production with the soft navigation PROVEN each time and all four came back GREEN before any
> fix: a poll bet goes through a SERVER ACTION, whose response re-renders the tree from the root,
> so the layout DOES re-execute. What was genuinely broken there is different and smaller — the
> pill's freshness depended on side effects rather than on the money path emitting anything.

**Ali reported two things that look unrelated:**

> *"1 — The money amount in the top navbar is different from that inside the wallet page after
> playing a poll. Validate how they update. A massive bug."*
>
> *"4 — In the Legal and Responsible Gambling page, there is a Terms grid. No matter where we
> click, the highlighted tab is always Responsible Gambling."*

⭐ **THEY ARE ONE ROOT CAUSE: IN THE APP ROUTER A LAYOUT IS NOT RE-EXECUTED ON A CLIENT-SIDE SOFT
NAVIGATION.** It is preserved across route changes. Anything a layout computed on the last **hard**
load stays frozen while the user clicks around inside it.

⛔ **AND THIS REPO ALREADY KNOWS.** It is written down twice, both times as the explanation for a
bug Ali reported:
- `src/components/admin/admin-shell.tsx:210-221` — **E-70**, verbatim: *"`AppShell` (the root
  layout) decides whether to render the player chrome from the `x-pathname` REQUEST HEADER, and in
  the App Router a layout is NOT re-executed on a client-side soft navigation… Ali reported it
  twice; two sessions failed to reproduce it because they used `page.goto()`, which is a HARD load
  and re-renders the layout correctly."*
- `src/components/layout/avatar-menu.tsx:172` — the same note.

🔴 **READ THAT WARNING BEFORE WRITING A SINGLE PROBE. A DRIVER THAT NAVIGATES WITH `page.goto()`
CANNOT REPRODUCE EITHER OF THESE BUGS.** It must **click a real `<Link>`** and assert afterwards.
Two sessions have already been lost to exactly this, on exactly this class of defect.

### §1.1 · Item 4 — the legal nav. Diagnosis, with the line.

`src/app/legal/layout.tsx:29` — `const pathname = h.get("x-pathname") ?? "";` — then `:51`
`const active = pathname.startsWith(n.href);`

`x-pathname` is a **request header** set by the middleware (`src/proxy.ts:204`). The layout reads it
**once**, on the hard load. Clicking any of the four `<Link>`s in that same nav is a soft
navigation: only the page segment re-renders, the layout is preserved, and `pathname` still holds
whatever route the user first landed on. **So the highlight is not "always Responsible Gambling" —
it is "always whatever page you arrived on"**, and Ali arrives there via the responsible-gambling
link. ⭐ **Confirm that reading before fixing: land on `/legal/terms` directly and check whether the
stuck tab becomes Terms.** If it does, the diagnosis is exact.

⚠️ **`src/app/auth/layout.tsx:23` HAS THE IDENTICAL LATENT BUG** — same header, same pattern. Check
whether its nav is user-visible and fix both or neither, with a comment saying which.

**The fix is a client component using `usePathname()`** for the active state (the nav is four
links; there is nothing server-only about deciding which one is current). ⛔ **Do NOT "fix" it by
making the layout `force-dynamic`** — a layout is not re-executed on soft navigation *at all*, so
dynamism does not help, and it would cost every legal page its static render for nothing.

### §1.2 · Item 1 — the balance. Same shape, but it is MONEY, so it outranks item 4.

`src/components/layout/app-shell.tsx:102` — `balance: wallet?.balance ?? null` — feeds
`top-app-bar.tsx:204` → `WalletBalancePill`. **`AppShell` is the root layout chrome.** So the top
bar's balance is computed in a layout that a soft navigation does not re-run: place a bet on
`/markets/[id]`, and the page's own numbers refresh while **the pill keeps the balance from the last
hard load.** Navigate to `/wallet` and that page reads fresh — hence Ali's "different".

⛔ **VERIFY BEFORE BUILDING, BECAUSE THE PILL IS NOT INNOCENT EITHER.**
`wallet-balance-pill.tsx` is a `"use client"` component with a **600ms rolling counter** and an
800ms flash, and its whole docstring is about animating a *changing* prop. Two failure modes are
possible and they need different fixes:
1. **the prop never changes** (the layout is frozen) — fix the data path, and
2. **the prop changes and the tween lands on the wrong number** — fix the component.
▶ **Read the DB, then the DOM, then compare.** ⚠️ **`innerText` returns the full string whatever
the ellipsis paints** — and per this repo's own rule, a rendered number is never evidence of a
balance. Read `Wallet.balance` and assert the pill against it.

⭐ **THE LIKELY CORRECT FIX IS `revalidatePath("/", "layout")` — OR MAKING THE PILL READ ITS OWN
TRUTH.** There is already an `event-stream-provider.tsx` and a `/api/events` SSE channel in
`src/components/layout/`; a balance that is wrong in the chrome after every bet is a strong argument
for the pill subscribing rather than being handed a prop by a layout that cannot re-run. **Decide
between the two deliberately and write down why**, because this is the third bug of this exact
shape (E-70 was the first).

### §1.3 · The guard, and it must have a POPULATION

⛔ **A per-page assertion is not coverage here.** The rule is *"no layout-computed value may go
stale across a soft navigation"*, and the population is **every layout that reads `x-pathname` or
session/wallet state**. Today that is `app-shell.tsx:51`, `legal/layout.tsx:29`,
`auth/layout.tsx:23`, `admin/layout.tsx:102` — **enumerate them from the source, never from this
list**, and ratchet the count. ⭐ **Then prove it RED by reverting one fix**, and phrase every
assertion as the FIXED state so it does not invert when the bug is fixed.

---

## §2 · ITEM 2 — THE BREAK / FREEZE SYSTEM: A FULL AUDIT, NOT A BUILD

> ✅ **DONE — `docs/RG-AUDIT-2026-08-27.md`.** Every gate is wired (asserted at the CALL SITE);
> the WORDS were the defect (`E-232`, `E-234`); **a one-hour break was permanent** (`E-238`);
> and the harm sweep has no runner and cannot be scheduled as written (`E-235`). ⚠️ Q4's answer
> also found that `sessionTimeLimitMin` is **counted as a limit by the RG audit REPORT** and
> enforced nowhere — which makes that report wrong, not merely incomplete.

> *"Do a full check on the responsive playing and breaks and freeze system. Is it warning enough?
> Is it convenient with the theme UI kit? Is the logic missing? Fully integrated?"*

⭐ **MOST OF IT EXISTS — SO THE DELIVERABLE IS AN AUDIT WITH EVIDENCE, NOT A REWRITE.** Present
today in `src/lib/server/responsible-gambling.ts`: `setLimits` (:129), `selfExclude` (:210),
`coolOff` (:251), `isLockedOut` (:284), `checkDepositLimit` (:305), `checkLossLimit` (:350),
`getLimitUsage` (:388), `detectHarmMarkers` (:558), `detectHarmMarkersForAllUsers` (:587), plus
`SELF_EXCLUSION_PERIODS_SEC` (:38), `COOLING_OFF_PERIODS_SEC` (:46) and
`LIMIT_INCREASE_DEFERRAL_SEC` (:52). UI: `src/components/rg/` — `limit-usage.tsx`,
`reality-check.tsx`, `rg-confirm-submit.tsx`, `self-care-art.tsx`.

**Answer Ali's four questions, each with evidence, and in this order:**

1. **IS THE LOGIC MISSING — i.e. is every gate actually WIRED?** ⛔ **This is the question that
   matters and it is the one a green suite cannot answer.** For each of `checkDepositLimit`,
   `checkLossLimit` and `isLockedOut`: find every **call site** and every money path that should
   have one and does not. ⚠️ **Assert the CALL SITE, not the symbol** — that is this platform's
   recorded KYC-domain lesson. A function that exists and is never called is the same defect as
   E-226, and E-227, and E-224's DAL filter. ▶ **The house test: would this pass if the gate were
   deleted?**
2. **IS IT WARNING ENOUGH?** Read the copy a player actually sees on refusal, in **EN/SW/ZH**, at
   the moment each limit bites. ⛔ **Player surfaces never narrate ops.** ⚠️ And note that
   `sms.provider: "console"` means **no SMS warning has ever left the platform**, so any design
   that assumes an SMS reaches the player is fiction today.
3. **IS IT CONVENIENT WITH THE THEME UI KIT?** ⛔ **The design system is FROZEN and its one door is
   `docs/DESIGN_AUTHORITY.md`.** Extend the kit; never hand-roll. ⚠️ `reality-check.tsx` is a
   `"use client"` component that imports `SUPPORT_PHONE` from `@/lib/support-config` — **it reads
   the browser's own `globalThis`, so it can never see a server config value.** That is recorded
   under E-226 and it is a real defect in this component, not a theoretical one.
4. **FULLY INTEGRATED?** `detectHarmMarkersForAllUsers` — **is it scheduled, and has it ever run?**
   ⛔ **Apply E-227's lesson directly: a sweep that four documents describe and no runner invokes is
   the platform's most repeated defect.** Check `src/instrumentation.ts`, the lifecycle module, and
   `.github/workflows/` — and if it is unscheduled, say so as a finding with a number.

⛔ **And drive it at 360 / 393 / 768 / 1024 / 1280 × EN / SW / ZH. 360 is not optional and neither
is ZH.**

---

## §3 · ITEM 3 — THE INSTALL INVITATION. GENUINELY UNBUILT.

> ✅ **BUILT, GUARDED AND DRIVEN — `E-237`.** `qa:install-shown` **63/0** (3 languages × 5
> widths: no text escapes its box, the box is in the viewport, and it overlaps neither the bottom
> nav nor the balance pill — by rectangle arithmetic), plus first-visit-quiet, already-installed-
> silent, and money-surface suppression **with a control** proving suppression rather than death.
> ⭐ **The driver found a real 4px overflow in the card built to honour Ali's rule**, at every
> width and in every language, caused by negative margins on the dismiss button. Four pixels is
> invisible in a screenshot. ⛔ And `§3.3`'s cross-cutting rule is now a platform guard with a
> population walked from source — `test:popup-fit`, 56 popups, ratcheted (`E-236`) — which found
> the market title `line-clamp-2`'d inside the bet-confirmation dialog.

> *"We need a notification for first-time comers or on every open… If the user didn't add the web
> app to the home screen, invite them to do so, but in a non-disturbing way. Make it visually
> perfect, consistent with our theme kit, 100% functional, accurate. Responsive and visually and
> logically functional."*

**MEASURED STATE 2026-08-27:** `public/manifest.json` **exists**. `public/sw.js` **exists**.
`grep -rn beforeinstallprompt src/` returns **nothing** — there is no install prompt anywhere. So
this is new work on foundations that are already in place. ⛔ **Read the manifest first and confirm
it is actually installable** (name, icons at the required sizes, `start_url`, `display:
standalone`); an invitation to install an app the browser will refuse to install is worse than
silence.

### §3.1 · The mechanics differ per browser, and guessing one path gets it wrong

| Browser | Mechanism | What the UI must say |
|---|---|---|
| Chrome / Edge / Samsung (Android, desktop) | `beforeinstallprompt` fires → **stash the event**, show your own affordance, call `prompt()` on click | a real button that installs |
| **iOS Safari** | ⛔ **`beforeinstallprompt` NEVER FIRES.** There is no programmatic install. | **instructions**: Share → *Add to Home Screen*. A button that does nothing is a lie |
| Firefox (Android) | no `beforeinstallprompt`; menu-driven | instructions |
| Any, already installed | `navigator.standalone` (iOS) or `matchMedia("(display-mode: standalone)")` | ⛔ **show NOTHING** |

⛔ **DETECT "ALREADY INSTALLED" BEFORE ANYTHING ELSE, AND TEST IT.** Inviting a player who is
already inside the installed app to install it is the single most obvious way this ships broken —
and it is the case a desktop dev browser will never show you.

### §3.2 · "Non-disturbing" is a specification, so make it measurable

▶ **Ali said non-disturbing, so decide these and write the numbers down:** not on the first
paint of a first-ever visit (let them see the product first); dismissible; **a dismissal is
remembered** (`localStorage`, with a re-ask window — pick a number, e.g. 14 days, and state it);
never over a money control; never during a bet or a countdown. ⛔ **NEVER OVER THE BET BUTTON OR
THE BALANCE PILL** — this repo has already shipped a WhatsApp FAB sitting on top of a CTA, and
*only looking* found it. ⚠️ **A `localStorage` read can throw** (private windows, blocked site
data, thumbnail capture) — wrap every read and write in `try/catch` and render correctly with no
stored value.

### §3.3 · ⛔ ALI'S CROSS-CUTTING RULE, AND IT IS NOT SCOPED TO THIS ITEM

> *"In all popups and warnings, make sure no text gets out of its allocated location horizontally
> or vertically, no matter the amount of lines needed."*

**Treat this as a platform rule with a guard, not a note about one component.**
- ⛔ **`innerText` RETURNS THE FULL STRING WHATEVER THE ELLIPSIS PAINTS** — truncation is paint.
  **Assert a RECTANGLE**: `scrollWidth > clientWidth`, `scrollHeight > clientHeight`, and that the
  element's box is inside its container's box.
- ⛔ **AND "RENDERED" IS NOT "VISIBLE".** This platform shipped a component 119px below the fold for
  its whole life while every grep was green. Assert the rectangle is **in the viewport**.
- ⭐ **THE POPULATION IS EVERY POPUP AND WARNING IN THE APP, ENUMERATED FROM THE SOURCE** — modals,
  toasts, `ConfirmModal`, the RG refusals, the new install card, failure copy — **not a list
  written in this file**, which would go stale the day someone adds the fifth one. Ratchet the
  count.
- ⚠️ **The longest string wins, so the population includes LOCALES.** Swahili and Chinese are not
  the same length as English, and this repo's worst clipping bugs were **SW at 360**.

---

## §4 · ORDER OF WORK, AND WHY

1. **§0.1 — the `qa:bonus-j` live drive.** A live money control is standing because of it.
2. **§1.2 — the balance divergence.** It is money, it is visible on every screen, and Ali called it
   massive. Its root cause is already known, so it is cheap.
3. **§1.1 — the legal nav**, in the same commit as §1.2 if the fix is shared, since it is the same
   defect. Plus `auth/layout.tsx`.
4. **§0.2 — click the cert workflow** (30 seconds, closes E-227 properly).
5. **§2 — the RG audit.** Findings first; only then any code.
6. **§3 — the install invitation.** New surface, so it comes last of the four.
7. **§0.3 — the deposits.** ⚠️ **If there is any session where this jumps the queue, say so and
   jump it.** It is 49% of deposit value and nine real players, and nobody has looked yet.

⛔ **AND THE RULES DO NOT CHANGE:** never `git add -A` (a parallel session shares this checkout) ·
never pipe a gate through `| tail` · every push to `main` deploys **LIVE** · check
`prisma/schema.prisma` after a pull, not the lock file · docs updated in the **same commit** as the
code · a guard proven **RED first**, with a positive control in the same run · money position
**re-derived** at close, never quoted.
