# SESSION PROMPT — build MASWALI MILLIONEA

**Programme key: `MASWALI-BUILD`** — quote it in every commit and handoff so any session, on any
machine, knows which programme it is inside. Owner: Ali.

> ## STATUS: 🔴 **BLOCKED — AND ONLY ON D-1.**
>
> **Six of the seven §0 decisions were answered by Ali on 2026-08-29 and are recorded in
> [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md).** The seventh, **D-1 — does the Gaming
> Board licence cover a fixed-stake multi-event jackpot? — is unanswered, and it blocks every
> line of code.** It is not a technical question and no amount of engineering answers it.
>
> ⛔ **Do not start S1 until D-1 is answered in writing.** If it comes back negative this plan
> stops and nothing is lost — which is precisely why the design was bounded to the four things no
> §0 decision can change, and why nothing has been built.

---

## ▶ START HERE — the whole programme, in reading order

⭐ **THIS FILE IS THE ONE DOOR. The files below stay where they are, and that is deliberate** —
see [§7](#7--why-this-is-one-door-and-not-one-folder). Read them in this order:

| # | File | What it is |
|---|---|---|
| 1 | **this file** | the build plan, the chunks, the tracker |
| 2 | [`MASWALI-MILLIONEA-IMPLEMENTATION.md`](MASWALI-MILLIONEA-IMPLEMENTATION.md) | ⭐ **the authority.** The full evaluation: §0 decisions · §3 fifteen gaps · §4 money model · **§5 solvency, the most important section** · §6 data model · §7 settlement algorithm · §10 admin/RBAC · §12 design · §14 the checks that would lie · §15 the sessions |
| 3 | [`design-brief/maswali-2026-08/handover/README.md`](design-brief/maswali-2026-08/handover/README.md) | ⭐ **the delivered design** — four artboard sets, filed 2026-08-28. Frame index + acceptance self-check |
| 4 | [`design-brief/maswali-2026-08/handover/DECISIONS.md`](design-brief/maswali-2026-08/handover/DECISIONS.md) | every design decision and why — incl. the gold-vs-mono verdict |
| 5 | [`design-brief/maswali-2026-08/handover/OPEN-QUESTIONS.md`](design-brief/maswali-2026-08/handover/OPEN-QUESTIONS.md) | ⚠️ **nine asks the design could not settle** — read before S5 |
| 6 | [`design-brief/maswali-2026-08/handover/TOKENS-USED.md`](design-brief/maswali-2026-08/handover/TOKENS-USED.md) | every token the design references, by surface |
| 7 | [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) | ⛔ §0 before writing ANY design value, anywhere |
| 8 | [`RULES.md`](RULES.md) | 🟢 the money law. §1 (the fee) and §2.2 (TRA + GBT) are the ones this product touches |
| 9 | [`SESSION-PROMPT-MASWALI-DESIGN.md`](SESSION-PROMPT-MASWALI-DESIGN.md) | ⚪ RECORD — how the design round was run and received |
| 10 | [`design-brief/maswali-2026-08/BRIEF.md`](design-brief/maswali-2026-08/BRIEF.md) | ⚪ RECORD — **what was commissioned and why the boundary was drawn there.** Needed to judge whether the delivery matched, and to cut a round 2 |
| 11 | [`design-brief/maswali-2026-08/PROMPT.txt`](design-brief/maswali-2026-08/PROMPT.txt) | ⚪ RECORD — the prompt actually sent. ⛔ Lives **only** here; a commission is never re-sent from a kept snapshot |

**The design's working sources** (living artboards, editable — a round 2 edits rather than
redraws): `design-brief/maswali-2026-08/handover/sources/` — `A-slip.dc.html`, `B-receipt.dc.html`,
`C-money-figure.dc.html`, `D-tier-glyphs.dc.html`. The **rendered frames** are in
`handover/artboards/` and the **three tier glyphs** in `handover/glyphs/` as stroke SVGs.

---

## 1 · §0 — the seven decisions, and where they stand

| | Decision | Answer | When |
|---|---|---|---|
| **D-1** | Does the Gaming Board licence cover a fixed-stake multi-event jackpot? | 🔴 **OPEN — BLOCKS EVERYTHING** | — |
| **D-2** | Is the TZS 20,000,000 guarantee real, and who funds it? | ✅ **Progressive only. No fixed guarantee.** | 2026-08-29 |
| **D-3** | 13% of what? | ✅ **13% of losing stakes** — one fee law across three products | 2026-08-29 |
| **D-4** | What does a VOID question do to a ticket? | ✅ **Void counts CORRECT. 3+ voids ⇒ the whole cycle voids and every ticket refunds in full.** | 2026-08-29 |
| **D-5** | Can bonus money buy a ticket? | ✅ **No, for v1. Real balance only**, with an explicit message-bearing refusal | 2026-08-29 |
| **D-6** | How many tickets per player per cycle? | ✅ **Capped. Config-driven, default 10**, enforced in the purchase path and stated on the slip | 2026-08-29 |
| **D-7** | `/maswali` or `/millionea`? | ✅ **`/millionea`**, nav label **"Millionea"**, headings *Maswali Millionea*, module names stay `maswali-*` | 2026-08-29 |

⚠️ **D-7 IS A RENAME AND IT MUST HAPPEN BEFORE S1, NOT AFTER.** §15's own words: one find-replace
before S1, *"painful after"*. The implementation doc's S5 work items are written as `/maswali`,
`/maswali/[cycleId]`, `/maswali/tickets` — **those become `/millionea/…`**. ⛔ The *module* names
(`maswali-dal.ts`, `maswali-tier-label.ts`) do **not** change; only the ROUTE and the LABEL.

⚠️ **D-2 has a consequence the design already anticipated:** with no guarantee, the hero states the
pool in the law-3 third-person form and the figure is neutral mono ink, not gilt. The delivered Set
C settles that argument with a picture. **D-2 also leaves the guarantee-variant hero undrawn** —
`OPEN-QUESTIONS.md` #1 — which is correct, because that screen is now not being built.

---

## 2 · The money, as production actually runs it

⛔ **These are MEASURED from the live database read-only on 2026-08-29, not copied from the
proposal.** Anything in the proposal that disagrees is wrong.

```
market.config.global
  feeModel                    loser-share        ← D-3 is already the platform's configured law
  commissionRate              0.13
    operatorFeeRate           0.10
    platformFeeRate           0.03               ← 0.10 + 0.03 = the 13%
  feeCeilingRate              0.333
  minStake                    1,000
  maxStake                    1,000,000
  traTaxOnCommissionRate      0.10   ┐ statutory, ON the fee
  gbtLevyOnCommissionRate     0.05   ┘
  withdrawalFeeRate           0.015
  thinProfitRatio             1.1
  objectionWindowHours        24
  starterBalanceTzs           0
```

**So the operator's NET on a 2,000-ticket week** (TZS 2,000/ticket, 40 tickets finish in a tier):

```
losing stakes                    TZS 3,920,000
commission 13%                   TZS   509,600
  − TRA  10% of the fee          TZS    50,960
  − GBT   5% of the fee          TZS    25,480
operator NET                     TZS   433,160   = 11.05% of losing stakes
```

⭐ **The implementation doc already gets this right** — §2.2/§4 state *"Of every TZS 260, 26 goes
to TRA and 13 to GBT; the operator keeps 221."* This section exists so the next session does not
re-derive it, and so nobody plans against a 13% that was never retained.

⛔ **THE LEVIES ARE REAL LEDGER MOVEMENTS, NOT A LABEL — AND THE ACCOUNTS ALREADY EXIST.**
`levySplit()` in `payout.ts` computes the split; settlement books it as three separate credits.
`HOUSE:TRA_LEVY` and `HOUSE:GBT_LEVY` are already defined in
[`ledger.ts`](../src/lib/server/ledger.ts) (lines 16–17, 177–178), so **S1 does not create them** —
it creates only the four Maswali-specific house accounts. §7's settlement group is:

```
CREDIT HOUSE:COMMISSION     + F − TRA − GBT
CREDIT HOUSE:TRA_LEVY       + TRA
CREDIT HOUSE:GBT_LEVY       + GBT
```

⚠️ **This corrects a wrong line that stood in this file for one commit** (it said the levies were
recorded but not moved, and told S1 not to add a second movement — which would have contradicted
§7 and left two accounts unposted). ⛔ **Assert conservation PER COMPONENT** — fee, TRA, GBT, each
tier, each rollover — not on the total: §14 names a total-only check as one of the instruments
that would go green while a component is wrong.

---

## 2b · WHEN YOU SAY GO — the pre-flight, in order

⭐ **Everything needed is in this file or linked from it. There is nothing to hunt for.**

**0 · The gate.** D-1 answered in writing and appended to
[`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md). ⛔ If it is negative, stop — that is the
plan working, not failing.

**1 · The D-7 rename, FIRST, before a single line of S1.** ⭐ **MEASURED 2026-08-29, not
estimated: `src/` contains ZERO Maswali files — nothing is built — so today the rename is 94
route occurrences across 7 documents and nothing else.** §15 calls it *"one find-replace before
S1, painful after"*, and the reason it becomes painful is that the moment S1 writes a route, a
config key or a nav entry, the same rename starts touching code, tests, three locale dictionaries
and every doc that links them.

⛔ **THE TRAP, AND A BLIND `sed` WALKS STRAIGHT INTO IT.** There are **36 occurrences of
`maswali-2026-08`** — the design-commission FOLDER — and they are not routes. Renaming them
moves the filed handover, breaks every link to it, and `npm run test:docs` will go red across the
board. **Rename the ROUTE only:**

```bash
# route-shaped occurrences only — never the maswali-2026-08 folder path
grep -rlE "/maswali" docs/ | xargs grep -l . | while read f; do
  # inspect before replacing; the folder path must survive untouched
  grep -nE "/maswali" "$f" | grep -v "maswali-2026-08"
done
```

⛔ **Module names do NOT change** — `maswali-dal.ts`, `maswali-service.ts`, `maswali-score.ts`,
`maswali-config.ts`, `maswali-tier-label.ts` stay as the implementation doc writes them. Only the
**route** (`/maswali…` → `/millionea…`) and the **nav label** move.

✅ **Done when:** `npm run test:docs` is green, `grep -rn "/maswali" docs/ | grep -v maswali-2026-08`
returns nothing, and the 36 folder references are byte-identical to before.

**2 · Re-read the two sections that decide the shape of everything after them** —
`MASWALI-MILLIONEA-IMPLEMENTATION.md` **§5** (solvency: why there is no guarantee) and **§7** (the
settlement algorithm, which is what S2 and S3 implement).

**3 · Then S1**, and only S1. ⛔ **Do not run the chunks "all at once" in the sense of skipping the
gates.** Each chunk's acceptance line is a real measurement — `trialBalance()` clean, drift
*exactly* 0, a 200-ticket cycle settled on a real database — and §15's standing rule is explicit:
**do not start a session before its predecessor's tests are green and its acceptance line is met.**
Running them back to back in one sitting is fine and expected; running them without stopping at
each acceptance line is how a money bug reaches S8 wearing nine green suites.

⚠️ **This machine can drive it:** `QA_ADMIN_PASSWORD` is now in `.env.qa.local`, and the local
Postgres recipe for S3's "on a local database" acceptance is in the dev/QA notes —
⛔ **never point a destructive drive at production.**

---

## 3 · The chunks — nine sessions, in order

⛔ **§15's standing rule: do not start a session before its predecessor's tests are green and its
acceptance line is met.** Every session ends with something demonstrable.

| # | Chunk | Deliverable | Acceptance — how you know it is done |
|---|---|---|---|
| **S0** | **The decisions — Ali, not code** | §0's seven answered in writing in `COMPLIANCE-DECISIONS.md` | 6 of 7 recorded. 🔴 **D-1 outstanding.** Not a coding session |
| **S1** | Law, config, accounts, schema | The rule exists, the money has somewhere to live, the tables exist. **No behaviour yet.** `RULES.md` §1 row + new §2.10; config; four house accounts; Prisma schema | `prisma migrate deploy` clean against a copy of production · the four house accounts return **0** from `ledgerAccountBalance()` · `trialBalance()` clean |
| **S2** | The cycle engine — **no UI** | A cycle can be created, opened, locked, resolved and settled **by calling functions**. `maswali-dal.ts` + lifecycle | A full cycle runs end to end in the in-memory store with **money-conservation drift of exactly 0** · `test:maswali-engine` ≥ 50 assertions |
| **S3** | The money path | Real shillings move, **through the code that already works** — ticket purchase rides `buyPosition`, not a new bet path | On a local database, a **200-ticket cycle** settles with three tiers, one rollover, **drift 0**, trial balance clean · `test:maswali-money` |
| **S4** | Admin console | Ali runs a cycle weekly **without a developer**, and the ceremony does not decay into rubber-stamping (the naive version costed ~70 fields + 20 signatures/week) | A `trading` officer creates→populates→opens→seals without a terminal · an `accounting` officer settles · a `support` officer sees the locked state |
| **S5** | Player surfaces | Find it, understand it, buy a ticket, see what you hold. **This is where the delivered design lands** | A real browser drives sign-in → the slip → confirm → receipt → the ticket at `/positions` **and** in the tickets list |
| **S6** | Fairness, notifications, reports, copy | Provable, talks to players, appears in the books. `/fairness` publishes `ticketSetHash` + count + lock time | A settled cycle appears in the monthly statutory pack with figures equal to `ledgerAccountBalance()` **to the shilling** |
| **S7** | Adversarial hardening | Break it on purpose first. Void combinations 0–10 × tier thresholds × the cycle-void floor; rollover chains | Every finding fixed **or** recorded in `FAILURE-INVENTORY.md` with a decision · `red:maswali-*` controls per guard |
| **S8** | The live drive | ⭐ **"Verified" means EXECUTED. A grep is not a chain; a seeded row is not a flow.** Production, real money, small figures | A written drive record in `docs/` with the cycle id, the figures and screenshots — the Up & Down round #267 standard |

### The suites each chunk must create — name them, and they are in the pipeline

⭐ **`test:all` auto-discovers every `test:*` script**, so a suite named `test:maswali-…` is
covered by the pipeline the moment it exists. `e2e:` and `red:` are run explicitly.

| Chunk | Suites it must add |
|---|---|
| **S1** | `test:maswali-law` · `test:maswali-config` — and `test:money-invariants`, `test:fee-model`, `test:loser-share-fee`, `test:rate-copy`, `test:dead-schema` must stay green, which is how the two existing products are *proved* untouched |
| **S2** | `test:maswali-engine` (≥ 50 assertions) · `red:maswali-engine` — proven RED four ways: remove the question freeze, remove the second signature, remove the exactly-once gate, remove the void floor |
| **S3** | `test:maswali-money` · `e2e:maswali-money` · `test:maswali-cap` · `e2e:maswali-fault` · `test:concurrency` |
| **S6** | `test:maswali-fairness` · `test:maswali-reporting` — ⭐ *report == ledger, or the test fails* |
| **S7** | `test:maswali-adversarial` · a `red:maswali-*` control **per guard** |

⛔ **`e2e:maswali-money` DRIVES a purchase — it must never seed a ticket.** A seeded row proves the
table accepts a write; it proves nothing about the purchase path, which is where the
self-exclusion, cool-off, daily-loss-limit and bonus refusals live.

⛔ **`test:maswali-cap` must hold under CONCURRENT purchases** — the count and the insert in one
transaction, or two simultaneous buys both pass a check that was true when each read it.

### Tracking — tick here, and push in the SAME commit as the work

| Chunk | Status | Commit | Acceptance met on |
|---|---|---|---|
| S0 decisions | 🟠 6/7 — **D-1 open** | `—` | — |
| S1 law, config, schema | ☐ | — | — |
| S2 cycle engine | ☐ | — | — |
| S3 money path | ☐ | — | — |
| S4 admin console | ☐ | — | — |
| S5 player surfaces | ☐ | — | — |
| S6 fairness + reports | ☐ | — | — |
| S7 adversarial | ☐ | — | — |
| S8 live drive | ☐ | — | — |

---

## 4 · Gates — every chunk, every time

```
npx tsc --noEmit
npm run test:maswali-*          (the suites that chunk added)
npm run test:i18n               three languages, key parity — the slip ships in Swahili
npm run test:labels
npm run test:ui-consistency · test:design-frozen · test:contrast · test:tokens
npm run test:docs               every link in docs/ must resolve
npm run test:all                the whole pipeline before any push
```

⛔ **A gate that chooses its own population cannot fail.** `test:all` auto-discovers every
`test:*` script, so a new suite is in the pipeline by construction — name it `test:maswali-…` and
it is covered. **A gate not in the pipeline is not a gate.**

---

## 5 · Traps this product has already paid for — do not re-pay

- ⛔ **`main` deploys LIVE.** Check the branch before every commit. Never `git add -A`.
- ⛔ **D-6's cap is enforced in the PURCHASE PATH, never only in the UI.** A cap a client can skip
  is not a cap, and this one is an arbitrage hole: 1,024 combinations × TZS 2,000 = **2,048,000
  guarantees the top prize**.
- ⛔ **D-5's refusal must carry a MESSAGE** (§2.9 failure-message standard). `buyPosition` will
  spend bonus balance unless explicitly told not to — a silent omission reads as a broken balance.
- ⛔ **D-4 is one ruling on TWO surfaces:** the slip's rules strip *before purchase*, and the
  receipt's ten rows + score line.
- ⛔ **Design: no gold on the jackpot figure.** Gold means *earned* on this platform, and an
  unwon pool is the most unearned number it will ever show. Set C exists to settle that argument
  with a picture rather than prose. Gilt is correct on an armed money-commit button and on a
  settled payout — nowhere else.
- ⛔ **No count-up ticker (Law 7). No sub-brand (B9/M8).** Millionea does not get an identity that
  sits *beside* the 50pick mark; it merges into the system.
- ⛔ **The loss receipt is the 560 RECEIPT tier, not the 1080 reading tier**, and carries **no
  celebration vocabulary** — 99% of tickets lose, so it is the highest-traffic screen in the product.
- ⚠️ **Swahili is the design language, and the budget is measured:** fit short labels at 1.75×,
  prove at 2.25×; prose needs no extra room (median 1.009). Expansion here is a **label** problem,
  not a paragraph problem.
- ⚠️ **The tier glyphs render at 9–18px (mode 14), drawn on a 24 grid.** Legibility was proven at
  14px, not 24.
- ⚠️ **1024–1279 is the degraded band.** A top-level "Millionea" nav link re-breaks it — the band
  already survives by subtracting two controls. `OPEN-QUESTIONS.md` recommends it lives under
  "more" below 1280.
- ⚠️ **Read [`#14 the checks that would lie`](MASWALI-MILLIONEA-IMPLEMENTATION.md) before writing a
  test for this product.** It is a list of green instruments that prove nothing here.

---

## 6 · Still open, and who owns it

| Owner | Item |
|---|---|
| 🔴 **Ali / the Board** | **D-1, the licence class.** Blocks everything |
| **Ali** | `OPEN-QUESTIONS.md` #9 — which bottom-rail slot yields to Millionea (a product call, not a design one) |
| **Ali** | `OPEN-QUESTIONS.md` #5 — whether the rollover line belongs on a **loss** receipt, or reads as an inducement |
| S1 | `OPEN-QUESTIONS.md` #8 — whether `--success-*` genuinely aliases the YES ramp in the live repo, or the hue-166 family exists. **Law 6 says SUCCESS IS NOT YES**; until answered the ✓ marks ship in the YES hue |
| S2 | `OPEN-QUESTIONS.md` #4 — the ticket serial is minted at payment, so the slip prints none before purchase. Confirm |
| S6 | `OPEN-QUESTIONS.md` #6 — a B11 status-tone row for Maswali ticket words. ⚠️ player-side RESOLVED = struck gilt would put **gold on a losing ticket's row** |
| S5/S6 | `OPEN-QUESTIONS.md` #7 — final Swahili strings belong to the dictionary and the label modules; the handover's copy is representative and measured, not final |

---

## 7 · Why this is one DOOR and not one folder

Ali asked for everything in one place. **This file is that place** — but the files themselves stay
where their filing law puts them, and moving them would be the bug, not the tidy-up:

- `DESIGN_AUTHORITY.md` **§0a** — *one fact, one home.* Two copies never stay equal, and the stale
  one is always the one somebody reads.
- **§0b** gives the design delivery its own home, and that row is not advisory: it is what
  corrected this session when it was about to file the handover in the wrong place.
- **9 documents already link** to `MASWALI-MILLIONEA-IMPLEMENTATION.md` and
  `SESSION-PROMPT-MASWALI-DESIGN.md`. `npm run test:docs` checks every one of them.
- §0's own warning: *"without it, the next design document gets written somewhere new and the maze
  rebuilds itself in a month."*

**So: one door, many rooms.** If you are looking for anything to do with this product, it is
listed in [▶ START HERE](#-start-here--the-whole-programme-in-reading-order) above.
