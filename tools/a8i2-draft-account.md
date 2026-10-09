# A8i-2 draft — the author's own account (drafted on ALI-BLADE15 against 7d4b0ad5; NOTHING was run)

## Summary
A8i-2 drafted against C:/kipindi-journey @ 7d4b0ad5: "a key held down presses once, wherever it is; and nothing behind the top dialog takes a key or focus". Nothing was run.

What closes what:
(1) One app-wide KEY GUARD (new src/components/ui/key-guard.tsx). It is a window CAPTURE listener for keydown and keyup. A key it swallows gets preventDefault AND stopPropagation. It is installed once (module flag) by a `<KeyGuard />` that AppShell renders, and by every Modal on mount, so admin pages without the shell are covered too. Its decision is the pure `swallowsKey` in the new src/lib/modal-stack.ts. It swallows three things:
- a held repeat that would press something, anywhere (closes the Up & Down UP bet burst, the receipt bounce, K, and the dial's repeat reopen);
- an Enter or Space BEHIND the top dialog (a covered dialog's button, or the page under the scrim);
- a fresh press in the ARMING BEAT (ARMING_MS = 400).
It also refuses a Space released on a control it did not go down on, and never touches a key that is composing text. Capture runs before React, so the UD-16 board-card wrapper can no longer starve the rule.

(2) A pure DIALOG STACK in src/lib/modal-stack.ts:
- order by zIndex, then by open order;
- `whereIs` answers top / above / behind / nowhere / free, where "above" means a surface portalled after the top dialog, such as a dropdown list or a calendar;
- `closePlan` and the `heirsOf` hand-off decide where focus goes when a dialog closes;
- the beat (`inBeat`, `ARMING_MS`);
- a module registry that Modal keeps.

(3) modal.tsx now stands on the stack:
- it takes initial focus only while it is the top dialog;
- if the target is disabled or missing, it retries for FOCUS_TRIES = 10 frames, then focuses the first enabled control;
- every focus it gives arms the beat;
- only the top dialog answers Escape and Tab;
- Escape pressed on an open combobox, or in a surface above the dialog, is left to that surface;
- the Tab trap now pulls focus in from outside the panel in both directions;
- the leaving ghost is `inert`.
When a dialog closes, `leave()` applies the plan. The seal closing over the Sell confirm gives focus back to Uza and arms the confirm, so W2's second Enter at 60 ms is swallowed. A confirm that lapses under the seal moves nobody's focus and hands its way back to the seal. A dialog whose way back is behind the new top dialog focuses that dialog's own target. When the last dialog closes, the control focus goes back to is armed, which closes the receipt double press.

(4) bet-confirm-modal.tsx resets the quote clock on the rising edge of `open`, during render, so no opening draws Confirm disabled.

(5) The stale comments in sell-button.tsx and select.tsx are rewritten.

(6) scripts/enter-where-pressed.test.mts is extended in place:
- 1.7 runs keyTargetOf on element stand-ins; 1.8 tests the press test;
- the census now reads keyup and keypress listeners, listeners on the body and the root element, and on-handler assignments; it resolves a name where its listener stands, reads casts through, fails closed on members and wrappers, and finds a press in any spelling and through helpers;
- the scoped exemption is replaced by three named, pinned readers (2.0b fixture, 2.1);
- 2.6 covers React key props on the three money dialogs; 2.7 checks the stack is pure;
- §4 covers the guard (capture, stop, install, Space release), §5 the stack rules, §6 the first frame;
- 56 new in-memory plants, each caught by its named check.

(7) scripts/qa-enter-where-pressed.mjs gets a new A8i-2 section with real cases: 0c, K1, K2, W2, ESC, DD, SL, UD1, UD2. They count bet and sale requests at the network and read the wallet. Today's cases are kept: C, D and I now also prove their repeats reached the dialog, H also proves the Sell confirm survives under the seal, and the openers wait out the beat.

One departure from the design: Modal's own bubble-phase held-key line STAYS. Check 2.4 and its two plants pin it, and they sit on lines that contain backslashes, which this pipeline cannot edit. It is redundant while the guard stands (see notes).

## Calls for Ali (decisions the author took)
1. THE ARMING BEAT IS 400 ms, ON EVERY DIALOG, NOT ONLY MONEY DIALOGS. For 400 ms after a dialog takes focus, a fresh Enter or Space inside it presses nothing. That covers the dialog opening and the dialog being uncovered when the seal over it closes. Why 400 and not the suggested ~300: two queued win seals are presented 350 ms apart, so 300 would leave a 50 ms hole where a second Enter sells under the seal. 400 also covers double presses (W2's was 60 ms) and key chatter, and is shorter than anyone needs to read a confirm. Overrule: any number from 351 up keeps the seal gap covered (5.7 holds it above the gap and at most 600 ms). Or apply the beat to the bet and Sell confirms only.
2. THE BEAT ALSO ARMS THE CONTROL A CLOSING DIALOG HANDS FOCUS BACK TO, beyond the design. Example: UP after the Up & Down receipt closes, or the Place button after the seal closes over a lapsed confirm. A double Enter on the receipt's "Keep playing" is therefore one press, not a second bet. A fresh Enter on UP more than 400 ms later is still a bet, as is every pointer tap (your repeat-taps rule is untouched; the guard ignores pointers). Overrule: arm only dialogs. Then a quick double Enter on the receipt places a second bet, and so do SL's second Enter and the receipt bounce.
3. WHEN THE WIN SEAL CLOSES OVER THE SELL OR BET CONFIRM, FOCUS GOES BACK TO THE CONFIRM'S MONEY BUTTON (armed 400 ms), as the design asked. Overrule: give it to Keep or Cancel instead. That is safer against a third press after the beat, but a keyboard player needs one Tab to get back to the money button.
4. NOTHING BEHIND THE TOP DIALOG TAKES ENTER OR SPACE: repeats, fresh presses, and even a space typed into a field under the scrim. Two exceptions. The page itself (focus on the body) is left alone: it presses nothing, and a dropdown inside a dialog opened by mouse in Safari needs it. A surface put in the page AFTER the top dialog, such as a dropdown list or a calendar it opened, counts as above it and keeps its keys. Toasts sit behind for keys (a click still works). Overrule: none suggested.
5. ESCAPE ON AN OPEN DROPDOWN INSIDE A DIALOG NOW CLOSES ONLY THE LIST (it used to close the whole dialog and lose what was typed). The objection dialog, and admin hold, contacts and proposals dialogs, have dropdowns. Overrule: revert to closing both.
6. MODAL'S OWN HELD-KEY LINE STAYS, against design point 1. The guard now runs the rule first and stops what it swallows, so this line never fires while the guard stands. It cannot be removed through this pipeline: check 2.4 and its two red plants pin it on lines that contain backslashes. Overrule: delete it by hand together with 2.4 (test lines 211-219) and the plants at 290-293. The MODAL entry in pressReaderAllowed then goes quiet and can be dropped.
7. THE TAB TRAP NOW PULLS FOCUS INTO THE TOP DIALOG FROM ANYWHERE OUTSIDE ITS PANEL, in both directions (it used to pull only on Shift+Tab). The leaving ghost is now inert, so its Confirm cannot take focus. Overrule: none expected.

## Author notes
1. NOTHING WAS RUN (hard rules). The coordinator must run: npm run typecheck; test:enter-where-pressed; red:enter-where-pressed (expected 76/76: 20 old + 56 new); test:journey-shell (AppShell gains a static import and <KeyGuard />, and its §12 shape checks must stay green); test:ui-consistency (it imports modal.tsx in Node, which now imports ./key-guard and @/lib/modal-stack); test:stacking; test:hooks-order; test:select-keyboard; test:feedback-law; test:source-bytes. Then qa:enter-where-pressed on a fresh local in-memory server, plus its control run on a server built from 23f762f4, where K1 K2 W2 ESC DD SL UD1 UD2 must fail and every other case pass. Also run qa:select-keyboard.
2. THE BACKSLASH CONSTRAINT SHAPED THE TEST EDITS. scripts/enter-where-pressed.test.mts has backslashes on lines 29, 30, 43, 72, 77, 78, 87, 98, 100, 107, 189-190, 201-203, 208, 216, 218, 221, 229, 238, 249, 254-298 (the plants array) and 312, so none of those lines is edited. The A8i census is therefore EXTENDED, not replaced, and every old piece is still used:
- LISTEN stays the keydown reader, joined by MORE_LISTEN;
- ENTER is one of the press tests;
- scopedToItsControl is half of the select.tsx pin;
- the first-definition regex on line 107 is now only the fallback behind the scoped `definitionAt`.
New plants go in through plants.push before the red loop, and new checks are inserted before `log("§2 …")`, before `const bet = …` and before `return failed;`. In-memory plants that change census RULES (2.0b) swap `w.census` (the CensusRules); the shape plants for 2.1 edit real source text.
3. DEVIATIONS FROM THE COORDINATOR'S DESIGN, each deliberate:
(a) Design point 4. The bet confirm's clock resets on the RISING edge of `open`, during render (the useExitPhase pattern), not when it closes. A reset at close would re-enable Confirm and redraw '10s' inside the 140 ms leaving ghost. The result is the same: no opening is ever drawn with Confirm disabled. Modal's FOCUS_TRIES=10-frame retry, falling back to the first enabled control, covers the Sell confirm and any other dialog too.
(b) A closing dialog that is NOT the top one, but holds focus, gives focus to the top dialog's own target instead of moving nothing; otherwise focus would be left in an inert ghost.
(c) A way back that lies in a surface ABOVE the new top dialog (a calendar it opened) is restored as if it were inside it.
(d) The 'outside the top panel' key rule leaves the page body alone ('nowhere') and leaves later-mounted surfaces alone ('above'). See callsForAli.
(e) The guard also adds the Space-release rule and skips composing keys (isComposing or keyCode 229, for zh input methods).
(f) Escape on an open combobox is left to the dropdown.
4. FINDINGS CLOSED. Checked against the code; every claim held where it touches this family:
- 0 updown-held-enter-bet-burst: guard held rule, app-wide;
- 1 card wrapper starves the rule: capture phase runs before React; 4.1 pins capture and stopPropagation;
- 2 a/b/c/d focus moved or taken behind the seal: stack-aware focusIn, closePlan, heirsOf, behind rule;
- 3 W2: uncover-restore plus the beat;
- 4 dial repeat reopens the confirm under Retry: the guard swallows the held Enter before the dial's React onKeyDown, and a fresh key on the dial while the result is open is behind it, so swallowed;
- 6 double press: the beat;
- 7, 8, 9 census blind spots: allowlist, scoped resolution, casts/members/wrappers, keyup/keypress/on-handler/body, keyCode, Space, helpers;
- 10 partly: 2.6 covers React key props in the three money dialogs, and capture makes the ancestor stopPropagation moot;
- 11 keyTargetOf never run: 1.7;
- 13 K: the guard;
- 14 Escape cascade and ghost focus: top-only plus inert;
- 16 and 17 partly: the drive;
- 18 disabled Confirm: §6;
- 21 sell-button comment; 22 select comment.
5. FINDINGS SKIPPED OR ONLY PARTLY CLOSED, and why:
- 5 and 12 (implicit submission on withdraw and close-account): task A8j, a separate change.
- 15 (admin retry queue: Cancel's focused node is reused as Yes). Outside the touch list, and admin pages mount the guard only through a Modal, which retry-controls has none of. Recommend mounting <KeyGuard /> in src/app/admin/layout.tsx or the root layout, and fixing retry-controls.tsx. The guard would catch only the HELD repeat; the fresh second Enter needs the retry-controls fix.
- 19 (feedback-law 7.5) and 20 (red twin anchors outside test:red-anchors): outside the touch list.
- 17: case F cannot be edited (its lines carry backslashes).
- 16: drive runs under webkit and firefox not added, and the drive is still outside predeploy (the coordinator's call).
- 4's dial-side `if (e.repeat)` and finding 14's 'clear lockedQuote on cancel' (both conviction-dial.tsx): not needed now (the guard catches the repeat, and the ghost is inert), but cheap defence in depth if the coordinator wants it.
6. STALE COMMENTS OUTSIDE THE TOUCH LIST, now made untrue:
- src/components/layout/notifications-panel.tsx:372-376 says <Modal> guards only Shift+Tab; it now guards both directions.
- src/components/updown/updown-card.tsx:985-993 (UD-16) says the article has role='link'. It has no role, and the wrapper's Enter/Space stopPropagation no longer starves anything. Narrowing it is optional.
7. OTHER DRIVES. Anything that presses Enter or Space inside a dialog less than 400 ms after it takes focus will now see the key swallowed. Not in predeploy, but check if run: scripts/betting-abuse-resistance-e2e.mjs, place-bet-adversarial-e2e.mjs, live-place-bet.mjs, dial-lock-verify.mjs, glitch-hunter.mjs, markets-retest.mjs. qa:live (in predeploy) presses Enter only in the dial's stake box with no dialog open, so it is unaffected.
8. DRIVE TIMING NOTES:
- SL depends on the seal's 7 s dwell outlasting the 10 s quote lapse. The seal is opened about 5.5 s into the quote, leaving about 2.5 s of margin; if a slow dev box misses it, raise the 4900 ms wait.
- The SL locator for the bet confirm is a CSS locator (`:not([aria-hidden=true])`), so the seal's aria-modal cannot hide the confirm from Playwright's role queries.
- The UD cases seed and arm Up & Down right before UD1, not at the start of the section, so the 3-minute round is still open when they run.
- Bet and sale counting uses page.route on next-action POSTs (bodies carrying 'idempotencyKey' or 'positionId'), installed only for the new section.
9. RECORDS (VODACOM-PLAN etc.) are not written here; they are the coordinator's. Facts worth recording:
- ARMING_MS=400 and why (modal-stack.ts);
- FOCUS_TRIES=10;
- the three pinned press readers (pressReaderAllowed);
- the key guard is the one place the held-key rule runs first, with Modal's line kept as a second line of defence because the pipeline cannot remove it.

## Drive cases (scripts/qa-enter-where-pressed.mjs new A8i-2 section)
1. 0b (fixture): ARMING_MS is read from src/lib/modal-stack.ts and must be a number. The drive waits ARMED_MS = ARMING_MS + 200 = 600 ms wherever it means a press to count. openBet and openSell were raised from 200 ms to ARMED_MS, and so was H's wait after the seal (was 500 ms).
2. 0c (fixture and positive control): fresh market, open the bet confirm by its Place button, wait out the beat, press Enter on Confirm. Expected: exactly one bet request and the receipt. This gives the section its own ticket, because J sold the drive's first. Passes on both trees.
3. K1 (proven red 2026-10-07): /positions, open the Sell confirm by click, Tab to "Keep position", hold Enter (1 press + 20 repeats 35 ms apart). Expected: the confirm closes and stays closed, at least 8 repeats reached the page (init-script recorder at window capture), 0 sale requests, wallet unchanged. Control on 23f762f4: the repeats land on "Sell now" after the close and the confirm reopens, so FAIL.
4. K2: market page, open the bet confirm, Tab to Cancel (btn-ghost), hold Enter. Expected: it closes and stays closed, at least 8 repeats, 0 bet requests, wallet unchanged. Control on 23f762f4: the repeats press "Place YES" (focus was given back there) and the confirm reopens, so FAIL.
5. W2 (proven red 2026-10-07): /positions, open the Sell confirm, open the win seal over it (50pick:celebrate), wait out its beat, Enter, then Enter 60 ms later. Expected: focus was in the seal; the seal closes; the Sell confirm stays open; 0 sale requests; wallet unchanged. Mechanism: focus goes back to Uza and the uncovered confirm is armed for 400 ms, so the second Enter is swallowed. Control on 23f762f4: the second Enter lands on Uza and sells, so FAIL.
6. ESC: Sell confirm, win seal over it, one Escape. Expected: only the seal closes, the Sell confirm stays open with focus inside it ("Cash out"), 0 sale requests. Control on 23f762f4: both dialogs close on one Escape, so FAIL.
7. DD: market page, focus the dial (role=slider), Enter, then Enter 100 ms later. Expected: the confirm is open, no receipt, 0 bet requests, wallet unchanged. Mechanism: Confirm takes focus at +30 ms and is armed until +430 ms. Control on 23f762f4: the second Enter lands on Confirm and places the bet, so FAIL.
8. SL: market page, open the bet confirm, wait about 4.9 s, open the win seal over it, then wait for the confirm's 10 s quote to lapse UNDER the seal (CSS locator that ignores the aria-hidden ghost). Then Enter, and Enter 60 ms later. Expected: the confirm was live under the seal; focus stayed in the seal through the lapse; the seal closes; no confirm reopens; 0 bet requests; wallet unchanged. Mechanism: the lapsing confirm moves nobody's focus and hands its way back to the seal; the seal's close puts focus on the Place button and arms it, so the second Enter is swallowed. Control on 23f762f4: the lapse sends focus to the Place button behind the seal (inSeal false), the first Enter opens a new confirm under the seal and the second places the bet, so FAIL.
9. UD1: seed Up & Down (POST /api/dev-test/updown-seed {durations:[3], feedProvider:"mock-bars"}, then POST /api/dev-test/updown-advance; fixture 0d needs both 2xx). Then /updown, focus the first enabled board-card UP (.ud-act button.btn-yes), hold Enter. Expected: at least 8 repeats reached the page, exactly 1 bet request, wallet down by exactly the stake read from UP's aria-label. Control on 23f762f4: every repeat bets, and the UD-16 wrapper starves the receipt's rule, so many bets, FAIL.
10. UD2: /updown, tap UP once (one bet, Ali's tap rule), wait for the receipt ("Keep playing") plus its beat; focus must be on "Keep playing". Hold Enter. Expected: the receipt closes, at least 8 repeats, NO further bet request (only the tap's), wallet down by exactly one stake. Control on 23f762f4: the first Enter closes the receipt, focus goes back to UP, and the repeats bet, so FAIL.
11. Today's cases are kept. C and D (held on the dial) and I (Enter held on Sell) now also require at least one repeat recorded inside a dialog: finding 17's "the repeats really reached the dialog". H now also requires the Sell confirm still open under the closed seal. On 23f762f4 all of these still pass, and A B C D F G H I still fail on the tree before A8i.
