> ⛔ **SUPERSEDED — historical record only.** This was a session handoff prompt; the live one is
> **`docs/LIVE-QA-CAMPAIGN.md` §6b, the topmost `RESUME AT` block**. Kept because other documents
> cite it, not because anything in it is current. Do not act on it.

# NEXT SESSION — the whole flow, driven live and fixed

**Written 2026-08-05 at the end of session 26.** This file *is* the prompt: paste the fenced
block below into a fresh session. Everything it needs is either in the block or reachable from it.

Status when this was written: `main` @ `5a6ca32a`, all 27 Up & Down suites green, `test:docs`
green, production healthy, **the Up & Down board is empty by design** (4 assets, 0 chains,
0 rounds), QA wallets alpha **61,540** / echo **24,010**, no money frozen anywhere.

---

```
Work in F:\kipindi-main on branch main. This is 50pick (the repo is named kipindi;
the product is NEVER called kipindi). Production is https://50pick.tz, Railway
project 50pick. EVERY PUSH TO MAIN DEPLOYS LIVE.

MANDATE: full rights over the live DB, Railway and the deploy pipeline. Live data
is disposable. Twelve Data credits and AI tokens are authorised — spend them. Money
on production is the admin/testing team's, not customers'. Ali's console login:
/auth/admin, phone 777777777, password in .env.qa.local as QA_ADMIN_PASSWORD. QA
players alpha (712000101) and echo (712000105) are in the same file, as are the
COMPLIANCE / TRADING / GROWTH / FINANCE officers. Everything else regenerates —
see docs/LIVE-QA-CAMPAIGN.md §1.

GOAL: DRIVE THE WHOLE FLOW LIVE AND FIX WHAT IS BROKEN. Not a suite — a real
browser, on production, as a real person. Create, resolve and play Up & Down by our
own rules; drive the login flows; walk the admin dashboards. Anything inconsistent
in a button, a form, a filter, a table or a piece of copy: FIX IT, guard it, push
it, verify it live.

READ FIRST, in this order:
  1. docs/LIVE-QA-CAMPAIGN.md — §0 (standing rules), then §6as/§6ar/§6aq/§6ap
     (what session 26 shipped and drove), then the RESUME AT marker in §6b.
  2. docs/50pick-updown-operator-guide.pdf — THE CONTRACT. §8.5 is the Feed record
     and the measured round-length gate, §10 is the six refund reasons and what to
     say to a player, §13 is every element of the player's card and when it shows,
     §14 is HOW TO TEST EACH OUTCOME ON PURPOSE — follow §14, it was written for
     exactly this session.
  3. .claude/skills/50pick-standards/SKILL.md

⭐ START HERE — THE BOARD IS EMPTY ON PURPOSE. 4 assets (BTC · ETH · SOL · XAU),
0 chains, 0 rounds, 0 observations, so every asset reads "no readings yet". Build
it back yourself from the guide's §9, because doing so IS the first test:
  1. Create a BTC 5m chain, band "Smallest possible", start it.
  2. Generate/await rounds, play BOTH sides as alpha and echo, and pair wallet +
     ledger + DB row TO THE SHILLING on a win and on a loss.
  3. Then work §14 of the guide: force a no-move refund (widen the band to 0.50%,
     restore it after), a one-sided refund (one side only), and an operator void
     (Rounds → Void & refund, with a real reason). Each must state its REAL reason
     on the card, the round page, the settlement proof, the push and the inbox — in
     EN, SW and ZH.
  4. Watch the Feed record fill in from "no readings yet" to a real % and lag. That
     is the measured gate learning the asset; confirm the Add-chain duration list
     changes with it.
  ⛔ market-shut gold is ONLY reachable Fri 21:00 → Sun 22:00 UTC. If it is a
     weekday, say so and skip it — do not fake it and do not claim it from a suite.

THEN, THE REST OF THE FLOW — drive it, do not read it:
  · LOGIN: register a new player, verify the email, sign in by phone AND by email,
    wrong password, locked account, self-excluded, password reset, staff sign-in at
    /auth/admin. ⚠️ Every failed email sign-in costs a real account one of its five
    lives — never loop.
  · ADMIN DASHBOARDS: every page under /admin. Overview, Live ops, Insights,
    Settlement, Finance, Reports, Payments ops, Transactions, Roster, Cohorts,
    Event calendar, AI poll generation, AI candidates, Player proposals, Curation
    queue, Resolver queue, Sources & categories, Rates & fees, Up & Down, Rounds,
    Objections, Staff, Roles. On EACH: does every button do what it says, does
    every form refuse what the server refuses (and say why), does every filter and
    date range actually filter, does every grid page and sort, does every empty
    state read like a sentence a person wrote.
  · THE PLAYER SIDE: board, round page, positions, wallet, deposit, withdraw,
    history, inbox, profile, KYC, responsible-gambling controls.
  · CONSISTENCY: buttons of the same kind must look and behave the same; a
    "Cancel" must always cancel; a destructive action must always confirm; a
    disabled control must always say WHY. Fix drift in the KIT, never per page.

STANDARDS — these are not optional:
  · One fix, one guard PROVEN RED FIRST, docs updated in the SAME commit, one push,
    one production verification. Never batched.
  · Judge a process by its EXIT CODE, never by grepping output.
  · Before writing a check ask: "would this still pass if the feature were absent?"
    Session 26 wrote SIX checks that would have. Pin the property, not the wording.
  · A green suite is not a readable screen. Take the screenshot and LOOK at it.
  · Update docs/LIVE-QA-CAMPAIGN.md §6 (findings, with evidence) and §6b (where the
    next session resumes) in the same commit as the change.
  · npm run test:docs now checks that every screenshot a doc CITES exists. If you
    cite evidence, commit it under shots/<FINDING>/.

⛔ TRAPS THAT COST REAL TIME — do not re-learn these:
  · THIS LAPTOP'S CLOCK IS ~93 SECONDS SLOW. Never time-reason from new Date();
    take the instant from the DB (select now()), the HTTP Date header, or a row the
    server wrote.
  · A DB read gives you the STATE, not the REASON. Open the real console page
    before filing a defect from rows alone.
  · ::text-cast every timestamp in SQL (node-postgres shifts naive timestamps).
  · A ROUND FREEZES ITS SETTINGS AT OPEN. Change a band and the running round keeps
    the old one — watching the wrong round is the commonest reason a control looks
    broken when it is not.
  · clickByName() is PAGE-WIDE and takes .first(). On a grid where every row has its
    own Start/Void, a confirm click after a row click lands on the NEXT ROW. Scope
    every confirm to [role=dialog] — and the void modal is role="alertdialog".
  · networkidle NEVER fires on /updown (it polls); domcontentloaded returns while
    the page is still skeletons. Wait for the round's own numbers.
  · page.screenshot() does NOT wait for animations — it will photograph an opaque
    modal as see-through. Wait for document.getAnimations() to go quiet.
  · ONE BROWSER CONTEXT PER PERSONA, or an admin cookie makes /auth/login redirect
    and the missing field reads exactly like a broken login page.
  · Never assert a word the control itself supplies (a row containing "Void" may
    just be the button's label). Assert the OUTCOME.
  · Do NOT write an image mime with a wildcard in a code comment — test:cert-d2
    strips comments naively.
  · Re-run a red gate ALONE before believing it: test:trilingual gives a false red
    under parallel load; test:all only exceeds a 180s cap.
  · npm run start runs `prisma migrate deploy` — never point it at prod.
  · Stopping a chain REQUIRES the confirm dialog; skipping it looks like a dead
    button. Every boundary spends real provider credits — leave chains STOPPED when
    you finish.

⚠️ ONE DECISION STILL WAITING FOR ALI (§6ap): the previous handoff said to delete
Solana's hardcoded cautionBelowMinutes now that advice is derived from measurement.
I did not — SOL's caution is price-scale arithmetic and gold's floor is bar-seam
arithmetic, and UpDownObservation measures neither. Measurement ESCALATES ONLY. Ask
Ali; it is a two-line change either way.

STATE ON HANDOVER: main @ 5a6ca32a. All 27 Up & Down suites green, test:docs green,
production healthy. Board: BTC · ETH · SOL · XAU, 0 chains, 0 rounds, 0
observations, no money frozen. QA wallets alpha 61,540, echo 24,010. Session 26
shipped E-84 (the advisory would have blocked Bitcoin at every duration), E-85, E-86
(the platform re-read its metered provider ~6x/second and voided the rounds it could
not price), E-87 (a decided round labelled a void) and E-88 — all guarded RED-first
and verified live.
```

---

## Why this session exists

Session 26 proved the engine and the money on a handful of rounds. What has **never** been done
in one pass is the *whole* product: sign-up through to settlement, and every admin screen that
governs it, driven by a person rather than a suite. The three defects that cost the most this
campaign — E-83, E-86 and E-75 — were all invisible to a green test run and obvious within
minutes of driving the real thing.
