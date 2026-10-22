# Lane S5-R3-FIX — round 2's findings on the phones' renderer (lead ali-7e on ALI-BLADE15, 2026-10-22 evening)

- Worktree: create it — `git -C C:/kipindi-main fetch origin` then
  `git -C C:/kipindi-main worktree add -b claude/maswali-s5-r3-fix C:/kipindi-mln-r3fix origin/claude/maswali-s5-r2-int`;
  push your own branch `claude/maswali-s5-r3-fix` at once (full refspec) and after every verified commit. Step name
  `S5-R3-FIX <n>` · scratch
  `C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/22b71bac-cd55-4164-a2d1-012a5a83c1c2/scratchpad/lanes/r3fix/`.
- Read FIRST: `../LANE-COMMON-BLADE.md`. Then `../../lead/NOTES.md` (findings F1–F6), DESIGN_AUTHORITY §M8a items 11, 21,
  22, 24 and the rails' rules (search "kp-rail", "§K8b"), and the round-2 commits of PLATFORM (`git log 7e9a314f0..
  origin/claude/maswali-s5-r2-platform`) and REGISTER (`… origin/claude/maswali-s5-r2-register`).
- `origin/claude/maswali-s5-r2-int` is the lead's integration branch (the S5 release + REGISTER + the landing door +
  PLATFORM + four re-pins; HUB lands on it next). Merge it into your branch whenever it moves (never rebase).

## THE LEAD'S RULING (2026-10-22, under Ali's delegation of technical calls) — record it in DESIGN_AUTHORITY with your first fix
**Text geometry is held on the phones' renderer.** 50pick's players are on phones, whose browsers draw text unhinted
(Android Chrome, iOS WebKit). The GitHub Linux runner's Chromium draws text the same way; the Windows machine where round 2
was measured hints it narrower. So every geometry rule that depends on text width — a label that must fit its slot, a
loading drawing's per-language line table that must "land within 1px", a rail's least gap — is MEASURED and GUARDED on the
Linux runner (Chromium; WebKit where a drive already runs both). On Windows it must still never clip or overflow (a looser
reading is acceptable there). Record it once in DESIGN_AUTHORITY (the platform section that owns measurement, with a
pointer from §M8a item 22) — a dated rule with the reason; correct every place that says the tables were measured on
another machine as the truth.

## Fix, each with its guard (asserting MEASURED values on the runner) and its plant
1. F1 + F5 · THE CLASSIC PHONE RAIL AT 320. On the Linux runner the rail clips 9-character labels in a 320 slot — "Up & Down"
   (en, 67/64), "Mubashara" (sw, 66/64), and, while Millionea's door is drawn, "Millionea" (all three languages). F1 is on
   production main too (pre-existing): fix it for every reader, dark and drawn. Choose the platform-consistent answer (the
   rail's type at the narrowest widths, its tracking, or its slot geometry — never a truncation, never a different word),
   keep every label whole and every tap ≥ 40, then prove it with qa:classic-rail (dark and drawn) on the runner. A change
   every classic reader sees at 320: say so in the commit for the parity compare.
2. F2 · THE JOURNEY RAIL'S FIVE TABS, en 320–349: least gap 4.4–7.5px < 8 on the runner (qa:journey-rail-gaps with
   FEATURE_SIMPLEJOURNEY=ACTIVE + FEATURE_MILLIONEA=ACTIVE). PLATFORM tuned sw tracking for 332.8–348.8 on Windows; re-tune
   for every language on the runner, four tabs and five. Keep the rule (≥ 8px).
3. F6 · THE REGISTER'S DRAWINGS: qa:maswali-register-shots (states) 2203/8 on the runner — the week drawing at 320/360 in
   en/sw/zh and the index drawing in zh land 20–40px off: their per-language line tables (register-week-ghost.tsx,
   register-ghost.tsx, and How's how-ghost.tsx if it shares the defect) were measured on Windows. Re-measure on the runner
   (the drive prints the page's lines) and correct the tables; the drive green.
4. F3 · qa:hover-touch's two plants are not seen on Linux headless Chromium (a tap shows no hover there), so the drive's
   control cannot fail on the runner. Make the control observable on the runner (e.g. drive the plant with a real hover
   on the touch page's CDP-emulated pointer, or assert the computed `:hover`-gated rule from the stylesheet) — never weaken
   1.1/1.3. The drive must be green WITH its controls on the runner.
Run every reader of every file you touch (`git grep -l <path> -- scripts/`), tsc, and the drives above on the runner.

## Done means
1–4 done with guards and plants; the drives green on the runner at your final pushed head; tiles of the rails read (320,
340, 360 in sw/en/zh). Then your report (LANE-COMMON-BLADE's six points) with the classic-visible changes named for parity.
