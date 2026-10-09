# Independent code review of vodacom-visual (at f0134de4) — the verified findings to fix in round 5

## Review 1 — offline path, not-found mark, route transition, not-found metadata
F1 MEDIUM (older code on R4-K's path). src/app/markets/[id]/page.tsx ~69-70: `try { m = await getMarket(id); } catch {}
   if (!m) notFound();` inside generateMetadata — a DB blip while the body's own read succeeds serves a REAL market
   (maybe holding the reader's money) as "Hakuna ukurasa · 404" with noindex, nofollow (Next 16.2: a notFound() thrown
   in metadata makes the [id] not-found boundary replace the page — metadata.js 114-123, MetadataOutlet 149-167). The
   rule B-1 (~line 145) forbids exactly this, and the comment there wrongly calls the catch "title garnish".
   FIX: as R4-K did for /updown and /proposals — `try { m = await getMarket(id) } catch { return {}; } if (!m) notFound();`
   and correct the line-145 comment.
F2 (service-worker half; the next.config half is ALREADY FIXED on main, hotfix 9cb95938). public/sw.js's static-asset
   rule (stale-while-revalidate, matched by file EXTENSION only) caches a navigation's HTML when the address merely
   ends in .png/.svg/… — e.g. a signed-in reader's page at /markets/x.png is stored in 50pick-v5 and answered first to
   the next visitor of that address on the same phone (proved in a sandbox run of the real sw.js).
   FIX: in the static branch skip `request.mode === "navigate"`, and only `cache.put` when the response's content-type
   is an image/font (never text/html or text/x-component). Extend test:offline-neutral (it already runs sw.js in a
   sandbox) with this case and its plant.
F3 LOW. The offline page's licence number (route.ts bakes it in) and any later fix to offline-document.ts never reach
   phones that already hold /offline: it is fetched only at install; a precache that failed at install is never retried.
   FIX: refresh /offline (precacheRequest, credentials omit) from the navigation success path, throttled (e.g. at most
   once a day per worker wake), via event.waitUntil.
F4 LOW (visual). Leaving a not-found page, the next page renders with notFoundShown = true for at least one painted
   frame (the router renders the new page in a transition while the old #kp-not-found is still in the DOM; the mark's
   effect cleanup runs after paint for a transition commit) — no tab lit, overlays wrong for a frame — breaking R4-J's
   "one tab lit in every frame". src/lib/not-found-mark.ts 39-41, 54-56; src/components/ui/not-found-mark.tsx 17-20.
   FIX: make the mark path-aware — render `data-path={usePathname()}` on the span, let the snapshot return that path or
   null, and have useNotFoundShown return `markPath === usePathname()`.
F5 LOW (visual; contradicts R4-J's note). The `:root:has(#kp-not-found)` first-paint CSS (globals.css ~6963-6967) never
   applies to the market/round/proposal not-founds: they are thrown under a loading.tsx, React 19.2's server renderer
   does not run class error boundaries, so the server HTML is the loading skeleton (+ a NEXT_HTTP_ERROR_FALLBACK;404
   template) with NO mark — before scripts run the skeleton shows with Maswali / Juu-Chini lit. It only applies to
   unmatched URLs (/_not-found). After hydration everything is right.
   FIX: either accept and correct the comments (not-found-mark.ts ~20-22, the CSS note), or decide "missing" before
   streaming; say which and why.

## Review 2 — the shell, root loading and route ghosts
G1 MEDIUM (performance). src/components/journey/route-ghost.tsx 58-74 (+ its cost note 35-36) and src/app/loading.tsx
   14-18: the ghost set is ~27 KB of Flight JSON (3.1 KB gzipped; /account alone 8.2 KB because it draws BOTH the member
   and the guest sets) in EVERY journey document — and, because Next 16 wraps the root segment's rsc in
   LoadingBoundaryProvider({loading}) and router.refresh() refetches from the root, in EVERY refresh payload: the
   RefreshPoller fires every 15 s on /markets/[id] and /live and every 20 s on /positions, /updown, /wallet,
   /updown/history (+ 50pick:refresh after each bet) — ~109 KB/min of extra RSC to parse on a question page.
   FIX (proper): render the ghost set from a next/dynamic client chunk (the shell-lazy pattern) taking `locale` (and
   whatever else it needs as small props), so the RSC carries a ~100 B reference; words from the client dictionary;
   correct the cost note. At least: draw only the reader's /account variant (chosen on the server from session
   presence, no registry read). Measure the before/after Flight bytes the way the reviewer did (scratchpad\review\
   measure-ghosts.cts) and put the numbers in your report.
G2 LOW (latent, documented). With the journey header and tabs bare (no Suspense), a server render error in them, or in
   any ghost, now fails the whole document (500) instead of being contained. No current throw. If G1's client chunk
   moves the ghosts to the browser, that half goes away; say what remains for the header and keep it documented.

## Review 3 — the text-shaping helpers
H1 MEDIUM. src/components/ui/keep-words.tsx ~109 (keepFigures' ideograph tail `\s?[ideo]{1,2}`) and ~123 (the word
   before is dropped whenever a tail exists):
   (a) the tail takes the next one or two ideographs whatever they are: 超过[15万美]元？ (美元 cut, "元？" can stand
       alone), 比特币[8月][1日收]于[10万美]元以上, [2026年坦]桑尼亚 (the good break 年|坦 removed), [2026年第]三季度,
       [7月降]雨量, [10月前];
   (b) when a unit follows, the currency code is left out: "Simba watapata TZS [1 bilioni]?", "TZS [4,200以上]",
       "奖金会超过TZS [1,000,000吗]？".
   FIX (prototyped in scratchpad\review\fix.ts; 20,000 fuzz cases kept the text identical, r4h §4.1 unchanged): a
   closed list of Chinese units, longest first —
   ZH_UNIT = "万美元|亿美元|万先令|亿先令|美元|先令|欧元|英镑|毫米|厘米|公里|千米|公斤|千克|毫升|分钟|小时|赛季|季度|百分点|
   摄氏度|个月|年底|年初|月底|月初|月中|[年月日号时分秒天周岁米克吨升元万亿场球届次名个度轮局倍]" — the tail group becomes
   `(\s?(?:${ZH_UNIT}))`; and keep a currency code as the head even when a unit follows:
   `head = before !== undefined && (tail === "" || /^(?:TZS|USD|KES)$/.test(before)) ? before + gap : ""`.
H2 LOW. keepNameEnd (~144): the gap `\s*` accepts U+3000 / U+2003, so "AB" + 37×U+3000 + "C" (40 units, accepted by the
   zod max(40)) becomes a 39-character unbreakable nowrap run (~663px in the hub, ~936px in the profile button).
H3 LOW. keepNameEnd's "last two characters" are code points: the cut lands inside one emoji (Neema 👩<span>‍💻</span>).
   FIX for H2+H3 (prototyped in scratchpad\review\fix2.ts):
   CH = String.raw`(?:\p{RI}\p{RI}|\S(?:[\p{M}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]|‍\S)*)`;
   NAME_END = new RegExp(`${CH}[\t\n\f\r ]*${CH}[\t\n\f\r ]*$`, "u");
H4 LOW. src/components/ui/empty-state-text.ts ~19 and ~35 (round 3; feeds hangCjkMarks at empty-state.tsx ~85) INSERTS
   U+2060 (word joiner) and U+00A0 into the body — keep-words.tsx 9-10 and keep-units.tsx 17-19 reject exactly that
   (it travels into copy and find-in-page): zh "…是或否⁠——您…", sw "…NDIO au HAPANA — tiketi…".
   FIX: the keepLastWords technique — "word + dash" and the "NDIO au HAPANA" pair in whitespace-nowrap spans,
   hangCjkMarks on each plain segment, no inserted characters.
H5 (housekeeping) keep-units.tsx has no callers or importers; only doc comments mention it — delete it (and fix the
   comments that cite it) if nothing else needs it.
DOUBTS the reviewer left (settle if in your area): the zh 超|过 split (round 5 F1) is NOT keepFigures — the run never
   includes 过; most likely Chromium's `text-wrap: pretty` on the featured title (globals.css ~5305) and the board's
   `.kp-qrow__q` (~4813) avoiding a last line of one unbreakable piece, which in Chinese is one character; candidate fix:
   `:lang(zh)` → `text-wrap: wrap` on those titles (or phrase segmentation). hangCjkMarks puts a real space after each
   mark that is not at the end (find-in-page for "，市场" will not match; copy relies on user-select:none — WebKit
   unverified).
