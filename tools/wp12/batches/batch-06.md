# Brief for a tile-reading agent (qa:journey-shell, WP12)

You read real-browser viewport tiles of 50pick (a Tanzanian real-money prediction market; trilingual sw/en/zh; one dark
royal theme) and report what LOOKS wrong. A machine already asserted the structure (which page, the chrome present, no
control past the viewport edge, the active tab, focus rings measured, the counts): your job is what it cannot see.

Tiles: 41 files, listed at the end (PNG, read with the Read tool, every one, in the order of their number). File name:
`<seq>--<section>--<route>--<viewer>--<state>--<locale>--<width>.png`. A name ending `--WRONG-PAGE` is already a
failure; say what page it shows instead.

Sections you have: tickets. What each is for (from scripts/qa-journey-shell.mjs's header):
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


## The 41 tiles, in order
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\211--tickets--positions-open--player--open--sw--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\212--tickets--positions-open--player--open--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\213--tickets--positions-open--player--open--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\214--tickets--positions-open--player--open--en--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\215--tickets--positions-open--player--open--en--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\216--tickets--positions-open--player--open--en--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\217--tickets--positions-open--player--open--zh--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\218--tickets--positions-open--player--open--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\219--tickets--positions-open--player--open--zh--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\220--tickets--positions-settled--player--settled--sw--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\221--tickets--positions-settled--player--settled--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\222--tickets--positions-settled--player--settled--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\223--tickets--positions-settled--player--settled--en--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\224--tickets--positions-settled--player--settled--en--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\225--tickets--positions-settled--player--settled--en--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\226--tickets--positions-settled--player--settled--zh--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\227--tickets--positions-settled--player--settled--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\228--tickets--positions-settled--player--settled--zh--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\229--tickets--positions-win--player--won--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\230--tickets--positions-loss--player--lost--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\231--tickets--updown-history--player--switch--sw--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\232--tickets--updown-history--player--switch--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\233--tickets--updown-history--player--switch--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\234--tickets--updown-history--player--switch--en--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\235--tickets--updown-history--player--switch--en--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\236--tickets--updown-history--player--switch--en--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\237--tickets--updown-history--player--switch--zh--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\238--tickets--updown-history--player--switch--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\239--tickets--updown-history--player--switch--zh--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\240--tickets--positions--new-player--empty--sw--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\241--tickets--positions--new-player--empty--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\242--tickets--positions--new-player--empty--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\243--tickets--positions--new-player--empty--en--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\244--tickets--positions--new-player--empty--en--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\245--tickets--positions--new-player--empty--en--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\246--tickets--positions--new-player--empty--zh--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\247--tickets--positions--new-player--empty--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\248--tickets--positions--new-player--empty--zh--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\249--tickets--positions-win--new-player--empty-won--sw--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\250--tickets--positions-win--new-player--empty-won--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\251--tickets--positions-win--new-player--empty-won--sw--1280.png
