# ▶ THE BOARD — there are exactly TWO ongoing programmes

> **Read this first, then pick one.** Everything else in `docs/` is a RECORD of finished work.
> If a document is not one of the two below, it is not a live task, whatever its own header says.
> ⛔ Do not start a third thing. Ask Ali which of the two to proceed with.

---

## 1 · THE DESIGN GATE — 100% render consistency · `DESIGN-GATE-2026-08-28` · ▶ **ACTIVE**

**Door: [`SESSION-PROMPT-DESIGN-GATE.md`](SESSION-PROMPT-DESIGN-GATE.md)** — 4 steps, the gates per
step, the traps, **THE PLANNER** (37 rows, one per system — the only tracker), and the
delete-when-done list.

| | |
|---|---|
| **State** | ✅ **STEP 1 CLOSED. STEP 2: the TWO DECISIONS ARE TAKEN — ruled in `DESIGN_AUTHORITY`, and guarded.** Planner: **13 ☑ · 3 🚢 · 21 ☐** of 37. 📐 The type ladder crossed half: §4 arbitraries **1809 → 1109**, adoption **19.8% → 50.5%**, and ⭐ **§3 held at 763 through every sweep** — the pair of numbers proving none of them bought a ratchet without moving a glyph. Verified on production (admin 40-route seal + 44-route drive, player anon 17) with **0 overflow and 0 console errors**. ⭐ **THE MONEY WALL:** every Tailwind rung emits letter-spacing, so §M4 had no legal rung — ruled as `.amount` (a doubled selector, because a responsive variant beats a single class). 🔴 The find behind it: `type-scale` §2 matched the WORD `tracking-`, so a money element written `text-micro` was tracked out **+6.67%** and the guard printed PASS over **ten live violations**. ⭐ **THE NAME COLLISION:** not three but **FIVE**, agreeing on no value — frozen as **§T7** with a guard that fails on a sixth. And DG-A-11's blocker was asked of the wrong ladder: `text-micro` IS 10px, so the eyebrow was already on a rung and the "+1px on 254 labels" is never paid. ✅ Also closed: **DG-A-18** (the drawer the "shipped" fix never reached, and 2 routes with no `<main>`) and **DG-A-10** (both parts) |
| **🔴 THE BIGGEST FINDING** | **THE REGISTERS' NUMBERS ARE STALE — re-derive every row before fixing it.** DG-A-04's headline (`Select 36.8`, `55.5 wrapped`) does not reproduce: the row is uniformly **32**, and 36.8/55.5 occur NOWHERE in 44 routes. `select.tsx` was fixed by **`af4de432`, dated 2026-08-28 — the same day the report was written**; the drive ran before it deployed. **Three rows asked to REVERSE dated, measured decisions** — DG-A-05 (`truncate` breaks E-98 at error severity), DG-A-23 ("add a scrollbar" is a Chrome no-op; its edge-fade clips popovers), DG-A-07 (the wrap is the design, ruled 2026-08-25). All three closed with **no code change** |
| **Registers** | [`DESIGN-GATE-ADMIN-2026-08-28.md`](DESIGN-GATE-ADMIN-2026-08-28.md) — 23 systems, §6 is the work order, §7 is ~280 page findings whose P0s only were spot-verified · [`DESIGN-GATE-PLAYER-2026-08-28.md`](DESIGN-GATE-PLAYER-2026-08-28.md) — 14 systems, no §7 |
| **Next move** | **Step 2's remainder is all PER-SITE DESIGN CALLS, not sweeps** — 14 off-ladder amounts (10.5 · 11.5 · 12.5 · 15 · 17 · 26 · 34) and 139 off-ladder eyebrows, each a size decision needing a screenshot; the tools list them and refuse to touch them. Plus **DG-P-04** (re-derived: FIVE gaps, not seven, and the law is **§S1** — `/results` builds its rhythm from per-element margins) and the 33 multi-line `FieldLegend` bodies. Then steps 3 and 4, ⛔ reading RESUME AT + RE-DERIVED first. 🆕 ⛔ **STEP 5 IS PLANNED AND MUST NOT BE STARTED** — Ali's commission (admin tabs · unsaved-changes · validation that takes you to the field), **DG-S-01…07**, a session of its own after 1–4 |
| **Blocked** | 🔴 **Only the authed PLAYER half.** All six player/officer QA secrets are rejected by production; only `QA_ADMIN_PASSWORD` works. That blocks DG-P-02's re-measure and makes **DG-P-09 unreprovable** — no `auth-login` record was retained and the register's `auth-flash.tsx` hypothesis is refuted (227 client files scanned, zero conditional hooks). ⭐ The type-ladder block is GONE |
| **Instruments** | `scripts/design-gate/` — ⚠️ **there ARE npm aliases now**: `qa:dg-type` (the type bench, which runs INSIDE a live production page) · `qa:dg-shell` (the admin landmark/drawer seal, 40 routes) · `qa:dg-money` / `qa:dg-eyebrow` (the sweeps, each REFUSING what it must not decide) · `qa:dg-measure/overlays/shots/analyze/redo`. `session.mjs` shares ONE sign-in across every instrument — each login REVOKES the previous, which is the revocation this rig has been fighting. 🔴 **`redo.cjs` reported `OK 48` over EIGHT OFFLINE pages** (HTTP 200, h1 "You're offline") because its only poison test was `/auth/`; it also held a second, drifted copy of the route list. Both fixed |
| **Traps** | ⛔ **One login per account at a time** — a second login revokes the first and every later page "succeeds" as the sign-in page at HTTP 200 (`?revoked=1` is the tell). Chain `measure → overlays → shots` in ONE command per account. 🔴 **ALL SIX PLAYER/OFFICER QA SECRETS ARE REJECTED** (`error=wrong_credentials`, 2026-08-29); only `QA_ADMIN_PASSWORD` works. Use `SURFACE=player ANON=1` for the 17 public routes |

---

## ⏸ THE PARKED BACKLOG — real, open, and deliberately NOT being worked

⛔ **This exists so "two programmes" does not become "everything else is finished".** It is not.
Every line below was re-verified in code on 2026-08-29, not taken from a document's own header.
**Do not start any of it without asking Ali** — but do not let it disappear either.

### 🔴 Waiting on Ali — two rulings, both unanswered
| | |
|---|---|
| **`E-243`** | Should a session-limit **increase** (and a `dailyLossLimit` increase) defer 24 h the way the deposit caps do? No `pendingSession*` / `pendingLoss*` columns exist in `schema.prisma`, so today an increase takes effect at once |
| **`E-245`** | Can a **self-excluded** player reach their own balance? Three defensible answers and no ruling. ⚠️ A self-exclusion is a MINIMUM and never self-reinstates — that part is already decided |

### 🟠 Open engineering, owned by a parked programme
| | Item |
|---|---|
| **`E-226`** | ⛔ **The worst of these: `support-config.ts` has a WRITER and NO READER.** `/help` and ~20 other surfaces — **including four statutory pages** — have shown the wrong support contact **on production since 2026-08-19**. Unbuilt. Lives in [`SESSION-PROMPT-BONUS-AND-CARE-DESK.md`](SESSION-PROMPT-BONUS-AND-CARE-DESK.md) Unit B1 and [`SESSION-PROMPT-JAY-COMMENTS.md`](SESSION-PROMPT-JAY-COMMENTS.md) |
| **`E-239`** | The bonus **zombie re-lock** inside Unit A's own shipped fix: re-locking a grant whose `remainingTzs` is already 0 restores the full wagering requirement |
| **`E-228`** | XRP 30m/60m refunding on `source-failed`. Explicitly LOW priority while no real player has bet those pairs |
| **`purgeChainHistory`** | `CONTROL_DOMAIN.purgeChainHistory: "compliance"` is **still not declared** in `control-gates.ts` — verified absent 2026-08-29. The last un-actioned line of scan #1; it only drives button visibility, the real boundary is `softRequireStaff` |
| **i18n bundle split** | `src/lib/i18n-dict.ts` is **355,955 B and GREW** since the design-perfection campaign deferred the first-load split |
| **Unit D / F / G** | Two guide frames + the `--allow-paused` flag (never built) · the first Cloudflare-path **certificate renewal, due from ~2026-09-15** (expires 2026-10-15) · the dated Postgres **volume** re-read |
| **320px account menu** | The right cluster wants 275px in 238px; every candidate for yielding is protected by a written rule. **Ali's design call** — measured in the session-75 handoff |

⚠️ **`test:orphans` is blind outside its own scope:** it scans `scripts/` **top level only**, no
recursion, while printing *"every file in `scripts/` must be run, or declared unrun"*. Ten code
files under `scripts/` subdirectories are named by no npm script and referenced by nothing.

## 2 · MASWALI MILLIONEA — the third product · `MASWALI-BUILD` · ⏸ **AFTER the Design Gate**

⛔ **Ali's order, 2026-08-29: the Design Gate runs FIRST and to completion — "when it is done
forever and tested, we do this Maswali."** Everything below is ready and waiting; do not start it
while §1 is open.

**Door: [`SESSION-PROMPT-MASWALI-BUILD.md`](SESSION-PROMPT-MASWALI-BUILD.md)** — nine chunks S0–S8
with acceptance lines, the gates, the traps, the tracker, and an index of every file.

| | |
|---|---|
| **State** | 🟢 **CLEARED TO BUILD S1–S7.** All eleven decisions settled ([`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md), two entries 2026-08-29) |
| **Design** | ✅ Delivered and filed — [`design-brief/maswali-2026-08/handover/`](design-brief/maswali-2026-08/handover/README.md) |
| **Built so far** | **Nothing.** `src/` contains zero Maswali files |
| **Next move** | ⚠️ The **D-7 rename first** (`/maswali…` → `/millionea…`, 94 occurrences in 7 docs, ⛔ never the 36 `maswali-2026-08` folder refs), then re-read §5 + §7, then **S1** |
| **Blocked** | ⛔ **S8 only** — the live drive with real money waits on the Gaming Board licence in writing. S1–S7 proceed on Ali's instruction |

---

### ⚠️ Two gaps in the Design Gate's own work order, found 2026-08-29
**`DG-A-19`** (icon sizes 10–23, two prop spellings) **appears in no step row** — the four steps
cover DG-A-01…18 and 20…23 only. **`DG-A-04` appears in two** (step 1 and step 3). Neither is
resolved in the document; decide when you reach them rather than discovering it mid-step.

---

> # ⭐ SESSION 60 — A CONTROL THAT WAS OFF THE SCREEN, A CHECK THAT COULD NOT FAIL (2026-08-24)
>
> ⛔ **THIS BLOCK IS A POINTER, NOT THE RECORD.** The campaign lane's full handoff is the topmost
> `⏭️ RESUME AT` block in [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) §6b, and the findings are
> rows `E-190`…`E-196` in §6. Read those; this exists so a session starting here is not sent to
> a four-session-old page.
>
> ## Shipped and verified on production
>
> | | |
> |---|---|
> | **`E-190`** | The signed-in header **severed the account menu** at 1024–1090px on **every page** — in Swahili the bell too, and the menu entirely off-screen. Production seal **36 problems → 0**. |
> | **`E-191`** | A clipping check that **could not fail**: `page.evaluate` does not call a *string*, so the probe returned `undefined` and a defensive `!m \|\|` passed it unconditionally at 15 cells. |
> | **`E-192`** | `test:all` on freshly pulled `main` was **239/244**; three were real, and all three came from a session that closed green **having listed fourteen suites, none of them `test:all`**. |
> | **`E-193`** | Unit C: at 1024×768 the round page's rail was gated at `xl`, so the price hero rendered **425px tall** and the bet controls sat **301px below the fold**. Rail moved to `lg`; verified live at **623, visible**. |
> | **`E-196`** | Repairing E-191 immediately found a real one: at 1024 a **guest** sees the DOWN button **clip its own payout figure**. 🟡 **Filed, not fixed** — every remedy touches the frozen button kit. |
>
> ## Open, and each needs Ali rather than a session
>
> - 🟡 **`E-194`** — a **"3-minute" round is reachable for 89 of its 180 advertised seconds** (measured over 5,479 rounds). A naming decision; ⛔ the obvious remedy voided 175 rounds once (E-83).
> - 🟡 **`E-196`** — three costed options in its register row.
> - 💵 **The USD→TZS rate and its date** in *Admin → AI usage → Cycle settings* (owed since session 59; every shilling figure renders `—` until then, deliberately).
> - ⏰ **`E-195`** — ⛔ **check from ~2026-09-15.** `www` behind Cloudflare at `Full (strict)` renews its origin certificate through a path that has never carried one; it **expires 2026-10-15**, and under `strict` that is the whole site, on a date, with no deploy to blame.
>
> ⛔ **SUPERSEDED DIRECTIVE — DO NOT FOLLOW. THE BOARD AT THE TOP OF THIS FILE IS THE ENTRY POINT.** `CLOSE-THE-BOARD` was superseded by `FINISH-THE-BOARD` (2026-08-25) and the campaign has moved on four sessions since. Kept as the record of what this block said. Original text: **NEXT SESSION STARTS AT [`SESSION-PROMPT-CLOSE-THE-BOARD.md`](SESSION-PROMPT-CLOSE-THE-BOARD.md)** — the six open items, ordered money-first, each with its measurement and its guard. Then Unit D (#6) in [`SESSION-PROMPT-JAY-COMMENTS.md`](SESSION-PROMPT-JAY-COMMENTS.md) §1** — its ledger is backfilled and honest now (**A · B · C ✅**), so tick your row in the commit that ships it.

> # ⭐ SESSION 56 — `/notifications`, THE DOOR THE BELL CANNOT BE (2026-08-22)
>
> ## What shipped
>
> A **footer strip in the bell card** — unread count · Read all · **See all ›** — and the
> screen it opens: server-rendered, URL-driven (`?filter=&sort=&page=`), on the shared
> `Pagination` atom, with five lenses: **All · Unread · Money · Account & security · Cleared**.
>
> ⛔ **`all` and `cleared` are disjoint AND exhaustive.** A row in both reads as two events —
> the duplicate-notification shape that once put 28 byte-identical rows on production. And
> **money and account do not overlap** (`WITHDRAW` lives in money alone), so each pill's count
> is a number of things rather than a number of things counted twice.
>
> ## Why it exists — two measured gaps, not a design wish
>
> | | |
> |---|---|
> | **The window** | The bell reads the newest **30** rows with **no priority by kind**. After session 55 put a row on every settled Up & Down round, a player could push a **SECURITY alert or a KYC decision** out of the only door that showed it — 20 rows to one player in an hour, measured on production. |
> | **The trapdoor** | 🔴 `CLEAR ALL` stamps `dismissedAt`, and **every** read door filters `dismissedAt: null`. One tap permanently hid a player's whole money history with no way back. **Cleared + Restore** is that way back; `restore` is owner-scoped, because an id alone is never proof of ownership. |
>
> ## 🔴 E-183 — the badge was saturating at 30
>
> `NotificationsPanel` derived its unread badge from the **capped 30-row list**, while the
> action beside it computed an honest uncapped `unreadCount()` and had that answer discarded
> one line later. A player with 40 unread was shown 30. Now server-sourced, adjusted
> optimistically so it never freezes behind a round-trip, and **rolled back with the list**
> when an action fails.
>
> ## ⚠️ Built to the design law, and the gates said so before I did
>
> The first draft **failed** `type-scale` (+5 arbitrary sizes, +4 tracking) and
> `ui-consistency` (+2 numeric size utilities). Corrected to: the closed type scale
> (`text-micro`), **B7's `<PageContainer tier="reading">`** with its skeleton at the same tier,
> and px literals for control heights — `theme.spacing` is overridden, so `h-7` renders
> **40px**, below the 44px player tap target. ⭐ Both notification plates are now the
> `IconPlate` atom: `rounded-lg` and `rounded-control` are both 12px, so it was a **zero-pixel
> change that deleted a hand-rolled variant**, and `iconFor`/`tintFor` live in one module both
> surfaces import — a second map is how a win becomes gold in one place and grey in the other.
>
> ## Evidence
>
> `test:notifications-page` **41/0** (the lenses are DRIVEN, not read) · `red:notifications-page`
> **10/10** with the tree byte-identical and anchors in a sidecar so the red-anchors ceiling
> holds at 67 · `test:i18n` 1918×3 · every design gate green · index migration
> `20260822100000_notification_user_created_idx` pre-flighted **GO** on production
> (2,521 rows / 1.9 MB) via `npm run ops:preflight-notification-idx`.
>
> ⭐ **Two of the ten mutations found real gaps in my own suite before it shipped** — the
> fixture had no `WITHDRAW` row, so the overlap check was asserting over a population where
> the defect could not appear; and an insert-shaped mutation left its own anchor on disk.
> A control that cannot fail is not a control.
>
> ## Driven live on production
>
> `qa:notifications-page` **210/0** — 3 widths × 3 locales, every pill read by its own
> `data-chip` and its **bounding box asserted inside the viewport**; and
> `qa:notifications-restore` **11/0** — a row dismissed **through the real bell control** is
> reachable under **Cleared**, has left **All**, and **Restore** puts it back.
>
> ⚠️ **The matrix drive could not have proven that.** The fleet player had never cleared
> anything, so `Cleared` rendered an honest empty state and the one safety property on the
> screen went untested until it was driven deliberately. An empty state proves neither half.
>
> ## 🔴 E-184 — my own edit wrote invalid UTF-8 and production caught it
>
> `Turbopack build failed … invalid utf-8 sequence of 1 bytes from index 7443`. A Python
> heredoc containing `🔴` is **two lone surrogates**, and `errors="surrogatepass"` wrote them
> as CESU-8. ⛔ **`tsc` passed, all 238 suites passed, and an earlier local `build` passed** —
> because I ran it before the corrupting edit and never again after. Production was never at
> risk: a failed build leaves the previous good deploy serving.
>
> ⭐ **`test:encoding` now closes that blind spot** — all 1,831 tracked text files, invalid
> UTF-8 **and** 0-byte files, so E-181's truncation and E-184's corruption are one gate. It
> uses `TextDecoder({fatal:true})` rather than `toString("utf8")`, which silently substitutes
> U+FFFD and would "succeed" on exactly the input it exists to reject.
>
> ## ⚠️ Observed, not fixed, not mine
>
> `PageContainer` renders `<main>` while the app shell already provides
> `<main id="main-content">` — so player pages nest two `<main>` elements. Product-wide
> (`/markets` is identical) and the atom already has `as="div"` for it. Flagged rather than
> diverged from mid-session.

> # ⭐ SESSION 55 — UP & DOWN RESULTS IN THE BELL (2026-08-22)
>
> ✅ **PUSHED, DEPLOYED AND DRIVEN LIVE WITH REAL MONEY.** `3b440867..` — the data lane's six
> commits, the design lane's eleven stages and this session's work all landed in one push after
> a clean merge. Full gate **237/237**. Production answers `/api/health` with `ok: true` on a
> fresh instance, and the pending KYC migration applied cleanly
> (`finished`, `rolled_back: null`, 0 unfinished).
>
> ## What shipped
>
> **Every Up & Down terminal outcome now writes a bell row** — win, loss, void refund and
> one-sided refund — deep-linked to its own round, in all three languages, with email still
> suppressed and the daily digest untouched. ⛔ **It reverses two of Ali's own dated decisions**
> (2026-07-24 and 2026-08-05) and he confirmed with the re-measured volume in front of him.
> [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) § *2026-08-22* is the record;
> `LIVE-QA-CAMPAIGN.md` §6b's session-55 block is the handoff.
>
> **Proven on production, not inferred:** 4 of 4 positions settled after the deploy produced a
> row — WIN *"You won TZS 1,870"*, LOSS *"Bet lost · TZS 1,000"*, two one-sided refunds — each
> pointing at its own round, 0 carrying the forbidden Chinese string. `qa:updown-bell` 48/0
> twice across 3 widths × 3 locales, frames opened rather than merely captured.
>
> ## 🔴 Three defects found on the way, none of them the thing I was asked to build
>
> | | |
> |---|---|
> | **E-179** | The Up & Down loss push shipped `投注失败` — *the bet FAILED, never went through* — the opposite money consequence from a bet placed and lost. `notifyLoss` had forbidden that exact string in a comment since 2026-07-31; the fix was never propagated to the hand-written copy. The words now have ONE home. |
> | **E-180** | `live-updown-money-pair.mjs` had **never placed an UP bet**: `/^up\b/i` matched the chip "UP & DOWN" before the stake button. ⛔ My first repair was wrong the same way — the visible `×` is not the accessible name, the `aria-label` is. |
> | **E-181** | I truncated `LIVE-QA-CAMPAIGN.md` to **0 bytes** with a Python read-modify-write. Recovered from git in one command because the previous edit had been committed minutes earlier. ⛔ Never rewrite that file with Python. |
>
> ## ⚠️ Two claims of mine that the measurements refused
>
> 1. **"The forty-an-hour premise expired because rounds are operator-generated."** It had not.
>    Auto-generation is off in DATA, not removed from CODE, and **16 of 19 chains were RUNNING**
>    on the night this shipped. Corrected to Ali before he decided.
> 2. **The design lane's two red guards were not mine and not theirs-in-spirit** — they are what
>    happens when two lanes merge. `reduce-motion` pinned a bug its own commit had fixed;
>    `red:reduce-motion` was 11/12 with a **harness error** on their own tree. Both fixed, 12/12.
>
> ▶ **NEXT:** unchanged — Unit C (#2c) then D–M in
> [`SESSION-PROMPT-JAY-COMMENTS.md`](SESSION-PROMPT-JAY-COMMENTS.md) §1 order.

> # ⭐ SESSION 54 — THE DATA-HANDLING FIXING SESSION (2026-08-20 evening)
>
> ✅ **PUSHED AND DEPLOYED.** `a3ac21c4..8bba442d`, 12 commits, on Ali's instruction after the
> full gate came back **226/226 green** with a clean typecheck. Railway built and rolled over;
> the new instance answers `/api/health` with `ok: true` and a fresh uptime, and the three
> corrected privacy sentences are confirmed absent from the live page (0 occurrences of
> "Argon2id", "browser fingerprint" and "time on platform"). `/results`, `/markets`,
> `/legal/privacy` and `/fairness` all return 200.
>
> ⚠️ **One live measurement narrowed a claim** — the `/results` memo removes the database scans
> (10 requests moved `seq_scan` by **zero**) but does **not** make the page faster (~3.7 s
> either way; the remaining cost is JS filtering 13,013 rows per render). Recorded in the audit
> doc rather than left implied.
>
> ⚠️ **BUT THREE THINGS ARE ALREADY LIVE ON PRODUCTION**, because they were data changes, not
> code: the 24 inline KYC documents were migrated to R2, 16 rows' metadata was repaired, and two
> sealed backups were taken. Production data and the unpushed code are consistent — the code
> reads both key shapes — but they are not the same artefact.
>
> ## What this session was
>
> `docs/DATA-AUDIT-2026-08-20.md` — the whole-platform data audit — **§0a of that file is the
> authority for what happened.** Read it before anything else. 8 of its 11 work orders are done,
> **F-08's premise turned out to be wrong**, and **two findings worse than anything in the audit
> were found while doing them**:
>
> | 🔴 | What |
> |---|---|
> | **The player-facing data export was shipping the account's password hash and salt.** `exportUserData` returned the whole user row, so the JSON a player downloads from `/profile/account` carried their own scrypt `passwordHash` *and* `passwordSalt`. Measured, both present in the file. Both export doors now read one allowlist projection. |
> | **The tamper-evidence control was crying wolf.** Every backup artifact printed *"the audit chain has a BROKEN LINK"* about a chain that was completely intact — verified by walking it from GENESIS to all 114,379 rows. The verifier assumed insertion order equals link order; it does not, for 4,978 rows. A control that cries wolf is a control that has been switched off, and that warning prints on a document an operator may hand to a regulator. A fresh production backup now prints no warning at all. |
>
> ## ✅ Shipped, each with a test driven red first
>
> F-03 (per-game money stops guessing) · F-06 (7 email leaks masked, audit found 4) ·
> F-04 (3 false privacy claims × 3 locales, audit found 1) · F-02 (11 MB of national IDs out of
> Postgres, **applied on production**) · F-08 (fixed *differently* — see below) ·
> F-10 (Ali's audit-volume decision) · F-01 (the retention purge the product had been
> advertising unwired for months) · F-07 (the boot-path whole-table read).
>
> ## 🔴 F-08: the finding was wrong, and this is the lesson worth keeping
>
> The audit said `/api/fairness/recent` scans 12,860 rows every 2 seconds. **I repeated that
> claim before checking it.** `listMarkets` always applies `productLine ?? "MARKET"`, so the
> route is an **Index Scan over 53 rows in 0.169 ms** — my first EXPLAIN had omitted the filter
> and measured a query the code never runs. No index was justified.
>
> What *was* broken: `NotifyPoller` was mounted with **no session gate**, and its only prune
> sits behind a 401 — so a signed-out tab with a stale watch entry polled an unauthenticated
> endpoint every 2 seconds **forever**. One line. And the real full scans (13,013 rows, Seq
> Scan) are the `productLine: "ALL"` reads on `/results`, `/fairness` and the app-shell ticker,
> which the audit never examined.
>
> ▶ **NEXT SESSION ON DATA: [`SESSION-PROMPT-DATA-FINALISE.md`](SESSION-PROMPT-DATA-FINALISE.md).**
> Erasure first — it is the only remaining item that can hurt somebody.
>
> ## ✅ 2026-08-21 — the four answers are IN, and Redis is armed
>
> Ali answered all four on 2026-08-21; reasoning per item in
> [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) § *2026-08-21*, summarised in
> [`DATA-RETENTION.md`](DATA-RETENTION.md) §2. **Two are implemented** (marketing consent
> corrected DOWN to the player's 2 years — you may not retain longer than you disclosed to the
> data subject; support tickets marked N/A until a ticket store exists). **Two are decided and
> unblocked but NOT built:** the DSAR intake, and `anonymizeClosedAccount` — the latter
> deliberately, because it touches a P0 AML control and needs a suite proving the identity tuple
> still collides after erasure. ⚠️ Its mechanism is a **keyed HMAC of `idNumber`, never NULL**:
> nulling it frees the partial unique index that is the sole enforcement of
> one-document-one-account.
>
> **Redis armed and verified** (`REDIS_ENABLED=true` + `REDIS_URL` as a service reference),
> closing audit **H2** — two containers had each been granting the full per-phone OTP/login/
> register budget. ⛔ `family: 0` was load-bearing: ioredis does IPv4-only lookups, Railway's
> private network needs dual-stack, and because the module is fail-open the failure would have
> been silent. `npm run qa:redis-armed` proves it behaviourally, 8/8.
>
> ⚠️ Two self-corrections worth reading, both the same shape as the bugs they followed: my
> `/results` memo removes database scans but does NOT make the page faster, and my new Redis
> health line reported UNREACHABLE for a lazy-not-yet-built client. Both fixed and both recorded
> at the code.
>
> ## (superseded) FOUR ANSWERS WERE OWED BY ALI
>
> All four are in [`DATA-RETENTION.md`](DATA-RETENTION.md) §2:
>
> 1. **Marketing consent: 2 years or 3?** The player policy says *"2 years of inactivity"* in
>    all three locales; `/admin/retention` tells the Gaming Board *"3 years from withdrawal of
>    consent"*. Different period AND different trigger, same data. Untouched deliberately —
>    changing either is a policy statement, not a typo.
> 2. **Who may file a DSAR, on what evidence?** `fileDsarAction` is a declared orphan (E-33), so
>    nothing on the platform can start the 30-day statutory clock. Until this is answered the
>    erasure routine would attach to a branch nothing can reach.
> 3. **How is a national ID number erased?** ⚠️ The `(idType, idNumber)` partial unique index is
>    the **sole** enforcement of one-document-one-account. Nulling it would silently hand one
>    human a second account.
> 4. **Support tickets** — 3 years is published; there is no ticket store to enforce it against.
>
> ## Recorded, and NOT re-raised
>
> - **ISO 27001 + biannual pentest.** Nothing in `docs/` evidences either. Put to Ali; his
>   instruction is that both happened and the sentence stands. Recorded in
>   `COMPLIANCE-DECISIONS.md` **as his attestation**, stating plainly that it rests on his word
>   and not on anything in this repo. ⚠️ If a regulator asks for the certificate there is
>   nothing here to hand over.
> - **`DISABLE_ADMIN_TOTP=true` in production.** Ali's dated call. Not re-raised — but the
>   audit's §1 had listed the KYC-document TOTP gate as an *effective* control, and that row is
>   now annotated, because in production it is open.
>
> ## Next
>
> §5 of the audit doc is the real remaining sequence. The cheapest high-value items:
> `PHONE_EMAIL_MAP` is **still set in production** and on no checklist; `docs/DATA-LAYER.md` is
> stale and it is the file that teaches a new session how data works. ⛔ **F-09's snapshot skip
> must NOT be done as written** — an adversarial check returned NOT_SAFE.
>
> ---

> # ⚪ WAS "CURRENT TRUTH" ON 2026-08-20 (after session 52) — ⛔ IT IS NOT CURRENT AND YOU MUST NOT STOP HERE.
> ⛔ **Nine sessions have shipped since.** The entry point is THE BOARD at the top of this file. This block is kept as a record of what was true that day; its original heading told the reader to stop reading, which is exactly why it had to be relabelled rather than left.
>
> Everything below this block is **history**: correct when written, superseded in places. This block
> is the whole remaining programme, in the order to do it. ⛔ **One door per unit** — each item names
> its commission or its register row; do not re-derive scope from the prose further down.
>
> ## THE QUEUE
>
> | # | Unit | Where the scope lives | State |
> |---|---|---|---|
> | ~~**1**~~ | ~~**B · #1 — identity verification stops gating withdrawal**~~ | [`BOARD-DISCLOSURE-B-E.md`](BOARD-DISCLOSURE-B-E.md) · `E-175` | ✅ **WRITTEN AND GREEN (session 53).** Service + page in one commit, `kyc_required` fully retired, all four traps closed, 4 live drives re-anchored, 12 mutations. ⛔ **The real-money seal was WAIVED BY ALI**, so the payout leg is unproven on production — `E-177` |
> | **2** | **C · #2c — a player can see the next round is playable** | [`SESSION-PROMPT-JAY-COMMENTS.md`](SESSION-PROMPT-JAY-COMMENTS.md) § C | ▶ **START HERE.** ⚠️ The mechanism SHIPPED (`E-166`). What is owed is a **drive at 5 widths × 3 languages** answering one question from the frames — do not rebuild it |
> | **3** | **D · #6 — the date beside every timer** | § D | Not built. ⛔ One formatter, never a new `toISOString().slice()` |
> | **4** | **E · #8 — prefill the registered number** | § E | Not built. ⛔ A placeholder must never become a value |
> | **5** | **F · #5 — remove the Cash Back Deposit promo** | § F | Not built. ⛔ Switch it off, never delete a granted bonus |
> | **6** | **G · #3 — chain removal that cannot destroy the audit trail** | § G | Not built |
> | **7** | **H · #14 — re-categorise a market** | § H | Not built |
> | **8** | **I · #7 — the Selcom page** | § I | Not built |
> | **9** | **J · #15 — the bonus system, proved end to end** | § J | Not built. ⚠️ Its withdrawal leg must run as an **unverified** player once B lands |
> | **10** | **K · #12 + #13 — customer care and its mailbox** | § K | Not built. ⛔ Prove the tier by **refusal**, with a positive control in the same run |
> | **11** | **L · #11 — the new markets** | § L | Partly answerable now: **GBP/USD** is catalogued and can be enabled; **KES/ZAR** need Ali's direction confirm; **S&P 500 needs a data-tier PURCHASE** and a third calendar shape |
> | **12** | **M · #9 — per-bet Up & Down notifications, behind a switch** | § M | Built and OFF. Needs Ali's word before it goes on |
>
> ⭐ **Unit A (#10 + #4) is DONE** — `E-170`, settled Up & Down rounds reach `/results`.
>
> ## ⏰ DATED — this one has a deadline, and nobody is holding it
>
> Everything else on this page waits for a session. This waits for a **date**, and it arrives
> whether or not anyone opens the repo.
>
> - 🔴 **`E-195` — WATCH THE FIRST CERTIFICATE RENEWAL THROUGH CLOUDFLARE. Check from
>   ~2026-09-15; the certificates expire 2026-10-15.**
>
>   On **2026-08-24** `www.50pick.tz` was flipped to **Proxied** with SSL/TLS at
>   **`Full (strict)`**. Railway renews the origin certificates by answering an ACME challenge
>   **at the origin** — and for `www` that challenge now arrives **through Cloudflare**. That path
>   has never carried a renewal. Both certificates (`CN=www.50pick.tz`, `CN=50pick.tz`,
>   Let's Encrypt) were issued 2026-07-17 and expire **2026-10-15**; the renewal window opens
>   around **2026-09-15**.
>
>   ⛔ **The failure is total and silent.** Under `Full (strict)` Cloudflare refuses to serve a
>   hostname whose origin certificate is invalid — so an unrenewed cert is not a warning banner,
>   it is the whole site down, arriving on a date, with no deploy and no commit to blame. The
>   apex is unaffected while it stays DNS-only, which means `50pick.tz` may keep working while
>   `www` — the host in `NEXT_PUBLIC_APP_URL` **and** `PAYMENT_WEBHOOK_URL` — does not. Deposits
>   confirm on that host.
>
>   🔴 **CORRECTED 2026-08-27 (`E-227`): IT WAS NEVER A GATE — §[F] HAD NEVER EXECUTED ONCE.**
>   `predeploy` invokes `qa:live` with no `BASE`; `BASE` defaults to `http://localhost:3009`;
>   `LOCAL` is therefore true; and the whole certificate block sat inside `if (!LOCAL)`. `qa:live`
>   appeared nowhere in `.github/`. Apply the house test — *would it pass with an expired
>   certificate?* **Yes, silently, every time.** ⚠️ **And the one documented prod invocation failed it
>   every time it was used:** `CLAUDE.md` said to run
>   `BASE=https://kipindi-production.up.railway.app npm run qa:live`, a hostname absent from
>   `ORIGIN_OF`, so §[F] failed on *"no known origin"* and never on the certificate.
>   ✅ **REPLACED by `npm run qa:cert-expiry` (`scripts/cert-expiry-watch.mjs`), running twice weekly
>   in `.github/workflows/cert-expiry.yml`.** It iterates **BOTH** origin hosts (§[F] selected ONE by
>   `new URL(BASE).hostname`, so a single run could structurally never cover both), **asserts its own
>   population** so losing a host cannot quietly reduce coverage to nothing, takes its threshold from
>   `CERT_MIN_DAYS` so it is provable RED **without editing the file**, and treats an unreadable
>   certificate as a FAILURE rather than a skip. `red:cert-expiry` **3/3**. §[F] has been **deleted**
>   from `pre-deploy-live-check.mjs` — two copies of one threshold drift apart, and that was the copy
>   that could not run.
>
>   ~~✅ **`qa:live` §[F] now watches this** (added with this entry, so it is a gate and not a
>   reminder).~~ It fails at **21 days**, not at 0 — a check that goes red the day the site dies is
>   a headstone, not a gate. Renewal is normally ~30 days out, so 21 means "it was due and did not
>   happen", with weeks left to act. `qa:live` is the last step of `predeploy`.
>
>   ⛔⛔ **IT MUST READ THE *ORIGIN* CERTIFICATE, AND THE FIRST VERSION DID NOT.** Connecting to
>   `www.50pick.tz` now returns **Cloudflare's own** certificate (`CN=50pick.tz`, Google Trust
>   Services), which Cloudflare renews by itself and which is never at risk — a different
>   certificate with a different expiry from Railway's (`CN=www.50pick.tz`, Let's Encrypt). The
>   check was green reading the one that renews itself. It now dials Railway's domain target with
>   the hostname as SNI, and carries a **positive control** that fails if it ever reads the edge's
>   certificate again. Both assertions were proven able to fail before being trusted.
>
>   **By hand, if you want it without the suite** — note the host is Railway's target, not `www`:
>
>   ```bash
>   echo | openssl s_client -connect 3hwa21jh.up.railway.app:443 -servername www.50pick.tz \
>     2>/dev/null | openssl x509 -noout -subject -issuer -dates
>   ```
>
>   ⚠️ Expect `CN=www.50pick.tz` / `Let's Encrypt`. If you see `CN=50pick.tz` / `Google Trust
>   Services` you are reading Cloudflare and learning nothing. ⛔ And do not read a working site
>   as proof: the current certificate keeps working right up to the minute it expires, so the
>   site looks perfectly healthy for the entire month in which this is fixable.
>
>   **If it has not renewed:** set the `www` record back to `proxied:false` (seconds, no deploy —
>   `PATCH /zones/99ca5dd0799461d35c6297f34d1e04d1/dns_records/99cd3e4661641ec2c5a41671120998cb`
>   with `{"proxied":false}`), let Railway renew against the direct origin, then re-proxy. Full
>   context in [`LIVE-HOSTING-STATUS.md`](LIVE-HOSTING-STATUS.md) → **EDGE POSTURE**.
>
> ## PLATFORM DEBT, worth a session of its own
>
> - 🔴 **`E-161` — `tsc` does not typecheck `.mts`.** Sized 2026-08-20: **297 files, 1,007 errors**,
>   mostly `TS18048` on un-narrowed `ServiceResult` reads. Not an `include` one-liner: a
>   scripts-scoped tsconfig plus ~1,000 mechanical narrowings. ⛔ **This is not cosmetic** — it is
>   why eleven fixtures kept writing a deleted column while `npm run typecheck` exited 0.
> - 🟠 **`E-172`'s survivor** — the guest header's `Sign up` clipped at **320px**, ~63 identical
>   failures against production. It is the SHARED header; give it its own commit.
> - 🟠 **`E-165`** — `qa:refusal-frames`' drive half, open since session 47.
> - ⏳ **Up & Down chains:** BTC/USD 3m and ETH/USD 3m are **STOPPED on production**; a manual
>   **Generate** still writes a schedule onto a stopped chain (a product decision, `FAILURE-INVENTORY.md` §7.4).
> - ⏳ **A stored `Transaction.description` is ONE English string**, so SW/ZH players read English in
>   the wallet. A rendering change, not a word change — store the instant and the tokens, format at
>   render. Same class as the `§L` label law.
> - ⏳ **`admin/markets/[id]:384` shows YES/NO on an Up & Down round.** The `§L` ratchet stands at
>   **14** and may only go down.
> - ⏳ **Design batch 6** (Ali, 2026-08-14): the `/markets` mobile filter bar 220px → under 120, and
>   chart buttons 40 → 44px. ⛔ RULED OUT by him: compact list · typeahead · admin rails ·
>   `/wallet` tabs · a `rounded-pill` sweep.
>
> - ⏳ **`E-177` — Unit B's payout leg is UNPROVEN on production, by Ali's decision.** The seal moves
>   real money, and he waived it: *"proceed without this real test, if anything happens we detect
>   later in live testing."* So nobody has watched an unverified player actually be PAID, and three
>   things rest on a DB read nobody has taken: the payout completes · `withdraw.initiated` carries
>   `kycStatus` · `withdraw.unverified_payer` lands with a matching `txnId`. 🔑 A zero-money variant
>   exists — a gross ≥ TZS 1,000,000 request returns at the AML hold before any gateway adapter is
>   touched, so both audit rows exist while nothing leaves the platform.
> - ⏳ **`faq3a` tells players a withdrawal needs "an OTP code", in all three languages.** No OTP is
>   collected. Found while removing the identity gate, deliberately NOT folded into that commit.
>
> ## OWED BY ALI — do not chase these, and do not build around them
>
> - 🔴 **Rotate the owner console password** (`POLL-OPEN-FINDINGS.md` **OP3**). It reached a pushed
>   branch in plaintext, *"redaction does not un-publish"*, and it still signs in — confirmed
>   2026-08-20. ⚪ **Ali's call, parked by him on 2026-08-20: "keep for later, I do that one."**
> - **A6 / admin 2FA** — parked by Ali; production reports `adminTotp: DISABLED`.
> - **Board answers still outstanding:** the S&P 500 data-tier purchase · the `USD/KES` `USD/ZAR`
>   direction · whether #12 and #13 are one feature · whether the #9 switch goes on.
> - **Before public launch:** remove the operator credit tools, and rotate the DB password that
>   leaked into a doc.
>
> ## THE RULES THAT KEEP BITING — read before you write code
>
> 1. **A green suite is not evidence.** Drive it on production and read the database, not the page.
>    `E-174` was green three ways before a DB read proved it.
> 2. **An assertion phrased as the current defect goes RED when you fix it.** Invert it, never relax
>    it — relaxing deletes the coverage instead of moving it. Four of these landed in one session.
> 3. **A guard with an ALLOWLIST may be exempting the very files that hold the thing it forbids.**
>    Read the allowlist first and ask what is left to catch.
> 4. **Prove your own new check by mutation.** Two of mine were green over nothing until a mutation
>    said so — one measured an unrelated string, one matched its own explanatory comment.
> 5. **A register row is ONE line.** A multi-line row is not a table row, and the handoff guard then
>    reports "points at a finding with no row".

---

STATUS: the next plan. Written 2026-07-29, immediately after the design system was
frozen and shipped. **Revised 2026-07-31 against the live platform, not against memory.**

> ✅ **CLOSED 2026-08-19 as E-167 — the two stalled Up & Down chains, and the alarm they never had.**
> `advanceChain` now abandons a boundary whose close is already past (decided by the round's own
> SPAN), `openRound` refuses softly instead of letting `createMarket` throw, and the scheduler
> counts consecutive fire failures and writes a durable record through `captureServerError` at the
> third one. ⭐ **The trigger was a price bar that published LATE (302s against a 240s span), not a
> pause and not downtime** — and the chains had been **stopped by hand**, which silenced the logs
> while leaving the code untouched. The whole measured account, including the 8,925-row observation
> census that bounds the live risk, is `FAILURE-INVENTORY.md` **§7.4**.
> ⏳ **Still open:** BTC/USD 3m and ETH/USD 3m are **STOPPED on production** and need starting, and a
> manual **Generate** still writes a schedule onto a stopped chain (a product decision, filed in §7.4).
>
> ⭐ **LABELS HAVE A LAW (2026-08-15) — `DESIGN_AUTHORITY.md` §L, lexicon `src/lib/side-label.ts`,
> guard `test:labels` + `red:labels` (9/9) at the HEAD of `red:all`.** 50pick runs two products
> over ONE storage vocabulary (a side is stored `YES|NO` on both), so a surface that cannot tell
> which product it holds writes the wrong word. Ali's report — *"Up & Down says YES won, should
> be UP won"* — was real and is fixed in **four** places: the Up & Down push, the wallet's
> Activity descriptions, `/positions/performance`, and 15 dictionary/render sites.
> 🔴 **AND IT WAS DECLARED DONE TWICE BEFORE IT WAS.** Consultants found the reported bug still
> live after the sweep shipped, on surfaces it never opened, with **three guards ALL PASS over
> it** — each correct about what it measured, none measuring an **absence**. Full post-mortem:
> `FAILURE-INVENTORY.md` **§7.3/§7.3a**. ⛔ *English-only does not mean machine-only* — a
> `Transaction.description` is rendered verbatim to the player.
> ⏳ **Open:** the wallet description is stored as ONE English string, so SW/ZH players read
> English there (a rendering change, not a word change); `admin/markets/[id]:384` shows YES/NO on
> an Up & Down round; the §L ratchet stands at **14** and may only go down.
>
> ⭐ **NEXT COMMISSION, WRITTEN AND READY:** `docs/SESSION-PROMPT-VISUAL-SWEEP.md` — the whole
> platform, visual only, five failure modes, 360/768/1280/1920 × EN/SW/ZH. ⛔ It leads with what
> **not** to rebuild: 26 design guards and ~65 screenshot drivers already exist.
>
> ⭐ **THE FEEDBACK LAYER HAS A LAW (2026-08-15) — `DESIGN_AUTHORITY.md` §F.** What a
> consequential action answers with — popup · toast · haptic · in-app/push/email, and the
> options inside them — is stated once, per CLASS of action, with a severity rule and a dwell
> rule. Guard `npm run test:feedback-law` (**130**) · `npm run red:feedback-law` (**21/21**).
> The matrix it was derived from is [`docs/FAILURE-INVENTORY.md`](FAILURE-INVENTORY.md) §6:
> **171** server actions, opened at their call sites rather than grepped.
> **UD-22 shipped** — the Up & Down bet now ends in the shared `OperationResultModal` like
> every other money mutation; its "way out" row is COMPUTED per bet (a 3-minute round has no
> free exit at all, and a bonus-funded bet never does), pinned against `cashOutValue`'s own
> expression so client and server cannot drift.
> **Win/loss dwell raised on Ali's instruction (2026-08-15):** celebration 4.5s → **7s**,
> result toasts 6s → **8s**, bet-placed deliberately unchanged, dismissal still instant.
> Values live once in `src/lib/feedback-timing.ts`; `6_000` had been copy-pasted at four sites.
> 🔴 **Two live defects the matrix found:** a background poll fired the money-settled haptic on
> a page render *and over LOSS notifications*; and the push opt-OUT threw away the server's
> `{ ok: false }`, telling a player push was off while the subscription survived.
> ⏳ **Left open, deliberately:** five player surfaces render a raw server sentence as a JSX
> banner (`{sp.error}`), a channel `test:failure-reasons` §10 structurally cannot see — one is
> RG. That is §2.3's wallet/KYC/auth tranche. `test:feedback-law` §8 ratchets it at **5**.
> ⚠️ **Four RED harnesses were ABSENT TESTS** and are repaired — see the §6b handoff. `red:all`
> is a `&&` chain, so the first break starves everything after it.
>
> ⭐ **EVERY UP & DOWN POSITION IS VISIBLE (2026-08-15).** Ali: *"make it show, no matter how
> much position I have, perfectly."* Two surfaces compressed a player's own money and both are
> fixed. `/updown/history` rendered `g.bets.slice(0, 2)` per round card and collapsed the rest
> into a bare `+N` chip **that was not a control** — six positions read as two chips and the
> number four, with nowhere to go for the rest. `/updown/[roundId]` rendered `myPosition`, which
> `myPositionFor` AGGREGATED to one side / one stake / one payout; every position is itemised
> now (side · stake · payout · its own stored result) **beside** the aggregate settlement wrote,
> which is untouched — this path adds no money logic.
> 🔴 **AND A HEDGED HOLDER WAS QUOTED ONE SIDE.** `myPositionFor` picks its single `side` with
> `up >= down`, which is a tie-break, not a fact about the bet — so a player who backed BOTH ways
> saw the larger leg presented as their position. Same class as UD-20 on the board.
> 🔴 **A THIRD DEFECT, FOUND WHILE FIXING THOSE TWO — and the worst of the three.**
> `myPositionFor` read `listPositionsForUser(userId, 500, "UPDOWN")` and only THEN filtered to
> the market. The cap is applied by the STORE, before the filter, so a player past 500 Up & Down
> positions opening an older round got an empty list and the page told them **they had no
> position on a round they had played**. It is a market-scoped query now — the round bounds it,
> so there is no cap to overflow, and it is the indexed lookup on `@@index([marketId, status])`
> rather than a scan of the player's history.
> ⭐ **The remaining read cap is now SAID OUT LOUD.** `/updown/history` reads the most recent 400
> positions and rendered them as the player's whole record — including the P&L strip, whose "net
> return" was then a real shilling figure over an unstated subset. Same class as the `+N` chip:
> not a wrong number, a number whose scope was concealed.
> **Guards:** `test:updown-positions-visible` (29 assertions, each absence check paired with a
> positive control) · `red:updown-positions-visible` (**4/4**, each pre-fix defect restored
> VERBATIM and on its own).
> 🔴 **THE RED PROOF CAUGHT A HOLE IN THE GUARD, which is the point of running it.** Disabling
> the itemised list with `{false && (` left the `.map` in the source, so the assertion stayed
> green over a panel that rendered nothing — E-65 exactly ("the guard asserted the branch
> EXISTED; it did not assert it was REACHABLE"). Reachability is asserted directly now.
> ⚠️ **And the guard's first run failed on a CORRECT file**: the comment explaining the fix
> quotes the defect it replaced, so the absence check matched the prose. Source assertions run
> comment-stripped now — a check that fails when the product is fine is worth nothing.
>
> ⭐ **BATCH 6 IS LIVE (2026-08-15): the phone filter sheet, and the chart rail at 44px.** Both
> pieces Ali commissioned on 2026-08-14 are shipped. Below `lg`, `/markets` puts **odds, pool and
> topic** behind one `Filters` button — a `<details>` bottom sheet with a scrim, so it opens with
> **no JavaScript** on a mid-range Android. The sticky bar went **214px → 116px** at 360×780,
> measured in **both** Swahili and Chinese. ⛔ Sort and status stay in the bar at every width:
> the kit's ruling, *"they answer the first two questions a punter has and must never cost a tap"*.
> `.pchart-range` is **44px**, a literal (`--tap-min` is 40 and would silently revert it).
> 🔴 **The first build put sort inside the sheet** — following PLAN-OF-RECORD §8.8, which the kit
> contradicts in four documents. §8.8 is corrected, and `red:filter-language` case 17 now catches
> the drift. Nothing else would have: that build passed every gate, probe and screenshot.
> 🔴 **`position: fixed` was not fixed to the viewport.** `.route-enter`'s `both`-filled animation
> retains its transform for ever, making it the containing block for fixed descendants on EVERY
> route — the panel measured `top: -32px` with its bottom 172px clear of the window and a scrim
> covering neither end. `<Modal>` escapes this only by portalling to `document.body`.
> ⛔ `transform: none` does not undo it; an animation's applied value beats a normal declaration.
> 🔴 **Three of the batch's own instruments were wrong before the product was** — a "≥90% visible"
> ratio that passed at 95% over that broken layout, a flat timeout that reported a keyframe as a
> layout, and a bounding-box visibility test (a chip inside a CLOSED `<details>` reports
> `display: flex` and a real 81×44 box — `checkVisibility()` is the only primitive that knows).
> 🔴 **AND "the board works with no JavaScript" was false — measured, on production.** Both
> `discovery-bar.tsx` and `menu-shell.tsx` claimed it since batch 1, and §8.8 records it as the
> reason the scrolling strips were chosen **over** this sheet. With scripts disabled the board
> streams through Suspense and React never relocates it: `.kp-discovery-bar` is **0px inside a
> `display: none` holder**, cards in `<template>`s, nothing reachable — the strips no more than
> the sheet. All three files now say the measured thing, and `qa:discovery-board` prints what a
> scripts-off browser sees. ⬜ Making the board render without scripts is a page-architecture
> change, not a filter one; recorded, not half-attempted.
> 🔴 **A CLOSED `<details>` keeps a real box, and that shipped for an hour.** `test:responsive`
> read `button[Close filters] l363 r427 > vw390` at six widths with the sheet SHUT — Chrome hides
> disclosure content through the `::details-content` slot, so the phantom panel still laid out,
> and positioned against the page wrapper it hung past the viewport. A shut sheet lays out
> nothing now. Fixing it then broke a guard's own locator (a second rule whose selector ends in
> `.kp-fsheet-panel`), which `red:filter-language` caught the same minute at 16/17.
> **Guards:** `test:filter-language` **92 assertions** (was 66) · `red:filter-language` **18/18**.
> Full account: PLAN-OF-RECORD §8.7i.
>
> ⭐ **BATCH 5 IS LIVE (2026-08-14): every player filter control is ONE control.** Ali, reading
> the live platform: *"filtering is not designed properly, markets has a different filter design
> than up and down."* Measured in a browser before anything moved: **four control heights (40 /
> 44 / 48 / 64px), two radii, an inline `style` at every diverging call site — and every
> diverging rail outlined EVERY control**, against the round-2 rule that only the selected one
> carries an outline. One primitive now (`src/components/ui/filter-pill.tsx`) serves **eight**
> rails: `/markets`, `/results`, `/proposals`, `/positions`, `/updown` (assets + durations),
> `/updown/history`, `/profile/activity`, `/profile/account`. After: 516 controls measured at
> 360/768/1280/1920 × en/sw/zh — 999px, ≥44px, **0** inline styles, **0** unselected outlines.
> 🔴 **The brief's own scan was wrong in three places, and only re-measuring found it**:
> `/profile/activity` + `/profile/account` were missed entirely (byte-identical rails);
> `/positions` renders **48px, not the 32 it recorded** (`h-8` is 48 on this repo's overridden
> scale); `/markets` had **five** inline-styled controls, not two.
> 🔴 **The reference was breaking the law it set** — `/markets`' chip painted `--pill-active` and
> `--glow-selected` inline, and the five rails told to match it copied the habit. The selected
> state is `.kp-fchip[data-on]` in `globals.css` now, one definition site.
> ⛔ **`test:design-frozen` was green over all six the whole time** — its rules are exempted by any
> line containing `var(--`, and every one of those inline styles did. A green ratchet was not
> evidence.
> 🔴 **A filter control was wearing the money ink**: `.pchart-range.is-active` (the market-detail
> chart's time range) painted `var(--gilt)`. `test:gold-is-money` is scoped to two IDENTITY
> surfaces on purpose, so it could not see it — *a law with a scope is not a law with a gate
> everywhere*. It is `--pill-active` now, and the control reaches the tap floor: batch 4's
> `::after` overlay trick **measured 36px, not 40** (paint order gave the pixels back), so it is
> `min-height` instead.
> ⭐ **`/updown/history` had a filter with no control** — `?day=` arrived only from the daily
> digest's deep link. It now has a day rail derived from the player's own rounds, zero extra I/O,
> each day carrying a count proven promise-vs-delivery.
> **Guards:** `test:filter-language` (66 assertions, in `predeploy`) · `red:filter-language`
> (8/8, each defect on its own assertion — the 8th proves the gate refuses to pass over an EMPTY
> subject set) · `qa:filter-scan` (live geometry, frames, day-rail honesty).
> ⚠️ Deferred with reasons in PLAN-OF-RECORD §8.8: `/markets`' `aria-pressed`-on-a-link, the
> chart range's 40-vs-44, the `rounded-pill` literal, admin rails, `/wallet`'s section tabs.
> ⚠️ **Pre-existing and NOT this batch's:** `red:updown-digest` is 6/7 — its `ungate-refunds`
> anchor in `market-service.ts` went stale at `354bc307` (2026-08-10), four days earlier.
> ✅ **RESOLVED SAME DAY — and ALL EIGHT RAILS ARE NOW VERIFIED ON PRODUCTION.** Ali authorised a
> re-mint (he was on the office PC; the working file was at home): `ops-remint-qa-passwords.mts`
> ran **6/6 re-minted and verified**, his own console login untouched (the tool re-reads `role` off
> the row and refuses any ADMIN), and `qa:filter-scan -- https://50pick.tz --as=alpha` then reported
> **8 of 8 surfaces**, every rail 999px / ≥44px / 0 inline / 0 unselected outlines, with the
> `/updown/history` day rail proven promise-vs-delivery on real data (6 promised, 6 delivered).
> ⚠️ **The HOME laptop's `.env.qa.local` is now stale** until Ali copies the new one across.
>
> ✅ **BATCH 6 IS DONE** (commissioned by Ali 2026-08-14, shipped 2026-08-15) — the record is the
> block above and PLAN-OF-RECORD §8.7i. ⚠️ Its brief, `design-brief/00-NEXT-SESSION-PROMPT.md`,
> is now EMPTY on purpose: a spent brief that still says "paste this as your opening prompt"
> sends the next session to redo finished work.
> ⛔ Ruled OUT by Ali in the same breath, do not re-ask: compact list / density toggle · search
> typeahead · admin filter rails · `/wallet` tabs · the `/markets` `aria-pressed` wording ·
> the `rounded-pill` → `rounded-chip` sweep. All six keep their reasons in PLAN-OF-RECORD §8.8.
>
> 🗄️ **(history) The QA login block, and how it was diagnosed —**
> `login(page, "alpha")` and `"echo"` both land back on the signed-out shell — the identifier
> reaches the server and is rejected. Confirmed with an instrument that is not this session's:
> unmodified `scripts/live-updown-digest.mjs` fails identically. **This blocks every live driver
> that reaches an authed player surface**, so `/positions`, `/profile/activity`,
> `/profile/account` and `/updown/history` are verified on localhost against the identical
> committed code and **not on production**. Stopped at three attempts deliberately — five
> failures lock an account for 30 minutes and these are live accounts on a shared board.
> ✅ **Diagnosed read-only from the live DB instead** — both are `ACTIVE` with a password,
> `lockedUntil NULL`, and `failedLoginCount` **3 and 1, exactly this session's own attempts**;
> `lastLoginAt` is `2026-08-10 23:40` for both. Not a lockout, not a suspension: **this laptop's
> `.env.qa.local` is STALE** — the two-laptop credential trap `LIVE-QA-CAMPAIGN.md` §1 already
> documents, recurring. ⛔ **Not re-minted** (§1 forbids it: a second re-mint just moves the
> lockout to the other machine, and another session was live in this tree).
> **▶ Ali: copy `.env.qa.local` from whichever machine last signed in successfully (2026-08-10
> 23:40 UTC).** Then `npm run qa:filter-scan -- https://50pick.tz --as=alpha` closes it in one
> run; that command exits non-zero on a failed sign-in, so it cannot pass over surfaces it
> never loaded.
>
> 🎨 **DESIGN LANE (2026-08-12):** the round-2 design delivery (landing + `/markets`
> discovery) was accepted and filed at `docs/design-system/v3-2026-08-11-landing-discovery/`;
> all 22 static design gates now run in `predeploy` (were 4, and the chain was broken).
> The living plan is [`../design-brief/PLAN-OF-RECORD.md`](../design-brief/PLAN-OF-RECORD.md);
> the implementation session starts from `design-brief/00-NEXT-SESSION-PROMPT.md`.
>
> ⭐ **BATCH 1 IS LIVE (2026-08-13): `/markets` is rebuilt on the inherited contract.** The
> 13-pill vertical rail is gone, replaced by a sticky two-row bar — five status segments, six
> sorts with a direction toggle, odds and pool chips, a topic menu, per-cause empty states whose
> exits carry real counts, and `PageContainer tier="board"`. Two definitions the kit left open
> and flagged as invented are now pinned on production measurement (PLAN-OF-RECORD §8.1/§8.2):
> **`Open` = LIVE and still taking bets** (hides 1 of 41 today — measured, because macro
> selection-lead runs to 48h and on another book it could hide far more) and **`All` = the
> unsettled book, LIVE ∪ CLOSED** — never the settled archive `/results` already owns.
> **Every count on the board is cross-filtered**: the number beside a control is what pressing it
> delivers, asserted control-by-control against the running server. New gates:
> `test:discovery-contract` (+ its RED harness, 7/7 defects caught). `test:board-discovery` was
> rewritten from source-greps onto behavioural assertions — the old anchors (`DEFAULT_WHEN`,
> `WHEN_CUTOFFS`, `sp.when`) are gone from the product **deliberately; do not restore them**.
> ⬜ Density/compact-list and search typeahead are deferred with reasons in §8.8 — not dropped.
>
> 🔴 **AND BATCH 1 WAS RE-VALIDATED BEFORE BATCH 2 (2026-08-13, later) — it was not done.** The
> board's data was flawless; **two of its six controls were unusable on a phone.** The sort and
> topic menus are `<details>` whose panel is absolutely positioned, and they sat inside the row
> that scrolls horizontally below `lg` — CSS coerces `overflow-y: visible` to `auto` as soon as one
> axis scrolls, so a 62px strip clipped a 362px panel to **4px: 1%, zero of 8 topics reachable at
> 360px**. ⛔ Nothing caught it: no horizontal overflow, every tap target 44px, nothing overflowing
> its own box, and a closed menu screenshots perfectly. **A control's defect can live entirely in
> its open state — the check has to open it**, and `qa:discovery-board` now does (proven RED against
> production, GREEN against the fix). Fixed by moving the menus out of the scrolling strip; the
> mobile bar costs 116px → 220px for it, and the kit's filter sheet would win that back (§8.8).
> Three QA instruments were also green for the wrong reason — a wrong locale cookie that made
> **8 of 12 "trilingual" frames English**, a RED harness whose `\n` anchors could not match a CRLF
> checkout, and a `predeploy` gate that failed 7.5% of runs on a correct product. All in
> [`../design-brief/PLAN-OF-RECORD.md`](../design-brief/PLAN-OF-RECORD.md) §8.7c.
>
> 🔴 **AND `/results` — the platform's OTHER filtering board — was silently ignoring its category
> filter during a search.** Measured on production: `?q=bitcoin` returned the identical four cards
> under `cat=crypto`, `cat=sports` and `cat=weather`, while the rail painted the chosen category as
> selected (without a search it worked: crypto 2, sports 22). Search and category now compose, the
> archive is read once and filtered in JS, and **every category carries a cross-filtered count**.
> Its eight-item hand-written category list is gone — ids from `MARKET_CATEGORIES` (seven), labels
> from the new `src/lib/markets/category-label.ts`, which also absorbed the private `CATEGORY_LABEL`
> from `markets/page.tsx`. Filter links now `replace` instead of pushing history. New guards:
> `qa:results-board` (+ `red:results-filter`, which reintroduces the exact production line, because
> running the guard against prod reds for the *wrong* reason) and `qa:filter-stress` (12 hostile
> payload classes × every param of both boards; **all 288** status×sort×odds×pool combinations).
> ⚠️ Three of this session's own new instruments were wrong before any product defect was found.
> Full account in §8.7d.
>
> ⭐ **BATCHES 2, 3 AND 4 ARE LIVE — THE ROUND-2 DESIGN LANE IS CLOSED (2026-08-13).** All three
> commissioned surfaces are applied: the **hero** (photographic `hero-bg.webp` deleted, replaced by
> the kit's question board built from real market data; cold start is ONE rule — `pricedYesPct` —
> with five consumers), the **landing composition + header + rail**, and `/markets`. 🔴 The ticker
> had been **fabricated** — a hardcoded 12-item synthetic array on every page — and is now REAL
> settlements only, off one `getPlatformStats` scan (settlements never individual bets, PDPA; a VOID
> carries no figure). Two new gates: `test:ticker-honesty` (59 assertions, RED 13/13) and
> `test:landing-contract` (23 assertions, RED 5/5).
>
> **Batch 4 (cleanup) closed it, and found three things that were not on its list:**
> 1. 🔴 **The RG line above the footer duplicated the footer.** Each of its three destinations
>    appeared **twice on one page** at all 12 width×locale combinations, and the dead space was
>    **320px, not the 192px** the finding estimated. ⛔ Two lessons that generalise: `.kp-rg` wrote a
>    `margin` at a boundary whose padding already summed (the `--rh-*` comment forbids exactly this),
>    and **`mt-12` computes to 128px on this repo's CUSTOM spacing scale** (`tailwind.config.ts:176`)
>    — never read a spacing class here as its Tailwind default.
> 2. 🔴 **There were THREE copies of the time-left formatter, not the two the plan recorded** — the
>    third was on `/markets`, the busiest board, with the defective `Math.floor` that renders
>    **"0m left" while a market is still taking bets**. All five callers now delegate to
>    `src/lib/markets/time-left.ts`, and **`test:time-left`** (34 assertions, incl. a vacuity control)
>    + **`red:time-left`** (5/5) now guard it. A doc naming a file is not evidence the file changed.
> 3. ✅ **The frozen card's `Details` link reached the tap floor** (17 → 40px) via an
>    absolutely-positioned `::after` — **zero** layout movement, proven by a before/after geometry
>    diff plus 32 card hit tests, because no bounding-box instrument can see this fix at all.
>
> ⬜ **Deferred, with reasons, Ali's call:** the density toggle / compact list, the mobile filter
> sheet, and search typeahead (all in §8.8). ⛔ **Filter UI for `/live`, `/watchlist`,
> `/leaderboard`, `/fairness` is NOT commissioned** — the kit covers exactly three surfaces.
> ⚠️ **`test:responsive` is RED (81 failures) and it is PRE-EXISTING** — reproduced against
> `www.50pick.tz`, all of it global-header chrome, classified in §8.7g: one instrument artifact (the
> closed language listbox), one real defect only at 320px (below the supported 360 floor), and the
> known signed-in tabletL `Account menu` overflow. Not batch 4's, and deliberately not fixed here.
>
> **▶ NEXT IS BATCH 5 — ONE filter language across the platform.** Ali, 2026-08-14, reading the
> live platform: *"markets has different filter design than up and down... not acceptable in a
> consistent professional platform."* **Measured, not opinion:** six player surfaces filter,
> `/markets` is the reference by law (pill, 44px), and **five diverge** — `/updown` (assets 44/64px,
> durations **40px**), `/results` (48px), `/proposals` (48px), `/positions` (**32px**) and
> `/updown/history`, all on `rounded-md` 8px with **inline `style` at the call site** (law 82).
> ⚠️ `/markets` breaks law 82 too, so extracting the primitive must fix the reference, not copy it.
> 🔴 The deepest defect is not cosmetic: the round-2 rule is **only the selected chip is outlined**
> — the answer to the "chunky" criticism — and every diverging surface outlines everything.
> ⭐ `/leaderboard` + `/fairness` are **pagination-only** and `/live` + `/watchlist` have **no
> filtering at all**, so they are out of scope for a reason that survives scrutiny.
> The brief is written: `design-brief/00-NEXT-SESSION-PROMPT.md`; the scan is PLAN §8.7h.
>
> ⛔ **A6 / admin 2FA is PARKED at Ali's instruction (2026-08-14)** — *"we don't care now about it,
> later, we do keep pending."* It remains the last Wave 1 item and prod still reports
> `"adminTotp": "DISABLED"`; do not start it, and do not lose it.

**Items 1, 2, 3 and 4 are DONE and live.** ✅ **Item 3 (withdrawals) CLOSED 2026-08-10:** the
rail works (four real payouts settled 2026-07-31), the block was ours to lift, and it has been
lifted — the last stuck payout was returned through `/admin/payments`, the queue reads **0**,
`derivePayoutStatus` is **operational**, and the withdraw form is open to players. The
`PAYOUT_TEST_BYPASS_MSISDN` escape hatch is cleared on Railway and `isPayoutTestBypass()` plus
both call sites are **deleted** — one gate, everyone, no exceptions.
🔴 **The live constraint is now the FLOAT — TZS 88,645, which the console itself flags as low —
not the rails.** ⛔ And the rail has **not been exercised since the gate reopened** (0
withdrawals, 0 cash-outs): settlement `BET_PAYOUT` rows credit a wallet *inside* 50pick and are
**not** evidence that money can leave to Selcom. Full mechanics:
[`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) § Current state 2026-08-10.
Multi-container is DONE and merged (2026-07-31); scale ceilings are the one code item left.
What is left on 1 and 2 is not code — it is the operator actions listed under "Only Ali can do
these", below.

⚠️ **Two lanes ran in parallel on 2026-07-30/31** and both have now landed on `main`
(merge `491318a`): the launch-hardening lane (backups → alerting → multi-container) from
`F:\kipindi-main`, and the certification/readiness lane above. If a claim in this file
looks like it contradicts another, prefer the one with the later date and check
`git log --oneline` before rebuilding anything.

---

## ▶ Domain C — communications (in progress, 2026-07-31)

A parallel lane is certifying **C · Communications** (email + notifications). It owns
`email.ts`, `comms-registry.ts`, `notification-service.ts`, the bell and the channels; it does
**not** touch `kyc-*`, `nida`, `storage.ts` or `prisma/schema.prisma`, which belong to the KYC lane
running at the same time.

**Measured on production 2026-07-31 — verify, don't trust:**

| | |
|---|---|
| Notifications | **1,673 — every one `channel: IN_APP`.** `prisma-dal` writes that literal and nothing else writes the table, so PUSH/SMS/EMAIL are unreachable enum members |
| `sentAt` / `failedAt` / `failureReason` | **0 of 1,673.** Written by no code path anywhere in the repo |
| `priority` | `NORMAL` on all 1,673; the other three members unused |
| `event` | a **duplicate of `kind`** — the DAL writes `event: n.kind`, not the `bet.won` the schema comment promises |
| Chinese | **1,573 of 1,673 have none.** Root cause located: of **36** emitters, only **3** set `titleZh`/`bodyZh`. Swahili is complete |
| Users | 42 · locales **40 SW, 2 EN, 0 ZH** · 28 have an email, 20 verified |
| Duplicates | **28 byte-identical notifications (deep-link included) inside 60 s** — WIN ×3, BET_PLACED ×4, DEPOSIT ×20, WITHDRAW ×1. `notify()` has no idempotency key |
| Ordering | **0 violations.** No LOSS ever preceded its market's close notice. But **15 of 47** losses went to players who never received a close notice for that market at all |

🔴 **The one emitter with an idempotency guard has zero duplicates.**
`notifySelectionClosedForMarket` stamps `selectionClosedNotifiedAt` inside `withLock` — and
SELECTION_CLOSED does not appear once in the duplicate set. Every path without such a guard has
produced duplicates, including *"You won TZS 23,349"* twice **84 ms apart** and a TZS 5,000 refund
notice twice 1.25 s apart. That contrast is the argument for the fix.

**All three gates are live and every one was proven red before it was trusted:**

| Gate | Assertions | Red proofs |
|---|---|---|
| `test:cert-c1` email truth | 850 | 16 |
| `test:cert-c2` delivery resilience | 41 | 8 |
| `test:cert-c3` notification truth | 853 | 9 |
| `qa:cert-c1` email visual (4 widths) | 1,519 | — browser gate, outside `test:all` |
| `qa:cert-c3` bell visual | 🔴 **written, never run** — see below | |

🔴 **The one thing this pass did NOT do: look at the bell.** `qa:cert-c3` is written and complete
(empty / 1 item / many / long body / unread badge × 360·768·1280·1920 × en·sw·zh) but has **never
been executed**, so no claim is made about it. A production build refuses to boot without a
database (`store.ts` throws by design), and `next dev` refuses a second server for this directory
while a **hung one from 2026-07-29 (PID 22004)** holds the lock without answering on `:3000` — not
this session's process, so it was left alone. Free `:3000`, then `npm run qa:cert-c3`.

**Fixed:** the ZH gap (all 36 emitters now trilingual) · duplicate money notifications (deduped on
message + deep link, failing open, audited) · `sentAt` now written · `notifyCashout`'s hardcoded
"5-min grace window" · emoji in officer copy · the English-only SSE payload · a 10 s send timeout
where there was none · a dead provider now reports `DOWN` on `/api/health` and writes a COMPLIANCE
audit row once per outage · a `200` with no `MessageID` no longer counts as delivered.

**Original C1 note:** `npm run test:cert-c1` (843 assertions) — see the C1 dossier in
[`MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md). The inventory is code now
([`src/lib/server/comms-registry.ts`](../src/lib/server/comms-registry.ts)), and two defects that
five green suites had been sitting on top of are fixed: an unescaped `heading()`/`ctaButton` that
carried a **player-controlled display name into the inbox as live markup**, and three emails —
including self-exclusion and the mail every **failed payout** sends — that showed the player raw
HTML tags as text.

⚠️ **`email.ts` has no timeout anywhere**, and `password-reset` / `email-verification` **await** the
send inside a request. A hung Postmark hangs those requests. A dead key is one `console.error`.

---

## ▶▶ PICK UP HERE — close of session 2026-07-31 (late)

**The tree is clean and everything below is pushed. Nothing is half-finished.**

**Read [`MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md) first** — the platform
is now divided into **52 modules across 12 domains**, each with a dossier, an attack list and a
gate. That document commands the remaining work; this one holds launch-hardening state.

**On a machine that has never seen this repo? → [`SETUP.md`](SETUP.md)** — prerequisites, how to
boot with no database at all, `railway run` vs `railway ssh`, and a symptom→cause table for the
traps that waste an afternoon. Then [`README.md`](README.md), the doc index.

### What this session shipped

| | |
|---|---|
| **Merged: the launch-hardening lane** | Backups (8 defects the first real drill found), alerting (`@sentry/node` + the off-box PII scrub), and the **multi-container leader lease** — proven with two real OS processes racing on real Postgres, `s12` now in CI beside s10/s11. See items 1, 2 and 5 below. Suite **114/116** after the merge. |
| Wave 0 · `test:cert-devroutes` | 110 assertions. Every exported handler under `api/dev-test/` and `api/dev/` must refuse in production **before its first `await`**. All 36 were guarded only by a convention repeated 35 times. Proven red. |
| Wave 0 · `test:orphans` | **145 of 286** `scripts/` files are run by nothing. Now declared in `scripts/orphan-allowlist.json`; the gate refuses to re-seed. **145 → 0 is the program's progress metric.** |
| Wave 1 · **F1 G8** `test:cert-f1` | 69 assertions. Players are now told, in en/sw/zh, that withdrawals cannot be paid — on withdraw **and** deposit (above the cashback promo). `unavailable` disables the form *and* the server action refuses. Officer control on `/admin/payments`. **The banner cannot be forced green:** `worstOf(declared, derived)`. |
| `npm run test:docs` | Every link, `scripts/*` path and `npm run` reference in `docs/` must resolve. |
| `docs/README.md` | New index — all 41 docs with an honest status (LAW / LIVE / RECORD / OPEN / DESIGN / HISTORICAL). |
| Wave 1 · **A6 honesty** `test:cert-a6` | 16 assertions. Admin 2FA is OFF in production and **nothing said so** — now `/api/health` reports `security.adminTotp` (live-verified `"DISABLED"`) and every boot warns, naming the lockout hazard. Pins the bypass to a closed set of 4 doors. |
| `docs/SETUP.md` | New-machine setup, and `CLAUDE.md` now opens with a START HERE pointer. |
| Orphans | **145 → 140.** Five ops tools adopted under `ops:` (never `test:` — they need live credentials). |
| Suite | **113/113 green** (`--skip responsive,motion`). `test:responsive` still unverified — see the trap list. |

### ✅ DONE — domain D (KYC) certified and live, 2026-07-31

**D1 · D2 · D3 · D4 are certified.** 4 headless gates + 2 browser gates + 2 concurrency proofs,
every negative assertion broken on purpose and observed red. Shipped in three pushes, all three
deploys verified on production. Full record in
[`MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md) §4 and §9 — **that document
owns the detail; do not duplicate it here.**

| | |
|---|---|
| Gates | `test:cert-d1` (40) `test:cert-d2` (33) `test:cert-d3` (25) `test:cert-d4` (24) · `qa:cert-d1` (19) `qa:cert-d2` (26) |
| Proofs | `load:nida-race` (two OS processes) · `load:kyc-race` (real Postgres, 11 assertions) |
| Orphans | both KYC E2Es **adopted**, allowlist 140 → 138 |
| Suite | **122/122 green**, tsc clean |

**What was found, in one line each:** a player whose NIDA check FAILED was shown a green *"NIDA
number accepted"* banner while their inbox held *"Identity check needs attention"* · one NIDA
could hold two accounts (closed with a partial unique index, now live on production) · a renamed
`.exe`, an SVG carrying `<script>`, a zip and raw HTML were all accepted as ID documents · three
legal documents in three locales claimed a NIDA authority check that has never existed · a player
could silently overwrite a Source-of-Funds declaration an officer had ACCEPTED · the
Approve/Reject/Escalate controls were 38px on a phone.

⚠️ **Correction to what this file previously said.** The 24 inline documents are **NOT** evidence
that the R2 seam is misbehaving "even though `KYC_STORAGE=r2` is set". Ordering every document by
`uploadedAt` shows two clean, non-overlapping eras — all 24 inline uploaded 06-13→06-15, all 7 R2
uploaded 07-27→07-28, **zero interleaving**. They are LEGACY, from before R2 was switched on, and
every upload since has been correct. The real risk was that the seam *could* degrade silently;
`assertStorageModeIntended()` now makes that an error before any inline write.

⏳ **Still open, and both are yours:** the purge of those 24 legacy documents (all 8 owning
submissions show zero balance / zero transactions / zero positions — the evidence the owner
decision asked for — but that does not establish consent to destroy someone's ID; a six-step
procedure is in D2's dossier), and **item D2 below — narrowing the R2 token**.

### 🔴 Start here, in this order

1. **A6 — finish turning admin TOTP on.** The honesty half is done (`test:cert-a6`, 16 assertions):
   `/api/health` now reports `security.adminTotp`, and every production boot warns. **The flip
   itself is Ali's**, and the order matters:
   `railway ssh "node scripts/admin-2fa-readiness.mjs"` → enrol at `/admin/2fa/setup` while 2FA is
   still off, storing backup codes off-machine → re-run the readiness check → only then
   `railway variables --set DISABLE_ADMIN_TOTP=false` → confirm health says `"enforced"`.
   ⚠️ `admin/layout.tsx` **forces** enrolment, so flipping with zero enrolled admins locks Ali out
   with no admin able to readmit him.
2. **Wave 2 — the money core** (G1–G4, then E1–E3). This resolves the orphan TZS 100,000 wallet and
   the broken audit-chain link. ✅ **G3 IS NO LONGER BLOCKED** — Ali ruled on the fee basis on
   2026-08-14: **13% of the LOSING side, both products** ([`RULES.md`](RULES.md) is the
   authority; `FEE-MODEL-DECISION-2026-07-14.md` is superseded history). Driven with real money
   on production, both products, tying out to the ledger with a zero pool residual.
3. **F1's remaining gates** — G3 (double-pay adversarial) and G7 (rail-failure resilience). G8 is done.

### ⛔ Do NOT do these — each would undo a deliberate decision

- **Do not add a two-officer/solo-resolve hard-lock.** See the note under item 3 below and H6's
  dossier. Superseded by the owner decision of 2026-07-24; `test:two-admin` asserts its absence.
- **Do not certify J1 (Up & Down)** until Ali rules on `feat/updown-source-pinning-and-proposals`
  (28 commits, unmerged). Certifying first would certify a live money bug.
- **Do not reopen design.** Frozen. Write findings down instead.
- **Do not re-seed `orphan-allowlist.json`.** It may only shrink.

### 🔴 New finding, measured on production 2026-07-31

**Nine active ADMIN accounts** (plus one FINANCE), of which **only 2 have TOTP enrolled**. Every one
of the nine can resolve markets single-handed, adjust balances and run money-ops. **Review the nine
with Ali and demote whoever does not need ADMIN** — the cheapest security work available, and it
shrinks the blast radius of the 2FA gap instead of only reporting it. Tracked in B2's dossier.
Re-measure any time with `railway ssh "node scripts/admin-2fa-readiness.mjs"`.

### Still only Ali can do these

~~Create the `50pick-backups` R2 bucket~~ ✅ **done 2026-07-31 — the bucket exists and TWO
sealed artifacts are in it, one shipped by CI itself; the unattended nightly is proven.**
~~decide the orphan TZS 100,000 wallet~~ ✅ **done — cleared, and `trialBalance()` now returns
`ok:true` for the first time.** ~~90-day lifecycle rule~~ ✅ **done — `expire-backups-90d`,
all objects, Enabled** (the nightly still prints `RETENTION UNVERIFIED` because the token
cannot read bucket config; that is accurate, not a bug — see the runbook).

~~`BACKUP_ENCRYPTION_KEY` into a password manager~~ ✅ **rotated 2026-07-31 and now readable
on Railway** — the previous one existed ONLY as a GitHub secret, which cannot be read back,
so every nightly artifact was undecryptable by anyone. A password-manager copy is still
worth adding. ~~set `SENTRY_DSN`~~ ✅ **alerting is LIVE** — see item B below.

**Still outstanding:** narrow the R2 token, which currently reaches ALL buckets · rule on the
fee basis · rule on the Up & Down branch · turn on admin 2FA (readiness check FIRST).

⚖️ **Owner decision, Ali, 2026-07-31: credential rotation is NOT being done.** The R2 keys,
the Sentry auth token and the Postgres password have all passed through session chat and
are knowingly being kept. Recorded so it reads as a decision rather than an oversight —
**do not re-raise it as an open item.** If that changes, rotate Railway and GitHub in the
SAME sitting: rolling the R2 token without updating Railway broke KYC storage on production
earlier that day.

---

## ▶ Earlier that day — state at the close of 2026-07-31

**Nothing is half-finished. No branch is mid-edit, no test is mid-run, the tree is clean
and everything below is pushed.** Head `main` at the time of writing: the `test:docs` guard
commit.

**What that session did, so you don't redo it:**

| | |
|---|---|
| GitHub repo secrets | ✅ all seven set + verified (`gh secret list`). `railway run node scripts/backup-secrets.mjs` re-checks them |
| Nightly backup | ✅ runs end-to-end on Actions. A real run dumped production (32,538 rows, 13.8 MB sealed), restored into a throwaway PG18 and passed **79 checks** |
| 🔴 The bug it found | The workflow reported **every step green while NOTHING had ever gone off-box** — `\| tee` swallowed the upload's exit code. Fixed with `set -euo pipefail` + an explicit empty-destination failure, and **proven red**. Full account in [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md) |
| Selcom probe | ✅ fixed — it reported `USABLE RAILS: NONE` (i.e. "the vendor account is dead") whenever run via `railway run`. See [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) |
| Payout state | ⚠️ **SUPERSEDED later on 2026-07-31 — Selcom fixed TIPS and payouts now pay.** Two settled end to end. What still holds from this row: float TZS 100,000, `SELCOM_PESA`/`HUDUMA_AGENT` still `4035`, and the two payouts from 07-29 still stuck at `999`. See [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) § Current state — 2026-07-31 |
| New guard | `npm run test:docs` — every link, `scripts/*` path and `npm run` reference in `docs/` must resolve. Broken on purpose and observed to go red |
| Test suite | **111** `test:*` scripts. 108 verified green; `test:responsive` still unverified (see the trap list below) |

**~~The ONE thing blocking backups~~ — RESOLVED 2026-07-31.** The bucket exists, two sealed artifacts are in it (one shipped by CI), and a 90-day expiry rule is set. Historical text follows: the `50pick-backups` R2
bucket does not exist. Cloudflare → R2 → Create bucket. The Railway R2 token is
bucket-scoped and cannot create it. Then prove it with
`railway run node scripts/backup-verify-offbox.mjs` — **do not trust a green tick**, that is
exactly what went wrong.

**Also outstanding from that session, and easy to lose:** `BACKUP_ENCRYPTION_KEY` was
generated into `.env.backup.local` (gitignored) and **must be moved into a password
manager**. It is the seal on every artifact the nightly will write. The previous drill's key
was written to that same path and lost.

# 50pick — next plan: LAUNCH HARDENING

The design pass is done and live. Design is no longer a source of risk: it is frozen
behind `test:design-frozen`, and a change is a token edit in one place.

**What is left is not features. It is the things that decide whether a live real-money
platform survives its first bad day** — a lost database, an error nobody sees, a second
container, a withdrawal that cannot be paid.

This file is the brief. Copy the block at the bottom into a fresh session.

---

## Where we actually stand (re-verified 2026-07-31 against production, not assumed)

| | State |
|---|---|
| Live | `www.50pick.tz`, Railway `50pick` / `production`, running `be4a12be`; `/api/health` `ok:true` |
| Money mode | **TEST** — deposits real via Selcom. ✅ **WITHDRAWALS ARE OPEN TO PLAYERS as of 2026-08-10**: the last stuck payout was returned via /admin/payments, the queue reads 0, and derivePayoutStatus is operational. The PAYOUT_TEST_BYPASS_MSISDN escape hatch is cleared and isPayoutTestBypass() is deleted — one gate, everyone. 🔴 The live limit is the FLOAT (TZS 88,645, console-flagged low), not the rails; and the rail has not been exercised since reopening, so settlement BET_PAYOUT rows are NOT evidence money can leave to Selcom. |
| Test suite | **110** `test:*` scripts. **108 verified green 2026-07-31**; `test:responsive` was **not** verified — see below |
| Design | FROZEN + LIVE (B9/B10, `test:design-frozen`) |
| Error tracking | ✅ code complete — durable + scrubbed + `@sentry/node` wired and proven (`test:alerting`). ⚠️ **`SENTRY_DSN` is NOT set in Railway (verified), so nobody is paged.** `/api/health` reports `monitoring.alerting:false` |
| Database backups | ✅ toolchain complete, **drilled against production**, and the nightly now runs end-to-end on GitHub Actions (secrets set 2026-07-31; a real run restored production into a throwaway PG18 and passed 79 checks). 🔴 **Nothing is off-box yet — the `50pick-backups` bucket does not exist.** The job correctly fails red on it now; until 2026-07-31 it reported GREEN while shipping nothing, see [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md) |
| KYC storage | ✅ live on R2 — `R2_BUCKET=50pick-kyc`, endpoint + keys set in Railway |
| Admin 2FA | ❌ **OFF in production** — `DISABLE_ADMIN_TOTP` is set. Must be off before real-money launch; flipping it blind risks locking Ali out, so it needs an enrolment first |
| Multi-container | ❌ unsafe — `admission.ts`, `rate-limit.ts` and the ticker keep state in module scope |

### Only Ali can do these (nothing in the repo can advance them)

| # | Action | Why it cannot be automated |
|---|---|---|
| A | **Tell Selcom to enable `SELCOM_PESA` + `HUDUMA_AGENT`** | Their switch. Unblocks paying customers; the ladder already tries both, so no code change |
| B | ~~Set `SENTRY_DSN`~~ | ✅ **DONE 2026-07-31 — alerting is LIVE.** Org `50pick`, project `50pick-server`, **EU region** (`de.sentry.io`). `/api/health` reports `alerting: true`. Proven by pushing a labelled error through the real path and **reading it back out of Sentry**: the stored issue title is `payout failed for <msisdn> (<email>) nida=<digits>` — scrubbed in Sentry's own record, not just in what we sent. Repeat with `npm run ops:sentry-smoke` |
| C | ~~Add the GitHub repository secrets~~ | ✅ **DONE 2026-07-31.** All seven set. 🔴 **`BACKUP_ENCRYPTION_KEY` was ROTATED later that day**: the previous one existed ONLY as a GitHub secret, which cannot be read back by anyone — so every nightly artifact was **undecryptable**, while restoring, verifying and recording `verified: true`. It is now on **Railway** (readable), in GitHub, and in `.env.backup.local`, and the newest artifact was opened with it to prove it. A password-manager copy is still worth adding. See the runbook's key section |
| D | ~~Create the `50pick-backups` R2 bucket~~ | ✅ **DONE 2026-07-31.** Bucket created (WEUR, Standard, private), R2 credentials updated on Railway **and** in the GitHub secrets, and run `30615505120` shipped its own 13.18 MB artifact. Verified by listing the bucket, not by the tick. ⚠️ **Rolling the old token broke KYC storage on production** until Railway was updated — see the runbook; never roll the token in use |
| D2 | **Narrow the R2 token to `50pick-backups` only** | The current token reaches ALL buckets (chosen for speed), so one leaked key reaches both the KYC documents and the backups containing them. A Cloudflare action + updating two GitHub secrets |
| D3 | **Add an Object Lifecycle Rule** on `50pick-backups` — **expire after 90 days** | Dashboard-only: an Object Read & Write token cannot write bucket config (`PutBucketLifecycleConfiguration` → `AccessDenied`, tried 2026-07-31). Otherwise every KYC record on the platform accumulates there forever — a data-protection problem, not a storage bill. **The nightly now nags about it every run** until it can confirm a rule |
| E | ~~Decide the TZS 100,000 orphan wallet~~ | ✅ **DONE 2026-07-31**, at Ali's instruction. Reversed through the audited path, then the missing ledger entry backfilled. **`trialBalance()` now returns `ok: true` — 0 drifting wallets, 0 drift** for the first time. Script: `scripts/ops-clear-unledgered-credit.mjs` (refuses without `--actor`, dry-run by default) |
| F | **Rotate the Postgres password**, and the credentials exposed in chat | Rotating live DB creds mid-session takes the site down if mistimed |

### The four things that would hurt most, worst first

1. ✅ **Backups — DONE 2026-07-30. THE DRILL HAS BEEN RUN AGAINST PRODUCTION.** A sealed
   13 MB artifact was taken, shipped, restored into a throwaway PostgreSQL 18.3, checked
   by 79 assertions, and `db:restore` was rehearsed to exit 0. `/admin/compliance` now
   reads that run. Nightly at 00:15 UTC via `.github/workflows/backup-nightly.yml`.

   ✅ **AND THE UNATTENDED NIGHTLY NOW WORKS — 2026-07-31, run `30615505120`.** All seven
   repository secrets set, `50pick-backups` created, and a dispatched run dumped
   production, shipped it off-box, restored it into a throwaway PostgreSQL 18 and recorded
   `verified: true` with a real `destination`. The bucket holds two objects and the newer
   one is CI's. Confirmed by listing the bucket — the previous "all steps ✓" was a job in
   which nothing had ever left the runner.

   🔴 **The drill found EIGHT defects, and that is the finding.** The toolchain had been
   green on 59 checks the whole time. Among them: `db:restore` summed a column that does
   not exist and so **reported a successful recovery as a failure**; the seal key had two
   different names, so the one tool needed during a recovery could not open what the other
   two produce; **a unique index was missing from every artifact ever written** (an FK's
   `conindid` made the index filter skip it) — row counts, money and the audit chain all
   still matched, and the only symptom would have been a duplicate months later; the dump
   read data and invariants on different connections, so a live platform made the manifest
   contradict itself; and two of the files **could not be parsed** while
   `npm run typecheck` reported success, because `.mts` is outside the root tsconfig.
   Full list and what changed: [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md).

   ⚠️ **Source problems are not backup problems.** The first verification ended in "DO NOT
   TRUST THIS BACKUP" over four failures that production reports identically. The artifact
   was flawless. Verification now compares restored-vs-**source**, and the source's health
   is reported separately — otherwise the nightly is red forever and people stop reading it.

   ⏳ **Operator actions left:** C and D in the table above.

   🔴 **Correction, 2026-07-31.** This file previously said *"`BACKUP_ENCRYPTION_KEY` was
   generated locally into `.env.backup.local` (gitignored) — copy it into a password
   manager."* **That file does not exist**, in `C:\kipindi-main`, in the `kipindi-night`
   worktree, or anywhere else searched. The key from the drill is **gone**. This costs
   nothing today — the drill artifact was local and disposable, nothing has been uploaded
   off-box, and no stored backup is stranded — but it would have been read as "the key is
   safe on the laptop". **Generate a fresh 32-byte key at the moment you add the repository
   secrets, and put it in a password manager in the same sitting.** Do not write it to a
   file and intend to move it later; that is exactly what did not happen here.

   🔴 **A live money finding the drill surfaced, needing Ali:** one wallet holds
   **TZS 100,000 with no ledger entry, no `Transaction` and no audit row**, and the audit
   chain reports a broken link. Both are on production, both are on `/admin/compliance`
   under the backup card, and neither is a backup problem. See the runbook's "Open
   finding" section for what was and was not confirmed about its origin.

   ⚠️ Worse, until 2026-07-29 `/admin/compliance` rendered a **hardcoded green ✓**
   reading *"Auto-snapshot on every mutation · HMAC-signed · last 12 retained ·
   disk-backed"*, and `/admin/system` stated *"Backup → Postgres point-in-time recovery
   … replicated across two regions"* as fact. None of it existed: no script, no snapshot
   writer, and nothing reads `STORE_BACKUP_DIR` (it survives only in `.gitignore`). The
   tick sat beside the audit-chain card, which reads live state, so it borrowed real
   credibility. Both now state the truth. **When you build backups, wire this card to the
   REAL last-run state — do not restore a static tick.**
2. ✅ **Error tracking — CODE COMPLETE 2026-07-30, one operator action left.**
   `@sentry/node` is installed and the seam is **proven end to end**: `test:alerting`
   (27 checks) points a real Sentry client at a throwaway HTTP server on `127.0.0.1`,
   pushes a real error through the real `captureServerError`, and inspects the bytes that
   arrive. **Ali sets `SENTRY_DSN` and redeploys — that is the whole remaining step.**

   🔴 **That gate found a dormant data-protection bug.** `captureException` was handed the
   **raw** error while only the audit sink ran `scrubForAudit`. The scrubber sat one line
   above the call that ships data off-box and was not applied to it, so the *first alert
   ever sent* would have carried a player's phone number out of Tanzania. Proven, not
   argued: delete `beforeSend` and the gate catches a real `+255…`, a real email and a
   real NIDA in the envelope on the wire. It was invisible only because no DSN was ever
   set. Now every string in an event is scrubbed — messages, stack frames, breadcrumbs,
   `extra`, framed local variables — cycle-safe, built on the same `scrubForAudit` the
   audit sink uses so the two lists cannot drift.

   **Durable ≠ alerting, and both `/api/health` and `/admin/compliance` now say which is
   which.** Until the DSN is set the card reads "Durable — but nobody is paged".

   Historical detail below.

   ~~**HALF CLOSED.**~~ ✅ Production exceptions are **durable**:
   `onRequestError` → `captureServerError` writes a PII-scrubbed, deduped `SYSTEM /
   server.error` audit row (stack included, repeat-count carried) alongside the `[snag]`
   log. This mattered more than it sounds — chasing a payout failure ten minutes old that
   day, Railway's log buffer had **already rolled past it**, so nothing survived to find.
   Guarded by `test:monitoring` (23 checks, scrubber driven behaviourally).
   ⚠️ **Still missing: ALERTING.** Nothing pages anyone; you must go and look. `monitoring.ts`
   is a ready seam — `npm i @sentry/node` + `SENTRY_DSN` activates the off-box mirror with no
   other code change. Sending a licensed operator's data off-box is Ali's call.
3. ✅ **RESOLVED 2026-07-31 — Selcom fixed TIPS and withdrawals now pay.** Two real payouts
   settled end to end (`wdr_95e5cddab0fbfcb3fdbf`, `wdr_009c1a7c3662aaabcf47`, TZS 1,970 each,
   `resultcode 000`), the first successes in the platform's life. The success path —
   confirm → hold release → ledger → notification → "Withdrawal sent" email — has now run.

   🔴 **But withdrawals are still SHUT to players, and it is no longer Selcom's rail.** The
   payouts stranded at `999` since 07-29 (three by the 2026-08-02 count, TZS 17,000 of a
   customer's money) are older than `UNAVAILABLE_AFTER_HOURS`, so `derivePayoutStatus` reports
   `unavailable` and the form refuses everyone. **Closing them is what reopens withdrawals**;
   no code change will, and an officer cannot override it (`worstOf(declared, derived)`, by
   design). ⭐ **CORRECTED 2026-08-02 (see `SELCOM-PAYOUT-RAILS.md` § Current state): closing
   them is OURS to do** — the prepaid float proves none of the three ever paid, and
   `/admin/payments` → "Return to player" (reason ≥10 chars) closes each safely
   (`reverseStuckPayoutAction` re-queries the provider first and refuses a CONFIRMED payout).
   ✅ **ALL OF THAT IS DONE — 2026-08-10.** The last stuck payout was returned, the queue reads
   **0**, `derivePayoutStatus` is **operational**, and the withdraw form is open to players.
   `PAYOUT_TEST_BYPASS_MSISDN` is cleared on Railway and `isPayoutTestBypass()` plus both call
   sites are **deleted** — there is no bypass left to seal. 🔴 **The live constraint is now the
   FLOAT (TZS 88,645, flagged low), not the rails**, and the rail has not been exercised since
   the gate reopened — ⛔ settlement `BET_PAYOUT` rows are an internal wallet credit and are
   **not** evidence that money can leave to Selcom.

   🔴 **One bug was ours, and only a working rail could expose it:** Selcom refuses a NET below
   TZS 1,000 (`resultcode 013`). Our minimum was 1,000 *gross*, so after the 1.5% fee we asked
   for 985 — the smallest withdrawal we advertised was undeliverable. Fixed by checking the net
   against `PROVIDER_MIN_PAYOUT_TZS`, with the form minimum **derived** from the live fee rate
   (`minWithdrawalForRate`) rather than hardcoded, since the fee is admin-tunable.

   Until then the asymmetry stood: players could put money **in** and not take it **out** — the
   single worst thing a gambling operator can ship, and a licence question, not just an ops one.

   Everything on our side is ruled out with evidence: float funded, PIN set,
   `WALLET_CASHIN` provisioned, payee number valid, `utilitycode` correct, signature
   accepted. And a payout still returns `010 "Invalid mobile number or operator not
   supported"` — while `namelookup` on the *same number, minutes apart* returns `000
   SUCCESS` with the correct registered name. Their gateway contradicts itself; every
   status query returns `999 "No reponse from upstream system"` **including for a transid
   that does not exist**, which points at their upstream (TIPS) being down.

   ▶ **The ask: enable `SELCOM_PESA` and `HUDUMA_AGENT`.** Both are Selcom-internal, do not
   ride the broken upstream, and **the fallback ladder already tries them — no code change.**

   ⛔ Do **not** "fix" this by editing `mnoToSelcomCashin`. The codes are proven correct.
   ⛔ Two superseded diagnoses are fenced in the rails doc — do not re-derive them.
   Full state: [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) § Current state.
4. ~~**`scripts/gift-admin-credit.ts` still exists.**~~ ✅ **DONE 2026-07-30.** Deleted, along
   with `docs/OPERATOR-CREDIT-TOOLS.md` (per that file's own removal checklist);
   `scripts/credit-user.ts` was already gone. Nothing in the repo can mint balance now
   except `scripts/seed-test-float.mjs`, which **refuses outright when
   `NODE_ENV=production`** and is guarded by `test:float-guard`. ⚠️ Step 4 of that
   checklist — **rotate the Postgres password** — is still outstanding and is Ali's call.

### Known scale ceilings (measured, from `POLISH-BACKLOG.md` §3)

Each is fine today and bites at a stated threshold — none is speculative:

- **~125 concurrent SSE clients** (`event-bus.ts` `setMaxListeners(500)`, 4 listeners per
  client) on a product whose pitch is live odds.
- **~1k users:** the public leaderboard runs `db.user.list()` with no `where`/`take`, then
  one positions query per user, uncached. Whoever shares that link is the trigger.
- **~1k users:** `db.txn.listAll()` walks the whole transactions table into memory from
  12+ call sites — while the adjacent `txn.search` does it correctly and its own comment
  says the table "must never be walked in memory".
- **Multi-container is unsafe today.** Correct only because production runs ONE container.
- **Lifecycle ticker:** serial sweeps on a 60s interval guarded by a process-local boolean.
  Past one pass > 60s it starts skipping. ✅ **No longer silent (2026-07-30):** each skip is
  logged with how long the pass has held and which chores did not run, consecutive and
  lifetime counts are kept, a COMPLIANCE audit fires after 5 consecutive skips (~5 min of
  stalled payment reconcile), and `/api/health` reports `ticker`. Guarded by
  `test:payout-observability` §7. The ceiling itself is unchanged — a pass still has to fit
  in 60s; you will now simply know when it does not.

---

## What still governs (read before touching anything)

- [`docs/README.md`](README.md) — **the index. 41 docs, each with an honest status: LAW, LIVE,
  RECORD, OPEN, DESIGN or HISTORICAL.** Read it before opening anything else in `docs/`; from
  the outside a snapshot of a Tuesday in May looks identical to a law
- [`docs/MODULE-CERTIFICATION-PROGRAM.md`](MODULE-CERTIFICATION-PROGRAM.md) — **52 modules, 8
  gates, 0 certified.** The program that finishes the platform module by module. This file
  (launch hardening) and that one (certification) are siblings; neither supersedes the other
- `CLAUDE.md` — how this repo works
- `docs/DESIGN_AUTHORITY.md` — B1–B10, and "what the freeze pass found — do not undo"
- `docs/design-system/v2-2026-07-27/06-patterns-and-rules/` — RULES.md (16 laws) +
  MERGE-DISCIPLINE.md
- `docs/perfection-plan.md` — the 0-issue launch plan and its 9 role gates
- `docs/LAUNCH-GO-NO-GO.md` — the env/infra checklist
- `docs/POLISH-BACKLOG.md` — §2 FIX SOON and §3 LATER are still open; §1 and §4 are done
- `docs/GO-LIVE-RUNBOOK.md`, `docs/SELCOM-DISBURSEMENT-ACTIVATION.md` — payments ops

---

=== BEGIN NEXT PROMPT ===

You are working in the **50pick** repo (`kipindi-main`), a licensed real-money prediction
platform that is **already live** at `www.50pick.tz` in TEST money mode. This is the
**launch-hardening** pass. It is not a feature pass and not a design pass — design is
frozen and must not be reopened.

Read first: `CLAUDE.md`, `docs/NEXT-PLAN.md` (this file's "where we stand"),
`docs/DESIGN_AUTHORITY.md`, `docs/perfection-plan.md`, `docs/LAUNCH-GO-NO-GO.md`,
`docs/POLISH-BACKLOG.md` §2–§3.

**Verify every claim above before you act on it.** The last pass found three test gates
that were passing while the thing they guarded was broken — a contrast audit that
hardcoded the token values it was meant to check and hid a real AA failure, a bridge test
querying the wrong Tailwind map, and a component that re-typed its own tokens by hand. A
green gate is evidence, not proof. Check the artifact the user actually receives.

### ✅ Already done — do NOT rebuild these

Three of the original six items are closed and live. Rebuilding them is the most likely way
to waste this pass, so they are named explicitly:

1. **Backups + a proven restore — DONE 2026-07-30, drilled against production.** The
   toolchain exists (`db:backup` / `db:verify-backup` / `db:restore` / `db:scratch`),
   `test:backup` is 113 checks, and a real artifact was restored into a throwaway
   PostgreSQL 18.3 and diffed. What is left is **operator setup only** (secrets + bucket).
   Read [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md) — especially the eight defects the drill
   found that 59 green checks had not.
2. **Error tracking — CODE COMPLETE 2026-07-30.** `@sentry/node` wired, scrubbing proven on
   the wire by `test:alerting` (27 checks). Left: **Ali sets `SENTRY_DSN`.** Do not rebuild
   the seam; do not add a second scrubber.
3. **Balance-minting scripts — DELETED 2026-07-30.** Only `seed-test-float.mjs` remains and
   it refuses in production (`test:float-guard`).

### The actual work, worst risk first

**1. Withdrawals — tell the player the truth while they are down.** The payout blocker is
Selcom's (item 3 above) and no code fixes it. What *is* ours: an operator that accepts
deposits while withdrawals cannot be paid **must say so plainly, in the product**, in all
three languages. Check what the wallet and cash-out screens currently promise a player
about timing, and make them honest. This is a licence exposure, not a nicety.

**2. Scale ceilings** — ✅ **the expensive ones are DONE and MEASURED (2026-07-31).** The
backlog said they "bite at ~1k users"; that was reasoned, not measured. Seeded a disposable
Postgres to 1,000 users × 100 transactions (`scripts/load/s13-scale-ceilings.mts`) and timed
the real paths:

| at 100k transactions | before | after |
|---|---|---|
| 30-day report window | 3,321 ms · **385 MB heap** | **303 ms** (54 ms with the new index) |
| one player's transactions | 3,783 ms | **11 ms** |
| build the leaderboard | ~2,236 ms, **pool exhausted mid-run** | **6 ms** |

The heap figure was the real danger — a Railway container has 512 MB, so one report on a
moderately busy platform was near the end of the process. The leaderboard was worse: a
**public** page whose trigger is somebody sharing the link.

Parity is guarded, not assumed — `npm run test:report-parity` (28 assertions) drives both
implementations over a fixture with a row sitting exactly on each window bound, because GGR
feeds the TRA and GBT levies and a moved boundary moves money between two filings.

⏳ **Still open, stated rather than implied fixed:** `reports/catalogue.ts` (3 sites) and
`insights.ts` still walk the whole table — they are all-time statutory aggregates, so the
fix is a `GROUP BY` per report, not a smaller scan. And the **SSE ceiling (~125 concurrent
clients)** is untouched, on a product whose pitch is live odds. Both in
`POLISH-BACKLOG.md` §3.

**3. Admin 2FA is OFF in production** (`DISABLE_ADMIN_TOTP` is set — verified 2026-07-31).
It was disabled deliberately so a consultant could test, and must be on before real money.
**Do not simply unset it** — confirm an admin has TOTP enrolled first, or the flip locks
Ali out of his own console.

⛔ **Not on this list, and deliberately so: the two-officer resolution rule.** An earlier note
claimed solo-resolve "lost its production hard-lock" and must be re-locked. That is
**superseded** — `COMPLIANCE-DECISIONS.md` §2026-07-24 records Ali's decision that single-admin
resolution is the permanent default in all money modes with **no** real-money hard-lock, the
officer-conflict block is deleted, and `test:two-admin` asserts the absence of a lock as a
passing requirement. Re-adding one reverses a dated owner decision. If Ali wants it mandatory
before real money that is a **new** decision needing a new entry and a test change.

**4. `docs/POLISH-BACKLOG.md` §2 FIX SOON** — the i18n and date-helper items. Small, real,
and untouched.

**5. Multi-container readiness** — ✅ **the dangerous half is CLOSED (2026-07-30).** The
lifecycle chores run behind a **leader lease** (`src/lib/server/leader.ts`): a short-lived
`SystemConfig` row claimed and renewed inside a Postgres advisory lock, so the
read-then-write is atomic across containers. Fails **closed** (an unreachable database
returns `false` — driven, 2.1 s), hands the lease back on `SIGTERM`, and expires on its own
if a container dies holding it. `/api/health` reports the holder.

Proven by `scripts/load/s12-leader-contention.mts`: **two real OS processes** racing
against real Postgres, 10/10, now in CI beside s10/s11. It cannot be proven in-process —
`leader.ts` keeps its instance id in module scope, so two calls in one process always
agree. Removing the advisory lock makes **both instances win**; that was run, and s12
caught it.

⚠️ Still per-container **by design**, each with a stated consequence in
`POLISH-BACKLOG.md` §3: `admission.ts` (Redis must never touch the bet path ⇒ N containers
need the DB pool sized N×; at pool 40 that is ~36 in-flight bets each), rate limits and SSE
fan-out (cross-container code exists in `redis.ts` but is **inert** until Ali sets
`REDIS_ENABLED=true` **and** `REDIS_URL` — until then two containers would each grant the
full OTP/login budget, audit H2), and the deposit fast-poll (idempotent on purpose).
Redis fail-open verified against a dead port: 2 ms, then 0 ms, never throws.

### Also true, and worth knowing before you start

- **`npm install` after pulling.** The hardening pass added `pg`, `@sentry/node` and
  friends. `test:backup` and `test:alerting` fail with `TS2307: Cannot find module 'pg'`
  on a stale `node_modules` — that is a missing install, not a broken suite.
- **`test:responsive` and `test:motion` need a server on `:3000`.** Without one they fail on
  navigation and look like real regressions. `test:motion` re-ran green (43/43).
  ⚠️ **`test:responsive` is the one suite NOT verified on 2026-07-31.** It is locales × routes
  × breakpoints with a screenshot each — thousands of page loads. Against a Turbopack **dev**
  server, which recompiles every route on first hit, it ran **40+ minutes without finishing**
  and was abandoned. Run it against a production build (`npm run build` then `next start`),
  budget real time, and do not read a slow run as a hang. The last recorded result was
  5016 pass / 24 fail, and `POLISH-BACKLOG.md` §4 documents those 24 as Playwright
  navigation races on admin routes, not product defects.
- **There is a second worktree**, `C:\kipindi-night` on `night/measure-search` at
  `7d58354d`. That work is **merged and live**; the checkout is finished debris. It belongs
  to another session — leave it alone unless Ali says otherwise.
- **An unmerged branch is open:** `feat/updown-source-pinning-and-proposals`, 28 commits,
  current with `main`. It fixes a real money bug (editing an Up & Down asset's source URL
  silently switches the source under open rounds with stakes already placed) and adds AI
  round proposals behind an officer queue. See [`LIVE-QA-CAMPAIGN.md` §6b](LIVE-QA-CAMPAIGN.md).
  **It is another lane's work — do not merge it without Ali.**

### Rules

- **Money paths are gated.** Anything touching payout, settlement, the ledger or wallet
  needs the money suite green (`test:money-invariants`, `test:fee-model`,
  `test:settlement-gate`, `test:concurrency`, `e2e:money`) plus a stated reason it is safe.
- **Do not reopen design.** No token edits, no component restyling. If something looks
  wrong, write it down for a later pass.
- **Every push to `main` is a LIVE deploy.** Work on a branch, run the gates, stop for Ali.
- **Same change updates code AND docs.** No new tracker files — update the doc that already
  owns the subject, and delete this file's items as they are finished.
- **`npm run test:all` before you claim done**, and drive the real site, not just the suite.

=== END NEXT PROMPT ===
