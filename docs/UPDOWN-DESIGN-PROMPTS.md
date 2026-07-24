# Up & Down — Claude Design brief

> **One document. Paste §1–§7 as the opening message of the Claude Design session,
> then run the five surface prompts (§8) one at a time, D1 first.**
>
> Ali's Claude Design project already carries the 50pick kit, so §3 is a *reminder and
> a set of guard-rails*, not a re-derivation. If a fresh session is ever needed with no
> 50pick context, §3 plus the token table in `docs/DESIGN_AUTHORITY.md` is the minimum
> to hand it.
>
> **Review gate: nothing gets built until Ali signs off what comes back.** Anything
> off-brand is re-prompted, never hand-corrected in code.

---

## 1 · What we are designing, and why

50pick is adding a **second product line**. Everything to date has been *long-form*:
a poll about a football match, an exchange rate, a rainfall total — placed today,
resolved in a day or a week.

**Up & Down** is the opposite: a player bets whether the price of a commodity will be
**higher or lower than it is right now**, when a countdown reaching **5, 15 or 30
minutes** hits zero. Rounds run **back-to-back in continuous chains** — one ends, the
next is already open. Launch assets are **Gold and Silver**.

Three destinations now exist, and the split matters to the design:

| Destination | Holds |
|---|---|
| **Markets** | long-form polls only — a day or more |
| **Up & Down** | short-term price rounds only — 5 / 15 / 30 min |
| **Live** | everything, both product lines |

**The feeling we are after:** the existing Markets board is *considered* — you read,
you think, you commit. Up & Down is *immediate* — a heartbeat, a countdown, a price
moving in front of you. It must feel faster and tenser than the rest of the app
**without becoming a different app**. Same materials, higher tempo.

**The feeling we are NOT after:** a casino. No flashing, no confetti, no slot-machine
energy, no urgency manufactured beyond the genuine countdown. This is a licensed
real-money product in Tanzania and it must look like one — trustworthy first, exciting
second.

---

## 2 · Product mechanics you need in order to design it correctly

- The player picks **Up** or **Down** and stakes an amount in **TZS**.
- It is **pari-mutuel**: everyone who backs a side shares that side's pool. The
  **"× 1.4" figure on the buttons is a display-only estimate, not a fixed odds
  payout** — the real payout depends on how the pools end up. It therefore always
  needs a short qualifier near it. Never design it to look like a guaranteed return.
- **The open price is the line.** The round is settled by comparing the closing price
  to the price at the moment the round opened.
- **The price comes from a named external source**, captured at open and read again at
  close. Both readings, both source links, and **the timestamp the source itself
  quoted** are stored and shown. This is the product's trust story — design it as
  such.
- **Confirming the close price can take time.** When it does, the round shows a
  **"Confirming price"** state. It is deliberate, not broken, and it must **never show
  a guessed or placeholder number**. This is a hard platform rule: real data or
  nothing.
- **A round can VOID.** If the price does not move enough to call, or the source can't
  be confirmed, every stake is refunded in full. This is a *neutral* outcome, not a
  failure — do not style it as an error.
- **A round can be one-sided.** If everyone picks the same side there is nobody to win
  from, so all stakes are refunded. We call this a **"one-sided win"** — never
  "one-sided market".
- Selections close, then the result arrives shortly after. There is a short window
  where betting is shut but the outcome is not yet known.

---

## 3 · Brand guard-rails (the things that would be wrong)

Short version of the system, biased toward the rules that are easiest to break:

- **One dark theme.** Deep royal indigo (hue 268). There is **no light mode** and no
  toggle. Do not return a light variant of anything.
- **YES/UP = green, NO/DOWN = rose.** They appear **only inside betting actions**.
  Never as a navigation colour, never inverted, never re-hued, never decorative.
- **Gold is for earned money only** — a win, a payout, the final money-commit button.
  Never a nav item, never a chip, never decoration.
- **Cyan accent** is for links and the active-nav state. Sparing. Never semantic.
- **Every number is JetBrains Mono** — prices, countdowns, currency, percentages,
  counts. Headings are Sora; body is Inter.
- **Currency is always `TZS 320,000`** — thousands separators, TZS prefix. Never KSH,
  never `$` for the player's money, never a bare number. *(The asset's own price is
  quoted in USD because that is what the source publishes — that is the one place a
  `$` is correct, and it must be visually distinct from the player's TZS.)*
- **No emojis.** Anywhere.
- **Colour is never the only signal** — always pair green/rose with an arrow or a word.
- **16px** card/modal radius, **12px** inputs. Buttons are solid fills with a subtle
  inset top highlight, not outlines. Chips are uppercase, 700 weight, ~0.06em tracking.
- **360 / 768 / 1280 / 1920.** Zero horizontal overflow at 360. Tap targets ≥ 40px.
- **WCAG 2.1 AA** — 4.5:1 text contrast, visible focus, reduced-motion honoured.
- Copy is English but ships in **Swahili and Chinese** — every label must survive
  ~35% text expansion without clipping or truncation.

---

## 4 · The five surfaces

| # | Surface | Purpose |
|---|---|---|
| **D1** | **UpDownCard** | The iconic surface. A grid of these *is* the product. |
| **D2** | **/updown board** | Asset + duration switching, the card grid, results heartbeat. |
| **D3** | **Round detail** | Commit a stake; afterwards, verify the result was honest. |
| **D4** | **Admin console** | Operators run the chains and watch the price oracle. |
| **D5** | **Bottom nav glyph** | A 5th destination needs an icon that doesn't collide. |

Run **D1 first** — D2 and D3 inherit its language.

---

## 5 · What I need back (this is the important part)

For **every** surface, three things. A picture alone is not enough — I am implementing
this in code and I need to hit it exactly.

### 5.1 The visual design
All states, at the specified widths. Rendered, not described.

### 5.2 An implementation spec (redlines, in text)
For each element, the **exact** values:
- font family, size, weight, line-height, letter-spacing
- colour, given as the **token name** where one exists (`--yes-400`, `--text-subtle`,
  `--bg-elevated`), and a raw value only where it doesn't
- padding, margin, gap, width, height, radius, border weight
- shadow/elevation recipe
- what changes at each breakpoint

Give it as a table or a nested list per component region. If you invent a value that
isn't in the existing kit, **say so explicitly and justify it** — I need to know what
is new so I can add it to the kit properly rather than hard-code it in one file.

### 5.3 A component contract
A proposed prop list for each component, with types and which are optional — e.g.

```
UpDownCard
  assetName        string
  assetIcon        "gold" | "silver"
  durationMinutes  5 | 15 | 30
  livePrice        number | null      // null => still loading, never render 0
  openPrice        number
  movePct          number | null
  secondsLeft      number
  volumeTzs        number
  players          number
  upPct            number             // 0..100
  state            "open" | "closing" | "confirming" | "resolved" | "void"
  outcome          "UP" | "DOWN" | null
  sourceName       string
  sourceQuotedAt   string             // ISO
```

Plus, for each component: **which states are mutually exclusive**, and **what renders
when a value is unknown**. The second one matters more than it sounds — "real data or
nothing" is a platform rule, so every field needs a defined empty state rather than a
zero.

### 5.4 Format
Clean markdown, one section per surface, in this order: visual → redlines → contract →
notes. Call out anything you were unsure about in a short "OPEN QUESTIONS" list at the
end rather than silently picking. **Do not** produce production React — I will build it
against the existing kit primitives. Static HTML/CSS to demonstrate the design is
welcome; a component library is not.

---

## 6 · Acceptance criteria

I will check the returned work against exactly this list:

- [ ] No light-mode variant anywhere
- [ ] Gold appears **only** on win / payout / money-commit
- [ ] Green + rose appear **only** inside betting actions, and never as the sole signal
- [ ] Every number is monospaced; player money reads `TZS 1,234,567`
- [ ] No emojis
- [ ] The card shows **all four** of volume, players, amount, timer — at 360px
- [ ] The **"Confirming price"** state is calm, deliberate, and shows **no invented number**
- [ ] The **VOID / refunded** state is neutral, not an error
- [ ] The "× 1.4" figure is visibly an *estimate*, not a promise
- [ ] Card heights and button baselines align across a grid row
- [ ] Nothing clips at 360px — verified with a long asset name and a 9-digit volume
- [ ] The settlement proof reads as an auditable receipt, and carries **both** source
      links and **both** source-quoted timestamps
- [ ] Every element has a redline value and a token name
- [ ] Every new value not already in the kit is flagged as new

---

## 7 · What not to do

- Don't restyle or "improve" the existing MarketCard — Up & Down is a sibling, and the
  two must sit on `/live` together without looking like two different products.
- Don't introduce a new colour system, a second accent, or a gradient language.
- Don't design a light theme, a theme toggle, or a "dark mode" variant.
- Don't add gamification — streak flames, combo meters, leaderboards on the card,
  celebratory bursts. The countdown is the only tension we want.
- Don't invent data. If a number would be unknown at that moment, design the empty
  state instead of filling it in.
- Don't use `$` for the player's stake, balance, or winnings.

---

## 8 · The five prompts

Run in order. Paste §1–§7 once at the start of the session, then these one at a time.

---

### D1 · UpDownCard — the iconic surface

```
Design the Up & Down round card — surface D1. It appears in a grid, dozens at a time,
and has to stay legible at 360px. It is a faster, tenser cousin of the MarketCard, not
a restyle of it.

ANATOMY, top to bottom:

· Header — circular asset icon (40px); "Gold Up or Down" with a "5 MIN" chip beside
  it; a second line with a pulsing red LIVE dot + "LIVE · GOLD" uppercase and subtle.
  Right-aligned: the live price in mono ($2,417.60) coloured green or rose with a
  direction arrow, and the % move (-0.30%) beneath it in the matching colour.

· Countdown — large mono, digital-clock feel, "04:12". The loudest element after the
  price. Shifts to rose and pulses in the final 30 seconds.

· Stats band — mandatory, all four must survive 360px: volume "TZS 320,000";
  players (person glyph + "25"); the Up/Down pool split as a thin green/rose bar with
  mono percentages; and the countdown above counts as the fourth.

· Stake row — sunken input, "TZS" prefix label, amount "100" in mono, and
  right-aligned an arrow + projected return "→ 140".

· Actions — two equal solid buttons: "Up × 1.4" (green, up-trend arrow) and
  "Down × 1.4" (rose, down-trend arrow). Include the qualifier that marks × 1.4 as an
  estimate — you choose where it reads best without cluttering the card.

· Footer — one quiet line: "Source: Kitco · quoted 14:34:58". A trust signal. Small,
  always present, never dropped at 360px.

STATES — give me all seven:
  1. Open for betting
  2. Final 30 seconds (urgency)
  3. Selections closed — 00:00, buttons disabled, "Awaiting result"
  4. CONFIRMING PRICE — waiting on the source. Calm and deliberate, NOT an error, and
     showing no guessed number.
  5. Resolved UP — result revealed, winning side marked
  6. Resolved DOWN
  7. VOID / refunded — price didn't move enough, stakes returned. Neutral, not failure.

WIDTHS: 360px single column, and inside a 3-across grid at 1280px.
STRESS TEST: one extra variant with a long asset name and a 9-digit volume.

Then give me the redlines and the component contract as specified in §5.
```

---

### D2 · /updown board

```
Design the Up & Down page — surface D2, built from the D1 card.

· Page header: title, a one-line plain-language explanation, and a live price tape
  showing each asset's current price and % move, updating continuously. Mono numerals.
· Asset tabs: Gold · Silver. Design so a third and fourth can be enabled later without
  the layout breaking — an operator can turn assets on at any time.
· Duration tabs: 5 · 15 · 30 min. Visually secondary to the asset tabs.
· Card grid: 1 column at 360, 2 at 768, 3 at 1280. It STAYS 3-across at 1920 — the
  platform uses a fixed 3-tier max-width system (1280 grid pages / 1080 content /
  640 forms) and the board must not break it by widening. Equal heights, buttons
  aligned across every row.
· Recent results strip: the last ~12 finished rounds as small green-up / rose-down
  pips, oldest to newest. This is the page's heartbeat.

ALSO: the empty state when an operator has paused a chain — calm and explanatory, no
error styling, no placeholder cards — and the loading skeleton.

WIDTHS: 360px and 1280px. Then redlines + contract per §5.
```

---

### D3 · Round detail

```
Design the single-round page — surface D3. Two jobs: commit a stake, and afterwards
prove the result was honest.

· Header — asset icon, "Gold Up or Down · 5 min", LIVE chip, countdown.

· Price panel (the hero) — a simple line of the price since the round opened, with a
  clear horizontal marker at the OPEN price (the line the bet is against), the live
  price as a moving point with its mono value, and the area tinted faint green above
  the line and faint rose below. It must read instantly as "am I above or below?".
  No axis clutter.

· Pool panel — volume, players, and the Up/Down split as a bar with TZS on each side.

· Stake panel — the side was already chosen on the card, so it is LOCKED here: show
  "Your pick: UP" as a statement, not a switch. Stake control, projected return, and
  one gold confirm button (this is the money commit — the one correct use of gold).

· Settlement proof (after resolution) — design it as a receipt, auditable rather than
  decorative: open price + source link + the timestamp the source quoted; close price +
  source link + its quoted timestamp; the outcome; the movement in absolute and %; and
  a short evidence excerpt from the source.

STATES: open/betting, and resolved-with-proof.
WIDTHS: 360px and 1280px. Then redlines + contract per §5.
```

---

### D4 · Admin console

```
Design the operator console — surface D4, "Up & Down — Operations". This is internal:
dense, information-first, no marketing tone. Same dark royal, tighter spacing and
smaller type than the player app. Tables, not cards.

· KPI row — rounds today · volume today (TZS) · commission today (TZS) · void rate % ·
  oracle confirm rate %. Small stat tiles, mono numerals, subtle trend indicator.

· Chains table — Asset | Duration | State chip (RUNNING green / PAUSED amber /
  STOPPED grey) | next-boundary countdown | rounds today | volume | commission |
  actions (Pause · Resume · Stop). Stop is consequential but routine — style it as
  weighty, not alarming.

· Oracle health panel — per asset: last confirmed price, the timestamp the source
  quoted, latency in seconds, confirm rate over the last hour, attempts currently
  retrying. Include a DEGRADED variant where a source is failing and rounds are
  voiding: impossible to miss, but not hysterical.

· Round explorer — paginated table (Round # | Asset | Duration | Opened | Closed |
  Open price | Close price | Outcome | Players | Volume | Commission | Status) where
  each row expands into a proof drawer: both source links, both quoted timestamps, the
  evidence excerpt, and operator actions (Re-observe · Void round).

WIDTHS: 1280px and 1920px, plus how the chains table collapses at 768px.
Then redlines + contract per §5.
```

---

### D5 · Bottom navigation glyph

```
Surface D5. The mobile bottom nav goes to five tabs: Markets · Up & Down · Live ·
Bets · Wallet (Profile moves into the top-bar avatar menu, so the bar stays at five).
Same floating glass bar; the active tab gets the filled pill behind its icon plus the
cyan shift.

WHAT I ACTUALLY NEED: a distinctive glyph for "Up & Down" that does not collide with
the existing set — Live is already a lightning bolt, Markets a grid, Bets a portfolio,
Wallet a wallet. Give me THREE options — for example opposing up/down chevrons, a
zig-zag price line with an arrow, or a candlestick pair — shown in the bar side by
side so I can compare them in context.

Icons are stroke, ~1.85px weight, 22px. Labels ~9.5px. Tap targets ≥ 40px.
WIDTHS: 360px and 430px. Then redlines per §5.
```
