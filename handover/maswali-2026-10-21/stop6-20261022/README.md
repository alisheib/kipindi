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

## 1 · FINISH FIRST: the S5 dark push (pre-approved by Ali; everything but parity is green at the exact commit)
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

## 3 · S7 and S6
- S7 (`claude/maswali-s7-s5`, lane brief `lanes/s7/BRIEF.md`): S7-MERGE 4 (the release merged in) and its list 1–7 — read
  its last commit for where it stopped.
- S6 (`claude/maswali-s6-release` = `085c68445`, a "WIP: not verified" marker on S6-INT 25–27): S7 merged (66ec6e9be),
  ADMIN merged (71ded2939: G1–G8; branch head fbf5f1077), DOCS merged (ac566f6ad: the admin guide follows ADMIN as built;
  branch head 8b00c8e57). Nothing after 641603e2b verified at an integrated head. ADMIN's run s6-admc (39826898317): tsc 0,
  red-anchors 8172/0, admin-plain 29/0 (+red 14/14), rbac 438/0 (+red 28/28), erasure 437/0, admin-shots 133/0, admin-drive
  110/0, PG suites at their floors (engine 220/210 …); 4 REDS to fix on ADMIN: adversarial TK.4b (both stores), objections
  2.1 (+its red: the refusal's new words), house-bot-reports 0.232.2 (line pins moved), red-engine's "13.2" line (read it).
  red:house-bot-console on 641603e2b (s6-redsb 39827938721) was running. ⛔ LINT's core is NOT done (ruling 6's ACTIVE ceiling,
  the boot write, findings 1–8, 10–13, L-7, L-8) — it blocks any S6 push. Needs the lead: the rules' §6 vs the objection
  door (draft in the S6 lane's scratch, lanes/s6/drafts-for-lead.md — not travelled: re-derive), privacy item 7, campaign
  wordings (n), the legal-review list (o). MONEY and NOTICES (`lanes/s6mn/BRIEF.md`) not started.

## 4 · Machine notes (Blade15)
- Orphaned tail/grep monitors from 10-18 were cleaned. The VS Code **Angular Language Service** extension reloads the whole
  repo (~600 MB–1 GB): a session-local watcher stopped it every minute; Ali was asked to DISABLE the extension.
- Close-out still owed at the very end (Ali): stale branches (ci/run/*, ci/mln-gate*, ci/mln-parity*, the merged lane
  branches), worktrees (C:/kipindi-mln-*), temp files, the admin guide PDF on the Desktop.
