# House bots: design-system conformance spec

All citations are from `C:\kipindi-main` as it stands now. The laws come from `docs/DESIGN_AUTHORITY.md` ("DA"). The other docs are record (`DESIGN-BASELINE.md`, both `DESIGN-GATE-*-2026-08-28.md`), and `design-master-brief.md` is rationale.

## 0. Plan corrections found while verifying (fix before building)

| # | Plan says | Repo reality | Ruling |
|---|---|---|---|
| X1 | §8 activity filters use `QueryStrip` | `QueryStrip` has no caller under `src/app/admin`; its users are the player `*-bar.tsx` files. The console filter idiom is `FilterPill rank="dense"` plus `DateTimeRangeFilter rank="dense"` (`admin/ai-polls/poll-filters.tsx:96-126`). | Use FilterPill and DateTimeRangeFilter. Add the file to `ADMIN_SURFACES` (`scripts/filter-language.test.mts:218-229`); §6.6 makes the rail 32px. |
| X2 | "Kit controls only" with sizes unspecified | The `sm` sizes don't match. `Input sm` is 40 (`input.tsx:67`). `PasswordInput sm` is 36 (`password-input.tsx`, the `heightCls` table), `Select sm` is 36 (`select.tsx:292`), `TimeSelect sm` is 36 (`time-select.tsx:114`), `DurationInput sm` is 36 (`duration-input.tsx:139`). | Every form field in these screens uses `size="md"` (44 = `--h-input`, `globals.css:305`), with `Button size="md"` beside it. 32 appears only in filter rails and table row actions. |
| X3 | §12 static harness renders "modals" | `Modal` returns null until mounted (`modal.tsx:258`), and the `Select` listbox only portals once mounted (`select.tsx:372`). `renderToStaticMarkup` therefore draws no modal, listbox, overlay or pending bar. | The harness reports these as NOT MEASURED. They are verified in the client pass (§7 phase D). |
| X4 | Status tones go under the keys ACTIVE/PAUSED/AUTO_PAUSED/REMOVED | The dictionary namespace is flat, and `ChainState` already has PAUSED (`updown-dal.ts:28`, `status-badge.tsx:469`). The scoped-key precedent is `status-tone.ts:204-212` (KYC_*). | Use keys `HOUSE_BOT_ACTIVE` (admin green, same as ACTIVE `:146`), `HOUSE_BOT_PAUSED` (amber, per DEACTIVATED `:140-142`), `HOUSE_BOT_AUTO_PAUSED` (claret, per SUSPENDED "an officer's hold, reversible" `:144-147`) and `HOUSE_BOT_REMOVED` (slate, per REVOKED `:137-139`). The entry comment must state the §B4a tension. |
| X5 | Master switch is a `Toggle` | A `role=switch` whose ON press opens a dialog is acceptable only because `/admin/payments` does the same (it arms with PAUSE, `unsaved-changes.test.mts` EXEMPT ④). The tone stays `brand` (`toggle.tsx:8-13`); gold and claret are wrong here. | Keep the Toggle, but always pair it with a visible state sentence. |
| X6 | Feed rows are `FeedRow` (per design-C) | FeedRow truncates its body and only sets `title` when the body is a string (`admin-shell.tsx:661`). Its variants include gold (`:633`). A money sentence would be clipped at 360, which breaks §A5 ("never clip money") and §M4a.4. | The feed is an `.admin-tbl` inside `ScrollX` (§1 S1-activity). FeedRow is not used. |
| X7 | Wizard "step row" borrows the AdminFunnel idiom | `AdminFunnel` is a value funnel (`admin-shell.tsx:668-696`). The kit has no stepper, and §K5 says extend rather than fork. | Show a text line "Step 2 of 4 · Check" plus the kit `ProgressBar` (`progress-bar.tsx:28-40`). |

## 1. Rules that apply to every screen

**Tokens and geometry**
- Values live only in `globals.css`:
  - `--h-control-xs/sm/md/lg/xl` are 32/40/44/48/56 (`:300-304`) and `--tap-min` is 40 (`:299`).
  - `--sp-*` (`:224-225`), `--pill-active` (`:438`), `--w-console` 1600 and `--w-form` 640 (`:4320-4323`).
- The Tailwind spacing scale is overridden: `h-7`=40, `h-8`=48, `p-4`=20, `gap-3`=16, `py-1.5`=8 (`tailwind.config.ts:211-225`). `h|w|min|max-(7..12)` is an error under `numeric-size-utility` (`ui-consistency.test.mts:517`).
- Radii use the semantic keys only (§S2; DA:1001-1004). The numeric `rounded-*` scale is frozen legacy.
- Nothing hand-typed: no hex or `oklch()` literals, no one-off `rounded-[…]`, no new `.css` files, no new keyframes (§K DoD, §E6).

**Type**
- Sizes come from the Tailwind ladder only (§T7, `tailwind.config.ts:197-210`).
- Page titles use `AdminPageHead`: 28px `text-title-lg` with an italic sw caption (`admin-shell.tsx:324-348`). Card titles use `AdminCard` at 13px (`:598`).
- Eyebrows are `font-mono text-micro uppercase eyebrow text-text-subtle` (§T3; `.eyebrow` at `globals.css:973`).
- Prose is at least `text-body-sm` (13px). Captions and labels are never sentences (§T4).
- Money is `.amount`: mono, tabular, untracked, nowrap (`globals.css:940`; §M4). Other numerals use `tabular` (§T5).

**Colour** (DA §B1-B4, §B11, §M3/M3a)
- Gold appears nowhere in the house-bot UI:
  - no `AdminKpi gold` (`admin-shell.tsx:379`);
  - no `Chip gold` or `resolved`, no `Toggle tone="gold"`, no `Callout tone="gold"`, no `ReceiptRow emphasis="total"` (`receipt-row.tsx` "the only gold in the box").
  - A balance is not a win (`status-tone.ts:239-242`).
- `yes`/`no` ink (green/rose) is only for side words (YES/NO, UP/DOWN), resolved through `side-label.ts` (§L2). It is never used for success or failure (§B2a).
- App-state tones: success/danger for interface states; amber (`warning`) only where "somebody must act" (§B11); slate for terminal states; royal/brand for "in flight".
- Claret marks only irreversible ceremony (Remove submit) and the AUTO_PAUSED chip (X4). It never touches NO-rose (§B4).
- Aqua is not used. `AdminKpi pulse` paints aqua (`admin-shell.tsx:445-450`) and aqua is sanctioned only on `/admin/live` (§B4b).

**Button variants**
- `primary`: Start, Continue, Designate, Save, Switch on.
- `ghost`: Back, Cancel, "Use recommended values", Re-verify.
- `danger`: Remove trigger.
- Modal submits use Modal-form buttons (§4).
- `yes`/`no` buttons are never used for actions (DG-A-21).
- No `hidden` class directly on a `.btn`; wrap it in a span (`LIVE-QA-CAMPAIGN.md:1606` E-207 ②).

**Tables**
- `.admin-tbl` (`globals.css:4156-4197`) inside `ScrollX label` (`scroll-x.tsx`).
- No `min-w-*` on narrow tables (`house/page.tsx:672-679`). Money cells are `td.tabular`, which is nowrap (`globals.css:4187-4188`).
- Money is the second column (`house/page.tsx:684-688`).
- Row hover only; no per-cell hover (DG-A-09).
- Row actions are `Button size="xs" variant="ghost"`. Navigation is a `.row-link` "Open →" (DG-A-08; DESIGN-BASELINE §4).
- Zero rows render `AdminTableEmpty` (`admin-table-empty.tsx:14-38`).

**Status chips.** Always `<Chip size="sm" variant={TONE_CHIP[STATUS_TONE.HOUSE_BOT_*.admin]}>` (`status-tone.ts:78-88`). Never a variant typed beside the label. The chip words are "Active", "Paused", "Auto-paused", "Removed".

**Feedback**
- The agents runner: `useTransition` + `useActionOverlay` + `runAdminAction` + `focusFirstInvalid` (`agents/agents-client.tsx:31-42`). This is DA §F2's account/compliance class, whose primary channel is a popup.
- `useMayAct()` runs before any early `return <ActReadOnly/>` (`act-gate.tsx:63,132`).
- Buttons are disabled while pending.
- Every refusal states the reason and the next step (§F4).

**Formatting**
- `formatTzs` gives "TZS 1,234" with U+2212 for negatives (`utils.ts:62-65`).
- `formatTzsSigned` gives "+TZS"/"−TZS" (`:213`).
- `formatTzsCompact` (`:129`) is used only in KPI tiles.
- `formatNumber` and `adminCount` (`utils.ts`, count-line recipe).
- Times: `formatTime` HH:MM:SS (`:349`), `formatDateTime` (`:278`), `formatDateTimeSafe` gives "—" (`:364`).
- EAT-day logic uses `eat-day.ts:57,72` and `lib/query/windows.ts` (FULL_PRESETS `:28`). Never re-derive "today" at a call site (DESIGN-BASELINE §3c rule 2).
- The zone suffix comes from the platform TZ (`utils.ts:256-262` is admin-configurable). Never a hard-coded "EAT" unless the configured zone is `Africa/Dar_es_Salaam`.

**Copy**
- Admin copy is English and sentence case. sw glosses appear only on `AdminPageHead`/`AdminCard` (§K7c, `failure-reasons.test.mts:1080-1085`). Tab labels are English only.
- Player copy is en/sw/zh through `i18n-dict.ts` (`test:i18n`). No English enum tokens (§L4), and Chinese side words in sentences take 「」.
- No emoji anywhere (§C6). No raw enums in text; route words through a house-bot lexicon (§L3, DG-A-13).

**Accessibility floors**
- Contrast AA is measured on the rendered ink (§A1). Never add `opacity-*` or `/NN` alpha to subtle ink (§A1 P-u). Greyed rows use `text-text-subtle` plus a reason, never opacity.
- Tap targets ≥40, and 44 at ≤768 (§A2).
- One focus ring recipe (§A3).
- Colour is never the only signal (§A4).
- Swahili +40% must fit (§A5).
- Zero overflow at 360 (§A6).

## 2. Screens: component tree, responsive table, states, accessibility

### S1 `/admin/house-bots` (owner only)

**Tree** (server `page.tsx`, `export const dynamic="force-dynamic"`)
```
AdminPageHead title="House bots" sw="(sw, native review)" actions={<Button md primary href=/new | disabled + visible reason "Roster full (5 of 5)">}
AdminBody
 ├ HouseBotsStrip (client; the one RefreshPoller, `refresh-poller.tsx:19`, intervalMs=LIVE_ROUND_MS `refresh-cadence.ts:46`,
 │   enabled = (switch ON || any ACTIVE/AUTO_PAUSED) && !dirty && !anyDialogOpen)
 │   AdminCard padding p-4:
 │     row flex-wrap items-center justify-between gap-3
 │       left: Chip (On / Off; tone green / slate) + sentence text-body-sm
 │             "House bots are off. No bot will place a bet." | "On since 14:02:11 EAT · switched by Ali · reason: …"
 │       right: Toggle tone="brand" aria-label="House bots master switch"  (+ visible label "Master switch")
 │     ON disabled → visible text beside it: "Set 3 global limits first →" Link ?tab=limits#limits-first-unset
 │   Callout (auto-off cause, only when offCause≠MANUAL): GLOBAL_LOSS_STOP → tone="warning"; ENGINE_FAULT/ERRORS → tone="danger" emphasis="strong", size="md", surface="panel", meta={time}
 │   Callout engine-stale (§S5)
 ├ KpiGrid cols="4" (`admin-body.tsx:65`): AdminKpi ×4 — Live exposure · Today's net · Bets today · Bots active
 ├ Tabs variant="line" tabs=[roster, activity(count), limits(count=unset caps), history] with href ?tab= (`tabs.tsx:109-114,434`)
 └ active panel only (server-chosen; §K7f)
```
- **KPI values:** exposure and net use `formatTzsCompact` (strings, so the tile `title` shows them), net signed. "Bets today" reads "12 placed · 30 skipped"; if that text grows too long the tile truncates it (the label gets a `title`, so it can still be read). "Bots active" is "2 of 5". Never pass `tone`, `gold` or `pulse`. A failed read passes `unavailable` (`admin-shell.tsx:394-409`).
- **Tab counts** use `CountBadge tone="brand"` via `TabItem.count` (§K7d). A count of zero renders nothing, so a failed read also needs its own `AdminLoadError`.

**roster tab:** `AdminCard padding="p-0"` › `ScrollX label="House bot roster"` › `table.admin-tbl`
- Columns: Bot (label + "Player #XXXXXX" `text-caption`) · Today net (`td.tabular`) · Status chip · Live balance · Open exposure · Bets today · Last bet (relative text with the absolute time in `title`) · Products · `.row-link` "Open →".
- The AUTO_PAUSED reason is a second line under the chip in the Status cell (`text-caption`, wraps).

**activity tab:**
- Filter row `div data-filter-rail className="flex flex-wrap items-center gap-2"`:
  - `FilterPill rank="dense"` groups for Bot, Product (All · Up & Down · Polls) and Outcome (All · Placed · Skipped · Failed · Pending);
  - `DateTimeRangeFilter rank="dense" presetIds={["today","24h","7d"]}`.
  - Each group has a `FilterGroupKey` label (`filter-pill.tsx:268`).
  - Filters are GET/URL state and navigate with `replace` and page reset (§K6c).
- Table: What happened (label cell, wraps, string from `feed-copy.ts`) · House stake (`td.tabular`, `formatTzs`) · Result chip · Due / at (`td.tabular`) · Action.
- Result chip tones: placed royal (`pending`), skipped slate (`neutral`), pending royal, failed rose (`danger`), cancelled slate. Never gold.
- Action: `Button xs ghost "Cancel"` on PENDING only, inside a ConfirmDialog. CLAIMED shows the text "Firing".
- A PENDING row's due time is the absolute server-formatted time plus a client countdown. The countdown gets `serverNow` and the ISO string only (the `sell-button.tsx:52-80` pattern).
- `AdminPagination` (`admin-pagination.tsx:7`), 20 per page.
- No entrance motion (§F5).
- Empty states, each naming its cause (§K6c): switch off; no bots (+ primary "Designate an account"); filtered (+ "Clear filters" only when that exit yields rows).

**limits tab:**
- `AdminCard title="Today's usage"`: one `ProgressBar tone="brand"` per global cap (`label` = the cap name), caption "TZS 120,000 of TZS 500,000" in `.amount text-body-sm`. An unset cap shows the caption "Not set", with no bar.
- `FormColumn measure="form"` › `<form>` › AdminCard groups › grid `grid-cols-1 sm:grid-cols-2 gap-3` › `Field label hint error dataField` + `Input size="md" mono prefix="TZS" inputMode=numeric` (`input.tsx:25-33,186-208`).
- "Use recommended values" is `Button md ghost`.
- `PendingChangesBar` + `UnsavedChangesGuard` (`unsaved-changes.tsx:121,381`). The bar is a singleton, so one form per tab.

**history tab:** `.admin-tbl`: When · Event (lexicon word) · Change (from → to) · Reason (wraps) · By ("System — house bot engine" when the actor is null).

**Responsive (S1)**

| Width | Layout | KPI | Tables | Controls |
|---|---|---|---|---|
| 360 | head actions wrap under the title (`flex-wrap`, `admin-shell.tsx:334`); strip row wraps, Toggle drops to its own line with its label | 2-up, value 18px (`text-title-sm`, `:484`) | ScrollX; Bot + Today net visible without scrolling | primary 44; filter pills 32 (§6.6 console exception, mouse density; the filter sits in the sheet-free console); row "Cancel" 32 |
| 640 | strip one row if it fits, else wraps | 2-up, 22px | same | same |
| 768 | same | 2-up | first 3–4 columns visible | same |
| 1024 | measure a 4-up band at `lg` | 4-up. Money compact is mandatory; assert no truncated TZS node | full roster usually fits; feed scrolls | same |
| 1280 | full | 4-up | full | same |
| 1920 | content column capped at `max-w-console` 1600 (`admin/layout.tsx:239`) | 4-up | full | form ≤640 |

**States**
- **Loading** (`loading.tsx`): same `AdminPageHead`; `SkCard lines={1} title={false}` for the strip; `SkKpiRow count={4}`; rail ghost `div h-[44px] w-80 rounded-md bg-bg-overlay kp-shimmer-track` (`agents/loading.tsx:17`); the union of tab bodies as `SkTableCard cols={8} rows={5}` (`admin-skeletons.tsx:209`). The newer agents rail-ghost precedent wins over `house/loading.tsx:4-7`.
- **Error:** a panel read failure renders `AdminLoadError what="the roster"` (`admin-shell.tsx:551-561`), never an empty state.
- **Stale:** the engine Callout.
- **Pending:** the ActionOverlay.
- **Read-only:** non-owners never render the page (`AdminRestricted`, `admin/layout.tsx:240`). Client files still call `useMayAct`.

**Accessibility**
- Focus order: skip link › head action › strip Toggle › Callout › KPI (not focusable) › rail links (`aria-current="page"`, `tabs.tsx:222`) › filters › ScrollX (`tabIndex=0`) › row links › pager › PendingChangesBar.
- Toggle `aria-label`, with the state also in text.
- Callout engine-stale uses `role="alert"`, rendered stably keyed so a refresh doesn't re-announce it.
- Reduced motion: ProgressBar is `motion-safe` (`progress-bar.tsx` header); no pulse anywhere.

### S2 `/admin/house-bots/new` (wizard)

**Tree**
```
AdminPageHead title="Designate an account" sw=… actions={BackLink to roster}
AdminBody › FormColumn measure="form"
 ├ step line: <p class="font-mono text-micro uppercase eyebrow text-text-subtle">Step 2 of 4</p> + ProgressBar value=2 max=4 label="Designation step"
 ├ find:    AdminCard title="Find the account" › UserPicker
 ├ check:   AdminCard title="Account check" action={Button md ghost "Search again"}
 │           <dl> grid grid-cols-1 sm:grid-cols-2 gap-3: dt eyebrow · dd text-body-sm
 │             Name · Handle · Phone (SensitiveReveal field/subjectId/masked, `sensitive-reveal.tsx:25-35`) · Role · Account status (AccountStatusBadge `status-badge.tsx:346`) · Wallet status
 │             Live balance: .amount text-title-sm text-text (NEVER gold) · Bonus: .amount text-body-sm text-text-muted + caption "Not usable by the bot" · Open positions
 │           blocking rows → Callout tone="danger" size="sm" title=reason, body=next step (one per row)
 │           "somebody must act" warnings → Callout tone="warning"; information-only rows → tone="info"
 │           footer: Button md primary "Continue" disabled + visible text reason beside it (not a tooltip)
 ├ consent: AdminCard: Field "Bot label" Input md · Field "Purpose" Textarea rows=3 · Field "Holder's password" PasswordInput size="md" autoComplete="off" name="holderSecret"
 │           attempts line text-body-sm tabular "3 attempts left before his own sign-in locks for 30 minutes"
 │           rate-limited / locked → Callout tone="warning" with client countdown; submit disabled
 └ review:  AdminCard summary <dl> + balance re-read + Button md primary "Designate" · Button md ghost "Back"
```
- The step is in the URL (`router.push`, so Back steps back).
- `UnsavedChangesGuard dirty` from the check step onward (label/purpose typed). The password is never part of `dirty`. A form Textarea puts the file in the `test:unsaved-changes` population (`unsaved-changes.test.mts:103`), so it must be guarded; exemption ① applies only to the modals.

**UserPicker** (`src/components/admin/user-picker.tsx`)
- `Input size="md" type="text" role="combobox" aria-expanded aria-controls aria-autocomplete="list" aria-activedescendant`.
- An in-flow `<ul role="listbox">` directly below it: no portal, no own scroll box, at most 10 rows.
- Each option `li role="option"` is at least 44 tall: name `text-body-sm`, "Player #… · +255•••678" in `text-caption tabular`.
- Ineligible options: `aria-disabled="true"`, `text-text-subtle`, reason wrapped beneath (the `select.tsx:22-38` hint rule).
- Polite live region, e.g. "6 accounts · 2 cannot be designated".
- States:
  - idle hint (Field hint);
  - loading `Spinner` (`spinner.tsx:37`) + `aria-busy`;
  - empty text "No account matches 'x'." (not an illustration inside the combobox);
  - error text "Search failed. Try again." + `Button xs ghost` "Retry".

**Responsive (S2)**

| Width | Layout |
|---|---|
| 360 | `<dl>` one column. Continue and Back stack full-width (`flex flex-col-reverse sm:flex-row gap-2`). Callouts full-width. Picker options wrap to two lines. |
| 640–768 | `<dl>` two columns (each ≈310px inside 640). Buttons in a row, right-aligned. |
| ≥1024 | The column stays ≤640 (`form-column.tsx`), left-aligned under the head. Fields never exceed `--w-form`. |

**States**
- Loading: `SkFormCard fields={4} fieldH={44}` (`admin-skeletons.tsx:153-161`).
- Unknown `?user=`: an `EmptyState kind="admin"` inside the card, with "Search again".
- Balance read failed: a blocking Callout "Balance unavailable — try again", plus the balance `dd` shows "—" (§C2).
- REMOVED earlier: Callout info "Removed on 3 Sep 2026, 14:02 by Ali" + primary "Designate again".
- Pending: Designate disabled while the ActionOverlay runs.
- Double submit `{ok:false,data:{botId}}`: the overlay error carries a link to that bot.

**Accessibility:** focus lands on the step's card heading (`tabIndex=-1`) after navigation. Keyboard in the picker: ↑↓ Home End Enter Esc Tab. A wrong password focuses the password field (`focusFirstInvalid`).

### S3 `/admin/house-bots/[botId]`

**Tree**
```
AdminPageHead title={label} sw="House bot · Player #XXXXXX" actions={BackLink "House bots"}
AdminBody
 ├ BotStrip (client, shares the RefreshPoller rules; id="reverify" on the re-verify CTA for HashFocus `hash-focus.tsx:28`)
 │   AdminCard: row flex-wrap justify-between gap-3
 │     left: status Chip + reason sentence text-body-sm ("Password changed on 12 Sep, 09:14 — enter the new password to continue")
 │     right: flex flex-wrap gap-2 — Start (primary md, ConfirmDialog tone="brand") · Pause (ghost md, ConfirmDialog tone="brand") ·
 │            Re-verify (primary md when AUTO_PAUSED(PASSWORD_CHANGED), else ghost md; Modal form) · Remove (danger md, Modal form) · Enter now (primary md, between Pause and Re-verify; not rendered while `enterNow.enabled` is false; disabled with its visible reason when unavailable; 04 N1 §8)
 │     disabled buttons carry VISIBLE reason text under the row (not `title` only)
 │   KpiGrid cols="sm3": Live balance · Today's net · Open exposure (formatTzsCompact; unavailable on read fail)
 │   REMOVED → Callout tone="neutral" "Removed on … by … — this bot is read-only." and no action buttons
 ├ Tabs line href ?tab= overview · rules(count=unset caps) · targets(count=active targets; 04 N2 §8) · activity · money · history
 └ panel
```
- **overview:**
  - AdminCard "Saved rules": the rule sentence as `text-body-sm`.
  - AdminCard "Today's limits": ProgressBars (daily stake; projected loss with hint "Counts today's open stakes as lost until they settle"; realised loss; exposure; bets this hour/day).
  - AdminCard "Book": `.admin-tbl` rows Today | Lifetime × bets, staked, returned, net, open exposure, fee withheld.
  - "Next due" line.
  - Empty: `EmptyState kind="admin"` "No house bets yet — set rules, then Start."
- **rules:**
  - One AdminCard per group (Scope, Modes, Counter, Fill, Opener, Up & Down, Shaping, Guards, Schedule, Limits) inside `FormColumn measure="form"`.
  - Toggles sit in rows: `div className="flex items-center justify-between gap-3 min-h-[44px]"` with `span id` label + `Toggle aria-label`.
  - Checkbox lists (chains, categories, days), each row `min-h-[44px]`; "All chains" uses `indeterminate` (`checkbox.tsx`).
  - `DurationInput size="md"`, `Select size="md"` with option hints, `TimeSelect size="md"` pairs + `Button md ghost` "Remove window" / "Add window".
  - Overnight shows as text "22:00 → 02:00 (overnight)".
  - Unset cap: empty Input + hint "Not set — this bot cannot bet".
  - Effective timing preview: `Callout tone="info" size="sm"` (`role="note"`, not live).
  - PendingChangesBar + UnsavedChangesGuard. A tab switch counts as an exit (§K7d).
- **activity:** the S1 feed with Bot filter hidden.
- **money:** `.admin-tbl`:
  - Columns: Type (`txnTypeLabel` `status-badge.tsx:364`) · Amount (`formatTzsSigned`, `td.tabular`, neutral ink) · Status (`txnStatusLabel` `:383`) · When · House chip (Chip sm neutral "House stake" on marked rows) · `.row-link` "Open →" `/admin/transactions?q=`.
  - Empty: "No money movements since designation on {date}."
- **history:** as in S1. Empty: "No changes yet."
- **targets:** 04 N2 §8: params `status=active|ended|all` and `target=hbt_…`, the targets table, Add/Edit/Remove target and the lexicon.

**Responsive (S3)**

| Width | Strip | KPI | Rules form |
|---|---|---|---|
| 360 | chip+sentence, then buttons wrap two per row (44 each), reasons below | 1 column (`sm3`) | single column; TimeSelect pair stacks; Toggle rows stay 44 |
| 640 | buttons one row | 3-up | 2-up grid for numeric caps |
| 768–1024 | one row | 3-up | ≤640 column |
| 1280–1920 | one row, actions right | 3-up | ≤640 column |

**States**
- Loading: the head, `SkCard lines={2}`, `SkKpiRow count={3} cols="grid-cols-1 sm:grid-cols-3"`, the rail ghost, `SkFormCard`.
- `notFound()` for an unknown id.
- A rules save conflict (`rulesVersion`) shows the overlay error "Rules changed since you opened them — reload", and the form keeps its values.
- Validation `{field}` focuses in place. `{field, href}` on another tab calls `router.push(href)` first and focuses after the render lands. `focusFirstInvalid` returns `not-rendered` if called early (`focus-first-invalid.ts` result type).

**The owner's ask: "user changes his password → we must enter the new one"**
- AUTO_PAUSED(PASSWORD_CHANGED) is the only state where Re-verify is the primary button.
- The strip sentence names it plainly.
- The bell/email href is `/admin/house-bots/<id>#reverify`. The strip sits above the rail on every tab, so the anchor always renders (`test:tab-anchors`), and HashFocus moves focus to the CTA.
- After re-verify: overlay "Password confirmed — press Start when ready". Start then becomes primary.

### S4 Modals and dialogs

| Dialog | Primitive | Body order | Submit | Notes |
|---|---|---|---|---|
| Master ON | `Modal maxWidth={420} closeOnScrim={!pending && !dirty} initialFocus={reasonRef}` (`modal.tsx:164-178`; precedent `players/[id]/suspend-controls.tsx:141-150`) | Field "Reason" Textarea (5–300, live count `tabular`) → Field "Type BOTS ON" Input md mono uppercase tracking via existing type-to-confirm recipe | `Button md primary` disabled until both valid | inline field errors; modal stays open; on success close, then `ov.succeed` (one signal, §F6) |
| Remove | same | Reason → "Type REMOVE" | `Button md` claret-toned (irreversible, §B4a) | lists consequences in `text-body-sm` |
| Re-verify | same, `initialFocus` password | PasswordInput md `autoComplete="off"` + attempts line + locked/rate-limited Callout warning with countdown | primary, disabled while empty/locked | no typed word |
| Start | `ConfirmDialog tone="brand" pending={pending}` (`confirm-dialog.tsx:36-80`; the default tone is claret, so it must be passed) | rule summary `text-body-sm` | kit | refusal with `{field, href}` → close, push, focus |
| Pause | ConfirmDialog tone="brand" + optional reason Textarea in body | — | kit | file listed in EXEMPT ① with reason (`unsaved-changes.test.mts` ① wording) |
| Cancel intent | ConfirmDialog tone="brand" | "Cancel this pending house bet?" | kit | CLAIMED → "Already firing"; a staff-chosen intent uses the staff-cancel Modal form with a reason (5–300) and writes a COMPLIANCE audit (04 N1 §6, §8) |
| Enter now | kit `Modal`; 04 N1 §8 | 04 N1 §8 | 04 N1 §8 | counts as dirty while open (C11); ✕ and Esc allowed while Placing or Retrying; the preview is a write, driven only on the local seeded DB |
| Add / Edit / Remove target | kit `Modal`; 04 N2 §8 | 04 N2 §8 | 04 N2 §8 | in-flow two-option toggles, never a kit Select inside; reason 5–300 required |
| Kill OFF | no dialog | — | Toggle OFF click | overlay running "Switching off…" → success "House bots are off. No bot will place a bet." / timeout copy per plan |

**All dialogs**
- `test:popup-fit` bans `truncate` and `line-clamp` inside them (`popup-fit.test.mts` header).
- Width 420 at ≥640. At 360 the Modal fits the viewport width with 16px gutters (verify in phase D). Buttons stack full-width (`flex-col-reverse`).
- Esc closes unless pending. Exception: the Enter now modal allows ✕ and Esc while Placing or Retrying, because the stake carries on (04 N1 §8).
- Focus returns to the trigger (`modal.tsx` focus-return note).
- Any open house-bot dialog counts as dirty in HouseBotFormContext: C11 shows its change Callout instead of dispatching `50pick:refresh`, and runs exactly one refresh when the dialog closes (04 N1 §8, N2 §8).

### S5 Engine-stale Callout
`<Callout tone="danger" size="md" surface="panel" emphasis="strong" role="alert" title="The bot engine is not running" meta={"Last seen 14:02:11 EAT"}>No bot will place a bet. Switch bots off, or check the server.</Callout>` (props at `callout.tsx:166-240`).
- It sits above the KPI band on both pages.
- It renders only when the switch is ON and a beat is more than 30s old.
- A failed beat read renders the same Callout with the meta "Last seen: unknown". An unreadable health state must not render as healthy (§C2).
- The time is formatted on the server.

### S6 Resolver exposure display (display only)
- One line, `text-body-sm text-text-muted`: "House stake:" + side word via `sideWord` + `.amount` figure, joined with " · ".
- Placement:
  - resolver queue card next to "{pool} held" (`resolver-queue/page.tsx:463-469`);
  - ceremony page under the pools line (`resolver/[id]/page.tsx:161`);
  - admin market page under the pool figures (`markets/[id]/page.tsx:222-226`).
- Side words may carry `text-yes-300` / `text-no-300` (they name sides). The label and amounts use neutral ink. No gold, no claret on this line.
- Shown only when YES+NO > 0. A failed read shows "House stake: —  couldn't read" and is never hidden.
- At 360 the line wraps between the two sides; each "SIDE TZS x" group is nowrap.

### S7 Player profile chip (admin `/admin/players/[id]`)
- It goes in the existing chip row (`players/[id]/page.tsx:226-259`): `Chip size="sm" variant={TONE_CHIP[…HOUSE_BOT_*.admin]}` reading "House bot · Active".
- Owner: wrapped in `next/link` `Link` to the bot, following the KYC chip precedent at `:228` (Link rather than raw `<a>`).
- Other staff: a plain chip, not a link. A link that ends at AdminRestricted is a dead end.
- REMOVED bots show no chip.

### S8 Player-facing changes (en/sw/zh)
- **Holder chip:** `Chip size="sm" variant="neutral"` (slate, informational, never next to claret).
  - Explanation line: `text-body-sm text-text-muted`, its own element, never inside the chip.
  - Keys go in the `market.*` namespace (e.g. `houseStakeChip`, `houseStakeLine`, `houseStakeNoExit`), with sw/zh not identical to en.
  - **PositionCard** (`position-card.tsx:80-123`): after the status chip, header row `flex flex-wrap gap-1.5`; line under the header.
  - **Market own-positions block** (`markets/[id]/page.tsx:602-631`): after the status span; wrap the row. Existing hand-typed colours are out of scope.
  - **Wallet TxnRow** (`wallet-client.tsx:430+`): `Chip size="xs"` in the meta line (`mt-0.5`, `flex flex-wrap items-center gap-1.5`); explanation as an extra cell in the expanded panel grid. The money column stays `shrink-0`.
  - **Up & Down history** (`updown/history/page.tsx:463-477`): a separate labelled sub-row, "{n} liquidity stakes" (the count leads, per the `:455-462` rule) + the same ↑/↓ yes/no chips + the explanation line. Player-staked chips stay in the existing row.
- **SellButton:** a new prop `houseStake?: boolean` on the existing component (§B9).
  - When true: no button, no free-exit banner (`sell-button.tsx:64-68` must not render), no countdown.
  - Render a static note row: `flex items-start gap-2 rounded-md border border-border bg-bg-overlay/40 px-3 py-2`, lock glyph `I.*` at size 14, `text-body-sm text-text-muted` "Can't be cashed out — placed by 50pick with your permission. It settles to your wallet."
  - Callers pass it separately from `alreadyClosed` (`positions/page.tsx:376,431`; `markets/[id]/page.tsx:604,657`), so a LIVE market never reads "Selling closed" (`i18n-dict.ts:319`).
- **Rules/terms text:** plain `<p>` inside the existing `LegalSection` children (`legal/_components.tsx:95-110`, inheriting `text-[13.5px] text-text-muted`). No new classes, no emphasis colour. META versions bumped. `{pct}` placeholders kept.

| Width | Player checks |
|---|---|
| 360 | the SW chip and side/status chips wrap and never overflow the card; note row wraps; wallet money column intact |
| 640/768 | card grid cells ≥ chip row width |
| 1024–1920 | no change in layout; line length ≤ card |

## 3. Number, time and copy law (summary)
- **TZS:** `formatTzs` / `formatTzsSigned` in tables and cards, `formatTzsCompact` only in KPI values.
- **Counts:** `adminCount`.
- **Percentages:** `fmtRate` (`utils.ts:406`) where applicable.
- **Absolute times:** `formatTime` / `formatDateTime` on the server. Relative text never stands alone; it always carries the absolute time in `title`. Countdowns are client-side from ISO + `serverNow`.
- **Missing values:** "—" plus a label (§C2). Never 0.
- **Admin sentences:** built only in `src/lib/house-bot/feed-copy.ts` and a status lexicon: exhaustive `Record`s, sentence case, no enum tokens, "Player #XXXXXX" (`display-label.ts`).
- **Player notices:** trilingual, "liquidity" wording, and the stated losses/refunds are neutral (§C4).

## 4. Accessibility checklist (all screens)
- Landmarks: exactly one `<main id="main-content">`, the shell's (§B7 rule 5). Pages never add one.
- Headings: h1 from `AdminPageHead`; card titles stay `<p>` per the kit.
- Section rail: `nav aria-label` + `aria-current`. No `role=tab`/`aria-selected` (§K7b).
- Tables: `th scope="col"`. `ScrollX label` names the region.
- Every input has a `Field label`. Hints and errors are linked by the kit. Refused saves focus the first invalid field in document order.
- Live regions: the picker counts (UserPicker and MarketPicker) are polite; engine-stale is `role="alert"`; Enter now and target results announce once, politely, through C7's single polite region, with focus moved to the result heading (04 N1 §8, N2 §8); nothing else announces.
- Reduced motion: kit exits only. No new animation, so all three motion gates (§M6) are inherited.
- Contrast: never `text-text-faint` below 12.5px on `bg-bg-overlay` without `test:contrast` coverage. Disabled controls must carry `cursor-not-allowed` to earn the exemption (§A1).

## 5. Design traps specific to this repo (must not recur)
1. **Tailwind scans comments and plain `.ts` files** (`tailwind.config.ts:47` content glob). An elided arbitrary class in prose compiled to invalid CSS, the whole sheet failed to parse and every route served 500 (`LIVE-QA-CAMPAIGN.md:6294-6298`). Never write `h-[…]`-shaped fragments in comments, `feed-copy.ts` strings or docstrings.
2. **Client/server boundary.** A `"use client"` helper imported by a server component threw on every page while `tsc` and `build` were green (E-291, `LIVE-QA-CAMPAIGN.md:1542`). A client file reading server config got the module default (E-322, `:1498`). So:
   - `rules.ts`, `pause-reasons.ts`, `feed-copy.ts`, `constants.ts` and the tone lexicon carry no `"use client"` and no server imports.
   - Client strips and pickers receive labels, config and formatted times as props.
   - `utils.ts` date helpers import server platform-config (`utils.ts:260`), so they are never called from a client countdown.
3. **Overridden spacing scale:** see §1. `numeric-size-utility` is an error.
4. **Mismatched `sm` rungs (36 vs 40):** use `md` (X2).
5. **Popovers clipped inside cards/input groups** (DG-A-03). No portal, and never a Tooltip for a load-bearing reason; ScrollX refuses masks for this reason (`scroll-x.tsx` header). The picker listbox is in-flow.
6. **`min-w` on narrow tables at 360** (`house/page.tsx:672-679`). Money in `td.tabular` so it never wraps (§3b FITTING).
7. **KPI money clipping at 360 and 1024** (`admin-shell.tsx:461-482`): use compact money and assert it.
8. **Gold available by accident:** `AdminKpi gold`, `FeedRow` gold, `Chip gold/resolved`, `ReceiptRow total`, `Toggle gold`, `Callout gold`. All are banned here. Add a `test:house-bot-console` assertion scanning house-bot files for `gold|gilt` spellings, since `test:gold-is-money` is identity-scoped (`gold-is-money.test.mts:24-30`).
9. **Native inputs:** native select, datetime and checkbox are errors (`ui-consistency.test.mts:225-237`). `type="search"` is banned (`test:search-adoption`).
10. **`ConfirmModal` hard tier arms on the typed word alone** (`modal.tsx:466`): reason and password fields use Modal forms.
11. **`truncate` without `title`** (§M4a.4), and the FeedRow ReactNode body getting no title (X6).
12. **Status tone flat namespace** (X4), and **`CountBadge` renders nothing at 0**: it can't stand in for a failed read (§K7d).
13. **A tab switch is an exit.** A field on an unrendered tab can't be focused; navigate first (§K7d).
14. **`space-y` plus an `sr-only` first child** eats a spacing rung (§S1): don't open panels with sr-only headings.
15. **`hidden` on `.btn` has no effect** (E-207 ②).
16. **Password managers:** the holder-password field must not be name/autocomplete `password`, or the browser offers to save the holder's secret over the owner's login.
17. **Singleton PendingChangesBar:** one guarded form per tab.
18. **Git Bash** rewrites `/admin/...` values in `ONLY=`, `ROUTES=`, `FIT_ROUTES=`. Use `MSYS_NO_PATHCONV=1`. "0 passed · 0 failed" means skipped (DA:900-906).
19. **Locale is a cookie, not `?lang=`.** Assert `<html lang>` (DESIGN-BASELINE §6 PV-10).
20. **`routes.mjs` gains no `?tab=` entries.** Tabs are discovered from `data-section-rail` (`routes.mjs` expander; §K7f).
21. **One login per account.** A second login silently revokes the first (DESIGN-BASELINE §7).

## 6. Gates that must be touched or stay green (static)
- **Owned or edited in this work:**
  - `test:ui-consistency`;
  - `test:type-scale`: do not raise its ratchets (`RATCHET_ARBITRARY_SIZE` `:206`, tracking `:225`);
  - `test:tap-target`: 32 only by naming the rung;
  - `test:unsaved-changes`: EXEMPT ① entries with reasons, and the floor must hold;
  - `test:confirm-gate`, `test:admin-act-gate` (the allowlist may only shrink);
  - `test:section-rail`: population floor ≥17, new rails announce `aria-current`;
  - `test:tab-anchors` (`#reverify`, `#limits-first-unset`), `test:validation-focus`;
  - `test:filter-language`: add ADMIN_SURFACES;
  - `test:eyebrow-roles`: new uppercase-and-tracked sites use `.eyebrow` or a declared role;
  - `test:popup-fit`, `test:chip-contract`, `test:labels`, `test:i18n`, `test:feedback-law` (FAILURE-INVENTORY §6), `test:cert-devroutes`.
- **Must stay green:** `test:contrast`, `test:design-frozen`, `test:bridge`, `test:measure` (admin skips page/loading parity by design, `measure-system.test.mts:219-221`, so parity is a manual check), `test:reduce-motion`, `test:dead-css`, `tsc`.

## 7. Render and responsive verification protocol (this machine)

**Phase A: static.** `npx tsc --noEmit` plus the §6 gates. Their green result is necessary but proves nothing about the render.

**Phase B: a build is not a render.**
1. Run `npm run build && npm run start` in the worktree (production mode; dev-test routes return 404 via `proxy.ts:183-185`).
2. Playwright GETs every `PLAYER_PUBLIC` route (`routes.mjs`), `/legal/rules/*`, `/legal/terms`, and `/admin/house-bots` (expect the login redirect, not a 500).
3. Assert HTTP status is not 5xx, `document.body.innerText.length > 200`, and no "Attempted to call … from the server" in the console.
4. Open the compiled CSS: it must parse (a 500 on every route is the comment-scan outage).

**Phase C: admin static harness** (the proven method, `type-bench.mjs:60-86`; `next dev` renders an empty admin body here, `SESSION-PROMPT-AGENT-BUILD.md:249`).
1. Against **this build's** `next start`, open `http://localhost:3000/legal/terms`: same origin, this build's sheet, the real fonts. Do not use production's sheet; it lacks the new classes.
2. Replace `document.body` with the shell frame: `div.flex` › `aside` 216px placeholder + `main#main-content.flex-1.mx-auto.w-full.max-w-console[data-measure=console]` (`admin/layout.tsx:239`). Insert `renderToStaticMarkup` of hook-free `*View` components with fixtures (`useT` defaults to en, `i18n.tsx:34-39`).
3. **Fixtures:**
   - roster with 0, 1 and 5 bots in every status;
   - strip OFF, ON, auto-off (×3 causes) and engine-stale;
   - KPI values 0, TZS 999,999, TZS 2,500,000, `unavailable`;
   - every tab 0-row and n-row;
   - rules form clean and with errors, plus the timing preview;
   - wizard steps with balances 0, 1,000 and 2,500,000, and ineligible rows;
   - money and history tables;
   - the S6 lines;
   - the S7 chip.
4. **Widths:** 320, 360, 640, 768, 1024, 1280, 1920.
5. **Assertions per cell:**
   - (a) `scrollWidth ≤ clientWidth+1`;
   - (b) no text leaf wider than its box and no wrapped TZS node (Range line boxes, DESIGN-BASELINE §3b);
   - (c) no truncated node starting "TZS";
   - (d) field heights = 44, buttons ∈ {32 row/filter, 40, 44}, and at ≤768 every non-row primary control is ≥44 by `elementFromPoint`;
   - (e) `[data-field-measure]` width ≤ 640;
   - (f) every card child's rect ⊂ its card rect;
   - (g) every chip is one line (height ≤ 25).
6. **Control:** `--sheet-missing` must turn every assertion red (`type-bench.mjs:24-27`).
7. **Out of scope for this harness:** Modal, Select listbox, overlay, PendingChangesBar and the UserPicker listbox are **NOT MEASURED** here (X3), and are printed as such.
8. PNGs go to `.qa-design-gate/house-bots/<view>-<w>.png` (gitignored), and **each one is opened with Read and looked at**.

**Phase D: real-route client pass** (modals, picker, guard, overlay).
1. Local Postgres on `127.0.0.1:5433` behind the loopback guard, with `prisma migrate deploy` and `seed:house-bots-local`.
2. An owner ADMIN with a password, following `seed-visual-admin.mts` (its header: `next start` + real DB + `/auth/admin` login), plus bots in PAUSED(NEW), ACTIVE, AUTO_PAUSED(PASSWORD_CHANGED) and REMOVED.
3. Start with `DISABLE_ADMIN_TOTP=true npm run start` (`responsive-audit.mjs:712-721`).
4. Drive at 360, 768 and 1280, never submitting:
   - open master ON, Remove, Re-verify, Start, Pause and Cancel;
   - type and dirty the form, then switch tabs → the guard prompts;
   - picker ↑↓/Home/End/Enter/Esc;
   - Tab focus order;
   - Esc, then check focus returns to the trigger.
5. Also run `qa:chaos` (`chaos-render.mjs`, widths 320–2560, `ROUTES=` via `MSYS_NO_PATHCONV=1`, `LIVE_BASE=http://localhost:3000`) and `qa:pending-bar ROUTE=/admin/house-bots/<id>?tab=rules FIELD=…`.
6. These drives log in through `scripts/live/harness.mjs` personas (`:29,204`), so the seed must create a matching persona. **If the local admin login fails, record NOT MEASURED. Never fall back to `next dev`.**

**Phase E: player surfaces** (dev works for player routes).
1. `next dev`, then `GET /auth/demo` (dev-only, `auth/demo/route.ts:1-14`).
2. A new dev route, `src/app/api/dev-test/seed-house-stake/route.ts`:
   - it returns the production 404 **before its first `await`** (`dev-route-guard.test.mts:17-20`, patterns `:55-60`) and requires the session (`seed-player-portfolio/route.ts:72-76` shape);
   - it stamps `houseBotId` on one poll position + its transactions **and** one Up & Down position (the portfolio seed places polls only, DESIGN-BASELINE §3c).
3. Set the `kp-locale` cookie to en, sw, zh and assert `<html lang>`.
4. Widths 360, 640, 768, 1024, 1280, 1920 on `/positions`, `/markets/<id>`, `/wallet` (expand the marked row), `/updown/history`, `/legal/rules/up-down`, `/legal/rules/yes-no`, `/legal/terms`, `/help`.
5. Assert:
   - zero overflow;
   - the chip row wraps inside the card in SW at 360;
   - houseStake shows the note row with no "Selling closed" and no countdown;
   - a signed-out `/markets/<id>` has no chip.
6. Run `MSYS_NO_PATHCONV=1 ONLY=/positions,/wallet,/updown/history LOCALES=en,sw,zh node scripts/responsive-audit.mjs` against dev. Under `next start` the audit's `/auth/demo` 404s and it runs as a guest (`responsive-audit.mjs:676-698`).
7. `test:motion` runs against phase B's server.

**Phase F: production, read-only, after the merge.**
- `dpl=` SHA check.
- Add `/admin/house-bots` to `ADMIN_ROUTES` (`routes.mjs:17-24`).
- `qa:dg-shell` and `qa:dg-measure` with one shared login (`design-gate/session.mjs`); the tabs are expanded from the rail.
- Open the master ON Modal and **cancel**. Search the picker and view a check card **without designating**.
- Player legal pages in 3 locales (cookie).
- Every PNG is read.

### Critical Files for Implementation
- C:\kipindi-main\src\components\admin\admin-shell.tsx
- C:\kipindi-main\src\lib\status-tone.ts
- C:\kipindi-main\src\components\markets\sell-button.tsx
- C:\kipindi-main\src\app\admin\agents\agents-client.tsx
- C:\kipindi-main\scripts\filter-language.test.mts