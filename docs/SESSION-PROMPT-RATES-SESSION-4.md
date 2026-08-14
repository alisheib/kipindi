# SESSION PROMPT — RULES PROGRAMME, SESSION 4

Continue the 50pick rates / bet-logic / failure-messaging programme.
Repo: `F:\kipindi-main`, branch `main`. **Every push to main deploys LIVE to 50pick.tz.**

---

## §0 · STANDING AUTHORISATION — still in force, do not re-ask

Ali granted this at the close of session 2 and it has not been withdrawn. Session 3 used all of
it. You have advance permission, on **production**, for the whole session:

| Asked | Granted |
|---|---|
| Mint test data on production without stopping to ask? | ✅ **ALL OF IT** — players, markets/polls, Up & Down assets and chains, bonus grants, invite/share tokens, crediting test wallets |
| Create a temporary Up & Down asset/chain on the LIVE board to force a VOID? | ✅ yes — name it obviously, retire it, say so in the commit. ⚠️ Session 3 did **not** need to: gold voids ~73% of rounds and forcing one on the real chain worked first try |
| How much real money may move through QA-fleet wallets? | ✅ **NO CAP** |

⭐ **If a rule cannot be proven because the state does not exist, CREATE IT.** That is how
session 3 closed the VOID case, the bonus rules and the poll settlement.

⛔ **And mint a real fleet, not two players.** Ali's standing instruction, given twice. The
production fleet is `fleet:01`–`fleet:20`; an index past 20 is a valid-looking phone with no
account, and the sign-in failure is indistinguishable from a wrong password.

### The limits, unchanged
- ⛔ Never rewrite, backfill or migrate an existing `feeSnapshot`. Frozen money is frozen.
- ⛔ Never re-add `AUTO_SETTLE`. Never touch the price band, the tick floor or `computeTargets`.
- ⛔ Never hand-write an `INSERT INTO "AuditLog"` — it is an HMAC chain. Go through `audit()`.
- ⛔ Never put a credential in a tracked file, a commit, a doc or a screenshot.
- ⚠️ The board is SHARED with another operator. Name what you create obviously, retire it.

---

## §1 · WHAT SESSION 3 SHIPPED — seven commits, all live

| Commit | What | Proof |
|---|---|---|
| `73f70024` | **Gold could not restart itself.** `advanceChain`'s market-hours gate returned above the re-arm, so a chain whose session closed pinned itself to a boundary inside that closed session and re-evaluated the gate at that stale instant for ever | `test:updown-rearm` 27/27 · `red:updown-rearm` 8/8 · 3 chains recovered live, round #267 opened after 20.9h |
| `e27ea9dd` | **The scheduler busy-waited on every boundary.** A past boundary re-armed at 0 ms, so the loop turned as fast as the DB answered for the ~90–130s a bar takes to publish | `test:updown-tick-cadence` 28/28 · `red` 8/8 · **2,269 → 3.5 transactions/sec** on production, open-latency median unchanged at 92s over 172 rounds |
| `34c15db3` | Gold verified back on the board; the card's trust line was **ellipsised** at 1024 and 360 | `qa:asset-board`, 4 widths |
| `38181ffa` | **A real VOID with money on both sides** (22,000 refunded exact, 0 fee, 7 positions incl. a hedge) and **the first two bonus grants production has ever had** | `loser-share-settled.cjs` 389/389 · RULES.md §2.4/§2.5 ⏳ cleared |
| `77c483f1` | **A long-form poll settled at 13% of the losing side** — fee 1,690, payouts 19,310, residual 0 | ledger tie-out, largest-remainder exercised |
| `a46648f5` | C2 second tranche — 19 coded refusals gain a severity; the 15 phrase tests are **pinned to the server's own strings**; player-facing raw server strings **6 → 0** | `test:failure-reasons` 152/152 · `red` 16/16 |
| `209a97da` + `27658eb2` | **UD-20 answered** (Ali: quote both outcomes) — and the locked quote was found to be **understating by 23%** | `test:updown-hedge-quote` 28/28 · `red` 8/8 · live at 4 widths |
| `ca2e95e7` | E2 — twelve documents corrected or superseded, plus the two `.docx` hand-outs | — |

`npm run test:all` → **218/218**. `npm run red:all` → every harness green.

---

## §2 · READ FIRST, IN THIS ORDER

1. **`docs/RULES.md`** — the single authority. Its roll-out table now has **one ⏳ left**:
   *"Failure messages explain themselves"*.
2. `docs/FAILURE-INVENTORY.md` — the map for the remaining C work. §1.5 and §1.6 are **closed**;
   §2.3's coded reasons are **done**; what remains is named in §4 below.
3. `docs/FINDING-GOLD-CHAINS-STALLED.md` and `docs/FINDING-SCHEDULER-BUSY-WAIT.md` — both 🟢
   fixed, kept because their mechanisms recur.

---

## §3 · WHAT IS LEFT

### ▶ 1. The last ⏳ — per-service reasons for the overloaded codes
`INVALID` and `SUSPENDED` each mean four things, so they are deliberately **not** mapped by
`reasonForCode`. Until each service emits its own `reason`, those refusals still reach the
player through `errorCopy`'s phrase matching. §8 of `test:failure-reasons` now pins every one of
those phrases to the server's actual string, so the seam cannot rot silently — but the seam is
still there. Teach the services to emit reasons directly, one family at a time (wallet, then
KYC, then auth), deleting each phrase test as its reason lands.

### ▶ 2. The 8 surfaces that say only that something failed
`docs/FAILURE-INVENTORY.md` §1.5, second row: `watch-star.tsx:81` · `position-share.tsx:56` ·
`push-settings.tsx:58/:62/:80` · `security-client.tsx` · `password-section.tsx:47`. None are on
the betting path. The raw-string row above them is at **zero** and ratcheted; this one is not
started.

### ▶ 3. ⚠️ 71 raw server strings on the ADMIN console
Excluded from the ratchet **by design** — the staff console is English-only. Counted and printed
by `test:failure-reasons` §10 rather than hidden in a filter. If Ali ever wants the console
localised, that number is the size of the job.

### ▶ 4. Retire the QA data session 3 minted
Production DATA is wiped before launch, so none of it is urgent — but it is all named:
- **2 bonus grants** — QA Fleet 01 and 02, TZS 10,000 × 5 each, source `ADMIN`, note naming this
  programme. `bonus-census.cjs 01` / `02`.
- **2 QA polls** — `mkt_3254d2723f3443358300` (settled) and `mkt_85d2b28535bcc68a86ae`
  (**still LIVE**, resolves 2026-08-14 21:22, holds QA Fleet 01's 7,000 YES / 2,000 NO).
  ⚠️ That one will resolve and settle on its own; nothing needs doing, but it is on the board.
- QA-fleet stakes on gold rounds #267/#268 and on both polls. ⛔ Nothing was created on the Up &
  Down board itself — no temporary asset was needed and none was left behind.

---

## §4 · WHAT SESSION 3 LEARNED — read before writing a check

Session 3's own instruments lied **nine** times. Every one is now a comment where it happened.

1. **A census that shifted every timestamp by three hours.** Prisma maps `DateTime` to
   `timestamp` WITHOUT time zone; node-postgres parses a naive value in the CLIENT's zone. On a
   laptop in EAT it reported all sixteen chains stalled — including the healthy ones — and would
   have sent the session chasing a platform-wide outage that did not exist. ⛔ Read every
   timestamp as `::text` and parse it as the UTC it is.
2. **A RED harness scored an exploding product as a MISS.** A mutation made the suite crash
   *before* it printed the summary line the harness reads. The loudest possible failure, filed as
   an absent test. Every new suite now counts an uncaught throw as a failure and still emits its
   summary.
3. **Two RED harnesses had been silently degraded by session 2's own commits** — one anchor
   invalidated by a migration block inserted after it, one duplicated by a new function opening
   with the same line. Both reported `HARNESS ERROR` and both had been scoring 5/6 while
   presenting as guards over six defects. ⛔ **A RED harness with a stale anchor is an ABSENT
   test, and it fails in the direction of looking fine.** Run `red:all` at the END of a session,
   not only the suites you touched.
4. **Four checks that passed while proving nothing** — one matched a KPI *label* that is printed
   whether or not the feature exists; one matched the word "refund" *in the button's own label*;
   one counted screen-reader-only nodes as clipped; one counted the ADMIN console and the
   *dictionary* as defects. Ask of every check: **would this still pass if the feature were
   absent?** and **would it fail if the feature were fine?**
5. **The most expensive one: a suite comparing the product against its own misuse.** Every UD-20
   assertion compared the board's figure to `projectedPayout` — called the same wrong way — and
   was green while the locked card understated a real payout by 23%. ⛔ **Tie a money figure to
   what settlement ACTUALLY PAYS.** That is the one comparison a product cannot satisfy by
   agreeing with itself.
6. **Three DOM contracts had to be re-measured, never remembered.** The side control is
   `Back YES` on an empty market and `Back YES at 35%` once it has a pool — *measured minutes
   apart on the same market*. The stake box is a masked input where `fill()` produced `"1000100"`.
   "Grant bonus" only OPENS a confirm dialog, by design. `scripts/live/probe-poll-card.mjs`
   exists for exactly this: **look first, act once**.
7. **A grep is a list, and a list goes stale.** A rate-focused sweep called three documents clean;
   reading them found a retired blocker and a retired ~9% figure.
8. **The product refused correctly three times and the driver was wrong each time** — RBAC
   refused the COMPLIANCE officer on the resolver (it is trading & markets); the seal needs
   evidence *and* the word SEAL typed; the board deliberately excludes locked rounds. Ask *"is
   this the product, or my list?"* before filing.
9. **The locked window is ONE MINUTE wide** whatever the round duration — the advertised length
   IS the betting time and the result phase is added. A 15-second poll can miss a quarter of it.

---

## §5 · TOOLS ADDED THIS SESSION

| | |
|---|---|
| `scripts/live/ops/chain-stall-census.cjs` | which chains have stopped producing rounds, in true UTC |
| `scripts/live/ops/db-load-sample.cjs` | transactions/sec against production — the before/after instrument |
| `scripts/live/ops/bonus-census.cjs` | every grant and its real `wageredTzs`, read off the row |
| `scripts/live/ops/market-config-diff.cjs` | full-snapshot diff either side of a deliberate config change |
| `scripts/live/ops/chain-by-id.cjs` | one chain, its rounds and its observations |
| `scripts/live/probe-poll-card.mjs` | re-read the market page's DOM contract before driving it |
| `npm run qa:asset-board` | is an asset alive on the player board, 4 widths, per-element clipping |
| `npm run qa:poll-drive` / `qa:poll-settle-drill` | create, bet, seal and settle a long-form poll |
| `npm run qa:bonus-live` | grant, hedge, warn at 4 widths × 3 languages, free-exit |
| `npm run qa:ud20-hedge` | a hedged holder's locked round, 4 widths |
| `measureClipping()` in the harness | clipping that is really clipping — not `sr-only`, not a wrap |

⛔ **`railway run` injects the INTERNAL DB host and every read silently returns DEFAULTS.** Mint
a URL with `railway run -s 50pick -- node scripts/live/ops/mkenv.cjs`, which asserts the rewrite.
