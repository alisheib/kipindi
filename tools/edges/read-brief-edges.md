# Reading the journey's EDGE-SCENARIO tiles (M9, vodacom-visual 90cb52ea) — the brief

The owner (Ali): *"only perfect visual and logical results are accepted, nothing mid is accepted … visual perfection
is above anything; Vodacom are very critical"* and *"scenarios expected and not expected"*. These tiles are the
unexpected ones: a player on a break, a self-excluded player, the longest name and title, slow loading, not-found pages,
odd viewports, enlarged text, offline, an empty wallet. A reviewer at Vodacom tries exactly these.

## First, read the general rules
Read `{S}/visual/read-brief-r2.md` completely: how to measure (PowerShell System.Drawing — never estimate a position you
can measure), what counts as a defect, what is known and by design, and how to report. Everything there holds here.
Then read `{S}/visual/read-brief-r4-fixes.md` for what round 3/4 changed (so you do not report a fix as a defect).

## What is different about these tiles
- Every tile has a LOG ENTRY in `{TILES}/qa-journey-edges.json` (`entries`, `kind: "tile"`, matched by `file`). Read the
  entry BEFORE judging the tile: `expect` (what it SHOULD show), `asked` / `landed` (the address and where it ended),
  `status` and redirects, `h1`, the header's state (capsule words, gold pill, Ingia/Jisajili, the lit tab), live
  regions on screen (alerts, toasts, the offline banner), any Next.js error overlay, page and console errors, and the
  `overflow` probe and `flags`. The log's `plan` says how each scenario was reached (all through the real UI).
- **Logic counts as much as pixels.** A tile that looks fine but shows the wrong thing for its state is a finding:
  - **s1-break** (a player on a cooling-off break, signed back in): NO invitation to deposit or bet anywhere — no
    "Weka pesa"/"Deposit" pill or button in the header, the Wallet, the hub, the bar; no live YES/NO buy controls that
    would let a stake start; no promotions/cashback/bonus offer (promoSuppressed). Where the break is explained, its end
    time must be stated and right. Withdrawing their own money must remain possible.
  - **s2-selfexclude**: signed out; every gated page lands on sign-in; the sign-in refusal says why (excluded, until
    when) in the tile's language; nothing invites them to deposit or bet as if signed in; no leftover signed-in header.
  - **s3-longname** (40 characters: multi-word Swahili, one unbroken 40-letter word, 40 CJK): the name never leaves
    its box, never pushes a control off-screen, never overlaps; the field holds exactly 40 (the log notes the typed
    excess). A broken word must break cleanly (no single orphan letter alone on a line).
  - **s4-longtitle**: the longest Swahili title whole and readable on `/`, `/markets` and its page — no clipped line,
    no ellipsis that hides the question's meaning without a way to read it, no widow of one short word.
  - **s5-slow3g**: the mid-load frame must be a calm skeleton (shapes where content will be, the header whole), never a
    blank page, a flash of unstyled text, a layout that will jump, or English on a Swahili/Chinese page. Compare the
    mid-load and loaded tiles of the same cell: the loaded content should land where the skeleton promised.
  - **s6-notfound**: a proper not-found page in the tile's language, the journey shell intact (header, tabs), a way back.
  - **s7-viewports** (740×360 landscape phone, 768×1024, 1024×768): nothing cut, nothing under the bottom tabs or the
    header, the Needle/chat bubble not over content, rows not stretched absurdly.
  - **s8-text130** (root font 130% at 360/390): nothing clipped or overlapping, no control off-screen, tap targets whole.
  - **s9-offline**: an offline message that is true and in the tile's language; nothing pretends an action succeeded;
    back online, the message goes and the page works.
  - **s10-tzs0**: TZS 0 shown as money ("TZS 0", mono figure), the deposit invitation correct for an empty wallet, no
    "paid to you" or negative or NaN figure, the deposit page whole at 320/360.
- The `overflow` probe in the log is evidence, not the verdict: if it lists an element past the edge, find it on the
  tile and say whether a person sees a cut (a finding) or not (a doubt, with why).
- A BLOCKED entry is not a tile; list every BLOCKED entry of your range with its reason in DOUBTS (a blocked cell is a
  hole in the proof).

## Known and by design (do not report these as new)
- The live market data, prices and countdowns differ between runs; BTC ~$2,896 is this PC's stub price feed.
- "masaa 1 yamebaki" (Swahili singular) is held for S12; "NDIO 67%" beside "INAELEKEA NDIYO" is S12's.
- English "Dev fixture —" notifications are fixture data.
- The staff preview strip at the top is staff-only (players never see it); still report anything it covers that a
  player would see differently.
- The owner items in `{S}/visual/owner-items.md` (read its list): note a tile that shows one, but it is not a new finding.

## Your report (final message, nothing else)
1. Tiles opened (must equal the number you were given) and BLOCKED entries in your range.
2. FINDINGS, most visible first: `tile · what · where (pixel box) · how measured · which rule` — LOGIC findings marked
   **LOGIC**.
3. DOUBTS (with what would settle each).
