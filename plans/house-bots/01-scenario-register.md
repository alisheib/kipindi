# House Bots — scenario register

> # ⛔ HOUSE REPORTS, HOUSE LINES AND HOUSE SPLITS ARE SUPERSEDED
> **Owner ruling D20 (Ali, 2026-09-17): house bot accounts are normal players everywhere.** Every report, statutory filing,
> admin count, finance or insights figure and harm/AML detector treats a house bot's account exactly like any player's
> account, and no report, CSV, memo, column, line, chip, tag or record names house bots or splits house money out. Rows
> below that assert the house-liquidity report or statement, the transactions CSV `house` filter and `house_bot_id` column,
> the per-bot CSV, R2 exposure lines on admin screens, R9 `houseStake` decision-audit keys, the staff-edge alert (TGT-39),
> the PLAN §9 memo, splits and exclusions, the owner-only internal record or `leaderboard({excludeHouse})` are marked in
> place "⛔ Superseded by D20", each saying what the Scenario coverage gate counts. D19 still binds everything; the kept
> controls, audits, erasure, money rules and absence proofs are unchanged. Authority: PROGRESS.md "OWNER RULING D20" and
> `plans/house-bots/C5-D20-REPLAN.md` (ruling by ruling).

> # ⛔ HOUSE BOTS ARE NEVER PUBLIC, AND THE HOLDER SEES NOTHING
> **Owner ruling D19 (Ali, 2026-09-16), which outranks every plan document and still binds under D20: no rulebook, Terms,
> privacy, FAQ, home or chatbot text mentions house bots (no META or `TERMS_VERSION` bump, no announcement), and the holder
> sees nothing** — no chip, no "Placed by 50pick with your permission" line, no liquidity label on outcome notices, no house
> wording in any refusal, and no house-bot notice or email of any kind; every alert goes to admins only. Rows below that
> assert public text, a holder notice or email, a holder chip, a liquidity label or a player-facing house refusal are marked
> in place "⛔ Superseded by D19", each saying what the Scenario coverage gate counts. Unchanged: the switch ships OFF,
> D3/D3b, D5 (consent by password), D6, the admin console, audits, internal docs and every engine rule. Authority:
> PROGRESS.md "OWNER RULING D19".

## holder-account (45)

### HB-ACC-01 [gap] The holder changes his password in Account settings while the bot is idle: ACTIVE but not firing (master OFF, outside its schedule, no triggers, engine disabled), or PAUSED. Covers detection latency and the proactive check.
- **Trigger:** changePasswordAction calls changePassword, which writes the new hash and salt. Nothing on the bot side reacts.
- **Expected:** Detection does not depend on a bet being attempted:
- The hook detects the change at once, after commit.
- The planner scan catches it within 15s, whether the master switch is on or off.
- Every console render recomputes the fingerprint match live, so the strip is right even if the planner is down or HOUSE_BOT_ENGINE=false.

If the bot was ACTIVE:
- AUTO_PAUSED(PASSWORD_CHANGED), written under wallet:<botUser>, with pauseDetail {via: SELF_CHANGE, changedAt, wasActive: true}.
- PENDING and CLAIMED intents → CANCELLED(BOT_NOT_ACTIVE). An AUTO_PAUSED event is appended and an awaited COMPLIANCE audit `house_bot.auto_paused` is written.
- Admins get bell + email: "Bot A paused — the holder changed his password (Account settings, 13 Sep 14:02 EAT). Enter the new password to resume." Link: /admin/desk/<id>.
- ~~The holder gets bell + push:~~
  - ~~en: "Liquidity stakes on your account are paused because your password changed. Your balance and your own bets are not affected. 50pick will ask for your permission again before resuming."~~
  - ~~sw: "Dau za ukwasi kwenye akaunti yako zimesimamishwa kwa sababu nenosiri lako limebadilishwa. Salio lako na dau zako binafsi haziathiriki. 50pick itaomba ruhusa yako tena kabla ya kuendelea."~~
  - ~~zh: "由于您的密码已更改，您账户上的流动性投注已暂停。您的余额和您自己的投注不受影响。恢复前，50pick 会再次征得您的许可。"~~

If the bot was not ACTIVE: see HB-ACC-11.
- **Plan:** I9; F5 step 4; §3 H2 house_consent_stale; F3 Start refusal; §4.2 planner
- **Evidence:** C:\kipindi-main\src\lib\server\password-reset.ts:324-336 (the hash is written at :326; the function has no bot or session side effect)
- **Fix:** 1. Add `src/lib/server/house-bot/holder-hook.ts` exporting `onHolderAccountChanged(userId, cause, meta)`:
   - dynamic import, not awaited, never throws;
   - one indexed read of a live bot for the user, otherwise no-op.
2. Wire it after the write at every holder-account writer:
   - password-reset.ts:242, :271, :326
   - erasure.ts:393
   - user-service.ts:90
   - responsible-gambling.ts:215, :274, :315
   - players/[id]/actions.ts:121, :188
   - staff/actions.ts:36
   - agent-application-service.ts:1308, :1406
   - auth-service.ts:974 (lockout) and :1049 (bootstrap)
   - wallet-freeze.ts:63
   - email-verification.ts:134, :162
   - player-2fa.ts:35, :77
   - privacy.ts:93
3. Add the planner `scanHolderDrift()` every 15s over non-REMOVED bots, independent of the master switch.
4. Register all of this as sanctioned change (l), with an unchanged-output proof for accounts that have no bot.
- **Test:** New `test:house-bot-holder-lifecycle`:
- Every writer, with the master switch OFF, moves an ACTIVE bot to AUTO_PAUSED. The hook promise is awaited in test mode.
- With the hook disabled, the planner scan catches the change.
- A user with no bot gets zero extra writes.
- A source pin fails if any `db.user.update` writing passwordHash, role, status or phoneE164, or any freeze writer, lacks the hook.
- A red mutation removing the hook call must fail.
- Local drive: change the password with the switch OFF, and the strip shows paused.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice when his bot pauses (D19c; C4 ruling 149); the admin bell and email stand. Coverage gate: partly struck by D19.

### HB-ACC-02 [gap] Causes overlap. The holder changes his password and then self-excludes, or is suspended or frozen, before the admin re-verifies. Later the RG or officer cause clears.
- **Trigger:** changePassword runs, then selfExclude sets SELF_EXCLUDED. Later an officer calls restorePlayerAction.
- **Expected:** The strip lists every standing cause, each with its own way out. Example: "Paused for 2 reasons: 1) Self-excluded until 20 Sep — Start stays off until an officer reopens the account. 2) Password changed 13 Sep — Re-verify."
- Re-verify is enabled whenever CONSENT_STALE is among the causes and the password-context rows pass: status ACTIVE, not locked, has a password, not set by support.
- Start is enabled only when no cause stands.
- There is never a state where Remove is the only enabled action while a curable cause stands.
- **Plan:** F6 table and Re-verify rule; §6 houseBotEligibility
- **Evidence:** C:\kipindi-main\src\lib\server\responsible-gambling.ts:274 and C:\kipindi-main\src\lib\server\password-reset.ts:326 (independent writers; either can happen first)
- **Fix:** - Add a pure `holderCauses(bot, user, wallet, rg, flags)` in eligibility.ts that returns an ordered cause list.
- `pauseReason` stays as the first recorded cause, for history only.
- Rewrite F6 per cause. reverifyHouseBotAction is allowed iff CONSENT_STALE ∈ causes and the password rows pass. startHouseBotAction is allowed iff causes = ∅.
- The strip renders up to 3 causes plus "and N more", each with its resolving action.
- **Test:** `test:house-bot-engine`, "every cause set has a way out":
- Enumerate pairs of causes × clear orders.
- Assert at least one enabled non-Remove action while any curable cause stands.
- A red mutation restoring single-reason gating must fail.

### HB-ACC-03 [gap] Consent is accepted on a password a support officer knows, in either of two ways:
- (a) An officer temp reset whose non-awaited audit row never landed.
- (b) An officer sets the holder's email to an address the officer controls, requests a reset link and sets a password. That reset is audited as the holder's own `password_reset.completed`.
- **Trigger:** - (a) adminResetPassword writes the hash; its audit is fire-and-forget.
- (b) setPlayerEmailAction → requestPasswordReset → consumeResetToken.
- **Expected:** Designate and Re-verify refuse with: "The password was last set by support, or through an email address support set. Ask the holder to change it himself in Account settings, then verify."
- The bot stays paused with causes CONSENT_STALE + OFFICER_SET.
- ~~The holder notice tells him to change his password himself.~~
- The decision reads a durable column written atomically with the hash, never a possibly-missing audit row.
- **Plan:** §6 designate + re-verify blocking row (reads `player.password_reset_by_officer` from the audit log); §13 risk 2
- **Evidence:** C:\kipindi-main\src\lib\server\password-reset.ts:271-280 (hash written at :271; `audit(` not awaited at :273; the same at :244 and :328); C:\kipindi-main\src\app\admin\players\[id]\actions.ts:247 (officer-set email through setUserEmail)
- **Fix:** 1. Expand-only migration: `User.passwordSetAt` and `User.passwordSetVia` TEXT CHECK (REGISTRATION, SELF_CHANGE, RESET_LINK, OFFICER_TEMP).
2. Write both in the same `db.user.update` at auth-service.ts:641 and password-reset.ts:242, :271, :326, with a memory twin.
3. Eligibility blocks when:
   - via = OFFICER_TEMP; or
   - via = RESET_LINK and a `player.email.set_by_officer` exists for this user within 30 days before passwordSetAt (awaited read; a read failure blocks).
4. Make the three password audit calls `await`.
- **Test:** `test:house-bot-designation`:
- Officer reset with audit() stubbed to drop the row → still refused.
- Officer email-set followed by a reset link → refused.
- Holder's own email-set followed by a reset link → allowed.
- A red mutation that reads the audit log instead of the column fails.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice (D19c; C4 ruling 149); Designate and Re-verify still refuse with the admin sentence, and the bot stays paused. Coverage gate: partly struck by D19.

### HB-ACC-04 [gap] The holder closes his account (types CLOSE MY ACCOUNT) while designated, with open house positions and float in the wallet.
- **Trigger:** closeAccountAction → closeAccount:
- user status CLOSED, wallet CLOSED;
- sessions revoked.
- **Expected:** The hook removes the bot:
- REMOVED by `system_house_bot`, removedReason "Holder closed the account"; intents CANCELLED; REMOVED event; awaited COMPLIANCE audit.

Admins get bell + email: "Bot A removed — the holder closed his account on 13 Sep. TZS X balance and TZS Y in open house stakes stay in his closed wallet. Settle the float with him out of band."

~~The holder gets email only (he can no longer sign in):~~
- ~~en: "Your account is closed, so 50pick has stopped placing liquidity stakes from it. Stakes already placed will settle to your wallet as normal."~~
- ~~sw: "Akaunti yako imefungwa, kwa hiyo 50pick imeacha kuweka dau za ukwasi kutoka kwayo. Dau zilizokwisha wekwa zitalipwa kwenye pochi yako kama kawaida."~~
- ~~zh: "您的账户已关闭，因此 50pick 已停止从该账户进行流动性投注。已下的投注将照常结算到您的钱包。"~~

Afterwards:
- Open house positions still settle into the CLOSED wallet, with markers. The money tab lists them.
- Start and Re-verify are never offered.
- **Plan:** §4.6 mapper (account_blocked → ACCOUNT_BLOCKED; wallet_frozen → WALLET_FROZEN); F6 "until eligibility passes again"
- **Evidence:** - C:\kipindi-main\src\lib\server\user-service.ts:90-98 (closure).
- C:\kipindi-main\src\app\admin\players\[id]\actions.ts:176-177: restore refuses CLOSED, and no other code writes CLOSED back to ACTIVE.
- C:\kipindi-main\src\lib\server\market-service.ts:1045,1073-1076: CLOSED comes back as account_blocked.
- C:\kipindi-main\src\lib\server\market-service.ts:1165-1170: a CLOSED wallet comes back as wallet_frozen.
- **Fix:** - Add cause ACCOUNT_CLOSED to pause-reasons.ts. control.ts and the mapper check `user.status === 'CLOSED' || closedAt` before any wallet or status label.
- The closure hook auto-removes the bot.
- ~~Add holder copy for account-closed.~~
- **Test:** `test:house-bot-holder-lifecycle`:
- closeAccount → REMOVED within the hook; intents CANCELLED.
- A later settlement pays a marked WIN into the CLOSED wallet, and the reports tie.
- The mapper turns account_blocked on a CLOSED user into ACCOUNT_CLOSED, never ACCOUNT_BLOCKED or WALLET_FROZEN.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no email or notice when his bot is removed (D19c; C4 ruling 149); the removal, the admin bell and email, and settlement into the closed wallet stand. Coverage gate: partly struck by D19.

### HB-ACC-05 [gap] An officer fulfils an ERASURE data-rights request on the closed holder account: passwordHash nulled, PII scrubbed. Covers the bot row and the markers.
- **Trigger:** fulfillDsarRequest → anonymizeClosedAccount:
- nulls passwordHash, displayName, email;
- writes a phone tombstone.
- **Expected:** - The bot is already REMOVED (HB-ACC-04). For a legacy live row, the erasure step removes it with reason ACCOUNT_ERASED, never PASSWORD_CHANGED.
- The erasure step pseudonymises:
  - HouseBot.label → "Erased bot hb_xxxx";
  - note and removedReason → "[erased]";
  - free text in HouseBotEvent reason and payload → "[erased]".
- Kept for the 7-year AML record: houseBotId markers, Position, Transaction and intent rows.
- `counts.houseBots` is added to the `privacy.erasure.completed` payload.
- The console shows the removed bot read-only as "Former member".
- **Plan:** §2 HouseBot label/note; §4.6 fingerprint mismatch → PASSWORD_CHANGED; §6 no-password row
- **Evidence:** - C:\kipindi-main\src\lib\server\erasure.ts:393-412: passwordHash set to null at :397. fingerprint("") ≠ the stored fingerprint, so it would read as "password changed".
- C:\kipindi-main\src\lib\server\erasure.ts:55-56: erasure writes only the tables it names.
- **Fix:** - Add step 5b to anonymizeClosedAccount: `house-bot/erasure.ts pseudonymiseHouseBotsForUser(userId)`, with a memory twin.
- The ACCOUNT_ERASED cause (via isErasedPhone, erasure.ts:109-111) is evaluated before the fingerprint.
- Keep labels unique with an id suffix.
- **Test:** Extend `test:erasure`:
- designated → closed → erased: label, note and event text scrubbed; markers and positions intact; a second run reports zero.
- Engine suite: an erased user never maps to PASSWORD_CHANGED.

### HB-ACC-06 [gap] The holder files an ERASURE data-rights request from /profile/account while his account is still open and designated.
- **Trigger:** The DSAR filing action calls fileDsarRequest. Fulfilment refuses until the account is CLOSED.
- **Expected:** Filing is treated as withdrawal of consent:
- The hook sets AUTO_PAUSED(HOLDER_ERASURE_REQUEST) and cancels intents.
- Admins get bell + email: "Bot A paused — the holder asked for his data to be erased (dsar_…). Remove the bot before the account is closed."
- Start and Re-verify stay disabled while a PENDING or PARTIAL ERASURE request exists.
- Ways out:
  - Remove; or
  - an officer closes or withdraws the request → the cause clears → Re-verify → Start.
- ~~Holder copy:~~
  - ~~en: "Liquidity stakes on your account have stopped while we handle your request."~~
  - ~~sw: "Dau za ukwasi kwenye akaunti yako zimesimamishwa wakati tunashughulikia ombi lako."~~
  - ~~zh: "在我们处理您的请求期间，您账户上的流动性投注已停止。"~~
- A duplicate filing creates no second alert. A CORRECTION request has no effect.
- **Plan:** I9 list; F6; §2 pause-reasons
- **Evidence:** - C:\kipindi-main\src\app\profile\account\actions.ts:68-71: holder files the request.
- C:\kipindi-main\src\lib\server\privacy.ts:80-104: queue.
- C:\kipindi-main\src\lib\server\privacy.ts:128-140: fulfilment is blocked unless CLOSED.
- **Fix:** - Add cause HOLDER_ERASURE_REQUEST, read via the privacy queue (`hasOpenRequest(userId,'ERASURE')`).
- Hook after privacy.ts:93.
- Add an eligibility blocking row.
- ~~Add the holder notice kind.~~
- **Test:** `test:house-bot-holder-lifecycle`:
- File ERASURE → paused with one alert.
- Duplicate filing → no new alert.
- A fulfil attempt refused because the account is not closed keeps the pause.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice (D19c; C4 ruling 149); the pause, the admin bell and email, and the ways out stand. Coverage gate: partly struck by D19.

### HB-ACC-07 [gap] The owner's literal request: after the holder changes or resets his password, sessions opened with the old password must sign in again with the new one.
- **Trigger:** changePassword, consumeResetToken and adminResetPassword. None of the three calls revokeUserSessions.
- **Expected:** Platform-wide:
- A reset link or an officer temp reset revokes every session.
- A change in settings revokes all sessions, then re-mints the current device's session, so the holder stays signed in where he made the change.
- Other devices land on /auth/login?revoked=1 with:
  - en: "Your password was changed. Sign in again with the new password."
  - sw: "Nenosiri lako limebadilishwa. Ingia tena kwa nenosiri jipya."
  - zh: "您的密码已更改。请使用新密码重新登录。"

The bot uses no session, so revocation does not affect it. The fingerprint change still pauses it (HB-ACC-01). Console copy keeps the two facts apart: "His other devices were signed out. Bot A needs the new password to resume."
- **Plan:** not in plan (I9 covers only the bot pause)
- **Evidence:** - C:\kipindi-main\src\lib\server\password-reset.ts:242,271,326: none of the three writers revokes sessions.
- By contrast, revocation exists for suspend (C:\kipindi-main\src\app\admin\players\[id]\actions.ts:122) and self-exclusion (C:\kipindi-main\src\lib\server\responsible-gambling.ts:278).
- C:\kipindi-main\src\lib\server\session-registry.ts:103-106: the revoke function.
- **Fix:** - A separate auth commit, needing the owner's approval (it is not a bet-path change): add revokeUserSessions at the three writers, plus re-mint via createSession (session.ts:92-124) for the settings path.
- Add a revoked-reason variant on the login page.
- Record the change in docs/FLOWS.md.
- **Test:** ⛔ **RECONCILED 2026-09-20 — WITHDRAWN, NOT OWED. NO TEST IS TO BE WRITTEN FOR THIS ROW.** ~~New `test:password-change-revokes-sessions`: Sessions A and B; change in A → B's getSession returns null with the revoked flag, A stays valid. Reset link → both null. Engine: a bot bet after revocation plus re-verify succeeds.~~
- **RULING: A1** (`04-amendments.md:101`, RECORD ONLY, owner ruling 2026-09-13, owner default W5) — *"Signing out other devices on a password change is not built"*, Merged: HB-ACC-07. `package.json` declares no `test:password-change-revokes-sessions` and never will: writing that suite would BUILD AND ASSERT a feature the owner decided against. The surviving content of this row is the recorded risk line (`docs/HOUSE-BOTS.md:813`, `docs/COMPLIANCE-DECISIONS.md:391`, cross-referenced at `:355`): *"A password change or reset does not sign out the holder's other sessions (owner ruling 2026-09-13)."* House consent is unaffected either way — consent is the FINGERPRINT, never a session.
- ⚠️ **FINDING F-1, and it is now repaired.** A1's own stated proof was *"Test: `test:docs` greps the risk line"*. Measured 2026-09-20: `scripts/docs-links.mjs` (130 lines, the whole of `test:docs`) checks relative links, `scripts/<file>` paths and npm keys, and **greps no sentence anywhere** — so A1's recorded proof did not exist and the risk line was pinned by NOTHING. It is pinned now by `test:house-bot-reports` `12.risk-7.hb` and `12.risk-7.cd`, one per document, each with its own planted control. ⛔ That pin is the TAIL of a withdrawn row and does **not** make this a tested row: it is RECONCILED (accounted for), never counted as one of the rows that gained a test.

### HB-ACC-08 [gap] The holder bets manually on a market the bot is in, on the opposite side of the house stake. Example: house DOWN 8,000 countering a player, then holder UP 20,000. He is using 50pick's float as the counterparty to his own bet.
- **Trigger:** buyPositionAction → buyPosition. An account may hold both sides of a market.
- **Expected:** Needs an owner ruling.

Recommended default: the bet is allowed (D3), and the post-commit hook detects it (an unmarked position by a live bot's userId, on the side opposite that bot's house position):
- AUTO_PAUSED(HOLDER_CONFLICT), plus one SECURITY admin bell + email: "Holder of Bot A staked TZS 20,000 UP against Bot A's TZS 8,000 DOWN on BTC 5-min #412."
- The bot skips that market. Start requires a written reason.

Stricter option: a sanctioned refusal `house_holder_opposite_side`:
- ~~en: "You can't stake against a liquidity stake 50pick placed from your account on this market."~~
- ~~sw: "Huwezi kuweka dau dhidi ya dau la ukwasi ambalo 50pick iliweka kutoka akaunti yako kwenye soko hili."~~
- ~~zh: "您不能在此市场上与 50pick 从您账户下的流动性投注对赌。"~~

A same-side manual bet is not flagged.
- **Plan:** §3 H2 OWNER_POSITION (only stops the bot adding after the holder bets); I3; §13 risk 4 (alt accounts only)
- **Evidence:** C:\kipindi-main\src\lib\server\market-service.ts:1174-1179 (unlimited positions, either or both sides)
- **Fix:** - Extend the post-commit hook (a) with a holder-conflict check.
- The owner picks alert-and-pause (default) or refusal. Record the choice in COMPLIANCE-DECISIONS and HOUSE-BOTS.md.
- Add HOLDER_CONFLICT to pause-reasons and feed-copy.
- **Test:** ⛔ **RECONCILED 2026-09-20 — the pause-or-refuse half is WITHDRAWN, and the rest was ALREADY ASSERTED under another index.** ~~Engine or seam suite: House DOWN then holder UP → one pause and one alert (AlertOnce). Under the refusal option → refused with the reason and wallet untouched.~~ The old `Test:` line named NO suite at all ("Engine or seam suite:"), which is why nothing owned it.
- **RULING: A21** (`04-amendments.md:587`; `:92` — *"HB-ACC-08, pause or refuse options: the owner ruled alert only (A21)"*, Merged: HB-ACC-08, HB-LC-28, HB-ACC-09). A21's own words: **never refuse the bet and never pause the bot.** Measured 2026-09-20: `HOLDER_CONFLICT` appears NOWHERE under `src/` or `scripts/` — only in this row, asking for it. The refusal copy is struck by D19c on this row.
- ✅ **NAMED: `test:house-bot-engine` §18** — `18.30` fixture, `18.31` ONE alert keyed `holder-against:<bot>:<market>` carrying aggregates only and no user id in the payload, `18.32` ONE `HOLDER_AGAINST_BOT` event, `18.33` (I3) the holder's OWN stake is never a trigger, `18.34` the same side gives nothing, `18.35` a second pass writes nothing more, `18.36` it runs whatever the switch says, `18.78` the LIVE hook on Up & Down. Code: `trigger.ts:303-321`.

### HB-ACC-09 [gap] Players the holder referred bet while his bot is ACTIVE. The bot counters people the holder recruited and can coordinate with.
- **Trigger:** bindRecruit stamps recruitedBy with the referrer's id. The recruit's bet passes the trigger filter.
- **Expected:** - The trigger filter skips triggers whose recruitedBy is a live bot's userId. It writes a SKIPPED COUNTER intent with EngineCode HOLDER_RECRUIT and why: "Player #X was referred by Bot A's holder — not countered".
- Check card and bot overview warn: "The holder has N referred players; the bot will not counter them."
- FILL and OPENER are unaffected. Recruits of anyone else are countered normally.
- **Plan:** §4.3 trigger filter; I3
- **Evidence:** C:\kipindi-main\src\lib\server\affiliate-service.ts:918 (recruitedBy = referrerUserId)
- **Fix:** - Add HOLDER_RECRUIT to EngineCode and feed-copy.
- The trigger read includes the trigger's recruitedBy. It is account metadata, so it goes on the info-edge allowlist.
- Add the warning row in eligibility.
- **Test:** `test:house-bot-engine`:
- The holder's recruit bets → SKIPPED(HOLDER_RECRUIT).
- Another referrer's recruit → COUNTER planned.

### HB-ACC-10 [gap] The admin re-verifies with the holder's new password, or admin attempts against his account fail. The holder is never told his password was used.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder is told nothing: no notice or email when 50pick re-verifies with his password, and none when the reserve state is reached (D19c; C4 ruling 149); the admin bell at the reserve state stands (HB-ACC-19). Coverage gate: counts in its D19 form — a re-verify and the reserve state add no holder row.
- **Trigger:** verifyHouseBotPassword succeeds, or reaches the reserve state (HB-ACC-19).
- **Expected:** ~~On success, the holder gets bell + push + email (link /profile/account):~~
- ~~en: "50pick confirmed your permission for liquidity stakes using your current password at 14:10 EAT. If you did not give it to 50pick, change your password now and contact support."~~
- ~~sw: "50pick imethibitisha ruhusa yako ya dau za ukwasi kwa kutumia nenosiri lako la sasa saa 14:10. Kama hukulitoa kwa 50pick, badilisha nenosiri lako sasa na uwasiliane na msaada."~~
- ~~zh: "50pick 已于 14:10 使用您当前的密码确认了您对流动性投注的许可。如果您没有向 50pick 提供密码，请立即更改密码并联系客服。"~~

Failed attempts send nothing, ~~until the reserve state is reached. Then one notice:~~
- ~~en: "Someone at 50pick tried to confirm your permission with a wrong password. Your sign-in is not locked."~~
- ~~sw and zh equivalents.~~
- **Plan:** §7 notifyHouseBotOwner (designated/started/paused/password pause/removed only)
- **Evidence:** C:\kipindi-main\src\lib\server\notification-service.ts:1498-1510 (the existing trilingual SECURITY password-changed notice this should follow)
- **Fix:** - ~~Add kinds `reverified` and `verify_reserved` to notifyHouseBotOwner.~~
- ~~Add an EMAIL_TEMPLATES entry `house-bot-reverified`.~~
- ~~Register both in comms-registry.~~
- **Test:** `test:house-bot-comms`:
- ~~Re-verify → one holder row in 3 locales, plus an email with the tag.~~
- 2 wrong attempts → no row.
- ~~Reserve state → one row.~~

### HB-ACC-11 [gap] A holder-account change happens while the bot is already PAUSED(NEW/MANUAL) or AUTO_PAUSED for another cause. Covers what the admin sees and how much noise he gets.
- **Trigger:** Any holder hook (HB-ACC-01) fires for a non-ACTIVE bot.
- **Expected:** - A manual PAUSED is not flipped to AUTO_PAUSED. The cause is added to the live cause set and a HouseBotEvent row is written.
- Consent, RG and role causes send an admin bell only, no email.
- Closure and erasure still auto-remove with an email.
- The Start and Re-verify rendering reflects the causes at once. Start is disabled and names the cause.
- No holder notice for a bot that isn't running.
- **Plan:** F6 ("From PAUSED(*) it refreshes the fingerprint and keeps the reason"); D3b; §7 alert matrix
- **Evidence:** C:\kipindi-main\src\lib\server\password-reset.ts:326 (the change happens regardless of bot state; nothing records it)
- **Fix:** - Add a status × cause notification matrix to §7 and HOUSE-BOTS.md.
- The hook branches on the bot's status.
- Causes are rendered live (HB-ACC-02).
- **Test:** `test:house-bot-holder-lifecycle`: a status × cause matrix asserting the transitions and the exact recipients and channels.

### HB-ACC-12 [gap] The holder downloads his data (Art. 15 right of access), or an officer builds his DSAR bundle.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the owner-only internal record that C5-SPEC ruling 250 named as this id's home for the house section (rulings 236–238) is struck; D19 already keeps both releasable doors free of any house section (rulings 168–169), so this id is covered only by its absence form (ruling 243). Coverage gate: the internal-record half is struck by D20.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** neither releasable door (the player's export and the officer's bundle) carries a house section: a holder's house stakes appear in both exactly as his own rows, with no house key, id or word (C5-SPEC rulings 168–169; C4 ruling 154). Coverage gate: counts only in its absence form (C5-SPEC ruling 250).
- **Trigger:** exportUserData on /profile/account, or buildDsarBundle.
- **Expected:** ~~The export includes a `houseBot` section:~~
- ~~designation dates and status history (events);~~
- ~~intents placed from his account: market, side, stake, time and why, with trigger identities removed;~~
- ~~the house marker on his positions and transactions.~~
- **Plan:** §2 data model; D6; I8 (marker never public — the holder is not public)
- **Evidence:** C:\kipindi-main\src\lib\server\user-service.ts:45-69 (export has user, kyc, wallet, rg, transactions and audit only)
- **Fix:** ~~Add an allowlisted projection `houseBotDsarView(userId)` used by exportUserData and privacy.buildDsarBundle. No other user's id or label appears in it.~~
- **Test:** ~~Privacy or erasure suite: a designated holder's export contains a houseBot section and no trigger userIds.~~

### HB-ACC-13 [gap] The holder comments on a market where the bot holds a house position. His public "Holds YES/NO" chip would show the house's side.
- **Trigger:** postCommentAction takes the side of his latest OPEN position, whether or not it is a house stake.
- **Expected:** - The chip reflects only his own unmarked OPEN positions.
- A house stake alone → no chip.
- His own stake alongside a house stake → his own side.
- Everything else in the public payload is unchanged (D6). No staff badge, because the role is PLAYER.
- **Plan:** §3 sanctioned player-path changes (a)–(k); I7 (no objection standing)
- **Evidence:** C:\kipindi-main\src\app\markets\actions.ts:337-340
- **Fix:** Sanctioned change (m): filter `!p.houseBotId` at markets/actions.ts:338. The output is unchanged for accounts with no house positions.
- **Test:** `test:house-bot-seam`:
- House stake only → side null.
- Own + house → own side.
- Non-holder → unchanged.

### HB-ACC-14 [gap] The holder opens his activity history on /profile/account and sees bets he did not place, recorded as his own actions.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** house-bet rows in the holder's activity history look exactly like his own bets, with no chip or line: the house bet audit rows stay, with their house keys stripped (C4 ruling 154; C5-SPEC ruling 170), and `/profile/account` as served carries no house word (C5-SPEC ruling 248). Coverage gate: counts in its absence form — the `/profile/account` served-page absence (C5-SPEC ruling 250).
- **Trigger:** getOwnActivity reads audit rows by actorId. House-bet `market.position.opened` rows keep actorId = holder.
- **Expected:** - ~~House-bet rows show the "50pick liquidity stake" chip with the line "Placed by 50pick with your permission; it can't be cashed out and settles to your wallet." (en/sw/zh).~~
- Pill counts are unchanged.
- **Plan:** F10 chip surfaces (PositionCard, market own-positions, wallet rows, UD history); §3 H5–H9 audit payload
- **Evidence:** C:\kipindi-main\src\lib\server\user-service.ts:159-164
- **Fix:** ~~Add the activity feed to the F10 surfaces. The chip renders when payload.houseBotId is present.~~
- **Test:** ~~Holder chip fixtures in `qa:house-bots-visual` plus a props assertion in `test:house-bot-reports`.~~
- ✅ **SERVICE LAYER TESTED 2026-09-20 — `test:dsar-secrets` §6 (`6.HB-ACC-14.POSITIVE`, `6.HB-ACC-14`, `6.HB-ACC-14.deep`).** The holder's own `/profile/account` feed is opened as the THIRD door on §6's existing fixture: the house-bet row is PRESENT and keeps the holder's stake, side and market (positive control), and carries NEITHER house key at any depth, with no vocabulary word anywhere in the document. `6.CONTROL` already proves the durable row really carries both keys, so the absence is a measurement. ⛔ WHY IT WAS OWED: `getOwnActivity` and `exportUserData` only SHARE a stripper (`withoutHouseAuditKeys`, `user-service.ts:223` and `:108`) — §6 asserted it through `exportUserData` alone, and `getOwnActivity` was called once in the whole suite corpus, for the OFFICER and about DSAR rows. Proved by mutation 2026-09-20: dropping the strip from `getOwnActivity` alone reddens ONLY the three new assertions and leaves every `exportUserData` line green, which is exactly the hole this closes.
- ⚠️ **ITS SERVED HALF STAYS NOT MEASURED** and keeps its own home, `DEFERRED-TESTS.md` row 79 (ruling 248, the served layer): no fresh build was spent and port 3021 was held by the visual sweep.

### HB-ACC-15 [gap] FUTURE: a phone-number change flow ships. Today only erasure writes phoneE164.
- **Trigger:** Any new `db.user.update` that writes phoneE164.
- **Expected:** - The hook fires and adds cause CONSENT_STALE{PHONE_CHANGED}. The sign-in identifier changes, and so does the bound payout destination. Re-verify is required.
- The admin bell names the change without showing the number.
- The build fails if a new phoneE164 writer lacks the hook.
- **Plan:** I9; §6
- **Evidence:** C:\kipindi-main\src\lib\server\erasure.ts:393-395 (the only phoneE164 writer outside registration)
- **Fix:** Source pin in `test:house-bot-holder-lifecycle`: an allowlist of writers for passwordHash, phoneE164, role, status and wallet freeze, each required to call the hook.
- **Test:** ⛔ **RECONCILED 2026-09-20 — MIS-ROUTED, NOT UNTESTED.** The old line described a test without naming one (*"That pin, plus a red fixture file…"*), so the coverage gate could resolve it through no door. The pin it describes IS the shipped one.
- **RULING: A2** (`04-amendments.md`, which merges HB-ACC-15). ✅ **NAMED: `test:house-bot-holder-lifecycle` §1 and §4** — `WRITTEN_FIELDS` includes `phoneE164` (`house-bot-holder-lifecycle.test.mts:53`); `1.1` fails on any unhooked writer of it; `1.2` holds the writer population shrink-only at `WRITER_CEILING` 33; `1.3` proves the hook wired at ≥18 real sites; `1.4` requires every exemption to carry a reason; §4 plants both halves — `4.1` an unhooked writer IS reported, `4.2` a hooked one passes, `4.5` an irrelevant field is not a writer — and the suite carries its own floor `MIN_ASSERTIONS` 16.
- ⚠️ **HONEST RESIDUE, and it must NOT be sold as coverage:** §4's planted writer is a `status` write. A plant on `phoneE164` SPECIFICALLY would prove that entry of `WRITTEN_FIELDS` is live rather than merely present in an array literal. That is a CONTROL GAP, not a missing test, and it does not move any ceiling.

### HB-ACC-16 [gap] FUTURE: a code change rewrites passwordHash without the holder acting: rehash-on-login, a scrypt parameter upgrade, or setting a password after OTP sign-in.
- **Trigger:** A new passwordHash writer. Today's writers are auth-service.ts:641, password-reset.ts:242, :271, :326 and erasure.ts:397.
- **Expected:** There must be no silent mass auto-pause of every bot when holders sign in. Either:
- the writer declares passwordSetVia=REHASH and updates HouseBot.passwordFingerprint in the same transaction; or
- the build fails.
- **Plan:** §6 password check (the fingerprint is sha256 of the hash)
- **Evidence:** C:\kipindi-main\src\lib\server\password-reset.ts:74-76 (passwordFingerprint hashes the stored hash; it changes on any rewrite, since each write gets a new salt)
- **Fix:** - Pin the writer list, as in HB-ACC-15.
- Document in HOUSE-BOTS.md that any rehash must refresh live bot fingerprints atomically.
- **Test:** ✅ **TESTED 2026-09-20 — `test:house-bot-engine` §19.J (`19.J0`–`19.J3`), BOTH STORES, through the real hook AND a hookless sweep.** The "or the build fails" half was already `test:house-bot-holder-lifecycle` §1 (`1.1`–`1.4`, `WRITER_CEILING` 33, plants at `4.1`/`4.2`/`4.5`). What nothing drove was the ESCAPE HATCH: `PASSWORD_SET_VIA` includes `REHASH` (`constants.ts:168`) and `holderCauses` raises `PASSWORD_CHANGED` ONLY on `fingerprintNow !== bot.passwordFingerprint` (`consent.ts:97`) — the only `REHASH` anywhere under `scripts/` was `test:house-bot-migrations` `d.11`, which proves the DATABASE check constraint accepts the STRING. `19.J1` PLANTED: a REHASH that does NOT refresh the fingerprint stops the bot (AUTO_PAUSED(PASSWORD_CHANGED), one A1, one event). `19.J2`: with the fingerprint refreshed, the same REHASH state raises no cause and the bot stays ACTIVE and rings nobody. `19.J3` POSITIVE CONTROL: an ordinary SELF_CHANGE on the SAME fixture still pauses, so the new branch cannot weaken 19.A row 1. Seen red 2026-09-20 by a REHASH exemption in `consent.ts` — which reddens ONLY `19.J` and leaves `19.A1`–`19.A3` green, i.e. nothing else in the suite reports it.
- ⚠️ **TWO THINGS MEASURED THAT THIS ROW GOT WRONG, recorded rather than quietly matched:** (1) **No shipped writer can refresh `HouseBot.passwordFingerprint` while the bot is ACTIVE** — `setVerified` is the only one and it is PAUSED-only (`house-bot-dal.ts:2174`), so the row's "in the SAME transaction" contract has no implementation to assert today; `19.J2` drives the PREDICATE that contract depends on and says so in its own label. (2) The pause's `method` for a rehash is **UNKNOWN, never REHASH** — `CREDENTIAL_CHANGED_VIA` is `PASSWORD_CHANGE_METHODS` (SELF_CHANGE, RESET_LINK, OFFICER_TEMP) plus UNKNOWN, and a rehash is deliberately not a credential change. `19.J1b` pins that in both directions and `19.J1c` proves REHASH is still worded and reachable elsewhere (`wrongPasswordCopy` → "a security update"), so the UNKNOWN is a distinction and not a dropped case.

### HB-ACC-17 [partial] The holder self-excludes while the bot is ACTIVE or PAUSED. Later the minimum period ends and an officer reopens the account.
- **Trigger:** selfExclude:
- status SELF_EXCLUDED;
- wallet freeze SELF_EXCLUSION;
- sessions revoked.
- **Expected:** On exclusion:
- The hook sets AUTO_PAUSED(SELF_EXCLUDED) and cancels intents.
- Admins get bell + email: "Bot A paused — the holder self-excluded until 20 Sep 2026. No bot bet can be placed from this account."
- The holder gets no bot notice, no stake notices and no hourly summaries.
- A fire already in flight is refused by H2. The freeze takes wallet:<id>, so it waits for any bet holding that lock to finish.
- The exclusion never lifts itself.

After an officer reopens the account, consent is void (cause CONSENT_VOID_RG). The way out is Re-verify, then Start.

Strip copy: "Self-excluded until 20 Sep. After an officer reopens the account, the holder's permission must be confirmed again."
- **Plan:** I9; F6 SELF_EXCLUDED row ("Start disabled until eligibility passes"); §3 H2
- **Evidence:** - C:\kipindi-main\src\lib\server\responsible-gambling.ts:274-278: exclusion writes.
- C:\kipindi-main\src\app\admin\players\[id]\actions.ts:161-197: officer reopen.
- **Fix:** - The SELF_EXCLUDED auto-pause writes pauseDetail.consentVoid=true.
- Eligibility adds CONSENT_VOID_RG until a VERIFIED event exists later than selfExclusionStartedAt.
- ~~Holder emitters are gated on isLockedOut (responsible-gambling.ts:349-360).~~
- **Test:** `test:house-bot-holder-lifecycle`:
- Exclude → paused, 0 holder bot notices.
- Reopen → Start refused until re-verify.
- `test:house-bot-caps`: an exclusion mid-burst → nothing commits after it.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** there are no holder emitters to gate: the holder receives no house-bot notice at all (D19c; C4 ruling 149), so the test's 0 holder bot notices holds with or without a lockout. Coverage gate: partly struck by D19.

### HB-ACC-18 [partial] The holder receives a FINAL identity refusal (UNDERAGE, SANCTIONED or DUPLICATE_IDENTITY). The wallet freezes, then an officer decides his refused funds, which may forfeit 50pick's float.
- **Trigger:** - freezeForFinalRefusal adds IDENTITY_REFUSED.
- decideRefusedFunds may forfeit the balance.
- Settlement still credits the frozen wallet.
- **Expected:** On the freeze:
- The hook sets AUTO_PAUSED(IDENTITY_REFUSED). The detail lists every freeze reason. Intents are cancelled.
- Admins get bell + email: "Bot A paused — identity refused (final: DUPLICATE_IDENTITY). The wallet is frozen; an officer will decide the TZS X balance, which includes 50pick float."
- Consent is void. The account may not belong to one eligible adult, so Remove is the recommended CTA.

On the funds decision:
- ~~The refused-funds screen shows the officer: "House bot account — house stakes TZS S and returns TZS W since designation".~~
- The owner gets bell + email when the decision is recorded, with the forfeited and returned amounts.
- UNDERAGE also gets a COMPLIANCE audit flag.

If an officer reopens the refusal: Re-verify, then Start.
- **Plan:** F6 WALLET_FROZEN; I9
- **Evidence:** - C:\kipindi-main\src\lib\server\kyc-service.ts:774-782: freeze.
- C:\kipindi-main\src\lib\server\kyc-service.ts:825-844: reopen.
- C:\kipindi-main\src\lib\server\refused-funds.ts:274-281: forfeiture.
- C:\kipindi-main\src\lib\server\market-service.ts:3548-3575: payout credits the wallet without checking its status.
- **Fix:** - Add cause IDENTITY_REFUSED, read from wallet.freezeReasons.
- Add emitter `notifyAdminsHouseBotFundsDecision`, called from decideRefusedFunds when the user has any bot row.
- ~~Add a house row on the refused-funds page.~~
- Consent void until a VERIFIED event after the reopen.
- **Test:** `test:house-bot-holder-lifecycle`:
- Final refusal → paused IDENTITY_REFUSED.
- Forfeiture → owner alert with amounts.
- Reopen → Start refused until re-verify.
- `test:house-bot-reports`: forfeit counted once.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the refused-funds screen gains no house line (D20: no admin screen splits house money out — the same class as the KYC card's struck house line, C5-SPEC ruling 197); the pause, the consent void and the owner's funds-decision alert are untouched by D20. Coverage gate: partly struck by D20.

### HB-ACC-19 [partial] After the holder changed his password, the admin keeps typing the OLD one.
- **Trigger:** verifyHouseBotPassword, under withLock login:<id>, spends the holder's login failure counter: 5 failures lock the account for 30 minutes.
- **Expected:** Each wrong try shows inline: "That isn't his current password. It was changed on 13 Sep 14:02 EAT in Account settings — ask the holder for the new one. N attempts left."
- An empty input is not counted.
- The field is cleared, focus returns to it, and the modal stays open.
- The admin can never spend the holder's last 2 attempts. When failedLoginCount ≥ 3, refuse without counting: "Stop here — the last 2 attempts are kept for the holder. Ask him to sign in once (that resets the count), then try again."
- lockedUntil is never set by admin attempts.
- A SECURITY audit `house_bot.password_rejected` per try, and one admin bell when the reserve state is reached.
- The verify compares against the fresh in-lock row. Login itself compares against the pre-lock row, and that must not be copied.
- **Plan:** §6 Password check steps 2-5; F1 Consent attempts line
- **Evidence:** - C:\kipindi-main\src\lib\server\auth-service.ts:813-814: 5 failures → 30 minutes.
- C:\kipindi-main\src\lib\server\auth-service.ts:965-988: verifies with the pre-lock `user` hash at :967; the counter is shared.
- **Fix:** - Add a step 3.5 in verifyHouseBotPassword: if freshUser.failedLoginCount ≥ LOCKOUT_MAX_FAILS−2, return reason `verify_reserved` without verifying.
- Verify with freshUser.passwordSalt/passwordHash.
- Show passwordSetAt and passwordSetVia (HB-ACC-03) in the modal.
- **Test:** `test:house-bot-designation`:
- 3 wrong tries → the 4th is refused and not counted; lockedUntil null; the holder's login with the correct password succeeds.
- A red mutation removing the reserve lets the admin lock the account and must fail.

### HB-ACC-20 [partial] The admin resumes the bot after a password change: the exact re-verify modal, the resume-after-verify option, and Start being refused after a successful verify.
- **Trigger:** The Re-verify button on the /admin/desk/<id> strip, while CONSENT_STALE stands.
- **Expected:** The modal:
- Title "Enter the new password to resume".
- Body "Bot A · Player #A3F2K8 · password changed 13 Sep 14:02 EAT in Account settings. Checked once and never stored."
- Kit PasswordInput "Holder's current password".
- Kit Checkbox "Start Bot A again after verifying", ticked by default when pauseDetail.wasActive.
- The attempts line.
- Submit reads "Verify" or "Verify and start"; disabled until non-empty, and while pending.

Outcomes:
1. Verified and started: fingerprint written (CAS), VERIFIED + STARTED events, ACTIVE. Overlay: "Verified. Bot A is live again."
2. Verified, but Start refused (master OFF, DAILY_LOSS_STOP, a cap or mode unset, another cause): the fingerprint is kept and the bot stays PAUSED(MANUAL), or AUTO_PAUSED with its remaining causes. The modal closes and the strip Callout reads "Verified. Not started: <reason> →". Unset caps return {field, href} and the page moves there.
3. Wrong, reserved, locked, rate-limited or officer-set: inline error; the modal stays open.
- **Plan:** F6 (Re-verify → PAUSED(MANUAL) → separate Start); §6 reverifyHouseBotAction; §8 Modal forms
- **Evidence:** C:\kipindi-main\src\lib\server\password-reset.ts:74-76 (the fingerprint the verify refreshes)
- **Fix:** 1. `reverifyHouseBotAction({botId, password, resume})` returns `{verified: true, started: boolean, startRefusal?: {reason, field?, href?}}`. Success with a refusal is not an `ov.fail`.
2. Record wasActive in pauseDetail at auto-pause.
3. Add FAILURE-INVENTORY §6 rows.
4. Add the unsaved-changes exemption for the modal.
5. Start re-reads the fingerprint inside wallet:<botUser>.
- **Test:** - `test:house-bot-console`: all 3 outcome branches.
- `qa:house-bots-visual`: modal default, error and split-outcome states at 360 and 1920.
- Engine: resume=true with master OFF → PAUSED(MANUAL) with a fresh fingerprint.

### HB-ACC-21 [partial] Support suspends the holder while designated, then restores him.
- **Trigger:** suspendPlayerAction (ACTIVE accounts only; sets SUSPENDED and revokes sessions); later restorePlayerAction.
- **Expected:** On suspend:
- The suspend dialog on /admin/players/<id> shows "This account is house bot 'Bot A' (ACTIVE). Suspending pauses the bot."
- The hook sets AUTO_PAUSED(ACCOUNT_SUSPENDED) and cancels intents.
- Admins get bell + email: "Bot A paused — support suspended the holder: '<reason>' (<officer>)."
- No holder bot notice.
- A fire already in flight maps account_blocked plus a fresh status read to SUSPENDED.

On restore:
- The cause clears. Start is enabled with no re-verify; consent is unchanged.
- Admin bell: "Bot A can be started again — holder restored."
- No auto-resume.
- **Plan:** I9; F6 ACCOUNT_BLOCKED; §8 player profile chip
- **Evidence:** - C:\kipindi-main\src\app\admin\players\[id]\actions.ts:109-122: suspend.
- C:\kipindi-main\src\app\admin\players\[id]\actions.ts:187-188: restore.
- C:\kipindi-main\src\lib\server\market-service.ts:1072-1076: one reason for all statuses.
- **Fix:** - Hooks at actions.ts:121 and :188.
- The dialog warning reads the live bot row.
- Split ACCOUNT_BLOCKED into ACCOUNT_SUSPENDED / ACCOUNT_CLOSED / RG causes from the fresh status.
- **Test:** `test:house-bot-holder-lifecycle` suspend → restore round trip; a console fixture for the dialog line.

### HB-ACC-22 [partial] The holder sets or lowers his daily loss limit while the bot is ACTIVE. Later his own manual bet is refused because house losses used up the limit.
- **Trigger:** setLimits applies the loss limit at once, with no deferral. checkLossLimit sums all gambling on the account over a rolling 24h, house stakes included.
- **Expected:** The hook runs checkLossLimit(userId, stakeMinTzs). If it refuses:
- AUTO_PAUSED(OWNER_LOSS_LIMIT).
- Admin bell + email: "Bot A paused — the holder's own daily loss limit (TZS 50,000) is reached; it counts house stakes. Frees from 14:05 EAT."
- No holder bot notice (RG).
- Start is disabled until the rolling 24h window allows stakeMin. The wording is rolling, not an EAT day.

~~Holder's own refused bet:~~
- ~~en: "Your daily loss limit would be exceeded. It includes liquidity stakes 50pick placed from your account."~~
- ~~sw: "Kikomo chako cha hasara cha kila siku kingepitwa. Kinajumuisha dau za ukwasi ambazo 50pick iliweka kutoka akaunti yako."~~
- ~~zh: "将超出您的每日亏损限额。其中包括 50pick 从您账户下的流动性投注。"~~

~~The RG limits meter carries the same note.~~
- **Plan:** I9; F6 OWNER_LOSS_LIMIT; §13 risk 4
- **Evidence:** - C:\kipindi-main\src\lib\server\responsible-gambling.ts:189: limit set immediately.
- C:\kipindi-main\src\lib\server\responsible-gambling.ts:499-509: rolling 24h, all gambling txns.
- **Fix:** - Hook after responsible-gambling.ts:215.
- ~~A holder variant of the `loss_limit_daily` copy when the window contains house-marked BET_PLACED rows.~~
- ~~A meter label on the limits page.~~
- Start refusal copy states the rolling free time.
- **Test:** ⛔ **RECONCILED 2026-09-20 — the wording half is WITHDRAWN, the rest was ALREADY ASSERTED, and the "ghost owner" was a NAMING SLIP.** ~~The bot loses 50k → the holder's bet is refused with house wording.~~
- **THE GHOST THAT WAS NOT ONE:** this row named **`test:rg-limit-race`**, which `package.json` does not declare — but the suite EXISTS under a different key: **`test:rg-race`** runs `scripts/rg-limit-race.test.mts` (`package.json:57`). The row had quoted the FILE STEM, not the npm key. Corrected in place: ~~`test:rg-limit-race`~~ → `test:rg-race`, unchanged.
- ✅ **NAMED: `test:house-bot-money`** `12.0` (the limit is in force NOW), `12.1` (a HOUSE stake over the holder's OWN daily loss limit is REFUSED with `loss_limit_daily`), `12.1b` (the refusal moved no money), `12.2` POSITIVE CONTROL (a stake that FITS still lands); **`test:house-bot-engine`** 19.A row 8 (`LOSS_LIMIT_SET` → `AUTO_PAUSED(OWNER_LOSS_LIMIT)` + botStopped + ONE `AUTO_PAUSED` event, driven through the hook AND through the sweep with no hook at all); **`test:house-bot-designation`** `3.16`/`3.16b` (Start blocked, and refused with the cause); **`test:house-bot-rules`** (`canStart` false while the cause stands).
- **RULING:** D19c for the copy half; `package.json` for the key.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** no refusal carries house wording (D19c): the holder's refused bet shows the existing `loss_limit_daily` sentence and the limits page gains no note; house stakes still count toward his loss limit, and the pause and admin alert stand. Coverage gate: partly struck by D19.

### HB-ACC-23 [partial] The holder is promoted to staff, either by the owner on /admin/staff or by the one-shot bootstrap promotion (his phone is in ADMIN_BOOTSTRAP_PHONES).
- **Trigger:** applyRoleChange (role update + session revoke), or the bootstrap update in loginWithPassword.
- **Expected:** - The hook sets AUTO_PAUSED(ROLE_CHANGED{from: PLAYER, to: <role>}).
- Admin bell + email: "Bot A paused — the holder is now <Role> staff. Staff accounts can't be house bots."
- Before submit, the promotion form warns: "This account is house bot 'Bot A'; promoting it pauses the bot."
- ~~Holder notice (not RG):~~
  - ~~en: "Liquidity stakes are paused because your account role changed."~~
  - ~~sw: "Dau za ukwasi zimesimamishwa kwa sababu jukumu la akaunti yako limebadilika."~~
  - ~~zh: "由于您的账户角色已更改，流动性投注已暂停。"~~
- Way out: role back to PLAYER → Start, with no re-verify.
- **Plan:** I9 role change; F6 ROLE_CHANGED; §4.6 house_account_ineligible
- **Evidence:** - C:\kipindi-main\src\app\admin\staff\actions.ts:36-39: staff role change.
- C:\kipindi-main\src\lib\server\auth-service.ts:1049: bootstrap promotion.
- **Fix:** - Hooks at both sites.
- A warning line in the staff add and change previews.
- **Test:** `test:house-bot-holder-lifecycle`: promote → paused; demote → Start allowed; bootstrap in test env → paused.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice (D19c; C4 ruling 149); the pause, the admin bell and email, and the promotion warning stand. Coverage gate: partly struck by D19.

### HB-ACC-24 [partial] The holder applies to be an agent (pending), is approved (role AGENT), is deactivated, or is revoked (back to PLAYER).
- **Trigger:** - Approval sets role AGENT and revokes sessions.
- revokeAgent sets role PLAYER.
- deactivateAgent keeps role AGENT.
- **Expected:** - Pending: the bot is unaffected. The bot page warns "Agent application pending — approval will pause Bot A". ~~The agents/[id] page shows the House bot chip.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no admin house chip (C5-D20-REPLAN §2, 236–242).
- Approval: the hook sets AUTO_PAUSED(ROLE_CHANGED{to: AGENT}); admin bell + email; ~~holder notice as in HB-ACC-23~~.
- Deactivated: role stays AGENT, so the bot stays paused.
- Revoked: role PLAYER → Start enabled. From then on, his recruits' bets are skipped (HB-ACC-09).
- **Plan:** §6 always-blocking role ≠ PLAYER; §3 H2 role check
- **Evidence:** - C:\kipindi-main\src\lib\server\agent-application-service.ts:1308-1312: approval.
- C:\kipindi-main\src\lib\server\agent-application-service.ts:1406-1409: revoke.
- **Fix:** - Hooks at :1308 and :1406.
- Eligibility warning row agentApplicationPending.
- ~~Chip on /admin/agents/[id].~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no admin house chip.
- **Test:** `test:house-bot-holder-lifecycle`: approve → paused; revoke → startable.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice on approval (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### HB-ACC-25 [partial] Support issues a temporary password to the holder, who forgot his own, while designated. Changing it at next sign-in is not enforced.
- **Trigger:** adminResetPasswordAction → adminResetPassword.
- **Expected:** The hook sets AUTO_PAUSED(PASSWORD_CHANGED{via: OFFICER_TEMP}).

Admin strip: "Password reset by support (temporary) on 13 Sep. Re-verify is blocked until the holder sets his own password in Account settings." Re-verify is shown disabled with that reason, not hidden.

~~Holder notice:~~
- ~~en: "Liquidity stakes are paused. Change the temporary password in Account settings; 50pick will then ask for your permission again."~~
- ~~sw: "Dau za ukwasi zimesimamishwa. Badilisha nenosiri la muda kwenye Mipangilio ya Akaunti; kisha 50pick itaomba ruhusa yako tena."~~
- ~~zh: "流动性投注已暂停。请在账户设置中更改临时密码；之后 50pick 会再次征得您的许可。"~~

When he changes it himself (via SELF_CHANGE), Re-verify is enabled and admins get a bell: "The holder set his own password — Re-verify to resume."

The reset dialog on the player page shows the house-bot warning.
- **Plan:** §6 officer-reset refusal copy
- **Evidence:** C:\kipindi-main\src\lib\server\password-reset.ts:255-283 ("not enforced in code yet" at :257-258)
- **Fix:** - Copy specific to each `via` in feed-copy ~~and notifyHouseBotOwner~~.
- The hook alerts when SELF_CHANGE follows OFFICER_TEMP.
- Warning row in reset-password-button.
- **Test:** `test:house-bot-designation`: officer reset → blocked copy; self change → enabled plus one bell.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice (D19c; C4 ruling 149); the strip copy, the disabled Re-verify and the admin bell stand. Coverage gate: partly struck by D19.

### HB-ACC-26 [partial] The holder changes his password more than once, including while the admin's Re-verify modal is open or between verify and Start.
- **Trigger:** Repeated changePassword calls. They are not serialised with the login:<id> lock the verify uses.
- **Expected:** - One AUTO_PAUSED transition in total. Each change appends a HOLDER_PASSWORD_CHANGED event.
- At most one admin bell per bot per day. The strip adds "changed again at 14:20".
- Verifying with an intermediate password fails against the fresh row.
- If a change lands after the verify but before the fingerprint write, the conditional write fails (or Start's in-lock compare refuses) and the strip returns to "password changed".
- No bet ever fires on stale consent.
- **Plan:** §6 Password check (fresh row); F3 fingerprint refusal
- **Evidence:** C:\kipindi-main\src\lib\server\password-reset.ts:314-326 (reads, verifies and writes with no lock)
- **Fix:** - The re-verify write is conditional: `UPDATE "HouseBot" SET "passwordFingerprint"=$fp WHERE id=$1 AND $fp = fingerprint(current hash re-read in the same wallet:<botUser> lock)`.
- AlertOnce key `bot:<id>:PASSWORD_CHANGED:<EAT day>`.
- **Test:** ⛔ **RECONCILED 2026-09-20 — the "1 bell" half is WITHDRAWN, and it asserts the SILENCING the sealed flow exists to prevent.** ~~3 changes → 1 transition, 3 events, 1 bell.~~ That line assumes an AlertOnce key of `bot:<id>:PASSWORD_CHANGED:<EAT day>`.
- **RULING: X4** (`02-sealed-flows.md:39`), which rejects THAT KEY BY NAME: *"The alert-once key `bot:<id>:<code>:<EAT day>` would silence a second password change on the same day. → Key password alerts as `pw:<botId>:<newFingerprint>`."* §2.2 row 93 records *"A1 again (new key per X4)"*, and `04-amendments.md:63` routes this row to seal-flows X4 plus the §2.6 step 7 mismatch check. Shipped at `constants.ts:657`, keyed on the FINGERPRINT and used at `holder-hook.ts:146` — so **three changes are three fingerprints and therefore THREE bells**, which is the opposite of what this row asked for. Writing the row as drafted would have built the silencing X4 forbids.
- ✅ **NAMED: `test:house-bot-engine`** `19.C1`/`19.C1b`, `19.C2` (the `pw:<botId>:<fingerprint>` claim), `19.C3` (X4: changed again → alerts again), `19.C4`, `19.C5` (ONE transition: two hooks and a sweep racing give ONE A1 and ONE `AUTO_PAUSED`, never an A2), `19.C9`–`19.C9c`; and "no bet ever fires on stale consent" at **`test:house-bot-designation`** `6.4`, with its planted control `6.2b`.

### HB-ACC-27 [partial] The holder changes his password between the wizard's Consent step and the owner pressing Designate.
- **Trigger:** designateHouseBotAction runs after a successful consent check.
- **Expected:** - Designate verifies the password and inserts the bot in the same request. The fingerprint comes from the row that was verified.
- If the hash changed in between: refuse with "His password changed a moment ago — enter the new one.", router.replace to step=consent with the password cleared, and create no bot row.
- **Plan:** F1 wizard states; §6 designateHouseBotAction
- **Evidence:** C:\kipindi-main\src\lib\server\auth-service.ts:963-967 (verify happens under login:<id>, but the precedent compares against the pre-lock row)
- **Fix:** - Designate re-reads the user in its insert transaction and compares fp(fresh hash) with the verified fingerprint.
- Add a FAILURE-INVENTORY row.
- **Test:** `test:house-bot-designation`: interleave a password change between verify and insert → refused, no row.

### HB-ACC-28 [partial] Compliance freezes the holder's wallet, directly or through force re-verify with "also freeze", and later unfreezes it.
- **Trigger:** freezeWalletByOfficer → applyFreeze. forceReverifyKycAction with alsoFreeze=1.
- **Expected:** - The hook sets AUTO_PAUSED(WALLET_FROZEN{reasons: [OFFICER]}).
- Admin bell + email: "Bot A paused — wallet frozen by compliance: '<reason>'."
- The freeze dialog shows the house-bot line.
- Force re-verify without a freeze → no pause; warning "identity re-verification requested".
- Lifting OFFICER while another hold stands keeps the pause and names the remaining hold.
- Last hold lifted → Start enabled, no auto-resume.
- **Plan:** I9 frozen wallet; F6 WALLET_FROZEN
- **Evidence:** - C:\kipindi-main\src\lib\server\wallet-freeze.ts:61-63: freeze reason set written.
- C:\kipindi-main\src\lib\server\wallet-freeze.ts:139-148: other holds are named.
- C:\kipindi-main\src\app\admin\players\[id]\actions.ts:371-376: force re-verify's freeze.
- **Fix:** - Hook inside applyFreeze after the write, for add and remove.
- Strip lists freezeReasons via FREEZE_REASON_LABEL.
- **Test:** `test:house-bot-holder-lifecycle`: each freeze reason, added and removed in combination.

### HB-ACC-29 [partial] The holder takes a cooling-off break, and it expires on its own.
- **Trigger:** coolOff sets COOLED_OFF with a timer (no session revoke). The bet gate lifts when the timer passes.
- **Expected:** - The hook sets AUTO_PAUSED(COOLING_OFF{until}).
- Admin bell + email with the end date.
- No holder notices; push is already suppressed while locked out.
- The bot never resumes by itself. At expiry the planner sends one admin bell: "Bot A's holder break ended at 18:00 EAT — Start when ready."
- Start is enabled with consent intact.
- An extension (the furthest date wins) updates the date shown.
- **Plan:** I9; F6 COOLING_OFF ("Start disabled… end date")
- **Evidence:** - C:\kipindi-main\src\lib\server\responsible-gambling.ts:302-334: coolOff.
- C:\kipindi-main\src\lib\server\market-service.ts:1043-1044: timer-based bet block.
- **Fix:** - Hook at responsible-gambling.ts:315.
- Planner AlertOnce `bot:<id>:COOLING_OFF_ENDED:<day>`.
- ~~Holder emitters gated on isLockedOut.~~
- **Test:** `test:house-bot-holder-lifecycle` with an injected clock: pause, expiry bell, no auto-resume.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** there are no holder emitters to gate: the holder receives no house-bot notice at all (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### HB-ACC-30 [partial] The holder forgets his password and resets it himself through the emailed link.
- **Trigger:** consumeResetToken. The link is single-use through its password fingerprint.
- **Expected:** Same as a settings change:
- The hook sets AUTO_PAUSED(PASSWORD_CHANGED{via: RESET_LINK}), with copy "Password reset by the holder via email link on 13 Sep".
- Re-verify is allowed, unless the email was set by an officer within the last 30 days (HB-ACC-03).
- The holder gets the existing "Your password was changed" notice ~~plus the bot pause notice~~.
- **Plan:** I9 password change; §6
- **Evidence:** C:\kipindi-main\src\lib\server\password-reset.ts:240-251 (hash written at :242; alert at :251)
- **Fix:** Covered by the HB-ACC-01 hook plus the HB-ACC-03 column.
- **Test:** `test:house-bot-holder-lifecycle`, reset-link path.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder gets only the platform's existing "Your password was changed" notice, and no bot pause notice (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### HB-ACC-31 [partial] Someone else types wrong passwords on the holder's account until it locks for 30 minutes.
- **Trigger:** loginWithPassword failures set lockedUntil.
- **Expected:** - The bot keeps running: password and consent are unchanged, and pausing would let anyone stop a bot by typing wrong passwords.
- The hook sends one admin SECURITY bell per bot per day: "Holder of Bot A was locked out after 5 wrong sign-in attempts (until 14:32 EAT). The bot continues. If he didn't do this, ask him to change his password."
- Re-verify and designate show the locked state with a countdown.
- **Plan:** §6 lockedUntil blocking row
- **Evidence:** - C:\kipindi-main\src\lib\server\auth-service.ts:942-955: lock refusal.
- C:\kipindi-main\src\lib\server\auth-service.ts:967-988: lock set.
- **Fix:** Hook at auth-service.ts:974 when shouldLock, with AlertOnce.
- **Test:** ⛔ **RECONCILED 2026-09-20 — MIS-ROUTED, NOT UNTESTED.** The old line named no suite, so the coverage gate resolved it through no door; the behaviour it describes is asserted in full.
- **RULING: A2** (`04-amendments.md`, which merges HB-ACC-31). ✅ **NAMED: `test:house-bot-engine`** `19.D1` — A2 row 16, driven TWICE through the hook: a lockout never stops a bot, ONE SECURITY bell for the EAT day carrying when the lockout ends, no status change and no event, with the `until` compared against the fixture's own instant rather than merely asserted present. **`test:house-bot-designation`** `1.10` (`BLOCKED{SIGN_IN_LOCKED}`, uncounted), `3.13` (in designate and in re-verify), `3.13b` (in START it is a WARNING and not a block — the bot continues, which is this row's whole point), `1.8` (`RATE_LIMITED` carries `retryAfterSec` and the holder's own count is untouched). Code: `holder-hook.ts:315-317`, `eligibility.ts:136`/`:401`, `designation.ts:158`.

### HB-ACC-32 [partial] The holder tries to object to a result where his only position is a house stake.
- **Trigger:** objectionEligibility counts any position held by that user.
- **Expected:** Refused with a distinct reason, HOUSE_STAKE_ONLY:
- ~~en: "Liquidity stakes 50pick placed from your account can't be used to object. Only your own stakes count."~~
- ~~sw: "Dau za ukwasi ambazo 50pick iliweka kutoka akaunti yako haziwezi kutumika kupinga matokeo. Dau zako binafsi pekee ndizo zinahesabika."~~
- ~~zh: "50pick 从您账户下的流动性投注不能用于提出异议。只有您自己的投注才算数。"~~

If he also holds his own stake, he may object.
- **Plan:** §3 sanctioned change (f); I7
- **Evidence:** C:\kipindi-main\src\lib\server\objections-service.ts:99,108 (the only refusal is NO_POSITION)
- **Fix:** - Add HOUSE_STAKE_ONLY to the `why` union, ~~with i18n keys in 3 locales~~.
- Object-button state.
- Guard in fileObjection too.
- **Test:** `test:house-bot-seam`: house only → HOUSE_STAKE_ONLY; own + house → eligible; ~~i18n parity~~.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** no refusal carries house wording (D19c): `HOUSE_STAKE_ONLY` stays server-only, the market page shows the neutral `objNotEligible` state and `fileObjection` answers with its generic sentence (C4 ruling 146). Coverage gate: counts in its regression form — the neutral `objNotEligible` (C5-SPEC ruling 250).

### HB-ACC-33 [partial] House positions settle, or hourly summaries fall due, while the holder is self-excluded or cooling off.
- **Trigger:** ~~notifyHouseBotOwnerStake, notifyHouseBotOwnerHourSummary and~~ settlement outcome notices. Only push is suppressed today.
- **Expected:** - No stake notices and no hourly summaries ~~while isLockedOut~~.
- Outcome notices for his settled positions stay in-app, as today, ~~with the liquidity label and~~ no promotional wording.
- No liquidity-activity email ~~during the lockout~~.
- **Plan:** F6 alerts (no holder notice for an RG pause); F10 notices; §7
- **Evidence:** C:\kipindi-main\src\lib\server\push-service.ts:75-83
- **Fix:** ~~Gate the holder emitters on isLockedOut; list them in the comms registry.~~
- **Test:** `test:house-bot-comms`: RG-locked holder → 0 stake or summary rows; outcome row present.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no stake notice, hourly summary or house-bot email at any time, and his outcome notices are byte-identical to any player's, with no label (D19c; C4 rulings 143 and 149); the test's 0 stake or summary rows and the outcome row stand. Coverage gate: partly struck by D19.

### HB-ACC-34 [partial] The holder changes or clears his email, or support sets it, while designated. Covers email unverified.
- **Trigger:** setUserEmail clears or changes the address and resets emailVerifiedAt. An alert goes to the old address.
- **Expected:** - No pause.
- HouseBotEvent HOLDER_EMAIL_CHANGED{by: self|officer}.
- The bot page warning refreshes: "Email unconfirmed — the holder can't top up until he confirms it."
- ~~Holder bot emails go to the current address.~~
- An officer-set email arms the HB-ACC-03 check and sends an admin bell. A self-change sends nothing.
- **Plan:** §6 warnings (email unverified at designation only)
- **Evidence:** - C:\kipindi-main\src\lib\server\email-verification.ts:134,162: address change resets verification.
- C:\kipindi-main\src\lib\server\email-verification.ts:173-186: alert to the old address.
- **Fix:** Hook at both writes; the warning is computed live on /[botId].
- **Test:** `test:house-bot-holder-lifecycle`: self change → event and no bell; officer set → event, bell, and re-verify blocked after a reset link.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no house-bot email (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### HB-ACC-35 [partial] The holder turns two-step sign-in on or off.
- **Trigger:** confirmPlayer2fa / disablePlayer2fa. Login then challenges for a code.
- **Expected:** - No pause: the password is unchanged, and consent is password-only under D5.
- Event HOLDER_2FA_ON or HOLDER_2FA_OFF.
- Info row: "The holder uses two-step sign-in; 50pick's consent check uses the password only (owner ruling D5)."
- Verify never asks for or consumes a TOTP or backup code, and creates no session.
- **Plan:** D5; §6 Password check step 6
- **Evidence:** - C:\kipindi-main\src\lib\server\player-2fa.ts:35,75-77: 2FA on/off.
- C:\kipindi-main\src\lib\server\auth-service.ts:1069-1071: login challenge.
- **Fix:** Hook at player-2fa.ts:35 and :77; add the info row.
- **Test:** `test:house-bot-designation`: with 2FA enabled, verify succeeds without TOTP, no session, backup codes untouched.

### HB-ACC-36 [partial] The holder changes his display name, e.g. to his full name or to "50pick House". The leaderboard shows the first word.
- **Trigger:** updateProfileBasicsAction writes displayName.
- **Expected:** - No pause.
- /[botId] overview shows the live leaderboard handle with a warning: "Leaderboard shows @Ali — suggest a nickname."
- One owner AlertOnce if the new name matches /50pick|house|bot|liquidity/i, a public disclosure risk.
- The console label is unchanged.
- **Plan:** §6 warning (wizard only); D6
- **Evidence:** C:\kipindi-main\src\app\profile\actions.ts:56-59
- **Fix:** - Live warning on the overview tab.
- Hook plus name-pattern AlertOnce.
- **Test:** Console fixture; `test:house-bot-holder-lifecycle` name pattern → one bell.

### HB-ACC-37 [partial] The holder dies or cannot be reached, and the owner removes the bot.
- **Trigger:** removeHouseBotAction (reason, then the typed word REMOVE).
- **Expected:** - The Remove modal shows the live money: "Money stays in the holder's wallet: balance TZS X; open house stakes TZS Y will settle into it. 50pick's float must be recovered out of band."
- Pause is offered first if he is only unreachable.
- Intents are cancelled; ~~the holder notice and email are still sent to the account.~~
- Later settlements keep their markers; the bot page is read-only with its money tab.
- **Plan:** F8 Remove
- **Evidence:** C:\kipindi-main\src\lib\server\market-service.ts:3548-3575 (settlement credits the holder's wallet regardless of status)
- **Fix:** The Remove modal renders the live balance and open exposure from book.ts. Add a runbook entry in HOUSE-BOTS.md.
- **Test:** `qa:house-bots-visual` Remove modal with balances 0, 1,000 and 2,500,000; console action test.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice or email when his bot is removed (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### HB-ACC-38 [covered] The holder changes his password while a bot bet is already claimed and firing.
- **Trigger:** changePassword commits between F5 step 4 and the locked gate.
- **Expected:** - If the change commits before the in-lock read: house_consent_stale → AUTO_PAUSED(PASSWORD_CHANGED), intent SKIPPED, no money moved, one alert.
- If it commits after the in-lock read: the bet commits, since consent was valid when checked, and the hook pauses immediately after.
- The feed shows the bet before the pause event.
- **Plan:** §3 H2; §4.6 mapper
- **Evidence:** - C:\kipindi-main\src\lib\server\password-reset.ts:326: write outside any wallet lock.
- C:\kipindi-main\src\lib\server\market-service.ts:1134: the bet's wallet lock.
- **Test:** `test:house-bot-caps`: password change mid-burst → no bet after the in-lock refusal; exactly one pause.

### HB-ACC-39 [covered] The holder signs in on another device, which signs out his first device.
- **Trigger:** createSession replaces the active session.
- **Expected:** - The bot is unaffected: it uses no session. No event.
- Verify never creates a session, sets lastLoginAt or sends the sign-in email.
- **Plan:** §6 Password check step 6; §12 test:house-bot-designation
- **Evidence:** C:\kipindi-main\src\lib\server\session.ts:111-124
- **Test:** `test:house-bot-designation` (no session, no lastLoginAt); engine: a bet after the holder's re-login succeeds.

### HB-ACC-40 [covered] The holder cashes out his own stake, or taps Sell on a house stake.
- **Trigger:** cashOutPosition.
- **Expected:** - His own stake exits normally.
- ~~A house stake shows the SellButton houseStake state ("Liquidity stake — can't be cashed out") and the server refuses with house_position_no_exit (en/sw/zh).~~
- The holder is never put in the penalty box.
- **Plan:** §3 (d), (e), (i); F10
- **Evidence:** C:\kipindi-main\src\lib\server\market-service.ts:2704
- **Test:** `test:house-bot-seam` and `test:house-bot-money` (no cash-out on marked positions).
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** a house position reads as a closed exit: `cashOutValue` reports `WINDOW_PASSED` and `cashOutPosition` returns `origin/main`'s exit-window refusal verbatim (`exit_window_closed`, code `SELECTION_CLOSED`), so the button and toast say what they say for any closed exit (D19c; C4 ruling 147). Coverage gate: counts in its D19 form — money 1.13b–e, the closed-exit words and the served absence (C5-SPEC ruling 250).

### HB-ACC-41 [covered] The holder stakes the same side on a market the bot is in, or on a market where the bot has a PENDING intent.
- **Trigger:** The holder's buyPosition, then the bot's fire.
- **Expected:** - The holder's bet succeeds normally and is not a trigger (I3).
- The later bot fire → H2 OWNER_POSITION → SKIPPED(MARKET_HELD), why "Holder has his own open stake here".
- The shared bet.place bucket may push the bot into rate_limited backoff.
- **Plan:** §3 H2; I3; §5 min gap ≥ 20s
- **Evidence:** C:\kipindi-main\src\lib\server\rate-limit.ts:95
- **Test:** `test:house-bot-caps` OWNER_POSITION case.

### HB-ACC-42 [covered] The holder requests a withdrawal of TZS 1,000,000 or more while the bot is ACTIVE (AML hold).
- **Trigger:** withdraw sets AML_REVIEW and notifies AML officers.
- **Expected:** - F7 admin bell + email with the txn id, linking to /admin/transactions?q=<txnId>. OWNER_MONEY event.
- The bot sees the balance minus the hold. A low balance → skip + one AlertOnce per day.
- AML release or rejection alerts too.
- No pause.
- **Plan:** F7; §7 notifyAdminsHouseBotMoneyEvent
- **Evidence:** C:\kipindi-main\src\lib\server\wallet-service.ts:1908-1912
- **Test:** `test:house-bot-comms` (two identical money events → two rows).

### HB-ACC-43 [covered] The holder withdraws his whole balance while the bot is ACTIVE.
- **Trigger:** withdraw.
- **Expected:** - F7 alert: "Holder withdrew TZS X (txn …)."
- Fires are SKIPPED(balance_insufficient), with one AlertOnce per day: "Bot A skipped: balance TZS 0."
- Open house positions still settle to his wallet.
- No pause.
- While the bot is PAUSED, nothing is alerted (D3b).
- **Plan:** F7; §4.6 balance_insufficient
- **Evidence:** C:\kipindi-main\src\lib\server\wallet-service.ts:1478
- **Test:** `test:house-bot-engine` mapper, balance_insufficient → SKIPPED + AlertOnce.

### HB-ACC-44 [covered] The holder's top-up is pending, fails, or is refused (unconfirmed email, frozen wallet, source-of-funds declaration or deposit limit).
- **Trigger:** deposit gates.
- **Expected:** - No bot alert: no money moved. Only credited deposits alert (F7).
- The money tab lists pending and failed rows.
- The balance-low AlertOnce continues.
- **Plan:** F7
- **Evidence:** C:\kipindi-main\src\lib\server\wallet-service.ts:115
- **Test:** `test:house-bot-comms`: failed deposit → 0 admin rows.

### HB-ACC-45 [covered] The holder sets a session time limit or deposit limits.
- **Trigger:** setLimits.
- **Expected:** - A session limit never applies to bot bets: the engine passes no play-session start.
- Deposit limits affect only top-ups; a low balance leads to skips.
- No pause, no alert.
- **Plan:** §4.6 session_limit_reached anomaly row; F7
- **Evidence:** C:\kipindi-main\src\lib\server\responsible-gambling.ts:207-210
- **Test:** `test:house-bot-caps`: holder with a 15-minute session limit → bot bets still place.

## market-round (39)

### HB-LC-01 [gap] Up & Down closeness rule is checked against a stale price, so it almost never blocks momentum farming
- **Trigger:** BTC has only a 5-min chain. Round #412 opens 12:00:00 at 60,000 with targets 60,300 / 59,700. At 12:03:10 exchanges and the round terminal's 1-min vendor bar show 60,280 (93% of the way to UP). A player stakes UP 20,000. The board livePrice is still 60,000, because no newer boundary reading exists.
- **Expected:** COUNTER decide and fire (F5 step 8) use the freshest price a player can see. That is the terminal's 1-min vendor bar close no older than 120 s, else a CONFIRMED observation quoted no more than 60 s ago. Here 60,280: |280| > 25% x 300 → intent SKIPPED(UD_CLOSENESS), feed copy "Skipped — BTC had already moved 93% of the way to the UP target". If neither fresh source exists → SKIPPED(UD_STALE_PRICE), copy "Skipped — no fresh BTC price since 12:00:00, closeness can't be checked". The decision JSON records {price, source vendor|observation, ageSec}. No admin alert, no holder notice, no money moves, neutral feed tone.
- **Plan:** F4 closeness rule; I2; §4.1 market-view.ts; F5 step 8
- **Evidence:** C:/kipindi-main/src/lib/server/updown-board.ts:633-638 (livePrice = newest CONFIRMED observation) and :692, :1402-1424; C:/kipindi-main/src/lib/server/updown-service.ts:464,1320,1372,1528 (observations are only acquired at grid boundaries, so mid-round the newest reading is usually the round's own open); C:/kipindi-main/src/lib/server/updown-board.ts:1031-1057 + C:/kipindi-main/src/lib/server/updown-terminal-vendor.ts:42-44,51 (players see 1-min vendor bars on a 30 s cache)
- **Fix:** Amend F4 and I2: the engine price is `udPriceForDecision(asset)` in market-view.ts. Order: vendor 1-min bar (reuse the terminal's per-process cache, no new metered calls) with t ≥ now−120 s, else latestConfirmed with sourceQuotedAt ≥ now−60 s, else UD_STALE_PRICE. Add UD_STALE_PRICE to EngineCode and feed-copy.ts. Apply at decide and at fire. Document that without TWELVEDATA_API_KEY Up & Down modes effectively always skip.
- **Test:** test:house-bot-engine — (a) observation = openPrice, vendor bar at open + 0.93·margin → UD_CLOSENESS; (b) no vendor, observation 4 min old → UD_STALE_PRICE; (c) fresh bar inside 25% → decided. red:house-bot-engine mutation 'use board livePrice' must fail (a).

### HB-LC-02 [gap] Up & Down round born after its own betting lock gets selectionClosedAt = null and stays bettable through the result phase
- **Trigger:** The operator presses Generate on a 3-min chain at 12:02:40. generateRoundNow opens on the 12:00 bar, so the lock is 12:03:00 and close 12:04:00. Or advanceChain opens a SOL 3-min round 200 s after its boundary. openRound passes a lock that is already past. createMarket discards it and the category lead can't fit, so selectionClosedAt = null. The market then accepts bets until resolutionAt (the close) and the card shows 'open'.
- **Expected:** The engine takes the Up & Down cutoff from the ROUND: round.opensAt + durationMinutes·60 s (the advertised lock), min with the market cutoff. It never falls back to resolutionAt. At or after lock − minTimeToCutoff: planner creates nothing and a trigger → SKIPPED(CUTOFF), copy "Skipped — betting on BTC 3-min #88 ended at 12:03:00". placeHouseBet adds an H3 refusal `house_round_locked` ~~(en/sw/zh)~~ → EXPIRED(CUTOFF), wallet untouched. Players can bet in the result phase today, which is a pre-existing player-side hole: send one admin bell+email via AlertOnce `ud-born-unlocked:<roundId>` so ops sees it, and propose the platform fix to Ali separately (openRound refuses "Round would lock at 12:03 which has passed — nothing created").
- **Plan:** §4.7 Timing ('Up & Down: cutoff = selectionClosedAt'); §3 H3
- **Evidence:** C:/kipindi-main/src/lib/server/updown-service.ts:714-721 (refuses only when close ≤ now), :769 (passes selectionClosesAt), :444-446 (open walks back 1-3 min); C:/kipindi-main/src/lib/server/market-service.ts:646-654 (past cutoff discarded → categoryLead → null); C:/kipindi-main/src/lib/server/ai-poll-config.ts:165-171 (floor now+120 min never fits a round); C:/kipindi-main/src/lib/server/market-service.ts:566 (null → resolutionAt); C:/kipindi-main/src/lib/server/updown-board.ts:354-359 (stays 'open')
- **Fix:** §4.7: 'Up & Down cutoff = min(round.opensAt + D·60 s, market.selectionClosedAt ?? resolutionAt)'. Add `house_round_locked` to H3 and to FAILURE-INVENTORY. Add AlertOnce `ud-born-unlocked`. Record the pre-existing defect for a separate platform commit (openRound refusal, or createMarket keeps a past cutoff for UPDOWN).
- **Test:** test:house-bot-caps — round whose market selectionClosedAt is null and now in the result phase: planner makes 0 intents, direct placeHouseBet → house_round_locked, balance/pools unchanged. RED: remove the check → bet commits.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** every `house_*` refusal is a server-only reason with no sentence in the player dictionary (C4 ruling 148). Coverage gate: partly struck by D19.

### HB-LC-03 [partial] Engine market reader receives AI verdicts and staged outcomes on the market row; the import-graph test cannot catch a field read
- **Trigger:** An officer presses 'Re-check now' on a LIVE poll 3 h before resolution. The AI says 80% NO (not confident), so sentinelOutcome/Confidence/Evidence are stamped while the market stays LIVE. Or two-admin stage-1 stages resolvedOutcome and sets CLOSED. market-view calls getMarket and gets the whole StoredMarket.
- **Expected:** The engine only ever holds an allowlisted PublicMarketView: id, status, productLine, category, titleEn, yesPool, noPool, predictorCount, selectionClosedAt, resolutionAt, createdAt, frozen exit-window rates, isDemo, purged flag. Decisions, `decision` JSON and feed copy are byte-identical whether sentinel*, resolvedOutcome, resolutionEvidence, resolutionStage*, resolveClaimedAt, objectionsClosedAt or resolutionMode are set or null. Nothing player-visible changes.
- **Plan:** I2; §4.1 market-view.ts; test:house-bot-info-edge
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:2355-2363 (early re-check writes sentinel fields to a LIVE market); :2256-2270 (fields); :2989-3007 (stage-1 stages resolvedOutcome on CLOSED)
- **Fix:** market-view.ts exports `toPublicMarketView(m)` built by explicit pick. trigger/planner/decide/worker/fire/outcomes are typed against it and may not import StoredMarket. Add a key-allowlist assertion plus a decision-diff test to test:house-bot-info-edge.
- **Test:** test:house-bot-info-edge — the projection's keys equal the allowlist; the same market with vs without sentinelOutcome/resolvedOutcome gives an identical intent. red:house-bot-engine mutation adding sentinelOutcome to the projection fails.

### HB-LC-04 [gap] FILL/OPENER/COUNTER count player stakes that can still exit for free, handing players a free option against a house that cannot exit
- **Trigger:** Poll cutoff 18:00. Player A stakes YES 10,000 at 17:28 (free exit until 17:33). FILL (lead 30 min) fires at 17:30 → bot NO 6,500. News turns, A cashes out at 17:32 for the full 10,000, and the house is alone on NO. If the news had favoured YES, A would keep the bet. The same happens to COUNTER's cap 'bot side + stake ≤ trigger side non-house pool' when other trigger-side stakes are still sellable, and to OPENER followed by a player's exit.
- **Expected:** Every mode condition and amount cap counts only LOCKED non-house money: OPEN non-house positions whose exitWindowClosesAt ≤ now, including TOO_SHORT runway. FILL planned for 17:30 sees only sellable YES and holds dueAt to 17:33 (if ≤ deadlineAt), why "Fill held to 17:33 — the only YES money can still exit free"; otherwise SKIPPED(CONDITION_GONE). H3 recomputes inside market:<id>, so a concurrent cash-out makes the bet refuse `house_condition_gone`. No alert. Penalty box applies when the exiting account is a countered trigger (existing rule).
- **Plan:** F4 COUNTER amount cut and FILL; §3 H3 mode condition; (k) exitWindowClosesAt
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:2671-2687 (sellable = runway && within window); :2778-2785 (exit allowed until selections close); :2742 (only OPEN positions exit)
- **Fix:** Replace 'non-house pool' with 'locked non-house pool = Σ OPEN non-house stakes with exitWindowClosesAt(p, m) ≤ now' in F4 and H3. FILL dueAt = max(cutoff − lead − jitter, max exitWindowClosesAt of the counted stakes) ≤ deadlineAt, else SKIPPED(CONDITION_GONE).
- **Test:** test:house-bot-engine — FILL with only sellable YES → held, then placed after the window. test:house-bot-caps — cash-out racing the FILL inside the lock → house_condition_gone with pools and balances consistent.

### HB-LC-05 [gap] Daily loss stops count losses against the day the stake was placed, not the day it settled, so multi-day polls and rounds spanning midnight escape the stop
- **Trigger:** Monday the bot stakes NO 40,000 on a poll resolving Wednesday (capDailyLossTzs 50,000). Wednesday it settles YES (−40,000), and the bot also loses 30,000 on Wednesday rounds. A round staked 23:59:30 EAT settles 00:04.
- **Expected:** Realised loss for DAILY_LOSS_STOP and GLOBAL_LOSS_STOP = net of house positions SETTLED today (EAT day of Position.settledAt), whatever day they were placed. Wednesday realised = 70,000 ≥ 50,000 → AUTO_PAUSED(DAILY_LOSS_STOP), status write under wallet:<bot>, live intents CANCELLED, COMPLIANCE audit house_bot.auto_paused, admin bell+email "Bot A stopped: losses settled today TZS 70,000 reached its daily limit TZS 50,000", ~~holder notice~~. Start stays disabled until Thu 00:00 EAT or the cap is raised above 70,000. Projected gate = realised today + OPEN house stakes on markets whose cutoff is today + this stake if its market cuts off today. Later-day stakes are bounded by capOpenExposure. Hint copy: "Stops on losses settled today; open stakes on markets closing today count as lost until they settle".
- **Plan:** §3 Loss (book.ts, 'per EAT-day cohort of positions placed that day'); F3; F6 DAILY_LOSS_STOP
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:3052 and :3178-3182 (money moves only after the objection window); C:/kipindi-main/src/lib/server/market-config.ts:254 (window default 1 h); C:/kipindi-main/src/lib/updown-durations.ts:206 (round spans up to 72 min, can cross midnight)
- **Fix:** Rewrite the §3 Loss bullets and book.ts: realised by settledAt day; projected by market cutoff day. Update the F3 Start refusal, F6 way-out text and overview bar labels ('Settled today', 'Open stakes that can settle today').
- **Test:** test:house-bot-caps — Monday poll lost on Wednesday trips Wednesday's stop; midnight-spanning round counts on its settle day; a multi-day open stake is excluded from today's projection but still hits EXPOSURE.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice when his bot stops (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### HB-LC-06 [gap] Switching the master ON (or starting a bot) could counter days-old bets and open on stale empty markets in one burst
- **Trigger:** Master OFF for 3 days while players bet on 40 polls and many markets stay empty. Ali switches ON at 09:00, or Starts a bot that was PAUSED all week.
- **Expected:** Only activity after the ON/Start instant is in scope. COUNTER only for triggers with placedAt ≥ max(control switchedAt(ON), bot startedAt); the sweep watermark is set to that instant. OPENER only for markets with bettableFrom ≥ that instant. FILL only where cutoff − lead ≥ that instant. Old triggers produce no intent and no feed row, and 09:00 produces no burst of bets or bell alerts. Copy on the ON modal: "Bots react only to stakes placed after you switch on".
- **Plan:** §4.3 Sweep ('restarts at watermark − 60s'); F3; F9; §4.2 planner
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:2671-2673 (exit windows of old triggers long closed, so dueAt = placedAt + delay is already past → immediate fire); C:/kipindi-main/src/lib/server/market-service.ts:606-700 (markets bettable from creation, no opens-at field)
- **Fix:** Add HouseBotRuntime `scopeFrom` (global = SWITCH_ON time; `bot:<id>` = STARTED time), written in the same transaction as those events. Trigger filter, sweep watermark reset, OPENER bettableFrom and FILL lead all use max(global, bot).
- **Test:** test:house-bot-engine — seed 40 positions while OFF, switch ON → 0 intents; new trigger after ON → decided; market created before ON → no OPENER.

### HB-LC-07 [gap] Poll without a betting cutoff stays open through its real-world event; the house would stake blind in-play
- **Trigger:** A sports poll is created 90 min before its resolution time. The 60-min lead plus the 120-min floor can't fit, so selectionClosedAt = null and betting stays open until resolutionAt, during the match. A player bets YES while watching the score.
- **Expected:** Polls with selectionClosedAt null are out of scope for every mode. Trigger → SKIPPED(NO_CUTOFF), copy "Skipped — this poll takes stakes until its result, so the house stays out". Planner never plans FILL/OPENER on it. The rules tab explains polls without a cutoff are never countered. No alert.
- **Plan:** §4.7 ('Polls: cutoff = selectionClosedAt ?? resolutionAt')
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:638-654 (null when the category lead can't fit); C:/kipindi-main/src/lib/server/ai-poll-config.ts:23-24,165-171; C:/kipindi-main/src/lib/server/market-service.ts:566 (fallback to resolutionAt)
- **Fix:** §4.7: polls require a non-null selectionClosedAt. Add NO_CUTOFF to EngineCode and feed-copy. H3 refuses `house_condition_gone` if the market row has a null cutoff.
- **Test:** test:house-bot-engine — null-cutoff poll trigger → SKIPPED(NO_CUTOFF); planner 0 intents.

### HB-LC-08 [gap] Up & Down chain paused/stopped/archived or asset disabled while its round is still open: the house keeps adding money to a game ops just switched off
- **Trigger:** At 12:02 the operator STOPs BTC 5-min because the feed misbehaves; round #412 is open, a COUNTER is due 12:02:20 and a FILL is planned. Later the asset is disabled and the chain archived. deleteChain is refused because the chain has rounds.
- **Expected:** Decide and fire require chain.state === RUNNING and asset.enabled; else SKIPPED(CHAIN_NOT_RUNNING), copy "Skipped — BTC 5-min is paused or stopped; the house adds no stakes to it". The planner turns PENDING intents on that chain's rounds to SKIPPED within 15 s. Positions already placed ride and settle through the normal path (healer is independent of chain state). Deleting a chain is only possible with zero rounds, so no intent can reference a deleted chain.
- **Plan:** F5 step 6; §4.1 market-view; §5 Scope 'UD chains'
- **Evidence:** C:/kipindi-main/src/lib/server/updown-config.ts:1180-1185 (stop clears only nextBoundaryAt; in-flight rounds untouched); C:/kipindi-main/src/lib/server/updown-board.ts:754-756 (a stopped chain's rounds are still playable); C:/kipindi-main/src/lib/server/market-service.ts:1088-1092 (bet path checks market status only); C:/kipindi-main/src/lib/server/updown-config.ts:946-951,1223-1225,1254-1270
- **Fix:** Add CHAIN_NOT_RUNNING (covers asset disabled) to EngineCode and feed copy. market-view reads chain.state and asset.enabled (public via getBoard.chainPaused and the enabled-asset list). The planner tick sweeps these intents.
- **Test:** test:house-bot-engine — stop chain mid-delay → SKIPPED(CHAIN_NOT_RUNNING) within one planner tick; existing house position still settles.

### HB-LC-09 [gap] Demo markets are hidden from players but reachable by id, and never auto-resolve in production
- **Trigger:** A 'Demo · ' market reached by URL gets a real player bet, or has empty pools inside an OPENER window.
- **Expected:** Demo markets (title prefix 'Demo · ') are excluded from the trigger filter, planner and H3 (`house_condition_gone`). No intent row, no feed row, no house position, so no house money is stranded on a market that never resolves in production.
- **Plan:** §4.3 trigger filter; F4 OPENER/FILL planning
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:348-350 (isDemoMarket), :384 (hidden from lists only), :1682 and :1704 (auto-resolve is a no-op in production)
- **Fix:** Add `isDemo` to PublicMarketView; the trigger filter and planner skip it; H3 re-checks.
- **Test:** test:house-bot-engine — demo trigger → 0 intents; test:house-bot-caps — placeHouseBet on demo → refused, money untouched.

### HB-LC-10 [gap] Holder's wallet row missing while house positions are OPEN blocks settlement (and emergency void) of those markets for every player
- **Trigger:** The holder's wallet row disappears (ops script or erasure) while house positions are OPEN on 6 markets. settleMarket throws on the first house position and rolls back the whole settlement; emergencyVoidMarket refuses the same way.
- **Expected:** The next planner tick detects OPEN house positions whose holder has no wallet → AUTO_PAUSED(WALLET_MISSING) plus a danger admin bell+email via AlertOnce `settle-blocked:<botId>:<day>`: "Settlement is blocked on 6 markets for every player: Bot A's wallet is missing. Restore the wallet, then settlement resumes". The alert lists the market links and /admin/settlement. ops:house-bots-status reports it. Remove does not bypass it. The HOUSE-BOTS.md runbook has a restore procedure. Players keep seeing 'awaiting settlement' until fixed.
- **Plan:** F6 WALLET_MISSING; F8 Remove; §7 notifyAdminsHouseBotAlert; ops:house-bots-status
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:3292 (one-sided branch throws on a missing wallet), :3415-3420 (VOID branch same), :4120 (emergency void refuses)
- **Fix:** Add a 'settlement blocked' check to the planner and ops status, the alert copy to §7 and the runbook to HOUSE-BOTS.md. Removal keeps positions, so the alert must persist until OPEN house positions settle.
- **Test:** test:house-bot-money — delete the holder wallet with an OPEN house position → settle refuses, alert once, restore wallet → settles, markers intact.

### HB-LC-11 [gap] Lifecycle notices that are not outcomes reach the holder for house positions with no liquidity label, and mix house payouts into his personal figures
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** no notice to the holder carries a liquidity label or a separate house line: a notice about a house-marked position is built by the same call with the same arguments as any player's, and selection closed is one notice per player summing every open position he holds, as on `origin/main`; only F6's email rule stands (D19c; C4 rulings 143–144). Coverage gate: counts in its regression form — byte-identical notices with no label (C5-SPEC ruling 250).
- **Trigger:** Poll cutoff passes on a market where the holder has a house NO 8,000 and a personal YES 2,000. Then verdict recorded, reversed, cancelled, one-sided refund and orphan refund each fire.
- **Expected:** ~~Every per-bettor emitter labels house positions for the holder only: selection-closed bell+email, verdict recorded (and reversed), market cancelled bell+email, one-sided refund bell+email, orphan refund, Up & Down refund/win/loss/one-sided rows and the Up & Down digest. The selection-closed email states his personal figure ("if YES you receive TZS X") computed from non-house positions only, plus a separate line "50pick liquidity stake on this market: NO TZS 8,000 — placed with your permission, settles to your wallet" (en/sw/zh). A holder with only house positions gets one labelled notice. Non-holders see no change. These notices are not capped by holderNoticesPerHour.~~
- **Plan:** (h) liquidity label on outcome notices; F10 Notices; §7
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:1816-1834 (selection-closed bell+email to every OPEN bettor, payouts summed per side), :1976-1988 (verdict notice), :4170-4176 (cancel notice+email), :3338-3344 (one-sided email), :2588 (orphan refund)
- **Fix:** ~~Amend (h) to enumerate these emitters. Selection-closed payout sums exclude marked positions, with the labelled house line added. Register the new copy in comms-registry and email templates.~~
- **Test:** ~~test:house-bot-comms — drive each emitter with a mixed holder: label present in 3 locales, personal payout excludes house, non-holder output byte-identical.~~
- ✅ **THE REMAINING EMITTERS ARE TESTED 2026-09-20 — `test:house-bot-money` §8 (`8.14`–`8.20`), BOTH STORES.** Already asserted before this: WIN `8.1`–`8.3` (body byte for byte AND the link), LOSS `8.4`, SELECTION_CLOSED `8.5`–`8.8` (ONE notice summing both figures, with a non-holder control), VERDICT `8.9`–`8.13`. What nothing asserted: **market cancelled** (`8.14`–`8.16`) and the **one-sided refund** notice (`8.17`–`8.19`). `5.6` and `10.1` pin the house MARKER on the refund TRANSACTION — a different claim from the notice TEXT, and a mutation that labelled the copy leaves both of them green. Each emitter asserts the rows EXIST first, then that the holder's notice carries no house word in any of the three languages, then the POSITIVE CONTROL: it is the NON-HOLDER's notice on the SAME market field for field — three titles, three bodies and the href — once each row's own position reference is taken out; `8.20` proves that comparator reports a planted label AND a planted href. Seen red 2026-09-20 four ways: a liquidity word in the cancelled reason, the cancelled notice skipped for a marked position, a house-flavoured one-sided href, and the one-sided notice skipped — each reddening only these assertions.
- ✅ **THE UP & DOWN HALF IS ALREADY PROVED AND IS NAMED RATHER THAN DUPLICATED:** `test:house-bot-reports` `9.235.2` — the holder's ROUND_RESULT digest bell is FIELD FOR FIELD the player's (same kind, same link, three titles, three bodies, no label, no house word), with `9.235.0` proving the two accounts really differ in the house dimension and `9.235.5` covering the letter. ⚠️ `test:updown-digest` was read first and names house bots nowhere (0 hits), so the pin is 9.235's.
- ⚠️ **STILL NOT ASSERTED, and named rather than implied:** the per-ROUND Up & Down notices (`notifyUpDownWin` / `notifyUpDownLoss` / `notifyUpDownRefund` / `notifyUpDownOneSidedRefund`). §9.235 pins the DIGEST, which is the only Up & Down message a player receives about settled rounds, and the per-round emitters are suppressed for Up & Down markets by `perEventNotificationsSuppressed` — but no assertion says so for a holder.

### HB-LC-12 [gap] A chain added later enters 'all chains' scope unreviewed, and timing bounds validated against yesterday's shortest chain don't fit it
- **Trigger:** Bot A was saved when the shortest chain was 5-min (OPENER delay 90 s ≤ 5·20 s). Ops later creates and starts BTC 3-min, where ~88 s of betting remains after the ~92 s late open.
- **Expected:** Scope is explicit in the UI: 'All chains, including chains added later' vs a fixed list. At decision the planner fits rules per chain: if bettableFrom + delay > deadlineAt, or the FILL lead doesn't fit that chain, → no intent and a rules-tab warning row "OPENER delay 90 s doesn't fit BTC 3-min — those rounds are skipped". When a RUNNING chain enters an ACTIVE bot's scope, the admin gets one bell via AlertOnce `chain-in-scope:<botId>:<chainId>`: "Bot A now covers BTC 3-min" linking to ?tab=rules.
- **Plan:** §5 Scope 'UD chains all', FILL lead bound, OPENER delay bound; F2 effective timing preview
- **Evidence:** C:/kipindi-main/src/lib/server/updown-config.ts:1000-1085 (chains created at any time, start STOPPED), :1135-1179 (started later); C:/kipindi-main/src/lib/updown-durations.ts:206 (spans differ per duration)
- **Fix:** Rules JSON: `chains: 'ALL' | chainId[]`. Validation of timing bounds moves to per-chain fit at decide time (keep save-time warnings). Add AlertOnce chain-in-scope and a warning list on the rules tab.
- **Test:** test:house-bot-rules — rule valid for 5-min flagged misfit for 3-min. test:house-bot-engine — 3-min rounds get no OPENER; alert once.

### HB-LC-13 [gap] Chain purge tombstones markets and deletes the rounds that house intents and feed rows refer to
- **Trigger:** BTC 5-min is archived and purged a month later. Its rounds carried COUNTER/FILL intents and house positions (all settled).
- **Expected:** Purge completes unchanged: its preconditions already demand ARCHIVED, all rounds settled and no open objections. HouseBotIntent has no foreign key to UpDownRound (only marketId, and markets are never deleted). The feed renders these rows with market title "[purged market]" and no round number; the money columns still come from Position and Transaction; houseBotBook totals are unchanged. Purge cost 'distinct players' may include holder accounts (the cost panel is admin-only).
- **Plan:** §2 HouseBotIntent (identity columns); §8 Activity feed copy
- **Evidence:** C:/kipindi-main/src/lib/server/chain-purge.ts:120-156 (preconditions), :410-429 (UpDownRound deleteMany, market titles set to PURGED_TITLE), :13 (Position/Transaction never deleted), :78 (PURGED_TITLE)
- **Fix:** §2: state 'no FK from HouseBotIntent to UpDownRound; marketId FK RESTRICT or soft'. feed-copy.ts: a fallback when round is null or titleEn === PURGED_TITLE.
- **Test:** test:house-bot-console — feed fixture with a purged market and null round renders without crash at 360/1280. test:house-bot-money — purge (memory store) with house positions leaves book totals unchanged.

### HB-LC-14 [gap] Settlement correction after payout does not exist today; a future correction writer would silently drop the house marker from P&L and loss stops
- **Trigger:** An officer wants to reverse a settled poll the house lost. Today upholdObjection and the officer hold refuse once settledAt is set, although the hold's refusal message points to a 'reversal path' that does not exist. A future release adds a correction path writing ADJUSTMENT or BET_REFUND rows.
- **Expected:** Today: house P&L is final at settlement, and the objection page shows 'Market already settled — cannot remedy'. Future: every Transaction written with a positionId copies that Position's houseBotId, and book.ts reads marker-bearing Transaction rows (not Position.finalPayout alone), so any correction moves house P&L, today's realised loss and reports automatically.
- **Plan:** I8; §3 Propagation; §9 Reporting
- **Evidence:** C:/kipindi-main/src/lib/server/objections-service.ts:499-511 (uphold refuses after settledAt), :321-323 (hold refuses, cites a non-existent 'reversal path'); C:/kipindi-main/src/lib/server/affiliate-service.ts:1406 ('nothing un-settles a market')
- **Fix:** Add a source-scan guard to test:house-bot-money: every `db.txn.create` with `positionId` in src/lib/server must set `houseBotId` from the position (allowlist-free). book.ts derives returned money from Transaction rows filtered by marker.
- **Test:** test:house-bot-money — source pin fails when a new txn.create with positionId omits houseBotId; RED control adds one without it.

### HB-LC-15 [partial] Market closed early (Sentinel/human) then reopened by adminReopenMarket: what happens to skipped intents and new triggers
- **Trigger:** A poll is CLOSED at 14:00 by the resolve trigger while a COUNTER holds to 14:03 and a FILL is planned for 15:30. At 14:20 an admin reopens it (CLOSED→LIVE, sentinel fields and one-shot stamps cleared). Players bet again at 14:25.
- **Expected:** Pre-close intents that met a closed market become SKIPPED(MARKET_NOT_LIVE) and stay terminal (never re-decided). Because a market that was once judged decidable is a risk the engine can't see into (I2), any market with a MARKET_NOT_LIVE intent is out of scope for the rest of its life. New triggers → SKIPPED(MARKET_REOPENED), copy "Skipped — this market was closed early and reopened; the house stays out". FILL/OPENER are not re-planned. No alert. The house positions already placed ride normally.
- **Plan:** F5 step 6; §4.3 negative decisions; §2 uniqueness (cancelled FILL re-plannable, skipped not)
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:4004-4024 (reopen clears sentinel fields and stamps, leaves no reopen marker), :2380-2386 (human-fallback close), :2322-2340 (auto seal)
- **Fix:** Add MARKET_REOPENED to EngineCode. The trigger filter and planner check 'exists intent(marketId, reasonCode=MARKET_NOT_LIVE)', which is the engine's own data, so it stays inside I2. Document in HOUSE-BOTS.md.
- **Test:** test:house-bot-engine — close mid-hold → SKIPPED(MARKET_NOT_LIVE); reopen; new trigger → SKIPPED(MARKET_REOPENED); FILL not re-planned.

### HB-LC-16 [partial] Intents stay PENDING on a market that left LIVE, and the same situation gets two different reason labels
- **Trigger:** A poll is emergency-voided (or resolved by a single admin, Sentinel auto-sealed, objection-VOIDed, or an Up & Down round operator-voided) while a COUNTER is PENDING (held 5 min) and a FILL is PENDING hours out. Separately, a claimed bet races the close.
- **Expected:** Within one planner tick (15 s) PENDING intents whose market status ≠ LIVE become SKIPPED(MARKET_NOT_LIVE) via a conditional update on status='PENDING'. 'Next due intent' on the bot overview never shows a dead market. A claimed bet refused pre-lock (INVALID) or in-lock (selection_closed) is mapped by re-reading market status: status ≠ LIVE → SKIPPED(MARKET_NOT_LIVE) "Skipped — the market closed early"; genuine cutoff → EXPIRED(CUTOFF). Nothing is debited either way.
- **Plan:** §4.2 Planner duties; §4.6 mapper rows INVALID and SELECTION_CLOSED; F5 step 6
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:1090 (pre-lock not LIVE → INVALID, no reason), :1282-1286 and :1413 (in-lock CLOSED → SELECTION_CLOSED/selection_closed), :4061-4104 (void works on LIVE), :2985 (resolve with no LIVE check)
- **Fix:** §4.2: add a planner sweep of PENDING intents on non-LIVE markets. §4.6: the selection_closed row re-reads status before choosing EXPIRED(CUTOFF) or SKIPPED(MARKET_NOT_LIVE).
- **Test:** test:house-bot-engine — each of the 5 transitions mid-delay → SKIPPED(MARKET_NOT_LIVE) ≤ 1 tick; in-lock race labelled by status; trial balance unchanged.

### HB-LC-17 [partial] Ruling and void surfaces show house money as 'crowd' and 'player money', and several are missing from F11
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** struck whole — no ruling, void or resolver surface gains a house stake or "Players:" line, a "House bot · Bot A" row tag, a house held-chip tooltip, a bulk-bar house count, or a house share in the emergency-void admin bell and email (C5-SPEC rulings 192–196 and 198); a house account's money on those surfaces counts as a player's, as on `main`. Whether the reader behind the display stays is decided member by member in C5-5b. Coverage gate: struck by D20.
- **Trigger:** An officer rules an objection (REVERSE/VOID), voids an Up & Down round, emergency-voids a poll, bulk-resolves, or reads the resolver queue, on markets where the house holds YES 8,000 of a 20,000 pool.
- **Expected:** Every place a money decision is made shows "House stake: YES 8,000 · NO 0 (open)" and "Players: YES 2,000 · NO 10,000": resolver queue card, ceremony, objections ruling panel, Up & Down rounds void lever, emergency-void confirm, bulk-resolve summary ("3 of these markets carry house stakes"), admin market page. The admin market page tags each marked position row "House bot · Bot A". The resolver 'held' chip tooltip reads "Money held, including house TZS 8,000". The emergency-void admin bell/email body adds "of which house TZS 8,000 on 1 position". After settlement or void the line reads "House stake settled: …" (no open amount, since the house can't cash out). Display only (I10). Never shown to players.
- **Plan:** F11; I10; §9 reporting
- **Evidence:** C:/kipindi-main/src/app/admin/resolver-queue/page.tsx:449 ('Crowd: x% YES'), :463-470 ('Player money held'); C:/kipindi-main/src/app/admin/objections/page.tsx:51; C:/kipindi-main/src/app/admin/updown/rounds/page.tsx:115,351; C:/kipindi-main/src/lib/server/market-service.ts:4231-4240 (admin cancel notice totals); C:/kipindi-main/src/app/admin/markets/[id]/page.tsx:87-95,396
- **Fix:** Extend F11 to the objections page, Up & Down rounds page, emergency-void confirm and admin notice, and the bulk bar. One server helper `houseExposureForMarkets(ids)` (OPEN vs settled). Fix the resolver tooltip copy.
- **Test:** test:house-bot-reports — helper returns open vs settled split after settle/void. qa:house-bots-visual — resolver card, objection panel, rounds row at 360/1280 with and without house stake.

### HB-LC-18 [partial] Stake bounds change after the decision (Up & Down chain min/max, or a poll's per-market override), turning an intent into a spurious FAILED alert
- **Trigger:** The bot decides DOWN 1,500 at 12:01. At 12:01:10 ops raises the BTC 5-min chain min to 2,000, or sets a poll override maxStake 5,000 below a 10,000 FILL.
- **Expected:** F5 step 9 clamps against the bounds read fresh through the same resolver buyPosition uses: chain bounds for Up & Down, getEffectiveConfig(marketId) for polls, intersected with bot caps, then rounded. If the clamped stake < max(bounds.min, stakeMinTzs) → SKIPPED(STAKE_BELOW_MIN), copy "Skipped — BTC 5-min minimum is now TZS 2,000". A residual stake_below_min/above_max from a race → SKIPPED(STAKE_BOUNDS_CHANGED), no alert. FAILED + AlertOnce stays only for stake_not_whole (a code fault).
- **Plan:** F5 step 9 'Stake clamp'; §4.6 stake_* row
- **Evidence:** C:/kipindi-main/src/lib/server/updown-config.ts:1087-1115 (chain bounds editable), :1345-1351 (read live at bet time); C:/kipindi-main/src/lib/server/market-config.ts:830-848 (per-market override), :548-555; C:/kipindi-main/src/lib/server/market-service.ts:1099-1120
- **Fix:** Specify the step-9 clamp source. Split the §4.6 row: below_min/above_max → SKIPPED(STAKE_BOUNDS_CHANGED); not_whole → FAILED + alert.
- **Test:** test:house-bot-engine — raise chain min after decide → SKIPPED; test:house-bot-seam — the clamp uses the same resolver (stakeBoundsForUpDownMarket).

### HB-LC-19 [partial] Extracted exit-window helper diverges from cashOutValue when the free grace is 0, changing player-path output or holding counters wrongly
- **Trigger:** A market is frozen with freeExitGraceMinutes 0 and paidExitWindowMinutes 2, or ops enables a paid window later so only new markets carry it.
- **Expected:** exitWindowClosesAt(p, m) returns placedAt whenever grace ≤ 0 (cashOutValue treats such positions as never sellable) or the runway is < grace; otherwise placedAt + (grace + paid)·60 s. Both read the market's FROZEN snapshot. cashOutValue output is byte-identical before and after the extraction. COUNTER holds use the per-market frozen value, so markets created before a paid window was enabled keep the 5:00 hold and new ones get 7:00; the timing preview says "for markets created from now".
- **Plan:** (k) exitWindowClosesAt; F2 effective timing preview; test:house-bot-seam
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:2657-2671 (`hadRunway = graceMs > 0 && closesAt − placedAt ≥ graceMs`), :2687; C:/kipindi-main/src/lib/server/market-config.ts:287-288 (both windows frozen in the snapshot)
- **Fix:** (k): add the 'grace > 0' condition and 'read from ratesFor(market)'. The preview labels live config versus frozen snapshots.
- **Test:** test:house-bot-seam — table grace∈{0,5} × paid∈{0,2} × runway short/long: helper boundary equals cashOutValue.sellable flip.

### HB-LC-20 [partial] Poll settlement frozen by an open objection or officer hold keeps house exposure tied up for days
- **Trigger:** A poll with house NO 20,000 is resolved and a player objects. Settlement retries every 5 min for 3 days; the bot hits capOpenExposure and every new decision skips CAP_EXPOSURE.
- **Expected:** ~~Exposure bars split "Open on live markets", "Awaiting settlement" and "Frozen by objection" (derived from status and settledAt, never from objection data inside the engine).~~ CAP_EXPOSURE skips show why: "Skipped — TZS 20,000 is held on markets awaiting settlement". No auto-pause, no extra alert. ~~The console reads objection counts for display only;~~ the engine never does (I2).
- **Plan:** §8 overview cap bars; §4.4 CAP_<code> copy; I2
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:3178-3191 (TOO_EARLY / OBJECTION_OPEN refusals); C:/kipindi-main/src/lib/server/market-scheduler.ts:56,266-270 (5-min back-off); C:/kipindi-main/src/lib/server/objections-service.ts:298-379 (officer hold, no window limit)
- **Fix:** ~~§8: exposure breakdown on the overview and limits tab (console-side query, not engine).~~ feed-copy for CAP_EXPOSURE includes the held amount.
- **Test:** ~~test:house-bot-console — fixture with RESOLVED unsettled market shows the split; qa:house-bots-visual bars at 360.~~
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the three-bucket exposure split on the overview and limits tab (R2's overview split, C5-SPEC ruling 254, PROGRESS L39) is struck; the CAP_EXPOSURE held amount is re-decided in Commit 7's rulings, and the engine still never reads objection state (I2). Coverage gate: partly struck by D20.
- ⛔ **RECONCILED 2026-09-20 — "waits on Commit 7's ruling" WAS STALE; the ruling has landed and it refuses the thing this row asks for.** **RULING: C7-SPEC 370** (`C7-SPEC.md:787`, *"The kill switch shows no held amount — ruling 254's CAP_EXPOSURE figure is decided NOT KEPT"*): 254 proposed putting the amount still at risk into `CAP_EXPOSURE`'s sentence, and 370 decides it NOT KEPT, with the cost recorded — a figure behind a refusal must be STORED on the intent or its audit (the per-decision money record D20 struck) or re-derived at render time, which the display-only law forbids. Shipped: `feed-copy.ts:61` carries no amount. ✅ **NAMED: `test:house-bot-console` `1.370`** — not one `EngineCode` sentence and not one switch-off sentence carries a formatted amount or an amount placeholder, with the capture proved complete against the block's own key count and a CONTROL that a TEMPLATE-form amount IS reported.
- The other three halves are withdrawn outright: the three-bucket exposure split (D20, C5-SPEC ruling 254; `04-amendments.md:69` goes further — *"R2 is struck, so no amendment covers these ids"*), the console reading objection counts, and the label half. ⛔ **Writing the held-amount test would assert a requirement TWO rulings have refused.** The surviving I2 half is a statement about code the engine does not contain: `grep 'objection' src/lib/server/house-bot/*.ts` finds only audit ACTION NAMES in `decision-audits.ts` and `oversight.ts`, both classified audit readers and neither on the decision path (nearest live pin `test:house-bot-info-edge` `3.2`).

### HB-LC-21 [partial] Up & Down round without targets (no open price) or voided by source failure, no-move or operator
- **Trigger:** A round has openPrice null (targets null) until the healer backfills; or the close reading fails past the abandon deadline → VOID source-failed; or the close stays inside the band → no-move; or an operator voids.
- **Expected:** While upTarget/downTarget is null → SKIPPED(UD_NO_PRICE), copy "Skipped — this round has no opening price yet". After a backfill, later triggers are decidable normally. Voids refund every stake through the settle VOID branch; BET_REFUND rows carry houseBotId with the real reason text; the feed outcome reads "Round void (no price) — refunded"; realised 0; ~~the holder's Up & Down refund row carries the label (see HB-LC-11)~~. The healer runs regardless of chain state or the master switch.
- **Plan:** F4 closeness ('missing price → UD_NO_PRICE'); §3 Propagation (VOID refunds)
- **Evidence:** C:/kipindi-main/src/lib/server/updown-service.ts:736 (targets null without openPrice), :1250-1288 (healer backfill), :898-902 (void reasons), :1105-1113 (healer independent of chain state); C:/kipindi-main/src/lib/server/market-service.ts:3407-3410 (void refund description by reason)
- **Fix:** F4: state 'targets null → UD_NO_PRICE'. feed-copy outcome strings per voidReason.
- **Test:** test:house-bot-engine — null-target round → UD_NO_PRICE, then backfilled → decided. test:house-bot-money — source-failed void refund carries the marker.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder's refund row carries no label and is byte-identical to any player's (D19c; C4 ruling 143). Coverage gate: partly struck by D19.

### HB-LC-22 [partial] Round opens very late or is generated with an open 1-3 min in the past, leaving less than the configured delay
- **Trigger:** A 3-min round opens 150 s after its boundary with 30 s of betting left; OPENER delay is 20-90 s and minTimeToCutoff 20 s.
- **Expected:** bettableFrom = max(round.opensAt, market.createdAt). If bettableFrom + minimum delay > deadlineAt, the planner inserts no OPENER/FILL row (or a SKIPPED(CUTOFF) row where a COUNTER trigger is in scope), copy "Skipped — BTC 3-min #90 opened with 0:30 left". A drawn dueAt past deadlineAt is never PENDING, so the claim query never touches it.
- **Plan:** §4.7 bettableFrom; F4 'Decidable only if … dueAt ≤ deadlineAt' (stated for COUNTER only)
- **Evidence:** C:/kipindi-main/src/lib/server/updown-service.ts:1658-1674 (opens retried up to the 390 s abandon deadline), :444-446 (manual open walks back 1-3 min); C:/kipindi-main/src/lib/server/market-service.ts:697 (createdAt = actual open)
- **Fix:** F4: apply 'dueAt ≤ deadlineAt' to OPENER and FILL planning too.
- **Test:** test:house-bot-engine — late-open round → no OPENER row; COUNTER → SKIPPED(CUTOFF).

### HB-LC-23 [partial] Category scope when categories are added or renamed, or a market carries a category outside the canonical list
- **Trigger:** A new category ships in code, or a stored rules JSON lists a value later removed. Up & Down rounds store the asset's category via an unchecked cast, and the lead-time table knows 'infrastructure', which the canonical list does not.
- **Expected:** Rules store `categories: 'ALL' | string[]`. Loading tolerates unknown values: they are dropped and the bot page shows "Rules mention a category that no longer exists — review and save"; no engine crash, no silent all-skip. An unknown market category is treated as 'other' for scope. Up & Down rounds are scoped by productLine and chain, never by category. A new category is included only under 'ALL'.
- **Plan:** §5 Scope 'poll categories … valid set'; validateHouseBotRules
- **Evidence:** C:/kipindi-main/src/lib/markets/categories.ts:24-31 (closed list); C:/kipindi-main/src/lib/server/ai-poll-config.ts:30 ('infrastructure' outside the list); C:/kipindi-main/src/lib/server/updown-service.ts:745 (asset.category cast `as never`)
- **Fix:** rules.ts: tolerant parse with a `stale` flag; scope matching normalises unknown values to 'other'; product scope by productLine.
- **Test:** test:house-bot-rules — legacy JSON with an unknown category loads, flagged; engine keeps deciding.

### HB-LC-24 [partial] Fee model or rate profile changes after decisions: timing preview and book must follow frozen snapshots
- **Trigger:** Ops edits a chain rateProfile, or the global exit/fee config, while open markets keep their old snapshots (some Up & Down rows may still be on capped-commission).
- **Expected:** No effect on existing intents or positions: settlement, cash-out windows and COUNTER holds use each market's feeSnapshot. The rules-tab timing preview uses live config, labelled "for markets created from now". When live config differs from snapshots in play, it adds "Markets already open keep their own exit window (5:00)". houseBotBook fee withheld comes from actual settlement rows, not recomputed rates.
- **Plan:** F2 effective timing preview; §8 overview 'fee withheld'
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:656-666 (rates frozen at creation), :2657 (cash-out reads the snapshot); C:/kipindi-main/src/lib/server/market-config.ts:282-299; C:/kipindi-main/src/lib/server/updown-config.ts:1119-1121 (chain edit affects future rounds only)
- **Fix:** F2: state the preview source and the snapshot note. book.ts: fee from Transaction and HOUSE_FEE rows.
- **Test:** test:house-bot-rules — preview with changed live config shows the note. test:house-bot-money — capped-commission round fee in book equals ledger.
- ⛔ **Superseded in place (C5-SPEC ruling 183, §1 S26):** there is no HOUSE_FEE row and the payout writes `fee: 0`, so the book fee is recomputed from each market's FROZEN snapshot (never live rates, which is this row's concern) and cross-checked against the settlement's `SETTLEMENT_COMMISSION` ledger lines per marked WIN position. The capped-commission Up & Down round case lives in `test:house-bot-reports` §2 (Postgres cross-check), next to what it tests; `test:house-bot-money` §7 carries only the `feeInputs` EXPLAIN.

### HB-LC-25 [partial] Cutoff or resolution time moved after an intent was written (no production path today; a future edit feature would invalidate stored deadlineAt)
- **Trigger:** Today only createMarket writes these times, category lead changes affect only new markets, and the dev fast-forward route is 404 in production. A future 'edit market times' action ships.
- **Expected:** Today the stored deadlineAt stays valid, and F5 step 6 re-reads the cutoff anyway. Future: fire recomputes deadline = min(stored deadlineAt, fresh cutoff − minTimeToCutoff) and skips CUTOFF if passed. A moved-later cutoff never extends a stored deadline or re-plans. Any new writer of selectionClosedAt/resolutionAt fails a source pin until it cancels live intents for that market.
- **Plan:** F5 step 6; §4.5 claim SQL uses stored deadlineAt
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:683-684 (only writer); C:/kipindi-main/src/app/api/dev-test/fast-forward-market/route.ts:18-20,28 (dev-only writer); C:/kipindi-main/src/lib/server/ai-poll-config.ts:130-136 (lead config affects only new computations)
- **Fix:** F5 step 6: recompute from the fresh cutoff. Add a source-scan pin 'writers of selectionClosedAt/resolutionAt in src/lib/server|src/app (excluding api/dev-test) = createMarket only' to test:house-bot-engine.
- **Test:** test:house-bot-engine — cutoff moved earlier in store → EXPIRED(CUTOFF) at fire; source pin with a RED control.

### HB-LC-26 [partial] Emergency void (including deleting a published AI poll) of a LIVE market holding house positions
- **Trigger:** ADMIN/COMPLIANCE voids a live poll with reason "Source withdrawn", or a published AI poll is deleted (which calls emergencyVoidMarket), while the house holds YES 8,000 and a COUNTER is PENDING.
- **Expected:** All OPEN positions are refunded atomically. The house BET_REFUND row carries houseBotId (written at create). Pools zeroed, status VOIDED, settledAt stamped, COMPLIANCE audit market.emergency_void (payload unchanged). Holder gets notifyMarketCancelled bell and email with the reason ~~and the liquidity label line~~. ~~The admin notice shows the house share (HB-LC-17).~~ The PENDING intent → SKIPPED(MARKET_NOT_LIVE) within one tick (HB-LC-16). Book realised 0 and exposure freed. No agent-commission accrual existed, so clawback finds none for house rows.
- **Plan:** §3 Propagation 'emergency void'; (h)
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:4102-4104 (only settled markets refused), :4141-4176 (refund, notice and email per position), :4197 (settledAt); C:/kipindi-main/src/app/admin/ai-polls/actions.ts:356,395
- **Fix:** ~~(h) names notifyMarketCancelled and the cancel email explicitly;~~ the propagation test drives the AI-poll delete path too.
- **Test:** test:house-bot-money — void a market with house and player positions: markers on refunds, trial balance ties, ~~holder notice labelled,~~ intent skipped.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the emergency-void admin bell and email carry no house share (C5-SPEC ruling 195). Coverage gate: partly struck by D20.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder's cancel notice carries no liquidity label and is built exactly like any player's; F6's email rule for a house-marked position is untouched (D19c; C4 ruling 143). Coverage gate: partly struck by D19.

### HB-LC-27 [partial] Objection upheld with REVERSE before settlement on a market where the house was winning
- **Trigger:** Poll resolved YES (house YES 10,000). A player objects and a second officer upholds REVERSE: outcome flips to NO and a fresh objection window opens.
- **Expected:** House positions stay OPEN; projected loss already counts them as lost; realised is recorded only when the new window settles. Bettors, including the holder, get the 'verdict reversed' notice, ~~and the holder's copy carries the label (HB-LC-11)~~. ~~The ruling officer sees house exposure on the objections panel (HB-LC-17).~~ The house has no objection standing of its own (f). COMPLIANCE audit objection.upheld is unchanged.
- **Plan:** (f) objection standing; F11; (h)
- **Evidence:** C:/kipindi-main/src/lib/server/objections-service.ts:525-531 (REVERSE flips outcome and re-opens the window), :482-492 (filer cannot rule); C:/kipindi-main/src/lib/server/market-service.ts:1937-1940 (reversed notice option)
- **Fix:** Covered once HB-LC-11 and HB-LC-17 land; add a REVERSE case to the money test.
- **Test:** test:house-bot-money — REVERSE then settle: house LOSS booked on the settle day, book and trial balance tie; comms shows the reversed notice ~~with label~~.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the objections panel shows no house exposure (C5-SPEC rulings 192–194). Coverage gate: partly struck by D20.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder's reversed notice is byte-identical to any player's, with no label (D19c; C4 ruling 143). Coverage gate: partly struck by D19.

### HB-LC-28 [partial] Holder bets personally on a market after his bot has staked there, gaining objection standing and holding both sides
- **Trigger:** Bot A holds house NO 8,000. The holder (allowed to use the account, D3) later stakes YES 2,000 personally, then objects after the resolution.
- **Expected:** H2 still refuses further house bets on that market (OWNER_POSITION). The trigger filter never counters the holder. The personal bet raises AlertOnce `holder-conflict:<botId>:<marketId>`, admin bell: "Bot A's holder staked YES 2,000 personally on a market where his bot holds NO 8,000" linking to the admin market page. His objection is allowed (he holds a non-house position), ~~but the objections panel shows "Filed by the holder of house bot A (house NO 8,000 on this market)"~~. ~~Personal notices exclude house figures.~~
- **Plan:** §3 H2 OWNER_POSITION; (f); F7; §4.3 trigger filter
- **Evidence:** C:/kipindi-main/src/lib/server/objections-service.ts:108 (standing = any position by user); C:/kipindi-main/src/lib/server/market-service.ts:883 (holder bets through the normal path)
- **Fix:** Post-commit hook (a) also emits holder-conflict AlertOnce when a live bot's holder places a non-house bet on a market with house positions. ~~The objections page adds the filer label (console-side read).~~
- **Test:** test:house-bot-engine — holder personal bet after house bet → one alert, no counter. ~~test:house-bot-console — objection panel label.~~
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the objections panel names no house bot and shows no house stake beside a filer (D20 strikes the house lines on the objections page, C5-SPEC rulings 192–194); the holder-conflict admin alert is untouched by D20. Coverage gate: partly struck by D20.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** no notice to the holder separates house figures: selection closed sums every open position he holds, as on `origin/main` (D19c; C4 ruling 144); the admin holder-conflict alert and his objection standing are unchanged. Coverage gate: partly struck by D19.

### HB-LC-29 [gap] A leftover Up & Down market row with no round (round insert failed after createMarket) is bettable with global bounds and no price context
- **Trigger:** Two replicas fire the same chain boundary. createMarket succeeds but roundStore.create throws on the unique round number, leaving a LIVE UPDOWN market with no round row.
- **Expected:** The engine treats any UPDOWN market without a round as out of scope: trigger → SKIPPED(UD_NO_ROUND), copy "Skipped — this Up & Down market has no round record". Planner never plans; H3 refuses. One admin AlertOnce `ud-orphan-market:<marketId>` because players can bet into it at global bounds.
- **Plan:** §4.1 market-view (getRoundDetail); F5 step 6
- **Evidence:** C:/kipindi-main/src/lib/server/updown-service.ts:741-773 then :800 (market row created before the round row); C:/kipindi-main/src/lib/server/updown-config.ts:1345-1350 (null without a round); C:/kipindi-main/src/lib/server/market-service.ts:1102-1105 (falls back to global bounds)
- **Fix:** Add UD_NO_ROUND to EngineCode; market-view returns null for a round-less UPDOWN market; add the alert.
- **Test:** test:house-bot-engine — UPDOWN market without a round → SKIPPED(UD_NO_ROUND), alert once.

### HB-LC-30 [partial] Market hard-deleted, orphan positions refunded outside a transaction
- **Trigger:** seedDemoMarkets deletes a 'politics' market holding a house position; on boot repairOrphanedPositions refunds it with no transaction, no ledger group and an empty marketId in the notice.
- **Expected:** The orphan BET_REFUND txn copies the position's houseBotId. ~~The holder refund notice carries the label.~~ Intents on the market → SKIPPED(MARKET_GONE). The book counts the refund. The trial-balance drift this path already causes shows in the house-bot overview as "Refund recorded without ledger entry" rather than silently.
- **Plan:** §3 Propagation 'orphan repair'; §4.6 NOT_FOUND → MARKET_GONE
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:4291-4295 (market delete), :2548-2599 (orphan refund: separate writes, no ledger, notice marketId ""); C:/kipindi-main/src/lib/server/market-dal.ts:1004-1006
- **Fix:** Keep the orphan path in the propagation list and add its txn create to the HB-LC-14 source pin; flag the missing ledger write as pre-existing in HOUSE-BOTS.md risks.
- **Test:** test:house-bot-money — delete a market with a house position in memory, run repair: marker on refund, intent MARKET_GONE.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder's refund notice carries no label (D19c; C4 ruling 143). Coverage gate: partly struck by D19.

### HB-LC-31 [partial] Two-admin authorization toggled ON after bots are live
- **Trigger:** The owner enables two-admin at the resolver-queue header. The first officer stages YES (market goes CLOSED with resolvedOutcome staged); a second officer confirms later; a mismatch or 'reopen' is attempted.
- **Expected:** The engine sees status CLOSED → PENDING intents SKIPPED(MARKET_NOT_LIVE), and never reads the staged outcome (HB-LC-03). adminReopenMarket is refused once stage-1 exists, so HB-LC-15 does not apply. ~~House exposure shows on both stage surfaces.~~ Toggling OFF mid-stage lets the same officer complete. No house-specific officer conflict (I10). COMPLIANCE audit resolution.two_admin_enabled as today.
- **Plan:** I2; I10; F11
- **Evidence:** C:/kipindi-main/src/lib/server/resolution-policy.ts:55-67; C:/kipindi-main/src/lib/server/market-service.ts:2989-3007 (stage-1 → CLOSED), :3020-3027, :4005 (reopen refused after stage-1)
- **Fix:** Add the two-admin path to the HB-LC-03 decision-diff test and the HB-LC-16 transition list.
- **Test:** test:house-bot-engine — two-admin ON: stage-1 mid-delay → SKIPPED(MARKET_NOT_LIVE); decision identical with the staged outcome present.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** neither stage surface shows a house exposure line (C5-SPEC rulings 192–194). Coverage gate: partly struck by D20.

### HB-LC-32 [covered] A single admin resolves a LIVE market (no LIVE guard) while a house bet is in flight
- **Trigger:** An officer resolves YES at 15:00:00 while a claimed COUNTER holds wallet:<bot> and is waiting for market:<id>.
- **Expected:** Lock serialisation. If resolve commits first, the bet's in-lock re-check sees RESOLVED → nothing debited, mapped SKIPPED(MARKET_NOT_LIVE) (HB-LC-16). If the bet commits first, the house position is OPEN and is resolved and settled normally at objectionsClosedAt. A verdict notice goes to the holder ~~with the label~~. No deadlock (resolve takes only the market lock).
- **Plan:** F5 step 6; §3 H3 closed re-check; lock order
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:2982-2985 (only the market lock, no LIVE check), :3053-3056; :1282-1286 (in-lock re-check before any money write)
- **Test:** test:house-bot-caps — resolve holds the market lock while placeHouseBet waits → refused, balances unchanged; reverse order → position settles.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder's verdict notice carries no label (D19c; C4 ruling 143). Coverage gate: partly struck by D19.

### HB-LC-33 [covered] Objection upheld with VOID before settlement
- **Trigger:** A poll resolves NO with house YES 5,000; a second officer upholds VOID.
- **Expected:** Status VOIDED, window backdated 1 s, the settle timer re-armed. The VOID branch refunds every OPEN stake in its own money transaction; house BET_REFUND carries the marker; ~~holder refund notice labelled;~~ realised 0; exposure released. COMPLIANCE audit objection.upheld unchanged.
- **Plan:** §3 Propagation 'VOID refunds'; (h)
- **Evidence:** C:/kipindi-main/src/lib/server/objections-service.ts:519-524; C:/kipindi-main/src/lib/server/market-service.ts:3395-3413
- **Test:** test:house-bot-money — uphold VOID path: markers, trial balance, book net 0.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder's refund notice carries no label (D19c; C4 ruling 143). Coverage gate: partly struck by D19.

### HB-LC-34 [covered] One-sided at settlement where only house money is on one side, or every player left
- **Trigger:** A COUNTER/FILL has the house on NO; all YES money exits or never locks, or players are only on the house's side at lock.
- **Expected:** If one pool is 0 at settlement → full refund at 0% fee to every OPEN position including the house (marked BET_REFUND), audit market.resolved.one_sided_refund. ~~Holder notice labelled.~~ Players' one-sided copy stays true. If the house is the counterparty the market is not one-sided and settles normally (the purpose). A refunded counter still counts toward gCounterPerPlayerPerDay (counted at placement).
- **Plan:** §3 Propagation 'one-sided refunds'; §5 counters per player
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:3278-3361 (one-sided branch), :3363-3378 (audit)
- **Test:** test:house-bot-money — house-only side → one-sided refund, marker, book returned = stake.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder's refund notice carries no label (D19c; C4 ruling 143). Coverage gate: partly struck by D19.

### HB-LC-35 [covered] The house is the only participant (OPENER, nobody joins)
- **Trigger:** An OPENER stakes UP 2,000 on an empty round and no player joins before lock.
- **Expected:** One-sided refund at settlement (marked). Publicly the round shows 1 player and a one-sided pool (D6 accepted). The leaderboard counts the refunded row for the holder (D6). Feed outcome "Opener — nobody joined, refunded". The overview shows OPENER stats opened / joined / refunded. Alerts are capped.
- **Plan:** D6; F4 OPENER; §8 activity feed
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:3278-3279; C:/kipindi-main/src/lib/server/market-dal.ts:1225-1235 (leaderboard counts every non-OPEN position)
- **Test:** test:house-bot-reports — leaderboard still includes the holder (pinned); test:house-bot-engine — feed outcome copy.

### HB-LC-36 [covered] House bet racing the lock at the last second (result-phase edge)
- **Trigger:** An intent is claimed at deadlineAt − 1 s; selections close while the bet waits for locks.
- **Expected:** In-lock re-check refuses before any money write → EXPIRED(CUTOFF). audit bet.rejected.closed_in_flight (moneyMoved false). Intent stays CLAIMED until the mapper writes; markPlaced never ran. No alert.
- **Plan:** I1; §3 H3/H4; §4.6 SELECTION_CLOSED row
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:1282-1286, :1404-1413
- **Test:** test:house-bot-caps — lock-edge race → EXPIRED(CUTOFF), trial balance unchanged (mirrors test:late-bet).

### HB-LC-37 [covered] Price feed down: no confirmed reading at all
- **Trigger:** Oracle outage; the asset has no CONFIRMED observation and no vendor bars.
- **Expected:** Decide and fire → SKIPPED(UD_NO_PRICE), copy "Skipped — no BTC price available". Rounds without an open price are not opened by advanceChain; unresolved rounds void via the healer and refund (marked). No alert per skip; the engine-health callout is unaffected.
- **Plan:** F4 'A missing price → skip UD_NO_PRICE'
- **Evidence:** C:/kipindi-main/src/lib/server/updown-board.ts:634-637 (null when no confirmed reading); C:/kipindi-main/src/lib/server/updown-service.ts:1643-1658 (never opens without a price)
- **Test:** test:house-bot-engine — no observation and no vendor → UD_NO_PRICE.

### HB-LC-38 [covered] Poll with days of runway: the counter waits out the player's free exit and later exits are handled
- **Trigger:** A player stakes YES 10,000 on a poll 4 days from cutoff; delay 20 s; free grace 5 min.
- **Expected:** dueAt = placedAt + 5:00 (exit window from the frozen snapshot), deadlineAt far off. Feed why: "held to 5:00 (player's free exit)". If the player cashes out before 5:00 → SKIPPED(TRIGGER_EXITED) and the penalty box applies. After placement the house can't exit ((d),(e)). House stakes count toward the holder's own daily loss limit until settlement (accepted risk 4) → OWNER_LOSS_LIMIT auto-pause if it blocks.
- **Plan:** F4 COUNTER timing; (d)(e)(k); I9; accepted risk 4
- **Evidence:** C:/kipindi-main/src/lib/server/market-service.ts:2658-2673 (window from the frozen snapshot, measured from placedAt), :2742-2750
- **Test:** test:house-bot-engine — exit window hold and TRIGGER_EXITED penalty box (already listed).

### HB-LC-39 [covered] Leaderboard, predictor count and ticker include the bot and never decrement after voids
- **Trigger:** The bot enters 30 markets; some are voided.
- **Expected:** predictorCount +1 on the bot's first position per market and not decremented on void. Leaderboard ranks the holder by resolved positions including refunds. Ticker net pool includes house money. All unchanged (D6). houseBotId never reaches getBoard, getRoundDetail, leaderboard or market:odds payloads ~~for non-holders~~.
- **Plan:** D6; I8; test:house-bot-reports
- **Evidence:** C:/kipindi-main/src/lib/server/market-dal.ts:1225-1257 (no account filter; distinct counts)
- **Test:** test:house-bot-reports — leaderboard includes the holder; marker absent from public payloads (already listed).
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the marker reaches no public payload for any viewer, the holder himself included (C5-SPEC rulings 247–248); the public figures stay as written (D6). Coverage gate: counts in its every-viewer form (C5-SPEC ruling 250).

## engine-infra (42)

### ENG-01 [gap] Owner presses kill switch OFF while a bot bet holds house:control on a half-open connection (DB failover or network blip)
- **Trigger:** OFF clicked while a bet transaction holding pg_advisory_xact_lock(house:control) is hung
- **Expected:** enabled=false commits within 1s no matter what. Any bet that reaches H4 afterwards gets house_disabled. The UI says 'House bots are off. No bot will place a bet.' only once the lock confirms. Otherwise it says 'Switched off. One bet that was already in its final step may still complete.' Event SWITCH_OFF, bell and email to admins.
- **Plan:** F9 (plan:130-132), H4 (plan:202), lock order (plan:205)
- **Evidence:** src/lib/server/locks.ts:137,141-144 (advisory lock waits until the 30s tx timeout); locks.ts:107-121 (a nested lock is held until the outer commit)
- **Fix:** Reorder OFF. (1) Autocommit UPDATE HouseBotControl SET enabled=false, switchedAt=now() with no advisory lock. (2) A separate tx runs SET LOCAL lock_timeout='5s' then pg_advisory_xact_lock(house:control), only to confirm in-flight bets are done. On 55P03, return the 'may still complete' copy. (3) Cancel live intents conditionally. H4's fresh re-read of enabled already makes step 1 authoritative.
- **Test:** test:house-bot-caps: a helper tx holds house:control for 60s. OFF returns in under 1.5s with the 'may still complete' copy; control.enabled=false in the DB; the next placeHouseBet returns house_disabled.

### ENG-02 [gap] OFF click lost because a deploy changed Server Action ids while the console tab was open
- **Trigger:** Deploy lands; owner clicks OFF on the stale page
- **Expected:** The owner is never left believing bots are off when they are not. After the automatic reload the strip shows ON plus a danger Callout: 'Your switch-off did not reach the server because 50pick was updating. House bots are still ON.' with a primary 'Switch off now' button. A CLI fallback also exists.
- **Plan:** F9 (plan:130-132), §8 Live state (plan:410-414)
- **Evidence:** docs/TRAPS.md:9-14 (stale action id fails); docs/TRAPS.md:40-41 (route-error reloads the page, never replays the action)
- **Fix:** Before calling the action, the client writes sessionStorage pendingSwitch={on:false, at, buildId}. After a reload, if the switch is still ON and the pending entry is under 2 min old, render the Callout (no auto-replay) and clear it on success or dismiss. Add ops:house-bots-off: a direct pg Client, dry-run by default, --apply writes enabled=false, offCause MANUAL, and an event row. Add both to the HOUSE-BOTS.md runbook.
- **Test:** test:house-bot-console: a pendingSwitch fixture with enabled=true renders the Callout and button; enabled=false clears it. test:deploy-skew style unit for the storage key. The ops script is dry-run by default.

### ENG-03 [partial] SIGTERM drain assumed but not guaranteed; hard kill mid-fire
- **Trigger:** Railway SIGTERM with open SSE connections, then SIGKILL after drainingSeconds; or an OOM kill
- **Expected:** Correctness never depends on the drain. On SIGTERM the process stops claiming at once and best-effort releases not-yet-started claims. A fire killed before commit rolls back; its CLAIMED row is reclaimed after claimedUntil and fires once under the same key. A fire killed after commit is PLACED with its position (markPlaced shares the tx). No duplicate bet, no stuck row.
- **Plan:** §4.2 SIGTERM (plan:226)
- **Evidence:** node_modules/next/dist/server/lib/start-server.js:331-349,375-376 (Next awaits server.close, then process.exit(143), without waiting for timers); src/app/api/events/route.ts:72,123 (keep-alive SSE holds server.close open); railway.json:7 drainingSeconds 30
- **Fix:** Restate SIGTERM as best effort. Synchronously set globalThis stopping=true (the poller checks it before any claim). Fire and forget: UPDATE HouseBotIntent SET status='PENDING', claimedBy=NULL WHERE claimedBy=$me AND status='CLAIMED' AND id NOT IN (in-flight ids). Release the lease. Declare the engine crash-only: recovery is claimedUntil expiry plus the alert outbox (ENG-04). Do not set NEXT_MANUAL_SIG_HANDLE.
- **Test:** test:house-bot-engine: two real OS processes (s12-leader-contention pattern) on PG; kill -9 the firing process inside the market lock and after commit. Assert one position per intent, status PLACED or re-fired once, no CLAIMED rows after 190s.

### ENG-04 [gap] Bet commits but its admin and holder alerts are never sent (kill after commit, or commit ack lost and the retry replays)
- **Trigger:** Crash after commit, before alert; or 08006 on COMMIT, where withTransientRetry replays the same key and returns replayed:true
- **Expected:** Every PLACED intent produces exactly one admin bet alert (or counts toward the hourly summary) ~~and one holder notice (or counts toward his summary)~~, even across crashes. A duplicate fire still produces none.
- **Plan:** §4.5 'Alerts go out iff ok and replayed!==true' (plan:251); (j) replayed (plan:193)
- **Evidence:** src/lib/server/market-service.ts:889-890 (retry with the same key); market-service.ts:1137-1155 (replay returns the original without re-running the post-commit block)
- **Fix:** Add HouseBotIntent.alertedAt timestamptz and an index (status, alertedAt) WHERE status='PLACED'. After any ok result, replayed or not: UPDATE ... SET alertedAt=now() WHERE id=$1 AND status='PLACED' AND alertedAt IS NULL RETURNING, and send only if a row returns. The planner repairs rows PLACED with alertedAt IS NULL AND finishedAt < now()-30s the same way. Drop the replayed-based rule.
- **Test:** test:house-bot-engine: inject a thrown 08006 after commit so the retry replays: one admin row, ~~one holder row~~. A real duplicate fire gives zero extra. A killed process after commit is repaired by the planner within 45s.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no per-stake notice or summary at all (D19c; C4 ruling 149), so each PLACED intent owes one admin bet alert (or its count in the admins' hourly summary). Coverage gate: partly struck by D19.

### ENG-05 [gap] Engine adds DB load while players are already getting BUSY (admission saturated or pool nearly exhausted)
- **Trigger:** Peak traffic: admission queueDepth>0 or inFlight near maxInFlight on a container
- **Expected:** The engine yields to players. It makes no claims and no sweep pages; bot bets never queue in admission ahead of players; the post-commit hook work is bounded. Player shed and timeout counts are the same with the engine on or off. Intents back off, then EXPIRED(BUSY_TIMEOUT).
- **Plan:** §4.2 Poller (plan:223), §4.3 fast path/sweep (plan:229-230), mapper BUSY (plan:258)
- **Evidence:** src/lib/server/admission.ts:68-80 (maxInFlight=pool-4, queue 500, wait 15s); src/lib/server/prisma.ts:29-35 (pool 40); market-service.ts:889 (the only admission call site; engine reads, claims, heartbeats and hook work sit outside it)
- **Fix:** (1) Before claiming, the poller reads admissionSnapshot(); skip the tick if queueDepth>0 or inFlight >= floor(maxInFlight/2). (2) placeHouseBet uses a non-queuing admission variant (withAdmission(fn,{maxWaitMs:0})) so saturation sheds straight to BUSY and backoff. (3) The hook runs through a globalThis semaphore (max 4 per process); overflow is dropped and counted (the sweep recovers it). (4) The sweep also skips while queueDepth>0.
- **Test:** test:house-bot-engine plus bet-admission: fill the slots with stub player bets, run a poller tick: 0 claims, 0 intents CLAIMED; hook overflow counter increments; player shed count equals the control run with the engine off.

### ENG-06 [gap] Bot bet waiting on the global house:control lock holds market:<id>, stalling player bets on that market
- **Trigger:** DB latency spike makes one bot bet's final writes slow while other bots wait on house:control
- **Expected:** A bot never holds a market lock for more than about 2s waiting on house:control. It aborts (rollback releases wallet and market), maps to BUSY, and backs off. Player bets on that market proceed, and the error streak is not incremented.
- **Plan:** Lock order (plan:205), accepted risk 5 (plan:559)
- **Evidence:** src/lib/server/locks.ts:107-121 (nested advisory locks held to outer commit); src/lib/server/retry.ts:47-52 (55P03 is not retryable)
- **Fix:** In the house branch, run SET LOCAL lock_timeout='2s' before acquiring market:<id> and house:control. Map a thrown 55P03 in the engine to transient BUSY (PENDING, backoff 1/5/15/45s) and never to FAILED(INTERNAL) or errorStreak. The player path is unchanged (house null).
- **Test:** test:house-bot-caps on PG: a helper holds house:control for 10s. A bot bet on market X aborts in 2-3s with BUSY; a concurrent player bet on X completes in under 3s; intent back to PENDING with nextAttemptAt set; errorStreak unchanged.

### ENG-07 [gap] New release boots against a DB missing the marker columns or house tables
- **Trigger:** Merge deployed before the migrations applied, or a migration marked failed
- **Expected:** No player bet ever fails because of the house-bot release. The new deployment reports not-ready (503) so Railway keeps the previous one where a healthcheck is configured. The engine does not start and logs one clear line.
- **Plan:** §2 migrations (plan:147-148), Release (plan:506)
- **Evidence:** src/lib/server/boot-checks.ts:36-86 (no schema probe); prisma/schema.prisma:1776-1799 (Prisma returns every scalar, so a missing Position.houseBotId column breaks each create); docs/RAILWAY-LIVE.md:101 (production healthcheckPath measured null)
- **Fix:** Add a houseBotSchemaReady() probe: SELECT houseBotId FROM Position LIMIT 0, the same for Transaction, plus to_regclass for the 6 tables and the control/runtime 'global' rows. /api/health readiness returns 503 when false; startHouseBotEngine refuses to start. Pre-merge checklist: confirm _prisma_migrations.finished_at is set for both, and that production healthcheckPath is live (RAILWAY-LIVE.md phase 2), else schedule the deploy as an outage.
- **Test:** test:health-readiness extension: mocked probe false gives 503 with houseBots.schemaReady=false; engine start is a no-op. Live check: railway config shows healthcheckPath before merge.

### ENG-08 [gap] Marker migration builds new indexes on the live Position/Transaction tables and blocks bet writes
- **Trigger:** Applying …_house_bot_markers on production (plain CREATE INDEX inside migrate deploy's transaction)
- **Expected:** Player bets are never blocked for more than a few hundred ms. Large tables get their indexes built CONCURRENTLY out of band first, so the migration is a no-op.
- **Plan:** §2 Markers indexes (plan:159), Release (plan:506)
- **Evidence:** prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql:34-35 (no CONCURRENTLY inside migrate deploy); scripts/ops-preflight-notification-idx.mts:32-40 (index lock duration scales with table size)
- **Fix:** Add ops:preflight-house-bot-migrations (read-only; pg Client pattern). It prints DB now(), SHOW timezone, row counts and sizes for Position and Transaction, existing index names, and GO/NO-GO. Thresholds: Position > 500k or Transaction > 1M means CREATE INDEX CONCURRENTLY IF NOT EXISTS for the FIVE indexes via a documented manual step before the migration, and every migration statement uses IF NOT EXISTS with identical names. ⛔ **FIVE, corrected 2026-09-20 from the migration itself** — the four that name "houseBotId" plus Position_placedAt_id_idx, the sweep keyset, built under the same ACCESS EXCLUSIVE lock. ⚠️ And the preflight must read `indisvalid`, not index NAMES: a failed CONCURRENTLY build leaves an INVALID index under the same name and IF NOT EXISTS silently keeps it, so a by-name check cannot see the one failure that matters.
- **Test:** test:dead-schema (IF NOT EXISTS, no CONCURRENTLY in the file); test:docs names the preflight script; its output is recorded in the verification record before release.

### ENG-09 [gap] After long downtime or an engine outage, hundreds of due intents fire late or burst, or are permanently skipped by rate caps
- **Trigger:** Container down 2h (overlapSeconds null plus a failed build), or HOUSE_BOT_ENGINE=false for a day; poll counters still before deadlineAt
- **Expected:** No stale bet: an intent more than maxLateness past dueAt becomes EXPIRED(STALE), with feed copy 'Not placed — the engine was offline when this was due'. Fresh ones fire at most gMaxBetsPerMinute platform-wide. Rate caps (MIN_GAP, PER_HOUR, GLOBAL_BETS_PER_MINUTE) defer rather than skip while within lateness. Money caps still SKIP.
- **Plan:** §4.5 claim (plan:241-247), mapper cap row (plan:268), §4.4 EngineCode (plan:235)
- **Evidence:** src/lib/server/market-scheduler.ts:55,322-325 (precedent: BOOT_GRACE_MS 90s plus staggered fires for missed deadlines)
- **Fix:** Add EngineCode STALE and rule maxLatenessSec (UD 30s, polls 600s). Claim adds AND dueAt > now() - maxLateness; the planner expires the rest. The mapper sends CAP_MIN_GAP/PER_HOUR/GLOBAL_BETS_PER_MINUTE to PENDING with nextAttemptAt = the instant the window frees, if that is before min(deadlineAt, dueAt+maxLateness), else SKIPPED. The first poller tick waits 20s after boot.
- **Test:** test:house-bot-engine: seed 300 intents due 2h ago plus 20 due now. 0 stale placed; placed per minute ≤ the cap; the rest EXPIRED(STALE) with copy; a MIN_GAP collision places the second intent 30s later rather than skipping it.

### ENG-10 [gap] Sweep watermark replays days of positions after the switch was OFF, a first boot, or a reset runtime row
- **Trigger:** Master ON after 3 days OFF; runtime 'global' row recreated
- **Expected:** The sweep only decides positions from the last maxLookback (10 min). No burst of SKIPPED rows for old markets; the watermark never lags more than lookback.
- **Plan:** §4.3 Sweep (plan:230), HouseBotRuntime sweepPlacedAt (plan:155)
- **Evidence:** src/lib/server/market-service.ts:1238 (placedAt is the only sweep key; nothing bounds how far back it reads)
- **Fix:** The seed migration sets sweepPlacedAt = now(). Each pass starts at max(watermark - lookback, dbNow - 10 min). While the switch is OFF or no bot is ACTIVE, advance the watermark to dbNow - lookback without writing decisions.
- **Test:** test:house-bot-engine: watermark 3 days old with 10k old positions; switch ON; first pass writes 0 intents for positions older than 10 min and the watermark ends ≥ now-90s.

### ENG-11 [gap] Infrastructure errors counted as engine faults switch the master OFF and mark intents FAILED
- **Trigger:** DB failover (57P01/57P02/57P03), P1001/P1017 connection loss, 55P03 lock timeout, 57014 statement timeout, AdmissionBusy thrown from outside
- **Expected:** Transient infra errors requeue (PENDING backoff) and, if sustained 2 min, send one AlertOnce 'Bot engine can't reach the database (since HH:MM EAT)'. Master OFF(ENGINE_ERRORS) only fires on 3 consecutive genuinely unexpected throws, counted atomically across replicas.
- **Plan:** Mapper 'thrown transient' and 'thrown non-transient' (plan:258,272), errorStreak (plan:155)
- **Evidence:** src/lib/server/retry.ts:47-52,57-65 (RETRYABLE lacks 57P02, 57P03, 55P03, 57014 and Prisma P1xxx)
- **Fix:** Add engine-local isEngineTransient() = retry.ts isTransient ∪ {57P02, 57P03, 55P03, 57014, P1001, P1002, P1008, P1017, AdmissionBusy}. errorStreak: UPDATE HouseBotRuntime SET errorStreak=errorStreak+1 WHERE key='global' RETURNING errorStreak; reset only on ok. AlertOnce key engine:db_unavailable:<EAT yyyy-mm-ddTHH>.
- **Test:** test:house-bot-engine: table-driven error codes map to PENDING vs FAILED; 5 transient throws leave the switch ON; 3 unexpected TypeErrors give one SWITCH_OFF(ENGINE_ERRORS) event and one bell and email even with 2 parallel workers.

### ENG-12 [partial] Timezone pitfall: new time columns naive and compared to DB now(); or the DB TimeZone is changed
- **Trigger:** A session or operator sets TimeZone to Africa/Dar_es_Salaam, or new columns use Prisma default DateTime (timestamp without tz)
- **Expected:** dueAt, claimedUntil and deadlineAt comparisons are identical whatever the session TimeZone. Cohort bounds against naive Position.placedAt are ISO strings cast ::timestamp. The engine refuses to start if the DB TimeZone is not UTC.
- **Plan:** §2 Timestamps (plan:170), §4.5 claim SQL (plan:241-247), §4.7 Clock (plan:280)
- **Evidence:** prisma/schema.prisma:1791 (placedAt DateTime, no @db, so naive); src/lib/server/market-dal.ts:1286-1291 (DB TimeZone Etc/UTC; bounds cast ::timestamp)
- **Fix:** Declare every HouseBot*/Intent/Runtime/AlertOnce time column @db.Timestamptz(3). Keep the ::timestamp ISO casts for Position/Transaction bounds. Engine boot checks current_setting('TimeZone') is UTC or Etc/UTC, else it does not start and sends AlertOnce engine:db_timezone. The preflight prints SHOW timezone.
- **Test:** test:house-bot-engine on PG: run claim and expiry in a session with SET TIME ZONE 'Africa/Dar_es_Salaam'; the same intents are claimed as under UTC; a cohort window at 00:00 EAT matches eat-day.ts.

### ENG-13 [gap] Clock skew between container and DB shifts the exit-window hold
- **Trigger:** DB clock 3s ahead of the container (or the reverse) after an NTP hiccup
- **Expected:** A counter never fires before the trigger's exit window closes by the clock cashOutValue uses. At more than 5s skew the poller stops claiming, admins get one alert per day, and the strip shows 'Bot engine paused: server clocks disagree by Ns'.
- **Plan:** §4.7 Clock (plan:280), F4 timing (plan:87)
- **Evidence:** src/lib/server/market-service.ts:2661-2671 (exit window uses container Date.now()); market-service.ts:564-568 (cutoff on container clock); src/lib/server/leader.ts:91,102 (lease on container clock)
- **Fix:** Once a minute the poller measures skewMs = DB clock_timestamp() - Date.now() and stores it on the runtime row. It claims with dueAt <= now() - greatest(0, skew) - 2s. If |skew| > 5s it skips claims and sends AlertOnce engine:clock_skew:<EAT day>. The strip reads skewMs.
- **Test:** test:house-bot-engine: injected clocks. A +3s DB skew delays the claim by 5s; +6s gives 0 claims plus one alert; exitClosesAt by container clock ≤ fire time in every case.

### ENG-14 [partial] Leader lease lost mid-planner: two planners run the same pass
- **Trigger:** Planner pass exceeds the lease; or saveConfig swallows a write error so acquireLeadership returns true while another container also takes the lease
- **Expected:** Every planner effect is idempotent: one AUTO_PAUSED transition, one master OFF(GLOBAL_LOSS_STOP), one hourly summary, one expiry per row, one FILL/OPENER per market. Failover within 45s.
- **Plan:** §4.2 Planner (plan:224), summaries (plan:382)
- **Evidence:** src/lib/server/leader.ts:61 (LEASE_MS fixed 3 min), :91 (no lease parameter), :111-114 (returns true after saveConfig); src/lib/server/config-store.ts:93-103 (saveConfig never throws)
- **Fix:** Give acquireLeadership an optional {leaseMs}; house-bot uses 45s. Use a house-bot-specific lease write that throws on failure (leave lifecycle unchanged). Every planner write is conditional with RETURNING and alerts only if a row changed: auto-pause WHERE status='ACTIVE'; OFF WHERE enabled=true; expiry WHERE status='PENDING' OR (status='CLAIMED' AND claimedUntil<now()); summaries via AlertOnce.
- **Test:** test:house-bot-engine: two planner instances run the same pass concurrently on PG with realised loss ≥ cap: one event, one bell per admin, one email; lease handover in ≤ 45s after kill.

### ENG-15 [gap] Poller crash loop hidden by a fresh heartbeat
- **Trigger:** Every tick throws (e.g. P2022, a bad deploy, a poisoned query) but pollerBeatAt is written at tick start
- **Expected:** The strip shows 'The bot engine is failing (last error HH:MM:SS EAT: <code>). No bot will place a bet.' within 30s. Admins get one bell and email per hour of failure. The beat reflects the last successful claim query.
- **Plan:** §4.2 Poller beats (plan:223), Engine health Callout (plan:413)
- **Evidence:** src/lib/server/lifecycle.ts:393-402 (precedent: one COMPLIANCE lifecycle.ticker_overrun alert per episode)
- **Fix:** Write pollerBeatAt only after the claim statement succeeds. Record pollerErrorAt, pollerErrorCode and pollerErrorStreak on the runtime row. At 10 consecutive failures send AlertOnce engine:poller_failing:<EAT hour> plus a SYSTEM audit. The Callout picks 'failing' vs 'not running' copy by which field is fresher.
- **Test:** test:house-bot-engine: stub the claim to throw 10 times: beat unchanged, errorStreak 10, one alert; strip fixture 'failing' renders at 360-1920 widths.

### ENG-16 [partial] Poison intent or claim lifecycle edge (crash after claim, before placeHouseBet)
- **Trigger:** Process dies after claim; or a specific intent crashes the process on every attempt
- **Expected:** A crashed claim is reclaimed after claimedUntil (180s). An intent is attempted at most 3 times, then FAILED(POISON) with one alert. CLAIMED rows past deadline are expired by the planner; an in-flight claim is never expired.
- **Plan:** §4.5 Claim (plan:239-251)
- **Evidence:** src/lib/server/admission.ts:78 (15s wait); src/lib/server/retry.ts:54 (4 attempts); src/lib/server/locks.ts:141-144 (10s maxWait plus 30s timeout per attempt, so ≈175s worst case)
- **Fix:** Claim WHERE adds attempts < 3; the planner marks attempts >= 3 AND claimedUntil < now() as FAILED(POISON) plus AlertOnce. Add POISON to EngineCode and feed-copy. Pin claimedUntil (180s) ≥ admission wait + 4×(maxWait+timeout) + 5s in a constant test. Expiry never touches CLAIMED rows with claimedUntil >= now().
- **Test:** test:house-bot-engine: a fire stub that throws a process-exit sentinel 3 times gives FAILED(POISON) plus one alert; the constants test fails if the tx timeout is raised.

### ENG-17 [gap] Long-running settlement holds market:<id> while a bot fire waits holding wallet:<bot>
- **Trigger:** settleMarket or emergency void on a market the bot is firing into; the holder deposits or withdraws at the same time
- **Expected:** A bot fire waits at most 2s on the market lock, then BUSY backoff. The holder's own wallet actions are not blocked for 30s. Settlement never deadlocks (no wallet row lock taken before the market lock).
- **Plan:** H2 lockedGate (plan:200), lock order (plan:205)
- **Evidence:** src/lib/server/market-service.ts:1274-1278 (locks-then-tx rule: settlement is market lock → wallet row); market-service.ts:3152 (settle under the market lock); src/lib/server/market-scheduler.ts:56,266-269 (settle retry 5 min)
- **Fix:** Pin in the plan: H2 is plain SELECTs only (no FOR UPDATE, no writes before the market lock), enforced by a source test on the house branch. The lock_timeout from ENG-06 also covers acquiring market:<id>.
- **Test:** test:house-bot-caps on PG: a helper holds market:X for 20s (settle stand-in). The bot fire returns BUSY in under 3s; a holder withdraw() completes in under 3s; no 40P01 in logs; source test fails on 'FOR UPDATE' in the house gate.

### ENG-18 [gap] Kill switch when the pool is exhausted or the DB is unreachable from the app
- **Trigger:** P2024 or P1001 on the OFF action
- **Expected:** Never an optimistic 'off'. Copy: 'Could not reach the database. House bots were NOT switched off. Try again, or turn on Maintenance mode.' Bets fail closed without the DB. Two fallbacks: maintenance mode (the bet-path gate) and ops:house-bots-off over a direct connection.
- **Plan:** F9 (plan:130-132), §8 Feedback (plan:416-423)
- **Evidence:** src/lib/server/market-service.ts:931-932 (maintenance refuses every bet, including bots through buyPositionGuarded); scripts/ops-preflight-notification-idx.mts:14-21 (direct pg Client pattern outside the app pool)
- **Fix:** setHouseBotSwitchAction(off) maps thrown infra errors to that exact error copy in the ActionOverlay, which stays open. Add the runbook entry and ops:house-bots-off. HOUSE-BOTS.md kill-switch matrix: DB down, pool full, deploy, engine env off, Redis down, replica stale caches, lock hung, each with the expected result.
- **Test:** test:house-bot-console: action with a mocked P2024 returns ok:false with that copy; feedback-law channel check. The ops script is dry-run by default and --apply writes enabled=false plus an event.

### ENG-19 [partial] Very high player volume: hook and sweep cost per bet
- **Trigger:** 50+ bets/s with the switch ON and 5 ACTIVE bots in scope
- **Expected:** At most 1 extra DB write per in-scope trigger and 0 extra reads (the bet passes its data in memory). A marked bot position exits the hook before any work. Sweep p95 under 200ms, re-reading only undecided positions.
- **Plan:** §4.3 fast path, sweep, negative decisions (plan:229-232)
- **Evidence:** src/lib/server/market-service.ts:1491-1522 (post-commit block already holds userId, market and placedAt); market-service.ts:1514 (the one existing per-bet read)
- **Fix:** The hook signature takes {positionId, userId, role, marketId, productLine, side, stake, placedAt, cutoff, houseBotId} from the committed bet; return at once if houseBotId is set or the soft cache is off. Bots, rules and penalty box are cached 5s. The sweep SQL filters houseBotId IS NULL, market LIVE, productLine in scope, placedAt < dbNow-5s, and NOT EXISTS the COUNTER intent.
- **Test:** Load harness (scripts/load pattern) at 50 bets/s: extra queries per bet ≤ 1 write; EXPLAIN of the sweep uses Position(placedAt,id) and the intent anchorKey unique index; admission p95 wait within 10% of the engine-off control.

### ENG-20 [partial] Cap queries inside the locks degrade to sequential scans at scale
- **Trigger:** 1M player positions and 20k house positions; H2/H3/H4 cap queries under house:control
- **Expected:** Every in-lock cap query (per-bot windows, open exposure, global daily stake, counterparty count/TZS, other-bot-on-market) uses an index and runs under 5ms, so house:control stays ms-long.
- **Plan:** §2 Markers indexes (plan:159), intent indexes (plan:166), accepted risk 5 (plan:559)
- **Evidence:** prisma/schema.prisma:1797-1798 (Position has only [userId,marketId] and [marketId,status])
- **Fix:** Add partial index Position(houseBotId) WHERE houseBotId IS NOT NULL AND status='OPEN' for exposure, and keep (houseBotId, placedAt) for windows. Write every cap query as raw SQL with ::timestamp ISO bounds. Pin the plans with EXPLAIN (no Seq Scan on Position or Transaction).
- **Test:** test:house-bot-caps PG variant: seed 1M/20k rows; EXPLAIN (FORMAT JSON) of each cap query contains no Seq Scan on Position or Transaction; timing assert under 5ms p95.

### ENG-21 [gap] App rollback to a pre-house-bots build after bots have placed bets
- **Trigger:** Railway 'redeploy previous' during an incident
- **Expected:** The runbook forbids rollback while house positions are OPEN, unless the owner accepts the consequences. The old code would let the holder cash out house positions, accrue wagering and agent commission on them, and would run no engine. The switch is OFF first, and intents stay inert.
- **Plan:** Release (plan:506), §3 sanctioned changes (e)(f)(g) (plan:187-189)
- **Evidence:** src/lib/server/market-service.ts:2719-2734 (old cashOutPosition has no house refusal); docs/AGENT-STRESS-TEST-FINDINGS.md:3195 (old image keeps serving during overlap)
- **Fix:** HOUSE-BOTS.md runbook 'Rolling back past the house-bots merge': 1) master OFF; 2) ops:house-bots-status shows OPEN marked positions and PENDING/CLAIMED intents; 3) wait for 0 OPEN or record the owner's acceptance; 4) roll back; 5) on return, intents older than lateness expire (ENG-09).
- **Test:** test:docs: the runbook section exists and names ops:house-bots-status; that script prints openHousePositions and liveIntents (unit on memory store).

### ENG-22 [partial] HOUSE_BOT_ENGINE env flipped (false, then true) or set on only one replica
- **Trigger:** Operator sets HOUSE_BOT_ENGINE=false and restarts; later true
- **Expected:** false stops the poller, planner AND hook on that container, so no intents are written. The console says 'Bot engine disabled by server configuration' rather than 'not running'. The master switch remains the owner's kill. true resumes, and stale intents expire (ENG-09). Tests and local scripts default to false unless opted in.
- **Plan:** §4.2 Off switch (plan:225)
- **Evidence:** src/lib/server/lifecycle.ts:509-511 (precedent env gate); scripts/live-updown-handover-widths.mjs:41 (scripts run with LIFECYCLE_TICKER=false)
- **Fix:** At boot write runtime engineEnv:{instanceId, enabled, bootAt}. The hook checks the env before its dynamic import. The strip picks copy from engineEnv. seed/drive scripts set HOUSE_BOT_ENGINE explicitly.
- **Test:** test:house-bot-engine: env false means no timers, hook returns before import, 0 intents after a player bet; strip fixture 'disabled by configuration'.

### ENG-23 [partial] In-memory store boot and Next.js duplicate module instances start two engines
- **Trigger:** DATABASE_URL="" dev server with HMR; instrumentation and route handlers load separate module graphs
- **Expected:** Exactly one poller and one planner per process. The hook and the poller share one soft cache and in-flight counter. The memory claim is atomic. Memory-mode lock order cannot hang.
- **Plan:** §2 In-memory twin (plan:168-169), §4.2 Boot (plan:222)
- **Evidence:** src/lib/server/leader.ts:47-54 (module instantiated more than once; pinned on globalThis); src/lib/server/store.ts:836,864 (memory store on globalThis); src/lib/server/locks.ts:82-95 (memory mutex, no deadlock detection); leader.ts:94-97 (always leader without DB)
- **Fix:** Pin state on globalThis.__50PICK_HOUSE_BOT_ENGINE: timers, stopping, inFlight, softCache, hookSemaphore. startHouseBotEngine is idempotent. The memory twin claim selects and marks with no await in between. Add a lock-order source test for the memory path.
- **Test:** test:dal-parity for claim, requeue, markPlaced and expire; test:house-bot-engine: calling startHouseBotEngine twice (and via a fresh module import) leaves one interval registered.

### ENG-24 [partial] Replica count raised to 2+: in-memory state that is not DB-backed
- **Trigger:** numReplicas=2
- **Expected:** Every money or count cap and every alert throttle stays exact across replicas (DB-backed). Per-process items are declared and bounded: fires per process (2N concurrent, capped by H4 bets/minute), 5s soft cache, housebot.verify bucket (true bound is the DB login lockout 5 fails/30 min), the holder bet.place bucket, the maintenance cache (engine reads fresh), admission (pool must be sized N×).
- **Plan:** §4.2 (plan:223), §4.3 (plan:229), §6 password rate bucket (plan:356), F5 step 2 (plan:98)
- **Evidence:** docs/POLISH-BACKLOG.md:206-216 (admission per container, pool N×; Redis inert in production); src/lib/server/platform-config.ts:45-57 (maintenance cache never refreshed); src/lib/server/rate-limit.ts:28-33 (bet path in-memory bucket); src/lib/server/market-scheduler.ts:30-37 (TODO(scale) timers per process)
- **Fix:** Add a table to HOUSE-BOTS.md 'State → where it lives → replica effect'. Verify copy uses attemptsBeforeLock from the DB counter, not the bucket. errorStreak and summaries atomic (ENG-11/14). State that scale-out stays blocked by the pre-existing scheduler TODO and the pool arithmetic, not by house bots.
- **Test:** test:house-bot-engine two-OS-process run (s12 pattern): 100 intents, 2 pollers: 0 duplicate positions, bets per minute ≤ cap, one alert per event; a verify unit shows the lockout after 5 fails regardless of bucket.

### ENG-25 [gap] Hourly throttles and summaries at the hour boundary; rolling vs clock-hour caps
- **Trigger:** 25 house bets 13:50-14:10 EAT with bellAlertsPerHour 20 and freqMaxPerHour 20
- **Expected:** PER_HOUR, PER_DAY, MIN_GAP and GLOBAL_BETS_PER_MINUTE are rolling windows from Position rows, so there is no 2× burst at HH:00. The 13:00-14:00 summary counts exactly the bets placed in that EAT hour beyond the cap and is sent once even if the first 14:00 bet resets the runtime counter first.
- **Plan:** HouseBotRuntime hourKey/countInHour (plan:155), summaries (plan:381-389), caps (plan:322-325)
- **Evidence:** src/lib/eat-day.ts:24-33 (fixed +3h offset helpers to reuse)
- **Fix:** Define cap windows as rolling in rules.ts and H2/H4 SQL. Build summaries from HouseBotIntent PLACED rows in [HH:00, HH+1:00) EAT, gated by AlertOnce summary:<audience>:<botId|all>:<EAT yyyy-mm-ddTHH>. The runtime countInHour is only the live per-bet throttle.
- **Test:** test:house-bot-comms: fixtures straddling 14:00 EAT give 20 bells plus one summary saying N=5 for 13:00-14:00; test:house-bot-caps: 20 bets at 13:59 and a 21st at 14:00:30 is refused CAP_PER_HOUR.

### ENG-26 [partial] EAT midnight: daily cohort loss and daily stake rollover (Tanzania has no DST)
- **Trigger:** Bot at projected loss = cap at 23:58 EAT; clock passes 00:00 EAT (21:00 UTC)
- **Expected:** The cohort resets at 00:00 EAT using the fixed +3h offset. Yesterday's cohort stays bounded by yesterday's cap, so a rolling 24h can reach 2× cap around midnight, and the console says so. DAILY_LOSS_STOP bots are not auto-restarted; Start becomes enabled. Day keys never use the UTC date.
- **Plan:** §3 Loss cohort (plan:206-211), F6 DAILY_LOSS_STOP (plan:116)
- **Evidence:** src/lib/eat-day.ts:17-33 (UTC+3, no DST since 1931; eatDayKey/eatDayStartMs); src/lib/server/report-money.ts:70-71 (startOfEatDay)
- **Fix:** book.ts, AlertOnce keys and hourKey import only eat-day.ts (source test bans toISOString().slice(0,10) in house-bot modules). Add hint copy: 'Limits restart at 00:00 EAT. Around midnight a bot can lose up to twice its daily cap within a few hours.' The planner never changes status at rollover.
- **Test:** test:house-bot-rules/caps: positions at 23:59:59.999 and 00:00:00.000 EAT fall into different cohorts; Start enabled at 00:00; status still AUTO_PAUSED; source ban test.

### ENG-27 [gap] HouseBotIntent, AlertOnce and runtime tables grow without bound
- **Trigger:** Months of operation: one SKIPPED row per in-scope player bet plus AlertOnce rows per day
- **Expected:** Terminal non-money intents (SKIPPED, EXPIRED, CANCELLED) older than 90 days are deleted in batches. PLACED and FAILED rows (linked to Positions and money) are kept like money records. AlertOnce rows older than 7 days are deleted. HouseBotEvent is kept (compliance history). Retention never touches rows for unsettled markets.
- **Plan:** §2 HouseBotIntent (plan:161-166), HouseBotAlertOnce (plan:156)
- **Evidence:** src/lib/server/retention.ts:112-130 (retention names only notifications, OTP and AI payloads; money and audit untouched)
- **Fix:** Add retention.ts classes houseBotIntents (DELETE ... WHERE status IN ('SKIPPED','EXPIRED','CANCELLED') AND finishedAt < now()-90d AND market settled, LIMIT 5000 per pass) and houseBotAlertOnce (> 7 days). Index (status, finishedAt). Report both in the retention audit payload; constants HOUSE_BOT_INTENT_RETENTION_DAYS=90, ALERT_ONCE_RETENTION_DAYS=7 in HOUSE-BOTS.md.
- **Test:** test:retention extension: seeded ages delete exactly the eligible rows; PLACED untouched; a SKIPPED row on an unsettled market untouched; batch limit respected.

### ENG-28 [partial] Notification volume from bot alerts over a day
- **Trigger:** Switch ON all day, 5 bots, 3 admins, caps at defaults
- **Expected:** Rows per day ≤ admins×(bellAlertsPerHour×24 + 24 summaries) + auto-pause, money and switch events ~~+ holders×(holderNoticesPerHour×24 + 24)~~. Pruned at 180 days. Unique titles survive the 90s dedupe.
- **Plan:** §7 Notifications (plan:378-389)
- **Evidence:** src/lib/server/retention.ts:46 (NOTIFICATION_RETENTION_DAYS 180); src/lib/server/notification-service.ts:56 (DEDUPE_WINDOW_MS 90s)
- **Fix:** Write the daily row budget formula and the worst case at max caps (60/h × 24 × admins) into HOUSE-BOTS.md. Limits tab hint: 'At this setting each admin gets up to N bell rows a day'.
- **Test:** test:house-bot-comms: simulate 24h of 1 bet/min: row count equals the formula; no dedupe audit rows for unique titles.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** holders receive no house-bot rows at all and `holderNoticesPerHour` is removed (D19c; C4 rulings 149 and 153); the budget is the admins' rows. Coverage gate: partly struck by D19.

### ENG-29 [partial] Planner stale while poller healthy (lease held by a killed leader): misleading 'engine not running' copy
- **Trigger:** Leader container hard-killed; the lease is not released until it expires
- **Expected:** The strip separates the two. Poller stale: danger 'The bot engine is not running (last seen HH:MM:SS EAT). No bot will place a bet.' Planner-only stale: warning 'Loss stops, fills and summaries are delayed (last run HH:MM:SS EAT). Bets still stop at every cap.' Projected-loss gates in the locks keep money bounded meanwhile.
- **Plan:** Engine health (plan:413), §3 projected vs realised (plan:207-210)
- **Evidence:** src/lib/server/leader.ts:61,124-139 (a lease held by a dead container lasts until expiry; release only on a clean exit)
- **Fix:** Two Callouts with the copy above, plus the 45s lease from ENG-14. Tone: danger for the poller, warning for the planner.
- **Test:** qa:house-bots-visual fixtures strip poller-stale and planner-stale at 6 widths; test:house-bot-engine: planner-stale state renders the warning, not the danger copy.

### ENG-30 [partial] Deploy with overlapSeconds null: brief outage shows engine-stale during every deploy
- **Trigger:** Production deploy while switch ON (production measured null)
- **Expected:** Intents due during the outage expire or go STALE (ENG-09); no bet placed by a dead container. For the first 90s after a new container boots, the strip shows the neutral 'Bot engine starting after an update' instead of the danger Callout, then danger if still stale.
- **Plan:** Release (plan:506), accepted risk 6 (plan:560), Engine health (plan:413)
- **Evidence:** docs/RAILWAY-LIVE.md:100-102 (numReplicas 1, overlap/draining null: downtime on every deploy); railway.json:6-7 (committed overlap 60, not applied)
- **Fix:** The runtime row stores lastBootAt per instance. Callout logic: stale beats within 90s of the latest lastBootAt give the neutral tone copy. Runbook: deploy with the switch OFF unless overlap 60 is verified live.
- **Test:** qa:house-bots-visual fixture 'engine starting'; unit on the callout selector with bootAt now-30s vs now-120s.

### ENG-31 [partial] Crash between player commit and the post-commit hook; late commit relative to placedAt
- **Trigger:** Container dies right after a player bet commits; or a bet's placedAt precedes its commit by up to about 30s (market lock wait)
- **Expected:** The sweep decides that trigger exactly once within one pass. The decision uses the original placedAt for timing; if dueAt now falls after deadline or lateness, a SKIPPED/EXPIRED row with its reason is written.
- **Plan:** §4.3 Sweep lookback 60s (plan:230), (a) hook (plan:183)
- **Evidence:** src/lib/server/market-service.ts:1238 (placedAt set before the market lock), :1282 (market lock wait); src/lib/server/locks.ts:141-144 (30s tx timeout)
- **Fix:** Set SWEEP_LOOKBACK_MS = 90s, with a constant test asserting ≥ lock tx timeout + 30s skew margin. The sweep compares against DB now().
- **Test:** test:house-bot-engine: insert a committed position with placedAt now-45s and no hook call; the next sweep creates exactly one intent; the constant test fails if the lookback drops below 60s.

### ENG-32 [partial] Partial or failed migration at deploy blocks next start
- **Trigger:** prisma migrate deploy fails on …_house_bot_markers (lock timeout, name clash)
- **Expected:** Never a production outage. Migrations are applied and verified from the operator machine before merge; both files are re-runnable, so a retry completes; the deploy only happens once _prisma_migrations shows both finished.
- **Plan:** §2 migrations (plan:147-148), Release (plan:506)
- **Evidence:** package.json:12 (start = prisma migrate deploy && next start); scripts/ops-preflight-notification-idx.mts:6-10 (a failing migration means next start never runs, so a platform-wide outage)
- **Fix:** Release checklist: run the preflight (ENG-08); apply; SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations for both; on a failed row, fix, then prisma migrate resolve --applied only after verifying the objects exist; never merge with a failed row.
- **Test:** CI replays all migrations on empty PG twice (idempotence); test:dead-schema; the verification record has the _prisma_migrations output.

### ENG-33 [partial] DB primary failover during active firing
- **Trigger:** 30-60s failover; connections dropped with 57P01/08006
- **Expected:** In-flight bets either committed (PLACED) or rolled back (reclaim, same key). The bet path retries briefly, then the engine backs off. Up & Down intents mostly EXPIRE(BUSY_TIMEOUT); poll intents resume. Hook inserts lost during the window are recovered by the sweep. Admins get one 'can't reach the database' alert; the switch stays ON.
- **Plan:** Mapper BUSY/transient (plan:258), §4.3 sweep (plan:230)
- **Evidence:** src/lib/server/retry.ts:47-54 (57P01/08006 retried only 50/150/400ms, far shorter than a failover)
- **Fix:** Covered by ENG-11 (classifier plus alert) and ENG-04 (alert outbox). Also: the heartbeat's failure to extend claimedUntil does not abort the in-flight fire (markPlaced conditional guards it).
- **Test:** test:house-bot-engine: a stub DB throws 57P01 for 40s: intents PENDING then EXPIRED or placed after recovery, 0 duplicates, 1 alert, switch ON.

### ENG-34 [partial] Audit chain contention from bot activity
- **Trigger:** Master OFF with 5 ACTIVE bots and 200 live intents; or a burst of auto-pauses
- **Expected:** One audit row per state change (switch, pause, designation), never per intent, skip or alert. Awaited audits run outside wallet/market/house:control locks, so no bet connection waits on the audit:chain lock.
- **Plan:** H5-H9 audit payload (plan:203), auto-pause audit (plan:274)
- **Evidence:** src/lib/server/audit.ts:347-386 (every append takes a global advisory lock in its own tx and connection); src/lib/server/market-service.ts:1508-1522 (one audit row per bet, by design)
- **Fix:** State in §4.6: engine modules may call audit() only from an allowlist (auto_paused, switch, designation, security faults), never inside withLock callbacks. Add a source-scan assertion.
- **Test:** test:house-bot-engine: OFF with 200 intents gives exactly 1 SWITCH_OFF audit; source scan finds no audit( inside withLock callbacks in house-bot modules.

### ENG-35 [partial] Lock-order inversion from control or limits writes
- **Trigger:** Limits save takes house:control and then wallet:<bot> to cross-check bots while a bot bet holds wallet:<bot> and waits for house:control
- **Expected:** No path takes wallet or market locks after house:control. Cross-field checks between rules and global limits read without locks; the money caps are enforced at bet time (H3/H4). No deadlock on PG, and no hang on the memory mutex.
- **Plan:** F2 (plan:64-69), lock order (plan:205)
- **Evidence:** src/lib/server/locks.ts:82-95 (memory mutex waits forever with no deadlock detection); src/lib/server/market-service.ts:1260-1261 (global order is wallet→market)
- **Fix:** Add to §3: 'house:control is always innermost; control writes (ON/OFF/limits) take it alone; rules saves take wallet:<bot> alone.' Source test: a withLock(HOUSE_CONTROL_LOCK) callback contains no nested withLock.
- **Test:** test:house-bot-caps memory mode: a concurrent limits save and bot bet both complete within 2s; source test on lock nesting.

### ENG-36 [partial] AlertOnce day keys across replicas and skew at midnight
- **Trigger:** Two containers with 1s skew raise the same code at 23:59:59.5 EAT
- **Expected:** At most one alert per bot, code and EAT day. The key's day comes from one clock.
- **Plan:** HouseBotAlertOnce keys (plan:156)
- **Evidence:** src/lib/eat-day.ts:27-28 (eatDayKey from a container ms value)
- **Fix:** Compute the key's day inside the INSERT from DB now(), i.e. to_char(now() AT TIME ZONE 'Africa/Dar_es_Salaam','YYYY-MM-DD') concatenated with the key prefix, or pass the DB-derived day read in the same statement.
- **Test:** test:house-bot-comms: two inserts with container clocks straddling midnight but the same DB now() return one row.

### ENG-37 [covered] Deploy with overlapSeconds 60: two containers poll the same intents
- **Trigger:** New container boots while the old one still runs the poller; old releases the lease on SIGTERM
- **Expected:** Each intent is claimed by one container (FOR UPDATE SKIP LOCKED). A reclaimed duplicate is stopped by the H0 key pre-lookup, the wallet-lock replay and conditional markPlaced. One position, one alert. The planner lease moves at SIGTERM.
- **Plan:** §4.5 Claim (plan:239-251), H0/H4 (plan:198,202)
- **Evidence:** src/lib/server/lifecycle.ts:532-537 (SIGTERM releases the lease); src/lib/server/market-service.ts:1137-1155 (replay inside the wallet lock)
- **Test:** test:house-bot-engine two-process PG run: 50 due intents, both pollers: 50 positions max, 0 duplicate idempotency keys, alerts = placed count.

### ENG-38 [covered] Old container (column-unaware Prisma client) keeps serving after the expand-only migration
- **Trigger:** Migrations applied from the machine; production still runs the previous image
- **Expected:** Old code keeps working: nullable houseBotId columns and new tables are invisible to it, and TEXT+CHECK columns add no enum values it can't decode. No house bets exist yet (switch seeded OFF, no bots).
- **Plan:** §2 TEXT+CHECK (plan:147), Release (plan:506)
- **Evidence:** docs/AGENT-STRESS-TEST-FINDINGS.md:3195 (the old-image enum decode risk, avoided by TEXT); no raw INSERT INTO Position/Transaction without a column list in src (grep)
- **Test:** CI: run the previous release's test:money-invariants against the migrated schema.

### ENG-39 [covered] Crash after intent insert, before any claim
- **Trigger:** Hook or planner inserts a PENDING intent, then the process dies
- **Expected:** The durable row is claimed by any live container when due; if past lateness or deadline it expires with its reason. Nothing is lost silently.
- **Plan:** I4 (plan:36), §4.5 (plan:241-247)
- **Evidence:** src/lib/server/locks.ts:4-7 (DB state is committed or rolled back atomically; a dead process holds nothing)
- **Test:** test:house-bot-engine: insert PENDING, restart the engine instance: it fires once when due.

### ENG-40 [covered] Crash inside placeHouseBet before commit
- **Trigger:** Process killed while holding wallet:<bot> and market:<id> before COMMIT
- **Expected:** PG rolls back every write and releases the advisory locks; the intent stays CLAIMED until claimedUntil, then is reclaimed and fires under the same hb:<intentId> key. Balance, pool and ledger unchanged by the dead attempt.
- **Plan:** H4 markPlaced (plan:202), §4.5 (plan:241-251)
- **Evidence:** src/lib/server/locks.ts:124-144 (one tx, auto-released on rollback); src/lib/server/ledger.ts:69-75 (money writes join the lock tx)
- **Test:** test:house-bot-money: abort inside withMoneyTx after the debit: trial balance ties, intent CLAIMED, re-fire gives one position.

### ENG-41 [covered] Per-container rate buckets: holder and bot share bet.place
- **Trigger:** Holder betting from his phone while the bot fires on the same container
- **Expected:** The bot's rate_limited result backs off (PENDING). Two in an hour send one 'holder contention' alert (DB counter). The holder's own bets are never refused because of the bot: min gap ≥ 20s means at most 3 bot tokens a minute against a 30-token burst refilling 10 a minute.
- **Plan:** Mapper rate_limited (plan:258), min gap (plan:322)
- **Evidence:** src/lib/server/rate-limit.ts:95 (bet.place capacity 30, refill 10/min); src/lib/server/market-service.ts:915-919 (synchronous per-container bucket)
- **Test:** test:house-bot-engine: drain the holder bucket, fire: PENDING with backoff; second hit in the hour gives one alert.

### ENG-42 [covered] Redis down or unconfigured
- **Trigger:** REDIS_URL unreachable (production has Redis inert today)
- **Expected:** The engine is unaffected (it uses no Redis). The bet path keeps its in-memory bucket. The console's notification:new refresh may not reach another container, and RefreshPoller covers it. The kill switch works.
- **Plan:** §8 Live state (plan:410-412)
- **Evidence:** src/lib/server/event-bus.ts:15-27 (Redis fan-out additive, fail-open); src/lib/server/admission.ts:36-42 (no Redis on the bet path); docs/POLISH-BACKLOG.md:211-213 (Redis inert in production)
- **Test:** `test:redis-failopen` §N (`N.1`–`N.6`), written 2026-09-20. ~~scripts/redis-failopen.test.mts extension~~ — the extension this row named was never written (0 hits for `house-bot` in the suite's 700 lines) while the row read `[covered]`. §N now sweeps the **49** house-bot modules of `src/lib/server/house-bot/` and `src/lib/house-bot/` for a DIRECT `redis`, `ioredis` or `event-bus` import and prints that population, because an absence over an empty file list passes on every build. `N.3`–`N.3d` plant four real import shapes into a copy of `engine.ts` and require each to be reported; `N.5` proves the same detector finds `event-bus.ts:31`'s real Redis import, so the zero is an absence it could have broken. ⚠️ SCOPE: the DIRECT import only — `N.6` asserts the transitive path `emitters.ts → notification-service.ts → event-bus.ts → redis.ts` EXISTS and is ALLOWED, which is what this row's own Expected permits.

## console-ops (45)

### CA-01 [gap] A money or count field on the rules or limits form silently changes the value by a factor of 10 or 100, flips its sign, or empties it when the owner types or pastes a decimal, a minus sign, an exponent or non-ASCII digits.
- **Trigger:** Owner pastes "10,000.50" into Stake max, types "1.5" into Min gap, types "-500" into Balance floor, pastes "2e5", or pastes Arabic-Indic or full-width digits ("٣٠٠٠", "１０００").
- **Expected:** No field ever changes the size of what was typed. These are accepted and normalised, with an echo under the field ("= TZS 10,000"): "TZS 10,000", "Tsh 10,000", "10 000", "10,000", "10000". These are refused, the typed text stays visible, the field turns red and focus stays in it: "10,000.50" or "1.5" → "Whole shillings only — decimals are not allowed."; "-500" → "Must be 0 or more."; "2e5" → "Digits only." Unicode decimal digits are converted to 0-9 and echoed. The server parses the raw string with the same function and returns the same `field` error if the client is bypassed. Nothing saves while any field is refused.
- **Plan:** §5 Rules and limits; §8 Visual rules (kit controls); §12 test:house-bot-rules
- **Evidence:** src/components/ui/input.tsx:42-52 — sanitizeNumericInput strips [^\d.] and, for whole-number fields, deletes every '.': "10,000.50" becomes "1000050" and "1.5" becomes "15"; a minus is dropped unless allowNegative is set; JS \d is ASCII-only, so "٣٠٠٠" becomes "". :86 any inputMode numeric/decimal turns this on. :96-101 the value is replaced before the page's onChange runs. :156 onPaste/onBeforeInput pass through to the <input>. DurationInput reuses the sanitiser (src/components/ui/duration-input.tsx:21,107-110).
- **Fix:** Plan §5: add a pure `parseWholeAmount(raw)` in src/lib/house-bot/rules.ts, used by both client and server. It strips a leading TZS/Tsh plus spaces, commas, underscores and apostrophes; maps \p{Nd} digits to ASCII; and refuses '.', '-', 'e' or any other character with a named code. Plan §8: every house-bot numeric field is a `HouseAmountField` wrapper whose onPaste/onBeforeInput handler refuses input it would otherwise strip, keeping the previous value and setting the inline error. No kit change is needed. The server never calls Number() on FormData.
- **Test:** test:house-bot-rules parse table: "TZS 10,000"→10000; "10 000"→10000; "10,000.50"→REFUSED(decimal); "1.5"→REFUSED; "-500"→REFUSED(negative); "2e5"→REFUSED; "٣٠٠٠"→3000; "" and "   "→UNSET. red:house-bot-console mutation: switch the field back to bare Input sanitising; the assertion "10,000.50 is never saved as 1000050" must fail.

### CA-02 [gap] Empty, whitespace-only, zero and very large values on caps and limits: 'not set' is confused with 0, or a huge value reaches the database and comes back as a generic server error.
- **Trigger:** Owner clears Daily loss and saves; types 0 into Stake min or Balance floor; types 99999999999999 into Daily stake or global Open exposure.
- **Expected:** Empty or whitespace means Not set (NULL). The field shows "Not set — this bot cannot bet". The save succeeds (a bot may be saved incomplete) but Start stays refused with {field, href}. "0" is a real value: accepted where the minimum is 0 (Balance floor, closeness %, no-react zone) and refused where it is not (Stake min: "At least TZS {PLATFORM_MIN} — the platform minimum", taken from the payout constants, never a literal). Anything above a field's maximum is refused on that field, e.g. "At most TZS 1,000,000,000". A DB overflow or constraint error can never reach the owner as "Server error". Saved values render with thousands separators.
- **Plan:** §2 HouseBot typed caps / HouseBotControl global caps; §5 cap tables
- **Evidence:** Plan §2 says 'Typed caps (NULL = not set)' but gives no column type, and §5 gives no upper bound for capDailyStakeTzs, capOpenExposureTzs or the gCap* limits. Money columns platform-wide are Decimal(18,2) (prisma/schema.prisma:583,609,1783), so the column would not enforce whole TZS. src/lib/client/run-admin-action.ts:31-32 turns any thrown DB error into "Server error — nothing may have applied. Refresh before retrying." src/components/ui/duration-input.tsx:52-55 and :99-104 clamp silently instead of refusing.
- **Fix:** §2: declare every cap column as BigInt or Decimal(18,0), with CHECK (col IS NULL OR col >= 0). §5: add a Max column to every row (TZS caps ≤ 1,000,000,000; counts as in their tables; seconds ≤ 86,400). validateHouseBotRules/validateHouseBotLimits return UNSET separately from 0, and return {field, error} for below-min and above-max.
- **Test:** test:house-bot-rules: every field × {"", " ", "0", min, max, max+1, 2^31, 2^63} gives the exact field and message. PG plus memory twin round-trip the max value. The console action with 2^63 returns a field error and does not throw.

### CA-03 [gap] The owner's explicit requirement: when a user changes his password, every session of that account must require a new sign-in with the new password. The bot must also pause at that moment, not at its next bet.
- **Trigger:** The holder of ACTIVE Bot A changes his password in Account settings (or uses a reset link, or support issues a temporary password) while signed in on two devices. Separately, the Owner changes his own password while a console tab is open.
- **Expected:** Holder: the change succeeds and every session of that account is revoked at once. The device that made the change goes to /auth/login with "Your password was changed. Sign in with your new password." (en/sw/zh). The other device gets the existing signed-out explanation on its next request. In the same request, not at the next fire, Bot A becomes AUTO_PAUSED(PASSWORD_CHANGED) and its PENDING/CLAIMED intents become CANCELLED. Admins get bell + email: "Bot A paused — the holder changed his password at 14:03 EAT. Re-verify with his new password to start again." ~~The holder gets his notice.~~ The console strip reads "Auto-paused · password changed 14:03 EAT", and Re-verify is the only way back; only the NEW password passes. Owner: all owner sessions are revoked. The console tab's next press or refresh goes to /auth/admin?next=<page> with "Your password was changed — sign in again", then to TOTP verify (the cookie was bound to the old session), then back to the page with any unsaved draft restored (CA-06).
- **Plan:** I9; §3 sanctioned player-path changes; §4.6 house_consent_stale; F6
- **Evidence:** src/lib/server/password-reset.ts:324-336 changePassword writes the hash, audits and calls alertPasswordChanged, and revokes nothing. The same holds for consumeResetToken (:240-252) and adminResetPassword (:268-282). src/app/profile/account/actions.ts:74-85 returns the service result unchanged. src/lib/server/session-registry.ts:103-106 revokeUserSessions exists and is already used for suspension (src/app/admin/players/[id]/actions.ts:122) and role changes (src/app/admin/staff/actions.ts:37-39). src/lib/server/session.ts:141-170: a missing registry row signs the device out. src/lib/server/admin-guard.ts:52: the TOTP cookie is bound to the sessionId. Plan §4.6 auto-pauses on house_consent_stale only when a bet fires (H2).
- **Fix:** Add sanctioned change (l) to plan §3: one `onPasswordWritten(userId, method)` called right after db.user.update at password-reset.ts:242, :271 and :326. It (1) awaits revokeUserSessions(userId), and (2) dynamically imports house-bot/control.autoPauseIfLive(userId, 'PASSWORD_CHANGED'), which is idempotent and uses the same auto-pause path as §4.6. changePasswordAction returns {ok:true, signedOut:true}, and the client calls window.location.assign('/auth/login?reason=password_changed'). Add the copy to i18n-dict in en/sw/zh. F6: the pause is immediate. Record the platform-wide sign-out behaviour as an owner ruling in the COMPLIANCE entry.
- **Test:** test:house-bot-designation: changePassword on an ACTIVE bot holder → registry row gone, getSession null for both cookies, bot AUTO_PAUSED(PASSWORD_CHANGED) with zero fires, exactly one admin alert (AlertOnce), re-verify with the old password refused and counted, new password accepted. The same assertions for consumeResetToken and adminResetPassword. New key test:password-change-signout for non-bot users. red:house-bot-console: removing revokeUserSessions must fail.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no house-bot notice (D19c; C4 ruling 149); the platform-wide sign-out, the pause and the admin alert stand. Coverage gate: partly struck by D19.

### CA-04 [gap] The owner working inside /admin/desk never sees admin bell alerts, and the plan's 'notification:new triggers an immediate refresh' can never fire, because the console mounts neither a bell nor the SSE stream.
- **Trigger:** While the owner is on ?tab=limits, the engine auto-pauses Bot A (holder self-excludes), or the planner switches the master OFF (GLOBAL_LOSS_STOP), or a deposit lands on an ACTIVE holder's account.
- **Expected:** The strip shows the new state within ~5 s over SSE, or within 20 s by polling as fallback. A polite live region announces once: "Bot A auto-paused: self-exclusion (14:03 EAT)". A chip on the strip, "3 new house-bot alerts", links to ?tab=history (money events link to /admin/transactions). Unsaved form input is never lost. Email still arrives as §7 says. The same bell rows are visible on the player-side bell.
- **Plan:** §8 Live state; §7 Notifications
- **Evidence:** src/components/admin/admin-shell.tsx:291-293: "No notification bell here — the platform's main bell (in AppShell's top bar) is the single notification surface". src/components/layout/app-shell.tsx:63-65 returns bare children for /admin, so neither TopAppBar nor LazyEventStream (:18-20) mounts in the console. src/lib/use-event-stream.ts:22-27 maps notification:new to window event 50pick:sse:notification. The payload carries kind (src/lib/server/notification-service.ts:151-158).
- **Fix:** Plan §8 Live state: the house-bots strip calls useEventStream() itself and listens for 50pick:sse:notification where detail.notification.kind === 'HOUSE_BOT'. On a match it re-reads the read-only status action (CA-23) and, only when no form is dirty, dispatches 50pick:refresh. It keeps an unread HOUSE_BOT count chip. §7: state that admins see bell rows on the player-side bell and that email is the channel while they are in the console. Adding a global console bell is out of scope for this build (files owned by the parallel session).
- **Test:** test:house-bot-console source pin: the strip imports useEventStream and filters kind HOUSE_BOT. Unit test of the listener: HOUSE_BOT → status re-read plus refresh when clean; other kinds ignored; dirty → status re-read only, no router.refresh.

### CA-05 [gap] A deploy while a house-bot page is open: the first save posts an old Server Action id. The admin runner catches the error, so the once-per-build auto-reload never runs, and the owner sees a raw technical error.
- **Trigger:** Owner fills in the rules form, or reaches wizard step 'review', a deploy lands, and he presses Save or Designate.
- **Expected:** Overlay titled "50pick was updated", body "This page is from the previous version, so nothing was saved. Your changes are kept. Press Reload, then save again.", primary button "Reload". Reload writes a draft of every field except passwords to sessionStorage, then reloads. After the reload a Callout says "We restored the changes you had not saved before the update. Check them and press Save." with a Discard link. In the wizard, label and note come back; the password field is empty with "Enter the password again — it is never kept". If rulesVersion or limitsVersion moved meanwhile, the conflict flow runs (CA-20). Nothing is replayed automatically.
- **Plan:** §8 Feedback (agents runner); design-C 'deploy mid-form reloads once' claim
- **Evidence:** src/lib/client/run-admin-action.ts:22-33 catches every non-redirect throw and returns "Server error — nothing may have applied. Refresh before retrying. (<message>)". Next 16 throws UnrecognizedActionError "Server Action \"<id>\" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action" (node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js:74-81). The once-per-build reload exists only in the error boundary (src/components/ui/route-error.tsx:91-102), which a caught error never reaches. docs/TRAPS.md:9-41. scripts/deploy-skew.test.mts never mentions runAdminAction (grep). Refresh on a dirty form raises the browser leave prompt (src/components/ui/unsaved-changes.tsx:404-414).
- **Fix:** runAdminAction (an additive change): if e.name === 'UnrecognizedActionError' or the message matches /was not found on the server/, return {ok:false, code:'STALE_BUILD', error:<copy above>}. Existing call sites still just render the error text. Add src/lib/house-bot/draft.ts: sessionStorage key hb:draft:<route>:<botId|userId>:<version>; drops any key matching /password/i; 30-minute TTL; cleared on successful save, Discard, or Remove. The house-bots runner renders STALE_BUILD with a Reload button.
- **Test:** test:deploy-skew new arm: runAdminAction on a rejected UnrecognizedActionError → code STALE_BUILD, no docs URL in the text. test:house-bot-console: fuzzed field names prove the draft never stores a password key; restoring over a changed version routes to the conflict state.

### CA-06 [gap] The admin TOTP cookie (8 h) or the session (24 h idle / 7 d absolute) expires while the owner is mid-form. The action's redirect navigates away and throws away every edit with no prompt.
- **Trigger:** Owner verified TOTP at 09:00 and starts editing Bot A's rules at 16:55. At 17:01 he presses Save. Or the laptop tab sat idle for more than 24 h.
- **Expected:** Pressing Save never loses edits. Before any write the server returns {ok:false, code:'REAUTH_TOTP', href:'/admin/totp-verify?next=<this URL>'}. The client stores the draft (no passwords) and shows a Modal: "Your 2-step check has expired. Verify again to save — your changes are kept." with a "Verify now" button. After verifying, the owner returns to the same URL, the draft is restored, and he presses Save again; nothing auto-submits. For an expired or idle session: code REAUTH_LOGIN with href /auth/admin?next=<this URL>. On the consent step or the Re-verify modal the password is cleared, with "Enter the holder's password again — it is never kept."
- **Plan:** §6 'each starts with requireOwner'; §8 Feedback; F1 wizard
- **Evidence:** src/lib/server/rbac-guard.ts:208-224 requireOwner → requireAdminTotp. src/lib/server/admin-guard.ts:56-72 redirects to /admin/totp-verify?next=<x-href> (x-href is set at src/proxy.ts:217). src/lib/client/run-admin-action.ts:28 rethrows NEXT_REDIRECT, so the client navigates. src/components/ui/unsaved-changes.tsx:417-436 intercepts only <a> clicks, so a programmatic navigation gets no prompt. src/lib/server/totp-cookie.ts:3 sets 8 h. src/app/admin/layout.tsx:143-159: the sliding refresh is best-effort and is skipped in read-only render contexts. rbac-guard.ts:210 redirects to "/auth/admin" with no next. src/lib/server/session.ts:175-197: absolute 7 d, idle 24 h. src/app/admin/totp-verify/actions.ts:74-75 honours next.
- **Fix:** Add softRequireOwner(action) to rbac-guard.ts, modelled on softRequireStaff (:118-140): it returns {ok:false, code:'REAUTH_TOTP'|'REAUTH_LOGIN'|'NOT_OWNER', href} and never redirects or throws, and keeps the SECURITY audit on role refusal. Every house-bot action uses it (§6 wording changes). The client runner maps the codes to the modal above and uses the draft module from CA-05.
- **Test:** test:house-bot-console: with the TOTP cookie missing, each action returns REAUTH_TOTP, does not throw NEXT_REDIRECT, and changes zero HouseBot/HouseBotEvent/HouseBotControl rows. With no session → REAUTH_LOGIN whose href carries next. red:house-bot-console: swapping back to requireOwner must fail the 'no redirect on save' assertion.

### CA-07 [gap] The owner signs in on a second device, and the platform's single-active-session rule silently revokes the console tab on the first device. That tab's next save is lost.
- **Trigger:** Owner has the rules form open on his laptop, signs in on his phone to check a notification, then goes back to the laptop and presses Save.
- **Expected:** The laptop's save returns REAUTH_LOGIN (CA-06) with "You signed in on another device, so this one was signed out. Sign in again — your unsaved changes are kept on this device." The draft is restored after sign-in and TOTP. Nothing is written. The audit trail keeps session.revoked_by_newer_login.
- **Plan:** §8 Feedback; §6 owner actions
- **Evidence:** src/lib/server/session.ts:132-170: one active session id per user; a different id means revoked (audit session.revoked_by_newer_login); getSession returns null. src/lib/server/rbac-guard.ts:209-210 then redirects to /auth/admin with no next. src/lib/client/run-admin-action.ts:28 follows the redirect.
- **Fix:** Same softRequireOwner and draft mechanism as CA-06. REAUTH_LOGIN copy reads kp_revoked / the registry reason to choose between 'signed in on another device' and 'session expired'. Add this to HOUSE-BOTS.md §10 runbook: 'use one device for console work'.
- **Test:** test:house-bot-console: swap the registry row to another session id → action returns REAUTH_LOGIN with the other-device reason, zero writes.

### CA-08 [gap] A deep link to an unknown, mistyped or malformed bot id shows the player-facing 404 with player recovery links instead of a console page.
- **Trigger:** Owner opens /admin/desk/hb_doesnotexist, or an old email link, or /admin/desk/%27%3B from a mangled paste.
- **Expected:** The console sidebar and top bar stay, with AdminPageHead "House bots" and an empty state "No house bot with that id" / "It may have been mistyped. Removed bots still open from the roster." plus a primary "Back to house bots" (→ /admin/desk?tab=roster). A malformed id (not matching the hb_ id shape) renders the same state without a DB query or thrown error. A REMOVED bot still renders read-only as the plan says, with "Removed on {date} by {name}".
- **Plan:** §8 Routes ('An unknown bot gives notFound()')
- **Evidence:** src/app/admin contains error.tsx but no not-found.tsx (directory listing), so the nearest boundary is src/app/not-found.tsx:80-119: the player 404 with Home and markets recovery links, outside the console chrome. Precedent src/app/admin/agents/[id]/page.tsx:47 calls notFound() into that same page.
- **Fix:** §8: add src/app/admin/desk/[id]/not-found.tsx (AdminPageHead + AdminTableEmpty + Back link). page.tsx checks the id shape before querying. Keep the matching loading.tsx skeleton order.
- **Test:** test:house-bot-console: route files include [botId]/not-found.tsx; the view renders the exact copy; a malformed id makes no store call (spy). qa:house-bots-visual fixture of the not-found view at 360 and 1280.

### CA-09 [gap] On the consent step or the Re-verify modal, the browser password manager autofills the OWNER's saved 50pick password (same origin), or offers to save the holder's password under the owner's login.
- **Trigger:** Owner uses Chrome, Safari or 1Password with his /auth/admin credentials saved, and opens step=consent or Re-verify.
- **Expected:** The field is empty on open, never autofills, and never triggers a 'Save password?' prompt. Label: "Account holder's password (not your own)". Help: "Checked once against his account and never stored." If the owner pastes his own password by mistake, it counts as one failed attempt against the holder, with the attempts-left sentence.
- **Plan:** F1 step 3 Consent; §6 Password check; §8 Modal forms (Re-verify)
- **Evidence:** src/components/ui/password-input.tsx:101-103 spreads {...rest} and renders type="password" with no autoComplete default, so the call site must supply it. The admin sign-in (/auth/admin) is on the same origin, so saved credentials match this site.
- **Fix:** §6/F1: consent and re-verify use PasswordInput with autoComplete="new-password", name="holderSecret" (not 'password'), data-1p-ignore, data-lpignore="true", data-bwignore, and no username/email input in the same <form>. The Modal/consent forms use method-less client submit, never native form POST.
- **Test:** test:house-bot-console source pin: both files set these attributes and render no sibling username field.

### CA-10 [gap] The account picker cannot find a player by the phone formats Tanzanians actually type, and short, empty, huge or staff result sets have no defined behaviour.
- **Trigger:** Owner types "0712 345 678", "255712345678", "+255 712-345-678" or "712345678"; types one character; searches "a" (thousands of matches); searches a staff member's name; pastes "Player #A3F2K8".
- **Expected:** Any of +255 712 345 678 / 255712345678 / 0712345678 / 712345678, with spaces or dashes, finds +255712345678. Under 2 characters: idle hint "Search by name, phone, email or account id" and no request. Loading: spinner and aria-busy. No match: "No account matches '0712 345 678'.". More than 10: the 10 most recent sign-ins plus "Showing 10 — type more to narrow". Staff and AGENT rows appear greyed with the reason ("Staff account — cannot be designated"). Closed or erased accounts appear greyed with "Account closed". Live bots show "Already Bot A · Open". Phones are always masked +255••••78. Error: "Search failed. Try again." The handle paste resolves as the plan says. A polite count reads "6 accounts · 2 cannot be designated".
- **Plan:** §8 UserPicker; §6 searchHouseBotCandidatesAction
- **Evidence:** src/lib/search/fields.ts:60-64 phone→phoneE164 as a text 'contains' field, :80 default columns. src/lib/search/prisma-where.ts:33 { contains, mode:'insensitive' } on the raw term, so "0712345678" never matches "+255712345678". src/lib/phone-normalize.ts:52-57 normalizeTzLocalDigits already produces the 9-digit local part. src/lib/server/validators.ts:20-30 tzPhone accepts +255, 255 and 0 prefixes. src/lib/phone-normalize.ts:95 maskPhone.
- **Fix:** §8 UserPicker: when q contains at least 6 digits and only phone characters (+, digits, spaces, dashes, parentheses), replace the term with phone:<normalizeTzLocalDigits(q)> matched as phoneE164 contains. Take 11 rows to compute hasMore. Add the closed/erased ineligible reason to houseBotEligibility's picker context.
- **Test:** test:house-bot-console table against the memory twin and PG: 6 phone spellings → same id; "a" → 10 rows + hasMore; 1 char → no DAL call; staff row eligible:false with reason; closed account greyed.

### CA-11 [gap] Lowering a limit below what bots have already used today: the save goes through with no warning, then the planner switches house bots off or auto-pauses a bot 15 seconds later, or every bet silently skips for the rest of the day.
- **Trigger:** Today's settled house loss is TZS 120,000 and the owner lowers global Daily loss to 100,000. Or Bot A has staked 480,000 today and he lowers its Daily stake to 400,000. Or he lowers global Open exposure below the current open house stakes.
- **Expected:** Lowering is never refused, because it reduces risk. The form computes consequences from fresh reads and shows them in a warning Callout before Save, then again in a ConfirmDialog: "Today's settled loss is TZS 120,000. Saving a TZS 100,000 limit switches house bots OFF within 15 seconds." / "Bot A has staked TZS 480,000 today — it will place no more bets until tomorrow (00:00 EAT)." / "Open house stakes are TZS 350,000 — no new bets until they settle below TZS 300,000." Success repeats the consequence. The planner then switches OFF with offCause GLOBAL_LOSS_STOP (or pauses with DAILY_LOSS_STOP) and the usual alerts go out. Usage bars show over-limit in the warning tone.
- **Plan:** §3 Loss (planner every 15 s); F2 Configure; §5 global limits
- **Evidence:** Plan §3: 'Auto-pause and master OFF fire only on realised ≥ cap (planner, every 15s)'. F2 lists only cross-field refusals; no consequence preview is specified for usage already above the new value.
- **Fix:** rules.ts: add previewLimitConsequences(input, todayBook, openExposure) → warnings[]. The save actions accept confirmConsequences:true and return {ok:false, code:'CONFIRM_CONSEQUENCES', data:{warnings}} if the warnings changed since render. The forms render the Callout and the dialog.
- **Test:** test:house-bot-rules: preview returns each warning at usage below/equal/above the new value. test:house-bot-engine: after such a save the planner switches OFF within one pass with offCause GLOBAL_LOSS_STOP and one alert.

### CA-12 [gap] Master ON with no active bot, Start while the master is OFF, and removing the last bot while ON: the console shows 'On' or 'Active' when nothing can bet, with no explanation.
- **Trigger:** Owner switches ON with 0 bots or only paused bots; starts Bot A while the master is OFF; removes the last ACTIVE bot while the master is ON.
- **Expected:** ON is allowed (so he can prepare). The ON modal adds "No bot is active yet, so nothing will be placed until you start a bot." Strip when ON with 0 active: "On · no active bot — nothing will be placed" (warning tone) with a link to the roster. Start with master OFF is allowed; success reads "Bot A started. House bots are switched off, so it will not bet until you switch them on →" linking to the switch. That bot's strip reads "Active · waiting for the master switch". Removing the last active bot while ON: "Bot A removed. House bots are still on, but no bot is active." KPI "Active bots 0/5". Engine-stale Callout only when ON and at least one bot is ACTIVE.
- **Plan:** F3 Go live; F8 Remove; §8 Live state/strip copy
- **Evidence:** Plan F3: ON is disabled only while a global cap is unset. Start's refusal list has no master-OFF row. §8 defines only 'House bots are off…' and the engine-health Callout; F9 copy is for OFF only. There is no strip state for ON × 0 active bots.
- **Fix:** §8: add a strip state table covering (enabled × activeBots 0/≥1 × engine healthy/stale × offCause) with copy and tone for each cell. The action success data returns {masterEnabled, activeBots} so copy is composed from facts.
- **Test:** test:house-bot-console: a view render per state-table cell with exact copy; the visual harness includes the 'On · no active bot' and 'Active · waiting for the master switch' fixtures.

### CA-13 [gap] Start or master ON is pressed while the rules or limits form holds unsaved edits: the bot starts on the OLD saved rules and the owner believes his edits are live.
- **Trigger:** On ?tab=rules the owner changes Stake max from 10,000 to 5,000, doesn't save, and presses Start in the strip. Or he edits global limits and presses ON.
- **Expected:** While that page's form is dirty, Start and ON stay enabled but open a dialog: "You have unsaved changes on Rules. Start uses the saved rules (stake max TZS 10,000), not your edits." with buttons "Save and start" (runs save, then Start only if the save succeeds), "Start with saved rules", and "Cancel". The Start summary always states it is the SAVED rules.
- **Plan:** §6 startHouseBotAction ConfirmDialog + summary; F3; §8 Feedback
- **Evidence:** Plan §6: the Start confirm shows the rule summary (from saved rules). src/components/ui/unsaved-changes.tsx:417-436 guards only link navigation, not other buttons on the same page. Plan §8 disables the poller while dirty but nothing links the strip actions to form dirtiness.
- **Fix:** §8: the strip reads a page-level dirty context, provided by PendingChangesBar registration or a HouseBotFormContext, and shows the dialog above. Save-and-start is sequential, and Start is skipped if the save is refused.
- **Test:** test:house-bot-console: strip view with dirty=true renders the three-choice dialog; the save-refused path never calls startHouseBotAction (spy).

### CA-14 [gap] Bot labels collide or render deceptively: case and whitespace duplicates, look-alike Unicode, right-to-left override or zero-width characters that corrupt feed sentences, emoji length mismatches, and reuse of a removed bot's label.
- **Trigger:** Owner names a bot "bot a" while "Bot A" exists; " Bot A "; "Bot​A"; "‮A toB"; a 32-character emoji label; "Bot A" again after the first Bot A was removed; two admins designate "Bot B" at the same moment.
- **Expected:** Normalised before validation: NFC, trimmed, inner whitespace collapsed. Refused on field label: control, bidi-override (U+202A–202E, U+2066–2069) and zero-width (U+200B–200D, U+FEFF) characters → "Letters, numbers, spaces and - _ . # ' only." Length is counted in code points after normalisation, 2–32: "2 to 32 characters." Uniqueness is case-insensitive among non-REMOVED bots: "Another bot is already called 'Bot A' (active). Choose a different label." A removed bot's label may be reused; History, the feed and alerts show "Bot A (removed 20 Sep)" for the old one. The concurrent duplicate is a unique violation mapped to the same field error, never "Server error".
- **Plan:** §2 HouseBot label (2–32, unique among live bots); §8 Activity feed copy
- **Evidence:** Plan §2 states 'label (2–32, unique among live bots)' with no normalisation, character set, case rule or measuring unit. The feed interpolates the label into sentences (§8 'House bot "Bot A" countered …'). src/components/ui/input.tsx:156 passes maxLength to the DOM, which counts UTF-16 units.
- **Fix:** rules.ts normaliseLabel() + LABEL_RULE shared by client and server. §2: partial unique index on lower(label) WHERE status<>'REMOVED' (hand-written DDL). designate maps P2002 on that index to field label.
- **Test:** test:house-bot-rules table of the triggers → exact outcome. test:house-bot-designation: concurrent same-label designate → one bot plus one field error. red: dropping lower() from the index check must fail.

### CA-15 [gap] The typed confirmation words (BOTS ON, REMOVE) are normalised differently on client and server, so the modal looks armed but the server refuses, or the reverse.
- **Trigger:** Owner types "bots on", " BOTS ON ", "BOTS  ON" (double space), or "remove" into the modal.
- **Expected:** One normaliser, trim + collapse inner whitespace + uppercase, is exported from constants.ts and used by both the modal's arming check and the server. "bots on", " BOTS ON " and "BOTS  ON" all arm and all pass. "BOTSON" or "BOT ON" never arm, with the hint "Type BOTS ON to continue". If the server still refuses a bypassed client: inline error on field confirmWord, "Type BOTS ON exactly to switch house bots on.", with the modal left open.
- **Plan:** §6 'The server re-checks every typed word from the shared constants'; §8 Modal forms
- **Evidence:** src/components/ui/modal.tsx:466: ConfirmModal arms on typed.trim().toUpperCase() === gateWord.toUpperCase() and does not collapse inner spaces. The plan builds ON and Remove as custom Modal forms (§8), so their arming code is new, and §6 does not specify normalisation.
- **Fix:** constants.ts: export normaliseTypedWord(s) and isTypedWord(s, WORD). Both modal forms and actions.ts import it; no inline comparisons.
- **Test:** test:house-bot-console: identical truth table for client arm and server check; source pin of no other toUpperCase comparison in the house-bots folder.

### CA-16 [gap] Seconds-based rule fields cannot use DurationInput (minutes only, clamps silently, 36 px), yet the plan lists it among the kit controls, so values are either impossible to enter or silently altered.
- **Trigger:** Owner sets COUNTER delay 5–600 s, no-react zone 30 s, min time to cutoff 20 s or FILL lead 45 s; or types 50,000 minutes into 'Skip polls closing within' (max 43,200).
- **Expected:** Seconds fields are numeric Inputs with trailing "s" at the kit's 40 px height, with explicit field errors ("5 to 600 seconds"). Minute-scale poll fields may use DurationInput, but an out-of-range entry shows the field error "At most 30 days (43,200 minutes)" instead of snapping silently. The echo under the field ("= 1d 6h") matches what will be saved. Every control on the form is at least 40 px tall.
- **Plan:** §5 COUNTER/FILL/Guards rows; §8 Visual rules 'Kit controls only: … DurationInput'
- **Evidence:** src/components/ui/duration-input.tsx:1-16 emits MINUTES only; :52-55 clampMinutes and :99-104 emit clamp to min/max without an error; the size prop defaults to "sm" (:70-80) and :139 renders sm at h-[36px]. src/components/ui/input.tsx:67 renders sm at var(--h-control-sm) (40 px).
- **Fix:** §8: 'DurationInput only for minute-scale poll fields, size="md", with min/max equal to the validator bounds and an onChange wrapper that compares raw typed minutes to the clamped value and sets the field error. Every *Sec field is HouseAmountField with trailing "s".'
- **Test:** test:house-bot-console source pin: no DurationInput bound to a field whose name ends in Sec; qa:house-bots-visual control-height ≥ 40 assertion across the rules form.

### CA-17 [gap] The owner prints or needs a record of a bot's money and activity for out-of-band reimbursement or the Board, and the console has no print styling or export.
- **Trigger:** Owner presses Ctrl+P on /admin/desk/<id>?tab=money, or asks for the holder's movements since designation to settle reimbursement.
- **Expected:** No print layout is promised. ~~The money and activity tabs offer "Download CSV" for the current filters: EAT timestamps, txn id, type, amount, house-marked flag, intent id, market, outcome, and a header row naming the bot, holder masked phone, range and generated-at.~~ As a minimum, if he prints, the console sidebar, top bar, PendingChangesBar and overlays are hidden and tables print unclipped.
- **Plan:** §8 Console UX (money/activity tabs); §12 Verification
- **Evidence:** No @media print rule exists in src/app/globals.css (grep), so printing reproduces the sidebar, top bar and the fixed PendingChangesBar (src/components/ui/unsaved-changes.tsx:243), and ScrollX tables clip. src/lib/server/admin-guard.ts:23-28,46-54: checkAdminTotp is the non-throwing check intended for download route handlers.
- **Fix:** ~~§8: add an owner-only route handler /admin/desk/[id]/export?tab=money|activity&... guarded by session + ADMIN + checkAdminTotp (403 on failure), with an ADMIN audit house_bot.exported.~~ Add print:hidden to the house-bots strip, bars and overlays only (don't touch the shell files owned by the parallel session). ~~Owner decides whether CSV is wanted in v1.~~
- **Test:** ~~test:house-bot-console: export as a non-owner → 403 plus SECURITY row; CSV header and columns pinned;~~ qa:house-bots-visual emulateMedia('print') screenshot shows no sidebar.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no per-bot CSV export and no `house_bot.exported` writer for it (C5-SPEC ruling 213; Commit 7's console carries no results or P&L CSV); the print minimum is untouched by D20. Coverage gate: partly struck by D20.

### CA-18 [gap] The owner returns to a backgrounded tab (laptop lid, phone lock) and sees hours-old state (Active, engine OK) until the next 20 s poll, and SSE is paused while hidden.
- **Trigger:** Console tab hidden for 2 hours, during which Bot A auto-paused and the master switched off; the owner brings the tab to the front.
- **Expected:** On becoming visible, if more than 20 s have passed since the last refresh, the strip re-reads status immediately (and refreshes the page if nothing is dirty). Until the read returns, a small "Updated 12:04:31 EAT" stamp shows how old the strip is. An auto-pause or switch-off found this way is announced once.
- **Plan:** §8 Live state (RefreshPoller in the strip)
- **Evidence:** src/components/ui/refresh-poller.tsx:47-53 skips ticks while hidden and adds no visibilitychange listener, so after return the refresh can be up to intervalMs late. src/lib/use-event-stream.ts:55-59 does not connect while hidden.
- **Fix:** The house-bots strip adds a visibilitychange listener (local, no kit change) that calls the status action and dispatches 50pick:refresh when clean. Show the 'Updated' stamp.
- **Test:** Unit test with fake timers: visible after 21 s → one status read; after 5 s → none.

### CA-19 [partial] Double-click or double-tap on any house-bot button fires two requests. Rules save then refuses itself as stale, a mistyped password burns two lockout attempts, and ON can double-audit and double-alert.
- **Trigger:** On a slow phone the owner double-taps Save rules, Verify (wrong password), Switch ON, Start, Cancel intent or Designate.
- **Expected:** One server call per intentional press; the second press is ignored before React re-renders. The button shows a spinner with aria-busy. Save never produces a self-inflicted "changed since you opened it". A wrong password counts ONE attempt ("4 attempts left…"). A repeated ON, Start or OFF is an ok no-op with no second HouseBotEvent, audit row, bell or email ("Already on" / "Already active"). A repeated Designate returns "Already designated — open Bot A". A repeated Cancel returns "Already cancelled".
- **Plan:** §6 owner actions table; §8 Feedback 'buttons disabled while pending'; F8/F9 target-state
- **Evidence:** src/app/admin/agents/agents-client.tsx:31-43: the runner disables via useTransition pending, which only applies after a re-render. src/components/ui/button.tsx:72-73 disabled={disabled||loading}. src/lib/server/auth-service.ts:963-972: every failed verify increments failedLoginCount and the 5th locks for 30 min. Plan §6 specifies repeat semantics only for designate, Pause and Remove.
- **Fix:** House-bots runner: a useRef busy latch set synchronously on press and cleared in finally. Each press posts submitId (crypto.randomUUID). The server claims HouseBotAlertOnce key submit:<actorId>:<submitId> before any guarded work (for verify, before verifyPassword); on conflict it returns {ok:false, code:'DUPLICATE_SUBMIT'}, which the client ignores. §6: add 'repeat → ok no-op, no event/audit/alert' for ON, Start, Cancel.
- **Test:** test:house-bot-console: each action invoked twice concurrently with the same submitId → one HouseBotEvent, one audit row, failedLoginCount +1; rules save twice → second is DUPLICATE_SUBMIT, not STALE_VERSION.

### CA-20 [partial] Two ADMINs edit the same bot's rules or the global limits at once. The compare-and-set refusal has no defined message, and a refresh can quietly advance the version so the loser overwrites the winner.
- **Trigger:** Admin A and the Owner both open Bot A ?tab=rules. A saves Stake max 5,000. The Owner, still showing 10,000 and editing Daily loss, presses Save.
- **Expected:** The Owner's save is refused. A Callout above the form, not a vanishing toast: "Not saved — Admin A changed Bot A's rules at 14:03:12 EAT (Stake max). Your changes are still on this page." Buttons: "Compare" (per field: yours / theirs / before), "Keep theirs" (loads the saved rules, discarding his edits) and "Save mine anyway" (resubmits over the new version, audited with overwrote:{version, by}). The version the form submits is the one captured when the form loaded or last saved; a background refresh never advances it while dirty. The same flow applies to Limits ("Global limits were changed by…"). Engine writes never cause a conflict.
- **Plan:** F2; §6 saveHouseBotRulesAction / saveHouseBotLimitsAction (CAS)
- **Evidence:** Plan §6 specifies CAS on rulesVersion/limitsVersion, but no refusal payload, copy or resolution path. src/components/ui/unsaved-changes.tsx:342-378 useFormDirty re-baselines only on markSaved (:371-374), so if a form re-initialises from refreshed props the edits and the dirty flag drift apart.
- **Fix:** §6: CAS refusal returns {ok:false, code:'STALE_VERSION', data:{savedBy, savedAt, changedFields, current}} built from the latest RULES_SAVED/LIMITS_SAVED HouseBotEvent. The client holds baseVersion in state from load or successful save only. Add an overwrite path with an audit field.
- **Test:** test:house-bot-console: sequential saves with the same version → STALE_VERSION with changedFields; 'Save mine anyway' writes and audits overwrote; 50 engine writes between load and save → no conflict.

### CA-21 [partial] Write skew between a bot rules save (under the bot's wallet lock) and a global limits save (under house:control): each passes its cross-check against the other's old values, leaving a bot cap above the global cap.
- **Trigger:** At the same second, Admin A raises Bot A Stake max to 40,000 (global per-market is 50,000) and the Owner lowers global per-market to 30,000.
- **Expected:** The two saves run one after the other. The first commits; the second re-reads the other side inside its lock and responds on its own field: for the bot save "Not saved — the global per-market limit is now TZS 30,000 (changed by Ali at 14:03). Stake max must be at most TZS 30,000." with a "Use TZS 30,000" button; for the limits save, the CA-24 consequence dialog listing Bot A. The stored state never holds a bot cap above a global cap unless that consequence was confirmed.
- **Plan:** F2 'one rulesVersion-checked UPDATE under wallet:<botUser>'; §3 lock order / 'Control writes (ON, OFF, limits) take it briefly'
- **Evidence:** Plan F2 puts the rules save under wallet:<botUser>, while §3 puts limits writes under house:control. src/lib/server/locks.ts:164-169 and :126-144: each key is an independent pg_advisory_xact_lock, so the two saves do not block each other.
- **Fix:** F2: the rules save takes wallet:<botUser> → house:control (the same order as bets, so no deadlock) and reads control caps inside. The limits save takes house:control and reads all non-REMOVED bots' caps inside. Both return fresh-value errors.
- **Test:** test:house-bot-caps: 20 paired concurrent runs (rules raise + limits lower) → never both applied without the confirm flag; error field and value asserted.

### CA-22 [partial] One ADMIN pauses a bot while another saves its rules. The saver must not be refused, and his success message must not imply the bot is running.
- **Trigger:** The Owner presses Pause on Bot A at 14:03:00. Admin A, whose page still shows Active, saves new rules at 14:03:05.
- **Expected:** Pause succeeds immediately (target-state, no version check). The rules save also succeeds, since Pause does not touch rulesVersion. Admin A sees "Rules saved. Bot A is paused (by Ali at 14:03) — press Start when ready." and his strip updates to PAUSED(MANUAL) in the same refresh. The bot does not auto-start. History shows PAUSED then RULES_SAVED with actors.
- **Plan:** F8 Pause; F2; §6 table
- **Evidence:** Plan F8: Pause is 'never refused as stale'. §6: rules save is CAS on rulesVersion only, and engine and Pause writes never bump rulesVersion. The success copy of the rules save is not specified and would otherwise read from the stale page.
- **Fix:** §6: every action's success data returns {status, pauseReason, statusBy, statusAt}; the client composes copy only from that data.
- **Test:** test:house-bot-console: pause then save with the pre-pause rulesVersion → ok with data.status=PAUSED; the copy function pins the sentence.

### CA-23 [partial] Stale tab after an auto-pause: the plan turns the poller off while a form is dirty, so the strip keeps saying Active. Pause on an already AUTO_PAUSED bot returns a misleading 'Paused', and Start from the stale view gives an unexplained refusal.
- **Trigger:** Owner edits Bot A rules for 10 minutes; meanwhile the holder self-excludes and the engine auto-pauses Bot A. The owner presses Pause (or opens another tab and presses Start).
- **Expected:** The strip stays live even while dirty. A lightweight read-only status action runs every 20 s and on HOUSE_BOT SSE events without router.refresh. When status changes under a dirty form: warning Callout "Bot A was auto-paused at 14:03 (self-exclusion until 13 Oct). Your unsaved rule changes are kept." Pause on AUTO_PAUSED: "Nothing changed — Bot A was already auto-paused at 14:03 (self-exclusion)." Start on AUTO_PAUSED from a stale tab: refused with the cause and its way out ("Start is unavailable until 13 Oct — the holder is self-excluded"), then the strip refreshes. Save rules still succeeds.
- **Plan:** §8 Live state ('disabled while a form is dirty'); F6; F8
- **Evidence:** src/components/ui/refresh-poller.tsx:29-44: enabled=false registers no timer and no event listener. Plan §8: 'RefreshPoller … disabled while a form is dirty'. Plan F8 and §6: 'Pause … otherwise ok no-op' with no copy.
- **Fix:** §8: add getHouseBotStatusAction(botId?) (owner, read-only, returns status, reason, detail, versions, masterEnabled, engine beats). The strip polls it independently of dirty state; router.refresh only when clean. Pause/Start results carry data.noop plus the reason.
- **Test:** test:house-bot-console: Pause on AUTO_PAUSED → ok, noop:true, reason SELF_EXCLUDED; strip reducer shows the Callout when dirty and the status changed.

### CA-24 [partial] A global cap is lowered below existing bots' own caps, including ACTIVE bots. The plan refuses the save, forcing bot-by-bot edits in a hurry, and never says which bots conflict.
- **Trigger:** Owner lowers global per-market from 50,000 to 30,000 while Bot A (active) has Stake max 40,000 and Bot C (paused) has per-market 50,000.
- **Expected:** Recommended ruling: lowering a global cap is allowed, because it only reduces risk, and no bot is paused. Save opens a ConfirmDialog: "2 bots have caps above this limit: Bot A stake max TZS 40,000 (active), Bot C per-market TZS 50,000 (paused). Their bets will be capped at TZS 30,000. Save?" After saving, each affected bot's strip and rules tab show "Above the global per-market limit (TZS 30,000) — bets are capped at TZS 30,000 · Edit". The engine's stake clamp uses min(bot cap, global cap − house held on the market). REMOVED bots are ignored. Raising a bot cap above a set global cap stays refused on its field, with a "Use TZS 30,000" button. If the owner prefers the plan as written (refuse), the refusal must list every conflicting non-REMOVED bot with status, value and a link to its rules tab with that field focused.
- **Plan:** F2 ('checks every bot in the other direction'); §5 global limits rules; F5 step 9 stake clamp
- **Evidence:** Plan F2 and §5: 'open exposure ≥ every bot's per-market cap; per market ≥ every bot's stake max', with no conflict payload, copy or statuses. F5 names a 'Stake clamp' without its inputs. H3 already enforces house_cap_reached{GLOBAL_PER_MARKET} inside the locks, so money stays safe either way.
- **Fix:** Owner decision. Recommended amendment to F2/§5 as above: return data.conflicts[{botId, label, status, field, value}], define the clamp formula in §4.4, and add a per-bot warning row.
- **Test:** test:house-bot-rules: conflicts list includes ACTIVE/PAUSED/AUTO_PAUSED and excludes REMOVED; engine clamp test: a stake above the new global cap is placed at the capped amount, never refused.

### CA-25 [partial] Min/max and paired cross-field rules within a bot's own caps, and against a chain's own stake bounds, have no defined error field, copy or clearing behaviour.
- **Trigger:** Owner sets Stake min 5,000 above Stake max 3,000; Daily loss 300,000 above Daily stake 200,000; Per hour 90 with a 30 s gap; trigger range min above max; FILL jitter larger than lead minus min time to cutoff; Stake min 1,000 while a selected chain requires 2,000.
- **Expected:** Each pair has one rule, one field and one message shared by client and server: stakeMaxTzs "Must be at least the stake minimum (TZS 5,000)"; capPerMarketTzs "Must be at least the stake maximum"; capDailyStakeTzs "Must be at least the per-market cap"; capDailyLossTzs "Cannot exceed the daily stake cap (TZS 200,000)"; capOpenExposureTzs "Must be at least the per-market cap"; freqMaxPerHour "With a 30-second gap, at most 60 per hour"; freqMaxPerDay "Must be at least the per-hour limit"; the pool, trigger-range, opener-stake and delay ranges likewise; fill jitter "At most {lead − minTimeToCutoff} s"; global daily loss "Cannot exceed the global daily stake cap". Focus goes to the first erroring field in document order. Changing either field of a pair clears both. Chain bounds are a warning, not a refusal: "BTC 3-min needs at least TZS 2,000 — smaller stakes there are skipped."
- **Plan:** §5 ('Cross-field errors return field → focusFirstInvalid'); §4.4 STAKE_BELOW_MIN
- **Evidence:** Plan §5 lists the rules but not which field reports or the copy. src/lib/client/focus-first-invalid.ts:53-54 focuses the first [data-field] in document order. src/lib/server/updown-config.ts:1345-1351: per-chain stake bounds come from stakeBoundsFor(chain) and can exceed the platform bounds.
- **Fix:** rules.ts: export CROSS_FIELD_RULES [{id, fields, reportOn, message(values)}] and chainBoundWarnings(rules, chains); the form and validators consume only these.
- **Test:** test:house-bot-rules iterates CROSS_FIELD_RULES in both directions; each returns exactly its reportOn field and message; chain-bound warning appears only for included chains.

### CA-26 [partial] Max designated bots is lowered below the current count, or two admins designate the last free roster slots at once, possibly after one has already spent a lockout attempt on the holder's password.
- **Trigger:** 5 bots are designated and the owner sets Max designated bots to 3. Or the roster has 4 of 5 and two admins press Designate for two different accounts in the same second.
- **Expected:** Lowering below the count is refused on field maxDesignatedBots: "5 bots are designated (3 active, 2 paused). Choose 5 or more, or remove bots first." In the race, exactly one designation succeeds. The other gets, on the review step: "The roster is full (5 of 5). Remove a bot or raise 'Max designated bots' on Limits →". The roster-full check runs before the password is verified, so no attempt is spent when the roster is already full at submit.
- **Plan:** §5 'max designated bots 1–20, ≥ current count'; §6 eligibility 'roster full'; §6 designate
- **Evidence:** Plan §6: 'roster full' is a blocking row from a read in houseBotEligibility. Plan §2: the only uniqueness is per user (userId WHERE status<>'REMOVED'). No lock is named for count-then-insert, nor for the limits save of maxDesignatedBots.
- **Fix:** §6 designate order: (1) eligibility read incl. roster full → refuse before verifying; (2) verifyHouseBotPassword; (3) under house:control re-count non-REMOVED bots and insert, or refuse with the copy. The limits save re-counts under house:control.
- **Test:** test:house-bot-designation: two concurrent designates at 4/5 → one bot plus one ROSTER_FULL; failedLoginCount unchanged when full before verify; limits save below count refused with the count.

### CA-27 [partial] An ADMIN is demoted, or loses owner access, in the middle of the wizard or a form.
- **Trigger:** Another Owner changes Admin A's role to COMPLIANCE via /admin/staff while A is on step=consent with a password typed. Separately, a role is changed by an ops script without session revocation.
- **Expected:** No password verification and no write happen for a non-owner. Demoted via /admin/staff (sessions revoked): A's next press returns REAUTH_LOGIN and lands on /auth/admin?next=<wizard URL> with the signed-out explanation. After signing in as COMPLIANCE, the page renders the restricted card "Owner (ADMIN) only" and the nav item is gone. The password in memory is gone. Role changed without revocation: "Only the Owner can do this. Your access has changed — reload the page." (never "Server error"), plus a SECURITY privilege_escalation_blocked row with action houseBot.<verb>. Earlier HOUSE_BOT bell rows and emails stay with the demoted person (documented accepted risk).
- **Plan:** §6 'each starts with requireOwner'; §8 Nav and RBAC; §12 test:house-bot-console
- **Evidence:** src/app/admin/staff/actions.ts:37-39: a role change revokes sessions. src/lib/server/staff-roles.ts:38-39: only self-change is blocked, so another Owner can demote an ADMIN. src/lib/server/session.ts:141-170: the revoked device's session is null. src/lib/server/rbac-guard.ts:209-222: no session → redirect('/auth/admin') without next; non-ADMIN → audit, then throw 'Forbidden: Owner (ADMIN) only.' src/lib/client/run-admin-action.ts:31-32 shows that throw as 'Server error — nothing may have applied' (message masked in production). src/app/admin/layout.tsx:166-168,238-239: restricted card on the next render.
- **Fix:** softRequireOwner (CA-06) with codes NOT_OWNER and REAUTH_LOGIN. Add to §13 accepted risks: 'bell rows and emails already delivered to a later-demoted admin are not recalled'.
- **Test:** test:house-bot-console: each action under a FINANCE session → NOT_OWNER plus a SECURITY row, failedLoginCount of the target unchanged, no HouseBotEvent; revoked session → REAUTH_LOGIN whose href carries next.

### CA-28 [partial] Browser Back, Forward and Refresh on every route, tab and wizard step, including dirty forms, which the unsaved-changes guard cannot protect on Back.
- **Trigger:** Back from a dirty rules tab; Back from wizard review to consent; Forward to review; Refresh on consent; Back after Designate (replace) and after Remove (replace); Back between ?tab= values.
- **Expected:** Tabs: Back/Forward step through ?tab= and filters restore from the URL. Dirty rules/limits + Back: edits are kept in the draft (written on every change) and restored on return with "Restored unsaved changes (not saved yet) · Discard". Refresh or close: the browser's leave prompt, and the draft is kept anyway. Wizard: push per step. Back from review → consent with label and note kept, password empty, and "Enter the password again — it is never kept". Forward or Refresh onto review with no password → replace to consent. Back after Designate lands on a wizard URL for an account that is now a bot: the step re-runs eligibility and shows the check card "Already designated as Bot A · Open bot", with no password field. Back after Remove → the bot page, read-only and REMOVED. Every page is force-dynamic, so Back always shows live state.
- **Plan:** F1 wizard states; §8 Routes; §8 Unsaved guard
- **Evidence:** src/components/ui/unsaved-changes.tsx:23-28: popstate is 'NOT COVERED'; :404-414 beforeunload; :417-436 link capture only. Plan F1: the step is honoured 'only if the earlier steps' data is in memory', and eligibility is not re-run per step.
- **Fix:** F1: 'every step render calls houseBotEligibility(userId,{context:designate}); a live bot short-circuits to the check card with the Open link'. §8: rules, limits and wizard use the draft module (CA-05) with a restore Callout.
- **Test:** test:house-bot-console: wizard view at step=review for a user who is now a live bot renders the check card and link; draft reducer tests for restore, discard and TTL.

### CA-29 [partial] The three form modals (master ON, Remove, Re-verify) combined with the agents runner: the running overlay and the error card stack a second modal on top, errors leave the form context, and a stray tap on the scrim closes the modal and drops what was typed.
- **Trigger:** Owner submits Remove with a 3-character reason; the network is slow during Re-verify; on a phone he taps outside the ON modal while typing the reason.
- **Expected:** Inside these modals: Submit shows the Button spinner (aria-busy) and fields go read-only while pending. Esc, scrim and ✕ do nothing while pending. Scrim clicks never close the modal; Cancel/✕ close it and clear the password. Server field errors appear under their field with focus moved there ("Give a reason of at least 5 characters"). Transport or unknown errors appear as a danger Callout inside the modal with "Try again". No second modal ever stacks. On success the modal closes, focus returns to the trigger, a success result shows, and the page refreshes.
- **Plan:** §8 Feedback (runner + ActionOverlay; 'errors are inline and the modal stays open')
- **Evidence:** src/components/admin/action-overlay.tsx:24-31: running renders a <Modal>, error an OperationResultModal. src/components/ui/modal.tsx:146,173,282: closeOnScrim defaults to true and the scrim click calls onClose; ConfirmModal disables it only while loading (:516).
- **Fix:** §8: 'Form modals use a modal-local runner (useTransition + inline error state), never ActionOverlay while open, and pass closeOnScrim={false}.' List each modal file in the unsaved-changes EXEMPT ① entries.
- **Test:** test:house-bot-console source pin: the three modal files pass closeOnScrim={false} and never call ov.run/ov.fail; runner state-machine unit test (pending → field error keeps open).

### CA-30 [partial] The kill switch OFF on a slow link, or while house:control is busy: the lock wait has no bound, and a network failure shows the generic 'nothing may have applied' instead of whether bots are actually off.
- **Trigger:** Owner presses Off during a burst while a bet holds house:control; or his phone drops signal mid-request.
- **Expected:** Button spinner "Switching off…". enabled=false is committed first in its own short statement, so any bet reaching H4 afterwards sees OFF. The action then waits at most 3 s for house:control. Normal case (~1 s): strip "House bots are off. No bot will place a bet." Wait exceeded: "Switched off. A bet already in its final step may still complete — check Activity in a minute." Request failed: the client retries OFF twice automatically (it is idempotent), then reads status. If off, the off copy shows; otherwise a danger Callout: "Could not confirm the switch-off. Press Off again, or pause each bot." Never the generic server-error sentence.
- **Plan:** F9 Kill switch OFF; §3 lock order
- **Evidence:** src/lib/server/locks.ts:126-144: pg_advisory_xact_lock blocks with no lock_timeout inside a $transaction with timeout 30000 / maxWait 10000. src/lib/client/run-admin-action.ts:31-32: a network or timeout failure becomes 'Server error — nothing may have applied'. Plan F9 names a timeout copy but not the bound or the write order.
- **Fix:** F9: write enabled=false outside the lock, then drain with SET LOCAL lock_timeout='3s' (or a pg_try_advisory_xact_lock loop), mapping a timeout to the second copy. Client retry policy applies to OFF only.
- **Test:** test:house-bot-caps: house:control held 25 s → OFF returns in ≤ 4 s with the drain-timeout copy and control.enabled=false; runner unit test: fetch rejects twice → two retries, then a status read.

### CA-31 [partial] Slow networks on every other action: long spinners with no reassurance, and after a failure the owner cannot tell whether his change applied.
- **Trigger:** On 2G the owner saves rules (8 s round-trip), or the request dies after the server committed.
- **Expected:** The running overlay names the action ("Saving Bot A's rules…"). After 8 s the sub-label reads "Still working — slow connection. Don't close this page." It cannot be dismissed while running. On a transport failure or 45 s: "No answer from 50pick — we don't know if this was saved. Your changes are kept." with "Check now". That re-reads the bot or limits: if the version advanced with this owner as the last saver → "It was saved."; otherwise "Not saved — press Save again." Route loading skeletons from loading.tsx appear on navigation.
- **Plan:** §8 Feedback; §8 loading.tsx
- **Evidence:** src/components/admin/action-overlay.tsx:24-31: the running Modal is non-dismissable, with no timed sub-label. src/lib/client/run-admin-action.ts:31-32: generic uncertainty copy. src/lib/server/locks.ts:142-143: 30 s transaction / 10 s connection wait. Plan §8 says only 'buttons disabled while pending'.
- **Fix:** House-bots runner: timer-driven sub-label, and reconciliation through getHouseBotStatusAction (CA-23) comparing versions and the last actor. Save actions return the new version.
- **Test:** Runner unit test with fake timers (8 s label, 45 s failure card); reconciliation decides saved or not from version and actor.

### CA-32 [partial] Notification and email deep links: time-relative query strings resolve to the wrong window when opened later, so the owner lands on an empty list.
- **Trigger:** Owner opens a money-event email 5 weeks later; opens an hour-summary bell row the next morning; opens a per-bet alert from last week; ~~the holder taps a stake notice while signed out~~.
- **Expected:** Every link shows its event whenever it is opened. Money: /admin/transactions?q=<txnId>&range=all (exactly that row). Hour summary: /admin/desk?tab=activity&range=custom&from=<YYYY-MM-DDTHH:00>&to=<+1h>. Per-bet: /admin/desk/<botId>?tab=activity&range=all&intent=<intentId> (row highlighted on the page containing it). Alert: the same with &outcome=failed. Pause and switch alerts: bot page or roster (current state) with History reachable. A REMOVED bot's links still render read-only. ~~Holder: /positions/<positionId> (signed out → login, then back; another account → 404) and /positions.~~
- **Plan:** §7 Notifications href column
- **Evidence:** src/app/admin/transactions/page.tsx:76 defaults the window to '28d' and :80 reads q. src/lib/search/fields.ts:92-93: TXN search default columns include id. src/lib/server/date-range.ts:112-125 presets are today/24h/7d/28d/all, and :95-106 handles custom from/to in EAT. src/app/positions/[positionId]/page.tsx:33,40: login redirect with next, ownership notFound. src/components/layout/notifications-panel.tsx:408-415: same-origin router.push. Plan §7 uses '/admin/transactions?q=<txnId>' and 'range=today'.
- **Fix:** §7: replace the hrefs as above. §8 feed: support intent=<id>, which computes the page and highlights the row.
- **Test:** test:house-bot-comms: for each emitter, the href's route file exists, and with now = event + 60 days the page's range and search resolvers include the event.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no stake notice (D19c; C4 ruling 149), so there is no holder link; the admin links stand. Coverage gate: partly struck by D19.

### CA-33 [partial] Pagination, filter and tab URL states: invalid values, a removed bot as the filter, and live refresh shifting rows between pages while the owner reads page 2.
- **Trigger:** Owner edits the URL to outcome=foo, tab=xyz, page=999, page=abc, bot=<removed id>, or range=custom with bad dates; or sits on page 2 while new intents arrive.
- **Expected:** Unknown tab → default tab, shown active in the rail. Unknown outcome/product/bot → All, with the pill showing All. bot=<removed> → pill "Bot A (removed)" with rows kept. page=999 → last page; page=abc → 1. A bad custom range falls back to the resolver's window. Changing a filter drops page. Page 2+ is pinned by a cursor (before=<createdAt>,<id>) captured when leaving page 1, so refreshes never move rows between pages; page 1 shows "3 new" when new rows arrive while the owner has scrolled. Filtered empty state: "No activity matches these filters." with Clear.
- **Plan:** §8 Activity feed (QueryStrip, AdminPagination 20); §8 Live state
- **Evidence:** src/components/ui/pagination.tsx:205-210: parsePage clamps and maps NaN to 1. src/lib/server/date-range.ts:91-125: presets and custom handling. src/components/ui/tabs.tsx:218-221: href tabs are Links. Plan §8 runs the RefreshPoller on every tab and page.
- **Fix:** §8: a whitelist parser for feed params; keyset cursor for pages ≥ 2; a 'N new' pill on page 1; removed-bot label in the pill.
- **Test:** test:house-bot-console: param parser table; DAL keyset test inserts rows between page loads → page 2 is identical.

### CA-34 [partial] Schedule window edge cases: midnight, 23:59, overnight windows and which day they belong to, overlaps after splitting, zero-length windows and half-typed times.
- **Trigger:** Owner enters 00:00→00:00; 23:59→00:00; 22:00→02:00 with only Monday ticked; 22:00→02:00 plus 01:00→03:00; leaves an end time half typed ("2_"); adds a fifth window.
- **Expected:** Windows are stored as minutes [start, end); an end of 00:00 means end of day (1440). 00:00→00:00 is refused: "Start and end are the same — use All day for 24 hours." 23:59→00:00 is valid (one minute). 22:00→02:00 on Monday covers Mon 22:00–24:00 plus Tue 00:00–02:00, and the preview says "Mon 22:00 → Tue 02:00 (overnight)". An overlap after expansion is refused on the second row: "Overlaps 22:00 → 02:00." A half-typed time is refused on that row: "Enter a time as HH:MM." The 4-window maximum counts rows as shown, not stored halves; the add button disables at 4 with "Up to 4 windows". Time controls render at the 44 px md height.
- **Plan:** §5 Schedule row ('All day toggle, or 1–4 windows … overnight stored as two windows')
- **Evidence:** src/components/ui/time-mask.ts:117-129: deriveTime accepts hours 0–23 only and emits value "" with invalid:false for incomplete segments, so an empty time looks valid. src/components/ui/time-select.tsx:114: sm renders h-[36px]; :122 fixed w-[112px].
- **Fix:** rules.ts: expandWindows(days, rows) → weekly minute set; validation rules and copy as above; the next-day attribution written into §5 and the preview sentence. The form uses TimeSelect size="md".
- **Test:** test:house-bot-rules windows matrix: 00:00–00:00, 23:59–00:00, overnight Mon→Tue, Sun→Mon wrap, overlap after split, incomplete time, 5th row.

### CA-35 [partial] Note, reason and label text lengths: the kit Textarea has no limit or counter; client and server count characters differently; whitespace-only reasons pass.
- **Trigger:** Owner pastes a 5,000-character note; types a reason of five spaces; writes a 300-character note with emoji.
- **Expected:** A counter under each note or reason reads "212 / 300" and turns danger above 300. The typed text is kept (never truncated) and the error reads "At most 300 characters — shorten it to save." The counter updates on screen while typing and is announced to screen readers only on blur. Reasons are trimmed first: "     " → "Give a reason (at least 5 characters)." Client and server count Unicode code points after trimming, so emoji never pass one side and fail the other.
- **Plan:** §2 note ≤300; F3/F8 reason 5–300
- **Evidence:** src/components/ui/textarea.tsx:9-25 renders a bare <textarea> with no maxLength, counter or error slot. src/lib/server/staff-roles.ts:37 trims reasons (precedent). Plan §2/F3 give lengths without a counting unit.
- **Fix:** rules.ts countChars(s) = [...s.trim()].length, used by both sides. A small HouseTextField wrapper (Field + Textarea + counter + aria-describedby) inside the house-bots folder.
- **Test:** test:house-bot-rules: whitespace reason, 300 and 301 code points with emoji, 5,000-char paste → field errors, never truncation.

### CA-36 [partial] The live balance read fails on the review step (the plan covers only the check step), or Retry is pressed repeatedly.
- **Trigger:** The wallet read errors when the owner reaches step=review with the password in memory.
- **Expected:** Review shows the blocking row "Balance unavailable — try again" with a "Try again" button. It re-renders the step without leaving the component, so the password stays in memory, and focus returns to the button. Designate is disabled with that reason. When a retry succeeds the balance shows and Designate enables. A missing wallet (as opposed to a failed read) shows a different row: "This account has no wallet — it cannot be designated." The designate action re-reads the balance and returns the same refusal inline on review.
- **Plan:** F1 steps 2 and 4
- **Evidence:** Plan F1.2: 'A failed balance read is a blocking row'. F1.4: 'Shows the live balance again (re-read at render)', with no failure state and no retry that keeps the password.
- **Fix:** F1.4: add the failure row, the Retry behaviour (router.refresh while the wizard client stays mounted) and the WALLET_MISSING distinction; designate re-checks.
- **Test:** test:house-bot-console: review view with an injected read failure → Designate disabled with the row; test:house-bot-designation: action refuses BALANCE_UNREADABLE with no bot created and no password verify.

### CA-37 [partial] Password attempt feedback on consent and re-verify: counts that differ between replicas, a lock the owner can cause for the holder, and countdowns that flood screen readers.
- **Trigger:** The holder already has 3 failed sign-ins; the owner mistypes twice; retries land on another container; the rate bucket trips.
- **Expected:** Before any attempt, read fresh: "2 attempts left before Juma's own sign-in locks for 30 minutes." After a miss: "That is not his current password. 1 attempt left." Locked: "His sign-in is locked until 14:33 EAT (in 12 min). His own sign-in is blocked too." with submit disabled. Rate-limited: "Too many tries from this console. Try again in 4:12." with submit disabled. Empty input is refused without counting. The database lockout is authoritative across replicas, so no replica grants more than 5 total. Countdowns are visual only; screen readers hear the sentence once and "You can try again now" when it ends.
- **Plan:** F1 step 3; §6 Password check
- **Evidence:** src/lib/server/auth-service.ts:963-972: the counter and 30-min lock live in the DB under withLock('login:<id>'). src/lib/server/rate-limit.ts:7: rateCheck is in-memory and per container, so the planned housebot.verify bucket (capacity 3) is per replica.
- **Fix:** §6: state that attemptsBeforeLock comes from the DB counter and the bucket is per replica (accepted), or move the bucket to the DB limiter. §8: countdown aria rules and the exact sentences.
- **Test:** test:house-bot-designation: attemptsBeforeLock 5→1 then lock; empty uncounted; console view: countdown element aria-hidden, a static sentence present.

### CA-38 [partial] Keyboard-only and screen-reader walk through designate → rules → ON → Start → Pause → Remove: focus after step changes, redirects and refreshes, switch semantics, live updates and countdown noise are undefined apart from the picker.
- **Trigger:** The owner uses only Tab/Shift+Tab/Enter/Space/Esc, or NVDA/VoiceOver, through the whole flow.
- **Expected:** Skip link to content. Wizard: each step's h2 "Step 3 of 4 · Consent" receives focus on step change. After Designate's replace, focus goes to the bot page H1 and the rules tab is announced. The master switch is a role=switch with aria-label "House bots master switch" and aria-describedby pointing at the strip sentence. Status changes (auto-pause, switch-off) are announced once through one polite region; feed rows and poll refreshes are not announced. Modals trap focus, put initial focus on the first field, return focus to the trigger on close, and Esc closes (except while pending). Server field errors move focus to the field and are linked with aria-describedby. Due-time and lockout countdowns are aria-hidden with a static EAT time. Every action is reachable in DOM order with a visible focus ring. The rail announces the current tab via aria-current.
- **Plan:** §8 UserPicker ARIA; §8 Visual rules; §13 risk 'combobox keyboard unproven'
- **Evidence:** src/app/admin/layout.tsx:206-211 skip link. src/components/ui/toggle.tsx:52-54 role=switch with an optional aria-label. src/components/ui/modal.tsx:232,236 initial focus and Esc. src/components/ui/unsaved-changes.tsx:241-242 polite status bar. src/components/ui/tabs.tsx:168 aria-current on href tabs. The plan specifies ARIA only for the UserPicker.
- **Fix:** §8: add an 'Accessibility contract' subsection with the rules above. §12: add a real-browser keyboard drive on local next start over the view harness (Tab order snapshot, focus after step change, modal return focus).
- **Test:** test:house-bot-console static ARIA pins (switch label, step heading tabIndex=-1, single polite region, countdown aria-hidden); qa:house-bots-visual --keyboard Tab-order snapshot.

### CA-39 [partial] Using every form, modal and table on a 360 px phone: long money values in half-width KPI tiles, modals with the on-screen keyboard open, four window rows with errors, unbroken 32-character labels, and the wrapping unsaved-changes bar.
- **Trigger:** The owner runs the whole flow on a 360×640 Android with the keyboard up (~300 px visible).
- **Expected:** No document-level horizontal overflow. Tables scroll inside ScrollX with money as the second column and visible without scrolling. KPI tiles (2 per row below lg) show compact values such as "−TZS 1.25M", with the full value in title and sr-only text. Modals scroll their body so the Submit button stays reachable with the keyboard up, and the typed-word field is not covered. Window rows stack start/end/remove at under 400 px with errors under their row. A 32-character label without spaces wraps (overflow-wrap:anywhere) in the strip, roster and feed. The rail scrolls the active tab into view. The PendingChangesBar's two rows never cover the last field (body padding measured). Every control is ≥ 40 px tall.
- **Plan:** §8 Visual rules (widths 360…1920); §12 qa:house-bots-visual fixtures
- **Evidence:** src/components/admin/admin-body.tsx:64-65: KpiGrid cols '4' is 'grid-cols-2 lg:grid-cols-4'. src/components/ui/unsaved-changes.tsx:185-189,194-196: the bar wraps at 390 and reserves measured body padding. src/components/ui/time-select.tsx:122: 112 px each. Plan §12 fixtures have no keyboard-height viewport, 9-digit negative KPI, unbroken label or window-error fixtures.
- **Fix:** §12 visual fixtures: add 360×300 modal-open states (ON, Remove, Re-verify), KPI −1,234,567,890, a 32-char unbroken and a non-Latin label, 4 windows with errors, dirty bar plus last field. Assert the Submit button is in the viewport and nothing is clipped.
- **Test:** qa:house-bots-visual extended assertions at 360 with the --sheet-missing red control; each PNG opened and read.

### CA-40 [partial] Cancel on an activity row loses a race with the engine: the intent was claimed, placed, skipped or expired between render and click.
- **Trigger:** The feed shows PENDING 'due in 3 s'; the owner presses Cancel just as the poller claims or places it.
- **Expected:** The conditional UPDATE (WHERE status='PENDING') decides. CLAIMED → "Too late — this bet is being placed now." PLACED → "Too late — placed at 14:03:12 (TZS 8,000 DOWN)." SKIPPED/EXPIRED → "Nothing to cancel — it was skipped: selection closed." CANCELLED → "Already cancelled." The row then refreshes. Cancel appears only on PENDING rows and is disabled while pending. The confirm dialog names the bet ("Cancel Bot A's TZS 8,000 DOWN on BTC 5-min #412?").
- **Plan:** §6 cancelHouseBotIntentAction; §4.5 Claim; §8 Activity feed
- **Evidence:** Plan §6: 'PENDING → CANCELLED ("Already firing" if CLAIMED)', with no copy for PLACED or terminal states. Plan §4.5: claims happen every 2 s.
- **Fix:** The action returns data {status, positionId?, reasonCode}; feed-copy.ts provides the four sentences.
- **Test:** test:house-bot-console: cancel after claim, after markPlaced, after skip, and twice → exact codes and no status change.

### CA-41 [covered] An account is designated while the master switch is ON.
- **Trigger:** House bots are ON with Bot A active; the owner designates a second account.
- **Expected:** The new bot is created PAUSED(NEW) with no intents. The review step adds "House bots are on. This bot will not bet until you set its rules and press Start." After the replace to ?tab=rules, the strip reads "Paused · newly designated — set rules, then Start". The roster count and 'Active bots' KPI are unchanged. ~~The holder gets the trilingual designation notice.~~
- **Plan:** F1 step 4; F3 Start requirements; §6 designate
- **Evidence:** Plan F1.4: 'Designate creates the bot as PAUSED(NEW)'. F3: Start is refused while a cap or mode is unset.
- **Test:** test:house-bot-designation: designate with enabled=true → PAUSED(NEW), zero intents after one planner pass.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no designation notice (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### CA-42 [covered] Wizard deep links: step=review or consent with nothing in memory, a malformed or unknown ?user=, a previously REMOVED account, staff or the owner's own account.
- **Trigger:** The owner opens /admin/desk/new?user=u_x&step=review in a new tab, or ?user=garbage, or the id of a removed bot's holder, a staff member or himself.
- **Expected:** Empty memory → replace to step=consent with "Enter the password again — it is never kept". Unknown or malformed id → empty state with "Search again". REMOVED holder → "Removed on {date} by {name}" plus "Designate again" (creates a new row). Staff, AGENT or own account → check card blocking row with Continue disabled and the reason.
- **Plan:** F1 Wizard states and edge cases; §6 eligibility
- **Evidence:** Plan F1 edge-case bullets and the §6 houseBotEligibility blocking rows (role ≠ PLAYER, owner's own account, already a live bot).
- **Test:** test:house-bot-console: 'wizard step=review with empty memory → consent'; the designation suite covers the blocking rows per context.

### CA-43 [covered] Non-owner staff reach the house-bots console by nav, URL or a forged action call, including the /admin/house prefix trap.
- **Trigger:** A FINANCE or COMPLIANCE officer types /admin/desk, opens /admin/house, or posts a house-bot action directly.
- **Expected:** The nav item is hidden for all 8 non-ADMIN roles. /admin/desk/** renders the restricted card "Owner (ADMIN) only". Every action refuses with a SECURITY privilege_escalation_blocked row (as NOT_OWNER per CA-27). /admin/house still highlights House, and /admin/desk highlights House bots.
- **Plan:** §8 Nav and RBAC; §12 test:house-bot-console
- **Evidence:** src/components/admin/admin-nav-groups.ts:81 (House item) and :213 (ROUTE_KEYS '/admin/house', which must follow '/admin/desk'). src/lib/server/roles.ts:337-340 OWNER_ONLY_PREFIXES and isOwnerOnlyPath. src/app/admin/layout.tsx:166-168,238-239 restricted render. scripts/admin-view-matrix-drive.mjs:54 OWNER_ONLY list.
- **Test:** test:house-bot-console, test:admin-nav, test:rbac pins as planned.

### CA-44 [covered] Removing a bot that has PENDING/CLAIMED intents and open house positions, including the last bot.
- **Trigger:** The owner removes ACTIVE Bot A (reason + REMOVE) while one intent is PENDING, one CLAIMED, and two house positions are open.
- **Expected:** Bot A becomes REMOVED. The PENDING and CLAIMED intents become CANCELLED; a bet already past markPlaced completes and keeps its marker. Open positions settle normally to the holder's wallet with markers kept. ~~The holder is notified.~~ The owner is replaced to the roster with "Bot A removed." (plus the CA-12 sentence if the master is on with no active bots). The bot page stays reachable read-only with full history. A repeat Remove is an ok no-op.
- **Plan:** F8 Pause / Remove; §6 removeHouseBotAction
- **Evidence:** Plan F8: 'Remove … cancels PENDING and CLAIMED intents. Open house positions keep their markers and settle normally. The holder is notified.' Plus target-state semantics.
- **Test:** test:house-bot-engine and test:house-bot-console: Remove with live intents → CANCELLED, positions settle with markers, second Remove no-op.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice when his bot is removed (D19c; C4 ruling 149); PLAN F8's "The holder is notified.", quoted under Evidence, falls with it. Coverage gate: partly struck by D19.

### CA-45 [covered] Re-verify with the holder's old password, or from a state where re-verify is not allowed.
- **Trigger:** After the holder changed his password, the owner enters the old one; or the owner opens Re-verify on an ACTIVE bot or on AUTO_PAUSED(SELF_EXCLUDED).
- **Expected:** Old password → "That isn't his current password. If he changed it recently, ask him for the new one. 3 attempts left before his sign-in locks for 30 minutes." New password → PAUSED(MANUAL) with a refreshed fingerprint, "Verified. Press Start when ready." Re-verify is disabled while ACTIVE and for non-password AUTO_PAUSED reasons, with a hint naming the cause and its end date. From PAUSED(*) it refreshes the fingerprint and keeps the reason. It is refused if the latest password write was an officer reset ("Ask the holder to change it in Account settings").
- **Plan:** F6 Auto-pause and way out; §6 reverifyHouseBotAction, eligibility password contexts
- **Evidence:** Plan F6 table and the Re-verify bullet; §6 'latest password write was player.password_reset_by_officer' (that audit action exists at src/lib/server/password-reset.ts:273-279).
- **Test:** test:house-bot-designation: 'fingerprint auto-pause; re-verify refused on DAILY_LOSS_STOP'; add old-password → refused and counted.

## compliance-data (36)

### CRA-01 [gap] GBT or an auditor asks who designated or removed a house account, changed its caps, or switched house bots on or off, and when. The answer has to come from the HMAC audit chain, not from a plain table anyone could edit.
- **Trigger:** Any owner action (designate, re-verify, start, pause, remove, save rules, save limits, master ON or OFF, cancel an intent). Also the planner's realised-loss stop, and an automatic master OFF (GLOBAL_LOSS_STOP, ENGINE_FAULT or ENGINE_ERRORS).
- **Expected:** Every state change writes exactly ONE awaited audit row, after its lock is released. The HouseBotEvent row stores that audit entry id.
- COMPLIANCE: house_bot.designated, .reverified, .started, .paused, .auto_paused, .removed, .loss_stop, .intent_cancelled, .switch_on, .switch_off {cause}.
- ADMIN, with {before, after, changes, version}: house_bot.rules_saved and house_bot.limits_saved.
- SECURITY: the password_* rows the plan already lists.
- actorId is the owner id, or "system_house_bot" for engine acts (never null). targetType is HouseBot or HouseBotControl.
- Payload allowlist: holderUserId, from/to status, reason code, the officer's reason text. Never the label, note, password, fingerprint or phone.
- No audit row per intent, skip or alert. A bet keeps its single market.position.opened row.
- **Plan:** §2 HouseBotEvent (plan:157); §4.6 auto-pause (plan:274); §6 password audits (plan:360); §6 owner actions table (plan:362-374) has no audit column
- **Evidence:** C:\Users\Ali\.claude\plans\we-are-working-on-transient-kernighan.md:274 and :360 are the only house_bot audit actions in the plan. Precedent for a compliance switch writing a COMPLIANCE row: src/lib/server/resolution-policy.ts:65-77. One-row-per-bet rule: src/lib/server/market-service.ts:1508-1522
- **Fix:** 1. Add an 'Audit' column to the §6 owner-actions table.
2. Add a §4.6 bullet listing each engine/control action with its category, actor, target and payload allowlist.
3. State in §2 that HouseBotEvent is a read model and the audit row is the evidence.
4. This restores the dropped design-C §9 audit list, with switch and caps written as COMPLIANCE (switch) / ADMIN (before/after).
- **Test:** - test:house-bot-console executes each owner action. test:house-bot-engine drives the loss stop and the engine-fault OFF. Each asserts exactly one row with that category, action and actor, that payload keys stay within the allowlist, and that the label, note, password and fingerprint values are absent from the JSON.
- red:house-bot-console deletes one audit call; that assertion must go red.

### CRA-02 [gap] GBT asks for all house activity for a period, for example August 2026.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** struck whole — there is no house-liquidity report, no month picker, no R7 audit index section, no house-market statement, and the transactions CSV gains no `house_bot_id` column and no `house` filter (C5-SPEC rulings 199–210 and 213); every report and CSV shows a house account as an ordinary player account. Rulings 211 and 212 survive only as the platform defects L26 and L27, no longer release preconditions. Coverage gate: struck by D20.
- **Trigger:** A compliance officer or the owner opens /admin/reports → Report library and needs a period-bounded house-activity artefact. Or they export transactions to CSV.
- **Expected:** A new catalogue report 'house-liquidity' covering the calendar month (packPeriodBounds, period passed as ?period=YYYY-MM). Classification 'Regulator hand-off', with regulatorSignatures. Sections:
1. Designation register: botId, masked holder id, designatedAt/By, consent method and verifiedAt, status changes in the period, removedAt and reason.
2. Control history: ON/OFF with actor, cause and reason; limit changes.
3. Per bot per product: bets, staked, returned, net result, fee withheld, open exposure at period end.
4. Per market: id and title, product, house side, house stake, total pool, house share %, outcome, house result, resolution path.
5. Reconciliation: Σ house BET_PLACED = Σ house position stakes; all = players + house; GGR unchanged.
6. Index of house_bot.* audit rows in the period, read durably, with truncation stated.

Also:
- The transactions CSV gains a house_bot_id column and a house=only|exclude filter, recorded in the transactions.exported payload.
- Same access as other reports: accounting view plus TOTP.
- **Plan:** §9 Reporting table (plan:456-466); §12 test:house-bot-reports (plan:520)
- **Evidence:** - src/lib/server/reports/catalogue.ts:1044-1053: 8 reports, none for house activity.
- src/app/api/admin/reports/[id]/route.ts:37,44: accounting view and TOTP gate. :64 builds with the userId only, so no period is passed.
- src/app/api/admin/transactions/export/route.ts:56-60: no house column.
- src/lib/server/txn-filters.ts:32-46: no house filter.
- **Fix:** Add a §9 row to commit 5:
- `buildHouseLiquidity(generatorId, packPeriod)` in reports/catalogue.ts
- REPORT_CATALOGUE['house-liquidity'] and a TEMPLATES card on /admin/reports
- the report route reads ?period=YYYY-MM (validated, default currentPackPeriod) for period reports
- TxnSearchFilters.house plus the CSV house_bot_id column, in both stores
- **Test:** test:house-bot-reports §GBT:
- a fixture month with 2 bots on both products, with rows at the month-boundary instants (report-parity pattern)
- every section reconciles to the Position and Transaction markers, and all = players + house
- the xlsx and pdf renders succeed
- the CSV house=only filter returns exactly the marked rows

test:dal-parity covers the new filter.

### CRA-03 [gap] Once house bets add BET audit rows, the monthly GBT pack's sign-off state and the RG report's events are read from the 10,000-row in-memory ring, which keeps less and less history.
- **Trigger:** House bots are active: about 1,000 extra market.position.opened rows a day at the recommended caps. Then a deploy or restart, or an officer opens the pack card or generates rg-engagement.
- **Expected:** - The pack state (prepared, approved, submitted, acknowledged) and its artefact sha256 come from the durable AuditLog, filtered to the pack's targetId.
- RG engagement events come from getAuditByActionsDurable with category COMPLIANCE, with truncation stated.
- Both are identical on every container and after every deploy, whatever the bet volume.
- An approved pack never reverts to 'Draft'.
- **Plan:** §9 (plan:456-466) says nothing about it; §13 risk 5 throughput (plan:559)
- **Evidence:** - src/lib/server/report-pack.ts:92-94: getAuditPage({category:"ADMIN", limit:10000}) is the ring.
- src/lib/server/audit.ts:63: MAX_IN_MEM = 10,000. :479-485: the ring is global across categories.
- src/lib/server/reports/catalogue.ts:879-886: RG events are read from the ring.
- src/lib/server/market-service.ts:1515-1522: one BET row per bet.
- **Fix:** Add to commit 5:
- getReportPack reads durably (getAuditByActionsDurable(['pack.prepared','pack.approved','pack.submitted','pack.acknowledged'], {category:'ADMIN'}) filtered by targetId).
- buildRgEngagement uses the durable action reader.
- A source pin forbids getAuditPage in report-pack.ts and catalogue.ts report builders.
- **Test:** - qa:house-bots-local (loopback Postgres): write pack.prepared and pack.approved, then 12,000 BET rows, restart the module cache, and assert getReportPack().state === 'approved'.
- test:house-bot-reports: a source pin, with a positive control, fails on any getAuditPage import in those files.

### CRA-04 [gap] The holder exercises his right of access: 'Export my data', or an officer builds his DSAR bundle during or after designation.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the owner-only internal record that C5-SPEC ruling 250 named as this id's home for the house section (rulings 236–238), and ruling 242's crowd-out record, are struck; D19 already keeps both doors free of any house section (rulings 168–169), so this id is covered only by its absence form (ruling 243). Coverage gate: the internal-record half is struck by D20.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** neither door carries a house section and neither door's transaction reads exclude house-marked rows: a holder's house stakes appear in both exactly as his own rows, with no house key, id or word (C5-SPEC rulings 168–169); the actor-side audit read drops only house-owned actions (C5-SPEC ruling 170). The no-secret-value assertions stand. Coverage gate: counts only in its absence form (C5-SPEC ruling 250).
- **Trigger:** /profile/account 'Export my data', or /admin/privacy or /admin/players 'Build bundle'.
- **Expected:** ~~Both doors add a houseLiquidity section:~~
- ~~every HouseBot row for the user: status, pauseReason, designatedAt, consent method ('password entered by 50pick owner') with verifiedAt, removedAt and reason, and the label and note marked 'written by 50pick'~~
- ~~his HouseBotEvent history~~
- ~~house positions: id, market, side, stake, status, payout, placedAt~~
- ~~house transactions as their own list, with total and truncated~~

Also:
- ~~Personal transactions and audit entries are read excluding house-marked rows, so house volume can never push his deposits and withdrawals out of the 1,000-row windows.~~
- Personal positions are added; the export currently has none.
- passwordFingerprint and every hash value are never serialised.
- **Plan:** None: §9, §10 and §12 have no DSAR item
- **Evidence:** - src/lib/server/user-service.ts:45-69: no positions; transactions capped at 1000; auditEntries capped at 1000.
- src/lib/server/privacy.ts:271-318: the bundle has no positions.
- src/lib/server/prisma-dal.ts:1464-1470: findByUser is newest-first with take=limit.
- **Fix:** Add a §9 row to commit 5 covering both exportUserData and buildDsarBundle:
- ~~the houseLiquidity section (fields as listed)~~
- ~~an allowlist projection of the HouseBot row~~
- ~~personal transaction and audit reads that exclude house-marked rows~~
- a personal positions section
- **Test:** test:dsar-secrets is extended with a holder holding 1,200 house transactions and 3 deposits:
- both doors include the 3 deposits ~~and houseLiquidity.designations[0].verifiedAt~~
- the serialised JSON contains neither the passwordFingerprint value nor the passwordHash value
- a column newly added to HouseBot is omitted, not leaked

### CRA-05 [gap] A designated holder closes his account and later asks to be erased.
- **Trigger:** closeAccount from /profile/account while his bot is ACTIVE or PAUSED. Then an officer presses Fulfil on his ERASURE request.
- **Expected:** (a) Closure. In the same call:
- the status write under wallet:<user> sets AUTO_PAUSED(ACCOUNT_BLOCKED)
- PENDING and CLAIMED intents are cancelled
- a HouseBotEvent and an awaited house_bot.auto_paused row are written, and admins get bell + email
- open house positions settle normally.

(b) Erasure while designated. anonymizeClosedAccount refuses with reason house_bot_live and 'Remove the house bot designation first — /admin/desk/<id>' while any HouseBot row for the user is not REMOVED. The request stays PENDING and privacy.dsar.erasure_blocked is written.

(c) After REMOVED:
- HouseBot, HouseBotEvent, HouseBotIntent and the markers are kept (the 7-year record behind the house positions)
- label becomes 'Erased <botId tail>'; note, removedReason and event free text become '[erased]'
- admin HOUSE_BOT notifications that show the label are redacted
- houseBotsRedacted appears in AnonymizeOutcome and in the privacy.erasure.completed payload.
- **Plan:** §6 eligibility 'status ≠ ACTIVE or closedAt' (plan:346); F8 Remove (plan:127-128)
- **Evidence:** - src/lib/server/user-service.ts:84-133: closeAccount has no house hook.
- src/lib/server/erasure.ts:169-176: CLOSED guard. :369-372: only maskName fragments are redacted in other people's notifications. :347-354: precedent for pseudonymising officer free text immediately. :397: passwordHash is nulled.
- docs/DATA-RETENTION.md:95: Position and Transaction are never erased.
- **Fix:** - Add flow 'F8b Holder closure and erasure' with (a)–(c).
- erasure.ts names the HouseBot and HouseBotEvent columns it writes.
- Add a DATA-RETENTION.md §2b tier row.
- closeAccount calls a house-bot hook: dynamic import, awaited, fail-closed to an admin alert.
- **Test:** - test:erasure §8 sweep adds buckets houseBots, houseBotEvents, houseBotIntents and admin notifications, with the label seeded equal to NAME. A §11 case asserts the refusal while the bot is ACTIVE.
- red:erasure: a 'skip house redaction' mutation must fail 8.b.
- test:house-bot-designation: closeAccount → AUTO_PAUSED(ACCOUNT_BLOCKED) with intents CANCELLED.

### CRA-06 [gap] An intent's 'why' and the activity-feed copy freeze a trigger player's chosen display name into a table kept for 7 years, so it survives his erasure.
- **Trigger:** A COUNTER decision on a trigger whose account has displayName 'Asha Mwangi'; that player is later closed and erased.
- **Expected:** - HouseBotIntent.why, decision JSON and feed copy store only the id-derived handle ('Player #' plus the last 6 characters of the userId, uppercased) and triggerUserId.
- Any display name is resolved at render time, so after erasure the feed shows the handle.
- No displayName, maskName or phone value is ever persisted in house tables.
- **Plan:** §4.4 example 'Player #A3F2K8' (plan:237); §8 Activity feed copy (plan:437)
- **Evidence:** - src/lib/display-label.ts:38-44: displayLabel returns displayName verbatim when set, and the id handle only as a fallback.
- src/lib/server/erasure.ts:197-216: precedent for the frozen-mask defect.
- **Fix:** - §4.4: 'why uses playerHandle(userId) = "Player #"+tail; never displayLabel, maskName or a phone'.
- feed-copy.ts joins the live user row at render.
- **Test:** - test:house-bot-engine: a trigger with displayName set gives a why containing the 'Player #<tail>' handle and not the name.
- test:erasure: the §8 sweep over houseBotIntents finds no NAME.

### CRA-07 [gap] The retention schedule and purge job have no entries for the new house tables.
- **Trigger:** A data-protection inspection or the Board asks how long house data is kept, or retention.purge.daily runs.
- **Expected:** DATA-RETENTION.md §1 rows:
- HouseBot and HouseBotEvent: 7 years, never deleted (POCA Cap 423 §16; the designation and consent record behind marked positions).
- HouseBotIntent: 7 years, never deleted (decision evidence per house position and per trigger not countered).
- HouseBotAlertOnce: 30 days, deleted by retention.purge.daily (operational throttle; penalty keys hold userIds).
- HouseBotRuntime: N/A, fixed rows that are overwritten, stated explicitly.
- HOUSE_BOT notifications: the existing 180-day class.
- Markers: the existing 7-year Position and Transaction classes.

/admin/retention rows and /legal/privacy §5 agree. The chain-purge NEVER list names the house tables.
- **Plan:** §10 Docs list (plan:481-486) omits DATA-RETENTION.md
- **Evidence:** - docs/DATA-RETENTION.md:3-5: it is the authority and every other statement must agree. :18-39: the class table.
- src/lib/server/retention.ts:124-186: the purge touches only named classes.
- src/app/admin/retention/page.tsx:38-66: the published rows.
- src/app/legal/privacy/page.tsx:77-84: §5.
- **Fix:** Add to the §10 docs list:
- the DATA-RETENTION.md rows above and a §4 line
- retention.ts HOUSEBOT_ALERT_ONCE_RETENTION_DAYS = 30, with houseBotAlertOncePurged in its SYSTEM audit payload (both stores)
- the /admin/retention rows
- the chain-purge.ts NEVER list
- **Test:** - test:retention seeds a 400-day-old HouseBot, HouseBotEvent and HouseBotIntent (all survive) and a 31-day-old AlertOnce (deleted); a second pass is a no-op.
- red:retention: a mutation that purges intents must go red.
- test:docs passes.

### CRA-08 [gap] The holder is reimbursed off-platform and deposits again. The source-of-funds thresholds and the AML story must stay truthful.
- **Trigger:** The owner pays the holder outside 50pick. The holder then deposits enough to cross the source-of-funds threshold (TZS 5,000,000 in 30 days).
- **Expected:** - No platform money moves for the reimbursement, but the owner records it: HouseBotEvent REIMBURSEMENT_RECORDED {amountTzs, paidAt, method, externalRef, note}, plus a COMPLIANCE house_bot.reimbursement_recorded row.
- The bot's money tab lists recorded reimbursements beside OWNER_MONEY events.
- ~~The house-liquidity report adds 'Operator reimbursements to holders (off-platform, as recorded)'.~~
- The check card warns: 'Deposits above source-of-funds thresholds need a declaration — declare the funds as 50pick liquidity funding'.
- The SOF gate itself is unchanged.
- **Plan:** D3b (plan:22); F7 (plan:121-124); §13 risks (plan:554-560)
- **Evidence:** - src/lib/server/wallet-service.ts:58: SOF_ROLLING_30D_TZS = 5,000,000.
- src/lib/server/kyc-risk.ts:77.
- src/lib/server/reports/catalogue.ts:251-255: FIU includes deposits at or above the threshold.
- **Fix:** - Add owner action recordHouseBotReimbursementAction: Modal form, owner-only, audited, no money write.
- Add ~~the house-liquidity report section and~~ the eligibility warning.
- Add §13 risk 7: 'reimbursement is off-ledger; the record is declarative'.
- **Test:** - test:house-bot-console: the action writes one event and one COMPLIANCE row, and wallet, transactions and ledger are byte-identical.
- ~~test:house-bot-reports: the section total equals the recorded events in the period.~~
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the house-liquidity report and its reimbursement section are struck (C5-SPEC ruling 202); the rest of this row is untouched by D20. Coverage gate: partly struck by D20.

### CRA-09 [gap] The privacy notice does not disclose that an automated system processes every player's bets and can exclude some accounts (the penalty box).
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** struck whole — `/legal/privacy` keeps the words it has on `main`: no lawful-basis line in any locale and no META refresh (D19a; W19 superseded, D19e). Coverage gate: struck by D19 (an Exceptions row, C5-SPEC ruling 250).
- **Trigger:** A player or the Personal Data Protection Commission reads /legal/privacy after house bots launch.
- **Expected:** - §3 'Legitimate interest' gains, in en/sw/zh: 'Liquidity: an automated system operated by 50pick reads bets placed on a market to decide stakes from accounts 50pick operates; accounts that exploit those stakes may be excluded from them for the day.'
- The sw and zh text is marked for native review.
- The page META line is refreshed.
- No new data class is created.
- **Plan:** §10 Public text (plan:469-480) omits /legal/privacy
- **Evidence:** src/app/legal/privacy/page.tsx:57-63 (lawful-basis list), :92 (objection covers marketing profiling only), :18-22 (META)
- **Fix:** Add a /legal/privacy §3 line in 3 locales to §10 and to test:house-bot-disclosure.
- **Test:** test:house-bot-disclosure renders the privacy page in en, sw and zh and asserts the liquidity line appears in §3.

### CRA-10 [gap] A counterparty (trigger) player asks for his data, or asks why his bets are no longer countered after he was put in the penalty box.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the owner-only internal record that C5-SPEC ruling 239 made the only home of `liquidityDecisions` (the excluded days and the countered count) is struck with rulings 236–238; ruling 239's absence half stands — a trigger player's two doors carry nothing — and D19c already struck the support-script answer. Coverage gate: covered only by that absence form.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** neither releasable door carries a trigger section: a penalty-boxed player's export and bundle equal an identical account's, with no excluded days, countered count or house word (C5-SPEC rulings 168 and 239). Coverage gate: counts only in its absence form (C5-SPEC ruling 250).
- **Trigger:** A penalty-boxed player uses 'Export my data', or complains to support.
- **Expected:** An owner ruling (proposed D10) is recorded. Until it is, the default is:
- ~~The access export includes the days his bets were excluded from liquidity counters, and a count of his positions that received a liquidity stake.~~
- It never includes an account identity, a bot id, the house side or an amount (D6 is kept).
- ~~The support script answers from this and never names an account.~~
- **Plan:** §4.3 penalty box (plan:231); §2 HouseBotAlertOnce penalty key (plan:156); HouseBotIntent triggerUserId (plan:162)
- **Evidence:** src/lib/server/user-service.ts:45-69 (export reads no intent or penalty data); src/lib/server/privacy.ts:265-266 ('oversharing over undersharing')
- **Fix:** - Add D10 to the Decisions table as open for Ali, with the default above.
- ~~exportUserData and buildDsarBundle gain a liquidityDecisions {penaltyDays[], counteredPositions} section.~~
- **Test:** test:dsar-secrets: a penalty-boxed fixture's export ~~has the penaltyDays dates, and~~ no houseBotId, hb_ or hbi_ id, and no bot userId appears anywhere in the JSON.

### CRA-11 [gap] A player's complaint about one market reaches GBT, and 50pick must produce the house's participation in that market.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** struck whole — there is no house participation statement and no F11 house block on `/admin/markets/<id>` to link it from (C5-SPEC rulings 194 and 208). Coverage gate: struck by D20.
- **Trigger:** A complaint: 'I lost because 50pick's account took the other side on market X'.
- **Expected:** From /admin/markets/<id>, next to the F11 summary, the owner downloads a 'House participation statement' (PDF or XLSX). It contains:
- every house intent on the market: kind, why, due and placed times, side, stake, public snapshot
- positions and results
- the resolution officer and path
- any objections

The download is audited like every other report generation.
- **Plan:** F11 (plan:143); §9 (plan:456-466)
- **Evidence:** - src/app/admin/markets/[id]/page.tsx:379-396: positions are listed under the holder's label with phone reveal, but there is no house statement.
- src/app/api/admin/reports/[id]/route.ts:64: builders receive no parameters.
- **Fix:** - Add a 'house-market-statement' builder that takes marketId, reusing the house-liquidity per-market section.
- The route passes a validated ?marketId.
- Link the download from the F11 block.
- **Test:** test:house-bot-reports: the statement for a fixture market lists exactly its intents and positions, and its stakes tie to the market pools.

### CRA-12 [gap] A future session adds leaderboard prizes or rank-based rewards.
- **Trigger:** Weekly leaderboard prizes or rank rewards are introduced after house bots ship.
- **Expected:** - House-marked positions never earn a prize or reward. Reward ranking is computed over non-house positions only.
- The public board may still show the bot (D6).
- ~~The build fails if a money writer consumes leaderboard data without the house filter.~~
- **Plan:** D6 (plan:25); §9 leaderboard row (plan:466)
- **Evidence:** src/lib/server/market-dal.ts:1231-1233 (the leaderboard groups all non-OPEN positions by userId, with no filter); src/app/_actions/chat.ts:154 (prize programmes already exist, e.g. proposals)
- **Fix:** - Add a HOUSE-BOTS.md do-not-restore line and a COMPLIANCE-entry constraint: 'rank or P&L rewards exclude houseBotId rows'.
- ~~Add a source pin: any file importing leaderboard( or leaderboardPlayerCounts together with creditInternal, creditBonus or adminAdjustBalance must reference houseBotId.~~
- **Test:** ~~test:house-bot-reports source scan, with a positive control: a planted offending file makes it fail.~~
- ✅ **THE SURVIVING RULE IS TESTED 2026-09-20 — `test:house-bot-reports` §12 (`12.0`, `12.R4.hb`, `12.R4.cd`, the four `12.PLANT.*`, `12.POS`, `12.CONTROL`).** After D20 this row's whole live content is R4's recorded rule, so §12 asserts it is RECORDED in BOTH authority documents, each checked separately against ITS OWN wording (they differ: `docs/HOUSE-BOTS.md:851` carries D6's display clause, `docs/COMPLIANCE-DECISIONS.md:342` does not). Planted control per document — the sentence deleted from a copy MUST be reported; positive control — the untouched documents report nothing. ⛔ THE LABEL SAYS WHAT IT DOES NOT PROVE: that the rule is written down, NOT that any code obeys it — D20 struck the walker that would have made obedience checkable, and a future reward feature must bring its own guard. The D6 half (the bot stays on the public board) was already asserted at `test:house-bot-reports` `11.247.c4`, with `11.247.c3` proving that sweep non-vacuous. Seen red 2026-09-20 by deleting the sentence from the real document, and by blinding the reader.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the reward source pin and its scan (C5-SPEC ruling 233's walker, with ruling 256's owed SQL) are struck; the rule that no prize or reward pays on house stakes stays in the docs (`docs/HOUSE-BOTS.md` "R4 — no rewards on house stakes" and its `docs/COMPLIANCE-DECISIONS.md` line), and the public board still shows the bot (D6). Coverage gate: partly struck by D20.

### CRA-13 [partial] Auto-pause and kill-switch audits are awaited while the wallet or house:control lock is still held, so bets queue behind the global audit-chain lock.
- **Trigger:** A burst of auto-pauses, or master OFF, while the audit chain is busy (global advisory lock, 30 s transaction).
- **Expected:** - The status write commits under its lock.
- After release: intents are cancelled, the event is appended, the audit row is awaited, then alerts are sent.
- OFF commits within its bound.
- No holder bet and no other bot waits on the audit-chain lock.
- **Plan:** §4.6 auto-pause sequence (plan:274); F9 (plan:130-133)
- **Evidence:** src/lib/server/audit.ts:356-386 (append = transaction with pg_advisory_xact_lock, timeout 30000, maxWait 10000); :426-462 (per-process queue)
- **Fix:** Reword §4.6 and F9: 'status or control write inside the lock; the audit is awaited only after the lock is released, before alerts'.
- **Test:** test:house-bot-caps: with the audit queue delayed 5 s, OFF commits in under 1 s and a concurrent personal bet by the holder is not blocked.

### CRA-14 [gap] The owner or an auditor tries to find house-bot actions in /admin/audit and they are buried under BET rows.
- **Trigger:** /admin/audit on a day with thousands of bet rows.
- **Expected:** - /admin/audit accepts ?action=house_bot. (prefix) and ?targetId, reads the durable table (getAuditByActionsDurable or getAuditForTargetDurable), and shows truncation.
- The console history tabs link 'Open in audit log →' with these filters.
- **Plan:** §8 history tabs (plan:400, :407)
- **Evidence:** src/app/admin/audit/page.tsx:46 (only category and actorId params), :89 (ring read getAuditPage); src/lib/server/audit.ts:626-666 (a durable action reader already exists)
- **Fix:** Add a §8 bullet: audit page action-prefix and target filters with a durable read, plus the history-tab link.
- **Test:** test:house-bot-console: a fixture of mixed rows under ?action=house_bot. renders only house rows; an unknown prefix shows the 'Unknown filter' notice and all rows.

### CRA-15 [gap] Compliance purges an archived Up & Down chain the house traded.
- **Trigger:** The /admin/retention purge ceremony on a chain with house positions or intents.
- **Expected:** - The precondition refuses while any HouseBotIntent on the chain's markets is PENDING or CLAIMED: 'N house intents are still live — cancel them or let them expire first'.
- ~~The cost panel shows 'House positions (kept)' and 'House intents (kept)'.~~
- ~~The evidence pack includes house positions per market.~~
- Intents, positions and markers are untouched, and verification is unchanged.
- **Plan:** None
- **Evidence:** src/lib/server/chain-purge.ts:10-13 (the NEVER list), :112-159 (preconditions), :204-216 (cost counts positions including house ones)
- **Fix:** Add a §9 row: chain-purge precondition, ~~cost rows, pack field~~ and NEVER list entry for the house tables.
- **Test:** test:chain-purge: a chain with a PENDING house intent is refused. After the intent expires the purge proceeds and the intent count is unchanged.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the purge cost panel and evidence pack name no house positions or intents (D20: no record splits house money out); the live-intent precondition and the NEVER list are untouched by D20. Coverage gate: partly struck by D20.

### CRA-16 [partial] A resolver sees house exposure, and the audit chain must prove what he saw.
- **Trigger:** A single admin seals a poll where the house holds NO 40,000. Also emergency void and bulk seal.
- **Expected:** - ~~'House stake: YES X · NO Y' is shown on the queue card, the ceremony, the admin market page and the bulk-resolve confirm modal.~~
- ~~market.adjudicated, market.emergency_void and market.resolve.bulk(_override) payloads carry a houseStake {yes, no} snapshot read in the same call.~~
- There is no block (I10).
- **Plan:** I10 (plan:41); F11 (plan:143)
- **Evidence:** src/lib/server/market-service.ts:3060-3081 (adjudicated payload has pools but no house stake), :4207-4214 (emergency_void payload); src/app/admin/resolver-queue/page.tsx:463-469 (pool display)
- **Fix:** ~~Extend F11 with the bulk-resolve modal and the houseStake fields on those three audit payloads.~~
- **Test:** - ~~test:house-bot-reports: resolving a fixture with a house position gives adjudicated payload.houseStake equal to the position sums.~~
- test:officer-conflict and test:two-admin stay green unchanged.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** no resolver surface shows a house stake line and no decision audit carries `houseStake` (C5-SPEC rulings 187–194); a single admin still seals a house-held market with no block (I10). Coverage gate: partly struck by D20.

### CRA-17 [partial] Other players object to the result of a market where the house staked heavily.
- **Trigger:** A player with a personal position files an objection; an officer rejects or upholds it.
- **Expected:** - Filing is unchanged for players. The holder's house-only positions give him no standing (f).
- ~~The /admin/objections row and decision dialog show the house stake.~~
- ~~objection.rejected and objection.upheld payloads carry a houseStake snapshot.~~
- An upheld VOID refunds house positions with the marker stamped.
- ~~Such objections are listed in the house-liquidity report.~~
- **Plan:** §3 (f) (plan:188); F11 (plan:143)
- **Evidence:** src/lib/server/objections-service.ts:108 (standing = any position), :420-428 and :543-556 (decision payloads carry no house data); src/app/admin/objections/page.tsx:51, :142 (pool only)
- **Fix:** - ~~Extend F11 to /admin/objections and objection-decision.tsx.~~
- ~~Add houseStake to both decision audit payloads.~~
- ~~Add an objections section to CRA-02.~~
- **Test:** - test:house-bot-money §6 (standing) as planned.
- test:house-bot-reports: an upheld VOID fixture → refund transactions stamped ~~and payload.houseStake present~~.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the objections house line, the `houseStake` decision payloads and the report listing are struck (C5-SPEC rulings 187–194 and 202); standing (f) and the marker on an upheld VOID's refunds are untouched by D20. Coverage gate: partly struck by D20.

### CRA-18 [partial] The compliance Player Safety panel flags the holder because of bot activity, or loses his real signals.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the house-bet exclusion and the holder chip are struck (C5-SPEC ruling 230): the harm detectors read the holder's account exactly like any player's, house bets included, and may flag it (an accepted consequence); RAPID_DEPOSIT_ESCALATION still reads real deposits and nothing is suppressed. Coverage gate: struck by D20.
- **Trigger:** The bot places 5+ bets between 00:00 and 06:00 EAT, and the holder tops up 3 times in an hour to fund it.
- **Expected:** - LATE_NIGHT_PLAY and CHASING_LOSSES are computed from personal (non-house) BET_PLACED rows only. The house filter is applied in the query, so the 10,000-row window is all personal activity.
- RAPID_DEPOSIT_ESCALATION still fires on real deposits (he is a real person).
- The User cell shows a 'House bot holder · <status> since <date>' chip; the owner also gets a bot link.
- Nothing is suppressed and no automatic action is taken.
- **Plan:** §9 AML and RG harm row (plan:465)
- **Evidence:** src/lib/server/responsible-gambling.ts:738 (findByUser 10,000 cap), :609-631 (deposit detector), :664 and :689 (BET_PLACED detectors); src/app/admin/compliance/page.tsx:609-636 (columns carry no context)
- **Fix:** - §9 row: harm context reads findByUser(userId, 10_000, {excludeHouseBets:true}) in both stores.
- The compliance harm table adds the holder chip.
- **Test:** test:house-bot-reports:
- 50 late-night house bets → no LATE_NIGHT flag
- 5 personal late-night bets → flag
- 3 deposits in an hour → RAPID flag with the holder chip rendered

test:dal-parity covers the new option.

### CRA-19 [partial] The FIU suspicious-activity report and the AML queue include the holder's funding deposits and withdrawals.
- **Trigger:** The holder deposits TZS 1,000,000 or more, or one of his withdrawals enters AML_REVIEW.
- **Expected:** - The rows are included unchanged (statutory), and the two-officer AML release is unchanged.
- Admins get the F7 alert.
- ~~The SAR gains a 'Context' column saying 'Designated house-liquidity account (since …)' when a designation window covers the transaction. Officers neither file uninformed suspicions nor suppress the row.~~
- **Plan:** §9 FIU row (plan:461); F7 (plan:121-124)
- **Evidence:** src/lib/server/reports/catalogue.ts:235-255 (DEPOSIT or WITHDRAWAL at or above the threshold, or AML_REVIEW), :301-309 (columns)
- **Fix:** ~~§9 FIU row: 'inclusion unchanged; add a Context column derived from HouseBot designation windows'.~~
- **Test:** ~~test:house-bot-reports: a 1.2M deposit inside the designation window gives a row with context; one outside gives blank context.~~
- ✅ **THE SAR HALF IS TESTED 2026-09-20 — `test:house-bot-reports` §13 (`13.0`–`13.5`, `13.CONTROL`), BOTH STORES.** `buildFiuSar` was named by NO file under `scripts/` before this (`grep -rn buildFiuSar scripts/` → 0), and `test:report-formats` says "FIU" only to forbid a false format claim on a button. §13 uses the TWIN shape: a designated holder and an identical ordinary player each make a 1.2M deposit; the holder's row is PRESENT (`13.1`) and has the same keys, trigger, status and amount as the twin's (`13.2`); no section carries a Context column (`13.4`, ruling 228); the whole rendered report names nothing house and carries no bot id (`13.5`). POSITIVE CONTROL `13.3`: a deposit ONE SHILLING under `AML_REVIEW_THRESHOLD_TZS` is ABSENT, so "the row is there" cannot pass over a builder that returns everything. ⚠️ The period is DERIVED from `currentPackPeriod()`/`packPeriodBounds()` — it is the PREVIOUS EAT month, so a fixture dated "now" would fall outside the report and the section would measure an empty population and pass. Seen red 2026-09-20: a holder-excluding filter in `buildFiuSar`, and a drifted threshold. The F7 half ships as `OWNER_MONEY` (`money-hook.ts:43`) and is already asserted at `test:house-bot-comms` `6.2`.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the FIU SAR carries no Context column (C5-SPEC ruling 228; W21 moot); its inclusion rule, the two-officer AML release and the F7 admin alert are untouched by D20. Coverage gate: partly struck by D20.

### CRA-20 [partial] The statutory monthly return (the GBT pack) for a month with house money.
- **Trigger:** An officer prepares the monthly pack.
- **Expected:** - Existing Aggregate financials rows and totals are unchanged.
- ~~New memo rows: 'of which: house liquidity stakes (in the GGR base)' (value and count), 'House liquidity net result (held in designated accounts; not operator revenue)', and 'Designated house accounts at period end'.~~
- The stale note becomes 'GGR = stakes − payouts − refunds'.
- ~~The provenance note names the Position and Transaction markers and the HouseBot tables.~~
- KYC, RG and provider sections are unchanged.
- The pack sha256 covers the new PDF.
- **Plan:** §9 buildGbtMonthly row (plan:462)
- **Evidence:** src/lib/server/reports/catalogue.ts:120-125 (financial rows), :186 (stale GGR note), :190-199 (provenance rule and text); src/lib/server/report-money.ts:155 (actual GGR formula)
- **Fix:** §9 gbt row: specify ~~the three memo rows,~~ the corrected GGR note ~~and the provenance sentence~~.
- **Test:** - test:house-bot-reports: the pack with a house fixture equals its no-marker twin on every existing row; ~~memo rows equal houseBotBook;~~ the note text is asserted.
- test:report-parity stays green.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the GBT monthly pack carries no house memo and no provenance sentence about house markers (C5-SPEC ruling 227; W21 moot); its statutory figures include house stakes as player activity (an accepted consequence). Coverage gate: partly struck by D20.

### CRA-21 [partial] Hold % and margin move because of house liquidity, and the Board reads it as a change in margin.
- **Trigger:** The house turns would-be one-sided refunds into matched, fee-bearing pools; the finance margin tile and the daily-ops margin change.
- **Expected:** - The statutory hold % stays GGR ÷ stakes over all rows. Margin tone logic is unchanged.
- ~~A delta 'House liquidity: X% of stakes' is shown beside /admin/finance 'Operator margin' and the daily-ops Margin tile.~~
- There is never a 'players-only GGR' figure.
- **Plan:** §9 summarise row (plan:459); finance row (plan:464)
- **Evidence:** src/lib/server/report-money.ts:169 (holdPct); src/lib/server/reports/catalogue.ts:645-646 and :699 (margin and 5% tone threshold); src/app/admin/finance/page.tsx:190
- **Fix:** ~~§9: add a houseShareOfStakesPct to MoneySummary.house and render it as the delta on both tiles.~~
- **Test:** test:house-bot-reports: holdPct is identical to the no-marker twin; ~~houseShare equals house stakes ÷ stakes~~.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** no house delta on either margin tile and no `MoneySummary.house` (C5-SPEC rulings 224–225); hold % stays GGR ÷ stakes over all rows and no players-only GGR exists. Coverage gate: partly struck by D20.

### CRA-22 [partial] The match-integrity report for markets with house participation.
- **Trigger:** The GBT integrity unit requests the review; a market holding a house stake was voided.
- **Expected:** - The Voided markets table gains ~~'House stake' and~~ 'Resolution path (single admin / two officers)'.
- ~~House-marked refund rows are flagged.~~
- ~~A new section: 'Markets with house liquidity that were voided or reversed on objection'.~~
- The stale 'two-officer resolution flow' note is corrected.
- Predictors are unchanged, ~~with the note 'includes house accounts' (D6)~~.
- **Plan:** §9 match integrity row (plan:462)
- **Evidence:** src/lib/server/reports/catalogue.ts:956-962 (market rows), :965-970 (refund rows), :1032 (stale two-officer note); src/lib/server/resolution-policy.ts:5-8 (single admin is the default)
- **Fix:** Spell out the §9 match-integrity row with the columns, section and note fix above.
- **Test:** test:house-bot-reports builds the report with a voided house market and asserts the columns, ~~the section row and~~ the note text.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the match-integrity report gains no house column, refund flag, house section or predictor note (C5-SPEC ruling 229's house parts; W22 moot). Coverage gate: partly struck by D20.

### CRA-23 [partial] A player asks the chatbot or support: 'Is the house betting against me?'
- **Trigger:** A chat widget question, the help FAQ, or an email to support.
- **Expected:** ~~The bullet inserted after chat.ts:147 says plainly:~~
- ~~50pick may place stakes from accounts it operates, to add liquidity~~
- ~~those stakes follow the same rules, cut-offs and fee, and can win or lose~~
- ~~the assistant does not know which accounts they are and never guesses~~
- ~~results are sealed against the public source named on the market, and any stakeholder can object within the window~~

Forbidden phrases: 'independent', 'cannot influence', 'never bets against you', and naming or confirming an account. ~~faq8a gains one matching sentence in en/sw/zh.~~ HOUSE-BOTS.md gets a support script: never confirm an account; escalate to the owner.
- **Plan:** §10 Chatbot (plan:476); i18n faq8a (plan:475)
- **Evidence:** src/app/_actions/chat.ts:143-147, :156 (resolution statement); src/lib/i18n-dict.ts:1950 (faq8a, en); docs/DATA-RETENTION.md:37 (there is no support ticket store)
- **Fix:** §10: ~~quote the exact bullet and faq8a sentence,~~ list the forbidden phrases, and add the support-script section to HOUSE-BOTS.md.
- **Test:** test:house-bot-disclosure: ~~the bullet is present;~~ the forbidden-phrase regex finds nothing in the prompt or in faq8a (3 locales); chat.ts:143-144 are unchanged.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** no disclosure bullet and no faq8a sentence (D19a); the chatbot discloses nothing and may never lie: a guard keeps "never bets against you", "independent", "cannot influence", "all stakes are from real players", "fully automated", "only automated", "no person decides", "no one at 50pick chooses" and naming or confirming any account out of the system prompt and faq8a in all three locales (D19d). The support script in HOUSE-BOTS.md stands. Coverage gate: counts through Commit 6's D19d forbidden-phrase assertions (C5-SPEC ruling 250).

### CRA-24 [partial] The Board disclosure draft, and the switch being turned ON before it is sent.
- **Trigger:** ~~The owner switches the master ON while BOARD-DISCLOSURE-HOUSE-BOTS.md is still 'DRAFT FOR ALI'.~~ ⛔ **STRUCK 2026-09-20 (owner ruling D21):** there is no such draft and none is owed, so this trigger cannot occur.
- **Expected:** ~~The draft follows the KYC-at-withdrawal format and covers:~~ ⛔ STRUCK 2026-09-20 (owner ruling D21): no draft is written, so nothing in the list below is built.
- what 50pick does
- an explicit request for written confirmation of the licence class
- levy treatment (house stakes are inside GGR)
- ~~the rules changed without 14-day notice~~
- the controls
- how to inspect (~~the house-liquidity report and~~ the audit actions)
- accepted risks: a single admin may resolve markets the house holds; consent is password-only; the holder sees house positions

~~The ON modal shows a non-blocking amber line, 'Board disclosure not recorded as sent', until the owner records the date (HouseBotControl.boardDisclosureSentAt, COMPLIANCE-audited).~~
- **Plan:** §10 Docs (plan:486); D1 (plan:19)
- **Evidence:** docs/BOARD-DISCLOSURE-KYC-AT-WITHDRAWAL.md:1-45 (format precedent); docs/F6-LIQUIDITY-DESIGN.md:249-251 (written GBT approval condition)
- **Fix:** - ~~§10: list the required sections of the draft.~~ ⛔ STRUCK 2026-09-20 (owner ruling D21).
- ~~§2: add the boardDisclosureSentAt column.~~
- ~~§8: add the ON modal line and a 'Record disclosure sent' owner action.~~
- **Test:** - test:docs passes.
- ~~test:house-bot-console: the ON modal fixture shows the line when the date is null and hides it once set; the record action writes one COMPLIANCE row.~~
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the draft points to no house report: ~~Commit 6's private Board draft must say that reports and filings treat house accounts as ordinary player accounts and carry no house memo~~ (the draft itself STRUCK 2026-09-20 by owner ruling D21) (C5-D20-REPLAN §4). Coverage gate: partly struck by D20.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** ~~the Board draft stays private and Ali decides if and when it is sent (D19b)~~ (STRUCK 2026-09-20 by owner ruling D21: no draft); D19 struck P1's disclosure tracking (PROGRESS.md "What D19 supersedes"), so there is no ON-modal "not recorded as sent" line and no record action. The rulebooks and Terms are not amended (D19a reverses D2/D7), so the draft has no rules-changed-without-notice section. Coverage gate: partly struck by D19; the rest counts through the Board draft (docs) — a draft STRUCK 2026-09-20 by owner ruling D21.

### CRA-25 [partial] The COMPLIANCE-DECISIONS entry: heading format and what it supersedes.
- **Trigger:** Commit 1 writes the decision of record.
- **Expected:** - Heading '## 2026-09-13 (third) · House bots …' (or the build date), placed newest first.
- The supersedes table names F6 §5 conditions 1–3 (GBT approval gate, ring-fenced accounting excluded from GGR, entity-aware conflict guard), UPDOWN D3/G2/G4, ~~the rulebook §8 bot lines and the Terms §10 notice~~. ⛔ **Superseded by D19a (Ali, 2026-09-16):** no rulebook or Terms text changes, so neither is superseded (C5-D20-REPLAN ruling 273).
- It restates that the fee stays a function of pools and outcome, never of who is betting.
- Do-not-restore lines: no officer-conflict block, and no exclusion of house rows from statutory figures.
- **Plan:** §10 Docs COMPLIANCE entry (plan:482)
- **Evidence:** docs/COMPLIANCE-DECISIONS.md:9 and :295 (two 2026-09-13 entries already), :2369-2370 (fee-identity note), :2607 (do not re-add a conflict block); docs/F6-LIQUIDITY-DESIGN.md:245-258
- **Fix:** Amend the §10 bullet with the heading-suffix rule and the explicit supersede and do-not-restore items above.
- **Test:** test:docs passes, and test:house-bot-disclosure greps for the heading suffix and the F6 §5 supersede row.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the rulebooks are not amended (D19a), so the entry supersedes no rulebook bot line: its Supersedes row for the published bot prohibition reads "nothing — reversed by D19a"; the heading, the fee restatement and the do-not-restore lines stand. Coverage gate: counts through `test:docs` on the COMPLIANCE-DECISIONS entry (C5-SPEC ruling 250).

### CRA-26 [partial] Rules and Terms version strings, and existing players' recorded acceptance, when the carve-out ships.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** struck whole — no carve-out ships, so the Rules and Terms keep their versions on `main`: no META move, no `TERMS_VERSION` bump and no announcement (D19a; W18 moot, D19e). Coverage gate: struck by D19 (an Exceptions row, C5-SPEC ruling 250).
- **Trigger:** Deploy of the carve-out text.
- **Expected:** - Rules and Terms META move to a version distinct from today's KYC '2026-09-13' (for example the deploy date, or '2026-09-13 rev 2'), identical across en/sw/zh.
- TERMS_VERSION is bumped, so new registrations record the new text.
- Existing players keep their acceptedTermsVersion; there is no re-acceptance gate, and that is stated.
- ~~Ali rules whether an in-app announcement goes out at deploy, since Terms §10 promises an in-app + SMS notice. The ruling is recorded in the COMPLIANCE entry.~~ ⛔ **Superseded by D19a (Ali, 2026-09-16):** no text changes and nothing is announced.
- **Plan:** D2/D7 (plan:20); §10 META (plan:478)
- **Evidence:** src/app/legal/rules/page.tsx:37-38 and src/app/legal/terms/page.tsx:42-45 (both 'Version 2026-09-13'); terms/page.tsx:222 (14-day in-app + SMS notice); src/lib/server/auth-service.ts:72, :440, :655 (TERMS_VERSION stamped at registration only)
- **Fix:** §10 META bullet: the version-string rule, the TERMS_VERSION bump, and the announcement decision added to D2.
- **Test:** test:house-bot-disclosure: META is equal across locales and differs from the previous value; TERMS_VERSION equals the Terms META version.

### CRA-27 [partial] A public feed leaks the house marker.
- **Trigger:** ~~Unauthenticated~~ calls to /api/fairness/recent, /results, /api/og/market/<id>, the ticker feed, the comments thread and the leaderboard.
- **Expected:** - No houseBotId, hb_ or hbi_ id, or hb: key appears in any public payload or HTML.
- Pools and counts include house money (D6).
- **Plan:** §12 test:house-bot-reports leak list (plan:520)
- **Evidence:** src/app/api/fairness/recent/route.ts:71-91 (explicit field list, with no position data today); src/lib/server/market-dal.ts:1231-1233 (leaderboard)
- **Fix:** Extend the plan:520 leak list with /api/fairness/recent, /results, /api/og/market, the ticker feed and the comments thread, plus a generic serialisation sweep.
- **Test:** test:house-bot-reports calls each route handler or view with a house fixture; the needles are absent. A positive control plants a needle and must be found.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the absence holds for every viewer — signed out, another player, a trigger player and the holder himself (C5-SPEC rulings 247–248); pools and counts still include house money (D6). Coverage gate: counts in its every-viewer form (C5-SPEC ruling 250).

### CRA-28 [partial] Two-admin authorization is switched ON later.
- **Trigger:** The owner enables resolution.two_admin_enabled from the resolver queue.
- **Expected:** - Every market, including house-held ones, needs stage 1 by officer A and stage 2 by a different officer B.
- ~~The house exposure display is unchanged, and~~ no officer-conflict block appears.
- The engine is unaffected; it never reads staged outcomes (I2).
- The fairness feed shows twoOfficer true.
- **Plan:** I10 (plan:41); I2 (plan:33)
- **Evidence:** src/lib/server/resolution-policy.ts:55-78; src/app/api/fairness/recent/route.ts:81; docs/COMPLIANCE-DECISIONS.md:2607
- **Fix:** Add a §12 assertion to test:house-bot-reports.
- **Test:** - test:house-bot-reports: with requireTwoOfficer=true, a house-held market resolves only after a stage 2 by a different officer, exactly like its no-house twin.
- test:two-admin and test:officer-conflict stay green.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no house exposure display (C5-SPEC rulings 192–194). Coverage gate: partly struck by D20.

### CRA-29 [partial] Audit chain continuity under high bot volume.
- **Trigger:** 5 bots at freqMaxPerDay 200 add about 1,000 bets a day; the nightly backup runs verifyChainFull.
- **Expected:** - Each house bet writes only the existing market.position.opened row, with houseBotId and intentId fields.
- There are no per-intent, per-skip or per-alert audit rows.
- Unique alert titles keep notification.deduped rows away.
- verifyChainFull reports valid: 1 genesis, 0 dangling, 1 tail.
- **Plan:** H5–H9 (plan:203)
- **Evidence:** src/lib/server/market-service.ts:1508-1522; src/lib/server/audit.ts:900-926 (graph checks); docs/DATA-RETENTION.md:229 (~11,500 rows a day baseline)
- **Fix:** Add an audit row-count assertion to §12 test:house-bot-caps.
- **Test:** test:house-bot-caps: a burst of 200 house bets → exactly 200 new market.position.opened rows, no other new rows except pause/alert rows, and verifyChain() is valid.

### CRA-30 [covered] The TRA/GBT levy identity holds with house money.
- **Trigger:** The daily ops report or monthly pack for a day with house wins and losses.
- **Expected:** - GGR = stakes − payouts − refunds over all rows (a turnover measure; house rows are inside it like any player's).
- TRA and GBT are READ from the booked `HOUSE:TRA_LEVY` / `HOUSE:GBT_LEVY` movement, never computed as rate × GGR (corrected 2026-09-26 after `8acf067c`; authority `docs/SESSION-PROMPT-FINANCE-SEAL.md` §5).
- The house net result is never added to or subtracted from GGR or NGR.
- **Plan:** §9 header (plan:456); test:house-bot-money (plan:514)
- **Evidence:** src/lib/server/report-money.ts:155-159; src/lib/server/reports/catalogue.ts:620, :640-641
- **Test:** test:house-bot-money 'all GGR = fee' (Postgres and memory)

### CRA-31 [covered] /admin/house reconciliation and the trial balance with house rows.
- **Trigger:** The owner opens /admin/house; the nightly trial balance runs.
- **Expected:** - The waterfall is unchanged (house winnings stay in PLAYER legs).
- ~~Memo rows show 'House bots — net result (included above)' and the open exposure.~~
- Trial-balance drift is 0, and the lifecycle drift alert never fires because of house activity.
- Player liability includes the holder's wallet.
- **Plan:** §9 /admin/house row (plan:463)
- **Evidence:** src/lib/server/house-ledger.ts:221, :147; src/lib/server/ledger.ts:908; src/lib/server/lifecycle.ts:94-111
- **Test:** test:house-bot-money: trial balance ties. ~~test:house-page: pins updated.~~
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** `/admin/house` gains no house marker card (C5-SPEC ruling 231); the waterfall, trial balance and liability are untouched by D20. Coverage gate: partly struck by D20.

### CRA-32 [covered] Finance page tiles with house activity.
- **Trigger:** /admin/finance for a period with house bets.
- **Expected:** - ~~Active players excludes house-only activity.~~
- ~~The Top-10 excludes house rows, and a 'House bots net' tile is added.~~
- GGR, NGR and Wallet liability include house rows.
- 'Held for unverified' includes an unapproved holder's winnings (a true figure).
- **Plan:** §9 analytics row (plan:460); finance row (plan:464)
- **Evidence:** src/app/admin/finance/page.tsx:90, :102-103, :185-200; src/lib/server/analytics.ts:173-176, :298-309
- **Test:** ~~test:house-bot-reports splits: all = players + house~~
- ✅ **TESTED 2026-09-20 — `test:house-bot-reports` §14 (`14.0`–`14.4b`, `14.PLANT`, `14.POS`), BOTH STORES.** No house-bot suite imported `src/lib/server/analytics.ts` at all before this. These are INCLUSION claims, so every figure is a BEFORE/AFTER DELTA EQUAL TO THE FIXTURE'S OWN AMOUNT, never a bare "greater than zero": wallet liability rises by exactly the holder's 3,100,000 (`14.1`); "Held for unverified" rises by exactly that and by exactly one account (`14.2`); active players moves by exactly one on the holder's own transaction (`14.3`); the Top-10 carries the holder with its own stake and no marker (`14.4`). PLANTED `14.PLANT`: a houseBotId-IS-NULL filter over the SAME snapshot through the SAME shipped `tallyWalletLiability` — one filter, no second implementation — must be REPORTED as a shortfall. POSITIVE controls: an ordinary player moves the same figure by the same amount (`14.POS`); a funded account with NO transaction today moves the count by zero and is ABSENT from the Top-10 (`14.3b`, `14.4b`). ⚠️ SCOPE, NAMED: activePlayers, the Top-10, walletLiabilityByStatus and the unverified basis. GGR and NGR move only on settled bet money and stay with the money suites. Seen red 2026-09-20 three ways: house wallets dropped from the liability, the holder dropped from active players, and the holder filtered out of the Top-10.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** `/admin/finance` counts a house account in active players and the Top-10 like any player's and gains no house tile (C5-SPEC rulings 224–225; PROGRESS L34 closed as correct under D20); GGR, NGR, wallet liability and 'Held for unverified' are untouched by D20. Coverage gate: partly struck by D20.

### CRA-33 [covered] Insights filters with house activity.
- **Trigger:** /admin/insights.
- **Expected:** - ~~The ledger loop skips marked rows (LTV, first bet, retention); deposits are kept.~~
- ~~Top markets' predictors come from participantSplit.players.~~
- The role filter is unchanged.
- **Plan:** §9 finance/insights row (plan:464)
- **Evidence:** src/lib/server/insights.ts:96-97, :107-126, :195
- **Test:** ~~test:insights pins updated, plus test:house-bot-reports~~
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** insights read house rows exactly like a player's — LTV, first bet, retention and top markets' predictors included — and no insights code changes (C5-SPEC ruling 224, class C). Coverage gate: struck by D20.

### CRA-34 [covered] RG report counts (roster and engagement) when the holder self-excludes or sets limits.
- **Trigger:** The holder self-excludes or sets a daily loss limit.
- **Expected:** - He is counted like any player in rgRosterCounts and the limit rows.
- The bot goes AUTO_PAUSED(SELF_EXCLUDED) with house_bot.auto_paused, never an rg.* action.
- The holder gets no liquidity notice for an RG pause.
- **Plan:** F6 table (plan:114); §4.6 mapper (plan:262, :274)
- **Evidence:** src/lib/server/analytics.ts:252-272; src/lib/server/reports/catalogue.ts:856-886
- **Test:** test:house-bot-designation: self-exclusion → AUTO_PAUSED. test:house-bot-reports: RG counts unchanged.

### CRA-35 [covered] Daily ops report: unique players and tickets.
- **Trigger:** The daily operations report for a day with house bets.
- **Expected:** - Sales, tickets, GGR and levies include house bets.
- ~~'Unique players' counts non-house bettors only.~~
- ~~A 'House liquidity bets' row shows count and stake.~~
- **Plan:** §9 buildDailyOps row (plan:462)
- **Evidence:** src/lib/server/reports/catalogue.ts:600-608, :684, :724
- **Test:** test:house-bot-reports
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** daily ops counts house bettors in Unique players and adds no house row (C5-SPEC ruling 224); sales, tickets, GGR and levies include house bets. Coverage gate: partly struck by D20.

### CRA-36 [covered] The AML suspicious-bet scan sees bot velocity.
- **Trigger:** The bot places 100+ bets in 24 hours.
- **Expected:** - ~~Marked rows raise no VELOCITY or STAKE_SPIKE flag.~~
- ~~The holder's personal bets are still analysed against their own median.~~
- **Plan:** §9 AML row (plan:465)
- **Evidence:** src/lib/server/analytics.ts:487-493, :524
- **Test:** ~~test:house-bot-reports: AML exclusion~~
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the AML suspicious-bet scan reads house bets like any player's and may flag the account (an accepted consequence; C5-SPEC ruling 230). Coverage gate: struck by D20.

## future (34)

### FS-01 [gap] A new product line (Maswali jackpot, fixed-odds, multi-event) is stored as a PredictionMarket row with a new productLine value and staked through buyPosition. The DAL turns every productLine that is not "UPDOWN" into "MARKET". A bot scoped to polls, and the post-commit trigger, would therefore treat the jackpot as a YES/NO poll and counter, fill or open on a product whose licence class is still unconfirmed.
- **Trigger:** A future commit adds productLine 'MASWALI' / 'FIXED' / 'JACKPOT' and reuses buyPosition. Or a 'Demo · ' market is live.
- **Expected:** No intent and no house bet on any market whose RAW productLine is not exactly 'MARKET' or 'UPDOWN', or where isDemoMarket is true. The trigger filter drops it silently: the market is out of every bot's scope by construction. A direct placeHouseBet re-reads the raw productLine inside the market lock (H3) and refuses `house_product_not_allowed`, with no money moved. The mapper sets SKIPPED(PRODUCT_NOT_SUPPORTED). One AlertOnce per product per EAT day goes to admins by bell and email: "House bots ignored a stake on an unsupported product (JACKPOT). No stake moved. Enabling a new product needs a code change and a compliance decision." Nothing goes to the holder. The rules form lists only 'Up & Down' and 'Polls', rendered from an exhaustive HOUSE_PRODUCTS record.
- **Plan:** §5 Scope 'products (Up & Down / polls)'; F4; §4.1 market-view.ts; §3 H3
- **Evidence:** src/lib/server/market-dal.ts:158 (`productLine: r.productLine === "UPDOWN" ? "UPDOWN" : "MARKET"`; same coercion at :638, :1027, :1100); src/lib/server/market-service.ts:189 (ProductLine = "MARKET"|"UPDOWN"); src/lib/server/market-service.ts:1102 (only UPDOWN gets its own stake bounds); src/lib/server/market-service.ts:348-350 (isDemoMarket); docs/COMPLIANCE-DECISIONS.md:1443-1447 (Maswali licence question D-1 unanswered)
- **Fix:** §4.1: market-view.ts reads the raw `productLine` column through an explicit select, never the coerced StoredMarket. Add `HOUSE_PRODUCTS = {MARKET:'polls', UPDOWN:'updown'} as const` in constants.ts. Any other raw value, or isDemoMarket, means no intent. §3 H3: re-read the raw productLine under `market:<id>` and refuse with the new ~~registered~~ reason `house_product_not_allowed` ~~(en/sw/zh copy)~~. §4.6 row → SKIPPED(PRODUCT_NOT_SUPPORTED). Add the EngineCode and its feed-copy row. HOUSE-BOTS.md rule: 'A new product line is default-deny. Enabling it needs a COMPLIANCE-DECISIONS entry plus a code change.'
- **Test:** test:house-bot-engine (real PG): a market with raw productLine 'JACKPOT' and an ACTIVE poll-scoped bot; a real player bet creates 0 intents and 0 marked positions. A direct placeHouseBet returns house_product_not_allowed and the wallet and pools are unchanged. A 'Demo · x' market creates no intent. red:house-bot-engine: removing the raw check must fail this assertion, with an unmutated control.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** every `house_*` refusal is a server-only reason with no sentence in the player dictionary (C4 ruling 148); the default-deny rule stands. Coverage gate: partly struck by D19.

### FS-02 [partial] Owner's explicit ask: when the holder changes his password, 50pick must ask for the new one. Today the plan notices the mismatch only when a bet fires (H2), on Start or on re-verify. An idle bot (outside its schedule, no triggers) stays ACTIVE on the console for hours with stale consent. Future ways to write a password would not be hooked either: SMS OTP reset once SMS is live, passkeys, sign-in with Google, a scrypt-parameter or argon2 rehash, or erasure nulling the hash.
- **Trigger:** The holder uses Account settings, a reset link, or an officer temp password. Later: an SMS reset, a hash upgrade, or erasure.
- **Expected:** Detection within one planner pass (≤15 s), plus an immediate fire-and-forget hook from every password writer, for every non-REMOVED bot:
- Status: ACTIVE or PAUSED becomes AUTO_PAUSED(PASSWORD_CHANGED). PENDING and CLAIMED intents are CANCELLED. A HouseBotEvent is appended and the COMPLIANCE audit `house_bot.auto_paused` is awaited.
- Admins, bell and email: "Bot A paused — the account password changed. Ask the holder for the new password, then Re-verify."
- ~~Holder, bell and push (en/sw/zh): "50pick paused liquidity stakes because your password changed. If you still agree, give 50pick your new password."~~
- Console strip: shows the reason and a Re-verify button. The password Modal is labelled "Enter the account's new password". The old password is refused and counts toward the holder's lockout.
- Success moves to PAUSED(MANUAL), never straight to ACTIVE, and then Start is available.
- An officer temp reset blocks re-verify with "Ask the holder to change it in Account settings".
- A null hash becomes AUTO_PAUSED(NO_PASSWORD), which blocks.
- A hash-format upgrade counts as a change (the safe direction).
- **Plan:** I9; §3 H2 house_consent_stale; F6 table; §6 password check; §4.2 planner duties
- **Evidence:** src/lib/server/password-reset.ts:72-76 (passwordFingerprint = sha256(passwordHash) sliced to 16 hex); src/lib/server/password-reset.ts:229-253 (consumeResetToken), :260-283 (adminResetPassword), :289-337 (changePassword): none emits a hook or revokes sessions, they only call alertPasswordChanged :30-38; src/lib/server/crypto.ts:165-175 (fixed scrypt keylen, so any parameter change rehashes); src/lib/server/sms.ts:89-113 (SMS not live today)
- **Fix:** §4.2 planner: add a 'fingerprint sweep of all non-REMOVED bots each pass'. Add `onPasswordHashWritten(userId)` (dynamic import, not awaited) and call it from consumeResetToken, adminResetPassword, changePassword and erasure. Add pause reason NO_PASSWORD with its way out (the holder sets a password, then Re-verify). Add guard `test:house-bot-password-writers`: it walks src for `passwordHash:` inside create/update calls and requires each file to call the hook; the allowlist may only shrink. Put the exact copy above into the HOUSE-BOTS.md alert matrix.
- **Test:** test:house-bot-designation:
- changePassword while the bot is ACTIVE with its schedule window closed → AUTO_PAUSED within one planner tick, intents CANCELLED, exactly 1 admin alert ~~and 1 holder notice~~.
- Re-verify with the old password is refused and attemptsBeforeLock decrements.
- Re-verify with the new password → PAUSED(MANUAL), still not ACTIVE.
- Walker control: a fixture file writing passwordHash without the hook turns the test red.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice when his bot pauses (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### FS-03 [partial] Another session adds a refusal to buyPositionInner with a new reason or code (e.g. geo_blocked, a per-product pause, a per-bet RG stake cap, or kyc_* returning). The plan's mapper is `Record<HouseBetOutcomeKey, Action>` over a hand-listed key set. The new reason compiles, lands on FAILED(UNMAPPED) for every intent, and the bot keeps planning and failing, one alert per day.
- **Trigger:** Any commit that adds `reason: "x"` or a new `code:` to the bet path, including via ternaries or computed values.
- **Expected:** The build fails at compile time until the new outcome is classified. At runtime, any outcome the mapper doesn't know:
- The intent becomes FAILED(UNMAPPED), and after the first occurrence the bot becomes AUTO_PAUSED(UNMAPPED_REFUSAL), not a stream of failures.
- Admins, bell and email: "Bot A paused: the bet service refused with a reason house bots don't handle yet (x). No stake moved."
- ~~The holder gets the paused notice.~~ A COMPLIANCE audit row is written.
- Way out: Start is enabled only after a deploy maps the reason (the version pin changes).
- **Plan:** §4.6 outcome mapper; §12 test:house-bot-engine 'mapper covers every HouseBetOutcomeKey'
- **Evidence:** src/lib/failure-reasons.ts:58-105 (bet-path reasons are hand-written union members, no exported tuple); src/lib/failure-reasons.ts:255 (REASONS is Record<FailureReason,…>, so it grows with the union but not with a mapper); src/lib/server/market-service.ts:997 and :1089-1092 (refusals with a code but no reason); src/lib/server/market-service.ts:1117 (reason chosen by ternary); src/lib/server/market-service.ts:1170 (computed `satisfies FailureReason as FailureReason`); scripts/failure-reasons.test.mts:549-603 (§8c literal-reason walker precedent)
- **Fix:** failure-reasons.ts: export `BET_PATH_REASONS = [...] as const` and derive the bet-path part of FailureReason from it. Define `HouseBetOutcomeKey = 'ok' | BetPathReason | HouseReason | 'code:BUSY' | 'code:NOT_FOUND' | 'code:INVALID' | 'code:SELECTION_CLOSED' | 'thrown'`. The mapper uses `satisfies Record<HouseBetOutcomeKey, Action>`. The buyPositionGuarded return type narrows `reason` to BetPathReason | HouseReason. Change the UNMAPPED action to AUTO_PAUSED(UNMAPPED_REFUSAL) as a new pause reason. HOUSE-BOTS.md rule: 'a new bet refusal = BET_PATH_REASONS entry + mapper row in the same commit'.
- **Test:** test:house-bot-engine:
- (a) The typecheck fixture `house-bot-mapper.typecheck.ts` uses @ts-expect-error when a dummy reason is added to BET_PATH_REASONS without a mapper row.
- (b) A source walker over buyPositionInner/buyPositionGuarded collects every `reason:` literal (ternary branches included) and every `code:` literal, and asserts each is a HouseBetOutcomeKey. Control: a planted `reason:"zz_new"` fixture makes it red.
- (c) An injected `{ok:false, reason:'zz'}` → FAILED(UNMAPPED), bot AUTO_PAUSED, exactly 1 alert.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice when his bot pauses (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### FS-04 [gap] Later the owner configures a paid-exit-only model: free grace 0, paid window 10 min. Today cashOutValue offers no exit at all when grace is 0, because runway requires `graceMs > 0`. The plan's extracted `exitWindowClosesAt` = placedAt + (grace+paid)·60 s 'when closesAt − placedAt ≥ grace' drops that condition. Sanctioned change (k) makes cashOutValue use this function, so players would silently get a paid exit the platform never offered. That is a player-path money change, which breaks I1.
- **Trigger:** /admin/config sets freeExitGraceMinutes 0 and paidExitWindowMinutes > 0, and new polls freeze that snapshot.
- **Expected:** - Grace 0, paid 10: cashOutValue output is identical to today (sellable false, reason TOO_SHORT). exitWindowClosesAt returns placedAt, and the COUNTER dueAt is placedAt + delay.
- Grace 5, paid 2: exit closes at placedAt + 7 min when runway ≥ 5 min, otherwise at placedAt.
- Rates always come from the market's frozen snapshot (ratesFor), never live config.
- Player SellButton states unchanged.
- **Plan:** §3 sanctioned change (k); F4 COUNTER timing; §12 test:house-bot-rules effectiveTiming cases
- **Evidence:** src/lib/server/market-service.ts:2657-2659 (frozen ratesFor snapshot, window = grace + paid); src/lib/server/market-service.ts:2671 (`const hadRunway = graceMs > 0 && closesAt - placedAt >= graceMs`); src/lib/server/market-service.ts:2687 (sellable = hadRunway && withinWindow && !bonusFunded); src/lib/server/market-config.ts:217-218 (defaults 5/0, admin-editable at :606-613); plan line 193 (formula without grace > 0)
- **Fix:** Amend (k) to read: `exitWindowClosesAt(position, market)` = (graceMs > 0 && closesAt − placedAt ≥ graceMs) ? placedAt + graceMs + paidMs : placedAt, with rates from ratesFor(market) and closesAt = selectionClosedAt ?? resolutionAt. State that the cashOutValue refactor must be output-identical, and add this case to the §3 'unchanged output' list.
- **Test:** test:house-bot-seam: table over grace {0,5} × paid {0,2,10} × runway {< grace, ≥ grace} × bonusStake {0, >0}. cashOutValue deep-equals a pre-refactor golden snapshot, and exitWindowClosesAt > placedAt exactly when sellable could ever be true. red:house-bot-money mutation: dropping `graceMs > 0` must fail this assertion.

### FS-05 [gap] 50pick later introduces leaderboard prizes, a tournament, streak rewards or cashback on losses. The public leaderboard SQL groups every settled position by userId with no filter. House-marked wins would lift the holder's rank, and a real prize would be paid on 50pick's own liquidity stakes to the holder personally, displacing a real player.
- **Trigger:** Any feature that pays money or rewards based on rank, volume, streaks or losses computed from Position rows.
- **Expected:** Every money-bearing reward is computed only over positions with houseBotId IS NULL. The D6 display stays unchanged: the bot still appears on the public board. If the holder's non-house record qualifies on its own, he is paid on that alone. ~~The prize-run audit payload records `excludedHousePositions`. Admins see an 'excluded house positions: N' line on the prize run.~~
- **Plan:** D6; §9 'Leaderboard … unchanged (D6), pinned by a test'
- **Evidence:** src/lib/server/market-dal.ts:1225-1235 (leaderboard SQL: `where p."status" <> 'OPEN'`, group by userId, no house filter); src/lib/server/market-dal.ts:1249-1255 (player counts, unfiltered); src/lib/server/market-dal.ts:693-716 (memory twin)
- **Fix:** ~~Add the option `excludeHouse?: boolean` to positionStore.leaderboard and the memory twin now (default false, the D6 behaviour). Export `NON_HOUSE_POSITION_SQL`.~~ Add a rule to COMPLIANCE entry and HOUSE-BOTS.md: 'No reward, prize, cashback or tournament may be computed on house-marked positions; public display may include them (D6).' ~~New guard `test:house-bot-reward-exclusion`: it walks src for `group by p."userId"`, `positionStore.leaderboard(` and reward-credit call sites. Each must be annotated `display-only (D6)` in an allowlist that may only shrink, or pass excludeHouse:true.~~
- **Test:** ~~test:house-bot-reward-exclusion: a walker with a positive control (a fixture with an unannotated userId aggregate goes red). test:house-bot-reports: `leaderboard({excludeHouse:true})` drops marked rows, and the default output is unchanged in both stores (dal-parity).~~
- ✅ **CLOSED BY THE SAME SINGLE GUARD AS CRA-12, 2026-09-20 — `test:house-bot-reports` §12.** Two rows, ONE requirement (R4's recorded rule) and ONE test, counted ONCE. ⛔ `test:house-bot-reward-exclusion` above is struck by D20 and `package.json` declares no such key — it is a closed reference, never a live owner. The D6 display half is already asserted at `11.247.c4`.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** no `excludeHouse` option, `NON_HOUSE_POSITION_SQL`, reward walker or prize-run house line is built or owed (C5-SPEC rulings 233–234 and 256); the rule that no reward pays on house stakes stays in the docs (`docs/HOUSE-BOTS.md` "R4 — no rewards on house stakes" and its `docs/COMPLIANCE-DECISIONS.md` line), and the bot stays on the public board (D6). Coverage gate: partly struck by D20.

### FS-06 [gap] The Board rules house participation unlawful, or Ali ends the programme. Today's plan offers a DB master switch (which any ADMIN can turn back on), per-bot Remove, and an env var. There is no terminal state, no single action removing every bot, no stated rule for open house positions, and no switch for the public disclosure text.
- **Trigger:** A GBT letter or an owner decision to sunset house bots.
- **Expected:** One owner action, 'Retire house bots' (Modal: reason 5–300 characters, typed `RETIRE`), does all of the following in one transaction:
- master OFF with offCause SUNSET;
- every non-REMOVED bot → REMOVED(SUNSET);
- every PENDING or CLAIMED intent → CANCELLED;
- HouseBotEvent SUNSET appended;
- awaited COMPLIANCE audit `house_bot.sunset` recording bot count, cancelled intents and open house exposure per market.

Notifications:
- Admins, bell and email: "House bots retired. No bot will place a bet. Open house stakes (TZS X across N markets) settle normally."
- ~~Each holder (en/sw/zh): "50pick has stopped liquidity stakes from your account. Open stakes settle to your wallet as normal."~~

After retirement:
- Open house positions settle normally. A pari-mutuel pool can't void one position. An optional per-market emergencyVoid list is displayed, never automatic.
- A code-level product state `houseBots: WITHDRAWN` makes ON impossible by DB edit, the engine doesn't boot, and the console renders read-only.
- ~~Reports keep their house lines.~~ ~~The public disclosure line flips to past tense with a META bump.~~
- Markers, intents and events are kept.
- **Plan:** D1; F8 Remove; F9 kill switch; §4.2 HOUSE_BOT_ENGINE=false; §10; §13
- **Evidence:** src/lib/feature-state.ts:16-20 ('An operator cannot switch a withdrawn feature back on by editing a row'); src/lib/feature-state.ts:69 and :88-92 (FeatureState table); src/lib/feature-state.ts:110-118 (env override falls back to the shipped constant); src/lib/server/rbac-guard.ts:208-225 (requireOwner = any ADMIN, so any ADMIN can flip a DB switch back); src/lib/server/market-service.ts:4061 (emergencyVoidMarket: whole-market refund only)
- **Fix:** Add `houseBots` to FeatureName in feature-state.ts (ACTIVE at release). It is consulted by startHouseBotEngine, setHouseBotSwitchAction(ON), startHouseBotAction and designateHouseBotAction. Add `retireHouseBotsAction` (requireOwner), offCause SUNSET, and remove reason SUNSET. Add a HOUSE-BOTS.md runbook 'Sunset' covering the export of open exposure, ~~the disclosure flip checklist,~~ and data retention. `ops:house-bots-status` prints open house exposure per market.
- **Test:** test:house-bot-console: retire → all bots REMOVED, intents CANCELLED, 1 audit row, ~~N holder notices,~~ and a later ON attempt is refused. withdrawn-features-style section: FEATURE_HOUSEBOTS=WITHDRAWN → engine not started, ON refused, ~~reports still show house lines~~. Open marked positions settle with markers intact, and the trial balance ties.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** reports carry no house lines to keep. Coverage gate: partly struck by D20.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no public disclosure text to switch or flip and no META to bump (D19a), and the holder receives no notice (D19c; C4 ruling 149); retirement, the admin alert, WITHDRAWN and the kept records stand. Coverage gate: partly struck by D19.

### FS-07 [gap] A later release adds rules fields (per-chain amounts, a new mode) as rules v2. During Railway's 60 s deploy overlap, or after a rollback, an old container reads v2 JSON. A missing or renamed field silently takes a default, possibly a permissive one, and bets run under rules the owner never saved. New code reading v1 rows without a migrator would guess.
- **Trigger:** Deploy of a rules schema change, deploy overlap, or rollback.
- **Expected:** Rules JSON carries `schemaVersion`.
- **Higher version than this code knows:** the reader doesn't fire and doesn't pause. The intent is requeued PENDING with nextAttemptAt (code RULES_FROM_FUTURE) and the planner skips that bot. A deploy overlap never auto-pauses bots.
- **Lower or invalid version with no pure migrator:** bot → AUTO_PAUSED(RULES_OUTDATED or RULES_INVALID with field). Admins get bell and email: "Bot A is paused: its saved rules are in an older format. Open Rules, review and save." The holder isn't notified.
- **Migration:** runs only inside the rules form via a pure `migrateRules(vN→vN+1)`. It is shown to the owner, and saving it bumps rulesVersion. The engine never writes rules back.
- Every new field's default is the deny or narrowest value.
- The same applies to global limits (`limitsSchemaVersion`).
- **Plan:** §2 HouseBot `rules Json + rulesVersion`; §5 'behaviour (JSON v1)'; §2 pause-reasons.ts list
- **Evidence:** railway.json:6-7 (overlapSeconds 60, drainingSeconds 30); src/lib/server/updown-config.ts:339 and :425-429 (version reconcile writes back via `void saveConfig`, a pattern not to copy for money rules); src/lib/server/market-config.ts:450 and :533 (CONFIG_VERSION precedent); plan line 153 (rulesVersion is the CAS counter, not a schema version)
- **Fix:** §2: add a required int `rules.schemaVersion`, distinct from rulesVersion, and `limitsSchemaVersion` on the control row. rules.ts exports `HOUSE_RULES_SCHEMA_VERSION` and `parseHouseBotRules(json) → {ok:true, rules} | {ok:false, code:'RULES_FROM_FUTURE'|'RULES_OUTDATED'|'RULES_INVALID', field?}`. fire.ts and planner.ts call it first. pause-reasons.ts gains RULES_OUTDATED and RULES_INVALID, with way out 'Rules tab → save → PAUSED(MANUAL) → Start'. HOUSE-BOTS.md rule: 'a schema bump may never widen scope or caps by default'.
- **Test:** test:house-bot-rules:
- A v1 fixture parses.
- v99 → RULES_FROM_FUTURE; fire leaves the intent PENDING and the bot's status unchanged.
- A missing required field → RULES_INVALID auto-pause naming the field.
- Migrator property test: every v1→v2 output has scope ⊆ input and caps ≤ input.

### FS-08 [partial] A future RG, geo, device or terms gate is written in the checkSessionTimeLimit style, where missing context means no opinion. House bets carry no session, IP, device or playStartedAt, so the gate silently exempts every house bet. Examples: a region block, 'accept terms vN before staking', a device-bound limit.
- **Trigger:** A new gate added to the shared bet inner that reads request or session context.
- **Expected:** Every gate receives an explicit BetContext union. For `{kind:'house'}`, each context-dependent gate must state its answer in code: evaluate against the holder's account state, or refuse. A gate that can't evaluate for house refuses `house_context_unsupported`. The mapper sets AUTO_PAUSED(CONTEXT_GATE), admins get bell and email "Bot A paused: a new betting check needs information house bots don't have (gate X)", ~~and the holder gets the paused notice~~. Account-level gates (maintenance, lockout, status, loss limit, wallet, bounds) behave identically for house and player.
- **Plan:** §3 'buyPosition and placeHouseBet share one private buyPositionGuarded(userId, opts, house?)'; I1
- **Evidence:** src/lib/server/responsible-gambling.ts:426-436 (`if (!playStartedAt) return null`); src/lib/server/market-service.ts:842-854 (BuyOpts.playStartedAt optional: 'Absent ⇒ no session clock ⇒ the limit has no opinion'); src/lib/server/market-service.ts:973-990 (session-limit gate)
- **Fix:** §3: replace `house?` with `ctx: {kind:'player'; playStartedAt?: number} | {kind:'house'; botId: string; intentId: string}` and pass ctx to every gate helper that reads context. Record the ruling in HOUSE-BOTS.md: a house bet neither advances nor is refused by the holder's play-session clock. Add the rule: 'A new gate that treats missing context as allow must switch on ctx.kind exhaustively (never).' Add reason `house_context_unsupported` and pause reason CONTEXT_GATE.
- **Test:** test:house-bot-seam gate-parity table: fixtures for maintenance, cooling-off, SUSPENDED, CLOSED, wallet frozen, own loss limit, stake bounds and closed market. placeHouseBet returns the same reason as buyPosition for each. A typecheck fixture with a ctx-taking helper that ignores 'house' fails the never check.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice when his bot pauses (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### FS-09 [gap] Ali adds a second ADMIN (an ops manager), or later splits out an OWNER role. requireOwner accepts any ADMIN. That admin could designate his own alt PLAYER account (whose password he knows), switch the master ON, raise caps and remove bots. The plan sends admins no alert on designation, verify, Start, rules or limits saves, or Remove, so Ali wouldn't learn of it. If an OWNER role appears, the hard-coded `listByRoles(['ADMIN', …])` recipient lists may miss him.
- **Trigger:** A second ADMIN account (bootstrap phones are a set), or a role enum change.
- **Expected:** Every house action passes one `requireHouseOwner()`. Today it equals requireOwner; after a role split it follows the owner predicate in one place.
- **Roster alerts:** DESIGNATED, VERIFIED, STARTED, RULES_SAVED, LIMITS_SAVED, SWITCH_ON/OFF and REMOVED each send all house-owner recipients a bell and email, never capped. Each carries actor, bot and before→after values, e.g. "Bot A: daily loss cap raised 50,000 → 200,000 by Juma M. at 14:02 EAT".
- **Recipients:** resolved once by `houseBotAlertRecipients()` using the same predicate as the guard.
- **Designation warning row:** "The designating officer is linked to this account (same email / recruiter)" when detectable.
- **Plan:** §6 Owner actions (each starts with requireOwner); §7 notifications table; §8 Nav ownerOnly
- **Evidence:** src/lib/server/rbac-guard.ts:208-225 (`me.role !== "ADMIN"` means any ADMIN is 'Owner'); src/lib/server/roles.ts:93-96 (isAdmin = ADMIN); src/lib/server/auth-service.ts:629-630 (adminBootstrapPhones() is a Set); src/lib/server/notification-service.ts:967, :1548, :1592, :1635, :1690, :1987 (hard-coded role lists)
- **Fix:** §6: wrap the actions in `requireHouseOwner`, exported from rbac-guard.ts next to requireOwner. §7: add `notifyAdminsHouseBotRoster` (bell and email, uncapped, a unique title per event) for the kinds above, including cap diffs, and register it in comms-registry. alerts.ts: add the single recipient resolver. §6 eligibility: warning row when designatedById equals the target's recruitedBy or they share an email. Add a HOUSE-BOTS.md 'Role split' section.
- **Test:** test:house-bot-comms: a second ADMIN designates → both ADMINs receive a DESIGNATED alert. A rules save raising caps → the alert body contains the diff. test:house-bot-console: requireHouseOwner refuses the 8 non-owner roles with a SECURITY row, and recipients equal the set passing the guard.

### FS-10 [gap] Owner adds a 1-min or 120-min Up & Down duration (both divide 1440), a new asset (e.g. an index with its own trading session), or re-enables a chain. The rules default 'UD chains: all' silently puts every Up & Down bot on the new chain. The FILL lead upper bound 'shortest chain D·60 − 92 − 20' goes negative for D=1. The literal duration validator '⊆ 3/5/10/15/30/60' refuses re-saving.
- **Trigger:** ALLOWED_DURATIONS edit, a new UpDownAsset enabled, a chain started.
- **Expected:** Scope stores explicit chain keys (asset + duration) captured at save. A new chain is out of scope for every bot until the owner ticks it. The roster strip shows a neutral Callout: "New Up & Down chain BTC 1-min isn't in any bot's scope", linking to rules. The duration list comes from ALLOWED_DURATIONS. FILL and OPENER bounds are computed per selected chain; where they are infeasible, that mode is disabled for the chain with the reason ("1-min rounds open after their FILL lead — not available"). A chain with a closed market session has no round and no plan.
- **Plan:** §5 Scope 'UD chains | all | durations ⊆ 3/5/10/15/30/60'; FILL lead bound; OPENER delay bound
- **Evidence:** src/lib/updown-durations.ts:85 (ALLOWED_DURATIONS literal); src/lib/updown-durations.ts:97-99 (landsOnGrid: any divisor of 1440 is admissible); src/lib/updown-durations.ts:210-213 (resultPhaseMinutes); src/lib/server/market-calendar.ts:74-82 (non-crypto categories map to fx-metals, so an index needs its own session kind); src/lib/server/updown-service.ts:1563-1565 (closed-session boundary skip)
- **Fix:** §5: replace 'all' with `chains: string[]` (explicit keys). A 'Select all current chains' button fills the list and doesn't save. Import ALLOWED_DURATIONS instead of the literal. rules.ts computes per-chain feasibility. The planner computes 'chains in no bot's scope' for the Callout.
- **Test:** test:house-bot-rules:
- A fixture ALLOWED list gains 1 and 120: the saved bot's scope is unchanged.
- FILL on 1-min returns a field error; 120-min is feasible.

test:house-bot-engine: a player bet on the new chain creates no intent and no SKIPPED row (out of scope).

### FS-11 [gap] A poll category such as 'politics' or 'elections' is added to MARKET_CATEGORIES. The rules default 'poll categories: all' auto-includes it, so the house stakes on election markets that law, the Board or reputation may put off-limits.
- **Trigger:** Edit of src/lib/markets/categories.ts.
- **Expected:** Category scope is an explicit saved list. A new category is excluded until the owner ticks it. A Callout reads "New poll category Politics isn't in any bot's scope". HOUSE-BOTS.md lists which categories need a COMPLIANCE-DECISIONS entry before inclusion. Category labels in the house feed and form are typed `Record<MarketCategory, string>`, so a new category forces a label.
- **Plan:** §5 Scope 'poll categories | all | valid set'
- **Evidence:** src/lib/markets/categories.ts:24-31 (closed MarketCategory union and the canonical list 'every surface derives from')
- **Fix:** §5: `categories: MarketCategory[]` stored explicitly. The validator derives the valid set from MARKET_CATEGORIES. feed-copy.ts and the rules metadata use `satisfies Record<MarketCategory, …>`.
- **Test:** test:house-bot-rules: a fixture with an extra category → an existing bot excludes it and its label is required at compile time. test:house-bot-engine: a poll in the new category → no intent.

### FS-12 [partial] A Sentinel v2 column, a staged-verdict field, or an admin 'expected outcome' is added to PredictionMarket. StoredMarket already carries every sentinel field, and the plan's market-view reads 'market fields'. test:house-bot-info-edge only scans the import graph, so a `m.sentinelOutcome` read inside an engine module would pass, breaking I2 silently.
- **Trigger:** A schema or DAL change that adds insider fields to the market row or the board model.
- **Expected:** The engine sees only a `PublicMarketView` projection built by a Prisma select of `HOUSE_MARKET_FIELDS`: id, raw productLine, category, status, yesPool, noPool, selectionClosedAt, resolutionAt, createdAt, titleEn (feed only), plus round opensAt, openPrice, up/down targets and livePrice from the public board. A new column stays invisible until it is added to that list in a reviewed commit. Engine modules can't import the StoredMarket type.
- **Plan:** I2; §4.1 market-view.ts 'via getBoard/getRoundDetail public models and market fields'; §12 test:house-bot-info-edge
- **Evidence:** src/lib/server/market-dal.ts:141-155 (StoredMarket maps sentinelOutcome, Evidence, Reasoning, SourceUrl, Confidence, ClosedAt, Determined, resolutionMode, resolveClaimedAt); plan lines 220 and 518 (import-graph scan only)
- **Fix:** §4.1: market-view.ts exports `HOUSE_MARKET_FIELDS` and returns PublicMarketView. Add a source pin: no `StoredMarket` import in trigger, planner, decide, worker, fire or outcomes. Extend info-edge with a field-level check: HOUSE_MARKET_FIELDS deep-equals a pinned list, and a token walker fails on `sentinel`, `resolvedOutcome`, `resolutionEvidence` or `resolveClaimedAt` in engine modules.
- **Test:** test:house-bot-info-edge: pinned field list. A planted `m.sentinelOutcome` in a fixture engine file goes red. Positive control.

### FS-13 [partial] The bonus product is relaunched (FEATURE_BONUS=ACTIVE or the constant flips) with AUTO cashback, free-bet tokens or grants. The holder's bot-funding top-ups earn cashback into bonusBalance. A house stake while cash is short would reach bonus funding; the plan refuses that only after computing a bonus part. New funding sources (tokens) may bypass that check.
- **Trigger:** Bonus product state set to ACTIVE, or a new stake-funding source added.
- **Expected:** - House stakes are funded from `balance` only. The bonus part is 0 by construction (fundingPolicy CASH_ONLY).
- balance < stake → `house_cash_only` → SKIPPED plus one AlertOnce per bot per day: "Bot A skipped: cash balance TZS 1,000 is below the stake. Bonus money can't be used."
- No wagering accrual and no cashback-on-loss accrual on marked positions.
- The holder's AUTO cashback on his own deposits stays his, and for an ACTIVE bot an OWNER_MONEY event shows "bonus credited X (not usable by bots)".
- Any new funding source refuses ctx.kind 'house'.
- **Plan:** I7; §3 H2 house_cash_only; H5–H9 skip recordWageringLocked; F7 events; §12 test:house-bot-money 'no bonus'
- **Evidence:** src/lib/feature-state.ts:88-92 (bonus WITHDRAWN) and :110-118 (FEATURE_BONUS env override); src/lib/server/wallet-service.ts:491-512 (AUTO cashback credits the bonus wallet on each confirmed deposit); src/lib/server/market-service.ts:1219-1233 (real-first then bonus funding); src/lib/server/market-service.ts:1453 (recordWageringLocked)
- **Fix:** §3 H2: for ctx.kind 'house', set realPart = stake and bonusPart = 0 before the affordability check, and refuse house_cash_only when balance < stake. F7: add BONUS_CREDIT to the events while ACTIVE. HOUSE-BOTS.md rule: 'Any new stake-funding source (free bet, token, credit) must refuse house context.'
- **Test:** test:house-bot-money run under both FEATURE_BONUS=WITHDRAWN and ACTIVE, with bonusBalance 50,000, balance 1,000 and stake 5,000 → house_cash_only, bonusBalance unchanged, zero BONUS_SPEND ledger legs. AUTO cashback on a holder deposit with the bot ACTIVE → OWNER_MONEY event and admin alert.

### FS-14 [partial] The agent programme changes (commission on turnover or deposits, a new userId-only hook, Invite relaunch), the holder was recruited by an agent, or the holder applies to become an AGENT. onRecruitBet and onRecruitDeposit receive only userId and amount, so they can't see a house marker. The plan only skips the call sites that exist today. Agent approval changes the holder's role, but the plan notices that only at the next fire.
- **Trigger:** A commission-basis change, a new affiliate hook, Invite ACTIVE, or an agent application by the holder.
- **Expected:** - No agent commission, first-bet reward or turnover reward ever accrues on house-marked stakes or settlements. Holder deposits remain personal, as documented.
- If the holder applies: the officer review shows the warning row "This account is a live house bot (Bot A)".
- On approval: immediate AUTO_PAUSED(ROLE_CHANGED), intents CANCELLED, admins alerted by bell and email, ~~holder notified~~.
- **Plan:** I7; §3 H5–H9 skip onRecruitBet; (g) settlement-loop skip; §6 warning 'recruited by agent'; I9 role change
- **Evidence:** src/lib/server/affiliate-service.ts:1112 (`onRecruitBet(recruitUserId, {stake})`, no positionId); src/lib/server/affiliate-service.ts:1197 (onRecruitSettlement carries positionId); src/lib/server/affiliate-service.ts:1493 (onRecruitDeposit); src/lib/server/affiliate-service.ts:523-537 (accrualContextFor); src/lib/server/market-service.ts:3829-3837 (settlement accrual loop); src/lib/server/agent-application-service.ts:211 and :1279 (refuses staff only, no house check); src/lib/feature-state.ts:89 (invite WITHDRAWN)
- **Fix:** Make `houseBotId: string | null` a required field on the onRecruitBet and onRecruitSettlement option objects, so the compiler surfaces every caller, and return early when it is non-null. Document deposit-level hooks as personal. Agent application eligibility gains the warning `house_bot_holder`. approveAgent calls a dynamic-import `onRoleChanged(userId)` hook → immediate auto-pause. HOUSE-BOTS.md 'Affiliate' rule.
- **Test:** test:house-bot-money: a holder recruited by an approved AGENT; a house bet settles with a fee → 0 AGENT_COMMISSION rows, while his personal bet on another market accrues. test:house-bot-designation: approving the holder as agent → AUTO_PAUSED(ROLE_CHANGED) within the approval call, with 1 admin alert.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice on approval (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### FS-15 [partial] Stake bounds change so saved caps no longer fit: the platform min rises to 2,000, a poll gets a per-market min of 10,000, or an Up & Down chain max drops to 5,000. Saved values (stake min 1,000, round-to 500, OPENER 1,000–5,000) become invalid, and the plan maps stake_below_min/above_max to FAILED + alert for every intent.
- **Trigger:** Edit of platform bounds, a per-market override, or chain bounds.
- **Expected:** - Decide and fire clamp through the same bounds resolver as buyPositionInner.
- If the clamped stake leaves the bot's own min/max or the pool condition → SKIPPED(STAKE_OUT_OF_BOUNDS), with why "market min 10,000 is above this bot's max 5,000". No FAILED and no alert per intent.
- If the bet path still refuses a stake the resolver accepted → FAILED plus a SECURITY alert (divergence).
- The planner revalidates non-REMOVED bots against current platform bounds. A bot whose caps are now invalid → AUTO_PAUSED(RULES_INVALID) naming the field. Admins get bell and email: "Bot A paused: platform minimum stake is now 2,000; its minimum is 1,000." The rules form focuses that field.
- **Plan:** F5 step 9 stake clamp; §4.6 stake_* → FAILED + alert; §5 caps 'within platform bounds'
- **Evidence:** src/lib/server/market-service.ts:1099-1105 (bounds = getEffectiveConfig(marketId), then chain bounds for UPDOWN); src/lib/server/market-service.ts:1106-1119 (refusal); src/lib/payout.ts:166-168 (platform bounds 1,000/1,000,000); src/lib/server/market-config.ts:548-555 (per-market overrides); src/lib/server/updown-config.ts:1330 and :1345 (chain bounds)
- **Fix:** §3: add sanctioned change (l), extracting `stakeBoundsForMarket(market)` from market-service.ts:1099-1105 with output-identical results, used by decide.ts and fire.ts. §4.6: stake_* → SKIPPED(STAKE_OUT_OF_BOUNDS) when the pre-fire clamp disagreed, else FAILED + SECURITY. §4.2 planner: add a bounds revalidation pass. Pause reason RULES_INVALID (shared with FS-07).
- **Test:** test:house-bot-engine:
- Per-market min 10,000 with bot max 5,000 → SKIPPED, 0 alerts.
- Platform min fixture 2,000 → AUTO_PAUSED(RULES_INVALID, field stakeMinTzs), 1 alert.

test:house-bot-seam: stakeBoundsForMarket equals the old inline result for a poll, a poll with override, and an Up & Down round.

### FS-16 [gap] The holder wants out. He has no in-app way to withdraw consent other than closing his account or self-excluding, which misuses an RG tool and pollutes RG reporting. If he closes the account and later requests erasure, the HouseBot label and note, event payloads and intent `why` text may keep his name.
- **Trigger:** Holder request by phone, ~~in-app,~~ account closure, or a DSAR erasure.
- **Expected:** - ~~A holder-only 'Stop liquidity stakes' button sits on /positions and the house chip, behind a ConfirmDialog.~~ It sets target state immediately: bot → AUTO_PAUSED(HOLDER_WITHDREW), intents CANCELLED, HouseBotEvent, COMPLIANCE audit `house_bot.holder_withdrew_consent`.
- Admins, bell and email: "The holder of Bot A asked 50pick to stop. The bot is paused."
- ~~Holder confirmation (en/sw/zh): "Done — 50pick won't place new liquidity stakes from your account. Open stakes settle as normal."~~
- Start stays disabled until a fresh password re-verify.
- Account closure → ACCOUNT_BLOCKED pause, then REMOVED(ACCOUNT_CLOSED) automatically.
- Erasure redacts HouseBot.label, note and removedReason and free text in events and intents, while ids, markers and amounts stay.
- **Plan:** D5 consent; F10 holder app; I9; F8 Remove; §2 HouseBot label/note
- **Evidence:** src/lib/server/user-service.ts:84-133 (closeAccount: status and wallet CLOSED, positions settle, sessions revoked); src/lib/server/erasure.ts:162-176 (erasure only for CLOSED accounts); src/lib/server/erasure.ts:384 (revokes sessions); src/lib/server/responsible-gambling.ts:278 (self-exclusion revokes sessions)
- **Fix:** F10: add ~~`withdrawHouseConsentAction` (holder session via currentSession, never staff) and~~ pause reason HOLDER_WITHDREW (way out: Re-verify, then Start). §4.2 planner: CLOSED holder → REMOVED(ACCOUNT_CLOSED). erasure.ts: house-bot redaction step with a count. HOUSE-BOTS.md consent section: 'withdrawing consent must be as easy as giving it'.
- **Test:** test:house-bot-designation: the holder action → AUTO_PAUSED(HOLDER_WITHDREW), 1 admin alert, ~~1 holder notice,~~ Start refused until re-verify. Erasure suite: a closed holder erased → HouseBot.note and label redacted, markers intact, reports tie.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** D19c struck the holder-facing "Stop liquidity stakes" action, its chip placement and its confirmation: a withdrawal the holder asks for through support is recorded with the officer as actor (Commit 7; C5-SPEC ruling 170, L49), and the holder receives no notice; the pause, the admin alert, the re-verify rule, closure removal and erasure redaction stand. Coverage gate: partly struck by D19.

### FS-17 [gap] SMS goes live (Selcom), and a later change sends money kinds or outcome notices by SMS or email. HOUSE_BOT sits in MONEY_KINDS, and house positions still get a win, loss or refund notice for every outcome, uncapped; one 3-min chain can produce ~360 a day. The holder would receive hundreds of paid SMS or emails a day.
- **Trigger:** SMS_PROVIDER=selcom plus any notify()→SMS or email fan-out.
- **Expected:** A per-kind channel policy applies:
- HOUSE_BOT kind: ~~bell, plus push under the hourly cap.~~ Never SMS. ~~Email only for designated, removed and holder-withdrew.~~
- ~~Outcome notices for house-marked positions count against `holderNoticesPerHour` and then roll into the hourly holder summary: "50pick placed N liquidity stakes (TZS X) between 14:00 and 15:00; results: W won, L lost, R refunded".~~
- Admin house alerts go by bell and email only, never SMS.
- **Plan:** §7 notifications; F10 'Win/loss/refund notices stay'; D8
- **Evidence:** src/lib/server/sms.ts:89-113 (console stub today, smsConfigured false in production); src/lib/server/comms-registry.ts:14-46 (SMS is OTP only and never a Notification row); src/lib/server/comms-registry.ts:213-221 (MONEY_KINDS); src/lib/server/market-service.ts:757-796 (Up & Down bell on every outcome since 2026-08-22, '360/day if a 3-minute chain runs'); prisma/schema.prisma:192-197 (NotificationChannel includes SMS)
- **Fix:** comms-registry.ts: add `CHANNEL_POLICY: Record<NotificationKind, {sms:'never'|'allowed'; email:'never'|'template-only'|'allowed'}>` with HOUSE_BOT sms 'never'. ~~§7: outcome notifications for marked positions route through `houseOutcomeNotice`, counted in runtime `bot:<id>` together with bet notices.~~ HOUSE-BOTS.md alert matrix gains a Channel column with the rule 'no SMS, ever'.
- **Test:** test:house-bot-comms: ~~50 house outcomes in one hour → ≤ holderNoticesPerHour rows plus 1 summary.~~ CHANNEL_POLICY is exhaustive over NOTIFICATION_KINDS (compile) and HOUSE_BOT sms is 'never'. A stubbed SMS fan-out is never called for HOUSE_BOT.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** `HOUSE_BOT` is an admin-only kind (C4 ruling 150): the holder gets no house-bot bell, push, email or hourly summary, and `holderNoticesPerHour` is removed (C4 rulings 149 and 153); a holder's outcome notice for a house-marked position is byte-identical to any player's, under F6's email rule (C4 ruling 143). Admin alerts stay bell and email, never SMS. Coverage gate: partly struck by D19.

### FS-18 [partial] The parallel KYC session lands in the middle of the build. The plan branches the worktree from origin/main, but KYC commit ac411357 is local only (main is ahead by 1). About 400 more uncommitted KYC lines touch files house commits 1–7 also edit: failure-reasons.ts, store.ts, prisma-dal.ts, notification-service.ts, comms-registry.ts, wallet-service.ts, i18n-dict.ts, admin-nav-groups.ts and COMPLIANCE-DECISIONS.md. Line citations drift, the mapper would be built against pre-KYC reasons, and migration ordering is at risk.
- **Trigger:** Build starts before KYC (n/n) is pushed, or KYC pushes between house commits.
- **Expected:** - The house build starts from the pushed SHA that contains the KYC work, and rebases before every commit.
- Every code citation in HOUSE-BOTS.md is a re-resolved anchor, not a bare line number.
- House migrations are timestamped after 20260913120000_kyc_at_withdrawal and touch no KYC tables.
- After each rebase the reason walker (FS-03), cert-c3, dal-parity and admin-nav rerun green before push.
- A migration preflight lists the `_prisma_migrations` rows on production before applying.
- **Plan:** §11 'Worktree … -b house-bots origin/main'; 'Rebase on origin/main often'; Release 'migrations applied to production from this machine first'
- **Evidence:** git: HEAD ac411357 (2026-09-13 11:08) vs origin/main c63a4668 (2026-09-12 17:40), status 'main...origin/main [ahead 1]'; git diff --stat: failure-reasons.ts +38, i18n-dict.ts ±105, notification-service.ts +206, comms-registry.ts +12, prisma-dal.ts ±20, store.ts ±25, wallet-service.ts +12, admin-nav-groups.ts ±13; prisma/migrations latest = 20260913120000_kyc_at_withdrawal; scripts/anchors/kyc-gate.anchors.mjs:1-6 (anchor sidecar re-resolved by test:red-anchors)
- **Fix:** §11 precondition: 'KYC-at-withdrawal (n/n) pushed to origin/main; worktree from that SHA'. Per-commit checklist: rebase, then test:failure-reasons, test:cert-c3, test:dal-parity, test:admin-nav, test:house-bot-*. HOUSE-BOTS.md cites code via `scripts/anchors/house-bots.anchors.mjs`. Add a migration preflight ops step and a timestamp-order note.
- **Test:** test:red-anchors resolves every house anchor. test:docs link check. CI replays migrations on an empty Postgres in order. test:house-bot-engine mapper walker is green after rebase.

### FS-19 [partial] Production scales to 2+ containers, or runs two during a 60 s deploy overlap. Row claims are correct, but: one global `pollerBeatAt` hides a dead poller on one replica; the 5 s soft cache after OFF lets another replica keep creating intents; any in-memory counter (bets per minute, alert counts) would be per replica; the post-commit hook runs only on the replica that took the player's bet.
- **Trigger:** numReplicas set in Railway, or deploy overlap.
- **Expected:** - Every cap and throttle is counted from the DB (marked positions, HouseBotRuntime, AlertOnce), never from memory.
- Two replicas seeing one trigger create exactly one intent (partial unique index).
- Intents created from a stale cache are CANCELLED at fire (MASTER_OFF) with no alert.
- Heartbeats are per instance (`beat:<INSTANCE_ID>`). The console shows "2 engines running · last seen 14:02:11 EAT", and a stale instance gets its own warning line.
- After OFF commits, no house bet commits on any replica.
- **Plan:** §4.2 boot (poller no leader, planner leased); I4, I5, I6; §2 HouseBotRuntime; §12 test:house-bot-caps
- **Evidence:** railway.json:1-9 (no numReplicas key today); src/lib/server/leader.ts:12-14 ('Production runs ONE container today … nothing STOPS someone scaling to two'); src/lib/server/leader.ts:52-54 (INSTANCE_ID); src/lib/server/market-scheduler.ts:32-36 (TODO(scale)); src/lib/server/locks.ts:99-122 (advisory locks are cross-replica)
- **Fix:** §2: HouseBotRuntime keys `beat:poller:<INSTANCE_ID>` and `beat:planner`. §3 H4: define GLOBAL_BETS_PER_MINUTE as `count(*) FROM Position WHERE houseBotId IS NOT NULL AND placedAt > now()-60s` read on lockTx. §8 engine health reads all beat rows. HOUSE-BOTS.md rule: 'no in-memory money, cap or throttle state'.
- **Test:** test:house-bot-caps: two engine instances (distinct INSTANCE_ID, same Postgres) plus two post-commit hooks for one trigger → 1 intent, 1 position, 1 alert. Switch OFF on instance A while B holds a cached 'on' → B's intent CANCELLED, 0 commits. Kill A's poller → the health line names A while B keeps firing.

### FS-20 [partial] bet.place moves to the Redis bucket (shared across replicas), or its rule is tightened (e.g. capacity 5, refill 2/min). The plan's floor, 'min gap ≥ 20 s leaves ≥70% of the holder's bet.place 10/min', is a hard-coded literal. House bets would then consume most of the holder's own allowance, or bots would hit rate_limited constantly.
- **Trigger:** Edit of RATE_RULES['bet.place'], or the bet path switching to rateCheckAsync.
- **Expected:** rules.ts derives the min-gap floor and the per-hour bound from RATE_RULES['bet.place'].refillPerMin, capping the house at 30% of the holder's refill. After a rule change the planner revalidates, and affected bots → AUTO_PAUSED(RULES_INVALID, field freqMinGapSec). Admins get bell and email: "The platform bet rate limit changed. Raise Bot A's minimum gap to at least 100 s." The two-rate_limited-per-hour contention alert stays.
- **Plan:** §5 caps 'min gap ≥ 20 s (leaves ≥70% of the holder's bet.place 10/min)'; §4.6 rate_limited; §13 risk 5
- **Evidence:** src/lib/server/rate-limit.ts:95 (bet.place capacity 30, refill 10/min); src/lib/server/rate-limit.ts:28-33 (bet path must stay on the synchronous in-memory bucket); src/lib/server/rate-limit.ts:193 ('REDIS_URL unset (production today)'); src/lib/server/market-service.ts:906-919 (sync rateCheck on the bet path)
- **Fix:** rules.ts: export `minGapFloorSec()` = ceil(60 / (RATE_RULES['bet.place'].refillPerMin × 0.3)), used by the validator and planner revalidation instead of the literal 20. HOUSE-BOTS.md rule: 'moving bet.place to Redis or changing its rule requires re-deriving the house share'.
- **Test:** test:house-bot-rules: refill 10 → floor 20. Stubbed refill 2 → floor 100, and a saved bot with 30 s becomes invalid, naming the field.

### FS-21 [partial] The roster grows to 20 bots, each allowed 200 bets a day. Every house bet adds audit payload on the single global serialised audit writer. The nested `house:control` advisory lock is held until the outer wallet-lock transaction commits, not only 'through the final writes'. The planner computes 20 loss books every 15 s, and the admin bell shows only 30 rows.
- **Trigger:** maxDesignatedBots raised to 20 and all bots ACTIVE at max frequency.
- **Expected:** - A global `gMaxBetsPerDay` sized to the audit and lock budget caps total house bets.
- The planner computes every bot's book in one grouped aggregate.
- Player bet p95 latency stays within 10% of baseline with 20 bots at their caps. house:control hold time is measured and stays under 50 ms.
- More than 20 bots requires a code change and a new load run.
- **Plan:** §2 maxDesignatedBots 1–20; §3 lock order 'held only through the final writes'; §4.2 planner every 15 s; §13 risk 5
- **Evidence:** src/lib/server/locks.ts:103-121 (a nested advisory lock joins the parent transaction, 'simply held until the OUTER lock ends'); src/lib/server/market-service.ts:704-706 (AuditLog 144 MB, ~11.5k rows/day); src/lib/server/kyc-gate.ts:136-140 (every audit append takes a database-global advisory lock, one serialised writer); src/lib/server/market-dal.ts:395-404 (an N+1 exhausted the pool on /leaderboard)
- **Fix:** §3: correct the wording to 'house:control is held until the wallet-lock transaction commits'. §2 control row: add `gMaxBetsPerDay`. book.ts: a single `GROUP BY houseBotId` query. Add a local-only load script `load:house-bots-20` (loopback guard) measuring lock hold and player p95. HOUSE-BOTS.md capacity section with the measured numbers.
- **Test:** test:house-bot-caps extended to 20 bots bursting: each cap stops exactly. The local load script asserts player bet p95 delta ≤ 10% and house:control hold < 50 ms.

### FS-22 [partial] The Board asks for a per-bet export of house activity for a month (market, side, stake, trigger player, outcome, net), or audits a past month. Ops may purge an Up & Down chain the bots traded, which deletes UpDownRound rows and blanks market titles, while retention deletes old notifications.
- **Trigger:** A GBT information request, a chain purge, or a nightly retention pass.
- **Expected:** - ~~/admin/reports offers 'House liquidity activity' (CSV, date range) built from HouseBotIntent joined to Position and Transaction markers.~~
- ~~Its totals equal the house line in buildGbtMonthly for the same period.~~
- ~~Export writes a COMPLIANCE audit row.~~
- Feed rows ~~and the export~~ render from the intent's `decision` snapshot (title, round number, pools at decision), so a purged chain still reads "BTC 5-min #412".
- HouseBot, HouseBotIntent, HouseBotEvent and HouseBotAlertOnce are never deleted by retention or purge.
- **Plan:** §9 reporting (lines in buildGbtMonthly / buildDailyOps); §8 activity feed 'built from HouseBotIntent joined to the trigger, market and settlement'; §2 decision Json
- **Evidence:** src/lib/server/reports/catalogue.ts:74, :580, :946 (GBT monthly, daily ops, match integrity; no per-bet house report); src/lib/server/chain-purge.ts:10-13 (DELETE UpDownRound, REDACT market titles, NEVER Position/Transaction); src/lib/server/chain-purge.ts:412-429 (the purge writes); src/lib/server/lifecycle.ts:124-150 (retention pass deletes notifications and OTP rows)
- **Fix:** ~~catalogue.ts: add `buildHouseActivity(generatorId, period)` and register it in the reports UI.~~ §8 feed ~~and export~~ read titles and round numbers from `decision.snapshot`, never live joins. Add HouseBot* tables to chain-purge.ts's NEVER list and to retention's exclusions, both in comment and pinned.
- **Test:** test:house-bot-reports:
- ~~Export totals equal the buildGbtMonthly house line.~~
- A purged chain fixture → the feed row ~~and export~~ still show the round number and title.
- A retention pass leaves HouseBot* row counts unchanged.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no house activity export and no GBT house line (C5-SPEC rulings 202 and 227); the feed's snapshot titles and the never-deleted house tables are untouched by D20. Coverage gate: partly struck by D20.

### FS-23 [partial] Identity policy flips again and a KYC-before-bet gate returns (2026-09-05 style) with kyc_* reasons, while the holder is unverified. Under the plan these fall to FAILED(UNMAPPED), and identity is only a warning row at designation and Start.
- **Trigger:** A COMPLIANCE-DECISIONS ruling re-adding a bet identity gate.
- **Expected:** - Compile forces classification (FS-03).
- kyc_not_verified, kyc_pending_review, kyc_more_info and kyc_rejected → AUTO_PAUSED(IDENTITY_REQUIRED).
- Admins, bell and email: "Bot A paused: the account must verify identity before staking."
- ~~Holder notice (en/sw/zh) links /profile/kyc.~~
- The eligibility row 'identity not approved' turns blocking for Start automatically through a shared predicate.
- No FAILED stream.
- **Plan:** §6 warnings 'identity never approved (can't withdraw)'; §4.6
- **Evidence:** src/lib/server/market-service.ts:1079-1086 (bet identity gate deleted: 'Do not restore it by reading the older entry'); src/lib/failure-reasons.ts:165-183 (kyc_* reasons now emitted by withdraw only); src/lib/server/kyc-gate.ts:114-121 (assertIdentityForPayout = approvedEver)
- **Fix:** pause-reasons.ts: add IDENTITY_REQUIRED. kyc-gate.ts: export `betIdentityRequired()` (false today), read by houseBotEligibility for the blocking row. §4.6: add the mapper rows for the four kyc_* reasons. Add the row to the HOUSE-BOTS.md eligibility matrix.
- **Test:** test:house-bot-designation: predicate stubbed true with an unverified holder → Start refused with the row. test:house-bot-engine: a kyc_not_verified outcome → AUTO_PAUSED(IDENTITY_REQUIRED), 1 alert, intents CANCELLED.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice when his bot pauses (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### FS-24 [partial] The owner lengthens exits, e.g. a 60-min paid window on polls or 'sell until lock'. Every COUNTER is held to exit close, which then passes deadlineAt, so counters on those products silently become EXIT_WINDOW_TOO_LATE skips. Bait-and-dilute exposure also grows for FILL and OPENER.
- **Trigger:** /admin/config exit settings changed. New markets freeze the new terms.
- **Expected:** - The rules-tab timing preview reads "Counter: never fires on polls and 10–60-min rounds under current exit rules (players can exit for 65 min)", labelled 'for new markets'. Existing markets keep their frozen terms.
- The planner detects an exit-config change and sends one AlertOnce to admins: "Counter mode for Bot A can no longer fire on polls under the new exit rules."
- The Start dialog shows a warning row when every enabled mode is structurally impossible.
- The penalty box still applies to exits after a house counter.
- **Plan:** F2 effective timing preview; F4 decidability; §4.3 negative decisions
- **Evidence:** src/lib/server/market-config.ts:217-218 (grace 5 / paid 0 defaults), :606-613 (admin-editable); src/lib/server/market-service.ts:2657-2659 (frozen per-market rates; window = grace + paid)
- **Fix:** rules.ts `effectiveTiming()` returns `counter: 'never' | {…}` per product and duration, rendered in the form and Start dialog. §4.2 planner stores a hash of the current exit config in HouseBotRuntime and sends one alert on change when any ACTIVE bot's counter becomes impossible.
- **Test:** test:house-bot-rules: paid 60 → effectiveTiming counter 'never' for polls, 3-min Up & Down unchanged. test:house-bot-engine: a trigger under widened rules → SKIPPED(EXIT_WINDOW_TOO_LATE) row plus exactly 1 AlertOnce.

### FS-25 [partial] The Board requires each market to show house liquidity publicly (e.g. "50pick liquidity: TZS 8,000 on DOWN"). The plan pins the marker as absent from every public payload (D6), so compliance would mean scattering new reads across the board, round page, market page and share card.
- **Trigger:** A GBT disclosure ruling.
- **Expected:** One aggregate reader, `houseStakeByMarket(marketIds) → {yes, no}`, already exists ~~and feeds the F11 resolver display and reports~~. ~~A future disclosure switches on in one public view model, shows only the aggregate (never holder identity or bot label), and passes through a META-bumped rules text in all locales.~~
- **Plan:** D6; F11 resolver 'House stake: YES X · NO Y'; §12 test:house-bot-reports absence assertions
- **Evidence:** src/lib/server/market-service.ts:1191-1195 (predictorCount feeds the Up & Down card, admin economics panel, regulator match-integrity report and public share card); src/lib/server/market-dal.ts:1225-1235 (public aggregates read Position without a marker)
- **Fix:** §2 DAL: `houseStakeByMarket(marketIds)` with a memory twin, ~~used by F11 and §9~~. ~~HOUSE-BOTS.md 'Disclosure change procedure' names the view models, i18n keys and the test assertion to flip. The rule: aggregate only.~~
- **Test:** test:house-bot-reports: the aggregate equals the sum of marked OPEN positions per side, and the absence assertions stay green. ~~A flag-on fixture renders the aggregate with no userId or label in the payload.~~
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the aggregate reader feeds no resolver display and no report (C5-SPEC rulings 192–194 and 224); whether `houseStakeByMarket` itself stays is decided member by member in C5-5b. Coverage gate: partly struck by D20.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** house stakes are never shown publicly (D19a): the future public disclosure, its flag-on fixture and the HOUSE-BOTS.md 'Disclosure change procedure' that would prepare it are struck; the absence assertions stand. Coverage gate: the flag-on public fixture is an Exceptions row "struck by D19" (C5-SPEC ruling 250).

### FS-26 [partial] Two-admin resolution is re-enabled, and possibly an entity-aware officer-conflict rule is added (F6 §5.3). Every 50pick officer is 'the house', so markets holding house stakes could become unresolvable, or a per-account conflict check would pass because it compares account ids.
- **Trigger:** The resolver-queue toggle turns requireTwoOfficer on, or a new conflict ruling.
- **Expected:** - **Two-admin on:** stage-1 closes the market, so pending intents → SKIPPED(MARKET_NOT_LIVE). The engine never reads the staged outcome. ~~The resolver UI still shows the house stake.~~
- **Future conflict rule:** treats house exposure as entity-level and routes affected markets to the documented path (a named independent reviewer, or auto mode). It never becomes a silent block or a silent pass.
- test:two-admin and test:officer-conflict stay unchanged.
- **Plan:** I10; F11; §12 'Existing gates touched'
- **Evidence:** src/lib/server/resolution-policy.ts:26-27 (requireTwoOfficer default false); src/lib/server/resolution-policy.ts:55-78 (toggle with COMPLIANCE audit); docs/COMPLIANCE-DECISIONS.md:2370 (fee 'never of the identity of a bettor'); package.json:203-204 (test:officer-conflict, test:two-admin)
- **Fix:** §12: add test:two-admin and test:officer-conflict to the touched gates. HOUSE-BOTS.md 'If conflict rules return' names houseStakeByMarket (FS-25) as the input and forbids per-account comparisons. The FS-12 field pin covers resolvedOutcome and resolutionEvidence.
- **Test:** test:house-bot-engine: two-admin ON, stage-1 staged, a PENDING intent → SKIPPED(MARKET_NOT_LIVE); the engine projection has no resolvedOutcome. Existing test:two-admin passes unchanged.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** the resolver UI shows no house stake (C5-SPEC rulings 192–194). Coverage gate: partly struck by D20.

### FS-27 [partial] An admin changes the platform timezone at /admin/config (any valid IANA zone), or PLATFORM_TIMEZONE differs. House bots use EAT for schedule windows, daily cap cohorts, AlertOnce day keys and hourly summaries, while the console's shared formatters follow the platform zone. Windows then look shifted, and the daily loss stop splits at a different midnight than the usage bars.
- **Trigger:** setPlatformConfig({timezone}) or the env var.
- **Expected:** House money-day, hour keys and schedule are pinned to Africa/Dar_es_Salaam in one module, like the statutory report packs. Every house console time renders through that module with an explicit 'EAT' suffix. Changing the platform timezone changes nothing in house caps, windows, keys or labels.
- **Plan:** §5 Schedule 'EAT'; §3 loss 'per EAT-day cohort'; §8 'Due times show as absolute EAT'
- **Evidence:** src/lib/server/platform-config.ts:10-13, :33, :61-78, :94-98 (timezone admin-configurable, env fallback); src/lib/utils.ts:258-279 (formatDate* use the platform tz()); src/lib/server/report-pack.ts:55 and :69 (statutory periods pinned to Africa/Dar_es_Salaam)
- **Fix:** Add `src/lib/house-bot/clock.ts` (eatDayKey, eatHourKey, formatEat, windowContains) as the single time source for rules.ts, book.ts, alerts.ts and the console. Source pin: no formatDate/formatDateTime import under src/app/admin/desk/**. HOUSE-BOTS.md rule.
- **Test:** test:house-bot-rules: platform tz set to 'UTC' → eatDayKey boundary stays at 21:00Z and window checks are unchanged. The source pin passes, and a planted formatDateTime import turns it red.

### FS-28 [partial] Later the owner asks to let the bot exit when a market turns, or a partial cash-out or sell-back product is added. A house exit after luring counterparties turns liquidity into bait.
- **Trigger:** An owner request, a new exit function, or a config flag proposal.
- **Expected:** - **Refusal:** ~~`house_position_no_exit`,~~ keyed on the immutable position marker in cashOutPosition and in any new exit function.
- **Independent of state:** holds regardless of bot status (ACTIVE, PAUSED, REMOVED, master OFF, sunset).
- **Holder view:** ~~SellButton shows the houseStake state: "Placed by 50pick with your permission; it can't be cashed out and settles to your wallet."~~
- **Record:** COMPLIANCE-DECISIONS carries a 'do not restore' line.
- **Plan:** I7; §3 (d)(e); §12 test:house-bot-money 'no cash-out'
- **Evidence:** src/lib/server/market-service.ts:2651-2702 (cashOutValue); src/lib/server/market-service.ts:2704 (cashOutPosition); src/lib/feature-state.ts:31-37 ('gate the offer, never the refusal' precedent)
- **Fix:** Add the COMPLIANCE entry 'do not restore: house exits'. Guard walker: any exported market-service function that writes a CASHOUT transaction must call `assertNotHousePosition(position)`. Extend the §12 money test to REMOVED and OFF states.
- **Test:** test:house-bot-money: cash-out on a marked position with the bot REMOVED and the switch OFF → refused, zero money moved. Walker control: a fixture exit function without the assert turns red.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** a house position reads as a closed exit: `cashOutPosition` returns `origin/main`'s exit-window refusal verbatim (`exit_window_closed`, code `SELECTION_CLOSED`), so the holder's button shows a player's closed-exit words (D19c; C4 ruling 147); the marker check, its independence of bot state and the do-not-restore line stand. Coverage gate: partly struck by D19.

### FS-29 [partial] A fee model change, a per-market fee override, or a request to waive fees on house stakes. snapshotOrLegacy maps any model other than loser-share to capped-commission. A fee waiver on house stakes would make the fee depend on the bettor's identity.
- **Trigger:** Fee config edit, a per-market override, a new feeModel value, or an owner request.
- **Expected:** - House 'fee withheld', net and exposure are computed from Transaction rows and markers only, never recomputed from rates.
- Levy identity (stakes − payouts − refunds = fee) ties under any model.
- No fee code reads houseBotId.
- A fee waiver for house stakes is refused by design, citing the ruling.
- **Plan:** §3 levy identity; §9 'statutory filters nothing'; §8 overview 'fee withheld'
- **Evidence:** src/lib/server/market-config.ts:359-374 (snapshots other than loser-share → capped-commission); src/lib/server/market-config.ts:548-555 (per-market overrides); src/lib/server/market-config.ts:721-723 (fee model set); src/lib/server/market-service.ts:830-832 (ratesFor frozen snapshot); docs/COMPLIANCE-DECISIONS.md:2370 ('never of the identity of a bettor')
- **Fix:** book.ts: derive every figure from transactions. Source pin: `houseBotId` must not appear in src/lib/payout.ts or src/lib/server/market-config.ts. HOUSE-BOTS.md do-not list: 'fee waiver or discount keyed on house marker'.
- **Test:** test:house-bot-reports: a per-market fee override plus a house bet → levy identity ties and the book equals the transaction sum. The source pin fails on a planted reference.

### FS-30 [partial] A fourth locale (e.g. French or Arabic) is added. The holder chip, holder notices, failure-reason copy, rules carve-out and disclosure must exist in it. Notification rows have one column per language, and the planned disclosure test hard-codes three locales.
- **Trigger:** Locale union or Prisma Locale enum extended.
- **Expected:** - ~~i18n parity fails the chip and reason keys automatically.~~
- ~~The house holder-notice builder is typed `Record<Locale, {title; body}>`, so a missing locale fails compile.~~
- The disclosure test iterates the dictionary's locales.
- ~~New legal text is marked for native review, with English binding.~~
- **Plan:** §10 Locales 'sw/zh drafted'; §12 test:house-bot-disclosure 'in 3 locales'
- **Evidence:** src/lib/i18n-dict.ts:1 (Locale = 'en'|'sw'|'zh'); src/lib/i18n-dict.ts:13 (dict); prisma/schema.prisma:56-59 (Locale enum); prisma/schema.prisma:866-869 (titleZh/bodyZh columns per language); package.json:169 (test:i18n)
- **Fix:** ~~House holder copy modules typed by Locale.~~ The disclosure test derives its locale list from `Object.keys(dict)`. Add a HOUSE-BOTS.md checklist 'Adding a locale'.
- **Test:** test:house-bot-disclosure iterates dict locales. ~~A typecheck fixture adding a locale fails on the house copy record.~~
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** no locale holds a holder chip, holder notice, player-facing house reason, carve-out or disclosure (D19a, D19c; C4 rulings 148–149); what stands is the non-disclosure suite iterating the dictionary's locales for its forbidden words (Commit 6). Coverage gate: the public and holder-copy half is an Exceptions row "struck by D19"; the locale iteration counts in Commit 6's suite (C5-SPEC ruling 250).

### FS-31 [gap] Players get TOTP or passkeys. Consent by the owner typing only the password would bypass the holder's own second factor, so consent becomes weaker than the account's sign-in.
- **Trigger:** Player 2FA ships (the twoFactorEnabled column starts being set).
- **Expected:** Eligibility adds a blocking row for designate and re-verify while the account has a second factor: "This account uses two-step sign-in — house consent can't verify it yet". A later amendment defines how consent verifies the second factor. Existing ACTIVE bots whose holder enables 2FA → AUTO_PAUSED(CONSENT_FACTOR_ADDED) with admin ~~and holder~~ notices.
- **Plan:** D5; §6 eligibility table
- **Evidence:** prisma/schema.prisma:266 (User.twoFactorEnabled exists); src/app/api/dev-test/stress-bulk-bet/route.ts:60 (only ever written false, in dev routes); src/lib/server/rbac-guard.ts:223 (TOTP step-up exists for staff only)
- **Fix:** §6: add the blocking row. §4.2 planner: sweep for twoFactorEnabled on bot holders. Pause reason CONSENT_FACTOR_ADDED. HOUSE-BOTS.md consent section.
- **Test:** test:house-bot-designation: twoFactorEnabled true → blocking row on designate and re-verify. Planner flips ACTIVE → AUTO_PAUSED with 1 alert.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice when his bot pauses (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### FS-32 [gap] Polls gain 3+ outcomes, or Side widens beyond YES/NO, while productLine stays MARKET. The engine's 'opposite side' and 'thin side' logic assumes a binary pool.
- **Trigger:** The Side type widened, or a multi-outcome poll introduced.
- **Expected:** The engine acts only on binary markets. A non-binary market yields no intent. placeHouseBet refuses `house_product_not_allowed`. The rules form states 'YES/NO polls only'.
- **Plan:** F4 'Side is the opposite of the trigger'; FILL thin side
- **Evidence:** src/lib/server/market-service.ts:171 (Side = 'YES'|'NO'); src/lib/server/market-service.ts:1121 (side re-check); src/lib/payout.ts:211 (Side)
- **Fix:** decide.ts: `oppositeSide(side: Side)` as an exhaustive switch with `never`. market-view marks `binary: true` only for YES/NO pools. §3 H3 reuses the FS-01 refusal.
- **Test:** A typecheck fixture widening Side fails decide.ts. test:house-bot-engine: a stub market flagged non-binary → no intent.

### FS-33 [partial] The Up & Down target model changes: asymmetric margins, a different minimum move, or targets not symmetric around open. The plan's closeness rule divides by (upTarget − openPrice) and assumes symmetry.
- **Trigger:** Edit of computeTargets or chain margin rules.
- **Expected:** Closeness is computed without division: |live − open| × 100 ≤ closenessPct × min(upTarget − open, open − downTarget). A missing price, a missing target, or a margin ≤ 0 → SKIPPED(UD_NO_PRICE). It is evaluated at decision and again at fire.
- **Plan:** F4 Up & Down closeness rule
- **Evidence:** src/lib/server/updown-config.ts:1521-1534 (computeTargets: symmetric, margin floored to one tick today)
- **Fix:** decide.ts: use the multiplication form with both targets and guard non-positive margins. HOUSE-BOTS.md note: 'closeness reads both targets'.
- **Test:** test:house-bot-engine: asymmetric targets fixture (up +10, down −4) with live at open +5 → UD_CLOSENESS at 25%. Zero margin → UD_NO_PRICE.

### FS-34 [gap] A currency redenomination or minor units (decimals) is introduced. Every cap is an integer TZS column and stakes must be whole numbers.
- **Trigger:** Currency or decimal policy change.
- **Expected:** The engine refuses to run when the platform currency constant differs from the one stored in the rules: master OFF(ENGINE_FAULT), every bot → AUTO_PAUSED(RULES_OUTDATED). Admins get bell and email: "Currency settings changed; house caps must be re-entered."
- **Plan:** §2 typed caps `*Tzs`
- **Evidence:** src/lib/utils.ts:60-65 (formatTzs, maximumFractionDigits 0); src/lib/server/market-service.ts:1106 (Number.isInteger stake); src/lib/payout.ts:166-168 (TZS integer bounds)
- **Fix:** payout.ts: add `PLATFORM_CURRENCY = {code:'TZS', minorUnits:0}`. The rules JSON stores it (FS-07 schema), parseHouseBotRules compares, and startHouseBotEngine checks it at boot.
- **Test:** test:house-bot-rules: a stubbed minorUnits 2 → parse returns RULES_OUTDATED and the engine boot check turns the switch off.

## targeted-and-manual (40)

> Anchors were read in `C:\kipindi-house-bots` on 2026-09-14, after `origin/main` "AUDIT 95 (3/n)" was merged in. Re-derive every anchor after P0.4 before relying on it. "N1 §4.3" and "N2 §6" name subsections of `04-amendments.md` N1–N2, whose citation rule these scenarios follow.

### TGT-01 [gap] Enter now on a poll with a thin side places one stake on the thin side
- **Trigger:**
  - Bot A is ACTIVE and master is ON. `enterNow.enabled` is on with `thinStakeTzs` 10,000.
  - Limits: `capStaffChosenPerDay` 3, `capStaffChosenDailyTzs` 30,000, `gCapStaffChosenPerDay` 10, `gCapStaffChosenDailyTzs` 100,000, `gStaffChosenMaxCounterpartyShare` 50.
  - Poll P: raw YES 12,000, all locked for the house (three PLAYER accounts with 4,000 each, every exit window closed more than `LOCK_MARGIN_MS` ago). Raw NO 3,000, also locked.
  - Officer X picks P, types a reason and presses Enter now.
- **Expected:**
  - **Preview:**
    - The side is **NO**, because raw NO 3,000 < locked YES 12,000. The stake is min(10,000, 12,000 − 3,000) = TZS 9,000.
    - Caption: "Saved Enter now stake (v{n}) TZS 10,000, cut to fit players' locked money (room TZS 9,000)".
    - Players' money: "Locked: YES TZS 12,000 · NO TZS 3,000". "Checked {HH:MM:SS} EAT" with a "Check again" button.
    - Limits line: "Staff-chosen used today: 0 of 3 · TZS 0 of TZS 30,000 · all bots: 0 of 10 · TZS 0 of TZS 100,000".
    - The preview writes one `ENTER_NOW_PREVIEWED` event with `actorId` X. There is no `OPENER_SIDE_DRAWN`, because the market is not empty.
  - **Press:**
    - HouseBotPress `ENTER_NOW` is inserted in state CHECKING.
    - One transaction then writes three things: the MANUAL intent, the `ENTER_NOW_REQUESTED` event and the press update to QUEUED with its `intentId`.
      - The intent has `entryCondition` THIN, `requestedById` X, `anchorKey` `manual:X:<submitId>`, `dueAt` now and `staleAt` = `dueAt` + 15 s.
      - The officer's reason goes in the event `reason` column, never in `payload`.
    - The intent is fired inline and ends PLACED. The press becomes DONE.
  - **Money:**
    - One marked position, NO 9,000; `Position.stake` = the intent's `stakeTzs`.
    - H4 splits the stake pro rata across the three YES accounts (each holds 33%, so each is ≥ 25%): 3,000 each into COUNTERPARTY_TZS and +1 each into COUNTERPARTY_COUNT.
  - **Records:**
    - Exactly one COMPLIANCE `house_bot.enter_now`, written under the press lease, with `auditId` set.
    - ~~R9 `houseStake` on P = `{yes:0, no:9000, staffChosen:{yes:0, no:9000, requestedBy:[X]}}`.~~
  - **Alerts:**
    - `notifyAdminsHouseBotStaffChosen` sends bell + email to every `houseBotAlertRecipients()`, uncapped, and not counted in `countInHour`.
    - The body never quotes the reason. It says "Reason recorded in the activity feed →".
    - `notifyAdminsHouseBotBet` sends nothing for this row. ~~The holder notice is capped as usual.~~
  - **Modal:** "Placed · TZS 9,000 NO on “P” at {HH:MM:SS} EAT.", read from `getEnterNowStatusAction`, never from the inline return value.
- **Plan:** N1 §2 (HouseBotPress, intent columns), §3 H2–H4, §4.2, §4.3, §6, §7; I1; I4.
- **Evidence:**
  - `src/lib/server/market-service.ts:1174-1202`: the bet path allows unlimited positions on either side, so every house one-bot, one-side and holder rule lives only in H2/H3.
  - `:2671` (`hadRunway`) and `:2687` (`sellable`): a player stake counts as locked only after its exit window.
  - 04 A15.
- **Fix:** N1.
- **Test:**
  - `test:house-bot-engine` happy path on both stores: 1 press DONE, 1 intent PLACED, 1 `ENTER_NOW_REQUESTED`, 1 audit, 1 position of 9,000, 3 counterparty attributions of 3,000.
  - `test:house-bot-comms`: both admins get the uncapped bell and email, and no reason text appears in any notification row.
  - `qa:house-bots-local` THIN case (local seeded database only).
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** no decision audit carries an R9 `houseStake` (C5-SPEC rulings 187–191); the `house_bot.enter_now` row is untouched by D20. Coverage gate: partly struck by D20.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no stake notice (D19c; C4 ruling 149). Coverage gate: partly struck by D19.

### TGT-02 [gap] Enter now on an empty market takes the market's one drawn side; the automated OPENER agrees
- **Trigger:**
  - Poll M has raw YES 0 and raw NO 0.
  - Officer X opens the Enter now modal and picks M. They close it, open it again, switch to Bot B, and try again the next EAT day.
  - Separately, Bot C has OPENER mode on polls, and the planner plans an automated OPENER for M.
  - Two race variants: (a) X's preview and the planner draw in the same second; (b) the planner's own transaction rolls back after its draw.
- **Expected:**
  - **One draw per market.**
    - The first draw writes exactly one HouseBotEvent `OPENER_SIDE_DRAWN` for M (unique `hbe_opener_draw_uq`), payload `{side, drawnFor}`.
    - `actorId` is X when a preview or press causes the draw. It is null only when automated planning draws first.
    - In race (a), the losing `INSERT … ON CONFLICT DO NOTHING RETURNING` returns 0 rows and reads the winner's side. Both show the same side.
  - **The planner draws outside `decide()`.**
    - It calls `openerSide(M)` in its own autocommit statement before `decide()`, and passes `{openerSide}` in decide's input.
    - `decide.ts` never imports the store.
    - In race (b) the rollback does not undo the committed draw, and the next pass uses it.
  - **Every later preview shows the same side** (re-open, Bot B, next EAT day), and so does the automated OPENER intent on M.
  - **Stake and condition.**
    - `entryCondition` OPENER; stake `openerStakeTzs`.
    - H3 requires yesPool = noPool = 0. Otherwise `house_condition_gone` → SKIPPED(CONDITION_GONE), and the side is never re-chosen.
    - If nobody joins, the one-sided refund returns the stake at 0 (HB-LC-35).
  - ~~**Records.** X's previews without a press count in R1 "previews without a stake" for X that month.~~
- **Plan:** N1 §2 (`hbe_opener_draw_uq`, OPENER_SIDE_DRAWN `actorId`), §4.1 `opener-side.ts`, §4.2 step 3; PLAN §1-F4 OPENER.
- **Evidence:**
  - `plans/house-bots/PLAN.md:91`: OPENER takes "a random side" while both pools are 0.
  - `PLAN.md:218`: `decide.ts` is pure with an injected `crypto.randomInt`.
  - `02-sealed-flows.md` §3.9: cancel writes CANCELLED_BY_ADMIN, which stays final for FILL/OPENER (X11).
- **Fix:** N1 §2 draw index and actor; the planner draws before `decide()`; `decide()` takes the side as input.
- **Test:**
  - `test:house-bot-engine` draw invariance:
    - preview ×3, Bot B, next EAT day (injected clock) and the automated OPENER all get one side and exactly 1 event;
    - race (a) gives 1 event; race (b) keeps the draw;
    - `decide()` with an injected side is deterministic;
    - source pin: `decide.ts` imports no store or `opener-side.ts`.
  - `test:dal-parity`: the draw twin (commit 1).
  - `red:house-bot-engine` mutation "`openerSide` replaced by a per-intent `randomInt`" must fail the invariance assertion.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no R1 report to count previews in (C5-SPEC rulings 199–207); the `ENTER_NOW_PREVIEWED` events are untouched by D20. Coverage gate: partly struck by D20.

### TGT-03 [gap] Double click, double tap, or two tabs on Enter now
- **Trigger:**
  - (a) Two presses 40 ms apart on a slow phone.
  - (b) Two identical requests with the same `submitId` reach the server together, with the latch bypassed.
  - (c) The same request is replayed after the first placed.
  - (d) The same `submitId` is posted for a different market.
  - (e) A second tab, with its own `submitId`, presses on the same bot and market while the first intent is PENDING or CLAIMED.
  - (f) A third tab presses with Bot B on that market.
- **Expected:**
  - (a) The `useRef` latch sends one request.
  - (b) Both requests insert HouseBotPress. One insert hits `hbp_actor_submit_uq`; `uniqueViolation(err)` returns that name, and the loser reads the existing row:
    - CHECKING → "Still checking this press…", and the client polls `getEnterNowStatusAction`;
    - QUEUED or DONE → that intent's live status with `duplicate:true`.
    - Never a second intent, event, audit or alert.
  - (c) The press is DONE, so the response is the placed status with `duplicate:true`.
  - (d) SUBMIT_ID_REUSED: "This request id was already used for a different action. Reload and try again." 0 intents.
  - (e) The second intent insert hits `hbi_manual_live_market_uq`. The second press becomes REFUSED with its code: "Another Enter now on this market is being placed. Wait for its result." Once the first has placed, a new press is refused by the no-room or holding refusals (N1 §6). With TGT-01's pools that is BALANCED, because house NO 9,000 fills the room.
  - (f) Refused with "Bot A already holds this market. One bot per market." At money level, H3 OTHER_BOT backs it up.
  - `DUPLICATE_SUBMIT` is never silently ignored in this modal.
  - Exactly one position. Every refused press is its own durable HouseBotPress row with its code.
- **Plan:** N1 §2 HouseBotPress press flow (steps 2, 4 and 8), §4.3; C4; CA-19.
- **Evidence:**
  - `04-amendments.md:1834`: buttons disable only after a re-render (`agents-client.tsx:31-43`).
  - `04-amendments.md:1851`: C4 "a duplicate is ignored".
  - `PLAN.md:156`: AlertOnce stores only key and `createdAt`, so it can't replay a refusal.
  - `01-scenario-register.md:1535`: CA-19 has the client ignore DUPLICATE_SUBMIT.
- **Fix:** N1 §2. HouseBotPress with `hbp_actor_submit_uq` replaces the C4 AlertOnce submit claim for every N1/N2 action. `uniqueViolation(err)` discriminates index names.
- **Test:**
  - `test:house-bot-engine`, both stores:
    - (b) → 1 press, 1 intent, 1 event, 1 audit, 1 position; the other call returns CHECKING or `duplicate:true`;
    - (d) → SUBMIT_ID_REUSED with 0 intents;
    - (e) → 1 PLACED + 1 REFUSED press.
  - `test:dal-parity`: `uniqueViolation` returns the right name for each new index on both stores, and rethrows an unknown unique violation.
  - `test:house-bot-console` jsdom: two presses in 50 ms → 1 request.
  - `red:house-bot-console` mutation "latch removed" must fail (two requests).

### TGT-04 [gap] Trying to re-roll the side or the amount
- **Trigger:** The owner dislikes the previewed figures (THIN NO 9,000 on P, or the drawn side on empty M). They try five things:
  - (a) closes and re-opens the modal;
  - (b) switches to Bot B;
  - (c) waits until the next EAT day;
  - (d) presses, then cancels the PENDING MANUAL row from the activity feed within its 15 s, with a reason;
  - (e) tries to cancel without a reason.
- **Expected:**
  - (a)–(c):
    - The THIN side and amount are a pure function of raw pools, `lockedForHouse` and the bot's saved rules and caps: the same inputs give the same figures.
    - Bot B can differ only through its own saved stake and cap clamps, never on side.
    - The OPENER side is the persisted draw (TGT-02).
    - No jitter is applied.
  - (d) The cancel:
    - writes CANCELLED(CANCELLED_BY_ADMIN);
    - writes COMPLIANCE `house_bot.staff_intent_cancelled {botId, marketId, intentId, side, stakeTzs}`;
    - writes event STAFF_INTENT_CANCELLED with the reason in the `reason` column;
    - frees `hbi_manual_live_market_uq`.
    - If the row was claimed meanwhile, C7's copy applies: "Too late — this bet is being placed now."
    - A new press on the same pools shows the same side and amount.
  - (e) Field error on `reason`: "Give a reason (5 to 300 characters)." Input validation runs before the press insert, so there is no press row, event or audit.
  - **Declining is possible, but recorded:** `ENTER_NOW_PREVIEWED` rows ~~(R1 previews without a stake)~~, the cancel's COMPLIANCE row ~~and the R1 "Vetoes" section per officer~~. Accepted risk 13.
- **Plan:** N1 §4.1–§4.2; N1 §6 staff cancels; PLAN §16b risk 13; ~~N1 §9 R1 vetoes~~.
- **Evidence:**
  - `02-sealed-flows.md` §3.9: today's cancel needs no reason and writes only ADMIN `house_bot.intent_cancelled`.
  - `04-amendments.md:1935-1939`: C7 cancel copies.
- **Fix:** N1 formula side and amount; the persisted draw; reasoned staff cancels.
- **Test:**
  - `test:house-bot-engine` re-roll matrix: preview ×3, Bot B, next EAT day, and cancel-then-press give identical side and condition, and the same stake for the same bot.
  - `test:house-bot-console`:
    - cancel without a reason → field error, 0 rows;
    - with a reason → 1 COMPLIANCE row and 1 STAFF_INTENT_CANCELLED event, with the reason text only in the event `reason` column.
  - ~~`test:house-bot-reports`: the R1 vetoes row.~~
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no R1 report or vetoes section (C5-SPEC rulings 199–207); a decline stays recorded in the preview events and the cancel's COMPLIANCE row. Coverage gate: partly struck by D20.

### TGT-05 [gap] Stale dropdown: the poll closed or the cutoff passed between listing and press
- **Trigger:**
  - Poll P closes 18:00:00. Bot A's `minTimeToCutoff` is 5:00, so `deadlineAt` is 17:55:00.
  - The picker lists P at 17:54:30 and the owner picks it (preview ok). They type a reason and press at 17:55:05.
  - Variants:
    - (b) Stage-1 or a Sentinel seal closes P between the pick and the press.
    - (c) The close lands after the intent insert.
    - (d) The owner keeps the modal open for 70 s without pressing.
- **Expected:**
  - (a) Refused before insert: "Too late: betting closes at 18:00:00 EAT and Bot A stops 5:00 before that." The press is REFUSED with its code. 0 intents and no COMPLIANCE audit.
  - (b) "Betting on this market has closed."
  - (c) A16 at fire: SKIPPED(MARKET_NOT_LIVE), or EXPIRED(CUTOFF) for an in-lock `selection_closed`.
  - (d) After `validUntilIso` (60 s), submit is disabled with "These figures are over 60 s old — Check again".
  - The picker re-queries on focus only while no market is selected (TGT-33).
- **Plan:** N1 §6 timing and market refusals; §8 preview validity; A12; A16.
- **Evidence:**
  - `src/lib/server/market-service.ts:1090-1091`: LIVE and selection-closed checks before the lock.
  - `:1413`: in-lock `selection_closed`.
  - `04-amendments.md:456`: A16 early-close row.
- **Fix:** N1.
- **Test:**
  - `test:house-bot-console` refusal fixtures (a), (b); fake timers for (d).
  - `test:house-bot-engine` close-after-insert → SKIPPED(MARKET_NOT_LIVE) and EXPIRED(CUTOFF), 0 positions.

### TGT-06 [gap] The thin side flips, or an empty market gets a bet, between preview, press and fire
- **Trigger:** Poll P closes 18:00:00; Bot A's `minTimeToCutoff` is 2:00.
  - (a) Preview at 17:56:00: locked YES 12,000; raw NO 3,000, all locked. Result NO 9,000. At 17:56:10 three players stake NO 5,000 each. With less than the 5-min grace left, those stakes have no free exit (their exit closes at `placedAt`), so they count as locked from 17:56:17. The owner presses at 17:56:30, with the preview still valid.
  - (b) An OPENER press on empty poll M is inserted, and a player stakes on M before the house bet takes `market:M`.
  - (c) The thin side flips after the insert but before the fire's re-check.
  - (d) Another stake uses Bot A's exposure between insert and fire, so the clamp cuts 9,000 to 6,000.
- **Expected:**
  - (a) The press recomputes locked NO 18,000 against raw YES 12,000, so the side is now YES with min(10,000, 18,000 − 12,000) = 6,000. The press is refused as stale with "The thin side changed since you checked (now YES). Review the new figures, then press Enter now again." The response carries the new preview. 0 intents.
  - (b) H3 `house_condition_gone` → SKIPPED(CONDITION_GONE). The side is **never** flipped and nothing moves.
  - (c) The fire re-runs `enterNowDecision` without locks. A different side or condition gives SKIPPED(CONDITION_GONE) with no lock taken, and `why` names the new thin side and pools.
  - (d) The write-back clamp (N1 §4.3 step 6):
    - `UPDATE … SET "stakeTzs"=6000, decision = decision || {firedStakeTzs:6000} WHERE id=$1 AND status='CLAIMED' AND "claimedBy"=$me AND "stakeTzs">6000 RETURNING *`;
    - then `placeHouseBet` runs with the returned row's figures;
    - H0 matches, the position is 6,000, master stays ON.
  - A stake never grows: the press takes min(confirmed, recomputed).
- **Plan:** N1 §3 H0/H3, §4.2, §4.3 fire re-check, §6 stale-preview refusal; N1 §4.3 write-back clamp.
- **Evidence:**
  - `src/lib/server/market-service.ts:2665-2671`: `closesAt`, and `hadRunway` false when less than the grace is left.
  - `01-scenario-register.md:2286` (FS-04): `exitWindowClosesAt` = `placedAt` without runway.
  - `PLAN.md:201`: H3 reads the kind from the claimed row.
- **Fix:** N1; the N1 §4.3 write-back clamp for all kinds.
- **Test:**
  - `test:house-bot-engine`:
    - (a) → stale refusal with YES 6,000, 0 intents, press REFUSED;
    - (c) → SKIPPED(CONDITION_GONE) with 0 lock acquisitions (spy);
    - (d) → `Position.stake` = the row's `stakeTzs` = 6,000, 0 SECURITY rows.
  - `test:house-bot-caps` (Postgres + memory): a player bet racing the OPENER inside the lock → `house_condition_gone`, with pools and balances consistent.
  - `red:house-bot-engine` mutation "fire takes the new thin side" must fail (c).

### TGT-07 [gap] No room: only cancellable player money, only house money, or a balanced market
- **Trigger:**
  - (a) Players A and B each staked YES 5,000 at 14:00:00 (free exit until 14:05:00), and nothing else is on the market. The owner previews at 14:02:00 and again at 14:05:03.
  - (b) Only Bot A's earlier opener stake is on the market.
  - (c) Locked YES 5,000 and locked NO 5,000.
  - (d) Two containers: the bet's container reads the database clock, and player A's cash-out lands on a container 5 s behind it at the boundary.
- **Expected:**
  - (a) At 14:02:00, ONLY_SELLABLE: "No stake yet: the players' money here can still be cancelled free until 14:05:07 EAT. Try again then."
    - The time includes `LOCK_MARGIN_MS` (7 s), and `retryAtIso` is 14:05:07.
    - At 14:05:03 the refusal is still ONLY_SELLABLE, because the margin hasn't passed.
    - The modal re-previews automatically once at 14:05:07 and shows NO 10,000.
  - (b) HOUSE_ONLY: "No player money here that the house can add to. Stakes from 50pick, staff, agent and bot-holder accounts, and from accounts excluded for the day, don't count."
  - (c) BALANCED: "No thin side: players' locked money is YES TZS 5,000 · NO TZS 5,000, and neither side can take more without passing the other."
  - (a)–(c) write no intent. The press is REFUSED with the family code.
  - (d) The margin makes the race safe:
    - `lockedForHouse` counts the stake only when its exit close ≤ DB `now()` − 7 s.
    - A container at most 5 s behind then already sees the window closed, so the cash-out refuses.
    - If the cash-out committed first, the in-lock sum no longer includes it and H3 refuses `house_condition_gone`.
    - The HB-LC-04 free option never opens.
- **Plan:** N1 §4.2 step 5; N1 §4.1 `lockedForHouse` + `LOCK_MARGIN_MS`; A15; A24 clock skew.
- **Evidence:**
  - `src/lib/server/market-service.ts:2662`: `sinceBet` uses the cashing container's `Date.now()`.
  - `:2734` and `:2793`: cash-out decides sellable inside `market:<id>` on its own clock.
  - `04-amendments.md:619`: A24 stops claims only above 5 s skew.
  - `01-scenario-register.md:772`: HB-LC-04.
- **Fix:** N1 §4.1: one SQL aggregate on the lock transaction with the exit-window filter and `LOCK_MARGIN_MS = 7000`.
- **Test:**
  - `test:house-bot-engine`: (a) at exit − 1 s, at exit + 3 s, and allowed at exit + 7 s; `retryAtIso`; (b); (c).
  - Constants test: `LOCK_MARGIN_MS` ≥ 5,000 + 2,000.
  - Golden-grid parity of the SQL exit expression against `exitWindowClosesAt` (A14 grid).
  - `test:house-bot-caps`: two processes with injected clocks +5 s and −5 s; a cash-out racing a THIN press never succeeds after a house stake counted it.
  - `red:house-bot-money` mutation "THIN uses raw pools instead of `lockedForHouse`" must fail (a).

### TGT-08 [gap] Master OFF at press, and OFF landing mid-flight
- **Trigger:**
  - (a) The switch is OFF when the modal opens.
  - (b) Another admin switches OFF after the modal opened.
  - (c) OFF lands while the inline fire waits for `market:<id>`, so A9's conditional cancel makes the CLAIMED row CANCELLED.
  - (d) OFF lands after the bet already holds `house:control`.
- **Expected:**
  - (a) "House bots are off. Switch them on to use Enter now."
  - (b) "House bots were switched off by {name | the system: {cause}} at {HH:MM:SS} EAT after you opened this. Nothing was placed."
  - (c) The row is already CANCELLED(MASTER_OFF), with 0 positions.
    - H0 loads the intent by id without a status filter. Its figures match, so the bet continues.
    - H4 then refuses `house_disabled`, or `markPlaced` returns 0 rows → `house_intent_superseded`.
    - Never `house_key_mismatch`: 0 SECURITY rows, and `offCause` stays MANUAL.
    - Modal: "Cancelled — house bots were switched off. Nothing moved."
  - (d) Placed. OFF shows the drain copy "Switched off. A bet already in its final step may still complete." Modal: "Placed — it was already in its final step when house bots were switched off."
  - The modal's final state always comes from `getEnterNowStatusAction`.
- **Plan:** N1 §4.3 master OFF; N1 §3 ordered H0; A9; C10.
- **Evidence:**
  - `04-amendments.md:273-276`: A9 writes OFF first, then drains with a 3 s lock timeout.
  - `PLAN.md:202`: `markPlaced` is conditional on `status='CLAIMED'`.
  - `src/lib/server/locks.ts:112-121`: nested locks join the parent transaction until it commits.
- **Fix:** N1; N1 §3 H0 without a status filter.
- **Test:**
  - `test:house-bot-caps`: OFF injected before H1, while waiting on the market lock, and while holding `house:control` → CANCELLED / superseded / PLACED. 0 SECURITY rows and `offCause` unchanged in every arm.
  - `test:house-bot-console`: stale-switch copy.
  - `red:house-bot-money` mutation "H0 filters `status='CLAIMED'`" must fail arm (c).

### TGT-09 [gap] Bot paused or auto-paused, holder cause, or void consent at press
- **Trigger:**
  - (a) Another admin paused Bot A after the modal opened.
  - (b) The holder self-excluded (consent void), or their password changed, or their wallet is frozen.
  - (c) The password change lands after the intent insert, and the SSE HOUSE_BOT bell for the auto-pause reaches the open page while the modal shows "Placing…". In the same seconds another admin saves `enterNow.enabled=false`.
- **Expected:**
  - (a) "{name | The system} paused Bot A at {HH:MM} EAT after you opened this ({reason}). Nothing was placed."
  - (b) The first cause's C8/C9 copy + " Enter now is off until this is fixed." The press is REFUSED with the cause code, and no intent is written.
    - A consent void also ends every ACTIVE target of Bot A (TGT-40).
  - (c) H2 refuses `house_consent_stale` → AUTO_PAUSED(PASSWORD_CHANGED) through the A10 mapper, with its usual audit and alerts. The modal says "Not placed — Bot A auto-paused: password changed."
    - The open dialog counts as dirty, so C11 shows its change Callout instead of dispatching `50pick:refresh`.
    - The modal stays mounted. The strip's Enter now button renders disabled with its reason instead of unmounting.
    - Exactly one refresh runs when the dialog closes.
- **Plan:** N1 §6 bot and holder refusals; §8 open dialog counts as dirty; A2; A3; C8; C9; C11.
- **Evidence:**
  - `src/lib/server/responsible-gambling.ts:349`: `isLockedOut`.
  - `PLAN.md:261`: `house_consent_stale` → AUTO_PAUSED(PASSWORD_CHANGED).
  - `04-amendments.md:959-961`: C11 dispatches `50pick:refresh` on a clean page.
- **Fix:** N1; UX-04 dialog-dirty rule.
- **Test:**
  - `test:house-bot-holder-lifecycle`: each cause refuses with its copy, 0 intents, press REFUSED.
  - `test:house-bot-engine`: a cause injected between insert and H2 → auto-pause, 0 positions.
  - jsdom: open the modal, emit a HOUSE_BOT SSE event and a status change → 0 refresh dispatches and the modal is still mounted; close → exactly 1 refresh.

### TGT-10 [gap] Staff-chosen caps under concurrency, unset or cleared global caps, and the minimum gap
- **Trigger:** Bot A has min gap 30 s and `capStaffChosenPerDay` 3.
  - (a) The owner presses on distinct polls P1, P2 and P3, 35 s apart, then P4.
  - (b) Bot A has 2 PLACED staff-chosen stakes today and its last bet was 40 s ago. Two admins press on P3 and P4 at the same instant.
  - (c) Bot A has 2 PLACED MANUAL stakes today, a targeted COUNTER fires (the 3rd), and then the owner presses Enter now.
  - (d) `gCapStaffChosenPerDay` 3 and `gMaxBetsPerMinute` 20: 10 presses at once across Bots A–J on 10 distinct polls, each bot's own caps free. Second run: `gCapStaffChosenDailyTzs` 30,000, 10 × 9,000.
  - (e) `gCapStaffChosenPerDay` is NULL.
  - (f) While ON, with one PENDING MANUAL, the owner clears `gCapStaffChosenPerDay` on Limits.
  - (g) Bot A's last bet was 8 s ago.
- **Expected:**
  - (a) 3 PLACED. The 4th press is refused before insert with the STAFF_CHOSEN_PER_DAY pre-check copy (N1 §6).
  - (b) Both pass the pre-checks, and H2 under `wallet:<botUser>` serializes them: 1 PLACED + 1 SKIPPED(CAP_STAFF_CHOSEN_PER_DAY). The declared H2 order puts staff-chosen caps before the deferrable MIN_GAP, so the loser never reports CAP_MIN_GAP.
  - (c) The targeted COUNTER counts against the same cap, because the count covers `kind='MANUAL' OR "targetId" IS NOT NULL`. The press is refused as in (a).
  - (d) H4 under `house:control` gives exactly 3 PLACED + 7 SKIPPED(CAP_GLOBAL_STAFF_CHOSEN_PER_DAY). The TZS run gives 3 + 7 SKIPPED(CAP_GLOBAL_STAFF_CHOSEN_DAILY_STAKE).
  - (e) Every press is refused with `field` `gCapStaffChosenPerDay` and href `/admin/desk?tab=limits`.
    - The fix link closes the modal first (its `submitId` is discarded; the reason draft is kept), then `router.push`, then `focusFirstInvalid`.
    - Switching house bots ON is not blocked: PLAN F3's "Set N global limits first" list excludes staff-chosen caps.
  - (f) The clear is allowed: staff-chosen caps are exempt from 02 §3.8.
    - Consequence preview: "Enter now and targets will be off for every bot. 1 queued staff-chosen stakes will be skipped."
    - The clear takes `house:control` briefly.
    - The PENDING MANUAL's H4 re-read sees NULL → SKIPPED(CAP_GLOBAL_STAFF_CHOSEN_PER_DAY), 0 positions, and automated intents are untouched.
  - (g) The preview shows "Next possible {HH:MM:SS} EAT (minimum gap 30 s)". The press is refused: "Bot A's last bet was 8 s ago; its minimum gap is 30 s. Possible from {HH:MM:SS} EAT."
    - If an automated bet lands after an insert, a 30 s gap frees only after `staleAt` (15 s), so the fire gives SKIPPED(CAP_MIN_GAP), not a deferral.
  - The preview limits line reads, e.g., "Staff-chosen used today: 2 of 3 · TZS 18,000 of TZS 30,000 · all bots: 5 of 10 · TZS 45,000 of TZS 100,000".
- **Plan:** N1 §2 staff-chosen cap family; §3 H2 declared order and H4; §5; A24 deferral; I6.
- **Evidence:**
  - `PLAN.md:322`: min gap ≥ 20 s.
  - `PLAN.md:200`: the H2 cap list has no order.
  - `02-sealed-flows.md` §3.8: "Can't clear a limit while bots are on. Switch off first."
  - `src/lib/server/rate-limit.ts:95`: `bet.place` 30 / 10 per minute, shared with the holder.
- **Fix:** N1 §2 caps, §3 order pinned in `scripts/anchors/house-bot-seam.anchors.mjs`; clear-while-ON exemption.
- **Test:**
  - `test:house-bot-caps` (Postgres + memory):
    - (a) with an injected clock stepping past the gap;
    - (b), (c), (d) for count and TZS;
    - (f);
    - a test that asserts the declared H2 order from the anchors file.
  - `test:house-bot-console`: refusal copy, href, focus after the push, consequence preview.

### TGT-11 [gap] The holder holds their own stake; the holder bets against their bot after an Enter now
- **Trigger:**
  - (a) Bot A's holder has their own OPEN stake on P when the owner opens Enter now.
  - (b) The holder stakes on P after the intent insert but before H2.
  - (c) After Enter now NO 9,000 on P, the holder stakes YES 20,000, then YES 5,000.
- **Expected:**
  - (a) Picker row greyed "The holder has their own stake here". The press is refused: "The holder has their own open stake on this market, so Bot A can't enter it."
    - The press is REFUSED with code OWNER_POSITION.
    - COMPLIANCE `house_bot.enter_now_refused {botId, marketId, code}` is written through the press lease.
    - If the action dies before the append, the planner repairs it after 60 s, once.
  - (b) H2 refuses `house_market_conflict{OWNER_POSITION}` → the PLAN §4.6 mapper row. 0 positions.
  - (c) Both holder bets commit and are never refused.
    - One A21 AlertOnce `holder-against:<botId>:<marketId>` and event HOLDER_AGAINST_BOT.
    - The second bet raises nothing, and Bot A's status is unchanged.
- **Plan:** PLAN §3 H2; A21; N1 §2 press flow step 6; N1 §6 holding refusals.
- **Evidence:**
  - `src/lib/server/market-service.ts:1174-1202`: a player may hold both sides.
  - `04-amendments.md:553-555`: A21 hook check, never refuse, never pause.
- **Fix:** N1.
- **Test:**
  - `test:house-bot-caps`: OWNER_POSITION before insert and between insert and H2.
  - `test:house-bot-engine`: A21 after MANUAL → 1 alert for two holder bets.
  - `test:house-bot-reports`: ~~the refused press is in the R1 Enter now register with code OWNER_POSITION and~~ exactly 1 COMPLIANCE row, including after an audit killed after its lease (repaired once when the lease expires).
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no R1 Enter now register (C5-SPEC rulings 199–207); the refused press row, its code and its one COMPLIANCE row are untouched by D20. Coverage gate: partly struck by D20.

### TGT-12 [gap] Another bot holds the market, this bot has a queued stake there, or it holds the other side
- **Trigger:** Poll P. Four setups:
  - (a) Bot B holds a COUNTER position on P.
  - (b) Bot B has a PENDING FILL on P.
  - (c) Bot A has a PENDING COUNTER on P, due in 40 s.
  - (d) Bot A holds NO 8,000 from an earlier COUNTER. Players have locked YES 12,000 and locked NO 30,000, so raw NO is 38,000 and the formula side is YES.
  - (e) Bot A holds 2 NO stakes with `freqMaxPerMarket` 2, and the formula side is NO.
  - (f) Race: an automated OPPOSITE_SIDE or OTHER_BOT position commits between the insert and the locks.
- **Expected:**
  - (a) and (b): picker "Held by Bot B"; press "Bot B already holds this market. One bot per market."
  - (c) "Bot A already has a queued stake here (Counter, due {HH:MM:SS} EAT). Wait for it or cancel it first."
  - (d) OWN_OTHER_SIDE: "Bot A already holds NO here and the thinner side is now YES, so it can't add." The picker greys the row, and the press is REFUSED with code OWN_OTHER_SIDE.
  - (e) "Bot A has 2 of 2 stakes on this market." The picker greys the row.
  - (f) H2 `house_market_conflict{OPPOSITE_SIDE}` → SKIPPED(CAP_OPPOSITE_SIDE), with its own feed-copy row (never the MARKET_HELD sentence). H3 OTHER_BOT → SKIPPED(MARKET_HELD). Two bots racing still give exactly one position.
- **Plan:** I3; N1 §4.2 (`enterNowDecision` takes the bot's own OPEN house positions), §6 holding refusals; PLAN §4.4 MARKET_HELD.
- **Evidence:**
  - `PLAN.md:34`: I3, one bot and one side per market.
  - `PLAN.md:200-201`: H2 OPPOSITE_SIDE and PER_MARKET_COUNT; H3 OTHER_BOT.
  - `PLAN.md:269`: `house_market_conflict` → SKIPPED(MARKET_HELD) today.
- **Fix:** N1 §4.2 own-position input; the mapper row for OPPOSITE_SIDE.
- **Test:**
  - `test:house-bot-engine` and `test:house-bot-console`: each of (a)–(e) refused with its copy, 0 intents.
  - `test:house-bot-caps`: (f) → SKIPPED(CAP_OPPOSITE_SIDE) with its feed sentence; two bots racing → 1 position.

### TGT-13 [gap] Up & Down market id posted directly to Enter now → refused, 0 intents
- **Trigger:**
  - (a) A tampered or buggy client posts `enterNowHouseBotAction` with the market id of BTC 5-min #412, pasted from `/admin/updown`.
  - (b) `previewEnterNowAction` gets the same id.
  - (c) The owner types "btc" into the Enter now picker.
  - (d) A builder bypasses the action and inserts a MANUAL intent with `productLine` UPDOWN through the DAL.
- **Expected:**
  - (a) Refused: "Enter now is for polls only. Up & Down entries are automatic."
    - The press is REFUSED with its code (N1 §6).
    - 0 intents, 0 `OPENER_SIDE_DRAWN`, 0 `ENTER_NOW_REQUESTED`, no COMPLIANCE row.
    - The product check reads the raw `productLine`.
  - (b) Same copy. The product check runs before either preview write, so there is no draw and no `ENTER_NOW_PREVIEWED`.
  - (c) The picker lists polls only. No Up & Down option is shown, greyed or otherwise.
  - (d) `CHECK (kind<>'MANUAL' OR "productLine"='MARKET')` rejects the insert, and the memory twin rejects it the same way.
  - Up & Down entries stay automatic (COUNTER, FILL, OPENER). Exact timing there is the COUNTER delay with min = max (TGT-20).
  - Up & Down Enter now is in §5 "Explicitly NOT built", item 4. A future amendment would need a price no older than 5 s at preview, at fire and inside the lock; a tighter manual closeness limit; and a COMPLIANCE ruling.
- **Plan:** N1 §2 CHECK; N1 §6 product refusal; N1 §8 picker (polls only); §5 Explicitly NOT built (item 4).
- **Evidence:**
  - `04-amendments.md:439`: A15 accepts a vendor bar up to 120 s old.
  - `src/lib/server/updown-terminal-vendor.ts:51`: `CACHE_TTL_MS = 30_000`.
  - `PLAN.md:92-93`: the closeness rule exists so the house never cherry-picks the side already winning.
  - `src/lib/server/market-dal.ts:158`: the DAL turns every product line other than UPDOWN into MARKET, so the check must read the raw column.
- **Fix:** N1 (polls only, W9).
- **Test:**
  - `test:house-bot-migrations`: the CHECK rejects a MANUAL UPDOWN row and accepts a COUNTER UPDOWN row.
  - `test:dal-parity`: the memory twin rejects it too.
  - `test:house-bot-console`:
    - (a), (b) → the copy, 0 HouseBotIntent and 0 HouseBotEvent rows, press REFUSED;
    - (c) → 0 Up & Down options.
  - `red:house-bot-console` mutation "product refusal removed" must fail (the CHECK surfaces instead of the copy).

### TGT-14 [gap] Information blackout: a result check is recorded, a resolve claim is live, or the claim is stale
- **Trigger:**
  - (a) At 18:00, three hours before `resolutionAt`, an officer presses "Re-check this market now" on LIVE poll P. The AI returns YES at 70%: an outcome, but not confident. Sentinel fields are stamped and P stays LIVE.
    - Bot A has an ACTIVE target on P with a PENDING targeted reaction.
    - Another admin opens Enter now on P.
  - (b) The scheduled resolve trigger claims poll Q (`resolveClaimedAt` set) and is running its AI call. A press on Q.
  - (c) That trigger crashed after the claim, leaving `resolveClaimedAt` 9 min old; a second fixture has it 11 min old. Bot A has an ACTIVE target on Q.
  - (d) The stamp on P commits while a fire already past its re-checks waits for `market:P`.
  - (e) During the operator's paid AI call (before `resolveDueMarket` takes the claim), a press on P2, which has no verdict yet.
- **Expected:**
  - **Blocked when:** `status='LIVE'` and any of these holds:
    - `sentinelOutcome`, `sentinelConfidence`, `sentinelDetermined`, `sentinelClosedAt`, `resolvedOutcome` or `resolutionStage1By` is non-null;
    - `resolveClaimedAt` is younger than `RESOLVE_CLAIM_TTL_MS`;
    - `reopenedAt` is non-null.
  - (a) The picker greys P, and the press is refused: "Not available: an AI result check is recorded on this market."
    - The press is REFUSED with code INFO_BLACKOUT, and COMPLIANCE `house_bot.enter_now_refused {botId, marketId, code:'INFO_BLACKOUT'}` is written.
    - The planner ends the target ENDED(INFO_BLACKOUT) within 15 s, with a TARGET_ENDED event.
    - The pending reaction ends SKIPPED(INFO_BLACKOUT) at fire.
  - (b) Refused the same way while the claim is live.
  - (c) At 9 min: blocked, but `endTargets` skips its pass for a `resolveClaimedAt`-only block, so the target stays ACTIVE. At 11 min: not blocked, and Enter now proceeds.
  - (d) The H3 re-read under `market:P` refuses `house_info_blackout` → SKIPPED(INFO_BLACKOUT). 0 positions, no alert.
  - (e) Allowed. No verdict exists anywhere during that call, and this is the only unmarked window.
  - **Isolation:**
    - `blackout.ts` exports only `{blocked:boolean}`.
    - `decide.ts` receives `blocked` as an injected argument and never imports `blackout.ts`.
    - Automated untargeted decisions on P are byte-identical to an unstamped twin.
- **Plan:** N1 §3 H3; N1 §4.1 `blackout.ts`; PLAN §18 rows amending I2 and A13; N2 §4 `endTargets`.
- **Evidence:**
  - `src/lib/server/market-service.ts:2212-2215`: claim under `market:<id>`, TTL at `:2054`.
  - `:2256-2270`: `sentinelFields` exist only when the AI returned an outcome.
  - `:2355-2363`: the early re-check stamps and keeps the market LIVE.
  - `src/app/admin/resolver-queue/resolution-mode-action.ts:70-71`: the AI call runs before the claim.
  - `src/app/admin/resolver-queue/page.tsx:489`: "Sentinel says".
  - `PLAN.md:33`: I2.
- **Fix:** `blackout.ts`, H3 refusal, `endTargets` skip rule, PLAN §18 rows.
- **Test:**
  - `test:house-bot-info-edge`: the twin; source pins (exports and importers of `blackout.ts`; `decide.ts` doesn't import it).
  - `test:house-bot-caps`: (d) in-lock stamp.
  - `test:house-bot-engine`: stale-claim fixture at 9 and 11 min; the target is ended within one pass in (a).
  - `red:house-bot-engine` mutation "blackout call removed from `fire.ts`" must fail the no-lock SKIPPED assertion.

### TGT-15 [gap] 50pick busy, a held wallet lock past `staleAt`, or the engine stale or disabled
- **Trigger:**
  - (a) Admission is saturated at the press.
  - (b) Admission frees for the insert, then saturates. The inline fire and the poller retries all return BUSY.
  - (c) The holder's withdrawal holds `wallet:<botUser>` from T−1 s to T+19 s, and the inline fire at T enters `placeHouseBet`.
  - (d) P2028 is injected three times between T+14 s and T+18 s.
  - (e) The container is killed with `kill -9` inside the locks after the claim.
  - (f) Poller beats are 45 s old.
  - (g) `HOUSE_BOT_ENGINE=false`.
- **Expected:**
  - (a) "50pick is busy right now — nothing was placed. Try again in a few seconds." The press is REFUSED with code BUSY, and no intent is written.
  - (b) Attempts run at T, T+1 s, T+6 s and T+14 s (the backoff is capped at `staleAt` − 1 s).
    - Each BUSY requeue leaves `attempts` where it was before that claim and adds 1 to `transientAttempts`.
    - After the fourth BUSY no requeue fits before `staleAt` − 1 s, so the row ends EXPIRED(STALE). The planner runs its STALE pass before its POISON pass, and POISON applies only to `attempts` ≥ 3. So no POISON row and no alert.
    - "Retrying" shows only while `nextAttemptAt` < `staleAt`.
    - Modal: "Not placed: 50pick was busy until the time limit (15 s) passed. Nothing moved."
  - (c) The wallet lock frees at T+19 s and H2–H4 pass.
    - Inside `house:control`, before `markPlaced`, the seam re-reads the claimed row. `NOT ("staleAt" > clock_timestamp())` on the DB clock gives BetAbort → `house_intent_stale` → EXPIRED(STALE).
    - No alert, 0 positions.
    - The action returned after 10 s with CLAIMED, and the modal polled to the result.
  - (d) The retry replays the same key. H0 loads the row without a status filter and its figures match. The `staleAt` check refuses, so there are 0 positions.
  - (e) Rollback. The planner marks the CLAIMED MANUAL row EXPIRED(STALE) once `staleAt` + 5 s < now(), without waiting for `claimedUntil`. That frees `hbi_manual_live_market_uq` within one pass, and a new press on the market is accepted.
  - (f) "The bot engine is not running (last seen {HH:MM:SS} EAT). Enter now is off until it runs."
  - (g) "The bot engine is disabled on this server, so Enter now is off."
- **Plan:** N1 §4.3; N1 §3 `staleAt` in the seam; N1 §4.3 transient requeue; A10 poison; A24; C11 engine health.
- **Evidence:**
  - `src/lib/server/admission.ts:168-201`: sheds only on a full queue or `maxWaitMs <= 0`, with no per-call option.
  - `src/lib/server/locks.ts:126-143`: the advisory lock is the first statement of its own `$transaction` (timeout 30 s, maxWait 10 s).
  - `04-amendments.md:283`: the 2 s `lock_timeout` covers only `market:<id>` and `house:control`.
  - `src/lib/server/retry.ts:47-54`: P2028 and 08006 retryable, 4 attempts.
  - `04-amendments.md:317`: poison rule.
  - `PLAN.md:258`: BUSY backoff.
- **Fix:** N1 §3 `staleAt`; N1 §4.3 transient requeue; `BET_PATH_REASONS` and `GATE_PARITY {exempt:'house context only'}` gain `house_intent_stale`.
- **Test:**
  - `test:house-bot-caps` (Postgres): (c) → EXPIRED(STALE) between T+15 s and T+20 s, 0 positions, 0 alerts; (d) → 0 positions; (e) → index freed within one pass after `staleAt` + 5 s.
  - `test:house-bot-engine`: 5 BUSY outcomes before `staleAt` (test backoff 2 s) → EXPIRED(STALE), `transientAttempts` 5, 0 POISON rows, 0 alerts; pass order STALE before POISON.
  - `test:house-bot-seam`: `GATE_PARITY` row.
  - `test:house-bot-console` fake timers: "Retrying" hidden once `nextAttemptAt` ≥ `staleAt`; (f), (g) copy.
  - `red:house-bot-money` mutation N1-5 must fail (c) (a position appears).

### TGT-16 [gap] Deploy mid-press or mid-poll, closing mid-flight, a lost response, NO_RECORD versus CHECKING
- **Trigger:**
  - (a) A deploy lands while the modal is open, and the press hits `UnrecognizedActionError`.
  - (b) The press is sent and the server places it, but the connection drops before the reply.
  - (c) An injected 50 s stall holds the press in CHECKING before the intent insert. The client's 45 s card offers "Check now".
  - (d) A BUSY refusal is recorded, but its reply is lost.
  - (e) A deploy lands while the modal polls status during Retrying.
  - (f) The owner closes the modal (✕ or Esc) during Placing, then reloads.
  - (g) The TOTP cookie expires during status polling.
  - (h) The deploy's SIGTERM reaches the container while an inline fire is running.
- **Expected:**
  - (a) STALE_BUILD: "50pick was updated. This page is from the previous version, so nothing was saved. Your changes are kept — press Reload, then save again."
    - This is true: the action never ran, so there is no press row.
    - The reason is restored from the C12 draft, the pending marker is cleared, and the next press mints a new `submitId`.
  - (b) From 8 s the sub-label reads "It carries on if you close this window. The result will show on this page and in Activity." At 45 s: "No answer from 50pick — we don't know if this was placed."
    - "Check now" calls `getEnterNowStatusAction(botId, submitId)`. The press is DONE, so it shows "Placed · TZS {x} {SIDE} on “{title}” at {HH:MM:SS} EAT."
    - "Try again" calls status first. It resends the same `submitId` only while no definitive answer exists, and a resend returns the recorded state with `duplicate:true`.
  - (c) While the press is CHECKING, status says "Still checking this press…", never "Not placed". It then follows the press to QUEUED or DONE.
    - NO_RECORD appears only when no press row exists (the request never reached the server): "No stake was recorded for this press. Nothing moved. You can press Enter now again."
  - (d) "Try again" → status → REFUSED{BUSY} → "50pick is busy right now — nothing was placed. Try again in a few seconds." Never DUPLICATE_SUBMIT. The next press mints a new `submitId`.
  - (e) The status call's STALE_BUILD shows "50pick was updated while this was being placed. Reload to see the result, and don't press Enter now again until you have."
  - (e) and (f) after the reload: the BotStrip finds sessionStorage `hb:pendingEnterNow:<botId>` `{submitId, marketId, title, at, build}`, under 10 minutes old.
    - It reads status and shows a Callout: "Your Enter now on “{title}” at {HH:MM:SS} EAT: Placed · TZS {x} {SIDE}", or "Not placed: {sentence}. Nothing moved.", or "…is still being placed.", with "View in activity".
    - The marker is cleared on a terminal status.
  - (g) "Verify again to see the result of your Enter now — it may already be placed." A REAUTH on search or preview shows C12's re-auth copy, never "Search failed. Try again."
  - (h) The intent is registered in `globalThis.__50PICK_HOUSE_BOT_ENGINE.inFlight`, so the SIGTERM requeue skips it. The row stays CLAIMED, and there is at most one position.
- **Plan:** N1 §2 press flow steps 7–8; §4.3 (`fireClaimedIntent` in-flight registration); §8 result states and pending marker; C11 uncertain results; C12.
- **Evidence:**
  - `src/lib/client/run-admin-action.ts:22-32`: any throw becomes "Server error — nothing may have applied."
  - `04-amendments.md:1010`: C12 STALE_BUILD copy.
  - `04-amendments.md:1017`: `hb:pendingOff` marker precedent.
  - `04-amendments.md:964-966`: C11 8 s label and 45 s card.
  - `04-amendments.md:612`: SIGTERM requeues claims not in flight.
  - `PLAN.md:156`: AlertOnce can't replay a refusal.
- **Fix:** N1 HouseBotPress status reads; pending marker; status-call copy mapping; in-flight registration.
- **Test:**
  - `test:deploy-skew`: arms for `enterNowHouseBotAction` and `getEnterNowStatusAction`.
  - `test:house-bot-console` fake timers:
    - (b) 8 s label and 45 s card;
    - Check now on DONE, REFUSED, CHECKING and no row;
    - (c) a 50 s stall plus a concurrent status read → never NO_RECORD for a press that then places;
    - (d) → REFUSED{BUSY};
    - (e) STALE_BUILD on the third poll → exact copy, and the marker renders the post-reload Callout;
    - (f) close during Retrying, reload → Callout;
    - (g) copy.
  - `test:house-bot-engine`: (h) → row CLAIMED, 1 position.

### TGT-17 [gap] Re-auth and non-owner attempts on every N1/N2 action
- **Trigger:** (a) The admin's TOTP cookie expired while they typed a reason. (b) They signed in on another device. (c) A FINANCE, SUPPORT or RESOLVER user posts an action directly. (d) The TOTP cookie expires while the Enter now modal polls status for a QUEUED press. The actions are `searchHouseBotMarketsAction`, `previewEnterNowAction`, `enterNowHouseBotAction`, `getEnterNowStatusAction`, `previewHouseBotTargetAction`, `addHouseBotTargetAction`, `updateHouseBotTargetAction`, `removeHouseBotTargetAction` and `cancelHouseBotIntentAction` on a staff-chosen intent.
- **Expected:**
  - `requireHouseOwner()` is the first statement of every action. It runs before input validation and before the HouseBotPress insert (N1 §2 press flow step 1).
  - (a)/(b) REAUTH_TOTP or REAUTH_LOGIN with `next`, and no redirect is thrown. 0 HouseBotPress, HouseBotIntent, HouseBotEvent, HouseBotTarget and audit rows. The reason is kept in the C12 sessionStorage draft. The next press mints a new submitId, because no press row exists for the refused request.
  - Search and preview calls that hit REAUTH show C12's re-auth copy, never "Search failed. Try again."
  - (c) NOT_OWNER plus exactly one SECURITY `privilege_escalation_blocked` row. 0 press rows. The preview writes no `OPENER_SIDE_DRAWN` and no `ENTER_NOW_PREVIEWED`.
  - (d) The status call shows "Verify again to see the result of your Enter now — it may already be placed." After re-auth, the page reads status with the submitId kept in the `hb:pendingEnterNow:<botId>` marker (UX-03). It never says "nothing was saved".
- **Plan:** C12; N1 §2 press flow step 1; N1 §6; N2 §6; N1 §8 (UX-03); PLAN §12 console.
- **Evidence:** `rbac-guard.ts:208-225` (`requireOwner` accepts any ADMIN and redirects or throws; SECURITY row at `:215`).
- **Fix:** `requireHouseOwner` first in each of the 9 exports; press insert only after it.
- **Test:** `test:house-bot-console`: 8 non-owner roles × 9 actions → NOT_OWNER, 1 SECURITY row each, 0 rows in the four house tables; REAUTH without a redirect; a source pin that `requireHouseOwner` is the first awaited call in each export. `red:house-bot-console` mutation "`requireOwner` swapped in" must fail.

### TGT-18 [gap] Replica duplicate: inline fire on one container, poller on another, SIGTERM and a late lock
- **Trigger:** Two containers, A and B, run during the 60 s overlap (F7). A's action inserts the MANUAL intent (press QUEUED) and claims it inline, while B's poller ticks in the same second. Variants: (a) A is killed after the claim, before the locks. (b) A is killed inside the locks. (c) A is killed after commit. (d) A gets SIGTERM during the inline fire. (e) The holder's withdrawal holds `wallet:<botUser>` for 20 s, so the fire's lock transaction expires (P2028) and retries.
- **Expected:**
  - B's claim needs a PENDING row or an expired claim, so it can't take A's live claim. There is at most one position: `hbi_manual_anchor_uq`, and I4's key `hb:<intentId>`.
  - (a)/(b) Rollback. The planner marks the CLAIMED row EXPIRED(STALE) once `staleAt + 5 s < now()`, without waiting for `claimedUntil` (N1 §4.3). That frees `hbi_manual_live_market_uq`. The press moves to DONE. If any fire reaches the seam later, the in-lock `staleAt` re-read refuses `house_intent_stale` → EXPIRED(STALE), with no alert.
  - (c) PLACED, because `markPlaced` is in the same transaction. A8 repairs `notifyAdminsHouseBotStaffChosen` once. The press-row lease repair writes exactly one COMPLIANCE `house_bot.enter_now` after 60 s.
  - (d) The inline intent is in `globalThis.__50PICK_HOUSE_BOT_ENGINE.inFlight`, so the SIGTERM requeue skips it. The row stays CLAIMED, the 30 s heartbeat runs, and there is one position at most. It counts toward A's `$freeSlots`.
  - (e) The lock is acquired at about T+20 s, and the re-read inside `house:control` sees `NOT ("staleAt" > clock_timestamp())` on the DB clock → `house_intent_stale` → EXPIRED(STALE), 0 positions. The modal's final status comes from `getEnterNowStatusAction`, never from the inline return value.
  - BUSY and 55P03 requeues increment `transientAttempts`, not `attempts`, so no FAILED(POISON) row or alert appears.
  - `fireClaimedIntent` throws when called inside a lock or an ambient admission slot.
- **Plan:** N1 §4.3 (inline fire, transient requeue, planner expiry); N1 §3 `staleAt`; A8; A10; A24 SIGTERM row; F7.
- **Evidence:** PLAN:226 (SIGTERM requeues this instance's non-firing claims), :246 (`$freeSlots` = 2 − in-flight), :249 (heartbeat); `locks.ts:107-121` (a nested lock joins the parent transaction), `:137` (advisory lock is the transaction's first statement); `admission.ts:168-186`; `retry.ts:47-50` (P2028 and 08006 retried).
- **Fix:** the N1 §4.3 in-flight registry and assertions; the N1 §3 seam check; the N1 §4.3 planner expiry at `staleAt + 5 s`.
- **Test:**
  - S4 rehearsal 3 (two OS processes) with MANUAL cases: `kill -9` after the claim, inside the market lock and after commit → at most 1 position per intent, and 0 CLAIMED rows after `staleAt + 5 s` plus one planner pass. SIGTERM during an inline fire → row CLAIMED, then 1 position.
  - `test:house-bot-caps` (Postgres): `wallet:<botUser>` held 20 s → EXPIRED(STALE) by 15–20 s, 0 positions; P2028 injected three times over 14–18 s → 0 positions; 5 BUSY outcomes before `staleAt` (injected backoff 2 s) → EXPIRED(STALE), 0 POISON rows, 0 alerts.
  - Source pins: `enterNowHouseBotAction` never calls the fire inside `withLock` or `$transaction`; a fire inside `withLock` throws.
  - `red:house-bot-money` mutation N1-5 must produce a position.

### TGT-19 [gap] A target added after a player already entered; arming decided by the sweep on DB time
- **Trigger:**
  - Player X staked YES on poll P at 14:00:00 (DB time).
  - The owner adds a target on P at DB 14:00:30, so `effectiveFrom` is 14:00:42.
  - Y stakes at 14:00:35 and Z at 14:00:50.
  - Replica 2's hook cache was loaded at 14:00:29, and its clock is 8 s ahead.
  - (d) Later the owner removes the target (no live reaction) at 14:10:00, and W stakes at 14:10:01 on replica 2.
- **Expected:**
  - No post-commit hook, on any replica, decides a poll trigger. The hook keeps Up & Down triggers only, and it is suspended while |skew| > 5 s.
  - The sweep reads targets fresh in its own pass. It decides only unmarked LIVE positions older than 5 s with no COUNTER intent, and it tests `placedAt ≥ effectiveFrom` against its DB watermark.
  - X and Y get no targeted reaction (X was before the add; Y was inside arming). Their triggers follow PLAN §4.4 scope rules with no `targetId`.
  - Z gets exactly one targeted COUNTER, decided before its `dueAt` (TGT-20 (b)).
  - (c) With replica 2's +8 s clock, a stake at DB 14:00:25 carries `placedAt` 14:00:33 < 14:00:42 and is not armed. Only a skew above 12 s could arm a stake placed before the add, and A24 alerts above 5 s.
  - (d) W is decided without the target: a scope bot may react, and 0 rows are CANCELLED(TARGET_REMOVED).
  - The add response shows "Armed from 14:00:42 EAT".
- **Plan:** N2 §4 steps 1–2; A11; A24 clock-skew and high-volume rows; PLAN §18 row amending the §4.3 fast path.
- **Evidence:** PLAN:229 (hook fast path with a 5 s soft cache), :230 (sweep keyset and watermark); `market-service.ts:1238` (`placedAt` from the bettor container's JS clock); 04-amendments.md:619 (skew guard), :622 (sweep filter).
- **Fix:** poll triggers are decided only in the sweep; `TARGET_ARMING_SEC = 12` pin kept.
- **Test:** `test:house-bot-engine`:
  - trigger 1 s before `effectiveFrom` → 0 target rows; 1 s after → 1;
  - 8 s skew with a cache loaded before the add → the target reacts to a stake after arming;
  - a stake 1 s after removal on a second process → 0 CANCELLED(TARGET_REMOVED);
  - a source pin that the hook returns before deciding when `productLine='MARKET'`.
  - `red:house-bot-engine` mutation "`effectiveFrom` dropped from the scope check" must fail.

### TGT-20 [gap] Exact timing golden rows, with the hold plus LOCK_MARGIN_MS
- **Trigger:**
  - (a) Bot A has a chain-scoped Up & Down COUNTER, delay 10–10, on BTC 3-min; a player stakes 40 s after the actual open.
  - Poll target rows (grace 5, paid 0 unless stated): (b) STAKE 10 s; (c) EXIT_CLOSE 10 s; (d) EXIT_CLOSE 5 s; (e) grace 5, paid 2, STAKE 10 s; (f) poll created at grace 5, platform grace lowered to 3 before the add, STAKE 10 s; (g) poll with grace 0, STAKE 10 s.
- **Expected:**
  - (a) `dueAt = placedAt + 10 s`. A 3-min round's runway is shorter than the grace, so the exit closes at `placedAt` and the stake is already past exit close + 7 s at +10 s. `staleAt = dueAt + 30 s`. It usually lands 12–15 s after the stake. Feed: "placed 13 s after the stake (asked 10 s)".
  - Every target uses `dueAt = max(requested, exitWindowClosesAt(trigger, market) + LOCK_MARGIN_MS)` and `staleAt = dueAt + 60 s`:
    - (b) requested +0:10, hold +5:07 → `dueAt` = `placedAt` + 5:07, `heldToExit:true`.
    - (c) requested +5:10 → +5:10, `heldToExit:false`.
    - (d) requested +5:05 < +5:07 → +5:07, `heldToExit:true`.
    - (e) exit +7:00 → +7:07.
    - (f) the frozen rates give +5:07, in `decide.ts` and in `previewHouseBotTargetAction`; never +3:07.
    - (g) no runway, so the exit closes at `placedAt`; hold +0:07, requested +0:10 → +0:10.
  - Decision JSON: `{targetId, delaySec, timingFrom, requestedDueAt, heldToExit}`.
  - Never earlier than asked: `Position.placedAt ≥ requestedDueAt` and ≥ exit close + 7 s. Feed lateness = `placedAt − requestedDueAt`.
  - The preview's `held`, `never` and sentence equal the N2 §5 golden row for each case.
- **Plan:** N2 §4 steps 5 and 12; N1 §4.1 `LOCK_MARGIN_MS`; N2 §6 target preview; N2 §5 golden rows; A14.
- **Evidence:** `market-service.ts:2655-2659` (`ratesFor(market)`: the poll's own frozen rates), `:2671` (`hadRunway`); `market-config.ts:217-218` (defaults grace 5, paid 0); `src/lib/updown-durations.ts:251-262` (the round locks `durationMinutes` after open); 04-amendments.md:619 (claims wait `dueAt ≤ now() − max(0, skew) − 2 s`).
- **Fix:** N2 absolute hold with the margin; the server-side target preview.
- **Test:**
  - `test:house-bot-rules`: `effectiveTargetTiming` = `decide.ts` on (b)–(g); constants test `LOCK_MARGIN_MS = 7000` ≥ A24's 5 s + 2 s.
  - `test:house-bot-engine`: `dueAt` for (a)–(g).
  - `test:house-bot-console`: frozen grace 5 with live grace 3 → 5:07; the action writes 0 rows.
  - `qa:house-bots-local` (local seeded DB): (b), (c) and (a).
  - `red:house-bot-engine`: "`dueAt = requested` without the exit hold" fails (b); "hold drops `LOCK_MARGIN_MS`" fails (d).

### TGT-21 [gap] "Get in 10 s after the player" while their exit is free; they cash out during the hold
- **Trigger:** FIRST target on poll P, STAKE 10 s. Player A stakes NO 12,500 at 14:00:00, so the reaction is due 14:05:07. They cash out at 14:00:15 for their full stake. Variant (b): containers with clocks +5 s and −5 s, and a cash-out attempt on the slow container at its local 14:04:58 while the fire runs at DB 14:05:07. Variant (c): player B stakes YES at 14:10:00.
- **Expected:**
  - No house stake exists before 14:05:07, so the house gives no free option.
  - The fire sees the trigger gone: H3 `house_trigger_gone` → SKIPPED(TRIGGER_EXITED). One PENALTY_BOXED event `{cause CASHED_OUT_COUNTERED}` and one AlertOnce.
  - The skipped reaction leaves the FIRST target ACTIVE. (c) is reacted to normally if B is not penalty-boxed.
  - (b) `lockedForHouse` counts A's stake only when its exit closed at least 7 s ago on the DB clock. A cash-out the slow container still accepts (it is inside that container's window) therefore never succeeds after the house counted the stake.
  - An officer cancelling the PENDING reaction before the cash-out is a veto (TGT-36), not this path.
  - No early-entry option exists anywhere (N1/N2 "Not built").
- **Plan:** N2 §4 steps 5 and 8; N1 §4.1; A15; R5; D18.
- **Evidence:** `market-service.ts:2661-2662` (`sinceBet` from the cashing container's `Date.now()`), `:2687-2691` (sellable in the window; full refund in grace), `:3278-3345` (one-sided refund branch); `market-service.ts:1238` (`placedAt` is JS time).
- **Fix:** N2 absolute hold; `LOCK_MARGIN_MS` in `lockedForHouse`.
- **Test:** `test:house-bot-engine`: cash-out during the hold → SKIPPED(TRIGGER_EXITED) + PENALTY_BOXED, 0 house positions, target ACTIVE. Two processes with injected clocks +5 s and −5 s: a cash-out racing a targeted fire at the boundary never succeeds after the house counted the stake. `red:house-bot-money` mutation N1-7 must fail the skew case.

### TGT-22 [gap] Target removed, or bot paused or removed, mid-delay
- **Trigger:** A targeted reaction on poll P is PENDING, due in 3 min. (a) The owner removes the target with a reason. (b) They press Remove with no reason. (c) They pause the bot. (d) They remove the bot. (e) The reaction is CLAIMED and already holds `house:control` when (a) lands. (f) A target with no PENDING or CLAIMED reaction is removed. (g) A second Remove arrives on the same target.
- **Expected:**
  - (a) A veto. The target becomes ENDED(VETOED), not REMOVED. The PENDING reaction is CANCELLED by a conditional update with RETURNING. Records per TGT-35. P can never be targeted again by any bot.
  - (b) Refused before any write, field `reason`: "Give a reason (5 to 300 characters)." 0 press rows.
  - (c) Reactions CANCELLED as 02 §3.4. The target stays ACTIVE and inert, and the trigger stays consumed (risk 18).
  - (d) Intents CANCELLED; the target becomes ENDED(BOT_REMOVED) in the Remove service.
  - (e) The reaction completes PLACED: the removal waits on `wallet:<botUser>` until the bet commits, then counts 0 live reactions, so the target ends REMOVED (the poll still can't be targeted again) and `target_removed.cancelled[]` is empty. If the reaction is CLAIMED but not yet inside the seam, the removal cancels it instead: the target ends VETOED, and the fire reaches H0, continues to `markPlaced` and ends `house_intent_superseded`: no `house_key_mismatch`, no SECURITY row, master stays ON.
  - (f) REMOVED, reason required. No staff-cancel audit. P can never be targeted again.
  - (g) An ok no-op: "Already removed." or "Already ended: {caption}." The press row is DONE.
- **Plan:** N2 §6 removal; N2 §2 never-retarget; N1 §3 H0; N2 §6 locks; N2 §4 steps 9–10; 02 §3.4–3.5.
- **Evidence:** `02-sealed-flows.md:332` (pause cancels PENDING), `:342` (Remove cancels PENDING and CLAIMED); PLAN:165 (COUNTER anchor unique with no status filter); PLAN:198 (H0 pre-lookup), :250 (conditional terminal writes), :271 (`house_key_mismatch` → master OFF).
- **Fix:** N2 §6 remove semantics.
- **Test:** `test:house-bot-engine` removal matrix (a)–(g). `test:house-bot-caps`: removal, auto-pause and master OFF each injected between F5 and H0 → CANCELLED or superseded, 0 SECURITY rows, `offCause` unchanged, 0 positions. `red:house-bot-money` mutation "H0 filters `status='CLAIMED'`" must fail.

### TGT-23 [gap] Target poll closed early, voided, reopened, re-checked or purged mid-delay
- **Trigger:** A reaction is PENDING on target poll P.
  - (a) Stage-1 or a single-admin resolve closes P.
  - (b) Emergency void.
  - (c) An admin presses "Re-check this market now", the AI is confident, and P closes with Sentinel fields; then another admin presses Reopen.
  - (d) P is deleted or orphan-repaired.
  - (e) A crashed resolve leaves `resolveClaimedAt` older than `RESOLVE_CLAIM_TTL_MS` on LIVE P.
  - (f) `resolveClaimedAt` is younger than the TTL when the reaction fires.
- **Expected:**
  - (a)/(b) The reaction ends SKIPPED(MARKET_NOT_LIVE) (A16 planner update or fire re-read); the target ends MARKET_CLOSED within one planner pass.
  - (c) Reopen sets `reopenedAt` and `reopenCount` in the same `marketStore.set(m)`. The target ends MARKET_REOPENED within one pass, even though no intent ever saw MARKET_NOT_LIVE, and it never re-arms. New triggers on P → SKIPPED(MARKET_REOPENED) for every mode. Add target and Enter now on P are refused: "Not available: this market was reopened after a result check." Full path: TGT-34.
  - (d) SKIPPED(MARKET_GONE); the target ends MARKET_GONE. The feed renders from `decision.snapshot`.
  - (e) Not blocked by that field alone. `endTargets` skips its pass and the target stays ACTIVE.
  - (f) Fire or H3 → SKIPPED(INFO_BLACKOUT). `endTargets` does not end the target on `resolveClaimedAt` alone. If the resolve completes, the next pass ends it MARKET_CLOSED.
  - A staff-chosen stake already PLACED on P, then voided or reopened → one AlertOnce `staff-stake-voided:<marketId>` ~~and an R1 row~~. If the voiding or reopening officer is in `requestedBy`, see TGT-38.
- **Plan:** A16 (MARKET_REOPENED now reads `reopenedAt`); N1 §2 change (r); N1 §3 blackout; N1 §4.5 `staff-stake-voided`; N2 §4 step 9.
- **Evidence:** `market-service.ts:4000-4034` (`adminReopenMarket` nulls the Sentinel fields at `:4011` and `resolveClaimedAt` at `:4024`; `market.reopened` audit at `:4029`), `:4061` (`emergencyVoidMarket`), `:2966` (`resolveMarket`); `markets/actions.ts:183`, `:203`; `resolver-queue/resolution-mode-action.ts:44` (`recheckMarketNowAction`); 04-amendments.md:457 (A16 reopen row "leaves no marker").
- **Fix:** N2 §4 `endTargets`; the N1 §2 `reopenedAt` marker; the N1 §3 resolve-claim TTL rule.
- **Test:** `test:house-bot-engine` lifecycle table: each transition gives its terminal state within one pass; reopen with no prior intent → MARKET_REOPENED; a stale-claim fixture keeps the target ACTIVE. `test:house-bot-seam`: `adminReopenMarket` output is byte-identical apart from `reopenedAt`/`reopenCount`. `red:house-bot-engine` mutation "blackout ignores `reopenedAt`" must fail.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no R1 row (C5-SPEC rulings 199–207); the `staff-stake-voided` admin alert is untouched by D20. Coverage gate: partly struck by D20.

### TGT-24 [gap] FIRST vs EVERY, a race, the per-market count and the staff-chosen caps
- **Trigger:**
  - (a) A FIRST target gets two triggers 2 s apart; both reactions fire concurrently.
  - (b) An EVERY target with `freqMaxPerMarket=2` gets 4 triggers, 2 min apart.
  - (c) A FIRST target's first reaction hits a staff-chosen cap.
  - (d) Bot A has `capStaffChosenPerDay=3`, with 1 MANUAL and 2 targeted stakes PLACED today; another targeted reaction fires.
  - (e) `gCapStaffChosenPerDay=3` with 0 placed today: 10 staff-chosen fires (5 MANUAL, 5 targeted) across 10 bots × 10 markets at once.
  - (f) `capStaffChosenPerDay` is NULL.
- **Expected:**
  - (a) H2 under `wallet:<botUser>` checks TARGET_ONCE before the deferrable rate caps (N1 §3 H2). Result: 1 PLACED + 1 SKIPPED(CAP_TARGET_ONCE), never CAP_MIN_GAP. The target ends DONE within one planner pass.
  - (b) 2 PLACED; the later ones SKIPPED(CAP_PER_MARKET_COUNT).
  - (c) The reaction is SKIPPED and the target stays ACTIVE ("until one reaction is placed").
  - (d) SKIPPED(CAP_STAFF_CHOSEN_PER_DAY): MANUAL and targeted rows count together, and the check is terminal, ahead of MIN_GAP. The same bot's automated COUNTERs are neither counted nor blocked.
  - (e) Exactly 3 PLACED + 7 SKIPPED(CAP_GLOBAL_STAFF_CHOSEN_PER_DAY) (H4 under `house:control`). The TZS cap behaves the same way.
  - (f) Every reaction → SKIPPED(CAP_STAFF_CHOSEN_PER_DAY) (NULL refuses).
  - Staff-chosen counts read `hbi_staff_bot_finished_idx` and `hbi_staff_finished_idx`, with no Seq Scan.
- **Plan:** N1 §2 staff-chosen caps; N1 §3 H2 and H4; N2 §3 H2; N2 §4 step 9.
- **Evidence:** PLAN:200 (H2 PER_MARKET_COUNT); PLAN:322 (min gap ≥ 20 s); 04-amendments.md:615 (rate caps defer within lateness, else SKIPPED).
- **Fix:** N2; the staff-chosen cap family.
- **Test:** `test:house-bot-caps` (Postgres + memory): (a), mixed MANUAL + targeted against one per-bot cap, the 10-bot global burst, and a test that asserts the declared H2 order. EXPLAIN pin extended to the two staff indexes. `red:house-bot-money` mutation N2-M1 (TARGET_ONCE removed from H2) fails (a); `red:house-bot-money` mutation N2-M2 (the staff-chosen count omits targeted rows) fails (d).

### TGT-25 [gap] Penalty-boxed, holder-recruit, staff, AGENT or bot-holder trigger on a target; counterparty caps
- **Trigger:** EVERY target on poll P. Stakes arrive from: a penalty-boxed account; an account recruited by Bot A's holder; a staff account; an AGENT; Bot B's holder's own unmarked account; a normal player already countered 3 times today. On P, a staff account also holds locked YES 50,000 beside player Q's locked YES 10,000.
- **Expected:**
  - The trigger filter is unchanged. Penalty-boxed → one SKIPPED row with `targetId` and PENALTY_BOX. Holder recruit → SKIPPED(HOLDER_RECRUIT) with `targetId`. Staff, AGENT and a live bot's account → filtered with no row (I3).
  - The player countered 3 times → SKIPPED(CAP_COUNTERPARTY_COUNT); counterparty caps apply to targeted COUNTERs (N1 §3 H4).
  - Q's reaction is cut against `lockedForHouse(YES)`, which excludes the staff account, so the 50,000 gives no room. The cut is at most TZS 10,000 minus the raw NO pool.
  - A targeted COUNTER counts only against its trigger. Pro-rata attribution is for MANUAL THIN only (TGT-37).
- **Plan:** N1 §3 H4; N1 §4.1; PLAN §4.3 trigger filter; A21.
- **Evidence:** PLAN:231 (trigger filter: PLAYER, not a live bot, not penalty-boxed); PLAN:335 (counters per player per day 3 and 30,000); 04-amendments.md:556 (HOLDER_RECRUIT).
- **Fix:** N2 (no exemption); `lockedForHouse` eligibility.
- **Test:** `test:house-bot-engine` trigger matrix, asserting the row and code per account kind. `test:house-bot-caps`: 4th counter against one player → CAP_COUNTERPARTY_COUNT; staff-only locked money on the trigger side → no room. `red:house-bot-money` mutation N1-6 (an eligibility exclusion dropped from `lockedForHouse`) must fail.

### TGT-26 [gap] A target and an automatic COUNTER compete for one trigger
- **Trigger:** Bot A has an armed ACTIVE target on Sports poll P. Bot C has poll COUNTER mode on with Sports in scope. A player stakes on P. Variants: (b) Bot A is outside its schedule. (c) Bot A is PAUSED. (d) Bot A fails a cap pre-check and Bot C is in its no-react zone. (e) Two sweep passes on two replicas decide the same trigger.
- **Expected:**
  - Exactly one COUNTER row for the trigger (`hbi_counter_anchor_uq`). Here it is Bot A's targeted reaction with `targetId`; react probability is not applied to the target candidate.
  - (b)/(c) Bot A is ineligible, so Bot C may take the trigger on its own timing: no `targetId`, `staleAt = dueAt + 600 s`, automated caps, the capped `notifyAdminsHouseBotBet`. Bot A's later reactions on P then see MARKET_HELD.
  - (d) Neither is eligible: one SKIPPED COUNTER row carrying Bot A's code and `targetId`.
  - (e) The second insert gets 23505, which `uniqueViolation(err)` names as `hbi_counter_anchor_uq` → "already decided". An unknown index name is rethrown, never swallowed.
- **Plan:** N2 §4 steps 1 and 4; N1 §2 `uniqueViolation`; PLAN §4.4.
- **Evidence:** PLAN:165 (COUNTER anchor unique, no status filter); 04-amendments.md:622 (sweep filters positions that have no COUNTER intent).
- **Fix:** N2; the DAL discriminator.
- **Test:** `test:house-bot-engine`: target + scope bot → exactly 1 row, target first; (b) → Bot C row without `targetId`; (d) → 1 SKIPPED row with `targetId`. `test:dal-parity`: `uniqueViolation` returns the same name on both stores, and an unknown name rethrows.

### TGT-27 [gap] Rules format: missing N1/N2 keys, rules from a newer build, a post-release v2
- **Trigger:** (a) A v1 rules JSON lacks `enterNow` and `targeting`. (b) A rollback leaves Bot A's rules at v99 while the owner presses Enter now, and a PENDING targeted reaction exists on an ACTIVE target. (c) Counterfactual: N1/N2 built after REL-4 with `schemaVersion: 2`.
- **Expected:**
  - (a) Parses to `enterNow {enabled:false, thinStakeTzs:null, openerStakeTzs:null}` and `targeting {enabled:false}`, with no pause. The Enter now button is not rendered, and the Add target head action is not rendered.
  - (b) The press is refused and stored as a REFUSED press row with code RULES_FROM_FUTURE: "Bot A's rules were saved by a newer 50pick build (v99). Enter now is off until that build is back." The planner skips the bot. The reaction is never placed and ends EXPIRED(STALE) after its `staleAt`. After 10 min: one AlertOnce `rules-future:<botId>:99` (F4). Bot status unchanged.
  - (c) Every bot goes AUTO_PAUSED(RULES_OUTDATED) until Rules shows the `migrateRules` diff and the owner saves. This is why N1/N2 fold into v1 (N1 §2 rules JSON v1).
- **Plan:** N1 §2 rules JSON v1; A4; C14; F4; N1 §8 (UX-20).
- **Evidence:** 04-amendments.md:184-187 (RULES_FROM_FUTURE requeues without a pause; new fields default to deny), :1683-1685 (F4 older and future rules).
- **Fix:** rules JSON v1 folded into commit 1.
- **Test:** `test:house-bot-rules`: missing keys → narrowest values, no pause. `test:house-bot-engine`: v99 for 11 min on an injected clock → 1 alert, 0 fires, the press REFUSED with its code. `test:house-bot-console`: no Enter now button while `enterNow.enabled` is false.

### TGT-28 [gap] The audit and report trail of every staff-chosen stake
- **Trigger:** One EAT month, 2 officers.
  - **Enter now:** 40 presses. 5 are refused before insert (3 INFO_BLACKOUT, 1 OWNER_POSITION, 1 BALANCED). 35 insert: 31 PLACED, 2 EXPIRED(STALE), 1 SKIPPED(CONDITION_GONE), and 1 CANCELLED by a staff cancel.
  - **Previews:** 60, each in its own minute; 2 are on empty markets.
  - **Targets:** 5 added. Their reactions: 12 PLACED, 3 SKIPPED, 1 cancelled when its target is removed.
  - **Void:** 1 emergency void of a market holding an Enter now stake.
  - **Faults:** one inline audit append fails transiently; one planner repair is killed after taking its lease.
- **Expected:**
  - **Press rows:** HouseBotPress = 47 (40 ENTER_NOW, 5 TARGET_ADD, 1 TARGET_REMOVE, 1 STAFF_CANCEL). Every refused press keeps its code.
  - **Identity:** presses = inserted MANUAL intents + refused press rows (40 = 35 + 5).
  - **Intents and events:** 35 MANUAL intents and 35 `ENTER_NOW_REQUESTED` events. 60 `ENTER_NOW_PREVIEWED`. 2 `OPENER_SIDE_DRAWN`, each with `actorId` = the previewing officer.
  - **COMPLIANCE rows, exactly:**
    - 35 `house_bot.enter_now`;
    - 4 `house_bot.enter_now_refused` (the 3 INFO_BLACKOUT and 1 OWNER_POSITION presses; BALANCED gets none);
    - 5 `target_added`;
    - 1 `target_removed`;
    - 1 `staff_intent_cancelled` (the removal's cancelled reaction is listed in `target_removed.cancelled[]`).
  - **Audit faults:** the failed append is repaired once through the press lease after 60 s. The killed repair is completed after its 5-minute lease expires. Never 2 rows for one press.
  - **Positions:** exactly 43 `market.position.opened` rows for staff-chosen stakes.
  - **Alerts:** 43 `notifyAdminsHouseBotStaffChosen` alerts per recipient; 0 staff-chosen rows in `notifyAdminsHouseBotBet`. The void sends 1 `staff-stake-voided`.
  - ~~**R1 sections:**~~
    - ~~entry split per bot and product, tying to house totals;~~
    - ~~Enter now register from HouseBotPress: 40 rows with officer names, outcome or refusal code;~~
    - ~~previews without a stake, per officer per month;~~
    - ~~markets later voided or reopened: 1;~~
    - ~~markets decided by the officer who chose a stake;~~
    - ~~staff-chosen scorecard;~~
    - ~~targets register: 5;~~
    - ~~vetoes: 2.~~
  - ~~**R9:** the void audit carries `houseStake {yes, no, staffChosen:{yes, no, requestedBy:[<officer id>]}}`.~~
  - ~~**DSAR:** holds the four event kinds of N1 §9's DSAR rule as `{kind, at, actor:'50pick owner'}`, with no press rows, reasons, marketIds or officer ids.~~
  - **Reasons and payloads:** reasons live only in event and press `reason` columns. Payload keys stay within R7. Alert bodies say "Reason recorded in the activity feed →".
- **Plan:** N1 §2 press flow steps 6 and 9; ~~N1 §9 (R9 shape, R1 sections, DSAR);~~ R7; A19; A20.
- **Evidence:** `audit.ts:23`, `:336-358` (each append takes one DB-global chain lock); 04-amendments.md:525 (A19 source scan), :536-537 (A20: house tables 7 years, AlertOnce 30 days); `market-service.ts:4061` (`emergencyVoidMarket`).
- **Fix:** HouseBotPress audit lease; ~~R1 sections~~.
- **Test:**
  - `test:house-bot-reports`: the fixture's exact counts, ~~R1 sections and R9 shape~~.
  - `test:house-bot-caps`: audit delayed 70 s → exactly 1 row; repair killed after its lease → exactly 1 row after the lease.
  - `test:house-bot-console`: payload pin; no reason text in any payload.
  - `test:dsar-secrets`: ~~the kind list,~~ no reason text.
  - `test:erasure` §8: press and event reasons become "[erased]".
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there are no R1 sections and no R9 `houseStake` on the void audit (C5-SPEC rulings 187–191 and 199–207), and no DSAR event kinds: D19 keeps them out of both releasable doors (ruling 168) and D20 strikes the internal record that held them (rulings 236–238); the press rows, intents, events, COMPLIANCE rows, audit repairs, positions and alerts are untouched by D20. Coverage gate: partly struck by D20.

### TGT-29 [gap] The picker lists polls only, leaks no private data and works at 360 px by keyboard
- **Trigger:** Poll P has a planted needle in `sentinelReasoning`, its AIPoll `reasoning` and `reviewedBy`, and positions from named players with phones. At 360 px, keyboard only, the owner:
  - types "elec";
  - picks P, types one more letter and presses Enter;
  - clears the box to 1 character;
  - pastes P's market id;
  - pastes an Up & Down market id, for purpose enter-now and for purpose target.
- **Expected:**
  - **Private data:** the `searchHouseBotMarketsAction` JSON holds only the pinned public fields. No needle, display name, phone or per-account figure appears; pools are aggregates only.
  - **Polls only:** matching uses `HOUSE_BOT_MARKET_PICKER_SEARCH` (title, category, id) through `matchesQuery` only. A pasted poll id finds P. The Up & Down id finds nothing for either purpose, because Up & Down markets are excluded, not greyed. The hint never suggests a coin.
  - **Short queries:** 0–1 characters list "Closing soonest".
  - **Selection contract:**
    - Enter in the combobox calls `preventDefault` and never submits.
    - A pick sets the title text and collapses the listbox.
    - Typing after a pick clears the selection, the preview and its submitId, and disables submit.
    - A late preview for another market is dropped.
    - Arrow keys skip `aria-disabled` options.
  - **Greyed rows** show their reason in text, never opacity. Examples: "Not available: an AI result check is recorded on this market.", "Not available: this market was reopened after a result check.", the OWN_OTHER_SIDE copy, and "Bot A has {n} of {max} stakes here"
  - **Layout at 360 px:**
    - the listbox is in-flow with no portal;
    - options wrap and are ≥44 px;
    - each "SIDE TZS x" group is a nowrap `.amount` span;
    - one polite count;
    - focus follows UX-10;
    - the picker takes `mayAct` as a prop.
  - Search writes 0 rows.
- **Plan:** N1 §8 MarketPicker (UX-01, UX-10, UX-12, UX-13, UX-19); N1 §4.4 polls only; N1 §6 search and preview; N1 §3 blackout; N1 §4.2 own position; A13; 03 phase D.
- **Evidence:** `search/fields.ts:47` (MARKET_SEARCH), `:106` (POLL_SEARCH includes AI `reasoning`), `:210` (UD_ROUND_SEARCH); `scripts/search-adoption.test.mts:75-77` (hand-rolled `.toLowerCase().includes(` fails); `select.tsx:372` (kit Select portals); `admin/markets/[id]/page.tsx:91-95`, `:396` (admin positions with name and phone); `prisma/schema.prisma:2103-2133` (AIPoll `reasoning`, `reviewedBy`).
- **Fix:** picker DAL with an explicit public select; the `MarketPicker` component.
- **Test:**
  - `test:house-bot-info-edge`: pinned DAL field list; planted needles.
  - `test:house-bot-console` jsdom: Enter with an ok preview → 0 calls to `enterNowHouseBotAction`; typing after a pick clears the preview; a late preview is dropped; pasted poll id → P; Up & Down id → 0 rows; source pin: no `.includes(` in `picker.ts`; search writes 0 rows.
  - Phase D drive at 360/768/1280 on the local seeded DB only.
  - `red:house-bot-console`: "picker DAL selects `sentinelOutcome`" and "Enter `preventDefault` removed" must fail.

### TGT-30 [gap] A bot with only Enter now or targets; schedule differences
- **Trigger:** Bot M has every automatic mode off, `enterNow.enabled` and `targeting.enabled` on, staff-chosen caps set, 2 ACTIVE targets, and schedule 08:00–18:00. At 21:00 the owner presses Enter now on poll Q, and a player stakes on target poll P at 21:05. Variants: (b) `enterNow.enabled` false with targeting on. (c) Every mode, Enter now and targeting all off.
- **Expected:**
  - Start succeeds. Its dialog says "Bot M has no automatic mode: it bets only when you press Enter now or a target reacts." and lists "Active targets: 2 →".
  - The 21:00 Enter now places: the schedule is ignored (W8).
  - The 21:05 reaction → SKIPPED(OUTSIDE_SCHEDULE) with `targetId`: targets obey the schedule (W8).
  - Strip status: `enterNow.available=true` and `targets.active=2`. Availability evaluates the refusal steps before the option step.
  - (b) The Enter now button is not rendered, and Start still succeeds.
  - (c) Start is refused: "Turn on at least one entry mode."
- **Plan:** N1 §5 Start rule; N2 §4 step 10; W8; N1 §8 (UX-20); 02 §3.3 item 6.
- **Evidence:** `02-sealed-flows.md:312-318` (Start refusals; item 6 "Turn on at least one entry mode."); PLAN:80 (F3 "no mode is on").
- **Fix:** N1 §5 Start rule.
- **Test:** `test:house-bot-console`: Start truth table (automatic modes × `enterNow.enabled` × `targeting.enabled`); strip fixture with no button. `test:house-bot-engine` schedule: MANUAL placed outside the schedule, targeted SKIPPED(OUTSIDE_SCHEDULE).

### TGT-31 [gap] Sunset, feature withdrawn, and removal with active targets
- **Trigger:** `ops:house-bots-sunset --apply --reason` runs with 3 ACTIVE targets, one PENDING MANUAL intent (its press QUEUED) and one open PLACED staff-chosen stake. Then `FEATURE_HOUSEBOTS=WITHDRAWN` is deployed. The owner then presses Enter now, Add target, Remove on an ended target, and Cancel on the cancelled intent.
- **Expected:**
  - **Sunset:** master OFF(SUNSET); every bot REMOVED(SUNSET); the MANUAL intent CANCELLED by a conditional update. Its press becomes DONE on the planner's next pass while the planner still runs, and otherwise stays QUEUED over a cancelled intent, which the status action reads as cancelled. Targets → ENDED(SUNSET) with one TARGET_ENDED event each. One COMPLIANCE `house_bot.sunset`.
  - **After WITHDRAWN:**
    - Enter now and Add target are refused: "House bots are withdrawn." Each leaves a REFUSED press row with its code.
    - Remove on the ended target is an ok no-op: "Already ended: House bots withdrawn."
    - Cancel returns "Already cancelled."
  - The open stake settles normally, and cash-out on it still returns ~~`house_position_no_exit`~~.
  - Reports keep every press, intent, target and event row (A20).
  - A second `--apply` changes 0 rows.
- **Plan:** F2; N1 §2 press flow; N2 §4 step 10; 02 §3.9.
- **Evidence:** 04-amendments.md:1638 ("gate the offer, never the refusal"), :1641-1646 (the script), :1655 (withdrawn test).
- **Fix:** the sunset script ends targets.
- **Test:** `test:withdrawn-features` section: dry run writes 0 rows; `--apply` leaves 0 ACTIVE targets and 0 live intents; a second `--apply` changes 0; press refusal copy; ~~`house_position_no_exit` unchanged;~~ ~~reports keep the house lines~~.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** reports carry no house lines. Coverage gate: partly struck by D20.
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the cash-out refusal is `origin/main`'s exit-window refusal verbatim (`exit_window_closed`, code `SELECTION_CLOSED`), and `house_position_no_exit` no longer exists (D19c; C4 ruling 147). Coverage gate: partly struck by D19.

### TGT-32 [gap] Stake bounds, balance or exposure shrink between decision and fire, for every kind
- **Trigger:**
  - (a) Enter now preview TZS 9,000 on P (THIN); before the fire the live minimum is raised to 10,000.
  - (b) The holder withdraws, leaving TZS 6,000 above the balance floor.
  - (c) An automated COUNTER is decided at 8,000; before its fire another stake uses Bot A's exposure headroom, so the clamp gives 5,000.
  - (d) A targeted COUNTER's clamp gives 4,000, but the row was cancelled a moment earlier.
  - (e) A FILL clamps from 6,000 to 3,000.
  - (f) 08006 on COMMIT after (c) placed, then the retry replays.
- **Expected:**
  - In `fire.ts`, after the F5 step-9 clamp, any clamp below `row.stakeTzs` runs `UPDATE "HouseBotIntent" SET "stakeTzs"=$c, decision = decision || jsonb_build_object('firedStakeTzs',$c) WHERE id=$1 AND status='CLAIMED' AND "claimedBy"=$me AND "stakeTzs">$c RETURNING *`. `placeHouseBet` then gets the returned row's `marketId`, `side` and `stakeTzs`.
  - (c)/(e) Placed at 5,000 and 3,000. H0 loads the row by id and matches, so there is no `house_key_mismatch`, master stays ON, and 0 SECURITY rows. `Position.stake` = `row.stakeTzs`.
  - (a) Below the minimum → SKIPPED(STAKE_BOUNDS_CHANGED) with no seam call and no alert.
  - (b) Placed at 6,000 if that is ≥ the minimum. A withdrawal landing after the clamp is refused at H2's balance floor, with its existing mapper row and AlertOnce.
  - (d) The update returns 0 rows: stop, with no seam call and no write.
  - (f) H0's pre-lookup finds the key with the same user and bot → `replayed:true`. The row is PLACED, master stays ON.
  - A stake never grows, even when a cap was raised after the decision. The modal and feed state `firedStakeTzs`.
- **Plan:** N1 §3 H0; N1 §4.3 write-back clamp; PLAN F5 step 9; A7 (p); F5.
- **Evidence:** `market-service.ts:1100-1118` (live stake bounds; `stake_below_min`); PLAN:198 (H0), :250 (conditional terminal writes), :271 (`house_key_mismatch` → master OFF); `retry.ts:47-50` (08006 retried with the same key).
- **Fix:** the write-back clamp for all kinds; the H0 ordered rule.
- **Test:** `test:house-bot-engine` (both stores): (a)–(f) for MANUAL, targeted COUNTER, COUNTER, FILL and OPENER; `placeHouseBet` spy shows 0 calls for (a) and (d). `red:house-bot-engine` mutation N1-6 (the write-back UPDATE removed) must turn (c) into `house_key_mismatch`.

### TGT-33 [gap] Changing market after a preview
- **Trigger:**
  - (a) The owner picks poll A. The preview is ok (NO TZS 9,000), a reason is typed, and submit is enabled. They click back into the combobox, type "derby" and press Enter before the debounced results arrive, so there is no active option.
  - (b) They arrow to poll B and press Enter to pick it. B's preview is slow, and they tap submit.
  - (c) A's late preview response arrives after B is selected.
  - (d) They arrow across a greyed (`aria-disabled`) option, then click it.
  - (e) The same sequences in the Add target modal.
- **Expected:**
  - (a) Enter in the combobox always calls `preventDefault` and `stopPropagation`. With no active option it does nothing, so there are 0 calls to `enterNowHouseBotAction`.
    - Typing after the pick already cleared `selectedMarketId`, discarded A's preview and its `submitId`, and disabled submit.
  - (b) The pick sets the input text to B's title, collapses the listbox (`aria-expanded=false`) and stores `selectedMarketId`=B. A's preview is cleared, so submit stays disabled until B's preview returns.
  - (c) The response is dropped: its sequence number is old and its `marketId` ≠ `selectedMarketId`.
    - A's `ENTER_NOW_PREVIEWED` row was still written on the server, ~~and R1 counts it as a preview without a stake~~.
  - (d) Arrow keys skip `aria-disabled` options, and click and Enter refuse them.
  - The press posts the preview's own `marketId` with `confirmed{side, entryCondition, stakeTzs}`. The client never posts while it differs from `selectedMarketId`, and the stale-preview refusal also refuses a mismatch (N1 §6).
  - Re-query on focus happens only while no market is selected.
  - (e) Same contract. "Add target" and "Save" stay disabled while `previewHouseBotTargetAction` loads or returns `never=true`, and a response for another poll is dropped.
- **Plan:** N1 §8 MarketPicker selection contract; N2 §8 target modal; N2 §6 target preview; N1 §6 Enter now preview.
- **Evidence:**
  - `02-sealed-flows.md:155`: house-bot modals submit on Enter.
  - `src/components/ui/select.tsx:220` (arrow keys step options) and `:241` (Enter handled inside the kit listbox).
  - `03-design-spec.md` "All dialogs": "Esc closes unless pending".
- **Fix:** N1 §8 selection contract.
- **Test:**
  - `test:house-bot-console` jsdom:
    - (a) Enter in the combobox with an ok preview → 0 calls;
    - typing after a pick → preview cleared and submit disabled;
    - (c) a late preview for A after picking B → dropped, and B's figures render;
    - (d) arrow keys skip greyed options;
    - the same three cases in the Add target modal.
  - `red:house-bot-console` mutation "Enter `preventDefault` removed" must fail (a request is sent).
  - Phase D drive step against the local seeded database only, because the preview writes.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no R1 report to count the preview (C5-SPEC rulings 199–207). Coverage gate: partly struck by D20.

### TGT-34 [gap] An early re-check, then a reopen, then Enter now or Add target
- **Trigger:**
  - Poll P is LIVE: betting closes 18:00, result due 21:00, resolution mode human. No bot has ever had an intent on P.
  - At 14:00 an admin presses "Re-check this market now" and the AI returns YES at 95%. The toast reads "Closed for the ceremony. AI suggests YES (95%)."
  - At 14:05 the admin presses Reopen: P is LIVE again, and the Sentinel fields and `resolveClaimedAt` are nulled.
  - At 14:10 a player's NO 20,000 is locked and raw YES is 0, so the thin side is YES. Then:
    - (a) the admin presses Enter now with Bot A;
    - (b) they add a target on P for Bot B;
    - (c) a new player stake on P reaches Bot C, which has poll COUNTER mode;
    - (d) Bot A already held an Enter now stake NO 5,000 on P from 13:00.
- **Expected:**
  - `adminReopenMarket` sets `reopenedAt` and `reopenCount` = 1 in the same `marketStore.set(m)`. Its output is otherwise byte-identical. A second reopen sets `reopenCount` = 2 and moves `reopenedAt` to that reopen.
  - (a) The picker greys P. The press is refused: "Not available: this market was reopened after a result check."
    - The press is REFUSED with code INFO_BLACKOUT, and COMPLIANCE `house_bot.enter_now_refused {botId, marketId, code:'INFO_BLACKOUT'}` is written.
    - The action chooses the reopened copy from `reopenedAt` (not Sentinel data); `blackout.ts` still returns only `{blocked}`.
    - 0 intents.
  - (b) Refused with the same copy (code INFO_BLACKOUT). The TARGET_ADD press is REFUSED, and 0 targets are created.
  - (c) A16 reads `reopenedAt` for every mode: the trigger is SKIPPED(MARKET_REOPENED). FILL and OPENER are never planned on P.
  - (d) The existing stake rides. The planner sends AlertOnce `staff-stake-voided:<P>`, "… was reopened at 14:05 EAT", once. ~~R1 lists P under "Markets with a staff-chosen stake later voided or reopened".~~
  - An ACTIVE target on a poll that goes through the same re-check and reopen is ended MARKET_CLOSED when the planner sees it closed, or MARKET_REOPENED if it first sees the reopened market. It never re-arms.
- **Plan:** N1 §2 PredictionMarket `reopenedAt`/`reopenCount` (sanctioned player-path change (r)); N1 §3 blackout; A16 reopen row amended; N1 §4.5 `staff-stake-voided` alert; N2 §4 `endTargets`.
- **Evidence:**
  - `src/lib/server/market-service.ts:2380-2386`: a confident check before the result time closes P with Sentinel fields, no outcome and no stage-1 stamp.
  - `:4000-4025`: reopen accepts any CLOSED market without `resolutionStage1By` (`:4005`), nulls the Sentinel columns (`:4011`) and `resolveClaimedAt` (`:4024`), and its `audit(` at `:4027` is not awaited.
  - `src/app/markets/actions.ts:183-189`: `adminReopenMarketAction`.
  - `src/app/admin/resolver-queue/resolution-mode-action.ts:70-71`, `:88`: the re-check and its toast.
  - `04-amendments.md:457`: A16 detected a reopen only when an intent with MARKET_NOT_LIVE existed.
- **Fix:** the `reopenedAt`/`reopenCount` columns and (r); blackout and A16 read `reopenedAt`.
- **Test:**
  - `test:house-bot-seam`: reopen sets both columns in one `set`, the output is otherwise identical, and the memory twin matches.
  - `test:house-bot-migrations`: both columns nullable and expand-only in `…_house_bot_markers`.
  - `test:house-bot-engine` fixture: re-check → reopen → (a), (b) refused with 0 intents and 0 targets; (c) SKIPPED(MARKET_REOPENED); (d) one alert.
  - `red:house-bot-engine` mutation "blackout ignores `reopenedAt`" must fail (a) (a position appears).
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no R1 listing (C5-SPEC rulings 199–207); the `staff-stake-voided` alert is untouched by D20. Coverage gate: partly struck by D20.

### TGT-35 [gap] Veto by removing a target with a queued reaction
- **Trigger:**
  - Officer X adds a FIRST target on poll P for Bot A.
  - At 14:00:00 a player stakes YES 10,000, and the sweep queues a targeted NO 8,000 due 14:05:07.
  - At 14:02 X believes YES will win and presses Remove with reason "Changed my mind on this poll".
  - At 14:02:30 X tries to add the target again, and Officer Y tries to target P with Bot B.
  - Variant: on an EVERY target, X removes it only while a wrong-side reaction is queued.
- **Expected:**
  - **Reason:** without one, the press is refused with field `reason`: "Give a reason (5 to 300 characters)." Nothing is written.
  - **Write transaction:** press TARGET_REMOVE. Under `wallet:<botUser>` then `house:targets` (never `house:control`):
    - the target becomes ENDED(VETOED), not REMOVED, because a PENDING reaction exists;
    - the reaction becomes CANCELLED(TARGET_REMOVED) by a conditional update with RETURNING;
    - TARGET_REMOVED `{targetId, outcome:'VETOED', cancelledIntentIds, pressId}` is written for the target, and STAFF_INTENT_CANCELLED for the reaction, each with the reason in the event `reason` column;
    - the press becomes DONE; commit.
  - **After the locks are released:**
    - one COMPLIANCE `house_bot.target_removed {botId, marketId, targetId, outcome:'VETOED', cancelled:[{intentId, side, stakeTzs}], reason}`, through the press lease (no separate `staff_intent_cancelled` row);
    - one roster alert to every recipient, linking to `/admin/desk/<id>?tab=history&event=<eventId>`, with no reason quoted.
  - **No re-add:** both add attempts are refused with REFUSED press rows: "This poll's target was stopped at 14:02 EAT; it can't be targeted again."
  - **Trigger consumed:** the 14:00:00 trigger stays consumed, and no bot reacts to it (risk 18). Later stakes on P may still get automated scope counters.
  - **EVERY variant:** one veto per poll, ever. Selective vetoing of each wrong-side reaction is impossible.
  - ~~**R1:** Vetoes lists X, 14:02, P, side NO, TZS 8,000, and the reason. The targets register shows VETOED.~~
- **Plan:** N2 §6 removal (veto); N2 §2 never-retarget; N2 §6 locks; N1 §2 press flow; ~~N1 §9 R1 vetoes;~~ PLAN §16b risk 18.
- **Evidence:** `02-sealed-flows.md` §3.9 (cancel took no reason and wrote an ADMIN audit); 04-amendments.md:1283 (R7: `intent_cancelled` is ADMIN); PLAN:165 (COUNTER anchor with no status filter); `audit.ts:336-358` (the chain lock forbids audits inside locks).
- **Fix:** the veto semantics in `removeHouseBotTargetAction`; the never-again check in the add refusals.
- **Test:**
  - `test:house-bot-engine` veto matrix, including EVERY.
  - `test:house-bot-console`: reason required; re-add refused for the same bot and for another bot; exactly one `target_removed` row whose `cancelled[]` lists each cancelled intent, and 0 `staff_intent_cancelled` rows; no reason text in any payload.
  - A19 source scan extended to `src/app/admin/desk/**` and `src/lib/server/house-bot/**`.
  - With the audit queue delayed 5 s, the remove runs concurrently with a house bet and a holder withdrawal, and both finish in under 1 s.
  - `red:house-bot-console`: "re-add allowed after veto" and "removal with a live reaction writes REMOVED" must fail.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no R1 vetoes section or targets register (C5-SPEC rulings 199–207); the veto's events, COMPLIANCE row and roster alert are untouched by D20. Coverage gate: partly struck by D20.

### TGT-36 [gap] Veto by cancelling a queued staff-chosen stake
- **Trigger:**
  - (a) Officer X presses Enter now on poll P at 14:00:00. 50pick is busy, so the MANUAL intent is PENDING and retrying until 14:00:15. Officer Y cancels it from Activity with a reason.
  - (b) Bot A's targeted reaction on poll Q is PENDING, due 14:05:07; Y cancels it with a reason.
  - (c) A cancel with no reason.
  - (d) A cancel that lands after the intent is CLAIMED.
  - (e) A cancel of an automated COUNTER (no `targetId`).
  - (f) An officer sets a target delay of 86,400 s to hold a day-long option.
- **Expected:**
  - (a)/(b) Press STAFF_CANCEL. PENDING → CANCELLED(CANCELLED_BY_ADMIN), event STAFF_INTENT_CANCELLED with the reason in its `reason` column. After commit: COMPLIANCE `house_bot.staff_intent_cancelled {botId, marketId, intentId, side, stakeTzs}`.
  - (a) `hbi_manual_live_market_uq` frees; the Enter now press becomes DONE. X's modal reads the cancelled status from `getEnterNowStatusAction`, followed by "Nothing moved." A new press shows the same formula side (no re-roll).
  - (b) In the same transaction Q's target becomes ENDED(VETOED) with a TARGET_ENDED event. Q can never be targeted again by any bot.
  - (c) Refused before any write, field `reason`: "Give a reason (5 to 300 characters)."
  - (d) "Too late — this bet is being placed now." The press is REFUSED with its code, and no veto is recorded.
  - (e) Unchanged 02 §3.9: no reason required, ADMIN `house_bot.intent_cancelled`.
  - (f) C1 field error "Between 5 and 600 seconds." The DB CHECK `delayMaxSec BETWEEN 5 AND 600` also refuses it, so the longest queued targeted option is 600 s after the hold.
  - ~~R1 Vetoes lists (a) and (b) by officer.~~
- **Plan:** N1 §6 staff cancels; N2 §2 delay bounds and never-retarget; N1 §2 press flow; 02 §3.9.
- **Evidence:** PLAN:374 (`cancelHouseBotIntentAction`: PENDING → CANCELLED, "Already firing" if CLAIMED); `02-sealed-flows.md` §3.9; 04-amendments.md:1283 (R7 ADMIN category); `04-amendments.md:1935-1939` (C7 cancel copies).
- **Fix:** reason, COMPLIANCE row and target veto on the staff-chosen cancel path.
- **Test:** `test:house-bot-console` cancel matrix (a)–(e). `test:house-bot-migrations`: `delayMaxSec` 601 is rejected. `test:house-bot-engine`: a targeted cancel gives VETOED, and a re-add is refused. `red:house-bot-console` mutation N1-10 must fail.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no R1 vetoes section (C5-SPEC rulings 199–207). Coverage gate: partly struck by D20.

### TGT-37 [gap] A staff-chosen stake sized against one player, an AGENT, staff or another bot's holder
- **Trigger:** Bot A's `thinStakeTzs` is 10,000, `gStaffChosenMaxCounterpartyShare` 50, and per-player counters 3 and 30,000. Raw YES on each poll is 2,000, held by player V (locked).
  - (a) Locked NO 50,000: player X holds 40,000 (80%) and Y holds 10,000.
  - (b) Locked NO 12,000 held by a single AGENT account.
  - (c) The same stake held by a staff account.
  - (d) The same stake held by Bot B's holder's personal account.
  - (e) The same stake held by an account whose `recruitedBy` is a live bot's holder.
  - (f) The same stake held by an account in today's penalty box.
  - (g) Locked NO 40,000 split: W 20,000 (50%), X 12,000 (30%), Y 4,800 (12%), Z 3,200 (8%).
  - (h) On polls P1–P4, X and Y each hold 10,000 of 20,000 locked NO. The owner presses on all four, spaced past the min gap, with staff-chosen caps at 10.
  - (i) After the insert in the control case, one of the two NO players is changed to role AGENT before H3.
  - (j) `gStaffChosenMaxCounterpartyShare` is NULL.
- **Expected:**
  - **Eligibility.** `lockedForHouse` excludes accounts whose role is not PLAYER, holders of any non-REMOVED bot, penalty-boxed accounts and live bots' holders' recruits. It is the same SQL at preview, fire and H3. The preview shows aggregates only, never accounts or handles.
  - (a) X holds more than 50% of eligible locked NO, so the press is refused before insert (N1 §6). If concentration first appears between insert and H3, the in-lock refusal is `house_counterparty_concentration` (N1 §4.6 mapper row). 0 positions.
  - (b)–(f) Eligible locked NO is 0, so no side qualifies: "No thin side: players' locked money is YES TZS 2,000 · NO TZS 0, and neither side can take more without passing the other." 0 intents.
    - Control: the same 12,000 held by two PLAYERs with 6,000 each gives YES TZS 10,000, placed.
  - (g) YES 10,000 placed. H4 attributes the stake pro rata to accounts holding at least 25%: W 5,000 and X 3,000, each +1 to COUNTERPARTY_COUNT. Y and Z are not counted.
  - (h) Each press attributes 5,000 to X and to Y. The first three place. The 4th is refused with COUNTERPARTY_LIMIT at the caps pre-check when the count is already visible, otherwise SKIPPED(CAP_COUNTERPARTY_COUNT) at H4.
    - Exactly 50% is allowed; only more than the share refuses.
  - (i) The in-lock sum is 6,000 < raw YES 2,000 + 10,000, so `house_condition_gone` → SKIPPED(CONDITION_GONE).
  - (j) Every Enter now press is refused with STAFF_LIMITS_UNSET (field `gStaffChosenMaxCounterpartyShare`); a THIN stake that reaches H3 anyway is refused `house_counterparty_concentration`.
  - The targeted COUNTER amount cut and FILL use the same `lockedForHouse`, so an AGENT's locked stake never enlarges either (A15 amended).
- **Plan:** N1 §3 H3/H4; N1 §4.1 `lockedForHouse`; I3; PLAN §4.3 trigger filter; A21 recruits; PLAN §18 A15 row.
- **Evidence:**
  - `PLAN.md:34`: I3, never react to designated, staff or AGENT accounts.
  - `PLAN.md:231`: the trigger filter covers only triggers.
  - `PLAN.md:335`: counters per player per day, 3 and 30,000.
  - `src/app/markets/actions.ts:74-86`: `buyPositionAction` has no role check.
  - `prisma/schema.prisma:284` and `:324`: `User.recruitedBy` and its index.
  - `prisma/schema.prisma:1798`: `Position @@index([marketId, status])`.
- **Fix:** `lockedForHouse` eligibility (N1 §4.1); the concentration refusal (N1 §3 H3); pro-rata attribution (N1 §3 H4).
- **Test:**
  - `test:house-bot-caps` (Postgres + memory): (a) → refused; exactly 50% → placed; (b)–(f) against the PLAYER control; (g) attribution rows; (h) → 4th press COUNTERPARTY_LIMIT, or SKIPPED(CAP_COUNTERPARTY_COUNT) when racing; (i) → SKIPPED(CONDITION_GONE); (j).
  - `test:house-bot-engine`: FILL and targeted COUNTER ignore an AGENT's locked stake.
  - `test:dal-parity`: memory twin identical.
  - Golden-grid SQL/JS parity; EXPLAIN pin at 20,000 positions per market using `(marketId, status)`.
  - `red:house-bot-money` mutation "eligibility exclusion dropped" must fail (b).

### TGT-38 [gap] The officer who chose a house stake decides that market
- **Trigger:** Admin A presses Enter now: NO 9,000 on poll P, whose source wording is ambiguous. Admin B added the target on poll R whose reaction placed YES 6,000. Then: (a) A alone seals P as NO through the ceremony. (b) A emergency-voids P. (c) A reopens P after a close. (d) A rejects, or upholds, an objection on P. (e) B resolves R. (f) Admin C, who chose nothing, resolves P.
- **Expected:**
  - Nothing is refused. The 2026-07-24 guardrail stands: no officer-conflict block.
  - ~~The R9 payloads (`market.adjudicated`, `market.emergency_void`, `objection.rejected`/`upheld`) carry `houseStake:{yes:0,no:9000,staffChosen:{yes:0,no:9000,requestedBy:["<A>"]}}`. For R, `requestedBy` is `["<B>"]`, the officer who added the target.~~
  - ~~The resolver card, ceremony, emergency-void confirm and objection panel show "of which chosen by you: TZS 9,000" to A. C sees only the R2 line.~~
  - (a)–(e) One AlertOnce `staff-stake-self-decided:<marketId>:<action>` per market and action, bell + email to every `houseBotAlertRecipients()`. (b)/(c) also send `staff-stake-voided:<marketId>`, a separate key.
  - (f) No self-decided alert.
  - ~~R1 "markets decided by the officer who chose a house stake on them" lists P for each action and R once.~~ ~~The Board draft names risk 20.~~ ⛔ STRUCK 2026-09-20 (owner ruling D21): no Board draft is written.
- **Plan:** N1 §4.5 and N1 §7 (`staff-stake-self-decided`); ~~N1 §9 (R9 shape, R1 section (e));~~ PLAN §16b risk 20; ~~04 R9~~.
- **Evidence:** `docs/COMPLIANCE-DECISIONS.md:2263-2271` (a single admin resolves even with a position; the conflict block was deleted from `resolveMarket` and `emergencyVoidMarket`), `:2289-2291` (guardrail); `market-service.ts:2966`, `:4000`, `:4061`; `objections-service.ts:386`, `:467`; 04-amendments.md:1316-1335 (R9).
- **Fix:** ~~R9 `staffChosen.requestedBy`;~~ the N1 §4.5 planner alert; ~~the R1 section~~.
- **Test:** `test:house-bot-reports`: ~~exact payload shape, and `{yes:0,no:0,staffChosen:{yes:0,no:0,requestedBy:[]}}` on a non-house market;~~ one alert per action for A and B, none for C. `test:two-admin` and `test:officer-conflict` pass unchanged; the content-integrity `RESOLVE` guard stays green. ~~Source pin: no refusal branch reads `requestedBy`.~~
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** no decision audit carries `houseStake` or `requestedBy`, no surface shows "of which chosen by you" or an R2 line, and there is no R1 section (C5-SPEC rulings 187–194 and 199–207); nothing is refused, and the `staff-stake-self-decided` alert is untouched by D20. Coverage gate: partly struck by D20.

### TGT-39 [gap] Staff-edge scorecard alert
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** struck whole — the monthly staff-edge pass, the STAFF_EDGE alert, R1's staff-chosen scorecard and flag, and TGT-39's two-store proof are struck (C5-SPEC rulings 218–223), with Commit 7's staff-edge href test (PROGRESS L38). Coverage gate: struck by D20.
- **Trigger:** Control row: `gStaffEdgeWinRatePts=15`, `gStaffEdgeNetTzs=100000`. September 2026 EAT, polls, no refunds in the fixture. The automated modes' win rate on polls that month is 49%.
  - Officer X: 14 settled staff-chosen stakes, 12 won, net +TZS 84,000.
  - Officer Y: 9 settled, 9 won, net +TZS 150,000.
  - Officer Z: 20 settled, 11 won, net +TZS 120,000.
  - Variants: (b) `gStaffEdgeWinRatePts` NULL. (c) Both thresholds NULL.
- **Expected:**
  - The pass runs during the first EAT day of October 2026, over September's staff-chosen stakes settled by then.
  - X: 85.7% is 36.7 points above 49% and there are ≥10 settled stakes → one AlertOnce `staff-edge:<X>:2026-09`, bell + email to every recipient.
  - Z: 6 points, but net ≥ 100,000 → one `staff-edge:<Z>:2026-09`.
  - Y: fewer than 10 settled → no alert.
  - Further planner passes send nothing more for that month.
  - (b) Only Z alerts. (c) No alerts.
  - The R1 scorecard per officer per month shows presses, placed, settled, won/lost/refunded, win rate and net TZS, beside the automated modes' figures for the same products and period. It is present in every variant.
  - Staff-chosen includes MANUAL and targeted stakes. A target's stakes count for the officer who added it.
  - The baseline ties to `book.ts`'s automatic entry split.
- **Plan:** N1 §4.5 staff edge; N1 §9 R1 scorecard; N1 §2 control columns; PLAN §16b risk 13.
- **Evidence:** `admin/markets/[id]/page.tsx:91-95`, `:396` (admins see positions with names and phones); `prisma/schema.prisma:2103-2133` (AIPoll `confidence`, `reasoning`, `reviewedBy`); PLAN I2 (AI data is private).
- **Fix:** the monthly planner pass and the R1 scorecard.
- **Test:** `test:house-bot-reports` fixture: X and Z alert once each, Y never, (b) and (c) as stated, and a second pass adds 0; the baseline ties to the book. `test:house-bot-migrations`: CHECK bounds 1–100 and 0–1,000,000,000.

### TGT-40 [gap] Consent void ends every target
- **Trigger:** Bot A (ACTIVE) has 4 ACTIVE targets on long-running polls and one PENDING targeted reaction. The holder self-excludes. Repeat for COOLING_OFF, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST and HOLDER_WITHDREW, and once on a PAUSED bot. Control: the holder's account is suspended (not a void cause). Five weeks later an officer reopens the account, the owner re-verifies and opens Start.
- **Expected:**
  - In the same `wallet:<botUser>` transaction that writes `consentVoidAt`, whether by hook, sweep or mapper, every ACTIVE target becomes ENDED(CONSENT_VOID) with `endedAt` and one TARGET_ENDED event each. If that transaction rolls back, the targets stay ACTIVE.
  - ACTIVE bot: auto-pauses per C8, and the PENDING reaction is CANCELLED. PAUSED bot: status unchanged, but its targets still end.
  - A second detector pass finds nothing to change.
  - Suspension: consent is not voided, and targets stay ACTIVE and inert.
  - After re-verify, the Start confirm reads "Active targets: 0 →" (it reads 4 in the suspension case). After Start, a stake on those polls gets no targeted reaction.
  - A fresh add on those polls is allowed (not VETOED or REMOVED), with a reason and a new `effectiveFrom`.
  - ~~The holder's DSAR `events[]` shows the TARGET_ENDED rows (N1 §9 DSAR).~~
- **Plan:** N2 §4 step 10; C8; A3; N2 §2 `endCause`; ~~N1 §9 DSAR~~.
- **Evidence:** 04-amendments.md:128-140 (A3 `consentVoidCause` and its writers), :822-825 (C8 void written under `wallet:<botUser>`), :835 ("Never resumes by itself"); `responsible-gambling.ts:356-357` (cooling-off lifts by timer).
- **Fix:** end targets inside the consent-void writer; the Start confirm line.
- **Test:** `test:house-bot-designation`: each of the 5 causes ends all ACTIVE targets as CONSENT_VOID in the void transaction; an injected rollback leaves them ACTIVE; suspension keeps them ACTIVE and inert; the Start confirm fixture shows the count. `red:house-bot-engine` mutation N2-E8 must fail.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** no DSAR `events[]` shows these rows: D19 keeps house events out of both releasable doors (C5-SPEC ruling 168) and D20 strikes the internal record that held them (rulings 236–238). Coverage gate: partly struck by D20.
