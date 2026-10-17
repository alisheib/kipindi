# MASWALI PLAN — Maswali Millionea, the third product (programme `MASWALI-BUILD`)

> ⭐ **Say "proceed with Maswali plan" in any session, on any machine.** Read §0 RESUME AT below, then do the session
> it names. §1 is the board; §6 is the launch gate; §7 holds every session's full work order.

> **The one tracker for this programme.** Owner: Ali. Re-planned 2026-10-16 for the Product Owner's proposal of that
> date (management-reviewed); every earlier Maswali ruling is void.
> - **Rulings:** [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) § "2026-10-16 · Maswali Millionea — the
>   management-reviewed proposal of 2026-10-16 is final; every 2026-08-29 Maswali ruling is void (owner)".
> - **Money law:** from S1, [`RULES.md`](RULES.md) §2.12 owns every Millionea figure and rate. Until S1 writes it, §3
>   below is the product's statement; S1 replaces the figures here with pointers in the same commit.
> - **Design round R2:** [`design-brief/maswali-2026-10/BRIEF.md`](design-brief/maswali-2026-10/BRIEF.md) — the Claude
>   Design commission, its predicted output and the receiving protocol.
> - **Records (the August proposal — read for engineering practice only):**
>   [`SESSION-PROMPT-MASWALI-BUILD.md`](SESSION-PROMPT-MASWALI-BUILD.md),
>   [`MASWALI-MILLIONEA-IMPLEMENTATION.md`](MASWALI-MILLIONEA-IMPLEMENTATION.md),
>   [`SESSION-PROMPT-MASWALI-DESIGN.md`](SESSION-PROMPT-MASWALI-DESIGN.md) and the R1 handover
>   [`design-brief/maswali-2026-08/handover/`](design-brief/maswali-2026-08/handover/README.md).
>
> **Guard:** `npm run test:maswali-plan` keeps §0, §1 and the board row honest; `npm run red:maswali-plan` proves each
> check can fail.
>
> **Where:** the documentation pass ran in the SSD worktree `C:\50pick-ssd\kipindi-maswali` (OMEGA-COMPILE01) on
> branch `maswali-plan`. Build sessions work on branch `maswali-build` off `origin/main` in their own worktree (§7,
> "Branch and worktree strategy"); on Ali-Blade15 that is `C:\kipindi-maswali`. Merge to `main` = a live deploy.
> **Who merges (Ali, 2026-10-17):** *"any session that finishes, let it push … each session pushes whatever it
> finished, until the final session, who finishes everything, puts it live."* Millionea is merged **dark**: its rollout
> stays `WITHDRAWN` in code until Ali decides (STAFF_PREVIEW after S5, ACTIVE only at S8).

## §0 · RESUME AT

**State (2026-10-17):** The fence is built and merged dark; no Millionea screen, door or sale exists for anyone.
- **Done:** S0 ✅ at `de8a00619`; D1 ✅ at `e224aef46` (the R2 package, stamp `72ca5cff9`); D2 ✅ at `2b335451f`;
  **S0.5 ✅ at `9834aaf0`** (the work `fefc7734` + its test:all fixes `9834aaf0`).
- **S0.5 (the fence) — what it holds.**
  - *The one reading.* `src/lib/product-line.ts` owns it, and every branch on a line goes through it: NULL is MARKET,
    MASWALI is MASWALI, an unknown value raises an alarm and reads as MARKET. The DAL passes MASWALI through on both stores.
  - *Refused for a week:* every generic door (bet, paid exit, resolve, auto-resolve and the sentinel, emergency void,
    reopen, settle except its VOID arm, the settle, hold and re-check actions).
  - *Kept out:* the poll scheduler, the generic settlement queue, `/live`, `/results`, performance, the leaderboard,
    the journey sheet and cards, the share image, the saved deposit bet.
  - *Fail-closed until S6:* `chargedFee`, and the tax report refuses a period that holds a week.
  - *A game of its own:* the money reports and the owner's book carry Millionea as its own line.
  - *House bots:* MASWALI is `"denied"`, and `scopeAlerts` raises no daily false alarm for it.
  - *Proof at `9834aaf0`:* `test:maswali-fence` memory 36/36 and Postgres 29/29; `red:maswali-fence` 17/17 caught, 0
    files dirty; `test:all` red only on the five suites that drive a server (`admin-section-gate`, `motion`,
    `needle-rest`, `responsive`, `revoked-deadend`), which ran against a local server in the render check;
    `e2e:money` 64/0, `e2e:fault` 34/0, `e2e:card` 100/0 on a throwaway Postgres; `tsc` clean; `next build` and local
    `qa:live` in the render check.
  - *What the first `test:all` caught:* a market built before the column (a legacy row, a memory fixture) carries no
    line, and the strict branches threw on it or turned its poll scheduler off. Every branch now reads the line
    through `storedProductLine`. Seven static guards quoted the fence's own lines and were re-anchored, each write
    body checked byte-identical to `main`.
- **The delivery.** Claude Design's delivery is its round 6, with Ali's form answers applied. It is filed raw at
  [`design-system/v6-2026-10-17-millionea/`](design-system/v6-2026-10-17-millionea/INHERIT-MANIFEST.md); its
  `INHERIT-MANIFEST.md` holds the verdicts, Ali's rulings, the L-rows L1–L13 and the intake checks. No gate failed,
  so there is no round 3.
- **The raw inbox** is kept outside the repository, at `C:\50pick-design-archive\MASWALI-DESIGN-R2\inbox-2026-10-17\`
  on Ali-Blade15 (202 files, hash-checked). The delivery's `DECISIONS.md` ("OWNER RULINGS RECEIVED") matches the
  answers table below item for item.

**Ali, 2026-10-17 — the build programme.** *"take your time and start implementing the whole maswali development …
when you face a decision take the decision based on how 50pick operates, based on previous bypasses we made as
management and the perfect final architecture … keep pushing so other machines always know where we reached …
perfect, consistent, work only accepted and fully responsive … at the level of the Vodacom plan and normal 50pick
until we decide what goes live."* He also answered three numbered choices the same day:
1. **Each finished session merges into `main` dark** (rollout `WITHDRAWN`).
2. **Production goes to STAFF_PREVIEW** once S5's screens are verified.
3. **Any session that finishes pushes `main` itself** (the header's quote). The route was approved in plan mode and is
   below.

**Next:** S1 and S2, both written on branch `maswali-s1` (worktree `C:\kipindi-maswali-s1`, Ali-Blade15) and not yet
run; their suites are next, then each lands in its own commit and merges dark.
- **S1 written:** the three migrations (tables, ledger types alone, the tax-lock CHECK); `jackpot-payout` in `payout.ts`
  (an unknown fee model now refused, never coerced); the ledger accounts (`HOUSE:MASWALI_JACKPOT`,
  `HOUSE:MASWALI_GUARANTEE`, `EXTERNAL:OWNER_CAPITAL`) and the seven movement builders; the owner's book subtracting
  the jackpot and the guarantee from free cash; `maswali.config` and the Owner-only `maswali.licenceBasis`; the
  rollout (`millionea-rollout.ts`, the Owner's sealed switch, the per-request
  resolver), `/api/health`'s `millionea` field and `qa:live`'s dark section; RULES §1, §2.4, §2.8, §2.12, §3 and §6.
  Suites: `test:maswali-config`, `-ledger`, `-rollout`, `-law` + `red:maswali-law`, `test:house-solvency` §3b.
- **S2 written:** `maswali-score` (the one grader), `-money`, `-commitment` (salted leaves, an RFC 6962 Merkle root,
  inclusion proofs), `-void-reason`, `-week-label`, `-time` (event clocks across the changes), the EAT week helpers in
  `eat-day.ts`, `maswali-dal` (both stores, the freeze), `maswali-service` (draft, attest, open, move the close, close,
  seal, confirm, correct, the week void, the carry), `maswali-scheduler` (wired into boot and the lifecycle). Suites:
  `test:maswali-score` (the 352 cases), `-money`, `-commitment`, `-time`, `-engine` (both stores) + `red:maswali-engine`.
- **S1's deviations, recorded in §7b's corrections:** see "S1 · as built".

The route:

| Order | Session | What ships | Ali |
|---|---|---|---|
| 1 | S0.5 | No door, screen or report can treat a Millionea week as a Yes/No poll, in either store. One integrator commit | — |
| 2 | S1 | RULES §2.12 ceremony, `maswali.config`, ledger accounts, 3 additive migrations, rollout switch (WITHDRAWN) | — |
| 3 | S2 | Grading with reserves, money arithmetic, salted commitment and Merkle root, week lifecycle, scheduler | — |
| 4 | S3 | Buy, free cancel, settle, rollover, top-up, refunds, guarantee ceremonies, sunset — both stores | — |
| 5 | S4 | `/admin/maswali`, `/pools`, `/integrity`; seal console, release, pause, Owner ceremonies | — |
| 6 | D3 | DA §M8 "Millionea exceptions", glyphs, status rows (filed from the answers below) | already answered |
| 7 | S5 | Every player screen in both shells, three languages, five widths; then STAFF_PREVIEW on production | **looks at it** |
| 8 | S6 | `/fairness`, notices, tax report and statutory pack, data, support, final legal and PDFs | Finance OD-08 (Gate B) |
| 9 | S7 | Adversarial: concurrency, clock changes, the Friday rush, covering clusters | — |
| 10 | S8 | Drive scripts ready; then **stop** for Gate A (§6) | **Gate A** |

**How every session ships.**
- **Work and commits.** Work in the session's own worktree on `maswali-build`. Commits are staged by name, with the
  tracker in the same commit.
- **Checks during the work.**
  - Each change carries its own guard and red twin.
  - Each push runs the suites derived from the diff (grep `scripts/` for every changed path), then `tsc`,
    `next build` and local `qa:live`.
  - A money session also runs `test:all`, `e2e:money`, `e2e:fault` and `e2e:card` on a throwaway PostgreSQL.
- **Merge and read-back.** Merge `origin/main` into `maswali-build`, push `main`, then read back production per AGENTS.md §4.
  `?dpl=` must match on all three hosts, health must pass, `qa:chunks-prod` and production `qa:live` must pass, the changed pages are looked
  at in a real browser, and every Millionea route must 404 while WITHDRAWN.
- **Exception.** A docs-only push skips the build checks. Only the doc guards and the read-back run, under Ali's
  efficiency ruling of 2026-10-10.

**Decisions taken under Ali's delegation (2026-10-17).** They are recorded here and in the v6 manifest's L-rows.
1. **The won chip.** O-6's success chip is a Millionea-only `STATUS_TONE_EXCEPTIONS` row. Yes/No and Up & Down won
   chips stay gilt, which `visual-pass-r5c` and `r7b` pin.
2. **The receipt's legal line.** It prints `resSingleOfficer` and switches to `resTwoOfficer` only when the platform's
   two-officer flag was on at stage 1 (L3).
3. **Rule figures.** Every rule figure in a string is a placeholder filled from `maswali.config` or the week's frozen
   `rulesSnapshot` (L2: admins can change everything).
4. **The home card.** It sits after the head and before the chips (O-7). `test:journey-home` 7.order is re-pinned on
   purpose.
5. **The slip and `MONEY_ROUTE`.** The slip does not join `MONEY_ROUTE`, because `surfaces.ts` is pinned VERBATIM. The Needle and the chat bubble
   stand down through route rules of their own.
6. **Files shared with Vodacom.** The unmerged Vodacom S15/S16 flip branches touch `feature-state.ts`, `i18n-dict.ts`
   and `market-service.ts`. Millionea's edits there are additive and in separate regions: the `millionea` namespace is
   appended at each locale block's end.
7. **⭐ Icons are Phosphor (Ali, 2026-10-17, while the build ran).** *"as u build the maswali another session
   implemented new source for icons and glyphs phosphorus. please dont use the glyphs … use the more creative ones and
   more reasonable and client like ones from the new kit, check what the phosphorus used and mark this in your plan
   perfectly visually."* So Millionea draws **no hand-drawn glyph**: the delivery's `sealNil`, `sealX` and the
   three-pearl coronet (O-5) are replaced, and every Millionea icon is a Phosphor icon reached through the family `I`
   (`PHOSPHOR-MIGRATION.md` R-NEW-PAGES). The picks, by meaning, are in **§10c**, with the specimen Ali can open.
   Motions are unchanged: N1–N3 as approved, on the platform's existing easing primitives (DA §M5).

**The answers to Claude Design's owner-ruling form (2026-10-17).** Each was checked against this plan and the live code
before it went to Ali.

| Item | Answer | Source |
|---|---|---|
| O-1…O-3 · N1 Kubeba, N2 Kugonga Muhuri, N3 Kukata Tiketi | Approve all three | RECEIVING Step 5's recommendation; each is built from existing parts. N1 stands only if it holds 50fps on the target phone (D3) |
| O-4 · a fourth motion | Keep unspent | Its only candidate, the needle aligning the ten sockets, is barred by the prompt (§8) and by DA §M8 |
| O-5 · the `millionea` glyph | Approve the three-pearl coronet | The family `crown` already carries two meanings: the Leaderboard icon (`avatar-menu.tsx`) and the "Matokeo mashuhuri" flag on `/results`. R1's coronet reads as its own shape at 14px |
| O-6 · the IMESHINDA tone | Approve: the word in success green, gold only on the amount | Missing from the form as Ali pasted it, so it was answered in the form's free-text box |
| O-7 · the home-card position | After the head (the How-to card and the headline), before the topic chips | The prompt's and RECEIVING's recommendation. It deviates from the sponsor deck's home, so Vodacom will see it in the preview before the flip (S15 waits for their approval) |
| O-8 · the reserve label | A1–A5 "Akiba" | It is R-RESERVES: "R1–R5, shown as A1–A5". R1–R5 stays the name in code and in the rules |
| Q5 · the closing pill | Both: the close time is always printed; the `.closing-pill` appears only in the last hour, counting minutes, as on Yes/No markets | The platform's C1a rule: `closingSoon` at one hour or less in `src/app/markets/[id]/page.tsx`, worded "Inafunga karibuni · {n} Dak" |
| Q7 · the door on a won ticket before the seal | "Ona matokeo", and the away line's "Fungua" becomes the same | It is the platform's existing door to the seal: `t.notif.awayView` opens it in `away-summary-bar.tsx`. "Muhuri" is art direction, not a dictionary word |
| Q11 · the sunset week's score line | Keep "Alama ya juu wiki hii: 9 kati ya 10 · tiketi 2" | The prompt's own wording for its rule 15 |
| Q2 · the second sample serial | MLN-W42-003310 (the player's 2nd ticket, bought Tue 20 Oct 09:41); MLN-W42-002083 (the 1st, Mon 19 Oct 20:15) if a frame needs it | Both are lower than 004417 because both were bought before it |
| Q3 · the moved close | Ijumaa 23 Okt 16:00 EAT, moved earlier from 18:00, announced Alhamisi 22 Okt 10:15 | A later move could reach only Ijumaa 19:00: the first event is at 19:30 and the buffer is 30 minutes (OD-15, MB-28) |
| Q1 · the attestation times missing from the sample | main 2 Mon 00:12 · main 3 Mon 09:10 · main 5 Mon 10:41 (the last, so results final) · main 6 Sun 20:36 · main 7 Sun 20:41 · main 9 Mon 00:14 · main 10 Sun 21:06 · A2 Mon 00:16 · A5 Mon 10:24. Timelines B and E reuse them. In D the week void becomes certain at Mon 10:24 (A5), so refunds are Tue 27 Oct 12:00 | Each time falls after its event. None falls before Sun 12:00, so the live frame's "5 kati ya 15" still holds. The windows follow MR-16 |

**Blocked on Ali:** nothing until S5's staff preview (to look at it) and S8's Gate A (§6).

**Owed by others:** Finance's written confirmation of the tax-report reconciling lines and of no withholding on
winnings (OD-08, MB-77) — Gate B, before ACTIVE; it does not block the build.

**Last handoff (2026-10-17, Ali-Blade15, S0.5 closed and merged dark).**
- **Two worktrees on Ali-Blade15.** `C:\kipindi-maswali` (`maswali-build`, the release line, `npm ci` done) and
  `C:\kipindi-maswali-s1` (`maswali-s1`, S1 and S2 uncommitted work, its `node_modules` a junction to the first). ⛔ The
  junction shares one Prisma client: run `prisma generate` for S1's schema only when no battery is running on
  `maswali-build`, and remove the junction with `[System.IO.Directory]::Delete(path, $false)` before `git worktree
  remove`, never `npm ci` through it. Heavy jobs go through `~/heavy-node-lock.sh`; another session shares the lock.
- **The money battery's fault suite** refuses a database without the disposable marker: plant it on the fresh
  throwaway database with `scripts/load/ci-plant-marker.mjs` (loopback-only) before `e2e:fault`.
- **Five `test:all` members need a running server** (`admin-section-gate`, `motion`, `needle-rest`, `responsive`,
  `revoked-deadend`): run them with `BASE` against a fresh local `next dev`, as the render check does.
- **The delivery moved out (D2).** Ali placed it inside the shared checkout, at `C:\kipindi-main\Maswali\Design Handover\`.
  It was copied outside and hash-checked, 202 of 202, and then removed from the checkout. A delivery inside a
  checkout turns `test:design-one-door` red and can ride along in another session's commit.
- **Merged.** The D1 zip-format fix (`maswali-a6-zip`, `c4697dfde`) is merged.
- **Guards that passed on the filed delivery:** `test:design-one-door` and `test:docs`.
- **The D1 package record** (the cut, its checks and its three exceptions) is in `git show
  ad62c8f7:docs/MASWALI-PLAN.md` §0.
- **One debt carried to S5.** `qa:seal` part B is stale: it waits for a "Day" field the sign-up form no longer has.
  S5's seal drive repairs it, unless another session already has.

The working tree `F:\kipindi-main` (OMEGA-COMPILE01) and `C:\kipindi-main` (Ali-Blade15) are shared by several sessions:
never build there. The repository is public: describe anti-abuse controls by what they enforce, never by their signals.

## §1 · Board

| Session | Title | Status | Note |
|---|---|---|---|
| S0 | Rulings recorded; plan, board, pointers, guard, R2 commission filed | ✅ | de8a00619 (2026-10-16), merged to `main` the same day on Ali's word |
| D1 | Design R2: the commission cut live and sent | ✅ | e224aef46 (2026-10-17): sent at stamp 72ca5cff9; its owner-ruling form answered the same day (§0) |
| S0.5 | Fence the third product line | ✅ | 9834aaf0 (2026-10-17): the fence on both stores, its red twin 17/17, test:all and the money battery green, merged to `main` dark |
| S1 | Law, config, accounts, schema, rollout switch | 🔨 | written on `maswali-s1` (2026-10-17); its suites, the migrations on a throwaway Postgres and the merge next |
| S2 | Week engine (no money, no UI) | 🔨 | written on `maswali-s1` (2026-10-17) beside S1; its suites next, and it lands after S1 |
| S3 | Money path (local and throwaway PostgreSQL) | ⬜ | |
| D2 | Design R2: received and inherited | ✅ | 2b335451f (2026-10-17): filed raw at `design-system/v6-2026-10-17-millionea/` with its INHERIT-MANIFEST; no gate failed |
| S4 | Admin console and operations | ⬜ | |
| D3 | Ali's N1–N4 rulings, filed in DESIGN_AUTHORITY and motion.css | ⬜ | blocks S5 |
| S5 | Player surfaces | ⬜ | never before D3 ✅ |
| S6 | Fairness, notices, reports, legal, data | ⬜ | |
| S7 | Adversarial hardening | ⬜ | |
| S8 | Live drive and public launch | ⬜ | never before every §6 line is ticked |

**Status values:** ⬜ not started (cites no commit) · 🔨 in progress · ✅ done (cites a commit that exists) · ⛔ blocked
(cites an `OD-nn` from §9 or an `R-` ruling from §2).

**Ordering law** (asserted by the guard): S0.5 before any session that writes a MASWALI row · D1 after S0 ✅ · S5 never
🔨/✅ before D3 ✅ · S8 never 🔨/✅ while §6 holds an unticked ☐.

**The standing rule.** Every session that changes anything rewrites §0 (State, Next, Blocked on Ali, Last handoff),
ticks its §1 row, writes its commit into the *Closes* cells it closes in §8, and updates the ▶ 0i heading count in
[`NEXT-PLAN.md`](NEXT-PLAN.md) — all in the SAME commit as the work. A handoff lives only in §0, never in a new file. A
session that ends red still rewrites §0 and records what ran, what passed, what failed and what did not run.

## §2 · The rulings in force (2026-10-16)

Ali, 2026-10-16: *"disregard any august ruling the new plan is final ruling"* · *"the new pdf is reviewed by management
and updated lately so any old rules replace them by those from the new pdf"*. Where the PDF speaks it wins; where it is
silent these rulings apply. Every 2026-08-29 Maswali ruling (D-1…D-7, D-10, G-15, Nav, Receipt) is void. The verbatim
record is the COMPLIANCE-DECISIONS entry named at the top of this file.

| Key | Ruling |
|---|---|
| R-RESERVES | The player answers all 15 at purchase (M1–M10 + R1–R5, shown as A1–A5). Voided mains are replaced, in question order, by the first unused non-void reserves; a voided reserve is skipped. More voided mains than non-void reserves ⇒ the whole week voids and every ticket is refunded in full. A ticket wins when all 10 graded questions are correct |
| R-GUARANTEE | A guaranteed floor of TZS 1,000,000 per week, counted before the fee: jackpot = max(floor, rollover in + this week's sales). The house tops up only in a week with a winning ticket; the top-up never rolls |
| R-FEE | 13% of the jackpot, taken only when a jackpot is paid; nothing in a no-winner week, so all ticket money rolls. TRA and GBT levies are booked on that fee when it is taken. A third, product-specific fee model |
| R-SHARE | Shared equally per winning ticket |
| R-HEADLINE | Wherever the figure appears: "Jackpot TZS X · shared by every 10/10 ticket · {pct} fee at payout"; the win result shows pool, fee and paid. Mono neutral ink, never gold |
| R-ROLLOVER | Rolls until won; no cap. Sunset: if the product is stopped, the unwon pool goes to that final week's highest-scoring tickets, shared equally. The pool sits in its own HOUSE ledger account as a player liability |
| R-CAP | 10 tickets per player per week (config), enforced in the purchase transaction, printed on the slip |
| R-BONUS | Real (main) balance only; bonus refused with a message that names the reason |
| R-CATEGORIES | No politics (licence term in `categories.ts`) |
| R-CANCEL | The platform's free-cancellation rule (RULES §2.6), its runway measured to the sales close |
| R-WEEK | Template: open Monday, close Friday 18:00 EAT, events Friday evening to Sunday, results and payout Monday/Tuesday. An officer may move the close; the system refuses any question whose event starts before it |
| R-NAME | Label "Millionea", title "Maswali Millionea", route `/millionea`; code modules `maswali-*` |
| R-PLACEMENT | No new journey tab. A Millionea card on the Maswali home; Tiketi zangu's switch becomes Maswali \| Juu/Chini \| Millionea; the classic shell gets an entry point |
| R-RESOLUTION | One officer seals each result and each void (the platform default). No AI auto-seal |
| R-INSIDERS | Admin-role accounts and house/desk accounts are barred from buying; house bots `MASWALI: "denied"` |
| R-LAUNCH | Public as soon as built and the live drive passes; the Vodacom S16 baseline must account for it |
| R-MOTION | Claude Design may propose at most four new signature motions (N1–N4); each returns to Ali for yes or no |

**Ruled later the same day:** every remaining recommendation accepted as a batch (§9) · the guarantee pre-funded with
TZS 2,000,000 by an audited owner ceremony · licence basis = Ali's dated ruling (risk accepted) · one 24-hour dispute
window per week, never closing before 12:00 EAT.

**Not a ruling, a fact of the rules:** which reserve is drawn in which voided slot is presentation only. The graded set
is always "the first *k* non-void reserves", so the lowest-numbered voided main takes the first such reserve.

## §3 · The rulebook (MR-1 … MR-32)

> The product's statement until S1 writes RULES §2.12, which then owns every figure and rate below. Tags in square
> brackets name each rule's authority. Five corrections from the register (MB-99) are folded in where marked ⭐.

### A · Name and placement

**MR-1 · Name.** `[Ali 2026-10-16: R-NAME]`
- The player label is **Millionea** and the page title is **Maswali Millionea**.
- The player route is `/millionea` (`/millionea/[weekId]`, `/millionea/tickets/[ticketId]`). The admin route is `/admin/maswali`.
- Code modules keep the `maswali-*` names, and the product line value is `"MASWALI"`.
- The word "Maswali" alone never names this product, because in the journey it means the Yes/No questions tab (SJ-19).
- The August records still write the route as `/maswali…`; they are records and are not renamed. The route is `/millionea`.

**MR-2 · Placement.** `[Ali 2026-10-16: R-PLACEMENT]`
- The journey keeps its four tabs exactly: Maswali · Juu/Chini · Tiketi zangu · Akaunti.
- The Maswali home tab carries a Millionea card.
- The Tiketi zangu switch becomes **Maswali | Juu/Chini | Millionea**. That means a third `TicketKind`, with `/millionea/tickets` added to `TAB_ROUTES` above `/millionea`.
- A Millionea ticket never renders as a Yes/No position, either in `/positions` or in `/positions/[id]`.
- The classic shell needs an entry point because launch may come before the S15 flip (OD-23, accepted): a Millionea
  card at the head of the classic `/markets` board, "Millionea" as the first row of More (and of the desktop overflow
  menu from 1024), a notice row on classic `/positions` when tickets are held, and **no** bottom-rail slot.

### B · The week

**MR-3 · Week lifecycle.** `[PDF §2.4, §5; Ali 2026-10-16: R-WEEK]`
- A week moves through DRAFT → OPEN → CLOSED → RESOLVING → SETTLED. VOIDED is a terminal alternative.
- At most **one** week is OPEN at a time. A ticket always binds to the OPEN week.
- Week N+1 opens on its own schedule, even while week N is RESOLVING. The PDF says "next round begins immediately".
- Weeks settle **strictly in order**: week N+1 may not settle until week N is SETTLED or VOIDED.
- ⭐ A partial unique index allows one OPEN week per visibility. There is deliberately **no** "one closed-unsettled
  week" index: a stalled week N would then stop week N+1 from closing (MB-16).
- Each week is one `PredictionMarket` row (`productLine "MASWALI"`) plus one `MaswaliCycle` row.

**MR-4 · Sales window and close.** `[Ali 2026-10-16: R-WEEK]`
- The default template:
  - sales open Monday;
  - sales close **Friday 18:00 EAT**;
  - events run Friday evening to Sunday;
  - results and payout are Monday or Tuesday.
- An officer may move the close time. On open, and on every move, the system **refuses** unless
  `closesAt ≤ min(eventStartsAt) − minLockBufferMinutes` across all 15 questions (the buffer is 30 minutes, OD-15,
  frozen per week) and `closesAt > now`. A move earlier keeps every sold ticket's full cancellation window; a move is
  never made after the close has passed (MB-28).
- `eventStartsAt` is the start of the observation window named in the criterion: kickoff, the opening of the measured session, or the start of the rainfall window.
- After the close, no purchase and no cancellation is possible.
- Test cases:
  - a question whose event starts at 17:59 Friday makes a 18:00 close impossible to save;
  - moving the close later than the earliest event start is refused, and the reason names the question.

**MR-5 · An event moved earlier after sales open.** `[Derived from R-WEEK]`
- If a question's real event start moves before the current close, the officer must do one of two things:
  - (a) move the close to at or before the new start, if that is still in the future; or
  - (b) where any ticket was sold after the event actually began, seal that question **VOID** (MR-15). The reserves then apply.
- No ticket may ever be graded on a question whose event began before that ticket was bought.

### C · Questions

**MR-6 · The fifteen questions.** `[PDF §2.2, §2.4; Ali 2026-10-16: R-RESERVES]`
- Every week publishes exactly **10 main (M1–M10) and 5 reserve (R1–R5)** binary Yes/No questions at open.
- A week cannot open with fewer than 15.
- Text (EN/SW/ZH), criterion (EN/SW/ZH), source host, `eventStartsAt` and `deadlineAt` freeze at open. They are absent from `QUESTION_PATCHABLE`, and a patch throws.
- Every `deadlineAt ≤ opensAt + 7 days`.
- A week cannot open with any SW criterion missing.

**MR-7 · Admissibility and categories.** `[Ali 2026-10-16: R-CATEGORIES; PDF §6; Platform: categories.ts]`
- Allowed categories are those in `MARKET_CATEGORIES`: sports, macro (stocks), weather, crypto, culture (entertainment), tech, other. **Politics is refused**, and the PDF's "Politics" is struck.
- Each question names:
  - a source that passes `isSourceTrusted()` at open;
  - an instrument or fixture;
  - a window with a time zone;
  - a threshold;
  - its own void condition (for example, "if not played by [date], VOID").
- The test is that two officers, reading only the criterion and opening only the source, would reach the same verdict.

### D · The ticket

**MR-8 · Ticket.** `[PDF Key facts, §3(1)]`
- One ticket costs **TZS 1,000**, fixed. The amount is frozen in the week's `rulesSnapshot`, and `stakeBoundsForMarket` returns min = max = 1,000 for MASWALI. That sits inside RULES §2.3's 500–1,000,000 range.
- A ticket is one `Position` (`side "YES"`) plus one `MaswaliTicket` row.
- Purchase goes **only** through `buyPosition`, with a Maswali context. `buyPositionAction` refuses a MASWALI market that arrives without picks.
- "Via mobile money" means deposit first, then buy from the wallet. Agents never sell tickets.

**MR-9 · Picks.** `[Ali 2026-10-16: R-RESERVES]`
- The player answers **all 15** (M1–M10 and R1–R5) before purchase. The slip refuses fewer.
- Picks are immutable once bought.
- ⭐ Each ticket gets a 128-bit **salt**, held server-side and shown only to its owner, and
  `selectionsHash = SHA-256(weekId|ticketId|salt|canonicalSelections())` is written at purchase. Without the salt the
  hash could be brute-forced: there are only 2^15 possible pick sets (MB-32).
- This overrides PDF §3(3) ("reserves are not answered") by ruling.

**MR-10 · Eligibility.** `[Ali 2026-10-16: R-BONUS, R-INSIDERS; Platform: RULES §2.9, RG]`
- **Real balance only.** A purchase that would draw bonus money is refused with a registered `failure-reasons.ts` reason (en/sw/zh) that names the cause.
- **Insiders refused** with a clear message:
  - any account holding a staff/admin role (the 7 roles in `roles.ts`);
  - any house or desk account.
- **House bots:** `HOUSE_PRODUCT_POLICY.MASWALI = "denied"`, and MASWALI is absent from `INTENT_PRODUCT_LINES` and `TARGET_PRODUCT_LINES`.
- Every responsible-gambling gate fires through `buyPosition`:
  - self-exclusion and cool-off;
  - session limit;
  - rolling-24h loss limit;
  - account status and wallet freeze;
  - rate limit and maintenance.
- A ticket bought before a self-exclusion still settles.

**MR-11 · Cap.** `[Ali 2026-10-16: R-CAP]`
- The cap is **10 tickets per player (account) per week**, held as the config value `maswali.ticketCapPerWeek`.
- Inside the wallet lock and the same `withMoneyTx`: count this account's non-cancelled tickets for the week, refuse at 10, and insert the new ticket.
- The slip prints "Ticket n of 10 this week".
- Test: 20 concurrent buys from one account produce exactly 10 tickets.

**MR-12 · Free cancellation.** `[Ali 2026-10-16: R-CANCEL; Platform: RULES §2.6]`
- `sellable = hadRunway && withinWindow && !bonusFunded`, unchanged.
- RUNWAY is measured against `closesAt`: at least 5 minutes of sales time must remain when the ticket is bought.
- A cancel refunds 1,000 in full, marks the `MaswaliTicket` cancelled, decrements `ticketCount`, and leaves the ticket out of the hash and out of grading.

**MR-13 · Close and the ticket commitment.** `[Engineering: Aug G-5; corrected by MB-32]`
- ⭐ At close, a **Merkle root** over every non-cancelled `selectionsHash` (sorted by ticket id), the ticket count and
  the close time are stamped once, published on `/fairness` and the week's register page, and never rewritten.
- A ticket's owner can obtain an inclusion proof for their own ticket. After settlement an anonymised graded table is
  published. The question-set hash is published separately, at open.

### E · Resolution

**MR-14 · Who seals.** `[Ali 2026-10-16: R-RESOLUTION]`
- **One officer** sets each question's result (YES, NO or VOID), with evidence.
- If the platform-wide `requireTwoOfficer` flag is on, Millionea follows it like every other product. There is no Millionea-specific second signature.
- **No AI auto-seal.** MASWALI is excluded from `nextDeadlineFor` and from the AI sentinel's resolve path. The AI may attach evidence and a suggested outcome to a question, and only an officer's act seals it.
- Every seal and every void is audited.

**MR-15 · Void grounds — a closed list.** `[PDF §2.2; OD-04 and OD-09b, accepted]`
- A question is VOID only on one of these grounds, each with a reason code from `maswali-void-reason.ts`, evidence,
  and publication on the register:
  - not played or finished by its void deadline (scheduled start + 48 hours, capped at Monday 23:59 EAT of the
    results week, frozen per question and printed on it);
  - abandoned with no official result;
  - no reading from the primary or the named fallback source by the deadline;
  - the outcome was publicly settled before the sales close (MR-5);
  - the criterion is materially wrong, or the English and Swahili texts diverge, found before the close or upheld by
    an objection.
- The Yes/No markets' discretionary "management may refund" grounds do **not** carry over. A platform error voids the
  whole week (an integrity failure), never a single question.

**MR-16 · Objections — one 24-hour window per week.** `[Ali 2026-10-16; OD-05; corrected by MB-23]`
- Any holder of a non-cancelled ticket in the week may object, **per question**: `Objection.questionOrdinal`, written
  M1–M10 / R1–R5, keyed (week, ordinal, player).
- ⭐ Millionea has its own window, frozen in the week's rules: **24 hours, opening when the graded set becomes final,
  never closing before 12:00 EAT**. It is not the platform's live `objectionWindowHours`.
- Remedies: REVERSE, VOID and **REINSTATE** (an upheld objection can bring a voided question back).
- An officer other than the one who sealed the question rules on it; the Owner is the fallback.
- Settlement refuses while any objection is OPEN, failing closed. An upheld objection that changes the graded set
  re-runs MR-17 and restarts the window once.
- A SETTLED week is final.

### F · Grading

**MR-17 · Reserve substitution and the win condition.** `[Ali 2026-10-16: R-RESERVES; PDF §2.2, §3(4)]`

```
grade(week, picks):
  voided  = [i in 1..10 where M[i].outcome == VOID]          // ascending ordinal
  usable  = [j in 1..5  where R[j].outcome in {YES, NO}]     // ascending; void reserves skipped
  if len(voided) > len(usable): return WEEK_VOID             // MR-18
  graded  = [M[i] for i in 1..10 if M[i].outcome != VOID]
          + [R[usable[k]] for k in 0..len(voided)-1]         // k-th voided main <- k-th usable reserve
  assert len(graded) == 10
  score   = count(q in graded where picks[q] == q.outcome)
  return { graded, score, wins: score == 10 }
```

- Reserves that are not used are never graded.
- The graded **set** depends only on how many mains voided, so it does not matter when or in what order they voided. The pairing ("M4 → R1") exists only for display.
- Table-driven test, covering 0..10 voided mains against every reserve-void pattern:
  - 0 voids: M1..M10 are graded.
  - M3 void and R1 void: R2 is graded.
  - 5 voids with R3 void: WEEK_VOID.
  - 6 voids: WEEK_VOID.
- The scorer is `src/lib/maswali-score.ts`. It is pure and isomorphic, and the slip, the ticket page and settlement all use it.

**MR-18 · Whole-week void.** `[Ali 2026-10-16: R-RESERVES]`
- When voided mains outnumber the non-void reserves, the week becomes VOIDED and **every ticket is refunded 1,000 in full**.
- No fee or levy is taken, and no top-up is paid.
- R is untouched and carries to the next week.
- Implementation follows the Up & Down pattern: stamp the market VOID with `objectionsClosedAt = now`, then call `settleMarket(id, {actorId: "system_maswali"})`. Its VOID branch refunds both the real and the bonus parts. It is not `emergencyVoidMarket`, which refuses a system actor.

**MR-19 · Settlement gate.** `[Derived from R-RESERVES]`
- Settlement needs:
  - all 10 mains sealed;
  - R1..Rj sealed, where j is the smallest index whose non-void count reaches the number of voided mains (j = 0 when no main voided);
  - if no such j ≤ 5 exists, all five reserves sealed (which leads to MR-18);
  - the objection window elapsed and no OPEN objection;
  - `market.settledAt IS NULL`, checked inside the lock.
- ⭐ Officers seal **all 15 by default**: an objection that voids a main can pull an unused reserve in (MB-14). Later
  reserves do not gate payout, but they are sealed for the record.
- Settlement is **released by one accounting officer** after a system preview (OD-06, accepted); an alert fires if it
  is not released within 4 hours of the gate passing.

### G · Money

**MR-20 · Jackpot.** `[Ali 2026-10-16: R-GUARANTEE; PDF §4.1]`
- **J = max(1,000,000, R + S)**. The floor is counted before the fee.
- R joins week N's figure only once week N−1 is terminal. Before that, the page shows "plus week N−1's carry-over once its results are final".

**MR-21 · Rollover.** `[Ali 2026-10-16: R-ROLLOVER, R-GUARANTEE]`
- Rollover money lives in one ledger account, `HOUSE:MASWALI_JACKPOT`, held as a **player liability**. It is added to `playerLiability` in `house-book.ts`.
- In a no-winner week:
  - `POOL:{market} −S → HOUSE:MASWALI_JACKPOT +S`;
  - no fee is taken and 100% rolls;
  - there is no cap and no must-be-won week.
- Only real ticket money (and carried dust, MR-25) ever enters the account. The top-up never does.
- R for week N is the account balance at N's settlement. Because settlement is sequential (MR-3), a rollover is claimed exactly once.

**MR-22 · Top-up.** `[Ali 2026-10-16: R-GUARANTEE; Engineering: Aug §5]`
- The house tops up only in a week with **k ≥ 1**:
  - `Out = F + k × floor((J − F)/k)`;
  - `U = max(0, Out − (R + S))`.
- U is debited from a funded `HOUSE:MASWALI_GUARANTEE`.
- If the account cannot cover U, settlement **aborts** with a CRITICAL alert. It never pays less.
- A week does not open unless the guarantee account holds at least Σ (1,000,000 − confirmed carry-in) over every
  unsettled week, the new one included (OD-02, accepted). The Owner pre-funds **2,000,000** before week 1 through an
  audited owner-capital ceremony, because week N+1 opens while week N is still unsettled. The floor figure is shown
  only while that holds.

**MR-23 · Fee.** `[Ali 2026-10-16: R-FEE; PDF §4.2]`
- **F = round(0.13 × J)**, taken **only when k ≥ 1**. The rate is read from the week's frozen snapshot.
- J includes R and any U.
- While no dust is carried, J is a multiple of 1,000, so F is exact (130 per 1,000).
- PDF check: J = 1,050,000 gives F = 136,500 and a payout of 913,500.

**MR-24 · Levies.** `[Ali 2026-10-16: R-FEE; Platform: RULES §2.2]`
- `levySplit(F)` is called once: TRA = round(0.10F), GBT = round(0.05F), operator net = F − TRA − GBT.
- Both levies are booked at settlement to `HOUSE:TRA_LEVY` and `HOUSE:GBT_LEVY`. Nothing is booked in a no-winner week.

**MR-25 · Sharing and dust.** `[Ali 2026-10-16: R-SHARE; OD-19, accepted]`
- Each winning **ticket** receives `floor((J − F)/k)`. A player with two winning tickets gets two shares.
- Dust is `(J − F) − k × share`, which is always less than k.
- Dust stays in `HOUSE:MASWALI_JACKPOT` and joins the next jackpot, printed on the register as "rounding carried to
  the next jackpot". In a week with a top-up, U already excludes it, so house money never carries forward.
- A dedicated equal-split allocator is required. It has **no winner floor**: `assertWinnerFloor` would throw once
  k > 870 at the floor. Millionea is exempt from the "never paid below stake" invariant, and the rules and the chat
  assistant say so.

**MR-26 · Booking and conservation.** `[Engineering: Aug G-4, §7]`
- Ticket money sits in `POOL:{market}` until settlement and is **split only at settlement**.
- One balanced group, `maswali_settle_{weekId}`:
  - `POOL −S`
  - `JACKPOT −R`
  - `GUARANTEE −U`
  - `COMMISSION +F` (then the existing `−TRA/−GBT` pair)
  - `TRA_LEVY +TRA`
  - `GBT_LEVY +GBT`
  - `PLAYER:{u} +share` for each winning ticket
  - `JACKPOT +carried`
- Per-component assertions: `S + R + U = F + Σshares + carried`; `F = TRA + GBT + net`; `Σshares = k × share`.
- ⭐ `POOL:{market}` ends at **exactly 0** — no rounding tolerance for this product (MB-02).
- `rulesSnapshot` is write-once at open and settlement reads only it.
- Losing tickets become `Position LOSS` with `finalPayout 0`. Winning tickets become WIN.

**MR-27 · Credit and withdrawal.** `[Platform: COMPLIANCE-DECISIONS 2026-09-13 (third), 2026-10-07, 2026-10-10; RULES §2.7]`
- Winnings are credited to the real wallet immediately at settlement. There is no AML hold.
- The win notification states what withdrawal needs:
  - verified identity;
  - a confirmed email;
  - at most 5,000,000 per withdrawal;
  - a 1.5% withdrawal fee (870,000 withdrawn arrives as 856,950).
- It never promises an AML review.

### H · Display

**MR-28 · Headline and results.** `[Ali 2026-10-16: R-HEADLINE]`
- Everywhere it appears, the headline reads: "**Jackpot TZS X · shared by every 10/10 ticket · {pct} fee at payout**". X = J (MR-20) and `{pct}` is interpolated from the snapshot.
- The figure is mono neutral ink: never gold, no count-up, no loop, no confetti. It changes only on a real sale, a cancellation (it can move **down** by 1,000 above the floor), or N−1 settling.
- A win result shows the pool, the fee, the amount paid, the number of winning tickets and the share.
- A no-winner week's public page states the amount carried to week N+1.

**MR-29 · Motion.** `[Ali 2026-10-16: R-MOTION]`
- Claude Design may propose at most **N1–N4** new signature motions, built from 50pick symbols.
- Each one goes to Ali for yes or no.
- Each yes is written into DESIGN_AUTHORITY as a Millionea exception to M8, and into `motion.css`.
- Everything else uses the existing ladder. `.value-flash` flashes `--gold-300`, so it may not be used on X (OD-24 (ruled — §9)).

### I · End of life and launch

**MR-30 · Sunset.** `[Ali 2026-10-16: R-ROLLOVER]`
- If the product is stopped, the unwon pool goes to that final week's **highest-scoring** tickets (the MR-17 score:
  graded correct answers out of 10), shared equally per ticket. That week is the only place a score decides money.
- (OD-03, accepted) The final week is announced at least one full week before its sales open and runs normally. The
  13% fee and its levies apply to the sunset payout; there is no floor top-up unless a ticket gets 10/10 (then normal
  settlement applies). If the final week voids or sells nothing, the next scheduled week becomes final. An
  Owner-ordered stop mid-week lets the current week run as the final week; a regulator-ordered stop refunds the
  current week, and the pool goes to the highest-scoring tickets of the last fully graded week unless the regulator
  directs otherwise. The trigger is an Owner-only ceremony with typed confirmation.

**MR-31 · Launch.** `[Ali 2026-10-16: R-LAUNCH]`
- Millionea launches publicly once it is built and its live drive passes. It does not wait for the Vodacom S16 check.
- The S16 baseline accounts for it (OD-22, accepted): the five measures exclude Millionea, and harm markers are
  reported for all players and for players without a ticket, by a dated ruling amending S16's "in bounds".
- The licence basis is **Ali's dated ruling of 2026-10-16** (OD-01): he chose it over a written Gaming Board note and
  accepted the risk. The Owner-only `maswali.licenceBasis` records it, and no week opens while it reads NONE.

**MR-32 · Filing the law.** `[Ali 2026-10-16: R-FEE, R-CAP; Platform: RULES §5]`
- The RULES §5 ceremony runs in full:
  - a COMPLIANCE-DECISIONS entry;
  - a RULES §1 row, a new **§2.12** (because §2.10, §2.10a and §2.11 are taken), and §3 changed from "two fee models" to three (`jackpot-payout`);
  - the cap recorded as a product exception to §2.4;
  - code, config and every surface in one commit: `/legal/terms` §4 and a new `/legal/rules/millionea` in 3 locales, `chat.ts`, `/help`, and a `/admin/config` caption of 17 characters or fewer (for example "13% at payout");
  - red-first guards;
  - verification on production;
  - the two PDFs regenerated.

---

### §3b · The grading algorithm (pseudocode for `src/lib/maswali-score.ts`)

```
type Q = { role: MAIN|RESERVE, ordinal, slot, outcome: YES|NO|VOID|null }
const mains    = questions.filter(MAIN).sortBy(ordinal)      // M1..M10
const reserves = questions.filter(RESERVE).sortBy(ordinal)   // R1..R5 (frozen order)

function voidedMains()  = mains.filter(q => q.outcome == VOID)               // ascending ordinal
function usableReserves()= reserves.filter(q => q.outcome in {YES, NO})       // void reserves skipped

// MR-19 / MB-14: what must be sealed before settlement may run
function settlementGate():
  if any main.outcome == null: return WAIT("mains unsealed")
  v = len(voidedMains())
  if v == 0: return READY(graded = mains)
  usable = 0
  for j in 1..5:
    r = reserves[j]
    if r.outcome == null: return WAIT("R"+j+" needed")      // a needed reserve is unsealed
    if r.outcome != VOID: usable += 1
    if usable == v: return READY(graded = gradedSet())
  return WEEK_VOID                                           // all 5 sealed, still short

function weekVoidCertain():                                  // stops sales early, never auto-executes
  v = len(voidedMains()); vr = count(reserves where outcome == VOID)
  return v > 5 - vr

function gradedSet():                                        // the SET depends only on v (order of voiding irrelevant)
  live = mains.filter(q => q.outcome != VOID)
  subs = usableReserves()[0 .. len(voidedMains())-1]
  assert len(live) + len(subs) == 10
  return live ++ subs

function displayMap():                                       // built ONLY from the final record (no "un-carry")
  zip(voidedMains(), usableReserves()) → [{main: "M4", reserve: "R1"}, ...]   // k-th void (by ordinal) ← k-th usable

function grade(picks /* 15 slots */):
  g = settlementGate()
  if g == WEEK_VOID: return { weekVoid: true }
  if g is WAIT:      return { provisional: true, matchedSoFar: count(q sealed in live mains where picks[q.slot]==q.outcome) }
  graded = gradedSet()
  score  = count(q in graded where picks[q.slot] == q.outcome)
  return { graded, score, wins: score == 10 }

function sunsetScore(picks) = grade(picks).score            // OD-03: graded correct out of 10, shared equally per ticket
```

**Invariants the tests table-drive:**
- `len(graded) == 10` whenever READY.
- No ticket is graded on a reserve that was not used.
- A voided reserve is never graded.
- READY never holds while a needed reserve is unsealed.
- The graded set is the same for any order in which the voids arrived.
- An objection that changes an outcome re-runs `settlementGate`, and if the graded set changes, the window reopens once (OD-05).

---

## §4 · Architecture

**Principle inherited from Up & Down: the product's own tables never hold money.** Money moves only through
`PredictionMarket` / `Position` / `Transaction` / `LedgerEntry`. The full Prisma models are in S1's work order (§7b);
every ledger movement is in §5b.

| Concern | Decision | Reuse (verified on `origin/main`, 2026-10-16) |
|---|---|---|
| The week | One `PredictionMarket` row (`productLine: "MASWALI"`, all ticket money in `yesPool`, `noPool` 0) + a `MaswaliCycle` row: state DRAFT→OPEN→CLOSED→RESOLVING→SETTLED/VOIDED, `seq` for strict settlement order, write-once `rulesSnapshot`, `questionSetHash` at open, Merkle root + count + sales at close, stamped-once `rolloverIn`, settlement columns mirrored from the ledger, `settlementGroupId @unique`, `isFinal`, `visibility` PUBLIC/DRIVE | `createMarket({productLine, rateOverrides})`, as `updown-service.ts openRound` does |
| The questions | `MaswaliQuestion`: role MAIN/RESERVE, ordinal, slot 1–15, category, text and criterion ×3 locales, source + fallback frozen at open, `eventStartsAt` in its own zone, `voidDeadlineAt`, probability estimate, outcome YES/NO/VOID, void reason, evidence, AI suggestion (never seals) — no money | `isSourceTrusted`; a `QUESTION_PATCHABLE` allowlist like `ROUND_PATCHABLE` |
| The ticket | A `Position` (stake 1,000, side YES) + `MaswaliTicket`: 15 canonical picks, an owner-only salt, the Merkle leaf, serial minted at payment, LIVE/CANCELLED/SETTLED, rules version, score/won/payout written once | `buyPosition` → `buyPositionInner` with a Millionea context (picks, the cap counted inside the `wallet:` lock, bonus refused before the real/bonus split, insiders refused), so every responsible-gambling gate fires on the one bet path |
| Ledger | `HOUSE:MASWALI_JACKPOT` (carried player money — a liability) and `HOUSE:MASWALI_GUARANTEE` (the house's floor fund) | `withMoneyTx`, `postLedgerEntries`, `levySplit`, `stakeEntries`, `refundEntries`; both accounts added to `house-book.ts` liabilities |
| Settle (winners) | Its own function: grade → J = max(floor, R+S) → top-up from GUARANTEE → fee → `levySplit` → a **new** equal-split allocator with **no** winner floor → one balanced group, exactly-once inside the `market:` lock | ⛔ not `settleMarket` (it refunds a one-sided pool) and ⛔ not `allocateWinnerPayouts` (its floor throws below stake) |
| Settle (no winner) | The week's sales move POOL → `HOUSE:MASWALI_JACKPOT`; no fee; tickets LOSS | a new rollover builder |
| Week void | Stamp VOIDED + `objectionsClosedAt`, then `settleMarket(id, {actorId: "system_maswali"})`'s VOID arm refunds real and bonus parts | the `updown-service closeRound` precedent; ⛔ not `emergencyVoidMarket` (officer-only) |
| Scheduling | `maswali-scheduler.ts` + boot hydrate + lifecycle heal and reconcile | the Up & Down scheduler pattern; `nextDeadlineFor` returns null for MASWALI |
| Two-product assumptions | S0.5 widens every closed list and coercion before any MASWALI row exists | `test:product-line` extended + a red control that plants a MASWALI row |
| Resolution | One officer seals; per-question objections in Millionea's own 24-hour window; REVERSE/VOID/REINSTATE | `objections-service.ts`; `twoOfficerGate` only if the platform flag is ever on |
| Rollout | `MILLIONEA_SHIPPED` (WITHDRAWN → STAFF_PREVIEW → ACTIVE) under an env ceiling and the Owner's stored switch — the lowest wins | the journey's `feature-state.ts` pattern |
| Admin | `/admin/maswali` (trading), `/admin/maswali/[weekId]`, `/admin/maswali/pools` (accounting; listed before `/admin/maswali` in `ROUTE_DOMAINS`) | `ROUTE_DOMAINS`, `CONTROL_DOMAIN`, `control-locked.tsx`, `defineConfig` |
| Player | `/millionea`, `/millionea/how`, `/millionea/slip`, `/millionea/tickets` and `/[serial]` (owner only), `/millionea/register` and `/[week]` (public, works without JavaScript), the journey home card, Tiketi zangu's third kind, the classic entry, `/legal/rules/millionea` | `PageContainer` tiers `reading` and `receipt` |
| Reports | A third product in the tax report (filter, `byProduct`, CHECK) with the reconciling lines; the statutory pack reads `"ALL"`; a week attestation on `/fairness` | `tax-report-data.ts`, `catalogue.ts`, `attestations.ts` |

## §5 · The money, worked

### §5a · Economics

**Platform rates.** The fee is 13% of J, taken at payout. TRA is 10% and GBT 5% of the fee. Operator net is therefore 11.05% of J.

**Probability model.** Picks are random and independent and outcomes are 50/50. A ticket wins with probability 1/1,024, and P(≥1 winner) = 1 − (1023/1024)^T.

#### 5a.1 · A fresh week (R = 0)

| Tickets | S | J | P(≥1) | No winner | Top-up U | Fee F | TRA | GBT | Operator net | 1 winner gets | 3 winners, each | House result (k ≥ 1) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 200 | 200,000 | 1,000,000 | 17.75% | rolls 200,000; house 0 | 800,000 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | 290,000 | **−689,500** |
| 300 | 300,000 | 1,000,000 | 25.41% | rolls 300,000 | 700,000 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | 290,000 | **−589,500** |
| 500 | 500,000 | 1,000,000 | 38.65% | rolls 500,000 | 500,000 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | 290,000 | **−389,500** |
| 1,000 | 1,000,000 | 1,000,000 | 62.36% | rolls 1,000,000 | 0 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | 290,000 | **+110,500** |
| 1,500 | 1,500,000 | 1,500,000 | 76.91% | rolls 1,500,000 | 0 | 195,000 | 19,500 | 9,750 | 165,750 | 1,305,000 | 435,000 | **+165,750** |
| 5,000 | 5,000,000 | 5,000,000 | 99.24% | rolls 5,000,000 | 0 | 650,000 | 65,000 | 32,500 | 552,500 | 4,350,000 | 1,450,000 | **+552,500** |

- House result = operator net − U.
- Conservation for 300 tickets with one winner: 300,000 + 700,000 = 870,000 + 130,000, and 130,000 = 13,000 + 6,500 + 110,500.
- In a floor week the house pays the fee on its own 700,000, which is 91,000 of fee carrying 13,650 of levies. That cost is real.
- PDF case, J = 1,050,000: F 136,500, TRA 13,650, GBT 6,825, operator net 116,025, paid 913,500 (304,500 each to three winners).
- A player holding 2 of the 3 winning tickets in a floor week receives 580,000.
- **Dust, 7 winners at 1,500 tickets:** 1,305,000 ÷ 7 = 186,428 each, paying 1,304,996. The remaining 4 carries in the jackpot account.
- **Dust, 7 winners at 300 tickets (floor week):** 869,995 is paid. U = 699,995, so nothing carries: 300,000 + 699,995 = 130,000 + 869,995.

#### 5a.2 · Expected weekly house result

There are two views:
- **Fresh week:** every week starts at R = 0. E = P(≥1) × (operator net − U).
- **Long run:** T is constant and carry-overs are real. Over the life of the product all ticket money is paid out, so E[house per week] = 0.1105·S − 0.8895·E[U per week]. Here E[U] = q·Σₘ q(1−q)^(m−1)·max(0, 1,000,000 − m·S), where m counts the weeks since the last win.

| Tickets | E[winners] | Fresh-week E[house] | Long-run E[top-up]/week | Long-run E[house]/week | Long-run per year |
|---|---|---|---|---|---|
| 200 | 0.195 | −122,387 | 52,786 | **−24,853** | −1.29M |
| 300 | 0.293 | −149,769 | 68,034 | **−27,366** | −1.42M |
| 500 | 0.488 | −150,529 | 74,678 | **−11,176** | −0.58M |
| 1,000 | 0.977 | +68,905 | 0 | **+110,500** | +5.75M |
| 1,500 | 1.465 | +127,470 | 0 | **+165,750** | +8.62M |
| 5,000 | 4.883 | +548,324 | 0 | **+552,500** | +28.73M |

The fresh-week view overstates losses below 1,000 tickets. At 300 tickets a week the pot clears the floor by itself in week 4, so most wins are paid from real money.

**Break-even:**
- **about 630 tickets a week** over the long run (629 gives −57; 630 gives +81);
- **890 tickets** in a fresh-week view (110,500 ≥ 1,000,000 − 1,000·T);
- **1,000 tickets** to remove top-up exposure entirely.

**Caveat.** Real picks crowd on favourites. With 50/50 outcomes, P(≥1 winner) equals the number of distinct combinations covered divided by 1,024. That makes it a measurable exposure meter at close, and `/admin/maswali/pools` should show it. Real outcomes are not 50/50, so measure P(≥1) after launch instead of trusting this table.

**Arbitrage.**
- Covering every combination costs 1,024,000 (1,024 tickets, so at least 103 accounts at the cap).
- With nothing else in the pot it loses: 0.87 × 1,024,000 = 890,880.
- It turns positive, before dilution by other winners, once R plus other sales exceed **153,012**.
- Any rollover makes the cover profitable. The ticket cap counts per account, and identity is only checked at withdrawal (OD-16 (ruled — §9)).
- This is a fairness risk, not a solvency risk: a covered week never needs a top-up.

#### 5a.3 · A six-week trajectory

| Week | Tickets | R in | R + S | Headline X | Result | U | F | TRA | GBT | Operator net | Paid | House | Jackpot account after |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 300 | 0 | 300,000 | 1,000,000 | no winner | — | 0 | 0 | 0 | 0 | 0 | 0 | 300,000 |
| 2 | 400 | 300,000 | 700,000 | 1,000,000 | 1 winner | 300,000 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | −189,500 | 0 |
| 3 | 500 | 0 | 500,000 | 1,000,000 | no winner | — | 0 | 0 | 0 | 0 | 0 | 0 | 500,000 |
| 4 | 600 | 500,000 | 1,100,000 | 1,100,000 | no winner | — | 0 | 0 | 0 | 0 | 0 | 0 | 1,100,000 |
| 5 | 700 | 1,100,000 | 1,800,000 | 1,800,000 | no winner | — | 0 | 0 | 0 | 0 | 0 | 0 | 1,800,000 |
| 6 | 800 | 1,800,000 | 2,600,000 | 2,600,000 | 3 winners | 0 | 338,000 | 33,800 | 16,900 | 287,300 | 2,262,000 (754,000 each) | +287,300 | 0 |
| **Σ** | 3,300 | | | | | 300,000 | 468,000 | 46,800 | 23,400 | 397,800 | 3,132,000 | **+97,800** | |

- Conservation: sales 3,300,000 + top-up 300,000 = paid 3,132,000 + fee 468,000.
- During week 5's sales, week 4 is still RESOLVING. Week 5's headline shows only its own sales until week 4 settles; then the 1,100,000 joins it (MR-20).

#### 5a.4 · Tax-report filing model compared with the booked fee

The tax report files Commission = round(13% × Payout), then TRA and GBT on the rounded commission, step by step. The ledger books 13% of J. Because Payout = 0.87J, the filed commission is 0.87F, a gap of 0.13F.

| Case | Payout | Filed C / TRA / GBT | Booked F / TRA / GBT | Gap (fee / levies) |
|---|---|---|---|---|
| Floor week, J 1,000,000 | 870,000 | 113,100 / 11,310 / 5,655 | 130,000 / 13,000 / 6,500 | 16,900 / 2,535 |
| PDF, J 1,050,000 | 913,500 | 118,755 / 11,876 / 5,938 | 136,500 / 13,650 / 6,825 | 17,745 / 2,661 |
| J 1,500,000 | 1,305,000 | 169,650 / 16,965 / 8,483 | 195,000 / 19,500 / 9,750 | 25,350 / 3,802 |
| J 5,000,000 | 4,350,000 | 565,500 / 56,550 / 28,275 | 650,000 / 65,000 / 32,500 | 84,500 / 12,675 |
| Six-week trajectory | 3,132,000 | 407,160 / 40,716 / 20,358 | 468,000 / 46,800 / 23,400 | 60,840 / 9,126 |

- A no-winner week files 0 and books 0. However, Report 1's check is then out by S, because settled tickets leave On hold for a rollover account that is not a Report 1 line.
- In a payout week the check is out the other way, by R + U.
- GGR swings for the same reason: week 1 shows +300,000 and week 2 shows −470,000. See OD-08 (ruled — §9).

---

### §5b · Settlement, rollover, top-up, refund and sunset — ledger movements to the shilling

#### Accounts and entry types

**Accounts:**
- `PLAYER:{u}`;
- `POOL:{marketId}` (one per week);
- `HOUSE:MASWALI_JACKPOT` (the player-liability pool, R);
- `HOUSE:MASWALI_GUARANTEE`;
- `HOUSE:COMMISSION`, `HOUSE:TRA_LEVY`, `HOUSE:GBT_LEVY`;
- the owner-capital counterparty.

**Movements**, written "from → to". Each group nets to 0:

| Event | Movement | Entry type |
|---|---|---|
| Ticket bought | `PLAYER:u → POOL` 1,000 | `STAKE_DEBIT`, via `stakeEntries` |
| Free cancel | `POOL → PLAYER:u` 1,000 | `REFUND` |
| Guarantee funded | `OWNER_CAPITAL → GUARANTEE` | `MASWALI_GUARANTEE_FUND` |
| Guarantee returned | `GUARANTEE → OWNER_CAPITAL` | `MASWALI_GUARANTEE_RETURN` |
| No winner (k = 0) | `POOL → JACKPOT` S | `MASWALI_ROLLOVER_OUT` (F = 0, U = 0; R stays where it is) |

**Winner week (k ≥ 1), one group `maswali_settle_{weekId}`:**

| Movement | Entry type |
|---|---|
| `JACKPOT → POOL` R | `MASWALI_ROLLOVER_IN` |
| `GUARANTEE → POOL` U (only if U > 0) | `MASWALI_TOPUP` |
| `POOL → COMMISSION` F | `SETTLEMENT_COMMISSION` |
| `COMMISSION → TRA_LEVY` TRA | `SETTLEMENT_TRA_LEVY` |
| `COMMISSION → GBT_LEVY` GBT | `SETTLEMENT_GBT_LEVY` |
| `POOL → PLAYER:u` share, per winning ticket | `PAYOUT_CREDIT` |
| `POOL → JACKPOT` carryOut, i.e. dust (only if > 0) | `MASWALI_ROLLOVER_OUT` |

**Other events:**
- **Week void:** every LIVE ticket `POOL → PLAYER:u` 1,000 (`REFUND`, through the `settleMarket` VOID arm). JACKPOT is untouched; R carries to the next week.
- **Forfeit:** a frozen share goes `PLAYER:u → JACKPOT` (`MASWALI_FORFEIT_RETURN`, OD-07).

**Formulas (MR-20…MR-25):**
- J = max(1,000,000, R+S)
- F = round(0.13·J)
- (TRA, GBT, net) = `levySplit(F)`
- share = ⌊(J−F)/k⌋
- U = max(0, F + k·share − (R+S))
- carryOut = R + S + U − F − k·share

**Per-component asserts:**
- `S + R + U = F + k·share + carryOut`
- `F = TRA + GBT + net`
- POOL ends at **exactly** 0
- JACKPOT after settlement = carryOut (k ≥ 1), or R + S (k = 0)

#### Worked example A: the six-week trajectory (fresh launch, 1,000 per ticket)

| Wk | Tickets (S) | R claimed | k | J | F | TRA | GBT | net | share | U | Paid | carryOut | JACKPOT after | GUARANTEE Δ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 300 (300,000) | 0 | 0 | — | 0 | 0 | 0 | 0 | — | 0 | 0 | 300,000 | 300,000 | 0 |
| 2 | 400 (400,000) | 300,000 | 1 | 1,000,000 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | 300,000 | 870,000 | 0 | 0 | −300,000 |
| 3 | 500 (500,000) | 0 | 0 | — | 0 | 0 | 0 | 0 | — | 0 | 0 | 500,000 | 500,000 | 0 |
| 4 | 600 (600,000) | 500,000 | 0 | — | 0 | 0 | 0 | 0 | — | 0 | 0 | 1,100,000 | 1,100,000 | 0 |
| 5 | 700 (700,000) | 1,100,000 | 0 | — | 0 | 0 | 0 | 0 | — | 0 | 0 | 1,800,000 | 1,800,000 | 0 |
| 6 | 800 (800,000) | 1,800,000 | 3 | 2,600,000 | 338,000 | 33,800 | 16,900 | 287,300 | 754,000 | 0 | 2,262,000 | 0 | 0 | 0 |
| **Σ** | 3,300,000 | | | | 468,000 | 46,800 | 23,400 | 397,800 | | 300,000 | 3,132,000 | | | −300,000 |

**Week 2's group, line by line.** POOL starts at +400,000 from the stakes.

| Movement | POOL after |
|---|---|
| JACKPOT → POOL 300,000 | 700,000 |
| GUARANTEE → POOL 300,000 | 1,000,000 |
| POOL → COMMISSION 130,000 | 870,000 |
| COMMISSION → TRA 13,000; COMMISSION → GBT 6,500 | (COMMISSION nets +110,500) |
| POOL → PLAYER 870,000 | **0** ✓ |

**Week 6's group.** POOL starts at +800,000.

| Movement | POOL after |
|---|---|
| JACKPOT → POOL 1,800,000 | 2,600,000 |
| POOL → COMMISSION 338,000 | 2,262,000 |
| COMMISSION → TRA 33,800; COMMISSION → GBT 16,900 | (COMMISSION nets +287,300) |
| POOL → PLAYER 754,000 × 3 | **0** ✓ |

**Totals:**
- Sales 3,300,000 + top-up 300,000 = paid 3,132,000 + fee 468,000 = **3,600,000** ✓.
- House result = operator net 397,800 − top-up 300,000 = **+97,800**.
- R is claimed by weeks 2, 4, 5 and 6, each exactly once (`rolloverIn` stamped once per week).

**Overlap.** While week 5 is selling, week 4 is still RESOLVING. Week 5's headline therefore reads its own sales "plus week 4's carry-over once final". At week 4's settlement it becomes 1,100,000 + sales so far.

#### Worked example B: a floor week with dust (300 tickets, R = 0, k = 7)

- J = 1,000,000, F = 130,000, TRA 13,000, GBT 6,500, net 110,500.
- J − F = 870,000, so share = ⌊870,000/7⌋ = **124,285**. Seven shares = 869,995.
- U = 130,000 + 869,995 − 300,000 = **699,995**.
- carryOut = 300,000 + 699,995 − 130,000 − 869,995 = **0**. The top-up already excludes the 5 of dust, so the house never carries money forward.

#### Worked example C: a real-money week with dust (1,500 tickets, R = 0, k = 7)

- J = 1,500,000, F = 195,000, TRA 19,500, GBT 9,750, net 165,750.
- share = ⌊1,305,000/7⌋ = **186,428**. Paid = 1,304,996.
- U = max(0, 195,000 + 1,304,996 − 1,500,000) = 0.
- carryOut = **4**, moved `POOL → JACKPOT` (`MASWALI_ROLLOVER_OUT`, memo "rounding carried to the next jackpot"; OD-19).

#### Worked example D: a week void (450 tickets, R = 1,100,000)

- Three mains void, and R2 and R4 are void, leaving only R1, R3 and R5 usable.
- 3 voided mains is not more than 3 usable reserves, so the week **grades**: M-voids are replaced by R1, R3 and R5.
- If a fourth main then voids, 4 > 3 and the week **voids**:
  - 450 × `POOL → PLAYER` 1,000 = 450,000 refunded;
  - F = U = 0;
  - JACKPOT stays at 1,100,000, and the next week's R = 1,100,000.

#### Worked example E: guarantee funding (OD-02, ruled)

- **Before week 1 opens:** requirement = 1,000,000 − 0 = 1,000,000. The Owner funds 2,000,000, because week 2 opens on Monday while week 1 is still unsettled, raising the requirement to 2,000,000.
- **After week 2** pays a top-up of 300,000: the fund holds 1,700,000.
- **When week 3 opens:**
  - Unsettled weeks are week 3 only, so the requirement is 1,000,000. The open passes.
  - When week 4 opens while week 3 is unsettled: (1,000,000 − 0) + (1,000,000 − 0) = 2,000,000 > 1,700,000, so **open refused** until the Owner adds 300,000. The requirement uses only *confirmed* carry-in.

#### Worked example F: sunset (OD-03, accepted)

**Scenario:** the final week has no 10/10, S = 600,000, R = 1,800,000, and the top score of 9 is held by 4 tickets.
- J = R + S = 2,400,000. There is no floor and no top-up, because nobody has 10/10.
- F = 312,000; TRA 31,200; GBT 15,600; net 265,200.
- Each top-scoring ticket receives ⌊2,088,000/4⌋ = **522,000**.

**Movements:**
- `JACKPOT → POOL` 1,800,000 (`MASWALI_SUNSET`);
- `POOL → COMMISSION` 312,000, followed by the two levy lines;
- `POOL → PLAYER` 522,000 × 4.

POOL ends at 0. If a 10/10 exists in the final week, normal settlement (floor included) applies instead.

---

## §6 · Launch gate and the weekly runbook

### 6.1 Launch gate: what must be true before the first real ticket

R-LAUNCH means "launch once built and the drive passes". Real money enters at the S8 drive, so **gate A is checked before the drive** and **gate B before ACTIVE**. Each is a `☐` line in §6 that `test:maswali-plan` reads.

**Gate A, before any real-money ticket (including the drive):**

1. ☐ **Licence basis recorded (OD-01):**
   - Ali chose his own dated ruling (2026-10-16, the COMPLIANCE entry) over a written Gaming Board note, and accepted
     the risk; the entry names the fixed price, the house floor, the rollover across weeks, the payout-only fee and
     the sunset;
   - `maswali.licenceBasis = OWNER_RULING`, pointing at that entry, set by the Owner and audited;
   - the GLI change-management row added.
   - A Board disclosure letter is optional and is written only on Ali's word.
2. ☐ **Guarantee account funded** with TZS 2,000,000 (OD-02, ruled) through the Owner ceremony. The pools page shows
   it, and refuse-to-open was proven red in S3.
3. ☐ **Payout float funded:** the Selcom float covers the largest possible floor payout plus a buffer. Finance confirms in writing. The low-float alert is wired.
4. ☐ **Insider bar** verified against production's live staff list and desk designations (read-only counts). `HOUSE_PRODUCT_POLICY.MASWALI = "denied"` is live.
5. ☐ **Officer staffing:** a primary and a backup officer named for the weekend seal. `DEFAULT_GRANTS` checked on production for every Millionea control.

**Gate B, before rollout ACTIVE:**

6. ☐ **The classic-shell entry point** (OD-23) and the journey entry (home card plus the third Tiketi switch) are live behind the same rollout. They were shot at 320/360/768/1280 in sw, en and zh, and read one by one.
7. ☐ **Vodacom S16 baseline note:**
   - a dated COMPLIANCE-DECISIONS ruling amending S16 "in bounds" item 8 (OD-22): the five measures exclude MASWALI, and harm markers are reported for all players and for players without a ticket;
   - `journey-measures-dal.ts` filter live;
   - the launch date marked on the measures view;
   - VODACOM-PLAN §0 notified through the Vodacom lane, not edited by this lane.
8. ☐ **Tax treatment ruled (OD-08)** and the reconciling lines live. Otherwise the first no-winner week jams locking and filing of the **whole** book. Withholding tax on winnings confirmed by Finance/TRA (MB-77).
9. ☐ **RULES §5 step 6** verified on production (database and screen). Both PDFs regenerated and rasterised.
10. ☐ **Agent terms** version bumped per OD-20. Terms and Millionea rules versions effective at ACTIVE.
11. ☐ **Monitoring and runbook:** alerts proven, operator guide published, support scripts live.
12. ☐ **The S8 drive record** exists, and its numbers equal §5's formulas.
13. ☐ **Rollback is understood:**
    - the Owner switch to WITHDRAWN hides surfaces and never deletes tickets;
    - a sales pause never blocks settlement, refunds or withdrawals;
    - a product stop is the sunset.

### 6.2 Weekly runbook (all times EAT; week N, with N+1 overlapping)

| When | Who | What |
|---|---|---|
| **Wed (week N−1)** | Trading officer | Draft week N+1 from the template. AI candidates come from `EventCalendar` and the officer approves them. 15 questions on the criterion template, each with source and fallback, an event start in the source's zone, a void deadline (OD-09b), a probability and its source, and the OD-14 caps. Holiday review: 25 Dec 2026 and 1 Jan 2027 are Fridays |
| **Thu–Sat** | Second reader | EN/SW/ZH parity attestation (MB-79). Banned-topic and category screen |
| **Sun** | Trading + accounting | **Pre-open checklist:** 15/15 present; every event start ≥ Fri 18:00 + buffer; licence basis on record; guarantee ≥ requirement (Σ unsettled weeks); float OK. A week that is not ready **does not open**, never short, and the hub says so |
| **Mon 00:00** | Scheduler | Week opens. The question-set hash is published, `rulesSnapshot` frozen, and the headline is the funded floor or real money, "plus week N−1's carry-over once final" |
| **Mon–Fri** | Officer + watch | Sales. Fixture-drift watch daily (hourly on Friday). If an event moves earlier, move the close earlier (MR-5; OD-10 if sales already ran past it). Marketing only from approved wordings, to opted-in players |
| **Fri 17:00** | System | "Closes in 1 hour" to opted-in players (marketing gate) |
| **Fri 18:00** | Scheduler | **Close**, checked on the DB clock. Merkle root, count and sales stamped; hash time shown. Exposure meter (combinations covered ÷ 1,024). Cluster report to compliance |
| **Fri eve–Sun** | One officer (backup on call) | Seal each question with evidence as results land; the AI prepares evidence and a suggestion only. Voids by reason code; reserves sealed in order (all 15 by default). Alerts at +2h and +12h for anything unsealed. Settlement gate checklist on `/admin/maswali/[weekId]` |
| **Graded set final** | System | The objection window opens (OD-05; recommended 24h, never closing before 12:00 EAT). An upheld objection that changes the graded set restarts it once |
| **Mon/Tue** | Accounting officer | Settlement **preview**: S agrees three ways, the arithmetic, the guarantee in-transaction, the float. **Release** (OD-06). Credits, notices, register, rollover or payout. Week N+1's headline now includes the confirmed carry |
| **Tue 12:00** | Alert | "Unsettled by Tuesday" escalates to the Owner and compliance |
| **Nightly** | Lifecycle | Maswali invariants, column ↔ ledger reconciliation, `trialBalance()` |
| **Month end** | Finance | Tax report with the Millionea pill and reconciling lines; GBT pack with the liability note; period lock |

**Incident playbook** (operator guide):

| Incident | Response |
|---|---|
| Wrong question found before close | Void it on the OD-04 ground; the reserve applies |
| Fixture brought forward | Move the close, or OD-10 |
| Source outage | Use the fallback; by the deadline with no reading, VOID |
| Week doomed | Sales stop automatically; the void executes after its objection windows close |
| Guarantee short at settlement | Aborts; the Owner funds; release again |
| Float short | Finance tops up before release |
| Officer unavailable | The backup seals |
| Pause / stop | Pause and stop are distinct acts. A stop runs the sunset (OD-03) |

---

## §7 · The sessions — full work orders

### §7a · Branch and worktree strategy

**Worktree.** S0 created `C:\50pick-ssd\kipindi-maswali` (OMEGA-COMPILE01) on branch `maswali-plan`. Once S0 is merged,
the build reuses that worktree on a fresh branch:

```
git -C C:\50pick-ssd\kipindi-maswali fetch origin
git -C C:\50pick-ssd\kipindi-maswali switch -c maswali-build origin/main
cd C:\50pick-ssd\kipindi-maswali ; npm ci ; npx prisma generate
```

On another machine, create an equivalent SSD worktree off `origin/main` — a path is a fact about a machine (AGENTS.md
§10), never copy one from here. **Ali-Blade15 (since 2026-10-17):**
- **Worktree.** `git -C C:\kipindi-main worktree add -b maswali-build C:\kipindi-maswali origin/main`, then a real
  `npm ci` and `prisma generate` under `~/heavy-node-lock.sh`.
- **Never a `node_modules` junction.** Turbopack refuses one, and `npm ci` through one empties the other tree.
- **The lock.** Heavy jobs take that laptop's lock (one at a time: its RAM fails under parallel load). The throwaway
  PostgreSQL is `scripts/db-scratch.mts` (embedded, port 5433, override `KP_SCRATCH_PORT`).

- `TEMP=C:\50pick-ssd\tmp`.
- Copy the three MSVC DLLs into embedded-postgres `native/bin`.
- Give the lane its own ports. Check that they are free; the suggestion is `next dev` on 3410 and the throwaway PostgreSQL on 55440.
- Run one `next dev` in this worktree only.
- `F:` is never used for builds, tests or servers.

**Session start, every time:**

1. `hostname && pwd && git rev-parse --show-toplevel && git branch --show-current && git status --short`.
2. `git fetch origin`, then `git merge origin/main` into `maswali-build`. Rebase only if nothing has been pushed since the last merge.
3. Read NEXT-PLAN ▶ 0i, then §0.

**Commits:**
- Stage files by name only, never `git add -A` or `git add .`.
- Run `git branch --show-current` before every commit.
- Every commit subject starts `MASWALI-BUILD Sx:`.
- Commit a type together with its users.

**Pushes and merges:**
- Non-release sessions push only `maswali-build`.
- **Who merges (Ali, 2026-10-17):** *"any session that finishes, let it push … each session pushes whatever it finished, until the final session, who finishes everything, puts it live."* The session that finishes a green step merges `maswali-build` into `main` itself; the board records this beside its release-owner line. The release goes out per AGENTS.md §4: typecheck, `next build` at the exact commit, local `qa:live`, the deploy read-backs, and production `qa:live`. A docs-only push runs the doc guards and the read-back only (Ali's efficiency ruling, 2026-10-10).
- A money session also runs `test:all`, `e2e:money`, `e2e:fault` and `e2e:card` on a throwaway PostgreSQL first.
- Every push to `main` is a live deploy. Millionea is merged **dark**: the rollout ceiling is `WITHDRAWN` in code until S8.
- Small, frequent merges keep the diff against the Vodacom lane small.

**Migrations:**
- Hand-written, additive and re-runnable (`IF NOT EXISTS`).
- Applied with `prisma migrate deploy` on a throwaway PostgreSQL that holds production's exact migration set.
- `npm run verify:backup-schema` is run.
- They reach production only through the deploy. All are additive, so no zero-overlap cutover is expected.

**Coordinating with the Vodacom lane:**
- These files belong to the Vodacom lane, which is still active (S8 V2, S9–S13, the S14–S16 releases):
  - `market-service.ts` (bet path), `market-dal.ts`;
  - `i18n-dict.ts`, `active-tab.ts`, `journey-tabs.tsx`, `ticket-switch.tsx`;
  - `journey/home/*`, `/positions`, `surfaces.ts`, `feature-state.ts`;
  - `comms-registry.ts`, `journey-measures-dal.ts`.
- Rules for touching them:
  - S0.5's widening lands as **one integrator commit** before any other Millionea change to those files (MB-72).
  - After that, each touch is a small commit, merged in a window the release owner names on the board.
  - Rebase before every merge.
  - Never edit a file that has an unmerged Vodacom release in flight.
- `i18n-dict.ts`: one `millionea` namespace, appended as a single block in each locale.
- `house-bot-disclosure` §5.1 pins dictionaries and rulebooks byte-identical. Register any parity diffs in advance.

**Coordinating with the house-bots lane (HOUSE-BOTS-N3):**
- S0.5 adds `MASWALI: "denied"` to `HOUSE_PRODUCT_POLICY`. Widening `ProductLine` turns its `satisfies Record<ProductLine, …>` into a compile error, which is the intended trigger.
- MASWALI stays out of `INTENT_PRODUCT_LINES` and `TARGET_PRODUCT_LINES`.
- `scopeAlerts` returns early for MASWALI, so no daily `PRODUCT_DENIED` false alarm.
- Every new context comparison sits under a `SEAM:` marker (`test:house-bot-seam`).
- Tell the house-bots lane on the board before S0.5 merges.

**Heavy jobs:**
- Take the `F:/kipindi-locks/heavy-node.lock` mkdir mutex.
- Queue with a single `heavy-node.wait` note.
- Release the lock only if you took it.
- While waiting, follow the `keep-working-while-waiting` skill.

**Production:**
- Read-only proxy only (`default_transaction_read_only=on`), printing counts and names only.
- Never point a destructive drive at production.
- QA sign-ins on production need Ali's authorization each time.

---

### §7b · The sessions

**Gates for every session (§4):**
- `npx tsc --noEmit`;
- the session's own `test:maswali-*` suites and their red twins;
- `test:product-line`, `test:i18n`, `test:labels`, `test:docs`, `test:maswali-plan`;
- the suites derived from the diff (grep `scripts/` for every changed path);
- `test:all` at session close, and before the push for a money session (Ali's efficiency ruling, 2026-10-10);
- for UI work, the design suites in S5;
- for money work, AGENTS.md §4's money list.

New suites join `test:all` on their own. `predeploy` is a hand-written list in `package.json`, so a new money suite must
be added to it by hand.

**Corrections of 2026-10-17** (the code map made before the build started). Where these and a session's text below
differ, these win.

- **S0.5 · the fence is wider than its list.**
  - *The DAL first.* On PostgreSQL, `market-dal.ts` reads every non-UPDOWN value as MARKET:
    - `storedLine` :126 and `toStoredMarket` :192;
    - memory `bookByIds` :790; Postgres `attribution` :1260 and `bookByIds` :1338;
    - the leaderboard buckets :901 and SQL :1523, which become `= 'MARKET'`.

    No door check fires on PostgreSQL until the DAL passes MASWALI through. NULL keeps reading as MARKET, MASWALI reads
    as MASWALI, and an unknown value raises an alarm without throwing at boot.
  - *More sites to make exhaustive:*
    - market-service :812, :874, :951, :1005, :1790, :2061, :4127 and :4309;
    - `/live` (`page.tsx:169`, `pulse-grid.tsx:231`) and `/markets/[id]` :202;
    - `journey-sheet.ts:142`, `journey-card.tsx`, `card-face.ts`, `estimate.ts`;
    - the deposit `return-choice` route and `notification-service.ts:668`;
    - `/admin/house` (both pages) and `/admin/markets/[id]`;
    - `tax-report-data.ts:506`, `short-title-service.ts`, `position-permalink.ts`, `results/archive.ts`.
  - *Hand-written two-value types widen on purpose:* `LabelProductLine` (with no default), `PositionProductLine`,
    `GameLine`, `PRODUCT_IDS` and tax `ProductFilter`. Three stay without MASWALI: `IntentProductLine`,
    `INTENT_PRODUCT_LINES` and `TARGET_PRODUCT_LINES`. The DB CHECKs and `test:house-bot-migrations` pin them.
  - *More doors:*
    - `settleMarketAction`, `holdSettlementAction` and `recheckMarketNowAction`;
    - `setMarketShortTitlesAction`;
    - the settlement queue reads `listSettlementQueue` and `getSettlementHealth`, through `pending("ALL")`.
  - *Three smaller fixes:*
    - `chargedFee` (`payout.ts:565`) has no product input, so the guard goes at its callers or through a new parameter.
    - `scopeAlerts` lives in `house-bot/trigger.ts:406`. It must skip a line whose policy is `"denied"`, so there is no
      daily false `PRODUCT_DENIED`.
    - `test:product-line` B8 asserts the coercion. It is rewritten, and the suite gains a red twin.
  - *A census guard* lists every productLine read and classifies it: a door that refuses, an ALL-read with its
    MASWALI handling, a MARKET-default read, or a widened type. An unlisted site fails. The red twin runs on **both**
    stores (`runTwoStores`, db-scratch).
- **S1.**
  - *The rollout lives in its own module,* `src/lib/millionea-rollout.ts`, which imports only `RolloutState` and
    `lowerRollout`. It stays out of `feature-state.ts`, because the Vodacom S15 flip edits that file.
  - *STAFF_PREVIEW gets its own audience.* It means staff sessions plus holders of a Millionea preview pass, built like
    `journey-preview.ts` and working in **both** shells. The journey's `kp_preview` forces the journey shell, and
    the S8 drive needs non-staff QA players.
  - *`/api/health` gains a Millionea rollout field.* A `qa:live` "dark" section, in its own module with one call
    line, proves on production that `/millionea*` 404s and that no card, More row or notice shows while below the
    rollout. A local control shows them.
  - *The `/legal/terms` sentence and the TERMS_VERSION move are deferred* to S8's launch commit (OD-18: existing
    terms do not change). The binding text is `/legal/rules/millionea`, with its own version and hash.
  - *Optional:* a `NOT VALID` → `VALIDATE` CHECK on `PredictionMarket.productLine`.
- **S1 · as built (2026-10-17), decided under Ali's delegation.** Where these differ from S1's work order, these win.
  - *No `productLine` CHECK.* The house-bot suites plant an unknown line on purpose, to prove a denied product is
    refused; `storedProductLine`'s alarm is the guard for a corrupt row.
  - *`MaswaliCycle.marketId` and `rulesSnapshot` are NULL while DRAFT.* The open creates the market, because a draft
    market row would sit in the poll moderation lists, and stamps the rules once. The database refuses any week past
    DRAFT without both (`MaswaliCycle_market_after_draft_check`, `…_frozen_after_draft_check`).
  - *`parityAttestedBy` / `parityAttestedAt` on the week* hold MB-79's second reader. Any draft edit clears them, and
    the open refuses without them.
  - *The fee has one home per week:* `jackpotFeeRate` freezes into the market's `feeSnapshot` beside the levies; the
    rules snapshot does not copy it.
  - *The guarantee is committed, not owed:* the owner's book subtracts `HOUSE:MASWALI_GUARANTEE` from free cash on its
    own line beside the jackpot liability, and neither counts as retained earnings. `/admin/house`'s derivation table
    also gained the `HOUSE:TAX` line it was already subtracting (a platform-wide fix).
  - *STAFF_PREVIEW is staff sessions only until S4.* The preview pass for non-staff QA players is a cookie, so it
    ships with the route that writes it and its privacy-notice sentence (`test:privacy-notice` §4), not ahead of them.
  - *Player-facing statements move to S5:* `/legal/rules/millionea`, the chooser, the chat assistant's block and
    `/help` land with the screens. No player can see Millionea before S5's staff preview, and the binding text must
    describe the engine as built (S2, S3), not as intended. The `/admin/config` caption lands with S4's console.
  - *The licence gate's suite* folds into `test:maswali-config` §5 (the gate) and S2's engine suite (the open refused
    without it); there is no separate `test:maswali-licence-gate`.
  - *The nine refusal reasons move to S3, with the buy path that emits them.* `test:failure-reasons` 9d refuses a
    reason nothing emits (E-232: copy in three languages no player can see). Their drafted copy (en/sw/zh, the
    `ticketCap` figure) is kept on branch `maswali-s3-reasons` for S3 to land beside its emitter.
  - *Carried to S6:* the house book's per-game identity must count the rollover and top-up legs before a winning week
    settles on production, or it reports a variance on a correct week; and `purge-protected.ts` must classify the three
    Millionea tables.
- **S3.**
  - *The Millionea slip travels as a `BuyOpts` field,* not as a third `BetContext.kind`. `ctx.kind` means who is
    betting, and the house-bots lane pins every comparison (`SEAM_SITES`). Millionea gets its own `MASWALI:` markers,
    its own guard, and a test that MARKET and UPDOWN output is unchanged.
  - *Every Yes/No notice is muted on every Millionea path:* `settleMarket`'s VOID arm, which a week void uses, and
    the cancel. Muting them is S3's job; S6 adds Millionea's own notices.
  - *The cancel is a real one-transaction write that fails loudly.* Today `cashOutPosition` writes outside
    `withMoneyTx`, and its ledger write is fire-and-forget.
  - *OD-17's loss limit:* `sumGamblingNetSince` (`prisma-dal.ts:2727`, and its memory twin) drops `BET_PAYOUT`
    rows on MASWALI positions.
  - *S3 releases on its own,* with the full money battery.
- **D3.** The rulings are all in hand, so D3 is the filing. N1 is filed as *"yes, if it measures"*. It is measured at
  S5's acceptance and on a real phone at S8, and if it fails its drawn fallback ships. The values (glyphs, status rows,
  the N-block) land in S5 with their first consumer, as `test:dead-css` requires.
- **S5.**
  - *The home card is a server component,* placed between the head and the chips (O-7). `home-lazy.tsx` and its
    `HT_PARTS` pin are untouched; only `test:journey-home` 7.order is re-pinned.
  - *The slip does not join `MONEY_ROUTE`.* `test:journey-shell` §2 pins that line VERBATIM, and changing it would hide
    the Needle platform-wide. A narrow predicate covers the slip and the confirm sheet (D-25).
  - *After each dark merge,* trial-merge the parked S15 candidate (`git merge-tree`) and tell the Vodacom lane about
    any conflict.
- **S6 before any production settlement.** `chargedFee` throws on MASWALI by design, so the tax report and the
  statutory pack learn the product before the S8 drive week settles.
- **Laptop capacity (Ali-Blade15).**
  - `test:all` runs in chunks well under 3 hours each, with `--jobs` 2–3, because the lock's 3-hour takeover would
    otherwise put two heavy jobs on failing RAM.
  - The database suites run one at a time on this lane's own `KP_SCRATCH_PORT`.
  - `embedded-postgres` is installed with `--no-save`, and `npm ci` removes it again.
  - `.env.qa.local` is needed before any signed-in QA.

#### S0 · Rulings recorded; plan, board, pointers, guard, R2 commission filed (documentation only)

**Goal:** turn the 2026-10-16 rulings into the record, and leave one door a cold session can resume from.

**Inputs:** the PDF; Ali's seventeen R-rulings and the accepted decision batch; the rulebook, register, design
concept, Claude Design prompt and session plan produced by the 2026-10-16 analysis.

**Work items (all written 2026-10-16 on branch `maswali-plan`):**

1. **`COMPLIANCE-DECISIONS.md`**, newest first: § "2026-10-16 · Maswali Millionea — the management-reviewed proposal of
   2026-10-16 is final; every 2026-08-29 Maswali ruling is void (owner)" — Ali's words verbatim, every R-ruling, the
   accepted batch, what does NOT change, accepted consequences, ⛔ do not restore. The two 2026-08-29 Maswali entries
   are marked in place with a pointer.
2. **This file**, `docs/MASWALI-PLAN.md`.
3. **Records:** a RECORD banner naming AGENTS.md and this file on `SESSION-PROMPT-MASWALI-BUILD.md`,
   `MASWALI-MILLIONEA-IMPLEMENTATION.md` and `SESSION-PROMPT-MASWALI-DESIGN.md`. They are not renamed or rewritten.
4. **Board and index:** NEXT-PLAN ▶ 0i, the old §2 Maswali row struck with a pointer; `docs/README.md` rows; one
   pointer in AGENTS.md §2 (no rate, count, date or status).
5. **The R2 commission folder** `docs/design-brief/maswali-2026-10/` — BRIEF, PROMPT.txt, ATTACHMENTS, PREDICTED-OUTPUT,
   RECEIVING (§10).
6. **The guard:** `scripts/maswali-plan.test.mts`, with `test:maswali-plan` and `red:maswali-plan` in `package.json`.

**Not done, deliberately:** no rename of `/maswali` in the August records (they are records); no Gaming Board
disclosure letter (Ali chose his own dated ruling as the licence basis — a letter stays available on his word).

**Suites:** `test:maswali-plan`, `red:maswali-plan`, `test:agent-rules`, `test:docs`, `test:design-one-door`.

**Acceptance:** the five suites are green; the diff touches only `docs/**`, one line of AGENTS.md, the guard and two
`package.json` keys; the COMPLIANCE entry quotes Ali verbatim.

**Closes:** MB-99 (corrections folded into §3), MB-54 (the journey deviation filed), MB-70 (the binding-text inventory).

#### S0.5 · Fence the third product line (no MASWALI row may exist yet)

**Goal:** no generic door or read can treat a MASWALI row as a Yes/No poll. Behaviour for MARKET and UPDOWN is unchanged.

**Inputs:** S0 ✅. A merge window agreed with the Vodacom and house-bots lanes.

**Work items:**

1. **The type:** `ProductLine = "MARKET" | "UPDOWN" | "MASWALI"` (market-service.ts).
2. **`src/lib/product-line.ts`** (new, isomorphic): `isKnownProductLine`, `assertNeverLine`, and a `switchLine()` helper with an unreachable default.
3. **`market-dal.ts`:**
   - `storedLine()`, `toStoredMarket()` and the three other `!== "UPDOWN" → "MARKET"` coercions pass known lines through and alarm on unknown ones (never throw at boot).
   - The active-player SQL `<> 'UPDOWN'` becomes `= 'MARKET'` where it means polls.
4. **The 20 ternary sites in 13 files** become exhaustive switches. The files: `positions/performance`, `positions/[positionId]`, `results/page`, `results/results-bar`, `house-bot/{alert-copy,decide,enter-now,fire,planner,trigger}`, `market-dal`, `market-service` (×2), `report-money`.
5. **`market-scheduler.ts` `nextDeadlineFor`:** return `null` unless `productLine === "MARKET"`.
6. **Doors that refuse MASWALI** unless called from `maswali-service` with a `SEAM:`-marked context:
   - `resolveMarket`, `resolveDueMarket` and the sentinel;
   - `emergencyVoidMarket`. A whole week is voided by its own control (S4);
   - `adminReopenMarket`;
   - `cashOutPosition`'s paid exit;
   - `buyPositionAction` (markets/actions.ts) without picks;
   - `/admin/markets/[id]` and `/admin/resolver/[id]` (read-only notice "managed in /admin/maswali").
7. **`settleMarket`:** refuses MASWALI unless `resolvedOutcome === "VOID"` (MR-18's arm). `chargedFee()` throws on MASWALI until S6 teaches it the model.
8. **`side-label.ts`:** `LabelProductLine` gains `"MASWALI"`, with no default.
9. **`house-bot/constants.ts`:** `MASWALI: "denied"`; `scopeAlerts` returns early.
10. **`tax-report.ts`:** `ProductFilter` gains `"MASWALI"`, hidden in the UI until S6. The DB CHECK migration is in S1.

**Suites:**
- `test:maswali-fence`, and `red:maswali-fence`, which plants a MASWALI row in the memory store, drives every door and every `"ALL"` read, and expects a refusal or a MASWALI-labelled row each time. It must never see MARKET.
- `test:product-line` extended: `"ALL"` keeps MASWALI uncoerced, and a money or regulator read without `"ALL"` fails.
- Also: `test:house-bot-seam`, the house-bot suites, `test:tax-report`, `test:labels`, `test:all`.
- Classic parity against live `main` with zero differences.

**Acceptance:**
- tsc is green.
- The planted row is refused at every listed door and never read back as MARKET.
- Parity shows zero differences.
- Merged by the release owner as one integrator commit.

**Closes:** MB-01, MB-42, MB-72, and the classification half of MB-90.

#### S1 · Law, config, accounts, schema, rollout switch (no behaviour)

**Goal:** the law, the frozen-rates machinery, the ledger accounts, the tables and the switch exist. Nothing sells yet.

**Inputs:** S0.5 ✅. OD-02, 03, 04, 05, 09b, 15, 18, 19, 20 and 26 ruled.

**Work items:**

1. **The RULES §5 ceremony, in one commit:**
   - **RULES.md §1:** new rows for the Millionea ticket price, fee model, floor, rollover and cap.
   - **New §2.12** "Maswali Millionea — fixed ticket, weekly jackpot, fee at payout", with decided, enforced, configured and stated subsections. It covers:
     - J = max(floor, R+S), with the floor counted before the fee;
     - F = 13% of J, taken only when k ≥ 1;
     - levies of F;
     - an equal floored share per ticket, with dust carried (OD-19);
     - the top-up taken only when k ≥ 1 and never rolled;
     - rollover of real money only, no cap;
     - the sunset (OD-03);
     - the winner floor does not apply (Invariant-1 exemption, OD-19).
   - **§2.4:** cap exception, 10 per account per week.
   - **§2.8:** "Nothing else" extended to Millionea (the fee at payout plus the withdrawal fee).
   - **§3:** "THE THREE FEE MODELS", adding `jackpot-payout`.
   - **§6:** history row.
   - Code, config and every stated surface change in the same commit:
     - `/legal/terms`: a new Millionea section in 3 locales, with a version stamp that is effective only at rollout ACTIVE (OD-18);
     - `/legal/rules/millionea/page.tsx` and `_content-millionea.tsx`;
     - the chooser's `CARDS` and `INTRO` say three products;
     - `_actions/chat.ts`: Yes/No and Up & Down statements scoped, and a Millionea block filled from config (MB-71);
     - `/help`;
     - the `/admin/config` caption.
   - Player surfaces render the legal pages only when rollout ≥ STAFF_PREVIEW.
2. **`payout.ts`:**
   - `FeeModel` gains `"jackpot-payout"`.
   - `readRates` **refuses** an unknown model instead of coercing it.
   - `describeFeeModel` caption is at most 17 characters ("{pct} at payout"), checked by `test:fee-model-caption`.
   - `poolFee` and `allocateWinnerPayouts` are untouched.
3. **`ledger.ts`:**
   - `acct.maswaliJackpot = "HOUSE:MASWALI_JACKPOT"`.
   - `acct.maswaliGuarantee = "HOUSE:MASWALI_GUARANTEE"`.
   - The owner-capital counterparty: reuse the existing external account if `acct` has one, otherwise add `EXTERNAL:OWNER_CAPITAL`.
   - Entry builders: `maswaliSettlementEntries`, `maswaliRolloverEntries`, `maswaliGuaranteeFundEntries`, `maswaliGuaranteeReturnEntries`, `maswaliForfeitReturnEntries`, `maswaliSunsetEntries`. Stakes reuse `stakeEntries`; refunds reuse `refundEntries`.
4. **`src/lib/server/maswali-config.ts`** via `defineConfig`, key `maswali.config`, validated and audited:

   | Key | Default | Note |
   |---|---|---|
   | `ticketPriceTzs` | 1000 | |
   | `floorTzs` | 1,000,000 | |
   | `jackpotFeeRate` | 0.13 | |
   | `ticketCapPerWeek` | 10 | |
   | `openTemplate` | Mon 00:00 Africa/Dar_es_Salaam | |
   | `closeTemplate` | Fri 18:00 | |
   | `minLockBufferMinutes` | OD-15 | |
   | `voidDeadlineHours` | OD-09b | |
   | `finalDeadlineTemplate` | Mon 23:59 of the results week | |
   | `objectionWindowHours` and `objectionNotBeforeLocal` | OD-05 | Millionea's own, frozen per week |
   | `questionCaps` | OD-14 | |
   | `guaranteeReservePolicy` | OD-02 | |
   | `paidExitWindowMinutes` | 0 | |

   - TRA and GBT rates come from global config and freeze into `feeSnapshot`.
   - A separate Owner-only key, `maswali.licenceBasis` = `{kind: "NONE" | "GBT_WRITTEN" | "OWNER_RULING", ref, recordedAt, recordedBy}`.
   - ⛔ All of these freeze into `rulesSnapshot` when a week opens. `/admin/config` says "applies from the next week" (MB-75).
5. **Rollout switch (`feature-state.ts`):**
   - `MILLIONEA_SHIPPED: RolloutState = "WITHDRAWN"`.
   - `millioneaCeiling()` reads env `FEATURE_MILLIONEA` (exact words only).
   - `server/millionea-switch.ts` holds the Owner's stored switch. The effective state is `lowerRollout(ceiling, switch)`, which is the journey's pattern.
   - This switch controls visibility. The sales pause is a separate act (S4).
6. **`prisma/schema.prisma` and migrations** (hand-written, additive):
   - `2026101x…_maswali_tables`: the three models below, `Objection.questionOrdinal Int?` (values 1..15), the Objection remedy gains `REINSTATE`, and a partial unique index `(marketId, questionOrdinal, userId)` for MASWALI rows only. The existing one-per-player-per-market rule stays for other products.
   - `…_maswali_ledger_types`: `ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS` for `MASWALI_ROLLOVER_OUT`, `MASWALI_ROLLOVER_IN`, `MASWALI_TOPUP`, `MASWALI_GUARANTEE_FUND`, `MASWALI_GUARANTEE_RETURN`, `MASWALI_FORFEIT_RETURN`, `MASWALI_SUNSET`. ⛔ This goes in its own migration file: a new enum value cannot be used in the transaction that adds it.
   - `…_maswali_tax_product`: the `TaxPeriodLock` CHECK widened to `MASWALI`. The `HouseBotIntent` CHECKs are unchanged.

```prisma
model MaswaliCycle {                       // "week"; product tables never hold money
  id String @id @default(cuid())
  marketId String @unique                  // the PredictionMarket (productLine "MASWALI") whose POOL holds S
  code String @unique                      // "MLN-2026-W44" from eat-day.ts, immutable
  seq Int @unique                          // chain order; settlement strictly by seq
  visibility String @default("PUBLIC")     // PUBLIC | DRIVE (OD-21)
  state String                             // DRAFT|OPEN|CLOSED|RESOLVING|SETTLED|VOIDED
  opensAt DateTime; closesAt DateTime      // closesAt mirrors market.selectionClosedAt
  finalDeadlineAt DateTime
  closedAt DateTime?                       // stamped once
  rulesSnapshot Json                       // ⛔ write-once at open; absent from CYCLE_PATCHABLE
  questionSetHash String?                  // at open
  ticketMerkleRoot String?; ticketCount Int @default(0); salesAtClose Decimal? @db.Decimal(18,2)
  gradedSetFinalAt DateTime?; objectionsCloseAt DateTime?; objectionRestarted Boolean @default(false)
  rolloverIn Decimal? @db.Decimal(18,2)    // stamped once at settlement (WHERE rolloverIn IS NULL)
  jackpot Decimal? @db.Decimal(18,2); fee Decimal? @db.Decimal(18,2)
  traLevy Decimal? @db.Decimal(18,2); gbtLevy Decimal? @db.Decimal(18,2)
  topUp Decimal? @db.Decimal(18,2); winningTickets Int?; sharePerTicket Decimal? @db.Decimal(18,2)
  paidTotal Decimal? @db.Decimal(18,2); carryOut Decimal? @db.Decimal(18,2); dustCarried Decimal? @db.Decimal(18,2)
  settlementGroupId String? @unique; settledAt DateTime?; releasedBy String?
  isFinal Boolean @default(false)          // sunset week
  createdBy String; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt
  questions MaswaliQuestion[]
  @@index([state, closesAt])
}  // + SQL partial unique: ONE state='OPEN' row per visibility. ⛔ no "one CLOSED-unsettled" index (MB-16)

model MaswaliQuestion {
  id String @id @default(cuid())
  cycleId String; cycle MaswaliCycle @relation(fields:[cycleId], references:[id], onDelete: Restrict)
  role String                              // MAIN | RESERVE
  ordinal Int                              // MAIN 1..10, RESERVE 1..5 (reserve order)
  slot Int                                 // canonical 1..15 (M1..M10 = 1..10, R1..R5 = 11..15)
  category String                          // ∈ MARKET_CATEGORIES; never politics
  textEn String; textSw String; textZh String
  criterionEn String @db.Text; criterionSw String @db.Text; criterionZh String @db.Text
  sourceUrl String; sourceDomain String; fallbackSourceUrl String?; fallbackSourceDomain String?
  readingTolerance String?; eventKind String  // SPORT|PRICE|WEATHER|ANNOUNCEMENT
  eventStartsAt DateTime; eventZone String    // IANA zone the officer typed in
  observedStartsAt DateTime?                  // fixture-drift watch
  voidDeadlineAt DateTime
  probabilityEstimate Decimal? @db.Decimal(5,4); probabilitySource String?
  linkedMarketId String?
  outcome String?                          // YES | NO | VOID
  voidReason String?                       // code from maswali-void-reason.ts
  evidence String? @db.Text; evidenceCaptureRef String?
  sealedBy String?; sealedAt DateTime?
  twoOfficerAtStage1 Boolean?              // the platform flag's value when stage 1 began (MB-82)
  stage2By String?; stage2At DateTime?
  aiSuggestion Json?                       // evidence + suggested outcome; never seals
  @@unique([cycleId, slot]); @@unique([cycleId, role, ordinal])
}

model MaswaliTicket {
  id String @id @default(cuid())
  positionId String @unique; cycleId String; userId String
  serial String @unique                    // minted at payment
  selections Json                          // 15 canonical slots → "YES"|"NO"; read only via canonicalSelections()
  salt String                              // 128-bit, owner-only
  selectionsHash String                    // SHA-256(cycleId|ticketId|salt|canonical) — leaf of the Merkle tree
  picksKey String                          // SHA-256(canonical) — server-only, idempotent-replay compare
  status String                            // LIVE | CANCELLED | SETTLED
  cancelledAt DateTime?; closeAtPurchase DateTime; rulesVersion String
  score Int?; won Boolean?; payout Decimal? @db.Decimal(18,2)
  frozenReason String?; lastViewedAt DateTime?
  createdAt DateTime @default(now())
  @@index([cycleId, userId, status]); @@index([cycleId, score]); @@index([userId, createdAt])
}
```

7. **`src/lib/failure-reasons.ts`**, in en, sw and zh. Each states a reason and a next step:
   - `millionea_cap_reached`
   - `millionea_bonus_refused`
   - `millionea_sales_closed`
   - `millionea_staff_barred`
   - `millionea_account_ineligible` (the neutral desk wording, D19)
   - `millionea_picks_incomplete`
   - `millionea_week_not_open`
   - `millionea_paused`
   - `millionea_not_available` (the licence gate or WITHDRAWN)
   - `idempotency_key_conflict` (reuse it if it already exists)

**Suites:**
- New: `test:maswali-law` (RULES rows and §3 say three models; terms, chat and help are scoped; caption fits) with `red:maswali-law`; `test:maswali-config` (validation; snapshot shape); `test:maswali-rollout` (three states and lower-of); `test:maswali-licence-gate` with red (an open is refused while the basis is NONE; positive control with a basis recorded).
- Also: `test:rate-copy`, `test:fee-model`, `test:fee-model-caption`, `test:money-invariants`, `test:loser-share-fee`, `test:levy-allocation`, `test:failure-reasons`, `test:i18n`, `test:terms-cancellation`, `test:docs`.

**Acceptance:**
- All three migrations apply and re-apply cleanly on a throwaway PostgreSQL that holds production's migration set.
- `verify:backup-schema` is green.
- The null-aware `ledgerGroupAccountSum` reads 0 for both new accounts.
- `trialBalance()` is clean.
- The rollout reads WITHDRAWN in code, env and switch.

**Closes:** MB-03 (account, type, gate), MB-05, MB-10 (recorded), MB-17 (schema half), MB-23 (column), MB-39 (code gate), MB-49 (reasons), MB-69 (law text), MB-71, MB-75.

#### D1 · Design round R2: the commission cut live and sent (after S0 ✅; runs alongside S0.5–S4)

**Goal:** Claude Design receives the R2 commission for "Daftari na Muhuri" while the engine is built, because the
design round trip is the long pole.

**Why it does not wait for S1.** The prompt is an outbound commission and must be self-contained: Claude Design cannot
read this repository, so `PROMPT.txt` states the rules and the figures it may draw. Once sent it is a record. RULES
§2.12 (S1) remains the law; if S1 changes any figure, a round-3 delta prompt carries the change.

**Work items** (the full procedure is
[`design-brief/maswali-2026-10/ATTACHMENTS.md`](design-brief/maswali-2026-10/ATTACHMENTS.md)):
1. Assemble the package OUTSIDE the checkout from live files at `origin/main` (a copy of DESIGN_AUTHORITY inside the
   repository turns `test:design-one-door` red). Run the package self-checks.
2. Fill `{FULL_SHA}` and `{YYYY-MM-DD}` in `PROMPT.txt` and `STAMP.txt`; capture the `06-frames` from a local server at
   that commit (QA personas only; never committed).
3. Ali opens Claude Design, starts a new project, uploads the zip, pastes all of `PROMPT.txt`, sends.
4. Record the send date and the stamp in §0; set D1 ✅ citing the commit that records it.

**Acceptance:** the self-checks pass; Ali confirms the send; §0 carries the stamp.

#### S2 · Week engine (no money, no UI)

**Goal:** the week lifecycle, the close guard, grading with reserves, the commitment and the pure arithmetic are complete and proven in the memory store.

**Inputs:** S1 ✅. OD-04, 09, 09b, 10, 14, 15 and 19 ruled.

**Work items:**

1. **`src/lib/maswali-score.ts`** (pure, isomorphic, no Prisma, no `server-only`, no config):
   - `grade(questions, picks)`;
   - `weekVoidCertain(questions)`;
   - `settlementGate(questions)`;
   - `displayMap(questions)`, built only from the final record;
   - `sunsetScore(...)`.

   These are §4 of this plan. The slip preview, the ticket page and settlement all import this one module.
2. **`src/lib/maswali-money.ts`** (pure): `settleArithmetic({R, S, k, floor, feeRate, rates})` returns `{J, F, TRA, GBT, net, share, U, carryOut, dust}`. It calls `levySplit` once. It also exports `guaranteeRequirement(unsettledWeeks)` (OD-02).
3. **`src/lib/maswali-commitment.ts`** (isomorphic):
   - `newSalt()` (128-bit), `leafHash`, `merkleRoot(leaves sorted by ticket id)`, `inclusionProof`, `verifyInclusion`.
   - `questionSetHash` over the frozen 15 rows, including role, ordinal and reserve order.
4. **`src/lib/maswali-void-reason.ts`:** a closed list of codes per OD-04. Its shape copies `updown-refund-reason.ts`.
5. **`src/lib/maswali-week-label.ts`:** week and ticket state words, which reach the screen only through the dictionary.
6. **`src/lib/server/maswali-dal.ts`:** Prisma and in-memory stores.
   - `CYCLE_PATCHABLE` and `QUESTION_PATCHABLE` allowlists in both stores. `patch` throws `'<k>' is not a patchable column`.
   - After DRAFT, these are absent from the allowlist: text ×3, criterion ×3, source and fallback, role, ordinal, slot, `eventStartsAt`, `eventZone`, `voidDeadlineAt`, `rulesSnapshot`, `questionSetHash`, `ticketMerkleRoot`.
   - `closesAt` is patchable only through `moveClose`.
7. **`src/lib/server/maswali-service.ts`:**
   - `createWeek` (DRAFT, from a template) and `editDraft`.
   - `attestParity` (a second reader confirms EN/SW/ZH; MB-79).
   - `openWeek`, which refuses unless all of these hold:
     - 10 MAIN plus 5 RESERVE;
     - every category in `MARKET_CATEGORIES`, plus the banned-topic screen over EN and SW;
     - `isSourceTrusted` on source and fallback, with the host frozen;
     - all three locales non-empty;
     - `closesAt ≤ min(eventStartsAt) − minLockBufferMinutes` and `closesAt > now`;
     - every `voidDeadlineAt ≤ finalDeadlineAt` and every deadline at most 7 days after open;
     - the OD-14 caps, with no same-event or dependent pairs;
     - the licence gate;
     - the guarantee requirement, through an interface S3 implements.

     Then it stamps `rulesSnapshot` (write-once) and `questionSetHash`, and calls `createMarket({productLine: "MASWALI", rateOverrides: {feeModel: "jackpot-payout", paidExitWindowMinutes: 0}, resolutionMode: "human"})`.
   - `moveClose` (MB-28):
     - earlier: only to at least now + 5 minutes + grace;
     - later: only up to the earliest event start minus the buffer;
     - never once the close has passed;
     - re-runs the 15-question check, audits, and notifies holders (the emitter is wired in S6).
   - `closeWeek`: exactly once. Stamps `closedAt`, `ticketCount`, `salesAtClose` and the Merkle root, and moves the state to CLOSED, then RESOLVING.
   - `sealQuestion(officerId, slot, outcome, evidence, voidReason?)`:
     - one officer;
     - if `getRequireTwoOfficerResolution()` is true at stage 1, `twoOfficerGate` applies to that seal;
     - refuses an officer who holds a ticket in that week;
     - an AI suggestion is stored, never applied.
   - `correctSeal` (OD-09): allowed inside the window; restarts it.
   - `proposeVoidAtDeadline`: the system proposes, an officer seals.
   - `recomputeGate`: re-run on every seal, void or objection.
   - `voidWeek`: stamp the market VOIDED with outcome VOID and `objectionsClosedAt = now`, then `settleMarket(id, {actorId: "system_maswali"})`, which is the existing VOID arm. It runs only after the objection windows of the triggering voids have closed. A pre-close void that dooms the week stops sales immediately.
   - `claimCarry(weekId)`: under a `maswali:chain` lock. Stamps `rolloverIn` once (`WHERE rolloverIn IS NULL`). Settlement is strictly by `seq`.
8. **`src/lib/server/maswali-scheduler.ts`:**
   - One timer per non-terminal week (open, close, void-deadline proposals, objection close).
   - `reconcileMaswaliWeeks`, every 5 minutes from `lifecycle.ts` in its own try/catch.
   - `healMaswaliWeeks`, every tick.
   - `hydrateMaswaliOnBoot` in `instrumentation.ts`, as a third independent block.
   - All schedule maths goes through `eat-day.ts`. Times are compared in UTC.

**Suites:**
- `test:maswali-score`: 11 voided-main counts × 32 reserve-void patterns = 352 cases, plus late reserve voids and display-map stability.
- `test:maswali-money`: R ∈ {0, 500k, 2M}, S ∈ {0, 300k, 1.2M}, k ∈ {0, 1, 3, 7, 870, 1,000, 1,400}. Asserts the identities `R+S+U = F+k·share+carryOut`, `F = TRA+GBT+net`, and U = 0 when k = 0.
- `test:maswali-commitment`: proofs verify, and a plant brute-forcing an unsalted hash is caught.
- `test:maswali-engine` (≥80 assertions):
  - lifecycle; the close guard (an event at 17:59 is refused); MR-5;
  - freeze in both stores; the write-once snapshot; exactly-once close;
  - the chain order; one OPEN week; the EAT-midnight boundary;
  - the 25 Oct and 1 Nov clock changes; a Friday 25 Dec close.
- `red:maswali-engine`: freeze removed; close guard off by one minute; void reserve not skipped; double close; seal after settle.
- `red:maswali-money`.

**Acceptance:** in the memory store, a week runs open → 15 seals → gate → arithmetic for every table row in §5, exact to the shilling. The 352-case table is green. Every frozen-column patch throws in both stores.

**Closes:** MB-02 (module), MB-09, MB-14, MB-15 (logic), MB-16, MB-17, MB-18, MB-19, MB-20, MB-22, MB-25 (pure), MB-26, MB-28, MB-29, MB-30 (compare), MB-32 (lib), MB-59 (locales), MB-79, MB-80, MB-83.

#### S3 · Money path (local and throwaway PostgreSQL)

**Goal:** buying, cancelling, settlement, rollover, top-up, refunds, forfeits and sunset move real ledger money correctly in both stores.

**Inputs:** S2 ✅. OD-02, 06, 07, 12, 16, 17 and 27 ruled.

**Work items:**

1. **`purchaseMaswaliTickets(userId, weekId, slips[], idempotencyKey)`** in `maswali-service.ts`:
   - Validates 15 picks per slip and the rollout state, then delegates to `buyPosition` with `ctx = {kind: "maswali", weekId, slips}`, marked `SEAM:`.
   - In `buyPositionInner`, inside `wallet:${userId}` and the existing `withMoneyTx`:
     - the insider check (the 7 `STAFF_ROLES`, live desk designations, QA markers on PUBLIC weeks per OD-12);
     - the close check against the **DB clock**;
     - the cap: count LIVE tickets for this account and week from `mine`; refuse at 10;
     - bonus refused **before** the real/bonus split;
     - N tickets in one admission slot, one lock and one group (MB-31);
     - picks-hash replay compared with `picksKey`, else `idempotency_key_conflict`;
     - ticket rows with salt and `selectionsHash`;
     - the Position description "Millionea ticket · {week}";
     - `potentialPayout` null;
     - suppressed: the poll receipt email and notice, the house trigger, wagering accrual (OD-27), and `onRecruitBet` / first bet (OD-20).
   - Every RG gate fires unchanged: rate limit, maintenance, `isLockedOut`, session limit, account status, wallet freeze, `checkLossLimit`.
   - The saved deposit bet from S9 is refused for MASWALI, never placed automatically.
2. **`stakeBoundsForMarket`:** a MASWALI arm with min = max = the snapshot price.
3. **`cashOutPosition`:** a Millionea arm, free cancellation only (RULES §2.6, with the runway measured to `closesAt`). It sets the ticket to CANCELLED and decrements `ticketCount` in the same transaction.
4. **`settleMaswaliWeek(weekId, {releasedBy})`** (OD-06: the system prepares a preview, one accounting officer releases). Under `market:${marketId}`:
   - `settledAt IS NULL` and `settlementGroupId` free;
   - the gate passes and no objection is OPEN;
   - S computed three ways (`yesPool`, `POOL` ledger, Σ LIVE tickets) and refused unless all agree;
   - `claimCarry` stamps `rolloverIn`;
   - arithmetic from `maswali-money`;
   - the guarantee balance read **inside the transaction**; if it is below U, abort with a CRITICAL alert and never pay less;
   - bulk writes: `updateMany` LOSS, one `createMany` for ledger lines, one `BET_PAYOUT` Transaction per winner, wallets credited, WIN plus `finalPayout`;
   - the column mirror on `MaswaliCycle`, `settledAt` and the state in the same `lockTx`;
   - `audit(SYSTEM, "maswali.week.settled", …)`;
   - `afterCommit`: notices (S6) and the float check (alert when Σ shares exceeds the float minus a buffer).
5. **Guarantee ceremonies:** `fundMaswaliGuarantee` and `returnMaswaliGuarantee` (Owner, typed confirmation, rail reference, audited). `openWeek` refuses below `guaranteeRequirement`.
6. **Disqualification after settlement** (OD-07): the share is credited and frozen (`frozenReason`). Compliance decides; a forfeit returns it to JACKPOT (`MASWALI_FORFEIT_RETURN`). A deposit reversal that funded a winning ticket is frozen the same way (MB-74).
7. **`sunsetMaswali`** (Owner, OD-03), booked per §5.
8. **`house-book.ts`:**
   - the JACKPOT balance and Σ unsettled POOL go into `owedToOthers` / player liability;
   - the guarantee is shown as its own earmarked line;
   - `RateProvenance` gains `jackpot-payout`.
9. **Nightly invariants in `lifecycle.ts`:**
   - the JACKPOT balance equals the single outstanding carry;
   - every settled week's POOL is 0;
   - the mirrored columns equal the ledger;
   - the guarantee is at least the requirement.

**Suites:**
- `test:maswali-purchase` (both stores).
- `test:maswali-cap`: 20 and 50 concurrent buys produce exactly 10, on real PostgreSQL across instances.
- `test:maswali-settle`.
- `e2e:maswali-money`: **drives the real action** for self-excluded, cooling-off, session-limit, loss-limit, suspended, bonus-only, staff and desk accounts (all refused with their reason), then for a real-balance buyer.
- `e2e:maswali-fault`: crash mid-settlement, resume, settle once; two instances settling at once; 10,000 tickets inside the transaction budget.
- `test:concurrency` extended; `test:house-book` extended.
- `red:maswali-money-path`: cap counted outside the lock; bonus allowed; double settle; POOL tolerance of 1.
- Before merge: `test:all`, `e2e:money`, `e2e:fault`, `e2e:card`.

**Acceptance (local PostgreSQL, drift 0, POOL 0, `trialBalance()` and the Maswali invariants clean):**
- (a) A 200-ticket no-winner week rolls 200,000 into JACKPOT with F = 0.
- (b) A 300-ticket floor week with one winner: U 700,000, F 130,000, TRA 13,000, GBT 6,500, paid 870,000.
- (c) 1,500 tickets with 7 winners: 186,428 each, and 4 carried.
- (d) A week void refunds every 1,000 and leaves R untouched.
- (e) The six-week trajectory in §5 replays to a house result of +97,800.
- (f) An under-funded guarantee aborts with no partial writes.

**Closes:** MB-02 (booking), MB-03, MB-04 (liabilities), MB-06, MB-07, MB-08, MB-11 (float check), MB-15, MB-16, MB-31 (path), MB-40, MB-41, MB-43, MB-49, MB-50, MB-51, MB-52, MB-73, MB-74, MB-76.

#### D2 · Design round R2: received and inherited (blocks D3 and S5)

**Goal:** the delivery is landed, judged and filed without letting it bend a law, and the canvas sources are never
lost.

**Work items** — the full protocol, with its scripts, is
[`design-brief/maswali-2026-10/RECEIVING.md`](design-brief/maswali-2026-10/RECEIVING.md):
1. Extract OUTSIDE the repository; any `DESIGN_AUTHORITY.md` or extra token copy inside it is a packaging fault.
2. Export completeness first; commit the raw canvas sources on the branch **the same day** (a 102-board canvas that
   lived only as a claude.ai link was lost on 2026-10-03).
3. The mechanical checks (tokens used vs defined at the stamp, literals, timing, `infinite`/`--m-pivot`, keyframe
   count, JS timing, gold, front-door phrases, politics words, i18n parity, glyph attributes) — every hit read by hand.
4. Score the prompt's 14 acceptance items PASS / NOTE / FAIL; items 1–5 are gates.
5. File the delivery raw at `docs/design-system/v6-<date>-millionea/` (without its token copies) with an
   `INHERIT-MANIFEST.md` in v5's format: verdict per file, Ali's D3 rulings, the L-rows where our law beats the
   delivery, the open questions.
6. Mark the R2 BRIEF as SENT and RECEIVED (a RECORD banner); add the README rows.
7. Prepare **the D3 sheet**: each N shown on a real 4-core phone with the low-end toggle on, plus the `millionea`
   glyph, the IMESHINDA tone, the home-card position and the A1–A5 label.
8. If gates fail: a round-3 delta prompt (key `MASWALI-DESIGN-R3`).

**Suites:** `test:design-one-door`, `test:docs`.

**Acceptance:** zero invented tokens; every acceptance item scored; the manifest names every file; the D3 sheet is
ready.

**Closes:** MB-55 (the classic entry drawn as ruled).

#### S4 · Admin console and operations

**Goal:** one trading officer runs a week without a terminal; accounting releases; compliance pauses and voids; the Owner funds, sunsets and records the licence basis.

**Inputs:** S3 ✅. OD-13 and OD-26 ruled.

**Work items:**

1. **Routes** (each with `layout`, `loading` and `actions`):
   - `/admin/maswali` (trading): weeks, templates, schedule, the pre-open checklist, monitoring.
   - `/admin/maswali/[weekId]` (trading):
     - the 15-row × 3-locale builder, with character counters and the criterion template fields (MB-21);
     - event times typed in the source's IANA zone and shown in both local time and EAT;
     - probability and source; parity attestation; open; move close;
     - **the seal console**, which shows **no ticket data**: the AI evidence panel, bulk seal by one officer, void with a reason code, correction;
     - the gate checklist ("9 of 10 mains sealed · R1 needed"), never a dead button.
   - `/admin/maswali/pools` (accounting):
     - the JACKPOT and GUARANTEE balances, read null-aware;
     - the requirement;
     - the float against the pending payout;
     - the exposure meter (distinct combinations covered ÷ 1,024, worst-case top-up);
     - settlement preview and release;
     - the rollover trail; "levy on own top-up".
   - `/admin/maswali/integrity` (compliance):
     - the cluster report at close (device, IP, payout number, deposit source, complementary picks);
     - pick-shift alerts;
     - the counterfactual seal log, visible only after the fact (MB-34);
     - insider and winner screening;
     - the per-week evidence export (S6).
2. **`roles.ts` `ROUTE_DOMAINS`:** `/admin/maswali/pools` → accounting and `/admin/maswali/integrity` → compliance, both placed **above** `/admin/maswali` → trading. `assertRouteDomainsComplete` must pass.
3. **`control-gates.ts` `CONTROL_DOMAIN`**, each control registered once:

   | Control | Domain |
   |---|---|
   | `createMaswaliWeek`, `openMaswaliWeek`, `moveMaswaliClose`, `sealMaswaliQuestion`, `voidMaswaliQuestion`, `correctMaswaliSeal` | trading |
   | `releaseMaswaliSettlement` | accounting |
   | `voidMaswaliWeek`, `pauseMaswaliSales` | compliance |
   | `fundMaswaliGuarantee`, `returnMaswaliGuarantee`, `sunsetMaswali`, `setMaswaliLicenceBasis`, the rollout switch | ops (Owner) |

   Check `DEFAULT_GRANTS` per role on production, read-only; do not reason by analogy (trading and compliance are disjoint). Add an `admin-nav-groups.ts` group and its `ROUTE_KEYS`. `rolesThatCanOpen` resolves officer alert links.
4. **Sales pause:** audited. It never blocks settlement, refunds, cancellation or withdrawals. It is distinct from the rollout switch and from the sunset: three named acts (MB-78).
5. **Automated watches:**
   - the fixture-drift watch (daily, hourly on close day);
   - a mismatch alert against a linked Yes/No market;
   - the holiday review in the pre-open checklist;
   - alerts at +2h and +12h for an unsealed question, an exhausted void budget, no settlement by Tuesday, an unstamped close, a short float, an unfunded floor, clusters, and pick shifts;
   - a Millionea card on `/admin`.
6. **Re-authentication and confirmation:** typed confirmation in a kit dialog on seal, void, fund, sunset, pause and release. Reuse the re-authentication the Owner's money controls use today; if none exists, record it as an S4 finding. Alert on a seal made from a new device (MB-94).
7. **AI drafting:** reuse `EventCalendar`, `MarketCandidate` and `ai-poll-generation`. The officer edits and approves; nothing is published automatically.
8. **`ops:maswali-*`** scripts, dry-run by default: pause, a stuck-week heal, and an invariant report.

**Suites:**
- `test:maswali-rbac`: 7 roles × 4 routes × every control, with the locked state.
- `test:admin-nav`, `test:rbac`, `test:control-gates`.
- `test:maswali-admissibility`: template fields, banned topics, categories, three locales, both clock-change weekends.
- `test:maswali-seal`:
  - one officer;
  - with the flag on, the gate applies, and the flag value is taken at stage 1;
  - the AI cannot seal;
  - an officer holding a ticket is refused;
  - a correction restarts the window.
- `red:maswali-rbac`.
- `qa:maswali-admin-shots` at 360/768/1280/1920 (needs `next dev`; `/api/dev-test/seed-admin`).

**Acceptance:** on `next dev` in the worktree, trading drafts, attests, opens, has an invalid close move refused, and bulk-seals 15. Accounting previews and releases. Compliance pauses and voids a week. Support sees the locked state. The Owner funds the guarantee. The screenshots are read one by one.

**Closes:** MB-13, MB-20 (UI), MB-21, MB-27, MB-30, MB-34, MB-36, MB-37, MB-48, MB-60, MB-61, MB-62, MB-63, MB-78, MB-81, MB-82, MB-85, MB-94.

#### D3 · Ali's N1–N4 rulings, filed (blocks S5)

**Goal:** each proposed motion gets a dated yes or no from Ali, and each yes is law and value in the same commit.

**Work items:**
1. Put the D3 sheet to Ali: N1 Carry, N2 Attestation Press, N3 Cut, N4 (recommended unspent); the `millionea` glyph; the IMESHINDA tone.
2. For each **yes**:
   - **DESIGN_AUTHORITY §M8:** a dated "Millionea exceptions" paragraph quoting Ali, plus a pointer in §M6.
   - **`motion.css`:** the keyframes and class in their blocks, with calm branches in **both** clamp lists (`prefers-reduced-motion` and `html.kp-reduce-motion`). No `--m-pivot`.
3. For each **no**: delete the motion from the plan; the fallback named in the concept applies.
4. In the same commit:
   - §M7: "Millionea seals do not count" (`roll: false` on the `WinCelebration` payload);
   - §C3 (R-HEADLINE), §M3 (unearned), §F9 (weekly routing, one seal per player per week);
   - §K8b (placement as ruled); §B11 rows in `status-tone.ts` with `STATUS_TONE_EXCEPTIONS`;
   - ~~`glyphs.tsx`: `sealNil` and `millionea`; rename `voidX` → `sealX`~~ — **superseded 2026-10-17 (Ali, §0 item 7):**
     no hand-drawn glyph. Millionea's icons are the Phosphor keys of §10c, added to the Phosphor lane's `map.ts` and
     drawn by its codegen; `voidX` is left to that lane;
   - `08-motion` docs and the provenance changelog;
   - a COMPLIANCE-DECISIONS entry naming the home card and the third Tiketi switch as deviations from the sponsor deck (R1/SJ-22); an AGENCY-REPLY; a v5 INHERIT-MANIFEST row naming the deviation, and a v6 manifest ruling row.

**Suites:** `test:keyframes`, `test:reduce-motion`, `test:motion-ladder`, `test:dead-css`, `test:glyph-motion`, `test:design-frozen`, `test:gold-is-money` (new `UNEARNED_SURFACES` arm), `qa:calm`.

**Acceptance:** every N has a dated answer; every yes is present in DESIGN_AUTHORITY and `motion.css` with both clamps; the suites are green.

**Closes:** MB-56 (flash: no gold), and the motion half of MB-58.

#### S5 · Player surfaces (needs D3 ✅)

**Goal:** a player discovers, fills, buys, cancels, follows and reads a Millionea ticket in both shells, in three languages, at five widths.

**Inputs:** D3 ✅, S4 ✅. OD-23, OD-24 and OD-29 ruled.

**Work items:**

1. **Routes**, each with a matching `loading.tsx` and `error.tsx`, and returning 404 while the rollout is WITHDRAWN:

   | Route | Tier | Notes |
   |---|---|---|
   | `/millionea` (hub) | reading | |
   | `/millionea/slip` | reading | |
   | `/millionea/how` | reading | |
   | `/millionea/tickets` | — | |
   | `/millionea/tickets/[serial]` | receipt | owner-only; ids cannot be enumerated |
   | `/millionea/register` and `/millionea/register/[week]` | reading | public, server-rendered, works without JS |

   `/positions/[positionId]` redirects MASWALI to the ticket.
2. **`src/components/maswali/*`:** `maswali-pool-figure` (no gold), `maswali-win-ledger` (the only gold, on "Kwa tiketi yako" / "Jumla yako"), `maswali-seal-line`, `maswali-slip`, `maswali-ticket`, `maswali-week-strip`, `maswali-home-card`, `maswali-outcome-stamp`, `maswali-unbroken-line`.
3. **Reused components, one prop each:**
   - `SteppedProgress` `groups`;
   - `OperationResultModal` `stamp`;
   - `WinCelebration` `roll: false`.
4. **Journey shell:**
   - the card in `journey-home.tsx` through `home-lazy.tsx`, second in the column;
   - `TicketKind` gains `"millionea"`;
   - `TAB_ROUTES`: `/millionea/tickets` (Tiketi zangu) **above** `/millionea` (Maswali tab).
5. **Classic shell:** the entry point per OD-23, plus the `/positions` notice row.
6. **Surfaces and wiring:**
   - `surfaces.ts`: `COMMIT_ROUTE` and `JOURNEY_ROUTE` entries.
   - `side-label.ts` MASWALI arm.
   - The `millionea` i18n namespace in en/sw/zh. "Millionea" stays in Latin script.
   - `event-bus.ts`: `KNOWN_EVENTS` gains a coalesced `maswali:pool`. The figure is derived server-side from `maswali-money` and the ledger, never stored.
   - Metadata, and OG images only after close; a sitemap for settled weeks; the week page cached.
7. **Seen state:** a server-side "seen" record, `MaswaliTicket.lastViewedAt` plus a per-player-week notice key (an additive migration if needed). It enforces "each fact performs once, for its owner, then rests".
8. **The slip:** kept in session storage keyed by week, with a privacy-notice version bump (a COMPLIANCE entry). It returns intact after a deposit and never places a ticket automatically.
9. **Exclusions:** `/leaderboard` ROI tiers, performance and streaks exclude MASWALI; `/results` gets its own section (MB-90).
10. **Closure:** the account-closure screen lists open tickets.

**Suites:**
- `test:maswali-i18n`: key-set equality, and every lookup map resolved.
- `test:maswali-ui`.
- `test:maswali-design`:
  - no gold on unearned surfaces;
  - at most one lit control per row;
  - no emoji, no count-up;
  - no score on a loss;
  - `potentialPayout` absent;
  - a countdown only on the slip and the buy block.
- `test:journey-shell` (route order), `test:timer-date`, `test:gold-is-money`, `test:responsive`, `test:contrast`, `test:type-scale`, `test:ui-consistency`, `test:design-frozen`, `qa:sse-edge`.
- `qa:maswali-player-shots`: 320/360/768/1280/1920 × en/sw/zh with the longest Swahili strings, asserting rectangles (the figure above the fold at 360, the pay control reachable).
- Classic parity.

**Acceptance:** on `next dev`, a real browser drives sign-in → hub → slip (15/15) → confirm → stamp → ticket → cancel inside the window → buy again → Tiketi zangu's Millionea segment. The classic entry reaches the hub. Rollout WITHDRAWN hides every route (positive control). The tiles are read one by one.

**Closes:** MB-38, MB-44 (closure screen), MB-53, MB-54 (built), MB-55, MB-56, MB-57, MB-58, MB-59 (UI), MB-84, MB-87 (copy), MB-89, MB-90, MB-95, MB-97 (cache).

#### S6 · Fairness, notices, reports, legal, data

**Inputs:** S5 ✅. OD-08, OD-22, OD-25 and OD-30 ruled. Finance and GBT have answered OD-08.

**Work items:**

1. **`/fairness`:** a Millionea section (question-set hash, Merkle root, count, close and hash time), a "verify my ticket" explainer, and the owner-only inclusion proof.
2. **`comms-registry.ts`:** templates, kinds and emitters, sent exactly once and stamped:
   - receipt; cancel; sales closed (to holders); question voided with its reserve; results; week void; rollover (holders only);
   - the win notice, stating the withdrawal ladder: confirmed email, typed identity, at most 5,000,000 per withdrawal, the RULES §2.7 fee; **no AML review text**;
   - one service SMS per winner (OD-25).

   Yes/No notices are suppressed. Gold chrome appears on the paid-win email only. A desk list of uncontacted winners; SMS credit checked before a winner batch.
3. **Marketing:** approved wordings carrying the three R-HEADLINE facts with `{pct}` from the snapshot; a lint in `composeMarketing`; messages to non-holders pass the marketing consent gate.
4. **Tax report** (OD-08):
   - a MASWALI product pill, `byProduct` and `ProductFilter`;
   - Report 1 gains **Jackpot brought forward**, **House floor top-up** and **Carried to the jackpot**;
   - Report 2's treatment as ruled;
   - `chargedFee` learns `jackpot-payout`;
   - the "Polls + Up & Down + Millionea = All" check.
5. **Statutory pack (`catalogue.ts`):** reads with `"ALL"`; GGR plus jackpot-liability and guarantee lines, with a note; `report-money` `moneyByGame`; the `house-book` waterfall step "Jackpot guarantee paid"; `finance-window.ts`.
6. **S16 measures:** `journey-measures-dal.ts` excludes MASWALI from the five measures and reports harm markers twice (OD-22).
7. **Data:** DSAR and export allowlists gain tickets (picks, salt shown to the owner only); the tables are purge-protected and added to DATA-RETENTION's "never touched" row; the privacy notice updated.
8. **Per-week evidence export** for audits (MB-92), with AUDITOR read access.
9. **Support:** en/sw scripts (win, loss, void, reversal, death, holiday, wrong question) and a per-ticket support lookup that is audited.
10. **Final legal and docs:** `/legal/rules/millionea` final; chat and help final; regenerate and **rasterise** `50pick-betting-rules-final.pdf` and `50pick-rates-for-admins.pdf`; `docs/maswali-operator-guide.html/.pdf`; `docs/MASWALI-ARCHITECTURE.md` (as built: file map, tests, permissions, "one control, one place"); README rows.

**Suites:** `test:maswali-fairness`, `test:maswali-reporting` (report equals ledger to the shilling), `test:maswali-notify` (exactly once, three locales), `test:maswali-claims`, `test:tax-report` (§12 extended) with `red:tax-report`, `test:house-book`, `test:product-line`, `test:retention`, `test:dsar-secrets`, `test:erasure`, `test:cert-c1`, `test:cert-c3`, `test:rate-copy`, `test:docs`.

**Acceptance:** a simulated month containing the §5 six-week trajectory files with Report 1 balanced by the reconciling lines, and the monthly pack equal to `ledgerAccountBalance` per account to the shilling. Every notice is sent once. Both PDFs are regenerated and checked by eye.

**Closes:** MB-04 (waterfall), MB-11 (notice), MB-33, MB-35 (report), MB-44, MB-46, MB-47, MB-64, MB-65, MB-66, MB-67, MB-68, MB-69, MB-70, MB-71 (final), MB-86, MB-88, MB-91, MB-92, MB-93.

#### S7 · Adversarial hardening

**Work:**
- reserve patterns × late voids × a REINSTATE objection;
- a six-week chain with week 3 voided and week 4 skipped;
- two instances settling at once; an objection during settlement;
- a source domain disabled mid-week;
- an under-funded guarantee at k ≥ 1; a short float;
- 10,000-ticket settlement;
- **the Friday 18:00 rush at 10× the expected rate with Up & Down running** (cross-instance on real PostgreSQL, `scripts/load`);
- clock skew past the close; an attempt to reclassify `productLine`;
- an insider promoted mid-week; a reversed deposit funding a winner;
- the winner-takeover pattern; ticket-id enumeration; OG images leaking picks;
- a 1,024-ticket covering cluster; both clock-change weekends; a holiday Friday.

**Suites:** `test:maswali-adversarial`, and a `red:maswali-*` for every guard added.

**Acceptance:** every finding is fixed or recorded in `FAILURE-INVENTORY.md`. Latency targets for the rush are set at the start of S7 from measured baselines and recorded with their results.

**Closes:** MB-31 (load), MB-35 (alerting), MB-96, MB-97, and re-verification of MB-06, MB-16, MB-40, MB-94 and MB-95.

#### S8 · Live drive and public launch

**Inputs:** S7 ✅, the §6 launch gate with every line ticked, and OD-01 and OD-21 ruled.

**Work items:**
1. Set the rollout to **STAFF_PREVIEW**.
2. Run a **private, unlinked DRIVE week** (`visibility: "DRIVE"`, OD-21) with trivial, quickly-settling questions.
   - Use non-staff QA personas. Each production sign-in needs Ali's approval: one attempt, never retried.
   - Engineer the picks so that the drive covers a cancel inside 5 minutes, a cap refusal, a bonus refusal, a staff refusal, one voided main replaced by R1, a winner, the floor top-up, the fee and levies, and the share.
   - Then run a second drive week with no winner, to prove the rollover.
   - The drive's unwon money is refunded to the drive accounts and the drive is kept out of every measure (OD-21,
     accepted), so no drive money reaches public week 1.
   - The scheduler closes the weeks. One officer seals. Accounting releases.
3. Read back:
   - the database (read-only proxy, counts and names only);
   - the ledger's zero-sum group, POOL 0, `trialBalance()` and the Maswali invariants;
   - the tax-report lines;
   - verification of the hash and an inclusion proof;
   - the screens at 360 and 1280 in sw.
4. RULES §5 step 6, verified on production.
5. Write the record at `docs/qa/millionea-live-drive-2026MMDD.md`, with a README row.
6. **Launch:** a one-word commit sets `MILLIONEA_SHIPPED = "ACTIVE"`, merged by the release owner. The first PUBLIC week opens on the next Monday 00:00 EAT at the funded floor with no carry.

**Acceptance:** the drive record shows every money figure equal to §5's formulas to the shilling, and the public week opens on schedule.

**Closes:** MB-45, MB-73 (verified live), MB-39 (gate satisfied).

---

## §8 · The blind-area register (MB-01 … MB-99)

> A session that closes a row writes `✅ <commit>` into that row's *Closes* cell in the same commit. Signals that
> would help someone evade an anti-abuse control are not written here: the repository is public.

#### Money

| ID | Sev | Gap | Treatment (within the rulings) | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-01 | C | The generic market doors treat a MASWALI row as a poll. `storedLine` and the other coercions turn it into MARKET. `nextDeadlineFor` skips only UPDOWN. `settleMarket`'s one-sided branch (noPool = 0) refunds every ticket at zero fee. `resolveMarket`, `resolveDueMarket`/sentinel, `emergencyVoidMarket`, `adminReopenMarket`, the paid exit in `cashOutPosition`, `/admin/markets/[id]` and `/admin/resolver/[id]` all accept it. The live `resolutionMode` setting would let the AI seal it, which breaks R-RESOLUTION. | Widen `ProductLine`, with one `isKnownProductLine` and exhaustive switches that have an unreachable default. `nextDeadlineFor` returns null for anything other than MARKET. Every generic door refuses MASWALI unless the call comes from `maswali-service` under a SEAM marker. `settleMarket` is reached only through its VOID arm. The cycle market is pinned to `resolutionMode` human. `chargedFee` throws on MASWALI. Add `red:maswali-fence`: plant a MASWALI row, drive every door and every read, expect a refusal each time. | Eng | S0.5 (the fence), before any MASWALI row is written · ✅ `9834aaf0` | A1, B1, C20p |
| MB-02 | C | Nothing states a formula that keeps house money out of the rollover. `settlementPayoutEntries` tolerates a POOL that ends a shilling or two off zero. | One pure, isomorphic module:<br>• **No winner:** carryOut = R + S, F = 0, U = 0.<br>• **k ≥ 1:** J = max(1M, R + S); F = round(0.13 J); `levySplit` called once; share = floor((J − F)/k); U = max(0, F + k·share − (R + S)); carryOut = R + S + U − F − k·share.<br>One group, `maswali_settle_{id}`. POOL must end at exactly 0 (no tolerance for this product), with conservation asserted per component. Table tests over R ∈ {0, 500k, 2M}, S ∈ {0, 300k, 1.2M}, k ∈ {0, 1, 7, 870, 1,000, 1,400}. | Eng | S2 (module), S3 (booking) | A2 |
| MB-03 | C | The 1,000,000 floor has no funded account, no entry type, no funding timing and no rule for a shortfall. HOUSE:COMMISSION is too small to cover it. When weeks overlap, the house can owe about 2M at once. | Create `HOUSE:MASWALI_GUARANTEE` and a new `MASWALI_GUARANTEE_FUND` entry type (ALTER TYPE). Funding is an Owner-only ceremony from an `EXTERNAL:OWNER_CAPITAL` counterparty, with a rail reference and typed confirmation, and a mirror ceremony to return surplus. A week refuses to open below the level set in OD-02; the balance is read inside the transaction with a null-aware read. Settlement aborts with a CRITICAL alert rather than pay less. The floor figure is shown only while it is funded. | Ali (level), Eng, Finance | S1, S3, S4 | A3, C2 |
| MB-04 | H | The house book misreads the product in four ways:<br>• The solvency line counts the jackpot balance, every unsettled POOL and the guarantee earmark as free house cash, overstating it by 1–2M.<br>• The waterfall books the 13% fee on the house's own top-up as revenue.<br>• `gameBook` raises a false "books do not close" alarm every week.<br>• `RateProvenance` knows only two fee models. | • Add the jackpot balance and Σ unsettled POOL balances to `owedToOthers`.<br>• Show the guarantee as its own earmarked line.<br>• Add a waterfall step "Jackpot guarantee paid".<br>• `gameBook` gains carryIn, topUp and carryOut; the identity becomes handle + carryIn + topUp − paid − fee − carryOut = 0.<br>• Widen `RateProvenance`.<br>• Add RED anchors in `test:house-book`. Apply the same changes to `/admin/finance` and `finance-window.ts`. | Eng | S3 (liabilities), S6 (waterfall) | A5, A6 |
| MB-05 | H | Code built for two fee models (FeeModel, `readRates` coercion, `chargedFee`, `roundKeep`, `describeFeeModel`) would misread the third. RULES §1 and §3 would become false. | Run the full RULES §5 ceremony:<br>• a COMPLIANCE-DECISIONS entry quoting Ali's words and voiding the August entries by heading;<br>• RULES §1 rows, a new §2.12, §3 changed to three models, a §2.4 cap exception and an amended §2.8 "Nothing else" line;<br>• FeeModel `jackpot-payout`, or the fee kept only in `rulesSnapshot`; `readRates` refuses an unknown value instead of coercing it;<br>• a caption of 17 characters or fewer and `{pct}` taken from the snapshot;<br>• a red-first guard, both PDFs regenerated, and a check on production. | Eng, Ali (ceremony) | S1 | A7 |
| MB-06 | H | One 30-second transaction cannot settle 5,000–10,000 tickets. LedgerEntry has no unique `groupId`, so a re-entered settlement could double-pay. | Bulk writes (`updateMany` for LOSS, one `createMany` for the ledger, one Transaction per winner). Add `MaswaliCycle.settlementGroupId @unique` and an in-lock "no group exists" check. `settledAt`, the cycle state and the carry stamp go in one transaction. `e2e:maswali-fault` covers a crash mid-settle, two instances settling at once, and 10,000 tickets. | Eng | S3, S7 | A9 |
| MB-07 | H | The jackpot and guarantee exist only in the ledger, which the platform calls a secondary mirror that may post fire-and-forget. `ledgerAccountBalance` returns 0 when there is no database. | • Every Millionea post runs inside the transaction and throws on failure.<br>• Mirror carry, top-up, fee and levies as columns on `MaswaliCycle`.<br>• Reconcile the columns against the ledger nightly.<br>• Money decisions use null-aware in-transaction reads only. | Eng | S3 | A11 |
| MB-08 | H | Sales S can be read from three sources that may disagree: `yesPool`, the POOL ledger, and the tickets. Production already has one column/ledger split (mkt_037b…, −19,999). | Inside the settlement lock, compute S three ways and refuse unless they agree. Stamp `ticketCount` and sales at the close. Add a drift test for each source. | Eng | S3 | A12 |
| MB-09 | M | Rounding is unruled:<br>• Largest-remainder allocation breaks "equal" shares.<br>• `assertWinnerFloor` throws once a share drops below 1,000 (k > 870 at the floor).<br>• The dust has no home (OPEN-4). | One fee-rounding rule, `levySplit` called once, a floor share for every ticket, and a dedicated no-floor equal-split allocator. The dust home and the Invariant-1 exemption are OD-19. Tests at k = 7, 870, 1,000 and 1,400. | Eng, Ali | S2 | A20, A30, B36, C36 |
| MB-10 | M | The fee on the house's own top-up carries TRA and GBT levies paid from house money. Levies on stakes carried across months are booked in the month of payout. | Record both as accepted consequences in the COMPLIANCE-DECISIONS entry. Show "levy on own top-up" on the pools page. Put both in the Finance/GBT review (OD-03). | Finance | S1, S4 | A18 |
| MB-11 | M | A jackpot can drain the Selcom float in one or two withdrawals. Nothing tells the winner truthfully how a share becomes cash. | • Before crediting and before notifying, compare Σ shares with the float minus a buffer, and alert the Owner and Finance.<br>• The pools page shows the float against the pending payout.<br>• The win notice states the ladder: confirmed email, typed identity, at most 5M per withdrawal to the registered number only, 1.5% fee (870,000 arrives as 856,950). It never mentions an AML review.<br>• SAR rows record the jackpot provenance. | Eng, Finance | S3, S6 | A28, C12 |
| MB-12 | M | Agent commission and the invite first-bet prize are undefined for a fee that exists only in winning weeks and partly comes from the top-up (OPEN-3). | Per OD-20. If excluded: explicit product checks in `onRecruitSettlement` and in the invite milestone, an `/legal/agent-terms` version bump, and a test. | Ali | S0, S3, S6 | A27, C35 |
| MB-13 | H | Nobody can see the house's exposure. Break-even is about 630 tickets a week in steady state and about 890 in a cold week. Below that, the floor costs money. | `/admin/maswali/pools` (accounting domain only) shows P(≥1 winner) computed from the distinct combinations sold, the expected and worst-case top-up, and realised against modelled results. The guarantee fund and marketing plan are sized on these figures. | Eng | S4 | A13 |

#### Rules / Engine

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-14 | H | The reserve engine, the settlement gate and the displayed substitution are undefined for 15 questions. Whether unused reserves must be sealed is open, and the displayed mapping can relabel itself as later voids arrive. | `maswali-score.ts` (pure, isomorphic) owns the graded set, `weekVoid` and the display mapping. The mapping is built only from the final record. Until then the ticket shows "voided · a reserve counts in its place".<br>Officers seal all 15 by default, because an objection-VOID can pull an unused reserve in. The settlement gate follows MR-19 and is re-evaluated whenever the void count changes.<br>`test:maswali-engine` table-drives 0–15 voids, including voided reserves and late reserve voids. | Eng | S2 | A25p, B15, B26 |
| MB-15 | H | The whole-week void path is unbuilt: `emergencyVoidMarket` refuses the system actor; the carry could be stranded; a doomed week keeps selling; a buyer would still be asked to pick a dead question. | • Use the Up & Down pattern: stamp VOIDED, then call `settleMarket`'s VOID arm. The jackpot account is never touched; N+1's carryIn equals N's.<br>• A void is certain when voided mains > 5 − voided reserves. It executes only after the objection windows of the triggering voids close, so a REINSTATE can still stop it.<br>• A void before the close disables that row on the slip (stored as null in canonical selections) and stops sales the moment the week is doomed.<br>• Receipt: "all tickets refunded; the jackpot carries to next week". | Eng | S2, S3 | A25p, B16, B21 |
| MB-16 | H | Overlapping weeks have no carry-claim protocol and no chain invariants. `trialBalance` would still pass with a carry claimed twice. | • One function under a `maswali:chain` lock stamps carryIn exactly once (`WHERE carryIn IS NULL`).<br>• Settlement is strictly in order (MR-3), so N's carry always joins N+1. R-WEEK already covers this; no decision is needed.<br>• A skipped week leaves the carry waiting for the next week that opens.<br>• Partial unique index: one OPEN week. Do NOT add the raw finding's "one closed unsettled week" index: a stalled N would then stop N+1 from closing.<br>• Nightly invariant: jackpot balance equals the one outstanding carry, and every settled POOL is 0. | Eng | S2, S3 | A10, B20, C4p |
| MB-17 | H | The question set and the reserve ORDER are neither frozen nor committed at open. Editing them after open would let someone choose which reserve decides the week. | `QUESTION_PATCHABLE` excludes, in both stores: text ×3, criterion ×3, source and fallback, role, ordinal and reserve order, `eventStartsAt`, `voidDeadlineAt` and the observation definition. Publish `questionSetHash` at open. Red test: patching the order after open throws. | Eng | S1, S2 | B24 |
| MB-18 | H | Void grounds are open-ended. The Yes/No "Management may refund an ambiguous market" and "any technical error" clauses would carry over and give one officer a lever to choose winners. | A closed list of grounds, each with a reason code in `maswali-void-reason.ts`, evidence, and publication. A platform error voids the whole week only for an integrity failure. The list's contents are OD-04. | Ali, Eng | S0, S2, S6 | B12, B13, A21p |
| MB-19 | M | No question has its own void deadline and the week has no final deadline, so the timing of a postponement void is discretionary. | Freeze `voidDeadlineAt` per question, at or before a cycle `finalDeadlineAt`. At the deadline the system proposes VOID and an officer seals it. All 15 events must sit inside the template window. Value: OD-06. | Ali, Eng | S2 | B14 |
| MB-20 | M | Correlated voids are possible: a reserve on the same match as a main, dependent pairs, or many questions sharing one league, day or source (OPEN-11). | `openCycle` refuses same-event pairs and dependent pairs (officer attestation plus an AI check). Caps per competition, day and source are config values frozen in the snapshot. Hard or soft refusal: OD-14. | Eng, Ali | S2, S4 | B11 |
| MB-21 | M | The criterion leaves open overturned results, data revisions, abandoned matches, extra time, a draw on a "win" question, an exact tie on the threshold, and exchange holidays. | A criterion template with mandatory fields: named authority; regulation time (extra time and penalties excluded); draw = NO; strict inequality; instant, time zone and instrument; exchange calendar checked at open. Revisions count only inside the objection window. `test:maswali-admissibility` checks all three locales. | Eng | S4 | B31 |
| MB-22 | M | A source outage, or a mid-week change to the live `isSourceTrusted` registry, has no rule. | Freeze the primary source, a named fallback and a reading tolerance at open (the Up & Down `capturedSourceDomain` precedent). Registry edits never touch an open week. No reading by the deadline means VOID with a reason code. | Eng | S2 | B32 |
| MB-23 | H | Today's objections cannot serve this product:<br>• one per player per market, only after the whole market resolves;<br>• no `questionOrdinal`;<br>• a VOID cannot be contested (REVERSE is refused on VOID);<br>• a reserve becomes decisive after its window has closed;<br>• the sealer may rule on objections to their own seal;<br>• the window is a live 1h setting that can be 0 and can fall at night. | • Millionea objections are keyed (cycle, ordinal, user). Standing follows MR-16: any live ticket holder.<br>• Three remedies: REVERSE, VOID and REINSTATE.<br>• The window is keyed to the moment the graded set becomes final; any change to the graded set reopens it for newly graded questions.<br>• Any OPEN objection blocks settlement.<br>• Window length, timing, restart and the ruling officer are OD-05. | Eng, Ali | S1 (column), S2, S4 | B2, B3, B4, B18, B19, C20 |
| MB-24 | H | A seal cannot be corrected. `resolveMarket` refuses a re-seal, `upholdObjection` refuses after `settledAt`, and nothing covers an error found after payout. | An officer may correct their own seal inside the window; the correction is audited, restarts the window and notifies holders. After payout, nothing is ever clawed back. The remedy is OD-09. | Ali, Eng | S2, S4 | B5 |
| MB-25 | M | The sunset rule leaves gaps: a final week that voids or sells nothing, a regulator stop mid-week, the fee and floor, what "score" means, notice, and who triggers it. | A pure "highest score" function (graded correct answers out of 10). Ledger path JACKPOT → POOL(final) → tickets. Owner ceremony. The rule is in the binding text from week one. Contents: OD-03. | Ali, Eng | S0, S2, S6 | A26, B22, C22 |

#### Timing

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-26 | H | "Event start" is undefined for price, stock and weather questions. A Friday-close equity session opens at 16:30 EAT (17:30 after 1 Nov), before the 18:00 close. The PDF's Bitcoin sample leaks information. | This follows from MR-4 and R-WEEK; no decision is needed. Event start = start of the observation window, defined per type:<br>• sports: scheduled kickoff;<br>• point price: start of the observation day or session;<br>• weather: 00:00 local on the first observed day;<br>• entertainment: broadcast or announcement start.<br>A machine check enforces windowStart ≥ close for all 15. Consequences: Friday-close equity questions are barred by construction, and price thresholds are fixed at open and checked against the reading at the close. Reword the PDF sample. | Eng | S2, S4 | A15, B9, C5p |
| MB-27 | H | A fixture brought forward after the week opens creates a past-posting window. Event times are typed once and nothing watches them. | Store the scheduled start frozen at open and an observed start beside it. A fixture-drift watch runs daily, and hourly on close day. The officer moves the close earlier (R-WEEK). If sales ran past the real start: OD-10. | Eng, Ali | S4 | B6, C5p |
| MB-28 | M | Moving the close after open changes the cancellation runway after the fact. Re-opening after the close would undo the commitment. | R-WEEK allows moves in both directions. B7's "never later" narrows the ruling and is NOT adopted. Instead:<br>• Earlier: only to at least now + 5 min + grace, so every sold ticket keeps its full window.<br>• Later: only up to the earliest start minus the buffer (OD-15).<br>• Never after the close has passed (MR-13 makes the hash write-once).<br>• Re-run the 15-question check, notify holders, audit, and stamp `closeAtPurchase` on each ticket. With the runway rule, every cancellation window ends at or before the close, so the hash can be taken at the close. | Eng | S2 | A22p, B7 |
| MB-29 | M | A close equal to the first event leaves no time to publish the hash, no allowance for clock skew, and no margin for kickoff drift. | Freeze `minLockBufferMinutes` in the snapshot. Show `hashComputedAt` on `/fairness`. Raise a CRITICAL alert and flag the attestation if the hash is not out before the earliest start. Buffer value: OD-15. | Ali, Eng | S2, S6 | B8 |
| MB-30 | M | Officer-typed times across the UK (25 Oct 2026) and US (1 Nov 2026) clock changes can let in a question that has already started. | Enter times in the source's local time with an IANA zone. Convert and compare in UTC. Show both local and EAT absolute times. Red test over both weekends. | Eng | S4 | B10 |
| MB-31 | H | The Friday 18:00 rush lands on one shared admission queue and one market lock. Ten tickets mean ten lock acquisitions. A retry after the close must return the receipt. A deposit can confirm after the close. The ticker would cause a broadcast storm. | • Buy N tickets in one transaction: one admission slot, one lock, one group, the cap counted once.<br>• The close is enforced on the database clock inside the lock.<br>• Extend the L2 replay to Millionea keys.<br>• In the last 15 minutes, the slip warns that a deposit may not confirm in time.<br>• Coalesce ticker updates.<br>• Load-test at 10× the expected rate with Up & Down running. | Eng | S3, S7 | C25, A32 |

#### Fairness

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-32 | H | `selectionsHash` over 15 binary picks has only 2^15 possible inputs, so publishing it reveals every ticket. One SHA over all tickets cannot prove inclusion to a player. The cited precedent `test:lock-hash` tests advisory-lock hashing, not a commitment. | A 128-bit salt per ticket, held server-side and shown only to its owner. A Merkle root, the ticket count and the close time published at the close. An owner-only inclusion proof. An anonymised graded table after settlement. Write the spec into the door before S2. **This corrects MR-9 and MR-13.** | Eng | S2 (spec), S6 (publish) | B23 |
| MB-33 | M | `/fairness` has no record per week, and `listTerminalMarkets` defaults to MARKET. | A permalink per week: the 15 questions with criteria and sources, seals with evidence, voids and their replacements, the close time, the ticket count and root, pool, fee, top-up and paid amounts, k and the share. No names. A "verify my ticket" explainer. | Eng, Design | S6, D2 | C31 |
| MB-34 | H | The single sealing officer could see the projected winners before a seal or void. A void moves the employer's money (it can avoid a top-up). | The seal/void console shows no ticket data, and no pre-settlement view shows pick splits, alive counts or winners. The counterfactual (winners and top-up with and without the void) is computed at each seal, audited, and visible to Compliance only after the fact. Alert when a void changes the winner set or avoids a top-up, or comes after the named source has already published a result. | Eng | S4 | B17, A21 |
| MB-35 | H | Groups of accounts, each under the cap, can cover the board. Identity is checked only at withdrawal. The same pattern is a laundering route. | A cluster report at close (device, IP, payout number, deposit source, complementary picks). Compliance is alerted before settlement when a cluster holds a winner. Weekly coverage report. A fair-play clause in the Millionea rules. SAR provenance on withdrawals. Cap definition: OD-16. | Eng, Ali | S6, S7 | A16, B28, C8 |
| MB-36 | H | How predictable the questions are is a solvency parameter. If favourites win 70% of the time and players follow them, P(≥1 winner) at 300 tickets doubles to about 50%. | Each question records an estimated probability with its source. The modelled exposure is shown at the close. The band and override: OD-14. | Ali, Eng | S4 | A14 |
| MB-37 | M | A jackpot rewards fixing one low-tier match. `buildMatchIntegrity` does not know these questions. | Alert on unusual pick-distribution shifts before the close (Compliance only). Feed the questions into the integrity report. Restricting competitions: OD-14. | Eng | S4, S6 | C23p |
| MB-38 | H | The "still alive" status flips both ways, and a jackpot figure next to it reads as a promised return (C3, SJ-4). | Provisional wording ("X of Y settled questions match · final when all 10 counted questions settle"). Never "eliminated" or "winner" before the result is final. No figure on a held ticket. `potentialPayout` is null everywhere. Public alive count: OD-24. | Design, Ali | S5, D1 | B25 |

#### RG / Compliance

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-39 | C | Voiding the August rulings removed the only gate on real money. Ali's general statements on 2026-09-29 and 2026-10-14 name no jackpot. The licence file never describes a fixed-price ticket, a house floor, a rollover across weeks, a payout-only fee or a sunset (OPEN-1). | • COMPLIANCE-DECISIONS gets a dated entry.<br>• Write `docs/BOARD-DISCLOSURE-MILLIONEA.md`.<br>• Add a GLI change-management row and publish the void policy.<br>• Ask which tax class applies.<br>• Code gate: `maswali.config.licenceBasis` (Owner-set, audited); `test:maswali-licence-gate` proves the refusal with a positive control.<br>• A feature-state guard. | Ali, Board | S0, S1; before S8 | A4, C1 |
| MB-40 | H | The responsible-gambling gates hold only on the one purchase path. A jackpot payout or week-void refund lifts the rolling-24h loss limit by that amount. The session-limit refusal arrives after the player has built 15 picks. | • One path only (`buyPositionInner` with a Millionea context).<br>• e2e drives the real action for self-excluded, on-a-break, session-limit, loss-limit and suspended players.<br>• The draft is kept on refusal.<br>• Harm markers tracked per product.<br>• Loss-limit offset: OD-17. | Eng, Ali | S3, S7 | C10 |
| MB-41 | H | The insider bar leaves four things open:<br>• which accounts (7 `STAFF_ROLES` and live desk designations);<br>• promotion mid-week;<br>• QA personas, which have no marker;<br>• D19, which forbids house wording, while R-INSIDERS wants a "clear message". | Check in the purchase lock. Staff get an explicit refusal reason. Desk accounts get a neutral one ("This account can't buy Millionea tickets. Contact support."), which satisfies both R-INSIDERS and D19. The seal path refuses an officer who holds a ticket in that week. Winners are screened against staff phones and devices. Mid-week edges, QA accounts and households: OD-12. | Eng, Ali | S3 | B29, C6 |
| MB-42 | M | MASWALI = "denied" for house bots triggers a daily false `PRODUCT_DENIED` alarm in `scopeAlerts`. `predictorExtra` inflates counts players see. | Return early before `scopeAlerts` for MASWALI. Remove MASWALI from INTENT/TARGET lines. The ticket count comes only from the week's own count. File a COMPLIANCE-DECISIONS entry for the denial. | Eng | S1 · ✅ S0.5 `9834aaf0` for the false alarm and the INTENT/TARGET lines; the week's own ticket count (S5) and the COMPLIANCE-DECISIONS entry remain | C7 |
| MB-43 | H | No rule for a winning ticket disqualified after settlement (under-18, duplicate identity, sanctions, a staff alternate account, cap evasion). Settlement cannot be re-run. | Never reopen a settled week. The share is credited, frozen, and decided by Compliance under Terms §3a. New entry type `MASWALI_FORFEIT_RETURN`. Roles re-checked at settlement. The forfeited share's home: OD-07. | Ali, Eng | S3, S4 | A17, C9 |
| MB-44 | H | Winners whose account is closed, self-excluded, suspended or cooling off cannot see or withdraw the money. Many journey players have no email. | The closure screen lists open tickets. The `CANNOT_SIGN_IN` letter goes out. No next-jackpot figure appears in any notice. Payment procedure: OD-13. | Ali, Eng | S5, S6 | C11 |
| MB-45 | M | Under R-LAUNCH the live drive either dilutes a public week or rolls staff money into week 1. | Per OD-21. | Ali | S8 | B30 |
| MB-46 | H | Launching before S16 skews the sponsor's "in bounds" measures. `journey-measures-dal.ts` has no product-line filter (OPEN-13). | After the widening, exclude MASWALI from the five measures. Report the harm markers twice. Mark the launch date on the measures view. OD-22. | Ali, Eng | S6 | C16 |
| MB-47 | H | Nothing guards marketing claims. The SMS composer sends text as typed, so "Shinda TZS 1,000,000 kwa TZS 1,000!" is false three ways. OG images and push are unchecked. | • An approved set of wordings that carries the three R-HEADLINE facts, with `{pct}` filled from the snapshot.<br>• A lint in `composeMarketing` (amount, shinda, milioni, uhakika).<br>• `test:millionea-claims` (no gold, no count-up, no "first").<br>• Messages to non-holders pass the marketing consent gate. | Eng | S6 | C3 |
| MB-48 | M | Banned topics go beyond politics: religion, adult, violence, war, and the health or death of an individual. Hand-typed questions bypass the AI filter, and "other" is an escape hatch. | One shared banned-topic screen in `openCycle` over EN and SW text and criteria. Category must be in `MARKET_CATEGORIES`. "Other" needs a compliance note. Red test. | Eng | S4 | B33, C23p |

#### Player UX

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-49 | M | Purchase-path details:<br>• `stakeBoundsForMarket` has no Millionea arm, so a higher platform minimum could refuse every ticket;<br>• it is unclear whether the cap counts cancelled tickets;<br>• the real-first split would spend bonus before any refusal. | • Millionea arm: min = max = the frozen price, validated at open.<br>• Freeze the cap in the snapshot; count live tickets only.<br>• Refuse bonus before the split.<br>• Register reasons in en/sw/zh: `millionea_cap_reached`, `_bonus_refused`, `_sales_closed`, `_staff_barred`, `_account_ineligible`.<br>• Test: 50 concurrent buys produce 10 tickets. | Eng | S3 | A31, C37p |
| MB-50 | M | Cancellation has no hook to remove a ticket from the count, the hash or the cap. A paid exit priced on pool odds could appear. | Millionea arm: mark the ticket CANCELLED and decrement the count in the same transaction. Pin `paidExitWindowMinutes` = 0 in the snapshot. In the last 5 minutes the slip says "no free cancellation" (the E-197 lesson). | Eng, Design | S3, D1 | A22p, C37p |
| MB-51 | M | Replaying a request id ignores the picks: a reused key with an edited slip returns the old ticket. | A replay requires the same picks hash, otherwise `idempotency_key_conflict`. A fresh key per confirmed slip. Identical tickets: OD-24. | Eng | S3 | A23, B27 |
| MB-52 | M | The purchase path quotes a payout for a one-sided pool and labels the ticket "YES". | `potentialPayout` null, `payoutIfWin` omitted, description "Millionea ticket · {week}". Test the receipt, notice and email. | Eng | S3 | A24 |
| MB-53 | M | Tiketi zangu cannot show tickets: `/positions` lists MARKET only, and `/positions/[id]` would draw a Yes/No dial. | • A third `TicketKind`, with `/millionea/tickets` above `/millionea` in `TAB_ROUTES`.<br>• A held ticket shows picks and status only.<br>• A win shows pool, fee and paid, per ticket and in total.<br>• A loss shows the score as bookkeeping.<br>• `/positions/[id]` redirects.<br>• The losing-ticket rollover line: OD-24. | Eng, Design | S5, D1 | C38 |
| MB-54 | M | The home card and the third switch item depart from the sponsor deck (R1, SJ-22) without a record. | A COMPLIANCE-DECISIONS entry naming both as deviations, plus an AGENCY-REPLY. Measure the switch at 320 and 360px in sw, en and zh. | Eng, Ali (filing) | S5 | C14 |
| MB-55 | M | The classic shell has no entry point before S15 (OPEN-5). | Per OD-23. Remove it when S16 unmounts the classic shell. | Design, Ali | D2, S5 | C15 |
| MB-56 | M | The headline is not always true: the carry is pending while N resolves, the floor may be unfunded, and `.value-flash` is gold. | X = max(1M, confirmed carry + sales), shown only while the floor is funded. A "plus week N's carry-over once final" line. Derived figure on an allow-listed SSE event. No gold flash (OD-24). | Eng, Design | S5, D2 | A29, C4p |
| MB-57 | M | A 15-pick slip on a cheap phone must survive a deposit round trip, a reload and sign-in. S9's saved bet holds one bet. A new storage key needs a privacy-notice version. | Server-rendered slip. Session storage keyed by week id, with the privacy version bumped. After a deposit, return to the slip with picks intact and never place the ticket automatically. Page-weight budget and a 2G/3G test. | Eng, Design | S5, D3 | C26 |
| MB-58 | M | Accessibility of the 15-row ballot, the results and the figure. | Fieldset and legend per row, radio pairs, an aria-live "n of 15", 44px targets, neutral marks for right and wrong (not YES/NO colours), absolute dates beside countdowns, and a reduced-motion form for each N1–N4. | Design, Eng | D3, S5 | C27 |
| MB-59 | M | Question text in three locales lives in the database, where `test:i18n` cannot see it. Email is EN+SW only. | `openWeek` refuses any empty locale. "Millionea" stays in Latin script. Reasons in 3 locales. The help text says email is EN+SW. Respect the SW length budget. | Eng | S2, S5 | C28 |

#### Admin / Ops

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-60 | M | No ruling on who voids a question, who voids a whole week by hand, or who triggers the sunset. | Register each control once in `CONTROL_DOMAIN`. In `ROUTE_DOMAINS`, `/admin/maswali/pools` (accounting) sits above `/admin/maswali` (trading). Show the control-locked state. `test:maswali-rbac` covers 7 roles. Authority: OD-26. | Eng, Ali | S4 | C21 |
| MB-61 | M | No weekly calendar or staffing for 90 strings, 15 sources and weekend seals. One missed seal stalls two weeks. | Calendar: draft Wednesday, freeze Sunday, open Monday 00:00 EAT, close Friday 18:00, seal by Monday 12:00. A primary and a backup officer. Pre-open checklist; a week never opens short. Alerts at +2h and +12h per question. A settle checklist. | Eng, Ali (staffing) | S4 | C24, B35 |
| MB-62 | H | No Millionea sales stop and no incident runbook. | An audited sales pause (compliance domain) that never blocks settle, refund, cancel or withdraw. `ops:millionea-*` scripts, dry-run by default. A runbook covering each scenario. Semantics: OD-03. | Eng | S4 | C34 |
| MB-63 | H | No monitoring for a weekly product's failure modes. | Nightly invariants (MB-16, MB-07). Alerts: unsealed question, void budget exhausted, unsettled by Tuesday, close not stamped, float short, floor unfunded, clusters, pick shifts. A Millionea card on `/admin`. | Eng | S4, S6 | C33 |
| MB-64 | M | Support has no scripts and no Millionea view. | en/sw scripts, including those listed in MB-91. A read-only per-ticket lookup for the support domain, audited and opened per request, so it never gives the sealing officer aggregate data. Chat handoff. Operator guide PDF. | Eng, Ali | S6 | C29 |

#### Reports

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-65 | H | The tax report breaks:<br>• A no-winner week makes Report 1's check fail by the week's sales (RESULT_MISMATCH), which blocks locking or filing the whole book, Polls and Up & Down included.<br>• Report 2 files 13% × Payout = 0.87F against the booked F.<br>• `ProductFilter`, `byProduct` and the `TaxPeriodLock` CHECK know two products. | A third product pill and the CHECK migration. Three reconciling lines. A Report 2 rule. A "not reconciled" note until ruled. Reads use `productLine "ALL"`. `test:tax-report` §12 and `red:tax-report`. The basis is OD-08. | Finance, Board, Eng | S6 (S0 decision) | A8, C30 |
| MB-66 | M | GGR in the GBT pack swings: a no-winner week shows its whole sales as GGR, a payout week can be deeply negative, and there is no liability note. | Lines for jackpot-liability movement, guarantee contribution and GGR excluding that movement. A product split and a note. Presentation: OD-08. | Finance, Board | S6 | A19, C30p |
| MB-67 | M | Picks appear in neither data-export door, and cascade deletes could destroy the 7-year betting record. | Add a ticket view to `buildDsarBundle` and `exportUserData` through one allowlist. Mark the tables purge-protected and add them to DATA-RETENTION's "never touched" row. `test:erasure`. Update the privacy notice. | Eng | S6 | C32 |

#### Notifications

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-68 | H | The poll notices would say false things about a ticket ("Bet placed · YES", "the exact amount you receive"). There is no plan by week state, and no line between service and marketing messages. | A registered set per state: receipt, cancel, sales closed, a void with its reserve, the result, a week void, a rollover message to holders only. Suppress the poll notices. Each sent exactly once, stamped. Gold chrome only on the paid-win email. Winner SMS: OD-25. | Eng, Ali | S6 | C13 |

#### Legal surfaces

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-69 | H | The binding text has no Millionea section. Terms §10 promises 14 days' notice of a material change. The chooser still says "two products". | A Terms section and `/legal/rules/millionea` in en/sw/zh, with the rules version stamped on each ticket. Update the chooser. Run the §5 ceremony. Notice question: OD-18. | Eng, Ali | S6 (S0 decision) | C18 |
| MB-70 | M | The PDF's rule 3 ("reserves are not answered") contradicts R-RESERVES and will leak into copy and agent pitches. | The binding rules and the slip's rules strip state: all 15 are answered, the reserve order, the week void, the void deadlines, the absolute close, the cap, and no cancellation in the last 5 minutes. Marketing copy is derived from the binding rules only. Extend `test:terms-cancellation`. | Eng, Design | S6, D1 | B34 |
| MB-71 | H | `chat.ts` and `/help` would state falsehoods: "13% of the losing side, both games", "a winning bet is never paid less than its stake … impossible", "one-sided means refunded". | Scope each statement to Yes/No and Up & Down. Add a Millionea block filled from config. Never suggest picks. Run `test:rate-copy`. Coordinate the `house-bot-disclosure` §6 pin. | Eng | S6 | C19 |

#### Platform / IA

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-72 | M | Collisions with the Vodacom lane: shared files, and `house-bot-disclosure` §5.1 pins dictionaries and rulebooks byte-identical. | The widening lands first, in one integrator commit. Shared files change in small commits inside agreed windows. One `millionea` dictionary namespace. Parity diffs registered in advance. | Eng | S1, S5 · ✅ S0.5 `9834aaf0` for the integrator commit | C17 |

---

#### Still missing — rows added by the completeness critic

| ID | Area | Sev | Gap | Treatment | Owner | Closes |
|---|---|---|---|---|---|---|
| MB-73 | Money | H | **The very first week.** There is no predecessor, carry is 0, and the floor applies. Expected house result at 300 tickets is about −150k. There is no minimum-sales threshold, so 50 tickets with one winner still pays 870,000. Week 2 opens while week 1 is unsettled, which needs about 2M funded. | Stamp `carryIn = 0` at open with no chain wait. Fund before week 1 (OD-02). The live drive never seeds week 1 (OD-21). No "first" claims (SJ-24). The headline shows the funded 1,000,000. The S8 acceptance check covers the floor paths. | Eng, Ali | S3, S8 |
| MB-74 | Money | H | **A reversed deposit funded a ticket.** A CONFIRMED→FAILED callback (chargeback or mobile-money reversal) is only escalated. `wallet-service.ts` says the bets it funded are an unmade policy decision. A reversed stake could fund a jackpot-winning ticket. | The ticket stays in the committed set and is graded, so the commitment holds. If it wins, its share is credited and frozen pending Compliance, with forfeiture per OD-07. Show the provenance in the cluster/integrity report. Carry the Yes/No "payment reversals … forfeiture" clause into the Millionea rules. | Ali, Eng | S0, S3, S6 |
| MB-75 | Rules | M | **Config edited mid-week.** Price, fee rate, cap, objection window, buffer, caps and the two-officer flag are live settings. | Freeze every Millionea value in `rulesSnapshot` at open. `/admin/config` shows "applies from week N+1". The one exception is `requireTwoOfficer`, which R-RESOLUTION leaves platform-wide: a mid-week toggle applies only to seals not yet started (MB-82). | Eng | S1 |
| MB-76 | Money | L | **Legacy bonus balances.** Sign-up bonus grants still sit in `bonusBalance`. Nothing says whether a Millionea ticket accrues bonus wagering turnover (RULES §2.5). | The slip shows "Real balance X · bonus can't be used for Millionea". `bonusFunded` is always false. Turnover: OD-27. | Eng, Ali | S3, D1 |
| MB-77 | Money | M | **Tax on winnings.** RULES §2.8 says "No withholding tax" on players. Nobody has confirmed that a single jackpot win of millions draws no gaming-winnings withholding. | Finance and TRA confirm in writing. If any applies, change §2.8, the win notice and settlement. | Finance | S0 |
| MB-78 | Rules | H | **The product is killed mid-week.** Three different acts are conflated: pausing sales, voiding the week, and stopping the product. Nothing says what happens to the in-flight week when Ali stops it rather than the regulator. | Three named acts:<br>• **pause:** sales only; settlement continues;<br>• **week void:** refund, carry untouched;<br>• **product stop:** the sunset.<br>Semantics for each origin of the stop: OD-03. | Ali, Eng | S0, S4 |
| MB-79 | Rules | H | **A wrong question is published.** A typo in the threshold or date, a wrong reserve order, or Swahili text that differs from English. Text freezes at open. `legal/_components.tsx` makes English binding, while most players read Swahili. | DRAFT is freely editable. A second-reader EN/SW parity attestation is required before open. After open, the only remedy is a void on a closed-list ground: "criterion materially wrong or EN/SW divergent", found before the close or upheld by an objection (OD-04). Audit and publish the case. | Ali, Eng | S2, S4 |
| MB-80 | Rules | M | **The source is ambiguous at the deadline.** The primary and fallback conflict, the data is provisional, or the official result is under appeal. | The named primary authority wins. Provisional data is not final. A result under appeal stands as published at the deadline; later revisions are ignored (MB-21). Nothing final by the void deadline means VOID with a reason code. Evidence is captured (archived page or screenshot) at the seal. | Eng | S2, S4 |
| MB-81 | Rules | M | **The same event is also a Yes/No market.** Two different officers could seal the same fact differently. | Link the question to any matching Yes/No market. Alert on a mismatch between the two seals. Neither seal is evidence for the other. Both results are published. | Eng | S4 |
| MB-82 | Admin | L | **The two-officer flag changes mid-week.** A seal that is half done changes its completion rule. | A seal follows the flag value at the moment its first stage begins. Audit it. | Eng | S4 |
| MB-83 | Timing | M | **EAT midnight.** "Monday open" is 00:00 EAT (Sunday 21:00 UTC). Week codes, "results Monday" labels and the cap must not use server-local or ISO-calendar weeks. | All schedule math goes through `eat-day.ts`. Week identity and the cap are keyed by cycle id. Dates are printed absolute, in EAT. Red test across the midnight boundary. | Eng | S2 |
| MB-84 | Timing | M | **The Friday 18:00 boundary.** The close needs one authoritative instant. The last cancellable purchase is at 17:55. S9's saved deposit bet must never place a Millionea ticket automatically, and must be refused after the close. Between Friday 18:00 and Monday 00:00 no week is on sale. | The close is exclusive and checked on the database clock inside the lock. A purchase whose lock wait crosses 18:00 is refused. The saved bet carries the slip or is refused for MASWALI. The page shows "next week opens Mon 00:00 EAT" and has no pre-sale. | Eng, Design | S3, D1 |
| MB-85 | Timing | M | **Holiday weeks.** Holidays are not modelled. 25 Dec 2026 and 1 Jan 2027 are Fridays, so the default close falls on a public holiday. Boxing Day; Eid moves (lunar); 9 Dec falls mid-week; US Thanksgiving is 26 Nov with a half-day on Friday 27 Nov. Days of national mourning cancel fixtures in bulk. | A holiday review in the pre-open checklist. The officer may move the close (R-WEEK). An exchange calendar check at open. A rule capping correlated voids (MB-20). Run or skip: OD-27. | Ali, Eng | S4 |
| MB-86 | RG/Comp | M | **A winner has died.** No procedure exists anywhere on the platform. | Freeze the account. Compliance pays the estate on proof (death certificate and letters of administration), audited. Script and legal review. OD-07. | Ali | S4, S6 |
| MB-87 | RG/Comp | M | **How the chance of winning is stated.** A jackpot invites "odds" claims. "1 in 1,024" is true only for coin-flip questions. | No numeric odds. State that "every one of the 10 counted questions must be right", publish a record of weeks won and not won, and put the RG link on the slip. OD-24. | Design, Ali | D1, S6 |
| MB-88 | Legal | M | **Winner publicity.** Big winners will be asked for publicity. Privacy law (PDPA) and the winner's own safety are at stake. | Public pages are anonymised. A name or photo appears only with written opt-in. Marketing never names a winner without consent. OD-30. | Ali | S6 |
| MB-89 | Player UX | L | **Several tickets at once, and quick picks.** One confirm for several different slips; a random "lucky dip" is not in the PDF. | Multi-ticket slip tied to buying N in one transaction (MB-31). Quick pick: OD-29. | Design, Ali | D1, S5 |
| MB-90 | Platform/IA | M | **Player statistics.** "View performance" on `/positions`, leaderboard ROI tiers, `/results`, streaks and achievements would mix 1,000 TZS LOSS tickets into Yes/No statistics through "ALL" reads. | Each reader names its MASWALI handling (exclude, or show as its own section), held by `test:product-line`. | Eng | S5 · ✅ S0.5 `9834aaf0` for the classification: each reader names its MASWALI handling |
| MB-91 | Admin/Ops | M | **Disputes after settlement.** Player complaints, GBT escalation and the remedy for a proven error. Desk scripts are also missing for a death, a reversed deposit, a holiday, a wrong question and a week void. | A complaint path with a response time and an evidence pack per week (MB-92). Remedy per OD-09. Extend the MB-64 scripts. | Ali, Eng | S6 |
| MB-92 | Reports | H | **The Board asks for an audit.** No per-week evidence export exists, and the AUDITOR role has no read access. | A per-week export: snapshot, questions, seal and void audit rows with evidence captures, objections, the commitment, the settlement group's ledger lines, guarantee funding entries, the integrity and cluster reports, ticket CSV. Read-only AUDITOR access to `/admin/maswali`. Kept 7 years. | Eng | S6 |
| MB-93 | Notifications | M | **Push or SMS fails.** SMS is OTP and marketing only, with a 20,000 TZS credit floor kept for codes. Push reaches subscribers only. Email goes only to confirmed addresses. | The bell and the ticket page are the record. Log delivery status. Check SMS credit before a winner batch. Alert when a winner has had no notice for 24h. A desk list of uncontacted winners. | Eng | S6 |
| MB-94 | Security | H | **An officer account is compromised.** One officer seals and voids. Guarantee funding, sunset and pause move money or stop sales. | Step-up re-authentication and typed confirmation on seal, void, fund, sunset, pause and settle release. Alert on a seal from a new device. All audited. | Eng | S4, S7 |
| MB-95 | Security | M | **Ticket access and pick privacy.** `/millionea/tickets/[ticketId]` could be read by guessing ids, picks could leak through SSE or the API, and OG share images could expose picks before the close. | Owner-only access; ids that cannot be enumerated. Inclusion proof to the owner only. No pick aggregates before settlement. Share images only after the close. | Eng | S5, S7 |
| MB-96 | Security | M | **Winner account takeover.** A jackpot winner is a SIM-swap target. | Alert on a password reset, number change or new device followed by a withdrawal soon after a credit. Any hold would need its own ruling, because 2026-10-10 removed withdrawal holds. | Eng, Ali | S7 |
| MB-97 | Performance | M | **The week page in the rush.** Rendering per request, SSE fan-out to every viewer, and the cost of computing Merkle proofs. | Cache the week page, with the headline on a coalesced SSE event and polling or no ticker on 2G. Precompute proofs at the close. Include in the S7 load test. | Eng | S5, S7 |
| MB-98 | Legal | L | **Sports data rights.** Source terms of use for fixture and price data used in a betting product. | Check the terms for each trusted source. Record them in the source registry. | Ali | S4 |
| MB-99 | Platform/IA | H | **The rulebook needs five corrections before the door is written:**<br>(a) MR-9/MR-13: an unsalted `selectionsHash` can be brute-forced (MB-32);<br>(b) MR-16: the window opens when the graded set is final and reopens on any change, not "at the last gating seal" (MB-23);<br>(c) MR-26: POOL must end at exactly 0, with no `settlementPayoutEntries` tolerance (MB-02);<br>(d) no "one closed unsettled week" index (MB-16);<br>(e) MR-19 reconciled with "seal all 15 by default" (MB-14). | Fold all five into door §6 and §7 before S1. | Eng | S0, S1 |

**Prompt topics → rows:**
- first week: MB-73
- last week: MB-25, OD-03
- kill switch: MB-62, MB-78
- wrong question: MB-79
- ambiguous source: MB-80, MB-22
- midnight and Friday 18:00: MB-83, MB-84, MB-31
- holiday weeks: MB-85
- overlapping weeks: MB-16
- self-excluded, closed or suspended winner: MB-44
- deceased winner: MB-86
- refused winner (under-18, sanctions, duplicate identity): MB-43
- deposit reversal: MB-74
- legacy bonus: MB-76
- disputes: MB-91, MB-24
- care desk: MB-64, MB-91
- Board audit request: MB-92
- data export: MB-67, MB-92
- tax report: MB-65, MB-77
- statutory pack: MB-66
- accessibility: MB-58
- Chinese locale: MB-59
- low data: MB-57, MB-97
- push and SMS: MB-93
- classic entry point: MB-55, OD-23

---

## §9 · Owner decisions OD-01 … OD-30 — all accepted 2026-10-16

**Ali, 2026-10-16: "Accept all recommendations".** Read every "Rec" below as the ruling, with three explicit
answers given the same day, which override the text where they differ:
- **OD-01 · licence basis:** Ali's own dated ruling is enough — not the Gaming Board's written note. Risk accepted.
- **OD-02 · guarantee funding:** pre-fund TZS 2,000,000 by the audited owner ceremony before week 1.
- **OD-05 · objections:** one 24-hour window per week, never closing before 12:00 EAT, ruled by another officer.

**Still owed by someone other than Ali:** Finance's written confirmation of the tax-report lines in OD-08 and of no
withholding on winnings (MB-77). Both sit on Gate B (§6) — they block going ACTIVE, not the build. Each item stays
changeable later by a new dated ruling.

These are only the items his rulings do not cover, ordered by how much they block. "Rec" is the recommendation.

**Block S1 (the law) or the first real ticket. Decide in S0.**

1. **OD-01 · Licence basis (OPEN-1, MB-39).**
   - Options: (a) the GBT's written confirmation; (b) Ali's dated ruling recording a verbal GBT answer and accepting the risk; (c) neither.
   - Rec: (a), falling back to (b) before the live drive. Either one must name the fixed price, the house floor, the rollover across weeks, the payout-only 13% fee and the sunset. The code gate opens only once one is recorded.
2. **OD-02 · Guarantee funding (OPEN-6, MB-03).**
   - Options: (a) pre-fund; (b) pay from house cash at payout. Level: 1M per unsettled week, or 1M minus the confirmed carry.
   - Rec: (a). The Owner deposits 2,000,000 before week 1 through an audited owner-capital ceremony. A week opens only if the fund is at least Σ (1,000,000 − confirmed carry-in) over every unsettled week, including the new one. Settlement aborts rather than pay less.
3. **OD-03 · Sunset and kill semantics (OPEN-7, MB-25, MB-78).** These must bind from week one.
   - Rec:
     - announce at least one full week ahead; the final week runs normally; score = graded correct answers out of 10, shared per ticket;
     - 13% fee and levies apply at the sunset payout; no top-up unless a 10/10 exists;
     - if the final week voids or sells nothing, the next scheduled week becomes final;
     - an Owner-ordered stop mid-week lets the current week run as the final week;
     - a regulator-ordered stop refunds the current week, and the pool goes to the highest-scoring tickets of the last fully graded week unless the regulator directs otherwise;
     - Owner-only ceremony with typed confirmation.
4. **OD-08 · Tax and statutory pack (OPEN-2, MB-65/66/10/77).** Finance and GBT decide. This blocks the first month-end, because the first no-winner week jams filing of the whole book.
   - Rec:
     - Report 1 gains three lines: carried to the next jackpot, jackpot brought forward, house floor top-up;
     - Report 2 files the booked 13% of J;
     - statutory GGR is unchanged, with added liability and guarantee lines and a note;
     - the levy on the house's own top-up and the period shift are recorded as accepted;
     - no withholding tax on winnings, confirmed in writing.
5. **OD-04 · Void grounds and wrong questions (MB-18, MB-79).**
   - Options: (a) a closed list; (b) the Yes/No discretionary refund carried over.
   - Rec: (a). The list:
     - not played or finished by the void deadline;
     - abandoned with no official result;
     - no datum from the primary or fallback source;
     - outcome publicly settled before the close;
     - criterion materially wrong, or EN/SW divergent, found before the close or upheld by an objection.
   - A platform error voids the whole week, never a single question. English stays binding, but a divergence counts as ambiguity.
6. **OD-05 · Objection model (MB-23, OPEN-12).**
   - Options: (a) the live platform setting (1h); (b) one window per week, frozen at open.
   - Rec: (b):
     - length 24h (payout still lands by Tuesday), never closing before 12:00 EAT;
     - opens when the graded set is final;
     - restarts once after an upheld objection that changes grading;
     - ruled by an officer other than the sealer, with the Owner as fallback;
     - REINSTATE is available.
7. **OD-06 · Settlement release.**
   - Options: (a) automatic once the gate passes; (b) the system prepares a preview and one accounting officer releases it.
   - Rec: (b), because credit is instant and withdrawals are not held. Alert if not released within 4 hours.
8. **OD-07 · Forfeited and unpayable money (MB-43, MB-74, MB-86).**
   - Rec:
     - a disqualified ticket's share returns to the jackpot account, never the house; fee and levies stay as booked; other winners are not re-paid;
     - a minor's stakes are refunded;
     - a winning ticket funded by a reversed deposit is frozen, then forfeited to the jackpot;
     - a deceased winner's share is paid to the estate on proof.
9. **OD-09 · Correcting results (MB-24).**
   - Rec: before payout, an officer may correct their own seal inside the window, which restarts it. After payout, never claw back; tickets wronged by a proven error are compensated from operator funds, never from the jackpot.
10. **OD-10 · Sales ran after an event started (MB-27; MR-5 is derived, so confirm it).**
    - Options: (a) void the question for every ticket and apply the reserve; (b) refund only the tickets bought after the actual start.
    - Rec: (a). It keeps the committed ticket set intact and removes any advantage. Pull the close in as soon as a move is known.
11. **OD-12 · Insider edge cases (OPEN-8, MB-41).**
    - Rec:
      - refuse a staff promotion or desk designation while the account holds an unsettled ticket (Owner override refunds the tickets first);
      - QA accounts are marked and barred from public weeks;
      - the Terms bar staff households;
      - AGENT accounts may play;
      - the desk refusal wording stays neutral under D19.
12. **OD-13 · Winners in locked accounts (MB-44).**
    - Rec: a Compliance officer pays to the registered number at the holder's request. Identity and email rules are unchanged. No marketing goes with the notice.

**Block S2/S4 (engine and admin).**

13. **OD-14 · How questions are built (MB-36, MB-20, MB-37, OPEN-11).**
    - Options: (a) warn only; (b) hard refusal.
    - Rec: (b), with a typed Owner override:
      - every question carries an estimated probability between 30% and 70%, with its source;
      - no shared events or dependent pairs;
      - per competition, day and source caps (at most 4 per competition; reserves drawn from at least 3 sources);
      - sports only from competitions with public integrity monitoring.
14. **OD-09b · Void deadline (MB-19).**
    - Rec: scheduled start + 48h, capped at Monday 23:59 EAT of the results week, printed on each question.
15. **OD-15 · Close buffer (MB-29).**
    - Rec: sales close at least 30 minutes before the earliest of the 15 events (frozen per week). The commitment is published inside that buffer.
16. **OD-26 · Authority (MB-60).**
    - Rec: a question's result or void by one trading officer; a manual whole-week void by Compliance with a typed reason; the sunset and the guarantee funding by the Owner only.
17. **OD-16 · What "player" means for the cap, and covering (OPEN-9, MB-35).**
    - Options: (a) per account, with cluster detection; (b) also cap per deposit number.
    - Rec: (a) for v1, reviewed by Compliance before settlement. Add (b) only if clusters appear.

**Block S3/S5/S6 (money path, surfaces, legal).**

18. **OD-17 · Loss limit (MB-40).**
    - Rec: Millionea winnings never offset the 24h loss limit. A week-void refund offsets only stakes placed inside the same 24h window.
19. **OD-18 · Terms §10 notice (MB-69).**
    - Rec: the new section binds only on purchase, with the version stamped on each ticket. Existing terms do not change, so no 14-day notice is needed. Get a legal sanity check first.
20. **OD-19 · Dust and the winner floor (OPEN-4, MB-09).**
    - Rec: equal floored shares. The remainder goes to the jackpot account, and any top-up is reduced by it. Millionea is exempt from Invariant 1, which is disclosed in the rules and in chat.
21. **OD-20 · Agents and invites (OPEN-3).**
    - Rec: no agent commission and no invite first-bet credit for v1. Bump the agent terms version. Review after three months.
22. **OD-24 · Display set (MB-38, MB-53, MB-56, MB-87, OPEN-10/14/15).**
    - Rec:
      - no public alive count before settlement;
      - the carried figure only on the public week page, not on the losing ticket;
      - no flash on the figure unless an N-slot proposes a neutral one;
      - identical tickets allowed within the cap, with "same picks as ticket n";
      - no numeric odds.
23. **OD-25 · Winner SMS (MB-68).**
    - Rec: one service SMS per winning holder, with no link, stating the amount and "open the app". Non-holders get only approved marketing.
24. **OD-27 · Holiday weeks and bonus turnover (MB-85, MB-76).**
    - Rec: run every week, with a holiday review before open. A week may be skipped with notice, and the carry waits. Millionea tickets accrue no bonus turnover.
25. **OD-29 · Quick pick (MB-89).**
    - Rec: no quick pick in v1. A slip with several tickets, each with its own picks, is allowed.
26. **OD-30 · Winner publicity (MB-88).**
    - Rec: never name a winner without written opt-in.

**Block launch logistics (S8 and the design round).**

27. **OD-21 · Live drive (MB-45).**
    - Rec: a private, unlinked week whose unwon money is refunded and kept out of the measures. Public week 1 starts at the floor with no carry.
28. **OD-22 · S16 baseline (OPEN-13).**
    - Rec: the five measures exclude Millionea. Harm markers are reported for all players and for players without a ticket, and judged on the latter. Amend item 8 by a dated ruling.
29. **OD-23 · Classic-shell entry point (OPEN-5).**
    - Rec: Millionea under More at every width, plus one card at the top of the Markets board. The rail does not change. D2 proposes the exact form.

## §10 · Design round R2 — "Daftari na Muhuri · The Register and the Seal"

> ⚠️ **SUPERSEDED BY THE DELIVERY (2026-10-17).** This section is the panel's concept as commissioned. The build follows
> the filed delivery [`design-system/v6-2026-10-17-millionea/`](design-system/v6-2026-10-17-millionea/INHERIT-MANIFEST.md)
> and its manifest's L-rows. Where this section differs, the delivery and Ali's 2026-10-17 rulings win. These differences are known:
> - **The slip.** The slip's Endelea is brand primary; gold sits only on the confirm sheet's armed commit.
> - **Words.** The main balance is "salio kuu", never "salio halisi".
> - **The closing pill** shows only in the last hour (Q5).
> - **The seal door.** It reads "Ona matokeo", not "Fungua" (Q7).
> - **N2's press stops** are 1.02 / 0.98, the `seal-place` stops in the adopted N-block.
> - **The "cannot win" line** is ruled, in the owner's wording.
> - **One grading module.** `maswali-score.ts` is the one implementation (L9).
> - **The home card.** It sits after the head and is a server component outside `home-lazy.tsx` (O-7).
> - **Routes.** The slip never joins `MONEY_ROUTE`.
> - **The receipt's legal line** follows the real resolution mode (L3).
> - **The filing** is `v6-2026-10-17-millionea/INHERIT-MANIFEST.md`.
> - **Icons (Ali, 2026-10-17):** every icon the delivery drew — its three adopted glyphs and the house-idiom icons inside
>   its frames — is replaced by the Phosphor icons of §10c. Where a frame shows a hand-drawn mark, the built screen shows
>   §10c's Phosphor icon for that meaning.

**What is commissioned.** The commission Claude Design receives (D1 sends it) is
[`design-brief/maswali-2026-10/PROMPT.txt`](design-brief/maswali-2026-10/PROMPT.txt), with its brief, predicted output
and receiving protocol beside it. Where the spec below and the prompt differ, the prompt wins: it carries the later
corrections ("salio kuu" for the main balance because "halisi" means NET in the dictionary; the closed category
labels; N2's press stops 1.02/0.98 from `seal-place`; the gold allow-list including the shipped deposit doors; no
jackpot figure on any held-ticket surface; the classic entry drawn as ruled; N4 offered as one bold slot).

**How it was chosen.** Three concepts were drawn independently — Hati na Muhuri (the deed and the seal), Sindano Kumi
(ten needles) and Ngazi (the ladder) — and a five-judge panel (brand, motion, responsible gambling, Swahili mass-market
UX on low-end Android, front-end engineering) scored them 54, 48 and 53 of 70, then grafted the best of each onto the
winner. The needles lost on law: borrowing the needle's identity motion breaks §M8, ±14° is about 1.5px at 14px, and
the pick letter "N" means YES in Swahili but NO in English.

**Still Ali's (D3):** N1–N4 yes or no, the `millionea` product glyph, the IMESHINDA status tone, the home-card position
and the A1–A5 label. Every other item the spec below marks OPEN was settled by the accepted batch (§9).

The judged concept follows, as the panel wrote it.

#### 1. The idea

**In one line:** every ticket is an entry in the week's public register. Every result is stamped onto it along the mark's own −14° axis. Every shilling is a line in the ledger. Only ten matching marks in an unbroken line open the Seal.

*Daftari* is the word every Tanzanian knows twice: the school exercise book a teacher marks with ✓ and ✗, and the official register (*daftari la wapiga kura*, the voter register). That double meaning is the design. The product feels familiar the way a daftari is familiar, and official the way a register is official.

The metaphor is art direction only. Player copy keeps the dictionary words: *tiketi*, *bwawa*, *akiba* (reserve), *batili* (void), and *Daftari la Wiki* (the week's register).

The design is built from five objects. All of them are made of parts 50pick already ships.

1. **The ticket (a document with a stub).** Fifteen numbered clauses:
   - Ten mains, 1–10, on the flat rung.
   - Five reserves, A1–A5, below a ruled divider on `.mat-inset` (motion.css:394). The divider's heading carries the rule.
   - Under a perforated rule sits the stub: serial, week, TZS 1,000, purchase time and the short question-set hash. The perforation is the `ticket` glyph's own notch line, drawn at document scale.
2. **The Seal Line (the instrument).** Ten sockets in one row, with five smaller annex sockets beneath. Every socket is a member of the r8.6 status-ring family in `glyphs.tsx`.
3. **The ledger (the money).** The jackpot figure is never a hero number. It is a line in a short public ledger, in mono neutral ink, with the R-HEADLINE rule attached.
4. **The week strip.** Three static phases in plain words, with nothing ticking.
5. **The Seal.** The existing Struck Seal, unchanged except that it does not count. It is reached only through an unbroken line of ten matches, and on the player's tap.

**The socket grammar.** Four shapes in one ring, each carrying a word wherever there is room.

| State | Glyph | Ink | Word (SW / EN) |
|---|---|---|---|
| Awaiting the event | `clockPending` (dashed ring + hands) | `--text-muted` | Inasubiri / Awaiting |
| Pick matched | `sealCheck` (ring + tick) | `--success-fg`, never `--yes-*` | Imelingana / Matched |
| Pick did not match | `sealX` (the existing `voidX` geometry, renamed; zero consumers) | `--text-muted`, never rose | Haikulingana / No match |
| Not counted: a voided main, a voided reserve, or an unused reserve | **`sealNil`** (NEW: ring + level bar, the accountant's nil) | `--text-muted` (faint only if the rendered composite is at least 3:1) | Batili / Haikutumika |
| Reserve standing by | `clockPending` at annex size | `--text-muted` | Akiba |

**How each rule is taught, without a paragraph:**

| Rule (as ruled) | How the design teaches it |
|---|---|
| **15 picks, answered up front.** | The ticket has fifteen clauses. The sticky rail reads "Kuu 7/10 · Akiba 2/5" (mains 7 of 10, reserves 2 of 5). The pay control arms only at 15/15. |
| **A reserve counts only when a main question is voided, in order; a voided reserve is skipped.** | Annex sockets stay "Akiba" (standing by) whatever their event does. A reserve becomes a mark only after the Carry (N1) moves it into the vacated main socket. The annex socket keeps "→4". A voided reserve shows `sealNil` and "Batili", and the next reserve carries. |
| **More voided mains than valid reserves voids the week and refunds every ticket.** | A live line reads "Akiba halali zilizobaki: 4 kati ya 5" (valid reserves left: 4 of 5). When it can no longer cover the voided mains, the week band reads "Wiki imebatilishwa" and every stub rejoins (N3 reversed). |
| **The guaranteed floor and the rollover.** | The ledger has two lines, real money and the floor, and the jackpot line repeats the larger. When real money passes the floor, the floor line drops to muted ink but stays visible. |
| **The 13% fee is taken at payout, and only then.** | It appears in the R-HEADLINE everywhere. The ledger's fee line reads "—" until a payout. Rollover strata print "ada 0". |
| **An equal share per winning ticket.** | The win ledger reads "÷ tiketi 3 zilizoshinda" (÷ 3 winning tickets), and "× 2" when the player holds two. |
| **Sales close before the first event.** | Slip and hub print "Mauzo yanafungwa: Ijumaa 18:00" over "Tukio la kwanza: Ijumaa 19:30". The officer tool refuses any other order (R-WEEK), so the second time is always later. |

#### 2. Motion governance (applies to every moment)

1. **Each fact performs once, for its owner, then rests.**
   - A press, carry, cut, rollover or refund plays the first time *this player* views it after it happened. That is tracked by a server-side `lastViewedAt` per ticket and per player-week for hub notices.
   - After that, the moment renders as its end frame.
   - A poll never fires a ceremony. A data change while the player is viewing may fire N2 and nothing more.
2. **A backlog rests.**
   - If more than four facts are unseen, none of them animate.
   - The reckoning moment (M5 or M6) carries the beat instead.
   - Staggers never exceed 4 steps × `--m-stagger`.
3. **Presence routing follows §F9.**
   - A weekly settlement is almost always RETURNING. The AwaySummaryBar line is the door.
   - The seal opens only on the player's tap, or LIVE inside `MAX_LIVE_AGE_MS`.
   - Win and loss share `DWELL_RESULT_MS`.
4. **Every moment is one-shot.**
   - So each is visible on the `data-motion="reduced"` throttle tier, which is the target device.
   - No §6 entry is needed, and there are zero new loops.
5. **Budget.**
   - Only transform, opacity, the individual `translate` and `scale` properties, `clip-path` and `stroke-dashoffset` animate. No blur in any new motion.
   - At most 12 composited layers at once.
   - `will-change` is set only for the run and cleared on `animationend`.
   - One layout measurement before a run, none during.
   - At least 50fps measured on a device with 4 cores or fewer and 4GB RAM or less, at 360 (INTAKE §4b).
6. **Haptics.**
   - `confirm` on a purchase, and on a cancel the player makes inside 5 minutes.
   - `success` on the seal.
   - Nothing else: no haptic on close, results, voids, carries, rollover, a week void, or any render or poll.

#### 3. The screen set

Every money figure is `.amount`: mono, tabular, never letter-spaced, sized for `TZS 1,000,000+`, and U+2212 for negatives. Every page states its tier once in `<PageContainer>`, and each `loading.tsx` states the same tier. Titles use `text-title-lg` (28px). Swahili comes first: labels fit at 1.75× and are proven at 2.25×, with zero horizontal overflow at 360.

##### 3.1 Journey home card (the Maswali tab, `/`; ruled under R-PLACEMENT)

**Placement and build.**
- It sits after the head (`LazyHowToCard` and `HomeHeadline`) and before `HomeChips`, at every width (O-7, ruled 2026-10-17).
- The whole card is one `<Link>` to `/millionea`.
- It is a server component with no countdown and no poll. Its figure is fixed at render time.
- It loads through `home-lazy.tsx` so a classic visitor's first-load JS stays unchanged (§0h point 20).

**360.** A row of three:
- A 48px `IconPlate` in the how-to card's royal material, carrying the `millionea` glyph. Never gilt.
- A text column:
  - "Millionea · Wiki 42".
  - The R-HEADLINE: "Jackpot TZS 1,000,000 · inagawanywa sawa kwa kila tiketi ya 10/10 · ada 13% wakati wa malipo". It wraps freely and is never clipped.
  - The meta line: "Mauzo yanafungwa Ijumaa 18:00 · Tiketi zako 2/10".
- A chevron (`edge="end"`).

**768.** The same card, full column width. The figure moves to a right-aligned block and the meta line fits on one line.

**1280.** The card spans the board column above the card grid. Text sits on the left, the figure block on the right, all in one row.

**States:**
- Pre-sale: "Jackpot —" with "Inafunguliwa Jumatatu".
- After the close: "Matokeo 6 kati ya 15 yametolewa" (6 of 15 results out).
- Settled: "Wiki 42: tiketi 3 zilishinda" (3 tickets won) or "hakuna 10/10 · TZS 601,000 imeletwa mbele" (no 10/10; carried forward).
- Paused: "Millionea imesimamishwa kwa muda".
- Cooling-off or self-exclusion (`viewerDoorsFor.onBreak`): the card is not drawn.

##### 3.2 Classic-shell entry point (OPEN; recommendation)

- **(a) The same card at the head of the classic `/markets` board,** above the filters, at every width. Record it as a change to the accepted v3 discovery layer.
- **(b) "Millionea" as the first row of `NavMore`,** for signed-in players and guests. Guests reach the hub, and buying asks them to sign in.
- **(c) At 1024 and above, a row in the top bar's overflow menu.** No inline link: the row's own comments record it as over-subscribed.
- **(d) No bottom-rail slot.** The rail is five equal tracks with the centre coin.
- **(e) Classic `/positions`:** one NoticeBar-style row, "Tiketi za Millionea wiki hii: 2 →", only when the player holds tickets.

##### 3.3 Hub `/millionea` (`reading` tier)

**360, top to bottom:**
1. Page title "Maswali Millionea".
2. The week strip as a compact vertical list. The current phase is in `--text`, the others muted:
   - "Mauzo · Jumatatu – Ijumaa 18:00 EAT"
   - "Matukio · Ijumaa jioni – Jumapili"
   - "Matokeo na malipo · Jumatatu/Jumanne"
3. The pool block (`MaswaliPoolFigure`): the figure, the rule line, and the ledger:
   - Imeletwa mbele (Wiki 41) TZS 389,000
   - Mauzo wiki hii TZS 212,000
   - Pesa halisi TZS 601,000
   - Dhamana ya chini TZS 1,000,000
   - **Jackpot TZS 1,000,000**
   - Ada 13% · wakati wa malipo tu: —
4. The buy block:
   - A brand primary door, "Kata tiketi · TZS 1,000" (not gilt).
   - The existing `closing-pill` countdown, scoped to this block only.
   - "Tiketi zako wiki hii: 2 kati ya 10", with a row per ticket carrying a Seal Line at 18px.
5. "Maswali ya wiki": the fifteen public questions as compact rows. Each shows its number, its prose ("Je, …"), its event time, and once attested, the outcome stamp. Player picks never appear here.
6. Last week as one closed ledger row, e.g. "Wiki 41 · hakuna 10/10 · TZS 389,000 imeletwa mbele".
7. Links: "Jinsi ya kucheza" (how to play) and "Daftari la wiki" (the week's register).

**768.** The strip goes horizontal. The pool block becomes a two-column ledger table, and the buy block sits beside it.

**1280.** Two columns:
- Left (about 640px): the strip, the questions and last week.
- Right (about 400px, sticky): the pool block, the buy block and my tickets.

**Pre-close states:**
- If the previous week has not settled, the rollover line reads "— · inasubiri Wiki 41 ikamilike" and the figure is labelled "angalau" (at least). That is a true lower bound from the settlement function, never a guess (§C2, §F7).
- After the close, the buy block's door is replaced by "Fuatilia matokeo" (follow the results) and "Akiba halali zilizobaki" (valid reserves left).

##### 3.4 How to play `/millionea/how` (`reading` tier)

- **Four sentences:** answer fifteen; reserves count only for a voided main, in order; ten of ten shares the jackpot equally per ticket, with 13% at payout; nobody wins and the pool is carried forward.
- **A static example:** a Seal Line with "4 → A1".
- **A player-tapped "Tazama mfano" (see an example).** It plays N1 once on the example strip. It is the only demo in the product and it never auto-plays.
- **The PDF's worked ledger, labelled "Mfano" (example):** 1,050,000 − 136,500 = 913,500 ÷ 3 = 304,500.
- **The floor week:** 1,000,000 − 130,000 = 870,000.
- **The week timeline.**
- **A rules list:**
  - A cap of 10 tickets per week.
  - Real balance only.
  - A free cancel within 5 minutes, if the sales close is still far enough away.
  - Every event starts after the sales close.
  - Staff and house accounts cannot buy.
  - The sunset rule: if Millionea is ever stopped, the unwon pool goes to that last week's highest-scoring tickets.
  - A link to the register.

##### 3.5 The slip `/millionea/slip` (`reading` tier)

**360:**
- **Header:** "Jaza tiketi · Wiki 42". Below it, the two times stacked: "Mauzo yanafungwa Ijumaa 18:00" / "Tukio la kwanza Ijumaa 19:30".
- **Rules strip (three lines):**
  - "Akiba zinahesabiwa tu swali kuu likibatilishwa" (reserves count only if a main question is voided).
  - "Kikomo: tiketi 10 kwa wiki · hii ni ya 3" (cap: 10 tickets a week; this is your 3rd).
  - "Salio halisi pekee" (real balance only).
- **Ten main rows:**
  - A mono number and the question prose, starting "Je, …" and never clamped.
  - A muted meta line: source · event time.
  - NDIO / HAPANA at 44px.
  - At most one lit control per row. YES/NO ink appears only on the lit control; unselected controls stay `--border-control`.
- **Divider:** "Akiba · A1–A5 — zinahesabiwa tu swali kuu likibatilishwa, kwa mpangilio" (reserves count only if a main is voided, in order).
- **Five annex rows** on `.mat-inset`, with muted A-numbers. Tap size and contrast stay full.
- **Sticky bottom rail:** docked above the journey tabs, casting upward with `--shadow-overlay-up`.
  - `SteppedProgress` with the new `groups={[10,5]}` prop: "Kuu 7/10 · Akiba 2/5".
  - The pay control: disabled and neutral as "Jibu maswali 15" (answer 15 questions); `.gilt-metal` "Endelea · TZS 1,000" (continue) at 15/15 (§M3a).
  - The `closing-pill` lives here and nowhere in the chrome.

**768.** One column inside the reading tier. Each row's controls move to the right of its prose.

**1280.** Two columns. Questions on the left. On the right, a sticky panel replaces the bottom rail: grouped progress, a live 15-socket preview showing picks as "N/H" text (no lean), the price, the cap and the pay control.

##### 3.6 Confirm (a `.m-sheet-in` sheet with `.m-scrim`; a dialog from 640px up)

- Fifteen picks in a two-column compact list ("4 · NDIO"), the annex grouped and labelled.
- "TZS 1,000 · kutoka salio halisi (TZS 44,196)" (from your real balance).
- "Tiketi 3 kati ya 10 wiki hii" (ticket 3 of 10 this week).
- The cancel line, computed from the RULES 2.6 window measured to the sales close: "Unaweza kughairi bure hadi 14:07" (free cancel until 14:07). If there is no window, the line is absent.
- The fee rule line.
- The armed `.gilt-metal` "Lipa TZS 1,000" (pay). While the request is in flight it shows the kit `Spinner`.

##### 3.7 Purchase result (`OperationResultModal`; see M1)

- **Header:** variant `success`, `stripTone="brand"`, and the **new `stamp` prop** so the crest takes `.seal-commit`. Eyebrow "Tiketi imekatwa" (ticket cut); title is the serial "MLN-W42-004417".
- **Details:** Wiki 42 · TZS 1,000 (salio halisi) · Ghairi hadi 14:07 (cancel until 14:07).
- **Buttons:** primary "Tazama tiketi" (view ticket). There is no "buy another" button.
- **Also:** a secondary toast and `haptics.confirm()`.

##### 3.8 The ticket `/millionea/tickets/[serial]` (`receipt` tier, 560, at every width)

Top to bottom:
1. A status word with its §B11 tone, the serial and the week.
2. The Seal Line: mains at 24px, annex at 18px.
3. The fifteen clauses. Each shows the pick; after attestation, the outcome stamp and its socket. A voided main is struck and labelled "Batili → A1".
4. The perforated rule and the stub (serial, week, TZS 1,000, time, hash `7f3a…`).
5. While the cancel window is open: "Ghairi" (cancel) with a scoped countdown that is removed when the window expires.
6. Once sales close, a lock line on the stub: `lockSide` "Imefungwa Ijumaa 18:00 EAT".

##### 3.9 Tiketi zangu, Millionea segment `/millionea/tickets`

- **The switch.** It becomes **Maswali | Juu/Chini | Millionea**: a third link in `TicketSwitch`, with `TicketKind` gaining `"millionea"`. It stays `aria-current="page"`, and the 360 fit is proven at 2.25×.
- **Rows** are grouped by week, current week first. Each row shows the serial, a Seal Line at 14px, a status word, and the amount only when the ticket won (`.gilt-ink`).
- **Row text** matches the receipt byte for byte.
- **Layout:** 768 and 1280 keep the same list inside its tier.

##### 3.10 Live week (the ticket page, Friday to Monday)

- **Rows** fill in by question number. Sockets change by `GlyphSwap`; stamps land with N2.
- **One week-level line:** "Matokeo 6 kati ya 15 yametolewa · linalofuata Jumamosi 16:00" (6 of 15 results out · next Saturday 16:00).
- **No running score.**
- **A voided main** reads "Batili · akiba itachukua nafasi yake" (void · a reserve will take its place). No carry plays yet. "Akiba halali zilizobaki: 4 kati ya 5" is shown.
- **The "cannot win" line is OPEN** (§9). Recommended wording, which is provisional: "Kwa matokeo yaliyotolewa hadi sasa, tiketi hii haiwezi kushinda wiki hii" (on the results published so far, this ticket cannot win this week). Once it is shown, sockets keep updating but N2 stops pressing on that ticket.

##### 3.11 The reckoning (the week settles)

When all fifteen results are final, the substitution map is final too. Carries play (M4), then the win path (M5) or the loss receipt (M6).

##### 3.12 Substitution (M4)

- The voided main's socket becomes `sealNil` and its row is struck.
- The reserve token carries into that main socket and becomes ✓ or ✗ there.
- The annex keeps "→4".
- Unused reserves close as `sealNil` "Haikutumika" (not used).

##### 3.13 Win

- **Route:** the AwaySummaryBar line "Millionea Wiki 42: tiketi yako ilipata 10 kati ya 10 · Fungua" (your ticket got 10 of 10 · Open), then the ticket, then the Unbroken Line, then the seal (M5).
- **The win ledger after the seal** (`MaswaliWinLedger`, the receipt tier):
  - Jackpot TZS 1,050,000
  - Ada 13% −TZS 136,500. A small line notes TRA 10% and GBT 5% *of the fee*.
  - Kwa washindi (to winners) TZS 913,500
  - ÷ tiketi 3
  - **Kwa tiketi yako TZS 304,500** (to your ticket)
  - × 2 if the player holds two winning tickets, then **Jumla yako** (your total).
- **A floor week adds** "Nyongeza ya dhamana TZS 399,000" (house top-up). It is printed, and it never rolls.
- **Gold:** only "Kwa tiketi yako" and "Jumla yako" wear `.gilt-ink`. The jackpot line stays neutral even on a winning receipt.
- **Net line:** when the player's week spend exceeds the win, the net line prints with U+2212 (OPEN §9).

##### 3.14 Loss (receipt tier, 560)

- The headline "Haikushinda" (did not win), then the outcome first.
- The ten counted positions, each with pick, outcome stamp and socket (✓ in success ink, ✗ in muted ink). Carried reserves are shown inline: "4 → A1".
- **No score, and no line naming the misses.** The rows are the facts.
- One week line: "Tiketi 3 zilishinda wiki hii" (3 tickets won this week) or "Bwawa limeletwa mbele kwenda Wiki 43" (the pool is carried to Week 43).
- The finality line "Kila takwimu hapa ni ya mwisho — hakuna kinachodaiwa zaidi."
- The closing double rule (M6).
- **No buy control on the receipt.**

##### 3.15 Rollover (M7)

- A hub NoticeBar, once per player-week: "Wiki 41: hakuna tiketi ya 10/10. TZS 389,000 imeletwa mbele kwenye Wiki 42." It is past tense and has no call to action.
- Then the carry plays on the ledger.

##### 3.16 Week voided, and the player's own cancel (M8)

- **Week void:** a neutral band, "Wiki imebatilishwa: maswali makuu 3 batili, akiba halali 2 tu. Kila tiketi imerejeshwa TZS 1,000." (week voided: 3 mains void, only 2 valid reserves; every ticket refunded TZS 1,000). The stub rejoins. If the player is LIVE, a neutral `OperationResultModal` appears; otherwise a NoticeBar.
- **The player's cancel inside 5 minutes:** a neutral modal, "Tiketi imeghairiwa · TZS 1,000 imerudi kwenye salio halisi" (ticket cancelled · TZS 1,000 back in your real balance), with `haptics.confirm()`.
- The same reversed Cut plays for both.

##### 3.17 Daftari la Wiki (the public register) `/millionea/register` and `/[week]` (`reading` tier)

- **Access:** unauthenticated, rendered on the server, works without JavaScript. It follows the `/fairness` pattern.
- **Header:** the week, the question-set hash published at sales open, and its timestamp.
- **The fifteen questions as a table:** source, event start, the attesting officer's role, attested time, outcome, and the void reason (`maswali-void-reason`).
- **The substitution rule and map, plus a timestamped log:** "Swali 4 batili 2026-10-25 11:02 → A1".
- **The full ledger:**
  - Rollover in, tickets sold × 1,000, real money, floor, jackpot.
  - Winning tickets, the 13% fee with TRA/GBT of the fee, the house top-up, paid, the per-ticket share.
  - **The rounding remainder line**, and what was carried out.
- **The strata history:** "Wiki 40 · TZS 412,000 imeletwa mbele · ada 0", one row per carried week.
- **After settlement only:** the standing-count history ("tiketi zisizo na kosa baada ya kila tokeo", tickets without a miss after each result).
- **Last:** a link to the audit-chain entry on `/fairness`. No personal data.

##### 3.18 Refusals

Each is a `factual` toast with no haptic, or an inline notice. Each gives a reason and a next step in EN, SW and ZH. Warnings use amber, never claret.

| Case | Swahili draft |
|---|---|
| Cap reached | "Umefikia tiketi 10 za wiki hii. Wiki 43 inafunguliwa Jumatatu." |
| Sales closed | "Mauzo yalifungwa Ijumaa 18:00, kabla ya tukio la kwanza. Fuatilia matokeo hapa." |
| Insider (admin role or house/desk account) | "Akaunti za watumishi na za nyumba haziruhusiwi kununua tiketi za Millionea." (info tone) |
| Bonus offered | "Millionea inalipwa kwa salio halisi tu; bonasi haitumiki hapa. Salio halisi: TZS 4,000." Next step: Weka pesa (deposit). |
| Not enough real balance | The existing deposit door. |
| Product paused | A NoticeBar, "Millionea imesimamishwa kwa muda. Tiketi zilizonunuliwa ziko salama." No slip door. |
| Product stopped for good | The SUNSET line. |
| Cooling-off or self-exclusion | No door anywhere (`onBreak`). |

#### 4. Signature moments

##### M1 · The purchase ("Kukata Tiketi"): the modal stamp, then N3

**t0.** The player taps the armed gilt pay control. The kit `Spinner` shows while in flight.

**On success:**
- The sheet closes. `OperationResultModal` arrives with `.m-dialog-in` and `.m-scrim`.
- Its crest takes `.seal-commit` (`seal-place`, `--t-stage`, `--m-settle`) through the new `stamp` prop.
- `haptics.confirm()` fires once, then the toast.

**On the ticket's first view** (the player taps "Tazama tiketi"):
- t0: the perforation row reveals with `.m-axis-reveal` (`--t-stage`). The blade crosses on the mark's tilt.
- t0 + `--t-base`: the stub takes `.maswali-cut` (N3, `--t-base`). It settles 8px away, with one hair of overshoot.
- Done at about 520ms.

**Reduced motion:** the crest is static and the ticket renders at rest, separated.

**Budget:** 2 layers, plus the modal's own.

**Must never imply:** a prize. The stub is ink; the strip is brand.

##### M2 · Sales close: existing motion only

- **When:** LIVE on the slip or hub when the close time passes.
- **What moves:**
  - The band "Mauzo yamefungwa · Ijumaa 18:00" reveals with `.m-axis-reveal`.
  - The pay control leaves with `.m-out`.
  - The hub door swaps to "Fuatilia matokeo" via `.g-swap-in`.
  - The held ticket's stub gains its `lockSide` line with `.m-seal` (a dormant class adopted).
- **Haptic:** none; the lock is the platform's act.
- **Reduced motion:** the end state.

##### M3 · A result is attested ("Kugonga Muhuri"): N2

- **When:** a data change while viewing, or up to 4 attestations unseen on opening.
- **Stamp:** a mono block, "MATOKEO · NDIO" or "MATOKEO · BATILI".
  - Neutral `--text` on `--border-strong`, `--r-xs`.
  - It moves 8px *down the needle's own line* with `.maswali-attest` (`--t-base`, `--m-settle`), with a press of 1.02 → 0.98 → 1 (the `seal-place` stops).
- **Socket:** swaps by `GlyphSwap` (`.g-swap-out` `--t-quick`, then `.g-swap-in` `--t-base`).
- **Sameness:** identical for NDIO, HAPANA and BATILI, and for matched and unmatched rows.
- **Stagger:** at most 4 × `--m-stagger`.
- **Haptic:** none.
- **Reduced motion:** the stamp is present, `translate: 0 0`.
- **Budget:** at most 4 stamps and 4 swaps.
- **Must never imply:** a verdict on the player. The stamp states the world; the socket states the match.

##### M4 · The substitution ("Kubeba"): N1, with existing parts

- **When:** the substitution map becomes final, which happens only when all fifteen are final. So there is never an "un-carry".
- **t0:**
  - The voided main's socket swaps to `sealNil`.
  - A 1px strike draws through its row with `.m-draw` (`--t-max`, settlement) in `--border-strong`. The prose stays at 4.5:1 or better.
- **t0 + `--t-base`:**
  - The annex token (its socket plus the mono "A1") takes `.maswali-carry` (`--t-move`, `--m-settle`).
  - It goes from the annex position and 0.75 scale to the main socket at 1.
- **On `animationend`:**
  - The token's socket swaps from `clockPending` to `sealCheck` or `sealX`.
  - The annex position shows "→4".
- **Several carries:** they stagger, capped at 4 steps. A voided reserve stays at `sealNil` "Batili" and is visibly passed over.
- **Total:** about 780ms.
- **Haptic:** none.
- **Reduced motion:** strike drawn, token in place, "4 → A1" printed.
- **Budget:** at most 5 composited tokens plus 5 one-path strikes.
- **Must never imply:** a rescue or luck. Timing and copy are the same whether the reserve matched or not. The caption reads "Swali 4 limebatilishwa; akiba A1 imechukua nafasi yake" (question 4 was voided; reserve A1 took its place).

##### M5 · The win: the Unbroken Line (existing `.m-draw`), then the Struck Seal

- **When:** the player taps the AwaySummaryBar line, or LIVE within `MAX_LIVE_AGE_MS`. Never from a poll.
- **t0:** one SVG hairline through the centres of the ten `sealCheck` sockets draws on with `.m-draw` (`--t-max`, `--m-glide`) in `--success-fg`.
  - A line is drawn only when it is unbroken, so a loss never shows a partial line.
- **t0 + `--t-stage`:** `dispatchWinCelebration` fires with **`roll: false`** (the new payload flag).
  - It routes `RollingAmount` through its existing snap path: the amount lands final and the gilt strike is colour only.
  - Everything else is unchanged: `.seal-arrive`, `.needle-sweep`, `.seal-cascade`, `.seal-mark-flip`, `.seal-sheen`, the `.gilt-metal` Continue button, `haptics.success()`, and 7s.
- **One seal per player-week.** Several winning tickets in a week sum to one figure (§F9.4: every result is a win). The ledger then shows × N.
- **After the seal:** the win ledger cascades with `.seal-cascade` and the line rests on the ticket.
- **Reduced motion:** the line is present and the seal fades.
- **Budget:** 1 path, plus the existing seal.
- **Must never imply:** that 9/10 is partial. There is no tier escalation; the seal is the one every win gets.

##### M6 · The loss: the closing rule (existing)

- **When:** a settled receipt opens. This covers losses, the win receipt after its seal, and refunds.
- **What moves:** two hairlines draw under the last ledger line with `.m-draw` (`--t-max`). The timing is identical for every outcome, inside the same dwell.
- **Haptic:** none.
- **Reduced motion:** the rules are drawn.
- **Must never imply:** "so close". There is no score, no emphasised row, and no mark or needle on the receipt.

##### M7 · Rollover: N1 reused, plus `.m-tick`

- **When:** the first hub view after a week with no winner.
- **What moves:**
  - The closed week's carried figure, as a mono text cell, takes `.maswali-carry` (`--t-move`) to the new week's "Imeletwa mbele" line. Its value never changes in flight.
  - Then the jackpot line takes `.m-tick` only if the larger-of-two value changed.
- **Total:** about 560ms.
- **Haptic:** none.
- **Reduced motion:** both lines static.
- **Must never imply:** that the house top-up rolled, or "bigger next week, buy now".

##### M8 · Refund or cancel: N3 reversed, plus existing parts

- **What moves:**
  - The stub takes `.maswali-cut-undo` (`--t-base`, `--m-glide`) and rejoins. The perforation stays as the record.
  - The band "IMEREJESHWA · TZS 1,000" reveals with `.m-axis-reveal`.
  - On a week void, each voided main shows the M4 strike with no carries.
  - The M6 closing rule ends it.
- **Haptic:** `confirm` only for the player's own cancel.
- **Never:** claret, red, or an error crest.

##### M9 · The example (How to play)

- **When:** only when the player taps "Tazama mfano".
- **What moves:** N1 plays once on a static example strip. It never auto-plays and keeps no seen-key.

#### 5. The new motions, for Ali's yes or no

All three are one-shot and filed in `motion.css`. Each keyframe goes in its Keyframes block and each class in its Utilities block, with calm branches added to **both** clamp lists that already exist: the `prefers-reduced-motion` list and the `html.kp-reduce-motion` list (motion.css about 596–613).

- **No new token, curve or duration.** Each "from" frame reads runtime data bindings or existing tokens.
- **No `--m-pivot`.**
- **The names are new,** so `test:keyframes` passes.

```css
/* N1 Kubeba / The Carry — Millionea only (DA §M8 exception, Ali yes <date>) */
@keyframes maswali-carry { from { translate: var(--carry-dx) var(--carry-dy); scale: var(--carry-s, 1); } to { translate: 0 0; scale: 1; } }
.maswali-carry  { animation: maswali-carry var(--t-move) var(--m-settle) both; animation-delay: calc(min(var(--i, 0), 3) * var(--m-stagger)); }

/* N2 Kugonga Muhuri / The Attestation Press — travels on --m-tilt (first consumer) */
@keyframes maswali-attest {
  0%   { opacity: 0; translate: calc(var(--sp-2) * sin(var(--m-tilt))) calc(-1 * var(--sp-2) * cos(var(--m-tilt))); scale: 1.02; }
  60%  { opacity: 1; translate: 0 0; scale: 0.98; }
  100% { opacity: 1; translate: 0 0; scale: 1; } }
.maswali-attest { animation: maswali-attest var(--t-base) var(--m-settle) both; animation-delay: calc(min(var(--i, 0), 3) * var(--m-stagger)); }

/* N3 Kukata Tiketi / The Cut — the end frame IS the layout; the direction comes from --cut-from */
@keyframes maswali-cut { from { translate: 0 var(--cut-from); } to { translate: 0 0; } }
.maswali-cut      { --cut-from: calc(-1 * var(--sp-2)); animation: maswali-cut var(--t-base) var(--m-settle) both; }
.maswali-cut-undo { --cut-from: var(--sp-2);            animation: maswali-cut var(--t-base) var(--m-glide)  both; }
```

| # | Name | Purpose | Rung | Law line for DA §M8 (Millionea exception) | Fallback without it |
|---|---|---|---|---|---|
| N1 | Kubeba · The Carry | Teaches reserve order and "carried, never lost". Shared by substitution and rollover. | `--t-move` (more than 200px at 360) · `--m-settle` | "In Millionea only, a reserve token or a carried figure travels once, per viewer, from where the rule takes it to where the rule puts it; never on a timer, never counting." | `GlyphSwap` in place, plus the printed "4 → A1". |
| N2 | Kugonga Muhuri · The Attestation Press | One officer-attested result lands as a stamp. Teaches R-RESOLUTION. | `--t-base` (8px; results are settlement, so one rung up) · `--m-settle` | "A Millionea outcome stamp travels the mark's −14° axis by `--sp-2` without `--m-pivot` and without touching the mark; identical for every outcome." | The stamp appears with `.g-settle`. |
| N3 | Kukata Tiketi · The Cut | The purchase document issued; reversed, the money returned. | `--t-base` (8px; money moves it one rung up) · `--m-settle`, or `--m-glide` for undo | "A Millionea stub separates once when a ticket is paid and rejoins once when its money returns; neutral ink, never gold." | `.m-seal` on the stub. |
| N4 | **Unspent** | The win prelude is built from existing `.m-draw`. C1's gather and C2's needle alignment were judged and rejected. | — | — | — |

**For all three:**
- **Reduced motion:** both clamps set `animation: none`, so the layout's own end frame shows and nothing is invisible.
- **Throttle tier:** plays at full duration.
- **Haptic:** none is fired by the motion itself.
- **Fallback for older engines:**
  - If CSS `sin()` and `cos()` are unsupported, N2's "from" translate is dropped at parse time, so the stamp only scales and fades.
  - If `var()` inside keyframes misbehaves on a measured WebView, the same classes switch to a `translate` transition. The seal-recoil precedent covers the individual `translate`.

#### 6. Components

##### New (code modules named `maswali-*` per R-NAME)

| Component | What it is |
|---|---|
| `maswali-pool-figure.tsx` | An **unearned surface**: the figure, the rule and the ledger. It must contain zero gold. |
| `maswali-win-ledger.tsx` | The earned lines only. |
| `maswali-seal-line.tsx` | Sizes 24/18/14; the socket grammar; FLIP measurement for N1. |
| `maswali-slip.tsx` | The page, built from the existing pick controls. |
| `maswali-ticket.tsx` | The document, the perforation and the stub. |
| `maswali-week-strip.tsx` | The static three-phase strip. |
| `maswali-home-card.tsx` | Shared by the journey home and the classic board. |
| `maswali-outcome-stamp.tsx` | The N2 stamp. |
| `maswali-unbroken-line.tsx` | One SVG path for M5. |
| Register pages | `/millionea/register` and `/[week]`. |
| `src/lib/maswali-substitution.ts` | A pure function from mains, reserves and voids to the counted set and the display map. It is referenced from RULES.md. |
| `src/lib/maswali-void-reason.ts` | Void-reason words. |

##### Reused, each with at most one new prop

| Component | Change |
|---|---|
| `SteppedProgress` | `groups` |
| `OperationResultModal` | `stamp` |
| `WinCelebration` payload | `roll: false` |
| `TicketSwitch` / `TicketKind` | `"millionea"` |
| `AwaySummaryBar`, `NoticeBar`, `GlyphSwap`, `IconPlate`, `PageContainer`, `PageHeader`, `Tabs` (link rail), the `factual` toast, `Spinner`, `.closing-pill`, the modal sheet, `.mat-inset`, `.gilt-metal`, `.gilt-ink`, `.amount`, the `/fairness` pattern, `HowToCard` anatomy | Reused unchanged. |
| `side-label.ts` | Gains `productLine` "millionea" with no default. |
| `status-tone.ts` | Gains new rows. |

#### 7. New design facts and where each is filed (DESIGN_AUTHORITY §0)

**Motions**

| Fact | Where it is filed |
|---|---|
| **N1, N2, N3** | Keyframes, classes and both calm branches in `src/app/motion.css` with a "why" comment. The law is a dated "Millionea exceptions" paragraph in DA §M8, with Ali's quote. A one-line pointer goes in §M6. |
| Motion docs and provenance | `docs/design-system/v2-2026-07-27/08-motion/`; provenance in `07-provenance/CHANGELOG.md`. |
| **N4** | Recorded as deliberately unspent in the same §M8 paragraph. |

**Glyphs**

| Fact | Where it is filed |
|---|---|
| **Glyph `sealNil`** (ring r8.6 + level bar) | A new key in `glyphs.tsx` through `G`, proven at 14/18/24px. |
| **Glyph `millionea`** (the R1 coronet; the supa and mini tier glyphs are not merged, since there are no tiers) | A new key in `glyphs.tsx`. Needs Ali's yes as a product mark. |
| **Rename `voidX` → `sealX`** (zero consumers) | `glyphs.tsx`. A session-level technical call; recorded in provenance. |

**Words and tones**

| Fact | Where it is filed |
|---|---|
| **§B11 rows**, filed in `src/lib/status-tone.ts` | Ticket rows: INASUBIRI (neutral), IMESHINDA (success word; gold only on the amount; **Ali rules this one, because it repaints money**), HAIKUSHINDA (neutral), IMEREJESHWA (neutral), IMEGHAIRIWA (neutral). Week rows: WAZI (brand); IMEFUNGWA, MATOKEO YANATOLEWA, IMEKAMILIKA (never gilt) and IMEBATILISHWA (all neutral). Each exception goes in `STATUS_TONE_EXCEPTIONS`. |
| **Laws** | §C3: the R-HEADLINE form for Millionea. §M3: the jackpot is unearned. §F9: weekly routing and one seal per player-week. §K8b: the home card and the third Tiketi kind, as ruled 2026-10-16. The same deviation is recorded in the v5 `INHERIT-MANIFEST.md`. |
| **The seal's `roll: false`** | A §M7 note: "Millionea seals do not count (Ali, 2026-10-16)". |

**Code and process**

| Fact | Where it is filed |
|---|---|
| **Routes in `src/lib/surfaces.ts`** | `COMMIT_ROUTE` gains `/^\/millionea\/slip$/` and `/^\/millionea\/tickets\/[^/]+$/`. `JOURNEY_ROUTE` gains exact entries for `/millionea`, `/millionea/slip`, `/millionea/tickets` and `/millionea/tickets/[serial]`. If the fidget covers the sticky pay control at 360, the slip also joins `MONEY_ROUTE`. |
| **Guard** | `test:gold-is-money` gains an `UNEARNED_SURFACES` arm listing the pool-figure, home-card, hub, register and ticket-list files. Gold is banned there outright. The win ledger stays a separate file so the arm can see the difference. |
| **Component specs** | `02-components/<name>/spec.md`. |
| **The Claude Design delivery** | Filed raw on 2026-10-17 in [`docs/design-system/v6-2026-10-17-millionea/`](design-system/v6-2026-10-17-millionea/INHERIT-MANIFEST.md) with its `INHERIT-MANIFEST.md` (D2). The outbound brief is [`design-brief/maswali-2026-10/`](design-brief/maswali-2026-10/BRIEF.md). |
| **Strings** | `src/lib/i18n-dict.ts`, in EN, SW and ZH. |

**Guards that must pass:**
- `test:keyframes`, `test:reduce-motion`, `test:motion-ladder`, `test:dead-css` (it shrinks: five dormant classes gain consumers).
- `test:glyph-motion`, `test:gold-is-money`, `test:design-frozen` (new files land at zero), `test:feedback-law`, `test:presence-class`, `test:journey-shell` §2 and §9, `test:i18n`.
- `qa:calm`.
- `qa:seal`, including a `roll: false` case.
- `npm run build && qa:bundle-css`.
- Frame timings measured on the target device.
- The S16 baseline must include the home card and the third Tiketi kind (R-LAUNCH).

#### 8. Law compliance in brief

- **Gold** sits only on the armed pay control (§M3a), the seal, and "Kwa tiketi yako" / "Jumla yako". The jackpot, the floor, the rollover and the stub are neutral mono.
- **No count-up anywhere** (the seal uses `roll: false`). The figure changes only by `.m-tick` on a real sale or settlement.
- **No confetti, no loops, no bloom,** and no `value-flash` or `--g-jackpot`.
- **YES/NO ink** only on the lit slip control. ✓ uses `--success-fg`.
- **Colour is never the only signal:** four shapes plus words.
- **Exactly three new motions,** with no `--m-pivot` and the mark untouched. The seal is unchanged apart from the roll.
- **One-shot motion with both clamps written,** so it is seen on the throttle tier.
- **Haptics follow §H.** The countdown appears only on the slip and in the hub's buy block, never in the chrome (Q8) or on the home card.
- **Four journey tabs, unchanged.** No sub-brand beside the 50pick mark. No emoji.
- **Tiers and type:** reading and receipt tiers; the 28px title; Swahili proven at 2.25×; 44px taps.

#### 9. OPEN items (recommendations only)

| Item | Recommendation |
|---|---|
| **Licence cover** | Get the Gaming Board's written confirmation, or Ali's dated ruling, that a fixed-stake jackpot with a house-guaranteed floor is covered, **before the first real ticket**. The register and How to Play then cite it. |
| **Tax report** | Reconciling lines for "rollover carried in and out" and "house top-up paid", sourced from the HOUSE ledger account (Finance and GBT). |
| **Agents and invites** | No agent commission on Millionea, and a Millionea ticket does not count as an invite's first bet, until Finance rules. |
| **Rounding dust** | Floor each share to the whole shilling. Roll the remainder into next week as real money, printed on the register (870,000 ÷ 7 leaves TZS 5). |
| **Classic-shell entry** | §3.2. |
| **Substitution order** | Map the k-th voided main *by main number* to the k-th valid reserve. Which reserves count is the same either way; only the display changes. Write it into RULES.md. |
| **Carried-in pool on a voided week** | It carries forward again in full. |
| **The live "cannot win" line** | Yes, with the provisional wording in §3.10. |
| **A share smaller than the player's week spend** | The seal still fires, because the rules call it a win. The ledger prints the net with U+2212. |
| **Seal count-up on market wins** | Platform-wide; out of scope here. |
| **Withdrawal or AML review line** | Generate it from the live policy if a large share triggers a review. |
| **Yes/no from Ali** | N1, N2 and N3; the `millionea` glyph; the IMESHINDA tone. |

## §10c · Icons — Phosphor, one meaning, one icon (Ali, 2026-10-17)

**The ruling** is §0 item 7: no hand-drawn glyph on any Millionea surface; every icon comes from the Phosphor kit the
platform is moving to (`PHOSPHOR-MIGRATION.md`, branch `phosphor-migration`), reached only through the family `I` in
`src/components/ui/glyphs` (R-NEW-PAGES: never an inline `<svg>`, never a library import, never a text character).

**How they are drawn**, from the Phosphor lane's rulings, so Millionea looks like the rest of the platform:
- **Weight:** Phosphor **Bold** up to 26 px, Regular from 27 px (R-WEIGHT 1B).
- **Duo tier:** Phosphor Duotone with the tone layer at 20% (R-TONE 2B) — the hub's plate and the empty states.
- **Selected:** the **Fill** icon on the opaque royal pill with its lit edge (R-INDICATOR 3B) — the Tiketi zangu
  "Millionea" segment and the More row's active state.
- **Tabs:** 24 px (R-RAIL 4B). Millionea has no tab of its own (R-PLACEMENT), so this applies only inside the switch.
- **Ink:** an icon never carries gold; gold is earned money only (DA, `test:gold-is-money`). A win's gold stays on the
  amount (O-6).

**The picks.** Every name was checked against `@phosphor-icons/core` 2.1.1, the version the Phosphor lane pins
(2026-10-17). The `I` key is the name Millionea's code calls; the Phosphor lane's `map.ts` maps it, and where the
platform's lexicon already owns a meaning, Millionea uses that key and adds none.

| Meaning | Where it shows | `I` key | Phosphor | Why this one |
|---|---|---|---|---|
| **Millionea, the product** | home card, the More row, the Tiketi zangu segment, the hub's head | `millionea` (new) | `diamond` — ⏳ **Ali's pick** among `diamond` (recommended), `star-four`, `crown-simple`, `medal` | Phosphor's `diamond` is the card-suit rhombus, not a cut gem (its only gem is a brand logo); it reads as "the big prize" at 14 px and is unlike any other mark on 50pick. Not `crown` (the Leaderboard) nor `trophy` (a win). Replaces the coronet (O-5) |
| A ticket | the ticket page, the switch's ticket counts | `ticket` (lexicon) | `ticket` | The platform's word for a held position |
| A question not yet sealed | the ticket's 15 marks, the register | `markPending` (new) | `circle-dashed` | An open ring: "not known yet", never "wrong". Replaces `sealNil` |
| Your answer matched the result | the ticket's marks | `checkCircle` (lexicon) | `check-circle` (Fill, success ink) | The platform's own "done right"; the word beside it carries the meaning (glyph + ink + word, Phosphor W4) |
| Your answer missed | the ticket's marks | `xCircle` (lexicon) | `x-circle` (muted danger ink) | The pair to `checkCircle`; replaces `sealX` |
| A question voided | the ticket's marks, the register | `void` (lexicon) | `prohibit` | The platform's void, one meaning platform-wide |
| The reserves (A1–A5, "Akiba") | the slip's reserve block, the register | `reserve` (new) | `lifebuoy` | A reserve is the backup that saves the ticket when a main question voids |
| A reserve stood in ("M4 → A1") | the ticket and the register | `standIn` (new) | `arrow-bend-down-right` | The swap, pointing from the voided main to its reserve |
| The jackpot this week (J) | the hub, the home card | `coins` (lexicon) | `coins` | Money in the pot, without gold ink |
| Carried to the next jackpot | the hub's carry line, the register | `carry` (new) | `arrow-bend-double-up-right` | Carried forward to the next winning week. Not `piggy-bank` (the lexicon's savings, `sofSavings`) nor `hand-coins` (its cash-out) |
| The house floor guarantee | the hub's floor line, `/fairness` | `floor` (new) | `vault` | Money held safe behind the promise; `shield-check` already means "verified" (lexicon) |
| Time left to buy | the closing pill, the slip | `hourglassHalf` (lexicon) | `hourglass-medium` | A countdown, distinct from the clock that shows a time |
| A time or date | the close time, an event start | `clock` (lexicon) | `clock` | |
| The week's register (Daftari la Wiki) | `/millionea/register`, the hub's link | `register` (new) | `notebook` | The daftari itself |
| The week's ticket commitment (every ticket fixed at the close, MR-13) | Millionea's section of `/fairness`, the register's root | `commitment` (new) | `fingerprint` | One unique print for the week's tickets. Millionea's own proof, so its own key: the platform's resolution proof on `/fairness` keeps `attestation` (its hub row) and `shieldcheck` (its page head) |
| Results recorded | the register, a settled week | `sealCheck` (lexicon; the same drawing as `resolved`) | `seal-check` | The platform's "a result is recorded" (R-LEXICON 5.5A) |
| A win | the ticket, the receipt | `trophy` (lexicon) | `trophy` | The platform's win, with the existing seal moment only (§M7) |
| Cancel a ticket (free window) | the ticket, the receipt | `rotateCcw` (lexicon) | `arrow-counter-clockwise` | "Take it back", and the money returns in full |
| Refunded (the week voided) | the ticket, the register | `refund` (new) | `arrow-u-down-left` | Money coming back to you |
| Sales closed | the hub, the slip | `lock` (lexicon) | `lock` | The lexicon's drawing, not `lock-simple` |
| Sales paused | the notice, the hub | `salesPaused` (new) | `pause-circle` | An operator's pause of sales. Not `pause`: the lexicon's `pause` is the player's own Take a break, a different meaning |
| How it works | the How page, the hub's link | `howTo` (new) | `book-open-text` | `question` stays Help (lexicon) |
| Object to a result | the ticket's question row | `flag` (lexicon) | `flag` | |
| The source of a result | a question's evidence link | `externalLink` (lexicon) | `arrow-square-out` | |
| The cap (10 a week) | the slip's ticket count | `cap` (new) | `stack` | A stack of tickets with a top |
| The final week (sunset) | the hub, the home card | `finalWeek` (new) | `flag-checkered` | The finish line |
| Staff preview | the preview mark | `eye` (lexicon) | `eye` | |

**Checked against the Phosphor lane (2026-10-17).** Its owner (session ali-d1) reviewed this table against its map on
`phosphor-w2` (`2b63893e`): where the lexicon already owns a meaning, Millionea now uses that key (`checkCircle`,
`xCircle`, `coins`, `hourglassHalf`, `rotateCcw`, `eye`, `lock`, `sealCheck`); `pause` and `piggy-bank` belong to
other meanings, so the sales pause and the carry have their own keys; and `voidX` is retired by W2 (a void is
`prohibit`). Re-checked the same day: none of the new keys below collides with a key in that map, and none of their
drawings is already claimed there.

**The new keys Millionea adds** (13): `millionea` (the product mark; its drawing is Ali's pick), `markPending`,
`reserve`, `standIn`, `carry`, `floor`, `register`, `commitment`, `refund`, `salesPaused`, `howTo`, `cap` and `finalWeek`.
(`commitment` was first written `fairness`; the icon lane pointed out that `/fairness` already means the platform's
resolution proof, so the key is named for what it shows.)

**How it lands.** Millionea's code calls only the `I` keys above. At S5 the new keys go into the Phosphor lane's
`scripts/glyphs/map.ts` (on its branch until W2 lands) and its codegen draws them in every weight; nothing is added to `glyphs.tsx` by hand,
and until W2's swap lands on `main` a key `I` does not yet hold waits for it rather than being drawn inline here.
`test:glyph-source` (that lane's guard) holds the rule. **The specimen** — every pick above drawn from Phosphor's own files, the product-mark choice first:
https://claude.ai/artifact/Xub9GztHh1c15CtRyrUwTh (private to Ali; published 2026-10-17). Until Ali picks the mark,
S5 builds with `diamond`; his pick changes one line of the Phosphor lane's `map.ts`.

## §11 · Traps already paid for — do not re-pay

- ⛔ Never route a Millionea week through `settleMarket`'s normal arm (it refunds a one-sided pool),
  `allocateWinnerPayouts` (its floor throws below stake), `emergencyVoidMarket` (officer-only), or the poll scheduler
  and AI sentinel (they would auto-resolve it).
- ⛔ Never seed a ticket in an end-to-end test — drive the purchase. The responsible-gambling gates live only on
  `buyPosition`.
- ⛔ Never let house money enter `HOUSE:MASWALI_JACKPOT`; never show the floor unless it is funded; never pay less than
  owed (abort instead).
- ⛔ Never gold on the jackpot, the floor, the rollover or the stub; never `.value-flash` or `--g-jackpot`; never a
  count-up — the Millionea seal lands its amount final.
- ⛔ Never publish an unsalted pick hash; never show pick aggregates or an "alive" count before settlement; never a
  potential payout on a held ticket.
- ⛔ Never a score on a loss — only the sunset week's settlement states a score.
- ⛔ A cross means "did not match", never "void" — in Tanzanian school marking a cross means wrong.
- ⛔ "halisi" means NET in the dictionary; the main balance is "salio kuu".
- ⛔ `main` is a live deploy with one release owner; stage files by name; never `git add -A`.
- ⛔ The repository is public: describe anti-abuse controls by what they enforce, never by their signals.
- ⛔ Never extract a design package inside the checkout — `test:design-one-door` globs the disk. Commit canvas
  sources the day they arrive.
- ⚠️ The Vodacom lane is changing `app-shell`, `journey-tabs`, `market-service`, `positions` and `i18n-dict`: land
  the S0.5 fence as one integrator commit and coordinate every shared file with the release owner.
- ⚠️ The August records still say `/maswali`, "13% of losing stakes", a fifth rail slot and a 20M guarantee — they are
  records. Read them for engineering practice only.
