# Up & Down band: final design v2

**For Ali, in three lines:**
1. The chart is gone. The band is now a football scoreboard. It shows who is ahead (Juu or Chini) and the time of the price that says so. The Juu and Chini bet buttons sit inside the scoreboard, directly under the answer: the teams are the buttons.
2. Under it, one thin match timeline marks each confirmed price above or below the opening line, where betting locks and where the result is decided. One short sentence says when every stake comes back. The band has no pool, no dollar price, no "live" next to a frozen number, and nothing that flashes.
3. Nothing ships until two gates pass. First, 8–10 Swahili speakers pass a 3-second phone test. Second, a four-person panel scores every real frame 10/10. Your decisions are in §16. The first asks whether the band should refresh its price every minute; I recommend yes.

Repo: `C:\kipindi-landing-v3` (HEAD `16f96489`). All paths below are relative to it.

---

## 0. What changed from v1, and why

Both reviews kept the concept: a score bug over a match timeline. Both asked for the same cure: take things out, put the tap next to the answer, and have one focal point. v2 applies every request. Where the two reviews contradict each other, or a request meets a rule, the resolution is stated (C1–C13). None of the requests had to be refused outright.

### Industry review

| # | Asked | v2 |
|---|---|---|
| I-1 | The team cells become the real Up/Down buttons; delete the separate row; never lit | **Applied.** Below 640px the plate has two tiers: the verdict on top and the two buttons directly under it, all one object. From 640px it is one row, `[↑ Up │ verdict │ Down ↓]` (C2). The buttons are always solid and equal. The leader is shown only by the verdict's ink and arrow. |
| I-2 | Rewrite the Level state | **Applied.** "Hakuna anayeongoza / Nobody leads / 暂无领先方". The figure line never names a side ("Tofauti $0.20 tu — haitoshi kuamua"). The refund note is kept. |
| I-3 | One-line caption, no padlock while open | **Applied, with one change (C3).** The caption keeps "baada ya". No padlock while betting is open: a neutral clock glyph is used. The head is ~60px (you asked ~58). |
| I-4 | Remove the source line | **Applied** (C5). |
| I-5 | Remove the pool line and the one-sided and empty sentences | **Applied** (C4). Ali is asked to confirm (§16-2). |
| I-6 | The round page agrees with the band in the same release | **Applied** (§12): label, stamp placement and targets-based ink on `/updown/[roundId]`, plus an agreement drive. |
| I-7 | Hallway test and native review as a gate | **Applied** (§15.7). |
| I-8 | Rule in 2 lines; no "batili"; no "EAT"; strict "less than" | **Applied.** "batili" leaves the band entirely; every refund is stated as "kila dau linarudi". |
| I-9 | No visible "EAT" | **Applied.** It stays in the track's aria text and on the round page. |
| I-10 | The Play CTA becomes a "Raundi zote ›" text link when a round shows | **Applied.** It uses the landing's own section-link recipe, `.kp-shead__link`, at 44px. |
| I-11 | After close: "Cheza raundi ijayo ›" primary, "Tazama raundi hii" as a text link | **Applied.** The Watch link sits in the clock row where the digits were, so closing grows the band by 4px, not 60 (C13). |
| I-12 | Drop "raundi 2 hai sasa" when a round shows | **Applied.** It stays in the no-round state. |
| I-13 | No `ud-count-pulse` on the landing | **Applied.** The page keeps one loop, the live dot. |
| I-14 | Picker: shortest duration among rounds with a read and ≥2 min left; ties go to most time left | **Applied** (§3.3). |
| I-15 | Seed the first paint | **Applied.** Server and first client paint show the same real mm:ss. |
| I-16 | Dollars out of the lane and the kick-off state | **Applied.** The delta and the rule margin are the only dollar figures left (C6, C7). |
| I-17 | Sentence case for Swahili labels | **Applied** to the caption, lane and verdicts. Two existing kit labels are kept (C8). |
| I-18 | Rule on refresh now; recommend yes | **Asked** (§16-1), with yes recommended. The build is static until you rule (L12, WP15, law 42). The refresh needs no new server code (§16). |
| I-19 | Flatten the boxes | **Applied.** At 360 there are 3 bordered objects (card, plate, Chip) plus the 2 filled buttons, down from 8. The pod box is gone. |
| I-20 | At most 4 type roles | **Applied** (§6.1). |
| I-21 | Track 44px at 360 | **Changed** to 56px (C9). The no-track variant is in the hallway test. |
| I-22 | Height ≤600px at 360 as a frame gate | **Applied.** S1 sw comes to about 592px by arithmetic, and the frame gate measures it (§15.4). |

### Visual review

| # | Asked | v2 |
|---|---|---|
| V-1 | One focal point: verdict Sora 700 20/24, −0.01em, lh 1.15; digits `--type-h4` 17 → `--type-h3` 20; `mmss` | **Applied.** |
| V-2 | Clock as one unboxed line that never wraps; closed = lock plus `udLockedTitle` only | **Applied.** It is a full-width row below 768 and sits to the right of the fixture from 768. `udSelectionsClosed` and the large "—:—" leave the band. |
| V-3 | One joined bar, 3px top rule, lit segment, 44px arrow-only columns | **Joined plate: applied.** The lit segment and 3px rule are dropped (C1). The columns are replaced by the two-tier plate (C2). The only boxed cells left are the real buttons, so nothing that isn't a button looks like one. |
| V-4 | Delta belongs to the verdict: centred, muted words, `.amount` 700 `--text`, no green; confirmed price from 768 | **Applied** inside the plate, directly under the verdict. The confirmed price is dropped at every width (C6). |
| V-5 | Rhythm: `--sp-2` inside groups, `--sp-5` between | **Applied from 768.** Below 768 the gap between groups is `--sp-4` (C10). |
| V-6 | Number and money laws; `density` comment | **Applied:** `fillNodes`, `.amount` and `.mono`. No `max-width` block remains, so the density contract owes no comment. Any added one carries it. |
| V-7 | Track: 20px lane, 14px glyphs, bead r4 offset, 20–80% muted playhead, contrast pairs | **Applied.** Rail and posts use a different ink so they pass your own 3:1 requirement (C11). |
| V-8 | One glyph column | **Applied:** clock row, track gutter, rule. |
| V-9 | Two-line rule in two inks; stat line; source line | **Rule applied.** The crowd and source lines are removed (C4, C5). |
| V-10 | Terms after the actions | **Applied.** The buttons sit in the plate, above the track and rule. |
| V-11 | Fixture on one line: `AssetMark` 32/40, Sora 15/600, kit `Chip` | **Applied.** |
| V-12 | At most 5 type roles | **Applied** (4). |
| V-13 | States: kick-off CTA, no lone "—" in awaiting, 12px tie tick | Kick-off changed (C12). The other two are applied. |
| V-14 | Motion: shared second; colour fade on the aged flip | **Applied.** |
| V-15 | Plot 56/64/72; reach 1.1 | **Applied.** |
| V-16 | Locked stretch: the quiet dialect exactly | **Applied:** 1px, dash `2 5`, opacity 0.55. |
| V-17 | Record the open-price split between surfaces | **Applied:** a B12.2 line plus a click-through frame pair. |
| CSS | Letter-spaced money; Inter numerals; restated tracking; `--type-h1`; digit format | **All closed** (§6). |

### Conflicts and how each is resolved

- **C1. Lit leader (V-3) vs never lit (I-1).** Never lit. A lit cell washed in the same ink as that side's bet button is a follow-the-leader cue. The craft judge called it "the strongest chasing cue of the four", and it falls under responsible gambling (L17). The leader is still found at a glance: the verdict is the largest type in the panel, it is in side ink with an arrow, and it sits directly above that side's button.
- **C2. Plate geometry.** At 360 the panel is 286px wide.
  - An 80/126/80 row leaves ~110px of text width.
  - One Swahili word, "anayeongoza", needs ~129px at the 20px focal size V-1 asks for, so it would break mid-word.
  - 44px arrow-only columns would give a money button no word (A4).
  - Two tiers give the verdict 260px, which fits "Hakuna anayeongoza" at 20px on one line (~206px). The tap target sits flush under the answer.
  - From 640px the one-row match strip fits with ≥112px sides.
- **C3. Caption wording.** "Dau linafungwa baada ya" is kept, for two reasons:
  - "Dau linafungwa" over a bare "01:52" reads as a time of day. In Swahili time, "saa 1:52" is 7:52 in the morning, which would fail the hallway test's own Q2.
  - It is the product's one phrase for this idea (the `/updown` card and the round page use `udBetsCloseIn`). The visitor judge had faulted two forms side by side.

  The one-line goal is met: the caption is ~159px in a full-width row with ~207px free (~167px at 320).
- **C4. Pool and players.** Removed, as the industry review asked. The honesty judge allowed "stamp it or leave it out". This breaks no rule:
  - K7/K48's V18 population is the featured card, the grid cards and the board rows (LANDING-TEN V18 definition). The band was never in it, and the shipped band shows no pool.
  - The one-sided refund warning is stated where money is committed, before Confirm (`round-stake-panel.tsx` ~112–118, side-aware; `updown-stake-controls.tsx` ~136–141).
  - A visitor who taps the empty side would *fill* it, so the band's "Juu inaongoza" makes no claim about the pool.

  Ali confirms in §16-2.
- **C5. Source line.** Removed, as both reviews accept. It said "live" beside a frozen number. The band shows no absolute asset price, so no price is left without its source. The round page names the source before any stake (K36).
- **C6. Confirmed price from 768 (V-4) vs dollars out (I-16).** Dropped everywhere: one decision across widths. The round page, one tap away, shows the confirmed price with its time (§12).
- **C7. Lane label.** "Ufunguzi / Open / 开盘" in sentence case with no price, as the industry review asked. With no figure there, V-6's money-tracking concern cannot arise.
- **C8. Two tracked labels stay:**
  - the duration as the kit `Chip` ("10 DAKIKA"), the `/updown` card's own grammar (V-11);
  - the landing's section link ("RAUNDI ZOTE ›", `.kp-shead__link`).

  Both are short tokens. The industry's objection was to long words in tracked caps ("LINAFUNGWA", "SARAFU-FICHE"), and both of those are gone.
- **C9. Track height: 56px, not 44.**
  - At 44px the stem range is ~6–14px, too compressed to show size.
  - At 56px it is ~5.6–20px, and the tallest stem keeps ~20px (V-15).
  - The ≤600 budget is met at 56 because three lines left the band.
  - The no-track variant is still tested (§15.7). If comprehension is equal, dropping it below 480px goes to Ali (F3).
- **C10. Group gap.** `--sp-4` (16) below 768 keeps S1 within 600px. From 768 it is `--sp-5` (20). The 8/16 ratio still reads as grouping.
- **C11. Rail and post inks.** V-7 asked for a `--border-control` rail and `--border-strong` posts, and also asked that both pass 3:1. Estimated on the wash's lighter stop, `--border-control` is ≈2.99:1 and `--border-strong` ≈2.2:1, so both fail that ask. Both take `--text-faint` (≈4.5:1, the A1 floor token). Hierarchy comes from weight: rail 2px, posts 1px, played stretch in `--text-subtle`. `test:contrast` is the arbiter.
- **C12. Kick-off CTA.** "Mwanzo · Chagua upande" is the verdict line in display type, as I-1 asked. V-13's concern was the 11px stamp slot; display type is more legible than the Inter 13 it proposed.
- **C13. Closed state.** The closed phrase appears once, in the clock row: lock plus "Dau limefungwa". The sides become inert neutral cells with a padlock, the East African sportsbook sign for a suspended selection. The verdict stays, dated. "Tazama raundi hii ›" takes the digits' place in the clock row. The acts row swaps its 44px link for a 48px "Cheza raundi ijayo ›". Result: one phrase for "closed" (V-2), a closed state visible where the thumb was (I-1), and no 60px jump.

**Kept exactly from v1:**
- `decideOutcomeByTargets` imported unchanged.
- The cadence-aware stale rule, shared with the terminal.
- The server past tense plus the client tense flip.
- No gold; `rates` (and now all money) out of the band's type.
- The fixed open-to-close x-domain, the 5 bps scale floor, and the playhead drawn as a line.
- The refund always stated.
- Composed strings through `fill`/`fillNodes`.
- `AssetMark` hoisted.
- The WP15 amendment.
- Zero new queries.

**One mechanism changed from v1.** The aged and closed flags live on a small client wrapper's `data-*` attributes (§4.2), not on `:has()`. Browsers without `:has()` would otherwise keep a present-tense "Juu inaongoza" forever, which is stale-as-live.

---

## 1. What it looks like (sketches, not to scale)

### 360, sw, S1: fresh UP read

A 10-minute round: open 14:20, bets close 14:30, close 14:32. Reads at 14:23 (−$6.20) and 14:26 (+$18.52); rendered at 14:28.

```
┌──────────────────────────────────────────────────┐
│ ● MCHEZO WA KASI · HAI                           │  eyebrow + live dot (unchanged)
│ Juu na Chini                                     │  h2 32
│ Je, bei itakuwa juu au chini saa itakapoisha?    │  tagline 15 (2 lines at 360)
│ ──────────────────────────────────────────────── │  hairline --border
│ (₿) Bitcoin  [10 DAKIKA]                         │  G1  mark 32 · Sora 15/600 · kit Chip
│ [clk] Dau linafungwa baada ya              01:52 │  G1  glyph 12 faint · Inter 13 subtle · mono 17/700 --text
│ ╭──────────────────────────────────────────────╮ │  G2  plate: --bg-inset, --r-lg, 4px inset
│ │               ↑ Juu inaongoza                │ │      Sora 20/700 --yes-300
│ │    saa 14:26 · Juu ya ufunguzi kwa $18.52    │ │      Inter 13 --text-muted · 14:26 .mono · $18.52 .amount 700 --text
│ │ ┌─────────────────────┐┌───────────────────┐ │ │
│ │ │        ↑ Juu        ││      ↓ Chini      │ │ │      THE links: btn-yes │ btn-no, btn-lg 48, equal, solid
│ │ └─────────────────────┘└───────────────────┘ │ │
│ ╰──────────────────────────────────────────────╯ │
│       Ufunguzi                    [lock]  [flag] │  G3  lane 20: Inter 13 subtle; glyphs 14 subtle
│ ↑                ●                    │       │  │      gutter arrows 12 --text-faint
│      ●━━━━━━┳━━━━┻━━━━━┃──────────────┼┄┄┄┄┄┄┄┤  │      plot 56: ━ played · ┃ now · ─ rail · ┄ locked
│ ↓           ╹                         │       │  │
│ [flag] Bei ya saa 14:32 inaamua. Tofauti ikiwa   │  G4  sentence 1 --text-muted, sentence 2 --text-subtle,
│        ndogo kuliko $0.02, kila dau linarudi.    │      hanging indent, 2 lines
│ RAUNDI ZOTE ›                                    │  acts: .kp-shead__link 44
└──────────────────────────────────────────────────┘
```

These S1 figures are estimates; the gate in §15.4 measures them.
- Band ≈592px.
- Clock row top ≈207px from the band top; plate bottom ≈366px, so the answer, the clock and both taps sit within ≈159px.
- Green marks: verdict (text and arrow), the Juu button, the newest stem and bead, and the earlier Up stems at 70%.
- Rose marks: the Chini button and earlier Down stems.

### 768, en, S1: stacked, one-row plate

```
(₿) Bitcoin  [10 MIN]                                 [clk] Betting closes in 01:52
╭──────────────────────────────────────────────────────────────────────────────╮
│ ┌──────────────┐                ↑ Up leads                  ┌──────────────┐ │
│ │     ↑ Up     │       at 14:26 · Above open by $18.52      │    ↓ Down    │ │
│ └──────────────┘                                            └──────────────┘ │
╰──────────────────────────────────────────────────────────────────────────────╯
     Open                                                        [lock]    [flag]
(track 64 · rule on one or two lines · ALL ROUNDS ›)
```

### 1280, en, S1: copy 5/12, round 7/12

```
┌──────────────────────────────────────┬────────────────────────────────────────────────────────────────┐
│                                      │ (₿) Bitcoin  [10 MIN]                [clk] Betting closes in 01:52│
│ ● FAST GAME · LIVE                   │ ╭────────────────────────────────────────────────────────────╮ │
│ Up & Down                            │ │ ┌────────────┐          ↑ Up leads           ┌────────────┐ │ │
│ Will the price be higher or lower    │ │ │    ↑ Up    │  at 14:26 · Above open by $18.52 │   ↓ Down   │ │ │
│ when the clock runs out?             │ │ └────────────┘                               └────────────┘ │ │
│                                      │ ╰────────────────────────────────────────────────────────────╯ │
│ ALL ROUNDS ›                         │     Open                                        [lock]    [flag]│
│                                      │ ↑                  ●                                │         │ │
│                                      │    ●━━━━━━━━━┳━━━━━┻━━━━━━━┃────────────────────────┼┄┄┄┄┄┄┄┄┄┤ │
│                                      │ ↓            ╹                                      │         │ │
│                                      │ [flag] The price at 14:32 decides. Less than $0.02 from the open,│
│                                      │        and every stake comes back.                              │
└──────────────────────────────────────┴────────────────────────────────────────────────────────────────┘
```

Band ≈330px (gate ≤380). The verdict is 24px and the digits 20px. The plate's buttons are vertically centred ±1px.

### Every other state, at 360 (sw) and 1280 (en)

**S2: Down leads** (the mirror of S1)
```
360  [clk] Dau linafungwa baada ya              01:52
     ╭──────────────────────────────────────────────╮
     │              ↓ Chini inaongoza               │  --no-300
     │   saa 14:26 · Chini ya ufunguzi kwa $12.40   │
     │ [        ↑ Juu        ][      ↓ Chini      ] │
     ╰──────────────────────────────────────────────╯
     track: newest stem BELOW the rail, 3px --no-400, bead --no-300 offset 4px down
1280 │ [   ↑ Up   ]           ↓ Down leads            [  ↓ Down  ] │
     │            at 14:26 · Below open by $12.40                 │
```

**S3: Level.** Example: gold, targets ±$0.40, read +$0.20.
```
360  [clk] Dau linafungwa baada ya              06:10
     ╭──────────────────────────────────────────────╮
     │              Hakuna anayeongoza              │  --text, no arrow
     │   saa 14:26 · Tofauti $0.20 tu — haitoshi    │  never a side name
     │                    kuamua                    │
     │       Ikifunga hapa, kila dau linarudi.      │  --text-subtle
     │ [        ↑ Juu        ][      ↓ Chini      ] │
     ╰──────────────────────────────────────────────╯
     track: faint void band around the rail; a 12px --text-muted tick at 14:26; no stem, no bead
1280 │ [   ↑ Up   ]            Nobody leads             [  ↓ Down  ] │
     │     at 14:26 · Only $0.20 from the open — not enough to decide │
     │           If it closes here, every stake comes back.           │
```

**S4: Kick-off.** The open is confirmed; there is no read after it yet.
```
360  [clk] Dau linafungwa baada ya              08:40
     ╭──────────────────────────────────────────────╮
     │            Mwanzo · Chagua upande            │  --text; below ~340px it breaks at the dot
     │ Bado hakuna bei mpya tangu ufunguzi saa 14:20│  aged: "Ilifunguliwa saa 14:20"
     │ [        ↑ Juu        ][      ↓ Chini      ] │
     ╰──────────────────────────────────────────────╯
     track: the opening dot, the rail, the playhead; nothing else
1280 │ [   ↑ Up   ]       Kick-off · Pick a side       [  ↓ Down  ] │
     │             No new price since the open at 14:20            │
```

**S5: Aged.** Now ≥ min(stale, close); betting is still open.
```
360  │               ↑ Juu iliongoza                │  verdict and arrow --text-muted (220ms colour fade)
     │    saa 14:26 · Juu ya ufunguzi kwa $18.52    │  unchanged: a dated fact
     │ [        ↑ Juu        ][      ↓ Chini      ] │  still live links: betting is open
1280 │ [   ↑ Up   ]              ↑ Up led              [  ↓ Down  ] │  muted
```

**S6: Awaiting.** The open or targets are null, or the read failed.
```
360  │                Inasubiri bei                 │  --text-subtle; no second line
     │ [        ↑ Juu        ][      ↓ Chini      ] │
     track: rail, posts, playhead; lane "Ufunguzi"; no rule sentence when targets are missing
1280 │ [   ↑ Up   ]           Awaiting price           [  ↓ Down  ] │
```

**S7: Closed.** Bets close while the page is open.
```
360  [lock] Dau limefungwa             TAZAMA RAUNDI HII ›   one closed phrase; Watch takes the digits' place
     ╭──────────────────────────────────────────────╮
     │               ↑ Juu inaongoza                │  unchanged, dated; flips to "iliongoza" at 14:32
     │    saa 14:26 · Juu ya ufunguzi kwa $18.52    │
     │ ┌ [lock] Juu ─────────┐┌ [lock] Chini ──────┐ │  inert, neutral: 1px --border, --text-subtle, 48px
     ╰──────────────────────────────────────────────╯
     track: the playhead runs on through the locked stretch to the flag and stops there
     acts:  [ Cheza raundi ijayo › ]  (btn-primary btn-lg; replaces RAUNDI ZOTE ›)
1280 right: (₿) Bitcoin [10 MIN]           [lock] Bets closed   WATCH THIS ROUND ›
     plate: [ [lock] Up ]      ↑ Up leads …      [ [lock] Down ]
     left column, under the copy: [ Play the next round › ]
```

**S8: No live round, or none readable.** Exactly today's band.
```
┌──────────────────────────────────────────────────┐
│ ● MCHEZO WA KASI · HAI                           │
│ Juu na Chini                                     │
│ Je, bei itakuwa juu au chini saa itakapoisha?    │
│ raundi 2 hai sasa  |  Raundi mpya kila baada ya… │
│ [ ↗ Cheza Juu na Chini                        › ]│  btn-primary (kp-updown--solo)
└──────────────────────────────────────────────────┘
```

**Legend by repetition** (no legend box):
- ↑ and ↓ appear on the verdict, on the buttons and in the track gutter.
- The lock appears on the gate post, and at close on the clock row and both sides.
- The flag appears on the rule and on the finish post.
- The rail is labelled directly ("Ufunguzi").
- The clock glyph appears only next to its own caption.

---

## 2. Files

**New**
- `C:\kipindi-landing-v3\src\lib\updown-match.ts`: isomorphic and pure.
  - Types `MatchSide`, `MatchRead`, `MatchLead`, `UpdownBandRound`.
  - Functions `matchLead`, `matchAgedAtMs`.
  - No directive, and no import from a `"use client"` module.
- `C:\kipindi-landing-v3\src\lib\updown-quote-age.ts`: `QUOTE_GAP_FACTOR` (2.5), `QUOTE_STALE_FLOOR_MS` (5 min), `medianCadenceMs`, `quoteStaleAtMs`, `isQuoteStale`. This is the terminal's rule, moved here and used by both surfaces.
- `C:\kipindi-landing-v3\src\lib\use-replay-anchor.ts`: `useReplayAnchor(serverNowMs)`. The `FIRST_SEEN` / `performance.now()` body moves here verbatim from `updown-ring.tsx`. It is imported only by the three client leaves.
- `C:\kipindi-landing-v3\src\lib\server\updown-band-round.ts` (server):
  - `UD_MIN_LEFT_MS`, `UD_READ_AGE_MS`, `pickBandCandidates`, `isSeasoned`, `hasPostOpenRead`, `toUpdownBandRound`;
  - imports `decideOutcomeByTargets` from `updown-service.ts` unchanged.
- `C:\kipindi-landing-v3\src\components\charts\updown-match-geometry.ts`: pure `MATCH`, `matchX`, `matchScale`, `matchGeometry`.
- `C:\kipindi-landing-v3\src\components\charts\updown-match-track.tsx`: server component. The gutter, lane and SVG; renders the playhead leaf.
- `C:\kipindi-landing-v3\src\components\charts\updown-match-now.tsx`: `"use client"`. The playhead and the played stretch.
- `C:\kipindi-landing-v3\src\components\home\updown-match-state.tsx`: `"use client"`. The band's wrapper: it owns `data-aged` / `data-closed` and moves focus at close.
- `C:\kipindi-landing-v3\src\components\home\updown-match-digits.tsx`: `"use client"`. The mm:ss digits with `role="timer"`, seeded.
- `C:\kipindi-landing-v3\src\components\updown\asset-mark.tsx`: `AssetMark`, `ASSET_MARKS`, `markFor`. Hook-free, no directive, zero style literals.
- `C:\kipindi-landing-v3\scripts\updown-match.test.mts`, plus `"test:updown-match": "tsx scripts/updown-match.test.mts"` in `package.json`.
- `C:\kipindi-landing-v3\scripts\qa\landing-v3\band-metrics.mjs`: the numeric frame gate (§15.4), with its RED control.
- `C:\kipindi-landing-v3\scripts\qa\landing-v3\band-agree.mjs`: the band and the round page must show the same side (§15.6).

**Changed**
- `src\components\home\updown-band.tsx`: rewritten (§4). The header comment is rewritten to cite R5 and the honesty rules in §11.
- `src\app\page.tsx`: the block from "── The Up & Down band's live round" to the end of the `udRound` literal (~181–226) becomes the picker plus one `toUpdownBandRound` call (§3.3).
- `src\lib\server\updown-board.ts`:
  - `priceSeriesFor` (~1248) splits into `roundReadWindow` and `seriesFromReads`;
  - `getRoundDetail` (~1346) gains `roundReads` and `readCadenceMs`;
  - the two stale sites (~1050–1055, ~1112–1115) call `isQuoteStale`;
  - `GAP_FACTOR` (~973) becomes the imported `QUOTE_GAP_FACTOR`;
  - the gap-marker floor at ~1106 (3 min) is **not** touched.
- `src\lib\updown-source-label.ts`: adds `fmtEATClock(ms)`, giving "14:26" (Africa/Nairobi, HH:MM, 24-hour, no suffix), next to `fmtEAT`.
- `src\components\updown\updown-card.tsx`: re-exports `AssetMark` from `./asset-mark`; its private copy, `ASSET_MARKS` and `markFor` are deleted.
- `src\app\globals.css`: lines 5407–5469 are replaced by §6.
- `src\lib\i18n-dict.ts`: §7.
- `src\app\updown\[roundId]\page.tsx` and `src\components\updown\price-hero.tsx`: §12.
- `scripts\chart-one-home.test.mts`:
  - add the D5 detector with a §0 fixture pair;
  - drop the two deleted members;
  - add the new ones.
- `scripts\betting-ink.test.mts`: a new named section (§15.1).
- `scripts\contrast-audit.mts`: the new pairs (§15.1).
- `scripts\design-frozen.test.mts`: shrink the `updown-card.tsx` entry if the hoist removed its literals (the ratchet only shrinks).

**Deleted:** §13.

---

## 3. Data: zero new queries

### 3.1 `updown-board.ts`: one read, two consumers (unchanged from v1)

```ts
/** The asset's CONFIRMED reads, read ONCE for the round-page hero AND the landing band. A store error is
 *  `reads: null` — never an empty list, which the band would print as "no new price since the open". */
async function roundReadWindow(assetId: string, opensAtMs: number, endMs: number): Promise<{
  reads: { t: string; price: number; ms: number }[] | null; cadenceMs: number | null;
}> {
  let rows; try { rows = await observationStore.list({ assetId, state: "CONFIRMED", limit: 120 }); }
  catch { return { reads: null, cadenceMs: null }; }
  const all = rows.filter((o) => o.price != null && o.boundaryAt != null)
    .map((o) => ({ t: o.boundaryAt, price: o.price as number, ms: Date.parse(o.boundaryAt) }))
    .filter((o) => Number.isFinite(o.ms)).sort((a, b) => a.ms - b.ms);
  return { reads: all.filter((o) => o.ms >= opensAtMs && o.ms <= endMs), cadenceMs: medianCadenceMs(all.map((o) => o.ms)) };
}
/** The hero's series: the OLD rule unchanged — null below two points, even-step downsample to ≤60. */
function seriesFromReads(pts: { t: string; price: number; ms: number }[] | null) { /* old body from `if (pts.length < 2)` on */ }
```

In `getRoundDetail`, `priceSeriesFor(...)` becomes `roundReadWindow(...)` inside the same `Promise.all`. The return object gains:
- `priceSeries: seriesFromReads(win.reads)` (identical for the hero);
- `roundReads: win.reads?.map(({ t, price }) => ({ t, price })) ?? null`;
- `readCadenceMs: win.cadenceMs`.

`priceSeriesFor` has exactly one caller.

### 3.2 `updown-quote-age.ts`

```ts
export const QUOTE_GAP_FACTOR = 2.5;
export const QUOTE_STALE_FLOOR_MS = 5 * 60_000;
/** Median consecutive delta of ascending instants; null below two deltas (the terminal's own threshold). */
export function medianCadenceMs(ascMs: number[]): number | null
/** The FIRST instant at which a quote is stale: `isQuoteStale` ⟺ now ≥ this (integer ms, exactly the old `>`). */
export function quoteStaleAtMs(quotedAtMs: number, cadenceMs: number | null): number
  // = quotedAtMs + Math.max(cadenceMs != null ? QUOTE_GAP_FACTOR * cadenceMs : 0, QUOTE_STALE_FLOOR_MS) + 1
export function isQuoteStale(quotedAtMs: number, nowMs: number, cadenceMs: number | null): boolean
```

Both terminal tiers call these, so behaviour is unchanged. `test:terminal-series` §2.5 / §9 / §9b pin it. On BTC (about a 3-minute grid) a read stays current for about 7.5 minutes.

### 3.3 The picker (rule in `updown-band-round.ts`, walk in `page.tsx`)

```ts
export const UD_MIN_LEFT_MS = 2 * 60_000;   // at least 2 minutes of betting left (the band is five sections down)
/** ORDERING ONLY — BTC's confirmed grid is ~3 min and a read lands ~91 s after its boundary, so a younger round
 *  has usually seen only its open. The read itself decides (hasPostOpenRead). */
export const UD_READ_AGE_MS = 3 * 60_000;
type Row = { createdAt: string; selectionClosedAt: string | null; resolutionAt: string };
export const isSeasoned = (m: Row, nowMs: number) => nowMs - Date.parse(m.createdAt) >= UD_READ_AGE_MS;
export function pickBandCandidates<M extends Row>(rows: M[], nowMs: number): M[]
  // left  = Date.parse(selectionClosedAt ?? resolutionAt) − now;   keep left ≥ UD_MIN_LEFT_MS
  // phase = Date.parse(resolutionAt) − Date.parse(selectionClosedAt ?? resolutionAt)
  //         — the result phase, which is monotone in duration (3→1, 5→1, 10→2, 15→3, 30→6, 60→12 min;
  //           updown-durations.ts resultPhaseMinutes), so no duration field is needed on the market row
  // sort: seasoned first · then phase ascending (shortest duration) · then left descending (most time left)
  // slice(0, 3)
export function hasPostOpenRead(d: RoundDetail): boolean
  // d.roundReads?.some((r) => { const ms = Date.parse(r.t); return ms > Date.parse(d.round.opensAt) && ms <= d.round.serverNowMs; }) ?? false
```

`page.tsx`:

```ts
const readUdRound = async () => {
  let fallback: RoundDetail | null = null;
  for (const m of pickBandCandidates(updownOpen, nowMs)) {
    const d = await roundStore.getByMarketId(m.id).then((r) => (r ? getRoundDetail(r.id) : null)).catch(() => null);
    if (!d || d.round.state !== "open" || Date.parse(d.round.opensAt) > d.round.serverNowMs) continue;
    if (hasPostOpenRead(d)) return d;          // shortest duration that has something to show
    fallback ??= d;                             // kick-off state, if nothing better turns up
    if (!isSeasoned(m, nowMs)) break;           // sorted: every remaining candidate is younger still
  }
  return fallback;
};
// … in the same Promise.all as today …
const udRound = udDetail ? toUpdownBandRound(udDetail, locale) : null;
```

- **Cost:** usually one `getRoundDetail`, as today. Never more than three.
- **Effect:** 3- and 5-minute rounds rarely have a read with 2 minutes of betting left, so the band usually shows a 10-minute round with a read, and a countdown of 2–7 minutes under "Mchezo wa kasi". A 60-minute round shows only when nothing shorter is open.

### 3.4 The band's type (`src/lib/updown-match.ts`)

```ts
export type MatchSide = "UP" | "DOWN" | "LEVEL";
export type MatchRead = { ms: number; price: number; side: MatchSide };
export type MatchLead = "up" | "down" | "level" | "kickoff" | "awaiting";
export type UpdownBandRound = {
  roundId: string; assetName: string; assetKey: string; iconKey: string;
  durationMinutes: number; decimals: number;
  openPrice: number | null; upTarget: number | null; downTarget: number | null;
  opensAtMs: number; betsCloseAtMs: number; closesAtMs: number; serverNowMs: number;
  /** CONFIRMED reads with opensAt < ms ≤ serverNow, oldest first; side = decideOutcomeByTargets (VOID → LEVEL).
   *  null = the read FAILED (renders "Awaiting price"), never "no reads". [] when the targets are null. */
  reads: MatchRead[] | null;
  /** quoteStaleAtMs(newest read, or the open when there is none, readCadenceMs); null when openPrice is null. */
  staleAtMs: number | null;
};
// ⛔ NO money field of any kind — no pools, rates, volume, players or payout. Law 40 is enforced by the type.
export function matchLead(r: UpdownBandRound): MatchLead
  // awaiting if openPrice/upTarget/downTarget null or reads null · kickoff if reads is [] · else the newest side
export function matchAgedAtMs(r: UpdownBandRound): number | null
  // staleAtMs == null ? null : Math.min(r.staleAtMs, r.closesAtMs) — past the deciding instant every verdict is past tense
```

`toUpdownBandRound(d, locale)` (server) reads only fields `getRoundDetail` already returns:
- `pickLocalized` for the name;
- `asset.key`, `iconKey`, `decimals`;
- `round.durationMinutes`, `openPrice`, `upTarget`, `downTarget`, `opensAt`, `selectionClosedAt ?? closesAt`, `closesAt`, `serverNowMs`;
- `roundReads`, `readCadenceMs`.

Each read's side comes from `decideOutcomeByTargets(price, upTarget, downTarget).outcome`, with VOID mapped to LEVEL. The quote time is `boundaryAt`: the bar feed's `quotedAt` is the bar's datetime (`updown-feed.ts` ~574). The stamp and the stem's x are therefore one instant.

---

## 4. Markup (`updown-band.tsx`, server)

### 4.1 Tree (rounds S1–S7)

```tsx
const up = sideWord(t, "YES", "UPDOWN"), down = sideWord(t, "NO", "UPDOWN");
const lead = matchLead(round);
const latest = round.reads?.at(-1) ?? null;
const agedAtMs = lead === "awaiting" ? null : matchAgedAtMs(round);

<Reveal band="updown" className="kp-band kp-band--tight kp-band--closes">
 <div className="kp-band__inner">
  <UpdownMatchState className="kp-updown" serverNowMs={round.serverNowMs} betsCloseAtMs={round.betsCloseAtMs} agedAtMs={agedAtMs}>
   <div className="kp-updown__copy">
    <p className="kp-hero__eyebrow text-balance" style={{ marginBottom: "var(--sp-1)" }}><span className="live-dot" /> {t.home.updownEyebrow}</p>
    <h2 className="kp-shead__h text-balance" style={{ marginTop: 0 }}>{t.market.udTitle}</h2>
    <p className="kp-trust__b" style={{ maxWidth: "52ch" }}>{t.market.udTagline}</p>
    {/* no live-count line while a round is shown (I-12) */}
   </div>

   <div className="kp-udmatch" role="group" aria-labelledby="kp-udmatch-name">
    {/* G1 — identity + clock */}
    <div className="kp-udmatch__head">
     <p className="kp-udmatch__fixture" id="kp-udmatch-name">
      <AssetMark icon={round.iconKey} ticker={round.assetKey} className="kp-udmatch__mark" />
      <span className="kp-udmatch__name">{round.assetName}</span>
      <Chip>{round.durationMinutes} {t.market.udMin}</Chip>
     </p>
     <div className="kp-udclock">
      <p className="kp-udclock__row kp-udclock__row--open">
       <I.clock s={12} aria-hidden className="kp-udclock__glyph" />
       <span className="kp-udclock__cap" aria-hidden>{t.market.udBetsCloseIn}</span>
       <UpdownMatchDigits betsCloseAtMs={round.betsCloseAtMs} serverNowMs={round.serverNowMs} label={t.market.udBetsCloseIn} />
      </p>
      <p className="kp-udclock__row kp-udclock__row--closed">
       <I.lock s={12} aria-hidden className="kp-udclock__glyph" />
       <span className="kp-udclock__cap">{t.market.udLockedTitle}</span>
       <Link href={`/updown/${round.roundId}` as never} className="kp-shead__link kp-udclock__watch">
        {t.market.udRcWatchRound} <I.chevronRight s={14} aria-hidden /></Link>
      </p>
     </div>
    </div>

    {/* G2 — the score. DOM order: verdict first, then Up, then Down (screen reader hears the answer first;
        Tab order Up → Down matches the screen left → right). */}
    <div className="kp-udbug" data-lead={lead}>
     <div className="kp-udbug__mid">
      <p className="kp-udbug__verdict">{verdictNodes}</p>
      {detailNodes && <p className="kp-udbug__detail">{detailNodes}</p>}
      {lead === "level" && <p className="kp-udbug__note">{t.home.udMatchLevelNote}</p>}
     </div>
     <Link href={`/updown/${round.roundId}?side=UP` as never} className="btn btn-yes btn-lg kp-udbug__pick kp-udbug__pick--up">
      <I.arrowUp s={16} aria-hidden /> {up}</Link>
     <Link href={`/updown/${round.roundId}?side=DOWN` as never} className="btn btn-no btn-lg kp-udbug__pick kp-udbug__pick--down">
      <I.arrowDown s={16} aria-hidden /> {down}</Link>
     <span className="kp-udbug__side kp-udbug__side--up" aria-hidden><I.lock s={14} /> {up}</span>
     <span className="kp-udbug__side kp-udbug__side--down" aria-hidden><I.lock s={14} /> {down}</span>
    </div>

    {/* G3 — the timeline (components/charts) */}
    <UpdownMatchTrack round={round} label={trackAria} openLabel={t.market.udOpenPrice} />

    {/* G4 — the terms */}
    {ruleNodes && <p className="kp-udrule"><span className="kp-udrule__glyph" aria-hidden><I.flag s={12} /></span>
      <span>{ruleNodes}</span></p>}
   </div>

   <div className="kp-updown__acts">
    <Link href={"/updown" as never} className="kp-shead__link kp-updown__all">{t.home.udMatchAllRounds} <I.chevronRight s={14} aria-hidden /></Link>
    <Link href={"/updown" as never} className="btn btn-primary btn-lg kp-updown__next">{t.home.udMatchNextRound} <I.chevronRight s={14} aria-hidden /></Link>
   </div>
  </UpdownMatchState>
 </div>
</Reveal>
```

**S8 (no round)** is today's markup, byte for byte: a plain `<div className="kp-updown kp-updown--solo">` with the copy and the live count (`updownRoundsLiveOne`, `updownRoundsLive` or `updownStartsSoon`). The only action is the primary Play link: `btn btn-primary btn-lg max-w-full kp-updown__all`, `I.trendingUp`, `updownCta`, the inline `whiteSpace: normal`.

**Composed nodes.** Every piece is built with `fill` or `fillNodes`, or as an explicit array. **Never** write adjacent JSX expressions across a line break (the served-HTML trap: "hour<!-- -->of", "requiredbefore"). Every space between nodes is a literal `" "` string.

- **`<Time ms>`** = `<span className="mono kp-udnum">{fmtEATClock(ms)}</span>`.
- **`<Amt v>`** = `<span className="amount">{usd(v, round.decimals)}</span>`.
- **`verdictNodes`**:
  - up / down: arrow glyph `className="kp-udbug__arrow"`, then `<span className="kp-udbug__now">{udMatchUpLeads | udMatchDownLeads}</span>`, then `<span className="kp-udbug__was">{udMatchUpLed | udMatchDownLed}</span>`;
  - level: `now` = `udMatchNobody`, `was` = `udMatchNobodyWas`, no arrow;
  - kickoff: `<span className="kp-udbug__now">{udMatchKickoff}</span>` + `<span className="kp-udbug__cta">{" · "}{udMatchPickSide}</span>`;
  - awaiting: `t.market.udAwaitingRead`.
- **`detailNodes`** (`dev = latest.price − openPrice`, judged at `decimals`):
  - up / down: `[...fillNodes(t.home.udMatchAt, { time: <Time ms={latest.ms}/> }), " · ", (dev > 0 ? t.market.udAboveOpenBy : t.market.udBelowOpenBy), " ", <Amt v={|dev|}/>]`;
  - level: `[...fillNodes(udMatchAt, …), " · ", …(dev rounds to 0 ? [t.home.udMatchLevelExact] : fillNodes(t.market.udLevelBy, { amount: <Amt v={|dev|}/> }))]`;
  - kickoff: `<span className="kp-udbug__now">{fillNodes(udMatchNoNewPrice, { time: <Time ms={opensAtMs}/> })}</span><span className="kp-udbug__was">{fillNodes(udMatchOpenedAt, { time: <Time ms={opensAtMs}/> })}</span>`;
  - awaiting: none.
- **`ruleNodes`** (null when the open or targets are null). Margin is `{ symmetric, margin }`: symmetric when `|(up − open) − (open − down)| < ½·10^−decimals`, and margin = `max(up − open, open − down)`.
  - Sentence 1: `<span className="kp-udrule__decides">{fillNodes(udMatchDecides, { close: <Time ms={closesAtMs}/> })}</span>`.
  - Then `" "`.
  - Sentence 2: `<span className="kp-udrule__refund">{…}</span>`, filled with either:
    - `fillNodes(udMatchRefund, { margin: <Amt v={margin}/> })` when symmetric, or
    - `fillNodes(udMatchRefundRange, { upWord: up, up: <Amt v={upTarget}/>, downWord: down, down: <Amt v={downTarget}/> })` when not.
- **`trackAria`**: `fill(t.home.udMatchAria, { open, lock, close, reads })`.
  - `open`, `lock` and `close` are `fmtEATClock` of `opensAtMs`, `betsCloseAtMs` and `closesAtMs`.
  - `reads` joins `fill(udMatchAriaRead, { time, move })` with "; ".
  - `move` is the plain-string version of the detail's move ("Above open by $18.52", or the level text).
  - With no reads, `reads` is `udMatchAriaNone`.

⛔ The server band never calls anything from a `"use client"` module (`mmss`, `useTickSeconds`, `secondsUntil` live in client modules). It only **renders** client components. A client function called from server code took down every page once, and a green build hid it.

### 4.2 The three client leaves

```tsx
// updown-match-state.tsx — "use client". Re-renders only when `aged` or `closed` flips (≤ 2 renders after mount).
export function UpdownMatchState({ className, serverNowMs, betsCloseAtMs, agedAtMs, children }) {
  const anchor = useReplayAnchor(serverNowMs);
  const flags = (n: number) => `${agedAtMs != null && n >= agedAtMs ? 1 : 0}${secondsUntil(betsCloseAtMs, n) === 0 ? 1 : 0}`;
  const now = useServerNowGated(anchor, flags);
  const n = now ?? anchor;                       // SSR and first hydration: anchor === serverNowMs ⇒ identical markup
  const aged = agedAtMs != null && n >= agedAtMs;
  const closed = secondsUntil(betsCloseAtMs, n) === 0;   // the SAME test as the digits hitting 00 — one frame, one commit
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {                              // focus never falls to <body>
    if (!closed) return;
    const a = document.activeElement;
    if (a instanceof HTMLElement && a.classList.contains("kp-udbug__pick") && ref.current?.contains(a))
      ref.current.querySelector<HTMLElement>(".kp-udclock__watch")?.focus();
  }, [closed]);
  return <div ref={ref} className={className} data-aged={aged || undefined} data-closed={closed || undefined}>{children}</div>;
}
```

```tsx
// updown-match-digits.tsx — "use client". The only per-second render on the page besides the playhead.
export function UpdownMatchDigits({ betsCloseAtMs, serverNowMs, label }) {
  const anchor = useReplayAnchor(serverNowMs);
  const left = useTickSeconds(betsCloseAtMs, anchor, true, anchor);   // SEEDED (I-15): real mm:ss on the server and first paint
  const text = mmss(left);                                              // "01:52" — fixed width, the card's format
  return <span className="kp-udclock__digits" role="timer" aria-label={`${label} ${text}`}>{text}</span>;
}
```

```tsx
// charts/updown-match-now.tsx — "use client". Re-renders only when the quarter-percent position moves.
const anchor = useReplayAnchor(serverNowMs);
const now = useServerNowGated(anchor, (n) => String(Math.round(matchX(n, opensAtMs, closesAtMs) * 4)));
const x = matchX(now ?? anchor, opensAtMs, closesAtMs);           // pre-hydration = the server's position
const style = { "--x": `${x}%` } as React.CSSProperties;         // design-frozen skips `--*`
return <><span className="kp-udtrack__elapsed" style={style} /><span className="kp-udtrack__now" style={style} /></>;
```

All three subscribe to the page's one shared second (`subscribeSecond`), so the digits, the playhead and the state flips land in the same frame (V-14).

- **Restored from cache (Back/Forward):** all three re-anchor through `useReplayAnchor`.
- **No-JS or proxy browsers:** they show the server's state at load, like every other server-rendered figure.

---

## 5. The track: geometry and inks

### 5.1 `updown-match-geometry.ts`

```ts
export const MATCH = { stemMin: 10, stemMax: 40, tieHalf: 10.7, bead: 4, kick: 3, voidMinPct: 2.8, scaleFloorBps: 5, reach: 1.1 } as const;
export function matchX(ms: number, opensAtMs: number, closesAtMs: number): number
  // clamp((ms − opensAt) / (closesAt − opensAt), 0, 1) × 100, rounded to 2 dp.
  // Fixed open→close domain; the gate is matchX(betsCloseAtMs): 83.33% for 5/10/15/30/60, 75% for 3 (span = duration + result phase).
export function matchScale(r: UpdownBandRound): number
  // D = max(reach × max|dev|, 5 × margin, open × scaleFloorBps / 10_000),  margin = max(up − open, open − down)
export function matchGeometry(r: UpdownBandRound): {
  gatePct: number;
  void: { y: number; h: number } | null;   // top = 50 − (up − open)/D × stemMax, bottom = 50 + (open − down)/D × stemMax; drawn iff h ≥ 2.8
  kick: boolean;                            // openPrice != null
  ties: { x: number }[];                    // LEVEL reads (tick from 50 − tieHalf to 50 + tieHalf)
  stems: { x: number; tip: number; side: "up" | "down"; latest: boolean }[];
  bead: { x: number; y: number; side: "up" | "down" } | null;   // the newest read, when it is not LEVEL
}
  // stem length (% of plot height) = clamp(|dev| / D × stemMax, stemMin, stemMax);  tip = 50 ∓ length (UP goes up)
  // all values rounded to 2 dp so the markup is stable
```

**What the numbers give:**
- **Tallest stem:** at most 40 / 1.1 ≈ 36.4% of the plot, ≈20px at 56px.
- **Smallest stem:** 10% ≈ 5.6px at 56px.
- **Tip vs void band:** the band's half-extent is at most 40/5 = 8%, so every tip clears it.
- **BTC at ≈$85k:** D ≥ ≈$42.5, so +$18.52 draws ≈17.4% (≈9.8px) and −$6.20 draws the 10% floor.
- **Void band:** never drawn on BTC (±$0.02); a faint band on gold.

### 5.2 What the SVG draws

The SVG has no viewBox, `width="100%" height="100%"`, `focusable="false"`. Coordinates are percentages and radii are px, so beads stay round at every width. It holds no text. Paint order:
1. `rect.kp-udtrack__void` (if drawn)
2. `line.kp-udtrack__rail`, x 0 → gate, y 50%
3. `line.kp-udtrack__locked`, x gate → 100%, y 50%
4. `line.kp-udtrack__post` at the gate and at 100%, y 0 → 100%
5. `circle.kp-udtrack__kick`, cx 0, cy 50%, r 3 (only when the open is confirmed)
6. `line.kp-udtrack__tie` for each LEVEL read
7. `line.kp-udtrack__stem --up|--down` for each earlier read, from y 50% to the tip
8. the newest non-LEVEL read's `line.kp-udtrack__stem--latest`, plus `circle.kp-udtrack__bead --up|--down` at its tip (r 4, offset outward 4px by CSS so it rests on the tip)

### 5.3 HTML around the SVG (`updown-match-track.tsx`)

```tsx
<div className="kp-udtrack" role="img" aria-label={label}>
  <div className="kp-udtrack__gutter" aria-hidden><I.arrowUp s={12} /><I.arrowDown s={12} /></div>
  <div className="kp-udtrack__lane" aria-hidden>
    <span className="kp-udtrack__open">{openLabel}</span>                                    {/* "Ufunguzi" — no price */}
    <span className="kp-udtrack__mark" style={{ "--x": `${g.gatePct}%` }}><I.lock s={14} /></span>
    <span className="kp-udtrack__mark kp-udtrack__mark--end" style={{ "--x": "100%" }}><I.flag s={14} /></span>
  </div>
  <div className="kp-udtrack__plot" aria-hidden>
    <svg className="kp-udtrack__svg" width="100%" height="100%" focusable="false">{/* §5.2 */}</svg>
    <UpdownMatchNow opensAtMs={…} closesAtMs={…} serverNowMs={…} />
  </div>
</div>
```

At 360 the lane holds "Ufunguzi" (~55px) and the lock at 83.3% of 258px (~208–222px). They cannot touch.

### 5.4 Inks

Tokens only. No gold, no gradient, no aqua. Contrast figures are estimates on the wash's lighter stop; `test:contrast` is the arbiter.

| Mark | Ink | Why |
|---|---|---|
| Rail (the open and future time) | 2px `--text-faint`, round caps (≈4.5:1) | Neutral, never gilt (L8). ≥3:1 (C11). |
| Locked stretch | 1px `--text-subtle`, dash `2 5`, opacity 0.55 | The quiet dialect exactly (B12.2). |
| Posts | 1px `--text-faint` | ≥3:1. Quieter than the rail by weight. |
| Played stretch (leaf) | 2px `--text-subtle` | Time is never green or rose (§B2a). |
| Playhead (leaf) | 2px `--text-muted`, 20%–80% of the height | A line, not a dot. Quieter than the data. |
| Earlier stems | 2px, `color-mix(in oklab, var(--yes-400) 70%, transparent)` / the `--no-400` mirror, round caps | |
| Newest stem | 3px `--yes-400` / `--no-400` | |
| Bead | r4, `--yes-300` / `--no-300`, `translateY(∓4px)` | |
| Tie tick | 2px `--text-muted`, 12px tall at 56px | |
| Opening dot | `--text-subtle` | |
| Void band | `color-mix(in oklab, var(--text-subtle) 22%, transparent)` | |
| Gutter arrows | 12px `--text-faint` | Neutral (V-7). |
| Lane label, lock, flag | Inter 13 `--text-subtle`; glyphs 14 `--text-subtle` | |

---

## 6. CSS (`globals.css`: replaces lines 5407–5469 in full)

### 6.1 Type roles in the round panel (four)

| Role | Face | Used for |
|---|---|---|
| Display | Sora 700, `--type-h3` 20 → `--type-h2` 24 from 768, −0.01em, lh 1.15 | The verdict only |
| Title | Sora 600, `--type-body` 15 | The asset name only |
| Body | Inter, `--type-small` 13, lh 1.35–1.45 | Clock caption, detail words, level note, lane label, rule |
| Figures | JetBrains Mono, tabular | Digits (700, `--type-h4` 17 → `--type-h3` 20), times (`.mono`), amounts (`.amount`, 700 in the detail) |

The kit supplies the `Chip`, `.btn` and `.kp-shead__link`. Nothing new in the panel is tracked or uppercase.

### 6.2 The block

```css
/* ── §1e UP AND DOWN — the match (landing v3, WP12 · R5, 2026-09-27) ─────────────────────────────
   A scoreboard and a match timeline for one live round. The round's state (aged, closed) is a data
   attribute on the band's client wrapper (UpdownMatchState), so nothing here needs :has(). */
.kp-updown {
  position: relative; display: grid; grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "copy" "round" "acts"; align-items: start; row-gap: var(--sp-4);
  padding: var(--sp-5); border: 1px solid var(--border); border-radius: var(--r-xl);
  background: var(--wash-raised); box-shadow: var(--elev-raised);
}
.kp-updown--solo { grid-template-areas: "copy" "acts"; }
@media (min-width: 768px) { .kp-updown { padding: var(--sp-6); row-gap: var(--sp-5); } }
@media (min-width: 1024px) {
  .kp-updown:not(.kp-updown--solo) { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    grid-template-areas: "copy round" "acts round"; column-gap: var(--sp-8); }
  .kp-updown:not(.kp-updown--solo) > .kp-updown__copy { align-self: end; }
  .kp-updown:not(.kp-updown--solo) > .kp-updown__acts { align-self: start; }
  .kp-updown:not(.kp-updown--solo) > .kp-udmatch { align-self: center; padding-top: 0; border-top: 0;
    padding-left: var(--sp-6); border-left: 1px solid var(--border); }
}
.kp-updown__copy { grid-area: copy; min-width: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
.kp-updown__acts { grid-area: acts; display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-3); }
/* (0,2,0) and (0,3,0): they beat the unlayered .btn and .kp-shead__link display rules. */
.kp-updown .kp-updown__next { display: none; }
.kp-updown[data-closed] .kp-updown__all { display: none; }
.kp-updown[data-closed] .kp-updown__next { display: inline-flex; }

.kp-udmatch { grid-area: round; min-width: 0; display: flex; flex-direction: column; gap: var(--sp-4);
  padding-top: var(--sp-4); border-top: 1px solid var(--border); }
@media (min-width: 768px) { .kp-udmatch { gap: var(--sp-5); padding-top: var(--sp-5); } }

/* G1 — identity and clock. Below 768 two rows; from 768 one row, clock on the right. */
.kp-udmatch__head { display: flex; flex-direction: column; gap: var(--sp-2); }
@media (min-width: 768px) { .kp-udmatch__head { flex-direction: row; align-items: center; justify-content: space-between; gap: var(--sp-4); } }
.kp-udmatch__fixture { margin: 0; display: flex; align-items: center; gap: var(--sp-2); min-width: 0; }
.kp-udmatch__mark { --mark: var(--sp-8); }
@media (min-width: 768px) { .kp-udmatch__mark { --mark: var(--sp-10); } }
.kp-udmatch__name { font-family: var(--font-display); font-weight: 600; font-size: var(--type-body); line-height: 1.25; color: var(--text); }

.kp-udclock__row { margin: 0; display: flex; align-items: center; gap: var(--sp-2); min-height: var(--sp-5); }
.kp-udclock__row--closed { display: none; }
.kp-updown[data-closed] .kp-udclock__row--open { display: none; }
.kp-updown[data-closed] .kp-udclock__row--closed { display: flex; }
.kp-udclock__glyph { flex: none; color: var(--text-faint); }
.kp-udclock__cap { font-size: var(--type-small); line-height: 1.35; color: var(--text-subtle); white-space: nowrap; }
.kp-udclock__digits { margin-left: auto; font-family: var(--font-mono); font-weight: 700; font-size: var(--type-h4);
  font-variant-numeric: tabular-nums; line-height: 1.15; color: var(--text); }
/* The Watch link keeps .kp-shead__link's 44px tap box inside a 20px row: the negative margin spends the box
   in the gaps around the row, so the row does not grow at close. (44 = --h-control-md.) */
.kp-udclock__watch { margin-left: auto; margin-block: calc((var(--sp-5) - var(--h-control-md)) / 2); }
@media (min-width: 768px) {
  .kp-udclock__digits { margin-left: 0; font-size: var(--type-h3); }
  .kp-udclock__watch { margin-left: var(--sp-2); }
}

/* G2 — the score: one plate holding the verdict and the two sides. The sides ARE the Up/Down links.
   Concentric radii: plate --r-lg (16) − 4px inset = the buttons' --r-md (12). */
.kp-udbug { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-areas: "mid mid" "up down";
  gap: var(--sp-1); padding: var(--sp-1); background: var(--bg-inset); border: 1px solid var(--border); border-radius: var(--r-lg); }
@media (min-width: 640px) {
  .kp-udbug { grid-template-columns: minmax(112px, 1fr) minmax(0, 2fr) minmax(112px, 1fr);
    grid-template-areas: "up mid down"; align-items: center; }
}
.kp-udbug__mid { grid-area: mid; min-width: 0; display: flex; flex-direction: column; align-items: center;
  gap: var(--sp-1); padding: var(--sp-2); text-align: center; }
.kp-udbug__verdict { margin: 0; font-family: var(--font-display); font-weight: 700; font-size: var(--type-h3);
  line-height: 1.15; letter-spacing: -0.01em; color: var(--text); text-wrap: balance; word-break: keep-all;
  transition: color var(--t-base) var(--m-glide); }
@media (min-width: 768px) { .kp-udbug__verdict { font-size: var(--type-h2); } }
.kp-udbug__arrow { width: 0.8em; height: 0.8em; margin-inline-end: var(--sp-1); vertical-align: -0.05em; }
.kp-udbug__now, .kp-udbug__cta { white-space: nowrap; }
.kp-udbug__was { display: none; white-space: nowrap; }
.kp-udbug[data-lead="up"] .kp-udbug__verdict { color: var(--yes-300); }
.kp-udbug[data-lead="down"] .kp-udbug__verdict { color: var(--no-300); }
.kp-udbug[data-lead="awaiting"] .kp-udbug__verdict { color: var(--text-subtle); }
/* AGED — after the lead rules on purpose: equal specificity, so source order decides. */
.kp-updown[data-aged] .kp-udbug__verdict { color: var(--text-muted); }
.kp-updown[data-aged] .kp-udbug__now { display: none; }
.kp-updown[data-aged] .kp-udbug__was { display: inline; }
.kp-updown[data-closed] .kp-udbug__cta { display: none; }
.kp-udbug__detail, .kp-udbug__note { margin: 0; font-size: var(--type-small); line-height: 1.45; text-wrap: balance; }
.kp-udbug__detail { color: var(--text-muted); }
.kp-udbug__detail .amount { font-weight: 700; color: var(--text); }
.kp-udbug__note { color: var(--text-subtle); }
.kp-udnum { white-space: nowrap; }
.kp-udbug__pick--up, .kp-udbug__side--up { grid-area: up; }
.kp-udbug__pick--down, .kp-udbug__side--down { grid-area: down; }
/* CLOSED — the picks leave; inert, neutral sides with the suspended-selection padlock take their exact box. */
.kp-udbug__side { display: none; align-items: center; justify-content: center; gap: var(--sp-2);
  height: var(--h-control-lg); border: 1px solid var(--border); border-radius: var(--r-md);
  font-weight: 600; font-size: var(--type-body); color: var(--text-subtle); }
.kp-udbug__side > svg { color: var(--text-faint); }
.kp-updown[data-closed] .kp-udbug__pick { display: none; }
.kp-updown[data-closed] .kp-udbug__side { display: flex; }

/* G3 — the match timeline (components/charts/updown-match-track.tsx). Plot 56 · 64 from 768 · 72 from 1024. */
.kp-udtrack { --trk-h: calc(var(--sp-12) + var(--sp-2)); display: grid; grid-template-columns: var(--sp-3) minmax(0, 1fr);
  grid-template-rows: var(--sp-5) var(--trk-h); column-gap: var(--sp-2); padding-inline-end: var(--sp-2); }
@media (min-width: 768px) { .kp-udtrack { --trk-h: var(--sp-16); } }
@media (min-width: 1024px) { .kp-udtrack { --trk-h: calc(var(--sp-16) + var(--sp-2)); } }
.kp-udtrack__gutter { grid-area: 2 / 1; display: flex; flex-direction: column; justify-content: space-around;
  align-items: center; color: var(--text-faint); }
.kp-udtrack__lane { grid-area: 1 / 2; position: relative; }
.kp-udtrack__open { position: absolute; left: 0; bottom: var(--sp-1); font-size: var(--type-small); line-height: 1;
  white-space: nowrap; color: var(--text-subtle); }
.kp-udtrack__mark { position: absolute; left: var(--x); bottom: var(--sp-1); transform: translateX(-50%); line-height: 0; color: var(--text-subtle); }
.kp-udtrack__mark--end { transform: translateX(-23%); }          /* the flag's pole sits on the finish post */
.kp-udtrack__plot { grid-area: 2 / 2; position: relative; }
.kp-udtrack__svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.kp-udtrack__rail { stroke: var(--text-faint); stroke-width: 2; stroke-linecap: round; }
.kp-udtrack__locked { stroke: var(--text-subtle); stroke-width: 1; stroke-dasharray: 2 5; opacity: 0.55; }
.kp-udtrack__post { stroke: var(--text-faint); stroke-width: 1; }
.kp-udtrack__void { fill: color-mix(in oklab, var(--text-subtle) 22%, transparent); }
.kp-udtrack__kick { fill: var(--text-subtle); }
.kp-udtrack__tie { stroke: var(--text-muted); stroke-width: 2; stroke-linecap: round; }
.kp-udtrack__stem { stroke-width: 2; stroke-linecap: round; }
.kp-udtrack__stem--up { stroke: color-mix(in oklab, var(--yes-400) 70%, transparent); }
.kp-udtrack__stem--down { stroke: color-mix(in oklab, var(--no-400) 70%, transparent); }
.kp-udtrack__stem--latest { stroke-width: 3; }
.kp-udtrack__stem--latest.kp-udtrack__stem--up { stroke: var(--yes-400); }
.kp-udtrack__stem--latest.kp-udtrack__stem--down { stroke: var(--no-400); }
.kp-udtrack__bead--up { fill: var(--yes-300); transform: translateY(-4px); }
.kp-udtrack__bead--down { fill: var(--no-300); transform: translateY(4px); }
.kp-udtrack__elapsed { position: absolute; left: 0; top: calc(50% - 1px); height: 2px; width: var(--x);
  background: var(--text-subtle); border-radius: var(--r-pill); pointer-events: none; }
.kp-udtrack__now { position: absolute; top: 20%; bottom: 20%; left: var(--x); width: 2px; margin-left: -1px;
  background: var(--text-muted); border-radius: var(--r-pill); pointer-events: none; }

/* G4 — the terms: one glyph column, hanging indent, two sentences in two inks. */
.kp-udrule { margin: 0; display: grid; grid-template-columns: var(--sp-3) minmax(0, 1fr); column-gap: var(--sp-2);
  font-size: var(--type-small); line-height: 1.45; text-wrap: pretty; }
.kp-udrule__glyph { display: flex; align-items: center; height: 1.45em; color: var(--text-subtle); }
.kp-udrule__decides { color: var(--text-muted); }
.kp-udrule__refund { color: var(--text-subtle); }
/* keep-all everywhere EXCEPT zh — the trust band's measured rule (trust-band.tsx ~89). */
html:not([lang="zh"]) :is(.kp-udbug__detail, .kp-udbug__note, .kp-udrule) { word-break: keep-all; overflow-wrap: break-word; }
```

Notes for the engineer:
- **Phone-only blocks:** there is no `max-width` block. Any one added must open with `/* density: general — <why> */` (`test:density-contract`).
- **Tailwind scans comments:** write no class-shaped string (`text-[…]`, `min-h-[…]`) in any comment.
- **Motion gates:** every transition here is clamped by the three motion gates in `motion.css`.

---

## 7. i18n (`src/lib/i18n-dict.ts`)

Put `// drafted, marked for native review; English is binding.` above the new sw block and above the new zh block. Write em-dashes and fullwidth punctuation as literal characters, then byte-grep the file: Edit and `node -e` decode typed escapes.

**New `t.home` keys (21):**

| key | en | sw | zh |
|---|---|---|---|
| udMatchUpLeads | Up leads | Juu inaongoza | 涨方领先 |
| udMatchDownLeads | Down leads | Chini inaongoza | 跌方领先 |
| udMatchUpLed | Up led | Juu iliongoza | 涨方曾领先 |
| udMatchDownLed | Down led | Chini iliongoza | 跌方曾领先 |
| udMatchNobody | Nobody leads | Hakuna anayeongoza | 暂无领先方 |
| udMatchNobodyWas | Nobody led | Hakuna aliyeongoza | 当时无领先方 |
| udMatchKickoff | Kick-off | Mwanzo | 开局 |
| udMatchPickSide | Pick a side | Chagua upande | 选择一方 |
| udMatchAt | at {time} | saa {time} | {time} 时 |
| udMatchNoNewPrice | No new price since the open at {time} | Bado hakuna bei mpya tangu ufunguzi saa {time} | 自 {time} 开盘以来暂无新价格 |
| udMatchOpenedAt | Opened at {time} | Ilifunguliwa saa {time} | {time} 开盘 |
| udMatchLevelExact | Exactly at the opening price | Sawa kabisa na bei ya ufunguzi | 与开盘价完全相同 |
| udMatchLevelNote | If it closes here, every stake comes back. | Ikifunga hapa, kila dau linarudi. | 若以此价收盘，所有投注全额退还。 |
| udMatchDecides | The price at {close} decides. | Bei ya saa {close} inaamua. | 以 {close} 的价格判定。 |
| udMatchRefund | Less than {margin} from the open, and every stake comes back. | Tofauti ikiwa ndogo kuliko {margin}, kila dau linarudi. | 与开盘价相差不足 {margin}，所有投注全额退还。 |
| udMatchRefundRange | {upWord} at {up} or higher, {downWord} at {down} or lower — in between, every stake comes back. | {upWord} kwa {up} au zaidi, {downWord} kwa {down} au pungufu — katikati, kila dau linarudi. | {up} 或以上为{upWord}，{down} 或以下为{downWord}；介于两者之间，所有投注全额退还。 |
| udMatchAllRounds | All rounds | Raundi zote | 全部回合 |
| udMatchNextRound | Play the next round | Cheza raundi ijayo | 玩下一回合 |
| udMatchAria | Round timeline: opened {open}, betting closes {lock}, the price at {close} decides (EAT). Confirmed prices since the open: {reads}. | Ratiba ya raundi: ilifunguliwa {open}, dau linafungwa {lock}, bei ya saa {close} ndiyo inaamua (EAT). Bei zilizothibitishwa tangu ufunguzi: {reads}. | 回合时间线：{open} 开盘，{lock} 停止下注，以 {close} 的价格判定（EAT）。开盘后的确认价格：{reads}。 |
| udMatchAriaNone | none yet | bado hakuna | 暂无 |
| udMatchAriaRead | {time}: {move} | saa {time}: {move} | {time}：{move} |

**`t.market`:**

| key | en | sw | zh | note |
|---|---|---|---|---|
| udLevelBy (new) | Only {amount} from the open — not enough to decide | Tofauti {amount} tu — haitoshi kuamua | 与开盘价仅差 {amount}，不足以判定 | band and round page (§12) |
| udConfirmedPrice (renamed from `udLivePrice`, one call site) | Confirmed price | Bei iliyothibitishwa | 确认价格 | round page (§12) |

**Reused unchanged:**
- `t.market`: `udBetsCloseIn`, `udLockedTitle`, `udRcWatchRound`, `udAboveOpenBy`, `udBelowOpenBy`, `udOpenPrice`, `udAwaitingRead`, `udMin`, `udTitle`, `udTagline`, `udUp`/`udDown` (via `sideWord`), `udQuoted` (round page).
- `t.home`: `updownEyebrow`, `updownRoundsLive`, `updownRoundsLiveOne`, `updownStartsSoon`, `updownCta` (S8).

**Deleted:** `home.udDashed` in en (~630), sw (~3310) and zh (~5510). `udSelectionsClosed` stays, because the `/updown` card uses it.

**Word choices:**
- **No "Chini ya …" in any refund sentence.** "Chini" is the Down side's name.
- **No "batili" on the band.** It stays the round page's settled word.
- **"Dau linafungwa baada ya"** is the product's one form for "bets close" (C3).
- **Level lines never name a side** (I-2).
- **"saa {time}" uses 24-hour digits.** The native reviewer confirms this reads as clock time, not Swahili time (§15.7).

---

## 8. States

| # | Condition | Clock row | Plate centre | Sides | Track | Terms / acts |
|---|---|---|---|---|---|---|
| S1 | newest post-open read ≥ `upTarget`, not aged | clock glyph, caption, digits | ↑ `udMatchUpLeads` in `--yes-300`; `saa 14:26 · Juu ya ufunguzi kwa $18.52` | live links | stems; newest with bead | rule; "Raundi zote ›" |
| S2 | newest ≤ `downTarget` | same | the mirror, `--no-300` | live | mirror | same |
| S3 | newest strictly between the targets | same | `udMatchNobody` in `--text`; `udLevelBy` or `udMatchLevelExact`; `udMatchLevelNote` | live | void band if ≥2.8%; tie tick; no stem | same |
| S4 | open confirmed, no post-open read | same | `Mwanzo · Chagua upande`; `udMatchNoNewPrice` (aged: `udMatchOpenedAt`) | live | opening dot, rail, playhead | same |
| S5 (client or server) | now ≥ min(staleAt, closesAt) | unchanged | `…Led` / `udMatchNobodyWas` in `--text-muted` (220ms colour fade); detail unchanged | live while betting is open | stems unchanged: dated facts | same |
| S6 | open or targets null, or `reads: null` | same | `udAwaitingRead` in `--text-subtle`; no second line | live | rail, posts, playhead; lane "Ufunguzi" | no rule without targets |
| S7 (client) | secondsUntil(betsClose) = 0 | lock, `udLockedTitle`, "TAZAMA RAUNDI HII ›" | unchanged and dated; past tense at `closesAt`; kick-off CTA hides | inert padlock sides, same 48px box | playhead runs on to the flag and stops | "Cheza raundi ijayo ›" primary |
| S8 | no live round, or none readable | — | — | — | — | `kp-updown--solo`, exactly today |

What moves the band between these rows:
- **Server tense:** the wrapper renders `data-aged` at SSR when the round is already aged.
- **Client flips:** at most two (aged, closed), each a single attribute swap.
- **Focus:** if focus is on a pick at close, it moves to the Watch link, just above.

---

## 9. Motion

- **Nothing about a price animates.** Stems and bead arrive with the band's existing `Reveal` and never grow or slide (L12, A-5).
- **What changes after render:**
  - the digits, once a second on the shared ticker (WP15);
  - the playhead and played stretch, only when the quarter-percent position moves (≤1/s, no transition), on the same tick as the digits;
  - the `data-aged` and `data-closed` swaps, which are instant except for the verdict's colour (`--t-base` / `--m-glide`).
- **Loops:** the landing band adds none. `ud-count-pulse` is not used here, so the page's one loop is the live dot (K20 "at most two").
- **Colour:** the digits are never rose (§B2a). They are `--text`, and are hidden at close.
- **Reduced motion and Save-Data:** the three gates (`motion.css` ~285–300) clamp the one transition to an instant snap. Nothing new needs a branch.

---

## 10. Accessibility

- **Round panel:** `role="group"`, named by the fixture ("Bitcoin 10 dakika"). Its controls:
  - two picks (`btn-lg`, 48px);
  - at close, the Watch link (44px box) and the primary (48px).
  - All are at or above `--tap-min`.
- **Screen-reader order (S1, sw):**
  1. eyebrow;
  2. h2, tagline;
  3. "Bitcoin 10 dakika";
  4. timer "Dau linafungwa baada ya 01:52" (the visible caption is aria-hidden, so it is read once; `role="timer"` is not live);
  5. "Juu inaongoza";
  6. "saa 14:26 · Juu ya ufunguzi kwa $18.52";
  7. link Juu, link Chini;
  8. image: the timeline in words, with EAT;
  9. the rule;
  10. link "Raundi zote".
- **Order:** the DOM puts the verdict before the picks. Tab order (Up, then Down) matches the screen left to right (WCAG 1.3.2, 2.4.3).
- **Colour is never the only signal (1.4.1):**
  - the verdict has words and an arrow;
  - the picks have words and arrows;
  - stems carry position and the gutter arrows;
  - closed sides carry a padlock and neutral ink.
- **Tense swap:** the hidden span is `display: none`, so exactly one tense is ever announced.
- **K22:** the track is `role="img"` with `udMatchAria`, and its children are aria-hidden.
- **Wrapping:**
  - `keep-all` except zh on the paragraphs; `keep-all` on the short verdict in every locale;
  - money and times are `nowrap`, so they never split (M4, M4a);
  - the caption is `nowrap` and measured to fit at 320px.

---

## 11. Honesty ledger and the hard rules

| On screen | Source | Why it is true |
|---|---|---|
| Juu / Chini leads, Nobody leads | `decideOutcomeByTargets` on the newest post-open CONFIRMED read, imported unchanged | The settlement function itself |
| "saa 14:26" | the read's `boundaryAt` (= its `quotedAt`) | A dated claim, never "now" |
| Past tense | `matchAgedAtMs`: shared `quoteStaleAtMs` or `closesAt`, in SSR and on the client wrapper | Works without `:has()`; a tab left open stays honest |
| "Juu ya ufunguzi kwa $x" | read − `openPrice` | The words are never dropped at any width |
| Level line | read − open, no side name | Never "Juu ya …" beside "Hakuna anayeongoza" |
| Kick-off line | "no new price since the open" while fresh, "Opened at" once aged | The same freshness rule as the verdict |
| Stems | `roundReads` at their boundary times | Real points only, no line between them (§B12.3) |
| Rule | `upTarget`, `downTarget`, `closesAt` | Strict "less than" / "ndogo kuliko" matches the strict void test |
| Clock, playhead | `selectionClosedAt ?? closesAt`, `closesAt`, `serverNowMs` | Server-anchored (E-72), seeded, re-anchored on Back |

**Hard rules, checked:**
- **No invented or stale-as-live price:**
  - no absolute price anywhere on the band;
  - every verdict is dated and flips tense;
  - no "live" touches a number: the source line and the live count are gone while a round shows, and the eyebrow's "hai" is about the game.
- **Law 40:** no payout, multiplier, estimate or pool, and the type holds no money field.
- **L17:** the only urgency is the real countdown. No pulse, no lit leader.
- **L8, M3:** nothing gold.
- **Tokens-only CSS:** tokens and `calc()` of tokens. The only literals are stroke widths, 112px grid minimums and em ratios.
- **Charts in `components/charts/`:** the track, the playhead leaf and the geometry all live there, and D5 guards them.
- **No per-second re-render except the clock:** only the digits (1/s) and the playhead (≤1/s), under the amended WP15.
- **Language parity:** sw, en and zh keys stay at parity.
- **12.5px sentence floor:** every sentence is at 13px. The sub-13px labels are the kit's own.
- **40px tap floor:** every control is 44–48px.

---

## 12. The round page agrees with the band (I-6, same release)

`src/app/updown/[roundId]/page.tsx`:
- **~481:** `priceLabel: decided ? t.market.udClosePrice : t.market.udConfirmedPrice`. It no longer says "Bei ya sasa / Live price".
- **~159:** while `!decided`, move the stamp off the source class.
  - `source = t.market[SOURCE_CLASS_KEY[asset.sourceClass]]`: the class alone, never touching a price stamp.
  - The stamp joins the move line: `aboveBelow = [moveText, stamp].filter(Boolean).join(" · ")`, with `stamp = asset.sourceQuotedAt ? \`${t.market.udQuoted} ${fmtEAT(asset.sourceQuotedAt)}\` : null`.
  - The round page keeps "EAT".
  - Decided rounds keep today's strings.
- **Tone, computed on the server:**
  - `const o = heroLive != null ? decideOutcomeByTargets(heroLive, round.upTarget, round.downTarget) : null;`
  - `tone = !o || o.voidReason === "source-failed" ? null : o.outcome === "UP" ? "up" : o.outcome === "DOWN" ? "down" : "level"`.
- **Level move text:** when `tone === "level"` and the move is not 0, `moveText = fill(t.market.udLevelBy, { amount: \`$${Math.abs(move).toFixed(dec)}\` })`. This is the band's own words.

`src/components/updown/price-hero.tsx` (a pinned named member):
- A new optional prop `tone?: "up" | "down" | "level" | null`.
- `ink` and `movePct` ink become `tone ? (tone === "level" ? var(--text-muted) : tone === "up" ? var(--yes-300) : var(--no-300)) : <today's E-261 rule>`.
- Add `data-tone={tone ?? (flat ? "level" : isUp ? "up" : "down")}` on the `<section>`.
- `isUp` (label placement) is untouched.
- Extend the E-261 comment: a banded round voids anywhere inside its band, not only at exactly flat, so "flat" generalises to "strictly between the targets".

Both pages can now describe one read at one minute only one way. The flow from the band into the page reads "Juu iliongoza saa 14:26" → "BEI ILIYOTHIBITISHWA … imenukuliwa 14:26:00 EAT" in the same ink.

**Not in this release (F1):**
- The `/updown` card (`updown-card.tsx` ~649) and `terminal-chart.tsx` still colour by the open, until F1.
- Record this split in DESIGN_AUTHORITY §B12.2 (§14). It is inside the void band only.

---

## 13. Delete, in the same commit

- **Files:** `src\components\charts\updown-price-line.tsx` and `src\components\charts\updown-ring.tsx`. Their only importer is the band.
- **CSS:** all of 5407–5469, including:
  - the old `.kp-updown` grid;
  - `.kp-updown__bet`, `__round`, `__head`, `__open`, `__rules`, `__rule--up`, `__rule--down`, `__viz`, `__note`;
  - the `:has(.kp-udring[data-closed])` rule;
  - `.kp-udchart*` and `.kp-udring*`.
- **i18n:** `home.udDashed` ×3. `market.udLivePrice` is renamed, not duplicated.
- **Moved out of existing files:**
  - `updown-card.tsx`'s private `AssetMark`, `ASSET_MARKS` and `markFor` (the card re-exports).
  - `page.tsx`'s inline `UD_MIN_LEFT_MS` and candidate sort.
  - The `UpdownBandRound` type in `updown-band.tsx`, which moves to `src/lib/updown-match.ts`.
  - `priceSeriesFor`'s name; its body lives on as `roundReadWindow` + `seriesFromReads`.
- **`asset-mark.tsx` carries zero style literals:**
  - size comes from `--mark` (via `className`, or an inline `--mark` only when a `size` prop is passed);
  - `.ud-mark` sets width, height, radius (50%), `font-size: var(--type-small)`, and the metal variant as a class;
  - `.ud-mark[data-lg]` keeps the card's 14px at 44px and up.

  Check the card at 40px and the round page's mark in a frame.

---

## 14. Docs, in the same commit

- **`docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md` §2:** add **R5 (2026-09-27)**.
  - Ali's words: *"people don't really like these graphs much — don't think anyone understands them. We need something more elite, more unique, more visually appealing"* and *"a design rated visually perfect and 10/10 by UI/UX, graphical engineers specialized in the gambling industry"*.
  - Ruling: the chart becomes the Match (spec v2). It amends K19, K20's wording, WP12 and WP15.
- **`docs/LANDING-TEN.md`:**
  - §0: ask (a) is in build per v2.
  - The WP12 row (§1, ~115): ✅ becomes 🔨 "R5 — the Match (spec v2)".
  - §2.1 WP12 is rewritten from §2–§4 of this spec.
  - WP15: "per-second work only inside the countdowns and the Up & Down playhead (server-anchored, no transition)"; drop "the price-line animation".
  - K19: "Up & Down: match scoreboard from the last confirmed price, dated, with the Up/Down buttons in it; open→finish match track (a stem per confirmed read, lock at bets close, flag at the deciding price, playhead); one-line countdown".
  - K20: "At most two loops".
  - New subsections under WP12: **Hallway test** and **Frame rating** (the §15.7 and §15.8 records).
- **`docs/design-system/v4-2026-09-26-landing-ten/ACCEPTANCE.md` ~49–50:** the same K19 wording, and "At most two loops".
- **`docs/DESIGN_AUTHORITY.md` §B12.2**, two lines:
  1. The landing match track's rail is a neutral time rail that doubles as the open. It carries no gilt (L8). This is a recorded split from the round-page hero's gilt dashed open.
  2. Since R5, the round-page hero's value ink follows the round's targets: UP ≥ `upTarget`, DOWN ≤ `downTarget`, muted between. This is E-261 generalised. The `/updown` card and terminal follow in F1.
- **`docs/DESIGN-BASELINE.md` §8**, one line: the match track is a timeline of confirmed-read stems, not the round price chart removed on 2026-09-04.
- **V18 note** in LANDING-TEN: the band shows no pool or source by ruling (R5 / §16-2) and is outside V18's population. If Ali reverses §16-2, the band joins V18 with `data-market-part` tags.

---

## 15. Verification

Run heavy Node one step at a time through `bash ~/heavy-node-lock.sh run landing <cmd>`.
- Never wrap a lock-run in `timeout`.
- Never pipe a gate through `tail`: a pipe hides its exit code.
- Check each script name exists in `package.json` before reading an empty log as a failure.

### 15.1 Guards

**`test:updown-match` (new).** It must assert all of the following. Prove each assertion bites by running it in the same file against a deliberately wrong implementation (`>` for `>=`, an x-domain ending at the last read, a bare 5-minute floor, `reach` 1.25, a young candidate walked past). Do not use a repo-mutating red harness.
1. The side equals `decideOutcomeByTargets` at `price == upTarget` (UP), `== downTarget` (DOWN) and open ± 1 tick (LEVEL).
2. The x-domain is fixed at [opensAt, closesAt]. The gate is at 83.33% for 5, 10, 15, 30 and 60 minutes, and at 75% for 3.
3. A read at opensAt, or after serverNow, is excluded.
4. The D floors hold (5 × margin, 5 bps, 1.1 × max). Stems stay within [10, 40]%, and every tip clears the void band's edge.
5. The void band is absent for BTC and present at ≥2.8% for gold.
6. `quoteStaleAtMs` gives exactly the old `>` boundary, and a null cadence falls to 5 minutes.
7. `matchAgedAtMs` = min(stale, close). Kick-off ages from the open.
8. `matchLead` covers all five leads, and `reads: null` gives awaiting.
9. `pickBandCandidates` keeps only ≥2 min left, then orders seasoned first, shortest result phase, most time left, and slices to 3. The walk stops at the first young candidate.
10. `UpdownBandRound` has no key matching `/pool|rate|volume|player|payout|price$/i`, except `openPrice`.

**`test:chart-one-home`:**
- Add D5 = `/<(?:line|circle)\b[\s\S]{0,300}?\b(?:x1|x2|cx)=\{/` with its §0 fixture pair.
- The two deleted members must be gone, and `updown-match-track.tsx` and `updown-match-now.tsx` must be members.
- Then run `red:chart-one-home`.

**Other gates:**
- `test:design-frozen`: new files at zero; shrink `updown-card.tsx` if the hoist emptied it.
- `test:type-scale`, `test:tap-target`, `test:density-contract`.
- `test:i18n`: no sw or zh value equal to en.
- `test:motion`, `test:reduce-motion`, `test:hooks-order`, `test:glyph-motion`.
- `test:gold-is-money`: nothing new is gold.
- **`test:contrast`**, new pairs:
  - Text ≥4.5:1: `--text`, `--text-muted`, `--text-subtle`, `--yes-300`, `--no-300` on `--bg-inset` (the plate) and on `--wash-raised`'s lighter stop (the panel).
  - Non-text ≥3:1 on the lighter stop:
    - the rail and posts (`--text-faint`);
    - the gutter and clock glyphs (`--text-faint`);
    - the stems (`--yes-400`/`--no-400`, and their 70% mixes composited as §A1 requires);
    - the playhead (`--text-muted`) and the played stretch (`--text-subtle`).
- **`test:betting-ink`**, a new section:
  - `.kp-udclock*`, `.kp-udtrack__rail|locked|post|mark|open|now|elapsed` and `updown-match-digits.tsx` hold no `var(--yes-NNN|--no-NNN)`;
  - a planted copy with the digits in `--no-300` must fail.
- `test:terminal-series` (the stale hoist), `test:updown-chart` (the hero series is unchanged), `test:updown-engine` and `test:settlement-gate` (settlement untouched).
- **`red:updown-chart`, alone.** It edits `price-hero.tsx` in place and restores it. Confirm its anchors still resolve exactly once after the `tone` change, and that `git status` is clean afterwards.
- `test:landing-contract`; `test:landing-ten-plan` after the doc edits.

### 15.2 Build, then a real render

tsc and build, then render: a green build is not a render.
1. `rm -rf .next` (the whole folder).
2. Run one `next dev` on **localhost** (never 127.0.0.1: the page never hydrates there).
3. Seed rounds:
   - `POST /api/dev-test/updown-seed` with `{"durations":[3,5,10],"feedProvider":"mock-bars"}` gives dated, decisive reads for S1 and S2;
   - `"mock"` gives a constant price, for S3;
   - `POST /api/dev-test/updown-advance` drives the boundaries.
4. Load `/` in sw, en and zh. Check the console: no hydration warnings.

### 15.3 States

| State | How to produce it |
|---|---|
| S1, S2 | `mock-bars` |
| S3 | `mock` |
| S4 | a fresh round before its first post-open read |
| S6 | before the open confirms |
| S5, S7 | Playwright `page.clock.install()` before navigation, then `fastForward` past agedAt, betsCloseAt and closesAt |
| S8 | chains paused |

For S5 and S7, check:
- past tense and muted verdict;
- picks replaced by the padlock sides, in the same box;
- focus moved from Juu to the Watch link;
- "Raundi zote ›" replaced by "Cheza raundi ijayo ›";
- the playhead parked at the flag.

Then Back/Forward: the digits, playhead and flags re-anchor.

### 15.4 Numeric frame gate (`band-metrics.mjs`)

It measures by bounding box, prints the figures, and exits 1 on any breach. **Its RED control:** `METRICS_PROVE_RED=1` injects a style that wraps the caption and lengthens the band, and the drive must report both.

| Width, locale, state | Must hold |
|---|---|
| 360 sw S1, S2, S5, S6 | band ≤ 600px; clock-row top to pick bottom ≤ 170px; verdict 1 line; detail 1 line when \|Δ\| < $1,000; clock row 1 line; rule ≤ 2 lines; picks 48px tall, equal width ±1px |
| 360 sw S3 | band ≤ 640px |
| 360 sw S4 | band ≤ 620px |
| 360 sw S7 | band ≤ S1 + 4px; the clock row does not change height |
| 320 and 360, every state | no horizontal overflow (V1); nothing clipped (V2) |
| 768 en | one-row plate; fixture and clock on one row; sides ≥ 112px |
| 1024 en | 5/7 split; round column ≥ 480px; verdict at 24px on 1 line |
| 1280 en/sw/zh | band ≤ 380px; picks vertically centred ±1px; rule ≤ 2 lines |
| All | green marks in S1 ≤ 4 kinds (verdict, Up pick, newest stem and bead, earlier Up stems); no new text under 13px outside the kit's Chip, eyebrow and section link |

Also record the chat button's corner at 360 (V3).

### 15.5 Served HTML

`curl` the served `/` and grep the band's sentences for eaten spaces:
- `kwa<span`, `·Juu`, `inaamua.Tofauti`, `14:26·`, `upandeBado`;
- and the reverse: none of these may appear.

The `/updown/[id]` hero must look unchanged apart from §12.

### 15.6 Agreement drive (`band-agree.mjs`)

1. On `/`, read `.kp-udbug[data-lead]`, the detail's HH:MM, and the Juu pick's `href`.
2. Follow the `href`.
3. On the round page, read `section[data-tone]` and the stamp's HH:MM in the move line.
4. When the stamps match, `lead` must equal `tone`. Kick-off and awaiting are skipped, with a note.

Run it locally in sw, en and zh. After deploy, run it on production at three different minutes.

### 15.7 Hallway test and native review: a ship gate (I-7)

**Who:**
- 8–10 adult Swahili speakers who follow football and do not work in crypto;
- one mid-range Android at 360 width, default brightness;
- one person at a time.

**What:** frames shown full-screen for 3 seconds each, then hidden:
- A = S1, sw;
- B = S4, sw;
- C = S1, sw, with `.kp-udtrack` hidden by an injected style at capture (no product code).

**Questions**, asked in Swahili with answers recorded verbatim:
- **Q1** Nani anaongoza? (who is ahead)
- **Q2** Dau linafungwa lini? (when does betting close)
- **Q3** Bei isiposogea, nini kinatokea? (if the price doesn't move, what happens)
- **Q4** Ukibonyeza JUU, nini kinatokea? (what does tapping JUU do)

**Correct answers:**

| Q | Correct | Wrong |
|---|---|---|
| Q1 (A) | "Juu" | — |
| Q1 (B) | "nobody yet / it has just started" | — |
| Q2 | "in about 2 minutes" | "at 1:52" |
| Q3 | "every stake comes back" | — |
| Q4 | "it opens the round to bet on Juu" | "I have bet" |

**Pass:**
- ≥80% correct on Q1, Q2 and Q4 for A, and on Q2 and Q4 for B.
- Q3 below 60% forces a rewrite of the refund sentence and a re-test.
- Compare Q1 between A and C. If the two are within one person, record it for F3 (dropping the track below 480px is Ali's call).

**Native review** (one sw native reviewer, one zh):
- sw strings: "Juu inaongoza / iliongoza", "Hakuna anayeongoza / aliyeongoza", "Mwanzo · Chagua upande", "Dau linafungwa baada ya", "saa {time}" with 24-hour digits, "Tofauti ikiwa ndogo kuliko {margin}, kila dau linarudi", "Tofauti {amount} tu — haitoshi kuamua", "Cheza raundi ijayo", "Bei iliyothibitishwa";
- every zh string in §7.

Record the results in LANDING-TEN WP12 "Hallway test": initials, phone model, answers and verdict.

### 15.8 Frame rating: every score must be 10 before shipping

**Frames:** real local frames, viewport tiles from `scripts/qa/landing-v3/capture.mjs` (never full-page):
- S1 at 360, 768 and 1280 × sw, en and zh (9 frames);
- S2–S7 at 360 sw and 1280 en;
- S3 and S4 at 360 zh;
- the click-through pair: the band, then the round page, at 360 sw.

**Panel:** four reviewers score every frame from 1 to 10 on their own rubric.

| Reviewer | Scores against |
|---|---|
| UI/UX lead | The 3-second read (verdict, clock and tap in one glance); one focal point; one-line clock; no false affordance; the flow into the round page; the closed state's path forward |
| Graphic designer | The glyph column and hanging indents; group rhythm; ≤4 type roles; the colour budget; concentric radii; wrap quality in all three scripts; track legibility (stems vs bead vs playhead) |
| Gambling-industry designer | Up left in green, Down right in rose; the selection lives in the match row; timer placement; no padlock while open; padlock sides when closed; next-round path; no chasing cue; dollars minimal |
| Accessibility and RG reviewer | `test:contrast` figures; screen-reader order; timer semantics; focus move; reduced motion; law 40; no stale-as-live; L17 (no pulse, no lit leader); refund stated; sw/en/zh parity |

**Rules:**
- A frame's score is the lowest score any reviewer gives it.
- Every frame must reach 10.
- Any score below 10 must name the frame and the defect. It is fixed, all affected frames are re-captured, and the **whole panel** re-scores them, not just the reviewer who flagged it.
- Scores are recorded in LANDING-TEN WP12 "Frame rating".
- Ali sees the final frames before the push.

### 15.9 Production, after the push

1. Confirm the deployed commit against `origin` (the `?dpl=` preload header).
2. Run `band-agree.mjs` on production three times.
3. Check that the band's "saa HH:MM" matches the `/updown` card's quoted time for that asset, to the minute.
4. Run `qa:landing-ten` V1, V2, V4, V5, V11, V16 and V17 on `/`.
5. Re-shoot S1 at 360 sw on production and look at it.

---

## 16. Open for Ali

Defaults are chosen, and nothing blocks the build.

1. **Refresh the band's confirmed price every 60 seconds while the tab is visible?**
   - **Recommended: yes.**
   - Without it, an open tab turns grey ("Juu iliongoza") after about 7.5 minutes.
   - It reuses `GET /api/updown/history?asset=…&range=15M`: public, 10-second shared cache, no new server code.
   - It needs your ruling under L12, WP15 and law 42. The build ships static until you say yes; then it is a small follow-up (F2).
2. **Keep the pool and player count off the band?**
   - **Recommended: yes (current default).**
   - The round page shows them, and warns about a one-sided round before any stake is confirmed.
3. **Name the hallway-test people:** 8–10 Swahili speakers, plus one Swahili and one Chinese native reviewer.
4. **Next build (F1): give the `/updown` card and the terminal the same "Confirmed price" label and targets-based colour?** **Recommended: yes.**
5. **Chat bubble at 360:** unchanged; it stays your call (V3).

**Follow-ups, not in this build:**
- **F1:** card and terminal agreement (the E-261 generalisation).
- **F2:** the 60-second refresh, if yes.
- **F3:** drop the track below 480px, only if the no-track variant tests equal and you agree.
- **F4:** review the sitewide "Live … market" source wording (`udSource*`).