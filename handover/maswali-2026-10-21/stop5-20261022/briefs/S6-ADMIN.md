# Lane S6-ADMIN — the Millionea admin console made complete and plain (the DOCS lane's walk, G1–G8)

- Lead: asheib-f3 ("main" to SendMessage). Integrator: lane S6 (agent abda3585a3c0e1630) — it merges your branch into
  `claude/maswali-s6-release` and runs the batteries. You report to "main"; say there when a commit is ready to merge.
- Why: Ali (2026-10-22): "admin make sure full control with the right sorting etc. and management", and his admin guide
  (built from `docs/maswali-operator-guide.html` by the S6-DOCS lane) must be "clear, perfect … no unneeded wording". The
  DOCS lane walked /admin/maswali and found the gaps below; you fix them so the guide describes a console with none.
- Tree: create it — `git -C C:/50pick-ssd/maswali-coord-20261019 fetch origin` then
  `git -C C:/50pick-ssd/maswali-coord-20261019 worktree add C:/50pick-ssd/kipindi-mln-adm -b claude/maswali-s6-admin origin/claude/maswali-s6-release`,
  then `bash $S/mln-slot-s7c.sh s6-admin npm ci` (in the new tree) before anything else. Push the branch at once (full
  refspec; confirm with `git ls-remote`). Never touch another tree.
- Step name: `S6-ADMIN <n>`. Ports 3680–3689 · `KP_SCRATCH_PORT=5481` · scratch `$F/s6-admin/`.
- Heavy jobs: `bash $S/mln-slot-s7c.sh s6-admin <cmd…>` (slots 6 and 4, shared by S6 and its five lanes: one heavy job at a
  time, batched; long ones with `run_in_background`).
- Merge `origin/claude/maswali-s6-release` (`git merge --no-ff`) whenever it moves; never rebase. Other lanes touch some of
  your files: S6-MONEY adds OD-13's act on `/admin/maswali/integrity` and widens the console alerts' audience (MB-11) in
  `maswali-console.ts`; S7 (below S6) edits the integrity page and `maswali-console.ts` too. Keep your edits surgical
  (string- and component-level), commit small, and tell main when a commit touches those files.

## Read first
1. `$F/LANE-COMMON.md` — the rules, including the last section ("Every change is a recorded FINAL rule").
2. `AGENTS.md` at your worktree root; `docs/DESIGN_AUTHORITY.md` (the admin console's sections and §M8a).
3. The DOCS lane's findings, verbatim, below (file:line on `d97266317`; re-find each line on your branch).

## The lead's rulings (binding)
- **G1 · No programme code reaches an admin's screen.** Every code (`MB-nn`, `OD-nn`, `MR-nn`, `R-…`) leaves every
  admin-facing string: page text, labels, hints, chips, refusal messages, the open checklist, alert texts, settlement and
  service refusals shown in the console. Each is replaced by plain words that say what the rule is (keep the code in a
  comment beside it). EXCEPT the desk scripts on Ticket lookup (`maswali-support-scripts.ts`): the S6-DOCS lane strips those
  in its item 9 — do not touch that file. Guard: a static census over the admin console's sources and the services'
  console-bound strings that fails on a code outside a comment, with a plant.
- **G2 · "Rules this week froze"** — a read-only card on `/admin/maswali/[weekId]` (price, floor, fee, cap, close buffer,
  void hours, objection window — every frozen rule `consoleWeekDetail` returns), labelled in plain words with units; and
  the fee rate beside each open week on `/admin/maswali/pools` (Finance cannot open the week page).
- **G3 · Names, not ids:** the week's code (never `mlw_…`) and the officer's display name (never `usr_…`) everywhere the
  console prints a person or a week (integrity "Seals from a new device", the Seal log's "Sealed by" / "Second officer").
- **G4 · Every time an admin reads is EAT**, written as the console writes its other times (refusals, the open checklist,
  moveClose, sunset, the void deadline, alerts).
- **G5 · "Discard draft"**: a DRAFT week (never published, no tickets) can be discarded — behind the same control that
  creates drafts, a typed confirmation, audited, both stores; it frees its Monday and line for a new draft. A published
  week is never discarded (refused, with the reason). Case + plant (a published week discarded; an unaudited discard).
- **G6 · Labels, not codes** in the week builder's category and kind options (the words players read, or the console's
  own label table).
- **G7 · The evidence archive list** gets the week-code search and the state filter the other three lists have (the same
  list kit; the same URL parameters).
- **G8 · The lock chip and its tooltip speak the role names** (`ROLE_LABEL`: "Owner", never "Admin") and the domain in
  words ("Trading officers only", …); the Winners table's "Role · status" shows labels, not raw enums. `control-locked.tsx`
  is a PLATFORM component (classic admin too): one wording everywhere, named in your report as a classic-admin change.
- Each fix: its case (a rendered string or measured box where it is UI, a both-store case where it writes), its plant, the
  admin tiles of the screens you change at 360 / 768 / 1280 (en; plus sw/zh where the admin shows player words) read by
  you; `test:admin-act-gate`, `test:unsaved-changes`, `test:control-gates`, `test:maswali-rbac`, `qa:maswali-admin-drive`,
  `qa:maswali-admin-shots`, `qa:admin-filters`, `test:maswali-console*`, `test:maswali-integrity*` where they read your
  files (derive the full set: `git grep -l <path or symbol> -- scripts/`).

## Records each fix changes
- `docs/DESIGN_AUTHORITY.md`: ONE admin-console rule, in the section that owns the admin console ("an admin reads plain
  words: no programme codes, names not ids, EAT times, labels not enums; every list has search/filter/sort/paging") — if
  it needs a new §M8a item, ask main for the number (28 and above).
- `docs/FAILURE-INVENTORY.md` §9b: one entry per G-finding (found by the S6-DOCS walk, fixed by S6-ADMIN n).
- Code headers and every place that states the old behaviour.
- Tell the S6-DOCS lane (agent af10c427280c69725) each label you change, so the guide copies the final words.

## Forbidden (LANE-COMMON)
⛔ Never edit `docs/MASWALI-PLAN.md` §0/§1 or `docs/NEXT-PLAN.md`. ⛔ Never build, test or run a server in
`F:\kipindi-main`; never edit outside your worktree except `$F/s6-admin/`. ⛔ Never `test:all`, `e2e:money`/`e2e:fault`/
`e2e:card`, anything against production, or `/auth/demo` in a warm-up list. ⛔ Never `git stash`, force-push or rewrite
pushed history; stage by name; push only your branch, full refspec, confirmed by `git ls-remote`. ⛔ PUBLIC repo: describe
a control by what it enforces, never its signals or thresholds; never print or commit a secret. ⛔ Never waive a failed
check or quote a count you did not see printed. ⛔ WITHDRAWN stays dark. ⛔ Do not touch kipindi-mln-gate, -rb, -par,
maswali-s7-red-20261021 or any other lane's tree.

## Report (to "main", at each milestone and at the end)
LANE-COMMON's six points; per G-item: its commit, its case and plant, the records it changed, every printed result.

---

## The DOCS lane's findings (verbatim, 2026-10-22, source read on d97266317)

G1 (MEDIUM, label) · Programme codes are printed to admins all over the console. Ali's guide standard forbids them, but
the screens show them: page.tsx:150 "(MB-75)…(MB-91)", :161 "(MB-85, OD-27)"; rules-controls.tsx:74 "(MB-50)", :97
"(MB-75)", :155 "(MB-85)"; week-builder.tsx:150 "(OD-21)", :208 hint "OD-14: inside the rules' band"; week-controls.tsx:84
"(MR-13)", :104 "(MB-28)", :264 "(MR-17)", :280 "(OD-09)"; edit/page.tsx:47 "(MR-13)"; pools/page.tsx:106 "(OD-02)", :108
"(OD-21)", :162 "(MB-43)", :256 "(MR-30)"; pools-controls.tsx:114 "(OD-02)"; integrity/page.tsx:416 "(MB-34)", :455
"(MB-47)…(OD-30)"; integrity-controls.tsx:91 "(MR-18)", :188 "(OD-07)". Also in text the services/console hand to the
screen: maswali-console.ts alerts (:144/:145 holiday warnings "MB-85, R-WEEK, OD-27, MB-28", :195 "(MR-15)", :208/:212
"(OD-02)", :216 "(OD-01)", :246/:257 "(MB-96)", :586/:592 "(MB-11)"); maswali-service.ts refusals and the open checklist
(:257/:715 "MR-13", :331/:362/:407 "MB-79", :383 "OD-01", :395/:399/:400 "OD-02", :428/:441/:443/:448 "OD-14", :490/:496
"MR-3", :788 "MB-84", :886/:1013 "MR-15", :902 "OD-09", :1255-1262/:1340 "OD-03", :1376 "OD-12"); maswali-settlement.ts:155
"MR-18", :330 "MR-3"; the desk scripts on Ticket lookup (maswali-support-scripts.ts titles "(MB-86)", "(MB-91)"; steps
"(OD-07)", "(OD-27)", "(OD-06)", "(OD-09)").

G2 (MEDIUM, missing display) · No console screen shows the rules a week FROZE (price, floor, fee, cap, close buffer, void
hours, check window). consoleWeekDetail returns them (maswali-console.ts:101 `rules`) but /admin/maswali/[weekId] never
renders them. "Rules for the next week" shows only what the NEXT week will freeze. So an admin asked "what fee does this
running week take?" has no console answer (the evidence pack has it only once the week is final; the public week page is
dark while WITHDRAWN).

G3 (MEDIUM, label) · Raw ids where names belong: integrity "Seals from a new device" prints "officer usr_… · week mlw_…"
(integrity/page.tsx:158, from maswali-integrity.ts:579 actorId/targetId); the Seal log's "Sealed by" and "Second officer"
print user ids (page.tsx:431-432, SealLogRow sealedBy/stage2By).

G4 (MEDIUM, label) · Times in refusals, the open checklist and alerts are raw ISO UTC ("…before the first event
(2026-11-06T…Z)", moveClose "starts at <ISO>", "it is now <ISO>", sunset "announced to open at <ISO>", void-deadline refusal
"(<ISO>)", alert "sales should have closed at <ISO>") while every other console time is EAT. maswali-service.ts:412, :709,
:730, :904, :1030, :509; maswali-console.ts:169.

G5 (LOW-MEDIUM, missing control) · A draft cannot be discarded: no delete/discard control, and edit keeps its Monday and
line fixed. A draft made for the wrong Monday or line can never be corrected or removed; it stays a DRAFT forever (and
"Week MLN-… already exists" blocks redrafting that Monday).

G6 (LOW-MEDIUM, label) · Builder category options are raw codes ("macro" = stocks, "culture" = entertainment,
week-builder.tsx:181); kind options lower-cased codes.

G7 (LOW, list) · /admin/maswali/evidence pages newest-first with no week-code search and no state filter (a 7-year archive
will be long); the other three lists have both.

G8 (LOW, label) · The lock chip reads "<control> · trading only / accounting only / ops only" (domain codes,
control-locked.tsx:57) and its tooltip says "Ask an Admin or Trading officer" although ADMIN is "Owner" everywhere else
(roles.ts ROLE_LABEL). Platform component; Winners' "Role · status" prints raw enums (PLAYER · ACTIVE).
