# Round 3 — what changed since the tiles you may have seen, and what each fix must look like now

Every item below was a finding of round 2, fixed on the branch these tiles were taken from. For EACH one that your
tiles show, say VERIFIED (with the measurement) or NOT FIXED / FIXED WRONG (with the measurement). Measure with
GetPixel as the main brief says; a fix you did not measure is not verified.

## The page's edge (the owner's rule: the header's edge is the page's edge at every width)
- Journey header (the 56px bar with "50pick", the balance capsule, "+ Weka pesa"/Ingia): its content starts and ends
  16px from the viewport edges below 1024, and 32px from them at 1024 and wider (at 1280+ the row is centred at
  max 1280, so measure against the row). The first card/heading/hero text of the page below starts at the SAME x.
  Any difference > 1px between header edge and page edge is a finding.
- Journey `/` (home): the hero ("50pick" claim, h1, trust lines, featured card) and every band below it (proof figures,
  the board, how it works, topics, Up & Down, trust) start at 16px below 1024 and 32px from 1024 — the header's edge.
  (Classic `/` keeps its old 24px from 768: that is deliberate, do not report it.)

## Cards, lists, filters (G1)
- Featured market card, Swahili, 320–412: the top row shows MUBASHARA and MPYA on line 1; line 2 holds the weather
  glyph + "HALI YA HEWA" on the LEFT and the time left ("masaa 1 yamebaki") on the RIGHT — never the glyph alone at a
  line end, never the label split from its glyph. en/zh and 768+: one line.
- Chinese titles never break between a number and the character after it: "200毫米", "8月", "10万" stay whole.
- Filter chip strips that scroll: once scrolled off their start the leading edge FADES (no letter cut hard at the
  edge); the trailing fade ends ~8px inside the strip, so the next control (a PANGA pill, an "Arifa 25" label) has
  clear background before it. A strip with nothing hidden has no fade at all.
- Filter rows with dividers (1024+): no 1px divider ever ends a line or starts one; a wrapped line starts flush.
- The Needle dial (the round button at the right edge) never rests over text — on /markets at 390 the stat line
  ("… katika mchezo") reads in full.
- State pills on ticket cards (IMEBATILISHWA, INASUBIRI, …): all 18px tall; neighbouring cards' titles line up.
- The live carousel's caption ("LILILO NA SHAKA ZAIDI"): never truncated with "…"; it wraps on two balanced lines at
  320–412 in Swahili, one line from 768.

## Money pages, sheet, nav (G4)
- Deposit and withdraw forms: the form card's first line (e.g. "CHAGUA NJIA YA KULIPA", "MAHALI") sits ~27px below
  the card's top border below 1024 and ~35px from 1024 — the same as the hero card above it, and equal to the side
  padding rhythm. 51px is the old defect.
- Legal pages' nav: the active item's label starts at the same x as every inactive label (±0.5px).
- Journey Wallet sheet (opened from the balance capsule) on a HELD (frozen) wallet: the figure is plain ink (near
  white, ~#F5F8FF), not gold — the same ink as the capsule.
- Journey Wallet sheet for a player on a BREAK (edge tiles only): Toa pesa alone at the full width, no Weka pesa.

## Tiketi zangu, empty states, sheets (G3)
- Ticket cards: the question is WHOLE (never "…" or a cut line), its lines balanced; the stake and payout row splits
  2 : 3, so "Matokeo yakitoka" is one line at every width in sw, "When the / result is in" a balanced pair only at
  en 320–360. At 768+ every card in a row has the SAME height, 16px gaps everywhere, the Sell rows level.
- Empty states: no last line of one word ("hapa.", "here."), no line starting with "—", no zh character split from
  its word ("显 / 示"). On Tiketi zangu the Up & Down and Maswali empty boxes are the same width at 1280.
- The guest tickets sheet title (en 320): "Sign in to see / your tickets", never "tickets" alone.
- The market page's sign-in card (sw 320–390): "Weka dau lako / kwenye soko hili", never "hili" alone; the zh note
  never splits 手机号.

## Akaunti hub, profile, footer, channels panel (G2)
- Hub rows: "Pendekeza na upate zawadi" on one line at sw 360/390 with INAKUJA under it (row 56px); the guest
  "Msaada" subtitle never leaves one word alone ("Maswali ya kawaida · Simu" / "Barua pepe" at 320–360), and no dot
  sits at a line's start or end.
- Hub at 1024+: two columns of cards, 16px between cards everywhere — no tall empty band under a shorter card. The
  column bottoms may differ (by design).
- Footer at 768/1024: "Pendekeza masoko / upate pesa INAKUJA" — the COMING SOON pill never alone on a line.
- /profile/invite: "MARAFIKI ZAKO" ~27–28px below the buttons, 12px above its list.
- The zh card-size hint never splits 内容; the guest lead never ends on one word.
- Channels panel: the × centred on the title's line; title → first row = row → row (46px centre to centre).
- Badge names on /profile read "First Prediction · Ubashiri wa Kwanza" in every locale: KNOWN (data, S12) — do not
  report.
