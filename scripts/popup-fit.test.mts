/**
 * ALI'S CROSS-CUTTING RULE, AS A PLATFORM GUARD — not a note about one component.
 *
 * Ali, 2026-08-27: *"In all popups and warnings, make sure no text gets out of its allocated
 * location horizontally or vertically, no matter the amount of lines needed."*
 *
 * ⛔ THE POPULATION IS ENUMERATED FROM THE SOURCE, NEVER FROM A LIST IN A DOCUMENT — a list would
 * go stale the day somebody adds the fifty-ninth popup. Every `.tsx` under `src` that renders a
 * dialog role or one of the kit's popup primitives is in scope, the count is a RATCHET, and a new
 * popup that clips its copy fails this suite.
 *
 * ── ⭐ WHAT THIS SUITE CAN AND CANNOT DO, STATED SO NOBODY OVER-READS IT
 * `truncate` and `line-clamp-*` HIDE content by design: they are the mechanism by which text
 * leaves its box, and they are decidable from the source. So this suite bans them in popups.
 * ⛔ It CANNOT decide whether a box actually clipped at 360 in Swahili — that needs a rendered
 * rectangle, and `scrollWidth > clientWidth` is measured live by `qa:install-shown` (3 languages ×
 * 5 widths), `qa:rg-refused` (the RG refusal modal) and `live-bonus-live-proof` (the bonus
 * warning). ⭐ A static ban plus a live rectangle is the pair; either alone is half a guard.
 * ⚠️ AND `whitespace-nowrap` IS DELIBERATELY NOT BANNED. It is correct on a money figure and on a
 * short button label, where a mid-number break would be the defect. Banning it would make this
 * suite cry wolf, and a guard that cries wolf gets deleted.
 *
 * ── 🔴 THE DEBT IS REAL AND IT IS RATCHETED, NOT PAPERED OVER
 * Nine popup files carried a clip when this suite was written. ONE was fixed in the same commit —
 * the market title inside the bet-confirmation dialog, which is the sentence the payout turns on,
 * clamped to two lines at the moment a player commits money. The rest are listed below with what
 * is actually known about each, and the list MAY ONLY SHRINK.
 *
 *   npm run test:popup-fit
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./lib/decomment.mts";
// S6 · the popup detector and the record's comparison are one module, which red:journey-shell asks too (A13).
import { IS_POPUP, reviewGaps } from "./lib/popup-review.mts";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); } else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/**
 * ⛔ COMMENTS STRIPPED, AND IT IS LOAD-BEARING. Several of these files — including the two fixed
 * this session — carry comments EXPLAINING that clipping is forbidden. A guard matching the
 * vocabulary would fire on its own documentation, which happened four separate times in the
 * session that wrote this file. A word is not a control.
 */
const code = (p: string) => decomment(read(p));

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith(".tsx")) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}

/** A popup or warning: `IS_POPUP` (`./lib/popup-review.mts`) — a dialog role, or one of the kit's popup primitives. */
/** The two mechanisms that HIDE text. `whitespace-nowrap` is deliberately absent — see the header. */
const CLIPS = /\btruncate\b|\bline-clamp-[0-9]+\b/;

console.log("\nALI'S RULE · no text leaves its box in any popup or warning\n");

// ── §1 · THE POPULATION, WALKED ─────────────────────────────────────────────────────────────
console.log("§1 · the population — every popup under src, walked from source");
const all = walk("src").sort();
const popups = all.filter((f) => IS_POPUP.test(code(f)));
/**
 * ⛔ A RATCHET. A new popup is a new place for player copy to be clipped, and the whole point of
 * this suite is that nobody has to remember. If this fails because the platform gained a popup,
 * read §2 and either keep its copy whole or add it to `CLIP_DEBT` with a written reason.
 */
// ⚠️ 56, NOT 58 — AND THE GUARD CORRECTED ME. A plain grep counted 58 because two files
// only MENTION a popup primitive in a comment. The code-stripped detector is the honest number.
// +1, 2026-09-05: `src/app/admin/settlement/hold-button.tsx` — the officer hold's confirm
// (management ruling ②). Its copy is whole: no `truncate`, no `line-clamp`, and the sentence
// that matters most in it ("you will not be able to release it yourself") is a full paragraph
// rather than a clipped line, so it is NOT on the CLIP_DEBT list below.
/**
 * ── 🔴 2026-09-21 · THE RATCHET WAS RED BY TWELVE, AND THE NUMBER ALONE MISREPORTED IT
 *
 * The run said *"69 found, reviewed count is 57"* and the session that read it filed it as ONE new
 * component — `src/app/admin/desk/stop-queued.tsx`, the only file in the population that is not on
 * `origin/main`. ⛔ That was a COMPOSITE. The gap was TWELVE, and the guard's own message helped: it
 * printed the SORTED TAIL of the population (`search-help` · `updown-bet-blocked-modal` ·
 * `updown-bet-receipt-modal`), which are three of the oldest popups in the product and none of them
 * new, and then said it could not name which was new. So this block now NAMES them.
 *
 * ⛔ AND THE RED WAS NOT OURS. Eleven of the twelve are on `origin/main` RIGHT NOW, with this guard
 * byte-identical there — so `test:popup-fit` §1.1 is red on main by eleven, and has been since the
 * Agent Affiliate programme (`a783299f`, 5), KYC-at-withdrawal (`ac411357`, 3) and the social panel
 * (`b241a92b`, 1) landed, plus the two desk controls already merged (`2cb0cfac`, `d9ba7ee8`). Exactly
 * ONE — `stop-queued.tsx` (`00eb20ff`, C7 step 5) — is this branch's own.
 *
 * ── ⭐ WHAT WAS CHECKED, BECAUSE A RAISED NUMBER WITHOUT A REVIEW IS THE RATCHET AT ZERO
 * All twelve were opened and judged against what the 57 were judged against: the §2 ban on
 * `truncate` and `line-clamp-*`, and `hold-button.tsx`'s precedent that the sentence which matters
 * is a full paragraph rather than a clipped line. Then, because a clip is not the only way text
 * leaves a box, each was also scanned for the mechanisms §2 deliberately does NOT ban: fixed heights,
 * `max-h-*` without a scrolling partner, `overflow-hidden`, `whitespace-nowrap`, `text-ellipsis`
 * and fixed widths.
 *
 *   · NONE of the twelve carries `truncate` or `line-clamp-*`. None carries `whitespace-nowrap` or
 *     `text-ellipsis`. So none is a CLIP_DEBT candidate and that list did not grow.
 *   · Nine carry no box-escape mechanism at all.
 *   · `agents/[id]/doc-grid.tsx` — `min-h-[120px]` (a MINIMUM, grows), a `h-[44px]` box holding an
 *     ICON and no text, and `max-h-[70vh]` on an `<img>` with `object-contain`. A picture bounded to
 *     the viewport is the correct behaviour for a document scan; no text is bounded anywhere.
 *   · `agent/apply/apply-client.tsx` — `min-h-[96px]` dropzone (a minimum), `overflow-hidden` on that
 *     same auto-height box, `h-[64px]` on an `<img>` preview and `h-[40px] w-[40px]` on a round icon.
 *     The officer's free-text `rejectReason` under it is a `block` that wraps. Nothing bounds a
 *     sentence.
 *   · `social/channels-panel.tsx` — the only PLAYER-facing one. `overflow-hidden` on a card whose
 *     height is content-driven (so it grows rather than clips), `lg:max-w-[400px]` is a MAX width,
 *     `h-[44px] w-[44px]` is the close glyph and `min-h-[44px]` the rows. ⭐ Its title and every row
 *     label carry `min-w-0`, which is the correct cure for a flex child that would otherwise refuse
 *     to wrap — this one was built right.
 *   · ⭐ `agents/agents-client.tsx` holds the one genuine HORIZONTAL hazard in the twelve: the
 *     shown-once invitation LINK, an unbroken string no wrap opportunity exists inside. It already
 *     carries `break-all`. That is the fix, and it was there before this review.
 *   · `desk/stop-queued.tsx` (ours) — no clip, no fixed height, no `max-h`, no `overflow-hidden`.
 *     Every sentence it paints is a server-supplied prop of unbounded length and every one lands in a
 *     block that wraps; `Modal`'s own container is `overflow-y-auto`, so more lines make the dialog
 *     TALLER and the overlay scroll — which is Ali's rule verbatim, *"no matter the amount of lines
 *     needed"*. Its `h2` carries `pr-8` so the title cannot run under the ✕, its action row is
 *     `flex-col-reverse sm:flex-row` so two long Swahili labels stack at 360 instead of squeezing,
 *     and the `Button` atom sets no `nowrap`, so a long label wraps inside its own button. PASSES.
 *
 * ⛔ WHAT THIS REVIEW CANNOT SAY, kept explicit for the same reason the header keeps it: this is the
 * STATIC half. It cannot say a box did not clip at 360 in Swahili — that needs a rendered rectangle,
 * and the live half is `qa:install-shown`, `qa:rg-refused` and `live-bonus-live-proof`. None of those
 * covers the twelve, so the live rectangle for them is still OWED.
 *
 * ── ⛔ WHY THIS IS A LIST NOW, WHICH THE HEADER APPEARED TO FORBID
 * It does not: the header forbids enumerating the POPULATION from a list, and the population above is
 * still walked from source. This is the REVIEW RECORD the walk is held against — and it is the one
 * kind of list that CANNOT go stale silently, because any divergence in either direction is this
 * check failing by name. A bare count could be raised by one character; a name has to be typed.
 */
/*
 * ── 2026-09-27 · +1: `admin/affiliate/payable-switch.tsx`, the Owner's Payable / Not payable ceremonies (two
 * `Modal`s, one per direction). Opened and judged like the twelve above: no `truncate`, no `line-clamp-*`, no
 * `whitespace-nowrap`, no `text-ellipsis`, no `max-h-*`, no `overflow-hidden`, no fixed height on any text.
 * Every sentence is a server-built prop of unbounded length (`invitePayableDialogs`) in a block that wraps;
 * the heading carries `pr-8` so it cannot run under the close glyph; the radio cards' text sits in a `min-w-0`
 * span; the footer is `flex-col-reverse sm:flex-row`, so two long labels stack on a phone; `maxWidth` 520/420
 * is a MAX. The one fixed size is the 44px icon plate on the card, which holds a glyph and no text. PASSES.
 */
/*
 * ── 2026-09-30 · +2: `admin/journey/rollout-control.tsx` (the Owner's Stop / Resume / players-back dialog) and
 * `admin/journey/preview-links.tsx` (create and revoke a preview link) — the Vodacom plan S1. Opened and judged like
 * the record above: no `truncate`, no `line-clamp-*`, no `whitespace-nowrap`, no `text-ellipsis`, no `max-h-*`, no
 * `overflow-hidden`, no fixed height on any text. Every sentence is a server-built prop or a fixed sentence in a block
 * that wraps; each `h2` carries `pr-8`; each footer is `flex-col-reverse sm:flex-row`, so two long labels stack on a
 * phone; `maxWidth` 440 is a MAX. The one unbroken string — a link's address, a bearer key — sits in a `<code>`
 * with `break-all` and `max-w-full`, the same cure `agents/agents-client.tsx` carries. PASSES.
 */
/*
 * ── 2026-10-01 · +1: `journey/account/sign-out-row.tsx`, the Akaunti hub's sign-out (the Vodacom plan S6 WP5) — the kit
 * `ConfirmDialog` the avatar menu already uses, with the same four `profile.signOutConfirm*` words. Opened and judged like
 * the records above: no `truncate`, no `line-clamp-*`, no `whitespace-nowrap`, no `text-ellipsis`, no `max-h-*`, no
 * `overflow-hidden`, no fixed height on any text. The title and the one-sentence body are dictionary words in blocks that
 * wrap; the dialog is the kit's own, so more lines make it taller and its overlay scrolls. The trigger row's label wraps
 * inside its row (the hub row is a minimum height, never a fixed one). PASSES.
 */
/*
 * ── 2026-10-01 · +1: `components/journey/tickets-guest-sheet.tsx`, the guest Tiketi sheet (the Vodacom plan S6, WP6a).
 * Opened and judged like the record above: no `truncate`, no `line-clamp-*`, no `text-ellipsis`, no `max-h-*`, no
 * `overflow-hidden`. Its one sentence is the H2, which wraps and keeps right padding clear of the Modal's close button.
 * Its two actions are kit buttons on their own height rung, each a short label (Jisajili / Ingia, Sign up / Sign in,
 * 注册 / 登录), in a two-up row of equal tracks (`minmax(0, 1fr)`); `maxWidth` 440 is a MAX, and the Modal scrolls when
 * copy grows. PASSES. ⭐ `red:journey-shell` plants it off this record and proves 1.1's rule catches it (A13).
 */
/*
 * ── 2026-10-02 · +2: the contact book's two dialogs (marketing U22, U23), opened and judged like the record above.
 *   · `admin/contacts/contact-form.tsx` — U22's add and edit dialog. It shipped in e4f04528 WITHOUT a line here, so §1.1
 *     was red from that commit until this one (found while U23 added its own dialog beside it). No `truncate`, no
 *     `line-clamp-*`, no `whitespace-nowrap`, no `text-ellipsis`, no maximum height, no `overflow-hidden`, no fixed height
 *     on any text. Every sentence — a refusal, a hint, the consent statement — is a block that wraps; both `h2`s carry
 *     `pr-8`; both footers are `flex-col-reverse sm:flex-row`; `maxWidth` 480/420 is a MAX. PASSES.
 *   · `admin/contacts/contacts-bulk-bar.tsx` — U23's parameter dialog (one tag, or a list) and, through the kit's own
 *     `ConfirmModal`, the confirmation. No `truncate`, no `line-clamp-*`, no `whitespace-nowrap`, no `text-ellipsis`, no
 *     `overflow-hidden`, no fixed height on any text. The one bounded box is the confirmation's list of up to twenty
 *     selected contacts: a 38vh maximum height WITH `overflow-y-auto`, so the list scrolls inside the dialog rather than
 *     clipping (the resolver queue's confirmation is the precedent); each name sits in a `min-w-0 break-words` span and the
 *     row wraps. The `h2` carries `pr-8`; the footer is `flex-col-reverse sm:flex-row`; `maxWidth` 440/520 is a MAX.
 *     PASSES.
 */
/*
 * ── 2026-10-04 · ±0: `markets/sell-result.tsx` in, `markets/sell-button.tsx` out (the Vodacom plan S6, A8h). The result a
 * sale opens moved, unchanged, out of the Sell button into its own module, `SellResultModal`, which the shell's host
 * (`sell-result-host.tsx`, no popup primitive of its own) and the button's fallback both draw. The button now renders no
 * popup primitive itself (its confirm is `sell-confirm-modal.tsx`, on the record), so its name leaves. The new module
 * was opened and judged like the record above: it is the shared `OperationResultModal` with props only, no class of its
 * own, so no `truncate`, no `line-clamp-*`, no `whitespace-nowrap`, no `text-ellipsis`, no `max-h-*`, no
 * `overflow-hidden`, no fixed height on any text; the money figures in its title are amounts that move whole
 * (`wholeFigures`, S6 A8f), its detail rows wrap, and the Modal scrolls. `test:sell-grace-truth` §6 measures it from
 * 320 in en, sw and zh. PASSES.
 */
/*
 * ── 2026-10-09 · +1: `admin/contacts/import/contacts-import-dialog.tsx`, the contacts importer (S15 · C3–C5) — ONE `Modal`
 * whose steps are panels in their own files (`import-entrance`, `import-mapping-panel`, `import-check-panel`,
 * `import-decision-panel`, `import-commit-panel`, `import-adopt-panel`, `import-done-panel`, `import-open-runs`,
 * `import-parts`). Only the dialog renders the popup primitive, so only it is in the population (the panels' own
 * confirmations are the kit's `ConfirmModal`), but every panel it renders was opened and judged with it: no `truncate`, no
 * `line-clamp-*`, no `text-ellipsis`, no `overflow-hidden`, no fixed height on any text.
 * ⛔ THE REVIEW FOUND THREE WAYS TEXT LEFT ITS BOX, none of them a mechanism this suite bans, and fixed all three in the
 * same round: (1) the start button carried the import's whole promise ("Import — 0 new · 0 updated · 40 kept as they
 * are") and the kit button's own one-line rule ran it past BOTH edges at 360 (the lead read it off the drive's
 * `360-3-check.png`) — the promise is now a sentence of its own above the actions, and the button says "Import 40 rows";
 * every other label that can outgrow a 360 sheet (a refusal's way on, "Show the contacts this import added", the
 * columns' Next) sits in `ButtonText`, which lets it wrap inside its button, two lines fitting the control's height;
 * (2) a list chip held the phrase "Not ready — record its basis on the Lists card" in a one-line span — the span is gone
 * (the kit Chip wraps and grows, G-7) and the chip reads "Not ready for offers"; (3) the check's five count boxes sat
 * five to a row from `sm`, where a six-figure count overruns a 105px box — five to a row only from `lg` now, three from
 * `md`, two below. What stays bounded is bounded WITH a scrolling partner: the changes table (360px), the check's problem
 * lists (240px) and the failures list (260px) are each a maximum height with `overflow-y-auto` inside `ScrollX`; the
 * file's own column names and every name and sentence in a table cell wrap (`break-words`). One-line text remains only
 * on a masked number (`+255••••01`) and a row reference ("Row 12", "Row 9 repeats row 4") in a table that scrolls
 * sideways — short figures a mid-figure break would damage, the header's own exception. The `h2` carries `pr-8`; every footer is the panels' `ActionsRow` (`flex-col-reverse sm:flex-row`, the
 * primary on top at 360); `maxWidth` 760 is a MAX; at 360 the Modal is a full-height sheet whose overlay scrolls, so more
 * lines make it taller and never clip. PASSES — and its live rectangle is the S15 drive's (360 and 1280, every step).
 */
const REVIEWED: readonly string[] = [
  "src/app/admin/affiliate/payable-switch.tsx",   // reviewed 2026-09-27
  "src/app/admin/agents/[id]/decision-rail.tsx",   // reviewed 2026-09-21
  "src/app/admin/agents/[id]/doc-grid.tsx",   // reviewed 2026-09-21
  "src/app/admin/agents/agents-client.tsx",   // reviewed 2026-09-21
  "src/app/admin/ai-polls/poll-actions.tsx",
  "src/app/admin/ai-usage/credit-controls.tsx",
  "src/app/admin/ai-usage/cycle-controls.tsx",
  "src/app/admin/approvals/sof-review-client.tsx",
  "src/app/admin/bonuses/bonus-admin-client.tsx",
  "src/app/admin/candidates/candidate-actions.tsx",
  "src/app/admin/contacts/contact-form.tsx",   // reviewed 2026-10-02 (U22, owed since e4f04528)
  "src/app/admin/contacts/contacts-bulk-bar.tsx",   // reviewed 2026-10-02 (U23)
  "src/app/admin/contacts/import/contacts-import-dialog.tsx",   // reviewed 2026-10-09 (S15 importer, with every panel it renders)
  "src/app/admin/desk/[id]/account-actions.tsx",   // reviewed 2026-09-21
  "src/app/admin/desk/stop-queued.tsx",   // reviewed 2026-09-21
  "src/app/admin/desk/switch-ceremony.tsx",   // reviewed 2026-09-21
  "src/app/admin/journey/preview-links.tsx",   // reviewed 2026-09-30
  "src/app/admin/journey/rollout-control.tsx",   // reviewed 2026-09-30
  "src/app/admin/kyc/[id]/kyc-decision-rail.tsx",
  "src/app/admin/kyc/[id]/refused-funds-panel.tsx",   // reviewed 2026-09-21
  "src/app/admin/kyc/[id]/reopen-refusal-control.tsx",   // reviewed 2026-09-21
  "src/app/admin/markets/emergency-void-control.tsx",
  "src/app/admin/objections/objection-decision.tsx",
  "src/app/admin/payments/reconcile-controls.tsx",
  "src/app/admin/payments/stuck-payout-controls.tsx",
  "src/app/admin/players/[id]/balance-adjust-controls.tsx",
  "src/app/admin/players/[id]/force-reverify-controls.tsx",
  "src/app/admin/players/[id]/reset-password-button.tsx",
  "src/app/admin/players/[id]/set-email-form.tsx",
  "src/app/admin/players/[id]/suspend-controls.tsx",
  "src/app/admin/players/[id]/wallet-freeze-controls.tsx",   // reviewed 2026-09-21
  "src/app/admin/privacy/dsar-controls.tsx",
  "src/app/admin/proposals/admin-proposals-client.tsx",
  "src/app/admin/resolver-queue/resolve-controls.tsx",
  "src/app/admin/settlement/hold-button.tsx",
  "src/app/admin/settlement/settle-button.tsx",
  "src/app/admin/sources/source-controls.tsx",
  "src/app/admin/updown/proposals/proposal-actions.tsx",
  "src/app/admin/updown/rounds/void-round-control.tsx",
  "src/app/admin/updown/updown-controls.tsx",
  "src/app/agent/apply/apply-client.tsx",   // reviewed 2026-09-21
  "src/app/agent/invite/[token]/invite-client.tsx",   // reviewed 2026-09-21
  "src/app/profile/account/close-account-form.tsx",
  "src/app/proposals/new/create-form.tsx",
  "src/app/wallet/deposit/deposit-confirm.tsx",
  "src/app/wallet/wallet-result-modal.tsx",
  "src/app/wallet/withdraw/withdraw-confirm.tsx",
  "src/components/admin/action-overlay.tsx",
  "src/components/admin/admin-mobile-nav.tsx",
  "src/components/admin/kyc-review-controls.tsx",
  "src/components/chat/ChatPanel.tsx",
  "src/components/journey/account/sign-out-row.tsx",   // reviewed 2026-10-01 (Vodacom S6 WP5)
  "src/components/journey/tickets-guest-sheet.tsx",   // reviewed 2026-10-01 (S6 WP6a)
  "src/components/layout/avatar-menu.tsx",
  "src/components/layout/needle-drawer.tsx",
  "src/components/layout/notifications-panel.tsx",
  "src/components/layout/wallet-sheet.tsx",   // reviewed 2026-09-27 (landing v3 WP14) — no max-h, no overflow-hidden, no nowrap; the amount wraps (overflow-wrap: anywhere) and Modal scrolls
  "src/components/markets/bet-confirm-modal.tsx",
  "src/components/markets/conviction-dial.tsx",
  "src/components/markets/filter-sheet.tsx",
  "src/components/markets/market-card.tsx",
  "src/components/markets/objection-dialog.tsx",
  "src/components/markets/operation-result-modal.tsx",
  "src/components/markets/sell-confirm-modal.tsx",
  "src/components/markets/sell-result.tsx",   // reviewed 2026-10-04 (S6 A8h)
  "src/components/markets/share-button.tsx",
  "src/components/markets/win-celebration.tsx",
  "src/components/onboarding/first-visit-primer.tsx",
  "src/components/pwa/install-invite.tsx",
  "src/components/rg/reality-check.tsx",
  "src/components/rg/rg-confirm-submit.tsx",
  "src/components/social/channels-panel.tsx",   // reviewed 2026-09-21
  "src/components/ui/ai-progress.tsx",
  "src/components/ui/date-select.tsx",
  "src/components/ui/modal.tsx",
  "src/components/ui/search-help.tsx",
  "src/components/updown/updown-bet-blocked-modal.tsx",
  "src/components/updown/updown-bet-receipt-modal.tsx",
];
const POPUPS_EXPECTED = REVIEWED.length;
const { unreviewed, vanished } = reviewGaps(popups, REVIEWED);
ok(`1.1 ⛔ RATCHET · ${popups.length} popup/warning components found, and the reviewed count is ${POPUPS_EXPECTED}`,
   unreviewed.length === 0 && vanished.length === 0,
   [unreviewed.length ? `UNREVIEWED (${unreviewed.length}): ${unreviewed.join(" · ")} — open each one, judge it against §2 and the record above, then add it BY NAME` : "",
    vanished.length ? `GONE (${vanished.length}): ${vanished.join(" · ")} — delete the name rather than leaving a stale review` : ""].filter(Boolean).join("  ||  "));
// ⭐ POSITIVE CONTROL · a walk that found nothing would satisfy every check below.
ok("1.2 ⭐ POSITIVE CONTROL · the walk really found the kit's own popup primitives and the ones this session touched",
   popups.includes("src/components/markets/bet-confirm-modal.tsx")
   && popups.includes("src/components/pwa/install-invite.tsx")
   && popups.includes("src/components/markets/operation-result-modal.tsx"),
   `${popups.length} files`);
ok("1.3 …and the detector can say NO — an ordinary non-popup file is not in the population",
   !popups.includes("src/lib/utils.ts") && !IS_POPUP.test("export const x = 1;"), "");

// ── §2 · NO POPUP CLIPS ITS COPY ────────────────────────────────────────────────────────────
console.log("\n§2 · truncate and line-clamp are how text leaves its box");
/**
 * ⛔ EVERY ENTRY NEEDS A WRITTEN NOTE AND THE LIST MAY ONLY SHRINK — the shape
 * `test:grid-paging`'s `UNPAGED_DEBT` already uses on this platform.
 * ⚠️ Being on this list is NOT a verdict that the clip is correct. Where it says NOT YET REVIEWED
 * that is exactly what it means, and E-236 carries them.
 */
const CLIP_DEBT: Record<string, string> = {
  "src/components/layout/notifications-panel.tsx":
    "NOT YET REVIEWED (E-236). Several `truncate` on notification titles in a list inside a panel. "
    + "Arguably legitimate — the full text is on /notifications — but it is player copy in a popup "
    + "and nobody has measured it at 360 in Swahili.",
  "src/components/markets/win-celebration.tsx":
    "NOT YET REVIEWED (E-236). `line-clamp-2` on the settle line of the win moment.",
  "src/components/layout/avatar-menu.tsx":
    "NOT YET REVIEWED (E-236). A menu, not a warning; the clip is likely on a name.",
  "src/app/admin/ai-polls/poll-actions.tsx":
    "ADMIN surface. Ali's rule is about what a PLAYER sees; an operator has the row beneath the "
    + "dialog. Reviewed as acceptable, and it stays on the list so the count can only fall.",
  "src/app/admin/markets/emergency-void-control.tsx": "ADMIN surface — see the note above.",
  "src/app/admin/proposals/admin-proposals-client.tsx": "ADMIN surface — see the note above.",
  // ⚠️ TWO ENTRIES WERE DELETED FROM THIS LIST BEFORE IT SHIPPED — `share-button.tsx` and
  // `admin/updown/updown-controls.tsx` — because check 2.2 proved they do NOT clip: their only
  // `truncate` was inside a COMMENT. ⭐ A debt list that names innocent files is as bad as one
  // that misses guilty ones, and the ratchet caught mine on its first run.
};
let clipped = 0;
for (const f of popups) {
  const hasClip = CLIPS.test(code(f));
  if (!hasClip) continue;
  clipped++;
  ok(`2.1 ⛔ RATCHET · ${f} clips text in a popup and carries a written reason`,
     !!CLIP_DEBT[f], "keep the copy whole, or add it to CLIP_DEBT with a reason a reader can act on");
}
ok("2.2 ⛔ the debt list may only SHRINK — every entry still clips something",
   Object.keys(CLIP_DEBT).every((f) => popups.includes(f) && CLIPS.test(code(f))),
   Object.keys(CLIP_DEBT).filter((f) => !popups.includes(f) || !CLIPS.test(code(f))).join(" · ")
   + " — delete the entry rather than leaving a stale exemption");
// ⭐ POSITIVE CONTROL · the detector must be able to SEE a clip, or §2 is green over anything.
ok("2.3 ⭐ POSITIVE CONTROL · the clip detector still matches real source",
   clipped > 0 && CLIPS.test('<p className="truncate">x</p>'), `${clipped} clipping popup(s) found`);

// ── §3 · THE ONE FIXED THIS SESSION STAYS FIXED ─────────────────────────────────────────────
console.log("\n§3 · the highest-stakes popup in the product");
{
  const bet = code("src/components/markets/bet-confirm-modal.tsx");
  // ⛔ THE MARKET TITLE IS THE SENTENCE THE PAYOUT TURNS ON, and it was `line-clamp-2` in the
  // dialog where the player commits money. Measured live in that dialog: "Will the USD/TZS
  // exchange rate close above 2,650 on any day before 30 September 2026, per Bank of Tanzania
  // official rates?" — and Swahili and Chinese are longer than English.
  const titleBlock = /\{marketTitle && \([\s\S]{0,400}?\{marketTitle\}/.exec(bet)?.[0] ?? "";
  ok("3.1 the confirm dialog still renders the market title (this check is not blind)",
     titleBlock.length > 0, "the title block moved — re-anchor before trusting 3.2");
  ok("3.2 ★★ and it is NOT clamped — a player must be able to read the whole thing before committing money",
     titleBlock.length > 0 && !CLIPS.test(titleBlock), titleBlock.replace(/\s+/g, " ").slice(0, 160));
}

console.log(`\npopup-fit: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.error("\n✗ A popup or warning clips player copy. Ali's rule: no text leaves its allocated location, horizontally or vertically, no matter the amount of lines needed.\n");
  for (const f of fails) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(`popup-fit: OK — ${popups.length} popups walked, ${clipped} carry a clip and every one of those carries a reason`);
