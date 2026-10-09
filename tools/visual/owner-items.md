# Visual pass — items that are not mine to decide alone (collected 2026-10-08)

## Owner decisions (Ali)
1. Chat bubble vs keyboard focus (G4 item 4): `scroll-padding-bottom` reserves only the rail, so a Tab-focused control at
   the right edge can sit up to 36 of its 44px under the bubble. AA (2.4.11) holds, AAA (2.4.12) does not. The fix
   (~80+44+8+inset below 1024) moves every focus/anchor scroll on every page, classic included.
2. Classic capsule shows "100,000" without "TZS" below 640 (G4 item 7). Classic chrome is frozen for S6/S7; the
   journey capsule shows TZS at every width. Room exists at 390 (~90px free; TZS needs ~27).
3. Classic home's hero/bands sit 8px off the classic footer from 1024 (G5): left as is so classic viewers are served
   what they were; the journey's `/` is aligned (f85df686).
4. Classic bar has no break rule (shows the deposit pill during a break); the journey does not (S4) and its Wallet
   now matches (b88d1a75).
5. Type-scale work order (28 small-text sites, 6e4d4f0a) — earlier report.
6. The orphans suite's two landing-v3 Workflow files — earlier report.

7. Ticket payout words are drawn in mono (13.5px JetBrains Mono bold); the canvas (s4-9-tiketi-open) and §T6 draw
   them in Inter 14/600 (G3). A type decision, left as built.
8. The Akaunti hub at 1024+ now reads as two columns (cards no longer pair side by side), the fix for the 73px bands
   under shorter cards (G2) — a visible desktop layout change, reading order unchanged.

9. The home proof band's "PAID OUT TO PLAYERS" sums every confirmed payout and cash-out transaction, house-bot
   accounts' winnings included (platform-stats.ts → sumConfirmedByTypes, no user filter). What a public money figure
   counts is a ruling (R3-A, 2026-10-09). Unchanged.

10. The Needle's rest (R3-B, 08f045d8): beside a full-width card at 360–390 the tucked dial still lies over ~14px of
    the card's frame/padding (its visible half is 28–30px against a 16px gutter) — tier 1 of the new rest rule, E-400's.
    And players whose dial the resize bug stored on the LEFT keep it there until they throw it back (a bug-caused left
    cannot be told from a thrown one; no migration).

11. Leaderboard gold outside money (R3-C): the podium's #1 gold ring and crown, and the HotChip's gold flame
    (leaderboard/page.tsx ~512, 532–560) — against Q5 (gold is money) and DESIGN_AUTHORITY's "no streak flames". Existing
    designs, left as built. (The "Fedha" tier's gold WAS fixed: plain ink.)

12. The CLASSIC bell's "25" badge covers the bell's dome at phone widths (round 4 tile 333: badge + glow x307–334
    y8–29; only the lip, base and clapper show) — live for every player today. The journey's same defect was fixed
    (R3-D + bf30c154: re-anchored from the left, 1px higher, no rose glow on the opaque bar). The classic bell is frozen
    for S6/S7 (A1, `qa:bell-untouched`), so fixing it for live players is a ruling.

13. The CLASSIC footer's "Propose markets & get paid" link leaves its COMING SOON pill alone on a second line at
    768 and 1024 (WP12 tiles 299/307) — live for every player today. G2 balanced it; R4-F (ca45ff6e) made that
    balance the journey's alone, because the classic footer is frozen chrome (qa:classic-shell-parity holds it to
    main's bytes). Fixing it for live classic viewers = one class plus a named EXPECTED_DIFFS entry — a ruling.

14. The journey capsule's words are now CENTRED in the box D31 reserves for 999,999 (R4-E, 88ee1a42): a short figure no
    longer hugs the right (TZS 0 was 39 | 10, now 24.4 | 24.4) — and so at every balance the "Salio" caption is centred
    over the figure (at TZS 258,208 on a 390 phone, ~34px left of its old flush-right spot). Taken as the pass's
    decision (rule 8a decides the box, not the alignment); reverting is three CSS values. Journey only.

15. The OFFLINE page now uses the system font (R4-G, cec24e83): it is a person-free document the phone app keeps, and
    the brand fonts live under build-hashed names only the app knows (the error page already does the same). Bringing
    Sora/Inter to it = self-hosting the font files — a small asset decision.
16. During a responsible-gambling BREAK (edge scenario 1): the sentences that tell the player to bet NOW are being
    removed (as for a held wallet), but the generic product lines stay — the home tagline "Chagua upande, weka dau…",
    the trust line "Weka na toa pesa kwa M-Pesa…", "Kuwa wa kwanza kutabiri". And the hub still offers Invite friends,
    Propose & earn and Become an agent: does "no promotions during a break" cover referral and earn offers?
17. Right after SELF-EXCLUDING, the same phone is a guest again: the bet panel's first button is Sign up, "Anza
    kutabiri" and live NDIO/HAPANA show. Should a device that has just excluded be treated differently (e.g. no
    sign-up prompts for the exclusion period)? (Whether the same phone/email can open a NEW account is being proved.)
18. The English motto "The wisdom of YES & NO." sits under the Swahili and Chinese headings — a brand line by design?
19. Enlarged text (a phone's larger default font) changes nothing on player pages: the type scale is in px. Browser
    zoom works (WCAG 1.4.4 is met by zoom); honouring the phone's font-size setting would be a type-scale project.
20. Item 10 extended: the Needle on the profile card's corner at 768 (14–17px inside) and 1024 (0px), and at 740×360
    landscape both the Needle and the chat bubble on the profile card.

21. A self-excluded person CANNOT re-register with the same phone or email (proved, R4-I) — but a NEW phone + email opens
    a fresh account: nothing at sign-up ties a person to an excluded account (exclusion and caps are per account; the
    KYC one-document rule only catches it at withdrawal, and only if the excluded account had verified its ID).
    Closing it needs person-level matching at sign-up — a policy decision (and new words).
22. Times are never labelled "EAT" anywhere today; break/exclusion ends now show date AND time in the reader's
    language ("hadi 10 Okt, 05:05"). Add "EAT" (everywhere, not just here)?
23. The old dial's thumb text is under the reading floor (its side word ~5.8px, multiplier ~11.6px at 360; a 10px
    "HAPANA" cannot fit a 43px thumb) — drop it or move it out of the thumb? (S8 replaces the dial in the journey.)
24. qa:bar-geometry is red on MAIN (88 failures, a stale instrument) — repair it so it guards again (tooling task).

25. The journey header's focus rings end 2px from the next control at 390 (the balance ring → the gold pill; "Ingia" →
    "Jisajili"): the S4 fit rule's 6px phone gaps hold a 4px ring. Accept, or widen the gaps (costs 320px fit slack —
    10.7px left today)?
26. Chinese text in boxes sits ~1.5px high (17 | 20 against Latin's 19 | 18): ideographs sit ~0.12em higher than
    Latin capitals on the same baseline, on every zh box. Accept, or adopt a platform-wide CJK vertical trim?
27. The cashback promo's "Weka sasa / Deposit now" — keep the promo's own wording, or match the journey's "Weka pesa"?

28. (R5-C, the second gold audit) The WARNING colour is the money gold today (`--warning-fg: var(--gilt)`, an owner token):
    every real warning — a refused sign-in, "more info needed" on KYC, a withdrawal hold — paints in money's gold. Proposed:
    an amber off gold's hue (`--warning-500: oklch(74% 0.15 62)`, `--warning-fg: oklch(84% 0.115 66)`, 7.5:1 / 10.8:1);
    chip.tsx's warning/paused and the warning toast would read the same tokens (feedback-law §2 is re-decided with it).
29. Classic chrome still carries gold that is not money (frozen for S6/S7): the "• Juu na Chini" dots (top-app-bar.tsx
    :533, `.kp-rail__dot`) → brand or none; the classic bell, language tick and avatar-menu rows → the journey's
    colours; the live-ticker separator → `--border-strong`; the classic header's "INAKUJA" tag (kept tinted there).
30. The claret rule's gold midpoint (`.claret-rule`, `var(--gilt) 50%`) → `var(--claret-300) 50%` (and the offline page's
    copy).
31. The legal pages' RG links are gold (Terms ×6, RG policy ×3) → brand. It changes the Terms/RG text hashes, so it ships
    with the next policy version.
32. Gold questions: the landing's pool and paid-out totals in gold (money, Q5) vs D5's inducement clause; the empty-state
    illustrations' one gold accent (§C7) vs Q5; the crest's raw metal (chroma 0.13) vs `--metal-gold` (0.068); §C5 "no
    streak flames" — the hot chip and streak chain are still flames (now metal, not gold).
33. (R5-A) The grid cards' pool figure has no word beside it ("TZS 1.2M" alone): at 320 the worst case (7-digit pool +
    "dakika 59 zimebaki" + the info button) uses 257.6 of 258px, so even one glyph wraps a fixed-height card. Smaller
    type, a second line (taller cards), or leave it (screen readers now hear "Bwawa")?
34. (R5-A) Every dialog's close ✕ now stands on its title's first line (one convention); the confirm dialog's ✕ moved off
    the medallion's centre to the title's capitals. Confirm the look.
35. (R5-A) "One page, one name" in the journey: the proposals doors now read the page's own name "Mapendekezo ya Masoko /
    Market Proposals" (the "earn" wording "Pendekeza na upate zawadi" is gone from the journey's doors). OK?
36. (R5-A) Swahili leaderboard name: "Bingwa" (the page's own name, now on the journey's doors) or "Jedwali la Washindi"
    (the classic nav)? One of them should change everywhere (S12 if the page changes).
37. (R5-A) Legal titles keep a connective with its noun: "Kanuni / za Michezo" (not "Kanuni za / Michezo"), "Terms / of
    Service", "Sera / ya Faragha" at the narrow widths where they wrap — rule: no line ends on a connective.
38. (R5-E) Very wide figures on a market's page title at 320: the line holds 220px; "TZS 10,000,000" (229px) and
    "USD 100 million" (221.5px) are kept whole, and a "?" after one reaches the faint watermark. No real title has one
    today. Accept, a smaller title below 360, or another technique?
39. (R5-E) Chinese titles now break far less inside words (balanced lines), but a few still split a word at 320 (e.g.
    "…7月降 / 雨…"): zero needs phrase segmentation no browser offers. Accept?
40. (R5-E) Every toast's money amounts are now in the figures' font (mono, §M4) — bet placed, sold, payouts, Up & Down
    results, the refused sale — in both shells. Confirm?
41. (R5-E) A month and its year may now wrap apart ("December" / "2026") so a long date fits a phone title. Confirm?
42. (R5-I) The CLASSIC bell's rose count badge reads 2.64:1 at its gradient's light end (below 4.5) and its "Clear all"
    hovers in the betting NO rose — the journey bell is fixed (brand pip 5.04:1, danger hover); the classic is frozen.
43. (R5-I) The CLASSIC wallet capsule's ±delta is still in the betting YES/NO colours (frozen chrome; the journey's is
    plain text now).
44. (R5-I) The board's "hot" flag chip shares the betting NO rose — split it? (§B2a calls it Ali's call.)
45. (R5-I) The identity crest's "Tipping Sigil" uses the YES/NO split — §B1a says it must not borrow from the mark.
46. (R5-I) Password, 2FA and email refusals a player can fix stay red pop-ups (the feedback law's pins hold them there);
    every other fixable refusal is now a calm message. Keep, or align them too?
47. (R5-I) A bonus that unlocked ("Unlocked") is green (a word is not money, as for invites) — or gold?
48. (R5-I) A rejected source-of-funds declaration is amber on /profile and red on its own page — which one?
49. (R5-I) Payout credits in /wallet's history: neutral (as the Receipts row decided) or gold (money earned, §M3)?
50. (R5-I) On the old dial, reaching a SESSION LIMIT (an RG limit) now shows its unchanged sentence as a message that
    stays until read, instead of the red ✗ pop-up — as Up & Down already does. Confirm?
51. (R5-I) The leaderboard's rate of return is now neutral text with its sign (not green/red, not gold). Right?

## S12 (live-word corrections, ship with S12)
- Swahili "Arifa {n}" reads like one more chip beside "Pesa 3" on the notifications filter row (G1): "{n} arifa".
- The guest help subtitle "Maswali ya kawaida · Simu · Barua pepe" cannot fit one line at 320/360 (73px row); a
  shorter sw "Maswali · Simu · Barua pepe" (~175px) gives a 56px row (G2).
- Badge names are hard-coded bilingual "First Prediction · Ubashiri wa Kwanza" in every locale (achievements.ts);
  move to per-locale dictionary keys (G2; already an open defect in LIVE-QA-CAMPAIGN).
- At 320 only a TZS 1,000,000 stake wraps "Matokeo / yakitoka" (balanced); a shorter sw phrase would remove it (G3).
- (already held) "masaa 1 yamebaki" → "saa 1 imebaki".
- The hub card-size hint "Kwa simu tu. Hakuna kinachofichwa." (224.9px) cannot share one line with the row's centred
  switch at sw 360 (206px free) — two whole sentences, a 73px row (R4-E, 88ee1a42). A shorter sw hint gives one line.

- (R5-A) A key for the rules page's name ("Kanuni za Michezo / Game Rules / 游戏规则") for the hub row and footer link,
  which say "RTP ya mchezo na sheria / Game RTP & rules".
- (R5-A) sw AML door "Sera ya AML / KYC" vs the page title "Sera ya Kuzuia Uoshaji wa Fedha na KYC".
- (R5-A) sw "Weka mipaka" (the doors) vs the limits page's h1 "Vikomo".
- (R5-A) sw LIVE: "Mubashara" (the page) vs "hai" in count lines ("40 hai").
- (R5-A) zh regulator: the footer's 坦桑尼亚博彩委员会 vs the agent page's 坦桑尼亚博彩管理委员会.
- (R5-A) sw `proposals.earned` reads "umepataa" (likely a typo for "umepata").
- (R5-C) The factual validation toasts have no next-step line (F4) — new keys.
- (R5-I) The share button's "Couldn't copy" has no next step and no existing key fits.
- (R5-I) The agent application's submit pop-up prints the server's English error (apply-client.tsx ~175) — reason keys.

## S8 (the journey bet sheet)
- A player on a break (or self-excluded but signed in) can open the old dial, pick a side and a stake, and is refused
  only at confirm ("Could not place" + the break's date). The S3 engine's `shortfallPlan` already refuses FIRST
  (gates 1–4: maintenance, the break with its date, the session limit, the account) — the S8 sheet must ask those gates
  when it OPENS, so the break's sentence (`rg.breakActive` / `rg.exclusionActive`, approved copy) shows before any
  stake. Not changed in the shelved dial now.
- The same for a HELD (frozen) wallet (round 4, tiles 088–100): the home's featured card shows live YES/NO; the bet path
  refuses `wallet_frozen` (shortfallPlan's gate 7, the wallet not ACTIVE). The S8 sheet must show the held notice before
  any stake, as the Wallet and the header already withhold their invitations for a held wallet.
