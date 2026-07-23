# 50pick — Compliance Decisions Log

> Deliberate, owner-authorised decisions that touch a compliance control. Each is
> recorded so a future audit/session understands it was intentional and does NOT
> silently "restore" a prior behaviour. Newest first.

---

## 2026-07-23 · Fee model: "loser-share" (Jay) + pre-bet estimate — new polls

**Owner decision:** Ali, explicit, 2026-07-23 (authorised in-session), on the recommendation
of accountant Jay (`Proposal/50pick Calculations.xlsx`, reviewed in `docs/FEE-MODEL-DECISION.md`).

**What changed (FUTURE polls only):** a new fee model, `loser-share`, is now the default a
new poll freezes at creation:
- **Fee = (platformFeeRate + operatorFeeRate) × the LOSING pool** (Jay's default: 3% + 10% =
  **13% of the losing side**), instead of `capped-commission`'s `min(commission·pool, ⅓·smaller)`.
- **Players see a fixed "possible winnings" estimate** pre-bet = `stake × (1 + estimatedWinningsRate)`
  (Jay's default 0.5 → **1.5×**), with a mandatory "estimate only — the pool sets the real
  amount" disclaimer. This is shown ONLY on `loser-share` polls.
- Admin-managed at **/admin/config → Fee model** (`feeModel`, `platformFeeRate`, `operatorFeeRate`,
  `estimatedWinningsRate`, `showEstimatedWinnings`); a change requires a confirm and is audited.

**Two compliance postures this DELIBERATELY overrides (for `loser-share` polls only):**
1. **Outcome-neutral fee (F6 §3.1).** `loser-share` is outcome-DEPENDENT — the fee is a slice
   of whichever side loses, so the same pools yield a different fee per outcome. This is an
   explicit owner override; the settlement audit records `payoutModel: "whole-pool-loser-share"`
   and the two rate slices so an inspector can still recompute it.
2. **Policy D3 (no pre-bet payout number).** `loser-share` polls show the fixed 1.5× estimate
   before betting. The disclaimer keeps it honest (it is a marketing estimate, not the payout).

**What did NOT change (the safety rails hold):**
- **No mint / no leak.** `Σ payouts + fee == pool` exactly, proven under `loser-share` by
  `money-invariants` (default is now loser-share), `jay-fee-model`, and `ledger` (double-entry).
- **Winner floor.** A correct call is never paid below its stake — `netPool = winningPool +
  losingPool·(1 − rate) ≥ winningPool`, `assertWinnerFloor` still enforced.
- **Taxes out of OUR fee.** TRA 10% + GBT 5% still come out of the 13%, never the player.
- **No mixed maths — the whole point.** The model is FROZEN per poll (`feeSnapshot.feeModel`,
  schema `v:2`). Every poll created before this change has NO `feeModel` and is read as
  `capped-commission` forever (`snapshotOrLegacy`), so existing/in-flight/settled polls are
  untouched. `capped-commission` remains fully implemented and tested (`fee-model.test.mts`,
  pinned to it).

**Where it lives:** `src/lib/payout.ts` (`FeeModel`, `poolFee(…, winningSide?)`),
`src/lib/server/market-config.ts` (RateConfig + snapshot), `market-service.ts` (settlement
passes the winner), admin `config/` + `markets/new`, player `conviction-dial` / `bet-confirm-modal`.
Golden test: `scripts/jay-fee-model.test.mts` (reproduces Jay's sheet: 84,500 / 2,080).

**Guardrail (⛔):** do not "restore" outcome-neutrality or D3 for `loser-share` polls — the
override is intentional and owner-authorised. Do not change existing polls' frozen model. Do
not delete the `capped-commission` model (existing polls settle on it).

---

## 2026-07-21 · Player terminology: "one-sided market" → "one-sided win" (licence)

**Owner decision:** Ali, explicit, 2026-07-21 (authorised in-session). **Critical for the
GBT licence — apply everywhere.**

**What changed:** every textual occurrence of the term **"one-sided market"** (and
"one-sided markets") is now **"one-sided win"** — the player-facing disclaimer label in all
three locales, the code comments/audit-reason text, and the design docs:
- UI (`src/lib/i18n-dict.ts` → `market.oneSidedMarket`): EN "One-sided win" · SW
  "Ushindi wa upande mmoja" · ZH "单边获胜" (rendered on `/markets/[id]` when a pool is
  all on one side).
- Code: `market-service.ts` settlement comment + the `market.resolved.one_sided_refund`
  audit `reason` string.
- Docs: `F6-LIQUIDITY-DESIGN.md`, `perfection-plan.md`.

**What did NOT change (deliberate scope):**
- The **mechanic is identical** — a one-sided pool still issues a **full refund at 0% fee**
  (no money moves differently). Only the *label* changed.
- The disclaimer **body copy stays factually truthful** — it still explains that every stake
  is refunded and there is no opposing pool to pay winnings from. We do **not** claim anyone
  "wins money" on a one-sided pool (that would violate the A‑5 no-fabrication rule). The
  prominent term is the licence-preferred "win"; the explanation remains the honest refund.
- The **machine identifiers are unchanged** on purpose — the audit action stays
  `market.resolved.one_sided_refund`, and the code symbols (`isOneSided`, `notifyOneSidedRefund`,
  `oneSidedRefundHtml`, the `oneSidedMarket` i18n key, `oneSidedBody`) keep their names.
  Renaming symbols is refactoring with no licence value and real regression risk; the licence
  concern is the *text a player/regulator reads*, which is now consistent.
- Other "one-sided" **mechanic phrases** ("one-sided refund/pool/poll") are left as-is — they
  are not the "market" term and are accurate descriptions of the refund.

**Guardrail (⛔):** do not revert "one-sided win" back to "one-sided market" in player copy or
docs, and do not "correct" it to imply a real cash win — the body must keep truthfully
describing the full refund.

---

## 2026-07-17 · Solo-resolution override: real-money-state lock (replaces the NODE_ENV hard-lock)

**Owner decision:** Ali, explicit, 2026-07-17 (authorised in-session).

**Control:** `allowConflictedResolution` (the "solo resolution" toggle on
`/admin/resolver-queue`). When ON it lets ONE officer resolve a market end-to-end
even if they hold a position in it — relaxing the POCA §16 officer-conflict block
AND the two-officer / self-countersign rule. Their own position settles like any
player's.

**Why POCA §16 matters:** a licensed operator must never let an officer with a
financial interest in a market decide its outcome — otherwise an admin could pay
their own bets with real money. This is a GBT licensing requirement.

**What changed:** previously (audit C7, 2026-07-15) the override was
UNCONDITIONALLY disabled whenever `NODE_ENV === "production"`. That made it
impossible to exercise solo-resolution on the production 50pick.tz deployment,
which blocked pre-launch testers. Per Ali's decision, the lock now keys off
**real-money state**, not NODE_ENV:

- `isConflictOverrideHardLocked()` = `NODE_ENV === "production" && TEST_FUNDING !== "true"`.
- `getConflictedResolutionAllowed()` returns `false` whenever hard-locked, else the
  persisted admin flag governs.

**Net behaviour:**
| State | Solo-resolution |
|---|---|
| Local / staging (`NODE_ENV !== production`) | admin flag governs |
| **Pre-launch prod** (`TEST_FUNDING=true`, test float, no real money) | **admin flag governs — testers CAN enable it** |
| **Real money live** (`TEST_FUNDING` unset at go-live) | **HARD-LOCKED off, flag ignored** |

**Why this is safe:** the relaxation is bound to the *provable no-real-money* state.
Unsetting `TEST_FUNDING` is already a **required go-live step** (`LAUNCH-GO-NO-GO`
§5) — the same action that stops minting the test float also auto-hard-locks
solo-resolution. You cannot have real money live with the override active. And
`TEST_FUNDING=true` on real money would itself mint un-ledgered money that the
nightly trial-balance screams about immediately, so the failure mode is already
loudly detected by an independent control.

**Defence-in-depth + trail:**
- The toggle action refuses to ENABLE when hard-locked (`enable_blocked` COMPLIANCE
  audit); it can always be turned OFF.
- The resolver-queue UI renders a clear "Solo resolve · locked (live)" disabled
  state when hard-locked, so a tester is never confused by a toggle that won't latch.
- The boot check logs loudly if the flag is left ON with real money live (runtime
  still forces it off), and a friendly note when it's active pre-launch.
- Every toggle and every actual bypass (`market.resolve.conflict_overridden`,
  `market.resolve.solo_overridden`) is written to the COMPLIANCE audit chain.

**Guardrail for future work (⛔):** do NOT re-widen `isConflictOverrideHardLocked()`
to a plain persisted flag, and do NOT revert it to a raw `NODE_ENV` lock without
re-reading this entry. The lock MUST stay coupled to real-money state.

**Code:** `src/lib/server/test-overrides.ts` · `admin/resolver-queue/conflict-override-action.ts`
· `admin/resolver-queue/conflict-override-toggle.tsx` · `admin/resolver-queue/page.tsx`.
**Tests:** `test:conflict-gate` (the lock matrix, 10/10) · `test:solo-resolution`
(full effects, 18/18) · `test:officer-conflict` (33/33).
