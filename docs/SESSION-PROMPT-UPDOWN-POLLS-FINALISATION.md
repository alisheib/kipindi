# SESSION PROMPT — FINALISE THE TWO GAMES: POLLS + UP & DOWN, ADMIN → PLAYER → RESOLUTION

**Paste this whole file as your opening prompt.** Repo on this machine: `C:\kipindi-main`, branch
`main`. ⚠️ **Every push to `main` deploys LIVE to `https://50pick.tz`.**

Commissioned by Ali, 2026-08-15.

---

## §0 · ⛔ READ THIS FIRST — YOU ARE ONE OF **TWO** SESSIONS RUNNING RIGHT NOW

A second Claude session is working **this same clone, at the same time**, on **design Batch 6**
(the `/markets` mobile filter sheet + the market-detail chart's time-range buttons). It started
first. You cannot see it and it cannot see you, so every collision below is **silent** — you find
out by losing work, not by an error.

### The file split. Stay on your side of it.

| Owned by the OTHER session — ⛔ do not edit, do not stage | Owned by YOU |
|---|---|
| `src/components/markets/discovery-bar.tsx` | everything under `src/components/updown/**` |
| `src/components/markets/menu-shell.tsx` | `src/app/updown/**` · `src/app/admin/updown/**` |
| `src/components/ui/filter-pill.tsx` | `src/lib/server/updown-*.ts` · `src/lib/updown-*.ts` |
| `scripts/filter-language*.{mts,mjs}` · `scripts/live-discovery-board.mjs` · `scripts/discovery-board-probe.mjs` · `scripts/tap-hit-test.mjs` · `scripts/filter-stress.mjs` | `src/components/markets/conviction-dial.tsx` · `bet-confirm-modal.tsx` · `operation-result-modal.tsx` |
| `design-brief/**` | `src/app/admin/resolver-queue/**` · `src/app/admin/markets/**` |
| **In `globals.css`: the `.pchart-range*` block (~line 2600) and the `.kp-fchip` / `.kp-fopt` / `.kp-strip-fade` / `.kp-menu` block (~line 2700–2780)** | **In `globals.css`: everything else — append new rules at the END of the file, never inside their blocks** |
| `docs/SESSION-PROMPT-RATES-SESSION-4.md` | **this file** — commit it with your first commit |

### The four rules that make two sessions survivable

1. ⛔ **NEVER `git add -A` / `git add .`** — measured 2026-08-06: a parallel session's `git add -A`
   swept six of another session's in-flight files into its own commit and pushed them **without
   the four that make them compile**. `main` was broken for 19 minutes. **Stage by explicit path:**
   `git add <path>` then `git commit -F msg -- <paths>`.
2. ⚠️ **`main` moves under you.** `git fetch origin` and re-read
   `git rev-list --left-right --count origin/main...HEAD` **immediately before every commit**.
   If they pushed, rebase/merge and re-run YOUR tests before pushing.
3. ⚠️ **Shared `:3000` / `:3009` and ONE database.** Check `netstat -ano | grep LISTENING | grep :300`
   before booting a dev server; pick a free port (`:3011` is yours by convention this session) and
   kill only your own PID. Say what you are about to seed before you seed it — the other session's
   app reads the same rows.
4. ⚠️ **A shared register means shared ids.** Re-grep finding ids (`E-…`, `UD-…`) at the moment you
   file one, not at the start of the session.

### ⛔ AND: DO NOT COME BACK UNTIL IT IS FULLY DONE

Ali's instruction to both sessions, verbatim in intent: **neither session reports back until its
whole scope is finished, tested, verified live, documented, committed and pushed.** No partial
hand-offs, no "here's what I found so far, shall I continue?", no stopping to ask whether to keep
going. If you hit something genuinely blocking, finish **everything else in full** first, then say
exactly what is blocked and why.

---

## §1 · STANDING AUTHORISATION — in force, do not re-ask

Ali granted this and has not withdrawn it. It covers this whole session, **on production**.

| Asked | Granted |
|---|---|
| Mint test data on production without stopping to ask | ✅ **ALL OF IT** — players, polls/markets, Up & Down assets and chains, bonus grants, invite/share tokens, credited test wallets |
| Create a temporary Up & Down asset/chain on the LIVE board to force a state | ✅ yes — name it obviously, retire it, say so in the commit |
| How much real money may move through QA-fleet wallets | ✅ **NO CAP** |
| API keys / tokens / CLI access | ✅ use them all — Railway CLI, Anthropic key, Selcom, Postmark, the QA personas |

⭐ **If a rule or a state cannot be proven because it does not exist, CREATE IT.** That is how the
VOID case, the bonus rules and poll settlement were closed in earlier sessions.

⛔ **And mint a real fleet, not two players.** The production fleet is `fleet:01`–`fleet:20`; an
index past 20 is a valid-looking phone with **no account**, and the sign-in failure is
indistinguishable from a wrong password.

### The limits, unchanged

- ⛔ Never rewrite, backfill or migrate an existing `feeSnapshot`. Frozen money is frozen.
- ⛔ Never re-add `AUTO_SETTLE`. Never touch the price band, the tick floor or `computeTargets`.
- ⛔ Never hand-write an `INSERT INTO "AuditLog"` — it is an HMAC chain. Go through `audit()`.
- ⛔ **Never put a credential in a tracked file, a commit, a doc, a test fixture or a screenshot.**
  Read them from env / the CLI; that is what "use all the keys" means here.
- ⚠️ The live board is SHARED. Name what you create obviously, and retire it.
- ⛔ `railway run` injects the INTERNAL DB host and every read silently returns DEFAULTS. Mint a URL
  with `railway run -s 50pick -- node scripts/live/ops/mkenv.cjs`, which asserts the rewrite.

---

## §2 · THE BAR — Ali, verbatim

> *"perfectly working, no glitches, 100% functional, no workarounds, clean code"* ·
> *"no half work accepted. only full work"* · *"visually perfect and data perfect"* ·
> *"you should perfectly finish, tested, validated, re-validated and re-analysed, then we push"*

**You act as ALL NINE roles on every change** — architect · integration engineer · routing/nav ·
software engineer · UI/UX engineer · graphic designer · art evaluator · QA · player+shop-owner
(`.claude/skills/50pick-standards/SKILL.md` §1).

### The five rules that override convenience

1. **VERIFIED MEANS EXECUTED.** Run it, quote the output. A doc naming a file is not evidence.
2. **ASK OF EVERY CHECK: would it still pass if the feature were absent? Would it fail even if the
   product were fine?** Every refusal check needs a positive control **in the same run**.
3. **A DEFECT CAN BE INVISIBLE TO EVERY GATE AND OBVIOUS IN A FRAME.** Read every screenshot.
4. **NEVER `git add -A`** (§0 rule 1).
5. **DOCS TRAVEL WITH THE CODE, IN THE SAME COMMIT**, and a gate nothing runs is not a guard.

---

## §3 · READ, IN ORDER, BEFORE TOUCHING ANYTHING

1. `CLAUDE.md`
2. `.claude/skills/50pick-standards/SKILL.md` — especially **§5b, "assert the value, not the
   symbol"**, twelve numbered ways an instrument has lied on this codebase
3. `.claude/skills/50pick-audit/SKILL.md` — safe DB / Railway / migration ops
4. `docs/RULES.md` — the ONE money authority. ⛔ Never restate a rate anywhere else
5. `docs/DESIGN_AUTHORITY.md` **§0** (the filing law) — read before creating ANY design doc
6. `docs/UPDOWN-SPEC.md` · `docs/UPDOWN-PRICING.md` · `docs/UPDOWN-ARCHITECTURE.md`
7. `docs/NEXT-PLAN.md` · `docs/MODULE-CERTIFICATION-PROGRAM.md`

---

## §4 · THE SCOPE — finalise BOTH games, end to end

Validate **visually, technically and functionally**, on the **live product**, the whole of each
game's lifecycle, and fix everything you find:

**Long-form polls / markets:** admin creation (and the AI candidate pipeline) → publish → the board
→ the detail page → placing a bet → cash-out → close → the resolver queue → two-officer settlement →
payouts → receipts, notifications and emails → `/positions` and `/results` → the ledger and the
statutory report tying out.

**Up & Down:** admin asset/chain configuration → proposals → the scheduler opening and closing
rounds → the player board → the round detail → placing a bet → the locked window → price
confirmation → resolve **and VOID** → payouts → `/updown/history` → the daily digest.

For each: does it work, does it say the truth, does it read well at **360 / 768 / 1280 / 1920** in
**EN + SW + ZH**, is the money conserved and audited, and does every failure explain itself.

⭐ **Drive the real product.** `scripts/live/probe-poll-card.mjs` exists precisely so you re-read a
surface's DOM contract before driving it — **look first, act once**. The board's side control reads
`Back YES` on an empty market and `Back YES at 35%` once it has a pool; the stake box is a **masked
input** where `fill()` produced `"1000100"`; "Grant bonus" only OPENS a confirm dialog, by design.

### ▶ 4b · MANY PLAYERS AT ONCE — Ali's explicit instruction, 2026-08-15

> *"make sure to tackle anything including when multiple users are clicking same time etc,
> everything."*

**A single-player walkthrough is not evidence about a real board.** Every flow in §4 must also be
driven CONCURRENTLY, and the invariants must hold under it. This is where money is actually lost.

⛔ **A single-process test cannot see these defects.** The dev `withLock` is an in-memory
Promise-chain mutex; only **real Postgres advisory locks** (`pg_advisory_xact_lock`) behave like
production. Use the local disposable cluster + `scripts/load/` (`50pick-audit` skill §3) — never
conclude "concurrency is fine" from a run with no `DATABASE_URL`.

**The five money invariants, under load, on every path:**
conservation (in = out + house) · no negative balance · idempotent · an audit entry exists ·
**and all four still hold when N clients hit the same row at the same instant.**

| Race to drive | Why it is the one that bites |
|---|---|
| **N players betting the same market/round at once** | The proven harness is `scripts/load/spike-f-saturation.mts`; the last measured figure is **200 concurrent bets → 200 succeeded, p95 1,507 ms, 0 TZS leaked, pool == Σ stakes, nothing shed** (pool 20, one market). Re-run it and quote YOUR number. Invariants: `npm run test:bet-admission` |
| **The same player double-tapping ONE button** | The commonest real-world race and the easiest to miss. Two clicks, one stake — on the Up & Down quick-bet especially, where §5b is adding a modal to a one-tap surface. Prove the second tap is refused or idempotent, never a second debit |
| **Bet landing at the exact moment a round LOCKS or a poll CLOSES** | ⛔ The Up & Down locked window is **ONE MINUTE wide whatever the round duration**. A 15-second poll can miss a quarter of it. Drive a stake at the boundary and prove which side of it the money falls on — and that the player is TOLD |
| **Two officers settling the same market** | `withLock("market:{id}")` + two-officer maker-checker. Prove a double settlement cannot pay twice, and that RBAC refuses the wrong role (a COMPLIANCE officer is refused on the resolver **by design** — that is the product, not a defect) |
| **Settlement racing a cash-out / a bet** | Money must not be paid on a position that is simultaneously being exited |
| **Concurrent wallet writes** — deposit credit, withdrawal hold, bet debit, refund, bonus grant | `withLock("wallet:{userId}")`, lock order **wallet → market**, always. `s10` (wallet) and `s11` (audit chain) in `scripts/load/` |
| **VOID / refund under load** | A refund path takes the wallet lock and runs OUTSIDE the market lock |
| **The scheduler firing while players bet** | Round open/close/resolve is a background writer competing with live traffic |
| **Saturation** | Past `maxInFlight`, `admission.ts` queues FIFO (500 deep, 15s budget) so **load becomes latency, not errors** — saturation must surface as a retryable `BUSY`, never a raw Prisma `P2024` reaching a player |

⚠️ **Two rules the collapsed bet transaction imposes — read before touching any money path:**
1. An abort must **escape `withLock`**; caught inside, the enclosing transaction COMMITS the partial
   debit it meant to discard.
2. Any **write** inside a lock must take the caller's `tx`, or it blocks on our own uncommitted row
   and hangs to the 30s timeout (`P2028`). Reads are fine un-threaded (MVCC).

⭐ **Claim the row.** Money writes use conditional updates (`updateMany WHERE status = the status you
read`) so a race cannot double-spend. Where you find a read-then-write without that guard, it is a
finding — the NIDA uniqueness check is a known one (app-level read-then-write, no unique index; the
exact `CREATE UNIQUE INDEX CONCURRENTLY` is in `docs/NIDA-POLICY.md`).

**And concurrency is not only money:** two players opening the same modal, a filter changing while a
page streams, a notification arriving mid-bet, `recordSnapshot` firing **fire-and-forget from six
sites on the bet path** (every history write must swallow its own errors — an unhandled rejection
kills the container mid-bet). Drive them.

---

### ▶ 4c · HUNT DEFECTS — Ali's explicit instruction, 2026-08-15

> *"search for defects as much as possible."*

⭐ **This session is not "build two things and validate the happy path". It is a HUNT.** The two
changes in §5 are the commissioned work; finding what is broken is the mission. Every session before
this one found more by looking than by building, and the worst defects on this codebase were all
invisible to a green suite.

**Hunt these ways, not just by re-running the suites:**

1. **OPEN EVERY CONTROL, AT EVERY WIDTH, IN EVERY LANGUAGE.** A closed control photographs
   perfectly while being unusable — a topic panel measured **4px, 1%, zero of eight options
   reachable**, and every automated check was green.
2. **Be hostile to the inputs.** Hand-edited URLs, junk query params, a stake of `0`, `-1`, `1e9`,
   `"1,000"`, a masked field pasted into, a 501st position, a market id that does not exist, a
   settled round re-driven, the back button mid-bet, a double submit, an expired session mid-flow.
   Nothing may 500, and nothing may say something untrue.
3. **Read the empty, loading, error and edge states** — not just the populated one. Long titles, big
   numbers, SW/ZH, a cold-start board with no pool. ⛔ Never a fabricated figure in an empty state:
   `pricedYesPct` is the ONE cold-start price rule, and the price gate is **the pool alone**.
4. **Interrogate your own instruments.** ⛔ Of every check ask: *would it still pass if the feature
   were absent? would it fail if the product were fine?* Four checks passed while proving nothing in
   one session — one matched a KPI **label** printed whether or not the feature exists, one matched
   the word "refund" **in the button's own label**, one counted `sr-only` nodes as clipped, one
   counted the ADMIN console and the **dictionary** as defects.
5. **Grep is a lead, never a verdict.** *"A grep is a list, and a list goes stale."* A rate-focused
   sweep called three documents clean; **reading** them found a retired blocker and a retired figure.
   Asserting absence is a positive claim that needs positive evidence.
6. **Ask "is this the product, or my list?"** before filing. The product refused correctly three
   times in one session and the driver was wrong every time.
7. **Check the docs against the code**, both directions. This repo's recurring defect class is a
   document that is confidently wrong — a stale restatement of the fee rule misled an administrator,
   and `CLAUDE.md`'s own banner warns that much of it is unreliable on current truth. `npm run
   test:integrity` is the guard; where you find drift, **delete one copy, do not sync both**.

**Filing:** fix it in place — Ali's standing instruction is *"fix anything found as you go."* What is
genuinely out of scope gets a named entry with its reason in the doc that owns the subject, never a
new tracker file. Re-grep finding ids at the moment you file (§0 rule 4). ⛔ And a defect you fix
needs a guard **plus a RED proof seen to fail** — otherwise the next session reintroduces it.

---

## §5 · THE TWO CHANGES ALI NAMED — both verified in the code before this prompt was written

### ▶ 5a · A player must see EVERY position, however many they hold

🔴 **Confirmed defect, `src/app/updown/history/page.tsx:256`:**

```
const shown = g.bets.slice(0, 2);
const extra = g.bets.length - shown.length;
```

Each round card renders **two** bet chips and collapses the rest into a bare `+N` chip (line 298).
A player who took six positions on one round sees two of them and the number four. The comment at
line 243 and line 291 both call the cap deliberate — it is not, any more.

**What Ali asked for:** *"make it show, no matter how much position I have, perfectly."*
Render **every** bet on the round card. It is a `flex-wrap` row already, so the work is the
*layout* judgement, not the loop: keep it readable at 360 in SW/ZH with 10+ chips, keep the card
grid's `minmax(320px, 1fr)` honest, and do not let a long row push the money block off the card.

⚠️ **And check the round DETAIL panel too** — `src/app/updown/[roundId]/page.tsx:363-412` renders
`myPosition`, which `myPositionFor` (`src/lib/server/updown-board.ts:732-757`) **aggregates**: one
side, one stake, one payout, plus `ids[]` used only as scroll anchors. That is a second surface
where a player holding six positions is shown a single line. Itemise each position — side, stake,
payout, result — **and** keep the aggregate total. ⛔ The aggregate figures are read straight off
what settlement wrote (`status` + `finalPayout`); **add no money logic** to this path.

⛔ `listPositionsForUser(userId, 500, "UPDOWN")` caps at 500. If you render every position, say what
happens at 501 rather than silently truncating — a silent cap is the defect you are fixing.

### ▶ 5b · Placing an Up & Down bet must give a real confirmation popup

🔴 **Confirmed, `src/components/updown/updown-stake-controls.tsx:10-11, 252`:** a placed Up & Down
bet produces **a success pulse on the tapped side and a visually-hidden `aria-live` announcement**
— the file's own words, *"the confirmation for screen readers, **in place of a toast**"*. A sighted
player gets a pulse and a push notification. **There is no modal.**

Meanwhile a long-form poll bet goes through `BetConfirmModal` → `OperationResultModal`
(`src/components/markets/conviction-dial.tsx`), which is what `CLAUDE.md` commits to in as many
words: *"Every consequential mutation goes through the unified `OperationResultModal`"*.

**What Ali asked for:** the same quality of confirmation on Up & Down as on every other bet — *"a
perfect consistent popup, not only a push notification … the way other bets do it, perfectly, with
the perfect info in it."* **You decide the composition**; it must be the shared primitive, not a new
one-off.

The info it should carry (state it in EN + SW + ZH):

| | |
|---|---|
| What was backed | asset + **UP / DOWN** + the round (duration, which round, when it closes) |
| The money | stake, and the **projected** return — ⛔ flat, never gilded: gold is money that was **EARNED**, and a projection has not been decided (`test:gold-is-money`, Q5) |
| The price context | the open/reference price the round is measured from, and its source class |
| What happens next | when it locks, when it settles, where to watch it |
| The way out | the free-cancellation window if one applies — ⛔ read the rule from `docs/RULES.md`, never restate a rate |

⚠️ **The design tension, stated so you decide it deliberately rather than by accident:** Up & Down is
a fast one-tap surface and some rounds are 60 seconds — the pulse-instead-of-toast choice was made
for that reason. A blocking modal on every tap could cost a player the round. Ali has asked for the
popup; build it, and make it the *right* popup: `OperationResultModal`'s success path already
auto-dismisses at 5s while failures stay until dismissed. ⛔ **And the locked window is ONE MINUTE
wide whatever the round duration** — the advertised length IS the betting time.

⚠️ `src/components/updown/updown-bet-blocked-modal.tsx` already exists for the *refusal* case. Read
it first: your success modal must read as its sibling, not as a second dialect.

---

## §6 · VERIFY — executed, quoted, and looked at

- `npx tsc --noEmit` · `npm run build` · **`npm run test:all`** (218/218 is the last known figure —
  quote yours) · **`npm run red:all` at the END of the session, not only the suites you touched.**
  ⛔ **A RED harness with a stale anchor is an ABSENT test, and it fails in the direction of looking
  fine** — two were silently degraded for four days while presenting as guards.
- New behaviour needs a **new guard plus a RED proof that has been SEEN TO FAIL** on the real
  defect. ⛔ A guard and its own RED proof can agree with each other and both be wrong — if the
  mutation locates its target exactly as the guard does, a shared wrong locator passes both.
- **4 widths × 3 locales, and OPEN EVERY CONTROL.** A closed control photographs perfectly while
  being unusable: a topic panel measured **4px — 1%, zero of 8 options reachable** — while every
  automated check was green.
- **Live, on production:** the poll drivers (`qa:poll-drive`, `qa:poll-settle-drill`), the Up & Down
  drivers (`qa:asset-board`, `qa:ud20-hedge`, `qa:seal`), `qa:bonus-live`, and the money tie-outs.
  ⚠️ `.env.qa.local` **on this machine is dated 11 Aug and is STALE** — the six QA personas were
  re-minted on 14 Aug from the office PC. Re-mint (`ops-remint-qa-passwords.mts`, which refuses any
  ADMIN row) or copy the current file across **before** concluding a live driver's failure is the
  product. A sign-in that lands back on the signed-out shell is that staleness, not a defect.
- ⛔ **Tie a money figure to what settlement ACTUALLY PAYS.** The most expensive instrument failure
  on this codebase compared the product against its own misuse and stayed green while a locked card
  understated a real payout by **23%**.
- After the push: prod HTTP 200, a clean `railway logs -s 50pick` boot, **and a frame actually read**.

---

## §7 · TRAPS THAT HAVE COST REAL TIME HERE

- ⛔ **Tailwind's spacing scale is OVERRIDDEN** — `h-8` is **48px**, `h-9` is **64px**, `mt-12` is
  **128px**. `min-h-[44px]` is an arbitrary value ON PURPOSE. Never "tidy" it into a scale class.
- ⛔ **`test:design-frozen` exempts any line containing `var(--`** — it was green over six inline
  style breaches. A green ratchet is not evidence.
- ⛔ **NEVER regex a CSS colour.** Tokens are `oklch()`; a `[\d.]+` scrape reads lightness, chroma
  and hue as R, G, B and once scored a button at 1.24:1. Paint into a 1×1 canvas and read the pixel.
- ⛔ **Language comes from the `kp-locale` COOKIE — there is no `/api/locale` route.** Set it on the
  Playwright *context*, then read `<html lang>` back and refuse to capture on a mismatch.
  ⚠️ `退出登录` (sign OUT) contains `登录` (sign in) — a ZH sign-in predicate needs the lookbehind.
- ⛔ **Prisma `DateTime` is `timestamp` WITHOUT time zone** and node-postgres parses it in the
  *client's* zone. On a laptop in EAT that shifted every reading by three hours and reported all
  sixteen chains stalled, healthy ones included. Read timestamps as `::text` and parse as UTC.
- ⛔ **`node -e` and shell heredocs eat a backslash layer** — write files with the editor, never a
  shell string. **`PowerShell`'s `Get-Content` mangles UTF-8** — never shell-edit the i18n dict.
  **`[System.IO.File]` ignores `cd`** — use absolute paths.
- ⛔ **An ellipsis is not a defect** (skip `text-overflow: ellipsis` elements) — but report **how
  much** is hidden. And measure every container against **its own** `scrollWidth`: a child clipped
  by an intermediate row never reaches the card's edge.
- ⚠️ **Ask "is this the product, or my list?"** The product refused correctly three times in one
  session and the driver was wrong each time.

---

## §8 · DEFINITION OF DONE

- Both games validated end to end — admin through player through resolution — with the frames read
  and the output quoted, on **production**.
- Every Up & Down position visible on both surfaces, at 4 widths × 3 locales, with 10+ positions on
  one round proven (mint them — §1).
- The Up & Down bet confirmation modal shipped on the shared primitive, consistent with the poll
  bet's language, correct in three languages, with the projected return **not** gilded.
- Everything found along the way fixed, or filed with a named reason — Ali's standing instruction is
  *"fix anything found as you go."*
- `test:all` green · `red:all` green · new guards each proven RED.
- Docs updated **in the same commits**: `docs/NEXT-PLAN.md`, `docs/UPDOWN-SPEC.md` (and
  `UPDOWN-PRICING` / `UPDOWN-ARCHITECTURE` if the mechanics moved), `docs/RULES.md` only if a rule
  actually changed, `docs/MODULE-CERTIFICATION-PROGRAM.md`'s status board, and the design-system
  provenance CHANGELOG if a component changed. ⛔ No new tracker files.
- Committed **by explicit path** and pushed to `main`; deploy verified live.
- ⭐ **Then EMPTY this file** — a spent prompt that still says "paste this as your opening prompt"
  sends the next session to redo finished work.
