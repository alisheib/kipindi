# R6-B brief — the round-6 review's runtime, security and text findings

You are fixer R6-B for 50pick's Vodacom visual pass. Read first, completely: S\briefs\r5-common.md (the rules — where it
says "1699302a" read the tip below), then the reviewers' evidence: S\review6\B\ (reviewer B: t2-trap.mts and its shims,
t3-chart-deadline.mjs, t1-timing.mts, t5-timing-more.mts, t4-namend-unicode.mts — run as its report says: from the
worktree, node_modules/.bin/tsx --tsconfig tsconfig.json --import file:///S/review6/B/hook-register.mjs <script>) and
S\review6\A\ (reviewer A: t1-text.mts, t3-proxy.cjs and their outputs).
Worktree: F:\kipindi-r6b (branch vodacom-visual-r6b at vodacom-visual's tip 89893725). Suite:
scripts/visual-pass-r6b.test.mts → test:visual-pass-r6b.
⚠️ OMEGA's memory is shared and tight: suites strictly one at a time; no dev server, build, tsc, browser or battery.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

B-1 (MEDIUM) · focus escapes the bet and sell confirms while their request is in flight: every control is disabled
    (R5-A's in-flight rule withholds the ✕ as `disabled`), the trap's list is empty (modal.tsx ~460-463 returns
    without preventDefault), so Tab leaves the aria-modal dialog for the page behind the scrim (verified: 0 focusables
    in flight at the tip, 1 at 118fc75c). Fix in modal.tsx: the panel `tabIndex={-1}`; with no focusables, Tab
    preventDefaults and focuses the panel (focusIn's existing panel fallback then works). It closes ConfirmModal's
    older hole too. Prove it by rendering the real panels as the reviewer did; name the browser check (throttle, press
    Confirm, Tab: document.activeElement inside [role=dialog]).
B-2 (LOW) · the chart's 12s deadline only flips the pane to "error"; polls stay serial behind a hung request (requests
    at 0, 30, 160, 290s against a 100s origin stall). Give each load its own AbortController chained to the effect's,
    aborted by the deadline (or don't await load() in the poll timer — `seq` already discards stale answers). Keep R5-A's
    guarantees: a late answer still draws; a drawn chart is never replaced; a verified empty answer says "no reads".
B-3 (LOW) · three text helpers are quadratic: fill-nodes.tsx ~78-80 `moneySentence` (`/\S+\s+\S+\s*$/`), live/
    pulse-grid.tsx ~166 KeepHyphenated's split, notification-text.ts ~28 endClause (`/[.。]+$/`). Linear scans, exactly
    equivalent output (prove equivalence over a corpus, as R5-E did — S\r5e has its tools).
B-4 (LOW) · keepNameEnd's Unicode-property pattern can cut a name differently on the server (Node's ICU) and in an older
    browser → a hydration mismatch in /profile's name editor. Decide the cut once on the server and pass it down, so
    the browser never re-derives it (sibling: pulse-grid's \p{Script=Han} — admin titles; classify).
A5 (LOW) · readableNotificationBody mends ".." in every body, new rows included ("range 1..2" → "range 1.2"): mend only
    the old template's shape (`\.\.(?=\s|$)`, ".。") .
A6 (LOW) · /updown/[roundId]'s metadata titles a found round titleEn in every language: return titleSw/titleZh from
    getRoundDetail and pickLocalized.
A7 (LOW) · notifyWin's body quotes the whole market title (notification-service ~377-379): clipQuote as its siblings.
A4 (LOW, security) · the proxy still skips the public folders and an unanchored `favicon.ico|favicon.svg`
    (src/proxy.ts ~307): a missing file under /icons/, /brand/, /og/… renders the root not-found inside the signed-in
    shell WITHOUT the security headers (frameable). Fix: anchor the favicons (`favicon\.ico$|favicon\.svg$`), and give
    every response the static security headers (all but the CSP) from next.config `headers()` for `/:path*`, so a
    skipped response carries them too; correct proxy.ts's stale comment (~252-260). Extend test:proxy-scope and
    test:static-cache-scope (controls + plants). ⭐ Make A4 ONE self-contained change (proxy.ts, next.config.ts, the two
    suites) — it will be cherry-picked onto main as a hotfix; say exactly which files form it, and what a lock turn's
    dev-server header check must show.

PROOF as r5-common.md says (suite with controls/plants, a mutation proof under S\r6b\, every suite reading a touched
file). REPORT exactly as r5-common.md says.
