# MASWALI-BUILD — hand-over (Claude, OMEGA-COMPILE01, the Maswali lead)

## ⏹ STOP 4 — 2026-10-22 ~10:45 UTC (Ali: "push the progress we reached cleanly and stop the session cleanly so we proceed later on a clean base"; then "finalize conflicts then push")

**Session asheib-f3.** Read in this order: this section → `MERGE-NOTES.md`'s top section ("2026-10-22 PM — asheib-f3, STOP 4":
every lane's final state, every lead ruling, the merge-time wiring) → MASWALI-PLAN §0 on `claude/maswali-s5-release`. This
session's lane briefs: `briefs-20261022/` (LANE-COMMON, S5-R2-COMMON, one per lane, OB.md = the objection door's draft brief,
AGENTS-20261022.md = the lane ids); the round-2 critic brief: `critics/COMMON-R2.md`; new tools: `tools/job-responsive.sh`,
`tools/slip-hash.mjs`. The previous lead's toolbox (`$S` scripts, briefs, R1 critic reports, the parity baseline) is still on
OMEGA at `C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\408dbc60-fcd0-43af-899c-8602858935b5\scratchpad` (another
machine re-captures the baseline with `tools/job-par-base.sh`). Nothing went live this session: production is still `main`
`67e47f8d2` (read back green 08:12:48Z).

### Ali's scope and answers (2026-10-22 — never re-ask)
- **Scope: build done, launch later.** S5 → S7 → S6, each verified (critics 10/10 + every gate) and pushed to `main` DARK;
  STAFF_PREVIEW right after S5 is live; S8 prepared and handed to him with his list. The programme closes when he says launch.
- **Pre-approved:** push each release as soon as it is verified (the Railway key rotation runs in parallel on his side);
  the read-only production read-backs; setting `FEATURE_MILLIONEA=STAFF_PREVIEW` on Railway after S5 is live; ONE read-only
  "SmsMessage" size/count before S6's migration; deleting the old Maswali branches/worktrees at the very end (after a verified
  bundle). Staff-preview check = ONE sign-in each with the QA staff and the QA player accounts. If the auto-mode classifier
  still blocks one of these, ask him once to switch to manual approval and click Allow.
- **S8's live test = the FIRST PUBLIC WEEK** (his 2026-10-21 ruling stands): approved QA accounts buy in week 1 (they cancel
  inside the free window so no company ticket stays in the draw), a rollback switch stands ready; rewrite S8's work order,
  OD-21 and §6 line 12 (+ `maswali-plan.test.mts:114` and its plant :196) to match; OD-21's drive code stays dormant.

### Branches at the stop (all pushed; every OMEGA tree clean)
| Lane | Branch | Head | State |
|---|---|---|---|
| S5 release (lead) | `claude/maswali-s5-release` | 4d13fa6f0 | + 81e312f01 §0, 41e61987c three ratchets, c58b316ff English buy wording (privacy + drive), 87f19f3a9 D19a privacy pin, edf79c2b0 journey-home anchor, 4d13fa6f0 §0 STOP 4 |
| DOORS | `claude/maswali-s5-r2-doors` | 13d8ca918 | ✅ DONE, all verified — the ⛔ dark-safety blocker FIXED and proven on real bytes (qa:maswali-door-dark WITHDRAWN+plant 44/0, STAFF_PREVIEW 43/0; qa:live dark 116/0 both) |
| SLIP | `claude/maswali-s5-r2-slip` | d5f24f569 | ✅ all verified (no WIP); every R1-slip cell 10; left: read the rest of its tiles |
| HUB | `claude/maswali-s5-r2-hub` | a76e03f96 | WIP: the hub loading pick (client) + `hub-frame.ts`; tsc/hop probe/plants not run |
| TICKETS | `claude/maswali-s5-r2-tickets` | fdbeae5a4 | WIP 6: tickets/loading.tsx pick has 3 reds (r4j 3.4, r5h 1.2/1.3) → make it a CLIENT pick |
| REGISTER | `claude/maswali-s5-r2-register` | 926ebc6c1 | WIP 20 (two script changes, unrun); How ghost bands 6 px high; index/week drawings to redraw |
| PLATFORM | `claude/maswali-s5-r2-platform` | 04d3e3d93 | WIP 10: route-ghost How/register/week + classic guest mark; tsc + browser proofs owed |
| S7 × S5 | `claude/maswali-s7-s5` | be37a9683 | S7-MERGE 1 dfb438dd2 proven on both stores (money-path red 35/77 caught, 0 missed — rest not run); be37a9683 = empty WIP listing what is left |
| S6 integration | `claude/maswali-s6-release` | 272658bbf | on M1 = dfb438dd2: 8620862fc S6-INT 1 = the int merge (L + D; 13 conflicts + sprites resolved; tsc 0), 272658bbf D19a re-pinned; maswali-integrity-list 35/2 to adapt (ruling c); R and N not started |

### Next, in order
1. **Finish each S5 lane's LEFT list** (exact lists in MERGE-NOTES' STOP 4 section): HUB (re-pin maswali-design 4.P4b/5.P15/5.P8,
   tsc, heavy-c1 hop probe, heavy-c2 plants + drive), TICKETS (client pick, r4j/r5h/ui/tickets re-pins, shots,
   red:deposit-status-read), REGISTER (GhostTextLine fix, hop drive + `--prove-red`, redraw the index/week drawings — and check
   register/loading.tsx against r5h 1.2/1.3 + r4j 3.4 like TICKETS'), PLATFORM (tsc, commit 10's browser proofs, chat-yield
   week-320, `$F/platform/batch2.sh` reds, `batch3.sh` perceived performance), SLIP (read its remaining tiles).
2. **Integrate** the six r2 branches into the release (dry runs: only `scripts/millionea-shell.test.mts` conflicts → "no call
   left"), then the merge-time wiring list (hub no-week → `MaswaliEmptyState`; the two drives' "View ticket" → link; delete
   `MillioneaPreviewMark` per PLATFORM's map; the stray branch `claude/maswali-s5-release-merge-20261022`: apply e70672fe0,
   re-derive a995dd936's pointers by hand, then bundle + delete; number D11 in §M8a item 11; the zh template grep in both
   directions; D19a once after the last dictionary change).
3. **One integrated render** (each lane fast-forwards to the integrated head and runs its full state shots; render-jobs
   `player`; `qa:millionea-ghost-hops` in full; `qa:maswali-door-dark`), then the critics on `critics/COMMON-R2.md` (≤ 60 files
   per reader; bounded rounds: two, then a recorded ruling).
4. **S5 gates** (test:all + CI dispatch vs main's run 39625785032; reader sweep incl. red/qa/e2e; render jobs + test:responsive
   (`tools/job-responsive.sh`); money battery; parity vs `parity-v5-bfa0b7d57.json` with every classic change named — the
   lanes' lists are in MERGE-NOTES; build; local qa:live dark; Vodacom `git merge-tree` vs d5aa8bc02) → **push S5 dark** under
   main-push.lock → read-back → **STAFF_PREVIEW** → QA staff + player sign-in once each.
5. **S7**: its LEFT list on `claude/maswali-s7-s5` (floors; item 3's guard; ruling (a) one finalWeekRule + floor clause;
   ruling (b); TK.2 alert = password writes only; RD.5 hold scope = shares from tickets bought at/after the reversed deposit;
   FAILURE-INVENTORY §9; §7b targets; full money-path + dal-parity), merge the release's round-2 delta, the objection door
   (OB.0, `briefs-20261022/OB.md`), gates incl. the fence migration's production-order proof and the backup round trip → push.
6. **S6**: finish the integration on `claude/maswali-s6-release` (M2 int → D19a → R squash → N squash with M-3 and the old-API
   calls), the lead's rulings a–q + 1–8, then the build split (NOTICES, LINT with finding 9 first, LEGAL+DOCS, MONEY with OD-13)
   and the UI lane (MB-33, MB-70, L17) → gates → push.
7. **S8 prepared** + Ali's list (MERGE-NOTES "ALI'S LIST FOR S8").

### Facts a fresh machine needs
- **main `da3d32180` (docs only: this STOP 4 pointer) was QUEUED in Railway's build backlog at the stop** (a Railway
  incident: deployments queued with long waits; "do not trigger the same deployment more than once"). Production serves
  `67e47f8d2` (identical code) and was read back green at 11:23Z: `/api/health` ok, qa:chunks-prod 6/6 on www and apex,
  production qa:live 365/0. Confirm `dpl=da3d32180` on the three hosts later; never re-trigger it while Railway says so.
- Railway: the CLI login on OMEGA expired; the workspace token in `.env.qa.local` works for GraphQL (`tools/railway-read.mjs`,
  `railway-deploy-main.mjs`). Railway had a security incident on 2026-10-21 — rolling its variables is Ali's.
- The machine's free RAM (~15 GB with Ali's apps open) limits heavy jobs to ~3–4 at once; `test:harm-watch`'s test:all crash
  (0xC0000142) was load, not a defect (15/15 alone).

---

## (The earlier stops of this hand-over — 2026-10-21/22, the previous lead)

## ⏹ STOP 3 — 2026-10-22 ~08:10 UTC (Ali: "finish here on a clean level … then continue Maswali from a new prompt")

**Read in this order:** this section → `MERGE-NOTES.md` (same folder; its top part is today's) → MASWALI-PLAN §0 on
`claude/maswali-s5-release`. Round 2's brief is `critics/ROUND2.md`. The lane agents' memory ends with the session; each
branch's head commit says what is verified and what is left.

### Where things stand
- **Release** `claude/maswali-s5-release` (code at `7e9a314f0`, docs after): **every S5 lane is merged** — FIX-SRV,
  PLATFORM D1–D15, DOORS, HUB, TICKETS, REGISTER, SLIP — plus the salesPaused Fill (one glyphs:gen, `app.b899eae1.svg`).
  tsc 0, every Maswali suite green. **Not live** (Ali, 2026-10-22: only verified work goes live).
- **Round 2** (on the integrated product) is on six branches from `7e9a314f0`, each stopped clean:
  | Lane | Branch | Head | Done / left |
  |---|---|---|---|
  | HUB | `claude/maswali-s5-r2-hub` | a7b7c894c | wiring L4/L20/L5, preview mark gone, §T5 in its lines · left: tsc, reds, drives a/b/c, read, re-score |
  | SLIP | `claude/maswali-s5-r2-slip` | fe2d9fc79 | pills (ruling a), ghost hint, the cancel confirm's kit options, preview mark gone · left: r10 1.4/3.1 + updown-filter-sheet 7 re-pins, re-shoot, re-score |
  | TICKETS | `claude/maswali-s5-r2-tickets` | 9dcd6fc6e | preview mark gone, §T5 (cancel clock, seal facts, notes), EmptyState `bodyPart` (WIP) · left: tsc, re-shoot incl. ticket-wonBig, re-score |
  | REGISTER | `claude/maswali-s5-r2-register` | a8e25a07d | covered() accepts the chat's yield, preview mark gone, headings balanced · left: re-shoot + SEP measure, re-score |
  | DOORS | `claude/maswali-s5-r2-doors` | 410997dc7 | H1 through the route ghost, preview chip under the title, STAFF_PREVIEW pass, guards-exist fixed · left: re-run both drives, read, re-score |
  | PLATFORM | `claude/maswali-s5-r2-platform` | 68b8fab9d | header-fit red 10/10, hover tints gated, qa:live catches the bar, NoticeBar widows · left: tsc, reader sweep, D13/D14/D15/D10 re-shoot |
- ⛔ **A dark-safety blocker** (PLATFORM found it): `src/app/markets/loading.tsx` hands the client `MarketsGhost`
  `millionea={false}`, so every /markets payload carries the prop and qa:live's dark rule fails. Fix (hand props only
  when true) before S5 deploys — MERGE-NOTES has the exact fix.
- **test:all** ran on `7e9a314f0` until the stop: its real reds are listed by owner in MERGE-NOTES (the "0.0s" ones are the
  stop). Re-run it on the final head.
- **Railway:** a security incident (status.railway.com) — Railway advises rolling every env var stored there; that is
  Ali's (payout credentials and the Anthropic keys first). Builds are back for Pro; `main` `67e47f8d2` was requested at
  07:15Z on Ali's word and went LIVE at 08:12:48Z — read-back green (dpl on www/apex/Railway host, health ok,
  qa:chunks-prod 6/6 on both, production qa:live 364/0). Owed: U43's record in MOBILE-VISUAL-PLAN §0, with S5's push to main.

### Next, in order
1. Fix the dark-safety blocker (DOORS' markets loading props) and finish each round-2 branch's "left" list.
2. Merge the six r2 branches into the release (expect conflicts in millionea-shell 1.1b — every lane re-pinned it; resolve
   to "no call left"), delete `MillioneaPreviewMark` (MERGE-NOTES lists the component, the last call in
   millionea-results-view.tsx, and its tests), number D11's §M8a entry, re-pin D19a once.
3. The critics' round 2 (critics/COMMON.md + R1-*.md + ROUND2.md) until every cell is 10.
4. The gates on the exact commit: test:all, the render jobs (they run the server-bound suites), the money battery,
   classic parity (candidate compare; re-capture the baseline first if main changed a served page), next build, local
   qa:live with its dark section.
5. Push `main` under main-push.lock, Railway deploy, AGENTS §4 read-back, then STAFF_PREVIEW.
6. S7 (merge S5, its left items), S6 (the 6b guard first), S8.

### Trees on OMEGA (kept for the next prompt)
Lane trees `kipindi-mln-{dhub,dslp,dtkt,dreg,ddoor,fplt,fsrv,fply}` (each on its r2 or lane branch, clean),
`maswali-coord-20261019` (the release), `kipindi-mln-gate` (detached 7e9a314f0, real node_modules — test:all),
`kipindi-mln-pbase` (main bfa0b7d57, parity's baseline server), `kipindi-mln-rb` (detached main, node_modules JUNCTION
into the release tree — unlink first when removing; the read-back runs here), `maswali-s7-integrate-20261019` (S7),
`maswali-s7-red-20261021` (S7's red checkout, JUNCTION), the S6 trees. U43 (paused) lent slots 5–8.

---

## ⏹ STOP 2 — 2026-10-21 ~17:15 UTC (Ali: "work for 2 hours and push everything and progress … so we continue from another machine")

**Read in this order:** this section → `MERGE-NOTES.md` (same folder: every PM ruling, what each lane changed, every
merge map and owed item) → MASWALI-PLAN §0 on `claude/maswali-s5-release`. Each lane's head commit message says what is
verified and what is left. The lane agents' memory dies with the OMEGA session; the commits and these notes are the state.

### Branches at the stop (all pushed)
| Lane | Branch | Head | State |
|---|---|---|---|
| **S5 release** (integration) | `claude/maswali-s5-release` | 08228d0c7 | holds fix-srv (all of it, 1e88fdb93), fix-player, parity, PLATFORM (all, f2bcba995: D1–D15), TICKETS (ae2ce1f0b; its dev seed and the hub's dev route now attest/move with FIX-SRV's API), main `67e47f8d2`, DOORS (with REGISTER's shared pieces d5446df25 + 26503c06c) and HUB; tsc 0 ; hub-reads 17/17 and player 187 per store, engine 210 PG, doors 53, hub 53 |
| S5-DESIGN-DOORS | `claude/maswali-s5-design-doors` | 8881bd0c4 | DONE (every cell 10), merged |
| S5-DESIGN-HUB | `claude/maswali-s5-design-hub` | 9776e6c2c | DONE except merge-dependent cells (MERGE-NOTES "HUB"), merged |
| S5-DESIGN-SLIP | `claude/maswali-s5-design-slip` | 5139fce7d | DONE except the composer pills (ruled (a), MERGE-NOTES); NOT merged yet — dry-run conflicts: DESIGN_AUTHORITY.md, package.json, maswali-design.test.mts, globals.css |
| S5-DESIGN-TICKETS | `claude/maswali-s5-design-tickets` | ae2ce1f0b | DONE (every row 10; F visual 9 = the ledger note REGISTER fixed), merged (conflicts per HUB's map, explained in 2698b3bb5) |
| S5-DESIGN-REGISTER | `claude/maswali-s5-design-register` | 33a2b4ea9 | DONE round 1 (every cell 10); its shared pieces partly in the release via DOORS; NOT merged yet (latest) — dry-run conflict: maswali-design.test.mts |
| S5-FIX-PLATFORM | `claude/maswali-s5-fix-platform` | f2bcba995 | DONE D1–D15 (D15 chat yield .50 measured), merged (r5d 5.1 classifies FIX-SRV's audit-warning reader; tsc 0) |
| S5-FIX-SRV | `claude/maswali-s5-fix-srv` | 1e88fdb93 | DONE, merged |
| S5-PARITY | `claude/maswali-s5-parity` | 9a0c6b033 | calibrated on main bfa0b7d57 (52/52 + null 68/68); the candidate compare runs at the final head (command in MERGE-NOTES) |
| S7 | `claude/maswali-s7` | 0f0d42fcc | S7-F8 1–15; S17 rush first green; merge with S5 after S5 lands (26 conflicted files, FIX-SRV's map) |
| S6 | `mln-s6-notices` bd74c982c · `mln-s6-int` 81c60f0f5 · `mln-s6-reports` 57624a2fa | | notices round 17 complete; **red:maswali-money-path plant (6b) MISSED on S6-N** (the S5 release catches it) — S6 fixes its blind guard first |
| (Codex's S6 L+D prep) | `codex/maswali-s6-ld-prep-20261019` | 44f2cc84f | kept for the S6 lanes |

### Next, in order
1. **Finish the S5 integration** on `claude/maswali-s5-release`: merge SLIP and REGISTER (its latest) — conflicts and their resolutions in MERGE-NOTES (the dry-run list, HUB's merge map). Then, once: scripts/glyphs
   map.ts FILL_KEYS `salesPaused` + `npm run glyphs:gen` with PREVIOUS_SPRITES = the pair production serves at that moment,
   and the hub's paused Callout → `glyph="salesPaused"`; the D19a re-pin (`test:house-bot-blob-pin`); move `sealLineOf`
   out of the "use client" seal-line file into a pure module (millionea-view.ts imports it as a value — the root of
   journey-home 7.client); grep the millionea zh templates once more for a space before a Han-initial fill.
2. **Round 2 of the 10/10 pass:** every lane re-shoots after the §T5 numerals, the zh spacing and the ledger-note change;
   SLIP's composer pills per ruling (a); HUB's L4/L20 with TICKETS' row and L5 with REGISTER's live register page; decide
   L16 (the kit ghost border 1.79:1, a classic change); then the critics (R1-*.md + COMMON.md) re-score every cell until 10.
3. **Gates on the exact commit:** every changed-file reader and red twin, `test:all` with the database suites, the money
   battery (e2e:money/fault/card), the classic parity candidate compare (re-capture the baseline first if main changed a
   served page since bfa0b7d57 — `tools/job-par-base.sh`), the render jobs (`tools/render-jobs.sh`), next build, local
   qa:live.
4. **Push `main`** under `F:/kipindi-locks/main-push.lock` (OMEGA) — Railway must be building again (below) — then the
   AGENTS §4 read-back (`tools/readback.sh <sha>`); then STAFF_PREVIEW: `FEATURE_MILLIONEA=STAFF_PREVIEW` on Railway
   (Ali's ruling; reversible with `WITHDRAWN`).
5. S7 (merge S5, its left items), S6 (the 6b guard first, then L → D → R → N), S8.

### Facts a fresh machine needs
- **Railway's builds were still paused at 17:00Z** (status.railway.com "Dashboard and API unavailable, builds paused").
  The deploy watcher ran on OMEGA inside the lead's session; on another machine re-trigger by hand once builds return:
  `node tools/railway-deploy-main.mjs <main's full sha>` (token in `.env.qa.local`, never printed). main = `67e47f8d2`
  carries U43's CI repair and the marketing harm-marker mute (asheib-bb). After it deploys, run `tools/readback.sh` and
  record U43's part in MOBILE-VISUAL-PLAN §0 (U43 asked the Maswali lead to).
- OMEGA slots: U43 (paused) lent `mln-slot-5..8` to Maswali; the S6 lane's leftover chains may still run in slot 4.
- Trees on OMEGA (remove with junctions unlinked first): `kipindi-mln-rb` (read-back, node_modules JUNCTION),
  `kipindi-mln-pbase` (parity's main tree), `maswali-s7-red-20261021` (S7's red checkout, node_modules JUNCTION), the lane
  trees `kipindi-mln-*`, `maswali-coord-20261019` (the release), `maswali-s7-integrate-20261019` (S7).

---

## (Earlier the same day — the first stop, ~10:45 UTC)

Ali stopped the session ("finish what you're doing … so we proceed on another session with clean pushed"). Codex is out:
only Claude works 50pick now. Read `docs/MASWALI-PLAN.md` §0 on `claude/maswali-s5-release` first; this folder holds
what §0 points to.

## What is in this folder
- `critics/` — round 1 of Ali's 10/10 design request (*"if anything regarding design, animations, or progress of the
  Maswali game is not 10/10 as a player, UI/UX engineer or animation specialist, move it to 10/10 with full consistency
  with our design"*): `COMMON.md` (the critics' brief), `R1-hub.md`, `R1-slip.md`, `R1-tickets.md`, `R1-register.md`,
  `R1-doors.md`, `R1-motion.md` (scores per surface × lens, every flaw with its tile/frame and its fix; lines marked
  **LEAD RULING** are decisions), and `DESIGN-LANE.md` (the design lanes' common brief, incl. who owns which shared file).
- `tools/` — the OMEGA lane toolbox (re-point the scratchpad path `S=` in each before use): `mln-slot.sh` (Maswali's slots
  F:/kipindi-locks/mln-slot-1..4; U43 5–8, PHOSPHOR 9–12), `mln-slot-s7.sh` (slot 4 only), `mln-server-run.sh` (a fresh
  in-memory `next dev`, or `MODE=start` = build + `next start`; never warm /auth/demo), `mln-procs.ps1`, `mln-tree.sh`
  (an SSD worktree with its own `npm ci` + the scratch-Postgres packages), `mln-readback.sh`, `readers.mjs` (which
  red/qa/e2e scripts read a diff's files), `render-jobs.sh` + `job-*.sh` (S5's render jobs), the Railway scripts
  (`railway-read.mjs`, `railway-deploy-main.mjs`, `railway-deploy-watch.sh`) and the clean-up scripts.

## The branches (all on GitHub; read each one's head)
- **S5 release:** `claude/maswali-s5-release` (= `codex/maswali-coord-20261019`, kept identical) — Codex's S5 merged with
  main 4471bb44 (`d1c5910f`) + docs (Ali's rulings).
- **S5 fix lanes** (from the release head 8c468393): `claude/maswali-s5-fix-srv` (server/console: the seal-device alarm,
  corrections, attestation, version checks, dialogs…), `claude/maswali-s5-fix-player` (P1–P19: player truths, the
  objection-window phases `millioneaWeekPhase`/`weekPhaseWord`, carry weeks by the calendar chain…), `claude/maswali-s5-fix-platform`
  (dark safety D1–D14: the edge's neutral 404, encoded aliases, payload, OG 404, entitlement, ghosts, leaderboard reads,
  r5j 3.7.2, route transitions, hover-on-touch, preview bar, nav fallback, rail spacing).
- **S5 design lanes** (round 1 of the 10/10 pass; doors from the release head, the rest from fix-player's `cdb4bf46e`):
  `claude/maswali-s5-design-doors`, `-hub`, `-slip`, `-tickets`, `-register`.
- **Parity instrument:** `claude/maswali-s5-parity` (Phosphor's strips settle cherry-picked + the /watchlist time canonical).
- **S7:** `claude/maswali-s7` (the wide-winner settlement fix S7-F8; on top of Codex's `codex/maswali-s7-integration-20261019`).
- **S6:** `mln-s6-notices` (round 17, in progress), `mln-s6-int` (L+D squashed), `mln-s6-reports` (round 15 accepted);
  Codex's preserved WIP (the two S6 notices attempts are reconciled into mln-s6-notices bd74c982c, archived and deleted): `codex/maswali-s6-ld-prep-20261019` (staged L+D prep), `codex/maswali-s5-vis-p`, `-vis-r` (tiny WIP).

## Next, in order (the lead's plan when stopped)
1. Read each lane's last report line in §0 (or its head commit) — every lane committed and pushed at the stop; some commits
   are marked "WIP … not verified".
2. Integrate on `claude/maswali-s5-release`: merge fix-srv, fix-player (+ its verification follow-ups), fix-platform, the
   five design branches, parity; resolve shared files (i18n-dict.ts millionea keys, globals.css kp-mln blocks, millionea-view.ts,
   maswali-player.ts end-of-file blocks); `glyphs:gen` once with `PREVIOUS_SPRITES` = the pair production serves; re-pin D19a
   once at the merge commit; merge `origin/main` (U43's CI-repair release 110587e7e and its docs).
3. Round 2: the lanes adopt the shared pieces (REGISTER's ReceiptRow sentence variant + ledger rows + WeekStateChip +
   MaswaliCarry; TICKETS' seal-line mark and held-row props; SLIP's handoff/panelDelay/panelClassName in the ticket's cancel
   confirm; PLATFORM's route-ghost flags), then re-shoot every page × 320–1920 × en/sw/zh and re-run the critics until every
   cell is 10.
4. The gates on the exact commit: every changed-file reader and red twin, `test:all` with the database suites, the money
   battery, classic parity with the parity lane's harness (baseline at live main → null compare → candidate), the render jobs,
   build + local `qa:live`; then push `main` (under `F:/kipindi-locks/main-push.lock`) and the read-back.
5. Then STAFF_PREVIEW (Ali's ruling: right after S5 is live), S7, S6 (L → D → R → N), S8.

## Facts to know
- **Railway paused builds platform-wide** on 2026-10-20/21 (status.railway.com). Pushes during a pause are DROPPED. Production
  serves `d268ef919`; `main` = `110587e7e` (U43's repair) is not deployed. Re-trigger by hand when builds return:
  `node tools/railway-deploy-main.mjs <main sha>` (token in F:\kipindi-main\.env.qa.local, never printed). Ali: keep pushing.
- `test:needle-rest` is red on production since U43 Release B (bisect: 92/0 at 1b7a91782, 89/3 at 1384383fd, 55/35 from
  7e3a06ea0; the commit between them pins it). U43 records it as its owed item.
- The repository was cleaned on Ali's word: 192 stale remote branches deleted (merged into main, or archived first in
  `F:\kipindi-archive\stale-remote-branches-20261021.bundle`), Codex's worktrees removed, local stale branches archived in
  `F:\kipindi-archive\stale-local-branches-20261021.bundle`; the main checkout's untracked leftovers moved to
  `F:\kipindi-archive\kipindi-main-untracked-20261021\` and Ali's logo sources to `F:\kipindi-archive\brand-sources\`.

## Lane results at the stop (the rest: read each branch's head commit messages)
- **S5-FIX-SRV — DONE** at `9935dfd47`: all 16 items fixed, each with its guard + plant; engine 172/173, purchase/settle/void
  both stores, the money red twins, tsc 0, admin drive 87/0. Left (same class as finding 2): openWeek, closeWeek, voidWeek,
  claimCarry and sunsetMaswali still write outside the lock's transaction with the audit before commit. Expect merge conflicts
  with S7 in sealQuestion/confirmSeal/correctSeal (A9 lines byte-identical to S7's 5fbdb2eaa). test:house-bot-reports' 13 mem
  + 2 PG reds predate it (same on 8c468393b).
- **S5-PARITY** at `9a0c6b033`: Phosphor's strips settle cherry-picked; the /watchlist moment canonical (U43 moved the date to
  `.mcardp-closes`); --prove-red 299/299 against a fresh main server. A baseline capture was still running at the stop
  (scratchpad s5par/parity-v5-4471bb44.json on OMEGA); re-capture at the new live main anyway, null-compare, then the S5
  candidate with --allow-base.
- **U43 (closed)**: main = `c63c89387` (U43 release 110587e7e + docs). When Railway deploys it, U43's AGENTS §4 read-back is
  owed: `handover/u43-2026-10-21/u43-readback.sh <full-sha>` on branch `u43-handover-20261021`; record the result in
  MOBILE-VISUAL-PLAN §0's "⛔ PRODUCTION HAS NOT DEPLOYED…" paragraph.
- **HUB notes for round 2**: the paused Callout needs `salesPaused` in FILL_KEYS (map.ts + glyphs:gen) then glyph="salesPaused";
  the final-week rule key is `millionea.finalWeekRule` (How's ruleSunset should reuse its clause — one wording).
- **S5-DESIGN-TICKETS** at `96e5e9a94` = WIP, NOT verified, with one KNOWN tsc error (ticket-acts.tsx calls the new cancel button without its required `price` prop). Done and checked: `c69c788f9` (dev-only seed route seed-maswali-tickets + scripts/maswali-ticket-shots.mjs: all 19 ticket states across 12 weeks). Its before tiles show the win seal breaking a 7-digit amount ("TZS" / "1,740,000") at 320/360 in all three languages. Everything else of R1-tickets is still to do.

- **S6 NOTICES — round 17 COMPLETE** at `bd74c982c` (14 commits; notify 138/0 mem + 144/0 PG; claims 635/0; red:maswali-claims 29/29). Owed at that head: tsc, the both-store suites and the reds listed in MASWALI-PLAN §0.
- **S5-DESIGN-DOORS** at `5bc6e2c57`: nearly all of R1-doors done and verified (the ghost equals the card); the last commit is static-verified only.
