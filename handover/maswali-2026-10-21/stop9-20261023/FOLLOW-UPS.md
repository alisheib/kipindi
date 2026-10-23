# Maswali Millionea — the follow-up list after the development closed (2026-10-23)

Everything below is OUTSIDE what shipped. None blocks the launch; each is a polish or a later build. Sources: the lanes'
final reports (HUB-2B, FLOW, R3-2B, HEADER-1024, S6-SHIP) and Ali's answers of 2026-10-23 (COMPLIANCE-DECISIONS § "2026-10-23
· Maswali Millionea — Ali's launch-gate answers …").

## Ali's choices (later builds)
- **QL.1** — the question limits (no two questions on one event; at most 4 from one competition) need a question's event
  and competition as fields; Trading keeps them by hand until then (the admin guide's B1). Build after the first week.
  FAILURE-INVENTORY QL.1 has the plan (two nullable fields, an additive migration, the builder, `openProblems`).
- **Agent terms** — `claude/maswali-agent-terms` (`b7a432925`) goes live with the first public week (merge with history;
  re-pin D19a if squashed). Then tick MASWALI-PLAN §6.1 line 10.
- **§6.1 line 7's last sub-items** — the measures view's launch date; the Vodacom lane's note in VODACOM-PLAN §0.

## Unshipped lane work (kept on its branch, never verified)
- `claude/maswali-s6-notices` `7b541b891` — S6-NOTICES 1–6 + a WIP: M-2 (a letter the provider refused three times is
  sent by no run again; the cap of 3 and the DOWN gate) and L-2 to L-4 (the integrity card's one true sentence per cause).
- `claude/maswali-s6-lint` `6f3bb08fd` — the claims lint lane's last WIP.

## The hub (HUB-2B's notes)
- Notices that end a line on a connective or split a unit (NoticeBar and two bodies — not one rule in one place):
  moved-close "…baada ya"/"kufunga." (768) and "…Kila" (320); zh "（原为"/"18:00）" (360); final-ahead "…ya mwisho
  ya", en "It opens"/"7 Dec.", zh "…于"/"2026年12月7日开放。"; zh after-notice "第"/"50周"; the staff banner
  "…kwa"/"watumishi tu." (360); noweek "pamoja na"/"hash…"; retired: two lines start "ya mwisho", en "…was the"/"final
  week"; the voided notice has no separator between its clauses.
- Ledger and jackpot: "Jumla"/"ya bwawa" at sw 320/360; the carry line "…kutoka"/"Wiki 47 itakapokamilika"; "angalau"
  and "13% wakati wa malipo" set in the mono figure face; the en final rule ends a line on "this" and keeps the phone
  measure at 1280.
- Page ends: a blank band before the footer (noweek ~240–360px, retired ~430–600px, ~100px elsewhere); noweek en 1280
  body one 740px line (needs a measure); the paused notice dashed like the empty state.
- Layout: the reserve box's columns sit 11–17px inside the main list's; the reserve rows' "RESULT · YES" chip wraps at
  360 (+40px a row); a 90px hole in the 768 preview's right column; the result chip under the time at 1280.
- Strip and chips: the current dot on "Events/Matukio" in objections/settling; "WIKI 48" + "WIKI INABATILISHWA"; the
  chips' T-gap ("INABAT ILISHWA"); every state chip the same blue.
- Words and times: "Maswali ya wiki" vs "…ya Wiki 49" by state; LAST WEEK "fee TZS 0"; EAT shown on some times, not
  others; zh "下一事件周六 09:00" has no separator; zh half-width colons ("剩余有效备选题: 5/5").
- The closing state's countdown pill not in the tiles (test timing or a real gap — to check).
- The drawing: the jackpot figure's bar is 57–65px longer than "TZS 1,000,000".
- Runner reds left: WebKit ghost en@320 ledger 16–17px; moved zh@768 M1 (the ledger 30px under the head); WebKit's
  sticky header (H2, the pinned read) is a Playwright-WebKit limit.

## Other surfaces (from the hub lane's read)
- REGISTER: the proof hashes wrap 31+31+2 at 320; the proof note "…kabla ya"/"tokeo la", en "…its"/"fingerprint".
- TICKETS: the free-cancel line ends on "·"; "Matokeo" alone at 320.
- PLATFORM: the follow card "…yetu ya"/"WhatsApp"; the chat bubble (D15).
- SHELL / footer: the rail's "Juu na"/"Chini" (two lines by rule, R3); the footer's wording differs between shells; two
  top edges; the "RT P" gap; zh footer headings letter-spaced; the zh licence line's half-width colon; the top bar not
  opaque at its top edge; a break drops "Millionea" from the nav.
- NoticeBar aligned to the header grid, not the content column, at 1280.
- DOORS: the CTA's "·" spacing; the guest door says "Sign in to buy" but its first button is "Sign up".

## Notices and mail
- The Millionea e-mail subjects still put the week first (the bell's titles lead with the event since FLOW 15).
- HW7 (Tiketi zangu's slip door shown again to a held wallet) was proven by its static red, not re-planted live.

## Left open at the push (HUB 28)
- The pinned read at 1024: 31–39 faint rows (worst 3–8 of 255) at x≈991 under the pair's foot — most likely the fixed
  needle yielding to the column, not show-through; the confirming run (fixed controls hidden) did not complete.
- The zh final rule's balance at zh 320/360 ([199,194,91]) returned with the revert to the rules page's sentence; a fix
  needs a rules-page wording change (a rules version) or a hub layout answer.
