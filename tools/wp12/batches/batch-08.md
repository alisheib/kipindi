# Brief for a tile-reading agent (qa:journey-shell, WP12)

You read real-browser viewport tiles of 50pick (a Tanzanian real-money prediction market; trilingual sw/en/zh; one dark
royal theme) and report what LOOKS wrong. A machine already asserted the structure (which page, the chrome present, no
control past the viewport edge, the active tab, focus rings measured, the counts): your job is what it cannot see.

Tiles: 26 files, listed at the end (PNG, read with the Read tool, every one, in the order of their number). File name:
`<seq>--<section>--<route>--<viewer>--<state>--<locale>--<width>.png`. A name ending `--WRONG-PAGE` is already a
failure; say what page it shows instead.

Sections you have: hub, overlays, viewer, emailbar, kyc. What each is for (from scripts/qa-journey-shell.mjs's header):
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


## The 26 tiles, in order
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\308--hub--account--staff--hub-top--en--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\309--hub--account--staff--hub-2--en--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\310--hub--account--staff--staff-card--zh--320.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\311--hub--account--staff--staff-card--zh--360.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\312--hub--account--staff--hub-top--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\313--hub--account--staff--hub-2--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\314--hub--account--staff--hub-3--zh--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\315--hub--account--staff--staff-card--zh--1024.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\316--hub--account--staff--hub-top--zh--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\317--hub--account--staff--hub-2--zh--1280.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\318--overlays--root--player--overlays-off--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\319--overlays--positions--player--overlays-off--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\320--overlays--help--player--overlays-on--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\321--overlays--account--player--overlays-on--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\322--overlays--root--guest--overlays-off--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\323--overlays--help--guest--overlays-on--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\324--overlays--account--guest--overlays-on--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\325--viewer--account--A--before--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\326--viewer--results--A--ended--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\327--viewer--root--B--signed-in--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\328--viewer--account--B--signed-in--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\329--emailbar--root--player-unconfirmed--journey-no-bar--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\330--emailbar--root--player-unconfirmed--classic-no-bar--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\331--kyc--account--player-no-kyc--kyc-row--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\332--kyc--profile-kyc--player-no-kyc--active-tab--sw--390.png
C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\333--kyc--profile-kyc--player-no-kyc--active-tab--sw--1280.png
