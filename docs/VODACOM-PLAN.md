# VODACOM PLAN — the sponsor's "Simplified Journey", built in 50pick's design system

> ⭐ **Say "continue Vodacom plan" in any session, on any machine.** Read §0 RESUME AT below, then do the session
> it names, following the session law in §0. The approved plan is §5 onward; the rulings are the v5 INHERIT-MANIFEST.

> **The one tracker for this programme.** Owner: Ali. Opened 2026-09-29.
> - **Rulings:** [`docs/design-system/v5-2026-09-29-simplified-journey/INHERIT-MANIFEST.md`](design-system/v5-2026-09-29-simplified-journey/INHERIT-MANIFEST.md) (SJ-1 … SJ-24).
> - **The agency's deck and frames:** the same folder (`50pick_Simplified_Journey.pptx`, `frames/1-home.png` … `frames/5-how-to-play.png`).
> - **Reply to the agency:** [`AGENCY-REPLY.md`](design-system/v5-2026-09-29-simplified-journey/AGENCY-REPLY.md).
> - **What the journey takes out of use:** [`docs/SHELVED.md`](SHELVED.md).
>
> **Guard:** `test:vodacom-plan` keeps §0 and §1 honest.
>
> Worktree `C:\kipindi-journey`, branch `simple-journey`. Merge to `main` = live, and every change stays behind the
> `simpleJourney` rollout until the S15 flip.

## §0 · RESUME AT

**State (2026-10-01):** S3b (the measures baseline) is LIVE (`64a63b7c`, deployed 2026-09-30 22:47 UTC): the old
journey's funnel is counted from now — the 14-day baseline clock has started (§0f). S3 (the engine) is ✅. S2 is LIVE
(`473807b1`) and waits on an officer approving the short titles (§0d). S1 is LIVE (`41ec1703`) and waits on one press
by Ali (§0b "Still open"). Nothing new reaches players (the counters are invisible; the insights panel is admin-only).
S4 (the Claude Design pass) is 🔨: all eleven brief items are on the Design canvas and BRIEF.md is filed; the
four-expert panel scored the first pass D 6.5 · F 6.5 · C 6 · A 5, and every finding is now applied (canvas v16,
102 boards). It waits on Ali's choices 2 and 3 (§0g).

**Next:** (1) S4: Ali answers choices 2 and 3 on the canvas (1B is set by §M3), then S4 is ✅ (§0g "Still
open"); (2) on the days after the deploy, read
the first totals with `qa:journey-funnel` (read-only) — when counts appear daily, S3b is ✅ and the baseline runs to
2026-10-15 at the earliest. In parallel: an officer approves the S2 short titles; Ali presses S1's preview switch.

Session law, the same for every session:
- Code, two-store tests, and `red:*` twins reachable from `red:all`, with declared anchors.
- `test:red-anchors` after any refactor.
- `test:all` before each push.
- Heavy Node only through `~/heavy-node-lock.sh`; red harnesses run detached, never piped.
- Real-browser viewport tiles, read one by one.
- Merge, push, verify the deploy commit.
- This file, `SHELVED.md` and memory updated in the same pass.

A gate is named as an `npm run` command only once its key exists in `package.json`.

## §0a · S1 research (read-only, 2026-09-29): what to model the switch on

**Where each piece goes**
- **`src/lib/feature-state.ts` must stay pure.** It is client-reachable, and its only import is a type from `roles.ts`.
  Put only the code/env ceiling there, e.g. `simpleJourneyCeiling()` returning `{ ceiling, source }` from
  `FEATURE_SIMPLEJOURNEY`, modelled on `inviteRewardsCeiling()` (`feature-state.ts:302-332`).
- Keep `FeatureState` at two members (the file's own COMING_SOON argument, lines 67-92). Key names are read by
  `test:house-bot-surfaces`, so use neutral words.
- **The DB half and the composition go in `src/lib/server/`**, modelled on `src/lib/server/invite-rewards-switch.ts`:
  - one `SystemConfig` row holding `{ token }`, sealed with `signSession` plus a purpose tag and a version;
  - strict verify (`ABSENT` / `UNREAD` / `MALFORMED` / `SET`);
  - a `composeX(ceiling, stored)` truth table;
  - a ≤10 s cached reader for screens and `/api/health`;
  - `writeStoredSwitchVerified`, which seals, saves, reads back and compares;
  - a test seam.
  - The write ceremony is `invite-rewards-ceremony.ts` → `switchInvitePayable()`: stored-role check, TOTP, reason
    5–300, `withLock`, an audit row BEFORE the write, then an outcome row.

**Roles** (`src/lib/server/roles.ts`, pure)
- `ADMIN_CONSOLE_ROLES` = ADMIN, COMPLIANCE, MODERATOR. `STAFF_ROLES` = those three plus FINANCE, GROWTH, AUDITOR,
  SUPPORT. SJ-23 wants every staff role, so use `isStaffRole`.
- ⛔ The session role is a photograph. For "the issuer must still be staff", re-read `db.user.findById(issuer)`, as the
  desk action does.

**Crypto and cookies**
- `signSession` / `verifySession` are in `src/lib/server/crypto.ts:139-160`. `exp` is checked automatically; take the
  nonce from `randomId()`.
- Purpose-tagged tokens: `share-token.ts` (`p: "win-share"`).
- Cookie write pattern: `src/app/admin/totp-verify/actions.ts:51-64` (httpOnly, sameSite lax, secure in prod, path /,
  maxAge). Cookie constants are named `*_COOKIE*`, so `test:privacy-notice`'s census resolves them.

**Privacy (same commit as the cookie)**
- §7 wording in en/sw/zh inside `<LegalSection n="7">` (`src/app/legal/privacy/page.tsx`).
- A version bump in `META`, plus a new `PRIVACY_EN_SHA`.
- In `scripts/privacy-notice.test.mts`: add the name to the `COOKIES` pin and an entry to `COOKIE_WORDS`.
- A COMPLIANCE-DECISIONS heading `## <date> · Privacy v<version> …`.

**Admin action**
- An exported `*Action` under `src/app/admin/**/…action*.ts` must have a caller in the same commit
  (`test:orphan-actions`).
- A gate on a domain literal must match the route's domain or be declared in `CONTROL_DOMAIN` (`test:control-gates`
  §5). A new `CONTROL_DOMAIN` entry needs rows for all 9 roles (§2).
- Toggle UI model: `src/app/admin/resolver-queue/two-admin-toggle.tsx` (kit `Toggle` + `ConfirmModal`,
  `runAdminAction`, `useMayAct`).

**Shell and navigation**
- AppShell is in the root layout and is not re-run on soft navigation (`test:shell-boundary`, `test:layout-staleness`).
- After setting or clearing the preview cookie, use `router.refresh()` (same shell) or a hard navigation (shell
  changes).
- `app-shell.tsx:206-230` shows how the viewer is built from the DB row.

**Health and audit**
- `/api/health` is public and has no commit field. Add a `simpleJourney: { ceiling, state }` block beside
  `inviteRewards` (`route.ts:179-183`). `qa:live` (`scripts/pre-deploy-live-check.mjs:365-395`) shows the dual-mode
  check.
- `audit()` never rejects; read `.recorded`. Name the actions `journey.preview.on/off`,
  `journey.rollout.attempt/set`.

## §0b · S1 as built (2026-09-30)

**What exists now**
- **The rollout** — `RolloutState` = WITHDRAWN / STAFF_PREVIEW / ACTIVE, in `src/lib/feature-state.ts`, separate from
  `FeatureState`. The ceiling is `simpleJourneyCeiling()`: STAFF_PREVIEW as shipped (S15 changes that one word), or
  exactly what `FEATURE_SIMPLEJOURNEY` says. What anybody sees is the LOWER of the ceiling and the Owner's switch.
- **The Owner's switch** — `src/lib/server/simple-journey-switch.ts`: one sealed `SystemConfig` row,
  `journey.rollout.switch`, read through a ≤ 10 s snapshot, so a Stop reaches every container within 10 seconds.
  No row = no cap (the ceiling decides). A row that cannot be read or does not verify = WITHDRAWN.
- **The ceremony** — `src/lib/server/simple-journey-ceremony.ts`, the invite switch's shape: Owner on the stored
  role, two-step check, a 5–300 character reason, the lock, the COMPLIANCE attempt row BEFORE the write, a read-back.
  Three acts: the cap (Stop · Resume · staff preview only), issue a preview link, revoke one.
- **The pass** — one HttpOnly cookie, `kp_preview`, sealed with its own secret `JOURNEY_PREVIEW_SECRET`
  (`src/lib/server/journey-preview.ts`). At most 24 hours. Re-checked on every request: a staff pass counts only
  while its issuer's stored row is a staff role on an open account; a link pass only while its link is live.
- **The doors** — `src/app/preview/route.ts` (POST on/off, GET `?t=` for a link), every answer a 303 with
  `private, no-store`, the decisions in `src/lib/server/journey-preview-doors.ts`.
- **The one resolver** — `resolveSimpleJourney()`: AppShell and (from S7) every journey page ask it, so they
  agree. AppShell paints the "Preview" bar (`preview-marker.tsx`) only when it says so.
- **The console** — `/admin/journey` ("New journey", Overview): every staff role sees it and turns their own
  preview on or off; only the Owner moves the rollout and creates or revokes links.
- **Health** — `/api/health` → `simpleJourney: { ceiling, state }`; `qa:live` [E2] asserts no marker for a
  signed-out visitor or the demo player while the state is not ACTIVE.
- **Privacy v2026-09-30** — §7 names `kp_preview` in en/sw/zh; COMPLIANCE-DECISIONS has the entry.

**Decisions taken under Ali's delegation (2026-09-30)**
1. The preview is **opt-in**: a staff role alone sees nothing new, so staff can still see the site as players do.
2. The pass **survives sign-out and sign-in**, so staff can preview as a guest, register a test player and bet as
   that player under the same pass (S8/S10/S14). It opens a view and nothing else, and the bar with "Exit preview"
   is on every page while it counts.
3. The agency's links live **inside the Owner's sealed record**: a revoke and a Stop are the same kind of act, on
   one record, with one reason trail. 25 live links at most; ended and revoked links make room.
4. A Stop is **primary, not claret**: it is undone by Resume, and §B4a keeps claret for acts that cannot be.

**Guards** — `npm run test:simple-journey-flag` (two stores, 128 checks) and `npm run red:simple-journey-flag`
(in-process, 26 planted defects, each caught), in `predeploy`. `npm run qa:journey-preview` is the local browser
drive (guest, SUPPORT officer, player, Owner Stop and Resume, a stranger on a link, revoke): 30/30 on 2026-09-30.

**Still open (S1 close-out)** — pushed (`41ec1703`), `JOURNEY_PREVIEW_SECRET` set on Railway (48 characters),
deploy verified, and a signed-out visitor sees nothing on production (`qa:live` 319/0 there, [E2] included). One
press by Ali remains: `/admin/journey` → "Turn my preview on" → the bar on 50pick.tz. Then S1 is ✅.

## §0g · S4 (2026-10-01) — the Design canvas: all eleven items drawn, the panel's findings applied; waiting on Ali

**The canvas:** https://claude.ai/artifact/UGVgjpiQFwep2hzfYLf3M6 (an Artifact of type Design, private to Ali until he
shares it). ⭐ The canvas is the source of truth for S4's frames — no copy lives in the repo. To revise it, `read` its
`project/*.dc.html` files and publish the changed ones to the same URL.

**What is on it (brief §6 item 1):**
- **Main board:** the component map for all five screens, "What never changes", and three numbered choices. Each choice
  has a switch in its frame's Tweaks panel:
  - **1A / 1B:** gold or neutral step numerals (How to Play).
  - **2A / 2B:** a royal ring or a filled light chip for the chosen amount (Bet sheet, Deposit).
  - **3A / 3B:** a royal or neutral play plate (Home).
  - My picks: 1A, 2A, 3A.
- **Row 1:** the agency's five frames, as delivered.
- **Row 2:** the same five screens in 50pick's system, at 390 × 844 so they sit beside the agency's frames. The
  320/360/412 widths come with items 2–11.
  - They can be tapped through: Home NDIO → Bet sheet → 5,000 → Balance too low → "Weka pesa TZS 3,000" → Deposit.
    The How-to card opens How to Play.
  - Every word is the deck's Swahili, from the §3 key table. The figures are S3's golden fixtures.

**Design calls made in the redraw.** Each is written on the Main board. The build (S7/S8) inherits them.
1. **Estimate panel:** a neutral inset, with the figure in white mono. Green means YES and gold means money-in, so
   neither is used for an estimate.
2. **Stake field:**
   - Focus uses the brand focus ring, never gold.
   - "Too much" (the attention state) is a strong neutral border, `oklch(78% 0.06 268)`, never the error or NO colour.
3. **Button inks:**
   - Pay (Lipa) is the royal primary button.
   - Place bet (Weka dau) is gold.
   - Deposit entries are `gilt-metal`.
4. **Disabled gold button.** `.btn:disabled` (opacity 0.45) turns the gold button a muddy brown on navy. The build adds
   a navy disabled look for the gold button: background `oklch(28% 0.12 268)`, `--text-subtle` words, a 1px
   `--border` edge.
5. **Wallet rows** use the product's own `PaymentLogo` white tiles. The four `public/pay/*` marks are uploaded to the
   canvas.
6. **The low-balance row's second line** names all four wallets (from `depositRails()`, R3).
   - At 390 it wraps to two lines, breaking cleanly before "Mixx by Yas", and it is drawn that way.
   - S8 must keep each wallet name unbreakable (nowrap), so a break always falls between wallets.
7. **Amounts** are mono and never letter-spaced (M4), including inside the gold button, which tracks its label
   0.02em. The helpline number is not an amount: it is Inter with tabular figures, because mono sat off the link's
   underline.
8. **Selection** (the chosen chip or filter) uses the product's own `--pill-active` fill plus a `--brand-400` ring.
9. **Deposit follows §3.5's order, not the frame's.** The frame omits three things the rulings add:
   - The phone number comes pre-filled (SJ-13), with "Tumia namba nyingine" beside the "Namba ya simu" label.
   - "Lipa kwa kadi" sits under "Lipa", not among the wallets.
   - A small 18+ and helpline line closes the screen (SJ-18: the focused screen has no footer).

   With all three, the screen fits 390 × 844 only with 48-px wallet rows and 12-px gaps. At 360 × 640 it scrolls; S9
   measures this.
10. **The phone header fit (brief item 2), measured in Chromium with the real fonts.** Cases: widths 320/360/390/412
    × sw/en/zh × balances TZS 2,000 / 125,000 / 1,250,000 / 10,000,000.
    - **As first drawn** (30-px mark in a 44-px box, 8-px gaps, 14/16-px pill padding), it overflows in 17 of 48 cases:
      - Swahili at 360 from TZS 125,000;
      - English at 360 at TZS 1,250,000;
      - at 320 in every case except Chinese at TZS 2,000.
    - **Rule from 360 up:** the product's own 26-px mark, its link still 44 px tall and widened to 44 px by a −9-px
      margin into the gutter; 6-px gaps; 10-px balance-pill padding; 12/10-px padding on "+ Weka pesa". This fits
      every case from 360 up.
    - **Rule below 360:** 12-px side gutter, "Weka pesa" without the "+" glyph, and a 12-px balance figure. This fits
      every case at 320, Swahili at TZS 10,000,000 included (exactly 320). The 390 frames now use the 360-up rule.
    - S6's header-fit gate asserts both rules.
11. **Card buttons (brief item 3), measured the same way.** Labels were checked at 320/360/390/412 in sw/en/zh.
    - The second line may wrap to two lines. Both buttons then grow together, from 64 to 74 px.
    - At 320, even "Shinda ≈2.8× dau" wraps (so does the English). "Shinda zaidi ya 100× dau" wraps at every width.
    - The card uses SJ-1's "Kuwa wa kwanza" as a NEW short key. The existing `beFirst` ("Kuwa wa kwanza kutabiri")
      wraps at every width, and it stays for the market page.
    - A figure never leaves its unit: a no-break space joins "≈2.8× dau", "1 Oktoba" and "10 Okt". So a break
      reads "Shinda / ≈2.8× dau", never "…≈2.8× / dau".
    - **Open, written on the canvas:** SJ-3's legacy caption has no player sentence. `describeFeeModel` returns
      English admin text ("capped 13%/33.33%"). The card shows the side word alone; the sheet can reuse today's
      `payoutCalcBody` sentence.

**Found while collecting copy, and fixed: F1 (`4b6d9b59`, live and verified).**
- On the deposit page, a DELAYED payout status paired the delayed title with the UNAVAILABLE deposit warning ("…you
  will not be able to take money out again until payouts are restored"). That is false while withdrawals still work.
- The words now come from one pure function, `payoutNoticeCopy`.
- `test:cert-f1` §9 checks every status × page pairing by what the player reads. It also replays the old logic,
  which must fail (the control).
- The real component, rendered server-side, now shows:
  - nothing when operational;
  - the delayed title and body when delayed;
  - the "cannot be paid" warning only when unavailable.

**Progress on items 2–11 (2026-10-01):**
- Item 2 ✅ on the canvas (row "2 · The header in every state", seven frames):
  - signed in at 360 and at 320 with TZS 1,250,000;
  - guest at 390 and at 320 (today's "Ingia" and "Jisajili" pills);
  - held wallet: the existing "Salio · limegandishwa" with a lock, and no Weka pesa pill, because a frozen wallet
    cannot take deposits;
  - balance hidden;
  - desktop at 1280, with the four destinations, language, bell and avatar.
- Item 3 ✅ on the canvas: the card row (ten frames) and the home row (loading, seven chips scrolled, an empty
  category, the end of the first page with "Onyesha zaidi", and desktop at 1280 in three columns).
  - The empty-category words are drafts, noted on the canvas.
- Item 4 ✅ on the canvas (row "4 · The bet sheet in every state", 19 frames). They are:
  - guest;
  - below the minimum and above the maximum;
  - the estimate updated;
  - legacy fee, one-sided refund, already holding, thin upside (≈1.0×);
  - placing, and the receipt;
  - closed while open;
  - the five blocking refusals, and the four inline ones;
  - the keyboard open at 360×640;
  - desktop, as a centred dialog.
  Every figure comes from the payout formula on a stated pool.
  - **Design calls** (on the canvas):
    - Bounds use the first sentence of today's refusal, in the neutral family.
    - An invalid stake shows "TZS —", and the button reads "Weka dau" with no amount.
    - Blocking or inline follows `REASONS[].channel`.
    - With the keyboard up, the estimate collapses to the compact row and the chips step aside.
    - The bonus-wager warning is not drawn, because the bonus wallet is withdrawn.
  - **Finding for S12 (words and i18n):** every date formatter in `lib/utils.ts` hard-codes `en-GB` and takes no
    locale (`formatDeadline`, `formatDayTime`, `formatDateTime`, `formatDayShort`). Swahili and Chinese players
    read English months: "8 Oct" and "11 May" where Swahili says "8 Okt" and "11 Mei". The frames show the Swahili.
    Fixing it means threading a locale through every caller, and `test:timer-date` must hold. That is its own lane.
- Item 5 ✅ on the canvas (row "5 · Balance too low", six frames, each a branch of `shortfallPlan`).
  - Deposit only: balance 0; and short by less than TZS 500, where the deposit is 500 with a note (draft).
  - "Bet instead" only: the deposit limit is reached; and every deposit rail is paused.
  - No option: source of funds is needed.
  - Waiting: a deposit is already pending.
  - The two-option state is the redraw in row 2. A held wallet shows item 4's frozen refusal, because the plan blocks
    it before any offer.
  - With one option the eyebrow is dropped. When no deposit is offered, the reason is today's refusal sentence, shown
    before the player tries.
- Item 6 ✅ on the canvas (row "6 · Deposit", 19 frames). They are:
  - the email-code step: sent, wrong, expired, too many tries, a new code sent, no email on file;
  - no history (nothing preselected; "Lipa" disabled), one wallet paused, an amount typed below the shortfall, and
    the payout-delayed notice;
  - the new waiting page: fresh, slow, long, paid, failed, held for return;
  - the return: the question closed meanwhile, and the stake clamped;
  - desktop at 1280.
  - **Design calls:**
    - A wrong code is a form error in danger ink (the S2 ruling); everything else is neutral.
    - The payout notice takes the neutral family on the journey screen, because the brief forbids gold and danger
      for app state.
    - The stake clamp uses the loss headroom; a TZS 1,000,000 cap would make the example trivially thin.
  - "Held" means the payment landed after a break began: it is held in RG suspense until the team returns it
    (`wallet-service`), and the drafted words say exactly that.
  - Every draft is listed on the canvas.
- Item 7 ✅ (row "7 · How to Play", four frames): English, Chinese, 320×640, and desktop.
  - Measured sheet heights at 390: Swahili 641, Chinese 636, English 620. Swahili is the longest, as §A5 predicts.
  - At 320×640 the sheet is capped at the viewport minus 48 px. The steps and MFANO scroll under a fade, while
    "Nimeelewa, anza" and the limits and helpline line stay pinned, so the exit is always reachable.
- Item 8 ✅ (row "8 · Akaunti", three frames): signed in, guest, and the staff row.
  - SJ-17's items appear in its order, grouped into cards without headings. Every label is an existing key; the only
    new word is the plan's "Toa pesa".
  - The unread count shows on Arifa and as a dot on the Akaunti tab.
- Items 9–11 ✅:
  - Tiketi zangu: open (with the Maswali | Juu/Chini switch), settled, empty, and the guest sheet.
  - The market page, in §3.2's order, with the holder's ticket block above the two big buttons.
  - The Juu/Chini stake panel and its low-balance state, in the sheet's language.
  - **Calls:**
    - Open tickets show no payout figure (SJ-4 keeps §C3), and every timer names its absolute instant.
    - Juu/Chini keeps its own side buttons and floor-rounded × multiples; only the chips (full figures) and the
      low-balance pattern change.
    - "Tumia TZS 2,000 badala yake" (draft) sets the stake, because a Juu/Chini bet needs a side.
    - The market chart title is spelt NDIO; the dictionary still says NDIYO, one of SJ-19's seven fixes.
- **All eleven brief items are on the canvas: 91 frames.**
- BRIEF.md filed (`fe4e2b2c`); the panel ran next (below).

**The four-expert panel (2026-10-01).** Four independent reviewers read all 90 rendered tiles plus the frame
sources against `DESIGN_AUTHORITY.md`, the kit components, the rulings and the code:

| Expert | Score | Findings |
|---|---|---|
| Design-system fidelity (D) | 6.5 / 10 | D1–D20 |
| Deck fidelity and flow logic (F) | 6.5 / 10 | F1–F20 |
| Words: Swahili, terms, money truth (C) | 6 / 10 | C1–C25 |
| Accessibility, RG and consumer protection (A) | 5 / 10 | A1–A20 |

Every finding was checked against the code before acting; all hold. **All of them are applied: canvas version 16,
102 boards (11 new), every frame re-rendered and read tile by tile, nothing overflows.** The outcome, including the
defects the verification itself caught, is in BRIEF.md. What the revision changes, beyond fixing wrong figures and
words:
- **Rulings amended under Ali's delegation (all toward honesty or player protection):**
  - **SJ-1, the card over the 100× cap:** no number on the card ("Upande mdogo, ona makadirio"); a thin side reads
    "Faida ndogo · ≈1.0×". The zero-stake multiple over-promised (A7: 1,000 vs 150,000 shows >100×; a 10,000 stake
    gets ≈12.9×).
  - **SJ-11, "Weka dau la TZS 2,000 badala yake":** keeps the deck's words and one tap, and gains a second line with
    the estimate for the amount it places (A1: the only figure on screen was for 5,000).
  - **§3.5, the loss-limit return:** inform, don't pre-fill. The stake stays as typed, in the attention state; the
    line says what the limit allows; the chips above the room hide; the button is disabled (A3: pre-filling to the
    room nudges a player to use up their limit). Design call "the stake clamp uses the loss headroom" is withdrawn.
  - **SJ-17, Akaunti:** a Pumzika / Jizuie row, and the limits card above invite/rewards (A17).
  - **Plan §2 "Low-balance warning":** `Callout tone="info"`, not `neutral` (the kit's neutral is the dashed
    empty-state box, D5). The payout notice takes the same info family.
- **Choice 1 settled by the law:** 1A (gold step discs) is a decorative element in gold, which `DESIGN_AUTHORITY.md`
  §M3 names a violation (D1). My pick moves to **1B**; 1A stays on the switch only for Ali to overrule.
- **Pinned "now":** every frame dates from the deck's own day, 29 Sep 2026 11:19 EAT ("Siku 11" to 10 Okt). The
  first pass mixed 29 Sep and 1 Okt (F8).
- **Partly accepted:** A4 asked to drop gold from the deposit row; §M3a puts the deposit door in `gilt-metal`, so the
  gold stays and only its glow goes, and both option rows are the same height. C19's "Sindano" is the product name of
  The Needle and stays.
- **New frames:** sheet — loss room, empty side, empty pool, over the cap, hedge, unknown balance; return still short;
  waiting past 30 minutes; Juu/Chini round closed while paying; home on a break; the focus states.
- **Existing words found wrong** (e.g. "Lipo" for Payout, which reads "it is there"; "HALIJAONDOKA"; "pesa yote";
  "dau haziwezi"): the canvas shows the corrected words, and the dictionary changes ship after the native review,
  listed in `S4-COPY-AUDIT.md`.
- The copy researched for every state is filed in
  [`S4-COPY-AUDIT.md`](design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md), a dated snapshot;
  `i18n-dict.ts` stays the truth. Items marked "NO STRING" there need drafts (R8).

**Verified:** each redraw was rendered locally at 390 × 844 in Chromium and read one screen at a time. Result: no
overflow, all three fonts loaded, the logos loaded, and the B option of each choice rendered. Ali's standing rule
requires this, even though the Design type's own instructions discourage rendering.

**Still open:**
- Ali answers choices 2 and 3 (and may overrule 1B), or accepts my picks (2A, 3A).
- When he has, S4 is ✅ and S6 (the flagged shell) is next; the panel's amendments travel into S6–S11.
- A native Swahili review signs off the drafts and the existing-word corrections.
- ⛔ No player-facing UI code is written before the revision is filed.

## §0f · S3b (2026-10-01) — the measures baseline, LIVE on main since `64a63b7c`

The §3.10 counters, counting the OLD journey's analogues from now so the 14-day baseline exists before the flip. The
design follows the visit counter (`/api/pv` + `lib/server/site-visits.ts`, an inline memory/Prisma twin) exactly.

**The steps, and where each is counted.** The new journey writes the same steps from S7/S8 with `variant = new`.

| Step | Counted where | `origin` today (old journey) |
|---|---|---|
| home views | the existing visit counter (`SiteVisitPage`, path `/`) — no new counter | — |
| `sheet_open` | client beacon, once, when `SidePicker` reveals the dial | `home` (home links carry `from=home`), `board` (any other `?side=` link), `market` (a tap on the page) |
| `low_balance` | client beacon, once per dial, when the insufficient-balance state first shows | `dial`, `updown` |
| `bet` | server: `buyPositionAction` after `r.ok && !r.data.replayed`, fire-and-forget, never inside a lock | `dial`, `quick` (Up & Down) |
| `deposit_confirmed` | server: `settleDepositConfirmed`'s post-lock block (`outcome.credited`) | the deposit row's `origin`: `low_balance` (the Up & Down insufficient link carries `from=low-balance`), else `direct` |
| deposit → bet ≤ 30 min; time to first bet | computed at report time from rows (`completedAt`, `placedAt`, `createdAt`), players only, `houseBotId IS NULL` | — |

**Dimensions.** `variant` = `old`/`new` from `resolveSimpleJourney()` at count time. `utm_source`/`utm_campaign` =
the visit's first touch, kept in sessionStorage (`kp-utm`, the same safe shapes as `attributionFrom`), sent with client
beacons and as hidden fields of the bet form; a deposit confirmed by webhook has no browser, so it counts with no tag.

**Excluded.** Staff (the session role on server steps; the client beacon mounts only for a non-staff, non-preview
viewer, decided by the server layout), preview traffic, automation user agents (`isAutomatedAgent`), house-bot stakes
(they never pass the action), admin test deposits.

**Schema.** `JourneyFunnelDay { id cuid, day, step, origin, variant, utmSource, utmCampaign (all default ""), count;
@@unique over every dimension; @@index([day]) }`. `Transaction.origin String?` and `Position.origin String?`
(create-only). Hand-written additive migrations; the two `ALTER TABLE`s on the money tables use S2's lock-retry block.

**Retention and privacy.** 400 days, pruned beside the visit counts (`retention.ts`). Privacy v2026-10-01: §2 the funnel
totals with campaign tags, §5 their 400 days, §7 the `kp-utm` session key — one version bump, in the commit that ships
them. **Report:** a "Journey funnel" panel on `/admin/insights` (the four ratios + time to first bet, by date range).

**Pieces** — A: the store, schema, migration, retention, `test:journey-funnel` — ✅ (`lib/journey/funnel.ts` the one
allow-list; `lib/server/journey-funnel.ts` the memory/Prisma twin; `JourneyFunnelDay` + migration
`20261001120000_journey_funnel`; pruned by `retention.purge.daily`; red 10/10). B: `POST /api/funnel` + the beacon + the
old-journey client wiring — ✅ (`/api/funnel` = `/api/pv`'s rules, 204 always, no cookie; `lib/journey/funnel-beacon.ts`
sends only under the shell's server-rendered `data-kp-funnel` scope; `FunnelUtm` keeps the first-touch tags;
`sheet_open` from `SidePicker`, `low_balance` from the dial and the Up & Down quick-bet hook, the bet forms carry
`funnelOrigin`; the Up & Down deposit links carry `from=low-balance`, the home side links `from=home`; the suite drives
the real POST handler; red 16/16). C: the server counters + the `origin` column — ✅ (`countBetFunnel` in `buyPositionAction` after `r.ok && !replayed`;
`countDepositFunnel` in `settleDepositConfirmed`'s post-lock block by dynamic import; `Transaction.origin` —
"low_balance" or NULL, create-only in both twins, migration `20261001120100_transaction_origin` under the lock-retry
block; the deposit page/action carry `from=low-balance` → `origin`; the suite drives the REAL `deposit()`; red 22/22).
⚠️ Decision: `Position.origin` is DEFERRED to S8 — no S3b measure reads it (the bet counter records the origin at bet
time; "deposit → bet ≤ 30 min" is computed from row times), so S3b touches one money table, not two. D: Privacy v2026-10-01 — ✅ (en/sw/zh §2 "Journey counts", §5 400 days, §7 the tab key `kp-utm`; COMPLIANCE-DECISIONS
"Privacy v2026-10-01"; DATA-RETENTION row; `test:privacy-notice` §4h ties each clause to the schema, the beacon and the
key, with planted controls; the version pin and the English hash moved in the same commit). E: the insights
panel — ✅ ("Journey funnel" card on `/admin/insights`, its own read (`lib/server/journey-funnel-report.ts`): the three
counted measures per journey over 7/14/28 days and a campaign filter, deposit → bet ≤ 30 min and the median time to a
first bet from the rows; a pair whose counters disagree is held at 100% and marked (`lib/journey/funnel-measures.ts`);
behind the page's own access check; the kit `admin-tbl`; red 26/26). F: battery, drive, merge, deploy, and the first day's counts read on production — battery ✅ (green but for the reds
that pre-date S3b: type-scale, red-anchors ×2, and `test:house-bot-disclosure` 5.1 by construction on a branch that
changes published words); live drive ✅ 15/15 on a dev server with a real browser (a normal user agent, as the beacon
skips automation): a player's home-page tap counted as `sheet_open/home`, a board link as `sheet_open/board`, the TZS 0
dial as `low_balance/dial` twice, a real deposit from `?from=low-balance` confirmed and counted as
`deposit_confirmed/low_balance`, an admin scoped out; the panel read back "1 of 0", "0 of 2", "50% · 1 of 2" and was
read as tiles at 1280 and 390 (the phone layout stacks one block per measure — a table squeezed the words). Found and
fixed by the drive: SWC dropped the space before "(East Africa days)" (made explicit); a guest has no dial in the old
journey (the market page asks them to sign in), so "sheet" steps come from signed-in players.

**On production (2026-10-01, `?dpl=64a63b7c`, read-only):** both migrations finished (22:47:02 UTC), none unfinished;
`Transaction.origin` is nullable `text`; `JourneyFunnelDay` has exactly the pinned columns; `POST /api/funnel` answers
204 (a curl probe is automation and correctly not counted). No totals yet at deploy time (≈ 01:50 EAT) — the first
day's counts are read with `qa:journey-funnel` (`railway run -s 50pick -- node scripts/qa-journey-funnel.cjs` from a
Railway-linked tree).
- **First read (2026-10-01 01:31 UTC = 04:31 EAT, 2 h 44 min after the deploy, read-only):** totals 0, deposits with
  an origin 0. That is correct, not a fault: since the deploy there were 0 non-bot positions and no deposits; all 37
  `BET_PLACED` (and 36 `BET_REFUND`) rows carry a `houseBotId`, which the counter excludes by design. Re-read after a
  full EAT day of player traffic; S3b turns ✅ when counts appear daily. (From `C:\kipindi-main`, which is
  Railway-linked: `railway run --service 50pick -- node C:/kipindi-journey/scripts/qa-journey-funnel.cjs`.)

## §0e · S3 as built (2026-10-01) — ✅ merged to main

S3 is §3.1 in full, built as five pieces, each with its suite and an in-process red twin (all in `predeploy`). Verified
before the merge: the S3 battery (49 suites) green but for the reds that pre-date it (type-scale 749/239, red-anchors
×2) and `test:house-bot-disclosure` 5.1, red on any branch that changes the dictionary by construction; and a live
drive on a dev server — the route over real HTTP (public 200 `s-maxage=5`; `?me=1` 401 signed out, 200 `private,
no-store` signed in; 404 for a missing or junk id; 405 for POST), `/wallet/deposit` showing the shared ladder (1K–100K)
and `/auth/login` rendering, no page errors, the tiles read.

**Verified on production (2026-10-01, `?dpl=1c3d2359`).** Read-only GETs of `/api/markets/<id>/sheet`: a LIVE market
answers 200 `public, s-maxage=5, stale-while-revalidate=5`; `?me=1` signed out is 401; an unknown id is 404. Across the
ids on `/markets`: 10 loser-share markets priced or in an empty-side state, 2 legacy capped-commission markets `hidden`
(no figure, as SJ-3 rules), and the Up & Down rounds and settled markets 404, as they must. One priced read checked by
hand: YES 20,000 / NO 2,000 at 13% reads ≈1.1× / ≈9.7×, YES "thin" under that market's frozen `thinProfitRatio` 1.1.

| # | Piece | State | Where |
|---|---|---|---|
| 1 | The estimate — `src/lib/markets/estimate.ts` (+ `loserShareRate`/`loserSharePct` in `payout.ts`) | ✅ `5070d1a7` | `test:journey-estimate` (predeploy) + red 14/14 |
| 2 | The card's close label — `src/lib/markets/card-close-label.ts` + `cardClosesToday`/`cardDaysLeft`/`cardDaysLeftOne` en/sw/zh | ✅ | `test:card-close-label` (predeploy) + red 7/7 |
| 3 | The shortfall plan — `src/lib/journey/shortfall.ts` (+ `depositCeilingFor`, `lossHeadroomFor`, `DEPOSIT_QUICK_AMOUNTS`) | ✅ | `test:shortfall` + red 12/12; `test:deposit-ceiling` (the REAL `deposit()` / `checkLossLimit`) + red 9/9 |
| 4 | The pending bet — `src/lib/journey/pending-bet.ts` + `src/lib/safe-next.ts` (login's `sanitizeNext` moved there) | ✅ | `test:pending-bet` (predeploy) + red 10/10 |
| 5 | The sheet API — `GET /api/markets/[id]/sheet` (reads in `lib/server/journey-sheet.ts`; rate rule `sheet.ip`) | ✅ | `test:journey-sheet` (predeploy) + red 12/12 |

**Decisions taken in S3 (delegated):**
- `estimate.ts` imports `payout.ts` (itself import-free) rather than being import-free as §3.1 says: the sheet's figure
  must BE `payoutFor`'s, not a second formula (the `updown-pricing.ts` precedent). It stays client-safe and is pinned.
- The card's half-up is EXACT (BigInt over the rate in parts per million): at YES 3 / NO 65 and 13% the multiple is
  19.85, which the natural float formula rounds to 19.8. `test:journey-estimate` §c holds the tie.
- State precedence: closed → emptyPool → oneSidedRefund → fillsEmptySide → hidden → invalidStake → priced. The empty
  side is a FACT and shows even with the display switch off; the sheet prints a figure for a side it fills.
- A round's pending bet is `udr_<id>.UP|DOWN.<stake>` (Up & Down round ids are `udr_…`; §3.1's "round_x" was a
  placeholder). The stake is 1–9 digits, no leading zero; `?bet=` wins over the legacy `?side=`.
- Only login's copy of the same-origin rule moved to `safe-next.ts`. Twelve more copies of the same regex live in
  the auth pages, register, 2FA, OTP, session-ended, the preview route and the app shell, with deliberate small
  differences (some also refuse `/auth`, `/auth?`); folding them in changes auth behaviour and needs its own drive —
  a follow-up, not S3.
- The shortfall plan follows the REAL code where §3.1 and the code differ, and says so in its header:
  - a wallet that is not ACTIVE is `blocked` with no "bet instead" (the bet path refuses such a wallet, so the offer
    could only fail); the paused-deposit notice + "bet instead" is kept for the case where every deposit rail is paused;
  - "a deposit already pending" is a plan rule only (`deposit()` does not refuse a second one) — the plan waits on it;
  - the loss limit is the ONLY loss window the code has (`dailyLossLimit`, rolling 24 h);
  - chips above the ceiling are DROPPED, never clamped to the ceiling's value (no nudge to deposit up to a limit);
  - the SoF thresholds are inputs: they stay declared in `wallet-service.ts`, where `test:kyc-cert-d3` requires them.
- `/wallet/deposit` now reads its quick amounts from `DEPOSIT_QUICK_AMOUNTS` (the same values), so the ladder is one list.
- The sheet API is ONE route with two halves: the public half is shared-cacheable (`s-maxage=5`); `?me=1` adds the
  viewer's own (spendable, held sides, the bonus warning) as `private, no-store`, 401 without a session.

## §0d · S2 as built (2026-09-30) — LIVE on main since `473807b1`

**Where it is.** On main (merged 2026-09-30 as `473807b1`); `simple-journey` stays the lane's branch for S3 onward.

**What exists**
- The rules — `src/lib/markets/short-title.ts` (the ONE budget `SHORT_TITLE_MAX` en/sw 56, zh 28 code points; the forms
  "Je, …?" / "?" / "？"; GSM-7 for sw/en via the new `foldToGsm7` in `sms-compose.ts`; `cardTitle` falls back to the
  reader's OWN full title), `competitions.ts` (14 keys, Ligi Kuu first) + `competition-label.ts` (labels in
  `journey.comp*`, en/sw/zh).
- The columns — `PredictionMarket` and `AIPoll` each gained `shortTitleEn/Sw/Zh` + `competition` (nullable), by two
  hand-written additive migrations `20260930200000_market_short_titles` and `20260930200100_ai_poll_short_titles`,
  PROVEN on Postgres 18.3 (`verify:backup-schema` 13/0, 88 migrations applied).
- Both stores — `toStoredMarket` reads them, both upsert arms write them, and a narrow `setShortTitles` exists in BOTH
  twins (never `stamp`, never the full-row `set`). `createMarket` normalises them (Up & Down gets none).
- The one write after creation — `src/lib/server/short-title-service.ts` `applyShortTitles` (under the market lock,
  audited before/after): used by the admin edit ("Card short titles" on `/admin/markets/[id]`) and by approving a draft.
- The wizard (`/admin/markets/new`) takes optional short titles + competition; the AI poll generator drafts them (a
  failing language is null + a warning chip, never a filter reason) and publishing carries them to the market.
- The backfill — `src/lib/server/short-title-backfill.ts`: drafts for open markets (kill switch, budget, batch clamp,
  metered), staged in `SystemConfig` `shortTitle.draft.<id>`, reviewed on `/admin/ai-polls?tab=short-titles`
  (Approve / Edit, then approve / Reject). The sentinel's `checkShortTitleAgreement` checks each draft; "not checked"
  never reads as agreement; nothing reaches a market without an officer's approval.

**What passed (2026-09-30)** — `tsc` 0; `test:short-title-fit`, `test:short-title-edit`, `test:short-title-ai` and their
in-process red twins; `test:dal-parity` (+ `red:dal-parity`), `test:campaign-compose` (+ red), `test:chain-purge`
(+ red), `test:i18n`, `test:admin-*`, `test:ai-*`, `test:unsaved-changes`, `test:popup-fit` and ~40 more; the drive
`qa:short-titles` 14/15 in a real browser (the one miss was the drive's own label, since fixed). Red on main
BEFORE S2 and unchanged by it: recategorise (check 5, so `red:recategorise` cannot run), type-scale, tap-target,
decomment, red-anchors ×2.

**Verified since (2026-09-30, late)** — the review's fixes are in (`2536e4a0`, `20d77b45`, `1cfd9567` on the branch):
`tsc` 0; `test:short-title-fit` + red 17/17, `test:short-title-edit` + red, `test:short-title-ai` 167/0 + red 44/44,
`red:dal-parity`, `red:campaign-compose`, `red:chain-purge` and `red:recategorise` 9/9 (the recategorise lock fix is
proven; its check 5, red on main since the /results archive refactor, now follows `lib/results/archive.ts`); the
browser drive `qa:short-titles` 23/23 with every state read as a viewport tile at 1280 and 390; the Postgres 18.3 proof
of both migrations. The migrations now RETRY their lock wait inside the SQL, so a busy table can never leave a failed
boot row. Red on main before S2 and unchanged by it: type-scale, tap-target, decomment, red-anchors x2.

**The design pass (2026-09-30, night)** — three independent design critics (layout, type, kit) read every tile of the
drive, a second reader kept 54 of their 56 findings, and all 54 are applied (`a994b694`, `bfdb4f04` + the placeholder
fix on the branch). Verified after it: `tsc` 0; the full battery green except the reds that pre-date S2 (type-scale
749/239, tap-target, decomment 23/20, red-anchors — the same counts as main); `red:short-title-edit` 52/52; the
browser drive `qa:short-titles` 28/28 with every tile read at 1280 and 390:
- ONE WORDING. The rule sentences live beside the rules, client-safe, in `lib/markets/short-title.ts`
  (`shortTitleIssueSentence`, `SHORT_TITLE_LABEL`, the rule note `SHORT_TITLE_RULE_TITLE`/`_BODY`, `SHORT_TITLE_SW_FORM`
  with a NO-BREAK space so "Je, …?" never breaks across two lines, `shortTitleAuditMissed`). The server's refusals, the
  market page, the drafts tab and the wizard all print them; the wizard has no wording of its own.
- ONE COUNTER, ONE ERROR STATE. `n / max` in the number face, red over budget, and the kit's `error` prop (red box +
  `aria-invalid`) on all three surfaces — the drafts form's `aria-invalid` was being discarded by the Input atom.
- ONE ERROR INK. Form errors are `text-danger-fg`, never the betting NO pair — the wizard (its criterion lines too)
  and the AI poll form; guarded by `test:betting-ink` §6.
- The market page: an info rule note (it explains; amber is kept for what needs a second look), a real heading, "e.g."
  placeholders, a number-drift warning UNDER its field (cleared by typing), the sentinel's reason said ONCE, a warning
  toast when there is something to read, "Save card wording" (it saves the competition too) on its own row, and a rule
  under the control so the price bar belongs to the market again.
- The drafts tab: "Edit, then approve" REPLACES the read-only blocks (each language once), with the market page's fields;
  primary-first action rows; the reject reason says its minimum; an edited language says "not checked yet — the
  sentinel reads your words when you approve" (true in every case, unlike "edited after the check").

**Merged and LIVE (2026-09-30)** — `simple-journey` fast-forwarded main to `473807b1`; production served it within
four minutes (`?dpl=473807b1`). Read-only proofs on production: `_prisma_migrations` shows
`20260930200000_market_short_titles` and `20260930200100_ai_poll_short_titles` finished (20:52:09 UTC), no migration
unfinished, and the eight columns exist as nullable `text`; `qa:short-title-fit` read 62 open long-form markets — 0
stored values break the rules, and all 62 still fall back to the full title in every language (the backfill's work).
⚠️ NOT driven on production: the admin pages themselves. Every staff QA login except Ali's own was deleted by the
2026-09-11 reset, and signing in as Ali would sign him out of the console everywhere; they were driven in a real
browser locally (`qa:short-titles` 28/28) on the same commit.

**Left to do (S2 close-out)** — an officer presses "Draft short titles for open markets" on
`/admin/ai-polls?tab=short-titles` (one run drafts up to 25; the sentinel checks each draft in production) and approves
or corrects each one. When every open market has short titles within budget (`qa:short-title-fit` reports 0 fallbacks),
S2 is ✅. S2 changes NOTHING players see — the journey card (S7) is where short titles appear.

## §0c · S2 research (read-only, 2026-09-30): what short titles + competition must touch

**Where things really are** (the plan's names were wrong in places)
- The model is `PredictionMarket` (`schema.prisma:1612`), not `Market`; there is no `@@map`. `StoredMarket` is in
  `market-service.ts:207`; both store twins are in `market-dal.ts` (memory `memoryMarkets`, Prisma `toStoredMarket`
  + the two-arm upsert in `prismaMarkets.set`). `createMarket` (`market-service.ts:640`) is the one funnel.
- The 5 create paths: the wizard (`markets/actions.ts` `createMarketAction`), AI polls (`ai-poll-publish.ts:143`),
  candidates (`admin/candidates/actions.ts:71`), proposals (`proposals-service.ts:729`), Up & Down rounds
  (`updown-service.ts:755`). Seeds and dev routes also call it, so every new input field is OPTIONAL.
- Latest migration on main: `20260928170000_marketing_contact_book`. Copy the header style of
  `20260811120000_market_resolution_criterion_i18n`. Re-check `origin/main` right before committing.

**Traps that would ship a defect**
- A column must be read by `toStoredMarket` AND written in BOTH upsert arms, one key per line (dal-parity's matchers
  are line-anchored); a column in one arm only is wiped by the next resolve, settle, reopen or void.
- Never copy recategorise's write (unlocked get, then a full-row `set`): it can overwrite a concurrent stake's pool
  increment on a LIVE market. Use a narrow `setShortTitles` method in BOTH twins, under `withLock(market:<id>)`.
  `stamp()` refuses title fields on Postgres but not in memory — green in every suite, a throw in production.
- A short title stays NULL until approved; never a copy of the full or English title (the F8 rule). The fallback is
  the reader's OWN full title — `pickLocalized` falls back to English, so it is the wrong helper here.
- "Fits in 2 lines" cannot be measured on `.mcardp-q`: its clamp and `min-height` make every box exactly 2 lines.
  `test:short-title-fit` is a PURE budget check (code points: sw/en ≤ 56, zh ≤ 28; GSM-7 for sw/en only, via
  `sms-compose.ts`), and production's open markets get a separate read-only `qa:` read.
- A short-title problem must never become an AI `FilterReason` (`approveAIPoll` refuses any): store null plus a
  warning. `publishApprovedPoll` hand-copies fields, so new ones must be added there or they are dropped.
- `test:red-anchors` sits exactly at 65 undeclared: S2's red twins are in-process or declared. dal-parity §17–§19
  belong to marketing; extend §10/§11 in place. Never `prisma migrate diff` (it drops the trigram indexes).
- S2 changes nothing players see: the classic cards keep full titles; short titles surface on the journey card (S7).

**Recommended build order** — (1) `src/lib/markets/competitions.ts` (zero imports) + `short-title.ts` (the one
limits constant, the normaliser) + a `foldToGsm7` in `sms-compose.ts`; (2) schema + hand-written migration
(`SET LOCAL lock_timeout = '3s'`, four `ADD COLUMN IF NOT EXISTS`, plus AIPoll/MarketCandidate columns) + DAL +
dal-parity + chain-purge redaction; (3) the narrow writer + an audited admin edit (`market.short_title_edited`,
before/after, 2-line warning) + the 5 create paths; (4) AI: extend the Tier-2 `submit_poll` tool, a mock-safe
`draftShortTitles` for the backfill, and a separate budgeted sentinel `checkShortTitleAgreement` (never
auto-approves); drafts staged per market in `SystemConfig` (`shortTitle.draft.<id>`), approved one by one;
(5) `test:short-title-fit` + an in-process red twin + the production read.

**Decided under delegation unless Ali says otherwise** — English short titles are a question ending in "?"; Chinese
ones end in "？" (only the Swahili "Je, …?" is in the deck). Up & Down rounds get a deterministic short title from
`roundTitle` and stay out of the AI backfill. Competition labels live in the `journey` namespace until S15, with an
`IDENTICAL_OK` reason for proper nouns such as "EPL".

## §1 · Board

Status: ⬜ not started · 🔨 in progress · ✅ done and verified live · ⛔ removed by ruling.

| Session | Title | Status | Done when |
|---|---|---|---|
| S0 | File, rule, get ready | ✅ | Filed `2ac17c36` on main, 2026-09-29. Deck, frames, rulings, reply, tracker, SHELVED.md and compliance records are filed. `test:docs` + `test:landing-ten-plan` are green. The worktree installs. |
| S1 | The switch and preview | 🔨 | Built and verified locally 2026-09-30 (§0b). Done when staff see a "preview" marker on production and nobody else sees anything. The preview cookie is in Privacy §7 in the same commit. |
| S2 | Short titles + competition | 🔨 | LIVE `473807b1` 2026-09-30 (§0d); the backfill waits on an officer's approval. Done when every open market renders within 2 lines in sw/en/zh (`test:short-title-fit`) and the backfill is approved in /admin. |
| S3 | The engine (no UI) | ✅ | `6e7ee63b` 2026-10-01 (§0e). Golden fixtures pass: Dodoma ≈2.8×/≈1.4×, 1,000 → TZS 2,700 ≈2.7×, 5,000 → TZS 12,360 ≈2.5×; Yanga ≈2.9×/≈1.4×. Client/server parity is proven. |
| S3b | Measures baseline | 🔨 | LIVE `64a63b7c` 2026-10-01 (§0f), counting from the deploy. Done when old-journey analogue counts appear daily (`qa:journey-funnel`) and the 14-day baseline clock is running. |
| S4 | Claude Design pass | 🔨 | On the Design canvas (2026-10-01, §0g): all eleven brief items, 102 boards; the four-expert panel's findings applied (v16); BRIEF.md filed. Waits on Ali's choices 2 and 3. Done when frames for every new composition and undrawn state are filed and scored by the panel, and Ali has reviewed the 5 re-drawn frames. |
| S5 | ~~Colour foundation~~ | ⛔ | Removed by R5 (50pick's look stays unchanged): no palette, font or brand work. |
| S6 | Shell (flagged) | ⬜ | Every route keeps an entrance (route census). The header fits at 320/360/390/1024/1150/1279 × sw/en/zh × guest/signed-in. |
| S7 | Home and cards (flagged) | ⬜ | Staff see the deck's home on production. `test:journey-above-fold` is green. |
| S8 | Bet sheet + low balance (flagged) | ⬜ | `test:bet-sheet`, V20 and the refusal matrix are green. A staff real bet works on production. |
| S9 | Deposit, email code, waiting and return (flagged) | ⬜ | `test:deposit-return`, `test:deposit-status-read` (exactly-once while racing the webhook) and `test:email-code` are green. The card `order_id` fix is live. |
| S10 | Visitor path | ⬜ | guest → sheet → register → deposit → back works. `test:post-register-landing` passes in both flag states. |
| S11 | How to Play complete + copy ready for the flip | ⬜ | Auto-open rules are proven. FAQ, chat intents, Rules, Terms and tagline are ready for the flip. |
| S12 | Consistency sweep | ⬜ | Juu/Chini uses the journey language, admin ink is fixed, short titles are used outside the site, NDIO is swept. |
| S13 | Measures panel and reporting | ⬜ | The panel shows before vs after. The CSV/PDF export and its definitions are sent to the agency. |
| S14 | Proof before the flip | ⬜ | `e2e:journey` is green. The identity checklist is ticked. A real TZS 1,000 journey works on production. The agency has signed off. |
| S15 | Launch | ⬜ | The flip commit is live and re-measured as a real player. Rollback triggers are watched. |
| S16 | Shelve (≥7 days after launch) | ⬜ | Old branches are unmounted and every SHELVED.md row is green under `test:shelved`. |

## §2 · What players see before the flip

Everything else ships behind `simpleJourneyFor` and changes nothing for players until S15. These are the only
player-visible changes before the flip, and each ships early on purpose:

| Change | Session | Why it ships early |
|---|---|---|
| Card deposit return URL carries `order_id` | S9 | A live money defect (MONEY-GATE §3.2). Today a charged card payer can land on "payment not found". |
| The classic deposit page's phone field becomes the kit `PhoneInput` (accepts 07…, 7…, 255…, +255…) | S9 | Today `maxLength=9` cuts "0712…" to "071234567" and the server refuses it. |
| "NDIYO" → "NDIO" in the 7 Swahili strings that still misspell it | S12 | A spelling defect; the side word is "NDIO" everywhere else. |
| Privacy notice: the staff preview cookie, and later the funnel totals | S1, S3b | The notice must name every cookie and stored total when it ships. |
| Admin Approve/Reject buttons move from `btn-no` to `btn-danger` | S12 | Admin only; NO ink is for betting sides (§B2a). |

## §3 · Wording table: every deck string

Rules for this table:
- **sw** is deck-verbatim and binding for these keys.
- **en** uses the deck's own English where the slides give it.
- **zh** is drafted: formal 您, 充值 for deposit, `break-keep`.
- Numbers, amounts and rates are always placeholders. `{amount}` renders as a nowrap money span.
- Side words come from `sideWord()`.
- New keys live in a `journey` namespace until the S15 convergence.

| Key | sw (binding) | en | zh (draft) |
|---|---|---|---|
| `journey.balanceCaption` | Salio | Balance | 余额 |
| `journey.depositAction` | Weka pesa | Deposit | 充值 |
| `journey.howToCardTitle` | Jinsi ya kucheza | How to play | 玩法说明 |
| `journey.howToCardMeta` | Hatua {steps} · dakika {minutes} | {steps} steps · {minutes} min | {steps} 步 · {minutes} 分钟 |
| `journey.headlineAsk` | Jibu swali. | Answer the question. | 回答问题。 |
| `journey.headlineSides` | {yes} au {no}. | {yes} or {no}. | {yes}还是{no}。 |
| `journey.cardClosesToday` | Inafungwa leo | Closes today | 今天截止 |
| `journey.cardDaysLeft` | Siku {n} | {n} days (n = 1: "1 day") | {n} 天 |
| `journey.cardWin` | Shinda ≈{mult}× dau | Win ≈{mult}× your bet | 赢 ≈{mult}× 投注 |
| `journey.cardWinOver` | Shinda zaidi ya {cap}× dau | Win over {cap}× your bet | 赢超过 {cap}× 投注 |
| `journey.tabQuestions` | Maswali | Questions | 问题 |
| `journey.tabTickets` | Tiketi zangu | My tickets | 我的注单 |
| `journey.tabAccount` | Akaunti | Account | 账户 |
| `journey.showMore` | Onyesha zaidi | Show more | 显示更多 |
| `journey.sheetChosen` | Umechagua {side} | You picked {side} | 您选择了{side} |
| `journey.stakeLabel` | Dau lako | Your bet | 您的投注 |
| `journey.estimateLead` | Ukishinda, unapata takriban | If you win, you get about | 若您赢，约可获得 |
| `journey.estimatePill` | ≈{mult}× dau lako | ≈{mult}× your bet | ≈{mult}× 您的投注 |
| `journey.estimateNote` | Makadirio. Kiasi halisi hutegemea bwawa soko likifungwa. Kamisheni ya {pct}% imeshatolewa. | Estimate. The final amount depends on the pool when the market closes. Our {pct}% commission on the losing side is already deducted. | 预估。最终金额取决于市场关闭时的奖池。已扣除输方 {pct}% 的佣金。 |
| `journey.balanceRow` | Salio lako | Your balance | 您的余额 |
| `journey.placeCta` | Weka dau · {amount} | Place bet · {amount} | 投注 · {amount} |
| `journey.placeCtaBare` | Weka dau | Place bet | 投注 |
| `journey.estimateCompact` | Ukishinda ≈ {amount} | If you win ≈ {amount} | 若赢 ≈ {amount} |
| `journey.lowTitle` | Salio halitoshi | Not enough balance | 余额不足 |
| `journey.lowBody` | Una {have}. Unahitaji {short} zaidi. | You have {have}. You need {short} more. | 您有 {have}，还需 {short}。 |
| `journey.lowChoose` | Chagua unachotaka kufanya | Choose what to do | 请选择操作 |
| `journey.lowDeposit` | Weka pesa {amount} | Deposit {amount} | 充值 {amount} |
| `journey.lowBetInstead` | Weka dau la {amount} badala yake | Bet {amount} instead | 改为投注 {amount} |
| `journey.pendingBet` | Dau lako la {amount} linakusubiri | Your {amount} bet is waiting | 您的 {amount} 投注正在等待 |
| `journey.amountLabel` | Kiasi | Amount | 金额 |
| `journey.payWith` | Lipa kwa | Pay with | 支付方式 |
| `journey.phoneLabel` | Namba ya simu | Phone number | 手机号码 |
| `journey.pinNote` | Utapokea ombi la PIN kwenye simu. Ukimaliza, tunakurudisha kwenye dau lako ulithibitishe. | You'll get a PIN prompt on your phone. When you're done, we bring you back to your bet to confirm it. | 您的手机将收到 PIN 确认请求。完成后，我们会带您回到投注页面进行确认。 |
| `journey.payCta` | Lipa {amount} | Pay {amount} | 支付 {amount} |
| `journey.payByCard` | Lipa kwa kadi | Pay by card | 用银行卡支付 |
| `journey.howToTitle` | Jinsi ya kucheza | How to play | 玩法说明 |
| `journey.howStep1Title` | Chagua swali | Choose a question | 选择问题 |
| `journey.howStep1Body` | Kila swali ni tukio halisi lenye jibu moja: {yes} au {no}. | Every question is a real event with one answer: {yes} or {no}. | 每个问题都是一个真实事件，只有一个答案：{yes}或{no}。 |
| `journey.howStep2Title` | Bonyeza {yes} au {no} | Tap {yes} or {no} | 点击{yes}或{no} |
| `journey.howStep2Body` | Utaona papo hapo unachoweza kushinda, mfano ≈{mult}× dau lako. | See immediately what you can win, e.g. ≈{mult}× your bet. | 立即看到您可赢取的金额，例如 ≈{mult}× 您的投注。 |
| `journey.howStep3Title` | Weka dau, subiri matokeo | Place your bet, wait for the result | 投注，等待结果 |
| `journey.howStep3Body` | Washindi wanagawana bwawa. Ushindi unaingia kwenye salio, unatoa kwa pesa ya simu. | Winners share the pool; winnings go to your balance and out via mobile money. | 赢家平分奖池。奖金进入您的余额，可通过手机钱包提现。 |
| `journey.howExampleLabel` | Mfano | Example | 示例 |
| `journey.howExampleBody` | Dau {stake} kwenye {side} inayoonyesha ≈{mult}× → ukishinda unapata takriban {payout}. Ukikosea, unapoteza dau lako. | A {stake} bet on {side} showing ≈{mult}× → if you win you get about {payout}. If you're wrong, you lose your bet. | 在显示 ≈{mult}× 的{side}上投注 {stake} → 若赢约可获得 {payout}。若猜错，您将失去投注金额。 |
| `journey.howCta` | Nimeelewa, anza | Got it, let's start | 明白了，开始 |
| `journey.howHelplineLabel` | Msaada | Helpline | 求助热线 |

Existing keys reused, unchanged:
- `rg.setLimits` "Weka mipaka"
- `nav.updown` "Juu/Chini"
- `market.catAll` / `catSports` / `catWeather` / `catMacro` "Zote / Michezo / Hali ya hewa / Uchumi"
- `common.yes` / `common.no` "NDIO / HAPANA", read through `sideWord()`
- `beFirst`, `oneSideOnly`

## §4 · The audit behind this plan

- **Scope:** on 2026-09-29, 15 read-only checkers audited the plan against the deck, the code, money, i18n and repo
  law. They produced 370 findings.
- **Skeptic checks:** 190 were re-checked by a skeptic: 184 confirmed, 5 wrong, 1 already covered.
- **The rest:** the other 180 were reviewed by hand before being applied. A weekly usage limit stopped their skeptics.
- **Folded in:** every applied finding is part of §5 onward.
- **Raw record:** workflow run `wf_f73d94b2-a47` in the session's workflow journal.

---

# §5 onward · The plan (approved by Ali, 2026-09-29)


## Context

On 2026-09-28 the agency that will sponsor and market 50pick sent `Downloads\50pick_Simplified_Journey.pptx`
(9 slides, author "fred muragwa").
- **What it asks for:** a simpler player journey. Short YES/NO questions, winnings shown on the buttons, a bet sheet
  that opens even before sign-up, a deposit offered at the moment of shortfall and then straight back to the bet, and
  How to Play at the top.
- **What it contains:** 5 phone frames (Home, Bet sheet, Balance too low, Deposit, How to Play), a Today→After table,
  4 questions for us, and 5 success measures.

**Ali's rulings (binding):**
1. **Functionality must be identical to the deck:** the flow, element order, states and copy. "No matter what we need
   to cut off." The Gaming Board licence covers it.
2. **Keep the email check before a first deposit,** done as an **inline 6-digit email code** on the deposit screen.
3. **Mixx by Yas is the 4th wallet row.** Card stays available through a "Lipa kwa kadi" link.
4. **Build hidden behind a staff preview and launch at once.**
5. ⭐ **The look is 50pick's own design system, unchanged:**
   - Fonts: Sora, Inter, and JetBrains Mono for money figures.
   - Colours: the `globals.css` tokens (YES green, NO red, royal primary, gold per DESIGN_AUTHORITY §M3).
   - Components: the kit components and the brand mark.

   The deck's colours, typeface and two-tone wordmark are **not** adopted. The deck's frames are templates for *what*
   happens; 50pick decides *how it looks*.
6. ⭐ **Remove from usage, never delete.** Everything the journey cuts is unmounted and **shelved in place**:
   - It stays in the code at the same path, still compiles, and its unit tests stay wired.
   - It is recorded in `docs/SHELVED.md` with how to re-mount it.
   - Anything the journey needs that we don't have is added in full.

**Outcome:**
- 50pick.tz **behaves** exactly like the deck and **looks** like 50pick.
- Every state the deck didn't draw is designed to the same standard.
- The money path stays exactly-once.
- The agency's five measures are live, with a before/after baseline.

**This version folds in a read-only audit:**
- 370 findings from 15 checkers; 190 were re-checked by a skeptic. Of those, 184 were confirmed, 5 were wrong, and 1
  was already in the plan.
- The 180 findings the skeptics could not check (the account hit its weekly limit) were reviewed by me before being
  applied.
- Raw record: the workflow journal `wf_f73d94b2-a47`. S0 files it into the repo.

---

## 0. Decisions taken under Ali's delegation (recorded as SJ rulings in S0)

**Money display**
- **SJ-1 Card figure.**
  - The card shows the zero-stake pool multiple, 1 + (1 − loser-share)·opposite/own, rounded half-up to tenths with
    integer arithmetic. This is exactly the deck: the card reads ≈2.8× while the sheet at TZS 1,000 reads ≈2.7×,
    because the player's own stake dilutes their side.
  - Empty own side → state words, never a figure: "Kuwa wa kwanza" (the existing `beFirst` key) or "Upande mmoja tu"
    (the existing `oneSideOnly` key).
  - Above the cap, it shows "Shinda zaidi ya {cap}× dau", where `{cap}` comes from `ESTIMATE_DISPLAY_CAP = 100` in
    `estimate.ts`. The cap is never typed into the dictionary (`test:rate-copy`).
- **SJ-2 Sheet figure.**
  - The TZS figure is `payoutFor()` at the entered stake, which equals the server's stored `potentialPayout`.
  - The "≈N.N×" is derived from that whole-TZS figure, half-up to tenths.
  - This is a scoped exception to the platform's floor rule; Up & Down keeps its floor.
- **SJ-3 Fee wording.** `{pct}` = the market's frozen loser-share total (`platformFeeRate + operatorFeeRate`, via
  `resolveFeeModel`/`loserSharePct`), never `commissionRate`.
  - sw is deck-verbatim: "Makadirio. Kiasi halisi hutegemea bwawa soko likifungwa. Kamisheni ya {pct}% imeshatolewa."
  - en: "…Our {pct}% commission on the losing side is already deducted."
  - Legacy capped-commission markets: no figure, and the `describeFeeModel` caption instead.
- **SJ-4 Where estimates appear.**
  - "≈" is the estimate marker on every figure.
  - The Makadirio sentence appears only where the deck draws it: the sheet's estimate box and the How-to MFANO box.
    It is not on cards and not on the low-balance compact row.
  - DESIGN_AUTHORITY §C3 (licence law) is amended **only** for the cards and the pre-bet sheet.
  - The post-bet receipt and Tiketi zangu keep §C3: no per-position payout before resolution.
- **SJ-5** The fixed 1.5× "possible winnings" is retired on loser-share polls. `/admin/config` copy changes at the
  flip.

**Home and cards**
- **SJ-6 Home = the question list.**
  - It shows `LIVE && !selectionClosed` markets only.
  - Order: soonest-closing first, ties by pool (the deck's order). This supersedes the 2026-09-12 pool-first ruling
    and the 2026-09-06 "CLOSED rows stay" ruling **for `/` only**.
  - Selection-closed markets live on `/live` and in Tiketi zangu.
  - `PLAYER_PER_PAGE` (12) cards per page, then an "Onyesha zaidi" link to `?page=n+1`.
  - No sort control and no search box on `/`. `?q` still filters; search lives in Akaunti.
- **SJ-7 Category chips.**
  - Order: "Zote" (no `?cat`), then only categories that have ≥1 open market. The deck's order Michezo · Hali ya hewa ·
    Uchumi comes first, then the rest.
  - Parameter `?cat=`, the same name `/results` and `/watchlist` use.
- **SJ-8 Card meta row.**
  - Left: `category · competition`, where competition is a new optional field such as "Ligi Kuu" or "EPL".
  - Right: the close label. Same EAT day → "Inafungwa leo". Otherwise "Siku {n}", counting EAT calendar days.
    Selection closed → the existing waiting label.
  - The market page and Tiketi zangu keep absolute dates beside every timer (Gaming Board item #6, `test:timer-date`).
- **SJ-9 Card taps.** The card body (stretched `.mcardp-open` link) goes to `/markets/[id]`. The two buttons open the
  bet sheet **in place** and never navigate.

**Bet sheet and deposit**
- **SJ-10 Bet sheet.**
  - Side locked ("Umechagua NDIO"), no side switch.
  - Chips 1,000 / 2,000 / 5,000 / 10,000 in full figures (never "1K"). A tap **sets** the stake. Chips come from
    `quickStakes(min, max)` and are filtered to the market's bounds, never to the balance.
  - The CTA "Weka dau · TZS X" **is** the confirm step. BetConfirmModal and its 10-second quote hold are shelved.
  - Enter never submits.
  - Success: an in-sheet receipt (side, stake, ticket) with **no navigation**.
- **SJ-11 "Weka dau la TZS {balance} badala yake"** places that bet directly. The button names the amount and the chip
  names the side.
- **SJ-12 Deposit-button ink.**
  - The low-balance "Weka pesa TZS X" is a deposit *entry* in `gilt-metal`, the same family as the header pill.
  - "Lipa TZS X" is a deposit *commit* in `btn-primary` (brand), per §M3a D1.
  - One-tap Lipa (no DepositConfirm) on the journey screen only. This supersedes audit M9 there; the classic card form
    keeps its confirm.
- **SJ-13 Deposit number.**
  - Journey mode seeds the phone number from the most recent **CONFIRMED** mobile-money deposit (reduced from its
    stored E.164), else the registered number. "Tumia namba nyingine" stays.
  - This amends Ali's E-210/E-215 (2026-08-25). `moneyFormMsisdn` gains an optional `lastDepositMsisdn`, and
    `test:msisdn-prefill` is extended.
- **SJ-13b Deposit wallet.** Preselect the last-used wallet. With no history, preselect nothing, and "Lipa" stays
  disabled until a wallet is chosen. The phone prefix never picks the wallet (`tz-msisdn` rule).
- **SJ-14 Phone field.**
  - The deposit field becomes the kit `PhoneInput`, which accepts 07…, 7…, 255… and +255…, typed or pasted, in 50pick
    look.
  - It replaces today's `maxLength=9` bare input, which cuts off "0712…". This fixes the classic page too.

**Header, tabs and Akaunti**
- **SJ-15 Phone header.**
  - `FiftyMark` (the lockup cannot fit at 360; measured), 18+ badge, then a **new captioned balance** ("Salio" over
    "TZS 2,000", TZS shown at every width, no eye or caret in the capsule), then the gilt "+ Weka pesa" pill.
  - Tapping the capsule opens WalletSheet, which holds the hide-balance eye and "Toa pesa". That makes Withdraw one tap
    from the capsule (V19).
  - Desktop ≥1024 keeps LanguageMenu, bell and avatar to the right of the 4 destinations.
- **SJ-16 Four tabs.**
  - Maswali (`/`) · Juu/Chini (`/updown`) · Tiketi zangu (`/positions`) · Akaunti (`/account`, new, public).
  - Tabs keep 50pick's glyph + label and `--pill-active`. The Juu/Chini accent dot is shelved.
  - One `activeTabFor(pathname)` function serves both the rail and the desktop nav.
  - Guests who tap "Tiketi zangu" get a small sheet: "Ingia uone tiketi zako" with Jisajili / Ingia.
- **SJ-17 Akaunti hub (`/account`, reading tier).**
  - Signed-out view: sign in / sign up, language, results, live, leaderboard, fairness, help, limits, legal.
  - Signed-in view:
    - identity header (name + masked phone);
    - Pochi, Toa pesa, Matokeo, Mubashara, Jedwali;
    - Alika (only if `inviteIsLiveFor`) and Pendekeza (follows `proposalsState`);
    - Wasifu, Kitambulisho (`/profile/kyc`), Weka mipaka, Uthibitisho;
    - Msaada (`/help`; chat only when `isChatbotEnabled`);
    - Arifa, with the unread badge (also on the tab);
    - Lugha, card density, Needle drawer, Tafuta (search);
    - Agent (when `agentDoorVisible`), and the staff console as a plain `<a href="/admin">` for staff only;
    - Toka, through the existing ConfirmDialog → POST `/auth/logout`.

**Chrome, words and records**
- **SJ-18 Deposit chrome.** The journey deposit screen, its code step and `/wallet/deposit/waiting` use focused chrome:
  no header, no tabs, no footer, no ticker. Instead: a round "‹", the title "Weka pesa", and a minimal 18+ and
  helpline line.
- **SJ-19 Words.**
  - "Weka pesa" is the deposit **action** everywhere; the noun "Amana" stays on receipts, limits and legal pages.
  - "Tiketi" replaces "Nafasi" on player surfaces; support "tiketi" becomes "Ombi la msaada".
  - "NDIO" is the only spelling (7 "NDIYO" strings get fixed).
  - "Maswali" replaces "Masoko" as the destination name.
  - The Maswali Millionea name clash is accepted.
- **SJ-20 Tagline.** The retired slogan "Tabiri matukio. Si bahati." is replaced by the deck's tagline:
  - en "Pick. See what you win. Play."
  - sw draft "Chagua. Ona unachoshinda. Cheza."
  - zh draft
  - It goes on all ~12 surfaces at the flip.
- **SJ-21 Copy source.**
  - sw: deck-verbatim, and binding for SJ keys.
  - en: the deck's own English where the slides give it.
  - zh and all undrawn states: drafted (R8, formal 您, 充值, break-keep).
  - Exceptions:
    - How-to steps render "1/2/3", as the deck.
    - The How-to example figures are computed from a fixed illustrative pool that must render TZS 1,000 → ≈2.7× →
      TZS 2,700 (`HOW_TO_EXAMPLE`).
- **SJ-22 What is recorded as a deviation from the frames** (required by rules):
  - the hedge / "Tayari una {side} hapa" holder line;
  - the bonus-wager warning;
  - the thin-upside notice;
  - the capped-market caption;
  - PayoutStatusNotice on deposit;
  - a "Weka mipaka" link after the sheet CTA, **only if** `test:rg-doors` / RG policy requires it (checked in S8).
- **SJ-23 Preview access.**
  - All staff roles, SUPPORT included, see the journey.
  - The agency gets a signed, 7-day, revocable visitor-preview link (no admin access).
- **SJ-24 The "first licensed" claim** leaves `/` with the hero.
  - V22's negative half stays: no "first" claim anywhere on journey surfaces or in metadata.
  - The licence line stays in the footer; 18+ goes in the header; the helpline is in the How-to sheet and the footer.

---

## 1. Evaluation: deck vs 50pick today

| Deck element | Today | Verdict |
|---|---|---|
| Header: brand, 18+, "Salio TZS 2,000", "+ Weka pesa" on phones | Mark only on phones. 18+ only in hero/footer. Balance capsule with no caption (TZS hidden on phones, ▾, eye). Deposit pill ≥1024 only, label "Amana" | Change content and placement, in 50pick look (SJ-15) |
| "▶ Jinsi ya kucheza · Hatua 3 · dakika 1 ›" card on top | None. How-it-works is section 4 of 7 | **New** composition |
| "Jibu swali. NDIO au HAPANA." | Hero "NDIO au HAPANA?" | Copy change; two lines exactly at 360 |
| Chips Zote / Michezo / Hali ya hewa / Uchumi | Labels exist (`catAll` …). Home uses topic tiles | Reuse `FilterPill` (SJ-7) |
| Card: meta row, short question, 2 buttons "Shinda ≈2.8× dau" | "NDIO @ 33%" (`market-card.tsx:633`). No short title, no competition field | New fields + estimate (SJ-1, SJ-8) |
| Bottom tabs Maswali / Juu/Chini / Tiketi zangu / Akaunti | 5 slots with centre deposit coin and More | Change (SJ-16/17) |
| Home without ticker, stats, gauge, board, tiles, band, trust | All live on `/` | Shelve (ruling 6) |
| Bet sheet before sign-up, quick chips, live estimate | Inline ConvictionDial + BetConfirmModal. Guests go to sign-in. Fixed 1.5× estimate | **New** (reuse `Modal sheet`, `payoutFor`, `quickStakes`) |
| Low balance → shortfall deposit / bet what you have | Dial disables its button; no path | **New** |
| Deposit: bet strip, shortfall prefilled, last-used wallet/number, back to bet | `/wallet/deposit` (tiles, `?amount=`), always redirects to `/wallet`, no status read | Change + **new** waiting/return |
| How to Play sheet with limits + helpline | `FirstVisitPrimer` (auto once, not reopenable). Helpline 0800 11 0011 is our real number | **New** component; old primer shelved |

**Answers to the agency (sent in S0 as `AGENCY-REPLY.md`):**
1. **Preview before sign-up:** yes.
2. **Can the wallets return users to the bet?** Yes, with no operator work. The PIN prompt comes by USSD push while
   the player stays on our page, and our app waits for the confirmed payment and brings them back.
3. **Short titles:** yes. A short-title field per market in sw/en/zh, plus an optional competition label. The full
   wording and the source stay on the market page.
4. **Regulator review:** Ali's ruling is that the licence covers it; recorded.

The reply also includes:
- **Campaign-link spec:** `https://50pick.tz/markets/<id>?side=YES&utm_source=…&utm_campaign=…` opens the sheet on
  that side at the minimum stake. A link never carries a stake.
- A note that share images carry no multiplier.
- The questions below.

**Questions to the agency (non-blocking):**
- Source files (Figma), if they exist.
- What they expect on desktop.
- Whether their campaign needs en/zh.
- Any "presented by" placement.
- A request that their creative be built from our real screens, which we send at S14.

---

## 2. Build map: deck element → 50pick kit ("NEW" = a kit addition designed in S4)

| Deck element | Built with |
|---|---|
| Brand | `FiftyMark` 26px on phones (`top-app-bar.tsx:204`), lockup ≥1280. Never re-tinted |
| 18+ | `.kp-rg__18` (neutral ink) |
| Salio | **NEW** `WalletBalancePill variant="captioned"` ("Salio"/"Balance"/"余额" over "TZS 2,000"; mono gold figure, sizer grid and delta flash kept; no eye or caret; tap → WalletSheet). Hide-balance preference honoured via `<Cash>` |
| + Weka pesa | existing `btn gilt-metal btn-pill`, now also on phones. States: guest → Ingia/Jisajili (no pill); held wallet → no pill; `/wallet/deposit*` → focused chrome |
| How-to card | **NEW** full-width card on the 50pick card surface; `IconPlate` play glyph in brand/neutral ink (never gilt); Sora title, Inter meta |
| Headline | `.kp-hero__headline` family, with a measured rung that keeps exactly 2 lines at 360 in sw/en/zh. Side words in neutral headline ink |
| Chips | `FilterPill` / `.kp-fchip` with its own selected style |
| Card | `MarketCard` **journey variant**: meta row + short title (≤2 lines) + `.btn-yes/.btn-no` with the side word and a "Shinda ≈{mult}× dau" line (figure in JetBrains Mono). **Settled variant** for `/results`/`/watchlist` (outcome row, same height). Own height tokens `--jcard-*`; density does not apply |
| Tabs | `BottomNav` visual language, 4 equal tabs, `--rail-h` variable replacing every literal 88px, `data-needle-keepout` |
| Sheets | `Modal sheet sheetUntil="lg"` (`.kp-wsheet`). **NEW** `dragToDismiss` on Modal. Desktop = centred dialog, maxWidth ≈440 (no `anchorRef`) |
| "Umechagua NDIO" | `Chip variant="yes"` / `"no"`, side word from `sideWord()` |
| Stake box | `Input size="lg"` with TZS prefix + **NEW** `grouped` display (thousands separators, stable caret, numeric keypad, 9-digit cap) + **NEW** `attention` state (neutral-strong border, `aria-describedby` → the warning; never `error`, gold or NO ink) |
| Quick chips | `quickStakes` values; the Up & Down chip layout; full-figure labels; 44px floor; no "+ Maalum" |
| Estimate box | Neutral inset panel (`--bg-inset` + `--border`). The TZS figure is the box's largest number (deck hierarchy), in `.amount` mono `--text` (not gold, not success, not side ink). "≈{mult}× dau lako" as a `Chip`. Makadirio line below |
| Weka dau CTA | `btn-gold` (a bet commit keeps gold, §M3a) |
| Low-balance warning | `Callout tone="info"` (the S4 panel, D5: the kit's `neutral` is the dashed empty-state box) with the `alertCircle` glyph |
| Low-balance eyebrow | microlabel, uppercase via CSS for Latin only |
| Low-balance deposit | **NEW** 2-line action row (glyph + "Weka pesa TZS X" + wallet sub-line from `depositRails()` + "›") in `gilt-metal` (SJ-12) |
| Bet instead | `btn-outline` |
| Deposit wallets | `ProviderRadioGrid` **extended**: `layout="rows"` (radio in royal `--brand-500`, 32px logo, name, royal ring) + `noDefault`; kill-switch-disabled rows |
| Pending-bet strip | card surface + side `Chip` + sentence, stake in `.amount` |
| Lipa | `btn btn-primary btn-lg w-full` (brand commit, §M3a D1), live label "Lipa {amount}" |
| How-to steps | **NEW** `.kp-howto__step`: round badge with "1/2/3" in mono (S4 rules the ink within `test:gold-is-money`; default is the sanctioned gilt step-numeral use; fallback neutral). `.kp-step__n` stays with the shelved band |
| MFANO | `Callout tone="info"` with a microlabel title, body via `fillNodes` |
| Nimeelewa, anza | `btn-primary` |
| Footer links | the footer RG idiom (`public-footer.tsx:222`, `app-shell.tsx:584`). ⛔ `.kp-rg` was deleted 2026-09-26; do not revive it |

`DESIGN_AUTHORITY.md` stays the law. `test:gold-is-money`, `test:betting-ink`, `test:design-frozen` and `test:contrast`
stay as they are. New kit additions are recorded in DESIGN_AUTHORITY in S0, effective at the flip.

---

## 3. Behaviour specifications

### 3.1 Engine (pure, isomorphic; `estimate.ts` is import-free and passes `test:client-graph-safe`)

**`src/lib/markets/estimate.ts`**
- `estimateFor({yesPool, noPool, rates, side, stake, bettable, bounds})` returns:
  - `{state, payout, multTenths, multText, overCap, feePct, lean, emptySide}`
- States: `priced | fillsEmptySide | oneSidedRefund | emptyPool | hidden (capped / show=false) | closed |
  invalidStake`.
- `cardEstimate` uses stake 0 (SJ-1).
- UPDOWN markets → `null`.
- `HOW_TO_EXAMPLE` fixture.
- `pickEstimateRates`; `loserSharePct` added to `payout.ts`.

**Golden fixtures (`test:journey-estimate`, plus a red twin)**

| Market | Pools | Expected |
|---|---|---|
| Dodoma | YES 24,825 / NO 50,462 (solved exactly in S3) | card ≈2.8× / ≈1.4×; sheet 1,000 → TZS 2,700 ≈2.7×; 5,000 → TZS 12,360 ≈2.5× |
| Yanga | YES 20,000 / NO 43,700 | card ≈2.9× / ≈1.4× |

The test also covers:
- client/server parity with `projectedPayout`;
- the `{pct}` source;
- the capped model;
- UPDOWN → null.

**`src/lib/markets/card-close-label.ts`**
- Close instant = `selectionClosedAt ?? resolutionAt`.
- Day comparison in EAT via `eatDayKey`.
- New keys `cardClosesToday` and `cardDaysLeft` in en/sw/zh.
- `test:card-close-label` + red twin covers:
  - 23:59 → 00:01 crossing;
  - tomorrow 01:00 with 3h left is **not** "leo";
  - exactly 11 days;
  - selection closed.

**`src/lib/journey/shortfall.ts`: `shortfallPlan`**

The checks run in this exact order, mirroring `placeBet` and then `deposit()`:
1. maintenance
2. self-excluded / cooling-off (with until-date)
3. session limit
4. account blocked
5. market not LIVE / selection closed
6. stake bounds (`stakeBoundsForMarket`)
7. wallet not ACTIVE (paused-deposit notice + /help, and "bet instead" if balance ≥ min)
8. loss-limit headroom
9. **enough**
10. deposit already pending → "Malipo yako ya TZS X yanasubiri" with a link to the waiting page, and no second
    deposit
11. deposit amount D = max(shortfall, `DEPOSIT_MIN_TZS`)
12. email unconfirmed → still an ordinary deposit step (the code is the first step on the deposit screen)
13. deposit-limit headroom
14. source of funds
15. deposit

Other rules:
- Unknown balance → no plan; show "Salio lako —" and let the server decide.
- **Spendable** = `balance + (bonusBalance ?? 0)`, the same figure `buyPosition` checks.
- `options[]` holds 0, 1 or 2 entries.
- "Bet instead" requires balance ≥ `minStake`, read from config.
- **Deposit chips:**
  - D first and selected, then the next two amounts from the existing `QUICK_AMOUNTS` ladder strictly above D.
  - All chips clamped to `depositCeilingFor` (DEPOSIT_MAX, RG day/week/month headroom counting PROCESSING deposits,
    SoF headroom).
  - Examples: 3,000 → [3,000, 5,000, 10,000]; 5,000 → [5,000, 10,000, 25,000]; 300 → [500, 1,000, 5,000] with
    `belowDepositMin`.
  - No per-rail ceiling (E-231).
- `depositCeilingFor` and `lossHeadroomFor` are proven equal to the real gates (`test:deposit-ceiling`).

**`src/lib/journey/pending-bet.ts` + shared `src/lib/safe-next.ts`** (the `sanitizeNext` logic moved there from
`login/actions.ts:14`)
- Grammar: `?bet=mkt_x.YES.5000`. Round form: `round_x.UP.5000`.
- Legacy `?side=` still works: side locked, stake = minimum.
- The URL is rebuilt from path + bet only.
- A stake is prefilled from the URL only when a matching sessionStorage marker (<24h) exists, so a shared link can
  never set someone's stake.
- The marker also carries `ref`, `invite` and `utm_*`.

**`GET /api/markets/[id]/sheet`**
- GET only, `force-dynamic`, `nodejs` runtime, rate-limited.
- The public half is cacheable (`s-maxage ≤ 5`): state, pools, rates, min/max, closesAt, serverNow, estimates.
- The signed-in half is `private, no-store`: spendable, heldSides, bonus warning.
- Returns 404 for UPDOWN or not-LIVE markets.

### 3.2 Home `/` and cards (flagged)

**First commit of S7:** move today's `src/app/page.tsx` body verbatim into the shelved
`src/components/home/legacy-landing.tsx` (`<LegacyLanding/>`). Gates that regex `app/page.tsx` are re-pointed there.

**Journey order at 360 (deck):**
1. header
2. transient system bars only: announcement, session-ended, away summary (no email-verify bar on journey)
3. How-to card
4. headline
5. chips
6. list
7. "Onyesha zaidi"
8. footer

**Page setup**
- `PageContainer tier="board"` (1280). Grid: 1 column <640, 2 at 640, 3 at ≥1024.
- `RefreshPoller 30s` plus the SSE `market-odds` patch for visible cards.
- Its own journey skeleton, a Suspense boundary inside `page.tsx`. The root `loading.tsx` stays generic.
- The ticker leaves `/` and `/markets`: `tickerShowsOn(path, journeyOn)` at first, then `TICKER_ROUTES = ["/live",
  "/results"]` at S16.
- The Needle, channels panel and chat bubble are off journey surfaces (one `isJourneySurface()` list in
  `src/lib/surfaces.ts`).

**Card buttons**
- `go()` is rewritten (`market-card.tsx:430`): it opens `BetSheetHost` in place, does **not** dispatch
  `50pick:navigating`, and the press-pop animation replays on every tap.
- Opening the sheet pushes `?bet=<id>.<side>` via `history.pushState`, so Back closes it and a reload reopens it.

**Other routes**
- `/markets` (list only): a **307** via `redirect()` while flagged, and a 308 only at S16.
  - `topic` becomes `cat`.
  - `q`, `utm_*`, `gclid`, `ref`, `invite`, `side` and `bet` are kept.
  - `status=watch` goes to `/watchlist`.
  - `status/sort/dir/odds/pool/page` are dropped and recorded in SHELVED.md.
  - Covered by `test:markets-redirect`.
- **The journey card also appears on** `/watchlist`, `/live` (replacing `LivePulseGrid` under the flag), and
  similar-markets. `/results` gets the settled variant.
  - The card-site census is updated in the same commit: `test:featured-card` 3.0 count, `test:one-sided` 2.4 + a new
    §8.9, and `test:product-line` re-pointed at `/`.
- **The market page** keeps:
  - the full wording, source, pool and chart;
  - both countdowns, each with its absolute EAT date;
  - the holder's ticket block with SellButton and the 5-minute free exit (`page.tsx:843-918`);
  - the Up & Down `?side` translation (`:149-153`), verbatim.

  The two big buttons open the same sheet. `?side=` opens the sheet preset.

### 3.3 Bet sheet (signed-in; flagged)

**Opening**
- Renders on the tap frame from the card's props, with no network wait (≤150 ms after tap at 4× CPU throttle, 360px).
  The chunk is preloaded at idle.
- `initialFocus` = the heading (never the input).
- The heading is the short title (falls back to the full title) and is the dialog's `labelledBy`.

**Order (deck frame 2)**
1. chip "Umechagua NDIO" + X
2. question
3. "Dau lako" + stake
4. 4 chips
5. estimate box (the TZS figure largest, "≈{mult}× dau lako", Makadirio line)
6. "Salio lako TZS X" (live via `useLiveBalance`, masked by `<Cash>`)
7. CTA "Weka dau · TZS X"

**Stake and CTA**
- CTA is disabled and reads "Weka dau" (no amount) when the stake is empty or out of bounds.
- The bounds line uses the F3 warning severity (never NO ink) and names the bound.

**Live refresh**
- Refetches `/sheet` on open, every 10s while visible, on SSE for this market, on focus, and on `wallet:balance`.
- An aria-live "Makadirio yamesasishwa" line appears; it never blocks the tap.
- Each keystroke recomputes locally in the same frame.

**Placing**
- At the tap the quote is frozen: `{marketId, side, stake}` exactly as printed on the tapped button.
- A new `crypto.randomUUID()` is minted per intent. The same key is reused only for a Retry after
  `system_busy`/`system_error` or a double tap while pending.
- While placing: the field, chips and CTA are locked, `aria-busy` is set, and scrim / Esc / X / swipe / Back are
  ignored.
- An auth-loss redirect (`r == null`) is treated as navigation, not failure.

**Refusals, all shown inside the sheet**
- Mapped by `REASONS[].channel` (the `udBetErrorCopy` pattern):
  - modal-channel (loss limit, self-exclusion, cooling-off, blocked, frozen) → a blocking in-sheet state the player
    must acknowledge;
  - other reasons → an inline line.
- `balance_insufficient` never shows its sentence; it re-enters the low-balance plan with the server's
  `{balance, needed}`.
- The sheet flips to closed at `selectionClosesAt` on its own `serverNow`-offset tick (the dial's 200 ms `closedNow`).

**Carried over from the dial**
- the `50pick-notify-markets` localStorage write
- `50pick:refresh` + `refresh-notifications` after success
- the optimistic deduction until server truth (`insufficientFor`)
- the holder / hedge lines and bonus warning, when applicable (SJ-22)
- the thin-upside notice when `leanFor` says thin
- the capped caption

**Mechanics**
- Keyboard-safe: the sheet lifts by `innerHeight − visualViewport.height`; `enterKeyHint="done"`.
- The sheet is `role=dialog aria-modal` only while open, so the reality check defers correctly.
- Pull-to-refresh ignores gestures that start inside the sheet.
- Consent, install and channels invitations stand down while any sheet is open (`html[data-bet-sheet]`).

**Accessibility**
- One polite live region, written on entering the low-balance state and on estimate updates, not on every keystroke.
- Reduced motion is respected; 44px targets.

**Success:** the in-sheet receipt (side, stake, ticket id; no payout figure, per SJ-4). "Endelea kucheza" closes in
place (scroll and `?cat` kept); "Tiketi zangu" opens tickets; auto-closes after 5s.

**Deploy skew:** the sheet mirrors its state into `?bet=`. A "Failed to find Server Action" error triggers a reload
that reopens the sheet. `test:deploy-skew` covers the sheet and the waiting page.

### 3.4 Low balance (deck frame 3)

**When it shows**
- Derived on every render from stake vs spendable. Chip taps are instant; typing settles after about 250 ms.
- Editing the stake back down restores the normal frame live; a landed deposit does the same.

**Order**
1. chip + X
2. question
3. "Dau lako" + stake in the `attention` state
4. compact row "Ukishinda ≈ TZS {x}" … "≈{m}×" (new keys)
5. warning callout "Salio halitoshi / Una TZS {have}. Unahitaji TZS {short} zaidi." (new keys)
6. eyebrow "CHAGUA UNACHOTAKA KUFANYA"
7. the 2-line deposit action (the amount is D; a clear note when D > shortfall because of the 500 minimum)
8. "Weka dau la TZS {spendable} badala yake"
9. the disabled "Weka dau · TZS {stake}" (`aria-describedby` → the warning)

**Hidden in this state:** chips, the estimate box, the Makadirio line, the balance row.

**Variants:** 0 options, 1 option, pending deposit, deposit limit, SoF, held wallet, loss limit.

**Funnel:** "short_balance_shown" fires at most once per sheet open.

### 3.5 Deposit and the return (flagged)

**Always the deck's layout.** Under the journey, `/wallet/deposit` always uses the one-screen layout; the pending-bet
strip appears only when `?bet=` is valid.
- The classic 5-tile form, including Card with its billing fields, moves whole to `/wallet/deposit/card`.
- "Lipa kwa kadi" links there, carrying `bet`.

**Order (deck frame 4)**
1. "‹" + title "Weka pesa"
2. strip "[NDIO] Dau lako la TZS 5,000 linakusubiri"
3. PayoutStatusNotice (only when payouts are delayed)
4. "Kiasi" (`AmountField` with `onValueChange` and full-figure labels)
5. chips
6. "Lipa kwa:" with the 4 rows
7. "Namba ya simu" (`PhoneInput`)
8. the PIN note
9. the inline code step, if unverified
10. "Lipa TZS X"
11. "Lipa kwa kadi"

- The loading skeleton mirrors this order when the flag is on.
- An amount typed below the shortfall shows the neutral line "Bado utapungukiwa TZS {gap} kwa dau lako"; Lipa stays
  enabled.

**Keeping the bet through every exit.** Hidden `bet` and `next` fields ride `carry`. Every `fail()` and the
EMAIL_UNVERIFIED branch return to journey mode with the amount recomputed server-side.

**"‹" back.** A deterministic `<a replace>` to the rebuilt pending-bet URL. The focused chrome is entered and left by
document navigation.

**Key lifetime.** A network retry reuses the key; a definitive failure mints a fresh one.

**`depositAction` with a journey `next`**
- CONFIRMED (mock) → redirect to `next`.
- PROCESSING → `/wallet/deposit/waiting?txn=…&next=…`.
- History uses `replace`.
- After a CONFIRMED deposit, the same shortfall needs an explicit "Weka pesa tena".

**Pending bet on the server.** A new nullable `Transaction.pendingBet Json?`, so notifications, the still-pending email
and the receipt can link back to the bet.

**`GET /api/wallet/deposits/[id]/status`**
- Owner-only. Missing and not-yours both return `UNKNOWN`, and a SECURITY audit is written.
- `private, no-store`, never prefetched, bypassed by the service worker.
- Buckets: `deposit.status` per user and `deposit.probe` per txn.
- **Selcom probe:** when PROCESSING, not CARD, and ≥20s old, it asks Selcom's signed order-status. It credits through
  `settlePaymentWebhook` (exactly-once). It may FAIL a deposit only on a signed terminal CANCELLED / USERCANCELLED /
  REJECTED, the same precedent as the card return leg (`wallet-service.ts:981`).
- The 15-second background lane stays confirm-only.
- The core is shared with `settleDepositFromReturn`.

**Waiting page** (it listens to `wallet:balance`, and all timers stop at a terminal state)

| State | Age / trigger | What the player sees |
|---|---|---|
| fresh | <1 min | "Weka PIN yako · usilipe tena" |
| slow | 1–10 min | still waiting |
| long | 10–30 min | the page polls itself (no background lane runs then); "hadi dakika 30 · usilipe tena"; receipt link |
| paid | — | "Pesa zimeingia", then `location.replace` to the pending-bet URL (sheet reopened, side and stake kept, never auto-placed). Shows the first-deposit identity notice when `firstDepositNoticeDue` |
| failed | — | "Hakuna pesa iliyotolewa", Jaribu tena (fresh key) / Rudi kwenye dau |
| held | RG lock during payment | a neutral "held for return" message, never "failed" |

Polling: every 3s for the first minute, then every 10s.

**Return-time states**
- Market closed or suspended → "Swali hili limefungwa", the funds are safe, 3 similar questions offered.
- Stake now invalid → clamped, with the refusal line.
- Still short → the low-balance state with the new shortfall.

**Card return fix (first).** Append `order_id` to the Selcom card `redirectUrl`/`cancelUrl`, and carry `bet` through
(MONEY-GATE §3.2, a live defect today).

### 3.6 Inline email code (S9)

**Storage and security**
- A new `Otp` purpose `email_verify`: bound to `userId` + the exact address, hashed, 30-minute TTL, 5 attempts.
- A wrong code charges an attempt on every live code.
- Issuing a code, or changing the address, consumes older codes.
- Rate limits are keyed by userId.

**Verification path**
- Extract `markEmailVerified(userId, email, via)` from `verifyEmailToken` (`email-verification.ts:243`). Both the link
  and the code call it; the audit action is `user.email.verified` with `payload.via`.
- The link carries a signed `next`, so "Rudi kwenye dau lako" works from the email.

**Email:** code first ("expires in 30 minutes"), then the link (24h). en and sw. The subject never contains the code.

**Placement**
- The form stays visible and prefilled. The 6-box step sits above Lipa, and Lipa enables on success without
  re-entering anything.
- No email on file → an email input + "Tuma msimbo".
- Covered states: wrong, expired, locked (countdown), resend cooldown.
- If the email is verified in another tab, the step polls (≤5s) and unlocks.
- On success, `router.refresh()` runs so the verify bar is gone app-wide.

**Records and copy**
- Erasure gets `otp.deleteAllForUser`.
- Retention doc updated; schema purpose comment updated.
- Copy keys `verifyGate*`, `verifyBannerText` and `errEmailUnverified` name the code.

### 3.7 Visitor path (S10)

**Guest sheet**
- Same as §3.3 but with no balance row. CTAs: "Jisajili uweke dau" (primary) / "Ingia".
- Links carry `next=<page>?bet=…` and `ref`/`invite`.

**After registering**
- Land on the origin page with `?bet=` and `welcome=new`.
- Balance 0 → low-balance → deposit (shortfall = stake) → code → PIN → waiting → back → confirm.
- With no `next` under the journey: `/?welcome=new`, not `/wallet/deposit`.

**Other rules**
- The deposit page's signed-out redirect keeps its full query.
- Old `?side=` links work.

### 3.8 How to Play (S7 static, S11 complete)

**Component**
- New `src/components/onboarding/how-to-play-sheet.tsx`.
- `first-visit-primer.tsx` is shelved **intact**. The shared keys and opt-ins move to
  `src/lib/onboarding/primer-keys.ts`, so `?primer=1` and `kp-primer-force` still work for the 24 QA drivers.
- **Seen key:** the new `50pick-howto-seen`, so every browser sees it once after the flip.
- **Order:** title + X (`showClose`) → steps 1/2/3 → MFANO → "Nimeelewa, anza" → "Weka mipaka · Msaada 0800 11 0011".

**Links**
- "Weka mipaka" → `/profile/responsible-gambling` when signed in, `/legal/responsible-gambling` when signed out.
- The helpline is `<a href="tel:{HELPLINE_TEL()}">`, with the new label key `howTo.helplineLabel` = "Msaada".
- Every exit persists the seen flag. Links close the sheet, then navigate.

**Copy:** side words come from `sideWord()`. The MFANO text is built with `fillNodes` from `HOW_TO_EXAMPLE`.

**Sizing:** height cap `max-h-[calc(100dvh-48px)] overflow-y-auto` (the proven 320×640 fix).

**Auto-open**
- Only on `/`, `/live`, `/results`, `/watchlist`.
- Kept exclusions: HIDE_ON `/^\/(auth|admin|s)(\/|$)/` and SUPPRESS_ON.
- Never on: `/wallet/**`, RG pages, `/updown/**`, `/markets/*`, a URL with `?bet=` or `?side=`, while any sheet is
  open, or while the player is on a break (`promoSuppressed`).
- The HeadlessChrome block is kept.
- Consent waits until the sheet closes.
- The deep link `/?howto=1` opens it.

### 3.9 Words and i18n

- A **string table** in VODACOM-PLAN.md: each deck string → key → sw (verbatim) → en → zh.
- Numbers and rates are always placeholders.
- `{amount}` renders inside a nowrap money span.
- **Rename sweeps at the flip:** "Weka pesa" action keys (`common.deposit`, `depositCta`, `addFunds`, `depositNow`,
  `udDepositCta`). **Before the flip, journey surfaces use new keys**, so players see no change.
- **Tiketi keys:** `positions`, `myPositions`, `yourPositions`, … (listed in S6). Support copy becomes "Ombi la
  msaada".
- **NDIYO → NDIO** everywhere, with a `test:labels` assertion.
- **"Maswali"** replaces the "masoko" destination wording on error, 404, email and verify surfaces, and on about 20
  `href="/markets"` links (re-pointed to `/` at the flip).
- **Rewritten for the flip (en/sw/zh):**
  - `failBalanceInsufficient`, `noBetYet`, `positions.noOpenBody`, `headlineBody`
  - `/help` FAQ `faq2a`, `faq3a`, `faq6a`
  - the chat assistant intents in `send-message.ts`
  - the Rules page (`_content-yes-no.tsx` §2/§3/§4 "Estimates shown before you bet")
  - Terms §4, with a `TERMS_VERSION` bump
- **Guard:** no live dictionary string contains dial / kidhibiti / 转盘 / conviction / imani.
- **Glyphs:** check ≈ (U+2248) and → (U+2192) against the served font subsets. If the fallback is visible,
  self-host a subset via `next/font/local`.

### 3.10 The agency's measures

**Counters (ship at S3b, so a baseline exists)**
- `JourneyFunnelDay (day, step, origin, variant, utm_source, utm_campaign, count)`.
- `POST /api/funnel` with an allow-list and no identifier or cookie. Automation user agents are skipped.
- Server counters run fire-and-forget after the money calls (`r.ok && !replayed`), never inside locks.
- House-bot rows are excluded per row (`houseBotId IS NULL`); staff, preview traffic and bots are excluded.

**Definitions:** each measure is a nested pair of events, so no ratio can exceed 100%.

| Measure | Numerator | Denominator |
|---|---|---|
| Home → sheet | sheet opens with origin=home | `/` views |
| Sheet → bet | bets with origin=sheet | sheet opens |
| Short → deposit | CONFIRMED deposits with origin=low-balance | low-balance states shown |
| Deposit → bet | bets with origin=deposit-return within 30 min | journey deposits confirmed |
| Time to first bet | median (first unmarked position − `createdAt`) | — |

`origin` is persisted on the deposit row and the position (new nullable columns).

**Old-journey analogues count from S3b** for ≥14 days before the flip. The flip cannot happen before the baseline is
complete.

**Reporting**
- Panel on `/admin/insights`: before vs 7/14/28 days after, filterable by campaign, with a weekly CSV/PDF export.
- Ali sends it to the agency every Monday for 8 weeks, then monthly.

**Privacy §7/§2:** the preview cookie (S1), the pending-bet marker, the how-to seen key, and the funnel totals with
campaign tags. Version bumps land in the same commit as each item.

---

## 4. Ripple map: where each change reflects (full per-file list goes in the tracker in S0)

| Change | Main files | Gates (when) | Docs superseded / updated |
|---|---|---|---|
| Header | `top-app-bar.tsx`, `wallet-balance-pill.tsx` (captioned variant), `brand.tsx` untouched | `red:header-fit` + anchors, re-proven at 320/360/390/1024/1150/1279 × sw/en/zh × guest/signed-in (detached); `qa:landmark-seal`; `test:tap-target`; `test:wallet-reach` | R1, L4, L20; UPDATE-2026-09-28 §1 |
| Tabs + Akaunti | `bottom-nav.tsx` (4 tabs), `nav-more.tsx` shelved, `src/lib/nav/active-tab.ts`, `app/account/page.tsx`, `manifest.json` shortcuts | **Same commit as the page**: `test:route-census` (PLAYER-QUERY-CAMPAIGN §4 row, bucket D), `test:measure` (tier), `scripts/responsive-audit.mjs` PLAYER list; `test:section-rail`, `test:stacking`, `test:shell-boundary` re-pointed to the hub (one plain `<a href=/admin>`), `test:withdrawn-features` Alika row + red anchor | WP1b, V26 |
| Home | `app/page.tsx` → journey. Shelved: `legacy-landing.tsx`, `components/home/*`, `lib/markets/hero.ts`, `landing.ts`, `lib/server/landing-picks.ts`, `updown-band-round.ts`, `payout-rails` hero fns. `platform-stats.ts` **stays** (ticker) | `test:hero-contract`, `test:landing-contract`, `test:featured-card`, `test:one-sided` §7.2 re-pointed to `legacy-landing.tsx`; `test:ticker-honesty` §11; `test:landing-mine`, `qa:ghost-landing` §A; 13 `qa:landing-v3:*` split (park: capture, rows, hero-mine, seed-onesided, wp6, local; keep: share-drive, c1, wallet, …) | LANDING-TEN (via R18), manifest L1, R4, R5, R7, R9, R14–R17 |
| Card estimate | `market-card.tsx` journey + settled variants, `live/pulse-grid.tsx`, similar-markets; `estimatedWinningsRate` retired on polls | `test:one-sided` §8.9 (new) + red; V16 rewritten at the flip (estimate only with ≈, and the Makadirio line only in the sheet); V17, V18; `test:share-preview` (no multiplier) | §C3 (scoped), R3, L11, COMPLIANCE 2026-07-23 D3, RULES §4 |
| Bet sheet | new `components/journey/bet-sheet*.tsx`, `BetSheetHost`. Shelved **in place**: `conviction-dial.tsx`, `bet-confirm-modal.tsx`, `side-picker.tsx`, `lib/dial-stake.ts`, `house-lean-warning.tsx` | `test:dial-stake` **unchanged** (shelved dial's unit test). New `test:bet-sheet` (+ V20 focus / Esc / safe area / Back / keyboard / Enter). `test:market-result-announce` DIAL becomes a list [dial, sheet]; `test:feedback-law`, `test:failure-reasons`, `test:popup-fit`, `test:stacking`; `qa:live` §[F] and `live-place-bet.mjs`, `live-rg-break.mjs` rewritten dual-mode (read rollout from `/api/health`) | CLAUDE.md "Betting flow invariant", "UX commitments", "Conviction dial" (at the flip); RULES §2.1/§2.3; manifest R2 |
| Deposit | `wallet/deposit/page.tsx` journey mode, `/wallet/deposit/card` (classic moved), `/waiting`, `actions.ts`, `provider-radio-grid.tsx` (+rows/noDefault), `phone-normalize.ts`, `wallet-service.ts` (status core, ceilings), `payments.ts` card `order_id` | `test:deposit-gate`, `test:msisdn-prefill` (extended), `test:payments`, `e2e:money`, `test:kyc-at-withdrawal`, `test:gold-is-money`; new `test:deposit-return`, `test:deposit-status-read`, `test:deposit-ceiling` | MONEY-GATE §3.2; audit M9 (journey only) |
| Email code | `email-verification.ts`, `store.ts`/`prisma-dal.ts` Otp, `erasure.ts:443`, `email.ts` template, `profile/actions.ts` | new `test:email-code` + red; `test:dal-parity`; `test:privacy-notice` | DATA-RETENTION |
| How to Play | new `how-to-play-sheet.tsx`, `primer-keys.ts`; `first-visit-primer.tsx` + `how-it-works.tsx` shelved intact; slogan on ~12 surfaces (auth rail, root metadata, manifest, OG routes, `reports/brand.ts`, legal subtitle, `public/og/*.png`) | `test:popup-fit`, `test:stacking`, `test:marketing-optout`, `test:hero-copy` §5 moved to new surfaces | MOBILE-VISUAL U16 (D4 bullet only) and U18 (primer bullet only); LANDING-TEN §0 item 4 |
| Short titles + competition | `schema.prisma` + hand-written additive migration, 5 create paths, audited admin edit, `ai-poll-generation.ts`, `market-sentinel.ts` agreement check, `chain-purge.ts`, `backup/core.ts`, `lib/localized.ts`, search fields | `test:dal-parity`, `test:migration-ownership`, `test:dead-schema`, `verify:backup-schema`, `test:chain-purge`, `test:ai-polls`, `test:sentinel-guards`, `test:trilingual`, new `test:short-title-fit` | DATA-RETENTION §7 |
| Measures | `JourneyFunnelDay`, `/api/funnel`, `journey-funnel.ts` (Prisma + memory twins), `retention.ts` prune, `insights.ts` | new `test:journey-funnel`; `test:funnel-share` (no ratio > 100%); `test:insights` | Privacy §2/§7; E-103 amended |
| Certification | `MODULE-CERTIFICATION-PROGRAM.md` dossiers H4, E2, C1, C2, A4, H1, J1, K7, L2, L6 marked "changing under VODACOM-PLAN" | `test:cert-c1`, `test:cert-c2` stay green | still 52 modules |
| ~~Palette / fonts / brand~~ | none (ruling 5) | colour laws unchanged | none |

**Landing-v3 programme**
- **R18** is added to the v4 INHERIT-MANIFEST: "superseded by the Simplified Journey". Only the unbuilt rows WP5, V21
  and WP20 are set to ⛔ R18. `test:landing-ten-plan` stays green.
- **Superseded:** PANEL, V21, V24, V26, hero verdicts.
- **Kept:**
  - V22's negative half (no "first" claim);
  - V15, re-pointed (first card's buttons above the tab bar at 360×740);
  - V19, redefined (Withdraw ≤1 tap from the Salio capsule and Akaunti);
  - V20 (sheets);
  - V23;
  - FUNNEL, absorbed by §3.10.
- **Carried over:** the "Paid out to players" house-bot money-truth defect (`platform-stats.ts:186`); check the
  ticker's "won" rows for the same class.

---

## 5. Sessions

Every session runs the same loop:
1. **Worktree:** `C:\kipindi-journey`, branch `simple-journey`, with a **real** `node_modules` (never a junction).
2. **Code:** two-store tests, `red:*` twins reachable from `red:all`, and declared anchors.
3. **Red anchors:** `npm run test:red-anchors` after refactors.
4. **Suite:** `test:all` before each push. Heavy Node only through `~/heavy-node-lock.sh`; red harnesses run detached,
   never piped.
5. **Visual check:** real-browser viewport tiles, read one by one.
6. **Ship:** merge to main, push, and verify the deploy commit on 50pick.tz.
7. **Records:** tracker row + SHELVED.md row for anything newly flag-hidden + memory, in the same pass.

**Gate names:** write a gate with the npm-run prefix only once its key exists in `package.json` (the `test:docs` rule).

**What players see before the flip:** nothing, except the pre-flip list in S0. That list covers the bug fixes that
ship early on purpose: the card `order_id` fix, the PhoneInput on the classic page, the NDIYO sweep, the timer-date
hardening. Everything else is behind `simpleJourneyFor`.

**S0 — File, rule, get ready (docs + environment)**
- **Filing**
  - Deck + 5 PNGs → `docs/design-system/v5-2026-09-29-simplified-journey/`, with its `INHERIT-MANIFEST.md` (SJ-1…24)
    and `AGENCY-REPLY.md`.
  - This plan → `docs/VODACOM-PLAN.md`: §0 RESUME AT, the board S0–S16 with an S5 tombstone, the string table, the
    pre-flip list and the full ripple map. Guard `test:vodacom-plan` + red. NEXT-PLAN ▶ row.
  - `docs/SHELVED.md` skeleton: item, files, why, date, how to re-mount, test. Lines with paths never say
    "removed/deleted".
- **COMPLIANCE-DECISIONS entries:**
  - pre-bet estimate (§C3 scope, law 40)
  - one-tap bet (BetConfirmModal and its 10s hold retired)
  - one-tap Lipa (M9, journey only)
  - "bet what you have"
  - in-sheet shortfall deposit prompt (RG record)
  - claim, slogan and tagline
  - the first-screen RG row moving to header/footer/How-to
  - short titles
  - the regulator answer
  - the number default (E-210/E-215 amended)
  - the status read failing on a signed terminal verdict
  - ticker off `/`
  - How-to copy truth (step 3)
  - Jay #6 kept
- **Rulings and laws**
  - DESIGN_AUTHORITY: new laws dated, "effective at the S15 flip" (§C3 scoped amendment, kit additions from §2).
  - v4 manifest R18; MOBILE-VISUAL U16/U18 bullets re-targeted; certification dossiers marked.
  - A CLAUDE.md note listing the sections that change at the flip.
- **Readiness**
  - Create the worktree; `npm ci` in it under the lock; `npm i -D --no-save embedded-postgres@18.3.0-beta.17`;
    `prisma generate`. The shared `C:\kipindi-main` currently lacks Prisma.
  - Stop the office-PC landing lane, and record its unmerged branches in SHELVED.md.
  - Memory: `project_kipindi_simple_journey.md` + index line; Landing v3 / Mobile Visual lines marked partly
    superseded.
- **Done when:** docs are pushed, `test:docs` and `test:landing-ten-plan` are green, and the reply is ready for Ali to
  send.

**S1 — The switch and preview**
- `RolloutState = WITHDRAWN | STAFF_PREVIEW | ACTIVE` for `simpleJourney`, separate from `FeatureState`.
- `simpleJourneyFor(role, previewCookie)` is resolved in AppShell **and** on each page. A test asserts they agree for
  guest, player, staff, cookie and expired-cookie viewers.
- **Instant kill:** a DB-backed /admin toggle (two halves, like `desk`). `FEATURE_SIMPLEJOURNEY` env is the hard
  override (a Railway variable change = a redeploy).
- **Preview cookie**
  - HttpOnly, Secure, SameSite=Lax; HMAC with its own secret; `{issuer, exp ≤24h, nonce}`.
  - The issuer must still be staff on each request. Set and clear are audited.
  - Ignored on `/admin` and when WITHDRAWN. `Cache-Control: private, no-store`.
  - Set, clear and sign-in/out are hard navigations.
- **Agency link:** signed, 7-day, revocable, logged.
- **Same commit:** Privacy §7 cookie entry (en/sw/zh) + the `test:privacy-notice` census; `test:orphan-actions`;
  `test:control-gates`; `test:simple-journey-flag`.
- **Done when:** staff see a "preview" marker on production and nobody else sees anything.

**S2 — Short titles + competition**
- Columns: `shortTitleEn/Sw/Zh` (nullable) and `competition` (key from `src/lib/markets/competitions.ts`: `ligi-kuu`,
  `epl`, …, labels in the dictionary).
- **Migration:** hand-written, additive (`ADD COLUMN IF NOT EXISTS`), timestamped after the latest migration on main.
  Never `prisma migrate diff`.
- **Writers:** all 5 create paths plus the audited admin edit (with a 2-line warning).
- **AI generator:** "Je, …?" form, ≤2 lines at 360 (sw/en ≤56, zh ≤28 chars), GSM-7-safe normalisation. The sentinel
  checks agreement with the full question.
- **Backfill:** AI drafts for every open market, approved by an admin. Cards fall back to the full title clamped to 2
  lines.
- **Done when:** every open market renders within 2 lines in 3 languages (`test:short-title-fit`).

**S3 — The engine (no UI):** §3.1 in full, with its tests and red twins.
- **Done when:** the golden fixtures pass and parity is proven.

**S3b — Measures baseline (moved up):** the §3.10 counters on the **old** journey's analogues, plus
retention/backup/DAL and the privacy lines.
- **Done when:** counts appear daily, and the 14-day baseline clock starts.

**S4 — Claude Design pass** (see §6)
- Frames for the new compositions and every undrawn state, in 50pick's system.
- Four-expert panel. Brief filed as `design-brief/simple-journey-2026-09/BRIEF.md` (§0b outbound row, with a
  `.gitignore` exception).
- Ali reviews the 5 re-drawn frames side by side (one Artifact, numbered choices).
- **No player-facing UI code before this is filed.**

**S5 — tombstone:** removed by ruling 5 (no palette, font or brand work).

**S6 — Shell (flagged)**
- Header states (SJ-15); the 4 tabs, `activeTabFor`, `--rail-h`; the guest Tiketi sheet.
- `useUnreadNotifications` feeding the tab badge and the hub row.
- The Akaunti hub (SJ-17).
- Tiketi zangu: rename, content, and a Maswali | Juu/Chini switch to `/updown/history`.
- The `surfaces.ts` list; the EmailVerifyBanner rule; overlay stand-downs; the header-fit re-proof.
- **Done when:** every route keeps an entrance (census) and the header fits in all cells.

**S7 — Home and cards (flagged):** §3.2 in full, plus the How-to card wired to a **static** How-to sheet.
- `test:journey-above-fold`: at 360×640 and 390×844 (sw/en/zh, guest and signed-in, with all bars up), the How-to card
  sits above the fold and card 1's buttons end above the tab bar.
- `qa:cls-budget`.
- **Done when:** staff see the deck's home on production.

**S8 — Bet sheet + low balance (flagged):** §3.3 and §3.4.
- Checks whether `test:rg-doors` requires a limits link (SJ-22).
- **Done when:** `test:bet-sheet`, V20 and the refusal matrix pass, and a staff real bet works on production.

**S9 — Deposit, email code, waiting and return (flagged):** the card `order_id` fix first, then §3.5 and §3.6.
- **Done when:** `test:deposit-return`, `test:deposit-status-read` (exactly-once while racing the webhook) and
  `test:email-code` pass.

**S10 — Visitor path:** §3.7, plus `test:post-register-landing` in both flag states, plus `ref` carried through.

**S11 — How to Play complete:** §3.8 auto-open rules, plus the flip-ready copy: FAQ, chat intents, rules page, terms,
tagline, OG re-renders.

**S12 — Consistency sweep**
- **Juu/Chini:**
  - the stake panel in the journey language;
  - the low-balance → deposit → back flow; a closed round goes to the next round with side and stake kept;
  - the multiplier grammar "Shinda ≈{mult}× dau" with floor mode;
  - `round-stake-panel.tsx:249` `text-no-300` → a state token.
- **Admin:** Approve/Reject move off `btn-no` to `btn-danger`.
- **Outside the site:**
  - emails and notifications use short titles;
  - OG/share images carry the short title with no multiplier;
  - the manifest (Maswali shortcut, Tiketi shortcut, name, a screenshot re-captured after the flip);
  - SMS: no titles today, and GSM-7 for any.
- **Also:** the NDIYO sweep and the "Paid out" defect.

**S13 — Measures panel and reporting:** the panel, CSV/PDF export, the definitions table and the agency cadence.

**S14 — Proof before the flip**
- `e2e:journey`: guest → sheet → register → low balance → deposit (mock rail, dev outbox code) → waiting → back →
  manual confirm. Only then does a position exist.
- Drives: 320/360/390/768/1024/1280/1440 × sw/en/zh × guest/signed-in, including keyboard-open (CDP) and short
  heights.
- A per-frame **identity checklist**: each deck element, in order, with its string, ticked against the 50pick
  screenshot. The look is checked against DESIGN_AUTHORITY, not against the PNG. Shots go to
  `.qa-shots/simple-journey/` (gitignored).
- Adversarial refute plus mutation audit.
- Staff run **one real TZS 1,000 journey** on production behind the preview.
- The **predeploy gate census** with each flip-time rewrite, prepared on a branch. `qa:live` is dual-mode.
- Agency preview link + a side-by-side PDF; their **written sign-off** is recorded (or Ali overrides).

**S15 — Launch (one commit, after the baseline is complete and sign-off is in)**
- `simpleJourney = ACTIVE`.
- The rewritten ruling gates: V15, V16, V19, V22-negative, V25 ("one Deposit per non-inert region"), V26 → 4 tabs,
  `test:rate-copy`, `test:one-sided` + red.
- The dictionary action-key convergence; re-pointing bare `/markets` links; Rules + Terms (+`TERMS_VERSION`); CLAUDE.md
  sections; the tagline on ~12 surfaces; the `/admin/config` copy.
- `sw.js` `CACHE_NAME` bump + manifest.
- `test:deploy-skew` with an open sheet and a waiting page.
- Re-measure on production as `mobile01`, including one real deposit → back → bet.
- **Rollback triggers:**
  - any money-invariant alert;
  - bets placed per day < 70% of baseline for 3 days;
  - deposit-confirm rate down more than 20%;
  - a P1 defect.

  Response: the /admin kill (instant) or the env override. Record it.
- Send the agency the real screenshots and the first report.

**S16 — Shelve (≥7 days after launch; go only with no rollback, the measures in bounds, and the agency acknowledged)**
- Unmount the old branches and remove the preview machinery (cookie signer and reader, toggle, env) **together**.
- Components stay **in place**: no `_shelved` folder, no moves (about 90 guard pins name these paths).
- **Guards:**
  - No allow-list growth.
  - `test:dead-css` counts classes named in `src/**` as live, so no baseline change.
  - `test:chart-one-home` EXEMPT is shrink-only and still matches.
  - `test:orphans` covers `scripts/` only, and shelved unit-test scripts stay wired.
  - `test:i18n` has no unused-key check; shelved keys are listed in SHELVED.md.
  - New `test:shelved` + red: every SHELVED.md row exists, compiles, is unmounted, and has its test wired.
- The `/markets` redirect becomes 308; `TICKER_ROUTES = ["/live", "/results"]`.
- The rollout test becomes a "state is gone" guard.
- LANDING-TEN is closed with a pointer to SHELVED.md.
- **Rollback after S16:** revert the S16 commit, or re-mount from SHELVED.md.

---

## 6. Claude Design: needed, in a focused form

**Is it needed?** The deck's 5 frames need no new design. They are templates, built from 50pick's kit per §2. Claude
Design **is** needed for:
- **(a) 14 new compositions:**
  - captioned balance pill;
  - How-to card;
  - How-to step list;
  - compact estimate row;
  - 2-line deposit action row;
  - wallet radio rows;
  - `Input` grouped + attention states;
  - focused deposit chrome;
  - pending-bet strip;
  - email-code step;
  - waiting states;
  - Akaunti hub;
  - guest Tiketi sheet;
  - the journey card's settled variant.
- **(b) About 30 undrawn states**, and **(c) the desktop layouts**.

**Who runs it:**
1. I create it as an Artifact of type Design in S4, using 50pick's design system if the account has one; otherwise I
   attach DESIGN_AUTHORITY excerpts, token values and kit screenshots.
2. The four-expert panel scores it.
3. Ali reviews it.
4. It is filed.

**Paste-in brief**

> Extend **50pick.tz** (licensed Tanzanian YES/NO prediction market; Swahili first, English and Chinese too;
> mobile-first).
>
> **WHAT happens comes from the agency's 5 frames (attached).** Flow, element order and copy must be identical.
>
> **HOW it looks comes from 50pick's own system (attached):**
> - `DESIGN_AUTHORITY.md`
> - the `globals.css` tokens
> - Sora / Inter / JetBrains Mono (money figures)
> - the kit components mapped in plan §2
>
> **Never copy the agency's colours, typeface or wordmark.**
>
> **Deliver at 320, 360 and 412 px, plus 1280 px where ◆. Numbered choices where you are unsure.**
> 1. **The 5 agency frames re-drawn** in 50pick's system, side by side with the originals, plus a component-mapping
>    sheet.
> 2. **Header.** Signed-in; guest (Ingia/Jisajili); held wallet; the 360 fit of mark + 18+ + captioned Salio +
>    "Weka pesa". ◆ Desktop header with the 4 destinations plus language, bell and avatar.
> 3. **Home.**
>    - Loading skeleton; 7 chips scrolling; empty category.
>    - Card states: priced / Kuwa wa kwanza / Upande mmoja tu / Inafungwa leo / Siku {n} / selection closed / with
>      and without competition / longest sw title at 2 lines / settled variant.
>    - "Onyesha zaidi".
>    - ◆ Desktop grid.
> 4. **Bet sheet.**
>    - Guest; stake below min / above max; estimate updated; legacy (no figure); one-sided refund.
>    - Holder / hedge line; bonus warning; thin-upside.
>    - Placing; success receipt.
>    - Closed; refusals as blocking in-sheet states: loss limit, self-excluded, cooling-off, blocked, frozen,
>      session limit, rate-limited, busy / Jaribu tena, maintenance.
>    - Keyboard open at 360×640.
>    - ◆ Desktop centred dialog.
> 5. **Balance too low.** 0 / 1 / 2 options; balance 0; below the 500 minimum; deposit pending; limit reached; SoF;
>    held wallet; 4 wallets on the sub-line.
> 6. **Deposit.**
>    - Focused chrome.
>    - Code step: no email on file / wrong / expired / locked / resend.
>    - No history (nothing preselected, Lipa disabled); paused wallet; Mixx 4th row; "Lipa kwa kadi"; typed below
>      the shortfall.
>    - Payout-delayed notice.
>    - Waiting: fresh / slow / long / paid / failed / held.
>    - Return: closed market / clamped stake / still short.
>    - ◆ Desktop.
> 7. **How to Play.** en / zh lengths; 320×640 scroll. ◆ Desktop.
> 8. **Akaunti.** Signed-in / guest, and the staff row.
> 9. **Tiketi zangu.** Maswali | Juu/Chini switch; open / settled; cash-out terms; absolute dates.
> 10. **Market page.** Full wording + source + pool + chart + both countdowns with absolute dates + the holder's ticket
>     block above the two big buttons.
> 11. **Juu/Chini.** Stake panel and low-balance state in the same language.
>
> **Rules.**
> - Every colour, font, radius and motion comes from 50pick tokens.
> - YES/NO ink only for sides.
> - Warnings use the factual/neutral family; never gold, danger or NO for app state.
> - Tap targets ≥44 px; contrast AA.
> - "≈" on every estimate; the Makadirio line only in the sheet and MFANO.
> - Helpline "0800 11 0011".

---

## 7. Verification

**Local**
- Worktree; `rm -rf .next`; `next dev` on **localhost** with the in-memory store and `DISABLE_ADMIN_TOTP=true`.
- Playwright drives every state in §5 S14. Read the viewport tiles.

**Money**
- `e2e:money` + `e2e:journey` on embedded Postgres.
- **Must stay green:** `test:deposit-gate`, `test:msisdn-prefill` (extended), `test:payments`,
  `test:money-invariants`, `test:bet-admission`, `test:failure-reasons`, `test:rg-*`, `test:withdrawn-features`,
  `test:client-graph-safe`, `test:house-bot-*`, `test:timer-date` (+ `red:timer-date` detached), `test:dial-stake`,
  `test:deploy-skew`.
- **Rewritten at the flip:** `test:one-sided`, `test:rate-copy`, V15/V16/V19/V22/V25/V26, `qa:live`.

**Production**
- The deploy commit via `/api/health` or `?dpl=`.
- Staff QA behind the preview; the agency via their link.
- After the flip, as `mobile01`: one real TZS 1,000 deposit → back → bet.

**Final:** an adversarial refute audit + mutation proof. "Done" is claimed only after that.

## 8. Risks

- **The laptop (RAM crashes):** one lock job at a time, fleets in slices, short workflows. The audit's first run was
  lost this way.
- **Parallel lanes:**
  - marketing-s9 writes `schema.prisma`, migrations, `prisma-dal.ts`, `store.ts`, admin nav, `roles.ts`,
    `package.json`;
  - house-bots targeting writes admin screens;
  - landing-v3 (office PC) was writing `page.tsx`, `globals.css`, `i18n-dict.ts` and must stop.

  Rebase the worktree daily, order migrations after main's latest, and re-run the journey suites whenever main moves.
- **Harm markers:** journey top-ups feed RAPID_DEPOSIT_ESCALATION and CHASING_LOSSES, which also suppress marketing.
  Watch them next to measure 3.
- **M-Pesa has never confirmed above TZS 50,000 (E-231):** large shortfalls may sit pending. The waiting page's copy
  covers it, with no guessed ceiling.
- **The 360 header budget and the headline 2-line fit:** measured in S4/S6, not assumed.
