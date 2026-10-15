# S14 staff production proof and agency sign-off packet

**Prepared 2026-10-15 · Status: ready for review, execution pending.** This packet is an operator handoff, not evidence that a payment, bet, agency approval, or launch happened. The controlling requirements are [VODACOM-PLAN.md](../VODACOM-PLAN.md) §5 S14 and the [S14–S16 readiness record](vodacom-s14-s16-readiness-20261015.md). Record completed checks in [vodacom-s14-evidence.json](vodacom-s14-evidence.json) only after the linked redacted proof exists.

## Release handoff before staff spend money

The integrator gives the named operator a private green-light note containing:

- The **full 40-character production commit**, deployment read-back time, `/api/health` result, migrated database result, and effective `simpleJourney: STAFF_PREVIEW`. Verify the public site still serves classic pages without a preview pass.
- The exact integrated S8–S13 release proof: build, full relevant gates, local `e2e:journey` with mock rail, 52/52 deck-element read, viewport matrix, adversarial/refute proof, and predeploy gate census. A green source branch alone is not the production release.
- The selected open question, side, and a stake of **TZS 1,000**; confirm the question remains open, the account is eligible, and the spend/loss limits permit the wager. The displayed winnings are an estimate, never a promise.
- The chosen funding mode: `existing-balance` or `deposit`. For `deposit`, use an enabled **Selcom mobile-money** method and an operator-controlled phone. The minimum deposit is TZS 1,000. Card checkout recovery remains held until a provider-confirmed redirect host is verified. Selcom deposits and withdrawals already operate; this proof ends at the bet ticket.
- A private channel for the staff operator to report references and screenshots. Keep passwords, PINs, full phone numbers, payment credentials, preview tokens, and unredacted receipts out of Git and chat.

Ali will arrange the staff operator and agency contact. The preview is opt-in: staff turn it on at `/admin/journey`; a valid pass survives sign-out and sign-in in that browser. The wager is made from a **dedicated eligible player account operated by staff**, not by assuming a staff role itself grants player betting access. Record both identities privately. Do not reuse `mobile01` for another sign-in on the strength of the earlier one-attempt authorization.

## One real TZS 1,000 journey: operator card

| Step | Operator action | Integrator observation to retain privately |
| --- | --- | --- |
| 1. Start | Note actual UTC/EAT time, device/browser, production host, and the agreed operator and player account. Staff turn on their preview at `/admin/journey`; verify the visible **Preview** marker and `STAFF_PREVIEW` state. Sign out of the staff session, then sign in to the designated player account in the same browser. | Deployment SHA, preview state and marker, redacted operator/account identifiers, account eligibility and starting spendable balance. |
| 2. Open bet | Open the preselected question. Choose the agreed NDIO/HAPANA side and enter **TZS 1,000** in the sheet. Read the complete question, approximate payout, fee/commission note, and balance. | Screenshot of the sheet with personal data masked; market ID, side, stake, displayed approximate payout and time. |
| 3. Fund if needed | If the account lacks spendable funds, follow **Weka pesa** from the low-balance sheet. Verify the pending strip keeps the same question, side and TZS 1,000 stake. For the agreed `deposit` path, submit **one** TZS 1,000 Selcom mobile-money payment and answer the provider prompt on the operator-controlled phone. | Low-balance and pending-strip screenshots; chosen enabled method, amount, payment status, masked gateway and deposit references. If `existing-balance`, record that the deposit leg was not exercised. |
| 4. Wait and return | Wait for an actual provider confirmation and one wallet credit. A pending, unknown, or contradictory payment stays pending for provider review. After a confirmed deposit, return to the preserved bet; it must still require a separate player press. | Gateway status and time, wallet transaction/ledger reference, before/after spendable balance, returned question/side/stake, and no automatic position. |
| 5. Place once | Recheck the market, side, TZS 1,000 stake and current estimate, then press the final bet action **once**. Read the receipt and the ticket in Tiketi zangu. | One bet reference/position ID and one `BET_PLACED` row for that ID; before/after wallet balance, receipt screenshot, and the production `?me=1` answer for the same market. The integrator reconciles these with the production database by read-only means. |
| 6. Close | Report pass or the first failing step. Keep original screenshots and provider records in the private evidence store; prepare a redacted read record under `docs/qa/`. | Reviewer name, actual timestamp, exact deployed SHA, redacted reference suffixes, count of credits/positions/ledger rows, and open exceptions. |

**Stop conditions.** Stop the journey and notify the integrator if the production SHA or preview state differs from the green-light note, the preview marker is absent, the account/market/amount differs, limits refuse the wager, a payment is pending or uncertain, a balance changes without a confirmed matching transaction, or more than one credit/position appears. Do not make a second payment or bet while the first outcome is uncertain. The integrator resolves the state from provider and ledger evidence before any further operator action.

## Redacted production record to complete after observation

Copy this section to a new dated `docs/qa/` read record **after** the real journey. Replace every bracket with an observed value; retain the original identifying evidence privately. A blank template cannot satisfy `gate:s14`.

| Field | Observed value |
| --- | --- |
| Operator and player account, private evidence location | `[private reference only]` |
| Reviewer and actual UTC/EAT observation times | `[name, ISO time, EAT time]` |
| Production host, full deployed SHA, health/database, `simpleJourney` | `[observed values]` |
| Funding mode and starting/ending spendable balance | `[existing-balance/deposit; TZS values]` |
| Selcom method, TZS 1,000 deposit, status and masked payment/deposit references (if used) | `[observed values or not exercised]` |
| Market ID, side, TZS 1,000 stake and approximate quote | `[observed values]` |
| Pending bet preserved and separate final press | `[observed sequence and timestamps]` |
| Bet/position reference, ticket and `BET_PLACED` evidence | `[masked reference, one/one counts]` |
| Ledger and provider reconciliation; duplicate count | `[read-only observation and counts]` |
| Screenshots and original evidence location | `[private reference; redacted committed paths only]` |
| Result and exceptions | `[pass/fail, any corrective action]` |

When the read record is real, set `productionStaffJourney.fundingMode`, `betReference`, and its `evidence` object in the JSON. For a deposit, also set `depositAmountTzs: 1000` and `depositReference`. The evidence object needs a committed `docs/qa/` path, reviewer, actual ISO timestamp, and full observed commit SHA. A masked reference in the committed record must still let the authorized reviewer reconcile the original privately.

## Agency preview and written decision

The Owner creates the seven-day revocable visitor link in `/admin/journey`; the integrator prepares a side-by-side PDF made from the **actual integrated production preview screens** and the five agency frames. The Owner or an explicitly authorized sender shares them privately with the agency. A draft or unsent link is not sign-off. Do not commit the link token or unredacted player screens.

**Copy for Ali to send after the material exists:**

> Subject: 50pick Simplified Journey — production preview for written review
>
> Hello `[agency contact]`,
>
> Please review the private seven-day preview link `[send privately]` and the attached side-by-side PDF against your five Simplified Journey frames: home, bet sheet, low balance, deposit, and How to Play. The preview reflects production commit `[full SHA]` and remains limited to invited viewers. Please check the screen order and wording, the approximate payout language, the low-balance → deposit → preserved bet return, and the final separate press to place a bet. The screenshots show the current 50pick visual system and the approved updates to NDIO, the TZS 500 stake minimum, the TZS 1,000 deposit minimum, and the How-to limits link.
>
> Please reply in writing with either **approved for public launch** or a numbered list of changes required, naming your reviewer, organization, and date. If you approve only certain languages or devices, state that scope. We will resolve any blockers before asking Ali for the launch decision.

**Agency reply format to request, not to pre-fill as approval:**

> I, `[name and role]` of `[agency]`, reviewed the five production-preview screens and side-by-side PDF for 50pick commit `[full SHA]` on `[date/time]`. My decision is `[approved for public launch / changes required]`. Scope reviewed: `[languages, devices]`. Required changes or accepted deviations: `[list or none]`. The signed/reply original is retained at `[private evidence location]`.

If the agency lists blockers, record them and keep `agencyDecision.decision` as `pending` until resolved and a new written decision arrives. If Ali chooses the plan's **owner override**, retain his own explicit dated written decision with its reason and scope; set `owner-override` only after that exists. The agency's or Ali's original stays private, while a redacted decision record identifies the reviewer, exact commit, decision, date, scope, and private retention location.

## Owner review gates after the packet

1. **S14:** the integrator reads all 52 deck checks and five proof artifacts, the real TZS 1,000 staff record, and the agency's actual written sign-off or Ali's explicit override. Then run `npm run gate:s14`; a validator pass still needs human review of the cited artifacts.
2. **S15:** Ali reviews a complete 14-day baseline, integrated release proof, rollback readiness, and then-current production configuration. Admin two-factor authentication and webhook-secret changes were intentionally deferred during `STAFF_PREVIEW`; do not silently treat that deferral as S15 configuration approval. Record the fresh security decision and masked Railway read-back, then obtain Ali's explicit dated launch go before an `ACTIVE` flip.
3. **S16:** record `launchAt` from the actual S15 production read-back, observe at least seven full real days and the plan's measures/rollback rules, obtain the agency acknowledgment, and prove shelving. Time elapsed and approvals cannot be inferred from this packet.
