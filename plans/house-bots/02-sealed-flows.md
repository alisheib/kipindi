# House Bots: sealed flow specifications

> # ⛔ THE RESOLVER HOUSE-STAKE DISPLAY IS SUPERSEDED (D20)
> **Owner ruling D20 (Ali, 2026-09-17): every report and admin screen treats a house bot's account exactly like any
> player's account; no admin screen names house bots or splits house money out.** Struck in this file: §4 F11 (the
> "House stake: YES X · NO Y" line on the resolver queue card, the resolution ceremony and the admin market page;
> C5-SPEC rulings 192–194, built in Commit 5 step 5 and un-built in checkpoint C5-5b). D19 still binds everything. The
> password lifecycle, the console actions, the admin alerts about a bot's status and its holder's money events (F6, F7),
> the master switch and the notification click-throughs are not changed by D20. Read PROGRESS.md "OWNER RULING D20" and
> `plans/house-bots/C5-D20-REPLAN.md` first.

> # ⛔ EVERYTHING THE HOLDER WOULD SEE IS SUPERSEDED (D19)
> **Owner ruling D19c (Ali, 2026-09-16): the holder sees nothing.** Stakes 50pick places on a holder's account look exactly
> like the holder's own bets, and the holder receives no house-bot notices or emails at all; every alert about a bot goes
> to admins only. Struck in this file: §2.2's holder notice, H1 (§2.3, §2.7), H2 and "Liquidity stakes resumed" (§2.6),
> the holder notices in §3.2–§3.5, F6's holder notice, F10's chip, Sell-button line and chip test, and §5's "Holder
> notices" row. The admin alerts, the password lifecycle, consent by password (D5), the console actions and the master
> switch are not changed. Read PROGRESS.md "OWNER RULING D19" first.

The plan's design holds up, but the real code turned up 12 gaps to fix before building (§0). The biggest:

- **Password writers:** there are five places that write a password, not three.
- **Holder sign-out:** changing a password today does not sign the player out anywhere.
- **Re-verify dead end:** the plan's rule leaves a bot that can never be started again.

All citations are to `C:\kipindi-main` as it stands today. Nothing was edited.

On the owner's request, "if the user changes his password, we get requested to log in again with it", there are two readings:
- **(a) The console asks for the new password.** This is fully specified in §2.
- **(b) The holder himself has to sign in again.** This is not true on the platform today. It is written up as owner decision D10 (§2.8).

## 0. Gaps in the plan, confirmed in the code

| # | What the code shows | Required change |
|---|---|---|
| X1 | The three password writers are where the plan says: `password-reset.ts:242` (reset link), `:271` (officer temporary password), `:326` (settings). There are two more. Erasure sets the password to null (`erasure.ts:393-412`). `scripts/ops-remint-qa-passwords.mts:84` writes it with raw SQL. `ops-reset-password.mts:67` goes through `consumeResetToken`, but the script may exit before an async hook runs. | Put hooks at 4 places, keep the 15s sweep as backstop. Add a source check: any new password write outside the allow-list fails `test:house-bot-designation`. |
| X2 | None of the three writers signs the holder out. Suspend (`players/[id]/actions.ts:122`), self-exclusion (`responsible-gambling.ts:278`), role change (`staff/actions.ts:39`) and erasure (`erasure.ts:384`) all do. | Owner decision D10 (§2.8). |
| X3 | F6 disables Re-verify for every other AUTO_PAUSED reason. If the password changes while the bot is AUTO_PAUSED for, say, self-exclusion, Start keeps failing on the password mismatch after the cause ends, and nothing can fix it. | Allow Re-verify in every state except ACTIVE and REMOVED whenever the stored fingerprint is out of date. It only changes status out of AUTO_PAUSED(PASSWORD_CHANGED). |
| X4 | The alert-once key `bot:<id>:<code>:<EAT day>` would silence a second password change on the same day. | Key password alerts as `pw:<botId>:<newFingerprint>`. |
| X5 | Login checks the password against the row read before the lock (`auth-service.ts:967` uses `user.passwordHash`, not `freshUser`). | The bot verifier re-reads the row inside the lock and uses it for both the hash and the attempt counter. |
| X6 | `passwordFingerprint` already exists (`password-reset.ts:74-76`). Every write makes a new salt (`:240`, `:269`, `:324`), so even re-setting the same password changes the fingerprint. | Reuse it; don't write a second one. |
| X7 | The §7 pause alert link cannot open the password modal. | Use `/admin/house-bots/<botId>?reverify=1` (§2.4). |
| X8 | `PasswordInput` small is 36px (`password-input.tsx:43`); medium is 44px (`:44`). | Use medium in every house-bot modal so control heights match. |
| X9 | The kit Toggle names `gold` as the "master money-lever" tone (`toggle.tsx:7-13`); the plan says brand. | Master switch uses `tone="gold"` (check `test:gold-is-money`). Other toggles stay brand. |
| X10 | `requireOwner` accepts any ADMIN (`rbac-guard.ts:212`). | Copy says "an admin". Alerts go to ADMINs, so everyone who receives one can act on it. |
| X11 | A cancelled FILL or OPENER can be planned again (§2 unique index), so an admin's cancel could silently come back. | Admin cancel writes `CANCELLED_BY_ADMIN`, and the planner treats that as final. |
| X12 | Identical notifications within 90s are dropped (`notification-service.ts:56`). The bell shows only the newest 30 rows (map, `:193-199`). | Every admin title carries HH:MM:SS EAT. Pause, money and switch alerts also go by email. |

## 1. Rules every table below inherits

- **C1 Running an action.** `useRunner` (`agents-client.tsx:31-43`) → `runAdminAction` (`run-admin-action.ts:22`) → `ActionOverlay` run/succeed/fail (`action-overlay.tsx:49-68`).
  - Success auto-dismisses, then `router.refresh()`. A failure card stays on screen.
  - A returned `field` → `focusFirstInvalid(root,[field])` (`focus-first-invalid.ts:42`) on `Field dataField` wrappers (`input.tsx:186`).
  - If that field is on another tab it reports not-rendered (`:56-72`); the client goes to `data.href` first, then focuses.
  - A refusal's `fix` link takes the button slot ahead of "Try again" (`action-overlay.tsx:99-110`, `operator-refusal.ts:36-49`).
- **C2 Thrown or network error.** Copy: "Server error — nothing may have applied. Refresh before retrying." (`run-admin-action.ts:32`). The modal stays open, password fields are cleared, focus goes to the first field.
- **C3 2FA lapsed or signed out.**
  - Actions redirect to `/admin/totp-verify?next=<page>` (`admin-guard.ts:64-72`, `proxy.ts:217`); the runner lets the redirect through (`:28`).
  - Deep links survive login and 2FA (`layout.tsx:50-58`, `proxy.ts:203-204`, `auth/admin/page.tsx:22-32`, `totp-verify/page.tsx:33-35`).
  - A typed password is lost, on purpose.
- **C4 Non-admin.** SECURITY audit `privilege_escalation_blocked`, then a throw (`rbac-guard.ts:212-221`) → C2 copy. The page itself renders `AdminRestricted`.
- **C5 Read-only gate.** `useMayAct()` is called before any early `ActReadOnly` return (`act-gate.tsx:63`).
- **C6 Repeats.** Pressing an action whose target state already holds returns `{ok:true,data:{noop:true}}` → overlay "Already {state}".
- **C7 Records.** Every state change writes a HouseBotEvent row plus an audit row; COMPLIANCE and SECURITY audits are awaited. The password never appears in payloads, logs, errors or URLs.
- **C8 Status colours** live in `status-tone.ts`. Add PAUSED admin amber (same as DEACTIVATED, `:142`), AUTO_PAUSED claret (same as SUSPENDED, `:147`), REMOVED slate (same as REVOKED, `:139`). ACTIVE green already exists (`:146`).

## 2. Password lifecycle

### 2.1 Detecting a change: three layers

**L1: hook in each writer (under 1 second).**
- **Code:** `void import("@/lib/server/house-bot/credential").then(m=>m.onHolderCredentialWrite(userId, method)).catch(()=>{})`.
- **Placement:** right after the password update finishes and before `alertPasswordChanged`, at four places:
  - `password-reset.ts:242` (RESET_LINK);
  - `password-reset.ts:271` (OFFICER_RESET);
  - `password-reset.ts:326` (SETTINGS);
  - `erasure.ts:412` (ERASED).
- **Catches:** every change made in the app.
- **Blind spot:** a script that exits before the hook runs.

**L2: planner sweep (within 15 seconds).**
- **Runs:** every 15s under `acquireLeadership("house-bot")` (`leader.ts:91`), which skips the pass if the lease can't be read (`:115-121`).
- **Reads:** one query joining live HouseBot rows to the holder's password hash, role, status and closedAt.
- **Also detects** the other I9 changes:
  - role change (`staff/actions.ts:36`);
  - suspend (`players/[id]/actions.ts:121`);
  - self-exclusion (`responsible-gambling.ts:274`);
  - cooling-off (`:304-317`);
  - account close (`user-service.ts:121`);
  - officer wallet freeze (`wallet-freeze.ts:117`).
- **How the method is known:** `designation.latestPasswordWrite` reads the audit log; if that read fails the method is UNKNOWN.
- **Catches:** raw SQL writes and lost hooks.
- **Blind spot:** no leader lease. The engine-health Callout is already red in that case.

**L3: every bet.** F5 step 4 and the in-lock H2 check refuse with `house_consent_stale`. This cannot be bypassed, so no bet is ever placed on out-of-date consent.

**What `onHolderCredentialWrite` does:**
1. One indexed read: is this user a live bot? If not, return.
2. Take `withLock("wallet:"+userId)` (`locks.ts:164`). Re-read the bot and the user. If the current fingerprint equals the stored one, return. This makes a hook and sweep racing each other harmless.
3. Apply §2.2.

The password writers must return the same results and take the same time as today; `test:house-bot-seam` pins this.

### 2.2 What happens when a change is detected

| Bot status before | After | Queued stakes | Event · audit | Admins | Holder |
|---|---|---|---|---|---|
| ACTIVE | AUTO_PAUSED(PASSWORD_CHANGED); `pausedFromStatus=ACTIVE`; details {method, changedAt, detectedBy, officerReset} | PENDING and CLAIMED → CANCELLED (conditional writes) | AUTO_PAUSED · COMPLIANCE `house_bot.auto_paused` | A1, bell + email | ~~H1, bell + push~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** none; the holder receives no house-bot notice. |
| PAUSED (NEW or MANUAL) | Status and reason unchanged; `credentialChangedAt` and method recorded | none queued | CREDENTIAL_CHANGED (new event kind) · SECURITY `house_bot.credential_changed` | A2 | none |
| AUTO_PAUSED(PASSWORD_CHANGED), changed again | Details updated to the newest change | — | CREDENTIAL_CHANGED | A1 again (new key per X4) | none |
| AUTO_PAUSED (any other reason) | Reason kept; credential fields set | — | CREDENTIAL_CHANGED | A2 | none |
| Any status, account erased | `erased=true`. Erasure needs a closed account (`erasure.ts:114`), so the bot is already ACCOUNT_BLOCKED | — | CREDENTIAL_CHANGED | A2, erased wording | none (his inbox is deleted, `erasure.ts:369`) |
| REMOVED | nothing | — | — | — | — |

New column `pausedFromStatus` (text, null, ACTIVE or PAUSED). It is set on every auto-pause and cleared by Start, Pause, Remove and every successful re-verify.

### 2.3 Alert copy

Admin copy is English only. ~~Holder copy is shown in English; Swahili and Chinese are drafted and marked for native review.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder copy; every alert below is an admin's.

| Id | Title | Body | Link |
|---|---|---|---|
| A1 | `House bot "{label}" paused — password changed · {HH:MM:SS}` | `{holder} changed his 50pick password {how} at {HH:MM} EAT on {D MMM}. The bot stopped and cancelled {n} queued stake(s). No bet will be placed until you enter his new password.` | `/admin/house-bots/{id}?reverify=1`; email button "Enter new password" |
| A2 | `House bot "{label}": holder changed his password · {HH:MM:SS}` | `The bot is {Paused / Auto-paused: cause}, so nothing stopped. Enter his new password before it can run again.` | same |
| A2, officer reset | same title as A2 | `Support gave him a temporary password ({officer}, {HH:MM}). That is not his consent. Ask him to set his own password in Account settings, then enter it.` | `/admin/house-bots/{id}` (no modal) |
| ~~H1~~ | ~~"Liquidity stakes paused"~~ | ~~"Your password changed, so 50pick stopped placing liquidity stakes from your account. Your balance and open stakes are unchanged."~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no H1; the holder receives no house-bot notice, and admins get A1 or A2. | ~~`/positions`~~ |

`{how}` is one of:
- **SETTINGS:** "in his account settings".
- **RESET_LINK:** "with a reset link".
- **OFFICER_RESET:** "— support issued a temporary password".
- **UNKNOWN:** left out.

The holder's existing alerts still go out: the SECURITY bell (`notification-service.ts:1500-1512`) and the "password changed" email (`password-reset.ts:30-38`).

### 2.4 The `?reverify=1` deep link

| Step | Who · where | What happens | Failure path |
|---|---|---|---|
| 1 | Admin clicks the bell row | Marks read (awaited), then `router.push(href)` (`notifications-panel.tsx:400-418`) | Mark-read failure is ignored and navigation still happens |
| 2 | Admin clicks the email link | If signed out: admin login → 2FA → back to the link with its query intact (C3) | — |
| 3 | Server renders `/[botId]` | Works out the re-verify state: ELIGIBLE, BLOCKED{reason}, NOT_NEEDED{by, at}, ACTIVE or REMOVED. Unknown bot id → `notFound()` | Read fails → strip row "Couldn't load this bot — Refresh" |
| 4 | Client | If ELIGIBLE and `mayAct`: open the modal on mount with focus in the password field. Whatever happens next, `router.replace` removes the param so reload or Back never reopens it | — |
| 5 | Client | NOT_NEEDED → info Callout "Already done — {name} entered the new password at {HH:MM} EAT." BLOCKED → strip copy from §2.5. REMOVED → read-only page | — |

Tests: every link maps to a real `page.tsx`; the param is gone after close; the modal opens only in ELIGIBLE.

### 2.5 Bot strip copy

| Situation | Status chip | Line | Actions |
|---|---|---|---|
| AUTO_PAUSED(PASSWORD_CHANGED) | claret "Auto-paused" | "Paused {HH:MM} EAT — {holder} changed his password {how} on {D MMM, HH:MM}. No bets until you enter the new password." If it was running before, add: "It was running; you can resume it right after." | **Enter new password** (primary), Remove. Start disabled: "Enter the new password first" |
| Password changed while PAUSED or AUTO_PAUSED for another reason | existing chip | warning Callout "Password changed on {date}. Enter his new password before starting." | Enter new password, Remove. Start disabled with the same reason |
| Last change was an officer reset | — | danger Callout with the A2 officer-reset body | Remove. Re-verify disabled |
| His sign-in is locked | — | "His sign-in is locked after wrong passwords until {HH:MM} EAT." plus `CountdownPill` | Re-verify turns back on at 0:00 without a reload |
| No password, or account erased | — | "This account has no password (erased or never set). It can't be verified — remove the bot." | Remove |
| Audit read failed | — | "Couldn't check how his password was last changed. Refresh to try again." | Refresh |

### 2.6 The re-verify modal

**Surface.** The kit `Modal` (`modal.tsx:132-140`), `role="dialog"`, width 400 to match `ConfirmModal` (`:449`), initial focus on the password field. `ConfirmModal` can't be used: its only input is the typed confirmation word (`:548-572`).

**Contents:**
- Eyebrow "Consent". Title "Enter {holder}'s new password".
- Body: "Changed {how} on {D MMM, HH:MM} EAT. Type the password he gives you — it's checked once and never stored."
- `Field label="His password" dataField="password"` wrapping `PasswordInput size="md" autoComplete="new-password"`. `new-password` stops the browser offering the admin's own saved password.
- The attempts-left line.
- `Checkbox` "Resume the bot now — it was running before":
  - ticked by default;
  - shown only when the reason is PASSWORD_CHANGED and the bot was ACTIVE before the pause;
  - underneath: "Uses rules v{n}. Master switch: {ON / OFF — no bets until it's on}."
- Buttons: primary "Verify" (or "Verify and resume"), ghost "Cancel". Enter submits. Verify is disabled while the field is empty or a request is running.
- The modal goes on the unsaved-changes exemption list, with the reason "password is never kept".

**Server steps (`reverifyHouseBotAction` → `verifyHouseBotPassword`):**
1. `requireOwner`.
2. If `password.length===0`: "Enter his password." Not counted, and the password is never trimmed.
3. Read the bot fresh.
   - REMOVED → "This bot was removed."
   - ACTIVE with a matching fingerprint → no-op "Nothing to verify — the bot is running."
4. Check only the password-related eligibility rows: sign-in locked, officer reset, no password, audit read failed. Status causes such as self-exclusion do not block re-verify (X3).
5. Rate check `rateCheckAsync("<officer>:<target>","housebot.verify")`, a new rule {capacity 3, refill 0.2/min} added beside `rate-limit.ts:74-98`.
6. Inside `withLock("login:"+userId)`, on the freshly read row:
   - clear an expired lock (as `auth-service.ts:953-954`);
   - verify the password.
   - **Wrong:** add 1 to the failure count. At 5, lock for 30 minutes and reset the count to 0, exactly as login does (`:968-974`, limits at `:813-814`).
   - **Right:** reset the count and clear the lock.
   - Never write `lastLoginAt` (`:1004-1008`), never run the bootstrap-admin promotion (`:1010`), never write an `auth.login.*` audit.
7. Release the login lock, then take `wallet:<bot>`.
   - If the stored hash's fingerprint no longer matches the one just verified: "His password changed again while you were typing. Ask him for the newest one." Not counted.
   - Otherwise save the new fingerprint, `verifiedAt/ById`, clear the credential fields, set `pausedFromStatus=null`.
   - If the reason was PASSWORD_CHANGED, move to PAUSED(MANUAL).
   - Write event VERIFIED and SECURITY audit `house_bot.password_verified`.
8. If resume was ticked, call the same `startHouseBot` service as §3.3, with all of its checks.

**Modal states:**

| State | Trigger | Copy | Field, focus, buttons |
|---|---|---|---|
| Ready | 3 or more tries left (5 minus the fresh failure count) | muted "{N} tries left before his own sign-in locks for 30 minutes." | Enabled, focused |
| Few tries left | 2 or fewer | warning Callout "Only {N} tries left before his sign-in locks for 30 minutes." | Same |
| Wrong password | server rejects | Field error "Wrong password. This may be his OLD password — he changed it on {D MMM, HH:MM} EAT." Tries-left updates | Field cleared and refocused; modal stays |
| Wrong, and this locks him | 5th failure | danger Callout "Too many wrong tries. His sign-in is locked until {HH:MM} EAT — he can't sign in either until then." | Field and Verify disabled; Cancel becomes "Close". SECURITY `verify_account_locked`. ~~Holder H2 (bell + push): "Sign-in locked for 30 minutes — 50pick tried to confirm your password for liquidity stakes. Wait, or reset your password."~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no H2; the holder receives no house-bot notice, and every alert about a bot goes to admins only. |
| Already locked when opened | lock time is in the future | Same Callout with `CountdownPill` | Re-enables at 0 |
| Rate-limited | bucket empty | warning Callout "Too many checks from your console. Try again in {m:ss}." | Disabled until the wait ends. The holder's own counter is not touched. SECURITY `verify_rate_limited` |
| Blocked while typing | officer reset, bot removed, or account closed in the meantime | Modal closes; overlay failure card with the §2.5 copy | Strip refreshes |
| Another admin already verified | fingerprint already matches | Overlay success "Already verified by {name} at {HH:MM}" | — |
| Password changed again | step 7 mismatch | Field error (text above), not counted | Refocused |
| Verified, no resume | success | Overlay success "Password confirmed" / "Bot is paused — press Start when ready." | Refresh |
| Verified and resumed | Start succeeds | "Password confirmed · bot running" (plus "Master switch is OFF — no bets until it's on" if so) | ~~Holder notice "Liquidity stakes resumed"~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no holder notice; the holder is told nothing. |
| Verified, but Start refused | Start returns a refusal | Overlay **failure** card, which stays: "Password confirmed · bot still paused", the Start refusal copy, and its fix button (for example "Set the missing caps" → `?tab=rules`) | Bot stays PAUSED(MANUAL) and never goes back to AUTO_PAUSED. No automatic retry. Only the VERIFIED event is written |

**Tests (`test:house-bot-designation`):**
- The holder's `ActiveSession` row is unchanged (`session-registry.ts:82`) and `lastLoginAt` is identical.
- No `session.created` audit is written (`session.ts:115-122`), the response sets no cookie, and the admin's own session id is unchanged.
- Counter and lock behaviour matches login; the stale-hash case from X5 is covered.
- An empty password is not counted; a rate-limit refusal leaves the failure count unchanged.
- Start refused after verify leaves PAUSED(MANUAL) with a VERIFIED event only.

### 2.7 Holder journeys

**Changes his password in settings**
- **Code path:** `password-section.tsx:23-54` → `profile/account/actions.ts:74-86`.
- **Today he sees:** a "password updated" toast (`:40`), a SECURITY bell (`notification-service.ts:1504`) and an email (`password-reset.ts:34`).
- **Added:** ~~H1, if the bot was ACTIVE.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** nothing is added for him; only admins are alerted (A1 or A2, §2.2).
- **Bot:** §2.2.

**Uses a reset link**
- **Code path:** `reset-password/actions.ts:6-21`.
- **Today he sees:** he is redirected to `/auth/login?reset=1` with a success panel (`login/page.tsx:24`).
- **Added:** ~~H1.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** nothing is added for him; only admins are alerted (A1 or A2, §2.2).
- **Bot:** §2.2.

**Support gives him a temporary password**
- **Code path:** `players/[id]/actions.ts:222-228` (support domain, `:46`); UI at `reset-password-button.tsx:73-90`.
- **Today he sees:** a bell and email saying "temporary password issued by support" (`password-reset.ts:281`).
- **Added:** A2 with officer-reset wording. Re-verify stays blocked until he himself changes the password in settings or by reset link.
- **Bot:** §2.2, plus the block.

**Closes his account, then it is erased**
- **Code path:** `privacy.ts:129` → `erasure.ts:162`.
- **Today he sees:** closure notices, then his inbox is deleted (`:369`).
- **Added:** A2 with erased wording.
- **Bot:** Remove is the only way out. Positions and transactions keep their bot markers, because erasure never touches them (`:55-56`).

**Ops scripts**
- **Code path:** `ops-reset-password.mts:67` (real flow) and `ops-remint-qa-passwords.mts:84` (raw SQL).
- **Today he sees:** the normal alerts from the real flow; nothing from raw SQL.
- **Added:** if the L1 hook is lost, L2 catches it within 15s.
- **Bot:** §2.2.

**The console never logs into the holder's account.**
- It never creates a session, a cookie, an `ActiveSession` row or a `lastLoginAt` value.
- It never signs him out and never reads his session.
- Bets run as `placeHouseBet(userId, …)` with no session and no `playStartedAt`.
- The typed password is used once, in memory, inside `withLock("login:<id>")`, and then dropped.

### 2.8 D10, owner decision: sign in again after changing the password

This applies to every player, not just bot holders; the house-bot flows work either way.

- **Change:** `await revokeUserSessions(userId)` (`session-registry.ts:103`) in all three writers.
- **Settings change:** this also signs out the device making the change. `PasswordSection` success must `router.replace("/auth/login?pwchanged=1")` instead of refreshing (`:39-45`).
- **Copy:** new i18n key, en "Password changed — sign in with your new password." plus sw and zh.
- **Other devices:** they hit the revoked-session flow (`session.ts:141-170`). Its login copy says another device signed in (`login/page.tsx:42`), which is the wrong reason, so add a `kp_revoked=pw` variant.
- **Reset link:** already ends at login. **Officer reset:** he signs in with the temporary password.
- **Test:** after each writer, the old cookie gives no session, the old password fails and the new one works.

## 3. Console actions (§6)

### 3.1 Picker search (`searchHouseBotCandidatesAction`)
- **Control:** `UserPicker` (`Input type="text"` combobox), 250ms debounce; a sequence number drops stale answers.
- **Client validation:** under 2 characters shows the hint "Type 2+ characters — name, phone, email or Player #ID". Max length 64.
- **Server:**
  - `requireOwner`, then trim.
  - Outside 2–64 characters → `field:"q"` "Search needs 2 to 64 characters."
  - Returns up to 20 rows of {id, "Player #XXXXXX", display name, masked phone, role, status, eligible, reason}.
- **States:**
  - Loading: "Searching…"
  - Empty: "No account matches "{q}"."
  - Error: "Search failed — try again." with a Retry button.
  - Result count read out politely: "{n} accounts".
- **Ineligible rows** are greyed and cannot be picked with the mouse or Enter. Reasons:
  - "Staff account"
  - "Agent account"
  - "Not active ({status})"
  - "No password set"
  - "Already house bot "{label}""
  - "Your own account"
  - "Roster full ({n} of {max})"
  - "Sign-in locked until {HH:MM}"
- **Success:** picking an eligible row → `router.push("/admin/house-bots/new?user={id}&step=check")`.
- **Tests:** stale answers dropped; a pasted "Player #…" handle resolves; no audit row per search, same as the players roster search.

### 3.2 Designate (wizard + `designateHouseBotAction`)

| Step | Controls and validation | Success | Failures |
|---|---|---|---|
| check | Server-rendered account card with blocking and warning rows. Continue disabled while anything blocks | → `step=consent` | Balance read failed: row "Balance unavailable — try again" + Refresh. Unknown `?user`: `EmptyState` "No account with that ID." with "Search again" |
| consent | Label (2–32): "Label needs 2 to 32 characters." `Textarea` note (max 300): "Note can be at most 300 characters." `PasswordInput md`: "Enter his password." Live tries-left line | Password kept in component memory only → `step=review` | Reload or Back loses it: "Enter the password again — it is never kept", focus on the password |
| review | Balance re-read, summary, **Designate** (primary) | See "Server" below | See "Review failures" below |
| after | Overlay "Bot "{label}" designated" → `router.replace("/admin/house-bots/{id}?tab=rules")`; password cleared | See "After" below | — |

**Server on Designate:**
- `requireOwner`.
- Label must be unique among live bots, else "Another bot is already called "{label}"." (field `label`).
- Eligibility check for designation, then the §2.6 password steps 5–6.
- One transaction:
  - HouseBot row as PAUSED(NEW), plus its runtime row;
  - event DESIGNATED;
  - awaited COMPLIANCE audit `house_bot.designated` (label and userId only).

**Review failures:**
- **Wrong password** → `field:"password"`. The field isn't on the review step, so the client replaces to `step=consent` and focuses it. Lock and rate-limit copy as in §2.6.
- **Roster filled meanwhile:** "The roster is full ({n} of {max}). Remove a bot or raise the limit." with fix `?tab=limits`.
- **Double submit:** `{ok:false,data:{botId}}` "This account is already a house bot." with fix "Open it".

**After:**
- ~~**Holder** (bell + push + email): "Your account now provides liquidity" / "50pick will place liquidity stakes from your account as you agreed. You keep full use of it. Nothing is placed until 50pick starts them."~~
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice or email when designated; only the other admins are told.
- **Other admins** (bell): `House bot "{label}" designated by {name} · {HH:MM:SS}`.

**Tests:** `step=review` with nothing in memory lands on consent; the password is cleared on unmount; designating a previously removed account creates a new row.

### 3.3 Start (`startHouseBotAction`)
- **Dialog:** `ConfirmDialog` tone brand, without `pending` (overlay pattern, `confirm-dialog.tsx:73-77`).
  - Title "Start "{label}"?"
  - Body: the saved-rules sentence plus "Stakes real money from {holder}'s wallet (TZS {balance} now)." When the bot has ACTIVE targets, add the line "Active targets: {n} →", linking to `?tab=targets&status=active` (04 N2 §4).
  - Confirm button "Start bot". Focus starts on Cancel (`modal.tsx:514`).
- **Refusals, checked in this order:**
  1. Removed: "This bot was removed."
  2. Eligibility: "Can't start: {cause}{ until D MMM}."
  3. Password fingerprint: "Can't start: his password changed on {date}. Enter the new password first." Fix → `?reverify=1`.
  4. Unset cap: `field`, "Set {cap} before starting.", href `?tab=rules`.
  5. No product: "Choose at least one product."
  6. No mode (every automatic mode, `enterNow.enabled` and `targeting.enabled` all off; 04 N1 §5): "Turn on at least one entry mode."
  7. Loss cap: "Can't start: today's settled loss TZS {x} has reached the daily loss cap TZS {cap}. Raise the cap or wait until 00:00 EAT."
  8. Holder's own limit: "Can't start: his own daily loss limit would block even the minimum stake." (`checkLossLimit`, `responsible-gambling.ts:492-511`)
- **Success:**
  - ACTIVE, reason cleared, `pausedFromStatus` cleared;
  - event STARTED and COMPLIANCE `house_bot.started`;
  - ~~holder notice "Liquidity stakes started";~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no holder notice; the holder is told nothing;
  - overlay "Bot started", plus the master-OFF note if the switch is off.
- **Repeat:** no-op "Already running".

### 3.4 Pause (`pauseHouseBotAction`)
- **Dialog:** `ConfirmDialog` tone warning with an optional `Textarea` reason.
- **Validation:** max 300 characters, "Reason can be at most 300 characters.", blocked before opening via `openGuard`.
- **Success:**
  - ACTIVE → PAUSED(MANUAL); PENDING stakes → CANCELLED (a CLAIMED one is refused inside the lock);
  - event PAUSED, ADMIN audit `house_bot.paused`~~, holder notice "Liquidity stakes paused"~~; ⛔ **Superseded by D19 (Ali, 2026-09-16):** no holder notice; the holder is told nothing;
  - overlay "Bot paused · {n} queued stakes cancelled. A stake already in its final step may still complete."
- **Not ACTIVE:** no-op; an AUTO_PAUSED bot keeps its cause.

### 3.5 Remove (Modal form)
- **Controls:** `Textarea` reason (5–300) and a typed-word field "Type REMOVE to confirm". The claret "Remove bot" button stays disabled until both are valid.
- **Inline errors:** "Give a reason (5 to 300 characters)." and "Type REMOVE to confirm."
- **Server:**
  - The word is re-checked against the shared constant, case-insensitive like `modal.tsx:466`: "Type REMOVE exactly." (field `word`).
  - → REMOVED; cancels PENDING and CLAIMED stakes.
  - Event REMOVED and awaited COMPLIANCE `house_bot.removed`.
- **Notices:**
  - ~~**Holder** (bell + push + email): "Liquidity stakes ended" / "50pick no longer uses your account for liquidity stakes. Open stakes settle to your wallet as normal."~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice or email when the bot is removed; only admins are told.
  - **Admins:** bell + email.
- **After:** `router.replace("/admin/house-bots?tab=roster")`. A repeat is a no-op.

### 3.6 Save rules (`saveHouseBotRulesAction`)
- **Form:** `FormColumn measure="form"`, controls built from the `rules.ts` field metadata, `UnsavedChangesGuard` (`unsaved-changes.tsx:381`). "Use recommended values" only fills the form: "Recommended values filled — review, then Save."
- **Validation (same strings on client and server):**
  - "Between {min} and {max} {unit}."
  - "Minimum stake can't be above maximum stake."
  - "Per-market cap must be at least the maximum stake."
  - "Daily loss cap can't exceed daily stake cap."
  - "Min gap is at least 20 seconds."
  - "Windows can't overlap."
  - "Pick at least one day."
- **Against global limits:** "Max stake TZS {x} is above the global per-market limit TZS {g}." (field `stakeMaxTzs`, fix `?tab=limits`).
- **Someone else saved first** (version check): "{name} saved these rules at {HH:MM}. Reload to see them — your edits are still on screen." The guard stays dirty.
- **Success:**
  - one UPDATE under the bot's wallet lock;
  - event RULES_SAVED with the changes and ADMIN audit `house_bot.rules_saved`;
  - "Rules saved (v{n}). Queued stakes keep the values they were decided with."

### 3.7 Master switch ON / OFF (`setHouseBotSwitchAction`)

**Turning ON**
- **Control:** `Toggle tone="gold"` opens a Modal with a reason (5–300) and the typed words "BOTS ON". While any global limit is unset, the toggle is disabled with the link "Set {N} global limits first →".
- **Server:**
  - Wrong word: "Type BOTS ON exactly."
  - Unset limits: `{field, data:{href:"?tab=limits"}}` "Set the global limits first: {list}." The client closes the modal, goes there, and focuses the field.
- **Success copy:** "House bots are on." If the engine heartbeats are stale, add "The bot engine isn't running (last seen {HH:MM:SS} EAT). No bot will place a bet."
- **Records:** event SWITCH_ON and awaited COMPLIANCE audit. Admins get bell + email: `House bots switched ON by {name} · {HH:MM:SS}` / `Reason: "{reason}". {n} bots active.`

**Turning OFF**
- **Control:** the same Toggle, one click, no confirm.
- **Server:** takes `house:control`, sets enabled=false with cause MANUAL, then cancels queued stakes.
- **Success copy:** "House bots are off. No bot will place a bet." If the wait times out: "Switching off — a bet already in its final step may still complete."
- **Records:** SWITCH_OFF, awaited audit, admin bell + email. Automatic switch-offs name their cause.
- **Failure (database down):** "Couldn't switch off — the database didn't answer. Nothing changed. Try again; if it keeps failing, turn on maintenance mode to stop every bet." with fix `/admin/system`.

### 3.8 Save limits (`saveHouseBotLimitsAction`)
- **Validation:** everything from §3.6, plus:
  - "Daily loss can't exceed daily stake."
  - "Per-market limit TZS {g} is below bot "{label}" max stake TZS {x}." (field `gCapPerMarketTzs`)
  - "Max bots must be at least {n} — you have {n}."
  - "Can't clear a limit while bots are on. Switch off first."
    - **Exempt (04 N1 §5, PLAN §18):** `gCapStaffChosenPerDay`, `gCapStaffChosenDailyTzs`, `gStaffChosenMaxCounterpartyShare` and `gTargetsMaxActive` may be cleared while bots are on. Clearing takes `house:control` briefly, so a queued staff-chosen stake re-reads NULL in H4 and is refused. Consequence previews: 04 N1 §5 "Clearing is never blocked". On the rules form, the per-bot `capStaffChosenPerDay`, `capStaffChosenDailyTzs` and `targetsMaxActive` are likewise exempt from 04 C1's "pause it before clearing".
- **Success:**
  - version check, `house:control` taken briefly;
  - LIMITS_SAVED and awaited COMPLIANCE `house_bot.limits_saved`;
  - "Limits saved. They apply to the next stake."

### 3.9 Cancel a queued stake (`cancelHouseBotIntentAction`)
- **Dialog:** `ConfirmDialog` tone warning, "Cancel this queued stake?", with the feed sentence and "Due {HH:MM:SS} EAT".
- **Server:**
  - PENDING → CANCELLED with `CANCELLED_BY_ADMIN`, so the planner won't plan it again (X11).
  - Already claimed: "Already firing — it can't be cancelled now."
  - Already finished: "Already {outcome}."
  - Missing: "That stake no longer exists."
  - ADMIN audit `house_bot.intent_cancelled`.
- **Staff-chosen intents** (kind MANUAL, or `targetId` not null; 04 N1 §6 "Staff cancels", N1 §8):
  - The ConfirmDialog is replaced by a Modal form (`staff-cancel-modal.tsx`) with a required `HouseTextField` "Reason" (5–300 code points; "Give a reason (5 to 300 characters).").
  - The request carries a `submitId`. A `HouseBotPress` row (purpose STAFF_CANCEL) is inserted CHECKING before the locks and moves to DONE inside the cancel transaction.
  - PENDING → CANCELLED(CANCELLED_BY_ADMIN), with event STAFF_INTENT_CANCELLED (reason in its reason column). If the intent has a `targetId`, that target becomes ENDED(VETOED) in the same transaction, and no bot can target that poll again.
  - After commit, COMPLIANCE `house_bot.staff_intent_cancelled {botId, marketId, intentId, side, stakeTzs}` replaces the ADMIN `house_bot.intent_cancelled`.
  - Automated intents keep the flow above unchanged.
- **After:** overlay "Stake cancelled", then refresh.

## 4. System flows (no admin action)

**F6 auto-pause (other causes)**
- **Same pattern as §2.2.** Admin title `House bot "{label}" auto-paused — {cause} · {HH:MM:SS}`; body gives the cause, its end date if known, the number of stakes cancelled, and the way back.
- ~~**Holder:** gets a notice unless the cause is responsible-gambling.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder gets no notice for any cause; the auto-pause alert goes to admins only.
- **Seal:** every status and reason combination has an enabled way out (with X3).

**F7 holder money events**
- **Hook points:**
  - `deposit.confirmed`: `wallet-service.ts:469`;
  - `withdraw.initiated`: `:1784`;
  - `withdraw.aml_held`: `:1915`;
  - `withdraw.confirmed`: `:619`;
  - `withdraw.failed`: `:864`;
  - `aml.rejected`: `admin/aml/actions.ts:179`;
  - `wallet.admin_adjustment`: `wallet-service.ts:2614`.
- **Behaviour:** the bot is read fresh and nothing happens unless it is ACTIVE.
- **Alert:** `House bot "{label}": {holder} {event} TZS {x} · {HH:MM:SS}` / `Transaction {txnId}. Balance now TZS {bal}.` → `/admin/transactions?q={txnId}`, plus an OWNER_MONEY event.
- **Test:** two identical events produce two rows.

**F10 holder's own app**
- ~~**Chip** "50pick liquidity stake" on `position-card.tsx`, the market page's own-positions block, wallet rows and Up & Down history.~~
- ~~**Sell button:** `sell-button.tsx` shows "Liquidity stake — can't be cashed out".~~
- **Cash-out callers** `markets/[id]/page.tsx:292` and `positions/page.tsx:189` pass `houseBotId`.
- **Test:** ~~the chip and marker are absent for every other viewer.~~
- ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no chip and no Sell-button line; a house stake looks exactly like the holder's own bet, and a house position is simply not sellable, reading as a closed exit (C4 ruling 147). The cash-out callers still pass `houseBotId`, and the test is the absence of any house word or marker on the pages served to the holder (`qa:house-bot-holder-view`, C4 ruling 155; C5-SPEC ruling 248 extends it to other viewers).

**F11 resolvers**
- ~~**Display:** "House stake: YES X · NO Y" on the resolver queue card, the resolution ceremony and the admin market page. Nothing renders when both are zero.~~
- **No lock:** ~~display only,~~ no officer lock.
- ⛔ **Superseded by D20 (Ali, 2026-09-17):** no admin screen shows a house stake line. The resolver queue card, the resolution ceremony and the admin market page (and 04 R2's other sites) show a house bot's stake exactly as any player's stake (C5-SPEC rulings 192–194 struck; `C5-D20-REPLAN.md` §2). There is still no officer lock (PLAN I10).

## 5. Notification click-throughs

| Notice | Lands on | Behaviour |
|---|---|---|
| Per-bet bell | `/admin/house-bots/{id}?tab=activity#hbi_{intentId}` | `HashFocus` scrolls to the row. If it's on an older page: "This stake is on an older page" with a link to that page |
| Hourly summary | `/admin/house-bots?tab=activity&range=today` | Filters preset |
| Auto-pause | `/admin/house-bots/{id}`; for password changes `?reverify=1` | §2.4 |
| Switch | `/admin/house-bots` | The strip shows the current state even if it flipped since |
| Money event | `/admin/transactions?q={txnId}` | That exact row |
| Engine alert | `/admin/house-bots/{id}?tab=activity&outcome=failed` | A removed bot's page still lists it, read-only |
| ~~Holder notices~~ | ~~`/positions` or `/positions/{positionId}`~~ | ~~Signed out → login with `?next=` (`proxy.ts:203-204`)~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there are no holder notices, so there is nothing to click through; every row above is an admin's. |

## 6. Future scenarios handled now

- **A new password writer is added later** (for example re-hashing on login, or SSO).
  - The source check fails until that writer calls `onHolderCredentialWrite`.
  - A re-hash passes method REHASH, and because the password was just proven, it refreshes the fingerprint in the same lock without pausing.
- **Player 2FA at sign-in:** no effect. Consent stays password-only (D5).
- **Email or phone change:** no pause. It only invalidates outstanding reset links (`password-reset.ts:210-214`).
- **Holder promoted to staff or AGENT:** L2 → ROLE_CHANGED. If demoted back, Start re-checks eligibility.
- **Two admins act at once:** the version check or a no-op handles it (C6).
- **Deploy while a modal is open:** action ids change, and the error page reloads once (`docs/TRAPS.md`). Nothing is kept, and C2 copy applies.
- **Bell flood:** per-bet alerts are capped per hour. Pause, money and switch alerts also go by email.
- **An admin's own account:** blocked at the picker and at designate.

### Critical Files for Implementation
- C:\kipindi-main\src\lib\server\password-reset.ts
- C:\kipindi-main\src\lib\server\auth-service.ts
- C:\kipindi-main\src\lib\server\erasure.ts
- C:\kipindi-main\src\components\ui\modal.tsx
- C:\kipindi-main\src\app\admin\agents\agents-client.tsx