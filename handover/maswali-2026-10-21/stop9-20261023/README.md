# STOP 9 — 2026-10-23 ~12:10 UTC (OMEGA-COMPILE01, the Claude session asheib-f3)

Ali: *"at any moment tokens could end — save progress now, even in tests, so after the pause we proceed from where they
stopped, don't restart"*. The session's usage limit hit four lanes at ~12:05 UTC (it resets ~12:10 UTC). **Resume, do not
restart:** every lane's branch head below holds its work; a lane's last commit body (or its message to the lead, copied
here) says what passed at which sha and what is left. The authority for state is `docs/MASWALI-PLAN.md` §0 on `main`.

## Production
`main` **`4c75dbbb6`** LIVE — UDDOT (no dot on any nav tab) + LICBASIS (the licence basis = 50pick's GBT licence by Ali's
ruling of 2026-10-23; every admin seals) + the §0 restructure. Read back 11:50Z: dpl on www/apex/Railway host after 604 s;
health ok ×3; qa:chunks-prod 6/6 on both origins; production qa:live 355/0; the served /markets has 0 rail dots and the
Millionea rail link. Millionea is ACTIVE (Railway variable). Nothing sells until an admin pays the guarantee in.

## Order to finish
1. **The S7 + S6 release → `main` before Sun 2026-10-25 21:00 UTC (Mon 00:00 EAT; the rules page + Terms must be live
   before any week opens).**
   - **S7-SHIP** — `claude/maswali-s7-s5` **`fddc779b4`** (S7 + main 4c75dbbb6; code = `b05c3abc0`). Green at `ca750cd32`
     (code of 2a1f6fc72): parity 67/67 vs parity-main-07a400bc3; CI 708/708 + needle-rest the same 35 as main; tsc 0;
     migration proof; verify:backup-schema 16/0; test:backup 140/0; build + first-load; qa:live 391/0 default, 379/0
     ACTIVE; door census 48/0 + 45/0; objection console 69/0, door 140/0; e2e:money 64/0 (drift 0.00), fault 34/0, card
     100/0, data round trip VERIFIED, e2e:maswali-money exit 0, maswali-fault 16/0; reds fence 19/19, objections 23/23,
     money-path 99/99, dal-parity 285/285. At fddc779b4: r5g 66/0, maswali-plan + red 23/23, docs, law 9/0, rules-copy
     71/0. Running at `b05c3abc0` (slots 7/8): the deltas (two-store suites, build, qa:live ×2, admin drive), red1
     (money-path, engine, licence-gate, console), then red:house-bot-c5 in `maswali-s7-red2-20261023`. → READY to S6-SHIP.
   - **S6-SHIP** — `claude/maswali-s6-release` (head ≥ `cd9d1b953`; NOTICES 71643157b merged as `79db50fdc`). Evidence 7.3
     fixed (S6-SHIP 17). DB battery 48/51 (house-bot-ops + updown-lock-window-db = load, green alone). Reds batch A 9/22
     caught so far (money-path 135/135, claims 41/41); B–D next. Heads still due: S7-SHIP READY; FLOW; S6-NOTICES; GUIDE.
   - **FLOW** — `claude/maswali-flow-fixes` `ca7dfc503` (+ later): FLOW 8 release-wait alert (real elapsed time; objection
     variant → Compliance), FLOW 9 MB-57 verified (drawn 232/0), FLOW 10 the slip refuses a held wallet before any pick.
     Left: console alerts name slots by label (A4 — never "slot 14"; maswali-console.ts ~234/235/244–252); ONE Millionea
     frozen-wallet sentence for buy + slip (en "Your wallet is frozen, so tickets can't be bought. Contact support to
     resolve it." / sw "Pochi yako imegandishwa, kwa hiyo huwezi kukata tiketi. Wasiliana na msaada kutatua hili." / zh
     "您的钱包已冻结，无法出票。请联系客服处理。") + D19a; the hub's buy block refuses a held wallet; then the evaluation walk.
   - **S6-NOTICES** — `claude/maswali-s6-objnotice` **`73ccf59eb`** (saved). Passed on 2e111aad3: tsc 0; objections
     49/0 ×2; notify pg 165/0 (mem 158/1 = a fixture timing, fixed in 73ccf59eb). Running then (slot 3, may have died):
     adversarial, notify again, red NOB1–NOB17 (`$F/s6-notices/heavy-ob3.out`). Left: the correctSeal ruling (below),
     tsc, objections + notify both stores, reds, floors, push → S6-SHIP, a note to GUIDE.
   - **GUIDE** — `claude/maswali-s6-guide` **`7c535c15a`** (PDF on the Desktop = this head). Left: one re-take of the Weeks
     picture after FLOW's slot-label commit — the exact steps are in GUIDE's last message, copied in `GUIDE-RETAKE.md`.
   - Then the lead: the §0/§1 docs commit (S6 ✅, S7 ✅; NEXT-PLAN count), S6-SHIP's final exact-head gates (test:all + DB
     suites; CI with no failing case beyond main's 35 needle-rest; parity vs `parity-main-4c75dbbb6.json` in the lead's
     scratchpad `lead/r2gate/parity/`; e2e money/fault/card + maswali money/fault; migration proof; build; qa:live ×2),
     push under `main-push.lock`, read back.
2. **S5 round 2b → `main`** (brief `briefs/R2B.md`): HUB-2B `claude/maswali-s5-r2-hub` **`b224987e9`** (main merged; D19a
   44ebc7238; statics green; runner baseline next; then GhostWords conversion); R3-2B `claude/maswali-s5-r3-fix`
   **`dcb126d17`** (main merged 783c2b2c4; GhostWords + provider; maswali-ui 161/0; next S5-R3-FIX 8, the drawings — the
   lane died mid "register suite re-pins": check `git status` in `C:/50pick-ssd/kipindi-mln-r3b` first); HEADER-1024
   (`claude/maswali-header-1024`, the UDDOT agent, in `C:/50pick-ssd/kipindi-mln-dot`: the sw 1024 signed-in header row
   runs past its content edge — on main before UDDOT).
3. **Close:** §6.1 line 6 after r2b; §1 S5 ✅; worktrees removed, branches bundled to `F:\kipindi-archive` then deleted;
   the final report to Ali.

## The lead's rulings of 2026-10-23 (all in force)
- Decided-objection notices: the filer gets "Your objection was upheld/reviewed" (bell only, as the platform); officers
  (ADMIN, COMPLIANCE, MODERATOR) get "Objection filed · settlement frozen". The purchase bell says "Ticket bought" (Ali's
  ruling 7 of 2026-10-21) and names EAT as the slip does. An upheld REVERSE/REINSTATE tells every other holder (the
  correction notice, extended with objection wording approved by the lead); VOID uses the void notice.
- **correctSeal:** only the officer who set the question's PRESENT result may correct it — the sealer for a sealed result,
  the ruling officer after an upheld objection; the original sealer can no longer correct a ruled result back; two
  officers still apply. The legal text and RULES §2.12's bar stay word for word.
- The console's release-wait alert says the real time since the window closed (h under 48 h, then days), never the
  setting; with an objection standing it sends the reader to Compliance. Alerts name slots by label.
- The slip refuses a held wallet before any pick, in one Millionea sentence shared with the buy; the hub's buy block too.
- GUIDE: default rules (option A), the dev-only seed `seed-maswali-guide` (one coherent story), real alert words.
- R3-2B: a STATIC loading paragraph sets its own words unseen (GhostWords; the provider sits in AppShell only while
  Millionea is visible, and carries no figures); DATA paragraphs keep Chromium tables with the WebKit difference printed.
  HUB-2B: the hub's static texts → words; data → same-width templates ("Wiki 00", the chip word, weekday and clock).

## For Ali (his list, unchanged by this stop)
An admin pays the guarantee in (Pools → Owner card → Guarantee: amount + bank reference → Pay in → FUND GUARANTEE);
Finance funds and confirms the Selcom payout float; rotate every Railway variable (the incident); §6.1 lines 4, 7–11, 13;
QL.1 (question limits need new fields); his launch word (the first public week is the drive).

## Agents (session asheib-f3 only — resume each with SendMessage to its id; a new session reads the branches instead)
S7-SHIP acbc353298fd84fe4 · S6-SHIP a3036ac03a0150588 · FLOW aaaaf28186ff42353 · S6-NOTICES ae383d66e164a66d6 ·
GUIDE ab753f417d1937c81 · HUB-2B ae99d072f737e490b · R3-2B a872f3c3249f4d9ac · UDDOT/HEADER-1024 aca5c1cdfdb413478.
Briefs: `briefs/`; the lead's tools: `tools/` (re-point `$F`/`$S` before reuse).
