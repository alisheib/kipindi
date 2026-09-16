# Commit 5 · reporting, data rights, resolver exposure, staff edge — SPEC (rulings 168+)

> # ⛔ D19 OUTRANKS EVERYTHING IN THIS FILE
> **Owner ruling D19 (Ali, 2026-09-16, PROGRESS.md "OWNER RULING D19"): house bots are never public, and the holder sees
> nothing.** No public text (D19a). The regulator keeps its private paper, and the admin console, the audits and the
> internal docs are unchanged (D19b). Stakes 50pick places on a holder's account look exactly like the holder's own bets,
> and the holder receives no house-bot notice or email (D19c). The chatbot discloses nothing but never lies (D19d, Commit 6).
>
> **The holder-facing half of `C5-SPEC-EXTRACT.md` is struck** (item 12, §5 rows 13–17, §6 step 13, the `seed-house-stake`
> route, every player key). §1 below names every recorded text this file supersedes.
>
> **This file IS an authority for Commit 5**, the way `C4-SPEC.md` is for Commit 4. Where it differs from
> `C5-SPEC-EXTRACT.md`, this file wins. The plan's own order still applies above it (`04` > `02`/`03` > `PLAN` > `01`),
> except where a ruling below records a deliberate, named departure, and D19 outranks all of them.
>
> **Anchors.** Every `file:line` is as measured at `d15eeb70` (branch `house-bots`) by the six research areas and their
> adversarial challenges. **Re-derive every anchor before editing**: a line number is a pointer, never a contract.
>
> **How the rulings were taken.** Six areas researched Commit 5 at `d15eeb70`, drafted rulings, and had each draft
> challenged (STANDS / AMEND / REFUTED). Where a draft stood, it is taken; where it was amended or refuted, the amended text
> is taken; every missed point is folded in as a ruling or a register row (§8); every D19 leak is closed by a ruling or
> recorded as an accepted residual with its reason (§2). The orchestrator's fixed adjudications of the conflicts between
> areas are applied as given. Each ruling carries **Source** (area · point · verdict) and **Proof** (the cases and
> mutations that will prove it; both stores unless stated).
>
> Area names used in **Source**: `D19` = d19-register-absence · `REP` = reports-r1-r7-r8 · `BOOK` = book-entry-staffedge ·
> `EXP` = r9-r2-exposure · `DSAR` = r5-r6-data-rights · `R3` = r3-splits-r4. `ADJ n` = the orchestrator's adjudication n.

## 0. What this commit is

**Scope after D19, in one list.**
1. **The D19 defects first:** `/api/health` names nothing about house bots; both releasable data-rights doors carry no
   house marker, key, id or word; a player's actor-side audit reads drop house-owned actions; money idempotency probes
   stop counting house rows; the client-bundle law and one absence vocabulary.
2. **Readers:** the house book's entry split and staff scorecard (one function), the fee withheld per bot, the per-market
   house stake reader, the durable audit window, and every new store member in both twins.
3. **R9 + R2:** a `houseStake` snapshot on six decision audits; the house stake line on the admin resolver, market,
   objection, round and KYC surfaces, built on the server; the emergency-void admin notice's house share.
4. **R1 + R7 + R8:** the house-liquidity report (regulator paper, D19b), the house-market statement, the transactions CSV
   house filter and column, the owner-only per-bot CSV route, the audit index, and the two durable-reader swaps.
5. **Staff edge:** the monthly admin alert (moved in from Commit 4, C4-SPEC ruling 78) with its copy row and render.
6. **R3 + §9 + R4/F9 + D6:** the statutory house lines on admin screens and regulator paper, the harm and AML exclusions,
   the marker source pins, the reward walker, and the pin that keeps the bot on the public leaderboard.
7. **R5 + R6:** the owner-only internal house record (the only home of R5's projection), the officer player page's direct
   read and admin chip, and the `test:erasure` house buckets.
8. **Proofs:** `test:house-bot-reports` on both stores, the service-layer absence sweep for every viewer, and
   `qa:house-bot-holder-view` extended to every viewer and a production-posture pass.

**What Commit 5 must never build.**
- The holder chip, the "Placed by 50pick with your permission" line, `SellButton`'s `houseStake` state, the
  activity-feed chip, and any `market.houseStake*` or other player i18n key. `sell-button.tsx` and the markets page's
  `heldLabel` are not edited (L21/L22 stay Ali's).
- Any house section, house key, house id, `houseAuditCount`, `liquidityDecisions` or `schemaVersion` bump in a
  **releasable** export: `exportUserData` (the player) or `buildDsarBundle` (the officer's file for the data subject).
- The payload-based `getAuditForActorDurable({excludeHouse})` (R5's `NOT (payload ? 'houseBotId')`).
- `src/app/api/dev-test/seed-house-stake` (03 §7 phase E step 2).
- The Up & Down digest house split (A17 (h)): no house line or label in `dailyTotalsByUser`, `digestCopy`,
  `notifyUpDownDigest` or `updownDigestHtml`.
- A house word, identifier, template id literal, prop name or imported server-action name in any `'use client'` module,
  a `house` field in the client-reachable search grammar (`TXN_SEARCH`), or a `HOUSE_BOT` tone in `src/lib/status-tone.ts`.
- A house clause in any player notice, player email, resolution evidence, objection note or KYC note to a player.
- A new `red:` key, a new `EVENT_KINDS` entry, or a new `HOUSE_AUDIT` action.

## 1. Superseded texts (each named, with its replacement)

Each text below is marked superseded **in place** in the same commit that builds its replacement (ruling 258), never
silently edited.

| # | Superseded text | Replaced by |
|---|---|---|
| S1 | `PROGRESS.md:131` (RESUME AT item 4): "the officer's DSAR view keeps the full house section" | The officer's DSAR view **is the owner-only internal record** (ruling 236). `buildDsarBundle` is the data subject's Art. 15 file ("access: Granted (this document)", `privacy.ts:317-318`) and stays house-free (ruling 168). |
| S2 | `C5-SPEC-EXTRACT.md:108` (officer door "same section, `schemaVersion: 2`"), `:107` (player door "add `houseLiquidity`; personal reads exclude house rows; add `houseAuditCount`"), `:159` (§3 item 5 R5 "Both doors, bundle `schemaVersion: 2`", personal reads with `excludeHouseBets`/`excludeHouse`, trigger players "both doors"), `:184` (§4 `test:dsar-secrets` "both doors contain … `houseLiquidity.designations[0].consent.verifiedAt`"), `:231` (§6 step 11), `:292` (§8 guard 15 "the house section must be added to both doors in the same shape") | Rulings 168–170 (both releasable doors house-free, one transaction projection, house-owned audit actions dropped), 236–239 (the internal record), 243 (`test:dsar-secrets` §6–§9 prove absence). Guard 15's premise is gone: no releasable door gains a section, so §5 stays green by construction. |
| S3 | `C5-SPEC-EXTRACT.md:36` W2 "a trigger player's export shows excluded days + countered count only" | PROGRESS W2 as re-opened by D19: no releasable export carries house wording, a trigger player's included; excluded days and the countered count live only in the internal record (rulings 236, 239). |
| S4 | `C5-SPEC-EXTRACT.md:41` §0 "Dependency on Commit 4: steps 8–11 are not built … cannot close visually until step 9's emitter renders" | Resolved: Commit 4 is closed; `notifyAdminsHouseBotAlert` exists (`notification-service.ts:2526`). What Commit 5 owes is the STAFF_EDGE copy row and its renders (rulings 220, 222). |
| S5 | `C5-SPEC-EXTRACT.md:79` §1 "(h) the A17 liquidity label on every holder outcome notice … `houseStake?: boolean` option" as "already landed" | Removed by C4 rulings 143–144. Commit 5 regressions assert the label's absence (ruling 250). |
| S6 | `C5-SPEC-EXTRACT.md:75-76` §1 (d)/(e) `HOUSE_POSITION` / `house_position_no_exit`, (f)/(n) `objHouseStakeOnly` | C4 rulings 146–147: `WINDOW_PASSED`, `exit_window_closed`, `objNotEligible`. |
| S7 | `C5-SPEC-EXTRACT.md:166` item 12, `:136-146` §2 holder-facing table, `:181` §4 "Props assertion for the holder chip surfaces (HB-ACC-14)", `:210-214` §5 rows 13–17, `:217` the seed route, `:233` §6 step 13, `:284` guard 7 (`test:feedback-law` on `sell-button.tsx`), `:286` guard 9 (player chip keys) | D19c. Absence renders and served-HTML assertions (rulings 247–248, 253). |
| S8 | `C5-SPEC-EXTRACT.md:245` P3 recommendation "`houseStakeByMarket` becomes the single producer and `oversight.ts` switches to it" | One requester RULE, not one reader: oversight keeps its own population and recomputes (rulings 178, 187). |
| S9 | `C5-SPEC-EXTRACT.md:248` P6 "the audit takes the zero shape" on a failed read | `houseStake: null`, never a zero shape (ruling 190). |
| S10 | `C5-SPEC-EXTRACT.md:254` P12 (a) "the two DSAR doors exclude" house rows; `:257` P15 two actor words | Rulings 168, 170 (no exclusion; house rows stay as own rows) and 238 (three actor words). |
| S11 | `C5-SPEC-EXTRACT.md:250` P8 "owner-only + `house_bot.exported` for commit 7's per-bot CSV button" | The per-bot CSV **route** ships in Commit 5 behind the amended gate (ruling 213); Commit 7 renders its buttons. |
| S12 | `C5-SPEC-EXTRACT.md:95` and `:162` "`getReportPack` → `getAuditByActionsDurable([...], {category:'ADMIN'})` filtered by `targetId`"; `:179` "the pack state survives 12,000 BET rows" | `getAuditForTargetsDurable` filtered by target AND actions in SQL (ruling 214); the ring-emptying proof (ruling 216). |
| S13 | `C5-SPEC-EXTRACT.md:164` "(pinned by C13's +60-day test)"; `:163` and `:122` "of which 50pick liquidity stakes" | The +60-day href test is Commit 7's (ruling 255, L38). KYC wording "of which house stakes" (ruling 197). |
| S14 | `C5-SPEC-EXTRACT.md:271` P29 "(a) stays in Commit 4 step 9" (the digest split) | Struck by D19c; only F6's email rule remains (ruling 235). |
| S15 | `docs/COMPLIANCE-DECISIONS.md:268` W2 row "excluded days + countered count only" | Rewritten to PROGRESS W2's re-opened default (ruling 258). |
| S16 | `03-design-spec.md` §7 phase E step 2 (`seed-house-stake` "stamps `houseBotId`" on existing rows) | Not built: the marker is create-only in both stores, so such a route cannot work through the DAL; the real-service scratch-database fixture is the method (rulings 253, 248). |
| S17 | `PLAN.md:829` §18 row "R3 fee withheld per bot" (premise: the per-stake fee is not recorded) | Refuted by code: settlement books each winner's commission share as `SETTLEMENT_COMMISSION` in ledger group `settle_<payout txn id>`, and that payout txn is marked. Derived from snapshot × `allocateFeeShares`, cross-checked against that ledger group (ruling 183). |
| S18 | `04-amendments.md:1329` (R9) "of which 50pick liquidity stakes: N · TZS X" | "of which house stakes: N · TZS X", a recorded departure on Ali's consistency rule (ruling 197). |
| S19 | `04-amendments.md:2102` placement of R2's overview exposure split (open / awaiting settlement / frozen) and the CAP_EXPOSURE held amount in Commit 5 | Moved to Commit 7 with the console overview (ruling 254, L39). |
| S20 | `04-amendments.md:1220` R5 events `{kind, from, to, at, actor}` | `{kind, at, actor}`, as built (`constants.ts:291-292`) and in N1/N2 §9 (ruling 238). |
| S21 | `04-amendments.md:1224-1227`, `:1230-1236` R5's personal section (house-excluding reads, `houseAuditCount`) and trigger-player lines in both doors | Rulings 168, 170, 239. |
| S22 | `04` R5 consent method "password entered by 50pick" printed on regulator paper | R1 prints only what the row stores (ruling 202); the internal record keeps the sealed field (ruling 237); the conflict goes to Ali as W24. |
| S23 | `04` R1 CA-17 per-bot CSV header "masked phone" | The report's masked id (`maskUserId`), because the file outlives erasure (ruling 213). |
| S24 | `03-design-spec.md:60` and `:317` (S7) the chip tone as `TONE_CHIP[STATUS_TONE.HOUSE_BOT_*]` in `src/lib/status-tone.ts` | A server-side tone and word map (ruling 186); `status-tone.ts` is value-imported by four client components. |
| S25 | `03-design-spec.md` §3 "admin sentences are built only in `feed-copy.ts`" | Widened for R2 by `exposure-copy.ts`, as C4 ruling 141 widened it for `alert-copy.ts` (ruling 192). |
| S26 | `01-scenario-register.md` HB-LC-24 placing the capped-commission fee test in `test:house-bot-money`; FS-29 / HB-LC-24 "never recomputed from rates" | The fee cross-check lives in `test:house-bot-reports`' Postgres half; the recompute is from the FROZEN snapshot and is proven equal to the ledger (ruling 183). |
| S27 | `PLAN.md:134-141`, `:479`, `:501`, `:520` ("for non-holders"); `02-sealed-flows.md:431-435`; `03-design-spec.md:322-340`, `:452`; `01` HB-ACC-12/14/32/40, CRA-04/10/27, FS-25/30 | Marked superseded by D19 in place (ruling 258); the coverage gate names each id in its absence form (ruling 250). |
| S28 | `PROGRESS.md` X8 "The drop count stays on `/api/health` (X5)" and X5 "on `/api/health` and the strip" | Under D19 the count lives only on the admin-gated reader and Commit 7's strip (ruling 172). Ali is told. |
| S29 | `PROGRESS.md:517`, `04-amendments.md:592`, `:1542` (REL-5 reads `houseBots.schemaReady` from `/api/health`) | REL-5 reads the schema state from the admin reader (ruling 172). `PROGRESS.md:491` and `04:1540` read only `ok` and stay. |
| S30 | `C4-SPEC.md:21`, `:88`, `:203`, `:227`; `C4-EMITTERS-EXTRACT.md` §9 and E13 (the digest house split scheduled in Commit 4 step 9) | Struck by D19c; recorded as a Commit 4 residue closed by ruling 235 (L40). |
| S31 | `designation.ts:218` private `STATUS_WORD` with ACTIVE → "Running" | One shared server-side map using 03 §1's chip words (ruling 186). |
| S32 | `04` R8 naming `getAuditByActionsDurable` for `getReportPack` | A deliberate, recorded difference: `getAuditForTargetsDurable` (ruling 214). |
| S33 | `docs/HOUSE-BOTS.md` :3, :163, :217, :223, :258, :259, :621-627, :642, :698, :766; `docs/DATA-RETENTION.md` :28, :31, :32, :33, :100, :102; `constants.ts:291-299` and `:692`; `designation.ts:533`, `:591` docstrings; `comms-registry.ts:396-399` docstring; `user-service.ts:25-34`, `:68-69`; `book.ts:46-56`; `oversight.ts:4-9`; `planner.ts:7-11`; `house-bot-comms-cases.mts:330`; `house-bot-two-stores.mts:3-4`; `PROGRESS.md:419`, `:425` | Rewritten in the docs pass (ruling 258). |

## 2. Defects found on the branch before any Commit 5 code

Measured at `d15eeb70`. None is live in production: `origin/main` has no house code. They are the first code fixed (§3
step 2, right after the suite skeleton that proves them).

| # | Defect | Where | Fixed by |
|---|---|---|---|
| F1 | **`/api/health` publishes a `houseBots` block** (`schemaReady`, engine started/refused/inFlight, tick times, `hookDropped`) on a route the code itself calls public and the proxy does not gate. | `src/app/api/health/route.ts:50-52`, `:122-127`; `engine.ts:339-353` | 171, 172 |
| F2 | **`/api/health` `leadership` prints the lease name `house-bot`** whenever the planner holds its lease. The engine starts by default (`houseBotEngineEnabled` is `env !== 'false'`; instrumentation starts it regardless of the master switch), so removing `houseBots` alone still publishes `house-bot` to any visitor with the switch OFF. | `route.ts:121`; `constants.ts:48`; `engine.ts:136-137`, `:271`; `instrumentation.ts:61-72` | 171 |
| F3 | **The officer DSAR deliverable returns raw transaction rows.** On Postgres every row carries the key `houseBotId` (null for players), and a holder's rows carry `hb_…`. That file goes to the data subject. | `privacy.ts:303`, `:313`, `:318`; `prisma-dal.ts:410`; callers `admin/privacy/actions.ts:144-156`, `admin/players/[id]/actions.ts:75-88` | 169 |
| F4 | **LATENT: a house audit row with the HOLDER as actor** would reach the holder's downloaded export and `/profile/account` feed. `withdrawHouseConsent` writes `house_bot.holder_withdrew_consent` with `actorId` = the holder and `{botId, holderUserId, …}`; ruling 154's strip is key-based and leaves the action name and bot id. No src caller today. | `designation.ts:582-584`, `:591-594`; `audit.ts:749-791`; `user-service.ts:36-48`, `:86`, `:195-200` | 170 |
| F5 | **Money idempotency probes and deposit reads are flooded by house rows.** Bounded per-user windows read the newest N transactions; about 100 house bets between two refund attempts push the prior refund out of a 200-row probe, and it is paid twice. | `wallet-service.ts:2329`, `:2468` (AGENT_REGISTRATION_FEE pay/refund, 200 rows); `wallet-service.ts:494` (`cumulativeDepositsTzs`, 1,000); `affiliate-service.ts:1159` (`hasDeposited`, 1,000) | 173 |
| F6 | **Recorded texts order a house section into the subject's file** (S1–S3, S15). Built literally they put designations, consent and events under "access: Granted (this document)". | PROGRESS.md:131; C5-SPEC-EXTRACT; COMPLIANCE-DECISIONS.md:268 | 168, §1 |
| F7 | **The absence vocabulary is defined three times and drifts** (`house[ -]?bots?` vs `house[_ -]?bots?`; `HouseBot` with and without a capital after it), and the bundle scan ignores file paths. | `house-bot-disclosure.test.mts:39-41`; `house-bot-holder-view-shots.mts:39-40`; `verify-house-bot-bundle.mjs:46-57` | 175 |
| F8 | **The served absence proof is blind**: it runs `next dev` with `HOUSE_BOT_ENGINE=false` (so F2 can never show), covers the holder only, and takes full-page screenshots the recorded 50pick visual rule forbids. | `house-bot-holder-view-shots.mts:73`, `:173-184`, `:236-246` | 248 |

**Planned-surface risks** (no code yet; each is closed by the ruling named): R1's house filter as a `TXN_SEARCH` field
would ship `houseBotId` to the client through `search-box.tsx:40` (174, 210) · engine health rendered through
`system-client.tsx` (172, 174) · the internal record offered beside "Export bundle" or to non-ADMIN staff (236) · a
`HOUSE_BOT` tone in `status-tone.ts` (174, 241) · staff-edge words invisible to both D19 guards (175) · report parameter
validation before the gate, an id oracle (199) · a per-bot CSV answering a PLAYER with 403 or "bot not found" (213) · R2
lines typed into fields that reach players (196) · Commit 7's nav label and action names (255, L33) · a second hand list
of the vocabulary for §9 copy (174).

### Every D19 leak the areas found, closed

| # | Leak (area) | Closed by |
|---|---|---|
| 1 | `/api/health` `houseBots` block (D19) | 171, 172 |
| 2 | `/api/health` `leadership` lease name (D19) | 171 |
| 3 | Officer DSAR deliverable carries `houseBotId` / `hb_…` (D19, DSAR) | 169 |
| 4 | Holder-acted `house_bot.holder_withdrew_consent` into export and feed (D19, DSAR) | 170 |
| 5 | R1 house filter via `TXN_SEARCH` into client JS (D19) | 174, 210 |
| 6 | Engine health through `system-client.tsx` (D19) | 172, 174 |
| 7 | An officer annex sent to the holder by mistake (D19) | 236: owner-only, never on `/admin/privacy`, classification sentence as the first key, `internal-record-…` file name |
| 8 | Commit 7 nav label, `/admin/house-bots` href, house action names in public chunks (D19) | 255, L33 |
| 9 | Proof blind spot: engine off in the served harness, no lease in a service suite (D19) | 247, 248 |
| 10 | Per-bot CSV route reachable by a logged-in PLAYER (REP) | 213: plain 404 before any lookup |
| 11 | Report parameter messages as an oracle before the gate (REP) | 199 |
| 12 | `DSAR_HOLDER_EVENT_KINDS` still documented as the holder's export (REP) | 238, 258 |
| 13 | A former holder later given an accounting-view staff role sees their own house stakes (REP) | **Accepted residual**, X13: role assignment is the owner's act; ROLE_CHANGED already pauses the bot. |
| 14 | W20: the repository is public, so this spec is readable (BOOK) | **Accepted residual**: only Ali can change visibility; repeated in the handover. |
| 15 | STAFF_EDGE / scorecard words invisible to both D19 guards (BOOK) | 175 |
| 16 | Staff-edge month logic or template words in `generate-button.tsx` / `report-pack-controls.tsx` (BOOK) | 174, 209 |
| 17 | KYC "Note to the player" beside the new house line (EXP) | 196, X9 |
| 18 | Emergency-void reason → bettors' bells and emails, objectors, public settlement proof (EXP) | 196, X9 |
| 19 | Objection decision note → objector (EXP) | 196, X9 |
| 20 | Ceremony evidence → public resolution panel (EXP) | 196, X9 |
| 21 | A holder promoted to staff reads R2 lines and the void notice's house share about their own account (EXP) | **Accepted residual** until Ali answers X13: they are staff; the bot is paused (ROLE_CHANGED). |
| 22 | R2 sentences, `houseStake`/`houseBotId` identifiers or officer ids in the four client controls (EXP) | 174, 192 |
| 23 | An officer's self-service export carries R9 `houseStake` with other officers' ids (EXP) | 170 |
| 24 | Officer bundle `houseBotId` (DSAR) | 169 |
| 25 | PROGRESS.md:131 and the extract order a house section into the bundle (DSAR) | 168, S1–S2 |
| 26 | COMPLIANCE-DECISIONS.md:268 W2 trigger default (DSAR) | 168, S15, 258 |
| 27 | Internal-record control shown or placeheld for non-ADMIN staff (DSAR) | 236 (a) |
| 28 | `withdrawHouseConsent` latent (DSAR) | 170 |
| 29 | 03 S7 tone in `status-tone.ts` (DSAR) | 174, 186, 241 |
| 30 | The R6 erasure refusal names the bot to the compliance officer who replies to the subject (DSAR) | **Accepted residual**, X12: sealed admin copy unchanged (designation 8.1); an officer-only line is proposed. |
| 31 | The S7 chip and its failed-read form shown to SUPPORT (DSAR) | **Accepted residual**, X10: admin surface, default as sealed. |
| 32 | A hand-listed §9 vocabulary narrower than the guards (R3) | 174 |
| 33 | A holder's all-house Up & Down day gets the digest bell but no email (R3) | **Accepted residual**, 235: no words, the C4 rulings 143–144 precedent. |
| 34 | FIU SAR Context column can name an account before switch-on (R3) | **Accepted residual** pending W21 (228): a confidential statutory FIU filing (D19b); default build as ruled. |
| 35 | The W21 alternative gated on `boardDisclosureSentAt`, a column with no writer (R3) | W21 reworded (227) |
| 36 | The internal-record export audit row shows on an ordinary trigger player's admin audit panel (DSAR) | **Accepted residual**, 236 (d), X10: an admin surface. |
| 37 | An officer's own export and `/profile/account` feed carry house words through the officer's own audit rows: `report.house-liquidity.generated` / `.failed` and `report.house-market-statement.generated` / `.failed` (the reports route writes `report.${id}.*` with the officer as actor; `liquidity` is a vocabulary word), and the per-bot CSV's `privilege_escalation_blocked` row if its target named the route (spec review) | 170 (the report actions excluded from a closed exported list), 213 (2) (neutral target, no route path) |
| 38 | The compliance harm-table holder chip (230) is shown to COMPLIANCE, the role the privacy card tells to reply to data subjects: the same human channel as X12 (spec review) | **Accepted residual**, X10: an admin surface, default as ruled in 230. |

## 3. Build order

Heavy Node on Ali-Blade15 (tsc, a Postgres suite, `next build`, `next dev`, Playwright, `test:all`, `test:house-bot-migrations`)
goes through `bash /c/Users/Ali/heavy-node-lock.sh run <session> <command>` when another session could run; light work does
not. Every step that changes a surface renders it and READS each screenshot before the next step starts (Ali, 2026-09-16).
Every logic change is proven on both stores with a case and a mutation before anything is built on it. Every step that
touches a `'use client'` file re-runs `test:house-bot-disclosure` and `verify:house-bot-bundle` on a FRESH `next build`
(ruling 174), not only at the close.

0. **Before any edit.** Re-derive every anchor this file cites for the step. Read the printed population of every
   ratchet the step can move (`test:type-scale`, `test:labels` ADMIN_PROSE_RATCHET, `test:decomment` CARRIER_CEILING = 20,
   `test:red-anchors` UNDECLARED_CEILING = 65, `test:orphans`, `test:house-page` §5.1) before touching it. Never raise one.
1. **`test:house-bot-reports` skeleton** — ruling **176**. The `package.json` key FIRST (`test:guards-exist`), the
   two-store runner, the R1 fixture month with rows at 23:59:59.999 and 00:00:00.000 EAT on both month boundaries, the §0
   pins, and the §1–§2 entry-split, scorecard and fee assertions, written before any reader or builder (each seen red, then
   green). No surface.
2. **The D19 defects** — rulings **168–175**. `dsarTxnView` on both releasable doors; `getAuditForActorDurable`
   `excludeActions` and the widened payload strip; `/api/health` with no house key and no house lease name; engine health
   on the admin-gated server reader with REL-3/REL-5 rewritten and the X8 reversal recorded; `db.txn.findByUser`
   `{excludeHouseBets}` and the four money reads; the client-bundle law; `scripts/lib/house-bot-vocabulary.mjs` with every
   consumer switched and a planted control each. **Render:** `/admin/system` engine-health card (server page) at 1280 and
   360. **Prove:** money 1.14 tightened + 1.14b/c/d, the idempotency-probe cases, engine 10.7/10.8/10.10, reports §0 (the
   169, 170 and 175 pins), `test:dal-parity` (170, 173), `test:lock-tx-threading`, `test:red-anchors`, the six health-string
   suites (171), `test:dsar-secrets` §9, and a fresh `next build` + `verify:house-bot-bundle` (the vocabulary module changed
   its consumers).
3. **Readers, DAL twins, the book and the pure modules** — rulings **177–186**. Every new store member in both twins with
   its `test:dal-parity` case; `stake-snapshot.ts`; `exposure.ts`; `entryRows`, the widened `houseBotBook`,
   `houseStaffScorecard`; `eatMonthWindow`; `feeInputs` and the fee derivation; the audit window; the shared homes
   (oversight helpers, the status word and tone map, the CSV cell module). **Re-run:** `test:dal-parity`,
   `test:house-bot-rules`, `test:house-bot-info-edge`, `test:house-bot-engine` §17 (both stores, plus a `requesterOf`
   mutation), `test:house-bot-money` §7 EXPLAIN, `test:house-bot-designation` (the status word), `test:txn-search`, and
   `test:house-bot-reports` §1–§2 (the step-1 assertions now green). No surface.
4. **R9 + R2 server side** — rulings **187–191**, **195**, **197** (the `kycMoneyFacts` fields). Run right after:
   `test:two-admin`, `test:officer-conflict` (both unedited), `test:bulk-resolve` + `red:bulk-resolve`,
   `test:red-anchors`, `test:house-bot-seam`, `test:read-tiers`, `test:kyc-copy-truth`, and reports §3 including the
   officer own-export case (170). Before the KYC edit, re-diff
   `src/app/admin/kyc/[id]/page.tsx` and `src/lib/server/kyc-risk.ts` against the latest `origin/main` (ruling 197).
   No surface yet.
5. **R2 display** — rulings **192–194**, **196–198**. **Render phase C at 1280 and 360, each with a house and a
   no-house fixture:** `/admin/resolver-queue` (card line, held-chip title in all three states, bulk bar count),
   `/admin/resolver/<id>` (viewer A and viewer C), `/admin/markets/<id>` (line + row tag), `/admin/objections` (row),
   `/admin/updown/rounds` (lever row), `/admin/kyc/<id>` (the line with and without money view). **Phase D (real route,
   modals):** the emergency-void confirm, the objection decision dialog, the round-void dialog, the bulk confirm, each
   read for the free-text hazard (ruling 196). **qa:cert-c1:** the emergency-void admin email with and without the house
   row. **Bell (phase C):** the emergency-void admin bell on `/notifications` with and without the house clause, en/sw/zh,
   at 1280 and 360 (§5 row 20). Fresh `next build` + `verify:house-bot-bundle` + `test:house-bot-disclosure` (four client
   controls touched).
6. **R1 report, statement, CSVs, picker** — rulings **199–213**, **217**. **Render phase C at 1280 and 360:**
   `/admin/reports?tab=library` (the house-liquidity card and month picker, including the default month from a
   staff-edge href), `/admin/transactions` (the house Select), `/admin/markets/<id>` (the statement button on a market
   with and without a house stake). **Artefacts:** the house-liquidity XLSX reopened with ExcelJS and its cells asserted;
   its PDF opened and READ page by page; the same for the house-market statement ("House stake: none" included).
   `scripts/report-renderers-smoke.mjs` and `scripts/reports-verify-live.mts` updated. Fresh `next build` +
   `verify:house-bot-bundle` (`generate-button.tsx` and the picker wrapper touched).
7. **Staff edge** — rulings **218–223**. **Render:** `qa:house-bot-bells` writes a STAFF_EDGE row and `/notifications` is
   photographed and read at 1280 and 360 in en, sw and zh; `qa:cert-c1` renders `houseBotAdminHtml` for STAFF_EDGE from
   `alertRow` output and it is read; the alert's href opens the library tab with the picker on the judged month
   (phase C tile). The bell PANEL stays NOT MEASURED under L12.
8. **R8** — rulings **214–216**. **Render phase C:** the report pack card in its new danger state ("Pack history could
   not be read completely — do not sign") at 1280 and 360; the RG engagement report's truncation sentence read in its PDF.
   Re-run `test:report-parity`.
9. **R3 statutory + §9 splits** — rulings **224–232**, **235**. **Render phase C at 1280 and 360:** `/admin/house` (the
   marker card), `/admin/finance` (House bots net tile, margin delta), `/admin/insights`, `/admin/compliance` (holder chip).
   **Artefacts:** GBT monthly pack (with and without marked money), FIU SAR (Context in and out of a window), match
   integrity (with and without a voided house-held market), daily ops — XLSX cells asserted, PDFs read. Re-run
   `test:report-parity`, `test:predictor-count`, `test:product-line`, `test:read-tiers`, `test:house-page`,
   `test:insights`, `test:updown-digest` + `red:updown-digest`, `test:red-anchors`, `test:house-bot-seam`,
   `test:house-bot-disclosure` (R3 NEW-server-only-copy AMENDED: after each §9 step).
10. **R4/F9 + D6** — rulings **233–234**. Re-run `test:leaderboard-order`, `test:report-parity` §5,
    `test:house-bot-disclosure`. No surface.
11. **R5 internal record + doors** — rulings **236–242**, **246**. **Render phase C at 1280 and 360:**
    `/admin/players/<id>` as ADMIN for a holder (S7 chip, transactions-tab row tag, the internal-record control), as ADMIN
    for a trigger player (control, no chip), as ADMIN for an ordinary player (neither), and as COMPLIANCE and SUPPORT for
    the holder (chip and row tag, NO internal-record control, no placeholder); the chip's failed-read form. Re-run
    `test:control-gates`, `test:orphan-actions`, `test:read-tiers` §8.19, `test:orphans`, `test:dsar-secrets`,
    `test:house-bot-disclosure`.
12. **R6 erasure tests** — rulings **244–245**. `test:erasure`, `red:erasure` (three new mutations, each red on its own
    assertion), engine 19.8b. No surface.
13. **Absence sweep + holder-view extension** — rulings **243**, **247–250**. The service-layer sweep on both stores
    (reports §11, including the health read, 171); the extended `qa:house-bot-holder-view` with every viewer,
    `buildDsarBundle` through the leak check, the production-posture pass, and every new page captured as VIEWPORT TILES
    at 1280 and 360 and read.
14. **Closing gates** — rulings **251–252**, rulings **253–257** (scope and register rows; 253's `git diff` check), then
    **258** (docs) and §8 (register rows):
    - every `test:house-bot-*` suite on BOTH stores (L18), not a chosen list;
    - `tsc`;
    - `test:all` in this tree and in a clean `origin/main` worktree, compared red by red (every red either identical on
      clean main or fixed here);
    - `verify:house-bot-bundle` on a fresh `next build` (L15);
    - `qa:house-bot-holder-view` extended (L20);
    - `qa:house-bot-bells` and `qa:cert-c1` renders read;
    - the mutation list (ruling 217) run from a scratchpad worktree harness, each red on its own assertion with an
      unmutated control, the tree clean after;
    - the 3-lens review, with one lens told to hunt API routes, DSAR deliverables and admin client chunks (the Commit 4
      D19 lens missed `/api/health` and the officer bundle);
    - docs and PROGRESS in the same commit.

## 4. The suite `test:house-bot-reports`, and the additions to other suites

### 4.1 `test:house-bot-reports` (new; `runTwoStores`, `scripts/lib/house-bot-reports-cases.mts`)

`M` = memory child only (static source pins, or a clock only memory can move). `P` = Postgres only. `B` = both stores.

| § | What it proves | Store | Rulings |
|---|---|---|---|
| 0 | **Static pins**, each with a planted control that goes red and a benign control that does not: R8 `getAuditPage` pin and RG write pin; the `.txn.create` marker pin and the direct-Transaction-writer pin; the reward walker; the D6 source pin; the TGT-38 requester pin (services, pages, client controls); the player-surfaces pin; the KYC house-field readers pin; the fee pins (FS-29 tokens, `allocateFeeShares` in `settleMarket` and `book.ts`, fee computed only in `houseBotBook`); the scorecard body pin; the resolution-path map pin; the I2 `exposure.ts` import pin; the "no HOUSE_AUDIT write with the holder as actor" pin; the single-vocabulary pin; the "no refusal branch reads the scorecard or verdict" pin; the "no DSAR door returns `db.txn.findByUser` rows unprojected" pin; the `attest.ts` no-builder import pin; the `status-tone.ts` no-HOUSE_BOT pin | M | 169, 170, 175, 179, 180, 183, 191, 197, 198, 201, 202, 215, 232, 233, 234, 241 |
| 1 | **Readers**: `stakeRows`/`houseStakeByMarket` (open vs settled after a settlement and after a void, CASHED_OUT excluded, a marked position with no intent in yes/no only, `byRequester`); `entryRows` identity AUTOMATIC + TARGETED + MANUAL + UNKNOWN = `dayRows` with UNKNOWN = 0 on seam fixtures and a planted no-intent control; officer attribution (A's Enter now, B's target updated by C) equal to `requesterOf`; the month boundary on both instants; settled statuses; the baseline tie | B | 178–182 |
| 2 | **Fee withheld**: the derived figure per bot and product, null (never 0) on a market with no own snapshot; the ledger cross-check per marked WIN position with zero tolerance, over a ≥5-winner fractional-tie loser-share poll, a capped-commission legacy-snapshot Up & Down round (HB-LC-24), a zero-share winner with no ledger line, and a no-snapshot market | B (cross-check P) | 183 |
| 3 | **R9 payloads**: exact key sets at both levels; the zero shape; TGT-38 values (A → [A], B's target → [B], both → [A,B]); six changed sites and six byte-identical ones; `houseStakes` only on Batch rows and `houseStake` only on Market rows; `null` under `failExposureReadForCases` with a flag-off control; `requestedBy` equal to oversight's exported fold for the chooser AND a non-chooser; an officer's own `exportUserData` has no `houseStake` key while `/admin/audit` data keeps it; an ADMIN who generated both house reports and wrote `house_bot.exported`, and a COMPLIANCE officer refused by the per-bot CSV, each export their own data with no 175 vocabulary word at any depth (control: the durable rows exist) | B | 170, 178, 187–190, 213 |
| 4 | **R2 display**: `exposure-copy.ts` parts; `viewerClause` for A, C, zero-house, and A+B on one market; the held-chip title's three states; the void notice figure equals `payload.houseStake.yes + no`; a non-house void's bell and email byte-identical to today's; player, holder and objector notice bodies byte-identical to their no-house twins; the KYC line (holder shows, non-holder byte-identical, no amount without money view, risk `.score` byte-identical) | B | 192–197 |
| 5 | **R1 report and statement**: parameter validation after the gate (a PLAYER gets 403 "Forbidden" for any period or market id; malformed, future, `0026-08`, unknown market); filename and reference carry the period or market id; every section reconciles; the ledger total equals `MoneySummary.house`; section 5's positionId join; the two returned lines; `bonusStakeTzs === 0` line; truncation sentence and "Completeness"; resolution-path values including "not found in the audit log"; UNKNOWN flag; reimbursements empty state; the index's wrong-category row found and a ring-emptied Postgres read; the statement's sections and "House stake: none" | B (ring-emptied index P) | 199–208 |
| 6 | **CSVs**: `house=only` / `house=exclude` exact under 500 rows on both stores, `house_bot_id` last; the clamp honesty case at 10 and 600 marked rows; the shared cell module (leading `=` `+` `-` `@` tab CR); per-bot CSV gate rows (1)–(4) with a PLAYER getting 404 with no bot lookup (a spy) and the frozen body (the served comparison with a missing sibling path is 248's), the exact header line, 501+ rows complete, `house_marked` exact, one `house_bot.exported` row and none on a refusal | B | 186, 210, 211, 213 |
| 7 | **Staff edge**: the day-01 gate cases (a)–(f) through `plannerPass` with `Date.now` fixed; TGT-39 with disjoint officers for variants (a), (b), (c); (c) returns `{off:true}` with no book read (spy); a second pass adds 0; the key literal `staff-edge:<X>:2026-09` (memory) and `${eatPreviousMonthKey(dbNow)}` (Postgres); the alert href and the picker default agree for a month-end and a year-end run | gate M, rest B | 209, 218–223 |
| 8 | **R8**: pack state `approved` with `preparedBy` and `historyIncomplete === false` after the ring is emptied, with `getAuditPage` returning none of the rows as the control; `historyIncomplete` true → the four pack actions refuse; 201 `rg.*` rows print the truncation sentence | P (ring-emptied proofs); pins M; historyIncomplete refusal B | 214–216 |
| 9 | **R3 / §9**: class A twin equality on every statutory figure; class B lines; class C populations equal the computation over unmarked rows; all = players + house; the GBT memo present only with marked money and the pack otherwise equal to its twin apart from the GGR note; memo stakes vs Σ `dayRows` over the pack's EAT days; the month-boundary net difference; FIU Context in and out of a window; match integrity house parts only with a voided house-held market, one bulk audit read, Resolution path values; 50 late-night house bets raise no LATE_NIGHT flag; `detectSuspiciousBets` ignores house stakes; the compliance chip; `/admin/house` rows; the digest email rule (house-only day: bell byte-identical, no email; mixed day: one email) | B | 224–231, 235 |
| 10 | **R4/F9/D6**: `leaderboard()` default equals a no-marker twin and ranks a holder's marked positions like a player's; `excludeHouse:true` drops only marked rows; the holder on the board and `predictorCount` counting the bot | B | 233, 234 |
| 11 | **Absence sweep, service layer**: every viewer (signed out, another player, the holder, a trigger player); needles and controls (i)–(iii); `/api/health` read after `acquireLeadership(HOUSE_PLANNER_TASK)` with the raw-snapshot positive control; a mutation re-adding a house key or the lease name goes red here | B | 171, 247 |
| 12 | **Internal record**: `exportInternalRecordAction` refuses a non-owner; the existence check runs for ADMIN only (a COMPLIANCE or SUPPORT render runs none of the internal-record reads — `houseBotStore.listByUserId`, `houseBotEventStore.listByUserKinds`, `houseBotIntentStore.counteredPositionsCount`, `houseLiquidityDsarView` — and renders no control or placeholder, a spy; the S7 chip's `findLiveByUserId` read is expected for every role, 241); cursor paging past 500 rows with a real total; the `house_bot.exported` row with `code: 'INTERNAL_RECORD'`; the classification sentence is the first key; `causes: null` + note when `readBotAndHolder` throws | B | 236–239 |

### 4.2 Additions to existing suites

- **`test:dsar-secrets`** (memory; predeploy): §5 unchanged. New §6 holder absence in both releasable doors (no key, id,
  prefix or word at any depth) with a CONTROL that the raw rows carry the marker; the crowd-out characterization at
  1,200 and 10,200 house transactions, labelled "recorded degradation (L31), not G1". §7 the trigger player's doors equal
  a no-box twin; 31 days after the AlertOnce purge the internal record still lists the day. §8 the internal-record
  allowlist (fingerprint, hash, officer-id and `triggerUserId` sentinels absent; a planted future `HouseBot` column absent;
  only the 17 kinds as `{kind, at, actor}`; no reason sentinel, no `marketId`, no press row, no
  `decision.counterparties`; `classification` first). §9 a planted future `Transaction` column never reaches either door;
  a source pin (planted control) that neither `user-service.ts` nor `privacy.ts` imports `house-bot/dsar`; the officer
  page's lifetime KPIs equal for a holder and a non-holder. Every new assertion gets a recorded scratchpad mutation (the
  suite has no red harness). Rulings 168, 236–243.
- **`test:house-bot-money`**: 1.14 tightened to the exact 23-key set on the player door; 1.14b the officer bundle; 1.14c a
  non-holder's officer bundle has no `houseBotId` key (its proving half is Postgres); 1.14d the holder-acted house audit
  reaches neither the export nor `getOwnActivity`, with a chain control; the four money-read cases with 1,000+ marked rows
  ahead of the target row; §7 EXPLAIN gains `entryRows` (all bots and one bot) and `feeInputs` (lifetime) on the 1M/20k
  fixture. Rulings 169, 170, 173, 180, 183.
- **`test:house-bot-engine`**: 10.7 → 200, measured after the planner lease is acquired: no key or value equals the
  pre-change literal `house-bot` or matches 175's vocabulary; under 171 (a) the planner task's key is absent from
  `leadership`, under 171 (b) the neutral name is checked against 175; POSITIVE CONTROL: the unfiltered
  `leadershipSnapshot()` holds `HOUSE_PLANNER_TASK` (whatever its value); 10.8 → the admin reader; 10.10 keeps the
  renamed-table 503 with `ok:false`; §17 `staffEdge` appended after the asserted 17.10 prefix, the marks literal read as "not run" when
  undefined; oversight swapped to `requesterOf` with §17 re-run and a mutation; 17.63 re-run after the oversight helpers
  move; 19.8b. Rulings 171, 172, 178, 186, 218, 245.
- **`test:house-bot-comms`**: the STAFF_EDGE delivery case (one bell per ADMIN recipient, one email per distinct
  address, 0 SMS, two officers in the same second both land); the STAFF_EDGE copy case with full detail and with `{}`
  (title ends ` · HH:MM:SS`; n, w%, a% or the no-baseline clause; the signed TZS figure; the localised month; the two
  hrefs; no reason, no player handle); `announceOnce` resolving `detail.officerId` to a name with the "an officer"
  fallback; the `:330` comment replaced. Rulings 220–222.
- **`test:house-bot-rules`**: `eatMonthWindow` pins; the module law over `staff-edge.ts`, `exposure-copy.ts`,
  `stake-snapshot.ts` (allowlist unchanged); the `failExposureReadForCases` pin (no src caller); `ALERT_KEY.summary`
  narrowed to `"admins"`; `DSAR_HOLDER_EVENT_KINDS` list unchanged (docstring only); 11.8 and 11.22 unchanged. Rulings
  182, 190, 192, 219, 238, 258.
- **`test:house-bot-disclosure`** and **`verify:house-bot-bundle`**: both import the vocabulary module; the admitted
  measured words each with a planted client-file control; the bundle scan also matches file PATHS under `.next/static`
  with a planted file-name control. Rulings 174, 175.
- **`qa:house-bot-holder-view`**: the extended page list and viewers, 4.2 (`buildDsarBundle` through `leaks()`), the
  production-posture pass, viewport tiles instead of `fullPage`. Ruling 248.
- **`qa:house-bot-bells`**: a STAFF_EDGE row with the TGT-39 X figures; 1.1 exactly 12, 1.2 at least 12; en/sw/zh at 1280
  and 360. Ruling 222.
- **`qa:cert-c1`** (visual pass): `houseBotAdminHtml` for STAFF_EDGE built from `alertRow` output; `marketCancelledAdminHtml`
  with and without the house row. Rulings 195, 222.
- **`test:erasure`** / **`red:erasure`**: ruling 244. **`test:dal-parity`**: ruling 177. **`test:house-bot-seam`**:
  `SEAM:emergencyHouseShare`, HB-ACC-13 named (rulings 195, 249). **`test:txn-search`**: `house` in `matchesFilters`
  (ruling 210). **`test:report-parity`** §2 canonical JSON with a nested-difference control (ruling 225).
  **`test:house-page`** §5.1 read list (ruling 231). **`test:house-bot-designation`**: the status word (ruling 186).

## 5. Surfaces to render

Admin surfaces only; every PNG opened and read. Phase **C** = the admin static harness; phase **D** = the real-route client
pass (modals are NOT MEASURED in C, 03 X3). Widths: 1280 and 360 at minimum (the admin harness's 320/640/768/1024/1920 as
well where the step's harness already takes them). Viewport tiles, never full-page shots, with the nextjs-portal hidden.

| # | Surface | Route | Fixture | Kit neighbour it must look like | Phase |
|---|---|---|---|---|---|
| 1 | House-liquidity card + month picker | `/admin/reports?tab=library` (and `…&range=custom&from=2026-09-01&to=2026-09-30`) | a designated bot, REMOVED one included; a staff-edge href | the existing TEMPLATES cards (`AdminCard` + severity glyph tile + `Chip size="sm"` target + cadence mono + formats pills + `GenerateButton`); a kit Select | C |
| 2 | Report pack card, history-incomplete state | `/admin/reports` | a pack whose durable read is truncated | the pack card's existing danger lines | C |
| 3 | House filter Select | `/admin/transactions?house=only` | marked and unmarked rows | the page's own `FilterSelect` | C |
| 4 | Queue card house line, held-chip title, bulk bar count | `/admin/resolver-queue` | a LIVE market pending resolution with an OPEN marked position; one market whose read fails; 3 of 8 selected markets house-held | the crowd/held row and held chip; "N selected · TZS X held" | C (bar), D (bulk confirm) |
| 5 | Ceremony house line + "of which chosen by you" | `/admin/resolver/<id>` | a poll with a PLACED staff-chosen stake by A; viewed by A and by C | the pools line inside `AdminCard` | C |
| 6 | House line, "House bot · <label>" row tag, statement button | `/admin/markets/<id>` | one marked and two unmarked OPEN positions; a market with no house stake | pool figures; positions table rows with `Chip size="sm" variant="neutral"` | C |
| 7 | Objections row line; decision dialog slot | `/admin/objections` | an OPEN objection on a house-held unsettled market | the "Pool held" column; `ObjectionDecision` | C (row), D (dialog) |
| 8 | Emergency-void confirm slot | `/admin/markets` | a LIVE house-held market | `ConfirmVoid` | D |
| 9 | Round lever house line; round-void dialog | `/admin/updown/rounds` | an open round holding a marked position | the volume cell and `VoidRoundControl` | C (row), D (dialog) |
| 10 | "of which house stakes: N · TZS X" | `/admin/kyc/<id>` | a holder case with marked BET_PLACED rows; viewed with and without money view | the "Bets placed" `Field` | C |
| 11 | S7 chip, transactions-tab row tag, internal-record control | `/admin/players/<id>` | a live holder; a trigger player; an ordinary player; viewers ADMIN, COMPLIANCE, SUPPORT; a failed chip read | the KYC chip row; the export button | C |
| 12 | Marker card (net result, open stake) | `/admin/house` | a settled house fixture; a failed read | `AdminKpi` in its own `AdminCard`, `amount` class, never gold | C |
| 13 | House bots net tile + margin delta | `/admin/finance` | house stakes > 0 and = 0 | `AdminKpi` with its one `delta` | C |
| 14 | §9 lines | `/admin/insights` | marked rows | the existing insight rows | C |
| 15 | Harm-table holder chip | `/admin/compliance` | a holder flagged RAPID_DEPOSIT_ESCALATION | the existing marker chips | C |
| 16 | Engine health card | `/admin/system` (server `page.tsx`) | engine started; engine refused | the existing system cards | C |
| 17 | Staff-edge bell | `/notifications` | TGT-39 X figures, en/sw/zh | the other house alert rows | `qa:house-bot-bells` |
| 18 | Staff-edge email; emergency-void admin email with and without the house row | — | as above | the other house admin emails; `marketCancelledAdminHtml` | `qa:cert-c1` |
| 19 | Generated artefacts: house liquidity, house-market statement, GBT pack, FIU SAR, match integrity, daily ops, RG engagement | XLSX + PDF | the R1 fixture month | the GBT pack's section/column/notes shape | ExcelJS cells asserted; PDF read page by page |
| 20 | Emergency-void admin bell with and without the house clause (195), en/sw/zh | `/notifications` at 1280 and 360 | an emergency void of a house-held market and of a no-house market; viewer an ADMIN | the existing SECURITY bell rows | C |

**Absence renders** (served HTML and RSC payload scanned; new pages photographed as tiles and read; ruling 248):

| Viewer | Pages |
|---|---|
| The holder | the existing ten holder pages, plus `/profile/account`, `/profile/activity`, `/updown/history`, `/updown/<roundId>` with a house Up & Down stake, `/api/positions/settled?markets=`, `/api/events` (the holder's session); their export and their officer-built bundle |
| A trigger player (boxed through the real sweep or `boxAccount`) | the same pages and both files |
| A signed-out visitor, and another player | `/`, `/markets`, `/markets/<id>`, `/live`, `/updown`, `/updown/<roundId>`, `/leaderboard`, `/results`, `/api/fairness/recent`, `/api/health`, `/api/og/market/<id>` (status and headers) |
| A PLAYER session, the holder's included, on the production-posture pass (213 (1)) | `/admin/house-bots/<existing bot id>/export` and `/admin/house-bots/<unknown bot id>/export`, each compared with a non-existent sibling path under `/admin/` (status, body, every header except Date and request ids) |
| Production posture (engine on by default, master OFF, planner lease held) | `/api/health` |

## 6. Rulings this build takes (168+)

Numbered sequentially from `C4-SPEC.md`'s last ruling (167). A ruling is a decision a builder follows without re-reading
the research. **Source** names the area, the point and the verdict; **Proof** names the cases (both stores unless stated)
and the mutations, each run from a scratchpad worktree harness and seen red on its own assertion with an unmutated control
(ruling 217).

### 6.A · D19 defects and the client-bundle law

168. **Both releasable data-rights doors are house-free.** The two existing doors are RELEASABLE artefacts:
     `exportUserData` (the player's "Export my data" on `/profile/account`) and `buildDsarBundle` (the officer's "Export
     bundle" on `/admin/privacy` through `buildDsarBundleAction`, and "Export player data" on `/admin/players/<id>` through
     `exportPlayerDataAction`). The bundle is the data subject's Art. 15 file: `rights.access` is "Granted (this
     document)." (`privacy.ts:317-318`), the privacy card tells the officer to use it for access and portability
     (`dsar-controls.tsx:191-193`), and it downloads as `player-<id>-dsar.json`. Ali's dated decision already says the
     access right is served by the export itself.
     - Neither door gets a `houseLiquidity` section, `houseAuditCount`, `liquidityDecisions` or a `schemaVersion` bump
       (the bundle stays `schemaVersion: 1`).
     - Neither carries, at any depth: the key `houseBotId` or `intentId`; an id matching 175's bounded patterns
       (`hb[iethp]?_[0-9a-f]{24}` on word boundaries, `hb:hbi_[0-9a-f]{24}`; `constants.ts:63-65`, `:72`), or the fixture's
       own bot and intent ids; any word of the shared vocabulary (175).
     - A holder's house stakes appear in both exactly as own bets: the transaction rows (projected, 169) and the bet audit
       rows (key-stripped, 170).
     - Neither door's reads pass `{excludeHouseBets}` or `{excludeHouse}`: excluding house rows would make house stakes
       look different from own bets and leave unexplained gaps in the holder's `balanceAfter` history.
     - R5/G1's house section is built ONLY as the owner-only internal record (236), which no releasable door imports. No
       book, entry-split, scorecard, fee or exposure reader feeds either door.
     - This ruling supersedes by name §1 S1, S2, S3 and S15; the same commit rewrites `PROGRESS.md:131`, marks the extract
       lines, and rewrites `docs/COMPLIANCE-DECISIONS.md:268` (258).
     - **Source:** DSAR NEW-releasable-doors AMENDED; DSAR P12 STANDS (no exclusion); D19 draft 170 AMENDED (shape); ADJ 2.
     - **Proof:** `test:dsar-secrets` §6 (memory); money 1.14 / 1.14b / 1.14c (both stores; Postgres is the proving half
       for key presence); `qa:house-bot-holder-view` 4.1 and 4.2 on a scratch Postgres (248). Mutation: a door that
       returns one raw row → red on 1.14c (Postgres) and §6.

169. **One transaction projection for both releasable doors: `dsarTxnView`.** Add `dsarTxnView(t: StoredTxn)` to
     `src/lib/server/privacy.ts` beside `dsarUserView`. It is an ALLOWLIST of exactly `origin/main`'s 23 `StoredTxn` keys,
     in `toStoredTxn`'s order (`prisma-dal.ts:386-409`, measured): `id, walletId, userId, type, status, amount, fee,
     taxWithheld, balanceAfter, currency, provider, providerRef, providerStatus, payoutRail, msisdn, description,
     positionId, amlReason, createdAt, updatedAt, completedAt, idempotencyKey, pendingNotifiedAt`.
     - Values are copied verbatim, with no `?? null` (memory rows may lack `providerStatus`/`payoutRail`, and
       `JSON.stringify` drops `undefined`).
     - `exportUserData` replaces its destructure at `user-service.ts:70` with it; `buildDsarBundle` maps its
       `db.txn.findByUser(userId, 10_000)` rows (`privacy.ts:303`, `:313`) through it. Both deliverable callers go through
       `buildDsarBundle`, so one projection covers both; the bundle carries no audit entries, so no second strip is needed.
     - It REPLACES D19 draft 169's "one shared strip helper moved out of `user-service.ts:70`" (ADJ 3).
     - A source pin: no DSAR door returns `db.txn.findByUser` rows unprojected.
     - The bet-audit key strip (`user-service.ts:36-47`) stays, because audit payloads are heterogeneous and cannot be
       allowlisted (170).
     - `UserDataExport` (`user-service.ts:25-34`, already unused, in `test:orphans`' population) is deleted or typed from
       the function's own return, and the ruling-154 comment at `:68-69` is updated.
     - **Source:** DSAR NEW-dsar-txn-allowlist AMENDED; DSAR NEW-officer-bundle-marker-leak STANDS; D19 draft 169 STANDS
       (defect, key presence on Postgres); ADJ 3.
     - **Proof:** on Postgres the projected rows are BYTE-equal to `origin/main`'s mapper output for the same rows; on
       memory the parsed rows are DEEP-equal (memory rows keep their writer's key order, `store.ts:1378`). The key-set
       assertion is made on the in-process object: `Object.keys` equals the 23 (an `undefined` value still counts). Money
       1.14 is tightened to the 23-key set on the player door; 1.14b: a holder's officer bundle has no bot id, intent id,
       `hb:` or `houseBotId`; 1.14c: a NON-holder's officer bundle has no `houseBotId` key (today every Postgres row carries
       `"houseBotId": null`; vacuous on memory, so Postgres proves it). Each is seen red on the unfixed code first, then
       green. `test:dsar-secrets` §9: a planted future `Transaction` column never reaches either door. Reports §0: the
       no-unprojected-door pin. Mutations: `dsarTxnView` dropped from `buildDsarBundle` → red on 1.14c Postgres; a planted
       unprojected `findByUser` return in `privacy.ts` → pin red.

170. **A player's actor-side audit reads drop house-owned actions, and the strip drops R9's keys.**
     - `getAuditForActorDurable(actorId, {limit, excludeActions?: readonly string[]})` applies the exclusion in BOTH
       branches — the ring (`audit.ts:755-759`) and Prisma (`:761-775`) — BEFORE the limit, and counts `total` over the
       same filter. Prisma: `where: { actorId, NOT: { action: { in: [...excludeActions] } } }`. Never `startsWith`/`LIKE`
       on `house_bot.` (`_` is a LIKE wildcard).
     - `exportUserData` (`auditEntries`, `user-service.ts:86`) and `getOwnActivity` (`user-service.ts:173-178`, the
       `/profile/account` feed) pass `Object.keys(HOUSE_AUDIT)`. `HOUSE_AUDIT` is imported into `user-service.ts`
       (server-only), never into `audit.ts`, so the platform audit module stays house-agnostic.
     - `exportUserData` and `getOwnActivity` also exclude the report audit actions of the two house catalogue entries
       (`report.house-liquidity.generated`, `.failed`, `report.house-market-statement.generated`, `.failed`). They come from
       a closed list exported beside `REPORT_CATALOGUE`, never hand-typed, and go in the same `excludeActions` array.
     - The holder's house BET audit rows (`market.position.opened`) are NOT excluded: they keep ruling 154's key strip,
       so a house bet looks like an own bet.
     - The key strip (`withoutHouseAuditKeys`, `user-service.ts:36-48`) ALSO drops `houseStake` and `houseStakes` beside
       `houseBotId` and `intentId`, so an officer's self-service export never carries an R9 snapshot with other officers'
       ids. The durable rows and `/admin/audit` keep them whole. If Commit 5 adds any other house key to an audit whose
       actor can be a player, the strip grows in the same commit.
     - Not built: R5's `NOT (payload ? 'houseBotId')` and `houseAuditCount`.
     - **Source pin (planted control):** no `HOUSE_AUDIT` write under `src/` names the holder as its actor, outside tests.
       The one measured site, `withdrawHouseConsent` (`designation.ts:582-584`, `:591-594`, no src caller today), is listed
       by name as a Commit 7 debt and may only leave the list; the pin's second rule fails if any file under `src/` calls
       `withdrawHouseConsent` before Commit 7 reshapes it.
     - **Recorded for Commit 7 (L49):** D19c struck the holder-facing "Stop liquidity stakes" action (04 A3 F10). A
       withdrawal the holder asks for through support is recorded with the OFFICER as actor, so `withdrawHouseConsent`'s
       `actorId: holderUserId` is reshaped there.
     - **Source:** DSAR NEW-player-audit-house-actions STANDS; D19 draft 170 AMENDED (the added strip, pin and case); EXP
       MISSED (an officer's own export); ADJ 4.
     - **Proof:** money 1.14d (both stores): the test writes a holder-acted house audit through today's
       `withdrawHouseConsent`; it reaches neither `exportUserData().auditEntries` nor `getOwnActivity`'s rows; CONTROL: the
       row is in the chain. `test:dal-parity`: `excludeActions` on the ring and on Prisma, `total` over the filter.
       Reports §3: an officer who adjudicated a house-held market exports their own data and the file has no `houseStake`
       key, while the durable `market.adjudicated` row keeps it. Reports §3: an ADMIN who generated both house reports and
       wrote `house_bot.exported`, and a COMPLIANCE officer refused by the per-bot CSV, each export their own data. No 175
       vocabulary word appears at any depth. CONTROL: the durable rows exist. Mutations: the exclusion applied after the
       limit (a fixture with more house rows than the limit → red); the strip without `houseStake` (§3 red); a planted
       `withdrawHouseConsent` caller (pin red).

171. **`/api/health` names nothing about house bots, in any key.**
     - (1) Remove `houseBots` and its comment from the body (`route.ts:122-127`).
     - (2) The body's `leadership` (`route.ts:121`, `leadershipSnapshot()`) names no house task. **Decided at build time
       with the measured task list:** the builder reads `src/app/api/health/route.ts` and `leadershipSnapshot()` and
       chooses between (a) an allowlist of the platform's own lease tasks, or (b) renaming `HOUSE_PLANNER_TASK`
       (`constants.ts:48`) to a neutral lease name and moving the literal pins at `house-bot-engine-cases.mts:2641-2643`.
       Measured at `d15eeb70`: `acquireLeadership` is called with `LIFECYCLE_TASK` `"lifecycle"` (`lifecycle.ts:57`,
       `:447`) and `HOUSE_PLANNER_TASK` `"house-bot"` (`engine.ts:271`) only, and REL-5 reads `leadership.lifecycle.isMe`
       (PROGRESS:517). The choice and the re-measured list are written into PROGRESS with this ruling's number.
     - The REQUIREMENT is fixed now: no key or value of the public body names a house task or matches the shared
       vocabulary (175).
     - The readiness gate stays: a missing house schema still answers 503 with `ok:false`; the reason is only in the
       server log (`route.ts:55-62`); HEAD (`:235-249`) is unchanged.
     - **Source:** D19 draft 175 AMENDED; D19 MISSED (the lease name); ADJ 5.
     - **Proof (fixed now):** engine 10.7 on both stores, measured AFTER `acquireLeadership(HOUSE_PLANNER_TASK)` has run
       in the test process: 200, no `houseBots` key; no key or value equals the pre-change literal `house-bot` or matches
       175's vocabulary; under (a) the planner task's key is absent from `leadership`; under (b) the neutral name is checked
       against 175. POSITIVE CONTROL: the unfiltered `leadershipSnapshot()` holds `HOUSE_PLANNER_TASK` (whatever its
       value). 10.10 keeps the renamed-table 503 with `ok:false`. Reports §11 reads the handler the same way (247). The served production-posture
       pass (248): `HOUSE_BOT_ENGINE` unset, master switch OFF, the planner lease acquired, with a control that the engine
       started. Mutations: `houseBots` re-added → red on 10.7 and §11; the leadership filter dropped (or the old lease name
       restored) → red on 10.7, §11 and the production-posture pass. Re-run `test:health-readiness`, `test:alerting`,
       `test:payout-observability`, `test:product-line`, `test:multi-container`, `test:admin-2fa-honesty` (they pin
       health-route strings).

172. **Engine health moves to an admin-gated SERVER reader; REL-5 and X8 follow.**
     - `houseBotEngineHealth()` (`engine.ts:339-353`, X5's `hookDropped` included) and the house schema state render in the
       server component `src/app/admin/system/page.tsx`, never through `system-client.tsx` (`'use client'`), and are passed
       to no client component. The card's words are written in `page.tsx`. It renders for the house-alert audience (ADMIN,
       the predicate `houseBotAlertRecipients` follows, `alerts.ts:16-19`), ADMIN only by choice: engine state is the
       owner's operational record (designation 9.1 governs house alerts; other admin house facts are ruled per surface);
       for any other staff role the page renders nothing about it and no placeholder. Commit 7's
       strip and Commit 8's `ops:house-bots-status` read the same reader later.
     - Engine case 10.8 moves to this reader.
     - REL rows are rewritten in the same commit: `PROGRESS.md:517` and `04-amendments.md:592`, `:1542` (REL-5 reads
       `houseBots.schemaReady`) now read the schema state from the admin reader; `PROGRESS.md:491` and `04:1540` read only
       `ok` and stay.
     - PROGRESS records that this **reverses the clause "The drop count stays on `/api/health`" in Ali's X8 answer** under
       D19, and X5's "on `/api/health` and the strip" becomes "on `/admin/system` and Commit 7's strip". Ali is told in the
       handover.
     - **Source:** D19 draft 175 AMENDED; D19 MISSED (X8); ADJ 5.
     - **Proof:** engine 10.8 on both stores (a started engine and a refused engine each read through the admin reader);
       phase C render of `/admin/system` at 1280 and 360 as ADMIN and as COMPLIANCE; `test:house-bot-disclosure` and a
       fresh-build `verify:house-bot-bundle` find nothing in the system chunks. Mutation: the card passed through
       `system-client.tsx` → disclosure 1.1 red.

173. **A money idempotency probe or deposit read never counts house rows.** This is a MONEY CORRECTNESS fix built in
     Commit 5 (ADJ 14; fixed row L47).
     - `db.txn.findByUser(userId, limit, opts?: {excludeHouseBets?: boolean})` in both stores; default off, so every
       existing caller is byte-identical. On means `houseBotId IS NULL`, applied BEFORE the limit: in the Prisma `where`
       (`prisma-dal.ts:1562-1569`, `createdAt desc` + `take`), and in the memory twin inside `.filter(...)` BEFORE
       `.slice(-limit).reverse()` (`store.ts:1379`), or the window stays flooded on one store only.
     - It is passed at the four reads whose target types are never house-marked: `wallet-service.ts:494`
       (`cumulativeDepositsTzs` for `onRecruitDeposit`'s DEPOSIT_THRESHOLD prize, 1,000 rows), `affiliate-service.ts:1159`
       (`hasDeposited` for the first-bet prize, 1,000 rows), and `wallet-service.ts:2329` and `:2468` (the
       AGENT_REGISTRATION_FEE pay and refund idempotency probes, 200 rows). A non-holder's result is byte-identical (house
       rows are never DEPOSIT or AGENT_REGISTRATION_FEE); a holder's regains the rows the bot pushed out. Without it, about
       100 house bets between two refund attempts hide the prior refund and pay it twice.
     - **The four transaction rules apply:** an abort must escape `withLock`; any write inside a lock takes the caller's
       `tx`; snapshots and emits fire after the outer lock; lock-key helpers stay in `lock-key.ts`. This edit adds a
       filter to four READS only: no read or write moves into or out of a lock or transaction, and nothing new is written.
     - The same option serves the admin harm detector (230). This supersedes the amended D19 draft 170's "built for the admin
       harm detector only".
     - **Source:** R3 MISSED (bounded windows and the probes); R3 NEW-harm-exclusion part 1 AMENDED (the option);
       ADJ 14.
     - **Proof:** new `test:house-bot-money` cases on both stores, one per read, each with enough marked rows newer than
       the target row to push it out of the window (201+ for the probes, 1,001+ for the deposit reads): the pay probe
       finds the prior fee and does not pay again; the refund probe finds the prior refund and does not refund again;
       `cumulativeDepositsTzs` and `hasDeposited` see the holder's deposit; CONTROL: the same read without the option
       misses the row (the defect is live on the branch). A non-holder twin is byte-identical. `test:dal-parity`:
       `excludeHouseBets` in both twins, before the limit. Mutations: the memory filter moved after the slice (memory
       red); the option dropped at `:2468` (refund case red). Re-run `test:lock-tx-threading` (literal windows in
       `wallet-service.ts`, C4-SPEC §7 item 7) and `test:red-anchors`.

174. **No house vocabulary, template id, prop name or action name in any client module.** No word or identifier of the
     shared vocabulary (175), no template id literal, no prop NAME and no imported server-action NAME may appear in any
     `'use client'` module, admin ones included, or in any module a client value-imports. Measured reason: a local
     Next 16 build ships server-action export names in public chunks
     (`createServerReference("<id>", callServer, void 0, findSourceMapURL, "<exportName>")`, 207 of them, e.g.
     `addSourceAction` in `009kj3ua_1xiy.js`); destructured prop names survive SWC and esbuild; the proxy matcher leaves
     `_next/static` public. The disclosure walker skips `'use server'` modules (`house-bot-disclosure.test.mts:86-87`), but a
     client file's own import line keeps the imported binding name, so the walker catches a badly named action on the client
     side and `verify:house-bot-bundle` catches it in the build.
     - Commit 5's house copy is built on the server. The R2 copy module (192) is imported only by server components, server
       actions and `notification-service.ts`. Report card text, month labels and the transactions filter labels come from
       the server `page.tsx` as props.
     - Client components receive strings or server-rendered elements under neutral prop names (`exposureSlot`,
       `exposureState`, `exposureCountTemplate`, `label`, `query`), never `houseStake`, `houseBotId`, `requestedBy`,
       `byRequester` or an officer id. Officer actions a client imports get neutral names (`exportInternalRecordAction`).
     - Applies at least to: `emergency-void-control.tsx`, `bulk-resolve-bar.tsx` (with `BulkConfirm` and the field names in
       `bulk-resolve-types.ts`), `objection-decision.tsx`, `resolver/[id]/resolution-ceremony.tsx`,
       `updown/rounds/void-round-control.tsx`, `reports/generate-button.tsx`, `reports/report-pack-controls.tsx`,
       `privacy/dsar-controls.tsx`, `players/[id]/export-player-button.tsx`, `system/system-client.tsx`, and any new
       picker wrapper.
     - R1's house filter is a URL parameter read by the server page and the route into the server-only
       `TxnSearchFilters` (`txn-filters.ts`). It is NEVER a field of `TXN_SEARCH` in `src/lib/search/fields.ts`, which
       `index.ts:11-24` re-exports and the client `search-box.tsx:40` imports.
     - No `HOUSE_BOT` tone or word in `src/lib/status-tone.ts` (value-imported by `market-card.tsx`, `position-card.tsx`,
       `updown-card.tsx`, `proposals/status-badge.tsx`).
     - §9 strings and identifiers live in server modules (`catalogue.ts`, `report-money.ts`, `analytics.ts`, `insights.ts`,
       admin server components, or a helper under `src/lib/server/`), never under `src/lib/house-bot/` (pure modules that
       only disclosure §1.2 keeps out of client graphs; the R2, alert and staff-edge copy modules there exist only under that
       guard, and no §9 string is added there), and reach the browser only as a per-request RSC prop on an admin route.
       No second hand list of patterns: the guards' own module (175) is the list, and neither guard's exemptions are
       widened.
     - No `'use client'` module value-imports `alert-copy.ts`, `book.ts`, `staff-edge.ts`, `exposure-copy.ts`,
       `exposure.ts`, `stake-snapshot.ts`, `dsar.ts`, `status-display.ts`, `decision-audits.ts`, `attest.ts`,
       `house-liquidity.ts`, the shared CSV cell module (186) or a report builder.
     - **Source:** D19 draft 178 AMENDED; EXP P23 AMENDED (slots, neutral names); R3 NEW-server-only-copy AMENDED; DSAR
       guard notes (status-tone, action names); BOOK d19Leaks (generate-button, report-pack-controls).
     - **Proof:** `test:house-bot-disclosure` 1.1/1.2/1.3 and `verify:house-bot-bundle` on a FRESH `next build` at every
       step that touches a listed file, and at the close. Planted controls, each red: a client prop named `houseStake`; a
       client import of an action whose name contains `HouseBot`; a `house` field in `TXN_SEARCH`; a `HOUSE_BOT` key in a
       planted `status-tone` copy.

175. **One absence vocabulary module, and the words it may gain.** The vocabulary lives in ONE module,
     `scripts/lib/house-bot-vocabulary.mjs` (plain `.mjs`, so `node` can import it). It exports:
     - the word union, keeping `house[_ -]?bots?`;
     - the identifiers, as the union of what the two guards carry today (for example `HouseBot\w*` (the broader
       disclosure form; the bundle's form is a subset), `houseBotId`, `houseStake`, `houseOnly`, `house_` identifiers,
       `HOUSE_` other than `HOUSE_FEE`);
     - BOUNDED id patterns: `hb[iethp]?_[0-9a-f]{24}` matched on word boundaries, and `hb:hbi_[0-9a-f]{24}`
       (`newHouseId` = prefix + `randomId(12)` hex). Raw `hb_`/`hbi_` prefixes are never needles: they false-positive on
       base64url nonces and minified code.
     - It never contains bare `house`, which is `main`'s `/admin/house` nav label (`admin-nav-groups.ts:94`).
     - **Consumers:** `test:house-bot-disclosure`, `verify:house-bot-bundle`, `qa:house-bot-holder-view`, the
       service-layer sweep (247) and `test:dsar-secrets` (an absence proof, 243) import it; a pin fails if any of those five
       declares its own word or identifier regex.
       Suites whose lists are deliberately broader (the seam test's notice-body words at `:428`/`:432`; the money cases at
       `:74`/`:414`, which include `house`, `50pick`, `nyumba`, `机器人`) keep them, but import the shared words and extend
       them, and a pin checks the shared words are a subset. `NAME_RISK_RE` in src eligibility (`:105`) is out of scope.
       `test:dsar-secrets` imports the module, never `scripts/house-bot-disclosure.test.mts` (which runs top-level code).
     - `verify:house-bot-bundle` also matches each file's PATH under `.next/static`, with a planted file-name control.
       Every consumer keeps a planted-hit control.
     - **Words proposed by the other areas** (ADJ 13): house stake(s) (`house[ -]?stakes?`), `dau la nyumba`, `平台投注`,
       staff-chosen / staff chosen, staff edge, enter now, scorecard, the literal `STAFF_EDGE`, and the Swahili and Chinese
       staff-edge words the STAFF_EDGE row and R1 use. Each is added ONLY after the builder measures that it matches no
       legitimate platform client code today: a scan of a fresh build of clean `origin/main`'s `.next/static` and the
       disclosure walker over `origin/main`'s client graph. A word that would go red on `origin/main`'s own client bundle is
       RECORDED in PROGRESS with its measured hit and NOT added (never allowlisted). The measurement also runs each proposed
       word over `origin/main`'s served HTML and RSC payload for 248's signed-out page list, because added words also become
       needles in 247 and 248; a hit there is recorded, not added. The pin records each added word's family. Each added word
       gets a planted client-file control. The added words land in the same commit as the first client slot (192). Measured today: the
       words house stake(s), `dau la nyumba` and `平台投注` already appear as string literals in the server-only
       `alert-copy.ts`, `feed-copy.ts`, `eligibility.ts`, `seam.ts` and `market-service.ts`, none client-reachable, so the
       guards stay green only while disclosure §1.2 holds.
     - **Source:** D19 draft 177 AMENDED; EXP P23 AMENDED (the three words); BOOK MISSED (staff-edge words); DSAR guard
       note; ADJ 13.
     - **Proof:** each consumer's planted control per word family, the file-name control, the single-source pin (reports
       §0) with a planted own regex in one of the five consumers, the subset pin, and the recorded `origin/main` measurement per proposed word.
       Mutation: a consumer re-declares its own regex → pin red; a planted client string per added word → red.

### 6.B · Readers, book, entry split, fee, pure modules

176. **`test:house-bot-reports`: the key, the runner and what runs where.**
     - `package.json` gains `"test:house-bot-reports": "tsx scripts/db-scratch.mts --run npx tsx scripts/house-bot-reports.test.mts"`
       in the same commit as its first citation in code, a comment or a doc (`test:guards-exist`; the rules suite's
       citation check, `house-bot-rules.test.mts:305-341`).
     - The runner is `runTwoStores({suite: "test:house-bot-reports", casesFile: "scripts/lib/house-bot-reports-cases.mts", minPass: <measured>, dbPrefix: "hb_reports"})`
       (`house-bot-two-stores.mts:16`; its Postgres URL carries `connect_timeout=30`, ruling 163). No Postgres exits 3,
       recorded NOT MEASURED, never a pass.
     - Static source pins run in the memory child only (info-edge's `if (STORE === "memory")`). Every book, entry-split,
       scorecard, fee, R9, R2, R1, CSV and staff-edge case runs on both stores. The ledger cross-check, the ring-emptied
       R7/R8 proofs and key-presence assertions are Postgres.
     - Pins read source through `scripts/lib/decomment.mts` (`CARRIER_CEILING = 20` exact), never a new stripper.
     - Audit assertions call `auditFlush()` and read through `getAuditByActionsDurable`. Fixture officer ids are staff users
       (`emergencyVoidMarket`'s role gate, `market-service.ts:4354-4365`). Staff-edge cases set `gStaffEdgeWinRatePts` and
       `gStaffEdgeNetTzs` through the control store (they ship NULL, `house-bot-dal.ts:1868`; recommended 15 / 100,000).
     - The stale header of `house-bot-two-stores.mts:3-4` ("shared by money and caps") is updated. §4.1 lists the sections.
     - **Source:** BOOK P27 AMENDED; REP and EXP buildNotes.
     - **Proof:** `test:guards-exist` green with the key; one run with no scratch cluster exits 3; `minPass` measured and
       recorded.

177. **Every new store member, in both twins, with a parity case.**
     - `houseBookStore.entryRows({fromIso, toIso, houseBotId}, tx?)` (180); `houseBookStore.feeInputs({fromIso, toIso, houseBotId})` (183);
       `houseBookStore.stakeRows(marketIds, tx?)` (179).
     - `houseBookStore.ledgerRows({fromIso, toIso})`: one GROUP BY per bot × product × market × type over marked CONFIRMED
       `Transaction` rows with `createdAt` in the window (R1's LEDGER basis, 203), with the position's market for product and
       market id.
     - `houseBotStore.listOverlapping({fromIso, toIso})`: bots whose life overlaps the window, REMOVED included (today only
       `listByUserId`/`listNonRemoved`, `house-bot-dal.ts:1340-1342`). It serves R1's designation register AND the GBT
       memo's "Designated house accounts at period end" (one reader, 227).
     - `houseBotEventStore.listByKindsInWindow({kinds, fromIso, toIso, houseBotId?, limit ≤ 500, cursor})` returning a page
       with a cursor and a real total (ruled; `listByKinds` with `untilIso` and limit+1 is not an alternative, because 205
       requires paging to completion). Today `listByKinds` has `sinceIso` only and caps at 500 (`:1435`, `:2280`, `:3447`).
     - `houseBotEventStore.listByUserKinds(userId, kinds, {limit ≤ 500, cursor})` with a real total, served by
       `@@index([userId, kind, createdAt])` (239).
     - `houseBotIntentStore.counteredPositionsCount(triggerUserId)` (239).
     - `PressRegisterFilter.purposes?` (`:363-370`).
     - A target reader for targets created, ended or removed in a window (R1 (g), (h)), returning
       `{rows, nextCursor, total}` with limit ≤ 500.
     - **Counts beside the paged twins.** `Page<T>` is `{rows, nextCursor}` (`house-bot-dal.ts:72`), and `listFeed`,
       `listRegister` and `listByBot` return no total, so: `houseBotEventStore.countByBot(botId, {kinds})`,
       `houseBotIntentStore.countFeed(filter)` and `pressStore.countRegister(filter)`: both-store COUNTs over each paged
       twin's predicate (238, 213, 206 (b)/(f)), plus SUM members wherever a capped section prints a money "Total (all)".
     - `houseBookStore.positionsForUser({userId, cursor, limit ≤ 500})` → `{rows, nextCursor, total}` over marked positions
       (`placedAt DESC, id DESC`, plus a count) (237).
     - `houseBookStore.txnPageForUser({userId, fromIso?, toIso?, marked: "only" | "any", cursor, limit ≤ 500})` →
       `{rows, nextCursor, total}`: a keyset transaction reader that serves the internal record (marked only) and the
       per-bot CSV's money tab (marked and unmarked in a range). Never `txn.search`, which clamps at 500.
     - Platform members: `db.txn.findByUser` `{excludeHouseBets}` (173); `TxnSearchFilters.house` in `txn.search` and
       `matchesFilters` (210); `db.txn.topContributors` filtering `houseBotId IS NULL` (224); `positionStore.leaderboard`
       `{excludeHouse}` (233); `DailySettledTotals.ownRounds` (235); `getAuditForActorDurable` `{excludeActions}` (170);
       `getAuditByActionsDurable` `{fromIso, toIso}` (185).
     - **Rules for all of them:** both twins in the same commit, declared at two-space indent in the interface and
       implemented as `async name(` in both the memory and Prisma objects, so `test:dal-parity`'s parser picks them up
       (`dal-parity.test.mts:393-404`); never `Wallet` or `db.wallet` in new SQL or `book.ts` (§12). Postgres binding copies
       `prismaHouseBook.dayRows` exactly: naive-UTC `Position`/`Transaction` times bound as `$n::timestamp`, statuses cast
       `::text`, Decimal and BigInt sums as `::text` then `Number()`; `$queryRaw` counts are bigint → `Number()`. Memory
       twins mirror `memoryHouseBook` (`house-bot-dal.ts:2790-2823`: `positionStore.values()`, `db.txn.listAll()`,
       `memIntents` indexed by `positionId`, `memTargets`, `marketStore.get` with the raw `productLine`). A total is never
       built from a paged reader (`pageLimit` clamps at 500, `house-bot-dal.ts:1797-1800`); no caller passes a limit above
       500 expecting more rows back.
     - **Source:** REP NEW-readers-needed STANDS + MISSED (round-decision reads, keyset txn reader); DSAR P14/P16
       AMENDED + MISSED (paging); BOOK P2 AMENDED, P9 AMENDED; EXP P5 AMENDED; R3 buildNote (one designated-at reader).
     - **Proof:** a `test:dal-parity` case per member on both twins over one shared fixture (identical outputs); behavioural
       cases in reports §1, §5, §6, §12.

178. **One requester rule, in one pure module.** `src/lib/house-bot/stake-snapshot.ts` (value imports on the module-law
     allowlist only) exports `requesterOf(i: {kind, requestedById, targetId}, targetCreatedById: string | null): string | null`
     (MANUAL → `requestedById`; `targetId` set → the target's `createdById`; otherwise null) and
     `foldRequestedBy(ids): string[]` (distinct, sorted).
     - `exposure.ts` applies `requesterOf` in JS over the raw grouped columns `stakeRows` returns; no SQL CASE duplicates it
       there.
     - `oversight.ts` replaces its inline loop (`oversight.ts:118-136`) with the helper. It KEEPS its own population
       (`staffChosenPlacedSince`, `OVERSIGHT_LOOKBACK_DAYS` = 30, limit 500) and its `finishedAt < audit.createdAt`
       predicate (`:123`), keeps recomputing for every action, and never reads `payload.houseStake` (engine §17 plants a
       `market.emergency_void` audit whose payload is only `{reason}`; `market.reopened` carries no R9 payload; C4 ruling
       29). Oversight EXPORTS its per-audit fold, e.g. `requestedByBefore(stakes, createdAtIso, creatorOf)`.
     - `entryRows`' officer column (180) is a second encoding in SQL and memory; a case proves it equals `requesterOf`.
     - The CHECKs (`migration.sql:291`, `:294`; `house-bot-dal.ts:775`) make MANUAL and targeted rows disjoint, so branch
       order is unobservable; no fixture may try to create a targeted row carrying `requestedById`.
     - `exposure-copy.ts` may import `stake-snapshot.ts` as types only: the module law admits only `./clock`,
       `./constants` and `./pause-reasons` as sibling value imports, and the allowlist does not grow.
     - **Source:** EXP P3 AMENDED; EXP MISSED (module law); BOOK NEW-officer-attribution STANDS.
     - **Proof:** reports §3: `payload.houseStake.staffChosen.requestedBy` equals `requestedByBefore` at the row's
       `createdAt` for adjudicate, emergency void, bulk override, upheld and rejected, on stakes inside the lookback, once
       with the chooser as actor and once with a non-chooser (officer C), so the proof never depends on an alert firing.
       Reports §1: `entryRows`' officer equals `requesterOf`. Engine §17 on both stores after the swap. Mutations:
       `requesterOf` returns `requestedById` for a targeted row; the fold drops the sort or the dedupe.

179. **`stakeRows` and `exposure.ts`.**
     - `houseBookStore.stakeRows(marketIds: string[], tx?: HouseTx): Promise<HouseStakeRow[]>` in BOTH twins beside
       `dayRows`/`openExposure` (`house-bot-dal.ts:1596-1601`). Postgres runs ONE statement: `"Position" p LEFT JOIN
       "HouseBotIntent" i ON i."positionId" = p."id" LEFT JOIN "HouseBotTarget" t ON t."id" = i."targetId" WHERE
       p."houseBotId" IS NOT NULL AND p."marketId" = ANY($1::text[]) AND p."status" <> 'CASHED_OUT'`, grouped by
       `p."marketId"`, `p."side"`, `(p."status" = 'OPEN')`, `COALESCE(i."kind" = 'MANUAL' OR i."targetId" IS NOT NULL, false)`,
       `i."kind"`, `i."requestedById"`, `i."targetId"`, `t."createdById"`, returning `SUM(p."stake")` as a whole number.
       Every column is qualified (`STAFF_CHOSEN_SQL` is unqualified and yields NULL under a LEFT JOIN, hence the COALESCE).
       Served by `Position_marketId_marked_idx` (migration `20260916150100:58`). The memory twin returns the same grouped
       rows through `isStaffChosen` (`:1815`). `HouseStakeRow = {marketId, side: "YES" | "NO", open, staffChosen, kind,
       requestedById, targetId, targetCreatedById, stakeTzs}`.
     - `src/lib/server/house-bot/exposure.ts` folds the rows with `requesterOf` and exports:
       `houseStakeByMarket(ids: string[]): Promise<Map<string, HouseStakeView>>`, which THROWS on failure (display callers
       catch and render "couldn't read"); `houseStakeForAudit(marketId: string): Promise<HouseStakeAudit | null>`, which
       NEVER throws (it catches read errors and pool timeouts, logs the market and the action, returns null);
       `toAuditShape(v: HouseStakeView): HouseStakeAudit`, exactly `{yes, no, staffChosen: {yes, no, requestedBy}}`; and
       `failExposureReadForCases(on)` (190).
     - `HouseStakeView = {yes, no, openTzs, settledTzs, staffChosen: {yes, no, requestedBy: string[], byRequester: Record<string, number>}}`.
       `yes`/`no` = Σ stake of marked positions with status ≠ CASHED_OUT, by side (Decimal(18,2) converted once to whole
       TZS); `openTzs` = OPEN; `settledTzs` = WIN/LOSS/VOID; `yes + no = openTzs + settledTzs` always. `staffChosen`
       restricts the same rows to staff-chosen intents; a marked position with no intent counts in `yes`/`no` only.
       `byRequester` exists only for the viewer line (193): never written to an audit, never sent to a client.
     - Both run WITHOUT a `tx` (the pool client, `house-bot-dal.ts:1067` `q = tx ?? pc()`), so a failed statement can never
       abort a lock's transaction (`emergencyVoidMarket`'s `lockTx` at `market-service.ts:4377` would abort the refunds'
       `withMoneyTx` at `:4426`). **Recorded cost:** inside `withLock` this takes a second pool connection for one grouped
       read per admin decision (`locks.ts` records that this is what capped bet concurrency; acceptable for rare admin
       decisions). At most 100 ids per call; callers pass page ids (`PER_PAGE` = 20).
     - **Source pin (I2):** no module under `src/lib/server/house-bot/` imports `exposure.ts` (oversight and the engine
       included). `exposure.ts` reads only through `houseBookStore`.
     - **Source:** EXP P5 AMENDED; EXP P4 AMENDED (the view); EXP buildNotes.
     - **Proof:** `test:dal-parity` `stakeRows` on both twins over MANUAL, targeted, automatic, a marked position with no
       intent, settled, voided and CASHED_OUT rows. Reports §1: open and settled separate after a settlement and after a
       void (04:2006); CASHED_OUT excluded; `byRequester` `{A: 9000, B: 6000}`. Reports §0: the I2 pin with a planted
       importer. Mutations: CASHED_OUT counted; the COALESCE removed (a no-intent marked position mis-grouped); the read
       passed the lock's `tx` (ruling 190's failing-read case then aborts the refunds).

180. **`entryRows` and the one book function.**
     - `houseBookStore.entryRows(input: {fromIso: string; toIso: string; houseBotId: string | null}, tx?: HouseTx): Promise<HouseEntryRawRow[]>`
       in both stores. Rows are grouped by `(houseBotId, productLine, entry: AUTOMATIC | TARGETED | MANUAL | UNKNOWN,
       officerId: string | null)`, each with `bets`, `staked`, `openStake`, `settledStake`, `returned`, and the
       won/lost/refunded/cashedOut counts with their stake and returned sums. The cohort is `Position.placedAt` in the
       window (182).
     - Postgres outline: `WITH pos AS (<dayRows' pos CTE + "marketId">), ret AS (<dayRows' ret CTE>, plus sum(t."fee")
       FILTER (WHERE t."type"::text = 'CASHOUT')) SELECT pos."houseBotId", coalesce(i."productLine", m."productLine"::text),
       CASE WHEN i."id" IS NULL THEN 'UNKNOWN' WHEN i."kind" = 'MANUAL' THEN 'MANUAL' WHEN i."targetId" IS NOT NULL THEN
       'TARGETED' ELSE 'AUTOMATIC' END, CASE WHEN i."kind" = 'MANUAL' THEN i."requestedById" WHEN i."targetId" IS NOT NULL
       THEN tg."createdById" END, <count/sum FILTER per status> FROM pos LEFT JOIN "HouseBotIntent" i ON i."positionId" =
       pos."id" LEFT JOIN "HouseBotTarget" tg ON tg."id" = i."targetId" LEFT JOIN "PredictionMarket" m ON m."id" =
       pos."marketId" LEFT JOIN ret ON ret."positionId" = pos."id" GROUP BY 1,2,3,4`. `Position.stake`, never
       `intent.stakeTzs` (the seam may clamp).
     - `book.ts` widens `houseBotBook(input: {houseBotId: string | null; range: "today" | "lifetime" | {monthKey: string}; productLine?: string; nowMs: number}, opts?: {byEntry?: true}): Promise<HouseBotBook>`
       (no caller today) and adds `houseStaffScorecard(input: {monthKey: string}): Promise<StaffScorecard>` (per-officer rows
       plus the automated baseline). Both fold only `entryRows`. `staffEdgePass` (218) and R1 section (f) (206) take their
       figures only from `houseStaffScorecard`; section (a) only from `houseBotBook(…, {byEntry: true})`.
     - `foldDayBook`, `HouseDayBook`, `houseDayBook`, `houseDayBooks` and `houseOpenExposure` stay byte-identical (the gates
       keep their fold; `test:house-bot-migrations` c20 pins the key order). `HouseEntryRawRow`, `StaffScorecard` and the
       widened `HouseBotBook` are separate types. Today's exact signatures: `book.ts:66`, `:101`, `:110`, `:116`, `:122`;
       DAL `dayRows` `:1598`, `openExposure` `:1600`.
     - **Source pin (function BODIES, parsed as dal-parity and info-edge parse them):** the bodies of `staffEdgePass` and of
       R1's section (f) builder must call `houseStaffScorecard` and `staffEdgeVerdict`, and must not call
       `houseBookStore.*`, `staffChosenPlacedSince`, `placedInWindow`, `staffChosenPlaced`, `staffChosenPlacedToday` or
       `listFeed`. `oversightPass`'s existing `staffChosenPlacedSince` read (`oversight.ts:81`) stays legal. A second pin:
       no refusal branch anywhere reads the scorecard or the verdict (PLAN I10), as for `requestedBy` (191).
     - Imports: the planner and oversight may import `book.ts`; `book.ts`, `staff-edge.ts` and `oversight.ts` never import a
       report builder, `exposure.ts` or `dsar.ts` (I2).
     - **Source:** BOOK P2 AMENDED; BOOK buildNotes (SQL outline, signatures, imports).
     - **Proof:** reports §1 identity (181); reports §0 body pin: a planted body calling `placedInWindow` is red, a body
       naming it only in a comment is green; c20 byte-identical; money §7 EXPLAIN for `entryRows` (all bots and one bot):
       no Seq Scan on `Position`, each with a CONTROL that runs the read for real. Mutations: `houseStaffScorecard` reads
       `placedInWindow` (pin red); `entryRows` loses the UNKNOWN branch (identity red).

181. **Entry, officer, settled and baseline definitions.**
     - **UNKNOWN.** A marked Position with no intent row is entry UNKNOWN: its own row in R1 (a) and the console split,
       never folded into AUTOMATIC, excluded from every officer row and the baseline. The identity AUTOMATIC + TARGETED +
       MANUAL + UNKNOWN = the book's bets, staked, open, settled and returned for the same window and bot is asserted against
       `houseBookStore.dayRows` summed over the same window. UNKNOWN is expected to be 0: the old build has no
       `placeHouseBet`; `ops:house-bots-remark` re-marks TRANSACTIONS only; every seam stake links its intent inside the
       bet's own money transaction (`markPlaced`, `market-service.ts:1441`). A non-zero value means a hand fix or a foreign
       write (never "S3 drift"), and R1 flags it: "a house stake with no decision record — written outside the bet path".
     - **Officer.** One stake, one officer: `requestedById` for MANUAL, the target's `createdById` for TARGETED (updates
       write `updatedById` only); null for AUTOMATIC and UNKNOWN. Intents and targets are never deleted (7 years). The book
       carries ids only; the R1 builder and the emitter resolve names.
     - **Settled.** won = WIN, lost = LOSS, refunded = VOID (voided resolution, emergency void, one-sided refund, orphan
       repair), cashedOut = CASHED_OUT. settled = won + lost + refunded (N1). cashedOut is its own column and never counts
       toward settled, the ≥ 10 threshold or the win rate; its stake and CASHOUT return stay in the bot totals, so
       settledStake = won + lost + refunded + cashedOut stakes and the split ties to `dayRows` (status <> 'OPEN'). House
       cash-out is refused (sanctioned change (e)), so CASHED_OUT on a marked position is a drift artefact. Win rate =
       won / (won + lost), undefined when that is 0. Net (officer and baseline) = returned − staked over won + lost +
       refunded stakes; positive means the house gained (HouseBotBook's sign, 04:3295).
     - **Baseline.** The AUTOMATIC entry (`kind <> 'MANUAL' AND targetId IS NULL`: untargeted COUNTER, FILL, OPENER),
       restricted to intent productLine `MARKET`, over the same placement month, all bots together, UNKNOWN excluded
       (N1 §4.5 and §7; C4 ruling 29; MANUAL and targets are MARKET-only by CHECK). The win-rate condition needs baseline
       won + lost ≥ 1.
     - **Source:** BOOK P10 AMENDED; BOOK NEW-officer-attribution STANDS; NEW-settled-statuses STANDS; NEW-baseline STANDS.
     - **Proof:** reports §1 on both stores: UNKNOWN exactly 0 on every seam-built fixture (N1's three-way identity); a
       CONTROL inserts one marked Position with no intent directly into the store and it lands in UNKNOWN and still ties;
       A's Enter now and a reaction on a target added by B and updated by C land on A and B, equal to `requesterOf`; the
       baseline equals
       `houseBotBook({houseBotId: null, range: {monthKey}, productLine: "MARKET", nowMs}, {byEntry: true}).byEntry.AUTOMATIC`,
       where `houseBotId: null` means every bot together (as `houseDayBook` and `houseOpenExposure` read null), so no sum
       over bots is taken; a marked CASHED_OUT position counts in settledStake and never in settled. Mutations: UNKNOWN folded into
       AUTOMATIC; cashedOut counted in settled; VOID not counted as refunded.

182. **The EAT month window.** A pure `eatMonthWindow(monthKey: string): {fromMs: number; toMs: number} | null` in
     `src/lib/house-bot/clock.ts`, beside `eatPreviousMonthKey`, built on the `EAT_OFFSET_MS` that `clock.ts` re-exports from
     `eat-day.ts`. It returns null for a key that is not `YYYY-MM` with month 01–12; `book.ts` throws on null (as
     `dayWindowIso` does). A new helper is needed because `src/lib/house-bot/*` may not value-import `@/lib/server/*`
     (`report-money.ts:82` exports `startOfEatMonth` but pulls in `market-service`). The staff-edge month and every scorecard
     window are the EAT calendar month by `Position.placedAt`; an intent's `finishedAt` or `createdAt` never decides the
     month; "settled" is read at the time of the read.
     - **Source:** BOOK NEW-month-cohort AMENDED.
     - **Proof:** `test:house-bot-rules` pins `eatMonthWindow("2026-09")` = [2026-08-31T21:00Z, 2026-09-30T21:00Z),
       `eatMonthWindow("2026-12").toMs` = 2026-12-31T21:00Z, and null for `"2026-13"` and `"2026-9"`. Reports §1 on both
       stores: a staff-chosen stake placed at 2026-09-30T20:59:59.999Z counts in 2026-09 and one at 2026-09-30T21:00:00.000Z
       in 2026-10. Mutation: `toMs` one day late → red.

183. **Fee withheld per bot: derived from the frozen snapshot, cross-checked against the ledger.** `feeWithheldTzs` is
     derived, never a constant null or 0.
     - For each house-marked WIN position in the window, its share is
       `allocateFeeShares(winnersForAllocation(<that market's positions: id, side, status, stake>, side).map(({id, stake}) => ({id, stake})), winningPool(side), poolFee(yesPool, noPool, snapshotOrLegacy(feeSnapshot), side).fee).get(position.id)`
       (`payout.ts:463` `poolFee`, `:653` `winnersForAllocation`, `:733` `allocateFeeShares`; `market-config.ts:350`
       `hasOwnSnapshot`, `:355` `snapshotOrLegacy`). `allocateFeeShares` breaks ties by id, so input order does not matter.
       Add the `fee` of marked CONFIRMED CASHOUT rows. LOSS, VOID and OPEN positions contribute 0.
     - The figure is null (never 0), rendered "not recorded per stake", when any contributing WIN position sits on a market
       where `!hasOwnSnapshot(feeSnapshot)` or whose `settledAt` is null.
     - Inputs come from `houseBookStore.feeInputs({fromIso, toIso, houseBotId})` in both stores: position ids, sides,
       statuses and stakes, plus each market's `yesPool`, `noPool`, `feeSnapshot` and `settledAt`; never a `userId`,
       reading positions only for markets that hold a marked WIN position in the window.
     - **Window basis.** `feeInputs` selects WIN positions by the `createdAt` of their marked CONFIRMED BET_PAYOUT, and
       CASHOUT fees by the CASHOUT row's `createdAt`, in `[fromIso, toIso)`. That is the LEDGER basis (203) and the same
       instant as the `settle_<payoutTxnId>` group the cross-check reads. R1 §3 passes `packPeriodBounds(period)`.
     - Reported per bot and per product (the console card, R1 section 3), never per entry. Only `houseBotBook` computes it;
       a source pin keeps it out of `houseDayBook`, `houseOpenExposure`, the seam, `cap-precheck`, `enter-now`,
       `eligibility`, the planner and oversight.
     - `book.ts` may value-import `../market-config` (the `pools.ts:17` precedent) and `@/lib/payout`. Its header "reads the
       MARKERS only" is amended: the fee inputs read other accounts' winning stakes (ids and stakes only).
     - FS-29's standing pin stays green: no `houseBotId` token in `src/lib/payout.ts` or `src/lib/server/market-config.ts`. A
       fee waiver or discount keyed on the marker stays refused (the HOUSE-BOTS.md do-not list).
     - **Authority, recorded (ADJ 8):** 04 R3's "book.ts derives returned money AND FEES from marker-bearing Transaction
       rows", and FS-29 / HB-LC-24's "never recomputed from rates", are overridden as to fees by the CODE: the payout writes
       `fee: 0` (`market-service.ts:3854`) and there is no HOUSE_FEE writer. **PLAN §18's premise is refuted by code too**:
       settlement books each winner's pre-allocated commission share as a `SETTLEMENT_COMMISSION` line in ledger group
       `settle_<payoutTxnId>` (`market-service.ts:3868-3877`; `ledger.ts:423`; written only when the share is > 0; Postgres
       only, `ledger.ts:124-128`), and that payout transaction is marked. So the snapshot recompute is the PRODUCER on both
       stores, and the ledger group is the CROSS-CHECK. The recompute from the FROZEN snapshot still honours HB-LC-24's
       concern, a live rate change. `PLAN.md:829` and `docs/HOUSE-BOTS.md:625` are corrected in the same commit. HB-LC-24's
       placement in `test:house-bot-money` is superseded (01 is the lowest authority; C4 ruling 22 prefers the placement next
       to what is tested): the cross-check lives in `test:house-bot-reports`, and money §7 gains only the `feeInputs` EXPLAIN.
     - **Source:** BOOK P9 AMENDED; BOOK MISSED (FS-29, HB-LC-24); R3 MISSED (PLAN §18); ADJ 8.
     - **Proof:** reports §2 on both stores: the derived figure per bot and product; null on a market with no own snapshot;
       a WIN placed in August and settled in September counts in September's fee, not August's.
       Postgres, per marked WIN position, zero tolerance: the derived share equals
       `coalesce(sum(amount of SETTLEMENT_COMMISSION lines in group 'settle_' || <its marked BET_PAYOUT txn id>), 0)` (a
       missing line reads as 0). Fixtures: a loser-share poll with ≥ 5 winners whose raw shares tie on the fraction; a
       capped-commission (legacy snapshot) Up & Down round (HB-LC-24); a winner whose share is 0 (no ledger line); a market
       with no own snapshot (null). Reports §0 pins, each with a planted control: FS-29's tokens; `settleMarket` and
       `book.ts` both call `allocateFeeShares` (a planted settlement that stops → red); the fee computed only in
       `houseBotBook`. Money §7: `feeInputs` EXPLAIN for the lifetime window on the 1M/20k fixture. Mutations: an inner join
       that drops the zero-share winner; null replaced by 0; the share computed from live rates instead of the snapshot.

184. **Where Commit 5's code may live (the info-edge walker).** Every Commit 5 module under `src/lib/server/house-bot/` or
     `src/lib/house-bot/` (the `book.ts` and `oversight.ts` additions, `staff-edge.ts`, `exposure.ts`, `dsar.ts`,
     `stake-snapshot.ts`, `exposure-copy.ts`, the status map) obeys the walker as built (C4 ruling 160):
     - no token matching `sentinel` followed by word characters, `resolvedOutcome`, `resolutionEvidence`,
       `resolveClaimedAt`, `resolutionStage1By`, `blackoutRow` or `HouseBlackoutRow`, in any casing (the walker is
       case-insensitive and reads esbuild-stripped code);
     - no reader `getMarket`, `listMarkets`, `marketStore`, `db.market` or `updown-board`;
     - no `StoredMarket` anywhere outside comments, a type-only import included (checked on the decommented raw source);
     - from `../market-service` value-import only `placeHouseBet` or `stakeBoundsForMarket`, and from `../market-dal` only
       `positionStore`.
     The fee derivation needs none of these: a WIN position's own side is the winning side, and pools and snapshot come
     from `feeInputs` in `house-bot-dal.ts`. Every builder or helper that reads market rows or prints an outcome, a
     resolution path, voided-market reads or `predictorCount` (R1's per-market section, the statement, match integrity's
     Resolution path, FIU context, every §9 helper) lives under `src/lib/server/reports/` or in the admin pages. No
     exemption is added.
     - **Source:** BOOK NEW-info-edge-placement AMENDED; R3 MISSED (§9 helpers); REP guard note.
     - **Proof:** `test:house-bot-info-edge` on both stores after each of those files changes; its planted virtual modules
       stay red.

185. **A durable audit read over a window.** `getAuditByActionsDurable` gains optional `fromIso` / `toIso`
     (`createdAt >= from AND < to`); the ring fallback filters the same way before slicing; `total` counts inside the window.
     - Every existing caller passes neither, so its output is unchanged: `kyc-risk.ts:179`, `refused-funds.ts:554`,
       `oversight.ts:89`, `house-bot-engine-cases.mts:2160`, `:2230`, `:2252`.
     - The windowed read with no category has no action index (`schema.prisma:948-950`). Its plan is measured with EXPLAIN
       on the scratch Postgres at a realistic `AuditLog` size before it is accepted. If the plan is unacceptable, "no
       category" is spelt `category IN (<every value of the Prisma AuditCategory enum>)`, derived from the Prisma enum and
       never from the hand-typed TS union, so it uses `@@index([category, createdAt])` with the same meaning.
     - The same window serves R1's reads of `updown.round.resolved`, `updown.round.voided`, `updown.round.void_operator`
       and `market.autoresolved` (category-scoped COMPLIANCE/ADMIN and windowed, truncation printed), and the bulk read
       in (d)/(e).
     - **Source:** REP NEW-audit-window STANDS; REP NEW-r7-index AMENDED (the enum); REP MISSED (round-decision reads).
     - **Proof:** a case on both stores with rows on either side of both bounds; `total` inside the window; each existing
       caller byte-identical; the EXPLAIN recorded; if the IN spelling is chosen, one planted row per enum value is found.
       Mutation: `<=` on `toIso` (the boundary row goes red).

186. **Four private things get one shared home each.**
     - (1) `bulkMarketIds` (`oversight.ts:38`) and `selfDecidedAction` (`:57`) move to a shared server module (for example
       `src/lib/server/house-bot/decision-audits.ts`) and are re-exported from `oversight.ts`, because `oversight.ts:11`
       says only the planner imports it and engine-cases `:2530` uses `OV.bulkMarketIds`. R1 (d)/(e) and the statement
       import the shared module.
     - (2) **One status word and tone map.** `designation.ts:218`'s private `STATUS_WORD` moves to a server-side module
       (for example `src/lib/server/house-bot/status-display.ts`) exporting the word and the Chip variant per status. The
       words follow 03 §1 (`03-design-spec.md:60`): ACTIVE "Active", PAUSED "Paused", AUTO_PAUSED "Auto-paused", REMOVED
       "Removed". This ruling takes 03's chip words over the built "Running": 03 outranks the code's private choice, and
       Commit 7's console chips use the same words for the same thing. `designation.ts`'s duplicate-label copy (`:269`,
       `:303`) uses the map, so it now says "Active"; a designation case pinning "Running" moves with this ruling named.
       The variants follow PLAN's status tones and are written into this map, never typed beside a label and never in
       `src/lib/status-tone.ts` (superseding 03 S7's `TONE_CHIP[…HOUSE_BOT_*]`, §1 S24). Used by the S7 chip (241), the
       compliance chip (230) and the duplicate-label copy.
     - (3) The CSV cell escaper (RFC-4180 quoting plus formula neutralising) moves from the transactions export route
       (`route.ts:44-48`) into one shared server module used by both CSVs (210, 213).
     - (4) `regulatorSignatures`, `makeReference` and `maskUserId` move to `src/lib/server/reports/attest.ts` (201).
     - **Source:** REP buildNote + engine guard (oversight helpers); R3 MISSED + NEW-harm-exclusion AMENDED (one status
       vocabulary); REP MISSED (CSV escaping); DSAR P24 STANDS (never `status-tone.ts`).
     - **Proof:** engine §17 (17.63 included) on both stores after the move; `test:house-bot-designation` on both stores
       after the word change; reports §6: the cell module neutralises a leading `=` `+` `-` `@`, tab and CR for both CSVs;
       a source pin that the transactions route no longer defines its own escaper.

### 6.C · R9 decision audits and R2 exposure

187. **R9: exactly six payload sites, one shape.** R9 changes exactly six payload sites:
     - `market.adjudicated` (`resolveMarket`; payload at `market-service.ts:3338-3360` carries `outcome`, `resolutionAuth`,
       pools and evidence), `market.emergency_void` (`emergencyVoidMarket`, `:4510-4518`), `objection.rejected`
       (`objections-service.ts:427-433`), `objection.upheld` (`:550-565`) and `market.resolve.bulk_override`
       (`bulk-resolve-action.ts`, targetType Market) each write `houseStake`;
     - `market.resolve.bulk` (the normal Batch row and the aborted row, `:365-380`) writes `houseStakes` (189).
     Each Market-targeted payload writes exactly `{yes, no, staffChosen: {yes, no, requestedBy}}` through one
     `toAuditShape()`, appended as the LAST key of the existing payload object; no other key moves or changes
     (`test:two-admin` reads `payload.resolutionAuth` at `:146-149`). A market with no marked position gives
     `{yes: 0, no: 0, staffChosen: {yes: 0, no: 0, requestedBy: []}}`: a successful read that found nothing (a failed read is
     `null`, 190).
     - Byte-identical: `market.resolve.stage1` (`:3276`), `market.reopened` (`:4313`), `market.autoresolved`
       (`:2639-2651`), `objection.closed_by_void` (`:236`), `objection.officer_hold` (`:357`), `updown.round.void_operator`.
     - Nothing in `resolveMarket`'s return type, or in any action result returned to a client, gains a house field
       (`bulk-resolve-action.ts` returns its buckets to a client component, `:349`, `:382`).
     - R9's actor is always an officer or a system id, so these rows never reach a player's actor-side read; 170's strip
       covers an officer's own export.
     - 💡 **X11** (default NOT built): the same snapshot on (i) `market.autoresolved` (the AI seal, no officer) and (ii)
       `updown.round.void_operator` (the officer's round void, where R2 shows the house line on the lever but nothing
       records what the officer saw; HB-LC-17 lists "voids an Up & Down round" among the money decisions). Until Ali
       answers, R1 section 4's description says that an Up & Down operator void and an automatic resolution record no
       house-stake snapshot.
     - **Source:** EXP P4 AMENDED (payload); EXP NEW-exactly-these-audits AMENDED; EXP MISSED (round void); PLAN §18
       row R9 (P:806).
     - **Proof:** reports §3 on both stores: the exact key set at both levels on each Market row (a leaked `openTzs` or
       `byRequester` goes red); the zero shape on a non-house market; TGT-38's values — A's NO 9,000 → `requestedBy` [A];
       B's target reaction YES 6,000 → [B]; both on one market → [A, B]; the six unchanged sites byte-identical to a
       no-house twin. `test:two-admin` unedited. Mutations: the payload gains `openTzs`; CASHED_OUT counted; `houseStake`
       inserted before an existing key.

188. **Where each writer reads the house stake.** In its own call, after its refusal guards and before its audit, never on
     a refusal path, through `houseStakeForAudit` (never throws, pool client):
     - `resolveMarket`: on the adjudicate path only, after the guards at `:3286-3293` and before the audit at `:3326`. The
       stage-1 branch (`:3255-3283`) returns before any R9 audit and does not read.
     - `emergencyVoidMarket`: beside `grossPool` at `:4392`, BEFORE the refund loop (`:4399-4467`), a "before" snapshot like
       `grossPoolBefore` (the OPEN list is at `:4396`).
     - `upholdObjection`: inside its lock (`:501-572`), before the audit at `:550`.
     - `rejectObjection`: it takes no lock; after the update at `:421-426`, before the audit at `:427`.
     - The bulk action: inside `if (r.ok)` at `:264`.
     A pool read sees committed rows only, so "before the refunds" is harmless on Postgres and correct on the memory store,
     where positions change in place.
     - **Source:** EXP NEW-read-placement STANDS; EXP buildNote (never the lock's `tx`).
     - **Proof:** reports §3: an emergency void's `houseStake` equals the stakes before the refunds; a refused adjudication
       and a stage-1 attestation make no read (a spy). Mutation: the read moved after the refund loop and given the lock's
       `tx` → red.

189. **The bulk Batch row uses `houseStakes`, a map.** `market.resolve.bulk_override` (targetType Market) carries
     `houseStake` with the plain R9 shape. The `market.resolve.bulk` Batch row, normal and aborted alike, carries a DIFFERENT
     key, `houseStakes: {[marketId]: <R9 shape> | null}`, covering every market in resolved ∪ staged (for the aborted row,
     the markets sealed before the abort). One key with two shapes would let R1 (e) read `payload.houseStake.staffChosen` on
     a Batch row and silently get undefined.
     - Each map value comes from the one `houseStakeForAudit` read that market's override row uses, taken inside
       `if (r.ok)`. The map is declared beside the buckets, before `  try {` (`test:bulk-resolve` 10.23). Neither key is
       `marketIds`, `markets`, `resolved` or `items`, which `bulkMarketIds` parses.
     - `bulk-resolve-action.ts` is `"use server"`: no new export (10.19); no new `catch (err)` (10.17 counts exactly 2;
       `houseStakeForAudit` never throws); the line `const r = await resolveMarket({ marketId: id, outcome, officerId: g.userId });`
       stays byte-identical (10.9 and its anchor); `formatTzs(total)` stays in the bar (11.8); every quoted block in
       `scripts/anchors/bulk-resolve.anchors.mjs` stays byte-identical.
     - **Source:** EXP NEW-bulk-batch-shape AMENDED; EXP guard notes.
     - **Proof:** reports §3: no Batch row carries `houseStake`, no Market row carries `houseStakes`; the map covers resolved
       ∪ staged, and the aborted row's map covers what was sealed before the abort; each value equals its override row's
       value. `test:bulk-resolve`, `red:bulk-resolve` and `test:red-anchors` right after. Mutation: the map written under
       `houseStake` → red.

190. **A failed exposure read records `null`, never a zero shape.** The decision proceeds; the payload carries
     `houseStake: null` (the key present) and the Batch map value is `null`; `console.error` names the market and the
     action. Displays show "House stake: — couldn't read" and never hide the line. R1 section (e) prints "not recorded" for
     null. Oversight is unaffected (it recomputes, 178). This does not contradict 04: R9's "{0,0} when there is none"
     describes a successful read that found nothing, and 03 S6 and the platform's missing-value law forbid a fabricated 0.
     - **Injection:** `exposure.ts` exports `failExposureReadForCases(on)`, a process-local flag that only the reader
       checks — no environment variable and no config row (ruling 156's shape: a production-reachable fault switch is the
       hazard). `test:house-bot-rules` §0 pins, with a planted control, that no file under `src/` calls it.
     - **Source:** EXP P6 AMENDED.
     - **Proof:** reports §3 for each of the five writers and the bulk action: flag on → the decision returns ok and the
       audit carries `houseStake === null` (or a null map value); CONTROL: the same fixture with the flag off gives the
       exact shape. Rules §0 pin. Mutation: a failed read writes the zero shape → red.

191. **No refusal branch and no page condition reads the requester data (TGT-38).** A source pin in
     `test:house-bot-reports` over decommented source:
     - (1) Services and actions — `market-service.ts`, `objections-service.ts`, `updown-service.ts`,
       `bulk-resolve-action.ts`, `bulk-resolve-eligibility.ts`, `resolution-policy.ts`, `app/markets/actions.ts`,
       `admin/objections/actions.ts`, `admin/updown/actions.ts`, `admin/ai-polls/actions.ts` (it calls
       `emergencyVoidMarket`): the tokens `houseStake`, `houseStakes`, `staffChosen`, `requestedBy`, `byRequester`,
       `houseStakeForAudit` and `houseStakeByMarket` appear only as a payload value or the call that produces it — never in
       an if/while/switch/ternary/`&&`/`||` condition, never on a line that returns `ok: false`.
     - (2) Pages — `resolver-queue/page.tsx`, `resolver/[id]/page.tsx`, `markets/page.tsx`, `markets/[id]/page.tsx`,
       `objections/page.tsx`, `updown/rounds/page.tsx` — never name `requestedBy` or `byRequester` at all; the viewer
       comparison lives only in `exposure-copy.ts` (193).
     - (3) The four client controls and `resolution-ceremony.tsx` name none of these tokens.
     An officer-conflict "lock" is as likely to be a UI lock (hiding or disabling a seal, void, uphold or reject control
     when the viewer chose the stake) as a service lock, which is why pages and controls are in the population.
     - **Source:** EXP NEW-refusal-pin AMENDED; 01 TGT-38.
     - **Proof:** reports §0 with two planted controls, each red: a refusal branch in a service reading `requestedBy`, and
       `canResolve && !chosenByMe` in a page. `test:two-admin` and `test:officer-conflict` pass WITHOUT edits; two-admin ON
       resolves a house-held market exactly like its no-house twin.

192. **All R2 words live in `exposure-copy.ts`; one server component renders them; client controls get slots.**
     - `src/lib/house-bot/exposure-copy.ts` is a pure module. It widens 03 §3's "admin sentences are built only in
       `feed-copy.ts`", as C4 ruling 141 did for `alert-copy.ts`. Module law: allowlisted value imports only
       (`@/lib/side-label` allowed, ruling 166); `stake-snapshot.ts` as types only; the money formatter injected (the
       `alert-copy.ts:17`/`:189` precedent); side words from `sideWordIn(locale, side, productLine)` (UP/DOWN for Up & Down).
     - It returns STRUCTURED parts `{label, groups: [{side, sideWord, amountText}], staffClause, viewerClause, unread}` plus
       plain strings where only a string fits: the held-chip title (194), the bulk count template ("{n} of these markets
       carry house stakes"), the unread line, the X9 qualifier (196) and the trilingual void-notice clause (195).
     - English display: "House stake: NO TZS 9,000 · of which chosen by staff TZS 9,000" (non-zero sides only, YES first;
       "House stake settled: …" when `openTzs` = 0; the staff clause only when staff-chosen > 0); the viewer line "of which
       chosen by you: TZS 9,000" (193); the unread line "House stake: — couldn't read".
     - ONE server-only component (no `"use client"`, imported only by server pages) renders the parts to 03 S6:
       `text-body-sm text-text-muted`, side words in `text-yes-300` / `text-no-300` (UP/DOWN words for Up & Down), each
       "SIDE TZS x" group nowrap so the line wraps between groups at 360 and never inside one; sentence case, never
       uppercase or tracked (no new eyebrow site); no truncate or line-clamp (no new `test:popup-fit` CLIP_DEBT). Server
       pages render it in place. The server-only render component lives under `src/app/admin/` or `src/components/admin/`,
       never `src/lib/house-bot/` (rules §0: the module law's value-import allowlist, `house-bot-rules.test.mts:314-326`,
       and CLASS_SHAPED, `:311`).
     - For the four client controls (`EmergencyVoidControl`, `ObjectionDecision`, `VoidRoundControl`,
       `BulkResolveBar`/`BulkConfirm`) the server page passes the rendered element as a neutral ReactNode slot
       (`exposureSlot`) and, for the bulk bar only, neutral data: `exposureState: "none" | "held" | "unread"` per `BulkRow`
       (`bulk-resolve-types.ts:67-73`) and `exposureCountTemplate: string` on the bar (`:349-355`). The count separates held
       rows from unread rows and shows an unread note when any row could not be read. No client module holds a house word, a
       `houseStake`/`houseBotId` identifier or an officer id.
     - No `${side}`, `${status}` or `${outcome}` template goes into any admin tsx or any trilingual notice body
       (`test:labels` §3; `ADMIN_PROSE_RATCHET` may not rise).
     - The vocabulary guards gain those R2 words that pass 175's `origin/main` measurement, in the same commit as the first
       slot; a word that fails is recorded in PROGRESS, not added.
     - **Source:** EXP P23 AMENDED; 03 S6.
     - **Proof:** reports §4: the parts for YES only, NO only, both, settled only, with and without the staff clause, and an
       Up & Down market; rules §0 module law; the disclosure planted slot controls; `test:popup-fit`,
       `test:unsaved-changes`, `test:eyebrow-roles`, `test:labels` and `test:type-scale` re-run unedited; phase C/D renders
       at 360 read for the wrap. Mutation: a client prop named `houseStake` → disclosure red.

193. **"of which chosen by you" on exactly four surfaces.** "of which chosen by you: TZS X" renders on: the resolver queue
     card, the ceremony page, the emergency-void confirm (only where the control itself renders: LIVE/CLOSED rows with
     `canEmergencyVoid`), and the objections row plus its decision dialog. `X = staffChosen.byRequester[viewerId]`, never the
     staff-chosen total (A's NO 9,000 and B's YES 6,000 on one market give A "9,000", not "15,000").
     - The admin market page and the bulk summary get the staff-chosen clause only. The Up & Down rounds lever gets the house
       line only (staff-chosen stakes are polls only, W9/W13). The emergency-void admin notice gets the house share only,
       with no per-recipient "you".
     - The comparison lives in ONE pure function, `viewerClause(view, viewerId)`, in `exposure-copy.ts`. Pages pass
       `session.userId` to it and never read `requestedBy` or `byRequester` themselves (191). Client components receive
       only the rendered slot.
     - **Source:** EXP P25 AMENDED; 04 N1 §9; 01 TGT-38.
     - **Proof:** reports §4 renders each of the four surfaces' server output for A (in `requestedBy`), C (not in it), a
       zero-house market, and a market carrying both A's and B's stakes: the line appears only for A and shows A's own
       figure. Phase C renders of the queue card and the ceremony as A and as C. Mutations: the line shown to every viewer;
       the staff-chosen total used instead of `byRequester`.

194. **The R2 lines on each admin surface.** Every display catches `houseStakeByMarket`'s throw and renders the unread
     line.
     - **Resolver queue card** (`admin/resolver-queue/page.tsx`): the page reads `houseStakeByMarket` ONCE for the paged ids
       (session `:163`, paging near `:190`) and reuses the result for `bulkRows`. The line renders inside the same flex-wrap
       crowd/held row (`:448-471`), after the held chip (03 S6 "next to"), for every paged card whether or not `canBulk`.
       The held chip's title (`:466`) reads "Money held on this market until it resolves, including house TZS 8,000" when
       the house holds a stake; "Money held on this market until it resolves" (the word "Player" dropped) when the read
       failed, because the page cannot know; and today's exact title for a market read successfully with no house stake.
       Plain markup, never a second `BulkResolveBar`, `ResolveControls` or `RecheckButton` (`test:control-gates` §4);
       `humanDuration` stays exported where it is (`test:overdue-format`).
     - **Ceremony** (`admin/resolver/[id]/page.tsx`): the house line and the viewer line render in the SERVER page under the
       pools line (`:158-163`) inside the same `AdminCard`, using `currentOfficerId` (`:32-33`). `ResolutionCeremony`'s props
       (`resolution-ceremony.tsx:45-62`) do not change.
     - **Admin market page** (`admin/markets/[id]/page.tsx`): the line under the pool figures (`:219-232`); a "House bot ·
       <label>" row tag in the positions table (`:361-435`) on rows whose `houseBotId` is set (the rows already carry it),
       labels from `houseBotStore.get` (`house-bot-dal.ts` ~`:1336`) for the distinct ids on the page, as
       `Chip size="sm" variant="neutral"`; after an erasure the label reads "[erased]", which is accepted. The house-market
       statement button (208) also renders here.
     - **Objections** (`admin/objections/page.tsx`): the read covers the OPEN actionable markets on `pageRows` only (the rows
       at `:43-56` join every objection); the panel line beside "Pool held" (`:108`/`:142`); the decision dialog receives
       `exposureSlot` (`objection-decision.tsx:47`; caller `:149-153`).
     - **Up & Down rounds** (`admin/updown/rounds/page.tsx`): the read covers unsettled rounds' market ids; the line sits in
       the lever row (volume `:313`; `VoidRoundControl` props `:41-52`, caller `:327-332`), with UP/DOWN words.
     - **Emergency-void confirm** (`admin/markets/page.tsx:233` → `emergency-void-control.tsx` props `:19`, `ConfirmVoid`
       `:101-160`): the read covers the paged LIVE/CLOSED ids; `exposureSlot` into `ConfirmVoid`.
     - **Bulk bar** (`bulk-resolve-bar.tsx:193`, "N selected · TZS X held"): `exposureState` per row and
       `exposureCountTemplate` (192).
     - **KYC card:** ruling 197.
     - **Source:** EXP NEW-held-title AMENDED; EXP NEW-ceremony-server-side STANDS; EXP buildNotes (callers and reads).
     - **Proof:** phase C renders with a house, a no-house and a failed-read fixture at 1280 and 360, each read; phase D for
       the four dialogs; reports §4 the held title's three states; `test:control-gates`, `test:overdue-format`,
       `test:unsaved-changes`, `test:popup-fit`, `test:eyebrow-roles` and `test:labels` re-run unedited. Mutation: the title
       changed for a successfully read no-house market → byte-identity red.

195. **The emergency-void admin notice carries the house share.** `notifyAdminMarketCancelled`
     (`notification-service.ts:1252`, `:1272-1287`) and `marketCancelledAdminHtml` take optional
     `{houseRefundedTzs, houseRefundedCount}`, both counted inside `emergencyVoidMarket`'s refund loop.
     - The counting line (`if (p.houseBotId != null) houseRefundedTzs += p.stake`) IS a branch under the seam's BRANCH regex
       (`house-bot-seam.test.mts:237-244`), so it sits within 3 code lines under a NEW marker `// SEAM:emergencyHouseShare`,
       the name is added to `SEAM_SITES` in `scripts/anchors/house-bot-seam.anchors.mjs`, and the marker window mentions
       house (4.2b). The audit's `houseStake: await houseStakeForAudit(m.id)` is data, not a branch.
     - The bell adds one clause in en/sw/zh, from `exposure-copy.ts` (en "… of which house stakes TZS 8,000 on 1 position",
       HB-LC-17's figure; sw and zh from the existing admin vocabulary "dau la nyumba" / "平台投注"), and the email adds one
       detail row, both only when the share is > 0.
     - Recipients (`listByRoles` ADMIN/COMPLIANCE/MODERATOR, `market-service.ts:4519`), the kind (SECURITY), the title and
       the href are unchanged. The notice names no bot, so it is not a house-bot alert and A22's ADMIN-only resolver does
       not govern it.
     - The player notice (`notifyMarketCancelled`, `:4457`), the player email (`marketCancelledRefundHtml`, `:4459-4464`)
       and `resolutionEvidence` (`:4489`) stay byte-identical; seam 6.h1b pins the notice body, which is never touched. No
       new `notify*` export or `*Html` template, so no `cert-c1` pin moves. The existing body's "players" noun already counts
       house positions (L34).
     - **Source:** EXP NEW-void-notice STANDS; 01 HB-LC-17.
     - **Proof:** reports §4 on both stores: the notice figure equals `payload.houseStake.yes + no` on a void; a non-house
       void's bell and email are byte-identical to today's; the player notice and email are byte-identical with and without
       house positions. `test:house-bot-seam` §4 (markers equal `SEAM_SITES`) and 6.h1b. `qa:cert-c1` renders the admin email
       with and without the row, read. The admin bell with and without the clause, en/sw/zh, is rendered on `/notifications`
       at 1280 and 360 and read (§5 row 20). Mutations: the clause on a zero-house void (byte-identity red); the marker removed
       (seam red).

196. **R2 lines never enter a field that reaches a player.** The house lines render OUTSIDE every field whose text goes to a
     player, and never prefill one:
     - the **emergency-void reason**: verbatim into `notifyMarketCancelled` for every bettor, the holder included
       (`notification-service.ts:1236-1248`), into every refunded player's email (`market-service.ts:4459-4464`), into every
       open objection's `reviewNote` and `notifyObjectionDecided` through `closeObjectionsForVoidedMarket`
       (`objections-service.ts:232`, `:242`), and into the public settlement proof (`resolutionEvidence`, `:4489` →
       `markets/[id]/page.tsx:562`, shown to any visitor);
     - the **objection decision's `reviewNote`** (`objections-service.ts:435`, `:569` → `notification-service.ts:990`;
       `objection-decision.tsx:178` says so); the objector can be a holder with own stakes (only house-only standing is
       refused, ruling 146);
     - the **ceremony's evidence**, which becomes `resolutionEvidence` (`market-service.ts:3315`), rendered to every visitor
       by the public resolution panel (`markets/[id]/page.tsx:548-562`);
     - the **KYC decision rail's "Note to the player"** (`kyc/[id]/kyc-decision-rail.tsx:277`), read by the holder the case
       is about.
     The house share sentence goes only into `notifyAdminMarketCancelled` (195). The Up & Down round-void reason reaches only
     the ADMIN audit (`updown-service.ts:1068-1072`): it follows R7's `HOUSE_REASON_HINT` posture (no holder name) and needs
     no player-notice case.
     - 💡 **X9** (recommended default: build (a), ask about (b)): (a) on the four surfaces above, the house line carries the
       visible qualifier "staff only — never sent to players" — built in Commit 5 as the default; (b) OPTIONAL: the four
       server paths (`emergencyVoidMarket`, `rejectObjection`/`upholdObjection`, `resolveMarket`'s evidence, the KYC
       reject/refuse action) refuse text containing the house vocabulary with an admin-only field error — NOT built without
       Ali's yes. Until Ali answers, phase D's visual review reads each of the four dialogs for the hazard.
     - **Source:** D19 draft 179 AMENDED; EXP NEW-free-text-leak AMENDED; EXP d19Leaks.
     - **Proof:** reports §4 on both stores: the player, holder and objector notice bodies from a house-held emergency void
       and objection decision are byte-identical to their no-house twins. Phase D renders read for the four dialogs (the
       qualifier visible; the field empty when the dialog opens). Mutation: the reason field prefilled with the house line →
       byte-identity red.

197. **The KYC card's house line.**
     - `kycMoneyFacts` (`kyc-risk.ts:115-138`; type `:91-106`) gains `houseBetCount: number` and `houseStakedTzs: number`:
       CONFIRMED BET_PLACED rows with `houseBotId != null`, counted in the same loop over the transactions `kycCaseRead`
       already returns (`StoredTxn` carries `houseBotId` on both stores; no new read). `betCount` and `stakedTzs` stay the
       totals over all stakes.
     - The "Bets placed" `Field` (`kyc/[id]/page.tsx:389-397`) adds one block line only when `houseBetCount > 0`: "of which
       house stakes: N", followed by " · TZS X" only when `canSeeMoney` (`:105`), as the field already gates its amount.
     - **Words (ADJ 7):** ruled on Ali's consistency instruction (PROGRESS:51; the same words for the same things) and R2's
       "House stake:" line one click away — NOT on D19, which leaves admin surfaces unchanged. A recorded departure from
       `04:1329`'s "of which 50pick liquidity stakes". The console's remaining "liquidity stakes" strings
       (`pause-reasons.ts:311`; `eligibility.ts:247-248`, `:316`, `:413`; `designation.ts:331`, `:591`) go to Commit 7's copy
       pass (L36).
     - **Display only.** A source pin keeps `houseBetCount` and `houseStakedTzs` read only in
       `src/lib/server/kyc-risk.ts` and in server modules under `src/app/admin/` (never a `'use client'` file); the page never
       passes `moneyFacts` whole to a client component. `kycRiskScore`'s `.score` is unchanged (byte-identical for a holder and a no-house twin).
       Today all six `kyc-risk` importers are admin files, and the three approval guards calling `kycRiskScore` are officer
       guards (`kyc-actions.ts`, `players/[id]/actions.ts`, approvals), so a house figure can never reach a player refusal
       or KYC sentence; the pin keeps it that way.
     - **Coordinate with the KYC owner (04 R9), as a merge-time re-diff step:** before the edit lands, re-diff
       `src/app/admin/kyc/[id]/page.tsx` and `src/lib/server/kyc-risk.ts` against the latest `origin/main` (a LIVE, audited
       module that `main` keeps changing); run `test:kyc-copy-truth` and the KYC suites after; repeat the re-diff at the
       `origin/main` merge before Commit 5 closes.
     - The card is one of X9's four free-text surfaces (196).
     - **Source:** EXP NEW-kyc-line AMENDED; D19 draft 180 AMENDED; EXP MISSED (coordinate); ADJ 7.
     - **Proof:** reports §4 on both stores: a holder's card shows the line; a non-holder's rendered card is byte-identical to
       today's; a role without accounting view sees the count and no amount; `.score` byte-identical for the holder and the
       twin. Reports §0 the field-reader pin with a planted player-side reader. `test:kyc-copy-truth` once (the card is not
       in its population). Phase C render with and without money view. Mutation: the amount shown without `canSeeMoney` →
       red.

198. **No player surface changes.** The R2/R9 build touches NO player surface. These stay byte-identical and pinned:
     `resolution-panel.tsx`, `app/markets/[id]/page.tsx` (its HOUSE_STAKE_ONLY → NOT_ELIGIBLE mapping at `:214-226`
     unchanged), `notifyMarketCancelled`, `marketCancelledRefundHtml`, `notifyObjectionDecided`, `notifyVerdictRecorded*`,
     and every `emergencyVoidMarketAction` / `resolveMarketAction` / objection action result shape. None imports
     `exposure-copy.ts`, `exposure.ts` or `stake-snapshot.ts` or gains house wording. The player objection panel is a
     separate component from `ObjectionDecision` (imported only by `admin/objections/page.tsx:15`) and gets no reader call,
     no prop and no copy.
     - **Source:** EXP NEW-player-surfaces-untouched STANDS; EXP d19Impacts (HB-LC-17 "Never shown to players").
     - **Proof:** reports §0 pin (a planted import into `resolution-panel.tsx` → red); seam 6.h1b; the byte-identical
       notice cases (195, 196).

### 6.D · R1 report, statement, CSVs, R7 index, R8

199. **Two catalogue ids with declared parameters, parsed after the gate.** `REPORT_CATALOGUE` (`catalogue.ts:1052-1063`,
     8 reports) gains `house-liquidity` (name "House liquidity report", `params: {period: "month"}`) and
     `house-market-statement` (name "House market statement", `params: {marketId: "required"}`). A catalogue entry gains an
     optional `params` descriptor, and the route (`src/app/api/admin/reports/[id]/route.ts`) parses ONLY the parameters its
     entry declares, in one function `parseReportParams(spec, searchParams, nowMs)`:
     - `period` must match `^(20[0-9]{2})-(0[1-9]|1[0-2])$` and be ≤ `eatMonthKey(now)` (`clock.ts:96`). The century is
       fixed in the pattern because `packPeriodBounds`/`packPeriodLabel` use `Date.UTC`, which maps years 0–99 to 1900–1999
       (`0026-08` would silently cover August 1926). Absent → `currentPackPeriod()`. Malformed → 400 "Period must be
       YYYY-MM". A future month → 400 "That month has not started". The current month is allowed and labelled "(month in
       progress — figures as at <generatedAt EAT>)". The builder validates again and throws on a bad period (an empty report
       for "no month" is a false statement).
     - `marketId` must match `^[A-Za-z0-9_-]{1,64}$` and resolve to an existing market of any product. Missing or malformed
       → 400; unknown → 404 "Unknown market".
     - `parseReportParams` runs AFTER the session, role and TOTP gate (`route.ts:32-46`) and after the id lookup, so no
       validation text reaches a caller the gate refuses (today a PLAYER gets 403 "Forbidden" for every id, which is not an
       oracle).
     - The eight existing entries declare nothing and stay `build(userId)` exactly. `buildGbtMonthly(generatorId,
       packPeriod?)` (`catalogue.ts:75`) and `buildFiuSar` (`:217`) take a positional string, so they are wrapped
       `(g) => buildX(g)` and never receive an object (a generic `entry.build(userId, params)` would feed `{}` into
       `packPeriodBounds` and crash the statutory pack). Their URLs, behaviour and audit payloads stay byte-identical.
       `report.<id>.generated` (`:91-103`) adds `params: {period}` or `params: {marketId}` only for entries that declare them.
     - The filename and the reference name the parameter: the filename is built from `${entry.name} ${period}` (or the
       market id), and the reference embeds it (e.g. `HOUSE-202608-<date>-<tail>`), so July's and August's reports downloaded
       the same day differ. `scripts/report-renderers-smoke.mjs`'s slug list is updated in the same commit.
     - No library card for the statement: a card cannot supply its required parameter, so it would always answer 400. Its
       button renders on `/admin/markets/[id]` for ADMIN or `canView("accounting")` on EVERY market, house stake or not —
       never inside R2's line, which renders only above 0 — because "House stake: none" is the answer to CRA-11's complaint
       ("I lost because 50pick's account took the other side"). The house-liquidity card gets a month picker (209).
     - **Source:** REP P7 AMENDED; REP d19Leaks (parameters after the gate); REP buildNotes.
     - **Proof:** reports §5: a PLAYER gets 403 "Forbidden" for any period or market id; an accounting officer gets 400 for
       `2026-8`, `2026-13`, `0026-08` and a future month, 404 for an unknown market; the current month is labelled; July's
       and August's filenames and references differ; the eight entries' outputs and audit payloads are byte-identical.
       `scripts/report-renderers-smoke.mjs` adds both ids (the statement with a seeded market id); `scripts/reports-verify-live.mts`
       passes each entry's declared defaults, or skips an entry with a required parameter and SAYS so, and never counts
       "build threw" as a pass. Mutations: parameters parsed before the gate (a PLAYER sees 400 → red); the century not
       fixed (`0026-08` accepted → red).

200. **Who may download the two catalogue reports.** Both keep `route.ts:32-46` exactly: ADMIN or `canView("accounting")`,
     then `checkAdminTotp` → 403. No owner-only rule (CRA-02: "same access as other reports"). Ali is told in the handover
     that COMPLIANCE, FINANCE and AUDITOR can download them. The per-bot CSV (213) and the internal record (236) are the only
     owner-only house exports.
     - **Source:** REP P8 AMENDED (first half).
     - **Proof:** reports §5: each accounting-view role downloads; a role without accounting view gets 403; TOTP not "ok"
       gets 403.

201. **Where the builders live: a leaf `attest.ts`, no import cycle.** `regulatorSignatures` (`catalogue.ts:37`),
     `makeReference` (`:65`) and `maskUserId` (`:783`) move out of `catalogue.ts` into a new leaf server module,
     `src/lib/server/reports/attest.ts`, which imports neither `catalogue.ts` nor any builder. `catalogue.ts` and the new
     `src/lib/server/reports/house-liquidity.ts` both import from it, so there is no `catalogue.ts` ↔ `house-liquidity.ts`
     cycle (`package.json` has no `"type": "module"`, so tsx compiles these to CommonJS, where such a cycle holds only while
     every shared symbol stays a hoisted function declaration).
     - `house-liquidity.ts` holds `buildHouseLiquidity` and `buildHouseMarketStatement`, is imported only by `catalogue.ts`
       (for `REPORT_CATALOGUE`), and never lives under `src/lib/server/house-bot/` or `src/lib/house-bot/` (184). No engine
       module imports it (I2).
     - `catalogue.ts:264` and `:364` (`test:read-tiers` 8.20/8.21: the FIU phone mask and the self-exclusion hash) and
       `:960` (`test:product-line`'s one ALL call) stay byte-identical. The new file reads markets by id or by a marker join,
       never `listMarkets`; if it ever must, it joins `test:product-line`'s MUST_OPT_IN with productLine `"ALL"` and a why
       (never removing an entry).
     - **Source:** REP NEW-builder-home AMENDED; REP guard notes.
     - **Proof:** `test:read-tiers`, `test:product-line`, `test:house-bot-info-edge` re-run; a source pin (planted control)
       that `attest.ts` imports no builder.

202. **The house-liquidity report's sections.** `buildHouseLiquidity(generatorId, {period})` returns ONE landscape report,
     classification "Regulator hand-off", with `regulatorSignatures`; the reference and filename carry the period (199).
     AT LEAST these sections, in this order, each ≤ 12 columns, times as ISO strings with format `datetime` (EAT, `brand.ts`).
     Holders are printed by `maskUserId` (CRA-02's masked holder id, the mask every other regulator report uses, so rows
     cross-reference the RG and match-integrity reports; never "Player #TAIL", which is R6's rule for notification copy).
     Officers are printed by `officerLabel` (`actor-label.ts:24`; allowed in R1, never in a data-rights file, N1 §9). No bot
     label anywhere (a signed artefact outlives erasure; R7 keeps labels out of permanent records).
     1. **Designation register:** bots whose life overlaps the period, REMOVED included (`listOverlapping`, 177): id,
        holder, designated at/by, consent printed as "account password verified in the 50pick console by
        <officerLabel(verifiedById)> at <verifiedAt EAT>" — exactly what the row stores, never "entered by 50pick" or "typed
        by the holder" (the D5 wording conflict is W24) — status changes in the period, removed at, cause, reason.
     2. **Master switch, rules and limits history:** SWITCH_ON, SWITCH_OFF, LIMITS_SAVED, RULES_SAVED and SUNSET events in
        the period (time, event, bot or "all", actor, cause, reason).
     3. **Per bot × product money** on the LEDGER basis (203): bets, staked, returned, net, fee withheld (183; "not recorded
        per stake" only where the book returns null, never 0), open at period end.
     4. **Per market:** id, title from the intent snapshot (204), product, house YES/NO stake, pool, house share %, outcome,
        house net, resolution path. The path comes from ONE closed, exported map covering `market.adjudicated`,
        `market.resolve.bulk` (a Batch; its markets via `bulkMarketIds`, 186), `market.resolve.bulk_override`,
        `market.emergency_void`, `objection.upheld`, `objection.rejected`, `market.reopened`, `market.autoresolved`,
        `market.resolved`, `market.resolved.one_sided_refund`, `market.selection_closed.thin_poll`,
        `updown.round.resolved`, `updown.round.voided` and `updown.round.void_operator`. Up & Down rows target
        `UpDownRound`, so they are read by action (185's window) and joined on `payload.marketId`. A market with no row prints
        "not found in the audit log", never blank. The description says that an operator round void and an automatic
        resolution carry no house-stake snapshot (X11). CRA-17's objections appear here, not as an extra section.
     5. **Reconciliation** (203): Σ marked BET_PLACED = Σ marked position stakes, joined on `positionId`; all = players +
        house for stakes, payouts and refunds; GGR equals `moneyForWindow` (`report-money.ts:184`) over the same
        `packPeriodBounds` (never recomputed locally); the all-bot ledger sum equals `MoneySummary.house` (225);
        ledger-returned and cohort-returned printed as two labelled lines with their difference explained ("returns on stakes
        placed in earlier months / not yet settled"), not as a mismatch; a line asserting `bonusStakeTzs === 0` for every
        marked position in the window (BET_PLACED records only the real part, so a bonus part prints a mismatch rather than a
        silent difference). Every line carries a match or mismatch cell.
     - (a) **Entry split** per bot × product: automatic, targeted, manual, UNKNOWN (flagged when non-zero, 181), total,
       check — from `houseBotBook(…, {byEntry: true})` only. (b) Enter now register. (c) Previews without a stake. (d)
       Staff-chosen stakes later voided or reopened. (e) Markets decided by the choosing officer. (f) Staff-chosen scorecard
       per officer. (g) Targets register. (h) Vetoes. Sources and columns: ruling 206.
     - **Reimbursements recorded (off-platform):** from HouseBotEvent `REIMBURSEMENT_RECORDED`, with amount and a period
       total (CRA-08: "section total equals the recorded events"; the index carries no amount, so the index alone does not
       satisfy it). Empty state until Commit 7's owner action writes one.
     - **Last:** the audit index (207). The summary carries "Completeness" (205).
     - A source pin in `test:house-bot-reports` requires every `action:` literal of those families under `src/` to be in the
       map, with a planted control.
     - **Source:** REP NEW-r1-sections AMENDED; REP MISSED (bonus line, D5 wording); EXP MISSED (round voids).
     - **Proof:** reports §5 on the fixture month (two bots, both products, boundary instants, a REMOVED bot, an emergency
       void, a bulk resolution, an upheld objection, an Up & Down round resolved and one voided by the operator, an
       auto-resolved poll): every section reconciles to the markers; section 4 prints each path and "not found in the audit
       log" for a planted market with no row; a planted UNKNOWN is flagged; reimbursements show their empty state; the map
       pin catches a planted unlisted action; the XLSX is reopened with ExcelJS and its cells asserted; the PDF is read page by
       page. Mutations: a path family dropped from the map (pin red); section 3 computed on the cohort (tie to
       `MoneySummary.house` red); a holder printed unmasked (red).

203. **Two money bases, never mixed in one figure.** Each section's description names its basis.
     - **LEDGER basis:** marked `Transaction` rows with `createdAt` in `[packPeriodBounds.start, end)` (`report-pack.ts:53-81`,
       the statutory EAT month bounds, so R1 covers exactly the GBT pack's instants). It drives section 3's stakes, payouts,
       refunds, cash-outs and net per bot × product, and section 5. Its all-bot sum equals R3's `MoneySummary.house` over the
       same bounds (one producer), so R1 ties to the GBT memo by construction, and a closed month never changes between
       downloads.
     - **PLACEMENT COHORT:** positions placed in the window, with returns as at generation. Used only where `book.ts` is the
       named producer ((a) the entry split and (f) the scorecard; N1 §4.5 and §9), labelled "stakes placed in <Month>;
       results as at <generatedAt EAT>". Its returned money has only a lower time bound (`house-bot-dal.ts:3993-3995`), so it
       moves as payouts land.
     - Section 5 ties stakes by joining marked BET_PLACED rows to marked positions on `positionId` (one population), never by
       two independent windows, which can falsely mismatch at a boundary millisecond.
     - "Open at period end" = `placedAt < end AND (settledAt IS NULL OR settledAt >= end)`, from `Position.settledAt`, never
       today's status.
     - **Source:** REP NEW-report-semantics AMENDED.
     - **Proof:** reports §5 on both stores: the boundary fixture (23:59:59.999 and 00:00:00.000 EAT) covers both bases; a
       closed month downloaded twice with a later payout landing in between gives identical ledger sections and a changed
       cohort line; section 3's all-bot sum equals `MoneySummary.house`; "open at period end" holds for a position settled
       after the end. Mutation: section 5 tied through two windows (boundary red).

204. **Titles come from decision snapshots.** Section rows name a market by id plus the title from the intent's
     `decision.snapshot.titleEn` (a round adds `snapshot.roundNumber`), or the target's `snapshot.titleEn` for (g)
     (`decide.ts:234-241`, `:516`, `:561`; `enter-now-decision.ts:338`; `HouseTargetSnapshot`, `house-bot-dal.ts:249`). Only a
     row with no intent (a REFUSED Enter now press, or an UNKNOWN-entry position) reads the live market title, and it prints
     "(live title)" after it. Enter now is polls only, which chain purge never touches. FS-22 is the reason.
     - **Source:** REP NEW-titles-from-snapshot STANDS.
     - **Proof:** reports §5: a market whose live title changed after the stake prints the snapshot title; a refused press
       prints "(live title)".

205. **No section truncates silently.** Every section that could be bounded pages its reader to completion under a
     per-section hard-ceiling constant. When the ceiling or an audit read's `truncated` bites, the section description uses
     the platform's existing sentence, "Showing the most recent N of M; …" (which `reports-verify-live.mts:59` already
     recognises), and any totals row is labelled "Total (all)" and computed over all M. The summary carries one item,
     "Completeness": "Complete" (tone good) or "INCOMPLETE · k sections capped" (tone bad). `types.ts` gains no field.
     M and every "Total (all)" come from the count and SUM members (177), never from the rows read.
     Precedents: match integrity (`catalogue.ts:1019-1023`, `:1032`) and ISO (`:477-496`).
     - **Source:** REP NEW-truncation-printing STANDS.
     - **Proof:** reports §5 with a ceiling lowered inside the case: the sentence, "Total (all)" over M, and "INCOMPLETE".
       Mutation: the sentence dropped → red.

206. **Sections (b)–(h): sources and columns, and the renderer's limits.**
     - **(b) Enter now register:** HouseBotPress purpose ENTER_NOW in the period, REFUSED included with its code, through
       `listRegister` with the new `purposes` filter (177), paged by keyset to the end (pages clamp at 500). A refused press
       has no intent, so its title is read live (204); a press's outcome and net come from its intent's `positionId`.
     - **(c) Previews without a stake, per officer:** ENTER_NOW_PREVIEWED events (actorId, houseBotId, marketId) with no
       ENTER_NOW press by the same actor, bot and market in `[previewAt, previewAt + 10 min]`; the press lookup extends 10
       minutes PAST period end. Previews are throttled to one per officer/bot/poll/minute (`ALERT_KEY.preview`), so the count
       is preview-minutes, and the description says so.
     - **(d) and (e):** void and decision times come from the audit row (C4 ruling 79; never fabricated). Decision audits are
       read with `getAuditForTargetsDurable({targetType: "Market", targetIds, actions, sinceIso})` plus the windowed
       `getAuditByActionsDurable(["market.resolve.bulk"], …)` with markets from `bulkMarketIds` (186); `truncated` is printed
       for both (`oversight.ts:88-89` ignores it; a report may not). `requestedBy` comes only from the one requester rule
       (178). Where a payload's `houseStake` is null, (e) prints "not recorded" (190).
     - **(f) Staff-chosen scorecard:** presses = the officer's HouseBotPress rows with purpose ENTER_NOW and TARGET_ADD
       created in the month, in any state (refused included), shown as two numbers and read through `listRegister` paged by
       keyset (or a both-store count member); placed, settled, won, lost, refunded and net only from `houseStaffScorecard`
       (180); the flag from `staffEdgeVerdict` (219) with the thresholds at generation (223). Neither the book nor
       `staffEdgePass` reads presses. The rows print whatever the thresholds are (01:3662, "present in every variant", both
       NULL included); only the flag column reads "off". Columns (compound cells, ≤ 12): officer, presses, placed, settled,
       won, lost, refunded, win %, net, auto win %, auto net, flag.
     - **(g) Targets register** (the window target reader, 177): poll (id + snapshot title), bot, added by · at, timing
       ("5–600 s from stake · every stake"), ended/removed at · cause · by, reactions "P n · S n · C n", staked, net, reason.
     - **(h) Vetoes** per officer (04:3574): time, poll (id + snapshot title), bot, side vetoed, stake, via (stake cancel |
       target removal), reason. Sources: `STAFF_INTENT_CANCELLED` events through `listByKindsInWindow`, and targets with
       `endCause = 'VETOED'` through the window target reader (177), paged to completion (205).
     - **Renderer limits:** ≤ 12 columns per section (the xlsx merge ends at column L, `xlsx.ts:80`; letters come from
       `String.fromCharCode(64 + n)`, so 26 at most); no 1-column section (the empty-state merge would be A..A); section titles
       fit one line (`pdf.ts:351` `lineBreak: false`); landscape. The XLSX is ONE sheet and the last section's column widths
       win for the whole sheet (`xlsx.ts:288-290`), so the audit index goes last; if a render clips an earlier section, the
       honest fix is max-width-across-sections in `xlsx.ts`, then re-rendering and READING every existing report. Row values
       are `string | number | null` only (`types.ts:26`); ISO strings with format `datetime`/`date`, never
       `utils.formatDateTime`. Inter has no CJK glyphs, so officer names come through `officerLabel`. No class-shaped token in
       report copy or comments (Tailwind scans `src`).
     - **Source:** REP buildNotes ((b)–(g), renderer); BOOK NEW-scorecard-presses STANDS; BOOK buildNote (01:3662).
     - **Proof:** reports §5 holds each fixture row: a refused press with its code; a preview with and without a press within
       10 minutes, one just past period end; a voided staff-chosen stake; a market decided by its chooser; presses counted in
       any state; targets with P/S/C reactions; a veto. XLSX cells asserted and PDF pages read.

207. **The R7 audit index: every house action, no category.** The index reads
     `getAuditByActionsDurable(Object.keys(HOUSE_AUDIT), {fromIso, toIso, limit: INDEX_LIMIT})` with NO category option,
     newest first, windowed to the period (185), printing truncation in the section sentence (205). The action list is
     always `Object.keys(HOUSE_AUDIT)` (31 keys, `constants.ts:730-762`), never a hand-written list, and no quoted non-key such
     as a made-up `house_bot.` string is ever written, even in a comment (`test:house-bot-rules` 11.8 reads raw source).
     Columns: time, category as stored, action, actor, target, botId, amountTzs when present, reason, entry hash (16 chars).
     Per-action category and payload assertions stay Commit 7's `test:house-bot-console`.
     - **Source:** REP NEW-r7-index AMENDED.
     - **Proof:** reports §5: a `house_bot.*` row written under a WRONG category appears in the index (the positive control
       for "no category"). On the Postgres child: rows written through `audit()`, then `globalThis.__50PICK_AUDIT_RING`
       emptied in the same process, are still listed; CONTROL: `getAuditPage` returns none of them there. If 185's IN spelling
       is chosen, one planted row per Prisma enum value is found. Mutation: category COMPLIANCE passed → red.

208. **The house-market statement.** `buildHouseMarketStatement(generatorId, {marketId})`: classification "Regulator
     hand-off", `regulatorSignatures`, reference and filename carrying the market id (prefix `HMS`). Sections:
     1. House intents on the market: kind, entry, why, due/placed EAT, side, stake, status/code, snapshot title and round.
     2. Marked positions and results: side, stake, status, payout.
     3. Resolution: the SAME closed path map as R1 section 4 (202), read from `getAuditForTargetDurable("Market", id)`, the
        bulk action's read filtered through `bulkMarketIds`, and the `updown.round.*` actions joined on `payload.marketId`,
        each printing `truncated`, and "not found in the audit log" rather than blank. (A target read alone misses every bulk
        resolution, every round decision and auto-resolution.)
     4. Objections.
     5. Tie-out: house YES/NO stake against `yesPool`/`noPool`, house share, and a match/mismatch cell.
     A market with no house stake still renders, with empty-state rows and the summary "House stake: none". It is reached
     from `/admin/markets/[id]` by accounting-view staff on every market (199).
     - **Source:** REP NEW-statement-contents AMENDED.
     - **Proof:** reports §5: a bulk-resolved market, an Up & Down round and an auto-resolved poll each print their path; a
       no-house market prints "House stake: none"; the tie-out matches; phase C render of the button on both kinds of market;
       XLSX cells asserted and PDF read.

209. **The month picker, and one month function shared with the staff-edge link.** The house-liquidity TEMPLATES card
     (server `reports/page.tsx`, TEMPLATES `:53-110`; formats exactly `["Excel", "PDF"]`, because the route makes nothing
     else) renders a generic client wrapper holding a kit Select and `GenerateButton`.
     - `GenerateButton` (`generate-button.tsx`, fetch at `:36`) gains an optional generic `query?: Record<string, string>`
       appended to its fetch URL.
     - The months offered run from the EAT month of the earliest `HouseBot.designatedAt` (REMOVED included) to the current
       month, newest first, capped at 84 (W4's seven years). The current month is labelled "in progress". With no bot ever
       designated, only the previous and current months are offered.
     - The default is the month the page's resolved range covers exactly (`range.start`/`end` equal to
       `packPeriodBounds(m)`; `resolveRange`'s custom range gives exactly one EAT month for the staff-edge href,
       `date-range.ts:95-105`), else `currentPackPeriod()`. The library tab ignores `range`/`from`/`to` today
       (`page.tsx:160`, `:167`), so this hand-off (`from=YYYY-MM-01` → `period=YYYY-MM`) is built server-side in `page.tsx`,
       never in the client button.
     - ONE pure function pair maps a month to `{from, to}` and a `{start, end}` back to a month. It lives in
       `src/lib/house-bot/clock.ts` beside `eatMonthWindow` (a sibling `alert-copy.ts` may value-import; the allowlist is
       `./clock`, `./constants`, `./pause-reasons`) under neutral
       names (for example `eatMonthRange` / `eatMonthOfRange`). The STAFF_EDGE alert-copy row's href (220) and the page both
       use it, so they cannot drift.
     - Every label arrives as a prop; neither client file contains a house word or a `house_…` token; the card is a TEMPLATES
       data row (no new class sites), and the Select is a kit component at size md with no sub-floor text
       (`test:type-scale`, `eyebrow-roles`).
     - **Source:** REP NEW-period-picker AMENDED; BOOK MISSED (the library tab ignores the range).
     - **Proof:** reports §7: the href built for runs on 1 Oct 2026 and 1 Jan 2027 opens the picker on 2026-09 and 2026-12
       (month-end and year-end; `to` for 2026-02 is the 28th). Reports §5: the month list with no bot, one bot, and a REMOVED
       earliest bot. Phase C renders of the card and picker at 1280 and 360, including the default from a staff-edge href;
       fresh-build `verify:house-bot-bundle`. Mutation: the page computes the month itself (the year-end case goes red).

210. **The transactions CSV: `house` filter and `house_bot_id` column.** On the existing accounting-view CSV route
     (`src/app/api/admin/transactions/export/route.ts`; headers `:56-60`; filter build `:90-101`; `db.txn.search` `:102`):
     - `TxnSearchFilters` (`txn-filters.ts:32-46`) gains `house?: "only" | "exclude"`: `matchesFilters` checks
       `houseBotId != null` or `== null`; the Prisma `where` gets `{houseBotId: {not: null}}` or `{houseBotId: null}`. The two
       stores' clauses are separate code, so both are tested.
     - The route whitelists `house` like type/status/provider (anything else = no filter). It is a URL parameter into
       server-only filters, never a `TXN_SEARCH` field (174).
     - `house_bot_id` is appended as the LAST column, after `description`, so reconcilers' column positions do not move. The
       lines `full ? "msisdn" : "msisdn_masked"`, `full ? t.msisdn : maskPhone(t.msisdn)`, the `mayReveal` line and the
       `pii.revealed` block stay untouched (`test:read-tiers` 8.9–8.11 are literal).
     - `transactions.exported` filters gain `house: "only" | "exclude" | null`.
     - `/admin/transactions` reads the same `house` parameter, applies it to the on-screen list, forwards it in the export
       query string (screen and file match, export route `:81-83`), and offers it as a kit Select through the page's own
       `FilterSelect` (`page.tsx:315-327`), with option labels passed from the server page. The filter form is a GET that
       submits its own fields, and the client range and search components preserve unknown parameters.
     - Cells go through the shared cell module (186).
     - **Source:** REP P28 STANDS; D19 draft 178 AMENDED (never `TXN_SEARCH`).
     - **Proof:** reports §6 on both stores: `house=only` returns exactly the marked rows and `house=exclude` exactly the
       unmarked ones, on a fixture under the 500 clamp; the last header column is `house_bot_id`; the audit records the
       filter. `test:txn-search` gains house cases in `matchesFilters` (its "take is clamped" assertion is not relaxed).
       `test:read-tiers` re-run. Phase C render of `/admin/transactions` with the Select at 1280 and 360. Mutation: the Prisma
       clause inverted → red on Postgres.

211. **The CSV's 500-row clamp: an honesty case, and a LIVE defect recorded.** Measured on both trees: both stores clamp
     the search `take` to 500 (`prisma-dal.ts:1723` here, `:1708` on `origin/main` `b726cb7f`; `txn-filters.ts:161`), so the
     route's documented 50,000 ceiling (`:36`) is 500 in practice; the truncation shows only in `X-Export-Truncated` (`:165`)
     and the `transactions.exported` payload (`:147`), never inside the file an officer's `<a href>` download saves.
     - Commit 5 does NOT change the shared clamp (it also serves the paged browser and payout-status).
     - The house test asserts HONESTY, not the bug: for fixtures of 10 and 600 marked rows, the exported row count,
       `X-Rows-Matched`, `X-Export-Truncated` and `transactions.exported.{rows, matched, truncated}` are mutually consistent
       (`truncated` is exactly `matched > rows`). It is never a `truncated === true` contract at 501 rows, which would go red
       the day `main` fixes the clamp. The exact-set case (210) stays under 500.
     - Recorded in PROGRESS 🧷 Later as **L26, 🔴 LIVE on main**: "the compliance CSV returns at most 500 rows while claiming
       a 50,000 ceiling, and the file itself never says so"; named in this session's handover to Ali as a live finding for a
       main-branch fix; a **Commit 8 release precondition** that the export returns its documented ceiling. Until it is fixed,
       a complete per-bet month exists only as the per-bot CSVs (keyset, complete, 213) plus the R1 report.
     - **Source:** REP NEW-csv-500-clamp AMENDED; ADJ 10.
     - **Proof:** reports §6 on both stores at 10 and 600 rows. Mutation: the audit's `truncated` forced false → red at 600.

212. **The CSV's missing TOTP step-up: a LIVE gap recorded.** Measured: the transactions CSV route has no TOTP step-up
     (`:73-77`), unlike the reports route, whose comment records the B3 finding that a direct GET skips the admin layout's TOTP
     gate (reports route `:40-46`); the proxy covers `/admin` pages, not `/api/admin` (`src/proxy.ts`). Commit 5 does not edit
     the gate. Recorded in PROGRESS as **L27, LIVE on main** (the file already carries money and PII) and told to Ali, with a
     **Commit 8 release precondition**: the export route runs `checkAdminTotp` before the `house_bot_id` column can reach
     production. If `main` has not fixed it by Commit 8, the release fixes it with a plain-text 403, "Two-factor verification
     required — verify, then export again" (the link is an `<a href>`, so a JSON body would show raw).
     - **Source:** REP NEW-csv-totp STANDS; ADJ 10.
     - **Proof:** none in Commit 5 (a recorded gap); Commit 8's release checklist carries the precondition.

213. **The owner-only per-bot CSV route ships in Commit 5, behind a gate that never confirms the feature to a player.**
     - **Placement:** `src/app/admin/house-bots/[botId]/export/route.ts` (the `[botId]` slug matches 03 S3 and 04:3353; 04
       R1 at 04:1977 and N1 §9's CSV columns at 04:3576 place it in Commit 5, and PROGRESS's Commit 7 scope lists no CSV).
       Commit 7 renders the buttons with the tabs.
     - **Gate, in this order, before any bot lookup** (ADJ 11; `src/proxy.ts:208-221` checks only that the session cookie is
       valid, so any logged-in PLAYER, the holder included, reaches the handler): (1) a session whose role is not a staff role
       → exactly the response the same session gets for a non-existent sibling path under `/admin/` (status, body, and every
       header except Date and request ids). This is measured on the served production-posture pass (248) and frozen as the
       handler's refusal; it never varies with whether the bot exists; (2) a staff role other than ADMIN → 403 plus one
       SECURITY `privilege_escalation_blocked` row (the platform action, not a new `house_bot.*` key; CA-17's test), with
       `targetType: "Action"`, a neutral `targetId` literal checked against 175's vocabulary, and payload
       `{role, ownerOnly: true}`; never the route path (the row's actor is that officer, so it reaches their own export,
       170); (3) ADMIN whose
       `checkAdminTotp` is not "ok" → 403 plain text; (4) a malformed or unknown `botId` → 404; (5) only then the body.
       ADMIN is the predicate `houseBotAlertRecipients` follows today (`alerts.ts:16-19`); Commit 7's `requireHouseOwner`
       replaces it under the pin designation 10.3 already holds.
     - **Audit:** ADMIN `house_bot.exported` `{botId, from, to, counts}` (every key allowed by `HOUSE_AUDIT_PAYLOAD_KEYS`),
       AWAITED before the body is returned, like `pii.revealed` (export route `:125-137`); no row on any refusal. This row
       carries no `code`; the internal record's row carries `code: "INTERNAL_RECORD"` (236). `house_bot.exported` therefore has
       two writers told apart by `payload.code`, and Commit 7's console suite must never assume every `house_bot.exported`
       row is owner-only or TOTP-gated.
     - **Activity tab** (`tab=activity`): intents by keyset through `listFeed`, with `IntentFeedFilter`'s fields
       (`house-bot-dal.ts:351-361`) plus `range` through `resolveRange`, paged to completion under a hard ceiling constant
       (`listFeed` pages at most 500, `:1797-1800`).
     - **Money tab** (`tab=money`): the holder's transactions, marked and unmarked, through the keyset reader
       `txnPageForUser` (177), never `txn.search` (the 500 clamp). Every row carries `house_marked`.
     - **Columns, pinned:** EAT timestamps, txn id, type, amount, house_marked, intent id, market, outcome, plus N1 §9's
       entry_kind, target_id, requested_by, entry_condition.
     - **Line 1** names the bot by id (never its label, 202), the holder by `maskUserId` (a deliberate, recorded deviation from CA-17's "masked phone",
       because the file outlives erasure; R6/R7), the range, `generatedAt`, and "rows N of M" (M from `countFeed` or the
       keyset reader's `total`, 177), with "TRUNCATED" when the ceiling bites (the officer never sees response headers).
     - Cells through the shared cell module (186).
     - **Source:** REP NEW-per-bot-csv-placement AMENDED; REP P8 AMENDED (gate); REP d19Leaks; ADJ 11; ADJ 2 (two writers).
     - **Proof:** 248 requests the route and the missing sibling as a PLAYER and as the holder, for an existing and a
       non-existing bot id, and compares them. Reports §6 (in-process) on both stores: a PLAYER session (the holder's
       included) gets 404, no bot lookup (a spy), and the frozen body; COMPLIANCE gets 403 and one
       `privilege_escalation_blocked` row whose target and payload match none of 175's vocabulary;
       ADMIN without TOTP gets 403; an unknown bot gets 404; no `house_bot.exported` row on any refusal; the exact line 1;
       501+ rows complete; `house_marked` exact; exactly one `house_bot.exported` row, written before the body. Mutations:
       the bot lookup moved before the role check (a PLAYER's response varies with the bot → red); the audit not awaited
       (row missing when the body returns → red).

214. **R8: the report pack and RG engagement read the durable audit table.** Both swaps land in Commit 5.
     - **(1) `getReportPack`** (`report-pack.ts:88`; today the ring read at `:92`) reads
       `getAuditForTargetsDurable({targetType: "ReportPack", targetIds: [packIdFor(period)], actions: ["pack.prepared", "pack.approved", "pack.submitted", "pack.acknowledged"], sinceIso: "1970-01-01T00:00:00.000Z", limit: 50})`.
       Target and actions are filtered in SQL over `@@index([targetType, targetId])`, so `pack.approve.conflict_blocked`
       rows (written on the same target) never use up the limit; the state is derived newest first, as today. This
       deliberately differs from R8's named `getAuditByActionsDurable`, which applies its limit before the target filter (§1
       S32). On `truncated` it does NOT throw — `ReportPackCard` renders ABOVE both tabs of `/admin/reports`, so a throw would
       take down the whole page (the library and the staff-edge landing included), and in the server actions it would be an
       uncaught exception. Instead `ReportPack` gains `historyIncomplete: boolean`; the card prints a danger line, "Pack
       history could not be read completely — do not sign"; and the four pack actions return `{ok: false, error}` before any
       transition.
     - **(2) `buildRgEngagement`** (`catalogue.ts:856`; today the ring read at `:887`) reads
       `getAuditByActionsDurable(RG_AUDIT_ACTIONS, {category: "COMPLIANCE", limit: 200})`. `RG_AUDIT_ACTIONS` is a new closed,
       exported list of every `rg.*` action written today (all COMPLIANCE): `rg.limit.changed` and
       `rg.limit.increase.deferred` (`responsible-gambling.ts:256`), `rg.self_exclusion.activated` (`:325`),
       `rg.cooling_off.activated` (`:364`), `rg.session_limit.enforced` (`market-service.ts:1096`),
       `rg.self_exclusion.reopened` (`admin/players/[id]/actions.ts:215`). `rg.reality_check.continued` is read
       (`compliance/page.tsx:73`) but never written, so it is not in the list (L30). When truncated, the events section prints
       the truncation sentence (205). Its copy changes from "audit ring" to "audit log" (`catalogue.ts:933`, `:943`).
     - **Not changed, recorded:** `kyc-risk.ts:336` and the other ring readers house volume degrades (L28). `buildIsoAudit`
       already reads the table and prints truncation (`catalogue.ts:474-496`) and is not an R8 target.
     - **Not claimed:** the pack actions do not await `audit()` (`pack-actions.ts:56`, `:83`, `:96`, `:110`), so a durable
       read right after a transition races the audit queue exactly as the ring read did (the ring push also happens after the
       DB append, `audit.ts:442-454`), and a fail-open append (`audit.ts:443-449`) leaves a ring-only row the durable read will
       not see. That is the honest behaviour; nothing may say R8 fixes that race.
     - **Source:** REP P18 AMENDED; REP buildNotes (the race); REP MISSED (dead counter).
     - **Proof:** reports §8 (216); `historyIncomplete` true → each of the four pack actions returns `ok: false` with no
       transition (both stores); phase C render of the pack card's danger state; `test:report-parity` re-run.

215. **R8's source pins.** In `test:house-bot-reports` §0.
     - **Population, read from disk:** `src/lib/server/report-pack.ts`, the whole of `src/lib/server/reports/catalogue.ts`
       (after the swap it holds no ring read), `src/lib/server/reports/house-liquidity.ts`, `src/lib/server/reports/attest.ts`,
       and every file under `src/lib/server/house-bot/`. After decomment, no whole-word match of `getAuditPage` (word
       boundaries, so `getAuditPageDurable`, which `catalogue.ts` legitimately imports and calls at `:14` and `:474`, is not a
       hit). Controls: a planted file calling `getAuditPage` is reported; a planted file calling only `getAuditPageDurable` is
       not; the population count meets a floor.
     - **RG pin:** every string literal starting `rg.` that is the value of an `action:` property in an `audit({...})` call
       under `src/`, both ternary arms included, is in `RG_AUDIT_ACTIONS`. Controls: a planted write of an unlisted `rg.*`
       action is red; a planted read-only comparison (the `compliance/page.tsx:73` shape) and a freeze `ref` literal (the
       `players/[id]/actions.ts:202` shape) are not hits.
     - **Source:** REP P19 AMENDED.
     - **Proof:** the planted controls above, each seen red or green as stated.

216. **R8 is proven on Postgres by emptying the ring, not by writing 10,000 rows.** On the Postgres half of
     `test:house-bot-reports` (`drive:house-bots-local` is Commit 8's and has no package key): write `pack.prepared` (officer
     A) and `pack.approved` (officer B) through `audit()` and await both; empty `globalThis.__50PICK_AUDIT_RING` in the same
     process (the ring is a `globalThis` array that `audit()` only appends to after the DB write, and hydrate never refills a
     process that has already hydrated — exactly the "empties on every deploy" state); assert `getReportPack(period).state`
     is `"approved"`, `preparedBy` is A and `historyIncomplete` is false. CONTROL in the same process: `getAuditPage` no
     longer returns the pack rows, so the discriminator is live. The RG half has the same shape with 201 `rg.*` rows (the
     truncation sentence printed). The memory half asserts the pins and byte-identical output only (the durable readers fall
     back to the ring there, `audit.ts:633-637`). Writing more than `MAX_IN_MEM` (10,000) rows through the chain's advisory
     lock is not the proof on a failing-RAM machine; a true eviction run is optional and, if kept, runs only through the
     heavy-node lock.
     - **Source:** REP NEW-r8-proof AMENDED.
     - **Proof:** as stated. Mutation: `getReportPack` swapped back to the ring → `"draft"` → red.

217. **No new red key; every new assertion still gets a mutation.** No new `red:` key for Commit 5 (PLAN §12 names RED
     harnesses for money, engine and console only; C3-SPEC ruling 17). Every new assertion — the parameter validation, each
     R1 section's reconciliation, the index's no-category control, the R8 pins, the CSV filter, the per-bot CSV gate, and
     every mutation named in rulings 168–258 — is mutated from a scratchpad worktree harness (a temporary worktree with a
     `node_modules` junction; never `npm ci` through the junction), fails its own assertion, has an unmutated control run, and
     leaves the tree restored and clean. `red:erasure` keeps its existing mutation and gains three declared ones (244).
     `test:dsar-secrets` has no red harness while its header claims every negative assertion was broken on purpose
     (`dsar-export-secrets.test.mts:27`), so each new §6–§9 assertion's scratchpad mutation is run and recorded in PROGRESS.
     Declared anchors are added only where a harness already has an anchors file (`UNDECLARED_CEILING = 65` stays exact). Only
     one mutation harness runs against a checkout at a time.
     - **Source:** REP P26 STANDS; DSAR MISSED (the dsar-secrets red harness).
     - **Proof:** the PROGRESS mutation record lists each mutation, its target assertion, the red seen, the control green and
       the clean tree.

### 6.E · Staff edge

218. **The staff-edge duty runs after `hourly`, on the first EAT day of a month, and its gate is proven.**
     - `staffEdgePass(alerts: EngineAlerts, nowMs: number): Promise<{officers: number; alerted: number; off: boolean}>` lives
       in `src/lib/server/house-bot/oversight.ts`; `planner.ts` is its only product importer, and no report builder imports
       `oversight.ts`.
     - `planner.ts` gets a separate duty `staffEdge`, added to `DutyName`, that runs AFTER `hourly` (ADJ 12; N1 §4.3 step 9:
       "Hourly: the existing summaries; on the first EAT day of a month only, staff edge"; C4 ruling 71 keeps N1's order;
       17.10's asserted prefix ends at `fillOpener`, so it is unaffected).
     - The duty runs only when all three hold: `eatDayKey(nowMs)` ends in `-01`; the EAT minute is 1–58 (which covers the
       month boundary at 00:00 on day 01); and `marks.staffEdgeKey !== eatHourKey(nowMs)`, where undefined counts as not run.
       The mark is a new `EngineState.planner.staffEdgeKey: string | null` (type `engine.ts:69-73`, initialiser `:126`; the
       engine-cases literal at `:2159` lacks it, hence "undefined = not run"). It advances only when the duty finished, and
       being separate it keeps a staff-edge failure from re-running the summaries.
     - It is not a money duty: it never affects the beat and runs whatever the master switch says.
     - The day-01 gate lives in the planner; the pass itself always judges `eatPreviousMonthKey(nowMs)` (the claim keys the
       month from the database's `now()` inside the INSERT). It reads the control row fresh and, with both thresholds NULL,
       returns `{off: true}` before any book read. Its only write is the AlertOnce claim `ALERT_KEY.staffEdge(officerId)`
       (`constants.ts:710`, unit `previousMonth`). It never pauses, refuses or audits, and adds no event kind or
       `HOUSE_AUDIT` action.
     - The headers of `oversight.ts` (`:4-9`, "two questions") and `planner.ts` (`:7-11`, the pass order) are updated;
       `hourlyDuties`' return shape is left alone.
     - **Source:** BOOK P1 AMENDED; ADJ 12.
     - **Proof:** the gate is proven in the MEMORY child of `test:house-bot-reports` (on Postgres the planner's `nowMs` is
       `clock_timestamp()` and cannot be moved), driven through `plannerPass` with `Date.now` fixed: (a) at 1 Oct 2026 00:01
       EAT the duty runs; (b) at 00:00:30 and at 23:59:30 EAT on 1 Oct it does not; (c) on 2 Oct it does not; (d) with the
       master switch OFF it still runs; (e) a pass whose `staffEdge` duty throws leaves the mark, and the next pass in the
       same hour retries; (f) after a finished run, a second pass in the same hour does not run it again. Each of (a)–(f) has
       a mutation. Engine §17 on both stores: `staffEdge` after the 17.10 prefix; 17.61 (hourly) unchanged.

219. **One integer verdict for the alert and R1's flag.** `staffEdgeVerdict(officer, baseline, thresholds: {winRatePts: number | null; netTzs: number | null}): {fires: boolean; rateMet: boolean; netMet: boolean}`
     in a new `src/lib/house-bot/staff-edge.ts` that imports only `./constants` (or `./clock`).
     - The rate condition holds when `winRatePts` is set, baseline won + lost ≥ 1, the officer's won + lost ≥ 1, and
       `100·won·(bw + bl) − 100·bw·(won + lost) ≥ winRatePts·(won + lost)·(bw + bl)` (integer cross-multiplication, equal to
       `100·w/(w + l) − 100·bw/(bw + bl) ≥ pts` for positive denominators).
     - The net condition holds when `netTzs` is set and net ≥ `netTzs`.
     - It fires when settled ≥ `STAFF_EDGE_MIN_SETTLED` (10, `constants.ts:609`) and either condition holds. Percentages are
       rounded to one decimal for display only.
     - `staffEdgePass` and R1's (f) flag both call it; no refusal branch reads it (180).
     - **Source:** BOOK NEW-integer-verdict STANDS.
     - **Proof:** TGT-39's figures: X 12/14 against a 49/100 baseline fires on rate; Z 11/20 does not fire on rate but fires
       on net; Y has 9 settled and never fires. Rules §0 module law. Mutations: `>` for `≥`; cashedOut counted in settled.

220. **The STAFF_EDGE copy row, and who resolves the officer's name.** `alert-copy.ts` (ROWS `:209-413`) gains a STAFF_EDGE
     row, severity warning.
     - **Title (en):** "Staff edge: {name}'s staff-chosen stakes in {Month YYYY} · {HH:MM:SS}". It ends ` · ${c.at}` (the 90 s
       bell dedupe, `alert-copy.ts:11-12`), with no emoji and no unreplaced placeholder.
     - **Body (en, N1 §7):** "{name}'s staff-chosen stakes placed in {Month YYYY}: {n} settled, {w}% won against {a}% for
       automatic stakes on the same products; net {±TZS x}. See the staff-chosen scorecard →". When the baseline has no won or
       lost stake, a no-baseline clause replaces "against {a}% …" in all three languages (its words are written into the row,
       rendered and read before the commit closes).
     - **Swahili and Chinese** are built from parts (C4 ruling 142), with a three-language month table in the row; the signed
       TZS figure comes from the injected `c.money`.
     - **href:** built with ruling 209's month function: `/admin/reports?tab=library&range=custom&from=<YYYY-MM-01>&to=<YYYY-MM-last>`,
       or `/admin/reports?tab=library` when the detail carries no month.
     - **The pass sends** `{code: "STAFF_EDGE", detail: {officerId, month, settled, won, lost, refunded, cashedOut, netTzs, baselineWon, baselineLost}}`
       — no botId, marketId, player id or reason. D19c holds: no bot id means no holder handle, and the recipients are ADMIN
       only (a holder is always a PLAYER).
     - **`announceOnce`** (`emitters.ts`) resolves `detail.officerId` to `detail.byName` through its existing `actorName`,
       falling back to "an officer", so the pure copy never reads a store.
     - The `alert-copy.ts` header's "NEVER A NAME" is clarified to mean PLAYER names; staff names are allowed, as
       `ROSTER_SENTENCE` and the staff-chosen rows already print `byName`.
     - No new `notify*` export or email template: `notifyAdminsHouseBotAlert` renders `alertRow()` for the bell and the email
       (`notification-service.ts:2526-2554`), and the registry row exists (`comms-registry.ts:355`), so the `cert-c1`/`cert-c3`
       pins are untouched. Without the row, the alert would render the fallback "House bots: STAFF_EDGE" with the feed href.
     - **Source:** BOOK NEW-staff-edge-copy STANDS; BOOK MISSED (the copy case); BOOK P30 AMENDED (the `announceOnce`
       branch); REP NEW-period-picker AMENDED (one month function).
     - **Proof:** a comms 9.x case renders STAFF_EDGE with full detail and with `{}`: the title ends " · HH:MM:SS"; the en, sw
       and zh bodies carry n, w% and a% (or the no-baseline clause when `baselineWon + baselineLost = 0`) and the signed TZS
       figure; the Month YYYY word is localised; the href is `/admin/reports?tab=library&range=custom&from=2026-09-01&to=2026-09-30`
       for month 2026-09 (2026-02 → `to` = the 28th) and `/admin/reports?tab=library` without a month; no officer reason and
       no player handle appear. Comms 9.2 (three languages, CJK in zh, href starting "/", detail `{}`) and 9.4 green. A comms
       case drives `houseEngineAlerts().once(…, {code: "STAFF_EDGE", detail: {officerId}})` and the delivered title carries
       that officer's display name, or "an officer" for an unknown id. The `house-bot-comms-cases.mts:330` comment ("producer
       is commit 5") is replaced. Mutations: the no-baseline clause missing in Swahili (red); the href built outside the shared
       function (reports §7 year-end red).

221. **TGT-39 on both stores, with disjoint officers, and delivery to every admin.**
     - TGT-39's three variants use DISJOINT officer ids over the same automated baseline: X/Y/Z for (a), X2/Y2/Z2 for (b),
       X3/Y3/Z3 for (c). AlertOnce claims persist inside one child, so shared officers would make (b)'s "only Z alerts" see
       Z's claim from (a) and pass vacuously. The variants' threshold settings are TGT-39's own (01:3649-3669).
     - (a) X and Z alert once, Y never; (b) only Z2 alerts; (c) returns `{off: true}` and a spy on `houseBookStore` proves no
       book read happened. The "second pass adds 0" case runs on (a)'s officers. The baseline ties to `byEntry.AUTOMATIC`
       (181).
     - **Key literal:** the memory child, with `Date.now` fixed inside 1 Oct 2026 EAT, asserts `staff-edge:<X>:2026-09`; the
       Postgres child places the same officer fixture in the real previous EAT month and asserts
       `staff-edge:<X>:${eatPreviousMonthKey(dbNow)}`. (Memory's `dbClock` and `claimWithEatSuffix` read `Date.now`,
       `house-bot-dal.ts:2228-2230`, `:2242-2245`; Postgres uses `clock_timestamp()` and `now()` inside the claim INSERT,
       `:3394-3397`, `:3409-3417`; the pure October → 2026-09 key math is already pinned by rules 13.5/13.5b.)
     - **Delivery** (04:3738 places it in `test:house-bot-comms`, not in the recorder-only reports cases): a STAFF_EDGE alert
       through `houseEngineAlerts().once` writes one HOUSE_BOT bell per `houseBotAlertRecipients()` row (two ADMINs in the
       fixture) and one email per distinct address, with 0 SMS; two officers alerted in the same second both land, so the 90 s
       dedupe (title + body + href) does not swallow one.
     - **Source:** BOOK P27 AMENDED; BOOK buildNote (clocks).
     - **Proof:** reports §7 on both stores; the comms delivery case. Mutations: the claim key without the month suffix (a
       second month red); the pass reading the book before the NULL check (spy red).

222. **Commit 5 closes only after the staff-edge alert is rendered and read.** The dependency is built
     (`emitters.ts:139-157` → `notification-service.ts:2526-2554` → `fanOutHouseAdmin` to every ADMIN). All four must run:
     1. `qa:house-bot-bells` (`package.json:464`; `scripts/house-bot-bell-shots.mts:128`) writes a STAFF_EDGE row through
        `notifyAdminsHouseBotAlert` with TGT-39's X figures, moves 1.1 to exactly 12 rows written and 1.2 to at least 12
        landed (measured, never guessed), and photographs and READS `/notifications` at 1280 and 360 in en, sw and zh. The
        bell PANEL stays NOT MEASURED under L12 (the headless harness's own poll), never "passed".
     2. `qa:cert-c1`'s comms-email-shots gains `houseBotAdminHtml` for STAFF_EDGE, built from `alertRow({code: "STAFF_EDGE", …})`
        output rather than hand-typed strings, opened and read.
     3. The comms name-resolution case (220) passes. The bells harness calls `notifyAdminsHouseBotAlert` directly and never
        exercises `announceOnce`, so its render proves the row, and the comms case proves the name.
     4. The href resolves on the library tab with the picker on the judged month (209; a phase C tile).
     Until all four ran, the alert is recorded NOT MEASURED. The +60-day href-route test is Commit 7's (C4-SPEC ruling 23),
     recorded NOT MEASURED in Commit 5 (L38); nothing in Commit 5 cites "pinned by the C13 +60-day test" as built.
     - **Source:** BOOK P30 AMENDED; BOOK MISSED (the library tab; the +60-day test).
     - **Proof:** the four items, each recorded with its screenshots or case counts.

223. **R1's flag is its own record, and a month with no day-01 run sends no alert.** R1 (f)'s flag is computed at generation
     from `houseStaffScorecard` and `staffEdgeVerdict`, with the control row's thresholds at that moment, printed beside the
     flag ("15 pts · TZS 100,000", or "off") with "as of <generated EAT>". It can differ from the day-01 alert, because
     stakes settle later (N1 fixes evaluation to day 01, 04:3290; R1 can be generated any day and its flag is its own record,
     04:3572). AlertOnce rows purge after 30 days, so R1 cannot reconstruct whether an alert was sent; printing the
     thresholds and the generation time is the honest substitute. **Known gap, recorded, not repaired** (C4 ruling 80's
     precedent): a month whose whole first EAT day had no successful `staffEdge` duty (engine off, planner down) sends no
     alert, and R1's flag remains the record (L45).
     - **Source:** BOOK NEW-report-flag-and-gaps STANDS.
     - **Proof:** reports §5: the flag with both thresholds set, one cleared, and both NULL ("off", with the rows still
       printed); a stake settling after day 01 changes the flag in a later generation.

### 6.F · R3 statutory, §9 splits, R4/F9, D6

224. **Every PLAN §9 row, in four classes that never share a line.** (PLAN.md:456-466.)
     - **(A) STATUTORY, UNCHANGED.** No code touched; each proven equal to a no-marker twin on both stores: every
       `MoneySummary` money field including `holdPct` (`report-money.ts:141-173`); `dailyPnl` and `categoryBreakdown` rows;
       `moneyByGame` money fields; the GBT pack's existing sections, rows and counts (`catalogue.ts:106-184`); daily ops'
       sales, tickets, payouts, GGR, TRA, GBT, margin, net, deposits and withdrawals (`:613-655`, `:703-729`); the FIU
       inclusion set (`:250-277`); the match-integrity refund total and predictors (`:961-1036`); wallet liability; the
       house-ledger waterfall; `providerSummary`.
     - **(B) ADDITIVE lines, admin screens and regulator paper only:** `MoneySummary.house` (225); the GBT memo (227); daily
       ops' rows "House liquidity stakes (included above)" and "House liquidity net result" after `:729`, and on its Margin
       summary tile (`catalogue.ts:705`) `delta: "House liquidity: X% of stakes"` only when house stakes > 0; on
       `/admin/finance` a "House bots net" tile and, on the Operator margin tile (`finance/page.tsx:211`), the delta
       `${feeModelLabel} · House liquidity X% of stakes` when `MoneySummary.house.stakes > 0`, else `feeModelLabel` unchanged
       (`AdminKpi` has one `delta` prop, already used for `feeModelLabel`); neither tile's value or tone logic changes; the tile
       is never gold (03 §1); `/admin/finance` reads `moneyForWindow(range)` ONCE for both the delta and the tile
       (`operatorMarginPct`, `analytics.ts:322-326`, returns only `holdPct`); the `/admin/house` card (231); the FIU Context
       column (228); the compliance holder chip (230).
     - **(C) ADMIN-ONLY populations that change on purpose.** Counts, plus the per-player TZS figures of the Top-10
       concentration list (`finance/page.tsx:523-540`) and insights' LTV (`insights.ts:203-216`). Class C never changes a
       platform total or a statutory figure, and nothing in it appears on a regulator hand-off:
       `summarise.activePlayers` (`report-money.ts:175`) and `analytics.activePlayers` (`analytics.ts:174-177`) skip marked
       rows; `moneyByGame` players (`report-money.ts:420`) skip marked BET_PLACED; daily ops' "Unique players"
       (`catalogue.ts:690`) counts unmarked bets, with its note changed deliberately to "Placed at least 1 own bet (house
       liquidity stakes excluded)"; `db.txn.topContributors` filters `houseBotId IS NULL` in both twins
       (`prisma-dal.ts:1657-1675`, `store.ts:1430-1444`); `insights.ts` skips marked rows in its loop (`:109-111`; it reads
       `db.txn.listAll` at `:92` and caches on `globalThis`, `:80-82`); `detectSuspiciousBets` and the harm detectors (230).
     - **(D) PUBLIC, UNCHANGED** (D6, D19): the leaderboard, `leaderboardPlayerCounts`, trader avatars, `predictorCount`, the
       ticker and platform-stats, pinned by 234.
     - Every §9 house string stays server-side (174); no §9 helper that reads market rows lives in the two house folders (184).
     - **Source:** R3 P20 AMENDED; R3 buildNotes.
     - **Proof:** reports §9 on both stores: class A equals the no-marker twin (daily ops: everything except the Unique
       players count and the two added rows, levy rows at `:721-729` included); class B lines appear only with house stakes >
       0; each class C figure equals the same computation over unmarked rows only (insights forced to recompute with
       `getInsights(true)`). `test:insights` stays green unchanged (its fixture has no marked rows). `test:report-parity` §4:
       any house read added to `report-money.ts`, `analytics.ts` or `kyc-risk.ts` uses `listInRange` or SQL, never `listAll`.
       Phase C renders of `/admin/finance` (with and without house stakes) and `/admin/insights`. Mutations: `holdPct` over
       unmarked rows (class A red); `topContributors` unfiltered on one twin (class C red).

225. **`MoneySummary.house`.** `MoneySummary` gains `house: {stakes, returned, net, bets, houseShareOfStakesPct}`, computed
     inside `summarise` (`report-money.ts:140`) from the SAME `conf` array: `stakes` = Σ|BET_PLACED| with `houseBotId` set;
     `returned` = Σ|BET_PAYOUT + CASHOUT + BET_REFUND| with `houseBotId` set; `net = returned − stakes`; `bets` = count of
     marked BET_PLACED; `houseShareOfStakesPct = stakes > 0 ? house.stakes / stakes × 100 : 0`. `holdPct` (`:169`) and every
     other field are unchanged. No players-only GGR, hold or margin field exists anywhere; "all = players + house" is asserted
     in tests, never stored. It holds by construction for `moneyForWindow`, `reportSummary`, `dailyPnl` and `dailyKpiSeries`.
     Every consumer is an admin page, and the field names match neither vocabulary list. `test:report-parity` §2
     (`report-parity.test.mts:86-93`) compares object-valued keys by canonical JSON instead of `===` (its two calls are
     separate, so a nested object fails by reference), with a control where one differing nested field fails; the key is
     never skipped.
     - **Source:** R3 P21 STANDS.
     - **Proof:** reports §9: all = players + house per window; `houseShareOfStakesPct` 0 with no stakes; report-parity §2 with
       its nested control. Mutation: `returned` without CASHOUT (identity red).

226. **The statutory basis: the marked subset of the same rows.** Every §9 house line printed beside a statutory figure is
     the marked subset of the SAME `Transaction` rows that figure sums — same window, same status and type filters — so all =
     players + house holds row by row. The placement-day cohort (`book.ts:10-20`) stays the basis for caps, stops and R1's
     cohort sections only, and is never printed as a statutory memo: its returned money has no upper time bound
     (`house-bot-dal.ts:3993-3995`; memory `:2797-2799`), and a closed month's memo must reproduce identically on every
     regeneration (compared excluding `meta.generatedAt` and `reference`, which change every build). CRA-20's "memo rows equal
     the book" is kept for stakes and bet count, compared against Σ `houseBookStore.dayRows` over the pack's EAT days (the
     same window as `packPeriodBounds`; BET_PLACED's `createdAt` equals `placedAt`, `market-service.ts:1524-1547`, and house
     stakes are cash-only) or R1's entry-split reader — never `houseBotBook` for returned or net (its `{monthKey}` range, 180,
     is a placement cohort with returns as at the read). For stakes and bet count the cohort equals the partition, because
     BET_PLACED `createdAt` = `placedAt` and house stakes are cash-only. That is also why 227's staff-chosen memo row may read
     the entry-split reader. For net, a
     month-boundary fixture (placed at 23:59:59.999 on the last EAT day, paid out after midnight) asserts the documented
     difference between the partition figure and the cohort figure.
     - **Source:** R3 NEW-s9-basis AMENDED.
     - **Proof:** reports §9 on both stores: memo stakes and count equal Σ `dayRows` over the pack's days; the boundary net
       difference; a closed month's pack regenerated after a later payout reproduces its memo. c20.a/c20.b
       (`house-bot-dal-cases.mts:249-250`, `:925-946`) stay.

227. **The GBT monthly pack's house memo, and W21.** `buildGbtMonthly` (`catalogue.ts:75`) keeps every existing section, row
     and count byte-identical. A "House liquidity (memo)" section renders ONLY when the pack month holds at least one marked
     CONFIRMED transaction, with the rows:
     - "of which: house liquidity stakes (in the GGR base)" (value, count);
     - "of which: staff-chosen house stakes (Enter now and targeted)" (N1 §9; value, count; asserted ≤ the row above; read
       through the entry-split reader R1 uses);
     - "House liquidity net result (held in designated accounts; not operator revenue)";
     - "Designated house accounts at period end" (bots with `designatedAt` ≤ period end and `removedAt` null or later,
       through `listOverlapping`, the reader R1's register uses, 177).
     The GGR note at `catalogue.ts:187` becomes "GGR = total stakes − total payouts − refunded stakes." in every pack (the
     formula at `report-money.ts:155`). Inside the memo condition, the provenance note (`:191-200`) gains a sentence naming the
     `Transaction` and `Position` `houseBotId` markers and the HouseBot tables.
     - **W21** (§8): the memo reaches the Gaming Board on the first routine monthly filing after Ali switches ON (D1),
       possibly before his decision on the private Board draft (D19b). Default: build as ruled. Alternative: render only after
       Ali records that the Board draft was sent — which would revive a sent-record writer, because D19 struck P1's disclosure
       tracking (PROGRESS.md:38) and `HouseBotControl.boardDisclosureSentAt` (`house-bot-dal.ts:157`) has no writer today (the
       draft's gate on that column would silently never render). The FIU Context column's timing sits in the same row (228).
     - **Source:** R3 NEW-gbt-memo AMENDED; R3 d19Leaks (the W21 alternative); R3 NEW-s9-basis AMENDED.
     - **Proof:** reports §9 on both stores: a month without marked money gives a pack equal to its no-marker twin apart from
       the GGR note (title, subtitle, summary, sections and notes compared; meta and signatures excluded); a month with marked
       money adds exactly the memo; staff-chosen ≤ stakes; the designated count at period end with a bot REMOVED before and one
       after the end; memo stakes equal Σ `dayRows`. XLSX cells asserted and PDF read. Mutation: the memo rendered
       unconditionally (twin equality red).

228. **The FIU SAR's Context column.** `buildFiuSar` (`catalogue.ts:217`; columns `:306`) gains one column, "Context":
     "Designated house-liquidity account (since <EAT date of the covering window's designatedAt>)" when any designation window
     `[designatedAt, removedAt ?? ∞)` of a bot held by that user covers the row's `createdAt`; blank otherwise. It stops
     officers filing a holder's funding deposits as uninformed suspicions.
     - The inclusion rule (`:250-277`) is unchanged. Windows are read once per flagged user through
       `houseBotStore.listByUserId` (`house-bot-dal.ts:1340`, REMOVED included), cached beside `userCache`, and fetched only
       AFTER the existing erased-user skip (`if (!cached) continue`), so an erased holder's row never reaches the lookup, which
       is correct.
     - The masked-phone template at `catalogue.ts:264` stays exactly once in the file; the `userCache` and masked-phone block
       (`:262-265`) is neither copied nor moved (`test:read-tiers` 8.20; the `fiu-report-stops-masking-the-phone` anchor,
       `read-tiers.anchors.mjs:303-312`). Any new market read passes `productLine` explicitly (`test:product-line`).
     - **Timing:** the column renders from designation windows, which can exist BEFORE switch-on, so it can name an account to
       the FIU before the GBT memo can appear. Recorded in W21 beside the memo; default: build as ruled.
     - **Source:** R3 NEW-fiu-context AMENDED; R3 d19Leaks.
     - **Proof:** reports §9 on both stores: a row inside a window shows the context with that window's date; rows before
       `designatedAt` and after `removedAt` are blank; an erased holder is skipped before the lookup. `test:read-tiers` (7.1
       stays its inherited red) and `test:red-anchors` re-run. Mutation: `removedAt` ignored (the row after removal red).

229. **Match integrity is built as sealed; its house parts render only when a voided market holds a marked position.**
     (REFUTED → AMENDED; ADJ 6.) 04 R3 seals the "House stake" and "Resolution path" columns, and CRA-22 adds the house
     section, the refund flag and the predictor note. D19 strikes only public text and holder-facing surfaces and leaves every
     admin-console surface; the extract's banner and RESUME AT say "its reports … stand"; the "Sportradar + GBT integrity
     unit" audience (`reports/page.tsx:138`) names a stub with no channel in code, and CRA-22's own trigger is the GBT
     integrity unit's request. Omitting sealed columns would itself be the deviation that needs Ali's yes. `buildMatchIntegrity`
     (`catalogue.ts:954`) keeps every existing section, row and summary byte-identical to a no-marker twin.
     1. "Voided markets" gains **"Resolution path"** on every row, read from each market's own record through ONE bulk durable
        read, `getAuditByActionsDurable(["market.adjudicated", "market.emergency_void"], …)` (windowed, 185) — never one read
        per market. The read is windowed to the report's own period; `truncated` is printed with 205's sentence; a void whose
        decision row falls outside the window is never shown as "—" silently. Values: "Single admin" or "Two officers" from `market.adjudicated.payload.resolutionAuth` (the field
        `test:two-admin` pins); "Emergency void (single admin)" from `market.emergency_void`; "Automatic" for an Up & Down
        round or a one-sided refund with neither record; "—" (not recorded) otherwise. Never derived from today's
        resolution-policy flag.
     2. **The house parts render ONLY when at least one voided market holds a marked position** (the GBT memo's discipline):
        a "House stake" column (TZS, marked stakes on that market); a section "Markets with house liquidity that were voided
        or reversed on objection"; a "House-marked" flag on refund rows whose transaction carries `houseBotId`; and the note
        "Predictors include house accounts (D6)." Predictors stay `m.predictorCount` (`catalogue.ts:969`;
        `test:predictor-count`; D6).
     3. The stale note at `catalogue.ts:1040` ("markets voided by the two-officer resolution flow") is corrected to say the
        market was voided by an admin under the resolution policy in force on the day (a single admin by default, or two
        officers when the policy requires it).
     4. Any new market read in `catalogue.ts` passes `productLine` explicitly (`test:product-line`).
     5. **W22** (§8) records the alternative for Ali: omit the house parts while Sportradar is a declared recipient of this
        report; R1 and the house-market statement carry the same facts to the regulator alone.
     - **Source:** R3 NEW-match-integrity-audience REFUTED → AMENDED; ADJ 6.
     - **Proof:** reports §9 on both stores: with no voided house-held market the report equals its twin apart from the note
       fix and the Resolution path column; with one, the four house parts appear; the path values for a single-admin and a
       two-officer adjudication, an emergency void, a voided round with no record ("Automatic") and an unrecorded case ("—");
       a spy proves ONE audit read for several voided markets. `test:predictor-count` unchanged (no count changes). XLSX cells
       asserted and PDF read. Mutation: the path derived from the current policy flag (red once the flag changes after the
       void).

230. **The harm and AML exclusions, and the compliance holder chip.**
     1. `detectHarmMarkers` passes `{excludeHouseBets: true}` to `db.txn.findByUser` (`responsible-gambling.ts:788`/`:801`;
        the only 10,000-row caller; the option is ruling 173's). Deposits are never marked, so RAPID_DEPOSIT_ESCALATION still
        reads the holder's funding deposits. This only stops house volume raising RG flags against the holder, which reveals
        nothing.
     2. `detectSuspiciousBets` skips rows with `houseBotId` in its grouping loop (`analytics.ts:495-500`), so the baseline
        median, recent stakes and velocity all exclude house stakes. The AML queue and SAR inclusion are untouched.
     3. The compliance harm table (`admin/compliance/page.tsx:621-637`; the list comes from `detectHarmMarkersForAllUsers`,
        `responsible-gambling.ts:822-832`) renders, under the user id of an account holding a non-REMOVED bot, a server-side
        `Chip size="sm"` reading "House bot holder since <designatedAt EAT date> · <status word>". Bots are read once per
        render through `houseBotStore.listNonRemoved()` (`house-bot-dal.ts:1342`) mapped by `userId` (never
        `findLiveByUserId` per row). The word and variant come from the one server-side map (186): a word, never the stored
        token (`test:labels` §3, `test:chip-contract`). In Commit 5 it is a plain chip for every admin; the owner's link to
        `/admin/house-bots/<id>` is added when that route exists (Commit 7, the P24 precedent), a deferral recorded against
        CRA-18 (255). Nothing is suppressed and no action is taken. Its visibility to COMPLIANCE is an accepted residual
        under 💡 X10 (§2 row 38).
     - **Source:** R3 NEW-harm-exclusion AMENDED.
     - **Proof:** reports §9 on both stores: 50 late-night house bets raise no LATE_NIGHT flag, while the same 50 unmarked
       bets do (control); RAPID_DEPOSIT_ESCALATION still fires on the holder's deposits; `detectSuspiciousBets` ignores marked
       stakes; the chip for a holder with an ACTIVE and with an AUTO_PAUSED bot, none for REMOVED. Phase C render of
       `/admin/compliance` at 1280 and 360. Mutation: the exclusion applied after the memory slice (memory red).

231. **`/admin/house` gains one clearly labelled marker card.** `/admin/house` stays ledger-truth (`house/page.tsx:7-17`).
     Its §9 addition is two marker reads in their OWN `AdminCard` whose description names the source, "from the house marker on
     transactions and positions, not from the ledger":
     - "House bots — net result (included above)" = `MoneySummary.house.net` for the page's resolved window;
     - "House bots — open stake" = `houseOpenExposure(null)` (`book.ts:116-119`).
     The page header law (`house/page.tsx:7-12`, "Every figure below is a booked sum read out of LedgerEntry") gains one
     sentence naming this card as the only non-ledger figure (a ledger-derived house figure is not an exact substitute: the
     orphan refund writes a marked BET_REFUND with no ledger posting). Neither figure is added to, subtracted from, or compared
     as a variance with any ledger figure (house-page §12.3). A null read renders `AdminKpi` unavailable or `AdminLoadError`,
     never `?? 0` (§3). Money uses the `amount` class, no Cash/Stat (§4), never gold. Both reads come after the
     `AdminRestricted` refusal (§5), and `test:house-page` §5.1's read list gains `moneyForWindow(` and `houseOpenExposure(`,
     so the order is pinned.
     - **Source:** R3 NEW-house-page-row AMENDED.
     - **Proof:** `test:house-page` §3/§4/§5/§12.3 with the widened read list; reports §9: the net equals
       `MoneySummary.house.net` and the open stake equals `houseOpenExposure(null)`; phase C render at 1280 and 360 including a
       failed read. Mutation: `?? 0` on the net (house-page §3 red).

232. **Every positioned transaction write copies the marker from the right object.** A static section of
     `test:house-bot-reports` (memory child). Population: every `.txn.create(` call in tracked `src/**` (wider than R3's
     `src/lib/server`, at no cost: a route writing a bet row would otherwise escape), read through `scripts/lib/decomment.mts`,
     each call's object literal taken by balanced braces. Rules:
     - a literal with `positionId: null` is exempt;
     - every other literal carries the marker as `...(p.houseBotId ? { houseBotId: p.houseBotId } : {})` or
       `houseBotId: <x>.houseBotId ?? null`, where the marker's source identifier is the SAME identifier whose `.id` is the
       literal's `positionId` (`positionId: p.id` ⇒ `p.houseBotId`);
     - at the stake write only (`market-service.ts:1385`), `...(ctx.kind === "house" ? { houseBotId: ctx.botId } : {})` is
       accepted, and only where `positionId` is the id of the position object marked from the same `ctx` in that function;
     - `.transaction.create(`, `.transaction.createMany(` and a raw `INSERT INTO "Transaction"` anywhere in tracked `src/**`
       outside `prisma-dal.ts` are red (a writer that bypasses the DAL).
     Controls: exactly 7 marked sites (`market-service.ts:1524`, `2792`, `3167`, `3577`, `3709`, `3850`, `4433`) and exactly 11
     `positionId: null` sites; a planted file with a positionId create and no marker is reported, and the same file with the
     spread passes; a planted file with a mismatched marker source is reported; a planted direct `prisma.transaction.create` is
     reported. The 7 spreads are quoted by the money anchors (`house-bot-money.anchors.mjs:144-145` SEAM:txnMarker,
     `:295-296` SEAM:markerOrphan): those lines are never reformatted.
     - **Source:** R3 NEW-txn-create-pin AMENDED.
     - **Proof:** the counts and the planted controls, each seen red or green.

233. **`leaderboard({excludeHouse})` and the reward walker.**
     1. `positionStore.leaderboard(limit, opts?: {sort, dir, productLine?, excludeHouse?: boolean})`, default false. The SQL
        appends the literal `and p."houseBotId" is null` inside the where at `market-dal.ts:1254` — no new bind, so `limit $1`
        and the optional `= $2` keep their positions (`:1250-1261`). The memory twin (`:708-716`) skips marked rows beside the
        `productLine` skip at `:711`, before grouping and `.slice(0, limit)`. `leaderboardPlayerCounts` gets no option.
     2. **The walker** lives in `test:house-bot-reports` (memory child), reads tracked `src/**` decommented, case-insensitive,
        with two rules. **Rule 1 (FS-05):** an AGGREGATE SITE is a file calling `.leaderboard(`, `.leaderboardPlayerCounts(` or
        `.dailyTotalsByUser(`, or whose decommented source names `"Position"` and holds a GROUP BY list containing the exact
        quoted identifier `"userId"` (so `"triggerUserId"` does not count). Each such file is on a DISPLAY_ONLY allowlist that
        may only shrink, each entry stating its reason, or every call passes `excludeHouse: true` / its SQL filters
        `houseBotId is null`. The allowlist as measured: `src/lib/server/market-dal.ts` (the definitions);
        `src/app/leaderboard/page.tsx` (`:149`, `:253`, D6); `src/lib/server/updown-digest.ts` (`:232`, a notice, no credit);
        `src/lib/server/house-bot-dal.ts` (`lockedPool`, `:4075-4101`, `GROUP BY "side", "userId"` with an uppercase
        `IS NULL` filter concatenated across lines: a counterparty measure over non-house positions, never a reward).
        **Rule 2 (R4 + F9):** a file that references `creditInternal`, `creditBonus` or `adminAdjustBalance`
        (`wallet-service.ts:1989`, `:2599`; `bonus-service.ts:94`) AND reads positions at all (`positionStore.`, SQL naming
        `"Position"`, or calls to `listPositionsForUser(` / `listPositionsForMarket(`, `market-service.ts:1828`, `:1832`, the
        helper-in-another-file hole) must name `houseBotId` or pass `excludeHouse: true`. Offenders today: 0, re-measured.
     3. **Controls:** a planted Position group-by plus `creditBonus` is red, and adding the filter turns it green; a new
        unlisted `.leaderboard(` caller is red; an allowlist entry whose file no longer aggregates is red; a planted reward over
        `listPositionsForUser` is red.
     4. The docs rule already exists (`HOUSE-BOTS.md:826`, `COMPLIANCE-DECISIONS.md:249`: "No prize, cashback, tournament or
        rank reward on house stakes"); a pin checks both lines still exist.
     FS-05's `NON_HOUSE_POSITION_SQL` export and its prize-run line are owed by the first reward feature (256, L37).
     - **Source:** R3 NEW-reward-walker AMENDED.
     - **Proof:** reports §10 on both stores: `excludeHouse: true` drops only marked rows; the default equals a no-marker twin.
       Reports §0 walker controls. `test:leaderboard-order` unchanged (its cases pass no option). `test:dal-parity` for the
       option. Mutation: the SQL literal placed outside the where (Postgres red).

234. **D6: the bot stays on the public leaderboard, pinned.** On both stores: `leaderboard()` with no option ranks a holder's
     marked positions exactly like a player's; `excludeHouse: true` drops only marked rows; the default output equals a
     no-marker twin. A source pin: `src/app/leaderboard/page.tsx` and `src/lib/leaderboard/**` never pass `excludeHouse` (D19c
     makes the default-false rule stricter: the public page must never pass it). `predictorCount`, `traderSeedsByMarket`,
     `leaderboardPlayerCounts` and platform-stats get no house filter. `test:report-parity` §5's regex
     (`report-parity.test.mts:256-261`) keeps matching the page's unchanged call (`leaderboard/page.tsx:149` untouched).
     - **Source:** R3 NEW-d6-public-pin STANDS.
     - **Proof:** reports §10; reports §0 (a planted `excludeHouse` in the page → red); `test:report-parity` §5.

235. **The Up & Down digest: the split is struck; F6's email rule is built through `channelAllowed`.** The digest house SPLIT
     is STRUCK (D19c; C4 rulings 143–144): `dailyTotalsByUser`, `digestCopy`, `notifyUpDownDigest` and `updownDigestHtml` get
     no house line or label, and the bell keeps `origin/main`'s all-round figures (`updown-digest.ts` and both
     `dailyTotalsByUser` twins are identical to `origin/main` today). What remains is F6's email rule (04:1718-1721; kept by
     ruling 143 and applied to selection closed by ruling 144): a notice whose positions are all house-marked sends no email.
     Today a house-only digest day emails the holder (`updown-digest.ts:257-273`).
     - `DailySettledTotals` (`market-dal.ts:540`) gains `ownRounds`. Memory twin (`:744-765`): the seed gets `ownRounds: 0`,
       incremented when `p.houseBotId == null`. SQL (`:1303-1349`; the select, row type and map at `:1321-1323`,
       `:1343-1348`): `(count(*) filter (where p."houseBotId" is null))::int as "ownRounds"` in the same single aggregate, no
       new bind.
     - `runUpDownDailyDigest` sends the email only when
       `channelAllowed("ROUND_RESULT", { houseOnly: line.totals.ownRounds === 0 }).email` is true (`comms-registry.ts:400`,
       F6's helper, which has no production caller today; this is its first). The bell write (`:249`), the idempotency probe
       (`:242`), the write-then-email order and the `updown.digest_sent` audit payload are unchanged; no house count is added
       to the audit.
     - The `comms-registry.ts:396-399` docstring drops "the holder's hourly summary is the one account of those stakes, and it
       is a bell" (ruling 149).
     - `updown-digest.ts:242` and `:141` stay byte-identical: `red:updown-digest` mutates those two literal lines
       (`scripts/updown-digest-red.mjs:54`, `:60`) and declares no anchors, so `test:red-anchors` §3 cannot see them rot. The
       `:209` `ops:updown-digest-preview` citation comment stays (the guards-exist phantom list).
     - **Accepted residual** (listed so the D19 lens sees it is deliberate): a holder whose Up & Down day was all house rounds
       gets the digest bell but no email. The difference is observable but carries no words, and repeats the precedent of C4
       rulings 143–144.
     - PROGRESS records the unbuilt Commit 4 split as a Commit 4 residue closed here (L40): C4-SPEC:21/:88/:203/:227 scheduled
       it in step 9, and it was neither built nor recorded as struck.
     - **Source:** R3 P29 AMENDED; R3 MISSED (`red:updown-digest`); R3 d19Leaks (the residual); D19 d19Impacts (§7 P29
       STRUCK).
     - **Proof:** reports §9 on both stores: a house-only day gives a bell byte-identical to a player's and no email; a mixed
       day gives one email with all-round figures; a non-holder is unchanged. `test:updown-digest` (§7's inherited red must be
       the same assertion as on clean `origin/main`) and `red:updown-digest` re-run. `test:dal-parity` for `ownRounds`.
       Mutation: the `houseOnly` argument dropped → red.

### 6.G · R5 data rights and R6 erasure

236. **R5's house projection is built only as an OWNER-ONLY internal record.** (ADJ 2; supersedes §1 S1.)
     - `src/lib/server/house-bot/dsar.ts` exports `houseLiquidityDsarView(userId: string): Promise<HouseDsarRecord | null>`. It
       returns null when the account has no designation, no PENALTY_BOXED event and no countered position.
     - The record is an allowlist. Its FIRST key is `classification`, a fixed sentence: "Internal 50pick officer record — not
       part of the data subject's access response. Do not send it to the player. Whether any of it may be released is an open
       legal decision." Then `generatedAt`, `userId`, `designations` (237), `events` (238), `positions` (237), `transactions`
       (237), `liquidityDecisions` (239; null for a non-trigger account).
     - R5's never-list, verbatim: no `passwordFingerprint`, no hash, no officer id, no `triggerUserId`, no press row, no reason
       text, no `marketId` on an event; never `decision.counterparties` (N1 §9, 04:3592); no `idempotencyKey` on a position (a
       house position's key is `hb:<intentId>`, `constants.ts:72-75`, `market-service.ts:1382`). Kept whole, a W2 answer of
       "disclose" needs one wiring change, not a new projection.
     - **Access:** OWNER-ONLY, through `requireOwner("exportInternalRecordAction")` (`rbac-guard.ts:208-229`, ADMIN plus
       step-up). Its only caller is a new server action, `exportInternalRecordAction(userId)` (a neutral name, 174), which
       returns a JSON download named `internal-record-<userId>-<YYYY-MM-DD>.json`.
     - **Offered ONLY on `/admin/players/[id]`; NEVER on `/admin/privacy`** beside "Export bundle" (`dsar-controls.tsx` is not
       changed).
     - (a) `/admin/players/[id]` reads nothing for the internal record unless the viewer's role is ADMIN; for any other role it
       renders nothing — no ControlLocked placeholder, no disabled button. (The S7 chip marks holders only; rendering or
       placeholding this control would tell SUPPORT staff, who talk to players by phone, which ordinary players were
       countered. Designation 9.1 already keeps COMPLIANCE out of house alerts.)
     - (b) For an ADMIN viewer the page runs only a cheap EXISTENCE check: `houseBotStore.listByUserId(id).length > 0`, OR at
       least one PENALTY_BOXED event for the user (`listByUserKinds` with limit 1), OR
       `houseBotIntentStore.counteredPositionsCount(id) > 0`. The full `houseLiquidityDsarView` is built only inside
       `exportInternalRecordAction` (at render it would call `readBotAndHolder` per bot, with RG, KYC and wallet reads and
       `openErasureRequest`, which throws on an unreadable queue, `privacy.ts:230-235`).
     - (c) Designations, events, positions and transactions are paged with cursors up to their caps, with a REAL total
       (237–239); `rows.length` never stands in for `total`.
     - (d) **Audit:** `house_bot.exported` (category ADMIN, `constants.ts:755`), targetType `"User"`, targetId the subject,
       payload `{code: "INTERNAL_RECORD", counts: {designations, events, positions, transactions}}`, plus `holderUserId` ONLY
       when the subject holds a designation (a trigger player is never misnamed a holder), checked with
       `isAllowedHouseAuditPayload` (`constants.ts:859`; `code`, `counts` and `holderUserId` are allowed keys, and no `userId`
       key is needed because the subject is the target). `designation.ts`'s `houseAudit` (`:50-53`) is module-private, so
       either a shared helper is exported or `audit()` is called with the same check. The row appears in that player's admin
       audit panel (`page.tsx:136`) for every staff role that can open the page: accepted as an admin surface under D19 (X10).
       `house_bot.exported` now has TWO writers told apart by `payload.code`: this row (`"INTERNAL_RECORD"`) and the per-bot
       CSV (213, no code). Commit 7's console suite must never assume every `house_bot.exported` row is owner-only (L48).
     - The button label is passed from the server page as a prop; a client download button, if needed, is a generic one that
       receives the label and the bound action (the `export-player-button.tsx` pattern), with no house word in any client
       file (174). `exportPlayerDataAction` and its `player.data_exported` audit stay untouched (`test:read-tiers` 8.19).
     - `dsar.ts` lives under `src/lib/server/house-bot/` (it reads the DAL, which pure `src/lib/house-bot/*` may not). No
       releasable door imports it (the pin in 243). It has a live caller in the same commit (`test:orphans`).
     - **Source:** DSAR NEW-internal-house-record AMENDED; D19 draft 168 AMENDED (events shape, counterparties, the two
       writers, the in-file notice); DSAR MISSED (audit panel, PROGRESS:131); ADJ 2.
     - **Proof:** reports §12 on both stores: `exportInternalRecordAction` refuses COMPLIANCE, SUPPORT and an ADMIN without
       step-up; an ADMIN render runs the existence check only (a spy: no `readBotAndHolder` at render); a COMPLIANCE or SUPPORT
       render runs none of the internal-record reads (`houseBotStore.listByUserId`, `houseBotEventStore.listByUserKinds`,
       `houseBotIntentStore.counteredPositionsCount`, `houseLiquidityDsarView`) and renders no control or placeholder (a
       spy); the S7 chip's `findLiveByUserId` read is expected for every role (241); a holder, a trigger player and an ordinary player give
       non-null, non-null and null; the audit row carries `code: "INTERNAL_RECORD"`, targetType User, and `holderUserId` for
       the holder only; the file name; `classification` is the first key. `test:dsar-secrets` §8 (243). Phase C renders (§3 step
       11). `test:control-gates` and `test:orphan-actions` (a new exported `*Action` needs a live caller and the gate and audit
       shape those suites require; read their printed population first). Mutations: the control rendered for COMPLIANCE
       (red); the audit without `code` (red); `holderUserId` written for a trigger player (red).

237. **The record's designations, positions and transactions.**
     - `designations[]` = `{botId, status, causes, designatedAt, consent: {method: "password entered by 50pick", verifiedAt}, consentVoidAt, consentVoidCause, removedAt, removedReason, writtenBy50pick: {label, note}}`
       for every bot of `houseBotStore.listByUserId(userId)`, REMOVED included. `causes` are live, from `control.ts`
       `readBotAndHolder(botId)` (`:60`, causes `:94`); when it throws (e.g. `openErasureRequest` on an unreadable queue),
       the record writes `causes: null` and the note "unreadable", caught per bot — never failing the whole record and never
       guessing.
     - **Consent wording:** the internal record keeps R5's sealed value "password entered by 50pick" (P11 STANDS: it matches
       D5 as recorded at `COMPLIANCE-DECISIONS.md:158`, "the owner types the account's password", and the code, whose
       verification copy is addressed to the officer). R1 prints only what the row stores (202). The authorities conflict:
       D19's restatement (`COMPLIANCE-DECISIONS.md:215`, `:291`; `PROGRESS.md:40`) says the holder types their own password.
       W24 asks Ali; when he rules, both strings follow in one commit. `:215` records his ruling and is not silently edited.
     - `positions` = `{rows: [{id, marketId, side, stake, status, payout, placedAt}], total, truncated}`: marked positions,
       MANUAL and targeted included, cursor-paged through `positionsForUser` (177) to a 1,000-row cap.
     - `transactions` = `{rows: [dsarTxnView(t) plus houseBotId], total, truncated}`: marked transactions through
       `txnPageForUser({marked: "only"})` (177) to a 1,000-row cap.
     - Field names are R5's (`designations`, `events`, `positions`, `transactions`), each list with `rows`, `total` and
       `truncated`; G1's `housePositions[]` / `houseTransactions{…}` are not used (PLAN §18: "G1 = R5 (R5 is the text to
       build)"). `truncated` = `total` > rows returned.
     - **Source:** DSAR P11 STANDS; DSAR MISSED (D5 wording, paging); REP MISSED (D5 wording); DSAR buildNotes. REP MISSED
       (D5 wording) is declined for the internal record: DSAR P11 STANDS keeps R5's sealed value, because the record is not
       regulator paper. Only R1 (202) takes REP's wording, and W24 carries both.
     - **Proof:** `test:dsar-secrets` §8 (memory): a planted future `HouseBot` column is absent; no fingerprint, hash or
       officer-id sentinel; `causes: null` with the note when `readBotAndHolder` is made to throw. Reports §12 on both stores:
       1,001+ marked positions and transactions give a real `total`, `truncated: true`, and paging past 500. Mutation: `total`
       computed as `rows.length` (red).

238. **The record's events: 17 kinds, read per bot, three actor words.**
     - The events are exactly `DSAR_HOLDER_EVENT_KINDS` (17, `constants.ts:291-318`), read PER BOT of
       `houseBotStore.listByUserId(userId)` (REMOVED included) through
       `houseBotEventStore.listByBot(botId, {kinds: DSAR_HOLDER_EVENT_KINDS, limit: 500, cursor})`, following the cursor to a
       1,000-row cap with a real total. Never `listByKinds` filtered by `userId`: holder events can carry a null `userId`
       column (the planner's TARGET_ENDED writes `userId: bot?.userId ?? null`, `planner.ts:318`), and `listByKinds` has no
       cursor and clamps at 500.
     - `events.rows[]` = `{kind, at, actor}`: no from/to, no reason, no `marketId`, no payload (the shape at
       `constants.ts:291-292`, `docs/HOUSE-BOTS.md:163`, 04:3590/:3748/:4313; §1 S20).
     - **Actor words (ADJ 2):** "system" when `actorId` is null; "account holder" when `actorId` equals the record's `userId`;
       "50pick owner" otherwise. (The only non-null, non-officer actor on a holder event is the holder, through
       `withdrawHouseConsent` → `voidHouseConsent`; every other writer passes null or an officer id, and Enter now and targets
       are ADMIN-only, W10, so no word states something false.)
     - PENALTY_BOXED appears only through `liquidityDecisions` (239).
     - The list itself is unchanged and stays pinned (`house-bot-rules.test.mts:1527-1531`); its docstring
       (`constants.ts:291-299`) and `docs/HOUSE-BOTS.md:163` change from "the event kinds a HOLDER's data-rights export may
       show" to "the officer-only internal record (W2)". Rules 11.22 (`EVENT_KINDS` exactly 30) and 11.8 stay.
     - **Source:** DSAR P15 STANDS; DSAR P16 AMENDED; D19 draft 168 AMENDED (shape); REP d19Leaks (docstring); ADJ 2.
     - **Proof:** `test:dsar-secrets` §8: only the 17 kinds, each exactly `{kind, at, actor}`; no reason sentinel; no
       `marketId`; the three actor words (a system event, a holder-acted withdrawal, an officer event). Reports §12 on both
       stores: a TARGET_ENDED event with a null `userId` column is listed; 1,001 events page with a real total. Mutations: read
       by `userId` (the null-userId event missing → red); "50pick owner" for the holder (red).

239. **Trigger players: nothing in their doors; decisions only in the internal record.**
     - Neither releasable door carries a trigger section (168). `liquidityDecisions` =
       `{excludedDays: {rows: [{day, cause}], total, truncated}, counteredPositionsCount, note}` exists only in the internal
       record, null for a non-trigger account.
     - `counteredPositionsCount` = `COUNT(DISTINCT triggerPositionId)` over HouseBotIntent where `triggerUserId` = the user AND
       `kind = 'COUNTER'` AND `status = 'PLACED'` (targeted counters included; MANUAL has no trigger; Enter now excluded,
       04:3593): the new `houseBotIntentStore.counteredPositionsCount` in both twins (index `schema.prisma:2111`), the bigint
       count converted with `Number()`.
     - `excludedDays` comes from the new cursor reader `houseBotEventStore.listByUserKinds(userId, ["PENALTY_BOXED"], {limit ≤ 500, cursor})`
       (served by `@@index([userId, kind, createdAt])`, `schema.prisma:2052`), paged to a 3,000-row cap (seven years can hold
       about 2,557 boxed EAT days), projected to `{day: payload.day, cause: payload.cause}` (cause `CASHED_OUT_COUNTERED` or
       `BOTH_SIDES`; `payload.day` is the EAT day key from the AlertOnce claim, `outcomes.ts:268-269`; one box per account per
       EAT day), `truncated` = total > rows returned. Never `listByKinds` with a limit above 500.
     - **A box can stand without its event:** the append runs after the claim inside a try that only logs (C4 ruling 117), the
       AlertOnce row that IS the box purges after 30 days, and no store member reads it by prefix. So `note` carries the fixed
       sentence "a box whose event write failed (ruling 117) is not listed". PROGRESS L32 records the gap; no AlertOnce reader
       by prefix is added (those rows are a 30-day throttle).
     - Neither array holds an id, time, side, amount, bot id or holder id.
     - A trigger player's `exportUserData` and `buildDsarBundle` are byte-for-byte what an identical account with no box and no
       countered positions gets (equal key sets and serialised shape; only ids and times differ): PENALTY_BOXED goes to
       HouseBotEvent and counter intents carry `triggerUserId` in HouseBotIntent, neither door reads those tables, and fire's
       BOTH_SIDES box never touches the player's stake. Their record is non-null, so it is offered to the owner on
       `/admin/players/[id]`.
     - CRA-10's "the support script answers from this" is struck by D19c: nothing player-facing is derived from the record. The
       INTERNAL staff script (CRA-23; `docs/HOUSE-BOTS.md`: never confirm or deny an account, never deny that 50pick places
       stakes, escalate to the owner) stays an internal document, written with Commit 6's D19d guard, not in Commit 5.
     - **Source:** DSAR P14 AMENDED; DSAR NEW-trigger-player-doors STANDS; D19 draft 172 AMENDED; DSAR MISSED (the box
       without its event).
     - **Proof:** `test:dsar-secrets` §7 (memory): the trigger player's two doors equal a no-box twin; 31 days after the
       AlertOnce purge (box, then retention's purge, or backdate and purge) the record still lists the day, with no `hb_`,
       `hbi_` or bot `userId`. Reports §12 on both stores: two counters on one position count 1; a targeted counter counts; a
       SKIPPED counter does not; 501+ boxed days page with a real total. `test:dal-parity` for both members. Mutation:
       `count(*)` instead of DISTINCT (red).

240. **The officer player page reads transactions directly.** `/admin/players/[id]` (`page.tsx:130-144`) stops calling
     `exportUserData(id)` and reads `db.txn.findByUser(id, 1000)` inside the same try/catch, keeping A-5's `txnsFailed` state:
     a thrown read shows "unavailable", never a fabricated TZS 0. Every `data.user!.id` use (measured at `:460`, `:461`,
     `:474`, `:475`, `:478`, `:482`; the D19 area counted seven, so re-derive) becomes the page's own `user.id` (non-null after
     `notFound()` at `:89`), and the import at `:21` is removed. The page used only `data.transactions` (`:133`) and
     `data.user!.id`, never `auditEntries`, KYC, wallet or RG (so the durable 1,000-row audit read was wasted), and its lifetime
     KPIs (`:140-144`) never read `houseBotId`, so a direct read gives identical figures. The switch is necessary: since ruling
     154 (and 169) the player door strips the marker, so this page becomes the only admin page that can tag house rows (241),
     and an admin screen no longer depends on the D19-shaped player door.
     - **Source:** DSAR P12 STANDS; D19 draft 171 AMENDED.
     - **Proof:** `test:dsar-secrets` §9 (or a page-level case): lifetime KPIs byte-identical before and after for a non-holder
       AND a holder; a thrown read renders "unavailable". Phase C render. Mutation: the catch removed (a thrown read crashes →
       red).

241. **The admin S7 chip and the transactions-tab row tag, rendered on the server.** Built in Commit 5 (admin-only, valid
     under D19; 03 S7). In the server page's chip row (`players/[id]/page.tsx:240-275`; the KYC chip precedent at `:244`),
     from `houseBotStore.findLiveByUserId(id)` (it excludes REMOVED): "House bot · <status word>", with the word and variant
     from ruling 186's server-side map ("Active", "Paused", "Auto-paused"); REMOVED shows no chip.
     - A plain `Chip` for every staff role until Commit 7's `/admin/house-bots/<id>` route exists; the owner's `Link` lands
       with the route (03 S7: a link that ends at AdminRestricted is a dead end).
     - A failed read renders "House bot · couldn't read" (warning) and is never hidden.
     - The tone map lives server-side and NEVER in `src/lib/status-tone.ts`, which four client components value-import (a
       `HOUSE_BOT` token there would reach `.next/static` and turn disclosure 1.1 and `verify:house-bot-bundle` red) — a known,
       recorded departure from 03 S7's `TONE_CHIP[…HOUSE_BOT_*]` (§1 S24).
     - The transactions tab tags rows whose `houseBotId` is set (from 240's direct read), rendered server-side the same way.
     - 💡 **X10** (default: as sealed, shown to every staff role): hide the chip, the row tag and the internal-record audit row
       from SUPPORT, the staff who speak to holders by phone; and the compliance harm-table holder chip (230) from
       COMPLIANCE, the role the privacy card tells to reply to data subjects (the same human channel as X12).
     - **Source:** DSAR P24 STANDS; D19 draft 182 STANDS (plain chip); R3 MISSED (one status vocabulary).
     - **Proof:** phase C renders as ADMIN, COMPLIANCE and SUPPORT for a holder with an ACTIVE and with an AUTO_PAUSED bot, a
       REMOVED holder (no chip) and a failed read; `test:house-bot-disclosure` and a fresh-build `verify:house-bot-bundle`;
       reports §0: `status-tone.ts` carries no HOUSE_BOT token (planted control).

242. **The export crowd-out is recorded for Ali, not built around.**
     - The releasable doors keep their caps: the player door 1,000 transactions (`user-service.ts:70`, no total or truncated)
       and 1,000 audit rows (`:86`); the officer bundle 10,000 transactions (`privacy.ts:303`). No exclusion is built (168).
     - The crowd-out hits BOTH doors. At 04's reference rate of 200 house bets a day (a stake row, plus a payout or refund row
       where one follows), the player door's newest 1,000 transactions lose a holder's own deposits within days and its 1,000
       audit rows fill in about five days (04:1208); the officer bundle's 10,000 transactions fill in about a month once payouts
       are counted. The internal record (house rows only) does not restore them, and D19 forbids saying why.
     - **W2 addendum** (§8): the neutral remedy, a change for every player that needs no house wording and follows the
       platform's own rule that a capped export says it is capped — the officer deliverable reads every transaction (paged)
       and states `total` and `truncated`, and the player door's transactions carry `total` and `truncated` as its
       `auditEntries` already do (`user-service.ts:74-85`), or a cursor-paged or uncapped transactions export. Not built without
       Ali's yes. PROGRESS L31.
     - **Rights sentence:** the bundle's `rights.access` ("Granted (this document).") and every other sentence of the releasable
       doors stay exactly as they are (any "except…" would be house wording in the subject's file). W2 gains one sentence: the
       releasable bundle states that access is granted while the internal record is withheld, and that is part of what Ali and
       a lawyer confirm — the one place D19 meets the PDPA access duty.
     - `test:dsar-secrets` §6 builds two fixtures, 1,200 and 10,200 house transactions newer than 3 deposits (memory,
       insertion order), and ASSERTS each door's measured deposit presence as a named known gap, labelled "recorded degradation
       (L31), not G1": at 1,200 the officer bundle holds the 3 deposits, and the player door holds none and equals the officer
       bundle's newest 1,000 rows; at 10,200 the officer bundle holds none. A fix and a regression both turn it red; no count is
       printed in place of an assertion.
     - **Source:** DSAR NEW-export-cap AMENDED; D19 draft 173 AMENDED; DSAR NEW-rights-sentence STANDS.
     - **Proof:** §6 as stated; the W2 addendum and L31 written in the same commit.

243. **`test:dsar-secrets` §6–§9, and the Postgres proofs of absence.** The releasable-door absence is proven where the
     null-key leak lives (Postgres, `prisma-dal.ts:410`), in three places:
     1. `test:house-bot-money` on both stores: 1.14 — every row of the holder's `exportUserData` has exactly the 23 allowlisted
        keys; 1.14b — the holder's `buildDsarBundle` likewise, neither JSON containing the bot id, an intent id, `hb:` or
        `houseBotId`; 1.14c — a NON-holder's bundle has no `houseBotId` key (vacuous on memory; Postgres proves it); 1.14d (170).
     2. `qa:house-bot-holder-view` 4.2: `leaks(JSON.stringify(await buildDsarBundle(holderId)))` is empty, and the same for a
        trigger player (248).
     3. `test:dsar-secrets` (memory, predeploy; it imports the memory store directly, `dsar-export-secrets.test.mts:33-34`)
        keeps §5 exactly (it compares only the `user` key sets, `:121-130`; the extract's guard-15 premise is gone) and adds:
        §6 holder absence in both doors at any depth, with a CONTROL that the raw rows carry the marker, and the crowd-out
        characterization (242); §7 the trigger-player twin equality and the post-purge internal record (239); §8 the
        internal-record allowlist (fingerprint, hash, officer-id and `triggerUserId` sentinels absent; a planted future
        `HouseBot` column absent; only the 17 kinds as `{kind, at, actor}`; no reason sentinel, no `marketId`, no press row, no
        `decision.counterparties`; `classification` present as the first key); §9 a planted future `Transaction` column never
        reaches either door, an identical transaction key-set rule beside §5, a source pin (planted control) that neither
        `user-service.ts` nor `privacy.ts` imports `house-bot/dsar`, and the officer page's KPI equality (240). It imports the
        vocabulary module (175), never `scripts/house-bot-disclosure.test.mts`.
     Each new §6–§9 assertion gets a scratchpad mutation, run and recorded (217).
     - **Source:** DSAR NEW-postgres-proofs STANDS; D19 guard notes (§5; memory-only suite); DSAR MISSED (no red harness).
     - **Proof:** the cases above. Mutations: `dsarTxnView` dropped from `buildDsarBundle` (1.14c Postgres red); a planted
       import of `dsar.ts` into `privacy.ts` (pin red); `classification` moved to second place (§8 red).

244. **`test:erasure`: six house buckets, a live-bot refusal section, three declared mutations.**
     - **Fixture:** designate a bot on SUBJECT with label = NAME and a note containing NAME; append an event and a press whose
       reasons contain NAME; add one intent, one target, and an admin HOUSE_BOT notification quoting "NAME" with an href
       containing the bot id, created inside the designation window (so it matches the scoped redaction — kind HOUSE_BOT, href
       with the bot id, inside the window — or 8.b goes red for a fixture reason). Add ONE ADMIN user: the recipient of §2b's
       alert and the owner of the `notificationsAdmin` bucket, read with `db.notification.findByUser(ADMIN, 100)`
       (`notifyAdminsHouseBotErasureBlocked` alerts `houseBotAlertRecipients()` and returns 0 with none, and `erasure.ts:201`
       then releases the claim).
     - **Order:** designate (DAL designate + `setVerified`); the event and the press; the intent and the target; the admin
       notification; §2b; then `setStatus` → REMOVED; then §3. Writes go through `db` on the memory store the suite imports
       (`erasure.test.mts:40-51`), not the service layer, so no async holder hook races the fixture; if a service writer is ever
       used there, the in-app hook is suspended as ruling 156 prescribes. Bucket reads: `houseBotStore.listByUserId`,
       `houseBotEventStore.listByBot(botId, {limit})`, `houseBotIntentStore.get` / `listFeed`,
       `pressStore.listRegister({fromIso, toIso, houseBotId})`, `targetStore.listForBot(botId, status, null)`.
     - **§2b "it REFUSES a live house bot"**, between §2 (`:234-246`) and §3's call (`:251`), against the already-CLOSED SUBJECT
       (the refusal is reached only on a CLOSED account, `erasure.ts:185-193`) with the bot still live: reason
       `house_bot_live`; SUBJECT's phone and name untouched; exactly one "Erasure blocked" HOUSE_BOT row in the ADMIN's inbox
       across two calls. PENDING stays proven by designation 8.1b (`test:erasure` does not go through the request queue). §11
       (the DATABASE half, `:603`) is NOT renumbered.
     - **§8 gains SIX buckets:** `notificationsAdmin`, `houseBots` (`listByUserId`), `houseBotEvents`, `houseBotIntents`,
       `houseBotPresses` and `houseBotTargets`. All six go into `MUST_HAVE_CONTENT` (`erasure.test.mts:542-554`) in the same
       edit; 8.0c's planted-needle control stays; a lowercased NAME needle is added (`labelKey` is lowercase).
     - **`red:erasure` gains three mutations** declared in `scripts/anchors/erasure.anchors.mjs`, each with a `from` string
       UNIQUE in `erasure.ts` (the harness refuses an anchor that is missing or matches more than once): (1) the
       `redactFragment` call at `erasure.ts:424-426` replaced by `0` → red on 8.b `notificationsAdmin`; (2) `:428` replaced by
       `const house = { ok: true as const, bots: 0, events: 0, presses: 0 };` → red on 8.b `houseBots`/`houseBotEvents`/
       `houseBotPresses`, never on a crash (deleting the call would leave `house` undefined and `:431` would throw a TypeError
       before §8); (3) the `if (liveBot)` at `:196` made false → red on §2b's "nothing erased". Each is run and seen red on its
       own assertion; the existing label-redaction mutation stays.
     - `test:house-bot-designation` §8 (`house-bot-designation-cases.mts:754-791`) is unchanged: it is the two-store proof R6's
       "§11" points at (refusal copy, PENDING, one owner alert, pseudonymised label/note/reasons, admin inbox redaction, re-run
       zero), cited rather than duplicated.
     - The R6 refusal copy is unchanged (an admin surface pinned by designation 8.1). 💡 **X12** (default: no change): the
       `/admin/privacy` erasure overlay adds an officer-only line, "Don't tell the player why — the request stays open until an
       owner acts", because the refusal names "house bot hb_…" to the compliance officer (`erasure.ts:209-211` →
       `admin/privacy/actions.ts:126`), whom the privacy card tells to "reply to them through the channel they used"
       (`dsar-controls.tsx:125-126`). Designation 9.1 keeps the compliance role out of house alerts; this path is the one
       exception.
     - **Source:** DSAR P17 AMENDED; DSAR MISSED (the R6 human channel); DSAR guard notes.
     - **Proof:** `test:erasure` green with §2b and the six buckets; `red:erasure` with the three new mutations, each red on its
       own assertion; `test:red-anchors` §3 (each anchor resolves exactly once).

245. **A closure with the engine off still removes the bot (19.8b).** Engine case 19.8b on both stores, next to 19.8
     (`house-bot-engine-cases.mts:3568-3582`): with `HOUSE_BOT_ENGINE=false`, an ACCOUNT_CLOSED change through the holder hook
     leaves the bot REMOVED. R6's requirement stands, and no single case covers it at HEAD (19.8 is SUSPENDED with the env
     false; §19 row 5's closure runs with the env unset; lifecycle 3.3 shows the sweep reads no env). The in-app hook is
     suspended where ruling 156 requires, with the reason stated in place. `test:erasure`'s header cites it with designation §8.
     - **Source:** DSAR NEW-closure-engine-off STANDS.
     - **Proof:** 19.8b on both stores. Mutation: the hook returns early when the env is false (red).

246. **Personal positions are not added to any export.** Not built in Commit 5: CRA-04 asks for them, R5 (the sealed text)
     adds none, and extra controls wait for Ali's yes. 💡 **X14** (default: not built). If Ali ever approves them, house
     positions must appear exactly as own positions, with no marker, through an allowlist (D19c); under D19 such a section would
     list house stakes unlabelled.
     - **Source:** DSAR P13 STANDS; D19 d19Impacts (P13).
     - **Proof:** `test:dsar-secrets` §5 and §6 stay green (no positions key added).

### 6.H · Absence sweep and render proofs

247. **The service-layer absence sweep, for every viewer.** In `test:house-bot-reports` §11 on BOTH stores. The house fixture
     has poll and Up & Down house stakes, a penalty-boxed trigger, a holder comment, and one emergency void of a house-held
     market (so R9 payloads and the void's bus frames and notices exist while the sweep runs). For each viewer — signed
     out, another player, the holder, a trigger player — `JSON.stringify` the output of:
     - `getBoard` (`updown-board.ts:663`) and `getRoundDetail` (`:1346`);
     - `getMarket` (`market-service.ts:509`);
     - `positionStore.leaderboard` and `leaderboardPlayerCounts` (`market-dal.ts:440`, `:460`; SQL `:1232`);
     - `traderSeedsByMarket` (`market-service.ts:1853`);
     - every frame of the four `KNOWN_EVENTS` types captured from the bus (`market:odds`, `wallet:balance`,
       `notification:new`, `market:resolve`; `event-bus.ts:60-65`, the map `:35`; `market:odds` emitted at
       `market-service.ts:1678`, `:3125`), which `/api/events` forwards;
     - `getTickerFeed` (`ticker-feed.ts:32`) and `listComments` (`comments-store.ts:207`);
     - the GET handlers of `/api/fairness/recent` and `/api/health`;
     - the readers `/api/og/market/<id>` uses: the builder reads that handler and adds its data reads to this list (its image
       text comes from them; the served layer fetches the route itself).
     The `/api/health` read happens AFTER `acquireLeadership(HOUSE_PLANNER_TASK)` in the test process and is checked as 171's
     Proof states: no key or value equals the pre-change literal `house-bot` or matches 175's vocabulary; under 171 (a) the
     planner task's key is absent from `leadership`; under 171 (b) the neutral name is checked against 175; POSITIVE CONTROL:
     the unfiltered `leadershipSnapshot()` holds `HOUSE_PLANNER_TASK` (whatever its value). Session-scoped routes
     (`/api/positions/settled` refuses without a session, `route.ts:51-55`; `/api/events` for a signed-in session) belong
     to the served layer (248), where a real session exists.
     - **Needles:** the fixture's own bot, intent, event, target and press ids; `hb:` + intentId; the shared vocabulary with its
       bounded id patterns (175).
     - **Controls:** (i) a planted raw `positionStore.get(<house position>)` is FOUND; (ii) a raw NON-house position row is FOUND
       on Postgres (its `houseBotId: null` key — the identifier pattern counts `houseBotId` whatever its value, so an unprojected
       raw row is a leak by design), so the sweep fails a projection that leaks raw rows even with no house stake; (iii) the
       fixture's market title and the holder's display name ARE found in `getBoard` and leaderboard output, so the absence is
       not vacuous.
     - **D6 positives:** the holder is on the leaderboard, and `predictorCount` includes the bot.
     - It covers CRA-27 (every viewer, `/api/health`, the data-rights deliverables through 243 and 248, the SSE frames of
       all four `KNOWN_EVENTS` types), HB-LC-39 ("for non-holders" becomes every viewer), PLAN §12 (P:520), and 04 P1 §12's leak list
       (`/api/fairness/recent`, `/results`, `/api/og/market`, the ticker, comments, a planted needle), which asserts absence and
       therefore still lands.
     - **Source:** D19 draft 174 AMENDED; D19 d19Impacts (the 04 P1 §12 list); D19 buildNotes.
     - **Proof:** §11 on both stores with controls (i)–(iii); ruling 171's mutations go red here; a planted `houseBotId` key in
       `getMarket`'s output → red.

248. **The served layer: `qa:house-bot-holder-view`, extended to every viewer and a production-posture pass.**
     (`package.json:463`; `scripts/house-bot-holder-view-shots.mts`.)
     - **Holder pages added** to the existing ten: `/profile/account`, `/profile/activity`, `/updown/history` and
       `/updown/<roundId>` with a house Up & Down stake in the fixture, `/api/positions/settled?markets=`, and `/api/events`
       read for the holder's session (every forwarded frame through the leak check). The officer
       DELIVERABLE bundle (4.2), the internal record's absence from it, and the player export are read through the leak check.
     - A **trigger player** (boxed through the real sweep or `boxAccount`) gets the same pass over their pages and export.
     - A **signed-out visitor** and **another player** get `/`, `/markets`, `/markets/<id>`, `/live`, `/updown`,
       `/updown/<roundId>`, `/leaderboard`, `/results`, `/api/fairness/recent`, `/api/health` and `/api/og/market/<id>`
       (status and headers). (`/results/<id>` is not a route: `src/app/results` holds only `page.tsx` and its parts.)
     - A **second server pass in production posture:** `HOUSE_BOT_ENGINE` unset, master switch OFF, the planner lease acquired;
       it reads `/api/health`, with a control that the engine did start, and requests the per-bot CSV route and a
       non-existent sibling path under `/admin/` as a PLAYER and as the holder, for an existing and a non-existing bot id,
       and compares them (213 (1): status, body, every header except Date and request ids). (The normal pass runs
       `next dev` with `HOUSE_BOT_ENGINE=false`, `:73`, so it can never see the leadership key; production runs the engine
       by default.)
     - Each new viewer gets a non-vacuity control (the fixture's market title is present); 2.c's checkout-path control and
       3.1's non-empty control stay.
     - New holder pages are captured at 1280 and 360 as VIEWPORT TILES, never `fullPage` (the recorded 50pick visual-QA rule:
       full-page shots paint fixed layers mid-page and shrink a 360 page until it cannot be read), with the nextjs-portal
       hidden, and each tile is opened and read. The existing `fullPage` calls (`:246`) move to tiles.
     - **Method:** the scratch-database fixture through the real services (`loadWorld` + `w.place`), with an Up & Down house
       stake added; no dev seed route (253). Pages are fetched with `ctx.request.get` for the HTML (the ERR_ABORTED trap); the
       ROOT_PATH strip stays (`next dev` traces name the `kipindi-house-bots` folder); port 3021, never 3009/3011/3013/3014;
       `next dev` is killed with `taskkill /T /F /PID` and `node.exe` listed afterwards (the orphaned postcss worker trap).
     - HB-ACC-14, HB-ACC-40 and HB-LC-39 are named in these assertions (250).
     - **Source:** D19 draft 176 AMENDED; D19 MISSED (production posture, tiles, `/results/<id>`); D19 buildNotes.
     - **Proof:** the harness at §3 step 13 and at the closing gates (L20), with every tile read. Mutations: a planted
       `houseBotId` in a page's RSC payload → red; the production-posture pass with 171's filter dropped → red.

249. **The comment side chip (m) stays, and Ali is asked (W23).** Sanctioned change (m) stays as built
     (`src/lib/comment-side.ts:13-16`; `markets/actions.ts:347-348`): a holder whose only open position on a market is
     house-marked gets no side chip on their comment. Commit 5 re-runs its seam case as a regression named HB-ACC-13. 04 A18
     sanctions it and D19's supersede list (PROGRESS:38) does not name it — but it is not neutral under D19. Recorded as **W23**
     (ADJ 9) with the worked example and default "kept": after D19c the holder sees the house stake as his own YES bet on
     `/positions`, yet his own comment on that market carries no "Holds YES" chip, while a player with the same position gets
     one. Options: (a) keep (m) (default; no side is shown under his name for a stake he did not choose); (b) remove (m) so the
     chip follows every open position — the stricter reading of D19c ("exactly like the holder's own bets") and D6 ("publicly
     exactly like a player"; the account already shows publicly in trader avatars and on the leaderboard). H8 (no inbox receipt
     for a house stake, `market-service.ts:1716-1720`) is named in the row as the same class.
     - **Source:** D19 draft 181 AMENDED; ADJ 9.
     - **Proof:** the `test:house-bot-seam` (m) case re-run with HB-ACC-13 in its label; W23 in PROGRESS in the same commit.

250. **Coverage for scenario ids D19 struck or reshaped.** A struck or reshaped id counts as covered only through an assertion
     that names the id in its absence form (e.g. "HB-ACC-14 · D19c · /profile/account served HTML carries no house word").
     PROGRESS's Scenario coverage gate gets an Exceptions row "struck by D19" ONLY for ids with nothing left to assert: CRA-09
     and CRA-26 (wholly public text), FS-25's flag-on public fixture, and FS-30's public/holder-copy half. CRA-23 is covered by
     Commit 6's D19d forbidden-phrase assertions; CRA-24 by the Board draft (docs) and Commit 7's ON-modal "not recorded as
     sent" line; CRA-25 by `test:docs` on the COMPLIANCE-DECISIONS entry — each named in those commits, never as an exception.
     Commit 5's named forms:
     - HB-ACC-12 / CRA-04: the player door shows nothing; the internal record holds the section; personal positions are still
       not built (236, 243, 246).
     - HB-ACC-13: (m) (249).
     - HB-ACC-14: the `/profile/account` served-page absence (248).
     - HB-ACC-32 (regression): the neutral `objNotEligible` (ruling 146), never the house sentence 01:598-605 quotes.
     - HB-ACC-40: money 1.13b–e, the closed-exit words (ruling 147) and the served absence (248).
     - HB-LC-11 (regression): byte-identical notices with no label (rulings 143, 144).
     - HB-LC-39 / CRA-27: every viewer (247, 248).
     - CRA-10: the trigger player's doors show nothing; the internal record keeps the days and the count (239).
     - CRA-17: the admin half stays; the holder-standing half is already neutral (146).
     - FS-25: the aggregate reader stays R2's admin reader; the flag-on fixture is struck.
     - FS-30: iterating the dictionary's locales in the non-disclosure word list belongs to Commit 6's suite and leaves Commit
       5's list.
     - Unchanged admin, report and audit scenarios this commit covers, each named in its assertion: CRA-01/02/03/07/11/12/14/
       16/18/21/22/28/30–36, HB-LC-17/20 (reader half)/26/27/34, FS-05/22/26, TGT-28/36/38/39; also exercised: CRA-08 (202),
       CRA-19 (228), CRA-20 (227), FS-29 and HB-LC-24 (183).
     - **Source:** D19 draft 183 AMENDED; D19 d19Impacts (scenario rows).
     - **Proof:** the REL-0 coverage gate reads each id against an assertion label.

251. **How every admin surface is rendered and read.** Every surface in §5 is rendered and READ before the step that produced
     it is done (Ali: a surface not rendered is NOT MEASURED, never passed; visual perfection at every step). Phase C is the
     admin static harness (`next dev` + the in-memory store + `DISABLE_ADMIN_TOTP=true`); phase D is the real-route client pass
     for modals (03 X3). At least 1280 and 360, VIEWPORT tiles (never full-page), the nextjs-portal hidden, each PNG opened and
     read, each with a house, a no-house and — where the surface reads exposure — a failed-read fixture. Every surface looks like
     its kit neighbour (§5), built from the platform kit and design system (`docs/DESIGN_AUTHORITY.md`, the kit components, the
     existing templates), with the same words for the same things: house lines in sentence case, `text-body-sm text-text-muted`;
     money in the `amount` class; `AdminKpi` never gold; chip sizes and variants from the kit; no arbitrary pixel text sizes
     (`test:type-scale`'s inherited 909-vs-908 ratchet is never raised). Emails through `qa:cert-c1`'s visual pass; the
     staff-edge bell through `qa:house-bot-bells` (222). Generated artefacts: the XLSX reopened with ExcelJS and its cells
     asserted (a spreadsheet cannot be eyeballed from a PNG); the PDF opened and read page by page. The per-bot CSV has no visual
     surface in Commit 5.
     - **Source:** EXP P23 AMENDED; D19 draft 176 AMENDED (operationalised here); EXP buildNotes (visual); REP buildNote
       (render proof); D19 buildNotes (tiles); PROGRESS RESUME AT step 2.
     - **Proof:** the screenshots recorded in PROGRESS per step, with what was read.

252. **Commit 5's closing gates.** Commit 5 closes only when all of these ran and were recorded:
     - every `test:house-bot-*` suite on BOTH stores (L18), not a chosen list, with measured counts;
     - `tsc` 0;
     - `test:all` in this tree and in a clean `origin/main` worktree, compared red by red (every red identical on clean main or
       fixed here; never called "inherited" without running it on main, the lesson of C4 ruling 166); if `origin/main` moved,
       it is merged first (the Commit 4 pattern), with the KYC re-diff (197);
     - `verify:house-bot-bundle` on a FRESH `next build` (L15; a build older than `src/` is NOT MEASURED);
     - `qa:house-bot-holder-view` extended (248; L20);
     - `qa:house-bot-bells` and `qa:cert-c1` renders read (222, 195);
     - the mutation list (217) from a scratchpad worktree harness;
     - the 3-lens review, with one lens told to hunt API routes, DSAR deliverables and admin client chunks (the Commit 4 D19
       lens missed `/api/health` and the officer bundle);
     - the docs pass (258) and every register row in §8, in the same commit, pushed.
     Heavy Node goes through the lock where another session could run; the scratch Postgres keeps `connect_timeout=30` (ruling
     163), and an unexplained "Can't reach database server" is read as L24 first.
     - **Source:** D19 draft 174 AMENDED, draft 176 AMENDED (operationalised here); D19 buildNotes (closing gates);
       PROGRESS L15/L18/L20; C5-SPEC-EXTRACT §6 step 15.
     - **Proof:** PROGRESS's Commit 5 record.

### 6.I · Scope moves, known gaps and deferrals

253. **Nothing holder-facing, and no dev seed route.** No `SellButton` `houseStake`, no player chip, no activity-feed chip, no
     `market.houseStake*` or other player key. `sell-button.tsx` and the markets page's `heldLabel` are not edited (L21/L22 stay
     Ali's). D19c and rulings 146–147 already give the neutral words, and no holder-facing house surface exists in `src` outside
     the neutral seams. The admin S7 chip (241) and "of which chosen by you" (193) are built as planned. No
     `src/app/api/dev-test/seed-house-stake`: 03 §7 phase E step 2 "stamps `houseBotId`" on existing rows, but the marker is
     create-only in both stores (`store.ts:453`; `prisma-dal.ts:410`; the create-only update paths at `prisma-dal.ts:1597-1602`
     and `store.ts:1406-1412`, cases c21), so such a route cannot work through the DAL; it would also put house vocabulary under
     `src/app` (dev-test routes already 404 in production at the proxy, which is why that is not the decisive reason). The
     scratch-database fixture through the real services is the method (248). `test:feedback-law` on `sell-button.tsx` and
     `test:chip-contract` / `test:i18n` for player keys are not touched: if either goes red, the change is a D19 defect, not a pin
     to move. `test:labels` (rulings 166–167) still applies to any new admin emitter.
     - **Source:** D19 draft 182 STANDS; D19 draft 176 AMENDED (the seed route); D19 guard notes.
     - **Proof:** `test:house-bot-disclosure`; `qa:house-bot-holder-view`; `git diff` shows no change to `sell-button.tsx`, the
       player dictionary keys or `heldLabel`.

254. **R2's overview split and the CAP_EXPOSURE amount move to Commit 7.** A deliberate move off 04's placement table
     (04:2102 puts R1–R4 in Commit 5), for a non-D19 reason: the three-bucket overview split (Open on live markets / Awaiting
     settlement / Frozen by objection) and the CAP_EXPOSURE sentence naming the held amount land in Commit 7 with the console
     overview and feed and `test:house-bot-console`, because no overview page or feed renders before Commit 7 and an unrendered
     surface is NOT MEASURED. CAP_EXPOSURE IS already produced (`cap-precheck.ts:56` through `capEngineCode`; `seam.ts:191`
     `capReached("EXPOSURE")`); what is missing is an amount in its sentence (`feed-copy.ts:61`) and a surface that renders it.
     The engine records no held amount at skip time and may not read objection state (HB-LC-20), so Commit 7 must rule the amount
     as the console's render-time figure, worded as held now. Commit 5 builds only R2's reader half: `houseStakeByMarket`
     separates `openTzs` from `settledTzs` after a settlement and after a void, on both stores (179). PROGRESS L39.
     - **Source:** EXP P22 AMENDED.
     - **Proof:** reports §1 (179).

255. **What later commits owe because of Commit 5.** Recorded; nothing here is built now.
     - **Commit 7 — neutral names (L33).** `admin-nav-groups.ts` is imported by the client components `admin-sidebar-nav.tsx`
       and `admin-crumbs.tsx`, so a "House bots" nav label or an `/admin/house-bots` href added there ships to every visitor (and
       matches `house[_ -]?bots?`; the nav already ships `main`'s "House" → `/admin/house`, `admin-nav-groups.ts:94`, which is
       why bare `house` is never a vocabulary word). Commit 7's planned action names (`enterNowHouseBotAction`,
       `searchHouseBotMarketsAction`, …) would ship in client chunks. Commit 7 needs neutral action names, a nav entry injected
       from the server, and a route segment name checked by 175's path scan (PROGRESS:446). **Checked in Commit 5 too:** the
       per-bot CSV route's `house-bots` segment (213) is read by 175's path scan on the fresh build; if it appears in any file
       path under `.next/static`, the segment is renamed neutrally (with 03 S3 and 04:3353 marked) before Commit 5 closes.
     - **Commit 7 — `withdrawHouseConsent`** reshaped with the officer as actor (170; L49).
     - **Commit 7 — the owner links** to `/admin/house-bots/<id>` on the S7 chip (241) and the compliance chip (230; CRA-18).
     - **Commit 7 — the +60-day href-route test** for the staff-edge link (C4 ruling 23; L38).
     - **Commit 7 — two writers of `house_bot.exported`** (236, 213; L48); per-action category and payload assertions for the
       audit index (207); the per-bot CSV's buttons (213); the R2 overview split and CAP_EXPOSURE amount (254); L16's admin bell
       appearance (unchanged).
     - **Commit 7 — the copy pass:** the console's "liquidity stakes" strings (197; L36) and the admin counts that include bots
       (L34): the queue card's "{n} predictors", the ceremony's "N predictors · M open", the `/admin/markets` predictors cell,
       the rounds lever's "from N players" (`void-round-control.tsx:140`), the emergency-void toast and notice "refunded to N
       players" (`emergency-void-control.tsx:50`), and the KYC refused-balance line "Open bets still settle into this frozen
       wallet" (`kyc/[id]/page.tsx:529-533`). D6 keeps bots counted publicly; the admin wording is a Commit 7 copy decision.
     - **Commit 7 — R1 (e) and two-admin mode (L35):** oversight matches only `entry.actorId`, which on `market.adjudicated` is
       the stage-2 officer, while `payload.stage1By` names the stage-1 attester; with R9's `requestedBy` on the same row, R1 (e)
       can list a market whose stage-1 attester is in `requestedBy`. Two-admin mode ships OFF.
     - **Commit 6:** the internal staff script (CRA-23) with the D19d guard (239); FS-30's locale iteration (250).
     - **Commit 8:** the CSV clamp and TOTP release preconditions (211, 212); `ops:house-bots-status` on the admin reader (172).
     - **Source:** D19 draft 184 STANDS; D19 draft 170 AMENDED; EXP MISSED (stage-1 attester, admin counts); EXP
       buildNotes (counts); R3 NEW-harm-exclusion AMENDED (CRA-18); DSAR P24 STANDS; BOOK MISSED (+60-day test).
     - **Proof:** each has its register row (§8); the path-scan check at the closing gates.

256. **The first reward feature owes `NON_HOUSE_POSITION_SQL`.** FS-05's `NON_HOUSE_POSITION_SQL` export and its prize-run audit
     line are NOT built in Commit 5, because no prize, tournament or streak writer exists (`PROMOTION` is a BonusSource with no
     writer, `store.ts:261`). Every automated reward site today is closed to house stakes: the recruiter first-bet prize
     (`affiliate-service.ts:1112-1118`, called at `market-service.ts:1820`), agent/referral commission
     (`affiliate-service.ts:1203-1217`, calls `:3980` → `:4109`), wagering accrual (`market-service.ts:1635`) and reversal
     (`:2775`, `:4076`, `:4538`), pinned by seam `:443` and 6.g2 (`:449-450`). The remaining automated "reward" paths key on
     deposits, registration or proposals, not stakes: AUTO deposit cashback (`wallet-service.ts:505-519`; `cashbackMode`
     defaults to REQUEST and `cashbackEnabled` to false, `bonus-config.ts:91-93`), `onRecruitDeposit`
     (`affiliate-service.ts:1502`), invite `bindRegistration` (`invite-service.ts:366`), the proposal prize
     (`proposals-service.ts:627`, `:637`). The first feature that pays a rank, volume, streak or loss reward must export and use a
     `NON_HOUSE_POSITION_SQL` fragment, write `excludedHousePositions` in its run audit, and show an admin "excluded house
     positions: N" line. The do-not-restore lines (`HOUSE-BOTS.md:826`, `COMPLIANCE-DECISIONS.md:249`) already say so, and 233's
     walker goes red on such a feature until it complies. PROGRESS L37.
     - **Source:** R3 MISSED (FS-05); R3 NEW-reward-walker AMENDED; R3 alreadyBuilt and buildNotes (the reward sites).
     - **Proof:** the walker (233).

257. **Known gaps recorded, not repaired.** Each goes into PROGRESS with where it lands (§8).
     - **Ring readers house volume degrades (L28).** The ring holds 10,000 rows across all categories (`audit.ts:63`,
       `:479-484`), so about 1,000 house BET rows a day shorten the history shown by `admin/resolver/[id]/page.tsx:61` (the
       ceremony's resolution audit), `admin/compliance/page.tsx:68-75` (AML approvals, integrity alerts, RG counters),
       `admin/approvals/page.tsx:90`, `admin/config/page.tsx:48`, `admin/reports/page.tsx:207` (the generation log) and
       `kyc-risk.ts:336` (R8's named risk for the KYC owner). Not edited in Commit 5; also listed in `docs/HOUSE-BOTS.md` risks.
     - **The pack actions' audit race** (214): not claimed fixed.
     - **False format labels on the report library (L29):** TEMPLATES advertise "JSON (signed)", "FIU-format encrypted bundle",
       "CSV" and "GBT cross-operator CSV", but `/api/admin/reports` makes only xlsx and pdf; a main-branch fix. The new house
       card lists only Excel and PDF.
     - **A dead RG counter (L30):** `admin/compliance/page.tsx:73` counts `rg.reality_check.continued`, which nothing under
       `src/` writes, so it always reads 0; `RG_AUDIT_ACTIONS` deliberately excludes it.
     - **A human reward decision (L46):** a REQUEST-mode cashback, or an officer bonus or adjustment decided by looking at a
       holder's losses, which include house losses (`admin/bonuses/bonus-actions.ts:41`; `admin/players/[id]/actions.ts:341`,
       `:349`). No code pin can see a human decision; the KYC card's "of which house stakes" line (197) and the S7 chip (241)
       are the officer's visible cue.
     - **A holder given a staff role (X13):** ROLE_CHANGED pauses the bot and is not a removal (`consent.ts:106`;
       `pause-reasons.ts:132`; `admin/staff/actions.ts:43`), so the paused holder's marked OPEN positions stay. As MODERATOR,
       COMPLIANCE or ADMIN (or FINANCE/AUDITOR with accounting view) the same person would read R2 lines, the row tag, the
       house-liquidity report, the CSV house filter and `house_bot_id` about their OWN account, and receive the emergency-void
       notice's house share (`market-service.ts:4519`). Default: accepted (they are staff; role assignment is the owner's act).
       Proposal: treat promotion of a designated account as its removal.
     - **W20:** the repository is public, so this file and every doc describing house bots are readable by anyone; only Ali can
       change it; repeated in the handover.
     - Also recorded under their rulings: the staff-edge month with no day-01 run (223, L45); the box without its event (239,
       L32); the export crowd-out (242, L31).
     - **Source:** REP MISSED (ring readers, labels, dead counter); REP buildNotes (the race); R3 buildNote (human reward
       decision); EXP and REP d19Leaks (a holder given a staff role); BOOK d19Leaks and D19 buildNotes (W20).
     - **Proof:** the register rows exist in PROGRESS in the same commit.

258. **The docs pass, in the same commit as the code.**
     - **`docs/HOUSE-BOTS.md`:** `:3` ("commit 3 of 8"); `:163` (the event-kind list governs the officer-only internal record;
       the releasable exports carry no house data; W2 pending); `:217` ("digest house split moved to commit 4" and "⏳ Commit 5:
       (i) the holder chip and (o) the activity-feed chip" rewritten as superseded by D19c, rulings 143–158; the digest keeps only
       F6's email rule); `:223` (the `house_*` reasons are server-only, ruling 148); `:258` (the Oversight bullet gains the
       `staffEdge` duty; "staff-edge alert lands in commit 5" rewritten); `:259` (drop "and each holder's when their stakes passed
       their notice cap (0 = summary only)"); `:621-627` §8 "⏳ Written in commit 5" replaced with the classes A–D, the basis rule
       and the fee-withheld source (`:625` corrected); `:642` (drop "the holder's hourly summary is the one account of those
       stakes, and it is a bell"); `:698` (the key row reads `summary:admins:<botId or all>`); `:766` (§12 row 5); the risks
       section gains the ring readers (257).
     - **`docs/DATA-RETENTION.md`:** every stale ⏳ build-commit marker removed (`:28`, `:31`, `:32`, `:33`, `:100`, `:102`;
       commits 3 and 4 are closed and `retention.ts` already imports the AlertOnce purge constants); `:31`'s "never in the holder's
       export" becomes "never in any releasable export".
     - **`docs/COMPLIANCE-DECISIONS.md`:** `:268` (W2) rewritten to PROGRESS W2's re-opened default (no releasable export
       carries house wording; excluded days and the countered count live only in the owner-only internal record; waits on Ali and
       a lawyer). `:215`'s paraphrase of D5 is FLAGGED to Ali through W24, not edited.
     - **Source code comments and small code:** `constants.ts:291-299` (the docstring; the list unchanged); `constants.ts:692`
       `summary(audience: "admins" | "holder", …)` narrowed to `"admins"` (ruling 149), with the house-bot-rules pin moved in the
       same commit; `designation.ts:533` and `:591` ("the holder's own Stop (F10)" → "withdrawal of consent (the holder-facing
       action is struck by D19c; any caller is an officer action, Commit 7)"); `comms-registry.ts:396-399` (235);
       `user-service.ts:25-34`, `:68-69` (169); `book.ts:46-56` and its "reads the MARKERS only" header (183); `oversight.ts:4-9`
       and `planner.ts:7-11` (218); `alert-copy.ts`'s "NEVER A NAME" header (220); `scripts/lib/house-bot-comms-cases.mts:330`
       (220); `scripts/lib/house-bot-two-stores.mts:3-4` (176).
     - **`PLAN.md:829`** §18 fee row (183).
     - **Marked superseded IN PLACE** (PROGRESS:38 says "mark each", and the five plan documents carry 0 D19 mentions today):
       `PLAN.md:134-141`, `:479`, `:501`, `:520` ("for non-holders"); `02-sealed-flows.md:431-435`;
       `03-design-spec.md:322-340`, `:452`, `:60`/`:317` (S7's tone home) and §7 phase E step 2; `01-scenario-register.md`
       HB-ACC-12/14/32/40, CRA-04/10/27, FS-25/30, and HB-LC-24's test placement; `04-amendments.md` `:1220`, `:1224-1227`,
       `:1230-1236`, `:1329`, `:2102`, and R8's named reader for the pack; `C5-SPEC-EXTRACT.md` (the lines in §1 S2–S14);
       `C4-SPEC.md:21`, `:88`, `:203`, `:227` and `C4-EMITTERS-EXTRACT.md` §9/E13 (the digest split).
     - **`PROGRESS.md`:** `:131` rewritten (S1); `:419` and `:425` (the holder chip) corrected; L19 gains: its twin on
       the officer deliverable is fixed in Commit 5 (L42, ruling 169); the REL rows `:491`/`:517` with
       `04:592`/`:1542` (172); X5 and X8 (172); the W2 addenda, W21–W24, X9–X14 and L26–L49 (§8); the mutation record (217); the
       Scenario coverage gate's Exceptions row (250); the Commit 5 record and RESUME AT.
     - Tailwind scans comments and strings in `src`: no class-shaped token in any new copy or comment.
     - **Source:** D19 draft 185 STANDS; DSAR NEW-docs AMENDED; BOOK MISSED and buildNotes (docs leftovers,
       `constants.ts:692`); R3 buildNote (docs pass); EXP MISSED (`HOUSE-BOTS.md:217`); REP d19Leaks (the docstring).
     - **Proof:** `test:guards-exist`, `test:house-bot-rules` (the summary pin), `test:docs` where it pins an entry; a grep for
       "⏳ Written in commit 5", "holder chip" and "lands in commit 5" in the docs returns only superseded markings.

## 7. Guards that will move, and how to move each honestly

Anchors as of `d15eeb70`. Run each named suite right after touching its file. Read a ratchet's printed population before
moving any pin; never raise a ratchet; never allowlist a D19 guard's hit. One row per guard.

| # | Guard | Anchor | How it moves (rulings) |
|---|---|---|---|
| 1 | `test:house-bot-engine` | 10.7 / 10.8 / 10.10 at `house-bot-engine-cases.mts:450`, `:451`, `:462`; §17 marks literal `:2159`, 17.10 prefix `:2195-2197`, 17.61 `:2492-2508`, oversight fixtures `:2514-2518`, 17.63 `:2521-2530`; lease-name literals `:2641-2643`; §19 `:3568-3582` | 10.7 inverted: 200 with no house key, word or lease name, measured after the planner lease with the raw-snapshot control; 10.10 keeps the renamed-table 503; 10.8 moves to the admin reader (171, 172). `staffEdge` appended after the 17.10 prefix, an undefined mark read as not run (218). Oversight's requester loop swapped for `requesterOf`, its population kept, §17 on both stores plus a mutation; 17.63 re-run after the helpers move (178, 186). The lease-name literals move only if 171 chooses the rename. 19.8b added (245). |
| 2 | Health-route string suites: `test:health-readiness`, `test:alerting`, `test:payout-observability`, `test:product-line` (the health route's `listMarkets` ALL), `test:multi-container`, `test:admin-2fa-honesty` | C4-SPEC §7 items 6 and 8 | Re-run after 171. A pinned string moves only if it named the removed `houseBots` block, with ruling 171 named. |
| 3 | `test:dsar-secrets` | §5 `dsar-export-secrets.test.mts:121-130`; header `:27`; imports `:33-34` | §5 not moved (it compares only `user` key sets). §6–§9 added; memory-only; each new assertion's mutation recorded (242, 243). |
| 4 | `test:house-bot-money` | 1.14 `house-bot-money-cases.mts:108-115`; broader word lists `:74`, `:414`; §7 A24 EXPLAIN `:616-629` | 1.14 tightened to 23 keys; 1.14b/c/d and the four money-read cases added (169, 170, 173). The broader word lists import and extend the shared words (175). §7 gains `entryRows` (all, one) and `feeInputs` (lifetime); a plan scanning `Position` is fixed in the query or index, never dropped (180, 183). |
| 5 | `test:house-bot-rules` | §0 module law `:303-360` (VALUE_IMPORT_ALLOWED `:314-326`, CLASS_SHAPED `:311`); citation check `:305-344`; 11.8 `:1471-1477`; `DSAR_HOLDER_EVENT_KINDS` pin `:1527-1531`; 11.22 `:1536-1540`; the ALERT_KEY pins | `staff-edge.ts`, `exposure-copy.ts` and `stake-snapshot.ts` stay inside the allowlist, which does not grow (178, 192, 219). 11.8: only existing keys, no quoted non-key even in a comment (207, 236). 11.22 stays 30 (no event kind). The event-kind list is unchanged (docstring only, 238). `staffEdge` keeps unit `previousMonth`. The `summary` audience pin moves with `constants.ts:692` (258). New: `eatMonthWindow` pins (182) and the `failExposureReadForCases` pin (190). |
| 6 | `test:house-bot-disclosure` and `verify:house-bot-bundle` | disclosure 1.1/1.2/1.3 `:116-138`, words `:39-41`, `:84`, `'use server'` skip `:86-87`; bundle scan `verify-house-bot-bundle.mjs:46-87` | Never allowlist a hit. Both import `scripts/lib/house-bot-vocabulary.mjs`, each keeping a planted control per word family; the bundle scan also matches file paths; added words only after the `origin/main` measurement (175). A client surface that trips them gets server-built strings, slots and neutral names (174). The bundle scan runs on a FRESH `next build` at every client-file step and at the close (NOT MEASURED otherwise). |
| 7 | `qa:house-bot-holder-view` | `house-bot-holder-view-shots.mts:39-40` (words), `:73` (engine off), `:173-184`, `:235-246` (4.1, `fullPage`) | Extended pages and viewers; 4.2 added; the production-posture pass; tiles replace `fullPage`; 2.c and 3.1 controls kept; a non-vacuity control per new viewer (248). |
| 8 | `test:control-gates` and `test:orphan-actions` | `package.json:105`, `:470`; control-gates §4 `control-gates.test.mts:182-200` (resolver queue) | `exportInternalRecordAction` gets its live caller and whatever gate and audit shape the suites require, read from their printed population first (236). The queue card's house line is plain markup, never a second gated control (194). |
| 9 | `test:house-bot-seam` | §4 BRANCH `house-bot-seam.test.mts:237-244`, markers equal `SEAM_SITES` `:269-270`, 4.2b `:273-274`, 6.h1b `:430-433`, notice-body words `:428`/`:432`; `scripts/anchors/house-bot-seam.anchors.mjs:17-25`; §4.3 (only `fire.ts` imports `placeHouseBet`) | `// SEAM:emergencyHouseShare` added with its `SEAM_SITES` entry (the site count moves by exactly one, for ruling 195's stated reason); 6.h1b untouched; the (m) case labelled HB-ACC-13 (249); the notice-body word list imports the shared words (175). No reporting module imports the seam. |
| 10 | `test:feedback-law` (`sell-button.tsx:117`), `test:chip-contract`, `test:i18n` | C5-SPEC-EXTRACT guards 7 and 9 | NOT touched: no player surface or key changes. A red here is a D19 defect, not a pin to move (253). |
| 11 | `test:guards-exist` | `package.json` scripts; `updown-digest.ts:209` phantom citation | `test:house-bot-reports` added before its first citation (176); the `ops:updown-digest-preview` comment kept (235). |
| 12 | `test:read-tiers` and `red:read-tiers` (if present) | 8.9–8.11 `read-tiers.test.mts:567`, `:609-625`; 8.19 ~`:540-560`; 8.20/8.21 `:699-708`; 6.10; 7.1 inherited red; anchors `read-tiers.anchors.mjs:267-275`, `:285-302`, `:303-312`, `:328-345` | Not moved. `house_bot_id` appended after `description` without touching the msisdn lines, `mayReveal` or `pii.revealed` (210). The builders live outside `catalogue.ts`, so `:264`/`:364` stay byte-identical (201); the FIU Context column neither copies nor moves the masked-phone block (228). `exportPlayerDataAction` and `player.data_exported` untouched (236). |
| 13 | `test:product-line` | `product-line.test.mts:66-68` (`catalogue.ts` minCalls 1, `:960`) | `house-liquidity.ts` reads markets by id or marker join; any new `listMarkets` passes `productLine` explicitly or joins MUST_OPT_IN with a why; no entry removed (201, 228, 229). |
| 14 | `test:house-bot-info-edge` §3 | `house-bot-info-edge-cases.mts:45-69`, `:108-116` | Never an exemption; market-reading and resolution-path code lives under `src/lib/server/reports/` (184). Re-run after `book.ts`, `oversight.ts`, `exposure.ts`, `dsar.ts` change. |
| 15 | `test:dal-parity` | `dal-parity.test.mts:45-52` (source read), §6 `:393-404`, §12 no Wallet `:625-631` | Every new member in both twins with a parity case, declared at two-space indent and implemented as `async name(` (177). No `Wallet` in new SQL or `book.ts`. |
| 16 | `test:txn-search` | `txn-search.test.mts:13-16`, `:122` ("take is clamped") | House only/exclude cases added to `matchesFilters`; the clamp assertion is not relaxed (210, 211). |
| 17 | `test:decomment` | `CARRIER_CEILING = 20`, `decomment.test.mts:204` | Every new pin imports `scripts/lib/decomment.mts`; no new stripper (176). |
| 18 | `test:red-anchors` | `UNDECLARED_CEILING = 65`, `red-anchors.test.mts:239` (the inherited 66-vs-65 red is main's); anchors quoting `market-service.ts`, `objections-service.ts`, `bulk-resolve-action.ts` (`house-bot-money.anchors.mjs:144-145`, `:295-296`; `bulk-resolve.anchors.mjs:210-214`, `:236-244`, `:246-265`, `:267-272`, `:275-290`, `:300-304`; officer-hold; kyc-gate); `read-tiers.anchors.mjs:303-312`; `erasure.anchors.mjs` | Every quoted block still resolves exactly once: run right after the R9 writers land (187–189); the 7 marker spreads are never reformatted (232); the three new erasure anchors use unique `from` strings (244); the ceiling stays exact. |
| 19 | `scripts/report-renderers-smoke.mjs`, `scripts/reports-verify-live.mts` | `report-renderers-smoke.mjs:31-40`; `reports-verify-live.mts:37-42`, `:59` | Both ids added (the statement with a seeded market id); verify-live passes declared defaults or skips a required-parameter entry and says so; "build threw" never counts as a pass (199). |
| 20 | `test:report-parity` and `test:predictor-count` | report-parity §2 `:86-93`, §4 `:204-211`, §5 `:256-261`; predictor-count (behavioural; `catalogue.ts:969`) | §2 compares object-valued keys by canonical JSON with a nested-difference control (225). §4: house reads use `listInRange` or SQL, never `listAll` (224). §5: the leaderboard page's call untouched (234). Predictor counts unchanged; the match-integrity note changes no count (229). |
| 21 | `test:type-scale` and `design-gate/eyebrow-roles` | type-scale ratchet (inherited 909 vs 908), `type-scale.test.mts:120`; eyebrow-roles `:133-134` (kyc), `:141-142` (`markets/[id]`), `:148-150` (objection decision), `:179-183` (queue), `:211` (rounds) | Kit tokens only (`text-body-sm`, `AdminKpi`, `Chip` sizes), sentence case, no arbitrary text sizes; the quoted source lines are not edited; the ratchet never rises (192, 209, 251). |
| 22 | `test:house-bot-migrations` c20 | `house-bot-dal-cases.mts:88-95`, `:249-250`, `:925-949` | Not moved: no key added to `HouseDayBook` or `foldDayBook` (180, 226). |
| 23 | `test:house-bot-comms` | §9.2 `:299-303`, §9.4 and the `:330` comment `:330-333` | The STAFF_EDGE row passes 9.2 with detail `{}`; a 9.x copy case, the name-resolution case and the delivery case are added; the comment is replaced (220, 221). |
| 24 | `qa:house-bot-bells` | `package.json:464`; `scripts/house-bot-bell-shots.mts:128`; 1.1 (exactly 11 written), 1.2 (at least 11 landed) | A STAFF_EDGE row added; 1.1 → exactly 12 and 1.2 → at least 12, measured; the panel stays NOT MEASURED (222). |
| 25 | `test:cert-c1`, `qa:cert-c1`, `test:cert-c3` | the `marketCancelledAdminHtml` registry row; comms-email-shots | No new `notify*` export or `*Html`, so no pin moves; the renders gain the STAFF_EDGE email and the void email with and without its house row (195, 222). |
| 26 | `test:two-admin` | `two-admin-policy.test.mts:146-149` (`payload.resolutionAuth`) | Unedited; `houseStake` appended as the last key; the memory `stakeRows` works without the house schema (187). |
| 27 | `test:officer-conflict` | `officer-conflict.test.mts` (behavioural) | Unedited; the TGT-38 pin is the added control (191). |
| 28 | `test:bulk-resolve` and `red:bulk-resolve` | `bulk-resolve.test.mts:410` (10.1), `:432-433` (10.9), `:435` (10.10), `:461` (10.17), `:469` (10.17b), `:477-487` (10.20/10.21), `:488` (10.22), `:491` (10.23), `:499` (10.19), `:517` (11.8) | No new export, no new `catch (err)`; the `resolveMarket` call line byte-identical; `houseStakes` declared before `  try {`; `formatTzs(total)` kept; run both right after (189). |
| 29 | `test:popup-fit` | `popup-fit.test.mts:113` (CLIP_DEBT for `emergency-void-control.tsx`, may only shrink) | No truncate or line-clamp in the house slots; no new CLIP_DEBT entry (192). |
| 30 | `test:unsaved-changes` | `unsaved-changes.test.mts:130`, `:137`, `:145`, `:150`, `:153` | Display text adds no field, so the EXEMPT reasons stay true; entries not edited (192, 194). |
| 31 | `test:overdue-format` | `overdue-format.test.mts:23` (imports `humanDuration` from the queue page) | `humanDuration` stays exported where it is; the page's import graph stays side-effect-safe (194). |
| 32 | `test:labels` | ADMIN_PROSE_RATCHET `label-lexicon.test.mts:1067-1080`; VIA_LEXICON `:188`; §3 trilingual scanner `:355-398`; §7a | Side words only through `sideWordIn` inside `exposure-copy.ts`; no `${side}`/`${status}`/`${outcome}` template in admin tsx or notice bodies; the ratchet does not rise; new admin emitters follow rulings 166–167 (192, 195, 220). |
| 33 | `test:kyc-copy-truth` | header `kyc-copy-truth.test.mts:38-50` | Nothing to move (the card is not in its population; `notifyAdminMarketCancelled` is a `notifyAdmin*` emitter); run once after the KYC edit (197). |
| 34 | `test:erasure` and `red:erasure` | 8.0b `MUST_HAVE_CONTENT` and 8.0c `erasure.test.mts:542-554`; §11 `:603`; `scripts/anchors/erasure.anchors.mjs:34-182`; `scripts/erasure-red.mjs:48-80` | Six buckets listed in `MUST_HAVE_CONTENT` in the same edit; 8.0c kept; §2b inserted, §11 not renumbered; three declared mutations with unique `from` strings, each seen red (244). |
| 35 | `test:house-bot-designation` | §8 `house-bot-designation-cases.mts:754-791`; 9.1; 10.3 (owner pin); §10 password-hash writers | §8 unchanged and cited (244); a case pinning "Running" moves with ruling 186 named; 10.3 is what Commit 7's `requireHouseOwner` replaces (213). |
| 36 | `test:orphans` | inherited red population; `user-service.ts:25` (`UserDataExport`) | `dsar.ts` gets its live caller; `UserDataExport` deleted or typed from the function; the population re-read, never raised (169, 236). |
| 37 | `test:leaderboard-order` | `leaderboard-order.test.mts:129`, `:154`, `:160-166`, `:238`, `:250`, `:254`, `:261` | `excludeHouse` optional, default false; these cases pass no option and their outputs do not change (233). |
| 38 | `test:house-page` | §3 `house-page.test.mts:100-117`, §4 `:120-134`, §5 `:140-152` (and the §5.1 read list), §12.3 `:291-296` | The marker card after the refusal, no `?? 0`, the `amount` class, no arithmetic with a ledger figure; §5.1's read list gains `moneyForWindow(` and `houseOpenExposure(` (231). |
| 39 | `test:insights` | `insights.test.mts:103-137` | Unchanged (no marked rows in its fixture); the marked case lives in reports (224). |
| 40 | `test:updown-digest` and `red:updown-digest` | §7 inherited red; `updown-digest.test.mts:143`; `scripts/updown-digest-red.mjs:54`, `:60` | `ownRounds` additive; §7 must be the same assertion as on clean `origin/main`; `updown-digest.ts:242` and `:141` byte-identical; both re-run after the email edit (235). |
| 41 | `test:lock-tx-threading` | literal windows in `wallet-service.ts` (C4-SPEC §7 item 7) | Re-run after 173's two probe edits; nothing moves into or out of a lock. |
| 42 | `test:pii-in-logs` | predeploy | The new `console.error` lines (190) name the market and the action only; no unmasked email or phone. |
| 43 | `test:docs` | the COMPLIANCE-DECISIONS entries it pins | Re-run after the W2 row rewrite (258). |
| 44 | `test:house-bot-holder-lifecycle`, `test:house-bot-caps` | — | No planned change; re-run on both stores at the closing gates (252, L18). |

## 8. Register rows to add to PROGRESS (in the same commit that finds them)

### 8.1 ⏳ Waiting on Ali

| # | Question | Default being built |
|---|---|---|
| **W21** | **House-liquidity lines on routine statutory filings.** The GBT monthly pack's "House liquidity (memo)" section renders only for a month holding marked money, so no earlier than Ali's own switch-on (D1); the FIU SAR's "Context" column renders from designation windows, which can exist BEFORE switch-on. Both reach a regulator on routine filings, possibly before Ali decides to send the private Board draft (D19b). The FIU is part of this question. (Rulings 227, 228.) | **Build as ruled.** Alternative: render both only after Ali records that the Board draft was sent — which would revive a sent-record writer for the private draft, because D19 struck P1's disclosure tracking (PROGRESS.md:38) and `boardDisclosureSentAt` has no writer today. |
| **W22** | **Who the match-integrity report is for.** Its declared audience is "Sportradar + GBT integrity unit" (`reports/page.tsx:138`); Sportradar is a private vendor (a stub with no channel in code today), and D19b keeps regulator paper. (Ruling 229.) | **Build as sealed:** the Resolution path column for every voided market; the house parts (House stake column, voided-house-markets section, House-marked refund flag, "Predictors include house accounts (D6)") only when a voided market holds a marked position. Alternative: omit the house parts while Sportradar is a declared recipient; R1 and the house-market statement carry the same facts to the regulator alone. |
| **W23** | **The comment side chip (m) and H8 after D19c.** Worked example: the holder sees a house stake as his own YES bet on `/positions`, but his own comment on that market carries no "Holds YES" chip, while a player with the same position gets one. H8 (no inbox receipt for a house stake, `market-service.ts:1716-1720`) is the same class: a visible difference from "exactly like the holder's own bets". (Ruling 249.) | **(a) Keep (m)** — no side is shown under his name for a stake he did not choose. Alternative (b): remove (m), so the chip follows every open position (the stricter reading of D19c and D6; the account already shows publicly in trader avatars and on the leaderboard). |
| **W24** | **The D5 consent wording contradicts itself across the record of decisions.** `PLAN.md:24` and `COMPLIANCE-DECISIONS.md:158`/`:201` say "the owner types the account's password"; the D19 restatement (`PROGRESS.md:40`; `COMPLIANCE-DECISIONS.md:215`, `:291`) says "the holder types their own password". The system stores only `verifiedAt` and `verifiedById`. (Rulings 202, 237.) | R1 prints only what the row stores: "account password verified in the 50pick console by <officer> at <time>". The internal record keeps R5's sealed "password entered by 50pick". When Ali rules, both strings follow in one commit; `:215` records his ruling and is not silently edited. |
| **W2 · addendum 1** | **The export crowd-out hits both doors.** At 200 house bets a day, the player's self-serve export (newest 1,000 transactions, 1,000 audit rows) loses a holder's own deposits within days, and the officer bundle (10,000 transactions) within about a month; D19 forbids saying why, and the internal record does not restore them. (Ruling 242; L31.) | Nothing new built. **Neutral remedy offered** (needs no house wording, changes every player's export): the officer deliverable reads every transaction (paged) and states total and truncated; the player door's transactions carry total and truncated as its audit entries already do — or a cursor-paged or uncapped transactions export. Not built without Ali's yes. `test:dsar-secrets` §6 asserts today's degradation as a named gap. |
| **W2 · addendum 2** | **The rights sentence.** The bundle says "access: Granted (this document)." while the owner-only internal record is withheld. (Ruling 242.) | The sentence stays exactly as it is (any "except…" would be house wording in the subject's file). Part of what Ali and a lawyer confirm under W2. |
| **X5 (edit)** | The late-reaction count's home. | Under D19 it leaves `/api/health`: it lives on the admin-gated `/admin/system` server reader and Commit 7's strip (ruling 172). |
| **X8 (note)** | Ali's X8 answer said "The drop count stays on `/api/health` (X5)". | **Reversed by D19** (ruling 172): the count is on the admin reader only. Ali is told in the handover. |

### 8.2 💡 Proposed extra controls

| # | Proposal (found in) | Why it helps Ali | Default being built |
|---|---|---|---|
| **X9** | **Free-text qualifier and refusal** on the four surfaces where a house line sits beside text that reaches a player: the emergency-void confirm (the reason reaches every refunded player's bell and email, every objector, and the public settlement proof), the objection decision dialog (the note reaches the objector), the ceremony (the evidence reaches the public resolution panel), and the KYC case card (the "Note to the player" reaches the holder). (Ruling 196.) | An officer could copy the house fact into a field a player reads, holder included. | **(a) built:** the house line carries "staff only — never sent to players". **(b) not built:** the four server paths refuse text containing the house vocabulary with an admin-only field error. Until Ali answers, phase D reads each dialog for the hazard. |
| **X10** | **SUPPORT visibility** of the S7 chip "House bot · <status>", its failed-read form, the transactions-tab row tag, and the internal-record export audit row on a player's admin audit panel; and **COMPLIANCE visibility** of the compliance harm-table holder chip "House bot holder since <date> · <status>". (Rulings 230, 236, 241.) | SUPPORT staff speak to holders and players by phone, and COMPLIANCE is the role the privacy card tells to reply to data subjects (the same human channel as X12); these are a human channel to a holder or a trigger player. | As sealed / as ruled: shown to every staff role that can open the page (the internal-record CONTROL is already ADMIN-only). |
| **X11** | **R9 snapshot on two more decisions:** `market.autoresolved` (the AI seal, no officer) and `updown.round.void_operator` (the officer's round void, where R2 shows the house line on the lever but nothing records what the officer saw). (Ruling 187.) | R1's per-market record would show the house stake at every money decision; HB-LC-17 lists "voids an Up & Down round" among them. | Not built. R1 section 4 says these two record no house-stake snapshot. |
| **X12** | **An officer-only line on the `/admin/privacy` erasure overlay:** "Don't tell the player why — the request stays open until an owner acts". (Ruling 244.) | The refusal names "house bot hb_…" to the compliance officer, whom the card tells to reply to the subject; nothing stops the reason being relayed word for word. | No change (the sealed admin copy, pinned by designation 8.1). |
| **X13** | **A holder given a staff role.** ROLE_CHANGED pauses the bot but is not a removal; the person would then read R2 lines, the row tag, the house-liquidity report, the CSV house filter and `house_bot_id` about their own account, and receive the emergency-void notice's house share. (Ruling 257.) | Keeps D19c whole for a holder who joins the staff. | Accepted (they are staff; role assignment is the owner's act). Proposal: treat promotion of a designated account as its removal. |
| **X14** | **Personal positions in the releasable exports** (CRA-04 asks; R5 adds none). (Ruling 246.) | A more complete access answer. | Not built. If yes: house positions appear exactly as own positions, unmarked, through an allowlist. |

### 8.3 🧷 Later — sealing to-do

| # | What is not sealed yet (found in) | Why it matters | Where it lands |
|---|---|---|---|
| **L26** | 🔴 **LIVE on main: the transactions CSV returns at most 500 rows while claiming a 50,000 ceiling, and the file itself never says so** (both stores clamp `take` to 500; ruling 211). | A regulator-facing money CSV has been silently incomplete since it shipped; an `<a href>` download never shows `X-Export-Truncated`. | A `main`-branch fix (Ali's call; told in the handover). **Commit 8 release precondition:** the export returns its documented ceiling. Until then a complete per-bet month is the per-bot CSVs plus R1. |
| **L27** | 🔴 **LIVE on main: the transactions CSV has no TOTP step-up** (a direct GET skips the admin layout's gate; the proxy does not cover `/api/admin`; ruling 212). | The file carries money and PII. | A `main`-branch fix (told in the handover). **Commit 8 release precondition:** `checkAdminTotp` before `house_bot_id` reaches production; else the release adds it with a plain-text 403 "Two-factor verification required — verify, then export again". |
| **L28** | **Ring readers degraded by house volume:** `admin/resolver/[id]/page.tsx:61`, `admin/compliance/page.tsx:68-75`, `admin/approvals/page.tsx:90`, `admin/config/page.tsx:48`, `admin/reports/page.tsx:207`, `kyc-risk.ts:336` (ruling 257). | The 10,000-row ring spans every category; about 1,000 house BET rows a day shorten each history these pages show. | Platform / KYC owner; not Commit 5. Listed in `docs/HOUSE-BOTS.md` risks. |
| **L29** | **False format labels on the report library** ("JSON (signed)", "FIU-format encrypted bundle", "CSV", "GBT cross-operator CSV"; the route makes only xlsx and pdf) (ruling 257). | A button promising a format it cannot produce. | A `main`-branch fix. |
| **L30** | **A dead RG counter:** `admin/compliance/page.tsx:73` counts `rg.reality_check.continued`, which nothing writes (ruling 214). | The counter always reads 0. | A `main`-branch fix. `RG_AUDIT_ACTIONS` excludes it on purpose. |
| **L31** | **The player export caps transactions at 1,000 without saying so**, and both doors crowd out a holder's own deposits (ruling 242). | A data-subject answer that silently loses the subject's own money rows. | Waits on Ali (W2 addendum 1). Not built without his yes. |
| **L32** | **A penalty box whose event write failed (C4 ruling 117) is not listed in the internal record** (ruling 239). | The AlertOnce row that is the box purges after 30 days. | Recorded; the record carries a fixed note. No AlertOnce reader by prefix is added. |
| **L33** | **Commit 7's nav label, `/admin/house-bots` href and action names would ship in public chunks** (`admin-nav-groups.ts` is imported by client components; action export names ship; ruling 255). | A D19 disclosure in the first console commit. | Commit 7: neutral action names, a server-injected nav entry, a route segment checked by the path scan. |
| **L34** | **Admin counts that include bots:** the queue card's predictors, the ceremony's "N predictors · M open", the `/admin/markets` predictors cell, the rounds lever's "from N players", the emergency-void toast and notice "refunded to N players", the KYC refused-balance line (ruling 255). | Admin wording that calls bot positions players. | Commit 7's copy decision (D6 keeps bots counted publicly). |
| **L35** | **Two-admin mode: a chooser who attests stage 1 is never flagged as self-decided** (oversight matches only the stage-2 actor; ruling 255). | R1 (e) could miss a market decided by its chooser. | Commit 7 / R1 (e); two-admin mode ships OFF. |
| **L36** | **The console still says "liquidity stakes"** (`pause-reasons.ts:311`; `eligibility.ts:247-248`, `:316`, `:413`; `designation.ts:331`, `:591`) (ruling 197). | The same words for the same things: the KYC card and R2 say "house stakes". | Commit 7's copy pass. |
| **L37** | **FS-05: `NON_HOUSE_POSITION_SQL` and a prize-run "excluded house positions: N" line** are owed by the first reward feature (ruling 256). | No reward writer exists yet; the first one must not pay on house stakes. | The first rank, volume, streak or loss reward feature; the walker (233) goes red until it complies. |
| **L38** | **The +60-day staff-edge href-route test** is Commit 7's (C4 ruling 23); NOT MEASURED in Commit 5 (ruling 222). | Nothing in Commit 5 may cite it as built. | Commit 7. |
| **L39** | **R2's overview exposure split and the CAP_EXPOSURE held amount** (ruling 254). | No overview page renders before Commit 7. | Commit 7, with the amount ruled as the console's render-time "held now" figure. |
| **L40** | **Commit 4 residue: the Up & Down digest house split** was scheduled in C4 step 9 and neither built nor recorded as struck (ruling 235). | A plan line nobody closed. | ✅ Closed in Commit 5: struck by D19c; only F6's email rule is built. |
| **L41** | **`/api/health` published a `houseBots` block and the `house-bot` lease name** (§2 F1–F2; rulings 171–172). | A public D19 leak on the branch. | ✅ Fixed in Commit 5, with the X8 reversal. |
| **L42** | **The officer DSAR deliverable carried `houseBotId`** on every Postgres row and `hb_…` for a holder (§2 F3; ruling 169). | The data subject's own file. | ✅ Fixed in Commit 5 (`dsarTxnView`). |
| **L43** | **The absence vocabulary was defined three times and the bundle scan ignored file paths** (§2 F7; ruling 175). | Drift between guards. | ✅ Fixed in Commit 5 (one module, path scan). |
| **L44** | **The served absence proof was blind** (engine off, holder only, full-page shots; §2 F8; ruling 248). | It could not see F2 or any other viewer. | ✅ Fixed in Commit 5. |
| **L45** | **A month whose first EAT day had no successful staff-edge duty sends no alert** (ruling 223). | An engine or planner outage on day 01 skips the month. | Known gap (C4 ruling 80's precedent); R1's flag is the record. |
| **L46** | **A human reward decision on a holder's losses** (a REQUEST-mode cashback or an officer bonus looking at losses that include house losses; ruling 257). | No code pin can see it. | Recorded; the KYC line and the S7 chip are the officer's cue. |
| **L47** | **Money idempotency probes and deposit reads were flooded by house rows** (a refund could be paid twice; §2 F5; ruling 173). | Money correctness. | ✅ Fixed in Commit 5 (`excludeHouseBets` on four reads). |
| **L48** | **`house_bot.exported` has two writers told apart by `payload.code`** (the internal record `"INTERNAL_RECORD"`; the per-bot CSV, no code; rulings 213, 236). | A console suite assuming every row is owner-only would be wrong. | Commit 7's `test:house-bot-console`. |
| **L49** | **`withdrawHouseConsent` writes the holder as the audit actor** (§2 F4; ruling 170). | The holder-facing Stop is struck by D19c; such a row must never reach a holder's export or feed. | Pinned and excluded in Commit 5; reshaped with the officer as actor in Commit 7. |

### 8.4 Tell Ali in this session's handover

- L26 and L27: two LIVE defects on `main` in the transactions CSV (the 500-row clamp; no TOTP step-up), both Commit 8 release
  preconditions.
- X8 is reversed by D19: the drop count is no longer on `/api/health` (ruling 172).
- COMPLIANCE, FINANCE and AUDITOR can download the house-liquidity report and statement (the platform's report gate, ruling 200).
- The KYC card says "of which house stakes", departing from 04's "50pick liquidity stakes" on his consistency rule (ruling 197).
- W20: the repository is still public, so this spec and the docs describing house bots are readable by anyone.
- W21–W24, the two W2 addenda, and X9–X14 wait on him, each with its default.

