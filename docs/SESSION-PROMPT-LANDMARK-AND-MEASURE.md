# SESSION PROMPT — one `<main>` per page, and the B7 migration that finishes with it

> ## ✅ SPENT — DONE 2026-08-22 (session 57). Kept as the reasoning, not as work.
>
> The record is **`E-185`** and **`E-186`** in [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) §6,
> and the handoff at the top of its §6b. The law it produced is **`DESIGN_AUTHORITY` B7
> rule 5**. Every item in §8's definition of done is closed:
>
> | §8 asked for | outcome |
> |---|---|
> | `PageContainer` cannot render a `<main>`; `tsc` proves the call sites | ✅ `"main"` removed from the `as` union — `tsc`: *Type '"main"' is not assignable to type '"div" \| "section" \| "article"'* |
> | The behavioural guard reports exactly one `<main>`, `#main-content`, everywhere — **and was observed RED first** | ✅ RED on **production**, 17/17 player routes, *before* a single page was migrated → after: `responsive-audit` **4,992 passed, 0 landmark failures** |
> | Raw `<main` under `src/app` is 0, or ratcheted with the remainder named | ✅ **0**, with two exemptions pinned in the gate (`app-shell.tsx`, `global-error.tsx` — the latter has no shell above it) |
> | `test:measure`'s ratchet has fallen, new number pasted in | ✅ **59 → 12**, each survivor named with its reason |
> | Full `test:all` green, build compiles, pushed, guard re-run against production | ✅ **241/242**, build clean, pushed, re-verified on production. ⚠️ **CORRECTED 2026-08-23 — an earlier draft of this row, and `E-185`'s evidence, said "242/242". That figure was never observed.** The measured run is **241/242**, the single failure being `test:responsive`: within it, **4,992 passed · 63 failed**, and every one of the 63 is `no clipped controls` on the signed-out **Sign up** button at 320px, which reproduces byte-identically on production (`l239 r337>vw320`). **Zero landmark failures.** The overstatement came from reading a partial run and assuming the fix that followed closed the gap — the exact habit this file's §5 exists to prevent. |
> | A register row and a §6b handoff in the same pass | ✅ `E-185` + `E-186`, handoff is the topmost `RESUME AT` |
>
> ⭐ **What §9's estimate got wrong, for whoever writes the next one of these.** It budgeted
> the sweep as the bulk and the guards as "under an hour". The sweep *was* mechanical — 33 of
> the 44 files fell to one codemod. **The time went into two things this document could not
> have known**: `PageLoader` turned out to be a 16-route population living outside `src/app`
> that no grep in §1 could see, and **two of the guards being ratcheted were themselves
> asserting less than they claimed** (`E-186`). §5's instruction to red-prove every guard is
> what found both — and one of them was found by a mutation that **MISSED**, not by one that
> caught. ⛔ The three rejected alternatives in §4 were all correctly rejected; the mechanical
> `<main>`→`<div>` sweep would have left 44 hand-typed widths, both blind guards, and the
> `PageLoader` population entirely untouched.
>
> ⚠️ **Two things it asked for were deliberately NOT done, and both are recorded rather than
> quietly absorbed:** the 12 remaining ratchet files are blocked on **padding, not width**
> (changing it is a design decision — §4.2's own rule), and the **22 other scripts carrying
> the blind `decomment` copy** are filed at the constant instead of half-fixed. ⚠️ **That
> figure was first written as 18** — a name-based `grep decomment` undercounts, because
> several suites spell the helper differently or inline it. Count the ORDERING, not the name.

> **Written 2026-08-22 (session 56)** by the session that found it, for the session that fixes it.
> ⛔ Read this whole file before opening a component. The work looks like a find-and-replace
> and is not one — the interesting half is that two separate backlogs turn out to be the same
> backlog, and doing them together is cheaper than doing either alone.

---

## 0 · The one-line brief

**Every player page renders a `<main>` inside the app shell's `<main id="main-content">`.**
Nested `main` is invalid HTML, it gives a screen reader two "main content" landmarks to
choose between, and the skip-link points at the outer one. ⭐ **And the same 44 files are the
ones still hand-typing their own width instead of using `<PageContainer tier>`, which
`DESIGN_AUTHORITY` **B7** already requires** — so the landmark fix and the last of the B7
migration are one job.

---

## 1 · What was measured, not inferred

Measured on production 2026-08-22, signed in, at 1280:

| route | `<main>` elements | nested |
|---|---|---|
| `/` | 1 | 0 |
| `/updown` | 1 | 0 |
| `/markets` | **2** | **1** |
| `/notifications` | **2** | **1** |
| `/results` | **2** | **1** |
| `/wallet` | **2** | **1** |
| `/profile` | **2** | **1** |
| `/legal/privacy` | **2** | **1** |

**Six of eight sampled routes.** Static counts in the repo:

- `src/components/layout/app-shell.tsx:165` renders `<main id="main-content">`
  **unconditionally**, and `AppShell` is mounted in the ROOT layout
  (`src/app/layout.tsx:153`), so **every** route inherits it — admin, auth and legal included.
- **44** files under `src/app` contain a raw `<main`.
- **6** files use `<PageContainer>`, whose `as` prop defaults to `"main"`.

So there is no route where a page-level `<main>` is the only one. Every single one is nested.

---

## 2 · Why this is worth a session, stated honestly

It is **not** a rendering bug — nothing looks wrong, and no player has been harmed by it.
It is worth doing for three reasons, in descending order of weight:

1. **Assistive technology.** Landmark navigation is how a screen-reader user skips the
   chrome. Two `main` landmarks make "go to main content" ambiguous, and the skip-link
   (`#main-content`) resolves to the outer one while the page's real content begins inside the
   inner one. This platform already cites WCAG in its own components (`ScrollX` names 2.1.1),
   so the standard is one the codebase has already adopted.
2. **It is a licensing surface.** 50pick is a GBT-licensed operator. An accessibility audit
   runs axe or similar; `landmark-no-duplicate-main` and `landmark-main-is-top-level` are
   default rules and both fire here. Better to have fixed it than to explain it.
3. ⭐ **It is the same work as finishing B7**, which is the part that makes this cheap. See §3.

⚠️ **What it is NOT.** Do not describe this as a defect that "broke" anything, and do not
file it as a bug against the notifications work that surfaced it — it predates that work by
the entire life of the shell, and `/markets` has the identical shape.

---

## 3 · ⭐ The insight that makes this one job instead of two

`DESIGN_AUTHORITY` **B7** says, in as many words: *"A page states its width through
`<PageContainer tier>` and nothing else."* Its enforcement (`npm run test:measure`) carries a
ratchet of hand-typed widths that **may only shrink**.

Those 44 raw `<main className="mx-auto max-w-[…] px-3 lg:px-6 py-6">` blocks are **exactly**
the population B7 is still trying to migrate. Each one is simultaneously:

- the nested landmark this prompt is about, **and**
- a hand-typed width B7 wants deleted, **and**
- a page whose `loading.tsx` tier parity nothing can check while the width is a literal.

**So migrating a page to `<PageContainer tier>` fixes all three at once**, and the ratchet
number falling is the proof it happened. ⛔ Do NOT do a mechanical `<main>` → `<div>` sweep:
it fixes the smallest of the three problems and burns the opportunity to fix the other two.

---

## 4 · The decision, and the alternatives rejected

**Do this:**

1. **`PageContainer` stops being able to render `<main>` at all.** Remove `"main"` from the
   `as` union in `src/components/layout/page-container.tsx` and default to `"div"`.
   ⭐ Make it a **compile error**, not a default — this file already argues that an invented
   tier should be a compile error, and the same logic applies: the shell owns the landmark, so
   a page asking for one is always wrong. That single change fixes the 6 existing call sites.
2. **Migrate the 44 raw-`<main>` pages to `<PageContainer tier=…>`**, in batches by tier, each
   batch verified. The tier is whatever width the page hand-types today — `reading` (1080) for
   detail/content/profile, `board` for card grids, `form`, `receipt`. ⛔ Do not change any
   page's *rendered* width in this pass; if a page's literal does not match its tier's token,
   **record it and leave it**, because a width change is a design decision and this is not a
   design session.
3. **Guard it**, three ways — see §5.

**Rejected, with reasons:**

| Alternative | Why not |
|---|---|
| Fix only the pages I touched | Leaves 44 broken, makes the fixed page the odd one out, and guarantees the next new page repeats it. This is what session 56 deliberately did NOT do. |
| Mechanical `<main>` → `<div>` sweep | Cheapest and worst: fixes the landmark, leaves 44 hand-typed widths, and spends the one pass anyone will ever make over these files. |
| Remove the shell's `<main>` instead | The shell's is the CORRECT one — it is the skip-link target and it is outermost. Removing it would leave pages that have no landmark at all. |
| Leave it | Defensible only until someone runs an accessibility audit. |

---

## 5 · The guards to add — because a sweep without one comes back

1. **Static, in `test:measure`** (it already owns B7): *no file under `src/app` contains a raw
   `<main`*. Ratchet it if 44 cannot go to 0 in one session; the number may only shrink.
2. **Structural, in `page-container.tsx`**: with `"main"` gone from the union, `tsc` is the
   guard for the 6 call sites and no test is needed.
3. ⭐ **Behavioural, in `scripts/responsive-audit.mjs`** — the one that matters, because the
   first two read source and this reads the DOM: **exactly one `<main>` per rendered route,
   and it is `#main-content`**. That audit already walks every route at several widths, so
   this is a few lines inside an existing loop.

⛔ **Every guard ships with a red proof.** Reintroduce a nested `<main>` on one page in a
scratch copy and watch each of the three go red. A guard nobody has seen fail is a guard that
may be asserting nothing — this repo has shipped that mistake repeatedly, four times in
session 55 alone.

---

## 6 · Order of work

1. Read `DESIGN_AUTHORITY` **B7** in full, and `page-container.tsx`'s header.
2. Change `PageContainer` (§4.1). `tsc`, then run `test:measure` — the 6 call sites are done.
3. Add the behavioural guard (§5.3) **first, before the sweep**, so the sweep has a live
   instrument telling it what is left. It should be RED on ~6 of 8 routes on day one; that
   red is your baseline and your progress bar.
4. Sweep in batches by tier. After each batch: `tsc`, `test:measure`, `test:all`.
5. Add the static guard (§5.1) once the count is low enough to ratchet honestly.
6. Full gate, production build, push, and re-run the behavioural guard on production.

---

## 7 · Traps this repo has already paid for

- ⛔ **`theme.extend.spacing` is OVERRIDDEN.** `h-7` renders **40px**, not 28. Any page you
  touch that uses numeric size utilities is a `test:ui-consistency` drift; write px literals.
- ⛔ **The type scale is closed.** `test:type-scale`'s two ratchets are AT their floor and may
  only shrink — a migrated page must not introduce `text-[Npx]` or `tracking-[…]`.
- ⛔ **A page and its `loading.tsx` must state the SAME tier** (B7 rule 3). Migrating a page
  without its skeleton produces a width jump on every load that no test could see before.
- ⛔ **Never rewrite a doc with a Python read-modify-write** (`E-181`: it truncated a 1.3 MB
  tracker to 0 bytes) and **never `errors="surrogatepass"` on the way out** (`E-184`: a Python
  `"🔴"` is two lone surrogates; it wrote CESU-8 into a `.tsx` and only the Railway build
  caught it). `npm run test:encoding` now catches both — run it before you push.
- ⛔ **Re-run `npm run build` AFTER your last edit**, not before. E-184 shipped because the
  build was green before the edit that broke it.
- ⚠️ **`/legal` and `/admin` have their own layouts but still sit inside the root `AppShell`.**
  Do not assume a nested layout means a separate document.

---

## 8 · Definition of done

- `PageContainer` cannot render a `<main>`; `tsc` proves the 6 call sites.
- The behavioural guard reports **exactly one `<main>`, `#main-content`, on every audited
  route at every audited width** — and has been observed RED before the fix.
- Raw `<main` under `src/app` is 0, or ratcheted with the remaining files named.
- `test:measure`'s hand-typed-width ratchet has **fallen**, and the new number is pasted in.
- Full `test:all` green, production build compiles, pushed, and the guard re-run against
  production rather than localhost.
- A register row in [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) and a handoff at the top of
  its §6b, in the same pass as the code.

---

## 9 · Estimate, honestly

The `PageContainer` change and the behavioural guard are **under an hour**. The 44-file sweep
is the bulk and is mechanical *per file* but needs a look at each rendered page, so budget a
session for it and do not rush the last batch — the pages left until the end are the odd ones
(auth, legal, admin) where the assumption "the shell provides the landmark" is most worth
re-checking rather than trusting this document.
