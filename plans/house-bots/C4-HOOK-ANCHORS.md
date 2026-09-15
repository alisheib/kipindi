# Commit 4 · holder-hook (A2) and money-hook (F7) anchors (working aid, not an authority)

> Re-derived read-only on 2026-09-15 (sixth session, OMEGA-COMPILE01) at `10f4cd2a`, for §5 steps 7, 9 and 10. The
> documents cited in C4-SPEC win; re-derive every `file:line` again before wiring. Finding: none of these source files
> changed since `624f6038`, so C4-SPEC §2's line numbers still stand; the notes below add what §2 did not say.

Short names (all under `src/`): **PR** `lib/server/password-reset.ts` · **US** `lib/server/user-service.ts` · **RG**
`lib/server/responsible-gambling.ts` · **WF** `lib/server/wallet-freeze.ts` · **KYC** `lib/server/kyc-service.ts` · **AUTH**
`lib/server/auth-service.ts` · **AGT** `lib/server/agent-application-service.ts` · **PRIV** `lib/server/privacy.ts` · **EV**
`lib/server/email-verification.ts` · **2FA** `lib/server/player-2fa.ts` · **ER** `lib/server/erasure.ts` · **WS**
`lib/server/wallet-service.ts` · **PA** `app/admin/players/[id]/actions.ts` · **SA** `app/admin/staff/actions.ts` · **AML**
`app/admin/aml/actions.ts` · **DEMO** `app/auth/demo/route.ts`.

"Restructure" means the function `return withLock(...)`s: its result must be captured first, and the hook placed after
the lock returns.

## Holder-change writers (A2)

| Row | Write | Function | Lock (outer end) | Inside another lock? | Hook slot · success condition | Nearby anchors |
|---|---|---|---|---|---|---|
| 1 settings password | PR:330 | changePassword:293 | none | no | after 330 · reaching the line | none |
| 2 reset link | PR:244 | consumeResetToken:229 | none | no | after 244 · reaching the line | none |
| 3 officer temp | PR:275 | adminResetPassword:262 | none | no | after 275 · reaching the line | none |
| 4 erasure nulls hash | ER:456 | anonymizeClosedAccount:170 | none | — | no hook (refused while live) | `erasure.anchors.mjs` :147/:174 (not within ±5) |
| 5 closure | US:105 status, US:111 wallet | closeAccount:85 | none | no | after 112 · reaching the line | none |
| 6 self-exclusion | RG:307 status, RG:308 freeze | selfExclude:289 | none here (the freeze takes `wallet:` inside WF) | no | after 308 · the freeze result is discarded — capture it | none |
| 7 cooling-off | RG:348 | coolOff:335 | none | no | after 348 · reaching the line | none |
| 8 own limits | RG:248 upsert | setLimits:185 | none | no | after 248 · `deferredIncrease` tells a deferred loosening | `rg-doors.anchors.mjs:149` is STALE (inherited red) |
| 8b delayed raise | RG:133 (five blocks 102–131) | effectivize:99 | none | via getRgSettings | no hook (L2 sweep only) | none |
| 9 suspend | PA:122 | suspendPlayerAction:94 | none | no | after 123 | none |
| — restore / reopen | PA:189 status, PA:197 freeze lift | restorePlayerAction:140 | none | no | after 197 · `selfExcluded` tells reopen from restore | none |
| 10 freeze add/remove | WF:64 | applyFreeze:52; wrappers addWalletFreeze:90, removeWalletFreeze:95 | `wallet:<userId>` 53–86, returned | YES inside `kyc:` (KYC:919 from 248/373/1184; KYC:936 from 1112/1157/1189; KYC:1025; WF:131); not locked at RG:308, PA:197, WF:159, WF:194, `refused-funds.ts:311`, DEMO | restructure the wrappers · `r.ok && r.changed`; `runOutsideLock` for locked callers | none |
| 11a underage refusal | KYC:250 | submitIdentityStep:219 via underSubmissionLock:189 | `kyc:` call ends 253 | no | after 254 · `refused.ok` | `id-documents.anchors.mjs:213` (7 lines above) |
| 11b NIDA refusal | KYC:375 | submitIdentityStep:219 | `kyc:` call ends 379 | no | after 382 · `nidaRefused.ok && nidaFinal` (non-final NIDA codes also write REJECTED) | none |
| 11c officer final refusal | KYC:1186 | reviewKyc:1054 | `kyc:` 1095–1204, returned | on APPROVE only, from AGT:1288 inside `agent:` | restructure · `r.ok && decision==="REJECT" && isFinalRefusal(rejectCode)` | `refused-funds.anchors.mjs:19` quotes 1184–1186 |
| — reopen refusal | KYC:1024 (+ lift 1025) | reopenFinalRefusal:981 | `kyc:` 991–1051, returned | no | restructure · NOTE 1048 returns ok:false AFTER the reset when the lift fails | none |
| 12 staff role | SA:36 | applyRoleChange:28 | none | no | after 36 (or 40 after session revoke) | none |
| 12b bootstrap promotion | AUTH:1050 | loginWithPassword:891 | `login:` 964–1114 | not checked | restructure + an outer flag (`effectiveRole` is inside the lock) | `rg-doors.anchors.mjs:48` quotes AUTH:1001 |
| 13a agent approved | AGT:1308 | approveAgent:1257 | `agent:<applicationId>` 1264–1317 | no | restructure · `r.ok` | none |
| 13b agent revoked | AGT:1406 | revokeAgent:1396 | `agent:<userId>` 1400–1417 | no | restructure · `r.ok` | none |
| 14 erasure request | PRIV:93 push (sync; persist 94 not awaited) | fileDsarRequest:80 | none | no | after 94 · `r.type === "ERASURE"` | none |
| 16 lockout | AUTH:975 | loginWithPassword:891 | `login:` 964–1114 | not checked | restructure + an outer flag (`shouldLock` is inside; 947 also returns RATE_LIMITED before the lock) | `rg-doors.anchors.mjs:48` (26 lines away) |
| 17 email cleared / set | EV:142 / EV:176 | setUserEmail:114 | none | no (KYC:333 calls it before its locks) | after 142 / after 176 · officer stamp when `opts.byOfficer && !stampCounts` | none |
| 18 2FA on / off | 2FA:35 / 2FA:77 | confirmPlayer2fa:32 / disablePlayer2fa:71 | none | no | after each | none |
| other writers | KYC:1120 (PENDING_KYC→ACTIVE, inside `kyc:`, nested in `agent:` via AGT:1288); AUTH:625 registration create inside `register:` 589–763; AUTH:418 OTP signup create; DEMO:216 create (dev only) | | | | walker must know them | |

## Money events (F7)

| Event | Write | Function | Lock (outer end) | Inside another lock? | Hook slot · success condition |
|---|---|---|---|---|---|
| deposit confirmed | WS:462 | settleDepositConfirmed:396 | `wallet:` 400–469 → `outcome` | no | 471 `if (outcome.credited && outcome.txn)` |
| deposit under RG lockout | WS:436 (in the lock) | same | same | no | branch 519–537 `outcome.rgReversed && outcome.txn` |
| deposit failed | WS:567 | settleDepositFailed:564 | none | no | after 568 (returns true at 582) |
| withdrawal requested | WS:1780 adjust, 1788 txn | withdraw:1502 | `wallet:` 1745–1816 | no | 1825 after `if (!hold.ok)` and the duplicate return; dispatch failure refunds at 1912 |
| AML hold | WS:1945 | withdraw:1502 | none | no | inside `if (result.status === "AML_REVIEW")` 1942–1949 (unreachable while the flag is off) |
| AML approve → dispatch | WS:767 | dispatchApprovedWithdrawal:717 via AML:113 | inner `wallet:` 764–769; outer `aml-txn:` AML:70–128, returned | YES — the whole dispatch (network call 773, settleWithdrawalConfirmed 811) runs in `aml-txn:` | restructure AML:70 · `r.ok && r.stage === "complete"` (stage 1 also returns ok) |
| withdrawal paid | WS:610 adjust, 613 txn | settleWithdrawalConfirmed:588 | `wallet:` 591–617 | yes from WS:811 (`aml-txn:`) | 618 `if (done)` |
| withdrawal failed | WS:866 adjust, 867 txn | settleWithdrawalFailed:829 | `wallet:` 858–869 | no | 870 `if (done)` |
| officer adjustment | WS:2622 | adminAdjustBalance:2599 | `wallet:` 2611–2660, returned | no | restructure · `r.ok` |
| AML reject | AML:167 adjust, AML:171 txn | rejectAmlAction:131 | `aml-txn:` 145–201; inner `wallet:` 160–169 | no | restructure · `r.ok` |

## Platform findings outside house-bot scope (recorded, not fixed — PROGRESS "Later" list)
- **`rejectAmlAction`'s refund is not atomic** (AML:167 wallet adjust and AML:171 FAILED write pass no `tx`; 171 is outside the inner wallet lock) — the defect `settleWithdrawalFailed`'s own comment describes and fixes there. A money-path platform item for Ali.
- `scripts/anchors/rg-doors.anchors.mjs:149` quotes text no longer in `responsible-gambling.ts` (the known inherited `test:red-anchors` red).
- `effectivize` has five delayed-raise blocks (RG:102–131); C4-SPEC §2 row 8 named only the loss-limit block. None fires a hook; the L2 sweep covers them.
