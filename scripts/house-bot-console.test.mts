/**
 * THE DESK'S CONSOLE — its audience, its one read door, its painted copy and its source law, on Postgres AND memory
 * (C7-SPEC §4; rulings 300–341, 346–356, 361, 373, 403–422, and owner-delegated 453).
 *
 *   npm run test:house-bot-console
 *
 * ⛔ WHAT THIS GUARDS, AND WHY IT IS NOT A LAYOUT'S JOB. Ruling 259 MEASURED it: every page, route handler and server
 * action under `src/app/admin` streams its payload to ANY signed-in account, a PLAYER included — the layout's redirect
 * and `AdminSectionGate` change what is PAINTED, not what is SENT, and a flight request whose router state names the
 * admin layouts skips them altogether. Ruling 260 then measured 72 of 606 non-staff responses carrying house audit
 * rows. So the desk's page decides its own audience, first statement, on the viewer's STORED role, and every figure it
 * renders comes from a NAMED reader inside `house-console-read.ts` that resolves that audience before it reads
 * anything. This suite proves both halves — behaviourally with a spy store, and at source level over the section.
 *
 * ⛔ AND IT GUARDS THE WORDS. Owner-delegated ruling 453: nothing the desk renders names the feature, not even behind
 * the gate, because a screenshot is the likeliest accidental disclosure channel this project has and the repository is
 * public. §3 and §4's `4.453` are that guard, over the painted view model AND over every string literal of the section
 * that can reach the DOM, with planted controls that put the original words back and must fire.
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED). The source pins run in the memory child only, so the
 * floor is a PER-STORE pair: a suite whose static half runs in one child must not let the other child's lower count
 * hide it.
 *
 * ⛔ AND THE PAIR IS NOW THE MEASURED COUNT (replan ruling 515, 2026-09-18). It stood at `{ memory: 60, postgres: 28 }`
 * — the value the suite was BORN with at `a897e47a` — while the run printed memory 153 / Postgres 86 at `98b5a2be`,
 * so the floor would not have noticed 93 memory cases and 58 Postgres cases vanishing. A floor that has never risen
 * is itself a finding, which is what 515 is. Raised to what `npm run test:house-bot-console` PRINTED at `d2f20795`:
 * **memory 154, Postgres 86** (ruling 513 added 4.453.c2, hence 154 rather than 153), and RAISED AGAIN at C7
 * step 3 to what this run PRINTED with the limits tab, the caption pair and the live trigger in it:
 * **memory 210, Postgres 117**, and again at step 2 with the D19 §5 and 398's roll-call in it: **memory 238,
 * Postgres 121**, and once more with the limits list's money/count face pinned: **memory 240, Postgres 122**,
 * and again at replan ruling 539's fixes — the widened counter stem, the derived override population, the swept
 * top-level copy and 513's raised floor: **memory 242, Postgres 124**, and again with ruling 348's own Proof
 * written for the first time (1.348): **memory 248, Postgres 128**, and again at ruling 541's four dead
 * mutations: **memory 250, Postgres 129**, and again with 306's sentence, 474's two clamps and 421's schema
 * state: **memory 262, Postgres 140**.
 * ⭐ RAISED AGAIN at replan ruling 537 — the limits SAVE, its refusal, its audit row, its CAS conflict under two
 * real writers, its neutral keys and the rendered field list — to what `npm run test:house-bot-console` PRINTED
 * on this run: **memory 307, Postgres 169** (303/166 before the served drive found the audit-failure lie and the card's doubled heading).
 * ⭐ RAISED AGAIN by C7 step 3's VISUAL pass (ruling 544 and 432(n)'s placeholder), to what
 * `npm run test:house-bot-console` PRINTED on that run: **memory 313, Postgres 173**. Both new assertions came
 * off a served tile, not off the source: `limits-at-1280.png` and `limits-over-1280.png` are pixel-identical in
 * the meter, `form-dirty-360.png` showed one field saying "Not set" twice, and `limits-unset-exempt-unsetfield-1280.png` showed four HINTS carrying the unset consequence a second time — one of them under a field whose own value read 200.
 * ⭐ RAISED AGAIN at C7 step 4's first slice — `botRateUsage`, the one new seam member ruling 351 allows, with its
 * hour/day windows, its identity with `botUsage`, its one-call roster read and the account that has never placed —
 * to what `npm run test:house-bot-console` PRINTED on that run: **memory 318, Postgres 178**.
 * ⭐ RAISED AGAIN with replan ruling 547's split caption and ruling 432(f)'s neutral way-out overrides, to what
 * `npm run test:house-bot-console` PRINTED on that run: **memory 329, Postgres 189**.
 * ⭐ RAISED AGAIN at C7 step 4 with the ACCOUNT PAGE in it — the three answers of ruling 399, the five money rows
 * and two count rows, the balance-FLOOR state in all four of its branches, X6, the rules and targets panels, the
 * REMOVED read set measured with six spies, and "Last bet" on both surfaces — to what `npm run test:house-bot-console`
 * PRINTED on that run: **memory 367, Postgres 225**, and **368 / 226** after the step's own renders found a
 * REMOVED account painting `AdminLoadError` for a read 358 says it never takes, and three rows spending a scope
 * word their own cap already carried.
 * ⭐ RAISED ONCE MORE with 1.435, the account page's own source law — six `removed` guards, three pure tab
 * tests, the RAW file yielding exactly the closed tab list, and no failure treatment a removed account can
 * reach: **memory 372, Postgres 230**.
 * AND ONCE MORE with 1.350, replan ruling 506 s last homeless assertion for this step — ruling 350 s two
 * lists held against the console s one door, with ruling 504 s two decided members read off the tree:
 * **memory 376, Postgres 230** (the source pins run in the memory child only).
 * ⭐ RAISED AGAIN at C7 step 4b with the MASTER-SWITCH CEREMONY in it — the typed word and where it is checked,
 * the arming predicate's eight branches, the server's four refusals, the act itself and the kill switch, ruling
 * 547 re-verified in the state it was written about and reached through the console for the first time, and
 * 432(j) widened from two states to four — to what `npm run test:house-bot-console` PRINTED on that run:
 * **memory 397, Postgres 251**. Every one of those assertions was seen RED first, against a tree with the gated
 * writer and its service removed: **16 failed on memory**, with no throw and with §3 and §4 still running.
 * ⭐ RAISED AGAIN with the ENGINE-HEALTH CALLOUT inside the one door (ruling 435(e)) — the tone table over five
 * verdicts, 354(c)'s unreadable beats, X1's duty phrases over a population derived from the planner's own
 * union, one beat read per render and 432(n)'s silence with the desk off — to what the run PRINTED:
 * **memory 410, Postgres 264**. Seen RED first with the notice absent: 7 failed on memory.
 * ⭐ RAISED AGAIN with replan ruling 548's breadcrumb mask and 432(f)'s eligibility half MEASURED — 14 dirty
 * sentences where the ruling named two, tied by existence to the surface that would render them — to what the run
 * PRINTED: **memory 420, Postgres 273**.
 * ⭐ RAISED AGAIN with the ACCOUNT ACTION ROW — which acts each state allows, Pause and Remove as the OFFICER s
 * acts rather than the engine s, the typed word checked on the server, every refusal in the console s own words
 * over a population derived from the service unions, and 432(j) s state-with-no-reason closed — to what the run
 * PRINTED: **memory 440, Postgres 293**. Seen RED first with the row s server half removed: 14 failed on memory.
 * ⭐ RAISED AGAIN at C7 step 4c with ruling 550(b)'s PAGER on the account page's Targets grid (the total is a
 * COUNTING read beside the paged one, the tab count is the account's own ACTIVE total and not the page's, and a
 * `?tpage=` past the end is served as the last page) and ruling 551(a)'s refusal destination (a section that masks
 * its record ids does not hand one back in a `next=` target) — and again at C7 step 6, to what THAT run printed:
 * **memory 485, Postgres 322** (the designate wizard's own §2f, its three D19 source pins and the two re-aimed
 * assertions its live head action forced).
 * ⭐ RAISED AGAIN at C7 step 6's FIX PASS, to what THAT run printed: **memory 515, Postgres 344** — the page's own
 * audience verdict (259/324/380, which the wizard decided only when a `?u=` was present), the counting reader
 * behind "Open positions" (344), the settled set's three failure branches (355), the picker's eight-role refusal
 * parity, its rate rule and its busy sentence (387), the ten-option cap with a count that does not lie about it,
 * ruling 388's OWN 25-character Proof, and the once-only `submitId` whose deterministic key bricked the control
 * after one wrong password. A floor only ever rises, and only to a count a run printed. Seen RED first on six separate mutations, two at a time: total-from-page-length (total 20 where
 * the set is 22), tab-count-from-page (20 on page 1, 2 on page 2), offset ignored (page 2 == page 1, union 20),
 * no clamp (`?tpage=99` answered 99), the helper returning its argument, and one of the four `next=` sites built
 * from the raw href (layout 3 built / 2 via the helper).
 * ⭐ RAISED AGAIN at C7 STEP 7 — THE CLOSING GATES — to what `npm run test:house-bot-console` PRINTED on that
 * ⭐ RAISED AGAIN at the C7 STEP 7 REVIEW, to what that run printed: **memory 561, Postgres 344** — the review's
 * repairs to 1.370, 1.371, 1.390, 1.391, 1.395, 1.397 and 1.398 and its eight surface pins are SOURCE pins and run
 * in the memory child alone, which is why only that half moved.
 * run: **memory 540, Postgres 344** (539 before the READ-TIERS finding below added its control). The Postgres half is unchanged to the case, and that is expected rather than
 * a miss: every assertion this step added is a SOURCE pin and the source pins run in the memory child only.
 * What landed: `1.371` (the results reader and the last of the fee derivation gone from house-bot CODE, over a
 * population derived from the path so the AGENT module's own `netTzs` is not mistaken for this feature's),
 * `1.370` (no amount in any engine or switch-off sentence, no money field on `SwitchOffOutcome`), `1.375`
 * (`reimbursement_recorded` has no writer and `HOUSE_AUDIT` is pinned at 31 keys), and the four D19 assertions
 * step 7 owed — `1.390`, `1.391`, `1.395` and `1.397` — which is why `1.398`'s ladder now reads SEVEN.
 * ⭐ AND ONE FINDING THE STEP'S OWN SUITE RUN PRODUCED, fixed here rather than carried: `test:read-tiers` 7.1 is an
 * INHERITED red, but its failing LINE had grown a second file on this branch — the wizard's `{view.phoneE164 !==
 * null && (` presence check. The ratchet strips `<Sensitive …/>` and reports every other braced expression naming
 * a governed accessor, so a check that renders nothing read exactly like a page printing a player's number in the
 * clear. The branch now takes a server-computed `hasPhone`; 7.1 names `/admin/agents/page.tsx` alone again, as it
 * does on `origin/main`. `1.359` is re-aimed at the same defect with the ratchet's own detector reproduced as its
 * control, and `1.420`'s phone-line pin widens from THREE named lines to FOUR.
 * ⭐ RAISED AGAIN AT THE C7 STEP 7 REVIEW's REGRESSION FIX, to what that run printed: **memory 570, Postgres 344**.
 * The review replaced a shared CLASS STRING with a shared COMPONENT (`src/app/admin/desk/way-out-link.tsx`) and did
 * not re-run this suite: four SOURCE assertions were left measuring a shape the section no longer has — 1.432's
 * declaration sweep, 1.306's positional link pin, 1.312a's linked-sentence paint and 1.359/456's door outside the
 * funded guard — and the `432-way-out` red anchor stopped resolving, so its harness was measuring nothing. Each was
 * re-aimed at the NEW shape and each got STRICTER doing it (the element is pinned beside the href, the paint is
 * counted, the door must be exactly one and must be a rendered link, and the component's props are pinned CLOSED so
 * a caller cannot add to the shared look). The +9 are the four repairs' own planted controls. ⛔ NONE of them was
 * loosened to go green: four declared mutations — `432-way-out`, `306-way-out-element`, `312a-linked-outside` and
 * `359-door-inside` — put each defect back on disk and every one was SEEN RED on the assertion it names.
 * ⭐ RAISED AGAIN AT C7 STEP 5's ACCOUNT HALF, to what THIS pass printed on both stores: **memory 659,
 * Postgres 430**. The account page grew its activity and history panels, and with them 78 new assertions and
 * their controls: the detail rail's closed list both ways, the TOTAL event-word map and the measurement of WHY it
 * has to be total (the lexicon is structurally blind to `HOLDER_AGAINST_BOT`), both pagers against COUNTING
 * readers, the facets moving rows and total together, every crafted query axis refused BY NAME, the two empty
 * states told apart from a failed read, a bell's anchor landing on the page its own row is on, and the prop-name
 * pin widened to the three spellings its old `[?:]` tail was blind to.
 * 🔴 THE +1 OVER THE FIRST GREEN RUN IS THE RED HARNESS PAYING FOR ITSELF. The declared mutation
 * `317-word-hole` renamed one kind of the TOTAL event-word map and the suite stayed GREEN: the totality
 * comparison had been written with `j`, which is this file’s DISPLAY helper and slices at 260 characters,
 * and thirty keys serialise to about 600. Every comparison this step wrote now reads `all`, and the extra
 * assertion is the CONTROL that keeps the finding — it requires the whole-set comparison to report a rename
 * 600 characters in and requires `j` NOT to.
 * 🔴 AND THE +8 AFTER THAT ARE THE RENDER PAYING FOR ITSELF. The panels were driven on a SERVED page over a
 * scratch Postgres, and the markup carried `href="…&kind=counter"` and `data-chip="kind:counter"` five times —
 * a word 453 forbids, in the address bar, with EVERY SUITE GREEN (4.453 scans source literals and the token was
 * computed; 3.453 scanned the labels and not the keys; the bundle scan reads chunks and this is server markup).
 * The same reading found a `When` column that read one minute on twenty rows under a "Newest first." claim, and
 * a singular heading above a plural sentence on one card. All three are fixed and all three now have a case.
 * ⛔ A floor only ever rises, and
 * only to a count a run printed — never to an arithmetic guess.
 *
 * ⭐ RAISED AGAIN AT C7 STEP 5's LANDING HALF, to what `npm run test:house-bot-console` PRINTED on this run:
 * **memory 700, Postgres 470**. `CONSOLE_TABS` grew to its four keys in rail order and the desk-wide activity and
 * history panels landed behind them, with the rail both pages now share, both pagers against COUNTING readers, the
 * queued-stake badge read ONCE in the shell for all four tabs, and the hour summary's bell finally landing on the
 * hour it is about.
 * 🔴 AND THE MEMORY CHILD'S OWN +41 IS PARTLY A DEFECT THIS RUN FOUND IN THE HARNESS RATHER THAN IN THE
 * BUILD. `pageRaw`, `pageCode` and `panelOf` were hoisted out of §4 so §2e3 could slice the same page — to column
 * zero, which READS like the top level and is not: §1 and §2 sit inside one `try` that closes past §2e3, so the
 * hoisted constants were locals of it and §4 threw `pageRaw is not defined`. The memory child ABORTED at 0
 * assertions while the Postgres child printed ALL PASS, which is exactly the shape `0.throw` exists to refuse and
 * exactly why a per-store floor is a PAIR. Indentation is not scope; the declaration now sits above the `try`.

 * 🔴 RAISED AGAIN BY THE LANDING RENDER, WHICH FOUND TWO DEFECTS EVERY SUITE HERE HAD PASSED —
 * **memory 706, Postgres 471**. (1) The desk-wide panel handed back the SHELL's filtered empty state, whose
 * body reads "No stake on **this account** matches" — on the one page that has no account to name; the
 * assertion meant to hold that compared only the two TITLES and then checked the UNFILTERED body for the word
 * "desk", so the one string that was wrong is the one string nothing read. (2) The Owner's own typed label was
 * wrapped in `.row-link`, the platform's row-EXIT class, whose `text-transform: uppercase` REWROTE it: the
 * roster painted `Evening desk - widest label yetX` and these two panels painted `EVENING DESK - WIDEST LABEL
 * YETX`, one label in two looks 40px apart on one screen. That one was invisible to every scan in this
 * repository — it lives in a COMPUTED STYLE, and only a photograph and `getComputedStyle` could see it.

 * ⚠️ `red:house-bot-console` carries the mutations for every assertion here; it is run once at the commit close.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:house-bot-console",
  casesFile: "scripts/lib/house-bot-console-cases.mts",
  /* ⭐ RAISED 706 → 710 / 471 → 475 at CA-19 — the double-tapped Confirm, its two positive controls and the
   * dialog's own nonce pin — to what `npm run test:house-bot-console` PRINTED on this run, BOTH children
   * measured. The +4 in EACH child is the measurement, not bookkeeping: all four assertions reach both
   * stores, and a build where they reached only the memory twin would have shown +4 and +0. */
  /**
   * ⭐ 710 → 715 MEMORY / 475 → 480 POSTGRES, 2026-09-21, AND IT HAD BEEN TRAILING FOR THREE COMMITS.
   * `1.420.unit` and its four controls (the time cap's unit word) are unconditional and run in BOTH children,
   * so both halves moved — the Postgres side had never been re-measured for that change at all.
   * ⛔ BOTH NUMBERS ARE WHAT A RUN PRINTED, not 710 + 5: `0.mem · exit 0 · 715 passed` and
   * `0.pg · exit 0 · 480 passed`, ALL PASS on both stores.
   * ⛔ WHY A TRAILING FLOOR IS NOT A COSMETIC DEBT: while it sat at 710, the five newest assertions could have
   * stopped running and this suite would still have printed ALL PASS and exited 0 — and it is a predeploy gate,
   * so the whole chain would have gone green over them. Found by an adversarial review of this session's own
   * merge claim, which is the only reason it is not still trailing.
   */
  /* ⭐ RAISED with the per-account rules editor's cases (1546c9c8) — to what the run PRINTED:
   * `0.mem · exit 0 · 722 passed` and `0.pg · exit 0 · 484 passed`, ALL PASS on both stores.
   * ⛔ THE FLOOR WAS TRAILING THE REAL COUNT BY SEVEN. That is not a harmless gap: a floor below the
   * true count is exactly the headroom in which cases can stop running and the suite still reports
   * green — the ratchet's whole job is to make a disappearance loud. Raised here rather than left for
   * the next session to wonder about. */
  /* ⭐ RAISED 722 → 751 MEMORY / 484 → 513 POSTGRES, 2026-09-22 — the scope finding's console half (§2g: the
   * two pickers in the form model, the save's list round trip and its refusals, the roster's operative scope
   * line and its own refusal, the why-panel and the readiness badge from the same reasons, and the Start refusal
   * that names the remedy with its href), plus the re-aimed 1.310/1.435/1.508 pins. Both numbers are what
   * `KP_SCRATCH_PORT=5453 npm run test:house-bot-console` PRINTED on the held cluster: `0.mem · exit 0 · 751
   * passed` and `0.pg · exit 0 · 513 passed`, ALL PASS on both stores. The +29 in EACH child is the measurement:
   * every §2g case reaches both stores, and the chain fixture is created through the platform's own service on each. */
  /* ⭐ RAISED 751 → 763 MEMORY / 513 → 525 POSTGRES, 2026-09-22 — the review of the scope commit: the by-hand-only
   * account on all three surfaces, the live-bound item on the why-panel, the lifecycle headlines, PRODUCT_NO_MODE by
   * its section, the production shape at Start, the refusal in the Account cell. Both numbers are what
   * `KP_SCRATCH_PORT=5453 npm run test:house-bot-console` PRINTED on the held cluster: `0.mem · exit 0 · 763 passed`
   * and `0.pg · exit 0 · 525 passed`, ALL PASS on both stores — +12 in EACH child, every new case reaching both. */
  /* ⭐ RAISED 763 → 785 MEMORY / 525 → 547 POSTGRES, 2026-09-23 — the four D9/A5 minors (M5 M6 M7 M8): the
   * account-word/event-word collision checked over the whole of both TOTAL maps, the removed account's rendered
   * subject cell, the one-list relationship over four states, the retired chain reaching the callout and the
   * badge too, and the page-source pins the M7 shape rests on. What a run PRINTED on the held cluster:
   * `0.mem · exit 0 · 785 passed` and `0.pg · exit 0 · 547 passed`, ALL PASS on both stores. */
  /* ⭐ RAISED 785 → 788 MEMORY / 547 → 550 POSTGRES, 2026-09-23 — C8 minor M2: an unreadable custom window is
   * refused and named, its bounds do not travel into the rail's links, and `range=custom` with no bounds is
   * refused too, each measured against the CONTROL that the same pair in a readable shape is honoured in full.
   * What a run PRINTED: `0.mem · exit 0 · 788 passed` and `0.pg · exit 0 · 550 passed`, ALL PASS on both. */
  /* ⭐ RAISED 788 → 792 MEMORY / 550 → 553 POSTGRES, 2026-09-23 — C8 minor M1: the engine notice ages the
   * durable beats against the DATABASE's clock. Three of the four are behavioural (the skewed clock, the
   * control that the same rows with an agreeing clock paint nothing, and the control that the spy came off);
   * the fourth is the memory-only source pin, which is why memory rises by four and Postgres by three.
   * What a run PRINTED: `0.mem · exit 0 · 792 passed` and `0.pg · exit 0 · 553 passed`, ALL PASS on both. */
  /* ⭐ RAISED 792 → 793 MEMORY / 553 → 554 POSTGRES, 2026-09-23, to what this run PRINTED. +1 in each child:
   * 1.366b, the CONTROL for the owner's 2026-09-23 ruling that the settled loss row STATES a profit instead of
   * rendering it as zero. The control is the half that keeps the new grammar honest — a settled loss of exactly
   * zero is ordinary usage and must NOT read "ahead", so "ahead by" cannot leak onto a row that is simply at nil.
   * 1.366 itself was re-aimed rather than added, so it is +1 and not +2. */
  /* ⭐ RAISED AGAIN 793 → 796 MEMORY / 554 → 557 POSTGRES, 2026-09-23, to what this run PRINTED. +3 in each child:
   * 1.456f and its two controls — the account page's door to the PLATFORM's own funding control. An account
   * stakes from an ordinary player's wallet, so funding it is funding that player, and `/admin/players/<id>`
   * already carries the audited write. The controls are the half that matters: the href must be a PLATFORM route
   * and NOT a route of this section (the moment it is, the desk has grown a second money path), the two doors
   * must be different screens, and the page must actually RENDER it — a model field nothing paints is not a door. */
  minPass: { memory: 796, postgres: 557 },
  dbPrefix: "hb_console",
});
