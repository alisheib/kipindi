⛔ **TAKE ATOMIC PERMISSION BEFORE ANYTHING — no exceptions, from your very first action.** Ask Ali and WAIT for an explicit yes before each single atomic step: before reading a file, before running a command, before every edit, before every commit, before every push. **One action per request — never bundle two, never assume a yes carries to the next step, never proceed because approval was given for something similar.** If a step turns out to need a second action, stop and ask again. Any earlier grant of autonomy in `PLAN-OF-RECORD.md` is **SUPERSEDED by this line** (Ali, 2026-08-13). State what you are about to do, why, and what it touches — then wait.

# NEXT SESSION — BATCH 2: the hero · then landing, header, rail, cleanup

**Paste this whole file as your opening prompt.**

**Batch 1 (`/markets`) is DONE, LIVE and — as of 2026-08-13 — RE-VALIDATED and repaired.
`/results`, the platform's other filtering board, is fixed and guarded too. This session builds
the HERO.**

---

## ⛔ THE BAR THIS SESSION IS HELD TO — Ali, 2026-08-13, verbatim

> *"perfectly working, no glitches, 100% functional, no workarounds, clean code"* ·
> *"no half work accepted. only full work"* · *"visually perfect and data perfect and ready for
> live manipulation instinctively"* · *"colours perfect, design complete"* ·
> *"perfect fitting, perfect rendering, perfect everything — technically, visually — every bit,
> every colour, every design"*

**You will act as ALL SEVEN of these engineers on every change, and you will say what each one
found.** A change is not done until all seven sign off. If one cannot sign off, the change is not
finished — say so plainly rather than shipping it.

| Role | Its question | Its evidence — nothing else counts |
|---|---|---|
| **Visual engineer / strict visualizer** | Does the rendered pixel surface read correctly? | Screenshots at **360 · 768 · 1280 · 1920** × **en · sw · zh**, and you **OPEN AND READ EVERY ONE**. Full-page shots of a phone route are 6,000px tall and unreadable — take **element-clipped** shots of the thing you changed |
| **UI/UX engineer** | Can a player drive it instinctively, first try? | Every control **opened and pressed**, not just rendered. Affordances present: active state, hover, focus-visible, a visible cue that a strip scrolls. Nothing truncated mid-word, nothing colliding |
| **Colour / design engineer** | Is every colour the system's own, and legal? | Tokens only — no literal `oklch()`/hex in a component. `test:contrast` · `test:bridge` · `test:tokens` · `test:design-frozen` green. ⛔ **GOLD IS MONEY AND NOTHING ELSE** and only money that was **earned** — `test:gold-is-money` |
| **Responsiveness engineer** | Does it fit, in every language, on the cheapest phone? | `overflowX === 0` at all four widths × three locales. Tap targets **≥ 44px**. **Measure, never eyeball** — Swahili short labels run 1.74× p90 / 2.25× p95 vs English |
| **Routing engineer** | Are URL, history and deep links honest? | Defaults omitted from the URL · a filter uses `replace` (a filter is not a navigation) · a hand-typed URL renders · junk params fall back · no 500 from any input |
| **Manipulation stress engineer** | What happens when it is abused? | `npm run qa:filter-stress` — 12 hostile payload classes × every param, plus **every** combination of the axes. No 500s, nothing executes |
| **STRICT compliance engineer** | Would this survive a regulator reading it? | **A-5: real data or nothing.** No fabricated figure, ever. Licence/RG copy untouched. Player surfaces never narrate ops detail. `test:integrity` green |

### ⛔ The five rules that override convenience

1. **VERIFIED MEANS EXECUTED.** Run the command, quote the output. A grep is not a behaviour, a
   green gate is not proof, and "it should work" is not a result.
2. **ASK OF EVERY CHECK: would this still pass if the feature were absent?** If yes it is not a
   check. This session found **five** checks that were green for the wrong reason (below).
3. **A CONTROL'S DEFECT CAN LIVE ENTIRELY IN ITS OPEN STATE.** Two menus were 1% usable on a phone
   while every automated check passed and closed-menu screenshots looked perfect. **Open it.**
4. **NEVER `git add -A`.** `main` is shared, and every push is a LIVE deploy to a real-money
   platform. Stage by explicit path, `git branch --show-current` first, `git fetch` and look for a
   second operator's commits before every batch.
5. **DOCS TRAVEL WITH THE CODE, IN THE SAME COMMIT.** `PLAN-OF-RECORD.md` §6 batch log + the
   relevant §8 section. No new tracker files.

---

## ▶ START HERE — a machine that has never run this

1. `cd F:\kipindi-main` (laptop A; the older prompt said `C:\` — it is `F:\` on this machine) ·
   `git fetch origin` · `git status` — you must be on **`main`**, clean.
2. `npm install` · `npx prisma generate`.
3. 🚩 **`.env.qa.local` is gitignored and does NOT travel between machines.** It holds the five QA
   operator passwords. Not needed for the hero or landing (anonymous surfaces); needed for anything
   authed. Ask Ali or copy it from the other machine. ⛔ Never `git clean -x` — it takes that file.
4. There is **no `.env`** on a dev machine and there must not be: with no `DATABASE_URL` the local
   server boots the in-memory store, which is what makes local work zero-risk.

**Boot + seed** (the in-memory store starts EMPTY and is wiped whenever `next dev` restarts on a
file change — re-seed freely, it is instant):

```
SESSION_SECRET=qa_local_session_secret_at_least_32_chars_long OTP_PEPPER=qa_local_otp_pepper_16plus npx next dev -p 3009
curl -s -X POST http://localhost:3009/api/dev-test/seed-real-markets
curl -s -X POST http://localhost:3009/api/dev-test/seed-markets            # → ~44 live markets
curl -s -X POST http://localhost:3009/api/dev-test/resolve-seed-markets    # settled rows, for the settled strip
```
⚠️ A dev server booted **while `prisma generate` was running** served 404 on every `/api/*` route
while rendering pages normally. A clean restart fixes it. Not a product defect.

**The instruments. They run read-only against local OR production — use them, and add to them.**

| Command | What it proves |
|---|---|
| `npm run qa:discovery-probe -- <url>` | every /markets control's promised count equals what pressing it delivers, incl. cross-filtering · URL hygiene · sorting reorders · empty-state exits are non-empty |
| `npm run qa:discovery-board -- <url>` | the GRID draws a page of that set, counted in a real browser DOM · the mobile bar height in **real** sw/zh · ⭐ that **every menu actually OPENS** (≥90% of its panel visible at 360) |
| `npm run qa:results-board -- <url>` | /results' rail: promise == delivery per category with and without a search · a search may only ever NARROW · a no-match query zeroes every count · a zero-count control offers a real exit |
| `npm run qa:filter-stress -- <url>` | 12 hostile payload classes × every param of both boards · **all 288** status×sort×odds×pool combinations · idempotency |
| `LOCALES=en,sw,zh npm run qa:discovery-shots -- .qa-design-round2/<dir> <url>` | 84 frames at 360/768/1280/1920 × en/sw/zh. Fails on horizontal overflow, on a sub-40px tap target, on a clipped node — **and on measuring nothing** |
| `npm run test:discovery-contract` · `npm run red:discovery-contract` | the /markets filter contract, and 7 real defects it catches |
| `npm run test:board-discovery` · `npm run red:board-discovery` | the landing-board invariants, and 6 defects |
| `npm run red:results-filter -- <url>` | that `qa:results-board` catches the defect production actually shipped |

⛔ **Screenshots are EVIDENCE: write them under `.qa-design-*/` (gitignored), never into the tree**
(DESIGN_AUTHORITY §0b). The *drivers* travel; the *evidence* is re-derived.

**Two shared modules — read them before writing any new driver:**

| Module | The rule it owns, once |
|---|---|
| `scripts/qa-locale.mjs` | **`kp-locale` is the ONLY cookie that changes the language.** `localisedContext()` sets it on the context so it is present on the FIRST request, and `assertLang()` reads `<html lang>` back and **throws** on a mismatch |
| `scripts/red-anchor.mjs` | A RED harness's anchors are matched in the FILE's line-ending convention, and an anchor matching twice is refused |

## Read, in order, before touching anything

1. `CLAUDE.md` — the mechanics + the ACTIVE-WORK banner.
2. `.claude/skills/50pick-standards/SKILL.md` — the always-on standards. ⚠️ Its §3 still points the
   design system at `docs/design-system/README.md`; **the door is `docs/DESIGN_AUTHORITY.md`** and
   `test:design-one-door` is the guard. Fix that line while you are in there.
3. `docs/DESIGN_AUTHORITY.md` §0 — the filing law. Values live in `globals.css`/`motion.css`, never
   in docs.
4. **`design-brief/PLAN-OF-RECORD.md` §8 — THE PLAN.** §8.1/§8.2 the two pinned definitions · §8.4
   the eleven kit contradictions and how each was resolved · §8.6 the gate risk register · §8.7a
   what batch 1 measured on production · §8.7b what it found · **§8.7c what re-validating it found**
   · **§8.7d /results** · §8.8 what is deferred. **§7b is the implementation dossier for the hero
   and landing** — file:line anchors measured 2026-08-12; re-verify anything a later commit moved.
5. `docs/design-system/v3-2026-08-11-landing-discovery/ACCEPTANCE.md` — INHERIT/IGNORE per file.
6. The kit: `START-HERE.md` → `README.md` → `SPEC.md` → `COMPONENTS.md`; open
   `prototype/50pick Discovery Prototype.dc.html` in a browser.
7. `docs/design-brief/handover-2026-08/LAWS.md` — 85 invariants + 4 licence conditions.

---

## WHAT IS ALREADY SETTLED — do not re-derive, do not re-open

- **`Open` = LIVE and still taking bets · `All` = the unsettled book (LIVE ∪ CLOSED).** Both pinned
  on production measurement. RESOLVED/VOIDED stay at `/results`.
- **Every count on both boards is cross-filtered** — the number beside a control is what pressing it
  delivers, asserted control-by-control against the running site.
- **`src/lib/markets/discovery.ts`** is the ONE definition of /markets parsing, defaults, the href
  builder, status predicates, odds/pool buckets, sorts + tie-breakers, counts and relaxations. Pure:
  no server imports.
- **`src/lib/markets/category-label.ts`** is the ONE label map; ids come from `MARKET_CATEGORIES`
  (**seven** — politics is licence-excluded). ⛔ Never re-declare a category list. ⚠️ Five admin
  files still do; that is recorded, not yours unless you are in them.
- **`test:board-discovery` was rewritten onto behavioural assertions.** Its old anchors
  (`DEFAULT_WHEN`, `WHEN_CUTOFFS`, `sp.when`) are gone from the product **deliberately — do not
  restore them.**
- The four `--rh-*` rhythm tokens exist once in `globals.css`. ⚠️ A section's OBSERVED gap is the sum
  of the two paddings meeting at it — do not ALSO write a margin or you double-count.
- **`.kp-strip-fade`** is how a horizontally scrolling strip says "there is more this way". It is a
  mask, so it costs no colour. ⛔ It also clips an absolutely-positioned panel — never put a
  `<details>` menu inside a faded or scrolling strip (see the trap list).

---

## BATCH 2 — THE HERO (kit README §1a; dossier §7b)

- `--hero-grad-warm` surface + brand-mark backdrop (`rotate(-14deg)`, `--hero-mark-opacity`,
  **never recoloured**). ⭐ Both tokens already exist in `globals.css` with **zero consumers** —
  they were provisioned for exactly this.
- Eyebrow · headline **"The wisdom of YES & NO."** — ⚠️ **already live** and hardcoded English JSX at
  `src/app/page.tsx:134-152`; the words stay verbatim in all locales, but move them to dict keys so
  the string has ONE home (identical en/sw/zh values) · proof rail (**REAL figures only**) ·
  aggregate conviction bar (`Σ yesPool / Σ pool`, computed server-side, **never an average of
  per-market percentages**, gated on `Σ pool > 0`) · the question board (4-col grid of real open
  markets, closing soonest) · hero foot with lede + 2 CTAs + one live `<MarketCard/>`.
- ⛔ **`public/hero/hero-bg.webp` and its `page.tsx:80` reference are removed in the SAME commit the
  replacement lands.** Replace, then delete — never before.
- The hero is the **FOURTH** consumer of the cold-start rule — update
  `docs/DESIGN_AUTHORITY.md:494-498` from three consumers to four **in the same commit**.
- **Licence condition 1:** below `Σ pool > 0` the bar shows the dashed empty vocabulary
  (`--bar-empty-track`), **never 50%**. `impliedYesPct` returns a hardcoded **50** on an empty pool
  (`market-service.ts:232-236`). Batch 1 hit this exact trap in the odds buckets and had to exclude
  `pool === 0` from every bucket. **The hero must not re-buy it.**

## BATCH 3 — landing composition + header + rail (kit README §1b–1i, §2)

Section order + rhythm (144 · 96 · 96 · 144, from padding pairs) · how-it-works band (heading + lede
read `t.primer.card1Title/Body`; **also fix `first-visit-primer.tsx` to read the dict** — it
duplicates that copy inline today) · pick-a-side grid · topic tiles with real per-topic count+pool
folded from the ONE board read · Up&Down band · trust band (M-Pesa via `PaymentLogo`, white tile,
**never inline the SVG**) · settled strip (re-sort by `settledAt` DESC; amount = pool − fee via
`payout.ts` + the frozen `feeSnapshot`, `formatTzs`; **gold is correct here — earned money**) · RG
line above the footer · footer unchanged. `StatsBand` (the zero-counters) is **deleted**.

Header: opaque `--panel` at every scroll position + `--shadow-2` scrolled; three-tier nav; ONE
active treatment (`--pill-active`); Sign in (ghost) + Sign up (pill) at every width; the 44×44
`EN ⌄` listbox (options DIRECT children); skip link. ⚠️ Must hold `Jedwali la Washindi` through the
**1024–1279** band, which has overflowed before. ⚠️ **The dossier claims the header has no auth
buttons today — that is STALE; they are already there at ≥640.** Verify against the code.

Bottom rail: 5 slots `Markets · Up & Down · Live · Results · More`, `--pill-active` (kill the aqua
literals), auth NOT in the rail, More carries Positions/Wallet/Top/Invite when authed.

🔴 **The ticker's feed is FABRICATED** (`src/lib/server/ticker-feed.ts` — a hardcoded 12-item
synthetic array, on every page of a licensed real-money product). ⭐ **Confirmed visually
2026-08-13: in Chinese it renders Chinese connectives wrapping ENGLISH market titles, and its first
item is clipped at the left edge in every locale.** Wire it to real events (recent `settledAt`
settlements + recent opens) **or render nothing**. A-5: nothing over a guess. This is the batch's one
product-honesty fix and the compliance engineer owns it.

Entry motion LAST: 550ms budget, existing `--t-*`/`--m-*`, IO reveal (precedent `pulse-grid.tsx:83`),
`.js` progressive class, all THREE reduced-motion gates. ⚠️ `animation-delay` IS clamped under
reduced motion (`motion.css` ATOM A) — a delayed `both`-fill keyframe blanks content for its whole
delay.

## BATCH 4 — cleanup + handoff

Cite-check → archive to `F:\50pick-design-archive\2026-08-12-final\` (verified counts+bytes, quoted)
→ delete → update `design-brief/CLEANUP-MANIFEST.md`. Close out §8.8: build the density/compact-list
toggle, the search typeahead and **the mobile filter sheet**, or carry them forward with the reasons
intact. Update `docs/NEXT-PLAN.md` + the §6 batch log. Replace this file with the next prompt, and
verify `design-brief/` still holds exactly three files with a quoted listing.

## DEFINITION OF DONE

1. Hero photograph gone in the same commit as its replacement; the live-card hero in; cold-start
   agreement across all FOUR consumers with DESIGN_AUTHORITY updated; headline words intact.
2. Landing composition + header + rail per the kit; `StatsBand` replaced; **ticker honest**.
3. Every inherited value through EXISTING tokens; no second stylesheet (law 82); new states are
   props on existing components.
4. `npm run predeploy` green; laws green; **ratchets not zeroed** — an allowlist may only SHRINK.
5. All seven roles signed off, each with quoted evidence. Every push verified live: prod 200, clean
   boot, and a screenshot **you looked at**.
6. §6 batch log complete; this prompt replaced.

---

## 🔴 IF THE RAILWAY BUILD FAILS AND THE CODE LOOKS FINE — READ THIS FIRST

A build can die with 18 errors reading `Module not found: Can't resolve
'@vercel/turbopack-next/internal/font/google/font'`. **It is not a code error.** Scroll UP to the
warnings: `Received response with status 404 when requesting https://fonts.gstatic.com/…woff2`.
`next/font/google` fetches font files from Google's CDN **at build time**; when they 404 the build
dies. It hit twice on 2026-08-13 — once on Inter, once on JetBrains Mono — including on a commit
that pre-dated all of the design work, and the same commit built locally with exit 0.

**Retry by re-pushing.** ⛔ Never retry with the Railway MCP `deploy` tool: it uploads a tarball of
the local directory, breaking the git↔deploy link and potentially shipping gitignored files. The
permanent fix (self-hosting the three families, which needs Ali's sign-off because it touches every
page's type) is in `PLAN-OF-RECORD.md` §8.8b.

⚠️ Two harmless pre-existing build **warnings** are not yours: `node:crypto` in the Edge Runtime via
`lock-key.ts` / `audit.ts`. The build still exits 0 and says "Compiled successfully".

---

## TRAPS — every one of these has been paid for

1. **A CONTROL THAT RENDERS IS NOT A CONTROL THAT WORKS.** The sort and topic menus were **4px of a
   274px and a 362px panel — 1%** — at 360px, because a `<details>` panel is absolutely positioned
   and they sat inside a row that scrolls horizontally: **CSS coerces `overflow-y: visible` to
   `auto` as soon as one axis scrolls.** Zero of six sort options and zero of eight topics were
   reachable. No horizontal overflow, every tap target 44px, nothing overflowing its own box, and a
   closed-menu screenshot looks perfect. **OPEN EVERY CONTROL YOU BUILD.**
2. **A box cannot both scroll on one axis and let a child escape on the other.** No property fixes
   it. Move the child out, or change the presentation.
3. **flex-wrap breaks a line BEFORE it shrinks** — so two controls that "should" share a line land
   on separate ones. A one-column grid stacks in DOM order with no reordering; grid placement is
   independent of source order when you need to defy it.
4. **An edge bleed (`-mx-3 px-3`) costs more than it buys.** It ate the gap before the result count,
   so a clipped chip and the count read as one broken word (`Mpymasoko 40`), and it made a row
   overflow its own container by 16px. The vestigial `-mx-1 px-1 overflow-x-auto` on `flex-wrap`
   rails did the same for 4px. Use `.kp-strip-fade`.
5. **PowerShell 5.1 destroys UTF-8 on round-trip** — use the editor tools, never
   `Get-Content`/`Out-File` for content. PowerShell variables are case-insensitive: `$p` overwrites
   `$P` silently.
6. **A check that cannot fail is not a check.** `EXIT=$?` after a pipe reads the LAST command. Use
   `cmd > log 2>&1; code=$?`.
7. ⭐ **AND A CHECK CAN BE GREEN — OR RED — FOR THE WRONG REASON. Nine were, across two sessions.**
   Batch 1: a card count that passed only because the local store has zero resolved markets; a probe
   that picked up a streamed Suspense skeleton; a byte-order slice over streamed HTML (**React
   streams Suspense — response byte order is not DOM order**); a sort assertion that held only while
   the fixture had varied pools. The validation pass: a `\n` anchor that cannot match a **CRLF**
   checkout (`core.autocrlf=true`, no `.gitattributes`); the cookies `locale`/`NEXT_LOCALE`, which
   the product does not read, so **8 of 12 "trilingual" frames were English**; a `predeploy` gate
   flaking **7.5%** on a random mock scenario; `typeof x === "string"` passing on `""`; a counter
   that counted the grid heading and missed a featured `<h2>`; an assertion that a search *must*
   change the counts, which **demands a false statement**; a page-wide card count that swallowed
   /markets' resolved strip; a sweep that **measured nothing and printed a result**; and a RED
   harness keyed to another file's exact prose. **Ask what would make this pass even if the product
   were broken — and what would make it fail even if the product were fine.**
8. **A RED proof for the WRONG reason is not a proof.** `qa:results-board` goes red against
   production — because production predates its `data-chip` attributes and it correctly refuses on
   an absent premise. That is not evidence it catches the defect. `red:results-filter` reintroduces
   the real line and asserts the failure lands on the right assertion.
9. Never `Compress-Archive` — backslash entry names; use .NET ZipArchive with `/`.
10. `git checkout` applies `core.autocrlf` — read nothing into byte-count deltas after a restore.
11. Things that look redundant are load-bearing — cite-check before deleting, always.
12. **Tailwind spacing is OVERRIDDEN: `h-8`=48px, `h-10`=80px, `px-3`=16px, `gap-x-2`=12px.** Use
    arbitrary values (`min-h-[44px]`) for real constants.
13. **A utility class can compile to NOTHING.** `border-border-control` did, at two call sites — the
    token existed, the Tailwind bridge did not. `npm run test:bridge` catches it.
14. **`PageContainer` owns page padding** — `className="py-6"` on a call site fails `test:measure`.
15. **Measure mobile, do not eyeball it.** The batch-1 bar rendered **448px tall at 360 in Swahili**
    (57% of the viewport, sticky). It is 220px now, with every control readable and operable.
16. The in-memory dev store is SYNC where Prisma is async — `await Promise.resolve(db.x())`.
17. First cold compile of a new page ~30s (Turbopack) — bump Playwright goto timeouts.
18. **A bare `/* */` is valid between JSX ATTRIBUTES but NOT between children** — children need
    `{/* */}`. Getting it wrong reports parse errors on lines you never touched.
19. ⚠️ Do NOT touch: `.dc.html` previews with sibling `theme/` folders, `.qa-*` scratch dirs, the
    unreferenced 8-key glyph family, or another session's untracked files (there is one right now:
    `scripts/live/ops/house-money-census.cjs`).

---

## STATE AT HANDOFF — 2026-08-13, measured not assumed

| | |
|---|---|
| `main` | `e5535da4`, pushed, deploy **SUCCESS**, prod 200, `/api/health` `ok:true` |
| Live data | 45 live markets · 1,963 resolved · 73 users |
| `/markets` mobile bar | **220px** at 360 in all three locales (was 116px with two dead controls) · 168px desktop, 116px in zh |
| Menus at 360 | sort **274/274px**, topic **362/362px** — 100% |
| `/results` rail | 10 controls · **48px** tap targets · 0 clipped · counts cross-filtered |
| Guards, all green against production | `qa:discovery-probe` 32 · `qa:discovery-board` 10 · `qa:results-board` **99** · `qa:filter-stress` 28 (incl. **288** combinations) |
| Visual | **84 frames** at 360/768/1280/1920 × en/sw/zh against production: overflowX 0, tap targets ≥44px, 0 clipped, no console errors |
| Gates | 22 run individually with real exit codes, all green · both RED harnesses 7/7 and 6/6 · `red:results-filter` green · tsc 0 · build 0 |
