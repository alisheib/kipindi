- **A8i-2 — a key held down presses once, wherever it is; nothing behind the top dialog takes a key; an uncovered money
  dialog lands on its way out (LIVE `{SHA}`, 2026-10-07, for every player, both looks).** What it closes, each proven on
  live main `9352de7c` by the drive's control run on OMEGA-COMPILE01 (a fresh in-memory server, 15 pass, 9 fail, none
  blocked): W2 — the second Enter 60 ms after the seal's SOLD the ticket; SQ — two win seals queued and Enter mashed:
  sold; K1/K2 — Enter held on "Hifadhi nafasi"/Cancel reopened the confirm under the finger; ESC — one Escape closed the
  seal AND the Sell confirm; DD — Enter, Enter 100 ms apart on the dial placed the bet; SL — a quote lapsing under the
  seal sent focus behind it, and Enter, Enter placed a bet; UD1 — Enter held on Up & Down's UP placed 13 bets; UD2 —
  Enter held on the receipt's "Keep playing" placed 13 more. **How:** one app-wide key guard
  (`src/components/ui/key-guard.tsx`: a window capture listener for keydown and keyup, installed by AppShell and by
  every Modal) decides by `swallowsKey` (`src/lib/modal-stack.ts`): a held repeat that would press something, anywhere;
  an Enter or Space behind the top dialog; a fresh press in the 400 ms arming beat after a dialog takes focus or hands it
  back; and a Space presses only where it went down. `modal-stack.ts` keeps the page's open dialogs (by zIndex, then open
  order); `leaveLayer` decides where focus goes when one closes — never behind the dialog now on top; an uncovered money
  dialog on its WAY OUT (`safeFocus`: "Ghairi", "Hifadhi nafasi", ConfirmModal's Cancel); whatever takes focus armed; a
  seal opened with focus on the page arms nothing. Modal joins the stack in a layout effect (a timer-opened seal is on it
  from its first frame), answers keys only while on top, closes once per Escape, leaves Escape to an open list, and its
  leaving ghost is inert. Space on the bet dial counts as a press. **The draft** (ALI-BLADE15, never run) was reviewed
  here in three lenses — correctness and money, change-set mechanics, gates and proof — and changed by what they
  confirmed: the way out (the correctness lens: two queued seals, the second drawn late on a slow phone, left an Enter
  meant for it landing on the sell button after its beat), the layout effect, one Escape one dialog, Space on the dial,
  the page itself never armed, the suite made to RUN the guard and `leaveLayer` (the proof and mechanics lenses: five of
  six wiring deletions had passed it), the census closed on inline handlers, namespace imports, parameter names and every
  key event named in `src/` (2.8, which found the needle's own `on(hit, "keydown")` the census had never seen — an
  element listener, no money), 2.6 widened to every file that draws a dialog; Modal's dead held-key line and the refuted
  quote-clock reset dropped. **Guard:** `test:enter-where-pressed` (predeploy) — it builds `key-guard.tsx` and
  `leaveLayer` from their text and fires keys through them (4.4, 5.9) — and `red:enter-where-pressed`, 103 plants, 103
  caught. **Proof (OMEGA-COMPILE01):** typecheck; the structural suites (journey-shell, ui-consistency, hooks-order,
  select-keyboard, feedback-law, source-bytes, client-graph-safe, shell-boundary, layout-staleness) green, stacking 6.1
  and red-anchors ×2 main's own; `qa:enter-where-pressed` on the new tree 24/24 (W2 lands on "Keep position" and sells
  nothing; SQ shows both seals and sells nothing; UD1 places exactly one bet; E and J are the bet and sale counters'
  positive controls), and on live main 15 pass / 9 fail as above; {D12}; {ENGINES}; {BATTERY}; production read back
  ({PROD}). **Served bytes for a classic viewer:** no markup, word or class changes — a `ref` and the `safeFocus` prop are
  not drawn, and `inert` appears only on the client-only exit ghost; the client code of Modal, the three money confirms,
  the dropdown, the Sell button's comment and the shell's key guard changes (behaviour only). **Owed (recorded, not
  run):** an iPad hardware keyboard's repeats; reduced motion; a retryable failure under the seal; the seal over the Up &
  Down receipt; a BUSY reply with Enter held; an officer's ConfirmModal and Escape on a Select inside a dialog in a real
  browser; the drive in predeploy (it needs a server).
