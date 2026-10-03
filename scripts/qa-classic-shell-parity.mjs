/**
 * LOCAL-ONLY proof that a viewer WITHOUT the new journey is served the same shell after S6 as before it
 * (the Vodacom plan S6, WP0 — `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md`, amendments A3 and A18).
 *
 * S6 swaps the header and the rail for journey viewers only, and promises everybody else the same elements with the
 * same props. A promise like that is proved against the tree it was made from, not asserted, so this drive records
 * what a classic viewer is shown on the pre-S6 tree and compares every later tree with that record:
 *   · viewers  a guest · the demo player (/auth/demo) · held (?hold=officer) · an unconfirmed email (?email=unverified)
 *   · cells    360 · 768 · 1024 · 1280 × en · sw × / · /markets · /positions · /wallet · /profile · /account, plus an
 *              unmatched path — the not-found CONTROL that /account is measured against.
 * Per cell: the header, the rail, the shell footer and the email bar (normalised outerHTML, and every element's box and
 * computed style — a style change reaches no outerHTML, so markup alone would miss it), the fixed overlays present 3 s
 * after hydration, the footer's padding-bottom and the page's scroll-padding-bottom, the status, where the page landed,
 * its uncaught errors, and every journey trace — in the live page (a test id, the flag attribute, a class) and in the
 * bytes the server sent, where a streamed fallback stays after hydration has replaced it (G3). For /account and the
 * control also the title, the robots meta and the main text; for the signed-in viewers' /positions (an empty demo
 * portfolio, the page WP9 rebuilds for journey viewers) the page body too. No other page body is captured.
 * ⭐ WP10 (S6-PLAN WP10 step 3, A8) — AND THE SELL BUTTON A CLASSIC HOLDER IS SERVED. After the matrix (whose demo
 * portfolio must stay empty, so the /positions body above is the same from one server to the next), the demo player is
 * given an open ticket through the real money paths (`/api/dev-test/seed-real-markets`, then `seed-player-portfolio`),
 * and the two things SellButton draws for it in its free window, the strip and the button, are captured where a classic
 * holder meets them: the ticket's card on /positions and its question's holder block, at 360 and 1280 in en and sw. In
 * the holder block at 360 the button is also pressed, once, and the classic confirm it opens is captured — inside its
 * 10-second quote hold, and never confirmed: only Enter or its gold button sells, and neither is touched. The strip's
 * ticking clock is read as "m:ss" and a ticket's id as "pos_~"; the rest is compared as the matrix is, against
 * SELL_EXPECTED_DIFFS (A8: a default poll with an hour to run compares equal; S6 A8b names the one change it makes, the
 * classic button's free note gaining its narrow-phone classes). The capture runs inside a default poll's
 * five-minute free window, and §S fails a run whose cells missed it. The matrix gained the capture, so this is v2: a v1
 * baseline is refused, and the v2 baseline is captured at the commit just before A8's live half (VODACOM-PLAN §0i names
 * it), so the Sell cells measure A8's own claim as well as S6's.
 *
 *   KP_BASE=http://localhost:3041 npm run qa:classic-shell-parity                  (the control: --prove-red is the default)
 *   KP_BASE=http://localhost:3041 npm run qa:classic-shell-parity -- --baseline <scratchpad>/parity-<sha8>.json
 *   KP_BASE=http://localhost:3041 npm run qa:classic-shell-parity -- --compare <scratchpad>/parity-<sha8>.json
 *
 * ⭐ THE INSTRUMENT IS CALIBRATED BEFORE IT IS TRUSTED: --prove-red green, then the baseline, then — on a FRESH server
 * at the same commit — a null --compare that must exit 0. Every server mints a new demo user, store and ids; what
 * differs between two servers of one tree is this harness's noise, and it is found there, not at WP1.
 * ⛔ NEVER A RE-BASELINE (A3). A difference S6 makes on purpose is a NAMED entry in EXPECTED_DIFFS below, with its
 * reason and its population, and is listed in VODACOM-PLAN §0i. A baseline is captured once: this script refuses to
 * overwrite one, and --compare refuses a capture that failed a floor (`.rejected.json`) or a later tree's (`.current.json`).
 * ⛔ THE BASELINE NAMES ITS BASE (A18). It records the commit of the tree the server ran (KP_TREE, default this
 * checkout). --compare refuses it when that commit is not an ancestor of HEAD (a rebase: re-capture from the rebased
 * pre-S6 parent, into a NEW file), or when a merge since it brought served files in from elsewhere. It then lists every
 * commit since the baseline that changes a served file, so a commit of another lane's that arrived by fast-forward is
 * seen by name. This lane pushing to main is normal and refuses nothing. --allow-base compares anyway, and the verdict
 * line says so.
 * ⭐ --prove-red is the control. On synthetic captures: the EXPECTED_DIFFS matcher passes what it names and nothing
 * beside it, and every §2 floor and §3 /account check goes red on its own plant, and only that check. In the browser:
 * two clean captures of a cell agree, and a 64px header, a paint-only colour, a new fixed overlay and a dropped footer
 * clearance are each reported in their own field and nowhere else. If a plant is not seen, a clean compare means nothing.
 *
 * ⛔ Refuses anything but `http://localhost:PORT` on an IN-MEMORY dev server (the database must not be configured), and a
 * rollout that is ACTIVE (then nobody without a pass sees the classic shell). Start a FRESH server for each run — the
 * demo player's notifications and wallet are part of what the header shows. Writes only the file it is given, and
 * beside it (`.rejected.json` for a baseline that failed a check, `.current.json` for a compare that found differences).
 */
import { chromium } from "playwright";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const NL = "\n";
const msg = (e) => String(e?.message ?? e).split(NL)[0].slice(0, 200);
const short = (sha) => String(sha ?? "").slice(0, 8);
const refuse = (text) => { console.error(`REFUSED — ${text}`); process.exit(2); };
const argv = process.argv.slice(2);
const FLAGS = new Set(["--baseline", "--compare", "--prove-red", "--allow-base", "--allow-dirty"]);
const valueOf = (flag) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null; };
const BASELINE = valueOf("--baseline");
const COMPARE = valueOf("--compare");
// The control is the default: a bare run writes nothing and proves the instrument.
const PROVE_RED = argv.includes("--prove-red") || (!argv.includes("--baseline") && !argv.includes("--compare"));
const ALLOW_BASE = argv.includes("--allow-base");
const ALLOW_DIRTY = argv.includes("--allow-dirty");
const MODE = BASELINE ? "baseline" : COMPARE ? "compare" : "prove-red";
{
  const unknown = argv.filter((a) => a.startsWith("--") && !FLAGS.has(a));
  const modes = [BASELINE, COMPARE, PROVE_RED || null].filter(Boolean).length;
  const bad = unknown.length || modes !== 1
    || (argv.includes("--baseline") && !BASELINE) || (argv.includes("--compare") && !COMPARE)
    || (ALLOW_BASE && !COMPARE) || (ALLOW_DIRTY && !BASELINE);
  if (bad) {
    console.error("USAGE — exactly one of: --baseline <new file> [--allow-dirty] · --compare <baseline file> [--allow-base] · --prove-red (the default)"
      + (unknown.length ? `  (unknown: ${unknown.join(" ")})` : ""));
    process.exit(2);
  }
}

const BASE = process.env.KP_BASE ?? "http://localhost:3041";
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local dev only, addressed as http://localhost:PORT. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const health = await (async () => {
  const res = await fetch(`${BASE}/api/health`).catch(() => null);
  return res ? await res.json().catch(() => null) : null;
})();
if (!health || health.database?.configured !== false) {
  console.error(`REFUSED — the server at ${BASE} reports a configured database (database.configured=${JSON.stringify(health?.database?.configured)}). This drive runs only against an in-memory dev server.`);
  process.exit(2);
}
const rollout = health.simpleJourney ?? null;
if (!rollout || typeof rollout.state !== "string" || rollout.state === "ACTIVE") {
  refuse(`/api/health says simpleJourney = ${JSON.stringify(rollout)}. This drive measures the CLASSIC shell, which a viewer without a pass is shown only while the rollout is not ACTIVE.`);
}

// ── the tree the server runs, and its base (A18) ──────────────────────────────────────────────────────────
const TREE = process.env.KP_TREE ?? fileURLToPath(new URL("..", import.meta.url));
const MAIN = process.env.KP_PARITY_MAIN ?? "origin/main";
/** What the server SERVES: a change under any of these is in the capture whether or not it is committed. */
const SERVED = ["src", "public", "next.config.ts", "tailwind.config.ts", "postcss.config.mjs", "package.json", "package-lock.json"];
// --no-optional-locks: a status or a diff never takes index.lock, so these reads cannot collide with a battery on the tree.
const git = (...args) => {
  const r = spawnSync("git", ["--no-optional-locks", "-C", TREE, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return { code: r.status ?? -1, out: (r.stdout ?? "").trimEnd(), err: (r.stderr ?? "").trim() || (r.error ? msg(r.error) : "") };
};
const HEAD = git("rev-parse", "HEAD");
if (HEAD.code !== 0) refuse(`${TREE} is not a git checkout (${HEAD.err}). A baseline must name the commit it was captured from (S6-PLAN A18); point KP_TREE at the checkout the server runs.`);
const FORK = git("merge-base", "HEAD", MAIN);
const DIRTY = git("status", "--porcelain", "--", ...SERVED).out.split(NL).filter(Boolean);

/**
 * The served files as one hash: HEAD, every uncommitted change under SERVED, and every untracked served file. Taken at
 * the start and after every viewer and language, because red harnesses plant defects in src and restore them — one
 * that runs during a capture would otherwise be recorded as the product, under a clean commit.
 */
function treePrint() {
  const h = createHash("sha1");
  h.update(git("rev-parse", "HEAD").out);
  h.update(git("diff", "HEAD", "--no-ext-diff", "--binary", "--", ...SERVED).out);
  for (const f of git("ls-files", "--others", "--exclude-standard", "--", ...SERVED).out.split(NL).filter(Boolean)) {
    h.update(f);
    try { h.update(readFileSync(join(TREE, f))); } catch { h.update("(unreadable)"); }
  }
  return h.digest("hex");
}
const PRINT0 = treePrint();

/**
 * Why this tree cannot be compared with a baseline captured at `sha`, or null when it can. A rebase leaves the baseline
 * off HEAD's history; a merge carries other lanes' served files in. This lane's own pushes to main move the fork point
 * past the baseline and change nothing that is served, so the fork point is reported in §0, never refused on.
 */
function baseRefusal(sha) {
  if (!/^[0-9a-f]{40}$/.test(String(sha))) return `the baseline names no commit (${JSON.stringify(sha)})`;
  if (git("cat-file", "-e", `${sha}^{commit}`).code !== 0) return `commit ${short(sha)} is not in this repository`;
  if (git("merge-base", "--is-ancestor", sha, "HEAD").code !== 0) return `${short(sha)} is not an ancestor of HEAD ${short(HEAD.out)} — the branch was rebased, or this is another branch`;
  const merges = git("rev-list", "--first-parent", "--merges", `${sha}..HEAD`);
  if (merges.code !== 0) return `cannot list the merges since ${short(sha)} (${merges.err})`;
  const brought = [];
  for (const m of merges.out.split(NL).filter(Boolean)) {
    const files = git("diff", "--name-only", `${m}^1`, m, "--", ...SERVED);
    if (files.code !== 0) return `cannot read merge ${short(m)} (${files.err})`;
    const list = files.out.split(NL).filter(Boolean);
    if (list.length) brought.push(`${short(m)} brought ${list.length} served file(s): ${list.slice(0, 3).join(", ")}${list.length > 3 ? " …" : ""}`);
  }
  if (brought.length) return `${brought.length} merge(s) since the baseline carried served files in from elsewhere — ${brought.join("; ")}`;
  return null;
}

const KIND = "kp-classic-shell-parity";
const VERSION = 2;   // 2 · S6 WP10: the matrix gained the Sell capture, so a v1 baseline cannot be compared — capture a new one
const VIEWERS = [
  { id: "guest", door: null, who: "a guest" },
  { id: "player", door: "/auth/demo", who: "the demo player" },
  { id: "held", door: "/auth/demo?hold=officer", who: "the demo player under an officer's hold" },
  { id: "unverified", door: "/auth/demo?email=unverified", who: "the demo player with an unconfirmed email" },
];
const LOCALES = ["en", "sw"];
const WIDTHS = [360, 768, 1024, 1280];
/** An unmatched path: the not-found page every viewer gets today, which /account is measured against. */
const NOT_FOUND = "/kp-parity-no-such-page";
const ROUTES = ["/", "/markets", "/positions", "/wallet", "/profile", "/account", NOT_FOUND];
/** The edge-protected routes: a guest is sent to sign-in, a signed-in viewer stays. */
const AUTH = ["/positions", "/wallet", "/profile"];
/** The one page BODY captured, for signed-in viewers: WP9 rebuilds /positions for journey viewers, and the demo
 *  player's portfolio is empty, so its classic body is the same from one server to the next. */
const BODY_ROUTE = "/positions";
const HEIGHT = 800;
/**
 * ⭐ WP10 · THE SELL CAPTURE (S6-PLAN WP10 step 3, A8): an open ticket in its free window, at the two places a classic
 * holder is sold to — its card on /positions and its question's holder block — at two widths in both languages. Taken
 * AFTER the matrix, so the demo portfolio the matrix reads is still empty. A cell is keyed by its place, never by the
 * question's id: each server mints its own. In one cell per language the button is pressed and the classic confirm it
 * opens is captured too (`confirm`).
 */
const SELL_PLACES = ["/positions", "/markets/:held"];
const SELL_CONFIRM = { width: 360, place: SELL_PLACES[1] };
const SELL = { locales: LOCALES, widths: [360, 1280], places: SELL_PLACES, confirm: SELL_CONFIRM };
/** A Sell place's route: the open ticket's question stands in for ":held". */
const routeOfPlace = (place, held) => (place === SELL_PLACES[1] ? `/markets/${held}` : place);
/** The Sell cells that press the button and capture the classic confirm it opens. */
const confirmCell = (width, place) => width === SELL_CONFIRM.width && place === SELL_CONFIRM.place;
/** The classic confirm, found by what it is: an open modal dialog holding the gold confirm button. */
const CONFIRM_GOLD = '[role="dialog"][aria-modal="true"] button.btn-gold';
const MATRIX = { viewers: VIEWERS.map((v) => v.id), locales: LOCALES, widths: WIDTHS, routes: ROUTES, body: BODY_ROUTE, height: HEIGHT, sell: SELL };
const HOST = new URL(BASE).hostname;
const keyOf = (v, l, w, r) => `${v}|${l}|${w}|${r}`;
const partsOf = (k) => { const [v, l, w, r] = k.split("|"); return { v, l, w: Number(w), r }; };

/**
 * ⭐ THE DIFFERENCES S6 MAKES ON PURPOSE FOR A CLASSIC VIEWER — each by name, with its reason and the number of cells it
 * covers, and each listed in VODACOM-PLAN §0i (A3). An entry names ONE field and either one exact transition
 * (`from` → `to`) or literal substitutions (`replace`) after which the baseline must equal the capture, so a second
 * change beside it is still caught. It must be seen in all of its cells or in none (§4.2): a change that landed for
 * part of its population is a defect, not the change. ⛔ Never a wildcard and never a re-baseline.
 */
const EXPECTED_DIFFS = [
  {
    id: "account-streams-200",
    field: "status",
    routes: ["/account"],
    from: 404,
    to: 200,
    cells: VIEWERS.length * LOCALES.length * WIDTHS.length,
    reason: "S6 WP5 adds the /account hub, which calls notFound() for every request the journey is not shown to. The root loading.tsx has streamed by then, so Next answers the not-found BODY at HTTP 200 where an unmatched path is a true 404 (pre-deploy-live-check.mjs: a 200 is not a render). The body, the title, noindex and the absence of any journey trace are asserted on every run (§3); beside the status only the robots meta moves, and that is its own entry (account-robots-noindex).",
  },
  {
    id: "account-robots-noindex",
    field: "notFound.robots",
    routes: ["/account"],
    from: ["index, follow", "noindex"].join(NL),
    to: ["noindex", "noindex, nofollow"].join(NL),
    cells: VIEWERS.length * LOCALES.length * WIDTHS.length,
    reason: "S6 WP5 (A2): /account's own generateMetadata answers every request the journey is not shown to with the not-found page's title and robots noindex, nofollow. On a matched route that page metadata REPLACES the root layout's 'index, follow', and Next adds a noindex of its own only to a 404, so at HTTP 200 the bytes carry Next's not-found noindex plus the page's own noindex, nofollow (measured on the first compare after WP5: every /account cell) where an unmatched path sends the pair above. Still noindex for a crawler (§3.3 holds it on every run); the title is the same string (§3.2).",
  },
  {
    id: "footer-rail-h",
    field: "regions.footer.html",
    replace: [["pb-[calc(88px+env(safe-area-inset-bottom))]", "pb-[calc(var(--rail-h)+env(safe-area-inset-bottom))]"]],
    cells: VIEWERS.length * LOCALES.length * WIDTHS.length * ROUTES.length,
    reason: "S6 WP11: the footer's rail reserve names the token --rail-h (88px, globals.css) instead of the literal, so its class string moves in every cell while what it computes does not — footerPaddingBottom and scrollPaddingBottom are their own fields, compared in every cell, and must still be equal (88px below 1024; the footer 0px from 1024).",
  },
];
/** The named differences seen in some of their cells but not all. */
const partialExpected = (hits, list = EXPECTED_DIFFS) => list
  .filter((e) => { const n = hits.get(e.id) ?? 0; return n !== 0 && n !== e.cells; })
  .map((e) => `${e.id} in ${hits.get(e.id)} of its ${e.cells} cells`);
/**
 * ⭐ WP10 · THE NAMED DIFFERENCES FOR THE SELL CELLS — one, S6 A8b's. A8: a classic holder's Sell button on a default poll
 * with an hour to run compares equal with the baseline captured before A8's live half; any other difference is a named
 * entry here (with its field, its routes and its `cells`), never a re-baseline.
 */
const SELL_EXPECTED_DIFFS = [
  {
    id: "sell-narrow-phone",
    field: "regions.button.html",
    routes: SELL_PLACES,
    replace: [
      ['<span class="ml-1.5 opacity-80 text-[11px]">full refund</span>', '<span class="ml-1.5 hidden opacity-80 text-[11px] xs:inline">full refund</span>'],
      ['<span class="ml-1.5 opacity-80 text-[11px]">pesa yote</span>', '<span class="ml-1.5 hidden opacity-80 text-[11px] xs:inline">pesa yote</span>'],
    ],
    cells: SELL.locales.length * SELL.widths.length * SELL.places.length,
    reason: "S6 A8b: below 360px (Tailwind's xs) the classic Sell button leaves out its free note — the strip above it already says there is no fee — so its free row fits a 320px phone on /positions in every language (test:sell-grace-truth §5). The Sell cells are captured at 360 and 1280, where the note is inline as before: the free note's span carries two classes it did not, in every Sell cell, and nothing else moves — the computed styles and boxes are their own field (regions.button.layout), compared in every cell, and must still be equal.",
  },
];

/** The computed properties recorded per element. Geometry is recorded separately, relative to the region's root. */
const PROPS = [
  "display", "position", "z-index", "visibility", "opacity", "overflow-x", "overflow-y", "box-sizing",
  "flex-direction", "flex-wrap", "justify-content", "align-items", "gap", "order", "flex-grow", "flex-shrink",
  "padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "border-top", "border-right", "border-bottom", "border-left", "border-radius",
  "background-color", "background-image", "box-shadow", "outline-style",
  "color", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing",
  "text-transform", "text-align", "text-decoration-line", "white-space", "text-overflow",
  "transform", "filter", "backdrop-filter", "cursor", "pointer-events", "fill", "stroke",
];
/** While an element runs an animation these are mid-flight, so its signature names the animation instead. */
const ANIMATED = ["opacity", "transform", "box-shadow", "background-color", "background-image", "color", "filter", "fill", "stroke"];
/** The avatar crest is drawn from the user id, which is random per in-memory store: its inside is not chrome. */
const CREST = ".crest-holder svg";
/** The rail's entry in the overlay census. Each entry leads with its kp- classes, so the rail is named however many others it carries. */
const RAIL_OVERLAY = /^nav.*\.kp-rail(?=[.\s])/;
/** A journey trace in the bytes the server sent: a test id or the flag attribute, as HTML or as the RSC payload's escaped JSON. */
const RAW_TRACE = /(?:data-testid|testId)(?:=|\\":)\\?"journey-[\w-]*|\bdata-journey(?![\w-])/g;
const rawOf = (body) => (typeof body !== "string" ? null : {
  shell: body.includes("app-topbar"),
  trace: [...new Set((body.match(RAW_TRACE) ?? []).map((m) => (m.includes("journey-") ? `testid:${m.slice(m.indexOf("journey-"))}` : "data-journey")))].sort(),
});

/** Runs IN THE PAGE. Self-contained: Playwright serialises it, so it may close over nothing. */
const SNAPSHOT = ({ crest, props, animated, notFound, pageBody, sell, confirm }) => {
  const r2 = (n) => Math.round(n * 2) / 2;
  const sigOf = (el, moving) => {
    const cs = getComputedStyle(el);
    const parts = [];
    for (const p of props) {
      if (moving && animated.includes(p)) continue;
      let v = cs.getPropertyValue(p);
      // next/font names a family with a build hash; the family is the fact, the hash is not.
      if (p === "font-family") v = v.replace(/_[0-9a-f]{6,}\b/g, "_~");
      parts.push(`${p}:${v}`);
    }
    if (moving) parts.push(`animation:${cs.animationName}`);
    return parts.join("\n");
  };
  const region = (els) => {
    const root = els[0];
    if (!root) return { count: 0, html: null, lines: null };
    const box = root.getBoundingClientRect();
    const lines = [];
    const walk = (el, path) => {
      const moving = typeof el.getAnimations === "function" && el.getAnimations().some((a) => a.playState === "running");
      const r = el.getBoundingClientRect();
      // An unrendered element (an svg <defs> child, display:none) reports a 0x0 box at PAGE coordinates, so its offset from
      // the region moves whenever anything above the region grows — a position that means nothing. Record its size only.
      const geo = moving ? "~" : r.width === 0 && r.height === 0 ? "0x0" : `${r2(r.left - box.left)},${r2(r.top - box.top)},${r2(r.width)}x${r2(r.height)}`;
      lines.push([path, geo, sigOf(el, moving)]);
      if (el.matches(crest)) return;
      let i = 0;
      for (const c of el.children) walk(c, `${path}>${c.tagName.toLowerCase()}${i++}`);
    };
    walk(root, root.tagName.toLowerCase());
    const clone = root.cloneNode(true);
    for (const s of clone.querySelectorAll(crest)) {
      const stub = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      for (const a of ["width", "height"]) if (s.hasAttribute(a)) stub.setAttribute(a, s.getAttribute(a));
      stub.setAttribute("data-parity", "crest");
      s.replaceWith(stub);
    }
    return { count: els.length, html: clone.outerHTML, lines };
  };
  const overlays = () => {
    const out = new Set();
    for (const el of document.body.querySelectorAll("*")) {
      const tag = el.tagName.toLowerCase();
      if (tag.startsWith("nextjs-") || tag === "next-route-announcer") continue;
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") continue;
      let nested = false;
      for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) if (getComputedStyle(up).position === "fixed") { nested = true; break; }
      if (nested) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
      let op = 1;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) op *= Number.parseFloat(getComputedStyle(n).opacity) || 0;
      if (op < 0.01) continue;
      const testid = el.getAttribute("data-testid"), role = el.getAttribute("role"), label = el.getAttribute("aria-label");
      const classes = [...el.classList];
      const cls = [...classes.filter((c) => c.startsWith("kp-")), ...classes.filter((c) => !c.startsWith("kp-")).slice(0, 3)].join(".");
      out.add(`${tag}${testid ? `[data-testid=${testid}]` : ""}${role ? `[role=${role}]` : ""}${label ? `[aria-label=${label}]` : ""}${cls ? `.${cls}` : ""} z=${cs.zIndex}`);
    }
    return [...out].sort();
  };
  // WP10 · the two things SellButton draws for an open ticket, its free strip and its button, under the held question's
  // card on /positions or in the question's holder block, found by structure: the classic markup carries no test id,
  // and must not gain one. The strip's clock ticks, so it is read as "m:ss".
  const sellOf = ({ held, place }) => {
    const card = place === "/positions" ? document.querySelector(`#main-content a[data-row-id][href="/markets/${held}"]`) : null;
    const row = place === "/positions" ? (card ? card.parentElement : null) : document.querySelector("#main-content .ticket-target");
    const button = row ? [...row.children].find((c) => c.tagName === "BUTTON") ?? null : null;
    const prev = button ? button.previousElementSibling : null;
    const strip = prev && prev.tagName === "DIV" && prev.classList.contains("mb-1.5") ? prev : null;
    const ticks = (r) => (r.html ? { ...r, html: r.html.replace(/>[0-9]{1,2}:[0-9]{2}</g, ">m:ss<") } : r);
    return { strip: ticks(region(strip ? [strip] : [])), button: ticks(region(button ? [button] : [])) };
  };
  // WP10 · the classic confirm the button opened: the open modal dialog that holds the gold confirm, and whether that
  // confirm can still be pressed (its 10-second quote hold has not run out).
  const confirmOf = () => {
    const els = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter((d) => d.querySelector("button.btn-gold"));
    return { region: region(els), live: els.length === 1 && !!els[0].querySelector("button.btn-gold:not(:disabled)") };
  };
  const footers = [...document.querySelectorAll("#main-content + footer")];
  return {
    url: location.pathname + location.search,
    regions: {
      header: region([...document.querySelectorAll("header.app-topbar")]),
      rail: region([...document.querySelectorAll("nav.kp-rail")]),
      footer: region(footers),
      emailBar: region([...document.querySelectorAll('[data-testid="email-verify-banner"]')]),
      ...(pageBody ? { main: region([...document.querySelectorAll("#main-content")]) } : {}),
    },
    overlays: overlays(),
    ...(sell ? { sell: sellOf(sell) } : {}),
    ...(confirm ? { confirm: confirmOf() } : {}),
    footerPaddingBottom: footers[0] ? getComputedStyle(footers[0]).paddingBottom : null,
    scrollPaddingBottom: getComputedStyle(document.documentElement).scrollPaddingBottom,
    // The whole document, html included: a journey test id, the flag JourneyFlag sets, or a journey class.
    journey: [...document.querySelectorAll('[data-testid^="journey-"],[data-journey],[class*="journey"]')].map((e) => {
      const id = e.getAttribute("data-testid") ?? "";
      if (id.startsWith("journey-")) return `testid:${id}`;
      if (e.hasAttribute("data-journey")) return `${e.tagName.toLowerCase()}[data-journey]`;
      return `class:${[...e.classList].filter((c) => c.includes("journey")).join(".")}`;
    }).sort(),
    notFound: notFound
      ? {
          title: document.title,
          robots: [...document.querySelectorAll('meta[name="robots"]')].map((m) => m.getAttribute("content") ?? "").sort(),
          main: (document.querySelector("main")?.innerText ?? "").replace(/\s+/g, " ").trim(),
        }
      : null,
  };
};

/** What changes between two servers of the SAME tree and is not the product: React ids, asset hashes, the port, store ids, times. */
const norm = (s) => String(s)
  .replace(/_[Rr]_[0-9A-Za-z]+_/g, "_id_")
  .replace(/«[Rr][0-9A-Za-z]*»/g, "_id_")
  .replace(/https?:\/\/localhost(?::\d+)?/g, "http://localhost")
  .replace(/\/_next\/static\/[^"'\s)&]+/g, "/_next/static/~")
  .replace(/%2F_next%2Fstatic%2F[^"'\s)&]+/g, "%2F_next%2Fstatic%2F~")
  .replace(/([?&](?:amp;)?)dpl=[^"'&\s]*/g, "$1dpl=~")
  .replace(/\b(usr|wal|kyc|txn|pos)_[A-Za-z0-9_-]{6,}/g, "$1_~")
  .replace(/datetime="[^"]*"/g, 'datetime="~"')
  .replace(/\b\d+\s*(?:s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?)\s+ago\b/gi, "~ ago")
  .replace(/\b(?:sekunde|dakika|saa|siku)\s+\d+\s+(?:zilizopita|iliyopita)\b/gi, "~ zilizopita");

const blobs = {};
const put = (text) => { const id = createHash("sha1").update(text).digest("hex").slice(0, 12); blobs[id] = text; return id; };
function toCell(snap, extra) {
  const regions = {};
  for (const [name, r] of Object.entries(snap.regions)) {
    regions[name] = r.count === 0 ? { count: 0, html: null, layout: null } : {
      count: r.count,
      html: put(norm(r.html)),
      layout: put(r.lines.map(([path, geo, sig]) => `${path} ${geo} ${put(norm(sig))}`).join(NL)),
    };
  }
  return {
    ...extra,
    landed: snap.url,
    regions,
    overlays: snap.overlays.map(norm),
    footerPaddingBottom: snap.footerPaddingBottom,
    scrollPaddingBottom: snap.scrollPaddingBottom,
    journey: snap.journey,
    ...(snap.notFound ? { notFound: { title: snap.notFound.title, robots: snap.notFound.robots, main: norm(snap.notFound.main) } } : {}),
  };
}

// ── the diff ──────────────────────────────────────────────────────────────────────────────────────────────
function fieldsOf(cell, store) {
  const f = {
    status: String(cell.status),
    landed: String(cell.landed),
    overlays: (cell.overlays ?? []).join(NL),
    journey: (cell.journey ?? []).join(","),
    raw: cell.raw ? `${cell.raw.shell ? "shell" : "no shell"} · ${cell.raw.trace.join(",")}` : "(unread)",
    pageErrors: (cell.pageErrors ?? []).join(NL),
    footerPaddingBottom: String(cell.footerPaddingBottom),
    scrollPaddingBottom: String(cell.scrollPaddingBottom),
  };
  for (const [name, r] of Object.entries(cell.regions ?? {})) {
    f[`regions.${name}.count`] = String(r.count);
    f[`regions.${name}.html`] = r.html ? store[r.html] ?? `(missing blob ${r.html})` : "";
    f[`regions.${name}.layout`] = r.layout ? store[r.layout] ?? `(missing blob ${r.layout})` : "";
  }
  if (cell.notFound) {
    f["notFound.title"] = cell.notFound.title;
    f["notFound.robots"] = cell.notFound.robots.join(NL);
    f["notFound.main"] = cell.notFound.main;
  }
  return f;
}
const propsOf = (sig) => new Map(String(sig ?? "").split(NL).filter(Boolean).map((kv) => [kv.slice(0, kv.indexOf(":")), kv.slice(kv.indexOf(":") + 1)]));
function explain(field, was, now, baseStore, curStore) {
  if (field.endsWith(".layout")) {
    const a = was.split(NL), b = now.split(NL);
    let differing = 0, first = -1;
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { differing++; if (first < 0) first = i; }
    const [pathA, geoA, sigA] = (a[first] ?? "").split(" ");
    const [pathB, geoB, sigB] = (b[first] ?? "").split(" ");
    const what = [];
    if (pathA !== pathB) what.push(`element ${pathA || "(none)"} → ${pathB || "(none)"}`);
    else if (geoA !== geoB) what.push(`${pathA} box ${geoA} → ${geoB}`);
    if (pathA === pathB && sigA !== sigB) {
      const pa = propsOf(baseStore[sigA]), pb = propsOf(curStore[sigB]);
      const moved = [...new Set([...pa.keys(), ...pb.keys()])].filter((p) => pa.get(p) !== pb.get(p));
      what.push(`${pathA} style ${moved.slice(0, 4).map((p) => `${p}: ${pa.get(p) ?? "-"} → ${pb.get(p) ?? "-"}`).join(", ")}`);
    }
    return `${differing} of ${Math.max(a.length, b.length)} element line(s) differ; first: ${what.join("; ")}`;
  }
  if (was.length > 120 || now.length > 120) {
    let i = 0;
    while (i < was.length && i < now.length && was[i] === now[i]) i++;
    const around = (s) => JSON.stringify(s.slice(Math.max(0, i - 40), i + 80));
    return `first difference at character ${i}: ${around(was)} → ${around(now)}`;
  }
  return `${JSON.stringify(was)} → ${JSON.stringify(now)}`;
}
/** Every field that differs, split into the named EXPECTED differences and everything else. */
function diffCells(route, base, cur, baseStore, curStore, list = EXPECTED_DIFFS) {
  const a = fieldsOf(base, baseStore), b = fieldsOf(cur, curStore);
  const unexpected = [], expected = [];
  for (const field of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const was = a[field] ?? "(absent)", now = b[field] ?? "(absent)";
    if (was === now) continue;
    let left = was, hit = null;
    for (const e of list) {
      if (e.field !== field || (e.routes && !e.routes.includes(route))) continue;
      if ("from" in e && was === String(e.from) && now === String(e.to)) { hit = e; break; }
      if (e.replace) { left = e.replace.reduce((s, [x, y]) => s.split(x).join(y), was); if (left === now) { hit = e; break; } }
    }
    if (hit) expected.push({ field, id: hit.id });
    else unexpected.push({ field, detail: explain(field, left, now, baseStore, curStore) });
  }
  return { unexpected, expected };
}

// ── the checks every capture must pass, as pure functions so --prove-red can break each one ────────────────
/** §2 — the population is what it claims. Each check returns the cells (or facts) that fail it. */
function populationChecks(cells, store) {
  const all = Object.entries(cells);
  const live = all.filter(([, c]) => !c.error);
  const at = (v, l, w, r) => cells[keyOf(v, l, w, r)] ?? { error: "not captured" };
  const html = (c, region) => (c.regions?.[region]?.html ? store[c.regions[region].html] ?? "" : "");
  const bad = (pred) => live.filter(([k, c]) => pred(k, c)).map(([k]) => k);
  const size = VIEWERS.length * LOCALES.length * WIDTHS.length * ROUTES.length;
  const shell = (c) => c.regions.header.count === 1 && c.regions.rail.count === 1 && c.regions.footer.count === 1;
  const auth = live.filter(([k]) => AUTH.includes(partsOf(k).r));
  const DEPOSIT = 'data-testid="deposit-header"';
  const held = html(at("held", "en", 1280, "/"), "header"), player = html(at("player", "en", 1280, "/"), "header");
  const bar = (v) => at(v, "en", 360, "/").regions?.emailBar?.count;
  return [
    { id: "2.0", name: `every cell was captured (${size})`,
      fails: [...(all.length === size ? [] : [`the matrix holds ${all.length} cells`]), ...all.filter(([, c]) => c.error).map(([k, c]) => `${k} (${c.error})`)] },
    { id: "2.1", name: "every cell rendered the shell — one header, one rail, one footer", fails: bad((k, c) => !shell(c)) },
    { id: "2.2", name: "every cell settled — two snapshots 700 ms apart agreed", fails: bad((k, c) => !c.stable) },
    { id: "2.3", name: "no viewer carries a preview pass", fails: bad((k, c) => c.pass) },
    { id: "2.4", name: "no journey test id, flag or class anywhere in the page",
      fails: live.filter(([, c]) => c.journey.length).map(([k, c]) => `${k} (${c.journey.join(",")})`) },
    { id: "2.5", name: "the raw HTML was read, is the shell's, and carries no journey trace",
      fails: live.filter(([, c]) => !c.raw || !c.raw.shell || c.raw.trace.length).map(([k, c]) => `${k} (${!c.raw ? "unread" : !c.raw.shell ? "no shell" : c.raw.trace.join(",")})`) },
    { id: "2.6", name: "the guest is a guest — /positions, /wallet and /profile land on the sign-in page",
      fails: auth.filter(([k, c]) => partsOf(k).v === "guest" && !c.landed.startsWith("/auth/login")).map(([k, c]) => `${k} → ${c.landed}`) },
    { id: "2.7", name: "the signed-in viewers are signed in — none of those three lands anywhere else",
      fails: auth.filter(([k, c]) => partsOf(k).v !== "guest" && c.landed.split("?")[0] !== partsOf(k).r).map(([k, c]) => `${k} → ${c.landed}`) },
    { id: "2.8", name: "the held viewer is held — no header deposit control at 1280, where the player has one",
      fails: [...(!held ? ["held|en|1280|/ has no header"] : held.includes(DEPOSIT) ? ["held|en|1280|/ has it"] : []), ...(player.includes(DEPOSIT) ? [] : ["player|en|1280|/ has none"])] },
    { id: "2.9", name: "the unverified viewer sees the email bar on /, and the player does not",
      fails: [...(bar("unverified") === 1 ? [] : [`unverified|en|360|/ shows ${bar("unverified") ?? "?"}`]), ...(bar("player") === 0 ? [] : [`player|en|360|/ shows ${bar("player") ?? "?"}`])] },
    { id: "2.10", name: "below 1024 the rail is among the fixed overlays — the census sees what is there",
      fails: bad((k, c) => partsOf(k).w < 1024 && !c.overlays.some((o) => RAIL_OVERLAY.test(o))) },
    { id: "2.11", name: `the signed-in viewers' ${BODY_ROUTE} captured its page body`,
      fails: bad((k, c) => partsOf(k).r === BODY_ROUTE && partsOf(k).v !== "guest" && c.regions.main?.count !== 1) },
  ];
}

/** §3 — /account, for a viewer the journey is not shown to, is the not-found page (A3), against the control in the same cell. */
function accountChecks(cells, loaders) {
  const pairs = [];
  for (const v of VIEWERS) for (const l of LOCALES) for (const w of WIDTHS) {
    const a = cells[keyOf(v.id, l, w, "/account")], c = cells[keyOf(v.id, l, w, NOT_FOUND)];
    if (a && c && !a.error && !c.error && a.notFound && c.notFound) pairs.push([keyOf(v.id, l, w, "/account"), a, c]);
  }
  const fails = (pred) => pairs.filter(([, a, c]) => !pred(a, c)).map(([k]) => k);
  const size = VIEWERS.length * LOCALES.length * WIDTHS.length;
  const clean = (x) => !!x.raw && x.raw.trace.length === 0;
  return [
    { id: "3.0", name: `the control path is a true 404 with a not-found body (${pairs.length} of ${size} pairs)`,
      fails: [...(pairs.length === size ? [] : [`${size - pairs.length} pair(s) not captured`]), ...fails((a, c) => c.status === 404 && c.notFound.main.length > 20)] },
    { id: "3.1", name: "/account shows the not-found body (its main text is the control's)", fails: fails((a, c) => a.notFound.main === c.notFound.main) },
    { id: "3.2", name: "…under the not-found title", fails: fails((a, c) => !!c.notFound.title && a.notFound.title === c.notFound.title) },
    { id: "3.3", name: "…marked noindex", fails: fails((a) => a.notFound.robots.some((r) => /noindex/i.test(r))) },
    { id: "3.4", name: "…with no journey test id, flag or class in the page", fails: fails((a) => a.journey.length === 0) },
    { id: "3.5", name: "…and none in the bytes the server sent, where a streamed fallback would still be (G3)", fails: fails((a, c) => clean(a) && clean(c)) },
    { id: "3.6", name: "no loading file of /account's own in the tree the server runs — the root loader is generic (A3)", fails: loaders },
  ];
}

/** Every loading file that would stream before /account's notFound(): the segment's own, under any route group. */
function accountLoaders() {
  const out = [];
  const walk = (dir, segs) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const next = /^\(.+\)$/.test(e.name) ? segs : [...segs, e.name];
      if (next.length > 1 || (next.length === 1 && next[0] !== "account")) continue;
      const sub = join(dir, e.name);
      if (next.length === 1) for (const f of readdirSync(sub)) if (/^loading\.[jt]sx?$/.test(f)) out.push(relative(TREE, join(sub, f)).split(sep).join("/"));
      walk(sub, next);
    }
  };
  try { walk(join(TREE, "src", "app"), []); } catch (e) { out.push(`(cannot read src/app: ${msg(e)})`); }
  return out;
}

/** §S — the Sell capture is what it claims (WP10). Each check returns the cells (or facts) that fail it. */
function sellChecks(sell, seed, store) {
  const all = Object.entries(sell ?? {});
  const live = all.filter(([, c]) => !c.error);
  const size = SELL.locales.length * SELL.widths.length * SELL.places.length;
  const bad = (pred) => live.filter(([k, c]) => pred(k, c)).map(([k]) => k);
  const html = (c, region) => (c.regions?.[region]?.html ? store[c.regions[region].html] ?? "" : "");
  const confirmed = (k, c) => (confirmCell(partsOf(k).w, partsOf(k).r)
    ? c.regions?.confirm?.count === 1 && c.confirmLive === true
    : c.regions?.confirm === undefined);
  return [
    { id: "S.0", name: `the demo player was given an open ticket through the real money paths, and every Sell cell was captured (${size})`,
      fails: [...(seed && !seed.error && seed.held ? [] : [`the seed: ${seed?.error ?? "not run"}`]), ...(all.length === size ? [] : [`the Sell capture holds ${all.length} cells`]),
        ...all.filter(([, c]) => c.error).map(([k, c]) => `${k} (${c.error})`)] },
    { id: "S.1", name: "every Sell cell settled, answered 200 and stayed where it was sent: the holder is signed in",
      fails: bad((k, c) => !c.stable || c.status !== 200 || c.landed !== partsOf(k).r) },
    { id: "S.2", name: "every Sell cell was captured INSIDE the free window — one strip, its countdown read as m:ss, and one button — and each confirm cell holds one classic confirm, captured inside its quote hold (and no other cell holds one)",
      fails: bad((k, c) => c.regions?.strip?.count !== 1 || c.regions?.button?.count !== 1 || !html(c, "strip").includes(">m:ss<") || !confirmed(k, c)) },
    { id: "S.3", name: "no journey test id, flag or class in a Sell cell, in the page or in the bytes the server sent",
      fails: bad((k, c) => (c.journey ?? []).length > 0 || !c.raw || !c.raw.shell || c.raw.trace.length > 0) },
  ];
}

/** A Sell capture with every §S check met, built in memory: what --prove-red breaks one check at a time. */
function syntheticSell() {
  const store = {
    strip: '<div class="mb-1.5"><span>Free exit</span><span>m:ss</span></div>', button: '<button class="btn">Free exit</button>',
    confirm: '<div role="dialog" aria-modal="true"><button class="btn btn-gold">Sell</button></div>',
  };
  const sell = {};
  for (const l of SELL.locales) for (const w of SELL.widths) for (const place of SELL.places) {
    sell[keyOf("sell", l, w, place)] = {
      status: 200, stable: true, landed: place, pageErrors: [], journey: [], raw: { shell: true, trace: [] },
      regions: {
        strip: { count: 1, html: "strip", layout: null }, button: { count: 1, html: "button", layout: null },
        ...(confirmCell(w, place) ? { confirm: { count: 1, html: "confirm", layout: null } } : {}),
      },
      ...(confirmCell(w, place) ? { confirmLive: true } : {}),
    };
  }
  return { sell, seed: { held: "mkt_planted", open: 4, refusals: [] }, store };
}

/** A capture with every check met, built in memory: what --prove-red breaks one check at a time. */
function syntheticCapture() {
  const store = { hdr: '<header class="app-topbar"></header>', hdrDeposit: '<header class="app-topbar"><a data-testid="deposit-header"></a></header>' };
  const region = (html = null) => ({ count: 1, html, layout: null });
  const none = () => ({ count: 0, html: null, layout: null });
  const cells = {};
  for (const v of VIEWERS) for (const l of LOCALES) for (const w of WIDTHS) for (const r of ROUTES) {
    const guest = v.id === "guest", nf = r === "/account" || r === NOT_FOUND;
    cells[keyOf(v.id, l, w, r)] = {
      status: nf ? 404 : 200, stable: true, pass: false, pageErrors: [],
      landed: guest && AUTH.includes(r) ? `/auth/login?next=${encodeURIComponent(r)}` : r,
      regions: {
        header: region(v.id === "player" ? "hdrDeposit" : "hdr"), rail: region(), footer: region(),
        emailBar: v.id === "unverified" ? region() : none(),
        ...(!guest && r === BODY_ROUTE ? { main: region() } : {}),
      },
      overlays: w < 1024 ? ["nav[aria-label=Primary].kp-rail z=40"] : [],
      footerPaddingBottom: w < 1024 ? "88px" : "0px", scrollPaddingBottom: "88px",
      journey: [], raw: { shell: true, trace: [] },
      ...(nf ? { notFound: { title: "Page not found · 404", robots: ["noindex"], main: "404 Page not found We couldn't find that page" } } : {}),
    };
  }
  return { cells, store };
}

// ── the run ───────────────────────────────────────────────────────────────────────────────────────────────
const results = [];
const ok = (name, pass, detail = "") => { results.push(!!pass); console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const listOf = (keys) => (keys.length ? `${keys.length}: ${keys.slice(0, 6).join(" · ")}${keys.length > 6 ? " …" : ""}` : "");
const secs = (ms) => `${Math.round(ms / 1000)}s`;
const pathOf = (u) => { const x = new URL(u); return x.pathname + x.search; };

console.log(`qa:classic-shell-parity — ${MODE} — ${BASE}`);
console.log(`  tree ${TREE} @ ${short(HEAD.out)}${DIRTY.length ? ` (${DIRTY.length} uncommitted change(s) the server serves)` : " (clean)"} · forks from ${MAIN} at ${FORK.code === 0 ? short(FORK.out) : "?"} · rollout ${rollout.state}`);

// Everything that can refuse is asked BEFORE the browser starts, so a bad path never costs a 20-minute capture.
let baseline = null;
let baseOverridden = "";
if (BASELINE) {
  if (existsSync(BASELINE)) refuse(`${BASELINE} exists. A baseline is captured once and never overwritten (A3); after a rebase, capture a NEW file from the rebased pre-S6 parent (A18).`);
  if (!existsSync(dirname(resolve(BASELINE)))) refuse(`the folder for ${BASELINE} does not exist.`);
  if (DIRTY.length && !ALLOW_DIRTY) {
    refuse(`the server's tree has uncommitted changes it serves, so the commit this baseline would name is not what it measured:${NL}    ${DIRTY.join(`${NL}    `)}${NL}  Commit them, or pass --allow-dirty to record the list in the baseline.`);
  }
}
if (COMPARE) {
  try { baseline = JSON.parse(readFileSync(COMPARE, "utf8")); } catch (e) { refuse(`cannot read the baseline ${COMPARE}: ${msg(e)}`); }
  if (baseline?.kind !== KIND || baseline.version !== VERSION || JSON.stringify(baseline.matrix) !== JSON.stringify(MATRIX)) {
    refuse(`${COMPARE} is not a v${VERSION} ${KIND} capture of this matrix (kind=${baseline?.kind}, version=${baseline?.version}, captured at ${short(baseline?.base?.sha) || "an unnamed commit"}). Capture a v${VERSION} baseline into a NEW file at the base VODACOM-PLAN §0i names for it (A8, A18).`);
  }
  if (baseline.role !== "baseline" || baseline.rejected !== false) {
    refuse(`${COMPARE} is not an accepted baseline (role=${baseline.role}, rejected=${baseline.rejected}): a .rejected.json failed a check when it was captured, and a .current.json is a later tree's capture.`);
  }
  console.log(`\n§0 · the base (S6-PLAN A18)`);
  const sha = baseline.base?.sha;
  const why = baseRefusal(sha);
  if (why && !ALLOW_BASE) {
    refuse(`the baseline was captured at ${short(sha)}, and this tree cannot be compared with it: ${why}.${NL}  Re-capture from the pre-S6 parent into a NEW file (A18), or pass --allow-base to compare anyway.`);
  }
  if (why) {
    baseOverridden = why;
    console.log(`  ⚠ OVERRIDDEN 0.1 the baseline's base — ${why}. --allow-base: differences below may belong to other lanes.`);
  } else {
    ok(`0.1 the baseline's ${short(sha)} is an ancestor of HEAD ${short(HEAD.out)}, and no merge since it carried served files in`, true);
  }
  const since = git("log", "--oneline", "--no-decorate", `${sha}..HEAD`, "--", ...SERVED);
  const commits = since.out.split(NL).filter(Boolean);
  if (since.code !== 0) console.log(`  ⚠ cannot list the commits since the baseline: ${since.err}`);
  else console.log(`  ${commits.length} commit(s) since the baseline change a served file — each should be an S6 package; any other is another lane's change inside this compare:`);
  for (const s of commits.slice(0, 30)) console.log(`    ${s}`);
  if (commits.length > 30) console.log(`    … and ${commits.length - 30} more`);
  if (!why && FORK.code === 0 && git("merge-base", "--is-ancestor", FORK.out, sha).code !== 0) {
    console.log(`  · ${MAIN} has moved past the baseline (they fork at ${short(FORK.out)}): normal once this lane has pushed, and the list above is still every served commit in between.`);
  }
  if (baseline.base?.dirty?.length) console.log(`  ⚠ the baseline was captured over ${baseline.base.dirty.length} uncommitted change(s): ${baseline.base.dirty.slice(0, 4).join(" · ")}`);
}

const b = await chromium.launch({ headless: true });
const BROWSER = b.version();
const t0 = Date.now();
console.log(`  Chromium ${BROWSER}`);
if (baseline && baseline.server?.browser !== BROWSER) console.log(`  ⚠ the baseline was captured with Chromium ${baseline.server?.browser}; this run uses ${BROWSER} — geometry may move for reasons outside S6.`);

/** React has hydrated the shell: its host nodes carry a fiber. The 3 s overlay clock starts here, not at first paint. */
const hydrated = (page) => page.waitForFunction(() => {
  const el = document.querySelector("header") ?? document.querySelector("main");
  return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
}, null, { timeout: 120_000 });
async function applyPlant(page, plant) {
  if (plant?.css) await page.addStyleTag({ content: plant.css });
  if (plant?.js) await page.evaluate(plant.js);
}
async function open(page, route, plant) {
  const res = await page.goto(BASE + route, { waitUntil: "load", timeout: 180_000 });
  // The bytes the server sent, read before anything replaces the document: hydration removes what streamed first.
  const body = res ? await res.text().catch(() => null) : null;
  await page.locator("main").first().waitFor({ timeout: 120_000 });
  await hydrated(page);
  await applyPlant(page, plant);
  await page.waitForTimeout(3000);
  // A redirect the CLIENT carried out after load lands on another document: it gets the same 3 s.
  if (res && pathOf(page.url()) !== pathOf(res.url())) {
    await page.waitForLoadState("load").catch(() => {});
    await page.locator("main").first().waitFor({ timeout: 120_000 });
    await hydrated(page);
    await applyPlant(page, plant).catch(() => {});
    await page.waitForTimeout(3000);
  }
  return { status: res ? res.status() : 0, body };
}
const localeCookie = (locale) => ({ name: "kp-locale", value: locale, domain: HOST, path: "/" });

/** One cell, in a FRESH context — a context carried across cells accumulates visits, and the overlays count visits. */
async function capture(jar, locale, width, route, plant = null) {
  const ctx = await b.newContext({ viewport: { width, height: HEIGHT } });
  const pageErrors = [];
  try {
    await ctx.addCookies([...jar, localeCookie(locale)]);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => pageErrors.push(norm(msg(e)).slice(0, 160)));
    const { status, body } = await open(page, route, plant);
    const args = { crest: CREST, props: PROPS, animated: ANIMATED, notFound: route === "/account" || route === NOT_FOUND, pageBody: jar.length > 0 && route === BODY_ROUTE };
    let snap = await page.evaluate(SNAPSHOT, args);
    let stable = false;
    for (let i = 0; i < 6 && !stable; i++) {
      await page.waitForTimeout(700);
      const next = await page.evaluate(SNAPSHOT, args);
      stable = JSON.stringify(next) === JSON.stringify(snap);
      snap = next;
    }
    // ⭐ ROBOTS FROM THE BYTES THE SERVER SENT, NOT THE LIVE DOCUMENT. Calibration (two servers, one tree) found the held
    // viewer's not-found page ending with two "index, follow" metas on one run and "noindex" on the other: the client
    // replaces head metadata after load. A crawler reads the response, so that is what §3.3 holds to.
    if (snap.notFound && body) {
      snap = { ...snap, notFound: { ...snap.notFound, robots: [...body.matchAll(/<meta name="robots" content="([^"]*)"/g)].map((m) => m[1]).sort() } };
    }
    const pass = (await ctx.cookies(BASE)).some((c) => c.name === "kp_preview");
    return toCell(snap, { status, stable, pass, raw: rawOf(body), pageErrors: [...new Set(pageErrors)].sort() });
  } catch (e) {
    return { error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** Signs a viewer in through its real door (qa-journey-preview §3) and returns ONLY the session cookie. */
async function signIn(v) {
  if (!v.door) return [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${v.door}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await p.waitForLoadState("domcontentloaded");
    await p.locator("main").first().waitFor({ timeout: 120_000 });
    await p.waitForTimeout(900);
    const jar = (await ctx.cookies(BASE)).filter((c) => c.name === "kp_session");
    ok(`1.${v.id} ${v.who} is signed in (a kp_session cookie in the jar)`, jar.length === 1);
    return jar;
  } catch (e) {
    ok(`1.${v.id} ${v.who} is signed in`, false, msg(e));
    return [];
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** Every route once, uncaptured: the dev server compiles on first request, and a compile is not what is measured. */
async function warm(jar, routes) {
  const ctx = await b.newContext({ viewport: { width: 360, height: HEIGHT } });
  try {
    await ctx.addCookies([...jar, localeCookie("en")]);
    const page = await ctx.newPage();
    for (const r of routes) await open(page, r, null).catch(() => {});
  } catch {
    // A warm-up that fails is not a finding; the capture of the same route reports it.
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** WP10 · gives the signed-in demo player a portfolio through the real money paths, and names an open ticket's question. */
async function seedHolder(jar, beforeSeed = null) {
  const ctx = await b.newContext();
  try {
    await ctx.addCookies(jar);
    const real = await ctx.request.post(`${BASE}/api/dev-test/seed-real-markets`, { data: {} });
    const realBody = await real.json().catch(() => null);
    if (!real.ok() || !realBody?.ok) return { error: `seed-real-markets answered ${real.status()}` };
    // The pages compile BEFORE the free window starts: a dev server's first request to a route can take a minute.
    if (beforeSeed) await beforeSeed(realBody.live?.[0]?.id ?? null);
    const at = Date.now();
    const res = await ctx.request.post(`${BASE}/api/dev-test/seed-player-portfolio`, { data: { markets: 5 } });
    const body = await res.json().catch(() => null);
    // The seed's first question is left OPEN (its plan for five: four open, one sold), and it is the one the cells read.
    const held = body?.marketIds?.[0];
    if (!res.ok() || !body?.ok || typeof held !== "string") return { error: `seed-player-portfolio answered ${res.status()}: ${JSON.stringify(body).slice(0, 200)}` };
    return { held, at, open: body.byStatus?.OPEN ?? 0, refusals: body.refusals ?? [] };
  } catch (e) {
    return { error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * WP10 · one Sell cell, in a FRESH context: the open ticket's strip and button where a classic holder meets them — and,
 * in a confirm cell, the classic confirm the button opens. ⛔ It is never confirmed: only Enter or the gold button sells,
 * and neither is touched; the context closes with the dialog open.
 */
async function captureSellCell(jar, locale, width, place, held, plant = null) {
  const ctx = await b.newContext({ viewport: { width, height: HEIGHT } });
  const pageErrors = [];
  try {
    await ctx.addCookies([...jar, localeCookie(locale)]);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => pageErrors.push(norm(msg(e)).slice(0, 160)));
    const { status, body } = await open(page, routeOfPlace(place, held), plant);
    const args = { crest: CREST, props: PROPS, animated: ANIMATED, notFound: false, pageBody: false, sell: { held, place } };
    let snap = await page.evaluate(SNAPSHOT, args);
    let stable = false;
    for (let i = 0; i < 6 && !stable; i++) {
      await page.waitForTimeout(700);
      const next = await page.evaluate(SNAPSHOT, args);
      stable = JSON.stringify(next.sell) === JSON.stringify(snap.sell) && JSON.stringify(next.journey) === JSON.stringify(snap.journey);
      snap = next;
    }
    const sell = { ...snap.sell };
    let confirmLive;
    if (confirmCell(width, place)) {
      // The one classic surface whose words WP10 now hands through `??`: pressed open, read inside its quote hold.
      await page.locator("#main-content .ticket-target > button").first().click();
      await page.locator(CONFIRM_GOLD).first().waitFor({ timeout: 5_000 });
      const cargs = { ...args, sell: null, confirm: true };
      let c = await page.evaluate(SNAPSHOT, cargs);
      let still = false;
      for (let i = 0; i < 6 && !still; i++) {
        await page.waitForTimeout(700);
        const next = await page.evaluate(SNAPSHOT, cargs);
        still = JSON.stringify(next.confirm) === JSON.stringify(c.confirm);
        c = next;
      }
      sell.confirm = c.confirm.region;
      confirmLive = c.confirm.live;
      stable = stable && still;
    }
    const regions = {};
    for (const [name, r] of Object.entries(sell)) {
      regions[name] = r.count === 0 ? { count: 0, html: null, layout: null } : {
        count: r.count,
        html: put(norm(r.html)),
        layout: put(r.lines.map(([path, geo, sig]) => `${path} ${geo} ${put(norm(sig))}`).join(NL)),
      };
    }
    return {
      status, stable, landed: snap.url.split(held).join(":held"), regions, journey: snap.journey, raw: rawOf(body),
      ...(confirmLive === undefined ? {} : { confirmLive }),
      pageErrors: [...new Set(pageErrors)].sort(),
    };
  } catch (e) {
    return { error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** WP10 · the Sell capture: the demo player is given an open ticket through the real money paths, then every Sell cell. */
async function captureSell() {
  console.log(`${NL}§1s · the Sell button a classic holder is served (WP10): the demo player's open ticket, at ${SELL.widths.join("/")} × ${SELL.locales.join("/")}, and the classic confirm at ${SELL_CONFIRM.width} in the holder block`);
  const keys = [];
  for (const l of SELL.locales) for (const w of SELL.widths) for (const place of SELL.places) keys.push([keyOf("sell", l, w, place), l, w, place]);
  const jar = await signIn(VIEWERS.find((v) => v.id === "player"));
  if (!jar.length) { for (const [k] of keys) sellCells[k] = { error: "the viewer could not be signed in" }; return; }
  sellSeed = await seedHolder(jar, (anyMarket) => warm(jar, ["/positions", ...(anyMarket ? [`/markets/${anyMarket}`] : [])]));
  if (sellSeed.error || !sellSeed.held) { for (const [k] of keys) sellCells[k] = { error: `the seed: ${sellSeed.error ?? "no open ticket"}` }; return; }
  for (const [k, l, w, place] of keys) {
    sellCells[k] = await captureSellCell(jar, l, w, place, sellSeed.held);
    if (sellCells[k].error) console.log(`  ✗ ${k} — ${sellCells[k].error}`);
  }
  sellSeed.lastCellMs = Date.now() - sellSeed.at;
  console.log(`  ${keys.length} Sell cells · the last captured ${secs(sellSeed.lastCellMs)} after the seed (a default poll's free window is 5:00; §S.2 fails a cell that missed it)`);
}

/** Report only (WP0 step 4): how far the classic signed-in header runs past a 320 viewport. Not S6's to fix. */
async function header320(jar) {
  const out = {};
  for (const l of LOCALES) {
    const ctx = await b.newContext({ viewport: { width: 320, height: HEIGHT } });
    try {
      await ctx.addCookies([...jar, localeCookie(l)]);
      const page = await ctx.newPage();
      await open(page, "/", null);
      out[l] = await page.evaluate(() => {
        const h = document.querySelector("header.app-topbar");
        if (!h) return null;
        const vw = document.documentElement.clientWidth;
        let right = 0, rightmost = "";
        for (const el of h.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && r.right > right) { right = r.right; rightmost = el.getAttribute("aria-label") || el.getAttribute("data-testid") || el.tagName.toLowerCase(); }
        }
        const row = h.firstElementChild;
        return { viewport: vw, pastRight: Math.round((right - vw) * 10) / 10, rightmost, rowOverflow: row ? row.scrollWidth - row.clientWidth : null };
      });
    } catch (e) {
      out[l] = { error: msg(e) };
    } finally {
      await ctx.close().catch(() => {});
    }
  }
  return out;
}

const cells = {};
/** WP10 · the Sell capture's cells (keyed `sell|locale|width|place`) and the seed that made the open ticket. */
const sellCells = {};
let sellSeed = null;
let report320 = null;
let treeMoved = null;
try {
  if (PROVE_RED) await proveRed();
  else await captureMatrix();
} finally {
  await b.close();
}

async function captureMatrix() {
  const still = (when) => { if (!treeMoved && treePrint() !== PRINT0) treeMoved = `the served files changed ${when}`; };
  for (const v of VIEWERS) {
    console.log(`\n§1 · ${v.who}`);
    const jar = await signIn(v);
    if (v.door && !jar.length) {
      for (const l of LOCALES) for (const w of WIDTHS) for (const r of ROUTES) cells[keyOf(v.id, l, w, r)] = { error: "the viewer could not be signed in" };
      continue;
    }
    if (v.id === "guest" || v.id === "player") await warm(jar, ROUTES);
    for (const l of LOCALES) {
      const t = Date.now();
      for (const w of WIDTHS) {
        for (const r of ROUTES) {
          const k = keyOf(v.id, l, w, r);
          cells[k] = await capture(jar, l, w, r);
          if (cells[k].error) console.log(`  ✗ ${k} — ${cells[k].error}`);
        }
      }
      console.log(`  ${v.id} · ${l} · ${WIDTHS.length * ROUTES.length} cells · ${secs(Date.now() - t)}`);
      still(`by the end of ${v.id} · ${l}`);
    }
    if (BASELINE && v.id === "player") report320 = await header320(jar);
  }
  // WP10 · the Sell capture comes last: it gives the demo player a portfolio, and every cell above read it empty.
  await captureSell();
  still("by the end of the capture");
}

async function proveRed() {
  console.log(`\n§P · the control — first on synthetic captures, then planted in the browser`);
  // ① The EXPECTED_DIFFS matcher: it must pass what it names and nothing beside it.
  const store = { f1: '<footer class="pad-old">x</footer>', f2: '<footer class="pad-new">x</footer>', f3: '<footer class="pad-new">y</footer>' };
  const cell = (status, footer) => ({ status, landed: "/", overlays: [], journey: [], raw: { shell: true, trace: [] }, pageErrors: [], footerPaddingBottom: "88px", scrollPaddingBottom: "auto", regions: { footer: { count: 1, html: footer, layout: null } } });
  const run = (route, a, c, list = EXPECTED_DIFFS) => diffCells(route, a, c, store, store, list);
  const same = run("/", cell(200, "f1"), cell(200, "f1"));
  ok("P.1 identical cells differ in nothing", same.unexpected.length === 0 && same.expected.length === 0);
  const named = run("/account", cell(404, "f1"), cell(200, "f1"));
  ok("P.2 /account 404 → 200 is the named expected difference, not a failure", named.unexpected.length === 0 && named.expected.map((e) => e.id).join() === "account-streams-200", JSON.stringify(named));
  const wrongTo = run("/account", cell(404, "f1"), cell(500, "f1"));
  ok("P.3 …and /account 404 → 500 stays a failure (an entry is one transition, not a wildcard)", wrongTo.unexpected.length === 1 && wrongTo.unexpected[0].field === "status");
  const wrongRoute = run("/markets", cell(404, "f1"), cell(200, "f1"));
  ok("P.4 …and 404 → 200 on any other route stays a failure (the entry is scoped to /account)", wrongRoute.unexpected.length === 1);
  // The robots entry, held the same way: its one transition on /account passes; another value, or the same change on
  // the control path, stays a failure.
  const nf = (robots) => ({ ...cell(200, "f1"), notFound: { title: "Page not found · 404", robots, main: "404 Page not found" } });
  const pair = ["index, follow", "noindex"];
  const robotsNamed = run("/account", nf(pair), nf(["noindex", "noindex, nofollow"]));
  const robotsOther = run("/account", nf(pair), nf(["index, follow"]));
  const robotsElsewhere = run(NOT_FOUND, nf(pair), nf(["noindex", "noindex, nofollow"]));
  ok("P.4b /account's robots pair → 'noindex' + 'noindex, nofollow' is the named difference; another value, or the same change on the control path, stays a failure",
    robotsNamed.unexpected.length === 0 && robotsNamed.expected.map((e) => e.id).join() === "account-robots-noindex"
      && robotsOther.unexpected.length === 1 && robotsElsewhere.unexpected.length === 1,
    JSON.stringify({ robotsNamed, robotsOther, robotsElsewhere }).slice(0, 300));
  const SUB = [{ id: "control-footer-class", field: "regions.footer.html", replace: [['class="pad-old"', 'class="pad-new"']], reason: "the control" }];
  const subOnly = run("/", cell(200, "f1"), cell(200, "f2"), SUB);
  const subPlus = run("/", cell(200, "f1"), cell(200, "f3"), SUB);
  ok("P.5 a recorded substitution is expected, and a second change beside it is still caught",
    subOnly.unexpected.length === 0 && subOnly.expected.length === 1 && subPlus.unexpected.length === 1, JSON.stringify({ subOnly, subPlus }).slice(0, 300));
  const e0 = EXPECTED_DIFFS[0];
  const hits = (n) => new Map([[e0.id, n]]);
  ok(`P.6 a named difference seen in part of its population is reported (§4.2), and in all or none of it is not`,
    partialExpected(hits(e0.cells - 1)).length === 1 && partialExpected(hits(e0.cells)).length === 0 && partialExpected(new Map()).length === 0);
  // ①b S6 A8b · the one named Sell difference, held the same way: the classic button's free row as a capture serialises it,
  // before and after its free note gains the narrow-phone classes. The transition passes at both Sell places in en and in
  // sw; a second change beside it, or the same change off the Sell places, stays a failure.
  const sellStore = {};
  const sellCell = (html) => {
    const id = `b${Object.keys(sellStore).length}`;
    sellStore[id] = html;
    return { ...cell(200, "f1"), landed: SELL_PLACES[0], regions: { button: { count: 1, html: id, layout: null } } };
  };
  const sellButtonHtml = (label, note, narrow, figure = "TZS 3,600") => `<button type="button" class="btn btn-primary btn-md w-full whitespace-normal"><span>${label}</span><span class="font-mono tabular-nums">${figure}<span class="${narrow ? "ml-1.5 hidden opacity-80 text-[11px] xs:inline" : "ml-1.5 opacity-80 text-[11px]"}">${note}</span></span></button>`;
  const sellRuns = [["en", "Free exit", "full refund"], ["sw", "Toka bila gharama", "pesa yote"]].map(([l, label, note]) => {
    const was = sellCell(sellButtonHtml(label, note, false));
    const now = sellCell(sellButtonHtml(label, note, true));
    const plus = sellCell(sellButtonHtml(label, note, true, "TZS 3,601"));
    const diff = (place, a, b) => diffCells(place, a, b, sellStore, sellStore, SELL_EXPECTED_DIFFS);
    return { l, named: SELL_PLACES.map((p) => diff(p, was, now)), plus: diff(SELL_PLACES[0], was, plus), elsewhere: diff("/", was, now) };
  });
  ok("P.5s S6 A8b's named Sell difference — the classic button's free note gaining its narrow-phone classes — passes at both Sell places in en and in sw, while a second change beside it, or the same change off the Sell places, stays a failure",
    sellRuns.every((r) => r.named.every((d) => d.unexpected.length === 0 && d.expected.map((e) => e.id).join() === "sell-narrow-phone")
      && r.plus.unexpected.length === 1 && r.elsewhere.unexpected.length === 1),
    JSON.stringify(sellRuns).slice(0, 400));

  // ② The checks of §2 and §3: a clean synthetic capture passes them all, and each plant turns exactly its own one red.
  const S = syntheticCapture();
  const red = (m, loaders = []) => ({
    2: populationChecks(m.cells, m.store).filter((x) => x.fails.length).map((x) => x.id),
    3: accountChecks(m.cells, loaders).filter((x) => x.fails.length).map((x) => x.id),
  });
  const base = red(S);
  ok("P.7 a clean synthetic capture passes every check in §2 and §3", !base[2].length && !base[3].length, JSON.stringify(base));
  const at = (m, v, l, w, r) => m.cells[keyOf(v, l, w, r)];
  const nothing = () => ({ count: 0, html: null, layout: null });
  const FLOOR_PLANTS = [
    ["2.0", "a cell that did not capture", (m) => { m.cells[keyOf("guest", "en", 768, "/markets")] = { error: "planted" }; }],
    ["2.0", "a cell missing from the matrix", (m) => { delete m.cells[keyOf("guest", "sw", 768, "/wallet")]; }],
    ["2.1", "a cell without its header", (m) => { at(m, "player", "sw", 1024, "/markets").regions.header = nothing(); }],
    ["2.1", "a cell with two rails", (m) => { at(m, "guest", "en", 360, "/").regions.rail.count = 2; }],
    ["2.2", "a cell that never settled", (m) => { at(m, "guest", "sw", 1280, "/").stable = false; }],
    ["2.3", "a viewer carrying a preview pass", (m) => { at(m, "player", "en", 768, "/").pass = true; }],
    ["2.4", "a journey test id in the page", (m) => { at(m, "player", "en", 360, "/wallet").journey = ["testid:journey-tabs"]; }],
    ["2.4", "the journey flag on the page", (m) => { at(m, "held", "sw", 1280, "/markets").journey = ["html[data-journey]"]; }],
    ["2.5", "a journey test id in the raw HTML", (m) => { at(m, "guest", "en", 1024, "/").raw.trace = ["testid:journey-tabs"]; }],
    ["2.5", "raw HTML that could not be read", (m) => { at(m, "held", "sw", 360, "/markets").raw = null; }],
    ["2.5", "raw HTML that is not the shell", (m) => { at(m, "unverified", "sw", 768, "/").raw.shell = false; }],
    ["2.6", "a guest who stays on /wallet", (m) => { at(m, "guest", "en", 360, "/wallet").landed = "/wallet"; }],
    ["2.7", "a signed-in viewer sent to sign-in", (m) => { at(m, "held", "sw", 768, "/profile").landed = "/auth/login?next=%2Fprofile"; }],
    ["2.8", "a held viewer with the header deposit control", (m) => { at(m, "held", "en", 1280, "/").regions.header.html = "hdrDeposit"; }],
    ["2.8", "a player without it", (m) => { at(m, "player", "en", 1280, "/").regions.header.html = "hdr"; }],
    ["2.9", "the unconfirmed email without its bar", (m) => { at(m, "unverified", "en", 360, "/").regions.emailBar = nothing(); }],
    ["2.9", "the player shown the email bar", (m) => { at(m, "player", "en", 360, "/").regions.emailBar.count = 1; }],
    ["2.10", "no rail among the overlays at 360", (m) => { at(m, "guest", "sw", 360, "/markets").overlays = []; }],
    ["2.11", "a signed-in /positions without its body", (m) => { delete at(m, "player", "en", 768, "/positions").regions.main; }],
    ["3.0", "a control path answering 200", (m) => { at(m, "guest", "en", 360, NOT_FOUND).status = 200; }],
    ["3.0", "a not-found body too short to be one, on both paths", (m) => { at(m, "held", "sw", 1024, NOT_FOUND).notFound.main = "x"; at(m, "held", "sw", 1024, "/account").notFound.main = "x"; }],
    ["3.1", "/account with a body of its own", (m) => { at(m, "player", "sw", 1280, "/account").notFound.main = "Akaunti · Salio · Arifa · Msaada · Pumzika · Jizuie"; }],
    ["3.2", "/account under a title of its own", (m) => { at(m, "held", "en", 768, "/account").notFound.title = "Akaunti · 50pick"; }],
    ["3.3", "/account without noindex", (m) => { at(m, "unverified", "sw", 1024, "/account").notFound.robots = ["index, follow"]; }],
    ["3.4", "/account with a journey test id in the page", (m) => { at(m, "guest", "en", 1280, "/account").journey = ["testid:journey-account-hub"]; }],
    ["3.5", "/account with a journey test id in its raw HTML", (m) => { at(m, "player", "en", 360, "/account").raw.trace = ["testid:journey-account-hub"]; }],
    ["3.6", "an account/loading file in the tree", null, ["src/app/account/loading.tsx"]],
  ];
  for (const [id, what, plant, loaders] of FLOOR_PLANTS) {
    const m = structuredClone(S);
    plant?.(m);
    const section = id.split(".")[0];
    const got = red(m, loaders)[section];
    ok(`P.check ${id} — ${what} turns ${id} red, and nothing else in §${section}`, got.join() === id, got.join(" ") || "nothing went red");
  }

  // ②b WP10 · the Sell capture's checks (§S): a clean synthetic capture passes them all, and each plant turns exactly its
  // own one red.
  const SS = syntheticSell();
  const sellRed = (m) => sellChecks(m.sell, m.seed, m.store).filter((x) => x.fails.length).map((x) => x.id);
  ok("P.7s a clean synthetic Sell capture passes every check in §S", sellRed(SS).length === 0, JSON.stringify(sellRed(SS)));
  const atSell = (m, l, w, place) => m.sell[keyOf("sell", l, w, place)];
  const SELL_FLOOR_PLANTS = [
    ["S.0", "a seed that placed no open ticket", (m) => { m.seed = { error: "planted" }; }],
    ["S.0", "a Sell cell missing from the capture", (m) => { delete m.sell[keyOf("sell", "sw", 360, SELL_PLACES[1])]; }],
    ["S.1", "a Sell cell that never settled", (m) => { atSell(m, "en", 1280, SELL_PLACES[0]).stable = false; }],
    ["S.1", "a Sell cell sent to sign-in", (m) => { atSell(m, "sw", 1280, SELL_PLACES[0]).landed = "/auth/login?next=%2Fpositions"; }],
    ["S.2", "a Sell cell captured after the free window closed (no strip)", (m) => { atSell(m, "en", 360, SELL_PLACES[1]).regions.strip = { count: 0, html: null, layout: null }; }],
    ["S.2", "a strip whose ticking clock was not read as m:ss", (m) => { m.store.stripRaw = "<div><span>Free exit</span><span>4:59</span></div>"; atSell(m, "sw", 360, SELL_PLACES[0]).regions.strip.html = "stripRaw"; }],
    ["S.2", "a confirm cell whose dialog never opened", (m) => { atSell(m, "en", 360, SELL_PLACES[1]).regions.confirm = { count: 0, html: null, layout: null }; }],
    ["S.2", "a confirm captured after its quote hold ran out (its gold button disabled)", (m) => { atSell(m, "sw", 360, SELL_PLACES[1]).confirmLive = false; }],
    ["S.3", "a journey trace in a Sell cell", (m) => { atSell(m, "en", 1280, SELL_PLACES[1]).journey = ["testid:journey-tabs"]; }],
  ];
  for (const [id, what, plant] of SELL_FLOOR_PLANTS) {
    const m = structuredClone(SS);
    plant(m);
    const got = sellRed(m);
    ok(`P.check ${id} — ${what} turns ${id} red, and nothing else in §S`, got.join() === id, got.join(" ") || "nothing went red");
  }

  // ③ The browser: the instrument agrees with itself, and sees each plant in its own field and nowhere else.
  const PLANTS = [
    { id: "height", css: "header.app-topbar { height: 64px !important; }", what: "the canvas's 64px bar in place of the kit's 56", need: "regions.header.layout", within: ["regions.header."] },
    { id: "paint", css: "header.app-topbar a { color: rgb(255, 0, 0) !important; }", what: "a paint-only change (the header's links turn red)", need: "regions.header.layout", within: ["regions.header."] },
    {
      id: "overlay",
      js: () => {
        const d = document.createElement("div");
        d.setAttribute("data-parity-plant", "");
        d.setAttribute("style", "position:fixed;right:0;bottom:120px;width:40px;height:40px;z-index:5;background:red");
        document.body.append(d);
      },
      what: "a new fixed overlay (a 40px square over the page's corner)", need: "overlays", within: ["overlays"],
    },
    { id: "footer", css: "#main-content + footer { padding-bottom: 0 !important; }", widths: [360], what: "the footer's rail clearance dropped", need: "footerPaddingBottom", within: ["footerPaddingBottom", "regions.footer."] },
  ];
  const inside = (field, prefixes) => prefixes.some((p) => field === p || field.startsWith(p));
  const PROVE_CELLS = [["guest", "en", 360, "/"], ["player", "sw", 1280, "/markets"], ["player", "en", 360, BODY_ROUTE]];
  const jars = {};
  for (const v of VIEWERS.filter((x) => PROVE_CELLS.some(([id]) => id === x.id))) {
    jars[v.id] = await signIn(v);
    await warm(jars[v.id], [...new Set(PROVE_CELLS.filter(([id]) => id === v.id).map(([, , , r]) => r))]);
  }
  for (const [vid, l, w, r] of PROVE_CELLS) {
    const k = keyOf(vid, l, w, r);
    if (VIEWERS.find((v) => v.id === vid)?.door && !jars[vid].length) { ok(`P.${k} the viewer is signed in`, false); continue; }
    const clean = await capture(jars[vid], l, w, r);
    const again = await capture(jars[vid], l, w, r);
    if (clean.error || again.error) { ok(`P.${k} the cell was captured`, false, clean.error ?? again.error); continue; }
    const noise = diffCells(r, clean, again, blobs, blobs).unexpected;
    ok(`P.${k} two clean captures agree — the instrument is deterministic on one server`, noise.length === 0, noise.slice(0, 3).map((d) => `${d.field}: ${d.detail}`).join(" | "));
    for (const plant of PLANTS) {
      if (plant.widths && !plant.widths.includes(w)) continue;
      const planted = await capture(jars[vid], l, w, r, plant);
      if (planted.error) { ok(`P.${k} ${plant.id} was captured`, false, planted.error); continue; }
      const seen = diffCells(r, clean, planted, blobs, blobs).unexpected;
      ok(`P.${k} ⭐ ${plant.what} is reported in ${plant.need}, and nowhere outside ${plant.within.join(" / ")}`,
        seen.some((d) => inside(d.field, [plant.need])) && seen.every((d) => inside(d.field, plant.within)),
        seen.length ? seen.slice(0, 2).map((d) => `${d.field}: ${d.detail}`).join(" | ").slice(0, 400) : "NOT SEEN — a compare with this harness proves nothing");
    }
  }

  // ④ WP10 · the Sell capture in the browser, after every cell above (they read the demo portfolio empty): the player is
  // given an open ticket; at BOTH places a classic holder is sold to, two clean captures of a Sell cell agree inside its
  // free window (in the holder block, with the classic confirm captured inside its quote hold); and a planted change to
  // the button, to the strip and to the confirm is each reported in its own region and nowhere else.
  const holder = jars.player ?? [];
  const seeded = holder.length
    ? await seedHolder(holder, (anyMarket) => warm(holder, ["/positions", ...(anyMarket ? [`/markets/${anyMarket}`] : [])]))
    : { error: "the demo player is not signed in" };
  ok("P.sell the demo player is given an open ticket through the real money paths", !seeded.error && !!seeded.held, seeded.error ?? "");
  if (!seeded.error && seeded.held) {
    const SELL_PROVE = [
      { l: "sw", w: 360, place: SELL_PLACES[1], plants: [
        { id: "sell-button", css: "#main-content .ticket-target > button { letter-spacing: 2px !important; }", what: "the holder block's Sell button letters spaced out", need: "regions.button.layout", within: ["regions.button."] },
        { id: "sell-strip", css: '#main-content .ticket-target > div[class~="mb-1.5"] { color: rgb(255, 0, 0) !important; }', what: "the holder block's free strip re-inked", need: "regions.strip.layout", within: ["regions.strip."] },
        { id: "sell-confirm", css: '[role="dialog"] p { letter-spacing: 2px !important; }', what: "the classic confirm's words spaced out", need: "regions.confirm.layout", within: ["regions.confirm."] },
      ] },
      { l: "en", w: 1280, place: SELL_PLACES[0], plants: [
        { id: "positions-button", css: "#main-content div:has(> a[data-row-id]) > button { letter-spacing: 2px !important; }", what: "the /positions card's Sell button letters spaced out", need: "regions.button.layout", within: ["regions.button."] },
        { id: "positions-strip", css: '#main-content div:has(> a[data-row-id]) > div[class~="mb-1.5"] { color: rgb(255, 0, 0) !important; }', what: "the /positions card's free strip re-inked", need: "regions.strip.layout", within: ["regions.strip."] },
      ] },
    ];
    for (const { l, w, place, plants } of SELL_PROVE) {
      const k = keyOf("sell", l, w, place);
      const clean = await captureSellCell(holder, l, w, place, seeded.held);
      const again = await captureSellCell(holder, l, w, place, seeded.held);
      if (clean.error || again.error) { ok(`P.${k} the Sell cell was captured`, false, clean.error ?? again.error); continue; }
      const noise = diffCells(place, clean, again, blobs, blobs, SELL_EXPECTED_DIFFS).unexpected;
      const confirmOk = !confirmCell(w, place) || (clean.regions.confirm?.count === 1 && clean.confirmLive === true);
      ok(`P.${k} two clean captures of a Sell cell agree, inside the free window (the strip's clock read as m:ss)${confirmCell(w, place) ? ", the classic confirm captured inside its quote hold" : ""}`,
        noise.length === 0 && clean.regions.strip.count === 1 && clean.regions.button.count === 1 && confirmOk,
        noise.length ? noise.slice(0, 3).map((d) => `${d.field}: ${d.detail}`).join(" | ") : `strip ${clean.regions.strip.count} · button ${clean.regions.button.count} · confirm ${clean.regions.confirm?.count ?? "-"}`);
      for (const plant of plants) {
        const planted = await captureSellCell(holder, l, w, place, seeded.held, plant);
        if (planted.error) { ok(`P.${k} ${plant.id} was captured`, false, planted.error); continue; }
        const seen = diffCells(place, clean, planted, blobs, blobs, SELL_EXPECTED_DIFFS).unexpected;
        ok(`P.${k} ⭐ ${plant.what} is reported in ${plant.need}, and nowhere outside ${plant.within.join(" / ")}`,
          seen.some((d) => inside(d.field, [plant.need])) && seen.every((d) => inside(d.field, plant.within)),
          seen.length ? seen.slice(0, 2).map((d) => `${d.field}: ${d.detail}`).join(" | ").slice(0, 400) : "NOT SEEN — a Sell compare with this harness proves nothing");
      }
    }
  }
}

// ── what every capture must show, in every mode that captures the matrix ──────────────────────────────────
if (!PROVE_RED) {
  console.log(`\n§2 · the population is what it claims`);
  for (const c of populationChecks(cells, blobs)) ok(`${c.id} ${c.name}`, c.fails.length === 0, listOf(c.fails));
  ok("2.12 the served files held still for the whole capture (checked after every viewer and language)", !treeMoved, treeMoved ?? "");

  console.log(`\n§3 · /account, for a viewer the journey is not shown to, is the not-found page (A3 — every run)`);
  for (const c of accountChecks(cells, accountLoaders())) ok(`${c.id} ${c.name}`, c.fails.length === 0, listOf(c.fails));

  console.log(`${NL}§S · the Sell button a classic holder is served (WP10 — every run that captures)`);
  for (const c of sellChecks(sellCells, sellSeed, blobs)) ok(`${c.id} ${c.name}`, c.fails.length === 0, listOf(c.fails));

  if (COMPARE) {
    console.log(`\n§4 · parity with the baseline (${short(baseline.base.sha)}, captured ${baseline.base.capturedAt})`);
    const baseKeys = Object.keys(baseline.cells).sort(), curKeys = Object.keys(cells).sort();
    ok("4.0 the same cells as the baseline", JSON.stringify(baseKeys) === JSON.stringify(curKeys), `${baseKeys.length} vs ${curKeys.length}`);
    const hits = new Map();
    let differing = 0, compared = 0, shown = 0;
    for (const k of curKeys) {
      const was = baseline.cells[k], now = cells[k];
      if (!was || was.error || now.error) continue;
      compared++;
      const { unexpected, expected } = diffCells(partsOf(k).r, was, now, baseline.blobs, blobs);
      for (const e of expected) hits.set(e.id, (hits.get(e.id) ?? 0) + 1);
      if (!unexpected.length) continue;
      differing++;
      if (shown++ < 40) for (const d of unexpected.slice(0, 3)) console.log(`  ✗ ${k} — ${d.field}: ${d.detail}`.slice(0, 600));
    }
    if (shown > 40) console.log(`  … and ${shown - 40} more cell(s)`);
    ok(`4.1 ⭐ no unexpected difference in ${compared} cells`, compared === curKeys.length && differing === 0, differing ? `${differing} cell(s) differ` : "");
    ok("4.2 each named difference is seen in all of its cells or in none", partialExpected(hits).length === 0, partialExpected(hits).join(" · "));
    for (const e of EXPECTED_DIFFS) console.log(`  EXPECTED ${e.id} — seen in ${hits.get(e.id) ?? 0} of ${e.cells} cell(s). ${e.reason}`);
    // ⭐ WP10 · the Sell cells against the baseline's (A8: a default poll with an hour to run compares equal; any other
    // difference is a named entry in SELL_EXPECTED_DIFFS, never a re-baseline).
    const sellBase = baseline.sell ?? {};
    const sellBaseKeys = Object.keys(sellBase).sort(), sellCurKeys = Object.keys(sellCells).sort();
    ok("4.3 the same Sell cells as the baseline", sellCurKeys.length > 0 && JSON.stringify(sellBaseKeys) === JSON.stringify(sellCurKeys), `${sellBaseKeys.length} vs ${sellCurKeys.length}`);
    const sellHits = new Map();
    let sellDiffering = 0, sellCompared = 0;
    for (const k of sellCurKeys) {
      const was = sellBase[k], now = sellCells[k];
      if (!was || was.error || now.error) continue;
      sellCompared++;
      const { unexpected, expected } = diffCells(partsOf(k).r, was, now, baseline.blobs, blobs, SELL_EXPECTED_DIFFS);
      for (const e of expected) sellHits.set(e.id, (sellHits.get(e.id) ?? 0) + 1);
      if (!unexpected.length) continue;
      sellDiffering++;
      for (const d of unexpected.slice(0, 3)) console.log(`  ✗ ${k} — ${d.field}: ${d.detail}`.slice(0, 600));
    }
    ok(`4.4 ⭐ no unexpected difference in the ${sellCompared} Sell cells: a classic holder is sold to by today's Sell button and confirm`,
      sellCompared > 0 && sellCompared === sellCurKeys.length && sellDiffering === 0, sellDiffering ? `${sellDiffering} Sell cell(s) differ` : "");
    ok("4.5 each named Sell difference is seen in all of its cells or in none", partialExpected(sellHits, SELL_EXPECTED_DIFFS).length === 0,
      partialExpected(sellHits, SELL_EXPECTED_DIFFS).join(" · "));
    if (differing || sellDiffering) {
      const side = `${COMPARE}.current.json`;
      writeFileSync(side, `${JSON.stringify({ kind: KIND, version: VERSION, role: "compare-capture", base: { sha: HEAD.out, tree: TREE, dirty: DIRTY }, matrix: MATRIX, cells, sell: sellCells, blobs })}${NL}`, "utf8");
      console.log(`  this run's capture, for reading beside the baseline: ${side}`);
    }
  }

  if (BASELINE) {
    console.log(`\n§R · report only — the classic signed-in header at 320 (DESIGN_AUTHORITY files it as 21px over)`);
    for (const [l, r] of Object.entries(report320 ?? {})) {
      console.log(r && !r.error ? `  ${l} · the header's content ends ${r.pastRight}px past the ${r.viewport}px viewport (rightmost: ${r.rightmost}); its row overflows by ${r.rowOverflow}px` : `  ${l} · not measured — ${r?.error ?? "no header"}`);
    }
    const failedSoFar = results.some((r) => !r);
    const target = failedSoFar ? `${BASELINE}.rejected.json` : BASELINE;
    const doc = {
      kind: KIND, version: VERSION, role: "baseline", rejected: failedSoFar,
      base: { sha: HEAD.out, main: MAIN, fork: FORK.code === 0 ? FORK.out : null, tree: TREE, dirty: DIRTY, capturedAt: new Date().toISOString() },
      server: { base: BASE, rollout, store: health.store ?? null, browser: BROWSER },
      matrix: MATRIX, expectedDiffs: EXPECTED_DIFFS.map((e) => e.id), report: { header320: report320 },
      cells, sell: sellCells, seed: sellSeed, blobs,
    };
    writeFileSync(target, `${JSON.stringify(doc)}${NL}`, "utf8");
    console.log(failedSoFar
      ? `\n⛔ baseline NOT written — a check above failed, and a baseline is only as good as its population. The capture is in ${target} for reading; --compare refuses it.`
      : `\nbaseline written: ${BASELINE} — base ${short(HEAD.out)}, ${Object.keys(cells).length} cells, ${Object.keys(blobs).length} blobs. Next: a null --compare on a FRESH server at this commit must exit 0.`);
  }
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed — ${MODE} · tree ${short(HEAD.out)}${baseOverridden ? " · ⚠ BASE OVERRIDDEN (--allow-base)" : ""} · ${secs(Date.now() - t0)}`);
process.exit(failed ? 1 : 0);
