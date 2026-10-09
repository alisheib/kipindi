# Reviewer A — running notes (verified items only). Tip 9677a3f5 (F:\kipindi-rev, read-only).

## Findings so far
A1 HIGH (RG) CONFIRMED — RG confirmation EMAILS state the end as the UTC calendar day, no time.
   src/lib/server/responsible-gambling.ts:38-39 `fmtDate` (toLocaleDateString en-GB, NO timeZone → server zone; Railway = UTC,
   nothing sets TZ), used at :335 (selfExclusionHtml endDate) and :373 (coolOffHtml endDate);
   src/lib/server/email.ts selfExclusionHtml (~1585: EN + SW lines both `endDate`, SW with English month) and coolOffHtml
   (~1598: SW line `untilIso.slice(0, 10)`). Bell notices (notifyCoolOff/notifySelfExclusion) were fixed by R4-I; the
   emails (the "durable record") were not, and R5-B fixed only the revoked-agent letter.
   Repro: t2-rg-email.mts (TZ=UTC) → t2-out.txt: 24h break taken 9 Oct 01:30 EAT → bell "hadi 10 Okt, 01:30", email
   "until 09 Oct 2026" / "hadi 2026-10-09" (a day early); 1h break → "until 09 Oct 2026" (no time); exclusion SW line
   "Akaunti yako imefungwa hadi 09 Oct 2026" (English month).

A2 HIGH (RG) CONFIRMED (code path) — the market page offers the full bet panel during a break/exclusion.
   src/app/markets/[id]/page.tsx: breakEnd read at :244-249 (isLockedOut) but `bettingOpen` :334 ignores it; SidePicker
   rendered at ~:742 inside `bettingOpen && session`; the same page now prints the break sentence under "Your positions"
   (:966-968) and hides "place another" (:1177). No bet surface reads the break (grep: no isLockedOut/breakEnd/onBreak in
   side-picker, conviction-dial, updown pages/components, market-card, landing board). Server refuses (cooling_off /
   self_excluded, market-service ~1128).

A3 LOW CONFIRMED — proxy matcher still skips not-found PAGES under the static carve-outs and any /favicon.ico… /favicon.svg…
   prefix (unescaped dots): t3-proxy.cjs → t3-out.txt (Next's own getMiddlewareMatchers): SKIPPED /icons/nope, /icons/nope.png,
   /brand/x, /og/x, /pay/x, /screenshots/x, /email-signatures/x, /favicon.icon, /favicon.ico/x, /faviconXico, /favicon.svgz.
   A missing file there renders the root _not-found inside RootLayout → AppShell (layout.tsx:231) = the signed-in header
   (name, masked phone, balance) with none of withSecurityHeaders' headers (XFO DENY, CSP, nosniff, Referrer-Policy, HSTS)
   and no x-pathname. Next's 404 path forces Cache-Control private,no-store (node_modules/next/dist/server/lib/router-server.js:475)
   so no edge caching. Also proxy.ts:252-260's "known gap" note still says the matcher skips ANY image-extension path (stale).

A4 LOW CONFIRMED — readableNotificationBody (src/lib/notification-text.ts:91-95) mends ".." in EVERY displayed body, new rows
   included (notifications/page.tsx:119, notifications-panel.tsx:63-65): "range 1..2 here" → "range 1.2 here" (t1-out.txt).
   Free text (officer notes/reasons, titles) passes through it.

A5 LOW CONFIRMED (code) — /updown/[roundId] generateMetadata titles a FOUND round `d.titleEn` in every language
   (getRoundDetail returns only titleEn, updown-board.ts:1364); R5-D localized only the failed-read title.

## Checked and sound (so far)
- sw.js: navigation branch first; keepable() image/font only; v6 name; refreshOffline guarded; offline doc person-free (route reads only licence).
- next.config immutable sources: exact folders; 404 path overrides Cache-Control (no edge cache of a page).
- market/updown/proposal generateMetadata: failed read → board title, missing → not-found metadata, nothing throws.
- getProposalDetail ignores viewer for visibility → metadata and body agree.
- hub-viewer lockout batch fails to no status; breakStateOf reason "self_exclusion" matches isLockedOut.
- notify() never rejects; ticketHref/roundTicketHref keep dedupe unique per position; async notifiers caught or fire-and-forget safely.
- instantIn/formatBreakEnd: per-locale months, EAT, year rule; NaN → "—" (t1-out.txt).
- clipQuote: code-point safe, word boundary, CJK; endClause; firstDateSentence (t1-out.txt).
- deposit/withdraw: hidden inputs still submit; break notice withdraw door only for cooling-off; errorCopy when.
- admin R5-A dialogs: loading disables confirm/cancel/✕/scrim/Esc; pending clears when the action resolves; throw → error boundary.
- ConfirmModal form submit re-checks `armed && !loading`.
- one-sided refund = VOID + BET_REFUND on both sides of paidOutBehind (consistent).
- resolveSimpleJourney fails closed (WITHDRAWN); server loading files read only cached resolver / feature flag.
- notifications page: counts read failure throws to error.tsx (never an "empty inbox").
- getRgSettings writes only on missing row / due pending change (idempotent upsert).
