# Reading list · LOCAL STATE frames, round R1 (diagnostic) — 360px Swahili, guest and signed-in player

Folder: `C:\50pick-ssd\kipindi-udv\.qa-shots\u43\r22-diag-360-sw\` + `index.json` (per phase: `shots[].cell`, `cardGeometry`,
`heldAction` clearance above the fixed bottom rail, `pulses`, `motionFrames`, `marketCards`).
Source: branch u43-seal at 84f127d4a on a local in-memory dev server; SYNTHETIC local prices (see the brief).
File names: `<phase>__<guest|player>-360-sw.png` (whole page) and `…__card<N>.png` (the Nth card cropped).
Phases: p1-open · p2-receipt (player's real bet receipt) · p3-youre-in (held stake) · p4-moved-up / p5-moved-down
(a planted confirmed read above / below the open) · p6-last30 (+ `__motion-*` frames: full-a/full-b two instants of
the urgency pulse, and the reduced / minimal / os-reduce tiers) · p7-locked · p8-closed (awaiting the result) ·
p9-settled (the demo stake was one-sided → refunded) · p10-handover (successor round) · p11-round-settled /
p11-round-successor (the round DETAIL pages) · p12-markets (+ market-live / -resolved / -one-sided / -void cases) ·
p13-gold-board (Gold board while its chain is stopped/closed).

## Must open
Every whole-page frame for both cells: p1-open, p3-youre-in (player only), p4-moved-up, p5-moved-down, p6-last30, p7-locked,
p8-closed, p9-settled, p10-handover, p11-round-settled, p11-round-successor, p12-markets, p12-market-live,
p12-market-resolved, p12-market-one-sided, p12-market-void, p13-gold-board; p2-receipt (player);
and the card0 crops of p1, p3, p6, p7, p8, p9, p10 for the player.
## May open
Every other crop and the five `p6-last30__guest-360-sw__motion-*.png` frames (the motion lens MUST open those).
