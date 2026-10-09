# WP12 turn C — the 333 tiles, read one by one (8 readers, 2026-10-08), and what each finding came to

## Fixed (branch, proved in turn H, then live)
- /profile/responsible-gambling failed to hydrate on every load (the Field's bounds through a lazy-wrapped child) — `2b98b99e`.
- Ticket cards (journey + classic /positions), the market page, the resolution panel, RG, watchlist, deposit, sessions,
  performance: dates in ENGLISH month words for sw and zh ("Imewekwa 8 Oct") — onto eat-day's localized formatters.
- The frozen-wallet notice on the signed-in hero drew no box (its ground = the hero's ground) — given its edge.
- The rail's rightmost tab lost its focus ring off-screen at 390 — the ring sits inside the slot.
- The hub card's first row lost its ring's top corners to the card's radius — end rows take the card's curve.
- The hub's Needle row a size smaller than its siblings — body size.
- "Airtel Money" / "Mixx by Yas" broken across lines in the hero's wallet list — a name never breaks.
- The withdraw page's "Inapatikana TZS 258,208" in the display face — `.amount` (§M4), the only such amount on a player page.
- qa:journey-shell §6 read PASS over the cut-off rail ring: every focus cell now also needs the ring's outer box on the
  screen (FOCUS_PROBE.onScreen; its control on a static page: +2px at the edge reads off, -2px on).
- The agent application's referee refusals in English (`a042dc65`, already live).

## Held for S12 (a correction to a live word: VODACOM-PLAN §0h point 3)
- Swahili "masaa 1 yamebaki" (a colloquial plural, and plural agreement for one) — "saa 1 imebaki" / "saa 3 zimebaki",
  and the singular for siku and dakika: S4-COPY-AUDIT "Found 2026-10-08" (`bb9c951d`), the formatter's singular
  templates on branch `vodacom-s12-timeleft`.

## Recorded, not changed now (and why)
- sw 320: the featured card's category chip splits its icon from its label when the top row wraps; sw 360-412: the time
  left drops to its own line. Needs the shared card's markup regrouped (pinned by several suites); the shorter
  "saa 1 imebaki" removes part of it. Next card pass.
- sw "Pendekeza na upate zawadi" wraps at 390 beside its INAKUJA badge (hub); guest "Msaada" subtitle wraps at 320/360.
- Ticket payout cell "When the result is / in" wraps at en 320/390; empty-state widows ("hapa." / "here." alone); zh
  "200 / 毫米" in a market title (data).
- The two-column hub at 1024+ pairs cards by row, leaving bands under the shorter card (layout choice to revisit).
- Channels panel: its "×" sits ~14px below the title's line; the panel covers the page's top while open.
- Gold beyond the brief's shorthand (home stat band, won payout, agent fee, tier names): `test:gold-is-money` is the
  rule and is green — the brief's "only a live balance and the pill" was a simplification.

## Checked and not a bug
- "Held capsule 3px from the edge" (089/094/098): measured — its right edge is x=373, as every capsule's.
- Player's Matokeo empty while the guest's lists 6: the archive is cached 5 minutes by design (TERMINAL_TTL_MS); the
  drive's warm-up cached it before the portfolio settled.
- No Needle / chat bubble on the journey's own pages, the Needle on the left for staff: WP7's stand-down rule and a
  persisted drag position.
- Up & Down "BITCOIN —" and no round tiles: this PC's price feed published no open price during the run.
