/**
 * `npm run test:route-census` — CAN A CLIENT-FACING ROUTE SHIP WITH NO RULING?
 *
 * 🔴 THE CENSUS SECTION IT GUARDS ALREADY GOT ITS OWN POPULATION WRONG ONCE, and said so: §4's
 * first draft claimed *"all 50"* and running the instrument returned **51**. The doc had been
 * wrong about the number of routes it was describing from the moment it was written. ⛔ A census
 * that cannot count is not a census, and a campaign that believes one has covered something it
 * never looked at.
 *
 * ⭐ SO THE ARITHMETIC BECOMES A GATE. Every non-admin, non-api `page.tsx` on disk must appear in
 * §4 of `docs/PLAYER-QUERY-CAMPAIGN.md`, and every route §4 names must exist on disk. Both
 * directions, because each catches a different rot:
 *   · a route on disk and not in §4 shipped WITHOUT A RULING — nobody decided what it needs;
 *   · a route in §4 and not on disk is a doc describing a page that has moved or gone, which is
 *     the "doc that hands out a file nobody can follow" failure `test:docs` exists for, one level
 *     up.
 *
 * ⛔ THE POPULATION IS GLOBBED, NEVER TYPED. That is the whole design — §6's words: *"a new
 * client-facing route cannot ship without a ruling."* A hand-typed list here would be a copy of
 * the filesystem that agrees with it today, and this repo has a measured case of exactly that
 * costing a whole product line: `/updown` and `/updown/history` were absent from
 * `responsive-audit.mjs`' hand-typed PLAYER list and went unaudited at every width until E-196.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

/* ── the population, from disk ───────────────────────────────────────────────────────────── */

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e === "page.tsx") out.push(p);
  }
  return out;
}

/**
 * `src/app/wallet/deposit/page.tsx` → `/wallet/deposit`; `src/app/page.tsx` → `/`.
 * ⚠️ Route GROUPS (`(marketing)`) and parallel segments are stripped, because they are a file
 * layout and not a URL — a census keyed on them would name paths no player can type.
 */
function routeOf(file: string): string {
  // ⚠️ `\/?page\.tsx$` — WITH the slash optional. The root is `src/app/page.tsx`, which has no
  //    leading slash to strip, and a pattern that required one left the literal route "/page.tsx"
  //    in the population. Caught on this gate's first run, by the gate.
  const rel = relative(join(ROOT, "src/app"), file).replace(/\\/g, "/").replace(/\/?page\.tsx$/, "");
  const segs = rel.split("/").filter((s) => s.length > 0 && !/^\(.*\)$/.test(s) && !s.startsWith("@"));
  return "/" + segs.join("/");
}

const files = walk(join(ROOT, "src/app"))
  .map((f) => f.replace(/\\/g, "/"))
  .filter((f) => !f.includes("/app/admin/") && !f.includes("/app/api/"));
const routes = [...new Set(files.map(routeOf))].sort();

/* ── the rulings, from §4 ────────────────────────────────────────────────────────────────── */

const DOC = "docs/PLAYER-QUERY-CAMPAIGN.md";
const md = readFileSync(join(ROOT, DOC), "utf8");
const censusStart = md.indexOf("## §4 — THE CENSUS");
const censusEnd = md.indexOf("## §5 —");
const census = censusStart >= 0 && censusEnd > censusStart ? md.slice(censusStart, censusEnd) : "";

/**
 * ⛔ ROUTES ARE READ OUT OF BACKTICKED SPANS, not out of the prose. §4 is a document written for a
 * person: it contains sentences about `/markets` and about `page.tsx`, and a scan that matched
 * bare slashes would harvest half of them. A backticked token that starts with `/` is how this
 * document names a route, consistently, in every bucket and every table row.
 *
 * ⚠️ `/markets/[id]` IS NAMED WITH ITS SEGMENT and so are the other dynamic routes, so the two
 * sides compare like with like — no normalisation, which would be a second definition of what a
 * route is.
 */
const declared = new Set(
  [...census.matchAll(/`(\/[A-Za-z0-9_\-/[\]]*)`/g)]
    .map((m) => m[1].replace(/\/$/, "") || "/")
    /**
     * ⛔ THE SAME EXCLUSION AS THE POPULATION, AND IT IS NOT OPTIONAL SYMMETRY. §4 legitimately
     * TALKS about the console in prose — the note on `/auth/admin` says it is a route "NOT under
     * `/admin/`", and that backticked span is a sentence, not a ruling. Without this filter the
     * scanner harvests it and §1.2 reports the doc as naming a route that does not exist.
     *
     * ⚠️ CAUGHT BY THE GATE ON ITS OWN FIRST RUN, on prose written to explain the gate's own first
     * finding. The two sides must exclude the same things or they are not comparable.
     */
    .filter((r) => !r.startsWith("/admin") && !r.startsWith("/api")),
);

/* ── §1 · both directions ────────────────────────────────────────────────────────────────── */

const undeclared = routes.filter((r) => !declared.has(r));
ok("1.1 every client-facing route has a ruling in §4",
  undeclared.length === 0,
  undeclared.length ? `NO RULING for: ${undeclared.join(", ")} — decide what each needs, in §4, before it ships` : "");

const ghosts = [...declared].filter((r) => !routes.includes(r) && r !== "/");
ok("1.2 every route §4 names still exists on disk",
  ghosts.length === 0,
  ghosts.length ? `§4 names routes that are not there: ${ghosts.join(", ")}` : "");

/* ── §2 · controls — the arithmetic this gate assumes ────────────────────────────────────── */

/**
 * ⛔ WITHOUT THESE, §1 IS SATISFIED BY A BROKEN READER. A glob that matched nothing gives
 * `undeclared = []` and a cheerful pass; a §4 that failed to slice gives `declared = {}` and §1.2
 * passes for the same empty reason. Each half asserts it actually found something.
 */
ok("2.1 CONTROL: the route glob found a real population",
  routes.length >= 40, `${routes.length} non-admin page.tsx routes`);
ok("2.2 CONTROL: §4 was located and parsed",
  census.length > 500 && declared.size >= 30, `${census.length} chars, ${declared.size} routes named`);
ok("2.3 CONTROL: the two sides genuinely overlap — this is a comparison, not two lists",
  routes.filter((r) => declared.has(r)).length >= 30,
  `${routes.filter((r) => declared.has(r)).length} routes matched on both sides`);
// ⛔ And the glob must exclude what it claims to exclude, or §1.1 would demand rulings for the
//    console — which §11 puts explicitly out of scope.
ok("2.4 CONTROL: admin and api are excluded from the population",
  !routes.some((r) => r.startsWith("/admin") || r.startsWith("/api")),
  routes.filter((r) => r.startsWith("/admin") || r.startsWith("/api")).join(", "));

console.log(`\nroute-census: ${pass} passed, ${fail} failed · ${routes.length} routes on disk · ${declared.size} named in §4`);
if (fail > 0) {
  console.error(
    "\n✗ ROUTE CENSUS FAILED.\n" +
    "  If 1.1 failed: a client-facing route exists that §4 has no ruling for. ⛔ Add the RULING,\n" +
    "  not the route name — the section's own words are that a page ruled to need nothing was\n" +
    "  READ AND DECIDED, not skipped. Bucket D is where 'nothing' goes, with its reason.\n",
  );
  process.exit(1);
}
console.log("route-census: OK — every client-facing route has a ruling, and every ruling has a route");
