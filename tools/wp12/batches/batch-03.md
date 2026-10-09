# Brief for a tile-reading agent (qa:journey-shell, WP12)

You read real-browser viewport tiles of 50pick (a Tanzanian real-money prediction market; trilingual sw/en/zh; one dark
royal theme) and report what LOOKS wrong. A machine already asserted the structure (which page, the chrome present, no
control past the viewport edge, the active tab, focus rings measured, the counts): your job is what it cannot see.

Tiles: 53 files, listed at the end (PNG, read with the Read tool, every one, in the order of their number). File name:
`<seq>--<section>--<route>--<viewer>--<state>--<locale>--<width>.png`. A name ending `--WRONG-PAGE` is already a
failure; say what page it shows instead.

Sections you have: header, sheet. What each is for (from scripts/qa-journey-shell.mjs's header):
- classic: a viewer WITHOUT a preview pass gets the classic chrome (top bar, bottom rail with the centre coin), no
  journey header, tabs or marks.
- header: the journey header for a guest (Ingia, Jisajili) and for a player: the captioned balance capsule ("Salio" over
  the figure; TZS 999,999 / 100,000 / compact 9.9M / 0; held = frozen word and no money door; masked = dots), the gold
  "+ Weka pesa" pill only where the wallet is not held and never on the deposit screen. Widths 320–1280.
- sheet: the guest's Tiketi zangu sheet (bottom sheet, its title, its two doors). wallet: the Wallet opened from the
  capsule ("Pochi", Weka pesa, Toa pesa). unread: the Akaunti tab's dot, the Arifa row's count badge.
- focus: a visible 2px ring on the focused control (inside the row, -2px, in a hub card).
- tabs: the four-slot rail (Maswali, Juu/Chini, Tiketi zangu, Akaunti) with exactly the right tab lit on each route.
- tickets: Tiketi zangu cards (open, settled, won, lost), empty states with their words and way back, the Maswali |
  Juu/Chini switch.
- hub: the Akaunti hub for a member, a guest and staff, walked screen by screen.
- overlays: the Needle, chat bubble and channels panel stand down on / and /positions for a pass-holder, appear on /help
  and /account. viewer: G1's shared phone (A's session ended, B signed in). emailbar: NO email-verify bar for either reader
  (journey or classic) — the bar was deleted by the owner's ruling of 2026-10-07; any bar in these two tiles is a
  finding. kyc: the Verify ID row, /profile/kyc.
- Also everywhere: no email-verify bar on any tile (deleted 2026-10-07), and any deposit minimum shown reads TZS 1,000
  (the old TZS 500 is a finding).

Rules to hold each tile to (DESIGN_AUTHORITY §K rule 8 and the kit):
- Nothing clipped, cut off, overlapping, or running past an edge; no text on two lines where one is designed (below 360
  only the rail's labels may wrap); no horizontal scroll.
- The right language everywhere in a tile (sw/en/zh as named; a market title may fall back to English — say so, don't fail
  it); no raw keys (like `journey.depositAction`), no "undefined", no "NaN", no empty boxes where words belong.
- Money: figures in the mono face, "TZS" never split from its number; gold ONLY on a live balance and the money pill;
  every hub money figure in neutral ink.
- Alignment and rhythm: rows, pips and labels line up; equal tracks on the rail; the sheet's grab handle centred; spacing
  consistent between siblings.
- The focus ring, where the cell is a focus cell: clearly visible, not cut off by a card's rounded corners.
- Nothing from the classic chrome in a journey tile, and nothing from the journey in a classic tile.

Report, concisely: (1) how many tiles you opened (must equal the files given); (2) FINDINGS — each with the tile's file
name, what is wrong, and where in the tile; (3) DOUBTS — things that might be wrong but you can't tell; (4) nothing else.
Do not edit any file. Do not run npm, servers or Playwright.


## The 53 tiles, in order
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\069--header--wallet-deposit--player--999999-deposit-screen--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\070--header--root--player--compact--sw--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\071--header--root--player--compact--sw--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\072--header--root--player--compact--en--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\073--header--root--player--compact--en--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\074--header--root--player--compact--zh--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\075--header--root--player--compact--zh--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\076--header--root--player--zero--sw--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\077--header--root--player--zero--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\078--header--root--player--zero--sw--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\079--header--root--player--zero--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\080--header--root--player--zero--en--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\081--header--root--player--zero--en--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\082--header--root--player--zero--en--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\083--header--root--player--zero--en--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\084--header--root--player--zero--zh--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\085--header--root--player--zero--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\086--header--root--player--zero--zh--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\087--header--root--player--zero--zh--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\088--header--root--player--held--sw--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\089--header--root--player--held--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\090--header--root--player--held--sw--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\091--header--root--player--held--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\092--header--root--player--held-wallet--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\093--header--root--player--held--en--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\094--header--root--player--held--en--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\095--header--root--player--held--en--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\096--header--root--player--held--en--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\097--header--root--player--held--zh--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\098--header--root--player--held--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\099--header--root--player--held--zh--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\100--header--root--player--held--zh--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\101--header--root--player--masked--sw--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\102--header--root--player--masked--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\103--header--root--player--masked--sw--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\104--header--root--player--masked--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\105--header--root--player--masked--en--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\106--header--root--player--masked--en--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\107--header--root--player--masked--en--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\108--header--root--player--masked--en--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\109--header--root--player--masked--zh--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\110--header--root--player--masked--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\111--header--root--player--masked--zh--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\112--header--root--player--masked--zh--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\113--sheet--root--guest--tickets-sheet--sw--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\114--sheet--root--guest--tickets-sheet--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\115--sheet--root--guest--tickets-sheet--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\116--sheet--root--guest--tickets-sheet--en--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\117--sheet--root--guest--tickets-sheet--en--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\118--sheet--root--guest--tickets-sheet--en--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\119--sheet--root--guest--tickets-sheet--zh--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\120--sheet--root--guest--tickets-sheet--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\121--sheet--root--guest--tickets-sheet--zh--1280.png
