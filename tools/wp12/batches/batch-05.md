# Brief for a tile-reading agent (qa:journey-shell, WP12)

You read real-browser viewport tiles of 50pick (a Tanzanian real-money prediction market; trilingual sw/en/zh; one dark
royal theme) and report what LOOKS wrong. A machine already asserted the structure (which page, the chrome present, no
control past the viewport edge, the active tab, focus rings measured, the counts): your job is what it cannot see.

Tiles: 54 files, listed at the end (PNG, read with the Read tool, every one, in the order of their number). File name:
`<seq>--<section>--<route>--<viewer>--<state>--<locale>--<width>.png`. A name ending `--WRONG-PAGE` is already a
failure; say what page it shows instead.

Sections you have: tabs. What each is for (from scripts/qa-journey-shell.mjs's header):
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


## The 54 tiles, in order
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\157--tabs--account--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\158--tabs--account--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\159--tabs--root--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\160--tabs--root--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\161--tabs--markets-id--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\162--tabs--markets-id--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\163--tabs--updown--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\164--tabs--updown--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\165--tabs--updown-history--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\166--tabs--updown-history--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\167--tabs--positions--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\168--tabs--positions--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\169--tabs--results--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\170--tabs--results--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\171--tabs--wallet--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\172--tabs--wallet--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\173--tabs--wallet-withdraw--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\174--tabs--wallet-withdraw--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\175--tabs--live--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\176--tabs--live--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\177--tabs--leaderboard--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\178--tabs--leaderboard--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\179--tabs--profile-responsible-gambling--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\180--tabs--profile-responsible-gambling--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\181--tabs--profile-invite--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\182--tabs--profile-invite--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\183--tabs--proposals--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\184--tabs--proposals--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\185--tabs--profile--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\186--tabs--profile--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\187--tabs--fairness--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\188--tabs--fairness--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\189--tabs--help--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\190--tabs--help--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\191--tabs--notifications--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\192--tabs--notifications--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\193--tabs--markets--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\194--tabs--markets--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\195--tabs--agent--player--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\196--tabs--agent--player--active-tab--sw--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\197--tabs--account--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\198--tabs--root--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\199--tabs--markets-id--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\200--tabs--updown--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\201--tabs--results--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\202--tabs--live--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\203--tabs--leaderboard--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\204--tabs--fairness--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\205--tabs--help--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\206--tabs--legal-responsible-gambling--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\207--tabs--legal-privacy--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\208--tabs--legal-aml--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\209--tabs--legal-terms--guest--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\210--tabs--legal-rules--guest--active-tab--sw--390.png
