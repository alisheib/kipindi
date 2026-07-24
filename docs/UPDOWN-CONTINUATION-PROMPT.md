# Up & Down — continuation prompt (copy-paste)

> Self-contained handoff for the next session. Rewritten **2026-07-24**.
> Keep this current: update it in the last commit of every session.

---

You are continuing **Up & Down** on **50pick** (repo `F:\kipindi-main`, branch `main`,
Node 24). Read `.claude/skills/50pick-standards` + `.claude/skills/50pick-audit` first.

## Read these, in this order

| # | Doc | Why |
|---|---|---|
| 1 | `Up and Down/` (repo root) | The management team's original requirements — the primary source, verbatim |
| 2 | [`docs/UPDOWN-SPEC.md`](UPDOWN-SPEC.md) | **What the product is** — rules, workflows, states, copy |
| 3 | [`docs/UPDOWN-ARCHITECTURE.md`](UPDOWN-ARCHITECTURE.md) | **How it is built** + the doc-ownership table |
| 4 | [`docs/UPDOWN-PROGRESS.md`](UPDOWN-PROGRESS.md) | **Status** — phases, decisions, risks, open questions |
| 5 | [`docs/COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) | Newest entry first — the Up & Down compliance posture |
| 6 | [`docs/design-system/README.md`](design-system/README.md) | The design rule book |

**One fact, one home.** Each doc owns its topic and links rather than restating. If you
find a value in two places, that is a defect — delete one.

---

## Where it stands (2026-07-24, `main` @ `6f736f1`, deploy `e8c4bcda` SUCCESS)

| Phase | Content | Status |
|---|---|---|
| **0** | `productLine` discriminator + indexed board queries + guard | 🟢 **LIVE** (`fdea3eb`) |
| **1a** | Four tables + observation ledger + migration | 🟢 **LIVE** (`3dc1213`) |
| **1b** | `updown-dal.ts` | 🟡 Written, typechecks, **not yet committed or tested** |
| **1c** | `updown-config.ts` — asset/chain registry, rate profile, thresholds | ⬜ Next |
| **1d** | `test:updown-config` | ⬜ |
| **1e** | `/admin/updown` assets + chains pages | ⬜ |
| **2** | `updown-oracle.ts` + AI-toolkit pause + usage metering | ⬜ |
| **3** | `updown-service.ts` + `updown-scheduler.ts` + rate overrides | ⬜ |
| **4** | Player UI — needs the Claude Design returns | ⬜ Blocked on design |
| **5** | Reports, analytics, notification digest, admin rounds explorer | ⬜ |
| **6** | Staged enable (Gold 5-min → Silver → 15/30-min) + archive job | ⬜ |

**Prod boot is clean:** 46 migrations (none pending), 19 market timers armed, ledger
balanced. Prod is TEST money-mode (`TEST_FUNDING=true`).

---

## The four decisions that are already made — do NOT relitigate

Ali decided these on 2026-07-24 with the trade-offs explicitly on the table. Full
rationale in `COMPLIANCE-DECISIONS.md`.

1. **Fee = `capped-commission` @ 13% of pool**, ceiling ⅓ of the smaller side, frozen
   per round. Exactly TZS 1,300 on a balanced 10,000 pool. Long-form polls keep
   `loser-share`; the two never mix.
2. **Resolution stays on the AI sentinel** — no external price-feed contract. Made
   sound by the immutable observation ledger.
3. **Launch assets = Gold + Silver.** Admin-configurable registry; BTC available, off.
4. **Settle immediately** on a confirmed outcome; disputes handled after payout.

---

## The five things that will bite you

1. **⚠️ THE READ-PATH RULE.** `listMarkets()` defaults to `productLine: "MARKET"`. Any
   MONEY or REGULATOR read must opt IN with `"ALL"`, or Up & Down revenue vanishes from
   the books **while every remaining number still reconciles with itself**. Six call
   sites are opted in; `npm run test:product-line` guards them and is verified to fail
   when one regresses. **Never delete an entry from `MUST_OPT_IN` to make it pass.**
2. **⛔ NEVER update a CONFIRMED observation's price.** The whole determinism guarantee
   — round N's close IS round N+1's open — rests on write-once. `confirm()` claims the
   row (`updateMany WHERE state = 'PENDING'`) precisely so a retry cannot overwrite a
   price that already settled money. Do not "simplify" it to an `update`.
3. **⛔ Do not optimise the observation ledger into per-round price columns.** It would
   silently reintroduce two adjacent rounds disagreeing about the same instant, and
   multiply the AI cost by ~6.
4. **Up & Down rounds are excluded from the per-market scheduler** (`nextDeadlineFor`
   returns null; `pending()` defaults to `MARKET`). They get their own per-CHAIN
   scheduler with its OWN fire gate. Two engines racing one row is a money hazard, and
   a shared gate would let Up & Down starve long-form settlement.
5. **`snapshotOrLegacy` forces `estimatedWinningsRate = 0` on non-`loser-share`
   snapshots** (`market-config.ts` ~:322). Those two **display-only** fields must
   become model-independent or the "× 1.4 est." headline cannot render on a
   capped-commission round. **The maths must stay untouched.**

---

## Gate before any push

```
npx tsc --noEmit && npm run build && npm run test:all
# real Postgres (F:\pg-loadtest, local PG16 on :5433):
DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=<fresh>' \
  USE_PRISMA_DAL=true npx prisma db push --skip-generate --accept-data-loss
DATABASE_URL='...same...' USE_PRISMA_DAL=true npx tsx scripts/money-e2e.test.mts  # drift 0.00
```

**Last known green:** `test:all` 85/86 · `e2e:money` **63/63 drift 0.00** ·
`test:product-line` 30/30 · `test:integrity` clean.
`test:responsive` is the ONE allowed local failure — it needs a live `:3000` server.

**After every push:** `railway deployment list`. A 200 from the site does **not** mean
your commit is live — verify a code marker and check the boot log. Railway CLI must be
**`alisheib07@gmail.com`**; if it is `awarkehmobiles@outlook.com` that is the AWARKEH
shop account — `railway logout` and re-login before touching anything.
`railway link --project 50pick --environment production --service 50pick`.

**Known non-issue:** transient `Can't reach database server at
postgres.railway.internal:5432` / P2024 bursts around a deploy are a documented Railway
internal-network blip. Check the Postgres instance status before chasing it.

---

## Open questions for Ali (blocking design + Phase 6)

| # | Question |
|---|---|
| Q1 | Which price source domain per asset? Must be an enabled TrustedSource before a chain runs. |
| Q2 | Stake bounds for Up & Down — same as polls (100…100,000) or tighter? |
| Q3 | Do Up & Down rounds appear in the main `/positions`, or only `/updown/history`? |
| Q5 | Gold asset-icon tint collides with "gold = earned money only". Accept, or neutral metallic ring? |
| Q6 | Card title at 360px — ellipsis or 2-line clamp? (Recommend clamp: SW/ZH expand ~35%.) |
| Q7 | Real Gold/Silver artwork to replace the `Au`/`Ag` placeholders. |
| Q8 | Top-nav identity for Up & Down — prompt D6 drafted (purple, **no** per-second timer: RG + perf). |

## Parked (Ali's asks, deliberately not ridden along with the feature)

- **P1** — the full design-system archive ZIP from Claude Design → becomes
  `docs/design-system/v2-<date>/`. Export prompt is drafted.
- **P2** — repo-wide design-asset cleanup. Must happen **after** P1.

---

Tell me what to work on, or say **"continue"** and I will pick up at Phase 1c
(`updown-config.ts` — the asset/chain registry).
