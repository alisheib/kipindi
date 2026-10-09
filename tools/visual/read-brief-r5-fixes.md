# Round 5 — what round 4 fixed, and what each fix must look like now

These tiles were taken on the branch after round 4's fixes (tiles-r5, commit 88ee1a42). Round 4's tiles are tiles-r4;
the diff overlays compare r5 against them. For EACH fix your tiles show: VERIFIED (with the measurement) or NOT FIXED /
FIXED WRONG (with the measurement). The fixes of rounds 2–3 (read-brief-r3-fixes.md, read-brief-r4-fixes.md) still hold
— a regression of one of them is a finding too. Every "after" below was COMPUTED from code and fonts, never seen in a
browser before these tiles: read them hard, and measure.

## Featured card and ticker (R4-A)
- sw 390 top row: the category ("UCHUMI") and the time left never sit ~9px apart as one phrase — either ≥ ~18px apart on
  one line, or the tail wraps to line 2 (category left, time right) as at 360. en, zh and 768+ unchanged.
- The no-bets pair ("Hakuna dau bado" / "Kuwa wa kwanza kutabiri"): centred between the pool bar and the YES/NO buttons
  within ~0.5px at every width (was 18 above / 28 below at 768–1280, 14 / 18 on phones). Card height unchanged.
- The featured pool reads "Bwawa TZS 10,800" / "Pool TZS 10,800" / "奖池 TZS 10,800": the label in the small step, the
  figure mono at 600 in the text ink (was 11px, dim, unlabelled).
- Journey ticker: after "MUBASHARA" / "LIVE" 16px of solid ground, then a 24px fade — no faded glyph touching the label
  (was "MUBASHARAsiku"); item 1 ~8px clear of the fade. Classic ticker unchanged.

## The Needle (R4-B)
- The dial never rests under or within ~glow+4 (~14–15px) of the chat bubble or its ring, shown or faded (zh 320 hub was
  overlapping: now ~y580, ≥15px from the bubble's ink). Landscape rests too.

## Journey bell (badge commit)
- The "25" badge's ring and glow clear the bell's dome by ≥1px (no red tint on the dome's shoulder); no rose glow on the
  journey's opaque bar (dark drop only). Classic bell unchanged (owner item).

## Filter bars and notifications (R4-C)
- A search box and its filter bar read as ONE band: around the box and its pills the gaps are the page's rung + 10 —
  /results ~34 · 12 · 34 (box → pills → sort → content; content ~31px higher than r4), notifications ~34 · 34 · 12 · 34,
  /markets ~35 · 12 · 12 · 34, Tiketi zangu 42 / 42 (was 42/44), Wallet 12 / 12. No 49–69px empty band anywhere.
- Chips → sort 12px; the selected chip's glow no longer touches the sort pill.
- /markets 1280: the divider between filter groups centred on the visible gap (~22 | 23, was 31 | 14).
- Notifications: titles keep "TZS 4,200" whole and in mono, breaking between clauses ("Soko limefutwa" / "TZS 4,200
  imerejeshwa"), never on the "·"; bodies end on two words ("pochi yako."), no widow; the ✓ / × controls centred on the
  icon plate (within ~0.5px).
- /results 390: the 4th lens past the strip's end is signalled by the 64px end ramp (by design, refuted in round 4).
- Tiketi zangu open tiles show their unread sign (capture fix); Up & Down chart tiles are no longer shot mid-fade.

## Up & Down, /live, the market page (R4-D)
- Up & Down chart: the price axis reads "$2,896.04" (grouped, with $), like the page; the axis ink is full (no fade).
- Chart controls: eyebrow → key → rail → style toggle → card: 12 / 12 / 12 (key on its own 14px line).
- Round page: the stake in mono (.amount); the × note and the ⓘ note hang their second lines at the same x (~811 at
  1280); the locked-side note 13px (was 10); a line opening on the quote stamp opens on a capital ("Imenukuliwa
  04:01:21 EAT"), lower case inside a sentence.
- /live: the three cards' rows level (the Up & Down chip and the bare label one box height); grid gutters 16px both ways
  (was 14); the bar caption ("INAELEKEA NDIO" etc.) centred on the bar's centre (within ~0.5px), upright (not italic).
- Market page: the star's ink gaps 25 | 25 (was 27 | 25); the title's first capital at the page edge (x132 at 1280, x16
  at 390 — was 2px inside).
- Tallies: "0 imetatuliwa · TZS 0 imekamilika" (sentence word, lower case); /positions' win-rate hint "3 imekamilika".
- /markets 390 count line: 12px under the sort pill, 12px over the hairline (bar 8px taller).

## Hub, profile, sheets, edges (R4-E)
- Hub card-size row: 56px tall like every hub row; glyph and switch both centred on the row (same y); "Ukubwa wa kadi"
  never split at 320 (the value drops under instead). At sw 360 the hint may take two whole sentences (73px row — known,
  S12 item); one line at sw 390+ and en/zh 360+.
- Hub Needle row: its glyph in the row family's ink and size (~like the globe glyph), not a half-ink 18px ring.
- Guest sheet ×: on the title's cap-band centre within ~0.5px at phones and 1280.
- Badge names stacked: "First Win" over "Ushindi wa Kwanza" — no line ends or opens on "·", "Kwanza" never alone.
- One content edge per column: the /profile stat strip, the RG help card, the RG sound card and the proposals notice
  start at the column's edge (x41 at 390, x165 at 1280); /profile AKAUNTI grid gaps 16px (was 12).
- /fairness: the step numerals at the heading's edge (x165–166), the words at x189.
- Wallet "Weka mipaka" link (journey): a rounded focus ring with ~7px air, no word moved.
- Agent stat hints balanced; the privacy version line keeps "Act 2022" together.
- Deposit methods at 1280: no empty third cell — five methods as 3 + 2 (the last two half-row each); phones two
  columns with a lone last tile spanning the row; withdraw 2×2 on phones, four across from 768.
- Journey capsule: caption, figure and delta centred in the reserved box (TZS 0 at 320 ~24 | 24, was 39 | 10).

## Classic parity (R4-F)
- The CLASSIC footer is main's (its proposals link NOT balanced — the pill may sit alone at 768/1024 for classic: owner
  item 13); the JOURNEY footer's link is balanced (no pill alone).

## Fixed AFTER these tiles (on the branch now; the next round shows them) — note, do not report as new
The offline page / offline banner (R4-G); the profile hero after a long name, the name editor, the board rows' "·" line
ends, titles' figures ("2026-27", "dakika 28:00"), the journey account menu (Needle row inset, "zawadi" widow, phone
mask, "Tiketi zangu" name, no gold), the toaster under the header, the home's tab title, the Wallet sheet doors at 320,
the featured card's hover watermark, receipt ids, the search band on /live, /updown/history, /profile/account (R4-H);
the not-found pages, zh centred punctuation, the market title vs its watermark at 768, the countdown labels' gold
(R4-K); and, still being built, the break / exclusion / auth / bet-dial items (R4-I) and loading states / route ghosts /
the header before hydration (R4-J). If a tile shows one of these, list it under "seen, already fixed after r5".
