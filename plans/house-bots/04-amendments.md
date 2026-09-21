# House Bots — verified plan amendments (ALL MANDATORY)

> # ⛔ THE HOUSE REPORTS, THE HOUSE LINES, THE STAFF-EDGE ALERT AND THE INTERNAL RECORD ARE SUPERSEDED (D20)
> **Owner ruling D20 (Ali, 2026-09-17): a house bot's account is a normal player in every report.** Every report,
> statutory filing (Gaming Board monthly pack, FIU SAR, match integrity, daily ops), admin count, finance or insights
> figure and harm/AML detector treats a house bot's account exactly like any player's account, and no report, CSV, memo,
> column, line, chip, tag, alert or record names house bots or splits house money out. D20 ranks just below D19, which
> still binds everything, and outranks this file wherever they differ. **Struck in this file, each marked in place:** R1
> whole (the house-liquidity report, the house-market statement, the audit index, the transactions CSV `house` filter and
> `house_bot_id` column, the owner-only per-bot CSV); R2 whole (the house stake lines on admin screens, the emergency-void
> notice's house share, the overview exposure split); R3's §9 additions (the harm and AML exclusions, the compliance
> holder chip, the FIU SAR Context column, the GBT memo, the match-integrity house parts); R4's leaderboard option and
> source pin, and F9 whole; R5's house projection, whose last home was the owner-only internal record, with the officer
> player page's house chip and row tag; R7's R1 index; R8's house report builders; R9 and G2 whole (house stakes in
> decision audits, the KYC card's house line); G1 whole; the staff-edge alert and scorecard (N1 §4.5, N1 §5's threshold
> default and clearing rule, N1 §7, N1 §10's Board list, N1 Tests, N2 §7, and items of "5. Explicitly NOT built" and
> "6. Owner summary"); the report, R9 and data-rights parts of N1 §9 and N2 §9 with their tests and placement rows; and
> the dropped-gap pointers that named them (HB-LC-17, HB-LC-20, HB-LC-27, CA-17, CRA-02, CRA-08, CRA-11, CRA-14,
> CRA-16 to CRA-22, FS-22, FS-25). Rulings: C5-SPEC 187–213, with 211 and 212 kept only as recorded platform defects
> L26/L27; 218–231; 233–234; 236–238; 239's internal-record half; 240–242; 246; 254's overview split; 256; 261–262.
> **Left to later rulings:** step-3 readers such as the `book.ts` entry split and `houseStakeByMarket` stay only where
> checkpoint C5-5b names a remaining caller or a Commit 7 scope line; the `gStaffEdge*` columns and fields built in
> Commit 1, the "Record reimbursement" owner action and CAP_EXPOSURE's held amount go to Commit 7's rulings.
> **Not touched by D20:** every A- and C-item, R6, R7's `HOUSE_AUDIT` table and payload allowlist, R8 for the report pack
> and RG engagement, P2–P4, R3's §3 loss rules and marker source pin, R4's no-reward rule, the money rules (house stakes
> are cash only, never cashed out, and earn no wagering progress, commission or reward), the engine and its other admin
> alerts, Enter now and targets, and erasure. Accepted by Ali: statutory figures include 50pick's own house stakes as
> player activity, and the harm and AML detectors can flag a bot account like any player's; W21 and W22 are moot. Read
> PROGRESS.md "OWNER RULING D20" and `plans/house-bots/C5-D20-REPLAN.md` first.

> # ⛔ HOUSE BOTS ARE NEVER PUBLIC, AND THE HOLDER SEES NOTHING (D19)
> **Owner ruling D19 (Ali, 2026-09-16): house bots are never public.** No rulebook, Terms, privacy, FAQ, home or chatbot
> text mentions them; no META or `TERMS_VERSION` bump; no announcement. The holder sees nothing: no chip, no label, no
> house wording in any refusal, and no house-bot notice, email or summary; every alert goes to admins only. The chatbot
> discloses nothing and never lies (a forbidden-phrase guard). D19 outranks this file, and D20 ranks just below it.
> **Struck in this file, each marked in place:** P1's privacy line, versions, chatbot bullet, disclosure tracking and the
> Board draft's notice-waiver section, with the Board-disclosure lines N1 and N2 built on that tracking; P2's Terms §10
> waiver and legal-page comment block; P4's "stated" surfaces; N1 §10's and N2 §9/§10's public text; A17 (h), the
> liquidity label; the house refusal copy (A12, A18 (n), N1 §3 and its placement row); every holder notice, email,
> summary, chip and Stop action (A2's Holder column and row 15, A3, A5, A8, A16, A18 (o), C13, F2, F6, N1 §4.5, §4.6 and
> §7, N2 §7, and their tests); and F2's public sunset line. **Not touched by D19:** the switch ships OFF, D3/D3b, D5
> (consent by password), D6, the admin console and its alerts (apart from the disclosure-tracking lines above), audits,
> internal docs, the engine rules, the private Board draft apart from that one section (D19b) and the chatbot's
> forbidden-phrase guard (D19d). Read PROGRESS.md "OWNER RULING D19" first.

Order of authority: this file > 02-sealed-flows.md / 03-design-spec.md > PLAN.md body. Overlaps between amendment sets are resolved in PLAN.md §18.

Contents: A1–A24 (flows, data, money seam, engine) · C1–C3, C8–C15 (rules, consent, notifications, console) · R5–R9, P2–P4 (reporting, public text) · S/F (release, verification, future safeguards) · earlier set C4–C7, R1–R4, P1 and sequencing notes · N1–N2 (Enter now; targeted polls and exact timing) (last section).

# House bots: plan amendments A1–A24 (§1 Flows, §2 Data model, §3 Money seam, §4 Engine)

All code paths are under `C:\kipindi-main\`. Every `path:line` below was checked against the working tree (HEAD `ac411357`, which includes the local KYC work).

> ⚠️ **Line anchors in this file are as of 2026-09-13.** Since then the KYC-at-withdrawal release reached `origin/main`, and its audit fixes moved code in `kyc-service`, `auth-service`, `wallet-service`, `wallet-freeze`, `user-service` and `notification-service`; `TERMS_VERSION` moved to `src/lib/terms-version.ts`. Any "local only" KYC commit or `origin/main` SHA quoted below is history. Re-derive every `path:line` against the merged code before relying on it (PROGRESS.md RESUME AT).

Numbering follows the slots in the sequencing notes where they name the content: A1, A2, A3, A7, A8, A9, A11, A12, A15, A18, A19, A20, A21, A22, A23. The remaining numbers are assigned here. Slot A6 (data-rights export, D10) is outside §1–§4 and is not written.

## 0. Dropped gaps

**Already covered elsewhere**
- **HB-ACC-16:** seal-flows §6 (a REHASH refreshes the fingerprint). Its writer pin is merged into A2.
- **HB-ACC-19, HB-ACC-20:** C4 (reserved attempts, verify against the fresh row, resume checkbox, split outcome).
- **HB-ACC-26:** seal-flows X4 plus the §2.6 step 7 mismatch check.
- **HB-ACC-30:** seal-flows L1 (RESET_LINK) and §2.2.
- **FS-02:** seal-flows L1/L2/L3 and the §2.2 erased row.
- **CA-03:** the sign-out half is ruled out (see A1); the immediate pause is seal-flows L1.
- **HB-LC-05:** contradicts the accepted R3 (losses counted by the day the stake was placed).
- **HB-LC-14:** R3's source pin and book.ts reading marked transactions.
- ~~**HB-LC-17, HB-LC-20, FS-25:** R2.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R2 is struck (C5-SPEC rulings 192–196, 254), so no amendment covers these ids.
- **HB-LC-24, FS-29:** R3 (fees from transactions); the frozen-rate part is in A14.
- **HB-LC-27:** the projected loss already counts open stakes as lost; ~~R2 and (h) cover the rest.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R2 is struck (C5-SPEC rulings 192–196), and (h), A17's liquidity label, was already removed under D19 (C4 rulings 143–144); the projected-loss rule stands.
- **HB-LC-31, CRA-28, FS-26:** I2 and I10; stage-1 is an early close in A16, so only a test line is added.
- **ENG-26:** R3's midnight test.
- **ENG-33:** mechanics merged into A8 and A10.
- **ENG-35, CA-11, CA-21, CA-24:** C6.
- **FS-05:** R4.
- **FS-30:** P1.
- **FS-28:** plan (e) plus the money test "no cash-out".

**Not in §1–§4**
- HB-ACC-12, CRA-04, CRA-10: data-rights export (slot A6).
- HB-ACC-36, HB-ACC-37: console warnings and the Remove modal.
- ENG-28, FS-17: notification volume and channels (§7).
- FS-20: min-gap bound derivation (§5).

**Against a ruling, speculative, or partly false**
- **FS-31:** contradicts D5 (consent is password only). It becomes an information row in A2.
- **FS-23:** the bet identity gate was deleted with a "do not restore" note (`market-service.ts:1079-1082`). Any new refusal reason is caught by A10's compile check.
- **FS-34:** there is no currency-change path.
- **FS-06:** retiring the programme is an owner-level decision; master OFF, Remove and the engine env var are enough for v1.
- **FS-09:** already covered by seal-flows §3.2/§3.5/§3.7 admin alerts, apart from the diff alerts in A22.
- **HB-ACC-08, pause or refuse options:** the owner ruled alert only (A21).
- **HB-ACC-29, "consent stays intact":** overruled; any RG pause voids consent (A3).
- **seal-flows X3, "status causes don't block re-verify":** superseded for RG causes (A3).
- **ENG-07, the premise:** the start script is `prisma migrate deploy && next start` (`package.json:12`), so migrations apply at boot. What remains is in A23.

---

## 1. Amendments

### A1 · RECORD ONLY · Signing out other devices on a password change is not built
*Merged:* HB-ACC-07, CA-03 (the sign-out half).

*Evidence:* the three password writers (`password-reset.ts:242`, `:271`, `:326`) never call `revokeUserSessions`. Suspend (`players/[id]/actions.ts:122`), self-exclusion (`responsible-gambling.ts:278`), role change (`staff/actions.ts:39`) and closure (`user-service.ts:121`) all do.

*§13, add risk 7 (and a COMPLIANCE "not in this build" line):* "A password change or reset does not sign out the holder's other sessions (owner ruling 2026-09-13). Recommended hardening, as a separate platform commit: revoke at the three writers, re-mint the session of the device that made the change, and add login copy `kp_revoked=pw`. House consent is unaffected either way, because consent is the fingerprint, never a session."

*Test:* `test:docs` greps the risk line.

### A2 · MAJOR · One holder hook at every writer, and the full change matrix
*Merged:* HB-ACC-01, -09 (partly), -11, -15, -21, -22, -23, -24, -28, -31, -33, -34, -35, FS-14 (approval hook), CRA-05(a).

*Evidence:* seal-flows L1 hooks only the password writes. Every other I9 change waits for the 15 s sweep. Writers confirmed:
- `staff/actions.ts:36`, `auth-service.ts:1049`
- `agent-application-service.ts:1308`, `:1406`
- `players/[id]/actions.ts:121`, `:188`
- `responsible-gambling.ts:130`, `:274`, `:315`
- `user-service.ts:91`, `wallet-freeze.ts:64`, `kyc-service.ts:776`
- `privacy.ts:80`, `auth-service.ts:972`
- `email-verification.ts:134`, `:162`, `player-2fa.ts:35`, `:77`

*§4.1, replace `credential.ts`/`onHolderCredentialWrite` with `holder-hook.ts` `onHolderAccountChanged(userId, event, meta)`:*
- It is fired after the write (`void import().catch(()=>{})`).
- It does one indexed read for a live bot, else returns.
- Under `wallet:<userId>` it re-reads bot, user, wallet, RG settings and privacy queue, recomputes `holderCauses()` (A3) and applies the matrix.
- Writes are conditional, so the hook and the L2 sweep are idempotent together.
- The L2 sweep covers every row below, whatever the master switch.

*§3, sanctioned change (l):* the hook call at each writer. For a user with no bot, output and timing are unchanged.

*Status rules:*
- **ACTIVE:** goes to AUTO_PAUSED (first cause) with `pausedFromStatus=ACTIVE`; PENDING and CLAIMED intents are cancelled conditionally.
- **PAUSED or AUTO_PAUSED:** status is kept, the cause set is updated, event HOLDER_CAUSE_ADDED is written, and admins get a bell only. Rows 5, 11 and 14 also send email.
- **REMOVED:** nothing happens.
- ~~Every holder house notice returns early while `isLockedOut` (`responsible-gambling.ts:349`).~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no house-bot notice or email at all (C4 ruling 149), so nothing is gated here; in the table below the Holder column is struck, and so is row 15's holder-facing "Stop liquidity stakes", because a withdrawal the holder asks for through support is recorded with the officer as actor (C5-SPEC L49, Commit 7).

| # | Change (writer) | Cause | Consent | Admin | Holder | Way out |
|---|---|---|---|---|---|---|
| 1 | Password changed in settings `password-reset.ts:326` | PASSWORD_CHANGED{SELF_CHANGE} | stale | seal-flows A1/A2 | ~~H1 if it was ACTIVE~~ | Re-verify → Start |
| 2 | Reset link `:242` | PASSWORD_CHANGED{RESET_LINK} | stale | same | ~~H1~~ | Re-verify (A4 check) → Start |
| 3 | Support temporary password `:271` | PASSWORD_CHANGED{OFFICER_TEMP} | stale, re-verify blocked | officer-reset copy | ~~"Change the temporary password in Account settings"~~ | holder changes it himself → bell "set his own password" → Re-verify → Start |
| 4 | Erasure nulls the hash `erasure.ts:397` | none (already REMOVED by row 5) | — | — | — | — |
| 5 | Account closed `user-service.ts:91` | ACCOUNT_CLOSED | void | bell + email with balance and open stakes | ~~email only~~ | none: auto-REMOVED (A5) |
| 6 | Self-exclusion `responsible-gambling.ts:274` | SELF_EXCLUDED{until} | void | bell + email | none (RG) | officer reopen (`players/[id]/actions.ts:161-188`) → Re-verify → Start |
| 7 | Cooling-off `:315` | COOLING_OFF{until} | void | bell + email; AlertOnce when the break ends | none | expiry → Re-verify → Start |
| 8 | Own loss limit set or lowered (`setLimits :130`) | OWNER_LOSS_LIMIT while `checkLossLimit(stakeMin)` refuses (rolling 24 h, `:501`) | intact | bell + email "frees HH:MM EAT (rolling 24 h)" | none | window frees or limit raised → Start |
| 9 | Suspended `players/[id]/actions.ts:121` | ACCOUNT_SUSPENDED | intact | bell + email with the officer's reason | none | restore `:188` → bell → Start |
| 10 | Officer or force-reverify freeze `wallet-freeze.ts:64` | WALLET_FROZEN{reasons} | intact | bell + email naming each hold | none (may be AML; no tipping off) | last hold lifted → Start |
| 11 | Final identity refusal `kyc-service.ts:776` | IDENTITY_REFUSED | void | bell + email "officer decides TZS X, which includes 50pick float"; Remove recommended | none | `reopenFinalRefusal` `:825` → Re-verify → Start |
| 12 | Promoted to staff `staff/actions.ts:36`, bootstrap `auth-service.ts:1049` | ROLE_CHANGED{to} | intact | bell + email | ~~"role changed" notice~~ | role back to PLAYER → Start |
| 13 | Agent approved or revoked `agent-application-service.ts:1308`/`:1406` | ROLE_CHANGED{AGENT} / cleared | intact | bell + email | ~~as row 12~~ | revoke → Start |
| 14 | Erasure request filed `privacy.ts:80` | HOLDER_ERASURE_REQUEST | void | bell + email (once per request id) | ~~"stopped while we handle your request"~~ | request withdrawn → Re-verify → Start, or Remove |
| 15 | ~~Holder presses "Stop liquidity stakes" (A3)~~ | HOLDER_WITHDREW | void | bell + email | ~~confirmation~~ | Re-verify → Start |
| 16 | Locked out by failed logins `auth-service.ts:972` | none: no pause, or anyone could stop a bot | intact | AlertOnce SECURITY bell | none | — |
| 17 | Email set or cleared `email-verification.ts:134`/`:162`; officer-set email | none | intact; an officer-set email arms A4 | bell only if officer-set | none | — |
| 18 | 2FA on/off `player-2fa.ts:35`/`:77` | none (D5) | intact | event plus info row | none | — |

*Test (new `test:house-bot-holder-lifecycle`):*
- Each row, with the switch OFF, gives the listed status, cause, recipients and channels.
- With the hook disabled, the sweep produces the same result.
- A user with no bot gets zero extra writes.
- A shrink-only source walker checks writers of passwordHash, role, status, phoneE164, twoFactorEnabled and email, the freeze helpers, the RG upserts and `fileDsarRequest`. It must call the hook; a planted RED fixture fails.

### A3 · BLOCKER · A live cause set, void consent, and re-verify gating
*Merged:* HB-ACC-02, -06, -10, -17, -18, -27, -29, FS-16, and the RG part of seal-flows X3.

*Evidence:*
- F6 lets Start return "until eligibility passes again". After an officer reopens a self-exclusion (`players/[id]/actions.ts:161-188`), or once a cooling-off timer lapses (`market-service.ts:1043-1044`), Start would run on the old consent. That breaks the owner's ruling.
- The RG start stamps survive a re-take (`responsible-gambling.ts:267`, `:312`), and the activation audits are not awaited (`:281`, `:316`). Neither alone is a durable "new pause" signal.

*§2 HouseBot, add:*
- `consentVoidAt timestamptz null`
- `consentVoidCause text CHECK IN (SELF_EXCLUDED, COOLING_OFF, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST, HOLDER_WITHDREW)`

*`pause-reasons.ts`, add:* ACCOUNT_SUSPENDED, ACCOUNT_CLOSED, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST, HOLDER_WITHDREW, UNMAPPED_REFUSAL and RULES_INVALID. ACCOUNT_BLOCKED stays only for an unreadable status.

*F6 and §6, replace the table with:*
- **Causes:** `holderCauses(bot, user, wallet, rg, privacy, fingerprint)` returns the ordered live causes. `pauseReason` is history only.
- **Start** is allowed only when there are no causes (plus the F3 checks).
- **Re-verify** is allowed only when the causes are limited to PASSWORD_CHANGED and CONSENT_VOID, the password-context rows pass, and no RG lockout stands (status SELF_EXCLUDED or COOLED_OFF, or `isLockedOut().locked`). Otherwise: "Re-verify after the break ends."
- **Writing `consentVoidAt`:** by the A2 hook, the L2 sweep, and the mapper on RG or identity refusals.
- **Clearing it:** only by a re-verify whose `verifiedAt` is after the RG end.
- **Start backstop:** refuse if `max(selfExclusionStartedAt, coolingOffStartedAt) > verifiedAt`; a failed read refuses.

*Designate:* inside the insert transaction under `wallet:<user>`, compare `passwordFingerprint(fresh hash)` with the verified fingerprint. On a mismatch: "His password changed a moment ago — enter the new one." No row is created.

~~*F10, add the holder action `withdrawHouseConsentAction`:*~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder has no Stop action, chip or copy (D19c); a withdrawal the holder asks for through support is recorded with the officer as actor, and `withdrawHouseConsent` is reshaped for that in Commit 7 (C5-SPEC L49).
- ~~Holder session only, behind a ConfirmDialog on the /positions chip.~~
- Sets HOLDER_WITHDREW and writes COMPLIANCE `house_bot.holder_withdrew_consent`.
- ~~Copy (en/sw/zh): "Done — 50pick won't place new liquidity stakes from your account. Open stakes settle as normal."~~

*F6 alerts, add:* ~~after VERIFIED the holder gets bell + push + email: "50pick confirmed your permission using your current password at HH:MM EAT. If you did not give it, change your password and contact support."~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder gets no notice or email when consent is verified (C4 ruling 149); the admins' VERIFIED alert (A22) stands.

*Test:*
- Self-exclude, then officer reopen: Start refused. Re-verify is refused while excluded and allowed after; then Start succeeds.
- Cooling-off expiry: Start refused until re-verify.
- With hook and sweep both disabled, the backstop still refuses.
- Every pair of causes, in every clear order, leaves at least one enabled action other than Remove. RED: single-reason gating fails.
- A password change between verify and insert creates no row.

### A4 · MAJOR · Durable password history, plus §2 column rules
*Merged:* HB-ACC-03, -25, -34, ENG-12, FS-07.

*Evidence:*
- The officer-reset audit is fire-and-forget (`password-reset.ts:273`), so seal-flows' "latest password write" read of the audit log can miss it.
- An officer-set email (`players/[id]/actions.ts:232`) followed by a reset link is audited as the holder's own reset (`:244`).

*§2 User (expand-only), add:*
- `passwordSetAt timestamptz null`
- `passwordSetVia text CHECK (REGISTRATION, SELF_CHANGE, RESET_LINK, OFFICER_TEMP, REHASH)`
- Both are written in the same update at registration (`auth-service.ts` create) and at `password-reset.ts:242`, `:271`, `:326`.
- `emailSetByOfficerAt timestamptz null`, written by the officer email writer.
- All have memory twins.

*§6 password-context blocking rows:*
- Block when `via` is OFFICER_TEMP.
- Block when `via` is RESET_LINK and `emailSetByOfficerAt` falls within the 30 days before `passwordSetAt`.
- Legacy rows with null values fall back to the audit read, and a failed read blocks.

*§2 house tables:*
- Every time column is `@db.Timestamptz(3)`.
- The engine refuses to boot unless `current_setting('TimeZone')` is UTC or Etc/UTC.
- Position and Transaction bounds keep ISO `::timestamp` casts.

*§2 rules JSON:*
- Add `schemaVersion`, and `limitsSchemaVersion` on the control row. These are separate from the CAS versions.
- `parseHouseBotRules` returns one of:
  - RULES_FROM_FUTURE: the fire requeues, the planner skips that bot, no pause.
  - RULES_INVALID{field}: AUTO_PAUSED; way out is Save, then Start.
- Any new field defaults to deny.

*Test:*
- Officer reset with `audit()` dropped: designate and re-verify are refused.
- Officer-set email, then a reset link: refused. The holder's own email plus reset: allowed.
- Claim SQL gives the same rows under `SET TIME ZONE 'Africa/Dar_es_Salaam'`.
- Rules at v99: the intent stays PENDING and the bot's status is unchanged.

### A5 · MAJOR · Closure removes the bot; erasure pseudonymises it
*Merged:* HB-ACC-04, -05, CRA-05, CRA-06.

*Evidence:*
- CLOSED is never restored (`players/[id]/actions.ts:176-177`), yet the mapper labels it `account_blocked` or `wallet_frozen` (`market-service.ts:1076`, `:1170`).
- Erasure requires CLOSED (`erasure.ts:169`).
- Settlement still pays a CLOSED wallet; it throws only when the wallet row is missing (`market-service.ts:3558`).

*F8b Closure (new):*
- The A2 hook or the sweep sets REMOVED(ACCOUNT_CLOSED) by `system_house_bot` and cancels intents.
- Awaited COMPLIANCE `house_bot.removed{cause}`.
- Admins get bell + email with the balance and open house stakes. ~~The holder gets email only.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder gets no house-bot email when closure removes the bot (C4 ruling 149); the admin alert stands.
- Marked open positions settle into the closed wallet.

*Erasure step `pseudonymiseHouseBotsForUser` (with memory twin):*
- The label becomes "Erased <botId tail>". The note, `removedReason` and event reason text become "[erased]".
- Ids, markers, intents and amounts are kept.
- `counts.houseBots` goes into `privacy.erasure.completed`.
- Erasure is refused (`house_bot_live`) while any non-REMOVED bot row exists.

*§4.4:* `why` and `decision` store only `playerHandle(userId)` ("Player #" plus the tail) and `triggerUserId`, never a display name, masked name or phone. Names resolve at render.

*Test:*
- Close: REMOVED within the hook; a later WIN pays the closed wallet and reports tie.
- The erasure sweep finds no NAME in house tables.
- A trigger with a display name produces a `why` holding only the handle.

### A7 · MAJOR · Bet context, stake bounds, cash only by construction
*Merged:* FS-08, FS-13, FS-15, HB-LC-18.

*Evidence:*
- Bounds are resolved per market, then per chain for Up & Down (`market-service.ts:1099-1119`, `updown-config.ts:1330`, `:1345`), and they can change after a decision.
- The plan maps `stake_below_min` and `stake_above_max` to FAILED plus an alert.

*§3 changes:*
- **Context:** replace `house?` with `ctx: {kind:'player'; playStartedAt?} | {kind:'house'; botId; intentId}`. Gates that read context must handle every kind (`never` check).
- **HOUSE-BOTS.md ruling:** a house bet neither advances nor is refused by the holder's session clock.
- **H2, house kind:** `realPart = stake` and `bonusPart = 0` before the affordability check; `balance < stake` refuses `house_cash_only`.
- **Sanctioned change (p):** extract `stakeBoundsForMarket(market)` from `:1099-1105` with identical output. decide.ts and F5 step 9 clamp through it, intersected with the bot's caps, then round down.

*§4.6, split the stake row:*
- `below_min` or `above_max`: SKIPPED(STAKE_BOUNDS_CHANGED), no alert.
- `not_whole`: FAILED plus AlertOnce.
- The planner moves a bot whose minimum is below the platform minimum to AUTO_PAUSED(RULES_INVALID{stakeMinTzs}).

*Test:*
- Raising the chain minimum after a decision gives SKIPPED and 0 alerts.
- The extracted function equals the inline result for a poll, a poll with an override, and a round.
- Gate-parity table: maintenance, cooling-off, SUSPENDED, CLOSED, frozen, own loss limit, bounds and closed market give the same reason for `placeHouseBet` and `buyPosition`.
- Bonus 50,000 with balance 1,000: `house_cash_only`, bonus untouched.

### A8 · MAJOR · Alert outbox
*Merged:* ENG-04.

*Evidence:* the retry replays the same key (`market-service.ts:890`). The replay returns the original bet (`:1137-1155`) and skips the post-commit block (`:1491`). So a lost commit acknowledgement, or a crash after commit, sends no alert under "replayed !== true".

*§2 Intent, add:* `alertedAt timestamptz null`, with a partial index on `finishedAt` where status is PLACED and `alertedAt` is null.

*§4.5, replace the alert rule with:*
- After any ok result, run `UPDATE … SET "alertedAt"=now() WHERE id=$1 AND status='PLACED' AND "alertedAt" IS NULL RETURNING`.
- Send the admin bet alert ~~and the holder notice~~ only when a row comes back. ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder notice (C4 ruling 149), so the claim gates the admin alert only.
- The planner repairs PLACED rows whose `alertedAt` is null and `finishedAt` is more than 30 s old.

*Test:*
- An injected 08006 after commit gives exactly one admin row ~~and one holder row~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder gets no row (C4 ruling 149).
- A duplicate fire gives none.
- A kill after commit is repaired within 45 s.

### A9 · BLOCKER · A bounded kill switch, and lock timeouts
*Merged:* ENG-01, ENG-02 (script part), ENG-06, ENG-17, ENG-18, CA-30.

*Evidence:*
- Advisory locks have no `lock_timeout` inside a 30 s transaction with a 10 s pool wait (`locks.ts:137-143`).
- Nested locks join the parent transaction and are held until it commits (`locks.ts:107-121`).
- 55P03 is not retryable (`retry.ts:47-52`).
- F9 takes `house:control` before writing, so a hung bet delays OFF by up to 30 s. A bot waiting on that lock holds `market:<id>` and stalls that market's players.

*F9, replace the write bullet with four steps:*
1. **Write OFF first:** autocommit `UPDATE "HouseBotControl" SET enabled=false, "offCause", "switchedAt"=now()` with no lock. H4's re-read inside the lock makes this binding for any bet not yet holding `house:control`.
2. **Drain:** a separate transaction runs `SET LOCAL lock_timeout='3s'` and then takes `house:control`.
   - Success: "House bots are off. No bot will place a bet."
   - 55P03: "Switched off. A bet already in its final step may still complete."
3. **Cancel** live intents with a conditional update.
4. **Record:** event, awaited audit, then alerts, all after the locks are released.

If step 1 fails: "Could not reach the database. House bots were NOT switched off. Try again, or turn on Maintenance mode." Maintenance refuses every bet, including house bets.

*§3 lock order, add:*
- The house branch runs `SET LOCAL lock_timeout='2s'` on the lock transaction before taking `market:<id>` and `house:control`.
- 55P03 maps to BUSY backoff, never to FAILED or the error streak.
- H2 is plain SELECTs: no FOR UPDATE, no writes before the market lock.
- Wording fix: `house:control` is held until the wallet-lock transaction commits.
- The player path is unchanged.

*§11 commit 7:* `ops:house-bots-off`. It uses a direct pg client, runs dry by default, and with `--apply` writes `enabled=false`, MANUAL and a SWITCH_OFF event.

*Test (`test:house-bot-caps`, Postgres):*
- `house:control` held 60 s: OFF returns in under 1.5 s with the drain copy, `enabled=false` is set, and the next bet gets `house_disabled`.
- `house:control` held 10 s: the bot bet on market X returns BUSY in 2–3 s, a player bet on X completes in under 3 s, and the error streak is unchanged.
- `market:X` held 20 s: the holder's withdrawal completes in under 3 s.
- The source test fails on FOR UPDATE in the house gate.

### A10 · MAJOR · Exhaustive mapper, status split, transient errors, poison intents
*Merged:* FS-03, ENG-11, ENG-16, HB-ACC-21 (mapper), HB-LC-16 (mapper).

*Evidence:*
- Refusal reasons are hand-written, and some are chosen by ternary (`market-service.ts:1117`, `:1170`).
- `account_blocked` is returned for SUSPENDED, CLOSED, SELF_EXCLUDED and COOLED_OFF alike (`:1045-1076`).
- The in-lock close returns `selection_closed` for markets closed early too (`:1284`, `:1413`).
- RETRYABLE lacks 55P03, 57014, 57P02/57P03 and P1001/P1017 (`retry.ts:47-52`).

*§4.6 changes:*
- **Compile check:** add a `BET_PATH_REASONS` const tuple; the mapper uses `satisfies Record<HouseBetOutcomeKey, Action>`.
- **Unknown reason at runtime:** FAILED(UNMAPPED), plus AUTO_PAUSED(UNMAPPED_REFUSAL) and one alert, instead of a stream of failures.
- **`account_blocked`:** re-read the status.
  - SUSPENDED → ACCOUNT_SUSPENDED.
  - CLOSED → A5 removal.
  - SELF_EXCLUDED or COOLED_OFF → RG cause with void consent.
  - Unreadable → ACCOUNT_BLOCKED.
- **SELECTION_CLOSED or INVALID:** re-read the market. Not LIVE → SKIPPED(MARKET_NOT_LIVE); otherwise EXPIRED(CUTOFF).
- **Transient errors:** `isEngineTransient` = `isTransient` plus {55P03, 57014, 57P02, 57P03, P1001, P1002, P1008, P1017, AdmissionBusy}.
- **Error streak:** atomic `UPDATE … SET "errorStreak"="errorStreak"+1 WHERE key='global' RETURNING`, reset on ok. Transient failures lasting 2 min send AlertOnce `engine:db:<EAT hour>`.
- **Poison:** the claim adds `attempts < 3`. The planner marks rows with 3 or more attempts and an expired claim FAILED(POISON) with AlertOnce.
- **Constant pin:** 180 s ≥ 15 s admission wait + 4 × (10 s + 30 s) + 5 s.

*Test:*
- A typecheck fixture that adds a reason without a mapper row fails.
- A walker over `reason:`/`code:` literals (ternaries included) has a planted RED case.
- An error-code table maps each code to PENDING or FAILED.
- 5 transient throws leave the switch ON. 3 TypeErrors across 2 workers give exactly one SWITCH_OFF.
- Suspension and self-exclusion mid-fire give different causes.

### A11 · MAJOR · Scope starts at switch-on or Start; the sweep lookback is bounded
*Merged:* HB-LC-06, ENG-10, ENG-31.

*Evidence:*
- `placedAt` is stamped before the market lock (`market-service.ts:1238` vs `:1282`), so the commit can trail it by up to the 30 s transaction timeout (`locks.ts:142`).
- Nothing bounds how far back the sweep reads. Old triggers are already due, so switching on fires a burst.

*§2 HouseBotRuntime, add:*
- `scopeFrom` on `global` (switch-on time) and on `bot:<id>` (Start time), written in the same transaction as those events.
- The seed migration sets `sweepPlacedAt = now()`.

*§4.3, add:*
- **COUNTER** only when `placedAt ≥ max(global, bot scopeFrom)`.
- **OPENER** only when `bettableFrom` is after that.
- **FILL** only when `cutoff − lead` is after that.
- **Sweep window:** each pass starts at `max(watermark − 90 s, dbNow − 10 min)`. `SWEEP_LOOKBACK_MS = 90 s`, pinned at or above 60 s.
- **While OFF or with no ACTIVE bot:** the watermark advances without writes.
- **Out-of-scope positions** get no intent row.
- **ON modal copy:** "Bots react only to stakes placed after you switch on".

*Test:*
- 40 positions placed while OFF, then ON: 0 intents; the next trigger is decided.
- A 3-day-old watermark with 10k old positions: 0 intents, and the watermark ends at or after now − 90 s.
- A committed position at `placedAt` now − 45 s with no hook call: exactly one intent.

### A12 · BLOCKER · One market scope predicate, and new H3 refusals
*Merged:* HB-LC-02, HB-LC-07, HB-LC-09, HB-LC-29, FS-01, FS-32.

*Evidence:*
- openRound passes the lock time (`updown-service.ts:769`) and only refuses when the close has passed (`:714`).
- `createMarket` discards a past cutoff and falls back to the category lead (`market-service.ts:646-654`). That lead has a floor of now plus the minimum window (`ai-poll-config.ts:165-171`), which a round can never fit, so the cutoff is null (`:644`). Betting then stays open until `resolutionAt` (`:566`).
- Result: a late round takes bets through its result phase, and plan §4.7 would use that null cutoff.
- The data layer turns any product line other than UPDOWN into MARKET (`market-dal.ts:158`).
- Demo markets are reachable by id (`:348`).
- The market row is created before the round row (`updown-service.ts:741` then `:800`).

*§4.1, add one predicate `inScope(view)` shared by trigger, planner and fire:*
- the raw `productLine` (explicit select) is MARKET or UPDOWN (`HOUSE_PRODUCTS`);
- not a demo market;
- a binary YES/NO market (`oppositeSide` uses an exhaustive switch);
- an Up & Down market has a round row;
- a poll has a non-null `selectionClosedAt`.

*§4.7, replace the cutoffs:*
- **Up & Down:** `min(round.opensAt + D·60 s, selectionClosedAt ?? resolutionAt)`.
- **Polls:** `selectionClosedAt`. A null cutoff puts the poll out of scope.

*§3 H3, add (raw row re-read inside the market lock):*
- `house_product_not_allowed` → SKIPPED(PRODUCT_NOT_SUPPORTED).
- `house_round_locked` → EXPIRED(CUTOFF).
- ~~Both get en/sw/zh copy.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** house refusal reasons carry no player copy in any language: they are server-only `HouseSeamReason` codes outside the player registry and dictionary, and the console words them through the engine's server-side copy (C4 ruling 148).

*Engine codes and alerts:*
- New codes NO_CUTOFF, UD_NO_ROUND and PRODUCT_NOT_SUPPORTED.
- AlertOnce `ud-born-unlocked:<roundId>` and `ud-orphan-market:<marketId>`. These are existing player-side holes; the platform fix is proposed separately.

*Test:*
- A round with a null cutoff, now in its result phase: 0 intents, a direct bet returns `house_round_locked`, pools and balance unchanged. RED: removing the check lets it commit.
- Raw product line JACKPOT: 0 intents and a refusal.
- A demo market: 0 intents.
- An Up & Down market with no round: UD_NO_ROUND and one alert.

### A13 · MAJOR · An allowlisted market view for the engine
*Merged:* HB-LC-03, FS-12.

*Evidence:*
- An early re-check stamps Sentinel fields onto a LIVE market (`market-service.ts:2355-2362`).
- Stage-1 of two-admin resolution stores the proposed outcome on a CLOSED market.
- `test:house-bot-info-edge` only scans imports, so a field read would pass.

*§4.1:* `HOUSE_MARKET_FIELDS` select produces `PublicMarketView`, containing:
- id, raw product line, category, status, pools, `selectionClosedAt`, `resolutionAt`, `createdAt`, `titleEn`;
- the frozen exit rates and `isDemo`;
- round open time, duration, open price and targets;
- `chainRunning` and `assetEnabled`.

Engine modules may not import `StoredMarket`.

*Test (info-edge):*
- The field list equals a pinned list.
- A token walker fails on sentinel, resolvedOutcome, resolutionEvidence or resolveClaimedAt (planted RED).
- The same market with and without Sentinel or staged fields produces a byte-identical intent.

### A14 · BLOCKER · Correct the extracted exit-window formula
*Merged:* FS-04, HB-LC-19.

*Evidence:*
- `cashOutValue` computes `hadRunway = graceMs > 0 && closesAt − placedAt ≥ graceMs` (`market-service.ts:2671`).
- It reads frozen rates (`:2657-2659`) and sets `sellable = hadRunway && withinWindow && !bonusFunded` (`:2687`).
- Plan (k) drops `graceMs > 0`. With grace 0 and a paid window, the refactor would offer an exit today's code never offers. That is a player money change (I1).

*§3 (k), replace:*
- `exitWindowClosesAt(p, m)` = `placedAt + graceMs + paidMs` when `graceMs > 0 && closesAt − placedAt ≥ graceMs`, else `placedAt`.
- Rates come from `ratesFor(m)`; `closesAt = selectionClosedAt ?? resolutionAt`.
- `cashOutValue` output must be byte-identical before and after.

*Test (seam):*
- The grid grace {0,5} × paid {0,2,10} × runway {<, ≥ grace} × bonus {0, >0} deep-equals a golden snapshot taken before the refactor.
- RED: dropping `graceMs > 0` fails.

### A15 · MAJOR · Count only locked money; check closeness on a fresh price against both targets
*Merged:* HB-LC-04, HB-LC-01, HB-LC-21, HB-LC-22, FS-33.

*Evidence:*
- Player stakes can exit free while sellable (`market-service.ts:2671-2687`).
- The board's live price is the latest confirmed observation (`updown-board.ts:634`, `:692`), which can be minutes old.
- Targets are null when there is no open price (`updown-service.ts:736`).

*F4 and H3 changes:*
- **Locked pool:** "non-house pool" becomes "the sum of OPEN non-house stakes whose `exitWindowClosesAt` has passed". Superseded for H3, Enter now, targeted COUNTERs and FILL by `lockedForHouse` (N1–N2, PLAN §18); the untargeted COUNTER keeps this rule.
- **FILL timing:** `dueAt = max(cutoff − lead − jitter, latest exit close among the counted stakes)`. After `deadlineAt` → SKIPPED(CONDITION_GONE). With N1–N2 the hold is the latest exit close + `LOCK_MARGIN_MS` among the stakes `lockedForHouse` counts.
- **Deadline:** `dueAt ≤ deadlineAt` also applies to OPENER and FILL planning.
- **Price:** `udPriceForDecision(asset)` uses the terminal's cached 1-min vendor bar if under 120 s old (no new metered calls), else a confirmed observation quoted under 60 s ago, else SKIPPED(UD_STALE_PRICE). Add this source to the I2 list.
- **Closeness rule:** `|price − open|·100 ≤ closenessPct · min(upTarget − open, open − downTarget)`.
- **Missing inputs:** a null target or a margin of 0 or less gives UD_NO_PRICE.
- **Record:** the decision stores {price, source, ageSec}, and the check runs at decision and at fire.

*Test:*
- Observation at the open, vendor bar at open + 0.93 × margin: UD_CLOSENESS. RED: using the board price fails this.
- A 4-minute-old observation and no vendor bar: UD_STALE_PRICE.
- Asymmetric targets +10 / −4 with live price +5 at 25%: UD_CLOSENESS.
- A FILL with only sellable YES money is held, then placed.
- A cash-out racing the FILL inside the lock gives `house_condition_gone`.

### A16 · MAJOR · Market and round lifecycle handling
*Merged:* HB-LC-08, -10, -12, -13, -15, -16, -23, -25, -26, -30, FS-10, FS-11, FS-22, FS-24.

| Event (code) | Detection | Intents / new house bets | Money | Alert |
|---|---|---|---|---|
| Early close: Sentinel seal, human fallback, stage-1, single-admin resolve (`:2985`) | Planner every 15 s; conditional update on `status='PENDING'`; A10 re-read at fire | SKIPPED(MARKET_NOT_LIVE) | ride, settle normally | none |
| Reopen (`:4000-4025` clears Sentinel fields and stamps, leaves no marker) | An intent with MARKET_NOT_LIVE exists for the market (engine's own data). Superseded: detection reads `PredictionMarket.reopenedAt` (sanctioned change (r), N1–N2). | new triggers SKIPPED(MARKET_REOPENED); FILL and OPENER never re-planned | ride | none |
| Emergency void (`:4061`), operator Up & Down void, objection VOID | as early close | SKIPPED(MARKET_NOT_LIVE); H3 refuses | marked BET_REFUND, no wagering reversal (A17), realised 0 | ~~(h) label~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no label; the holder's notice is byte-identical to any player's (C4 ruling 143). |
| Chain paused, stopped or archived, or asset disabled (`updown-config.ts:1180-1185` clears only the next boundary; `chainPaused` at `updown-board.ts:849`) | view at decide and fire; planner sweep | SKIPPED(CHAIN_NOT_RUNNING); H3 refuses | ride; the healer is independent | none |
| Cutoff or resolution moved (only `createMarket` writes these) | fire uses deadline = min(stored, fresh cutoff − minTimeToCutoff) | EXPIRED(CUTOFF) | — | source pin: `createMarket` plus dev-test only |
| New chain or category; stored category unknown | per-chain fit at decide (bettableFrom + delay ≤ deadlineAt; FILL lead fits D); unknown category → "other" plus a rules-tab flag | misfit → no row | — | AlertOnce `chain-in-scope:<botId>:<chainId>` (scope defaults belong to §5) |
| Exit rules widened (`market-config.ts:217-218`) | `effectiveTiming` counter "never"; runtime hash of the exit config | SKIPPED(EXIT_WINDOW_TOO_LATE) | — | AlertOnce per change |
| Holder wallet missing with OPEN house positions (settlement throws at `:3292`/`:3423`/`:3558`, void at `:4120`) | planner check | AUTO_PAUSED(WALLET_MISSING); Remove doesn't bypass | settlement blocked for every player until the wallet is restored | danger AlertOnce `settle-blocked:<botId>:<day>` with market links; `ops:house-bots-status` |
| Market deleted, orphan repair (`:2548-2573`) | NOT_FOUND at fire; planner | SKIPPED(MARKET_GONE) | refund copies the marker; no wagering reversal (A17) | none |
| Chain purge (rounds deleted, titles redacted) | no foreign key from intents to `UpDownRound`; `marketId` soft | feed reads `decision.snapshot` {title, round number, pools}; purge refused while PENDING/CLAIMED intents exist | untouched | — |

*Test:*
- Each transition mid-delay reaches its terminal state within one tick, and the trial balance ties.
- Reopen gives MARKET_REOPENED.
- A chain stop gives CHAIN_NOT_RUNNING.
- A purged-market feed row renders.
- A missing wallet alerts once, then settles after the wallet is restored.
- Two-admin stage-1 gives MARKET_NOT_LIVE, with the decision unchanged.

### A17 · MAJOR · Skip wagering reversal everywhere, and label every per-bettor notice
*Merged:* HB-LC-11, HB-LC-26, HB-LC-30, plus a new finding.

*Evidence:*
- `reverseWagering` runs in settlement (`market-service.ts:3798`), in emergency void (`:4248`) and in orphan repair (`:2559`). Plan (g) names only the settlement loop.
- House stakes never record wagering (H5–H9), so a void or an orphan refund would remove house turnover from the holder's personal bonus requirement.

*§3 (g), replace:*
- Every `reverseWagering` call (`:3798`, `:4248`, `:2559`) and `onRecruitSettlement` (`:3831`) skips marked positions.
- `onRecruitBet` and `onRecruitSettlement` take a required `houseBotId: string | null`.

~~*(h), list the emitters that get the liquidity label:*~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no emitter carries a liquidity label: a holder's outcome notices are built by the same call as any player's and are byte-identical, selection closed is one notice over every position the player holds, and the Up & Down digest has no house split (C4 rulings 143–144; C5-SPEC ruling 235).
- ~~selection-closed bell and email: personal figures exclude marked positions, and the house stake gets its own labelled line;~~
- ~~verdict recorded or reversed; market cancelled bell and email;~~
- ~~one-sided refund and orphan refund;~~
- ~~Up & Down win, loss, refund and one-sided rows, and the digest.~~

*Test:*
- Emergency void and orphan repair of a marked position leave the holder's grant unchanged and put the marker on the refund.
- ~~A holder with mixed positions gets labelled notices, and his personal payout excludes house money.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** a holder's outcome rows equal the plain template byte for byte (C4 rulings 143, 152).
- A non-holder's notices are byte-identical.

### A18 · MINOR · Sanctioned player-path changes (m)–(o)
*Merged:* HB-ACC-13, -14, -32.
- **(m)** The public comment side chip ignores marked positions (`markets/actions.ts:339`).
- **(n)** A user whose only positions on the market are marked is refused with reason HOUSE_STAKE_ONLY, ~~in en/sw/zh~~ (`objections-service.ts:99-109`). Own plus house positions stay eligible. ⛔ **Superseded by D19 (Ali, 2026-09-16):** `HOUSE_STAKE_ONLY` is server-only, and the page shows the neutral "You can’t object to this result. If you have a concern, contact support." (C4 ruling 146).
- ~~**(o)** F10 adds the account activity feed as a chip surface, keyed on `payload.houseBotId`.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder chip on any surface, the activity feed included (D19c).

*Test (seam):*
- House position only: side null, HOUSE_STAKE_ONLY.
- Own plus house: own side, eligible.
- Non-holder: byte-identical.

### A19 · MAJOR · Engine audits outside the locks, from an allowlist
*Merged:* CRA-01 (engine part), CRA-13, ENG-34.

*Evidence:*
- Every audit append takes one database-wide serialised lock.
- §4.6 awaits the auto-pause audit right after the status write under `wallet:<botUser>`.

*§4.6, replace the auto-pause order:*
1. The status write commits under the wallet lock.
2. After release: cancel intents, append the event, await the audit, then send alerts.

*§4.6, allowlist and rules:*
- **Actions allowed from the engine:** `house_bot.auto_paused`, `.removed`, `.loss_stop`, `.switch_off{cause}`, `.engine_fault`, `.poison`.
- **Row shape:** COMPLIANCE, actor `system_house_bot`.
- **Payload keys:** holderUserId, from, to, cause, counts.
- **Never:** label, note, fingerprint or phone in a payload; no row per intent, skip or alert.
- **Link:** HouseBotEvent stores the audit id.
- **Source scan:** no `audit(` inside a `withLock` callback.

*Test:*
- OFF with 200 intents writes exactly one audit row.
- With the audit queue delayed 5 s, OFF commits in under 1 s and the holder's own bet is not blocked.
- Payload keys stay within the allowlist.

### A20 · MINOR · Retention of house tables (owner may shorten the skipped-intent period)
*Merged:* ENG-27, CRA-07.

*§2, add:*
- HouseBot, HouseBotEvent and HouseBotIntent are kept 7 years and never deleted.
- HouseBotAlertOnce is kept 30 days, deleted by `retention.purge.daily` in batches of 5,000.
- HouseBotRuntime holds fixed rows only.
- The house tables go on the chain-purge NEVER list.
- An index on intent `(status, finishedAt)` supports a later ruling; ENG-27 proposed 90 days for SKIPPED, EXPIRED and CANCELLED.

*Test (`test:retention`):* 400-day-old bot, event and intent rows survive; a 31-day AlertOnce row is deleted; a second pass does nothing.

### A21 · MAJOR (owner ruling) · Holder stakes against his own bot; triggers from his recruits
*Merged:* HB-ACC-08, HB-LC-28, HB-ACC-09.

*Evidence:*
- A player may hold both sides of a market (`market-service.ts:1174-1179`).
- H2's OWNER_POSITION only stops further house bets.
- `recruitedBy` records the referrer (`affiliate-service.ts:918`).

*§3 (a) and §4.3, add:*
- **Hook check:** an unmarked position whose user holds a live bot, on a market where that bot holds the opposite side.
- **Alert:** AlertOnce `holder-against:<botId>:<marketId>`, admin bell + email: "Holder of Bot A staked TZS 20,000 UP against Bot A's TZS 8,000 DOWN on BTC 5-min #412". Event HOLDER_AGAINST_BOT.
- **Never** refuse the bet and never pause the bot. A same-side bet raises nothing. The sweep repeats the check for positions the hook missed.
- **Recruits:** a trigger whose `recruitedBy` is a live bot's holder is SKIPPED(HOLDER_RECRUIT).

*Test:*
- House DOWN, then the holder bets UP twice: one alert, bet committed, bot status unchanged.
- Same side: no alert.
- Hook disabled: the sweep alerts once.
- The holder's recruit gives HOLDER_RECRUIT.

### A22 · MINOR · One alert recipient resolver
*Merged:* FS-09 (the part seal-flows does not cover).
- `alerts.ts` `houseBotAlertRecipients()` uses the same rule as the owner guard.
- F2, F3 and re-verify send uncapped bell + email for STARTED, VERIFIED, RULES_SAVED and LIMITS_SAVED, with before→after cap values.

*Test:* a second ADMIN raises a cap; both admins receive the diff.

### A23 · MAJOR · Release, migrations and deploy
*Merged:* FS-18 (ruling), ENG-07, ENG-08, ENG-21, ENG-30, ENG-32.

*Evidence:*
- The KYC commit `ac411357` is local only, with the tree dirty.
- A failed migration stops the app (`package.json:12`).
- Health readiness checks only that the database is reachable and one table exists (`api/health/route.ts:45-46`).
- `railway.json` declares a healthcheck and 60 s overlap, but production measured `healthcheckPath` null (`docs/RAILWAY-LIVE.md:101`).

*§11 precondition:*
- KYC-at-withdrawal is on origin/main before commit 1, and the worktree is branched from that SHA.
- House migrations are timestamped after `20260913120000_kyc_at_withdrawal` and touch no KYC table.

*§2 migrations:*
- Every statement uses `IF NOT EXISTS` with fixed names.
- `ops:preflight-house-bot-migrations` (read-only) prints `now()`, the timezone, Position and Transaction row counts and sizes, and existing indexes, then GO or NO-GO.
- Above 500k positions or 1M transactions, build the **FIVE** indexes `CONCURRENTLY` by hand first, so the migration is a no-op. ⛔ **Corrected 2026-09-20 by reading the migration rather than this line:** `20260916150100_house_bot_markers/migration.sql` says "five indexes" in its own header and its hand-apply block names five — four on `"houseBotId"` plus `Position_placedAt_id_idx`, the sweep keyset, which is built under the SAME `ACCESS EXCLUSIVE` lock and is exactly as capable of stalling the migration. A preflight that checked four would report GO on a database one index short. Read the five names FROM that file; never type them.
- Merge only when `_prisma_migrations` shows both migrations finished and not rolled back. Never run `migrate resolve --applied` without checking the objects exist.

*§4.2:*
- `houseBotSchemaReady()` checks the marker columns, the 6 tables and the seeded rows. With N1–N2 the check counts 8 tables (`HouseBotTarget`, `HouseBotPress`).
- If false, the engine does not start and `/api/health` returns 503 (`houseBots.schemaReady=false`), because every Position create would fail.
  - ⛔ **Superseded in part by C5-SPEC ruling 172 (owner ruling D19, 2026-09-17):** the 503 with `ok:false` stands; the public body no longer carries `houseBots.schemaReady` (or any house key, ruling 171). The schema state and the engine's health are read on the admin-gated server reader (`src/lib/server/house-bot/engine-health.ts`), rendered for ADMIN only on `/admin/system`.

*Runbook:*
- Deploy with the switch OFF unless the 60 s overlap is verified live.
- The engine-stale warning waits 90 s after the latest `lastBootAt`.
- Roll back past the merge only with the switch OFF and 0 open marked positions, or with the owner's recorded acceptance. The old code lets the holder cash out house positions and accrues wagering and commission on them.

*Test:*
- A mocked probe returning false gives 503, and the engine does nothing.
- Migrations replay twice on an empty Postgres.
- `test:docs` finds the preflight and the runbook sections.

### A24 · MAJOR · Engine runtime: crashes, deploys, backlog, scale-out
*Merged:* ENG-03, -05, -09, -13, -14, -15, -19, -20, -22, -23, -24, -25, -29 (beats), -36, FS-19, FS-21.

| Situation | Rule to add (§4.2–§4.5, §2) |
|---|---|
| Killed after claim, or inside the locks before commit | Rollback; reclaimed after 180 s; same key; one position |
| Killed after commit | PLACED (`markPlaced` is in the same transaction); A8 repairs the alerts |
| Player bet commits, then crash before the hook | 90 s sweep lookback (A11) |
| SIGTERM | Best effort only. Set `stopping` on globalThis synchronously; fire-and-forget requeue of this instance's claims that are not in flight; release the lease. Correctness never depends on it. |
| `HOUSE_BOT_ENGINE=false` | No timers, and the hook returns before its import. Runtime row `engine:<instanceId>` {enabled, bootAt}. |
| Duplicate module instances or HMR | State on `globalThis.__50PICK_HOUSE_BOT_ENGINE`; start is idempotent; the memory claim has no await between select and mark |
| Intents left over after downtime | Claim adds `"dueAt" > now() − maxLateness` (Up & Down 30 s, polls 600 s); the rest become EXPIRED(STALE). First tick waits 20 s after boot. Rate caps (MIN_GAP, PER_HOUR, GLOBAL_BETS_PER_MINUTE) defer to the moment the window frees if that is still within lateness, else SKIPPED; money caps skip. Superseded by `staleAt` on every intent, enforced in the seam (N1–N2, PLAN §18). |
| Admission saturated | No claims while queue depth > 0 or in-flight ≥ half of max (`admission.ts:72-78`); `placeHouseBet` uses `maxWaitMs:0`; hook semaphore 4 per process, overflow dropped and counted; the sweep pauses |
| Planner lease | `acquireLeadership` gains `{leaseMs}`, 45 s for house bots, with a write that throws (`saveConfig` swallows errors, `config-store.ts:101-103`, so `leader.ts:112-114` returns true). Every planner effect is conditional with RETURNING. |
| Heartbeats | `beat:poller:<INSTANCE_ID>`, written only after the claim succeeds, and `beat:planner`. Record `pollerErrorAt`, code and streak; 10 failures send AlertOnce. Poller-stale and planner-stale are separate states. |
| Clock skew | Measure `clock_timestamp() − Date.now()` each minute; claim with `dueAt ≤ now() − max(0, skew) − 2 s`; above 5 s, stop claiming and alert |
| Day and hour keys | Computed inside the INSERT from DB `now()` in `Africa/Dar_es_Salaam`; engine modules import only `eat-day.ts` |
| 2+ replicas | Every cap and throttle comes from the database. GLOBAL_BETS_PER_MINUTE counts marked positions in the last 60 s on the lock transaction; PER_HOUR, PER_DAY and MIN_GAP are rolling windows; summaries are built from PLACED intents via AlertOnce. Per-process state (2 fires, 5 s cache whose stale intents are CANCELLED at fire, verify bucket, admission) is listed in HOUSE-BOTS.md. |
| High volume | The hook receives the committed bet's facts and returns at once for marked bets; at most 1 write per in-scope trigger. The sweep filters unmarked, LIVE, older than 5 s, and no COUNTER intent. |
| Cap queries inside the locks | Partial index on Position `(houseBotId)` where marked and OPEN; raw SQL; EXPLAIN pin with no Seq Scan; one GROUP BY for all bot books; add `gMaxBetsPerDay` to the control row |

*Test:*
- Two OS processes on Postgres, `kill -9` inside the market lock and after commit: one position per intent, no CLAIMED rows after 190 s.
- 300 stale plus 20 fresh intents: 0 stale placed; per-minute rate within the cap.
- Saturated admission: 0 claims.
- Two planners with realised loss at the cap: one event, one alert.
- A claim that throws 10 times: beat unchanged, one alert.
- +6 s skew: 0 claims plus an alert.
- 20 bets at 13:59, then one at 14:00:30: CAP_PER_HOUR.
- EXPLAIN pin at 1M/20k rows.
- `startHouseBotEngine` called twice: one interval.

---

## 2. Commit placement and severity

| Commit | Amendments |
|---|---|
| 1 | A3/A4/A8/A11/A20 columns, A23 migration rules, A24 indexes and runtime keys |
| 2 | A7, A9 (seam), A12 (H3), A14, A15 (H3), A17, A18, A21 hook |
| 3 | A3 (service), A4, A5 (designation/erasure), A22 |
| 4 | A2, A3 (engine), A5 (closure), A9 (OFF), A10, A11, A12, A13, A15, A16, A19, A21, A24 |
| 7 | A9 script |
| 8 | A1 record, A23 release checklist |

**Blockers:** A3, A9, A12, A14.

### Critical Files for Implementation
- C:\kipindi-main\src\lib\server\market-service.ts
- C:\kipindi-main\src\lib\server\password-reset.ts
- C:\kipindi-main\src\lib\server\responsible-gambling.ts
- C:\kipindi-main\src\lib\server\locks.ts
- C:\kipindi-main\src\lib\server\updown-service.ts

---

# House bots: console and consent amendments C1–C3, C8–C15

## 0. Triage

**Surviving gaps and where they land**

| Amendment | Severity | Merged gaps |
|---|---|---|
| C1 Numbers on the rules and limits forms | BLOCKER | CA-01, CA-02 |
| C2 Labels, notes and reasons | MINOR | CA-14, CA-35 |
| C3 Typed confirmation words | MINOR | CA-15 |
| C8 A responsible-gambling pause voids consent (owner ruling) | BLOCKER | HB-ACC-17, HB-ACC-29, HB-ACC-02, HB-ACC-11 (strip part) |
| C9 Holder-account causes in eligibility and the console | MAJOR | HB-ACC-03 (email route), -04, -06, -21, -22, -23, -24, -27, -28, -34, -36, -37 |
| C10 Master switch and Start states, and lowering max bots | MAJOR | CA-12, CA-13, CA-22, CA-26 (remainder), plus one new verified gap (ON right after a loss stop, and stale ON/Start) |
| C11 Keeping the strip live | MAJOR | CA-04, CA-18, CA-23, CA-31, CA-30 (client side), ENG-15, -22, -29, -30, FS-19 (display only) |
| C12 Sign-out, 2FA expiry, second device and deploys keep edits | MAJOR | CA-05, CA-06, CA-07, CA-27, CA-28, ENG-02, FS-09 (guard) |
| C13 Notifications: audience, channel, links | MAJOR | HB-ACC-08, -10, -11, -31, -33, HB-LC-28, FS-09, FS-16, FS-17, CA-32 (engine-alert link), ENG-25 (summaries), ENG-28 |
| C14 Scope, timing and rule validity over time | MINOR | HB-LC-12, -19 (preview), -23, -24, FS-07, -10, -11, -15 (rules part), -20, -24, -27, ENG-25 (cap windows) |
| C15 Schedule windows and duration fields | MINOR | CA-16, CA-34 |

**Dropped (already covered, or contradicted by a ruling)**
- CA-03, HB-ACC-07: owner ruling, no platform-wide sign-out in this build. The immediate pause is already sealed (seal-flows §2.1 L1 hooks). The sign-out is recorded as hardening item H1 in C9.
- CA-08, CA-29, CA-33, CA-38, CA-39, CA-40, and CA-32 apart from the engine-alert link: covered by C7.
- CA-09, CA-19, CA-36, CA-37, HB-ACC-19, HB-ACC-20: covered by C4 and seal-flows §2.6.
- CA-10: covered by C5.
- CA-11, CA-20, CA-21, CA-24, CA-25, ENG-35: covered by C6 (both directions of bot vs global, conflicts, lock order, version clash).
- CA-26: the designate race and order are in C4. Its "refuse lowering below the count" is replaced by the owner ruling (C10).
- ~~CA-17: R1 already ships a per-bot CSV. A print layout isn't a requirement.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1 and its per-bot CSV are struck (C5-SPEC rulings 199–213), and Commit 7's console carries no results report or CSV by default (`C5-D20-REPLAN.md` §4).
- ENG-01, ENG-18, and CA-30's server bound: A9 (sequencing notes: OFF plus fallback script) and the seal-flows §3.7 database-down copy.
- CRA-01: seal-flows §1 C7 and §3.2–3.9 name the audit category per owner action; A19 covers engine audits.
- CRA-14: ~~R1 indexes the `house_bot.*` audit rows.~~ `/admin/audit` is a shared page outside this console. ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1's audit index is struck (C5-SPEC ruling 207).
- HB-ACC-01, -15, -16, -30: seal-flows §2.1 (hooks at 4 writers plus the sweep) and §6 (future-writer source check, REHASH).
- HB-ACC-25, -26: seal-flows §2.2, §2.5, §2.6 step 7, and X4's per-fingerprint alert key.
- HB-ACC-35, FS-31: seal-flows §6 says player 2FA has no effect, and D5 makes consent password-only. FS-31 contradicts D5.
- HB-ACC-18: A3 (IDENTITY_REFUSED cause). Its strip copy comes through C9.
- ~~HB-LC-20: R2 (exposure split).~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R2's overview exposure split is struck (C5-SPEC ruling 254, L39).
- HB-LC-05, ENG-26: R3 fixed the placement-day cohort and its hint copy.
- CRA-24: P1. CRA-08: ~~R1~~ "Record reimbursement". ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1 is struck (C5-SPEC rulings 199–213), so no report lists recorded reimbursements; D20 does not name the "Record reimbursement" owner action itself, which is left to Commit 7's rulings.
- HB-LC-06: A11 `scopeFrom`. Only its ON-modal copy lands in C10.

**Not taken (outside §5–§8):** HB-ACC-05, -09, -12, -13, -14, -32 · HB-LC-01–04, -07–11, -13–18, -21, -22, -25–27, -29–31 · ENG-03–14, -16, -17, -19–21, -23, -24, -27, -31–34, -36 · CRA-02–07, -09–13, -15–23, -25–29 · FS-01–06, -08, -12–14, -18, -21–23, -25, -26, -28–30, -32–34.

---

## C1 · BLOCKER · Numbers on the rules and limits forms: one parser, typed columns, "not set" is not 0
Merged: CA-01, CA-02.

**Evidence**
- The kit sanitiser keeps only `[^\d.]` and, for whole-number fields, deletes every `.` (`input.tsx:42-51`). So "10,000.50" becomes 1000050 and "1.5" becomes 15. JS `\d` is ASCII-only, so "٣٠٠٠" becomes "". A minus sign is dropped.
- The sanitiser switches on for any `inputMode="numeric"` (`input.tsx:86`) and rewrites the value before the page's `onChange` (`:96-101`). The design spec's limits tab asks for exactly `Input … inputMode=numeric`. DurationInput reuses the sanitiser (`duration-input.tsx:108`).
- `onPaste` and `onBeforeInput` pass through to the `<input>` (`input.tsx:156`, spread before `onChange` at `:160`).
- Money columns platform-wide are `Decimal(18,2)` (`schema.prisma:583`, `:1783`), so a plain money column wouldn't enforce whole TZS. Plan §5 gives no upper bounds.
- A database overflow is thrown and masked as "Server error — nothing may have applied" (`run-admin-action.ts:31-32`).
- Platform stake bounds are `PLATFORM_MIN_STAKE` 1,000 and `PLATFORM_MAX_STAKE` 1,000,000 (`payout.ts:166-168`).

**§5, add "Number input law" before the tables:**
- **One parser.** `parseWholeNumber(raw)` in `rules.ts` is used by the client and the server. The server parses the raw FormData string and never calls `Number()` on it.
  1. NFKC-normalise, then map every `\p{Nd}` digit to ASCII.
  2. Strip a leading `TZS`/`Tsh` (any case), spaces, no-break spaces, commas, underscores and apostrophes.
  3. The remainder must match `^\d+$`.
  - Refusal codes and copy:
    - `.` anywhere → DECIMAL: "Whole shillings only — no decimals." This includes "10.000"; the parser never guesses.
    - A leading `-` or `−` → NEGATIVE: "Must be 0 or more."
    - Anything else → NOT_A_NUMBER: "Digits only, e.g. 10,000."
  - Empty or whitespace-only → UNSET.
  - Rule: an accepted transformation never changes the digit sequence.
- **Field.** Every house-bot number field is a `HouseNumberField`: kit `Input size="md" mono`, with `prefix="TZS"` or `trailing="s"`/`"%"`.
  - Its `onBeforeInput`, `onPaste` and `onDrop` run the parser on the would-be value first.
  - A refused value calls `preventDefault`, keeps the previous value and shows the inline error with focus kept.
  - A normalisable value calls `preventDefault` and sets the digits.
  - An echo under the field shows "= TZS 10,000" via `formatTzs`.
  - The kit sanitiser remains only as a backstop and is never the thing that decides.
- **Bounds.** Add a Max column to every §5 row.
  - Stake min and max: within `PLATFORM_MIN_STAKE..PLATFORM_MAX_STAKE`, imported rather than written as literals.
  - Other TZS caps: 0–1,000,000,000.
  - Seconds: ≤ 86,400.
  - Percentages: whole numbers 0–100.
  - Counts: as in their tables.
  - Above max: "At most TZS 1,000,000,000."
  - Below min: "At least TZS 1,000 — the platform minimum."
- **Zero vs not set.** "0" is valid only where the minimum is 0 (balance floor, no-react zone, closeness %, jitter). UNSET stays NULL, shown as "Not set — this bot cannot bet".
  - Saving UNSET is allowed on a non-ACTIVE bot.
  - On an ACTIVE bot it is refused on that field: "Bot A is running — pause it before clearing {cap}."
  - The limits side keeps seal-flows §3.8 "Can't clear a limit while bots are on".
- **§2 column types.** Typed caps become `BigInt` with `CHECK (col IS NULL OR col BETWEEN 0 AND 1000000000)`. Seconds and counts become `Int` with CHECKs. The memory twin enforces the same.
- **Database errors.** P2002, P2003 and 22003 are caught in the action and returned as `{field}` errors, never as a throw.

**Test (`test:house-bot-rules`, `test:house-bot-console`)**
- Parse table: "TZS 10,000"→10000 · "Tsh 10 000"→10000 · "1,00,000"→100000 · "10,000.50"→DECIMAL · "10.000"→DECIMAL · "1.5"→DECIMAL · "-500"/"−500"→NEGATIVE · "2e5"→NOT_A_NUMBER · "٣٠٠٠"→3000 · "１０００"→1000 · ""/"  "→UNSET.
- Every field × {"", "0", min−1, min, max, max+1, 2^53, 2^63} gives its exact field and message, and the action doesn't throw.
- The max value round-trips in Postgres and the memory twin.
- Clearing a cap on an ACTIVE bot is refused.
- jsdom: pasting "10,000.50" leaves the value unchanged and shows DECIMAL.
- `red:house-bot-console`: swapping in a bare `Input inputMode="numeric"` must fail the "never saved as 1000050" assertion.

---

## C2 · MINOR · Labels, notes and reasons: normalisation, character set, case-insensitive uniqueness, code-point lengths
Merged: CA-14, CA-35.

**Evidence**
- Plan §2 (plan:153) gives "label (2–32, unique among live bots)" with no normalisation, case rule or counting unit.
- Feed and alert sentences interpolate the label.
- The kit `Textarea` has no `maxLength`, counter or error slot (`textarea.tsx:12-26`). A DOM `maxLength` counts UTF-16 units.
- No `lower()` unique-index precedent exists in `prisma/migrations`, so the index DDL is hand-written.

**§2 and §6 amendment**
- **Normalisers.** `rules.ts` exports `normaliseLabel(s)`, `normaliseText(s)` and `countChars(s)`.
  - `normaliseLabel` = NFC, trim, and collapse inner whitespace to one space.
  - `normaliseText` = NFC and trim, keeping newlines.
  - `countChars` = `[...s].length` after normalising. Client and server share all three.
- **Label rules**
  - Length: 2–32 code points, else "2 to 32 characters."
  - Allowed characters: `\p{L}\p{M}\p{N}`, space, and `- _ . # '`. Anything else is refused, including controls, zero-width characters (U+200B–200D, U+2060, U+FEFF) and bidi controls (U+202A–202E, U+2066–2069): "Letters, numbers, spaces and - _ . # ' only."
  - New column `labelKey` = NFKC of the normalised label, lowercased. Partial unique index `("labelKey") WHERE status<>'REMOVED'`.
  - Duplicate, including a concurrent one through P2002, returns field `label`: "Another bot is already called “Bot A” (Paused). Choose a different label."
  - A removed bot's label may be reused. Old rows render "Bot A (removed 20 Sep)" in history, feed and alerts, via `feed-copy.ts` from `removedAt`.
- **Note:** ≤ 300 code points.
- **Reasons** (ON, Pause, Remove): 5–300 code points after trim. Whitespace only gives "Give a reason (at least 5 characters)."
- **HouseTextField** (`Field` + `Textarea` + counter) shows "212 / 300" linked by `aria-describedby`, and turns danger above the limit.
  - Text is never truncated and no `maxLength` is set: "At most 300 characters — shorten it to save."

**Test**
- Table: "bot a" vs live "Bot A" → duplicate · " Bot  A " normalises to "Bot A" · "Bot\u200BA" and "\u202EA toB" → charset error · a 32-emoji label is valid, 33 is invalid.
- A reason of 5 spaces is refused. A 300-emoji note is valid, 301 is invalid.
- Concurrent same-label designate gives 1 bot plus 1 field error.
- A removed "Bot A" lets a new "Bot A" be created.
- red: an index without `labelKey` must fail the case test.

---

## C3 · MINOR · Typed confirmation words: one normaliser
Merged: CA-15.

**Evidence:** `ConfirmModal` arms on `typed.trim().toUpperCase()` (`modal.tsx:466`), so an inner double space never arms. The ON and Remove modals are new custom forms (C7), and §6 doesn't specify normalisation.

**§6, replace "The server re-checks every typed word from the shared constants" with:**
- `constants.ts` exports `normaliseTypedWord(s) = s.normalize("NFKC").trim().replace(/\s+/g," ").toUpperCase()` and `isTypedWord(s, WORD)`.
- Both the modal arming and `actions.ts` call it.
- "bots on", " BOTS  ON " and "remove" all arm. "BOTSON" and "BOT ON" don't: "Type BOTS ON to continue".
- A bypassed client refused by the server gets an inline error on `confirmWord`, "Type BOTS ON exactly to switch house bots on.", and the modal stays open.

**Test:** one truth table drives both the client arm and the server check. A source pin forbids any other `toUpperCase()` comparison under `src/app/admin/desk/**`.

---

## C8 · BLOCKER · A responsible-gambling pause voids consent: fresh password, then Start
Merged: HB-ACC-17, HB-ACC-29 (its "consent intact" is contradicted by the ruling), HB-ACC-02, HB-ACC-11 (strip part).

**Evidence**
- Plan F6 (plan:114) re-enables Start for SELF_EXCLUDED and COOLING_OFF "until eligibility passes again", with no re-verify.
- The fingerprint depends only on the stored hash (`password-reset.ts:74-76`). An unchanged password keeps it matching, so:
  - seal-flows §2.4 NOT_NEEDED and §2.6 "Another admin already verified — fingerprint already matches" would **no-op the re-verify**;
  - Start's fingerprint check (seal-flows §3.3 item 3) would pass.
  - The ruling would be unenforceable.
- Cooling-off lifts itself by timer (`responsible-gambling.ts:356-357`). Self-exclusion is reopened by an officer only after the minimum period (`players/[id]/actions.ts:161-175`). Start stamps exist at `:262-268` and `:312-313`.

**§2:** add `HouseBot.consentVoidAt timestamptz NULL` and `consentVoidCause` (SELF_EXCLUDED | COOLING_OFF).

**§6, add "Consent validity" (the single predicate):**
- `consentValid(bot, user) = fingerprint matches AND (consentVoidAt IS NULL OR verifiedAt > consentVoidAt)`.
- H2's `house_consent_stale` check, Start, the strip and the `?reverify=1` state all read this one predicate. The §3 owner wires it into H2.
- **Setting the void.** When any detector (hook, planner sweep or mapper) sees a self-exclusion or cooling-off for a non-REMOVED bot in **any** status, write under `wallet:<botUser>`: `consentVoidAt = now()` where `consentVoidAt IS NULL OR verifiedAt > consentVoidAt`. Event CONSENT_VOIDED.
  - ACTIVE bot: auto-pauses as planned.
  - PAUSED bot: status unchanged, admin bell only.
  - Neither sends a holder notice.
  - OWNER_LOSS_LIMIT is **not** an RG pause and doesn't void consent.
- **Re-verify gating** (replaces seal-flows §2.6 step 4 / X3 for RG causes only):
  - Refused, uncounted and before any password check, while `isLockedOut(userId).locked` or `status='SELF_EXCLUDED'`: "Can't ask for his password while he is {self-excluded | on a break} (until {D MMM YYYY}). His permission can be confirmed again only after it has ended."
  - Other causes (suspended, frozen, role) still don't block re-verify.
- **Modal copy when the void stands and the fingerprint matches** (runs normally, never NOT_NEEDED):
  - Title: "Confirm {holder}'s permission again".
  - Body: "His {self-exclusion | break} from {date} ended his permission for liquidity stakes. Type his current password — checked once and never stored."
  - Success sets `verifiedAt` and writes VERIFIED.
- **Start refusal**, inserted after seal-flows §3.3 item 3: "Can't start: {holder}'s {self-exclusion | break} on {date} ended his permission. Enter his password to confirm it again." Fix → `?reverify=1`.
- **F6 table, replace the SELF_EXCLUDED and COOLING_OFF rows:** "Start disabled while the lock stands. After it ends: Re-verify (fresh password, even if unchanged) → Start. Never resumes by itself."
- **Cooling-off end.** The planner sends one admin bell, AlertOnce `bot:<id>:RG_ENDED:<coolingOffUntil>`: "Bot A's holder break ended at {HH:MM} EAT. Confirm his permission before starting →" (`?reverify=1`). No holder notice.
- **Strip causes** (§8): render every live blocking row from `houseBotEligibility(userId,{botId, context:'start'})`, plus consent state. Show up to 3, then "and N more", each with its own action. `pauseReason` appears only in History.

**Test (`test:house-bot-designation`)**
1. Self-exclude, officer reopen, **same password**: the modal isn't NOT_NEEDED. Start before re-verify is refused with the void copy, and H2 returns `house_consent_stale`. After re-verify, Start succeeds.
2. Cooling-off expiry on an injected clock: Start refused, one expiry bell, re-verify, then Start succeeds.
3. Re-verify during the lock: refused, `failedLoginCount` unchanged, `verifyPassword` never called.
4. PAUSED(MANUAL) bot plus self-exclusion: status unchanged, `consentVoidAt` set, 1 bell, 0 emails, 0 holder rows.
5. A second RG episode after a re-verify voids again.
6. Red mutation: a predicate that checks only the fingerprint must fail case 1.

---

## C9 · MAJOR · Holder-account causes in eligibility and the console (not RG)
Merged: HB-ACC-03 (email route), -04, -06, -21, -22, -23, -24, -27, -28, -34, -36, -37.

**Evidence**
- Restore accepts only SUSPENDED or SELF_EXCLUDED (`players/[id]/actions.ts:176-177`), so a CLOSED account is permanent.
- ERASURE requests: `hasOpenRequest` at `privacy.ts:182-186`, persisted at `:69`.
- Officer-set email is audited as `player.email.set_by_officer` (`players/[id]/actions.ts:247-251`). A later reset-link change is audited as the holder's own `password_reset.completed` (`password-reset.ts:244-250`).
- The three password audits aren't awaited (`password-reset.ts:244`, `:273`, `:328`), so the plan's audit-log officer-reset row fails **open** if a row is lost.
- `checkLossLimit` is a rolling 24h window (`responsible-gambling.ts:499-504`).

**§6 eligibility table, add:**

| Context | Row | Copy (next step) |
|---|---|---|
| always | `status='CLOSED'` or `closedAt` | "Account closed on {date} — it can't be reopened. TZS {balance} and TZS {open house stakes} stay in his closed wallet; recover the float out of band. Remove the bot." Start and Re-verify are never offered. |
| designate, re-verify, Start | open ERASURE request | "He asked for his data to be erased ({dsarId}, {date}). Liquidity stakes can't continue — resolve the request or remove the bot." The planner sweep auto-pauses an ACTIVE bot as HOLDER_ERASURE_REQUEST. |
| designate, re-verify | `passwordSetVia='OFFICER_TEMP'` (durable column used by C4), or `RESET_LINK` within 30 days after a `player.email.set_by_officer` for this user (awaited read, fails closed) | "His password was last set through support ({how}, {date}). Ask him to change it himself in Account settings, then verify." |
| Start | OWNER_LOSS_LIMIT | "Can't start: his own daily loss limit (TZS {limit}) counts house stakes over a rolling 24 hours. The minimum stake fits again by {HH:MM} EAT at the latest." |

- **Live warnings** on `/[botId]` overview, recomputed per render and not wizard-only:
  - "Email unconfirmed — he can't top up until he confirms it."
  - "Agent application pending — approval would pause Bot A."
  - "Public name “{name}” can reveal this account — ask him to change it." Triggered when the display name matches `/50pick|house|bot|liquidity|ukwasi/i`, with one AlertOnce `bot:<id>:NAME_RISK:<nameHash>`.
  - "His sign-in is locked until {HH:MM} EAT after wrong passwords. The bot continues; re-verify waits for the lock."
- **Consent is kept for non-RG causes.** After a suspension is restored, freezes are lifted (the strip lists each `freezeReasons` entry via `FREEZE_REASON_LABEL` until the last one clears), or the role returns to PLAYER: Start is enabled without re-verify, and the bot never resumes by itself.
- **Designate order** (after C4 step 2): insert inside `wallet:<userId>`, re-reading the hash. If fp(fresh) ≠ fp(verified): "His password changed a moment ago — enter the new one." (field `password` → replace to consent), and no row is written.
- **Remove modal** (§8) shows live money from `book.ts`: "Money stays in his wallet: balance TZS {x}; open house stakes TZS {y} settle into it. Recover 50pick's float out of band." If the bot is ACTIVE, offer "Pause instead" as a ghost button.
- **§13 add H1 (hardening, not in this build):** "A password change does not sign out his other sessions. The bot pauses regardless (seal-flows §2.1)."

**Test**
- Each row appears per context with its exact copy.
- Close account: Start and Re-verify absent, float line present.
- File ERASURE with an ACTIVE bot: one sweep auto-pauses it.
- Officer sets email, reset link: re-verify refused. Holder's own email change, reset link: allowed.
- `audit()` stubbed to drop `password_reset_by_officer`: still refused, because the check reads `passwordSetVia`.
- Suspend then restore: Start enabled, no re-verify.
- Name "50pick House": one alert.
- A password change interleaved between verify and insert: refused, 0 rows.
- Visual fixture: Remove modal at balances 0, 1,000 and 2,500,000.

---

## C10 · MAJOR · Master switch and Start: every state, stale presses, unsaved edits, lowering max bots
Merged: CA-12, CA-13, CA-22, CA-26 (remainder), plus one new verified gap.

**Evidence**
- F3 refuses ON only while a global cap is unset (plan:73-75).
- The ON action has no version check (plan:372).
- The planner switches OFF on realised loss ≥ cap within 15s (plan:210). So an ON pressed after GLOBAL_LOSS_STOP flips back OFF, and every flip sends bell + email (seal-flows §3.7).
- The unsaved guard only catches link clicks (`unsaved-changes.tsx:437`), so strip buttons ignore a dirty form.
- seal-flows §3.7 says `Toggle tone="gold"`; the owner ruled brand.

**§6 `setHouseBotSwitchAction` (ON), add refusals after "unset limits":**
1. **Global loss already reached.** Today's global realised loss ≥ `gCapDailyLossTzs`: "Can't switch on: today's settled house loss TZS {x} has reached the global daily loss limit TZS {cap}. Raise it on Limits → or wait until 00:00 EAT." Field `gCapDailyLossTzs`, href `?tab=limits`.
2. **Stale safety.** The modal sends `seenSwitchedAt`. If a SWITCH_OFF event is newer: "House bots were switched off by {name | the system: {cause}} at {HH:MM:SS} EAT after you opened this. Read why, then switch on again." The modal closes and the strip refreshes.
- `startHouseBotAction` sends `seenStatusAt`. A PAUSED or AUTO_PAUSED event newer than it gives: "{name | The system} paused Bot A at {HH:MM} EAT after you opened this ({reason}). Review, then Start again."
- OFF, Pause and Remove never check versions (unchanged).

**§8, strip state table (copy composed from the returned facts `{masterEnabled, activeBots, status}`):**

| State | Tone | Copy |
|---|---|---|
| OFF, manual | neutral | "House bots are off. No bot will place a bet." |
| ON, 0 active | warning | "On · no active bot — nothing will be placed. Start a bot →" |
| ON, ≥1 active | success | "On since {t} EAT · {n} active" |
| Bot ACTIVE, master OFF (bot strip) | warning | "Active · waiting for the master switch — no bets until house bots are on →" |

- **ON modal extra lines:** "Bots react only to stakes placed after you switch on." When active bots = 0, also "No bot is active yet, so nothing will be placed until you start one."
- **Start success while OFF:** "Bot A started. House bots are switched off, so it won't bet until you switch them on →".
- **Remove the last active bot while ON:** "Bot A removed. House bots are still on, but no bot is active."
- **Rules save success** is composed from the returned status, e.g. "Rules saved (v8). Bot A is paused (by Ali at 14:03) — press Start when ready."
- **KPI:** "Bots active 0 of 5".
- **Unsaved edits.** While this page's rules or limits form is dirty (`HouseBotFormContext`), Start and ON open a three-choice dialog: "You have unsaved changes on Rules. Start uses the saved rules (v{n}: stake max TZS 10,000), not your edits."
  - "Save and start": Start runs only if the save returns ok.
  - "Start with saved rules".
  - "Cancel".
  - The Start confirm summary is headed "Saved rules (v{n})".
- **Toggle:** seal-flows §3.7 `tone="gold"` → `tone="brand"` (owner ruling).
- **Max designated bots** (owner ruling on lowering caps; replaces plan §5 "≥ current count" and seal-flows §3.8 "Max bots must be at least {n}"):
  - Lowering below the count is allowed through C6's consequence preview: "{n} bots are designated. With a limit of {m}, no account can be designated until {n−m} are removed. No bot is paused."
  - Roster button disabled reason: "Roster over the limit ({n} of {m})".
  - C4's in-lock count uses `count < maxDesignatedBots`.

**Test (`test:house-bot-console`)**
- ON at realised loss = cap: refused with field. At cap − 1: allowed.
- OFF lands after the ON modal opens: stale refusal, `enabled` stays false.
- Pause lands after the Start dialog opens: stale refusal.
- Every strip row renders its exact copy (visual fixtures "On · no active bot" and "waiting for the master switch").
- Dirty form plus Start: dialog appears. A refused save never calls Start (spy).
- `maxDesignatedBots` 5 → 3 with 5 bots: preview returned, save applies, designate refused.
- Source pin: the master Toggle uses `tone="brand"`.

---

## C11 · MAJOR · Keeping the strip live: SSE, polling while dirty, tab return, uncertain results, engine health
Merged: CA-04, CA-18, CA-23, CA-31, CA-30 (client side), ENG-15, -22, -29, -30, FS-19 (display only).

**Evidence**
- `AppShell` returns bare children for `/admin` (`app-shell.tsx:63-65`), so `EventStreamProvider` (`:18-20`) never mounts. `admin/layout.tsx` mounts no stream (grep), and `admin-shell.tsx:291` says "No notification bell here". **The plan's "notification:new triggers an immediate refresh" can never fire.**
- `useEventStream` exists (`use-event-stream.ts:22-27`) and pauses while the tab is hidden (`:55-59`).
- `RefreshPoller enabled=false` registers nothing (`refresh-poller.tsx:44`), and it skips hidden ticks with no visibility listener (`:47-48`). The plan disables it while a form is dirty, so the strip goes stale.
- The runner turns any failure into the generic sentence (`run-admin-action.ts:32`).

**§8 Live state, replace:**
- **Status action.** `getHouseBotStatusAction(botId?)`, owner-only, read-only, no audit. Returns `{master{enabled, offCause, switchedAt, by}, bot?{status, causes[], consentValid, rulesVersion, statusAt, statusBy}, limitsVersion, activeBots, engine{state, lastSeenAt, detail, instances}, serverNow}`.
- **The strip itself:**
  - mounts `useEventStream()` and handles `50pick:sse:notification` where `kind==='HOUSE_BOT'`;
  - polls the status action every 20s **whether or not a form is dirty**;
  - re-reads at once when the tab becomes visible and more than 20s have passed;
  - shows "Updated {HH:MM:SS} EAT".
- **On a change:**
  - If the page is clean, dispatch `50pick:refresh`.
  - If it's dirty, don't refresh. Show a warning Callout, e.g. "Bot A was auto-paused at 14:03 EAT (self-exclusion). Your unsaved changes are kept." or "Rules were saved by {name} at {HH:MM}." Announce it once through C7's single polite region.
  - Show an unread chip "{n} new house-bot alerts" → `?tab=history`.
- **§7 note:** admin bell rows are visible only on the player-side bell. While in the console, email is the dependable channel.
- **Uncertain results** (house-bot runner):
  - After 8s the sub-label reads "Still working — slow connection. Don't close this page."
  - On a transport failure or after 45s: "No answer from 50pick — we don't know if this was saved. Your changes are kept." with a "Check now" button. It compares version and last actor: "It was saved (v8)." or "Not saved — press Save again."
  - **OFF only:** retry automatically twice (it's idempotent), then read status. If still ON, show a danger Callout: "Could not confirm the switch-off. Press Off again, or pause each bot." Never the generic sentence.
- **Engine health table** (display only; the runtime fields belong to the §4.2 owner):

| Condition | Tone | Copy |
|---|---|---|
| ON, ≥1 active, poller stale | danger | "The bot engine is not running (last seen {t} EAT). No bot will place a bet." |
| poller error newer than its beat | danger | "The bot engine is failing (last error {t} EAT: {code}). No bot will place a bet." |
| planner stale only | warning | "Loss stops, fills and summaries are delayed (last run {t} EAT). Bets still stop at every cap." |
| `HOUSE_BOT_ENGINE=false` | neutral | "Bot engine disabled by server configuration." |
| < 90s since newest boot | neutral | "Bot engine starting after an update." |
| ON, 0 active, stale | neutral | "Engine not running — bots started now would not bet." |
| several instances | caption | "{n} engines running · last seen {t} EAT", with one line per stale instance |
| beat unreadable | danger | same as the first row, "Last seen: unknown" |

**Test**
- Source pin: the strip imports `useEventStream` and filters on HOUSE_BOT.
- Listener unit: HOUSE_BOT on a clean page gives a status read plus refresh. On a dirty page, status read only. Other kinds are ignored.
- Fake timers: visible after 21s → 1 read; after 5s → 0 reads. A dirty form still polls.
- Pause on AUTO_PAUSED returns `noop:true` with its reason.
- Runner: 8s label, 45s card. Reconciliation decides saved or not saved. OFF with fetch rejected twice → 2 retries, then a status read.
- Callout selector gets a fixture per row at 360 and 1920.

---

## C12 · MAJOR · Sign-out, 2FA expiry, a second device or a deploy never loses edits
Merged: CA-05, CA-06, CA-07, CA-27, CA-28, ENG-02, FS-09 (guard).

**Evidence**
- A stale action throws `UnrecognizedActionError("Server Action … was not found on the server")` (`server-action-reducer.js:78`). The runner catches it as "Server error" (`run-admin-action.ts:23-32`).
- The once-per-build reload exists only in `route-error.tsx:91-102`, which a caught error never reaches. `deploy-skew.test.mts` has no runner case (grep: 0).
- `requireOwner` redirects to `/auth/admin` **without** `next` (`rbac-guard.ts:210`) and throws for non-ADMIN (`:221`). The TOTP redirect is at `admin-guard.ts:71-72`; the TOTP cookie lasts 8h (`totp-cookie.ts:3`).
- A login on another device nulls the session (`session.ts:141-170`).
- Back is not guarded (`unsaved-changes.tsx:23`), and only link clicks are intercepted (`:437`).

**§6, replace "each starts with requireOwner" with `requireHouseOwner()`** (new in `rbac-guard.ts`; the one owner predicate; never redirects or throws):
- Returns `{ok:false, code:'REAUTH_LOGIN'|'REAUTH_TOTP'|'NOT_OWNER', href?}`. NOT_OWNER keeps the SECURITY `privilege_escalation_blocked` row.
- Runs before any password check or write.
- Client copy:
  - **REAUTH_TOTP:** Modal "Your 2-step check has expired. Verify again to save — your changes are kept." with "Verify now" → `/admin/totp-verify?next=<url>`.
  - **REAUTH_LOGIN:** "You were signed out because {you signed in on another device | your session expired}. Sign in again — your unsaved changes are kept on this device." → `/auth/admin?next=<url>`. The reason comes from the `kp_revoked` flash.
  - **NOT_OWNER:** "Only an admin can do this. Your access changed — reload the page."

**§8, add:**
- **Deploy.** `runAdminAction` gains an additive branch: `UnrecognizedActionError` (by name or the /was not found on the server/ message) → `{ok:false, code:'STALE_BUILD', error:"50pick was updated. This page is from the previous version, so nothing was saved. Your changes are kept — press Reload, then save again."}`. The house-bots runner renders a Reload button (a GET, never a replay).
- **Draft** (`src/lib/house-bot/draft.ts`):
  - sessionStorage key `hb:draft:<route>:<entityId>`, written on every change (300ms debounce) with `baseVersion`;
  - any key matching `/pass|secret/i` is dropped;
  - 30-minute TTL; cleared on save, Discard or Remove.
  - Restore Callout: "Restored changes you had not saved ({HH:MM}). Check them and press Save. · Discard". If the version has moved since, restoring enters C6's STALE_VERSION compare instead.
  - Password fields are always empty after REAUTH, STALE_BUILD, Back or Refresh, with "Enter the password again — it is never kept."
- **Pending OFF across a deploy.** Before OFF, write `hb:pendingOff={at, build}`. After a reload, if the switch is still ON and the marker is under 2 minutes old, show a danger Callout: "Your switch-off did not reach the server because 50pick was updating. House bots are still ON." with a primary "Switch off now" button. Never auto-replayed.
- **Wizard.** Every step render re-runs `houseBotEligibility(userId,{context:'designate'})`. If the account is now a live bot, show the check card "Already house bot “Bot A” · Open bot" with no password field.

**Test**
- With no TOTP cookie, each action returns REAUTH_TOTP, doesn't throw `NEXT_REDIRECT`, and changes 0 HouseBot, event or control rows.
- Registry pointing at another session id → REAUTH_LOGIN with the other-device reason and `next` in the href.
- FINANCE session → NOT_OWNER plus a SECURITY row, and the target's `failedLoginCount` is unchanged.
- `test:deploy-skew`, new arm: UnrecognizedActionError → STALE_BUILD.
- Fuzzed field names never store a password key. Restoring over a changed version routes to the compare flow.
- A pendingOff fixture with the switch ON renders the Callout.
- Wizard at `step=review` for an account that is now a bot renders the Open link.
- red: swapping back to `requireOwner` fails "no redirect on save".

---

## C13 · MAJOR · Notifications: who is told, over which channel, with links that still work later
Merged: HB-ACC-08, -10, -11, -31, -33, HB-LC-28, FS-09, FS-16, FS-17, CA-32 (engine-alert link), ENG-25 (summaries), ENG-28.

**Evidence**
- `notifyHouseBotOwner` covers only designated, started, paused, password pause and removed (plan:387). A re-verify without resume tells the holder nothing (seal-flows §2.6).
- The §7 engine-alert link `?tab=activity&outcome=failed` has no range, and the activity presets start at today (design spec S1), so a week-old alert opens an empty list.
- The design spec uses `#reverify` (S3); seal-flows uses `?reverify=1` (X7, §2.4).
- `requireOwner` accepts any ADMIN (`rbac-guard.ts:212`), yet RULES_SAVED, LIMITS_SAVED, STARTED and VERIFIED alert nobody.
- `isLockedOut` exists at `responsible-gambling.ts:349-360`.

**§7, add a status × cause matrix** (also in `comms-registry` and HOUSE-BOTS.md):

| Event | Admins | Holder |
|---|---|---|
| auto-pause of an ACTIVE bot | bell + email | ~~bell + push, except for RG causes and own loss limit~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** none; the holder receives no house-bot notice (C4 ruling 149). |
| cause added to a non-ACTIVE bot | bell | — |
| account closed | bell + email with float amounts | ~~email only~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** none (C4 ruling 149). |
| cause cleared (restored, freeze lifted, role back to PLAYER, break ended) | bell, AlertOnce `bot:<id>:CLEARED:<cause>:<clearedAt>`: "Bot A can be started again — {cause} cleared{; confirm his permission first}" | — |
| holder locked out by wrong sign-ins | SECURITY bell, AlertOnce per day: "Holder of Bot A was locked out after 5 wrong sign-in attempts (until {t} EAT). The bot continues." | — |
| holder stakes against his own bot (owner ruling: alert, never refuse) | bell + email, AlertOnce `holder-conflict:<botId>:<marketId>`: "Holder of Bot A staked TZS {x} {SIDE} against Bot A's TZS {y} {SIDE} on {market}." → `/admin/markets/<marketId>` | — |

- **Roster alerts.** `notifyAdminsHouseBotRoster` goes to every recipient passing C12's predicate: bell + email, uncapped, title ends HH:MM:SS.
  - Events: DESIGNATED, VERIFIED, STARTED, manual PAUSED, REMOVED, and RULES_SAVED / LIMITS_SAVED with a diff, e.g. "Bot A: daily loss cap TZS 50,000 → TZS 200,000 by Juma M. at 14:02:11 EAT".
  - Link: `/admin/desk/<id>?tab=history&event=<eventId>`.
- ~~**Holder transparency.** `notifyHouseBotOwner` gains two kinds (sw/zh drafted for native review):~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** `notifyHouseBotOwner` and every holder notice are deleted (C4 ruling 149): the holder is told nothing when consent is re-verified, a password try is reserved or the bot is designated; the admins' alerts stand.
  - ~~`reverified` (bell + push + email): "50pick confirmed your permission for liquidity stakes with your current password at {HH:MM} EAT. If you did not give your password to 50pick, change it now — that stops liquidity stakes at once."~~
  - ~~`verify_reserved` (bell): "Someone at 50pick tried to confirm your permission with a wrong password. Your sign-in is not locked."~~
  - ~~The designated notice adds: "You can stop this at any time by changing your password or contacting 50pick."~~
- **RG gate.** ~~Every holder HOUSE_BOT emitter returns early while `isLockedOut(userId).locked`.~~ Outcome notices keep today's behaviour. ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder HOUSE_BOT emitter to gate (C4 rulings 149–150).
- **Channel.** HOUSE_BOT is never sent by SMS (`comms-registry` entry `sms:'never'`).
- **Summaries** are built from PLACED intents in [HH:00, HH+1:00) EAT beyond the cap, and claimed once through AlertOnce `summary:<audience>:<botId|all>:<EAT hour>`. The runtime `countInHour` is only the live throttle.
- **Links** (extend C7's table):
  - Auto-pause whose way out is re-entering consent (password change, or C8's void) → `?reverify=1`. Other pauses → the bot page. `?reverify=1` replaces the design spec's `#reverify`; HashFocus still targets `id="reverify"`.
  - Engine alert → `?tab=activity&range=all&outcome=failed&intent=<intentId>`.
  - ~~Holder stake → `/positions/<positionId>` (the route exists).~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder per-stake notice, so there is no holder link (C4 ruling 149).
  - On a REMOVED bot, every link renders the read-only page.
- **Limits hint** under bell alerts/hour: "At {n} per hour each admin can get up to {24n} bet rows a day, plus summaries and pause, money and switch alerts."

**Test (`test:house-bot-comms`)**
- Matrix rows give exact recipients and channels.
- A second ADMIN saving rules → both ADMINs get the diff.
- ~~Re-verify gives 1 holder row in 3 locales plus an email. 2 wrong tries → 0 rows; reaching reserve → 1 row.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** re-verify, wrong tries and the reserve give the holder 0 rows and 0 emails (C4 ruling 149).
- RG-locked holder: 0 HOUSE_BOT holder rows.
- Stubbed SMS fan-out is never called.
- Bets straddling 14:00 EAT: 20 bells plus 1 summary with N=5.
- With now = event + 60 days, each href's route file exists and its resolver includes the event.
- Holder conflict: 1 alert, and the player's bet is never refused.

---

## C14 · MINOR · Scope, timing and rule validity over time
Merged: HB-LC-12, -19 (preview), -23, -24, FS-07, -10, -11, -15 (rules part), -20, -24, -27, ENG-25 (cap windows).

**Evidence**
- Plan §5 hard-codes "durations ⊆ 3/5/10/15/30/60" and defaults chains and categories to "all".
- Canonical lists: `ALLOWED_DURATIONS` (`updown-durations.ts:85`), `MARKET_CATEGORIES` (`categories.ts:29`).
- The "min gap ≥ 20 s" literal comes from `bet.place` refill 10/min (`rate-limit.ts:95`). Stake bounds are at `payout.ts:166-168`.
- The console's time helpers follow the admin-configurable platform timezone (`utils.ts:265`, `platform-config.ts:33`, `:70`). Statutory periods are pinned (`report-pack.ts:55`). The plan's day and schedule logic is EAT.

**§5 amendment**
- **Scope.** `chains: ChainKey[]` (asset + duration) and `categories: MarketCategory[]`, both explicit, new bots start empty.
  - "Select all current" fills the list but doesn't save.
  - A chain or category added later is out of every bot's scope. Neutral roster Callout: "New Up & Down chain {BTC 1-min} isn't in any bot's scope →".
  - Valid sets come from `ALLOWED_DURATIONS`, enabled assets and `MARKET_CATEGORIES`. Labels use `satisfies Record<MarketCategory,string>`.
- **Parsing.** `parseHouseBotRules(json)` → `{ok, rules, stale[]} | {ok:false, code:'RULES_FROM_FUTURE'|'RULES_OUTDATED'|'RULES_INVALID', field?}`, with `rules.schemaVersion` kept separate from `rulesVersion`.
  - Unknown values are dropped and flagged: "Rules mention {BTC 2-min}, which no longer exists — review and save."
  - From a future version: the engine skips the bot without pausing.
  - Outdated or invalid: AUTO_PAUSED(RULES_INVALID, field), way out "Rules → Save → Start".
  - New fields default to their narrowest value.
- **Live-derived bounds.**
  - `minGapFloorSec = ceil(60/(RATE_RULES['bet.place'].refillPerMin × 0.3))` (20s today). Stake bounds are imported.
  - Per-chain fit (FILL lead, OPENER delay) is a **warning**, not a refusal: "OPENER delay 90 s doesn't fit BTC 3-min — those rounds are skipped."
  - Start refuses when a saved value breaks a live bound: "Can't start: the platform minimum stake is now TZS 2,000; Stake min is TZS 1,000." (field `stakeMinTzs`).
- **Timing preview.** `effectiveTiming()` returns `counter: 'never' | {...}` per product and duration, labelled "For markets created from now (current exit settings)".
  - When live settings differ from open markets' frozen ones, add "Markets already open keep their own exit window."
  - The Start dialog warns when every enabled mode is `never`.
- **Cap windows:** per hour = rolling 60 min; per day = EAT day; min gap = since this bot's last placed bet; bets per minute = rolling 60s. A hint under each field names its window.
- **Time law.** All house-bot day keys, hour keys, schedule windows and console times go through `src/lib/house-bot/clock.ts`, labelled "EAT" whatever the platform timezone.
  - It builds on `eat-day.ts:24-32` (fixed +3h, no server imports).
  - This is an explicit exception to the design spec's §1 formatting rule, following the `report-pack.ts:55` precedent.

**Test (`test:house-bot-rules`)**
- `ALLOWED_DURATIONS` fixture gains 1 and 120: the saved scope is unchanged. An extra category is excluded.
- A legacy JSON with an unknown chain loads and is flagged. v99 → RULES_FROM_FUTURE with the intent left PENDING.
- Refill 2/min → floor 100s, and a saved 30s bot becomes invalid.
- Paid exit window 60 → counter `never` for polls.
- 20 bets by 13:59 plus one at 14:00:30 → CAP_PER_HOUR.
- Platform timezone set to UTC: the EAT day boundary stays at 21:00Z. Source pin: no `formatDateTime` import under `admin/desk/**`.

---

## C15 · MINOR · Schedule windows and duration fields
Merged: CA-34, CA-16.

**Evidence**
- `deriveTime` returns `{value:"", invalid:false}` while a time is half-typed (`time-mask.ts:117-128`), so "2_" looks empty but valid.
- DurationInput emits minutes only (`duration-input.tsx:7-8`), clamps silently (`:52-55`, `:102`) and defaults to `sm` (`:77`, 36px at `:139`).
- Plan §5 has seconds fields, while plan:446 lists DurationInput as a kit control.

**§5 Schedule, replace the row:**
- Windows are stored per day as minutes [start, end), where an end of 00:00 = 1440.
- An overnight row belongs to its start day and spills into the next ("Mon 22:00 → Tue 02:00 (overnight)"); Sunday spills into Monday.
- Validation:
  - start = end: "Start and end are the same — use All day for 24 hours."
  - 23:59 → 00:00 is valid.
  - A touched but incomplete time: "Enter a time as HH:MM."
  - Overlap is checked after expansion, reported on the later row: "Overlaps Mon 22:00 → Tue 02:00."
  - At most 4 rows as shown (an overnight row counts once). "Add window" disables at 4 with "Up to 4 windows".
- `TimeSelect size="md"`. Toggling All day keeps the rows in the draft.

**§8 controls:**
- `*Sec` fields use C1's `HouseNumberField` with `trailing="s"`.
- DurationInput is allowed only for minute-scale poll fields, with `size="md"` and min/max equal to the validator bounds.
- Its wrapper compares typed value × unit against the emitted value and shows "At most 30 days (43,200 minutes)" or "At least 1 minute" instead of snapping. The echo must equal the saved value.

**Test**
- Windows matrix: 00:00–00:00 · 23:59–00:00 · Mon→Tue overnight · Sun→Mon wrap · overlap after split · half-typed time · 5th row.
- Source pin: no DurationInput bound to a `*Sec` field.
- Typing 50,000 minutes gives the error, and the saved value is unchanged.

---

### Critical Files for Implementation
- C:\kipindi-main\src\components\ui\input.tsx
- C:\kipindi-main\src\lib\client\run-admin-action.ts
- C:\kipindi-main\src\lib\server\rbac-guard.ts
- C:\kipindi-main\src\lib\server\responsible-gambling.ts
- C:\kipindi-main\src\components\ui\refresh-poller.tsx

---

# House bots: §9 and §10 amendments R5–R9 and P2–P4 (compliance-data and future gaps)

I read the code in `C:\kipindi-main` at HEAD `ac411357`, without editing anything. R1–R4, P1, A1–A24 and C1–C15 are not repeated here. R5 fills slot A6, which amend-core left unwritten.

## 0. Gaps dropped: already covered or false

| Gap | Why it is dropped |
|---|---|
| CRA-01 | seal-flows §3.2–3.9 and A19 already name the audits. What remains (label in a payload, split categories) is in R7. |
| CRA-02, CRA-08, CRA-11, FS-22 | ~~R1, plus~~ A16 (decision snapshot) and A20 (never deleted). ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1 is struck (C5-SPEC rulings 199–213), so no house report or export answers these ids; A16 and A20 still keep the records. |
| CRA-03 | Moved to R8. |
| CRA-04, CRA-10, HB-ACC-12 | Moved to R5. ⛔ **Superseded by D20 (Ali, 2026-09-17):** R5's house projection is built nowhere (see R5). |
| CRA-05 | A5 covers closure, the refusal and pseudonymising. What remains is in R6. |
| CRA-06 | A5 §4.4 (`why` stores only the id handle). |
| CRA-07 | A20 sets the periods. The retention doc, admin page and purge payload are in P3. |
| CRA-09, CRA-23 to CRA-27, FS-30 | P1. |
| CRA-12, FS-05 | R4. |
| CRA-13 | A19. |
| CRA-14 | Console triage: ~~R1 indexes the rows, and~~ `/admin/audit` is a shared page. ~~R7 makes that index complete.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1's audit index is struck (C5-SPEC ruling 207). |
| CRA-15 | A16 refuses a purge while intents are live. A20 adds the house tables to the NEVER list. The cost-panel rows are cosmetic. |
| CRA-16, CRA-17 | ~~R2 covers the display. The audit evidence is in R9.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R2 and R9 are struck (C5-SPEC rulings 187–196); no resolver screen or decision audit names house money. |
| ~~CRA-18, -19, -20, -22,~~ FS-29 | R3. ⛔ **Superseded by D20 (Ali, 2026-09-17):** R3's §9 additions, which answered CRA-18 to CRA-22, are struck (C5-SPEC rulings 224–231); FS-29 (fees) is not a report split and D20 does not change it. |
| CRA-21 | ~~The §9 `summarise` house line already gives house stakes ÷ stakes.~~ A margin delta tile adds no statutory value. ⛔ **Superseded by D20 (Ali, 2026-09-17):** `MoneySummary.house` is struck (C5-SPEC ruling 225); hold % and margin include house stakes as player activity, an accepted consequence recorded for Ali. |
| CRA-28, FS-26 | Core (I2/I10 test line). |
| CRA-29 | Its row-count assertion moves into R7's test. |
| FS-06 | Core dropped it as an owner-level decision. The disclosure-text flip goes with it. |
| FS-17 | C13 and F8 (channel policy). |
| FS-25 | ~~R2 has the single reader.~~ The procedure note adds nothing. ⛔ **Superseded by D20 (Ali, 2026-09-17):** R2 is struck (C5-SPEC rulings 192–196); whether its `houseStakeByMarket` reader stays is decided in checkpoint C5-5b. |
| FS-01 to -04, -07 to -16, -18 to -21, -23, -24, -27, -28, -31 to -34 | Outside §9/§10; already in the A and C amendments. |
| AML public text | `/legal/aml` makes no claim about bet monitoring that house bets would falsify (`legal/aml/page.tsx:89-107`). ~~`detectSuspiciousBets` (`analytics.ts:476`, used at `admin/aml/page.tsx:35`) is already skipped in §9.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** `detectSuspiciousBets` counts a house bot's stakes like any player's; the §9 exclusion is struck (C5-SPEC ruling 230). |
| KYC risk score | No scoring factor reads bets (`kyc-risk.ts:57-79`), so house stakes don't move the score. ~~The display line is in R9.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the KYC card's house line is struck (C5-SPEC ruling 197). |
| `/legal/privacy` §5 | No change. §5 is a summary that already omits notifications and OTP (`privacy/page.tsx:77-84`). House data falls under "Prediction and transaction history: 7 years". |

---

## §9 Reporting

### R5 · MAJOR · Data-rights export for the holder and for trigger players
⛔ **Superseded by D20 (Ali, 2026-09-17):** R5's house projection is never built, in any file: no `houseLiquidityDsarView`, no designations, events, positions or transactions section, and no trigger-player `liquidityDecisions`. D19 had already kept it out of both releasable doors (C5-SPEC rulings 168–170), and D20 strikes its last home, the owner-only internal record (rulings 236–238, 239's internal-record half, 242, 246), with the officer player page's direct transaction read, the S7 chip and the transactions-tab row tag (240–241). **Still standing:** both releasable doors stay house-free, proven by ruling 243's absence cases; the `PENALTY_BOXED` event (built in Commits 1 and 4) is not named by D20 and stays as built, though no export reads it.

*Merged:* HB-ACC-12, CRA-04, CRA-10, and one new finding (the penalty box leaves no durable record).

**Evidence**
- **Player export** (`user-service.ts:45-69`):
  - no positions at all;
  - `transactions: db.txn.findByUser(userId, 1000)`, newest first with `take` (`prisma-dal.ts:1464`);
  - `auditEntries: getAuditForActorDurable(userId, {limit:1000})`, filtered on `actorId` only (`audit.ts:696-722`).
- **Officer bundle** (`privacy.ts:271-318`): 10,000 transactions, no positions.
- **House bet audit rows** stay under the holder's `actorId`, with `payload.houseBotId` (plan H5–H9, A18(o)). A bot at the recommended 200 bets a day fills the 1,000-row audit window in 5 days. Its bet and payout rows push his own deposits out of the export in a few days.
- **Officer player page:** its money KPIs come from `exportUserData().transactions` (`admin/players/[id]/page.tsx:122-125`).
- **Penalty box:** the only record is the AlertOnce key `penalty:<userId>:<day>` (plan:156), which A20 purges after 30 days. Penalty-boxed triggers are filtered out before the SKIPPED row (plan §4.3). Nothing durable records that automated exclusion.

**§9, add a "Data rights" row** (both doors: `exportUserData` and `buildDsarBundle`; bundle `schemaVersion: 2`):
- **Projection:** `server/house-bot/dsar.ts` → `houseLiquidityDsarView(userId)`. It is an allowlist, like `dsarUserView`.
  - `designations[]`:
    - `botId`, `status`, live `causes`, `designatedAt`;
    - `consent {method:"password entered by 50pick", verifiedAt}`, `consentVoidAt`, `consentVoidCause`;
    - `removedAt`, `removedReason`;
    - `writtenBy50pick {label, note}`.
  - `events[]`: `{kind, from, to, at, actor:"50pick owner"|"system"}`.
  - `positions`: house-marked positions `{id, marketId, side, stake, status, payout, placedAt}`, up to 1,000, with `total` and `truncated`.
  - `transactions`: house-marked rows, up to 1,000, with `total` and `truncated`.
  - **Never included:** `passwordFingerprint`, any hash, and officer ids (`designatedById`, `verifiedById`, `actorId`), because those belong to other people.
- **Personal sections:**
  - `transactions` = `findByUser(userId, 1000, {excludeHouseBets:true})` (R3's option).
  - `auditEntries` = `getAuditForActorDurable(userId, {limit:1000, excludeHouse:true})`: raw `NOT (payload ? 'houseBotId')`, with a memory twin. Add `houseAuditCount`.
- **Officer player page:** reads `db.txn.findByUser(id, 1000)` directly. Its output is unchanged, and house rows carry the chip.
- **Trigger players,** both doors: `liquidityDecisions {excludedDays:[{day, cause:"CASHED_OUT_COUNTERED"|"BOTH_SIDES"}], counteredPositionsCount}`. No position ids, times, sides, amounts, bot ids or holder ids (D6). This is a default; the owner may override it.
- **§2/§4.3:** entering the penalty box appends `HouseBotEvent` kind `PENALTY_BOXED {userId, day, cause, intentId}`, kept 7 years. This is the export's source; AlertOnce stays a throttle only.

**Test** (`test:dsar-secrets`, new §6–§8)
- A holder with 1,200 house transactions, 3 deposits and 1,100 house audit rows: both doors contain the 3 deposits and his own audit rows, and `houseLiquidity.designations[0].consent.verifiedAt` is present.
- The JSON contains no fingerprint value, hash value or officer id.
- A column added later to `HouseBot` is absent.
- A trigger fixture 31 days after the AlertOnce purge still shows `excludedDays`, and the JSON has no `hb_`, `hbi_` or bot `userId`.
- Officer page KPIs for a non-holder are byte-identical.

### R6 · MAJOR (a blocked statutory request) / MINOR (leftover data) · What erasure leaves behind on a house account

**Evidence**
- Erasure redacts only `maskName` fragments inside other people's notifications (`erasure.ts:369-372`).
- seal-flows puts `{holder}` and `"{label}"` into admin titles, bodies and emails (`seal-flows.md:106`, `:135`, `:374`, `:421`).
- The platform precedent for admin alerts uses the full `displayLabel` (`notification-service.ts:2082`).
- C2 allows letters in a label, so a label can be the holder's name.
- The `test:erasure` §8 buckets are hand-listed, with no admin-inbox bucket (`erasure.test.mts:524-536`).
- `AnonymizeOutcome.reason` is only `not_found|not_closed` (`erasure.ts:114`). The officer action passes the error straight through (`admin/privacy/actions.ts:126`), but Remove is owner-only.
- A24 says that with `HOUSE_BOT_ENGINE=false` the hook returns before its import, and the L2 sweep runs on a planner timer. So closure may never remove the bot, and A5's refusal then blocks erasure for good.

**§7 copy rule, add:** `{holder}` in every admin HOUSE_BOT title, body and email is `playerHandle(userId)` ("Player #A3F2K8"). It is never `displayLabel`, `maskName` or a phone number. Console pages resolve names live.

**A5 erasure step, add:**
- For each bot row of the user, run `db.notification.redactFragment('"'+label+'"', '"Erased bot '+tail+'"')`. Count it as `houseBotNotificationsRedacted` in the `privacy.erasure.completed` payload.
- `AnonymizeOutcome.reason` gains `house_bot_live`, with the error: "This account is still house bot hb_…. The owner must remove it at /admin/desk/<id> before it can be erased."
- Also send AlertOnce `erasure-blocked:<botId>` to the owner by bell and email.

**A2/A5, add:** the holder hook and closure removal run whatever `HOUSE_BOT_ENGINE` says. The env variable gates only the poller, the planner and the bet-trigger hook.

**Test** (`test:erasure`)
- §8 adds these buckets, each of which must hold no NAME:
  - `notificationsAdmin`: an ADMIN with HOUSE_BOT rows whose label equals NAME;
  - `houseBots`, `houseBotEvents`, `houseBotIntents`.
- §11: a live bot row gives `house_bot_live`; the request stays PENDING; exactly 1 owner alert.
- With `HOUSE_BOT_ENGINE=false`, `closeAccount` gives REMOVED.
- `red:erasure`: a mutation that skips the label redaction fails 8.b.

### R7 · MINOR · One audit table and one payload allowlist for every `house_bot.*` row
*Merged:* the rest of CRA-01, and CRA-29.

**Evidence**
- `house_bot.designated` is written with "label and userId only" (`seal-flows.md:294`). That puts the label into the 7-year chain, which can't be redacted (DATA-RETENTION.md §3; `erasure.ts:417-420` bans erased data in payloads).
- A19's allowlist covers engine actions only.
- Categories are split between two saves that both change money caps:
  - `rules_saved` is ADMIN (`seal-flows.md:363`);
  - `limits_saved` is COMPLIANCE (`:391`).
  - Precedent: the payments kill switch is COMPLIANCE (`payment-ops.ts:160`).
- `getAuditByActionsDurable` filters by category whenever one is passed (`audit.ts:626-639`).

**§6 owner-actions table, add an Audit column** fed from `constants.ts` `HOUSE_AUDIT: Record<action, AuditCategory>`:

| Category | Actions |
|---|---|
| COMPLIANCE | designated, started, removed, switch_on, switch_off, rules_saved, limits_saved, auto_paused, loss_stop, engine_fault, poison, holder_withdrew_consent, reimbursement_recorded |
| ADMIN | paused, intent_cancelled, exported |
| SECURITY | password_verified, password_rejected, verify_rate_limited, verify_account_locked, credential_changed |

- **Allowed payload keys:** botId, holderUserId, from, to, cause, rulesVersion or limitsVersion, `changes[{field, before, after}]` (numbers only), counts, eventId, reason.
- **Never in a payload:** label, note, fingerprint, phone, display name.
- **Reason fields** get the hint: "Kept permanently in the audit log — don't write the holder's name or number."
- ~~**R1 index** reads `getAuditByActionsDurable(Object.keys(HOUSE_AUDIT))` with no category.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1's audit index is struck (C5-SPEC ruling 207); the `HOUSE_AUDIT` table, its categories and the payload allowlist above stand.

**Test**
- `test:house-bot-console`: each action writes exactly 1 row whose category equals `HOUSE_AUDIT[action]`. Payload keys stay within the allowlist. A label seeded equal to NAME appears in no payload.
- Source pin: every `"house_bot.` literal is a key of `HOUSE_AUDIT`.
- `test:house-bot-caps`: 200 house bets write exactly 200 new `market.position.opened` rows and no other rows apart from pause or alert audits. `verifyChain()` is valid.

### R8 · MINOR · House reports, the pack state and RG events read the durable audit table
*Merged:* CRA-03.

**Evidence**
- The ring holds 10,000 rows across all categories and filters after slicing (`audit.ts:63`, `:479-484`).
- At about 11,500 rows a day (DATA-RETENTION.md:229) it already holds less than one day.
- `getReportPack` reads the ring (`report-pack.ts:92`), and so do RG engagement events (`catalogue.ts:879`).
- Bots add up to 5 × 200 = 1,000 rows a day. `kyc-risk.ts:336` has the same defect but belongs to the KYC session.

**§9, add:**
- ~~Every house report builder and the R1 index use `getAuditByActionsDurable` or `getAuditForTargetDurable` and print `truncated`.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no house report builder or R1 index (C5-SPEC rulings 199–213); R8 stands for the report pack and RG engagement below (rulings 214–216).
- In commit 5:
  - `getReportPack` switches to `getAuditByActionsDurable(["pack.prepared","pack.approved","pack.submitted","pack.acknowledged"], {category:"ADMIN"})`, filtered by `targetId`;
  - `buildRgEngagement` switches to the durable reader for `rg.*` actions.
- `kyc-risk.ts:336` is listed in the HOUSE-BOTS.md risks for the KYC owner and is not edited here.

**Test**
- Source pin (positive control): no `getAuditPage` import in `report-pack.ts`, `server/house-bot/**`, or the ~~house and~~ RG builders in `catalogue.ts`. ⛔ **Superseded by D20 (Ali, 2026-09-17):** there are no house report builders (C5-SPEC rulings 199–208); the pin stands for the pack, `catalogue.ts` and the house-bot modules (ruling 215).
- `qa:house-bots-local` (Postgres): pack prepared and approved, then 12,000 BET rows, then a fresh module → `getReportPack().state === "approved"`. The in-memory store can't prove this, because the durable reader falls back to the ring (`audit.ts:633-637`).

### R9 · MINOR · Record what resolvers and identity officers saw
⛔ **Superseded by D20 (Ali, 2026-09-17):** this whole section is struck. No decision audit (`market.adjudicated`, `market.emergency_void`, `objection.rejected`/`upheld`, `market.resolve.bulk`/`bulk_override`) carries `houseStake` or `houseStakes`, and the KYC card has no house line and `kycMoneyFacts` no house fields (C5-SPEC rulings 187–191 and 197, built in Commit 5 steps 4–5 and un-built in checkpoint C5-5b). Nothing in it stands.

**Evidence**
- These audit payloads carry pools but no house stake:
  - `market.adjudicated` (`market-service.ts:3060-3081`);
  - `market.emergency_void` (`:4208-4212`);
  - `objection.rejected` and `objection.upheld` (`objections-service.ts:422-426`, `:545-551`);
  - `market.resolve.bulk` and `bulk_override` (`bulk-resolve-action.ts:277`, `:325`, `:367`).
- P1's Board draft accepts "a single admin may resolve markets the house holds". That can only be audited if the chain records what was held.
- The identity review card shows "Bets placed · TZS staked" from all BET_PLACED rows (`admin/kyc/[id]/page.tsx:369-376`, `kyc-risk.ts:132-134`), so a holder's withdrawal review mixes in house stakes.

**F11/§9, add sanctioned change (q):**
- Those payloads gain `houseStake:{yes,no}`, read in the same call through R2's `houseStakeByMarket`, and `{0,0}` when there is none. Nothing else in the output changes. Extended by N1–N2 to `houseStake:{yes,no,staffChosen:{yes,no,requestedBy}}`.
- `kycMoneyFacts` gains `houseBetCount` and `houseStakedTzs`. The card adds "of which 50pick liquidity stakes: N · TZS X" when they are above 0. Coordinate with the KYC owner after D15.

**Test** (`test:house-bot-reports`)
- A single-admin resolve of a market where the house holds NO 40,000 gives `payload.houseStake = {yes:0, no:40000}`. Emergency void and an upheld objection give the same.
- A non-house market gives `{0,0}`.
- `test:two-admin` and `test:officer-conflict` pass unchanged.
- The KYC card shows the line for a holder; a non-holder's snapshot is identical.

---

## §10 Public text and docs

### P2 · MINOR · The Terms §10 notice: the smallest honest mechanism (settles P1's open question)

**Evidence: what the code can actually send**
- Terms §10 promises "in-app + SMS" notice at least 14 days ahead (`terms/page.tsx:222`, sw `:378`).
- `smsConfigured()` is false in production on the console provider (`sms.ts:109-112`).
- The only in-app broadcast is `platform-config.announcement` (`platform-config.ts:22-28`):
  - one untranslated string;
  - player pages only, dismissible for the session (`announcement-banner.tsx:6-10`, `:38-45`);
  - set from `/admin/system` (`admin/system/actions.ts:136-152`).
- There is no notify-all-players function.

**Evidence: precedents**
- 2026-09-07: a "correction; nothing the platform does changed" (`COMPLIANCE-DECISIONS.md:855-862`).
- KYC 2026-09-13: waived as "player-favourable", plus "do not re-add a site-wide bar" (`:65`, `:74`, `:94-108`).

**Choice under D2/D7: no banner, no bell, no SMS.** ~~Add the "Terms §10" text below to the §10 COMPLIANCE-entry bullet:~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no rulebook or Terms text changes, so Terms §10's notice is not engaged and there is nothing to waive; nothing is broadcast (D19a: no announcement).

> ~~"Terms §10 promises written notice (in-app + SMS) 14 days before a material change. This change is material and changes what the platform does, so neither the 2026-09-07 correction reasoning nor the 2026-09-13 'favourable to players' reasoning applies. The notice is waived on Ali's ruling alone (D2/D7), effective on deploy. Nothing is broadcast: the platform has no trilingual in-app notice channel (the /admin/system banner is one untranslated, dismissible string) and SMS cannot deliver in production (`smsConfigured()` is false). ⚠️ Open defect, not fixed in this build: §10's 'in-app + SMS' promise cannot be kept for any future change until SMS is live and a localised notice exists — owner to decide. Existing players keep `acceptedTermsVersion`; no re-acceptance."~~

~~**Code comments:** above META in `terms/page.tsx` and `rules/page.tsx`, add a house-bots block in the style of `terms/page.tsx:27-41`.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the legal pages keep exactly what they have on `main`, with no house-bots comment block.

**Test** (`test:house-bot-disclosure`)
- ~~The house entry in COMPLIANCE-DECISIONS.md contains "waived on Ali's ruling alone", "smsConfigured" and "no re-acceptance".~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no Terms §10 waiver to pin.
- No file under `house-bots` imports `setAnnouncementAction` or `setPlatformConfig`.
- ~~Both legal pages carry the house META comment.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** both legal pages stay byte-identical to `origin/main`.

### P3 · MINOR · Retention: the authority doc, the published page and the purge payload
*Takes the doc half of CRA-07; the periods are A20.*

**Evidence**
- DATA-RETENTION.md says every other statement must agree with it (`:3-5`). Relevant places: the class table (`:18-39`), the "Never" tier (`:95`), "touches exactly three classes" (`:260`, already stale given `retention.ts:149-157`), and the §7.1 NEVER row (`:339`).
- The page schedule is `admin/retention/page.tsx:36-77`.
- `RetentionResult` and the audit payload are at `retention.ts:88-107` and `:159-177`.

**DATA-RETENTION.md §1, add these rows:**

| Class | Period | Measured from | Basis | Enforcement | Where |
|---|---|---|---|---|---|
| House-bot designation and consent record | 7 years | Removal | POCA Cap 423 §16 (the record behind marked positions) | **Never deleted**. Label, note and free-text reasons are pseudonymised on erasure (§2b) | `HouseBot`, `HouseBotEvent` |
| House-bot decisions (each stake, each trigger not countered, penalty-box entries) | 7 years | Decision | POCA Cap 423 §16; GBT evidence | **Never deleted**; id handles only, never names | `HouseBotIntent`, `HouseBotEvent` |
| House-bot alert throttles | 30 days | Creation | Operational only | ✅ Code: `retention.purge.daily` (`HOUSEBOT_ALERT_ONCE_RETENTION_DAYS`) | `HouseBotAlertOnce` |
| House-bot runtime counters | ⛔ N/A: fixed rows overwritten in place | — | — | nothing to purge | `HouseBotRuntime` |

**Other doc edits**
- **Transactions and Positions rows:** add "(including `houseBotId` markers)".
- **§2b tier ①:** add "HouseBot label → `Erased <tail>`; note, removedReason and event reasons → `[erased]`; the quoted label is redacted in admin HOUSE_BOT notifications."
- **§2b ⛔ Never:** add `HouseBotIntent` and the markers.
- **§4:** replace "exactly three classes" with the named list: notifications, OTP, AI payloads, agent documents, house alert throttles.
- **§7.1 NEVER row:** add the three house tables.

**Code**
- `retention.ts`: export `HOUSEBOT_ALERT_ONCE_RETENTION_DAYS = 30`. Run a best-effort `.catch` pass. Add `houseBotAlertOncePurged` to `RetentionResult`, to the audit condition and to the payload.
- `/admin/retention` SCHEDULE: add two rows, each importing its constant:
  - "House-bot designation and decision records · 7y · POCA Cap 423 §16";
  - "House-bot alert throttles · 30 days · purged nightly".

**Test**
- `test:retention`: 400-day-old bot, event and intent rows survive; a 31-day-old AlertOnce row is deleted; the payload carries `houseBotAlertOncePurged`; a second pass is a no-op.
- `test:house-bot-disclosure` §docs: DATA-RETENTION.md names all 4 tables, and the page row period equals the constant.

### P4 · MINOR · Complete the docs list, and test doc content with something that can fail

**Evidence**
- **`test:docs` can't check content.** `docs-links.mjs:10-13` only checks links, script paths and npm script names. So "test:docs greps the risk line" (A1) and "finds the preflight" (A23) always pass.
- **FLOWS.md** has only §1–§8 (`FLOWS.md:11-116`). Its §3 row at `:66` still says settlement is two-officer, while a single admin is the default (`resolution-policy.ts:5-8`).
- **RULES.md** states rules that house stakes change: the §1 table (`:51-61`), §2.4 (`:208`), §2.5 (`:259`), §2.6 (`:321`) and §2.10 (`:488`).
- **FAILURE-INVENTORY §7 lexicon** starts from `schema.prisma` enums (`:802-806`; `label-lexicon.test.mts:59-65`). House statuses are TEXT + CHECK, so the lexicon can't see them.
- **AGENT-PROGRAMME.md** §5 (`:212`) has no house exception, although A17 skips accrual on house stakes.

**§10 Docs, add:**
- **RULES.md:**
  - §1 row "House liquidity stakes | accounts 50pick operates may stake; same fee, bounds and cut-offs; no cash-out, wagering, commission or objection standing | Both".
  - New "### 2.11 · House liquidity stakes", covering decided (the COMPLIANCE entry), enforced (H0–H4 and (d)–(g)), configured (`/admin/desk`) ~~and stated (rules §8 carve-out, §3/§4, terms §4, privacy §3)~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** no public surface states it; the rulebooks, Terms and privacy notice carry no house text (D19a).
  - One cross-reference line each in §2.4, §2.5, §2.6 and §2.10, plus a §6 history row.
- **FLOWS.md:** new "## 9. House liquidity gates". Correct §3 `:66` to "single admin by default; two officers when enabled".
- **FAILURE-INVENTORY.md:** §6 rows (as planned) and new §7.1 families: HouseBot status, pause reasons and causes, HouseBotIntent status, EngineCode. Admin words come from `status-tone.ts` and `feed-copy.ts`; ~~the player sees only the holder chip~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** a player, the holder included, sees no house chip or house word (D19c).
- **AGENT-PROGRAMME.md §5:** "No commission, first-bet or turnover reward accrues on house-marked stakes or settlements (`houseBotId`); the holder's own bets accrue normally."
- **DATA-RETENTION.md:** as in P3.
- **Doc-content tests:** every "test:docs greps/finds" in A1, A23 and CRA-25 moves into a `docs` section of `test:house-bot-disclosure`. `test:docs` stays a link check.

**Test** (`test:house-bot-disclosure` §docs)
- It finds `### 2.11` and the RULES §1 row, `## 9` in FLOWS, the 4 families in §7.1, and `houseBotId` in AGENT-PROGRAMME §5.
- It finds the HOUSE-BOTS.md §13 risk-7 line and the preflight and runbook headings.
- red: deleting one heading turns it red.
- `test:docs` still passes.

---

## Commit placement

| Commit | Items |
|---|---|
| 1 | R7 `HOUSE_AUDIT` constant · P3 and P4 doc skeletons · R5's `PENALTY_BOXED` event kind |
| 3 | R6 erasure step and `house_bot_live` |
| 4 | R5 penalty-box event write · R6 §7 copy rule and hook not gated by the env variable · P3 `retention.ts` pass |
| 5 | ~~R5 DSAR views and~~ DAL options · R8 · ~~R9~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R5's house projection and R9 are struck (C5-SPEC rulings 187–191, 236–238); R8 stands. |
| 6 | P2 |
| 7 | R7 console audit pins |
| 8 | P4 final docs |

Two defaults the owner may override: R5 (what trigger players get in their export) ~~and P2 (the §10 SMS-promise defect)~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** P2's §10 waiver is not engaged, because no Terms text changes (D19a).

### Critical Files for Implementation
- C:\kipindi-main\src\lib\server\user-service.ts
- C:\kipindi-main\src\lib\server\privacy.ts
- C:\kipindi-main\src\lib\server\erasure.ts
- C:\kipindi-main\src\lib\server\retention.ts
- C:\kipindi-main\docs\DATA-RETENTION.md

---

# House bots: §11–§13 amendments (S1–S5), future safeguards (F1–F9), unowned compliance-data (G1–G2)

Everything was checked against `C:\kipindi-main`. HEAD is `ac411357`, the KYC commit, which exists only locally. `origin/main` is `c63a4668`. The KYC migration file has been edited again since it was committed.

## 0. Dropped (already covered or false)

**Future gaps**
- FS-01: A12 does the scope check. What is left over is in F1.
- FS-02, FS-16: seal-flows §2/§6, A2, A3, A4.
- FS-03: A10 (compile-time mapper).
- FS-04: A14.
- FS-05: R4. ~~What is left over is in F9.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** F9's walker is struck with R4's source pin (C5-SPEC rulings 233, 256); R4's no-reward rule stands.
- FS-06: A-core dropped it. The brief requires it, so a lean version is F2.
- FS-07: A4 and C14. What is left over is in F4.
- FS-08, FS-13: A7. What is left over is in F3.
- FS-09: A22, C12, C13.
- FS-10, FS-11, FS-20, FS-24, FS-27: C14 and A16.
- FS-12: A13.
- FS-14: A17 and A2 row 13.
- FS-15: A7 and C14. What is left over is in F5.
- FS-17: C13. What is left over is in F6.
- FS-18: A23 and D15. What is left over is in S1.
- FS-19, FS-21: A24. What is left over is in F7.
- FS-22: ~~R1,~~ A16, A20. ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1 is struck (C5-SPEC rulings 199–213).
- FS-23: A10, plus the "do not restore" note at `market-service.ts:1079-1082`.
- ~~FS-25: R2.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R2 is struck (C5-SPEC rulings 192–196).
- FS-26: A16 and I10. The test line moves to S4.
- FS-28: plan (e) plus the money test.
- FS-29: R3.
- FS-30 (new locales): P1 (~~`Record<Locale>` copy, and~~ the disclosure test loops over `Object.keys(dict)`). ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder chip, holder notice, house refusal copy or public disclosure to translate; the non-disclosure suite's loop over every locale is what covers a new one.
- FS-31: contradicts D5.
- FS-32: A12.
- FS-33: A15.
- FS-34: there is no currency-change path.

**Compliance-data gaps**
- CRA-01: seal-flows C7 and A19.
- ~~CRA-02, -08, -11: R1.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1 is struck (C5-SPEC rulings 199–213).
- CRA-03: this defect already exists. The platform writes about 11,500 audit rows a day (`DATA-RETENTION.md:229`), which is more than the 10,000-row global ring that `report-pack.ts:92` reads. House bots add about 9%. Report it as a platform defect, not a house-bot item.
- CRA-05, -06: A5.
- CRA-07: A20.
- CRA-09, -23 to -27: P1.
- CRA-12: R4.
- CRA-13: A19.
- ~~CRA-14: R1's index.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1's audit index is struck (C5-SPEC ruling 207).
- CRA-15: A16 and A20.
- ~~CRA-18, -19, -20, -22: R3.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** R3's §9 additions are struck (C5-SPEC rulings 224–231): the harm and AML detectors, the FIU SAR, the GBT pack and the match-integrity report treat a house bot's account like any player's.
- ~~CRA-21: R3's no-marker twin already pins the statutory hold %. The delta tile is optional presentation.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no house split to twin and no delta tile; hold % and margin include house stakes as player activity, an accepted consequence recorded for Ali.
- CRA-28, -29: moved into S4.
- CRA-10: needs an owner ruling (D10). Nothing is built by default.

**Topics from the brief that are already covered:** the compile-time exhaustive mapper (A10), the timezone (C14), and new locales (P1).

---

## S1 · MAJOR · §11 precondition and migration law (before and in commit 1)

**Evidence**
- The start script is `prisma migrate deploy && next start` (`package.json:12`), so DDL commits while the old container is still serving (`LIVE-QA-CAMPAIGN.md:1636`, E-174).
- "Prisma wraps migrations in a transaction, and CONCURRENTLY cannot run inside one" (`migrations/20260731090000_txn_createdat_index`).
- `git status` shows `prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql` modified after its commit.

**§11 Setup, replace the first bullet with:**
> **P0, before commit 1 (stop and tell Ali if any check fails):**
> 1. `git fetch`, then `git cat-file -e origin/main:prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql`.
> 2. The KYC session's final commit, named in its handoff, is on `origin/main`.
> 3. Production `_prisma_migrations` row `…kyc_at_withdrawal` has `finished_at` set, `rolled_back_at` null, and a `checksum` equal to the sha256 of the `origin/main` file. Any mismatch is NO-GO.
> 4. The worktree is created from that SHA.
>
> **Migration law:**
> - Line 1 is `SET LOCAL lock_timeout = '3s';`.
> - New columns are nullable with no default.
> - Nothing is dropped, renamed or made NOT NULL on existing tables.
> - `IF NOT EXISTS` everywhere.
> - Large indexes are built `CONCURRENTLY` by hand, per A23.

**Test: new suite `test:house-bot-migrations` (local Postgres)**
- **(a) Replay:** both files, run twice, on an empty database and on a KYC-migrated database, raise no error.
- **(b) Blocked apply:** with an open transaction holding a Position row lock, the apply fails with 55P03 in 3.5 s or less, and a concurrent Position INSERT commits within 1 s of that failure. The apply never stalls the queue.
- **(c) Old build on new schema:** the pre-merge `origin/main` build, booted on the migrated database, gets exit 0 from its own `prisma migrate deploy`. A bet, settle and cash-out smoke test passes.

## S2 · MAJOR · §11 Release: exact checklist (commit 8; replaces the §11 "Release" paragraph and the §17 RELEASE block)

⛔ **SUPERSEDED 2026-09-21 by `plans/house-bots/RELEASE-LADDER.md`.** Measured there: S2's only declared proof does not exist (`test:docs` is a link checker; "R0–R6" appears nowhere in `scripts/` or `src/`), it names a §17 that does not exist in `docs/HOUSE-BOTS.md` (14 sections; that block is in `PLAN.md`), its R1–R6 "GO when" column lets the ladder authorise itself from R1 onward, and the owner-only switch row is absent from this table entirely.

| Step | Action | GO when |
|---|---|---|
| R0 (T-1 day) | S1 P0 re-run. **Merge** `origin/main` (any "rebase" here is superseded). ⛔ **Condition (c) rewritten 2026-09-20 — `ops:release-migration-parity` says GO** (byte parity of every shared migration folder; forward difference 0; reverse difference 0). The old wording — *"the diff shows exactly the 2 house folders"* — is permanently unreachable since Ali pushed the branch on 2026-09-18: both folders are in the merge base, so the diff is **0** by construction. ⛔ Not deleted and not waved through: the parity gate still reports the original failure by name if the house DDL is ever NOT on the target ref, and then demands R2 back. `test:all`, every `red:house-bot-*`, `qa:house-bots-local`, `qa:house-bots-visual` and the S4 rehearsals pass on this SHA. `ops:preflight-house-bot-migrations` says GO. Send Ali the checklist, and tell him R2 is struck for this release and why. | Ali's one-word "go" |
| R1 | Pick a quiet hour: preflight prints the bets in the last 15 min. Not during the nightly trial balance. | ≥10-min window |
| R2 | From this machine: `MSYS_NO_PATHCONV=1 DATABASE_URL=… npx prisma migrate deploy`. **On any failure:** preflight `--post` confirms no house object exists, then `prisma migrate resolve --rolled-back <name>`, then retry once later. **Never leave a failed row:** P3009 blocks every boot, and boot runs `migrate deploy`. | both rows finished |
| R3 (old container still serving) | `houseBotSchemaReady()` query is true. `HouseBotControl.enabled=false`. `/api/health` `ok:true`. The Position count keeps rising (read-only check). | all true |
| R4 | Merge `house-bots` into main as one merge commit, then push. There is an outage while `overlapSeconds` is null. | build green |
| R5 (≤10 min) | `dpl=` shows the merge SHA. `/api/health` shows ~~`houseBots.schemaReady=true` and~~ `ok:true` and `leadership.lifecycle.isMe=true` (⛔ *`houseBots.schemaReady` superseded by C5-SPEC ruling 172, owner ruling D19: the house schema state is read as ADMIN on `/admin/system` → Diagnostics, which must show it Ready*). After the 90 s boot grace, `ops:house-bots-status` shows: OFF, 0 bots, 0 marked rows, engine enabled, beats fresh. Run §12 production checks and §15 phase F. At +10 min: 0 marked rows and 0 HOUSE_BOT notifications. | all true |
| R6 | Handover note "First switch-on" for Ali: limits → designate → rules → Start → ON → watch the feed for 15 min → OFF on any FAILED row or unexplained alert. | — |

NO-GO before R4: nothing merges. NO-GO after R4: go to S3.

**Test**
- `test:docs` greps the R0–R6 headings in HOUSE-BOTS.md.
- The release record lists a measured value, or NOT MEASURED, for every step. No step is left blank.

## S3 · MAJOR · §11 Rollback plan (HOUSE-BOTS.md runbook; drift and remark scripts in commit 7)

**Order of use**
- One bot misbehaving → **Pause**.
- Several bots or the engine → **master OFF**.
- Console unreachable → `ops:house-bots-off --apply` (A9).
- Bets must stop now and the database is shaky → **Maintenance**.
- The engine process itself is harmful and OFF is already set → **`HOUSE_BOT_ENGINE=false`**.
- **Any player-path regression → revert immediately, whatever the house state.**

| Lever | Stops | Deploy? | Time | Side effect |
|---|---|---|---|---|
| Pause / Remove | that bot | no (DB) | <1 s | none |
| Master OFF (console) | every house bet | no | <1.5 s (A9) | intents cancelled |
| `ops:house-bots-off --apply` | same | no (direct pg) | seconds | same |
| Maintenance | every bet, players included | no, but it is a per-container latch (`platform-config.ts:103`, `RAILWAY-LIVE.md:361`) | immediate on 1 replica | player outage |
| `HOUSE_BOT_ENGINE=false` | timers and hook import | **redeploy, same image** (full outage at 1 replica) | minutes | none |
| Revert the merge (`git revert -m 1`) | all house code | **yes, a build and deploy** | build time | Migrations stay (expand-only; proven by S1c). A23 preconditions apply. |

**Rollback-window hazards (new).** Old code has no `houseBotId` in its Prisma client, so:
- its payout, refund and cash-out transactions are written unmarked, and R3's book then shows loss with no returns;
- it lets house positions be cashed out;
- it accrues wagering and commission on them.

**Re-release law.** Before any later house deploy, `ops:house-bots-status --drift` must report 0 for:
- (a) a Transaction with a `positionId` whose Position is marked but whose `houseBotId` is null;
- (b) CASHOUT rows on marked positions;
- (c) wagering or AGENT_COMMISSION rows on marked positions.

(a) is fixed by `ops:house-bots-remark --apply`: dry run by default, sets NULL→`position.houseBotId` only. It is the one sanctioned exception to "markers are written on create only". (b) and (c) go into a COMPLIANCE-DECISIONS note with amounts, and nothing is clawed back automatically.

**Test (S4 rehearsal 2)**
1. Local database migrated, with 3 open marked positions.
2. Boot the pre-merge SHA, settle, and cash one out.
3. Return to the house SHA.
4. Drift lists exactly those rows. Remark fixes (a); a second run changes 0 rows. The book's realised figure equals the ledger. The immutability pin still fails on any other `houseBotId` update.

## S4 · MAJOR · §12 Verification additions

**New suites table, add:** `test:house-bot-holder-lifecycle` (A2) and `test:house-bot-migrations` (S1).
- `test:all` runs every `test:*` key automatically (`test-all.mjs:44-46`).
- `red:*`, `drive:*`, `qa:*` and `ops:*` are **not** part of `test:all`, so each commit's checklist names them explicitly.

**Existing gates touched, add:** test:erasure (A5), test:retention (A20), test:chain-purge (A16), test:deploy-skew (C12), test:report-parity (R3), test:two-admin, test:officer-conflict, test:dsar-secrets (G1), test:withdrawn-features (F2), test:red-anchors (F3), test:docs, test:filter-language (X1). All of these keys exist in `package.json`.

**Rehearsals** (local Postgres, loopback guard, numbers recorded):
1. **Migrations under load:** 20 bets/s during the apply. 0 bet errors other than retried BUSY. The apply takes ≤3 s or ends in a clean 55P03.
2. **Rollback:** the S3 rehearsal.
3. **Two processes:** the A24 two-process suite (kill -9 cases) on the release SHA. This is also the gate for F7.
4. **Audit chain under a burst (CRA-29):** 200 house bets add exactly 200 `market.position.opened` rows plus the pause and alert rows, and `verifyChain()` is valid.
5. **Two-admin ON (CRA-28):** a house-held market needs stage 2 by a different officer, exactly like its no-house twin. The engine projection has no `resolvedOutcome`.

## S5 · MINOR · §13 accepted risks, add 8–12 (COMPLIANCE entry and HOUSE-BOTS.md)

- **8. Rollback window:** unmarked payouts, possible cash-outs, wagering and commission on house positions. Repaired or recorded per S3.
- **9. Per-process state (F7):** the maintenance latch, the vendor price cache and the verify bucket are per container. Production stays at 1 replica (`RAILWAY-LIVE.md:353`).
- **10. Up & Down with no fresh vendor bar:** modes mostly skip with UD_STALE_PRICE (A15). This fails closed.
- **11. Sunset can't unwind open stakes:** emergency void works on a whole market only (`market-service.ts:4061`). Open stakes settle normally.
- **12. Until the F2 code-state flip is deployed:** OFF and Remove are database states that any ADMIN can reverse (`rbac-guard.ts:208-225`). A22 alerts every recipient when that happens.

**Test:** `test:docs` greps risks 8–12 in both files.

---

## F1 · MINOR · New product line: default-deny (on top of A12)

**What breaks**
- `productLine` is free TEXT (`schema.prisma:1724`), and the data layer turns every value other than UPDOWN into MARKET (`market-dal.ts:158`).
- A12 refuses at H3, but when the TS `ProductLine` type (`market-service.ts:189`) widens, nothing forces anyone to decide, and nobody is told.

**Build now (commit 1)**
- `constants.ts`: `HOUSE_PRODUCT_POLICY = {MARKET:'polls', UPDOWN:'updown'} satisfies Record<ProductLine,'polls'|'updown'|'denied'>`.
- The rules form renders only entries that are not denied.
- An unknown raw value sends AlertOnce `product-denied:<value>:<EAT day>` by bell and email: "House bots ignored a stake on an unsupported product ({value}). No stake moved. Enabling it needs a COMPLIANCE-DECISIONS entry and a code change."
- The same sentence goes into HOUSE-BOTS.md as a rule.

**Test**
- A typecheck fixture that adds `'JACKPOT'` to ProductLine without a policy row fails.
- A raw JACKPOT market with an ACTIVE bot and 3 real bets gives 0 intents and 1 alert.

## F2 · MAJOR · Sunset or GBT ban (lean version of FS-06, no new console action)

**What breaks:** there is no terminal state. Any ADMIN can switch the master back on or designate again.

**Build now**
- `feature-state.ts`: `FeatureName` gains `"houseBots"`, with `PRODUCT_STATE.houseBots = "ACTIVE"`.
- `houseBotsLive()` is read by `startHouseBotEngine`, switch ON, Start, Designate and Re-verify.
- It gates the offer only. ~~`house_position_no_exit`,~~ the markers and the reports are never gated (the file's own "gate the offer, never the refusal" rule). ⛔ **Superseded by D19 (Ali, 2026-09-16):** `house_position_no_exit` is deleted; a house position's cash-out gets the ordinary closed-exit refusal `exit_window_closed` (C4 ruling 147).
- Add `offCause` SUNSET and remove reason SUNSET.

**`ops:house-bots-sunset`** (commit 7; dry run by default; `--apply --reason`):
- master OFF(SUNSET);
- every bot that isn't REMOVED goes to REMOVED(SUNSET), and its intents are cancelled;
- one event per bot, and one COMPLIANCE `house_bot.sunset{bots, cancelled, openExposureByMarket}`;
- ~~the holders get the normal Remove notices;~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holders get nothing, and every alert goes to admins only (D19c; C4 ruling 149).
- running it again changes nothing.

**HOUSE-BOTS.md "Sunset runbook"**
1. Run the script with `--apply`. No deploy needed.
2. Commit `houseBots: "WITHDRAWN"`, ~~change the public line to past tense with a META bump,~~ and add a COMPLIANCE entry. Deploy. ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no public line to change and no META to bump (D19a).
3. Run `ops:house-bots-status` until open marked positions reach 0. Never void automatically.
4. All data is kept (A20).

**Test (`test:withdrawn-features`, new section)**
- `FEATURE_HOUSEBOTS=WITHDRAWN`: the engine starts 0 timers; ON, Start and Designate are refused with "House bots are withdrawn"; cash-out on a marked position still returns ~~`house_position_no_exit`~~; ~~reports keep the house lines~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** reports carry no house lines (C5-SPEC rulings 224–231). ⛔ **Superseded by D19 (Ali, 2026-09-16):** the marked position's cash-out returns `exit_window_closed`, the ordinary closed-exit refusal (C4 ruling 147).
- The ACTIVE branch is still driven.
- Script: a dry run writes 0 rows; `--apply` leaves 0 live bots and 1 audit row; a second `--apply` makes 0 changes.

## F3 · MAJOR · New bet gates are inherited (on top of A7 and A10)

**What breaks**
- A7's parity table is a fixed list.
- A future gate that returns "no opinion" when context is missing (the `responsible-gambling.ts:426-436` pattern) would silently exempt house bets.
- Someone could also add an `if (ctx.kind==='house')` skip.

**Build now (commit 2)**
1. The seam test declares `GATE_PARITY satisfies Record<BetPathReason, ParityFixture | {exempt: string}>` over A10's `BET_PATH_REASONS`.
2. Source pin: `ctx.kind` comparisons inside `buyPositionGuarded` and its helpers are allowed only at anchored sites (H0–H9, (p), cash-only), listed in `scripts/anchors/house-bot-seam.anchors.mjs` and resolved by `test:red-anchors`.
3. HOUSE-BOTS.md rule: "A new gate evaluates the holder's account state for house bets, or refuses `house_context_unsupported`. Until A10 classifies it, that maps to AUTO_PAUSED(UNMAPPED_REFUSAL). Any new funding source refuses house context."

**Test**
- Adding `zz_geo_blocked` without a parity row fails tsc.
- A planted house skip inside a gate helper turns the pin red.
- Every fixture gives the same reason through `buyPosition` and `placeHouseBet`, with wallets untouched.

## F4 · MINOR · Rules schema migration (on top of A4 and C14)

**What breaks**
- C14 folds "outdated" into RULES_INVALID and never says who converts old rules.
- After a rollback, every bot reads RULES_FROM_FUTURE and sits idle forever with no alert.

**Replace C14's "Outdated or invalid" bullet with:**
- **Older rules:** AUTO_PAUSED(RULES_OUTDATED). Copy: "Bot A is paused: its rules were saved in an older format. Open Rules, review the converted values, Save, then Start." Parse, the engine and the planner never convert anything.
- **Who converts:** only the rules form, through a pure `migrateRules(vN→vN+1)` shown as a diff. The owner saves it. The engine never writes rules back (unlike `updown-config.ts:425-429`).
- **Future rules:** if RULES_FROM_FUTURE, or a `limitsSchemaVersion` ahead of the build, lasts more than 10 min → AlertOnce `rules-future:<botId|global>:<v>`: "Bot A is idle: its rules were saved by a newer 50pick build (v{n}). Nothing will be placed until that build is back." No pause. Limits ahead of the build means nothing is placed.

**Test**
- A v0 fixture gives RULES_OUTDATED, and the rules JSON is byte-identical after 3 planner passes.
- Property test over 200 v1 inputs: converted scope ⊆ input, every cap ≤ input, modes ⊆ input.
- v99 for 11 min on an injected clock: 1 alert, status unchanged, 0 fires.

## F5 · MAJOR · Stake-bound changes invalidate saved caps (fixes C1's source; on top of A7)

**Evidence**
- C1 validates against the `PLATFORM_MIN/MAX_STAKE` constants.
- But "the money path reads the config, never these" (`payout.ts:160-163`). Production ran a 500 floor while the constant said 1,000 (`market-config.ts:442-446`).
- A7 pauses only on the minimum.

**Replace C1's "within PLATFORM_MIN_STAKE..PLATFORM_MAX_STAKE, imported" with:** "within the live global config bounds, via the A7 (p) resolver; the constants are outer rails only."

**Add to §4.2: `revalidateLive()`** runs every planner pass, even with the master OFF. It is keyed by runtime `boundsHash` (global min/max, chain bounds, the `bet.place` rule) and uses the same validators:
- **The bot can no longer place any bet** (stakeMin > live max, stakeMax < live min, OPENER range outside the live bounds, `gCapPerMarketTzs` < live min, min gap below the live floor) → AUTO_PAUSED(RULES_INVALID{field}), with 1 alert per bot per hash.
- **The bounds only narrow what it can bet** (stakeMax > live max, a per-market or chain override) → the stake is clamped at decide time. No pause, and one AlertOnce per hash: "Platform maximum stake is now TZS 5,000; Bot A's max TZS 10,000 is clamped. Review Rules."

**Test**
- Config min 500 with the constant at 1,000: stakeMin 500 saves.
- Config min raised to 2,000 with stakeMin 1,000: 1 pause and 1 alert, then 0 on the next 3 passes.
- Config max lowered to 5,000: the bot stays ACTIVE, placed stakes are ≤ 5,000, 1 warning.
- A per-market minimum of 10,000: SKIPPED, 0 alerts.

## F6 · MINOR · SMS or email fan-out goes live (on top of C13)

**What breaks**
- SMS is switched on by an environment variable (`sms.ts:94-105`, `:109`).
- C13 pins only HOUSE_BOT to "never SMS". Outcome kinds in `MONEY_KINDS` (`comms-registry.ts:213-221`) would fan out once per house stake.

**Build now (commit 4)**
- `CHANNEL_POLICY satisfies Record<NotificationKind,{sms:'never'|'otp'|'allowed'; email:'never'|'template-only'|'allowed'}>` over `NOTIFICATION_KINDS` (`:202`).
- Every future fan-out must call `channelAllowed(kind,{houseOnly})`.
- When all of a notice's positions are house-marked: never SMS, ~~and email only through the holder's hourly summary~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** such a notice sends no email, and there is no holder summary (C4 rulings 143 and 149; C5-SPEC ruling 235).
- The HOUSE-BOTS.md alert matrix gains a Channel column.

**Test**
- The policy is exhaustive at compile time.
- With `SMS_PROVIDER=selcom` stubbed, 50 house outcomes give 0 SMS calls ~~and ≤ `holderNoticesPerHour` bells plus 1 summary~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** `holderNoticesPerHour` is removed and there is no holder summary (C4 rulings 149, 153).
- A planted fan-out that skips `channelAllowed` turns the pin red.

## F7 · MAJOR · Replicas > 1, or the 60 s overlap (on top of A24)

**Audit: state → where it lives → effect with 2 containers**

| State | Where | Effect with 2 containers |
|---|---|---|
| Claims, caps, throttles, AlertOnce, summaries, beats, scopeFrom, hashes | DB | correct |
| 5 s soft cache | process | stale intents CANCELLED at fire |
| ≤2 fires, hook semaphore, admission | process | throughput only |
| `housebot.verify` bucket | process | N× tries; C4's database reserve still binds |
| Holder's `bet.place` bucket (`rate-limit.ts:28-33`) | process | holder gets more headroom |
| Vendor 1-minute bar cache (`updown-terminal-vendor.ts:52-57`) | process | a cold container skips with UD_STALE_PRICE (fails closed) |
| Maintenance flag, loaded once (`platform-config.ts:47-50`, `:103`) | process | the other container's bet path misses it, so A9's maintenance fallback isn't binding |

**Build now (commit 4)**
1. Source pin: no module-scope mutable `let`, `Map`, `Set` or counter in `src/lib/server/house-bot/**` outside declared `globalThis.__50PICK_HOUSE_BOT_ENGINE` keys.
2. Fire step 2 reads maintenance via `loadConfigResult` (`config-store.ts:34`), never `isMaintenanceMode`.
3. HOUSE-BOTS.md rule: "Setting numReplicas > 1 or applying overlapSeconds is a house release event: switch OFF, re-run S4 rehearsal 3, re-audit this table."

**Test**
- A planted `let fired = 0` turns the pin red.
- Instance A writes maintenance ON while instance B holds a cached OFF: B's fire returns SKIPPED(MAINTENANCE).

## F8 · MINOR · New password writers (on top of seal-flows §6, A2, A4)

**What breaks:** a raw-SQL writer escapes A2's walker, e.g. `scripts/ops-remint-qa-passwords.mts:84` (`update "User" set "passwordHash"`).

**Build now:** the A2 walker also scans `scripts/**` and SQL string literals containing `"passwordHash"`.
- A script is allowed only with the comment `// house-bot: covered by L2 sweep`.
- Writers under `src/**` must call the hook, or declare REHASH and refresh the fingerprint in the same transaction.

**Test**
- A planted raw-SQL script with no comment turns the walker red.
- A REHASH fixture keeps the bot ACTIVE with a new fingerprint.

## F9 · MINOR · Prize, tournament or cashback (on top of R4)
⛔ **Superseded by D20 (Ali, 2026-09-17):** this whole section is struck: no reward walker or source pin is built (C5-SPEC ruling 233's walker; ruling 256's `NON_HOUSE_POSITION_SQL` debt). What stands is the rule itself, already built in the money seam and recorded in the docs: no prize, cashback, tournament or rank reward on house stakes (R4).

**What breaks:** R4 only pins files that import `leaderboard(`. A reward computed with its own `group by p."userId"` (like `market-dal.ts:1225-1235`) gets past it.

**Build now:** extend R4's pin. Any file that aggregates `"Position"` by `"userId"` and calls `creditInternal` (`wallet-service.ts:1958`), `creditBonus` (`bonus-service.ts:94`) or `adminAdjustBalance` (`:2561`) must filter `"houseBotId" IS NULL` or pass `excludeHouse:true`. Display-only sites (D6) are allowlisted.

**Test:** a planted file with that aggregate and `creditInternal` fails; adding the filter makes it pass.

---

## G1 · MAJOR · Holder's right of access (CRA-04, HB-ACC-12; slot A6 was never written) · §9, commit 5
⛔ **Superseded by D20 (Ali, 2026-09-17):** this whole section is struck. G1 = R5: its `houseLiquidity` section is built nowhere. D19 had already kept it out of both releasable doors (C5-SPEC rulings 168–170), and D20 strikes the owner-only internal record that was its last home (rulings 236–238). What stands is the absence: both doors stay house-free, proven by ruling 243.

**Evidence:** `user-service.ts:45-69` exports no positions, and its transactions are the newest 1,000. House volume pushes the holder's own deposits out of that window.

**Text**
- `exportUserData` and `buildDsarBundle` add an allowlisted `houseLiquidity` section:
  - `designations[]`: status, `designatedAt`, consent method ("password entered by 50pick"), `verifiedAt`, `removedAt`, reason;
  - `events[]`, `housePositions[]`;
  - `houseTransactions{rows,total,truncated}`.
- Personal transactions are read with `{excludeHouseBets:true}` (R3).
- The fingerprint, the hash and any `triggerUserId` are never included.

**Test (`test:dsar-secrets`)**
- A holder with 1,200 house transactions and 3 deposits: both export routes contain the 3 deposits and `designations[0].verifiedAt`.
- The fingerprint value, the hash value and `triggerUserId` are absent.
- A newly added HouseBot column is omitted, not leaked.

## G2 · MINOR · Decision audits snapshot the house stake (CRA-16, CRA-17) · F11 and §9
⛔ **Superseded by D20 (Ali, 2026-09-17):** this whole section is struck. G2 = R9: no decision audit carries `houseStake` (C5-SPEC rulings 187–191, built in Commit 5 step 4 and un-built in checkpoint C5-5b). Nothing in it stands.

**Evidence:** the `market.adjudicated` payload (`market-service.ts:3060-3081`) carries pools only.

**Text:** add `houseStake{yes,no}` to these payloads, read from R2's `houseStakeByMarket` in the same call:
- `market.adjudicated`, `market.emergency_void`, `market.resolve.bulk(_override)`;
- `objection.rejected` and `objection.upheld`.

**Test**
- A market with a house stake of NO 40,000 gives `houseStake {yes:0, no:40000}`.
- A market with no house stake gives `{0,0}`.
- `test:officer-conflict` and `test:two-admin` are unchanged.

## Placement

| When | Items |
|---|---|
| Before commit 1 | S1 P0 |
| Commit 1 | S1 migration law and its test, F1, F4 parse and migrator |
| Commit 2 | F3 |
| Commit 4 | F5, F6, F7, F8 |
| Commit 5 | ~~G1, G2, F9~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** G1, G2 and F9 are struck; none of them lands. |
| Commit 7 | S3 drift and remark scripts, F2 feature state and sunset script |
| Commit 8 | S2, S3 runbook, S4 rehearsals, S5, F2 runbook |

### Critical Files for Implementation
- C:\kipindi-main\package.json
- C:\kipindi-main\src\lib\feature-state.ts
- C:\kipindi-main\src\lib\server\market-service.ts
- C:\kipindi-main\src\lib\server\comms-registry.ts
- C:\kipindi-main\src\lib\server\user-service.ts

---

# House bots: earlier amendments C4–C7, R1–R4, P1 and sequencing notes

> **Restored 2026-09-13 by build session `ali-e4`.** This section's heading (added here for navigation) and C4's title, merge list and first three evidence bullets were lost when the planning agent's reply hit its output limit. The C4 text below is restored verbatim from that agent's transcript (planning workflow `wf_62c09369-f5e`). Nothing else in this section changed.

**C4 · MAJOR · Entering the holder's password cannot burn or lock his sign-in.** Merged: HB-ACC-19, HB-ACC-20, CA-09, CA-19, CA-26, CA-36, CA-37.

*Evidence*
- 5 failures lock the account for 30 minutes, and the counter is shared with sign-in (`auth-service.ts:963-988`).
- Sign-in verifies against the row read before the lock (`:967`); that pattern must not be copied.
- PasswordInput sets no `autoComplete` (`password-input.tsx:100-103`), and the admin sign-in page is on the same site, so the browser can autofill the owner's own password.
- Buttons are only disabled after a re-render (`agents-client.tsx:31-43`), so a quick double tap sends two requests.
- Rate buckets are per container (`rate-limit.ts:28-33`).

*§6 password check, add step 3.5:*
- If `freshUser.failedLoginCount >= LOCKOUT_MAX_FAILS − 2`, return `verify_reserved` without checking the password: "Stop here — the last 2 attempts are kept for the holder. Ask him to sign in once (that resets the count), then try again."
- Admin attempts never set `lockedUntil`.
- Verify against `freshUser.passwordSalt` and `freshUser.passwordHash`.
- `attemptsBeforeLock` comes from the database counter. The per-replica bucket is an accepted risk.
- A wrong try shows: "That isn't his current password. It was changed on <passwordSetAt> via <passwordSetVia>. N attempts left."

*§6 designate order:*
1. Eligibility, including roster full and a readable balance.
2. Password check.
3. Under `house:control`, count again and insert. If full: "The roster is full (5 of 5). Remove a bot or raise Max designated bots on Limits →".

*F1 and §8:*
- **Password inputs:** the consent and re-verify fields use `autoComplete="new-password"`, `name="holderSecret"`, `data-1p-ignore`, `data-lpignore="true"` and `data-bwignore`, with no username field in the form. Label: "Account holder's password (not your own)".
- **Double taps:** buttons use a synchronous `useRef` busy latch. Each press sends a `submitId`, claimed through AlertOnce `submit:<actor>:<id>` before the password check; a duplicate is ignored. For Enter now, target add/update/remove and staff cancels, the claim is a `HouseBotPress` row instead (N1–N2, PLAN §18).
- **Re-verify modal:** adds a Checkbox "Start Bot A again after verifying", ticked when `pauseDetail.wasActive`. The result is `{verified:true, started, startRefusal?}`. A refused Start after a successful verify is not a failure: "Verified. Not started: <reason> →".
- **Review step:** "Balance unavailable — try again" keeps the password in memory. An account with no wallet shows "This account has no wallet — it cannot be designated".
- **Countdowns:** hidden from screen readers (`aria-hidden`), with a static EAT time next to them.

*Test*
- 3 wrong tries → the 4th is refused without counting; `lockedUntil` stays null; the holder can still sign in.
- A concurrent double submit adds only 1 to `failedLoginCount`.
- Roster already full before the check → counter unchanged.
- Two designates at 4 of 5 → one bot and one ROSTER_FULL.
- Resume with the master switch OFF → PAUSED(MANUAL) with a fresh fingerprint.
- Source pin on the input attributes.

---

**C5 · MAJOR · The account picker finds Tanzanian phone formats.** Merged: CA-10.

*Evidence:* phone search runs a `contains` match on the raw text against `phoneE164` (`search/prisma-where.ts:33`, `search/fields.ts:63`, `:80`), so "0712345678" never matches "+255712345678".

*§8 UserPicker, add:*
- If the search has at least 6 digits and only phone characters, match `phoneE164` against `normalizeTzLocalDigits(q)` (`phone-normalize.ts:52-57`).
- Fetch 11 rows so the picker can show "Showing 10 — type more to narrow".
- Fewer than 2 characters: an idle hint, and no request.
- Closed, erased, staff and AGENT accounts are shown greyed, with the reason.
- Phones are masked with `maskPhone`.

*Test:*
- 6 spellings of one number return the same id (memory store and Postgres).
- "a" returns 10 rows with `hasMore`.
- 1 character makes no data call.

---

**C6 · MINOR · Limits and rules saves: consequences, conflicts and version clashes.** Merged: CA-11, CA-20, CA-21, CA-24, CA-25, ENG-35.

*Evidence:*
- The plan's F2 refusals carry no data.
- The rules save (`wallet:<bot>`) and the limits save (`house:control`) take separate locks (`locks.ts:164-169`), so two saves can each pass a check against the other's old values.
- H3 and H4 still enforce global caps at bet time.

*F2, replace the refusal bullets:*
- **Lowering a global cap:** allowed, because it only reduces risk (the owner may keep refusal).
- **Consequence preview:** the save returns `CONFIRM_CONSEQUENCES{warnings}` from `previewLimitConsequences(input, todayBook, exposure)`, e.g. "Today's settled loss is TZS 120,000. Saving a TZS 100,000 limit switches house bots OFF within 15 seconds."
- **Bots above the new cap:** listed as `conflicts[{botId, label, status, field, value}]`. Their stakes are clamped to `min(bot cap, global per-market − house money already on the market)`.
- **Raising a bot cap above a set global cap:** still refused, with a "Use TZS 30,000" button.
- **Lock order:**
  - The rules save takes `wallet:<bot>` then `house:control`, and reads the control row inside.
  - The limits save takes `house:control` and reads every non-REMOVED bot inside.
- **Version clash:** the refusal is `STALE_VERSION{savedBy, savedAt, changedFields, current}`.
  - The owner gets Compare, Keep theirs, and Save mine anyway (the overwrite is audited as `overwrote`).
  - The base version comes only from page load or a successful save.
- **Cross-field rules:** one table, `CROSS_FIELD_RULES [{id, fields, reportOn, message}]` in `rules.ts`, is the only source.

*Test:*
- Preview warnings when usage is below, equal to and above the new value.
- 20 paired concurrent saves are never both applied without confirmation.
- STALE_VERSION carries its payload.
- 50 engine writes between load and save cause no clash.

---

**C7 · MINOR · Modals, routes, feed, accessibility, 360 px.** Merged: CA-08, CA-29, CA-32, CA-33, CA-38, CA-39, CA-40.

*Evidence:*
- `/admin/desk` has no `not-found.tsx`; the only admin one is `admin/ai-polls/[id]/not-found.tsx`. So `notFound()` shows the player 404.
- Tapping outside a modal closes it by default (`modal.tsx:173`, `:282`).
- ActionOverlay's running state is its own Modal (`action-overlay.tsx:115-122`), so it would stack on top of a form modal.
- The transactions page defaults to the last 28 days (`admin/transactions/page.tsx:76`).

*§8, add:*
- **Unknown bot page:** `[botId]/not-found.tsx` with AdminPageHead, the empty state "No house bot with that id", and a Back link. A malformed id skips the database query.
- **Form modals** (ON, Remove, Re-verify): use a modal-local runner with `closeOnScrim={false}`, and never ActionOverlay while open.
- **§7 notification links** (they must work whenever opened):

| Alert | Link |
|---|---|
| Money event | `/admin/transactions?q=<txnId>&range=all` |
| Hourly summary | `?tab=activity&range=custom&from=<HH:00>&to=<HH:00 + 1h>` |
| Per bet | `/[botId]?tab=activity&range=all&intent=<id>` (row highlighted) |

- **Activity feed:**
  - Filter parameters are checked against a whitelist.
  - Page 2 onward uses a keyset cursor, so new rows don't shift pages.
  - Page 1 shows an "N new" pill.
- **Cancel intent:** returns `{status, positionId?, reasonCode}`, with this copy:
  - "Too late — this bet is being placed now."
  - "Too late — placed at 14:03:12 (TZS 8,000 DOWN)."
  - "Nothing to cancel — it was skipped: <reason>."
  - "Already cancelled."
- **Accessibility contract:**
  - The master switch has a role and label.
  - Focus moves to each wizard step's heading.
  - There is a single polite live region.
  - Countdowns are `aria-hidden`.
  - Focus returns to the trigger when a modal closes.
- **§12 visual fixtures, add:**
  - modals at 360×300 with the keyboard up;
  - a KPI of −1,234,567,890;
  - a 32-character label with no spaces;
  - 4 schedule windows with errors;
  - the unsaved-changes bar over the last field.

*Test:*
- The route files exist, and the not-found copy is pinned.
- Source pin: form modals pass `closeOnScrim={false}`.
- With now = event + 60 days, every link still shows its event.
- Page 2 is identical after new rows are inserted.
- Each cancel race gives its exact code.
- Visual assertions at 360 px.

### §9 Reporting

**R1 · MINOR (owner may promote) · House activity export.** Merged: CRA-02, CRA-08, CRA-11, CA-17, FS-22.

⛔ **Superseded by D20 (Ali, 2026-09-17):** this whole amendment is struck and never built: no house-liquidity report, no house-market statement, no `house_bot.*` audit index, no transactions CSV `house` filter or `house_bot_id` column, and no owner-only per-bot CSV (C5-SPEC rulings 199–213; 211 and 212 stay only as recorded platform defects L26/L27, no longer release preconditions). **Not struck here, left to Commit 7's rulings:** the optional "Record reimbursement" owner action, which D20 does not name.

*Evidence:* the report catalogue has 8 reports and none covers house activity (`reports/catalogue.ts:1044-1053`). The report route passes only the user id, with no period (`api/admin/reports/[id]/route.ts:64`).

*§9, add a row:*
- **Report `buildHouseLiquidity(generatorId, period)`**, marked "Regulator hand-off". It contains:
  - the designation register;
  - the master switch history;
  - totals per bot and product;
  - per market: house share, outcome and resolution path;
  - a reconciliation showing all = players + house;
  - an index of `house_bot.*` audit rows.
- **Report route:** reads a validated `?period=YYYY-MM`, and `?marketId` for a per-market `house-market-statement`.
- **Transactions CSV:** gains a `house_bot_id` column and a `house=only|exclude` filter.
- **Per-bot CSV** (money and activity): owner-only, checked with `checkAdminTotp`, audited as ADMIN `house_bot.exported`.
- **Optional owner action** "Record reimbursement": writes an event and a COMPLIANCE row, and moves no money.

*Test:*
- A fixture month that includes the month-boundary instants reconciles.
- The CSV filter returns exactly the marked rows.
- The per-market statement ties to the market's pools.

---

**R2 · MINOR · House exposure shown wherever a money decision is made.** Merged: HB-LC-17, HB-LC-20, FS-25.

⛔ **Superseded by D20 (Ali, 2026-09-17):** this whole amendment is struck: no house stake line on the resolver card, ceremony, admin market page, objections panel, Up & Down rounds void lever, emergency-void confirm or bulk summary, no "House bot · Bot A" position tag, no house share in the emergency-void admin notice, and no overview exposure split (C5-SPEC rulings 192–196, 198, 254, 261–262; what was built in Commit 5 steps 4–5 is un-built in checkpoint C5-5b). **Left to later rulings:** the `houseStakeByMarket` reader stays only if checkpoint C5-5b names a remaining caller or a Commit 7 scope line, and whether the CAP_EXPOSURE skip text names the amount held is re-decided at Commit 7's rulings.

*Evidence:* the resolver queue shows "Crowd" and "Player money held" (`admin/resolver-queue/page.tsx:449`, `:463-470`). The objections and Up & Down rounds pages show pools only (`admin/objections/page.tsx:51`, `admin/updown/rounds/page.tsx:115`, `:351`).

*F11, replace:*
- One data reader, `houseStakeByMarket(ids) → {yes, no, open | settled}`, with a memory twin.
- It feeds:
  - the resolver card and resolution ceremony;
  - the admin market page (position rows tagged "House bot · Bot A");
  - the objections panel;
  - the Up & Down rounds void lever;
  - the emergency-void confirm and admin notice ("of which house TZS 8,000");
  - the bulk-resolve summary.
- **Overview exposure bars** split into "Open on live markets", "Awaiting settlement" and "Frozen by objection". This is a console query, never read by the engine.
- **CAP_EXPOSURE skip text** names the amount held.

*Test:*
- The reader separates open from settled after settlement and after a void.
- Visual fixtures with and without a house stake.

---

**R3 · MINOR · Statutory and harm figures stay exact and explained.** Merged: HB-LC-05, HB-LC-14, ENG-26, FS-29, CRA-18, CRA-19, CRA-20, CRA-22.

*Evidence:*
- The GBT pack note says "GGR = total stakes − total payouts" (`catalogue.ts:186`), but the formula also subtracts refunds (`:620`).
- The match-integrity note says "two-officer resolution flow" (`:1032`), while a single admin is the default (`resolution-policy.ts:5-8`, `:27`).
- Money settles only after the objection window (`market-service.ts:3178-3191`).
- An objection can no longer be upheld after settlement (`objections-service.ts:499-511`).

*§3 Loss, add:*
- **Cohort:** the EAT day the stake was *placed*. A multi-day stake's realised loss lands in its placement day, where the projected gate already bounded it.
- **Hint copy:** "Limits count stakes by the day they were placed and restart at 00:00 EAT. Losses that settle today can include stakes from earlier days."
- **`book.ts`:** derives returned money and fees from marker-bearing Transaction rows.
- **Source pin:** every `db.txn.create` with a `positionId` in `src/lib/server` copies `houseBotId` from the position.

*§9, add:* ⛔ **Superseded by D20 (Ali, 2026-09-17):** every item in this block is struck and never built: the harm and AML detectors, the compliance harm table, the FIU SAR, the GBT monthly pack and the match-integrity report stay as on `origin/main` and treat a house bot's account exactly like any player's, with no exclusion, holder chip, Context column, memo or house column (C5-SPEC rulings 224–231; W21 and W22 are moot). The GGR-note and match-integrity-note corrections went with rulings 227 and 229 and are not made in this build. R3's §3 loss rules and source pin above stand.
- ~~**Harm detectors:** read `findByUser(userId, 10_000, {excludeHouseBets:true})` in both stores. The compliance harm table shows "House bot holder · <status> since <date>".~~
- ~~**FIU SAR:** a Context column derived from designation windows.~~
- ~~**GBT monthly pack:**~~
  - ~~memo rows "of which: house liquidity stakes" and "House liquidity net result (held in designated accounts; not operator revenue)";~~
  - ~~the GGR note corrected to include refunds.~~
- ~~**Match-integrity report:** the note corrected, plus "House stake" and "Resolution path" columns.~~

*Test:*
- Positions at 23:59:59.999 and 00:00:00.000 EAT fall into different cohorts.
- The source pin fails on a planted RED file.
- ~~50 late-night house bets raise no LATE_NIGHT flag.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the harm exclusion and the GBT memo are struck (C5-SPEC rulings 227, 230), so neither test is built.
- ~~The GBT pack equals its no-marker twin on every existing row.~~

---

**R4 · MINOR · Future rewards never pay on house stakes.** Merged: FS-05, CRA-12.

*Evidence:* the leaderboard query groups every settled position by user with no marker filter (`market-dal.ts:1225-1235`).

*§9 leaderboard row, add:*
- ~~`positionStore.leaderboard({excludeHouse?})`, default false, which keeps D6 (the bot shows publicly).~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no `excludeHouse` option is built; the leaderboard stays as on `origin/main`, where a house bot's account ranks like any player's (C5-SPEC rulings 233–234).
- A COMPLIANCE and HOUSE-BOTS.md rule: no prize, cashback, tournament or rank reward may be computed on marked positions.
- ~~A source pin: any file that imports `leaderboard(` or `leaderboardPlayerCounts` together with a credit writer must pass `excludeHouse:true`.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no reward walker or source pin is built (C5-SPEC ruling 233; the `NON_HOUSE_POSITION_SQL` debt, ruling 256, is struck too). The rule above stands.

*Test:*
- ~~The pin fails on a planted offending file.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** both tests go with the option and the pin.
- ~~`excludeHouse` drops marked rows in both stores.~~

### §10 Public text

**P1 · MAJOR (privacy line) / MINOR (the rest) · Disclosure completeness.** Merged: CRA-09, CRA-23, CRA-24, CRA-25, CRA-26, CRA-27, FS-30.

⛔ **Superseded by D19 (Ali, 2026-09-16):** struck below, each marked in place: the privacy line, the version bumps and the announcement question, the chatbot bullet, the disclosure tracking and the holder copy. **Still standing:** the chatbot's forbidden-phrase guard (D19d, with its full list), the private Board draft (D19b), the COMPLIANCE entry, the §12 leak list, and their tests.

*Evidence:*
- The privacy page's lawful-basis section says nothing about automated processing of bets for liquidity (`legal/privacy/page.tsx:57-63`).
- `TERMS_VERSION = "2026-09-09"` is stamped only at registration (`auth-service.ts:72`, `:440`, `:655`).
- The plan's leak test list omits the fairness feed and the share-image route.

*§10, add:*
- ~~**Privacy notice**, §3 "Legitimate interest", in en/sw/zh with native review: "Liquidity: an automated system operated by 50pick reads bets placed on a market to decide stakes from accounts 50pick operates; accounts that exploit those stakes may be excluded from them for the day." Bump the page version. The line is replaced by the N1 §10 line (automated system or 50pick staff).~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the privacy notice keeps exactly its words on `main`, with no liquidity line and no version bump (D19a, D19e).
- ~~**Rules and Terms versions:** move to a version different from 2026-09-13, identical across locales.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no rulebook or Terms text changes, so no version moves, `TERMS_VERSION` is not bumped, no acceptance is touched and nothing is announced (D19a).
  - ~~Bump `TERMS_VERSION`.~~
  - ~~Existing players keep their accepted version, with no re-acceptance gate, stated explicitly.~~
  - ~~Owner rules whether an in-app announcement goes out, since Terms §10 promises one.~~
- **Chatbot:** ~~quote the exact bullet.~~ Forbidden phrases: "independent", "cannot influence", "never bets against you", or naming or confirming an account. ⛔ **Superseded by D19 (Ali, 2026-09-16):** the chatbot gets no disclosure bullet; only the forbidden-phrase guard is built, with D19d's full list, over the system prompt and `faq8a` in all three locales.
- **Board disclosure draft**, required sections:
  - what 50pick does;
  - a request to confirm the licence class;
  - levy treatment;
  - ~~the notice waiver;~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the rulebooks and Terms are not amended (D19a reverses D2/D7), so there is no notice waiver for the draft to report; the draft itself stays private (D19b).
  - the controls;
  - how to inspect;
  - the accepted risks.
- ~~**Disclosure tracking:** add `HouseBotControl.boardDisclosureSentAt`. Until it is set, the ON modal shows the amber line "Board disclosure not recorded as sent".~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no "Record disclosure sent" action and no ON-modal line are built; the Board draft stays private and Ali decides if and when it is sent (D19b).
- **COMPLIANCE-DECISIONS:** heading "## 2026-09-13 (third) · House bots"; the supersede table names F6 §5 conditions 1–3.
- **Locales:** ~~holder copy is typed `Record<Locale, …>`, and~~ the disclosure test loops over `Object.keys(dict)`. ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder copy in any locale (D19c); the non-disclosure suite loops over every locale in `Object.keys(dict)`.

*§12 leak list, add:* `/api/fairness/recent`, `/results`, `/api/og/market/<id>`, the ticker feed and the comments thread, plus a planted positive-control needle.

*Test:*
- ~~`test:house-bot-disclosure` finds the privacy line in all 3 locales.~~
- ~~Version strings match across locales and `TERMS_VERSION`.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no privacy line and no version move; the suite pins the rulebooks, Terms and the privacy notice byte-identical to `origin/main` instead.
- The forbidden-phrase check finds nothing.
- The leak sweep finds the planted needle.

---

## 3. Sequencing notes

1. **A1 first**, as a platform commit on its own. It answers the owner's explicit request and does not depend on house bots.
2. **A23 is a precondition for every house-bot commit.** A2's hooks at `wallet-freeze.ts` and self-exclusion, and A3's IDENTITY_REFUSED cause, need the KYC code on the base.
3. **Commit placement:**

| Commit | Amendments |
|---|---|
| 1 (schema, rules) | A4 columns, A8 `alertedAt`, A11 `scopeFrom`, A20 retention rows, C1 column types, S1 |
| 2 (money seam) | A7 context and stake bounds, A9 lock timeouts, A12 H3 refusal, A15 H3 checks, A17, A14, A18 sanctioned changes |
| 3 (designation) | A3, A4, A22, C4 service side |
| 4 (engine) | A2, A5, A7 mapper, A8, A9 OFF, A10, A11, A12, A13, A16, A19 engine audits, A21 |
| 5 (reports) | ~~A6, R1–R4~~, A19 payloads ⛔ **Superseded by D20 (Ali, 2026-09-17):** A6 (the data-rights projection, R5 = G1), R1, R2, R3's §9 additions and R4's leaderboard option and source pin are struck; R3's §3 loss rules and marker source pin and R4's no-reward rule stand. |
| 6 (~~public text~~) | P1 ⛔ **Superseded by D19 (Ali, 2026-09-16):** Commit 6 publishes no text; it keeps the private Board draft, the chatbot's forbidden-phrase guard, the docs of record and the non-disclosure suite. |
| 7 (console) | C1–C7, the A9 fallback script, A22 recipients |
| 8 (drive, docs, release) | A23 release checklist |

4. **Owner rulings needed before build:**
   - D11 (A1), including whether the device that made the change is also signed out.
   - Consent void after an officer reopens a self-exclusion (A3).
   - Holder betting against his own bot: alert or refuse (A21).
   - D10, the trigger player's data export (A6).
   - Retention period for skipped intents (A20).
   - Lowering global caps: allow or refuse (C6).
   - ~~Terms announcement at deploy (P1).~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** answered: nothing is announced and no Terms text changes (D19a).
   - ~~Whether R1 is v1.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** answered: R1 is never built.

### Critical Files for Implementation
- C:\kipindi-main\src\lib\server\password-reset.ts
- C:\kipindi-main\src\lib\server\market-service.ts
- C:\kipindi-main\src\lib\server\rbac-guard.ts
- C:\kipindi-main\src\lib\server\updown-service.ts
- C:\kipindi-main\src\components\ui\input.tsx

---

# House bots: amendments N1–N2 (Enter now · targeted polls with exact entry timing) — ALL MANDATORY

Order of authority: unchanged (`04-amendments.md` > `02-sealed-flows.md` / `03-design-spec.md` > `PLAN.md` body; overlaps are resolved in PLAN §18). This is the last top-level section of `04-amendments.md`. Where the rest lives: decisions D17–D18, accepted risks 13–20 and the do-not-restore lines are in PLAN.md "## 16b. Decisions added 2026-09-14"; the owner defaults W7–W16 are rows in PROGRESS.md "Waiting on Ali"; the overlaps these amendments resolve are rows in PLAN §18 "Overlaps resolved"; scenarios TGT-01 to TGT-40 are the section "## targeted-and-manual (40)" of `01-scenario-register.md`; the N1/N2 bullet of each commit is in PROGRESS.md "Scope per commit".

> ⚠️ **Every `path:line` below was read on 2026-09-14 in `C:\kipindi-house-bots` after `origin/main` "AUDIT 95 (3/n)" was merged in, or is quoted from 04's 2026-09-13 anchors.** The KYC audit's P1 batch will move `wallet-service`, `wallet-freeze`, `kyc-service`, `user-service` and `notification-service` again. **Re-derive every anchor after P0.4 before relying on it.** Anchors are pointers, not facts.

Ids: N1, N2, D17, D18, W7–W16, sanctioned change (r), tables `HouseBotTarget` and `HouseBotPress`, scenarios TGT-01 to TGT-40. Checked free on 2026-09-14: in `plans/house-bots` none of D17, D18, `TGT-` or W7–W16 appeared; the only N1 match was the PROGRESS session-log text "**N1–N2:** sealing in progress, not yet in the plan."; the sanctioned-change letters in use ended at (q) (`04:1327`).
- **How ids are cited.** A bare A-, C-, R-, P-, S-, F- or G-number is an amendment in this file; 04's F1–F9 are not plan flows, which are cited as "PLAN F5" or "§1-F5". A bare D-number is a PLAN decision. Other files carry a prefix (`02 §3.8`, `03 S4`). "N1 §4.3" names a subsection below.
- **Review findings.** `INT-`, `MON-` and `UX-` ids name the 49 findings of the 2026-09-14 adversarial review (integrity, money and UX lenses). Every one was accepted and its substance is written into N1–N2, so the review record is not needed to build.

---

## 0. The six proposed rulings, tested against plan and code

| # | Proposed | Verdict | Evidence | What changes |
|---|---|---|---|---|
| 1 | Side never typed; Enter now takes the thinner side by non-house money; tie → opposite the most recent non-house stake; empty → random side | **KEEP the principle, CHANGE the mechanics** | (a) Non-house money that is still sellable is the HB-LC-04 free option (04 A15; `market-service.ts:2671-2687`, `hadRunway` and `sellable`). (b) Staff, AGENT accounts, other bots' holders and the holder's recruits put money in the same pools: `buyPositionAction` has no role gate (`markets/actions.ts:74-86`), while I3 forbids reacting to them (PLAN:34). (c) "Most recent non-house stake" reads one player's position, outside I2 (PLAN:33), and whoever places the last TZS 1,000 steers it. (d) A side drawn per click can be re-rolled by reopening the confirm, cancelling, or switching bot. (e) Private facts coexist with a bettable poll. An operator re-check stamps Sentinel fields and leaves the poll LIVE (`market-service.ts:2355-2364`). A confident re-check closes it (`:2380-2386`); Reopen then wipes the stamp and leaves no marker (`:4000-4041`). Staff also see positions with names and phones (`admin/markets/[id]/page.tsx:91-95`, `:381-396`), AML views and AI poll data (`schema.prisma:2103-2133`). | Side is **formulaic**: the unique side S with `rawPool(S) < lockedForHouse(opposite S)` (N1 §4.2). Only locked money of eligible accounts counts, 7 s after the free exit closes (N1 §3). No tie can exist, so the recency rule is deleted. An empty poll uses **one persisted draw per market**, shared with the automated OPENER. The amount is formulaic too. At fire the side is never flipped (`house_condition_gone`). A side the bot can't add to is refused (OWN_OTHER_SIDE, N1 §4.2). The information blackout covers recorded AI checks and reopened markets (N1 §3). The residual edge is accepted risk 13, ~~measured by the staff-edge scorecard~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge scorecard and its alert are struck (C5-SPEC rulings 202, 206, 218–223), and D20 names no replacement measure. |
| 2 | Enter now obeys every gate; `placeHouseBet`; durable intent first; one click = one bet | **KEEP, ADD** | `buyPosition` has no per-market position limit (`market-service.ts:1174-1202`), so I3 and OWNER_POSITION live only in H2/H3. H4's counterparty limits key on a trigger, which Enter now lacks (PLAN:202, :335). C4's AlertOnce submit claim records nothing about a refused press and is purged after 30 days (04 A20), so a lost reply can't be answered. A retry replays the same key after a transient error (`market-service.ts:889-890`, `retry.ts:47`), and auto-pause, Remove and OFF cancel CLAIMED rows (02:91, PLAN:128). An H0 that demands a CLAIMED row would switch the master OFF on these routine paths. | **Polls only** in v1 (W9). Every house gate applies, plus the blackout, the staff-chosen caps (per bot and global, counting Enter now and targeted stakes) and the counterparty share limit. **Every press is a durable `HouseBotPress` row**, placed or refused (N1 §2). "One click = **at most** one bet" is enforced three ways: `hbp_actor_submit_uq`, `hbi_manual_anchor_uq` and I4 `hb:<intentId>`. H0 compares figures with no status filter, and `staleAt` is re-checked inside the locks (N1 §3). The console never imports `placeHouseBet`. Enter now ignores automation-preference filters (schedule, pool band, closing-soon skip, react probability, trigger range, no-react zone) and obeys every safety gate. |
| 3 | Fixed delay allowed; whole seconds; explicit bounds | **KEEP, RE-BOUND** | `placedAt` is JS time stamped before the market lock (`market-service.ts:1238`), and a commit can trail it by up to 30 s (`locks.ts:142`, 04 A11). The poller ticks every 2 s ±300 ms, and claims wait for `dueAt ≤ now() − skew − 2 s` (04 A24). Automated COUNTER delays are 5–600 s (PLAN:295). A longer target delay turns a queued reaction into an option staff can let fire, or cancel after the news. | Target delays are whole seconds **5–600**, the COUNTER bounds. min = max is allowed for targets and for the COUNTER delay (exact timing on Up & Down, chain scope). "Exact" means **never earlier than asked, usually 2–5 s later**, and the copy says so. Every late entry is bounded by `staleAt`, re-checked inside the locks (N1 §3). Cancelling a queued staff-chosen reaction is a recorded veto (N2 §6). The fixed-delay fingerprint is accepted risk 17. |
| 4 | Default hold to the player's exit close; early entry as opt-in with warning, typed ack, own cap, penalty box | **CHANGE: the hold is absolute; early entry is NOT built** | Early entry needs H3 to count a stake that can still be cancelled, which reverts 04 A15. The penalty box keys only on the cashing-out account (PLAN:231), and alt accounts cost only a confirmed email since KYC moved to withdrawal. The cancel branch is free: a one-sided pool refunds at 0, while the house can never exit (plan (e); FS-28 "do not restore"). A player's exit is judged on the cashing container's clock (`market-service.ts:2661-2687`), and A24 only measures skew, tolerating 5 s. | `timingFrom: STAKE \| EXIT_CLOSE` gives meaningful timing on polls. `dueAt = max(requested, exitWindowClosesAt(trigger, market) + LOCK_MARGIN_MS)`. Every locked-money count subtracts the same 7 s (N1 §3). Early entry goes into "Not built", with the conditions a future amendment needs. |
| 5 | Dropdown/search picker with public fields only; in-flow listbox like UserPicker | **KEEP, PIN** | `POLL_SEARCH` defaults include AI `reasoning` (`search/fields.ts:106-115`). `MARKET_SEARCH` defaults exclude `id` (`:47-58`), so a pasted id finds nothing. Market store rows carry Sentinel fields. The kit Select portals (`select.tsx:372`) and can't host search (03 X3). The preview writes rows (the opener draw and `ENTER_NOW_PREVIEWED`). | `MarketPicker` plus a DAL with an explicit public select and memory twin, **polls only**. It matches only through `matchesQuery` (`search/predicate.ts:44`) over `HOUSE_BOT_MARKET_PICKER_SEARCH` (title, category, id). A query of 0–1 characters lists "Closing soonest". A selection contract stops Enter from submitting and drops stale previews (N1 §8). Search, status and the target preview write 0 rows. The Enter now preview is a write and is never driven in production (N1 §8). The picker never appears on resolver, objection, Sentinel or AI surfaces. |
| 6 | Per-bot options, off by default | **KEEP** | PLAN §5 "all off"; 04 A4 "any new field defaults to deny"; C14 "narrowest". 02 §3.8 refuses clearing a limit while bots are on (`02-sealed-flows.md` §3.8), which would leave master OFF as the only way to stop Enter now. | NULL caps mean "cannot bet". Staff-chosen caps and target maxima are **not** required for master ON and are **exempt** from "can't clear while on" (N1 §2). Start's "at least one entry mode" counts Enter now and targets. The Enter now button is not rendered while `enterNow.enabled` is false (N1 §8). |

---

## 1. Owner decisions

D17 (Enter now) and D18 (targeted polls and exact timing), accepted risks 13–20 and the do-not-restore lines are in PLAN.md "## 16b. Decisions added 2026-09-14". The owner defaults W7–W16 are rows in PROGRESS.md "Waiting on Ali". The COMPLIANCE-DECISIONS house entry and `docs/HOUSE-BOTS.md` take the decisions, the risks and the do-not-restore lines verbatim (N1 §10).

---

## 2. Amendments

### N1 · MAJOR (owner request) · Enter now: a manual one-shot stake on a poll through the house seam
*Merged:* owner request 2026-09-14 (part 1); proposed rulings 1, 2, 5, 6; INT-01, INT-02, INT-03, INT-04 (staff cancel), INT-05, INT-06, INT-07, INT-08, INT-09, INT-10, INT-12; MON-01–MON-04, MON-06–MON-14, MON-16, MON-17; UX-01–UX-05, UX-08–UX-13, UX-15–UX-20. INT-04 (targets), INT-11, MON-05, MON-15, UX-06, UX-07 and UX-14 are merged in N2.

*Evidence:*
- **No per-market position limit on the bet path.** A player may hold either or both sides without limit (`market-service.ts:1174-1202`). Every one-bot, one-side and holder-position rule lives only in H2/H3 (PLAN:200-201).
- **Anyone can put money in a pool.** `buyPositionAction` checks the session and the input, then calls `buyPosition` with no role gate (`markets/actions.ts:74-86`). Staff and AGENT stakes sit in the pools the side formula reads, although I3 says the house never reacts to them (PLAN:34).
- **The replay checks the key only.** It returns the stored position without comparing `userId` (`market-service.ts:1137-1155`). Sanctioned change (b) must land before any house key exists.
- **The same key reaches the seam more than once.** `buyPosition` wraps the guarded call in `withTransientRetry` with the same key (`market-service.ts:889-890`; RETRYABLE at `retry.ts:47`). Auto-pause cancels PENDING and CLAIMED rows (02:91), and so do Remove and OFF (PLAN:128, 04 A9).
- **Locks and waits.**
  - The advisory lock is the first statement of a transaction with a 30 s timeout and a 10 s pool wait (`locks.ts:126-143`).
  - Nested locks join the parent transaction (`locks.ts:103-121`).
  - Every audit append takes one DB-global advisory lock (`audit.ts:336-358`).
  - The bet path spends the synchronous `bet.place` token first (`market-service.ts:915`).
  - `withAdmission(fn)` sheds only when the queue is full or `maxWaitMs<=0` (`admission.ts:168-186`).
- **Private data on a LIVE poll.**
  - The operator re-check runs the paid AI call before any claim (`resolution-mode-action.ts:70-71`). `recheckMarketNow` is in the compliance domain, which ADMIN holds (`control-gates.ts:48`).
  - The claim and every stamp are written under `market:<id>` (`market-service.ts:2182-2216`, `:2272-2389`).
  - Before `resolutionAt`, a non-confident read stamps Sentinel fields and leaves the market LIVE (`:2355-2364`). Otherwise the market goes CLOSED with the fields (`:2380-2386`).
  - `adminReopenMarket` accepts any CLOSED market without a stage-1 officer (`:4000-4005`). It nulls outcome, evidence, reasoning, source, confidence, `sentinelClosedAt` and `resolveClaimedAt` (`:4011-4024`), leaves `sentinelDetermined` untouched, writes no marker, and does not await its audit (`:4027-4034`).
  - The resolve claim is honoured for 10 minutes (`RESOLVE_CLAIM_TTL_MS`, `:2054`, `:2212`).
  - The admin market page shows each position's name and phone (`admin/markets/[id]/page.tsx:91-95`, `:381-396`). AIPoll holds `confidence`, `reasoning` and `reviewedBy` (`schema.prisma:2103-2133`).
- **Up & Down timing edge.** Closeness may use a vendor bar up to 120 s old (04 A15), refreshed every 30 s (`updown-terminal-vendor.ts:51`). A person watching an exchange feed could press when the stale bar still reads "close". Enter now is therefore polls only.
- **Clocks.** `placedAt` is container JS time (`market-service.ts:1238`). `sellable` is decided on the cashing container's clock (`:2661-2687`). A24 measures skew and stops claims only above 5 s.
- **Sums under the market lock.** Position has `@@index([marketId, status])` (`schema.prisma:1798`); A24's EXPLAIN pin covers marked-position cap queries only.
- **Owner guard.** `requireOwner` accepts any ADMIN, and redirects or throws (`rbac-guard.ts:208-225`).
- **Notification dedupe.** Identical notifications within 90 s are dropped (`notification-service.ts:56`).
- **Clearing limits.** Clearing a limit while bots are on is refused (`02-sealed-flows.md` §3.8, kept by 04 C1).
- **Guardrail.** A single admin resolves even with a position, and nobody may re-add an officer-conflict block (`docs/COMPLIANCE-DECISIONS.md:2253-2291`).

#### N1 §2 Data model (commit 1; inside the two existing house migrations; S1 migration law; a memory twin for every column, CHECK and index)

*HouseBotPress (new table, the 8th house table; `HouseBotTarget` is the 7th, N2 §2):*

| Column | Type / CHECK |
|---|---|
| `id` | text PK `hbp_…` |
| `actorId` | text NOT NULL (the officer who pressed) |
| `submitId` | text NOT NULL, CHECK `"submitId" ~ '^[0-9a-f-]{36}$'` |
| `purpose` | text NOT NULL CHECK IN (`ENTER_NOW`,`TARGET_ADD`,`TARGET_UPDATE`,`TARGET_REMOVE`,`STAFF_CANCEL`) |
| `houseBotId` | text NOT NULL, soft reference with no FK, so a press naming a missing bot is still recorded, then refused |
| `marketId`, `targetId`, `intentId` | text NULL |
| `state` | text NOT NULL CHECK IN (`CHECKING`,`REFUSED`,`QUEUED`,`DONE`) |
| `code` | text NULL (the refusal code) |
| `reason` | text NULL: officer free text. Erasure pseudonymises it to "[erased]", like event reasons (04 A5). |
| `auditId` | text NULL |
| `auditClaimUntil` | timestamptz(3) NULL |
| `createdAt`, `updatedAt` | timestamptz(3) NOT NULL |

- **CHECKs:** `("state"='REFUSED') = ("code" IS NOT NULL)`; `"state"<>'QUEUED' OR ("purpose"='ENTER_NOW' AND "intentId" IS NOT NULL)`.
- **Indexes:** unique `hbp_actor_submit_uq ("actorId","submitId")`; `hbp_bot_created_idx ("houseBotId","createdAt")`; `hbp_state_created_idx ("state","createdAt")`.
- **Retention (A20):**
  - kept 7 years and never deleted;
  - P3 DATA-RETENTION row "House-bot presses · 7y · officer decision record";
  - on the chain-purge NEVER list;
  - officer data, so **never** in the holder's data-rights export (R5, N1 §9);
  - ~~the R1 register reads it.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no R1 register (C5-SPEC rulings 202, 206); the press rows stay the officer decision record, kept 7 years.

*Press flow for every N1/N2 owner action (replaces C4's AlertOnce `submit:<actor>:<id>` claim for these actions):*
1. **Guard and input.** `requireHouseOwner()`, then input validation: a reason of 5–300 code points where required (C2, W7), and id formats. A failure here writes nothing.
2. **Insert the press.** INSERT it in state CHECKING (autocommit). On a `hbp_actor_submit_uq` violation, read the existing row instead:
   - `purpose`, `houseBotId` or `marketId` differ (also `targetId` for TARGET_UPDATE and TARGET_REMOVE, and `intentId` for STAFF_CANCEL) → refusal SUBMIT_ID_REUSED "This request id was already used for a different action. Reload and try again." This refusal writes nothing.
   - CHECKING → return state CHECKING with "Still checking this press…".
   - REFUSED → return the stored refusal: the copy for its `code`, with its figures re-read now.
   - QUEUED or DONE → return the intent's live status with `duplicate:true`. A target or cancel press returns the target's or intent's current state instead.
3. **Refusal checks** (the ordered lists in N1 §6 and N2 §6). A refusal runs `UPDATE "HouseBotPress" SET state='REFUSED', code=$code, "updatedAt"=now() WHERE id=$1 AND state='CHECKING'`.
4. **ENTER_NOW, in one transaction:**
   - insert the MANUAL intent;
   - append `ENTER_NOW_REQUESTED`, with the reason in the event `reason` column and payload `{intentId, pressId}`;
   - then `UPDATE "HouseBotPress" SET state='QUEUED', "intentId"=$i, "updatedAt"=now() WHERE id=$1 AND state='CHECKING' RETURNING id`; 0 rows → roll back and return the press's current state.
   - A `hbi_manual_live_market_uq` violation rolls the transaction back, and the press becomes REFUSED with that refusal's code (N1 §6).
5. **Inline fire** (N1 §4.3). Once the intent is terminal, the press moves to DONE with `WHERE "intentId"=$i AND state='QUEUED'`. Three writers run that update:
   - the inline fire when it returns;
   - the A10 mapper after any terminal write;
   - the planner, for any QUEUED press whose intent is terminal.

   Repeats are no-ops.
6. **Audit through a lease on the press row:**
   ```sql
   UPDATE "HouseBotPress" SET "auditClaimUntil" = now() + interval '5 minutes'
   WHERE id = $1 AND "auditId" IS NULL
     AND ("auditClaimUntil" IS NULL OR "auditClaimUntil" < now())
   RETURNING id;
   ```
   - Append the audit only when a row returns, then set `auditId`.
   - The action runs this after its write (after the inline fire for ENTER_NOW; after the commit for target and cancel presses), outside every lock (A19).
   - **Planner repair** (N1 §4.5), 60 s after `updatedAt`, of every press whose `auditId` is null and whose lease is null or expired:
     - ENTER_NOW presses in state QUEUED or DONE;
     - ENTER_NOW presses REFUSED with code INFO_BLACKOUT or OWNER_POSITION. Those get COMPLIANCE `house_bot.enter_now_refused {botId, marketId, code}`;
     - TARGET_ADD, TARGET_UPDATE, TARGET_REMOVE and STAFF_CANCEL presses in state DONE whose transaction wrote an event carrying `payload.pressId` = the press id. The audit is rebuilt from that event. An ok no-op ("Nothing changed.", "Already removed.") writes no event, so it gets no audit.
7. **Status.** `getEnterNowStatusAction(botId, submitId)` reads the press for the current actor and that `submitId`, and writes nothing.
   - NO_RECORD only when no press row exists: "No stake was recorded for this press. Nothing moved. You can press Enter now again."
   - CHECKING shows "Still checking", never "Not placed".
8. **Client.**
   - Mint a new `submitId` (`crypto.randomUUID()`) after any definitive answer: REFUSED, or a terminal intent status.
   - After an uncertain transport result, call status first. Reuse the same `submitId` only while no definitive answer exists.
   - DUPLICATE_SUBMIT is never silently ignored in these modals.
9. **Every refused press is a durable row with its code** (INT-08). No throttle is needed, because presses are human clicks. Target add/update/remove and staff cancels use the same table. They insert the press CHECKING before any lock; the press's move to DONE happens inside the same transaction as the target or cancel write, and a refusal found inside the locks rolls back, then runs the step-3 REFUSED update (N2 §6, N1 §6).
10. **Interrupted press.** The planner marks a press still CHECKING 120 s after `createdAt` (any purpose) as REFUSED with code INTERRUPTED: "This press was interrupted before anything was saved. Nothing moved. You can try again." The update is conditional on `state='CHECKING'`; step 4's conditional update, and the conditional move to DONE in target and cancel transactions, make the race safe. No audit.

*HouseBotIntent (new table, so NOT NULL and defaults are allowed):*
- **Kind:** `kind` CHECK becomes IN (`COUNTER`,`FILL`,`OPENER`,`MANUAL`).
- **Polls only for MANUAL (W9):** `CHECK (kind<>'MANUAL' OR "productLine"='MARKET')`.
- **`requestedById text NULL`:** `CHECK ((kind='MANUAL') = ("requestedById" IS NOT NULL))`.
- **`entryCondition text NULL`:** `CHECK ("entryCondition" IS NULL OR "entryCondition" IN ('OPENER','THIN'))` and `CHECK ((kind='MANUAL') = ("entryCondition" IS NOT NULL))`.
- **`staleAt timestamptz(3) NOT NULL`** on every row. It replaces A24's `"dueAt" > now() − maxLateness`:
  - COUNTER without a target, FILL and OPENER: `dueAt + 30 s` on Up & Down, `dueAt + 600 s` on polls (A24's values unchanged);
  - targeted COUNTER: `dueAt + 60 s`;
  - MANUAL: `dueAt + 15 s`.
- **`targetId text NULL`** (references `HouseBotTarget.id`; N2 uses it): `CHECK ("targetId" IS NULL OR kind='COUNTER')`.
- **`transientAttempts int NOT NULL DEFAULT 0`** (MON-10). BUSY, `rate_limited`, 55P03 and `isEngineTransient` requeues increment it. `attempts` counts non-transient outcomes only, and the claim filter `attempts < 3` is unchanged (N1 §4.3).
- **anchorKey:** MANUAL → `manual:<requestedById>:<submitId>`.
- **Uniqueness (replaces PLAN §2 "Uniqueness"):**
  1. `hbi_counter_anchor_uq ("anchorKey") WHERE kind='COUNTER'`: unchanged, and covers targeted reactions.
  2. `hbi_fill_opener_anchor_uq ("kind","anchorKey") WHERE kind IN ('FILL','OPENER') AND status<>'CANCELLED'`. It is narrowed from `kind<>'COUNTER'`, so MANUAL never inherits re-plan semantics. 02 X11 `CANCELLED_BY_ADMIN` stays final for FILL and OPENER.
  3. `hbi_manual_anchor_uq ("anchorKey") WHERE kind='MANUAL'`, with no status filter: a press id is used once, ever.
  4. `hbi_manual_live_market_uq ("marketId") WHERE kind='MANUAL' AND status IN ('PENDING','CLAIMED')`: at most one live Enter now per market, across bots, tabs and replicas.
- **Indexes:**
  - `hbi_staff_bot_finished_idx ("houseBotId","finishedAt") WHERE (kind='MANUAL' OR "targetId" IS NOT NULL) AND status='PLACED'` (H2 staff-chosen counts);
  - `hbi_staff_finished_idx ("finishedAt") WHERE (kind='MANUAL' OR "targetId" IS NOT NULL) AND status='PLACED'` (H4 counts, counterparty reads);
  - `hbi_status_stale_idx ("status","staleAt")` (expiry);
  - `hbi_target_status_idx ("targetId","status") WHERE "targetId" IS NOT NULL`.
  - The A24 EXPLAIN pin extends to every index above: no Seq Scan at 1M intents and 20k markets.

*HouseBotEvent (new table):*
- **`marketId text NULL`.**
- **The kind CHECK gains:** `ENTER_NOW_PREVIEWED`, `ENTER_NOW_REQUESTED`, `OPENER_SIDE_DRAWN`, `TARGET_ADDED`, `TARGET_UPDATED`, `TARGET_REMOVED`, `TARGET_ENDED`, `STAFF_INTENT_CANCELLED`.
- **One draw per market:** `hbe_opener_draw_uq ("marketId") WHERE kind='OPENER_SIDE_DRAWN'`.
  - Payload `{side, drawnFor: 'ENTER_NOW_PREVIEW'|'ENTER_NOW'|'OPENER_PLAN'}`.
  - `actorId` is the previewing or pressing officer. It is null only for automated planning (INT-08).
- **Officer reasons** (Enter now, target add/update/remove, staff cancel) go in the event `reason` column, **never** in `payload` (INT-10). Erasure pseudonymises them (04 A5).
- **Audit link:** Enter now, target and cancel audits link through `HouseBotPress.auditId`. The event's A19 `auditId` stays for engine audits.

*HouseBotTarget:* the 7th table, with its columns and `hbt_active_market_uq` / `hbt_market_idx`, is specified in N2 §2.

*Staff-chosen caps (INT-05). These replace the draft's four MANUAL-only caps:*
- **HouseBot:**
  - `capStaffChosenPerDay int NULL CHECK ("capStaffChosenPerDay" IS NULL OR "capStaffChosenPerDay" BETWEEN 1 AND 50)`
  - `capStaffChosenDailyTzs bigint NULL CHECK (… IS NULL OR … BETWEEN 0 AND 1000000000)`
  - `targetsMaxActive int NULL CHECK (… IS NULL OR … BETWEEN 1 AND 50)`
- **HouseBotControl:**
  - `gCapStaffChosenPerDay int NULL CHECK (… BETWEEN 1 AND 200)`
  - `gCapStaffChosenDailyTzs bigint NULL CHECK (… BETWEEN 0 AND 1000000000)`
  - `gTargetsMaxActive int NULL CHECK (… BETWEEN 1 AND 200)`
  - `gStaffChosenMaxCounterpartyShare int NULL CHECK (… BETWEEN 10 AND 100)`: recommended 50. NULL means Enter now refuses (N1 §3 H3).
  - `gStaffEdgeWinRatePts int NULL CHECK (… BETWEEN 1 AND 100)`: recommended 15. NULL switches that alert off.
  - `gStaffEdgeNetTzs bigint NULL CHECK (… BETWEEN 0 AND 1000000000)`: recommended 100,000. NULL switches it off.
  - `boardDisclosureSections text[] NULL` (INT-12)~~, written by "Record disclosure sent" (N1 §10)~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** P1's disclosure tracking is struck, so no "Record disclosure sent" console action writes it (see N1 §10).
- **What they count:** PLACED rows `WHERE kind='MANUAL' OR "targetId" IS NOT NULL`, finished in the current EAT day (day key from DB `now()` in `Africa/Dar_es_Salaam`, A24).
- **NULL:** the staff caps set to NULL mean Enter now and targets cannot bet. `targetsMaxActive` NULL means no target can be added for that bot; `gTargetsMaxActive` NULL means no target can be added for any bot. Active targets keep reacting (N2 §2).
- **Master ON:** these columns are **not** required and are excluded from PLAN F3's "Set N global limits first" list.
- **Clearing while on (MON-14).** Every staff-chosen cap, `gStaffChosenMaxCounterpartyShare`, `targetsMaxActive` and `gTargetsMaxActive` is **exempt** from 02 §3.8 "Can't clear a limit while bots are on". For the per-bot columns it is also exempt from C1's "pause it before clearing".
  - Clearing takes `house:control` briefly (the rules save per C6 order), so an in-flight staff-chosen bet's H2/H4 re-read sees NULL and refuses.
  - Consequence previews are in N1 §5 "Clearing is never blocked": one for the staff-chosen caps (per bot and global), one for the share limit and one for the target maxima.

*PredictionMarket (in `…_house_bot_markers`, expand-only: nullable, no default):*
- `reopenedAt timestamptz(3) NULL` and `reopenCount int NULL` (INT-01). Both are never cleared.
- **Sanctioned player-path change (r):** `adminReopenMarket` sets `m.reopenedAt = <now ISO>` and `m.reopenCount = (m.reopenCount ?? 0) + 1` in the same `marketStore.set(m)` (`market-service.ts:4025`). Its output is otherwise byte-identical (`test:house-bot-seam`). The DAL maps both fields in both stores (`test:dal-parity`).
- **04 A16 reopen row, replace the detection:** MARKET_REOPENED is detected from `reopenedAt IS NOT NULL` for every mode. This replaces "an intent with MARKET_NOT_LIVE exists".
- **A13:** `HOUSE_MARKET_FIELDS` gains `reopenedAt`, exposed in `PublicMarketView` only as `reopened: boolean`.

*Rules JSON v1 (commit 1; folded in, so no v2):*
- `enterNow: {enabled:false, thinStakeTzs:null, openerStakeTzs:null}`.
- `targeting: {enabled:false}`.
- Missing keys in a v1 JSON parse to their narrowest value (C14 `stale[]`), with no pause.
- Why the fold-in is required: built after REL-4, this would need `schemaVersion: 2`, and F4 would put every bot in AUTO_PAUSED(RULES_OUTDATED) until the owner saved the diff (TGT-27).

*Fixed index names and `uniqueViolation` (MON-12):*

| Name | Table | Violation means |
|---|---|---|
| `hbp_actor_submit_uq` | HouseBotPress | same press again → read the existing press (press flow step 2) |
| `hbi_counter_anchor_uq` | HouseBotIntent | trigger already decided → `ON CONFLICT DO NOTHING` (PLAN §4.3) |
| `hbi_fill_opener_anchor_uq` | HouseBotIntent | already planned → no-op |
| `hbi_manual_anchor_uq` | HouseBotIntent | same press id → return that intent's status, `duplicate:true` |
| `hbi_manual_live_market_uq` | HouseBotIntent | another Enter now is live on this market → refusal (N1 §6) |
| `hbe_opener_draw_uq` | HouseBotEvent | the draw exists → read it (N1 §4.1) |
| `hbt_active_market_uq` | HouseBotTarget | poll already targeted → refusal (N2 §6) |

- **Other fixed names:** `hbp_bot_created_idx`, `hbp_state_created_idx`, `hbi_staff_bot_finished_idx`, `hbi_staff_finished_idx`, `hbi_status_stale_idx`, `hbi_target_status_idx`, `hbt_market_idx`. Every statement uses `IF NOT EXISTS` (A23).
- **DAL `uniqueViolation(err) → name | null`:**
  - It reads the Postgres 23505 constraint name from P2002 `meta.target`, or from P2010 `meta` (`code '23505'` plus the constraint named in its message).
  - Inserts that can hit a partial unique index use raw SQL, so the error carries the name.
  - When `meta.target` is a field list rather than a name, the function returns null.
  - The memory twin throws the same code and name.
  - **An unknown or null unique violation is rethrown, never swallowed.**

*Other:*
- A23 `houseBotSchemaReady()` and `ops:preflight-house-bot-migrations` count **8** house tables and check every new column above, `reopenedAt`/`reopenCount` included.
- A20 is unchanged for intents and events (7 years, never deleted).
- The feed reads `decision.snapshot` for purged markets (A16).
- Memory twins and `test:dal-parity` cases land in commit 1 for the draw, the intent insert, the press and the target. The picker DAL parity case lands in commit 7.

#### N1 §3 Money seam (commit 2)
Sanctioned change (r) (N1 §2) is the only new player-path change; ~~(q) is extended in N1 §9.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** sanctioned change (q), R9's `houseStake` payload, is struck with its N1 §9 extension (C5-SPEC rulings 187–191). Every kind-specific branch below reads the claimed intent row by `ctx.intentId`, never a call argument.

**H0, for `ctx.kind==='house'`: an ordered rule (MON-01)**
1. The key must equal `houseIntentKey(intentId)` and there must be no `playStartedAt`, else `house_key_mismatch`.
2. The PLAN pre-lookup (PLAN:198):
   - key found with the same user and bot → return the original with `replayed:true`;
   - key found with another user or bot → `house_key_mismatch`;
   - not found → continue.
3. Load the intent by id **with no status filter**. `house_key_mismatch` if:
   - the row is missing; or
   - `houseBotId ≠ ctx.botId`, `botUserId ≠ userId`, `marketId ≠ opts.marketId`, `side ≠ opts.side`, or `stakeTzs ≠ opts.stake`.
- **Status is never part of H0.** A non-CLAIMED row (CANCELLED by Remove, auto-pause, OFF or target removal; PENDING after a SIGTERM requeue) proceeds. `markPlaced` then returns 0 rows → `house_intent_superseded`, before any money. `house_key_mismatch` keeps its PLAN §4.6 mapping (FAILED + SECURITY alert + master OFF(ENGINE_FAULT)).
- **The seam never clamps.** Stake equality holds because `fire.ts` writes any shrinking clamp back to the row, for every kind, before calling the seam (MON-02). The rule and its SQL are in N1 §4.3; PLAN F5 step 9 and N2 §4 cite it.

**`staleAt` inside the locks (MON-03)**
- Inside `house:control`, after H4's caps and immediately before `markPlaced`, re-read the row on the lock transaction:
  ```sql
  SELECT status, ("staleAt" > clock_timestamp()) AS fresh FROM "HouseBotIntent" WHERE id = $1;
  ```
- status CLAIMED and `fresh` false → `BetAbort` → **`house_intent_stale`** → EXPIRED(STALE), no alert.
- Any other status → continue; `markPlaced`'s 0 rows give `house_intent_superseded`.
- `clock_timestamp()`, not `now()`: `now()` is frozen at the start of the wallet-lock transaction, which can wait on the lock and the pool before this point (`locks.ts:126-143`).
- This is what "on the database clock" means for `staleAt` inside the seam everywhere in N1–N2. Autocommit claims and planner passes keep `now()`.
- The memory twin compares `Date.now()` under the memory mutex.
- It applies to every kind, because `staleAt` is NOT NULL on every row. The planner's early expiry of MANUAL and targeted CLAIMED rows is in N1 §4.3.

**H2 (inside `wallet:<botUser>`): declared order (MON-09)**

The order is pinned as `H2_ORDER` in `scripts/anchors/house-bot-seam.anchors.mjs` and resolved by `test:red-anchors`. The first failing check returns.
1. **Consent and RG:**
   - holder status and RG timers (`self_excluded` / `cooling_off` / `account_blocked`);
   - role (`house_account_ineligible`);
   - `consentValid` (`house_consent_stale`, PLAN §18);
   - cash only (`house_cash_only`, A7).
2. `house_market_conflict{OWNER_POSITION | OPPOSITE_SIDE}`.
3. **Money caps:** STAKE_MIN, STAKE_MAX, PER_MARKET, BALANCE_FLOOR, DAILY_STAKE, DAILY_LOSS_PROJECTED, EXPOSURE.
4. **Staff-chosen caps and TARGET_ONCE,** for kind MANUAL and for COUNTER rows with `targetId`:
   - `house_cap_reached{STAFF_CHOSEN_PER_DAY}` when this bot's PLACED staff-chosen rows finished in the current EAT day ≥ `capStaffChosenPerDay`, or the cap is NULL;
   - `house_cap_reached{STAFF_CHOSEN_DAILY_STAKE}` when their `stakeTzs` sum + this stake > `capStaffChosenDailyTzs`, or NULL;
   - `house_cap_reached{TARGET_ONCE}`: condition in N2 §3.
5. **Rate caps:** MIN_GAP, PER_HOUR and PER_DAY are deferrable; PER_MARKET_COUNT is terminal. Within group 5, if PER_MARKET_COUNT fails it is returned even when an earlier deferrable cap also fails; otherwise the first failing deferrable cap returns. The `H2_ORDER` fixtures include "MIN_GAP + PER_MARKET_COUNT → PER_MARKET_COUNT".
- Because rate caps run last, a deferral (A24) is reported only when no terminal cap applies.
- Staff-chosen counts use `hbi_staff_bot_finished_idx`. They are plain SELECTs, with no FOR UPDATE (A9).

**H3 (inside `market:<id>`, after the closed re-check and A12's raw re-read): house-context order**
1. **`house_info_blackout`** for kind MANUAL and for COUNTER rows with `targetId` (predicate below).
2. `house_market_conflict{OTHER_BOT}` and `house_cap_reached{GLOBAL_PER_MARKET}`, unchanged.
3. **Mode condition.** For kind MANUAL, from the row's `entryCondition`:
   - `OPENER`: raw `yesPool = noPool = 0`.
   - `THIN`: `rawPool(side) + stake ≤ lockedForHouse(marketId, {tx, …})[opposite(side)].locked`. Raw pools are the market row's own pools, re-read in the lock.
   - Otherwise `house_condition_gone{condition}`. **The side is never re-chosen.**
   - COUNTER and FILL conditions are unchanged, except that their locked pool is `lockedForHouse` (below). Target-specific H3 is in N2 §3.
4. **Counterparty concentration,** kind MANUAL (INT-02):
   - `gStaffChosenMaxCounterpartyShare` NULL → `house_counterparty_concentration` (Enter now refuses).
   - For THIN, when `accounts[0].lockedTzs × 100 > share × locked` on the opposite side → `house_counterparty_concentration`.

**H4 (inside `house:control`): add for staff-chosen rows (MANUAL, or COUNTER with `targetId`), after the existing global caps**
- `house_cap_reached{GLOBAL_STAFF_CHOSEN_PER_DAY}` when PLACED staff-chosen rows of all bots in the current EAT day ≥ `gCapStaffChosenPerDay`, or NULL.
- `house_cap_reached{GLOBAL_STAFF_CHOSEN_DAILY_STAKE}` when their sum + this stake > `gCapStaffChosenDailyTzs`, or NULL. Both use `hbi_staff_finished_idx`.
- **COUNTERPARTY_COUNT / COUNTERPARTY_TZS:**
  - **Targeted COUNTER:** as today, charged to the trigger account.
  - **MANUAL THIN, pro rata (INT-02):** the stake is attributed to every opposite-side account holding at least 25% of `lockedForHouse(opposite).locked`. Each such account gets count 1 and `floor(stake × accountLocked / locked)` TZS.
  - **Refusal:** when, for any such account, today's count + 1 > `gCounterPerPlayerPerDay`, or today's TZS + attributed > `gCounterPerPlayerTzsPerDay`.
  - **An account's "today":** PLACED COUNTER rows with its `triggerUserId`, plus PLACED MANUAL rows whose `decision.counterparties` lists it, in the current EAT day. MANUAL rows per day are bounded by `gCapStaffChosenPerDay` (≤ 200), so the read stays small.
  - **Recording:** for a MANUAL THIN row, `markPlaced` also sets `decision = decision || jsonb_build_object('counterparties', $c)`, with `[{userId, sharePct, attributedTzs}]`, in the same statement. Only ids are stored; handles resolve at render (A5).
  - **MANUAL OPENER** has no counterparty.
- Then the `staleAt` check above, then `markPlaced` as the first money statement (unchanged).

**`lockedForHouse`: one locked-pool implementation (MON-06, MON-07, MON-17, INT-02)**
- **Where and how.** `lockedForHouse(marketId, {tx?, graceMs, paidMs, closesAt, asOf?})` lives in `server/house-bot/pools.ts`. N1 §4.1 is its single definition; this block summarises what the seam relies on. It is **one SQL statement**: per-account sums in a subquery, per-side totals outside. It runs on the lock transaction in H3 and autocommit in preview, fire and planning.
- **Population:** `Position WHERE "marketId"=$1 AND status='OPEN' AND "houseBotId" IS NULL`, joined to `User`, keeping only eligible accounts. Eligible excludes:
  - `role <> 'PLAYER'`;
  - a holder of any non-REMOVED bot;
  - an account penalty-boxed today, using the PLAN §4.3 trigger filter's predicate as one shared SQL fragment;
  - an account whose `User.recruitedBy` (`schema.prisma:284`) is a non-REMOVED bot's holder.
- **Locked:**
  ```sql
  sum(p.stake) FILTER (WHERE <exit> <= (clock_timestamp() AT TIME ZONE 'UTC') - interval '7 seconds')
  ```
  - `<exit>` mirrors `exitWindowClosesAt` (04 A14) with the market's frozen rates, passed as parameters from `ratesFor(m)`: `CASE WHEN $graceMs > 0 AND $closesAt - p."placedAt" >= $graceMs * interval '1 millisecond' THEN p."placedAt" + ($graceMs + $paidMs) * interval '1 millisecond' ELSE p."placedAt" END`.
  - `closesAt = selectionClosedAt ?? resolutionAt`. Timestamps follow PLAN §2 (Position times are naive UTC).
  - `asOf` (default: the database clock) replaces the clock term; only the targeted COUNTER's decision-time cut passes `asOf = dueAt` (N2 §4).
- **Output:** as N1 §4.1. The ≥ 25% list is `accounts` filtered by `lockedTzs × 4 ≥ locked`, and the largest share is `accounts[0].lockedTzs`. `earliestLockAt` is the preview's "can still be cancelled until" time.
- **`LOCK_MARGIN_MS = 7000`** = A24's maximum tolerated skew (5 s) + 2 s, pinned in a constants test.
- **Tests (listed in N1 Tests):**
  - a golden-grid parity test of the SQL expression against the JS function (A14 grid);
  - an EXPLAIN pin at 20,000 OPEN positions per market using Position `(marketId, status)` (`schema.prisma:1798`);
  - a memory twin with identical output (`test:dal-parity`).
- **Used by:**
  - the MANUAL preview, fire and H3;
  - the targeted COUNTER amount cut and H3 (the untargeted COUNTER keeps A15 through the `lockedA15` column, N1 §4.1);
  - FILL.
- **04 A15, amend:** for MANUAL, targeted COUNTER and FILL, "Locked pool" becomes `lockedForHouse`; the untargeted COUNTER reads `lockedA15` (A15 unchanged). PLAN §18 has the row.
- Raw pools in the THIN formula stay the raw market pools.

**Information blackout (INT-01, INT-09)**
- **Blocked** when the raw re-read shows `status='LIVE'` AND any of:
  - `sentinelOutcome`, `sentinelConfidence`, `sentinelDetermined`, `sentinelClosedAt`, `resolvedOutcome` or `resolutionStage1By` is non-null;
  - `resolveClaimedAt` is younger than `RESOLVE_CLAIM_TTL_MS` (10 min; the exported constant at `bulk-resolve-eligibility.ts:237`, which `market-service.ts:2054` imports in place of its private copy, so `:2212` and `blackout.ts` share one constant);
  - `reopenedAt` is non-null.
- **Why the in-lock read is exact.** The stamp and H3 both hold `market:<id>`. The only unmarked window is an operator re-check's AI call, during which no verdict exists anywhere: `resolution-mode-action.ts:70-71` runs it before the claim at `market-service.ts:2182-2216`.
- **`server/house-bot/blackout.ts`:**
  - It makes an explicit raw select of those columns plus `status`.
  - Its only export returns `{blocked: boolean}`. Its output never reaches `side`, `stakeTzs`, `dueAt`, `why` or `decision`, other than `reasonCode=INFO_BLACKOUT`.
  - `decide.ts` receives `blocked` as an injected argument and never imports `blackout.ts` (source pin in `test:house-bot-info-edge`).
- **`endTargets`** never ends a target on `resolveClaimedAt` alone; it skips that pass (N2 §4).
- **Console copy** (admin, English):
  - "Not available: an AI result check is recorded on this market."
  - For a reopened market: "Not available: this market was reopened after a result check."
- **PLAN §18, add rows:**
  - **I2:** "…never reads Sentinel fields, staged outcomes…, except `blackout.ts` and the H3 site, whose only output is `{blocked:boolean}`."
  - **A13:** the token walker exempts `blackout.ts` by name, like `designation.ts`.
  - **A16:** MARKET_REOPENED is detected from `reopenedAt` for every mode.

**Gate parity, reasons and registry (F3, A10)**
- `BET_PATH_REASONS` gains `house_info_blackout`, `house_intent_stale` and `house_counterparty_concentration`.
- `GATE_PARITY` gains all three as `{exempt: "house context only"}`.
- **No new `ctx.kind` site.** The branches read the claimed row at the anchored H0/H2/H3/H4 sites in `house-bot-seam.anchors.mjs`.
- **A9 unchanged:** `lock_timeout 2s` before `market:<id>` and `house:control`; plain SELECTs in H2.
- ~~**Registered copy.** PLAN §3 registers every `house_*` reason in en/sw/zh. en is binding; sw/zh are drafted and need native review.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the three reasons below get no player copy in any language and the table is struck: they are server-only `HouseSeamReason` codes outside the player registry and dictionary, worded for the console by the engine's server-side copy (C4 ruling 148).

| Reason | en | sw (native review) | zh (native review) |
|---|---|---|---|
| `house_info_blackout` | ~~"This market isn't open to liquidity stakes right now."~~ | ~~"Soko hili halipokei dau za ukwasi kwa sasa."~~ | ~~"该市场目前不接受流动性投注。"~~ |
| `house_intent_stale` | ~~"This liquidity stake is past its time limit, so it was not placed."~~ | ~~"Dau hili la ukwasi limepita muda wake, kwa hivyo halikuwekwa."~~ | ~~"该流动性投注已超过时限，因此未下注。"~~ |
| `house_counterparty_concentration` | ~~"Most of the other side belongs to one account, so no liquidity stake was placed."~~ | ~~"Sehemu kubwa ya upande mwingine ni ya akaunti moja, kwa hivyo dau la ukwasi halikuwekwa."~~ | ~~"对方大部分资金属于同一账户，因此未下流动性投注。"~~ |

- **`FailureDetail.cap` gains:** `STAFF_CHOSEN_PER_DAY`, `STAFF_CHOSEN_DAILY_STAKE`, `GLOBAL_STAFF_CHOSEN_PER_DAY`, `GLOBAL_STAFF_CHOSEN_DAILY_STAKE`, `TARGET_ONCE`.
- **`FailureDetail` gains** `condition` (`OPENER`|`THIN`) for `house_condition_gone`.
- FAILURE-INVENTORY §6 rows land in commit 7.
- **Mapper rows** (N1 §4.6 owns them):
  - `house_intent_stale` → EXPIRED(STALE), no alert;
  - `house_market_conflict{OPPOSITE_SIDE}` → SKIPPED(CAP_OPPOSITE_SIDE), with its own feed-copy row;
  - staff-chosen caps → SKIPPED(CAP_<code>).

**No locked-pool exception and no early-entry branch**
- Early-entry cap codes do not exist.
- `test:house-bot-seam` keeps A14's golden grid and adds four source pins (full cases in N1 Tests):
  - No Position stake sum in the H3 path or in `pools.ts` skips the exit-window FILTER, the `LOCK_MARGIN_MS` term or the eligibility fragment, except the `lockedA15` column, which only the untargeted COUNTER reads (planted RED).
  - `H2_ORDER` matches the code.
  - H0 has no status filter.
  - `adminReopenMarket` output is byte-identical apart from `reopenedAt` and `reopenCount` (sanctioned change (r)).

#### N1 §4 Engine (commit 4)

*Evidence (read in `C:\kipindi-house-bots` on 2026-09-14, after the merge of `origin/main`; re-derive every anchor after P0.4). Anchors are pointers, not facts.*
- **Exit-window inputs.**
  - `cashOutValue` reads the market's frozen rates through `ratesFor(market)` (`market-service.ts:830-832`): `freeExitGraceMinutes` and `paidExitWindowMinutes` (`:2657-2659`).
  - `hadRunway = graceMs > 0 && closesAt − placedAt ≥ graceMs` (`:2671`).
  - `sellable` is computed on the cashing container's `Date.now()` (`:2662`, `:2687`).
- **Early re-check.**
  - A re-check that is not confident, run before `resolutionAt`, leaves the market LIVE and stamps the Sentinel fields with `resolveClaimedAt: null` (`:2355-2364`).
  - A confident one closes the market with the same fields (`:2380-2386`).
  - Both run under `market:<id>`.
- **Reopen.**
  - `adminReopenMarket` accepts any CLOSED market without `resolutionStage1By`.
  - It nulls six Sentinel fields and `resolveClaimedAt`.
  - Its `market.reopened` audit is not awaited (`:4000-4041`).
- **Resolve-claim TTL.** `RESOLVE_CLAIM_TTL_MS` is 10 min. It is exported at `bulk-resolve-eligibility.ts:237` and duplicated privately at `market-service.ts:2054`.
- **Transactions.**
  - A lock transaction waits up to 10 s for a connection and lives up to 30 s (`locks.ts:142-143`).
  - P2028 and 08006 are retried with the same key (`retry.ts:48-50`).
  - `withAdmission(fn)` sheds only when its queue is full or `maxWaitMs <= 0` (`admission.ts:168-186`).
- **Rows used by the new reads.**
  - `Position @@index([marketId, status])` (`schema.prisma:1798`).
  - `User.recruitedBy` holds the referrer's user id (`schema.prisma:284`, written at `affiliate-service.ts:918`).
  - A voided market has status `VOIDED` (`market-service.ts:170`).
  - `AuditLog @@index([targetType, targetId])` (`schema.prisma:921`).
  - Penalty box: AlertOnce `penalty:<userId>:<EAT day>` plus R5's `PENALTY_BOXED` event.

**4.1 Shared modules**

`pools.ts` and `blackout.ts` land in commit 2 with the seam; the other 4.1 modules land in commit 4.

*`server/house-bot/pools.ts` · `lockedForHouse(marketId, {tx?, graceMs, paidMs, closesAt, asOf?})`*
- **What it is.** A15's single implementation of "locked money", now with I3's account filter (merges INT-02, MON-06, MON-07, MON-17). This is the single definition; N1 §3 summarises it.
- **One SQL aggregate**, run on the caller's connection:
  - on the lock transaction when `tx` is passed (H3);
  - otherwise autocommit (preview, press action, fire, planning).
- **Rows.** `"Position"` WHERE `"marketId"=$1 AND status='OPEN' AND "houseBotId" IS NULL`, served by `(marketId, status)`.
- **Exit expression, per row.**
  - `exitCloseAt` = `placedAt + ($graceMs + $paidMs)` when `$graceMs > 0 AND $closesAt − placedAt ≥ $graceMs`; else `placedAt`. This mirrors A14's `exitWindowClosesAt`.
  - `$graceMs`, `$paidMs` and `$closesAt` are bound parameters. JS computes them from `ratesFor(market)` and `selectionClosedAt ?? resolutionAt`, so the SQL never re-implements the legacy fee-snapshot fallback.
  - Position times are naive UTC and are cast as PLAN §2 says.
- **Locked** means `exitCloseAt <= clock_timestamp() − LOCK_MARGIN_MS`, on the database clock (never `now()`, which is frozen at the start of a lock transaction). `asOf` (default: the database clock) replaces the clock term; only the targeted COUNTER's decision-time cut passes `asOf = dueAt` (N2 §4).
- **Eligible account.** All four must hold:
  - role is `PLAYER`;
  - the account holds no non-REMOVED HouseBot;
  - no AlertOnce row `penalty:<userId>:<today EAT>` exists;
  - `recruitedBy` is not the user id of any non-REMOVED bot's holder.
- **Returns** aggregates per side (YES and NO). Ids appear only in `accounts`:

| Key | Meaning |
|---|---|
| `raw` | the market's raw pools, read in the same statement |
| `nonHouse` | every OPEN unmarked stake |
| `locked` | eligible stakes past the margin |
| `unlocked` | eligible stakes not yet past the margin |
| `earliestLockAt` | earliest `exitCloseAt + LOCK_MARGIN_MS` among eligible unlocked stakes, or null |
| `excluded` | OPEN unmarked stakes of ineligible accounts |
| `lockedA15` | every OPEN unmarked stake with `exitCloseAt <= clock_timestamp()`, no filter and no margin: A15 unchanged, for the untargeted COUNTER only |
| `accounts` | per side, `{userId, lockedTzs}` for the top eligible account plus every eligible account holding ≥ 25% of that side's `locked` (at most 4 rows) |

- **`LOCK_MARGIN_MS = 7000`** in `constants.ts`: A24's maximum tolerated skew (5 s) plus 2 s. A constants test pins it at or above that sum.
- **Used by:**
  - the Enter now preview, press action, fire and H3 (4.2, 4.3);
  - the targeted COUNTER amount cut and H3 (N2 §4);
  - FILL planning, fire and H3.
    - **A15 is amended:** FILL sizes against eligible `locked` money.
    - Its hold becomes the latest `exitCloseAt + LOCK_MARGIN_MS` among the stakes it counts.
    - PLAN §18's A15 row records both.
  - The untargeted COUNTER keeps A15's condition and reads `lockedA15`; N1 does not change it.
- **Raw pools stay raw.** In the THIN formula `raw` is the market pool, house money included.
- **Guards.**
  - A golden-grid test compares the SQL `exitCloseAt` with JS `exitWindowClosesAt` over A14's grid.
  - An EXPLAIN pin at 20,000 OPEN positions on one market shows an index scan on `(marketId, status)` and no Seq Scan on Position.
  - The memory twin returns identical output (`test:dal-parity`).
- **Attribution.** `attributeStake(stakeTzs, accounts, lockedOpp)` is pure, in `src/lib/house-bot/counterparty.ts`.
  - Each account with `lockedTzs × 4 ≥ lockedOpp` is attributed `floor(stakeTzs × lockedTzs / lockedOpp)`.
  - The preview (4.2) and H4's COUNTERPARTY_COUNT/TZS for MANUAL THIN (N1 §3) call this one function.

*`server/house-bot/opener-side.ts` · `openerSide(marketId, {houseBotId, actorId, drawnFor})`*
- **The draw.**
  - `INSERT INTO "HouseBotEvent"` kind `OPENER_SIDE_DRAWN` with `"marketId"`, `"houseBotId"`, `"actorId"` and payload `{side, drawnFor}`.
  - It uses `ON CONFLICT ("marketId") WHERE kind='OPENER_SIDE_DRAWN' DO NOTHING RETURNING` (index `hbe_opener_draw_uq`).
  - The side comes from the injected `crypto.randomInt(2)`.
  - When no row returns, it reads the existing row.
- **Its own autocommit statement.** It throws when called inside a lock or transaction context, so no rollback can undo a side someone has already seen.
- **Callers:**
  - `previewEnterNowAction` and `enterNowHouseBotAction`: only when raw pools are both 0 and the market is not blacked out, with `actorId` = the officer and `drawnFor` `ENTER_NOW_PREVIEW` or `ENTER_NOW` (INT-08);
  - the planner, before calling `decide()` for OPENER planning: `actorId` null, `drawnFor` `OPENER_PLAN`, and the result is passed in as `{openerSide}` (MON-16).
- **`decide.ts` stays pure.** It never imports the store or this module (source pin).
- **PLAN §1-F4 OPENER:** "a small stake on a random side" becomes "a small stake on the side drawn once for that market".
- **The side never changes.** Not after a cancel (02 §3.9), a new preview, another bot or another day.

*`server/house-bot/blackout.ts` · `infoBlackout(marketId, {tx?}) → {blocked: boolean}`*
- **Export.** The exported type is exactly `{blocked:boolean}`.
- **Select.** An explicit raw select of `status`, `sentinelOutcome`, `sentinelConfidence`, `sentinelDetermined`, `sentinelClosedAt`, `resolvedOutcome`, `resolutionStage1By`, `resolveClaimedAt` and `reopenedAt`.
- **`blocked`** = `status='LIVE' AND (any of the first six fields non-null OR "resolveClaimedAt" > now() − RESOLVE_CLAIM_TTL_MS OR "reopenedAt" IS NOT NULL)` (N1 §3).
  - `RESOLVE_CLAIM_TTL_MS` is imported from the one exported constant.
  - Commit 2 makes `market-service.ts:2054` import it too (its private copy is deleted), and the constants test pins it.
- **Exactness.** The stamp and H3 both hold `market:<id>`, so the in-lock read is exact. The only window with no marker is an operator re-check's AI call, and during that call no verdict exists anywhere.
- **Pinned importers:**
  - `picker.ts` (commit 7);
  - `enter-now.ts`;
  - `fire.ts`;
  - the poll sweep in `trigger.ts`;
  - `planner.ts` (for `endTargets`, N2 §4);
  - the H3 site in `market-service.ts`;
  - `src/app/admin/desk/actions.ts` (target add refusal 11 and `previewHouseBotTargetAction`, N2 §6).
- **`decide.ts` never imports it.** `decide.ts` receives `blocked` as an injected argument (source pin).
- **Where the result can go:** a refusal code or `reasonCode=INFO_BLACKOUT` only. Never `side`, `stakeTzs`, `dueAt`, `why` or any other `decision` field.
- **PLAN §18 rows:**
  - I2 gains "except `blackout.ts` and the H3 site, whose only output is `{blocked:boolean}`";
  - A13's token walker exempts `blackout.ts` by name.
- **`endTargets`** never ends a target on `resolveClaimedAt` alone. When that is the only blocking column, it leaves the target for that pass (N2 §4).

*`server/house-bot/oversight.ts`*
- Holds the 4.5 detection passes (staff-stake voided, staff-stake self-decided, ~~staff edge~~). ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge pass is struck (C5-SPEC rulings 218–223).
- It reads the audit table, so it is exempt by name from `test:house-bot-info-edge`, like `designation.ts`.
- Only `planner.ts` imports it. `decide.ts`, `trigger.ts` and `fire.ts` never do (source pin).

**4.2 Side and amount: `enterNowDecision`**

`enterNowDecision(input)` lives in `server/house-bot/enter-now-decision.ts`.
- **Pure.** No store, clock or server import (source pin).
- **Loader.** `enter-now.ts` exports `loadEnterNowInput(botId, marketId, {actorId, drawnFor})`, which reads every input fresh. Preview, the press action and fire all go through it.
- **Load order.** Blackout first; a blacked-out market is never drawn.

*Input*

| Key | Source |
|---|---|
| `view` | `PublicMarketView` (A13) |
| `blocked` | `infoBlackout` (4.1), injected |
| `pools` | `lockedForHouse` (4.1) |
| `openerSide` | `openerSide` (4.1), drawn only when `raw` YES = NO = 0; else null |
| `own` | the bot's OPEN house positions on this market: `{side \| null, count, stakeTzs}` |
| `rules` | saved `enterNow.thinStakeTzs`, `enterNow.openerStakeTzs`, Shaping round-to, `stakeMinTzs`, `stakeMaxTzs`, `freqMaxPerMarket` |
| `bot` | typed caps and today's usage: `capStaffChosenPerDay`, `capStaffChosenDailyTzs`, `capPerMarketTzs`, `capDailyStakeTzs`, `capDailyLossTzs`, `capOpenExposureTzs`, `balanceFloorTzs`; staff-chosen count and TZS today, staked today, projected loss, open exposure, stake on this market, live balance |
| `control` | `gCapStaffChosenPerDay`, `gCapStaffChosenDailyTzs`, `gStaffChosenMaxCounterpartyShare`, `gCapPerMarketTzs`, `gCapDailyStakeTzs`, `gCapDailyLossTzs`, `gCapOpenExposureTzs`, `gCounterPerPlayerPerDay`, `gCounterPerPlayerTzsPerDay`, and their usage today |
| `counterparties` | per attributed account, counters and TZS attributed today, from the same read H4 uses (N1 §3) |
| `bounds` | `stakeBoundsForMarket(market)` (A7 (p), F5) |
| `rate` | last placed bet, rolling hour, EAT day and platform bets-per-minute counts, with the rules' `freqMinGapSec`, `freqMaxPerHour`, `freqMaxPerDay` and `gMaxBetsPerMinute` |
| `now` | database `now()` ISO |

Staff-chosen usage counts PLACED rows `WHERE kind='MANUAL' OR "targetId" IS NOT NULL` in the current EAT day, through `hbi_staff_bot_finished_idx` and `hbi_staff_finished_idx`.

*Steps, in order; the first refusal wins*
1. **Blackout.** `blocked` → **INFO_BLACKOUT**.
2. **Share not set.** `gStaffChosenMaxCounterpartyShare` NULL → **COUNTERPARTY_CONCENTRATION** `{limit:null}`. N1 §6's unset-limits refusal normally catches it first; this step fails closed.
3. **Empty market.** `raw` YES = `raw` NO = 0 → condition **OPENER**, side = `openerSide`, base = `openerStakeTzs`. Skip to step 8.
4. **Thin side.** Exactly one side S with `raw(S) < locked(opposite S)` → condition **THIN**, side S, base = `min(thinStakeTzs, locked(opposite S) − raw(S))`.
   - **There is never a tie.** `locked(X) ≤ nonHouse(X) ≤ raw(X)` on each side. If both sides qualified: `raw(YES) < locked(NO) ≤ raw(NO) < locked(YES) ≤ raw(YES)`, which is a contradiction.
   - **Worked example (UX-15; the fixtures use it).**
     - Players A, B and C each lock YES 4,000, so locked YES is 12,000. Raw NO is 3,000. There is no house money.
     - Side NO, because raw NO 3,000 < locked YES 12,000. Base = min(10,000, 9,000) = 9,000.
     - The top account holds 33.3%, which passes a 50% share limit. Each account is attributed 3,000.
5. **No room.**
   - **HOUSE_ONLY:** `nonHouse` YES = `nonHouse` NO = 0.
   - **ONLY_SELLABLE:** `locked` YES = `locked` NO = 0 and eligible `unlocked` > 0. Carries `retryAt = earliestLockAt`.
   - **BALANCED:** every other case. Carries `retryAt = earliestLockAt` when eligible unlocked money exists. When only ineligible accounts hold money, the result is BALANCED with locked 0 · 0, and `excluded` shows why.
6. **Own position.**
   - The bot's open house side ≠ S → **OWN_OTHER_SIDE** `{held, now}`.
   - PER_MARKET_COUNT is not checked here: `marketHeld` checks it first (N1 §4.4; N1 §6 refusal 15d).
7. **Concentration (THIN only; INT-02).** `top.lockedTzs × 100 > share × locked(opposite S)` → **COUNTERPARTY_CONCENTRATION** `{pct, limit}`.
8. **Clamp.** `stakeTzs` = the minimum of the terms below, floored to Shaping round-to. `binding` names the smallest term. Jitter is never applied: the preview is deterministic and the amount can't be re-rolled.

| Term | Binding name |
|---|---|
| base (step 3 or 4) | `room` (THIN) or `openerStake` |
| `stakeMaxTzs` | `stakeMax` |
| `bounds.max` | `platformMax` |
| `capPerMarketTzs − botOnMarket` | `perMarket` |
| `gCapPerMarketTzs − houseOnMarket` | `globalPerMarket` |
| `capStaffChosenDailyTzs − staffChosenTzsToday` | `staffChosenDaily` |
| `gCapStaffChosenDailyTzs − globalStaffChosenTzsToday` | `globalStaffChosenDaily` |
| `capDailyStakeTzs − stakedToday` | `dailyStake` |
| `gCapDailyStakeTzs − globalStakedToday` | `globalDailyStake` |
| `capDailyLossTzs − projectedLossToday` | `dailyLoss` |
| `gCapDailyLossTzs − globalProjectedLossToday` | `globalDailyLoss` |
| `capOpenExposureTzs − openExposure` | `exposure` |
| `gCapOpenExposureTzs − globalExposure` | `globalExposure` |
| `balance − balanceFloorTzs` | `balance` |
| THIN, per attributed account a: `floor((gCounterPerPlayerTzsPerDay − attributedTzsToday(a)) × locked(opposite S) / a.lockedTzs)` | `counterpartyTzs` |

9. **Minimum.** Result < `max(stakeMinTzs, bounds.min)` → **STAKE_BELOW_MIN** `{room, binding, min}`.
10. **Counts** (codes as N1 §6 refusal 18).
   - Bot staff-chosen count today ≥ `capStaffChosenPerDay`, or NULL → **STAFF_CHOSEN_PER_DAY**.
   - Platform staff-chosen count today ≥ `gCapStaffChosenPerDay`, or NULL → **GLOBAL_STAFF_CHOSEN**.
   - THIN only: any attributed account's counters today ≥ `gCounterPerPlayerPerDay` → **COUNTERPARTY_LIMIT**.
11. **Rate facts (not a refusal).**
    - `possibleAt` = the moment MIN_GAP, PER_HOUR, PER_DAY and GLOBAL_BETS_PER_MINUTE all free, or null when free now.
    - `possibleCode` names the one that binds last.
    - N1 §6's caps pre-check and the preview line "Next possible {HH:MM:SS} EAT (minimum gap {g} s)" (UX-08) read these. Fire defers on them (4.3 step 6).

*Order and output*
- **Order.** The step order is for the officer's clarity. When a stake reaches the seam, H2–H4's declared order (N1 §3) decides the recorded code.
- **Output.**
  - `{ok:true, entryCondition, side, stakeTzs, binding, possibleAt, possibleCode, decision}`, or
  - `{ok:false, code, facts, retryAt?}`. `facts` carries `side` and `entryCondition` whenever steps 3–4 set them, so N1 §6 can check refusal 17 (preview mismatch) before refusal 18 (counts).

*`decision` JSON (stored on the intent; aggregates and handles only)*
- `{entry:'MANUAL', condition, side, rawYes, rawNo, nonHouseYes, nonHouseNo, lockedYes, lockedNo, unlockedYes, unlockedNo, excludedYes, excludedNo, earliestLockAt, lockMarginMs:7000, baseStake, binding, confirmedStakeTzs, lockedByTopAccountPct, topCounterpartyHandle, attributedAccounts, openerDraw?{side, drawnFor, drawnAt}, snapshot{titleEn, category, cutoff}, blackout:false, counterparties?}`.
- `lockedByTopAccountPct` has one decimal place.
- `topCounterpartyHandle` is `playerHandle(userId)` ("Player #A3F2K8", R6), and null for OPENER. No name or phone ever enters `decision` or `why`. The only user ids are `decision.counterparties[].userId`, written by `markPlaced` for MANUAL THIN (N1 §3 H4); they are never rendered and never exported.
- `attributedAccounts` is the number of accounts at or above 25%.
- Fire adds `firedStakeTzs` (4.3 step 6).
- `why` example: "Enter now · thinner side NO (players' locked YES 12,000 · raw NO 3,000) · stake 10,000 cut to 9,000 (room)".

**4.3 Execution: the press record, inline claim-and-fire, poller fallback (exactly once)**

*Press record for Enter now (N1 §2; replaces 04 C4's AlertOnce submit claim)*

| State | Written by | Condition | Meaning |
|---|---|---|---|
| CHECKING | step 2 insert | new `(actorId, submitId)` | the refusal checks are running |
| REFUSED + `code` | step 3, step 4 unique violation, or the 4.5 INTERRUPTED pass | `WHERE id=$1 AND state='CHECKING'` | nothing was queued |
| QUEUED + `intentId` | step 4 transaction | `WHERE id=$1 AND state='CHECKING'` | one MANUAL intent exists |
| DONE | fire (step 7) or the 4.5 press pass | `WHERE id=$1 AND state='QUEUED'` and the intent is terminal | final |

- **The row.**
  - Every refused press is a durable row with its code (INT-08). No throttle is needed: presses are human clicks.
  - The officer's `reason` is stored on the press row and in the event `reason` column, never in a payload (INT-10).
  - Target and staff-cancel presses are inserted CHECKING before their locks; their move to DONE is inside the write transaction (N2 §6, N1 §6).

*Steps*
1. **Guard and input.** `requireHouseOwner` first. Reason 5–300 code points (C2). Id formats; `submitId ~ '^[0-9a-f-]{36}$'`.
2. **Press insert** (autocommit): `INSERT "HouseBotPress" (id 'hbp_…', actorId, submitId, purpose 'ENTER_NOW', houseBotId, marketId, state 'CHECKING', reason)`.
   - On a 23505 whose `uniqueViolation(err)` is `hbp_actor_submit_uq`, read the existing row:
     - purpose, `houseBotId` or `marketId` differ → refusal **SUBMIT_ID_REUSED** "This request id was already used for a different action. Reload and try again.";
     - CHECKING → return state CHECKING, "Still checking this press…";
     - REFUSED → return the stored refusal with its code's copy;
     - QUEUED or DONE → return the intent's live status with `duplicate:true`.
   - Any other unique violation is rethrown, never swallowed (MON-12).
3. **Refusal checks** (N1 §6 list and copy). Each refusal runs `UPDATE "HouseBotPress" SET state='REFUSED', code=$code, "updatedAt"=now() WHERE id=$1 AND state='CHECKING'`. On 0 rows, return the row's current state.
4. **Queue transaction.** One transaction, never inside a lock:
   - `INSERT "HouseBotIntent"`: kind MANUAL, `requestedById`=actor, `entryCondition`, side and `stakeTzs` from `enterNowDecision`, `anchorKey='manual:<actorId>:<submitId>'`, `productLine='MARKET'`, `dueAt=now()`, `staleAt=now()+15 s`, `deadlineAt = cutoff − minTimeToCutoff`, status PENDING, `decision`, `why`;
   - `INSERT "HouseBotEvent"` kind `ENTER_NOW_REQUESTED`: `houseBotId`, `marketId`, `actorId`, `reason` column, payload `{intentId, pressId}`;
   - `UPDATE "HouseBotPress" SET state='QUEUED', "intentId"=$i WHERE id=$1 AND state='CHECKING'`. On 0 rows, roll back and return the row's current state.
   - **Unique violations**, after rollback:
     - `hbi_manual_live_market_uq` → the press becomes REFUSED with N1 §6's live-Enter-now code ("Another Enter now on this market is being placed. Wait for its result.");
     - `hbi_manual_anchor_uq` → read the press and answer as step 2;
     - anything else → rethrow.
5. **Inline claim**, after the commit, from the admin request.
   - **Skip the claim and leave the row PENDING for any healthy poller when:**
     - this process's engine is not started;
     - its A24 skew guard has stopped claims;
     - A24's admission rule forbids claims;
     - or `globalThis.__50PICK_HOUSE_BOT_ENGINE.inFlight` already holds 2.
   - Claim by id:
     ```sql
     UPDATE "HouseBotIntent" SET status='CLAIMED', "claimedBy"=$me,
            "claimedUntil"=now()+interval '180 seconds', attempts=attempts+1
     WHERE id=$1 AND status='PENDING' AND "staleAt">now() AND "deadlineAt">now() AND attempts<3
     RETURNING *;
     ```
     There is no skew term: `dueAt` is the database's own `now()`, and nothing is held against a trigger.
   - 0 rows → the poller owns the row.
6. **`fire.ts fireClaimedIntent(row)`**, the same function the poller calls.
   - **Preconditions (MON-13).**
     - It throws when called inside a lock context (`locks.ts`) or with an ambient admission slot (`admission.ts`).
     - It registers the intent in `globalThis.__50PICK_HOUSE_BOT_ENGINE.inFlight`, which counts toward `$freeSlots`, is excluded from the SIGTERM requeue, and gets the 30 s heartbeat.
   - **F5 fresh re-checks for MANUAL, in order.** Outcomes are unchanged from F5 unless stated.
     - master;
     - maintenance via `loadConfigResult` (F7);
     - bot ACTIVE;
     - holder causes and `consentValid` via `control.ts`;
     - market LIVE, with deadline = min(stored, fresh cutoff − minTimeToCutoff) (A16);
     - A12 `inScope`, `productLine='MARKET'`, polls product and the categories list;
     - `marketHeld` (N1 §4.4), ignoring the row being fired;
     - `loadEnterNowInput`, then `enterNowDecision`. The schedule is not checked (W8).
   - **Decision results at fire, without taking a lock:**
     - condition or side differs from the row, or HOUSE_ONLY, ONLY_SELLABLE or BALANCED → SKIPPED(CONDITION_GONE). The side is never re-chosen.
     - INFO_BLACKOUT → SKIPPED(INFO_BLACKOUT).
     - OWN_OTHER_SIDE → SKIPPED(CAP_OPPOSITE_SIDE).
     - `marketHeld` → SKIPPED(MARKET_HELD), except PER_MARKET_COUNT → SKIPPED(CAP_PER_MARKET_COUNT).
     - COUNTERPARTY_CONCENTRATION → SKIPPED(COUNTERPARTY_CONCENTRATION).
     - STAFF_CHOSEN_PER_DAY → SKIPPED(CAP_STAFF_CHOSEN_PER_DAY); GLOBAL_STAFF_CHOSEN → SKIPPED(CAP_GLOBAL_STAFF_CHOSEN_PER_DAY); COUNTERPARTY_LIMIT → SKIPPED(CAP_COUNTERPARTY_COUNT).
     - STAKE_BELOW_MIN → SKIPPED(STAKE_BOUNDS_CHANGED).
     - `possibleAt` before `staleAt` → a deferral requeue: PENDING, `nextAttemptAt=possibleAt`, `attempts=attempts−1`. A deferral is neither a failure nor transient.
     - `possibleAt` at or after `staleAt` → SKIPPED(CAP_<possibleCode>).
   - **Write-back clamp, for every kind (MON-02).** In `fire.ts`, after the F5 step-9 clamp (for MANUAL, the re-run decision's `stakeTzs`), `clamped = min(row.stakeTzs, recomputed)`. If `clamped < row.stakeTzs`:
     ```sql
     UPDATE "HouseBotIntent" SET "stakeTzs"=$c,
            decision = decision || jsonb_build_object('firedStakeTzs', $c)
     WHERE id=$1 AND status='CLAIMED' AND "claimedBy"=$me AND "stakeTzs">$c
     RETURNING *;
     ```
     - 0 rows → stop; someone else owns the row.
     - Otherwise call `placeHouseBet` with the returned row's `marketId`, `side` and `stakeTzs`.
     - A stake never grows. Below the minimum → SKIPPED(STAKE_BOUNDS_CHANGED) without calling the seam.
     - PLAN F5 step 9 and N2 §4's amount step cite this rule.
   - **The bet.** `placeHouseBet` with admission `maxWaitMs:0` (A24). H0 never filters on status (N1 §3), so a row cancelled mid-fire ends as `house_intent_superseded`, never `house_key_mismatch`.
7. **After the outcome.**
   - The mapper (4.6) writes the result.
   - A terminal MANUAL outcome runs `UPDATE "HouseBotPress" SET state='DONE' WHERE "intentId"=$1 AND state='QUEUED'`.
   - A PLACED row takes the A8 `alertedAt` claim, then `notifyAdminsHouseBotStaffChosen` (N1 §7).
8. **Wait bound.**
   - The action awaits the inline fire for at most 10 s, then answers with the status read from the database (press plus intent), as `getEnterNowStatusAction` does.
   - The fire carries on in-process; the claim lasts 180 s (A10 pin).
   - The modal's final status always comes from `getEnterNowStatusAction`, never from the inline return value.
9. **Audit, through a lease on the press row** (N1 §2 press flow step 6, MON-11). Runs after steps 6–8, outside every lock:
   ```sql
   UPDATE "HouseBotPress" SET "auditClaimUntil"=now()+interval '5 minutes'
   WHERE id=$1 AND "auditId" IS NULL
     AND ("auditClaimUntil" IS NULL OR "auditClaimUntil"<now())
   RETURNING *;
   ```
   - Append the audit only when a row returns, then set `auditId`.
   - QUEUED and DONE presses write COMPLIANCE `house_bot.enter_now` `{botId, holderUserId, marketId, intentId, side, stakeTzs, entryCondition, outcome, reason}`. `outcome` is the intent status at write time.
   - REFUSED presses with code INFO_BLACKOUT or OWNER_POSITION write COMPLIANCE `house_bot.enter_now_refused` `{botId, marketId, code}`.
   - Other refused presses write no audit; the press row is their record. The planner repair is in 4.5.

*Claim SQL for the poller (PLAN §4.5, replaced)*
```sql
UPDATE "HouseBotIntent" SET status='CLAIMED', "claimedBy"=$me,
       "claimedUntil"=now()+interval '180 seconds', attempts=attempts+1
WHERE id IN (SELECT id FROM "HouseBotIntent"
  WHERE ((status='PENDING' AND "dueAt" <= now() - $skewGuard
          AND coalesce("nextAttemptAt", now()) <= now())
      OR (status='CLAIMED' AND "claimedUntil" < now()))
    AND "deadlineAt" > now()
    AND "staleAt" > now()
    AND attempts < 3
  ORDER BY "dueAt" LIMIT $freeSlots FOR UPDATE SKIP LOCKED)
RETURNING *;
```
- `$skewGuard` = `max(0, skew) + 2 s` (A24).
- `$freeSlots` = 2 − `inFlight`, which counts poller and inline fires alike.
- `"staleAt" > now()` replaces A24's `"dueAt" > now() − maxLateness`.
- A24's rate-cap deferral becomes "the window frees before `staleAt`".

*Where `staleAt` binds*
- **At claim:** the SQL above.
- **In the seam (MON-03).** Inside `house:control`, before `markPlaced`, the claimed row is re-read. `NOT ("staleAt" > clock_timestamp())` on the database clock (never `now()`, which is frozen at the wallet-lock transaction's start) → `house_intent_stale` → EXPIRED(STALE) (N1 §3). A claim can outlive `staleAt`, but a stake never lands after it.
- **In the planner:** the early STALE expiry (pass order below), which frees `hbi_manual_live_market_uq` within one pass of `staleAt + 5 s`.

*Transient requeue (MON-10)*
- **Applies to:** BUSY, `rate_limited`, `house_gate_unreadable`, 55P03 and any thrown `isEngineTransient`.
- **The requeue:**
  ```sql
  UPDATE "HouseBotIntent" SET status='PENDING', "claimedBy"=NULL, "claimedUntil"=NULL,
         attempts=attempts-1, "transientAttempts"="transientAttempts"+1,
         "nextAttemptAt"=least(now()+$backoff, "staleAt"-interval '1 second')
  WHERE id=$1 AND status='CLAIMED' AND "claimedBy"=$me
    AND "staleAt"-interval '1 second' > now() AND "deadlineAt" > now()
  RETURNING id;
  ```
  - `attempts` counts only non-transient outcomes. The claim's `attempts<3` filter is unchanged.
  - `$backoff` stays 1 s, 5 s, 15 s, 45 s (PLAN §4.6), indexed by `transientAttempts`.
- **When the requeue returns 0 rows** and the row is still `CLAIMED` by `$me`, it is written terminal:
  - EXPIRED(STALE) when `staleAt` is the nearer bound;
  - otherwise EXPIRED(BUSY_TIMEOUT) (PLAN §4.6).
- **Enter now example.** A 15 s MANUAL row under saturation is tried at +0, +1, +6 and +14 s, then expires. The modal shows "Retrying" only while `nextAttemptAt < staleAt`.

*Double press*
- **Same `submitId`, sent twice or concurrently.** `hbp_actor_submit_uq` gives one press row. The second request gets CHECKING, the stored refusal, or the intent status with `duplicate:true`. The result is 1 intent, 1 event, 1 audit and at most 1 position. The client rules are in N1 §2 press flow step 8 and N1 §8.
- **Two `submitId`s, same bot and market** (two tabs).
  - While the first intent is PENDING or CLAIMED, `hbi_manual_live_market_uq` refuses the second at step 4.
  - After the first is terminal, the second is judged afresh: MIN_GAP, PER_MARKET_COUNT, OPPOSITE_SIDE and the staff-chosen caps apply in 4.2 and in H2.
- **Two bots on one market.** `hbi_manual_live_market_uq` refuses while one is live. At money level H3 OTHER_BOT refuses.

*Concurrency with automatic intents (I3)*
- **Other bots.** A PENDING or CLAIMED MANUAL row is a live intent. Other bots' decisions on that poll, including target candidates, → MARKET_HELD.
- **Same bot.** A live COUNTER, FILL or OPENER of the same bot on the poll → the press is refused (N1 §6 holding refusal).
- **Same millisecond.** A COUNTER inserted in the same millisecond is harmless: H2 OPPOSITE_SIDE, PER_MARKET_COUNT and the caps apply in the declared order (N1 §3 H2).
- **Openers agree.** OPENER planning after a MANUAL opener sees non-zero pools and plans nothing. Before that, both read the one drawn side (4.1).

*Master OFF mid-flight (A9)*
- **OFF written first.** Autocommit OFF lands first. A bet not yet holding `house:control` gets `house_disabled` at H4's re-read → CANCELLED(MASTER_OFF).
- **Cancel pass.** A9's conditional cancel of PENDING and CLAIMED rows makes a later `markPlaced` return 0 rows → `house_intent_superseded` before any money. H0 has no status filter, so this never raises SECURITY or changes `offCause`.
- **In its final step.** A bet already holding `house:control` completes.
- **Modal copy** (N1 §8 renders it):
  - "Cancelled — house bots were switched off. Nothing moved."
  - "Placed — it was already in its final step when house bots were switched off."

*Replicas and crash (A24, F7)*

| Moment | Result |
|---|---|
| Crash after the press insert, before step 4 commits | Press stays CHECKING. The 4.5 INTERRUPTED pass ends it after 120 s. Step 4's conditional press update makes that race-free. |
| Crash after step 4, before the inline claim | PENDING row. Any healthy poller claims it before `staleAt`, or the planner writes EXPIRED(STALE). |
| Crash inside the locks | Rollback. The CLAIMED row becomes EXPIRED(STALE) once `staleAt + 5 s < now()`, without waiting for `claimedUntil`. 0 positions. |
| Crash after commit | PLACED (`markPlaced` is in the same transaction). A8 repairs the alert. The 4.5 press pass sets DONE. The lease repair writes the audit once. |
| SIGTERM during an inline fire | The intent is in `inFlight`, so it is not requeued. The in-flight bet finishes. At most 1 position. |
| Inline fire on container A, poller on container B | B cannot claim a live claim. At most 1 position. |

*Planner pass order (every 15 s under `acquireLeadership("house-bot")`; every effect conditional with RETURNING)*
1. **Deadline:** rows past `deadlineAt` → EXPIRED(CUTOFF), unchanged.
2. **STALE, before POISON:**
   - PENDING with `staleAt <= now()` → EXPIRED(STALE);
   - CLAIMED with `(kind='MANUAL' OR "targetId" IS NOT NULL)` and `"staleAt" + interval '5 seconds' < now()` → EXPIRED(STALE), whatever `claimedUntil` says;
   - CLAIMED of other kinds with `claimedUntil < now()` and `staleAt <= now()` → EXPIRED(STALE).
3. **POISON:** CLAIMED with `claimedUntil < now()` and `attempts >= 3` → FAILED(POISON) plus AlertOnce (A10). Transient outcomes never reach this, because they don't count.
4. **Press passes** (4.5).
5. **Audit lease repair** (4.5).
6. **A8 alert repair** (4.5).
7. **`endTargets`** (N2 §4).
8. **Once a minute:** the oversight passes (4.5).
9. **Hourly:** the existing summaries; ~~on the first EAT day of a month only, staff edge (4.5)~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no staff-edge pass (C5-SPEC rulings 218–223).

**4.4 Scope for Enter now (polls only)**
- **Product.** Only raw `productLine='MARKET'` (A12, F1 `HOUSE_PRODUCT_POLICY`). The HouseBotIntent CHECK `(kind<>'MANUAL' OR "productLine"='MARKET')` makes an Up & Down Enter now unstorable.
  - The picker lists polls only.
  - A posted Up & Down market id is refused before the press reaches step 4: "Enter now is for polls only. Up & Down entries are automatic." (N1 §6).
- **A12 `inScope`.** Not demo, binary YES/NO, non-null `selectionClosedAt`.
- **Bot scope.** The bot's polls product is on and the poll's category is in its `categories` list (C14).
- **Lifecycle (A16).** Market LIVE; now < `cutoff − minTimeToCutoff`. A reopened poll is blacked out (`reopenedAt`, 4.1). A16's MARKET_REOPENED detection reads `reopenedAt` for every mode (N1 §2).
- **Blackout.** `infoBlackout` (4.1).
- **Holding.** `marketHeld(botId, marketId)` in `enter-now.ts` is one predicate for picker, preview, press and fire:
  - held by another bot: that bot's OPEN house position, PENDING or CLAIMED intent, or ACTIVE target (`hbt_active_market_uq`);
  - held by this bot: its own PENDING or CLAIMED intent of any kind;
  - owner position: the holder's own OPEN non-house position;
  - count: this bot's OPEN house positions here ≥ `freqMaxPerMarket` (PER_MARKET_COUNT).
- **Master and bot** are read fresh (I5). A11 `scopeFrom` does not apply: an Enter now is not trigger-based.
- **Ignored (W8 verbatim):** "Enter now ignores the schedule, pool band and closing-soon skip; targets obey the schedule and ignore the pool band and closing-soon skip". Enter now also ignores react probability, trigger stake range, no-react zone and the COUNTER delay.
- **Obeyed:** `minTimeToCutoff`, every H-step, and every cap in 4.2.

**4.5 Records repaired by the planner**
- **Press INTERRUPTED.**
  - `UPDATE "HouseBotPress" SET state='REFUSED', code='INTERRUPTED', "updatedAt"=now() WHERE state='CHECKING' AND "createdAt" < now() − interval '120 seconds' RETURNING` (any purpose).
  - Copy (N1 §8 status mapping): "This press was interrupted before anything was saved. Nothing moved. You can try again."
  - No audit. Step 4's conditional update, and the conditional move to DONE in target and cancel transactions, guarantee a late request cannot write after this.
- **Press DONE.** QUEUED presses whose intent is terminal → DONE. This covers master OFF, auto-pause, staff cancels, expiry and crashes. Uses `(state, createdAt)`.
- **Audit lease repair (N1 §2 press flow step 6).**
  - Scope: presses older than 60 s with `auditId IS NULL` and the lease null or expired, as N1 §2 step 6 lists: ENTER_NOW presses QUEUED or DONE, or REFUSED with code INFO_BLACKOUT or OWNER_POSITION; target and staff-cancel presses DONE with an event carrying their `pressId`.
  - Each gets the 4.3 step 9 lease, then its audit (`house_bot.enter_now`, `house_bot.enter_now_refused` for those two codes, or the target or staff-cancel audit rebuilt from its event).
  - A repair killed after its lease is retried once the lease expires. Exactly one row results.
- **A8 alert repair.**
  - Covers PLACED MANUAL rows and PLACED rows with `targetId`. It routes them to `notifyAdminsHouseBotStaffChosen`: every `houseBotAlertRecipients()`, bell + email, uncapped, not counted in `countInHour` (N1 §7).
  - `notifyAdminsHouseBotBet` excludes staff-chosen rows. ~~Holder notices are unchanged.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there are no holder notices (C4 ruling 149).
- **Staff stake voided** (`oversight.ts`, once a minute).
  - Scope: markets holding a PLACED staff-chosen stake with `finishedAt` in the last 30 days (`hbi_staff_finished_idx`).
  - Trigger: market status `VOIDED`, or `reopenedAt` later than that stake's `finishedAt`.
  - AlertOnce `staff-stake-voided:<marketId>`. Copy and href in N1 §7; ~~R1 row in N1 §9~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no R1 row (C5-SPEC rulings 202, 206); the alert stands.
- **Staff stake self-decided** (`oversight.ts`, once a minute; INT-06).
  - **Reads:** `AuditLog` rows from the last 30 days for those markets, through `@@index([targetType, targetId])`. Actions: `market.adjudicated`, `market.resolve.bulk`, `market.resolve.bulk_override`, `market.emergency_void`, `market.reopened`, `objection.upheld`, `objection.rejected`.
    - Every action names its market in `targetId` (targetType 'Market'), except `market.resolve.bulk` (targetType 'Batch'), whose markets are read from its payload.
  - **`requestedBy`:**
    - for MANUAL, the intent's `requestedById`;
    - for targeted rows, the target's `createdById`;
    - over staff-chosen stakes PLACED before the audit row.
  - **Alert:** when the audit's `actorId` is in `requestedBy`, AlertOnce `staff-stake-self-decided:<marketId>:<action>`, where `<action>` is `resolved`, `voided`, `reopened`, `objection_upheld` or `objection_rejected`.
  - **Display, audit and alert only,** never a refusal (2026-07-24 guardrail; I10).
  - **Known gap:** `market.reopened` is not awaited (`:4027`). If that row is lost, the reopen is still caught by the voided pass through `reopenedAt`, but cannot be attributed.
- ~~**Staff edge** (`oversight.ts`, hourly during the first EAT day of each month only; INT-07).~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge alert and R1's scorecard flag are struck and never built (C5-SPEC rulings 218–223; TGT-39); nothing in this item stands.
  - ~~**Scope:** per officer, staff-chosen stakes placed in the EAT month just ended and settled by evaluation time, so the 30-day AlertOnce purge can never let it fire twice.~~
  - ~~**Counts:** settled = won + lost + refunded; win rate = won / (won + lost); net = payouts + refunds − stakes. These come from `book.ts`, the same function as R1's scorecard (N1 §9), so the two tie.~~
  - ~~**Baseline:** the automated rate over PLACED untargeted COUNTER, FILL and OPENER rows on polls in the same month.~~
  - ~~**Fires** AlertOnce `staff-edge:<officerId>:<YYYY-MM>` when settled ≥ 10 AND either:~~
    - ~~`gStaffEdgeWinRatePts` is set, the baseline has at least one won or lost stake, and the officer's rate − the baseline rate ≥ `gStaffEdgeWinRatePts` points; or~~
    - ~~`gStaffEdgeNetTzs` is set and net ≥ `gStaffEdgeNetTzs`.~~
  - ~~With both thresholds NULL, the pass does nothing.~~
- **Consent void.** Ending every ACTIVE target when `consentVoidAt` is written happens in the same `wallet:<botUser>` transaction, not in the planner. See N2 §4 step 10.

**4.6 Mapper rows and EngineCodes (A10 `satisfies` table; `feed-copy.ts` Record)**

*New EngineCodes*
- INFO_BLACKOUT
- STALE (A24's code, now also reached through `house_intent_stale`)
- TARGET_REMOVED
- TARGET_ENDED
- CAP_STAFF_CHOSEN_PER_DAY
- CAP_STAFF_CHOSEN_DAILY_STAKE
- CAP_GLOBAL_STAFF_CHOSEN_PER_DAY
- CAP_GLOBAL_STAFF_CHOSEN_DAILY_STAKE
- CAP_TARGET_ONCE
- CAP_OPPOSITE_SIDE
- COUNTERPARTY_CONCENTRATION

Every one gets a `feed-copy.ts` sentence, typed `satisfies Record<…, string>`. The wording lives in the N1 §8 and N2 §8 lexicon tables. `house_intent_stale` and `house_counterparty_concentration` join `BET_PATH_REASONS` with `GATE_PARITY {exempt: 'house context only'}` (N1 §3).

*Seam results*

| Result | Intent | Alert |
|---|---|---|
| ok | PLACED by `markPlaced`; press → DONE | A8 claim, then `notifyAdminsHouseBotStaffChosen` for MANUAL and targeted rows, `notifyAdminsHouseBotBet` for the rest; ~~holder notice unchanged~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no holder notice (C4 ruling 149). |
| `house_intent_superseded` | no-op (the row is already terminal) | none |
| `house_intent_stale` | EXPIRED(STALE) | none |
| `house_info_blackout` | SKIPPED(INFO_BLACKOUT) | none |
| `house_counterparty_concentration` | SKIPPED(COUNTERPARTY_CONCENTRATION) | none |
| `house_condition_gone` | SKIPPED(CONDITION_GONE); a MANUAL `why` names the current locked pools | none |
| `house_market_conflict{OPPOSITE_SIDE}` | SKIPPED(CAP_OPPOSITE_SIDE), every kind (N1 §4.2) | none |
| `house_market_conflict{OWNER_POSITION \| OTHER_BOT \| TRIGGER_BOTH_SIDES}` | SKIPPED(MARKET_HELD), unchanged | none |
| `house_cap_reached{STAFF_CHOSEN_PER_DAY \| STAFF_CHOSEN_DAILY_STAKE \| GLOBAL_STAFF_CHOSEN_PER_DAY \| GLOBAL_STAFF_CHOSEN_DAILY_STAKE}` | SKIPPED(CAP_ with the same suffix) | none |
| `house_cap_reached{TARGET_ONCE}` | SKIPPED(CAP_TARGET_ONCE); the target is handled in N2 §4 | none |
| `house_cap_reached{MIN_GAP \| PER_HOUR \| PER_DAY \| GLOBAL_BETS_PER_MINUTE}` | a deferral requeue to the window's end when that is before `staleAt` and no terminal cap applies (N1 §3 H2); else SKIPPED(CAP_<code>) | none |
| `house_cap_reached{PER_MARKET_COUNT}` and every money cap | SKIPPED(CAP_<code>) | none |
| BUSY, `rate_limited`, `house_gate_unreadable`, 55P03, thrown `isEngineTransient` | transient requeue (4.3) | unchanged "holder contention" rule |
| consent, RG, role, wallet and loss-limit reasons | AUTO_PAUSED exactly as PLAN §4.6 and A10, for MANUAL and targeted rows too; modal "Not placed — Bot A auto-paused: {cause}." | unchanged |
| `balance_insufficient` / `house_cash_only` | SKIPPED + AlertOnce per bot per day, unchanged | unchanged |
| `house_key_mismatch` | FAILED + SECURITY alert + master OFF(ENGINE_FAULT), unchanged; with H0's ordered rule a non-CLAIMED row never produces it | SECURITY |
| unknown reason | FAILED(UNMAPPED) + AUTO_PAUSED(UNMAPPED_REFUSAL) (A10) | one |
| thrown non-transient | FAILED(INTERNAL); `errorStreak` counts MANUAL and targeted throws like any other | unchanged |

*Outcomes written by fire without calling the seam*
- MANUAL: the decision results in 4.3 step 6.
- Targeted rows (N2 §4):
  - target REMOVED → CANCELLED(TARGET_REMOVED);
  - target ENDED with `endCause` VETOED, CONSENT_VOID, BOT_REMOVED or SUNSET → CANCELLED(TARGET_ENDED); ENDED with any other cause → the fire continues, and its market, scope, blackout and deadline checks and H2 TARGET_ONCE decide;
  - FIRST with a PLACED sibling → SKIPPED(CAP_TARGET_ONCE);
  - blackout → SKIPPED(INFO_BLACKOUT).
- A stake below the minimum after the write-back clamp → SKIPPED(STAKE_BOUNDS_CHANGED), no alert (A7).

#### N1 §5 Rules and limits (commit 1 `rules.ts`; form in commit 7)

*Evidence:*
- 02 §3.8 refuses clearing any limit while house bots are on ("Can't clear a limit while bots are on. Switch off first.", `02-sealed-flows.md` §3.8). C1 refuses clearing a cap on an ACTIVE bot (`04-amendments.md:741-743`). Neither may block turning Enter now or targets off (D13; MON-14).
- 02 §3.3 item 6 refuses Start with "Turn on at least one entry mode." (`02-sealed-flows.md:318`).
- F5 pauses a bot only when it can no longer place any bet (`04-amendments.md:1701-1703`).

*Fields.* Every number field is C1's `HouseNumberField`. Parse errors use C1's copy; hints name the cap window (C14).

| Where | Field | Default | Bounds (C1 parser) | Copy |
|---|---|---|---|---|
| rules JSON | `enterNow.enabled` | false | Toggle | Label "Enter now". Hint "Polls only. You choose the poll; 50pick works out the side and the amount." |
| rules JSON | `enterNow.thinStakeTzs` | null | whole TZS, `prefix="TZS"`; within the live bounds via A7 (p)/F5; `stakeMinTzs ≤ x ≤ stakeMaxTzs` | "Enter now stake must be between Bot A's stake min TZS {min} and max TZS {max}." Hint "Used when players' locked money leaves one side thinner. Cut to fit." |
| rules JSON | `enterNow.openerStakeTzs` | null | same | Same error. Hint "Used on a poll with no stakes yet. The side is drawn once for that poll." |
| HouseBot | `capStaffChosenPerDay` | NULL | 1–50; ≤ `freqMaxPerDay`; ≤ `gCapStaffChosenPerDay` when set | "Between 1 and 50." · "Can't exceed bets per day ({n})." · "Staff-chosen stakes per day {x} is above the global limit {g}." (C6 "Use {g}" button). Hint "Enter now stakes and target reactions placed this EAT day. Not set — Enter now and targets can't bet." |
| HouseBot | `capStaffChosenDailyTzs` | NULL | 0–1,000,000,000, `prefix="TZS"`; ≤ `capDailyStakeTzs`; ≥ each set Enter now stake while `enterNow.enabled`; ≤ `gCapStaffChosenDailyTzs` when set | "At most TZS 1,000,000,000." · "Staff-chosen daily cap can't exceed the daily stake cap." · "Staff-chosen daily cap must be at least the Enter now stakes (TZS {x})." · "Per-bot staff-chosen cap TZS {x} is above the global staff-chosen cap TZS {g}." (C6 "Use TZS {g}" button). Hint as above, in TZS. |
| HouseBot | `targetsMaxActive` | NULL | 1–50; ≤ `gTargetsMaxActive` when set | "Between 1 and 50." Hint "Not set — no target can be added." Target semantics in N2 §5. |
| Control | `gCapStaffChosenPerDay` | NULL | 1–200 | "Between 1 and 200." Hint "All bots together, this EAT day. Not set = Enter now and targets are off for every bot. Not needed to switch house bots on." |
| Control | `gCapStaffChosenDailyTzs` | NULL | 0–1,000,000,000, `prefix="TZS"`; ≤ `gCapDailyStakeTzs` | "At most TZS 1,000,000,000." · "Staff-chosen daily limit can't exceed the global daily stake limit." Same hint. |
| Control | `gTargetsMaxActive` | NULL | 1–200 | "Between 1 and 200." Hint "Not set = no target can be added for any bot. Not needed to switch house bots on." (N2 §5) |
| Control | `gStaffChosenMaxCounterpartyShare` | NULL | whole %, 10–100, `trailing="%"` | "Between 10 and 100." Hint "Enter now refuses when one player holds more than this share of the players' locked money it would add to. Not set = Enter now is off for every bot." |
| Control | `gStaffEdgeWinRatePts` | NULL | whole points, 1–100, `trailing="pts"` (C1's trailing units gain "pts") | "Between 1 and 100." Hint "Alert when an officer's staff-chosen win rate beats the automated bots' by at least this many points in a month (10 or more settled stakes). Not set = this alert is off." |
| Control | `gStaffEdgeNetTzs` | NULL | 0–1,000,000,000, `prefix="TZS"` | "At most TZS 1,000,000,000." Hint "Alert when an officer's staff-chosen stakes net at least this much in a month (10 or more settled stakes). Not set = this alert is off." |

⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge alert that `gStaffEdgeWinRatePts` and `gStaffEdgeNetTzs` switch is struck (C5-SPEC rulings 218–223), so their two hints describe an alert that is never built. The two columns and their `rules.ts` fields were built in Commit 1 and are not named by D20; whether the limits form still shows them is left to Commit 7's rulings.

- **Master ON.** None of the control fields above are required to switch house bots on. PLAN F3's "Set N global limits first" list and 02 §3.7's unset-limits refusal exclude them (N1 §2).
- **Missing JSON keys** parse to their narrowest value with no pause (N1 §2).

*`CROSS_FIELD_RULES` (C6 table `{id, fields, reportOn, message}`), add:*

| id | Rule | reportOn | Message |
|---|---|---|---|
| N1-a | `enterNow.enabled` ⇒ `thinStakeTzs`, `openerStakeTzs`, `capStaffChosenPerDay` and `capStaffChosenDailyTzs` are all set, the polls product is on, and at least one poll category is chosen | the first unset field, or the products field | "Set {field label} to use Enter now." · "Enter now is for polls: turn on polls and choose at least one category." |
| N1-b | `capStaffChosenDailyTzs ≤ capDailyStakeTzs`, and, while `enterNow.enabled`, `capStaffChosenDailyTzs ≥ max(thinStakeTzs, openerStakeTzs)` | `capStaffChosenDailyTzs` | "Staff-chosen daily cap can't exceed the daily stake cap." · "Staff-chosen daily cap must be at least the Enter now stakes (TZS {x})." |
| N1-c | Limits form: `gCapStaffChosenDailyTzs ≤ gCapDailyStakeTzs`. Rules form: `capStaffChosenPerDay ≤ gCapStaffChosenPerDay`, `capStaffChosenDailyTzs ≤ gCapStaffChosenDailyTzs` and `targetsMaxActive ≤ gTargetsMaxActive`, each where the global is set. | the per-bot field, or `gCapStaffChosenDailyTzs` | "Staff-chosen daily limit can't exceed the global daily stake limit." · "Staff-chosen stakes per day {x} is above the global limit {g}." · "Per-bot staff-chosen cap TZS {x} is above the global staff-chosen cap TZS {g}." · "Max active targets {x} is above the global limit {g}." |
| N1-d | `capStaffChosenPerDay ≤ freqMaxPerDay` | `capStaffChosenPerDay` | "Can't exceed bets per day ({n})." |
| N1-e | `thinStakeTzs` and `openerStakeTzs` each within `[stakeMinTzs, stakeMaxTzs]` and within the live bounds (A7 (p), F5) | the stake field | "Enter now stake must be between Bot A's stake min TZS {min} and max TZS {max}." |

- **Direction rule (C6).** Lowering a global below a bot's value is allowed through C6's consequence preview, which lists the bots in `conflicts[]`. Raising a bot above a set global is refused.
- **N2-a** (N2 §5) requires `capStaffChosenPerDay` and `capStaffChosenDailyTzs` for targets as well.

*Recommended values (button only; they fill placeholders and never save):*
- Enter now stake: thin 10,000 · opener 2,000.
- Per bot: 3 staff-chosen stakes per day · TZS 30,000.
- Global: 10 per day · TZS 100,000.
- Counterparty share: 50%.
- ~~Staff edge: 15 points · TZS 100,000.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge alert is struck (C5-SPEC rulings 218–223), so W16's default has nothing to switch.
- Against PLAN §5's recommended caps: 10,000 ≤ stake max 10,000; 2,000 ≥ stake min 1,000; 30,000 ≤ daily stake 200,000; 100,000 ≤ global daily stake 500,000; 3 ≤ per-day 200. Every N1 rule holds.

*Clearing is never blocked (MON-14)*
- **Exempt fields.** `capStaffChosenPerDay`, `capStaffChosenDailyTzs`, `targetsMaxActive`, `gCapStaffChosenPerDay`, `gCapStaffChosenDailyTzs`, `gTargetsMaxActive` and `gStaffChosenMaxCounterpartyShare` are exempt from:
  - 02 §3.8 "Can't clear a limit while bots are on"; and
  - C1's "Bot A is running — pause it before clearing {cap}".
- **Locks.**
  - The limits save already takes `house:control` briefly. The rules save takes `wallet:<botUser>` then `house:control` (C6).
  - An in-flight staff-chosen stake's H4 re-read therefore sees NULL and refuses.
  - Automated intents are untouched.
- **Consequence preview copy.** `{n}` counts PENDING and CLAIMED rows `WHERE kind='MANUAL' OR "targetId" IS NOT NULL`, for that bot or for all bots.
  - Global staff-chosen caps: "Enter now and targets will be off for every bot. {n} queued staff-chosen stakes will be skipped."
  - Per-bot staff-chosen caps: "Enter now and targets will be off for Bot A. {n} queued staff-chosen stakes will be skipped."
  - Counterparty share: "Enter now will be off for every bot. {n} queued Enter now stakes will be skipped."
  - `targetsMaxActive` and `gTargetsMaxActive`: "No target can be added until this is set. {n} active targets keep reacting — clear a staff-chosen limit to stop them betting." (N2 §5)
- ~~**Not exempt.** `gStaffEdgeWinRatePts` and `gStaffEdgeNetTzs` turn an oversight alert off when cleared, so 02 §3.8 still applies to them.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the alert these two fields switch is struck (C5-SPEC rulings 218–223), so this reason no longer holds; their clearing rule goes to Commit 7's rulings with the fields themselves.

*Start (02 §3.3)*
- **Item 6, replace.** "No mode" is true only when every automatic mode (COUNTER, FILL and OPENER, per product), `enterNow.enabled` and `targeting.enabled` are all off. The copy stays "Turn on at least one entry mode."
- **Item 4.** The unset-cap refusal never names `capStaffChosenPerDay`, `capStaffChosenDailyTzs` or `targetsMaxActive`. While Enter now or targets are on, N1-a and N2-a already require them at save. A parsed rules JSON that breaks them is RULES_INVALID (C14, F4).
- **C14 live-bound refusal** extends to both Enter now stakes and `capStaffChosenDailyTzs` while `enterNow.enabled`. Example: "Can't start: the platform minimum stake is now TZS 2,000; the Enter now opener stake is TZS 1,000." (field `enterNow.openerStakeTzs`).
- **Start dialog line** when no automatic mode is on, under the saved-rules sentence:
  - Enter now on, targets off: "Bot A has no automatic mode: it bets only when you press Enter now."
  - Enter now and targets on: "Bot A has no automatic mode: it bets only when you press Enter now or a target reacts."
  - Targets on, Enter now off: "Bot A has no automatic mode: it bets only when a target reacts."
- **Active targets.** The Start confirm also lists "Active targets: {n} →" (N2 §4 step 10; N2 §8).

*`effectiveTiming()` adds `enterNow: 'off' | {sentence}`*
- `'off'` while `enterNow.enabled` is false.
- Otherwise: "Enter now (polls only) places within a few seconds of your press. If 50pick is busy it keeps trying for 15 s, then gives up with nothing moved. It ignores this bot's schedule, pool band and closing-soon skip, and stays out of the last {m:ss} before betting closes."
- `{m:ss}` is the bot's polls `minTimeToCutoff`.

*F5 `revalidateLive()` covers Enter now (same `boundsHash`, same validators)*
- **Narrowing only.** An Enter now stake above the live maximum is clamped at decision (4.2 `platformMax`). One AlertOnce per hash: "Platform maximum stake is now TZS {max}; Bot A's Enter now {thin | opener} stake TZS {x} is clamped. Review Rules."
- **Can't fit.** An Enter now stake below the live minimum, or `capStaffChosenDailyTzs` below it, means Enter now can't place that stake.
  - The bot is **not** paused, because its automatic modes and targets are unaffected.
  - Enter now refuses with STAKE_BELOW_MIN, naming the binding term.
  - One AlertOnce per bot, field and hash: "Platform minimum stake is now TZS {min}; Bot A's {field label} TZS {x} is below it, so Enter now can't place that stake. Review Rules."
  - Start refuses while `enterNow.enabled` (C14 row above).
- **Caps below the live minimum.** When `capStaffChosenDailyTzs` is below the live minimum and `targeting.enabled` is on, the same alert names targets. Target reactions skip at H2 with CAP_STAFF_CHOSEN_DAILY_STAKE until the owner saves.

#### N1 §6 Owner actions (commit 7, `src/app/admin/desk/actions.ts`)
Every action starts with `requireHouseOwner()` (C12: `REAUTH_LOGIN | REAUTH_TOTP | NOT_OWNER`; NOT_OWNER writes SECURITY `privilege_escalation_blocked`). It runs before any read or write, so a refused guard writes no press row. `runAdminAction` maps `UnrecognizedActionError` to `STALE_BUILD`. Every `href` in a refusal is an absolute path.

| Export | Input | Writes | Audit (R7) |
|---|---|---|---|
| `searchHouseBotMarketsAction` | botId, purpose `enter-now \| target`, q (0–64 code points) | none (pinned: 0 rows) | none (roster-search precedent) |
| `previewEnterNowAction` | botId, marketId | `OPENER_SIDE_DRAWN` (actorId = this officer) when the poll is empty and has no draw; `ENTER_NOW_PREVIEWED` at most once per actor + bot + market per EAT minute (AlertOnce `preview:<actor>:<bot>:<market>:<EAT minute>`) | none |
| `enterNowHouseBotAction` | botId, marketId, submitId, reason, confirmed `{marketId, side, entryCondition, stakeTzs, previewedAtIso}`, seenSwitchedAt, seenStatusAt | HouseBotPress (purpose ENTER_NOW); MANUAL intent + `ENTER_NOW_REQUESTED` + press QUEUED in one transaction | COMPLIANCE `house_bot.enter_now`; COMPLIANCE `house_bot.enter_now_refused` for INFO_BLACKOUT and OWNER_POSITION refusals |
| `getEnterNowStatusAction` | botId, submitId | none (pinned: 0 rows) | none |
| `cancelHouseBotIntentAction` (existing, extended for staff-chosen rows) | intentId; for a staff-chosen row also reason and submitId | see "Staff cancels" below | ADMIN `house_bot.intent_cancelled` (automatic rows, unchanged) · COMPLIANCE `house_bot.staff_intent_cancelled` (staff-chosen rows) |

`previewHouseBotTargetAction` and the three target actions are specified in N2 §6.

**`searchHouseBotMarketsAction`** (`server/house-bot/picker.ts`)
- **Polls only**, for both purposes. Up & Down markets are left out, never greyed.
- **Read:** new DAL `db.market.listLivePollsForHousePicker({limit})` with an explicit public select and a memory twin: `id`, `titleEn/Sw/Zh`, `category`, `status`, `selectionClosedAt`, pools, `isDemo`, `productLine`.
  - Filter: LIVE, non-demo, `productLine='MARKET'`, ordered by `selectionClosedAt` ascending.
  - Bound: `PICKER_SCAN_MAX = 500`, pinned. Never `getBoard`, `listBoard` or `StoredMarket`.
- **Matching:** only through `matchesQuery(parsed q, row, HOUSE_BOT_MARKET_PICKER_SEARCH)` over view-model rows. The new schema in `search/fields.ts` has `viewModel:true`:
  - `title` → `titleEn`, `titleSw`, `titleZh` (text);
  - `category` → `category`, `categoryLabel` (text);
  - `id` → `id` (exact);
  - `default`: `titleEn`, `titleSw`, `titleZh`, `category`, `categoryLabel`, `id`.
  - A bare pasted market id matches because `id` is in the defaults, and bare terms search the defaults (`predicate.ts:25-31`). No `.includes(` in `picker.ts` (`test:search-adoption` rule 1).
- **Query length** (after trim):
  - 0–1 characters: "Closing soonest", meaning the 10 soonest-closing eligible polls, then the not-available ones.
  - 2–64: matched rows, eligible first, each group ordered by cutoff.
  - Over 64: field `q`, "Search needs 64 characters or fewer."
- **Returns:** ≤10 rows (fetch 11), `hasMore`, counts `{eligible, notAvailable}` and `serverNow`.
  - Each row is `{marketId, title, categoryLabel, cutoffIso, cutoffEat, rawYes, rawNo, eligible, reason?}`. No other field is returned (info-edge pin).
- **Not-available reasons.** They are computed only for returned rows, and the first match wins:
  1. "Not in Bot A's scope (Sports) — add it in Rules"
  2. "Takes stakes until its result — the house stays out"
  3. "Not available: an AI result check is recorded on this market." / "Not available: this market was reopened after a result check."
  4. "Its target was stopped at {HH:MM} EAT — it can't be targeted again" (purpose target)
  5. "Held by Bot B"
  6. "Already targeted by Bot A" (purpose target)
  7. "The holder has their own stake here"
  8. "Bot A holds {SIDE} here; the thinner side is {SIDE2}" (purpose enter-now)
  9. "Bot A has {n} of {max} stakes here" (purpose enter-now)
  10. "Closes too soon for Bot A"

**`previewEnterNowAction`** returns:
- `{ok, marketId, figures, limits, nextPossibleIso?, rulesVersion, previewedAtIso, validUntilIso, retryAtIso?, serverNow, refusal?}`.
- `figures` is the aggregate-only output of `enterNowDecision` (N1 §4.2). It is computed on `lockedForHouse` and never names an account.
- `limits` is the bot's and the platform's staff-chosen usage today, plus the bot's exposure.
- `validUntilIso` = `previewedAtIso` + 60 s.
- `retryAtIso` is set when the refusal names a time: ONLY_SELLABLE, MIN_GAP, PER_HOUR, PER_DAY or GLOBAL_BETS_PER_MINUTE.
- The refusal evaluates steps 3–18 below and writes no press row and no audit.
- The preview itself is a write (N1 §8).

**`enterNowHouseBotAction` sequence** (HouseBotPress columns: N1 §2; claim and fire: N1 §4.3):
1. `requireHouseOwner()`, then the input checks (refusal 1). Nothing is written.
2. INSERT HouseBotPress `{purpose:'ENTER_NOW', state:'CHECKING', houseBotId, marketId, reason}`. If `uniqueViolation(err)` names `hbp_actor_submit_uq`, read the existing row:
   - a different purpose, botId or marketId → `SUBMIT_ID_REUSED` "This request id was already used for a different action. Reload and try again.";
   - CHECKING → `{ok:true, data:{pressState:'CHECKING'}}`, shown as "Still checking this press…";
   - REFUSED → the stored refusal, with the same code and copy;
   - QUEUED or DONE → the intent's live status with `duplicate:true`.
3. Refusal checks 3–19. Each refusal runs `UPDATE "HouseBotPress" SET state='REFUSED', code=$code, "updatedAt"=now() WHERE id=$1 AND state='CHECKING'`.
4. One transaction, outside any lock:
   - insert the MANUAL intent (N1 §4.3 step 4);
   - append `ENTER_NOW_REQUESTED`, with the reason in the event `reason` column, `marketId` set and payload `{intentId, pressId}`;
   - update the press to QUEUED with its `intentId`.

   A unique violation is read by its index name:
   - `hbi_manual_live_market_uq` → roll back, then mark the press REFUSED `MANUAL_LIVE`;
   - `hbi_manual_anchor_uq` → return that intent's status with `duplicate:true`;
   - any other name, or none → rethrow (MON-12).
5. Inline claim and fire (N1 §4.3: never inside a lock or an admission slot), awaited for at most 10 s. The press moves to DONE when the intent is terminal (N1 §4.3).
6. Audit through the press lease (N1 §2 press flow step 6): claim `auditClaimUntil`, append, then set `auditId`.
   - QUEUED or DONE press: `house_bot.enter_now {botId, holderUserId, marketId, intentId, side, stakeTzs, entryCondition, outcome, reason}`, where `outcome` is the intent status at audit time.
   - REFUSED press with code INFO_BLACKOUT or OWNER_POSITION: `house_bot.enter_now_refused {botId, marketId, code}`.
7. Return `{ok:true, data:{submitId, pressState, intentId, status, reasonCode?, side, stakeTzs, positionId?, placedAt?, staleAt, nextAttemptAt?, duplicate?}}`, read from the database after the wait. The modal's final state still comes from `getEnterNowStatusAction` (N1 §4.3 step 8).

**Refusals, in order.** Each has the shape `{ok:false, code, error, field?, data:{href?, retryAtIso?, preview?}}`.
1. **Input** (before the press row; nothing written). If `houseBotSchemaReady()` is false, return `ENGINE_DISABLED` here, before the press insert (no row):
   - `REASON_INVALID`, field `reason`: "Give a reason (5 to 300 characters)." (C2 code points)
   - `BAD_REQUEST`: "Something was wrong with this request — reload and try again." (a malformed botId, marketId, submitId or confirmed figure)
2. **Press record:** step 2 above.
3. `WITHDRAWN` (`houseBotsLive()` false): "House bots are withdrawn."
4. **Engine:**
   - `ENGINE_DISABLED` (`HOUSE_BOT_ENGINE=false`): "The bot engine is disabled on this server, so Enter now is off."
   - `ENGINE_STALE` (C11 danger rows): "The bot engine is not running (last seen {HH:MM:SS} EAT). Enter now is off until it runs."
5. **Master:**
   - `MASTER_OFF`: "House bots are off. Switch them on to use Enter now."
   - `SWITCHED_OFF_SINCE` (a SWITCH_OFF newer than `seenSwitchedAt`): "House bots were switched off by {name | the system: {cause}} at {HH:MM:SS} EAT after you opened this. Nothing was placed."
6. `STAFF_LIMITS_UNSET` (any of `gCapStaffChosenPerDay`, `gCapStaffChosenDailyTzs` or `gStaffChosenMaxCounterpartyShare` is NULL): "Enter now is off for every bot: set {Staff-chosen stakes per day | Staff-chosen TZS per day | Largest player share} on Limits first →". The field is the first NULL one; href `/admin/desk?tab=limits`.
7. **Bot:**
   - `BOT_MISSING`: "That bot no longer exists."
   - `BOT_REMOVED`: "This bot was removed."
   - `BOT_NOT_ACTIVE`: "Bot A isn't running ({Paused by {name} at {HH:MM} | Auto-paused: {cause}}). Start it to use Enter now."
   - `BOT_PAUSED_SINCE` (a PAUSED or AUTO_PAUSED event newer than `seenStatusAt`): "{name | The system} paused Bot A at {HH:MM} EAT after you opened this ({reason}). Nothing was placed."
8. `HOLDER_CAUSE` (`holderCauses` non-empty, or `!consentValid`): the first cause's C8/C9 copy + " Enter now is off until this is fixed."
9. **Rules:**
   - `RULES_FROM_FUTURE`: "Bot A's rules were saved by a newer 50pick build (v{n}). Enter now is off until that build is back."
   - `RULES_REVIEW` (RULES_OUTDATED or RULES_INVALID): "Bot A's rules need review: Rules → Save → Start." href `/admin/desk/<botId>?tab=rules`.
10. **Option:**
    - `ENTER_NOW_OFF`: "Enter now is off for Bot A. Turn it on in Rules →". Field `enterNow.enabled`; href `/admin/desk/<botId>?tab=rules`.
    - `OPTION_UNSET`: "Set Bot A's {Enter now thin stake | Enter now opener stake | staff-chosen stakes per day | staff-chosen TZS per day} first →". The field is the missing one; same href.
11. **Market** (PublicMarketView + A12):
    - `MARKET_MISSING`: "That market no longer exists."
    - `UPDOWN_NOT_ALLOWED` (raw `productLine='UPDOWN'`): "Enter now is for polls only. Up & Down entries are automatic."
    - `PRODUCT_NOT_ALLOWED` (demo, or F1 denied): "House bots can't enter this market."
    - `MARKET_NOT_LIVE`: "Betting on this market has closed."
    - `NO_CUTOFF`: "This poll takes stakes until its result, so the house stays out."
12. **Scope:**
    - `SCOPE_PRODUCT`: "Bot A isn't set up for polls. Turn polls on in Rules →"
    - `SCOPE_CATEGORY`: "{Sports} isn't in Bot A's scope. Add it in Rules first →"
    - Both link to `/admin/desk/<botId>?tab=rules`.
13. `INFO_BLACKOUT` (C8 raw re-read). It also writes the refused audit.
    - AI stamp or a young resolve claim: "Not available: an AI result check is recorded on this market."
    - `reopenedAt` set: "Not available: this market was reopened after a result check."
14. `TOO_LATE` (`now ≥ deadlineAt`): "Too late: betting closes at {HH:MM:SS} EAT and Bot A stops {m:ss} before that."
15. **Holding:**
    - a. `OWNER_POSITION`: "The holder has their own open stake on this market, so Bot A can't enter it." It also writes the refused audit.
    - b. `OTHER_BOT` (another bot's house position, live intent or ACTIVE target): "{Bot B} already holds this market. One bot per market."
    - c. `OWN_INTENT` (this bot's PENDING or CLAIMED intent here): "Bot A already has a queued stake here ({Counter | Fill | Opener | Enter now}, due {HH:MM:SS} EAT). Wait for it or cancel it first."
    - d. `PER_MARKET_COUNT`: "Bot A has {n} of {max} stakes on this market."
    - e. `MANUAL_LIVE` (a live MANUAL row on this market from any bot, or step 4's index): "Another Enter now on this market is being placed. Wait for its result."
16. **Decision** (`enterNowDecision` on `lockedForHouse`, N1 §4.2):
    - `ONLY_SELLABLE`: "No stake yet: the players' money here can still be cancelled free until {HH:MM:SS} EAT. Try again then." The time is the earliest lock plus `LOCK_MARGIN_MS`, and `retryAtIso` equals it.
    - `HOUSE_ONLY`: "No player money here that the house can add to. Stakes from 50pick, staff, agent and bot-holder accounts, and from accounts excluded for the day, don't count."
    - `BALANCED`: "No thin side: players' locked money is YES TZS {y} · NO TZS {n}, and neither side can take more without passing the other."
    - `OWN_OTHER_SIDE`: "Bot A already holds {SIDE} here and the thinner side is now {SIDE2}, so it can't add."
    - `COUNTERPARTY_CONCENTRATION` (THIN only): "One player holds {pct}% of the players' locked {SIDE} money here (limit {limit}%). Enter now adds only where that money is spread across players."
    - `STAKE_BELOW_MIN`: "Only TZS {x} of room ({binding}). Bot A's minimum stake is TZS {min}." The staff-chosen TZS caps bind here as `binding`.
17. **Preview mismatch:**
    - `PREVIEW_STALE` (`confirmed.marketId ≠ marketId`): "The figures you checked are for another market. Check this one, then press Enter now."
    - `PREVIEW_STALE` (side or condition ≠ recomputed): "The thin side changed since you checked (now {SIDE}). Review the new figures, then press Enter now again." The new preview is returned in `data.preview`.
    - `PREVIEW_EXPIRED` (`previewedAtIso` more than 60 s before server now): "These figures are over 60 s old — check again, then press Enter now."
    - The amount is min(confirmed, recomputed) and is never refused for shrinking.
18. **Caps pre-check.** This is for display only; H2–H4 stay authoritative. Order follows N1 §3 H2–H4:
    - `STAFF_CHOSEN_PER_DAY`: "Bot A has used its {n} staff-chosen stakes today (Enter now and targets). It resets at 00:00 EAT."
    - `GLOBAL_STAFF_CHOSEN` (count or TZS): "House bots have used today's staff-chosen limit ({n} of {max} · TZS {x} of TZS {y}). It resets at 00:00 EAT."
    - `COUNTERPARTY_LIMIT` (THIN: an opposite-side account holding ≥25% of `lockedForHouse(opposite)` is at `gCounterPerPlayerPerDay` or `gCounterPerPlayerTzsPerDay`): "A player holding {pct}% of the locked {SIDE} money has reached today's limit for house stakes against them. It resets at 00:00 EAT."
    - `MIN_GAP`: "Bot A's last bet was {n} s ago; its minimum gap is {g} s. Possible from {HH:MM:SS} EAT."
    - `PER_HOUR` / `PER_DAY`: "Bot A has placed {n} bets this {rolling hour | EAT day}. Possible from {HH:MM:SS} EAT."
    - `GLOBAL_BETS_PER_MINUTE`: "House bots placed {n} bets in the last minute (limit {g}). Possible from {HH:MM:SS} EAT."
19. `BUSY` (A24 no-claim rule): "50pick is busy right now — nothing was placed. Try again in a few seconds."

**Copy after a press:**
- Success: "Placed · TZS {x} {SIDE} on “{title}” at {HH:MM:SS} EAT."
- Any other outcome: "Not placed: {sentence}. Nothing moved."

**`getEnterNowStatusAction(botId, submitId)`** reads HouseBotPress by (current officer, submitId). It writes nothing and returns `serverNow` with:
- **no press row:** `NO_RECORD` "No stake was recorded for this press. Nothing moved. You can press Enter now again.";
- **a row whose `houseBotId ≠ botId`:** `BAD_REQUEST` "Something was wrong with this request — reload and try again.";
- **CHECKING:** `CHECKING` "Still checking this press…". It never says "Not placed".
- **REFUSED:** `{code, sentence}` from the N1 §8 lexicon, without live figures;
- **QUEUED or DONE:** `{intentId, status, reasonCode?, side, stakeTzs, positionId?, placedAt?, staleAt, nextAttemptAt?, retrying}`, where `retrying` = status PENDING and `nextAttemptAt < staleAt`;
- **TARGET_ADD, TARGET_UPDATE, TARGET_REMOVE or STAFF_CANCEL press:** `{state, code?, targetId?, intentId?, target?:{status, version}}` (N2 §6).

**Staff cancels, extending 02 §3.9** (the single definition for MANUAL and targeted rows; N2 §6 points here)
- **Which rows.** A row with `kind='MANUAL'` or a non-null `targetId` is staff-chosen. Automatic rows keep 02 §3.9 exactly: no reason, ADMIN audit.
- **Input for a staff-chosen row:**
  - `intentId`;
  - `reason` of 5–300 code points (field `reason`, "Give a reason (5 to 300 characters).");
  - `submitId`.
- **Before the locks (autocommit):** INSERT HouseBotPress `{purpose:'STAFF_CANCEL', state:'CHECKING', intentId, targetId?, marketId, reason}`, with the Enter now sequence's step 2 duplicate handling.
- **Transaction.** `SET LOCAL lock_timeout = '3s'`, then `wallet:<botUser>`, plus `house:targets` when `targetId` is set (N2 §6 lock order):
  1. conditionally move PENDING → CANCELLED(CANCELLED_BY_ADMIN);
  2. append `STAFF_INTENT_CANCELLED`, with the reason in the reason column and payload `{intentId, targetId?, side, stakeTzs, pressId}`;
  3. if `targetId` is set, move the target ACTIVE → ENDED(VETOED), or ENDED with another cause → ENDED(VETOED) keeping `endedAt` and putting `previousEndCause` in the TARGET_ENDED payload, and append `TARGET_ENDED`;
  4. move the press to DONE (`WHERE id=$1 AND state='CHECKING'`); commit.
  - A race refusal (the copies below) rolls the transaction back, then runs the press's conditional REFUSED update with its code. A lock timeout is `BUSY` "Bot A is placing a stake right now — nothing changed. Try again in a few seconds."
- **After the locks are released:** the awaited COMPLIANCE `house_bot.staff_intent_cancelled {botId, marketId, intentId, side, stakeTzs}`, written through the press lease. The reason stays only in the event `reason` column and on the press row.
- **Race copy (C7):**
  - "Too late — this bet is being placed now."
  - "Too late — placed at {HH:MM:SS} (TZS {x} {SIDE})."
  - "Nothing to cancel — it was skipped: {reason}."
  - "Already cancelled."
- **Success:** "Stake cancelled and recorded as a veto." When a target was stopped, add: " The target on “{title}” is stopped; this poll can't be targeted again."
- Removing a target that has a live reaction is specified in N2 §6.

**R7**
- **`HOUSE_AUDIT` COMPLIANCE gains:**
  - `enter_now`, `enter_now_refused`, `staff_intent_cancelled`;
  - `target_added`, `target_updated`, `target_removed` (payloads in N2 §6).
  - ADMIN `intent_cancelled` stays for automatic rows.
- **Allowed payload keys gain:** `marketId, intentId, targetId, side, stakeTzs, entryCondition, outcome, code, delayMinSec, delayMaxSec, timingFrom, reactTo`. `reason` stays allowed. A payload never carries a label, note or name.

**C11 `getHouseBotStatusAction` gains:**
- `enterNow:{enabled, available, code?, reason?}`. `enabled` comes from the saved rules. `available` evaluates refusal steps 3–9 only; step 10 applies only to presses (UX-20).
- `targets:{enabled, active, max, gMax, available, reason?}`. `available` evaluates the N2 §6 add refusals 4–8, without a market (UX-20).
- `staffChosenToday:{bot:{n, max, tzs, maxTzs}, global:{n, max, tzs, maxTzs}}`.
- ~~`boardDisclosureStaffChosenSent:boolean` (N1 §10).~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** P1's disclosure tracking is struck, so the status action carries no Board-disclosure flag (see N1 §10).

#### N1 §7 Notifications (commit 4; `comms-registry` rows; C13 matrix rows)

| Emitter | Audience · channel | When | Copy / href |
|---|---|---|---|
| `notifyAdminsHouseBotStaffChosen` (renamed from `notifyAdminsHouseBotManualEntry`) | every `houseBotAlertRecipients()` (A22) · bell + email · **uncapped**, not counted in `countInHour` | after the A8 `alertedAt` claim on a PLACED row with `kind='MANUAL' OR "targetId" IS NOT NULL`; A8 repairs a missed one | Title `Staff-chosen · Bot "{label}" {SIDE} TZS {x} on {market} · {Enter now by {name} \| target by {name}} · {HH:MM:SS} · {intent ref}`. Body "Placed at {HH:MM:SS} EAT. Side rule: {the thinner side — players' locked money YES TZS {y} · NO TZS {n} \| an empty poll — side drawn once for this poll \| a counter to Player #{handle}'s TZS {t} {SIDE} stake}. Reason recorded in the activity feed →" · `/admin/desk/<botId>?tab=activity&range=all&intent=<intentId>` |
| `notifyAdminsHouseBotBet` | unchanged cap | **excludes** staff-chosen rows | — |
| `notifyAdminsHouseBotHourSummary` | unchanged | hourly | its beyond-the-cap count excludes staff-chosen rows; adds "{s} staff-chosen stakes were alerted one by one" when s > 0 |
| `notifyAdminsHouseBotRoster` | every recipient · bell + email · uncapped | TARGET_ADDED, TARGET_UPDATED, TARGET_REMOVED (copy in N2 §7) | `/admin/desk/<botId>?tab=history&event=<eventId>` |
| `notifyAdminsHouseBotAlert`, AlertOnce `staff-stake-voided:<marketId>` | every recipient · bell + email | planner: a void or a reopen (`reopenedAt`) of a market holding a PLACED staff-chosen stake | "Market “{title}” holding a staff-chosen house stake ({SIDE} TZS {x}, Bot “{label}”) was {voided \| reopened} at {HH:MM} EAT." · `/admin/markets/<marketId>` |
| `notifyAdminsHouseBotAlert`, AlertOnce `staff-stake-self-decided:<marketId>:<action>` | every recipient · bell + email | planner: the decision's actor is in ~~`houseStake.staffChosen.requestedBy`~~ (INT-06) ⛔ **Superseded by D20 (Ali, 2026-09-17):** decision audits carry no `houseStake` (C5-SPEC rulings 187–191); the actor is compared with `requestedBy` as N1 §4.5 defines it, which `oversight.ts` recomputes from the stakes | "Market “{title}” holding a house stake chosen by {name} was {resolved {OUTCOME} \| voided \| reopened \| objection upheld \| objection rejected} by {name} at {HH:MM} EAT. This is a record only; nothing was refused." · `/admin/markets/<marketId>` |
| ~~`notifyAdminsHouseBotAlert`, AlertOnce `staff-edge:<officerId>:<YYYY-MM>`~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** this row is struck; the staff-edge alert is never built (C5-SPEC rulings 218–223) | ~~every recipient · bell + email~~ | ~~planner, monthly (INT-07)~~ | ~~"{name}'s staff-chosen stakes placed in {Month YYYY}: {n} settled, {w}% won against {a}% for automatic stakes on the same products; net {±TZS x}. See the staff-chosen scorecard →" · `/admin/reports?tab=library&range=custom&from=<YYYY-MM-01>&to=<YYYY-MM-last>` (pinned by the C13 +60-day test)~~ |
| ~~`notifyHouseBotOwnerStake`~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** this row is struck: the emitter is deleted and the holder receives no house-bot notice (C4 ruling 149). | ~~holder · bell + push, capped by `holderNoticesPerHour`; returns early while `isLockedOut`~~ | ~~a PLACED staff-chosen row, identical to an automatic one~~ | ~~unchanged; it never says a person chose~~ |

**Detection rules (planner, once a minute; ~~staff edge per N1 §4.5~~):** ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge rule below is struck (C5-SPEC rulings 218–223).
- **Self-decided.**
  - It reads the last 30 days through `getAuditByActionsDurable`: `market.adjudicated`, `market.resolve.bulk`, `market.resolve.bulk_override`, `market.emergency_void`, `objection.upheld` and `objection.rejected`. ~~Their R9 payloads carry `staffChosen.requestedBy` (N1 §9).~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** decision audits carry no `houseStake` (C5-SPEC rulings 187–191); `oversight.ts` recomputes `requestedBy` from the stakes and never reads a decision audit's house payload.
  - It also reads `market.reopened` rows (`market-service.ts:4029`) for markets holding a staff-chosen stake, recomputing `requestedBy` from the intents.
  - `action` is one of `resolved | voided | reopened | objection_upheld | objection_rejected`.
  - It is display, audit and alert only. Nothing is refused (2026-07-24 guardrail).
- ~~**Staff edge.** It is evaluated only during the first EAT day of each month, for the month just ended, so the 30-day AlertOnce purge can never let it fire twice.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge rule is struck and never built (C5-SPEC rulings 218–223).
  - ~~**Cohort:** staff-chosen PLACED rows placed that month, grouped by officer (`requestedBy`), counting stakes settled by the time of evaluation.~~
  - ~~**Trigger:** at least 10 settled, and either the win rate minus the automated win rate is ≥ `gStaffEdgeWinRatePts`, or net is ≥ `gStaffEdgeNetTzs`. A NULL threshold switches its condition off.~~
  - ~~**Win rate** = won ÷ (won + lost); refunds and voids are excluded.~~
  - ~~**Automated rate** comes from rows with `kind<>'MANUAL' AND "targetId" IS NULL`, on the same products in the same month.~~
  - ~~**Net** = returned − staked on the officer's stakes; positive means the house gained.~~

**General rules:**
- Refused, expired and cancelled presses send no bell. The officer sees the result, ~~and the press register (N1 §9) records it~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1's Enter now register is struck (C5-SPEC rulings 202, 206); the refused press is still kept as a `HouseBotPress` row with its code (N1 §2).
- Bodies never quote an officer's reason (INT-10).
- `{holder}` is always `playerHandle` (R6).
- HOUSE_BOT is never sent by SMS; F6 `CHANNEL_POLICY` is unchanged.
- Every href still renders its event 60 days later (C13 test), including `?tab=history&event=` links.

#### N1 §8 Console (commit 7; 03 law: kit controls `size="md"`, tokens only, no gold, side words via `side-label.ts`, never `yes`/`no` button variants, `clock.ts` EAT, no class-shaped strings in copy)

**Where the control lives**
- **Placement.** Only on `/admin/desk/[id]`, in the BotStrip action row: Start · Pause · **Enter now** (`Button md variant="primary"`) · Re-verify · Remove.
- **Visibility (UX-20):**
  - The button is not rendered while the saved rules have `enterNow.enabled=false`, or on a REMOVED bot.
  - When it is rendered but `enterNow.available=false`, it is disabled and the status action's reason shows as visible text beneath the row.
- **Mounting (UX-04).** The modal lives in `EnterNowHost`, which the strip mounts outside every conditional. A refresh that hides the button can therefore never unmount an open modal or its result. While any house-bot dialog is open, the button stays mounted, disabled, with "Enter now is open".
- **Open dialogs count as dirty (UX-04).** Any open house-bot dialog counts as dirty in `HouseBotFormContext`: Enter now, staff cancel, and Add, Edit or Remove target. C11 then shows its change Callout instead of dispatching `50pick:refresh`, and runs exactly one refresh when the dialog closes. This replaces 03 S4's "RefreshPoller off while open" for these dialogs.
- **Unsaved edits (C10, UX-09).** While the rules or limits form is dirty, pressing Enter now first opens C10's three-choice dialog: "You have unsaved changes on Rules. Enter now uses the saved rules (v{n}: Enter now stake TZS {thin}, opener TZS {opener}; scope {categories}), not your edits."
  - "Save and continue" opens the modal only if the save returns ok.
  - "Continue with saved rules".
  - "Cancel".
  - N2 §8 applies the same rule to Add target.
- **Not on** the roster, the admin market page, the resolver, objections, or any Sentinel or AI surface.

**`MarketPicker`** (`src/components/admin/market-picker.tsx`; props `{botId, purpose, mayAct, selectedMarketId, onSelect, onClear}`; the UserPicker contract, 03 S2 + C5)
- **Input:** `Input size="md" type="text" role="combobox" aria-expanded aria-controls aria-autocomplete="list" aria-activedescendant`. `type="search"` is banned.
- **Listbox:** an in-flow `<ul role="listbox">` directly below, with no portal and no scroll box of its own. At most 10 options, each ≥44 px, plus a "Showing 10 — type more to narrow" line.
- **Option layout:**
  - title `text-body-sm`, wraps, never truncated;
  - meta `text-caption tabular`, e.g. "Sports · closes 14 Sep 18:00 EAT · YES TZS 12,000 · NO TZS 3,000". Each `SIDE TZS x` group is a nowrap span with `.amount` on the figure, and the line wraps only at " · ".
- **Ineligible options:** `aria-disabled="true"`, `text-text-subtle`, with the N1 §6 reason on its own line beneath. Never opacity.
- **Hints:**
  - enter-now: "Type a poll title, category or market ID. Leave it empty to see polls closing soonest."
  - target: "Type a poll title, category or market ID to target. Leave it empty to see polls closing soonest."
- **Search:** 250 ms debounce with a sequence number. 0–1 characters request "Closing soonest".
- **Selection contract (UX-01):**
  1. Enter in the combobox always calls `preventDefault` and `stopPropagation`. With an active eligible option it picks it; otherwise it does nothing. It never submits the form: house-bot modals submit on Enter (02 §2.6), and `select.tsx:241-243` is the precedent.
  2. A pick sets the input text to the poll title, collapses the listbox (`aria-expanded=false`) and calls `onSelect(marketId)`.
  3. Any text change after a pick calls `onClear()`. The modal then drops `selectedMarketId`, the preview and its submitId, and disables submit until a new pick and preview return.
  4. Each preview carries a sequence number. A response whose `marketId ≠ selectedMarketId` is dropped.
  5. The focus query runs only while no market is selected.
  6. ↑ ↓ Home End skip `aria-disabled` options (`select.tsx:210-219` precedent). Click and Enter refuse them.
  7. The press sends `preview.marketId`, and N1 §6 step 17 refuses a mismatch.
- **Esc and Tab:**
  - With the listbox open, Esc collapses it (`preventDefault` + `stopPropagation`), so the Modal stays open.
  - With the listbox closed, Esc is left to the Modal.
  - Tab collapses the listbox and moves on without picking.
- **Count:** announced politely through C7's single region: "{n} polls · {k} not available".
- **States:**
  - idle: the hint;
  - loading: `Spinner` + `aria-busy`;
  - empty: "No live poll matches “{q}” in Bot A's scope.";
  - error: "Search failed. Try again." + `Button xs ghost` "Retry";
  - REAUTH_* and STALE_BUILD: C12 copy, never "Search failed".
- **`mayAct=false`:** input and options are disabled.
- **At 360 px:** options wrap to several lines and push the modal body, which scrolls.

**Enter now modal** (`src/app/admin/desk/[id]/enter-now-modal.tsx`)
- **Props:** `Modal maxWidth={420} closeOnScrim={false} initialFocus={pickerRef} labelledBy={titleId}`. `ariaBusy` is set while Placing, Still checking or Retrying.
- It uses a modal-local runner, never ActionOverlay while open.
- ✕ and Esc close it in every state, including Placing and Retrying. This overrides 03 S4's "Esc closes unless pending" for this modal, because the press carries on in the server.

Body order:
1. Eyebrow "Enter now". Title `Stake from Bot “{label}” now`.
2. ~~Until `boardDisclosureSections` contains "Stakes chosen by staff": `Callout tone="warning" size="sm"` "Board disclosure of staff-chosen stakes not recorded as sent". It is non-blocking.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** P1's disclosure tracking is struck, so the modal shows no Board-disclosure line (see N1 §10).
3. `Field label="Poll"` › MarketPicker `purpose="enter-now"`.
4. **Preview**, after a pick:
   - **Loading and errors:** `SkCard lines={3}` while loading. On error: "Couldn't check this poll — try again" + Retry. On REAUTH: C12 copy.
   - **Check line:** "Checked {HH:MM:SS} EAT" + `Button xs ghost` "Check again", shown with every preview and every refusal.
   - **`<dl>`**, one column at 360 px and two from 640 px:
     - **Poll:** title + "Poll · {category}".
     - **Betting closes:** "18:00:00 EAT" + an `aria-hidden` countdown "in 1:42:10" (built from ISO + `serverNow`), then "Bot A stops at 17:55:00 EAT".
     - **50pick takes:** side word via `sideWord` + "the thinner side" or "empty poll — side drawn once for this poll".
     - **Stake:** `.amount` "TZS 9,000" + caption "Saved Enter now stake (v{n}) TZS 10,000, cut to fit players' locked money (room TZS 9,000)". On an opener: "Saved opener stake (v{n}) TZS 2,000".
     - **Players' money:** "Locked: YES TZS 12,000 · NO TZS 3,000". When present, also "Can still be cancelled: NO TZS 2,000 until 14:03:17 EAT" and "Not counted: TZS {x} (50pick, staff, agent, bot-holder and excluded accounts)". Aggregates only.
     - **Largest player** (THIN only): "{pct}% of the locked {SIDE} money (limit {limit}%)".
     - **Limits:** "Staff-chosen used today: 1 of 3 · TZS 8,000 of TZS 30,000 · all bots: 4 of 10 · TZS 38,000 of TZS 100,000 · Bot A exposure TZS 40,000 of TZS 100,000".
     - **Next possible** (only inside the minimum gap): "Next possible {HH:MM:SS} EAT (minimum gap {g} s)".
     - **Timing:** "Places within a few seconds of your press. If 50pick is busy it keeps trying for 15 s, then gives up with nothing moved."
   - **Money formatting:** every `SIDE TZS x` and `TZS x of TZS y` group is a nowrap span with `.amount` on the figure.
   - **Freshness:**
     - Ages and countdowns render from ISO + `serverNow`, never as frozen text.
     - When `retryAtIso` passes, the modal re-previews once, automatically.
     - After `validUntilIso`, submit is disabled with "These figures are over {n} s old — Check again".
   - **Refusal:** `Callout size="sm"` with the N1 §6 copy and fix link, and submit disabled. Tone is warning where someone must act, danger for INFO_BLACKOUT and ENGINE_*.
5. `HouseTextField` "Reason" (C2), with counter "212 / 300" and hint "Kept permanently in the audit log — don't write the holder's name or number."
6. `Button md primary` "Enter now" · `Button md ghost` "Cancel", stacked full-width at 360 px (`flex-col-reverse`).

**Rules for the modal**
- **Submit** is enabled only when:
  - `selectedMarketId === preview.marketId`;
  - the preview is ok and now < `validUntilIso`;
  - the reason is valid and `mayAct` is true;
  - nothing is in flight.

  A `useRef` latch blocks a second send.
- **submitId (N1 §2 press flow step 8):**
  - `crypto.randomUUID()` is minted with each preview, and again after any definitive answer (REFUSED, or a terminal intent status).
  - After an uncertain transport result the modal calls status first. It reuses the same id only while status is NO_RECORD.
  - DUPLICATE_SUBMIT is never silently ignored: a `duplicate:true` answer renders that intent's status.
- **Fix links:** every fix link closes the modal first (its submitId is discarded; the reason draft persists per C12), then calls `router.push(absolute href)`, then `focusFirstInvalid` after render.
- **Pending marker (UX-03).** When the press is sent, write sessionStorage `hb:pendingEnterNow:<botId>` = `{submitId, marketId, title, at, build}`.
  - It is declared as an allowed key in `draft.ts` and holds no secret.
  - Clear it on a definitive answer, or when the press itself returns REAUTH_*, NOT_OWNER or STALE_BUILD.
  - On page load, if a marker is under 10 minutes old, BotStrip reads status and shows a Callout with "View in activity":
    - "Your Enter now on “{title}” at {HH:MM:SS} EAT: Placed · TZS {x} {SIDE}."
    - "Your Enter now on “{title}” at {HH:MM:SS} EAT: Not placed: {sentence}. Nothing moved."
    - "Your Enter now on “{title}” at {HH:MM:SS} EAT is still being placed."
- **Status calls after the press was sent:**
  - STALE_BUILD: "50pick was updated while this was being placed. Reload to see the result, and don't press Enter now again until you have."
  - REAUTH_*: "Verify again to see the result of your Enter now — it may already be placed."
- **The preview is a WRITE** (`OPENER_SIDE_DRAWN`, `ENTER_NOW_PREVIEWED`).
  - Phase D drives it only against the local seeded database.
  - Phase F and every production check may open the modal and search the picker, but never pick a market.
  - The release record prints "Enter now preview: NOT MEASURED in production (it writes)".

**Result states** (the body is replaced; the modal stays open until closed)
- **Focus.** Every state renders a heading with an id and `tabIndex=-1`, which receives focus when the state changes.
- **Announcement.** Final outcomes are announced once through C7's single polite region. 03 §4 is amended to "Enter now and target results announce once, politely".
- Countdowns stay `aria-hidden`.

| State | When | Copy | Actions |
|---|---|---|---|
| Placing | request sent | "Placing…" (Spinner). At 8 s: "Still working — slow connection. It carries on if you close this window. The result will show on this page and in Activity." At 45 s or a transport failure: "No answer from 50pick — we don't know if this was placed." | "Check now" (status) · "Try again" (status first; resend the same submitId only on NO_RECORD) |
| Still checking | press CHECKING | "Still checking this press…" | status every 2 s |
| Retrying | PENDING and `nextAttemptAt < staleAt` | "50pick is busy — still trying until {HH:MM:SS} EAT." | status every 2 s |
| Placed | PLACED | the success copy; after an OFF: "Placed — it was already in its final step when house bots were switched off." | "Done" (close, then one refresh) · "View in activity" `/admin/desk/<botId>?tab=activity&range=all&intent=<intentId>` |
| Not placed | SKIPPED, EXPIRED, CANCELLED, FAILED | "Not placed: {sentence}. Nothing moved." Auto-pause: "Not placed — Bot A auto-paused: {cause}. Nothing moved." Master OFF: "Cancelled — house bots were switched off. Nothing moved." | "Choose another poll" (clears the selection; new submitId) · "Close" |
| No record | status NO_RECORD | "No stake was recorded for this press. Nothing moved. You can press Enter now again." | back to the preview (new submitId) |
| Refused | press REFUSED | the refusal Callout inside the preview body | "Check again"; new submitId |
| Stale preview | PREVIEW_STALE | warning Callout with the returned figures | press again (new submitId) |
| Re-auth, not owner, deploy | the press returns REAUTH_TOTP, REAUTH_LOGIN, NOT_OWNER or STALE_BUILD | C12 copy, which is true here because the action never ran. The reason stays in `hb:draft:/admin/desk/<botId>:enter-now`; the submitId is never in the draft | C12 buttons |

**Staff-cancel dialog** (`src/app/admin/desk/[id]/staff-cancel-modal.tsx`)
- **Opened by** the activity feed's "Cancel" on a PENDING staff-chosen row.
- **Modal:** `Modal maxWidth={420} closeOnScrim={false}`, titled "Cancel a staff-chosen stake?".
- **Body:**
  - the feed sentence, "Due {HH:MM:SS} EAT" and "This is recorded as a veto for compliance.";
  - when `targetId` is set: "It also stops the target on this poll; the poll can't be targeted again.";
  - `HouseTextField` "Reason" (C2).
- **Buttons:** `Button md primary` "Cancel the stake" · `Button md ghost` "Keep it".
- Automatic rows keep 02 §3.9's ConfirmDialog.

**Other surfaces**
- **Rules tab:**
  - AdminCard "Enter now": a Toggle row + `HouseNumberField prefix="TZS"` for the thin and opener stakes.
  - The per-bot staff-chosen caps sit in the Limits group (fields and copy: N1 §5).
  - The timing preview gains the `effectiveTiming.enterNow` line.
- **Limits tab (`/admin/desk?tab=limits`):**
  - AdminCard "Staff-chosen stakes" with `gCapStaffChosenPerDay`, `gCapStaffChosenDailyTzs`, `gTargetsMaxActive`, `gStaffChosenMaxCounterpartyShare`, `gStaffEdgeWinRatePts` and `gStaffEdgeNetTzs` (bounds and copy: N1 §5). ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge alert behind the last two fields is struck (C5-SPEC rulings 218–223); whether this card still shows them is left to Commit 7's rulings (N1 §5).
  - "Today's usage" ProgressBars "Staff-chosen stakes" and "Staff-chosen TZS".
  - Clearing any staff-chosen cap while house bots are ON is allowed (MON-14), with the consequence preview "Enter now and targets will be off for every bot. {n} queued staff-chosen stakes will be skipped."
- ~~**Board disclosure:** P1's "Record disclosure sent" control gains a Checkbox list of `BOARD_DISCLOSURE_SECTIONS` (the draft's section headings, in `constants.ts`). Saving writes `boardDisclosureSections`.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no "Record disclosure sent" control to extend, because P1's disclosure tracking is struck; `BOARD_DISCLOSURE_SECTIONS` still equals the private draft's headings (N1 §10).
- **Overview:** two usage bars, "Staff-chosen stakes" and "Staff-chosen TZS".
- **Activity feed:**
  - FilterPill group "Entry: All · Automatic · Targeted · Enter now" (whitelisted `entry=auto|target|manual`; X1).
  - Rows use `feed-copy.ts`:
    - "Enter now by {name}: Bot “Bot A” staked TZS 9,000 NO on “{title}” — thinner side (players' locked money YES 12,000 · NO 3,000) · placed 14:03:12 EAT, 1 s after the press"
    - "Enter now by {name}: Bot “Bot A” opened “{title}” with TZS 2,000 YES (side drawn once for this poll)"
    - "Enter now by {name} not placed: {sentence}. Nothing moved."
  - Result chip tones follow 03 S1.
- **History tab:** the new event kinds use their lexicon words, and officer reasons show in the Reason column.

**Lexicon** (`feed-copy.ts` and the status lexicon; each table is typed `satisfies Record<…, string>`; update `test:labels`, `test:chip-contract` and FAILURE-INVENTORY §7.1). `{Entry}` is "Enter now by {name}"; targeted rows use N2 §8's sentences. In "Not placed: {sentence}. Nothing moved.", `{sentence}` is the row's sentence without its "{Entry} not placed: " prefix.

| Engine code on a staff-chosen row | Sentence |
|---|---|
| INFO_BLACKOUT | "{Entry} not placed: an AI result check is recorded on this poll, or it was reopened after one." |
| STALE | "{Entry} not placed: 50pick was busy until the time limit (15 s) passed." |
| CONDITION_GONE | "{Entry} not placed: the poll's money changed before the stake, so its side no longer held." |
| COUNTERPARTY_CONCENTRATION | "{Entry} not placed: one player held more than {limit}% of the locked money." |
| CAP_STAFF_CHOSEN_PER_DAY | "{Entry} not placed: Bot A had used its staff-chosen stakes for today." |
| CAP_STAFF_CHOSEN_DAILY_STAKE | "{Entry} not placed: Bot A's staff-chosen TZS limit for today was reached." |
| CAP_GLOBAL_STAFF_CHOSEN_PER_DAY | "{Entry} not placed: house bots had used today's staff-chosen stakes." |
| CAP_GLOBAL_STAFF_CHOSEN_DAILY_STAKE | "{Entry} not placed: house bots' staff-chosen TZS limit for today was reached." |
| CAP_OPPOSITE_SIDE | "{Entry} not placed: Bot A already held the other side of this poll." |
| CANCELLED_BY_ADMIN | "{Entry} cancelled by {name} before it was placed (recorded as a veto)." |

**Press refusal codes** (ENTER_NOW presses; target and staff-cancel presses show their N2 §6 or N1 §6 refusal copy instead). The status sentence renders as "Not placed: {sentence}. Nothing moved.":

| Codes | Sentence |
|---|---|
| WITHDRAWN | "house bots are withdrawn" |
| ENGINE_DISABLED, ENGINE_STALE | "the bot engine wasn't running" |
| MASTER_OFF, SWITCHED_OFF_SINCE | "house bots were off" |
| STAFF_LIMITS_UNSET | "the staff-chosen limits weren't set" |
| BOT_MISSING, BOT_REMOVED, BOT_NOT_ACTIVE, BOT_PAUSED_SINCE | "the bot wasn't running" |
| HOLDER_CAUSE | "the holder's account needed attention" |
| RULES_FROM_FUTURE, RULES_REVIEW | "the bot's rules needed review" |
| ENTER_NOW_OFF, OPTION_UNSET | "Enter now wasn't set up for this bot" |
| MARKET_MISSING, UPDOWN_NOT_ALLOWED, PRODUCT_NOT_ALLOWED, MARKET_NOT_LIVE, NO_CUTOFF | "this market couldn't take a house stake" |
| SCOPE_PRODUCT, SCOPE_CATEGORY | "the poll wasn't in the bot's scope" |
| INFO_BLACKOUT | "an AI result check was recorded, or the market was reopened after one" |
| TOO_LATE | "it was too close to betting close" |
| OWNER_POSITION | "the holder had their own stake here" |
| OTHER_BOT, OWN_INTENT, PER_MARKET_COUNT, MANUAL_LIVE | "the market was already held or queued" |
| ONLY_SELLABLE, HOUSE_ONLY, BALANCED, OWN_OTHER_SIDE, STAKE_BELOW_MIN | "there was no room for a stake" |
| COUNTERPARTY_CONCENTRATION, COUNTERPARTY_LIMIT | "one player held too much of the money" |
| PREVIEW_STALE, PREVIEW_EXPIRED | "the figures had changed" |
| STAFF_CHOSEN_PER_DAY, GLOBAL_STAFF_CHOSEN | "today's staff-chosen limit was used" |
| MIN_GAP, PER_HOUR, PER_DAY, GLOBAL_BETS_PER_MINUTE | "a bet rate limit applied" |
| BUSY | "50pick was busy" |
| INTERRUPTED | "the press was interrupted before anything was saved" |
| SUBMIT_ID_REUSED | "the request id was reused" |

**Other words:**
- **Event kinds:**
  - ENTER_NOW_PREVIEWED "Enter now checked"
  - ENTER_NOW_REQUESTED "Enter now pressed"
  - OPENER_SIDE_DRAWN "Opener side drawn"
  - TARGET_ADDED "Target added"
  - TARGET_UPDATED "Target changed"
  - TARGET_REMOVED "Target removed"
  - TARGET_ENDED "Target ended"
  - STAFF_INTENT_CANCELLED "Staff-chosen stake cancelled"
- **Target chips and end-cause captions:** N2 §8.
- **Entry words:** Automatic · Targeted · Enter now.
- **Press states:** CHECKING "Checking" · REFUSED "Refused" · QUEUED "Queued" · DONE "Done".

**Gate outcome for every new client file** (commit 7; pinned by a `test:house-bot-console` source check)

| File | `test:unsaved-changes` | `test:admin-act-gate` |
|---|---|---|
| `src/components/admin/market-picker.tsx` | outside the population (`src/app/admin` only); no entry | outside its scope; receives `mayAct` and renders disabled when false |
| `src/app/admin/desk/[id]/bot-strip.tsx` (extended: Enter now button, `EnterNowHost`, pending Callout) | no raw typed control; no entry | `useMayAct()` before any early return |
| `src/app/admin/desk/[id]/enter-now-modal.tsx` | renders `HouseTextField` and `MarketPicker`, no raw `<Input`, `<Textarea` or `<Select`; **no entry** (an entry would fail the stale-exemption check) | `useMayAct()` before any early return |
| `src/app/admin/desk/[id]/staff-cancel-modal.tsx` | same as the Enter now modal; no entry | `useMayAct()` |
| N2 §8 target client files | same rule | `useMayAct()` |

- A house-bot file that does render a raw `<Input`, `<Textarea` or `<Select` gets a class-① EXEMPT entry worded "① fields open inside <Modal>, scrim-close disabled, and the reason survives Cancel via the C12 draft".
- `draft.ts` declares `hb:pendingEnterNow:<botId>` and the staff-cancel draft `hb:draft:/admin/desk/<botId>:staff-cancel:<intentId>` as allowed keys.

**Visual fixtures (C7; `qa:house-bots-visual`)**
- **Picker:**
  - idle with each purpose's hint;
  - loading, empty and error;
  - "Showing 10 — type more to narrow";
  - every not-available reason;
  - the longest title with three money groups, at 320 and 360.
- **Preview:**
  - THIN and OPENER;
  - the largest-player line and the next-possible line;
  - figures over the age limit;
  - ~~the Board line;~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no Board line (see N1 §10).
  - one refusal per family, in both warning and danger tones.
- **Result states:** every row of the result table, including the 8 s and 45 s copies.
- **BotStrip:**
  - ACTIVE with Enter now enabled, and with it disabled plus its reason, at 360, 768 and 1280;
  - the three post-reload pending Callouts.
- **Other surfaces:**
  - the staff-cancel dialog with and without a target;
  - the limits card "Staff-chosen stakes" and its usage bars;
  - feed rows with the entry filter;
  - history rows for every new kind.
- **Modal:** at 360×300 with the keyboard up.
- **Not measured:** Modal and listbox are NOT MEASURED in phase C (X3); phase D drives them against the local seeded database only.

#### N1 §9 Reporting (commit 5)
⛔ **Superseded by D20 (Ali, 2026-09-17):** struck and never built: R1's sections (a)–(h) (C5-SPEC rulings 202, 206), the per-bot CSV columns (213), the R9 `houseStake.staffChosen` shape (187–191), the R2 display lines and "of which chosen by you" (192–194), the R3 GBT memo row (227), and the DSAR bullets (R5's events, positions and trigger-player counts, whose last home was the owner-only internal record, 236–239). The `book.ts` entry split stays only if checkpoint C5-5b names a remaining caller or a Commit 7 scope line. **Still standing:** the Erasure bullets (A5, R6; rulings 244–245).

- **`book.ts`:**
  - `houseBotBook(filter, {byEntry:true})` joins each marked Position to its intent by the unique `positionId`.
  - Entry is `MANUAL`, `TARGETED` (COUNTER with `targetId`) or `AUTOMATIC`.
  - Assert automatic + targeted + manual = house totals.
- **R1 `buildHouseLiquidity`, add sections.** Officer names are allowed here, never in the DSAR.
  - **(a) Entry split** per bot and product.
  - **(b) Enter now register**, from HouseBotPress `purpose='ENTER_NOW'`, one row per press:
    - EAT time, officer, bot, market id + title, press state;
    - the refusal code, or side, stake, condition, outcome and net once settled;
    - the reason.

    Refused rows are included with their code (INT-08).
  - **(c) Previews without a stake**, per officer per month: `ENTER_NOW_PREVIEWED` events with no `ENTER_NOW` press by the same officer on the same bot and market within the next 10 minutes.
  - **(d) Markets with a staff-chosen stake later voided or reopened:** {market, stake, bot, chooser, time, actor}.
  - **(e) Markets decided by the officer who chose a house stake on them:** {market, chooser, action, time, stake}, from the R9 payloads and `market.reopened` (INT-06).
  - **(f) Staff-chosen scorecard**, per officer per month:
    - presses, placed, settled, won, lost, refunded, win rate and net TZS;
    - beside them, the automated modes' win rate and net on the same products and month;
    - a flag when a staff-edge threshold (N1 §7) is met (INT-07).
  - **(g) Targets register:** columns in N2 §9.
  - **(h) Vetoes** per officer: {time, poll, bot, side vetoed, stake, via stake cancel or target removal, reason}. Sources are `STAFF_INTENT_CANCELLED` events and VETOED targets.
  - The R1 audit index already reads every `HOUSE_AUDIT` key with no category filter, so the new actions appear there.
- **Per-bot CSV** gains `entry_kind`, `target_id`, `requested_by` and `entry_condition`.
- **R9 / sanctioned change (q), exact shape:**
  - `houseStake:{yes:number, no:number, staffChosen:{yes:number, no:number, requestedBy:string[]}}`.
  - With no house stake: `{yes:0, no:0, staffChosen:{yes:0, no:0, requestedBy:[]}}`.
  - It is read in the same call through R2's `houseStakeByMarket`, extended.
  - `staffChosen` counts the same rows as `houseStake`, restricted to intents with `kind='MANUAL' OR "targetId" IS NOT NULL`.
  - `requestedBy` holds the distinct officer ids, sorted: `requestedById` for MANUAL rows, and the target's `createdById` for targeted rows.
  - R9's zero-shape test is updated to match.
- **R2 display:**
  - On the resolver card, ceremony, admin market page, emergency-void confirm, objection panel and bulk summary: "House stake: NO TZS 9,000 · of which chosen by staff TZS 9,000", shown only when > 0.
  - On the resolver card, ceremony, emergency-void confirm and objection panel, when the viewer's id is in `requestedBy`: "of which chosen by you: TZS 9,000".
  - Display only (I10; the 2026-07-24 guardrail).
- **R3 GBT pack memo:** "of which: staff-chosen house stakes (Enter now and targeted)". Statutory totals and the §9 house line are unchanged.
- **DSAR (R5, INT-10):**
  - **Included in the holder's `houseLiquidity.events[]`:** `ENTER_NOW_REQUESTED`, `TARGET_ADDED`, `TARGET_REMOVED` and `TARGET_ENDED`, each as `{kind, at, actor:'50pick owner'}` with no reason and no marketId.
  - **Excluded:** `ENTER_NOW_PREVIEWED`, `OPENER_SIDE_DRAWN`, `TARGET_UPDATED`, `STAFF_INTENT_CANCELLED`, and every HouseBotPress row (officer data).
  - **Positions:** `positions` include MANUAL and targeted rows, with no officer ids; `decision.counterparties` appears in no export.
  - **Trigger players:** `counteredPositionsCount` includes targeted counters. Enter now stakes have no trigger position and are not counted.
- **Erasure (A5, R6):**
  - Erasing a holder rewrites to "[erased]" the `reason` of every HouseBotPress and HouseBotEvent row on their bots.
  - Admin notification bodies carry no reasons, and R6's label redaction still runs.
  - DATA-RETENTION §2b tier ① gains "HouseBotPress reasons → `[erased]`".

#### N1 §10 Public text (commit 6)
- **Rules and Terms:** unchanged. ~~"…including any stakes 50pick places to add liquidity" stays true.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** that planned public sentence is never published; the rulebooks, Terms and FAQ keep exactly their words on `main` (D19a).
- ~~**Privacy P1 line, replace.** It sits in §3 "Legitimate interest" (`legal/privacy/page.tsx:61`; re-derive). English is binding; sw and zh are drafts for native review.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no privacy line to replace: the privacy notice keeps exactly its words on `main`, with no META bump (D19a, D19e).
  - ~~en: "Liquidity: 50pick may place stakes from accounts it operates, on markets chosen by an automated system or by 50pick staff; the automated system reads bets placed on a market to decide those stakes, and accounts that exploit them may be excluded from them for the day."~~
  - ~~sw (draft, native review): "Ukwasi: 50pick inaweza kuweka dau kutoka kwa akaunti inazoendesha, kwenye masoko yanayochaguliwa na mfumo wa kiotomatiki au na wafanyakazi wa 50pick; mfumo huo wa kiotomatiki husoma dau zilizowekwa kwenye soko ili kuamua dau hizo, na akaunti zinazozitumia vibaya zinaweza kuzuiwa kuzipata kwa siku hiyo."~~
  - ~~zh (draft, native review): "流动性：50pick 可能通过其运营的账户下注，所投注的市场由自动化系统或 50pick 员工选择；自动化系统会读取市场上的投注来决定这些下注，利用这些下注牟利的账户当天可能被排除在外。"~~
  - ~~**Why:** P1's line implies an automated system decides every stake. With D17/D18, staff choose the market and the moment.~~
  - ~~**Versioning:** it folds into P1's page-version bump before release. Built after REL-4, it would need its own META bump and COMPLIANCE entry (P2 precedent).~~
- **Chatbot:**
  - ~~The P1 bullet after `_actions/chat.ts:147` (re-derive) is unchanged.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no P1 chatbot bullet; the chatbot discloses nothing (D19d).
  - The forbidden-phrase list in `test:house-bot-disclosure` gains "fully automated", "only automated", "no person decides" and "no one at 50pick chooses".
- ~~**Board disclosure draft** (`docs/BOARD-DISCLOSURE-HOUSE-BOTS.md`): new section "Stakes chosen by staff".~~ ⛔ **STRUCK 2026-09-20 (owner ruling D21):** no Board draft is written, so no section of it is either. Kept below only as the record of what the struck section would have covered:
  - Enter now (polls only);
  - targets (polls only, 5–600 s, the absolute hold);
  - the formula side and amount;
  - the money the house may add to, and the share limit;
  - the information blackout, including a reopen after a result check;
  - staff-chosen caps, with NULL meaning off;
  - press and veto records, the COMPLIANCE audits ~~and R1 sections (b)–(h)~~;
  - the ~~three~~ alerts (every staff-chosen stake, a self-decided market, ~~staff edge~~); ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1's sections and the staff-edge alert are struck (C5-SPEC rulings 202, 206, 218–223); the private Board draft says that reports and filings treat house accounts as ordinary player accounts and carry no house memo.
  - accepted risks 13–20.
- **`boardDisclosureSections` (INT-12):** ⛔ **Superseded by D19 (Ali, 2026-09-16):** P1's disclosure tracking is struck, so no "Record disclosure sent" action, checklist or console line is built, and Ali decides if and when the private draft is sent (D19b); the constant-equals-headings pin below stands.
  - ~~Written by P1's "Record disclosure sent" action from a checklist of `BOARD_DISCLOSURE_SECTIONS`.~~ That constant must equal the draft's section headings (`test:house-bot-disclosure` §docs).
  - ~~The Enter now modal and the targets tab show "Board disclosure of staff-chosen stakes not recorded as sent" until the array contains "Stakes chosen by staff".~~
  - ~~The line is non-blocking. P1's ON-modal line keeps keying on `boardDisclosureSentAt`.~~
- **COMPLIANCE-DECISIONS house entry.** Date it on commit 1's day.
  - On 2026-09-14 the main checkout already carries `## 2026-09-14`, `(second)` and `(third)`, plus 2026-09-13 up to `(fourth)`, so P1's `## 2026-09-13 (third) · House bots` heading collides.
  - Use the next free suffix on commit 1's day, re-derived with grep at commit time.
  - **Contents:**
    - D17/D18;
    - supersedes F6 §3.3/§4 R5 ("never discretionary") as to market and moment only;
    - risk 14 as reworded in PLAN §16b, which adds no new UPDOWN D3 supersession;
    - the do-not-restore lines "No human-typed side.", "No human-typed amount." and "No sizing against cancellable money: only locked money of eligible accounts counts, 7 s after its free exit closes.";
    - accepted risks 13–20;
    - owner defaults W7–W16, verbatim.
  - HOUSE-BOTS.md carries the same risks and do-not-restore lines.

#### N1 Tests
- **`test:house-bot-rules`** (commit 1):
  - every N1 §5 bound × {"", "0", min−1, min, max, max+1, 2^53};
  - the N1 cross-field rules;
  - the Start "no mode" truth table;
  - a v1 JSON missing `enterNow` or `targeting` → off, with no pause;
  - the `effectiveTiming.enterNow` sentence;
  - constants: `LOCK_MARGIN_MS = 7000 ≥ 5000 + 2000`, and the `staleAt` offsets 15 s / 60 s / 30 s / 600 s.
- **`test:house-bot-migrations`** (commit 1):
  - replay twice;
  - `houseBotSchemaReady()` and the preflight count 8 tables;
  - CHECKs reject: a MANUAL row on UPDOWN; `requestedById` or `entryCondition` set on a non-MANUAL row; `targetId` on a non-COUNTER row; a bad press purpose, state or submitId; target delays of 4 and 601; each staff-cap bound;
  - each named unique index rejects its duplicate under its fixed name: `hbp_actor_submit_uq`, `hbi_manual_anchor_uq` (even after CANCELLED), `hbi_manual_live_market_uq`, `hbi_fill_opener_anchor_uq`, `hbe_opener_draw_uq`, `hbt_active_market_uq`;
  - `PredictionMarket.reopenedAt` and `reopenCount` are expand-only.
- **`test:dal-parity`:**
  - Commit 1: `uniqueViolation(err)` returns the same index name on both stores for every named index; an unknown unique violation is rethrown. Twins for the draw, intent insert, press insert and transitions, and target rows.
  - Commit 2: the `lockedForHouse` memory twin equals the SQL output on the golden grid.
  - Commit 7: the picker DAL.
- **`test:house-bot-seam`** (commit 2):
  - **H0 (MON-01):**
    - 08006 injected on COMMIT → `replayed:true`, master stays ON, 0 SECURITY rows;
    - Remove, auto-pause, master OFF, target removal and SIGTERM requeue, each injected between F5 and H0 → CANCELLED or `house_intent_superseded`, 0 SECURITY rows, `offCause` unchanged, 0 positions;
    - a missing intent, or a differing `houseBotId`, `botUserId`, `marketId`, `side` or `stakeTzs` → `house_key_mismatch`.
  - **`GATE_PARITY`:** rows for `house_info_blackout`, `house_intent_stale` and `house_counterparty_concentration`, each `{exempt:'house context only'}`; `BET_PATH_REASONS` includes them.
  - **H2 order (MON-09):** `house-bot-seam.anchors.mjs` declares the N1 §3 H2 order. Fixtures that trip two checks at once return the earlier one: OWNER_POSITION + STAKE_MAX → OWNER_POSITION; EXPOSURE + MIN_GAP → EXPOSURE; STAFF_CHOSEN_PER_DAY + MIN_GAP → STAFF_CHOSEN_PER_DAY; MIN_GAP + PER_MARKET_COUNT → PER_MARKET_COUNT (the terminal cap wins within group 5).
  - **`lockedForHouse` (MON-17):**
    - SQL = JS `exitWindowClosesAt` on the A14 grid, including `LOCK_MARGIN_MS` ± 1 ms;
    - EXPLAIN at 20,000 positions on one market uses `(marketId, status)` with no Seq Scan;
    - each exclusion is proven: a role other than PLAYER, the holder of a non-REMOVED bot, penalty-boxed today, and `recruitedBy` a live holder.
  - **Source pins:** no H3 position sum outside `lockedForHouse`; `blackout.ts` exports only `{blocked:boolean}`.
  - **Sanctioned change (r):** `adminReopenMarket` output is byte-identical apart from `reopenedAt` and `reopenCount`. The player path is byte-identical.
- **`test:house-bot-money`:**
  - MANUAL and targeted stakes are cash-only, marked, and never cashed out;
  - the trial balance ties;
  - a 0-row `markPlaced` abort and a `house_intent_stale` abort both leave money and intent consistent.
- **`test:house-bot-caps`** (Postgres + memory):
  - **Per-bot staff burst (UX-08, MON-09):** `capStaffChosenPerDay=3`, min gap 30 s, 10 distinct polls, and an injected clock stepping past the gap between presses → 3 PLACED; the 4th press is refused before insert with `STAFF_CHOSEN_PER_DAY` (press REFUSED). A concurrent pair racing the 3rd slot on two polls → 1 PLACED + 1 SKIPPED(CAP_STAFF_CHOSEN_PER_DAY).
  - **One family (INT-05):** 2 MANUAL + 1 targeted PLACED → the next targeted reaction is SKIPPED(CAP_STAFF_CHOSEN_PER_DAY).
  - **Global burst:** 10 concurrent presses across 10 bots × 10 polls at `gCapStaffChosenPerDay=3` → exactly 3 PLACED + 7 SKIPPED(CAP_GLOBAL_STAFF_CHOSEN_PER_DAY). The TZS caps use the same shape.
  - **Clearing while ON (MON-14):** clearing `gCapStaffChosenPerDay` with a PENDING MANUAL → the save succeeds, SKIPPED(CAP_GLOBAL_STAFF_CHOSEN_PER_DAY), 0 positions, automated intents untouched.
  - **`staleAt` in the lock (MON-03):**
    - `wallet:<botUser>` held for 20 s → EXPIRED(STALE) by 15–20 s, 0 positions;
    - P2028 injected three times over 14–18 s → 0 positions;
    - a crash after the claim frees `hbi_manual_live_market_uq` within one planner pass after `staleAt` + 5 s.
  - **Races:** THIN with a cash-out racing inside the lock → `house_condition_gone`; OPENER with a racing bet → the same.
  - **Concentration (INT-02, MON-07; TGT-37):**
    - one account holds 80% of locked NO at share limit 50 → `house_counterparty_concentration`, 0 positions;
    - a NULL share limit → refused;
    - locked money held only by an AGENT, a staff account, another bot's holder, a penalty-boxed account or a recruit of a live holder counts as 0 → BALANCED or HOUSE_ONLY, 0 intents;
    - 4 Enter now stakes against one player at `gCounterPerPlayerPerDay=3` → the 4th press is refused with COUNTERPARTY_LIMIT at the caps pre-check, or SKIPPED(CAP_COUNTERPARTY_COUNT) at H4 when it races past it.
  - **Lock margin (MON-06):** two processes with clocks at +5 s and −5 s; a cash-out racing a THIN stake at the boundary never succeeds after a house stake counted it.
  - **Blackout in the lock (INT-01, INT-09):**
    - a stamp before the lock → `house_info_blackout`;
    - `reopenedAt` set → blocked;
    - `resolveClaimedAt` older than `RESOLVE_CLAIM_TTL_MS` (`bulk-resolve-eligibility.ts:237`) → not blocked.
  - **Master OFF:** OFF mid-flight → CANCELLED, and nothing later commits.
- **`test:house-bot-engine`:**
  - **Press record (MON-04, UX-02, INT-08; TGT-03):**
    - the same submitId pressed twice → 1 press, 1 intent, 1 event, 1 audit, 1 position;
    - a 15 s stall injected before the insert, plus a concurrent status read → CHECKING, never NO_RECORD, then the final status;
    - a refused press repeated with the same submitId → the stored REFUSED, not DUPLICATE_SUBMIT;
    - the same submitId on another market → SUBMIT_ID_REUSED;
    - each refusal family writes exactly 1 REFUSED press with its code;
    - INFO_BLACKOUT and OWNER_POSITION presses get exactly one `enter_now_refused`, including after repair.
  - **Index discriminator (MON-12):** two submitIds on one poll → 1 PLACED + 1 press REFUSED(MANUAL_LIVE) on both stores; an unknown unique violation surfaces as an error.
  - **Opener draw (MON-16):**
    - cancel, re-preview, another bot and the next EAT day all show the same side;
    - the automated OPENER uses it through the planner's `openerSide`;
    - `decide()` with an injected side is deterministic;
    - a planner transaction rolled back after the draw leaves the draw committed;
    - `OPENER_SIDE_DRAWN.actorId` is the previewing officer, and null for the planner.
  - **Decision (MON-08):** ONLY_SELLABLE (time includes the margin), HOUSE_ONLY, BALANCED, OWN_OTHER_SIDE and PER_MARKET_COUNT refusals. An H2 OPPOSITE_SIDE → SKIPPED(CAP_OPPOSITE_SIDE) with its own sentence.
  - **Side flips (UX-15 numbers):** locked YES 12,000 and raw NO 3,000 → NO, TZS 9,000. A NO 15,000 stake passing its free exit before the press → PREVIEW_STALE. A flip between press and fire → SKIPPED(CONDITION_GONE), never the other side.
  - **Write-back (MON-02):**
    - exposure used between decide and fire → a COUNTER placed at the clamped amount, with `stakeTzs` = `Position.stake`, `decision.firedStakeTzs` set, master ON and 0 SECURITY rows;
    - a clamp below the minimum → SKIPPED(STAKE_BOUNDS_CHANGED) and the seam is never called (spy);
    - a stake never grows.
  - **Transient budget (MON-10):** 5 BUSY before `staleAt` (injected backoff 2 s) → EXPIRED(STALE), `transientAttempts=5`, `attempts` unchanged, 0 POISON rows, 0 alerts.
  - **Inline fire (MON-13):**
    - SIGTERM during an inline fire leaves the row CLAIMED, with 1 position;
    - `fireClaimedIntent` inside `withLock`, or inside an admission slot, throws;
    - source pin: `enterNowHouseBotAction` never fires inside `withLock` or `$transaction`;
    - inline fire vs poller on two processes → 1 position;
    - a kill after the claim → EXPIRED(STALE), 0 positions.
  - **Audit lease (MON-11):** an audit delayed 70 s → exactly 1 COMPLIANCE row; a repair killed after its lease claim → repaired after the lease expires, exactly 1 row.
  - **Reopen (INT-01; TGT-34):** a confident early re-check, then a reopen → both Enter now and Add target refused, 0 intents; MARKET_REOPENED is detected with no prior intent.
  - **Stale claim (INT-09):** `endTargets` skips it, and the blackout lifts after the TTL.
  - **Alerts:** `staff-stake-voided` fires once each for a void and a reopen. `staff-stake-self-decided` fires once per action for resolve, void, reopen and objection-rejected by the chooser; a different officer gets none; the decision is never refused (TGT-38).
- **`test:house-bot-info-edge`:**
  - the picker DAL field list equals a pinned list;
  - the token walker covers `picker.ts`, `preview.ts`, `enter-now.ts`, `market-picker.tsx` and the JSON of the search, preview and status actions;
  - a planted `sentinelOutcome` needle turns it red;
  - A13's walker exempts `blackout.ts` by name, and `blackout.ts` is imported only by pinned modules;
  - `decide.ts` imports neither `blackout.ts` nor the store (source pin);
  - automated kinds are byte-identical with and without Sentinel fields.
- **`test:house-bot-comms`:**
  - a MANUAL row and a targeted row each reach 2 admins by uncapped bell + email without consuming `countInHour`;
  - `notifyAdminsHouseBotBet` sends neither;
  - a reason seeded with NEEDLE never appears in a body, and bodies end "Reason recorded in the activity feed →";
  - titles survive the 90 s dedupe;
  - hrefs render at +60 days, including TARGET_* history events;
  - ~~the holder notice is capped;~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder notice to cap (C4 ruling 149).
  - voided, self-decided ~~and staff-edge~~ alerts reach every recipient; ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge alert is struck (C5-SPEC rulings 218–223).
  - 0 SMS.
- **`test:house-bot-holder-lifecycle`:** each A2 cause refuses Enter now with its copy (press REFUSED `HOLDER_CAUSE`).
- **`test:house-bot-reports`:** ⛔ **Superseded by D20 (Ali, 2026-09-17):** every case below except the entry split is struck with R9, R2, R1 and the staff-edge alert (C5-SPEC rulings 187–194, 202, 206, 218–223); the entry-split case stays only if checkpoint C5-5b keeps the split.
  - the entry split ties to totals;
  - ~~R9 carries the exact shape, with `requestedBy` = the presser (MANUAL) and the target adder (targeted), and the zero shape on a non-house market;~~
  - ~~"of which chosen by you" renders only for a viewer in `requestedBy`;~~
  - ~~the register includes refused presses with their code;~~
  - ~~sections (c), (d), (e) and (h) hold their fixture rows;~~
  - ~~scorecard (TGT-39): 12 wins of 14 settled against the automated baseline fires exactly one staff-edge alert, and the baseline ties to the book; 9 settled fires none; both thresholds NULL fires none.~~
- ~~**`test:dsar-secrets`** (INT-10): the holder's `events[]` holds exactly the four included kinds as `{kind, at, actor}`, with no reason text, no marketId, no press rows and no officer ids.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no holder `events[]` in any file (the internal record is struck, C5-SPEC ruling 238); `test:dsar-secrets` keeps the releasable doors' absence cases (ruling 243).
- **`test:erasure` §8:** new bucket `houseBotPressAndEventReasons`, plus admin notification rows seeded with NAME in a reason → no NAME after erasure. `red:erasure` still fails 8.b when the redaction is skipped.
- **`test:house-bot-disclosure`:**
  - ~~the privacy line in 3 locales;~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no privacy line; the suite pins the privacy notice byte-identical to `origin/main` instead.
  - the extended forbidden phrases are absent;
  - the "Stakes chosen by staff" section is present, and `BOARD_DISCLOSURE_SECTIONS` equals the draft's headings;
  - §docs: risks 13–20 and the three do-not-restore lines are in the COMPLIANCE entry and HOUSE-BOTS.md, and deleting one turns it red;
  - the house COMPLIANCE heading is unique in the file.
- **`test:search-adoption`:** stays green (a view-model schema; no `.includes(` in `picker.ts`).
- **`test:house-bot-console`** (commit 7):
  - **RBAC:** search, preview, Enter now, status and staff cancel × 8 non-owner roles → NOT_OWNER + SECURITY, 0 rows. REAUTH returns without a redirect.
  - **Refusal order:** one fixture per step asserts that the first refusal wins, the press is REFUSED with its code, and every href is absolute.
  - **Up & Down:** an Up & Down market id → "Enter now is for polls only. Up & Down entries are automatic.", 0 intents (TGT-13).
  - **Stale presses:** stale switch, stale status and stale side; SUBMIT_ID_REUSED; a `duplicate:true` answer renders a status.
  - **0-row pins** (source pin + DB count): search, status and `previewHouseBotTargetAction`. The preview writes only its two event kinds and its `preview:` AlertOnce throttle row.
  - **R7:** one row per action, with category = `HOUSE_AUDIT[action]` for `enter_now`, `enter_now_refused` and `staff_intent_cancelled`; payload keys stay within the allowlist.
  - **Staff cancel (TGT-36):**
    - without a reason → field error;
    - with `targetId` → target ENDED(VETOED), the `STAFF_INTENT_CANCELLED` event and the COMPLIANCE row;
    - an automatic row → unchanged ADMIN flow.
  - ~~**Board line:** a date but no section → the line is shown (INT-12).~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no Board line (see N1 §10).
  - **Strip (UX-20):** `available` uses steps 3–9 only; `enabled=false` → no button; unavailable → disabled + reason.
  - **Picker grammar:** a pasted id finds that poll; 0–1 characters → "Closing soonest".
  - **jsdom:**
    - two presses in 50 ms → 1 request;
    - UX-01: Enter in the combobox with an ok preview → 0 action calls; typing after a pick clears the preview and disables submit; a late preview for A after picking B is dropped; arrows skip disabled options;
    - N1 §2 press flow step 8: a refusal → a new submitId; an uncertain result → status first, and the same id only on NO_RECORD;
    - UX-03: a fake deploy on the third status poll → exact copy; REAUTH mid-poll → exact copy; closing during Retrying, then reloading → the pending Callout; search REAUTH → C12 copy;
    - UX-04: an open modal plus a HOUSE_BOT SSE event and a status change → 0 refreshes and the modal still mounted; closing → exactly 1 refresh;
    - UX-05 (fake timers): a refusal with `retryAtIso` → exactly one automatic preview; past `validUntilIso` → submit disabled with the copy;
    - UX-08: the next-possible line;
    - UX-09: a dirty form + Enter now → dialog; a refused save never opens the modal (spy);
    - UX-10: after an ok result, `document.activeElement` is the result heading and the polite region equals the success copy;
    - UX-11: the refusal-10 fixture → modal closed, URL `/admin/desk/<botId>?tab=rules`, focus on the Enter now Toggle;
    - UX-13: the gate-outcome source pin;
    - no gold; `Button` variant never yes or no.
  - **Deploy skew:** `test:deploy-skew` STALE_BUILD arms for `enterNowHouseBotAction` and `getEnterNowStatusAction`.
- **RED harnesses.** Every mutation fails its own assertion against an unmutated control. N2 Tests numbers its own mutations "N2-n".
  - **`red:house-bot-money`** (commit 2):
    - N1-1: H3 THIN uses raw `yesPool`/`noPool` instead of `lockedForHouse` → the THIN race and ONLY_SELLABLE cases fail.
    - N1-2: `entryCondition` is read from the call args instead of the claimed row.
    - N1-3: the staff-chosen count uses `kind='MANUAL'` only → the one-family case fails.
    - N1-4: H0 filters `status='CLAIMED'` → MON-01 (a) and (b) fail.
    - N1-5: the seam's `staleAt` check is removed → the 20 s wallet hold places a position.
    - N1-6: the AGENT exclusion is dropped from `lockedForHouse` → the concentration case fails.
    - N1-7: `LOCK_MARGIN_MS = 0` → the golden-grid boundary fails.
    - N1-8: the staff-chosen caps move after MIN_GAP → the declared-order case fails.
  - **`red:house-bot-engine`** (commit 4):
    - N1-1: fire takes the new thin side → the CONDITION_GONE case fails.
    - N1-2: the planner's `openerSide` is replaced by a per-intent `randomInt` → the draw case fails.
    - N1-3: the claim ignores `staleAt` → a saturated press places late.
    - N1-4: the blackout call is removed from `fire.ts` → TGT-14's fire case fails.
    - N1-5: the blackout ignores `reopenedAt` → TGT-34 fails.
    - N1-6: the write-back UPDATE is removed → MON-02 sees `house_key_mismatch`.
    - N1-7: a transient requeue increments `attempts` → a POISON row appears.
    - N1-8: the audit lease becomes an unconditional append → the 70 s case sees 2 rows.
    - N1-9: the inline fire is not registered in `inFlight` → the SIGTERM case requeues.
  - **`red:house-bot-console`** (commit 7):
    - N1-1: the latch is removed → two requests.
    - N1-2: the picker DAL selects `sentinelOutcome` → the info-edge needle fires.
    - N1-3: the PREVIEW_STALE check is removed.
    - N1-4: `requireOwner` is swapped in → the no-redirect case fails.
    - N1-5: the combobox Enter `preventDefault` is removed → jsdom sees a request.
    - N1-6: status maps CHECKING to NO_RECORD → the stall case fails.
    - N1-7: an open dialog is not counted as dirty → a refresh is dispatched.
    - N1-8: the UPDOWN refusal is removed → TGT-13's copy assertion fails.
    - N1-9: the search action writes an AlertOnce row → the 0-row pin fails.
    - N1-10: the reason check is removed from the staff-chosen cancel → TGT-36 (c) fails.

### N2 · MAJOR (owner request) · Targeted polls, and exact entry timing
*Merged:* owner request 2026-09-14 (parts 2 and 3); proposed rulings 3, 4, 5, 6; findings INT-01, INT-02, INT-04, INT-05, INT-06, INT-09, INT-10, INT-11, MON-01, MON-02, MON-03, MON-05, MON-06, MON-07, MON-09, MON-12, MON-14, MON-15, MON-16, UX-02, UX-04, UX-06, UX-07, UX-09, UX-10, UX-11, UX-13, UX-14, UX-17, UX-19, UX-20 (the N2 parts; all accepted).

In all copy below, "Bot A" stands for `{label}` and "Bot B" for another bot's label. All N2 copy is admin English (03 §3). N2 adds no player-visible string.

*Evidence:*
- **Hold window.** `cashOutValue` reads grace and paid minutes (`market-service.ts:2658-2659`) and sets `hadRunway = graceMs > 0 && closesAt − placedAt ≥ graceMs` (`:2671`). So `exitWindowClosesAt` = placedAt + grace + paid when there is runway, else placedAt (04 A14). Defaults: grace 5, paid 0 (`market-config.ts:217-218`).
- **No runway means never sellable.** `sellable = hadRunway && withinWindow && !bonusFunded` (`market-service.ts:2687`), on every container whatever its clock.
- **Polls usually hold.** AI polls get at least 120 min of betting (`ai-poll-config.ts:41`, `:165`). With the default polls no-react zone of 15 min (PLAN §5), every reactable poll stake has runway and holds to its exit close. The zone can be set as low as 0 min, so the last 5 minutes of a poll can be reactable with no hold.
- **Short rounds don't hold.** A round locks `durationMinutes` after its open (`updown-durations.ts:251-262`) and opens about 92 s late (PLAN §4.7). So a 3- or 5-min round's runway is under 300 s, and its exit closes at placedAt.
- **Two clocks.** `placedAt` is stamped by the bettor's container before the market lock (`market-service.ts:1238`; 04 A11). A target is created on DB time. A24 measures skew but only stops claims above 5 s (`04-amendments.md:619`).
- **The hook cache.** The trigger hook runs from a 5 s per-process soft cache (PLAN:229). The COUNTER anchor index has no status filter (PLAN:165), so one decision consumes a trigger for ever (MON-15).
- **Event bus.** It is in-process with best-effort Redis (`event-bus.ts:1-28`). Only durable rows plus the sweep are reliable.
- **Reopen leaves no marker.** `adminReopenMarket` accepts any CLOSED market without a stage-1 officer, nulls the six Sentinel fields and `resolveClaimedAt` (`market-service.ts:4000-4025`), and its audit is not awaited (`:4027-4034`) (INT-01).
- **Resolve claims expire.** `RESOLVE_CLAIM_TTL_MS = 10 min` (`market-service.ts:2054`) (INT-09).
- **Free options through cancel.** `cancelHouseBotIntentAction` takes no reason and writes an ADMIN audit only (`02-sealed-flows.md` §3.9; 04 R7). Automated COUNTER delays are bounded 5–600 s (PLAN:295) (INT-04).
- **Limits.** "Can't clear a limit while bots are on" (`02-sealed-flows.md` §3.8) (MON-14).
- **Audits and locks.** Every audit append takes one DB-global lock; A19 forbids an audit inside a lock (`04-amendments.md:512`, `:525`) (MON-05).
- **Console.** The bot page tabs are overview · rules · activity · money · history (`03-design-spec.md:232`). Roster alerts link to `?tab=history&event=<eventId>` (`04-amendments.md:1053-1055`) (UX-07).

#### N2 §2 Data model (commit 1; inside the two existing house migrations; S1 law; memory twin for every column and index; fixed index names)

*New table `HouseBotTarget`:*
- It is the 7th house table. `HouseBotPress` (N1 §2) is the 8th. A23 `houseBotSchemaReady()` and `ops:preflight-house-bot-migrations` count 8 tables.
- A20: kept 7 years, never deleted. It goes on the chain-purge NEVER list. P3 adds the DATA-RETENTION row "House-bot targets · 7 years · decision record".
- Rows hold officer ids and public poll fields only. They never enter the holder's data-rights export (N2 §9).

| Column | Type / CHECK |
|---|---|
| `id` | text PK `hbt_…` |
| `houseBotId` | text NOT NULL FK HouseBot |
| `marketId` | text NOT NULL, soft reference (no FK; A16 purge and orphan repair) |
| `productLine` | text NOT NULL CHECK `= 'MARKET'` (polls only, W13) |
| `status` | text NOT NULL CHECK IN (`ACTIVE`,`ENDED`,`REMOVED`) |
| `delayMinSec`, `delayMaxSec` | int NOT NULL CHECK BETWEEN 5 AND 600; CHECK `"delayMinSec" <= "delayMaxSec"` |
| `timingFrom` | text NOT NULL CHECK IN (`STAKE`,`EXIT_CLOSE`) |
| `reactTo` | text NOT NULL CHECK IN (`FIRST`,`EVERY`) |
| `createdAt` | timestamptz(3) NOT NULL, written from DB `now()` in the insert |
| `effectiveFrom` | timestamptz(3) NOT NULL = `createdAt` + `TARGET_ARMING_SEC` (12 s), written in the same insert |
| `createdById`, `updatedById` | text NOT NULL |
| `updatedAt` | timestamptz(3) NOT NULL |
| `version` | int NOT NULL CHECK `>= 1`; written 1; CAS on update |
| `endedAt` | timestamptz(3) NULL |
| `endCause` | text NULL CHECK IN (`DONE`,`MARKET_CLOSED`,`CUTOFF_PASSED`,`MARKET_REOPENED`,`MARKET_GONE`,`OUT_OF_SCOPE`,`INFO_BLACKOUT`,`BOT_REMOVED`,`SUNSET`,`VETOED`,`CONSENT_VOID`) |
| `removedAt`, `removedById` | timestamptz(3) NULL, text NULL |
| `snapshot` | jsonb NOT NULL `{titleEn, category, cutoff, rawYes, rawNo}` (public fields at add) |

- **Pairing CHECKs:**
  - `(status='ENDED') = ("endedAt" IS NOT NULL AND "endCause" IS NOT NULL)`;
  - `(status='REMOVED') = ("removedAt" IS NOT NULL AND "removedById" IS NOT NULL)`.
- **Indexes:**
  - unique `hbt_active_market_uq ("marketId") WHERE status='ACTIVE'`: one targeting bot per poll (I3);
  - `hbt_market_idx ("marketId")`: the never-retarget lookup;
  - `hbt_bot_status_idx ("houseBotId","status")`;
  - `hbt_bot_created_idx ("houseBotId","createdAt")`.
- **Never-retarget rule.** A poll that has ever had a target with `status='REMOVED'` or `endCause='VETOED'` can never be targeted again, by any bot. N2 §6 refusal 13 checks it inside the locks.
- **`TARGET_ARMING_SEC = 12`** stays. It is pinned in the constants test as ≥ A24 max tolerated skew (5 s) + 2 s + the sweep's 5 s age filter (A24).

*HouseBotIntent (N1 §2 defines the rest of the table):*
- `targetId text NULL` with CHECK `("targetId" IS NULL OR kind='COUNTER')`.
- Index `hbi_target_status_idx ("targetId","status") WHERE "targetId" IS NOT NULL` (TARGET_ONCE, reaction counts, removal).
- Targeted rows set `staleAt = dueAt + 60 s` (W12).
- Targeted PLACED rows are staff-chosen. They count in `hbi_staff_bot_finished_idx` and `hbi_staff_finished_idx` (N1 §2).
- The A24 EXPLAIN pin extends to `hbi_target_status_idx` and to the three `hbt_*` indexes at 1M intents and 20k targets.

*HouseBotEvent kinds (reason always in the `reason` column, never in `payload`; `marketId` set; INT-10):*

| Kind | Written by | `actorId` | `payload` |
|---|---|---|---|
| `TARGET_ADDED` | add action | officer | `{targetId, delayMinSec, delayMaxSec, timingFrom, reactTo, effectiveFrom, pressId}` |
| `TARGET_UPDATED` | update action | officer | `{targetId, fromVersion, toVersion, changes[{field, before, after}], pressId}` |
| `TARGET_REMOVED` | remove action | officer | `{targetId, outcome:'REMOVED'\|'VETOED', cancelledIntentIds[], pressId}` |
| `TARGET_ENDED` | planner, Remove service, sunset script, holder hook, staff cancel | null (system) or officer (staff cancel) | `{targetId, endCause, previousEndCause?}` |
| `STAFF_INTENT_CANCELLED` | staff cancel; a veto by removal | officer | `{intentId, targetId?, side, stakeTzs, pressId}` |

*HouseBot and HouseBotControl:*
- `HouseBot.targetsMaxActive int NULL CHECK (NULL OR BETWEEN 1 AND 50)`.
- `HouseBotControl.gTargetsMaxActive int NULL CHECK (NULL OR BETWEEN 1 AND 200)`.
- They bound only how many targets can be ACTIVE. NULL means no target can be added (for that bot, or for any bot). Clearing one ends no target.
- Targeted reactions bet only within the staff-chosen cap family (`capStaffChosenPerDay`, `capStaffChosenDailyTzs`, `gCapStaffChosenPerDay`, `gCapStaffChosenDailyTzs`; N1 §2). A NULL staff-chosen cap means a target cannot bet. Neither family is required for master ON, and both are excluded from PLAN F3's "Set N global limits first" list.
- MON-14: `targetsMaxActive`, `gTargetsMaxActive` and every staff-chosen cap are exempt from 02 §3.8 "Can't clear a limit while bots are on" (N2 §5).

*Rules JSON v1:* `targeting: {enabled:false}`, folded into commit 1. A missing key parses as `enabled:false`, with no pause (C14).
- Target rows do **not** live in the rules JSON, for three reasons:
  1. They reference markets that die within days, and the engine must end them, but F4 forbids the engine writing rules.
  2. Target edits would clash with the rules form's `rulesVersion` CAS (C6).
  3. One-poll-one-bot needs a database uniqueness.
- COUNTER delay min = max is valid (`CROSS_FIELD_RULES` says min ≤ max).

*Presses:* target add, update and remove, and staff cancels, write a `HouseBotPress` row with purpose `TARGET_ADD`, `TARGET_UPDATE`, `TARGET_REMOVE` or `STAFF_CANCEL` (N1 §2 press flow). N2 §6 gives the target-specific steps, and N1 §6 the staff cancel.

*DAL (commit 1):* `targetStore` with `insert`, `casUpdate`, `remove`, `endActive(targetId, cause)`, `listForBot(botId, status, cursor)`, `activeForMarket(marketId)`, `everStopped(marketId)` and `countActive({botId?})`, each with a memory twin. `uniqueViolation(err)` maps `hbt_active_market_uq` on both stores (N1 §2). An unknown violation is rethrown.

#### N2 §3 Money seam (commit 2)
Nothing in H0 or H1 is target-specific. N1 §3's ordered H0 applies: status is never part of H0, so a reaction cancelled by a target removal reaches `markPlaced` and ends `house_intent_superseded`, never `house_key_mismatch`.

- **H2 (inside `wallet:<botUser>`), in the declared order pinned in `scripts/anchors/house-bot-seam.anchors.mjs` (N1 §3):**
  1. consent and RG;
  2. OWNER_POSITION, OPPOSITE_SIDE;
  3. money caps: STAKE_MIN, STAKE_MAX, PER_MARKET, BALANCE_FLOOR, DAILY_STAKE, DAILY_LOSS_PROJECTED, EXPOSURE;
  4. staff-chosen caps and TARGET_ONCE:
     - `house_cap_reached{STAFF_CHOSEN_PER_DAY}` when PLACED rows `WHERE kind='MANUAL' OR "targetId" IS NOT NULL` for this bot in the current EAT day ≥ `capStaffChosenPerDay`, or the cap is NULL;
     - `house_cap_reached{STAFF_CHOSEN_DAILY_STAKE}` when their `stakeTzs` today + this stake > `capStaffChosenDailyTzs`, or NULL;
     - `house_cap_reached{TARGET_ONCE}` for a row with `targetId` whose `decision.reactTo` is `FIRST`, when another intent with that `targetId` is PLACED;
  5. rate caps: MIN_GAP, PER_HOUR and PER_DAY (deferrable), then PER_MARKET_COUNT (terminal: it is returned even when an earlier deferrable cap also fails, N1 §3).
  - All inputs are read from the claimed row (`kind`, `targetId`, `decision.reactTo`), never passed in.
  - TARGET_ONCE is exact under `wallet:<botUser>`, because every reaction of a target belongs to its one bot.
  - It reads `decision.reactTo`, not the live target, so an update never changes a queued reaction (N2 §6).
  - A deferral is reported only when no terminal cap applies.
- **H3 (inside `market:<id>`), for a COUNTER row with `targetId`:**
  - Unchanged: trigger still OPEN (`house_trigger_gone`) and TRIGGER_BOTH_SIDES.
  - Condition: `rawPool(botSide) + stake ≤ lockedForHouse(marketId, {tx, …})[triggerSide].locked` on the lock transaction (N1 §4.1: one SQL aggregate; eligible accounts only; a stake counts once its exit window closed at least `LOCK_MARGIN_MS` = 7,000 ms ago). Else `house_condition_gone{COUNTER}`.
  - `house_info_blackout` (N1 §3) applies. It uses the raw in-lock re-read, including `reopenedAt` and a `resolveClaimedAt` younger than `RESOLVE_CLAIM_TTL_MS`.
  - **No early branch.** A targeted COUNTER is due only after the trigger's exit closed plus `LOCK_MARGIN_MS` (N2 §4), so the trigger counts as locked through the normal rule.
- **H4 (inside `house:control`):**
  - `house_cap_reached{GLOBAL_STAFF_CHOSEN_PER_DAY}` and `{GLOBAL_STAFF_CHOSEN_DAILY_STAKE}` against the control row (NULL refuses).
  - COUNTERPARTY_COUNT/TZS apply as today, keyed on the trigger account.
  - Then N1 §3's `staleAt` re-read (`NOT ("staleAt" > clock_timestamp())` → `house_intent_stale` → EXPIRED(STALE), no alert), then `markPlaced` as the first money statement.
- **Mapper rows (A10):** `{TARGET_ONCE}` → SKIPPED(CAP_TARGET_ONCE). The staff-chosen codes → SKIPPED(`CAP_<code>`). `house_info_blackout` → SKIPPED(INFO_BLACKOUT), no alert. `house_condition_gone` on a targeted row → SKIPPED(CONDITION_GONE).
- **Source pin (`test:house-bot-seam`):** the targeted H3 path sums positions only through `lockedForHouse`.
- **Registry:** `FailureDetail.cap` gains `TARGET_ONCE`. The staff-chosen codes are listed once, in N1 §3.

#### N2 §4 Engine (commit 4)
1. **Poll triggers are decided only in the sweep (MON-15).**
   - The post-commit hook keeps Up & Down triggers only. For a poll position it returns before any read.
   - The hook is suspended while this container's measured skew is over 5 s; the sweep then decides Up & Down triggers too.
   - PLAN §18 row, add: "§4.3 fast path: the post-commit hook decides Up & Down triggers only, and is suspended while skew > 5 s; poll triggers are decided only in the sweep (N2 §4)."
   - Why: targets are polls only (W13), and poll reactions are held to the exit window, so the hook's speed buys nothing there.
2. **Arming on DB time.**
   - Each sweep pass reads `passNow = now()` once. In the same snapshot as its page of positions, it loads ACTIVE targets with `createdAt ≤ passNow`.
   - A trigger counts for a target only when `placedAt ≥ max(global scopeFrom, bot scopeFrom, target.effectiveFrom)` (A11).
   - A target created after `passNow` is loaded on the next pass. Any trigger placed before its `effectiveFrom` is excluded by the same comparison, up to 12 s of skew.
   - The sweep only decides positions older than 5 s (A24), so no trigger with `placedAt ≥ effectiveFrom` can be decided before its target row exists.
   - A player who entered before the target was added, or within its 12 s arming, is never countered by it. Re-adding after an ordinary end creates a new row with a new `effectiveFrom`.
3. **Blackout and opener inputs stay outside `decide.ts` (N1 §4.1).** For each poll with an ACTIVE target in the page, the sweep calls `blackout.ts` once, in its own read. It passes `{blocked}` into `decide()`. `decide.ts` never imports `blackout.ts` or the store (source pin).
4. **`decide()` for a trigger t on poll M** (one row per trigger, index `hbi_counter_anchor_uq`):
   1. Trigger filter, unchanged: unmarked; not a live bot account; role PLAYER; not penalty-boxed; A21 HOLDER_RECRUIT.
   2. Candidates:
      - (a) the bot holding M's ACTIVE target, only if `effectiveFrom ≤ placedAt`, the bot is ACTIVE, its rules parse, `targeting.enabled`, polls product on and M's category listed;
      - (b) then scope bots (poll COUNTER mode on, category listed), in §4.4 order, excluding (a)'s bot.
      - A PAUSED bot or `targeting.enabled=false` builds no target candidate: the target is inert, with no row and no code.
   3. Evaluate the target candidate in this order:
      - schedule (W8: targets obey it);
      - COUNTER trigger stake range;
      - no-react zone;
      - exit-window fit (§4.5);
      - MARKET_HELD;
      - `blocked` → INFO_BLACKOUT;
      - cap pre-checks, including the staff-chosen caps.
      - React probability, pool band and "skip polls closing within" are **not** applied (W8).
   4. The first eligible candidate gets the COUNTER row. A target candidate's row carries `targetId`.
      - If the target candidate failed and a scope bot takes the trigger, that row's decision records `targetSkipped:{targetId, code}`.
   5. If none is eligible, write one SKIPPED COUNTER row. It carries the target candidate's code and `targetId` when one was evaluated, else the scope code (PLAN §4.3).
   6. **The insert holds the target row.** In one transaction: `SELECT 1 FROM "HouseBotTarget" WHERE id=$t AND status='ACTIVE' FOR SHARE`, then the intent insert (`ON CONFLICT DO NOTHING`).
      - If the target is no longer ACTIVE, re-run `decide()` for that trigger without candidate (a), in the same pass.
      - A removal that commits first is always seen. A removal that waits on the share lock sees the new reaction and becomes a veto (N2 §6).
      - The memory twin runs the status check and the insert under the store's single mutex (dal-parity).
5. **Timing for a targeted reaction:**
   - `delay = randomInt(delayMinSec..delayMaxSec)` (fixed when equal).
   - `requested = (timingFrom=STAKE ? placedAt : exitWindowClosesAt(t,M)) + delay`.
   - `dueAt = max(requested, exitWindowClosesAt(t,M) + LOCK_MARGIN_MS)`. **The hold is absolute.**
   - `deadlineAt = cutoff − minTimeToCutoffSec`.
   - Decidable only if `placedAt < cutoff − noReactZoneSec` (else NO_REACT_ZONE) and `dueAt ≤ deadlineAt`. Otherwise the code is EXIT_WINDOW_TOO_LATE when `requested ≤ deadlineAt < dueAt`, and CUTOFF otherwise.
   - `staleAt = dueAt + 60 s`. If `passNow ≥ staleAt` at decision (the sweep found it late), write EXPIRED(STALE) directly.
   - decision gains `{targetId, delaySec, timingFrom, reactTo, requestedDueAt, heldToExit:boolean, lockMarginMs:7000}`.
   - `why` example: "Target · Player #A3F2K8 YES 10,000 on “{title}” · asked 10 s after the stake → held to 5:07 (player's free exit + 7 s) · 80% → 8,000".
6. **Amount:**
   - Start from COUNTER's amount (% of trigger or fixed), then jitter and round-to.
   - Cut at decision to `lockedForHouse(marketId, {…, asOf: dueAt})[triggerSide].locked − rawPool(botSide)`. That is the same aggregate with the clock term replaced by `dueAt`, so the trigger's own stake counts.
   - Then clamp to the bot caps and to the staff-chosen TZS left today (`capStaffChosenDailyTzs − staffChosenToday`, `gCapStaffChosenDailyTzs − globalStaffChosenToday`), floored to round-to.
   - Below the minimum → SKIPPED(STAKE_BELOW_MIN).
   - At fire, PLAN F5 step 9 re-cuts against `lockedForHouse(marketId, {…})[triggerSide].locked` on the database clock and applies N1 §4.3's write-back clamp: shrink only, conditional on `claimedBy`, below the minimum → SKIPPED(STAKE_BOUNDS_CHANGED).
7. **Fire (PLAN F5, add for rows with `targetId`; after master, maintenance, bot, holder, market and A12 scope):**
   - Target REMOVED → CANCELLED(TARGET_REMOVED).
   - Target ENDED with `endCause` VETOED, CONSENT_VOID, BOT_REMOVED or SUNSET → CANCELLED(TARGET_ENDED).
   - Target ENDED with any other cause → continue. The fire's own market, scope, blackout and deadline checks and H2's TARGET_ONCE decide. A reaction decided before CUTOFF_PASSED still fires.
   - Blackout (with the resolve-claim term) → SKIPPED(INFO_BLACKOUT).
   - `decision.reactTo=FIRST` with a PLACED sibling → SKIPPED(CAP_TARGET_ONCE). H2 is authoritative.
   - Then `fireClaimedIntent` (N1 §4.3 step 6).
8. **Trigger exits during the hold.** H3 `house_trigger_gone` → SKIPPED(TRIGGER_EXITED) plus the penalty box (R5 event), unchanged. No house stake exists yet, so there is no free option.
9. **Planner `endTargets()`** runs every 15 s. For each ACTIVE target it runs one conditional `UPDATE … SET status='ENDED', "endedAt"=now(), "endCause"=$c WHERE id=$1 AND status='ACTIVE' RETURNING`, and appends a TARGET_ENDED event (no audit, A19). An ended target never re-arms. The first matching cause wins:
   1. `reactTo=FIRST` and a PLACED reaction with that `targetId` → DONE;
   2. market missing → MARKET_GONE;
   3. market not LIVE → MARKET_CLOSED;
   4. `reopenedAt IS NOT NULL` → MARKET_REOPENED (the A16 detection for every mode);
   5. `blackout.ts` called with `{countResolveClaim:false}` returns `blocked` → INFO_BLACKOUT. A fresh `resolveClaimedAt` alone never ends a target: that pass leaves it ACTIVE, and fire and H3 still refuse while the claim is young;
   6. A12 `inScope` false, F1 policy denied, polls product off in the bot's saved rules, or M's category no longer listed → OUT_OF_SCOPE;
   7. DB `now() ≥ lastReactableStakeAt + SWEEP_LOOKBACK_MS` (N2 §5; A11 90 s) → CUTOFF_PASSED. The lookback lets a trigger placed just before still be decided against the ACTIVE target.
   - `targeting.enabled=false`, unparseable rules and a non-ACTIVE bot leave targets ACTIVE and inert.
   - `blackout.ts` gains that input option only. Its output stays exactly `{blocked:boolean}`.
10. **Bot lifecycle:**
    - **Pause, or AUTO_PAUSED for a non-void cause:** targets stay ACTIVE and inert. PENDING and CLAIMED reactions are CANCELLED as today.
    - **Consent void (INT-11):** when `consentVoidAt` is written for SELF_EXCLUDED, COOLING_OFF, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST or HOLDER_WITHDREW (A3, C8; `holder-hook.ts`, the L2 sweep or the mapper), the same `wallet:<botUser>` transaction ends every ACTIVE target of that bot as ENDED(CONSENT_VOID), with one TARGET_ENDED event each. Re-verify and Start never revive them.
    - **Remove bot:** its targets → ENDED(BOT_REMOVED) in the Remove service transaction.
    - **Master OFF:** targets unchanged; intents CANCELLED (A9).
    - **`ops:house-bots-sunset` (F2):** targets → ENDED(SUNSET); a second run changes nothing.
    - **Start confirm (02 §3.3)** lists "Active targets: {n} →", linking to `/admin/desk/<botId>?tab=targets&status=active`.
11. **Consumed trigger.** A reaction decided from an ACTIVE target keeps its trigger, even if the target is later removed, vetoed or ended. No other bot may react to that trigger (one row per trigger; risk 18). Step 4.6 makes the removal race exact, so a trigger decided after a removal commits is never consumed by the removed target.
12. **Exact timing on Up & Down (A3):**
    - This is the chain-scoped COUNTER with delay min = max, bounds 5–600 s unchanged. `staleAt = dueAt + 30 s` (A24).
    - On 3- and 5-min rounds, and for any stake placed with less than the grace left, `exitWindowClosesAt = placedAt` and the stake is never sellable (`market-service.ts:2671`, `:2687`). So `dueAt = placedAt + delay` exactly, and the bet usually lands 2–5 s later (A24 claim rule).
    - N2 does not change the untargeted COUNTER's timing or its H3 condition. N1 §4.1 names `lockedForHouse`'s users; the untargeted COUNTER reads `lockedA15` instead.
    - `test:house-bot-engine` pins a 5 s delay on a 3-min round as PLACED. A later change that moves the untargeted COUNTER onto the 7 s margin goes red.

#### N2 §5 Rules and target fields (`rules.ts` and the pure timing function in commit 1; forms in commit 7)

| Where | Field | Default | Bounds (C1 parser) | Copy |
|---|---|---|---|---|
| rules JSON | `targeting.enabled` | false | Toggle | hint "Targets use the Counter amount and trigger range below, and the staff-chosen limits." |
| HouseBot | `targetsMaxActive` | NULL | 1–50, ≤ `gTargetsMaxActive` when set | "Between 1 and 50." · "Max active targets {n} is above the global limit {g}." · hint "Not set — no target can be added." |
| Control | `gTargetsMaxActive` | NULL | 1–200 | hint "Not set = no target can be added for any bot. Not needed to switch house bots on." |
| target | `delayMinSec` / `delayMaxSec` | 10 / 10 (add-modal prefill only) | whole seconds 5–600 (`HouseNumberField trailing="s"`; never DurationInput, C15) | "Between 5 and 600 seconds." · "Minimum delay can't be above maximum delay." · hint "Use the same number twice for an exact delay. A range makes the bot harder to spot." |
| target | `timingFrom` | STAKE (W14) | STAKE \| EXIT_CLOSE | "Counted from: The player's stake · When the player's free exit closes" |
| target | `reactTo` | FIRST (W14) | FIRST \| EVERY | "Reacts to: First stake only (until one reaction is placed) · Every stake (up to Bot A's per-market limits)" |
| rules JSON | COUNTER `delayMinSec/MaxSec` | 15–45 | 5–600, min ≤ max (equal allowed) | unchanged |

- **`CROSS_FIELD_RULES`, add:**
  - `N2-a`: `targeting.enabled` ⇒ polls product on, ≥1 category, COUNTER amount and trigger range valid, `targetsMaxActive`, `capStaffChosenPerDay` and `capStaffChosenDailyTzs` set. Copy: "Targets use the Counter amount and trigger range — set them." / "Set Max active targets to use targets." / "Set the staff-chosen limits to use targets."
  - `N2-b`: `delayMinSec ≤ delayMaxSec` (reportOn `delayMinSec`).
  - `N2-c`: `targetsMaxActive ≤ gTargetsMaxActive` when both are set. Raising a bot above the global is refused. Lowering the global is allowed through C6's preview: "{n} targets are active. With a limit of {m}, no target can be added until {n−m} are removed. No target is ended."
- **Clearing while ON (MON-14).** Clearing `targetsMaxActive` or `gTargetsMaxActive` is allowed, with the preview "No target can be added until this is set. {n} active targets keep reacting — clear a staff-chosen limit to stop them betting." Clearing a staff-chosen cap takes `house:control` briefly and shows N1 §5's preview.
- **`effectiveTargetTiming(target, {graceMin, paidMin} frozen from ratesFor(market), {noReactZoneSec, minTimeToCutoffSec}, cutoffIso, nowIso, effectiveFromIso?)`**
  - It is pure, in `src/lib/house-bot/rules.ts`, with no server imports (03 trap 2). `decide.ts` and `previewHouseBotTargetAction` both use it.
  - It returns `{earliestAfterStakeSec, latestAfterStakeSec, held:boolean, sentence, short, lastReactableStakeAt|null, armedFrom, never:boolean}`.
  - `held` is true when the `LOCK_MARGIN_MS` hold lifts `dueAt` above the requested time for `delayMinSec`.
  - `lastReactableStakeAt` is the latest instant p with `p < cutoff − noReactZoneSec` and `dueAt(p, delayMinSec) ≤ cutoff − minTimeToCutoffSec`. It evaluates both regimes (p with runway, p without).
  - `armedFrom` = `effectiveFromIso`, or `nowIso + 12 s` for an add.
  - `never` = no reactable instant at or after `armedFrom`.
  - "Usually lands" adds the A24 claim lag of 2–5 s.

*Golden rows (`test:house-bot-rules` asserts `decide.ts` gives the same seconds):*

| Market exit | Target | `short` | Sentence |
|---|---|---|---|
| grace 5, paid 0 | STAKE, 10 s | "10 s → held to 5:07" | "Held to 5:07 after each stake — the player keeps a free 5-min exit. Usually lands 5:09–5:12 after the stake." |
| grace 5, paid 0 | STAKE, 20–40 s | "20–40 s → held to 5:07" | "Held to 5:07 after each stake (asked 20–40 s) — the player keeps a free 5-min exit. Usually lands 5:09–5:12 after the stake." |
| grace 5, paid 0 | EXIT_CLOSE, 10 s | "exit + 10 s = 5:10" | "5:10 after each stake (10 s after the player's free exit closes). Usually lands 5:12–5:15 after the stake." |
| grace 5, paid 0 | EXIT_CLOSE, 5 s | "exit + 5 s → held to 5:07" | "Held to 5:07 after each stake (asked 5 s after the player's free exit closes; 50pick waits at least 7 s). Usually lands 5:09–5:12 after the stake." |
| grace 5, paid 0 | EXIT_CLOSE, 20–40 s | "exit + 20–40 s = 5:20–5:40" | "5:20–5:40 after each stake (20–40 s after the player's free exit closes). Usually lands 2–5 s after that." |
| grace 5, paid 2 | STAKE, 10 s | "10 s → held to 7:07" | "Held to 7:07 after each stake — free 5-min exit plus a 2-min paid exit. Usually lands 7:09–7:12 after the stake." |
| grace 0 | STAKE, 10 s | "10 s" | "10 s after each stake — this poll has no free exit. Usually lands 12–15 s after the stake." |
| grace 0 | STAKE, 5 s | "5 s → held to 0:07" | "Held to 0:07 after each stake (asked 5 s) — 50pick waits at least 7 s. Usually lands 0:09–0:12 after the stake." |
| any | any, `never` | "Too late" | "Can't react on this poll: a stake placed from {HH:MM:SS} EAT would be held past Bot A's cutoff ({HH:MM} EAT)." |

- Every non-`never` sentence appends "Armed from {HH:MM:SS} EAT." and "Stakes placed after {HH:MM:SS} EAT aren't reacted to."
- When `noReactZoneSec < graceMin × 60`, it also appends "From {HH:MM:SS} EAT a stake has no free exit, so Bot A reacts {delay} s after it."
- The rules-tab preview adds the Up & Down COUNTER line "3-min rounds: exactly {n} s after the stake (usually +2–5 s)".
- The COUNTER `effectiveTiming()` rows for polls are unchanged.

#### N2 §6 Owner actions (commit 7, `src/app/admin/desk/actions.ts`)
Every action starts with `requireHouseOwner()` (C12). Then it validates input (reason 5–300 code points, C2; ids and `submitId` format), then runs N1 §6's press flow:
- The press is inserted CHECKING before any other read.
- A refusal marks the press `REFUSED` with its code; one found inside the locks first rolls the transaction back.
- A duplicate `submitId` returns SUBMIT_ID_REUSED, "Still checking this press…", the stored refusal, or the current target state with `duplicate:true`.
- The successful write moves the press to `DONE` with `targetId` (or `intentId`) inside the write transaction.

`runAdminAction` maps `UnrecognizedActionError` to STALE_BUILD. Every `href` below is absolute.

**Locks and audit order (MON-05), for add, update, remove and staff cancel:**
1. `SET LOCAL lock_timeout = '3s'`, then take `wallet:<botUser>`, then `house:targets`. Bets never take `house:targets`. No target action takes `house:control`.
2. Re-read the target row `FOR UPDATE`. Run the in-lock checks. Insert, CAS-update or remove. Append the events, each carrying `pressId`. Move the press to DONE (`WHERE id=$1 AND state='CHECKING'`; 0 rows → roll back and return the press's current state). Commit.
3. A lock timeout (55P03) → refusal `BUSY` "Bot A is placing a stake right now — nothing changed. Try again in a few seconds."
4. After the locks are released, write the awaited COMPLIANCE audit through the press lease (N1 §6 press flow step 6), then send the roster alert (N2 §7). The planner repairs a DONE press whose `auditId` is null.
5. A19's source scan ("no `audit(` inside a `withLock` callback") extends to `src/app/admin/desk/**` and `src/lib/server/house-bot/**`.
6. `gTargetsMaxActive` is a plain read, not under `house:control`. A concurrent lowering can leave the count above the new limit, which C6's preview already allows.

| Export | Input | Writes | Audit (R7 COMPLIANCE) |
|---|---|---|---|
| `previewHouseBotTargetAction` | botId, marketId (or targetId for Edit), delayMinSec, delayMaxSec, timingFrom, reactTo | none (0 rows, pinned) | none |
| `addHouseBotTargetAction` | botId, marketId, delayMinSec, delayMaxSec, timingFrom, reactTo, reason, submitId | target, TARGET_ADDED, press | `house_bot.target_added` {botId, marketId, targetId, delayMinSec, delayMaxSec, timingFrom, reactTo, reason} |
| `updateHouseBotTargetAction` | targetId, version, delayMinSec, delayMaxSec, timingFrom, reactTo, reason, submitId | CAS update, TARGET_UPDATED, press | `house_bot.target_updated` {botId, marketId, targetId, changes[{field, before, after}], reason} |
| `removeHouseBotTargetAction` | targetId, reason, submitId | REMOVED or ENDED(VETOED), cancels, TARGET_REMOVED, STAFF_INTENT_CANCELLED per cancelled reaction, press | `house_bot.target_removed` {botId, marketId, targetId, outcome, cancelled[{intentId, side, stakeTzs}], reason} |
| `cancelHouseBotIntentAction` on a staff-chosen intent (kind MANUAL or `targetId` not null) | intentId, reason, submitId | CANCELLED(CANCELLED_BY_ADMIN), STAFF_INTENT_CANCELLED, target ENDED(VETOED) + TARGET_ENDED when `targetId`, press | `house_bot.staff_intent_cancelled` {botId, marketId, intentId, side, stakeTzs} (N1 §6) |

- **`previewHouseBotTargetAction` (UX-06).**
  - Computed on the server with `ratesFor(market)` (frozen rates, never the live exit settings) and the bot's saved rules, via `effectiveTargetTiming`.
  - Returns `{ok, sentence, short, held, never, lastReactableStakeAtEat, armedFromEat, serverNow, refusal?}`. `refusal` uses the add refusal codes and copy for steps 4–12.
  - The client calls it 250 ms after the last field change, with a sequence number, and drops out-of-order answers.
  - The file joins `blackout.ts`'s pinned importer list.
- **`addHouseBotTargetAction` refusals, in order** (each `{ok:false, code, error, field?, data:{href?}}`):
  1. Guard: REAUTH_LOGIN / REAUTH_TOTP / NOT_OWNER (C12). No press row.
  2. Input:
     - `REASON_INVALID` field `reason`: "Give a reason (5 to 300 characters).";
     - `BAD_REQUEST`: "Something was wrong with this request — reload and try again.";
     - C1 field errors on the delays (N2 §5 copy). No press row.
     - Schema not ready (`houseBotSchemaReady()` false) → `ENGINE_DISABLED` "The bot engine is disabled on this server." No press row.
  3. Press insert and duplicates (N1 §6): `SUBMIT_ID_REUSED` "This request id was already used for a different action. Reload and try again."
  4. `WITHDRAWN`: "House bots are withdrawn."
  5. Bot:
     - `BOT_MISSING` "That bot no longer exists.";
     - `BOT_REMOVED` "This bot was removed.";
     - PAUSED and AUTO_PAUSED are allowed: the target stays inert until Start.
  6. Rules:
     - `RULES_FROM_FUTURE` "Bot A's rules were saved by a newer 50pick build (v{n}). Targets can't be added until that build is back.";
     - `RULES_REVIEW` "Bot A's rules need review: Rules → Save." href `/admin/desk/<botId>?tab=rules`.
  7. `TARGETING_OFF`: "Targets are off for Bot A. Turn them on in Rules →" (field `targeting.enabled`, href `/admin/desk/<botId>?tab=rules`).
  8. Limits not set:
     - `TARGETS_LIMIT_UNSET` "Set Bot A's Max active targets first →" (field `targetsMaxActive`, href `/admin/desk/<botId>?tab=rules`);
     - `GLOBAL_TARGETS_LIMIT_UNSET` "Targets are off for every bot: set Max active targets (all bots) first →" (field `gTargetsMaxActive`, href `/admin/desk?tab=limits`);
     - `STAFF_CAPS_UNSET` "Set Bot A's staff-chosen limits first — without them a target can't bet →" (field `capStaffChosenPerDay`, href `/admin/desk/<botId>?tab=rules`);
     - `GLOBAL_STAFF_CAPS_UNSET` "Staff-chosen stakes are off for every bot: set the staff-chosen limits first →" (field `gCapStaffChosenPerDay`, href `/admin/desk?tab=limits`).
  9. Market (`PublicMarketView` + A12):
     - `MARKET_MISSING` "That poll no longer exists.";
     - `NOT_POLL` (an Up & Down id) "Targets are for polls only. For exact timing on Up & Down, set the Counter delay in Rules.";
     - `PRODUCT_DENIED` (demo or F1 denied) "House bots can't enter this market.";
     - `MARKET_NOT_LIVE` "Only live polls can be targeted.";
     - `NO_CUTOFF` "This poll takes stakes until its result, so the house stays out."
  10. Scope:
      - `SCOPE_PRODUCT` "Bot A isn't set up for polls. Turn them on in Rules →";
      - `SCOPE_CATEGORY` "{Sports} isn't in Bot A's scope. Add it in Rules first →" (both href `/admin/desk/<botId>?tab=rules`).
  11. Blackout (N1 §3): `INFO_BLACKOUT` "Not available: an AI result check is recorded on this market.", or, when `reopenedAt` is set, "Not available: this market was reopened after a result check."
  12. `TOO_LATE` (`never`): "Too late to target this poll: a stake placed from {HH:MM:SS} EAT would be held past Bot A's cutoff ({HH:MM} EAT)."
  13. Inside the locks, never-retarget: `TARGET_STOPPED_BEFORE` "This poll's target was stopped at {HH:MM} EAT; it can't be targeted again."
  14. Inside the locks, holding:
      - `HELD_BY_OTHER` (another bot's ACTIVE target, house position or live intent) "{Bot B} already holds this poll. One bot per market.";
      - `ALREADY_TARGETED` "Bot A already targets this poll.";
      - `OWNER_POSITION` "The holder has their own open stake on this poll, so Bot A can't react there.";
      - a `uniqueViolation` on `hbt_active_market_uq` rolls back, re-reads the ACTIVE row and returns one of the first two.
  15. Inside the locks, counts:
      - `TARGETS_LIMIT_REACHED` "Bot A has {n} of {max} active targets. Remove one or raise the limit →" (field `targetsMaxActive`, href `/admin/desk/<botId>?tab=rules`);
      - `GLOBAL_TARGETS_LIMIT_REACHED` "House bots have {n} of {g} active targets. Remove one or raise the limit →" (field `gTargetsMaxActive`, href `/admin/desk?tab=limits`).
  16. `BUSY` (lock timeout).
  - **Success:** `{ok:true, data:{targetId, armedFromIso, armedFromEat, sentence, short}}`. Copy: "Target added on “{title}”. Armed from {HH:MM:SS} EAT — {sentence}". "Armed from" comes only from this response.
- **`updateHouseBotTargetAction`:**
  - Refusals, in order: guard; input; press; `WITHDRAWN`; `TARGET_MISSING` "That target no longer exists."; `TARGET_REMOVED` "This target was removed."; `TARGET_ENDED` "This target already ended: {end-cause caption}."; `TOO_LATE` for the new timing; in the locks, CAS → `STALE_VERSION{savedBy, savedAt, changedFields, current}` "{name} changed this target at {HH:MM}. Review, then save again."; `BUSY`.
  - No field changed → ok no-op "Nothing changed." The press goes DONE; no event, no audit.
  - Success: "Target updated — applies to stakes decided from now on. Queued reactions keep the timing they were decided with."
  - A queued reaction keeps its `dueAt` and `decision.reactTo`, so changing EVERY → FIRST can never skip a queued reaction.
- **`removeHouseBotTargetAction`** (target-state semantics, no CAS; it runs even while `WITHDRAWN`, because it only reduces risk, F2):
  - Refusals: guard; input (reason required); press; `TARGET_MISSING`; `BUSY`.
  - ok no-ops: REMOVED → "Already removed."; ENDED → "Already ended: {caption}."
  - **In the locks:** count this target's PENDING and CLAIMED reactions.
    - 0 → `status='REMOVED'`, `removedAt`, `removedById`.
    - More than 0 → `status='ENDED'`, `endCause='VETOED'`. Conditionally cancel those rows (`status IN ('PENDING','CLAIMED')`) → CANCELLED(TARGET_REMOVED), with one STAFF_INTENT_CANCELLED event each.
    - The server count decides, even if the dialog showed none.
  - **Success:**
    - REMOVED: "Target removed. Bot A won't react on “{title}” again, and this poll can't be targeted again."
    - VETOED: "Target stopped. {n} queued reaction(s) cancelled — recorded as a veto. A reaction already in its final step may still complete. This poll can't be targeted again."
  - A CLAIMED reaction already holding `wallet:<botUser>` commits first and is seen as PLACED. One cancelled before `markPlaced` ends `house_intent_superseded` (N1 §3 H0).
- **`cancelHouseBotIntentAction` on a staff-chosen intent:** specified once in N1 §6 "Staff cancels" and N1 §8 (`staff-cancel-modal.tsx`), for MANUAL and targeted rows alike.
- **R7:**
  - `HOUSE_AUDIT` gains `target_added`, `target_updated`, `target_removed` and `staff_intent_cancelled`, all COMPLIANCE.
  - The payload allowlist gains `changes` and `cancelled`. N1 §6 adds the other keys.
  - Never a label, note or name.
- **No typed confirmation word** (no early-entry switch exists).
- **Status (C11):** `getHouseBotStatusAction` returns `targets:{enabled, active, max, gMax, available, reason?}`. `available` evaluates add steps 4–8 without a market (UX-20).
- **Uncertain results:** the target and cancel modals use C11's 8 s / 45 s runner states. "Check now" calls `getEnterNowStatusAction(botId, submitId)`, which reads the press whatever its purpose. For a TARGET_* press it returns `{state, code?, targetId?, target?:{status, version}}`. A CHECKING press shows "Still checking", never "Not saved".

#### N2 §7 Notifications (commit 4; `comms-registry` rows; C13 matrix rows; never SMS)
- **`notifyAdminsHouseBotRoster`, add TARGET_ADDED, TARGET_UPDATED and TARGET_REMOVED** (N1 §7, UX-07). Also TARGET_ENDED with `endCause=VETOED` from a staff cancel.
  - Audience and channel: every `houseBotAlertRecipients()`, bell + email, uncapped, title ending HH:MM:SS.
  - Href: `/admin/desk/<botId>?tab=history&event=<eventId>`.
  - Titles:
    - "Bot A: target added on “{title}” — 10 s after each stake (held to 5:07), first stake only · by {name} at 14:02:11 EAT";
    - "Bot A: target on “{title}” changed — delay 10 s → 20–40 s · by {name} at 14:05:40 EAT";
    - "Bot A: target on “{title}” removed · by {name} at 14:09:03 EAT";
    - "Bot A: target on “{title}” stopped with {n} queued reaction(s) cancelled (veto) · by {name} at 14:09:03 EAT".
  - Body ends "Reason recorded in this bot's history →". It never quotes the reason (INT-10).
- **TARGET_ENDED from the planner, Remove service or sunset:** no alert (history and targets tab).
- **CONSENT_VOID:** the existing auto-pause alert body adds "Its {n} active targets were ended." when n > 0.
- **Reactions.** A PLACED targeted row alerts through `notifyAdminsHouseBotStaffChosen`, after the A8 `alertedAt` claim.
  - Every recipient, bell + email, uncapped, not counted in `countInHour`.
  - Title and body: N1 §7 `notifyAdminsHouseBotStaffChosen`, using its "target by {name}" and "a counter to Player #{handle}'s TZS {t} {SIDE} stake" branches, with " (asked {delay}, held to {h})" added after the side rule.
  - Href: `/admin/desk/<botId>?tab=activity&range=all&intent=<intentId>`.
  - `notifyAdminsHouseBotBet` excludes staff-chosen rows. ~~The holder notice `notifyHouseBotOwnerStake` is unchanged and capped.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** `notifyHouseBotOwnerStake` is deleted, and the holder receives no house-bot notice (C4 ruling 149).
  - Targeted rows count as staff-chosen for N1 §7's `staff-stake-voided`, `staff-stake-self-decided` ~~and `staff-edge`~~ alerts, with `requestedBy` = the target's `createdById`. ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge alert is struck (C5-SPEC rulings 218–223).
- **Skipped, expired or cancelled reactions:** no bell. The feed ~~and R1~~ record them. ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1 is struck (C5-SPEC rulings 199–213); the activity feed records them.
- `{holder}` is the `playerHandle` only (R6). Every href renders 60 days later (C13 test).

#### N2 §8 Console (commit 7; 03 law)
**Targets tab**
- **Tab order on `/admin/desk/[id]`:** overview · rules · targets · activity · money · history. `targets` shows a `CountBadge` with the active count.
  - The tab is found through `data-section-rail`, so `routes.mjs` gains no `?tab=`. Update `test:section-rail` and `test:tab-anchors`.
  - It is a tab, not part of the rules tab, because targets save per row. The rules form's singleton `PendingChangesBar` (03 trap 17) and C11's no-refresh-while-dirty rule would otherwise swallow target changes.
- **Params (UX-07):**
  - `status=active|ended|all`, whitelisted, default `active`; `ended` includes removed targets.
  - `target=hbt_…`, format-checked. When present, the page picks the status filter that contains the target, highlights its row and scrolls it into view.
  - If the target no longer exists: neutral Callout "That target no longer exists."
- **Head action** "Add target" (`Button md primary`), per UX-20:
  - not rendered while `targeting.enabled` is false;
  - when rendered but `targets.available` is false, disabled, with the visible reason beneath (limit reached, limit not set, staff-chosen limits not set, bot removed, rules need review, withdrawn).
- **FilterPill** "Active · Ended · All".
- ~~**Board line (N1 §10):** amber, non-blocking, "Board disclosure of staff-chosen stakes not recorded as sent", shown until `boardDisclosureSections` contains "Stakes chosen by staff".~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the targets tab shows no Board line (see N1 §10).
- **Table:** `AdminCard padding="p-0"` › `ScrollX label="Targeted polls"` › `.admin-tbl`, no `min-w`. Columns:
  - Poll: title (wraps) + category caption;
  - Staked: money second, `td.tabular`, sum of PLACED reaction stakes, "—" when none;
  - Reactions: `td.tabular` "1 placed · 2 skipped · 1 cancelled";
  - Timing: the `short` form, e.g. "10 s → held to 5:07";
  - Reacts to: "First stake only" / "Every stake";
  - Status: chip + end-cause caption beneath;
  - Added: by {name}, EAT time;
  - Actions: `Button xs ghost` "Edit" and "Remove", ACTIVE rows only.
  - Each "SIDE TZS x" and "TZS x" group is a nowrap span with `.amount` on the figure, wrapping only at " · " (UX-19).
- **Empty states:**
  - "No targeted polls. Add one to have Bot A react to stakes on a specific poll.";
  - with targeting off: "Targets are off for Bot A. Turn them on in Rules →" (href `/admin/desk/<botId>?tab=rules`);
  - read failure: `AdminLoadError what="the targets"`.
- **Pagination:** `AdminPagination` 20 rows, keyset cursor (C7).

**Lexicon (UX-17; `src/lib/house-bot/feed-copy.ts` and the status lexicon, typed `satisfies Record<…, string>`):**

| Status | Chip word | Tone key |
|---|---|---|
| ACTIVE | Active | `HOUSE_TARGET_ACTIVE` (admin green) |
| ENDED | Ended | `HOUSE_TARGET_ENDED` (slate) |
| REMOVED | Removed | `HOUSE_TARGET_REMOVED` (slate) |

| End cause | Caption |
|---|---|
| DONE | "Reacted once — done" |
| MARKET_CLOSED | "Poll closed" |
| CUTOFF_PASSED | "Too close to betting close" |
| MARKET_REOPENED | "Poll was reopened" |
| MARKET_GONE | "Poll no longer exists" |
| OUT_OF_SCOPE | "No longer in {label}'s scope" |
| INFO_BLACKOUT | "An AI result check was recorded" |
| BOT_REMOVED | "Bot removed" |
| SUNSET | "House bots withdrawn" |
| VETOED | "Stopped by staff (veto) — can't be targeted again" |
| CONSENT_VOID | "Holder's permission ended" |

*Feed sentences for targeted rows (prefix "Target: " or "Target on “{title}”: "):*
- PLACED: "Target: Bot “Bot A” countered a TZS 10,000 YES stake by Player #A3F2K8 on “{title}” with TZS 8,000 NO — asked 10 s, held to 5:07 (player's free exit), placed 5:10 after the stake". Lateness = `position.placedAt − requestedDueAt`.
- SKIPPED(CAP_TARGET_ONCE): "Target on “{title}”: Bot A didn't react to Player #A3F2K8 — it reacts to the first stake only, and one reaction is already placed."
- CANCELLED(TARGET_REMOVED): "Target on “{title}”: queued reaction cancelled — the target was stopped by {name}."
- CANCELLED(TARGET_ENDED): "Target on “{title}”: queued reaction cancelled — the target ended ({caption})."
- SKIPPED(INFO_BLACKOUT): "Target on “{title}”: not placed — an AI result check is recorded on this market. Nothing moved."
- EXPIRED(STALE): "Target on “{title}”: not placed — 50pick couldn't place it within 60 s of its time. Nothing moved."
- SKIPPED(CAP_STAFF_CHOSEN_PER_DAY | _DAILY_STAKE): "Target on “{title}”: not placed — Bot A has used today's staff-chosen limit ({n} · TZS {x}). It resets at 00:00 EAT."
- SKIPPED(CAP_GLOBAL_STAFF_CHOSEN_*): "Target on “{title}”: not placed — house bots have used today's staff-chosen limit. It resets at 00:00 EAT."
- CANCELLED(CANCELLED_BY_ADMIN) targeted: "Target on “{title}”: queued reaction ({SIDE} TZS {x}) cancelled by {name} — recorded as a veto; the target stopped."
- A scope row with `targetSkipped` adds: "Bot A's target didn't react: {code sentence}."
- Any other code on a targeted row: "Target on “{title}”: not placed — {sentence}. Nothing moved.", where `{sentence}` is N1 §8's sentence for that code without its "{Entry} not placed: " prefix.
- `test:labels`, `test:chip-contract` and FAILURE-INVENTORY §7.1 (HouseBotTarget statuses and end causes) are updated in commits 7 and 8.

**Add / Edit target modal** (`Modal maxWidth={420} closeOnScrim={false} labelledBy={titleId}`, modal-local runner, never ActionOverlay while open):
1. Eyebrow "Target". Title "Add a target for Bot “{label}”" / "Edit target on “{title}”".
2. `Field label="Poll"` › MarketPicker `purpose="target"` (Add only). Polls only; Up & Down excluded, not greyed (N1 §8, UX-12). The selection contract applies (UX-01; TGT-33).
   - Greyed reasons: N1 §6 `searchHouseBotMarketsAction` reasons 1–7 and 10 (purpose `target`).
   - Edit shows the poll title as text.
3. Two `HouseNumberField trailing="s" size="md"`: "Delay from" / "to".
4. "Counted from" and "Reacts to" as in-flow two-option choices (UX-14): a `Field` with `role="group"` and two `Button md` toggles with `aria-pressed`, each ≥44 px, stacking at 360. No kit Select and no portal.
   - Captions: "The player's stake" / "When the player's free exit closes"; "First stake only (until one reaction is placed)" / "Every stake (up to Bot A's per-market limits)".
5. Timing: `Callout tone="info" size="sm" role="note"` with `sentence` from `previewHouseBotTargetAction`. `SkLine` while loading. "Checked {HH:MM:SS} EAT" caption. A `refusal` shows as `Callout size="sm"` tone warning (tone danger for blackout) with its copy and fix link.
6. `HouseTextField` "Reason" (C2, counter "{n} / 300", hint "Kept permanently in the audit log — don't write the holder's name or number.").
7. Buttons: `Button md primary` "Add target" / "Save" and `Button md ghost` "Cancel"; stacked full-width at 360 (`flex-col-reverse`).
   - The primary is disabled while the preview loads, while `never=true`, while a refusal shows, while the reason is invalid and while busy.
   - `useRef` latch. One `crypto.randomUUID()` submitId per attempt; a new one is minted after any definitive answer.

**Remove target modal** (same primitive): title "Remove target on “{title}”?"
- With queued reactions: warning Callout "Bot A has {n} queued reaction(s) here ({SIDE} TZS {x}, due {HH:MM:SS} EAT). Removing now cancels them and is recorded as a veto."
- Always: "This poll can't be targeted again by any bot."
- Reason field. Button `Button md` claret-toned "Remove target" (irreversible, §B4a).

**Staff cancel modal:** N1 §8 (`staff-cancel-modal.tsx`).

**Behaviour rules for these dialogs:**
- **Unsaved rules (C10, UX-09).** While `HouseBotFormContext` is dirty, "Add target" and "Edit" first open C10's dialog: "You have unsaved changes on Rules. Targets use the saved rules (v{n}: Counter amount {amount}; trigger range TZS {min}–{max}; categories {list}), not your edits." Choices: "Save and continue" (opens the modal only if the save returns ok) · "Continue with saved rules" · "Cancel".
- **Open dialog counts as dirty (UX-04).** Any open target, remove or cancel dialog marks `HouseBotFormContext` dirty. C11 shows its change Callout instead of `50pick:refresh`, and runs exactly one refresh when the dialog closes. The dialog lives in a component that stays mounted whatever the refreshed props say.
- **Focus and announcement (UX-10).** `ariaBusy` while submitting. A result or refusal renders a heading with an id and `tabIndex=-1`, which receives focus. Final outcomes are announced once through C7's single polite region (03 §4 amended: "Enter now and target results announce once, politely"). Field errors use `focusFirstInvalid`.
- **Fix links (UX-11).** Every fix link closes the modal first (its submitId is discarded; the reason draft persists), then `router.push(absolute href)`, then `focusFirstInvalid` after render.
- **Drafts (C12).** sessionStorage `hb:draft:/admin/desk/<botId>:target-add`, `:target-edit:<targetId>`, `:target-remove:<targetId>` and `:staff-cancel:<intentId>` hold reason and fields, never a submitId. REAUTH, NOT_OWNER and STALE_BUILD show C12 copy.
- **Success.** The body is replaced by the success Callout + "Done" (closes, then the single refresh).

**Other surfaces:**
- **Rules tab:** AdminCard "Targets" with a Toggle row "Targets", its hint, and "Active targets: {n} →" (href `/admin/desk/<botId>?tab=targets&status=active`). The Limits group gains `targetsMaxActive`.
- **Limits tab (`/admin/desk?tab=limits`):** `gTargetsMaxActive`, and the C6 previews of N2 §5.
- **Activity feed:** `entry=target` filter (N1 §8). The Cancel button on staff-chosen rows opens the staff cancel modal.
- **History tab:** TARGET_* and STAFF_INTENT_CANCELLED events with actor and reason; `event=<eventId>` highlights its row (C13).
- **Gate outcomes (UX-13):**
  - `[botId]/targets-tab.tsx`, `target-modal.tsx`, `target-remove-modal.tsx` and `staff-cancel-modal.tsx` call `useMayAct()` before any early return;
  - `market-picker.tsx` takes `mayAct` as a prop;
  - a modal file rendering a raw `<Input|<Textarea|<Select` gets a class-① EXEMPT entry: "① fields open inside <Modal>, scrim-close disabled, and the reason survives Cancel via the C12 draft"; a file rendering none gets no entry.
- **Visual fixtures (C7, UX-19; at 360, 768 and 1280, plus 320 for the modal):**
  - targets tab with 0 rows (targeting on and off) and n rows with every status and end cause;
  - highlighted row and "That target no longer exists";
  - Add target enabled, and disabled with its reason;
  - the modal with each golden timing row, `never`, a refusal, loading, ~~and the board line~~; ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no board line (see N1 §10).
  - the remove modal with and without queued reactions;
  - the staff cancel modal;
  - the modal at 360×300 with the keyboard up.
  - Modals are NOT MEASURED in phase C and are driven in phase D against the local seeded database.

#### N2 §9 Reporting (commit 5) and §10 Public text (commit 6)
⛔ **Superseded by D20 (Ali, 2026-09-17):** struck and never built: R1's "Targets register", "Vetoes" and the targeted rows of R1's scorecard and section (e) (C5-SPEC rulings 202, 206), the R9 `houseStake.staffChosen` counting (187–191), and the DSAR (R5) bullets, whose last home was the owner-only internal record (236–239). The Book bullet stays only if checkpoint C5-5b keeps the entry split. **Not touched by D20:** the Erasure bullet, the Board section's and COMPLIANCE entry's target coverage, and the Docs (commit 8) bullets; the privacy-line bullet is D19's (PROGRESS.md "OWNER RULING D19").

- **Book:** entry `TARGETED` = COUNTER with `targetId` (N1 §9 split).
- **R1 "Targets register":** one row per target:
  - poll id and title, bot;
  - added by and at (EAT), timing (delays, `timingFrom`), `reactTo`;
  - ended or removed at, cause, by;
  - reactions placed, skipped and cancelled;
  - staked, net once settled;
  - reason.
- **R1 "Vetoes"** per officer, from STAFF_INTENT_CANCELLED events: time, poll, bot, side vetoed, stake, how (cancel | target removal), reason.
- **R1 scorecard and "markets decided by the officer who chose a house stake"** include targeted rows (N1 §9).
- **R9 / sanctioned (q):** targeted PLACED stakes count into `houseStake.staffChosen`, with `requestedBy` including the target's `createdById`. The shape is exactly `{yes, no, staffChosen:{yes, no, requestedBy:string[]}}` (N1 §9).
- **DSAR (R5):**
  - the holder's `events[]` includes TARGET_ADDED, TARGET_REMOVED and TARGET_ENDED as `{kind, at, actor:'50pick owner'}`, with no reason and no marketId;
  - it excludes TARGET_UPDATED, STAFF_INTENT_CANCELLED and every HouseBotPress row;
  - holder `positions` include targeted rows with no officer ids;
  - trigger players' `counteredPositionsCount` includes targeted counters.
- **Erasure:** target event and press reasons become "[erased]" (`test:erasure` §8 bucket, N1 §9).
- **Public text:** ~~N1 §10's privacy line covers "markets chosen … by 50pick staff".~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no public text about targets; the private Board section and the COMPLIANCE entry below cover them.
  - The Board section "Stakes chosen by staff" covers targets: the 5–600 s delays, the absolute hold with the 7 s margin, first or every stake, vetoes and never-retarget, and the staff-chosen caps.
  - The COMPLIANCE entry records D18 with risks 17 (fixed-delay predictability) and 18 (consumed trigger); risks 13 and 20 apply to target choice (PLAN §16b).
- **Docs (commit 8):**
  - HOUSE-BOTS.md targets section (model, engine order, end causes, runbook "stop all targets": clear a staff-chosen limit);
  - FLOWS §9 rows for add, update, remove and staff cancel;
  - FAILURE-INVENTORY §6 target refusal codes;
  - FAILURE-INVENTORY §7.1 HouseBotTarget statuses and end causes;
  - P3 DATA-RETENTION row.

#### N2 Tests
- **`test:house-bot-rules`:**
  - delay bounds × {"", "0", 4, 5, 600, 601, 2^53}, equal allowed;
  - `N2-a`, `N2-b`, `N2-c`;
  - `effectiveTargetTiming` equals `decide.ts` on every golden row, including the 7 s hold;
  - `lastReactableStakeAt` in both regimes (no-react zone 15 min and 0 min);
  - constants: `LOCK_MARGIN_MS = 7000` ≥ A24 max skew + 2 s; `TARGET_ARMING_SEC = 12`;
  - COUNTER min = max valid;
  - v1 JSON missing `targeting` → `enabled:false`, no pause.
- **`test:house-bot-migrations`:**
  - 8 tables;
  - target CHECKs reject delay 4 and 601 and a status/`endedAt` mismatch, and accept VETOED and CONSENT_VOID;
  - `hbt_active_market_uq` rejects a second ACTIVE target on a poll;
  - the `targetId` CHECK rejects a FILL row with a target;
  - replay twice.
- **`test:dal-parity` (commit 1):**
  - every `targetStore` function on both stores;
  - `uniqueViolation` returns `hbt_active_market_uq` on both stores; an unknown violation is rethrown;
  - the sweep's share-locked insert twin.
- **`test:house-bot-seam`:** the H2 order anchor includes STAFF_CHOSEN_* and TARGET_ONCE in group 4; source pin: the targeted H3 sums only through `lockedForHouse`.
- **`test:house-bot-caps` (Postgres + memory):**
  - FIRST with two reactions firing concurrently → 1 PLACED + 1 SKIPPED(CAP_TARGET_ONCE);
  - EVERY stops at `freqMaxPerMarket` with SKIPPED(CAP_PER_MARKET_COUNT);
  - COUNTERPARTY caps bind a targeted reaction;
  - one bot with `capStaffChosenPerDay=2`, 1 MANUAL PLACED, then 2 targeted reactions on two polls spaced beyond min gap → 1 PLACED + 1 SKIPPED(CAP_STAFF_CHOSEN_PER_DAY); a 10-bot global burst gives the global code;
  - clearing `gCapStaffChosenPerDay` while ON with a PENDING targeted reaction → SKIPPED, 0 positions, automated intents untouched (MON-14);
  - a cash-out racing a targeted reaction at the lock boundary on two processes with clocks +5 s and −5 s → no house stake ever counted money that was then refunded (MON-06);
  - blackout stamp before the lock → `house_info_blackout`;
  - target removal injected between F5 and H0 → CANCELLED or superseded, 0 SECURITY rows, master ON (MON-01);
  - `wallet:<botUser>` held 70 s → EXPIRED(STALE), 0 positions (MON-03);
  - with the audit queue delayed 5 s, `addHouseBotTargetAction` concurrent with a house bet and a holder withdrawal → both finish in under 1 s (MON-05).
- **`test:house-bot-engine`:**
  - a trigger 1 s before `effectiveFrom` → 0 target rows; 1 s after → 1;
  - an 8 s bettor skew → the target reacts to a stake after arming and never to one before;
  - a poll position passed to the hook → 0 rows; the sweep decides it;
  - a stake 1 s after a removal commits on a second process → the scope bot may react, 0 CANCELLED(TARGET_REMOVED);
  - a removal racing the share-locked insert → either no targeted row, or the removal returns VETOED;
  - target + scope bot on one trigger → exactly 1 row, target first; target outside its schedule → the scope bot takes it with `targetSkipped`;
  - timing: 10 s STAKE on a poll → `dueAt = placedAt + 307 s`; EXIT_CLOSE 10 s → +310 s; EXIT_CLOSE 5 s → +307 s; grace 0 STAKE 5 s → +7 s;
  - an Up & Down 3-min COUNTER 5/5 → +5 s and PLACED;
  - the trigger cashes out during the hold → TRIGGER_EXITED + PENALTY_BOXED event, 0 house positions;
  - the fire clamp shrinks a reaction: row `stakeTzs` = `Position.stake`, master ON, 0 SECURITY rows (MON-02);
  - each end cause within one planner pass;
  - a fresh `resolveClaimedAt` alone → the target stays ACTIVE and the fire is SKIPPED(INFO_BLACKOUT); a claim older than the TTL → neither (INT-09);
  - re-check, then reopen → ENDED(MARKET_REOPENED), and Add target refused with INFO_BLACKOUT and the reopened copy (TGT-34);
  - a reaction decided before CUTOFF_PASSED still fires;
  - update EVERY → FIRST with 1 PLACED and 1 queued → the queued one places;
  - pause keeps ACTIVE; remove bot → BOT_REMOVED; sunset → SUNSET, a second run changes nothing;
  - a sweep late beyond `staleAt` → EXPIRED(STALE);
  - source pin: `decide.ts` imports neither `blackout.ts` nor the store.
- **`test:house-bot-console`:**
  - the 5 actions of N2 §6 × 8 non-owner roles → refused with SECURITY rows and 0 target, event or press rows; REAUTH without a redirect;
  - add refusal order (a fixture per step asserts the first refusal wins);
  - never-retarget after REMOVED, after VETOED by removal and after a staff cancel, for the same bot and for another bot;
  - press duplicates: CHECKING, a REFUSED replay, DONE with `duplicate:true`, SUBMIT_ID_REUSED;
  - CAS STALE_VERSION; repeat remove is a no-op;
  - remove with a queued reaction → VETOED + cancels, reason required;
  - staff cancel writes STAFF_INTENT_CANCELLED + COMPLIANCE and ends the target VETOED;
  - preview with frozen grace 5 and live grace 3 → "Held to 5:07…"; preview writes 0 rows (source pin + DB count);
  - `target=` pointing at a REMOVED target renders its row under Ended; a missing id shows the Callout; tab order pinned;
  - jsdom: Esc inside the choice group keeps the modal and typed values; dirty form + Add target → C10 dialog, and a refused save never opens the modal (spy); an HOUSE_BOT SSE event with the modal open → 0 refreshes, then exactly 1 on close; focus on the result heading and one polite announcement; a fix link closes the modal, pushes the absolute href, then focuses;
  - gate pins: `useMayAct` in each file, EXEMPT class ① or no raw control;
  - the A19 scan over the two extended globs; source pin: no target action takes `house:control`;
  - no gold; ~~a board-line fixture with a date but no section still shows the line;~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no board line (see N1 §10).
  - the Start confirm lists the active target count.
- **`test:house-bot-comms`:**
  - roster TARGET_* reach both admins by bell + email, uncapped, with an href resolving at +60 days;
  - a targeted PLACED row → `notifyAdminsHouseBotStaffChosen` to both admins, `countInHour` unchanged, 0 `notifyAdminsHouseBotBet` rows;
  - no reason text in any body; 0 SMS.
- **`test:house-bot-designation`** (commit 3):
  - each of the 5 void causes ends every ACTIVE target as CONSENT_VOID in the wallet transaction, with TARGET_ENDED events;
  - a suspension keeps them ACTIVE and inert.
- ~~**`test:house-bot-reports`:** the targets register and the Vetoes section; R9 `requestedBy` includes the target creator; the DSAR kind list and no reason text.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** all four go with R1, R9 and the internal record (C5-SPEC rulings 187–191, 202, 206, 236–238).
- **RED** (each mutation must fail its own assertion, with an unmutated control):
  - `red:house-bot-engine`:
    - N2-E1: `effectiveFrom` dropped from arming;
    - N2-E2: `dueAt = requested` without the hold;
    - N2-E3: the hold without `LOCK_MARGIN_MS`;
    - N2-E4: `endTargets` ends on `resolveClaimedAt` alone;
    - N2-E5: poll triggers decided in the hook;
    - N2-E6: the `FOR SHARE` target check removed from the sweep insert;
    - N2-E7: blackout ignores `reopenedAt`;
    - N2-E8: consent void leaves targets ACTIVE.
  - `red:house-bot-money`:
    - N2-M1: TARGET_ONCE removed from H2;
    - N2-M2: the staff-chosen count predicate drops `OR "targetId" IS NOT NULL`;
    - N2-M3: the targeted H3 uses the raw opposite pool instead of `lockedForHouse`.
  - `red:house-bot-console`:
    - N2-C1: a removal with a queued reaction writes REMOVED instead of VETOED;
    - N2-C2: re-adding allowed after VETOED;
    - N2-C3: `audit(` moved inside the `withLock` of `addHouseBotTargetAction`;
    - N2-C4: a relative href in a target refusal.

---

## 3. Scenarios

TGT-01 to TGT-40 are written into `01-scenario-register.md` as the final section `## targeted-and-manual (40)`; they are not repeated here.

## 4. Commit placement (no new commit)

N1–N2 add no commit and no third migration. Every table, column and index below lives inside the two existing house migrations (`…_house_bot_tables`, `…_house_bot_markers`), follows S1 migration law, and has a memory twin. Every `path:line` is a pointer only; re-derive it after P0.4.

| Commit | N1 (Enter now, polls only) | N2 (targeted polls, exact timing) |
|---|---|---|
| 1 | **Tables and columns:**<br>- `HouseBotPress` (8th table) with `hbp_actor_submit_uq`, `(houseBotId, createdAt)` and `(state, createdAt)`, plus its A20 row (7 years), P3 row and chain-purge NEVER entry.<br>- HouseBotIntent: kind `MANUAL`; `requestedById`, `entryCondition`, `staleAt`, `transientAttempts`; CHECK `kind<>'MANUAL' OR "productLine"='MARKET'`.<br>- HouseBotEvent: `marketId`; kinds ENTER_NOW_PREVIEWED, ENTER_NOW_REQUESTED, OPENER_SIDE_DRAWN, STAFF_INTENT_CANCELLED; `hbe_opener_draw_uq`.<br>- Staff-chosen caps: `capStaffChosenPerDay` and `capStaffChosenDailyTzs` (HouseBot); `gCapStaffChosenPerDay`, `gCapStaffChosenDailyTzs`, `gStaffChosenMaxCounterpartyShare`, `gStaffEdgeWinRatePts`, `gStaffEdgeNetTzs` and `boardDisclosureSections` (control row).<br>- `PredictionMarket.reopenedAt` and `reopenCount` in `…_house_bot_markers`.<br>**Indexes:** `hbi_counter_anchor_uq`, `hbi_fill_opener_anchor_uq`, `hbi_manual_anchor_uq`, `hbi_manual_live_market_uq`, `hbi_staff_bot_finished_idx`, `hbi_staff_finished_idx`, `("status","staleAt")`. The A24 EXPLAIN pin covers them.<br>**DAL:** `uniqueViolation(err)` and its twin; press, intent-insert and draw twins.<br>**Rules and pure modules:** rules v1 `enterNow`; `N1-*` cross-field rules; the Start mode rule; `effectiveTiming.enterNow`.<br>**Constants:** EngineCodes; `CAP_STAFF_CHOSEN_*`; `LOCK_MARGIN_MS = 7000` (pinned); `HOUSE_AUDIT` keys `enter_now`, `enter_now_refused`, `staff_intent_cancelled`.<br>**Schema gate:** A23 counts 8 tables.<br>**COMPLIANCE:** D17, risks 13–16, 19 and 20, and the do-not-restore lines. | **Tables and columns:**<br>- `HouseBotTarget` (7th table) with its twin, `hbt_active_market_uq` and `hbt_market_idx`. Delays CHECK 5–600. `endCause` includes VETOED and CONSENT_VOID.<br>- Intent `targetId`, CHECK `("targetId" IS NULL OR kind='COUNTER')`, index `("targetId","status") WHERE "targetId" IS NOT NULL`.<br>- Event kinds TARGET_ADDED, TARGET_UPDATED, TARGET_REMOVED, TARGET_ENDED.<br>- `targetsMaxActive` and `gTargetsMaxActive`.<br>**Rules and pure modules:** rules v1 `targeting`; `N2-*` cross-field rules; `effectiveTargetTiming`, whose hold is exit close + `LOCK_MARGIN_MS`.<br>**Constants:** `TARGET_ARMING_SEC = 12` (pinned); `HOUSE_TARGETS_LOCK = "house:targets"`; `HOUSE_AUDIT` `target_added`, `target_updated`, `target_removed`.<br>**Records:** P3 row; COMPLIANCE D18 with risks 17 and 18. |
| 2 | **Shared modules:** `pools.ts` (`lockedForHouse`) and `blackout.ts` (`{blocked}` only; A13 exempts it by name); `market-service.ts` imports the exported `RESOLVE_CLAIM_TTL_MS`.<br>**H0:** the ordered rule for every house kind.<br>**`staleAt` in the seam:** re-read inside `house:control` before `markPlaced` → `house_intent_stale`; `BET_PATH_REASONS` and `GATE_PARITY` rows.<br>**H2:** declared order pinned in `house-bot-seam.anchors.mjs`; `STAFF_CHOSEN_PER_DAY` and `STAFF_CHOSEN_DAILY_STAKE`.<br>**H3 for MANUAL:** OTHER_BOT and GLOBAL_PER_MARKET; `entryCondition` OPENER/THIN from the claimed row; `house_counterparty_concentration`; the in-lock blackout read → `house_info_blackout`.<br>**`lockedForHouse`:** one SQL aggregate with the exclusions and `LOCK_MARGIN_MS`; golden-grid parity with `exitWindowClosesAt`; EXPLAIN pin at 20,000 positions; memory twin. H3 uses it for MANUAL, targeted COUNTER and FILL.<br>**H4:** `GLOBAL_STAFF_CHOSEN_*`; pro-rata counterparty attribution for MANUAL THIN.<br>**Sanctioned change (r):** `adminReopenMarket` stamps `reopenedAt` and `reopenCount`.<br>~~**Registry:** new reasons with en/sw/zh copy.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the new reasons are server-only codes with no player copy (C4 ruling 148). | **H2:** `TARGET_ONCE`; staff-chosen caps on targeted COUNTERs.<br>**H3:** `house_info_blackout` for targeted COUNTERs; the targeted COUNTER cut on `lockedForHouse`.<br>**H4:** COUNTERPARTY_COUNT/TZS apply unchanged. |
| 3 | A5 erasure pseudonymises `HouseBotPress.reason` and the new event reasons to "[erased]". | A3 consent void ends every ACTIVE target as ENDED(CONSENT_VOID), with TARGET_ENDED events, in the same `wallet:<botUser>` transaction. |
| 4 | **Shared modules:**<br>- `opener-side.ts`: the planner calls it before `decide()`.<br>- `enter-now.ts`: the decision reads the bot's own positions (OWN_OTHER_SIDE, PER_MARKET_COUNT).<br>**Fire:** `fire.ts fireClaimedIntent` (no lock, no ambient admission slot, `inFlight` registry, heartbeat, excluded from the SIGTERM requeue); the write-back clamp for all kinds.<br>**Claims and planner:** claim on `staleAt`; mapper `transientAttempts`; the STALE pass runs before POISON; MANUAL and targeted CLAIMED rows expire at `staleAt` + 5 s; press audit lease and 60 s repair; the press moves to DONE on a terminal intent.<br>**Lifecycle:** FILL on `lockedForHouse`; A16 reopen detection from `reopenedAt`.<br>**Copy and alerts:** mapper and `feed-copy.ts` rows; `notifyAdminsHouseBotStaffChosen`, with `notifyAdminsHouseBotBet` excluding staff-chosen rows; `staff-stake-voided`, `staff-stake-self-decided` ~~and `staff-edge`~~ alerts (⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge alert is struck, C5-SPEC rulings 218–223); comms-registry and C13 rows. | **Triggers:** poll triggers are decided in the sweep only (DB watermark against `effectiveFrom`). The hook keeps Up & Down and is suspended while \|skew\| > 5 s.<br>**Decide and fire:** target candidate in `decide()`; hold = max(requested, exit close + `LOCK_MARGIN_MS`); `staleAt = dueAt + 60 s`; fire re-reads the target.<br>**Planner:** `endTargets()`, which skips a blackout that rests on `resolveClaimedAt` alone.<br>**Copy and alerts:** CAP_TARGET_ONCE, TARGET_REMOVED and TARGET_ENDED rows; target roster emitter (href `?tab=history&event=`); hourly summary split. |
| 5 | **Book:** entry split in `book.ts`.<br>~~**R1 sections:** entry split; Enter now register from `HouseBotPress` (placed and refused, with code); previews without a stake; voided or reopened markets; markets decided by the choosing officer; staff-chosen scorecard.~~<br>~~**Other outputs:** CSV columns; R9 (q) exact shape with `requestedBy`; "of which chosen by you" display; R3 memo.~~<br>**Data rights:** ~~R5 `events[]` kinds;~~ `test:erasure` §8 reason bucket; ~~`test:dsar-secrets` kind list~~.<br>⛔ **Superseded by D20 (Ali, 2026-09-17):** R1's sections, the CSV columns, R9, the R2 display, the R3 memo, R5's event kinds and their `test:dsar-secrets` list are struck (C5-SPEC rulings 187–194, 202, 206, 213, 227, 238); the `book.ts` entry split stays only if checkpoint C5-5b names a remaining caller or a Commit 7 scope line; the `test:erasure` reason bucket stands (ruling 244). | ~~R1 targets register and vetoes section; `requestedBy` = the officer who added the target.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** struck with R1 and R9. |
| 6 | ~~Privacy line (P1);~~ chatbot forbidden phrases; Board section "Stakes chosen by staff"; `test:house-bot-disclosure` §docs pins risks 13–20 and the do-not-restore lines. ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no privacy line (D19a). | Covered by N1: ~~the privacy line and~~ the Board section name targets. |
| 7 | **Actions:** the press flow for every N1/N2 action; `searchHouseBotMarketsAction`, `previewEnterNowAction`, `enterNowHouseBotAction`, `getEnterNowStatusAction`; staff-cancel veto in `cancelHouseBotIntentAction`.<br>**Picker:** `MarketPicker`, picker DAL and `HOUSE_BOT_MARKET_PICKER_SEARCH`; the dal-parity picker case lands here.<br>**Screens:** Enter now modal; rules and limits fields with the 02 §3.8 exemption; strip `enterNow`/`targets`; Start-confirm active-targets line; ~~Board checklist writing `boardDisclosureSections`;~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no Board checklist is built (see N1 §10); feed entry filter; lexicon tables; `test:labels` and `test:chip-contract`.<br>**Gates and records:** gate outcome per new file; FAILURE-INVENTORY §6; visual fixtures. | **Actions:** `add/update/removeHouseBotTargetAction` (`wallet:<botUser>` then `house:targets`; audit and roster alert after release); `previewHouseBotTargetAction`.<br>**Screens:** targets tab (params, tab order); Add/Edit/Remove target modals with in-flow two-option toggles.<br>**Other:** A19 source scan widened; `ops:house-bots-sunset` ends targets. |
| 8 | **Drive** (local seeded DB only): Enter now THIN and OPENER. S4 rehearsal 3 covers inline fire vs poller.<br>**Docs:** HOUSE-BOTS.md; RULES §2.11; FLOWS §9; FAILURE-INVENTORY §7.1 entry kinds and codes.<br>**Release record:** prints "Enter now preview: NOT MEASURED in production (it writes)".<br>**Coverage gate:** counts `TGT-*`. | **Drive:** poll target STAKE 10 s lands from 5:07, EXIT_CLOSE 10 s from 5:10, Up & Down 3-min COUNTER 10/10 at +10 s; phase D step "Esc with a choice open keeps the modal".<br>**Docs:** FAILURE-INVENTORY §7.1 target statuses and end causes. |

Where the rest of the placement lives: the N1/N2 bullet of each commit is in PROGRESS.md "Scope per commit"; the owner defaults W7–W16 are in PROGRESS.md "Waiting on Ali"; the overlaps these amendments resolve are rows in PLAN §18 "Overlaps resolved".

---

## 5. Explicitly NOT built (and why)

1. **Early entry before the player's free exit closes** (any opt-in, typed word, early cap code or H3 branch).
   - **It reverts A15/HB-LC-04.** A stake that can still be cancelled would count as locked.
   - **Alt accounts beat the penalty box.** The penalty box keys only on the cancelling account (PLAN §4.3), and alt accounts cost only a confirmed email since KYC moved to withdrawal.
   - **The cancel branch is free.** A one-sided pool refunds at 0 (`market-service.ts:3278-3345`).
   - **The house can never exit** (plan (e), FS-28).
   - The hold is absolute and now waits `LOCK_MARGIN_MS` past the exit close.
   - **A future request** needs its own amendment that amends A15, a post-placement exit detector, caps inside the locks and a COMPLIANCE ruling.
2. **A human-typed side or amount.** It would be an informed directional bet by the entity that settles (F6 §3.1/§3.3; I2). I10 forbids the only structural counter, an officer lock.
3. **Enter now or target controls on the roster, the admin market page, the resolver queue or ceremony, objections, or any Sentinel/AI surface.** Those surfaces show private data or serve non-owner roles. One owner-only surface (`/admin/desk/[id]`) keeps RBAC and the information edge simple.
4. **Enter now on Up & Down.**
   - **Why not:** a person watching a live exchange feed would choose the moment. The closeness check can use a vendor 1-min bar up to 120 s old (04 A15), from a cache refreshed every 30 s (`updown-terminal-vendor.ts:51`). That undoes the closeness rule's "the house never cherry-picks the side that is already winning" (PLAN §1-F4) and brings back UPDOWN D3's "seeding at open is gameable".
   - **Refusal:** a posted Up & Down market id gets "Enter now is for polls only. Up & Down entries are automatic." The HouseBotIntent CHECK makes a MANUAL Up & Down row impossible.
   - **A future amendment needs all three:**
     - a price no older than 5 s at preview, at fire and inside the lock;
     - a manual closeness limit tighter than the automatic `closenessPct`;
     - a COMPLIANCE ruling.
5. **Up & Down targets** (per round or per chain). A round lives 3–60 min, and per-chain exact timing is already the COUNTER delay with min = max (5–600 s).
6. **Target delays over 600 s.** A decided reaction held for hours is a free option: staff let it fire when the news favours its side and cancel it otherwise. Targets use the COUNTER bound, whole seconds 5–600.
7. **Re-targeting a poll after a veto or a removal.** Remove-and-re-add would let staff discard reactions on the side they dislike. Such a poll is closed to targets for every bot: "This poll's target was stopped at {HH:MM} EAT; it can't be targeted again."
8. **An officer-conflict lock on resolve, void, reopen or objection rulings for a market holding a staff-chosen stake.** It is forbidden by the 2026-07-24 guardrail and I10. The control is ~~display only ("of which chosen by you"), plus the R9 `requestedBy` payload,~~ the `staff-stake-self-decided` alert ~~and the R1 section~~ (risk 20). ⛔ **Superseded by D20 (Ali, 2026-09-17):** the display, the R9 payload and the R1 section are struck (C5-SPEC rulings 187–194, 202, 206); the alert is the only control.
9. **A refusal keyed on AML-flagged participants, or on polls the pressing officer created, reviewed or published.** No stored AML flag exists (it is computed in `analytics.ts`), and a refusal keyed on officer identity is an officer lock by another name. ~~The edge is measured instead, by the R1 staff-chosen scorecard and the monthly `staff-edge` alert (risk 13).~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the scorecard and the staff-edge alert are struck (C5-SPEC rulings 202, 206, 218–223), and D20 names no replacement measure for risk 13.
10. **Separate refusal event kinds (`ENTER_NOW_REFUSED`, `TARGET_REFUSED`) or an AlertOnce throttle for refusals.** Every refused press is already a durable `HouseBotPress` row with its code, kept 7 years. Presses are human clicks, so no throttle is needed.
11. **Quote rows with counterfactual P&L.** v1 records `ENTER_NOW_PREVIEWED` events; ~~the regulator report can derive the counterfactual later~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no house regulator report (C5-SPEC rulings 199–213).
12. **An Ali-only permission or an OWNER role.** It would be a new permission concept. `requireHouseOwner` stays the single predicate (C12, A22).
13. **Enter now on a PAUSED bot, bulk Enter now, or a scheduled "enter at HH:MM".** Not asked, and each would widen discretion.
14. **Jitter on Enter now amounts.** A deterministic amount can't be re-rolled; the fingerprint is accepted (risk 16).
15. **A third house migration or a new npm suite key.** Everything fits the two house migrations, the existing suites and the H-steps. The only new sanctioned player-path change is (r) (`reopenedAt`); (q) is extended.
16. **SMS for any of these notices** (F6 `CHANNEL_POLICY` unchanged).

### Critical Files for Implementation
- C:\kipindi-house-bots\src\lib\server\market-service.ts: the H0–H4 seam; `cashOutValue` (`:2668`), the exit window that `lockedForHouse` must match; `adminReopenMarket` (`:4000-4040`, `marketStore.set` at `:4025`, un-awaited audit at `:4027`) for change (r); `RESOLVE_CLAIM_TTL_MS` (`:2054`).
- C:\kipindi-house-bots\src\lib\server\locks.ts: `withLock` (`:164`); nested locks join the outer transaction, which is why the fire asserts it runs outside any lock.
- C:\kipindi-house-bots\src\lib\server\admission.ts: `withAdmission` (`:168`); a re-entrant call bypasses admission.
- C:\kipindi-house-bots\src\lib\server\audit.ts: the DB-global chain lock behind A19 and the press audit lease.
- C:\kipindi-house-bots\src\lib\server\retry.ts: P2028/08006 retries, bounded by `staleAt` in the seam.
- C:\kipindi-house-bots\src\lib\search\fields.ts: `MARKET_SEARCH` and `UD_ROUND_SEARCH`; the new `HOUSE_BOT_MARKET_PICKER_SEARCH`.
- C:\kipindi-house-bots\src\app\admin\resolver-queue\resolution-mode-action.ts: the operator re-check runs its AI call before the resolve claim.
- C:\kipindi-house-bots\src\app\markets\actions.ts: the player bet action has no role gate, which is why `lockedForHouse` excludes non-PLAYER accounts.
- C:\kipindi-house-bots\src\lib\server\rbac-guard.ts: `requireOwner` → `requireHouseOwner`.
- C:\kipindi-house-bots\src\components\ui\modal.tsx and C:\kipindi-house-bots\src\components\ui\select.tsx: Escape on window, `labelledBy`, `ariaBusy`, focus set only on open.
- C:\kipindi-house-bots\scripts\unsaved-changes.test.mts, admin-act-gate.test.mts and search-adoption.test.mts: the commit 7 gate outcomes.
- C:\kipindi-house-bots\prisma\schema.prisma: PredictionMarket `reopenedAt`/`reopenCount`; Position `@@index([marketId, status])` (`:1798`) for the `lockedForHouse` EXPLAIN pin.
- C:\kipindi-house-bots\plans\house-bots\04-amendments.md: A13, A15, A16, A19, A20, A23, A24, C1, C4, C11, C13, R5, R7, R9, P1.

---

## 6. Owner summary

1. **Enter now** lets you, or any admin, pick one live poll for one running bot and place a single house stake on it straight away, without waiting for the bot's automatic rules.
2. **Targets** let you mark a live poll for a bot, so it answers real players' stakes on that poll after a delay you choose in whole seconds, from 5 seconds to 10 minutes, counted from the player's stake or from the moment the player's free cancel window closes.
3. On Up & Down, exact timing is the existing Counter delay with the same number in both boxes; Enter now and targets are for polls only in this version.
4. Nobody ever types the side or the amount: the system takes the side that players' locked money leaves thinner, or a side drawn once for an empty poll, and uses the bot's saved stake cut to fit.
5. The bots never enter while a player can still cancel for free (they wait an extra 7 seconds after that window closes), never enter early, never bet both sides of a poll, and never share a poll with another bot.
6. Stakes chosen by staff have their own daily limits per bot and for all bots, plus a limit on active targets; if you leave those limits empty, Enter now and targets simply cannot bet, and you can clear them at any time without switching the bots off.
7. Every press, including refused ones, is kept permanently with the officer's name and reason, every placed staff-chosen stake alerts every admin by bell and email, ~~and the regulator report lists them all, including vetoes and any poll later voided, reopened or decided by the same officer who chose the stake~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** no house report is built; the reports treat a house bot's account like any player's.
8. If an officer cancels a queued staff-chosen stake, or stops a target that already has a queued reaction, that poll can never be targeted again, so nobody can pick the side by cancelling the ones they dislike.
9. Defaults you may change: a reason of 5 to 300 characters is required on every press, target change and cancel (W7); Enter now ignores the bot's schedule, pool band and closing-soon skip, while targets follow the schedule (W8); Enter now is polls only (W9); and any admin may press, with every admin told of each placed stake (W10).
10. Further defaults: no Enter now or target on a poll where an AI result check or a result has been recorded, a result check is still claimed, or the poll was ever reopened (W11); and a stake that cannot be placed within 15 seconds of an Enter now press, or 60 seconds after a target reaction is due, is dropped with nothing moved (W12).
11. Also by default, targets are polls only (W13), and a new target reacts to the first stake only, counted from the stake, with no early entry (W14).
12. The last two defaults: Enter now is refused when one player holds more than 50% of the money it would be matched against (W15), ~~and a monthly alert fires when an officer with at least 10 settled staff-chosen stakes wins 15 percentage points more often than the automatic bots, or nets TZS 100,000 or more (W16)~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** the monthly staff-edge alert is struck, so W16 has nothing to set.
13. Nothing changes in the release plan: the master switch still ships off, and Enter now and targets stay off for every bot until you turn them on in its rules and set their limits.
