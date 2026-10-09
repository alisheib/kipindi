# Round 6 independent review of `vodacom-visual` — the brief every reviewer reads

Product: 50pick, a Tanzanian real-money prediction market in Swahili, English and Chinese (Next.js 16.2 App Router,
React 19.2, TypeScript, Tailwind 3 with an OVERRIDDEN spacing scale — px-3 = 16px, 6 = 32px, `--sp-4` = 16px; Prisma;
Railway behind Cloudflare). The branch `vodacom-visual` is the Vodacom plan's S6 visual pass: five rounds of fixes to
the new "journey" shell (flagged; classic players see the classic shell, whose CHROME is frozen) and to page bodies
both shells share. It is about to go LIVE to real players with real money. The owner's rule: only perfect visual AND
logical results ship; nothing found is deferred as small. Your job is to find what is still wrong before it ships.

WHERE: read-only. The tree is F:\kipindi-rev, detached at vodacom-visual's 9677a3f5 (a stable copy — the integrator
keeps merging into F:\kipindi-vis; never read there). The review range is
`git -C F:/kipindi-rev diff 118fc75c HEAD` (main's tip under the branch; ≈45 commits — read each commit's message too:
`git -C F:/kipindi-rev log --format='%h %s%n%b' 118fc75c..HEAD`; they state what each change promises).
⚠️ OMEGA's memory is shared and near its limit: run scripts strictly one at a time, small, and never a dev server,
build, tsc, browser or test battery. You may write
scratch scripts ONLY under S\review6\<your letter>\ and run them with node/tsx (node_modules is shared; never delete
or install anything). Do NOT edit the repo, commit, push, stash, take the lock F:/kipindi-locks/heavy-node.lock, run
tsc, start a dev server or a browser. Git Bash eats backslashes in `-e` scripts and heredocs: write script FILES.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

METHOD
1. Read the commit messages, then the diff in your focus area (below), then the code around each hunk — a change is
   judged in its context (callers, the other shell, the other locales, the empty/error/loading/offline states, a
   phone at 320 and a desktop at 1280, a slow network, a refresh mid-request, a signed-out reader, a player on a
   responsible-gambling break or self-excluded, a held/frozen wallet, a house bot).
2. For each suspected defect, VERIFY it adversarially before reporting: reproduce it with a script (render with
   react-dom/server, run the function on the input, simulate the sequence), or cite the exact code path with line
   numbers that makes it happen. Try to refute your own finding first. Report only what survives, marked CONFIRMED
   (reproduced) or PLAUSIBLE (traced but not reproducible without a browser — say what a browser run must show).
3. Look for siblings: a defect found once is searched for everywhere it could recur.
Prior reviews (S\briefs\review-findings.md) found real defects (a static-cache rule that cached signed-in pages, the
proxy skipping image-like page addresses, a not-found mark one frame late, quadratic text helpers, inserted invisible
characters). Their fixes are on the branch — check them too: a fix can be incomplete.

REPORT (final message): the tip you reviewed; then each finding: SEVERITY (HIGH = money, data, security, privacy, RG,
a crash or a page that does not work; MEDIUM = wrong behaviour or a visible defect a player meets; LOW = a rare or
cosmetic defect), CONFIRMED/PLAUSIBLE, file:line, the concrete failure scenario (inputs/state → wrong result), how you
verified it (script path + output), and the smallest correct fix. Then what you checked and found sound (one line
each), so the integrator knows the coverage. No finding is too small to report; nothing unverified is reported as fact.

FOCUS AREAS (your prompt names yours)
A · SERVER, MONEY, RESPONSIBLE GAMBLING, SECURITY, DATA. Every server-side hunk: pages' data reads and their
    failure paths (a DB error must never become "not found" or an empty balance), generateMetadata, server actions
    touched by the pass (deposit/withdraw pages and confirms, the sell/bet confirms' commit paths), notification and
    email builders (R5-B changed market-service's dated notices and clipped titles: per-locale dates, word cuts),
    the proxy and next.config headers (two hotfixes are on main), the service worker (public/sw.js: what it caches,
    for whom), the offline document (person-free), RG surfaces (a break, an exclusion, limits — never offered a bet,
    never a promotion during a break; never a removed notice or helpline), the journey/classic resolver (who sees
    what), house-bot disclosure, privacy of anything rendered for one player reaching another (caching, shared
    URLs, OG images), and admin hunks (R5-A's in-flight rule touched admin confirms: can any action now double-fire
    or be blocked forever?).
B · CLIENT RUNTIME, HYDRATION, EFFECTS, PERFORMANCE, ACCESSIBILITY SEMANTICS. Every client component the pass touched:
    hydration mismatches (server vs client text: dates, locales, Intl, regexes with Unicode properties, random/ids),
    effects and their phases (useSyncExternalStore readers, the journey flag, the not-found mark, timers and their
    cleanup, polling, AbortControllers, the chart's 12s deadline), stale closures, race conditions on refresh and
    navigation, keyboard and focus (the ✕ withheld in flight — focus trap, initial focus, Escape), screen-reader
    names and live regions, the text helpers (keep-words, keep-run, fill-nodes, empty-state-text, cjk-marks: worst-case
    time on adversarial input, grapheme safety, characters inserted into copy), payload size (the loading ghosts and
    the not-found view were moved out of documents; check nothing heavy rides every refresh), and CSS that depends on
    a browser feature (container queries, :has(), text-wrap: balance, @supports) — what a phone without it shows.
C · CROSS-SURFACE CONSISTENCY (visual and verbal, statically). The pass's rule: one convention per pattern, applied to
    every sibling. Audit the conventions it established against every surface a player can reach in BOTH shells:
    one page one name (every door vs the page's h1/eyebrow/<title>/loading ghost, per locale); the close ✕ (one
    CloseX, on the title's capitals, withheld in flight); gold only for money earned (R5-C's census: anything it
    registered that should not be gold, anything gold it missed by another spelling); the brand family for non-money
    highlights; counts and money figures (formatNumber, .amount mono, TZS kept whole); titles balanced with figures
    whole; eyebrows, chips, section rails, empty states, loading ghosts that match their pages box for box (compare a
    ghost's structure to its page's); spacing on the override scale (no stock-scale inversions slipping in); the three
    locales' strings fitting their boxes at 320 (compute widths from the fonts if you need: S\r5e has a Sora/Inter
    width model). Read the round-5 tiles where useful (S\visual\tiles-r5\*.png — the Read tool shows images; the
    triage S\visual\triage-r5.md says what each tile is) — but most of this is code.
