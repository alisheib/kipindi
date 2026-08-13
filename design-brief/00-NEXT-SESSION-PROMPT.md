# NEXT SESSION — batches 2–4 of the round-2 design (hero · landing · header · rail · cleanup)

**Paste this whole file as your opening prompt.**
**Batch 1 (`/markets`) is DONE and LIVE. This session builds the hero, the landing
composition, the header and the bottom rail, then closes the work out.**

## ▶ START HERE — a machine that has never run this

1. `cd C:\kipindi-main` · `git fetch origin` · `git status` — you must be on **`main`**, clean.
2. `npm install` · `npx prisma generate`.
3. 🚩 **`.env.qa.local` is gitignored and does NOT travel between machines.** It holds the five
   QA operator passwords. Without it you cannot sign in as anybody. It is not needed for the
   work below (the landing and hero are anonymous surfaces), but it IS needed for anything
   authed — ask Ali, or copy it from the other machine.
4. There is **no `.env`** on a dev machine, and there must not be: with no `DATABASE_URL` the
   local server boots the in-memory store, which is what makes local work zero-risk.

**Boot + seed the local board** (the in-memory store starts EMPTY, and it is wiped every time
`next dev` restarts on a file change — re-seed freely, it is instant):

```
SESSION_SECRET=qa_local_session_secret_at_least_32_chars_long OTP_PEPPER=qa_local_otp_pepper_16plus npx next dev -p 3009
curl -s -X POST http://localhost:3009/api/dev-test/seed-real-markets
curl -s -X POST http://localhost:3009/api/dev-test/seed-markets       # → 46 live markets
curl -s -X POST http://localhost:3009/api/dev-test/resolve-seed-markets   # settled rows, for the settled strip
```
⚠️ A dev server booted **while `prisma generate` was running** served 404 on every `/api/*`
route while rendering pages normally. A clean restart fixes it. Not a product defect.

**The instruments this work left behind — they run against local OR production, read-only:**

| Command | What it proves |
|---|---|
| `npm run qa:discovery-probe -- https://50pick.tz` | every control's promised count equals what pressing it delivers |
| `npm run qa:discovery-board -- https://50pick.tz` | the GRID draws a page of that set, counted in a real browser DOM |
| `LOCALES=en,sw,zh npm run qa:discovery-shots -- .qa-design-round2/after` | 360 + 1280 × en/sw/zh, fails on any horizontal overflow |
| `npm run test:discovery-contract` · `npm run red:discovery-contract` | the filter contract, and 7 real defects it catches |
| `npm run test:board-discovery` · `npm run red:board-discovery` | the landing-board invariants, and 6 defects |

## Read, in order, before touching anything

1. `CLAUDE.md` — the mechanics + the ACTIVE-WORK banner.
2. `docs/DESIGN_AUTHORITY.md` §0 — the filing law. Values live in `globals.css`/`motion.css`,
   never in docs.
3. **`design-brief/PLAN-OF-RECORD.md` §8 — THE PLAN.** §8.1/§8.2 are the two pinned definitions,
   §8.4 the eleven kit contradictions and how each was resolved, §8.6 the gate risk register,
   §8.7a what batch 1 measured on production, §8.7b what it found, §8.8 what is deferred.
   **§7b is the implementation dossier for the hero and landing** — file:line anchors, measured
   2026-08-12. Re-verify only what a later commit may have moved.
4. `docs/design-system/v3-2026-08-11-landing-discovery/ACCEPTANCE.md` — INHERIT/IGNORE per file.
5. The kit itself: `START-HERE.md` → `README.md` → `SPEC.md` → `COMPONENTS.md`; open
   `prototype/50pick Discovery Prototype.dc.html` in a browser.
6. `docs/design-brief/handover-2026-08/LAWS.md` — 85 invariants + 4 licence conditions.

⛔ `main` is SHARED and **every push deploys live**. Never `git add -A`; stage by explicit path;
`git branch --show-current` before every commit; `git fetch` and look for commits newer than the
newest handoff before assuming the tree is yours.
⛔ Never `git clean -x` — it takes `.env.qa.local`, which is unrecoverable.
⛔ Verify before reporting: run the command, quote the output. A grep is not proof of behaviour.

---

## WHAT BATCH 1 ALREADY SETTLED (do not re-derive)

- **`Open` = LIVE and still taking bets · `All` = the unsettled book (LIVE ∪ CLOSED).** Both
  were open questions the kit flagged as invented; both are now pinned on production
  measurement. On prod: Open 40, All 42. RESOLVED/VOIDED stay at `/results`.
- **Every count on `/markets` is cross-filtered** — the number beside a control is what pressing
  it delivers. Asserted control-by-control against the running site.
- **`src/lib/markets/discovery.ts`** is the ONE definition of parsing, defaults, the href
  builder, status predicates, odds/pool buckets, sorts + tie-breakers, counts and relaxations.
  It is pure — no server imports. Lifecycle facts stay in `market-service.ts`.
- **`test:board-discovery` was rewritten from source-greps onto behavioural assertions.** Its old
  anchors (`DEFAULT_WHEN`, `WHEN_CUTOFFS`, `sp.when`) are gone from the product **deliberately —
  do not restore them**.
- The four `--rh-*` rhythm tokens are defined once in `globals.css` beside the spacing scale,
  with the placement rule as the comment. ⚠️ A section's OBSERVED gap is the sum of the two
  paddings that meet at it — do NOT also write `margin: var(--rh-chapter)` or you double-count.

---

## BATCH 2 — the hero (kit README §1a; dossier §7b)

- `--hero-grad-warm` surface + brand-mark backdrop (`rotate(-14deg)`, `--hero-mark-opacity`,
  **never recoloured**). ⭐ Both tokens already exist in `globals.css` with **zero consumers** —
  they were provisioned for exactly this.
- Eyebrow · headline **"The wisdom of YES & NO."** (verbatim in all locales — move to dict keys
  with identical en/sw/zh values) · proof rail (REAL figures only) · aggregate conviction bar
  (Σ yesPool / Σ pool, computed server-side, **never an average of percentages**, gated on
  Σ pool > 0) · the question board (4-col grid of real open markets, closing-soonest) · hero
  foot with lede + 2 CTAs + one live `<MarketCard/>`.
- ⛔ **`public/hero/hero-bg.webp` and its `page.tsx` reference are removed in the SAME commit the
  replacement lands.** Replace, then delete — never before.
- The hero is the **FOURTH** consumer of the cold-start rule — update
  `docs/DESIGN_AUTHORITY.md:494-498` from three consumers to four **in the same commit**.
- Licence condition 1: below Σ pool > 0 the bar shows the dashed empty vocabulary
  (`--bar-empty-track`), **never 50%**. `impliedYesPct` returns a hardcoded 50 on an empty pool —
  batch 1 hit this exact trap in the odds buckets; the hero must not re-buy it.

## BATCH 3 — landing composition + header + rail (kit README §1b–1i, §2)

- Section order + rhythm (144 · 96 · 96 · 144, from padding pairs) · how-it-works band (heading +
  lede read `t.primer.card1Title/Body`; **also fix `first-visit-primer.tsx` to read the dict** —
  its inline copy duplicates those keys today) · pick-a-side grid · topic tiles with real
  per-topic count+pool folded from the ONE board read · Up&Down band · trust band (M-Pesa via
  `PaymentLogo`, white tile, **never inline the SVG**) · settled strip (re-sort by `settledAt`
  DESC; amount = pool − fee via `payout.ts` + `feeSnapshot`, `formatTzs`, gold correct here) ·
  RG line above the footer · footer unchanged.
- `StatsBand` (the zero-counters) is **deleted** — the proof rail + settled strip replace it.
- Header: opaque `--panel` at every scroll position + `--shadow-2` scrolled; three-tier nav; ONE
  active treatment (`--pill-active`); Sign in (ghost) + Sign up (pill) at every width; the 44×44
  `EN ⌄` listbox (options DIRECT children); skip link. ⚠️ Must hold `Jedwali la Washindi`
  through 1024–1279. ⚠️ **The dossier claims the header has no auth buttons today — it is STALE;
  `Sign in`/`Sign up` are already there at ≥640.** Verify against the code, not the dossier.
- Bottom rail: 5 slots `Markets · Up & Down · Live · Results · More`, `--pill-active` (kill the
  aqua literals), auth NOT in the rail, More carries Positions/Wallet/Top/Invite when authed.
- 🔴 **The ticker's feed is FABRICATED** (`src/lib/server/ticker-feed.ts` — a hardcoded 12-item
  synthetic array, on every page of a licensed real-money product). Wire it to real events
  (recent `settledAt` settlements + recent opens) **or render nothing**. A-5: nothing over a
  guess. This is the batch's one product-honesty fix.
- Entry motion LAST: 550ms budget, existing `--t-*`/`--m-*`, IO reveal (precedent
  `pulse-grid.tsx:83`), `.js` progressive class, all THREE reduced-motion gates.
  ⚠️ `animation-delay` IS clamped under reduced motion (`motion.css` ATOM A) — a delayed
  `both`-fill keyframe blanks content for its whole delay.

## BATCH 4 — cleanup + handoff

- Cite-check → archive to `F:\50pick-design-archive\2026-08-12-final\` (verified counts+bytes,
  quoted) → delete → update `design-brief/CLEANUP-MANIFEST.md`.
- Close out §8.8: either build the density/compact-list toggle and the search typeahead, or
  carry them forward with the reasons intact.
- Update `docs/NEXT-PLAN.md` "PICK UP HERE" + the batch log in `PLAN-OF-RECORD.md` §6.
- Replace this file with the next session's prompt. Verify `design-brief/` still holds exactly
  three files and say so with a quoted listing.

## DEFINITION OF DONE

1. Hero photograph gone (same commit as its replacement); the live-card hero in; cold-start
   agreement across all FOUR consumers with DESIGN_AUTHORITY updated; headline words intact.
2. Landing composition + header + rail per the kit; `StatsBand` replaced; **ticker honest**.
3. Every inherited value expressed through EXISTING tokens; no second stylesheet (law 82); new
   states are props on existing components.
4. `npm run predeploy` green; laws green; **ratchets not zeroed**.
5. Every push verified live (prod 200, clean boot, screenshot) and every claim in the final
   report backed by quoted output.
6. Batch log complete; this prompt replaced.

## 🔴 IF THE RAILWAY BUILD FAILS AND THE CODE LOOKS FINE — READ THIS FIRST

A build can die with 18 errors reading `Module not found: Can't resolve
'@vercel/turbopack-next/internal/font/google/font'`. **It is not a code error.** Scroll UP to the
warnings: `Received response with status 404 when requesting https://fonts.gstatic.com/…woff2`.
`next/font/google` fetches font files from Google's CDN **at build time**; when they 404 the
build dies. It hit twice on 2026-08-13 — once on Inter, once on JetBrains Mono — including on a
commit that pre-dated all of this session's work, and the same commit built locally with exit 0.

**Retry by re-pushing.** ⛔ Never retry with the Railway MCP `deploy` tool: it uploads a tarball
of the local directory, breaking the git↔deploy link and potentially shipping gitignored files.
Full record + the permanent fix (self-hosting the fonts, which needs Ali's sign-off because it
touches every page's type): `PLAN-OF-RECORD.md` §8.8b.

## TRAPS — every one of these has been paid for

1. PowerShell 5.1 destroys UTF-8 on round-trip — use the editor tools, never
   `Get-Content`/`Out-File` for content.
2. PowerShell variables are case-insensitive — `$p` overwrites `$P` silently.
3. Only depth-0 `:root` is token truth; a brace-blind regex once reported all chat motion as 0ms.
4. **A check that cannot fail is not a check.** `EXIT=$?` after a pipe reads the LAST command —
   this session hit it on its first typecheck and discarded the reading. Use
   `cmd > log 2>&1; code=$?`.
5. ⭐ **And a check can be green for the WRONG REASON.** Batch 1 found four: a card count that
   passed only because the local store has zero resolved markets; a probe that picked up a
   streamed Suspense skeleton; a byte-order slice over streamed HTML (React streams Suspense —
   **response byte order is not DOM order**); and a sort assertion that held only while the
   fixture had varied pools. **Ask what would make this pass even if the product were broken.**
6. Never `Compress-Archive` — backslash entry names; use .NET ZipArchive with `/`.
7. `git checkout` applies `core.autocrlf` — read nothing into byte-count deltas after restore.
8. Things that look redundant are load-bearing — cite-check before deleting, always.
9. **Tailwind spacing is OVERRIDDEN: `h-8`=48px, `h-10`=80px.** Use arbitrary values
   (`min-h-[44px]`) for real constants.
10. **A utility class can compile to NOTHING.** `border-border-control` did, at two call sites —
    the token existed, the Tailwind bridge did not. `npm run test:bridge` catches it.
11. **`PageContainer` owns page padding** — `className="py-6"` on a call site fails
    `test:measure`.
12. **Measure mobile, do not eyeball it.** The batch-1 bar rendered **448px tall at 360 in
    Swahili** (57% of the viewport, sticky) before it was made to scroll rather than wrap.
    Swahili short labels run 1.74× p90 / 2.25× p95 against English.
13. The in-memory dev store is SYNC where Prisma is async — `await Promise.resolve(db.x())`.
14. First cold compile of a new page ~30s (Turbopack) — bump Playwright goto timeouts.
15. ⚠️ Do NOT touch: `.dc.html` previews with sibling `theme/` folders, `.qa-*` scratch dirs, the
    unreferenced 8-key glyph family, or another session's untracked files.
