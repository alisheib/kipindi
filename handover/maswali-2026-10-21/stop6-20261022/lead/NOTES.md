# Lead notes — ali-7e on ALI-BLADE15, 2026-10-22 evening (Maswali resume after OMEGA's STOP 5)

## Machine
- ALI-BLADE15: ~1–1.6 GB free all evening (Firefox, VS Code; kernel paged pool ~3.1 GB). NO local Node at all.
- Heavy work: GitHub Actions. Tools in scratchpad/ci: `mln-run.yml` (generic run on `ci/run/**`), `lib.sh` (step/serve/
  serve_tree/plant_check/finish), `ci-run.sh <name> <commit> <job.sh> [--wait] [--webkit]`, `ci-wait.sh <run-id> [<dir>]`.
  The gate workflow: scratchpad/gate/mln-gate.yml on `ci/mln-gate-*` branches.
- Cleaned: 26 orphaned tail/grep monitors from the 10-18 session. The VS Code Angular language server regrows to ~1 GB:
  watcher `angular-watch` (PowerShell loop, background) stops it above 400 MB — REMOVE at cleanup; Ali asked to disable it.

## S5 release (claude/maswali-s5-release)
- Head 2ed817395 = cc0db75c1 + the e2e:maswali-fault harness fix (the kill never reached the release on Linux: child not
  its own process group; 1.2 now also requires the kill delivered and no RESULT printed). Proof on Linux: 16/0; plant
  (no `detached`) caught by 1.2 ("the kill could not be delivered").
- Gate 2 at 2ed817395: build ✓ (tsc via CI; next build; house-bot bundle ALL PASS; first-load ✓), money ✓ (e2e:money
  64/0 drift 0.00; e2e:fault 34/0; e2e:card 100 passed; e2e:maswali-money 3/0 = 38/0 per store; e2e:maswali-fault 16/0).
- CI at 2ed817395 (run 39816221418): typecheck, integrity, test-all, build, first-load ✓ (browser gates pending).
- CI at b120fcbe0 had failed only ui-consistency, r7c, r5h — fixed by a0e2e1bd8.

## Findings
- F1 · PRE-EXISTING on production main, Linux rendering: the classic phone rail at 320px clips "Up & Down" (en, 67/64)
  and "Mubashara" (sw, 66/64); JetBrains Mono 11px 700. Identical on main da3d32180, the release 2ed817395 and the R2 head
  fa8d21731 (run rail-measure). Windows (OMEGA) fits them — hinted advances. Android/iOS render like Linux → real on
  small phones. Fix with the platform work (rail label fit at 320, guard measured on the Linux runner).
- F2 · R2 head: qa:journey-rail-gaps (five tabs, FEATURE_SIMPLEJOURNEY=ACTIVE + Millionea ACTIVE) en 320–349 least gap
  4.4–7.5px < 8 on Linux (PLATFORM measured ≥ 8 on Windows). Before ACTIVE.
- F3 · qa:hover-touch's two plants (3.1, 3.2) are not seen on Linux headless Chromium (a tap shows no hover there) — the
  drive's control cannot fail on Linux; PLATFORM proved it on Windows. Tooling, not product.
- F5 · R2 head, the DRAWN classic rail at 320 (Linux): "Millionea" (9 chars, JetBrains Mono 11px 700) cut in sw/en/zh,
  with F1's two — the rail's 9-character labels do not fit a 320 slot on phone-like rendering. One platform fix for the
  rail's label fit at 320 (all states), guarded on the Linux runner.
- F6 · R2 head, qa:maswali-register-shots 2203/8: the week and index drawings land 20–40px off at 320–360 (en/sw/zh week,
  zh index) on Linux — their per-language line tables were measured on Windows. RULING NEEDED (lead): the reference
  renderer for "lands within 1px" (phones ≈ Linux/WebKit, not Windows).
- CI at 2ed817395: 702/702 in-memory; browser gates responsive 7641/0, motion 43/0, revoked-deadend 46/0,
  admin-section-gate 21/0; needle-rest RED (U43's known red since 7e3a06ea0 — proof on main pending: run dark-main);
  s10/s11/s12 skipped by CI's stop → run pg-proofs.
- F4 · R2 integration re-pins (fa8d21731): r4j 3.4 register pick; millionea-shell §3 View ticket = Link (3.0b new);
  landing-doors 3.1 premise; spacing-scale 390. All green on the runner (r4j 92/0, shell 50/0, landing 10/0 + red 31/31,
  spacing 10/0, tsc 0).
