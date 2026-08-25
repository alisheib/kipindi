# SESSION PROMPT — the payout destination, the card grid, the mobile filters, and the share glow

Commissioned by Ali, 2026-08-25 (end of session 62). Four units, in this order.

> ⛔ **THIS FILE DELIBERATELY DOES NOT RESTATE THE STANDARDS.** They have one home —
> `docs/LIVE-QA-CAMPAIGN.md` §0 (standing rules), §3 (traps this campaign has already paid for)
> and `.claude/skills/50pick-standards/SKILL.md`. A copy of the standards is the duplication the
> standards forbid, and it would rot before this file did. **Read them there, then come back.**
>
> The three that decide whether this session's work is real:
> 1. **Only live tests count.** A green suite is not evidence. Drive it on production.
> 2. **Every guard needs a control that must go RED**, declared in `scripts/anchors/*.anchors.mjs`.
> 3. **Ask whether the instrument is measuring the right population.** This campaign's recurring
>    defect is not broken code — it is *instruments that are green while measuring the wrong thing*.

---

## 0. ⛔ CLEAR THIS FIRST OR UNITS 2–4 CANNOT BE PROVEN — `E-215`'s neighbour, `E-214`

**The six QA persona passwords in `.env.qa.local` are stale.** `alpha`, `echo`, `officer`,
`trading`, `growth` and `finance` all fail to sign in from this checkout, and each one fails
reporting *"login failed"* — which reads as a broken front door on a real-money platform. It is
not: production returned `error=wrong_credentials`, correctly, and `login/actions.ts:52-59`
distinguishes `locked` / `blocked` / `no_account` / `wrong_credentials` properly.

- ✅ **`fleet:NN` personas still work** (shared `QA_FLEET_PASSWORD`) — every successful login on
  2026-08-25 was `+255799000001`.
- ⛔ **`QA_ADMIN_PASSWORD` must be pasted by Ali.** The harness forbids re-minting his console
  login, and five legs of `scripts/live-recategorise.mjs` stay NOT RUN without it.
- ⚠️ **One drift found on the way:** `PERSONA.trading` is `712000104`, whose production role is
  **MODERATOR**, not TRADING. A driver "signing in as the TRADING officer" is measuring a
  moderator. Fix the label or the account, and say which.

**Re-mint the six, then start.** Every unit below has a live leg, and a live leg needs a session.

---

## ▶ UNIT 1 · THE PAYOUT DESTINATION — `E-215`, and it is the most important thing in this file

### What Ali asked for, verbatim in substance

> *"Always on deposit and withdrawal, or any place related to money, default-fill the phone input
> with the phone used on registration, and put a link for 'use another number'. For withdrawal the
> only accepted number is his registered number — that is the law. But deposit he can: put by
> default the one he registered with, and an option to use another number."*

### 🔴 What is actually true today — measured, do not re-derive

The **only** place `phoneE164` appears anywhere on the withdrawal path is the form **prefill**
(`src/app/wallet/withdraw/page.tsx:65`). `requestWithdrawalAction` reads
`formData.get("msisdn")` (`withdraw/actions.ts:86`); `withdraw()` writes `parse.data.msisdn` onto
the `Transaction` (`wallet-service.ts:1388`) and hands the same value to `dispatchWithdrawal`
(`:1455`). **Nothing compares it to the account's registered number.**

**And it is not hypothetical. 7 of 25 lifetime withdrawals went elsewhere; 6 CONFIRMED:**

| account | paid to | count | note |
|---|---|---|---|
| `+255769434985` | `+255783160044` | 2 (TZS 8,000) | different number entirely |
| `+255757619808` | `+255772619619` | 3 (2 confirmed, 1 failed) | different number entirely |
| `+255690979354` | `+255690939754` | 2 (TZS 7,000) | ⭐ **`979354` → `939754` — a digit transposition** |

⭐ **Read the third row again.** That is not a player choosing another wallet. That is a player who
almost certainly mistyped their own number and paid a stranger — and the platform had no reason to
stop them, because a free-text destination has no correct value to check against. **The strongest
argument for Ali's rule came out of the data, not the statute.** Put that in the Board note.

### ⚠️ And state the composition to the Board, in writing

Board comment #1 removed the KYC gate on withdrawal. The action's own comment already says what is
left: *"what actually protects a payout destination now is the AML ≥ TZS 1,000,000 two-officer hold
and the best-effort payee-name lookup — nothing else."* Below TZS 1,000,000 there is currently **no
identity control and no destination control** on money leaving the platform. Both halves were
individually authorised. **Nobody authorised the combination.** It goes in
`docs/BOARD-DISCLOSURE-B-E.md`, not quietly into a commit.

### Build

1. **Withdrawal — bind the destination to the registered number, ON THE SERVER.** The client is
   manners; the server is the seal. Do it as a pure exported rule (`payoutDestinationFor(user, submitted)`
   or similar) so a guard can drive it without a browser, and refuse with a reason that names the
   registered number's last digits — never a bare "invalid".
   - ⛔ **Not a `disabled` input.** A greyed field says *you may not* without saying *why*. Show the
     number, say it is the registered one, and say that the law requires payouts to go there.
   - ⛔ **Do not rewrite `moneyFormMsisdn`** (`src/lib/phone-normalize.ts`). It is keyed on **error**
     rather than on `sp.msisdn ?? account` because both money actions omit an empty msisdn from
     their carry params. `test:msisdn-prefill` pins exactly that. Read the comment before touching it.
   - ⚠️ **Decide and record what happens to the 7 historical rows.** They are settled money; this is
     a note in the register, not a migration.
2. **Deposit — prefilled, with a real "use another number".** Money coming IN from a friend's
   handset is normal. The affordance must be a proper control from the kit, and choosing another
   number must survive a validation error (that is what `moneyFormMsisdn`'s error-keying is for).
3. **"Any place related to money" is a population question — enumerate it, don't guess.** Start
   from `grep -rln "PhoneInput\|moneyFormMsisdn" src/`. Today that is deposit, withdraw, register,
   login, admin invites and `login-identifier`. Say in the register which of those are money
   surfaces and which are not, and why — **a list you did not enumerate is a hypothesis.**

### Acceptance

- A withdrawal to a non-registered number is **refused by the server**, proven by replaying the
  real server-action POST with the msisdn rewritten — the same technique
  `scripts/live-recategorise.mjs` leg 3 uses. **Driving the form only proves the widget is safe.**
- A deposit to another number still **works**, and survives a validation error with the chosen
  number intact.
- `test:msisdn-prefill` still green; a new suite + `red:` harness whose positive control is
  *"refuse every destination, including the registered one"* — that keeps the law perfectly and
  breaks withdrawals entirely.
- Live on production, with the fleet.

---

## ▶ UNIT 2 · THE MARKET CARD GRID, PLATFORM-WIDE

> *"Visualize layouts of market cards throughout the whole platform — are they aesthetically
> perfect? Is the layout good? Are the number of rows and columns, and when they move to a new
> line, good? Are we taking advantage to maximum of the space we have?"*
> — and, from earlier in the same session: **"constantly, not just a fix on one screen and not another."**

### Where the cards are

`src/components/markets/market-card.tsx` · `card-geometry.ts` · `src/components/updown/updown-card.tsx`
· consumed by `/markets`, `/markets/[id]`, `/results`, `/live`, `/watchlist`, the landing page and
both `/markets` skeletons.

### ⛔ The constraint that makes this delicate

`MARKET_CARD_H = 349` (`card-geometry.ts`) is **derived from a 17px footer row, and BOTH `/markets`
skeletons consume the number.** Change the card's height and you re-derive geometry on `/markets`,
`/live`, `/watchlist` and the landing **at once** — which is the good news (consistency is
structural) and the risk (one edit moves five surfaces). `npm run qa:card-geometry` reports
before/after and said `IDENTICAL` at the end of session 62; **run it before you touch anything so
you have a real baseline, not a remembered one.**

### How to do it honestly

1. **Measure first, at every band.** Screenshot `/markets`, `/results`, `/live`, `/watchlist` and
   the landing at 360 / 414 / 768 / 1024 / 1280 / 1440 / 1920 **on production**. Record columns,
   gutters, the wrap point, and the dead space at the right edge at each band.
2. ⭐ **The question "are we using the space" has a wrong answer that looks right:** more columns is
   not automatically better. Ali's own width tiers are already law — board 1480 / 4-up, reading
   1080, forms ≤960 (`feedback_kipindi_width_tiers`, `DESIGN_AUTHORITY`). A grid that goes 5-up at
   1920 must justify itself against the tier, not against the empty pixels.
3. **Consistency is the deliverable, not per-screen prettiness.** If `/results` wraps at a different
   count than `/markets` for the same card, that is the finding. Fix the shared rule, not the screen.
4. ⛔ **Nothing outside the kit.** Tailwind's spacing scale here is **overridden** (`h-10` = 80px,
   `gap-2` = 12px). Arbitrary literals like `h-[44px]` in this codebase are deliberate, not sloppy —
   read the surrounding rule before "tidying" one.

### Acceptance

A written before/after table of columns × band × surface, from production screenshots; one shared
rule rather than per-page overrides; `qa:card-geometry` re-run and its verdict stated; no surface
regressed at any band; Ali sees the shots.

---

## ▶ UNIT 3 · MOBILE FILTERS — progressive disclosure, from the kit

> *"For the mobile version, the filters — the bitcoin, ethereum, durations etc. — use design to
> create something aesthetically and performance-wise good; a drawer or any type of filtering, not
> to keep everything visible at the same time. You decide as a UI/UX engineer how it should look,
> based on the structure of the whole platform. But we don't want to create anything outside the
> box — it's all from our UI kit."*

### ⭐ The kit already has the answer, so this is composition, not invention

`src/components/markets/filter-sheet.tsx` **already exists** and is already used by
`discovery-bar.tsx`, `menu-shell.tsx` and `notifications-panel.tsx`. The surface Ali is describing
is `src/components/updown/updown-board-tabs.tsx` — *"UD-13 · the board's asset/duration tabs — a
FILTER, not a page reload"* — which renders `assetTabs` **and** `durationTabs` always-visible, i.e.
two rows of chips competing for a phone's width.

**So: reuse `FilterSheet` on the Up & Down board below the `sm` band. Do not build a second sheet.**

- ⛔ Keep the **desktop** behaviour as it is unless a measurement says otherwise. Ali asked about
  mobile.
- ⚠️ The sheet must state the **active** filter on its trigger — a collapsed filter whose trigger
  does not say what is selected is worse than visible chips, because the player loses the answer to
  *"what am I looking at?"*.
- ⚠️ Motion is not optional here (`feedback_motion_must_be_perfect`). Use `--m-*` / `--t-*`; the
  legacy `--ease-*` / `--dur-*` are **aliases** and must never be restored to literals
  (`test:motion` guards it).
- ⛔ `test:i18n` — every new string in en/sw/zh, never hardcoded.

### Acceptance

The Up & Down board on a 360px viewport shows one filter trigger naming the active asset and
duration, not two rows of chips; the sheet opens, filters, and closes; desktop unchanged; a guard
that fails if the trigger stops naming the active selection; driven live at 360 and 414.

---

## ▶ UNIT 4 · THE SHARE GLOW — small, and Ali is right

> *"The glow on the share button in the market card should have an aesthetically different glow on
> hover, because the details next to it also has the same colour."*

### Confirmed by reading the CSS, not by eye

```
globals.css:3520  .mcardp-details      { … color: var(--accent-400); }
globals.css:4439  .mcardp-share:hover  { color: var(--accent-400); }
```

**The identical token.** On hover the share glyph becomes exactly the colour of the Details link
sitting beside it in the same 17px row, so two distinct controls read as one.

### ⛔ Two constraints that are load-bearing

1. **The 17px footer row must not grow.** `.mcardp-share` reaches 40px through an out-of-flow
   `::after`, precisely so the row — and therefore `MARKET_CARD_H` — never moves. A glow that adds
   height re-derives card geometry on five surfaces (see Unit 2).
2. **`.mcardp-share` declares its own `position: relative` deliberately.** `.mcardp > *` only reaches
   **direct** children of the card, and this control is a flex child of the footer row. Remove that
   line and its `::after` resolves against the row and covers `Details` — which is how the share
   control originally shipped **visible, named, translated and unclickable**, caught only by
   `elementFromPoint` on production. **A bounding-box measurement cannot see it.**

### Acceptance

Share and Details are visually distinct on hover at a glance; the footer row is still 17px;
`qa:card-geometry` unchanged; the hit area re-proven with `elementFromPoint` on production, not with
a bounding box; contrast still passes `test:contrast` in both themes.

---

## 1. Already measured this session — ⛔ do not re-derive any of these

- **Selcom exposes NO collections (C2B) balance.** Only `POST /v1/vendor/balance`, and `data` came
  back **length 1** — the "we might be dropping a second account in `data[0]`" suspicion is
  **disproven, not assumed**. Which account it is, proven by drawdown: float ~100,000 (2026-07-31)
  → **26,385** now, a fall of ~73,615 against **70,000 of confirmed payouts** plus charges, while
  **646,000 of confirmed collections** passed through and never touched it. Full detail in
  `docs/SESSION-PROMPT-JAY-COMMENTS.md` §I. ⚠️ Probe with
  `railway ssh "node scripts/selcom-probe.mjs"` — **never `railway run`**, which executes locally
  and makes every rail answer `4032 not whitelisted`, reading as *"nothing is provisioned"*.
- **The `BET_PAYOUT` / `WITHDRAWAL` conflation now has a number:** rail out **TZS 70,000**; internal
  wallet credit **TZS 2,077,191**. Calling the second a payout figure overstates the rail by
  **29.7×** — on a page built for the regulator.
- **Production sign-in is healthy.** See §0; the failures were credentials, not the product.
- **`/results`, `/markets` and `/admin/markets` are all `force-dynamic`** — the A×H staleness mode
  is structurally unreachable, and `test:recategorise` §5 pins that reason.

## 2. Still open, not commissioned here

- **Jay units I, J, K, L, M** — `docs/SESSION-PROMPT-JAY-COMMENTS.md` §1 order. **I is measured,
  not built** (above). J is the bonus end-to-end drive, K is the largest (customer care + mailbox,
  needs READ_TIERS designed first).
- **`E-177`** — the unverified-payer seal, unblocked, exact amounts in
  `SESSION-PROMPT-FINISH-THE-BOARD.md` §2. ⛔ It moves real money on production; confirm with Ali
  before executing.
- **`E-213`'s five NOT RUN legs** — one `QA_ADMIN_PASSWORD` away.
- **`E-195` ⏰** — a date: check from ~2026-09-15, certs expire 2026-10-15.
- **⚠️ A Railway WORKSPACE token was pasted into the chat transcript again and should be ROTATED.**
  It never entered a tracked file (`git grep` confirms) and was deleted from the scratchpad at close.
- ⚠️ `.claude/settings.json` and `docs/reports/*` in the working tree belong to a parallel session.
  **Leave them.** Never `git add -A`.
