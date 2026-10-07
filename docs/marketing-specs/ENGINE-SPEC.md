# ENGINE-SPEC — the campaign send engine and its monitoring

> Design spec, read-only pass, 2026-10-04, against `marketing-s10` at `31777791` (U33p committed) in `C:\kipindi-marketing`.
> Scratch copy: the plan, `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`, stays the authority for status and order. When a
> unit here is built, its decisions are recorded in §4 as OD60 onward and its §9 body is rewritten in the same push.
> Format follows `docs/marketing-specs/U40.md` and `U33a-U37c-OD58.md`. Every premise below was re-read in the code on
> the day; file:line references are to that tree (the U33p files are now committed).
> This touches real sends, money (SMS credit) and personal data, so EVERY unit here keeps its adversarial review before
> its push (plan §0 verification policy) — except U41 (docs) and the screen-only parts noted.

| Field | Value |
|---|---|
| Owner instruction | Ali, 2026-10-04: "make the campaign and its monitoring ready to use" |
| Units | U41 · U43-0 · U49s · U38b · U40a · U40b · U16a · U13 · U42 · U43a · U43y · U49a · U43b · U46a · U47b · U48a · U48b · U52a |
| Schema | ONE migration in the whole track: `ADD VALUE 'UNCONFIRMED'` to `SmsCampaignRecipientStatus`, alone, deployed first (U43-0). Two SystemConfig rows through existing doors (no migration) |
| New suites | `test:marketing-settings`, `test:campaign-gates`, `test:campaign-privacy`, `test:marketing-window`, `test:marketing-engine`, `test:campaign-visuals` — each with an IN-PROCESS `--prove-red` (§5.11: no new file-writing red harness). Existing suites extended: campaign-audience, campaign-compose, campaign-models, campaigns-page, dal-parity §26, marketing-consent U9, rg-policy, blackball, sms-cost-guard, sms-dlr |
| Production change per unit | NONE until the owner opens the live switch (G1) and presses Start on a confirmed campaign (G2). Every unit ships inert or behind the closed switch |
| Owner gates touched | G1 (the switch — now with an audited writer and a closing time), G2 (first real start), G3 (spend: the per-campaign limit and the credit kept for codes), G5 (the source line, now a confirm precondition for book audiences), G7 (the test number), G9 (the price — a default of TZS 6 on the new card) |

---

## 0 · Build order and estimates

Focused hours are the lead's hours for one unit end to end on this house's process: spec read → static builder (no
Node) → merge → ONE detached battery under the heavy-node lock → adversarial review → fixes → docs in the same push →
push → proof live (`?dpl=` + the deploy log for the migration). Owner waits and lock queues are NOT included.

### 0.1 The order

| # | Unit | What it is | Depends on | Ships alone because | Hours (low–high) | Set |
|---|---|---|---|---|---|---|
| 1 | **U41** | Record the single-admin decision (docs only; its guard lands in U40a) | — | docs | 1–2 | A |
| 2 | **U43-0** | `UNCONFIRMED` added to the recipient status — the migration alone + the code that knows the value, no writer | — | 55P04: a value added is unusable in its own transaction; it must be DEPLOYED before any writer | 3–5 | A |
| 3 | **U49s** | Admin → System: the live switch's audited writer (with a closing time), and the Marketing SMS settings (price, credit kept for codes, per-campaign limit, send window) | U33p ✅ (same page/actions files) · U37c (campaign-compose §18.6 edit) | the switch ships CLOSED; the settings defaults equal today's behaviour | 9–15 | B |
| 4 | **U38b** | The audience card on the composer: the campaign rail (incl. "who": book / players / both), the keyed split, the D19 floor, words on the list rows | U37c (composer files) · U38a ✅ | nothing sends | 9–15 | B |
| 5 | **U40a** | The confirmation, server: the keyed fence, the service, the frozen estimate and budget, `test:campaign-gates` (U41's guard inside) | U38b · U49s | CONFIRMED sends nothing | 7–11 | — |
| 6 | **U40b** | The confirmation, UI: the modal on the composer, its action, the numeric keypad option | U40a | CONFIRMED sends nothing | 6–10 | — |
| 7 | **U16a** | Erasure, the access export and retention reach `SmsCampaign`, `SmsCampaignRecipient` and the opt-out tokens | U43-0 (DAL serial) | no recipient row exists until U42 + Start | 7–11 | C |
| 8 | **U13** | The send window 08:00–20:00 EAT: `window.ts`, in `dispatchSlice` (so the test send obeys it too), the RG-promise control made real | U33a-G (dispatch.ts) · U49s (window values) | the window only refuses | 4–7 | C |
| 9 | **U42** | Enqueue: the recipient rows over the ONE walk, capped at the confirmed count, restart-safe | U16a deployed (M9) · U40a | nothing calls it until U47b's Start | 6–10 | C |
| 10 | **U43a** | The recipient doors in both twins: claim, settle, find stranded, requeue held, last activity; `smsMessage.findByTargets`; the Postgres probe | U16a (DAL serial) · U43-0 deployed | no caller until U43b | 9–14 | — |
| 11 | **U43y** | Money first: ONE globalThis signal (`money-busy.ts`) fed by two one-line mirrors in `lifecycle.ts` and `market-scheduler.ts` | — | behaviour unchanged; a platform-wide file → the whole predeploy chain once | 3–6 | C |
| 12 | **U49a** | The credit kept for codes and the refusal at Start: `start-check.ts`, `credit-guard.ts`, `sendBatch`'s optional `minimumBalanceTzs` | U49s · U40a | no caller until U43b/U47b | 6–10 | — |
| 13 | **U43b** | The slice: reap → slice-wide checks → claim → gate EVERY recipient → prepare (token + render) → send → settle; `dispatchSlice`'s additive hooks; the transport fix; the five-driver control. Built as **U43b-1** (dispatch hooks + the transport fix, 5–8 h) then **U43b-2** (the engine, 9–14 h) — §4.13 | U43a · U43y · U49a · U13 · U33a-G | nothing calls it until U47b | 14–22 | D |
| 14 | **U46a** | Receipts: the DLR route's recipient arm (monotonic, identity-checked), the previous-secret overlap for rotation | U43a (DAL serial) | the arm only acts on rows U43b writes | 5–8 | D |
| 15 | **U47b** | The live campaign page `/admin/campaigns/[id]`: Start · Pause · Resume · Stop · Make a copy, the page driver, the states and the yields in words. Built as **U47b-1** (services + view-model, no action, 6–9 h) then **U47b-2** (page, actions, driver, drive, 8–13 h) — §4.15 | U43b · U49a · U42 | Start needs the switch open (G1) | 14–22 | — |
| 16 | **U48a** | Results on the live page: delivered (receipts), failed, not sent by reason, no answer, stopped by link, the honesty lines | U47b · U46a | read-only | 5–8 | — |
| 17 | **U48b** | The recipients table (server-paged, masked) and the CSV export | U48a | read-only | 7–12 | — |
| 18 | **U52a** | The live drive on production: ≤ 6 chargeable sends to the approved test number, discrimination, receipts, the stop link on the handset | all above · the whole predeploy chain once | — | 4–8 (+ owner waits) | — |

**Total: about 119–196 focused hours** (U48b may follow G2: 112–184 to G2). With two static builders running on the
disjoint sets below and ONE serial battery, roughly **9–15 working days of lead time**, plus the owner's acts. This sits
on top of the U33a track still to build (U37s, U33a-R, U33a-G, U33a-P, U33b-L, U37c), which the critical path needs before
U13 and U43b.

### 0.2 Parallel sets (disjoint files; `package.json` and the tracker are edited by ONE integrator, one at a time)

- **Set A — now, beside the U33a track:** U41 (tracker + `COMPLIANCE-DECISIONS.md` only) ∥ U43-0 (`schema.prisma`, one new
  migration, `store.ts`/`prisma-dal.ts` unions and mappers, `campaign-model.ts`, `campaign-status.ts`). U43-0 touches no
  file the U33a track touches (U33a-R/G/P touch `consent.ts`, `dispatch.ts`, profile files, new outreach files).
- **Set B — after U37c lands:** U49s (`src/app/admin/system/*`, `live-switch.ts`, the new settings modules, `estimate.ts`'s
  price source, campaign-compose §18.6) ∥ U38b (the composer files, `audience.ts`'s campaign door, `campaign-draft.ts`,
  `campaigns/page.tsx`, `contacts/page.tsx`'s one header). Their suites are disjoint: U38b extends
  `test:campaign-audience`; only U49s edits `test:campaign-compose` (§18.6) — and U37c edits §18 too, which is why U49s
  starts after U37c has landed.
- **Set C — after U40a:** U16a (`erase.ts`, `dsar.ts`, DAL `listByMsisdn`/`unlinkUser`, retention page, DATA-RETENTION)
  ∥ U13 (`window.ts`, `dispatch.ts`, rg-policy, kept-promises, the U9 suite's window injection) ∥ U43y (`money-busy.ts`,
  `lifecycle.ts`, `market-scheduler.ts`) ∥ U42 (`enqueue.ts` new, `test:marketing-engine` new). ⚠️ U42 needs U16a
  DEPLOYED before it ships (M9), so build in parallel and push U16a first.
- **Set D:** U43b (`engine.ts`, `dispatch.ts`, `sms-blackball.ts`, the U9 suite) ∥ U46a (the webhook route, the DAL
  `recordReceipt`, `test:sms-dlr`). U46a's DAL member is serial after U43a's; U43b touches no DAL file.
- **SERIAL ONLY:** any unit touching `store.ts`, `prisma-dal.ts`, `schema.prisma`, migrations, `dal-parity.test.mts` or its
  anchors: U43-0 → U16a → U43a → U46a → U48b. `dispatch.ts`: U33a-G → U13 → U43b. The composer page: U37c → U38b → U40b.
  `/admin/campaigns/[id]`: U47b → U48a → U48b.
- **MACHINE RULE (Ali-Blade15):** builders edit files statically; every typecheck, suite, red, migration-from-empty,
  probe and drive runs ONE at a time through `~/heavy-node-lock.sh`, file-mutating reds (`red:erasure`,
  `red:sms-dlr`, `red:sms-cost-guard`, `red:blackball`) DETACHED and ALONE.

### 0.3 The owner's acts, in the order the path needs them (not units)

1. Save the wordings and policy lines (G4/G10, the U33a track's), the source line (G5) — U40a refuses a book audience
   without it.
2. Read the Marketing SMS card's defaults (U49s): price TZS 6 (G9), credit kept for codes TZS 20,000, per-campaign
   limit TZS 10,000 (G3) — change any by saving the card.
3. Name the approved test number(s) for U52a (default: Jay Kaba, +255 772 619 619, signed in as himself — G7) and the
   suppressed control number (§7 Q4).
4. G1 for U52a: the switch opened for the drive window only (by the owner on the card, or by Claude through the audited
   ops door on Ali's delegation — §4 U49s D9).
5. G2: the first real campaign — the Swahili message (starts "50pick", ≤ 80 characters while the source line is blank, or
   the counter's room once it is set), the audience, the day.

### 0.4 Deliberately NOT in this track (and when each comes)

U44 the pump (a campaign finishes with every browser closed) · U45 scale (bulk settle, the claim index, bulk token read) ·
U14 the frequency cap (⛔ BEFORE A SECOND CAMPAIGN) · U49b the 90 % budget auto-pause · U46b inbound STOP (needs
Blackball's inbound number, OQ8) · U47a Retry and polish · U39b the composer's estimate card (the confirmation shows the
estimate) · U15 one send path · U16b (the 730-day lapse's ledger row, the import-row expiry, `SmsMessage`'s own retention
row — it has none today) · U50 declarations · U51 the guide · U52b the Seal.

---

## 1 · Premises re-checked against the code

### 1.1 True (the engine builds on these)

- **P1.** `dispatchSlice(rows, deps)` asks the ONE gate per recipient, in a loop, before ONE `deps.send` per slice, and
  settles by `ref` (`dispatch.ts:76-140`; the gate default `:79`, the ask `:87`, the send `:120`). Its outcomes:
  `skipped · handed_over · failed · held · unconfirmed` (`:60-65`). It writes the RG COMPLIANCE row on an RG refusal
  (`:94-103`). It sends the gate's own key (`:108`). `send` has no default and `sendBatch` is not imported there — pinned by
  `test:marketing-consent` U9.12b (`marketing-consent.test.mts:707-718`, landmarks `for (const row of rows)`,
  `await ask(row.msisdn)`, `deps.send(`).
- **P2.** `sendBatch` (`sms.ts:614`) never throws; refuses a malformed number per message before any row (`:650-687`);
  holds a non-OTP batch below the platform floor (`:698-720`, `balanceFloor` `:132`, default TZS 50); writes the
  `SmsMessage` rows QUEUED BEFORE the HTTP call (`:735-755`); chunks at `BATCH_MAX` = 50 (`sms-blackball.ts:68`); marks an
  ambiguous reply `UNKNOWN` with result code `TRANSPORT` (`:794-825`). OTP is exempt from every floor (`:692-699`).
- **P3.** `blackballSend` returns `transport` (ambiguous) when `fetch` throws, including its own 8 s abort
  (`sms-blackball.ts:271-295`, `DEFAULT_TIMEOUT_MS` `:75`).
- **P4.** The DLR route authenticates by `BLACKBALL_WEBHOOK_SECRET` (query `?token=` or `X-Blackball-Token`, constant time,
  fails closed once the provider is live — `route.ts:53-64`), checks the reference exists (`:215`), cross-checks the
  msisdn (`:243`), applies the receipt through the monotonic `recordDlr` (`:273-278`; terminal `DELIVERED`/`FAILED`,
  `store.ts:381`) and has ONE fan-out arm, `InviteEntry`, guarded on `changed` (`:286-297`). Production has the secret
  set and the callback registered, proven end to end on an OTP row in 11 s (`docs/BLACKBALL-SMS.md:33`, §4.8).
- **P5.** The campaign tables exist (`schema.prisma:3711-3830`): recipient columns `smsReference` (nullable-unique,
  `:3794`), `optOutToken`, `locale`, `failureClass`, `error`, `skipReason`, `skipDetail`, `claimToken`, `claimedAt`,
  `attempts`, `segments`, `bodyLen`, `costTzs`, `gateTrail` (Json), the stamps; `@@unique([campaignId, msisdn])` (`:3824`);
  indexes on `(campaignId, status)`, `msisdn`, `contactId`, `userId`, `claimToken`. Campaign columns include every
  confirmation, estimate, budget, cursor and engine stamp the track needs. **No new column is needed anywhere.**
- **P6.** `transition` is the ONE status door, conditional on `from` (one winner) and writing the confirmation keys only on
  DRAFT → CONFIRMED, all at once (`campaign-model.ts:347-393`; moves `:83-91`: CONFIRMED → PREPARING | CANCELLED ·
  PREPARING → RUNNING | PAUSED | CANCELLED · RUNNING → PAUSED | DONE | CANCELLED · PAUSED → PREPARING | RUNNING | CANCELLED).
  `to: null` with an engine patch is a conditional write with no move. **U40a needs no new DAL member** — the confirm is
  `transition(DRAFT → CONFIRMED, draftRevision, every confirm key)`.
- **P7.** The recipient namespace has `createMany` (whole batch or nothing, `skipDuplicates` against the unique key),
  `find`, `countByStatus`, `countsByCampaign` — and nothing that claims or settles (`store.ts:3883-…`,
  `prisma-dal.ts:4850-4890`). A seed carries `optOutToken` and nothing that settles (`campaign-model.ts:422-454`).
- **P8.** `fillRecipientCounts` and `tallyRecipientsByCampaign` THROW on a recipient status the code does not know
  (`campaign-model.ts:460-469`, `campaign-status.ts:153-166`) — so the new value's knowledge must be deployed before any row
  holds it.
- **P9.** `walkCampaignAudience` is the ONE walk (book by contact id, then players by account id; cursor `b:` · `p:` ·
  `done`, read only in `audience.ts`; a number the book holds is walked once by its book row) and
  `campaignAudienceCount` is the population U40 fences and U42 enqueues (`audience.ts:1059-1118`). Production's walk deps
  are frozen "and U42's enqueue will read it" (`:1018`).
- **P10.** The pure confirmation rule exists (`campaign-confirm.ts`): `CONFIRM_ENUMERATE_MAX` 5 (`:61`), `confirmTier`,
  `parseTypedCount`, `canonicalMembers` (`:151`), `buildFenceClaim`, `parseFenceClaim`, `decideConfirm` (`:271`, OD27),
  `startAudienceVerdict` (`:330`, OD28), `CONFIRM_TIER_COLUMN`, `CONFIRM_REFUSAL_COPY`.
- **P11.** The estimate arithmetic is ONE pure function (`campaign-estimate.ts:138`), priced on the SAVED segments ×
  the population (X15), `MAX_SLICES_IN_FLIGHT` = 1 "U43 must enforce" (`:67`); the server loader reads the price from
  `SMS_PRICE_PER_SEGMENT_TZS` (`estimate.ts:101-104`) and the reserve from the platform floor "U49 swaps in its marketing
  floor" (`:105`); money only for `campaignMoneyVisible(role)` (`:51`).
- **P12.** The live switch reader fails closed on everything but exactly `{ enabledBy, enabledAt }` (`live-switch.ts:40-62`,
  two keys `:54-55`) and has NO writer in the repository (`:6-7`); a session keeps a scratch script that writes it through
  `railway run` (memory note). `saveConfigOrThrow` and `deleteConfig` exist (`config-store.ts:75-120`); with no database
  both no-op and the reader answers absent (`:37`).
- **P13.** `ensureOptOutToken(raw)` reuses the newest token for a number, else mints with a bounded retry
  (`optout-service.ts:411-463`); tokens never expire and are never deleted (`schema.prisma:3282-3312`), and the schema
  warns U42 never to mint them with `createMany({ skipDuplicates })` (`:3292-3294`).
- **P14.** `renderForRecipient` is THE one renderer; an origin that is not exactly `"account"` is refused while the campaign
  has no source line, and the whole stored template is re-judged for every recipient (`campaign-template.ts:576-594`).
- **P15.** Bet admission state is pinned on `globalThis.__50PICK_ADMISSION` (`admission.ts:115`), so any module instance
  reads the true queue.
- **P16.** `requireOwner(action)` exists: ADMIN only + step-up, audits a refusal (`rbac-guard.ts:282-299`); /admin/system's
  actions use `requireStaff("ops")` (`src/app/admin/system/actions.ts:31-33`); kill-switches sit ABOVE the tab rail by §K
  rule 7d (`src/app/admin/system/page.tsx:492-503`); the rail now has Platform · Marketing wordings · Public policy lines ·
  Diagnostics (`:504-512`).
- **P17.** The single-officer ruling stands: `test:two-admin` asserts the absence of a two-officer lock
  (`scripts/two-admin-policy.test.mts:1-16`); `COMPLIANCE-DECISIONS.md:2996` "Single-officer approval stands."
- **P18.** `KEPT_PROMISES.lateNight` is `kept: false` (`src/lib/legal/kept-promises.ts`, the `lateNight` entry), held to
  the code by `test:rg-policy` K1, whose late-night control holds on `existsSync(window.ts)` alone
  (`scripts/rg-policy.test.mts:102-103`); creating `window.ts` flips that control, so K1 demands the map flip IN THE SAME
  COMMIT (kept-promises header).
- **P19.** `MARKETING_WRITERS` pins the files allowed to send with purpose MARKETING (`campaign-models.test.mts:75-77`).
- **P20.** DATA-RETENTION's campaign row says "owed by U16 BEFORE" the first recipient (`docs/DATA-RETENTION.md:48`); there is
  no `SmsMessage` row in the schedule at all (grep) — U16b's.

### 1.2 False, or at risk — each one changes the plan

- **F1. A gateway timeout DOES read as "failed" today.** `dispatchSlice` maps every `ok: false` result to `failed`,
  including code `TRANSPORT` (`dispatch.ts:129-135`). The test send works around it by hand (`campaign-test-send.ts:266-271`).
  An engine that settled by outcome would mark a timed-out batch FAILED — and FAILED invites a retry, a second charge.
  → E3.
- **F2. A reply body that dies mid-read is recorded FAILED and can never be settled.** `blackballSend` reads the body
  OUTSIDE its inner try (`sms-blackball.ts:298`) while the 8 s abort timer is still armed; a throw there reaches
  `sendBatch`'s chunk catch, which writes `FAILED` (`sms.ts:767-783`) — terminal, so a late DELIVRD receipt is discarded
  (`store.ts:381`). The gateway had the whole request and answered: this is ambiguous, not a refusal. → E3.
- **F3. The money yield cannot be read from a server action today.** `lifecycleTickerHealth().running` reads a module-scope
  `let` (`lifecycle.ts:42`, `:65-77`), as does the market fire gate (`market-scheduler.ts:81`) and the deposit/payout poll
  (`lifecycle.ts:672-688`). Next gives instrumentation, route handlers and pages different module instances (the rbac
  lesson, `a986dd58`), so a slice reading them would see "idle" for ever. → E12, U43y.
- **F4. Minting the token at enqueue mints a permanent link for every person the gate then refuses.** §9 U42 says "the
  opt-out token is minted here"; tokens never expire and are never deleted (P13). With licence outreach closed most of an
  audience is refused at send; each would keep a never-used row holding their number for ever (the F7 finding the U33a
  design already applied to typed tests, S21). → E1.
- **F5. The walk's row kind does not tell a player from a contact.** Since STEP 23 every registered player is ALSO a book
  row (REGISTRATION, linked), and a number the book holds is walked by its book row (P9). An engine that rendered a
  `kind: "contact"` row as a book recipient would refuse every registered player while the source line is blank
  (`campaign-template.ts:590-592`). → E17.
- **F6. `SmsCampaignRecipientStatus` has no "unsure" state** (`schema.prisma:3686-3693`), and its comment names the
  reconciliation as U43's two-step (`:3683-3685`). → E4, U43-0.
- **F7. §9 U46's "ACCEPTED becomes UNCONFIRMED after 15 minutes without a receipt" conflates two facts** — "we do not know
  whether the network has it" and "the network has it, no receipt yet". → E5.
- **F8. §9 U43's "a stranded claim → UNCONFIRMED, never back to PENDING" loses people who were never sent.** `sendBatch`
  writes its rows BEFORE the wire (P2), so a stranded claim with NO `SmsMessage` row was provably never handed over. → E6.
- **F9. The window cannot be a campaign status.** "Outside the window rows are HELD … the campaign pauses with quiet_hours and
  resumes by itself" (§9 U13) needs a timer to resume; PAUSED means an officer's pause. → E9.
- **F10. Every suite that drives `dispatchSlice` becomes time-dependent the moment the window is in it.** The U9 contract
  and campaign-compose §18 call it with no clock; between 20:00 and 08:00 EAT (when this laptop's batteries often run)
  every send would be held. → U13 D4.
- **F11. The live switch has no closing time.** An owner who opens it for a test and forgets leaves every confirmed
  campaign startable and every officer able to test. → E13.
- **F12. Nothing enforces the first campaign's TZS 10,000 cap.** `budgetTzs` is a confirm key nothing writes yet, and no
  send path reads it. → E15.
- **F13. A book audience can be confirmed without a source line, then refused per recipient for ever** — the phrase is a
  frozen draft key (`campaign-model.ts`, `sourcePhrase: "draft"`). → E18.
- **F14. The composer's two doors read a stored filter at the BOOK door** (`composer-loader.ts:159`,
  `campaign-draft.ts:174-181`), so a saved population reads "unreadable", and the address cannot carry a population at all
  (`audience.ts:656-660`). U38b owns both (§0 STEP 22 owed line).

---

## 2 · Cross-unit decisions (record as OD60 onward when built)

Each is decided on Ali's standing delegation of technical calls (§0, 2026-10-02) and binds every unit below.

- **E1 · The opt-out token is ensured at SEND, after the gate clears — not at enqueue.** The engine's per-recipient
  `prepare` hook (E2) calls `ensureOptOutToken(key)` (reuse, else mint) only for a number the gate has just cleared; the
  seed carries `optOutToken: null`; the settle writes the token onto the row. A refused person gets no permanent link. The
  rule "one reused token per number" is unchanged; "a row without a token is never sent" becomes "a message is never
  rendered without a token" (a null token holds the row). *Rules out:* minting in U42; any `createMany` of tokens.
  *Amends:* §9 U42 and the schema comment at `SmsCampaignRecipient.optOutToken` (a `///` comment — no migration).
- **E2 · `dispatchSlice` gains three ADDITIVE hooks and stays the one loop.** (a) A recipient may carry
  `prepare(key, verdict)` instead of a `body`; it runs only after the gate clears, before the wire, and may refuse (held).
  (b) `deps.beforeSend(cleared)` runs once after gating and before the one send; it may veto the send (every cleared row
  held) or drop rows (held `claim_lost`). (c) `deps.window()` runs first; closed → every row held `quiet_hours`, no gate
  asked (U13). The test send passes none of (a)/(b); the U9 landmarks stay; `sendBatch` is still not imported there.
- **E3 · A transport ambiguity is UNCONFIRMED, decided in ONE place.** `dispatchSlice` maps a result whose code is
  `TRANSPORT` to `unconfirmed` and carries its `reference`; `blackballSend` reads the reply body inside its try, so a body
  that dies is `transport` (ambiguous) and the `SmsMessage` row is `UNKNOWN`, never `FAILED`. The test send's hand-mapping
  stays as defence in depth.
- **E4 · `UNCONFIRMED` is a recipient status of its own: SETTLED for progress, never retried automatically, settle-able by
  a late receipt.** It means "handed to the wire, and we do not know whether the network took it". Added by an ADD VALUE
  migration that deploys ALONE (U43-0) one deploy before any writer (U43b).
- **E5 · "No receipt yet" is not a status.** A SENT row with no receipt after 15 minutes is a derived figure on the results
  (U48a). §9 U46's ACCEPTED → UNCONFIRMED line is withdrawn: two facts, two words.
- **E6 · The reaper settles a stranded claim from the evidence.** A claim older than `REAP_AFTER_MS` (10 min) is read
  against the newest `SmsMessage` with that recipient as target: none → back to PENDING (attempts + 1); QUEUED or UNKNOWN →
  UNCONFIRMED (reference kept); ACCEPTED → SENT; DELIVERED → DELIVERED; FAILED → FAILED. Returning to PENDING is safe
  because the engine's `beforeSend` re-reads its claims immediately before the wire (a stalled claimant that resumes after
  a reap finds its claim gone and sends nothing). Every case where the wire may have been reached stays UNCONFIRMED —
  §9 U43's rule, kept where it applies.
- **E7 · A shop-wide refusal is never N failed rows.** Held with a shop-wide reason (`BALANCE_FLOOR`, `NOT_CONFIGURED`,
  `PROVIDER_UNRECOGNISED`, `MARKETING_FLOOR`, `quiet_hours`, `not_running`), or a batch in which EVERY cleared row failed
  with one non-`BAD_MSISDN` code (a `status:false` reply — bad keys, a sender-ID fault): every claimed row goes back to
  PENDING (attempts unchanged for a hold, + 1 for a refused batch), the campaign pauses with ONE reason and ONE audit
  row. A gateway `status:false` charged nothing, so re-sending after Resume is not a second charge.
- **E8 · HELD means "parked: the engine could not check or prepare this person".** A per-person hold (`gate_unanswered`,
  `token_unavailable`, `template_invalid`) returns the row to PENDING with attempts + 1; at `MAX_ROW_ATTEMPTS` (3) it is
  HELD. HELD is OUTSTANDING (U36's vocabulary). Resume re-queues HELD → PENDING (attempts 0). A RUNNING campaign whose only
  outstanding rows are HELD pauses `held_rows` instead of finishing.
- **E9 · The send window never changes a campaign's status.** Outside it the slice WAITS (claims nothing) and
  `dispatchSlice` holds every row `quiet_hours` (defence in depth, and the test send obeys it — M12). Rows stay PENDING; the
  page says when sending resumes.
- **E10 · One marketing slice in flight per PROCESS** (a `globalThis` single-flight across all campaigns), enforcing
  `MAX_SLICES_IN_FLIGHT` = 1 and sparing the shared rail. Across processes (the 60 s deploy overlap) the conditional claim
  keeps every send single.
- **E11 · The slice size adapts.** Start at 20, never above 50 (= `BATCH_MAX`, one `sendBatch` chunk), sized so the gating
  takes about `SLICE_GATE_BUDGET_MS` (10 s) from the measured per-recipient gate time (an in-process moving average).
  U52a re-derives the constants from production latency.
- **E12 · Money first, mechanically.** Before claiming, the slice WAITS while bets queue at admission (or admission is at
  its ceiling), a lifecycle pass or the deposit/payout poll is running, or a market fire is in flight — read through ONE
  globalThis signal (`money-busy.ts`, U43y). It also WAITS two minutes after any OTP-purpose send failed or went unknown
  (login and withdrawal codes share the rail). No lock is held across a send (OD21); a slice holds at most one pooled
  connection at a time.
- **E13 · The live switch carries its own closing time.** Value `{ enabledBy, enabledAt, closesAt }`, `closesAt` 30 min –
  24 h after `enabledAt`, default 2 h; the reader reads an expired row, a two-key row or anything else as CLOSED. One
  audited writer for the owner on Admin → System (above the rail — it is a kill-switch) and one audited ops door for
  Claude acting on Ali's G1 delegation (Claude never signs in as Ali or Jay). Closing deletes the row and reads it back.
- **E14 · One Marketing SMS settings record, `marketing.sms.settings`,** owner-editable, validated, audited
  (`defineConfig`): price per SMS (default TZS 6 — G9 delegated), credit kept for login and withdrawal codes (default
  TZS 20,000), the most one campaign may spend (default TZS 10,000 — G3), the send window (default 08:00–20:00 EAT, bounded
  07:00–21:00, at least 2 h). It REPLACES the `SMS_PRICE_PER_SEGMENT_TZS` env read (one source of truth; the env was never
  set — verify at build, §4 U49s P-4). The window's default is `SEND_WINDOW_EAT` (OQ5's one named constant), declared in
  the pure settings module and re-exported by U13's `window.ts` — never two copies.
- **E15 · The spend ceiling holds by construction.** The confirmation refuses an estimate above the campaign limit and
  freezes `budgetTzs` = that limit; Start refuses when today's price × the frozen segments exceeds it; the enqueue never
  writes more rows than were confirmed; one message per row; `SMS_MAX_SEGMENTS` = 1; no automatic retry. U49b's in-flight
  90 % pause is not needed for the first campaign and follows.
- **E16 · Credit for codes.** Start refuses when the LIVE credit (read fresh, ≤ 60 s) minus the frozen cost is below the
  credit kept for codes; each slice pauses when the credit minus the slice's cost is below it, or when the credit cannot
  be read (fail closed — for marketing only); `sendBatch` takes an optional `minimumBalanceTzs` (refusal code
  `MARKETING_FLOOR`) as the last line. The OTP path is untouched (§6).
- **E17 · The origin of a message is decided by WHO HOLDS THE NUMBER AT SEND TIME.** An account → `"account"` (their own
  first name may print, no source line, `variantFor(user.locale)`); otherwise `"book"` (the fallback, the source line,
  Swahili) — never by the walk's row kind (F5).
- **E18 · A campaign that can reach the contact book needs its source line.** Population `null` (book) or `both` with a blank
  `sourcePhrase` is refused at the confirmation and again at Start (G5); a players-only campaign needs none.
- **E19 · OD28 runs at Start, and the enqueue caps continuously.** Start counts the population fresh
  (`campaignAudienceCount`) and, for an enumerated confirmation, its keyed members, through `startAudienceVerdict`; the
  enqueue never writes more rows than `audienceCount` and reports any overflow.
- **E20 · The gate trail (M6, §5.8).** Every settled recipient carries an ordered list of `{ check, verdict, wording,
  source }`: the slice's checks, the gate's verdict (reason and detail; basis and basisRef once U33a-G lands — S7), the
  render (variant, origin, name or fallback) and the dispatch outcome (reference). References, never copies of evidence;
  never a phone number.
- **E21 · Recipient ids sort in enqueue order:** `rcp_` + `ledgerStamp().id` (`ledger-stamp.ts`: fixed-width hex, clock
  first), so `ORDER BY id` is the walk's order.
- **E22 · The driver is the open page** (U44's pump deferred). One server call = one step: PREPARING enqueues one chunk,
  RUNNING runs one slice, PAUSED/CANCELLED/DONE only reap. The step is act-gated; a view-only role polls a read. The page
  says "Keep this page open while it sends".
- **E23 · The D19 floor on every campaign surface.** A viewer whose `identity.contact` cell is not `read` sees no
  per-state split and no reason breakdown for an audience or campaign of fewer than `MASKED_BREAKDOWN_MIN` (10) people,
  and never a per-row reason. Readers see everything.
- **E24 · One audit row per event** — no per-recipient row, no per-slice row: started, start refused, enqueued, paused
  (officer or engine, with the reason), resumed, stopped, finished (with counts), reaped (when > 0), exported. ADMIN for
  an officer's act, SYSTEM (actor null) for the engine, COMPLIANCE for the live switch and the confirmation.
- **E25 · Stop rewrites nothing.** Outstanding rows of a CANCELLED campaign stay PENDING/HELD; "stopped before sending" is a
  derived count.
- **E26 · The first release exports MASKED numbers for every role** (U48b). Full numbers come later through the audited
  reveal.
- **E27 · U41: one officer's typed confirmation IS the authorisation;** the owner's live switch is the G1/G2 control.
- **E28 · Receipts settle recipients through ONE arm** — from PENDING (claimed) · SENT · UNCONFIRMED to DELIVERED/FAILED,
  monotonic in the WHERE, run only when the `SmsMessage` row moved, identity-checked (target id, msisdn, reference).
- **E29 · The webhook secret can be rotated without losing receipts:** an optional `BLACKBALL_WEBHOOK_SECRET_PREVIOUS` is
  accepted beside the current one while the vendor's URL is changed.
- **E30 · "Stopped by their link since this campaign"** = this campaign's handed-over recipients whose number now has an
  active `WITHDRAWN` stop with `optout:` evidence created after their `sentAt` — read through §25's `findActiveAmong`, no new
  member; attributed to the most recent campaign sent to that number before the stop.

---

## 3 · The state machines

### 3.1 The campaign (moves are `SMS_CAMPAIGN_MOVES`; every write is one conditional `transition`)

| From → to | Who | Patch | Guard |
|---|---|---|---|
| DRAFT → CONFIRMED | officer (U40a) | every confirm key incl. `budgetTzs` | `draftRevision`; fresh fence; limit; source line |
| CONFIRMED → PREPARING | officer: Start (U47b) | `startedAt` | `startRefusal` = null (U49a) |
| PREPARING → (none) | engine: enqueue step (U42) | `enqueueCursor` | still PREPARING |
| PREPARING → RUNNING | engine: last chunk (U42) | `enqueuedAt`, `enqueueCursor: "done"` | still PREPARING |
| PREPARING · RUNNING → PAUSED | officer: Pause · engine: a pause reason | `pausedAt`, `stopReason` | from either |
| PAUSED → PREPARING / RUNNING | officer: Resume | `stopReason: null` (+ HELD re-queued) | `resumeRefusal` = null; PREPARING when `enqueuedAt` is null |
| RUNNING → DONE | engine: nothing outstanding | `finishedAt` | no PENDING, no HELD |
| CONFIRMED · PREPARING · RUNNING · PAUSED → CANCELLED | officer: Stop | `finishedAt`, `stopReason: "officer_stopped"` | — |

### 3.2 The recipient

| Status | Meaning | Written by | Side |
|---|---|---|---|
| PENDING (no claim) | waits for a slice | enqueue; release; reap (no evidence); Resume (from HELD) | outstanding |
| PENDING (claimed) | a slice holds it | claim | outstanding |
| HELD | parked: could not check or prepare it 3 times | settle | outstanding |
| SKIPPED | the gate refused it (the system working) | settle | settled |
| SENT | the network took it ("handed over") | settle; reap (ACCEPTED) | settled |
| UNCONFIRMED (new) | handed to the wire, the network's answer never came | settle; reap (QUEUED/UNKNOWN) | settled |
| FAILED | the network refused this message, or a receipt said undelivered | settle; reap; receipt | settled |
| DELIVERED | a receipt said delivered | receipt; reap | settled |

Receipts move PENDING (claimed) · SENT · UNCONFIRMED → DELIVERED | FAILED and nothing else. Nothing moves a settled row
back, except U47a's future Retry (an operator's act, re-gated).

### 3.3 One step (what one driver call does)

| Campaign status | The step |
|---|---|
| DRAFT · CONFIRMED | nothing (view only) |
| PREPARING | reap → one enqueue chunk (U42) |
| RUNNING | reap → one slice (U43b) |
| PAUSED · CANCELLED · DONE | reap only (so a stranded claim never shows "not sent" for a message that went) |

### 3.4 The engine's stop reasons (`campaign-status.ts` `STOP_REASON_SENTENCE` — each unit adds its own keys)

| Key | Sentence (officer reads it on the list and the live page) | Added by |
|---|---|---|
| `officer_paused` | "Paused by an officer." (the live page names who and when from the audit row) | U47b |
| `officer_stopped` | "Stopped by an officer." | U47b |
| `live_switch_closed` | "Paused — marketing SMS were switched off. The owner switches them on, then press Resume." | U43b |
| `MARKETING_FLOOR` · `marketing_floor` | "Paused — the SMS credit reached what is kept for login and withdrawal codes. Top up, then Resume." | U49a |
| `credit_unreadable` | "Paused — the SMS credit couldn't be read, so sending stopped to protect login codes. Resume when Admin → System shows the credit again." | U49a |
| `gateway_refused` | "Paused — the SMS network refused the last batch, and nothing in it was charged. Check Admin → System, then Resume." | U43b |
| `template_invalid` | "Paused — the saved message no longer passes its own check, so nobody more is messaged. Stop this campaign and send a corrected copy." | U43b |
| `held_rows` | "Paused — some people could not be checked or prepared. Resume to try them again, or Stop." | U43b |
| `audience_unreadable` | "Paused — the saved audience can't be read any more. Stop this campaign and confirm a new copy." | U42 |
| `audience_moved` | "Paused — the people on this campaign changed after it was started. Nothing was sent. Stop it and confirm a new copy." | U42 |
| existing | `BALANCE_FLOOR` · `NOT_CONFIGURED` · `PROVIDER_UNRECOGNISED` · `gate_unanswered` (kept) | U36 |

---

## 4 · The units, in build order

### 4.1 · U41 · Authorisation — record the single-admin decision

**Kind:** docs (its guard lands in U40a's suite) · **Hours:** 1–2 · **Review:** none (docs) · **Set:** A.

**Premises checked.** OD18 (§4) still reads "two officers above 50 recipients or TZS 10,000" with "⚠️ Reconcile before
U41"; §9 U41 still describes `twoOfficerGate`. The ruling it must cite: 2026-07-24 single-admin default
(`two-admin-policy.test.mts:1-16`; `COMPLIANCE-DECISIONS.md:2996`). `twoOfficerGate` exists (`two-officer.ts`, per the U40
spec's premise) and nothing in the campaign path calls it (grep `twoOfficerGate` in `src/lib/server/marketing` and
`src/app/admin/campaigns`: zero).

**Decisions.**
1. A campaign is authorised by ONE officer's typed confirmation (U40), at any size. No second officer, no 60-minute grant,
   no in-loop re-check of an authorisation. The owner's control over sending is the live switch (G1/G2, E13).
2. The two-officer toggle is not built; it waits until Ali asks for one (then it follows `resolution-policy.ts`'s
   optional-toggle precedent, never a hard lock).
3. U41's guard is a structural assertion in `test:campaign-gates` (U40a G7.1): no file under `src/lib/server/marketing/`
   or `src/app/admin/campaigns/` calls `twoOfficerGate(` or reads a second approver — with its in-process plant.

**Files.**

| Path | Action | What |
|---|---|---|
| `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md` | modify | §4 OD18 struck through with the ruling; new OD (U41 decided); §9 U41 body rewritten (decision + guard); §1 U41 row 🟡 → ✅ when U40a's push carries the guard (its commit, `test:campaign-gates`, `red:campaign-gates`, the live date) |
| `docs/COMPLIANCE-DECISIONS.md` | modify | a dated entry "Marketing campaigns are authorised by one officer's typed confirmation" citing the 2026-07-24 ruling and naming the live switch as the owner's control |

**Tests.** None of its own; U40a G7.1 and plant R-G7.1. **Owner decision:** none — Ali's ruling already covers it.

---

### 4.2 · U43-0 · The `UNCONFIRMED` value — the migration alone

**Kind:** data · **Hours:** 3–5 · **Review:** yes (schema) · **Set:** A · **Ships alone:** Postgres refuses a value added by
`ALTER TYPE … ADD VALUE` inside the transaction that added it (55P04, measured S3b); the writer (U43b) must deploy after.

**Premises checked.** The precedent is `20261001160000_sms_purpose_marketing` (one statement, a header saying why). The
recipient enum is `PENDING HELD SENT DELIVERED FAILED SKIPPED` (`schema.prisma:3686-3693`), mirrored by the store union
(`store.ts`, `SmsCampaignRecipientStatus`), `RECIPIENT_STATUS_SET` (`campaign-model.ts:70`), `RECIPIENT_SIDE` and
`zeroRecipientStatusCounts` (`campaign-status.ts:106-135`), and every `Record<SmsCampaignRecipientStatus, …>` (the compiler
lists them). Counts THROW on an unknown status (P8). The newest migration is `20261004120000_contact_list_basis`.

**Decisions.**
1. One migration, one statement, nothing else in the deploy: `ALTER TYPE "SmsCampaignRecipientStatus" ADD VALUE IF NOT
   EXISTS 'UNCONFIRMED';` The stamp sorts after the newest migration on main at build time (re-derive; e.g.
   `20261005090000_sms_recipient_unconfirmed`).
2. The SAME commit teaches the code the value (no writer): the schema enum, the store union, the Prisma read mapper's
   union, `RECIPIENT_STATUS_SET`, `RECIPIENT_SIDE.UNCONFIRMED = "settled"`, `zeroRecipientStatusCounts`, the schema's
   `///` comment ("handed to the wire, the network's answer never came; never retried automatically; a late receipt may
   settle it — E4"), and `campaign-status.ts`'s header. The old build in the 60-second overlap never meets the value (no
   row holds it until U43b).
3. A writer pin: `UNCONFIRMED_WRITERS: readonly string[] = []` in `test:campaign-models` (§3.2); U43b and U46a declare
   themselves in their own commits.
4. ⛔ Never `prisma migrate diff` (it sweeps the trigram indexes, plan §0 TRAPS). Proven from EMPTY on embedded
   PostgreSQL 18.3 with a drift diff naming nothing but the new value.

**Files.**

| Path | Action | What |
|---|---|---|
| `prisma/migrations/<stamp>_sms_recipient_unconfirmed/migration.sql` | create | the header (why alone, 55P04, the precedents `20261001160000_sms_purpose_marketing`, `20260701120000_bonus_queued_status`) + the one statement |
| `prisma/schema.prisma` | modify | `UNCONFIRMED` in `SmsCampaignRecipientStatus` with its `///` doc; the `optOutToken` comment per E1 |
| `src/lib/server/store.ts` | modify | the union `SmsCampaignRecipientStatus` gains `"UNCONFIRMED"` |
| `src/lib/server/prisma-dal.ts` | modify | the read mapper's status cast accepts it (named type) |
| `src/lib/server/marketing/campaign-model.ts` | modify | `RECIPIENT_STATUS_SET.UNCONFIRMED = true` |
| `src/lib/marketing/campaign-status.ts` | modify | `RECIPIENT_SIDE.UNCONFIRMED = "settled"`; `zeroRecipientStatusCounts` gains it; header text |
| `scripts/campaign-models.test.mts` | modify | §1.12, §1.13, §3.2 below + plants |
| `scripts/campaigns-page.test.mts` | modify | §3 gains the UNCONFIRMED split case + plant |
| `scripts/dal-parity.test.mts` (+ anchors) | modify | §26 · both twins' status unions name the value |
| `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`, `docs/DATA-RETENTION.md` (the campaign row's status list) | modify | STEP, §1 U43 row 🟡, the reconciliation recorded |

**Deploy order.** Push alone → wait for production's deploy log "Applying migration `<stamp>_sms_recipient_unconfirmed` …
All migrations have been successfully applied" and `?dpl=<sha>` → only then may U43b (the first writer) be pushed. Check
that no other lane's migration rides in the same deploy (`git diff origin/main..HEAD -- prisma/migrations`).

**Tests** (`test:campaign-models`, in `predeploy` already).
- 1.12 ⛔ exactly ONE migration adds `UNCONFIRMED` to `SmsCampaignRecipientStatus`, and that file holds NO other statement.
- 1.13 that migration sorts AFTER `20261002120000_sms_campaign_models` (the type exists before it is extended).
- 3.2 ⛔ no src file writes `status: "UNCONFIRMED"` unless declared in `UNCONFIRMED_WRITERS` (empty in this commit).
- campaigns-page 3.x: 4 SENT · 1 UNCONFIRMED · 5 PENDING reads 5 of 10 (UNCONFIRMED is settled), and an unknown status
  still throws.
- dal-parity 26.status: both twins' unions and the Prisma enum name the same seven values.
**Red plants** (in-process, `red:campaign-models` / `red:campaigns-page`): R1.12 the ADD VALUE file also carries an
`UPDATE … SET status = 'UNCONFIRMED'` (55P04); R3.2 a src file writing UNCONFIRMED while the pin is empty;
R-side UNCONFIRMED counted outstanding ("a campaign with an unanswered message never finishes").
**Probe:** `db:probe-campaign-models` re-run (all migrations from empty, the value present, an insert using it in a LATER
transaction succeeds).
**Audit rows:** none. **Drive:** none (no screen changes).
**Risks.** Another lane's migration in the same deploy (check before pushing). A forgotten `Record<…>` site — the
compiler finds every one.
**Owner decision:** none.

---

### 4.3 · U49s · Admin → System: the live switch's audited writer, and the Marketing SMS settings

**Kind:** engine + visual · **Hours:** 9–15 · **Review:** yes (it opens real sends and sets money) · **Set:** B, after
U37c (both edit `test:campaign-compose` §18).

> **As built — U49s-1, the server half (2026-10-06, the plan's §0 STEP 43; OD62 · OD63).** Split before it was started,
> like U37c: U49s-1 is the reader, the two writers, the ops door, the settings record and the estimate's price; U49s-2 is
> the card, the tab, the three actions (S6, S11) and the drive. Recorded departures: (1) ⛔ the reviews' MAJORs — OPEN
> reads first (never over an opening or an unreadable switch), RECORDS FIRST (`marketing.live_switch_opening`, before
> the row exists) and writes CONDITIONALLY (`createConfigIfAbsent` where there is no row, `replaceConfigIfValue` for the
> exact stale row read — never an upsert, so of two openings in one instant exactly one stands); every path that cannot
> stand behind an opening goes through ONE rollback that deletes only the row this call wrote (`deleteConfigIfValue`, a
> jsonb compare-and-delete, proven on PostgreSQL 18.3 by `db:probe-marketing-settings`) and says "off" only on a read
> that proves it, recording the ending (`marketing.live_switch_open_failed`); new refusals `already_open`,
> `cannot_read`, `record_failed`, `changed_meanwhile`, `other_open`, `unconfirmed_off`, `reopened_meanwhile` and
> `close_unconfirmed` replace a false "it stays off"; (2) CLOSE removes the row with DELETE … RETURNING (`takeConfig`) and records exactly
> the row it removed — an expired or malformed row included (`was`); a delete that loses its reply is looked at before
> any retry and recorded as `was: unknown` once a readable read proves the row gone (stored values compared, against a
> first read that succeeded), never "already off"; a retry takes only the row first read, so an opening that lands after
> it stands (`reopened`); only a switch with nothing to remove is `already_closed`; (3) the reader takes "now" after the
> read lands and refuses a date that does not round-trip, and an `enabledAt` over a minute in the future reads
> malformed — and is never replaced as stale (another writer's opening, stamped by a clock ahead); the gate checks
> `closesAt` itself; (4) the ops door screens `by`/`reason` with NFKC, no hidden,
> default-ignorable or lone-surrogate characters and at most six numerals of any kind across the two, and refuses a write
> outside production's Railway environment and its own `AUDIT_CHAIN_SECRET`, or — for an open — from a PC whose clock
> is over 20 s off the database's (`readDatabaseClockMs`, `opsClockProblem`; a close only warns), and rewrites Railway's
> private database host to the public proxy as every ops script does; (5)
> `reloadMarketingSmsSettings()` answers `{ ok, settings, stored, readable }` instead of a bare record, and the estimate
> re-reads it for every estimate, pricing nothing from a half-read row; (6) S7 scans every source extension in `src/` and
> `scripts/` (tests aside; the loopback probe allowed by name, and U49s-2's drive by exact path while it refuses any
> other database before it connects).

> **As built — U49s-2, the screens (2026-10-06, the plan's §0 STEP 44; OD64).** Recorded departures: (1) "Switch off
> now" is offered while the switch reads malformed or unreadable as well as while it is on (a stop is never withheld,
> and an opening stamped by a clock ahead blocks "Switch on…" as `already_open`), and the malformed sentence adds "Switch
> it off now to clear it." for a viewer who can; the open sentence repeats the closing time with its "EAT"; (2) the
> card's words live in a pure `marketing-sms-words.ts` that `test:marketing-settings` S14 runs against every writer path:
> a refused switch-on says "weren't switched on" only for a refusal made before the click wrote anything (not
> `cannot_read` or `changed_meanwhile`, which cannot know what is on — "Couldn't confirm whether marketing SMS are on"),
> one that wrote and was taken back "didn't complete"; `already_open` and "already off" are worded from the server's read
> AFTER the answer (the actions hand it back): an opening stamped ahead of this clock (malformed here) is "Clear the
> stored switch first", one that reads on "Switched on since this page loaded", and "It was already off." only when
> nothing is stored — a stale row three deletes could not remove is said as such; no title repeats its body; refusals
> and caveats stay until dismissed; a role read that fails is said as such, never as "not the owner"; (3) the
> limits line tells a viewer who is not the owner "they are set on the Marketing SMS tab", binds each "TZS" to its
> amount with a no-break space, and an owner whose own money.figures cell hides money reads the settings as text; a
> record that cannot be read in full shows no value; what only the form prints (a save ever made, the floor, the
> measured price) is handed with the form only; (4) the page asks `loadSmsMoneyForViewer` (estimate.ts) — one read of the
> stored role answers whether the viewer is the owner AND may read money — never `campaignMoneyVisible` itself; its
> role-taking twin `loadSmsMoneyForViewerAs` exists for the suite; (5) the switch's durations live in the pure
> `src/lib/marketing/sms-settings.ts` (re-exported by live-switch.ts) so the card offers exactly what the writer accepts,
> and the dialog offers them as six RADIOS, not a select (the kit Select's list is portalled outside the aria-modal
> dialog, hidden from VoiceOver, and the dialog's Escape closed it whole); the dialog stays up until the server answers,
> and focus then lands on the state sentence; (6) who switched it on is "an owner" for a name with four numerals in a
> row or more than six in all (the ops door's own limit for that slot), and the ops door's `by` is screened again as it
> is read; (7) the Drive runs on a scratch PostgreSQL 18.3
> with no injected reader — the switch is opened and closed for real — so the no-database refusal is held by S5b, not
> driven; its viewers are GROWTH (no money) and COMPLIANCE (money), each granted the ops view in the scratch cluster,
> because only ADMIN holds it by default; (8) `test:marketing-settings` S7 lets the drive name the switch's keys by exact
> path only while it refuses a non-loopback database (a `host` or `hostaddr` parameter included) before it connects.

**Premises checked.** P12 (the reader, no writer, the two-key rule; `saveConfigOrThrow`/`deleteConfig`), P16 (owner guard,
kill-switch above the rail, the tab rail), P11 (the price env read and the reserve), `defineConfig` (validate, audit
`{before, after, changes}`, verified setter, reload — `define-config.ts:1-120`), the readers of the switch
(`campaign-test-send.ts:241-243`, `composer-loader.ts:228`), campaign-compose §18.6 (`:1797-1815`, "a key beside the two"
must read CLOSED) and its plants (`:3245-3397`). P-4: `SMS_PRICE_PER_SEGMENT_TZS` is read in ONE place
(`estimate.ts:101-104`) and G9 says it is not set on Railway — the builder verifies with
`railway variables --service 50pick` before deleting the read (if it IS set, the record's first save is seeded from it and
the env read is still deleted in the same commit).

**Decisions.**
1. **The switch's value is `{ enabledBy, enabledAt, closesAt }`** (E13). The reader accepts exactly those three keys with
   `enabledBy` non-blank, two instants, `closesAt` > `enabledAt`, `closesAt − enabledAt` ≤ 24 h, and `now < closesAt`;
   otherwise CLOSED with `why` ∈ `absent · unreadable · malformed · expired` (expired carries `closedAt` = `closesAt`).
   A two-key row (the old scratch script's) reads `malformed` — the safe direction; at deploy the switch is absent.
2. **Open:** owner only (`requireOwner("marketingLiveSwitch")`), a duration from 30 min to 24 h (default 2 h, offered as
   30 min · 1 h · 2 h · 4 h · 8 h · 24 h), written with `saveConfigOrThrow`, then READ BACK through the strict reader — open
   only when the read-back says open with the same `enabledAt`. Audit COMPLIANCE `marketing.live_switch_opened`
   `{ closesAt, via }`, awaited; if the audit write throws, the switch is closed again and the action says so (fail
   closed: no open without its record).
3. **Close:** owner only; `deleteConfig` then read back — success only when the reader says closed. Audit COMPLIANCE
   `marketing.live_switch_closed` `{ via, openSince }`. Closing an already-closed switch writes nothing and says "It was
   already off."
4. **The settings record** `marketing.sms.settings` = `{ v: 1, pricePerSegmentTzs, codesReserveTzs, campaignLimitTzs,
   windowStartMinute, windowEndMinute }` through `defineConfig` with a merge that REPLACES the whole object (U33a §5's
   lesson), validate on the server, audit ADMIN `config.marketing_sms_settings_updated`, verified setter, owner only.
5. **Bounds (validation, every problem at once, each under its own box):** price 1–1,000, at most two decimals · kept for
   codes: at least the platform floor (`smsBalanceThresholds().floorTzs`, TZS 50 today) and at most 10,000,000, whole TZS ·
   campaign limit 100–10,000,000, whole TZS · window start 07:00–19:00 on the quarter hour, end 09:00–21:00 on the quarter
   hour, end − start ≥ 2 h.
6. **Defaults:** price 6 (G9 delegated, measured twice) · kept for codes 20,000 · campaign limit 10,000 (G3 delegated) ·
   window 480–1200. The window's default is `SEND_WINDOW_EAT` — OQ5's ONE named constant — declared in the pure
   `src/lib/marketing/sms-settings.ts` (pinned in `test:client-graph-safe`). ⛔ This unit does NOT create `window.ts` (see
   the Files table); U13 creates it and re-exports the constant from there, so there is still one constant.
7. **One price source:** `estimate.ts`'s `configuredTzs` reads `marketingSmsSettings().pricePerSegmentTzs`; the env read and
   its `.env.example` line are deleted; the estimate still prefers a MEASURED price when U39a's walk has one.
8. **Where it shows (§K 7d):** a "Marketing SMS sending" card ABOVE the rail (state + Switch on / Switch off now — it is a
   kill-switch), and a new fifth tab "Marketing SMS" (`?tab=marketing-sms`) holding the settings form. A non-owner sees the
   state and the values as text, controls disabled with the reason in `title`.
9. **The ops door** `npm run ops:marketing-live-switch -- status | open --minutes 120 --by "<who>" --reason "<why>" | close
   --by "<who>" --reason "<why>"` calls the SAME `openMarketingLiveSwitch` / `closeMarketingLiveSwitch` with `via: "ops"`,
   `actorId: null` and `{ by, reason }` in the payload (screened: no phone run, ≤ 120 characters). It refuses without a
   database and is run as `railway run --service 50pick npm run ops:marketing-live-switch -- …` so production's audit secret
   signs the row (STEP 23's precedent). It is the ONLY non-card writer; `test:marketing-settings` pins the writer population.
10. **No new SMS sentence anywhere public;** the card's words are English console copy, no invented Swahili gloss (§5.13):
    the card carries no `sw` prop.

**Files.**

| Path | Action | What |
|---|---|---|
| `src/lib/server/marketing/live-switch.ts` | modify | the three-key reader (+ `now` param), `LIVE_SWITCH_OPEN_MS` bounds, `openMarketingLiveSwitch`, `closeMarketingLiveSwitch`, `LiveSwitchWriteDeps` |
| `src/lib/marketing/sms-settings.ts` | create | PURE, client-safe: the shape, defaults, bounds, `marketingSmsSettingsProblems`, `formatWindow` |
| `src/lib/marketing/window.ts` | ⛔ NOT created here | creating it — even holding only a constant — flips `test:rg-policy`'s late-night control (it holds on `existsSync(window.ts)`, P18), and K1 would then demand `KEPT_PROMISES.lateNight = true` while nothing enforces a window: the D12 defect. U13 creates it, in the commit where `dispatchSlice` calls it |
| `src/lib/server/marketing/sms-settings.ts` | create | the `defineConfig` record, `marketingSmsSettings()`, `reloadMarketingSmsSettings()`, `saveMarketingSmsSettings(input, officerId)` |
| `src/lib/server/marketing/estimate.ts` | modify | `configuredTzs` from the record; header |
| `src/app/admin/system/actions.ts` | modify | `openMarketingLiveSwitchAction(formData)`, `closeMarketingLiveSwitchAction()`, `saveMarketingSmsSettingsAction(formData)` |
| `src/app/admin/system/marketing-sms-card.tsx` | create | the above-the-rail card (client island for the two dialogs) |
| `src/app/admin/system/marketing-sms-form.tsx` | create | the tab's settings form (kit Field/Input, whole-number money boxes, `UnsavedChangesGuard`) |
| `src/app/admin/system/page.tsx` | modify | read the switch and the record; render the card above the rail; the fifth tab value |
| `src/app/admin/system/loading.tsx` | modify | the card's ghost (equal height by construction) |
| `scripts/ops/marketing-live-switch.mts` | create | the ops door (no business logic of its own) |
| `scripts/marketing-settings.test.mts` | create | `test:marketing-settings` + in-process `--prove-red` |
| `scripts/campaign-compose.test.mts` | modify | §18.6 rewritten for three keys + expiry; plants kept and re-aimed (a two-key row reads open; an expired row reads open) |
| `scripts/live/marketing-u49s-settings-drive.mjs` | create | `qa:marketing-settings` |
| `package.json` | modify | `test:marketing-settings` + `red:marketing-settings` (+ predeploy after `test:marketing-wordings`), `qa:marketing-settings`, `ops:marketing-live-switch` |
| `.env.example`, `docs/BLACKBALL-SMS.md` §6 | modify | the price env removed; the switch described |

**APIs.**

```ts
// src/lib/server/marketing/live-switch.ts
export const LIVE_SWITCH_MIN_OPEN_MS = 30 * 60_000;
export const LIVE_SWITCH_MAX_OPEN_MS = 24 * 60 * 60_000;
export const LIVE_SWITCH_DEFAULT_OPEN_MS = 2 * 60 * 60_000;
export type MarketingLiveSwitch =
  | { state: "open"; enabledBy: string; enabledAt: string; closesAt: string }
  | { state: "closed"; why: "absent" | "unreadable" | "malformed" | "expired"; closedAt?: string };
export async function readMarketingLiveSwitch(load?: MarketingLiveSwitchLoad, now?: number): Promise<MarketingLiveSwitch>;
export type LiveSwitchWriteDeps = {
  save: (key: string, value: unknown) => Promise<void>;     // saveConfigOrThrow
  remove: (key: string) => Promise<boolean>;                 // deleteConfig
  read: () => Promise<MarketingLiveSwitch>;
  audit: (entry: AuditInput) => Promise<unknown>;
  now: () => number;
  hasDatabase: () => boolean;
};
export type LiveSwitchWriteResult =
  | { ok: true; state: MarketingLiveSwitch }
  | { ok: false; reason: "bad_duration" | "no_database" | "save_failed" | "not_open_after_save" | "audit_failed" | "still_open_after_close" | "already_closed" };
export async function openMarketingLiveSwitch(i: { actorId: string | null; forMs: number; via: "card" | "ops"; by?: string; reason?: string }, deps?: LiveSwitchWriteDeps): Promise<LiveSwitchWriteResult>;
export async function closeMarketingLiveSwitch(i: { actorId: string | null; via: "card" | "ops"; by?: string; reason?: string }, deps?: LiveSwitchWriteDeps): Promise<LiveSwitchWriteResult>;

// src/lib/marketing/sms-settings.ts (pure)
export const SEND_WINDOW_EAT: Readonly<{ startMinute: 480; endMinute: 1200 }>; // OQ5's one constant; U13's window.ts re-exports it
export type MarketingSmsSettings = { v: 1; pricePerSegmentTzs: number; codesReserveTzs: number; campaignLimitTzs: number; windowStartMinute: number; windowEndMinute: number };
export const MARKETING_SMS_SETTINGS_DEFAULTS: MarketingSmsSettings;
export const MARKETING_SMS_BOUNDS: { price: { min: 1; max: 1000 }; reserve: { max: 10_000_000 }; limit: { min: 100; max: 10_000_000 }; startEarliest: 420; startLatest: 1140; endEarliest: 540; endLatest: 1260; minWindow: 120; step: 15 };
export type SettingsField = Exclude<keyof MarketingSmsSettings, "v">;
export function marketingSmsSettingsProblems(raw: unknown, platformFloorTzs: number):
  | { ok: true; value: MarketingSmsSettings } | { ok: false; problems: Partial<Record<SettingsField, string>> };
export function formatWindow(s: Pick<MarketingSmsSettings, "windowStartMinute" | "windowEndMinute">): string; // "08:00–20:00 EAT"

// src/lib/server/marketing/sms-settings.ts
export const MARKETING_SMS_SETTINGS_KEY = "marketing.sms.settings";
export function marketingSmsSettings(): MarketingSmsSettings;            // cached, sync
export async function reloadMarketingSmsSettings(): Promise<MarketingSmsSettings>; // the engine, once per slice
export async function saveMarketingSmsSettings(input: unknown, officerId: string):
  Promise<{ ok: true; value: MarketingSmsSettings } | { ok: false; reason: "invalid" | "stale" | "unreadable"; problems?: Partial<Record<SettingsField, string>> }>;
```

The settings form posts a `base` fingerprint (the record's `updatedAt` or a hash of the value it was rendered from) —
a stale page is refused (U33w's m1 precedent).

**States and sentences.**

*Card above the rail — "Marketing SMS sending":*
- Closed (absent): "Off — no marketing SMS can be sent. Campaigns can't start, and test sends to a phone are refused."
- Closed (expired): "Off — it switched itself off at 14:30 EAT."
- Closed (unreadable): "Couldn't read the switch — it is treated as off. Reload the page to check again."
- Closed (malformed): "Off — the stored switch was not in a shape this version reads, so it is treated as off."
- Open: "On until 14:30 EAT — switched on by Jay Kaba at 12:30 EAT. Started campaigns send while it is on; it switches
  itself off at 14:30." (the name from the user row; never a number)
- The limits line (every viewer): "TZS 6 per SMS · TZS 20,000 kept for login and withdrawal codes · at most TZS 10,000 per
  campaign · sends 08:00–20:00 EAT — change them on the Marketing SMS tab." (a role that may not read money sees: "Sends
  08:00–20:00 EAT. The price, the credit kept for codes and the campaign limit are shown to roles that may read money
  figures.")
- Buttons: "Switch on…" (closed) · "Switch off now" (open). Non-owner: both disabled, `title`: "Only an owner account
  (ADMIN) can switch marketing SMS on or off."
- Switch-on dialog (kit `ConfirmModal`, medium tier, focus on Cancel): title "Switch on marketing SMS?" · body "For how long:
  [2 hours ▾]. While it is on, any campaign that has been started sends, and every test send costs real SMS credit. It
  switches itself off at 14:30 EAT." · buttons "Cancel" / "Switch on".
- Switch-off dialog: title "Switch off marketing SMS now?" · body "Campaigns that are sending pause at their next step.
  Messages already handed to the network are not recalled." · "Cancel" / "Switch off".
- Results: "Marketing SMS are on until 14:30 EAT." · "Marketing SMS are off." · "It was already off." · refusals:
  "Choose how long it stays on — between 30 minutes and 24 hours." · "This server has no database, so the switch can't be
  stored (local development) — it stays off." · "The switch couldn't be saved — it stays off. Try again." · "The switch
  was saved but didn't read back as on — it stays off. Try again." · "Its record couldn't be written, so the switch was put
  back off. Try again." · "The switch didn't read back as off — try again, and if it repeats tell the developer at once."

*Tab "Marketing SMS" — the form:*
- Fields (labels, hints): "Price per SMS (TZS)" — "Used to estimate a campaign's cost until our own sends measure it.
  Measured now: TZS 6 from 7 delivered messages." (or "Not measured yet.") · "Kept for login and withdrawal codes (TZS)" —
  "Marketing stops before the SMS credit falls below this, so codes keep sending." · "Most one campaign may spend (TZS)" —
  "A campaign whose cost could pass this can't be confirmed." · "Send window starts" / "Send window ends" (EAT, quarter
  hours) — "50pick's own rule — no law sets these hours. If the Responsible Gambling page states hours, change its line on
  the Public policy lines tab too."
- Refusals (under each box): "Enter the price per SMS in TZS — from 1 to 1,000, at most two decimals." · "Enter the credit to
  keep for codes in TZS — at least 50 and at most 10,000,000." · "Enter a campaign limit from TZS 100 to TZS 10,000,000." ·
  "The window must start between 07:00 and 19:00, on the quarter hour." · "The window must end between 09:00 and 21:00, on
  the quarter hour." · "The window must be at least 2 hours long."
- Save: "Saved — campaigns use these from their next step." · stale: "These settings were changed by someone else since you
  opened the page — reload, then save again." · unreadable: "The saved settings couldn't be read in full, so nothing was
  saved — reload the page." · non-owner: form shown as text, "Only an owner account (ADMIN) can change these."

**Audit rows.** `marketing.live_switch_opened` (COMPLIANCE, actor = owner or null for ops; target `SystemConfig` /
`marketing.sms.live`; payload `{ closesAt, via, by?, reason? }`) · `marketing.live_switch_closed` (COMPLIANCE; `{ via,
openSince, by?, reason? }`) · `config.marketing_sms_settings_updated` (ADMIN; `{ before, after, changes }`). No phone
number, no free text beyond the screened `by`/`reason`.

**Tests** (`test:marketing-settings`, new, in `predeploy`).
- S1 the reader: absent, unreadable, a two-key row, a fourth key, a blank `enabledBy`, a non-instant, `closesAt` ≤
  `enabledAt`, `closesAt` > 24 h ahead, and an expired row each read CLOSED with their `why`; a well-formed row before
  `closesAt` reads open.
- S2 open writes exactly three keys, durations 30 min and 24 h accepted, 29 min and 24 h + 1 ms refused `bad_duration`,
  nothing written.
- S3 ⭐ open is verified: a `save` that silently writes nothing gives `not_open_after_save`; a `save` that throws gives
  `save_failed`; neither writes an audit row claiming "opened".
- S4 ⭐ fail closed on the record: an `audit` that throws after a good save closes the switch again (`remove` called, the
  read-back closed) and answers `audit_failed`.
- S5 close deletes and reads back; a `remove` that leaves the row → `still_open_after_close`; closing a closed switch →
  `already_closed`, no audit row.
- S6 the actions call `requireOwner` FIRST (decommented source: before any other `await`), and `saveMarketingSmsSettingsAction`
  too; `openMarketingLiveSwitchAction` reads only the duration from the form (a posted `enabledBy` is never read).
- S7 the writer population: `saveConfig*`/`deleteConfig` with `MARKETING_LIVE_SWITCH_KEY` appear only in `live-switch.ts`;
  `openMarketingLiveSwitch`/`closeMarketingLiveSwitch` are called only from `src/app/admin/system/actions.ts` and
  `scripts/ops/marketing-live-switch.mts`.
- S8 settings bounds: every boundary value accepted and its neighbour refused, with the field named; every problem at once;
  the reserve's minimum follows the platform floor.
- S9 the merge replaces the whole object (a partial post cannot leave a stale field); a stale `base` refused, nothing
  written; a row the reader cannot read in full refuses every save.
- S10 `estimate.ts` reads the price from the record and nowhere reads `SMS_PRICE_PER_SEGMENT_TZS` (decommented grep across
  `src/`).
- S11 the card's money line is absent for a role without `campaignMoneyVisible` (no "TZS" in the rendered props).
- S12 the ops script imports the two functions and nothing that writes SystemConfig itself; it refuses without a database.
- campaign-compose §18.6 (rewritten): the three-key reader is the one the test send reads (`liveSwitch: () =>
  readMarketingLiveSwitch()` unchanged); an expired switch refuses the test `live_sends_closed`.

**Red plants** (in-process): R-S1 a two-key row reads open · R-S1b an expired row reads open · R-S3 open trusts the save
without a read-back · R-S4 the audit failure leaves the switch open · R-S5 close reports success without a read-back ·
R-S6 the action skips `requireOwner` · R-S7 a second writer of the key in another src file · R-S8 the window's 2-hour rule
removed · R-S10 the env read restored · R-S11 the money line rendered for every role.

**Drive** (`qa:marketing-settings`, local `next dev` on localhost after `rm -rf .next`, memory store,
`DISABLE_ADMIN_TOTP=true`): owner and a COMPLIANCE (ops, non-owner) viewer at 1280 and 360; closed, the switch-on dialog
(focus on Cancel), the no-database refusal (memory store — the honest local state), the settings form with every refusal
shown at once, a save, a stale save; viewport tiles opened and read. The open state is photographed through an injected
reader in the dev seed (dev-only), never by faking production.

**Risks.** The ops door is a second door: pinned by S7 and audited; it needs production credentials only the operator holds.
A forgotten open now closes itself (the point of E13). The card above the rail lengthens the page — it is two lines when
closed.

**Owner decisions (default built).** The default closing time (2 h) and the maximum (24 h) — Q2. The three money defaults —
Q1. Whether the window is editable at all — built editable within 07:00–21:00 (Q3).

---

### 4.4 · U38b · The audience card

**Kind:** visual + the campaign door · **Hours:** 9–15 · **Review:** yes (D19, a masked oracle) · **Set:** B, after U37c.

**Premises checked.** The split door `audienceSplit(f, { viewerReads })` (`audience-split.ts:379-402`): role rule first,
single-flight per key, ≤ 2 per process, 10 s budget, five buckets with protected as ONE line, a sample of five with no
detail for a masked viewer (`:186-189`). The composer's audience is text only today (`composer-client.tsx:550-…`) and is
read from the address in the BOOK vocabulary (`composer-loader.ts:135-187`; F14). The save re-parses the address with the
book parser (`campaign-draft.ts:164-196`). `urlExpressible` is false for any population (`audience.ts:656-660`), so
`contactAudienceParams` returns null for one. `populationProblem` refuses book-only axes beside a population
(`audience.ts:497-501`). U20's column says "Reachable" for the gate's yes (`contacts/page.tsx:130`, `:347`). U36's list
shows no audience words yet (M8).

**Decisions.**
1. **The campaign door takes a population in the address:** a new key `pop` (`book` · `players` · `both`), read ONLY by
   `parseCampaignAudienceParams(sp, now)` (U24's parser for the other keys, then `pop`, then `populationProblem`) and
   written only by `campaignAudienceParams(f)`. `CAMPAIGN_AUDIENCE_URL_KEYS = [...CONTACT_AUDIENCE_URL_KEYS, "pop"]`. The
   contacts page never reads `pop` (its door refuses a population, unchanged).
2. **Both campaign doors read a stored filter at the campaign scope:** `composer-loader.ts` and `campaign-draft.ts` call
   `parseContactAudienceJson(raw, "campaign")` and the address through `parseCampaignAudienceParams`; the save posts
   `CAMPAIGN_AUDIENCE_URL_KEYS`.
3. **"Who" is an explicit choice.** A new draft with no address filter computes nothing and says so; choosing "Contact book"
   writes `pop=book` (the filter's population stays null — one filter, one key). A saved draft always has a filter and is
   computed.
4. **The rail** (`data-filter-rail`, dense, declared in `ADMIN_SURFACES`): Who (Contact book · Player accounts · Both) ·
   Operator (by prefix) · Added/Joined (absolute EAT window, `defaultPreset="all"` — never a hidden "last 7 days") · List ·
   Tag (both hidden while Who is players or both — book-only axes) · for a reader only: Consent · Stop list · Source ·
   Player (book only, A1.1/OD54 unchanged). Every pill through the composer's own href builder, `replace` (a filter is not a
   navigation), the draft id kept.
5. **The card** = the words (`describeAudience`, role-shaped as today) + a `Suspense` keyed by `contactAudienceKey(filter)`
   (unkeyed, old numbers stay under a new sentence) around an async server component that calls `audienceSplit` and renders
   ONLY `audienceSplitView(split, viewerReads)` — one pure server view-model, no browser arithmetic.
6. **The figures** (neutral ink, OD40): "On this campaign" (matching — the number the confirmation asks you to type) ·
   "Will receive now (forecast)" · "Not receiving" · "Can't be sent to" (unsendable) and, when the budget ran out, "Not
   checked yet". The five reasons as `AdminBarList` rows, dominant first: "Stopped (on the stop list)" · "No consent or
   recorded basis" · "Withdrew consent" · "Age not confirmed" · "Protected (responsible gambling, age or account status)" —
   protected is ONE line for every role. `unanswered` joins Not receiving as "Couldn't be checked — checked again when
   sent".
7. **⛔ The D19 floor (E23):** `MASKED_BREAKDOWN_MIN = 10` in `campaign-status.ts`; for a viewer who may not read a number
   and `matching < 10`, the view-model carries `matching` only — no will-receive, no reasons, no sample — and says why. A
   reader always gets the full split (the sample's per-row detail stays reader-only, as shipped).
8. **One vocabulary:** U20's "Reachable" header and chip read "Will receive" (the gate's yes); the REACH refusal words
   are unchanged.
9. **M8:** each row of `/admin/campaigns` gets its audience in words under the name — `describeAudience` of the stored
   filter at the campaign scope, role-shaped exactly as the composer does (a masked viewer gets the words only when the
   campaign door's role rule passes the filter with `ids: null`; otherwise "Audience hidden for your role").
10. Nothing here confirms, prices or sends. The permanent callout's day-one wording comes from the U33a track's surface copy
    (spec §7.6) once U33a-G lands; until then: "Every number is checked again at the moment its message is sent — a stop, a
    withdrawn consent, self-exclusion, a break, age and the account's status all refuse it then."

**Files.**

| Path | Action | What |
|---|---|---|
| `src/lib/server/marketing/audience.ts` | modify | `CAMPAIGN_AUDIENCE_URL_KEYS`, `parseCampaignAudienceParams`, `campaignAudienceParams`, `isUnfilteredCampaignAudience(f)` (every predicate null but `population`) |
| `src/app/admin/campaigns/new/composer-loader.ts` | modify | the campaign doors; `audience.chosen`; `carry` written with `campaignAudienceParams` |
| `src/lib/server/marketing/campaign-draft.ts` | modify | `audienceOf` reads the campaign doors |
| `src/app/admin/campaigns/new/actions.ts` | modify | posts `CAMPAIGN_AUDIENCE_URL_KEYS` |
| `src/app/admin/campaigns/new/audience-rail.tsx` | create | the server rail (FilterPills) |
| `src/app/admin/campaigns/new/audience-split-card.tsx` | create | async server component: split → view-model → figures, reasons, sample, "Counted at 14:03:22 · took 2.1 s", error with "Count again" |
| `src/app/admin/campaigns/new/audience-view-model.ts` | create | PURE `audienceSplitView(split, viewerReads)` — formatting and ordering only |
| `src/app/admin/campaigns/new/audience-copy.ts` | create | every sentence below |
| `src/app/admin/campaigns/new/composer-client.tsx` | modify | `ComposerAudience` hosts the rail and the keyed card (server children passed in) |
| `src/app/admin/campaigns/new/page.tsx`, `loading.tsx` | modify | mount; the ghost equals the real block |
| `src/lib/marketing/campaign-status.ts` | modify | `MASKED_BREAKDOWN_MIN`, `breakdownVisible(viewerReads, matching)` |
| `src/app/admin/campaigns/page.tsx`, `campaigns-loader.ts`, `campaigns-copy.ts` | modify | the audience line per row |
| `src/app/admin/contacts/page.tsx` | modify | "Reachable" → "Will receive" (header + chip) |
| `scripts/campaign-audience.test.mts` | modify | §B below |
| `scripts/filter-language.test.mts` | modify | the composer rail declared |
| `scripts/campaigns-page.test.mts`, `scripts/contacts-page.test.mts` | modify | the row words; the renamed label |
| `scripts/live/marketing-u38b-audience-drive.mjs` | create | `qa:marketing-audience` |

**APIs.**

```ts
export const CAMPAIGN_AUDIENCE_URL_KEYS: readonly [...typeof CONTACT_AUDIENCE_URL_KEYS, "pop"];
export function parseCampaignAudienceParams(sp: Record<string, string | string[] | undefined>, now?: number): AudienceParse;
export function campaignAudienceParams(f: ContactAudienceFilter): Record<string, string> | null; // null only for ids / sub-minute bounds
export function isUnfilteredCampaignAudience(f: ContactAudienceFilter): boolean;

// audience-view-model.ts (pure)
export type AudienceSplitView =
  | { kind: "full"; filterKey: string; onCampaign: string; willReceive: string /* "≥ 1,204" when unchecked > 0 */; notReceiving: string;
      unsendable: string; unchecked: string | null; reasons: Array<{ label: string; count: string; n: number }>;
      sample: AudienceSampleRow[]; countedAt: string; tookSeconds: string }
  | { kind: "floor"; filterKey: string; onCampaign: string; sentence: string }; // masked and matching < 10
export function audienceSplitView(split: AudienceSplit, viewerReads: boolean): AudienceSplitView;
```

**States and sentences** (`audience-copy.ts`).
- Loading: the ghost (rail + four tiles + five sample rows), delta 0.
- Not chosen: "Choose who receives it — the counts appear once you choose."
- Computing (the keyed fallback): "Counting who will receive it…"
- Filtered: the figures; footer "Counted at 14:03:22 EAT · took 2.1 s. Every number is checked again when it is sent."
- Unchecked: "≥ 1,204 will receive — the rest weren't checked in time; every number is checked again when it is sent."
- Floor (masked, < 10): "Fewer than 10 people match, so the breakdown is hidden for your role. The count is checked again
  when you confirm."
- Empty: "Nobody matches this audience." (the rail kept, real zeros)
- Refused filter: the parser's own sentence (e.g. `POPULATION_BOOK_ONLY_REASON`), with "Remove the filter" when the
  address is what is refused (today's `clearHref`).
- Error: "Couldn't count this audience — nothing is wrong with the campaign." + "Count again" (the same address).
- Row words on the list: the `describeAudience` lines; hidden: "Audience hidden for your role."

**Audit rows.** None (reads only; the split never writes — U38a's guarantee).

**Tests** (`test:campaign-audience` §B, extending the existing in-process suite).
- B1 `pop` parsed only at the campaign door; the contacts door refuses it by name; `campaignAudienceParams(parse(x))`
  round-trips for book/players/both with operator and window.
- B2 ⭐ a population saved through the composer is read back by BOTH campaign doors (no "unreadable"); the book door still
  refuses it.
- B3 book-only axes beside `pop=players|both` refused with `POPULATION_BOOK_ONLY_REASON`; the rail hides List and Tag then.
- B4 the card's figures are exactly the view-model's (structural: `audience-split-card.tsx` renders only view-model fields;
  no `+`, `-` arithmetic on figures in any `.tsx` under `campaigns/new`).
- B5 ⭐ the Suspense is keyed by `contactAudienceKey(filter)` (source check) — the shipped U38 red "key removed".
- B6 ⭐ D19 floor: a masked viewer with 1, 5 and 9 matching gets `kind: "floor"` (no willReceive, no reasons, no sample);
  10 gets the full view; a reader always gets full.
- B7 not chosen computes nothing (the split door is not called — a spy).
- B8 the list row's words are role-shaped: a masked viewer never gets a consent/source/player/search phrase.
- B9 contacts page: the gate's yes reads "Will receive"; "Reachable" appears nowhere in `src/app/admin`.
**Red plants:** R-B2 the composer reads the stored filter at the book door · R-B5 the key removed · R-B6 the floor removed for
masked viewers · R-B6b the floor applied to readers (over-hiding is caught too) · R-B7 the split computed for an unchosen new
draft · R-B8 a masked row describing a consent axis.
**Drive** (`qa:marketing-audience`): GROWTH (masked) and ADMIN (reader) at 1280 and 360, reduced motion: not chosen,
computing (dev read delay), filtered with every bucket (dev seed), the floor (masked, a 3-person list), empty, refused,
error (dev fault), the list rows with words. Tiles opened and read.
**Schema / deploy:** none; an ordinary push. A draft saved by the new composer with `pop` set is read by the old build (60 s
overlap) at the book door as "unreadable" — the safe state U38a designed.
**Risks.** The split costs up to 10 s per new filter key on a big audience (2 per process; the pool is shared with bets —
U38a's limits hold). The floor is a raised bar, not proof against differencing two large filters (recorded, R3 of the U33a
spec).
**Owner decision:** none (the floor of 10 is a technical call, E23).

---

### 4.5 · U40a · The confirmation — server

**Kind:** guard + engine · **Hours:** 7–11 · **Review:** yes · **Depends:** U38b, U49s.

**Premises checked.** P6 (the confirm is a `transition` with every confirm key — `estimateTzs` may be null, `budgetTzs`
may be set), P10 (the pure rule), P11 (the estimate arithmetic, money decider), the HMAC precedent `journey-preview.ts:71`
(`kp-preview:` keyed from the session secret through `crypto.ts`), `withLock`'s 30 s timeout (`locks.ts`) — so the recount
runs OUTSIDE any lock (OD21). `test:campaign-gates` does not exist.

**Decisions.**
1. **The fence** (`audience-fence.ts`): `campaignAudienceCount(filter)` (X9) and, when the count is 1–5 and the audience is
   filtered (`!isUnfilteredCampaignAudience`), the first 6 keys of `walkCampaignAudience` → `canonicalMembers` →
   `membersKeyOf` = first 32 hex of HMAC-SHA256(session secret, `"kp-audience-members:" + canonical`) — KEYED, never a bare
   digest. The browser holds a signed claim `aw1.<b64url(json)>.<HMAC("kp-audience-fence:" + json)>`, verified in constant
   time; it is never stored (X13).
2. **The service** (`campaign-confirm-service.ts`) runs, in order: find (DRAFT) → fresh fence → `decideConfirm` → E18 the
   source line (population null or both and `sourcePhrase` blank → refuse `needs_source_line`) → the estimate freeze
   (`savedVariantSizes` × fresh count; price = the measured price when U39a's walk has one, else the settings' price) →
   E15 the limit (`estimateTzs > campaignLimitTzs` → `over_limit`; a null price → `price_unknown`) → ONE
   `transition(DRAFT → CONFIRMED, draftRevision)` writing `audienceCount`, `confirmTier`, `audienceWatermark`,
   `estimateSegments`, `estimateTzs`, `budgetTzs = campaignLimitTzs`, `confirmedBy`, `confirmedAt` → a null result →
   `confirmWriteRefusal(reread)`.
3. **U41's guard lives here** (G7.1).
4. **Refusals beyond the pure table** live in the service, with money-aware sentences (TZS only for
   `campaignMoneyVisible`).

**Files.**

| Path | Action | What |
|---|---|---|
| `src/lib/server/marketing/audience-fence.ts` | create | `membersKeyOf`, `signFence`, `verifyFence`, `audienceFence` (no `db.` token — it counts through `audience.ts` only) |
| `src/lib/server/marketing/campaign-confirm-service.ts` | create | `campaignConfirmView`, `confirmCampaign`, `CONFIRM_SERVICE_COPY`, injectable `CONFIRM_DEPS` |
| `scripts/campaign-gates.test.mts` | create | `test:campaign-gates` + `--prove-red` |
| `package.json` | modify | keys + predeploy (after `test:campaign-confirm`) |
| `scripts/client-graph-safe.test.mjs` | — | unchanged (both new files are server-only; G6.2 holds the boundary) |

**APIs.**

```ts
export function membersKeyOf(canonical: string): string; // 32 lowercase hex
export function signFence(f: FenceClaim): string;
export function verifyFence(token: string | null | undefined): FenceClaim | null;
export async function audienceFence(c: Pick<StoredSmsCampaign, "id" | "draftRevision" | "audienceFilter">, deps?: FenceDeps):
  Promise<{ claim: FenceClaim; countedAt: string }>;

export type CampaignConfirmView = {
  campaignId: string; watermark: string; tier: ConfirmTier; count: number; countedAt: string;
  describe: string[]; split: AudienceSplitView | null; // U38b's view-model (null when the split failed — never zeros)
  sample: Array<{ masked: string; operator: string | null }>; // enumerate tier: everyone (≤ 5); typed: ≤ 5 in walk order
  estimate: { segments: number; perRecipient: number; money: null | { costTzs: number | null; limitTzs: number; priceKind: "measured" | "configured" } };
  blocked: null | "not_draft" | "audience_empty" | "no_body" | "needs_source_line" | "over_limit" | "price_unknown" | "unsaved";
};
export async function campaignConfirmView(campaignId: string, viewer: { reads: boolean; money: boolean }, deps?: ConfirmDeps): Promise<CampaignConfirmView | null>;

export type ConfirmCampaignInput = { campaignId: string; typed: string | null; watermark: string | null; actorId: string }; // ⛔ no count
export type ConfirmServiceRefusal = "needs_source_line" | "over_limit" | "price_unknown";
export type ConfirmCampaignResult =
  | { ok: true; count: number; tier: ConfirmTier }
  | { ok: false; reason: ConfirmOutcomeReason | ConfirmServiceRefusal; freshCount: number | null; message: string };
export async function confirmCampaign(input: ConfirmCampaignInput, viewer: { money: boolean }, deps?: ConfirmDeps): Promise<ConfirmCampaignResult>;
```

**Sentences** (beyond `CONFIRM_REFUSAL_COPY`, which stays the one table for the pure reasons).
- `needs_source_line`: "This audience can include people from the contact book, so the message must carry its source
  line — and this campaign has none yet. The owner sets it on Admin → System → Marketing wordings; then save this draft
  again. Nothing was confirmed."
- `over_limit` (money reader): "This campaign could cost up to TZS 12,060 — more than the TZS 10,000 one campaign may spend.
  Narrow the audience, or the owner raises the limit on Admin → System → Marketing SMS. Nothing was confirmed."
- `over_limit` (other roles): "This campaign could cost more than one campaign may spend. Narrow the audience, or ask the
  owner to raise the limit. Nothing was confirmed."
- `price_unknown`: "The price per SMS isn't known, so this campaign's cost can't be checked against its limit. The owner
  sets it on Admin → System → Marketing SMS. Nothing was confirmed."

**Audit rows.** `marketing.campaign_confirmed` (COMPLIANCE, actor = officer, target `SmsCampaign`; `{ tier, count,
describe (auditContactAudience), draftRevision, estimateSegments, budgetSet: true }` — money figures only as numbers, no
number of a person) · `marketing.campaign_confirm_refused` (COMPLIANCE; `{ reason, shownCount, freshCount, tier }`).

**Tests** (`test:campaign-gates`, new). The U40.md assertions 1.1–6.8 carry over with these changes: 6.6 becomes "the
confirm keys have exactly one src writer — the `transition(… to: "CONFIRMED" …)` call in `campaign-confirm-service.ts`";
4.15 also asserts no `SmsCampaignRecipient` row and no token appear; the fence counts through `campaignAudienceCount` (4.16,
X9). New:
- G5.1 ⭐ `needs_source_line` for population book and both with a blank phrase; players-only confirms with none.
- G5.2 ⭐ the limit: a population whose estimate is TZS 10,002 at price 6 refuses `over_limit`, 9,996 confirms with
  `budgetTzs` 10,000; the estimate frozen equals population × saved segments × price (X15).
- G5.3 a GROWTH viewer's refusal and view carry no "TZS".
- G5.4 a measured price wins over the configured one in the freeze.
- G7.1 ⭐ U41: no file under `src/lib/server/marketing/` or `src/app/admin/campaigns/` calls `twoOfficerGate(` or names a
  second approver; `test:two-admin` is in predeploy.
**Red plants:** the U40.md R1–R13 (posted count trusted, shown count frozen, members unchecked, unfiltered ignored,
unconditional confirm, a bare sha256 members key, the fence counting the book only, TZS for GROWTH) + R-G5.1 the source-line
check removed · R-G5.2 the limit check removed · R-G5.2b `budgetTzs` frozen as null · R-G7.1 the service calls
`twoOfficerGate`.

**Schema / deploy:** none (U35b shipped every confirm column and the CONFIRMED status). An ordinary push; it ships with
U40b only if the action file would otherwise be an orphan (X16) — U40a adds NO `*Action`, so it ships alone.
**Drive:** none of its own (no screen) — U40b's drive exercises it.
**Risks.** The audience churns during typing (OD27 working); the modal remounts with the new number. `SESSION_SECRET`
rotation between confirm and Start changes the members key — an enumerated campaign's Start then refuses (fail safe; the
guide says so).
**Owner decision:** none here — the limit's value is Q1.

---

### 4.6 · U40b · The confirmation — UI

**Kind:** visual · **Hours:** 6–10 · **Review:** yes (it is the authorisation) · **Depends:** U40a.

**Premises checked.** `ConfirmModal`'s tiers, `initialFocus={isHard ? inputRef : cancelRef}` (`modal.tsx`, U40.md's
premises), no `inputMode` on the typed input, `test:orphan-actions` (an action ships with its caller, X16), the composer's
cards and `readOnly` for a non-draft (`composer-loader.ts:235`).

**Decisions.**
1. A fourth card on the composer, "Confirm", under the Test card: the trigger "Confirm audience…", disabled with its reason
   in `title` (never hidden): "Save first — confirming freezes the saved message." (unsaved edits) · "Nobody matches this
   audience yet." · "Write the Swahili message first." · "This campaign is already confirmed." · the service's blocked
   sentences.
2. The trigger refreshes, then opens (fresh figures, U40.md). Enumerate tier (≤ 5, filtered): medium tier, every person as a
   masked number + operator (no player flag, D19). Typed tier: hard tier `typedWord = confirmTypedWord(count)` with the new
   additive `typedInputMode: "numeric"`.
3. The modal shows the estimate: segments for every role ("Up to 1,604 SMS — one per person"), money only for a money
   reader ("Up to TZS 9,624 · limit TZS 10,000 · price TZS 6 per SMS, configured, not yet measured").
4. After success: a toast "Audience confirmed — 1,604 people. Nothing has been sent." and the composer re-renders read-only
   with "Confirmed — nothing has been sent. Start it from its own page." linking to `/admin/campaigns/[id]` once
   `CAMPAIGN_SCREENS.detail` is true (U47b); until then the line ends "Starting a campaign comes next in this release."
5. The honesty line in the modal: "Confirming freezes this message and this audience. Nothing is sent until someone presses
   Start on the campaign's page."

**Files.** `src/app/admin/campaigns/new/campaign-confirm.tsx` (create, client), `src/app/admin/campaigns/new/confirm-actions.ts`
(create, `"use server"` — `confirmCampaignAction(formData)` with `softRequireStaff("growth", "marketing.campaign.confirm", …)`
first), `src/components/ui/modal.tsx` (modify — additive `typedInputMode?: "numeric"` on the hard branch only; the
`initialFocus` line byte-identical), `src/app/admin/campaigns/new/page.tsx` + `loading.tsx` (the card and its ghost),
`composer-copy.ts` (the sentences), `scripts/campaign-gates.test.mts` (§UI), `scripts/live/marketing-u40-confirm-drive.mjs`
(`qa:marketing-confirm`).

**States** (U40.md's list holds): loading · idle · blocked (reason in `title`) · counting · enumerate open (focus Cancel) ·
typed open (focus input, numeric keypad at 360) · typed armed · confirming (scrim/Esc refused) · refused `audience_moved`
(remount with the new number) · refused other (one sentence each) · confirmed (toast, read-only composer) · error ("Couldn't
confirm — nothing was confirmed. Try again." with the typed text kept) · reduced motion.

**Tests** (`test:campaign-gates` §UI): 6.4 (modal focus line pinned; keyed remount `${watermark}:${attempt}`), the action's
guard is its first statement and its domain is `domainForPath("/admin/campaigns")`, the action file has exactly one
`*Action` and the card imports it (no orphan), `typedInputMode` is additive (every existing `ConfirmModal` caller compiles
unchanged), no `TZS` in a GROWTH render. **Plants:** focus on Confirm; the remount key removed; the action's guard moved
below the service call; `typedInputMode` given to the medium tier.
**Drive** (`qa:marketing-confirm`): enumerate (3), typed (45), the moved audience (dev churn), a stale draft, the source-line
block, the limit block (money reader and GROWTH), confirmed; 1280 · 360 · reduced motion; `document.activeElement` never
the Confirm button on open or after a refusal; tiles read.
**Schema / deploy:** none. **Audit rows:** U40a's (`marketing.campaign_confirmed` / `_confirm_refused`).
**Risks.** The remount replays the dialog entrance (motion must be perfect — screenshot it; the fallback is an additive
`armKey` that clears without a remount). `modal.tsx` is shared: `test:design-frozen`, `test:popup-fit` and `test:red-anchors`
run before and after.
**Owner decision:** none.

---

### 4.7 · U16a · Erasure, the access export and retention reach the campaign stores

**Kind:** data · **Hours:** 7–11 · **Review:** yes (personal data) · **Set:** C · **Ships before U42 (M9).**

**Premises checked.** `eraseMarketingFor` empties book rows, withdraws consent and deletes staged rows by number
(`erase.ts:83-165`); `marketingDsarView` is the ONE allowlisted marketing section for both export doors, bounded to the
account's creation (`dsar.ts:57-105`); DATA-RETENTION's campaign row is owed (P20); `/admin/retention` publishes a SCHEDULE
array (`src/app/admin/retention/page.tsx:38-…`), whose marketing row admits the tokens sit outside it (`:56-63`);
`MarketingOptOutToken` is never deleted and indexed on `identifier`; `SmsCampaignRecipient` has `@@index([msisdn])` and
`@@index([userId])`; `red:erasure` and `red:retention` are FILE-MUTATING harnesses with anchors (`erasure-red.mjs`,
`retention-red.mjs`).

**Decisions.**
1. **Erasure keeps the record that we messaged a number and drops which account held it:** for the erased account,
   `smsCampaignRecipient.unlinkUser(userId)` sets `userId` to null on every row linked to it. `msisdn`, the status, the stamps
   and the gate trail stay — they are the record GN 478T reg 51(1) asks for. Nothing is deleted.
2. **A pending row of a live campaign is not rewritten at erasure:** the gate refuses the number at send time (the erasure's
   WITHDRAWN row, or no basis for a tombstone — U18b/S9), which the suite EXECUTES (P5 below).
3. **Opt-out tokens are kept** (a link the person may still hold; it can only stop or restart marketing for that number);
   E1 means a token exists only for a number we actually messaged (or tested).
4. **The access export gains two sections** in `marketingDsarView`, from the account's creation, over the same `numbers`
   set: `campaignMessages: [{ sentAt | null, status (in words), message (the campaign's body for the variant sent, with
   {jina} as written), deliveredAt | null }]` — rows that reached the wire (SENT, DELIVERED, UNCONFIRMED, FAILED with a
   reference) and `notSent: [{ campaignAt, reason (the five-bucket words) }]` for SKIPPED rows; and `optOutLinks: [{ ref
   (optOutTokenRef — first characters then ***), createdAt }]`. Withheld: campaign and recipient ids, the officer, the
   gate trail's details, the live token.
5. **Retention (policy, nothing purges before 2033):** campaigns and recipients — 7 years from the campaign's finish (or
   its last recipient write), GN 478T reg 51(1) and §5.8; opt-out tokens — kept while any record of a message that carried
   them is kept (7 years after the last such message), then deletable. A row each in DATA-RETENTION and in the
   `/admin/retention` SCHEDULE, with the same words; the marketing row's "tokens sit outside" note removed.
6. **The new assertions live in a NEW in-process suite** `test:campaign-privacy` (no new anchors in the file-mutating
   harnesses); `test:erasure` keeps running unchanged (its file is modified, so it re-runs).
7. **Owed to U16b, recorded:** deleting an erased book row's `ContactListMember` rows (U33a-L R9), `SmsMessage`'s own
   retention row and erasure reach, the 730-day lapse's ledger row.

**Files.**

| Path | Action | What |
|---|---|---|
| `src/lib/server/store.ts`, `src/lib/server/prisma-dal.ts` | modify | `smsCampaignRecipient.listByMsisdn(msisdn, sinceIso)` (newest first, ≤ 500) and `unlinkUser(userId): number` — named types |
| `src/lib/server/marketing/erase.ts` | modify | step 4: `unlinkUser`; counts gain `campaignRecipientsUnlinked` |
| `src/lib/server/marketing/dsar.ts` | modify | the two sections through the allowlist; `marketingDsarView` reads the campaign body per row (one `smsCampaign.find` per distinct campaign) |
| `src/app/admin/retention/page.tsx` | modify | two SCHEDULE rows; the marketing row's note |
| `docs/DATA-RETENTION.md` | modify | row 48 rewritten; the token row; erasure and export described |
| `scripts/campaign-privacy.test.mts` | create | `test:campaign-privacy` + `--prove-red` |
| `scripts/dal-parity.test.mts` (+ anchors) | modify | §26 · the two members in both twins |
| `package.json` | modify | keys + predeploy (after `test:erasure`) |

**APIs.**

```ts
// both twins
listByMsisdn: (msisdn: string, sinceIso: string) => Promise<StoredSmsCampaignRecipient[]> | StoredSmsCampaignRecipient[];
unlinkUser: (userId: string) => Promise<number> | number;
// dsar.ts
export type MarketingDsarSection = { /* existing */ ;
  campaignMessages: Array<{ sentAt: string | null; status: "handed over" | "delivered" | "no answer from the network" | "not delivered"; message: string; deliveredAt: string | null }>;
  notSent: Array<{ at: string; reason: string }>;
  optOutLinks: Array<{ ref: string; createdAt: string }>;
};
```

**Tests** (`test:campaign-privacy`, in-process).
- P1 ⭐ erasure unlinks every recipient row of the account (userId null) and deletes none; the counts say how many.
- P2 a recipient row linked to ANOTHER account at the same number is untouched.
- P3 ⭐ the export carries the person's handed-over messages since the account's creation, with the variant's body, and
  NOT a previous holder's rows at the same number (dated before the account).
- P4 the export never carries a recipient id, a campaign id, an officer id, the gate trail or a live token (JSON scan; the
  token's ref shape `^[A-Z2-9]{n}\*+$`).
- P5 ⭐ an erased number with a PENDING row in a RUNNING campaign is refused at send: `dispatchSlice` over it gives `skipped`
  (consent_withdrawn or no_consent/no_basis), no wire call.
- P6 the retention page's SCHEDULE and DATA-RETENTION name the same two classes with the same periods (text parity).
- P7 erasure is idempotent (run twice: second run unlinks 0).
**Red plants:** R-P1 `unlinkUser` skipped · R-P1b recipient rows deleted at erasure · R-P3 the export without the date bound
· R-P4 the live token exported · R-P6 the page row's period changed alone.
**dal-parity §26:** both twins define both members, the Prisma `unlinkUser` is ONE `updateMany` setting only `userId: null`,
`listByMsisdn` orders `createdAt desc, id desc` with the bound in the WHERE; plants: a member in one twin only; `unlinkUser`
writing another column.
**Schema / deploy:** none (two read/write members on existing columns). ⛔ It must be LIVE before U42 ships (M9); prove it by
what reverses (the retention page serves the new rows).
**Audit rows:** none new — erasure already writes its own summary row; its payload gains `campaignRecipientsUnlinked`.
**Drive:** a short `qa:marketing-e2e-capture`-style read of `/admin/retention` at 1280 and 360 (the two new rows), tiles read.
**Risks.** The export now reads campaign bodies (staff-written text) into a person's file — they are the words that person was
sent, which is the point; staff-only campaign NAMES are not exported. Recorded: a campaign body is free text and could name a
third party — the composer refuses phone numbers in it, not names.
**Owner decision:** none new; the DSAR's wording is G10 (the sections are field lists, not public sentences).

---

### 4.8 · U13 · The send window, 08:00–20:00 EAT

**Kind:** engine · **Hours:** 4–7 · **Review:** yes (sending) · **Set:** C · **Depends:** U33a-G (dispatch.ts), U49s.

**Premises checked.** §9 U13's own rewrite note (prove open/closed at 07:59 · 08:00 · 19:59 · 20:00 · 03:00 and that
`dispatchSlice` holds every row and asks no gate outside); P18 (the RG control and K1); F9, F10; M12 (the test send obeys
the window); `EAT_OFFSET_MS` (`eat-day.ts:24`, EAT has no daylight saving).

**Decisions.**
1. `src/lib/marketing/window.ts` (pure, client-safe, pinned in `test:client-graph-safe`) is CREATED here — never earlier
   (creating it flips the RG control, D5): it re-exports `SEND_WINDOW_EAT` from `sms-settings.ts` (the one constant, OQ5)
   and adds `sendWindowState(nowMs, hours)`. The hours come from the settings record (E14), whose default IS
   `SEND_WINDOW_EAT`.
2. `dispatchSlice` checks the window FIRST through `deps.window?: () => SendWindowState`, defaulting to
   `sendWindowState(Date.now(), marketingSmsSettings())`: closed → every row `held` reason `quiet_hours`, no gate asked, no
   send (E2c, E9).
3. The test send passes the window through its deps (`CampaignTestDeps.window`, default the real one); its `heldSentence`
   gains `quiet_hours`: "It's outside the send window (08:00–20:00 EAT), so no test can be sent now — try again at 08:00."
4. **Time-independence of the suites (F10):** every suite that drives `dispatchSlice` or `sendCampaignTest` injects an open
   window (`ALWAYS_OPEN`), and U13 adds the closed-window cases. The builder greps `dispatchSlice(` and
   `sendCampaignTest(` under `scripts/` and fixes every caller in this commit.
5. **The published promise (K1):** `test:rg-policy`'s late-night control is strengthened to "`window.ts` exists AND
   `dispatch.ts` imports it AND calls it" (a `World.dispatch` field, decommented); `KEPT_PROMISES.lateNight.kept` flips to
   `true` IN THE SAME COMMIT, its `promise`/`refuses`/`control` re-worded to the real window ("no marketing SMS outside the
   send window, 08:00–20:00 EAT"); the red case "the late-night bullet restored with no window in code" gets
   `windowExists: false` (it would otherwise miss); a new K1 plant: the map says kept while dispatch no longer calls the
   window. ⛔ No RG line is re-worded here — whether the public page states the window is an admin's save on the policy
   lines card (and Ali's word, Q3).
6. The composer's test card gains `windowNote` (said up front when the window is closed): "Outside the send window
   (08:00–20:00 EAT) — a test can be sent from 08:00."

**Files.** `src/lib/marketing/window.ts` (create), `src/lib/server/marketing/dispatch.ts` (modify),
`src/lib/server/marketing/campaign-test-send.ts` (modify: deps.window, the sentence),
`src/app/admin/campaigns/new/composer-loader.ts` + `composer-client.tsx` + `composer-copy.ts` (the note),
`src/lib/legal/kept-promises.ts` (flip), `scripts/rg-policy.test.mts` (control, world, plants),
`scripts/marketing-window.test.mts` (create), `scripts/marketing-consent.test.mts` (U9: inject open; W cases),
`scripts/campaign-compose.test.mts` (§18: inject open; the quiet-hours case), `scripts/client-graph-safe.test.mjs` (PIN),
`package.json`.

**APIs.**

```ts
export const SEND_WINDOW_EAT: Readonly<{ startMinute: 480; endMinute: 1200 }>;
export type SendWindowHours = { windowStartMinute: number; windowEndMinute: number };
export type SendWindowState = { open: boolean; opensAt: string; closesAt: string; label: string /* "08:00–20:00 EAT" */ };
export function sendWindowState(nowMs: number, hours?: SendWindowHours): SendWindowState;
// dispatch.ts — SliceDeps gains:
window?: () => SendWindowState;
```

**Tests** (`test:marketing-window`, new): W1 open/closed at 07:59:59 · 08:00:00 · 19:59:59 · 20:00:00 · 03:00 EAT for the
default and for a saved 09:00–18:00; W2 `opensAt` is today's start before it, tomorrow's after the end, never in the past;
W3 ⭐ outside the window `dispatchSlice` holds EVERY row `quiet_hours`, asks the gate ZERO times (a counting gate), calls the
wire zero times; W4 the test send outside → refused with the window sentence, no token minted, no SmsMessage row; W5 the
window is read once per slice (not per row). Plus rg-policy K1 green with the flip; the U9 contract green at any clock.
**Plants:** R-W1 an off-by-one at 20:00 (`<=`) · R-W3 the window asked after the gate · R-W3b `dispatch.ts` no longer calls
it (the rg-policy plant) · R-W4 the test send ignores `deps.window`.
**Schema / deploy:** none; an ordinary push. **Audit:** none new — a test refused outside the window writes the existing
masked `marketing.campaign_test` row with reason `held` and `{ held: "quiet_hours" }`.
**Drive:** `qa:marketing-compose` re-run with the window closed through a dev-only clock override (404 in production): the
test card's window note and the refusal sentence at 1280 and 360, tiles read.
**Risks.** A suite run at night that was not given the open window (W-cases and the grep catch it).
**Owner decision:** whether the public RG page states the window (Q3; built: not stated, the code keeps it either way).

---

### 4.9 · U42 · Enqueue — the recipient rows over the ONE walk

**Kind:** engine · **Hours:** 6–10 · **Review:** yes · **Set:** C · **Depends:** U16a DEPLOYED (M9), U40a.

**Premises checked.** P5, P7, P9, P13 (no token minting here — E1), `SMS_CAMPAIGN_SEED_CHUNK_MAX` = 1000
(`campaign-model.ts:419`), `CAMPAIGN_WALK_MAX` = 1000 (`audience.ts:860`, `:1010`), the book walk returns `b:<last>` when
the book is exhausted and the players are next, then an empty page moves to the players (`audience.ts:1070-1084`),
`assertSeeds` refuses a whole batch for one bad key (`campaign-model.ts:431-454`).

**Decisions.**
1. **One step = one chunk:** `enqueueStep(campaignId)` walks ≤ 1,000 rows from `enqueueCursor`, turns each into a seed,
   writes them with `createMany` (duplicates skipped on the unique key — restart-safe), then advances the cursor with ONE
   conditional `transition(from: ["PREPARING"], to: null, patch: { enqueueCursor })`. A Pause landing between the write
   and the cursor leaves the cursor behind; the next step re-walks the page and writes nothing new.
2. **A number that does not parse is not seeded** (it would refuse the whole batch): counted `unusable` and reported in
   the enqueue audit row. Keys come from `parseTzNumber(row.msisdn).msisdn` (the gate's key).
3. **The seed:** `id = "rcp_" + ledgerStamp().id` (E21), `contactId` (book rows), `userId` (player rows, and a book row's
   `linkedUserId` — a link, set null on erasure), `optOutToken: null` (E1), `createdAt`.
4. **The cap (E19):** before writing, the rows already on the campaign (`countByStatus` sum) + this chunk may not exceed
   `audienceCount`; the excess is not written and is reported as `overflow`, and the enqueue finishes. For an ENUMERATE
   confirmation the step also re-derives the keyed members key over the rows it is about to write (≤ 5); if it differs from
   `audienceWatermark` (a change in the moments after Start's check), it writes nothing and pauses the campaign
   `audience_moved` (sentence: "Paused — the people on this campaign changed after it was started. Nothing was sent. Stop it
   and confirm a new copy.").
5. **Finish:** when the walk says `done` or the cap is reached → `transition(PREPARING → RUNNING, { enqueuedAt, enqueueCursor:
   "done" })` + audit `marketing.campaign_enqueued`.
6. **Backstop:** 200,000 rows written ends the enqueue with the rest reported (never silently truncated).
7. **An unreadable stored audience** pauses the campaign `audience_unreadable` (never "start again", never "done").
8. OD28's first check is NOT here — it runs at Start (U49a, E19); this step is the continuous cap.

**Files.** `src/lib/server/marketing/enqueue.ts` (create), `scripts/marketing-engine.test.mts` (create — §E; U43b and U49a
add sections), `package.json` (`test:marketing-engine` + `red:marketing-engine`, predeploy after `test:campaign-gates`),
`src/lib/marketing/campaign-status.ts` (the `audience_unreadable` sentence).

**APIs.**

```ts
export const ENQUEUE_CHUNK = 1000;
export const ENQUEUE_BACKSTOP = 200_000;
export type EnqueueStepResult =
  | { kind: "wrote"; inserted: number; duplicates: number; unusable: number; next: string }
  | { kind: "done"; total: number; unusable: number; overflow: number }
  | { kind: "paused"; reason: "audience_unreadable" | "audience_moved" }
  | { kind: "not_preparing"; status: SmsCampaignStatus };
export type EnqueueDeps = {
  campaigns: { find(id: string): Promise<StoredSmsCampaign | null>; transition(id: string, t: SmsCampaignTransition): Promise<StoredSmsCampaign | null> };
  recipients: { createMany(s: SmsCampaignRecipientSeed[]): Promise<SmsCampaignRecipientInsert>; countByStatus(id: string): Promise<SmsCampaignRecipientCount[]> };
  walk: typeof walkCampaignAudience; membersKeyOf: typeof membersKeyOf; audit: AuditFn; now: () => Date; newId: () => string;
};
export async function enqueueStep(campaignId: string, deps?: EnqueueDeps): Promise<EnqueueStepResult>;
```

**Audit rows.** `marketing.campaign_enqueued` (SYSTEM, actor null; `{ rows, duplicates, unusable, overflow, backstop: bool }`)
· `marketing.campaign_paused` (SYSTEM; `{ reason }`) on an unreadable audience.

**Tests** (`test:marketing-engine` §E).
- E1 ⭐ restart mid-walk: run steps until 3 of 5 chunks, simulate a crash between `createMany` and the cursor (a transition
  dep that throws once), resume → every person exactly once (no duplicate, no skipped row) — the plan's RED.
- E2 1,000 seeds then the same 1,000 shuffled + 200 new → 1,200 rows (the U35 Accept, through the walk).
- E3 ⭐ the cap: confirmed 7, the walk yields 8 → 7 rows, `overflow` 1 in the audit row; the campaign goes RUNNING.
- E4 an unusable number is not seeded and does not refuse the batch; counted.
- E5 no token is minted (the token table is unchanged) and every seed's `optOutToken` is null.
- E6 a Pause between steps: the step answers `not_preparing` and writes nothing.
- E7 ⭐ the enqueued row count equals the confirmed count for a fixture with book ∪ players and a number held by both (X9,
  the U40 risk "the single most dangerous seam").
- E8 ids sort in walk order (E21).
- E9 an unreadable stored audience pauses with `audience_unreadable`.
**Plants:** R-E1 the cursor advanced before `createMany` · R-E1b `skipDuplicates` removed (via an injected recipient dep
that inserts duplicates — the memory twin's index plant lives in dal-parity) · R-E3 the cap removed · R-E4 a bad key seeded
(the batch refused whole) · R-E5 a token minted per seed.
**Schema / deploy:** none (the seed door and `transition` exist); an ordinary push, but only AFTER U16a is live (M9).
**Drive:** none of its own (no screen) — U47b's drive runs the enqueue through Start.
**Risks.** A 150k enqueue is ~150 steps of 1–3 s — acceptable with the page driving; U45 tunes it.
**Owner decision:** none.

---

### 4.10 · U43a · The recipient doors in both twins

**Kind:** data · **Hours:** 9–14 · **Review:** yes · **Depends:** U16a (DAL serial), U43-0 DEPLOYED.

**Premises checked.** P7; the twins' one-door pattern and named types (`store.ts:3799-…`, the `SmsDlrResult` naming rule
`store.ts:390-398`); `SmsMessage` has no read by target (`store.ts:3099-3148`: create, createMany, findByReference, update,
recordDlr, countSince, listRecent) but is indexed on `(targetType, targetId)` (`schema.prisma:3141`); the array-form
`$transaction` is READ COMMITTED (critic, `prisma-dal.ts:1418`); Postgres' conditional `updateMany` re-checks its WHERE
after a concurrent commit.

**Decisions.**
1. **`claim(campaignId, limit, token, nowIso)`:** the first `limit` rows with status PENDING and no claim, ordered by id;
   Prisma = `findMany` ids → ONE conditional `updateMany` (`status: "PENDING", claimToken: null`) → `findMany` by token (the
   won set is exactly readable); memory = one synchronous pass. Returns the won rows.
2. **`settle(patches)`:** each patch names its row, the claim it expects, and a target state; written only where
   `id = …, claimToken = …, status = PENDING`; Prisma = ONE `$transaction([...updateMany])`; returns
   `{ settled, lost: string[] }`. A lost patch (reaped, or a receipt got there first) is reported, never forced.
3. **The settle rule set** (`campaign-model.ts`, `assertSettle`) — one door, both twins call it first:

   ✅ **AS BUILT (U43a, S14 2026-10-07 — `SMS_RECIPIENT_SETTLE_KEYS`; this table replaced the planning one).** A patch
   carries EXACTLY its target's keys (plus `id`, `claimToken`, `to`): a missing key, or a key another status owns, is
   refused by name; no patch can write `userId`, `msisdn`, `contactId`, `costTzs` or `createdAt`.

   | Target | Keys — never null | Keys — may be null |
   |---|---|---|
   | `SENT` | `smsReference`, `sentAt`, `gateTrail` | `optOutToken`, `locale`, `segments`, `bodyLen` |
   | `SKIPPED` | `skipReason`, `skipDetail` (may be ""), `gateTrail` | — |
   | `FAILED` | `failureClass`, `failedAt`, `gateTrail` | `error`, `smsReference` (when the wire had it) |
   | `UNCONFIRMED` | `gateTrail` | `smsReference`, `optOutToken`, `locale`, `segments`, `bodyLen` |
   | `DELIVERED` (the reaper's, §3.2) | `smsReference`, `deliveredAt`, `gateTrail` | `sentAt`, `optOutToken`, `locale`, `segments`, `bodyLen` |
   | `HELD` | `failureClass`, `attempts` | — |
   | `PENDING` (release) | `attemptsDelta` — 0 or 1, required | — |

   A release clears `claimToken` and ⛔ KEEPS `claimedAt` (D15): a settled, held or released row keeps the instant of its
   last claim, so `lastActivity` never moves backwards while a page claims and releases, and `claimedAt` is never a "was
   it ever claimed" test. ⛔ A claim token is fresh for each claim (D16): a token any row already holds is refused before
   anything is written. `error`, `skipDetail` and a trail's `check`, `verdict` and `wording` are refused when
   `holdsPhoneRun` finds a number (§5.14) — U43b scrubs and trims them first (`store.ts`, DC-5); a trail's `source` is
   read piece by piece — the words that hold a letter taken out whole, a number between them refused in any spelling
   (the S14 review). `gateTrail` is 1 to 24 entries, each string ≤ 200 characters.
4. **`findStranded(campaignId, cutoffIso, limit)`**, **`requeueHeld(campaignId)`** (HELD → PENDING, attempts 0, the token
   and the hold's class cleared, `claimedAt` kept — D15; returns the count), **`lastActivity(campaignId)`** (the newest
   `claimedAt`, for "nobody is driving").
5. **`smsMessage.findByTargets(targetType, targetIds)`** — ≤ 200 ids, newest per target.
6. No raw SQL (no memory twin); no delete; no stored counter.

**Files.** `src/lib/server/store.ts`, `src/lib/server/prisma-dal.ts` (members + named types),
`src/lib/server/marketing/campaign-model.ts` (`assertSettle`, `SMS_RECIPIENT_SETTLE_KEYS`), `scripts/dal-parity.test.mts`
(+ `scripts/anchors/dal-parity.anchors.mjs`), `scripts/campaign-models.test.mts` (§2.12 execute the settle rules on the
memory twin), `scripts/live/campaign-engine-pg-probe.mts` (create) + `package.json` `db:probe-campaign-engine`. ✅ As
built: the cases are `test:campaign-models` §2.14–§2.27 (§2.12 and §2.13 were taken), and the Postgres proof is §10 of
`scripts/live/campaign-models-pg-probe.mts`, run by `npm run db:probe-campaign-models` — no new probe file or key.

**APIs.**

```ts
export type SmsCampaignRecipientSettle =
  | { id: string; claimToken: string; to: "SENT"; smsReference: string; sentAt: string; optOutToken: string; locale: MessagingLocale; segments: number; bodyLen: number; gateTrail: SmsCampaignGateTrail }
  | { id: string; claimToken: string; to: "SKIPPED"; skipReason: string; skipDetail: string; gateTrail: SmsCampaignGateTrail }
  | { id: string; claimToken: string; to: "FAILED"; failureClass: string; error: string | null; failedAt: string; smsReference: string | null; gateTrail: SmsCampaignGateTrail }
  | { id: string; claimToken: string; to: "UNCONFIRMED"; smsReference: string | null; optOutToken: string | null; locale: MessagingLocale | null; segments: number | null; bodyLen: number | null; gateTrail: SmsCampaignGateTrail }
  | { id: string; claimToken: string; to: "HELD"; failureClass: string; attempts: number }
  | { id: string; claimToken: string; to: "PENDING"; attemptsDelta: 0 | 1 };
export type SmsCampaignSettleResult = { settled: number; lost: string[] };
// smsCampaignRecipient (both twins)
claim(campaignId: string, limit: number, token: string, at: string): Promise<StoredSmsCampaignRecipient[]>;
settle(patches: SmsCampaignRecipientSettle[], at: string): Promise<SmsCampaignSettleResult>;
findStranded(campaignId: string, cutoff: string, limit: number): Promise<StoredSmsCampaignRecipient[]>;
requeueHeld(campaignId: string, at: string): Promise<number>;
lastActivity(campaignId: string): Promise<string | null>;
// smsMessage (both twins)
findByTargets(targetType: string, targetIds: readonly string[]): Promise<StoredSmsMessage[]>;
```

**Tests.** dal-parity §26 (both twins define each member; Prisma `claim` = findMany → conditional updateMany with BOTH
`status: "PENDING"` and `claimToken: null` → findMany by token; `settle` = ONE `$transaction` of conditional `updateMany`s
whose WHERE names `claimToken` and `status: "PENDING"`; `requeueHeld` only from HELD; `findByTargets` bounded; named types)
with plants: the claim's WHERE without `claimToken: null`; the settle's WHERE without `claimToken`; `settle` outside a
transaction; a member in one twin only. campaign-models §2.12: every row of the settle table refused/accepted on the memory
twin. **Probe** (`db:probe-campaign-engine`, every migration from empty): ⭐ five concurrent claimers over 1,000 rows on real
Postgres — 1,000 distinct rows won in total, no row twice; settle with a wrong token changes nothing; a reaped row's late
settle is `lost`; `attempts: { increment: 1 }` lands; the `UNCONFIRMED` value usable in a later transaction; `EXPLAIN` of
the claim at 150k rows recorded (U45's index decision).
**Schema / deploy:** none (every column exists); an ordinary push after U43-0 is live (the twins' unions already know
UNCONFIRMED). **Audit rows:** none (a data layer writes none). **Drive:** none (no screen).
**Risks.** The claim's sort at 150k (an index on `(campaignId, status, id)` is U45's, measured here first).
**Owner decision:** none.

---

### 4.11 · U43y · Money first — the one busy signal

**Kind:** guard (platform) · **Hours:** 3–6 (+ the whole predeploy chain once, machine time) · **Review:** yes (money
paths) · **Set:** C.

**Premises checked.** F3; P15. `lifecycle.ts:567` sets `running = true`, `:629` clears it; `runDepositPoll` guards with
`depositPolling` (`:671-688`); `market-scheduler.ts:81` `firesInFlight` module scope.

**Decisions.**
1. Two ONE-LINE mirrors, no behaviour change: `lifecycle.ts` writes `globalThis.__50PICK_MONEY_CHORES.lifecycleSince` (epoch
   ms, 0 when idle) where `running` flips, and `.depositsSince` where `depositPolling` flips; `market-scheduler.ts` writes
   `globalThis.__50PICK_MONEY_CHORES.marketFires` where `firesInFlight` changes.
2. `src/lib/server/money-busy.ts` (no import of lifecycle or the scheduler — it reads globalThis only):
   `moneyBusy(nowMs)` → `{ busy: false } | { busy: true; why: "bets_waiting" | "admission_full" | "lifecycle" | "deposits" |
   "market_fires" }` from `admissionSnapshot()` (queue > 0, or in-flight ≥ its ceiling) and the mirrors. A chore flag older
   than 10 minutes is ignored (a crashed pass must not block marketing for ever) and reported in the result as `stale`.
3. Because `lifecycle.ts` and `market-scheduler.ts` are money paths, this push runs the WHOLE predeploy chain once (policy:
   a platform-wide file), with the runner's exit codes captured correctly (§0 🔴 runner note).

**Files.** `src/lib/server/money-busy.ts` (create), `src/lib/server/lifecycle.ts` (modify, two lines + a comment),
`src/lib/server/market-scheduler.ts` (modify, one line + a comment), `scripts/marketing-engine.test.mts` §Y (or, if U42 has
not landed, a section in a new file folded later).

**Tests** (§Y): Y1 ⭐ two module instances (load `money-busy.ts` twice, as `test:rbac` §14 loads a second rbac) see the
same signal; Y2 each source alone makes it busy with its `why`; Y3 a flag older than 10 min is ignored; Y4 the mirrors are
written next to the existing flips (source order: set after `running = true`, cleared in the same `finally`). **Plants:**
the mirror written to a module `let` (Y1 fails) · the stale rule removed · the clear moved out of the `finally`.
**Schema / deploy:** none; the WHOLE predeploy chain once (money-path files). **Audit rows:** none. **Drive:** none.
**Risks.** A mirror left set by a pass that threw outside its `finally` would block marketing — the 10-minute stale rule
caps it. **Owner decision:** none.

---

### 4.12 · U49a · The credit kept for codes, and the refusal at Start

**Kind:** engine · **Hours:** 6–10 · **Review:** yes (money, codes) · **Depends:** U49s, U40a.

**Premises checked.** P2 (the floor, its re-check, the OTP exemption), `refreshSmsBalance` (`sms.ts:383`: fresh / reused /
pending / failed / unavailable, `stale`), `balanceFigureOf` (`estimate.ts:63`), `startAudienceVerdict` (P10),
`SmsFailureCode` (`sms.ts:518-526`), `test:sms-cost-guard` is in predeploy with an in-place red (`red-sms-cost-guard.mjs`).

**Decisions.**
1. **`sendBatch(messages, opts?: { minimumBalanceTzs?: number })`:** when set and every prepared message is MARKETING, a
   confirmed reading below it (after the existing refresh and low-reading re-check) refuses the batch `MARKETING_FLOOR`
   (whole batch held, like `BALANCE_FLOOR`). Unknown stays "not low" INSIDE `sendBatch` (shared semantics unchanged); the
   fail-closed rule for marketing lives in the engine (E16). OTP never passes it and is untouched.
2. **`credit-guard.ts` (pure):** `creditVerdict({ balance: BalanceFigure, costTzs, reserveTzs })` →
   `{ ok: true } | { ok: false; reason: "credit_unreadable" } | { ok: false; reason: "credit_low"; balanceTzs; costTzs;
   reserveTzs }`. Used at Start (cost = the frozen campaign cost at today's price), at Resume (cost = outstanding rows ×
   segments × price) and per slice (cost = the slice's claim size × segments × price).
3. **`start-check.ts` — the ONE list of Start refusals,** in this order: not confirmed · switch closed · rail dead · E18
   source line · audience unreadable · price unknown · over budget (today's price × `estimateSegments` > `budgetTzs`) · credit
   (fresh read, ≤ 60 s, must be live) · OD28 (`campaignAudienceCount` + the members key for an enumerated confirmation →
   `startAudienceVerdict`). `resumeRefusal` = switch · rail · credit for the outstanding rows.
4. The estimate's reserve becomes the credit kept for codes (`estimate.ts` `reserveTzs`, "U49 swaps in its marketing
   floor").
5. `STOP_REASON_SENTENCE` gains `MARKETING_FLOOR`, `marketing_floor`, `credit_unreadable` (§3.4).

**Files.** `src/lib/server/sms.ts` (modify — the option, the code), `src/lib/marketing/credit-guard.ts` (create, pure),
`src/lib/server/marketing/start-check.ts` (create), `src/lib/server/marketing/estimate.ts` (reserve),
`src/lib/marketing/campaign-status.ts` (sentences), `scripts/sms-cost-guard.test.mts` (+ `scripts/anchors/sms-cost-guard.anchors.mjs`),
`scripts/marketing-engine.test.mts` §F.

**APIs.**

```ts
export type StartRefusal =
  | { reason: "not_confirmed" | "switch_closed" | "needs_source_line" | "audience_unreadable" | "price_unknown" | "credit_unreadable" | "members_changed" }
  | { reason: "rail_dead"; rail: SmsRailProblem }
  | { reason: "over_budget"; costTzs: number; budgetTzs: number }
  | { reason: "credit_low"; balanceTzs: number; costTzs: number; reserveTzs: number }
  | { reason: "audience_moved"; freshCount: number; confirmedCount: number };
export async function startRefusal(c: StoredSmsCampaign, deps?: StartCheckDeps): Promise<StartRefusal | null>;
export async function resumeRefusal(c: StoredSmsCampaign, outstanding: number, deps?: StartCheckDeps): Promise<StartRefusal | null>;
export function startRefusalSentence(r: StartRefusal, money: boolean): string;
```

**Sentences** (`startRefusalSentence`; every one ends "Nothing was sent." where nothing was):
- not_confirmed: "Only a confirmed campaign can start."
- switch_closed: "Marketing SMS are switched off. The owner switches them on (Admin → System → Marketing SMS sending),
  then you can start. Nothing was sent."
- rail_dead: "No SMS can leave this server right now — Admin → System says why. Nothing was sent."
- needs_source_line: "This campaign can reach people from the contact book, and its message has no source line. Stop it
  and confirm a copy once the owner has set the source line. Nothing was sent."
- audience_unreadable: "The saved audience can't be read any more. Stop this campaign and confirm a new copy. Nothing was
  sent."
- price_unknown: "The price per SMS isn't known, so the budget can't be checked. The owner sets it on Admin → System →
  Marketing SMS. Nothing was sent."
- over_budget (money): "At today's price this campaign could cost TZS 10,800 — more than its limit of TZS 10,000. Stop it
  and confirm a smaller copy, or the owner raises the limit. Nothing was sent." · (other roles): "At today's price this
  campaign could cost more than its limit. Stop it and confirm a smaller copy, or ask the owner. Nothing was sent."
- credit_low (money): "Starting would leave less SMS credit than is kept for login and withdrawal codes — credit TZS
  24,000, this campaign up to TZS 9,624, kept for codes TZS 20,000. Top up, or narrow the audience. Nothing was sent." ·
  (other roles): "There isn't enough SMS credit to start this campaign and still keep what login and withdrawal codes need.
  Ask the owner to top up. Nothing was sent."
- credit_unreadable: "The SMS credit couldn't be read just now, so the campaign can't start safely. Try again in a
  minute. Nothing was sent."
- audience_moved: "The audience grew since it was confirmed — now 1,610, confirmed 1,604. Nothing was sent. Stop this
  campaign and confirm a new copy."
- members_changed: "The people on this campaign changed since they were confirmed. Nothing was sent. Stop this campaign
  and confirm a new copy."

**Tests.** sms-cost-guard (new cases + anchors): ⭐ a MARKETING batch below `minimumBalanceTzs` is refused
`MARKETING_FLOOR` while an OTP batch in the same state sends; a top-up is honoured within the re-check; no
`minimumBalanceTzs` = today's behaviour byte for byte (the existing cases unchanged). `test:marketing-engine` §F: F1 every
Start refusal reached by exactly its fixture, in the documented order; F2 ⭐ projection above the live balance minus the
reserve refuses at Start (the plan's RED) and nothing is written; F3 an unreadable balance refuses (fail closed); F4 OD28
above refuses, equal and below proceed (shrunkBy reported); F5 a GROWTH sentence carries no "TZS"; F6 `resumeRefusal`
prices only the outstanding rows. **Plants** (in-place for sms-cost-guard; in-process for §F): the floor option ignored ·
OTP refused by the marketing floor · unknown read as low inside `sendBatch` · the credit check skipped at Start · OD28's
`>` written `>=`.
**Schema / deploy:** none. `sms.ts` is the OTP rail: the push also runs `test:otp-delivery`, `test:blackball`,
`test:sms-dlr` and `test:pii-logs` (each reads `sms.ts`), and ⛔ the one-line console warning in `consoleTransport` is not
touched (`pii-in-logs` §4 matches its exact shape).
**Audit rows:** none here — the refusal's row (`marketing.campaign_start_refused`) is written by U47b's Start action.
**Drive:** none of its own — U47b's drive shows each Start refusal.
**Owner decision:** the amount kept for codes (Q1; built: TZS 20,000).

---

### 4.13 · U43b · The slice

**Kind:** engine · **Hours:** 14–22 · **Review:** yes (the biggest) · **Depends:** U43a, U43y, U49a, U13, U33a-G, U43-0
deployed.

**Split (one builder + one review round each):**
- **U43b-1 · dispatch + transport** (5–8 h): Decision 1 (the `prepare` / `beforeSend` hooks, TRANSPORT → `unconfirmed`
  with its reference, `meta` on outcomes) and Decision 5 (the body read inside the try), with `test:marketing-consent` U9
  extended for the hooks, `test:blackball`'s case + anchor, and campaign-compose §18's TRANSPORT case. It ships on its own:
  the test send becomes correct by construction (no caller passes the hooks yet).
- **U43b-2 · the engine** (9–14 h): Decisions 2–4 — `engine.ts`, `engine-rules.ts`, the OTP-failure mark in `sms.ts`, the
  writer pins, `test:marketing-engine` §S/§R/§C/§T. Pushed only after U43-0's migration is live.

**Premises checked.** P1–P3, P5–P7, P13–P15, F1–F5, F8; the U9 second-driver contract (§9 U43: "call it, do not rewrite it");
`MARKETING_WRITERS` (P19); `SliceOutcome` gains `basis`/`basisRef` with U33a-G (spec §3.5); `renderForRecipient`,
`variantFor`, `firstNameFor`, `footerMeasurementToken` (`campaign-template.ts`, `footer.ts:99`).

**Decisions** (on top of E1–E30).
1. **`dispatchSlice` changes (E2, E3)** — additive and landmark-preserving:
   - `SliceRecipient = { ref; msisdn; body: string } | { ref; msisdn; prepare: (key: string, verdict: MarketingGateAllow) =>
     Promise<SlicePrepared> }` (a row with neither, or both, throws — a programming error).
   - after a clear: `prepare` → `{ ok: false, reason, detail }` → `held` `prepare:<reason>`; `{ ok: true, body, meta }` →
     cleared, `meta` carried onto every later outcome.
   - `deps.beforeSend(cleared)` → `{ proceed: false, reason }` → every cleared row `held` with that reason; `{ proceed:
     true, keep }` → rows not in `keep` `held` `claim_lost`, the rest sent.
   - a result with code `TRANSPORT` → `unconfirmed` with `reference`.
   - the `held`, `handed_over`, `failed`, `unconfirmed` outcomes carry `meta` (and `basis`/`basisRef` from U33a-G).
2. **`engine.ts` — `runCampaignSlice(campaignId)`**, one step:
   1. process single-flight (E10) → `waiting busy` if another slice is in flight;
   2. find; not RUNNING → `not_running`;
   3. reap (E6) — `findStranded(cutoff = now − 10 min, 200)` + `findByTargets` → `reapVerdict` (pure) → `settle`;
   4. slice-wide checks, each a pause or a wait, before any claim: switch (closed → pause `live_switch_closed`) · rail
      (dead → pause with its key) · window (closed → wait until `opensAt`) · money busy (wait) · OTP failure < 2 min
      (wait) · the template's verdict (a dry `renderForRecipient` per variant with the measurement token, origin account;
      fail → pause `template_invalid`) · the credit (`creditVerdict` for the slice; unreadable → pause
      `credit_unreadable`; low → pause `marketing_floor`);
   5. claim `adaptiveSliceSize()` rows; none → if no PENDING: HELD > 0 → pause `held_rows`, else finish DONE;
   6. `dispatchSlice(rows with prepare, { send: engineSend, beforeSend: verifyClaims, window })`:
      - `prepare(key, verdict)`: `user = findByPhone("+" + key)` → origin/name/variant (E17); `token =
        ensureOptOutToken(key)` (null → `token_unavailable`); `renderForRecipient(template, { variant, name, token, origin
        })` (refused → `template_invalid`, detail = the first problem); meta = `{ locale, segments, bodyLen, token, origin,
        name: "account" | "fallback" }`;
      - `verifyClaims(cleared)`: re-read the campaign (not RUNNING → `{ proceed: false, reason: "not_running" }`) and the
        rows still claimed by this token → `keep`;
      - `engineSend(msgs)` = `sendBatch(msgs.map((m) => ({ ...m, purpose: "MARKETING" })), { minimumBalanceTzs: reserve })`;
   7. settle every outcome through `settlementFor` (pure) with its gate trail (E20); E7's shop-wide rule → release every
      claimed row + ONE pause + ONE audit row; E8's per-person holds;
   8. measure and fold the gate time into the slice size (E11); return the summary.
3. **The engine declares itself** in `MARKETING_WRITERS` and `UNCONFIRMED_WRITERS`.
4. **The U9 contract gets its second driver:** `test:marketing-consent` U9 runs the same opt-out / self-exclusion / break
   between two slices through `runCampaignSlice` over real recipient rows (a stubbed wire), passing U9.1–U9.13.
5. **The transport fix:** `blackballSend` (and `blackballBalance`, for symmetry) read the body inside a try; a body that
   throws returns `transport: "reply body unreadable: …"` (ambiguous). `test:blackball` gains the case + an anchor.

**Files.**

| Path | Action | What |
|---|---|---|
| `src/lib/server/marketing/engine.ts` | create | `runCampaignSlice`, `reapStrandedClaims`, `ENGINE_DEPS`, the constants |
| `src/lib/marketing/engine-rules.ts` | create | PURE: `reapVerdict`, `settlementFor`, `gateTrailFor`, `isShopWide`, `adaptSliceSize` — the decisions the suite tables |
| `src/lib/server/marketing/dispatch.ts` | modify | E2/E3 as above; landmarks kept |
| `src/lib/server/sms-blackball.ts` | modify | the body read inside the try (both functions) |
| `src/lib/server/sms.ts` | modify | record the newest OTP failure time on `globalThis.__50PICK_OTP_LAST_FAILURE_AT` where an OTP row goes FAILED/UNKNOWN (no behaviour change) |
| `src/lib/marketing/campaign-status.ts` | modify | the engine's stop-reason sentences (§3.4) |
| `scripts/marketing-engine.test.mts` | modify | §S, §R, §C, §T |
| `scripts/marketing-consent.test.mts` | modify | U9 second driver |
| `scripts/campaign-models.test.mts` | modify | writer pins |
| `scripts/blackball-adapter.test.mts` (+ `scripts/anchors/blackball.anchors.mjs`) | modify | the body-read case |
| `scripts/campaign-compose.test.mts` | modify | §18: a TRANSPORT result now arrives as `unconfirmed` (the test send's handling unchanged) |

**APIs.**

```ts
export const SLICE_MAX = 50;                    // = BATCH_MAX
export const SLICE_START = 20;
export const SLICE_GATE_BUDGET_MS = 10_000;
export const REAP_AFTER_MS = 10 * 60_000;
export const MAX_ROW_ATTEMPTS = 3;
export const OTP_FAILURE_WAIT_MS = 2 * 60_000;
export type SliceWait = "busy" | "quiet_hours" | "money_busy" | "otp_failing";
export type EngineStopReason = "live_switch_closed" | "NOT_CONFIGURED" | "PROVIDER_UNRECOGNISED" | "BALANCE_FLOOR" | "MARKETING_FLOOR"
  | "marketing_floor" | "credit_unreadable" | "gateway_refused" | "template_invalid" | "held_rows";
export type SliceStepResult =
  | { kind: "sent"; claimed: number; handedOver: number; skipped: number; failed: number; unconfirmed: number; held: number; reaped: number; gateMs: number; sendMs: number }
  | { kind: "finished"; status: "DONE" }
  | { kind: "paused"; reason: EngineStopReason }
  | { kind: "waiting"; reason: SliceWait; until: string | null }
  | { kind: "not_running"; status: SmsCampaignStatus };
export async function runCampaignSlice(campaignId: string, deps?: EngineDeps): Promise<SliceStepResult>;
export async function reapStrandedClaims(campaignId: string, deps?: EngineDeps): Promise<{ reaped: number; toPending: number; toSent: number; toUnconfirmed: number; toFailed: number; toDelivered: number }>;

// engine-rules.ts (pure)
export type ReapEvidence = Pick<StoredSmsMessage, "reference" | "status" | "sentAt" | "deliveredAt" | "failedAt" | "providerMsg"> | null;
export function reapVerdict(row: StoredSmsCampaignRecipient, evidence: ReapEvidence, at: string): SmsCampaignRecipientSettle;
export function settlementFor(o: SliceOutcome, claimToken: string, base: SmsCampaignGateTrail, row: StoredSmsCampaignRecipient, at: string): SmsCampaignRecipientSettle;
export function isShopWide(outcomes: SliceOutcome[]): { shopWide: false } | { shopWide: true; reason: EngineStopReason; detail: string };
export function gateTrailFor(a: { slice: SmsCampaignGateTrail; outcome: SliceOutcome }): SmsCampaignGateTrail;
export function adaptSliceSize(prev: number, perRecipientMs: number | null): number;
```

The gate trail (E20), in order (`check`, `verdict`, `wording`, `source`):
`["campaign", "RUNNING", null, campaignId]` · `["live_switch", "open", null, "until:<closesAt>"]` · `["send_window",
"open", null, "08:00–20:00 EAT"]` · `["credit", "ok", null, "kept-for-codes:<n>"]` · `["gate", "ok" | <skipReason>,
<detail or null>, <basis>:<basisRef> | null]` · `["render", "ok" | "refused", <variant>, "origin:<account|book>;
name:<account|fallback>"]` · `["dispatch", <outcome>, null, <reference or null>]`.

**Settlement table** (`settlementFor`, the suite asserts every row):

| Outcome | Recipient |
|---|---|
| `skipped` | SKIPPED (skipReason, skipDetail) |
| `handed_over` | SENT (reference, token, locale, segments, bodyLen) |
| `unconfirmed` | UNCONFIRMED (reference when known) |
| `failed` with `BAD_MSISDN` | FAILED (failureClass `BAD_MSISDN`) |
| `failed`, every cleared row the same other code | shop-wide: all claimed rows → PENDING (+1), pause `gateway_refused` |
| `held` shop-wide (`BALANCE_FLOOR`, `NOT_CONFIGURED`, `PROVIDER_UNRECOGNISED`, `MARKETING_FLOOR`, `not_running`, `quiet_hours`) | all claimed → PENDING (+0); pause with the key (`not_running` and `quiet_hours`: no pause) |
| `held` per person (`gate_unanswered`, `prepare:token_unavailable`, `prepare:template_invalid`) | attempts < 3 → PENDING (+1); else HELD |
| `held` `claim_lost` | nothing (the row is someone else's now) |

**Tests** (`test:marketing-engine`).
- §S S1 a RUNNING slice over consenting players settles every row SENT with token, locale, segments, body length and a
  trail of 7 entries; S2 ⭐ a TRANSPORT result → UNCONFIRMED (never FAILED), the reference kept; S3 ⭐ a `status:false` batch
  → every claimed row back to PENDING, ONE pause `gateway_refused`, ONE audit row, zero FAILED rows; S4 BALANCE_FLOOR →
  release + pause, zero FAILED; S5 a gate that throws for one person → that row PENDING with attempts 1; after 3 → HELD;
  S6 ⭐ E17: a registered player walked by their book row renders as `account` (their name, no source line) — and with a
  blank source line is SENT, not refused; a non-member renders `book`; S7 ⭐ E1: a refused person gets no token row; a
  cleared person reuses an existing token; S8 the switch closing mid-campaign → the next step pauses
  `live_switch_closed`; S9 ⭐ Stop/Pause landing during gating (a gate dep that pauses the campaign on its 3rd call) → the
  send is vetoed by `beforeSend`, every claimed row released, zero wire calls; S10 nothing outstanding → DONE (one finished
  audit row with counts); only HELD → pause `held_rows`; S11 the window closed → `waiting quiet_hours`, zero claims; S12
  money busy → `waiting money_busy`, zero claims; S13 an OTP failure 30 s ago → `waiting otp_failing` until +2 min; S14 the
  slice size adapts (a slow gate halves it, never below 5, never above 50); S15 no audit row per recipient or per slice
  (the chain grows only by the events in E24).
- §R reaper: R1 every row of the reap table (none → PENDING; QUEUED/UNKNOWN → UNCONFIRMED; ACCEPTED → SENT; DELIVERED →
  DELIVERED; FAILED → FAILED); R2 ⭐ a stalled claimant resumes after its claim was reaped → `beforeSend` keeps none →
  zero wire calls (the double-send guard of E6); R3 a claim younger than 10 min is never reaped; R4 the reaper runs for a
  PAUSED and a CANCELLED campaign.
- §C ⭐ concurrency (the plan's RED): five concurrent drivers, single-flight bypassed (injected), over 1,000 rows → exactly
  1,000 wire messages, each recipient once; with the single-flight on, the same 1,000 and never two slices at once.
- §T the U9 contract through `runCampaignSlice` (second driver), U9.1–U9.13 green.
- blackball: a body that throws mid-read → `transport` set, `ok: false`, ambiguous; `sendBatch` writes UNKNOWN, not FAILED.
**Plants** (in-process unless noted): R-S2 TRANSPORT mapped to failed · R-S3 a refused batch settled FAILED row by row ·
R-S6 origin taken from the row kind · R-S7 the token minted before the gate · R-S9 `beforeSend` removed (the paused
campaign still sends) · R-R1 a QUEUED stranded claim returned to PENDING · R-R2 `beforeSend` trusting the claim it took at
the start · R-C1 an unconditional claim (the memory twin's `claim` without the `claimToken === null` test — five drivers
send duplicates) · R-C2 the unique key ignored in `createMany` (dal-parity's plant) · R-T1 the engine gating at claim time
instead of in `dispatchSlice` (the opted-out number is sent — U9's own red) · (in-place) R-BB1 the body read moved back
outside the try.

**Schema / deploy:** none of its own; ⛔ it may be pushed only after U43-0's migration is live on production (it is the first
UNCONFIRMED writer — 55P04's two-step) and after U33a-G (it consumes `basis`/`basisRef`). Overlap: the old build already
knows UNCONFIRMED (U43-0), and no campaign runs during the deploy (§5 rule 8).
**Audit rows (E24):** `marketing.campaign_paused` (SYSTEM, `{ reason, detail? }` — the gateway's message scrubbed and ≤ 200
characters for `gateway_refused`), `marketing.campaign_finished` (SYSTEM, the counts by status), `marketing.campaign_reaped`
(SYSTEM, the five reap counts, only when > 0), and the existing `marketing.suppressed.rg` per RG refusal (dispatch.ts,
unchanged). Nothing per recipient or per slice.
**Drive:** none of its own (no screen) — U47b's drive runs real slices on the console stub; the timings it logs are U52a's
starting point.
**Risks.** The per-recipient gate is the costliest read on the platform (harm markers up to 10,000 rows per player) —
E11 bounds a slice by time; U52a measures. A deploy mid-slice: the reaper settles from evidence after 10 minutes. The
"no evidence → PENDING" rule assumes `sendBatch` writes rows before the wire (P2) — the suite pins that order
(`createMany` before the transport loop, a source check). `sms.ts` and `sms-blackball.ts` are the OTP rail: the push runs
`test:otp-delivery`, `test:blackball`, `test:sms-dlr`, `test:sms-cost-guard` and `test:pii-logs`.
**Owner decision:** none.

---

### 4.14 · U46a · Receipts — the recipient arm, and rotating the secret

**Kind:** engine · **Hours:** 5–8 · **Review:** yes (an internet-facing writer) · **Set:** D · **Depends:** U43a (DAL
serial).

**What exists (P4):** the route, the secret (set in production, `webhookSecretSet: true`), the callback registered with
Blackball (`?token=` on the URL), the monotonic `recordDlr`, batched receipts (three lines in one POST, measured), only
`DELIVRD` ever seen live, callbacks retried 5 times on a non-200. **What is missing:** the `SmsCampaignRecipient` arm (D21);
a way to rotate the secret without dropping receipts (the secret travelled through chat — the owner item in
BLACKBALL-SMS.md:19-21).

**Decisions.**
1. **The arm (E28):** after `recordDlr` reports `changed` and `after.targetType === DISPATCH_TARGET_TYPE`
   ("SmsCampaignRecipient"): `smsCampaignRecipient.recordReceipt(after.targetId, { reference, msisdn: after.msisdn,
   status: mapped, rawStatus, desc, at })` — written only where the row's `id` matches, `msisdn` equals the message's,
   `smsReference` is null or equal to the reference, and `status ∈ (PENDING, SENT, UNCONFIRMED)`. DELIVERED →
   `deliveredAt`; FAILED → `failedAt`, `failureClass = "receipt:" + rawStatus`, `error` = the description (scrubbed, ≤ 200,
   no phone run). A mismatch writes nothing and audits SECURITY `sms.dlr.recipient_mismatch` (masked).
2. **A test send's receipt** (`SmsCampaignTest`) settles only its `SmsMessage` row (unchanged).
3. **The receipt audit row** (`sms.dlr.received`) gains a `campaign` count beside `invites`.
4. **Rotation (E29):** `authorized()` accepts `BLACKBALL_WEBHOOK_SECRET` or, when set, `BLACKBALL_WEBHOOK_SECRET_PREVIOUS`
   (both ≥ 16 characters, constant time). Boot (`boot-checks`) warns while PREVIOUS is set: "BLACKBALL_WEBHOOK_SECRET_PREVIOUS
   is set — remove it once Blackball's callback URL carries the new secret." The runbook (BLACKBALL-SMS §6/§7): set the new
   value as current and the old as PREVIOUS → change the URL in the Blackball portal → one test send → see `applied: 1` →
   remove PREVIOUS.
5. `recordReceipt` only ever moves a row OUT of UNCONFIRMED (to DELIVERED or FAILED), so it does not join
   `UNCONFIRMED_WRITERS`; the pin stays the engine alone.
6. **Deploy:** no schema change. ⛔ Never deployed while a campaign is PREPARING or RUNNING (§5 rule 8): a receipt that
   reaches the old instance during the 60-second overlap settles only its `SmsMessage` row, and its replay would not re-run
   the arm. Before G2 no campaign runs, so this is free today.

**Files.** `src/app/api/webhooks/blackball/route.ts` (the arm, the second secret), `src/lib/server/store.ts`,
`src/lib/server/prisma-dal.ts` (`recordReceipt`, named types `SmsRecipientReceipt`, `SmsRecipientReceiptResult`),
`src/lib/server/boot-checks.ts` (the warning), `scripts/sms-dlr.test.mts` (+ `scripts/anchors/sms-dlr.anchors.mjs`),
`scripts/dal-parity.test.mts` (§26), `docs/BLACKBALL-SMS.md` (§3 the arm, §6 the variable, §7 the rotation steps).

**APIs.**

```ts
export type SmsRecipientReceipt = { reference: string; msisdn: string; status: "DELIVERED" | "FAILED"; rawStatus: string; desc: string | null; at: string };
export type SmsRecipientReceiptResult = { changed: boolean; reason: "applied" | "not_found" | "mismatch" | "settled" };
recordReceipt(id: string, r: SmsRecipientReceipt): Promise<SmsRecipientReceiptResult>;
```

**Tests** (`test:sms-dlr`, multi-line bodies): D1 ⭐ a DELIVRD line moves a SENT recipient to DELIVERED; D2 a replay
changes nothing (the SmsMessage row did not move); D3 a late FAILED after DELIVERED is discarded; D4 ⭐ an UNCONFIRMED row
settles on a late receipt; D5 a receipt landing while the row is still claimed (PENDING) sets DELIVERED and the slice's
later settle is `lost`; D6 a msisdn or reference mismatch writes nothing and audits SECURITY with masked numbers; D7 a test
send's receipt touches no recipient; D8 three lines in one POST — one campaign, one invite, one unknown — each to its arm;
D9 ⭐ the previous secret is accepted, a third value refused, and with PREVIOUS unset only the current one works; D10 the
reply body stays exactly `{"status":"Ok"}`. **Plants** (in-place, anchors): the arm without the status guard (a FAILED
after DELIVERED lands) · the arm run on `!changed` (a replay re-writes) · the identity check removed · PREVIOUS accepted
when unset (empty string compares equal).
**Drive:** local, `SMS_PROVIDER=console`, the secret unset (open in dev): POST receipts at the route for rows a slice wrote
(through the U47b drive's campaign); the results panel moves (U48a). Production proof is U52a's.
**Owner decision:** when to rotate the secret (Q5; default: before U52a, in a quiet hour, with PREVIOUS set for the change).

---

### 4.15 · U47b · The live campaign page — controls, the driver, the states

**Kind:** visual + engine wiring · **Hours:** 14–22 · **Review:** yes (it starts real sends) · **Depends:** U43b, U49a, U42.

**Split (one builder + one review round each):**
- **U47b-1 · services and the view-model** (6–9 h): `campaign-control.ts` and `campaign-live.ts` with
  `test:campaign-visuals` §svc (V2, V3 on the view-model, the transitions, Start's refusals wired, Resume's re-queue, Stop,
  Make a copy, the step dispatcher). No `*Action`, no page — nothing reachable, so it ships alone (X16 is about actions).
- **U47b-2 · the page** (8–13 h): the route, its actions (each with its caller in the same push), the client, the driver, the
  list link and `CAMPAIGN_SCREENS.detail`, the REACHED row, the composer link, V1/V4–V10, the drive.

**Premises checked.** The six doors and the page gate rules (`admin-section-gate.test.mjs` §0b′: one return, a literal
title, a self-closing child), `CAMPAIGN_SCREENS.detail` false and its pin `test:campaigns-page` 5f/5k
(`campaigns-page.test.mts:592-603`), the list link line (`campaigns/page.tsx:88`), `REACHED_WITHOUT_NAV`
(`admin-nav.test.mts:141-165`), `/admin/campaigns/<id>` already maps to the growth domain (`admin-nav.test.mts:91`),
`runAdminAction` maps a thrown action to `{ ok: false }` (`run-admin-action.ts`), deploy skew mints new action ids per build
(`deploy-skew.test.mts`), `softRequireStaff(…, { refuseSecondFactor: true })` answers a lapsed 2-step in words
(`rbac-guard.ts:154-205`), `campaignProgress` / `wantsAttention` / `stopReasonLabel` (`campaign-status.ts:183-234`).

**Decisions.**
1. **The services** (`campaign-control.ts`): `startCampaign` (U49a's `startRefusal` → `transition(CONFIRMED → PREPARING,
   { startedAt })` → audit), `pauseCampaign`, `resumeCampaign` (`resumeRefusal` → `requeueHeld` → `transition(PAUSED →
   PREPARING | RUNNING, { stopReason: null })`), `stopCampaign` (`transition(… → CANCELLED, { finishedAt, stopReason:
   "officer_stopped" })`), `copyCampaign` (a new DRAFT through `saveCampaignDraft` with the stored message and
   `campaignAudienceParams(storedFilter)`; refused when the filter cannot travel), `campaignStep` (§3.3: enqueueStep /
   runCampaignSlice / reap).
2. **The view-model** (`campaign-live.ts`) — ONE function, used by the page's first render AND returned by every step and
   poll, so the browser never computes a figure. Role-shaped: E23's floor; money only for `campaignMoneyVisible`.
3. **The driver** (`live-driver.tsx`, client): while the status is PREPARING or RUNNING and the viewer may act, it calls
   `campaignStepAction(id)` — next call after `STEP_GAP_MS` (2,000 ms) when work was done, after the wait's `until` (capped
   at 30 s, at least 5 s) when waiting, after 5 s when busy; it stops on a terminal status. A viewer who may not act polls
   `campaignViewAction(id)` every 10 s. On mount for PAUSED/CANCELLED/DONE an acting viewer calls the step once (reap). A
   thrown call (deploy skew, network) stops the loop and shows "This page is out of date or lost its connection — reload it
   to keep sending. Nothing is lost." with a Reload button. A lapsed 2-step stops it with the second-factor sentence and
   link. `document.hidden` slows nothing on purpose (the browser does).
4. **Controls** — never hidden, disabled with the reason in `title`: Start (CONFIRMED) · Pause (PREPARING, RUNNING) · Resume
   (PAUSED) · Stop (any non-terminal) · Make a copy (any non-DRAFT). Start and Stop open a kit `ConfirmModal` (medium tier,
   focus on Cancel); Pause and Resume act at once with a toast.
5. **The list:** a DRAFT row keeps linking to the composer; every other row links to the detail page; `CAMPAIGN_SCREENS.detail`
   flips to true in this commit, with the `REACHED_WITHOUT_NAV` row and 5f/5k re-pinned; a DRAFT id opened at the detail
   address redirects to `campaignDraftHref`.
6. **The composer's confirmed line** links to the detail page (U40b D4).
7. **Who acts:** growth act grant (`softRequireStaff("growth", …)`); the owner's control is the switch (E27).
8. **Live progress, as the brief asks:** the KPIs are waiting (queued) · handed over (sent) · failed · not sent (skipped by
   the checks) · no answer; under "Not sent", the reasons in the five U38b words (`AUDIENCE_BUCKET_OF`, protected one line),
   dominant first, each with its count — all from ONE `groupBy` over `(status, skipReason, failureClass)` for the campaign,
   never a counter (OD26). U48a later adds the receipt-based figures beside them. E23's floor applies.
9. **Schema / deploy:** none. ⛔ Rule 8 of §5 begins here: never push while a campaign is PREPARING or RUNNING — pause it
   first (deploy skew would stop every open driver; the reaper heals, but a pause is cleaner).

**Files.**

| Path | Action | What |
|---|---|---|
| `src/lib/server/marketing/campaign-control.ts` | create | the six services above |
| `src/lib/server/marketing/campaign-live.ts` | create | `campaignLiveView` |
| `src/app/admin/campaigns/[id]/page.tsx` | create | own `AdminPageGate title="SMS campaign"`; server render of the view; `AdminLoadError`; missing → words + "Back to SMS campaigns" |
| `src/app/admin/campaigns/[id]/loading.tsx` | create | ghost = real blocks |
| `src/app/admin/campaigns/[id]/actions.ts` | create | `campaignStepAction`, `campaignViewAction`, `startCampaignAction`, `pauseCampaignAction`, `resumeCampaignAction`, `stopCampaignAction`, `copyCampaignAction` |
| `src/app/admin/campaigns/[id]/live-client.tsx` | create | KPIs, bars, chips, controls, dialogs, the standing callouts |
| `src/app/admin/campaigns/[id]/live-driver.tsx` | create | the loop |
| `src/app/admin/campaigns/[id]/live-copy.ts` | create | every sentence |
| `src/lib/marketing/campaign-status.ts` | modify | `CAMPAIGN_SCREENS.detail = true`; `officer_paused`/`officer_stopped` sentences |
| `src/app/admin/campaigns/page.tsx` | modify | the link rule (D5) |
| `src/app/admin/campaigns/new/composer-loader.ts`/`composer-client.tsx` | modify | the confirmed line's link |
| `scripts/campaign-visuals.test.mts` | create | `test:campaign-visuals` + `--prove-red` |
| `scripts/campaigns-page.test.mts`, `scripts/admin-nav.test.mts` | modify | 5f/5k; the REACHED row |
| `scripts/live/marketing-u47-live-drive.mjs` | create | `qa:marketing-live` |

**APIs.**

```ts
export type ControlState = { enabled: boolean; reason: string | null };
export type CampaignLiveView = {
  id: string; name: string; status: SmsCampaignStatus; statusLabel: string; chip: CampaignChipVariant;
  headline: string;                       // the one sentence for the status (below)
  stopSentence: string | null;            // stopReasonLabel(stopReason), with who/when for an officer's pause/stop
  audienceLines: string[];                // role-shaped describeAudience
  confirmed: { count: number; at: string; byName: string | null } | null;
  progress: CampaignProgress | null;
  kpis: { onCampaign: number; handedOver: number | null; failed: number | null; notSent: number | null; noAnswer: number | null; waiting: number | null }; // null under the floor
  notSentReasons: Array<{ label: string; count: number }> | null; // the five buckets, dominant first; null under the floor
  chips: Array<{ status: SmsCampaignRecipientStatus; label: string; count: number }> | null;
  standing: { switchOpen: boolean; switchClosesAt: string | null; window: SendWindowState; lastStepAt: string | null; nobodyDriving: boolean; keepOpen: boolean };
  controls: { start: ControlState; pause: ControlState; resume: ControlState; stop: ControlState; copy: ControlState };
  money: null | { estimateTzs: number | null; budgetTzs: number | null };
  results: CampaignResultsView | null;    // U48a fills it; null until then
  readAt: string;
};
export async function campaignLiveView(id: string, viewer: { userId: string; mayAct: boolean; reads: boolean; money: boolean }): Promise<CampaignLiveView | null>;
export type StepActionResult = { ok: true; step: SliceStepResult | EnqueueStepResult | { kind: "reaped"; reaped: number } | { kind: "idle" }; view: CampaignLiveView } | { ok: false; reason: "role" | "second_factor" | "not_found"; error: string };
```

**States and sentences** (`live-copy.ts`).
- Headlines: CONFIRMED "Ready to start — nothing has been sent." · PREPARING "Preparing the list — 600 of 1,604 people
  written." · RUNNING "Sending — 420 of 1,604 done." · PAUSED "Paused." + the reason · DONE "Finished — everyone on this
  campaign has an answer." · CANCELLED "Stopped by Amina at 14:10 EAT — 1,180 people were not messaged."
- Waits (from the step): quiet hours "Waiting for the send window — sending resumes at 08:00 EAT." · money busy "Waiting a
  moment — the platform is paying out or taking bets, and money always goes first. Sending resumes by itself." · OTP "Waiting
  — a login or withdrawal code failed in the last two minutes, so marketing steps aside. It tries again at 14:32 EAT." · busy
  "Another campaign step is running — this page waits its turn."
- Standing callouts: keep open (RUNNING/PREPARING) "Keep this page open while it sends — sending continues only while a page
  like this one is open." · nobody driving (RUNNING, no claim for 90 s, viewer cannot act or the driver has not run yet)
  "Nobody is sending this campaign right now. Open it as an officer who can send, and keep the page open. (Last step 14:02
  EAT.)" · switch off "Marketing SMS are switched off — this campaign waits until the owner switches them on." · out of date
  (above) · second factor (the platform's sentence).
- KPIs: "On campaign" · "Handed over" (title: "The network took the message. Delivery is confirmed by a receipt, usually in
  seconds.") · "Failed" · "Not sent (checks)" · "No answer" (title: "Handed to the network with no answer back — never
  re-sent automatically.") · "Waiting".
- Floor (masked, < 10 people): "This campaign has fewer than 10 people, so its breakdown is hidden for your role."
- Start dialog: title "Start sending to up to 1,604 people?" · body "Each person is checked again just before their message:
  anyone who has stopped, withdrew or is protected is skipped. Messages go out between 08:00 and 20:00 EAT. [money:] It can
  cost up to TZS 9,624 of the TZS 10,000 limit. [others:] It uses up to 1,604 SMS. Keep this page open while it sends." ·
  "Cancel" / "Start sending". Refusals: U49a's sentences.
- Pause toast "Paused — nobody more is messaged until you resume." · Resume toast "Sending again." (refusals: U49a's) · Stop
  dialog: title "Stop this campaign for good?" · body "Nobody more will be messaged. Messages already handed to the network
  are not recalled. A stopped campaign can't be restarted — make a copy to send it again." · "Cancel" / "Stop campaign" ·
  toast "Stopped — nobody more will be messaged."
- Copy toast "A copy was made as a new draft." (to the composer) · refused "This campaign's audience can't be carried into a
  copy — write a new campaign instead."
- Disabled reasons: Start "Only a confirmed campaign can start." / "Marketing SMS are switched off." · Pause "Only a campaign
  that is preparing or sending can be paused." · Resume "Only a paused campaign can resume." · Stop "This campaign has
  already finished or stopped." · role "Your role can view this campaign but not change it."
- Loading: the ghost · Missing: "This campaign was not found." · Error: `AdminLoadError` "this SMS campaign".

**Audit rows.** `marketing.campaign_started` (ADMIN, officer; `{ count, estimateSegments }`) ·
`marketing.campaign_start_refused` (ADMIN; `{ reason }`, figures only for money keys) · `marketing.campaign_paused` (ADMIN for an
officer, SYSTEM for the engine; `{ reason }`) · `marketing.campaign_resumed` (ADMIN; `{ requeuedHeld }`) ·
`marketing.campaign_stopped` (ADMIN; `{ outstanding }`) · `marketing.campaign_finished` (SYSTEM; the counts by status) ·
`marketing.campaign_reaped` (SYSTEM; when > 0) · `marketing.campaign_copied` (ADMIN; `{ from, to }`). U50 registers them.

**Tests** (`test:campaign-visuals`, new): V1 every figure on the page is a view-model field (structural: no arithmetic on
counts in `src/app/admin/campaigns/[id]/*.tsx`); V2 ⭐ HELD outstanding: 4 SENT + 6 HELD reads "4 of 10" (the plan's RED);
an empty campaign has no bar (`progress` null); V3 ⭐ freeze the counts server-side: two renders 10 s apart give
byte-identical bar widths (no timer-driven bar, OD34 — the plan's RED); V4 the controls exist in every state, disabled with
a `title` reason (never conditionally rendered); V5 every action's guard is its first statement, domain growth, step uses
`refuseSecondFactor`; V6 the driver stops on a thrown call and never retries blind; V7 the floor hides the split for a
masked viewer under 10; V8 no "TZS" in a GROWTH view; V9 `CAMPAIGN_SCREENS.detail` true exactly when the page exists (5f);
V10 the page gate shape (§0b′). **Plants:** HELD counted settled · a timer-driven bar · Stop hidden instead of disabled ·
the guard moved below the service call · the driver retrying a thrown step · the floor removed · TZS for GROWTH.
**Drive** (`qa:marketing-live`, local, console SMS, memory store): a campaign seeded CONFIRMED (dev seed) → Start (switch
irrelevant for the stub — `marketingLiveGate` "stub") → PREPARING bar → RUNNING bar → a suppressed contact skipped → Pause →
Resume → DONE; a Stop mid-run; the waiting states via dev toggles (window, money busy); the out-of-date state (the action
made to throw); GROWTH and ADMIN; 1280 · 360 · reduced motion; tiles read. The drive asserts each heading before it
photographs (S7c lesson).
**Risks.** Deploy skew mid-campaign (the driver stops honestly; the reaper heals). Two officers driving (single-flight;
claims). A long campaign with the tab in the background (browser throttling slows it; the page says to keep it open).

---

### 4.16 · U48a · Results on the live page

**Kind:** visual · **Hours:** 5–8 · **Review:** yes (the honesty of delivery) · **Depends:** U47b, U46a.

**Premises checked.** OD41: `accepted` is never delivered, and the honesty line is rendered from the data (§4 OD41, amended
2026-09-23). Receipts reach recipients only through U46a's arm (E28); `SmsMessage.dlrStatus` keeps the raw token
(`schema.prisma:3118-3124`). Stops carry `evidence: "optout:<ref>"` (`optout-service.ts:256-266`) and §25's
`suppression.findActiveAmong` answers a set's active stops in one query (STEP 22). `AUDIENCE_BUCKET_OF` is the ONE map from a
gate reason to its bucket (`audience-split.ts:63-75`). Only `DELIVRD` has ever arrived live (BLACKBALL-SMS §3) — every failure
fixture is synthetic. Whether receipts are set up is `BLACKBALL_WEBHOOK_SECRET`'s presence (the route's `authorized`,
`route.ts:53-64`; `/api/health`'s `webhookSecretSet`).

**Decisions.**
1. **`CampaignResultsView`** (in `campaign-live.ts`): delivered (receipts) · handed over, no receipt yet · no receipt after 15
   minutes (E5) · failed, split "the network refused it" (wire) / "not delivered" (receipt) · not sent, by the five reason
   buckets (`AUDIENCE_BUCKET_OF`, protected one line — `AdminBarList`, neutral ink, dominant first) · no answer
   (UNCONFIRMED, "never re-sent automatically") · waiting / stopped before sending (PENDING + HELD; "stopped before sending"
   for a CANCELLED campaign) · stopped by their link since this campaign (E30).
2. **The honesty lines, from the data (OD41):** "No delivery receipt has arrived for this campaign yet — 'handed over' is not
   'delivered'." while none has, gone once one does; "Delivery receipts aren't set up on this server, so 'Delivered' will stay
   at zero — Admin → System → Diagnostics says how to fix it." when the secret is unset; and the price line for money readers:
   "Estimated spend: TZS 8,412 (handed over × TZS 6 per SMS, configured, not yet measured) — the SMS credit on Admin → System is
   the true figure."
3. **The floor (E23)** applies; a masked viewer never sees reasons under 10.
4. **Stopped by link** is read with `suppression.findActiveAmong` over this campaign's handed-over numbers (chunks of
   1,000), counting `reason WITHDRAWN`, evidence starting `optout:`, `createdAt >= sentAt`; a number whose stop is later than
   a newer campaign's message to it is not counted here.

**Files.** `src/lib/server/marketing/campaign-live.ts` (results), `src/lib/server/marketing/campaign-results.ts` (create —
the reads: counts by status/failureClass/skipReason, the receipt presence, stopped-by-link), `src/app/admin/campaigns/[id]/results-card.tsx`
(create), `live-copy.ts`, `scripts/campaign-visuals.test.mts` (§R).

**Sentences.** Section titles: "Delivered" · "Handed over, no receipt yet" · "No receipt after 15 minutes" · "Failed" ("The
network refused it" · "Not delivered (receipt)") · "Not sent — the checks refused them" (the five labels as U38b) · "No answer
from the network" · "Stopped before sending" · "Stopped by their link since this campaign".
**Tests** (§R): R1 ⭐ `accepted` is never counted delivered — only receipts move "Delivered" (the plan's OD41 rule); R2 the
honesty line present with zero receipts and absent after one; R3 the 15-minute figure counts SENT rows older than 15 min with
no receipt and nothing else; R4 ⭐ stopped-by-link attribution (a stop after this campaign's message counts; a stop before
it, or after a newer campaign's message to the same number, does not); R5 the reasons are the five buckets, protected one
line, for every role; R6 the floor. **Plants:** handed over counted as delivered · the honesty line hard-coded · protected
itemised · attribution ignoring a newer campaign.
**Schema / deploy:** none. **Audit rows:** none (reads). **Drive:** `qa:marketing-live` extended — receipts POSTed at the local
route for a finished campaign move "Delivered"; the honesty line before and after; the floor as GROWTH; 1280 · 360; tiles
read. **Risks:** a receipt vocabulary beyond `DELIVRD` is still synthetic (BLACKBALL-SMS §8). **Owner decision:** none.

---

### 4.17 · U48b · The recipients table and the export

**Kind:** visual + read · **Hours:** 7–12 · **Review:** yes (the export) · **Depends:** U48a · **May follow G2.**

**Premises checked.** §5.15 binds U48: paging, sorting, a determinate loading state, an empty state saying what next, an
error state that keeps the filter, the console's one filter language. The contacts export (U34a, `d8fce713` + `95a48ae6`) is
the precedent: the viewer decided on the STORED row, the second factor, the audit row AWAITED before the first byte, the
cross-site and HEAD refusal through the shared export gate (`test:read-tiers` 8.11b), U28's `csv-write.ts` and the BOM, the
file read back through U25's real reader. OD25: every number masked on every campaign surface for every role. The recipient
table has `@@index([campaignId, status])` (`schema.prisma:3825`) and no paged read yet (P7).

**Decisions.**
1. **The table** — server-paged (25), sorted by id (send order) with "Handed over at" and "Delivered at" sortable, a
   FilterPill rail by state (All · Delivered · Handed over · No answer · Failed · Not sent · Waiting), every number masked
   (`maskPhone`), Operator (by prefix), Status in words, Reason (a reader: the five-bucket words; a masked viewer: "Not
   sent" with no reason — E23), Language. `AdminTableEmpty` with the rail kept; an error keeps the filter and offers retry.
   DAL `smsCampaignRecipient.pageForCampaign({ campaignId, statuses, sort, dir, offset, limit })` (both twins, named types,
   dal-parity).
2. **The export** — `GET /api/admin/campaigns/[id]/export`: the shared export gate (cross-site and HEAD refused before the
   session is read — `test:read-tiers` 8.11b), the viewer decided on the STORED row, the second factor, `marketing.campaign_exported`
   AWAITED before the first byte (503 and no file if it did not record), U28's CSV writer and BOM, MASKED numbers for every
   role (E26), the floor (a masked viewer gets no reason column), a keyset walk capped at the campaign's rows.
3. Columns: `phone_masked, operator, status, reason, language, handed_over_at_eat, delivered_at_eat, stopped_by_link`.

**Files.** `src/app/admin/campaigns/[id]/recipients-table.tsx` (create), `src/app/api/admin/campaigns/[id]/export/route.ts`
(create), `src/lib/server/marketing/campaign-export.ts` (create), the twins + dal-parity, `scripts/campaign-visuals.test.mts`
(§X), `scripts/read-tiers.test.mts` (the export gate's population gains the route), `filter-language` declaration,
`scripts/live/marketing-u48-results-drive.mjs` (create — `qa:marketing-results`).
**Sentences.** Empty: "No one on this campaign is in this state." · Export button "Download CSV" · refusals: "The export
couldn't be recorded, so no file was made — try again." · "Downloads are refused from other sites." (404 body) · "Your 2-step
check lapsed — confirm it, then download again."
**Tests** (§X): X1 server paging and the true total; X2 ⭐ no full number in any role's page or file (JSON/CSV scan); X3 the
audit row is written before the first byte (a writer that fails → 503, no body); X4 cross-site and HEAD → 404 before the
session; X5 the masked viewer's file has no reason column; X6 the file reads back through U25's real reader. **Plants:** a
full number for a reader · the audit after the body · the cross-site gate removed · a reason column for a masked viewer.
**Schema / deploy:** none (a paged read on existing indexes). **Audit rows:** `marketing.campaign_exported` (ADMIN, officer;
`{ rows, statuses, masked: true }`), awaited. **Drive:** `qa:marketing-results` — paging past 25, each rail pill, the empty
filter, the error state, a real download parsed in the browser (GROWTH and ADMIN), a cross-site fetch and a HEAD measured
404; 1280 · 360; tiles read. **Risks:** the export is a bulk read of masked numbers — still recorded, as the contacts export
is. **Owner decision:** none (full-number export later — E26).

---

### 4.18 · U52a · The live drive on production

**Kind:** live · **Hours:** 4–8 (+ owner waits) · **Review:** yes (real sends) · **Depends:** everything above, the WHOLE
predeploy chain once on the tree production serves (with the runner's exit codes captured — §0 🔴), a dev server for the
browser checks or each logged NOT RUN.

**Facts that shape it.** Claude never signs in as Ali or Jay (§0 ⚖️ G7); production has no QA growth account (G7 open); so the
clicks are made by Jay (an ADMIN) on www.50pick.tz, signed in as himself, with Claude reading evidence read-only. Each
chargeable SMS costs about TZS 6 (G3: the drive's cap is 6 sends = TZS 36). Run inside 08:00–20:00 EAT.

**Decisions.**
1. **Pre-flight, read-only** — `npm run ops:marketing-preflight` (create; ONE `SET TRANSACTION READ ONLY` transaction
   through the Postgres public proxy, STEP 29's pattern): production serves the expected `?dpl=`; the U43-0 migration row is
   finished; the switch is closed; the settings values; the webhook secret set (`/api/health`); the credit (Admin → System
   or the balance endpoint); the test number's book row, list, consent/basis state and that no prior campaign exists for it;
   the control number's stop. Prints a go/no-go table.
2. **The run sheet** (written into the plan's §9 U52 and the admin guide — each step with its page):
   1. The owner (or Claude through the ops door, on Ali's word) opens the switch for 2 hours.
   2. Jay sends himself one composer test (send 1).
   3. Campaign A: a book list of two — Jay's number and the suppressed control — enumerate-confirmed ("Confirm these 2
      people?"), Started: Jay receives it (send 2), the control is SKIPPED `suppressed`. The receipt moves Jay's row to
      DELIVERED (U46a, the receipt's live proof).
   4. Jay taps the stop link on his handset (`/s/<token>`), sees the stopped page.
   5. Campaign B: the same list → Jay SKIPPED `suppressed`, the control SKIPPED; zero sends.
   6. Jay taps "start again" on the same link page.
   7. Campaign C: Jay only — Start, Pause after it is RUNNING, Resume, finish (send 3).
   8. The switch is closed (by the owner or the ops door) and read back closed.
   Spare: 3 sends for one retry of any step.
3. **Evidence, read-only** — `npm run ops:marketing-campaign-evidence -- <campaignId>`: the recipient rows (masked), their
   statuses, skip reasons, references, the matching `SmsMessage` rows and receipts, the audit rows of E24, the slice
   timings (gate ms, send ms per slice) — and the discrimination table (eligible sent ∧ suppressed refused in the same run;
   after the stop tap, refused). Compared with the Blackball portal's Out SMS `COUNT` (Jay or Ali reads it).
4. **Re-derive** `SLICE_START`, `SLICE_GATE_BUDGET_MS`, `REAP_AFTER_MS` and `STEP_GAP_MS` from the measured timings
   (recorded in the plan; changed only by a commit).
5. **The drive fails if the gate is removed** — the refusal is the evidence, not the send (the plan's RED): the evidence
   script exits non-zero unless the control is SKIPPED in campaigns A and B and Jay is SKIPPED in B.
6. Ledger: `.qa-shots/marketing-setup/U52a/ledger.json` (gitignored) — every send counted; the run refuses a seventh.

**Files.** `scripts/live/marketing-preflight.mjs` (`ops:marketing-preflight`), `scripts/live/marketing-campaign-evidence.mjs`
(`ops:marketing-campaign-evidence`), the plan's §9 U52 (the run sheet), the admin guide v2 (each step with its screenshot — Ali,
2026-10-03).
**Owner decisions.** The test number and Jay's time (Q4), the control number (Q4), the switch window (G1), the TZS 36 (G3),
and after it — G2.

---

## 5 · Shared rules for every unit in this track

1. **Each push's battery** (Ali, 2026-10-02): typecheck · `next build` · `test:source-bytes` · the unit's suite and red ·
   every guard whose script reads a file the commit MODIFIES · `test:dal-parity` + `test:red-anchors` when a twin or an
   anchored file changes · a browser drive only for a changed screen (tiles opened and read) · the Postgres probe only when
   a query or the schema changed · the ~49 wiring pins when the predeploy line changes. U43y and U52a run the WHOLE chain.
2. **`prisma generate` after any schema change** before the battery (a stale client hides a new enum value).
3. **New reds are in-process** (`--prove-red`). Additions to the four file-mutating harnesses (erasure, sms-dlr,
   sms-cost-guard, blackball) are anchors in `scripts/anchors/*.anchors.mjs`, each resolving exactly once, run DETACHED and
   ALONE.
4. **The tracker rides in the same push**: the §0 STEP, the §1 row, the §9 body, every decision as an OD; this file's E-numbers
   map to ODs in the order they first ship.
5. **Docs that may only name what exists**: `test:docs` scans `docs/*.md` (not `docs/marketing-specs/`) — a script key or
   `scripts/` path is named in the tracker only in the commit that creates it.
6. **No phone number** in an audit payload, a log line, an error string, a gate trail or a skip detail (§5.14) — the settle
   rule set refuses one.
7. **Prove live by what reverses**: `?dpl=` moves AND something the old build lacked is served (a sentence, a chunk), never
   the build id alone; the migration by the deploy log.
8. **⛔ Never push while a campaign is PREPARING or RUNNING** (from U47b on): pause it first, push, prove live, resume.
   Deploy skew would stop every open driver, a receipt reaching the old instance in the overlap would skip U46a's arm, and
   the reaper's 10-minute heal is a safety net, not a routine.
9. **Every suite that drives `dispatchSlice` or the test send injects an open window** (from U13 on) — batteries on this
   laptop often run at night, outside 08:00–20:00 EAT.

---

## 6 · Risks across the track

- **R1 · The shared rail.** Blackball's rate limit is unknown (BLACKBALL-SMS §8 item 4). One slice at a time, a 2 s gap,
  the OTP-failure wait and the credit kept for codes are the mitigations; U52a measures.
- **R2 · The gate's cost.** Up to 10,000 transactions read per consenting player for harm markers; E11 bounds a slice by
  time, the money yield keeps it off the pool's back.
- **R3 · The page as the driver.** Sending stops when the last acting page closes (U44 later); the page says so; the
  reaper heals a crash; deploy skew stops the loop honestly.
- **R4 · Deploy order.** U43-0 must be live before U43b; U16a before U42; U33a-G before U13 and U43b. Each push checks the
  migration folder against production's.
- **R5 · Spam complaints → a TCRA sender block → login and withdrawal codes lost** (U33a R2). Kept: stops first, the opt-out
  link in every SMS, the window, the TZS 10,000 first cap; U14 before a second campaign; watch the `/s/` stop rate after
  the first campaign (U48a's stopped-by-link figure).
- **R6 · D19 residuals.** The floor of 10 raises the bar; differencing two large filters remains possible (recorded).
- **R7 · The evidence-based reaper** relies on `sendBatch` writing rows before the wire; pinned by a source-order check.
- **R8 · The webhook secret** travelled in chat; until rotated, a forger who has it can mark rows delivered (no money
  moves). E29 makes rotation cheap.
- **R9 · Licence outreach** (OD57/OD58) is the U33a track's; this engine sends to whatever the ONE gate allows and records
  the basis per recipient.

---

## 7 · Questions only Ali can answer (each with the default that is built)

1. **The money settings** (Admin → System → Marketing SMS; change any by saving the card). *Built:* price **TZS 6** per
   SMS until our sends measure it (your G9 answer); **TZS 20,000** of SMS credit always kept for login and withdrawal codes
   (marketing stops before the credit falls below it); **TZS 10,000** the most one campaign may spend (your G3 answer for
   the first campaign).
2. **How long "Switch on" lasts.** *Built:* the switch turns itself off after **2 hours** unless you choose 30 minutes to
   24 hours when you switch it on — so a forgotten switch never stays open.
3. **The send window.** *Built:* **08:00–20:00 EAT**, editable on the card between 07:00 and 21:00. Should the Responsible
   Gambling page promise it publicly? *Built:* no — the code keeps the window either way; publishing it is a save on the
   Public policy lines card when you want.
4. **The live test (U52a).** *Built:* Jay Kaba (+255 772 619 619) signed in as himself, at most **6 SMS (about TZS 36)**,
   inside the window. Please name a **second number to keep permanently on the stop list** as the "refused" control (a
   50pick test SIM — a stop is kept for ever). *If none:* the drive proves the refusal on Jay's own number before and after
   he taps the stop link, and records that the same-run control was not done.
5. **Rotating the delivery-receipt secret** (it travelled through chat). *Built:* the platform accepts the old and the new
   secret together while you change the URL in the Blackball portal; *default:* rotate before the live test, in a quiet
   hour.
6. **Who may press Start.** *Built:* any growth officer with send rights — but only while YOU have switched marketing SMS on,
   so the switch is your go-ahead for every campaign (G2). *Alternative:* Start for the owner only.
7. **A campaign keeps sending only while its page is open** in this release (the background sender comes later). *Built:*
   the page says "Keep this page open while it sends". Is that acceptable for the first campaign (about 1,600 SMS, a few
   minutes)? *Default:* yes.
8. **G2 — the first real campaign:** the Swahili message (it must start "50pick"), who receives it, and the day. Nothing is
   built to decide this for you.
