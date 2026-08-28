/**
 * THE ANCHORS `red:search-adoption` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` must answer *"does every anchor still resolve, exactly
 * once?"* WITHOUT executing a harness that rewrites real source. One definition, imported
 * by both. ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * §6 of `search-adoption.test.mts` was added for S-06 (scan #1, 2026-08-28): `/admin/candidates`
 * mounted a url-mode <SearchBox/>, which owns `?q`, AND kept a second copy of that value in a
 * `useState` behind a primary "Search" button. The second copy was written by exactly one thing
 * — the Clear handler, setting it to "". So the button was inert on load, and DESTRUCTIVE after
 * a Clear: type a query, click the biggest affordance on the rail, and `push({ q: "" })` wiped it.
 *
 * ⭐ 1 AND 2 ARE THE REGRESSION ITSELF, through its TWO detection paths. The rail binds the param
 * to a name first (`const currentSearch = searchParams.get("q") ?? ""`) and seeds state from the
 * NAME, so a guard that only looks for `useState(searchParams.get(…))` would have walked past the
 * live defect. Case 1 is the aliased form that actually shipped; case 2 is the direct form. Both
 * must be caught, or the guard is one refactor away from blind.
 *
 * ⭐ 3 IS THE POSITIVE CONTROL, and it is the one most worth having. Everything §6 asserts hangs
 * off one `<SearchBox …/>` matcher. If that matcher stops matching, `urlModeBoxes` falls to zero
 * and the ownership check passes over an EMPTY SET — reporting "I found nothing to look at" in
 * exactly the same words as "I looked and it was fine". §5 of the same suite already paid for
 * this once (hence its `[^<]` and not `[\s\S]`). Case 3 blinds the matcher and asserts the suite
 * says so instead of passing.
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree), and no replacement CONTAINS its own anchor — which is why
 * cases 1 and 2 rewrite the `hasFilters` line rather than inserting above it.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const CANDIDATES = "src/app/admin/candidates/candidate-filters.tsx";
const POLLS = "src/app/admin/ai-polls/poll-filters.tsx";
const SUITE = "scripts/search-adoption.test.mts";

const OWNERSHIP = "no file keeps a React copy of a param its url-mode SearchBox already owns";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "the-second-owner-returns-by-alias",
    why: "⭐ THE REGRESSION, IN THE FORM THAT SHIPPED: a useState seeded from the NAME bound to searchParams.get(\"q\"), beside a url-mode <SearchBox/> that already owns ?q. This is the state that made the dead Search button possible — inert on load, destructive after a Clear",
    file: CANDIDATES,
    suite: "search-adoption",
    from: `  const hasFilters = currentSearch || currentState || currentCategory || currentDate;`,
    to: `  const [search] = useState(currentSearch);\n  const hasFilters = search || currentState || currentCategory || currentDate;`,
    expect: OWNERSHIP,
  },
  {
    name: "the-second-owner-returns-directly",
    why: "The same defect written without the intermediate name. A guard that only resolved aliases would miss this, and a guard that only matched the literal searchParams.get(…) call would have missed the one that actually shipped. Both paths are asserted so neither can rot",
    file: POLLS,
    suite: "search-adoption",
    from: `  const hasFilters = currentSearch || currentState || currentCategory || currentDate;`,
    to: `  const [search] = useState(searchParams.get("q") ?? "");\n  const hasFilters = search || currentState || currentCategory || currentDate;`,
    expect: OWNERSHIP,
  },
  {
    name: "the-matcher-goes-blind",
    why: "⭐ THE POSITIVE CONTROL. Skip every parsed element and `urlModeBoxes` falls to 0, so the ownership check above reports on an empty set. A guard whose silence means \"I could not see\" must not be rendered identically to \"I looked and it was fine\" — that is the shape this repo has paid for four times (E-108). The reconciliation must go RED here, not the ownership rule",
    file: SUITE,
    suite: "search-adoption",
    from: String.raw`    if (/\bmode=\{?"controlled"/.test(el)) continue; // client-only filter — owns no param`,
    to: `    if (true) continue; // client-only filter — owns no param`,
    expect: "the url-mode SearchBox matcher found something at all",
  },
];
