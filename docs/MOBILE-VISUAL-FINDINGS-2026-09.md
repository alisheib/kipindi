# MOBILE VISUAL — FULL ELEMENT INSPECTION, 2026-09-15/16

> **STATUS: ⚪ RECORD — evidence, not a work order.** The work order is [`MOBILE-VISUAL-PLAN.md`](MOBILE-VISUAL-PLAN.md);
> every item below is either already covered by one of its units, filed in [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) §6 when it is a money,
> security or compliance matter, or waiting in the unverified backlog (U31). This file mints no law and no design value.
>
> **Appendix (2026-09-16): the professional critics panel** — all 116 claims six critics and a completeness critic made about the live phone
> frames, each with its verdict, the verifier's reasoning and where it was routed. It is the evidence behind the plan's §3b.

## §0 — What was inspected, and how

Ali, 2026-09-15: *"run another set of inspections, for every bit, every filter, every card, every button, every number, every text box, every container."*

- **13 surface groups**, each read twice where possible: a **live** pass measuring the real site as a phone, and a **code** pass reading the components.
- **Live method:** Playwright as an Android phone (360×780 EN/SW, 320×640, 412×915 where it matters), interactions opened (menus, sheets, sort, search, share, primer),
  every element measured in CSS pixels (geometry, padding, radius, type, clipping, tap size) and the screenshots read. The user agent always contained `HeadlessChrome`, so no visit counted as traffic.
- **Verification:** each finding was put to two independent skeptics — one re-checking the evidence, one checking it against the plan, its rulings and the design law.
  Usage limits stopped the verifiers for six surface groups part-way, so those findings stay marked 🕓 unverified: reported, not yet confirmed.
- **Evidence files:** JSON measurements and screenshots live in the gitignored `.qa-shots/mobile-visual/` (DESIGN_AUTHORITY §0b: evidence is never committed).

**Totals: 718 findings** — 205 new, 35 extending a known defect, 82 duplicates, 5 deliberate, 12 refuted, 379 unverified.
**By severity:** 1 critical, 77 high, 314 medium, 326 low.

| Surface group | Findings | 🔴 | 🟠 | 🟡 | ⚪ | 🆕 new | ➕ extends | 🕓 unverified |
|---|---|---|---|---|---|---|---|---|
| **S01-chrome** Global chrome (header, language menu, ticker, rail, More menu, chat bubble, footer) | 41 | 0 | 3 | 19 | 19 | 25 | 4 | 0 |
| **S02-home** Home landing | 55 | 0 | 6 | 18 | 31 | 34 | 5 | 0 |
| **S03-markets** Markets board (discovery bar, filters sheet, search, cards, pager) | 61 | 0 | 9 | 25 | 27 | 33 | 4 | 0 |
| **S04-detail** Market detail (badges, title, bar, chart, countdown, panels, bet surfaces, discussion) | 62 | 1 | 6 | 31 | 24 | 37 | 12 | 0 |
| **S05-updown** Up & Down (board, round page, history) | 72 | 0 | 3 | 34 | 35 | 49 | 5 | 0 |
| **S06-live** Live page (carousel, search, pulse wall) | 48 | 0 | 3 | 17 | 28 | 27 | 5 | 0 |
| **S07-results** Results board | 70 | 0 | 7 | 28 | 35 | 0 | 0 | 70 |
| **S08-info** Leaderboard, fairness, proposals, help, agent, legal | 69 | 0 | 8 | 30 | 31 | 0 | 0 | 69 |
| **S09-auth** Sign-in and sign-up flows | 73 | 0 | 3 | 33 | 37 | 0 | 0 | 73 |
| **S10-wallet** Wallet and money surfaces (code) | 40 | 0 | 3 | 12 | 25 | 0 | 0 | 40 |
| **S11-account** Positions, watchlist, notifications, profile (code) | 50 | 0 | 13 | 27 | 10 | 0 | 0 | 50 |
| **S12-overlays** Overlays and messages | 46 | 0 | 7 | 23 | 16 | 0 | 0 | 46 |
| **S13-primitives** Design-system primitives and cross-surface consistency (code) | 31 | 0 | 6 | 17 | 8 | 0 | 0 | 31 |

**Reading a row:** `severity · status · category · element` then the problem, then the measured evidence. A 🕓 row has not been re-checked by a second reader;
treat it as a lead, not a fact, until U31 verifies it.

## S01-chrome — Global chrome (header, language menu, ticker, rail, More menu, chat bubble, footer)

### S01-01 · 🟠 high · ➕ extends → D3 / U7 · layout
**Bottom rail More menu (last row) under the chat bubble** — `/ (every page: the rail and bubble are global)`

On every page the chat bubble paints over the More menu's last row. It hides the Proposals status badge ('Coming soon' / 'Inakuja'), and a tap on the right ~27% of that row opens chat instead of the destination. Primary navigation should never lose taps to a floating button.

*Evidence:* Menu open at 360 EN: panel 149.4,566 198.6x142 (bottom 708); last row 'Propose COMING SOON' 154.4,659 188.6x44 (right 343). Bubble 292,648 52x52 (bottom 700). elementFromPoint at the row's right point (x=331,y=681) returns the bubble's svg; left and centre return the row. Same result at 360 SW (row 'Kupendekeza INAKUJA' 143.2,659 199.8x44) and 320 EN (panel 109.4,426; row 114.4,519 188.6x44; bubble 252,508). Screenshots show the status badge cut to 'COMING' / 'INA'. Cause: the menu's z-[50] (nav-more.tsx:94) sits inside the rail's `fixed z-40` stacking context (bottom-nav.tsx:114), and the bubble wrapper is zIndex 60 (ChatRoot.tsx:317-318). U7's planned 44px bubble at the same anchor (x 300-344, y 656-700 at 360) still overlaps the row (y 659-703).

### S01-chrome-01 · 🟠 high · ♻️ duplicate → S01-01 (D3 / U7) · layout
**Bottom rail More menu, last row (Propose + Coming soon badge), under the chat bubble** — `all player routes (verified on /markets)`

Opening More puts its last destination and its state badge under the 52px chat bubble. A tap on the right half of the row opens chat instead of navigating. U7's hide-on-scroll will not fire, because opening a menu does not scroll. D3 covers cards, not primary navigation.

*Evidence:* bottom-nav.tsx:114 rail is `fixed inset-x-0 bottom-0 z-40 kp-rail`, a z-40 stacking context. nav-more.tsx:94 menu is `absolute bottom-[calc(100%+8px)] right-2 z-[50]` inside it, so its effective z is 40 (tailwind.config.ts:352-355: 'nav-more → 40'). ChatRoot.tsx:314-319 bubble wrapper is `position: fixed; right: 16; bottom: 80; zIndex: 60`. Live at 360 EN guest: menu {x149.4 y566 w198.6 h142}; bubble {x292 y648 52x52}; row 'Propose · Coming soon' {x154.4 y659 188.6x44} overlaps the bubble by 2091px². elementFromPoint at (303,681) and (331,681) returns the bubble's svg, not the row. The badge spans x231.9–327 and its right third is hidden. Same in SW ('Kupendekeza · Inakuja') and at 320. Signed in, the Needle (z-45) also paints over this sealed menu.

### S01-chrome-02 · 🟠 high · 🆕 new · number · unit: NEW: signed-in header cluster (balance capsule mask/delta, e
**Top-bar balance capsule, hidden-balance mask** — `all signed-in routes`

For any balance below TZS 1,000 (the median player) or a compact balance of TZS 1M or more, the mask is wider than the box reserved for it. At 11px it overflows by 26.4px (TZS 0), 13.2px (TZS 950) or 6.6px (TZS 1.0M). For TZS 0 that is 22.4px across the 32px eye after the 4px padding. The bullets paint over the eye glyph and take taps meant for it, so tapping the eye to show balances opens /wallet instead.

*Evidence:* wallet-balance-pill.tsx:224-229: the width sizer renders `formatBalancePill(effectiveBalance)`, and the visible layer `absolute inset-0 flex items-center` renders `hidden ? "TZS •••••" : …`. The Link is `whitespace-nowrap` (:174) with `pr-1` (:193). The eye `<CashEye>` (:318-322) is a non-positioned sibling (glyph-swap.tsx:42 `inline-flex`, no position), so the absolute mask paints above it. Measured live, JetBrains Mono 700 tabular at 11px: 'TZS 0' 33.0px, 'TZS 950' 46.2, 'TZS 1.0M' 52.8, 'TZS •••••' 59.4. At 12px: 'TZS 0' 36.0, mask 64.8. utils.ts:193 records a production median wallet of TZS 0.

### S01-02 · 🟡 medium · 🆕 new · a11y · unit: NEW: chrome a11y & semantics (ticker pause/name, menu keyboa
**Live ticker strip** — `/, /markets, /results`

On a full-motion phone the marquee of real settlement figures and market questions cannot be paused, stopped or hidden. A screen reader reads every event twice, inside an unnamed block.

*Evidence:* Strip 0,56 360x32: no role, no aria-label, no aria-live, 0 focusable descendants. Track has 24 children for 12 events, because the list renders twice (`<Items prefix="a">` and `<Items prefix="b">`, live-ticker.tsx:153-154) and the second copy is not aria-hidden. Pause is wired only to onMouseEnter/onFocus (live-ticker.tsx:85-91), and neither can fire on a phone: there is no hover and nothing inside can take focus. The animation is 70s linear infinite (globals.css:1315) and pauses only under prefers-reduced-motion (:1318-1320) or data-motion=reduced (:2705).

### S01-04 · 🟡 medium · 🆕 new · a11y · unit: NEW: chrome a11y & semantics (ticker pause/name, menu keyboa
**Header language menu trigger (summary 'EN' / 'SW')** — `all`

The accessible name announces an action that does nothing (switching to the language already in use). It never says the control opens a language list or which language is current, and the visible code is not the start of the name.

*Evidence:* Measured accessible name: 'Switch to English' while EN is active (360 EN, 320 EN) and 'Badilisha kwenda Kiswahili' while SW is active (360 SW). Source: `aria-label={t.common.switchTo.replace("{lang}", NAMES[locale])}` (language-menu.tsx:90), which names the CURRENT locale. The visible label is the code 'EN'/'SW'; the trigger opens a 3-option listbox.

### S01-05 · 🟡 medium · 🆕 new · button · unit: U5
**Header brand/home link** — `all`

The one header control that takes a player home from anywhere is 26px wide, under the 40px tap floor. It is the only control in the bar that misses it.

*Evidence:* a[aria-label='50pick Home'] at 12,5.5 measures 26x44 on all 9 loads. The keyboard focus ring (2nd Tab) is the same 26x44 box. Only height gets a floor (`inline-flex min-h-[44px]`, top-app-bar.tsx:174); the child mark is 26px (:192). Free space to the next control: 94px at 360 (38→132) and 54px at 320 (38→92).

### S01-06 · 🟡 medium · ♻️ duplicate → S01-chrome-10 · container
**Language listbox vs rail More menu (two dropdown designs)** — `all`

The chrome has two popover menus with different panel radius, row inset, row radius, type size and selected-row treatment. The trigger radius (8) is off the control rung (12).

*Evidence:* Language listbox: 196x142, radius 8 (`rounded-md`, language-menu.tsx:128), padding 4 0, full-bleed rows 194x44 with radius 0, 13px text + 11px mono code, gilt tick. More menu: 198.6x142, radius 16 (`rounded-modal`, nav-more.tsx:94), padding 4 on all sides, inset rows 188.6x44 with radius 12 (`rounded-lg`), 13.5px text, no code column, 12px right gutter (right edge 348 at 360). The language trigger itself is radius 8 (language-menu.tsx:91), while the control rung is 12.

### S01-12 · 🟡 medium · ♻️ duplicate → U20 / S01-chrome-12 · link
**Footer text links (KNOWN U20, new evidence)** — `/, /markets, /results`

The responsible-gambling, helpline and data-rights links are 15-19px tall targets with 7-12px gaps on a budget touch screen.

*Evidence:* 14 of 17 footer links are under the tap floor at 360 EN: Set limits 51x19, Take a break / Self-exclude 155x19, Contact us · 0769777877 142x15, Helpline · 0800 11 0011 128x15, Email · msaada@50pick.tz 149x15, Resolution attestation 122x19, Propose markets & get paid 260x19.5, Game RTP & rules 102x19, Become an agent 99x19, Help & support 85x19, Privacy notice 80x19, AML / KYC policy 99x19, Terms of service 95x19, Export / close my account 148x19. Rows step 26-27px (y 7822, 7849, 7877, 7903, 7929). The three tel/mailto rows are the smallest (15px, plain inline <a>, public-footer.tsx:184-205). Only the 3 social links reach 44. Same geometry at 360 SW and 320 EN. No footer link is covered by the rail or bubble at max scroll (hit tests clean on 9 loads).

### S01-17 · 🟡 medium · ➕ extends → D3 / U7 · state
**Chat bubble over page controls (KNOWN D3/U7, new evidence)** — `/, /markets, /results`

Confirms D3 on all three routes and both locales. See S01-01 for the new case U7's 44px size does not fix: the rail More menu row.

*Evidence:* Bubble fixed at 292,648 52x52 (360) and 252,508 52x52 (320) on all 9 loads, 15px above the rail. Whole-document scan (vh/4 steps) found controls whose centre the bubble covers: home-360-en 4 ('How it works' 44x44 x2, 'Details' x2), markets-360-en 8, markets-360-sw 8 ('Maelezo', 'Inavyofanya kazi'), markets-320-en 8 (including 'All results →'), home-360-sw 3, home-320-en 3. Screenshots: home-360-en__s00 covers the closing-soonest title '(Sep…', home-360-en__s01 covers the right end of 'Browse all 25 markets', results-360-en__s01 covers 'Details' and 'Resolved NO'. Nothing stays covered at max scroll: the last footer link ends at x=164.

### S01-chrome-03 · 🟡 medium · 🆕 new · button · unit: NEW: signed-in header cluster (balance capsule mask/delta, e
**Balance eye (show/hide balances) button** — `all signed-in routes`

The balance privacy control is 32px wide on phones, under the 40px floor. The comment claims 40, so no reader or grep of the comment would catch it.

*Evidence:* wallet-balance-pill.tsx:321 `inline-flex h-full w-[32px] shrink-0 sm:w-[36px] …`, so the eye is 32×44 below sm and 36×44 above. The comment at :297-300 claims 'Its hit area went 28px → 40px wide', but the class has never been 40.

### S01-chrome-04 · 🟡 medium · 🆕 new · layout · unit: NEW: signed-in header cluster (balance capsule mask/delta, e
**Balance capsule delta flash (+/− amount shown for 800ms)** — `all signed-in routes`

Every balance change (bet, win, deposit) shifts the header for 800ms. At 320 it pushes the avatar menu, the only path to sign-out, off-screen, repeating the E-190 failure. The sizer was built to prevent exactly this: 'A control that moves the page when you use it is not finished' (:212).

*Evidence:* wallet-balance-pill.tsx:234-243: the delta span `ml-1.5 font-mono text-[9.5px]` renders inside the Link but outside the reserved sizer (:224-229), for FLASH_DURATION 800ms (:24). Measured 9.5px mono: '+1,000' 34.2px, '-25,000' 39.9px, so the capsule grows 42–48px. Cluster at 320 (top-app-bar.tsx:163 `gap-2 px-2`, :216 `gap-1`): room = 320−24−26 logo−24 gaps = 246px. Needed = language 44 + capsule (8+72.6 'TZS 999,999'+4+32) + bell 40 + avatar 40 + 3×4 = 252.6px, already 6.6px into the gutter, as the file admits at :154-159. During the flash it needs 294.8px, putting the avatar's right edge near 357 in a 320 viewport. At 360 it runs 8.8px into the gutter, and the spacer collapses so the language control and capsule jump ~33px left.

### S01-chrome-06 · 🟡 medium · 🆕 new · a11y · unit: NEW: signed-in header cluster (balance capsule mask/delta, e
**Balance link accessible name while balances are hidden** — `all signed-in routes`

A screen-reader user hears 'Wallet · Hide password' on the money capsule. It names a password action that does not exist, instead of stating that the balance is hidden.

*Evidence:* wallet-balance-pill.tsx:172 `aria-label={hidden ? `${t.common.wallet} · ${t.common.hidePassword}` : …}`. hidePassword is 'Hide password' (i18n-dict.ts:210), 'Ficha nenosiri' (:2855) and '隐藏密码' (:4991).

### S01-chrome-07 · 🟡 medium · ♻️ duplicate → S01-05 (U5) · button
**Brand home link (FiftyMark) in the header** — `all player routes`

The control that returns to the board from anywhere is 26px wide on every phone and tablet, under the tap floor. The comment's width claim is stale since the mark-only change.

*Evidence:* top-app-bar.tsx:174 `shrink-0 inline-flex min-h-[44px] items-center`, with :192 `<FiftyMark size={26} />` below xl. The comment at :165-169 ('Width was never the problem (136px)') describes the xl lockup. Live at 360 and 320, EN and SW: logo {x12 w26 h44}, min-width auto.

### S01-chrome-08 · 🟡 medium · ♻️ duplicate → S01-04 · a11y
**Language menu trigger (EN/SW/ZH) and listbox** — `all player routes`

The name says the control switches to the language already active. It also omits the visible code, so voice users saying 'tap EN' fail (label-in-name). The listbox semantics promise arrow-key navigation that is not implemented.

*Evidence:* language-menu.tsx:90 `aria-label={t.common.switchTo.replace("{lang}", NAMES[locale])}`, where `locale` is the current language. Live: an EN page reads 'Switch to English' over visible text 'EN'; an SW page reads 'Badilisha kwenda Kiswahili' over 'SW'. :123/:137 declare `role=listbox` with `role=option` buttons, but no arrow-key handling exists (only Escape, :57-62).

### S01-chrome-09 · 🟡 medium · ♻️ duplicate → S01-02 · a11y
**Live ticker strip** — `all player routes`

Screen readers read every settlement twice. There is no keyboard way to pause a 70s infinite marquee of money figures, and the keyboard pause the comment claims is dead code.

*Evidence:* live-ticker.tsx:153-154 renders `<Items prefix="a">` and `<Items prefix="b">` with no aria-hidden. Live: 24 item spans, 0 aria-hidden. :90-91 attach `onFocus`/`onBlur` to pause 'for the KEYBOARD too', but live the strip has 0 focusable descendants and no tabindex, so neither handler can fire. The strip has no role or name and sits before <main>.

### S01-chrome-10 · 🟡 medium · 🆕 new · container · unit: NEW: one chrome menu/panel recipe (language · rail More · ba
**Header and rail overlay panels (language, rail More, bar More, avatar menu, bell, Needle drawer)** — `all player routes`

One job, a menu hanging off a chrome control, uses three radii/borders, three scrim strengths (none, 45%, 50%, 60%) and three fills (opaque, 85% and 95% blurred). Two neighbouring header menus look like different products, and the blur tax lands on low-end phones.

*Evidence:* Six panels, six recipes: - Language: language-menu.tsx:128 `rounded-md` (live 8px), `border-border`, opaque `bg-bg-elevated`, `py-1`, no scrim, 13px rows. - Rail More: nav-more.tsx:94 `rounded-modal` (16), `border-border-strong`, opaque, `p-1`, no scrim, 13.5px rows. - Bar More: :167 `bg-bg-elevated/95 backdrop-blur-xl`, rows `py-2`. - Avatar: avatar-menu.tsx:158 scrim `bg-black/45 backdrop-blur-md`; :174 `bg-bg-elevated/85 backdrop-blur-xl`, full width, ~42px rows. - Bell: notifications-panel.tsx:529 scrim `bg-black/60`; :553 `/85 blur-xl`. - Needle: needle-drawer.tsx:154 scrim `bg-black/50`; :168 `/95 blur-xl`. tailwind.config.ts:253 assigns `modal` 16px to 'dialogs, sheets, menus, popovers'.

### S01-chrome-11 · 🟡 medium · 🆕 new · typography · unit: NEW: one chrome menu/panel recipe (type sizes travel with it
**Chrome text sizes** — `all player routes`

The chrome, visible on every page, carries seven off-ladder sizes (13.5, 12.5, 10.5, 9.5 on numerals, 9, 15, and 13.5 inline) plus arbitrary spellings of ladder values that the type-scale ratchet reads as literals.

*Evidence:* OFF-LADDER: - nav-more.tsx:105 `text-[13.5px]` (live 13.5px on rail More rows). - avatar-menu.tsx:185 `text-[13.5px]`. - notifications-panel.tsx:666 `text-[10.5px]`; :579 `text-[9px]`. - wallet-balance-pill.tsx:237 `text-[9.5px]` on mixed-case numerals. - needle-drawer.tsx:212/:220/:259 `text-[13.5px]`; :187 `text-[15px]`; :138 `text-[12.5px]`. - chat-styles.css `.cm-time { font-size: 9.5px }` on numerals; `.cm-header-sub` 11px raw. - top-app-bar.tsx:434 inline `fontSize: 13.5`. HAND-TYPED LADDER VALUES: - language-menu.tsx:94 `text-[12px]`, :143 `text-[13px]`, :155 `text-[11px]`. - live-ticker.tsx:42 `text-[12px]`. - public-footer.tsx:105 `text-[12px]`, :127 `text-[14px]`, :133/:136 `text-[11px]`.

### S01-chrome-12 · 🟡 medium · ➕ extends → U20 · link
**Footer Contact us / Helpline / Email rows (raw <a>, not FooterLink)** — `all player routes`

The statutory problem-gambling helpline and the support phone are the smallest targets in the footer (15px). U20 describes the fix as footer list links at ≈19px, so a fix applied to FooterLink alone misses exactly these three rows.

*Evidence:* public-footer.tsx:184, :191, :196 render `<a href={`tel:…`}>` / `mailto:` with only `text-text-muted hover:text-text transition-colors`, no inline-flex or min-height. FooterLink (:313) is `inline-flex items-center gap-1 group`. Live at 360 EN: 'Contact us · 0769777877' h15, 'Helpline · 0800 11 0011' h15, 'Email · msaada@50pick.tz' h15, against FooterLink rows at h19. SW and 320 identical. Rows are 26px apart (`space-y-1.5`).

### S01-chrome-13 · 🟡 medium · 🆕 new · button · unit: U17
**Bell panel header: Read all / Clear all** — `all signed-in routes`

A one-tap, irreversible wipe of every notification, including money and security alerts, sits a few pixels from the benign Read all. It looks identical at rest and uses a different height (40 vs 44) and tracking.

*Evidence:* notifications-panel.tsx:572-586. Read all is `min-h-[44px] px-2`; the separator is `text-[9px] mx-0.5`; Clear all is `h-7 px-1.5` (40px tall, 8px padding, `tracking-[0.10em]`) with `onClick={handleClearAll}`. :458-471 calls dismissAllAction immediately with no confirm or undo. The only destructive cue is `hover:text-no-300`, which touch never shows. The list carries WIN/LOSS/DEPOSIT/WITHDRAW plus security and KYC rows (:325-331, :721-726).

### S01-chrome-14 · 🟡 medium · ➕ extends → D20 / U21 · container
**The Needle controls bottom sheet (opened from the avatar menu)** — `all signed-in routes`

On a 360×640 budget phone with the URL bar (~580px visible), and on every landscape phone, the sheet's top edge including its ✕ sits above the viewport with no way to scroll. This is not modal.tsx's sheet, so U21's D20 fix will not reach it. Padding is 20px against the 16px rung, and the grabber renders 64px wide instead of 36.

*Evidence:* needle-drawer.tsx:167-176: `fixed … left-0 right-0 bottom-0 rounded-t-modal px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]`, with no max-height and no overflow-y. Content: grabber, header with ✕ (:196-206), toggle row, 2-column mode grid, 3 theme rows (~64px each with the 34px swatch), note. Class arithmetic estimates ≈600–630px tall (not rendered; sign-in not allowed). `px-4 pt-4` = 20px. Grabber :181 `h-1 w-9` = 4×64px on this scale.

### S01-chrome-15 · 🟡 medium · 🆕 new · button · unit: U7
**Chat sheet close ✕ and send button; composer attributes** — `all non-auth routes`

Both chat controls are below the 40px floor on phones. The phone keyboard shows a generic return key, which sends, and a newline is impossible on a touch keyboard.

*Evidence:* chat-styles.css:203-206 `.cm-close { width: 32px; height: 32px }`; :589-591 `.cm-send { width: 36px; height: 36px }`; :506-508 `grid-template-columns: 1fr 36px`. Live at 360/320: close {w32 h32}, send {w36 h36}, textarea 16px, h38.4 in a 52.4px composer, `enterkeyhint` null, `autocomplete` null (ChatPanel.tsx:132-139). Enter sends (:74-78) and Shift+Enter is the only newline.

### S01-chrome-17 · 🟡 medium · 🆕 new · copy · unit: NEW: chrome copy & label consistency (nav destinations, tick
**Destination labels across rail More, avatar menu, footer** — `all player routes`

A signed-in phone player sees 'Top' in More and 'Leaderboard' in the avatar menu for the same page. Proposals has three English names and two Swahili reward words (zawadi vs pesa). test:i18n cannot see the avatar menu's strings.

*Evidence:* Leaderboard: - `t.nav.leaderboard` in rail More (bottom-nav.tsx:92/97) and bar More (top-app-bar.tsx:134): EN 'Top' (i18n-dict.ts:459), ZH '排行' (:5215). - avatar-menu.tsx:338 local literals: 'Leaderboard' / '排行榜'. - Page title: SW 'Bingwa' (:4073) vs nav SW 'Jedwali la Washindi' (:3078). Proposals: - `t.common.propose` EN 'Propose', SW 'Kupendekeza' (infinitive, :2688). - Avatar :335: 'Propose & earn' / 'Pendekeza na upate zawadi'. - Footer `proposeGetPaid`: 'Propose markets & get paid' / 'Pendekeza masoko upate pesa' (:2048, :4313). Other: :339 SW 'Kuthibitisha kitambulisho' is an infinitive among noun labels; :241 'Staff · Internal' is hard-coded English. Root cause: MENU_ROWS (:331-340) carries its own en/sw/zh strings outside the dictionary.

### S01-03 · ⚪ low · ❌ refuted → §M4 / §C2 / §B12.5 · number
**Ticker settlement figure vs market card pool figure** — `/results (ticker on every page)`

One settled market shows two money formats (K-compact vs full grouping) and two zero-pool treatments (omitted vs 'TZS 0'), depending on whether the player reads the chrome or the card.

*Evidence:* Ticker item: 'TZS 4K settled NO on Will a goal be scored in the first 30 minutes of Leeds United vs Newc…' (formatTzsCompact, live-ticker.tsx:53). The /results card for the same market (heading y=1214 in results-360-en.json) shows 'TZS 4,000' (y=1420; results-360-en__s01.png). Zero amounts also diverge: the ticker omits the figure for 'Will Newcastle United receive more yellow cards…' ('a bare TZS 0 reads as a broken figure', live-ticker.tsx:51-53), while that market's results card prints 'TZS 0'. Ticker figures are font-variant-numeric normal.

### S01-07 · ⚪ low · ♻️ duplicate → S01-chrome-11 · typography
**Chrome text sizes (More menu, language menu, ticker, footer)** — `all`

A size off the closed ladder (13.5) renders on phones, and the chrome sets sizes with bracket literals instead of ladder keys, so a ladder change will not reach them.

*Evidence:* Off-ladder: More menu rows measure 13.5px on all 3 viewports (`text-[13.5px]`, nav-more.tsx:105). Hand-typed sizes that happen to be on the ladder: ticker `text-[12px]` (live-ticker.tsx:42), language code `text-[12px]` (language-menu.tsx:94), options `text-[13px]` (:143) and `text-[11px]` (:155), footer grid `text-[12px]` (public-footer.tsx:105), licence/© `text-[11px]` (:133, :136), wordmark `text-[14px]` (:127). The footer mixes 6 sizes: 14 Sora, 13 Inter, 12 Inter links, 11 mono, 11 Sora (18+), 10 mono eyebrows.

### S01-08 · ⚪ low · 🆕 new · icon · unit: NEW: one chrome menu/panel recipe (language · rail More · ba
**Language menu selected-row tick** — `all`

Gold marks a UI selection, not money or brand, and it is a second 'current' language beside the pill-active fill used everywhere else.

*Evidence:* The current-language check (14x14) is painted `color: var(--gilt)` (language-menu.tsx:151); it shows gold on the English row (360 EN, 320 EN) and the Kiswahili row (360 SW). The rail and More menu mark the current item with `--pill-active` and weight only.

### S01-09 · ⚪ low · 🆕 new · a11y · unit: NEW: chrome a11y & semantics (ticker pause/name, menu keyboa
**Bottom rail 'Markets' item on the home page** — `/`

A screen reader announces 'Markets, current page' on the home page, and tapping the item marked current goes somewhere else.

*Evidence:* On '/', rail 'Markets'/'Masoko' has aria-current='page' and data-on (pip filled with --pill-active) on all 3 viewports (bottom-nav.tsx:103: `pathname === "/" // pathname.startsWith("/markets")`). The page's h1 is 'The wisdom of YES & NO' (landing), and 'Markets' links to /markets, a different page with its own h1 'Markets'.

### S01-10 · ⚪ low · ♻️ duplicate → S01-chrome-17 · copy
**Destination labels across rail More menu, footer and account menu** — `all`

The same destination has two or three names depending on which chrome the player opens. In EN, 'Top' alone next to a menu reads like 'back to top'.

*Evidence:* Leaderboard is 'Top' in the rail More menu (nav.leaderboard, i18n-dict.ts:459), 'Leaderboard' in common.leaderboard (:18) and the avatar menu (avatar-menu.tsx:338); ZH '排行' (:5215) vs '排行榜' (:4813). Proposals is 'Propose' / SW 'Kupendekeza' in the More menu (:29, :2688), 'Propose markets & get paid' / 'Pendekeza masoko upate pesa' in the footer (:2048, :4313), and 'Propose & earn' in the avatar menu (avatar-menu.tsx:335). Measured More menu at 360 EN: 'Top', 'Resolution attestation', 'Propose COMING SOON'.

### S01-11 · ⚪ low · 🆕 new · copy · unit: NEW: chrome copy & label consistency (nav destinations, tick
**Ticker 'LIVE' label** — `all`

'Live' means three different things in one viewport: a feed of finished results, a destination, and an open-market state. The red pulse suggests these results are happening now.

*Evidence:* The strip is labelled 'LIVE' / 'MUBASHARA' (10px mono, red, pulsing dot) but carries past settlements ('TZS 10K settled YES on …', 'imekamilika NDIO kwenye …'). On the same screens 'Live'/'Mubashara' is also a rail destination (/live), and 'LIVE' is the open-market pill on cards (markets-360-en__s00.png).

### S01-13 · ⚪ low · 🆕 new · number · unit: U20
**Footer contact phone vs helpline number** — `all`

Two phone numbers one row apart use different digit grouping. The ungrouped 10-digit number is harder to read and copy by eye.

*Evidence:* Adjacent footer rows: 'Contact us · 0769777877' / 'Wasiliana nasi · 0769777877' (10 digits, ungrouped) vs 'Helpline · 0800 11 0011' / 'Simu ya msaada · 0800 11 0011' (grouped). The displayed value is the operator string `supportPhone` (public-footer.tsx:187); the helpline is a pinned constant (:192).

### S01-14 · ⚪ low · 🆕 new · layout · unit: U5
**Header content gutter** — `all`

Both ends of the guest header sit 4px outside the page's alignment lines, so the logo and Sign up pill don't line up with the content below.

*Evidence:* Guest header content runs from x=12 (logo) to 348 at 360 and to 308 at 320 (`px-2` below sm, top-app-bar.tsx:163). Page content aligns to x=16 / 344 (hero eyebrow, search box, cards, footer text). The code's reason for px-2 is the signed-in right cluster at 320; a guest bar has 94px (360) / 54px (320) spare between logo and language control.

### S01-15 · ⚪ low · 🆕 new · a11y · unit: NEW: chrome a11y & semantics (ticker pause/name, menu keyboa
**Footer section titles and 18+ badge** — `all`

Screen-reader users can't jump to the responsible-gambling or privacy link groups by heading, and the lists are unnamed.

*Evidence:* 'PLAY SAFE' / 'FAIRNESS' / 'PRIVACY' (SW 'CHEZA KISTAARABU' / 'UADILIFU' / 'FARAGHA') render as <p> (public-footer.tsx:253), 10px mono eyebrow. The page heading outline ends at the last main h3 ('Recently settled' on /), so the footer's link groups have no heading or list name. The 18+ mark is `<span aria-label>` with no role (:109-122).

### S01-16 · ⚪ low · ♻️ duplicate → S01-chrome-24 · a11y
**Rail More menu semantics** — `all`

The ARIA menu role promises arrow-key and focus behaviour the component doesn't provide, and it changes TalkBack's interaction model for what is really a list of three links. The two header/rail menus also use two different ARIA patterns.

*Evidence:* The trigger has aria-haspopup='menu' and aria-expanded toggles false→true (measured). The panel is role='menu' with Link role='menuitem' rows (nav-more.tsx:65-129), but nothing moves focus into the menu on open, there is no arrow-key handling, and Escape closes without returning focus. The language control uses a plain <details> disclosure.

### S01-chrome-05 · ⚪ low · 🆕 new · number · unit: NEW: signed-in header cluster (balance capsule mask/delta, e
**Balance delta figure** — `all signed-in routes`

Losses flash as '-500' with a hyphen while every other signed money figure uses U+2212. The figure is also at 9.5px, a size reserved for uppercase mono microlabels.

*Evidence:* wallet-balance-pill.tsx:240-241 `{delta > 0 ? "+" : ""}{formatNumber(delta)}`. formatNumber is Intl en-US (utils.ts:60, :217) and prints negatives with U+002D ('-500'). utils.ts:75 says 'Negatives carry the real minus glyph "−" (U+2212), never a hyphen'. The size is `text-[9.5px]` on mixed-case numerals with no unit beside 'TZS 86,800'.

### S01-chrome-16 · ⚪ low · 🆕 new · layout · unit: NEW: one chrome menu/panel recipe (language · rail More · ba
**Avatar menu rows, header, staff row, Needle row, sign-out** — `all signed-in routes`

The menu's leading icons sit on four x-positions (14/16/22/24), rows are 42px instead of the 44 preferred on phones, and icons use 15px, which is outside the 16/18/20/24 set.

*Evidence:* Four left insets: - Header avatar-menu.tsx:182 `px-3.5` → 14px. - Rows :373 `px-3 py-2` → icon at 16px, height 12+18+12 = 42px. - Needle: wrapper :266 `px-2` + needle-drawer.tsx:126 `px-2 py-2` → 24px. - Staff: wrapper :229 `px-2` + link :233 `px-2.5` → 22px, with an `h-7 w-7` (40px) `rounded-md` 8px plate against IconPlate's 12px (icon-plate.tsx:79). - Sign-out :290 `px-3 py-2` → 16px. Icons: 15px (:237, :292, :378); arrow 14 (:249); NeedleMark 16.

### S01-chrome-18 · ⚪ low · 🆕 new · button · unit: U5
**Header right-cluster control heights** — `all player routes`

After U5, a guest bar reads 44/40/40 and a signed-in bar 44/44/40/40. One row mixes two rungs with no role-based reason, and the 44s cost the 320 signed-in cluster the pixels S01-chrome-03/04 need.

*Evidence:* Heights in one 56px bar: - Language trigger 44 (language-menu.tsx:91 `min-h-[44px]`, live 44×44). - Balance capsule 44 (wallet-balance-pill.tsx:161 `--h-control-md`). - Bell `h-7 w-7` = 40 (notifications-panel.tsx:485). - Avatar 40 (avatar-menu.tsx:137-138). - Guest pills 48 (top-app-bar.tsx:366/373; U5 moves them to 40). Shapes: bordered 8px, pill, circle, circle.

### S01-chrome-19 · ⚪ low · ♻️ duplicate → S01-14 (U5) · layout
**Header horizontal gutter** — `all player routes`

The bar's left edge sits 4px outside the page's 16px grid on every phone page, so the brand mark never lines up with the content below it.

*Evidence:* top-app-bar.tsx:163 `px-2` below sm, 12px. Live headerPad 12px, logo x=12, while page content (search box, filter pills, cards) starts at x=16 (more-open-360-en.png). The justification (:154-162) is the 320 signed-in overflow.

### S01-chrome-20 · ⚪ low · 🆕 new · state · unit: U17
**Bell unread CountBadge (pulse and 99+ state)** — `all signed-in routes`

The pulse exists only while the panel is open, so the badge animates behind the 60% scrim and sits still when it matters. The file itself argues against attention-pulling cues (§H.1, :168-180). At 99+, the badge covers the whole bell glyph.

*Evidence:* notifications-panel.tsx:504 gives the always-mounted badge `className="notif-badge-pulse"`. The `<style>` defining `@keyframes notif-badge-pulse` and `.notif-badge-pulse { … infinite }` (:775-779) sits inside `createPortal`, gated by `present` (:524). CountBadge md (count-badge.tsx:48) renders '99+' at mono 10px ≈ 18px + 8px padding + 4px ring ≈ 30px, placed at `right: 1` (:512-518) in a 40px button whose 20px glyph spans x 10–30.

### S01-chrome-21 · ⚪ low · 🆕 new · a11y · unit: U7
**Chat bubble HelpMark SVG** — `all non-auth routes`

A decorative glyph inside a named button exposes an untranslated English name in SW and ZH. The unread-badge branch can never render.

*Evidence:* HelpMark.tsx:24 defaults `aria-label` to "50pick Help" on the SVG (:33), with no role or aria-hidden. ChatBubble.tsx:41 passes nothing. Live in SW: the svg has aria-label '50pick Help' and aria-hidden null, inside a button already named 'Fungua Msaada wa 50pick' (ChatBubble.tsx:36). ChatBubble's CountBadge `unread` (:51-60) is never passed by ChatRoot.tsx:321, so it is dead.

### S01-chrome-22 · ⚪ low · ♻️ duplicate → S01-15 · a11y
**Footer column headings (Play safe / Fairness / Privacy)** — `all player routes`

The Play safe group (limits, self-exclusion, helpline) cannot be reached by heading navigation, so screen-reader users must linear-read the whole footer to find it.

*Evidence:* public-footer.tsx:253 `<p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">`. Live: all three footer heads are <P> ('Play safe', 'Fairness', 'Privacy'; SW 'Cheza kistaarabu', 'Uadilifu', 'Faragha').

### S01-chrome-23 · ⚪ low · 🆕 new · copy · unit: U17
**Bell row relative time** — `all signed-in routes`

Swahili units are glued to the number in English order. '2siku' reads as one misspelt word; Swahili puts the unit first with a space ('siku 2').

*Evidence:* notifications-panel.tsx:47-50 builds `${m}${t.common.relMinutes}` and similar. SW relMinutes 'dk', relHours 'sa', relDays 'siku' (i18n-dict.ts:3066) produce '5dk', '3sa', '2siku'. EN produces '5m'.

### S01-chrome-24 · ⚪ low · 🆕 new · a11y · unit: NEW: chrome a11y & semantics (ticker pause/name, menu keyboa
**Rail and bar More menus (menu button pattern)** — `all player routes`

Keyboard and switch users open a declared menu, but focus stays on the trigger and Tab walks the page behind it, not the menu items. Escape leaves focus wherever it was.

*Evidence:* nav-more.tsx:65-72 and :137-141 declare `aria-haspopup="menu"` / `aria-expanded`, and the panels are `role="menu"` with `role="menuitem"` links (:92-103). But the open effect (:43-55) moves no focus into the menu, has no arrow-key handling, and Escape (:48) closes without returning focus to the trigger.

## S02-home — Home landing

### S02-home-01 · 🟠 high · 🆕 new · number · unit: U6
**Browse by topic tile pool (.kp-topic__m)** — `/`

The pool figure on a topic tile splits across lines: the currency on one line, the amount on the next. The player reads 'TZS' and a stray '6K', so the money on the tile no longer reads as one figure.

*Evidence:* A Range test on the money substring shows 2 line boxes: 360 EN 'TZS 6K' (Other), 'TZS 3K' (Sports), 'TZS 18K' (Weather). Each .kp-topic__m is 126×33px (2 lines at 11px), @x=201 y=5303/5401/5500. 360 SW: 'TZS 6K' (Nyingine) and 'TZS 18K' (Hali ya hewa). The screenshot shows 'TZS' at the end of line 1 and '6K' alone on line 2. At 320 EN all 7 metas wrap to 2 lines (106×33) and the '·' separator dangles at line end. At 412 all fit on one line (152×17).

### S02-home-02 · 🟠 high · 🆕 new · state · unit: NEW: settled-row payout wording (data-backed; payouts + comp
**Recently settled row, outcome chip + amount (.kp-settled__amt--void)** — `/`

A market recorded as settled YES is labelled 'refunded'. Either the outcome chip or the money word is wrong, and the word is inferred from a computed amount. The same file says outcomes are 'READ, NEVER INFERRED', and the band's whole job is to prove results are trustworthy.

*Evidence:* Row 2 (@16,6996 328×90 at 360 EN; same at 320 and 412) shows a green 'YES' chip beside 'refunded'. SW shows 'NDIO' beside 'yalirejeshwa'. In trust-band.tsx:195 the refund word renders when `isVoid // row.amountTzs == null // row.amountTzs <= 0`. platform-stats.ts:66-68 returns null only for non-YES/NO outcomes, so on a YES row the word comes from a computed netPool ≤ 0, not from a VOID record.

### S02-home-07 · 🟠 high · 🆕 new · button · unit: U3
**Market card 'Share this market' (.mcardp-share) on the featured card and all 6 grid cards** — `/`

The share control's tap target is 26px wide and 37px tall, under the 40px floor. It sits 12px from 'Details', so a mis-tap opens the market instead.

*Evidence:* The painted box is 13×13 at all 4 viewports. An elementFromPoint scan gives an effective hit area of 26×37px (the ::after reach is left/right −6, top −9, bottom −14; globals.css:5106-5113). By comparison 'Details' is 57×41 and the info button is 44×45. There are 7 instances on /, for example @247,1806 (360 EN) and @207,1886 (320 EN).

### S02-home-code-1 · 🟠 high · ♻️ duplicate → S02-home-01 · number
**Topic tile meta line: count · pool (.kp-topic__m)** — `/`

The pool figure breaks across two lines, with the currency on one line and the amount on the next. This happens on every pooled topic tile at 360 in all three locales.

*Evidence:* topic-tiles.tsx:64-69 renders `<span className="kp-topic__m">…{" · "}{formatTzsCompact(tp.poolTzs)}</span>` with no nowrap around the pool. globals.css:4622-4630: `.kp-topic__m { flex-basis:100%; padding-left:calc(18px + var(--sp-3)); font-family:mono; font-size:var(--type-micro) }` with no white-space rule. At 360 the tile is 160px wide, the meta box 126px, and 96px of text width remains after the 30px indent. Mono 11px advances 6.6px/char, so '12 live · TZS 6K' (16 chars) needs 105.6px. Measured live: pool lines=2 ('TZS' on line 1, '6K' on line 2) on Other/Sports/Weather in EN, Nyingine/Hali ya hewa in SW, and all 6 pooled tiles in ZH (including 'TZS 0'). At 320 SW, 6 of 7 tiles split. Tile height jumps 74 -> 91px when it happens.

### S02-home-code-13 · 🟠 high · ♻️ duplicate → S02-home-02 · copy
**Settled row payout status 'refunded' beside a YES/NO pill** — `/`

A green YES result next to 'refunded' reads as a contradiction with no explanation (presumably nobody backed the winning side). A settlement with an unknown amount is also labelled 'refunded', which is a payout-status claim the data does not support.

*Evidence:* trust-band.tsx:195-196: `isVoid // row.amountTzs == null // row.amountTzs <= 0 ? <span …--void>{t.home.settledVoid}</span>` ('refunded' / 'yalirejeshwa' / '已退还'). Live row 2 at 360 EN shows a green YES pill + 'refunded' (Newcastle yellow cards). A null amount (unknown) takes the same branch. The file's own rule (:152-156) says 'a component that cannot describe its input renders nothing rather than a word it made up'.

### S02-home-code-15 · 🟠 high · 🆕 new · state · unit: U26
**Hero proof rail / conviction / CTAs when the market read fails** — `/`

A database outage looks exactly like an empty platform. The hero states '0 open markets, TZS 0 in play' and 'nothing staked yet' as facts, offers to browse 0 markets, and the failure is cached. No error or unavailable state exists.

*Evidence:* page.tsx:66 and :69 `listMarkets(...).catch(() => [])` feed `heroFigures([])` (hero.ts:75-101): openCount 0, poolTzs 0, predictions 0, yesShare null, board [], featured null. landing-hero.tsx:131-151 then prints '0' / 'TZS 0' / '0'; :166-167 says 'Nothing staked yet — there is no crowd price to show'; :217 says 'Browse all 0 markets'. page.tsx:167 hides the grid and topics. platform-stats.ts:92-93 catches the RESOLVED read to [] and :120-121 caches that value for TTL_MS, so one DB blip hides the settled strip for the whole TTL.

### S02-home-03 · 🟡 medium · 🆕 new · button · unit: U6
**Hero CTAs 'Create account' / 'Browse all 25 markets' vs header 'Sign up' vs Up & Down 'Play Up & Down'** — `/`

The account-creation action appears twice in the first two screens, with two labels, two heights (48/56) and two shapes (pill vs 16px rounded rectangle). The hero CTA's pill class has no effect. The page's primary CTAs use three different compositions.

*Evidence:* The hero CTAs are `a.btn.btn-xl.rounded-pill` at 328×56 with computed border-radius 16px, not 999. `.btn-xl { … border-radius: var(--r-lg) }` (globals.css:1091) overrides the `rounded-pill` utility, so the class is dead. Header 'Sign up' is `btn-lg btn-pill` at 85×48 radius 999, with href /auth/register, the same as 'Create account' (landing-hero.tsx:212 / top-app-bar.tsx:371). Labels differ: 'Sign up' vs 'Create account' (SW 'Jisajili' vs 'Fungua akaunti'). The Up & Down CTA is a third shape: `span.btn-lg` 203×48, radius 12, content-width, inside a link (@37,5860).

### S02-home-04 · 🟡 medium · 🆕 new · copy · unit: NEW: home copy pass (owner + native readers)
**Hero lede (.kp-hero__lede) under the Closing soonest board** — `/`

The lede calls the board Tanzania-only, contradicting the non-Tanzanian markets shown right above and below it. It also introduces 'Trade', a verb no other home copy uses for the same action (predict / pick a side / stake).

*Evidence:* The lede reads 'Trade questions about Tanzania's weather, markets, sport and culture — settled by official sources.' (i18n-dict.ts:569; SW :3172 '…utamaduni wa Tanzania…'). It is 20px, 4 lines, @16,1181. Directly above it the Closing soonest rows show 'Will Kenya's total active fiber-optic subscriptions…' and 'Will a new marathon world record be set at the 2026 BMW Berlin Marathon'. The grid below has 'U.S. and Iran … peace agreement', 'PUBG Global Championship (İstanbul)' and 'Kenya Revenue Authority'. The rest of the page says 'Predict events. Not chance.' and 'Pick a side now', never 'trade'.

### S02-home-05 · 🟡 medium · 🆕 new · a11y · unit: NEW: home semantics (heading outline, landmarks, accessible 
**Home heading outline and section landmarks** — `/`

Screen-reader and heading navigation places the trust facts and settled results inside the Up & Down section. The Closing soonest list cannot be reached by heading, and heading level does not match visual size.

*Evidence:* Outline at 360 EN: H1 'The wisdom of YES & NO.' → H2 'Predict events. Not chance.' → H2 'Pick a side now' → H3 'Browse by topic' (32px) → H2 'Up & Down' → H3 'Named public sources' / 'Signed off by an officer' / 'Mobile money in and out' (17px) → H3 'Recently settled' (32px). The trust band's title 'A market is only worth playing if the result is not an opinion.' is `p.kp-claim` at 32px (trust-band.tsx:42-48), so the trust H3s and 'Recently settled' fall under the 'Up & Down' H2. 'Closing soonest' is a `p` eyebrow (landing-hero.tsx:180), so its 4 row links have no group heading. There are 5 `<section data-band>` elements with no aria-label or aria-labelledby. H3 'Browse by topic' and H3 'Recently settled' use `.kp-shead__h` at 32px, the same size as the H2s.

### S02-home-06 · 🟡 medium · 🆕 new · card · unit: U6
**Topic tiles with long names (SW) and wrapped meta (320)** — `/`

On phones the tile has three different internal layouts depending on the name's length. The glyph is orphaned above the name, the name and meta left edges disagree by 30px in one tile, and tiles in the same grid row are 41px different in height.

*Evidence:* At 360 SW, 'Utamaduni' (name width 126 = full tile) and 'Hali ya hewa' push the name onto its own flex line. The 18px glyph sits alone on row 1, the name starts at the tile padding (x≈17 inside the tile), and the meta keeps `padding-left: calc(18px + 12px)` = 30px. Those tiles are 160×115px while their neighbours are 74px (Uchumi, Michezo, Teknolojia) and 91px. 'Hali ya hewa' also splits 'TZS'/'18K'. At 320 EN every tile meta wraps to 2 lines (106×33), making tiles 91–98px. At 412 all tiles are a uniform 186×74.

### S02-home-13 · 🟡 medium · ➕ extends → U6 · layout
**Closing soonest row title height (evidence for U6)** — `/`

KNOWN (U6). The remaining cause of 121–185px rows is the unclamped 17px title, not the grid. Every row exceeds U6's ≤110px target, and SW is worst at 185px.

*Evidence:* Rows at 360 EN: 143/121/164/121px (title 292px wide, 4/3/5/3 lines at 17px). 360 SW: 143/164/185/143 (up to 6 lines). 320 EN: 164/143/164/143. 412 EN: 143/121/143/121. The ≤560 CSS already spans the title across the full width (`"i q q" / ". s p"`, globals.css:3781-3796), so U6's stated cause ('price column squeezes the title to ≈200px') is no longer true on live.

### S02-home-21 · 🟡 medium · ➕ extends → D3 / U7 · layout
**Chat bubble over home content (evidence for D3)** — `/`

KNOWN (D3/U7). New instance: on the landing page the bubble sits over a responsible-gambling compliance line in Swahili, and over the primary CTA.

*Evidence:* The fixed `button.cm-bubble-mobile` is 52×52 @292,648 (viewport). On home it covers the right edge of the 'Create account' CTA (clip) and 'Browse all 25 markets', the end of closing-soonest titles ('(Sep…' in s00), and at 360 SW the RG compliance motto 'Kama kucheza kamari imekuwa sio burudani, acha.' (s09), which wraps under the 18+ badge at x=16 w=314 and runs beneath the bubble.

### S02-home-code-10 · 🟡 medium · 🆕 new · state · unit: U26
**Up & Down eyebrow 'FAST GAME · LIVE' + live dot** — `/`

When no rounds are live, or the rounds query failed, the card still shows a pulsing live dot and says LIVE directly above a line admitting nothing is running. The two lines contradict each other.

*Evidence:* page.tsx:242-244 renders `<span className="live-dot" /> {t.home.updownEyebrow}` ('Fast game · live' / 'Mchezo wa kasi · hai' / '快速游戏 · 进行中', i18n-dict.ts:574/3177/5312) unconditionally. Only the line below branches, at :248-250 (`updownLiveCount > 0 ? '{n} rounds live now' : 'New rounds every few minutes'`). updownLiveRaw also falls back to [] on a query failure (:69).

### S02-home-code-11 · 🟡 medium · 🆕 new · a11y · unit: NEW: home semantics (heading outline, landmarks, accessible 
**Settled row link accessible name (.kp-settled__row)** — `/`

The aria-label replaces the row's content, so screen-reader users hear the question but never the outcome (YES/NO/refunded), the source, or the amount paid. Those are the facts this 'proof the cycle completes' strip exists to show.

*Evidence:* trust-band.tsx:181-185 `<Link … className="kp-settled__row" aria-label={question}>`. Measured row 1: aria-label 'Will at least one Premier League 2026/27 Gameweek 4 match end 0-0?' vs visible 'YES Will at least one … PREMIERLEAGUE.COM TZS 10,000 paid'. All 5 rows at 360 EN/SW/ZH match this pattern. The ellipsis on `.kp-settled__q` is CSS only (globals.css:4752-4760), so the full question is already in the DOM text.

### S02-home-code-14 · 🟡 medium · 🆕 new · number · unit: U6
**Closing-soonest rows (QuestionRow) — no deadline shown** — `/`

A list whose whole point is 'closing soonest' does not say when any of its markets close. The featured card beside it and the grid cards do show time left, so the same markets appear without their key figure in one place and with it in another.

*Evidence:* landing-hero.tsx:71-105 renders glyph, question, `formatTzs(row.pool)` and price only; row.bettableUntilMs is available but never rendered. The eyebrow at :180-185 reads 'Closing soonest' / 'Yanayofungwa karibuni' / '最快结束'. The grid cards below do show timeLeft (page.tsx:212).

### S02-home-code-16 · 🟡 medium · 🆕 new · state · unit: U26
**Pick-a-side grid + Browse-by-topic with a small open book** — `/`

On a launch-day or thin book the page loses its only topic navigation, even though topics exist, because the tiles are nested inside the grid's empty-check.

*Evidence:* page.tsx:167 `{comp.grid.length > 0 && (<Reveal band="board">…` wraps both the market grid and `<TopicTiles …/>` (:225-227). landing.ts:96-104 excludes the 5 hero markets (HERO_MARKETS=5, :31). With 1-5 open markets the grid is empty, so the whole band including the topic tiles disappears even though `comp.topics` is populated. With 6-10 open markets the grid shows 1-5 cards.

### S02-home-code-2 · 🟡 medium · ♻️ duplicate → S02-home-06 · layout
**Topic tile row: glyph + name (.kp-topic / .kp-topic__n)** — `/`

In Swahili the topic tiles fall apart. The icon is left on its own row, the name drops below it and loses its indent while the meta keeps it, tile heights differ (74/91/115), the Weather label is truncated at 320, and the odd seventh tile is orphaned.

*Evidence:* globals.css:4587-4590 sets `.kp-topic{display:flex; flex-wrap:wrap; gap:6px var(--sp-3)}`, and 4611-4621 sets `.kp-topic__n{flex:1 1 auto; min-width:0; white-space:nowrap; text-overflow:ellipsis}`. A flex line breaks on the item's max-content base size before min-width:0 can shrink it, so a long name wraps to its own line instead of ellipsising beside the glyph. The comment at 4606-4610 describes the ellipsis path, which never runs first. Measured SW 360: 'Utamaduni' and 'Hali ya hewa' nameW=126 (own line), tile h=115 beside 74px neighbours. SW 320: glyph left alone on row 1 in 5 of 7 tiles, and 'Hali ya hewa' scrollW 108 > clientW 106 renders 'Hali ya he…'. Three left edges per tile: glyph x+17, name x+17 (dropped line), meta x+47. With 7 tiles the last one sits alone at half width (Tech/Teknolojia at x=16, w=160).

### S02-home-code-3 · 🟡 medium · ♻️ duplicate → S02-home-13 · layout
**Plan U6 'Closing soonest' premise vs shipped code** — `/`

U6's work item is based on a layout that no longer exists, and its planned fix (a 3-line clamp) cannot meet its own ≤110px row target.

*Evidence:* docs/MOBILE-VISUAL-PLAN.md:399-402 says the 'i q p / . s p' grid with a 20px gap squeezes the title to ≈200px, and that below 561px the grid 'becomes i q / . s'. globals.css:3780-3796 already ships a ≤560.98 block with `grid-template-areas:"i q q" ". s p"`, and column-gap is --sp-4=16 (20 only ≥821, :3771). Measured title column: 292px (sub x=52 to 344). Row heights are still 121/121/143/164 in EN, 143/143/164/185 in SW, and 143-206 at 320 SW, because the cause is 17px/700 unclamped text, not a squeeze. U6 proposes a 3-line clamp: 12+3×21.25+8 row-gap+25 price line+12 = 121px, and the EN 3-line rows measure exactly 121. That misses U6's own accept of ≤110.

### S02-home-code-4 · 🟡 medium · ➕ extends → U6 · number
**Proof rail (.kp-proof) — U6 'three across' proposal** — `/`

The plan's condition ('only if SW captions and money don't clip') is already known to fail: three across at 360 or 320 clips today's pool figure and an unbreakable Swahili caption word.

*Evidence:* MOBILE-VISUAL-PLAN.md:405 proposes '.kp-proof phone block three across with numbers one rung down, only if SW captions and money don't clip'. The code's own arithmetic (globals.css:3678-3683) gives three 98.7px tracks at 360 with 81.7px usable after the 16px padding-left and hairline; at 320 that is 68.3px. One rung down (--type-h3 20px mono, 12px/char), today's live 'TZS 27K' is 84px, over both. The widest compact figure 'TZS 999.9B' is 120px. The SW caption word 'ZILIZOWEKWA' (heroProofPool, i18n-dict.ts:3163) alone is 11 chars x (6.6+1.54) = 89.5px at 11px, wider than the 81.7px track, so it cannot fit even when wrapped. Current stacked rail measured 47+60+60px.

### S02-home-code-5 · 🟡 medium · 🆕 new · layout · unit: U6
**Hero eyebrows over the conviction bar and the Closing-soonest board** — `/`

Two section labels sit flush on the element they label, with no space. On the conviction bar the tilting needle will cut through the label text whenever the crowd share drops below about 64%.

*Evidence:* landing-hero.tsx:159-161 (`<p className="kp-hero__eyebrow">` followed directly by TippingBar) and 180-186 (eyebrow followed by `.kp-qboard`). globals.css:3544 `.kp-hero__eyebrow{margin:0}`, 3692 `.kp-conv{max-width:620px}` and 3695 `.kp-qboard{border-top:1px solid var(--border-royal)}` add no spacing. Measured in all 4 runs: conv eyebrow bottom 490 = bar top 490 (0px), and board eyebrow bottom 599 -> board rule 600 (gapToBoardRule 0). The screenshot shows the needle overhanging about 7px above the rail into the eyebrow's glyph band. The EN eyebrow text runs to x≈212px (26 chars x 8.14px), so any board YES share below ≈64% draws the needle through the letters; today 74% puts it at x≈245.

### S02-home-code-6 · 🟡 medium · 🆕 new · layout · unit: U6
**Hero guest CTAs (Create account / Browse all N markets) and featured card position** — `/`

The page's one conversion action and the single playable card sit below a four-question board and a four- to five-line lede. On a budget phone a guest must scroll 1.7-2.4 screens to reach them, and the planned tightening does not change that.

*Evidence:* landing-hero.tsx:118-263 order: eyebrow+h1 -> proof -> conv -> board (4 rows) -> foot{lede, CTAs} -> featured card. Measured 'Create account' top: y=1325 in EN at 360x780 (1.7 screens), 1440 in SW, 1191 in ZH, and 1540 in SW at 320x640 (2.4 screens). Featured card 1481-1835 in EN. Hero height 1796 (EN), 1911 (SW), 2010 (320 SW). Estimated U6 savings (padding −16, 5 gaps −40, lede −30, proof ≈−100, clamped rows ≈−100) come to about 285px, leaving the CTA near y≈1,040, still under a 780px first screen.

### S02-home-code-7 · 🟡 medium · 🆕 new · typography · unit: U6
**Section headings and editorial claim on phones (.kp-shead__h, .kp-claim, .kp-step__h, .kp-lede)** — `/`

On a phone the page title, every section heading and two sub-headings are the same 32px, while a heading one level down (steps, 24px) is smaller than a sibling heading at the same level (32px). The size of a heading says nothing about its rank, and the 32px blocks add height the plan is trying to remove.

*Evidence:* globals.css:4491-4499 `.kp-shead__h{font-size:var(--type-h1)}` (32px, no phone step) is used for h2 'Predict events…' (how-it-works.tsx:32), h2 'Pick a side now' (page.tsx:180), h3 'Browse by topic' (topic-tiles.tsx:41), h2 'Up & Down' (page.tsx:245) and h3 'Recently settled' (trust-band.tsx:109). globals.css:4681-4691 `.kp-claim` is 32px; 3571-3585 hero h1 is 32px ≤560; 4560-4567 `.kp-step__h` is 24px; 4515-4521 `.kp-lede` is 20px. Measured at 360: H1 32, all H2 32, H3 'Browse by topic' 32, H3 steps 24, H3 trust cells 17. SW 'Chagua upande sasa' and 'Yaliyokamilika hivi karibuni' take 2 lines; the EN claim takes 4 lines/148px.

### S02-home-code-8 · 🟡 medium · ♻️ duplicate → S02-home-05 · a11y
**Heading outline — trust band and featured card** — `/`

Screen-reader heading navigation files the trust claims and the settled results under 'Up & Down'. The 'why trust this' section has no heading of its own.

*Evidence:* trust-band.tsx:40-49 renders the band's title as `<p className="kp-claim">`, then `<h3 className="kp-trust__h">` x3 (:81) and `<h3 className="kp-shead__h">Recently settled` (:109) with no h2 in the band. Measured outline: H2 'Up & Down' -> H3 'Named public sources' / 'Signed off by an officer' / 'Mobile money in and out' / 'Recently settled'. The featured card's H3 (y=1529) sits directly under the hero H1 with no H2. 'Browse by topic' is an H3 at the same level as the six card titles before it.

### S02-home-code-9 · 🟡 medium · 🆕 new · card · unit: U6
**Up & Down promo card (.kp-updown)** — `/`

The card uses four type sizes and a 20px inset, and its spacing comes from inline patches on other sections' classes, so it cannot follow the card rungs and will drift when those classes change.

*Evidence:* page.tsx:239-257 builds the card from borrowed classes with inline overrides: `kp-hero__eyebrow` + `style={{marginBottom:'var(--sp-1)'}}` (:242), `kp-shead__h` + `style={{marginTop:0}}` (:245), `kp-trust__b` + `maxWidth:'52ch'` (:246), `kp-topic__m` + `paddingLeft:0, marginTop` (:247). globals.css:4663 `.kp-updown{padding:var(--sp-5)}`. Measured: padding 20px; type sizes 11/32/13/15 (4 sizes); eyebrow-to-h2 gap 4px, against 8px everywhere else (`.kp-shead__h` margin-top --sp-2, :4498); tagline in 13px body copy.

### S02-home-08 · ⚪ low · 🆕 new · container · unit: U5
**Seam between the Recently settled list and the RG line (.kp-settled → .kp-rg)** — `/`

The page shows an empty ruled strip that reads as a blank table row, followed by another 93px gap before the footer.

*Evidence:* The last settled row ends at y=7356 with a 1px bottom border. `.kp-rg` starts at y=7420 with a 1px top border and 32px padding-top. That leaves two hairlines 64px apart with nothing between them, identical at 360 EN, 360 SW (7550→7614), 320 (7505→7569) and 412 (7095→7159). The gap is `.kp-band--closes` padding-bottom `--rh-section` 64px. The void scanner flags the next gap too: RG line → footer 18+ badge is 93px.

### S02-home-09 · ⚪ low · 🆕 new · copy · unit: NEW: RG line vs footer duplication (compliance sign-off)
**RG line (18+ badge + motto) duplicated by the footer** — `/`

The same compliance message appears twice within about 1.2 screens, in two compositions: a 28px badge with an inline motto, and a badge beside the wordmark with the motto as a list item. The duplication the component was trimmed to avoid is still there.

*Evidence:* `span.kp-rg__18` appears at y=7453 (RG line) and again at y=7574 (footer brand row), 121px apart, at 360 EN (SW 7647/7799; 320 7602/7723; 412 same). The motto 'If gambling stops being fun, stop.' is `span.kp-rg__say` 13px italic at y=7457 and again as `li.italic.text-body-sm` 13px at y=7954 in the footer PLAY SAFE list. rg-line.tsx:25-27 justifies the line as 'the part that is not restated anywhere above the footer: the 18+ badge and the motto', but the footer restates both one scroll away.

### S02-home-10 · ⚪ low · 🆕 new · layout · unit: NEW: home settled strip fit (row alignment, question clamp)
**Recently settled rows: question/source/amount column start** — `/`

The repeated settled rows have a stepped left edge that shifts with the outcome word. In Swahili it jumps 20px.

*Evidence:* Each row is its own grid with an `auto` chip column, so chip width sets the content column. EN: YES chip 41px → content at x=73; NO chip 35px → x=67 (6px jag). SW: NDIO 47px → x=79; HAPANA 67px → x=99 (20px jag). Visible in the SW settled clip as a stepped left edge.

### S02-home-11 · ⚪ low · 🆕 new · copy · unit: NEW: home copy pass (owner + native readers)
**Zero-pool wording across home** — `/`

A first-time visitor sees 'TZS 0', 'No pool yet' and 'No bets yet' for the same condition within three screens.

*Evidence:* The same state (nothing staked) is written four ways on one page. Closing soonest row: sub 'TZS 0' plus price '— No bets yet' (landing-hero.tsx:82,88-89). Topic tile: '5 live · TZS 0'. Market card meta: 'No pool yet'. Card body: 'No bets yet / Be the first to predict'. In the row, the em-dash is 20px mono bold (`.kp-qrow__num`) beside an 11px letter-spaced label, so it renders as a heavy bar glued to the text.

### S02-home-12 · ⚪ low · ❌ refuted · number
**Pool compaction mixed within the page** — `/`

One figure is shown in two formats on the same scroll, and compaction is chosen per component rather than per role, so the page reads as if it has two different pools.

*Evidence:* The Weather market's pool is 'TZS 18,000' on the featured card meta (@32,1763, formatTzs) and 'TZS 18K' on the Weather topic tile (@201,5500, formatTzsCompact). Across the page: hero proof 'TZS 27K' (compact), closing-soonest sub 'TZS 2,000' (full), grid card meta 'TZS 4,000' (full), settled 'TZS 10,000 paid' (full), header ticker 'TZS 10K' (compact).

### S02-home-14 · ⚪ low · 🆕 new · icon · unit: U6
**Closing soonest category glyph (.kp-qrow__glyph)** — `/`

The leading icon drifts down to line 3 of long questions, so it no longer marks the start of the row.

*Evidence:* The glyph is centred on the whole title block, not its first line. Glyph centre minus first-line centre: 360 EN 32/21/43/21px, 360 SW 32/43/53/32px, 320 EN 43/32/43/32px. `.kp-qrow` has `align-items:center` (globals.css:3700). On the 5–6 line rows the icon floats beside the middle of the question.

### S02-home-15 · ⚪ low · 🆕 new · typography · unit: NEW: off-ladder type census (close the ladder in globals.css
**Off-ladder sizes rendered on home** — `/`

Sizes outside the closed ladder appear on the landing page's own controls (CTAs, settled chips), and a 9px non-mono label breaks the rule that 9.5/8.5 are for uppercase mono microlabels only. The hero stacks 13 sizes in about 2.3 screens.

*Evidence:* Off-ladder text with owners (360 EN): 16.5px Inter 600 on both hero CTAs (`.btn-xl`, globals.css:1091). 10.5px Inter 700 uppercase on the settled outcome chips and card status chips (Chip md, as noted at trust-band.tsx:186-189). 11.5px Sora 600 on `a.mcardp-details` ×7. 11.5px mono in `span.text-[11.5px]` inside YES/NO ×24. 9px Inter 700 uppercase on the featured card 'LIVE' chip. The page uses 18 distinct sizes; the hero band alone has 13 (9, 9.5, 10, 11, 11.5, 13, 15, 16.5, 17, 20, 24, 28, 32) and the board band 12.

### S02-home-16 · ⚪ low · 🆕 new · a11y · unit: NEW: home semantics (heading outline, landmarks, accessible 
**Up & Down promo link (.kp-updown)** — `/`

A screen reader announces a long run-on link, and the visible 'button' is not a button. It is the same target as the rest of the panel.

*Evidence:* The whole panel (328×237 @16,5692 at 360) is one `<a href=/updown>` containing an eyebrow, an `h2`, the tagline, the round count and a `span.btn.btn-primary.btn-lg` that looks like a button. It has no aria-label, so its accessible name is the 118-character concatenation 'FAST GAME · LIVE Up & Down Will the price be higher or lower when the clock runs out? 3 rounds live now Play Up & Down' (page.tsx:220-243). The closing-soonest row links are similar, with names of 106–180 characters and no aria-label.

### S02-home-17 · ⚪ low · 🆕 new · icon · unit: NEW: home element polish (icon sizes, eyebrow compositions)
**Trust glyphs and category glyph sizes** — `/`

26px is off the icon set, and one meaning (topic) is drawn at three sizes within four screens.

*Evidence:* Trust cell glyphs are 26×26 (`I.shieldcheck/resolved/phone s={26}`, trust-band.tsx:61-63). The same category glyph is drawn at 20px in closing-soonest rows (landing-hero.tsx:76), 18px on topic tiles (topic-tiles.tsx:52,63) and 13px as the card category icon (`span.mcardp-catico`), all on one page.

### S02-home-18 · ⚪ low · 🆕 new · typography · unit: U6
**Hero eyebrow at 320 ('TANZANIA · DAR ES SALAAM · EST. 2026')** — `/`

The date splits from its label and the accent tick floats between the two lines.

*Evidence:* At 320 the eyebrow wraps to 2 lines with 'EST.' at the end of line 1 and '2026' alone on line 2. The hero heading block grows from 82px (360) to 98px (320). The 2×14 gilt tick is centred on the 2-line block, not the first line (`.kp-hero__eyebrow` is flex with `align-items:center`, globals.css:3534-3544). SW 'TANGU 2026' fits at 360 but is longer.

### S02-home-19 · ⚪ low · ♻️ duplicate → S02-home-code-9 · container
**Up & Down promo panel padding** — `/`

Panel padding sits off the phone rung, and the panel's content edge is 4px in from every other content edge on the page.

*Evidence:* `.kp-updown` padding is 20px (`var(--sp-5)`, globals.css:4663) below 768px; radius 16, border 1px. The panel is 328×237 at 360. Other phone panels on the page (topic tiles 12/16) and the phone rung expect 16.

### S02-home-20 · ⚪ low · ➕ extends → U5 · layout
**Band seams over the 48 rung (evidence for U5/U6)** — `/`

KNOWN (U5/U6 rhythm). New detail: the 'closes' pairing double-counts a section gap plus a close gap, so U5's token step alone leaves this seam at 72px, above the 48 rung.

*Evidence:* The void scanner gives the same gaps at all 4 viewports: Up & Down panel → trust eyebrow 98px (`.kp-band--closes` 64 + claret rule 1 + `--rh-close` 32); hero → How it works 66; How → board 66; topic tiles → Up & Down 64; settled → RG 64; RG → footer badge 93. Arithmetic after U5 (`--rh-section` 48, `--rh-close` 24): the Up & Down → trust seam still resolves to 48 + 24 = 72px.

### S02-home-22 · ⚪ low · ⚖️ intentional · copy
**Hero featured card placement and label** — `/`

The market that actually closes soonest is the unlabelled card below the list titled 'Closing soonest'. The list title is inaccurate as displayed and the card has no stated reason to be there.

*Evidence:* The featured card ('Will Mwanza record wind gusts…', '3d left', @16,1481) is `ordered[0]`, the market closing first (hero.ts:99-100), while the board labelled 'Closing soonest' shows `ordered.slice(1,5)`. The card renders below the lede and CTAs with no eyebrow. The comment at landing-hero.tsx:224 says 'The SAME market that leads the question board', which the code no longer does.

### S02-home-23 · ⚪ low · 🆕 new · typography · unit: U6
**How it works lede (.kp-lede) outside U6's lede step** — `/`

After U6 the page would have two lede sizes: hero 17 and How it works 20. The second lede keeps the chunky 20px text U6 is meant to remove.

*Evidence:* `.kp-lede` (globals.css:4515) is `--type-h3` 20px / 1.5, like `.kp-hero__lede`. The How it works lede 'Every question is a real-world event…' is 5 lines at 360 EN and SW, and it sits above 24px step headings (`.kp-step__h`). The How band is 972px (1.25 screens) at 360. U6 steps only `.kp-hero__lede` (:3546) down to `--type-h4`.

### S02-home-24 · ⚪ low · 🆕 new · container · unit: U5
**RG line band (.kp-band--overlay.kp-band--seam + .kp-rg)** — `/`

The compliance line's container has zero bottom padding, so its content touches the tinted edge, and the source comment describing the gap below it is wrong at phone widths.

*Evidence:* page.tsx:276 `style={{ paddingBlock: 0, borderTop: 0 }}`; globals.css:4799-4806 `.kp-rg{padding-top:var(--rh-close); border-top:1px}`. Measured band h 61 = 32 + 1 + 28, with the 18+ badge bottom (7481) equal to the band bottom (7481). The tinted surface ends flush under the badge; the footer is 48px lower on a different surface (public-footer.tsx:102 `mt-8 lg:mt-12`). In SW the sentence wraps below the badge (band h 93 at 360, 112 at 320), leaving the badge alone on its row. page.tsx:270-275 says the footer margin is 'mt-12 … 128px … on every page', which is only true at ≥1024.

### S02-home-25 · ⚪ low · 🆕 new · a11y · unit: NEW: home semantics (heading outline, landmarks, accessible 
**18+ badge and empty conviction bar names** — `/`

The 18+ label carries an ignored or prohibited ARIA name. On a cold book the conviction bar is announced as a loading indicator, followed by the same sentence a second time.

*Evidence:* rg-line.tsx:40 `<span aria-label={t.footer.eighteenPlus} className="kp-rg__18">{t.footer.eighteenPlus}</span>` puts an aria-label on a role-less span (prohibited on generic, and identical to the text). brand.tsx:291-297: the empty TippingBar is `role="progressbar"` with no aria-valuenow (announced as busy/indeterminate), and its aria-label is heroConvEmpty. landing-hero.tsx:165-167 then prints the same heroConvEmpty sentence visibly, so it is announced twice.

### S02-home-26 · ⚪ low · 🆕 new · copy · unit: NEW: home copy pass (owner + native readers)
**Count strings at n = 1** — `/`

With one open market or one live round, the English page reads 'Browse all 1 markets', 'All 1 markets', '1 rounds live now' and '1 close today'.

*Evidence:* i18n-dict.ts:566 '{n} close today', :568 'Browse all {n} markets', :577 '{n} rounds live now', :618 'All {n} markets'. `fill()` (utils.ts:399-403) is plain substitution with no plural support. landing.ts:28-31 and globals.css:3428-3432 name the one-market launch-day case as expected.

### S02-home-27 · ⚪ low · ♻️ duplicate → S02-home-17 · icon
**Trust glyphs and eyebrow markers** — `/`

The trust icons use an off-ladder 26px size, and the page uses three eyebrow compositions and two sizes of the same red live dot.

*Evidence:* trust-band.tsx:61-63 `<I.shieldcheck s={26} />` etc., measured 26x26 x3, unplated. The eyebrow marker varies within one page: gilt tick on location/how/pick/topic/trust/settled eyebrows (landing-hero.tsx:121 etc.); no marker on the conviction and board eyebrows (landing-hero.tsx:159, :180); a 6px `.live-dot` on the Up & Down eyebrow (page.tsx:243, globals.css:1291-1296); an 8px `.kp-proof__pip` (globals.css:3628-3635) for the same live signal in the proof rail.

### S02-home-28 · ⚪ low · ♻️ duplicate → U3 · container
**Market grid gap (.market-grid)** — `/`

The card stack gap is off the spacing ladder.

*Evidence:* globals.css:3003 `.market-grid{gap:14px}`, hand-typed and between --sp-3 (12) and --sp-4 (16). On home it spaces the six 1-column cards (band 2804px tall at 360 EN).

### S02-home-29 · ⚪ low · 🆕 new · motion · unit: U28
**Market-grid card stagger inside an unrevealed Reveal band** — `/`

Six card animations run with nobody watching, costing compositor work on low-end phones for a stagger that is never seen.

*Evidence:* globals.css:3457-3469 `.market-grid > *{animation:kp-rise … both}` with 40ms steps starts at first paint. The board band is `.js [data-reveal]:not([data-revealed]){opacity:0}` (globals.css:5003-5006) until it is 10% into the viewport (page.tsx:168), about 2,900px down at 360. The cascade therefore plays invisibly, and the visitor sees only the band's single 12px rise.

### S02-home-30 · ⚪ low · 🆕 new · copy · unit: NEW: home copy pass (owner + native readers)
**How-it-works step 2 body and live market titles** — `/`

Player copy exposes an operator configuration switch the player cannot see ('when … enabled'); one eyebrow just repeats its heading; and one live market shows English in ZH plus a Swahili spelling error.

*Evidence:* i18n-dict.ts:607 howStep2B '… An officer signs it off — two, when two-officer authorisation is enabled.' (SW :3194, ZH :5329). Topic eyebrow 'TOPIC' directly over heading 'Browse by topic' (topic-tiles.tsx:37-41). Live data at 360: ZH grid card title in English ('Will Manchester City win the Premier League 2026/27?', titleZh empty, pickLocalized fallback); SW 'Je, Manchester City wata shinda…' ('wata shinda' should be 'watashinda').

### S02-home-31 · ⚪ low · ♻️ duplicate → D3 / U7 · layout
**Known D3 — chat bubble over home elements (new instances)** — `/`

Already registered as D3 (U7). These are additional instances on hero rows, the promo card and topic tiles, not new defects.

*Evidence:* Screenshots: home-360-en__board.png shows the 52px bubble over the 4th Closing-soonest title ('Will a new marathon world r…'); home-360-en__updown.png shows it over the right edge of the Up & Down tagline; home-320-sw__topics.png shows it over the Teknolojia tile's corner.

### S02-home-32 · ⚪ low · ➕ extends → D25 / U27 (and D26 / U25) · state
**Known D25 / D26 — home hover rules and home loading ghost (new evidence)** — `/`

Evidence for known D25 and D26: more sticky-hover sites on the home page, and a home loading state that bears no relation to the page's shape.

*Evidence:* D25 (U27) already lists `.kp-qrow:hover`. Further ungated home rules: globals.css:4599-4603 `.kp-topic:hover{transform:translateY(-1px); border-color…}`, :4654 `.kp-topic:hover .kp-topic__lean`, :4671 `.kp-updown:hover`, :4749-4750 `.kp-settled__row:hover`, :4514 `.kp-shead__link:hover`, and :1065 `.btn:hover` on the Up & Down span.btn. None is inside `@media (hover:hover)`. D26 (U25): src/app/loading.tsx serves `/` a generic `<SectionLoader height={360}/>` in `px-3 lg:px-6 py-10`, against a hero that measures 1796px (EN) / 1911px (SW) at 360.

### S02-home-code-12 · ⚪ low · ♻️ duplicate → S02-home-10 · layout
**Settled rows — text column start (.kp-settled__row grid)** — `/`

The three text lines of each settled row start at a different horizontal position depending on the outcome word, so the list has no common left edge, by up to 20px in Swahili.

*Evidence:* globals.css:4734 `grid-template-columns:auto minmax(0,1fr)` is sized per row, and each row is its own grid. Measured pill widths: EN YES 41px / NO 35px; SW NDIO 47px / HAPANA 67px; ZH 29px. The question, source and amount therefore start at x=73 vs 67 in EN (6px) and x=79 vs 99 in SW (20px), alternating down the list. The screenshot shows the ragged left edge.

### S02-home-code-17 · ⚪ low · 🆕 new · copy · unit: NEW: home copy pass (owner + native readers)
**Signed-in hero ghost CTA 'My positions' (SW)** — `/`

A signed-in Swahili player sees 'Nafasi zangu' on the home CTA and 'Madau yangu' in the navigation for the same page. That is two names for one destination, and invisible to any guest screenshot.

*Evidence:* landing-hero.tsx:206-208 reads `t.home.myPositions`, which is SW 'Nafasi zangu' (i18n-dict.ts:3174). The same destination elsewhere is SW 'Madau yangu': nav `myBets` (:2676), `help.myPositions` (:4281), and EN `myPositionsSw: "Madau yangu"` (:2008).

### S02-home-code-18 · ⚪ low · ♻️ duplicate → S02-home-03 · button
**Hero CTAs (.btn.btn-xl.rounded-pill.kp-hero__cta)** — `/`

The pill shape the markup asks for never renders. The buttons show a 16px radius (the card radius, not the control 12 or pill rung) and a 16.5px label that is not on the type ladder, and U6 will leave both in place.

*Evidence:* landing-hero.tsx:202, 206, 212, 216 set `className="btn btn-primary/btn-ghost btn-xl rounded-pill kp-hero__cta"`. globals.css:1091 `.btn-xl{height:var(--h-control-xl); font-size:16.5px; border-radius:var(--r-lg)}` comes after `@tailwind utilities` (globals.css:24), so at equal specificity it overrides the `rounded-pill` utility. Measured: radius 16px, font-size 16.5px, height 56px in all runs. U6 (MOBILE-VISUAL-PLAN.md:403-404) changes only the height and keeps `btn-xl`.

### S02-home-code-19 · ⚪ low · ♻️ duplicate → S02-home-03 · button
**Up & Down CTA vs hero CTAs — one job, two compositions** — `/`

The two primary promotional buttons on the page differ in height, radius, type size and width behaviour.

*Evidence:* page.tsx:253 `<span className="btn btn-primary btn-lg shrink-0">`, measured 48px high, radius 12, 15px, width 203 (EN) / 229 (SW) / 133 (ZH), left-aligned at x=37. Hero primary CTA (landing-hero.tsx:212) measured 56px, radius 16, 16.5px, full width 328.

### S02-home-code-20 · ⚪ low · 🆕 new · typography · unit: NEW: home settled strip fit (row alignment, question clamp)
**Settled question single-line ellipsis (.kp-settled__q)** — `/`

On a phone every settled question is cut to about 36 characters, so two rows about different Newcastle–Leeds markets read identically, while the row already spends three lines of height.

*Evidence:* globals.css:4752-4760 `.kp-settled__q{white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:var(--type-small)}`. Measured qClipped=true on 5 of 5 rows in every run; row height 90px with 3 lines (question, source, amount). Visible text: 'Will Newcastle United receive more yello…'.

### S02-home-code-21 · ⚪ low · 🆕 new · typography · unit: U6
**Closing-soonest row type sizes (.kp-qrow)** — `/`

Each question row uses four type sizes, and the percentage number (20px) outranks the question it prices (17px).

*Evidence:* globals.css:3718-3726 q 17px, 3727-3733 sub 13px, 3790 num 20px (≤560), 3746-3752 unit 11px. Measured sizes per row: [17, 13, 20, 11] in every run.

### S02-home-code-22 · ⚪ low · ♻️ duplicate → U5 / S02-home-20 · container
**Heading-to-content rhythm across home sections** — `/`

The same relationship (a heading and the content it introduces) is spaced 24, 32 or 65px depending on the section, on one scroll.

*Evidence:* globals.css:4489 `.kp-shead{margin-bottom:var(--rh-tight)}` gives heading -> market grid 24px (measured 24). globals.css:4580 `.kp-topics{margin-top:var(--rh-close)}` gives topic heading -> tiles 32 (measured 32). globals.css:4725 `.kp-settled{margin-top:var(--rh-close)}` gives settled head -> list 32 (measured 32). globals.css:4528 `.kp-steps` gives 32. globals.css:4696-4698 `.kp-trust{margin-top; padding-top: var(--rh-close); border-top}` gives claim -> first trust glyph 65px (6199 -> 6264). The --rh-tight comment (globals.css:241) defines 'a heading and the thing it labels' as 24.

### S02-home-code-23 · ⚪ low · ❌ refuted · typography
**Mono uppercase label tracking (.kp-shead__link vs eyebrows)** — `/`

The 'ALL 25 MARKETS' link sits directly under an eyebrow with different tracking, reintroducing the 0.16 value the shared rule was created to remove. The page has three trackings for one label role.

*Evidence:* globals.css:4509 `.kp-shead__link{letter-spacing:0.16em}`, measured 1.76px. Eyebrows use the shared §T3 0.14em rule (globals.css:979-995), measured 1.54px. `.kp-qrow__unit` 0.1em (:3750) and `.kp-settled__src` 0.1em (:4766) are other values. The comment at globals.css:3436-3441 deleted an earlier 0.16em 'second definition of the section eyebrow'.

## S03-markets — Markets board (discovery bar, filters sheet, search, cards, pager)

### S03-01 · 🟠 high · 🆕 new · layout · unit: U9
**Board stats row '25 hai · TZS 27K katika mchezo' (p.whitespace-nowrap)** — `/markets`

In the players' main locale at the floor width, the only visible board headline runs past the viewport edge and its label is cut off. It sits next to a money figure and cannot wrap or shrink.

*Evidence:* mk-320-sw.deep.json statsRow: the p spans x81→325 and 'katika mchezo' spans 227→325 with vw=320, not inside any scroller (pokes list). The screenshot shows the word cut at the right screen edge ('katika mchezc'). At 360 SW the row already ends at exactly 344 (0px slack). Source: src/app/markets/page.tsx:171-189, whitespace-nowrap at :176.

### S03-02 · 🟠 high · 🆕 new · number · unit: U10
**Card pool slot on cold-start cards ('Hakuna bwawa bado' in .mcardp-meta)** — `/markets`

The pool slot is where money is shown, and on every cold-start card at 320 SW it is ellipsised. The meta row has only one line, and the SW countdown plus the 44px info plate take the space.

*Evidence:* cold-320-sw.json: meta 256px wide; span 'Hakuna bwawa bado' sw112 > cw101, text-overflow ellipsis; time-left 'siku 9 zimebaki' 148px + 44px info button keep their width. Renders 'Hakuna bwawa b…' on all 7 cold-start cards on page 1 (mk-320-sw digest CLIPPED #5-#11). CSS: src/app/globals.css:3975 (.mcardp-meta > span ellipsis) and :3981 (.mcardp-meta-right flex-shrink:0).

### S03-03 · 🟠 high · 🆕 new · button · unit: U3
**Card share button (button.mcardp-share) hit area** — `/markets`

The share control's touch target is 25px wide and 36px tall, under the tap floor in both directions, on every card on every board.

*Evidence:* The box is 13x13 on every card (15 per page: 12 open + 3 resolved). Computed ::after is left/right -6px, top -9px, bottom -14px, so the reach is 25x36 CSS px. Source: src/app/globals.css:5106-5113. market-card.tsx:472-473 claims 'Both controls reach 40px through their own out-of-flow pseudo-element'; Details does reach 40.25px tall, share does not.

### S03-10 · 🟠 high · 🆕 new · number · unit: NEW: market-card state truth (empty pool, outcome ink, SOON 
**Resolved cards with zero volume (tipping bar needle, pool 'TZS 0', '0 predictors')** — `/markets?q=Tanzania (Markets match section), /markets (Recen`

A settled market nobody bet on shows an invented 50% split and a centred needle. Live empty cards correctly say 'No pool yet' and draw an empty bar, so there are also two treatments for the same empty pool.

*Evidence:* q-360-en: 6 resolved match cards all show '0 predictors' and 'TZS 0' with a centred 50/50 needle and full green-red gradient (q-360-en__s06.png: 'Will Dar es Salaam…' Resolved NO, 'Nane Nane…' Resolved YES). mk-360-en resolved card 3 also 'TZS 0'. Source: src/components/markets/market-card.tsx:276-277 (fresh and noPrice are both gated on live &&), :386 (TippingBar empty={noPrice}), :450 (formatTzs(volume)).

### S03-markets-F01 · 🟠 high · ♻️ duplicate → S03-02 · number
**Market card meta row - pool volume (TZS) span** — `/markets`

The pool figure is the one item in the meta row that is allowed to shrink, so on SW cards (and at 320) the money is ellipsised ('TZS 12,800,0...') while the time-left and the info button keep their full width.

*Evidence:* globals.css:3975 `.mcardp-meta > span:not(.dot):not(.mcardp-meta-right) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }` applies to market-card.tsx:450 `<span>{fresh ? t.market.noPoolYet : formatTzs(volume)}</span>`, while globals.css:3981 `.mcardp-meta-right { margin-left:auto; ... flex-shrink:0; }` holds the time-left plus the 44px `.mcardp-info` (globals.css:3998). Card content box at 360 = 328 - 30 padding (globals.css:3855 `padding: 14px 15px 13px`) - 2 border = 296px. SW live card: 'siku 12 zimebaki' (i18n-dict.ts:3269) 16ch x 6.6px (11px mono) = 106 + 6 gap + 44 info = 156 fixed; 'TZS 12,800,000' 14ch = 92 + gap/dot/comment cluster ~51 -> ~299 > 296. 'masaa 23 yamebaki' (17ch) clips a 7-figure pool. At 320 (content 256) any 7-figure SW pool with comments clips ~37px.

### S03-markets-F02 · 🟠 high · ♻️ duplicate → S03-10 · number
**Market card probability (%), tipping bar and meta on selection-closed / CLOSED cards with an empty pool** — `/markets?status=progress (and status=all)`

A market that closed with no bets shows 'YES 50%', a balanced needle and 'TZS 0' on the In-progress and All lenses. The 50% is a hard-coded default, not a crowd price.

*Evidence:* market-card.tsx:276-277 `const fresh = live && (isNew ?? (volume === 0 && predictors === 0)); const noPrice = live && (isNew ?? volume === 0);` with market-card.tsx:227 `const live = status === "LIVE" && !selectionClosed;`. page.tsx:332 passes `yesPct={impliedYesPct(m)}` and market-service.ts:317 `if (total === 0) return 50;`. For a selection-closed or CLOSED row (page.tsx:336-339) with pool 0: market-card.tsx:369-370 renders caption YES + `{yesPct}%` = 50%, :386 `empty={noPrice}` is false so the bar draws a centred 50/50 needle, :450 prints `formatTzs(0)`. page.tsx:106-108 itself says passing that 50 into anything would be 'a number nobody produced'.

### S03-markets-F03 · 🟠 high · 🆕 new · number · unit: NEW: market-card state truth (empty pool, outcome ink, SOON 
**Resolved market card outcome word and 'RESULT' caption (Recently resolved strip)** — `/markets (Recently resolved section)`

A market that settled NO shows its outcome in large betting-YES green, so the colour contradicts the word on a money result.

*Evidence:* market-card.tsx:369-370 renders `t.market.result` in `.mcardp-pctcap` and `outcomeLabel` in `.mcardp-pct` when `isResolved`. globals.css:3919 `.mcardp-pct { ... font-size: 28px; ... color: var(--yes-400); }` and globals.css:3922 `.mcardp-pctcap { ... color: var(--yes-400); }`. A grep of src/**/*.css finds no other `.mcardp-pct` rule (only :3919, :3920, :4059), so NO / HAPANA / 否 and VOID / BATILI / 已作废 are painted 28px YES-green.

### S03-markets-F07 · 🟠 high · ♻️ duplicate → S03-03 · button
**Card share glyph (compact ShareButton) and Details link** — `/markets`

The share target is 40px tall but only 25px wide, well under the tap floor on the axis a thumb misses most.

*Evidence:* share-button.tsx:97-103 compact variant = `className="mcardp-share"` around a 13px glyph with no padding (Tailwind preflight button padding 0). globals.css:5106-5113 `.mcardp-share::after { left: -6px; right: -6px; top: -9px; bottom: -14px; }` gives a hit area of 13+12 = 25px wide x 40px tall. The footer row gap is market-card.tsx:477 `gap-2` (12px).

### S03-markets-F10 · 🟠 high · ♻️ duplicate → S03-01 · layout
**Board header row - '{n} live · TZS x in play' figure line** — `/markets`

The nowrap figure line cannot shrink or wrap, so in Swahili at 320 it pushes past the gutter and can make the document scroll sideways.

*Evidence:* page.tsx:171 `<div className="mb-3 flex items-center justify-between gap-3">`; page.tsx:176 `<p className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[12.5px] tabular-nums">` with SignalPip 7 + mr-0.5, five `gap-1.5` (8px) gaps, and 'hai' / 'katika mchezo' (i18n-dict.ts:3231-3232). Estimate at 12.5px mono (7.5px/ch): '49 hai · TZS 1.3M katika mchezo' ≈ 252px + eyebrow 'MASOKO' ≈ 49px + 16 gap = 317 > 288px content at 320, so ~29px horizontal overflow. At 360 a 3-digit count leaves ~4px.

### S03-04 · 🟡 medium · 🆕 new · textbox · unit: U9
**Search field clear controls (native ::-webkit-search-cancel-button + button.clear-btn)** — `/markets (typed 'Tanz', not submitted)`

Two different clear designs for one job appear the moment a player types. The native one has a glyph-sized target, and the custom one is 38px, under the floor.

*Evidence:* search-360-en__settled.png shows two ✕ glyphs side by side in the field: Chrome's native search-cancel (bold ✕ at about x279) and the custom clear button 38x38 at x302-340 (vy159). The input is type=search (src/components/ui/search-box.tsx:148). globals.css has no ::-webkit-search-cancel-button rule (grep: none). The custom button is 38x38 at src/app/globals.css:1749.

### S03-05 · 🟡 medium · 🆕 new · filter · unit: U4
**Open sort menu (details.kp-menu [role=listbox]), last option 'Newest first'** — `/markets (sort summary tapped at page top)`

On short phones the sort menu opens partly under the bottom navigation, so one sort is not visible or tappable until the player scrolls the page with the menu open.

*Evidence:* sort-320-en.json: listbox x16 vy338-612 (z-30 inside the bar's z-20 stacking context). Bottom rail is fixed at vy575-640, z-40. elementFromPoint at the centre of option 6 (vy563-607) returns a.kp-rail__item, so 32 of 44px sit under the rail. The same geometry at 360/412 is fully visible (hit=self). Any viewport under about 677px tall (360x640 budget phones) hides it. Source: src/components/markets/menu-shell.tsx:111 (absolute, max-h min(60vh,420px)); src/components/ui/query-bar.tsx:53 (z-20).

### S03-06 · 🟡 medium · 🆕 new · filter · unit: NEW: filter sheet phone fit (16px padding, radius, topic gri
**Filters sheet TOPIC grid** — `/markets (Filters sheet open)`

At 320 the sheet turns eight short topics into a one-per-row list with an empty right half. Most of the sheet has to be scrolled inside a 340px window.

*Evidence:* sheet-320-en.json: topic row grid-template-columns=278px (one column); 8 topic pills stacked vy532-940. The body shows 340px of 734px of content (2.16x); the TOPIC group alone is 434px tall. At 360 it is 155px 155px (two columns). Cause: repeat(auto-fill,minmax(148px,1fr)) needs 148*2+8=304px but the content box is 278px. Source: src/components/markets/discovery-bar.tsx:324.

### S03-07 · 🟡 medium · 🆕 new · container · unit: NEW: filter sheet phone fit (16px padding, radius, topic gri
**Filters sheet panel side padding (.kp-fsheet-panel)** — `/markets (Filters sheet open)`

The sheet uses a different gutter from the page behind it, and those 4px per side are exactly what makes the odds and pool rows wrap at 360.

*Evidence:* All 5 sheets measure padding 12/20/16/20 with content at x21, while the page column (bar, search, cards) sits at x16. Source: src/app/globals.css:3347 (var(--sp-5)); its comment says the page lays out in px-4 = 20, which is false live. Consequence at 360: the ODDS row needs 80+110+114+24=328px > 318 and wraps; the POOL row needs 80+107+109+24=320px > 318 and wraps by 2px ('TZS 50k+ 0' drops to its own row), adding about 112px of body height.

### S03-08 · 🟡 medium · 🆕 new · typography · unit: U3
**Market card type sizes (open cards, all variants)** — `/markets, /markets?status=all, /markets?q=Tanzania`

Each card mixes 7-8 type sizes, three of them hand-typed off-ladder values. This adds to the 'chunky' noise and conflicts with the closed ladder.

*Evidence:* Per-card distinct sizes (aria-hidden text excluded): priced cards 9/9.5/10/11/11.5/13/15/28 (8 sizes); cold-start 9/10/11/11.5/13/15/22 (7). Off-ladder: 9px Inter 700 LIVE/MUBASHARA/实时 chip (src/components/ui/chip.tsx:161-163, xs fontSize 9); 10.5px Inter 700 TIPPING chip (chip.tsx:172, md); 11.5px mono '@ 83%' price suffix inside YES/NO (src/components/markets/market-card.tsx:433,436); 11.5px Sora 'Details' (src/app/globals.css:4017). Page histograms: '9px Inter 700' 72-174 chars and '11.5px Sora 600' 84 chars on every load.

### S03-09 · 🟡 medium · 🆕 new · card · unit: U3
**Card status chips in one row (LIVE vs NEW/TIPPING)** — `/markets`

Two neighbouring badges of the same kind use different type and padding, so one reads as a different component.

*Evidence:* Same row, different sizes: 'LIVE' 9px (xs status) next to 'NEW' 11px (kids 'Live'9I 'New'11I) and 'TIPPING' 10.5px. The screenshots show MUBASHARA visibly smaller than MPYA (cold-320-sw__footer.png) and LIVE smaller than NEW (mk-360-en__s05.png) and TIPPING (mk-360-en__s01.png). Source: src/components/ui/chip.tsx:161-173 (xs vs md size tables).

### S03-11 · 🟡 medium · 🆕 new · copy · unit: NEW: board copy + terminology pass (EN/SW/ZH)
**Search results section heading (h2 'markets match')** — `/markets?q=Tanzania`

The section title is a sentence fragment missing its number, and it doesn't say the cards below are resolved results rather than open markets.

*Evidence:* h2 renders 'markets match' (EN), 'masoko yanalingana' (SW), '个市场匹配' (ZH): lowercase, no count, above a grid of RESOLVED cards (q-360-en__s06.png). The dictionary strings are count suffixes (src/lib/i18n-dict.ts:655, :3229, :5364) but src/app/markets/page.tsx:384 renders t.market.marketsMatch bare.

### S03-12 · 🟡 medium · 🆕 new · filter · unit: U9
**Status strip leading edge after auto-scroll (nav.kp-strip-fade)** — `/markets?status=all`

After the selected pill is auto-scrolled into view, a stray count with no label appears at the left edge. It reads as a number belonging to nothing, and no fade signals that there is more to the left.

*Evidence:* all-360-en: strip scrollLeft moves 'All 26' into view; 'New 20' sits at x-35→48 and is hard-cut at the strip's left edge, leaving an orphan '20' at about x18 before 'In progress 1' (all-360-en__s00.png). The same happens at 320 ('New 20' -75→8) and 412 ('Closing today 0' -122→13), and in SW (all-360-sw). The mask is trailing-only: src/app/globals.css:3065-3066.

### S03-13 · 🟡 medium · ♻️ duplicate → S03-markets-F05 · a11y
**Sort control accessible name (summary) and direction link name** — `/markets`

Screen-reader and voice-control users can't hear or say which sort is on, and the direction button's name describes where it is rather than what it does.

*Evidence:* summary aria-label='Sort markets' (SW 'Panga masoko', ZH '排序市场') while its visible text is 'Biggest pool'. aria-label replaces the content, so the active sort is never announced and voice control ('tap Biggest pool') fails. The direction link is named 'Sorted descending' (a state) though activating it sorts ascending. Source: src/components/ui/query-bar.tsx:266/300 → src/components/markets/menu-shell.tsx:84; query-bar.tsx:329-330.

### S03-14 · 🟡 medium · ♻️ duplicate → S03-markets-F06 · a11y
**Market card interactive nesting (article[role=link] and resolved a.mcardp)** — `/markets`

Focusable controls nested inside a link role (and a <button> inside an <a>) are invalid. Assistive tech may flatten the card into one link or double-announce its controls.

*Evidence:* Live card: <article role='link' tabIndex=0 aria-label={title}> wraps 2 YES/NO buttons, the info button, the share button and the Details link (src/components/markets/market-card.tsx:503-522). Resolved card: <Link className='mcardp group'> (an <a>) wraps the ShareButton <button> (market-card.tsx:478, :524-526). Live probe: resolved share buttons at y5187/5513/5805 sit inside a.mcardp.group.

### S03-15 · 🟡 medium · 🆕 new · link · unit: U20
**'All results →' link beside the Recently resolved / matches heading** — `/markets, /markets?status=all, /markets?q=Tanzania`

The only way from the board to the full results archive is a 17px-tall text link at an off-ladder 11.5px.

*Evidence:* a.whitespace-nowrap.font-mono.text-[11.5px]: 94x17 (EN), 101x17 'Matokeo yote →' (SW), 64x17 '全部结果 →' (ZH), on all 16 loads. No ::after reach. Source: src/app/markets/page.tsx:386-391.

### S03-markets-F04 · 🟡 medium · 🆕 new · a11y · unit: NEW: /markets a11y pass (roles, names, headings, pager)
**Every discovery filter pill (status strip, sheet odds/pool/topic)** — `/markets`

The selection state of every board filter sits on an attribute that is not allowed on links. Assistive tech announces plain links with no selected state, and an axe pass flags about 20 violations.

*Evidence:* discovery-bar.tsx:116 `<FilterPill {...rest} on={pressed} semantics="toggle" replace scroll={false} />`; filter-pill.tsx:224-237 renders a next/link `<Link>` (an `<a href>`) with `aria-pressed={semantics === "toggle" ? on : undefined}`. aria-pressed is only a supported state on role=button, so axe reports aria-allowed-attr on 5-6 status + 4 odds + 3 pool + 8 topic = 20-21 anchors per load. strip-autoscroll.tsx:58 selects `[aria-pressed="true"], [aria-current="page"]`.

### S03-markets-F05 · 🟡 medium · 🆕 new · a11y · unit: NEW: /markets a11y pass (roles, names, headings, pager)
**Sort control summary, direction link, sort listbox** — `/markets`

Screen-reader and voice-control users never hear which sort is active, and the name fails label-in-name because the visible words are missing from it. The listbox role promises arrow-key behaviour that does not exist.

*Evidence:* query-bar.tsx:306 `labelClassName="hidden lg:inline"` hides the visible key below lg, so the only visible text is the value (e.g. 'Closing soonest' / 'Zinazofunga kwanza', i18n-dict.ts:827/3350). menu-shell.tsx:84 `aria-label={ariaLabel}` names the summary 'Sort markets' / 'Panga masoko' (i18n-dict.ts:829/3352), which replaces the value. query-bar.tsx:329 direction `aria-label={dir === "asc" ? ascLabel : descLabel}` = 'Sorted ascending' (a state, not the action). query-bar.tsx:195 `role="option"` on `<Link>` inside menu-shell.tsx:109 `role="listbox"`, with no arrow-key handling (menu-shell.tsx:62-80 handles only Escape and mousedown).

### S03-markets-F06 · 🟡 medium · 🆕 new · a11y · unit: NEW: /markets a11y pass (roles, names, headings, pager)
**Market card wrapper (live: article role=link; resolved/closed: <Link>)** — `/markets`

Controls are nested inside a link-role container whose name hides the price and deadline. On resolved cards a button sits inside an anchor, which is invalid HTML and may also navigate when share is tapped.

*Evidence:* market-card.tsx:503-513 `<article ... aria-label={title} role="link" tabIndex={0} onClick={goDetails}>` wraps the YES/NO `<button>`s (:432-436), the info `<button>` (:179-189), the ShareButton `<button>` (:478) and a Details `<a>` (:480-487). The name is the title only (status, %, time-left and pool are not exposed). The non-live branch at :524 `<Link data-row-id={id} href=...>` contains ShareButton's `<button>` (share-button.tsx:83-89, `e.stopPropagation()` only, no preventDefault). That is interactive content inside `<a>`, rendered 3x on the Recently resolved strip (page.tsx:394-415).

### S03-markets-F08 · 🟡 medium · ♻️ duplicate → S03-04 + U22 · textbox
**Search box clear (x) button and input attributes** — `/markets`

The clear button is a 38x38 target, below the 40px floor. The input lets Android keyboards autocapitalise and autocorrect team and asset names while typing.

*Evidence:* globals.css:1746-1749 `.search-box .clear-btn, .market-search .clear-btn { display: grid; ... width: 38px; height: 38px; margin-right: 3px; }` rendered at search-box.tsx:160-167. search-box.tsx:146-158 input sets type=search, enterKeyHint=search, autoComplete=off, aria-label, but no autoCorrect / autoCapitalize / spellCheck.

### S03-markets-F09 · 🟡 medium · ♻️ duplicate → S03-15 · link
**'All results ->' link beside the Recently resolved heading** — `/markets`

The only door from the board to the full results archive is a 15px-tall text target.

*Evidence:* page.tsx:386-391 `<Link href="/results" className="whitespace-nowrap font-mono text-[11.5px] font-semibold text-brand-300 transition-colors hover:text-text">` with no min-height or padding, so the tap box is one ~15px line box. 11.5px is off the type ladder.

### S03-markets-F11 · 🟡 medium · ♻️ duplicate → S03-08 · typography
**Market card type sizes** — `/markets`

A live priced card renders 8 type sizes (9 · 9.5 · 10 · 11 · 11.5 · 13 · 15 · 28), plus 11 when a signal chip shows. 9px and 11.5px are off every ladder, and 9px is used on a non-mono status word.

*Evidence:* chip.tsx:162-163 xs `fontSize: 9` (status chip, market-card.tsx:335); globals.css:3922 `.mcardp-pctcap` 9.5px; :3913 `.mcardp-cat` 10px; :3929 `.mcardp-traders .t-txt` 10px; :3933 `.mcardp-move` 10px; :3974 `.mcardp-meta` 11px; market-card.tsx:433/436 `text-[11.5px]` price suffix; globals.css:4017 `.mcardp-details` 11.5px; :3969 `.mcardp-actions .btn` 13px; :3920 `.u` 13px; :3916 `.mcardp-q` 15px; :3919 `.mcardp-pct` 28px; :4059 empty 22px.

### S03-markets-F13 · 🟡 medium · 🆕 new · state · unit: NEW: market-card state truth (empty pool, outcome ink, SOON 
**SOON signal badge on cards with minutes left** — `/markets`

Swahili and Chinese players never see the SOON badge on markets closing within the hour; only English does. The same market signals differently by language.

*Evidence:* market-card.tsx:115 `if (/^\d+m left$/.test(timeLeft) // /^\d+s left$/.test(timeLeft)) return { kind: "soon", ... }` parses the localised label built at page.tsx:300-306 from timeLeftM: EN '{n}m left' (i18n-dict.ts:708), SW 'dakika {n} zimebaki' (:3269), ZH '{n}分钟后' (:5404). time-left.ts never emits seconds, so the 's left' branch is dead.

### S03-markets-F14 · 🟡 medium · 🆕 new · copy · unit: NEW: market-card state truth (empty pool, outcome ink, SOON 
**Card empty-pool lines (No bets yet / predictors / No pool yet / Be the first)** — `/markets`

The card says 'No bets yet' while showing '1 predictor', which is a direct contradiction. Fresh cards repeat the emptiness message three or four times.

*Evidence:* market-card.tsx:276-277: `fresh` needs volume 0 and predictors 0, `noPrice` only volume 0. For volume 0 with predictors >= 1 (reachable after a cash-out, per the comment at :269-273), :387 prints `t.market.noBetsYet` ('No bets yet' / 'Bila dau bado', i18n-dict.ts:698/3265) directly above :411 '1 predictor' and :450 'TZS 0'. A fresh card stacks '—' (aria 'No bets yet', :366), 'No bets yet' (:387), 'Be the first to predict' (:401) and 'No pool yet' (:450).

### S03-markets-F15 · 🟡 medium · 🆕 new · copy · unit: NEW: market-card state truth (empty pool, outcome ink, SOON 
**Resolved / closed card action slot, chip and meta** — `/markets (Recently resolved strip; In progress / All lenses)`

A resolved card states its outcome three times, with two different Swahili verbs. A closed card says Closed twice, uses the 'resolved' tick icon, and shows a disabled-looking fake button that does nothing.

*Evidence:* Resolved: chip `statusResolved` (market-card.tsx:335; SW 'Imekamilika', i18n-dict.ts:3369), prob caption 'RESULT' + outcome word (:369-370), action pill `[t.market.statusResolved, outcomeLabel].join(" ")` (:444), meta `${t.market.resolvedOutcome} ${outcomeWord(...)}` (page.tsx:409; SW 'Imetatuliwa', i18n-dict.ts:3263). Closed: chip 'CLOSED', pill `<I.resolved s={15} /> {t.market.statusClosed}` (:443-444), meta 'Waiting for results' (page.tsx:336). The pill is `<div className="btn btn-ghost btn-md justify-center pointer-events-none opacity-85">` (:443).

### S03-markets-F16 · 🟡 medium · 🆕 new · copy · unit: NEW: board copy + terminology pass (EN/SW/ZH)
**Board vocabulary across header, lenses, sheet, cards** — `/markets`

The same concept carries different words on one screen, and in Chinese two different controls (an odds filter and a sort) share one label, so a player cannot tell them apart.

*Evidence:* EN: header 'live' (i18n-dict.ts:657) counts the lens labelled 'Open' (:824); lens 'In progress' (:825) vs card 'Waiting for results' (:685) for the same state. SW pool: sheet key 'Dimbwi' (:3355) and relaxPool 'kichujio cha dimbwi' (:3367) vs card 'Hakuna bwawa bado' (:3267) vs sort 'Pesa nyingi' (:3350). SW live: header 'hai' (:3231) vs chip 'Mubashara' (:3369). ZH: odds 'Contested' and sort 'Closest call' are both '势均力敌' (:5488, :5486); header '直播中' (live-streaming, :5366) vs chip '实时' (:5504); tipping chip '活跃' ('active', :5399).

### S03-markets-F17 · 🟡 medium · 🆕 new · number · unit: NEW: board money grammar (uppercase K, formatNumber, phone c
**Pool filter labels, header volume, card volume, predictor count** — `/markets`

The board uses three money grammars on one screen. The predictor count can group differently on server and client (a hydration text mismatch at >= 1,000 on non-en device locales).

*Evidence:* Pool pills 'TZS 10k+' / 'TZS 50k+' use a lowercase k in all locales (i18n-dict.ts:832/3355/5490), but utils.ts:67-73 fixes the compact grammar as uppercase 'TZS 17K' and utils.ts:102 says 'Lowercase "k" is NOT this grammar'. Header volume is compact (page.tsx:187 formatTzsCompact); card volume is full (market-card.tsx:450 formatTzs). market-card.tsx:411 `predictors.toLocaleString()` in a client component groups by runtime locale, which utils.ts:228-230 forbids; the same pattern is at pagination.tsx:177.

### S03-markets-F19 · 🟡 medium · ♻️ duplicate → S03-07 · container
**Phone filter sheet panel** — `/markets (Filters sheet open)`

Sheet content sits 4px inside the board column on a false premise, off the 16px phone rung. The product ships two bottom-sheet compositions (24px radius with 12/20/16 padding vs 16px radius with 24 padding).

*Evidence:* globals.css:3347 `.kp-fsheet-panel { padding: var(--sp-3) var(--sp-5) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4)); }`, justified at :3337-3341 by '/markets lay out inside px-4, which is 20px'. But page-container.tsx:106 is `px-3 lg:px-6 py-6` (16px) and the bar is `-mx-3 px-3` (query-bar.tsx:54). globals.css:3346 radius `var(--r-xl)` (24px) and :3370 foot `gap: 10px`. The shared Modal sheet uses `rounded-t-modal` (16px) and `p-5` (24px) (modal.tsx:319-320).

### S03-markets-F21 · 🟡 medium · ➕ extends → D26 / U25 · state
**First-HTML Suspense fallback (GridSkeleton)** — `/markets (hard load)`

On every hard load the 116px bar arrives above the ghost grid and pushes it down; the ghost cards also have the wrong corner radius. The plan's U25 lists the loading.tsx bar ghost but not this first-response fallback.

*Evidence:* page.tsx:198-200 `<Suspense fallback={<GridSkeleton />}><DiscoveryBoard .../></Suspense>`. The sticky DiscoveryBar is rendered inside DiscoveryBoard (page.tsx:310-317), but GridSkeleton (page.tsx:511-513) draws only `<div className="market-grid mt-3">`. The real bar on a phone is 10 + 44 + 8 + 44 + 10 = 116px (query-bar.tsx:83 `pt-2.5`, :102 `pb-2.5 pt-1.5`). Ghost cards use `rounded-md` (8px, page.tsx:517; loading.tsx:94) and `p-4` (20px, page.tsx:520) vs the card's `border-radius: var(--r-lg)` (16px) and 14/15px padding (globals.css:3855).

### S03-markets-F22 · 🟡 medium · ❌ refuted → U26 · state
**Board empty state - exit buttons and search-miss title** — `/markets?q=... / filtered empty board`

Swahili exit buttons overflow the dashed box on phones (both pool and odds exits at 320), and an unbroken search string (pasted link or long token) runs out of the card. Padding itself is already U26 scope.

*Evidence:* page.tsx:476-499 renders EmptyState with exits `className={`btn btn-sm ${...}`}` (page.tsx:490) plus a count span (:493). empty-state.tsx:69-70 `px-8 py-8` (48px) and `max-w-[360px]` leave a 230px text box at 360 (190 at 320). globals.css:1061 `.btn { white-space: nowrap }`. SW 'Ondoa kichujio cha uwezekano' (i18n-dict.ts:3367) + count ≈ 237px (estimate), wider than 230. Title `${t.market.noLiveMatch} "${state.q}"` (page.tsx:457) at empty-state.tsx:78 `text-[15.5px] ... text-balance` has no overflow-wrap, while MAX_QUERY_LEN is 120 (query.ts:58).

### S03-16 · ⚪ low · ♻️ duplicate → U26 · container
**Empty board state (div.rounded-xl.border-dashed)** — `/markets?odds=cont&pool=10k`

On a phone the empty state spends 96px of its 328px width on padding and uses an off-ladder title size. The box is almost 390px tall for two lines of copy and two buttons.

*Evidence:* empty-360-en: box 328x386.8, padding 48/48/48/48 (px-8 py-8 = 48px on this scale), giving a 230px text column; the title 'No markets match these filters' is 15.5px Sora (off-ladder) and wraps to 2 lines. The SW title 'Hakuna soko linalolingana na vichujio hivi' also wraps. Source: src/components/ui/empty-state.tsx:69 (px-8 py-8), :78 (text-[15.5px]).

### S03-17 · ⚪ low · ♻️ duplicate → S03-markets-F15 · state
**Resolved card action row (div.btn.btn-ghost.btn-md 'Resolved YES') and meta duplicate** — `/markets (Recently resolved), /markets?q=Tanzania`

A bordered 40px ghost 'button' that does nothing, plus the outcome stated three times in one card, looks like an action and wastes the row.

*Evidence:* census-360-en.json resolvedInert: 3x div.btn.btn-ghost.btn-md, pointer-events none, no role/aria-disabled, 40px tall, text 'Resolved YES'/'Resolved NO'. The same card also shows 'RESULT YES' top-right and 'Resolved YES' again in the meta right slot (timeLeft = statusResolved + outcome). Source: src/components/markets/market-card.tsx:441-445 and src/app/markets/page.tsx:409.

### S03-18 · ⚪ low · ➕ extends → D18 / U9 · filter
**Sort value in the bar when the Filters badge is on (D18, new instance)** — `/markets?odds=cont&pool=10k`

The active sort becomes unreadable at 360 in Swahili as soon as any filter is active, not only at 320 as D18 records.

*Evidence:* filtered-360-sw.deep.json: the Filters trigger grows to 164.1px with its badge; the sort value 'Pesa nyingi' sw72 > cw69 and renders 'Pesa nyi…' (filtered-360-sw__top.png). Unfiltered at 360 SW it fits (72/72). At 320 SW unfiltered it is 'Pesa n…' (sw72/cw59, mk-320-sw__s00.png).

### S03-19 · ⚪ low · ➕ extends → D1 / U9 · filter
**Status strip trailing sliver beside the result count in the zero-result state (D1, new instance)** — `/markets?odds=cont&pool=10k`

The broken-word collision D1 describes also appears at 360 EN whenever counts shrink the pills.

*Evidence:* empty-360-en: the zero counts make the pills narrower ('Open 0' 82px); 'New 0' spans x241-318 under the strip edge at 266. The screenshot shows a lone 'N' sliver touching '0 markets' (empty-360-en__s00.png). SW filtered shows 'Mp' against 'masoko 0' (filtered-360-sw__top.png). D1 lists only 412 EN and 360 SW default.

### S03-20 · ⚪ low · 🆕 new · typography · unit: NEW: board type-ladder close (off-ladder literals + ratchet)
**Off-ladder hand-typed sizes in board chrome** — `/markets (all routes)`

Several half-pixel sizes sit next to each other in the bar and header row, so the ladder is not closed on the board's own chrome.

*Evidence:* Stats row 12.5px mono (src/app/markets/page.tsx:176); result count 11.5px mono (src/components/ui/query-bar.tsx:165); 'All results' 11.5px (page.tsx:388); empty-state title 15.5px (empty-state.tsx:78); sheet h2 is a literal text-[16px] (filter-sheet.tsx:368, on the ladder but hand-typed). Present in every load's typography OFF list: 12.5px 9-17 chars, 11.5px mono 37-54 chars.

### S03-21 · ⚪ low · 🆕 new · layout · unit: NEW: pagination phone pass (one row, rungs, radii)
**Pager block (Pagination inside div.mt-6.overflow-hidden)** — `/markets`

Three pages of results cost 153px and three rows of chrome, box-in-box, with control radius off the rung.

*Evidence:* The pager is 153px tall at every phone width, in three rows: range '1-12 KATI YA 25' / '1 2 3' / '« ‹ › »' (mk-320-sw__pager.png). The page group is forced onto its own row by basis-full (src/components/ui/pagination.tsx:209). A single row ‹ 1 2 3 › needs 5x44+4x4=236px against 256px available at 320. It is a bordered filled box (rounded-lg, bg-elevated/40) holding bordered filled 44px buttons at radius 8 (pagination.tsx:148 rounded-md).

### S03-22 · ⚪ low · 🆕 new · a11y · unit: NEW: /markets a11y pass (roles, names, headings, pager)
**Pager semantics** — `/markets`

Screen-reader users get no pagination landmark and aren't told which page they're on.

*Evidence:* census-360-en.json: the pager root is a div with no aria-label (pagination.tsx:175), not a <nav>. The current page link '1' has aria-current='' (absent) although it is visually highlighted, and it links to /markets?page=1 (itself). Page links are named only '1','2','3'.

### S03-23 · ⚪ low · ♻️ duplicate → S03-markets-F17 · number
**Pool filter pill labels 'TZS 10k+' / 'TZS 50k+'** — `/markets (Filters sheet)`

Money compaction on one surface uses two spellings of the thousands suffix.

*Evidence:* Sheet chips read 'TZS 10k+ 1' and 'TZS 50k+ 0' (lowercase k) while the same screen's stats row reads 'TZS 27K in play' and the ticker 'TZS 10K settled' (uppercase K). Hardcoded in all three locales: src/lib/i18n-dict.ts:832, :3355, :5490.

### S03-24 · ⚪ low · 🆕 new · copy · unit: NEW: board copy + terminology pass (EN/SW/ZH)
**Search echo row word count ('1 words' / '1 maneno')** — `/markets (typed 'Tanz'), /markets?q=Tanzania`

The live grammar echo, shown under the field on every search, is ungrammatical in EN and SW for the most common case (one word).

*Evidence:* Echo reads '1 words' (search-360-en typing/settled; q-360-en, q-320-en, q-412-en) and '1 maneno' (q-360-sw). Built as `${plain.length} ${words.words}` in src/lib/search/query.ts:196 with only a plural string (src/lib/i18n-dict.ts:45 'words', :2702 'maneno').

### S03-25 · ⚪ low · ♻️ duplicate → S03-markets-F16 · copy
**Three words for the open set on one screen (stats row vs status pill vs card chip)** — `/markets`

The same 25 markets get two different names in one glance, and the header uses the word the dictionary says means something else.

*Evidence:* EN: '25 live' (stats) / 'Open 25' (pill) / 'LIVE' (chip). SW: '25 hai' / 'Wazi 25' / 'MUBASHARA'. ZH: '25 直播中' / '开放 25' / '实时'. The stats row counts openMarkets (matchesStatus 'open', page.tsx:160) but labels them liveCount (i18n-dict.ts:657/3231/5366). The dictionary itself warns that statusOpen is not statusLive (i18n-dict.ts:814).

### S03-26 · ⚪ low · ♻️ duplicate → S03-markets-F16 · copy
**Swahili word for 'pool' on the board ('bwawa' vs 'dimbwi')** — `/markets and Filters sheet`

A Swahili player filters by 'dimbwi' but reads 'bwawa' on the cards being filtered.

*Evidence:* Card meta 'Hakuna bwawa bado' (i18n-dict.ts:3267) versus sheet key 'DIMBWI', 'Ukubwa wa dimbwi' and empty-state CTA 'Ondoa kichujio cha dimbwi' (i18n-dict.ts:3355, :3367). 'bwawa' is used 10+ times elsewhere in SW (pool, poolGrew, howItWorks).

### S03-27 · ⚪ low · ♻️ duplicate → S03-markets-F24 · a11y
**Heading order on the board** — `/markets`

Heading navigation skips a level and gives the main grid no section heading, unlike the resolved grid.

*Evidence:* Heading sequence on every load: H1 (sr-only 'Markets') → H3 x12 card titles → H2 'Recently resolved' → H3 x3. The open grid has no h2, so it jumps from level 1 to 3 while the resolved section below has an h2.

### S03-28 · ⚪ low · ➕ extends → D5 / U9 · textbox
**Search field phone affordances (reserved echo row, hidden help, keyboard attributes)** — `/markets`

On phones the field keeps a permanent blank line for a grammar feature whose explainer can't be reached, and the query can be rewritten by autocorrect.

*Evidence:* The echo <p> reserves 8px margin + 17px min-height even when empty (search-box.tsx:181-187). Field bottom 201 → first pill 236 is a 35px void. The 'How to search' help that explains the grammar the echo teaches is hidden below sm (src/components/ui/search-help.tsx:76 'hidden sm:block'). The input has no autocorrect/autocapitalize/spellcheck attributes (probe: null), so Android keyboards may autocorrect market names.

### S03-29 · ⚪ low · ♻️ duplicate → S03-markets-F26 · icon
**Glyph sizes on /markets** — `/markets`

Icon sizes are spread across 10-15px values, so glyphs of equal importance render at different sizes (e.g. 14px caret vs 13px share vs 11px chevron in adjacent rows).

*Evidence:* census-360-en.json, 80 visible glyphs at 9 sizes: 13x13 (30: category icons, share, info), 11x11 (15: Details chevron), 12x12 (12), 20x20 (7), 14x14 (7: carets), 15x15 (4: sliders, resolved mark), 10x10 (3: comment), 16x16 (1), 26x26 (logo). Only 3 of 9 sizes are on the 16/18/20/24 set. All but the logo are aria-hidden (decorative, correct).

### S03-30 · ⚪ low · 🆕 new · copy · unit: NEW: topic taxonomy data fix (operator, not code)
**Topic taxonomy on cards and in the sheet ('Other' is the largest topic)** — `/markets (cards + Filters sheet TOPIC)`

The topic filter's biggest bucket is 'Other', and several markets carry a label that contradicts an existing topic, which weakens the filter and the card's category line.

*Evidence:* The sheet shows 'Other 12' of 25 open markets (48%), larger than Sports 4 / Macro 5 / Culture 2 / Tech 1. Cards labelled OTHER include PUBG Global Championship (esports), S!TE Swahili Tourism Expo (culture), Kenya fiber-optic subscriptions (tech), KRA revenue target (macro) and US-Iran peace deal (mk-360-en digest).

### S03-markets-F12 · ⚪ low · ♻️ duplicate → S03-09 · card
**Card top row - status chip vs signal chip (HOT / SOON / TIPPING / NEW)** — `/markets`

Two chip compositions sit side by side in one 20px row: a 9px status chip next to an 11px signal chip with wider padding. The aria-label on a generic span is ignored and duplicates the visible text.

*Evidence:* market-card.tsx:335 `<Chip size="xs" variant=... dot={live}>` (chip.tsx:162-163: 21/23px, padding 0 6px, 9px). market-card.tsx:344-349 `<Chip aria-label={signal.label} variant={...}>` has no size, so it is md: hot/new/pending count as status (chip.tsx:135) and get chip.tsx:173 `height: 23, padding: "0 9px", fontSize: 11`, while tipping (signal) gets chip.tsx:172 `height: 21, padding: "0 8px", fontSize: 10.5`. The comment at market-card.tsx:338-342 claims both land on the same box. aria-label sits on a role-less span.

### S03-markets-F18 · ⚪ low · ♻️ duplicate → S03-12 · filter
**Status strip leading edge after auto-scroll** — `/markets?status=progress/watch/all`

After auto-scroll the left end of the strip clips a pill mid-label with no fade, so it reads as a broken chip rather than 'more this way'.

*Evidence:* globals.css:3063-3067 `.kp-strip-fade { mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent 100%); }` fades only the trailing edge. strip-autoscroll.tsx:58-66 centres the pressed pill (`rail.scrollLeft = centredScrollLeft(...)`), so for In progress / Watching / All the strip opens scrolled and the first visible pill is hard-cut at the 16px gutter.

### S03-markets-F20 · ⚪ low · ♻️ duplicate → S03-06 · filter
**Filter sheet Topic grid spacing** — `/markets (Filters sheet open)`

The topic grid uses the exact gap the sheet's own rule rejects, so vertically adjacent topic pills risk mis-taps.

*Evidence:* discovery-bar.tsx:324 `className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-1.5"` (8px) overrides FilterSheetGroup's default `gap-2` (12px), whose own ruling at filter-sheet.tsx:428-431 says 8px between 44px chips 'read as one continuous bar rather than as separable choices'. Eight topics give 4 rows of 44px pills 8px apart at 360.

### S03-markets-F23 · ⚪ low · 🆕 new · copy · unit: NEW: board copy + terminology pass (EN/SW/ZH)
**Search-miss empty-state title and body** — `/markets?q=...&status=all/progress`

The body promises matching results below even when there are none, and the title says 'live' on lenses that are not live-only.

*Evidence:* page.tsx:463 uses `t.market.checkSpelling` whenever cause === 'search-miss'; the copy says '...Resolved markets that match appear below.' (i18n-dict.ts:673 / SW 3247 / ZH 5382). The resolved section renders only when `resolved.length > 0` (page.tsx:380). Title 'No live markets match' (i18n-dict.ts:713) is used even on the all/progress lenses, which include closed markets (page.tsx:88-94). page.tsx:457 hard-codes ASCII quotes around the query in every locale.

### S03-markets-F24 · ⚪ low · 🆕 new · a11y · unit: NEW: /markets a11y pass (roles, names, headings, pager)
**Page heading structure** — `/markets`

Heading levels jump from h1 to h3 for every market, and screen readers hear 'Markets' twice at the top.

*Evidence:* page.tsx:167 `<h1 className="sr-only">{t.market.title}</h1>` is followed by card titles `<h3 className="mcardp-q">` (market-card.tsx:357) with no h2 above the first grid. The visible eyebrow `<p ...>{t.market.title}</p>` (page.tsx:172-174) repeats the h1 text. The only h2 is 'Recently resolved' (page.tsx:383), below the grid.

### S03-markets-F25 · ⚪ low · 🆕 new · a11y · unit: NEW: /markets a11y pass (roles, names, headings, pager)
**Card empty %, tipping bar role, pager disabled arrows, search echo** — `/markets`

Several names are attached where assistive tech ignores them, the probability is announced as task progress, and the search echo chatters on each pause while typing.

*Evidence:* market-card.tsx:366 `<div className="mcardp-pct mcardp-pct--empty" aria-label={t.market.noBetsYet}>` has no role, so aria-label is prohibited and ignored. brand.tsx:293 and :307 `role="progressbar"` for a crowd probability. pagination.tsx:165 disabled `<span aria-disabled="true" className={cls} aria-label={aria}>` has no role, so disabled First/Previous are silent. search-box.tsx:181-186 echo `<p ... aria-live="polite">` re-announces '2 words ...' after every debounce.

### S03-markets-F26 · ⚪ low · 🆕 new · icon · unit: NEW: glyph size divergence (one job, one size)
**Glyph sizes across bar, sheet, card, search, pager** — `/markets`

The board uses nine glyph sizes (10/11/12/13/14/15/16 plus the 140 watermark) and none of the control glyphs sit on the 16/18/20/24 set, so the three x-close glyphs alone come in three sizes.

*Evidence:* market-card.tsx:141 trending s=10; :188 info s=12; :214 chevronRight s=12; :444 resolved s=15; :454 comment s=10; :486/:491 chevronRight s=11; share-button.tsx:103 share s=13; globals.css:3911 category glyph 13px; filter-sheet.tsx:313 sliders s=15; :336 caret s=14; :388 x s=16; query-bar.tsx:376 x s=14; search-box.tsx:166 x s=15; pagination.tsx:203-233 chevrons s=14.

### S03-markets-F27 · ⚪ low · ♻️ duplicate → S03-21 · container
**Pager wrapper, pager buttons, sort listbox radius** — `/markets (more than 12 results)`

The pager panel has a doubled top border and off-rung padding and radius, and 'selected' is drawn two different ways on one page (pager vs filter pills). Legacy 8px radii remain on the pager and the sort menu.

*Evidence:* page.tsx:352 `<div className="mt-6 overflow-hidden rounded-lg border border-border bg-bg-elevated/40">` wraps pagination.tsx:175 `px-4 py-3 border-t border-border`, producing a doubled 2px top rule, 20px side padding, 12px radius on a panel and mt-6 = 32px. pagination.tsx:148 buttons `rounded-md` (8px); :149 selected `border-brand-500 bg-brand-500/15 ... shadow-glow-selected` vs filter selected `.kp-fchip[data-on] { background: var(--pill-active); box-shadow: var(--glow-selected) }` + border-brand-400 (globals.css:3040-3043; filter-pill.tsx:157). menu-shell.tsx:111 listbox `rounded-md` (8px).

### S03-markets-F28 · ⚪ low · 🆕 new · container · unit: U26
**Markets route error state (RouteError)** — `/markets (board read failure -> markets/error.tsx)`

The error message block (~300px) sits under 128px of padding with 128px below it, and its 24px side gutter differs from the page's 16px, so the only recovery buttons are pushed toward the bottom nav on a 780px phone.

*Evidence:* markets/error.tsx:15-21 renders RouteError. route-error.tsx:107 `min-h-[60svh] w-full max-w-[560px] ... px-5 py-12` = 24px sides and 128px top and bottom on this scale; route-error.tsx:135 `gap-2.5` (10px, unlisted key).

### S03-markets-F29 · ⚪ low · ♻️ duplicate → D18 / U9 (via S03-18) · filter
**Sort value when a sheet filter is active** — `/markets?odds=call (any sheet axis set)`

Once any sheet filter is on, the active sort is unreadable at 360 (D18 records only 320).

*Evidence:* query-bar.tsx:262 `flex min-w-0 flex-1` sort wrapper; :297 summary `[&>summary]:gap-1.5 [&>summary]:px-1.5` (8px); :331 direction `h-[44px] w-[44px]`. Filters trigger globals.css:3133-3137 `gap: var(--sp-3); padding: 0 14px` + sliders 15 + badge `min-width: 18px` (:3241) + caret 14. Estimates at 360 with badge: EN value box ≈ 74px for 'Closing soonest' (≈100px) -> 'Closing s…'; SW 'Zinazofunga kwanza' (i18n-dict.ts:3350) ≈ 63px -> 'Zinazo…' (≈93px without badge, still truncated).

### S03-markets-F30 · ⚪ low · ♻️ duplicate → S03-20 · typography
**Hand-typed off-ladder sizes in board chrome** — `/markets`

The board renders about 14 distinct sizes (9, 9.5, 10, 11, 11.5, 12.5, 13, 14, 15, 15.5, 16, 20, 22, 28), four of them hand-typed off the ladder.

*Evidence:* page.tsx:176 `text-[12.5px]` (header figures); query-bar.tsx:165 `text-[11.5px]` (result count); page.tsx:388 `text-[11.5px]` (All results); empty-state.tsx:78 `text-[15.5px]` (empty title); globals.css:4017 `.mcardp-details` 11.5px; market-card.tsx:433/436 `text-[11.5px]`; chip.tsx:162 `fontSize: 9`.

### S03-markets-F31 · ⚪ low · 🆕 new · copy · unit: NEW: board copy + terminology pass (EN/SW/ZH)
**24h move unit on live cards** — `/markets`

Swahili and Chinese players read an English abbreviation ('+3pt') with no accessible explanation of what the figure means.

*Evidence:* market-card.tsx:142 `{move > 0 ? "+" : ""}{move}<span className="u">pt</span>` hard-codes 'pt'; the only label is `title={label}` (:140), which touch users never see.

## S04-detail — Market detail (badges, title, bar, chart, countdown, panels, bet surfaces, discussion)

### S04-detail-L01 · 🔴 critical · 🆕 new · number · unit: NEW: one-sided settlement truth on the ResolutionPanel
**Resolution panel ledger: Platform fee / YES pool winner row on a one-sided settled market** — `/markets/mkt_48bcd7882a2d1d205409`

On the one surface a player uses to check the arithmetic, the page shows a TZS 325 platform fee that was never charged. It also crowns an empty YES pool as the winner and says nothing about the refund. The derived figure contradicts the ledger and the platform's own one-sided promise.

*Evidence:* Live B-360-en: ledger shows 'Final pool TZS 2,500' (y=1309), '✓ YES pool TZS 0' painted gilt as the winning row (y=1348), 'NO pool TZS 2,500' (y=1388), 'Platform fee TZS 325' (y=1428, 12.5px mono). Chip reads RESOLVED · YES; tipping bar reads 'YES 0% · LEANS NO · 100% NO'; panel says 'Settled 14 Sept 2026, 11:41'. Settlement at market-service.ts:3276-3279 treats yesPool===0 && noPool>0 as one-sided and refunds every stake at 0% fee. But page.tsx:161 computes the displayed fee with poolFee(yesPool, noPool, rates, 'YES'), and the loser-share branch (payout.ts:476-478) returns 13% × losing pool = 325 with no one-sided branch. resolution-panel.tsx:253 then prints it. The open market's own callout promises 'everyone gets a full refund and we take no fee' (i18n-dict.ts:718).

### S04-detail-01 · 🟠 high · 🆕 new · copy · unit: NEW: §L3 enum-in-copy sweep on the detail money surfaces
**Hedge warning headline in the bet aside (signed-in, with an open position)** — `/markets/[id]`

The raw Prisma side enum reaches the player on a money warning in every locale. Meanwhile the chips, buttons and tipping labels on the same screen say NDIO/HAPANA or 是/否.

*Evidence:* page.tsx:355 `const heldLabel = [...heldSides].join(" + ")` (heldSides = stored p.side tokens), rendered at page.tsx:771-773 `{t.market.youAlreadyHold} {heldLabel} {t.market.here}`. SW: "Tayari unashikilia YES hapa" (i18n-dict.ts:3333-3334); ZH: "您已持有 YES 在此"; a hedged player reads "YES + NO".

### S04-detail-02 · 🟠 high · 🆕 new · copy · unit: NEW: §L3 enum-in-copy sweep on the detail money surfaces
**Bet placed result modal title** — `/markets/[id]`

The confirmation of a real-money bet reads "YES · TZS 1,000" to a Swahili or Chinese player. The toast fired in the same tick uses sideWord (:1002), so the two messages disagree.

*Evidence:* conviction-dial.tsx:1729 `title={resultData.variant === "success" ? `${resultData.side} · ${formatTzs(resultData.stake)}` : …}`. The same file forbids this at :549-555 ("Never write {effectiveSide} into copy; reach for this [sideLabel]").

### S04-detail-03 · 🟠 high · 🆕 new · a11y · unit: NEW: InfoHint on phones (inline disclosure, not a hover tool
**InfoHint tooltips in the stake panel (Stake, Multiplier, Payout eyebrows)** — `/markets/[id]`

On a 360px phone the fee and payout explanation is a one-line strip ~4x wider than the screen, and clipping hides most of it. The trigger is about 10×14px, a quarter of the tap floor, so the only in-panel explanation of how the payout and fee work is effectively unreadable on a phone.

*Evidence:* info-hint.tsx:33-40: the trigger is a 10px glyph in a tabIndex span with no hit-area padding. globals.css:1906-1921 `.kp-tooltip-popover { … font-size: 11px; font-family: mono; white-space: nowrap; left: 50%; transform: translateX(-50%) }`, with no phone override anywhere. Labels: payoutHowItWorks EN ≈215 chars (i18n-dict.ts:2322), SW ≈230 (:4484), estimateHowItWorks EN ≈190 (:2321) → a single line ≈1,400-1,500px wide. html/body `overflow-x: clip` (globals.css:874-885). Call sites: conviction-dial.tsx:1444, :1532, :1596. The Stake one sits right-aligned near the viewport edge.

### S04-detail-14 · 🟠 high · ♻️ duplicate → S04-detail-L04 · a11y
**Phone reading/focus order of bet panel vs information column** — `/markets/[id]`

Visual order and DOM order diverge on the primary money panel, and its h3 is read after h2s from another column.

*Evidence:* page.tsx:499 left `<section className="order-2 lg:order-1 …">` precedes :756 `<div className="order-1 lg:order-2 …">` (aside) in the DOM. On a phone the aside (SidePicker / guest CTA, `h3` at :831, side-picker.tsx:121) paints first, but Tab and screen readers reach it only after KPI, countdown, positions, criterion and chart. Plan U8 changes the guest `order-*` class but keeps CSS reordering.

### S04-detail-L03 · 🟠 high · 🆕 new · copy · unit: NEW: resolution-criterion content guard (publish + render)
**Resolution criterion panel body (p[lang])** — `/markets/mkt_0d271bde3ae784abe12b`

The paragraph the payout turns on (page.tsx:686-692 says so itself) tells the player nothing about how the market resolves, while money is already staked.

*Evidence:* On LIVE market A (TZS 1K staked, one-sided) the criterion paragraph is only 'https://www.premierleague.com' (14px, lang=en, section 328×157 at y=1413). The source line under it repeats 'https://www.premierleague.com/en' (211×17). No rule sentence exists in any locale: in SW the heading 'Kigezo cha utatuzi' sits over the same bare URL. Market B, by contrast, has a full 9-line rule.

### S04-detail-L04 · 🟠 high · 🆕 new · a11y · unit: U8
**Two-column wrapper: aside (bet widget / guest CTA) is visually first, DOM after the left column** — `/markets/mkt_0d271bde3ae784abe12b`

Screen-reader and keyboard order does not match the visual order. The money widget and the sign-in prompt are announced last, under the wrong heading.

*Evidence:* A-360-en focus order: 0 MARKETS y=120 → 1 Source y=191 → 2 Follow y=180 → 3 Share y=232 → 4 criterion URL link y=1528 → 5 Sign up y=598 → 6 Sign in y=598 → Similar cards. Heading outline: H1 (y=305) → H2 'Resolution criterion' (y=1438) → H3 'Place your stake on this market' (y=489), so the guest CTA becomes a child of the criterion section. The cause is CSS order-1/order-2 in page.tsx:495-499/756, with the aside wrapper after the section in source. For signed-in players the SidePicker dial is therefore reached only after the KPIs, countdown, criterion and chart.

### S04-detail-04 · 🟡 medium · 🆕 new · textbox · unit: U20
**Discussion comment textarea (signed-in)** — `/markets/[id]`

The only name is the placeholder ("Toa maoni yako" in SW), which disappears on input and is not a reliable accessible name. The 500-character limit counter is invisible to AT.

*Evidence:* comments-thread.tsx:201-208 `<Textarea value={body} … rows={3} maxLength={500} placeholder={t.common.shareYourRead} />`: no aria-label, no <label>, no aria-describedby. The remaining-count span at :210-212 is not associated. Textarea atom (textarea.tsx:21) supplies 16px text and ~100px height (both fine). No enterKeyHint (U22 covers hints).

### S04-detail-05 · 🟡 medium · ➕ extends → U24 · button
**NotifyPrompt "Watching · I'll notify you…" button under the dial** — `/markets/[id]`

Once a player opts in, the label overflows its w-full button by ~15-21px per side. It can cross the 16px gutter and be cut by body overflow-x clip. Signed-in only; a guest screenshot never shows it.

*Evidence:* notify-prompt.tsx:119-125 `className="btn btn-ghost btn-md w-full"`, label `${t.common.watching} · ${t.common.watchingHint}`. `.btn { white-space: nowrap }` (globals.css:1061). EN 43 chars (i18n-dict.ts:215-216), SW "Inafuatilia · Nitakujulisha linapotatuliwa" 42 chars (:2860-2861). At 14px/600: ≈300-315px text + 14 icon + 8 gap + 32 padding ≈ 355-370px, against a 328px button at 360.

### S04-detail-06 · 🟡 medium · 🆕 new · layout · unit: NEW: signed-in bet panel fit at 320/360 (dial header, place 
**Dial lock/unlock toggle over the locked YES/NO side tiles** — `/markets/[id]`

At 360 the toggle paints over the top 10px of the NO tile (EN x≈198-302). In SW the 162px toggle also covers ≈56px of the centred "UAMUZI WAKO" eyebrow. This is the default state of every signed-in bet panel. Computed from code; confirm with a signed-in drive.

*Evidence:* conviction-dial.tsx:1089 `absolute right-3 top-3 z-20 inline-flex min-h-[44px] … px-3` spans y 16-60 inside the `p-5` (24px) panel (:1075). Locked-mode block :1103-1123: eyebrow (14px line) + mb-2 (12) → tiles `h-[44px]` start at y 50. SidePicker always passes `lockedSide={side}` (side-picker.tsx:105), so the detail page is always in locked mode. Default unarmed label dialUnlock EN "Use dial" ≈112px wide, SW "Tumia kidhibiti" (i18n-dict.ts:3534) ≈162px.

### S04-detail-07 · 🟡 medium · 🆕 new · layout · unit: NEW: signed-in bet panel fit at 320/360 (dial header, place 
**Place-bet row (hint paragraph + Place button)** — `/markets/[id]`

The hint ("Pool-share payout. Confirm in a popup.") becomes a one-word-per-line column ~100px tall. Words like "Pool-share" (~70px) overflow into the gap and under the button. At 6-7 figure stakes in SW the button's own spans wrap inside the fixed 44px .btn-md height (the D23 clip class). This is geometry, not the PV-05 copy.

*Evidence:* conviction-dial.tsx:1646-1690 `flex items-center gap-3` with `<p className="flex-1 min-w-0 …">` next to `btn btn-no btn-md whitespace-normal` (minWidth 140, spans `Place NO` + `TZS 1,000,000` mono). Dial content at 360 = 328−2−48 = 278; minus gap 16 → button max-content ≈230px (EN NO) leaves the hint ≈32px; SW "Weka HAPANA" ≈255px leaves ≈7px. At TZS 5,000 the hint still gets ≈69px.

### S04-detail-08 · 🟡 medium · ➕ extends → U13 · number
**Stake / You-receive figures in the bet and sell confirm dialogs** — `/markets/[id]`

At the 1,000,000 stake bound the committed amount breaks into "TZS" / "1,000,000" on two leading-none lines, on the dialog where consent is given. In the free-exit case the two columns touch with 0px between them.

*Evidence:* bet-confirm-modal.tsx:276-292 `flex items-baseline justify-between` (no gap), side word `text-[26px]` + stake `font-mono font-bold text-[22px]` "TZS 1,000,000" (no nowrap). At 360: modal px-3 16 (modal.tsx:274) → panel 328, content p-5 → 280, box p-4 → 238px. "HAPANA"≈105 + stake≈172 = 277 > 238. sell-confirm-modal.tsx:109-125: `text-[24px]` "TZS 910,000"≈158 + `.amount` nowrap "−TZS 90,000"≈119 (globals.css:945) = 277 > 238; the free-window case "TZS 1,000,000" + "Hakuna ada" = 295.

### S04-detail-09 · 🟡 medium · 🆕 new · number · unit: NEW: one money grammar across detail, card and exit surfaces
**Early-exit fee and estimate money formats across sell button / sell confirm / result / dial** — `/markets/[id]`

One fee is shown four ways across three consecutive screens (sign before or after the currency, with or without TZS, signed or not), and one money figure breaks the mono rule.

*Evidence:* sell-button.tsx:246-251 `TZS {formatNumber(value)}` + `−{formatNumber(fee)} {t.common.fee}` gives "TZS 9,100 −900 fee" (fee without currency). sell-confirm-modal.tsx:122 `−${formatTzs(fee)}` gives "−TZS 900". utils.ts:62-64 formatTzs(−900) gives "TZS −900". sell-button.tsx:286 `formatTzs(Math.abs(net))` gives an unsigned "TZS 900". Hand-built `TZS {formatNumber()}` at sell-confirm-modal.tsx:113, bet-confirm-modal.tsx:290/308, conviction-dial.tsx:1608/1686. Estimated winnings `text-[18px] font-bold` in the body face, not mono (conviction-dial.tsx:1607, bet-confirm-modal.tsx:307), while stake/input/place are mono.

### S04-detail-10 · 🟡 medium · 🆕 new · textbox · unit: U22
**Stake and multiplier inputs in the dial** — `/markets/[id]`

The money entry fields render 13px text on phones, so iOS Safari zooms the page on focus in the middle of setting a stake. They are the only 13px text inputs on player money surfaces (deposit/withdraw use 16).

*Evidence:* conviction-dial.tsx:1460-1500 and :1538-1567 `<Input mono size="sm" … containerClassName="ml-auto h-[44px] w-[172px]">`; input.tsx:72-76 `sm: "text-[13px]"` applies to the input and to the TZS/× cells. No <label> element (the eyebrow <p> at :1442/:1530 is not associated; aria-label is present). No enterKeyHint.

### S04-detail-11 · 🟡 medium · 🆕 new · button · unit: U20
**Comment Report / Delete / Show all controls** — `/markets/[id]`

Per-comment actions are a third of the tap floor and sit 12px apart in a dense list, so a mis-tap on Delete removes a comment immediately. The accessible name misreports the Reported state.

*Evidence:* comments-thread.tsx:312-321 and :323-334 `inline-flex items-center gap-1 font-mono text-[10.5px]` with no padding or min-height → ≈16×53px targets. Report keeps `aria-label={t.common.reportComment}` ("Report comment") while its visible text becomes "Reported" (:320). Delete is styled identically to Report and has no confirm. Show all (:345) `px-3 py-2` ≈41px, rounded-md 8.

### S04-detail-12 · 🟡 medium · ♻️ duplicate → S04-detail-L05 · link
**Source links (header, criterion URL, resolution panel)** — `/markets/[id]`

The link to the resolving source (the evidence a player checks) is an ≈18px target in the header. The raw URL wraps into several 11px mono lines on phones, and the same destination appears three times.

*Evidence:* page.tsx:456-464 header `<a … className="inline-flex items-center gap-1 ml-auto text-[12px] font-mono …">`, no min-height (≈18px tall) beside the 40px star/share. page.tsx:720-723 raw URL `text-[11px] underline break-all` (≈16px lines). resolution-panel.tsx:155-163 Source `text-[11.5px]` (≈17px). A resolved market shows three separate source links.

### S04-detail-13 · 🟡 medium · 🆕 new · a11y · unit: U24
**Sell / cash-out button accessible name** — `/markets/[id]`

The visible label is not contained in the accessible name, so voice-control users saying "Sell now" cannot activate the control that moves their money.

*Evidence:* sell-button.tsx:224-230 `aria-label={closedNow ? t.common.sellLockedHint : inGrace ? `${freeExitLabel} — …` : `${t.common.cashOut} ${formatTzs(value)}`}` vs visible :239-252 "Sell now TZS 9,100 −900 fee". EN cashOut "Cash out" vs sellNow "Sell now"; SW "Toa sasa" vs "Uza sasa" (i18n-dict.ts:2685, :2851); closed state name is a long sentence (:2956) vs visible "Kuuza kumefungwa".

### S04-detail-15 · 🟡 medium · 🆕 new · state · unit: U10
**Outcome chip on a VOIDED / resolved market** — `/markets/[id]`

A voided (refund) market wears the gold earned-money chip in the header and a royal pending chip 300px lower, with different words. There are two designs for one state on one page.

*Evidence:* page.tsx:453-455 `<Chip variant="resolved" size="lg">{t.market.resolvedOutcome} · {outcomeWord(t, m.resolvedOutcome ?? "VOID", "MARKET")}</Chip>` → gold gradient (chip.tsx:103), 27px/12.5px, "RESOLVED · VOID". resolution-panel.tsx:130-132 `<Chip variant={isVoid ? "pending" : "resolved"}>` (md, 23px/11px) → royal "MARKET VOIDED". For non-void outcomes the same chip also appears twice, at lg and md.

### S04-detail-16 · 🟡 medium · ♻️ duplicate → S04-detail-L07 · state
**Aside on RESOLVED / VOIDED / admin-CLOSED markets** — `/markets/[id]`

A player opening a settled market on a phone first sees a ~90px box saying betting is closed rather than the outcome. Three different compositions express the same no-more-bets state.

*Evidence:* page.tsx:878-882: the final branch renders `rounded-xl border … p-6 text-center` with one 15px line "Market closed for predictions" for every resolved market. The wrapper is `order-1` (:756), so on a phone it sits directly under the title, above the tipping bar and ResolutionPanel (order-2, :546). Other 'no more bets' designs: selection-closed card with icon+eyebrow+h3+body (:854-866), closed-by-time warning card (:868-877), plain one-liner (:879-881).

### S04-detail-17 · 🟡 medium · 🆕 new · state · unit: U8
**Countdown panel after resolutionAt has passed (closed-by-time, unresolved)** — `/markets/[id]`

A dead zero clock that still says "Results in" stays on screen for the whole settlement lag, which can be long while auto-resolve is stalled.

*Evidence:* page.tsx:582-595 is gated only on `!isResolved`; for closedByTime (:246) it renders `<Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} …>`. countdown.tsx:13 clamps to `Math.max(0, …)` → "00 00 00 00" under "Results in" (SW "Matokeo baada ya") with a past date, while the aside says "Closed · Awaiting settlement" (:868-877).

### S04-detail-18 · 🟡 medium · 🆕 new · copy · unit: U26
**"Your positions" empty state** — `/markets/[id]`

On closed or settled markets the copy instructs an action that does not exist. On live markets it adds an empty bordered box to every signed-in page.

*Evidence:* page.tsx:598-608 renders for every session regardless of market state; `t.market.noBetYet` = "You haven’t bet on this market yet. Use the dial to get started." (i18n-dict.ts:720; SW :3279 "…Tumia kidhibiti kuanza."). Resolved and closed markets render no dial (:853-882). On live markets it is a `p-5` (24px) bordered panel holding one italic 13px line.

### S04-detail-19 · 🟡 medium · ➕ extends → D23 · container
**Your positions panel → position row → free-exit strip** — `/markets/[id]`

Nested bordered and filled boxes stack 42px of padding per side and squeeze the money button to 244px, which is what makes D23's wrap happen.

*Evidence:* page.tsx:599 `rounded-xl border border-border bg-bg-elevated p-5` (24) > :618 `rounded-md border border-border bg-bg-overlay/40 p-3` (16) > sell-button.tsx:214 `rounded-md border border-brand-500/30 px-2 py-1`. Depth 3, 24+1+16+1 = 42px per side. At 360 the SellButton gets 328 − 84 = 244px.

### S04-detail-20 · 🟡 medium · 🆕 new · card · unit: NEW: detail position row → compact PositionCard
**Position row on the detail page vs PositionCard** — `/markets/[id]`

Two designs for the same money object, with different information: after betting closes the exact payout is on /positions but not on the market page.

*Evidence:* page.tsx:618-668: side as coloured 12px mono text, status as 10px micro text, stake 12px, ticket 10px, "Opened" 10px, Paid row 11px, plus SellButton 14/11/10 (4+ sizes). position-card.tsx:75-185 renders the same Position with `<Chip size="sm">` side and status chips, a 15px title and a `<Stat>` grid, and shows the exact payout-if-win once betting closes (:162-176). The detail row shows no payout until settled.

### S04-detail-21 · 🟡 medium · ♻️ duplicate → S04-detail-L14 · container
**Panel/sheet padding on phones across the page** — `/markets/[id]`

Ten panels use five padding values (14/16/20/24/32) and none sits on the 16 phone rung. The guest sign-in card spends 64px of its width on padding.

*Evidence:* Resolved against this scale: countdown `glass-panel p-4` 20 (page.tsx:583); criterion `p-5` 24 (:675); positions `p-5` 24 (:599); ResolutionPanel `p-5` 24 (resolution-panel.tsx:120); chart header `px-4 py-3.5` 20/14 (chart-toggle.tsx:62); guest CTA and closed asides `p-6` 32 (page.tsx:821, :854, :868, :879); SidePicker/ConvictionDial `p-5` 24 (side-picker.tsx:117, conviction-dial.tsx:1075); comments `p-5` 24 (comments-thread.tsx:189); one-sided `px-4 py-3` 20/16 (:568); hedge `px-3.5 py-2.5` 14/10 (:763). U18 covers PageContainer/KycGatePanel/Callout stack only.

### S04-detail-22 · 🟡 medium · ♻️ duplicate → S04-detail-L12 · typography
**Section titles on the detail page** — `/markets/[id]`

Six sibling sections use five title treatments, all hand-typed sizes, and the chart section has no heading at all.

*Evidence:* "Your positions" h2 `text-[15px] font-semibold` (page.tsx:600); "Resolution criterion" h2 `text-[15px] font-semibold` (:676); "Resolution" h2 `text-[16px] font-semibold` (resolution-panel.tsx:123); "Similar markets" h2 `text-[16px] font-bold` (:924); "Discussion" h2 `text-[17px] font-semibold` (comments-thread.tsx:192); chart title is a 10px mono eyebrow inside a button, not a heading (chart-toggle.tsx:65-68). Panel titles: guest h3 `text-[18px]` (:831), selection-closed h3 `text-[15px]` (:861), SidePicker h3 `text-[17px]` (side-picker.tsx:121). Heading icons 15 or 16.

### S04-detail-23 · 🟡 medium · ♻️ duplicate → S04-detail-L12 · typography
**Type sizes on the page (guest open market + signed-in additions)** — `/markets/[id]`

The page exceeds the closed ladder with at least 6 off-ladder literals. 9.5px is used for numbers and body-face chips, not uppercase mono microlabels. Money figures appear at 9.5-10px.

*Evidence:* Guest open market at 360: 10 (eyebrows), 10.5 (.tipbar-lean globals.css:1485), 11 (.tipbar-labels :1471; page.tsx:521, :720), 12 (page.tsx:460 text-[12px]), 12.5 (Chip lg status chip.tsx:178; page.tsx:588 text-[12.5px]), 13 (KPI value :1012; :714), 14 (:684), 15, 16, 17 (h2s), 18 (Stat xl; :831), 28 (h1; countdown cells countdown.tsx:109): 13 distinct sizes. Signed-in adds 9.5 in body face (Chip sm chip.tsx:167 in comments; dial range chips conviction-dial.tsx:1511/1515, non-uppercase numbers), 10 money copy (:1638 insufficient detail with figures), 10.5 (comments :210, :302, :316), 11.5 (resolution-panel.tsx:148), 13.5 (comments :288), 22/24/26 (confirm dialogs). The KPI strip mixes 18px display-bold tiles with a 13px mono-regular tile (page.tsx:540-542, open decision noted at :990-1004).

### S04-detail-24 · 🟡 medium · 🆕 new · copy · unit: NEW: SW lexicon pass on the detail page (NDIO/NDIYO · bwawa/
**Swahili words for YES and for pool on one page** — `/markets/[id]`

The same concept is spelled two ways on one screen. The YES button's visible label ("NDIO") is not the word in its accessible name ("NDIYO"), which also breaks label-in-name for voice control.

*Evidence:* sideWord → common.yes "NDIO" (side-label.ts:84; i18n-dict.ts:2699) on tipping labels, YES/NO buttons and chips. probOverTime "Uwezekano wa NDIYO kwa muda" (:3519) on the chart header; backYesAria "Unga mkono NDIYO kwa {pct}%" (:3544) as the accessible name of the visible "NDIO @ 56%" button (side-picker.tsx:138/147). SW section counts: NDIYO/Ndiyo/ndiyo 14 vs NDIO/Ndio/ndio 9. Pool: noPoolYet "Hakuna bwawa bado" (:3267) vs resPoolWord "dimbwi" / resFinalPool "Jumla ya dimbwi" (:3292-3293); dict has 31 bwawa vs 6 dimbwi.

### S04-detail-25 · 🟡 medium · 🆕 new · copy · unit: NEW: MarketCard signal badge from data, not English text
**SOON signal badge on the Similar markets rail** — `/markets/[id]`

The closing-soon badge can never appear for Swahili or Chinese readers, on this rail and on /markets, /live and /watchlist (shared component). A state is silently locale-dependent.

*Evidence:* market-card.tsx:115 `if (/^\d+m left$/.test(timeLeft) // /^\d+s left$/.test(timeLeft)) return { kind: "soon" … }`. page.tsx:950/981-988 passes a localised label: SW "dakika {n} zimebaki", ZH "{n}分钟后" (i18n-dict.ts:3269, :5404).

### S04-detail-L02 · 🟡 medium · 🆕 new · number · unit: NEW: one money grammar across detail, card and exit surfaces
**KPI tile VOLUME (Stat xl) vs resolution ledger Final pool** — `/markets/mkt_48bcd7882a2d1d205409`

A money figure is rounded up by 20% right beside its exact value, and one page uses two compaction grammars (integer K on the KPI, full figure on the cards).

*Evidence:* B-360-en: VOLUME tile 'TZS 3K' (y=786, 18px Sora 700) and 'Final pool TZS 2,500' (y=1309) are 523px apart on the same page. SW shows the same ('KIASI TZS 3K'). formatTzsCompact (utils.ts:134) does Math.round(abs/1000), so 2,500 becomes 3K, a 20% overstatement. The Similar-markets cards on the same page print uncompacted 'TZS 2,000' (y=2299), while the open market's KPI says 'TZS 1K'.

### S04-detail-L05 · 🟡 medium · 🆕 new · link · unit: NEW: detail tap floors (source links · criterion disclosure)
**Header Source link, resolution-panel Source, criterion source URL, Contact support** — `/markets/mkt_0d271bde3ae784abe12b / /markets/mkt_48bcd7882a2`

Four text links on the detail page are 16-18px tall. One sits beside the star button, so a thumb aimed at Source can follow the market (redirecting a guest to login) and vice versa.

*Evidence:* Header Source link is 59×18 on all 8 loads (page.tsx:456-464, text-[12px]). At 360 A its right edge (x=292) is 12px from the 40px star (x=304). Resolution panel Source is 56×17 (resolution-panel.tsx:155-163). Criterion URL is 211×17 (A) and 265×50 wrapped over 3 lines with break-all (B, page.tsx:722). Contact support is 99×16 at 320/412 and 247×37 wrapped at 360 (resolution-panel.tsx:298).

### S04-detail-L06 · 🟡 medium · ➕ extends → D6 · layout · unit: U10
**Header badge/action row (category chip, state chip, Source, star, Share)** — `/markets/mkt_0d271bde3ae784abe12b / /markets/mkt_48bcd7882a2`

The action cluster breaks apart unpredictably by width and locale. Share is orphaned on its own row at every phone width, and star and Source separate.

*Evidence:* New EN instances of D6 (U10). A: SPORTS 75×25, LIVE 65×27, Source 59×18 and star 40×40 sit on row 1 while SHARE 99×40 sits alone on row 2 (y=232) at 320, 360 and even 412 (screenshot). B-360-en: Source stays right on row 1 (x=285) while star+SHARE drop to row 2 left-aligned (x=16/68). B-320-en and B-360-sw: Source+star+SHARE drop to row 2 right-aligned (x=104/175/227 SW). That is three compositions of one row, with five element heights (25/27/18/40/40) mixed on it. Code: page.tsx:430-467 (flex-wrap, ml-auto on Source only).

### S04-detail-L07 · 🟡 medium · 🆕 new · state · unit: U18
**Resolved-market aside: 'Market closed for predictions' card** — `/markets/mkt_48bcd7882a2d1d205409`

The first content after the title says only 'closed'. The outcome, settlement and refund facts need a scroll on every phone, and the same state has two compositions (header chip plus a generic box).

*Evidence:* On a RESOLVED market the aside falls to the generic else-branch (page.tsx:879-881): a 328×89 box with 32px padding (p-6) holding one 15px line, 'Market closed for predictions' / 'Soko limefungwa kwa utabiri', at y=561. It pushes the Resolution panel below the first screen at every size: Resolution H2 at y=959 (360×780 EN), 994 (360 SW), 1020 (320×640), 937 (412×915).

### S04-detail-L08 · 🟡 medium · ➕ extends → D8 · copy · unit: U20
**ResolutionPanel footnote 'Your own payout is shown under Your positions above.'** — `/markets/mkt_48bcd7882a2d1d205409`

Guests are pointed to a section that does not exist, and a refund is described as a payout.

*Evidence:* Rendered for a guest at y=1482 (13px, 278×42). resolution-panel.tsx:279 renders it whenever !isVoid, but the 'Your positions' section exists only with a session (page.tsx:598). Strings: i18n-dict.ts:747 (EN), 3298 (SW 'chini ya Nafasi zako hapo juu'), 5433 (ZH). On this one-sided market nobody was paid; stakes were refunded.

### S04-detail-L09 · 🟡 medium · 🆕 new · number · unit: NEW: probability chart phone pass (axis bounds · dead ranges
**Probability chart price scale (MarketCurve)** — `/markets/mkt_48bcd7882a2d1d205409`

A YES-probability axis shows negative percentages, and the 0-6% zoom makes a flat line look like a measured scale.

*Evidence:* The chart of a flat YES 0% line auto-scales to a 0-centred band: axis labels read 6%, 4%, 2%, 0% (rose pill), -2%, -4%, -6%, with time labels 'Sep 13' and '11:41'. Canvas 246×212 inside a 286×240 img box at y=2168. market-curve.tsx:109-120 creates the Baseline series with no autoscale bounds.

### S04-detail-L11 · 🟡 medium · ♻️ duplicate → S04-detail-24 · copy
**Swahili YES word: NDIO vs NDIYO on one page** — `/markets/mkt_48bcd7882a2d1d205409`

The same betting side is spelled two ways within one screen in Swahili.

*Evidence:* B-360-sw: header chip 'IMETATULIWA · NDIO' and tipping bar 'NDIO 0%' use common.yes 'NDIO' (i18n-dict.ts:2699). The chart toggle on the same page reads 'UWEZEKANO WA NDIYO KWA MUDA' (market.probOverTime, i18n-dict.ts:3519; probChartAria 3521). backYesAria/backYesAriaNoPrice also use 'NDIYO' (3544-3545).

### S04-detail-L12 · 🟡 medium · 🆕 new · typography · unit: NEW: detail-page type ladder (section titles + off-ladder li
**Section titles and off-ladder sizes on the detail page** — `/markets/mkt_0d271bde3ae784abe12b / /markets/mkt_48bcd7882a2`

Sibling sections do not share a title step, and hand-typed off-ladder sizes remain on chips, the tipping bar and the settlement ledger.

*Evidence:* Section titles sit on four sizes and two weights: 'Resolution criterion' 15/600 (page.tsx:676 text-[15px]), 'Resolution' 16/600 (resolution-panel.tsx:123 text-[16px]), 'Similar markets' 16/700 (page.tsx:924 text-[16px]), 'Discussion' 17/600 (comments-thread.tsx:192 text-[17px]); the guest H3 is 18/700 (page.tsx:831 text-[18px]) and the share dialog title 14 (share-button.tsx:114). Off-ladder sizes painted by detail code: 12.5px Inter 700 state chip 'LIVE' / 'RESOLVED · YES' (chip.tsx:178 lg status), 10.5px 'LEANS NO' (globals.css:1485 .tipbar-lean), 11.5px resolution date/Source (resolution-panel.tsx:148), 12.5px ledger rows (resolution-panel.tsx:237). The page histogram has 17 distinct sizes: 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 15, 16, 17, 18, 22, 28.

### S04-detail-L13 · 🟡 medium · ♻️ duplicate → S04-detail-L12 · typography
**Type sizes per panel (resolution panel, guest CTA, discussion, SW criterion)** — `/markets/mkt_48bcd7882a2d1d205409 / /markets/mkt_0d271bde3ae`

Panels exceed the three-size budget; the settlement panel doubles it.

*Evidence:* Distinct font sizes counted inside each panel. Resolution panel: 6 sizes (10, 11, 11.5, 12.5, 13, 16) in EN and SW. Guest sign-in panel: 4 (10 eyebrow, 13 body, 14 buttons, 18 H3). Discussion: 4 (11 count, 13 empty, 14 CTA, 17 title). Criterion panel in SW: 4 (11 URL, 13 binding note, 14 body, 15 title).

### S04-detail-L14 · 🟡 medium · 🆕 new · container · unit: U18
**Detail panels: padding and radius by role** — `/markets/mkt_0d271bde3ae784abe12b / /markets/mkt_48bcd7882a2`

No phone rung is applied. The guest CTA spends 64px of width on padding, and stat tiles and Discussion use off-role radii (8 and 12) beside 16px panels.

*Evidence:* Sibling panels at 328px wide use five paddings and three radii. Guest CTA: 32px padding, r16 (page.tsx:821, p-6; at 320 the content is 222px and the buttons stack 222×44 ×2). Resolved aside: 32px (page.tsx:879). Criterion: 24px r16 (page.tsx:675). Resolution panel: 24px (resolution-panel.tsx:120). Countdown: 20px r16 (page.tsx:583). One-sided callout: 16/20px r12 (page.tsx:568). KPI tiles: 16px r8 (stat.tsx:119, page.tsx:1007). Discussion: 24px r12, bg-elevated with no glass (comments-thread.tsx:189). Share dialog: 24px (modal.tsx:319).

### S04-detail-26 · ⚪ low · 🆕 new · copy · unit: U8
**Selection-closed state repeated in the first screen** — `/markets/[id]`

One state is stated three times in three styles, which pushes the tipping bar and KPIs down on a phone.

*Evidence:* Header pill "Selection closed — waiting for results" (page.tsx:445-451); aside eyebrow "Selection closed" + h3 "Waiting for results" + body "…results expected by {date}" (:853-866); countdown panel line `text-[12.5px]` gold "Selection closed — waiting for results" (:587-591) above a "Results in" countdown. On phones the aside is order-1, so all three stack within ~500px.

### S04-detail-27 · ⚪ low · 🆕 new · copy · unit: NEW: SW lexicon pass on the detail page (NDIO/NDIYO · bwawa/
**Resolution ledger side-pool labels** — `/markets/[id]`

English word order is concatenated into Swahili (natural form: "Dimbwi la NDIO") on the settlement breakdown players use to check payouts.

*Evidence:* resolution-panel.tsx:240 and :246 `label={`${t.common.yes} ${t.market.resPoolWord}`}` → SW "NDIO dimbwi", ZH "是 奖池"; built from `t.common.yes` directly rather than sideWord.

### S04-detail-28 · ⚪ low · 🆕 new · number · unit: U24
**Resolution ledger values (capped-fee row)** — `/markets/[id]`

On legacy capped-commission markets the fee arithmetic wraps mid-expression ("9% × TZS" / "1,234,567"), separating the currency from its figure.

*Evidence:* resolution-panel.tsx:326-338 Row `flex items-center justify-between gap-3`; the value span has no nowrap. At 360 the row inner width = 328 − 50 (glass p-5) − 2 − 28 (px-3.5) = 248px. Capped row :255-259 value "9% × TZS 1,234,567" (≈140px at 12.5 mono) + SW label "Ada imewekewa kikomo" (i18n-dict.ts:3295, ≈155px) = 311px.

### S04-detail-29 · ⚪ low · ♻️ duplicate → S04-detail-L17 · number
**Volume, predictors, deadline and comment counts** — `/markets/[id]`

Figures for the same fact disagree in format on one screen, counts lack grouping, and the tense is wrong once resolved.

*Evidence:* Resolved market: KPI Volume `formatTzsCompact` "TZS 17K" (page.tsx:540) vs ledger "Final pool TZS 17,350" (resolution-panel.tsx:238). Same resolutionAt as `formatDateTime` "11 Jun 2026, 14:30" in the KPI (page.tsx:542, utils.ts:278) vs `formatDeadline` "11 Jun, 14:30" in the countdown (:593, utils.ts:330). `String(m.predictorCount)` (:541) and comments `{total}` (comments-thread.tsx:196) print "1234" with no separator. The KPI label stays "Resolves" / SW "Inaisha" with a past date on resolved markets.

### S04-detail-30 · ⚪ low · ❌ refuted · filter
**Probability chart range rail (1D/1W/1M/ALL)** — `/markets/[id]`

A second selected-state language for a filter control: the unselected group is outlined and the selected pill is not.

*Evidence:* globals.css:2836 `.pchart-ranges { … border-radius: pill; background: var(--bg-overlay); border: 1px solid var(--border) }` outlines the group; :2875 `.pchart-range.is-active { background: var(--pill-active) }` is fill only, with no border. FilterPill outlines only the selected pill (`border-brand-400`, filter-pill.tsx:149-158). The rail is 44+4 padding+2 border = 50px tall; the <400px scroller (:2892) has no edge cue.

### S04-detail-31 · ⚪ low · 🆕 new · container · unit: U18
**One-sided disclaimer and hedge warning boxes** — `/markets/[id]`

Two warnings on one page with two paddings and no shared primitive, which is the drift the kit component exists to prevent.

*Evidence:* callout.tsx:4-9 states that Callout absorbed "the market page's one-sided disclaimer and its hedge warning". page.tsx:568-578 is still hand-rolled `rounded-lg … px-4 py-3` (12 radius, 20/16 padding, 15px icon) and :763-796 is hand-rolled `rounded-lg … px-3.5 py-2.5` (14/10, no icon). Callout sm is `rounded-md px-3 py-2.5`, 14px icon (callout.tsx:162).

### S04-detail-32 · ⚪ low · ♻️ duplicate → S04-detail-L14 · container
**Radii by role and the header action pair** — `/markets/[id]`

The same role gets different radii (panels 12 vs 16, controls 8 vs 12), and the two header actions are different shapes side by side.

*Evidence:* Panels: glass-panel 16 (globals.css:2968), positions / SidePicker / dial / CTA `rounded-xl` 16, but comments section `rounded-lg` 12 (comments-thread.tsx:189) and one-sided/hedge `rounded-lg` 12. Tiles and controls: KPI `rounded-md` 8 (page.tsx:1007, stat.tsx:119), countdown cells 8 (countdown.tsx:109), objection button 8 (objection-dialog.tsx:94), Show all 8. WatchStar borderless `rounded-md` 40×40 (watch-star.tsx:107) beside the bordered pill ShareButton (share-button.tsx:100).

### S04-detail-33 · ⚪ low · 🆕 new · state · unit: U26
**Empty tipping rail after the only bettor cashed out** — `/markets/[id]`

An unlabelled dashed bar with contradictory stats.

*Evidence:* page.tsx:513 `empty={noPriceMarket}` (pool 0), but the caption at :520-524 renders only when `freshMarket` (pool 0 and predictorCount 0). predictorCount is never decremented (:256-259), so pool 0 with predictors 1 shows a dashed rail with no text, a "TZS 0" volume and "1" predictor.

### S04-detail-34 · ⚪ low · ➕ extends → D25 · motion
**TippingBar hover recast on touch** — `/markets/[id]`

Tapping or scrolling over the probability bar animates it through a fake 50/50 split on the page where players stake, which is what the cold-start rule (brand.tsx:222-225) forbids showing.

*Evidence:* page.tsx:508-519 does not pass `recastOnHover`, so the default true applies (brand.tsx:205). brand.tsx:249-266 `handleEnter` sets animYes to 50 then back to target with the --m-pivot overshoot, bound to `onMouseEnter` (:306), which mobile browsers emulate on tap.

### S04-detail-35 · ⚪ low · 🆕 new · state · unit: NEW: detail tap floors (source links · criterion disclosure)
**"Show the English original" disclosure under the criterion** — `/markets/[id]`

The binding-text disclosure is below the tap floor and gives no expanded/collapsed cue.

*Evidence:* page.tsx:706-717 `<summary className="flex cursor-pointer list-none items-start gap-1.5 text-body-sm …">` gives a ≈18px-per-line tap target (one line in ZH/short SW). `list-none` removes the marker, and the underlined "Show the English original" text does not change when open; there is no chevron or "Hide" state.

### S04-detail-36 · ⚪ low · ❌ refuted · icon
**Glyph sizes and plates across the page** — `/markets/[id]`

Nine glyph sizes, with 10-15 below the 16/18/20/24 set, and plates at 36 are off the 40/32/24 rungs.

*Evidence:* Sizes in use: 10 (page.tsx:649, :653; side-picker.tsx:92), 11 (:721; countdown.tsx:82; chart-toggle.tsx:66; comments :319, :331), 12 (:463, :698), 13 (:441, :449; share-button.tsx:103; objection-dialog.tsx:96), 14 (:540-541, :589), 15 (:569, :601, :677, :923), 16 (comments-thread.tsx:191; resolution-panel.tsx:124), 18 (:856), 96 watermark. Share modal plates `h-[36px] w-[36px]` (share-button.tsx:128, :149, :162). Heading icons are 15 on two h2s and 16 on two others.

### S04-detail-37 · ⚪ low · ➕ extends → U13 · container
**Bet confirm dialog boxes (adds evidence to U13)** — `/markets/[id]`

Four stacked box-in-box blocks inside the money dialog, one of them above the ~40px per-side threshold, which is why the stake wraps (S04-detail-08).

*Evidence:* bet-confirm-modal.tsx:240 content `p-5` (24) containing four bordered/tinted boxes: side summary `rounded-lg border p-4` (:275), payout `border p-3` (:303/:315), exit terms `border px-3 py-2.5` (:336), HouseLeanWarning Callout (:350). The side summary stacks 24+1+20 = 45px per side.

### S04-detail-38 · ⚪ low · ➕ extends → D26 · state
**Market detail loading skeleton (adds a route to D26/U25)** — `/markets/[id]`

The swap from skeleton to page shifts every block on phones. The D26 register names /live, /results and generic loaders but not this route.

*Evidence:* loading.tsx:11 back-link ghost `h-3` 16px vs real `min-h-[44px]` (back-link.tsx:57); :33 tipping ghost `h-2` 12px vs real 28 + 8 + 15 labels (page.tsx:510, globals.css:1465-1471); no KPI ghost vs real 2-col + date tile (≈150px); chart ghost 180px (:47) vs real ≈380px (42 header + 62 rail + 240 + padding); aside ghost 260+96 (:56, :62) vs guest CTA ≈220 at 360.

### S04-detail-39 · ⚪ low · 🆕 new · a11y · unit: NEW: probability chart phone pass (axis bounds · dead ranges
**Probability chart** — `/markets/[id]`

Screen-reader users get "YES probability over time" with no values (first, last, change), and an interactive canvas is announced as a static image.

*Evidence:* market-curve.tsx:166 `<div role="img" aria-label={labels.chartAria}>` wraps a touch-pannable, pinch-zoomable crosshair canvas (:105-107). ChartToggle `<section className="glass-panel …">` (chart-toggle.tsx:58) has no heading or aria-label; the toggle button has aria-expanded but no aria-controls.

### S04-detail-40 · ⚪ low · ❌ refuted · typography
**Gold and amber ink on non-money labels** — `/markets/[id]`

Gilt marks sign-in and waiting states, and amber ("someone must act") colours a routine label, diluting both meanings on the money page.

*Evidence:* Guest CTA eyebrow "Sign in to predict" `text-gold-300` (page.tsx:828); selection-closed icon and eyebrow `text-gold-300` (:856-859); countdown panel line `style={{ color: "var(--gold-300)" }}` (:588); the neutral countdown label "Closes in" uses `text-warning-fg` amber on every market (countdown.tsx:73).

### S04-detail-41 · ⚪ low · ➕ extends → D11 · button
**SidePicker YES/NO buttons at 320 in Swahili** — `/markets/[id]`

The label runs ~17px into each 20px side padding, leaving ~3px to the button edge. This is the market-poll twin of D11; an estimate to confirm on a signed-in drive.

*Evidence:* side-picker.tsx:133-156 `grid grid-cols-2 gap-2.5` (10px) of `btn btn-yes/no btn-lg` (padding 0 20px, nowrap). At 320: aside 288 − 2 − 48 = 238 → buttons 114px, inner ≈72px. "HAPANA @ 44%" (15px bold 0.06em + 12.5px mono suffix) ≈106px.

### S04-detail-L10 · ⚪ low · 🆕 new · filter · unit: NEW: probability chart phone pass (axis bounds · dead ranges
**Chart range pills 1W / 1M / ALL (.pchart-ranges)** — `/markets/mkt_48bcd7882a2d1d205409`

A filter offers three choices that change nothing, speaks a second pill language (a segmented track), and leaves 'ALL' untranslated.

*Evidence:* Tapped each pill at 360 and 320. aria-pressed moved correctly and the section held at 383px (no layout shift), but the 1W and ALL charts are pixel-identical (tap0 vs before screenshots) because the history is about 2 days, so all three ranges show the same window. Geometry is 44×44 pills in a 140×50 bordered track; the selected pill is a filled capsule (--pill-active) with no outline, and unselected pills are wrapped by the track border (globals.css:2836-2875). FilterPill instead outlines only the selected pill (filter-pill.tsx:149-158). In SW the labels stay '1W 1M ALL'.

### S04-detail-L15 · ⚪ low · 🆕 new · button · unit: NEW: probability chart phone pass (axis bounds · dead ranges
**Chart collapse toggle 'YES PROBABILITY OVER TIME'** — `/markets/mkt_48bcd7882a2d1d205409`

The only control of the chart section is below the 44 default rung, with a 10px label.

*Evidence:* Measured 326×42 (360), 286×42 (320), 378×42 (412), with a 10px mono label and 14px chevron (chart-toggle.tsx:59-76, py-3.5 plus the line box).

### S04-detail-L16 · ⚪ low · 🆕 new · container · unit: U20
**Discussion empty state (guest)** — `/markets/mkt_0d271bde3ae784abe12b`

Two voids over 48px inside one panel, and an unlabeled number.

*Evidence:* Box y=2780 h=247. CTA button ends at y=2894; the empty line 'No comments yet — start the conversation.' has 32px block padding (p y=2918 h=84), so text runs about 2950-2970, then the box bottom is at 3027. That is a 56px void above (mb-5 24 + py-6 32) and 57px below (py-6 32 + p-5 24). The header count '0' is a bare 7×17 11px span with no label (comments-thread.tsx:196).

### S04-detail-L17 · ⚪ low · 🆕 new · copy · unit: U8
**KPI tile RESOLVES (local KPI, mono 13px)** — `/markets/mkt_48bcd7882a2d1d205409 / /markets/mkt_0d271bde3ae`

A stale future-tense label on a settled market, plus duplicated dates on an open one.

*Evidence:* Resolved B still shows 'RESOLVES 13 Sept 2026, 20:30' ('INAISHA' in SW) at y=877: future tense, and a third timestamp beside 'resolved 14 Sept 2026, 10:41' (y=1051) and 'Settled 14 Sept 2026, 11:41' (y=1260). On open A the same instant appears twice within 370px: RESOLVES tile '11 Feb 2027, 02:59' (y=902) and 'RESULTS IN 11 Feb 2027, 02:59' (y=1270). page.tsx:542.

### S04-detail-L18 · ⚪ low · 🆕 new · icon · unit: U12
**Share dialog Copy-link glyph; ext icons** — `/markets/mkt_48bcd7882a2d1d205409`

A meaningful icon is unrecognisable, and ext glyphs sit below the icon size set.

*Evidence:* The Copy-link plate (36×36) holds the custom LinkMark at 16px (share-button.tsx:188-195), which renders as an unreadable squiggle in the open-dialog screenshot. External-link glyphs are 12px in the header (page.tsx:463) and 11px on the criterion source line (page.tsx:721), where the 11px icon floats centred beside a 3-line URL (B, 265×50).

### S04-detail-L19 · ⚪ low · ➕ extends → U12 · container
**Share dialog on phones (Modal) — evidence for U12** — `/markets/mkt_48bcd7882a2d1d205409 / /markets/mkt_0d271bde3ae`

Phone modal padding is off the 16 rung and the dialog sits mid-screen instead of in thumb reach. Known unit; new measured instance.

*Evidence:* Opened from header Share and closed via ✕. It renders as a centred dialog, not a sheet: panel 328×240 at y=270 (360), 288×240 at y=200 (320), 328×258 (SW), with 24px padding and r16. Rows: WhatsApp 302×71 (SW 302×89, subtitle wraps), Copy link 302×86 with the URL breaking mid-id ('mkt_48bcd78/82a2d1d205409'). Close is 48×48. A11y passes: role=dialog, aria-modal=true, aria-label 'Share this market', focus lands on Close, focus returns to the trigger, body scroll lock released.

### S04-detail-L20 · ⚪ low · ➕ extends → U8 · state
**Countdown panel: two 4-tile clocks one hour apart (evidence for U8)** — `/markets/mkt_0d271bde3ae784abe12b`

248px of near-identical ticking figures on a guest phone screen, with bordered tiles nested inside a bordered panel.

*Evidence:* The glass panel is 328×248 (20px padding) holding 8 bordered tiles, a box-in-box at depth 2: 'SELECTION CLOSES IN 148 / 07 / 19 / 22' and 'RESULTS IN 148 / 08 / 19 / 22', both ticking seconds (28px mono tabular) for a deadline 148 days away. In SW the label wraps its date to a second line ('UCHAGUZI UNAFUNGWA BAADA YA').

### S04-detail-L21 · ⚪ low · ➕ extends → D3 · layout
**Chat bubble over detail money/text (evidence for D3)** — `/markets/mkt_48bcd7882a2d1d205409 / /markets/mkt_0d271bde3ae`

A pinned control hides a money figure on the settlement ledger. New detail-page instances of the known defect.

*Evidence:* A fixed 52×52 bubble at viewport x=292 y=648. At 360 B the second slice shows it covering the settlement ledger value 'TZS 325' (Platform fee row); at 320 A (second slice) it covers 'to pay' in the one-sided callout body. It also sits over the chart's last time label in the chart element shot.

## S05-updown — Up & Down (board, round page, history)

### S05-01 · 🟠 high · 🆕 new · state · unit: NEW: U32 Up & Down figures, time and state truth
**Round page countdown pod vs RoundActionPanel at the lock instant** — `/updown/udr_539bc3ea681d57e1864d`

At the lock the pod shows a dead 'Betting closes in 00:00' beside a panel that says betting is already closed. That is the 'live-looking clock over dead buttons' the card's own comments call the most load-bearing caption. The pod only catches up on the next poll.

*Evidence:* Same page load, round-320-en.json: pod div @16,278 257x48 reads 'BETTING CLOSES IN 00:00' while the section @16,835 288x128 below reads 'BETS CLOSED · Bets closed at 06:42:00 PM — the result is locked…'. Code: round-countdown.tsx:295-299 only swaps the caption when pastClose (the ROUND close, not the lock), and updown/[roundId]/page.tsx:186 builds countLabel once on the server; round-action-panel.tsx:88-110 flips to the locked view client-side at the lock instant.

### S05-02 · 🟠 high · 🆕 new · number · unit: NEW: U32 Up & Down figures, time and state truth
**UpDownCard header price and move on a RESOLVED card** — `/updown`

A settled card keeps showing a ticking live price and a move against its open, and these contradict its own close ($76,434.69 +0.13% vs close $76,386.37 = +0.07%). A player reads two different results for one finished round.

*Evidence:* int-320-en.json / int-412-en.json card1 'Resolved · BTC': header '$76,434.69' '+0.13%' (15.5px green, trend arrow). Its own result block reads 'Up wins $76,333.31 → $76,386.37' and the footer 'Open $76,333.31'. Two minutes earlier (int-360-en) the same card read '$76,386.37 +0.07%', so the figure moves after settlement. Code: updown/page.tsx:275 passes livePrice={activeAsset.livePrice} and :279-283 movePct to every round whatever its state; updown-card.tsx:772-791 draws it with no state check.

### S05-updown-NUM-01 · 🟠 high · 🆕 new · number · unit: NEW: U33 Up & Down history page (phone fit + figure scope)
**History P&L strip: Net return / Rounds / Win rate** — `/updown/history`

The money figures change as the player pages. With 40 matched rounds, page 1 shows '40 rounds' in the bar, the tile shows 'Rounds 12 · 95 bets' (12 rounds from the page, 95 bets from the whole set), and Net return and Win rate cover only the 12 cards shown. The capped note (:391-395), 'the totals above cover these only', then points at the wrong subset.

*Evidence:* history/page.tsx:252-255 builds `rounds` from `matched.filter((m) => pagedIds.has(m.id))`, i.e. the current page only (PLAYER_PER_PAGE=12). :259-265 compute staked, returned, net, wins and winRate from that paged `rounds`. :379 prints `{rounds.length}` (≤12). :380 prints `{rows.length} {udBets}`, and :205 builds `rows` from ALL matched rounds. The query bar at :313 prints `matched.length` ('40 rounds'). The comment at :203-204 says the figures 'describe the whole filtered view rather than the twelve rounds on screen'.

### S05-03 · 🟡 medium · 🆕 new · number · unit: U10
**Duration chip '5 MIN' inside the clamped card title** — `/updown`

At 320 the round length the player is betting on (5 min vs 3/10/15…) is removed from every card. The 2-line clamp ruling covers market-card question titles, not a time value that happens to share the line.

*Evidence:* int-320-en.json both cards: h3 box 100x36, chip '5 min' at y+51, i.e. outside the 36px clamp; board-320-en.json H3 @86,1138 100x36 clipped=true. Screenshots int-320-en-card0.png and card1.png show 'Bitcoin Up & Down…' with no duration anywhere on the card. At 360/412 the chip shows. Code: updown-card.tsx:747-751 puts <Chip> inside the -webkit-line-clamp:2 h3.

### S05-04 · 🟡 medium · ♻️ duplicate → D10 · number
**Target caption 'HIGHER OR LOWER THAN $76,386.37' (D10, new instance at 360)** — `/updown`

The open price the bet is compared against is ellipsised on a 360 phone too, the most common width, not only at 320.

*Evidence:* int-360-en.json card0: 'Higher or lower than $76,386.37' clipped, scrollWidth 229 > clientWidth 224. Screenshot shows 'HIGHER OR LOWER THAN $76,386.…'. Also clipped in board-360-en.json span.truncate @36,762 224x14. Fits at 412 (229 box). D10 was recorded at 320 only.

### S05-05 · 🟡 medium · 🆕 new · typography · unit: U3
**UpDownCard type census** — `/updown`

Ten sizes in one card, six of them off the ladder, and 9.5px is used for sentence-case footer text. This mix of near-identical sizes is a big part of why the card reads busy and 'chunky' at 550px.

*Evidence:* Per-card census (int-*.json): live/confirming card uses 10 sizes (9.5, 10, 10.5, 11, 11.5, 12.5, 13, 14.5, 15.5, 28); resolved card uses 10 (9.5, 10, 10.5, 11, 11.5, 13, 14, 14.5, 15.5, 28). Same in SW. Hand-typed sources in updown-card.tsx: :747 text-[14.5px] title, :775/:780 text-[15.5px] price, :786 text-[11px], :847/:851 text-[11.5px] stats, :875 text-[9.5px] pool split (not uppercase), :940/:949/:1004/:1008 text-[12.5px] targets and ×multiplier, :1016/:1022 text-[10px] notes, :1114 text-[14px], :1120 text-[10.5px], :1162 fontSize 10.5 (GO TO IT), :1188 text-[9.5px] sentence-case footer.

### S05-06 · 🟡 medium · ➕ extends → D7 · button · unit: U9
**Header Rules and History pills (icon-only on phones)** — `/updown`

Both header controls are 39px tall, below the 40px floor and the 44 phone preference, on top of having no accessible name (D7).

*Evidence:* board-360-en.json links: @215,124 47x39 href=/legal/rules/up-down text '' and @274,124 66x39 href=/updown/history text ''; the same 39px on SW, 320, 412, ?d=3 and ?d=60. Code: updown/page.tsx:44-45 HEADER_PILL 'px-3 py-2 text-caption' gives 39px; :102 and :110 labels are 'hidden sm:inline'. D7 covers the missing accessible name only.

### S05-08 · 🟡 medium · 🆕 new · copy · unit: NEW: U31 Up & Down board + round page phone fit
**Confirming-state card ('Reading the closing price…')** — `/updown`

One card says the same phrase three times, and the header status line grows to 2–3 lines, pushing the whole card down during the ~90s result wait.

*Evidence:* int-360-en.json card0: status line 'Reading the closing price… · BTC' 135x28 (2 lines), chip 'READING THE CLOSING PRICE…' 210x23, body 'Reading the closing price from the source…'. At 320 the status line is 100x42 (3 lines). SW: 'Tunasoma bei ya kufunga…' three times. Code: updown-card.tsx:764-769 (status word udSettlingTitle), :1084 (Chip udSettlingTitle), :1085 (udConfirmingBody).

### S05-10 · 🟡 medium · ♻️ duplicate → S05-updown-NUM-05 · number
**Lock time in the locked panel ('Bets closed at 06:42:00 PM')** — `/updown/udr_539bc3ea681d57e1864d`

One page shows two clock grammars: 12-hour with AM/PM and no zone, and 24-hour with EAT. The lock time also follows the handset's zone and locale, not East Africa Time.

*Evidence:* round-320-en.json p @33,886 'Bets closed at 06:42:00 PM — the result is locked…', while the hero footer on the same page reads 'quoted 18:39:00 EAT' and the proof uses '18:44:00 EAT'. Code: round-action-panel.tsx:95-97 toLocaleTimeString(undefined, …); updown-card.tsx:222-227 formatClock with Intl.DateTimeFormat(undefined, …). Both use device locale and zone.

### S05-11 · 🟡 medium · 🆕 new · layout · unit: NEW: U31 Up & Down board + round page phone fit
**Rounds → Chart toggle (persisted per device)** — `/updown`

In chart mode the playable round card starts 1.3–1.6 screens down, and the choice sticks, so a returning player who once tapped Chart never sees a round on the first screen.

*Evidence:* After tapping Chart: first card moves from y=504 to 1017 at 360 EN (docH 2556→3069); 539→1052 at 320 (640 fold); 484→997 at 360 SW; 467→979 at 412 (915 fold). The chart adds a 'Chart range' rail 50, a 'Chart style' rail 50 and a 402px pane. board-viz.tsx:47-58 restores 'chart' from localStorage on every visit.

### S05-12 · 🟡 medium · 🆕 new · state · unit: U26
**Between-rounds empty state on a chain with no recent outcomes** — `/updown?asset=BTC&d=3, /updown?asset=BTC&d=60`

The one message that explains the board ('next round is being prepared') sits 1.25 screens down behind an auto-shown chart, so the first screen looks like a chart page with nothing to play.

*Evidence:* board-d3-360-en.json: no Rounds/Chart toggle; chart section @20,559 320x402; EmptyState 'Between rounds' @20,981 320x273, below the 780 fold. Same on d=60. Code: board-viz.tsx:62-63 shows the chart when cubes are null; updown/page.tsx:252-256 puts the EmptyState after BoardViz.

### S05-14 · 🟡 medium · 🆕 new · number · unit: NEW: U32 Up & Down figures, time and state truth
**Chart price formats and live price line** — `/updown (chart mode)`

Three spellings of one BTC price on one screen, plus two different 'current' prices, while the board uses the single usd() format.

*Evidence:* int-360-en-chart.png: axis '76200.00' and price tag '76386.37' (no separators, no $); OHLC legend 'O 76,417.86 … C 76,434.69' (separators, no $); tape and card '$76,386.37'. On the same screen the tag/tape price 76,386.37 (quoted 18:39:00) disagrees with the last candle close 76,434.69. Code: terminal-chart.tsx:286 priceFormat {type:'price', precision} with no grouping.

### S05-16 · 🟡 medium · 🆕 new · typography · unit: U10
**Round page title h1 span** — `/updown/udr_539bc3ea681d57e1864d`

The game name is cut mid-word on the page that names the round, and in Swahili half the product name ('Chini') is lost at the common 360 width. The market detail title is ruled unclamped at 28px; this sibling detail page does the opposite.

*Evidence:* round-320-en__s00.png 'Bitcoin Up & D…'; round-360-sw__s00.png 'Bitcoin Juu na Ch…'. Code: [roundId]/page.tsx:366 'overflow-hidden text-ellipsis whitespace-nowrap font-display text-title-lg'.

### S05-17 · 🟡 medium · 🆕 new · layout · unit: NEW: U31 Up & Down board + round page phone fit
**Price hero OPEN / UP ≥ / DOWN ≤ block** — `/updown/udr_539bc3ea681d57e1864d`

On phones the right-aligned block wraps under the price but stays right-aligned inside its own narrow box, so the open price and the two winning boundaries line up with nothing.

*Evidence:* round-360-en.json: OPEN value @33,438 in a 134px box; 'UP ≥ $76,350.03' span starts at x=49 and 'DOWN ≤ $76,349.99' at x=33. Screenshots show 'OPEN' floating mid-card and a ragged left edge (same in SW and the resolved hero). Code: price-hero.tsx:136 flexWrap:'wrap' plus :155 'text-right' on a content-width block.

### S05-18 · 🟡 medium · 🆕 new · a11y · unit: NEW: U34 Up & Down accessibility (roles, names, headings)
**Last-rounds outcome cubes** — `/updown`

aria-label on a generic span is not announced, so screen-reader users get nothing from the strip. The 9px caption is below every rung (9.5/8.5 are for uppercase microlabels only).

*Evidence:* 12 cubes, each an 18×18 <span aria-label='Up'/'Down'> with no role (outcome-cubes.tsx:47-53). The caption 'oldest → newest' is text-[9px] (outcome-cubes.tsx:58; measured fs9 @20,470).

### S05-updown-A11Y-01 · 🟡 medium · 🆕 new · a11y · unit: NEW: U34 Up & Down accessibility (roles, names, headings)
**UpDownCard <article role="link" tabIndex=0> containing buttons, radios and an input** — `/updown`

Interactive controls are nested inside an element exposed as a link. A screen reader announces the whole card by its aria-label only (price, timer and pool are not in the name) and axe reports nested-interactive. The keyboard focus order is card → inner controls with no grouping, and UD-16's click-swallowing wrapper exists only because of this structure.

*Evidence:* updown-card.tsx:723-740 `<article role="link" tabIndex={0} aria-label={…} onClick={router.push}>` wraps UpDownStakeControls (:979-983: radio buttons, Custom radio, Input, Up/Down buttons, Deposit link), the guest Up/Down buttons (:1001-1010) and the handover Button (:1157).

### S05-updown-A11Y-02 · 🟡 medium · ♻️ duplicate → S05-18 · a11y
**OutcomeCubes (last-rounds strip)** — `/updown`

aria-label on a generic span is ignored by assistive technology (ARIA prohibits naming role=generic), so screen-reader users hear only 'oldest → newest' and none of the outcomes. Outcomes are conveyed by colour and a 9px arrow only.

*Evidence:* outcome-cubes.tsx:48-55 `<span aria-label={up/down/void} className="inline-flex …">` with no role, containing aria-hidden glyph svgs (glyphs.tsx:71). :58 caption 'oldest → newest'.

### S05-updown-BTN-01 · 🟡 medium · ♻️ duplicate → S05-06 · button
**Board header Rules / History pills (icon-only on phones)** — `/updown`

Both header links render 39px tall on phones, under the 40px floor and 5px under the 44 phone preference. They are also icon-only with no accessible name (known D7/U9). The two pills also differ in composition: one carries a chevron, the other does not.

*Evidence:* page.tsx:44-45 HEADER_PILL `inline-flex … px-3 py-2 … border`. On this scale py-2=12px and px-3=16px. :102 and :110 labels are `hidden sm:inline`, so below sm the only flex items are svgs: I.scrollText s=13 (glyphs.tsx:71 width/height=s), I.portfolio 13 and I.chevronRight 11. Height = 12+13+12+2 border = 39px. Widths are 47px and 66px.

### S05-updown-BTN-03 · 🟡 medium · 🆕 new · layout · unit: U10
**Signed-in compact stake row (Stake · 1K 2K 5K 10K · + Custom) at 360** — `/updown`

The Custom chip is clipped by about 7px at the card's right edge at 360 in EN and SW (the most common budget-Android width), and by about 45px at 320. The comment at :187-188 claims the row fits one line at 360. The detail size on the round page (px-2.5, gap 8, 11.5px) needs about 314px against a 294px panel and overflows unclipped.

*Evidence:* updown-stake-controls.tsx:189: the row is `flex items-center gap-1` with no wrap, and every chip is `shrink-0 whitespace-nowrap` (:166) with `px-2` (=12px here) and a 1px border. With quickStakes(1000,1_000_000)=[1K,2K,5K,10K]: - label 'STAKE' 10px +0.14em = 37 + mr-0.5 2 - 1K/2K/5K at 38.6 each, 10K at 44.9 - Custom = 10 + 2 + 'Custom' 37.8 + 24 + 2 = 75.8 - 5 gaps × 4 = 20 Total ≈ 295px. The card inner width at 360 is 320 − 30 padding − 2 border = 288. `.mcardp { overflow:hidden }` (globals.css:3861). Computed; the guest probe cannot see this, so verify signed in.

### S05-updown-BTN-04 · 🟡 medium · 🆕 new · button · unit: U24
**Round page gold Confirm with 7-figure stake** — `/updown/[roundId]?side=DOWN`

At the platform stake ceiling (1,000,000) in Swahili the money-commit label overflows its button, so the stake figure's tail touches or crosses the edge. This is a clipped money figure on the one commit control.

*Evidence:* round-stake-panel.tsx:250-268 `btn btn-gold btn-lg w-full` (15px, padding 0 20, `.btn` white-space nowrap at globals.css:1061) contains `{udConfirm} {pickWord}` plus a mono span `formatTzs(bet.stake)`. SW 'Thibitisha Chini' ≈132px + gap 8 + 'TZS 1,000,000' mono 15px ≈117px + padding 40 + border 2 ≈ 299px, against a panel inner width of 328 − 32 − 2 = 294px at 360. Computed; verify.

### S05-updown-CARD-01 · 🟡 medium · ➕ extends → U3 · container · unit: U3
**.mcardp flex gap stacked on child margins** — `/updown`

The flex gap is added on top of every margin, so the real spacing between blocks is 26 / 26 / 22 / 20 / 22 / 26+10px rather than the 16/12/10 the classes say. Card height is inflated by about 60px and the rhythm sits on no rung. This is invisible from the class strings.

*Evidence:* globals.css:3855 `.mcardp { display:flex; flex-direction:column; gap: 10px; padding: 14px 15px 13px }`. updown-card.tsx children also carry margins: :796 `mt-3` (16), :846 `mt-3`, :873 `mt-2` (12), :916 `mt-2.5` (10), :958 `paddingTop: 12`, :1188 `mt-3 pt-2.5`.

### S05-updown-CARD-02 · 🟡 medium · ❌ refuted → S05-03 · card
**Card h3 2-line clamp hides the duration chip** — `/updown`

In Swahili the round length (5/15/60 min), the one fact that tells two BTC cards apart, is removed by the clamp. The deliberate 2-line-clamp ruling covers market question titles, not a clamp that deletes an identity chip.

*Evidence:* updown-card.tsx:747-750 h3 `text-[14.5px]` with WebkitLineClamp 2 and the `<Chip>{durationMinutes} {udMin}</Chip>` INSIDE the clamped h3. At 360 the card inner width is 288. Subtracting AssetMark 40, gap-2.5 10×2 and the shrink-0 price column (a 6-figure BTC '$100,512.44' at 15.5px mono ≈102 + icon 11 + gap 4) leaves about 110px for the title. SW 'Bitcoin Juu na Chini' breaks as 'Bitcoin Juu' / 'na Chini'. The '5 DAKIKA' chip (≈75px) cannot join line 2 (67+6+75>110), falls to line 3 and is clamped away. Computed; verify.

### S05-updown-CONT-01 · 🟡 medium · ➕ extends → D10 · layout · unit: U10
**Card grid tracks wider than the content box at 320** — `/updown, /updown/history`

At the 320 browser floor both grids force a single track wider than the container: board cards overflow by 20px and history cards by 40px, clipping their right edges. This is a likely root cause behind known D10 (strike price clipped at 320) and D11 ('Down × 1.00' touching the edge at 320).

*Evidence:* page.tsx:261-262 `grid … style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}` inside `px-4` (20px each side, page.tsx:86), so the content box at 320 is 280 against a 300px track. history/page.tsx:399 `minmax(320px, 1fr)` inside px-4 is 320 wide at 360 (exact) and 280 at 320, against a 320px track.

### S05-updown-COPY-01 · 🟡 medium · 🆕 new · copy · unit: NEW: U32 Up & Down figures, time and state truth
**Result panel button 'Open in Positions'** — `/updown/[roundId]`

The label names the long-form Positions portfolio, which the E-101 fix deliberately stopped linking to. The player taps 'Positions' and lands on 'Your Up & Down': one word pressed, another arrived at.

*Evidence:* [roundId]/page.tsx:678 `<Link href={positionListHref("UPDOWN", …)} …>{t.market.udOpenInPositions}</Link>`. The comment at :668-677 says it now goes to the Up & Down history. The dictionary still reads 'Open in Positions' (i18n-dict.ts:1013), SW 'Fungua kwenye Nafasi', ZH '在持仓中打开'. The destination page's title is 'Your Up & Down' (udHistoryTitle).

### S05-updown-COPY-02 · 🟡 medium · 🆕 new · copy · unit: NEW: U33 Up & Down history page (phone fit + figure scope)
**History empty state: title/body/exits for filtered misses** — `/updown/history`

A player who searched 'gold' or tapped the 'In play' lens is told no rounds settled 'on that day', a day they never chose. The body repeats the page subtitle instead of the cause. Exits like 'Asset (3)' do not say they CLEAR the asset filter, and 'All (9)' vs 'All time (12)' are near-identical labels for different axes. The code comment at :335-338 ('FIVE CAUSES, NEVER ONE MESSAGE') is not what ships.

*Evidence:* history/page.tsx:341-347: title is `udNoRoundsThatDay` ('No rounds settled on that day.') for search-miss, window-miss AND every other non-'no-rows' cause (lens, asset, duration), and body is `udHistoryBody` (the page description). :198-201 EXIT_LABEL maps asset→'Asset', dur→'Duration', when→'All time', q→'Clear search', tab→'All', rendered as e.g. 'Asset (3)'.

### S05-updown-EV-D10 · 🟡 medium · ♻️ duplicate → D10 · number
**Card 'Higher or lower than $open' header truncates the open price** — `/updown`

New evidence for known D10/U10: the strike/open price is ellipsised at 360 in English for BTC/ETH-scale prices, not only at 320. Money/price text is clipped with an ellipsis.

*Evidence:* updown-card.tsx:920-924: a `truncate` span renders `{udWinTarget} {priceText.open}` in micro 10px mono uppercase eyebrow (0.14em → 7.4px/char), beside a shrink-0 `± {margin}`. EN 'HIGHER OR LOWER THAN $63,719.98' is 31ch=229px. Available width is 288 − '± $12.62' (59) − gap-2 12 = 217px, and 224px even at a $0.01 margin. Computed; verify. SW 'JUU AU CHINI YA …' (26ch=192) fits.

### S05-updown-LINK-01 · 🟡 medium · 🆕 new · link · unit: U20
**Sub-floor inline links: 'See the full result', 'Deposit'** — `/updown/[roundId], /updown`

Two navigation targets players need at a money moment (the full proof of the result they just won, and the route to fund a stake) are 14–18px tall. The Deposit link on the card sits inside the card's role=link, so a near-miss navigates to the round page instead.

*Evidence:* [roundId]/page.tsx:352-356: `<Link … className="inline-flex items-center gap-0.5 font-mono text-micro …">` with no padding or min-height, so the target is about 14px tall (micro line-height 14). updown-stake-controls.tsx:281-287: 'Deposit' is an inline underlined Link inside a `text-[10px]` paragraph (card), about 14px tall. round-stake-panel.tsx:277-279: the same link inside text-body-sm (about 18px).

### S05-updown-NUM-02 · 🟡 medium · 🆕 new · number · unit: NEW: U33 Up & Down history page (phone fit + figure scope)
**History Net return tile sub-line 'TZS staked → TZS returned'** — `/updown/history`

The line cannot wrap, so it spills past the tile's right border into the Rounds tile for any ordinary history (4px over at 4-figure totals, 16px at 5-figure, 52px at 7-figure). The 19px net figure at :371 is not nowrap, so '+TZS 1,250,000' breaks between the unit and the number.

*Evidence:* history/page.tsx:368 `grid grid-cols-2 sm:grid-cols-3 gap-3` and :369 tile `rounded-xl border p-3.5`. At 360 the content box is 320 (px-4=20), so each tile is (320-16)/2=152 and the inner width 152-28-2=122px. :375 `amount text-micro` renders `{formatTzs(staked)} → {formatTzs(returned)}`. `.amount.amount { white-space: nowrap; letter-spacing: 0 }` (globals.css:945) at 10px mono ≈ 6px/char. 'TZS 5,000 → TZS 8,000' is 21ch=126px; 'TZS 25,000 → TZS 50,000' is 23ch=138px; a 7-figure pair is 29ch=174px.

### S05-updown-NUM-03 · 🟡 medium · 🆕 new · number · unit: NEW: U32 Up & Down figures, time and state truth
**USD figures printed without thousands separators** — `/updown/[roundId], bet receipt modal`

The bet receipt shows 'Open price $63719.98' while the card footer, hero and proof show '$63,719.98'. A move of $1,234.56 prints '$1234.56' under a hero that prints '$64,954.54'. There are two spellings for one price class on consecutive screens of a money flow.

*Evidence:* [roundId]/page.tsx:479 aboveBelow = `${udAboveOpenBy} $${Math.abs(move).toFixed(dec)}`. :751 proof move `${sgn(pMove)}$${Math.abs(pMove).toFixed(dec)}`. updown-bet-receipt-modal.tsx:96 open price `$${info.openPrice.toFixed(info.decimals)}`. Every other price uses `usd()` (usd-price.ts:22-30, en-US grouping).

### S05-updown-NUM-05 · 🟡 medium · 🆕 new · number · unit: NEW: U32 Up & Down figures, time and state truth
**Five time formats across Up & Down** — `/updown, /updown/[roundId], /updown/history`

One card says 'Bets closed at 9:15:00 PM' (device en-US, 12h, local zone) directly above a footer 'quoted 21:14:58 EAT'. The receipt then shows '21:15' with no zone. Device locale, not the app locale (EN/SW/ZH), decides 12h/24h, and a phone set to another zone disagrees with the EAT stamps on the same card. '02/09' is also ambiguous for day/month without a year.

*Evidence:* - Card footer quote: fmtEAT 'HH:MM:SS EAT' (updown-source-label.ts:41-47). - Card lock reason: formatClock `Intl.DateTimeFormat(undefined, {hour, minute, second})`, device locale with no zone (updown-card.tsx:221-227). - Round locked panel: `toLocaleTimeString(undefined, …)`, no zone (round-action-panel.tsx:95-97). - Receipt 'Bets close'/'Result due': device-locale HH:MM with no seconds and no zone (updown-bet-receipt-modal.tsx:38-43). - History rows: en-GB 'DD/MM, HH:MM EAT' with no year (history/page.tsx:51-58).

### S05-updown-STATE-01 · 🟡 medium · 🆕 new · button · unit: NEW: U31 Up & Down board + round page phone fit
**Card 'Awaiting result' fallback styled as a button** — `/updown`

A 48px ghost-button shape that does nothing: it reads as a tappable control, taps fall through to the card link, and 0.85 opacity lowers contrast. The locked and confirming states use a calm inset panel with a pending Chip for the same kind of wait, so this is two designs for one state.

*Evidence:* updown-card.tsx:1126-1128 `<div className="btn btn-ghost btn-lg pointer-events-none w-full justify-center opacity-85">{udAwaitingResult}</div>`. It is reached when the round is neither bettable, locked, confirming, refunded nor resolved (the idle/'Selections closed' phase).

### S05-updown-STATE-02 · 🟡 medium · ➕ extends → D26 · state · unit: U25
**Up & Down loading skeletons vs phone layout** — `/updown, /updown/history, /updown/[roundId]`

New instances of known D26 (U25): on a phone every Up & Down route shifts content when real data swaps in (filter rows collapse, strip appears, cards grow, bar inserts above the list).

*Evidence:* - updown/loading.tsx:20-29 draws an asset-tab ghost row (h-[44px]) and a duration ghost row (`h-7` = 40px), but below sm the board renders ONE 48px sheet trigger (updown-board-tabs.tsx:242-294). - It omits the header pills and the BoardViz strip (board-viz.tsx: eyebrow + 44px toggle + 18px cubes). - Card ghost `height: 360` (:33) vs a real open card that is much taller (header + pod + stats + split + targets + 48px buttons + 2 notes + footer + 10px gaps). - history/loading.tsx:6-15 omits the SearchBox (44 + 17px echo row) and the sticky HistoryBar (two rows ≈ 110px). - [roundId]/loading.tsx:39 uses `xl:[grid-template-columns…]` while the page uses `lg:` (page.tsx:465), a desktop 1024–1279 jump.

### S05-updown-TB-01 · 🟡 medium · 🆕 new · textbox · unit: U22
**Custom stake field on the board card** — `/updown`

The money text box on the surface where most bets are placed is 40px tall (rule 44), with a 13px prefix beside a 16px value. The keyboard shows a generic Return key. A screen reader is not told the allowed range or why the field is invalid.

*Evidence:* updown-stake-controls.tsx:222-236 `<Input … size={compact ? "sm" : "md"} inputMode="numeric" aria-label={udCustomAmount} aria-invalid error placeholder="0" />`. input.tsx:67 sets sm to `h-[var(--h-control-sm)]` = 40px and :73 the prefix to `text-[13px]`. globals.css:1789-1795 forces the input value to 16px !important at ≤768, so the 'TZS' prefix stays 13px. There is no enterKeyHint. The hint/error line at :237-239 is not linked by aria-describedby. round-stake-panel.tsx:230-239 (md, 44px) also lacks enterKeyHint/aria-describedby.

### S05-updown-TB-02 · 🟡 medium · 🆕 new · textbox · unit: U9
**History SearchBox clear button** — `/updown/history`

The × clear control is 38×38, under the 40 floor. The search grammar (quotes, -exclude, field:) has no discoverable help on phones.

*Evidence:* search-box.tsx:159-168 clear `button.clear-btn`. globals.css:1746-1750 `.search-box .clear-btn { width: 38px; height: 38px; }`. search-help.tsx:76 the help trigger is `hidden sm:block`, so phones get no search-grammar help.

### S05-updown-TY-01 · 🟡 medium · ♻️ duplicate → S05-05 · typography
**UpDownCard type census** — `/updown`

About 10 distinct sizes (9.5, 10, 10.5, 11, 11.5, 12.5, 14.5, 15, 15.5, 28) inside one card. Six of them (9.5 mixed-case, 10.5, 11.5, 12.5, 14.5, 15.5) are hand-typed values that sit on neither the Tailwind ladder nor the CSS token ladder. This is the densest card in the product and the one budget-phone players bet from.

*Evidence:* updown-card.tsx sizes rendered on one open card: - :747 h3 `text-[14.5px]` - :750 Chip md 10.5px (chip.tsx:172) - :752 `text-micro` 10 - :775/780 `text-[15.5px]` price - :786 `text-[11px]` move - :803 eyebrow micro 10 - :421 digits `fontSize: 28` - :847/851 `text-[11.5px]` stats - :875 `text-[9.5px]` split - :940/949 `text-[12.5px]` targets - :1004/1009 and updown-stake-controls.tsx:259 `text-[12.5px]` × - .btn-lg 15px (globals.css:1090) - updown-stake-controls.tsx:166 `text-[10.5px]` chips - :1016/1022 and stake-controls :291/324 `text-[10px]` notes - :1188 `text-[9.5px]` footer

### S05-updown-TY-02 · 🟡 medium · 🆕 new · typography · unit: NEW: U31 Up & Down board + round page phone fit
**9–9.5px mixed-case text and 10px prose** — `/updown, /updown/[roundId]`

The integrity line (source + quote time) and the payout disclaimer, both compliance/trust copy, sit below the reading floor. 9.5 is used for mixed-case text, which the ladder reserves for uppercase mono microlabels, and 9px is on no ladder. The same disclaimer renders at two sizes on the round page depending on whether a side was carried in.

*Evidence:* Mixed-case text at 9–9.5px: - updown-card.tsx:1188 footer `text-[9.5px]` 'Live crypto market · quoted 21:14:58 EAT' - updown-card.tsx:875 `text-[9.5px]` 'Up 62%' - [roundId]/page.tsx:521 the same split - price-hero.tsx:252 `text-[9.5px]` 'Above open by $4.45' + source - price-hero.tsx:150 awaitingRead `fontSize: 9` - outcome-cubes.tsx:58 `text-[9px]` 'oldest → newest' 10px prose: - updown-stake-controls.tsx:277/291/314/324 and updown-card.tsx:1016/1022 (estimate note and empty-side sentence, 2–3 lines) - round-stake-panel.tsx:291 `text-[10px]` udEstimateNote, while UpDownStakeControls 'detail' renders the SAME sentence at text-body-sm (:324) on the same route - [roundId]/page.tsx:768-772 the rule sentence (SW 180 chars) at 10.5px mono

### S05-updown-TY-03 · 🟡 medium · ♻️ duplicate → S05-16 · typography
**Round page H1 'Asset Up & Down' ellipsised** — `/updown/[roundId]`

The page's H1, the only statement of which game and asset this round is, is ellipsised on phones. The duration Chip also sits inside the h1, so the accessible heading reads 'Bitcoin Up & Down 5 MIN'.

*Evidence:* [roundId]/page.tsx:366 `<span className="overflow-hidden text-ellipsis whitespace-nowrap font-display text-title-lg …">{name} {udTitle}</span>` inside `h1.flex.flex-wrap`, beside AssetMark 44 + gap-3 (16). Available width at 360 is 328 − 60 = 268px. SW 'Bitcoin Juu na Chini' (20ch at 28px ≈ 319px) truncates; EN 'Ethereum Up & Down' (18ch ≈ 287px) truncates too. Computed; verify.

### S05-07 · ⚪ low · ➕ extends → D11 · button · unit: U10
**Guest 'Down × 1.00' button (D11, new instance at 360)** — `/updown`

D11 is not limited to 320: at 360 EN the multiplier sits almost on the button border.

*Evidence:* board-360-en.json: button.btn-no.btn-lg @186,852 138x48, padding 20/20; its '1.00' span ends at x=318, 6px inside the 324 right edge, so the label runs 14px into the padding. At 320 (board-320-en__s01.png) the ↘ glyph also touches the left border. 412 has a 19px gap.

### S05-09 · ⚪ low · ⚖️ intentional · state
**Handover 'NEXT MATCH LIVE —:—' pod plus duplicate sentence (card and round page)** — `/updown, /updown/udr_5773ed54d9ef68f3ad4b`

A 64px clock box that counts nothing, followed by a second block saying the same thing. On the round page that is two stacked bordered boxes for one message.

*Evidence:* Card (int-360-en-card1.png): pod 288x64 'NEXT MATCH LIVE' over 28px '—:—', then 'The next match is already under way.' + GO TO IT. Round page (roundB1-360-en.json): pod div 206x48 'NEXT MATCH LIVE —:—' and, separately, an inset bar 328x89 'The next match is already under way. GO TO IT'. Code: updown-card.tsx:814, 831-834, 1136-1172; [roundId]/page.tsx:378-448 (pod + UpDownHandover).

### S05-13 · ⚪ low · 🆕 new · filter · unit: NEW: U31 Up & Down board + round page phone fit
**Chart range rail (15M…7D) at 320** — `/updown`

A filter option is hidden in a horizontal scroller with nothing telling the player there is more.

*Evidence:* int-320-en.json vizAfter 'Chart range' group 280x50, scrollWidth 318 > clientWidth 278; '7D' visible=false. The screenshot ends at '24H' with no edge fade or cue. globals.css:2891-2894: .pchart-ranges overflow-x:auto with 'NO MASK'.

### S05-15 · ⚪ low · 🆕 new · copy · unit: NEW: U32 Up & Down figures, time and state truth
**Settlement proof round identifier** — `/updown/udr_5773ed54d9ef68f3ad4b`

The auditable record prints the round id in a case it doesn't have. A player quoting it in an objection or support chat gives a string that doesn't match the URL or back office.

*Evidence:* roundB1-360-en__s01.png: 'ROUND UDR_5773ED54D9EF68F3AD4B · AUDITABLE RECORD'. The real id (URL) is udr_5773ed54d9ef68f3ad4b. Code: [roundId]/page.tsx:716 puts {round.roundId} inside 'uppercase eyebrow'.

### S05-19 · ⚪ low · 🆕 new · layout · unit: U18
**/updown page gutter** — `/updown`

The board uses a 20px gutter and its own round page and footer use 16, so left edges jump between the board, the page footer and the round page, and 8px of width is lost on the card.

*Evidence:* Board tape, trigger and cards at x=20 (w=320 at 360); round page sections at x=16 (w=328); footer at x=16. Code: updown/page.tsx:68 and :86 'px-4', which is 20px on this scale.

### S05-20 · ⚪ low · 🆕 new · container · unit: NEW: U31 Up & Down board + round page phone fit
**Settlement proof section and its three inset tiles** — `/updown/udr_5773ed54d9ef68f3ad4b`

Box-in-box at off-rung padding (18, 14, 13) with off-ladder type, making the proof 775px (1 screen) tall at 360.

*Evidence:* roundB1-360-en.json: section 328x775, padding 16/18/18/18; three nested bordered tiles, padding 12/14/13/14, radius 12; figures 19px, dl rows 10.5px. Code: [roundId]/page.tsx:713, :729, :743, :731 text-[19px], :732/:749 text-[10.5px].

### S05-21 · ⚪ low · ♻️ duplicate → S05-updown-NUM-04 · number
**Move percentage precision on the resolved round page** — `/updown/udr_5773ed54d9ef68f3ad4b`

The same move is shown at two precisions on one page.

*Evidence:* roundB1-360-en.json: hero '−0.05%' (price-hero.tsx:144 toFixed(2)); proof dd 'Percent −0.051%' (page.tsx:753 toFixed(3)).

### S05-22 · ⚪ low · 🆕 new · copy · unit: NEW: U32 Up & Down figures, time and state truth
**Proof definition labels 'Source / quoted / Observed'** — `/updown/udr_5773ed54d9ef68f3ad4b`

Inconsistent label casing in the auditable record, caused by reusing a mid-sentence word as a label.

*Evidence:* roundB1-360-en__s01.png: the middle dt reads lowercase 'quoted' between 'Source' and 'Observed'. Code: [roundId]/page.tsx:735 reuses t.market.udQuoted, the inline word used in 'Live crypto market · quoted 18:44:00 EAT'.

### S05-23 · ⚪ low · ♻️ duplicate → U26 · container
**EmptyState 'Between rounds' box** — `/updown?asset=BTC&d=3`

48px padding on every side of a phone panel wraps the body into three short centred lines in a 273px box.

*Evidence:* board-d3-360-en.json: div.rounded-xl.border-dashed 320x273, padding 48/48/48/48, leaving 224px for text. Code: components/ui/empty-state.tsx:69 'px-8 py-8' (=48px on this scale).

### S05-24 · ⚪ low · 🆕 new · container · unit: U12
**Up & Down filters sheet panel** — `/updown (sheet open)`

Sheet side padding 20 and a 24px radius are off the phone rungs; everything else in the sheet is on-rule.

*Evidence:* int-*.json PANEL: padding 12/20/16/20, radius 24, at every viewport. Close 48x48, Done btn-md 44, pills 44 with only the selected pill outlined: those are correct. Escape closed the sheet, focus returned to the trigger, overflow was restored.

### S05-25 · ⚪ low · 🆕 new · filter · unit: NEW: U31 Up & Down board + round page phone fit
**Sheet 'Asset' group with a single choice** — `/updown (sheet open)`

A group with one pre-selected option is not a choice; it takes 70px of the sheet and implies there are alternatives.

*Evidence:* int-360-en.json: the ASSET group holds one pill 'Bitcoin' (on, aria-current=page); SW group key 'BIDHAA' with one pill too.

### S05-26 · ⚪ low · 🆕 new · copy · unit: NEW: U32 Up & Down figures, time and state truth
**Chart range labels in Swahili** — `/updown (chart mode)`

English unit abbreviations in SW, and two spellings of the same durations on one screen.

*Evidence:* int-360-sw-chart.png: '15M 30M 1H 6H 12H 24H 7D', while the sheet on the same board lists '15 dakika / 30 dakika / 60 dakika'. Code: updown-chart-lab.tsx:29 hard-coded HISTORY_RANGES used as labels.

### S05-27 · ⚪ low · 🆕 new · layout · unit: U10
**Resolved result block 'Up wins · open → close'** — `/updown`

The outcome word breaks ('Up / wins') and the price range splits at the arrow, so the result reads as scattered fragments.

*Evidence:* int-320-en.json card1: 'Up wins' 83x42 (2 lines), range '$76,333.31 → $76,386.37' 145x32 with the arrow left at the end of line 1. int-360-sw.json: 'Juu imeshinda' 119x42, range 129x32. Code: updown-card.tsx:1113-1123 (justify-between row with no nowrap).

### S05-28 · ⚪ low · 🆕 new · a11y · unit: NEW: U34 Up & Down accessibility (roles, names, headings)
**Heading structure on board and round page** — `/updown, /updown/[roundId]`

Skipped heading level on the board, and no navigable headings for the round page's main regions.

*Evidence:* board-360-en.json headings: H1 'Up & Down' then H3 per card, no H2. round-360-en.json and roundB1: a single H1; Pool, Settlement proof and Your result are <section aria-label> with <p> eyebrows.

### S05-29 · ⚪ low · 🆕 new · copy · unit: NEW: U32 Up & Down figures, time and state truth
**Guest sign-in box on the round page** — `/updown/udr_539bc3ea681d57e1864d`

A bare money range doesn't say it is the stake limit, and the panel repeats the board subtitle instead of saying why to sign in.

*Evidence:* round-360-en.json p @33,980 'TZS 1,000 – TZS 1,000,000' at 10px with no label. The box opens with the board tagline 'Will the price be higher or lower when the clock runs out?' (round-stake-panel.tsx:72, :76).

### S05-30 · ⚪ low · 🆕 new · link · unit: U9
**History pill for signed-out visitors** — `/updown → /updown/history`

A guest taps an unlabeled briefcase and lands on a generic 'Welcome back' form with no reason given.

*Evidence:* The board header shows the icon-only /updown/history pill to guests; history-360-en.json lands on /auth/login?next=%2Fupdown%2Fhistory with H1 'Welcome back' and no mention of Up & Down history (history/page.tsx:85 redirect).

### S05-31 · ⚪ low · 🆕 new · card · unit: U3
**UpDownCard shell padding and nested boxes** — `/updown`

Padding is off the 16 rung, and up to three bordered boxes sit inside the bordered card, which adds to the 550px/468px heights.

*Evidence:* board-360-en.json: card padding 14/15/13/15 (globals.css:3855). Inside it: bordered countdown pod radius 16, padding 10/16 (updown-card.tsx:796); two bordered target tiles radius 12, padding 8/10 (:935, :944); bordered action block radius 16, padding 14 (:1036, :1083, :1099); filled result block radius 16 (:1113).

### S05-32 · ⚪ low · 🆕 new · layout · unit: NEW: U31 Up & Down board + round page phone fit
**Countdown pod: round page vs card** — `/updown/[roundId]`

Two designs for the same countdown job, and the round-page pod's width changes with the caption, so its right edge jumps between phases and languages.

*Evidence:* Round page pod: inline caption plus digits, hug width (257px EN, 301px SW, 198px 'Result in'), radius 12, 48 tall. Card pod: caption stacked over digits, full width 288, radius 16, 64 tall. Two widths on one page (pod 257 vs panels 328).

### S05-33 · ⚪ low · 🆕 new · typography · unit: NEW: U32 Up & Down figures, time and state truth
**'Source · quoted' receipt line: chart vs card** — `/updown (chart mode), /updown?asset=BTC&d=3`

One receipt line in two type treatments on the same board, and the time zone is orphaned from its time.

*Evidence:* Chart footer: 13px centred, 286x36, wrapping 'quoted 18:45:00' / 'EAT' so the zone sits alone on line 2 (board-d3-360-en__s01.png, int-360-en-chart-2.png). The card footer shows the same receipt at 9.5px, left-aligned.

### S05-updown-A11Y-03 · ⚪ low · 🆕 new · a11y · unit: NEW: U34 Up & Down accessibility (roles, names, headings)
**Stake radiogroups, heading order, side-only arrows** — `/updown, /updown/[roundId], /updown/history`

The radio pattern is announced but does not behave as one. The heading outline skips levels and the round page has no navigable sections. The side of each bet is announced as 'up arrow' (or not at all) instead of 'Up'. The hero name is read twice.

*Evidence:* - updown-stake-controls.tsx:189-214 and round-stake-panel.tsx:180-226: `role="radiogroup"` of `<button role="radio">`, each a separate tab stop with no arrow-key roving. 'Custom' is a radio that opens a field. - Board headings: PageHeader h1 → card h3 (updown-card.tsx:747) with no h2. - Round page: h1, then sections named only by aria-label (:487, :576, :713) with no headings. - History bet chips `{b.side === "UP" ? "↑" : "↓"} {formatTzs(b.stake)}` (history/page.tsx:474-476; [roundId]/page.tsx:630-632): the side is given only by arrow and colour. - PriceHero section and svg share the same aria-label (price-hero.tsx:133, :187).

### S05-updown-BTN-02 · ⚪ low · 🆕 new · button · unit: NEW: U31 Up & Down board + round page phone fit
**Quick-stake preset chips: board card vs round page** — `/updown/[roundId]`

There are two compositions for one job (choosing a stake). The round-page version outlines every chip, which contradicts the one filter/selection language (only the selected pill is outlined), and drops the money control to 40px while its card twin is 44 by an explicit DA-3 ruling ('money controls are never the exception').

*Evidence:* Board card (updown-stake-controls.tsx:165-172): `rounded-md` (8px), `min-h-[44px]`, border transparent when unselected and `--border-strong` when selected. Round page locked side (round-stake-panel.tsx:184-203): `minHeight: 40`, `borderRadius: var(--r-pill)`, border `var(--border)` on every chip and `--brand-500` when selected, `flex: 1`, 11px. The Custom toggle is `+ Custom` text on the page (:224) vs an I.plus glyph on the card (:213).

### S05-updown-BTN-05 · ⚪ low · 🆕 new · button · unit: NEW: U31 Up & Down board + round page phone fit
**Handover 'Go to it' action (card vs round page)** — `/updown, /updown/[roundId]`

The comment says 'two surfaces offering one action must not offer it in two shapes', but one copy has a chevron and the other does not. Both override the btn-sm label to an off-ladder 10.5px uppercase mono, so a 40px button carries a 10.5px label.

*Evidence:* updown-card.tsx:1157-1170 `<Button variant="ghost" size="sm" trailing={<I.chevronRight s={10}/>} className="font-mono uppercase tracking-[0.08em]" style={{ color: brand-300, fontSize: 10.5 }}>`. updown-handover.tsx:230-236 `<a className="btn btn-ghost btn-sm … font-mono uppercase" style={{ color, fontSize: 10.5 }}>` with no chevron. `.btn-sm` is 13px (globals.css:1088).

### S05-updown-CARD-03 · ⚪ low · 🆕 new · card · unit: NEW: U31 Up & Down board + round page phone fit
**Locked-state payouts: card vs round page** — `/updown, /updown/[roundId]`

The same locked state and the same two money figures are drawn two ways (glyph, size, wording) one tap apart. The comments assert parity that the code does not have.

*Evidence:* updown-card.tsx:1039 Chip pending WITH an I.lock glyph. :1066-1077 payouts `amount text-body-sm` (13), value only. round-action-panel.tsx:107 Chip pending WITHOUT the lock glyph. :138-149 payouts `amount text-body` (14) prefixed by udYouGet ('you get TZS …', with the word set in mono via .amount). Comments at :1062-1065 and :132-137 each claim the two 'land on the same rung'.

### S05-updown-CONT-02 · ⚪ low · ♻️ duplicate → S05-19 · container
**Page gutters and block rhythm across the three routes** — `/updown, /updown/[roundId], /updown/history`

One game uses two phone gutters (20 on board/history, 16 on the round page), and block spacing uses 18/20/24 instead of the 24 rung. Moving board → round shifts the content column by 4px.

*Evidence:* page.tsx:86 and history/page.tsx:273 `px-4 py-6` = 20px gutter and 32px top. [roundId]/page.tsx:276 `px-3 pt-[22px] pb-14` = 16px gutter, 22px top (off-rung), 56px bottom. Block gaps: page.tsx:118/229, board-viz.tsx:64 `mt-4` (20); grid `gap-4` (20); [roundId]/page.tsx:323 `gap-[18px]`; history :368 `mt-5` (24), :399 `mt-4 gap-3` (20/16). FilterSheet panel side padding `--sp-5` 20 (globals.css:3347).

### S05-updown-CONT-03 · ⚪ low · ♻️ duplicate → S05-17 · layout
**PriceHero header block wraps and orphans right-aligned targets** — `/updown/[roundId]`

On every phone the Open/UP/DOWN block drops under the live price and stays right-aligned, leaving a void on the left of a 3-line column. The two numbers that decide the bet float away from the price they are compared with.

*Evidence:* price-hero.tsx:136 `display:flex; justify-content:space-between; flexWrap:wrap; gap:12`. Left block: '$63,719.98' at 26px mono (≈153) + gap 8 + '+0.02%' 12px (≈43) = 204. Right block `text-right` (:155): 'DOWN ≤ $63,707.24' at 13px mono (≈133; SW 'CHINI ≤ …' ≈140). 204+12+133 = 349 > the hero inner width at 360 (328−32 = 296), so it wraps at every phone width. Computed.

### S05-updown-CONT-04 · ⚪ low · ♻️ duplicate → S05-31 · container
**Box-in-box nesting on card and round page** — `/updown, /updown/[roundId], /updown/history`

Nested panels repeat the parent's 16px radius instead of stepping down to control 12, and the stacks read chunky (card 15 + panel 14 = 29px per side, 3 levels with the chip). The pager draws two borders on its top edge.

*Evidence:* - Card (.mcardp: border, radius 16, padding 15) contains the countdown pod `rounded-xl` 16px radius, bordered, px-3 py-2.5 (updown-card.tsx:796). - Card also contains the locked/confirming/refund panels `rounded-xl p-3.5`, bordered (:1036/1083/1099), which in turn contain a bordered Chip (depth 3). - Round result section (card) contains itemised rows `rounded-md border bg-bg-overlay/50` ([roundId]/page.tsx:627). - Proof card contains three bordered insets (:729/743). - History pagination wrapper `rounded-lg border` wraps Pagination's own `border-t` (history/page.tsx:502; pagination.tsx:175), giving a double rule.

### S05-updown-COPY-03 · ⚪ low · 🆕 new · copy · unit: NEW: U33 Up & Down history page (phone fit + figure scope)
**Hard-coded English and repeated sentences on history/proof** — `/updown/history, /updown/[roundId]`

Swahili and Chinese players see 'decided' in English under a translated tile. The page repeats its description as subtitle, empty-state body and footer.

*Evidence:* history/page.tsx:385 `{wins}/{decided} decided`: 'decided' is a literal English word in the Win-rate tile. [roundId]/page.tsx:791 `· staff only` is literal (staff-only view). history/page.tsx:280 (subtitle), :347 (empty body) and :516-519 (footer) render the same udHistoryBody sentence up to three times on one screen.

### S05-updown-COPY-04 · ⚪ low · 🆕 new · copy · unit: NEW: U32 Up & Down figures, time and state truth
**Pending helper says 'Live' while a bet is in flight** — `/updown, /updown/[roundId]`

During the first 2.5s of placement the helper line reads as a status of the round ('Live') rather than of the player's bet. It also reuses the pulsing live-dot, the round's 'live' signal, for a request state.

*Evidence:* updown-stake-controls.tsx:292-298: when `bet.pending && !pendingSlow` it renders `<span className="live-dot" /> {formatTzs(bet.stake)} · {t.market.udStreaming}` → 'TZS 1,000 · LIVE' / 'Mubashara' / '实时'. The key udPlacing ('Placing…') exists (i18n-dict.ts:982) and is used by the gold Confirm (round-stake-panel.tsx:261).

### S05-updown-COPY-05 · ⚪ low · ♻️ duplicate → S05-15 · copy
**Round id uppercased in the settlement proof** — `/updown/[roundId]`

The auditable record displays 'UDR_CD386BBAEAF63BE696F5'. A player quoting it to support, or matching it to the URL, sees a different string from the real id, on the one surface whose job is to be checkable evidence.

*Evidence:* [roundId]/page.tsx:716 `<span className="font-mono text-micro uppercase eyebrow …">{udRoundLabel} {round.roundId} · {udAuditableRecord}</span>`. Ids are lowercase (e.g. `udr_cd386bbaeaf63be696f5`).

### S05-updown-FILT-01 · ⚪ low · ♻️ duplicate → S05-13 · filter
**Chart range rail scroller has no edge cue** — `/updown (Chart view)`

At the 320 floor, or when padding grows, part of the range rail is hidden behind a scroller with no fade, no scrollbar and no partial-chip cue, which reads as the rail ending at 12H.

*Evidence:* updown-chart-lab.tsx:126-132 `.pchart-ranges` with 7 buttons (min 44×44, globals.css:2862/2873). globals.css:2882-2895 at ≤400px sets `.pchart-ranges { overflow-x: auto; scrollbar-width: none }` and the comment says 'NO MASK'. At 320 the content box is 280 < ≈320 needed, so `24H`/`7D` sit off-screen.

### S05-updown-FILT-02 · ⚪ low · ⚖️ intentional · filter
**BoardViz toggle label 'Rounds' and history pinned-day pill** — `/updown, /updown/history`

'Rounds / Chart' reads as a choice between the round cards and a chart, not between the outcome strip and a chart. The pinned-day pill looks like a selected option but acts as a remove button.

*Evidence:* board-viz.tsx:66-76: the toggle buttons read udViewCubes 'Rounds' / 'Raundi' / '轮次' and udViewChart, while the eyebrow reads udLastRounds and the cards directly below are also rounds. history-bar.tsx:156-158: the pinned day renders as a SELECTED FilterPill whose href clears the day, with no × glyph or 'clear' wording.

### S05-updown-ICON-01 · ⚪ low · ❌ refuted · icon
**Glyph sizes for the same meaning** — `/updown, /updown/[roundId], /updown/history`

The same 'state a fact' info mark and the same direction arrow appear at five sizes, none on the 16/18/20/24 icon ladder, so rows that say the same thing do not align across card, panel and history.

*Evidence:* - Info glyph: s=10 (updown-stake-controls.tsx:278/315 compact, updown-card.tsx:1017), s=11 (round-stake-panel.tsx:274/287, history/page.tsx:393), s=12 (history/page.tsx:517). - Trend glyph: s=9 (outcome-cubes.tsx:54), s=10 (updown-card.tsx:938/947), s=11 (:781/782), s=14 (:1003/1116), s=15 (updown-stake-controls.tsx:256). - Lock s=11, plus s=10/11, users s=11, header glyphs s=13.

### S05-updown-NUM-04 · ⚪ low · 🆕 new · number · unit: NEW: U32 Up & Down figures, time and state truth
**Settlement proof Move / Percent sign and precision** — `/updown/[roundId]`

A flat close, exactly the no-move case that VOIDs a banded round, reads '+$0.00 · +0.000%' on the proof, which claims a direction the card and hero correctly withhold (E-261/E-264 three-state rule). The proof also uses a third precision (3dp vs 2dp) for the same percentage.

*Evidence:* [roundId]/page.tsx:261 `const sgn = (v) => (v >= 0 ? "+" : "−")` is used at :751 and :753. :753 uses `toFixed(3)`. The card move uses toFixed(2) and leaves zero unsigned (updown-card.tsx:651), and price-hero.tsx:144 prints a flat '0.00%'.

### S05-updown-NUM-06 · ⚪ low · 🆕 new · number · unit: NEW: U32 Up & Down figures, time and state truth
**Stake chip compaction and count formatting** — `/updown, /updown/[roundId]`

There is a private K/M grammar for stake chips and three different grouping authorities for one player count, so a de-DE or fr device prints '1.234' / '1 234' on the card while the round page prints '1,234'.

*Evidence:* stake-math.ts:23-27 stakeChipLabel gives 2500 → '2.5K' (1dp). utils.ts:129-136 formatTzsCompact, 'THE ONE COMPACTION GRAMMAR', gives 2500 → 'TZS 3K' (K rounded). Player counts: updown-card.tsx:210-214 `new Intl.NumberFormat()` (device locale), [roundId]/page.tsx:507 `round.players.toLocaleString()` (server runtime locale). The platform grouping is TZ_NUMBER/formatNumber (utils.ts:217).

### S05-updown-STATE-03 · ⚪ low · 🆕 new · state · unit: U26
**Board empty state when no asset exists** — `/updown`

The body tells the player to try another duration on a screen that offers no duration control and no link out. The empty box spends 96px of a 320px phone column on padding.

*Evidence:* page.tsx:66-74: when `board.assets.length === 0` it renders only PageHeader + EmptyState(udNoRounds, udNoRoundsBody), with no UpDownBoardTabs and no action. udNoRoundsBody reads '…check back shortly, or try another duration.' (i18n-dict.ts:940). empty-state.tsx:69 box padding `px-8 py-8` = 48px each side in a 360px max box on phones.

## S06-live — Live page (carousel, search, pulse wall)

### S06-live-01 · 🟠 high · 🆕 new · state · unit: NEW: /live search state (SearchBox survives a miss)
**SearchBox on a search miss (the field itself)** — `/live`

One typo ends the search: the field vanishes mid-typing, the keyboard closes, and the query can't be fixed with backspace, only cleared.

*Evidence:* Typed 'rain' then 'zqx' with no Enter. The 250ms debounce moved the URL to /live?q=rainzqx (SW: ?q=mvuazqx). Result in all 3 viewports: searchBoxPresent=false, document.activeElement=BODY, enumerate textboxes=[]. Page drops to a 68px hero strip 'LIVE · 0 live' plus the EmptyState 'No live markets match "rainzqx"'. Only control left is 'Clear search' (120×44 at x120,y458), which erases the whole query. Code: page.tsx:219-237 renders <EmptyState> INSTEAD of <LivePulseGrid>, and the SearchBox lives inside LivePulseGrid (pulse-grid.tsx:114-120), so one zero-match keystroke unmounts the field being typed in.

### S06-live-02 · 🟠 high · 🆕 new · layout · unit: NEW: /live search state (SearchBox survives a miss)
**Featured hero while typing in the search field** — `/live?q=…`

Content above the focused field changes height while the player types, so the field jumps 110–134px. The search answer is then shown twice (hero + card), and on small phones the real result is below the fold.

*Evidence:* Focus stayed on the INPUT (focusAfterType). Typing 'rain' re-rendered the server hero from a 6-slide to a 1-slide carousel: hero 459.3→325.8px at 360 EN/SW, 459.3→349.5px at 320. The focused input moved up in the document mid-typing: 604.3→470.8 (-133.5px) at 360, 604.3→494.5 (-109.8px) at 320. The hero then shows the same market as the only grid card ('Will Dar es Salaam receive measurable rainfall…' in both), still titled 'MOST CONTESTED' over a one-item result. At 320×640 that only result starts at y=588.5, below the bottom-nav top at 575, so at scroll 0 the screen shows the duplicate hero and no result (ix-320-en__4-typed-top.png). Code: page.tsx:165-169 builds topContested from the filtered set; page.tsx:215 renders FeaturedContest whatever q is.

### S06-live-code-1 · 🟠 high · ♻️ duplicate → S06-live-01 · state
**SearchBox on a zero-result query (search miss) and on a quiet board** — `/live`

When a player's query stops matching (a typo, a half-typed Swahili word), the server returns an empty board and the search field UNMOUNTS while it has focus. The keyboard closes, the typed text vanishes and one letter cannot be corrected. The only way out is the 'Clear search' link (page.tsx:233), then retyping from scratch. On a genuinely empty board the search is missing entirely.

*Evidence:* page.tsx:219-241 renders `markets.length === 0 ? <EmptyState …/> : <><LivePulseGrid markets={markets} />…</>`. The only SearchBox this route renders is inside LivePulseGrid (pulse-grid.tsx:114-120). SearchBox replaces the URL 250ms after typing (search-box.tsx:69, :111-118 → router.replace), so the server re-renders. matchesQuery ANDs every term (search/predicate.ts:71-74), so one wrong letter gives 0 markets and takes the else-branch away.

### S06-live-03 · 🟡 medium · 🆕 new · button · unit: U9
**Search field clear controls (native cancel + custom .clear-btn)** — `/live?q=rain`

Two clear controls in two designs sit side by side. The custom one is below the tap floor and hidden under the chat bubble at 320; the native one is about 16px.

*Evidence:* Focused typed field shows two × glyphs: a bold white UA ::-webkit-search-cancel-button inside the input (input x57–302), and the custom .clear-btn at x302,y474, 38×38 with a 15px svg. Proof with focus held: hiding ::-webkit-search-cancel-button changed the pixels (verify2 nativeHidingChangedPixels=true). Control: hiding .clear-btn also changed pixels, so the check can fail. The unfocused shot shows only the custom ×. No ::-webkit-search-cancel-button rule exists anywhere in src/ (grep); input is type=search (search-box.tsx:148). .clear-btn is width/height 38px (globals.css:1746-1750). At 320 the 52px chat bubble (252–304 × 508–560) sits on the custom clear button (262–300 × 497–535).

### S06-live-04 · 🟡 medium · 🆕 new · motion · unit: U19
**Featured contest carousel auto-advance (slide height)** — `/live`

The search box and wall jump 23–47px under a reader's thumb every few seconds with no input from them.

*Evidence:* Idle, no input. 360 EN: hero 459→459→412px when slide 3 loads (h2 5→3 lines, 119→71px), then 435.5px on slide 4 (4 lines). Search box y 603→556 and first card y 698→651: a 47px jump. SW 360 the same; 320 EN 459→436 (23px). Browser layout-shift entries with hadRecentInput=false: 0.0159 at t=13.2s (sources DIV.search-box-wrap 603→556, first card 698→651) and 0.0081 at 19.2s (556→580). A new shift every 6s whenever neighbouring titles differ in line count. Also evidence for U19: the featured card measures 459.3px at 360 EN, 360 SW and 320 EN with a 5-line 19px title. Code: featured-contest.tsx:26 AUTO_ADVANCE_MS=6000; :114 unclamped h2.

### S06-live-05 · 🟡 medium · 🆕 new · a11y · unit: U19
**Carousel auto-rotation pause mechanism** — `/live`

On phones the auto-rotating region can't be paused without tapping a control, and it rotates off-screen, repainting and shifting layout for nothing on budget devices.

*Evidence:* With no interaction the carousel went 1/6→2/6 at ~3s and →3/6 at ~9s in all 3 viewports, and in the 21s CLS run it reached 4/6. Pause handlers are only onMouseEnter/onFocus (featured-contest.tsx:88-91); a touch user who scrolls never fires either. There is no pause/stop control, and it keeps rotating when scrolled out of view. It held (still 4/6 after 7s) only after an arrow tap focused a button.

### S06-live-07 · 🟡 medium · 🆕 new · copy · unit: U19
**Carousel eyebrow 'Most contested' (region name)** — `/live`

The label naming the carousel is ellipsised in Swahili at 360 and in English at 320, so it no longer says what the carousel is.

*Evidence:* p.truncate at text-micro 10px with 1.4px tracking (featured-contest.tsx:99). 360 SW 'Lililo na shaka zaidi' renders as 'LILILO NA SHAKA…' (scrollWidth 155 > clientWidth 118). 320 EN renders 'MOST CONT…' (104 > 78). The shrink-0 arrows+counter group takes 144px of the row.

### S06-live-09 · 🟡 medium · 🆕 new · copy · unit: NEW: player copy pass (plurals + SW/ZH terms)
**TippingBar labels in Swahili (YES side word)** — `/live`

The YES bet side is spelled two ways in one component, and across the product.

*Evidence:* After the next-arrow tap the SW featured bar reads 'NDIO 83% · INAELEKEA NDIYO · 17% HAPANA' (m1 barLabels; side words from the aria snapshot). The side word is t.common.yes = 'NDIO' (i18n-dict.ts:2699), but leansYes = 'inaelekea ndiyo' (:3523). Other SW strings also use NDIYO: probOverTime :3519, probChartAria :3521, backYesAria :3544, howItWorksBody :2737, faq1a :4285.

### S06-live-11 · 🟡 medium · 🆕 new · typography · unit: U19
**Hand-typed off-ladder sizes (hero, pulse cards, empty state)** — `/live`

The type ladder isn't closed on this page, and the hero card carries twice the allowed number of sizes.

*Evidence:* Text sizes in main at 360 EN: 10, 10.5, 11, 12, 13.5, 14, 19px. Off the ladder: count line 10.5px (page.tsx:210); counter '1 / 6' 10.5px (featured-contest.tsx:103); bar mid-label 'TIPPING' 10.5px; pulse card title 13.5px Sora (pulse-grid.tsx:204; 2,191 of 6,956 page characters); featured title 19px (featured-contest.tsx:114); EmptyState title 15.5px (empty-state.tsx:78). The featured hero card alone uses 6 sizes: 12 LIVE, 10.5 count/counter/mid-label, 10 eyebrow, 19 title, 11 bar %, 14 CTA. On-ladder values typed by hand instead of tokens: text-[10px] time (pulse-grid.tsx:190), text-[12px] prices (:233, :235), text-[14px] explainer (page.tsx:255).

### S06-live-25 · 🟡 medium · 🆕 new · state · unit: U19
**15s refresh vs featured slide and the live count announcement** — `/live`

When odds move, a paused reader can see the slide switch to a different question at the same index, even while hovering or focused. On a busy board the count line re-announces '40 live · 6 tipping' up to every 15s.

*Evidence:* page.tsx:173 `<RefreshPoller intervalMs={15_000} />` calls router.refresh (refresh-poller.tsx:53). topContested is re-sorted by /yesPct−50/ on every render (page.tsx:165-168). FeaturedContest keeps an index (`idx`, featured-contest.tsx:49) and shows `markets[Math.min(idx, n-1)]` (:75). The count line page.tsx:207-209 has `aria-live="polite"`.

### S06-live-code-12 · 🟡 medium · 🆕 new · container · unit: U26
**RouteError (live/error.tsx boundary)** — `/live (error)`

On a 360×640 phone, 256px of the viewport is vertical padding. 'Try again', the only recovery, is pushed toward or under the bottom nav, and side padding is 24, not 16. Every route error boundary shares this.

*Evidence:* live/error.tsx:17-23 → route-error.tsx:107 `relative mx-auto flex min-h-[60svh] … px-5 py-12 text-center`. py-12 is 128px top AND bottom (spacing 12 = 128); px-5 is 24px. Content: FiftyMark 64, 44px medallion (mt-5 24, mb-3 16), text-title-lg 28 title, body text-[13px], two stacked btn-md 44 (gap-2.5 10px).

### S06-live-code-16 · 🟡 medium · ➕ extends → D26 · state
**loading.tsx skeleton (new evidence for D26/U25)** — `/live (loading)`

When the page swaps in, the jump comes mostly from ~500px of hero and search appearing above the ghosts, not from card height. The 180px ghosts are actually taller than the pulse cards the code renders, so U25's 347px figure should be re-measured before ghost heights are set. Ghost radius is 12 against the cards' 16, and two loading indicators (shimmer and a 64px spinner) show for one state.

*Evidence:* loading.tsx:11-14 is a slim 'LIVE · Loading…' row. :16-24 draws 8 ghosts `rounded-lg` (12px) with `height: 180`. :26-28 adds `BrandSpinner size={48}` (a 64px box) after the ghosts. The real page opens with a PageHero of about 432px at 360 (page.tsx:195-216) and a SearchBox of about 71px (46px box + 8 + 17 echo, search-box.tsx:181-187). PulseCard is rounded-xl 16 and about 162px EN / 181px SW (pulse-grid.tsx:174-240). The plan says '180px vs 347px cards' (MOBILE-VISUAL-PLAN.md:165, :672).

### S06-live-code-2 · 🟡 medium · ♻️ duplicate → S06-live-05 · a11y
**Featured-contest carousel auto-advance** — `/live`

On a phone the featured question, its 32px bar and its CTA change every 6s while the player reads, unless the device has reduced motion on. Touching or reading the slide never pauses it. A tap that lands during the swap can open the next market, not the one read: the slide remounts via key={m.id} at :112 and the CTA href comes from the new `m` at :136. The component's own header (:55-57) promises 'never yank a slide away mid-read', but that holds only for mouse and keyboard.

*Evidence:* featured-contest.tsx:26 `AUTO_ADVANCE_MS = 6000`. :58-62 setInterval runs unless `paused` or reduced motion. :88-91 sets paused only on onMouseEnter/onFocus. :92-93 onTouchStart/onTouchEnd only handle swipe and never pause. No pause/stop control is rendered.

### S06-live-code-20 · 🟡 medium · ♻️ duplicate → S06-live-07 · copy
**Carousel eyebrow 'Most contested' truncated** — `/live`

On the most common phone widths in Swahili, the label that explains why these questions are featured is cut to 'LILILO NA S…'. The planned 16px padding (S06-live-07) gains only 16px, which is not enough.

*Evidence:* featured-contest.tsx:99 `min-w-0 truncate font-mono text-micro uppercase eyebrow` shares its row with a shrink-0 cluster of 44 + 8 + counter ≈32 + 8 + 44 = 136px (:101-107). The eyebrow gets content − 12 − 136 = 90px at 320 and 130px at 360 (content 238/278). SW 'LILILO NA SHAKA ZAIDI' (i18n-dict.ts:3238) is 21 chars × ≈7.4px ≈ 155px, so it truncates at 320 and 360. EN 'MOST CONTESTED' ≈ 104px truncates at 320.

### S06-live-code-3 · 🟡 medium · 🆕 new · a11y · unit: U19
**Carousel dot pager and CTA inside the keyed slide** — `/live`

A keyboard or switch user who activates dot 3 loses focus: the button they pressed is destroyed and focus drops to <body>. In Chromium the removal can also fire focusout, which un-pauses auto-advance. The pager and CTA replay the 220ms contest-fade on every swap, so the controls themselves flicker. The twin carousel does not behave this way, which gives two compositions for one job.

*Evidence:* featured-contest.tsx:112 `<div key={m.id} className="max-w-[64ch] contest-fade">` wraps the CTA row and the dot rail (:135-188). A dot's onClick `setIdx(i)` (:173) changes m.id, so the whole subtree, including the activated button, remounts. :91 onBlur → setPaused(false). The twin results/notable-carousel.tsx keeps slides mounted with `hidden` (:86) and draws dots outside the slide (:118).

### S06-live-code-4 · 🟡 medium · ♻️ duplicate → S06-live-04 · layout
**PageHero height changing on every carousel swap (extends U19)** — `/live`

Every 6s, without any input, the search field and every card below move by up to ~70px on a phone. A thumb aimed at a card lands on a different one, and it registers as layout shift. U19's planned 3-line clamp still leaves 1 to 3 lines of variance (up to 47px) unless the height is reserved.

*Evidence:* featured-contest.tsx:114 h2 `mb-4 font-display text-[19px] lg:text-[24px] font-semibold leading-tight` has no clamp and no min-height. Hero content width at 360 is 278px: PageContainer px-3 16x2 (page-container.tsx:106), PageHero border 1x2 (page-hero.tsx:42), p-5 24x2 (page-hero.tsx:29). At 19px x 1.25 = 23.75px per line, a 2-line and a 5-line title differ by about 71px. The swap fires every 6s (:26, :60). SearchBox and the wall (page.tsx:241) sit below. Code-derived hero height at 360 EN is about 432px.

### S06-live-code-6 · 🟡 medium · ♻️ duplicate → S06-live-03 · textbox
**SearchBox clear (×) button** — `/live`

The control that empties the page's only field is 38×38: 2px under the floor and 6px under the 44 preferred on phones. The icon is 15px, off the 16 set.

*Evidence:* search-box.tsx:159-168 `<button aria-label={t.common.clearSearch} className="clear-btn"><I.x s={15} /></button>`. globals.css:1746-1752 `.search-box .clear-btn { width: 38px; height: 38px; margin-right: 3px; }`.

### S06-live-code-7 · 🟡 medium · ➕ extends → U19 · container
**PageHero content padding and 'Price Competition' explainer panel** — `/live`

Both /live panels use 24px phone padding. The lost 16px is what pushes the SW carousel eyebrow into truncation (S06-live-20) and the CTA and dot rail into a wrap (S06-live-05).

*Evidence:* page-hero.tsx:29 default `contentClassName = "relative z-10 p-5 lg:p-6"` gives 24px on every side below lg (spacing 5 = 24). page.tsx:245 `rounded-xl glass-panel p-5 lg:p-6` gives 24px. At 360 both content columns are 278px, not the 294px a 16px rung would give.

### S06-live-code-8 · 🟡 medium · 🆕 new · card · unit: NEW: /live wall (card density, order, stagger)
**PulseCard (dense live wall card)** — `/live`

Card padding is 20, not the 16 rung. The market question on a card is set at a third size: 13.5px here, the ruled 15px on market cards, and 19px in the hero on the same page. The card already uses 3 type sizes, so the limit is reached, and two of them are hand-typed px values without ladder line-heights.

*Evidence:* pulse-grid.tsx:174 `kp-rise group flex flex-col rounded-xl border border-border bg-bg-elevated p-4` gives 20px padding (spacing 4 = 20). Title :204 `text-[13.5px] … leading-snug`. Category/UD tag at text-micro 10 (:178, :181). Time `text-[10px]` (:190). Prices `text-[12px]` (:233, :235). Code-derived height: 2 + 40 + 18 + 12 + 37 (SW 56) + 16 + 9 + 10 + 18 ≈ 162px EN / 181px SW.

### S06-live-code-9 · 🟡 medium · ♻️ duplicate → S06-live-11 · typography
**Off-ladder and hand-typed sizes; the eyebrow role at three sizes** — `/live`

Four sizes are off the ladder. The same section-eyebrow role appears at 12, 10 and 11px within one phone screen (hero label, carousel label, explainer label). Hand-typed px sizes lose the ladder's paired line-height and tracking.

*Evidence:* Off-ladder: page.tsx:210 `text-[10.5px]` (count); featured-contest.tsx:103 `text-[10.5px]` (counter); loading.tsx:13 `text-[10.5px]`; featured-contest.tsx:114 `text-[19px]`; pulse-grid.tsx:204 `text-[13.5px]`; empty-state.tsx:78 `text-[15.5px]`. On-ladder values typed by hand: page.tsx:255 `text-[14px]`, pulse-grid.tsx:190 `text-[10px]`, :233/:235 `text-[12px]`, search-box.tsx:184 `text-[11px]`, route-error.tsx:127 `text-[13px]`. Eyebrow role: page.tsx:201 `text-label` (12), featured-contest.tsx:99 `text-micro` (10), page.tsx:253 `text-caption` (11). Extra trackings `tracking-[0.16em]` (pulse-grid.tsx:137) and `tracking-[0.10em]` (:181) sit beside .eyebrow's 0.14em (globals.css:978-998). About 11 distinct sizes on the surface.

### S06-live-06 · ⚪ low · ⚖️ intentional → U19 · button
**Carousel dot rail (Show market 1–6)** — `/live`

Tap targets are 24px wide, below the floor, and form a second pager for the same job, costing 56px of hero height.

*Evidence:* 6 buttons, each 24×40 (x41→185, y514.3) at 360 EN, 360 SW and 320 EN; drawn dots 6×8, active 18×8 (featured-contest.tsx:174). The rail doesn't fit beside the 137.7×44 'Open market →' CTA (content width 278 / 238), so flex-wrap (:135) puts it on its own row: ctaRow height 100 = 44 CTA + 16 gap + 40 dots. That adds 56px to the 459px hero. Paging is already done by the 44×44 prev/next arrows and the '1 / 6' counter in the top row.

### S06-live-08 · ⚪ low · 🆕 new · copy · unit: NEW: player copy pass (plurals + SW/ZH terms)
**Search echo row under the field** — `/live?q=rain`

Grammatically wrong copy on every one-word search, and operator jargon shown to players.

*Evidence:* After typing one word the echo reads '1 words' (EN 360/320) and '1 maneno' (SW; the singular is 'neno'), at 11px (y524). describeQuery builds `${plain.length} ${words.words}` with no plural rule (lib/search/query.ts:196); dictionary values are 'words' (i18n-dict.ts:45) and 'maneno' (:2702).

### S06-live-10 · ⚪ low · ♻️ duplicate → S06-live-code-10 · number
**Side price labels: featured bar vs pulse card** — `/live`

The crowd price is written in two formats and two sizes a few hundred px apart.

*Evidence:* The same market shows two formats on one page. S!TE 2026: hero bar 'YES 50% … 50% NO' (11px, word then %, mirrored on the right); grid card #14 'YES @ 50% NO @ 50%' (12px). Rain market in the typed state: hero 'YES 18% · 82% NO', card 'YES @ 18% NO @ 82%'. Sources: pulse-grid.tsx:236-237 vs TippingBar showLabels (featured-contest.tsx:126-128).

### S06-live-12 · ⚪ low · ♻️ duplicate → U19 · container
**Panel padding: pulse card, PageHero, explainer, search-miss EmptyState** — `/live`

Phone panels use 20/24/48px padding instead of the 16px rung, which squeezes titles into more lines and makes every card and panel taller.

*Evidence:* Pulse cards p-4 = 20/20/20/20px on all 29 cards (pulse-grid.tsx:174). PageHero content p-5 = 24px each side (page-hero.tsx:29), leaving a featured content width of 278 at 360 and 238 at 320. Explainer glass-panel p-5 = 24px (page.tsx:245), 304.5px tall at 360 and 365px at 320, where its eyebrow wraps to 2 lines. Search-miss EmptyState px-8 py-8 = 48px each side (empty-state.tsx:69), leaving a 230px text column at 360 (190 at 320); title and body each wrap to 2 lines and the box is 339px tall.

### S06-live-13 · ⚪ low · 🆕 new · card · unit: NEW: /live wall (card density, order, stagger)
**Pulse card height parity (Up & Down vs poll cards)** — `/live`

Card heights differ by 5px, so in a two-column wall (≥640) the bars and price rows won't line up. It breaks the file's own stated invariant.

*Evidence:* The 3 Up & Down cards are 164.1px vs 159.1px for poll cards in EN at 360 and 320, and 182.7 vs 177.7 in SW. Title offset is 53 vs 48 and bar offset 106.1 vs 101.1, because the bordered 'UP & DOWN' chip (py-0.5 + 1px border, pulse-grid.tsx:181) is taller than the 13px category glyph row. The comment at pulse-grid.tsx:199-202 says every card in the wall keeps one height.

### S06-live-14 · ⚪ low · ❌ refuted → U3 · layout
**.market-grid gap between pulse cards** — `/live`

The wall rhythm uses an off-scale gap on phones.

*Evidence:* Row gap is 14px (globals.css:3003 'gap: 14px'); measured card #1 top 876.4 = card #0 bottom 862.4 + 14. This repo's spacing scale has 12 (key 2) and 16 (key 3), not 14.

### S06-live-15 · ⚪ low · 🆕 new · a11y · unit: NEW: /live semantics + a11y (names, headings, carousel roles
**Pulse card link name and featured duplicate links** — `/live`

Screen readers read every card as a long, noisy link name, and the featured market is announced as two links in a row.

*Evidence:* Aria snapshot of a card: link 'Weather Waiting for results Will Dar es Salaam receive measurable rainfall on September 15, 2026? 18 YES @ 18% NO @ 82%'. The whole card is one <a> around the h3 and a progressbar, so its name is all the card text plus a stray '18' from the progressbar (SW same: '… 2026? 18 NDIO @ 18% HAPANA @ 82%'). The featured slide has two adjacent links to the same /markets/mkt_37fa… (the h2 title link and 'Open market →'); the '→' glyph is part of the accessible name.

### S06-live-16 · ⚪ low · 🆕 new · a11y · unit: NEW: /live semantics + a11y (names, headings, carousel roles
**Heading structure** — `/live`

Heading navigation misrepresents the page, and the empty state has no heading to jump to.

*Evidence:* Heading order: sr-only h1 'Live Markets' (page.tsx:191), then h2 = the featured market's title (featured-contest.tsx:114), then 29 h3 card titles (pulse-grid.tsx:203). The whole wall is announced as a subsection of one market, and the h2 changes every 6s. In the search-miss state the only heading is the h1; the EmptyState title is a <p> (empty-state.tsx:78).

### S06-live-17 · ⚪ low · ♻️ duplicate → S06-live-code-19 · link
**Featured carousel link target for Up & Down rounds** — `/live`

Once an Up & Down round becomes the most contested, the hero links to the poll route and goes through a redirect, unlike the grid card for the same round.

*Evidence:* Code only; not reproducible today because all 3 live Up & Down rounds read 'No bets yet' and are filtered out of topContested. featured-contest.tsx:113 and :136 always link to `/markets/${m.id}`, while PulseCard sends Up & Down to `/updown/${roundId}` (pulse-grid.tsx:170). page.tsx:110-114 says an Up & Down round must link to its own round page, with no redirect hop.

### S06-live-18 · ⚪ low · 🆕 new · number · unit: U19
**Featured TippingBar side-% weight on an exact tie** — `/live`

On a tie, while the bar itself says TIPPING, the YES side is styled as the leader.

*Evidence:* At exactly 50/50 (S!TE 2026, mid-label 'TIPPING') YES '50%' is weight 700 and NO '50%' is 500, in all 3 viewports. At 83/17 YES is 700; at 18/82 NO is 700. So bold marks the leader, and a tie is treated as a YES lead.

### S06-live-19 · ⚪ low · ➕ extends → D3 · layout
**Chat bubble over /live controls and figures (D3, new instances)** — `/live`

The bubble hides a time-left figure, a price and the search clear control on this surface.

*Evidence:* KNOWN D3/U7, new instances only. Fixed 52×52 bubble at (292,648) at 360 and (252,508) at 320. It covers: at 320 EN typed, the search field's custom clear button (262–300 × 497–535) (ix-320-en__4-typed-top.png); at 360 SW, card #3's NO price 'HAPANA @ 8…' (live-360-sw__s01.png); at 360 EN, card #4's time-left '3d l…' (live-360-en__s01.png) and the NO price in the typed state (ix-360-en__4-typed.png).

### S06-live-20 · ⚪ low · ♻️ duplicate → U18 · container
**Page shell voids: explainer→footer, reserved empty echo row** — `/live`

80px of dead space at the page end (over the 48px section rung), plus 25px of empty reserve under the search field on every visit.

*Evidence:* KNOWN U18 area; evidence for /live. Void under the explainer before the footer: explainer bottom 6024.6 → footer top 6104.6 = 80px at 360 EN; 6108.9 → 6188.9 = 80px at 320 (PageContainer py-6 = 32px top and bottom, plus shell padding). The SearchBox also reserves an empty 17px echo row plus 8px gap under the idle field (search-box.tsx:181-187), i.e. search block 71px for a 46px field. That reserve is justified for the sticky /markets zone, but the /live box isn't sticky.

### S06-live-21 · ⚪ low · 🆕 new · layout · unit: U26
**EmptyState title echoing the raw query** — `/live?q=…`

A pasted unbroken query (a URL or long token) of up to 120 characters is laid out as one ~1,000px line. It overflows the dashed box and is clipped at the viewport edge, with no way to scroll. The quotes are hardcoded ASCII "…" in ZH too.

*Evidence:* page.tsx:230 `title={q ? `${t.market.noLiveMatch} "${q}"` : t.market.noLiveNow}`. q is clamped to MAX_QUERY_LEN 120 (search/query.ts:58, page.tsx:94). empty-state.tsx:78 `font-display text-[15.5px] … text-balance` has no overflow-wrap. Text column is 192px at 320 (S06-live-11). The body has `overflow-x: hidden; overflow-x: clip` (globals.css:884-885).

### S06-live-22 · ⚪ low · 🆕 new · a11y · unit: NEW: /live semantics + a11y (names, headings, carousel roles
**BrandSpinner status label and the infinite-scroll sentinel** — `/live`

SW and ZH screen-reader users hear English 'Loading' followed by the localized line. A 166px spinner block says 'loading more' while nothing is loading.

*Evidence:* brand.tsx:557 `<span … role="status" aria-label="Loading">` is hardcoded English. It is rendered at pulse-grid.tsx:136 inside the `aria-live="polite"` sentinel next to `t.common.loadingMore` ('Inapakia zaidi…' / '加载更多…'), and at loading.tsx:27. The sentinel block is py-8 48 + 46px spinner box + gap-2.5 10 + 14 ≈ 166px (pulse-grid.tsx:133-139), yet the reveal is synchronous and nothing is fetched (:81-84).

### S06-live-23 · ⚪ low · 🆕 new · a11y · unit: NEW: /live semantics + a11y (names, headings, carousel roles
**Carousel slide semantics and duplicate links** — `/live`

After Next or Previous, a screen-reader user is not told which slide they are on or what changed. Keyboard and switch users cross two consecutive stops that go to the same place.

*Evidence:* featured-contest.tsx:78-82 `role="region" aria-roledescription="carousel"`. The slide (:112) has no `role="group"`, no `aria-roledescription="slide"` and no position label. The 'n / N' counter (:103-105) is visual only. Title Link (:113-117) and CTA Link (:136-138) both point to `/markets/${m.id}`.

### S06-live-24 · ⚪ low · 🆕 new · a11y · unit: NEW: /live semantics + a11y (names, headings, carousel roles
**Empty TippingBar on an unpriced PulseCard** — `/live`

An unpriced market reads as 'No bets yet, progress bar, busy' and then 'No bets yet' again, all inside the card link's name. An indeterminate progressbar signals loading, not 'no price'.

*Evidence:* pulse-grid.tsx:219-220 `<TippingBar … empty emptyLabel={t.market.noBetsYet} />` → brand.tsx:291-297 `role="progressbar"` with aria-valuemin/max but no aria-valuenow (an indeterminate progressbar). pulse-grid.tsx:233 then prints the same 'No bets yet' as visible text inside the same card link.

### S06-live-26 · ⚪ low · ❌ refuted · icon
**Off-set icon sizes and spinner plates** — `/live`

Icons at 11, 13 and 15px, and plates at 46 and 64px, are off the icon set and the plate rungs, so glyph weight varies from row to row.

*Evidence:* pulse-grid.tsx:183 `I.trendingUp s={11}`, :187 `Cat s={13}`, :191 `I.hourglassOff s={11}`; search-box.tsx:166 `I.x s={15}`; BrandSpinner size 30 draws a 46px plate (pulse-grid.tsx:136; brand.tsx:558 `size + 16`) and size 48 a 64px plate (loading.tsx:27).

### S06-live-27 · ⚪ low · ❌ refuted · number
**Live and tipping counts, carousel counter** — `/live`

From 1,000 live markets the header reads '1234 live' with no thousands separator, unlike formatted counts on other surfaces. It is also set at the off-ladder 10.5px (S06-live-09).

*Evidence:* page.tsx:212 `{markets.length} {t.market.liveCount}{tippingMarkets > 0 ? ` · ${tippingMarkets} …` : ""}` prints raw integers. featured-contest.tsx:104 `{idx + 1} / {n}`. The wall is built for 'thousands of bars' (pulse-grid.tsx:53-54, page.tsx:128).

### S06-live-28 · ⚪ low · ➕ extends → D5 · layout
**Gap between SearchBox and the wall (same class as D5)** — `/live`

There is about 49px of empty space between the search field and the first card on phones, where the between-blocks rung is 24. This is the same pattern as D5 on /results, on a surface D5 does not list.

*Evidence:* search-box.tsx:181-187: the echo row `mt-1.5 min-h-[17px] text-[11px]` is always reserved (8 + 17 = 25px). PageContainer `space-y-5` (page.tsx:176) then adds 24px before `.market-grid`. The reserve exists for /markets' sticky zone (search-box.tsx:171-180), which /live does not have.

### S06-live-code-10 · ⚪ low · 🆕 new · number · unit: NEW: one crowd-price label across surfaces
**Crowd price format: hero TippingBar labels vs PulseCard vs other cards** — `/live`

On one /live screen the same kind of price reads 'YES 48% · 52% NO' in the hero and 'YES @ 48% · NO @ 52%' in the cards just below. Across surfaces the price is set at 11, 11.5, 12 and 12.5px. On the card the figure itself, which is the data, is dimmed to 75% while the side word stays at full ink. That inverts the hierarchy and lowers the contrast of a 12px number.

*Evidence:* Hero: brand.tsx:339-347 renders 'YES 48%' on the left and '52% NO' on the right (number before the word) at 11px mono (globals.css:1465-1471). PulseCard: pulse-grid.tsx:236-237 renders 'YES @ 48%' / 'NO @ 52%' at 12px, with the figure in `opacity-75`. Elsewhere: market-card.tsx:433/436 '@ 48%' at `text-[11.5px]`; side-picker.tsx:147/155 '@ 48%' at `text-[12.5px]`.

### S06-live-code-11 · ⚪ low · ♻️ duplicate → U26 · container
**EmptyState box (no live markets / no match)** — `/live`

96px of a 288px phone width is padding. The SW title 'Hakuna soko hai linalolingana "…"' wraps to 3-4 lines in 192px. The same scale misread reaches all 45 EmptyState call sites.

*Evidence:* empty-state.tsx:69 `rounded-xl border border-dashed … px-8 py-8` gives 48px on all sides (spacing 8 = 48; the kit most likely meant 32). :70 `max-w-[360px] mx-auto`. Title :78 `text-[15.5px]`. Rendered by page.tsx:228-237. At 320 the box is 288px wide with a 192px text column; at 360, 232px.

### S06-live-code-13 · ⚪ low · 🆕 new · layout · unit: NEW: /live wall (card density, order, stagger)
**'Price Competition · pool model' explainer placed after the infinite wall** — `/live`

The page's only explanation of how the pool, the commission and the payout work moves further down every time a phone user approaches it. With 100 live markets it is roughly 5 batches, about 100 × (162 + 14) ≈ 17,600px of one-column scrolling, before the explainer or the footer can be reached.

*Evidence:* page.tsx:239-258 renders the section after `<LivePulseGrid>`. pulse-grid.tsx:55, :73-91 append 24 more cards whenever the sentinel is within `rootMargin: "300px 0px"`, and the sentinel sits above the explainer (:130-141).

### S06-live-code-14 · ⚪ low · ➕ extends → U22 · layout
**Page wrapper min-height** — `/live`

On the ~300px empty or no-match state, the wrapper forces at least one full large viewport of height, leaving a ~350-450px void before the footer on a 360×780 phone. The 44 constant is stale.

*Evidence:* page.tsx:172 `<div className="relative min-h-[calc(100vh-44px)]">`. The app bar is 56px (search-box.tsx:174 '56px app bar'). On Android Chrome `100vh` is the large viewport (URL bar hidden). PageContainer adds py-6 32px inside (page-container.tsx:106).

### S06-live-code-15 · ⚪ low · 🆕 new · motion · unit: U28
**PulseCard entrance stagger** — `/live`

Card 10 onward waits 450ms: 10 steps of an off-token 45ms. Every card in an appended batch (index 24 and up) gets the full 450ms, so each new batch arrives late and all at once, and the reveal lags the scroll on low-end phones.

*Evidence:* pulse-grid.tsx:174-175 `kp-rise` + `style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}`. The ladder at globals.css:3457-3469 caps `.market-grid > *` at 4 steps × `--m-stagger` 40ms = 160ms; motion.css:39 says 'never more than 4 steps'. The inline style beats the nth-child rules. Only `[data-motion="reduced"]` zeroes the delay (globals.css:2788).

### S06-live-code-17 · ⚪ low · 🆕 new · copy · unit: NEW: player copy pass (plurals + SW/ZH terms)
**sr-only h1 and the word for 'live' in Swahili/Chinese** — `/live`

Swahili puts the noun first, so the screen-reader heading 'Mubashara Masoko' is ungrammatical. One SW page calls 'live' both 'Mubashara' (h1, nav) and 'Hai' (eyebrow, count, search). The ZH heading has an ASCII space between two CJK words.

*Evidence:* page.tsx:191 `<h1 className="sr-only">{t.common.live} {t.common.markets}</h1>` produces SW 'Mubashara Masoko' (i18n-dict.ts:2676, :2687) and ZH '直播 市场' (:4812, :4823). The visible eyebrow page.tsx:201 uses t.home.liveSection, SW 'Hai' (:3176). Count 'hai' (:3231), placeholder 'Tafuta soko hai' (:2863), nav 'Mubashara'.

### S06-live-code-18 · ⚪ low · 🆕 new · copy · unit: NEW: player copy pass (plurals + SW/ZH terms)
**'tipping' count and TippingBar lean label in Chinese** — `/live`

活跃 means 'active'. The count tells a Chinese player that only 6 of 40 live markets are active, and a balanced bar is labelled 'active'. Both statements are false.

*Evidence:* i18n-dict.ts:5399 `tipping: "活跃"`, used in the count page.tsx:212 ('40 直播中 · 6 活跃') and the hero bar lean label (featured-contest.tsx:128 → brand.tsx:343). 'Tipping' means within 8 points of 50/50 (page.tsx:155).

### S06-live-code-19 · ⚪ low · 🆕 new · copy · unit: U19
**Featured slide CTA and link for an Up & Down round; UD card fallback link** — `/live`

When an Up & Down round is among the most contested, the hero names its sides Up/Down correctly (:127-128), but the CTA calls it a market and routes through the /markets redirect, an extra round trip on 2G. A UD card whose round lookup degraded (page.tsx:121) opens the generic /updown board and loses the round the player tapped.

*Evidence:* page.tsx:169 topContested maps `{ id, title, yesPct, productLine }` and drops roundId (the wall snapshot keeps it at :148). featured-contest.tsx:113 and :136 both use `href={`/markets/${m.id}`}`. CTA label openLabel = 'Open market →' / 'Fungua soko →' / '打开市场 →' (i18n-dict.ts:665/3239/5374). pulse-grid.tsx:170 sends a UD card with no roundId to bare `/updown`.

### S06-live-code-5 · ⚪ low · ⚖️ intentional → S06-live-06 · button
**Carousel dot pager buttons and CTA row wrap** — `/live`

Each dot's hit box is 24px wide, under the 40px floor, and the boxes touch, so a thumb hits the neighbour. On 320/360 the rail ends up alone, left-aligned under the CTA, adding 52px to a hero U19 already needs to shrink. Three pagers (arrows+counter, dots, swipe) serve one 6-item carousel.

*Evidence:* featured-contest.tsx:174 `grid h-[40px] w-[24px] place-items-center rounded-md` × 6 = 144px, with no gap between them (:168). CTA row :135 `mt-4 flex flex-wrap items-center gap-3`. btn-md 'Open market →' is about 130px (globals.css:1089 padding 16×2 + label). 130 + 12 + 144 ≈ 286px, more than the 278px content at 360 and the 238px at 320, so the rail wraps onto its own row (+12 gap, +40 = +52px hero). The same carousel is also paged by 44×44 arrows plus an 'n / N' counter (:101-107) and swipe (:64-72).

## S07-results — Results board

### S07-01 · 🟠 high · 🕓 unverified · number · unit: NEW: terminal-card cold start — no crowd price on an empty p
**Grid MarketCard price figure and tipping needle on VOID and empty-pool RESOLVED cards** — `/results, /results?page=2, /results?q=bitcoin`

The public results board states a crowd price and a contested 50/50 split for markets nobody bet on. It does so on almost every card of page 2.

*Evidence:* Page 2 at 360 EN: 9 of 12 cards are VOID with '0 predictors · TZS 0' and still show a 28px green 'YES 50%' (.mcardp-pct 41×28 at x=287), bar aria 'YES probability 50% now=50'. SW shows 'NDIO 50%'. The same happens on page 1's VOID Bitcoin card. RESOLVED cards with an empty pool (Newcastle, Team Europe, two crypto cards in the bitcoin search) draw the needle at 50 (aria 'YES probability 50%') over '0 predictors · TZS 0'. Code: page.tsx:455 passes impliedYesPct(m), which returns a hardcoded 50 on an empty pool. market-card.tsx:277 sets noPrice = live && …, so no terminal card ever takes the empty branch. market-card.tsx:369-370 treats VOIDED as not resolved and prints {yesPct}%. The notable card on the same page already uses pricedYesPct (page.tsx:526) and renders an empty bar.

### S07-02 · 🟠 high · 🕓 unverified · copy · unit: NEW: /results copy pass (category, state words, plurals, SW 
**Notable result card category chip** — `/results`

An untranslated English token on the most prominent card of the page in SW and ZH. The grid below says the same thing in the player's language.

*Evidence:* page.tsx:540 renders <Chip variant="cat" size="sm">{m.category}</Chip>, the raw enum. Live DOM text is 'sports' in EN and ZH, painted uppercase as 'SPORTS'. It sits beside 'IMETATULIWA · NDIO' in SW and '已结算 · 是' in ZH. Grid cards on the same page show 'MICHEZO' / '体育'.

### S07-06 · 🟠 high · 🕓 unverified · button · unit: U3
**Card footer share button (.mcardp-share)** — `/results, /results?page=2`

The only share control on the card is below the tap floor in both axes, next to another link.

*Evidence:* The box is 13×13 on every grid card: 9 on page 1 and 12 on page 2 (x=247 at 360 EN, 239 SW, 207 at 320). The elementFromPoint scan gives a hit span of 26 wide × 37 tall in both EN and ZH: ::after -6/-6/-9/-14 at globals.css:5106-5113. Details starts at x=272, 12px right of the glyph.

### S07-results-01 · 🟠 high · 🕓 unverified · state · unit: NEW: resolved card link shape (a share dialog rendered insid
**Share dialog on every /results grid card (compact ShareButton inside the resolved card <Link>)** — `/results`

Any click inside a card's share dialog (tapping the scrim to dismiss, Copy link, WhatsApp) bubbles through the React tree to the card's Link. The Link calls preventDefault and client-navigates to /markets/[id]. So the WhatsApp deep link never opens: its native navigation is cancelled and the player lands on the market page instead. Dismissing the dialog also navigates away. The trigger itself is a <button> inside an <a> (invalid content model); it relies on stopPropagation alone, without preventDefault. Whether Chrome Android also follows the anchor from that trigger tap is unconfirmed (needs a live hit test).

*Evidence:* src/components/markets/market-card.tsx:524 the resolved card is `<Link data-row-id href={`/markets/${id}`} className="mcardp group">{body}</Link>`, and body includes `<ShareButton compact …/>` at :478. src/components/markets/share-button.tsx:113 renders `<Modal>` inside that same React subtree; its WhatsApp `<a>` (:137-142) and Copy button (:157-161) neither stop propagation nor preventDefault. src/components/ui/modal.tsx:260 `createPortal(`, and the scrim at :278-289 has `onClick={… onClose …}` with no stopPropagation. node_modules/next/dist/client/app-dir/link.js:300-322 (Next 16.2.4) is the Link onClick: `if (e.defaultPrevented) return; linkClicked(...)`, and at :72 `e.preventDefault()` followed by `dispatchNavigateAction` (:84-87). React synthetic events bubble out of portals to React ancestors.

### S07-results-02 · 🟠 high · 🕓 unverified → S07-01 · number
**Probability bar on resolved/voided grid cards with an empty pool** — `/results`

A settled or voided market that never had a bet (common after the pre-launch purge, and for voids) shows a real-looking 50/50 crowd split on the grid. The notable card of the same market correctly shows an empty rail. Two code paths on one page disagree about the same fact.

*Evidence:* src/app/results/page.tsx:455 `yesPct={impliedYesPct(m)}`. src/lib/server/market-service.ts:317 `if (total === 0) return 50;`. src/components/markets/market-card.tsx:277 `const noPrice = live && (isNew ?? volume === 0);` is false for every terminal card, so :386 draws `<TippingBar yesPct={50} … resolved>` with a centred needle and a shimmer. Meanwhile page.tsx:521-526 (FeaturedResult) uses `pricedYesPct` and warns 'the cost of being wrong is a fabricated crowd price under a gilt seal'.

### S07-results-03 · 🟠 high · 🕓 unverified → S07-03 · copy
**Grid card for a market with status VOIDED** — `/results`

One VOIDED card makes four contradictory statements. Chip 'VOID'; 28px readout 'YES 50%' (a live-style price on a refunded market); check-marked pill 'Closed'; meta 'Resolved Void' when resolvedOutcome is null. In SW: BATILI / NDIO 50% / Imefungwa / Imetatuliwa Batili.

*Evidence:* src/app/results/page.tsx:461 `status={m.status === "VOIDED" ? "VOIDED" : "RESOLVED"}` and :460 `timeLeft={m.resolvedOutcome === "VOID" ? t.common.voided : `${t.market.resolvedOutcome} ${outcomeWord(t, m.resolvedOutcome ?? "VOID", …)}`}`. market-card.tsx:228 `isResolved = status === "RESOLVED"` is false, so :369 caption = sideWord YES and :370 `{yesPct}<span>%</span>`; :444 ghost pill = `t.market.statusClosed` with `<I.resolved/>` check glyph; :242-253 chip = statusVoid.

### S07-results-04 · 🟠 high · 🕓 unverified → S07-02 · copy
**Notable result card category chip** — `/results`

The most prominent card on page 1 reads 'SPORTS' / 'CRYPTO' in Swahili and Chinese, directly above a sheet whose topic chips say 'Michezo' / '体育'.

*Evidence:* src/app/results/page.tsx:540 `<Chip variant="cat" size="sm">{m.category}</Chip>` prints the raw enum ('sports' / 'macro' / 'weather' / 'crypto' / 'culture' / 'tech' / 'other', src/lib/markets/categories.ts:24), uppercased by chip.tsx:234. The dictionary has catSports 'Michezo'/'体育' etc. The grid card uses `marketCategoryLabel(t, category)` (market-card.tsx:305), and its comment calls this 'the most-seen untranslated token in the product'.

### S07-03 · 🟡 medium · 🕓 unverified · copy · unit: NEW: /results copy pass (category, state words, plurals, SW 
**State words on terminal cards (chip / action pill / meta / lens)** — `/results, /results?page=2`

One state gets different words on the same card. 'Closed' is also wrong for a voided, refunded market.

*Evidence:* A VOID card uses three different words. EN: chip 'VOID' (statusVoid, i18n-dict.ts:851), pill 'Closed' (statusClosed :856 via market-card.tsx:444), meta 'Voided' (common.voided :39 via page.tsx:460); the lens says 'Voided 24'. SW: 'BATILI' / 'Imefungwa' / 'Imebatilishwa'. A RESOLVED card in SW uses two verbs: chip 'IMEKAMILIKA' and pill 'Imekamilika NDIO' (statusResolved :3369), but meta 'Imetatuliwa NDIO' and notable chip 'IMETATULIWA · NDIO' (resolvedOutcome :3263).

### S07-04 · 🟡 medium · 🕓 unverified · card · unit: NEW: terminal market card composition (retire the fake butto
**Resolved grid card: outcome stated four times, including a non-interactive button** — `/results`

40px of each card is spent on a control that does nothing but looks tappable, and the same fact is repeated four times.

*Evidence:* Every resolved grid card (9 on page 1) states the outcome four times: chip 'RESOLVED', 28px 'RESULT YES', a 296×40 div.btn.btn-ghost.btn-md 'Resolved YES', and 11px meta 'Resolved YES'. The ghost pill has pointer-events none, opacity .85, no role and no tabindex (market-card.tsx:442-445). It exists only for live/resolved height parity, and /results shows only terminal cards.

### S07-05 · 🟡 medium · 🕓 unverified → S07-results-23 · number
**Money figures on one screen (ticker, notable meta, grid meta)** — `/results`

The same kind of amount is formatted two ways on one scroll, and the grid figure does not say what it measures.

*Evidence:* The notable meta says 'TZS 14K Settled' (formatTzsCompact, page.tsx:562) and the ticker 'TZS 10K' / 'TZS 870'. Grid card meta says 'TZS 4,000', 'TZS 2,500', 'TZS 5,000', 'TZS 0' (formatTzs, market-card.tsx:450): amounts of the same magnitude in a second format. The grid figure has no noun, while the notable card says 'Settled'. Grid meta numerals are proportional (font-variant-numeric normal); the notable meta is tabular.

### S07-07 · 🟡 medium · 🕓 unverified · textbox · unit: NEW: SearchBox phone pass (clear 44, 16px field, compliant o
**Search field clear button (.clear-btn)** — `/results?q=bitcoin, /results?q=zzqxnomatch`

The clear control sits below the 40px floor on every search surface that uses SearchBox.

*Evidence:* The clear button measures 38×38 at x=302 y=196 inside a 328×46 input group. globals.css:1746-1749 sets width/height 38px. The accessible name is 'Clear search' (OK).

### S07-08 · 🟡 medium · 🕓 unverified · copy · unit: NEW: /results copy pass (category, state words, plurals, SW 
**Search echo row** — `/results?q=bitcoin`

A grammar error appears on the first line a searching player reads, in every locale with plurals.

*Evidence:* The echo row under the field reads '1 words' (11px, y=246) in both search states. query.ts:196 builds `${plain.length} ${words.words}` from i18n-dict.ts:45 words: 'words'. SW :2702 gives '1 maneno' (the singular is 'neno 1').

### S07-09 · 🟡 medium · 🕓 unverified · filter · unit: U21
**Filters sheet body: Topic group out of reach on open** — `/results (Filters sheet open)`

A phone player opening Filters on a small screen sees no topic filter at all, and the one-column layout makes the sheet 2.3× its viewport.

*Evidence:* At 320×640 the .kp-fsheet-body is clientHeight 340 vs scrollHeight 790, so 57% is hidden. The TOPIC key and all 8 topic pills are below the fold on open, marked only by the footer hairline. At 360 EN it is 453/582 (topic rows 2-4 hidden); at 360 SW 453/526. At 320 the topic grid 'grid-cols-[repeat(auto-fill,minmax(148px,1fr))]' (results-bar.tsx:213) collapses to one column of 278×44 pills, so Topic alone is 434px tall.

### S07-10 · 🟡 medium · 🕓 unverified · filter · unit: NEW: filter sheet on phones (padding, group geometry, reach)
**Topic pills in the Filters sheet** — `/results (Filters sheet open)`

Two pill geometries in one sheet. The stretched, centred pills read as a different control from the hug pills above them.

*Evidence:* In the same sheet, Game pills hug their text (85, 119, 134 wide) and When pills hug theirs. Every Topic pill is a 155×44 grid cell (x=21/184), and 278 wide at 320. Icon and label are centred, so the labels start at a different x on every row. The selected 'All 170' draws a 155px outline (sheet-360-en.json groups[2]).

### S07-13 · 🟡 medium · 🕓 unverified → D1 · filter
**Outcome lens strip (row 1) vs result count — new instance of known D1** — `/results, /results?q=bitcoin`

The fourth outcome lens is never visible without a horizontal swipe. At 360 EN nothing even hints at more, and at 320 half the status axis is hidden.

*Evidence:* At 360 EN the strip is clientWidth 236 / scrollWidth 357. 'Voided 24' starts at x=262, past the strip's right edge of 252, so 0px shows. 'NO 87' has 45px outside the fade. 360 SW: 'HAPANA 87' 33px, 'Imebatilishwa 24' 0px. 320 EN: 'NO 87' 5px (a lone 'N' beside '170 markets'), Voided 0px. 360 ZH: '已作废 24' 14px, all under the 24px fade. In search state 'Vo' touches '4 markets'.

### S07-15 · 🟡 medium · 🕓 unverified · layout · unit: NEW: notable-result carousel and card on phones
**Notable result carousel controls** — `/results`

Two navigations for one three-slide carousel cost a sixth of a phone viewport. The dot targets fail the tap floor, a question the file itself leaves to a ruling.

*Evidence:* Above the card: an arrows row at y=437, 44px tall, plus a 12px gap, then the card at y=493. Below the card: an aria-hidden dot rail of 3 × 24×40 buttons (tabIndex -1) at y=810, 10px under the card bottom of 800. That is 106px of navigation around one 307px card. The job is done twice: arrows plus a '1 / 3' counter (10.5px, orphaned between the arrows), and dots (notable-carousel.tsx:63-69, 117-138). The dots are 24px wide, under the floor.

### S07-18 · 🟡 medium · 🕓 unverified · typography · unit: NEW: type-ladder sweep (off-ladder 9 / 10.5 / 11.5 / 15.5 an
**Type sizes inside result cards and off-ladder sizes on /results** — `/results`

Cards carry 5-8 type sizes against a ≤3 rule, and four sizes on the page are not on the ladder.

*Evidence:* The grid card uses 8 sizes: 9px status chip (Inter 700 uppercase, chip.tsx:161 xs), 9.5 RESULT caption, 10 category/predictors, 11 meta, 11.5 Details (globals.css:4017), 13 ghost pill, 15 title, 28 result. The notable card uses 5: 9.5 chip, 10 resolved chip and label, 10.5 'leans yes', 11 bar labels and meta, 18 title. Off-ladder on the page: 9px Inter (68 chars; not mono, so the 9.5/8.5 microlabel exemption does not apply), 10.5px (carousel counter notable-carousel.tsx:65; bar 'leans yes'), 11.5px (result count query-bar.tsx:165; Details).

### S07-23 · 🟡 medium · 🕓 unverified · state · unit: U26
**Empty search state** — `/results?q=zzqxnomatch`

One state is drawn with duplicated copy and three competing ways out.

*Evidence:* 'No results match "zzqxnomatch"' is printed twice: as a mono 11px aria-live line (page.tsx:396-400) and as the EmptyState title (page.tsx:479). There are three clear-search controls in three designs: the 38px ✕ in the field, a quiet FilterPill 'Clear search 170' (page.tsx:417-431), and the EmptyState btn-ghost btn-sm 'Clear search' (page.tsx:486). The lens row above still lists 'All 0 · YES 0 · NO 0'.

### S07-results-05 · 🟡 medium · 🕓 unverified · state · unit: U26
**Empty state when filters (not search) produce zero rows** — `/results?out=void / ?when=today / ?cat=…`

With a live archive, the lens-empty, window-miss and filter-miss causes all tell the player 'No resolved markets yet — Resolved markets will appear here once outcomes are confirmed', and the primary CTA leaves the page. At the same time, the exit pills directly above offer 'All 65'. The copy is false, and the button hierarchy points away from the real exit.

*Evidence:* src/app/results/page.tsx:295 `const cause = archiveEmptyCause(...)` is only used for exits at :296. EmptyState at :479-490 is binary: `title={searching ? … : t.results.noResolvedYet}`, `body={… t.results.noResolvedBody}`, action `btn btn-primary btn-sm` 'Browse live markets →'. /markets switches copy per cause (src/app/markets/page.tsx:457-463), as does /positions (src/app/positions/page.tsx:236-248).

### S07-results-06 · 🟡 medium · 🕓 unverified · copy · unit: U26
**Exit pills on a zero-result page** — `/results`

Up to three pills can read 'All' (EN), 'Zote' (SW) or '全部' (ZH), e.g. '⊞ All 4 · All 9 · Clear search 12'. A player cannot tell which one clears the topic, the game or the outcome.

*Evidence:* src/app/results/page.tsx:297-303 `EXIT_LABEL = { cat: t.market.catAll, when: t.common.rangeAll, product: t.market.catAll, q: t.common.clearSearch, out: t.common.all }`. Rendered at :418-430 with no FilterGroupKey; only `cat` gets a glyph (:427). src/lib/query/empty.ts caps exits at MAX_EXITS = 3. src/components/ui/filter-pill.tsx:261-266 documents this exact defect: 'the bar renders two identical "Any" pills side by side and neither says what it clears'.

### S07-results-07 · 🟡 medium · 🕓 unverified → S07-23 · button
**'Clear search' controls in the search-miss state** — `/results?q=…`

Two controls with the same label ('Clear search', from two different keys) do different things: one silently wipes the player's filters and sort. The 'no results match' sentence is also printed twice, one above the other.

*Evidence:* src/app/results/page.tsx:420-428 exit pill id `q` → href `buildHref({ q: "" })` keeps product, topic, window, lens and sort. :486 `<Link href="/results" className="btn btn-ghost btn-sm">{t.market.clearSearchLabel}</Link>` resets every axis plus sort/dir. The duplicated sentence is at :396-400, an aria-live line `No results match "x"` (text-[11px]), repeated as the EmptyState title at :479.

### S07-results-08 · 🟡 medium · 🕓 unverified · textbox · unit: U22
**Search input** — `/results`

The field text is 13px (mono), below the 16px anti-zoom floor, so iOS zooms the page on focus. The component's own header claims the opposite. Android keyboards will also autocapitalise and autocorrect queries (U22).

*Evidence:* src/app/globals.css:1745 `.search-box .input { flex: 1; min-width: 0; font-size: 13px; }` overrides `.input` 14px (:1507). src/components/ui/search-box.tsx:25-27 claims '…focus ring and the iOS 16px rule are inherited'. search-box.tsx:146-158: type=search, enterKeyHint=search, autoComplete=off, and no autoCorrect/autoCapitalize/spellCheck.

### S07-results-09 · 🟡 medium · 🕓 unverified → S07-07 · textbox
**Search clear (×) button** — `/results?q=…`

The clear target is 38×38, below the 40px floor and the 44px phone preference, inside a 46px-tall field.

*Evidence:* src/app/globals.css:1746-1752 `.search-box .clear-btn { … width: 38px; height: 38px; margin-right: 3px; }`, rendered at search-box.tsx:160-167. On phones it is the last control in the group, because SearchHelp is `hidden sm:block` (search-help.tsx:76).

### S07-results-10 · 🟡 medium · 🕓 unverified · textbox · unit: NEW: SearchBox phone pass (clear 44, 16px field, compliant o
**Search field outline and height** — `/results`

The search box's only visible boundary uses the decorative border token, which fails 3:1 non-text contrast. That makes it the faintest outline in the band, next to controls that use the compliant token. It also renders 46px, off the 44 rung, and 2px taller than its ghost.

*Evidence:* src/app/globals.css:1678 `.input-group { … border: 1px solid var(--border); … }`, while `.input` uses `border: 1px solid var(--border-control); /* audit H10 — the input outline is its only boundary (WCAG 1.4.11) */` (:1503). tailwind.config.ts:114-119 says --border is 'DECORATIVE-only … must reach 3:1, which is what --border-control is for'. The sort summary (menu-shell.tsx:86) and Filters trigger (filter-sheet.tsx:311) use `border-border-control`. Height: `.input` height 44 with border-box (globals.css:878, :1500) plus the group's 2px border = 46px; the skeleton draws `h-[44px]` (page.tsx:592).

### S07-results-12 · 🟡 medium · 🕓 unverified · a11y · unit: NEW: /results a11y pass (landmark names, pills, pager, live 
**All filter pills in the results bar and sheet** — `/results`

About 20 pills (lens 4, product 3, when 5, topic 8), each duplicated in sheet and desktop DOM, put aria-pressed on role=link. The attribute is not allowed there (axe aria-allowed-attr), so screen readers either ignore it or announce a toggle on a navigation. It also contradicts the primitive's own documented semantics.

*Evidence:* src/app/results/results-bar.tsx:131-133 `<FilterPill {...p} semantics="toggle" replace scroll={false} />`. src/components/ui/filter-pill.tsx:224-237 renders a next/link `<a>` with `aria-pressed={semantics === "toggle" ? on : undefined}`. filter-pill.tsx:40-42 itself lists '/results\' categories' under the `"tab"` (aria-current) semantics.

### S07-results-13 · 🟡 medium · 🕓 unverified · a11y · unit: NEW: /results a11y pass (landmark names, pills, pager, live 
**Sort control summary and direction button** — `/results`

The visible label ('Newest resolved') is not part of the accessible name, which fails WCAG 2.5.3 Label in Name: voice users cannot say what they see, and screen readers never hear the active sort. The direction button announces a state ('Sorted descending'), not what tapping will do.

*Evidence:* src/components/ui/query-bar.tsx:300 passes `ariaLabel` ('Sort results' via results-bar.tsx:189) to the `<summary aria-label>` at menu-shell.tsx:84. :306 `labelClassName="hidden lg:inline"` leaves only the value 'Newest resolved' visible on phones. :329 direction link `aria-label={dir === "asc" ? ascLabel : descLabel}` → 'Sorted descending'.

### S07-results-14 · 🟡 medium · 🕓 unverified · a11y · unit: NEW: /results a11y pass (landmark names, pills, pager, live 
**Pager** — `/results?page=n`

The current page is conveyed only by colour and border (WCAG 1.4.1). Screen-reader users hear a bare list of numbers with no 'current page' and no pagination landmark.

*Evidence:* src/components/ui/pagination.tsx:216-223 the current page renders `<Control … cls={`${btnBase} ${p === safePage ? btnActive : btnInactive}`}>{p}</Control>` as a Link to itself, with no aria-current and no aria-label. :175 the root is a plain `<div>`, not `<nav aria-label>`.

### S07-results-15 · 🟡 medium · 🕓 unverified → U26 · container
**EmptyState box (no results / search miss)** — `/results`

48px padding on every side (three times the 16px phone rung) squeezes the empty-state copy into a 230px column. The EN body wraps to about 4 lines, SW to about 5, plus a 56px illustration and 20px gaps. The title size 15.5 is off the type ladder.

*Evidence:* src/components/ui/empty-state.tsx:69 `rounded-xl border border-dashed border-border-strong bg-bg-elevated px-8 py-8 text-center` → 48px per side (tailwind.config.ts:222 "8": "48px"). :70 `max-w-[360px] mx-auto`. :78 title `text-[15.5px]`. At 360 the column is 328, so the text measure is 328-96-2 = 230px.

### S07-results-17 · 🟡 medium · 🕓 unverified · layout · unit: NEW: notable-result carousel and card on phones
**Notable carousel height between slides** — `/results`

Swiping or pressing next changes the carousel's height by roughly 23px (labels) plus title and chip-row differences. The whole grid below jumps under the player's finger on every slide change.

*Evidence:* src/app/results/notable-carousel.tsx:85-89 renders every slide with `hidden={i !== current}`, so the container takes the current slide's height. The slide heights vary: page.tsx:550 h2 `text-[18px]` has no line clamp; :539 chip row `flex-wrap` can take 1 or 2 lines; :553-555 the empty-pool bar `height={28} showLabels={false}` is 28px, while :557 the priced bar with `showLabels` adds `.tipbar-labels` (margin-top 8 + ~15px line, globals.css:1465-1471).

### S07-results-21 · 🟡 medium · 🕓 unverified · copy · unit: NEW: terminal market card composition (retire the fake butto
**Resolved grid card and notable card: verdict repetition and missing resolution date** — `/results`

The verdict is stated four times on each card, but the one thing an archive row needs, when it resolved, is never shown. A player cannot check 'Newest resolved' order or the Today/7 days window against anything on screen.

*Evidence:* market-card.tsx:335-337 chip 'RESOLVED'; :369-370 'RESULT' + 'YES' at 28px; :443-445 ghost pill '✓ Resolved YES'; page.tsx:460 meta timeLeft = `${t.market.resolvedOutcome} ${outcomeWord(...)}` → 'Resolved YES'. The archive sorts and filters by resolution time (src/lib/results/archive.ts:186-196 `resolvedAtMs`; the When window applies to it), but no date is rendered on either card type (page.tsx:519-566, market-card.tsx:449-463).

### S07-results-22 · 🟡 medium · 🕓 unverified → S07-03 · copy
**Swahili and Chinese terms and typos on /results** — `/results`

In Swahili the same card uses two different words for one state. The singular search count is misspelt ('linaingana' should be 'linalingana'). The carousel arrows are named like wizard navigation rather than previous/next result.

*Evidence:* 'Resolved' has two SW words on one card: `t.market.statusResolved` 'Imekamilika' (chip market-card.tsx:250, ghost :444) vs `t.market.resolvedOutcome` 'Imetatuliwa' (meta page.tsx:460, notable chip :545). `t.common.settled` is also 'Imekamilika' (page.tsx:350, :562). Typo: sw `results.resultMatch` = 'tokeo linaingana' against plural `results.resultsMatch` 'matokeo yanalingana'. 'Notable' has two terms: `results.notableResult` 'Matokeo mashuhuri' vs `market.showResultN` 'tokeo maarufu' (ZH '值得关注的结果' vs '精选结果'). Carousel labels (page.tsx:438-439): `t.common.back` 'Rudi'/'返回' and `t.common.next` 'Endelea'/'下一步' mean 'go back' and 'continue/next step'.

### S07-results-23 · 🟡 medium · 🕓 unverified · number · unit: NEW: one number grammar on /results (money and counts)
**Money and count formatting across the page** — `/results?product=UPDOWN`

Under ?product=UPDOWN the same total prints as '11112 markets' in the bar, '11112' in the pill, and '1–12 OF 11,112' in the pager on one screen. The settled pool of the notable card is compacted while the identical figure on grid cards is full. Card predictor grouping follows the device locale and can differ from the server.

*Evidence:* Money: grid card `formatTzs(volume)` → 'TZS 1,234,567' (market-card.tsx:450); notable card `formatTzsCompact(...)` → 'TZS 1.2M' (page.tsx:562). Counts: pill `{count}` raw (filter-pill.tsx:253); bar phrase `String(resultCount)` (results-bar.tsx:121); tally raw `winsIn()` (page.tsx:327-329); search line raw `${totalCount}` (:399); notable `{m.predictorCount}` raw (:563); pager `total.toLocaleString()` (pagination.tsx:177); card `predictors.toLocaleString()`, client-side device locale (market-card.tsx:411). src/lib/utils.ts:217-219 `formatNumber` (TZ_NUMBER) is the platform grouping, and :227-230 rule raw toLocaleString out. Production held 11,112 UPDOWN rows (archive.ts:70-72).

### S07-results-26 · 🟡 medium · 🕓 unverified · a11y · unit: NEW: /results a11y pass (landmark names, pills, pager, live 
**Resolved card link accessible name** — `/results`

Screen readers read each card as one long link: 'RESOLVED SPORTS <title> RESULT YES 12 predictors Resolved YES TZS 1,234,567 Resolved YES Share market Details'. It also contains a nested interactive element.

*Evidence:* src/components/markets/market-card.tsx:524 `<Link data-row-id={id} href=… className="mcardp group">` has no aria-label, whereas the live card sets `aria-label={title}` (:510). The link contains the share `<button aria-label={t.dialog.shareMarket}>` (share-button.tsx:83-90) plus every text node on the card.

### S07-results-32 · 🟡 medium · 🕓 unverified → D26 · state
**Loading compositions: loading.tsx, then ResultsSkeleton, then content** — `/results`

A navigation into /results shows up to three different layouts in sequence, each reflowing the page: the route loading.tsx, then the in-page Suspense fallback, then the content. loading.tsx is missing the entire filter bar. This extends D26/U25 with a third composition and scale-misreading comments.

*Evidence:* src/app/results/loading.tsx:10-11 header ghost `h-3`(16) + `mt-1`(4) + `h-7`(40 on this scale) = 60px, vs the real header ≈38px (donut size 38, page.tsx:319). :19 a 96px control ghost beside search that does not exist. There is no query-bar ghost at all, vs a real sticky bar ≈ 10+44+8+44+10 = 116px. :23 `grid … gap-3` (16) vs `.market-grid` gap 14 (globals.css:3003). :25 cards `rounded-md` (8) `height: 220` vs the real card 347px (MARKET_CARD_H) with radius 16. Comments misread the scale: :31 'The h-4 height is a default key and reads as written' (h-4 = 20px, tailwind.config.ts:217); :39-40 '3px-tall micro label' (h-3 = 16px). ResultsSkeleton (page.tsx:571-651) is a second, different ghost: search 44 vs a 91px band, cards 220 with `rounded-md`.

### S07-results-33 · 🟡 medium · 🕓 unverified · container · unit: U26
**Results error boundary (RouteError)** — `/results (archive read fails)`

On a 360×640 budget phone the recovery actions ('Try again', 'Back to markets') fall below the fold, pushed down by 128px of empty padding. The EN body uses internal jargon that the other locales do not carry.

*Evidence:* src/app/results/error.tsx:17-23 → src/components/ui/route-error.tsx:107 `min-h-[60svh] … px-5 py-12` → 24px sides and 128px top and bottom (tailwind.config.ts:225 "12": "128px"). Stack: FiftyMark 64 (:110), mt-5 24, medallion 44 (:116), mb-3 16, eyebrow, mt-2 12, h1 `text-title-lg` 28/34 (:124, ~2 lines), mt-3 16, body 13px (:127, EN ≈5 lines), mt-6 32, two stacked btn-md 44 with `gap-2.5` 10 (:135). Total ≈ 750px. EN `error.pageHitSnagBody` ends 'captured in our append-only audit log'; SW omits that clause.

### S07-11 · ⚪ low · 🕓 unverified · container · unit: NEW: filter sheet on phones (padding, group geometry, reach)
**Filters sheet panel padding** — `/results (Filters sheet open)`

The sheet's column is off the page column by 5px and wastes 8px of width on a 320 phone.

*Evidence:* .kp-fsheet-panel computed padding is 12/20/16/20 (globals.css:3347, --sp-5). The sheet title and groups start at x=21, width 318. The page content behind it (cards, bar) starts at x=16, width 328. The CSS comment's premise that the page gutter is 20 does not hold on /results.

### S07-12 · ⚪ low · 🕓 unverified · copy · unit: NEW: /results copy pass (category, state words, plurals, SW 
**Filters sheet title (dialog name)** — `/results (Filters sheet open)`

The dialog is named after the page, not the job. A screen reader announces 'Results dialog' for a filter panel.

*Evidence:* results-bar.tsx:202 passes title={t.results.title}. The sheet heading, and therefore the dialog's aria-labelledby name, is 'Results' / 'Matokeo'. The /markets sheet uses t.market.filtersTitle ('Filter markets').

### S07-14 · ⚪ low · 🕓 unverified → D18 · filter
**Sort value at 320 — /results instance of known D18** — `/results`

The active sort cannot be read at 320 on /results. It is the same QuerySort as the /markets instance filed as D18.

*Evidence:* The sort value span 'Newest resolved' has scrollWidth 105 vs clientWidth 71 and renders 'Newest r…'. The summary is 110 wide at x=16 and the direction link sits at x=126. At 360 EN and SW the value fits (105/105, 68/68).

### S07-16 · ⚪ low · 🕓 unverified · layout · unit: NEW: notable-result carousel and card on phones
**'NOTABLE RESULT' label in the notable card chip row** — `/results`

An orphaned right-aligned label adds about 32px. It repeats the carousel region's aria-label.

*Evidence:* Chips SPORTS (y=519) and RESOLVED · YES (y=518) sit on row 1. The ml-auto label 'NOTABLE RESULT' (page.tsx:546) wraps to its own row at y=550, x=192-319, right-aligned and alone, in EN and SW at 360. At 320 the chat bubble covers it. ZH fits on one row.

### S07-17 · ⚪ low · 🕓 unverified · container · unit: NEW: notable-result carousel and card on phones
**Notable card vs grid card geometry** — `/results`

Two card compositions for the same object (a settled market) stack on one scroll. The notable card's 24px padding is off the phone rung.

*Evidence:* The notable card (a.group, page.tsx:536) has padding 24px on all sides, a hand-typed title text-[18px] and radius 16. Directly below, grid cards (.mcardp) have padding 14/15/13/15 and a 15px title. Notable text starts at x=41; grid text at x=32.

### S07-19 · ⚪ low · 🕓 unverified · copy · unit: NEW: /results copy pass (category, state words, plurals, SW 
**Notable card meta line** — `/results`

Wrong plural for 1, and capitalisation differs from the grid and ticker for the same words.

*Evidence:* Hidden slide 2 DOM text: 'TZS 10K Settled 1 Predictors'. The visible slide reads 'TZS 14K Settled · 3 Predictors'. page.tsx:562-563 always uses t.market.predictors ('Predictors', i18n-dict.ts:716) and t.common.settled ('Settled'), capitalised mid-line. Grid cards use predictorsCountOne/predictorsCount ('1 predictor', '3 predictors', market-card.tsx:411) and the ticker says 'settled'.

### S07-20 · ⚪ low · 🕓 unverified · a11y · unit: NEW: /results a11y pass (landmark names, pills, pager, live 
**Rail nav landmark names** — `/results`

On phones the only rail landmark is misnamed: it holds outcomes, not categories. On desktop two landmarks share one name.

*Evidence:* The visible outcome-lens nav (All/YES/NO/Voided) is named 'Market categories' (results-bar.tsx:173, t.results.categoriesAria; ZH '市场类别'). The lg topic nav (results-bar.tsx:233) has the same name. The file header (results-bar.tsx:19-21) says the duplicate-name bug was fixed.

### S07-21 · ⚪ low · 🕓 unverified → S07-results-13 · a11y
**Sort direction link (fused ↓)** — `/results`

The link's name describes the current state, but activating it does the opposite (switches to ascending).

*Evidence:* aria-label and title are 'Sorted descending' ('Imepangwa kushuka'), href /results?dir=asc. The glyph is '↑' rotated 180° by [data-dir=desc] (query-bar.tsx:325-339).

### S07-22 · ⚪ low · 🕓 unverified · a11y · unit: NEW: /results a11y pass (landmark names, pills, pager, live 
**Notable carousel arrow names** — `/results`

'Back' reads as browser back and 'next step' as a flow step. Neither says it changes the notable result.

*Evidence:* The arrow buttons (44×44 at x=200 and 300) are named 'Back'/'Next', from t.common.back/next at page.tsx:438-439. SW: 'Rudi'/'Endelea'. ZH: '返回'/'下一步' ('return' / 'next step').

### S07-24 · ⚪ low · 🕓 unverified · filter
**Zero-count lens pills during search** — `/results?q=bitcoin, /results?q=zzqxnomatch`

The strip invites taps that can only produce an empty board.

*Evidence:* 'NO 0' (search bitcoin) and 'All 0 / YES 0 / NO 0' (empty search) are full 44px live links. Each leads to an empty page, although page.tsx:291-296 says exits are only offered where they lead somewhere non-empty.

### S07-25 · ⚪ low · 🕓 unverified · container · unit: NEW: platform pager on phones
**Pager block** — `/results, /results?page=2`

Side padding is off the rung, borders are doubled, alignment is mixed, and a void over 48px sits before the footer.

*Evidence:* The wrapper (page.tsx:471) is 328×153, radius 12, 1px border, mt 32px. The inner Pagination div has padding 16/20 plus its own border-t 1px (pagination.tsx:175), so two 1px lines stack at the top edge. The label '1–12 OF 170' is left-aligned while both control rows are centred. The wrapper bottom is at 3843 and the footer top at 3923: an 80px empty band (ZH: similar).

### S07-26 · ⚪ low · 🕓 unverified · copy · unit: NEW: /results copy pass (category, state words, plurals, SW 
**SW single-search-result line** — `/results?q=<one hit>`

A Swahili typo on the search count line.

*Evidence:* i18n-dict.ts:4065 resultMatch: 'tokeo linaingana'; the plural at :4064 is 'matokeo yanalingana'. The singular is missing the 'l' ('linalingana'). Source evidence only: not observed live, since it needs exactly one hit.

### S07-27 · ⚪ low · 🕓 unverified → D3 · layout
**Chat bubble over result cards — /results evidence for known D3** — `/results, /results?page=2`

Card text and the Details control are covered at rest (known D3 → U7).

*Evidence:* Fixed 52×52 bubble at x=292 y=648 (360) and x=252 y=508 (320). It covers: - the notable title's last word '2026)' at 360 EN (h2 41-319 × 580-670); - 'NOTABLE RESULT' at 320; - 'Details' at 320; - the VOID card's '50%' figure on page 2 at 320; - 'Imetatuliwa H…' and 'Maelezo' at 360 SW.

### S07-28 · ⚪ low · 🕓 unverified → D25 · state
**Topic pill hover fill after tapping Filters — evidence for known D25** — `/results (Filters sheet open, body scrolled)`

A second 'selected-looking' style appears on a pill the player never chose (known D25 → U27).

*Evidence:* After the Filters trigger was tapped at about (243,381) and the sheet body scrolled, the unselected 'Crypto 5' pill (x=21, w=278, y≈367) under the last pointer position painted the hover:bg-bg-overlay fill (filter-pill.tsx:158). The result is a dark filled pill in a sheet whose selection language is outline-only. The tap was emulated by Playwright; Android Chrome keeps :hover after a tap in the same way.

### S07-29 · ⚪ low · 🕓 unverified · a11y · unit: NEW: /results a11y pass (landmark names, pills, pager, live 
**Heading outline** — `/results, /results?page=2`

The heading structure does not match the page: there is no heading for the result list, and levels skip on page 2.

*Evidence:* Page 1: H1 (sr-only 'Results') → H2 (notable title) → 9 × H3 grid titles, so the grid is announced as nested under one notable market. Page 2 has 13 headings: H1 followed directly by 12 × H3, skipping H2.

### S07-30 · ⚪ low · 🕓 unverified → U4 · layout
**Pinned chrome while scrolling results — evidence for U4** — `/results`

On the smallest supported phone, over a third of the screen is controls while reading results (unit U4 compact discovery bar).

*Evidence:* Sticky app header 56 + sticky .kp-discovery-bar 116 (top 56) + fixed bottom nav 65 = 237px of a 640px viewport (37%), plus the 52px chat bubble. About 403px remains for content, less than one 278-312px card plus its gap.

### S07-results-11 · ⚪ low · 🕓 unverified → S07-20 · a11y
**Outcome lens strip <nav> name** — `/results`

On phones, screen readers announce the outcome lens as 'Market categories' ('Aina za masoko'), which is wrong. From lg up, two navs share that name again: the defect the header claims to have fixed.

*Evidence:* src/app/results/results-bar.tsx:173 `<QueryStrip ariaLabel={t.results.categoriesAria}>` wraps the All/YES/NO/Void lens. :233 the desktop topic nav is also `aria-label={t.results.categoriesAria}`. The file header (:19-21) says 'the aria-label BUG IS FIXED, NOT COPIED'. `t.results.outcomes` ('Outcomes' / 'Matokeo' / '结果') exists and is unused.

### S07-results-16 · ⚪ low · 🕓 unverified → S07-17 · container
**Notable result card padding** — `/results`

Two stacked card types use two paddings, 24 and 14/15, neither on the 16 phone rung. On a 328px column the notable card's text measure drops to 278px.

*Evidence:* src/app/results/page.tsx:536 `group relative block overflow-hidden rounded-xl border border-gold-700/40 bg-bg-elevated p-5 lg:p-6` → 24px on phones. Grid cards directly below use `.mcardp { padding: 14px 15px 13px }` (globals.css:3855). Inner rhythm: `mb-3` 16 (:539), `mb-4` 20 (:550), `mt-3` 16 (:561).

### S07-results-18 · ⚪ low · 🕓 unverified → S07-16 · layout
**'Notable result' eyebrow and carousel controls row** — `/results`

(Estimate, confirm on a probe.) At 360 the gold eyebrow wraps onto its own right-aligned line inside the card, while the 56px controls row above the card has nothing on its left. The same words also repeat as the carousel region label. The hand-typed tracking 0.16em drifts from .eyebrow's 0.14em (globals.css:978-1000).

*Evidence:* src/app/results/page.tsx:539 `mb-3 flex flex-wrap items-center gap-2` holds the cat chip, the resolved chip and :546 `ml-auto inline-flex … font-mono text-micro uppercase tracking-[0.16em] font-bold text-gold-300` with a crown icon. Est. at 360 (inner 278px): EN 'SPORTS' ~50 + 'RESOLVED · YES' ~100 + 'NOTABLE RESULT' ~127 + 2×12 gaps = 301 > 278. SW 'IMETATULIWA · HAPANA' + 'MATOKEO MASHUHURI' ≈ 380. notable-carousel.tsx:63 `mb-2 flex items-center justify-end gap-2` holds only arrows and '1 / 3', leaving its left side empty.

### S07-results-19 · ⚪ low · 🕓 unverified → S07-18 · typography
**Hand-typed and off-ladder font sizes on /results** — `/results`

Roughly 20 hand-typed sizes. Three are off both ladders (10.5, 11.5, 15.5). The 9.5px rung is used for body-font chips, although it is reserved for uppercase mono microlabels.

*Evidence:* Off-ladder: notable-carousel.tsx:65 `text-[10.5px]`; globals.css:1485 `.tipbar-lean font-size: 10.5px`; query-bar.tsx:165 `text-[11.5px]`; globals.css:4017 `.mcardp-details font-size:11.5px`; market-card.tsx:433/436 `text-[11.5px]`; empty-state.tsx:78 `text-[15.5px]`; chip.tsx:167-168 sm Chip 9.5/10px in body font uppercase. Hand-typed on-ladder values: page.tsx:324 `text-[10px]`, :396 `text-[11px]`, :550 `text-[18px] lg:text-[22px]`, :561 `text-[11px]`; filter-pill.tsx:116 `text-[13px]`, :248 `text-[11px]`; query-bar.tsx:315 `text-[11px]`, :335 `text-[13px]`; search-box.tsx:184 `text-[11px]`; filter-sheet.tsx:325 `text-[11px]`, :368 `text-[16px]`; pagination.tsx:148 `text-[11px]`; route-error.tsx:127 `text-[13px]`, :130 `text-[11px]`; globals.css:1745 search 13px.

### S07-results-20 · ⚪ low · 🕓 unverified → S07-18 · typography
**Resolved grid card type sizes** — `/results`

Eight to nine distinct sizes inside one card, against the ≤3 rule, including two off-ladder values (9, 11.5). This adds evidence to unit U3 (compact market card), seen through the resolved variant.

*Evidence:* On one resolved card: chip 9px (chip.tsx:162-163); category 10px (globals.css:3913); question 15px (:3916); RESULT caption 9.5px (:3922); verdict 28px (:3919) with % unit 13; predictors 10px (:3929); ghost pill 13px (:3969); meta 11px (:3974); Details 11.5px (:4017).

### S07-results-24 · ⚪ low · 🕓 unverified → S07-19 · copy
**Notable card footer** — `/results`

The footer renders '1 Predictors' and a mid-sentence capital 'Settled'. The two cards also word the same count differently.

*Evidence:* src/app/results/page.tsx:562 `{formatTzsCompact(...)} {t.common.settled}` → 'TZS 1.2M Settled'. :563 `<I.users s={11} /> {m.predictorCount} {t.market.predictors}` → 'Predictors', with no singular. The grid card uses `predictors === 1 ? t.market.predictorsCountOne : t.market.predictorsCount` (market-card.tsx:411).

### S07-results-25 · ⚪ low · 🕓 unverified → S07-04 · button
**Resolved card pseudo-button and Details span** — `/results`

The card shows a full-width, bordered, button-shaped element that is not a control, next to a link-styled span that is not a link. Players tap the 'button' expecting an action. It also restates the verdict (see S07-results-21).

*Evidence:* src/components/markets/market-card.tsx:443 `<div className="btn btn-ghost btn-md justify-center pointer-events-none opacity-85">`, a bordered 40px pill (height pinned by globals.css:3969 `.mcardp-actions .btn { height: var(--tap-min) }`) reading '✓ Resolved YES'. :489-492 `<span className="mcardp-details" aria-hidden>` styled identically to the live card's Details link.

### S07-results-27 · ⚪ low · 🕓 unverified → S07-11 · container
**Filter sheet side padding** — `/results (Filters sheet open)`

The sheet's content edge sits at x=20 while the page behind it sits at x=16: the stated reason for 20 is false for this page. Sheet padding is off the 16 phone rung, and the footer gap is off-scale.

*Evidence:* src/app/globals.css:3347 `.kp-fsheet-panel { padding: var(--sp-3) var(--sp-5) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4)); }` → 12/20/16. The justification at :3337-3341 says '/updown and /markets both lay out inside px-4, which is 20px', but PageContainer pads `px-3` = 16px (src/components/layout/page-container.tsx:106) and the bar pads `px-3` (query-bar.tsx:54). Footer `gap: 10px` (:3370) is off the spacing rungs.

### S07-results-28 · ⚪ low · 🕓 unverified → S07-10 · filter
**Topic group grid inside the sheet** — `/results (Filters sheet open)`

44px topic targets sit only 8px apart, which the sheet's own rule rejects. The longest SW topic plus a two-digit count probably overflows its cell by about 1px (estimate).

*Evidence:* src/app/results/results-bar.tsx:213 `className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-1.5"` → 8px gap, overriding FilterSheetGroup's default, whose comment reads '12px, NOT 8. … between 44px-tall chips it read as one continuous bar' (filter-sheet.tsx:428-431). At 360 the panel content is 320 → two 156px columns. Est. SW 'Hali ya hewa' pill: 16 + glyph 14 + 8 + label ~80 + 8 + count ~13 + 16 + 2 ≈ 157 > 156, inside a `whitespace-nowrap` pill (filter-pill.tsx:111).

### S07-results-29 · ⚪ low · 🕓 unverified → S07-12 · copy
**Filter sheet heading and dialog name** — `/results (Filters sheet open)`

The filters dialog is titled and announced with the page name rather than its job, and it differs from the /markets sheet.

*Evidence:* src/app/results/results-bar.tsx:202 `title={t.results.title}` → h2 'Results'/'Matokeo'/'结果', which names the dialog via `aria-labelledby` (filter-sheet.tsx:356, :368). /markets passes `title={t.market.filtersTitle}` 'Filter markets' (src/components/markets/discovery-bar.tsx:287).

### S07-results-30 · ⚪ low · 🕓 unverified · button · unit: NEW: platform pager on phones
**Pager rows on phones** — `/results?page=n`

Two rows of 44px page targets are only 4px apart, with Previous and Next 4px apart, so a thumb aimed at '›' can land on '‹' or a page number. Control radius 8 is off the 12 control rung.

*Evidence:* src/components/ui/pagination.tsx:196 `flex flex-wrap items-center justify-center sm:justify-end gap-1` → 4px between the numbers row (basis-full, :209) and the arrow row (:201, :228). « ‹ › » sit adjacent with 4px gaps. :148 `btnBase … h-[44px] min-w-[44px] px-2 rounded-md …` → radius 8. src/components/ui/query-bar.tsx:85-100 documents 0px between wrapped 44px rows as the mis-tap mechanism and sets 12.

### S07-results-31 · ⚪ low · 🕓 unverified → S07-25 · container
**Pager wrapper panel** — `/results?page=n`

The panel paints a 2px top edge (its border plus the inner border-t), uses the control radius (12) for a panel, sits 32px below the grid (block rung is 24), and pads 20 at the sides (rung is 16).

*Evidence:* src/app/results/page.tsx:471 `mt-6 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden` → margin 32, radius 12. Inside it, the Pagination root `flex … px-4 py-3 border-t border-border` (pagination.tsx:175) → padding 20/16 plus another top border.

### S07-results-34 · ⚪ low · 🕓 unverified → S07-15 · button
**Notable carousel arrows and dot rail** — `/results`

Dot targets fall below the 40px floor on their horizontal axis. Arrows, dots and swipe are three pagers for three slides, costing about 106px of vertical space on a phone. Navigation chrome wears the money colour.

*Evidence:* src/app/results/notable-carousel.tsx:126 dot `grid h-[40px] w-[24px]`, 24px wide (documented as an open ruling). :63 controls row 44 + mb-2 12 above the card; :118 dot rail mt-2.5 10 + 40 below. That is ≈106px of chrome around one card. Arrows and dots are gold (:132 `var(--gold-400)`, :153 gold border and ink), while query-bar.tsx:225-226 records 'on this platform gold is money and nothing else (test:gold-is-money)'.

### S07-results-35 · ⚪ low · 🕓 unverified · a11y · unit: NEW: /results a11y pass (landmark names, pills, pager, live 
**Notable carousel slides and counter** — `/results`

A screen-reader user pressing Next hears nothing: no slide position and no change announcement.

*Evidence:* src/app/results/notable-carousel.tsx:85-89 slide wrappers are bare `<div hidden aria-hidden>`, with no `role="group" aria-roledescription="slide" aria-label="1 of 3"`. :65-67 the counter span is not aria-live. :118 the dot rail is `aria-hidden` with `tabIndex={-1}` buttons whose `aria-label` is dead.

### S07-results-36 · ⚪ low · 🕓 unverified · icon
**Icon sizes on /results** — `/results`

Seven of eleven icon usages sit off the 16/18/20/24 set (11, 13, 14, 15), so glyph weight varies between neighbouring controls.

*Evidence:* users 11 (page.tsx:563); crown 13 (:547); exit glyph 14 (:427); topic glyphs 14 (results-bar.tsx:160); pager chevrons 14 (pagination.tsx:203-233); sliders 15 (filter-sheet.tsx:313); caret 14 (:336); clear-all x 14 (query-bar.tsx:376); search clear x 15 (search-box.tsx:166); Details chevron 11 (market-card.tsx:486, :491); share 13 (share-button.tsx:103). On-set sizes: header resolved 18 (page.tsx:313), carousel chevrons 16 (notable-carousel.tsx:155), search 16.

### S07-results-37 · ⚪ low · 🕓 unverified · number · unit: NEW: /results a11y pass (landmark names, pills, pager, live 
**Header outcome donut and tally** — `/results`

The donut's void share has no text equivalent. The tally has no heading, so its purpose is unclear to screen-reader and sighted users alike. When every result is void the header shows an unexplained grey circle.

*Evidence:* src/app/results/page.tsx:319 `<OutcomeDonut … voided={voidCount} size={38} />` (Ring svg is aria-hidden, ring.tsx) paints a grey void segment. :324-331 the tally lists only YES/NO per product (`text-[10px]`), has no label, and prints no void count. :235-237 `linesShown` drops products with no YES/NO wins, so an all-VOID result set renders a grey ring with no text at all.

### S07-results-38 · ⚪ low · 🕓 unverified · a11y · unit: NEW: /results a11y pass (landmark names, pills, pager, live 
**Live regions while searching** — `/results?q=…`

Each query change queues three overlapping polite announcements ('2 words', '12 markets', '12 results match "x"').

*Evidence:* search-box.tsx:181-183 echo `<p aria-live="polite">`; query-bar.tsx:160-165 `QueryResultCount aria-live="polite"`; page.tsx:396 `<p aria-live="polite" …>` search count line. All three update on the same debounced keystroke.

### S07-results-39 · ⚪ low · 🕓 unverified → D5 · layout
**Search band to query bar gap (known D5, code evidence)** — `/results`

Known D5 (≈65px gap search→tabs, U9). The code arithmetic shows 69px, which comes from the always-reserved echo row stacking with the band's py-2.5 and the section rung.

*Evidence:* Input bottom → first lens pill top: search-box.tsx:184 echo `mt-1.5 min-h-[17px]` (8+17) + page.tsx:370 `py-2.5` bottom (10) + page.tsx:104 `space-y-5` (24) + query-bar.tsx:83 `pt-2.5` (10) = 69px, 45px of it empty. Above the input: 24 + 10 = 34px.

### S07-results-40 · ⚪ low · 🕓 unverified · number · unit: U3
**Resolved card meta and verdict readout at 320 (SW)** — `/results`

(Estimate.) Nothing clips today, but the CSS contract ellipsises money before time/verdict, against the rule. In SW at 320 a 28px word verdict leaves the 2-line question about 143px, so long SW titles lose most of their text.

*Evidence:* globals.css:3975 `.mcardp-meta > span:not(.dot):not(.mcardp-meta-right) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }` makes the money span (market-card.tsx:450) the element that yields, while `.mcardp-meta-right` is `flex-shrink:0` (:3981) and holds 'Imetatuliwa HAPANA' (est. ≈119px at 11px mono). `.mcardp-pct` 28px mono (:3919) inside `.mcardp-prob { flex-shrink: 0 }` (:3918) renders 'HAPANA' ≈101px. Est. at 320: card inner 258 → title column 258-101-14 = 143px; money room 258-119-7 = 132px, where 'TZS 1,234,567,890' ≈112px still fits.

## S08-info — Leaderboard, fairness, proposals, help, agent, legal

### S08-01 · 🟠 high · 🕓 unverified · number
**/leaderboard ranking table (ScrollX 'Leaderboard', table.admin-tbl min-w-[640px])** — `/leaderboard`

The figure the board ranks by (ROI, the default sort 'Best ROI') and the Resolved count are off-screen on every phone, with no scroll affordance. A player sees a list of names with no numbers.

*Evidence:* At 360 EN the scroller is 328 wide (clientWidth 326) with scrollWidth 640. th ROI starts at x=371 and th RESOLVED at x=501, both past the panel's right edge at 344. PREDICTOR is 298px wide because md:hidden columns still sit inside min-w-[640px]. At 320: clientWidth 286, scrollWidth 640. On load the table shows only #, avatar, handle and tier badge (leaderboard-table-start-360-en.png). ROI and Resolved appear only after scrollLeft=314 (leaderboard-table-end-360-en.png). The scroller has mask-image none, background-image none and ::after none, so nothing shows it scrolls. SW records: ROI cells '26.8', '-3.8' … at x=354, out=true. Source: leaderboard/page.tsx:427-434.

### S08-02 · 🟠 high · 🕓 unverified · number
**/fairness 'Recently resolved' attestation table (ScrollX 'Resolved markets')** — `/fairness`

On the page whose purpose is proving a settlement, the resolution time is clipped mid-number and the source link is hidden. Titles show one or two words, so rows cannot be told apart.

*Evidence:* scrollWidth 554 vs clientWidth 326. th RESOLVED starts at x=323 (w 157) against a panel edge at 344, so the timestamp shows only its first glyph at the edge: '1' in EN, '15' in SW (fairness-360-en__s02.png, fairness-360-sw__s02.png). SOURCE (x=481) is fully off-screen. All 12 market titles are line-clamped into a 95px box (h 39, clipped=true): 'Will Newcastle…', 'Will a goal be scored in th…'. In SW they read 'Je, / Newcastl…' and 'Je, goli / litafungw…' (79px). The officers cell wraps 'One / officer'. Source: fairness/page.tsx:293-363.

### S08-03 · 🟠 high · 🕓 unverified · button
**/help FAQ disclosure summaries (details > summary)** — `/help`

The main interaction on the help page has a 20px tap target on a third to a half of its rows. A thumb landing on the visible row padding does nothing.

*Evidence:* The tappable <summary> is only as tall as its text. Its row padding (py-3 = 16px) sits on <details>, and tapping padding does not toggle. Measured: at 360 EN, 'How do I withdraw winnings?', 'What if a market is voided?' and 'Is the platform fair?' are each 278×20 (row 53). At 360 SW, 4 of 8 are 278×20: 'Nitatoa pesa zangu vipi?', 'Nitatoa dau mapema?', 'Soko likifutwa?', 'Mfumo huu uko sawa?'. At 320 EN, 'Is the platform fair?' is 238×20. Two-line questions are 41px. Opening works (help-faq3-open-360-en.png). Source: help/page.tsx:110-122.

### S08-info-F01 · 🟠 high · 🕓 unverified · layout
**Fairness attestation table (market title, resolved time, source link)** — `/fairness`

On a phone the attestation record truncates every market title to 2–4 words (rows become indistinguishable), cuts the resolution time mid-character at the viewport edge and hides the Source link — the three facts this page exists to prove.

*Evidence:* src/app/fairness/page.tsx:293-364 table in ScrollX; :311 title Link `line-clamp-2`; :353 time `whitespace-nowrap`; :355 Source link. Live 360: region cw 326 / sw 554; MARKET col 131px wide, title link 95.2x39 clamped ("Will at least one Premier…", full title 66 chars); RESOLVED col x 307–464 (only ~19px visible, clipped digit at edge in screenshot); SOURCE col 465–556 fully off-screen. Rows 3–4 and 9–10 both read "Will Newcastle…" / "Will Manchester…".

### S08-info-H01 · 🟠 high · 🕓 unverified · button
**FAQ disclosure <summary> rows** — `/help`

Single-line FAQ questions are 20px-tall tap targets, half the floor; the 16px padding above/below belongs to <details> and does not toggle.

*Evidence:* src/app/help/page.tsx:112 padding sits on the <details> (`py-3`), not on the tap target; :114 `<summary className="... font-display text-[13.5px] ...">` has no min-height. Live 360: summaries 278x20.3 for single-line questions (EN 3 of 8: withdraw, voided, fair; SW 4 of 8) and 278x40.5 for two-line ones.

### S08-info-L01 · 🟠 high · 🕓 unverified · layout
**Leaderboard ranking table (ScrollX + table.admin-tbl)** — `/leaderboard`

The column the board is ranked by (ROI) and Resolved both start beyond the visible 326px box on a phone, so a player sees names with no numbers and nothing signals the table scrolls.

*Evidence:* src/app/leaderboard/page.tsx:434 `<table className="admin-tbl min-w-[640px]">` inside :427 ScrollX. Below md only 4 columns render (#, Predictor, ROI, Resolved; :440-441 are `hidden md:table-cell`) yet the 640px floor stays. Live 360 EN: region clientWidth 326 / scrollWidth 640; th x: # 1–57, PREDICTOR 57–355, ROI 355–484, RESOLVED 485–641. SW: ROI 338–460. Screenshot shows only rank + handle + tier badge; no scroll affordance (scrollx is a thin scrollbar, hidden on Android).

### S08-info-L02 · 🟠 high · 🕓 unverified · copy
**PageRibbon 'Top tier' / 'Best ROI' and podium crown under non-default sort** — `/leaderboard?sort=staked / ?dir=asc`

The ribbon and the podium state 'best' and crown #1 from whatever row the current sort puts first, so a sort change makes the page publish a false best ROI/top tier and crown the worst predictor.

*Evidence:* src/app/leaderboard/page.tsx:320-321 ribbon reads `rows[0]?.tier` and `${rows[0]?.roi.toFixed(1)}%` labelled t.leaderboard.topTier / bestRoi with accent "yes"; :425 `<Podium top={rows} />` crowns rows[0] (:514-518, gold ring + crown :531-532). `rows` is ordered by the chosen sort/dir pushed into the query (:149, LEADER_SORTS roi/net/staked/resolved, parseDir allows asc). With ?dir=asc the lowest-ROI player gets the crown and a green 'Best ROI'; with ?sort=staked 'Best ROI' shows the biggest staker's ROI.

### S08-info-P01 · 🟠 high · 🕓 unverified · button
**VoteControl up/down buttons on proposal cards** — `/proposals`

Up- and down-vote targets are 36x34px, below the 40px floor, and stacked 2px + a 22px score apart, so thumb mis-votes are likely on budget phones.

*Evidence:* src/components/proposals/vote-control.tsx:103-107 inline `width: 36, height: 34`; container gap 2 / padding 3 (:124); buttons stacked vertically with the score between. Rendered on every ProposalCard (src/app/proposals/page.tsx:331). Not visible live: production board is COMING_SOON (0 cards).

### S08-04 · 🟡 medium · 🕓 unverified · link
**Standalone text links: fairness 'Source ↗' cells and agent 'Read the agent terms'** — `/fairness, /agent`

Standalone links far below the tap floor. The Source link is the only way to verify a settlement.

*Evidence:* Fairness: 12 'Source' links, each 55×17 (font-mono 11px, fairness/page.tsx:355). Agent: 'Read the agent terms' is 130×16 at (115,3540) (agent/page.tsx:318). Both are standalone, not inside prose.

### S08-05 · 🟡 medium · 🕓 unverified · link
**FAQ 5 answer (gambling-problem question) helpline number** — `/help`

On a phone, the free statutory helpline given in answer to 'I have a problem with gambling' cannot be tapped to call. The player has to copy it by hand.

*Evidence:* Opened FAQ 5 reads 'Open Profile → Responsible gambling. … self-exclude. 0800 11 0011 (free).' In SW: '… kujizuia. 0800 11 0011 (bure).' The number is plain text appended at help/page.tsx:136, not a tel: link. The footer has it as a tel:0800110011 link; the FAQ answer does not (help-faq5-open-360-sw.png).

### S08-06 · 🟡 medium · 🕓 unverified · filter
**Leaderboard product lens rail (All / Markets / Up & Down)** — `/leaderboard`

Two filter compositions for the same job on neighbouring info pages. On the narrowest phone the leaderboard lens wraps into two rows and pushes the sort control and podium down.

*Evidence:* At 320, 'All 6' (65×44 at 16,318) and 'Markets 4' (100×44 at 89,318) sit on row 1, and 'Up & Down 6' (117×44) wraps to row 2 at (16,370). The lens block becomes 96px tall (leaderboard-320-en__s00.png). The rail is a hand-written 'nav flex flex-wrap' (leaderboard/page.tsx:361) with no result count. /fairness and /proposals use QueryStrip: one scrolling row, fade, result count.

### S08-07 · 🟡 medium · 🕓 unverified · filter
**/fairness lens strip vs result count (known D1, new instance)** — `/fairness`

Same half-chip collision as D1 on /markets, reproduced on the attestation bar in Swahili at 360.

*Evidence:* 'HAPANA 87' is 111×44 at x=202 (ends 313) while the result count 'masoko 170' is at x=275 (69×17). The pill runs under the fade and reads 'HAPA' hard against 'masoko 170'. 'Imebatilishwa 24' is fully off at x=317 (out=true). See fairness-360-sw__s02.png.

### S08-08 · 🟡 medium · 🕓 unverified · copy
**Untranslated accessible names and tier letters in SW** — `/leaderboard, /fairness`

Screen-reader users hear English region names and English tier ids on Swahili pages. Sighted SW players see S/B letters that match no Swahili tier word.

*Evidence:* Live on /leaderboard with lang=sw: role=region aria-label 'Leaderboard' (page.tsx:427); tier badges aria-label 'silver' / 'bronze' in lowercase English (page.tsx:622); badge letters 'S' / 'B' (avatar.tsx letter map). The same page's ribbon names the tier 'Fedha' (Shaba for bronze). /fairness regions 'Provably-fair steps' (fairness/page.tsx:59) and 'Resolved markets' (:293) are hard-coded English.

### S08-09 · 🟡 medium · 🕓 unverified · a11y
**Section titles rendered as <p> (agent, leaderboard, proposals)** — `/agent, /leaderboard, /proposals`

A 5.8-screen page (6.2 in SW) cannot be navigated by headings; screen readers get one heading for the whole agent programme.

*Evidence:* /agent has one heading (H1). 'How it works', 'The seven documents', 'How you are paid' and 'Commission, line by line' are 18px bold <p> elements (agent/page.tsx:220, :240, :303; commission-waterfall.tsx:74), and 'THE REGISTRATION FEE' is an eyebrow <p> (:255). /leaderboard has only H1, with no heading for the podium or table. /proposals has only H1.

### S08-10 · 🟡 medium · 🕓 unverified · container
**Panel padding across S08 (help, fairness, agent, leaderboard podium, legal)** — `/help, /fairness, /agent, /leaderboard, /legal/terms`

No S08 panel sits on the phone rung. Paddings of 20–32 make the pages long (fairness 4.8 screens, agent 5.8, terms 7) and narrow the text column. Sibling glass panels on /agent use two paddings (14 and 20).

*Evidence:* Measured padding: - help FAQ section: 24 (p-5, help/page.tsx:102), 328×611, leaving a 278px text column - help contact cards and quick links: 20 (p-4, :190, :223) - fairness 'How it works': 24 (p-5, fairness/page.tsx:185), 328×962 - agent sections: 20 (p-4), but the stat tiles on the same page are 14 (Stat glass p-3.5, stat.tsx:120) - leaderboard podium: 32/20/20/20 (pt-6 px-4, leaderboard/page.tsx:520) - LegalHeader: 20/24 (px-5 py-4, _components.tsx:59) - legal aside box: 20 - PageRibbon: 16/20

### S08-11 · 🟡 medium · 🕓 unverified · layout
**Legal aside (eyebrow box + stacked LegalNav) before the document** — `/legal/terms`

About 400px of navigation chrome, and the word 'Legal' twice, come before the document. On a 640px phone the reader scrolls past a nav list to reach the terms they opened.

*Evidence:* At 360: - a 328×57 bordered box containing only the eyebrow 'LEGAL' (layout.tsx:32-46), at y=120 - the LegalNav, a 328×247 stack of five 48–49px rows, at y=193 - the LegalHeader at y=472, which repeats the eyebrow 'LEGAL', with the H1 at y=512 At 320 the first viewport ends partway through the title (terms-320-en__s00.png).

### S08-12 · 🟡 medium · 🕓 unverified · card
**Help 'LIVE CHAT · In-app · Tap the chat bubble' contact card** — `/help`

Three identical cards where two are tappable and the third looks the same but does nothing. Its only instruction points at a different control.

*Evidence:* The card is a non-interactive div at 328×147 (16,573): ContactCard without href returns the bare card (help/page.tsx:91-98, :203). It uses the same glass-panel, padding and hover:border-brand-400 (:190) as the Call and Email cards directly above it, which are <a> tel:/mailto: links. There is no button or link record for it. The bubble it points to is at (292,648) 52×52.

### S08-13 · 🟡 medium · 🕓 unverified · typography
**Off-ladder sizes: legal body, FAQ questions, fairness outcome chips, result count** — `/legal/terms, /help, /fairness`

Four sizes outside the closed ladder. The binding legal text is set at a non-ladder 13.5px on budget phones.

*Evidence:* Character histograms: - terms: 13.5px Inter for 5,676 chars EN and 6,018 SW, essentially the whole document (LegalSection, _components.tsx:113) - help: 13.5px Sora 600 for 270 chars, the FAQ questions (help/page.tsx:114) - fairness: 10.5px Inter 700 on the YES/NO/VOID chips, 34 chars EN and 56 SW (chip.tsx:172, base fontSize 10.5) - fairness: 11.5px JetBrains Mono for the result count (query-bar.tsx:165)

### S08-14 · 🟡 medium · 🕓 unverified · typography
**Agent stat tile hints (Stat size xl)** — `/agent`

Full sentences are set in a 10px monospace microlabel style on the page's key three facts.

*Evidence:* The hints 'on every settled position your recruits play' and 'reviewed by a compliance officer' are measured at 10px JetBrains Mono, lowercase (stat.tsx:89, xl hint text-[10px]). Labels are 9.5px uppercase. In SW the hint 'kwa kila dau lililofungwa la wachezaji uliowaleta' runs to the tile edge; at 320 EN 'play' wraps alone (agent-320-en__s00.png).

### S08-15 · 🟡 medium · 🕓 unverified · layout
**Fairness 'How it works': stacked 5-step chain followed by the same 5 steps as a list** — `/fairness`

The same five steps are presented twice in one panel on a phone, adding about 280px before the attestation record.

*Evidence:* Below sm, FairnessChain stacks the five steps as 44px circles with labels (container 286×268 at 37,656; fairness/page.tsx:53-89). The ordered list directly below repeats the same five step names with their bodies (:204-220). The panel is 328×962 at 360 and 288×1067 at 320 (fairness-360-en__s00/s01.png).

### S08-16 · 🟡 medium · 🕓 unverified · card
**Leaderboard podium handles and chat-bubble overlap (known D2 / D3, new evidence)** — `/leaderboard, /agent, /legal/terms`

Known defects confirmed live on S08 routes.

*Evidence:* D2, podium handles: - 360: handle boxes are 57px wide and break mid-word over 2 lines (45px): '@Dhire/sh', '@Libuh/i', '@Jayki/shan' - 320: '@Jaykishan' is 44px wide over 3 lines (68px) D3, chat bubble: - 360 EN: bubble at (292,648) 52×52 covers the #3 ROI '-3.8%' (x 260–299, y 668) and its 'B' tier badge in the first viewport - also covers the agent 'How you are paid' bullets (agent-360-en__s02) and the terms binding-language line (terms-360-en__s00)

### S08-info-A11Y01 · 🟡 medium · 🕓 unverified · a11y
**QuerySort summary accessible name (leaderboard, proposals, fairness)** — `/leaderboard, /proposals, /fairness`

The sort control is announced as 'Top predictors' / 'Filter proposals' / 'Sort' with the current sort value dropped, so a screen-reader user cannot tell what the list is sorted by, and two surfaces name it as something it is not.

*Evidence:* src/components/markets/menu-shell.tsx:274 `aria-label={ariaLabel}` on <summary> replaces its text; src/components/ui/query-bar.tsx:306 hides the key below lg. Leaderboard passes `ariaLabel={t.leaderboard.topPredictors}` (leaderboard/page.tsx:396); proposals passes `t.proposals.filterAria` ("Filter proposals", proposals-bar.tsx:510); fairness passes t.common.sort. Live fairness: summary aria "Sort", visible text "Resolved"; SW aria "Panga", text "Imetatuliwa".

### S08-info-A11Y02 · 🟡 medium · 🕓 unverified · a11y
**Link wrapping Button (nested interactive)** — `/agent, /proposals`

A <button> inside an <a> is invalid interactive nesting: two focusable/announced controls for one action (announced 'link, button'), and inconsistent Enter/Space behaviour.

*Evidence:* src/app/agent/page.tsx:191,192,196,204,207,210,213 `<Link href=…><Button …/></Link>`; src/app/proposals/page.tsx:198-200, 293, 313; src/components/proposals/proposals-state-views.tsx:399-401. Live /agent: both CTA <button>s have parent A.

### S08-info-A11Y03 · 🟡 medium · 🕓 unverified · a11y
**Agent page section titles** — `/agent`

Six visual section headings are paragraphs, so the longest info page has no navigable structure for screen-reader users.

*Evidence:* src/app/agent/page.tsx:220 howTitle, :240 docsTitle, :255 feeTitle, :303 earnTitle and src/components/agent/commission-waterfall.tsx:74 wfTitle are all `<p className="font-display text-title-sm …">`. Live heading outline: only H1 'Become a 50pick Agent' on a 4,552px page.

### S08-info-AG02 · 🟡 medium · 🕓 unverified · state
**'Apply now' submit button (startApplicationAction)** — `/agent (signed-in, eligible)`

On a slow budget-Android connection the step that starts a paid application gives no pending feedback and can be tapped repeatedly.

*Evidence:* src/app/agent/page.tsx:199-201 `<form action={startApplicationAction}><Button type="submit" …>` in a server component with no useFormStatus/loading/disabled state; Button supports `loading` (button.tsx:62-86) but nothing drives it.

### S08-info-C01 · 🟡 medium · 🕓 unverified · container
**EmptyState box padding (fairness, proposals, leaderboard empty branches)** — `/fairness, /proposals, /leaderboard`

Every empty/filter-miss state on these pages pads 48px per side, squeezing SW explanations into a 230px column and exceeding the 16px panel rung.

*Evidence:* src/components/ui/empty-state.tsx:69 `px-8 py-8` = 48px each side on this scale inside `max-w-[360px]`; at a 328px column the text column is 328 − 96 − 2 = 230px; title :78 `text-[15.5px]` (off-ladder). Used at leaderboard/page.tsx:310, fairness/page.tsx:272, proposals/page.tsx:288,300.

### S08-info-F02 · 🟡 medium · 🕓 unverified · filter
**Fairness outcome lens strip vs result count (new instance of D1)** — `/fairness`

Same collision as D1 on a second surface: in Swahili the half-clipped lens runs into the result count and reads as one broken phrase; in English the Voided lens is invisible with nothing to suggest it exists.

*Evidence:* src/app/fairness/fairness-bar.tsx:223-238 QueryStrip + QueryResultCount in QUERY_BAR_ROW1_CLASS. Live SW: strip right edge 259, 'HAPANA 87' pill spans 202–313 so 'HAPA' is cut under the 24px fade, count 'masoko 170' starts at 275 → screenshot reads 'HAPAI masoko 170'. Live EN: 'Voided 24' pill 262–361 lies entirely past the strip edge 252 — no half-chip, so the fourth lens has no visible affordance.

### S08-info-F03 · 🟡 medium · 🕓 unverified · layout
**FairnessChain stacked above the numbered steps list** — `/fairness`

On phones the five steps are listed twice in a row (icon list, then text list), costing ~290px, and the non-scrolling chain adds a hardcoded-English focus stop; `display: contents` on li can drop list semantics.

*Evidence:* src/app/fairness/page.tsx:61 `flex flex-col sm:flex-row` chain renders the 5 step labels; :204-220 `<ol>` repeats the same 5 labels in bold with bodies. Live 360: chain 286x268 then ol 278x547 in one 962px panel (p-5 = 24px). Chain wrapper :56-59 is role=region tabIndex=0 aria-label 'Provably-fair steps' (English in all locales) although cw 286 = sw 286 (never scrolls); :68 `<li className="contents">`.

### S08-info-H02 · 🟡 medium · 🕓 unverified · link
**Gambling-problem FAQ answer (faq5) helpline number** — `/help`

The one answer for a player at risk gives the free national helpline as untappable text with no lead-in, while the legal page makes it a tel: link.

*Evidence:* src/app/help/page.tsx:136 `{key === "faq5" && ` ${HELPLINE()} (${t.common.free}).`}` — plain text. Live (details opened in-page): EN "…or self-exclude. 0800 11 0011 (free)." links: 0; SW "…au kujizuia. 0800 11 0011 (bure)." links: 0. The legal RG page renders the same number as `<a href={`tel:${HELPLINE_TEL()}`}>` (legal/responsible-gambling/page.tsx:93).

### S08-info-L03 · 🟡 medium · 🕓 unverified · state
**Tier badge tooltip (Tooltip around TierBadge)** — `/leaderboard`

On tap/focus the tier explanation opens as a single non-wrapping line centred on the badge and runs off the screen edge (clipped by body overflow-x: clip), so the threshold text is unreadable on phones.

*Evidence:* src/app/leaderboard/page.tsx:621-625 Tooltip; src/components/ui/tooltip.tsx:82 `tabIndex={0}`; globals.css:1905-1920 `.kp-tooltip-popover { white-space: nowrap; left: 50%; transform: translateX(-50%) }`. Live (forced visible): podium #2 tooltip x=-13 (off left), podium #3 right=385 EN / 408 SW vs viewport 360; EN tierSovereign (i18n-dict.ts:1766, 53 chars) would be ~380px wide, wider than the viewport. 9 extra tab stops with no role (6 rows + 3 podium).

### S08-info-L04 · 🟡 medium · 🕓 unverified · a11y
**Tier badge accessible name** — `/leaderboard`

Screen readers get the English lowercase token ('silver', 'sovereign') in every locale, on a generic span where aria-label is not reliably announced, and never the localized threshold text.

*Evidence:* src/app/leaderboard/page.tsx:622 `<span aria-label={tier}>` (raw id) and src/components/ui/avatar.tsx:54 `title={tier}`; the localized description lives in role=tooltip (:tooltip.tsx:83) with visibility:hidden and no aria-describedby. Live SW: tierAria = "silver" while the visible tier word is "Fedha".

### S08-info-LG01 · 🟡 medium · 🕓 unverified · layout
**Legal aside (eyebrow box + LegalNav) stacked above the article** — `/legal/responsible-gambling (all /legal/*)`

On a phone the whole first screen of every legal document is navigation chrome; the policy itself starts ~820px down.

*Evidence:* src/app/legal/layout.tsx:34 `grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6`; :36 eyebrow box `p-4`; :60 LegalNav 5 links py-3. Live 360: aside 328x320 (eyebrow box 57px for the single word LEGAL, 5 nav rows 48–49px), gap 32, article starts y=472, LegalHeader h=236, first section heading y=822 — the policy text starts below the 780px fold (further on 640px-tall phones).

### S08-info-LINK01 · 🟡 medium · 🕓 unverified · link
**Small standalone links (fairness Source, agent terms, legal RG settings)** — `/fairness, /agent, /legal/responsible-gambling`

Standalone navigation links (not inline prose) are 16–39px tall tap targets.

*Evidence:* fairness/page.tsx:355 Source link `text-[11px]` → live 54.6x16.5; agent/page.tsx:318 terms link → live 130.5x16; legal/responsible-gambling/page.tsx:65 RG settings link → live 196x16. Fairness title link :311 → live 95x39.

### S08-info-P02 · 🟡 medium · 🕓 unverified · card
**ProposalCard footer row (proposer · View market · earned · chevron)** — `/proposals`

For a signed-in proposer whose proposal earned a bonus, the footer's non-shrinking spans exceed the card width and spill past the card edge; two arrows (→ and ›) sit in one row.

*Evidence:* src/app/proposals/page.tsx:340 `<div className="mt-2.5 flex items-center gap-3.5 font-mono text-[11px] …">` with no flex-wrap/min-w-0; children :341 'by {masked}', :342 'View market →', :343 '+{n} earned' (signed-in owner only), :344 chevron. Card content width at 360: 328 − 2x14 (p-3.5) − 2 − 44 (vote box) − 16 (gap-3) ≈ 238px; EN with earned ≈ 66+14+102+14+102+14+14 ≈ 326px.

### S08-info-P03 · 🟡 medium · 🕓 unverified · copy
**ProposalCard 'View market →' label** — `/proposals`

The card promises 'View market' but tapping it opens the proposal detail, not the market — a misleading label on LISTED/RESOLVED proposals.

*Evidence:* src/app/proposals/page.tsx:332 the whole card is `<Link href={`/proposals/${p.id}`}>`; :342 shows t.proposals.viewMarket ('View market' / 'Tazama soko') inside it. The market link only exists on the detail page (src/app/proposals/[id]/page.tsx:145 `/markets/${p.publishedMarketId}`).

### S08-info-P04 · 🟡 medium · 🕓 unverified · number
**Proposer bonus and prize amounts** — `/proposals`

The same proposal reward is written three ways (bare number with '+', 'TZS n.' in a sentence, italic display-face TZS), breaking money formatting and the mono rule.

*Evidence:* src/app/proposals/page.tsx:343 `+{formatNumber(p.bonusGrantedTzs)} {t.proposals.earned}` → '+1,000 earned' (no TZS); :291 empty state uses formatTzs → 'TZS 1,000'; src/components/ui/propose-promo.tsx:454-456 prize `formatTzs(cfg.prizeTzs)` inside `font-display italic` text (not mono/tabular).

### S08-info-P05 · 🟡 medium · 🕓 unverified · copy
**Proposals SW/ZH strings and assembled sentences** — `/proposals`

Swahili players read a misspelling and wrong word order on every card, and the Chinese empty-state sentence has broken punctuation because it is assembled by concatenation.

*Evidence:* src/lib/i18n-dict.ts:4110 SW `earned: "umepataa"` (typo, 'umepata'); :4111 SW `dAgo: "siku zilizopita"` rendered by src/app/proposals/page.tsx:83 as `${d} ${dAgo}` → '3 siku zilizopita' (SW order is 'siku 3 zilizopita'); :291 body concatenates `${noProposalsBody} ${noProposalsReward} ${formatTzs(prize)}.` → ZH '成为第一个提议市场的人。 获批准的提议可获得奖金 TZS 50,000.' (space after 。 and ASCII '.'; also prints 'TZS 0.' if prizeTzs is 0).

### S08-info-PS01 · 🟡 medium · 🕓 unverified · container
**Proposals DISABLED state (ProposalsUnavailable)** — `/proposals (state DISABLED)`

On a phone the 'not available' notice opens with ~257px of empty space above its icon and 128px inside the bottom of the box — voids far beyond the 48px section rung.

*Evidence:* src/app/proposals/page.tsx:68 hand-typed shell `mx-auto max-w-[1080px] px-3 lg:px-6 py-12` (py-12 = 128px on this scale); src/components/proposals/proposals-state-views.tsx:383 card `px-6 py-12` (32px / 128px). The plate therefore sits 128 + 1 + 128 = 257px below the app header.

### S08-17 · ⚪ low · 🕓 unverified · button
**Agent sign-in CTAs ('Sign in to apply' primary, 'Create account' ghost)** — `/agent`

Two stacked phone CTAs of different widths and a large dead area to their right. The row reads unfinished and the hit area differs from the painted button.

*Evidence:* Both Link wrappers stretch to 328×48, but the buttons inside are inline: 178×48 and 153×48, stacked at y 633 and 693, left-aligned with ragged right edges (agent/page.tsx:188-193; agent-320-en__s01.png).

### S08-18 · ⚪ low · 🕓 unverified · number
**ROI and deduction sign characters** — `/leaderboard, /agent`

Signed figures are formatted two ways across S08, and one number appears with and without its sign on one screen.

*Evidence:* Leaderboard podium and table print negative ROI with ASCII hyphen U+002D ('-3.8%', '-15.8%'), from `(r.roi >= 0 ? '+' : '') + toFixed` at page.tsx:470 and :596. The agent waterfall uses U+2212 ('−TZS 13,000', commission-waterfall.tsx:155). The ribbon shows 'BEST ROI 26.8%' without the '+' that the podium and table print for the same player ('+26.8%', page.tsx:321).

### S08-19 · ⚪ low · 🕓 unverified · number
**Support phone number grouping** — `/help`

Two phone numbers on one page use different grouping. The ungrouped 10-digit string is hard to read and copy.

*Evidence:* The help Call card and footer show the operator desk as '0769777877', ungrouped (help/page.tsx:79). The footer helpline directly below it is grouped '0800 11 0011'. The tel: href is +255769777877.

### S08-20 · ⚪ low · 🕓 unverified · icon
**Glyph sizes on info pages** — `/help, /agent, /fairness, /leaderboard`

Six glyph sizes (11, 13, 14, 15, 16, 22) with none of the 18/20/24 steps; row glyphs and chevrons don't align across pages.

*Evidence:* SVG census: - help: 15×15 ×14 (contact, FAQ and quick-link glyphs) and 13×13 ×8 (FAQ chevrons) - agent: 14×14 ×10 and 16×16 ×1 - fairness (source): officers glyph s=11 and external-link s=11 (page.tsx:349, :357) - leaderboard (source): HotChip I.hot s=11 (:505), crown s=22 (:532)

### S08-21 · ⚪ low · 🕓 unverified · container
**Agent 'The seven documents' list (box in box)** — `/agent`

Nested boxes with a second radius (8 inside 16) make a static checklist read chunky and add ~150px.

*Evidence:* A glass-panel section (328×562, padding 20, radius 16) holds 7 bordered, filled rows (li 286×44, padding 12/16, radius 8, bg overlay/40; depth 1 inside the panel). Text is inset 37px from the panel edge (agent-360-en__s01.png).

### S08-22 · ⚪ low · 🕓 unverified · layout
**Empty band between the last content block and the footer** — `/leaderboard, /fairness, /proposals, /help, /agent, /legal/t`

Every info page ends with a void larger than the section rhythm.

*Evidence:* help: PageContainer bottom 1757 → footer top 1805 (footer mt-8 = 48, public-footer.tsx:102), plus the container's own py-6 (32) ≈ 80px visible void. agent: 3589 → 3637, same stack. Screenshots show about 80px on leaderboard (s01), fairness (s03) and agent (s04), and about 95px after '0 proposals · 0 votes' on proposals (s00).

### S08-23 · ⚪ low · 🕓 unverified · state
**/proposals COMING_SOON state: badge + banner + zero totals** — `/proposals`

Two designs state one condition, and a zero count describes a board that does not exist yet.

*Evidence:* The first viewport says 'coming soon' twice: the hero ProposalsStateBadge 'COMING SOON' (proposals/page.tsx:195) and ProposalsStateBanner 'Proposals are coming soon' (328×117 at 16,362; :209-213). It is followed by '0 proposals · 0 votes' (:224), shown even though the board cannot take proposals, then about 95px of empty space. In SW: 'INAKUJA' plus 'Mapendekezo yanakuja hivi karibuni' plus '0 mapendekezo · 0 kura'.

### S08-24 · ⚪ low · 🕓 unverified · copy
**Fairness 'How it works' regulatory citation caption** — `/fairness`

An internal statute and recommendation reference is shown as a player-facing caption and is not localised. It means nothing to a player and adds a line.

*Evidence:* A literal 'FATF R.10 · POCA CAP 423 §16' in 11px uppercase mono (fairness/page.tsx:188) sits under the section title. It is the same string in SW (fairness-360-sw__s00.png).

### S08-25 · ⚪ low · 🕓 unverified · layout
**LegalNav active row label offset** — `/legal/terms`

The selected label shifts off the column's text edge.

*Evidence:* The active row adds border-l-2 inside the same px-3.5 (legal-nav.tsx:124-128), so 'Terms' / 'Masharti' starts about 2px right of 'Privacy' / 'Faragha' and the other rows (terms-360-en__s00.png: label x ≈ 33 vs 31 CSS px).

### S08-26 · ⚪ low · 🕓 unverified · layout
**Pinned chrome while reading the fairness table** — `/fairness`

The attestation table is read through a 400px window on small phones, and its column headers disappear under the sticky bar.

*Evidence:* Pinned elements: header sticky 56, kp-discovery-bar sticky at top 56 (h 116), and the bottom nav fixed at 65. That is 237 of 640px (37%) at 320×640 and 30% at 360×780 while scrolling the table. The table's own thead scrolls away under the bar (fairness-360-en__s03.png).

### S08-info-AG01 · ⚪ low · 🕓 unverified · button
**Agent guest CTAs (Sign in to apply / Create account)** — `/agent`

Two stacked 48px CTAs of different widths read as unaligned chrome rather than a primary/secondary pair on a phone.

*Evidence:* src/app/agent/page.tsx:188 `flex flex-col gap-2 sm:flex-row`; :191-192 `<Link><Button size="lg">` — the Button hugs its label inside the stretched Link. Live 360: 'Sign in to apply' 178.4x48 and 'Create account' 153x48, both left-aligned at x=16 (ragged stack); screenshot shows the ghost button half under the bottom nav fold.

### S08-info-AG03 · ⚪ low · 🕓 unverified · typography
**Agent stat tile hints and page subtitle** — `/agent`

Full sentences are set at 10px mono (below the 12.5px reading floor and not uppercase microlabels), and a four-line explanatory paragraph is set in italics meant for a short tagline.

*Evidence:* src/components/ui/stat.tsx:188 size xl hint `text-[10px]` mono; live hints 'on every settled position your recruits play' and 'reviewed by a compliance officer' at 10px (SW i18n-dict.ts:4559 'kwa kila dau lililofungwa la wachezaji uliowaleta'). src/app/agent/page.tsx:161 passes the 3–4 line heroSub as PageHeader subtitle → page-header.tsx:177 `text-[13px] italic`; live 328x78 italic block.

### S08-info-AG04 · ⚪ low · 🕓 unverified · number
**'What you earn' tile value** — `/agent`

A rate phrase is dressed as a money figure (mono + gold + nowrap); gold is reserved for money and the nowrap phrase can overflow a narrow tile in longer locales.

*Evidence:* src/app/agent/page.tsx:171 `value={<span className="amount">{fill(t.agent.statEarnValue, { pct })}</span>}` with tone gold; live renders '10% of the net fee' 18px JetBrains Mono gold (SW '10% ya ada halisi', i18n-dict.ts:4558). `.amount` forces `white-space: nowrap` (globals.css:945).

### S08-info-C02 · ⚪ low · 🕓 unverified · container
**Phone padding and block gaps off the rungs (evidence for U18)** — `/leaderboard, /fairness, /help, /agent, /proposals, /legal/*`

Six different panel paddings (14/16/20/24/32) and 32px block gaps on phones instead of 16 padding / 24 between blocks.

*Evidence:* Live 360: block gap 32px (space-y-6: leaderboard/page.tsx:305, agent/page.tsx:160, proposals/page.tsx:167, fairness/page.tsx:174; legal/layout.tsx:34 gap-6); PageHero p-5 = 24px (page-hero.tsx:323; help, fairness, proposals); fairness how panel 24px (:185); help FAQ panel 24px (help/page.tsx:102); PageRibbon 16/20 (page-ribbon.tsx:37); podium 32/20/20 (leaderboard/page.tsx:520); agent panels 20px; Stat glass 14px (stat.tsx:219); ProposalCard 14px (proposals/page.tsx:330); LegalHeader 20/24 (_components.tsx:265).

### S08-info-C03 · ⚪ low · 🕓 unverified · container
**Pager wrapper around Pagination (double top border)** — `/leaderboard, /fairness, /proposals`

Box-in-box: the wrapper's 1px top border sits directly on the pager's own border-t (2px line), a 12px-radius box around 8px buttons (control radius is 12).

*Evidence:* leaderboard/page.tsx:490, fairness/page.tsx:367, proposals/page.tsx:277 `rounded-lg border border-border bg-bg-elevated/40 overflow-hidden` wraps Pagination whose root is `… px-4 py-3 border-t border-border` (pagination.tsx:175); buttons `rounded-md` 8px (:148). Not live-visible (≤ 12 rows on production boards).

### S08-info-CP01 · ⚪ low · 🕓 unverified · copy
**Fairness outcome vocabulary (lens pills vs outcome chip)** — `/fairness`

One rail mixes title case and all caps, and the same state is 'Voided' on the pill but 'VOID' on the row chip.

*Evidence:* src/app/fairness/fairness-bar.tsx:157-160 lenses: t.common.all 'All', outcomeWord YES/NO (uppercase), t.common.voided 'Voided'; page.tsx:323 chip uses outcomeWord(…'VOID') → live chip 'VOID'. Live lens row: 'All 170 · YES 59 · NO 87 · Voided 24'.

### S08-info-CP02 · ⚪ low · 🕓 unverified · copy
**Duplicate 'Legal' eyebrow** — `/legal/*`

On a phone the word LEGAL is printed twice in two bordered boxes before the document title.

*Evidence:* src/app/legal/layout.tsx:36-50 aside box prints EYEBROW[locale]; responsible-gambling/page.tsx:212 LegalHeader eyebrow={EYEBROW[locale]} again (_components.tsx:291). Live 360: 'LEGAL' at y≈148 and again at y≈500 (screenshot).

### S08-info-CP03 · ⚪ low · 🕓 unverified · a11y
**Hardcoded English region names** — `/leaderboard, /fairness`

Focusable scroll regions announce English names to Swahili/Chinese screen-reader users.

*Evidence:* leaderboard/page.tsx:427 `<ScrollX label="Leaderboard">`; fairness/page.tsx:293 `label="Resolved markets"`; :59 `aria-label="Provably-fair steps"`.

### S08-info-F04 · ⚪ low · 🕓 unverified · filter
**Empty-state exit pills rank (fairness vs proposals)** — `/fairness, /proposals`

The 'way out of an empty result' is drawn in two type treatments on sibling boards, and the proposals exits lack the data-chip instrument hook.

*Evidence:* fairness/page.tsx:247-258 exits `rank="secondary"` (mono 11.5px) with testId; proposals/page.tsx:255-263 exits default `rank="primary"` (13px semibold) + glyph and no testId. Same job, same component.

### S08-info-H03 · ⚪ low · 🕓 unverified · state
**Live chat contact card (non-interactive, styled as a link card)** — `/help`

The third support channel looks tappable like its siblings but does nothing; the player has to find the floating bubble themselves.

*Evidence:* help/page.tsx:91-99 ContactCard without href → :203 returns the bare card with `hover:border-brand-400` (:190), identical to the two <a> cards above it. Live: chatBubble present, card 328x146.5 'LIVE CHAT · In-app · Tap the chat bubble' rendered as DIV.

### S08-info-IC01 · ⚪ low · 🕓 unverified · icon
**Icon plates and glyph sizes** — `/help, /agent, /proposals`

Two plate compositions on one page, plates off the 40/32/24 rungs (30, 42) and glyphs off the 16/18/20/24 set.

*Evidence:* help/page.tsx:192 contact plate `h-7 w-7` (40px) bordered rounded-md 8px vs :227 quick-link plate 40px unbordered rounded-md (live bw 1px vs 0px on one page); agent/page.tsx:225 step circles `h-[30px] w-[30px]` (live 30x30); propose-promo.tsx:442 IconPlate size 42; glyphs 15/13/12/11/14 (help :76,:120; agent :244 idCard 14; leaderboard :505 hot 11).

### S08-info-L05 · ⚪ low · 🕓 unverified · filter
**Leaderboard product rail + sort composition** — `/leaderboard`

The only board whose lens and sort are not one bar: rail and sort float 32px apart as two blocks, with no result count, and would wrap with 8px between 44px rows (SW row already ends at 333/344px).

*Evidence:* leaderboard/page.tsx:361 bare `<nav className="flex flex-wrap items-center gap-1.5 -mx-1 px-1">` and :392 a separate QUERY_BAR_ROW2_CLASS row, not inside QUERY_BAR_CLASS and with no QueryResultCount; live rail 336x44 at y318, sort row at y394 (32px gap between them from space-y-6). gap-1.5 is 8px, which the repo itself replaced with 12px for wrapping 44px rows (query-bar.tsx:85-102, filter-sheet.tsx:428-431).

### S08-info-LINK02 · ⚪ low · 🕓 unverified · link
**Legal RG settings link colour and element** — `/legal/responsible-gambling`

Two link colours on one page, and the RG settings link wears the money gold; the raw <a> forces a full document reload.

*Evidence:* src/app/legal/responsible-gambling/page.tsx:65,121,175 `<a href="/profile/responsible-gambling" className="text-gold-300 …">` (raw <a>, full reload) vs :93-95 links `text-brand-300`. Live computed colours: RG link oklab(0.86 0.011 0.109) gold vs others oklab(0.82 -0.017 -0.119) royal.

### S08-info-N01 · ⚪ low · 🕓 unverified · number
**ROI sign and minus glyph (ribbon, table, podium)** — `/leaderboard`

The same ROI is printed '26.8%' in the ribbon and '+26.8%' in the table, and negatives use a hyphen instead of the platform's real minus.

*Evidence:* leaderboard/page.tsx:321 ribbon `${roi.toFixed(1)}%` (no '+'); :470 and :596 `{roi >= 0 ? "+" : ""}{roi.toFixed(1)}%` → negative uses ASCII hyphen. Live 360: ribbon 'BEST ROI 26.8%' vs table '+26.8%'; podium #3 '-3.8%'. Platform money signs use U+2212 (utils.ts:63, 213).

### S08-info-N02 · ⚪ low · 🕓 unverified · number
**Dates in SW/ZH (fairness resolved time, agent notices)** — `/fairness, /agent`

Swahili and Chinese pages print English month abbreviations inside localized tables and sentences.

*Evidence:* src/lib/utils.ts:279 formatDateTime and :274 formatDateShort hardcode `toLocaleString("en-GB", …)`; used by fairness/page.tsx:91/353 (live '15 Sept 2026, 11:06') and agent/page.tsx:113 inside SW sentences (stateCooldown/stateInvitedUntil).

### S08-info-N03 · ⚪ low · 🕓 unverified · number
**Vote score figure** — `/proposals`

A changing figure without tabular numerals and with a 22px min width shifts width as it moves between -1/0/10, nudging the vote buttons.

*Evidence:* src/components/proposals/vote-control.tsx:127 `font-mono text-[13px] font-bold` with no tabular-nums, minWidth 22; score = up − down printed with ASCII '-' for negatives; changes optimistically on tap.

### S08-info-PS02 · ⚪ low · 🕓 unverified · state
**Board totals line while COMING_SOON** — `/proposals`

Under a 'coming soon' banner the page still prints a dead '0 proposals · 0 votes' statistic, which reads as an empty/abandoned board rather than a feature that is not open yet.

*Evidence:* src/app/proposals/page.tsx:224 totals line renders unconditionally; :282-286 renders nothing for non-active boards. Live 360 (production COMING_SOON): hero 210px, banner 117px, then '0 proposals · 0 votes' and nothing else (screenshot). Also uses `toLocaleString()` with no locale.

### S08-info-S01 · ⚪ low · 🕓 unverified · state
**Leaderboard loading skeleton (evidence for D26)** — `/leaderboard`

The skeleton describes a different page (no ribbon/rail/sort/podium), so everything jumps when the board lands — a further D26 instance.

*Evidence:* src/app/leaderboard/loading.tsx:24-41 renders a spinner panel `p-8` (48px) + 8 rows of 56px in one bordered section; the page (live) renders ribbon 80px, product rail 44px, sort row 62px, podium 240px, then 53px table rows.

### S08-info-TX01 · ⚪ low · 🕓 unverified · textbox
**SearchBox clear (×) button** — `/fairness, /proposals`

The clear control is below the 40px floor.

*Evidence:* src/app/globals.css:1746-1752 `.search-box .clear-btn { width: 38px; height: 38px; … }`; live CSS-rule injection on /fairness at 360 EN/SW: 38px x 38px (no mobile override; the 16px input rule at globals.css:1789-1795 covers inputs only). Appears only after typing (search-box.tsx:159-168), so guest screenshots never show it.

### S08-info-TX02 · ⚪ low · 🕓 unverified · textbox
**SearchBox input attributes** — `/fairness, /proposals`

Android keyboards autocapitalize and autocorrect market names / field:value queries (e.g. 'simba' → 'Simba', 'crypto:' corrected).

*Evidence:* src/components/ui/search-box.tsx:146-158: type=search, enterKeyHint=search, autoComplete=off, aria-label present — but no autoCorrect/autoCapitalize/spellCheck; live /fairness autocorrect=null. (Font is 16px on phones via globals.css:1789-1795 — verified live, not a defect.)

### S08-info-TY01 · ⚪ low · 🕓 unverified · typography
**Off-ladder hand-typed sizes and sub-floor sentences** — `/help, /fairness, /proposals, /leaderboard, /legal/*`

The info pages bypass the closed ladder with a dozen hand-typed sizes, and reading sentences (help 18+ disclaimer, officers cell, podium 'n resolved') sit at 10–11px.

*Evidence:* help/page.tsx:103 h2 text-[15px], :114 summary text-[13.5px], :168 disclaimer font-mono text-[11px] (live 3 lines, 18+/RG line); fairness/page.tsx:179 text-[15px], :187/:225 h2 text-[20px], :204 text-[14px], :347/:353/:355 text-[11px]; proposals/page.tsx:336 text-[10.5px], :338 text-[15.5px], :340 text-[11px], propose-promo.tsx:450 text-[14.5px]; leaderboard/page.tsx:504/548/599 text-[10px], :595 text-[13px]; legal/_components.tsx:313 h2 text-[17px], :319 body text-[13.5px]. Fairness phone page carries ≥ 9 distinct sizes (9.5, 10, 10.5, 11, 11.5, 13, 14, 15, 20, 28).

## S09-auth — Sign-in and sign-up flows

### S09-auth-01 · 🟠 high · 🕓 unverified · a11y
**Every <Field>-wrapped auth textbox (register phone, email, password, confirm; login password)** — `/auth/login, /auth/register, /auth/login?error=wrong_credent`

Screen-reader users hear the reveal button's label, the prefix and the hint text as part of every field name. On the phone field they hear two different phone hints. On the error state the error is read twice.

*Evidence:* Chrome AX tree names: - Login password: "PASSWORD Show password At least 8 characters." - Register confirm: "CONFIRM PASSWORD Show password" - Register phone: "PHONE +255 9 digits after +255 (e.g. 712 345 678)." plus a second, different description, "9-digit Tanzania mobile number starting with 6 or 7" (from the title attribute) - Register email: "EMAIL ADDRESS Required. Your deposit receipts and confirmation link go here." - On ?error=wrong_credentials the password is named "PASSWORD Show password Wrong phone or password At least 8 characters." with desc "Wrong phone or password" (read twice). - SW: "NENOSIRI Onyesha nenosiri Angalau herufi 8." Cause: input.tsx:211-221 <Field> renders a <label> that wraps the legend, the control (including the eye <button>, password-input.tsx:112-122, and the +255 prefix) and the hint <p>. By contrast, login-identifier.tsx uses FieldLegend as a label wi

### S09-auth-02 · 🟠 high · 🕓 unverified · link
**Text links on the auth flows (forgot password, create/sign-in switch, legal links, back links, 2FA links, trust-strip helpline, self-exclusi** — `/auth/login, /auth/register, /auth/forgot-password, /auth/2f`

The recovery link, the RG helpline, the legal documents at the consent point, and the only contact a self-excluded player is told to use are all 13-18px-tall tap targets. Several are stacked 4px apart, so on budget phones taps will miss or hit a neighbour.

*Evidence:* Measured CSS boxes, all below the 40px floor: - "FORGOT PASSWORD?" 118x14, 10px mono (login/page.tsx:311). The only recovery route from sign-in. - "Create one" 69x16 (login :324). - Register "Sign in" 43x16; SW "Ingia" 31x16. - Register legal links "Terms of service" 102x18, "Privacy" 45x18, "Responsible gambling" 134x18, rows 4px apart (register :298-300). - Forgot "BACK TO SIGN IN" 147x15 (forgot :45) and "Sign in" 43x16. - 2FA "← BACK" 58x16 and "USE A BACKUP CODE" 151x16 (2fa :82, :88). - Trust-strip helpline tel: link "0800 11 0011" 91x13 at 10px (auth-shell.tsx:82-84). - Self-exclusion panel (SW) tel "0769777877" 97x18 and mailto 138x18 (login :240-255).

### S09-auth-code-1 · 🟠 high · 🕓 unverified · state
**Register referral/invite binding after any failed sign-up** — `/auth/register?ref=…/?invite=…`

A player who arrives on an agent or invite link and hits any refusal (duplicate email, common password, rate limit, DOB) is returned to a register page with no referral ribbon and no hidden ref/invite field. The retry creates an unbound account, and the referral or welcome bonus is silently lost with no message.

*Evidence:* src/app/auth/register/actions.ts:36-49 rebuilds the retry URL from phone, email, error, message and next only; `ref` and `invite` are never set. register/page.tsx:73-75 resolves the banners only from sp.ref / sp.invite, and :207-208 render the hidden `ref`/`invite` inputs only when those resolve. No cookie fallback exists (grep of affiliate-service, auth-service and proxy found none).

### S09-auth-03 · 🟡 medium · 🕓 unverified · copy
**Account-locked alert body + RateLimitBanner countdown** — `/auth/login?error=locked&retry=1740`

The one screen a locked-out player reads has a run-on, duplicated message, and the time left is buried at the end of it.

*Evidence:* The rendered alert (262x213) reads: "Too many wrong password attempts. You can try again when the timer ends — or reset your password now.Too many attempts. Wait a moment and try again. 28:58". - Two lockout sentences, the second glued on with no space ("now.Too"). - login/page.tsx:168-170 renders accountLockedBody followed by <RateLimitBanner>, and rate-limit-banner.tsx:27 prepends its own t.common.tooManyAttempts. - The countdown is an 11px mono pill inline at the end of the paragraph. - A second "29:00" node measures 1px wide.

### S09-auth-04 · 🟡 medium · 🕓 unverified · layout
**Sign in submit on first paint (lockup + shell padding above the form)** — `/auth/login, /auth/login?revoked=1, /auth/login?error=locked`

On a typical budget phone the primary action of sign-in is under the bottom nav, and the top ~113px is spent repeating the logo.

*Evidence:* - At 360x780 the Sign in button is at y=719-767 while the fixed rail top is 715: fully covered on load (submitVisibleOnLoad=false). - At 320x640 it sits at y=719 against a rail top of 575. - With the revoked panel the button is at y=868; locked 956; excluded 938. - Above the card: shell py-8 (48px, auth-shell.tsx:73), then a second brand lockup "50pick.tz" at y 136-169 (33px, auth-shell.tsx:77-79) plus mb-6 (32px), directly under a header that already shows the brand mark. The card starts at y=201.

### S09-auth-05 · 🟡 medium · 🕓 unverified · state
**Wrong-credentials error: alert panel + field line + password field** — `/auth/login?error=wrong_credentials`

Two designs for one error state, and the control the player must correct never turns red.

*Evidence:* - Alert panel title "Wrong phone or password" at y=365 (262x108, login :205). - The same sentence again as a field line at y=778, 13px danger (login :300-305). - The password wrapper keeps the default border oklab(0.36 …) and fill: only aria-invalid is set (login :297); PasswordInput's `error` prop is not passed. - The phone field is not flagged. - The hint "At least 8 characters." still shows under the error. - The copy says "phone" even when the Email tab is used.

### S09-auth-06 · 🟡 medium · 🕓 unverified · a11y
**Date of birth segments (Day / Month / Year)** — `/auth/register`

A screen-reader user hears three unrelated "Day/Month/Year" boxes, not told they are the date of birth, that they are required, or the 18+ rule. This is the age gate.

*Evidence:* - AX tree: textbox name="Day" req=false, "Month" req=false, "Year" req=false. - "Date of birth" and the hint "You must be 18 or older." appear in no name or description. - The segment aria-label wins over the wrapping label (date-select.tsx:278). - `required` sits on the constraint mirror, which is aria-hidden (date-select.tsx:327-329). - MM and YYYY have no label association at all (labels=[]).

### S09-auth-07 · 🟡 medium · 🕓 unverified · button
**Password reveal (eye) and Open calendar buttons** — `/auth/login, /auth/register`

Keyboard, switch-access and external-keyboard users can never reach the reveal toggle or the calendar. The names are fine; the controls are unreachable.

*Evidence:* - Eye toggle measured tabIndex=-1, 49x46, on all 3 login combos and both register fields (password-input.tsx:114). It works by tap: aria-label "Show password" → "Hide password", aria-pressed false→true, input type password→text. - Calendar trigger tabIndex=-1, 49x42 (date-select.tsx near :293-295).

### S09-auth-08 · 🟡 medium · 🕓 unverified · state
**Register ?error=exists field invalid flags** — `/auth/register?error=exists&phone=712345678`

Assistive tech tells the player their email is invalid when the problem is the phone. Sighted players get no field highlight at all.

*Evidence:* - AX: the phone textbox has invalid=true (correct), and the email textbox "ANWANI YA BARUA PEPE …" also has invalid=true, for a duplicate PHONE. - Source: register/page.tsx:229 and :253 both test sp.error === "exists"; email_exists has its own branch. - Neither field shows a visual error; only aria-invalid is passed, not error.

### S09-auth-09 · 🟡 medium · 🕓 unverified · textbox
**Date of birth field height and segment hit areas** — `/auth/register`

The one uneven field height in the form. A player aiming at the month or year must hit a 24px-tall target; any miss lands the caret in the day.

*Evidence:* - The DOB wrapper is 262x44, while phone, email, password and confirm in the same form are 48 (size="lg"). register/page.tsx:263 <DateSelect> passes no size. - Segment inputs measure 25x24 (DD, MM) and 46x24 (YYYY). - Tap test: tapping the empty box right of YYYY (x=228), the top edge (y+5), the bottom edge and the left padding all focused input#dob [Day], via label forwarding.

### S09-auth-10 · 🟡 medium · 🕓 unverified · button
**Calendar dialog day cells, month/year title button, Cancel** — `/auth/register (Open calendar)`

Every date and the year picker trigger sit under the tap floor on the age-gate calendar. Cancel is a 16px-tall text.

*Evidence:* - Day cells 39x36 at 360 and 33x36 at 320 (date-select.tsx:400 h-[36px]). - The "September 2008" Pick-a-year button is 150x23 at 360 (date-select.tsx:365-367). - "CANCEL" is 52x16, 12px mono (date-select.tsx:418-420). - Prev/next month buttons are 48x48 (fine). - Panel 304x342 at 360.

### S09-auth-11 · 🟡 medium · 🕓 unverified · textbox
**Password / confirm / 2FA code placeholders** — `/auth/login, /auth/register, /auth/2fa`

The empty field reads as already filled or autofilled. The reveal toggle appears broken because it shows the same dots.

*Evidence:* - Empty password fields show placeholder "••••••••" (login/page.tsx:296; password-pair.tsx placeholder on both fields) in mono at 16px, which looks like a stored value on first load. - Tapping "Show password" on the empty field still shows the dots. - The 2FA code box shows "• • • • • •" (2fa/page.tsx:70).

### S09-auth-12 · 🟡 medium · 🕓 unverified · container
**Forgot-password support block (fallback card > contact rows)** — `/auth/forgot-password, /auth/forgot-password?sent=1`

Chunky nested boxes squeeze the contact rows, and the phone number and hours are the least legible text on the page.

*Evidence:* - Box-in-box depth 3: glass-panel (p 32) > rounded-xl bordered bg-overlay/40 block (p 20, r 16, forgot :98) > bordered contact rows (r 8, p 10/16, :149-175). - The rows start at x=70 and are 220 wide at 360 (180 wide at 320): 70px inset per side. - Inside, the helpline "0800 11 0011" is text-[11px] mono (:155), the email text-[11px] (:172), and "8 am – 8 pm" / "1 business day" text-[10px] Inter (:156, :173). - These are the smallest type in the card, for the facts a locked-out player needs.

### S09-auth-13 · 🟡 medium · 🕓 unverified · button
**Verify-email invalid state CTAs and medallion** — `/auth/verify-email`

On the step that gates the first deposit, the visual priority points away from the fix. The same primary-action role takes a second shape.

*Evidence:* - Body copy: "Open your profile to send a fresh one." - The primary filled CTA is "Browse markets" (verify-email/page.tsx:82-84, t.home.heroCta). The remedy "Go to account" is the ghost button (:85-90). - Both CTAs are btn-lg btn-pill (radius 999), while every other auth primary btn-lg is radius 12 (SubmitButton). - The medallion is h-[48px] w-[48px] (:62).

### S09-auth-27 · 🟡 medium · 🕓 unverified · number
**Referral and invite bonus figures** — `/auth/register?ref=…/?invite=…`

The money figure sits mid-sentence with no nowrap, so the line can break between 'TZS' and '10,000'. In ZH/SW the invite headline wraps to 3 lines in 136px, and the amount is not tabular or styled as a figure.

*Evidence:* register/page.tsx:144-146 builds `${t.auth.signUpAndGet} ${formatTzs(…)} ${t.auth.toStart}` inside a `min-w-0 flex-1` column; :167 builds `{t.auth.claimBonus} {formatTzs(invite.bonusAmountTzs)}` at text-[14px] bold. utils.ts:64 `TZS ${…}` uses a normal space. Text column = panel content 222 − border 2 − p-3.5 28 − mark 40 − gap-3 16 = 136px at 320 (176px at 360). 'Sign up & get TZS 10,000 to start' ≈224px at 13px semibold.

### S09-auth-30 · 🟡 medium · 🕓 unverified · state
**Register form after a server refusal** — `/auth/register?error=…`

After a duplicate email or a rejected password, the player must re-enter the DOB (three segments with 25px targets, S09-auth-14), both passwords, and re-tick 18+ and Terms, for an error in one unrelated field. On a budget phone that is the most abandoned retry in the flow.

*Evidence:* register/actions.ts:36-49 carries back only phone, email, error, message and next. register/page.tsx:263-269 DateSelect has no defaultValue; :280-293 the three Checkboxes have no defaultChecked; PasswordPair (password-pair.tsx:19-20) starts empty.

### S09-auth-32 · 🟡 medium · 🕓 unverified · textbox
**Reset-password confirm field** — `/auth/reset-password?token=valid`

Two designs for the same 'choose a password twice' job. On reset, a mismatch is caught only after a server round trip that clears both fields (the `reason` banner at :137-141), the most frustrating path for a player recovering an account.

*Evidence:* reset-password/page.tsx:162-175 is a plain `<PasswordInput id="confirm" name="confirm" …>` with FieldLegend, no hint, no match state and no setCustomValidity. Register uses PasswordPair (password-pair.tsx:26-30 custom validity; :49-57 live 'Passwords match / don't match').

### S09-auth-code-10 · 🟡 medium · 🕓 unverified · link
**Mobile trust strip (18+ · Licensed by GBT · Helpline tel link)** — `all /auth/* pages`

The responsible-gambling helpline is a 14px-tall tap target, and the licence/18+ statement is set at the smallest, faintest rung. It is not hidden, but it is barely usable on a budget phone.

*Evidence:* auth-shell.tsx:82-84: `<p className="mt-6 text-center font-mono text-micro uppercase tracking-[0.16em] text-text-subtle lg:hidden">` with the `tel:` <a> inline. Line box 14px, so the helpline tap target is ≈14px tall; text is 10px uppercase subtle ink; tracking is 0.16em where the eyebrow rule is 0.14em.

### S09-auth-code-11 · 🟡 medium · 🕓 unverified · link
**Back / switch-mode / resend links on forgot, reset, 2FA, OTP** — `/auth/forgot-password, /auth/reset-password, /auth/2fa, /aut`

The primary way out of each step is a 15-16px-tall target. On 2FA (live for TOTP players) the only route to a backup code is a 16px link. In SW, 'Tumia programu ya uthibitishaji' (sw:3908, 31 chars uppercase at 12px + 0.14em ≈ 280px) cannot share a justify-between row with '← Rudi' at 262px, so the row wraps with no gap.

*Evidence:* forgot-password/page.tsx:43-49 and reset-password/page.tsx:118-124: `inline-flex … font-mono text-caption uppercase` + chevronLeft 14, ≈15px tall. 2fa/page.tsx:80-91 and otp/page.tsx:93-107: `font-mono text-label uppercase` with no height, ≈16px. resend-otp-button.tsx:22: same recipe, ≈16px, and its width changes 'Resend code' → spinner+'Sending…'.

### S09-auth-code-14 · 🟡 medium · 🕓 unverified · textbox
**DOB DD / MM / YYYY segment tap targets** — `/auth/register`

Two of the three date inputs are 25px wide. A tap on a separator or the empty part of the field does nothing, so a player on a budget phone has to land a 25px column to start or correct the day or month.

*Evidence:* date-select.tsx:66 `SEG_WIDTH = { dd: "2.6ch", mm: "2.6ch", yyyy: "4.8ch" }`. At 16px mono (1ch ≈ 9.6px) that is DD ≈25px, MM ≈25px, YYYY ≈46px wide. The '/' separators (:260, mx-1) and the flex-1 remainder (:257) have no click handler to focus a segment.

### S09-auth-code-15 · 🟡 medium · 🕓 unverified · copy
**DOB segment placeholders and accessible names** — `/auth/register`

SW and ZH players see English DD/MM/YYYY and screen readers announce English 'Day'/'Month'/'Year'. Because aria-label wins, none of the three inputs is named 'Date of birth' in any locale.

*Evidence:* date-mask.ts:21-24 `{ ph: "DD", aria: "Day" }, { ph: "MM", aria: "Month" }, { ph: "YYYY", aria: "Year" }`, used at date-select.tsx:277-278 (`placeholder={seg.ph}`, `aria-label={seg.aria}`). The segment aria-label overrides the localised Field label 'Tarehe ya kuzaliwa' / '出生日期' (register/page.tsx:257).

### S09-auth-code-16 · 🟡 medium · 🕓 unverified · state
**DOB invalid / under-18 state** — `/auth/register`

A 17-year-old who types a real birth date sees 'Invalid date' in 11px mono, then the 13px hint in a different style. On submit the browser bubble says 'Enter a date', although a date is visibly entered. The two error styles contradict each other and none states the real reason (under 18).

*Evidence:* date-mask.ts:134-141: a complete date outside `max` (under 18) returns `{ iso: "", invalid: true }`. date-select.tsx:340 then shows `font-mono text-[11px] text-danger-fg` 'Invalid date' (en 436), while Field's hint 'You must be 18 or older.' stays below in text-body-sm subtle (input.tsx:218-220). date-select.tsx:119 sets custom validity `required && !isoValue ? t.common.dateRequired` = 'Enter a date' (en:437).

### S09-auth-code-17 · 🟡 medium · 🕓 unverified · button
**DOB calendar popup controls** — `/auth/register (calendar dialog)`

Every control a player needs in the DOB picker is under the 40 floor: days 36, years 32, the year toggle ≈22, Cancel ≈16. Prev/next are `h-8 w-8` = 48px here, the only compliant ones.

*Evidence:* date-select.tsx:400 day cells `h-[36px]`; :450 year cells `h-[32px]`; :365-370 month/year toggle is a bare `text-[15px]` button ≈22px tall; :418-421 Cancel is `font-mono text-label uppercase` with no height, ≈16px. :187/:196-199: the view opens on maxParsed (18 years ago), so reaching a 1990s birth year goes through the ≈22px toggle.

### S09-auth-code-18 · 🟡 medium · 🕓 unverified · a11y
**Password show/hide toggle and calendar trigger removed from tab order** — `/auth/login, /auth/register, /auth/reset-password, /auth/adm`

Keyboard and switch-access users (including Android external-keyboard and TalkBack linear navigation in some modes) cannot reach 'Show password', so they cannot check a typed password. The toggle also carries both a changing label and aria-pressed, which double-announces the state.

*Evidence:* password-input.tsx:112-117 `<button type="button" tabIndex={-1} aria-label=… aria-pressed={reveal}>`; date-select.tsx:291-296 calendar button `tabIndex={-1}`.

### S09-auth-code-19 · 🟡 medium · 🕓 unverified · container
**Error / warning / success banners across auth** — `/auth/login, /auth/register, /auth/otp, /auth/2fa, /auth/for`

The same job (an auth notice) has four compositions: two paddings, three border alphas, icon vs no icon, title vs no title, and body ink text-muted vs gold-300 vs danger-fg. The radius is 8, off the control 12 / card 16 rungs.

*Evidence:* Composition A: login/page.tsx:201-221 and register/page.tsx:174-191, `rounded-md border px-3.5 py-3` + 16px icon + title + body, border /45. B: otp/page.tsx:57,66 and 2fa/page.tsx:45, `rounded-md border-danger-500/70 px-3 py-2.5 text-[13px]`, no icon, no title. C: forgot-password/page.tsx:58 success with title, no icon, border /65, px-3.5; :67 danger /70 no title; :72 warning with gold-300 body ink. D: reset-password/page.tsx:138 /70 px-3.5 no title. All use rounded-md = 8px.

### S09-auth-code-2 · 🟡 medium · 🕓 unverified · copy
**Register error panel body from ?message=** — `/auth/register?error=invalid&message=…`

Three defects. (1) SW and ZH players get English refusals; the breach-list rejection is reachable by ordinary typing. (2) Any text in the URL is shown inside a role=alert panel on the sign-up page (content spoofing, e.g. 'call +255… to verify'). (3) searchParams are already decoded, so a literal '%' makes decodeURIComponent throw URIError and the page falls to auth/error.tsx.

*Evidence:* register/page.tsx:107-111 `body: msg ? decodeURIComponent(msg) : t.auth.checkFormFields`. The messages come from English-only server strings: validators.ts:115-117 ('Enter a valid email address'), :123-124 ('You must accept the Terms', 'You must confirm you are 18+'), password-policy.ts:36-42 ('That password is in the public breach list. Pick something less common.'), auth-service.ts:568 ('Passwords do not match. · Nenosiri hazilingani.').

### S09-auth-code-22 · 🟡 medium · 🕓 unverified · container
**Forgot-password 'No email? Contact support' fallback** — `/auth/forgot-password`

Three nested bordered boxes (radii 16 → 16 → 8) read chunky and leave the support address with a 122px column at 320 (the string is ≈106px, so there is little slack). This is the heaviest block on a page a locked-out player reads.

*Evidence:* forgot-password/page.tsx:98 `rounded-xl border border-border bg-bg-overlay/40 p-4 space-y-3` inside AuthPanel `glass-panel p-6` (auth-panel.tsx:59), containing :151,161 `rounded-md border bg-bg-elevated px-3 py-2.5` rows. Depth 3. Padding stack to row text = 1+32+1+20+1+16 = 71px per side. Row text column = 162px at 360 and 122px at 320 (after the 14px glyph + gap-2.5 10).

### S09-auth-code-23 · 🟡 medium · 🕓 unverified · typography
**Type sizes per auth card** — `/auth/login, /auth/register`

The auth surface uses 8-10 distinct sizes per card, with two off-ladder values (13.5, 12.5) and about 30 hand-typed sizes that bypass the ladder keys. That weakens the hierarchy and breaks the closed-ladder rule.

*Evidence:* Login card: 11 (eyebrow text-caption, auth-panel.tsx:102), 28 (title-lg :107), 13.5 (subtitle text-[13.5px] :114-115; segments login-identifier.tsx:85), 13 (hints and panel body-sm; footer text-[13px] login:320), 12.5 (CTA text-[12.5px] login:264), 10 (FieldLegend text-micro; forgot link login:311), 16 (inputs), 15 (btn-lg) = 8 sizes. Register adds 14 (text-[14px] register:141,167), 12 (strength text-label password-input.tsx:155) and 13.5 inline on Checkbox (checkbox.tsx:95) = 10 sizes. Off-ladder hand-typed values: 13.5, 12.5; on-ladder but hand-typed: text-[13px] ×17 sites, text-[14px] ×2, text-[11px] (otp-expiry-countdown.tsx:91, countdown-pill.tsx:114, date-select.tsx:340, forgot:155,172), text-[10px] (forgot:156,173), text-[15px] (date-select.tsx:366,375), text-[12px] (:423), text-[20px] (otp-input.tsx:25).

### S09-auth-code-25 · 🟡 medium · 🕓 unverified · layout
**AuthShell vertical budget (lockup, py-8, panel padding)** — `/auth/login`

On a 360x640 budget phone the usable height is ≈576px (640 − rail), so the Sign in button starts ≈90px below the fold, behind 48+32+32 of shell voids and a subtitle that repeats the field hint. On short pages (verify-email, reset invalid, forgot sent) the 44-vs-56 offset plus the rail centres content low: the same pattern as D13 (/offline).

*Evidence:* auth-shell.tsx:73 `px-3 py-8` (48px top/bottom), :77 lockup `mb-6` (32), :82 strip `mt-6` (32); auth-panel.tsx:59 `p-6` (32). Derived top of the Sign in button at 360 EN: header 56 (top-app-bar.tsx:142) + py 48 + lockup 27+32 + panel pad 32 + AuthHeader ≈106 + space-y-5 24 + LoginIdentifier ≈184 + 20 + password Field ≈96 + forgot row 8+14 + 20 ≈ 667px. The BottomNav rail renders on /auth (app-shell.tsx:370, bottom-nav.tsx:114 `lg:hidden fixed bottom-0`, ≈64px). Shell min-height is `calc(100vh-44px)` (auth-shell.tsx:24-25) while the header is 56.

### S09-auth-code-3 · 🟡 medium · 🕓 unverified · number
**Self-exclusion 'until {date}' in the login compliance panel** — `/auth/login?excluded=serving&until=…`

A compliance message shows a raw ISO date ('until 2026-10-01') in every locale instead of a localised date. Because the value is read straight from the URL, anyone can put any text there ('?until=forever'), inside the panel that tells a self-excluded player when they may return.

*Evidence:* login/actions.ts:65-66 `until=${encodeURIComponent(result.detail.until.slice(0, 10))}`; login/page.tsx:110-112 `t.auth.selfExclusionUntilBody.replace("{date}", sp.until)`. EN copy en:501 'Your self-exclusion runs until {date}…'.

### S09-auth-code-4 · 🟡 medium · 🕓 unverified · a11y
**Field wrapper: hint, strength meter and eye button inside the <label>** — `/auth/login, /auth/register`

Implicit label naming concatenates everything in the label. The password field's name likely reads 'Password Show password At least 8 characters.', and on register it changes with each keystroke ('Weak'/'Strong', 'Passwords don't match'). Hints and errors are never exposed as descriptions (no aria-describedby).

*Evidence:* src/components/ui/input.tsx:211-221: <Field> renders `<label>` around FieldLegend, children AND the hint/error `<p>`. password-input.tsx:112-125 puts the eye <button aria-label> and <PasswordStrength> label inside the same child. password-pair.tsx:49-57 feeds the live match/mismatch text as `hint`.

### S09-auth-code-5 · 🟡 medium · 🕓 unverified · state
**Error-state painting of identifier, password, register phone/email** — `/auth/login?error=wrong_credentials/no_account, /auth/regist`

The 2026-08-21 feature that makes the field a player must correct go red (password-input.tsx:26-34) is never used. After a wrong password or an unknown number, every field looks normal; only a banner above says something is wrong.

*Evidence:* login/page.tsx:297 passes only `aria-invalid` to PasswordInput. password-input.tsx:61,89,98 paint the red border/wash only from the `error` prop, which nobody passes. login-identifier.tsx:115,133 pass only aria-invalid; input.tsx:82,123,139 paint only from `error`. register/page.tsx:229,253 are the same.

### S09-auth-code-6 · 🟡 medium · 🕓 unverified · a11y
**Register email field aria-invalid** — `/auth/register?error=exists/email_exists`

On a duplicate phone, screen readers announce the email as invalid. On a duplicate email, the email field is not marked. The comment at register/page.tsx:87-90 describes this exact conflation as a past defect.

*Evidence:* register/page.tsx:253 `aria-invalid={sp.error === "exists" ? "true" : undefined}` on the EMAIL input. 'exists' is the duplicate-PHONE code (actions.ts:40), and 'email_exists' (:41) marks nothing.

### S09-auth-code-7 · 🟡 medium · 🕓 unverified · copy
**Login error copy for email sign-ins** — `/auth/login?identifier=a@b.c&error=wrong_credentials`

A player who signed in with an email is told the phone digits are wrong. This is misleading on a form that puts email on equal footing (login-identifier.tsx header).

*Evidence:* login/page.tsx:130-136 and :300-304 use t.auth.wrongCredentials 'Wrong phone or password' / body 'Check the digits and try again…' (en:520-521; sw:3131 'Simu au nenosiri si sahihi'). The service already distinguishes: auth-service.ts:982 `isEmailLogin ? "Wrong email or password." : "Wrong phone or password."`. Also noAccountYetBody 'for that phone' (en:519) and tooManyTriesBody 'try the same phone again' (en:523).

### S09-auth-code-8 · 🟡 medium · 🕓 unverified · link
**'Forgot password?' link** — `/auth/login`

The only recovery route for a locked-out player is a 14px-tall target: 26px under the 40 floor, and easy to miss or confuse with the hint above it. It is also sentence-type reading copy dressed as a 10px mono microlabel (the DG-A-14 precedent moved such copy to body-sm).

*Evidence:* login/page.tsx:308-315: `flex items-center justify-end -mt-2` wrapping <Link className="font-mono text-micro uppercase tracking-[0.14em] …">. text-micro is 10px/14px line, so the tap box is ≈14px tall x ≈118px, sitting 8px (space-y-4 20 − mt-2 12) under the password hint.

### S09-auth-code-9 · 🟡 medium · 🕓 unverified · link
**Self-exclusion support phone and email links** — `/auth/login?excluded=serving/permanent/minimum_served`

A self-excluded account can only be reopened by contacting support (E-238), and these links are how the player does it. They are ≈18px tall and stacked 4px apart when they wrap at 320/360, so a mis-tap dials or mails the wrong channel.

*Evidence:* login/page.tsx:241-256: `<p className="mt-2 flex flex-wrap … gap-y-1">` with two `inline-flex items-center gap-1.5 underline` anchors in text-body-sm leading-snug (≈18px) and I.phone/I.mail s={13}. Rows are ≈18px tall with 4px between them.

### S09-auth-14 · ⚪ low · 🕓 unverified · typography
**Auth card type sizes (subtitle, method tabs, error CTA, consent labels)** — `/auth/login, /auth/register, /auth/forgot-password, /auth/2f`

Near-duplicate sizes (13 vs 13.5, 12.5) read as accidental and keep the ladder open on the first screens a new player sees.

*Evidence:* In-card census, login: 10 mono, 11 mono, 13 Inter, 13 Sora, 13.5 Inter, 13.5 Sora, 15 Inter, 16 mono, 28 Sora. That is 7 sizes, with 13 and 13.5 stacked (hint 13 under subtitle 13.5). Off-ladder hand-typed sources: - Subtitle text-[13.5px] (auth-panel.tsx:114-115) - Phone/Email tabs text-[13.5px] (login-identifier.tsx:85) - Error CTA text-[12.5px] (login :264, register :197) - Consent spans text-[13px] inside a label hard-set to fontSize 13.5 (checkbox.tsx:95)

### S09-auth-15 · ⚪ low · 🕓 unverified · container
**Radius roles inside the auth card (tabs, alert panels, contact rows)** — `/auth/login, /auth/login?revoked=1, /auth/forgot-password`

The legacy 8px radius sits beside the 12/16 roles in one card, so the notice and tabs look like they come from a different kit.

*Evidence:* - Method tabs: radius 8 (rounded-md) inside a 12px track (login-identifier.tsx:85). - Revoked, wrong-creds, locked, excluded, exists and sent alert panels: radius 8 (login :205; forgot :58). - Forgot contact rows: radius 8. - Inputs, submit and track: 12. Card and fallback block: 16.

### S09-auth-16 · ⚪ low · 🕓 unverified · copy
**Phone field hint (same PhoneInput, two texts)** — `/auth/login, /auth/forgot-password, /auth/register`

The same control carries two instructions. Register never tells the player that the number must start with 6 or 7, so the pattern failure comes as a surprise.

*Evidence:* - Login and forgot show "9-digit Tanzania mobile number starting with 6 or 7" (login-identifier.tsx:138, i18n-dict.ts:435). - Register shows "9 digits after +255 (e.g. 712 345 678)." (register :222, i18n-dict.ts:476). It repeats the placeholder and omits the 6/7 rule that the pattern enforces. - SW splits the same way: "Nambari ya simu ya Tanzania yenye tarakimu 9 inayoanza na 6 au 7" vs "Tarakimu 9 baada ya +255 (mfano 712 345 678)."

### S09-auth-17 · ⚪ low · 🕓 unverified · copy
**Sign-up naming: header pill vs page** — `/auth/register, /auth/login`

Two verbs for the same action in the same view, in both locales.

*Evidence:* - Header pill "Sign up" / SW "Jisajili" (top-app-bar.tsx:375, i18n-dict.ts:30 / :2689). - Page eyebrow and submit "Create account" / "Fungua akaunti" (i18n :465 / :3084). - Login link "Create one". All visible on one screen.

### S09-auth-18 · ⚪ low · 🕓 unverified · copy
**Register consent labels vs legal link names; SW opt-in; SW session-ended title** — `/auth/register, /auth/login?revoked=1`

The consent sentence names documents that don't match the links beside it. SW wording changes the meaning of an opt-in and makes a routine sign-out sound punitive.

*Evidence:* - "I accept the Terms and Privacy." (i18n :490) sits directly above links named "Terms of service" and "Privacy". SW: "Ninakubali Sheria na Faragha." (:3104) vs links "Masharti ya huduma" / "Faragha"; "Sheria" (laws) is not "Masharti" (terms). - SW marketing opt-in "Nipe matangazo (hiari)." (:3105) reads as "send me advertisements", while EN says "product updates". - SW session-ended title "Umetolewa" (:3121) reads as "you have been removed", vs EN "Signed out". - Trust strip "18+ · Licensed by GBT" (:494) uses an unexpanded acronym.

### S09-auth-19 · ⚪ low · 🕓 unverified · number
**Self-exclusion panel date and support phone** — `/auth/login?excluded=serving&until=2026-12-01`

A date a player must act on is shown in machine format, and two phone numbers on one screen use different grouping.

*Evidence:* - The body reads "…kunaendelea hadi 2026-12-01…": the raw ISO string from the query is inserted verbatim (login/page.tsx:111). - The contact row shows "0769777877" ungrouped (login :247), while the helpline in the trust strip on the same screen is grouped "0800 11 0011".

### S09-auth-20 · ⚪ low · 🕓 unverified · state
**/auth/2fa guest render + duplicate backup footnote + 52px code box** — `/auth/2fa`

A stale link lands a player on a code form that cannot succeed. The page says the same thing twice. The code box is off the control rungs.

*Evidence:* - A signed-out load of /auth/2fa stays on /auth/2fa and renders the full authenticator form (Confirm 262x48). 2fa/page.tsx:17-30 has no pending-challenge guard, while /auth/otp redirects to /auth/login (otp/page.tsx:23). - The footnote "Lost your device? Use a backup code." (:101-103) repeats the "USE A BACKUP CODE" link 64px above it, as non-tappable text. - Code input is h-[52px] text-[20px] (otp-input.tsx:25).

### S09-auth-21 · ⚪ low · 🕓 unverified · layout
**Void between trust strip and footer** — `/auth/login, /auth/register, /auth/forgot-password (all stat`

An empty 96px band of background between the compliance line and the footer, twice the section rung.

*Evidence:* - Trust strip bottom → footer top = 96px on all 5 measured states (e.g. wrong creds: trust bottom 1078, footer top 1174). - Card bottom → trust strip = 32 (mt-6). - The shell bottom padding is py-8 = 48 (auth-shell.tsx:73), and the rest comes from the footer's top spacing.

### S09-auth-22 · ⚪ low · 🕓 unverified · copy
**Gold on auth chrome (eyebrow, error-panel CTA pills)** — `/auth/login, /auth/register, /auth/forgot-password, /auth/lo`

The auth surface contradicts its own colour rule. Gold, which means earned money, is used for navigation.

*Evidence:* - The eyebrows "SIGN IN", "CREATE ACCOUNT" and "FORGOT PASSWORD?" are text-gold-300 (auth-panel.tsx:46, default tone). - The alert CTA pills "Reset password →" and "Ingia →" are gold border/fill/text (login :264, register :197). - auth-shell.tsx:14 states: "NO gold anywhere — nothing is earned on the auth surface". SubmitButton's doc says gold is money-in only.

### S09-auth-23 · ⚪ low · 🕓 unverified · a11y
**Register consent fieldset** — `/auth/register`

A screen-reader user cannot tell which consents are mandatory before submitting.

*Evidence:* - <fieldset> with no <legend> (register/page.tsx:279): the AX group name is "". - Checkbox AX nodes report no required state, though the two consents are required and the third is optional. Only the visible "(optional)" text distinguishes them.

### S09-auth-24 · ⚪ low · 🕓 unverified · container
**AuthPanel padding at 320 (evidence for U19)** — `/auth/login, /auth/register, /auth/forgot-password`

At 320 the form column is 69% of the screen. The planned fix narrows, but does not close, the gap to the phone rung.

*Evidence:* - ALREADY KNOWN (U19); new 320 measurements added. - Card 288 wide with p 32 (auth-panel.tsx:59): content 222. - The phone digits box is 149 wide beside the 71px +255 prefix. The password input is 171 beside the 49px eye. - U19's planned p-5 (24px) is still above the phone panel rung of 16 in §8a.

### S09-auth-25 · ⚪ low · 🕓 unverified · textbox
**enterKeyHint absent on every auth field (evidence for U22)** — `/auth/login, /auth/register, /auth/forgot-password`

The Android keyboard shows a generic return key on every field; it cannot offer Next through the form or Go on the last field.

*Evidence:* - ALREADY KNOWN (U22 keyboard hints). - All 25 focus probes returned enterkeyhint=null: identifier phone/email, password, register phone/email/DD/MM/YYYY/password/confirm, forgot identifier. - The DD/MM/YYYY segments also have no pattern="[0-9]*", and the phone field is type=text (Input converts inputMode numeric to text).

### S09-auth-26 · ⚪ low · 🕓 unverified · layout
**Duplicate brand lockup on phones** — `all /auth/* pages`

Two 50pick lockups stack within ≈100px. The second is a 27px-tall home link under the 40 floor, and it costs 59px of the budget in S09-auth-25.

*Evidence:* auth-shell.tsx:77-79 renders `<Link … className="mb-6 inline-block … lg:hidden"><FiftyLockup size={22} /></Link>` directly under TopAppBar, which is rendered on /auth (app-shell.tsx:303) with its own lockup (top-app-bar.tsx:164-175, min-h-[44px]). The shell link box is ≈27px tall (brand.tsx:146 mark = size×1.22).

### S09-auth-28 · ⚪ low · 🕓 unverified · container
**Referral / invite banners stacked above the form** — `/auth/register?ref=…&invite=…&error=…`

Up to four tinted or bordered blocks precede the phone field, pushing the form ≈250px down at 360. Nested boxes exceed the ~40px per-side threshold, with mixed radii.

*Evidence:* register/page.tsx:127-133 and :155-161: `overflow-hidden rounded-xl border` with inline gradient and `p-3.5`, inside AuthPanel p-6. Padding stack = 1+32+1+14 = 48px per side. Both can render together with the error panel (:174), giving three tinted boxes (radii 16, 16, 8) before the first field. The referral readonly Field adds a fourth REF box (:210-221).

### S09-auth-29 · ⚪ low · 🕓 unverified · a11y
**Readonly referral code field** — `/auth/register?ref=…`

Screen readers announce English 'Referral code' in SW/ZH. A focusable, dimmed, non-editable field is a tab stop that does nothing, and gold ink contradicts the 'no gold on auth' rule (auth-shell.tsx:14-16).

*Evidence:* register/page.tsx:211-219 `<Field label={t.auth.referralCode}><Input readOnly value=… prefix="REF" mono aria-label="Referral code" className="text-gold-300 font-semibold" /></Field>`. The hard-coded English aria-label overrides 'Msimbo wa rufaa · umejazwa' / '推荐码 · 自动填充' (sw:3107, zh:5243). input.tsx:106-107,140 styles it locked (opacity 0.72, cursor-not-allowed) but it stays in the tab order.

### S09-auth-31 · ⚪ low · 🕓 unverified · filter
**Phone / Email method switcher geometry** — `/auth/login, /auth/forgot-password`

The claim that the switcher matches the field is false (44 vs 48). The segment uses an off-ladder 13.5px label, an off-ladder 15px icon and an 8px inner radius inside a 12px well. At 320 each segment is ≈105px wide, so SW 'Barua pepe' fits but leaves little room for a count or longer label.

*Evidence:* login-identifier.tsx:67 well `grid grid-cols-2 gap-1 rounded-lg border p-1` gives 44+8+2 = 54px tall. :85 segments `h-[44px] … rounded-md text-[13.5px]`, and the comment at :81-84 says '44px = --h-input, the height of the phone/email field directly below', but that field is `size="lg"` 48px (:113,130). Icons s={15} (:48-49).

### S09-auth-33 · ⚪ low · 🕓 unverified · button
**Verify-email result CTAs on failure** — `/auth/verify-email?token=bad`

On the failure branches the primary action leads away from the fix, and the remedy the copy names is the secondary ghost button. The page offers no direct 'send a new link' action.

*Evidence:* verify-email/page.tsx:81-91 always renders primary `btn-primary` 'Browse markets' (t.home.heroCta) and ghost 'Go to account'. For `invalid` and `mismatch`, the body says 'Open your profile to send a fresh one' (en:241, en:243).

### S09-auth-34 · ⚪ low · 🕓 unverified · textbox
**2FA code field (authenticator ↔ backup)** — `/auth/2fa, /auth/2fa?mode=backup`

Switching modes moves the field between 52 and 44px, and 52 is on no control rung. The designed 20px code type never reaches a phone. The backup code field lets Android keyboards autocorrect 'XXXXX-XXXXX'.

*Evidence:* 2fa/page.tsx:55-64 backup `<Input … autoCapitalize="characters">` (md = 44px, no spellCheck={false}, no autoCorrect="off"); :66-73 `<OtpInput>` = otp-input.tsx:25 `h-[52px] … text-[20px] tracking-[0.3em]`. globals.css:1788-1795 forces `font-size: 16px !important` on every input ≤768px, so the 20px OTP digits render at 16 on phones.

### S09-auth-35 · ⚪ low · 🕓 unverified · a11y
**OTP field label wraps the live countdown** — `/auth/otp (dormant: OTP_ENABLED)`

The code input's accessible name includes the ticking countdown, so it changes every second ('Code Code expires in 4:59'), and the progressbar's label is also in the name.

*Evidence:* otp/page.tsx:77-88 `<label className="block"><FieldLegend>…</FieldLegend><OtpInput …/><OtpExpiryCountdown …/></label>`. otp-expiry-countdown.tsx:91-99 renders 'Code expires in m:ss' every second inside that label.

### S09-auth-36 · ⚪ low · 🕓 unverified · copy
**OTP footnote vs countdown TTL** — `/auth/otp (dormant)`

The page states two different code lifetimes, 10 minutes in the footnote and 5 minutes in the bar. This will ship when SMS OTP is enabled.

*Evidence:* otp/page.tsx:126-128 shows t.common.wrongAttemptsHint 'Codes expire after 10 minutes.' (en:115; sw:2763 'dakika 10'; zh:4899 '10分钟'); otp-expiry-countdown.tsx:16 `OTP_TTL_SEC = 5 * 60` drains the bar over 5:00.

### S09-auth-37 · ⚪ low · 🕓 unverified · number
**Countdown formats (rate limit, lockout, OTP expiry)** — `/auth/login?error=rate_limited/locked, /auth/otp`

The same kind of timer shows two formats on one page, the English 's' unit appears in SW/ZH, and the figure is smaller than the sentence it completes.

*Evidence:* countdown-pill.tsx:89 `m > 0 ? m:ss : ${s}s` gives '45s'; otp-expiry-countdown.tsx:97 always `m:ss` gives '0:45'. Both sit on /auth/otp (:60 and :87). The 's' suffix is not localised. Sizes are text-[11px] (countdown-pill.tsx:114, otp-expiry-countdown.tsx:91) against the surrounding 13px copy.

### S09-auth-38 · ⚪ low · 🕓 unverified · copy
**OTP / 2FA error text fallback** — `/auth/otp?error=…, /auth/2fa?error=…`

An unknown `error` value is printed verbatim inside a role=alert banner: raw codes for unmapped service errors, or arbitrary attacker text from a crafted link on a security step.

*Evidence:* otp/page.tsx:58 `{errorMsg[error] ?? error}`; 2fa/page.tsx:46 `{errorMsg[error] ?? error}`.

### S09-auth-39 · ⚪ low · 🕓 unverified · copy
**Admin sign-in step description** — `/auth/admin`

Staff are told they will receive an OTP that never comes, and the step list does not mention the password they must type.

*Evidence:* admin/page.tsx:82 'Step 1: phone OTP. Step 2: 6-digit authenticator code (RFC 6238). Both events audited.', while the form below (:86-113) asks for phone and PASSWORD (startLoginAction). All copy is hard-coded EN/SW (:16, :59, :63-65, :80, :117, :126-127, :133); ZH staff get none.

### S09-auth-40 · ⚪ low · 🕓 unverified · button
**Admin sign-in confidential pill and submit size** — `/auth/admin`

A non-interactive status pill is as tall as a tap control, and the primary button uses the 56 rung that phones should not use, the only 56px submit on any auth page.

*Evidence:* admin/page.tsx:56 `flex … px-3 h-7 rounded-pill`, where h-7 = 40px on this scale (a 28px intent) around a 10px micro label. :112 `<SubmitButton … size="xl" />` = 56px (globals.css:1091), with padding 16 (px-3) where 12 was likely intended.

### S09-auth-41 · ⚪ low · 🕓 unverified · icon
**Icon sizes across auth** — `all /auth/* pages`

Eight different icon sizes on one flow, several beside text of a different size, so glyph weight and alignment vary element to element.

*Evidence:* Off the 16/18/20/24 ladder: I.phone/I.mail s={13} login/page.tsx:246,253; I.alertCircle s={13} login:302; I.smartphone/I.mail s={15} login-identifier.tsx:48-49; I.chevronLeft s={14} forgot:47, reset:122; I.phone/I.mail s={14} forgot:153,163; I.clock s={12} reset:132; I.shieldcheck s={13} 2fa:35; medallion glyphs s={22} reset:81, verify:70; I.smartphone s={11} admin:116; Spinner 11 resend-otp-button.tsx:24. On ladder: alertCircle 16 (login:219), shieldQuestion 16, eye 16, calendar 16, gift 20.

### S09-auth-42 · ⚪ low · 🕓 unverified · container
**Status medallions on reset-password and verify-email** — `/auth/reset-password (expired/invalid), /auth/verify-email`

Two plate compositions (48 circle vs 40 rounded square) for the same 'glyph on a tinted plate' job; 48 is not an icon-plate rung.

*Evidence:* reset-password/page.tsx:80 and verify-email/page.tsx:62 `inline-flex h-[48px] w-[48px] … rounded-pill` with 22px glyphs. Register's invite plate uses `<IconPlate size={40}>` (register:163, rounded-control 12, icon-plate.tsx:76).

### S09-auth-43 · ⚪ low · 🕓 unverified · copy
**Password match / mismatch terms (SW) and server mismatch string** — `/auth/register`

The two adjacent states use two different Swahili words for 'password', and ZH players can see an EN·SW mixed server string.

*Evidence:* password-pair.tsx:54-55 uses t.common.passwordsMatch 'Nenosiri zinazolingana' (sw:2951) and t.toast.passwordsDontMatch 'Maneno ya siri hayalingani' (sw:4532). Everywhere else on the page 'password' is 'nenosiri' (sw:3100). auth-service.ts:568 returns the bilingual 'Passwords do not match. · Nenosiri hazilingani.', shown to ZH players via ?message=.

### S09-auth-44 · ⚪ low · 🕓 unverified · copy
**Redundant header copy on login / register** — `/auth/login, /auth/register`

About 50px of repeated copy above the first field on phones contributes to S09-auth-25, and the same verb appears three times on the login screen.

*Evidence:* login/page.tsx:195-199: eyebrow t.auth.signInTitle 'Sign in' duplicates the submit label (:317) and the header pill; the subtitle 'Sign in with the email or the phone number on your account.' (en:481, 2 lines ≈40px at 262px) repeats what the switcher plus hint say (login-identifier.tsx:137-139). Register: eyebrow 'Create account' = submit (:304); subtitle 'Tanzania mobile number, age 18+.' repeats the phone hint (:222) and the DOB hint (:257).

### S09-auth-45 · ⚪ low · 🕓 unverified · container
**Semantic ink on auth app states** — `/auth/register, /auth/verify-email, /auth/reset-password, al`

One card mixes the app-state family (medallion) with the money/betting inks (eyebrow, hints), which D2 (login/page.tsx:206-210) says must not happen. The gold default contradicts the shell's own colour rule.

*Evidence:* password-pair.tsx:54-55 match hints `text-yes-300` / `text-no-300` (betting inks). auth-panel.tsx:45-50 tones `no: text-no-300`, `yes: text-yes-300`, used at verify-email:74 and reset:85 beside medallions already moved to `--success`/`--danger` (verify:67, reset:80). auth-panel.tsx:67 defaults tone to gold, and reset:131 adds a gold-300 expiry line, while auth-shell.tsx:14-16 states 'NO gold anywhere — nothing is earned on the auth surface'.

### S09-auth-46 · ⚪ low · 🕓 unverified · a11y
**Register consent group** — `/auth/register`

Screen readers announce an unnamed group. Sighted players can only tell the optional box from the required ones by '(optional)' in one label.

*Evidence:* register/page.tsx:279 `<fieldset className="flex flex-col items-start gap-[10px] pt-1">` has no <legend>; the two required consents carry no programmatic or visual 'required' cue beyond `required` on sr-only inputs (checkbox.tsx:109-119). gap-[10px] is a hand-typed spacing literal.

### S09-auth-47 · ⚪ low · 🕓 unverified · textbox
**Password placeholders '••••••••'** — `/auth/login, /auth/register, /auth/reset-password, /auth/adm`

On a fresh page the empty field looks filled with a saved 8-character password in subtle ink. Low-literacy or first-time players may try to submit without typing.

*Evidence:* login/page.tsx:296, password-pair.tsx:43,67, reset-password/page.tsx:157,172, admin/page.tsx:108 `placeholder="••••••••"` in a font-mono password field (password-input.tsx:107).

### S09-auth-48 · ⚪ low · 🕓 unverified · state
**SubmitButton pending appearance** — `all /auth/* forms`

The in-flight state reuses the disabled look, so on a slow 3G sign-in the button appears greyed out rather than working, and the label drops well below AA contrast.

*Evidence:* submit-button.tsx:61 `disabled={pending // disabled}`; globals.css:1069 `.btn:disabled { opacity: 0.45 }`, so the pending label ('Signing in…' / 'Inaingia…') and spinner render at 45% opacity.

### S09-auth-code-12 · ⚪ low · 🕓 unverified · link
**Inline sentence links and register legal links** — `/auth/login, /auth/register, /auth/forgot-password, /auth/re`

The footer CTAs and legal documents are ≈18px targets with stacked rows 4px apart on a 262px column. The binding documents are also visually tied to the optional marketing opt-in rather than to the consent that names them.

*Evidence:* login/page.tsx:320-327 and register/page.tsx:307-314 ('Create one' / 'Sign in' inside text-[13px]); forgot-password/page.tsx:179-187; reset-password/page.tsx:101-106,179-187; verify-email/page.tsx:93-98 (mailto). register/page.tsx:297-301: Terms/Privacy/Responsible gambling links in text-body-sm, `gap-y-1`, rows ≈18px tall with 4px between rows. The legal links sit AFTER the optional marketing checkbox, separated from 'I accept the Terms and Privacy' (:285-289).

### S09-auth-code-13 · ⚪ low · 🕓 unverified · textbox
**Date of birth field height** — `/auth/register`

One field in the sign-up column is 4px shorter than the four around it, so the left edges and baselines step visibly in a single stack.

*Evidence:* register/page.tsx:263-269 `<DateSelect name="dob" id="dob" required …/>` with no size, so the md default applies: date-select.tsx:51 `h-[var(--h-input)]` = 44px. Siblings are size="lg" 48px: PhoneInput :228, email :252, PasswordPair password-pair.tsx:41,66.

### S09-auth-code-20 · ⚪ low · 🕓 unverified · copy
**Wrong-credentials message shown twice** — `/auth/login?error=wrong_credentials`

The same sentence appears twice on one screen, adding ≈26px and a second alert composition, while the field itself is not painted (S09-auth-05).

*Evidence:* login/page.tsx:130-136 top panel title t.auth.wrongCredentials plus body; :300-305 inline `<p id="login-error">` repeats t.auth.wrongCredentials under the password field. On 360 the two are ≈300px apart.

### S09-auth-code-21 · ⚪ low · 🕓 unverified · copy
**Account-locked panel body** — `/auth/login?error=locked&retry=1800`

The body renders as '…or reset your password now.Too many attempts. Wait a moment and try again. 30:00'. The sentences run together, and 'wait a moment' contradicts a 30-minute lock stated one sentence earlier. The rate_limited branch (:137-145) likewise repeats 'Too many tries' then 'Too many attempts'.

*Evidence:* login/page.tsx:166-172 renders `{t.auth.accountLockedBody}` immediately followed by `<RateLimitBanner>` with no space. rate-limit-banner.tsx:26-31 prepends t.common.tooManyAttempts 'Too many attempts. Wait a moment and try again.' (en:124) before the pill, and countdown-pill.tsx:89 shows '30:00'.

### S09-auth-code-24 · ⚪ low · 🕓 unverified · typography
**Forgot-password contact row descriptions** — `/auth/forgot-password`

Reading copy (support hours, response time) is set at 10px in the faintest ink. That is below the 12.5px reading floor the auth pages themselves cite (otp/page.tsx:120-126, DG-A-14), and it is the key fact for a locked-out player choosing a channel.

*Evidence:* forgot-password/page.tsx:156 `<p className="text-[10px] text-text-subtle">{t.common.businessHours}</p>` and :173 (oneBusinessDay). Values are :155,172 `font-mono text-[11px] font-bold`. SW 'saa 2 asubuhi – saa 2 usiku' (sw:2775).

## S10-wallet — Wallet and money surfaces (code)

### S10-01 · 🟠 high · 🕓 unverified · state
**WalletResultModal (deposit/withdraw result popup)** — `/wallet?deposited=<id> / /wallet?withdrawal=<id>`

A PROCESSING mobile-money deposit or payout opens the warning modal, which stays on screen. If the player declines the USSD prompt and the webhook marks the row FAILED, the next 20s refresh re-renders the modal as a green-check success: 'Deposit confirmed / Funds added' or 'Withdrawal sent / on its way'. The same false success shows for FAILED, REVERSED or CANCELLED whenever the result URL is reloaded or reopened from history. The page's B-5 note promises the modal reflects the stored status truthfully.

*Evidence:* src/app/wallet/wallet-result-modal.tsx:40-52 maps only AML_REVIEW and PROCESSING; every other stored status falls to t.common.depositConfirmed / fundsAdded or withdrawalSent / withdrawalOnItsWay, and :66 variant={amlHeld // pending ? "warning" : "success"}. src/app/wallet/page.tsx:358 <RefreshPoller intervalMs={20_000} /> (refresh-poller.tsx:52 router.refresh()) and :363 status={resultOwned.status} (the STORED status). open is useState(true) (:28) and survives router.refresh. The warning variant never auto-closes (operation-result-modal.tsx:300-307). wallet-service.ts:567 and :867 move PROCESSING rows to FAILED.

### S10-02 · 🟠 high · 🕓 unverified · copy
**Receipt 'Type' row, hero and receipt link** — `/wallet/receipt/[id] (reached from /wallet row detail)`

A bonus credit, an operator adjustment or a house fee opens a formal receipt titled 'Deposit' or 'Withdrawal' with method '—'. A bet payout reached by URL reads 'Deposit' in gold. This is a false statement on the page the product calls the player's evidence for disputes.

*Evidence:* src/app/wallet/page.tsx:53 typeMap BONUS_CREDIT and ADJUSTMENT_CREDIT -> "deposit"; ADJUSTMENT_DEBIT and HOUSE_FEE -> "withdraw". The file's own note at :44-49 warns this fold 'would tell a player their bonus was a deposit'. wallet-client.tsx:552 offers View receipt when tx.type === "deposit" // "withdraw". receipt/[id]/page.tsx:89 isCredit = txn.amount > 0 and :121 t.wallet[isCredit ? "receiptTypeDeposit" : "receiptTypeWithdrawal"]. :130 method prints "—" for a null provider. :96-98 paints a gold hero for any paid credit. Any owned txn id (BET_PLACED, BET_PAYOUT, CASHOUT) typed into the URL renders the same way.

### S10-03 · 🟠 high · 🕓 unverified · state
**Deposit failed / Withdrawal failed alert box** — `/wallet/deposit?error=… / /wallet/withdraw?error=…`

(1) Any crafted link, e.g. /wallet/withdraw?error=Send%20the%20fee%20to%200712…, prints attacker-written prose in the product's own red alert on the real domain, directly above the money form. (2) A value holding a bare '%' (such as ?error=100%25) makes decodeURIComponent throw URIError, and the whole deposit or withdraw route falls to the error boundary ('Your funds are safe').

*Evidence:* src/app/wallet/deposit/page.tsx:61 const errorMsg = sp.error ? decodeURIComponent(sp.error) : null; rendered at :126-133 inside role="alert" under t.wallet.depositFailed. src/app/wallet/withdraw/page.tsx:60 same, rendered at :166-173 under t.wallet.withdrawFailed. The actions build the URL with encodeURIComponent (deposit/actions.ts:56, withdraw/actions.ts:72,98,118), and Next already hands searchParams decoded, so the page decodes twice.

### S10-04 · 🟡 medium · 🕓 unverified · number
**Balance privacy mask (<Cash>) across wallet money figures** — `/wallet, /wallet/receipt/[id], /wallet/deposit/return`

A player who hid balances still sees them: the real balance paints until hydration finishes (seconds on a budget Android phone), every expanded row prints the unmasked amount, and the receipt and return pages print amounts and balance-after in full. SW and ZH screen-reader users hear English 'balance hidden'.

*Evidence:* src/components/ui/cash.tsx:50 useState(false), hydrated from localStorage only in the effect (:51-68). SSR HTML and the first paint therefore always show the real figure, then it snaps to •••••. Figures that bypass Cash: wallet-client.tsx:535 expanded row formatTzs(Math.abs(tx.amount)); :388 grant wagered/required; :731 sr-only bonus line; receipt/[id]/page.tsx:101 title, :123 amount, :144 balanceAfter; deposit/return/page.tsx:139 amount, :160 new balance; rg/limit-usage.tsx:45. Also cash.tsx:91 aria-label="balance hidden" is hard-coded English on a non-interactive span.

### S10-05 · 🟡 medium · 🕓 unverified · number
**Available / Bonus balance figure and Pending / On-hold tiles** — `/wallet`

At 7 figures on a 360 phone (6 figures on 320), 'TZS' drops onto its own line above the number with a 38px line box, and the card grows. Pending and on-hold tiles break 'TZS' from the number from 5 figures at 320. Balances this large are realistic: the withdraw cap is TZS 5,000,000. Deposit ceilings run from TZS 1,000,000 to 2,000,000.

*Evidence:* wallet-client.tsx:73 card content p-5 (24px) inside a 1px border; PageContainer px-3 (16px). Content width is 360-32-2-48 = 278px (238px at 320). :86 and :293 'font-mono text-[38px] font-bold tabular-nums leading-none' at about 22.8px per character: 'TZS 1,250,000' (13 ch) is about 296px, over 278, so it breaks at the space. At 320, 'TZS 423,857' (about 251px) already breaks. Tiles: :106 grid-cols-2 gap-3 plus stat.tsx:116 'px-3 py-2.5' leave 99px of content at 360 (79px at 320) for a text-body 14px mono value (8.4px/ch): 'TZS 1,500,000' is about 109px and wraps at 360; 'TZS 25,000' is about 84px and wraps at 320.

### S10-06 · 🟡 medium · 🕓 unverified · state
**30-day balance spark ('Available · 30 days')** — `/wallet?when=today/yesterday/7d`

With a date window or the row cap active, the chart labelled '30 days' draws a history that never happened: a flat line before the window, or a wrong ending when today is excluded. It sits directly above the ledger and reads as a statement of the balance.

*Evidence:* src/app/wallet/page.tsx:421 balanceSeries={balance30d(rows.filter(...))}, where rows is the WINDOWED read (:160 windowBounds, :167 findByUserWindow(fromMs,toMs), :172). balance30d (:88-101) sets each day's value to current minus the sum of transactions after that day's end, so rows missing before the window make every earlier point wrong. With when=yesterday, toMs is startOfToday (:124), so today's rows are excluded too. The label is constant: wallet-client.tsx:774 t.common.days30. The capped read (:169) truncates it the same way.

### S10-07 · 🟡 medium · 🕓 unverified · state
**Withdraw amount validation and zero/insufficient balance** — `/wallet/withdraw`

A player holding TZS 3,000 can type 50,000; the confirm dialog opens with 'You receive TZS 49,250' and the refusal only comes back after 'Send funds'. Amounts of 1,000–1,015 pass the client and are refused as below the gateway minimum. An empty wallet sees a live withdrawal form and no word that there is nothing to withdraw.

*Evidence:* withdraw/page.tsx:239-240 min = max(1000, minWithdrawalForRate(0.015)) = 1,016 and max = min(5,000,000, balance). These land as attributes on a type=text input (input.tsx:111 forces type 'text' for numeric), and the form is submitted with noValidate (withdraw-confirm.tsx:148), so neither bound is enforced. The client check at withdraw-confirm.tsx:85 uses only WITHDRAW_MIN_TZS / WITHDRAW_MAX_TZS (1,000–5,000,000), and the hint (i18n-dict.ts:1139) says 'Min TZS 1,000'. At balance 0, amount-field.tsx:44 filters out every chip but the form and gold confirm still render.

### S10-08 · 🟡 medium · 🕓 unverified · filter
**Wallet query bar on phones (state/window sheet, result count line, sticky height)** — `/wallet (Activity)`

Transaction status (In flight / Confirmed / Failed / Reversed) costs a tap on phones. The count spends a whole line even though row 2 has room for it, and the sticky band takes about a quarter of a 780px viewport, more of a 640px budget phone, while a player reads the ledger.

*Evidence:* wallet-bar.tsx:148-169: the FilterSheet (lg:hidden) holds the State and When groups, and the desktop groups at :174-194 are 'hidden … lg:flex'. :130 row 1 'flex-wrap justify-end gap-y-1' with the strip at 'basis-full' forces QueryResultCount onto its own line. query-bar.tsx:53 'sticky top-[56px]'; :83 row 1 pt-2.5; :102 row 2 'pb-2.5 pt-1.5'. Estimated sticky band at 360: 10 + 44 + 4 + about 17 (count) + 8 + 44 + 10 ≈ 137px, plus the 56px header ≈ 193px pinned. Row 2 holds only the Filters pill on phones.

### S10-10 · 🟡 medium · 🕓 unverified · copy
**State pill 'In flight' (Swahili)** — `/wallet filter sheet`

'Inasafirishwa' means 'being transported / shipped'. It is a literal of the airline sense of 'in flight', so SW players filtering pending deposits and withdrawals read that their money is being shipped. The row status beside it says 'Inachakatwa' (processing), so the pill and the rows name one state two ways.

*Evidence:* src/lib/i18n-dict.ts:3663 stateFlight: "Inasafirishwa" (EN :1264 'In flight', ZH :5800 '处理中'), rendered by wallet-bar.tsx:74.

### S10-11 · 🟡 medium · 🕓 unverified · button
**Self-exclusion quick chips (24h / 7d / 30d / 6m / Permanent)** — `/wallet?tab=limits`

Four labels are hard-coded English abbreviations in SW and ZH. All five chips look like period choices but go to the same page with nothing preselected, a misleading affordance on a responsible-gambling control. Every chip is outlined like a selected filter pill, the hover borrows the betting NO ink, and they are 40px against the 44px pill rung.

*Evidence:* wallet-client.tsx:683 selfExclusionOptions = ["24h", "7d", "30d", "6m", t.common.permanent]. :878-889 every chip has href="/profile/responsible-gambling" and 'inline-flex min-h-[40px] … rounded-pill border border-border bg-bg-overlay font-mono text-[11.5px] … hover:border-no-700'.

### S10-13 · 🟡 medium · 🕓 unverified · textbox
**Mobile-money number field (deposit)** — `/wallet/deposit`

The phone field loses type=tel and tel autofill. Typing a number the usual Tanzanian way, '0712 345 678', stops at 9 characters and keeps the wrong digits (071234567). Pasting '+255 712 345 678' is cut to '+255 712 ' and sanitised to '255712'. The placeholder shows spaces the field cannot hold, so the corruption is silent until the server refuses.

*Evidence:* deposit/page.tsx:212-223 Input type="tel" inputMode="numeric" pattern="\d{9}" maxLength={9} placeholder="712 345 678" prefix="+255". input.tsx:86 inputMode numeric counts as numeric, so :111 forces type 'text' and :159 forces autoComplete 'off'. The sanitiser at :96-101 strips non-digits only after maxLength has truncated the input. The hint at :224 has no id or aria-describedby, and there is no enterKeyHint.

### S10-14 · 🟡 medium · 🕓 unverified · textbox
**Card billing fields block** — `/wallet/deposit (Card selected)`

After a rejected card deposit the player gets a generic 'billing incomplete' line and no field is marked, despite the code's claim. The nested frame spends 88px of phone width on padding.

*Evidence:* deposit/actions.ts:87-90 comments 'the form highlights its own empty fields' and redirects with t.wallet.billingIncomplete. card-billing-fields.tsx:66-117 never passes error to Field or Input, and has no required marker or aria-invalid. Container :57 'rounded-xl border border-border bg-bg-elevated/40 p-4' (20px) sits inside deposit/page.tsx:188 'glass-panel p-5' (24px), so padding stacks to 44px per side; inputs are about 238px wide at 360.

### S10-15 · 🟡 medium · 🕓 unverified · container
**'Wallet held' notice on deposit vs withdraw** — `/wallet/deposit, /wallet/withdraw (wallet status not ACTIVE)`

The same account state gets two different compositions (plate size, heading level, border, padding) on sibling money screens a held player visits back to back.

*Evidence:* deposit/page.tsx:166-183 uses <Callout tone="warning" layout="stack" titleAs="h2">: 56px IconPlate, 'p-6 sm:p-8' (callout.tsx:257), btn-md pill CTA. withdraw/page.tsx:211-216 uses KycGatePanel state 'frozen' (kyc-gate-panel.tsx:128-161): 40px disc, h3 text-[18px], 'p-6' bordered panel, btn-md pill. Both show the same 'Contact support' CTA.

### S10-18 · 🟡 medium · 🕓 unverified · state
**Wallet, deposit, withdraw, receipt and return loading skeletons (new evidence for D26/U25)** — `/wallet, /wallet/deposit, /wallet/withdraw, /wallet/receipt/`

Every wallet route's skeleton disagrees with its page in height, order or layout, so money content jumps when data lands. The withdraw hero repeats the phone row-vs-stack defect DG-P-03 already fixed on /wallet.

*Evidence:* wallet/loading.tsx:60 fixed height 160 vs the real card of about 186px (plus about 31px with the zero-balance Add funds link); ghost tiles h-[64px] vs real about 54px; no ghost for the roughly 137px filter bar; spark ghost at :114 sits where the bar goes; 6 row ghosts vs 12 rows. deposit/loading.tsx:52-77 order is amount, providers, phone while the page is providers, amount, phone; 6 tiles at h-[86px] vs 5 real at about 106px; no 'glass-panel p-5' wrapper. withdraw/loading.tsx:31 hero is 'flex items-end justify-between' (a row) vs withdraw/page.tsx:145 'flex flex-col … sm:flex-row', and :40-42 shows a generic BrandSpinner box in place of the form. receipt/[id]/loading.tsx:19-37 has no BackLink (44px) or status chip, 5 rows, and a 44px ghost button vs the real btn-lg 48. deposit/return/loading.tsx:21-39 draws a centred disc vs the left-aligned PageHeader, and one 44px ghost vs up to two s

### S10-19 · 🟡 medium · 🕓 unverified · link
**Reality-check helpline tel link** — `any signed-in route (reality check modal)`

The statutory helpline, the one outbound support action in the prompt, is a tap target about 14px tall set in 10px mono caps under four 48px buttons. The four stacked buttons are ruled deliberate; this link is not covered by that ruling.

*Evidence:* src/components/rg/reality-check.tsx:190-192 renders <p className="text-center font-mono text-micro uppercase eyebrow …">{t.rg.helpline} · <a href={`tel:…`} className="text-text-muted underline underline-offset-2">{HELPLINE()}</a></p>: 10px type, 14px line box, no padding.

### S10-09 · ⚪ low · 🕓 unverified · filter
**Lens strip zero-count pills (Refunds, Bonuses, Adjustments)** — `/wallet (Activity)`

Three permanently empty lenses sit in a strip that already scrolls; in SW they push the lenses with rows off-screen. A lens that can only lead to an empty page is a dead end, the reason the agent lenses are already hidden.

*Evidence:* src/lib/wallet/ledger.ts:208-218 visibleLedgerLenses hides only commission and agentfee. wallet-bar.tsx:132-141 renders every other lens with count={counts.type[l]}. filter-pill.tsx:245 renders count 0 ('Bonuses 0') even though the bonus programme is withdrawn. SW labels 'Pesa zilizoingia', 'Pesa zilizotoka', 'Marekebisho', 'Marejesho' (i18n-dict.ts:3660-3661) are long in a 328px scroller.

### S10-12 · ⚪ low · 🕓 unverified · number
**Platform limit rows (Per deposit / Per withdrawal)** — `/wallet?tab=limits`

The range drops 'TZS' from the maximum and states the same limit in a different grammar from the withdraw hint. At 360 in EN the value breaks mid-range ('TZS 1,000 –' / '5,000,000'), and at 320 both rows break in every locale.

*Evidence:* wallet-client.tsx:677 capStr = `${formatTzs(min)} – ${formatNumber(max)}` gives 'TZS 1,000 – 5,000,000'. :854-857 row 'flex items-center justify-between gap-3 … px-4 py-3.5', value 'font-mono font-bold text-[14px]' with no nowrap. Inner width at 360 is 286px; 'Per withdrawal' (about 104px) + 16 + 21 ch × 8.4 (about 176px) = 296px. The same limit reads 'Min TZS 1,000 · Max TZS 5,000,000' in i18n-dict.ts:1139.

### S10-16 · ⚪ low · 🕓 unverified · container
**Hand-rolled notices: failed alerts, capped note, receipt pending note** — `/wallet/deposit, /wallet/withdraw, /wallet, /wallet/receipt/`

Deposit and withdraw paint the same failure in two different reds, and one uses the stake-side NO ink for an app state. Four notices are hand-typed with three radii (12/16) and three paddings instead of the kit Callout.

*Evidence:* deposit/page.tsx:127 'rounded-xl border border-danger-border bg-danger-bg px-4 py-3'. withdraw/page.tsx:167 'rounded-xl border border-no-700/60 bg-no-500/[0.10] px-4 py-3' (betting NO ink). wallet-client.tsx:766 capped note 'rounded-lg border border-border bg-bg-elevated/60 px-3 py-2'. receipt/[id]/page.tsx:115 'rounded-xl border border-brand-600/50 bg-brand-500/[0.08] px-4 py-3'.

### S10-17 · ⚪ low · 🕓 unverified · layout
**Deposit provider radio grid (5 rails)** — `/wallet/deposit`

Below 640 the Card tile sits alone at half width on a third row: an orphaned element, and 106px of height spent on one option.

*Evidence:* provider-radio-grid.tsx:41: providers.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'. deposit/page.tsx:39-45 passes 5 providers. Tile ≈ py-3.5 (28) + 48px PaymentLogo + gap-2 (12) + 13px name (about 16) + 2 border ≈ 106px, so rows 2/2/1 make a grid of about 342px at 360.

### S10-20 · ⚪ low · 🕓 unverified · link
**Bonus grants 'Show all / Show live' toggle** — `/wallet (legacy grant holders)`

The only way to see expired, forfeited or cancelled grants is a 10px link about 15px tall.

*Evidence:* wallet-client.tsx:405-409 <Link … className="font-mono text-[10px] text-gold-200/80 underline underline-offset-2"> inside a text-center <p>; line box about 15px, no padding.

### S10-21 · ⚪ low · 🕓 unverified · typography
**Bonus grant rows (badge, progress line, figures)** — `/wallet (legacy grant holders)`

The card uses 6 sizes (8, 9.5, 10, 12, 13, 38). The 8px badge is below the 8.5px nano floor, the 9.5px line is not an uppercase microlabel, and finished grants dim their money figure to 70%.

*Evidence:* wallet-client.tsx:360 status badge 'text-[8px]'. :387 progress line 'font-mono text-[9.5px]' in lowercase ('TZS 12,000 / TZS 60,000 played'). :365 and :305 'text-[12px]'; :401 'text-[10px]'; :368 text-body-sm; :293 38px. :351 non-running rows use 'opacity-70' over the money figure.

### S10-22 · ⚪ low · 🕓 unverified · copy
**Hard-coded English in wallet components** — `/wallet, /wallet/receipt/[id]`

SW and ZH players read English source names on their bonus rows and an English method name on receipts; screen readers announce English.

*Evidence:* wallet-client.tsx:127-129 BONUS_SOURCE_LABEL = { ADMIN: "Gift", REFERRAL: "Referral", PROPOSAL: "Proposal", INVITE: "Invite", PROMOTION: "Promo", CASHBACK: "Cashback" }, rendered at :354. receipt/[id]/page.tsx:182 'Bank transfer'. cash.tsx:91 aria-label 'balance hidden'. wallet-client.tsx:683 '24h','7d','30d','6m'.

### S10-23 · ⚪ low · 🕓 unverified · typography
**Transaction row (TxnRow) type sizes, plate and column widths** — `/wallet (Activity)`

The row uses 4 hand-typed off-ladder sizes, and the 34px icon plate is off the 40/32/24 rungs. Large amounts make the date wrap onto two lines, so row heights stop matching; at 320 the description is reduced to a stub.

*Evidence:* wallet-client.tsx:507 description 'font-display text-[13.5px]'; :510 date 'font-mono text-[10.5px]'; :515 amount 'font-mono text-[14px]'; :518 status text-micro; expanded :524 'text-[11px]', :558 and :583 'text-[11px]'; plate :475 'h-[34px] w-[34px]'. At 360 with '+TZS 1,250,000' (about 118px) the text column is 296 - 34 - 32 - 118 = 112px, while the date '15 Sept 2026, 14:30' (19 ch × 6.3 ≈ 120px, utils.ts:279) needs more, so it wraps. At 320 the description gets about 89px (about 7 characters).

### S10-24 · ⚪ low · 🕓 unverified · number
**Signed amounts on ledger rows, receipt and withdraw confirm** — `/wallet, /wallet/receipt/[id], /wallet/withdraw (confirm)`

Three sign grammars appear for one currency, and debit rows carry no sign at all; direction depends on a small arrow glyph and white versus green ink.

*Evidence:* wallet-client.tsx:516 `${isCredit && !movedNothing ? "+" : ""}${formatTzs(Math.abs(tx.amount))}` gives '+TZS 5,000' for credits and 'TZS 5,000' for debits. utils.ts:62-64 formatTzs puts the sign after the currency ('TZS −5,000'). withdraw-confirm.tsx:176 prints `−${formatTzs(fee)}` ('−TZS 150'). receipt/[id]/page.tsx:101 and :123 always print the absolute value.

### S10-25 · ⚪ low · 🕓 unverified · number
**Withdraw hero Available figure, hold line and receipt title amount** — `/wallet/withdraw, /wallet/receipt/[id]`

The same Available balance renders in the mono face on /wallet and in Sora on /wallet/withdraw. The receipt's headline amount is letter-spaced display type. The hold line is an off-ladder 10.5px fragment that starts with lowercase 'hold'.

*Evidence:* withdraw/page.tsx:155 <Cash className="font-display font-bold text-[22px] tabular-nums …"> (Sora). :159 hold line 'font-mono text-[10.5px]' reads `${t.wallet.holdWarning} ${formatTzs(hold)}`, i.e. 'hold TZS 5,000' (i18n-dict.ts:1128). receipt/[id]/page.tsx:101 title={formatTzs(...)} passes through page-header.tsx:54 'font-display text-title-lg … tracking-[-0.02em]'. /wallet renders the same balance in mono without tracking (wallet-client.tsx:79-86; stat.tsx:35-39 §M4).

### S10-26 · ⚪ low · 🕓 unverified · button
**Deposit/Withdraw confirm trigger and disabled withdraw submit** — `/wallet/deposit, /wallet/withdraw`

The tap that opens the dialog is gold and the button that commits is royal. Money going out wears earned-money gold. When payouts are closed the same control changes component, colour and label.

*Evidence:* deposit-confirm.tsx:151 and withdraw-confirm.tsx:209 trigger 'btn btn-gold btn-lg w-full', while the dialog confirm is tone="brand" (:125, :161). amount-field.tsx:10 says 'De-golded on purpose: gold is reserved for earned money'. withdraw/page.tsx:286 swaps in <SubmitButton label={t.common.confirm} /> when payouts are closed (submit-button.tsx:64 btn-primary): the label becomes 'Confirm', not 'Confirm withdrawal'.

### S10-27 · ⚪ low · 🕓 unverified · state
**Withdraw form while payouts are unavailable** — `/wallet/withdraw (payout status unavailable)`

Stacked opacity makes quick-amount labels and the input nearly illegible, and the fee disclosure and 'Secured by KYC' notices fade to 60% even though they stay true while the rail is down.

*Evidence:* withdraw/page.tsx:220 form '… opacity-60'. amount-field.tsx:87 chips 'disabled:opacity-50' give about 0.30 effective opacity on text-text-subtle labels. input.tsx:140 locked opacity 0.72 gives about 0.43. withdraw/page.tsx:281-284 fee disclosure panel ('Withdrawal fee' with pct) is dimmed with the form.

### S10-28 · ⚪ low · 🕓 unverified · container
**Wallet panel padding on phones (extends U18 list)** — `/wallet, /wallet/deposit, /wallet/withdraw`

Every wallet panel pads 24px on a phone against the 16px panel rung. Form content is 280px at 360 instead of 296, which is part of why the balance, tiles and billing fields wrap (S10-05, S10-14).

*Evidence:* wallet-client.tsx:73 BalanceCard 'p-5' and :278 BonusWalletCard 'p-5' (24px). deposit/page.tsx:188 and withdraw/page.tsx:220 form 'glass-panel p-5'. email-verify-gate.tsx:56 'p-5'. page-hero.tsx:29 default 'p-5' on 4 wallet heroes. U18 (MOBILE-VISUAL-PLAN.md:573) names only KycGatePanel p-6 and Callout stack.

### S10-29 · ⚪ low · 🕓 unverified · container
**Nested bordered boxes in withdraw form and ledger detail** — `/wallet/withdraw, /wallet (expanded row)`

The withdraw form stacks three bordered, filled frames inside a glass panel, and each expanded transaction opens up to five bordered cells inside the bordered list. This is the chunky box-in-box look at depth 2.

*Evidence:* withdraw/page.tsx:262 destination 'rounded-xl border border-border bg-bg-inset/60 px-3.5 py-3' and :281 notices 'rounded-xl border border-border bg-bg-elevated/50 divide-y' inside :220 'glass-panel p-5'; provider tiles 'rounded-md border' in the same panel. wallet-client.tsx:525-583 detail cells 'rounded-md border border-border/60 bg-bg-overlay/40 px-2.5 py-1.5' inside the :775 'rounded-xl glass-panel' list.

### S10-30 · ⚪ low · 🕓 unverified · a11y
**Heading order, duplicate logo names, standing alert role** — `/wallet/withdraw, /wallet/deposit, /wallet?tab=methods`

Screen readers hit a skipped heading level on the identity panel, hear 'M-Pesa M-Pesa' on each tile, and get an assertive alert interruption on every visit to deposit and withdraw while payouts are delayed.

*Evidence:* withdraw page: PageHeader h1 (page-header.tsx:54) is followed by KycGatePanel h3 (kyc-gate-panel.tsx:147), skipping h2. payment-logo.tsx:100 alt={name} while the tile prints the same name (provider-radio-grid.tsx:92; wallet-client.tsx:837). payout-status-notice.tsx:84 role="alert" on every page load, against callout.tsx:230-234's own warning.

### S10-31 · ⚪ low · 🕓 unverified · copy
**Payout 'Since' date and transaction dates** — `/wallet/withdraw, /wallet/deposit, /wallet`

The outage date can be a day off near midnight EAT, is numeric day-first in all locales, and is missing on the deposit notice where the product says it matters most. Ledger dates show English month names to SW and ZH players.

*Evidence:* withdraw/page.tsx:182 new Date(payouts.declaredAt).toLocaleDateString("en-GB") has no timeZone and gives '14/09/2026' in every locale; utils.ts:282-292 documents this exact inline call as the 3-hours-off bug. deposit/page.tsx:139-150 passes no since. formatDateTime (utils.ts:279) renders English months ('15 Sept 2026') on SW and ZH rows.

### S10-32 · ⚪ low · 🕓 unverified · number
**LimitUsageMeter label and figures** — `/profile/responsible-gambling (limits usage)`

In a 240–280px card on a phone the nowrap figures take about 200px, so the limit name is squeezed to one word per line. Both sizes are off the ladder.

*Evidence:* src/components/rg/limit-usage.tsx:42-46: label 'text-[12.5px]' beside 'font-mono text-[11.5px] tabular-nums … whitespace-nowrap' holding 'TZS 1,250,000 / TZS 2,000,000' (about 29 ch × 6.9 ≈ 200px, unshrinkable) in a justify-between row.

### S10-33 · ⚪ low · 🕓 unverified · button
**Empty-state filter exits vs Clear all** — `/wallet (filtered empty)`

Getting out of a filter has two designs, a 40px rounded rectangle in the empty state and a 44px pill in the sheet, and the exits sit below the 44px phone preference.

*Evidence:* wallet-client.tsx:812 exits 'btn btn-ghost btn-sm' (40px, radius --r-md 12); query-bar.tsx:372 QueryClear 'inline-flex min-h-[44px] … rounded-pill'.

### S10-34 · ⚪ low · 🕓 unverified · copy
**Methods tab channel list** — `/wallet?tab=methods`

The Methods tab omits Card, which the deposit form offers, and its non-interactive tiles look like tappable cards with no action.

*Evidence:* wallet-client.tsx:597-602 METHODS lists 4 mobile-money rails; deposit/page.tsx:39-45 offers 5 (adds CARD); supportedChannels copy (i18n-dict.ts:105) says 'Add funds from any of them'. Tiles at :831-840 are 'rounded-xl border bg-bg-elevated p-4', card-shaped but not interactive.

### S10-35 · ⚪ low · 🕓 unverified · layout
**Receipt status chip and ink** — `/wallet/receipt/[id]`

The only centred element on a left-aligned page reads as orphaned, and the same status word is green or rose betting ink on the receipt but app-state ink on the ledger row.

*Evidence:* receipt/[id]/page.tsx:106-111 '<div className="flex justify-center">' chip 'rounded-pill border px-3 py-1 text-[12px]' under a left-aligned PageHero. STATUS_TONE :62-68 uses 'border-yes-700/60 bg-yes-500/10 text-yes-300' and 'text-no-300', while the ledger row (wallet-client.tsx:446-450) moved the same status words to success-fg/danger-fg on 2026-09-14 (§B2a).

### S10-36 · ⚪ low · 🕓 unverified · button
**Deposit return action order** — `/wallet/deposit/return`

On phones the primary action moves from the top slot on success to the bottom slot on failure, so the thumb lands on different actions for the same position.

*Evidence:* deposit/return/page.tsx:168-199 'flex flex-col sm:flex-row gap-2.5'. PAID: btn-primary 'Back to wallet' then ghost 'View receipt'. FAILED: ghost 'Back to wallet' first, then btn-primary 'Try again'.

### S10-37 · ⚪ low · 🕓 unverified · copy
**Filter sheet apply button label (SW/ZH)** — `/wallet filter sheet`

Swahili puts a capital noun mid-phrase ('Onyesha Miamala 57'), and Chinese joins the verb and number with no space, because one sentence is composed from two strings.

*Evidence:* wallet-bar.tsx:153 applyLabel = t.market.filtersApply.replace("{n}", resultPhrase) with 'Onyesha {n}' (i18n-dict.ts:3360) and 'Miamala {n}' (:3659) gives 'Onyesha Miamala 57'; ZH '显示{n}' (:5495) plus '{n} 笔交易' gives '显示57 笔交易'.

### S10-38 · ⚪ low · 🕓 unverified · icon
**Glyph sizes across wallet surfaces** — `/wallet, /wallet/deposit, /wallet/withdraw, /wallet/receipt/`

Nine glyph sizes on four related screens; 11, 13, 15 and 17 are off the 16/18/20/24 set, and the notice rows use 15 while the neighbouring Callouts use 14 and 17.

*Evidence:* back-link.tsx:59 s=11; provider-radio-grid.tsx:89 s=11; wallet-client.tsx:95 s=12; :75 and :280 s=13; deposit/page.tsx:119 and withdraw/page.tsx:148 s=14; withdraw/page.tsx:282-283 s=15; wallet-client.tsx:476 s=16; callout.tsx:163 s=17; kyc-gate-panel.tsx:141 s=18.

### S10-39 · ⚪ low · 🕓 unverified · textbox
**Amount field (deposit and withdraw)** — `/wallet/deposit, /wallet/withdraw`

A 7-digit amount is typed and shown ungrouped ('2000000') with an ungrouped placeholder, so a dropped zero is easy on a budget keypad. The hint with the bounds is not announced with the field.

*Evidence:* amount-field.tsx:52-67 Input with inputMode="numeric" autoComplete="off" placeholder="10000" min/max (inert on type text, input.tsx:111) and no enterKeyHint. The hint at :102 is not linked by aria-describedby. Chips at :87 use text-[11.5px].

### S10-40 · ⚪ low · 🕓 unverified · container
**Deposit trust strip placeholder** — `/wallet/deposit`

The last element of the live deposit page is a dashed empty placeholder box, which reads as a missing image or a broken seal on the page where trust matters most.

*Evidence:* deposit/page.tsx:263-277: 'flex items-center gap-3 rounded-xl border … px-4 py-3' holding a 40px 'border border-dashed' empty slot with a shield glyph beside t.wallet.securedDepositBody. The comment at :258-259 says the regulator seal is pending.

## S11-account — Positions, watchlist, notifications, profile (code)

### S11-001 · 🟠 high · 🕓 unverified · number
**Activity money tiles (Deposits / Withdrawals / Staked / Won / Refunds / Net)** — `/profile/activity`

At 360 the panel's inner width is 328−48(p-5)−2 = 278px; two columns of gap-3 (16px) give 131px, and the tile's px-3.5 (14px) + 1px border leave 101px of text. A 17px mono figure is 10.2px/char, so `TZS 50,000` (10 chars) is 102px and already wraps — every six- and seven-figure amount breaks `TZS` onto its own line above the digits. The value `<p>` (stat.tsx:229) carries no `white-space: nowrap` and no `.amount`.

*Evidence:* src/app/profile/activity/page.tsx:155 `<div className="grid grid-cols-2 gap-3 md:grid-cols-3">` inside :152 `section className="rounded-xl glass-panel p-5"`; tiles at :163-178 `<Stat size="lg" … boxed="tile" money …/>`; src/components/ui/stat.tsx:88 lg = `text-[17px]`, :117 tile = `rounded-lg border … px-3.5 py-3`.

### S11-002 · 🟠 high · 🕓 unverified · number
**Net P&L hero amount** — `/positions/performance`

Panel inner width at 360 is 278px. At 34px, mono runs 20.4px/char, so `+TZS 1,234,567` (14 chars) is 286px and `+TZS 12,345,678` is 306px — wider than the panel. `.amount` forbids wrapping and the panel does not clip, so a seven-figure P&L pushes out of the card and past the 16px gutter (at 320 even `+TZS 123,456` at 245px overflows the 238px panel). The file's own note (:235-241) records 34px as an unverified exception 'until a player credential exists'.

*Evidence:* src/app/positions/performance/page.tsx:212 `section className="glass-panel p-5"` → :227 `<div className="min-w-[220px]">` → :243 `className={`amount text-[34px] font-bold leading-none …`}` rendering `formatTzsSigned(netPnl)`; `.amount.amount { … white-space: nowrap; }` src/app/globals.css:945.

### S11-003 · 🟠 high · 🕓 unverified · number
**Best-win crest amount** — `/positions/performance`

Text column = 328 − 48(p-5) − 2 − 48(disc) − 14(gap-3.5) = 216px at 360. At 26px mono (15.6px/char) `TZS 123,456` is 171px, `TZS 1,234,567` is 203px and `TZS 12,345,678` is 219px — and because the card is `overflow-hidden` with `.amount` nowrap, the tail of the biggest win a player has ever had is cut off rather than pushed out. At 320 the column is 176px and a six-figure win already clips.

*Evidence:* src/app/positions/performance/page.tsx:278-280 `className="relative overflow-hidden rounded-xl border border-gold-700/50 p-5"`; :284 `<div className="mt-3 flex items-center gap-3.5">` with a 48px disc (:289 `h-[48px] w-[48px]`); :298 `<p className="amount text-[26px] lg:text-[30px] …">{formatTzsAbs(bestMarket.payout)}</p>`.

### S11-004 · 🟠 high · 🕓 unverified · layout
**Page header row — title + 'View performance' ghost button** — `/positions`

The button is `shrink-0`: 24px padding + 2px border + 13px glyph + 8px gap + ~110px label ≈ 157px. With gap-3 (16px) the title column gets 328−173 = 155px at 360 and 115px at 320, while the h1's min-content is the word 'predictions' at 28px ≈ 154-178px. The flex row's min-content therefore exceeds the viewport at 320 (≈327 vs 288) and is at the edge at 360, so the header either overflows horizontally or paints the title into the button. The `<PageHeader>` wrapper has no `min-w-0`.

*Evidence:* src/app/positions/page.tsx:257 `<header className="flex items-start justify-between gap-3">`, :264 `<PageHeader … title={t.positions.headline} …/>`, :266 `<Link className="btn btn-ghost btn-sm inline-flex items-center gap-1.5 shrink-0 mt-1">` + `<I.chart s={13}/>` + `t.performance.viewPerformance`; strings: i18n-dict.ts:1667 headline `"Your predictions"`, :1728 `"View performance"`.

### S11-005 · 🟠 high · 🕓 unverified · button
**'Change' / 'Set password' trigger** — `/profile/account`

A 30px-tall control — the only way into changing an account password — sits 10px under the 40px floor and 14px under the phone preference of 44. Its open-state siblings at :134 and :141 are `h-[40px]`, so the same flow contains two different button heights, neither of them the kit's `.btn`.

*Evidence:* src/components/profile/password-section.tsx:71 `className="h-[30px] px-3 rounded-md border border-border bg-bg-elevated font-mono text-[11px] font-bold …"`.

### S11-006 · 🟠 high · 🕓 unverified · textbox
**Contact-email inline editor field** — `/profile/account`

The field is an underline with `py-0.5` (2px): 16px (the phone !important guard at globals.css:1789-1795) × 1.5 + 4 + 1 ≈ 29px tall — 15px under the 44px phone text-box floor — and it is not the kit `.input`/`<Input>`, so it has neither the 44px height token, the inset background, nor the error state. The read-mode trigger (~21px) and the 'Resend link' button (~16px) are also under the tap floor, on the control that owns where every receipt is sent.

*Evidence:* src/components/profile/email-editor.tsx:124-135 `<input type="email" … className="flex-1 min-w-0 bg-transparent border-b border-border-control … text-[14px] text-text px-0 py-0.5" />`; read-mode trigger at :142 `<button className="inline-flex items-center gap-2 text-left group">`; resend at :158 `className="font-mono text-[11px] …"`.

### S11-007 · 🟠 high · 🕓 unverified · link
**Identity and email status pills used as links** — `/profile`

The route into identity verification and into confirming an email — both gates on money — are 21–23px tall tap targets with no padding added by the anchor. They are also the only two chips in that row that are interactive, and nothing distinguishes them from the four decorative chips beside them (`no-underline` removes the only affordance).

*Evidence:* src/app/profile/page.tsx:186 `<Link href="/profile/kyc" data-testid="profile-kyc-pill" className="no-underline">{kycPillNode}</Link>` and :194 `<Link href="/profile/account" className="no-underline"><Pill tone="warning">…</Pill></Link>`; Pill = `<Chip size="md">`, src/components/ui/chip.tsx:43 md base `height: 21` (status 23).

### S11-008 · 🟠 high · 🕓 unverified · a11y
**Per-row 'mark as read' icon button** — `/notifications`

Every row's check button announces as 'Read all' / 'Soma zote' — the name of the bulk control in the bar above it (bulk-bar.tsx:505 uses the same key). A screen-reader or voice-control user asking for 'Read all' gets 12 identical targets, and the one that really marks everything read is indistinguishable from the one that marks a single receipt.

*Evidence:* src/app/notifications/page.tsx:283 `readLabel={t.common.readAll}` passed into `<NotificationRowActions>`; src/app/notifications/row-actions.tsx:588 `aria-label={readLabel}` on the single-row check button; i18n-dict.ts:59 `readAll: "Read all"` / :2716 `"Soma zote"` / :4852 `"全部已读"`.

### S11-009 · 🟠 high · 🕓 unverified · number
**'Your standing' figures (At risk / Live value / Settled P&L)** — `/positions`

At 412 the strip is 330px wide → two 165px columns; `pl-3.5` + 1px border leave 150px. A 19px mono figure is 11.4px/char, so `+TZS 1,234,567` (160px) wraps at its only space and prints `+TZS` above `1,234,567`. The same happens in every 2- and 3-column arrangement from 412 up. 19px and 10.5px are both off the type ladder.

*Evidence:* src/components/positions/pnl-summary-strip.tsx:63 `gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))"` with `gap-x-0`; values at :96 `className={`mt-[7px] font-mono text-[19px] font-bold tabular-nums leading-[1.1] ${valueClass}`}` (and :81) — no `.amount`, no `whitespace-nowrap`.

### S11-010 · 🟠 high · 🕓 unverified · number
**Deposit/loss limit usage meters** — `/profile/responsible-gambling`

Meters live two boxes deep: 24+1 (panel) + 20+1 (inner box) = 46px of padding per side, leaving 236px at 360. The money pair is `whitespace-nowrap`: `TZS 1,000,000 / TZS 5,000,000` is 29 chars × 6.9px = 200px, so the label is squeezed to ~28px (one word per line in Swahili) and the row's min-content (~258px) overflows the inner box. This is the surface a player uses to read their own remaining headroom.

*Evidence:* src/components/rg/limit-usage.tsx:42-46 `<div className="flex items-baseline justify-between gap-2">` with `<span className="font-mono text-[11.5px] tabular-nums text-text-muted whitespace-nowrap">{formatTzs(used)} / {formatTzs(cap)}</span>`; host box src/app/profile/responsible-gambling/page.tsx:192 `rounded-lg border border-border/70 bg-bg-elevated/30 p-4` inside :146 `glass-panel p-5`.

### S11-011 · 🟠 high · 🕓 unverified · layout
**Requested-document uploader row** — `/profile/kyc (ADDITIONAL_INFO_REQUIRED)`

Inside the KYC panel (glass-panel p-5) the row has 244px at 360. Fixed items take 40+16+16+48+16+button: 203px with 'Upload' and 224px with the Swahili 'Badilisha' — leaving the officer's request text 41px, or 20px in the Swahili replace state. The description ('Send a utility bill from the last 3 months') then renders 2–4 characters per line, which is the one sentence telling the player what the officer needs.

*Evidence:* src/components/profile/kyc-doc-uploader.tsx:193 `rounded-md border border-gold-700/40 bg-gold-500/[0.04] p-3`, :204 `<div className="flex items-center gap-3">` with a 40px disc (:208), `<div className="min-w-0 flex-1">` (:213), a 48px preview (:219) and a `btn btn-sm btn-pill` (:225).

### S11-012 · 🟠 high · 🕓 unverified · container
**Route error boundary** — `/positions, /watchlist, /notifications, /profile (error.tsx)`

On this repo's scale `py-12` is 128px, not 48 — so every route error on the account surfaces pays 256px of vertical padding, and `px-5` is a 24px gutter against the 16px page gutter every other surface uses. With the 56px header the error mark starts ~184px down a 780px screen and the two 44px recovery buttons are pushed toward the fold.

*Evidence:* src/components/ui/route-error.tsx:107 `className="relative mx-auto flex min-h-[60svh] w-full max-w-[560px] flex-col items-center justify-center overflow-hidden px-5 py-12 text-center"`; consumed by src/app/positions/error.tsx:15, src/app/watchlist/error.tsx (RouteError), src/app/notifications/error.tsx, src/app/profile/error.tsx.

### S11-013 · 🟠 high · 🕓 unverified · a11y
**Break-length and exclusion-period selects** — `/profile/responsible-gambling`

`FieldLegend` renders a `<span>`, so it labels nothing; neither call site passes `ariaLabel` or `placeholder`. Both selects therefore announce as the generic 'Select…' — on the two controls that set how long a player is locked out of a real-money account.

*Evidence:* src/app/profile/responsible-gambling/page.tsx:217-222 `<FieldLegend className="block mb-1.5">{t.rg.breakLength}</FieldLegend><Select name="period" defaultValue=… options=… />` (same shape at :245-250); src/components/ui/select.tsx:128 `const labelText = ariaLabel ?? placeholder ?? t.common.selectPlaceholder;` and :324 `<span id={labelId} className="sr-only">{labelText}</span>` with `aria-labelledby={labelId}`.

### S11-014 · 🟡 medium · 🕓 unverified · a11y
**Buttons nested inside links** — `/positions, /profile/invite`

Interactive content inside an anchor is invalid HTML and an ARIA violation: the card link's accessible name absorbs the share button's label, the button is announced as part of the link, and the share handler has to `preventDefault`/`stopPropagation` (position-share.tsx:377-379) to undo the navigation it should never have inherited.

*Evidence:* src/components/markets/position-card.tsx:61-202 — the whole card is a `<Link href={`/markets/${marketId}`}>` and :191 renders `<PositionShare …/>`, whose root is `<button …>` (src/components/markets/position-share.tsx:108); src/app/profile/invite/invite-client.tsx:141-150 `<a href={waHref}…><Button …/></a>` (twice) and src/app/profile/invite/page.tsx:421-425 `<a href="#referral-share"><Button …/></a>`.

### S11-015 · 🟡 medium · 🕓 unverified · link
**Notification row title link** — `/notifications`

`text-body-sm` with `leading-tight` is 13×1.25 ≈ 16px, so a one-line notification's only route to the market/receipt it announces is a 16px-tall target (33px for two lines), while the 90% of the row that looks tappable (body text, icon plate) is inert.

*Evidence:* src/app/notifications/page.tsx:258-266 `<Link href={n.href} className="block group"><p className="font-display text-body-sm font-semibold text-text leading-tight …">` — the link wraps only the title; the body (:273) and the timestamp (:274) sit outside it.

### S11-016 · 🟡 medium · 🕓 unverified · textbox
**KYC contact-email field** — `/profile/kyc (step 1)`

`inputMode="text"` overrides the e-mail keyboard, so an Android player types an address on a keyboard with no `@` and no `.com` key; `autoComplete="email"` is also absent, so the address the same player already gave at sign-up is not offered. This is the field that gates the verification e-mail the whole KYC flow depends on.

*Evidence:* src/app/profile/kyc/page.tsx:532-542 `<Field id="email" label={t.common.email} … type="email" required maxLength={254} inputMode="text" placeholder="you@example.com" />` → src/components/ui/input.tsx:158 `inputMode={effectiveInputMode}` (the explicit `inputMode` wins over the type).

### S11-017 · 🟡 medium · 🕓 unverified · state
**ID-number field refusal** — `/profile/kyc (step 1)`

When the server refuses the number, the message is printed as a detached paragraph pulled up by a negative margin and is not wired to the input: the field keeps its neutral border, gets no `aria-invalid`/`aria-describedby`, and a screen-reader user tabbing back to the field hears no error. A second error style also exists three fields down (`date-select.tsx:340` 11px mono) for the same kind of failure.

*Evidence:* src/app/profile/kyc/page.tsx:408-419 `<Field id="idNumber" … />` (no `error` prop) and :430-434 `{sp.reason === "id_number_format" && (<p role="alert" className="-mt-2 text-body-sm leading-snug text-danger-fg">…)`; the kit's error path is src/components/ui/input.tsx:123 `errored ? "border-danger-500"` + Field's `error` slot at :217.

### S11-018 · 🟡 medium · 🕓 unverified · button
**Date-picker day and year cells** — `/profile/kyc (DOB / ID expiry)`

Day cells are 36px and year cells 32px — 4 and 8px under the 40px floor — in a 7-column grid ~42px wide, i.e. the densest tap grid in the account area, used to enter a date of birth that gates the account. The calendar's own header buttons are `h-8 w-8` = 48px on this scale, so the same dialog mixes 48/36/32px controls.

*Evidence:* src/components/ui/date-select.tsx:400 `"h-[36px] rounded-md font-mono text-[13px] tabular-nums transition-all"` (day cells) and :450 `"h-[32px] …"` (year cells), inside a panel capped at `max-w-[320px]` (:357).

### S11-019 · 🟡 medium · 🕓 unverified · button
**'Manage the Needle' trigger** — `/profile/responsible-gambling (FeedbackSettings)`

12.5px inheriting body line-height 1.5 = 18.75px plus `py-2` (12px on this scale, both sides) and 2px border ≈ 37px — 3px under the floor, and the only control in that settings list that is not a 44×26 Toggle with a documented 40px hit overlay.

*Evidence:* src/components/layout/needle-drawer.tsx:138 `className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-overlay px-3 py-2 font-display text-[12.5px] font-semibold …"`; host row src/components/settings/feedback-settings.tsx:92-94.

### S11-020 · 🟡 medium · 🕓 unverified · button
**Search clear (✕) button** — `/positions, /watchlist, /notifications, /profile/account`

38×38 is 2px under the 40px floor and 6px under the phone preference, on the control every one of these four surfaces offers for backing out of a search. (The search field itself is correct: `.input` 44 + 1px group border, and the ≤768 guard forces 16px.)

*Evidence:* src/app/globals.css:1746-1752 `.search-box .clear-btn, .market-search .clear-btn { … width: 38px; height: 38px; margin-right: 3px; … }`; rendered by src/components/ui/search-box.tsx:160-167.

### S11-021 · 🟡 medium · 🕓 unverified · container
**EmptyState box padding** — `/positions, /positions/performance, /watchlist, /notificatio`

48px of padding per side leaves 230px of content at 360 and 190px at 320 for the sentence that explains why the list is empty and for the exit chips under it — the exits (`btn btn-ghost btn-sm` with a count) then wrap one per line. 96px of horizontal padding also puts the empty card's text off the page's 16px gutter grid, and 15.5px is off the type ladder.

*Evidence:* src/components/ui/empty-state.tsx:69 `"rounded-xl border border-dashed border-border-strong bg-bg-elevated px-8 py-8 text-center"` (spacing 8 = 48px); title at :78 `text-[15.5px]`.

### S11-022 · 🟡 medium · 🕓 unverified · container
**Nested bordered panels (box-in-box)** — `/profile/account, /profile/responsible-gambling, /profile/ky`

Five surfaces put a bordered/filled box inside a bordered/filled panel with 40-46px of stacked padding per side — above the ~40px threshold the plan flags as chunky — and on a phone the account summary's six tiles collapse to one column, so the page becomes six full-width boxes inside a box, ~410px tall, to show six read-only facts.

*Evidence:* account/page.tsx:211 `glass-panel p-5` + :459 Item `rounded-md border border-border bg-bg-overlay/40 px-3 py-2.5` (6 tiles, 1 column at 360) → 24+1+16+1 = 42px per side; responsible-gambling/page.tsx:146 `glass-panel p-5` + :192 `rounded-lg border border-border/70 … p-4` → 46px; kyc/page.tsx:308 `glass-panel p-5` + kyc-doc-uploader.tsx:193 `… p-3` → 42px; security-client.tsx:152 `glass-panel p-5` + :185 `rounded-md border … p-3` → 42px; source-of-funds/page.tsx:128 `glass-panel p-5` + :262 `… p-3.5` → 40px.

### S11-023 · 🟡 medium · 🕓 unverified · state
**Loading skeletons vs the rendered page** — `/profile, /positions, /watchlist, /notifications`

Every ghost on these four routes is shorter than what replaces it — profile ≈ 250px, positions ≈ 235px + per-card — so the first paint jumps on every load; and `PageLoader`'s own 80px padding block is a composition none of these pages ever shows.

*Evidence:* profile/loading.tsx:27 `h-[64px] w-[64px]` avatar vs AvatarUploader size="2xl" = 80px (avatar.tsx:13); profile/loading.tsx:38 `grid grid-cols-3` vs profile/page.tsx:208 `grid grid-cols-2 sm:grid-cols-3`; the ghost has no achievements section (page.tsx:282-293). positions/loading.tsx:50 `mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4` vs pnl-summary-strip.tsx:63 `repeat(auto-fit, minmax(158px,1fr))` (one column at 360, ≈4 stacked cells ≈ 324px vs the ghost's ≈96px); positions/loading.tsx:97 card ghosts ≈88px tall vs a real PositionCard ≈250px (+40 ring row +44 Sell). watchlist/loading.tsx and notifications/loading.tsx render the generic `PageLoader` (page-loader.tsx:50 `p-10` = 80px padding, then 64px rows) against a 14px market grid and 80px glass rows.

### S11-024 · 🟡 medium · 🕓 unverified · number
**Negative and prefixed money formats** — `/profile/activity, /positions, /positions/performance, /prof`

One product prints a negative amount three ways (`TZS −5,000`, `−TZS 5,000`, `−5,000`), puts the currency below the figure on the invite/agent surfaces, and shows the same 'at risk' quantity compacted in one panel and in full in the panel above it.

*Evidence:* activity/page.tsx:178 `value={summary.net >= 0 ? `+${formatTzs(summary.net)}` : formatTzs(summary.net)}` — `formatTzs` puts the sign after the unit (utils.ts:62-65 `TZS ${sign}${…}`) → `TZS −5,000`; pnl-summary-strip.tsx:68/74 and performance/page.tsx:246/380 use `formatTzsSigned` → `−TZS 5,000` (utils.ts:213-215); sell-button.tsx:250 `−{formatNumber(fee)} {t.common.fee}` (no unit at all); invite/page.tsx:323-324 and agent-dashboard.tsx:128-131 `value={formatNumber(...)} hint="TZS"` (unit on a separate line); positions/page.tsx:304-306 `formatTzsCompact` (`TZS 1.2M`) directly under the strip's full `formatTzsAbs` of the same exposure.

### S11-025 · 🟡 medium · 🕓 unverified · number
**Referral / agent earnings tiles** — `/profile/invite`

At 360 (form tier, 328px) each tile is 159px wide and 129px inside its 14px padding. A 24px mono figure is 14.4px/char, so `1,234,567` (130px) already touches the edge and `12,345,678` (144px) overflows into the neighbouring tile — with no space in the string, nothing can wrap. 24px is also off the ladder.

*Evidence:* invite/page.tsx:316-327 and agent-dashboard.tsx:128-129 `<Stat size="3xl" … boxed="glass" tone="gold" money value={formatNumber(...)} hint="TZS" />`; stat.tsx:91 `"3xl": { text: "text-[24px]", face: "mono" … }`, :120 `glass: "rounded-xl glass-panel p-3.5"`; grid at invite/page.tsx:300 `grid grid-cols-2 gap-2.5`.

### S11-026 · 🟡 medium · 🕓 unverified · copy
**Hard-coded and half-translated strings** — `/profile/sessions, /profile/invite, /profile/account, /profi`

Seven strings on the signed-in account surfaces never reach the dictionary: a Swahili reader sees 'Chrome on Android', a Chinese reader gets the referral promises in English and an ASCII '&' inside a Chinese sentence, the recruit status chip prints an enum, and two landmark/region names are English-only for screen readers. 'AML' is an untranslated acronym as the page eyebrow.

*Evidence:* sessions/page.tsx:62 `const deviceLine = browser && os ? `${browser} on ${os}` : …` (English 'on'); invite/page.tsx:244 `{locale === "sw" ? p.sw : p.en}` (ZH readers get English promises); invite/page.tsx:408 `<Chip …>{r.status}</Chip>` (raw status token); account/page.tsx:320 `<ScrollX label="Account activity" …>`; kyc/page.tsx:713 `<section aria-label="Verification progress" …>`; source-of-funds/page.tsx:87 `eyebrow="AML"`; invite/page.tsx:336-340 `t.common.share + " " + t.profile.yourReferralLink.toLowerCase()` and `t.common.signUp + " & " + t.common.placeBet.toLowerCase()`.

### S11-027 · 🟡 medium · 🕓 unverified · state
**Source-of-funds declaration status panel** — `/profile/source-of-funds`

A declaration that is still under review is drawn inside a success-green panel with an amber chip inside it — the container says 'accepted' while the chip says 'under review', on a compliance record whose state decides whether withdrawals proceed. The same page's rejected state gets its own red panel, so the design already distinguishes states everywhere except this one.

*Evidence:* source-of-funds/page.tsx:109-126 `{existing && existing.reviewStatus !== "REJECTED" && (<section className="rounded-xl border border-success-border bg-success-bg p-4 …">` with `<Pill tone={statusTone}>` where :58-61 sets `statusTone = … : "warning"` for PENDING.

### S11-028 · 🟡 medium · 🕓 unverified · container
**Notice / callout compositions** — `/profile/account, /profile/kyc, /profile/source-of-funds, /p`

Seven hand-rolled notices sit beside the one kit Callout, with four different paddings (12/16/20/24), three radii (8/12/16), three body sizes (12/13/13.5) and two different `role` treatments — for the same job (tell the player something about their money or their account). Placement drifts too: /profile/account renders its banner above the BackLink, the other three below it.

*Evidence:* Hand-rolled: account/page.tsx:195 `<div role="alert" className="rounded-xl border border-danger-border bg-danger-500/10 px-4 py-3 text-[13px] text-danger-fg">`, kyc/page.tsx:159 and :164 (`bg-danger-bg` / `bg-success-bg`), source-of-funds/page.tsx:73 and :78, sessions/page.tsx:131 `rounded-xl border border-info-border bg-info-bg p-4`, security-client.tsx:221 `rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-[12px]`, profile/page.tsx:261 `rounded-xl border border-warning-border bg-warning-bg p-5`. Kit: responsible-gambling/page.tsx:93-97 `<Callout tone={banner.tone} live>` — the component exists at src/components/ui/callout.tsx with tone, size, role and `live` handling.

### S11-029 · 🟡 medium · 🕓 unverified · container
**Two designs for the same RG usage meter** — `/profile/activity vs /profile/responsible-gambling`

The same four RG limits are drawn twice, with different track heights (10 vs 12), different palettes for the same state (betting rose vs danger), different ARIA roles, and only one of the two states 'limit reached' in words — on /profile/activity a reached limit is signalled by colour alone.

*Evidence:* activity/page.tsx:214-236 `LimitMeter`: `h-2.5` track (10px) on `bg-bg-inset`, fill `over ? "bg-no-500" : tone === "no" ? "bg-warning-fg" : "bg-brand-500"`, `role="progressbar"`, label 12px, no over-limit text. src/components/rg/limit-usage.tsx:33-74 `LimitUsageMeter`: `h-2` track (12px) on `bg-bg-sunken`, fill `--danger-500 / --warning / --royal-400`, `role="meter"` with `aria-valuetext`, label 12.5px, and `{reached && <p …>{overLabel}</p>}`.

### S11-030 · 🟡 medium · 🕓 unverified · typography
**Off-ladder sizes and per-card size counts** — `all 12 routes in this group`

At least fourteen distinct hand-typed sizes appear across these routes (34, 30, 26, 24, 22, 21, 20, 19, 17, 15.5, 13.5, 12.5, 11.5, 10.5) while the ladder offers 10/11/12/13/14/16/18/22/28. The PositionCard alone carries seven sizes (9 label, 9.5-10 chips, 10 meta, 13.5 stat value, 14 stake, 15 title, 12 share) against the ≤3-per-card rule, and `stat.tsx`'s LABEL map introduces a 9px rung below the 9.5 floor the plan allows for mono microlabels.

*Evidence:* Hand-typed: performance/page.tsx:243 `text-[34px]`, :298 `text-[26px] lg:text-[30px]`, :344 `text-[30px]`, :365 `text-[20px]`, :366 `text-[12px]`; pnl-summary-strip.tsx:81/96 `text-[19px]`, :83/97 `text-[10.5px]`; stat.tsx:85-91 `text-[13.5px] / text-[15px] / text-[17px] / text-[21px] / text-[24px]`; empty-state.tsx:78 `text-[15.5px]`; invite/page.tsx:199/220 `text-[19px]`, :282 `text-[22px]`; profile/page.tsx:341-346 `text-[14px]`, SettingRow :391 `text-[13.5px]`; sessions/page.tsx:101 `text-[11.5px]`; query-bar.tsx:165 `text-[11.5px]`; position-card.tsx:125 `text-[14px]`, :137/:143 `text-[10px]`.

### S11-031 · 🟡 medium · 🕓 unverified · card
**PositionCard stake shown twice** — `/positions`

On an open position the same figure appears twice on one card — once unlabelled at the top right and once as 'Stake' below — so a third of the card's money area repeats itself, and on a phone that redundancy is paid in the vertical space the plan wants to reclaim from repeated labels.

*Evidence:* src/components/markets/position-card.tsx:125-127 `<span className="font-mono text-[14px] font-bold tabular-nums text-text"><Cash>{formatTzs(stake)}</Cash></span>` (header, unlabelled) and :168/:182 `<Stat label={t.dialog.stakeLabel} value={formatTzs(stake)} money />` (left column of both OPEN branches).

### S11-032 · 🟡 medium · 🕓 unverified · layout
**Countdown ring, deadline line and Sell button rendered outside the card** — `/positions`

An open position's exit control and its clock sit outside the card's border, 12px below it, while the next card starts 16px further down — a 4px difference decides which card the Sell button belongs to. On a one-column phone list this reads as an unattached control under a card, exactly the ambiguity a bordered card is meant to remove.

*Evidence:* src/app/positions/page.tsx:380-435 `<div key={p.id} className="space-y-2">` containing `<PositionCard …/>`, then the ring row (:407-423) and `<SellButton …/>` (:424-434); the list gap is :350 `grid grid-cols-1 items-start gap-3` (16px), the inner gap is `space-y-2` (12px).

### S11-033 · 🟡 medium · 🕓 unverified · card
**Pagination composition** — `/positions, /watchlist vs /notifications, /profile/account, `

Two of the five pagers are boxed and three are bare, and the boxed pair draws two stacked 1px rules at the top (the wrapper's border plus the component's own `border-t`). The `mt-4` on those wrappers is also inert — `space-y-6`'s `> * ~ *` selector (0,3,0) outranks `.mt-4` (0,1,0) — so the intended 20px is really 32px.

*Evidence:* positions/page.tsx:440 `<div className="mt-4 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden"><Pagination …/></div>` and watchlist/page.tsx:271 (identical), against bare `<Pagination …/>` at notifications/page.tsx:299, account/page.tsx:379 and agent-dashboard.tsx:219; the component's own root is pagination.tsx:175 `"flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 border-t border-border"`.

### S11-034 · 🟡 medium · 🕓 unverified · icon
**PageHeader icon slot and icon plates** — `all account routes`

The same PageHeader eyebrow slot carries a 22px glyph on five routes and a 14px glyph on five others — the 22px version is twice its 11px caption and sets the row height. Below it, one product area uses seven plate sizes, three of them (26, 30, 36) off the 40/32/24 rung set, and only two sites use the `IconPlate` primitive at all.

*Evidence:* `s={22}` in the 11px eyebrow slot: watchlist/page.tsx:172, notifications/page.tsx:159, activity/page.tsx:106, security/page.tsx:28, profile/notifications/page.tsx:34 — against `s={14}` at sessions/page.tsx:77, account/page.tsx:204, responsible-gambling/page.tsx:115, source-of-funds/page.tsx:86, kyc/page.tsx:200. Plates: 26 (invite/page.tsx:236 `IconPlate size={26}`), 30 (invite/page.tsx:343, agent-dashboard.tsx:171 `h-[30px]`), 32 (notifications/page.tsx:251 `IconPlate size={32}`, kyc ProgressRail :742), 36 (profile/page.tsx:341, kyc/page.tsx:231 and :288), 40 (profile SettingRow :385, push-settings.tsx:119, sessions/page.tsx:93, kyc `h-7 w-7`), 48 (performance/page.tsx:289), 56 (kyc/page.tsx:662 `h-14 w-14`).

### S11-035 · 🟡 medium · 🕓 unverified · a11y
**Links named only by a number / by an icon** — `/profile/notifications, /profile/activity`

The first link's entire accessible name is a digit ('3'), so a screen-reader list of links shows a number with no destination; the second is a bare verb. Both are also ~16px tall (11px × 1.5, no padding), so they fail the tap floor as standalone controls.

*Evidence:* profile/notifications/page.tsx:56-59 `<Link href="/watchlist" className="inline-flex items-center gap-1 shrink-0 font-mono text-[11px] text-accent-400 hover:text-text underline">{watched.length}<I.chevronRight s={12} /></Link>`; activity/page.tsx:192-194 `<Link href="/profile/responsible-gambling" className="inline-flex items-center gap-1 font-mono text-[11px] …">{t.activity.manageLimits}<I.chevronRight s={12}/></Link>` where `manageLimits` is 'Manage' / 'Dhibiti' / '管理'.

### S11-036 · 🟡 medium · 🕓 unverified · layout
**Verification progress rail labels** — `/profile/kyc`

Four nodes share 320px (360 viewport, form tier, px-1) = 80px each, 70px at 320. 'IMETHIBITISHWA' is 14 characters of 10px mono: 84px with tracking-normal, 104px with the eyebrow's 0.14em — a single word that cannot wrap, so it overflows into the neighbouring node's column and across the 2px connector. The rail's `aria-label` is also the English literal 'Verification progress'.

*Evidence:* src/app/profile/kyc/page.tsx:713-751 `ProgressRail`: `<section className="flex items-start px-1 pt-1">`, each node `relative flex min-w-0 flex-1 flex-col items-center`, label `mt-2 text-center text-balance font-mono text-micro font-semibold uppercase leading-tight ${tightLabels ? "tracking-normal" : "eyebrow"}`; SW `stepVerified` = 'Imethibitishwa' (i18n-dict.ts:3811).

### S11-037 · 🟡 medium · 🕓 unverified · number
**Notification timestamps and countdown ring** — `/notifications, /positions`

A year-old settlement receipt reads '365d' on the one surface the code calls 'where a player comes to find ONE receipt among a year of round results' — there is no week/month step and no absolute date fallback. The position ring collapses everything above 24h to whole days ('3d'), so a bet closing in 3d 23h and one closing in 3d 1h read identically.

*Evidence:* notifications/page.tsx:65-73 `relTime` — `<1m` → now, `<60m` → `${m}m`, `<24h` → `${h}h`, else `${Math.floor(h/24)}${t.common.relDays}`; src/components/positions/countdown-ring.tsx:134-142 `compact()` returns `${d}d` for anything ≥24h and `${h}h` below that.

### S11-038 · 🟡 medium · 🕓 unverified · button
**Gold and betting-ink on non-money controls** — `/profile/account, /profile, /notifications, /profile/session`

Gilt is painting a password control (no money involved) and the betting NO ink is painting three app-state controls — sign-out twice and a reversible 'dismiss'. The sessions case contradicts its own comment, which specifies claret.

*Evidence:* password-section.tsx:134 `"h-[40px] px-4 rounded-md border border-gold-700 bg-gold-500/10 … text-gold-300 hover:bg-gold-500/20"` (Update password) and :71 `hover:text-gold-300`; profile/page.tsx:336 sign-out `hover:border-no-700` with :341 `bg-no-500/10 text-no-300`; row-actions.tsx:600 dismiss `hover:text-no-300`; sessions/page.tsx:119 `style={{ color: "var(--no-300)" }}` on the sign-out SubmitButton — whose own comment at :106-107 says 'ghost button with claret text'.

### S11-040 · 🟡 medium · 🕓 unverified · state
**Second-factor code errors** — `/profile/security`

A wrong or rate-limited code is announced only by a toast that expires; the field keeps its neutral border with the rejected digits still in it, so a player who looks away has no way to tell the code failed — the same shape as D27 (a message that can expire unseen), here on the control that guards account takeover.

*Evidence:* security-client.tsx:48-55 `errFor`/`errToast` → `toast({ title, description, variant: "danger" })`; the OTP fields at :140 and :187 are `<OtpInput value=… onChange=… placeholder="• • • • • •" aria-label=… />` with no error/aria-invalid prop, and `otp-input.tsx:25` has no errored branch.

### S11-048 · 🟡 medium · 🕓 unverified · card
**Invite share-card code box** — `/profile/invite`

The text column is 328−48−2−104−20 = 138px, while an 8-character code at 22px mono with 0.1em tracking needs ~123px plus 32px padding and 2px border = 157px; the box has no `max-w-full` and the section is `overflow-hidden`, so the referral code — the whole point of the card — is clipped at the QR's edge. The agent dashboard already carries the fix, with a written note explaining it.

*Evidence:* src/app/profile/invite/page.tsx:281-282 `<div className="mt-1 inline-block rounded-md border border-gold-700 px-3 py-1.5"><span className="font-mono text-[22px] font-bold tracking-[0.1em] text-gold-300">{s.code // "—"}</span></div>` inside `section … overflow-hidden` (:273) beside a 104px QR (:288) — against the agent twin at agent-dashboard.tsx:147-148 which has `max-w-full` + `break-all` + `text-title-sm`.

### S11-039 · ⚪ low · 🕓 unverified · copy
**Duplicated eyebrow/title and mismatched pending labels** — `/profile/account, /profile/sessions, /profile/responsible-ga`

Two pages print their name twice, one over the other, in 11px caps and 28px display. Five save/submit buttons say 'Loading…' / 'Inapakia…' while they are saving, and the Sell control says 'Free exit' in the strip immediately above the button that also says 'Free exit'.

*Evidence:* account/page.tsx:205-206 `eyebrow={t.profile.myAccount} title={t.profile.myAccount}`; sessions/page.tsx:78-79 `eyebrow={t.profile.activeSessions} title={t.profile.activeSessions}`; responsible-gambling/page.tsx:184 `<SubmitButton label={t.rg.saveLimits} pendingLabel={t.common.loading} …/>` (also source-of-funds/page.tsx:272, kyc/page.tsx:276 and :544, :617); sell-button.tsx:215 `{t.common.freeExitLabel}` in the banner and :242 the same key as the button's own label.

### S11-041 · ⚪ low · 🕓 unverified · container
**PageHero and page block rhythm** — `/profile/account, /profile/sessions, /profile/responsible-ga`

The hero that carries nothing but an eyebrow, a title and one sentence pays 24px of padding per side on phones, and the twelve routes in this group use two different block rhythms (32 vs 24) — so moving between /positions and /profile/account changes the vertical grid.

*Evidence:* src/components/ui/page-hero.tsx:29 `contentClassName = "relative z-10 p-5 lg:p-6"` (24px on phones) used by the five routes above; block rhythm: positions/page.tsx:252 and performance/page.tsx:171 and profile/page.tsx:113 `className="space-y-6"` (32px) against watchlist/page.tsx:167, notifications/page.tsx:155, account/page.tsx:193, activity/page.tsx:104, rg/page.tsx:87, security/page.tsx:26, sof/page.tsx:69, kyc/page.tsx:155, invite/page.tsx:192 `space-y-5` (24px).

### S11-042 · ⚪ low · 🕓 unverified · state
**Bulk 'Read all' control and inline save spinners** — `/notifications, /profile/account, /profile/invite`

The bulk bar sets `done` before the transition starts, so the component unmounts and its own `loading` state can never paint — the only feedback is the whole bar vanishing while the rows below still show unread until revalidation. The e-mail Save button swaps its label for a 14px spinner (it shrinks from ~62px to ~38px) and the Copy button widens from 'Copy' to 'Copied'/'Imenakiliwa', shifting its row — the D24 pattern on two more controls.

*Evidence:* bulk-bar.tsx:478 `if (unread <= 0 // done) return null;` with :493-494 `disabled={pending} loading={pending}`; email-editor.tsx:136-138 `<button … className="btn btn-primary btn-sm shrink-0">{pending ? <Spinner size={14}/> : t.common.save}</button>`; invite-client.tsx:130-131 `{copied ? <I.check s={14}/> : <I.copy s={14}/>}{copied ? t.common.copied : t.common.copy}`.

### S11-043 · ⚪ low · 🕓 unverified · typography
**Compliance and settings copy below the reading floor** — `/profile/responsible-gambling, /profile/security, /profile/a`

Two compliance sentences — when a raised deposit limit takes effect, and 'these codes are shown once' — are set at 12px, under the 12.5px reading floor §T4 names, in tinted foreground colours on tinted backgrounds. The KYC progress count ('2/3 documents attached') is 11px mono.

*Evidence:* responsible-gambling/page.tsx:155 pending-increase box `… p-3 text-[12px]` (the statutory cooling-off notice); security-client.tsx:221 backup-codes warning `… text-[12px] text-warning-fg`; account/page.tsx:195 banner `text-[13px]`; kyc/page.tsx:612 `font-mono text-[11px] font-bold tabular-nums` for the attached-documents count; profile/account Item values `text-[13px]` (:463).

### S11-044 · ⚪ low · 🕓 unverified · textbox
**Missing autocomplete / enterKeyHint on account forms** — `/profile/source-of-funds, /profile/kyc, /profile/responsible`

Nine phone text boxes in the account area offer no autofill for data the browser already holds (name, organization, organization-title) and leave the keyboard's action key as a generic 'Go/Next', so a one-field form has no obvious way to submit from the keyboard.

*Evidence:* source-of-funds/page.tsx:187-202 `<Field name="declaredOccupation" …/>` and `declaredEmployer` → input.tsx passes only what it is given (no `autoComplete`, no `enterKeyHint`); kyc/page.tsx:455-463 `fullName` (no `autoComplete="name"`); responsible-gambling/page.tsx:174-179 six numeric `Input`s (no `enterKeyHint="done"`); only `SearchBox` (search-box.tsx:155) and `PasswordInput` call sites set these.

### S11-045 · ⚪ low · 🕓 unverified · a11y
**Password reveal and heading structure** — `/profile/account, /profile`

The reveal control is removed from the tab order, so a keyboard-only player cannot check what they typed into any of the three password fields. Section headings on /profile are 10px mono eyebrows while the same level on /profile/account is a 15px display heading — one heading level, two visual weights.

*Evidence:* password-input.tsx:112-122 `<button type="button" tabIndex={-1} aria-label={reveal ? t.common.hidePassword : t.common.showPassword} aria-pressed={reveal}>`; profile/page.tsx:130 `<h1 className="sr-only">` then :283 and :297 section headings as `<h2 className="… font-mono text-micro …">` (10px) while account/page.tsx:212 uses `<h2 className="font-display text-[15px] …">`.

### S11-046 · ⚪ low · 🕓 unverified · container
**Generic PageLoader padding** — `/watchlist, /notifications (loading.tsx)`

80px of padding per side around a 48px spinner makes the first block ~240px tall at 360 — a composition neither page ever shows — before six identical 64px rows that match neither the 14px-gap market grid nor the ~80px notification rows.

*Evidence:* src/components/ui/page-loader.tsx:50 `<div className="rounded-xl border border-border bg-bg-elevated p-10 grid place-items-center">` (spacing 10 = 80px) with a 48px BrandSpinner, then `rows` ghosts of `rowHeight = 64`; called by watchlist/loading.tsx:3 `<PageLoader tier="board" rows={4} />` and notifications/loading.tsx:7 `<PageLoader tier="reading" rows={6} />`.

### S11-047 · ⚪ low · 🕓 unverified · card
**Exposure bar beside the standing strip** — `/positions`

Three mono captions share 294px at 360; in Swahili ('NDIO · TZS 850K', 'HATARINI', 'HAPANA · TZS 1.2M') the row's natural width is ~312px including the two 12px gaps, so the labels wrap and a compacted amount can split from its side word. The panel is also a second, differently-shaped container (radius 12, `bg-bg-elevated/60`) for a fact the glass 'Your standing' panel directly above already reports, and it repeats that panel's 'At risk' label.

*Evidence:* src/app/positions/page.tsx:302-313 `<div className="rounded-lg border border-border bg-bg-elevated/60 p-3">` with `<div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-micro uppercase tracking-[0.12em] tabular-nums">` holding `{t.common.yes} · {formatTzsCompact(openYesStake)}`, `{t.positions.atRisk}`, `{t.common.no} · {formatTzsCompact(openNoStake)}`.

### S11-049 · ⚪ low · 🕓 unverified · copy
**Duplicate 'back to profile' controls and a stale bubble inset on KYC** — `/profile/kyc`

The page offers two different controls to the same destination, in two type faces, at the top and bottom; the bottom pair are ~16px and ~20px tall (no padding, no min-height) and the row reserves `pr-[68px]` hard-coded to today's 52px chat bubble — a number U7 is about to invalidate when the bubble becomes 44.

*Evidence:* src/app/profile/kyc/page.tsx:156 `<BackLink fallbackHref="/profile" label={t.common.profile} />` and :675-687 `<div className="flex items-center justify-between pt-1 pr-[68px] md:pr-0">` with `<Link href="/profile" className="font-mono text-label uppercase …">← {t.common.profile}</Link>` and `<Link href="/wallet" className="font-display text-[13px] …">{t.common.wallet} →</Link>`.

### S11-050 · ⚪ low · 🕓 unverified · card
**Agent money tiles in a 2-column grid** — `/profile/invite (agent)`

When only one of the two conditional tiles is present the grid holds three cells — an orphan in the second row — and that row mixes a 24px figure with an 18px figure for the same kind of money, so the tile set reads as two different objects.

*Evidence:* src/app/profile/invite/agent-dashboard.tsx:127-132 — `grid grid-cols-2 gap-2` with two `size="3xl"` tiles always rendered and two conditional `size="xl"` tiles (`dash.pendingTzs > 0`, `dash.reversedTzs > 0`).

## S12-overlays — Overlays and messages

### S12-01 · 🟠 high · 🕓 unverified · layout
**First-visit primer, card 3 (Modal sheet, [data-rung=modal])** — `/?primer=1`

On a 320×640 phone the primer's third card is 96px taller than the screen and the overflow goes UPWARD (the wrapper is items-end), so the progress rail, the step indicators and the ✕ Skip control are painted off-screen and cannot be scrolled to — the wrapper itself is not scrollable. The player can only leave by finding 'Got it'.

*Evidence:* primer-320-en-card3.json: panel y=-96, h=736 (115% of the 640 viewport), bottom pinned at 640; the scroll wrapper div.fixed.inset-0.flex.justify-center.overflow-y-auto reports scrollHeight=640 = clientHeight=640, i.e. NO scrollable overflow. The four header controls measure at y=-71: Step 1 (65×40 @25), Step 2 (@98), Step 3 (@170) and the only dismiss control, Skip primer (40×40 @255). Screenshot C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/65d7c9d7-3e7f-4261-8844-0b4c833008cc/scratchpad/inspect/S12-overlays/live/primer-320-en-card3.png shows the illustration cut mid-tipping-bar with the panel's rounded top corners off-screen. Cards 1 and 2 fit (567px, 533px); only card 3 (700px at 360 EN, 714px at 360 SW) overflows at 320.

### S12-02 · 🟠 high · 🕓 unverified · number
**Win celebration amount (win-celebration.tsx:317-322, 38px JetBrains Mono tabular)** — `/markets (client 50pick:celebrate event, no server call)`

Any payout of TZS 100,000 or more breaks the win headline across two lines, separating the currency from the figure — the money moment's single most important element renders as 'TZS' over '450,000'. Six-figure payouts are ordinary (stake bounds are 1k–1M). U14 plans 38→32px, which does not fix it: 14 monospace glyphs at 32px still need ~269px against 246px available.

*Evidence:* Measured sweep (extra.json, one page, five dispatches at 360×780): TZS 45,000 → w228 h42 = 1 line; TZS 120,000 → h84 = 2 lines; TZS 450,000 → 2 lines; TZS 1,250,000 → 2 lines; TZS 12,450,000 → 2 lines. Column width is 246 CSS px (panel 328 − p-5 24 − px-7 40 each side), line-height 42. Screenshots win-amount-450000.png and win-320-en.png show 'TZS' alone on line 1 with the figure on line 2. Same 571px panel and same 2-line break at 320×640 (available width 206px).

### S12-03 · 🟠 high · 🕓 unverified · layout
**Toast description line (toast.tsx:683) — 'Link copied' toast raised from the share dialog** — `/markets/mkt_7c51fbd7c62c4b2941c9 → share → Copy link`

A toast whose description is an unbreakable string (the copied URL — the one thing the player is being shown) paints under the ✕ and is hard-cut with no ellipsis: roughly 45% of the text is unreadable. The sibling surface solves it deliberately — share-button.tsx:178 gives the same URL `break-all` with a comment explaining why truncating a link is wrong.

*Evidence:* extra.json toast block: description <p> clientWidth 194, scrollWidth 367; the painted text rect runs x=97 → 464 in a 360px viewport, i.e. 124px past the toast box (x=20, w=320, overflow:hidden) and straight under the dismiss button (x=283, 48×48). Computed style on the <p>: white-space normal, word-break normal, overflow-wrap normal, text-overflow clip. Content row padding is pr-8 = 48px while the close box needs 56px. Screenshot toast-360-en.png shows 'https://www.50pick.tz/markets/mkt_7c5' painted through the ✕ glyph and cut mid-character at the toast edge with no ellipsis. Identical at 360 SW and 320 EN (toast box 320×76, close 48×48 in both).

### S12-overlays-code-1 · 🟠 high · 🕓 unverified · layout
**RouteError shell — the shared recoverable-error surface for all 20 route error boundaries** — `any route with an error.tsx (admin, auth, markets, positions`

Resolving the stack from the source: 128 (pad) + 64 (FiftyMark) + 24+44+16 (medallion) + 14 (eyebrow) + 12+68 (h1 wraps to 2 lines in SW/ZH) + 16+42 (body) + 16+18 (digest) + 32 = ~538px below the 56px header, i.e. the primary "Try again" button spans roughly y=594-638 on a 360×640 phone while the fixed rail owns 576-640. The one recovery control on every error screen — including the money routes whose copy says "Your wallet, positions, and bets are unaffected" — is painted behind the rail on first view, and the back link is off-screen. `py-12` is the classic overridden-scale trap (the author meant 48px).

*Evidence:* src/components/ui/route-error.tsx:107 `className="relative mx-auto flex min-h-[60svh] w-full max-w-[560px] flex-col items-center justify-center overflow-hidden px-5 py-12 text-center"` — on this repo's overridden scale (tailwind.config.ts:211-225) `py-12` is 128px, so the column carries 256px of vertical padding; the Try-again row is at :135-143 (`mt-6` = 32px). Bottom rail is fixed: src/components/layout/bottom-nav.tsx:114 `className="lg:hidden fixed inset-x-0 bottom-0 z-40 kp-rail"` with `.kp-rail__item` min-height 64 (globals.css:4881).

### S12-overlays-code-2 · 🟠 high · 🕓 unverified · number
**WinCelebration payout headline (RollingAmount inside a 380px panel with overflow-hidden)** — `any player route (WinCelebrationHost, fired by the settle po`

Content column is 328−80 = 248px at 360 and 288−80 = 208px at 320. At 38px JetBrains Mono (0.6em ≈ 22.8px/glyph) "TZS 250,000" is 251px, so every SIX-figure win already wraps to a second line; after the wrap the bare figure must still fit — "125,000,000" (11 glyphs) = 251px > 248 at 360 and "12,500,000" (10 glyphs) = 228px > 208 at 320. A digit string has no break opportunity, and the panel is `overflow-hidden`, so the amount is CLIPPED rather than wrapped. Stakes run to TZS 1M at up to 200× (primer dialMax), so eight-figure payouts are reachable. Money clipped on the one screen that states what was won.

*Evidence:* src/components/markets/win-celebration.tsx:290-295 `maxWidth={380}` + `panelClassName="overflow-hidden !p-0"` + `className="seal-cascade flex flex-col items-center px-7 pb-7 pt-10 text-center"` (px-7 = 40px a side on this scale); :318 `font-mono text-[38px] font-bold leading-[1.1] tabular-nums`; :125 `formatTzs(n)` → "TZS 1,250,000" (no compaction, src/lib/utils.ts:62-65). Modal wrapper adds `px-3` (16px) per side (modal.tsx:274).

### S12-overlays-code-3 · 🟠 high · 🕓 unverified · state
**RealityCheckHost <Modal> (RG reality check) — scrim tap and ✕ dismissal** — `any signed-in route, every 30 min`

A compliance prompt whose four deliberate answers are Continue / Set limits / Take a break / Self-exclude can be cleared by an accidental tap on the scrim — the sheet docks to the bottom edge on phones, so the scrim is the entire screen above it — or by a ✕ the file's own compliance comment never contemplates (:163-171 argues at length that no control here may be weighted differently). The session clock is reset by an accident, so the player's next reminder is 30 minutes later and no explicit choice was ever recorded.

*Evidence:* src/components/rg/reality-check.tsx:128-137 `<Modal open={open} onClose={dismiss} sheet zIndex={1700} maxWidth={448} labelledBy="reality-check-title" panelClassName="overflow-hidden">` — neither `closeOnScrim={false}` nor `showClose={false}` is passed, and modal.tsx:172-173 defaults both to true, so `onClose` (=`dismiss`, :117-122) fires from a scrim tap, the ✕ and Esc. `dismiss()` writes `kp_reality_check_last`, restarting the 30-minute clock.

### S12-overlays-code-4 · 🟠 high · 🕓 unverified · link
**Reality-check helpline `tel:` link** — `any signed-in route (reality-check sheet)`

The helpline is a real tap target on a phone — it dials — but its hit box is the 14px line box of a 10px uppercase tracked mono string (≈89×14px). That is 26px under the tap floor, on a harm-reduction control inside the RG prompt, and the 10px uppercase treatment is also reading copy set in the microlabel tier.

*Evidence:* src/components/rg/reality-check.tsx:190-192 `<p className="text-center font-mono text-micro uppercase eyebrow text-text-subtle pt-1">{t.rg.helpline} · <a href={`tel:${HELPLINE_TEL()}`} className="text-text-muted underline underline-offset-2">{HELPLINE()}</a></p>` — `text-micro` is 10px/14px line-height (tailwind.config.ts:198), HELPLINE = "0800 11 0011" (src/lib/support-config.ts:120-124).

### S12-04 · 🟡 medium · 🕓 unverified · state
**Market not-found page (src/app/markets/[id]/not-found.tsx)** — `/markets/mkt_doesnotexist000000`

A missing market answers 200 OK with a 'page not found' screen, so crawlers, uptime checks and link-checkers read a dead market as a live page — the exact failure the colocated not-found.tsx was written to prevent. The global 404 does return 404, so the two error paths disagree.

*Evidence:* curl with the probe UA: GET https://www.50pick.tz/markets/mkt_doesnotexist000000 → HTTP/2 200 while the body renders the branded not-found UI; GET https://www.50pick.tz/markets/mkt_zzz → HTTP/2 200; GET https://www.50pick.tz/this-page-does-not-exist → HTTP/2 404. Playwright's own request check in plain-summary.json records the same (status 200 for mkt404 at all three configs, 404 for g404). The file's header (markets/[id]/not-found.tsx:7-18) states this segment file exists precisely so the route 'forces the right status' instead of returning 200.

### S12-05 · 🟡 medium · 🕓 unverified · filter
**Filter sheet topic group (discovery-bar.tsx:322-325, grid-cols-[repeat(auto-fill,minmax(148px,1fr))])** — `/markets → Filters sheet`

Below ~336px viewport the topic grid silently collapses to a single column: eight 79-102px chips each sit alone on a 280px row, the sheet body grows 40% taller than at 360 and the player scrolls 2.2 screens inside a 340px window to reach 'Other'. The layout was sized at 390 and never re-checked at the low end of the fleet.

*Evidence:* fsheet-320-en.json: all eight topic chips measure at x=21 — one per row (All 71×44, Sports 90×44, Macro 88×44, Weather 102×44, Crypto 92×44, Culture 95×44, Tech 79×44, Other 91×44) — and the scroll body reports scrollHeight 734 against clientHeight 340 (2.2 screens). At 360×780 the same group is two columns and the body is 526/453. The sheet's content width at 320 is 320 − 2×20 (kp-fsheet-panel padding, globals.css:3342) = 280px, while two tracks need 2×148 + 8 gap = 304px. The code comment at discovery-bar.tsx:313-316 records the figure as checked at 390px.

### S12-06 · 🟡 medium · 🕓 unverified · link
**'Browse open markets' secondary CTA on both 404 designs (not-found.tsx:140-147; markets/[id]/not-found.tsx:60-67)** — `/this-page-does-not-exist and /markets/mkt_doesnotexist00000`

The last recovery action on both error pages is a 15px-tall tap row — a quarter of the 40px floor — in 11px tracked mono, and it is below the fold on every phone config measured. On a page whose whole job is to get a lost player moving again, the one direct-to-markets link is the hardest thing on it to hit.

*Evidence:* g404-360-en.json: 203×15 @79,880, font 11px JetBrains Mono uppercase; g404-360-sw: 252×15 @54,880 ('TAZAMA MASOKO YALIYO WAZI'); g404-320-en: 203×15 @59,880; mkt404-360-sw: 252×15 @54,680; mkt404-320-en: 203×15 @59,680. Tap row height 15px in every config, and the link sits below the fold at both viewport heights (y=880 against vh 780 and vh 640).

### S12-07 · 🟡 medium · 🕓 unverified · typography
**First-visit primer card body and illustration labels (first-visit-primer.tsx:107, :473)** — `/?primer=1`

Two type rules break on the product's first screen: 9px is off the ladder entirely (the sub-micro rungs are --type-label 9.5 and --type-nano 8.5, and both are reserved for UPPERCASE mono microlabels — 'or' is lowercase reading copy), and 13.5px is a hand-typed size between body-sm 13 and body 14. Card 3 then stacks eight sizes inside one card against a ceiling of three.

*Evidence:* primer-360-en-card1.json: the 'or' connector between YES and NO measures 9px JetBrains Mono 700, 14×14 @177,474 — lowercase, not an identifier (source: text-[9px], :107). Card body copy measures 13.5px Inter on all three cards in both locales (source: text-[13.5px], :473). Card 3 carries eight distinct sizes in one card: 10, 10.5, 11, 13, 13.5, 14, 15 and 22px (primer-360-en-card3.json TEXT block); card 2 adds 8.5px SVG annotations.

### S12-08 · 🟡 medium · 🕓 unverified · a11y
**First-visit primer initial focus (first-visit-primer.tsx:417-442; Modal's default first-focusable, modal.tsx)** — `/?primer=1`

The primer opens 700ms after landing, with no prior pointer interaction, so Chrome treats the Modal's programmatic focus as :focus-visible and paints a loud ring around the quietest thing in the dialog — a progress hairline — instead of around 'Next'. A first-time player's first screen leads with a focus box on a non-action.

*Evidence:* primer-360-en-card1.json reads document.activeElement back as 'button.flex.h-[40px].flex-1.items-center / Step 1' immediately after the primer opens (same in SW: 'Hatua 1'). The screenshot primer-360-en-card1.png shows a 2px focus ring painted around the 78×40 step-1 box whose only visible content is a 3px hairline. The kit does paint these rings — win-amount-450000.png shows the same ring on that dialog's 'Continue'. win-celebration.tsx:168-171 documents this exact problem and fixes it there with `initialFocus={continueRef}`; the primer passes no initialFocus.

### S12-09 · 🟡 medium · 🕓 unverified · container
**Overlay surfaces: filter sheet panel vs Modal sheet vs toast vs alert (globals.css:3342; modal.tsx:319-321; toast.tsx:656; login/page.tsx:20** — `/markets (sheet), /?primer=1 (Modal sheet), share dialog, /a`

The product has two bottom sheets with two different top radii (24 vs 16) and three different sheet/dialog paddings (12/20/16, 24, 0+40/24), and the message family (toast, login alert) uses the legacy 8px radius while every card-like overlay uses 16. Placed side by side these read as different kits, and the phone rung for panel/sheet/modal padding (16) is met by none of them.

*Evidence:* Measured corner radii and paddings in one pass: filter sheet panel rad 24, pad 12/20/16(+env safe-area) (globals.css:3342, border-radius var(--r-xl)); primer Modal sheet rad 16, panel padding 0 with the inner block at 20 top / 24 sides / 32 bottom and NO safe-area; share dialog rad 16, pad 24; win seal rad 16, pad 0 + inner 40/24; consent card rad 16, pad 16; toast rad 8; session-ended alert rad 8 inside a rad-16 glass panel. Token scale: --r-sm 8, --r-md 12, --r-lg 16, --r-xl 24 (globals.css:277).

### S12-10 · 🟡 medium · 🕓 unverified · link
**Consent card 'Privacy policy' link and the two answer buttons (consent-prompt.tsx:83-85, :88-93)** — `/?consent=1`

On a consent card — a legal surface where the policy link is the informed half of informed consent — the link is a 16px tap row, and the two answers sit at the 40px floor rather than the 44px phones should get. The card geometry and the equal-weight answers are otherwise correct.

*Evidence:* consent-*.overlay.json: the inline link measures 85×16 @100,545 at 360 EN, 96×16 @122,545 in SW ('Sera ya faragha'), 85×16 @175,405 at 320 — 16px tall, 13px Inter, inside the body sentence. 'Allow analytics' 121×40 and 'Decline' 73×40 (btn-ghost btn-sm, rad 12) in every config. Card itself: 328×233 (EN) / 328×251 (SW) / 288×251 (320), pad 16, rad 16, bottom 632 with 16px clearance above the 52px chat bubble at y=648.

### S12-14 · 🟡 medium · 🕓 unverified · typography
**Off-ladder hand-typed sizes across the overlay group** — `all overlay surfaces`

Three of these values exist on NEITHER ladder — 13.5, 15.5 and 38 are not Tailwind keys (10/11/12/13/14/16/18/22/28/36/48/64) and not CSS tokens (8.5/9.5/11/13/15/17/20/24/32). The rest re-type values that have names. The result is that one dialog family carries 13, 13.5, 14, 15, 15.5, 16, 18, 20, 22 and 38 — e.g. ConfirmModal alone paints 10 (eyebrow) + 18 (title) + 13.5 (body) + 16 (input) + 14/15 (buttons): five sizes in one card.

*Evidence:* src/components/ui/modal.tsx:544 `text-[13.5px]` (ConfirmModal body) · src/components/onboarding/first-visit-primer.tsx:473 `text-[13.5px]` · src/components/ui/callout.tsx:163 `text-[13.5px]` and :302 `text-[15px]` · src/components/ui/empty-state.tsx:78 `text-[15.5px]` and :113 `text-[15px]` · src/components/rg/reality-check.tsx:151 `text-[15.5px]` · src/components/markets/win-celebration.tsx:308 `text-[20px]`, :318 `text-[38px]` · src/components/markets/operation-result-modal.tsx:451 `text-[22px]`, :455/:488 `text-[13px]/[14px]` · src/components/ui/toast.tsx:682 `text-[13px]` · src/components/markets/share-button.tsx (4 × `text-[14px]`/`text-[12px]`/`text-[11px]`).

### S12-15 · 🟡 medium · 🕓 unverified · typography
**FirstVisitPrimer card-1 "or" separator** — `/ , /markets (primer card 1)`

9px is below the repo's 9.5px `--type-label` floor and below the 8.5px nano tier, is on no ladder at all, and the tier is reserved for UPPERCASE MONO microlabels — this is a lowercase word between the YES and NO pips, letter-spaced 0.2em, on a first-time player's very first screen. The ZH glyph "或" at 9px is effectively unreadable on a budget panel.

*Evidence:* src/components/onboarding/first-visit-primer.tsx:107 `<span className="font-mono text-[9px] text-text-subtle tracking-[0.2em]">{or}</span>` — `t.common.or` is "or" / "au" / "或" (i18n-dict.ts:64, 2721, 4857), i.e. lowercase reading text, not an identifier; there is no `uppercase` class on it.

### S12-16 · 🟡 medium · 🕓 unverified · container
**FirstVisitPrimer card 3 — pool tiles nested inside the visual frame inside the sheet** — `/ , /markets (primer card 3)`

Four nested bordered/filled boxes (modal → frame → tile) with 24+20+16 = 60px of padding a side before the TZS figure is reached. At 360 the pool tiles are left ≈104px wide and their inner text column ≈72px, so the Swahili label "BWAWA LA HAPANA" wraps to three lines inside a box whose own border is 60px from the sheet edge. It reads chunky and the figure it exists to teach is the smallest element in the composition.

*Evidence:* src/components/onboarding/first-visit-primer.tsx:453 panel content `px-5` (24px) → :456 `className="flex items-center justify-center rounded-xl border border-border/60 bg-bg-overlay/40 px-4 py-5"` (bordered + filled, 20px) → :213 and :222 `className="rounded-lg border border-yes-700/40 bg-yes-500/[0.08] px-3 py-2 text-center"` (bordered + filled, 16px). The sheet panel itself is `.mat-modal` (bordered, motion.css:383).

### S12-17 · 🟡 medium · 🕓 unverified · button
**The close ✕ across the overlay group — two geometries and two glyph sizes** — `all overlay surfaces`

The same job — dismiss this surface — ships at two box sizes (40 and 48) and two glyph sizes (14 and 16) inside one overlay family, and the file that asserts a single size is itself one of only two using it. U12 and U15 move the modal and toast to 44, which will leave three box sizes in the product unless the primer and the notice bar move with them.

*Evidence:* 48×48 with a 16px glyph: src/components/ui/modal.tsx:329 `h-8 w-8` + `<I.x s={16}/>`; src/components/markets/filter-sheet.tsx:386 `h-[48px] w-[48px]` + `s={16}` (its comment claims 48 is "the ONE close-✕ size in the kit"). 48×48 with a 14px glyph: src/components/ui/toast.tsx:692 `h-8 w-8` + `<I.x s={14}/>`. 40×40 with a 14px glyph: src/components/onboarding/first-visit-primer.tsx:447 `h-[40px] w-[40px]` + `s={14}`; src/components/ui/notice-bar.tsx:114 `h-[40px] w-[40px]` + `s={14}`.

### S12-18 · 🟡 medium · 🕓 unverified · a11y
**Modal scrim rendered as a named <button> (and left named while inert)** — `every <Modal> consumer (confirms, receipts, share, primer, r`

The scrim is exposed to assistive tech as a button named "Cancel" inside the dialog. In a ConfirmModal a screen-reader user swiping the dialog meets TWO "Cancel" buttons (the scrim and the real one) and cannot tell them apart; worse, while a money mutation is in flight `closeOnScrim` is false, so the announced "Cancel" button has no handler at all — a control that says it can cancel a deposit and does nothing.

*Evidence:* src/components/ui/modal.tsx:278-289 `<button type="button" aria-label={t.common.cancel} tabIndex={-1} onClick={exiting ? undefined : closeOnScrim ? onClose : undefined} className={…} />`; ConfirmModal passes `closeOnScrim={!loading}` at :516. Same pattern at src/components/markets/filter-sheet.tsx:344-350 (`aria-label={closeLabel}`).

### S12-19 · 🟡 medium · 🕓 unverified · link
**"Browse open markets" recovery link on both 404 pages** — `/404 and /markets/[id] not-found`

The link's hit box is a 15px-tall line of 11px uppercase text — 25px under the tap floor — and it duplicates the destination of the 98px tile immediately above it, so the page offers the same route twice with the smaller, harder-to-hit control given the visually stronger (gilt/brand) treatment. On the market 404 the gold treatment also spends earned-money ink on navigation.

*Evidence:* src/app/not-found.tsx:140-147 `className="mt-6 inline-flex items-center gap-2 font-mono text-caption uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200"` (no height, `text-caption` = 11px/15px line box) with `href="/markets"`, sitting directly under the "Markets" tile at :121-129 which also points at `/markets`; the same pair exists at src/app/markets/[id]/not-found.tsx:40-67.

### S12-20 · 🟡 medium · 🕓 unverified · link
**global-error compliance footer links (Responsible gaming, Helpline tel:)** — `root error boundary`

Both statutory links are 11px inline text with a ≈16.5px hit box on the one page that exists because everything else failed — so the helpline is hardest to dial exactly when the app is unusable. The number is also a second definition site of `STATUTORY_HELPLINE` (support-config.ts:120), which today agrees but has no guard.

*Evidence:* src/app/global-error.tsx:280-305 — footer `fontSize: 11, lineHeight: 1.5` with `<a href="/legal/responsible-gambling">` and `<a href="tel:0800110011">` as inline spans; no height, padding or display rule.

### S12-overlays-code-10 · 🟡 medium · 🕓 unverified · container
**ErrorState box and the error/empty page family — vertical padding read off the overridden scale** — `/offline, /404, /markets/[id] 404, every ErrorState call sit`

Every member of the error/empty family pays 80px of top and bottom padding where the author's numbers (`py-10` = 40px in stock Tailwind) say they meant 40. On a 360×640 phone the ErrorState box alone is 80+48+20+16+18+80 ≈ 262px tall for a two-line message, and the 404/offline pages add 160px of dead space above and below a column that is already vertically centred — pushing their recovery links toward or past the fold, the same class of defect as S12-01.

*Evidence:* src/components/ui/empty-state.tsx:100-106 `className="rounded-lg border border-dashed border-danger-border bg-danger-500/[0.06] px-6 py-10 text-center max-w-[420px] mx-auto"` → 32px sides, 80px top and bottom on this scale; src/app/not-found.tsx:90 `px-5 py-10` (24/80); src/app/markets/[id]/not-found.tsx:27 `px-5 py-10`; src/app/offline/page.tsx:17 `px-4 py-10` (20/80). (EmptyState's own `px-8 py-8` = 48px is already recorded under U26.)

### S12-overlays-code-11 · 🟡 medium · 🕓 unverified · a11y
**OperationResultModal global Enter handler vs the secondary/ghost button and ✕** — `every result receipt (bet placed, sold, deposit, withdrawal,`

The listener is on `window` and unconditionally `preventDefault()`s Enter, so it fires the PRIMARY action no matter what has focus. A keyboard or switch user who tabs to "View positions" (or to the ✕) and presses Enter gets the primary instead — on the bet receipt that means being pushed to /markets instead of to /positions, and on a wallet receipt it means dismissing a reference the modal exists to show. The file already documents the sibling defect ("the secondary owns its own dismissal", :521-526) — the keyboard path still bypasses it.

*Evidence:* src/components/markets/operation-result-modal.tsx:356-359 `const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); (onPrimary ?? closeRef.current)(); } }; window.addEventListener("keydown", onKey);` (and the identical non-success branch at :302-307). The secondary is a real button at :519-531, the ✕ comes from Modal at :325-333.

### S12-overlays-code-12 · 🟡 medium · 🕓 unverified · state
**OperationResultModal crest + primary button tones for success/danger** — `every result receipt (KYC approved, password changed, propos`

D2 moved the app-state families off the betting pair in the toast and the Callout, but the result modal — the PRIMARY signal the toast is secondary to — still paints a non-money success (KYC approval, password change, proposal created) in the YES betting green and a failure in the NO betting rose with a `btn-no` CTA. So one platform state has two paints depending on which signal you are looking at, and the ink that means "your money is on YES" is used to confirm a document upload.

*Evidence:* src/components/markets/operation-result-modal.tsx:116-137 `success: { ...crest("var(--yes-400)", "var(--yes-300)"), primaryBtn: "btn-primary" }, danger: { ...crest("var(--no-400)", "var(--no-300)"), primaryBtn: "btn-no" }`; :373 `effectiveBtn = … stripTone === "no" ? "btn-no" …`. Compare the D2 ruling already applied to the same states elsewhere: toast.tsx:493-514 (`bg-success` / `bg-danger`, "SUCCESS IS NOT `YES`, AND DANGER IS NOT `NO`") and callout.tsx:128-139.

### S12-overlays-code-13 · 🟡 medium · 🕓 unverified · typography
**FirstVisitPrimer card-2 dial SVG annotations (knob side word, both end labels)** — `/ , /markets (primer card 2; ?primer=1)`

The comment above the block states these were raised TO the 8.5px `--type-nano` floor — but the viewBox is 280 user units rendered at `width="100%"` of a column that is 360−48−40−2 = 270px at 360 and 230px at 320. `preserveAspectRatio` scales the text down with the box: 8.5 → 8.2px at 360 and → 7.0px at 320, and the 10px multiplier inside the knob → 8.2px. The floor the file claims to honour is defeated by the frame on the two widths most players are on, on the card that teaches what a side is.

*Evidence:* src/components/onboarding/first-visit-primer.tsx:140-168 — `<div className="relative mx-auto" style={{ maxWidth: 280 }}><svg viewBox="0 0 280 56" width="100%" height="56" …>` with `fontSize="8.5"` at :162, :166, :167 and `fontSize="10"` at :161; the SVG sits inside the visual frame at :456 (`px-4` = 20px a side) inside the panel's `px-5` (24px) at :453.

### S12-overlays-code-5 · 🟡 medium · 🕓 unverified · state
**FirstVisitPrimer — scrim tap permanently marks the primer seen** — `/ , /markets, /live (first visit; ?primer=1 to reproduce)`

On a phone the primer is a bottom sheet, so everything above it is a scrim; one stray tap (or a mis-aimed tap at the card body) destroys the three-card onboarding permanently for that browser, with no way back — there is no "show me again" entry point. The component distinguishes Skip (explicit) from Got it (explicit) but treats an accidental outside-tap as the same decision.

*Evidence:* src/components/onboarding/first-visit-primer.tsx:358-368 `<Modal open={open} onClose={dismiss} sheet zIndex={150} maxWidth={460} ariaLabel={t.primer.primerLabel} showClose={false} panelClassName="overflow-hidden !p-0">` — `closeOnScrim` is left at its `true` default (modal.tsx:173), and `dismiss()` at :333-336 calls `persistSeen()` which writes `50pick-primer-seen = "1"` for the life of the browser.

### S12-overlays-code-6 · 🟡 medium · 🕓 unverified · button
**EmailVerifyBanner collapse/expand toggle (the bar's own text)** — `every player route for a signed-in player with an unconfirme`

Two defects in one control. (a) Tap size: the button is a bare inline-block of 13px text — collapsed (`verifyBannerShort`, one line) its hit box is the 18px line box, less than half the 40px floor, and it is the only way to re-expand the compliance statement. (b) Affordance: the sole cue that the sentence is a control is `hover:underline`, which never fires on a touch device (and D25's ungated-hover class), so on a phone the bar looks like static text and the collapse/expand behaviour is undiscoverable — a player who collapsed it once sees a permanently shortened warning with no visible way back.

*Evidence:* src/components/layout/email-verify-banner.tsx:119-128 `<button type="button" onClick={toggle} aria-expanded={!collapsed} className="text-left text-balance underline-offset-2 hover:underline">` inside NoticeBar's `<p className="min-w-0 grow basis-[14rem] text-body-sm leading-snug font-medium">` (notice-bar.tsx:93).

### S12-overlays-code-7 · 🟡 medium · 🕓 unverified · a11y
**AnnouncementBanner dismiss button — accessible name** — `every player route while an announcement is active`

The only control on the site-wide broadcast bar is an icon-only ✕ whose accessible name is the hard-coded English word "Dismiss" in every locale — a Swahili or Chinese screen-reader user hears an English word for the one action on a bar that may be carrying an operator notice.

*Evidence:* src/components/layout/announcement-banner.tsx:48-57 renders `<NoticeBar tone={active.kind} onDismiss={…}>` and passes no `dismissLabel`; src/components/ui/notice-bar.tsx:54 `dismissLabel = "Dismiss",` and :99 `aria-label={dismissLabel}`. The sibling call site proves the fix exists: src/components/layout/away-summary-bar.tsx:135 `dismissLabel={t.common.dismiss}` (dict has "Ondoa" / "关闭", i18n-dict.ts:2692/4828).

### S12-overlays-code-8 · 🟡 medium · 🕓 unverified · a11y
**global-error.tsx root <html> element** — `root error boundary (any route when the layout itself fails)`

The last-resort error page localises its copy from the kp-locale cookie but declares the document as English. A screen reader announces "Kitu kimevunjika kabla hata ya kuanza" and the 18+/helpline compliance footer with an English voice and English pronunciation rules — on the one page where the app has already failed and the RG lines are the only thing still standing.

*Evidence:* src/app/global-error.tsx:99 `const t = useMemo(() => MINI_DICT[readLocale()], []);` renders the Swahili/Chinese mini-dict, while :113 hard-codes `<html lang="en">`; the same file owns the whole document (:112-308).

### S12-overlays-code-9 · 🟡 medium · 🕓 unverified · typography
**Callout size="sm" body text (the kit's default inline notice, 24 call sites)** — `every surface that renders a Callout (market detail disclaim`

The default weight of the platform's single notice component sets its prose — "Upside is thin", one-sided refund explanations, the hedge warning, fee explanations — at 11px, 1.5px under the repo's stated reading floor, on budget Android phones. The title inherits the same 11px (it only adds `font-bold`), so an entire notice can be smaller than any body text around it. §T4's floor argues up, never down, and the primer's poolCaption was already fixed for exactly this reason.

*Evidence:* src/components/ui/callout.tsx:161-164 `const SIZE = { sm: { box: "gap-2.5 rounded-md px-3 py-2.5", icon: 14, title: "font-bold text-text", body: "text-caption leading-snug text-text-secondary" … } }` — `text-caption` is 11px (tailwind.config.ts:199) and `sm` is the default (`size = "sm"` at :175). The repo's own reading floor is stated in first-visit-primer.tsx:231-240: "§T4's 12.5px reading floor".

### S12-11 · ⚪ low · 🕓 unverified · card
**Global 404 recovery tiles (not-found.tsx:111-139) vs market 404 tiles (markets/[id]/not-found.tsx:40-59)** — `/this-page-does-not-exist vs /markets/mkt_doesnotexist000000`

Adds the measured detail to the two-404-designs defect: it is not only a different look but a different rung — 102px vs 54px per row, 14px (off-rung) vs 16px padding, an icon plate on one and none on the other, and even a different destination order. The 102px tiles are the chunkier of the two and are what a lost player meets most often.

*Evidence:* Global 404: three tiles 312×102 (272×102 at 320) with padding 14/14/14/14 and a 40×40 icon plate holding a 13px glyph, stacked at y=523/635/746, radius 16, order Home · Markets · Help. Market 404: three tiles 312×54 (272×54) with padding 16, stacked at y=463/529/594, no icon plate, order Markets · Home · Help. Both then repeat the same 15px 'browse open markets' row. The global tile block is 325px tall for three one-word labels and pushes everything below y=848.

### S12-12 · ⚪ low · 🕓 unverified · typography
**Dialog titles across the overlay family (first-visit-primer.tsx:468; win-celebration.tsx:307; filter-sheet.tsx:368; share-button.tsx:114)** — `/?primer=1, /markets (sheet + celebrate), /markets/[id] shar`

Four dialogs in one family carry four title sizes (22/20/16/14) and one of them is not a heading at all, so a screen-reader user moving by heading finds a title in the sheet and the seal but none in the share dialog.

*Evidence:* Measured title runs: primer h2 22px Sora 700; win seal h2 20px Sora 700; filter sheet h2 16px Sora 700; share dialog title 14px Sora 600 rendered as a <p>, not a heading (share-360-en.json TEXT: '14px Sora 600 … Share this market'; the dialog is named only by the wrapper's aria-label).

### S12-13 · ⚪ low · 🕓 unverified · state
**Zero-count filter chips in the sheet ('TZS 50k+ 0', 'Crypto 0')** — `/markets → Filters sheet`

A chip that leads to an empty board looks and behaves exactly like one with 25 results; the sheet applies the product's own zero-count rule to its trigger but not to the chips inside it.

*Evidence:* fsheet-360-en.json: 'TZS 50k+ 0' (109×44 @21,465) and 'Crypto 0' (92×44 @21,663) render identically to chips with results — same border, same 11px tabular count, same enabled link — while filter-sheet.tsx:322-324 refuses to render a 0 badge on the trigger with the reasoning 'a badge reading 0 is a control announcing its own irrelevance'.

### S12-21 · ⚪ low · 🕓 unverified · icon
**Glyph sizes across the overlay group** — `all overlay surfaces`

Nine distinct glyph sizes (12,13,14,15,16,17,18,19,26) across one family, only three of which are on the 16/18/20/24 ladder. Adjacent controls disagree — the NoticeBar's leading glyph is 15 while its action's glyph is 13; the Callout row is 14 or 17 while its stack plate glyph is 26; both 404s use 12 and 13 in the same nav.

*Evidence:* Off-rung sizes: notice-bar.tsx:87 `<Glyph s={15}/>` and :180 `s={13}`; callout.tsx:162 `icon: 14`, :163 `icon: 17`, :271 `<Glyph s={26}/>`, :298 `strong ? 18 : sz.icon`; reality-check.tsx:177/181/185 `s={14}`; route-error.tsx:119 `s={19}`; not-found.tsx:100 `s={19}`, :117/:127/:137 `s={13}`, :144/:146 `s={12}`; share-button.tsx `s={13}`; first-visit-primer.tsx:449/:509 `s={14}`; toast.tsx:695 `s={14}`.

### S12-22 · ⚪ low · 🕓 unverified · filter
**FilterSheet grab handle** — `/markets, /updown (phone filter sheet)`

The sheet paints the universal drag-to-dismiss handle but implements no drag: swiping it down does nothing (and, per D14, may instead trigger pull-to-refresh). An affordance that promises a gesture the surface does not support is a control that lies — and it is the dismissal gesture a phone player will reach for first, on the dialog they use most.

*Evidence:* src/components/markets/filter-sheet.tsx:366 `<span aria-hidden className="kp-fsheet-grab" />`; globals.css `.kp-fsheet-grab { display:block; width:44px; height:4px; margin:0 auto 12px; border-radius: var(--r-pill); background: var(--border-strong); }`. No pointer/touch handlers exist anywhere in the file (only click, keydown, resize, orientationchange).

### S12-23 · ⚪ low · 🕓 unverified · copy
**Global 404 inline `t404` dictionary** — `/404`

One fact, two homes: the same three-language 404 copy is maintained in two places, and the page's own strings have already drifted from the dict's ("Hakuna ukurasa" vs the dict's heading set, and a different apostrophe — the difference D12 records as a design split is partly a COPY split). A correction to the dict will silently not reach the page most 404s land on.

*Evidence:* src/app/not-found.tsx:9-40 defines its own EN/SW/ZH object (`notFoundCode`, `notFound`, `notFoundBody`, `notFoundHint`, `home`, `markets`, `help`, `browseOpenMarkets`) plus `resolveLocale()` at :45-61 — while the identical keys already exist in the shared dict (src/lib/i18n-dict.ts:2177-2179, 2245 / 4376-4378, 4427 / 6506-6508, 6557) and the market 404 reads them (markets/[id]/not-found.tsx:24).

### S12-24 · ⚪ low · 🕓 unverified · button
**"Try again" — three different compositions for one action** — `/offline, route error boundaries, root error boundary`

One action, three shapes (pill vs 12px radius vs gold pill), three heights (44/44/40) and three icons (rotate / lightning bolt / none). The global-error variant also wears struck gold, which §M3 reserves for earned money, for a retry — and a lightning bolt is not the retry idiom the sibling page already established.

*Evidence:* src/app/offline/page.tsx:28-35 `className="btn btn-primary btn-md btn-pill mt-6"` with `<I.rotateCcw s={14}/>`; src/components/ui/route-error.tsx:136-143 `className="btn btn-primary btn-md"` (radius `--r-md` 12px) with `<I.bolt s={14}/>`; src/app/global-error.tsx:240-257 inline gold gradient pill, `height: 40`, `fontSize: 13`, no icon.

### S12-25 · ⚪ low · 🕓 unverified · button
**EmailVerifyBanner resend action (NoticeBarAction) while pending** — `every player route with an unconfirmed email`

The label swaps "Tuma kiungo tena" (16 chars) for "Inapakia…" (9 chars) while the transition is in flight, so the pill visibly shrinks and — because the row wraps on a 14rem text basis — can jump from its own line back beside the text and then out again when the result message lands. Same defect class as D24 (comments Post button), on a compliance bar that sits on every page.

*Evidence:* src/components/layout/email-verify-banner.tsx:106-108 `<NoticeBarAction glyph="mail" onClick={resend} disabled={pending}>{pending ? t.common.loading : t.wallet.verifyBannerCta}</NoticeBarAction>`; the pill is hug-width (notice-bar.tsx:184 `inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-pill border px-3.5`) inside a `flex-wrap` row (:85).

### S12-26 · ⚪ low · 🕓 unverified · container
**Toast item radius** — `all routes (toast viewport)`

The highest floating rung in the product (rung 4, `.mat-toast`) is the only overlay on an 8px radius: modal 16, sheet 16 top, filter-sheet panel 24 (`--r-xl`), toast 8. A toast landing over a 16px dialog reads as a different material family than the one it belongs to.

*Evidence:* src/components/ui/toast.tsx:658 `"pointer-events-auto relative w-full max-w-[320px] overflow-hidden rounded-md mat-toast"` — `rounded-md` is the LEGACY numeric scale (8px, tailwind.config.ts:245), while the semantic radii are card/modal 16 and control 12 (:250-253) and `<Modal>` uses `rounded-modal` (modal.tsx:319-320).

### S12-27 · ⚪ low · 🕓 unverified · textbox
**ConfirmModal hard-tier type-to-confirm input** — `/admin/* destructive confirms (typed SEAL / PAUSE gates)`

Height (16px text + 20px block padding + 2 borders ≈ 46px) and the 16px anti-zoom size are right, but: `outline-none` removes the focus ring and replaces it with a 1px border colour change — the weakest possible focus signal on the arming control of an irreversible action — and there is no `inputMode`/`enterKeyHint` (the gate is typed then confirmed, so `enterKeyHint="done"` is the honest hint). The visible `<span>` label plus a duplicate `aria-label` also double-announces the same string.

*Evidence:* src/components/ui/modal.tsx:553-571 — `autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-label={typeLabel}` and `className="mt-1 w-full rounded-lg border border-border-strong bg-bg-overlay px-3 py-2.5 font-mono text-body-lg tracking-[0.2em] uppercase text-text outline-none focus:border-[color:var(--brand-400)]"`.

### S12-28 · ⚪ low · 🕓 unverified · copy
**/offline hint line and Retry button** — `/offline (service-worker navigation fallback)`

The string is written for a degraded-but-working session, yet this page is served when the navigation itself failed — nothing works, not "some features". And tapping Retry while still offline reloads straight back to the same page with no acknowledgement, so the control gives no feedback for the most likely outcome.

*Evidence:* src/app/offline/page.tsx:27 `{t.common.offlineHint}` = "Some features may not work" / "Baadhi ya vipengele huenda visifanye kazi" / "部分功能可能无法使用" (i18n-dict.ts:434, 3055, 5192); :28-35 the retry is `onClick={() => window.location.reload()}` with no online check and no pending/failed state.

### S12-29 · ⚪ low · 🕓 unverified · button
**ConsentPrompt Allow / Decline** — `every non-commit player route (first visit; ?consent=1)`

The two answers sit exactly on the 40px floor rather than the 44 preferred on phones, while every other standing-bar action in the group is 44 (NoticeBarAction, notice-bar.tsx:184) and the filter pills are 44 — so the consent answers are the smallest standing controls on the screen. With the Swahili body the card resolves to roughly 240px tall floating 148px above the bottom edge, covering the lower third of a 360×640 screen.

*Evidence:* src/components/analytics/consent-prompt.tsx:88-93 `<Button … variant="ghost" size="sm" …>` ×2 → `.btn-sm { height: var(--h-control-sm) }` = 40px (globals.css:306, 1088); the card itself is `p-3` (16px) at :72 with a 13px body that runs 260+ characters in SW (i18n-dict.ts:2981).

### S12-30 · ⚪ low · 🕓 unverified · copy
**Session-ended NoticeBar sentence** — `any route immediately after a session ends`

An ASCII period is appended to a Chinese sentence ("已退出."), where the correct terminator is the ideographic "。" — punctuation is part of the sentence and belongs in the dictionary, not in the layout.

*Evidence:* src/components/layout/app-shell.tsx:315 `<span className="font-semibold">{t.auth.signedOut}.</span>{" "}` — the full stop is concatenated in JSX; `t.auth.signedOut` is "Signed out" / "Umetolewa" / "已退出" (i18n-dict.ts:507, 3121, 5257).

### S12-31 · ⚪ low · 🕓 unverified · container
**EmptyState vs ErrorState — one family, two compositions** — `every empty/error placeholder`

The two members of the same placeholder family disagree on radius (16 vs 12), measure (360 vs 420), padding (48/48 vs 32/80), title size (15.5 vs 15) and mark size (56 vs 48) — so an empty list and a failed list, which frequently appear on the same screen, read as two different systems. 37 files render EmptyState.

*Evidence:* src/components/ui/empty-state.tsx:68-72 `"rounded-xl border border-dashed border-border-strong bg-bg-elevated px-8 py-8 text-center"` + `max-w-[360px]` + title `text-[15.5px]` (:78) + 56px line art (:75); vs :100-106 `"rounded-lg border border-dashed border-danger-border bg-danger-500/[0.06] px-6 py-10 text-center max-w-[420px]"` + title `text-[15px]` (:113) + a 48px mark (:110).

### S12-32 · ⚪ low · 🕓 unverified · number
**WinCelebration net line money format** — `win celebration`

The sign, the currency placement and the grouping are re-composed at the call site instead of read from the one money grammar, on the surface that states a payout. Any future change to the signed format (e.g. compaction above 7 figures — which S12-02 shows this surface needs) will move every other surface and not this one.

*Evidence:* src/components/markets/win-celebration.tsx:329 `{payload.net >= 0 ? "+" : "−"}TZS {formatNumber(Math.abs(payload.net))}{" "}` — while `formatTzsSigned` already exists and produces exactly "+TZS 1,234" / "−TZS 1,234" with the U+2212 minus (src/lib/utils.ts:212-215).

### S12-33 · ⚪ low · 🕓 unverified · container
**Overlay gutters — 20px and 24px where the phone rung is 16** — `notice bars, both 404s, /offline, filter sheet`

Four different horizontal insets (16, 20, 24) across overlays that stack on the same screen — the announcement bar at 20, the page beneath it at 20-24, the sheet that covers it at 20 — so nothing vertically aligns with the page column the plan sets at 16. The filter sheet's comment explicitly chose 20 to match `px-4`, which means the fix has to move together with the page shell (U18).

*Evidence:* src/components/ui/notice-bar.tsx:85 `className="mx-auto flex max-w-board flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 lg:px-6"` (px-4 = 20px, py-2 = 12px); src/app/not-found.tsx:90 and src/app/markets/[id]/not-found.tsx:27 `px-5` (24px); src/app/offline/page.tsx:17 `px-4` (20px); globals.css `.kp-fsheet-panel { padding: var(--sp-3) var(--sp-5) calc(env(safe-area-inset-bottom,0px) + var(--sp-4)); }` (12/20/16+inset).

## S13-primitives — Design-system primitives and cross-surface consistency (code)

### S13-01 · 🟠 high · 🕓 unverified · number
**Money value in <Cash>, <Stat money>, <ReceiptRow emphasis="amount/total/fee">** — `/wallet, /markets/[id], /positions, /updown/[roundId], walle`

The only rule that keeps a TZS figure from breaking across lines is a CSS class none of the three money primitives applies, so `TZS 1,234,567` may wrap between the currency and the digits (or between groups) wherever the box is narrow — a two-up `<Stat boxed="panel" money>` at 360 gives ~110px of content for an 18px mono figure that needs ~140px, and ReceiptRow's value span carries neither nowrap nor shrink-0.

*Evidence:* globals.css:945 `.amount.amount { font-family: var(--font-mono); font-variant-numeric: tabular-nums; letter-spacing: 0; white-space: nowrap; }` with the note at :938 "a money figure is ONE object… `.amount` is the one class that means 'this is a money figure' everywhere else". The kit's money primitives do not wear it: stat.tsx:229-241 emits `font-mono font-bold tabular-nums` + size class; receipt-row.tsx:50 `font-mono text-[16px] font-bold tabular-nums`; cash.tsx:86 renders a bare `<span className={className}>`. A grep of `className="…amount…"` returns admin/* and /agent only (e.g. agent/page.tsx:179,256; admin/house/page.tsx:110) — not one player money surface routed through the kit.

### S13-02 · 🟠 high · 🕓 unverified · copy
**Top-bar wallet balance link (accessible name, masked state)** — `every authed route (top app bar)`

With balances masked, the most-used control on every authed page announces itself as "Wallet · Hide password" (SW "Pochi · Ficha nenosiri", ZH "钱包 · 隐藏密码") — a password label on a money link, in all three locales. A guest screenshot can never show it: it needs a session plus the privacy eye switched on.

*Evidence:* wallet-balance-pill.tsx:172 `aria-label={hidden ? `${t.common.wallet} · ${t.common.hidePassword}` : `${t.common.wallet} · ${formatTzs(effectiveBalance)}`}`. Dict values: i18n-dict.ts:210 `hidePassword: "Hide password"`, :2855 `"Ficha nenosiri"`, :4991 `"隐藏密码"`. The intended key exists three lines away in the same block: :378-379 `showBalances/hideBalances`, :3005-3006 `"Onyesha salio"/"Ficha salio"`, :5141-5142.

### S13-03 · 🟠 high · 🕓 unverified · number
**Signed / negative money across formatTzs, formatTzsSigned, formatNumber and the wallet activity row** — `/wallet (activity + top bar), /positions/performance, anywhe`

Four sign grammars for the same quantity: sign-after-currency, sign-before-currency, no sign on a debit, and a hyphen-minus where utils.ts:75 states the rule "Negatives carry the real minus glyph '−' (U+2212), never a hyphen". In the balance pill the hyphen and the plus also render at different visual widths, and a debit row carrying no sign is the one case a player must not have to infer.

*Evidence:* Executed the formatters verbatim (scratchpad/s13/fmt-probe.out.txt): formatTzs(-1234) → "TZS −1,234" (U+2212 after the currency, utils.ts:62-65); formatTzsSigned(-1234) → "−TZS 1,234" (sign before the currency, utils.ts:213-215); formatNumber(-500) → "-500" with U+002D (utils.ts:217-219), and that is the function the balance pill prints its delta with — wallet-balance-pill.tsx:240-241 `{delta > 0 ? "+" : ""}{formatNumber(delta)}`. The wallet activity row adds a fourth grammar: wallet-client.tsx:516 `${isCredit && !movedNothing ? "+" : ""}${formatTzs(Math.abs(tx.amount))}` — a credit reads "+TZS 1,234" and a debit reads "TZS 1,234" with no sign at all (also :535 in the expanded row).

### S13-04 · 🟠 high · 🕓 unverified · textbox
**Border of Input, Select trigger, Textarea, PasswordInput, OtpInput** — `/auth/register, /auth/login, /wallet/deposit, /wallet/withdr`

On a budget phone in daylight, the only boundary of every player-facing field is painted with the token the repo itself classifies as decorative and below the 3:1 non-text floor. The one field that passes (.input) is the one players meet least — the search box.

*Evidence:* tailwind.config.ts:114-119 records the ruling: "--border is DECORATIVE-only at 36% L. A border that is a control's ONLY boundary must reach 3:1, which is what --border-control is for (globals.css:316, 3.45:1 on --bg)". globals.css:1503 honours it for the CSS field (`.input { border: 1px solid var(--border-control) }`), but every React field atom uses the decorative token: input.tsx:135 `border-border hover:border-border-strong`, select.tsx:344 `border border-border`, textarea.tsx:21 `border border-border`, password-input.tsx:89 `border-border`, otp-input.tsx:25 `border border-border`, and .input-group (SearchBox) globals.css:1678 `1px solid var(--border)`. Token values: globals.css:411 `--border: oklch(36% 0.130 268)` vs :419 `--border-control: oklch(52% 0.130 268)`.

### S13-05 · 🟠 high · 🕓 unverified · a11y
**<Field> label wrapper + <Input error> / <PasswordInput error>** — `every form route (/auth/*, /wallet/deposit, /wallet/withdraw`

Because the hint/error <p> sits inside the <label>, it is concatenated into the control's accessible NAME — a screen reader announces "Amount Minimum TZS 1,000, edit text" and, after a refusal, the refusal becomes part of the field's name instead of its description. And an invalid field is never programmatically invalid, so the red border is the only signal; a non-sighted player correcting a rejected withdrawal gets no state at all.

*Evidence:* input.tsx:210-222 — `<label … >` contains the FieldLegend, the control, AND `error ? <p className="mt-1.5 text-body-sm text-danger-fg">{error}</p> : hint ? <p …>{hint}</p>`. Nothing emits `aria-invalid`, `aria-describedby` or `aria-errormessage`: the error path only paints (`errored ? "border-danger-500"`, input.tsx:124-142; password-input.tsx:61,88-98 identical).

### S13-06 · 🟠 high · 🕓 unverified · textbox
**SearchBox input (.search-box .input)** — `/markets, /results, /live, /proposals`

The one field on the highest-traffic board renders at 13px — three px under the anti-zoom floor and the smallest type any player types into. It also puts three field type sizes in the kit (13 search / 14 .input / 16 Input atom) for one job.

*Evidence:* globals.css:1744-1745 `.search-box .input, .market-search .input { flex: 1; min-width: 0; font-size: 13px; }` overriding `.input`'s own 14px (globals.css:1507). The React atom's phone rung is 16px for exactly this reason (input.tsx:72-76 `md: "text-[16px]"`, textarea.tsx:21 "16px text so iOS doesn't zoom").

### S13-07 · 🟡 medium · 🕓 unverified · button
**.clear-btn (SearchBox clear ×)** — `/markets, /results, /live, /proposals`

The only control that clears a search is 38×38 — two px under the platform's own floor, on a control tapped with a thumb while the keyboard is up. Its sibling in the same group (SearchHelp) was deliberately built at 40 (search-help.tsx:81-84), so the two adjacent targets disagree.

*Evidence:* globals.css:1746-1752 `.search-box .clear-btn, .market-search .clear-btn { display: grid; place-items: center; flex-shrink: 0; width: 38px; height: 38px; margin-right: 3px; … }`; the glyph inside is `<I.x s={15} />` (search-box.tsx:166). --tap-min is 40px (globals.css:304).

### S13-08 · 🟡 medium · 🕓 unverified · container
**EmptyState / ErrorState boxes** — `/positions, /watchlist, /notifications, /results, /proposals`

At 360 the boxed empty state is 328px wide with 96px of it spent on horizontal padding — 232px for a 56px illustration, a title and a body; the error twin spends 160px of vertical padding. The two members of one family also disagree on radius (16 vs 12), measure (360 vs 420) and title size (15.5 vs 15), so an empty list and a failed list read as two different designs.

*Evidence:* empty-state.tsx:69-71 `"rounded-xl border border-dashed border-border-strong bg-bg-elevated px-8 py-8 text-center", fill ? "w-full" : "max-w-[360px] mx-auto"` — on this repo's scale (tailwind.config.ts:221) `8` is **48px**, so the box carries 48px of padding on all four sides. ErrorState at :103-113 is `rounded-lg … px-6 py-10 … max-w-[420px]` = 32px sides, **80px** top and bottom, radius 12 not 16, title `text-[15px]` against EmptyState's `text-[15.5px]`.

### S13-09 · 🟡 medium · 🕓 unverified · filter
**Tabs variant="pill" option** — `kit (shipped on /admin/sources; zero player call sites — wal`

The kit contains a second capsule filter language that outlines EVERY option and is 4px shorter and two type steps smaller (12px mono uppercase vs 13px semibold) than the one FilterPill exists to enforce — the exact 'fifteen outlined capsules' shape filter-pill.tsx's header calls the biggest source of the 'chunky' criticism. It is one `variant="pill"` away from a player surface.

*Evidence:* tabs.tsx:406-421 — `BOX, "h-[40px] px-3.5 rounded-pill text-label font-mono font-semibold uppercase tracking-[0.14em] border …", active ? "border-brand-400 text-text" : "border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text"`. FilterPill's law is the opposite: filter-pill.tsx:8-14 "only the SELECTED pill carries an outline. An unselected pill is text on transparent", implemented at :156-158 `on ? "border-brand-400 text-text" : "border-transparent …"`, at min-h-[44px] and `text-[13px]` (:115-116).

### S13-10 · 🟡 medium · 🕓 unverified · filter
**Pagination current-page button** — `every paginated player route (/results, /positions, /wallet,`

The pager states 'this one is current' with a fill and an ink the design gate already removed from tabs.tsx — so the selected page number and the selected filter pill on the same screen are two different answers to one question, and the guard that watches for this cannot see it (it matches the token's literal text).

*Evidence:* pagination.tsx:149 `const btnActive = "border border-brand-500 bg-brand-500/15 text-brand-300 font-bold shadow-glow-selected";`. globals.css:443 `--pill-active: oklch(40% 0.12 262 / 0.35); /* one active filter/tab fill everywhere */`, and tabs.tsx:415-421 records the identical spelling being refused there: "It was `border-brand-500 bg-brand-500/15 text-brand-300` — a Tailwind-alpha restatement of `--pill-active`, on the ink DG-P-11 refused for an active nav item, and invisible to `hardcoded-pill-active` for the same reason."

### S13-11 · 🟡 medium · 🕓 unverified · filter
**Up & Down stake chips + Custom toggle** — `/updown, /updown/[roundId]`

The selection rail that decides how much money is staked speaks a third dialect: an 8px-radius rectangle instead of a pill, 10.5/11.5px instead of 13px, and 'selected' painted with a neutral inset fill and a grey border instead of the platform's one active fill and brand edge. Height is correct (44), so this is purely geometry/idiom drift on the money path.

*Evidence:* updown-stake-controls.tsx:165-172 `rounded-md px-2(.5) py-1(.5) min-h-[44px] … font-mono text-[10.5px/11.5px] font-semibold tabular-nums` with `chipStyle(on)` = `border: 1px solid ${on ? "var(--border-strong)" : "transparent"}; background: on ? "var(--bg-inset)" : color-mix(… 45%…)`; round-stake-panel.tsx:186 repeats the pattern. Against filter-pill.tsx:109-159: `rounded-pill`, `min-h-[44px]`, `px-3`, `text-[13px]`, selected = `border-brand-400` + `.kp-fchip[data-on]`'s `--pill-active` + `--glow-selected` (globals.css:3040-3043).

### S13-12 · 🟡 medium · 🕓 unverified · typography
**<Chip> size dictionary** — `/markets, /live, /results, /updown, /positions (every board `

Seven type sizes inside one primitive, of which 9, 10.5 and 12.5 exist on neither ladder, and the two sub-10 steps render in the BODY face — the nano tier is blessed only for uppercase MONO microlabels. The default size (`md`, 10.5px) is the one most cards get, so the commonest chip in the product is off-ladder.

*Evidence:* chip.tsx:161-181 — xs 9px, sm 9.5/10px, md 10.5/11px, lg 12/12.5px; and :271 `fontFamily: "var(--font-body)"` with `fontWeight: 700`, `letterSpacing: 0.02-0.06em`, uppercase. Ladders: tailwind.config.ts:198-200 micro 10 / caption 11 / label 12; globals.css:225-226 `--type-label: 9.5px; --type-nano: 8.5px` ("always letter-spaced caps" mono microlabels).

### S13-13 · 🟡 medium · 🕓 unverified · typography
**<Stat> label dictionary (default labelStyle="micro")** — `/wallet, /positions/performance, /markets/[id], /profile, /p`

The kit's default stat label is 9px — a step that exists on neither ladder, sitting between the two blessed ones — and it is painted in `--text-faint` on tiles that carry money. Combined with the value rung and the hint rung, a boxed Stat renders three type sizes plus whatever the card around it uses.

*Evidence:* stat.tsx:100-109 `micro: "text-[9px] tracking-[0.10em] text-text-faint"` (the DEFAULT, stat.tsx:171) and `tiny: "text-[9px] …"`; the other six are 9.5 and 10. Blessed steps are 9.5 and 8.5 only (globals.css:221-226). The file's own header (stat.tsx:14-24) lists 7 value sizes and 8 label styles across 65 call sites, with `xs 13.5` and `2xl 21` admitted as "off BOTH ladders".

### S13-14 · 🟡 medium · 🕓 unverified · number
**Raw `.toLocaleString()` on player counts** — `/wallet (pager), /results, /positions, /proposals, /updown/[`

Counts beside figures that DO go through the platform grammar are grouped by the device's locale instead. For SW/ZH players the output happens to coincide, so the defect is invisible in the three supported locales — but a phone set to any other locale renders a different separator, and in client mode (the wallet pager, market cards) the server's en-US string and the browser's differ, which is a hydration mismatch on a money page.

*Evidence:* pagination.tsx:177 `{((safePage - 1) * perPage + 1).toLocaleString()}–{Math.min(safePage * perPage, total).toLocaleString()} {ofLabel} {total.toLocaleString()}`; proposals/page.tsx:224; updown/[roundId]/page.tsx:507; market-card.tsx:411 (a "use client" component). utils.ts:227-233 already rules on this: "`toLocaleString()` with no argument groups by whatever locale the RUNTIME holds… `formatNumber` is the platform's unit-free grouping". Executed (fmt-probe.out.txt): en-US/sw/sw-TZ/zh-CN all give "1,234,567", but fr-FR "1 234 567", de-DE "1.234.567", hi-IN "12,34,567", ar-EG "١٬٢٣٤٬٥٦٧"; Node's own default here is en-US.

### S13-15 · 🟡 medium · 🕓 unverified · copy
**Date/time helpers (formatDate, formatDateTime, formatDayTime, formatDeadline)** — `/markets/[id], /positions, /wallet, /wallet/receipt/[id], /p`

Two date grammars in one product: /updown/history renders "11 Ago" (SW) or "2026年8月11日" (ZH) through formatEatDay, while every deadline, receipt and audit line on the same account renders the English "11 Aug" / "11 Aug, 14:30". ZH is the worst case — a Latin month abbreviation inside a Chinese sentence.

*Evidence:* utils.ts:268-298 and :330-341 all pass the fixed locale "en-GB" (`new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", … })`). The platform's localized month names exist and are used elsewhere: eat-day.ts:72-76 `formatEatDay(dayKey, monthsShort, locale)` with i18n-dict.ts:454 (EN), :3073 (SW `"Mac","Mei","Ago","Okt","Des"`), :5210 (ZH `"8月"`). Executed: the en-GB call renders "11 Jun, 14:30" for every locale; the ZH-correct form is "6月11日 14:30".

### S13-16 · 🟡 medium · 🕓 unverified · state
**<Cash> masked state** — `/wallet, /positions, /markets/[id], /profile/invite (every b`

The same defect the top bar was fixed for still exists at every other Cash site: masking "TZS 84,200" (10 glyphs) with "TZS •••••" (9) or "TZS 1,234,567" (13) with the same 9 reflows stat tiles, position cards and receipt rows when the player taps the eye — a pure display action rearranging money surfaces.

*Evidence:* cash.tsx:73-95 — the masked branch renders `{prefix}{mask}` with `mask = "•••••"`, a fixed five glyphs whatever the figure was. Only one consumer reserves the width: wallet-balance-pill.tsx:224-229 renders an invisible sizer span (`<span aria-hidden className="invisible">{formatBalancePill(effectiveBalance)}</span>`) with the note "toggling the eye changed the capsule from 145px to 130px and shifted the whole cluster 15px sideways".

### S13-17 · 🟡 medium · 🕓 unverified · a11y
**<Cash> hidden-state label** — `/wallet, /positions, /markets/[id] (every masked balance)`

Two defects in one attribute: the only announcement of the masked state is English in SW and ZH, and `aria-label` on a role-less generic element is ignored by several screen readers, so some players hear the bullet glyphs and nothing else.

*Evidence:* cash.tsx:91 `<span className={className} style={style} aria-label="balance hidden">` — a hard-coded English string on a plain <span> (no role), in a component whose sibling control already localizes (cash.tsx:112 `t.common.showBalances / t.common.hideBalances`).

### S13-18 · 🟡 medium · 🕓 unverified · textbox
**<PasswordInput> size rung + reveal button** — `/auth/login, /auth/register, /auth/reset-password, /profile/`

The password field's small rung is 4px shorter than the text field's after the ruling that removed that number from the kit, so a password sitting beside a text input in one form is a different height; and the show/hide control — which announces a pressed state — cannot be reached by keyboard at all, so a player typing a password with an external keyboard or switch access can never reveal it.

*Evidence:* password-input.tsx:42-46 `sm: "h-[36px]"` against input.tsx:59-70, where DG-A-04 explicitly retired 36: "WAS `h-[36px]`, AND 36 IS ON NO RUNG… Ali's ruling 2026-08-29: it takes `--h-control-sm` (40)" — the file even claims at :38 to be "byte-identical to input.tsx's table". The reveal button at :112-119 carries `tabIndex={-1}` together with `aria-pressed={reveal}`.

### S13-19 · 🟡 medium · 🕓 unverified · button
**<Button loading> / <SubmitButton pending>** — `every form and money-commit route (/auth/*, /wallet/*, /mark`

Every pending control changes width (and, in a wrapping row, position) at the moment it is pressed — the class-level root of D24's "Post button widens while pending". Disabling on `loading` also drops keyboard focus to <body> mid-interaction, so a keyboard player loses their place while the action is in flight.

*Evidence:* button.tsx:72-88 — `disabled={disabled // loading}`, then `{loading ? <Spinner size={size} /> : leading}{children}`, inside `.btn { display: inline-flex; gap: 8px; white-space: nowrap }` (globals.css:1051-1061). A button with no `leading` therefore gains a 12-16px spinner plus an 8px gap when it starts working. submit-button.tsx:61-67 additionally swaps the label: `{pending ? (pendingLabel ?? t.common.working) : label}`.

### S13-20 · 🟡 medium · 🕓 unverified · button
**.btn (all five rungs)** — `kit — every button on every route`

A label longer than its box cannot wrap, cannot shrink and cannot ellipsise — it simply overflows the button. This is the class-level cause of D23 ("sell button wraps and clips in fixed 44") and it applies to every SW label in the kit, where the repo's own note measures SW at ~35-40% longer than EN.

*Evidence:* globals.css:1045-1061 `.btn { … white-space: nowrap; }` combined with fixed heights at :1087-1091 (`height: var(--h-control-*)`), and no `min-width: 0`, no `max-width`, no overflow rule; the only call-site remedy in the product is .mcardp-actions' `min-width: 0` (globals.css:3969).

### S13-21 · 🟡 medium · 🕓 unverified · a11y
**<InfoHint> / <Tooltip> trigger** — `/markets/[id] (conviction dial: 3 hints), anywhere InfoHint `

On a touch device there is no hover, and tapping a `tabIndex` span does not reliably focus it — so the explanatory text (e.g. the conviction multiplier explanation) is effectively unreachable on the device most players use; the visible trigger is also an ~11x11px target, a quarter of the tap floor. The sr-only copy inside means a screen reader gets it, but a sighted thumb does not.

*Evidence:* tooltip.tsx:24-28 renders `<span className="kp-tooltip" tabIndex={0}>`; globals.css:1945-1949 opens the popover only on `.kp-tooltip:hover` and `.kp-tooltip:focus-within`. info-hint.tsx:33-41 puts an 11px glyph (`<I.info s={size} />`, default 11) in a bare `inline-block … ml-1 cursor-help` span with no padding and no min size. Call sites: conviction-dial.tsx:1444, 1532, 1596.

### S13-22 · 🟡 medium · 🕓 unverified · container
**<Callout> box geometry (sm/md/strong/stack)** — `/markets/[id], /wallet/*, /profile/responsible-gambling, /pr`

One notice component ships four radii (8/12/16/16) and four padding pairs, so the same message changes shape with its emphasis; the stack layout spends 32px per side on a phone and puts a 56px icon plate above the text, which is off the phone plate rungs (40/32/24) and makes a compliance notice inside a card a depth-2 box with ~48px of stacked padding.

*Evidence:* callout.tsx:161-164 `sm: … "gap-2.5 rounded-md px-3 py-2.5"` (8px radius, 16px/10px padding), `md: … "gap-3 rounded-xl px-4 py-3.5"` (16px radius, 20px/14px); :291 `strong && "border-2 rounded-lg p-3"` (12px radius); :257 stack `"rounded-card border p-6 text-center sm:p-8"` = 32px padding on phones, with an `<IconPlate size={56}>` at :263-271.

### S13-23 · 🟡 medium · 🕓 unverified · container
**<ReceiptRow>** — `/wallet/deposit (confirm), /wallet/withdraw (confirm), /wall`

On a 360 screen the last screen before money moves puts a SW label ("KIASI UTAKACHOPOKEA") and a 16px mono figure in one row with zero guaranteed space between them; with no nowrap on the value, `TZS 1,000,000` can also break across lines inside the receipt.

*Evidence:* receipt-row.tsx:89-103 `<div className={cn("flex items-baseline justify-between", divider && "border-t border-border pt-1.5", …)}>` — no `gap-*` between the label span and the value span, and the value span (`VALUE[emphasis]`, :44-58) carries neither `whitespace-nowrap` nor `shrink-0`; only `alignEnd` adds `text-right`. Call sites: withdraw-confirm.tsx:175-177, deposit-confirm.tsx:135.

### S13-24 · ⚪ low · 🕓 unverified · textbox
**<Select> option row label** — `/profile/responsible-gambling (limit selects), /markets/[id]`

The rule the trigger states is reversed one function below: in the open list a long option is ellipsised, and on a phone that is where the choice is actually made. SW option labels (typically 35-40% longer) are the ones that get cut, on the RG limit selects.

*Evidence:* select.tsx:427 `<span className={cn("block", !o.hint && "truncate")}>{o.label}</span>` — while the closed trigger at :354-364 refuses truncation outright: "NOT `truncate` — E-98. A dropdown's closed trigger is the ONLY place the operator reads what they chose, so hiding part of it is data loss". The panel's width is the trigger's (`width: pos.width`, :393), i.e. the phone's field width.

### S13-25 · ⚪ low · 🕓 unverified · number
**<CountdownPill>** — `/auth/otp, rate-limit banner`

The cool-off clock changes grammar mid-count — "1:30", "1:00", then "59s" — and the string changes width as it does, on the screen where a locked-out player is watching the number. The figure also renders at 11px, the smallest time readout in the kit.

*Evidence:* countdown-pill.tsx:87-89 `const display = m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;` rendered at :114 `font-mono text-[11px] tabular-nums`.

### S13-26 · ⚪ low · 🕓 unverified · button
**<Button> default HTML type** — `kit (18 call sites in files that also render a <form>)`

The kit's primary button is a submit button by default, so any future <Button> placed inside a form (a Cancel, a Show more, a tab) fires the form's action. On this product a stray submit inside a withdraw or deposit form is a money event, and nothing in the type system or the gates would flag it.

*Evidence:* button.tsx:65-88 spreads `{...rest}` onto a bare `<button>` with no `type` default, so it inherits the HTML default `type="submit"`. Scanned every .tsx containing `<form` (script output in scratchpad/s13/fmt-probe.out.txt): 18 `<Button …>` open tags carry no `type=` — admin/agents (3), admin/events (2), admin/system (3), agent/page.tsx (6), agent/status (2), admin/agents/page.tsx (1). I checked the player ones by hand: agent/page.tsx:191-213 and agent/status:73,100 all sit inside `<Link>` wrappers, and the one real form at agent/page.tsx:199-201 does pass `type="submit"` — so today's exposure is admin-only.

### S13-27 · ⚪ low · 🕓 unverified · textbox
**<Checkbox> box + label** — `/auth/register (age gate + terms), /profile/notifications, c`

Four off-scale values in one control: a 19px box with a 5px radius (B10.2: each family has one radius; the scale is 4/8/12/16), a 9px gap (scale is 8 or 12), a 13.5px label (neither ladder), and a 1px top margin on a `align-items: center` row that nudges the box off the text's optical centre. The 40px row height is correct.

*Evidence:* checkbox.tsx:89-97 `style={{ … minHeight: "var(--tap-min)", gap: 9, fontSize: 13.5 }}` and :123-137 `width: 19, height: 19, borderRadius: 5, border: "1.5px solid …", marginTop: 1`.

### S13-28 · ⚪ low · 🕓 unverified · textbox
**SearchBox <input type="search">** — `/markets, /results, /live, /proposals`

On WebKit/Blink the UA's own cancel glyph can paint inside the field alongside the kit's ×, giving the player two clear controls of different sizes in one box (the kit's is 38px, the UA's ~14px and unlabelled).

*Evidence:* search-box.tsx:146-158 renders `type="search"`; a grep of globals.css for `search-cancel` returns nothing — there is no `::-webkit-search-cancel-button { display: none }` anywhere, while the component paints its own clear control at :159-168 (`.clear-btn`).

### S13-29 · ⚪ low · 🕓 unverified · number
**formatTzsCompact band grammar** — `/ (landing proof rail), /markets (open volume), /markets/[id`

Inside one formatter the K band carries no decimal while the M and B bands can print a trailing ".0" — so a pool of exactly one million reads "TZS 1.0M" while ten million reads "TZS 10M" and one thousand reads "TZS 1K". The ".0" also appears at the very value (1,000,000) the balance pill's threshold hands over at, so a player watching their balance cross 1M sees the grammar change twice.

*Evidence:* Executed (fmt-probe.out.txt): 1,000 → "TZS 1K"; 1,499 → "TZS 1K"; 2,500 → "TZS 3K"; 999,500 → "TZS 1.0M"; 1,000,000 → "TZS 1.0M"; 9,950,000 → "TZS 10M"; 999,500,000 → "TZS 1.0B". Source: utils.ts:129-136. The exact-value sibling prints the same magnitudes as "1M" / "2.5K" (stake-math.ts:23-27).

### S13-30 · ⚪ low · 🕓 unverified · typography
**Hand-typed sizes across the kit primitives** — `kit — all routes`

Eleven distinct sizes in the kit exist on neither ladder (10.5, 11.5, 12.5, 13.5, 15.5, 16.5 among them), so two primitives sitting in one card can land half a pixel apart and no rung governs either — the condition §T1/§T7 and `test:type-scale` §4 exist to ratchet down.

*Evidence:* filter-pill.tsx:116 `text-[11.5px]` (secondary rank) and :248 `text-[11px]`; select.tsx:293 `text-[12.5px]` (xs) and :418 `text-[14px]`; checkbox.tsx:95 `fontSize: 13.5`; callout.tsx:163 `text-[13.5px]`, :274 `text-[18px]`, :302 `text-[15px]`; empty-state.tsx:78 `text-[15.5px]`, :113 `text-[15px]`, :114 `text-[11px]`; search-help.tsx:154,171 `text-[12px]`/`text-[10.5px]`; globals.css:1091 `.btn-xl { font-size: 16.5px }`; stat.tsx:85-91 `13.5 / 15 / 17 / 21 / 24`. Ladders: tailwind.config.ts:197-210 and globals.css:211-226.

### S13-31 · ⚪ low · 🕓 unverified · icon
**<CashEye> boxed variant** — `/wallet, /positions (any non-bare eye)`

The doc line understates the control by 12px in each direction (the kind of drift input.tsx:54-58 and pagination.tsx:137-147 both record paying for), and the box takes the legacy 8px radius rather than the control radius every other small boxed control in the kit uses.

*Evidence:* cash.tsx:16 documents "`<CashEye />` → boxed 28px toggle", but :117 emits `"h-7 w-7 rounded-md border border-border hover:border-border-strong"` — on this repo's scale `7` is 40px (tailwind.config.ts:220), so the control renders 40x40 with an 8px radius. The control radius is `--r-md` 12px (`rounded-control`, tailwind.config.ts:252).

---

## Appendix — the professional critics panel, 2026-09-16

> **⚪ RECORD — the evidence behind `MOBILE-VISUAL-PLAN.md` §3b.** Six professional critics and a completeness critic read 44 live phone
> frames (360×780, Swahili — the default a new visitor gets), and an adversarial verifier re-opened every named frame before a claim was kept.
> Each surviving claim below names where it went: a defect (D-id), an owner item, a unit note, `LIVE-QA-CAMPAIGN.md` E-420, or the
> no-owner list in §3b — and that routing was proven by a trace over all 87 survivors, which fails when any destination is missing.
> Frames are named `<surface>__s<NN>.png` (NN = scroll screen) and live in the gitignored `.qa-shots/`, never in the repo.

⚠️ **Read the verdicts, not only their counts.** This run's verifiers had two verdicts, so three claims that were real and already registered (D1, D2, D3)
are marked *refuted* below with a reason that says so. The stored workflow (`.claude/workflows/visual-critics-panel.js`) now has a third verdict, `known`.

### Scores and the critics' own summaries

| Lens | Score | What holds the score there |
|---|---|---|
| Art direction | **6** | Holding it at 6 is the accent economy, not the craft. The system owns exactly two distinctive assets — the needle/rail and the gilt — and both are applied by habit rather than by rule: gilt lands on four different non-money jobs across four surfaces while money goes blue, white and gold on three screens in a row, and the rail is missing from a whole game. That is what makes a carefully made product read as assembled. The single change that would move the score most is a hard accent contract enforced in the tokens: gilt appears only on money and the brand mark, the YES and NO inks appear only on YES and NO (which alone fixes the green HAPANA on the results board), and the rail is the house device for any two-sided value — including Up & Down. Do that and the identity survives all eleven screens instead of the first one. |
| Typography | **6** | What holds the score at 6 is that the type has no enforced ladder at the object level: a single results card carries six sizes against a written limit of three, and the biggest of them is a repeated status word while the market question is clamped and cut mid-title. Every other finding here is a symptom of the same missing rule — money without a fixed style, gilt without a fixed meaning, mono without a fixed job. The single change that would move it most is defining and enforcing the card ladder: one title size, one money style (mono tabular, gold, grouped thousands), one label rung, nothing else — then deleting whatever no longer fits, starting with the three redundant outcome statements on the results card. Fix the green HAPANA at the same time and this reads as an 8. |
| Colour and theme | **6** | The palette itself is competent — the neutral ramp and the ground steps are the work of someone who knows dark themes, and I found no genuine text-contrast failure anywhere in 44 frames (I checked the one I expected to fail, the "UMESAHAU NENOSIRI?" link, and it measures 5.3:1). What holds the score at 6 is that the accents no longer mean anything stable: an accent that changes meaning between screens is worse than no accent, because a player learns the wrong rule and then gets it wrong on money. The single change that would move the score most is to re-anchor gilt to money and only money: make the pool figure on every card gold, and take gold off the 01/02/03 ordinals, the "INGIA" / "UCHAGUZI UNAFUNGWA BAADA YA" eyebrows, the pager rings and the IMEKAMILIKA chip. That one move fixes the inverted hierarchy on the card footer, restores test:gold-is-money, and frees a neutral to carry "settled" — after which the green/HAPANA collision is the only remaining semantic break. |
| Layout and density | **6.5** | The craft floor is high — consistent theming, a real type scale, cards that mostly keep their internal geometry, and only small optical misalignments (a 20px jog on one hero figure, a 4px gutter shift on Up & Down, a 8px height difference between sibling tiles). What holds the score at 6.5 is density and system discipline: 30% of the board viewport is permanently pinned chrome, empty states hold open desktop-sized boxes, one repeated card element (the sparkline band) silently changes card height by 34px, and the left inset is five different numbers across five surfaces, which means no single compaction pass can be trusted. The green HAPANA on the results board costs it half a point on its own, because it is a correctness failure dressed as a style choice. The single change that would move the score most is not a colour fix but a density pass on the three repeated empty states — the cold-start card, the settled card's dead sparkline band, and the empty discussion panel. Those three together are worth roughly a card and a half of extra content per screen on every board in the product, and they are the specific thing the "chunky and big" players are seeing. |
| Information design | **5** | The score is held down by a consistent pattern rather than by any one bug: wherever the platform has thin data, the graphics render it at full confidence, and wherever a figure could be cross-checked against another figure on the same or a neighbouring screen, it often disagrees. The craft is there — this is not a crude product — which is exactly why the arithmetic failures read as carelessness rather than as immaturity. The single change that would move the score most is putting sample size into the price itself: shrink the displayed probability toward 50 by pool size, clamp the extremes off 0 and 100, and print the predictor count beside every percentage on every surface including /live. That one change fixes the 100%/0% cards, makes the home bar's caption honest, defuses the chart's implied history, and stops the board training readers to distrust its own numbers. |
| Swahili reader | **6** | The editorial Swahili is an 8; the system-generated Swahili is a 4, and a player meets the system strings on every card. What holds the score down is that the failures cluster on money and time — the pool, the settlement verb, the closing timestamp — which are exactly the strings a bettor has to trust. The single change that moves it most is a money-and-time glossary enforced in code: one word for the pool (retire "bwawa"), one word for settled, one spelling of NDIO, and a locale-aware date formatter so no English month can render on a Swahili page. That one pass fixes six of the findings below and lifts the product from "rendered in Swahili" to "authored in Swahili". |
| Completeness critic | **5.5** | The core card and the dark theme are well made, and the panel's praise for them stands. What pulls the score down is what they missed. A fixed chat button covers content on nearly every screen and was left out of the pinned-chrome measurement, so no lens saw it. The front door's biggest type is English. Tabs, the podium and the facepile of player avatars are clipped or misleading exactly where a first-time bettor looks. The single change that would help most: move the chat button off the content column (into the bottom rail or the Zaidi menu), or reserve a clear strip for it and count it as chrome. That clears defects on markets, results, detail, leaderboard, home, help and live at once. |

**Art direction — overall read.** There is a real design here, not a template: the green-to-red tipping rail with its leaning gold needle is a genuine proprietary device, it is the same object as the logo mark, and it carries the home hero, the board, the live feed and the results board — crop the logo off markets__s00.png and a returning player would still know whose product it is. The type is confident, the dark royal ground is properly built rather than borrowed, and login__s00.png is the most assured screen in the set. What lets it down is economy: the gold that is supposed to mean money is spent on pager arrows, status pills, crowns and a chart baseline while the actual pool figure appears in three different colours and two different number formats within two taps; the settled board prints HAPANA in the NDIO green over an all-green rail; Up & Down drops the rail, the needle and the currency entirely and reads as a bought-in widget wearing the house chrome; and every page, however short, ends in the same 920px undesigned link list whose loudest objects are three other companies' logos. The identity is strong for one screen and thins steadily to the bottom of the scroll.

**Typography — overall read.** Typographically this is a real system, not a pile of defaults: the display face has character, the FAQ list on help__s01, the countdown tiles on detail__s01 and the footer link columns are set with a confident hand, and the body measure and leading on home hold up well under Swahili's extra length. What it lacks is discipline about which voice does which job. Monospace has spread from numerals into running sentences; letter-spaced uppercase labels appear so often that they have started truncating themselves in Swahili; gold — the colour the team's own sheet reserves for money — now marks eyebrows, step numbers and pagination while the pool figure on every card is the dimmest thing in its row; and money itself is set three different ways for the same amount. The sharpest single failure is on /results, where the settled outcome word is painted the YES green whether the market resolved NDIO or HAPANA.

**Colour and theme — overall read.** The base is genuinely good and I want to say so first: the navy ground family (#03002D page → #07045A panel → #080860 card) is a well-built dark theme — no banding, no grey mush, no washed-out "dark grey" laziness — and the text ramp (#F5F8FF / #C6D1EC / #899DD1) all clears 6:1 on every ground I measured. Where it falls down is not craft, it is meaning. Five accent families are in play (royal, YES-green, NO-red, gilt, teal) and three of them have stopped carrying one job each: gilt has migrated off money onto eyebrows, section numerals, pagination rings and settled-status chips while the pool figure — the money — is painted in the same quiet #899DD1 as a metadata label; green now means YES, "up", "gain" AND "settled", which is why the /results board prints the word HAPANA in the YES green; and "live" is red in the ticker and teal in the badge 165px below it on the same screen. Underneath that, elevation is doing almost no work — outer panel and inner digit box share the identical fill and are separated only by a 1.59:1 hairline — so the page reads as one flat sheet of cards, except on /markets where two fully saturated traffic-light blocks per card make the board the one place the theme goes loud.

**Layout and density — overall read.** Through a layout lens this is a genuinely well-made product, and I want to be clear about that before the faults: one dark theme held consistently across nine surfaces, a real type scale that is not being abused, a footer that is pixel-identical on five different pages, tab and sort rows that land on the same 16px gutter, and countdown digit boxes that sit on an honest grid. The spacing steps inside the home explainer sections (15 / 22 / 37 / 77 CSS) are a proper doubling rhythm, not ad hoc. On the owner's split verdict — "good sizing" versus "chunky and big" — my read is that both camps are right about different things: the type is not chunky, the chrome and the empty states are. On /markets 237px of the 780px viewport never scrolls, so 543px is left and that holds one and a half cards; a cold-start card spends 28% of its height saying "no bets yet" three times; the discussion panel on a market page spends 246px saying there are no comments; and a 34px sparkline band sits on some cards rendering as a flat hairline. Compaction here should come entirely out of chrome, empty states and repeated labels — exactly as the phone design sheet says — and none of it out of the headline, the 28px title, the YES/NO buttons or the percentages, which are the best-judged things on the screen. The one finding I would put in front of the owner today is not a spacing one: on the results board the outcome word is painted YES-green whether the market resolved NDIO or HAPANA, on the screen that announces who won money.

**Information design — overall read.** Visually this is a confident, coherent product — the dark palette holds across nine surfaces, the card material and radii are consistent, the needle brand mark is genuinely distinctive, and the Swahili typography sets well at 360px with almost no clipping. The empty-market cards even get the hard part right: they refuse to invent a price and show a neutral dotted track instead. But through the information-design lens the numbers are the weakest layer of an otherwise strong design. Several graphics assert far more than the data behind them supports — a solid green bar and "NDIO 100%" resting on one TZS 1,000 bet, a probability chart with a range selector and a filled area drawn from a market with one predictor — and where a mark could be checked, it often fails: the results donut's parts sum to 147 beside a total of 171, the detail chart's date axis spaces one day the same as two, the settled cards point a needle at the side that lost, and the leaderboard ranks by a figure it then omits from five of its six rows. The most telling one is the home page's own sentiment bar, whose caption claims "every open market" for a number that can only come from the six markets that have money in them.

**Swahili reader — overall read.** The long-form Swahili on this product is genuinely authored, not machine output: the how-it-works section, the help desk, the login card and the responsible-play tools read like someone who speaks the language wrote them, and small things that trip translators are right — "3 watabiri" vs "1 mtabiri", "Je," question framing, "Des"/"Okt" months in market copy, "Mubashara" for live. The failure is not in the prose, it is at the seams where the product's own system strings surface: the money vocabulary (a betting pool is called "bwawa", a pond), the settlement verbs (imekamilika vs imetatuliwa inside one card), the timestamps (English "27 Oct 2026" under a title that says "Okt"), and the leftovers the dictionary never reached (a SPORTS chip, 1W/1M/ALL, S and B tier letters, ROI). So home, help, login and the how-it-works block read as authored in Swahili; /results, the detail page's data panel, /leaderboard and the live ticker read as an English product wearing Swahili. And YES itself is spelled two ways in a single row on the market detail page — when the core word of a money product is unstable, nothing downstream feels settled.

**Completeness critic — overall read.** The six lenses were thorough on the market card, the results board and Swahili wording, but they all looked past the objects that sit on top of the design or at its edges. The biggest misses: a floating chat button that covers data, links and legal text on seven of nine surfaces; an English hero headline ("The wisdom of YES & NO.") on the Swahili-default front door; and a leaderboard whose podium breaks every username mid-word and draws the same player with two unrelated avatars. Nobody reviewed the icons, the login form or the footer's actual links. Those areas hold real faults: a dead "coming soon" link, casino "RTP" wording in a product whose slogan is "Si bahati" (not chance), a sign-in form showing the sign-up password rule, and a comments panel whose button says "sign in to predict".

### Art direction — 14 claims, 11 kept

#### CP-001 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `results__s02.png`
**A settled HAPANA is printed in the NDIO green, on an all-green card** — routed to: **D29 (U32)**

*Seen:* The card reads "TOKEO / HAPANA" set in #42c070 — sampled, and byte-identical to the green used for "TOKEO / NDIO" on results__s03.png and results__s04.png. It is the largest type on the card (~20 CSS px caps, twice the title's weight in colour). Directly beneath it the tipping rail is green across its entire width with the gold needle pinned at the far right, i.e. the crowd sat at ~100% NDIO. So a card whose answer was NO is rendered green headline, green rail, green needle-end. The same green appears for a NDIO outcome on results__s03.png over a rail that is entirely RED. The outcome ink never changes; only the word does.

*Why it matters:* This is a real-money product whose entire semantic system is one sentence long: green is YES, red is NO. It is taught on the home hero, on every button, on every rail. On the results board that sentence is broken at the exact moment it pays out. A player scanning 171 settled markets reads colour before words — in Swahili, in daylight, on a budget phone — and will read half of them backwards. It also quietly undermines the tipping rail: if the rail and the verdict can be opposite colours and nobody flagged it, the rail stops being trusted as truth.

*Critic's fix:* Bind the outcome word to the outcome ink, not to a generic "resolved" token: NDIO takes the YES green, HAPANA takes the HAPANA red (the #d02b31 family, lightened for type contrast on the dark ground), VOID/refund takes the neutral periwinkle. Then desaturate the settled rail to ~40% so the live crowd position stops competing with the verdict it contradicts.

*Verifier:* Opened results__s02.png and sampled the 'TOKEO / HAPANA' glyphs: #42c070. Sampled the 'TOKEO / NDIO' glyphs on results__s03.png (both the top card and the second card): #42c070, byte-identical. Sampled the live NDIO percentage on markets__s01.png ('NDIO 67%'): also #42c070, so that green is provably the NDIO ink, not a neutral 'settled' mint — HAPANA elsewhere is #d02b31 (button fill, markets__s01) and #ff6e70 (donut arc, ticker). So a NO outcome is set in the YES ink, which breaks the sheet's own guardrail that 'the YES/NO inks keep their meaning'. Downgraded from high to medium because two of the critic's supporting details are embellishment rather than evidence: the all-green rail with the needle at the far right is truthful crowd data (the crowd sat ~100% NDIO and was wrong) — results__s03.png shows the same green word over a fully RED rail, which is the same rail rendering correctly — and the word 'HAPANA' is spelled out in full, so no reader is actually misled about the outcome. It is a colour-semantics violation, not a wrong answer on screen. Not covered by D1-D41 (D29 is about invented 50% on no-bet cards).

#### CP-002 · ❌ refuted · ⚪ low taste (claimed high/defect) · `detail__s01.png`
**The same market's pool is a different number and a different colour one tap apart** — routed to: **— not routed**

*Seen:* This is market mkt_37fa…, the S!TE 2026 market. Here the KIASI tile reads "TZS 3K" in pure white (#f5f8ff sampled). On markets__s01.png the same market's card states the same figure as "TZS 3,000" in muted periwinkle (#899dd1 sampled). On home__s00.png the hero states the site total as "TZS 29K" in gold (#f3cb7a sampled). Three renderings of the one quantity this product exists to move: comma-grouped/blue on the board, abbreviated/white on the detail, abbreviated/gold in the hero — all reachable in two taps.

*Why it matters:* The design sheet reserves gilt for money and brand. In practice money is the least consistently treated element in the system: it is gold exactly once, on the marketing hero, and then demoted to body-text blue on the board and to plain white on the page where a player decides how much to stake. A visitor cannot learn "gold means my money" because gold is never there when their money is. It also makes 3,000 and 3K look like two different figures on two screens in the same session.

*Critic's fix:* Pick one money treatment and apply it everywhere a TZS figure appears: one abbreviation rule (full grouping under 10K, K/M above, or full grouping throughout — either is fine, one of them), and the gilt token for the numeral in every pool, stake, balance and payout. Then remove gold from everything that is not money or brand (see the results-board finding).

*Verifier:* Opened detail__s01.png (KIASI tile, sampled #f5f8ff white, 'TZS 3K'), markets__s01.png (same market — the S!TE 2026 card, and the detail route in detail.json is /markets/mkt_37fa3fb7d2b5cc32f672 — 'TZS 3,000' sampled #899dd1) and home__s00.png ('TZS 29K' sampled #f3cb7a). The title is false on its own terms: TZS 3K and TZS 3,000 are the same number, not 'a different number'. And the third leg collapses on inspection — home__s00.png labels the gold 29K 'FEDHA ZILIZOWEKWA' directly under '32 MASOKO YALIYO WAZI', i.e. the site-wide staked total across 32 open markets. It is not this market's pool, so 'three renderings of the one quantity' is simply wrong; two of the three are different quantities. What survives is that a card's inline meta row abbreviates and mutes while the detail page's dedicated stat tile groups and whitens — a hierarchy difference between a secondary meta slot and a primary stat tile, which is normal, plus a genuine but minor 3K/3,000 formatting inconsistency. Nowhere near a high defect.

#### CP-003 · ✅ upheld · 🟡 medium taste · `results__s00.png`
**Gold is spent three times on chrome on one screen, and never on the money** — routed to: **U38**

*Seen:* On this single screen gold appears as: the "IMETATULIWA · NDIO" status pill, a filled gold plate (#d6ae5a) with dark-brown text; the "MATOKEO MASHUHURI" crown glyph; and both pager arrow rings, drawn in #f3cb7a — the exact hex the home hero uses for the money figure. On results__s01–s04 the same board's gold-filled "IMEKAMILIKA" pill sits at the top-left of every card, so the loudest colour on the board is a status label. The money on those cards — "TZS 5,500", "TZS 1,000", "TZS 5,000" — is grey-blue #899dd1. On detail__s02.png the chart's 50% baseline chip is also #f3cb7a.

*Why it matters:* Gilt is the product's scarcest asset and the one thing a player would recognise with the logo cropped off. Spent on a pager arrow, a crown, a status chip and a chart baseline, it stops meaning anything — and the thing it was reserved for is left in the dullest ink on the card. The results board ends up shouting "SETTLED" in gold at a player who came to see how much was won.

*Critic's fix:* Demote the settled/featured chips to the neutral or outcome ink with an outline rather than a gold fill, and make the pager arrows the standard control stroke. Return #f3cb7a to money and to the brand needle only, and let it appear on the pool figure so the board's gold reads as the payout, not the paperwork.

*Verifier:* Opened results__s00.png and sampled every object named. The 'IMETATULIWA · NDIO' pill is a gold gradient (#c79f49-#efc775) with #2e1b00 dark-brown text; the 'MATOKEO MASHUHURI' crown glyph is #f3cb7a; the pager arrow ring is #f3cb7a — the exact hex I sampled for the hero money figure on home__s00.png. Meanwhile the money on results__s01-s04 ('TZS 1,000', 'TZS 5,000') sampled #899dd1, the same muted periwinkle as the board cards. Opened results__s02.png and results__s03.png and confirmed the gold-filled 'IMEKAMILIKA' pill at the top-left of every card. This directly contradicts the design sheet's guardrail 4 ('Gilt stays reserved for money and brand', test:gold-is-money), so the observation is real and correctly measured. Keeping the critic's own taste classification rather than escalating, and keeping medium: it is a palette-allocation call, nothing is illegible or wrong.

#### CP-004 · ✅ upheld · 🟡 medium defect · `results__s00.png`
**The results donut has a third segment nobody named, and its legend doesn't add up to the count beside it** — routed to: **D42**

*Seen:* The ring at the top of /results is drawn in three colours — sampled #42c070 mint, #ff6e70 salmon, and a periwinkle #899dd1 arc of roughly 50 degrees from about 10:30 to 12 o'clock. The legend to its right names two: "NDIO 59 · HAPANA 88". 59 + 88 = 147. Two hundred pixels below, the same screen's tab strip states "masoko 171". So ~24 markets are painted into the ring, occupy a seventh of it, and are never named anywhere on the screen.

*Why it matters:* This ring is the first graphic a player meets on the settled board and the only summary of the platform's history. A silent grey wedge on a settlement chart, on a licensed gambling product, is the shape people read as "the ones that went missing" — and here the arithmetic on screen invites exactly that reading. Whatever those 24 are (void, refunded, cancelled), leaving them unlabelled turns an integrity story into a suspicion.

*Critic's fix:* Add the third category to the legend with its count and its own word ("BATILI 24" or whatever the domain term is), so the three arcs and the three labels match and the three numbers sum to the 171 stated directly below.

*Verifier:* Opened results__s00.png and traced the ring by angle at three radii. Green #42c070 runs 0-125 deg, salmon #ff6e70 runs 126-310 deg, periwinkle #899dd1 runs 311-360 deg — a 49-degree arc from about 10:22 to 12 o'clock, exactly as described. The ratios are not approximate, they are exact: 125/185/49 deg = 34.7/51.4/13.6%, and 59/88/24 of 171 = 34.5/51.5/14.0%. The legend beside the ring reads 'NDIO 59 · HAPANA 88' (147), and the same frame shows 'Zote 171' and 'masoko 171' about 190 CSS px below. So 24 markets are painted into a seventh of the ring and named nowhere on the screen. Every number the critic quoted checks out against the pixels. Severity and kind confirmed as stated.

#### CP-005 · ✅ upheld · ⚪ low taste (claimed medium/defect) · `login__s01.png`
**The page's own legal strip is restated by the global footer 60px later** — routed to: **U20**

*Seen:* The login page ends with a centred mono strip: "18+ · LESENI YA GBT · MSAADA 0800 11 0011". About 60 CSS px below it, past the plum divider, the global footer opens with an 18+ roundel, the 50pick lockup, "Imepata leseni kutoka Bodi ya Michezo ya Kubahatisha ya Tanzania", the licence number, and further down "Simu ya msaada · 0800 11 0011". The same three facts, twice, in two different compositions, inside one screen. help__s02.png shows the identical stack with its own strip ("18+ · Cheza kwa busara · Bara la Tanzania + Zanzibar pekee") sitting directly on top of the same footer.

*Why it matters:* The phone design sheet's rule 5 is one composition per job, and this is the same job done twice, adjacent, in different type. It reads as two teams shipping the same compliance line without seeing each other's work — which is precisely the "assembled, not designed" impression the owner is trying to shake. It also weakens the compliance message itself: a duty-of-care line repeated in two voices looks like boilerplate rather than intent.

*Critic's fix:* Delete the per-page mini legal strips. The global footer already carries 18+, licence, helpline and the responsible-play line — make it the single home for that content, and if a page needs the 18+ mark above the fold, use the roundel alone, not a second sentence.

*Verifier:* Opened login__s01.png. The strip '18+ · LESENI YA GBT · MSAADA 0800 11 0011' and the footer's 18+ roundel, 'Imepata leseni kutoka Bodi ya Michezo ya Kubahatisha ya Tanzania', 'Leseni: OUS00000202602' and 'Simu ya msaada · 0800 11 0011' are both present in that one frame, so the duplication is real. But two load-bearing details are wrong. I scanned the column at x=360: the strip sits at image y=237 (118 CSS) and the divider at image y=476 (238 CSS), with the footer's first fact at ~280 CSS — about 160 CSS px below the strip, not 60. And the divider sampled #e7c176, gold, not 'plum'. The corroborating frame also fails: help__s02.png's strip reads '18+ · Cheza kwa busara · Bara la Tanzania + Zanzibar pekee' — only '18+' overlaps the footer at all, so it is not 'the identical stack'. Duplicated compliance copy is also a defensible legal choice, not an error, so this is low taste at most.

#### CP-006 · ❌ refuted · ⚪ low taste (claimed medium/taste) · `updown__s00.png`
**Up & Down is a different product with the same top bar** — routed to: **— not routed**

*Seen:* Nothing on this screen belongs to the visual system the other eight surfaces share. There is no green-to-red tipping rail and no gold needle anywhere on the page — the device that appears on the home hero, every home card, every markets card, the live hero, every live card and every results card is simply absent from an entire game. Money is in USD ("$75,824.01"), set in mint green on updown__s01.png, where TZS is blue or white or gold elsewhere. The round history is a strip of twelve small green/red arrow chips, a graphic device that exists nowhere else in the product. The section eyebrow says "MUBASHARA" in grey caps while a red-dot "MUBASHARA" pill sits 200px below it in the price bar — the same word, two treatments, one screen.

*Why it matters:* Crop the top bar out of updown__s00.png and markets__s00.png and no one would guess they are the same company. For a product that is being asked to feel like one designed thing, the second game reads as a bought-in widget wearing the house chrome. It also wastes the strongest asset: the needle is the brand mark, and a game literally about a value crossing a line is where it would work hardest.

*Critic's fix:* Rebuild the round pod around the house rail: the strike price as the needle's line, the current price as the needle, green above / red below — the same object as the market rail, doing the job it was designed for. Bring the TZS money treatment and the house gilt to the stake and payout rows, and retire the arrow-chip strip in favour of the rail at a small size.

*Verifier:* Opened updown__s00.png and updown__s01.png. The opening sentence — 'Nothing on this screen belongs to the visual system the other eight surfaces share' — is falsified by the frame itself: the shared top bar, the brand needle mark, the red-dot MUBASHARA ticker (identical to home__s00, leaderboard__s00, help__s00), the bottom rail, the 'VICHUJIO' filter control that is the same object as markets__s01's 'Vichujio', the segmented Raundi/Chati pill that is the same object as leaderboard__s00's Zote/Masoko tabs, the same card material/radius, the same mono eyebrow labels, and the same 'MATOKEO BAADA YA' countdown label that detail__s01.png uses. updown__s01.png even carries the same dotted no-bets ruler used on live and markets cards. 'Money is in USD' is misleading: $75,824.01 is the Bitcoin reference price; the same card states its pool as 'JUMLA TZS 0', and the mint green on it is the up/positive colour beside '+0.01%'. The absent tipping rail follows from the game having no YES/NO crowd split to plot — there is no data for that device here. And the 'same word, two treatments' pair is 130 CSS px apart, not 200, and both are grey mono caps; the second merely adds a live dot. Existing Up & Down issues are already D7/D10/D11/D36/D37.

#### CP-007 · ✅ upheld · ⚪ low taste (claimed medium/taste) · `updown__s02.png`
**A fixed ~920px footer eats a third to a half of the shorter pages** — routed to: **U20**

*Seen:* The plum divider that opens the footer lands at roughly 127 CSS px into this frame, i.e. about y=1687 of a 2607px document — so 920 CSS px, about 35% of the whole Up & Down page, is footer. The same 920px block appears unchanged on every route: on leaderboard__s01.png it opens right after the six-row table and accounts for about 43% of that 2129px page; on help__s02.png the same. The footer is the same height on a 2.7-screen page as on the 11-screen home.

*Why it matters:* On the short surfaces the last thing a player sees before the page ends is not the product — it is a flat, undesigned list of eighteen links with no gilt, no rail, no needle and no panel material. The identity survives the hero and then thins into a directory, and on /updown and /leaderboard the directory is longer than the thing it is attached to. That is exactly where an 11-screen page and a 2.7-screen page should behave differently.

*Critic's fix:* Give the footer two states. Keep the full directory at the bottom of the long marketing surfaces (home, help); on the app surfaces (updown, leaderboard, live, results, detail) collapse to a compact band: brand lockup, 18+, licence, helpline, and a single "Zaidi" disclosure that expands the rest. The saving is roughly 600px per app page.

*Verifier:* The arithmetic is exact and I reproduced it. Scanning updown__s02.png I found the gold divider at image y=254 = 127 CSS; updown.json gives docH 2607 and vh 780, and s02 is the third of four frames (scrollY 1560), so the divider lands at doc y=1687 and the footer is 920 CSS px = 35.3% of the page. leaderboard__s01.png: divider at image y=860 = 430 CSS, scrollY 780, doc y=1210 of docH 2129, footer 919px = 43.2%. Both of the critic's figures are right to the pixel. Downgraded to low taste because the finding is structurally circular: a global footer is constant by definition, so its share of a page is purely a function of how short the page is, and the block is compliance, responsible-gaming and legal navigation that regulators expect on every route. 'The footer is the same height on a 2.7-screen page as on the 11-screen home' is a description of what a footer is, not a defect.

#### CP-008 · ✅ upheld · ⚪ low taste (claimed medium/taste) · `markets__s01.png`
**The pinned bar guillotines the loudest objects on the board with no fade and no elevation** — routed to: **U4**

*Seen:* The discovery bar ends in a hairline at about y=171 CSS. Ten CSS pixels below it, the previous card's NDIO and HAPANA buttons are sliced horizontally through the middle of the letterforms — "NDIO @ 50%" and "HAPANA @ 50%" appear with their top halves missing, in full-saturation #008336 and #d02b31, hard-edged. There is no scrim, no fade, no shadow and no background change between the bar and the sliced buttons, so the half-buttons read as objects belonging to the toolbar. With 237px of pinned chrome on /markets and /results this recurs at essentially every scroll position (markets__s03.png, markets__s04.png, results__s02.png all show the same cut).

*Why it matters:* This is not the strip-fade/count collision already logged — it is the seam itself. The two saturated buttons are the loudest things in the entire palette, and the design lets them be chopped in half and left floating under a transparent bar. On a board a player thumbs through for minutes, the eye keeps catching a broken-looking object at the top of the viewport, which does more to make the product feel unfinished than any single misalignment lower down.

*Critic's fix:* Give the pinned bar a 24px bottom fade mask to bg-base (the `.kp-strip-fade` treatment already exists for the strip), or an elevation shadow plus an opaque ground, so scrolled content dissolves into the chrome rather than being cut. Either reads as intent; the hairline does not.

*Verifier:* Opened markets__s01.png and cropped the band at image y=300-420. The previous card's NDIO and HAPANA buttons are cut horizontally through the letterforms — 'NDIO @ 50%' and 'HAPANA @ 50%' with their top halves gone, hard-edged, in the full-saturation fills I sampled as #008336 and #d02b31 — with no scrim, fade or shadow between them and the discovery bar. markets.json confirms the sticky discovery bar (top 56, h 116, bottom 172 CSS) and pinnedPx 237, and I confirmed the same cut on results__s02.png. So the frame shows what was described. Downgraded to low: an opaque sticky toolbar clipping whatever scrolls under it is ordinary sticky behaviour, not a malfunction; 'the half-buttons read as objects belonging to the toolbar' is the critic's reading, and a fade is an enhancement rather than a repair. Note D1 already records a related fade problem on the status strip.

#### CP-009 · ✅ upheld · ⚪ low taste (claimed medium/taste) · `detail__s01.png`
**The page spends its heaviest type on two identical countdowns and states the same date three times** — routed to: **U8**

*Seen:* Two countdown grids are stacked in one panel: "UCHAGUZI UNAFUNGWA BAADA YA" reading 36 / 13 / 02 / 38, and "MATOKEO BAADA YA" reading 40 / 13 / 02 / 38 — eight boxed numerals at roughly 34 CSS px, identical in size, border, radius and spacing, so neither reads as more important. Above them a separate "INAISHA" tile states "27 Oct 2026, 00:00", and the second countdown's own sub-line states "27 Oct, 00:00" again — the same moment printed twice in two formats within 250 CSS px, plus a third time as a ticking clock.

*Why it matters:* The design sheet names the signature moments that keep their scale on phones: the hero headline, the YES/NO buttons, the 28px market title, the win seal, the needle. A countdown is not on that list, yet it takes eight boxes of the largest numerals on the page and outweighs the title it sits under. The result is a detail page whose loudest statement is an administrative timestamp, repeated.

*Critic's fix:* Keep one countdown at full scale — the one that changes what a player can do, the close — and demote the settlement time to a single line of label text with its date. Drop the separate INAISHA tile, which the settlement line already says.

*Verifier:* Opened detail__s01.png. Both countdown grids are there — 'UCHAGUZI UNAFUNGWA BAADA YA' 36/13/02/38 and 'MATOKEO BAADA YA' 40/13/02/38 — eight boxed numerals at the same size, border, radius and spacing, and the 'INAISHA' tile above reads '27 Oct 2026, 00:00' while the second countdown's sub-line reads '27 Oct, 00:00'. So the equal-weight problem and one date printed twice in two formats are both visible. But 'two identical countdowns' is embellished: they count to different moments (36 days to 23 Oct vs 40 days to 27 Oct), which is exactly why there are two, and the first countdown's own sub-line reads '23 Oct, 00:00', not 27 — so the 'same date three times' is really 27 Oct twice plus its own ticking clock. That leaves a hierarchy preference, not a defect: low taste.

#### CP-010 · ✅ upheld · ⚪ low taste (claimed medium/taste) · `home__s11.png`
**The loudest colours in the entire product are three other companies' logos** — routed to: **U20**

*Seen:* The last screen of the 11-screen home page opens with Instagram's pink-orange gradient glyph, TikTok's cyan/magenta note and WhatsApp's saturated green disc, all at full brand colour, side by side on the royal ground. Nothing else in the 44 frames is a multi-hue saturated object — the house palette is royal blue, one gold, one green, one red. The same row repeats at the top of the footer on every route (markets__s08.png, live__s08.png, results__s06.png, updown__s02.png, detail__s05.png), so every page in the product ends on it. WhatsApp's green also sits within a few degrees of the NDIO green used for outcomes.

*Why it matters:* Every page hands its final colour statement to three other brands. In a system this disciplined about its ink — one gold, one green, one red, each with a job — importing three foreign colour systems at the end of every scroll is the single loudest inconsistency in the product, and it is the last thing a player sees before leaving.

*Critic's fix:* Set the three social glyphs as monochrome marks in the footer link ink, with the platform name as the label. They are recognisable by silhouette; they do not need their brand colour to be tappable, and the row reads as part of the page for the first time.

*Verifier:* Opened home__s11.png — the frame does open on the Instagram gradient glyph, the TikTok note and the WhatsApp disc at full brand colour, and I confirmed the same row at the top of the footer on login__s01.png, help__s02.png and updown__s02.png. I sampled the WhatsApp disc at #25d366 (hue 142) against the NDIO #42c070 (hue 145), so 'within a few degrees' is accurate. Downgraded because the supporting absolute is false: 'Nothing else in the 44 frames is a multi-hue saturated object' is contradicted by the 50pick needle mark itself — a saturated green/red split disc sitting in the top-left of all 44 frames — and by the three-colour results donut. 'Loudest colour in the product' is rhetoric about three ~28px glyphs. Rendering third-party marks in their own brand colours is standard practice and frequently required by those brands' guidelines, so this is a low taste note, not a defect.

#### CP-011 · ❌ refuted · ⚪ low taste (claimed medium/taste) · `live__s01.png`
**The live feed spends its boldness in the first screen and nothing for the next eight** — routed to: **— not routed**

*Seen:* live__s00.png opens strongly: a big glowing tipping rail, teal live accents, a clear CTA. From live__s01.png to live__s08.png — roughly eight screens — the feed is near-identical cards in which the rail is replaced by a flat dotted grey ruler and the line "Bila dau bado". Across the six /live frames the real green-to-red rail appears only three times (the hero, one 83% card on live__s02.png, one 100% card on live__s04.png). Every other card carries the dotted placeholder, which is the same graphic the product uses for skeleton-like empty states on markets__s03.png.

*Why it matters:* The page is called Mubashara — live — and after one screen it is eight screens of grey rulers saying nothing is happening. Through the identity lens the problem is not the emptiness, it's that emptiness was given the flattest possible mark: the one proprietary graphic in the system withdraws exactly where the page needs to look alive, and what replaces it looks like content that failed to load.

*Critic's fix:* Give the no-bets state a designed mark rather than an absent one — the rail drawn at rest, centred needle, desaturated to ~25%, with "Kuwa wa kwanza kutabiri" as its label — so the card still reads as the same object and the feed keeps one continuous visual line down eight screens. And sort at least a few cards with real positions into the top of the feed.

*Verifier:* Opened live__s01.png, live__s02.png and live__s03.png. The dotted ruler cards are there, and live__s02.png does carry the real 83% rail, so the critic looked at the right pixels. But the conclusion does not follow from them: every dotted card is captioned 'Bila dau bado' — no bets yet — so there is no crowd split to plot, and the rail appears precisely where there is data. This is a seeded-data condition of the capture, not a design decision. Worse, the implied remedy is the product's own catalogued defect: D29 records that resolved/void cards with no bets wrongly state an invented 'YES 50%' with a centred needle. Drawing a rail with no bets behind it is the bug; declining to is the fix. The critic is penalising the one screen that gets this right. 'Same graphic the product uses for skeleton-like empty states' is also hedged into meaninglessness — it is the no-bets state, deliberately.

#### CP-012 · ✅ upheld · ⚪ low taste · `markets__s04.png`
**The card watermark is a 1% contrast smudge — decoration that does no work** — routed to: **U3**

*Seen:* Each market card carries a large category glyph watermark in its lower right, behind the pool figure and the countdown. Sampled at normal contrast it is #070659 against a card ground of #050357 — a delta of 2/3/2 across RGB, roughly 1% luminance. It is not legible as a shape; it registers only as faint mottling under the money row. Boosting contrast 4x reveals a full football glyph that no player will ever see. The same near-invisible treatment appears on the home cards and on the /results cards.

*Why it matters:* Meanwhile the decorative backgrounds elsewhere are all different devices — a diagonal band and blown-up needle on the home hero (home__s00.png), a scales glyph behind the detail title (detail__s00.png), a circle-and-needle watermark on the help hero (help__s00.png), wave contours on login (login__s00.png). So the decorative layer is five unrelated ideas, one of which is below the threshold of vision. That is the difference between a system and a pile of individual screen decisions.

*Critic's fix:* Pick one decorative device — the needle-in-circle, which is the mark — and use it at one scale and one opacity as the house watermark. On cards, either raise it to a visible 4–6% and place it where nothing sits on top, or remove it: at 1% it is cost with no image.

*Verifier:* Verified by measurement on markets__s04.png. In a clean band of the first card the ground varies only between about (4,1,81) and (7,6,88) — a delta of roughly 3/5/7 across RGB, the same order of magnitude the critic quoted. I isolated the near-ground pixels and normalised them, and a complete football glyph resolves in the lower right behind the meta row, exactly as claimed; it is invisible at normal contrast. Accurate on every point. It stays low taste: invisible ornament costs nothing, obscures nothing and harms no reading — the only charge is that it is wasted effort. One small slip: on markets__s04.png the cards read 'Hakuna bwawa bado', so there is no pool figure for it to sit behind on this particular frame.

#### CP-013 · ✅ upheld · ⚪ low taste (claimed low/defect) · `help__s00.png`
**Icon plates change accent colour row to row with no rule** — routed to: **U39**

*Seen:* In the /help contact column, three structurally identical rows carry three differently coloured icon plates: the phone plate has a teal border and teal glyph, the mail plate immediately below has a blue border and blue-white glyph, and the chat plate below that returns to teal. On help__s01.png the responsible-play plate in the same column is green. Four accent colours down one column of rows that differ only in their label.

*Why it matters:* Small, but it is the tell. When identical components in one list carry four different accents, the reader's eye keeps looking for the meaning of the colour and there isn't one. Repeated across a product, this is what makes a careful design read as assembled — and /help is where an anxious player goes.

*Critic's fix:* One accent for the whole column (the teal used for the primary contact), or a rule the user can learn: teal for channels that reach a human, green for safety tools. Either is fine; four with no rule is not.

*Verifier:* Opened help__s00.png and sampled all three plates: phone plate border #124c66 with a #7fe2ba mint glyph; mail plate border #3041a2 with a #b5cfff blue-white glyph; chat plate border #025177 with a #64d0d1 cyan glyph. So three structurally identical contact rows do carry three different accents — in fact the critic undercounted, since the two 'teals' are not the same teal either. Corrected from defect to taste and held at low for two reasons: nothing is illegible or misleading, it is token allocation; and the fourth colour is oversold — the green plate on help__s01.png is 'Kucheza kwa busara' in a separate responsible-play card one screen down, where green is the standing safety accent, not a fourth arbitrary choice 'down one column of rows that differ only in their label'.

#### CP-014 · ✅ upheld · ⚪ low taste (claimed low/defect) · `leaderboard__s00.png`
**The silver tier is printed in the money gold** — routed to: **D44**

*Seen:* The stat panel reads "DARAJA LA JUU" followed by "Fedha" — silver — set in #f3cb7a, the same gold as the hero's money figure and the results pager rings. One screen lower, the actual tier badges beside the podium names are metallic: a grey "S" on @Dhiresh and @Libuhi, a bronze "B" on @Jaykishan. So the tier system has its own metals, and the headline naming the silver tier is gold.

*Why it matters:* A leaderboard's whole job is legible rank, and the metals are the fastest rank signal there is. Painting "silver" gold at the top of the page contradicts the badges it is summarising, and it spends the house gilt on a third non-money job on a third surface.

*Critic's fix:* Set the tier name in its own metal — silver for Fedha, gold for Dhahabu, bronze for Shaba — matching the badge palette already used beside the names, and keep #f3cb7a off it unless the tier actually is gold.

*Verifier:* Opened leaderboard__s00.png and sampled 'Fedha' after 'DARAJA LA JUU': #f3cb7a, identical to the hero money figure on home__s00.png and to the results pager rings on results__s00.png. One screen lower the podium badges are indeed metallic and different — a grey S on @Dhiresh and @Libuhi, a bronze B on @Jaykishan. So the observation holds as pixels. Corrected from defect to taste and kept low: the gold here is the panel's stat-value accent shared with the adjacent '26.8%' slot rather than a tier medal, and 'Fedha' in Swahili carries both 'silver' and 'money', so a gold value is not the flat contradiction the title implies. It is a token-consistency nit worth one line in the palette pass, nothing more.

### Typography — 13 claims, 8 kept

#### CP-015 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `results__s02.png`
**The settled outcome word is painted green whether the market resolved NDIO or HAPANA** — routed to: **D29 (U32)**

*Seen:* On the middle card ("Je, fainali ya US Open Men's Singles 2026…") the outcome is set as "TOKEO" over a large mono "HAPANA". I sampled the glyph fill: rgb(66,192,112). That is the identical green used for the "NDIO" outcome on the card below it and on results__s03 — I sampled both and got 66,192,112/113. Everywhere else in the product HAPANA is red: the HAPANA button fill on markets__s00 is rgb(208,43,49) and the "50% HAPANA" label on live__s00 is a pink-red rgb(255,214,210). On this frame the sentiment bar above the word is also full green, so the reader sees green bar + green word on a market that resolved NO.

*Why it matters:* The product spends every other screen teaching one ink pair — green is YES, red is NO — and then breaks it on the one screen where the answer is final and money has already moved. A player scanning the results board reads the colour before the word; on this card colour and word say opposite things, and the colour is the one that is wrong. It is the cheapest possible way to make a real-money platform look like it does not know its own result.

*Critic's fix:* Ink the settled outcome with the same YES/NO tokens the buttons use: NDIO green, HAPANA red. Reserve the neutral "resolved" green for the status chrome (the IMEKAMILIKA pill), not for the outcome word itself.

*Verifier:* Verified in the file. On results__s02 the middle card's display word HAPANA samples rgb(66,192,112); on results__s03 the NDIO display word samples rgb(66,192,112) — pixel-identical, not merely 'similar'. The contradiction is also real: the HAPANA button fill on markets__s00 samples exactly rgb(208,43,49), the live__s00 '50% HAPANA' label is pink-red, and the ticker running across every frame sets HAPANA in red. So the product's own YES=green / NO=red ink is inverted in the one place it states the settled result. The sentiment bar above it is indeed full green with the needle hard right. I checked the brief: not D29 (that is about invented 'YES 50%' on no-bet cards), not D39 (raw enum text). New. Correcting severity down from high: nothing factually wrong is displayed — the word literally reads HAPANA, and the same card repeats 'HAPANA' twice more in text — so this is a colour-semantics collision that misleads on a scan, not a wrong outcome. Medium.

#### CP-016 · ❌ refuted · ⚪ low taste (claimed high/defect) · `results__s02.png`
**A results card says the outcome four times, in four sizes and two different verbs, while the question itself is clamped and truncated** — routed to: **— not routed**

*Seen:* One card carries the same fact four times: the gold pill "IMEKAMILIKA", the display "TOKEO / HAPANA", the outlined button "Imekamilika HAPANA", and the footer "Imetatuliwa HAPANA". Two different Swahili verbs (imekamilika / imetatuliwa) for one event, 380 image px apart. Measured cap heights on this frame (halved to CSS): HAPANA 20.5 → roughly 28px type; the market question 11.5 → roughly 16px; button label ~14px; "TZS 1,000" and "Imetatuliwa HAPANA" ~12px; "MICHEZO" and "TOKEO" ~10–11px. That is six type sizes in one card against the phone design sheet's limit of three (15 title · 28 % · 11–13 labels). The largest, boldest thing on the card is a repeated status word; the market question is the smallest full-size text and is cut mid-title at "Men's Singles 2026…".

*Why it matters:* The card spends its whole type budget restating a one-word status and starves the only line a player actually needs to read — what was asked. On a 360px screen that trade is visible immediately: the eye lands on HAPANA, then has to hunt for a truncated question to find out what HAPANA refers to. It also puts this card two sizes over a rule the team has already written down, so every future card inherits the drift.

*Critic's fix:* Keep one statement of the outcome — the inked word beside the question — and drop the button and footer repeats to a single quiet timestamp line. Give the question the 15–16px title rung and three lines instead of two; that alone removes the mid-word truncation. Settle on one verb (imetatuliwa) across chip, card and footer.

*Verifier:* Opened results__s02 and measured. The count is wrong: the outcome word HAPANA appears three times (display, button, footer), not four — the gold pill says IMEKAMILIKA, which is the status, not the outcome. The type-size case misreads the sheet it invokes. Measured ink heights (image px, halve for CSS): HAPANA display 41 (~28px type — that IS the sheet's 28 rung), title 30 incl. descender / ~24 cap (~16px — the 15 title rung), button label 21 (~14px, a control token, not card type), 'TZS 1,000' 16, 'Imetatuliwa HAPANA' 16, 'MICHEZO' 16, 'TOKEO' 14 — the last four all sit in or one notch under the sheet's '11–13 labels' band. That is the three-rung scheme plus a 14px control label, not 'six sizes against a limit of three'. 'The market question is the smallest full-size text' is false: at ~16px it is the second-largest thing on the card and larger than every label. The two-line clamp on a list card with a Maelezo link to the full title is standard, not a defect. The only surviving kernel — imekamilika vs imetatuliwa for one event — is a minor copy nit that does not carry the claim as written.

#### CP-017 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `updown__s00.png`
**Letter-spaced uppercase labels are wide enough in Swahili that they wrap and then ellipsise — the label truncates instead of the content** — routed to: **— not routed**

*Seen:* Inside the round card, the status label under the title reads "TUNASOMA BEI YA / KUFUNGA… · BTC" — an uppercase tracked mono micro label that has wrapped onto two lines and then been cut with an ellipsis, so the reader is left with a half-sentence. The same pattern appears on live__s00, where the carousel label reads "LILILO NA SHAKA…" beside the 1/6 pager. On updown__s01 this exact string is shown a third way — as a pill "TUNASOMA BEI YA KUFUNGA…", still ellipsised — and then in full as plain sentence-case sans directly beneath it ("Tunasoma bei ya kufunga kutoka chanzo.").

*Why it matters:* Tracking adds roughly 8–10% to a string's width, and uppercase adds more; Swahili strings are already 35–40% longer than the English these labels were sized for. The result is that the label system fails exactly where it is doing real work — telling a player why a live price is not yet settled. A truncated status in a money game reads as a bug, and the same message appearing three ways in two screens tells the reader nothing is authoritative.

*Critic's fix:* Stop putting sentences in the tracked-uppercase rung. Reserve it for one- and two-word labels (BITCOIN, JUMLA, SIKU) and set anything longer in sentence-case sans at the 12–13px label rung, where it fits on one line at 360. Where the same status already appears as a sentence below, delete the label copy entirely.

*Verifier:* Refuted at 3x magnification. On updown__s00 the label renders as 'TUNASOMA BEI YA / KUFUNGA… · BTC' — text CONTINUES after the ellipsis on the same line. No truncation mechanism can do that: text-overflow:ellipsis requires nowrap (so it cannot be on line two), and -webkit-line-clamp ellipsises only at the end of the clamped line, with nothing after it. The '…' is a literal character in the copy — a 'reading the closing price…' progress affordance. updown__s01 confirms it: the same string sits in a pill as 'TUNASOMA BEI YA KUFUNGA...' with ~128px of empty card to its right, so it is not hitting any box edge either, and the same card's resolved sibling shows the non-progress state as plain 'IMEKAMILIKA · BTC' with no ellipsis. 'LILILO NA SHAKA…' on live__s00 ends well clear of the pager button. The reader is not left with a half-sentence; they get the whole phrase plus a deliberate in-progress mark.

#### CP-018 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `detail__s01.png`
**Money has no single typographic identity — the same figure is TZS 3K here and TZS 3,000 on the board** — routed to: **U38**

*Seen:* The KIASI stat tile on this frame sets the pool as "TZS 3K" in white bold sans. The same market's card on markets__s01 sets it as "TZS 3,000" in dim mono, and the home hero on home__s00 sets its total as "TZS 29K" in gold mono. So one product renders currency in three faces (bold sans, mono, gold mono), two colours plus gold, and two number formats (abbreviated K, grouped thousands) — and here it abbreviates a four-digit figure into "3K" inside a tile that is 150 CSS px wide with room for "TZS 3,000" several times over.

*Why it matters:* In a financial interface the money figure is the one element that must be instantly recognisable as money, in the same clothes, everywhere. A player who opens a card showing TZS 3,000 and lands on a page showing TZS 3K has to stop and decide whether those are the same number. Lossy abbreviation on a figure that fits is the worst version of this: it destroys precision to save space that was never needed.

*Critic's fix:* Define one money style — mono tabular figures, one weight, one colour — and one format rule (group thousands below 1,000,000; abbreviate only above it). Apply it to the hero totals, the stat tiles and the card footers so the same amount is set identically on every surface.

*Verifier:* Verified across three frames. detail__s01's KIASI tile reads 'TZS 3K' in white bold sans; markets__s01 carries the same market (S!TE 2026, NDIO 67%, which detail__s01's criteria panel names) with 'TZS 3,000' in dim mono; home__s00's hero sets 'TZS 29K' in gold mono. Same pool, two strings. Trimming the critic's framing: the 'three faces / two colours' half is weak — those are three different components (hero stat, stat tile, card footer) each internally consistent, which is normal typographic hierarchy, not a fault. And the K here is lossless (3,000 → 3K), so no precision is lost. What survives is a real money-formatting inconsistency worth one rule, not a system failure. Low.

#### CP-019 · ✅ upheld · ⚪ low taste (claimed medium/defect) · `home__s04.png`
**On every market card the money figure is the dimmest text in its row and the countdown is the brightest** — routed to: **U38**

*Seen:* In the footer row of the first card, "TZS 18,000" is rgb(137,157,209) and "siku 2 zimebaki" beside it is rgb(198,209,236) on a card ground of rgb(6,3,85) — roughly 6.8:1 versus 12:1. Both are the same mono at the same size (I measured 8.5–9 CSS px of digit height for each), so the only difference is that the pool has been deliberately dimmed below the countdown. The same ranking repeats on the card below ("TZS 4,000" / "siku 75 zimebaki") and on every card on markets__s00 through markets__s04.

*Why it matters:* The pool is the number that tells a player whether a market is worth entering; the countdown is context. Right now the type system says the opposite, and it says it on the most repeated object in the product. Combined with the fact that gold — the colour the design sheet reserves for money — never appears on these figures, money is the one thing on the card with no visual claim on the eye.

*Critic's fix:* Swap the two contrasts: give the pool the brighter foreground token (and the gold money ink, which is what that token is for), and drop the countdown to the muted one. No size or layout change needed.

*Verifier:* Sampled home__s04 and every number the critic quoted is exact: 'TZS 18,000' = rgb(137,157,209), 'siku 2 zimebaki' = rgb(198,209,236), card ground rgb(6,4,87); the second card repeats it at (133,153,205) vs (191,202,229). Same mono, same size, so the pool is deliberately on the muted token while the countdown is on the default foreground. But the defect framing does not hold: I computed the contrast and the dim figure still lands around 5.5–7:1 on its ground — comfortably past WCAG AA — so nothing is unreadable. 'The pool should outrank the countdown' is a hierarchy preference; the design sheet reserves gilt for money but nowhere says money must be the brightest ink in a row. Real, consistent, and worth a house decision — but taste, and low.

#### CP-020 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `login__s00.png`
**Gilt is spent on eyebrows and step numbers, so it no longer means money** — routed to: **— not routed**

*Seen:* On the sign-in card the only gold on screen is the tracked uppercase eyebrow "INGIA", on a page with no money on it at all. The same gold is used on detail__s01 for two label rows ("UCHAGUZI UNAFUNGWA BAADA YA", "MATOKEO BAADA YA") while the actual money figure on that frame, "TZS 3K", is plain white rgb(245,248,255) — I sampled both (gold rgb(243,203,122)). It is also used on home__s02/s03 for the step numerals 01/02/03, on results__s00 for the "IMETATULIWA · NDIO" pill and the pager arrows, and on detail__s00 for the eyebrow rule.

*Why it matters:* The design sheet reserves gilt for money and brand, and there is a guard named for it. As used today gold marks at least five unrelated jobs, which means it marks nothing — the reader cannot use it as a signal, and the one place it would pay for itself (the pool figure, the win amount) does not get it. A colour that means five things is a decorative tint, not a system.

*Critic's fix:* Pull gold off eyebrows, step numerals, status pills and pagination — those go to the muted label token. Return it to currency figures and the brand mark only, and let the gold-is-money check actually fail when it is used elsewhere.

*Verifier:* Every sighting is real — I sampled login__s00's 'INGIA' eyebrow at rgb(243,203,122) exactly as claimed, detail__s01's two countdown headers are gold while 'TZS 3K' is white, home__s02/s03 set 01/02/03 in gold, results__s00 carries a gold 'IMETATULIWA · NDIO' pill, gold pager arrows and a gold crown, detail__s00 a gold eyebrow and hairline — but the conclusion is falsified by the critic's own evidence. home__s00's hero sets the headline money figure 'TZS 29K' in gold mono, which he cites himself in claim 4. Gold still marks money in its primary slot. And the rule he invokes reads 'Gilt stays reserved for money AND BRAND': the gold slash-plus-eyebrow device (the '/' before TANZANIA · DAR ES SALAAM on home__s00 and before BWAWA KUBWA KWANZA on home__s03) is the brand eyebrow system, explicitly permitted. Only the /results pager arrows are hard to defend as brand, and that is one control's outline.

#### CP-021 · ✅ upheld · 🟡 medium defect · `detail__s01.png`
**Dates are set with English month abbreviations on the Swahili-default page, beside Swahili months in the prose** — routed to: **U40 dates**

*Seen:* This one frame carries "27 Oct 2026, 00:00" in the INAISHA panel, "23 Oct, 00:00" and "27 Oct, 00:00" in the two countdown headers — and, in the resolution-criteria panel at the bottom of the same frame, the body prose reads "(iliyofanyika Oktoba 23–25,". So the machine-formatted dates say Oct and the human-written sentence four inches below says Oktoba, on a page whose every other word is Swahili.

*Why it matters:* This is the default language for a visitor who has chosen nothing, and the dates are the part of the page a player checks before committing money — when a market opens, when it settles. English month stubs sitting inside Swahili sentences tell the reader the translation is a veneer over an English product, which is precisely the impression a market operating in Tanzania cannot afford.

*Critic's fix:* Pass the active locale to the date formatter (Okt / Nov / Des in SW) rather than defaulting to en. Then make the two countdown headers share one setting — right now the first puts its label on its own line with the date beneath, and the second runs label and date on one line.

*Verifier:* All four strings are on detail__s01 exactly as described: 'INAISHA / 27 Oct 2026, 00:00', the two countdown headers '23 Oct, 00:00' and '27 Oct, 00:00', and the criteria prose '(iliyofanyika Oktoba 23–25,'. Swahili abbreviates Oktoba as 'Okt', never 'Oct'. And the evidence is stronger than the critic knew: detail__s00 — the top of this same route — renders the market title with 'Okt 23–25', so the human-authored copy uses the Swahili abbreviation while the machine formatter on the same page emits the English one. live__s00 likewise carries 'Des 1–13'. So the date formatter, not the copy, is the outlier, and it is systemic across every date field on a Swahili-default product. Genuine localization defect; medium stands.

#### CP-022 · ✅ upheld · 🟡 medium defect · `login__s00.png`
**"Umesahau nenosiri?" is set as the dimmest, smallest micro-label on the form, indistinguishable from a caption** — routed to: **D48**

*Seen:* Under the password field, the recovery action reads "UMESAHAU NENOSIRI?" in uppercase tracked mono at roughly 11px, right-aligned, with no underline and no link colour — I sampled its brightest pixel at rgb(119,136,184), dimmer than the field hint "Angalau herufi 8." directly above it at rgb(135,155,208). Every genuine link elsewhere in the product is teal sentence-case with a chevron ("Maelezo ›") or plain sans underlined (detail__s02).

*Why it matters:* A locked-out player on a phone is looking for exactly this one control, and it has been given the typographic treatment the system uses for inert labels — smaller, dimmer and flatter than the hint text beside it. It also sits at roughly an 11px cap on a dark ground, which is the least legible thing on the screen for the older half of the audience.

*Critic's fix:* Set it in the link style the rest of the product uses — sentence case, sans, the teal link token, at the 13–15px rung — and left-align it under the field it belongs to so it reads as an action rather than a footnote.

*Verifier:* Sampled login__s00 and both numbers are exact: 'UMESAHAU NENOSIRI?' brightest pixel rgb(119,136,184), the static field hint 'Angalau herufi 8.' directly above it rgb(135,155,208). It is uppercase tracked mono, right-aligned, no underline, no link ink — the same style the form uses for its non-interactive labels SIMU and NENOSIRI. The comparison holds too: detail__s02 sets its real links as underlined sans ('Onyesha maandishi asili ya Kiingereza') and an underlined mono URL, and card links are teal 'Maelezo ›'. So the one interactive text control on the sign-in form is the only thing on screen wearing the label style, and it is dimmer than the static text beside it — an affordance inversion on account recovery. Contrast is still ~5.3:1, so it is legible, not invisible; medium/defect is right.

#### CP-023 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `markets__s00.png`
**The pinned discovery bar mixes four type voices in 116px of chrome that never leaves the screen** — routed to: **— not routed**

*Seen:* Inside the sticky bar: the search placeholder "Tafuta soko" is tracked monospace; the tab labels "Wazi" and "Zinafunga leo" are sans-bold with their counts ("32", "0") set in mono at a smaller size; the right-hand summary "masoko 32" is entirely lowercase mono; the two controls beneath, "Pesa nyingi" and "Vichujio", are sentence-case sans. Directly above, the header stat line "MASOKO ● 32 hai · TZS 29K katika mchezo" is tracked mono running as a sentence. That is four type treatments plus a mono sentence stacked in the 237px of chrome that index.json records as pinned on this route.

*Why it matters:* This strip is the most-seen furniture in the product — it is fixed above the board on /markets and /results for their entire 8.8 and 6.3 screens. With no single voice it reads as four widgets bolted together rather than one instrument, and the mono placeholder in particular makes the search field look disabled or pre-filled rather than tappable. The mono "masoko 32" also restates the count already inside the "Wazi 32" tab.

*Critic's fix:* Pick one voice for the bar: sans for anything a finger acts on (placeholder, tab labels, control labels), mono tabular only for the numerals that sit beside them. Delete the duplicate "masoko 32" summary — which also removes the collision the plan tracks as D1.

*Verifier:* The claim contradicts itself (116px, then 237px) and both readings fail against the evidence. index.json records /markets pinned as three separate items: topbar h=56, '.kp-discovery-bar' h=116, rail h=65 — pinnedPx 237 is the sum, so the 237 figure includes the top app bar and the bottom rail, neither of which holds anything the critic listed. And markets__s01 — the scrolled frame on the same route — shows exactly what the 116px bar contains once the page moves: the tab row (Wazi 32 / Zinafunga leo 0 / masoko 32) and the control row (Pesa nyingi ⌄ ↓ / Vichujio ⌄). The search field 'Tafuta soko' and the header stat line 'MASOKO ● 32 hai · TZS 29K katika mchezo' have both scrolled away. So two of the five voices he counts are not in the chrome that 'never leaves the screen'; what stays is mono plus sans in two weights.

#### CP-024 · ✅ upheld · ⚪ low defect · `help__s02.png`
**Phone numbers are grouped one way on one line and another way on the next** — routed to: **U40 list**

*Seen:* Two lines apart in the same footer list: "Wasiliana nasi · 0769777877" — ten digits with no grouping at all — and "Simu ya msaada · 0800 11 0011", grouped 4-2-4. On help__s00 the first number is the headline figure of its contact card, set in 20px bold sans, still as one ten-digit run. The login form on login__s00 sets its phone placeholder as "712 345 678", grouped 3-3-3 — a third pattern.

*Why it matters:* An ungrouped ten-digit string is materially harder to read back, hold in memory and dial correctly, and this is a support line — the number a player reaches for when something has gone wrong with their money. Three grouping patterns across three screens also makes the contact details look transcribed rather than designed.

*Critic's fix:* Adopt one national grouping (0769 777 877 / 0800 110 011) and apply it in the footer, the help cards and the login placeholder. Set all three in tabular figures so the digit runs align when they stack.

*Verifier:* Verified on help__s02: 'Wasiliana nasi · 0769777877' as an unbroken ten-digit run sits two lines above 'Simu ya msaada · 0800 11 0011' grouped 4-2-4. help__s00 confirms the third data point — the same number is the headline of the TUPIGIE card, bold sans, still ungrouped — and login__s00 sets its placeholder '712 345 678' as 3-3-3. Three patterns for one kind of datum. Mild mitigation the critic skipped: 0800 11 0011 is a toll-free shortcode whose conventional grouping legitimately differs from a mobile MSISDN, so only the ungrouped ten-digit run is clearly wrong. Low, and it is a real copy defect rather than a preference.

#### CP-025 · ❌ refuted · ⚪ low taste (claimed low/defect) · `home__s03.png`
**Letter-spacing is applied to the two-digit step numerals, so "02" reads as "0 2"** — routed to: **— not routed**

*Seen:* The two step markers on this frame render as gold numerals with a visible gap inside them: "0 2" above "Kila matokeo yana chanzo kilichotajwa" and "0 3" above "Washindi wanagawana bwawa", each followed by a hairline rule. The same happens to "0 1" on home__s02. The gap between the two digits is the same width as the tracking on the neighbouring uppercase labels, so it is the label letter-spacing being inherited by a numeral.

*Why it matters:* Tracking is meant for uppercase words; inside a number it breaks the figure into two, and a reader glancing at a three-step explainer sees "0 2" rather than the second step. It is small, but it is precisely the kind of detail a professional critic reads as evidence that the type rules were applied by class rather than by judgement — and this is the page's flagship explainer.

*Critic's fix:* Zero the letter-spacing on the step numeral (it is a figure, not a label) or drop the leading zero entirely and set 1 / 2 / 3. Keep the tracking on the uppercase eyebrow beside it.

*Verifier:* I cropped home__s03 at 6x and home__s02. The gap is real but tiny — roughly 3 CSS px between the two glyphs of an ~11px tracked mono numeral, which is the same tracking carried by the neighbouring uppercase label 'BWAWA KUBWA KWANZA' in the identical style. That is the house tracked-mono label voice applied consistently to a decorative step marker, not an inherited-style bug: nothing here distinguishes 'inherited by accident' from 'set deliberately, like every other micro label'. At 6x the pair still reads as 02, one number; the claim that it 'reads as 0 2' does not survive looking at it. Decorative chrome, no data at risk.

#### CP-026 · ✅ upheld · ⚪ low taste (claimed low/defect) · `live__s04.png`
**Market titles have no house style for figures — the same quantity appears as a word on one card and a symbol on the next** — routed to: **E-420**

*Seen:* First card: "Je, mfumuko wa bei wa Tanzania (NCPI) utazidi asilimia 3.5 mwezi Septemba 2026…". Third card, two cards below it: "Je, kiwango cha mfumuko wa bei Tanzania (NCPI) kitashuka chini ya 3.5% mwezi Septemba 2026…". The same quantity — 3.5 percent — is spelled out as "asilimia 3.5" on one and set as "3.5%" on the other, in the same feed, in the same type. The dates behave the same way: live__s02 carries "Sept 19–21, 2026", "20 Septemba 2026" and "Septemba 18–20, 2026" within one screen.

*Why it matters:* These two cards are the same index, opposite directions — a player comparing them has to translate between two notations to see that. Percent, date and currency notation is where an editorial product earns its authority; a feed that changes notation card to card reads as a queue of operator submissions rather than an edited board, and this is the surface the plan lists as 8.7 screens of continuous scrolling.

*Critic's fix:* Write a two-line figure style for market titles (percent always as the symbol; dates always as "18 Septemba 2026"; ranges with an en dash) and enforce it at market creation, so the board sets consistently without anyone re-typing existing titles by hand.

*Verifier:* Both strings are on live__s04, two cards apart: 'utazidi asilimia 3.5 mwezi Septemba 2026' on the first UCHUMI card and 'kitashuka chini ya 3.5% mwezi Septemba 2026' on the third. Same quantity, same feed, same type. live__s02 confirms the date half within one screen: '(Sept 19–21, 2026)', 'tarehe 20 Septemba 2026', and '(Septemba 18–20, 2026)'. Correcting the kind: this is authored market content, not the typographic system — the type treatment is identical on every card and it is the copy that varies, so it is an editorial style-guide gap for whoever writes/generates market questions, not a rendering defect. Low.

#### CP-027 · ✅ upheld · ⚪ low taste (claimed medium/taste) · `home__s00.png`
**The monospace voice has grown past labels into running Swahili prose** — routed to: **U39**

*Seen:* Below the sentiment bar, the caption "76% NDIO · 24% HAPANA — kila soko lililo wazi, kwa uzito wa fedha zilizowekwa" is set in tracked monospace and wraps to two full lines of sentence text. The ticker above it does the same ("TZS 5K imekamilika HAPANA kwenye…"), as does the market list's "Hakuna dau bado" — tracked mono, but sentence case, sitting directly under three uppercase tracked mono labels (MASOKO YALIYO WAZI / FEDHA ZILIZOWEKWA / UTABIRI ULIO WAZI). On later frames the same voice carries "Kuwa wa kwanza kutabiri" (markets__s03), the source line on updown__s01 and the licence line on help__s02.

*Why it matters:* Monospace with added tracking gives every letter the same width and every gap a similar size, which is exactly what you want for a column of figures and exactly what you do not want for connected Swahili text, where word shape is the thing the eye reads. At 12–13px on a dark ground it slows the sentence measurably, and because the same face carries both the labels and the sentences, the reader loses the cue that tells label from statement. I am calling this taste rather than a fault because it is a coherent house choice, defensible as a 'data voice' — but it has clearly spread beyond the job it was chosen for.

*Critic's fix:* Draw the boundary explicitly: monospace for numerals, codes, countdowns and one- or two-word labels; sentence-case sans at the 13px rung for anything with a verb in it. That single split would fix the caption, the ticker, the empty-state lines and the source line without adding a size.

*Verifier:* Confirmed on home__s00: '76% NDIO · 24% HAPANA — kila soko lililo wazi, kwa uzito wa fedha zilizowekwa' is tracked mono, sentence case, wrapping to two full lines, directly under three uppercase tracked mono labels (MASOKO YALIYO WAZI / FEDHA ZILIZOWEKWA / UTABIRI ULIO WAZI), and the ticker above runs the same voice. The supporting sightings check out too — 'Kuwa wa kwanza kutabiri' in mono on home__s02's card, the source/licence lines on updown__s01 and help__s02. The critic correctly filed this as taste and it is: mono running text is a deliberate house voice, the wrap is clean, nothing truncates or collides, and no rule in the design sheet restricts mono to labels. Worth a voice decision; low.

### Colour and theme — 12 claims, 9 kept

#### CP-028 · ✅ upheld · 🟠 high defect · `results__s02.png`
**The settled outcome word is printed in the YES green even when the outcome is HAPANA** — routed to: **D29 (U32)**

*Seen:* On the middle card ("Je, fainali ya US Open Men's Singles 2026…") the outcome block at the top right reads "TOKEO" over "HAPANA" at ~40px, and the word HAPANA is #42C070 — the exact same green as the word NDIO on the cards in results__s03.png and results__s04.png, and the same green as the "83%" NDIO figure on the market cards. Directly beneath it the odds bar runs solid green from edge to edge with the gold needle parked at the far right. The only red anywhere on that card is nothing at all. results__s03.png shows the mirror case: "TOKEO / NDIO" in the same green sitting over a bar that is red from end to end.

*Why it matters:* Green/red is the only binary signal this product has, and on a board of 171 settled markets it stops distinguishing YES from NO and starts meaning 'this one is finished'. A player scrolling results on a phone reads the colour before the word; here the colour says NDIO on a card that resolved HAPANA. It is also the one place colour touches an outcome that decided money.

*Critic's fix:* Colour the outcome token by side, not by state: #42C070 for NDIO and the existing NO ink (#FF9795 on card ground) for HAPANA. If the intent was to signal 'settled', leave the token white (#F5F8FF) and let the gold IMEKAMILIKA chip carry settledness on its own — it already does.

*Verifier:* Opened results__s02.png: the middle card's outcome block reads TOKEO / HAPANA and the word samples #42C070 — byte-identical to the NDIO word on results__s03.png and to the '83%' NDIO figure on home__s04.png. The odds bar beneath it is green at every x I sampled (x=70 #027938 through x=620 #209849), no red anywhere, gold needle at the far right. results__s04.png repeats it on a second card ('Je, Coventry City…' TOKEO/HAPANA, same green, same all-green bar), so it is systematic, not a one-off. The mirror is real too: results__s03.png's Man Utd card says TOKEO/NDIO in the same green over a bar that is red end to end. Two embellishments: the word is ~28 CSS px not '~40px' (cap height 45 image px — the critic doubled), and the sentence 'the only red anywhere on that card is nothing at all' is garbled. Neither touches the substance. Not in the D1–D41 brief; D29 is about invented 'YES 50%' on unbet cards, a different thing. This breaks §8a rule 4 ('the YES/NO inks keep their meaning') on the largest element of every settled card, and the bar contradicts the outcome at the same time, so a glance reads a lost NO as a won YES.

#### CP-029 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `results__s02.png`
**Gilt has migrated off money onto status and eyebrows, inverting test:gold-is-money** — routed to: **U38**

*Seen:* On this one card the "IMEKAMILIKA" chip is a solid gold fill (#D6AE5A with a #A17833 border and near-black text) while the pool figure on the same card, "TZS 1,000", is the quiet periwinkle #899DD1. Gold #F3CB7A also carries: the home section numerals 01/02/03 (home__s03.png), the "INGIA ILI KUTABIRI" eyebrow (detail__s00.png), "UCHAGUZI UNAFUNGWA BAADA YA" and "MATOKEO BAADA YA" (detail__s01.png), the chart's 50% reference chip (detail__s02.png), "MATOKEO MASHUHURI" and its crown plus both pagination rings (results__s00.png), and the "INGIA" eyebrow on login__s00.png. None of those is money and none is the brand needle.

*Why it matters:* §8a rule 4 reserves gilt for money and brand, and a player learns that rule in about four screens. Once gold also means 'settled', 'section 2' and 'page forward', the eye no longer finds money by colour — which is the one thing a real-money product should never make people hunt for. On this card the status chip is the loudest object and the amount at stake is the quietest.

*Critic's fix:* Make gilt a money-only token. Move the eyebrows, ordinals and pager rings to the mono label colour #899DD1, and give the settled chip a neutral fill (the #4963B3 pill border over the card ground reads as a chip without borrowing gold). Then hand the gold back to the pool figure.

*Verifier:* I sampled all nine sites and every one landed on the nose. IMEKAMILIKA chip on results__s02.png is a gold gradient fill (#F2CA79 top → #C79F4A bottom, #D6AE5A mid) with an #A17833 border and near-black text, while the pool on the same card, TZS 1,000, is #899DD1. Gold #F3CB7A exactly: home__s03.png numerals 01/02/03, detail__s00.png 'INGIA ILI KUTABIRI', detail__s01.png 'UCHAGUZI UNAFUNGWA BAADA YA' and 'MATOKEO BAADA YA', detail__s02.png 50% reference chip, login__s00.png 'INGIA'; results__s00.png carries the crown, 'MATOKEO MASHUHURI', both pagination rings and a second gold 'IMETATULIWA · NDIO' chip. Where I push back: the guardrail reads 'gilt stays reserved for money AND BRAND', so kickers and section numerals in the brand gilt are defensible as brand accent, which thins the 'nine violations' framing to a handful. What survives cleanly is the inversion the critic names first — on a single card the status chip is the loudest object in solid gold and the money is the dimmest thing on it. Real, but medium, not high.

#### CP-030 · ✅ upheld · 🟡 medium taste (claimed high/defect) · `home__s04.png`
**The money figure is the dimmest thing in the card footer, and money has four different colours across the product** — routed to: **U38**

*Seen:* In the footer of the Mwanza card, "TZS 18,000" is #899DD1 — the same colour as the mono metadata labels "MASOKO", "Hakuna bwawa bado" and the comment count. The words beside it, "siku 2 zimebaki" (days left), are the brighter #C6D1EC, and the loudest thing in the row is the navigation link "Maelezo" in teal #36BABA. So in one 60px row the hierarchy runs: Details > countdown > the pool. Across surfaces the same quantity takes four inks: TZS 29K is gold #F3CB7A on home__s00.png, the identical TZS 29K is white #F5F8FF on markets__s00.png, TZS 5K is #C6D1EC in the ticker, and the Up & Down price is green on updown__s01.png.

*Why it matters:* The pool is the reason to open the card — it is the size of the prize. Painting it below the countdown and below a 'Details' link teaches the eye to skip it, and the same figure changing colour between the home hero and the board header makes it read as two different kinds of number rather than one.

*Critic's fix:* One money token, applied everywhere a TZS or $ figure appears: gilt #F3CB7A at card-label size. Demote "Maelezo" from teal to the body colour with the chevron carrying the affordance, so the loudest thing in the footer is the amount.

*Verifier:* The footer hexes on home__s04.png are exact: 'TZS 18,000' #899DD1, 'siku 2 zimebaki' #C6D1EC, 'Maelezo' #36BABA — money is the dimmest ink beside the countdown. The cross-surface split is real and is the strongest part: the same TZS 29K is #F3CB7A gold on home__s00.png and #F5F8FF white on markets__s00.png. But the claim is embellished twice. 'In one 60px row' is false — I measured Maelezo at image y=679 against the money row at y=600, a separate row ~39 CSS px lower, so the 'Details > countdown > pool' hierarchy is not one row. And the fourth ink fails: updown__s01.png's green $75,824.01 sits directly above a green '+0.01%' delta, so that green is the price-direction ink, not a money ink (the actual money on that card, 'JUMLA TZS 0', is white). So it is three inks, not four. There is also no rule that money must be gold — test:gold-is-money reserves gold FOR money, it does not require money to be gold — so this is a hierarchy preference, not a broken guardrail.

#### CP-031 · ❌ refuted · ⚪ low taste (claimed high/defect) · `live__s00.png`
**"Live" is red and teal on the same screen, 165px apart** — routed to: **— not routed**

*Seen:* At the top, the ticker strip shows a #ED4A49 red dot beside "MUBASHARA". Immediately below it, the hero card's live badge is a teal #36BABA ring beside "HAI", and the teal continues into the carousel arrows and the active pagination dot. markets__s00.png shows the same split on one screen the other way round: the header's "32 hai" dot is teal #65D2D2 while the card below carries a maroon MUBASHARA chip with a red dot.

*Why it matters:* Both words mean live, and the two markers sit inside one thumb-scroll of each other. A reader trying to learn 'what does the coloured dot mean' gets two contradictory answers on the first screen of the page named Mubashara. It also spends the one hue — red — that the product needs for HAPANA.

*Critic's fix:* Pick one live token and apply it to the ticker dot, the MUBASHARA chip dot, the HAI ring and the board header dot. Teal is the better choice: it leaves red free for NO, and teal is already carrying liveness on /live and /markets.

*Verifier:* The pixels are right and the conclusion is wrong. On live__s00.png the ticker dot is #ED4A49 and the hero badge ring is #36BABA; on markets__s00.png the header dot is #65D2D2 and the card chip is a #431151 maroon with an #ED4A49 dot. But the two colours are not two treatments of one concept — they mark two different words that mean two different things. Teal carries 'hai' (market open/active) and red carries 'MUBASHARA' (the event is being played live). markets__s00.png proves the split is meaningful rather than accidental: the header says '32 hai' while only some of the 32 cards carry a MUBASHARA chip, so the two cannot be the same population. Colouring two distinct states differently is the system working. The '165px apart' is also image pixels; the real gap is ~82 CSS px, the doubling the brief warns about.

#### CP-032 · ✅ upheld · ⚪ low taste (claimed medium/defect) · `home__s00.png`
**Red carries four unrelated meanings, three of them within the top 180px** — routed to: **no-owner**

*Seen:* In the first 90 CSS px of this frame: a #ED4A49 dot meaning 'live', the word HAPANA in #FF6E70 meaning 'NO', and under the whole strip a solid wine hairline #7C2F4C used as a decorative rule (the same rule repeats between every home section — home__s03.png at image y=1160 — and above the footer on detail__s04.png). Elsewhere red is also the 18+ ring (detail__s04.png) and the maroon MUBASHARA chip fill. Counting the inks, the red family is seven distinct values: #D02B31, #CA4147, #FF9795, #FF6E70, #ED4A49, #A42E48, #7C2F4C.

*Why it matters:* A dark theme has very few high-chroma slots and this product has spent its scarcest one four ways. The section rule is the worst of them: a wine hairline is the strongest colour on an otherwise neutral divider, so a purely decorative line reads at a glance as a warning or a loss boundary.

*Critic's fix:* Make the section rule a neutral border token (#213480 at the same 1px, or a transparent-to-#4963B3 fade if the gradient is wanted). Move the live dot to teal per the previous finding. That leaves red doing two related jobs — NO and 18+ — which is defensible.

*Verifier:* Verified on home__s00.png: within image y=132–177 (CSS 66–88) there is a #ED4A49 dot meaning live, 'HAPANA' in #FF6E70 meaning NO, and at y=176 a flat #7D2F54 wine hairline running the full width as a rule — three red meanings inside the first 90 CSS px, as claimed. The wine rule repeats as a section divider on home__s03.png at y=1160 (#7C2F4C at every x I sampled). One supporting instance is simply wrong: I scanned detail__s04.png row by row and the rule above the footer is at y=1196 and is a red→GOLD gradient (#67274E at x=65, #E7BF76 at centre, #57214B at x=665) — a different treatment, not the wine rule. The 18+ ring there is also #9B0D23, an eighth value the seven-value list omits. And each red use sits beside a word that disambiguates it (live dot next to MUBASHARA, HAPANA spelled out, 18+ inside its own ring), so nothing is misread — this is palette discipline, not a failure.

#### CP-033 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `markets__s00.png`
**The graphic band under the odds bar renders at 1.05:1 and cannot be seen** — routed to: **D49**

*Seen:* On the Mwanza card, between the green/red bar and the "3 watabiri" avatar row, there is a band roughly 490–515 CSS px down the frame whose fill is #091061 against the card's #07065C. That is a luminance ratio of 1.05:1. Zoomed 3× it resolves into a wedge with a straight sloping top edge — an area shape carrying some trend — but at 1× on a phone the row reads as empty space. The same band appears on home__s04.png and on the settled cards of results__s01.png.

*Why it matters:* It is a graphic that reserves about 25 CSS px of height on every priced card on two boards and delivers nothing. On a phone in Dar daylight it is not faint, it is absent — so the card pays the vertical cost of a chart and shows no chart.

*Critic's fix:* Either raise it to a visible wash — the YES ink at ~10% over a slightly darkened plot ground gets it past 3:1 against the card fill — or delete it and give the 25px back to the card, which several known defects (D33, D35) are already fighting for.

*Verifier:* This one measures out precisely. On markets__s00.png the band under the Mwanza card's bar runs image y=980–1026 (CSS 490–513, exactly the range claimed) and samples #091162/#091061 against the card's #07065C/#06065B — I computed the WCAG ratio at 1.058:1. It is a wedge, not a rectangle: at x=620 the band is absent except for a 4px sliver at y=1020, so it has a sloping top edge as described. I could just barely perceive it in the 1x render, so 'cannot be seen' is a shade strong, but at 1.06:1 on a phone it is effectively invisible and whatever trend it encodes is unreadable. Correcting severity down: it is a decorative sparkline, nothing else on the card depends on it, and no user is misinformed — a dead ornament rather than a broken control.

#### CP-034 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `detail__s01.png`
**Nested surfaces share one fill and one 1.59:1 hairline, so elevation does no work** — routed to: **no-owner**

*Seen:* The "UCHAGUZI UNAFUNGWA BAADA YA" panel and the eight digit boxes sitting inside it both fill with #07045A — measured identical — and both are outlined in #213480. Against that fill a #213480 edge is 1.59:1. The stat tiles above (KIASI / WATABIRI) use the same fill and the same edge, and on detail__s04.png the "Ingia ili kutabiri" control has no fill at all, so a 1.59:1 hairline is the only thing that says 'this is a button'.

*Why it matters:* Everything on the page is the same material at the same depth, so the eye gets no help deciding what contains what, and a control whose only boundary sits at 1.59:1 is below the 3:1 floor for non-text UI — in bright light or on a cheap panel the sign-in button stops looking like a button. It is also the reason the detail page feels flat rather than layered despite having five distinct panels.

*Critic's fix:* Introduce one real step: keep the outer panel at #07045A and drop the nested boxes to the page ground (#080029) so the wells read as recessed. Raise control and panel borders to the pill token #4963B3, which measures 3.15:1 on #07045A and is already in the system on the filter chips.

*Verifier:* Every number checks out, including one my first coarse scan nearly disproved. On detail__s01.png the countdown panel fill and the eight digit-box fills are both #07045A, measured identical. The digit-box border is #213480 (x=73 at y=760; y=672–673 at x=137) and the panel's own border is also #213480 at x=32–33 / y=542–543 — the #131164 I first hit at x=34 is the inner glow, not the border. The KIASI/WATABIRI tiles use the same #07045A fill and #213480 edge. I computed #213480 on #07045A at 1.590:1, matching the quoted figure to three digits. detail__s04.png confirms the payoff: 'Ingia ili kutabiri' fills #07045A, identical to the panel behind it, with only the #213480 hairline as its boundary — under WCAG 1.4.11's 3:1 for a control boundary. Docking it though: 'elevation does no work' is overstated, since the digit boxes and tiles are plainly legible in the 1x render, and the button's bright white bold label identifies it regardless of the edge.

#### CP-035 · ✅ upheld · 🟡 medium defect · `results__s00.png`
**The results donut has a third, unlabelled segment identified by colour alone** — routed to: **D42**

*Seen:* The ring beside "MATOKEO" is drawn in three arcs: green, coral, and a lavender-grey arc of roughly 14% at the top left. The legend next to it reads only "NDIO 59 · HAPANA 88", with the two words tinted to match their arcs. The board header on the same frame says 171 markets; 59 + 88 = 147, so 24 markets live in the grey arc and are named nowhere on the page.

*Why it matters:* A fifth of the ring is information the reader cannot decode, and what it most likely represents — void or refunded markets — is exactly the category a real-money player needs named. It is also the only chart in the product that puts a value on screen with no label at all.

*Critic's fix:* Add the third term to the legend with its count ("Batili 24"), tinted to the arc, and give the arc a deliberate neutral rather than a leftover lavender. If the third category is not worth naming, do not draw it.

*Verifier:* I walked the ring on results__s00.png degree by degree at r=33 from its centre (398,278). Three arcs, no more: #42C070 for 124° (34.4%), #FF6E70 for 182° (50.6%), and #899DD1 lavender-grey for 49° (13.6%). The arithmetic lands exactly on the critic's reading — 59/171 = 34.5%, 88/171 = 51.5%, 24/171 = 14.0% — so the donut is drawn on the 171 denominator while the legend beside it names only 'NDIO 59 · HAPANA 88'. Twenty-four markets occupy a visible arc that is never named anywhere on the page, and the grey is not even a legend colour, so it is identified by nothing at all rather than by colour alone. Severity stands at medium: it is a small header ornament, but an incomplete legend on a summary of settled outcomes is a real omission, not a preference.

#### CP-036 · ❌ refuted · ⚪ low taste (claimed medium/taste) · `markets__s03.png`
**The board is the only surface using flat fully saturated fills, and it stacks 30 of them** — routed to: **— not routed**

*Seen:* Two cards are visible, each carrying a #008336 NDIO block and a #D02B31 HAPANA block at full opacity, about 140×44 CSS px each. Both cards state "Bila dau bado" and "Hakuna bwawa bado" — nothing has been priced — yet the pair is at exactly the same intensity as on the 83% card in markets__s00.png. Nothing else in the entire product is a flat saturated fill: every other surface is low-chroma navy with a 1px border. The comparison is on live__s02.png, where the identical fact is stated as "NDIO @ 83%" in green and "HAPANA @ 17%" in red as tinted labels on the card ground, and the board reads calm and legible.

*Why it matters:* With 15 cards on the board, that is 30 saturated blocks down one column. They out-shout the market question, which is the actual content, and because every card gets the same pair at the same intensity the colour carries no information at all — a market with no liquidity looks exactly as urgent as one with 83% conviction and TZS 18,000 in it. This is where the dark theme goes from disciplined to a lightshow.

*Critic's fix:* Take the /live treatment onto the board, or keep the buttons but drop them to a tinted fill — the ink at 12–14% over the card with the full ink for text and border — and reserve the solid fill for the primary action inside the bet sheet, where a single saturated block would then actually mean something.

*Verifier:* The load-bearing premise is false. 'Nothing else in the entire product is a flat saturated fill' fails on the same frame: the Jisajili header button on markets__s03.png samples a flat #3351D1, as does 'Fungua soko →' on live__s00.png; the IMEKAMILIKA chip on results__s02.png is a solid gold fill, the MUBASHARA chip on markets__s00.png a solid #431151, and detail__s02.png carries a solid green 67% chip and a solid gold 50% chip. Flat saturated fills are the product's button and chip language, not a board anomaly. The comparison is also apples to oranges: the markets__s03.png blocks are the bet CTAs (I measured 143.5 × 39.5 CSS, not 140 × 44), while live__s02.png's 'NDIO @ 83%' is a compact list card with no CTA at all — it reads calmer because it has no buttons to render, not because it tints them. 'Stacks 30 of them' is not visible in the frame either; four blocks are.

#### CP-037 · ✅ upheld · ⚪ low defect · `leaderboard__s00.png`
**The Silver tier is printed in gold, and the podium expresses only first place in metal** — routed to: **D44**

*Seen:* The stat panel reads "DARAJA LA JUU Fedha" with "Fedha" (Swahili for silver) in #F3CB7A — the identical gold as the crown, the #1 avatar ring and the "1" badge on the podium immediately below. Meanwhile the tier chip beside @Dhiresh on the same frame is a genuine grey silver "S" and @Jaykishan's is a bronze "B", so the component already owns a metal language. On the podium, the #2 and #3 avatar rings are the identical pale blue — neither silver nor bronze — while #1 gets the full gold ring and glow.

*Why it matters:* The one word on the page naming the top tier is coloured as the wrong metal, next to chips that get the metals right, so the leaderboard contradicts itself inside one card. And a podium where second and third are rendered identically loses the only thing a podium exists to show.

*Critic's fix:* Give the tier word its own metal token (silver #C7CEDB, bronze #B07A3E, gold #F3CB7A) and drive both the word and the chip from it. Ring the #2 and #3 avatars in silver and bronze so the ladder reads at a glance without the numerals.

*Verifier:* Opened leaderboard__s00.png and sampled it. 'Fedha' in the DARAJA LA JUU panel is #F3CB7A, the same gold as the crown. The podium rings: #1 is #E0B762 gold, and #2 and #3 are both #C6D1EC — byte-identical to each other and to no metal at all. Meanwhile the tier chips on the same frame are a genuine grey #585C69 'S' and a bronze #5C4121 'B', so the component demonstrably already owns silver and bronze inks and the podium declines to use them while the tier name takes the wrong metal. Small surface and nothing breaks, so low is the right severity, but it is a factual inconsistency inside one component rather than a preference.

#### CP-038 · ✅ upheld · ⚪ low taste (claimed low/defect) · `help__s00.png`
**Three sibling contact rows use three different icon-plate materials and hues, one of them the YES ink** — routed to: **U39**

*Seen:* "TUPIGIE" carries a mint-green phone glyph on a dark inset plate with a green border; "BARUA PEPE" carries a periwinkle envelope on a royal-bordered plate filled with the card colour; "MAZUNGUMZO YA MOJA KWA MOJA" carries a teal chat glyph on a dark inset plate again. Three equals in a vertical stack, three plate fills and three hues. help__s01.png repeats it: every FAQ icon is royal except the "Kucheza kwa busara" shield, which is green.

*Why it matters:* The colour differences imply a distinction that does not exist — these are three ways to reach the same support desk. The green one is the worse half of it: green is the YES ink and the win colour, so it lands on a phone number and on the responsible-gambling shield, where it reads as endorsement rather than category.

*Critic's fix:* One plate material and one hue for the whole row (the royal plate already used for BARUA PEPE), with the channel distinguished by its glyph and label only. Keep green out of support and safer-gambling surfaces entirely.

*Verifier:* The three plates on help__s00.png do sample three different fills — TUPIGIE #0B1F5E, BARUA PEPE #161B75, MAZUNGUMZO #05115F — with three glyph hues, so the structural observation holds, and help__s01.png repeats it (every FAQ glyph royal except the green 'Kucheza kwa busara' shield). But the headline's dramatic clause is false: the phone glyph is #7FE2BA mint, not the NDIO green (#42C070 text / #008336 fill), so no YES ink is involved. The critic's own body text also undercuts the headline — it calls the third plate a 'dark inset plate again', which is two materials, not three. And the one deliberate deviation, the green safety shield, is a conventional and defensible semantic. A tidy-up, not a fault.

#### CP-039 · ❌ refuted · ⚪ low taste · `home__s11.png`
**Third-party brand colour is the highest-chroma object in the product, and one of them is the YES green** — routed to: **— not routed**

*Seen:* The footer's first row renders the Instagram mark in its full magenta-to-orange gradient, the TikTok mark with its cyan and magenta fringes, and the WhatsApp mark as a saturated green disc. Nothing else on any of the 44 frames is that chromatic. The "Chanzo ↗" link on detail__s00.png and the 18+ mark on detail__s04.png are, by contrast, drawn as flat monochrome glyphs in the product's own inks.

*Why it matters:* Three foreign palettes land in the quietest zone of the page and pull the eye to the least important links on it. The WhatsApp disc is the specific problem: it is the same green family as the YES ink, so a green circle appears in a product where a green circle has been taught to mean NDIO.

*Critic's fix:* Draw all three marks as monochrome glyphs in the footer link colour #C6D1EC at the same optical weight as the other footer icons. Platform brand guidelines all permit a single-colour version, and the row reads as one family instead of three.

*Verifier:* home__s11.png does render Instagram in its gradient, TikTok with cyan/magenta fringes and WhatsApp as a saturated disc — but the disc samples #25D366, which is WhatsApp's own brand green, not this product's YES green (#42C070 text, #008336 button fill). The second half of the title is therefore wrong, and it is the half that would have made this a finding rather than an observation. The first half is conventional practice and frequently a brand-usage requirement: third-party marks are supposed to be rendered in their own colours, and the contrast the critic draws with 'Chanzo ↗' and the 18+ mark is a contrast with the product's own glyphs, which is exactly the distinction a reader needs. Nothing to fix.

### Layout and density — 12 claims, 11 kept

#### CP-040 · ✅ upheld · 🟠 high defect · `results__s02.png`
**The settled outcome word is painted YES-green whether the market resolved NDIO or HAPANA** — routed to: **D29 (U32)**

*Seen:* On this frame the card "Je, fainali ya US Open Men's Singles 2026…" carries the label TOKEO and, beneath it, the word HAPANA set large in the same green used for NDIO — sitting directly above a price bar that is 100% green with the needle pinned to the far right. On results__s03.png the mirror case appears twice: TOKEO / NDIO, also green, above a bar that is 100% red with the needle at the far left. Across results__s01, s02, s03 and s04 every outcome word is the identical green, six instances, both outcomes. Yet on results__s00.png the header legend on the same page prints "NDIO 59" in green and "HAPANA 88" in red, and the ticker above it prints HAPANA in red.

*Why it matters:* This is the screen where the platform announces who was right and whose money moved. The product teaches red = HAPANA on every button, chip, bar and ticker, then uses green for the word HAPANA at the largest size on the card. A player glancing at the board reads green-and-large as "yes / win" and has to stop and re-read the letters to learn it means the opposite. Colour is carrying no information here and is actively contradicting the rest of the system.

*Critic's fix:* Tint the outcome word with the outcome's own ink — NDIO in the YES green, HAPANA in the NO red — and let the neutral gold "IMEKAMILIKA" chip carry the "settled" meaning it already carries. If a single colour is wanted for "settled", use the neutral/gilt one, never the YES ink.

*Verifier:* Opened results__s00/01/02/03/04 and sampled the pixels. The outcome word under TOKEO is exactly rgb(66,192,112) in EVERY instance I sampled — HAPANA on s02 (US Open), HAPANA on s01 (Dar es Salaam), HAPANA on s04 (Coventry), NDIO on s03 (two cards). That value is not a generic 'settled' accent: it is byte-identical to the ink of 'NDIO 67%' and the 'NDIO' label on markets__s01, i.e. the literal YES ink. On the same /results page the header legend prints NDIO in rgb(113,215,144) green and HAPANA in rgb(255,151,149) red, and the ticker prints HAPANA in rgb(255,110,112) red. So one page codes HAPANA red in the legend and green — the YES ink — in the result. This breaks §8a guardrail 4 ('the YES/NO inks keep their meaning'). One embellishment, which does not change the verdict: on results__s03 the 'mirror case' (green NDIO over a 100%-red bar) appears ONCE, not twice — the upper card there has a green bar. Not in D1–D41.

#### CP-041 · ✅ upheld · 🟡 medium defect · `results__s02.png`
**A dead sparkline band adds 34px to some cards and not others, so one list has two card heights for no visible reason** — routed to: **D49**

*Seen:* Between the price bar and the "1 mtabiri" line on this card there is an empty band about 57px tall containing one flat hairline stretched the full card width — no curve, no labels, no values. The Coventry card on results__s04.png has no band at all: its bar sits 22px above "1 mtabiri". index.json confirms the split: /results cards measure 312 or 278 (a 34px difference) and /markets cards 354 or 320 (the same 34px). The same band shows on home__s04.png as a barely-visible wedge and on markets__s00.png.

*Why it matters:* 34px is 11% of a card, repeated down a board that is already 8.8 screens tall, spent on a graphic a player cannot read. Worse, it makes neighbouring cards of the same type differ in height with nothing visible to explain the difference, so the list loses its vertical rhythm and looks broken rather than data-driven.

*Critic's fix:* Do not reserve the band when the series has fewer than two real points — on settled and thin cards drop it entirely so every card of that state has one height. If it is kept, raise its contrast and give it an axis so it reads as a chart, not as a stray rule in empty space.

*Verifier:* Row-profiled results__s02 and results__s04. On the US Open card the bar ends at image y=789 and '1 mtabiri' starts at y=876 — an 87px image gap = 43.5 CSS, not the 57px claimed. Inside it, rows 838-845 (4 CSS tall) carry a flat fill spanning image x=64..655 (CSS 32..327.5, the full content width) at a green delta of only ~10/255 against the card ground — effectively invisible. The Coventry card on s04 has bar bottom y=849 and text at y=880: a 15 CSS gap, no band at all. I also profiled the s01 Dar es Salaam card the critic called a 'wedge': it is likewise a flat uniform fill (rows 485-517), no curve. index.json's 312/278 split and the 34px delta are real. So: a chart element that renders flat and below perceptibility, and that visibly gives one list two card heights. Correction: the band is 43px, not 57.

#### CP-042 · ✅ upheld · 🟡 medium defect · `leaderboard__s01.png`
**The leaderboard list is sorted by ROI and never shows ROI; the right 118px of every row is empty** — routed to: **D43**

*Seen:* Rows 2–6 contain rank, avatar, handle and a tier badge. The last pixel of content in each row is the tier badge at about x=225 (CSS); the row runs to x=343. The right third of every row is empty. The control above the list on leaderboard__s00.png reads "ROI bora" (best ROI) and the three podium tiles do print +26.8%, +13.2%, −3.9% — but the moment the list starts, the number the ranking is built on disappears.

*Why it matters:* A ranked table where the ranking value is invisible cannot be read or trusted — a player can see that @DEV is fifth but not by how much, and cannot tell why the order is what it is. And the space to print it is already sitting empty on the right of every row, so the layout is paying for the column and getting nothing.

*Critic's fix:* Put the sorted value in the empty right column of each row, right-aligned in the tabular numeral face already used elsewhere (e.g. "+13.2%" with the settled count under it), so the podium and the list speak the same language and the row reads left-to-right as identity → score.

*Verifier:* Opened leaderboard__s00, s01 and s02. s00 shows the sort control reading 'ROI bora' and the podium printing +26.8%, +13.2%, -3.9%. s01 rows 2-6 carry only rank, avatar, handle and tier badge; s02 is the footer, so there are no further rows with a number. Measured the last content pixel per row against the card's right edge at CSS 343.5: row 2 ends at 223.5 (120px empty), row 3 at 238.5 (105px), row 5 at 201.5 (142px). So the empty right band is real but varies 105-142px, not a uniform 118. The ranking metric is absent from every row of the list it orders. Not in D1-D41 (D2 covers the podium handle wrap, a different thing).

#### CP-043 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `results__s00.png`
**An unlabelled gilt pager floats alone on its own row, and a second pager of a different design governs the same list** — routed to: **— not routed**

*Seen:* Above the first card sits a cluster of two gold-ringed circular arrows with "1 / 3" between them. It is right-aligned: the first pixel of it is at x=200 CSS and it ends at x=343, so the left 200px of that row — nearly 60% — is blank. Nothing beside it says what it is paging. Four screens further down, results__s04.png shows a second, completely different pager: a bordered panel reading "1–12 KATI YA 171" with square numbered buttons 1 and 2.

*Why it matters:* Two designs for one job on one page is exactly what the phone design sheet forbids, and the two disagree in front of the player — the top one implies three pages, the bottom implies fifteen. The gold ring also spends the product's money-and-brand colour on navigation chrome. And an unlabelled "1 / 3" hovering over an empty row gives a phone user no idea what will change if they tap it.

*Critic's fix:* Give the featured-results carousel a visible label on the left of that row ("MATOKEO MASHUHURI 1/3") so the row is no longer half empty and the control is no longer anonymous, and restyle it in the neutral control ink so gilt stays with money. Use one pager composition for the list itself.

*Verifier:* The geometry checks out — I measured the gold pager cluster on results__s00 at image x=400..687 = CSS 200..343.5, right-aligned with the left ~184px of the content row blank — but the load-bearing half of the claim is false. The card directly beneath that pager is a different composition: a blue SPORTS chip, a gold 'IMETATULIWA · NDIO' chip and a crown label reading 'MATOKEO MASHUHURI' (featured results). None of the cards on s01-s04 carry the crown or that chip layout. So the '1 / 3' pager pages a three-item featured-results carousel; the bordered '1-12 KATI YA 171' panel on s04 pages the 171-item main list. Two different lists, two pagers — not 'a second pager of a different design governing the same list'. What survives is that a right-aligned pager sits above the thing it pages without a label beside it, which is a composition preference, not a defect.

#### CP-044 · ✅ upheld · 🟡 medium taste (claimed medium/defect) · `markets__s01.png`
**The pinned discovery bar slices content mid-control with no fade, and 237px of the 780px viewport is permanently chrome** — routed to: **U4**

*Seen:* On this frame the sticky bar ends at y=160 (CSS) and the card behind it resumes at y=165 — the green NDIO and red HAPANA buttons are cut exactly in half by a hard horizontal edge, with a 5px strip of page background between the sort row and the guillotine. Above the bar, the top app bar takes 56px; below, the rail takes 65px. index.json measures 237px pinned. What is left is 543px, and on this frame that holds the tail of one card, one whole 320px card, and the first 55px of the next.

*Why it matters:* This is the answer to the players who say the app is "chunky": 30% of the screen never scrolls, so the board delivers about one and a half markets per screenful on a page 8.8 screens deep. And because the bar has no scrim, shadow or fade, the half-button hanging off its lower edge reads as a rendering fault rather than as content passing underneath.

*Critic's fix:* Two separate moves. Add a short fade or a 1px hairline plus shadow at the bar's lower edge so passing content is visibly occluded, not amputated. Then buy screen back: collapse the sort row into the tab row once the page is scrolled (or hide the second row on scroll-down and restore it on scroll-up), which returns ~50px — roughly a whole extra card every two screens.

*Verifier:* Opened markets__s01 and row-profiled it. The sticky bar's bottom border is at image y=322-323 = CSS 161.5 (claim: 160, close). Page background [8,0,41] then runs image y=324..343 = 10 CSS of strip, not the 5px claimed. Card content resumes at image y=344 = CSS 172, and the green NDIO / red HAPANA buttons are visibly sliced by that hard edge with no fade. index.json's pinnedPx 237 is real. But I am correcting the kind: a sticky bar with an opaque background always cuts the content scrolling under it — that is what sticky means, not a defect — and '237 of 780 is chrome' is a density judgement about how much discovery UI a board deserves. The measurable facts are there; the framing is preference.

#### CP-045 · ✅ upheld · 🟡 medium defect · `updown__s00.png`
**Up & Down uses a 20px page gutter where every other surface uses 16 — and its own footer uses 16.5** — routed to: **D45**

*Seen:* Measured on the pixels: on this frame the page title "Juu na Chini", the BITCOIN price panel and the VICHUJIO panel all start at x=40 image px = 20 CSS. On home__s00.png, markets__s00.png, detail__s00.png and live__s01.png the equivalent edge — hero text, card border, panel border — is at x=32–33 image px = 16–16.5 CSS. On updown__s02.png the footer of the very same page returns to x=33 = 16.5. Card interiors are inconsistent on the same axis: the /markets card's content starts 16.5px inside its border, the /live card's 21px, the /help card's 21px, the /updown card's 17px.

*Why it matters:* A player moving from the board to Up & Down sees the whole page step 4px to the right and then, at the footer of that same page, step back. It is below conscious notice and exactly what separates a page that feels machined from one that feels assembled — and it is the single measurable sign that the left edge is not owned by one token. The five different card paddings mean no compaction pass can be applied once and trusted.

*Critic's fix:* Put every surface on the same PageContainer gutter (16) and give cards one padding token; the phone design sheet already names 16 for the gutter and 10/14/15/13 for card padding. Then add a check that fails if any page-level container declares its own horizontal padding.

*Verifier:* This one is decisive on the pixels. I scanned for the outermost card/panel border on each page: updown__s00 round-card border and updown__s01 panel border both at image x=40 = CSS 20.0, and the page title 'Juu na Chini' at image x=41. Every other surface's equivalent border sits at image x=32 = CSS 16.0 — markets__s00, markets__s01, results__s02, detail__s01, live__s01, help__s01, leaderboard__s00, all identical. updown__s02's footer text is at image x=33 = CSS 16.5, so the same page drops back to the 16 gutter below the fold. That contradicts the design sheet's own rung ('Page side gutter 16 — PageContainer px-3'). Caveat: the second half of the claim, the card-interior insets (16.5/21/21/17), is weak — the card rule explicitly sanctions 10/14/15/13 padding rungs per card type, so varying interiors are not by themselves a defect. The gutter finding stands on its own. Not in D1-D41.

#### CP-046 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `updown__s01.png`
**The from→to price pair breaks across two lines and leaves the arrow dangling at the end of the first** — routed to: **D52**

*Seen:* In the settled round panel the right-hand column reads "$75,819.68 →" on line one and "$75,824.01" on line two, while the left-hand column reads "Juu / imeshinda" also broken over two lines. The arrow that connects the two prices sits at the end of the upper line, pointing into the right margin rather than at the value it points to.

*Why it matters:* These are the two numbers that decide whether the round was won or lost. Broken this way the pair reads as one price followed by a stray glyph and then an unrelated price; at a glance a player cannot tell which is the open and which is the close. Money comparisons must never be allowed to wrap between their operands.

*Critic's fix:* Make the price pair a non-wrapping unit — put open, arrow and close on one line at a size that fits 360 (drop to --type-micro for the arrow if needed), or stack it deliberately as open above close with the arrow as a vertical connector. Either way the arrow must never end a line.

*Verifier:* Opened updown__s01. The settled-round pod reads exactly as described: left column 'Juu' / 'imeshinda' wrapped over two lines in green, right column '$75,819.68 →' on line one with the arrow as the last glyph pointing into the right margin, and '$75,824.01' alone on line two. The atomic from→to unit is genuinely broken. Correcting severity down: both figures are legible and in the right order, the pod is a settled-round summary rather than an action, so this is a wrap flaw rather than a money-comprehension failure. Distinct from D36/D37.

#### CP-047 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `live__s00.png`
**The live hero's own section label is truncated at the default 360 width in the default language** — routed to: **D47**

*Seen:* The hero card's label reads "LILILO NA SHAKA…" with an ellipsis, cut at about x=159 CSS, immediately left of the 44px circular prev button. Nothing is wrong with the space — the row simply caps the label. The same class of cut appears on updown__s00.png, where the round card's status reads "TUNASOMA BEI YA / KUFUNGA… · BTC": it both wraps to two lines and then ellipsises.

*Why it matters:* This is the very first card a visitor meets on /live, and its category — the one word telling them what this carousel is showing — is the thing that gets cut. It is not a long-tail locale edge case: it is Swahili, which is now the default, at 360, which is the modal phone.

*Critic's fix:* Let the label take the full row and move the prev/next cluster to its own baseline, or shorten the SW string. Any label that names what a component is showing should be allowed to wrap rather than truncate.

*Verifier:* Opened live__s00: the teal label 'LILILO NA SHAKA…' runs image x=84..314 and terminates in an ellipsis at CSS 157 (claim: ~159, accurate). I also confirmed the second instance on updown__s00, where the round card's status reads 'TUNASOMA BEI YA' / 'KUFUNGA… · BTC' — it does both wrap to two lines and then ellipsise. But the critic embellished the diagnosis: 'nothing is wrong with the space' is untrue. I measured the prev button's left edge at CSS 176.5, so the label has only ~20px of slack before it collides with the 44px pager cluster — the row is genuinely tight, which is why the label is capped. Correcting severity to low: it is a decorative section label, not money or an action, and the cut word is still readable in context.

#### CP-048 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `detail__s01.png`
**The third stat tile is a lone full-width box 8px shorter than the pair above it** — routed to: **U37 low**

*Seen:* Measured: KIASI and WATABIRI are two tiles of 155.5 × 73.5 CSS sitting side by side with a 16.5px gap. Below them INAISHA is a single tile 327.5 CSS wide and 65.5 CSS tall — full width, 8px shorter than its siblings, with its content ("27 Oct 2026, 00:00") occupying the left 55% and the rest empty. The two upper tiles carry a small icon before their label; the lone one does not.

*Why it matters:* Three boxes of the same family, in one block, with three different widths, two different heights and two different label treatments. The eye reads the pair as a unit and then the third as a mistake — the row that stretches over dead space is the one telling the player when the market ends, which is the one that should look most deliberate.

*Critic's fix:* Keep the 2-up grid and give INAISHA the full-width slot only if it earns it (e.g. put the closing date and the settlement date side by side there); otherwise make it a third tile in the same grid with the same height, icon and padding as its siblings.

*Verifier:* Measured detail__s01 directly. The KIASI tile's border spans image y=174..325 = 76.0 CSS tall; the INAISHA tile spans y=358..493 = 68.0 CSS. The 8px difference is exact. INAISHA runs image x=32..687 = 328 CSS, full width, and its content '27 Oct 2026, 00:00' stops just past the halfway mark. And the icon observation is right: KIASI and WATABIRI each carry a small glyph before the label, INAISHA carries none. Correcting severity down: the tiles are stacked, not side by side, so an 8px height difference is close to imperceptible — the missing icon is the half a reader would actually notice.

#### CP-049 · ✅ upheld · ⚪ low defect · `home__s00.png`
**The three hero figures do not share a left edge — the first is jogged 20px right by its live dot** — routed to: **D51**

*Seen:* Measured on the pixels: the labels MASOKO YALIYO WAZI, FEDHA ZILIZOWEKWA and UTABIRI ULIO WAZI all begin at 16.5 CSS. Their values do not. "32" begins at 36.5 CSS because a red live dot occupies the gutter position ahead of it; "TZS 29K" begins at 17 and "8" at 17.5. So the first figure hangs 19px to the right of the other two and 20px to the right of its own label.

*Why it matters:* These three divider-separated rows are the first thing under the hero headline and are meant to be read as a column of figures. A 20px jog on the top one breaks the column at exactly the point where the eye enters it, and it is the kind of misalignment a visual critic finds in two seconds.

*Critic's fix:* Hang the live dot outside the text flow (absolute, in the left margin, or trailing the label) so all three values start on the same 16px edge — or give all three rows the same leading slot so the indent is deliberate and repeated rather than applied once.

*Verifier:* Opened home__s00 and measured the glyphs, not the boxes. All three labels start at CSS 16.5. The white '32' glyph starts at image x=67 = CSS 33.5 because the red live dot occupies the gutter slot ahead of it; 'TZS 29K' starts at CSS 17.0 and '8' at CSS 17.5. So the misalignment is real and plainly visible in the frame — but it is 16.5-17px, not the 19-20px claimed (the critic's 36.5 CSS for '32' is about 3px past where the glyph actually begins).

#### CP-050 · ✅ upheld · 🟡 medium taste · `detail__s04.png`
**The discussion panel spends 246px — almost half the usable screen — saying there are no comments** — routed to: **U26**

*Seen:* The Majadiliano panel runs from y=255 to y=501 CSS, 246px tall. It contains a header row, a 41px full-width button, and one centred grey sentence "Hakuna maoni bado — anza mazungumzo." There is 67px of nothing between the button and that sentence and 60px of nothing below it, then a further ~80px of empty page before the footer divider. The usable viewport on this page is 543px.

*Why it matters:* Nearly half a screenful, at the end of a 5.9-screen page, communicates one fact that a single line already states. This is where the "it feels big and chunky" complaint actually comes from — not from type size, which is disciplined, but from empty states holding open desktop-sized boxes on a phone.

*Critic's fix:* Give the empty comments panel an intrinsic height: header, the sign-in control, one line of copy, 16px padding — roughly 130px. Reserve the tall min-height only when there are threads to hold.

*Verifier:* Measured detail__s04: the Majadiliano panel border runs image y=510..1003 = CSS 255.0 to 501.5, 247px tall — the claimed 246 is right. It holds a header row, one 41px full-width button and one centred grey sentence, with roughly 60px of void above the sentence (the critic said 67) and ~59px below it, then ~96px more empty page before the footer divider (they said ~80, understating it). 247 of 543 usable px is 45%, so 'almost half' is fair. The kind call is correct too: nothing here is broken or misaligned — it is an empty state given far more room than its content needs, which is a density judgement. Note the button itself says 'Ingia ili kutabiri' ('sign in to predict') for commenting, which is already D8, but that is not what this claim is about.

#### CP-051 · ✅ upheld · ⚪ low taste (claimed medium/taste) · `markets__s03.png`
**A cold-start card states "no bets yet" three times and centres two of them inside an otherwise left-aligned card** — routed to: **U32 low**

*Seen:* On the Brentford/Chelsea card: a dashed empty bar, then "Bila dau bado" centred, then "Kuwa wa kwanza kutabiri" centred, then the NDIO/HAPANA buttons, then a meta row whose left item reads "Hakuna bwawa bado". Three statements of the same fact in one 320px card, and the two centred lines occupy about 90px — 28% of the card — between the bar and the buttons. Every other line in the card is flush left at the card's padding edge; these two are not. The same pattern repeats on markets__s04.png, live__s01.png and live__s02.png, where on live__s02 a card with bets shows "NDIO @ 83%" left and "HAPANA @ 17%" right in the very slot where its neighbours show one centred line — so the left column edge appears and disappears down the list.

*Why it matters:* On a board where most markets are currently unbet, the dominant visual impression is a stack of tall cards repeating the same negative message with a wandering text axis. A player scanning for something to bet on gets less signal per screen than they should, and the list never settles into a rhythm the eye can ride.

*Critic's fix:* Say it once. Keep "Bila dau bado" in the slot where the price percentages normally sit, left/right aligned exactly as they are, drop the second encouragement line (or fold it into the buttons' own affordance), and let the meta row show the countdown alone. That returns roughly 60px per empty card and keeps one left edge for the whole list.

*Verifier:* Opened markets__s03 and live__s02. The centring observation is real and visible: on the cold-start cards a dashed empty bar is followed by 'Bila dau bado' and 'Kuwa wa kwanza kutabiri', both centred, occupying ~82 CSS of a 320px card (26%, not 28%), while the title, buttons and meta row are all flush to the padding edge. live__s02 confirms the alternation exactly — the Mwanza card shows 'NDIO @ 83%' left and 'HAPANA @ 17%' right in the very slot where its two neighbours show one centred 'Bila dau bado', so the left column edge does appear and disappear down the list. Two corrections though. First, 'three times' is an overstatement: 'Bila dau bado' (no bets) and 'Hakuna bwawa bado' (no pool) are two different fields, and 'Kuwa wa kwanza kutabiri' is a call to action, not a third statement of the same fact. Second, on markets__s03 the Brentford/Chelsea card's meta row is below the fold — the 'Hakuna bwawa bado' visible on that frame belongs to the card above it. Downgrading accordingly.

### Information design — 19 claims, 10 kept

#### CP-052 · ❌ refuted · ⚪ low taste (claimed high/defect) · `home__s00.png`
**The board-sentiment bar says "every open market" when it can only be the six that have money** — routed to: **— not routed**

*Seen:* Under the heading BODI YOTE, SASA HIVI a full-width green→red bar carries a gold tick at ~76% of its length, captioned "76% NDIO · 24% HAPANA — kila soko lililo wazi, kwa uzito wa fedha zilizowekwa" (every open market, weighted by money staked). The same screen states 32 open markets and 8 open predictions. On markets__s02/s03/s04 the board — sorted by biggest pool, descending — runs out of money after six cards and the remaining cards all read TZS 0 / "Bila dau bado". A money-weighted mean over the six funded markets visible on the board (18,000@83%, 4,000@50%, 3,000@67%, 1,000@100%, plus the small remainder) lands at ~76-77%, which is exactly the number on the bar. So the bar is computed only over markets that have money, while its caption claims all 32.

*Why it matters:* This is the first data graphic a Swahili visitor sees, and it is the platform's claim about itself. Twenty-six of the thirty-two markets it says it covers contributed nothing to it. A visitor who scrolls two screens and sees a wall of TZS 0 has caught the home page overstating its own reach — the most expensive kind of error for a product whose selling line is that every outcome has a cited source.

*Critic's fix:* Either weight the bar over all 32 (empty markets entering at the no-price state, which will pull it toward 50), or keep the money-weighting and correct the caption to name the real population and sample: "masoko 6 yenye dau · watabiri 8, kwa uzito wa fedha". Put n on the graphic, not only in the prose.

*Verifier:* I opened home__s00 and the bar and caption are exactly as described (76% NDIO · 24% HAPANA — kila soko lililo wazi, kwa uzito wa fedha zilizowekwa; 32 masoko, TZS 29K, 8 utabiri). But the caption is self-consistent, not false: a mean weighted BY MONEY STAKED over all 32 markets is arithmetically identical to the same mean over the 6 funded ones, because a market with TZS 0 carries weight 0. I checked the arithmetic against the board: 18,000@83% (Mwanza, home__s04) + 4,000@50% (PUBG) + 3,000@67% (S!TE, markets__s01) + 1,000@100% (Iran, markets__s02) + the two small remainders = ~21,950/29,000 = 75.7% → the 76% on the bar. The critic has found a mathematical identity and dressed it as a scope error. There is no defect here.

#### CP-053 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `markets__s02.png`
**One TZS 1,000 bet is rendered as a 100% / 0% certainty, needle pinned to the rail** — routed to: **owner 6**

*Seen:* Two cards on one screen. "Je, Marekani na Iran watasaini makubaliano rasmi ya amani…" shows NDIO 100% at 28px, a bar that is solid green edge to edge with the gold needle against the right end, a button reading HAPANA @ 0%, and below it "1 mtabiri" and "TZS 1,000". Directly beneath, "Je, Manchester City wata shinda Premier League 2026/27?" shows NDIO 0%, a bar that is solid red edge to edge with the needle against the left end, and again "1 mtabiri". The same 0%/100% pair reappears on live__s04 for the Iran market. This is not the empty-market state — those cards render a dotted neutral track and "Bila dau bado" (markets__s03), and they do it correctly.

*Why it matters:* The platform is telling players that a formal US-Iran peace treaty is a certainty and that Manchester City winning the league is impossible, on the strength of one thousand shillings from one account. It is also offering a tradeable price of 0% — a player who taps HAPANA @ 0% cannot know what they are paying or what they would win. Beyond the money risk, a board where the boldest, most saturated cards are the ones with the least evidence trains readers to distrust every percentage on the site.

*Critic's fix:* Shrink the displayed price toward the 50% prior by pool size (a Laplace/liquidity-weighted estimator) until a minimum liquidity threshold is met, clamp the displayed range to roughly 3-97%, and print the sample inline with the price ("NDIO 83% · watabiri 3") rather than in 11px grey four rows down. Below the threshold, show the price as indicative and say so on the card.

*Verifier:* Verified on markets__s02: the Iran card shows NDIO 100% at display size, a solid-green bar with the gold needle hard against the right rail, a live button reading HAPANA @ 0%, "1 mtabiri", "TZS 1,000"; the Manchester City card below it is the mirror (NDIO 0%, solid red, needle at the left rail, 1 mtabiri). live__s04 repeats NDIO @ 100% / HAPANA @ 0% for the same Iran market. The cold-start state (dotted track + "Bila dau bado", markets__s03/s04) is indeed a separate, well-handled state, so the one-bet case falls through to the rails. Mitigating, and why I lower the severity: the numbers are literally correct for a pool price, and the card prints its own sample ("1 mtabiri", "TZS 1,000") immediately under the bar, so nothing is hidden — the fault is that a tappable "@ 0%" price and a rail-pinned needle read as certainty. Not the same thing as D29 (invented 50% on zero-bet terminal cards).

#### CP-054 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `leaderboard__s01.png`
**A ranked table that omits the variable it is ranked by** — routed to: **D43**

*Seen:* The rows for ranks 2 through 6 (@Dhiresh, @Jaykishan, @Fulgence, @DEV, @James) contain exactly four things: the rank number, a circular initials avatar, the handle, and a tier medal. There is no ROI figure and no settled-bet count on any of them, and the right half of each row — roughly 210 image px of card, about 105 CSS px — is empty. The page is titled "Watabiri bora", the sort control above reads "ROI bora", and the podium on leaderboard__s00 does print the numbers (+26.8%, +13.2%, −3.9%). The values exist; they are simply dropped below rank 3. index.json records overflowX false for this surface, so nothing is scrolled off to the right.

*Why it matters:* A leaderboard exists to let a reader check the ordering and judge the distance between places. Here the reader can see that @Fulgence is fourth but not by how much, not on what evidence, and not whether fourth place is profitable at all — which matters, because third place on this very board is negative. The ranking becomes an assertion the player is asked to take on faith on a page whose whole purpose is to display evidence.

*Critic's fix:* Add the two columns that already exist in the podium to every row: the ROI (signed, coloured) and the settled count. There is room for both in the empty right half at 360px; if space is tight, drop the tier medal from the row and keep it on the profile.

*Verifier:* Confirmed on leaderboard__s01. Rows 2–6 (@Dhiresh, @Jaykishan, @Fulgence, @DEV, @James) carry only rank number, initials avatar, handle and tier medal; I cropped row 2 at native resolution to be sure — nothing beyond the medal at x≈425 out of a card that runs to x≈688, so ~130 image px / 65 CSS px of dead card per row. index.json confirms overflowX=false for /leaderboard, so nothing is clipped off-screen. leaderboard__s00 proves the values exist (+26.8%, +13.2%, −3.9%, "N imetatuliwa") and the sort control says "ROI bora". Severity lowered from high because ranks 2 and 3 do get their numbers on the podium directly above, so only ranks 4–6 are numberless anywhere on the page. Distinct from D2 (podium handle wrapping).

#### CP-055 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `leaderboard__s00.png`
**ROI ranked with no minimum sample, so first place is the least-evidenced player and sample size is the faintest text on the card** — routed to: **owner 7**

*Seen:* The podium reads, left to right: @Dhiresh +13.2% over "18 imetatuliwa", @Libuhi +26.8% over "6 imetatuliwa" (crowned, gold ring, centre, highest plinth), @Jaykishan −3.9% over "44 imetatuliwa". The ROI figures are set large and in colour; the settled counts under them are the smallest and dimmest type in the panel. The summary panel above repeats "ROI BORA 26.8%" in green. No period is stated anywhere on the screen — not on the summary panel, not on the sort control ("ROI bora"), not on any podium figure.

*Why it matters:* The ordering is inverted with respect to reliability: the player with the fewest resolved bets sits on the top step and the player with seven times as much evidence sits on the bottom one, in the negative. On a real-money platform this is the leaderboard telling newcomers to copy the noisiest record in the room. And a return figure with no window cannot be checked by anyone — 26.8% this week and 26.8% since launch are very different claims wearing the same label.

*Critic's fix:* Require a minimum settled count to enter the ROI ranking (and name the threshold on the page), or rank on a lower-confidence-bound rather than the raw mean. Promote the settled count to the same weight as the percentage — it is the number that makes the percentage readable. Put the window in the panel header: "ROI BORA · siku 30".

*Verifier:* The podium on leaderboard__s00 is exactly as described: @Dhiresh +13.2% / 18 imetatuliwa (rank 2), @Libuhi +26.8% / 6 imetatuliwa (crowned, gold ring, centre, tallest plinth), @Jaykishan −3.9% / 44 imetatuliwa (rank 3); the ROI figures are large and inked, the settled counts are the smallest, dimmest type on the panel; the summary repeats "ROI BORA 26.8%" in green; and I found no period anywhere on the screen — the tabs read Zote 6 / Masoko 4 / Juu na Chini 6 and the sort reads "ROI bora". The hierarchy inverting the evidence is real and verifiable. What is NOT verifiable from the frame is the title's stronger assertion "no minimum sample": one snapshot in which the leader has 6 settled does not prove the absence of a threshold (a floor of 5 would also produce this), and the tier medal may already encode volume. Downgraded to medium on that inference.

#### CP-056 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `results__s00.png`
**The results donut has three segments, a two-item legend, and parts that do not sum to the whole printed beside it** — routed to: **D42**

*Seen:* At the top of /results a donut ring sits between the word MATOKEO and the legend "NDIO 59 · HAPANA 88". The ring carries three visibly different arcs: green from roughly 8 to 11 o'clock, a grey-blue arc across the top from about 11 to 1 o'clock, and coral from 1 round to 7 o'clock. The legend names two of them. Two hundred image pixels below, the filter row reads "Zote 171" and, at the right, "masoko 171". 59 + 88 = 147, not 171 — 24 results, about one in seven, are in the ring but not in the legend. The HAPANA tab beside it is cut mid-word to "HAPAI" by the result count, so its own figure is unreadable too.

*Why it matters:* This ring is the platform's public track record — the thing a sceptical visitor checks before depositing. It fails the simplest test anyone applies to a pie: the slices do not add up to the total printed next to them, and a seventh of the data has no name. A reader who does the arithmetic learns nothing except that the page does not agree with itself.

*Critic's fix:* Label the third segment (presumably BATILI/void) in the legend with its count, so the three parts sum to 171 in plain sight. If void results should not count, exclude them from the ring and change the adjacent total to 147 with the void count stated separately.

*Verifier:* I cropped and enlarged the ring on results__s00. There are unambiguously three arcs: green, coral, and a lavender/blue-grey wedge of roughly 50–60° — and the legend beside it names only two ("NDIO 59 · HAPANA 88"). 59+88 = 147 against "Zote 171" / "masoko 171" in the filter row, so the unnamed arc is the missing 24 (14% ≈ 50°, which matches the wedge I measured). An unlabelled third segment on a summary ring is a genuine fault. Two corrections: the critic's clock positions are wrong (green runs 12→~5, coral ~5→~10, lavender ~10→12, not 8–11/11–1/1–7), and the "HAPAI" clipping he cites in support is already known as D1. Severity lowered because the ring is a small decorative summary and every count it summarises is printed in full immediately below it.

#### CP-057 · ❌ refuted · ⚪ low taste (claimed high/defect) · `results__s02.png`
**On settled cards the needle points at the opposite side from the stated outcome, and nothing says what the needle is** — routed to: **— not routed**

*Seen:* "Je, fainali ya US Open Men's Singles 2026…" carries TOKEO HAPANA at the top right, and directly under it a bar that is green for about 95% of its length with the gold needle hard against the right end. "1 mtabiri", "TZS 1,000". Two screens on, results__s04 shows the same shape for Coventry City: near-solid green bar, needle at the right, TOKEO HAPANA. In the other direction, results__s03 shows "Je, Manchester United na Manchester City watapiga…" with a solid red bar, the needle hard against the left end, and TOKEO NDIO. Unlike the /markets cards, the settled bars carry no percentage labels at all — the numbers that would explain the needle have been removed.

*Why it matters:* Green plus a right-hand needle is the exact visual sentence the product uses everywhere else to mean YES. Placing it beside the word HAPANA, three cards in a row, leaves the reader with two contradictory readings and no caption to arbitrate — and the one that reads fastest is the wrong one. If the needle is the closing price, that is genuinely interesting information (the market was wrong) and deserves to be said out loud; as drawn it just looks like a bug.

*Critic's fix:* Label the mark: "bei ya kufunga 96% NDIO" under the bar, restore the percentage labels the live cards have, and add an explicit divergence marker when the closing price and the outcome disagree. Failing that, remove the bar from settled cards entirely — an unlabelled needle on a decided market earns nothing.

*Verifier:* Every pixel described is there — results__s02 US Open: TOKEO HAPANA over a ~95% green bar with the needle hard right, 1 mtabiri, TZS 1,000; results__s04 Coventry: same shape; results__s03 Man Utd/Man City: solid red bar, needle hard left, TOKEO NDIO — but the reading is wrong. That bar is the market's CLOSING PRICE and the outcome is what actually happened; a settled prediction market whose crowd was wrong is precisely what /results exists to record, and results__s01 shows the consistent case (Dar es Salaam: needle at ~15%, outcome HAPANA). Calling the needle "opposite" treats "the crowd was wrong" as a rendering bug. The only defensible fragment is the second clause — settled bars carry no % labels, so the needle is unlabelled — and that is a separate, lesser finding, not the one titled here.

#### CP-058 · ✅ upheld · 🟠 high defect · `results__s01.png`
**Every outcome word is printed in the YES ink, including HAPANA** — routed to: **D29 (U32)**

*Seen:* On the Dar es Salaam rainfall card the outcome reads "TOKEO" in small caps above "HAPANA" set at roughly 72 image px (about 36 CSS px) in the same green used for the NDIO buttons and NDIO prices elsewhere on the site. Two cards down, "TOKEO NDIO" is set in the identical green. On results__s02 the US Open card shows "HAPANA" in green; on results__s03 both visible cards show "NDIO" in green; on results__s04 Coventry shows "HAPANA" in green. Across nine settled cards I opened, the outcome word is green in every case regardless of which side won. The word HAPANA is red in the live ticker, on the HAPANA buttons, and in the HAPANA prices on markets__s01.

*Why it matters:* The phone design sheet reserves the YES/NO inks as meaning-bearing, and the rest of the product honours that. Here the largest coloured word on each settled card is coloured by nothing — so a reader scanning the results board at arm's length sees an unbroken column of green and reads it as a run of YES outcomes, when 88 of 147 went the other way. A colour that says the same thing whatever the data did is worse than no colour.

*Critic's fix:* Bind the outcome word's colour to the outcome: green for NDIO, the HAPANA red for HAPANA, the neutral/void ink for void. If a single colour is wanted for calm, use the neutral foreground for both and let the word carry the meaning — but do not use one side's ink for both sides.

*Verifier:* This one is solid and I could not break it. results__s01: "TOKEO HAPANA" in mint green, and two cards down "TOKEO NDIO" in the identical green. results__s02: US Open "HAPANA" green. results__s03: both cards "NDIO" green. results__s04: Coventry "HAPANA" green. It is the same ink as the "NDIO 100%" / "NDIO 67%" prices on markets__s01/s02, while HAPANA is red on the buttons, in the HAPANA prices and in the live ticker on home__s00. So the largest, most important token on a settled card is inked to mean the opposite of what it says, systematically, on every settled card. This breaks §8a guardrail 4 (the YES/NO inks keep their meaning) outright. Kept at high: it is a money-outcome word and the miscolouring is systemic, not incidental.

#### CP-059 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `live__s04.png`
**Two complementary markets on the same inflation release close seven days apart** — routed to: **E-420**

*Seen:* Two cards on the same screen, separated by one other card. The first: "Je, mfumuko wa bei wa Tanzania (NCPI) utazidi asilimia 3.5 mwezi Septemba 2026, kulingana na ripoti ya kila mwezi …" — siku 20 zimebaki. The third: "Je, kiwango cha mfumuko wa bei Tanzania (NCPI) kitashuka chini ya 3.5% mwezi Septemba 2026, kulingana na…" — siku 27 zimebaki. Same index, same month, same 3.5% threshold, opposite direction. Both read "Bila dau bado".

*Why it matters:* These two questions must resolve from one NCPI release and their answers are logically locked together, yet one stops accepting bets a full week before the other. That week is a free option: after the first closes, anything that moves expectations can still be traded in the second. It also splits the liquidity of a board that, by its own home-page figures, has only eight open predictions in total — two half-empty markets where one market with a real pool should be.

*Critic's fix:* Derive both close times from the same resolution event and make them identical, or merge the pair into one market with NDIO/HAPANA sides. Add a check at market creation that flags two open markets sharing a source, a date and a threshold.

*Verifier:* Verified on live__s04. Card 1 (UCHUMI, siku 20 zimebaki): "…NCPI utazidi asilimia 3.5 mwezi Septemba 2026, kulingana na ripoti ya kila mwezi…"; card 3, one card later (UCHUMI, siku 27 zimebaki): "…NCPI kitashuka chini ya 3.5% mwezi Septemba 2026…". Same index, same month, same threshold, opposite direction, both "Bila dau bado" — and the second stays open a week longer on a question settled by the same single release, which is a real catalogue fault (split liquidity, and a window in which one market may still be open after the other's answer is knowable). Two caveats that lower it from high: they are not strictly complementary (exactly 3.5% resolves NO on both), and this is a seeded-content/market-ops defect, not a phone information-design one — nothing about how the two cards are drawn is wrong.

#### CP-060 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `detail__s02.png`
**The probability chart's x-axis is spaced by data point, not by time, so the slope means nothing** — routed to: **D46**

*Seen:* Under "UWEZEKANO WA NDIYO KWA MUDA" the axis labels sit at, in image pixels, "12 Sep" centred near x=148, "14 Sep" near x=302, "15 Sep" near x=455 — intervals of 154 and 153 px. The first interval covers two days, the second covers one. The plotted line changes gradient at exactly the 14 Sep tick, rising red from about 0% to the 50% dashed reference and then green on to 67%.

*Why it matters:* The only thing a probability-over-time chart is for is the rate of change, and this axis makes the second day's move look the same size as the first two days' move. A player reading momentum off this line is reading an artefact of how many points happened to be stored, not of what the market did. Everything else on the panel — the percent axis, the 1W/1M/ALL selector, the reference line — is dressed as a proper time series, which is what makes the distortion invisible.

*Critic's fix:* Plot on a true time scale with ticks at regular date intervals and points positioned by timestamp; step the line between observations rather than interpolating, so gaps in trading read as gaps.

*Verifier:* I measured this rather than eyeballing it. On detail__s02 the label glyph groups centre at x=148.5, 302.0 and 455.0 image px — gaps of 153.5 and 153.0 — for "12 Sep", "14 Sep", "15 Sep", i.e. a two-day interval and a one-day interval drawn the same width. The line's gradient change lands exactly on the 14 Sep tick. A date-labelled axis on a categorical scale does misrepresent rate of change, so the finding stands. Downgraded from high because it is a three-point sparkline inside a collapsible panel, an ordinal axis is a defensible convention for such a sparse series, and no figure derived from the slope is printed anywhere.

#### CP-061 · ❌ refuted · ⚪ low taste (claimed high/defect) · `detail__s02.png`
**The 67% badge floats clear of the line end, and the chart implies a trading history one predictor cannot have** — routed to: **— not routed**

*Seen:* The green line terminates near x=455 (image px). The green "67%" badge sits at x≈535-605, roughly 75 image px (about 37 CSS px) to its right, level with nothing. The gold "50%" badge sits at the same right-hand column with its dashed rule running the full plot width. Above the plot, a 1W / 1M / ALL segmented control has ALL selected. On the same page, two screens up (detail__s01), the stat tiles read KIASI TZS 3K and WATABIRI 1, and the line's left end rests at about 0% on 12 Sep.

*Why it matters:* A range selector offering a week, a month and all time on three days of data, a filled area, a reference line and a 0%→67% ascent together promise a market that has been trading. The page's own numbers say one person has staked in it. The detached badge compounds it: the most important number on the chart is not touching the mark it labels, so a reader cannot tell whether 67% is where the line ended or a separate reading. And the leftmost point is the cold-start artefact, not a price anyone ever traded at.

*Critic's fix:* Anchor the current-value badge to the last plotted point with a connector or place it directly on the line end. Hide range buttons that cover no additional data. Start the series at the first real bet, not at the seeded 0%, and when the series has fewer than a handful of observations draw the points alone with no connecting line.

*Verifier:* Both halves fail when measured. I extracted the green pixels on detail__s02: the line terminates at x≈455, y≈776, and the 67% badge occupies x 535–605, y 759–790 — centre y 774, i.e. vertically level with the line's terminal point to within 2px, sitting in the right-hand axis-label gutter alongside 60% / 40% / 20% / 0% and directly above the 50% badge on its dashed rule. That is a textbook last-value axis marker, not a badge "level with nothing". The second half is refuted by arithmetic: markets__s01 shows this market at TZS 3,000 / 1 mtabiri / NDIO 67%, and one predictor placing 1,000 on HAPANA and then 2,000 on NDIO gives exactly 3,000, exactly 2000/3000 = 67%, and exactly a path starting at 0% — the history the chart draws is the one a single predictor can and did have.

#### CP-062 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `detail__s02.png`
**The chart borrows the NDIO/HAPANA inks to mean "above/below 50%"** — routed to: **— not routed**

*Seen:* The single plotted line is red from its start at ~0% up to where it crosses the gold 50% dashed rule, and green from that crossing to its end at 67%. Both segments describe the probability of NDIO. On the same page, green means NDIO and red means HAPANA on the price strip, the buttons and the related-market cards.

*Why it matters:* The red half of this line is the NDIO probability, drawn in the colour the whole product uses for HAPANA. A reader who has spent two screens learning that red equals NO will read the red segment as the NO line and the green as the YES line, and conclude the two crossed on 14 September — which is not what the chart shows at all.

*Critic's fix:* Draw the series in one neutral or brand ink and let the 50% rule carry the above/below reading, or split it into two lines (NDIO green, HAPANA red) that genuinely sum to 100.

*Verifier:* The colouring on detail__s02 is as described — red from ~0% up to the 50% rule, green from there to 67% — but it does not borrow the inks, it honours them. Below 50% P(NDIO) means HAPANA is the majority side, so red is the correct ink for that stretch; above 50% NDIO leads, so green is correct. The ink changes exactly where the leading side changes. This is the same semantics as the price strip, the buttons and the related-market cards on the same page, not a conflicting second meaning.

#### CP-063 · ✅ upheld · ⚪ low taste (claimed medium/defect) · `live__s04.png`
**/live prints prices with the pool and the predictor count removed** — routed to: **U36**

*Seen:* The Iran row on /live shows category, "siku 14 zimebaki", the question, a solid green bar with the needle at the right, and "NDIO @ 100%" / "HAPANA @ 0%". There is no TZS figure and no predictor count anywhere on the row. The same is true of the 83% Mwanza wind row on live__s02 and every other priced row I opened on this surface. The /markets card for the identical Iran market (markets__s02) does carry "1 mtabiri" and "TZS 1,000".

*Why it matters:* The two figures that make a percentage interpretable are exactly the two this surface drops, and it drops them on the page most likely to be scanned fast. A reader on /markets can at least see that 100% rests on one thousand shillings; the same reader on /live cannot. The context was already computed and already displayed elsewhere — it was removed to make the row shorter.

*Critic's fix:* Add the pool and the predictor count to the /live row, on the same line as the prices. If the row must stay compact, trade away the category chip or the "siku n zimebaki" before trading away the sample size.

*Verifier:* Accurate as observed: on live__s04 the Iran row carries category, "siku 14 zimebaki", the question, a solid green bar and "NDIO @ 100% / HAPANA @ 0%" and no TZS figure or predictor count; live__s02 is the same for the 83%/17% Mwanza row; markets__s02 carries "1 mtabiri" and "TZS 1,000" for the identical Iran market. But /live is deliberately a compact price feed — the row shows category, countdown, question, price and nothing else, and unfunded rows correctly swap the price for "Bila dau bado" — so this is a density decision, not an error. The real harm (a 100% price with no visible sample) is already carried by finding 2; counting it twice at medium would double-charge it.

#### CP-064 · ✅ upheld · ⚪ low taste (claimed medium/defect) · `detail__s01.png`
**Two four-box countdowns ticking seconds at a 36-day range, three of whose four boxes hold identical values** — routed to: **U8**

*Seen:* One panel holds two rows of four digit boxes. The first, under "UCHAGUZI UNAFUNGWA BAADA YA · 23 Oct, 00:00", reads 36 SIKU / 13 SAA / 02 DAK / 38 SEK. The second, under "MATOKEO BAADA YA · 27 Oct, 00:00", reads 40 SIKU / 13 SAA / 02 DAK / 38 SEK. Only the first box differs. The panel spans roughly y=545 to y=1070 in image pixels — about 262 CSS px, a third of the viewport — while the price strip for this market occupies a single cut-off line at the top of the same frame and the pool and predictor tiles above it about 75 CSS px.

*Why it matters:* Eight digits animate once a second to tell a player something that will not change meaningfully for five weeks, and six of them are saying it twice. Meanwhile the numbers that actually bear on the decision — 67%, TZS 3K, 1 predictor — get a fraction of the space and none of the motion. On a phone, where every screen is scarce, the page has spent its largest panel on its least useful precision.

*Critic's fix:* Show one countdown (to the close) and express the settlement as a relative offset — "matokeo siku 4 baadaye · 27 Okt". Drop to date-and-hour precision beyond 48 hours and switch to the ticking boxes only inside the final day.

*Verifier:* The panel on detail__s01 is real and I measured it: 36/13/02/38 under "UCHAGUZI UNAFUNGWA BAADA YA · 23 Oct, 00:00" and 40/13/02/38 under "MATOKEO BAADA YA · 27 Oct, 00:00", spanning y≈545–1070 image px = ~262 CSS px, a third of the 780px viewport, against ~72 CSS px for the KIASI/WATABIRI tiles. Eight digit boxes ticking seconds for a 36-day horizon is disproportionate weight, and the panel also restates the "INAISHA 27 Oct 2026, 00:00" tile immediately above it. But the headline framing is wrong on two counts: the three identical boxes are a coincidence of both deadlines falling at 00:00, not duplicated design (any market with different clock times shows different values), and the price strip is "cut off" only because of where this scroll frame happens to start. What survives is a proportion complaint.

#### CP-065 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `detail__s01.png`
**The same money is exact on one screen and rounded to one figure on another, with no approximation sign** — routed to: **— not routed**

*Seen:* The board card for this market (markets__s01) reads "TZS 3,000". The detail page tile for the same market reads "KIASI TZS 3K". The same divergence appears with a real loss of value elsewhere: the settled Dar es Salaam rainfall card on results__s01 reads "TZS 5,500" while the live ticker across the top of home__s00, markets__s00 and login__s00 reads "TZS 5K imekamilika HAPANA" for what is evidently that settlement. Neither rounded form carries a ~ or an "approx".

*Why it matters:* TZS 5K stated for TZS 5,500 is a nine per cent misstatement of a money figure, presented as a fact and repeated on every page in the marquee. On a licensed real-money product, money is the one quantity that should never silently lose precision, and the detail page — the screen a player commits from — is the last place to abbreviate it.

*Critic's fix:* Show money in full with thousands separators on cards, tiles and tickers wherever it fits at 360px, which these all do. Reserve the K/M abbreviation for genuine aggregates (the 29K hero stat), and prefix those with ~ so the rounding is declared.

*Verifier:* The first pair is not a loss at all: markets__s01 reads TZS 3,000 and detail__s01 reads KIASI TZS 3K — the same value, abbreviated in a compact tile, which is a site-wide convention. The "real loss of value" example is an unproven inference: the ticker on home__s00 reads "TZS 5K imekamilika HAPANA", and results__s04 shows a settled HAPANA market at exactly TZS 5,000 (Coventry City), so the ticker most plausibly refers to that, not to the TZS 5,500 rainfall settlement on results__s01. The critic picked the one reading that makes the formatter look lossy when an exact-match candidate is two frames away. No missing "~" is demonstrated.

#### CP-066 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `markets__s03.png`
**The card with no data is taller than the card with data, and says "no bets" three separate times** — routed to: **— not routed**

*Seen:* The "Je, Brentford NA Chelsea watapata kila mmoja angalau kadi 2 za njano…" card devotes, in order: a dotted neutral track spanning the card width, the centred line "Bila dau bado", the centred line "Kuwa wa kwanza kutabiri", NDIO and HAPANA buttons, and a footer reading "Hakuna bwawa bado" beside "siku 2 zimebaki". Three of those elements state the same single fact. index.json records the card heights on this board as a run of 320s followed by a run of 347s; measuring the Iran card on markets__s02 from its border at y≈398 to y≈1032 gives 317 CSS px for a card carrying a price, a bar, a predictor count, two priced buttons, a pool and a countdown.

*Why it matters:* Twenty-six of thirty-two open markets are in this state, so the empty card is the board's dominant object — and it is the one given the most room and the least to say. A player scrolling /markets spends most of their screen time reading "there is nothing here" rendered three ways, over a dotted track that encodes nothing at all. The default sort is by pool size, which guarantees they meet this wall by the third screen.

*Critic's fix:* Collapse the empty state to one line — "Bila dau bado · kuwa wa kwanza" — drop the dotted track and the duplicate footer, and let the empty card be visibly shorter than a funded one. Consider a "yenye dau" filter chip in the sticky bar so a player can see the six live markets without scrolling past twenty-six empty ones.

*Verifier:* Both load-bearing assertions are embellished. On markets__s03/s04 the empty card carries a dotted track, "Bila dau bado", "Kuwa wa kwanza kutabiri", the two buttons and "Hakuna bwawa bado" — but "Kuwa wa kwanza kutabiri" is a call to action, not a third statement of the same fact, so it is one state line plus one pool-slot value plus a CTA. And index.json for /markets reads [354, 354, 320, 320, 320, 320, 347×6, 312, 312, 278]: the board is sorted by pool, the first six are the funded ones, and the two TALLEST cards on the whole board (354) are funded cards. So "the card with no data is taller than the card with data" is true only against the 320s and false against the 354s; the residue is a 27 CSS px density preference.

#### CP-067 · ✅ upheld · 🟡 medium defect · `home__s04.png`
**"INASOGEA" (it's moving) badged on a market with one predictor and seventy-five days to run** — routed to: **D50**

*Seen:* The second card reads "Je, PUBG Global Championship 2026 (Des 1–13, İstanbul)…" and carries two chips: MUBASHARA and INASOGEA. Below: NDIO 50% with the needle dead centre, "1 mtabiri", NDIO @ 50% / HAPANA @ 50%, "TZS 4,000", "siku 75 zimebaki". On live__s00 the same market is the number-one entry in the "LILILO NA SHAKA…" carousel, where the word INASOGEA is set in italic directly beneath the needle at the centre of the 50/50 bar, reading as a label for that position. The /live header states "32 hai · 1 inasogea" — this is the one.

*Why it matters:* A movement badge on a market that has had one bet in its life is a claim the card's own figures deny two rows lower. Worse, on /live the word sits under the needle where a reader will take it as an axis annotation — "the needle is here because it's moving" — rather than as a status chip, which conflates a state with a value. Since exactly one of thirty-two markets qualifies, the badge is currently doing nothing except mislabelling that one.

*Critic's fix:* Gate INASOGEA on a minimum number of distinct predictors and a price move over a stated window, and say the window in the chip's tooltip. On the /live hero, move the chip up beside the HAI pill and out of the bar's label row, and put the actual split labels where it sits now.

*Verifier:* I opened both frames. home__s04: the PUBG card carries MUBASHARA + INASOGEA chips, NDIO 50%, needle dead centre, 1 mtabiri, NDIO @ 50% / HAPANA @ 50%, TZS 4,000, siku 75 zimebaki. live__s00: the same market is entry 1/6 in "LILILO NA SHAKA…", header "32 hai · 1 inasogea", and the word INASOGEA is set in italic in the VALUE-LABEL ROW directly under the needle, reading "NDIO 50% INASOGEA 50% HAPANA" — a status badge parked in the slot where a value label belongs, so it reads as naming the needle's position. That placement ambiguity is the part I verified and it is a genuine defect. The title's own thrust — that the badge is unearned — I could not sustain: TZS 4,000 in the pool from 1 predictor means the price necessarily moved (opposing bets returning it to 50/50), and 75 days to close does not preclude recent movement.

#### CP-068 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `results__s01.png`
**Settled markets with zero predictors and TZS 0 are counted in the 171 / 59 / 88 track record** — routed to: **— not routed**

*Seen:* The second card reads "Je, Newcastle United watapatakadi za njano zaid…", TOKEO NDIO, "0 watabiri", the status pill "Imekamilika NDIO", and a footer "TZS 0". It sits in the same list, under the same "Zote 171" tab, as cards carrying TZS 5,500 and TZS 5,000, and nothing in the header, the donut or the tab counts separates the two kinds.

*Why it matters:* The 171/59/88 scoreboard is what a visitor uses to decide whether this platform has a real history. A settled market nobody ever bet on is an administrative event, not a resolution anyone was exposed to, and including it inflates the record with activity that never happened. It also silently changes what the NDIO 59 / HAPANA 88 split measures — that ratio is currently a property of how questions were written, not of how players fared.

*Critic's fix:* Count and display resolutions that had at least one bet as the headline figure, with the zero-participation settlements available behind the filter and named as such. If both are wanted in the total, split the donut into funded and unfunded and label both.

*Verifier:* The card is there on results__s01 exactly as described (Newcastle United, TOKEO NDIO, "0 watabiri", pill "Imekamilika NDIO", footer TZS 0, in the "Zote 171" list beside TZS 5,500 and TZS 5,000 cards). But the tabs and header count MARKETS, not money — "masoko 171" says so on the same row — and a question that was asked, closed and resolved is a legitimate result whether or not anyone staked on it. Excluding them would be a policy choice, not a correction. The genuinely wrong thing visible on that card is the gradient bar with a dead-centre needle despite 0 bets — and that is already D29.

#### CP-069 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `help__s00.png`
**/help offers one support number, no hours and no response window; the footer offers a second number the help page never mentions** — routed to: **— not routed**

*Seen:* The help page's three contact cards read, top to bottom: TUPIGIE 0769777877 "Dawati letu la msaada"; BARUA PEPE msaada@50pick.tz "Tuandikie wakati wowote"; MAZUNGUMZO YA MOJA KWA MOJA "Ndani ya programu". No opening hours, no target response time, and no toll-free number appear on any of them. The footer on the same page (help__s02, help__s03) lists "Wasiliana nasi · 0769777877" and, on the next line, "Simu ya msaada · 0800 11 0011" — a second, free-to-call line that the support page itself never shows.

*Why it matters:* A player who has lost money, or who wants to self-exclude, goes to /help and gets a number that costs them to dial while a free line exists two screens further down a page they have no reason to reach. "Write any time" is not an answer to the question they arrived with, which is when someone will reply. For a licensed operator this is also the one page where responsible-gambling reachability has to be unambiguous.

*Critic's fix:* Put the 0800 line on /help as the first contact card, add operating hours to the phone cards and a stated target response time to email and chat, and reconcile the two lists so the help page is a superset of the footer.

*Verifier:* The three cards on help__s00 are as quoted (TUPIGIE 0769777877 "Dawati letu la msaada"; BARUA PEPE msaada@50pick.tz "Tuandikie wakati wowote"; MAZUNGUMZO YA MOJA KWA MOJA "Ndani ya programu") with no hours — but the second half misreads the footer. On help__s03 and leaderboard__s01 the block is headed CHEZA KISTAARABU (play responsibly) and runs "Weka mipaka / Pumzika / Jizuie / Wasiliana nasi · 0769777877 / Simu ya msaada · 0800 11 0011 / Barua pepe… / Kama kucheza kamari imekuwa sio burudani, acha." A toll-free "Simu ya msaada" inside the responsible-gambling block is a problem-gambling helpline, not a hidden second customer-support line, and /help does surface responsible play (help__s01, "Kucheza kwa busara — Vikomo · mapumziko · kujizuia"). The residual "no stated hours" is a copy gap, not the finding as titled.

#### CP-070 · ❌ refuted · ⚪ low taste (claimed medium/taste) · `leaderboard__s00.png`
**A crowned podium whose third step holds a losing player** — routed to: **— not routed**

*Seen:* Three plinths under a gold crown, with medal badges 1, 2, 3. The third, @Jaykishan, reads "−3.9%" in red over "44 imetatuliwa". The board has six ranked players in total ("Zote 6"), so the podium is showing the top half of the field.

*Why it matters:* A podium is a graphic that asserts victory before the reader has read a single number — crown, medals, raised centre step. Putting a negative return on it means the form and the data are saying opposite things, and the form wins at a glance. With only six players ranked, a podium is also the wrong instrument: it dramatises rank differences in a field too small for rank to mean much.

*Critic's fix:* Show the podium only when the top three are all positive and the field is large enough to be worth dramatising; otherwise fall back to the plain ranked table with values. At minimum, do not medal a negative return.

*Verifier:* leaderboard__s00 does show @Jaykishan on plinth 3 at −3.9% in red over "44 imetatuliwa", with "Zote 6" above. Nothing is broken: rank 3 of 6 by ROI is rank 3 of 6 by ROI, the figure is honestly inked red, and a podium is simply the top-three treatment of whatever field exists. That the third-best ROI on a pre-launch board of six people is negative is a property of the seeded data — it evaporates the moment the field grows — not of the design. Suppressing or reordering it would be less honest than what is on screen.

### Swahili reader — 27 claims, 19 kept

#### CP-071 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `home__s03.png`
**The prize pool is called "bwawa" — a pond or swimming pool, not a pot of money** — routed to: **U40 list**

*Seen:* Step 03 of the how-it-works block is headed "Washindi wanagawana bwawa" and the paragraph under it opens "Bwawa linagawanywa kati ya wote waliokuwa sahihi, kasoro kamisheni inayotozwa kwenye upande ulioshindwa pekee." The same word runs across the boards as "Hakuna bwawa bado" (home__s02, markets__s03, markets__s04, detail__s03, detail__s04).

*Why it matters:* "Bwawa" in Tanzanian Swahili is a body of water — a pond, a dam, a swimming pool. No bettor in Dar uses it for a stake pot; the ordinary words are "mfuko", "jumla ya dau", or simply pool. This is the most important noun in the product — the money you are playing for — and it currently reads as a machine picking the wrong sense of the English word. It is the clearest single tell that the Swahili was translated rather than written, and it sits on the explainer whose whole job is to make players trust how winnings are shared.

*Critic's fix:* Retire "bwawa" everywhere and adopt one term; "mfuko" is the safest Tanzanian choice ("Washindi wanagawana mfuko", and for the empty state "Bado hakuna fedha kwenye mfuko"). Put "bwawa" on a forbidden-terms list checked in CI so a later translation pass cannot reintroduce it.

*Verifier:* Opened home__s03: step 03 is headed "Washindi wanagawana bwawa" and the paragraph reads "Bwawa linagawanywa kati ya wote waliokuwa sahihi, kasoro kamisheni inayotozwa kwenye upande ulioshindwa pekee." verbatim; the section label below is "BWAWA KUBWA KWANZA". "Hakuna bwawa bado" confirmed in the card footer on home__s02, markets__s03, markets__s04 and detail__s03. The word is genuinely a calque (bwawa = pond/dam/swimming pool) on the money noun, and it is used product-wide, so it is a real lexical defect — but it is comprehensible in context, there is no settled Swahili term for a betting pool, and nothing about it is wrong or misleading about the amount, so "high" is overstated.

#### CP-072 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `detail__s01.png`
**YES is spelled two different ways in the same row: NDIO and NDIYO** — routed to: **U40 NDIO/NDIYO**

*Seen:* The pinned probability strip at the top of this frame reads "NDIO 67% · INAELEKEA NDIYO · 33% HAPANA" — both spellings on one line, a few hundred pixels apart. Lower on the same page the resolution criteria begin "Itaamuliwa NDIYO iwapo CNBC au ripoti rasmi...", while every betting button on the site says NDIO and the chart panel (detail__s02) is headed "UWEZEKANO WA NDIYO KWA MUDA".

*Why it matters:* Both forms are valid Swahili, so nothing looks broken — it looks careless, which on a money product is worse. A player choosing a side has to hold one label; when the button says NDIO and the rule that decides whether they get paid says NDIYO, a reasonable reader stops to check whether these are the same thing. This is distinct from the known D39 (raw YES/NO enum leaking through): here both strings are translated, they simply disagree with each other.

*Critic's fix:* Pick NDIO — it matches the buttons, the ticker and the results board, and it is what a bettor says aloud — and sweep the sw dictionary for NDIYO. Add a lint rule that fails the build if both spellings appear in the same locale.

*Verifier:* Opened detail__s01 and cropped the pinned strip at 4x: the left segment is N-D-I-O ("NDIO 67%"), the centre is N-D-I-Y-O ("INAELEKEA NDIYO"), the right "33% HAPANA" — both spellings on one strip, confirmed at the glyph level. "Itaamuliwa NDIYO iwapo CNBC..." confirmed lower on the same frame, and detail__s02's panel head "UWEZEKANO WA NDIYO KWA MUDA" confirmed, while every button on markets__s00/s03/s04 says NDIO. Real inconsistency; not high, because both spellings are legitimate Swahili for "yes" and no user is misled about which side they are backing.

#### CP-073 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `detail__s01.png`
**The market's closing and result timestamps render with English month names** — routed to: **U40 dates**

*Seen:* The "INAISHA" panel reads "27 Oct 2026, 00:00" and the countdown block is dated "23 Oct, 00:00" and "27 Oct, 00:00" — English "Oct". The countdown unit labels directly beneath are Swahili (SIKU / SAA / DAK / SEK), and the market title one screen above (detail__s00) writes the same month as "Okt 23–25".

*Why it matters:* These two timestamps are the only things on the page telling a player when they can no longer bet and when they get paid. They come from a formatter that never received the sw locale, so the page contradicts itself about what month it is discussing — Swahili "Okt" in the question, English "Oct" in the deadline. It is the most visible proof on the site that Swahili is a skin over an English original, and it lands on the two values that matter most.

*Critic's fix:* Pass the active locale into the date formatter (Intl.DateTimeFormat with sw-TZ, or the project's own month table) so it emits Okt/Des/Ago, in day-month-year order. Add a test that renders every date surface under sw and fails on any of the twelve English month abbreviations.

*Verifier:* Opened detail__s01: "INAISHA / 27 Oct 2026, 00:00", "UCHAGUZI UNAFUNGWA BAADA YA 23 Oct, 00:00" and "MATOKEO BAADA YA 27 Oct, 00:00", with SIKU/SAA/DAK/SEK beneath — English "Oct" inside a Swahili panel, exactly as described. detail__s00 does write "Okt 23–25" in the title, and detail__s01's own criteria prose writes "Oktoba 23–25", so the same page uses three month spellings. A genuine i18n miss, but it is cosmetic — the date is still unambiguous — so medium, not high.

#### CP-074 · ✅ upheld · 🟡 medium defect (claimed high/defect) · `live__s02.png`
**Two live markets give Premier League Gameweek 5 two different date windows, on one screen** — routed to: **E-420**

*Seen:* The top card asks about "Gameweek 5 ya Premier League (Sept 19–21, 2026)" and the third card on the same frame asks about "Gameweek 5 ya Premier League (Septemba 18–20, 2026)". Same competition, same gameweek, two windows, visible together without scrolling. The home board (home__s01) states the same gameweek a third time as "Sep 18–20, 2026".

*Why it matters:* A player staking on "25 goals across all 10 matches of Gameweek 5" and one staking on "a hat-trick in Gameweek 5" are being told they are betting on different sets of fixtures. One of these will resolve against a window its own card never showed, and the bettor has the screenshot. That is a resolution dispute waiting to happen, sitting in plain sight rather than buried.

*Critic's fix:* Derive the fixture window from one source per competition round instead of free text in each title, and reconcile these two now — 18–20 agrees with the home board, so 19–21 is the outlier. Add a check that two open markets naming the same competition round cannot state different dates.

*Verifier:* Opened live__s02: the top card reads "Gameweek 5 ya Premier League (Sept 19–21, 2026)" and the third card on the same frame reads "Gameweek 5 ya Premier League (Septemba 18–20, 2026)" — both visible without scrolling. home__s01 confirms a third spelling, "(Sep 18–20, 2026)". The contradiction is real. It is seeded market content rather than a UI or layout fault, and no money is misstated, so medium rather than high.

#### CP-075 · ❌ refuted · ⚪ low taste (claimed high/defect) · `home__s00.png`
**The live ticker's settlement line is not a Swahili sentence** — routed to: **— not routed**

*Seen:* The red ticker directly under the header reads "● MUBASHARA TZS 5K imekamilika HAPANA kwenye...". The identical string is pinned on every surface in the set (markets__s00, detail__s00, updown__s00, results__s00, leaderboard__s00, help__s00, login__s00).

*Why it matters:* Word for word this is "TZS 5K has been completed NO on..." — the English template {amount} settled {side} on {market} with each slot swapped for a Swahili token and the grammar left behind. "Imekamilika" carries singular i-/ki- agreement attached to a money amount, and it means "is finished", not "paid out". This is the first Swahili a new visitor reads, on every page, and it is the line announcing that people are actually being paid — so the one string that should prove the platform settles is the one that reads like a bot.

*Critic's fix:* Compose the ticker as a Swahili sentence rather than a slot swap: "TZS 5K zimelipwa kwa HAPANA katika {soko}". Templates that interpolate an amount or a side into a verb phrase need per-locale sentence patterns, not per-locale words.

*Verifier:* Opened home__s00 (and markets__s00, detail__s00, updown__s00, results__s00, leaderboard__s00): the ticker reads "● MUBASHARA TZS 5K imekamilika HAPANA kwenye" and is cut at the viewport edge mid-word — it is a scrolling marquee caught mid-cycle, so the critic judged a fragment, not the string. The pattern also matches the product's own settled idiom seen in full on results__s01/s02/s03 ("Imekamilika HAPANA", "Imetatuliwa HAPANA"), so it is consistent house telegraphese, not a broken sentence. And "the identical string is pinned on every surface" is simply one global ticker component showing the same live event — not a defect at all.

#### CP-076 · ✅ upheld · 🟡 medium defect · `results__s00.png`
**The featured result card carries an English "SPORTS" category chip** — routed to: **U40 list**

*Seen:* The first card on the results board shows a blue pill reading SPORTS, immediately beside the gold Swahili chip "IMETATULIWA · NDIO" and the Swahili label "MATOKEO MASHUHURI". Every other card in the set — results__s01 through s04, and every market card — labels the same category MICHEZO.

*Why it matters:* One card style renders the raw category slug instead of the translated label, so the Swahili page shows an English word in a coloured chip at the top of its most prominent result. It also breaks the board's own scanning pattern: a reader filtering by eye for MICHEZO will never match this card.

*Critic's fix:* Route the featured card's category through the same translation lookup the standard card uses, and assert in a test that no rendered chip text equals an untranslated category key under sw.

*Verifier:* Opened results__s00: the featured card shows a blue pill reading SPORTS beside the gold "IMETATULIWA · NDIO" chip and "MATOKEO MASHUHURI". results__s01, s02 and s03 all label the same category MICHEZO, as do every markets card (markets__s02, s03, s04). A raw English category leaking onto the one card the board promotes is a real defect at the stated severity.

#### CP-077 · ✅ upheld · 🟡 medium defect · `results__s01.png`
**One settled card uses two different Swahili verbs for "settled"** — routed to: **U32/U40**

*Seen:* The lower card carries a gold chip reading IMEKAMILIKA, a status button reading "Imekamilika NDIO", and a footer line reading "Imetatuliwa NDIO" — three labels for one state, two different verbs, inside one card. The card above does the same with HAPANA. The featured card (results__s00) uses IMETATULIWA; the leaderboard counts "6 imetatuliwa"; the ticker uses imekamilika.

*Why it matters:* "Imekamilika" means finished or complete; "imetatuliwa" means resolved or adjudicated. For a prediction market these are not synonyms — one describes the event ending, the other the officer ruling and the payout being fixed. Showing both on one card leaves a player unsure whether the money has actually been decided, which is the one state they care about once their stake is in.

*Critic's fix:* Choose "imetatuliwa" — it matches the integrity copy "Uthibitisho wa utatuzi" and the detail page's "Kigezo cha utatuzi" — and use it in the chip, the status button and the footer alike. Reserve any "imekamilika" wording for the event itself, if that state is shown at all.

*Verifier:* Opened results__s01: the lower card carries the gold chip IMEKAMILIKA, the status button "Imekamilika NDIO" and the footer "Imetatuliwa NDIO" — three labels, two verbs, in one card; the card above does the same with HAPANA ("Imekamilika HAPANA" / "Imetatuliwa HAPANA"), and results__s02 repeats it. results__s00's featured chip says IMETATULIWA and leaderboard__s00 counts "6 imetatuliwa". A reader can reasonably think "completed" and "resolved" are two states, so medium/defect stands.

#### CP-078 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `home__s02.png`
**Countdown reads "siku 1 zimebaki" — a plural verb with a single day** — routed to: **U40 list**

*Seen:* The card footer on this frame reads "siku 1 zimebaki". The cards below read "siku 2 zimebaki" and "siku 75 zimebaki" (home__s04), which are correct, and the one-day form recurs on markets__s03, markets__s04 and live__s01.

*Why it matters:* With one day the Swahili must be "siku 1 imebaki", or more naturally "imebaki siku moja". The string was pluralised once for English and reused, so the countdown is wrong precisely on the last day — the day the most people look at it and the most money moves. A native reader notices instantly, and it undercuts the sense that anyone proof-read the board.

*Critic's fix:* Give the countdown a Swahili plural rule with a distinct one form ("imebaki siku 1" / "zimebaki siku {n}"), and check the hour, minute and second units for the same bug.

*Verifier:* Opened home__s02: the card footer reads "siku 1 zimebaki"; markets__s03 and live__s01 repeat it, and home__s04 shows the correct plural cases "siku 2 zimebaki" / "siku 75 zimebaki". N-class agreement should be "imebaki" for one. Real grammar slip, but the countdown number is unambiguous and nothing is miscounted, so low rather than medium. Note the critic's supporting list is partly wrong: markets__s04 shows "siku 2 zimebaki" twice, not the one-day form.

#### CP-079 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `detail__s02.png`
**The probability chart's range control is untranslated: 1W / 1M / ALL** — routed to: **U40 list**

*Seen:* The panel headed "UWEZEKANO WA NDIYO KWA MUDA" contains a segmented control reading 1W, 1M and ALL, with ALL in the selected, highest-contrast state. The axis beneath reads "12 Sep, 14 Sep, 15 Sep".

*Why it matters:* ALL is a plain English word occupying the most prominent state of the only interactive control on the detail page, and W/M are English initials for week and month. A reader who does not know English cannot tell what the third option shows — on the panel that visualises how the market's price has moved.

*Critic's fix:* Translate the range control: WIKI 1 / MWEZI 1 / ZOTE (ZOTE is no wider than ALL, so the layout is safe). Sweep the chart component for other hardcoded English labels.

*Verifier:* Opened detail__s02: under "UWEZEKANO WA NDIYO KWA MUDA" the segmented control reads 1W · 1M · ALL with ALL in the selected high-contrast pill, and the axis reads "12 Sep, 14 Sep, 15 Sep". Untranslated, as claimed. But 1W/1M are near-universal chart tokens and only "ALL" is真 English prose, on a small mono control that carries no money meaning — low, not medium.

#### CP-080 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `leaderboard__s00.png`
**Tier badges show English initials S and B beside a Swahili tier name, and the sort says ROI** — routed to: **U40 list**

*Seen:* The header card reads "DARAJA LA JUU Fedha" and "ROI BORA 26.8%"; the sort control reads "ROI bora". On the podium the circular tier badges beside @Dhiresh and @Libuhi read S, and @Jaykishan's reads B — repeated down the table on leaderboard__s01 for @Fulgence, @DEV and @James.

*Why it matters:* The tier is named in Swahili ("Fedha") but marked with the English initial of Silver; bronze is marked B where the Swahili is "Shaba". A Swahili reader is handed the letter of a word they were never shown. ROI compounds it — a finance acronym in a third language used as the label of the control that ranks players, on a page aimed at ordinary Tanzanian bettors. Between them, both of the leaderboard's ranking signals are unreadable in the page's own language.

*Critic's fix:* Derive the badge letter from the localised tier name (F for Fedha, S for Shaba, D for Dhahabu), or drop letters for colour plus an accessible name; and replace ROI with "Faida %" or "Faida bora", keeping ROI only as a parenthetical if the team insists.

*Verifier:* Opened leaderboard__s00: header card reads "DARAJA LA JUU Fedha" and "ROI BORA 26.8%", sort control "ROI bora", and the podium badges beside @Dhiresh and @Libuhi read S while @Jaykishan's reads B; leaderboard__s01 repeats B for @Fulgence, @DEV and @James. The S-for-"Fedha" mismatch is real. The ROI half of the claim is weak — ROI is a borrowed acronym in common Tanzanian financial use and has no crisp Swahili equivalent — and single-letter tier badges are a standard convention, so low.

#### CP-081 · ✅ upheld · 🟡 medium defect · `live__s00.png`
**The hero carousel's section label is clipped mid-phrase: "LILILO NA SHAKA…"** — routed to: **D47**

*Seen:* Inside the top hero card, left of the 1/6 pager arrows, the label reads "LILILO NA SHAKA…" with a trailing ellipsis. "Lililo na shaka" is a relative clause with nothing to complete it; the intended label is evidently something like "LILILO NA SHAKA ZAIDI" (most uncertain).

*Why it matters:* This is precisely the case where longer Swahili breaks a slot fitted to English: the English label fits, the Swahili does not, so the phrase truncates into a fragment that names nothing. That label is the only thing telling a visitor what the six rotating cards have in common, and it is the first thing on the live feed.

*Critic's fix:* Let the label wrap or shrink rather than truncate, and shorten the Swahili to something that fits the slot — "SHAKA ZAIDI" or "HAZIJULIKANI" both read as complete phrases at this width.

*Verifier:* Opened live__s00 and zoomed the label at 4x: it reads "LILILO NA SHAKA…" with a genuine single ellipsis glyph, immediately left of the 1/6 pager arrows — CSS truncation, not authored copy. The surviving fragment is a bare relative clause with no head, so the label conveys nothing. Not one of D1/D18 (different element). Medium/defect as claimed.

#### CP-082 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `updown__s00.png`
**Up & Down asks about "saa itakapoisha" (when the hour ends) for five-minute rounds** — routed to: **— not routed**

*Seen:* Under the title "Juu na Chini" the subtitle reads "Je, bei itakuwa juu au chini saa itakapoisha?". On the same frame the filter reads "Bitcoin · 5 dakika", the card badge reads "5 DAKIKA", the section above the strip is headed "RAUNDI ZA MWISHO", and the card's countdown to results shows 01:03.

*Why it matters:* "Saa" is an hour, or a clock. The strap line therefore tells a new player the bet resolves at the end of the hour while everything around it says the round is five minutes and closes in one. A first-time visitor sizing up the fastest game on the platform takes the timescale from the one sentence that explains it, and that sentence is wrong. It is also exactly what a literal rendering of a loose English "when time's up" produces.

*Critic's fix:* Name the round, not an hour: "Je, bei itakuwa juu au chini raundi itakapoisha?", and fix "raundi" as the term for the unit so it agrees with "RAUNDI ZA MWISHO" above it.

*Verifier:* Opened updown__s00: the subtitle is "Je, bei itakuwa juu au chini saa itakapoisha?" and the filter/badge do read "Bitcoin · 5 dakika" / "5 DAKIKA" with "RAUNDI ZA MWISHO" above and a 01:03 countdown. But "saa" in Swahili is also the clock/watch itself, so "saa itakapoisha" reads naturally as "when the clock runs out" — the critic's gloss "the hour" is one reading presented as the only one. The line is generic page copy that never asserts a duration, and nothing on the frame contradicts it. A wording preference, not a demonstrated defect.

#### CP-083 · ✅ upheld · 🟡 medium defect · `updown__s01.png`
**The same Up & Down round is called a football "mechi" in one panel and a "raundi" in another** — routed to: **U40 list**

*Seen:* The lower card's panel is headed "MECHI IJAYO INAENDELEA" over an empty —:— timer, and the line under the outcome reads "Mechi inayofuata tayari imeanza." The previous screen (updown__s00) calls the same objects "RAUNDI ZA MWISHO" and "Raundi".

*Why it matters:* "Mechi" in Tanzanian Swahili means a match — a football fixture. Applying it to a five-minute Bitcoin price round imports the wrong mental model into the one game on the platform that has nothing to do with sport, right next to a live BTC price. With a blank —:— timer sitting under a heading claiming the next one is already running, the panel reads as though it belongs to a different product.

*Critic's fix:* Use "raundi" for the unit throughout Up & Down and remove "mechi" from this surface: "RAUNDI IJAYO INAENDELEA", "Raundi inayofuata tayari imeanza." Fix the placeholder timer alongside it so heading and clock agree.

*Verifier:* Opened updown__s01: the lower card's panel is headed "MECHI IJAYO INAENDELEA" over an empty —:— timer, and the line under "Juu imeshinda" reads "Mechi inayofuata tayari imeanza." Opened updown__s00: the same objects are "RAUNDI ZA MWISHO", the toggle "Raundi", the history strip "za zamani → mpya". Two nouns for the core object of one game mode, one of them a football loanword applied to a Bitcoin price round. Real, and medium is fair.

#### CP-084 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `live__s03.png`
**A live market question is machine Swahili: "wanachama wa fiber-optic wanaotumika"** — routed to: **E-420**

*Seen:* The top card reads "Je, jumla ya wanachama wa fiber-optic wanaotumika nchini Kenya itazidi milioni 1.45 katika ripoti ya CA Q1 FY2026/27...".

*Why it matters:* Read back, this says "the total of fibre-optic members who are being used in Kenya". "Wanachama" means members of a club or party, not subscribers (wateja, waliojisajili), and "wanaotumika" is the passive "who are used" where the source meant active (wanaotumia huduma). It is a betting question with real money against it whose subject is nonsense in Swahili — the clearest case in the set of market copy translated by machine and never read by a speaker.

*Critic's fix:* Rewrite as "Je, idadi ya wateja wa mtandao wa fiber-optic wanaotumia huduma nchini Kenya itazidi milioni 1.45...", and put market titles through a human Swahili review before they go live, since these are the only strings a bettor reads word for word.

*Verifier:* Opened live__s03: the top card reads "Je, jumla ya wanachama wa fiber-optic wanaotumika nchini Kenya itazidi milioni 1.45 katika ripoti ya CA Q1 FY2026/27…" verbatim. "Wanachama" is members-of-an-association, not subscribers, and "wanaotumika" is passive ("who are used") where "active" was meant — the phrase does read as machine output. But it is one seeded market title, not a UI surface or a repeated string, so low rather than medium.

#### CP-085 · ✅ upheld · 🟡 medium defect · `results__s02.png`
**A settled HAPANA outcome is printed in the product's YES green** — routed to: **D29 (U32)**

*Seen:* The card shows "TOKEO" over a large HAPANA rendered in green — I sampled the glyphs at #41BF6F, the same family as the NDIO button green (#008036 on markets__s00) and the NDIO outcome on results__s03. Everywhere else HAPANA is red: the HAPANA button on markets__s00, the HAPANA percentage on live__s02, the HAPANA word in the ticker.

*Why it matters:* The product teaches one colour rule on its first screen — green is NDIO, red is HAPANA, and the needle between them is the brand mark. The results board breaks that rule at the moment of truth: the outcome word is green whichever side won, so a player scanning settled cards reads the colour before the word and thinks YES. On the one board where people check whether they won, colour and text disagree.

*Critic's fix:* Colour the settled outcome by side — green for NDIO, red for HAPANA — or, if the intent was "this is the final answer", use the gold settled treatment for both sides so green never means NO.

*Verifier:* Opened results__s02 and sampled the glyphs: the large "HAPANA" under "TOKEO" is #42C070; sampling the "NDIO" outcome word on results__s03 gives the identical #42C070, so both outcomes are painted in one green. The critic's #41BF6F is within a shade of the true value. Confirmed red elsewhere by sampling: NDIO button #008336, HAPANA button #D02B31 on markets__s00, HAPANA @ 17% red on live__s02, HAPANA red in the ticker. This breaks the §8a guardrail that the YES/NO inks keep their meaning, and a losing-side result reading in the win colour is a real comprehension risk on a money surface.

#### CP-086 · ✅ upheld · ⚪ low defect (claimed medium/defect) · `help__s02.png`
**Two different Swahili phrases for "play responsibly" appear on screen at once** — routed to: **U40 list**

*Seen:* The compliance strip mid-frame reads "18+ · Cheza kwa busara · Bara la Tanzania + Zanzibar pekee". The footer below it, on the same frame, is headed "CHEZA KISTAARABU". One screen up (help__s01) the card is titled "Kucheza kwa busara" with the sub-line "Vikomo · mapumziko · kujizuia", while the footer's own links read "Weka mipaka / Pumzika / Jizuie".

*Why it matters:* Responsible-gambling wording is copy a regulator and a worried player both read literally, and the one place consistency is the entire point. Here the duty is stated two ways on a single frame — "kwa busara" (wisely) and "kistaarabu" (in a civilised manner) — and the three tools are named twice with different nouns (vikomo vs mipaka). It reads like two translators who never met, on the surface where that is least affordable.

*Critic's fix:* Fix one compliance phrase in the dictionary — "Cheza kwa busara" is the plainer, more common Tanzanian form — and one name per tool (mipaka / mapumziko / kujizuia), then reference those keys from the footer, the help card and the strip instead of restating them.

*Verifier:* Opened help__s02: the compliance strip reads "18+ · Cheza kwa busara · Bara la Tanzania + Zanzibar pekee" and the footer below it on the same frame is headed "CHEZA KISTAARABU" with links "Weka mipaka / Pumzika / Jizuie". help__s01 confirms the card "Kucheza kwa busara" with sub-line "Vikomo · mapumziko · kujizuia", and home__s11 repeats the "CHEZA KISTAARABU" footer. Two names for one responsible-gambling programme, both visible at once — real. It is a synonym pair, not a wrong statement, so low.

#### CP-087 · ❌ refuted · ⚪ low taste (claimed medium/defect) · `live__s01.png`
**The same fixture is named three ways, two of them on this frame** — routed to: **— not routed**

*Seen:* The middle card reads "Je, Brentford NA Chelsea watapata kila mmoja angalau kadi 2 za njano katika mechi yao ya Premier League tarehe 18..." — NA in capitals mid-sentence — and the card directly beneath reads "Je, nusu zote mbili za mechi ya Brentford dhidi ya Chelsea (PL, Sep 18)...". The home board (home__s00) names the same fixture a third way: "Brentford vs Chelsea (Premier League, Sep 18)".

*Why it matters:* Capitalised NA is an English convention — AND set in caps to stress that both teams must do the thing — and it does not survive translation: in Swahili it just looks like a shouted typo, and the "both" emphasis it was carrying, which is the whole point of that market, is lost. Meanwhile the same match is NA, "dhidi ya" and "vs", and the competition is "Premier League" and "PL", on adjacent cards, so a bettor scanning for the Brentford game has to read every card because no two name it alike.

*Critic's fix:* Carry the emphasis in words rather than capitals — "Brentford na Chelsea wote wawili watapata..." — and settle one fixture convention ("X dhidi ya Y") and one competition name across all market titles.

*Verifier:* Opened live__s01. The two strings are there, but the critic has misread the first: "Je, Brentford NA Chelsea watapata kila mmoja angalau kadi 2 za njano..." is not a fixture name — it is a compound subject, and the capitalised NA is the deliberate rendering of the emphasised AND that distinguishes an each-team market from an either-team one (the same convention Polymarket-style titles use). The second card, "mechi ya Brentford dhidi ya Chelsea (PL, Sep 18)", is a different market with its own authored title, and the "vs" variant on home__s00 belongs to a third market. Different markets phrasing their own questions is not the same string rendered inconsistently.

#### CP-088 · ✅ upheld · ⚪ low defect · `detail__s02.png`
**The resolution criteria date the outcome American-style: "Novemba 30, 2026"** — routed to: **U40 list**

*Seen:* The top line of this frame, the tail of the resolution-criteria paragraph, reads "Novemba 30, 2026." — Swahili month name, month-day-year order. The market title (detail__s00) writes dates as "Okt 23–25" and the live board writes "tarehe 20 Septemba 2026".

*Why it matters:* Tanzanian Swahili puts the day first: 30 Novemba 2026. Month-first is an American habit that travelled with the English source. On the paragraph that defines exactly when and against which source the market is decided, a date in a foreign order is a small but real reading tax — and it is the third date format on a single page.

*Critic's fix:* Normalise every date in market copy and criteria to "tarehe {d} {Mwezi} {yyyy}", and generate these sentences from structured fields rather than translating an English sentence that already contains a formatted date.

*Verifier:* Opened detail__s02: the top line, clipped by the sticky header but legible, reads "Novemba 30, 2026." Swahili convention is day-first ("30 Novemba 2026"), and live__s02/s03 write exactly that ("tarehe 20 Septemba 2026", "tarehe 30 Septemba 2026"), while detail__s00 writes "Okt 23–25". Real inconsistency, correctly rated low.

#### CP-089 · ✅ upheld · ⚪ low defect · `home__s11.png`
**The responsible-gambling line carries two grammar slips** — routed to: **D53**

*Seen:* The italic line under the support contacts reads "Kama kucheza kamari imekuwa sio burudani, acha."

*Why it matters:* The subject is the infinitive "kucheza", so the verb must take ku- agreement — "kumekuwa", not "imekuwa" — and negation before a noun is "si", not "sio". As written, it is the sentence a careful reader stumbles over, and it is the platform's duty-of-care line, printed in the footer of every page including login. Getting the grammar wrong in the one sentence that says "stop if this stops being fun" costs exactly the credibility that sentence exists to earn.

*Critic's fix:* Rewrite as "Kama kucheza kamari hakujawa burudani tena, acha." and have a native speaker sign off the responsible-play block as a set rather than string by string.

*Verifier:* Opened home__s11: the italic line under the support contacts reads "Kama kucheza kamari imekuwa sio burudani, acha." The subject "kucheza kamari" is a ku- infinitive, so the verb should be "kumekuwa", not "imekuwa"; and the negative copula before a noun should be "si burudani", not "sio burudani". Both slips are exactly as described, on a compliance line. Low/defect stands.

#### CP-090 · ❌ refuted · ⚪ low taste (claimed low/defect) · `help__s01.png`
**Two FAQ entries are not questions in Swahili** — routed to: **— not routed**

*Seen:* The FAQ list includes "Nitatoa dau mapema?" and "Soko likifutwa?", alongside well-formed entries such as "Nitatoa pesa zangu vipi?" and "Kwa nini nathibitisha kitambulisho?".

*Why it matters:* "Nitatoa dau mapema?" reads "Will I take a bet out early?" — a prediction about the reader, not the capability question ("Naweza kuuza dau mapema?") the panel presumably answers; it also reuses "nitatoa" from the withdraw-money question two rows up, so two different money actions share one verb. "Soko likifutwa?" is a bare subordinate clause with a question mark — "if a market is cancelled?" — with no main clause. These are the questions a player scans when their money is stuck, and two of them do not parse.

*Critic's fix:* Rewrite as "Naweza kuuza dau langu mapema?" and "Itakuwaje soko likifutwa?", then check the rest of the FAQ for the same pattern of English headline fragments carried across without a Swahili main clause.

*Verifier:* Opened help__s01: both strings are present. But "Nitatoa dau mapema?" is a well-formed Swahili question (future tense + question mark, "will I cash out early?") — it is merely a future rather than a modal "can I", which is a phrasing preference, not ungrammatical. "Soko likifutwa?" is an elliptical conditional heading of exactly the kind English FAQs use ("If a market is voided?"), and the same list carries other well-formed entries. The finding as titled — that two entries are not questions — is half wrong and the remaining half is headline ellipsis.

#### CP-091 · ✅ upheld · ⚪ low defect · `markets__s02.png`
**A market title splits a verb in two: "wata shinda"** — routed to: **E-420**

*Seen:* The lower card reads "Je, Manchester City wata shinda Premier League 2026/27?" — tense marker and stem separated by a space. Other cards write the same construction correctly: "zitashinda" (home__s01), "itashinda" (results__s02), "watapata" (markets__s03).

*Why it matters:* Swahili verbs are written as one word; "wata shinda" is the equivalent of writing "will win" as "wil lwin". It appears on the market board at full title size, and it tells a native reader that whatever produced these titles does not know the language — which invites them to doubt the rest.

*Critic's fix:* Correct to "watashinda", and add a check over generated titles for a standalone subject-plus-tense fragment (wata, ita, zita, ata, uta followed by a space).

*Verifier:* Opened markets__s02: the lower card reads "Je, Manchester City wata shinda Premier League 2026/27?" with a space between the tense marker and the stem. The correct joined form appears on the same set — "zitashinda" (home__s01), "itashinda" (results__s02), "watapata" (markets__s03), "watasaini" (markets__s02 above it). A plain typo in one seeded title; low/defect as claimed.

#### CP-092 · ✅ upheld · ⚪ low defect · `markets__s03.png`
**One cold-start card says "none yet" in two different ways** — routed to: **U40 list**

*Seen:* The upper card shows "Bila dau bado" in the centre of the card and "Hakuna bwawa bado" in its footer row — two different negation patterns in one card, four lines apart. The same empty-bet state is worded "Hakuna dau bado" on the home board (home__s00, home__s01).

*Why it matters:* "Bila X bado" and "Hakuna X bado" are different registers — the first reads as a label ("without a bet yet"), the second as a sentence ("there is no bet yet"). Having both inside one card, with a third variant for the identical state on home, makes the empty card feel assembled rather than written. These are the cards a brand-new market shows to its very first visitor.

*Critic's fix:* Standardise on "Hakuna dau bado" for the empty-bet state, match the pool line to the same pattern, and delete the "Bila..." variant from the dictionary so it cannot be picked up again.

*Verifier:* Opened markets__s03: the upper card shows "Bila dau bado" in the card centre and "Hakuna bwawa bado" in its footer; home__s02 shows the same pair. home__s01's compact rows word the same empty-bet state "Hakuna dau bado". The critic's framing is loose — the two lines in the card describe different things (bets vs pool), so they are not two labels for one value — but the real inconsistency underneath is verified: the same no-bets-yet state is "Bila dau bado" on the full card and "Hakuna dau bado" on the compact row, on the same surface. Low.

#### CP-093 · ✅ upheld · ⚪ low taste · `home__s02.png`
**"Hakuna kete. Imani tu." lands as a statement of faith, not of judgement** — routed to: **U40 list**

*Seen:* The how-it-works opener reads "Kila swali ni tukio halisi lenye jibu la NDIO au HAPANA — linatatuliwa kupitia chanzo rasmi cha umma. Hakuna kete. Imani tu." — directly beneath the Swahili tagline "Tabiri matukio. Si bahati."

*Why it matters:* "Imani" in Tanzanian usage carries religious weight: faith, belief in something unproven. The English behind it is almost certainly conviction or judgement, and the paragraph's entire argument is that this is skill measured against a verifiable public source, not belief. So the closing beat quietly argues against the sentence before it. I would defend the two-word rhythm; it is the noun I would change, and a reasonable editor could disagree.

*Critic's fix:* Keep the cadence, change the noun: "Hakuna kete. Maamuzi tu." or "Hakuna kete. Uamuzi wako tu." — judgement rather than faith.

*Verifier:* Opened home__s02: the how-it-works opener reads exactly "Kila swali ni tukio halisi lenye jibu la NDIO au HAPANA — linatatuliwa kupitia chanzo rasmi cha umma. Hakuna kete. Imani tu." directly under the tagline "Tabiri matukio. Si bahati." "Imani" is faith/belief, so the Swahili renders the English "just conviction" as "only faith" — which argues against the very claim the line above makes (this is skill, not luck). A fair reading of a signature line; it is a copy-judgement call, correctly filed as low taste.

#### CP-094 · ❌ refuted · ⚪ low taste · `live__s00.png`
**"INASOGEA" is doing two jobs and is clear in neither** — routed to: **— not routed**

*Seen:* The hero card's needle carries the centred caption "INASOGEA" between "NDIO 50%" and "50% HAPANA", and the stats line at the top of the same card reads "32 hai · 1 inasogea". The same word appears as a blue card chip on home__s04 ("MUBASHARA · INASOGEA · NYINGINE").

*Why it matters:* "Inasogea" means it is moving closer. As a needle caption on a 50/50 market it suggests the price is drifting; as a count ("1 inasogea") it suggests one market is about to close; as a card chip it could be either. A Tanzanian reader will most naturally take it as approaching — that is, closing soon — which is not what a price-movement badge means. This is a judgement call rather than an outright error, but it is the board-level signal that tells a player where the action is.

*Critic's fix:* Split the concept: "INABADILIKA" (changing) or "BEI INAPANDA / INASHUKA" for price movement, and "INAKARIBIA KUFUNGWA" for closing soon, so the chip, the count and the needle caption each say one thing.

*Verifier:* Opened live__s00 and home__s04. Every use is the same job: "32 hai · 1 inasogea" counts markets that are moving, the needle caption "INASOGEA" says this market's price is moving, and the blue chip on home__s04 tags that market as moving. One concept, three placements — that is a consistent token, the opposite of the claim. The 50/50 needle under the caption is the cold-start price shown on a market with no bets, which is a separate, already-logged issue (D29), not evidence of an ambiguous word.

#### CP-095 · ❌ refuted · 🟡 medium defect · `leaderboard__s00.png`
**Podium handles break mid-word on the Swahili default** — routed to: **— not routed**

*Seen:* The three podium names wrap inside their columns as "@Dhire / sh", "@Libuh / i" and "@Jayki / shan".

*Why it matters:* Confirming the known defect is still present with Swahili as the default, where the labels under the names ("18 imetatuliwa", "6 imetatuliwa") are longer than their English equivalents and squeeze the columns further than the English capture would suggest.

*Critic's fix:* As already planned for D2; size the columns against the Swahili label, which is the longer of the three locales here.

*Verifier:* Opened leaderboard__s00 and the break is there exactly as described ("@Dhire / sh", "@Libuh / i", "@Jayki / shan") — but this is D2 in the known-defect list, verbatim including the same example: "Leaderboard podium handles break mid-word ('@Dhire / sh')", `leaderboard/page.tsx:591-594`. Not a new finding.

#### CP-096 · ❌ refuted · 🟡 medium defect · `detail__s01.png`
**The chat bubble covers the tail of the resolution criteria** — routed to: **— not routed**

*Seen:* Zoomed, the criteria paragraph reads "...Tanzania Tourist Board (TTB) itathibitisha kwam" with the rest of the word vanishing under the circular chat bubble; the same occlusion cuts "litafungwa n[dani]" out of the home hero card title (home__s00).

*Why it matters:* Confirming the known bubble overlap on the Swahili default, and noting that on this surface it lands on the resolution criteria — the paragraph defining when a player gets paid — not only on card chrome.

*Critic's fix:* As already planned for D3; when choosing the bubble's resting position, test it against the detail page's criteria panel, not just card footers.

*Verifier:* Opened detail__s01 and home__s00: the occlusion is real — the criteria line ends "...Tourist Board (TTB) itathibitisha kwam" under the bubble, and the home hero title is cut at "litafungwa n". But this is D3 ("52px chat bubble covers card Details / 'Maelezo' / a tier badge", `ChatRoot.tsx:313-319`), and the brief's escalation note names the chat bubble overlapping card text explicitly as already found. Not new.

#### CP-097 · ❌ refuted · 🟡 medium defect · `results__s00.png`
**HAPANA filter tab is cut mid-word by the result count** — routed to: **— not routed**

*Seen:* The filter strip reads "Zote 171 · NDIO 59 · HAPAI" with the HAPANA tab clipped where the fade meets "masoko 171". It stays clipped at every scroll position on this surface (results__s01 through s04).

*Why it matters:* Confirming the known strip collision at 360 in Swahili, where HAPANA is two characters longer than NO, so the tab loses letters rather than trailing space — the clipped label is the filter half the board's readers want.

*Critic's fix:* As already planned for D1.

*Verifier:* Opened results__s00 through s03: the strip reads "Zote 171 · NDIO 59 · HAPAI" with the tab clipped where the fade meets "masoko 171", at every scroll position. Confirmed — and it is D1 verbatim: "Status strip's half chip collides with the result count (412 EN, 360 SW)", `.kp-strip-fade` `globals.css:3063-3068`. Not a new finding.

### Completeness critic — 19 claims, 19 kept

#### CP-098 · 🕓 no verifier (checked in code where routed) · 🟠 high defect · `leaderboard__s00.png`
**A floating chat button covers content on seven surfaces, including a ranked player's ROI and the card's details link** — routed to: **D3 (U7)**

*Seen:* A round chat-bubble button pinned about 40px above the bottom rail, at the right edge. leaderboard__s00: it sits on @Jaykishan's ROI so '-3.9%' reads '-3.9', and it covers the B tier badge and part of '44 imetatuliwa'. markets__s00: it covers the lower half of the card's (i) button and cuts 'Maelezo' to 'Maele'. results__s00: it covers '2026)' at the end of the featured title. results__s01: it covers 'Imetatuliwa NDIO' and 'Maelezo'. detail__s01: it covers words in the resolution-criteria paragraph ('kwam…'). home__s01: it overlaps the right end of the main 'Fungua akaunti' button. help__s00: it sits on the 'Mazungumzo ya moja kwa moja' live-chat card, so two chat entry points overlap. leaderboard__s01: it covers 'WhatsApp' in the footer. The pinned-element list in the page JSON has only the top bar, discovery bar and bottom rail, so the 237px/121px chrome figures leave the button out.

*Why it matters:* It hides the figure a player is ranked by, the only link from a card to its detail page, and the legal resolution text. Because the measurement ignored it, every density and chrome finding in the panel understates how much of the screen is blocked.

*Critic's fix:* Take the button out of the content column: put 'Msaada/Chat' in the Zaidi sheet or as a sixth rail item. If it must float, keep a matching bottom padding on scroll containers and hide it while a card's footer row is under it. Add it to the pinned-element instrument.

#### CP-099 · 🕓 no verifier (checked in code where routed) · 🟠 high defect · `home__s00.png`
**The home page's largest headline is in English, with YES and NO in the product's outcome colours** — routed to: **owner 5 (U6)**

*Seen:* With lang=sw, the hero's display headline reads 'The wisdom of YES & NO.' (YES in green, NO in pink-red), about 90px tall. About 700px lower, the sentiment caption reads '76% NDIO · 24% HAPANA', and every button on the page says NDIO/HAPANA. The Swahili-reader lens listed 19 wording issues and none of them is this.

*Why it matters:* It is the first and largest text a Swahili-default visitor reads, and it teaches the outcome words in a language the rest of the product never uses. The team's own vocabulary finding (NDIO vs NDIYO) matters less than this.

*Critic's fix:* Set the hero from the dictionary: for example 'Hekima ya NDIO na HAPANA.' Keep the green/red on NDIO/HAPANA. Keep the English line only for lang=en.

#### CP-100 · 🕓 no verifier (checked in code where routed) · 🟠 high defect · `leaderboard__s00.png`
**All three podium usernames break mid-word** — routed to: **D2 (U10)**

*Seen:* In the podium card the names wrap inside narrow columns: '@Dhire / sh', '@Libuh / i' (the first-place player, with one letter alone on the second line) and '@Jayki / shan'. The S/B tier badge beside each name pushes it narrower still.

*Why it matters:* The one screen built to celebrate named people cannot show a name whole. The first-place name reads as '@Libuh' plus a stray 'i'.

*Critic's fix:* Put the tier badge on the avatar instead of inline with the name, and stop names breaking inside words (no break-all, ellipsis on one line). Or stack name above badge in a column at least 104px wide.

#### CP-101 · 🕓 no verifier (checked in code where routed) · 🟡 medium defect · `results__s00.png`
**The scrolling filter tabs fade out the third tab, and on /results that hidden tab is HAPANA** — routed to: **D1 (U9)**

*Seen:* results__s00, tab row: 'Zote 171 | NDIO 59 | HAPA▒' – the HAPANA tab fades to transparent after 'HAPA', and its count (88) is not visible. A monospace lowercase 'masoko 171' sits right after it on the same baseline, repeating 'Zote 171'. markets__s00 does the same: 'Wazi 32 | Zinafunga leo 0 | ▌ | masoko 32', with the third tab reduced to one faded stroke.

*Why it matters:* Only one of the two outcome filters can be read. A player looking for markets that resolved NO sees 'HAPA' cut off, and the extra count looks like a fourth tab.

*Critic's fix:* Move the result count out of the tab row (under the search field, or into the sort row). With it gone the three tabs fit in 328px. If they still overflow, start the fade after the last fully visible tab.

#### CP-102 · 🕓 no verifier (checked in code where routed) · 🟡 medium defect · `leaderboard__s01.png`
**The same player gets two unrelated avatars on one page, and list avatars add random off-palette colours** — routed to: **U10 low**

*Seen:* leaderboard__s00 podium: DH/LI/JA are navy discs with a gold horizontal rule, three gold dots, a double ring (pale blue outside, gold inside) and a rank chip. leaderboard__s01 list: the same @Dhiresh and @Jaykishan are plain gradient discs with one ring and no rule or dots. @DEV's list avatar is a violet-magenta gradient with a tan ring, and @James's is teal-to-blue with a pale ring. Neither hue appears anywhere else in the palette. @Jaykishan and @James both render 'JA' in near-identical plates.

*Why it matters:* Avatars are the only picture of a person in the product, and they do not identify anyone: one person looks like two, two people look like one, and the hues break the five-colour system the colour lens described.

*Critic's fix:* Use one avatar component everywhere, with the podium adding only a ring or metal on top. Pick background colours from a fixed palette hashed on user id, and use two letters from the handle that differ (JK and JM).

#### CP-103 · 🕓 no verifier (checked in code where routed) · 🟡 medium defect · `markets__s00.png`
**A predictor avatar labelled '69' looks like '+69 more' beside '3 watabiri'** — routed to: **U32 low**

*Seen:* markets__s00, first card: three overlapping avatars. The first two overlap so much that only 'D(' and 'D' show; the third reads '69'; then '3 watabiri'. home__s04 shows the same '69' avatar alone beside '1 mtabiri', which proves it is a player's initials, not an overflow count.

*Why it matters:* '+N' is the standard way to show extra people in an avatar stack, so '69' next to '3' reads as a contradiction on the busiest card on the board. The two cut-off initials carry no information.

*Critic's fix:* Overlap avatars by no more than 30% so initials stay readable. Never render numeric initials: fall back to the first letter, or a neutral person glyph for handles that start with a digit. Put overflow counts in a visibly different '+N' chip style.

#### CP-104 · 🕓 no verifier (checked in code where routed) · 🟡 medium defect · `login__s00.png`
**The sign-in form shows the sign-up password rule and a placeholder that looks like a filled password** — routed to: **D48**

*Seen:* Under NENOSIRI, the empty field shows eight spaced dots (sampled #899DD1, the same colour as the '712 345 678' placeholder), and the helper below says 'Angalau herufi 8.' (at least 8 characters). The top bar on this page still shows an 'Ingia' button, which leads to the page you are on and is not marked as current.

*Why it matters:* A returning player sees what looks like a saved password and a rule that only applies when creating one. Both suggest the field is already filled or the account is new. The extra Ingia button is a dead end.

*Critic's fix:* Replace the dot placeholder with an empty field or 'Weka nenosiri'. Drop the min-length helper on login and keep it on registration. On /auth/login, hide the top-bar Ingia button or show it as current.

#### CP-105 · 🕓 no verifier (checked in code where routed) · 🟡 medium defect · `detail__s04.png`
**The discussion panel's only button says 'sign in to predict', not 'sign in to comment'** — routed to: **D8 (§3b)**

*Seen:* In the 'Majadiliano 0' card, the full-width outline button reads 'Ingia ili kutabiri', above 'Hakuna maoni bado — anza mazungumzo.' The same 'predict' wording appears on the betting panel higher up the page (detail__s00, 'INGIA ILI KUTABIRI').

*Why it matters:* Someone who wants to comment is told signing in is for betting. For a player who has never bet, commenting looks like it requires a wager.

*Critic's fix:* Change the label to 'Ingia ili kutoa maoni'.

#### CP-106 · 🕓 no verifier (checked in code where routed) · 🟡 medium defect · `home__s03.png`
**The how-it-works section shows players an internal admin setting** — routed to: **owner 8**

*Seen:* Step 02 body: 'Afisa anathibitisha — wawili, pale idhini ya maafisa wawili inapowashwa.' (An officer confirms — two, when two-officer approval is switched on.)

*Why it matters:* A trust promise that depends on a switch tells a first-time player the safeguard is sometimes off. It is operator configuration written as marketing.

*Critic's fix:* State the guarantee players actually get ('Kila matokeo yanathibitishwa na afisa kabla ya malipo'), or say 'maafisa wawili' outright if two-officer approval is always on in production.

#### CP-107 · 🕓 no verifier (checked in code where routed) · 🟡 medium defect · `results__s01.png`
**Markets and rounds nobody bet on are shown as full results** — routed to: **no-owner**

*Seen:* results__s01: a settled card 'Je, Newcastle United watapata kadi za njano zaid…' with a gold IMEKAMILIKA chip, a large green 'NDIO', the needle at the exact centre, '0 watabiri', 'TZS 0' and an 'Imekamilika NDIO' pill – about 290px of card. updown__s01: a finished Bitcoin round shows 'Juu imeshinda' in green with the from→to price, while 'JUMLA TZS 0' and the player icon shows 0.

*Why it matters:* The results board announces who won money, yet a new visitor sees wins declared where no one took part, alongside the few real payouts. The 171-market count is inflated by empty markets.

*Critic's fix:* On /results, hide or collapse zero-pool markets into a single line ('Soko lilifungwa bila dau'). Exclude them from the headline counts and the chart, or show them in a distinct neutral state without the winner styling.

#### CP-108 · 🕓 no verifier (checked in code where routed) · 🟡 medium defect · `home__s00.png`
**The bottom rail has a permanent gold badge nobody explains, and on the home page it lights up the Markets tab** — routed to: **U33**

*Seen:* A gold dot sits on the Juu/Chini rail icon in every frame of every surface (home, markets, results, live, leaderboard, help, login, detail, updown). It never clears, and gold is the money colour. On home__s00 at route '/', the Masoko tab is highlighted as active, the same state as markets__s00. There is no Home item.

*Why it matters:* A badge that never clears trains players to ignore badges, and nothing says what it is for. Showing home and /markets as the same tab gives no signal of where you are, and tapping Masoko on home goes to a different page than the one it claims is open.

*Critic's fix:* Remove the dot, or tie it to a real event (a round opening) and clear it once the tab is visited. Show no rail item as active on '/', or add a Nyumbani item.

#### CP-109 · 🕓 no verifier (checked in code where routed) · 🟡 medium defect · `login__s02.png`
**The global footer ships a dead 'coming soon' link, casino 'RTP' wording, and money-making offers under the heading 'Integrity'** — routed to: **owner 9**

*Seen:* Under UADILIFU (integrity): 'Pendekeza masoko upate pesa' carries an 'INAKUJA' (coming soon) pill with a clock; 'RTP ya mchezo na sheria'; 'Kuwa wakala'. Under FARAGHA: 'Sera ya AML / KYC'. The same block repeats in home__s11, updown__s02 and leaderboard__s01. Home's own section headline (home__s02) is 'Tabiri matukio. Si bahati.'

*Why it matters:* RTP (return-to-player) is slot-machine language and contradicts the 'not chance' pitch. A feature marked 'coming soon' is advertised on every page. Offers to earn money filed under 'integrity' read like a pitch sitting inside the compliance section. RTP, AML and KYC are English acronyms a Swahili reader has to guess.

*Critic's fix:* Rename the RTP link to something like 'Ada na jinsi malipo yanavyohesabiwa'. Remove the INAKUJA row until the feature ships. Move 'upate pesa' and 'Kuwa wakala' into their own column (for example 'Pata pesa'). Spell out AML/KYC in Swahili ('Uthibitisho wa utambulisho').

#### CP-110 · 🕓 no verifier (checked in code where routed) · 🟡 medium defect · `updown__s00.png`
**Correction to the art-direction lens: Up & Down does not drop the currency. It shows two currencies on one card.** — routed to: **no-owner**

*Seen:* updown__s00: the price strip reads 'BITCOIN $75,824.01', the round card shows '$75,824.01 0.00%', and the same card's pool reads 'JUMLA TZS 0'. updown__s01 shows 'Ufunguzi $75,824.01' and '$75,819.68 → $75,824.01' beside 'JUMLA TZS 0'.

*Why it matters:* The upheld claim ('drops … the currency entirely') would send the fix the wrong way. For someone who has never bet, a card with dollars and shillings side by side raises the question of which currency their stake is in.

*Critic's fix:* Label the price as the reference asset ('Bei ya BTC (USD)') in a muted style, and set the stake and pool in the house money style so TZS is clearly the player's currency.

#### CP-111 · 🕓 no verifier (checked in code where routed) · ⚪ low defect · `updown__s00.png`
**Two icon-only buttons in the Up & Down header have no labels** — routed to: **U5**

*Seen:* To the right of the 'Juu na Chini' title are two pill buttons: one holds only a receipt/scroll glyph, the other a briefcase glyph plus a chevron. Neither has text nearby. Every other header action in the product has a label (for example 'SHIRIKI' on detail__s00).

*Why it matters:* A first-time player cannot guess that these are probably rules/history and portfolio, so the one place to learn how the game works is hidden behind a picture.

*Critic's fix:* Add short labels ('Sheria', 'Dau zangu'), or at least visible captions under the icons at phone width.

#### CP-112 · 🕓 no verifier (checked in code where routed) · ⚪ low taste · `help__s01.png`
**Icons are reused and mismatched: withdraw is an upload arrow, gambling harm is a pause glyph, and the scales mean three things** — routed to: **U39**

*Seen:* help__s01 FAQ: 'Nitatoa pesa zangu vipi?' (how do I withdraw) uses an upload arrow ↑; 'Nina shida ya kucheza kupita kiasi' (I have a gambling problem) uses a media pause ‖. The balance-scales glyph is the Masoko rail icon, the 'NYINGINE' (other) category icon (home__s04, detail__s03) and the large card watermark behind the title on detail__s00.

*Why it matters:* No lens reviewed icons. The pause glyph makes the most sensitive help question look like a player control, and one glyph for markets, 'other' and decoration drains it of meaning.

*Critic's fix:* Use a download/cash-out glyph for withdrawal and a heart or hand-support glyph for gambling harm. Give 'Nyingine' its own neutral glyph (a dot grid) and keep the scales for Masoko only.

#### CP-113 · 🕓 no verifier (checked in code where routed) · ⚪ low taste · `live__s00.png`
**The live hero carousel has three pagination controls for one set of six slides** — routed to: **U36**

*Seen:* Inside the hero card: prev/next circle buttons with '1 / 6' between them at the top right, plus a row of six dots (the first a teal pill) under the 'Fungua soko →' button, about 330px lower.

*Why it matters:* It takes vertical space in a card the layout lens already found crowded, and it puts two navigation clusters around the one call to action.

*Critic's fix:* Keep the dots (swipe) and one '1/6' indicator. Drop the arrow buttons on touch widths, which also frees room for the clipped 'LILILO NA SHAKA…' label.

#### CP-114 · 🕓 no verifier (checked in code where routed) · ⚪ low defect · `detail__s03.png`
**'Similar markets' repeats the same event under a second spelling and lists an unrelated geopolitics market** — routed to: **E-420**

*Seen:* The page title (detail__s00) is 'Je, S!TE 2026 (Swahili International Tourism Expo…) itavutia maonyesho 200 au zaidi?'. Under 'Masoko yanayofanana' (detail__s03) are 'Je, Marekani na Iran watasaini makubaliano rasmi ya amani…' and 'Je, Swahili International Tourism Expo (SITE) 2026…'. The same event is styled 'S!TE' in one and 'SITE' in the other. detail__s02's source link is the generic 'https://www.cnbc.com/africa/' homepage.

*Why it matters:* The recommendations match on the 'Nyingine' category, not meaning. A near-duplicate question on the same expo looks like an error, and a news homepage as the named source is not something a player can check an exhibitor count against.

*Critic's fix:* Rank similar markets by shared entity or tags, and leave out questions on the same event (or group them under it). Use one spelling of the expo name. Link the source to the specific TTB/SITE report page, or name the document if no URL exists yet.

#### CP-115 · 🕓 no verifier (checked in code where routed) · ⚪ low defect · `login__s00.png`
**The live ticker is cut off at the screen edge with no fade, and its label is the English ISO code 'SW'** — routed to: **U33**

*Seen:* On every surface the ticker line ends with a hard cut at x=360: 'TZS 5K imekamilika HAPANA kwenye' (the last letter half-cut). The tab strips on /results and /markets do use a fade mask. The language button beside it reads 'SW', an ISO code. The ticker prints HAPANA in red, which shows the product already knows the correct NO colour that /results gets wrong.

*Why it matters:* The top line of every page ends in a broken word. For a Swahili reader the language control is labelled with English code rather than 'Kiswahili' or 'KI'.

*Critic's fix:* Apply the same right-edge fade mask used on the tabs. Label the switcher with the language's own name ('Kiswahili ▾' / 'English').

#### CP-116 · 🕓 no verifier (checked in code where routed) · ⚪ low defect · `login__s01.png`
**In the footer, contact details look exactly like navigation links** — routed to: **U20**

*Seen:* Under CHEZA KISTAARABU, five rows share one size, weight and colour: 'Weka mipaka' and 'Pumzika / Jizuie' (links to tools), then 'Wasiliana nasi · 0769777877', 'Simu ya msaada · 0800 11 0011' and 'Barua pepe · msaada@50pick.tz'. None has an icon, underline or call/email affordance.

*Why it matters:* The helpline is the most important item in that column for someone in trouble, and nothing marks it as tappable, or marks the links as different from it.

*Critic's fix:* Put the helpline in its own row with a phone icon and a tel: link, styled as an action. Leave the two tool links as plain links.

