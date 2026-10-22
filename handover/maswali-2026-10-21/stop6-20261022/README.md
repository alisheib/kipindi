# STOP 6 — 2026-10-22 ~18:20 UTC (ALI-BLADE15, the Claude session ali-7e; Ali: "push all now … continue in 2 hours")

Say **"continue maswali"** in a new session. Read THIS file first, then `lead/NOTES.md` here, then MASWALI-PLAN §0 on
`claude/maswali-s5-release` (its STOP 5 block is still the plan; this file says what changed since).

## 0 · How this session worked (ALI-BLADE15 has failing RAM and ~1 GB free: NO Node ran on the laptop)
Every heavy check ran on GitHub's machines (public repo: free Linux runners, 16 GB):
- `tools/mln-run.yml` + `tools/lib.sh` + `tools/ci-run.sh` + `tools/ci-wait.sh`: run a job script against an EXACT commit.
  `ci-run.sh <name> <commit> <job.sh> --wait` builds a run commit (target + the workflow + `.ci-run/`) with git plumbing,
  pushes `ci/run/<name>-<stamp>`, and `ci-wait.sh` downloads the log + artifacts. Copy `tools/` into your scratchpad and
  fix the `CI=` path in both scripts. The GitHub token is read at run time from git's credential manager (never stored).
- `tools/mln-gate.yml` (branches `ci/mln-gate-*`) = the S5 gate in four jobs; `tools/mln-parity.yml` (branches
  `ci/mln-parity-*`) = baseline on live main, then the release's compare (`--allow-base`) and a second null compare.
- `tools/jobs/*.sh` = every job used (fault + plant, prod-readback, dark-set, pg-proofs, rail-measure, r2 drives, re-pins).
- Lanes worked as subagents with `lanes/LANE-COMMON-BLADE.md` (+ a BRIEF.md each); they write in worktrees, run nothing
  locally, and push their branches.

## ✅ UPDATE 19:09 UTC — S5 PUSHED TO MAIN (dark): `main` da3d32180 → **2ed817395** (fast-forward)
Parity (run 39827559671) came back: baseline 52/52 (224 cells); null compare 2 **68/68** (the earlier flake did not
recur); release compare **66/67** — the ONE difference, NAMED: S5's Millionea results section adds an empty, already-
resolved Suspense boundary to `/results` (`<!--$--><!--/$-->`, two HTML comments, no element, no box — every layout region
equal) in 8 book cells (guest/player × en/sw × 360/1280); it renders nothing while the rollout is WITHDRAWN (door census
and qa:live hold /results free of every Millionea trace). Production read-back: run **39837626118**
(`tools/jobs/prod-readback.sh`: dpl=2ed817395 on the three hosts, /api/health, qa:chunks-prod ×2, production qa:live) —
READ IT FIRST; then STAFF_PREVIEW (Railway login) and record the push in §0 + the board row ▶ 0i (S5 live dark).
⚠️ BEFORE STAFF_PREVIEW: the product's own drive (`scripts/maswali-player-drive.mjs` with FEATURE_MILLIONEA=ACTIVE and
FEATURE_SIMPLEJOURNEY=STAFF_PREVIEW, steps 1–6) HUNG on the Linux runner: gate 1's dark job hit its 180-minute limit inside
it (cancelled, so its log and tiles were lost); gate 2's (39816308706) was in the same step. Re-run it ALONE through
`ci-run.sh` with `timeout 3600` around the node command, its output written under `$OUT` as it goes, `fonts-noto-cjk`
installed and `include-hidden-files: true` (tiles) — find the step it waits on (the dark step W passed 15/0; DOORS' ACTIVE
door drive was 513/0 on OMEGA).

## 1 · (as at the stop) the S5 dark push (pre-approved by Ali; everything but parity is green at the exact commit)
Release `claude/maswali-s5-release` = **`2ed817395`** (cc0db75c1 + the e2e:maswali-fault harness fix). At 2ed817395:
- CI (39816221418): typecheck, integrity, **702/702** in-memory suites, build, first-load ✓; browser gates responsive
  7641/0, motion 43/0, revoked-deadend 46/0, admin-section-gate 21/0; **needle-rest RED = production's own**: identical
  55 passed / 35 failed, same cases, on live main da3d32180 (run dark-main) — U43's known red since 7e3a06ea0.
- Gate (39816308706): build ✓ (next build, house-bot bundle ALL PASS, first-load ✓); money ✓ — e2e:money 64/0 drift 0.00,
  e2e:fault 34/0, e2e:card 100, e2e:maswali-money 3/0 (38/0 each store), e2e:maswali-fault 16/0 (+ plant caught on Linux).
- Dark (run dark-rel, production's configuration): qa:live **390/0**, maswali-player-drive step W **15/0**, revoked-deadend,
  motion-adoption, admin-section-gate ✓. Door census (gate 1 at cc0db75c1, same app bytes): WITHDRAWN + its plant ✓, STAFF_PREVIEW ✓.
- Cross-instance PostgreSQL proofs (run pg-proofs): s10 PASS (no double-spend), s11 PASS (no fork), s12 10/0.
- **PARITY: RUNNING** — workflow run **39827559671** (`ci/mln-parity-2ed8`): baseline on main → release compare
  (`--allow-base`) + null compare 2. Gate 1's null compare at main was 67/68: the `selection-closed` question panel at
  en 1280 measured 210 vs 228px between two servers of the SAME tree (a timing flake of the instrument on this runner,
  not a product difference). Read the release compare: every difference must be a NAMED classic change (PLATFORM's list
  is in its merge commit; S5's in §0) or that same flaky cell — then push.
Then: `git push origin 2ed817395:refs/heads/main` (fast-forward from da3d32180 — fetch first; if main moved, merge it into
the release and re-gate). Read back with `tools/jobs/prod-readback.sh` via ci-run (target = the pushed sha): dpl on the
three hosts, /api/health, qa:chunks-prod both origins, production qa:live signed out. Then STAFF_PREVIEW:
`FEATURE_MILLIONEA=STAFF_PREVIEW` on Railway (⛔ Railway is NOT logged in on Blade15 — Ali must run `railway login`, or set
the variable in the Railway dashboard himself), then the staff check (Ali's own console session sees Millionea with the
Preview mark; a player sees nothing). Record it all in §0 and the board row ▶ 0i.

## 2 · Round 2 (integration branch `claude/maswali-s5-r2-int` = `fa8d21731`)
Merged: REGISTER (789ed4a20), the landing door (37566f085, + COMPLIANCE item 5 repointed), PLATFORM (849486326), then four
cross-lane re-pins (fa8d21731: r4j 3.4 register pick; millionea-shell §3 "View ticket" is the Link + 3.0b; landing-doors 3.1
premise; spacing-scale 390) — all green on the runner. CI on 849486326: 698/704 → the 4 re-pinned + the D19a pin (re-pin
ONCE after HUB's merge). NOT merged yet: **HUB** (`claude/maswali-s5-r2-hub`, its lane was finishing — read its last
commit for its state). Drives on the integrated head: landing ACTIVE 791/0, door-dark W+plant/SP ✓, break-nav 7/0,
chat-yield 28/0 (+red 8/8), notice-widow 145/0, route-entrance ✓, break-money-doors ✓; RED on Linux: classic rail at 320,
journey rail gaps en 320–349, register drawings at 320/360, hover-touch controls — see findings F1–F6 in `lead/NOTES.md`.
**The lead's ruling (to record in DESIGN_AUTHORITY with the fix):** text geometry is held on the phones' renderer (Linux
Chromium ≈ Android/iOS, unhinted); Windows must never clip. Lane **S5-R3-FIX** (`claude/maswali-s5-r3-fix`, brief
`lanes/r3fix/BRIEF.md`) owns F1, F2, F3, F5, F6. Then: merge HUB + R3-FIX, D19a re-pin once, the integrated render, the
critics to 10/10, the next S5 push.

### HUB's final report (S5-R2-HUB, head `e615bd66c`, "WIP: not verified" = one drive selector, not run)
HUB merged release cc0db75c1 (merge 2ed817395 later); Step 0 wiring done (salesCloseColon, MaswaliStrike on the hub,
reserveRuleAfterHead in slip + ticket with guards, MaswaliEmptyState for no-week); H6 FIXED (the hub frame's
`leading-[0]` left the carry's inline-flex wrapper 0px tall → `inline-block`; proven: carry lands at sw 1920×1440 and
survives a render mid-flight; plants P3/P4 red as designed); G2 eyebrow/heading at measured widths; against REGISTER r2 on a
throwaway overlay 242/0. Statics at d28b33c31 all green but D19a (house-bot-blob-pin 7/1). Floors 108/110 in maswali-hub
were set before a run printed them — CONFIRM on the next run. Left: read run hub-d8 (39825094369) + its tiles; one final
run at its final head; then merge (REGISTER first — already in r2-int — then HUB; D19a once; `salesCloseAt` → delete or
re-point its test readers; item 24's note).
⭐ RUNNER LESSONS from HUB (apply to every drive job):
- upload-artifact@v4 skips HIDDEN folders: `.50pick-shots` never came back → `include-hidden-files: true` (now in
  `tools/mln-run.yml`), or copy tiles into `$OUT`.
- The runner has NO Chinese face → `sudo apt-get install -y fonts-noto-cjk` before any zh measurement or tile (phones carry
  Noto CJK / PingFang). zh results from runs without it are not trustworthy.
- 4 cores → theme-provider's low-end tier turns every shimmer off; HUB pinned 8 cores per reader (hardwareConcurrency) for
  motion/ghost reads.
- JetBrains Mono ships 400/500/600 only (fonts.css): the rail's 700 labels are SYNTHESIZED bold — wider; likely the root
  of F1/F5 (the 320 rail clipping). R3-FIX should look there first (ship 700, or use 600), then re-measure.

### S5-R3-FIX's report (branch `claude/maswali-s5-r3-fix` = `15b36c135`, WIP: hover-touch's tap now holds the sticky
### :hover a phone leaves — written, not run) and THE LEAD'S CORRECTED RULING
- ⛔ The runner has NO Chinese font: every zh reading on it so far is VOID (tofu boxes; "two characters 17px" where a real
  face needs ~22). Voids F5's zh cut, F6's zh offsets, and every zh reading of the repo's own CI browser gates. Every
  measuring job installs `fonts-noto-cjk` first (R3-FIX's jobs do).
- ⛔ The first ruling's reason was WRONG. At device pixel ratio 1 the runner rounds each letter of the 11px mono to a whole
  pixel (7.0px: "Markets" = 7×7 + 4 = 53) — WIDER than real phones (ratio 2–3: ~6.5–6.67; iOS fractional 6.6).
  **CORRECTED RULING (lead, 2026-10-22):** text geometry (a label's fit, a drawing's line table, a rail's least gap) is
  MEASURED at a phone's pixel ratio — 2.625 and 3, Chromium AND WebKit, with the phones' CJK face installed — and "never
  clip / never overflow" is checked at ratio 1 as well. Record it in DESIGN_AUTHORITY (R3-FIX proposes §M4a with a pointer
  from §M8a item 22), its reason the measured advance table. F2 → option (b): gaps at a phone's ratio (~-0.05em suffices),
  no clipping at either ratio.
- New defects R3-FIX found (beyond F1–F6): five tabs at 320 — sw/zh "Millionea" (67px) overflows its 64px track (the
  gaps drive checks gaps, not cuts); four-tab sw "Tiketi zangu"/"Juu na Chini" wrap between 348.8 and 352 with the tabs
  centred (the pip misalignment the stack-from-top rule prevents), and sit < 8px apart from 352 to 368.
- R3-FIX's measuring runs: rails `39830221442` (done, NOT read: `ADV`/`RAIL`/`TRIAL` lines), register `39830230189`
  (was running). Its plan for F1/F5: below 335px every classic rail label tightens by D14's 0.04em (63.04px fits 64), one
  rule for all five labels; a classic-visible change at 320–334 (name it for parity); re-pin r9c's `fourReached`. ALSO
  check JetBrains Mono 700 being SYNTHESIZED (HUB's finding) — shipping the real 700 or using 600 may be the cleaner fix.
- Open for the lead/Ali: should the repo's CI (`ci.yml` on main) install `fonts-noto-cjk`? (Recommended: yes, in a release
  of its own, with the browser gates' zh results re-read.)

## 3 · S7 and S6
- S7 (`claude/maswali-s7-s5` = `7d44b5628`, an empty "WIP: not verified" stop marker; brief `lanes/s7/BRIEF.md`):
  S7-MERGE 4 merged the release 2ed817395 (a41a2ed9e); S7-F9 14 RULES §2.12 quotes finalWeekRule; 15–16 the merged tree's
  reds (facts census samples {result} {note} {rule}; slip-design §10.9's plant re-pinned — PROVEN to predate the merge at
  a7feccbef); 17 MB-97 into the S17 rush (written from the work order — the OMEGA draft never reached git); 18 the S17
  worker waits for its pipe to drain (Linux drops async pipe writes at process.exit). PROVEN on the runner at a41a2ed9e:
  tsc 0; every two-store suite at/above its floor (engine 202/210, purchase 113/116, settle 106/110, void 52/57, adversarial
  229/238, player 194/194, objections 49/49 …); e2e:maswali-fault 16/0; objection console 69/0, door 131/0; maswali-law
  9/0 (+red 14/14), rules-copy 71/0, maswali-config 77/0. REDS ALL CAUGHT: red:maswali-money-path 99/99 (two parallel
  halves), red:dal-parity 285/285, red:maswali-fence 19/19, red:maswali-objections 23/23. Floor: maswali-design 152→153.
  LEFT: (1) read the rush run 39824076563 (baseline + head on one machine + 5 MB-97 plants), then record MB-97 in §7b S7
  from `lanes/s7/mb97-draft.md` with both runs' numbers and the machine; judge p95 ≤ 1,000 / p99 ≤ 2,000 ms / 0 BUSY against
  that baseline; (2) read run 39826182902 (red:house-bot-console 0–124 + red:house-bot-c5 0:50), then `lanes/s7/jobs/
  hb2.sh`–`hb4.sh` for the rest, two at a time; (3) merge the release again after round 2, re-run tsc + the two-store
  battery + statics. ⚠️ test:maswali-strike §5's browser half refuses on the runner (the "？" ink width premise) — part of
  the CJK-font decision above. Item 7's texts (§8 MB-74 and MB-96 rows; MR-16 "M1–M10 and R1–R5, shown as A1–A5") are in
  its report; §0's TK.2 line is already right.
- S6 (`claude/maswali-s6-release` = `085c68445`, a "WIP: not verified" marker on S6-INT 25–27): S7 merged (66ec6e9be),
  ADMIN merged (71ded2939: G1–G8; branch head fbf5f1077), DOCS merged (ac566f6ad: the admin guide follows ADMIN as built;
  branch head 8b00c8e57). Nothing after 641603e2b verified at an integrated head. ADMIN's run s6-admc (39826898317): tsc 0,
  red-anchors 8172/0, admin-plain 29/0 (+red 14/14), rbac 438/0 (+red 28/28), erasure 437/0, admin-shots 133/0, admin-drive
  110/0, PG suites at their floors (engine 220/210 …); 4 REDS to fix on ADMIN: adversarial TK.4b (both stores), objections
  2.1 (+its red: the refusal's new words), house-bot-reports 0.232.2 (line pins moved), red-engine's "13.2" line (read it).
  red:house-bot-console on 641603e2b (s6-redsb 39827938721): **502 caught, 0 missed, 0 files dirty** — every red owed
  through S6-INT 24 is closed with 0 missed. ⛔ LINT's core is NOT done (ruling 6's ACTIVE ceiling,
  the boot write, findings 1–8, 10–13, L-7, L-8) — it blocks any S6 push. Needs the lead: the rules' §6 vs the objection
  door (draft in the S6 lane's scratch, lanes/s6/drafts-for-lead.md — not travelled: re-derive), privacy item 7, campaign
  wordings (n), the legal-review list (o). MONEY and NOTICES (`lanes/s6mn/BRIEF.md`) not started.

## 4 · Machine notes (Blade15)
- Orphaned tail/grep monitors from 10-18 were cleaned. The VS Code **Angular Language Service** extension reloads the whole
  repo (~600 MB–1 GB): a session-local watcher stopped it every minute; Ali was asked to DISABLE the extension.
- Close-out still owed at the very end (Ali): stale branches (ci/run/*, ci/mln-gate*, ci/mln-parity*, the merged lane
  branches), worktrees (C:/kipindi-mln-*), temp files, the admin guide PDF on the Desktop.
