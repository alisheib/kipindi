# Hero — final design

> **⭐ R9 (Ali, 2026-09-27, as owner): ship claim STATE P now — "Tanzania's first licensed prediction market" / "Soko la kwanza
> la utabiri lenye leseni Tanzania" / "坦桑尼亚首家持牌预测市场".** `FIRST_LICENSED_EVIDENCE()` = 2026-09-27, citing R9 (owner's
> attestation + the Board's licence-fee acknowledgement of 2026-09-05). Keep "licensed" in the claim. Native sw review: R8.

> **⭐ RULED by Ali, 2026-09-27 — INHERIT-MANIFEST R7.** Build: claim state N now ("first" gated on the Board's letter);
> drop the warning sentence, keep the quiet 18+ · licence · helpline row; headline "NDIO au HAPANA?"; locked fonts, then a
> Bricolage Grotesque headline TRIAL for Ali to judge on real frames; neutral 18+ ink site-wide; all four wallets named after a
> test payout each; a Tanzanian reviewer approves every new sw line BEFORE push; retire "Tabiri matukio. Si bahati." (next
> small build); defaults for Q9 (9a) and Q10 (10a). The QUESTIONS FOR ALI section below is answered by this note.


**For Ali, in three lines:**
1. On a phone, the first screen now reads: **"50pick │ SOKO LA UTABIRI LENYE LESENI TANZANIA"**, then a big question in the reader's language, **"NDIO au HAPANA?"**, then **"Chagua upande, weka dau. Ukiwa sahihi, unalipwa."**
2. The gambling warning is gone from the hero; the footer still carries it on every page. The first screen on a phone now shows 18+, the Gaming Board licence, the helpline number and your four wallets by name, above the live market. Today none of these reach the first screen on a phone.
3. There's no new font. The "basic" feeling came from the layout, and that's what changes. The word "first" goes live automatically on the day you give us the Board's letter. The questions at the end each carry my recommendation.

---

## 1. The decision

**Winner: Local ("NDIO au HAPANA?").** It ranked first with players (8) and the marketer (8.6), first with managers (17 of 20), and second with the visual judge (7.5). It passes the compliance gate with fixes.

**What I took from the other concepts:**
- **From Pioneer:**
  - no eyebrow and no sub-line;
  - the trust rows move above the card;
  - the brand line becomes a sign-off (a real lockup);
  - the headline goes to 60px from a 640px screen;
  - tracking tightens as the size grows;
  - YES/NO colours move to the deeper shade that matches the buttons;
  - a neutral 18+ roundel (Q5).
- **From Wisdom:**
  - no claim the facts can't carry: "official sources" is out, and no "crowd" claims;
  - "first" is locked in code until the evidence exists.
- **From Skill:**
  - a class of its own for the claim, because the shared eyebrow class also styles 7 other places;
  - an `<hgroup>`;
  - text stored in sentence case, with CSS doing the capitals;
  - real mono 600, not a faked bold.

**What I rejected, and why:**
- **"Matokeo rasmi / official results"** is not accurate: sources include CoinGecko and ITV.
- **"si mashine" (not a machine)** is false today: the auto-resolver can settle a market on its own.
- **"mgao"** reads as TANESCO power rationing.
- **"Leseni ya GBT"** and **the licence number** in the hero: players don't know the acronym, and the number reads like noise to them.
- **`sealCheck` next to "first"**: it looks as if the Board certified the word.
- **A new display face**: covered in Q3.

---

## 2. The first screen

**360 × 740, Swahili, visitor** (the positions are a model; §7 says what has to be measured)
```
  0 ┌──────────────────────────────────────┐
    │ ◐                [SW] (Ingia)(Jisajili)│
    │ ● MUBASHARA  …ticker…              ‖  │
 89 ├──────────────────────────────────────┤ claret edge
109 │ 50pick │ SOKO LA UTABIRI LENYE        │ mono 600 13 caps, --text
    │        │ LESENI TANZANIA              │
152 │ NDIO au                              │ Sora 44/1.0: NDIO 800 yes-400, au 400 muted
    │ HAPANA?                              │ HAPANA 800 no-400, ? 800 white
252 │ Chagua upande, weka dau.             │ Inter 500 17 --text
    │ Ukiwa sahihi, unalipwa.              │ Inter 400 17 --text-muted
319 │ (18+) Leseni ya Bodi ya Michezo ya   │ Inter 13 muted, helpline is a tel: link
    │       Kubahatisha Tanzania. Simu ya msaada 0800 11 0011
366 │  ▯    Weka na toa pesa kwa M-Pesa,   │ wallet names Inter 500 --text
    │       Airtel Money, HaloPesa au Mixx by Yas.
425 │ ┌──────────────────────────────────┐ │ featured card (unchanged)
    │ │ ● MUBASHARA  ⚖ NYINGINE     NDIO │ │
    │ │ Je, Marekani na Iran …       40% │ │ 509 price ends
    │ │ ━━━━━━━━━━━━┃━━━━━━━━━━━━━━━━━━━ │ │
    │ │ [ NDIO @ 40% ]  [ HAPANA @ 60% ] │ │ 610 YES/NO ends
675 ╞══ bottom rail (real 360×740) ═══════╡ 65px clear
    below: card end 705, then (Anza kutabiri →), then (Tazama masoko yote 50), then ◐ The wisdom of YES & NO.
```

**1280 × 800, English**
```
◐ 50pick.tz  Markets  • Up & Down  Live  Results  Top        EN ▾ (Sign in) [Sign up]
───────────────────────────────────────────────────────────────────────────────────
 LICENSED PREDICTION MARKET · TANZANIA          ┌──────────────────────────────────┐
                                                │ ● LIVE  ⚖ OTHER              YES │
 YES or NO?                 Sora 72/1.0         │ Will the U.S. and Iran sign…  40%│
                                                │ ━━━━━━━━━━━━┃━━━━━━━━━━━━━━━━━━━ │
 Pick a side, place your stake.  Inter 20       │ [   YES @ 40%  ] [  NO @ 60%   ] │
 Be right, get paid.                            │ TZS 5,000              3d left ⓘ │
                                                └──────────────────────────────────┘
 (18+) Licensed by the Gaming Board of Tanzania. Helpline 0800 11 0011
  ▯    Deposit and withdraw with M-Pesa, Airtel Money, HaloPesa or Mixx by Yas.
 [ Start predicting → ]  ( Browse all 50 markets )
 ◐ The wisdom of YES & NO.
───────────────────────────────────────────────────────────────────────────────────
 50 •            TZS 303K            TZS 1.3M      ← proof rail, expected inside 800
```

---

## 3. Copy and keys

[NR] means a draft that needs native review: a Tanzanian (not Kenyan) reviewer for Swahili, and a Chinese reviewer for zh.

| Slot | Key | en | sw | zh |
|---|---|---|---|---|
| Claim, **state N** (ships now) | `home.heroClaim` NEW | Licensed prediction market · Tanzania | Soko la utabiri lenye leseni Tanzania [NR] | 坦桑尼亚持牌预测市场 [NR] |
| Claim, **state P** (renders only when `FIRST_LICENSED_EVIDENCE()` is set) | `home.heroClaimFirst` NEW | Tanzania’s first licensed prediction market | Soko la utabiri la kwanza lenye leseni Tanzania [NR] | 坦桑尼亚首家持牌预测市场 [NR] |
| h1 | `home.heroAsk` NEW | `{yes} or {no}?` | `{yes} au {no}?` | `{yes}还是{no}？` [NR] |
| Lede, line 1 | `home.heroLedeAct` NEW | Pick a side, place your stake. | Chagua upande, weka dau. [NR] | 选一边，下注。[NR] |
| Lede, line 2 | `home.heroLedePay` NEW | Be right, get paid. | Ukiwa sahihi, unalipwa. [NR] | 猜对，即获赔付。[NR] |
| Trust row 1 | existing `footer.licensedByGbt` + `footer.helpline` + `HELPLINE()` | Licensed by the Gaming Board of Tanzania. Helpline 0800 11 0011 | **key changes (sw only):** "Leseni ya Bodi ya Michezo ya Kubahatisha Tanzania." [NR; check the Board's own spelling] + "Simu ya msaada 0800 11 0011" | 获得坦桑尼亚博彩委员会许可。求助热线 0800 11 0011 |
| Trust row 2 | `home.heroRails` NEW | Deposit and withdraw with {rails}. | Weka na toa pesa kwa {rails}. [NR] | 可通过 {rails} 充值和提现。[NR] |
| CTA, primary | `home.heroStart` NEW | Start predicting | Anza kutabiri [NR] | 开始预测 |
| CTA, secondary | `home.heroBrowseAll` (unchanged) | Browse all {n} markets | Tazama masoko yote {n} | 浏览全部 {n} 个市场 |
| Sign-off (visitors) | `home.heroHeadline` (unchanged value; new role) | The wisdom of YES & NO. | same, `lang="en"` | same, `lang="en"` |

**How some of these are built:**
- **`{yes}` / `{no}`** come from `sideWord(t, …, "MARKET")`: YES/NO, NDIO/HAPANA, 是/否. The headline's coloured words are therefore the buttons' own words by construction. This is also why the concepts' "NDIYO" slip can't happen.
- **zh h1 is `是还是否？`, with no quote brackets.** The spans do the separating, it fits on one line at 44px, and it is the question form of 还是 that the marketer asked for.
- **`{rails}`** is `new Intl.ListFormat(tag, { type: "disjunction" }).formatToParts(MOBILE_MONEY_METHODS.map(m => m.name))`, with tags `en-GB`, `sw` and `zh`. Each name part renders as `span.kp-hero__rail`. The names are never typed into the dictionary, and they keep the chooser order (M-Pesa, Airtel Money, HaloPesa, Mixx by Yas).

**The sw word order in state P is on purpose.** "SOKO LA UTABIRI | LA KWANZA LENYE LESENI | TANZANIA" keeps the category phrase unbroken (the marketer's point). It also keeps "la kwanza" right next to "lenye leseni", so the sentence can only mean "first *licensed*" (the legal point).

**Ready fallbacks**, each a one-key swap:
- **If the Board objects to "unalipwa":** "Ukiwa sahihi, unagawana dau la upande mwingine." / "Be right, share the other side's stakes." / "猜对，分享对方的投注。" [NR]. Never use "mgao".
- **If the native reviewer rejects the sw licence rewording:** keep today's "Imepata leseni kutoka…". Row 1 then takes 3 lines in sw (+19.5px; still passes, see §7).

**Deleted** (every locale, plus the comment blocks around them): `home.heroLocation`, `home.heroEst`, `home.heroHeadlineSub`, `home.heroBody`. I checked by grep: the hero is their only consumer.

**Kept**, because other code still uses them:
- `footer.stopGambling` (the footer);
- `home.trustCell1H` and `home.trustCell3H` (`trust-band.tsx`);
- `common.createAccount` (other surfaces).

---

## 4. Structure (one DOM, source order = screen order)

```
section.kp-hero > div.kp-hero__inner            (grid areas unchanged: intro / card / act)
  div.kp-hero__intro
    hgroup.kp-hero__lockup
      p.kp-hero__claim
        span.kp-hero__claim-mark  → <FiftyWordmark size={15} tz={false} />   (hidden ≥1280)
        span.kp-hero__claim-rule aria-hidden                                  (hidden ≥1280)
        span.kp-hero__claim-text  → heroClaim | heroClaimFirst
      h1.kp-hero__headline        (no lang attr any more)
        span.kp-hero__grp → span.kp-hero__side[yes] + span.kp-hero__conn
        {gap}                     ← " " in sw/en, "" in zh, from the dict string
        span.kp-hero__grp → span.kp-hero__side[no] + span.kp-hero__q
    p.kp-hero__lede → span.kp-hero__lede-l (act) + span.kp-hero__lede-l--pay (pay)
    ul.kp-hero__trust role=list   (class KEPT: V8 text map + capture.mjs read it)
      li → span.kp-rg__18 · span{licensedByGbt}{" "}a.kp-hero__tel{helpline}{" "}{HELPLINE()}
      li → span.kp-hero__trust-glyph<I.mobileMoney s=16/> · span{heroRails with .kp-hero__rail}
  div.kp-hero__card    (unchanged)
  div.kp-hero__act
    visitor: div.kp-hero__ctas (heroStart + I.arrowRight 16 · heroBrowseAll)
             p.kp-hero__signoff → span aria-hidden<FiftyMark size={20} simplified/> + span lang="en"<Inked brand line/>
    player:  SignedInAct (unchanged; keeps Set limits →)
```

**Build rules:**
- **The trust list is the same for visitors and players.** It moves into the intro, and `TrustLines` now takes `locale`.
- **Render `FiftyWordmark` and `FiftyMark` as JSX only.** `brand.tsx` is `"use client"`.
- **Every space between elements is an explicit `{" "}` or sits inside a dict string.** SWC has dropped such spaces on production before.
- **Write the dict strings containing `’`, `\u200B` and `？` from a script file, then byte-grep them.** The Edit tool decodes escapes.
- **Put no class-shaped strings in comments.** Tailwind scans comments.

---

## 5. Typography, colour and spacing (locked fonts only, no new bytes)

| Element | 360 (<640) | 640–1023 | 1024–1279 | ≥1280 | Face / weight | Tracking · line-height | Colour |
|---|---|---|---|---|---|---|---|
| Claim text | 13 `--type-small` | 13 | 13 | 13 | JetBrains Mono **600** (declared), caps via CSS, `text-wrap: balance` | 0.14em (joins the shared eyebrow list) · 1.35 | `--text` |
| Claim wordmark | 15 | 15 | 15 | hidden (the header shows it) | Sora 700 (component) | its own | `--text`; rule 1px `--border-strong` |
| h1 side words | 44 `--type-display-2` | **60 `--type-display-1`** (was from 1024) | 60 | 72 `--type-hero` | Sora 800 | −0.030 / −0.038 / −0.038 / −0.045em · **1.0**; `:lang(zh)`: 0 · 1.1 | `--hero-yes-accent` / `--hero-no-accent`, re-pointed **300 → 400** (hero-only tokens) |
| h1 connective (au / or / 还是) | same | same | same | same | **Sora 400** | same | `--text-muted` |
| h1 "?" / "？" | same | same | same | same | Sora 800 | same | `--hero-text-strong` |
| Lede line 1 | 17 `--type-h4` (<561) | 20 `--type-h3` | 20 | 20 | Inter **500** | 0 · 1.5 | `--text` |
| Lede line 2 | 17 | 20 | 20 | 20 | Inter 400 | 0 · 1.5 | `--text-muted` |
| Trust rows | 13 | 13 | 13 | 13 | Inter 400; wallet names Inter 500 | 0 · 1.5 | `--text-muted`; names `--text`; glyph `--text-subtle` |
| Helpline link | 13 | 13 | 13 | 13 | Inter **400** (was 600 white), `tabular-nums`, 1px underline `--border-strong` offset 3px, ±13px `::after` reach kept | — | `--text` |
| Sign-off | mark 20 + text 15 `--type-body` | same | same | same | Sora 600; YES/NO inked | −0.01em | `--text-muted` |

**Spacing below 768:**
- `.kp-hero__inner` padding becomes `--sp-5 --sp-4 --sp-8` (was `--sp-8` top).
- The grid gap becomes `--sp-5` (was `--sp-6`).
- Intro gap `--sp-3`; lockup gap `--sp-2`; trust list `margin-top: --sp-1`; row gap `--sp-2` (28px marker column + `--sp-3`, unchanged).

**Spacing from 768:** padding and grid gap unchanged (`--sp-16 --sp-6`, `--sp-10`); intro gap `--sp-4`; lockup gap `--sp-3`.

**From 1024:** unchanged (the intro sits on the row line, the act hangs below it, the card is centred on the right).

**Why it stops looking basic:**
- There is now weight contrast *inside* the headline (400 against 800 from the same variable file).
- Tracking tightens as the size grows, so Sora reads as display type.
- The line-height is 1.0.
- YES and NO are the only loud words, in the buttons' own colours.
- The grouped rhythm is 8 / 12 / 16 / 20 instead of a flat 12.
- The brightest small text is now the claim, not a gambling warning.
- The type falls into four clear roles: 13 mono, 44–72 display, 17–20 text, 13 small.
- The entrance stagger is keyed on `.kp-hero__inner > *` and is untouched.

---

## 6. Glyphs

- **In:**
  - `FiftyWordmark` (the claim, below 1280);
  - a 1px rule;
  - `.kp-rg__18` (row 1 marker, L6);
  - `I.mobileMoney` 16 (row 2, replaces `I.phone`);
  - `I.arrowRight` 16 (the primary CTA only);
  - `FiftyMark` 20 simplified (sign-off; this is the logo used as a logo, not decoration, so R4(1) is untouched).
- **Typed characters allowed:** `·` `,` `’` `?` `？` only.
- **Out of the hero:**
  - the gilt tick. The CSS rule stays: `page.tsx`, `how-it-works`, `topic-tiles` and `trust-band` still use it.
  - `I.phone`, `I.headset` and `I.shieldcheck`.
- **Rejected:**
  - crown, trophy, star, "#1" / "1st", `sealCheck` next to "first" (rank or certification claims, K33);
  - a flag or map (emblem law, Unguja/Pemba, Lake Nyasa);
  - emoji;
  - typed → ✓ ★ (not in the fonts).
- **Changed (Q5):** the 18+ roundel in neutral ink: ring `--text-subtle`, numerals `--text`. It has one definition, so the footer changes too.

---

## 7. The 360 budget

The anchors come from the 2026-09-27 production capture: header, LIVE strip and edge take 89px. From the card's top edge, the price ends at +84, the YES/NO row at +185 and the card at +280. Text heights come from CSS line boxes, and widths are glyph estimates. **This is a model, not a render.** V15 and V21 have to measure it.

| Swahili, 360 × 740 | Height | Top → bottom |
|---|---|---|
| Header + strip + edge | 89 | 0 → 89 |
| Padding `--sp-5` | 20 | → 109 |
| Claim, 2 lines × 17.55 ("50pick │ SOKO LA UTABIRI LENYE / LESENI TANZANIA"; box ≈259px ≈ 26 characters; state P also takes 2 lines) | 35 | → 144 |
| Lockup gap | 8 | → 152 |
| h1 "NDIO au" (≈181px) / "HAPANA?" (≈218px), 2 × 44 | 88 | → 240 |
| Gap | 12 | → 252 |
| Lede, 2 designed lines (24 and 23 characters; about 38 fit at 17px, so they cannot wrap) | 51 | → 303 |
| Gap 12 + 4 | 16 | → 319 |
| Row 1, 2 lines (≈500px text in a 288px track) | 39 | → 358 |
| Row gap | 8 | → 366 |
| Row 2, 2 lines (≈430px) | 39 | → 405 |
| Grid gap | 20 | → **425 card top** |
| Price ends / **YES/NO ends** | | **509 / 610** |

**Clearance:**
- The YES/NO row ends **65px** above a real 360×740 rail (675).
- It ends 105px above the gate's current line (≈715) and 130px above 740.
- Today it ends at 599, but with **no** licence, 18+, wallet or helpline on screen: they start at 718, under the rail. K29 fails today and passes with this design.

**The other languages:**
- **en:** claim 2 lines, h1 1 line (≈239px), lede 2, rows 2 + 2. The card starts at ≈381 and YES/NO ends at **≈565, 110px clear**.
- **zh:** claim 1 line, h1 `是还是否？` 1 line (220px, line-height 1.1), lede 2, rows 2 + 2. The card starts at ≈368 and YES/NO ends at **≈553, 122px clear**.

**Stress cases in Swahili:**
- Today's licence wording kept (row 1 on 3 lines): 630, 45px clear.
- Row 2 on 3 lines as well: 649, 26px clear.
- 130% text size reflows below the fold by design.

**WP3 gets 65px in Swahili.** Put this in the WP3 spec: below 640px the featured question clamps at **3 lines or fewer in every language** (≈+22px over today's 2 lines), and the "Settles on {source}" line goes **below** the YES/NO row. That lands at about 632, 43px clear.

**768 × 1024 (sw):**
- Claim and h1 each on 1 line (60px, ≈559 of 720px); rows 1 + 1.
- Card top ≈434, YES/NO ≈610–620.
- CTAs ≈754–810, sign-off ≈830–850, hero ends ≈914.
- All of it sits above the 959 rail. Today the CTAs end at 932 and there is no sign-off.

**1280 × 800:**
- en: left column ≈381px, hero ends ≈598, so the proof figures should sit on the first screen.
- sw: the h1 takes 2 lines, and the hero ends ≈670.
- Both are expectations, to be measured.

---

## 8. What must be true before anything is printed (compliance gate)

| Claim | Must be true | Guard |
|---|---|---|
| "Licensed prediction market · Tanzania" (N) | Licence OUS00000202602 is current and covers the product. CLAUDE.md blocker #2 (Board classification) is closed or marked stale in writing (Q1) | Footer carries the number (K39) |
| "…first licensed…" (P) | 1. A Board letter or register extract naming 50pick's licence category and stating that no licensee before 50pick offered pool-based YES/NO markets on real events.<br>2. A dated COMPLIANCE-DECISIONS entry citing it.<br>3. `FIRST_LICENSED_EVIDENCE()` set in `support-config.ts` (its only home, like `LICENCE_NUMBER()`) | `test:hero-copy` §1 plus gate V22. "Licensed" is never dropped from any derivative (`<title>`, OG, SMS) |
| "weka dau … Ukiwa sahihi, unalipwa" | A correct pick is never paid less than its stake, in **every** product including Up & Down (checked in code before push; `thinUpsideNote` states it for markets). Void or one-sided markets are refunded. No amount, no multiplier; V16 passes | Pre-push code read + V16 |
| "Weka na toa pesa kwa M-Pesa, Airtel Money, HaloPesa au Mixx by Yas" | One recorded real payout on each network (Q6) | Names come from `MOBILE_MONEY_METHODS` only |
| 18+ · licence sentence · helpline | Assessed keys, reused verbatim. The sw rewording is native-reviewed and gets a COMPLIANCE note. The helpline is `HELPLINE()` (ruled "ours", 2026-09-26) | `test:rg-policy` (footer untouched) |
| RG sentence out of the hero | Dated R6 plus a COMPLIANCE-DECISIONS entry in the override form. The footer keeps the sentence, the helpline and the limit links on every page | V21 keeps 18+ and the helpline on the first screen |
| Not claimed anywhere | "official", "rasmi", "官方"; "not a machine" / "si mashine"; "not chance"; crowd or "what Tanzania thinks" (desk accounts count as players, D19/D20); the paid-out total in the hero | `test:hero-copy` §5 |

---

## 9. Guards

| Guard | Change | Must end |
|---|---|---|
| `test:i18n` | Remove `home.heroLocation` from `IDENTICAL_OK`. Re-comment `home.heroHeadline` (now the sign-off). New keys in all 3 languages, with `{yes}` `{no}` `{rails}` placeholders matching | green |
| `test:label-lexicon` | None. The sw/zh keys carry no ASCII YES/NO; `heroHeadline` stays in `TOKEN_OK` | green |
| `test:rate-copy` | None. The new copy has no % or × | green |
| `test:hero-contract` | None (figures only). Run as a regression check | green |
| `test:landing-mine` | Re-point §3's "trust lines above SignedInAct" check to `<TrustLines t={t} locale={locale} />` inside `.kp-hero__intro`. Same intent | green |
| **`test:hero-copy`** NEW + `red:hero-copy` | §1: `heroClaimFirst` is read only inside the `FIRST_LICENSED_EVIDENCE()` branch, and no other dict string matches `/first licen[cs]ed\|la kwanza lenye leseni\|首家持牌\|首个持牌/i`. If the constant is set, COMPLIANCE-DECISIONS cites its reference.<br>§2: `heroAsk` has `{yes}` and `{no}` exactly once in every language.<br>§3: `{rails}` output is exact in each language.<br>§4: no `stopGambling` and no `lang="en"` in the hero except the sign-off.<br>§5: no official, rasmi, 官方, machine or mashine in hero keys.<br>§6: a positive control per section | green, red run shows all MISSED = 0 |
| `test:eyebrow-roles` | Add `.kp-hero__claim-text` to the shared 0.14em list | green |
| `test:type-scale` / `test:contrast` | Sizes 13/15/17/20/44/60/72 (all on the scale); contrast for 400 inks, `--text-muted` and the helpline | green |
| `test:gold-is-money` | The gilt tick leaves the hero; the FiftyMark needle is the logo. If flagged, use the mark's monochrome variant | green |
| `test:dead-css` | `.kp-hero__sub` deleted; every new class used | green |
| `test:rg-policy`, `test:betting-ink`, `test:one-sided`, `test:landing-ten-plan` | None | green |

**The live gate, `qa:landing-ten`:**
- **Add 360×740 cells** (sw/en/zh). V15's line then becomes the real rail top, ≈675.
- **Add V21:** below 640, trust rows 1–2 and the hero's `tel:` link end above V15's line (K29 + P15).
- **Add V22:** the claim matches the "first" pattern only when the evidence constant is set.
- **V8 text map and V8b selectors:** add `.kp-hero__claim`.
- **`capture.mjs`:** add a claim rect.
- **Red controls for V21 and V22:** move the trust list after the card; plant the "first" text. Each must fail.

---

## 10. Docs to update, in the same commit

- **`INHERIT-MANIFEST.md` §2: new R6**, with Ali's 2026-09-27 words verbatim and his answers:
  - (a) the h1 is `heroAsk`, and the brand line becomes the sign-off (superseding the h1 half of MOBILE-VISUAL ruling 12, the placement in PLAN-OF-RECORD §7b, and K31's sub-line);
  - (b) the RG sentence leaves the hero, while 18+, licence and helpline stay (superseding the hero half of R4(5));
  - (c) the "first" evidence gate;
  - (d) the trust rows move above the card;
  - (e) design calls: 60px from 640, tracking by size, inks 300 → 400, roundel per Q5, logo uses under R4(1).
  
  Add dated supersede notes to rows R4(5), L18 and L21. Never delete them.
- **`LANDING-TEN.md`:**
  - §0 RESUME AT;
  - §2.1 **WP2 note** rewritten, with this order: claim → h1 → lede → trust (18+ · licence · helpline; wallets) → card → CTAs → sign-off. No `lang="en"`; the list of new keys;
  - rows P8 ("card right after the trust rows"), P15, K29 (now V21), K31 and the marketing-checklist line;
  - the GATE row (V21, V22, 360×740 cells);
  - the WP3 note (65px inherited, question clamp at 3 lines or fewer).
- **`COMPLIANCE-DECISIONS.md`:** a dated override entry covering the RG sentence out of the hero, the helpline staying, the sw licence rewording, the "first" gate, "official" no longer claimed, and the "unalipwa" mechanism note.
- **Dated notes in:** `MOBILE-VISUAL-PLAN.md` (ruling 12), `DESIGN_AUTHORITY.md` :1490, and `design-brief/PLAN-OF-RECORD.md` §7b. The brand line stays verbatim; it is now the sign-off and the OG tagline.
- **`CLAUDE.md`** blocker #2, per Q1.
- **The header comment in `landing-hero.tsx`**, and the dict comments at `heroHeadline`.

---

## 11. Verification before "done"

1. **Unit guards:** tsc, build, every guard in §9, and `red:hero-copy`. Read each exit code without a pipe.
2. **A real render, not just a build:**
   - Run `next dev` on **localhost** with the in-memory store.
   - Curl `/` with `kp-locale` set to sw, en and zh, and grep the served HTML for:
     - the h1 text with its spaces intact (`NDIO</span>` … ` au` … `HAPANA`);
     - no "kamari", "Tangu", "Dar es Salaam" or "EST." inside `[data-band=hero]`;
     - `lang="en"` only on the sign-off;
     - `tel:` present in the hero;
     - the claim is state N.
3. **The gate:**
   - Run `qa:landing-ten` locally, then against production, across all cells plus the 360×740 cells. V2, M4a, V8, V8b, V15, V16, V21 and V22 must be clean, and the red controls must be shown to fail.
   - Launch it through `~/heavy-node-lock.sh` as a detached process with a `.done` marker, and never wrap it in `timeout`.
4. **Frames.** Viewport tiles, never full-page, at:
   - 320, 360×740, 360×780, 768×1024, 1024×768 and 1280×800;
   - × sw, en and zh;
   - × visitor and signed-in (`hero-mine.mjs`);
   - plus 360 sw at 130% text, and focus/hover on both CTAs and the helpline.
   
   Record each cell's measured YES/NO bottom in the report, measured fresh (never copied from this spec).
5. **After push:** confirm the deployed commit with `/api/health` or `?dpl=`, then re-run the gate and re-capture the frames on production.
6. **The rating panel must give 10/10 on the real frames, or it doesn't ship.**
   - **Players:** read the sw 360×740 frame "in 3 seconds" and answer: what is it, what would you press, do you trust it, anything foreign, cheap or scam-like? It fails if anyone would read "answer questions, get paid".
   - **Visual engineer:** hierarchy; the budget as measured; K29 and V15 on the real line; zero bytes; no widows; all three languages.
   - **Managers:** every line in §8 is true, the "first" gate is proven by mutation, and 18+ and the helpline are on screen.
   - **Marketer:** one idea per line, the product's own verbs, the name "50pick" on screen, and the sign-off.
   
   Any score below 10 means fix, re-capture and re-score. If Ali agrees (Q10), also run the check with five real people in Dar and Arusha: "Hii ni nini? Utafanya nini? Unaiamini?"

---

## 12. Every judge objection and how it is closed

| Judge | Objection | Closed by |
|---|---|---|
| Players | "Answer and get paid" scam reading | "weka dau" (the product's own button word) in lede line 1 |
| Players | "mgao" = power cuts; "Cheza kistaarabu", "mashine" | None of them used; the fallback uses "gawana" |
| Players | "GBT" unknown; licence number is noise | Full Board name; the number stays in the footer (K39) |
| Players / marketer | English h1 on a Swahili page | h1 in the reader's language; brand line as sign-off |
| Visual | Local's lede wraps; budget fragile | Two designed short lines that cannot wrap; 65px before WP3, and a WP3 clamp rule |
| Visual | Trust stack outweighs the headline | Two quiet 13px rows, one roundel and one glyph, no bold white link |
| Visual | Shared `.kp-hero__eyebrow`; monochrome h1; micro sign-off; flat 768 | New claim class; inked h1; FiftyMark + Sora 15 lockup; 60px from 640 |
| Visual | Every number is a model | 360×740 cells, V21, measured frames, panel on real frames |
| Managers | "Official / rasmi" overstated | No source claim in the hero; the card and WP3 show the source |
| Managers | "First" gate not in the pipeline | Constant + `test:hero-copy` (in `test:all`) + V22 |
| Managers | Helpline must stay on the first screen | Row 1, above the card |
| Managers | "si mashine" false; `sealCheck` over-certifies | Neither used |
| Marketer | zh 或 → 还是; sw order; en state N without the possessive; wallet order; sign-off | All applied (sw order adjusted for the legal reason in §3) |
| Marketer | "2 watabiri", foreign featured market, signed-out tap should carry the pick | Q9; the pick-carry is already ruled in R2 and built in WP5 |

---

## QUESTIONS FOR ALI

1. **"First" claim:**
   - (a) Ship "Soko la utabiri lenye leseni Tanzania" now; "la kwanza" switches on the day you send the Board's letter. **Recommended.**
   - (b) You already hold that letter or register extract: send it and "first" ships now.
   - (c) Print "first prediction market in Tanzania" with no qualifier. **Not advised:** Polymarket and Predicta already serve Tanzanians, and this is exposed under the Fair Competition Act s.15/16 and the Board's "misleading" rule.
   - Also, please tell me the licence date and licence category printed on your certificate (the repo says 2026-07-16 and never records the category). And is the "Board classification" item still open?
2. **Gambling warning:**
   - (a) Remove "Kama kucheza kamari… acha" from the hero, and keep 18+, the licence and the helpline number in one quiet row; the footer keeps the full warning. **Recommended:** lowest risk, and the helpline stays visible if the Board treats the page or a screenshot as an advert.
   - (b) Footer only, helpline included. Allowed by our RG Policy, which promises the footer, but medium risk under the Board's ad code.
   - (c) Reword it positively, "Cheza kwa kiasi · Simu ya msaada 0800 11 0011". This is new regulated wording and needs its own compliance entry.
   - (d) Keep it as today.
3. **Fonts:**
   - (a) No new font; the new layout fixes the "basic" look. **Recommended.**
   - (b) After seeing the real frames, trial a display face (Bricolage Grotesque) on the headline only. That reverses the locked-font rule and costs about 20–30KB (an estimate) plus a speed check.
   - (c) Replace Sora across the site. This also changes the "50pick" logo text. **Not advised.**
4. **Headline:**
   - (a) "NDIO au HAPANA?" becomes the headline, and "The wisdom of YES & NO." becomes the sign-off and share-image line. **Recommended.**
   - (b) Keep the English line as the headline (this scored lowest with players).
5. **18+ badge:**
   - (a) Neutral ink site-wide, footer included, so it reads as a seal rather than a stop sign. **Recommended.**
   - (b) Keep it red.
6. **Wallets:**
   - (a) All four (M-Pesa, Airtel Money, HaloPesa, Mixx by Yas) pay out today: name all four, after one real test payout each. **Recommended.**
   - (b) Name only the networks that pay out.
7. **Swahili review:**
   - (a) A Tanzanian reviewer approves every new sw line before push. The same pass also fixes the footer's "imekuwa sio" → "kumekuwa si". **Recommended.**
   - (b) Ship the drafts and correct them after review.
8. **Tab title and primer slogan "Tabiri matukio. Si bahati.":**
   - (a) Retire it (risky under a "games of chance" licence) for "50pick · Soko la utabiri lenye leseni Tanzania", as the next small build. **Recommended.**
   - (b) Keep it.
9. **Featured card showing "2 watabiri":**
   - (a) Keep "most contested" (R4(4)), but WP3 hides the predictor count below a floor. **Recommended.**
   - (b) Also prefer a Tanzanian market on ties (this reverses R4(4)'s "no local favouring").
   - (c) Leave it.
10. **Real-people check:**
    - (a) Five people in Dar and Arusha look at the phone screen before we call it 10/10. **Recommended.**
    - (b) The judge panel on real frames is enough.

**Files:**
- C:\kipindi-landing-v3\src\components\home\landing-hero.tsx
- C:\kipindi-landing-v3\src\app\globals.css (`.kp-hero*` 3973–4157; eyebrow list 1044–1071; tokens 807–810; `.kp-rg__18` 5762)
- C:\kipindi-landing-v3\src\lib\i18n-dict.ts
- C:\kipindi-landing-v3\src\lib\support-config.ts
- C:\kipindi-landing-v3\src\lib\payment-providers.ts
- C:\kipindi-landing-v3\scripts\i18n-parity.test.mts
- C:\kipindi-landing-v3\scripts\landing-mine.test.mts
- C:\kipindi-landing-v3\scripts\qa\landing-ten.mjs
- C:\kipindi-landing-v3\scripts\qa\landing-v3\capture.mjs
- C:\kipindi-landing-v3\package.json
- C:\kipindi-landing-v3\docs\LANDING-TEN.md
- C:\kipindi-landing-v3\docs\design-system\v4-2026-09-26-landing-ten\INHERIT-MANIFEST.md
- C:\kipindi-landing-v3\docs\COMPLIANCE-DECISIONS.md
- C:\kipindi-landing-v3\docs\MOBILE-VISUAL-PLAN.md
- C:\kipindi-landing-v3\docs\DESIGN_AUTHORITY.md
- C:\kipindi-landing-v3\design-brief\PLAN-OF-RECORD.md
- C:\kipindi-landing-v3\CLAUDE.md
- Production frames: C:\kipindi-landing-v3\.qa-shots\landing-v3\wp6prod\prod\