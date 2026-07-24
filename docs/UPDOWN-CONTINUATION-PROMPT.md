# Up & Down — continuation prompt (copy-paste)

> Self-contained handoff. **Rewritten 2026-07-24, `main` @ `8daef3a`, deployed + verified.**
> ⚠️ Keep this current: update it in the LAST commit of every session.

---

You are continuing **Up & Down** on **50pick** (repo `F:\kipindi-main`, branch `main`,
Node 24). Read `.claude/skills/50pick-standards` + `.claude/skills/50pick-audit` first.

## Read these, in this order

| # | Doc | Why |
|---|---|---|
| 1 | `Up and Down/` (repo root) | The management team's requirements — primary source, verbatim |
| 2 | [`UPDOWN-SPEC.md`](UPDOWN-SPEC.md) | **What the product is** — rules, workflows, states, copy |
| 3 | [`UPDOWN-ARCHITECTURE.md`](UPDOWN-ARCHITECTURE.md) | **How it is built** + the doc-ownership table |
| 4 | [`UPDOWN-PROGRESS.md`](UPDOWN-PROGRESS.md) | Phase board, decisions, risks, open questions |
| 5 | [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) | Newest entry — the Up & Down posture |
| 6 | [`design-system/README.md`](design-system/README.md) | The design rule book |

**One fact, one home.** Each doc owns its topic and links rather than restating. A
value in two places is a defect — delete one.

---

## Where it stands

**Live on `main` @ `8daef3a`, deploy verified (fresh boot, 46 migrations, clean).**

| Phase | Content | Status |
|---|---|---|
| **0** | `productLine` + indexed board queries + guard | 🟢 LIVE `fdea3eb` |
| **1a** | 4 tables + observation ledger + migration | 🟢 LIVE `3dc1213` |
| — | Design system consolidated + de-duplicated | 🟢 LIVE `6f736f1` |
| **1b** | `updown-dal.ts` — race-safe observation store | 🟢 LIVE `78e2653` |
| **1c/d** | `updown-config.ts` registry + grid + 13% profile + 62 tests | 🟢 LIVE `357edb9` |
| **1e** | `/admin/updown` console + ONE route resolver | 🟢 LIVE `fc9b277` |
| **1e+** | Visual defects fixed; `updown-oracle.ts` written | 🟢 LIVE `8daef3a` |
| **2** | `updown-oracle.ts` — six refusal gates | 🟢 DONE |
| **3** | `updown-service.ts` + `updown-scheduler.ts` + boot/ticker wiring | 🟢 DONE — `test:updown-engine` 43/43, money drift 0 |
| **4** | Player UI — `/updown`, round detail, `UpDownCard` | 🟡 **START HERE** — D1/D2 specs in hand |
| **5** | Reports, analytics, notification digest, rounds explorer | ⬜ |
| **6** | Staged enable (Gold 5-min → Silver → 15/30) + archive job | ⬜ |

---

## ▶ START HERE — Phase 4, the player UI

**The engine is DONE and functional.** A chain opens rounds, takes real bets through
the existing bet path, resolves against two immutable observations, and settles through
the untouched `settleMarket` — proven by `test:updown-engine` (43 assertions, money
conservation drift 0). What is missing is the surface players bet on.

**Build, in this order:**

1. **`src/components/updown/updown-card.tsx`** — the iconic surface. The spec is
   written and reviewed: `design-system/v1-2026-07-24/specs/D1-updown-card-spec.md`
   (redlines + prop contract + all 7 states). **KIT-ONLY** — extend the kit if a
   primitive is missing, never fork one locally. Mandatory on the card: volume,
   players, amount, timer — all four surviving 360px.
2. **`src/app/updown/page.tsx`** — the board. Spec: `D2-updown-board-spec.md`. Asset
   tabs → duration tabs → card grid → recent-results pips. **3 columns at 1920, not 4**
   (the platform's 3-tier max-width system).
3. **`src/app/updown/[roundId]/page.tsx`** — round detail + the settlement-proof panel
   (open price, close price, BOTH source links, BOTH source-quoted timestamps).
4. **Nav** — bottom nav becomes Markets · Up & Down · Live · Bets · Wallet (Profile
   moves to the avatar menu). Top-nav identity: prompt **D6**, pending Ali (Q8).
5. **i18n** — EN + SW + ZH for every new key; `npm run test:i18n` enforces parity.
6. **`/live` must opt into `productLine: "ALL"`** so it shows both product lines
   (`Markets Appearing.txt`). `/markets` stays on the default and shows long-form only.

**Then visual-verify or it is not done:** extend `scripts/updown-admin-e2e-shots.mjs`
style coverage to the player surfaces, shoot 360/768/1280/1920 × EN/SW/ZH × every card
state, and **read the PNGs**.

**New values the design flagged as not-in-the-kit** — add them to the kit, not to one
file: `ud-count-pulse` keyframe (+ reduced-motion gate), the asset icon-chip recipe,
mono micro-labels at 8.5–9.5px, the 28px countdown size, `.pip-up/.pip-down/.pip-void`.

---

## The four decisions already made — do NOT relitigate

Ali decided these on 2026-07-24 with the trade-offs on the table. Rationale:
`COMPLIANCE-DECISIONS.md`.

1. **Fee = `capped-commission` @ 13% of pool**, ceiling ⅓ of smaller side, frozen per
   round → exactly TZS 1,300 on a balanced 10,000 pool. Long-form polls keep
   `loser-share`; the two never mix.
2. **Resolution stays on the AI sentinel** — no external price-feed contract.
3. **Launch assets = Gold + Silver.** Admin registry; BTC available, off.
4. **Settle immediately** on a confirmed outcome; disputes after payout.

---

## The six things that will bite you

1. **⚠️ THE READ-PATH RULE.** `listMarkets()` defaults to `productLine:"MARKET"`. Any
   MONEY or REGULATOR read must opt IN with `"ALL"`, or Up & Down revenue vanishes from
   the books **while every remaining number still reconciles with itself**.
   `npm run test:product-line` guards six call sites and is verified to fail when one
   regresses. **Never delete an entry from `MUST_OPT_IN` to make it pass.**
2. **⛔ NEVER update a CONFIRMED observation's price.** `confirm()` claims the row
   (`updateMany WHERE state='PENDING'`) so a retry cannot overwrite a price that already
   settled money. Do not "simplify" it to an `update`.
3. **⛔ Do not collapse the observation ledger into per-round price columns.** It would
   let two adjacent rounds disagree about the same instant and multiply AI cost by ~6.
4. **Up & Down rounds are excluded from the per-market scheduler.** Own per-chain
   scheduler, own fire gate. Two engines racing one row is a money hazard.
5. **`snapshotOrLegacy` forces `estimatedWinningsRate = 0` on non-`loser-share`
   snapshots** (`market-config.ts` ~:322). Those two **display-only** fields must become
   model-independent or the "× 1.4 est." headline cannot render on a capped-commission
   round. **The maths must stay untouched.** ← still outstanding, needed for Phase 4.
6. **`activeKeyFromPath` must stay in ONE file** (`admin-nav-groups.ts`). It was
   duplicated and had already drifted. `npm run test:admin-nav` fails if a copy returns.

---

## Gate before any push

```
npx tsc --noEmit && npm run build && npm run test:all
# real Postgres (F:\pg-loadtest, local PG16 on :5433):
DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=<fresh>' \
  USE_PRISMA_DAL=true npx prisma db push --skip-generate --accept-data-loss
DATABASE_URL='...same...' USE_PRISMA_DAL=true npx tsx scripts/money-e2e.test.mts  # drift 0.00
```

**Visual (mandatory — a green suite is not a readable screen):**
```
DISABLE_ADMIN_TOTP=true SESSION_SECRET=<32+> OTP_PEPPER=<16+> npx next dev -p 3000
BASE=http://localhost:3000 node scripts/updown-admin-shots.mjs       # empty states
BASE=http://localhost:3000 node scripts/updown-admin-e2e-shots.mjs   # drives the real UI, populated
```
Then **READ** the PNGs in `docs/shots-updown/`. The clipped-not-scrolled bug class
passes the overflow check and only shows in the image — it already caught two real
defects on this page.

**Last known green:** `test:all` **87/88** · `e2e:money` **63/63 drift 0.00** ·
`test:product-line` 30/30 · `test:updown-config` 62/62 · `test:admin-nav` 16/16 ·
`test:integrity` clean · both shot harnesses OK.
`test:responsive` is the ONE allowed local failure (needs a live `:3000`).

**After every push:** `railway deployment list` — a 200 does NOT mean your commit is
live. If Railway CLI is unavailable, poll `/api/health` and watch `uptimeSec` reset
below ~400s; a fresh boot with real counts means the deploy took.
⚠️ Railway CLI must be **`alisheib07@gmail.com`**. If it is `awarkehmobiles@outlook.com`
that is a DIFFERENT live shop — `railway logout` first. Then
`railway link --project 50pick --environment production --service 50pick`.
**Access may currently sit with AWARKEH — ask Ali for it back before deploying.**

**Known non-issue:** transient `Can't reach database server` / P2024 bursts around a
deploy are a documented Railway internal-network blip. Check the Postgres instance
status before chasing it.

---

## Open questions for Ali

| # | Question |
|---|---|
| Q1 | **Which price source domain per asset?** Must be an enabled TrustedSource before a chain can run. **Blocks Phase 6.** |
| Q2 | Stake bounds — same as polls (100…100,000) or tighter for fast rounds? |
| Q3 | Do Up & Down rounds appear in the main `/positions`, or only `/updown/history`? |
| Q5 | Gold asset-icon tint collides with "gold = earned money only". Accept, or neutral metallic ring? |
| Q6 | Card title at 360px — ellipsis or 2-line clamp? (Recommend clamp: SW/ZH expand ~35%.) |
| Q7 | Real Gold/Silver artwork to replace the `Au`/`Ag` placeholders. |
| Q8 | Top-nav identity — prompt **D6** drafted (purple; **no** per-second timer: RG + perf). |
| Q9 | `.btn-sm` is 30px, under the ≥40px tap floor, on ~100 admin buttons. Platform-wide call — raise the kit, or accept it for desktop admin? |

## Parked (Ali's asks — deliberately not ridden along)

- **P1** — the full design-system archive ZIP from Claude Design → `design-system/v2-<date>/`.
  Export prompt drafted and handed over. v1 covers Up & Down + Positions ONLY, and the
  README says so.
- **P2** — repo-wide design-asset cleanup. Must happen **after** P1.

---

Say **"continue"** and I will pick up at the oracle test, then build the engine
(`updown-service.ts` + `updown-scheduler.ts`).
