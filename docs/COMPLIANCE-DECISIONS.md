# 50pick — Compliance Decisions Log

> Deliberate, owner-authorised decisions that touch a compliance control. Each is
> recorded so a future audit/session understands it was intentional and does NOT
> silently "restore" a prior behaviour. Newest first.

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
