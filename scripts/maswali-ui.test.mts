/**
 * test:maswali-ui — THE MILLIONEA PAGES AS COMPOSED (MASWALI-BUILD S5 pages; MASWALI-PLAN §7b S5 items 1–6; the
 * composition brief's item 7).
 *
 *   npx tsx scripts/maswali-ui.test.mts     (npm run test:maswali-ui)
 *
 *   §1 the seven routes: each a page, a loading file and a client error boundary with its way back; every loading
 *      drawing WORDLESS (the S5 review of 24ec0d33, HIGH 2: it streams before any gate, so it may name nothing)
 *   §2 the gates: every page asks its gate before anything else; every title asks the door and never throws
 *   §3 L5: the tickets' gate admits the product's viewers and, while it is hidden, a HOLDER alone
 *   §4 the edge: a dark address answers the router's own 404 while the ceiling hides it — qa:live's routes included
 *   §5 the doors on other pages: the home and board card, More's first row, the /positions row
 *   §6 the slip: kept in the tab by week, bought only from the confirm's own press; the Needle and the chat stand down
 *   §7 a ticket's address: the pages name it exactly as the permalink does
 *   §8 its own controls: each source check below is seen to fail on a planted copy
 *   §9 round 3: Tiketi zangu and the register page on the platform's link pager; the hub and the ticket page read the
 *      week they name; the free cancel says whose page it was; /positions/performance reads each scored line directly
 *
 * Pure: it reads source files and runs the pure decision helpers. No server, no database, no network, no file written.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MILLIONEA_DARK_PATH, isMillioneaPath, isMillioneaTicketsPath, millioneaDarkAtEdge, millioneaEdgeAsks } from "../src/lib/millionea-edge.ts";
import { isCommitSurface, isJourneySurface, isMoneySurface, isSlipSurface } from "../src/lib/surfaces.ts";
import { millioneaTicketHref } from "../src/lib/position-permalink.ts";
import { MILLIONEA_ROUTES } from "./live/millionea-dark.mjs";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel: string) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n") : "");
/** Source with comments removed, through the one shared scanner (string-aware: "https://*.x" opens no comment) — a door
 *  or a call written only in a comment is none. */
const code = (src: string) => decomment(src);
const squash = (s: string) => s.replace(/\s+/g, " ");
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const APP = "src/app/millionea";
/** The seven routes, their folder under src/app/millionea, the gate each asks, and the door its title asks. */
const ROUTES: ReadonlyArray<{ route: string; dir: string; gate: "millioneaGate" | "millioneaTicketGate"; door: string }> = [
  { route: "/millionea", dir: "", gate: "millioneaGate", door: "if (!(await millioneaDoor()).visible) return notFoundMetadata();" },
  { route: "/millionea/slip", dir: "/slip", gate: "millioneaGate", door: "if (!(await millioneaDoor()).visible) return notFoundMetadata();" },
  { route: "/millionea/how", dir: "/how", gate: "millioneaGate", door: "if (!(await millioneaDoor()).visible) return notFoundMetadata();" },
  { route: "/millionea/register", dir: "/register", gate: "millioneaGate", door: "if (!(await millioneaDoor()).visible) return notFoundMetadata();" },
  { route: "/millionea/register/[week]", dir: "/register/[week]", gate: "millioneaGate", door: "if (!(await millioneaDoor()).visible) return notFoundMetadata();" },
  { route: "/millionea/tickets", dir: "/tickets", gate: "millioneaTicketGate", door: "if (!(await millioneaTicketsDoor())) return notFoundMetadata();" },
  { route: "/millionea/tickets/[serial]", dir: "/tickets/[serial]", gate: "millioneaTicketGate", door: "if (!(await millioneaTicketsDoor())) return notFoundMetadata();" },
];
const NOT_FOUND_IMPORT = 'import { generateMetadata as notFoundMetadata } from "@/app/not-found";';

/** The default export's body, from its signature to the end of the file. */
const bodyOf = (src: string) => { const at = src.indexOf("export default async function "); return at < 0 ? "" : src.slice(at); };
/** `generateMetadata` itself, its body cut at its own closing brace. */
const metaOf = (src: string) => {
  const at = src.indexOf("export async function generateMetadata(");
  if (at < 0) return "";
  const open = src.indexOf("{", src.indexOf(")", at));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(at, i + 1);
  }
  return "";
};

// ── §1 · the routes ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the seven routes, each a page, a loading file and a client error boundary");
const routeDefects = (readAt: (rel: string) => string) => ROUTES.flatMap(({ route, dir }) => {
  const d: string[] = [];
  const page = readAt(`${APP}${dir}/page.tsx`), loading = readAt(`${APP}${dir}/loading.tsx`), error = readAt(`${APP}${dir}/error.tsx`);
  if (!page) d.push(`${route}: no page.tsx`);
  if (!loading || !/export default (?:async )?function \w+\(/.test(loading)) d.push(`${route}: no loading file drawing a ghost`);
  if (!error.trimStart().startsWith('"use client";') || !error.includes("<RouteError") || !/back=\{\{ href: "\//.test(error)) {
    d.push(`${route}: the error boundary is not a client RouteError with its way back`);
  }
  if (/^["']use client["'];/.test(page.trimStart())) d.push(`${route}: the page is a client module`);
  return d;
});
{
  const d = routeDefects(read);
  ok("1.1 · every Millionea route has its page (a server module), a loading file that draws its ghost, and a client error boundary — the kit's RouteError with its way back", d.length === 0, d.join(" | "));
  ok("1.2 · the routes are the seven the plan names (MASWALI-PLAN §0), and the qa:live dark list names the five a visitor can type",
    ROUTES.length === 7 && ["/millionea", "/millionea/how", "/millionea/slip", "/millionea/tickets", "/millionea/register"].every((r) => (MILLIONEA_ROUTES as readonly string[]).includes(r)),
    j(MILLIONEA_ROUTES));
}
/** Every Millionea loading drawing: each route's loading file and ghost, derived from the folder, and the parts they are
 *  made of. */
const GHOST_FILES: string[] = (() => {
  const out: string[] = [];
  const walkDir = (rel: string) => {
    for (const n of readdirSync(join(ROOT, rel))) {
      const p = `${rel}/${n}`;
      if (statSync(join(ROOT, p)).isDirectory()) walkDir(p);
      else if (n === "loading.tsx" || n.endsWith("-ghost.tsx")) out.push(p);
    }
  };
  walkDir(APP);
  return [...out.sort(), "src/components/maswali/maswali-ghost.tsx"];
})();
/** ⛔ A loading drawing streams before any gate answers (the edge passes a signed-in reader to the tickets' gate even while
 *  Millionea is dark, L5), so it names nothing: no Millionea word read, no string or text that says the name, and no
 *  words "set and not shown" — transparent letters are still words in the document. */
const ghostWordDefects = (readAt: (rel: string) => string) => GHOST_FILES.flatMap((f) => {
  const c = code(readAt(f));
  const d: string[] = [];
  if (/\bt\.millionea\b/.test(c)) d.push(`${f}: reads a Millionea word (t.millionea)`);
  const strings = (c.replace(/\bfrom\s+"[^"]*"/g, "").match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g) ?? []).filter((s) => /millionea/i.test(s));
  if (strings.length > 0) d.push(`${f}: a string names Millionea (${strings.slice(0, 2).join(", ")})`);
  if (/>[^<>{}]*millionea[^<>{}]*</i.test(c)) d.push(`${f}: its text names Millionea`);
  if (/<GhostText\b|\b(?:weekWord|millioneaWord|productWeek|counted|fill)\(/.test(c)) d.push(`${f}: words set and not shown are still words`);
  return d;
});
{
  const d = ghostWordDefects(read);
  ok(`1.3 · every Millionea loading drawing is WORDLESS — bars and shapes, the screen reader's "loading" alone: no t.millionea key, no string or text naming Millionea, no words set and not shown (${GHOST_FILES.length} files)`,
    GHOST_FILES.length >= 15 && d.length === 0, d.join(" | "));
  const tl = code(read(`${APP}/tickets/loading.tsx`));
  ok("1.4 · Tiketi zangu's Millionea loading file is synchronous: it asks the server nothing before the tickets' gate answers",
    !/\basync\b|\bawait\b/.test(tl) && tl.includes("export default function MillioneaTicketsLoading() {") && tl.includes("return <MillioneaTicketsGhost />;"));
  const plant = (rel: string, from: string, to: string) => (r: string) => (r === rel ? read(r).replace(from, to) : read(r));
  const named = ghostWordDefects(plant(`${APP}/hub-ghost.tsx`, '<MaswaliGhostHead eyebrowWidth="w-[128px]" titleWidth="w-[248px]" />', '<MaswaliGhostHead titleWidth="w-[248px]" />{t.millionea.productTitle}'));
  ok("1.3′ CONTROL · the product's name read back into the hub's ghost is reported", named.some((x) => x.includes("hub-ghost.tsx") && x.includes("t.millionea")));
  const veiled = ghostWordDefects(plant(`${APP}/slip/slip-ghost.tsx`, '<GhostLine className="w-[264px]" />', "<GhostText>{\"Maswali Millionea\"}</GhostText>"));
  ok("1.3″ CONTROL · words set and not shown, or a string naming the product, in the slip's ghost are reported",
    veiled.some((x) => x.includes("set and not shown")) && veiled.some((x) => x.includes("a string names Millionea")));
}

// ── §2 · the gates ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · every page asks its gate first; every title asks the door and never throws");
const gateDefects = (readAt: (rel: string) => string) => ROUTES.flatMap(({ route, dir, gate, door }) => {
  const d: string[] = [];
  const page = code(readAt(`${APP}${dir}/page.tsx`));
  const body = bodyOf(page), meta = metaOf(page);
  const first = body.indexOf("await ");
  if (first < 0 || !body.startsWith(`await ${gate}();`, first)) d.push(`${route}: the first await of the page is not ${gate}()`);
  if (count(page, `${gate}(`) !== 1) d.push(`${route}: ${gate}() asked ${count(page, `${gate}(`)} times`);
  if (!meta.includes(door)) d.push(`${route}: the title does not ask the door first (${door})`);
  if (/millioneaGate\(|millioneaTicketGate\(|\bnotFound\(\)|\bredirect\(|\bthrow\b/.test(meta)) d.push(`${route}: the title can throw (a gate, notFound, redirect or throw)`);
  if (!page.includes(NOT_FOUND_IMPORT)) d.push(`${route}: the not-found's own metadata is not what a hidden title prints`);
  return d;
});
{
  const d = gateDefects(read);
  ok("2.1 · every page's first await is its gate (the tickets' own gate on the two ticket routes, L5), asked once; every generateMetadata asks the door's never-rejecting answer first and prints the not-found's own words for a hidden product — no gate, notFound(), redirect or throw beside the page (visual-pass-r5d 1.4″)",
    d.length === 0, d.join(" | "));
  const doors = read("src/lib/server/millionea-doors.ts");
  ok("2.2 · the two doors the titles ask catch every failure (a failure hides; nothing rejects beside the page)",
    /export const millioneaDoor = cache\(async \(\): Promise<MillioneaDoor> => \{\s*try \{/.test(doors)
      && /export const millioneaTicketsDoor = cache\(async \(\): Promise<boolean> => \{[\s\S]*?\} catch \{\s*return false;/.test(doors));
}

// ── §3 · L5 ────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · L5 — a kill hides the product, never a player's own tickets");
{
  // The decision is driven through the gate's own core; the 404 itself is next/navigation's and needs Next's runtime, so
  // the two wiring lines are pinned (as test:maswali-player 1.6 pins the route gate's).
  const { millioneaTicketAdmission } = await import("../src/lib/server/millionea-gate.ts");
  const holds = (who: Record<string, boolean>) => async (id: string) => who[id] === true;
  const broken = async () => { throw new Error("the store is down"); };
  const cases: Array<[string, boolean, string | null, (id: string) => Promise<boolean>, string]> = [
    ["the product visible — a guest", true, null, holds({}), "VISIBLE"],
    ["the product visible — a player holding none", true, "usr_none", holds({}), "VISIBLE"],
    ["hidden — a signed-out reader", false, null, holds({}), "NOT_FOUND"],
    ["hidden — a player holding none", false, "usr_none", holds({ usr_holder: true }), "NOT_FOUND"],
    ["hidden — a HOLDER", false, "usr_holder", holds({ usr_holder: true }), "HOLDER"],
    ["hidden — a holdings read that fails", false, "usr_holder", broken, "NOT_FOUND"],
  ];
  for (const [name, visible, userId, h, want] of cases) {
    const got = await millioneaTicketAdmission(visible, userId, h);
    ok(`3.1 · ${name} → ${want}`, got === want, `got ${got}`);
  }
  const gate = code(read("src/lib/server/millionea-gate.ts"));
  ok("3.2 · the tickets' gate turns NOT_FOUND into the 404 a missing page gives, and admits a holder as one (holder: true)",
    /const admitted = await millioneaTicketAdmission\(r\.visible, userId, holdsAMillioneaTicket\);\s*if \(admitted === "NOT_FOUND"\) notFound\(\);\s*return \{ \.\.\.r, userId, holder: admitted === "HOLDER" \};/.test(gate));
  const doors = code(read("src/lib/server/millionea-doors.ts"));
  ok("3.3 · Tiketi zangu's third kind and the /positions row ask the same decision (one rule for the door and the route)",
    doors.includes('millioneaTicketAdmission(false, userId,') && doors.includes('=== "HOLDER"'));
  // The lead's L5 list (2026-10-18): WITHDRAWN with an owner (3.1 HOLDER), with a stranger (3.1 NOT_FOUND, and 3.4 for a
  // stranger who holds tickets of their own), and signed out (3.1, and the edge's 404 in §4).
  const ticketPage = squash(code(read(`${APP}/tickets/[serial]/page.tsx`)));
  ok("3.4 · a signed-in stranger — holding none, or holding tickets of their own — meets the same 404 as an unknown serial at every state: the ticket read is the owner's, and null is one answer for both (no existence oracle, MB-95)",
    ticketPage.includes("const view = await millioneaTicket(gate.userId, serial, now); if (!view) notFound();"));
  const permalink = squash(code(read("src/app/positions/[positionId]/page.tsx")));
  const ownerFirst = permalink.indexOf("if (!position || position.userId !== session.userId) notFound();");
  ok("3.5 · the permalink sends the OWNER to their ticket at every rollout state (it asks no rollout) and 404s anyone else's position before it",
    !permalink.includes("resolveMillionea") && ownerFirst > 0 && ownerFirst < permalink.indexOf('if (productLine === "MASWALI") {'));
}

// ── §4 · the edge ──────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · the edge — a dark address answers the router's own 404 while the ceiling hides it");
{
  const yes = ["/millionea", "/millionea/slip", "/millionea/how", "/millionea/tickets", "/millionea/tickets/1043", "/millionea/register", "/millionea/register/2026-W42", "/legal/rules/millionea"];
  const no = ["/millioneas", "/millionea-x", "/markets", "/", "/legal/rules", "/legal/rules/millioneax", "/positions", "/positions/pos_1", "/_millionea-dark"];
  ok("4.1 · a Millionea address is the product's pages and its rules; a look-alike is not", yes.every(isMillioneaPath) && !no.some(isMillioneaPath),
    j({ missed: yes.filter((p) => !isMillioneaPath(p)), caught: no.filter(isMillioneaPath) }));
  ok("4.2 · the tickets are the list and one ticket", isMillioneaTicketsPath("/millionea/tickets") && isMillioneaTicketsPath("/millionea/tickets/1043")
    && !isMillioneaTicketsPath("/millionea") && !isMillioneaTicketsPath("/millionea/ticketsx"));
  type V = { signedIn: boolean; staff: boolean };
  const GUEST: V = { signedIn: false, staff: false }, PLAYER: V = { signedIn: true, staff: false }, STAFF: V = { signedIn: true, staff: true };
  const PAGES = ["/millionea", "/millionea/slip", "/millionea/how", "/millionea/register", "/millionea/register/2026-W42", "/legal/rules/millionea"];
  const TICKETS = ["/millionea/tickets", "/millionea/tickets/1043"];
  const table: Array<[string, "WITHDRAWN" | "STAFF_PREVIEW" | "ACTIVE", V, boolean, boolean]> = [
    // [who, ceiling, viewer, the pages dark?, the tickets dark?]
    ["a guest", "WITHDRAWN", GUEST, true, true],
    ["a player", "WITHDRAWN", PLAYER, true, false],
    ["staff", "WITHDRAWN", STAFF, true, false],
    ["a guest", "STAFF_PREVIEW", GUEST, true, true],
    ["a player", "STAFF_PREVIEW", PLAYER, true, false],
    ["staff", "STAFF_PREVIEW", STAFF, false, false],
    ["a guest", "ACTIVE", GUEST, false, false],
    ["a player", "ACTIVE", PLAYER, false, false],
    ["staff", "ACTIVE", STAFF, false, false],
  ];
  for (const [who, ceiling, viewer, pagesDark, ticketsDark] of table) {
    const wrong = [...PAGES.filter((p) => millioneaDarkAtEdge(p, viewer, ceiling) !== pagesDark), ...TICKETS.filter((p) => millioneaDarkAtEdge(p, viewer, ceiling) !== ticketsDark)];
    ok(`4.3 · ${ceiling}, ${who}: the pages ${pagesDark ? "answer 404" : "pass to their gate"}, the tickets ${ticketsDark ? "answer 404" : "pass to their gate"}`, wrong.length === 0, j(wrong));
  }
  ok("4.4 · ⛔ never a non-Millionea address, whatever the ceiling", ["/markets", "/positions", "/", "/wallet"].every((p) => (["WITHDRAWN", "STAFF_PREVIEW", "ACTIVE"] as const).every((c) => !millioneaDarkAtEdge(p, GUEST, c))));
  ok("4.5 · the edge asks nothing (no cookie read) for an ACTIVE ceiling or another address", !millioneaEdgeAsks("/millionea", "ACTIVE") && !millioneaEdgeAsks("/markets", "WITHDRAWN")
    && millioneaEdgeAsks("/millionea", "WITHDRAWN") && millioneaEdgeAsks("/millionea/tickets/1", "STAFF_PREVIEW"));
  const signedOutDark = (MILLIONEA_ROUTES as readonly string[]).filter((r) => !millioneaDarkAtEdge(r, GUEST, "WITHDRAWN") || !millioneaDarkAtEdge(r, GUEST, "STAFF_PREVIEW"));
  ok("4.6 · every route qa:live's dark section asks is a 404 here for a signed-out visitor below ACTIVE — the status the root loading file cannot give", signedOutDark.length === 0, j(signedOutDark));
  ok("4.7 · the dark address is a private segment (no route can ever answer it but the 404)", MILLIONEA_DARK_PATH.startsWith("/_") && !existsSync(join(ROOT, "src/app", MILLIONEA_DARK_PATH.slice(1))));
}
const PROXY_BELT = [
  "if (millioneaEdgeAsks(pathname)) {",
  "const session = await readVerifiedSession(cookie);",
  'if (millioneaDarkAtEdge(pathname, { signedIn: session !== null, staff: !!session && isStaffRole(session.role) })) {',
  "const url = req.nextUrl.clone();",
  "url.pathname = MILLIONEA_DARK_PATH;",
  "return withSecurityHeaders(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), secure);",
];
const proxyDefects = (proxy: string) => {
  const s = squash(code(proxy));
  // Each line of the belt AFTER the one before it, from the x-kp-document set on (the protected block reads the session too).
  const at: number[] = [];
  for (const line of PROXY_BELT) at.push(s.indexOf(line, at.length === 0 ? s.indexOf('requestHeaders.set( "x-kp-document"') : at[at.length - 1] + 1));
  const d: string[] = [];
  if (!s.includes('import { MILLIONEA_DARK_PATH, millioneaDarkAtEdge, millioneaEdgeAsks } from "@/lib/millionea-edge";')) d.push("the proxy does not import the edge's decision");
  if (at.some((n) => n < 0) || at.some((n, i) => i > 0 && n < at[i - 1])) d.push(`the belt is not written in order: ${j(at)}`);
  const setDoc = s.indexOf('requestHeaders.set( "x-kp-document"'), passOn = s.indexOf("NextResponse.next({ request: { headers: requestHeaders } })");
  if (!(setDoc >= 0 && at[0] > setDoc && passOn > at[at.length - 1])) d.push(`the belt is not between the header sets and the pass-on: ${j({ setDoc, belt: at[0], passOn })}`);
  return d;
};
{
  const d = proxyDefects(read("src/proxy.ts"));
  ok("4.8 · the proxy wires the belt after it sets the request headers and before it passes them on: a dark address is rewritten to the private segment under those same headers, so the 404 renders as an unknown address's does",
    d.length === 0, d.join(" | "));
}

// ── §5 · the doors on other pages ──────────────────────────────────────────────────────────────────────────────────
console.log("\n§5 · the doors: the card, More's first row, the /positions row — and none but these");
const doorDefects = (src: (rel: string) => string) => {
  const d: string[] = [];
  const bar = squash(code(src("src/components/layout/top-app-bar.tsx")));
  const rail = squash(code(src("src/components/layout/bottom-nav.tsx")));
  const shell = squash(code(src("src/components/layout/app-shell.tsx")));
  if (!/const MORE_ITEMS: NavItem\[\] = user\.isAuthed \? \[ \.\.\.MILLIONEA_ROW,/.test(bar) || !bar.includes(": MILLIONEA_ROW;")) d.push("the bar's More: Millionea is not the first row for a player and the whole list for a guest");
  if (!bar.includes('const MILLIONEA_ROW: NavItem[] = millionea ? [{ href: "/millionea", label: t.millionea.productLabel,')) d.push("the bar's row is not drawn on the shell's answer alone");
  if (count(rail, "...millioneaRow,") !== 2 || !rail.includes('millionea ? [{ href: "/millionea", label: t.millionea.productLabel,')) d.push("the rail's More: Millionea is not the first row for a player and a guest, on the shell's answer");
  const items = rail.slice(rail.indexOf("const items = ["), rail.indexOf("];", rail.indexOf("const items = [")));
  if (items.includes("/millionea")) d.push("⛔ Millionea took a rail slot");
  if (count(shell, "const millioneaRow = !promoSuppressed && (await resolveMillionea()).visible;") !== 1) d.push("the shell does not answer the row from the rollout and the break, once");
  if (count(shell, "millionea={millioneaRow}") !== 2 || /<LazyJourney[A-Za-z]+ [^>]*millionea/.test(shell)) d.push("the row's answer is not handed to the two classic bars alone");
  const card = squash(code(src("src/components/maswali/maswali-home-card-door.tsx")));
  const steps = ["if (!door.visible) return null;", "if (onBreak) return null;", "if (!hub) return null;", "if (!model) return null;", 'data-testid="millionea-home-card"'].map((x) => card.indexOf(x));
  if (steps.some((n, i) => n < 0 || (i > 0 && n < steps[i - 1]))) d.push(`the card's door: hidden, on a break, unread or unmodelled must draw nothing, in that order: ${j(steps)}`);
  const board = squash(code(src("src/app/markets/page.tsx")));
  const boardCard = board.indexOf("{millionea}"), search = board.indexOf("<SearchBox");
  if (!(boardCard > 0 && search > boardCard) || count(board, "{millionea}") !== 1) d.push("the board's card is not once, above the search");
  const positions = squash(code(src("src/app/positions/page.tsx")));
  const journeyAt = positions.indexOf("if (journey) {"), heldAt = positions.indexOf("await millioneaHeldThisWeek(session.userId)");
  if (!(journeyAt > 0 && heldAt > journeyAt)) d.push("the /positions row is read outside the classic arm (the journey has its third kind)");
  if (!/\{millioneaHeld > 0 && \( <Link href=\{"\/millionea\/tickets" as never\} data-testid="positions-millionea-row"/.test(positions)) d.push("the /positions row is not drawn only for a holder, to Tiketi zangu's Millionea list");
  return d;
};
{
  const d = doorDefects(read);
  ok("5.1 · More's first row in the bar and the rail (a player and a guest alike), on the shell's one answer — the rollout and the break — and handed to the classic bars alone; no rail slot", d.filter((x) => /bar|rail|shell|row's answer/.test(x)).length === 0, d.join(" | "));
  ok("5.2 · the card's door draws nothing when hidden, on a break, unread or unmodelled, and carries the test id qa:live's dark section looks for; the board draws it once above its search",
    d.filter((x) => /card/.test(x)).length === 0, d.join(" | "));
  ok("5.3 · /positions' row: read only in the classic arm, drawn only while the reader holds this week's tickets, linking Tiketi zangu's Millionea list",
    d.filter((x) => /positions/.test(x)).length === 0, d.join(" | "));
  const doors = squash(code(read("src/lib/server/millionea-doors.ts")));
  const fn = doors.slice(doors.indexOf("export const millioneaHeldThisWeek"));
  ok("5.4 · the /positions count asks one indexed read of a reader who holds no ticket, and the hub's week only for a holder",
    fn.indexOf("listForUser(userId, { limit: 1 })") > 0 && fn.indexOf("listForUser(userId, { limit: 1 })") < fn.indexOf("millioneaHubNow("));
}

// ── §6 · the slip ──────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§6 · the slip: kept in the tab, bought from the confirm alone; the overlays stand down");
const slipDefects = (src: string) => {
  const s = code(src);
  const d: string[] = [];
  if (!s.includes('export const MILLIONEA_SLIP_KEY_PREFIX = "kp-millionea-slip:";')) d.push("the tab key is not kp-millionea-slip: (Privacy §7 names it)");
  const calls = [...s.matchAll(/buyMillioneaTicketsAction\(/g)].map((m) => m.index ?? 0);
  const commit = s.indexOf("const commit = () => {");
  const commitEnd = s.indexOf("const shortfall", commit);
  if (calls.length !== 1 || !(calls[0] > commit && calls[0] < commitEnd)) d.push(`the buy is not called once, from the confirm's commit alone: ${calls.length} call(s)`);
  if (!s.includes("onCommit={commit}")) d.push("the confirm's armed control is not the commit");
  for (const m of s.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\}, \[/g)) if (m[1].includes("buyMillioneaTicketsAction") || m[1].includes("commit(")) d.push("⛔ an effect buys");
  if (!/forget\(weekId\);/.test(s)) d.push("the kept picks are not forgotten once the ticket is cut");
  return d;
};
{
  const d = slipDefects(read(`${APP}/slip/slip-client.tsx`));
  ok("6.1 · the slip keeps its picks in the tab under its week's key, forgets them once the ticket is cut, and buys only from the confirm's own press — never from an effect, never by itself (MB-57)", d.length === 0, d.join(" | "));
  const SLIP = "/millionea/slip";
  ok("6.2 · the slip is a stand-down surface for every reader; nothing else is", isSlipSurface(SLIP) && !["/millionea", "/millionea/slipx", "/millionea/slip/x", "/millionea/tickets", null].some((p) => isSlipSurface(p)));
  ok("6.3 · ⛔ and it is NOT a money surface (MONEY_ROUTE stays the wallet's): the install invitation and the consent prompt stand down there through the commit list",
    !isMoneySurface(SLIP) && isCommitSurface(SLIP) && isJourneySurface(SLIP));
  const needle = squash(code(read("src/components/layout/needle.tsx")));
  const chat = squash(code(read("src/components/chat/ChatRoot.tsx")));
  ok("6.4 · the Needle stands down on the slip — joined beside its pinned line, which stays today's",
    needle.includes("const standDown = suppressed || isSlipSurface(pathname); wantSuppressed.current = standDown; apiRef.current?.setSuppressed(standDown);"));
  ok("6.5 · the chat bubble stands down on the slip, straight after the journey's guard, closing and clearing nothing",
    chat.includes("if (journeyOn && isJourneySurface(pathname) && !notFoundShown) return null; if (isSlipSurface(pathname)) return null;"));
}

// ── §7 · a ticket's address ────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · a ticket's address: one spelling");
{
  const parts = code(read(`${APP}/millionea-parts.tsx`));
  const m = /export function ticketPageHref\(serial: string\): string \{\s*return (`[^`]*`);/.exec(parts);
  const own = m ? (new Function("serial", `return ${m[1]};`) as (s: string) => string) : null;
  const serials = ["1043", "MLN-2026-W42-000017", "a b/c?d#e"];
  ok("7.1 · the pages' ticketPageHref names a ticket exactly as the permalink's millioneaTicketHref does, for every serial (the census reads the pages' literal)",
    !!own && serials.every((s) => own(s) === millioneaTicketHref(s)), j(serials.map((s) => [own?.(s), millioneaTicketHref(s)])));
}

// ── §8 · controls ──────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§8 · controls — each check above fails on a planted copy");
{
  const plant = (rel: string, from: string, to: string) => (r: string) => (r === rel ? read(r).replace(from, to) : read(r));
  const lostError = routeDefects(plant(`${APP}/how/error.tsx`, '"use client";', ""));
  ok("8.1 · an error boundary that is not a client module is reported", lostError.some((x) => x.startsWith("/millionea/how")));
  const lateGate = gateDefects(plant(`${APP}/how/page.tsx`, "const gate = await millioneaGate();", "const { t: early } = await getServerT();\n  const gate = await millioneaGate();"));
  ok("8.2 · a page that reads before its gate is reported", lateGate.some((x) => x.includes("first await")));
  const throwingTitle = gateDefects(plant(`${APP}/page.tsx`, "if (!(await millioneaDoor()).visible) return notFoundMetadata();", "await millioneaGate();"));
  ok("8.3 · a title that asks the throwing gate again is reported", throwingTitle.some((x) => x.includes("title")));
  const unbelted = proxyDefects(read("src/proxy.ts").replace("if (millioneaEdgeAsks(pathname)) {", "if (false) {"));
  ok("8.4 · a proxy whose belt never runs is reported", unbelted.length > 0);
  const railSlot = doorDefects(plant("src/components/layout/bottom-nav.tsx", "const items = [", 'const items = [{ href: "/millionea", label: "M", icon: null },'));
  ok("8.5 · Millionea in a rail slot is reported", railSlot.some((x) => x.includes("rail slot")));
  const cardOnBreak = doorDefects(plant("src/components/maswali/maswali-home-card-door.tsx", "if (onBreak) return null;", ""));
  ok("8.6 · a card drawn on a break is reported", cardOnBreak.some((x) => x.includes("card's door")));
  const autoBuy = slipDefects(read(`${APP}/slip/slip-client.tsx`).replace("  useEffect(() => {\n    const kept = readKept(weekId);", "  useEffect(() => {\n    commit();\n    const kept = readKept(weekId);"));
  ok("8.7 · a slip that buys from an effect is reported", autoBuy.some((x) => x.includes("effect")));
}

// ── §9 · round 3's reads ───────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§9 · round 3: the lists page by week, a page that names its week reads it, the cancel says whose page it was");
const LIST = `${APP}/tickets/page.tsx`, TICKET_PAGE = `${APP}/tickets/[serial]/page.tsx`, ACTS = `${APP}/tickets/[serial]/ticket-acts.tsx`;
const REGISTER = `${APP}/register/page.tsx`, HUB = `${APP}/page.tsx`, PERF = "src/app/positions/performance/page.tsx";
const LABELS = "ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} firstLabel={t.common.firstPage} lastLabel={t.common.lastPage} />";
/** Tiketi zangu and the register: one page with its total, the platform's link pager, and the right empty words. */
const pagedDefects = (readAt: (rel: string) => string) => {
  const d: string[] = [];
  const list = squash(code(readAt(LIST)));
  if (!list.includes('const { rows: weeks, total, page } = await millioneaMyTickets(gate.userId, { page: Number.parseInt(String(sp.page ?? "1"), 10) || 1, perPage: PLAYER_PER_PAGE, });')) d.push("Tiketi zangu does not read one page of WEEKS with their total");
  if (count(list, "millioneaMyTickets(") !== 1) d.push(`Tiketi zangu reads its list ${count(list, "millioneaMyTickets(")} times`);
  if (!list.includes(`{total > PLAYER_PER_PAGE && ( <div className="mt-4 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden"> <Pagination total={total} page={page} perPage={PLAYER_PER_PAGE} baseHref={buildBaseHref(MILLIONEA_HREF.tickets, { lens: lens === "all" ? undefined : lens })} ${LABELS}`)) d.push("Tiketi zangu has no link pager keeping its lens");
  if (!list.includes('{total === 0 ? ( <EmptyState kind="positions" title={t.millionea.emptyTickets}')) d.push("\"no ticket yet\" is not kept for a reader who holds none");
  if (!list.includes(') : cards.length === 0 ? ( <EmptyState kind="positions" title={total > PLAYER_PER_PAGE ? t.millionea.lensNoneOnPage : t.millionea.lensNone} /> ) : (')) d.push("a lens that empties a page does not say so in its own words");
  const register = squash(code(readAt(REGISTER)));
  if (!register.includes('const { rows: weeks, total, page } = await millioneaRegister({ page: Number.parseInt(String(sp.page ?? "1"), 10) || 1, perPage: PLAYER_PER_PAGE, });')) d.push("the register does not read one page with its total");
  if (!register.includes(`{total > PLAYER_PER_PAGE && ( <div className="rounded-lg border border-border bg-bg-elevated/40 overflow-hidden"> <Pagination total={total} page={page} perPage={PLAYER_PER_PAGE} baseHref={MILLIONEA_HREF.register} ${LABELS}`)) d.push("the register has no link pager");
  if (!register.includes("{total === 0 ? ( <EmptyState title={t.millionea.regEmpty} />")) d.push("the register's empty state does not ask the total");
  if (list.includes("onNavigate")) d.push("Tiketi zangu's pager is driven by script (a link pager works without JavaScript)");
  if (register.includes("onNavigate")) d.push("the register's pager is driven by script (a link pager works without JavaScript)");
  return d;
};
/** A page that names its week — a result notice's, a ticket's own — reads that week, never a page of the list. */
const weekReadDefects = (readAt: (rel: string) => string) => {
  const d: string[] = [];
  const hub = squash(code(readAt(HUB))), ticket = squash(code(readAt(TICKET_PAGE)));
  if (!hub.includes("weeks.set(n.weekId, await millioneaMyTicketsWeek(userId, n.weekId));")) d.push("the hub's result line does not read its notice's week");
  if (!ticket.includes("(await millioneaMyTicketsWeek(gate.userId, view.week.id))?.tickets ?? []")) d.push("the ticket page does not read its own week");
  for (const [name, s] of [["the hub", hub], ["the ticket page", ticket]] as const) if (s.includes("millioneaMyTickets(")) d.push(`${name} still looks for its week on a page of the list`);
  return d;
};
/** The cancel carries the account the page was drawn for, as the slip's buy does. */
const cancelDefects = (readAt: (rel: string) => string) => {
  const d: string[] = [];
  const acts = squash(code(readAt(ACTS)));
  const confirm = acts.slice(Math.max(0, acts.indexOf("const confirm = () => {")));
  const owner = confirm.indexOf('fd.set("expectedOwnerId", ownerId);'), call = confirm.indexOf("cancelMillioneaTicketAction(fd)");
  if (!(owner > 0 && call > owner)) d.push("the cancel does not send the page's account before it acts");
  if (!acts.includes("export function TicketCancel({ serial, ownerId, until, serverNow, price, cap }: { serial: string; ownerId: string;")) d.push("TicketCancel takes no owner");
  if (!squash(code(readAt(TICKET_PAGE))).includes("<TicketCancel serial={view.serial} ownerId={gate.userId}")) d.push("the page does not hand the cancel its session's account");
  if (!squash(code(readAt(`${APP}/slip/slip-client.tsx`))).includes('fd.set("expectedOwnerId", userId);')) d.push("(the parity) the slip's buy no longer sends its account");
  return d;
};
/** /positions/performance scores each scored line, read directly. */
const perfDefects = (readAt: (rel: string) => string) => {
  const s = squash(code(readAt(PERF)));
  const d: string[] = [];
  if (!s.includes("Promise.all(SCORED_LINES.map((line) => listPositionsForUser(session.userId, 5_000, line))),")) d.push("the scored lines are not each read directly");
  if (!s.includes("const positions = perfPopulation({ all: positionsAll, lines: lineReads, tickets: millioneaPositions }, 5_000);")) d.push("the population is not the scored lines' own merge");
  if (s.includes("positionsAll.filter((p) => !millioneaIds.has(p.id))")) d.push("the population is still every line less its tickets");
  return d;
};
{
  const p = pagedDefects(read);
  ok("9.1 · Tiketi zangu reads ONE page of weeks (each whole) with the count of them all, and draws the platform's pager as links — keeping its lens — only when there is more than a page; \"no ticket yet\" only for a reader who holds none, and a lens that empties a page says so",
    p.filter((x) => !x.startsWith("the register")).length === 0, p.join(" | "));
  ok("9.2 · the register reads one page with its total and pages through the platform's pager, as links: it still works without JavaScript",
    p.filter((x) => x.startsWith("the register")).length === 0, p.join(" | "));
  const w = weekReadDefects(read);
  ok("9.3 · the hub's result line and the ticket page read the week they name (`millioneaMyTicketsWeek`) — neither looks for it on a page of the list", w.length === 0, w.join(" | "));
  const c = cancelDefects(read);
  ok("9.4 · the free cancel sends `expectedOwnerId` — the account the page was drawn for — before it acts, as the slip's buy does, so a changed session is refused as `session_changed`", c.length === 0, c.join(" | "));
  const f = perfDefects(read);
  ok("9.5 · /positions/performance reads each scored line directly (`SCORED_LINES`) and scores their merge — never every line less its tickets (S5 re-review 8)", f.length === 0, f.join(" | "));
}
{
  const { perfPopulation } = await import("../src/lib/positions/performance.ts");
  const { SCORED_LINES } = await import("../src/lib/leaderboard/board.ts");
  type Line = "MARKET" | "UPDOWN" | "MASWALI" | null;
  type P = { id: string; placedAt: string; line: Line };
  const at = (n: number) => new Date(Date.UTC(2026, 9, 1, 0, 0, n)).toISOString();
  const pos = (id: string, n: number, line: Line): P => ({ id, placedAt: at(n), line });
  // A store's read, as both stores answer it: newest first, `limit` of them; a line's read is the market join, so a
  // position whose market row cannot be read (line null) is in the unfiltered read alone.
  const readOf = (book: readonly P[], limit: number, line?: Exclude<Line, null>) =>
    book.filter((x) => line === undefined || x.line === line).sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, limit);
  const population = (book: readonly P[], limit: number) => perfPopulation({
    all: readOf(book, limit), lines: SCORED_LINES.map((l) => readOf(book, limit, l)), tickets: readOf(book, limit, "MASWALI"),
  }, limit);
  // The page as 24ec0d33 read it: the unfiltered page less its tickets.
  const subtracted = (book: readonly P[], limit: number) => {
    const out = new Set(readOf(book, limit, "MASWALI").map((x) => x.id));
    return readOf(book, limit).filter((x) => !out.has(x.id));
  };
  // A book with no ticket: polls, rounds and one position whose market cannot be read, at distinct instants.
  const plain = [pos("p1", 1, "MARKET"), pos("u1", 2, "UPDOWN"), pos("p2", 3, "MARKET"), pos("x1", 4, null), pos("u2", 5, "UPDOWN"), pos("p3", 6, "MARKET"), pos("u3", 7, "UPDOWN"), pos("p4", 8, "MARKET")];
  const same = [3, 5, 8, 50].filter((limit) => j(population(plain, limit)) === j(readOf(plain, limit)) && j(subtracted(plain, limit)) === j(readOf(plain, limit)));
  ok("9.6 · CONTROL · a book with no ticket scores exactly the unfiltered read — position for position and in its order, at every page size — as the old subtraction did: the output is byte-identical for such a player",
    j(same) === j([3, 5, 8, 50]), j({ same, at5: population(plain, 5).map((x) => x.id) }));
  // Tickets newer than every prediction: the unfiltered page of five is all tickets.
  const crowded = [pos("p1", 1, "MARKET"), pos("p2", 2, "MARKET"), pos("u1", 3, "UPDOWN"), pos("p3", 4, "MARKET"),
    ...[5, 6, 7, 8, 9, 10].map((n) => pos(`t${n}`, n, "MASWALI"))];
  const kept = population(crowded, 5).map((x) => x.id);
  ok("9.7 · the case the subtraction fails: when the newest positions are tickets, every line less its tickets keeps NONE of the predictions; the direct read keeps the account's newest ones",
    subtracted(crowded, 5).length === 0 && j(kept) === j(["p3", "u1", "p2", "p1"]), j({ subtracted: subtracted(crowded, 5).map((x) => x.id), kept }));
  const mixed = [pos("p1", 1, "MARKET"), pos("x1", 2, null), pos("t1", 3, "MASWALI"), pos("u1", 4, "UPDOWN")];
  const ids = population(mixed, 10).map((x) => x.id);
  ok("9.8 · the residual stays (a position whose market row cannot be read is scored, as `other`) and a ticket is never in it", j(ids) === j(["u1", "x1", "p1"]), j(ids));
}
{
  const plant = (rel: string, from: string, to: string) => (r: string) => (r === rel ? read(r).replace(from, to) : read(r));
  const unpaged = pagedDefects(plant(LIST, "perPage: PLAYER_PER_PAGE,\n  });", "perPage: 100_000,\n  });"));
  ok("9.9 · CONTROL · a list read that is not the player's page size is reported", unpaged.some((x) => x.includes("one page of WEEKS")));
  const scripted = pagedDefects(plant(REGISTER, "baseHref={MILLIONEA_HREF.register}", "onNavigate={() => {}}"));
  ok("9.10 · CONTROL · a register pager driven by script is reported", scripted.some((x) => x.includes("script")) && scripted.some((x) => x.includes("no link pager")));
  const listed = weekReadDefects(plant(TICKET_PAGE, "(await millioneaMyTicketsWeek(gate.userId, view.week.id))?.tickets ?? []", "(await millioneaMyTickets(gate.userId, { perPage: 12 })).rows.find((g) => g.week.id === view.week.id)?.tickets ?? []"));
  ok("9.11 · CONTROL · a ticket page that looks for its week on a page of the list is reported", listed.some((x) => x.includes("ticket page")));
  const anonymous = cancelDefects(plant(ACTS, '    fd.set("expectedOwnerId", ownerId);\n', ""));
  ok("9.12 · CONTROL · a cancel that no longer says whose page it was is reported", anonymous.some((x) => x.includes("before it acts")));
  const subtract = perfDefects(plant(PERF, "const positions = perfPopulation({ all: positionsAll, lines: lineReads, tickets: millioneaPositions }, 5_000);",
    "const millioneaIds = new Set(millioneaPositions.map((p) => p.id));\n  const positions = positionsAll.filter((p) => !millioneaIds.has(p.id));"));
  ok("9.13 · CONTROL · the old subtraction put back is reported", subtract.some((x) => x.includes("less its tickets")) && subtract.some((x) => x.includes("own merge")));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI UI: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run PRINTS; it only rises, to a printed number. ⏳ Set from the first green run. */
const MIN_ASSERTIONS = 1;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
