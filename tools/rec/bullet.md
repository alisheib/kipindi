- **A8j — Enter in a form never skips its confirm (LIVE `88fb1f41`, 2026-10-07, for every player, both looks).** What it
  closes, each proven on live main `586c5183` by the drive's control run on OMEGA-COMPILE01 (Chromium, a fresh in-memory
  server; 3 pass, 10 fail): W1 — 20,000 and Enter in the withdraw amount box sent the withdrawal with no confirm; P1 — the
  same Enter before the page woke posted the form as plain HTML and withdrew 20,000; C1 — the phrase and Enter closed the
  account and signed the player out; C2 — half the phrase and Enter posted, and came back with "type the phrase"; W2 and
  K1 — 5 and Enter posted, and came back with the minimum's error (the server refused: no money); K2 — 20,000 and Enter
  withdrew again (no confirm opened to hold Enter on); D1 — Enter in the deposit box did nothing; R1 — the RG break and self-exclusion forms had no
  submit control. ConfirmDialog forces its trigger to `type="button"`, so these forms had no submit button and one text
  field, and a browser SUBMITS such a form on Enter. **How:** ConfirmDialog's opt-in `submitsForm`
  (`src/components/ui/confirm-dialog.tsx`): a native submit guard on the host form refuses every submit but the confirm's
  own (prevented AND stopped, so React's root never runs the action) and opens the dialog the way its trigger does; before
  the page wakes, a hidden default `<input type="submit" autocomplete="off">`, disabled until the guard listens, stops
  Enter in Chromium and Firefox (`autocomplete="off"`: Firefox would restore it enabled), and a hidden unnamed second text
  field stops it in WebKit (by WebKit's source, which submits a one-field form past a disabled control). One guarded
  dialog per form (a second throws in development and stays out in production). Consumers: withdraw, deposit (Enter now
  opens its confirm), close account, the RG break and self-exclusion confirm, the journey hub's sign-out. **The draft**
  (ALI-BLADE15, never run) was revised here for its 19 review problems and an independent verifier's findings (product
  verdict: sound) — among them WebKit's own implicit-submission rule (the second field), Firefox's restored control, one
  guarded dialog per form, the census read by scope and one hop into imports, and the drive given an ENGINE switch and
  P1x (WebKit with the second field stripped must post). **Guard:** `test:implicit-submit` (predeploy) — the guard run on
  real submit events; the server's markup read by each engine's own implicit-submission rule; a census of every
  ConfirmDialog and ConfirmModal in `src/`; the six host forms with nothing else submit-capable inside them — and
  `red:implicit-submit`, 61 plants caught and 1 green control held. **Proof (OMEGA-COMPILE01):** on the shipped tree,
  typecheck, `test:implicit-submit`, `test:enter-where-pressed`, `test:journey-account` (85), `test:journey-shell` (429),
  `test:close-account-phrase` and `test:ui-consistency` green; `qa:implicit-submit` (run before its last edit) in
  Chromium and Firefox — every case passes but Z, which saw only the RG page's hydration mismatch that main shows too
  (the drive now names it as known); in WebKit every after-load case passes and no case moved money, but P1 and P2 could
  not keep the page asleep (WebKit served the scripts from its memory cache) and P1x did not post with the field
  stripped, so no run has yet shown that WebKit needs the field (⚠️ owed: the re-run with the sleeping page in a fresh
  context, and the WebKit control on `586c5183`). `test:all` 433/464: every red on the §0i baseline list, one of the 13
  database suites (A8j touches none of their code), or audit-drain's timing flake (42/42 re-run on this tree).
  Production read back: `dpl=88fb1f41` served on www.50pick.tz and 50pick.tz by a fresh container (uptime 15 s, then
  climbing), `/api/health` ok with the database reachable, and `qa:live` against production 318/318. **Served bytes:**
  two hidden inputs inside each host form (no word, class or layout change); no other page changes. **Owed (recorded,
  not run):** the WebKit runs above; a real iPhone's Go key; the drive in predeploy (it needs a server).
