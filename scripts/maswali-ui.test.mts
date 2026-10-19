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
 *   §5 the doors on other pages: the home and board card, the classic bar's core link after Up & Down (Results folding into
 *      More at every width while it shows) and the classic phone rail's first More row, the journey's tab (S5-TAB), the
 *      /positions row
 *   §5b the ink worn by every nav that draws Millionea; §5c More's panels: every row's words at one x, both panels opaque
 *   §6 the slip: kept in the tab by week, bought only from the confirm's own press; the Needle and the chat stand down
 *   §7 a ticket's address: the pages name it exactly as the permalink does
 *   §8 its own controls: each source check below is seen to fail on a planted copy
 *   §9 round 3: Tiketi zangu and the register page on the platform's link pager; the hub and the ticket page read the
 *      week they name; the free cancel says whose page it was; /positions/performance reads each scored line directly
 *   §10 the root 404 hint is the owner's exact, product-neutral wording in all three languages and its dictionary twin
 *   §11 the player drive waits for fonts, finite motion and two frames before each tile, and lifts the pointer after pick 15
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
import { NOT_FOUND_WORDS } from "../src/components/ui/not-found-words.ts";
import { dict, type Locale } from "../src/lib/i18n-dict.ts";

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
  // Each wiring line as a reader of its source, so each is seen to fail on a planted copy below.
  const GATE = "src/lib/server/millionea-gate.ts", DOORS = "src/lib/server/millionea-doors.ts";
  const TICKET_PAGE_SRC = `${APP}/tickets/[serial]/page.tsx`, PERMALINK = "src/app/positions/[positionId]/page.tsx";
  const gateWired = (src: string) => /const admitted = await millioneaTicketAdmission\(r\.visible, userId, holdsAMillioneaTicket\);\s*if \(admitted === "NOT_FOUND"\) notFound\(\);\s*return \{ \.\.\.r, userId, holder: admitted === "HOLDER" \};/.test(code(src));
  const doorsAsk = (src: string) => code(src).includes("millioneaTicketAdmission(false, userId,") && code(src).includes('=== "HOLDER"');
  const ownerRead = (src: string) => squash(code(src)).includes("const view = await millioneaTicket(gate.userId, serial, now); if (!view) notFound();");
  const ownerFirstOk = (src: string) => {
    const p = squash(code(src));
    const ownerFirst = p.indexOf("if (!position || position.userId !== session.userId) notFound();");
    return !p.includes("resolveMillionea") && ownerFirst > 0 && ownerFirst < p.indexOf('if (productLine === "MASWALI") {');
  };
  ok("3.2 · the tickets' gate turns NOT_FOUND into the 404 a missing page gives, and admits a holder as one (holder: true)", gateWired(read(GATE)));
  ok("3.3 · Tiketi zangu's third kind and the /positions row ask the same decision (one rule for the door and the route)", doorsAsk(read(DOORS)));
  // The lead's L5 list (2026-10-18): WITHDRAWN with an owner (3.1 HOLDER), with a stranger (3.1 NOT_FOUND, and 3.4 for a
  // stranger who holds tickets of their own), and signed out (3.1, and the edge's 404 in §4).
  ok("3.4 · a signed-in stranger — holding none, or holding tickets of their own — meets the same 404 as an unknown serial at every state: the ticket read is the owner's, and null is one answer for both (no existence oracle, MB-95)",
    ownerRead(read(TICKET_PAGE_SRC)));
  ok("3.5 · the permalink sends the OWNER to their ticket at every rollout state (it asks no rollout) and 404s anyone else's position before it",
    ownerFirstOk(read(PERMALINK)));
  // ── §3's own controls.
  ok("3.2′ CONTROL · a gate that lets NOT_FOUND through is reported", !gateWired(read(GATE).replace('if (admitted === "NOT_FOUND") notFound();', "")));
  ok("3.3′ CONTROL · a door that asks the decision as though the product were shown is reported",
    !doorsAsk(read(DOORS).replace("millioneaTicketAdmission(false, userId,", "millioneaTicketAdmission(true, userId,")));
  ok("3.4′ CONTROL · a ticket page that renders a serial it could not read as the owner's is reported", !ownerRead(read(TICKET_PAGE_SRC).replace("if (!view) notFound();", "")));
  const asksRollout = read(PERMALINK).replace('if (productLine === "MASWALI") {', 'if (productLine === "MASWALI") { await resolveMillionea();');
  ok("3.5′ CONTROL · a permalink that asks the rollout before sending an owner to their ticket is reported", asksRollout !== read(PERMALINK) && !ownerFirstOk(asksRollout));
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
  type V = { signedIn: boolean; staff: boolean; holder: boolean };
  const GUEST: V = { signedIn: false, staff: false, holder: false }, PLAYER: V = { signedIn: true, staff: false, holder: false };
  const HOLDER: V = { signedIn: true, staff: false, holder: true }, STAFF: V = { signedIn: true, staff: true, holder: false };
  const PAGES = ["/millionea", "/millionea/slip", "/millionea/how", "/millionea/register", "/millionea/register/2026-W42", "/legal/rules/millionea"];
  const TICKETS = ["/millionea/tickets", "/millionea/tickets/1043"];
  const table: Array<[string, "WITHDRAWN" | "STAFF_PREVIEW" | "ACTIVE", V, boolean, boolean]> = [
    // [who, ceiling, viewer, the pages dark?, the tickets dark?]
    ["a guest", "WITHDRAWN", GUEST, true, true],
    ["a player without a ticket", "WITHDRAWN", PLAYER, true, true],
    ["a ticket holder", "WITHDRAWN", HOLDER, true, false],
    ["staff without a ticket", "WITHDRAWN", STAFF, true, true],
    ["a guest", "STAFF_PREVIEW", GUEST, true, true],
    ["a player without a ticket", "STAFF_PREVIEW", PLAYER, true, true],
    ["a ticket holder", "STAFF_PREVIEW", HOLDER, true, false],
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
  "const holder = isMillioneaTicketsPath(pathname) ? await millioneaTicketEntitledAtEdge(pathname, session) : false;",
  'if (millioneaDarkAtEdge(pathname, { signedIn: session !== null, staff: !!session && isStaffRole(session.role), holder })) {',
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
  if (!s.includes('import { millioneaTicketEntitledAtEdge } from "@/lib/server/millionea-edge-entitlement";')) d.push("the proxy does not import the pre-render ticket entitlement");
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
const verifiedClaimsDefects = (src: string) => {
  const s = squash(code(src));
  return ["role", "userId", "sessionId", "exp", "iat", "lastSeenAt"]
    .filter((key) => !s.includes(`${key}: payload.${key}`));
};
{
  const { signSession } = await import("../src/lib/server/crypto.ts");
  const { readVerifiedSession } = await import("../src/lib/proxy-session.ts");
  const now = Date.now();
  const claims = { role: "PLAYER", userId: "owner", sessionId: "sess_owner", exp: now + 60_000, iat: now - 1000, lastSeenAt: now - 1000 };
  const token = signSession(claims);
  const decoded = await readVerifiedSession(token);
  ok("4.8a · the proxy's HMAC verifier actually returns every signed claim the pre-render entitlement needs",
    decoded !== null && Object.entries(claims).every(([key, value]) => decoded[key as keyof typeof decoded] === value));
  ok("4.8b · a damaged signature and an expired cookie hand no claims to the ticket belt",
    await readVerifiedSession(`${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`) === null
      && await readVerifiedSession(signSession({ ...claims, exp: now - 1 })) === null);
  ok("4.8c · the source returns the claims that were verified, not a role-only shell",
    verifiedClaimsDefects(read("src/lib/proxy-session.ts")).length === 0, verifiedClaimsDefects(read("src/lib/proxy-session.ts")).join(", "));
}
{
  const { millioneaTicketEntitledAtEdge } = await import("../src/lib/server/millionea-edge-entitlement.ts");
  const now = Date.now();
  const signed = { userId: "owner", sessionId: "sess_owner", exp: now + 60_000, iat: now - 1000, lastSeenAt: now - 1000 };
  let listReads = 0, detailReads = 0;
  const reads = {
    activeSession: async () => ({ state: "active" as const, sessionId: signed.sessionId }),
    holdsAny: async (userId: string) => { listReads++; return userId === "owner"; },
    ownerOf: async (serial: string) => { detailReads++; return serial === "MLN-2026-W42-000017" ? "owner" : serial === "MLN-2026-W42-000018" ? "other" : null; },
  };
  const list = "/millionea/tickets", own = `${list}/mln-2026-w42-000017`, foreign = `${list}/MLN-2026-W42-000018`, missing = `${list}/MLN-2026-W42-000019`;
  ok("4.8a · a valid, active session that holds a ticket reaches its list through exactly one scoped holding read",
    await millioneaTicketEntitledAtEdge(list, signed, reads, now) && listReads === 1 && detailReads === 0);
  ok("4.8b · its own serial reaches the detail through an owner read, with the same normalization as the page",
    await millioneaTicketEntitledAtEdge(own, signed, reads, now) && listReads === 2 && detailReads === 1);
  const noOwn = await millioneaTicketEntitledAtEdge(foreign, signed, reads, now);
  const noMissing = await millioneaTicketEntitledAtEdge(missing, signed, reads, now);
  const noMalformed = await millioneaTicketEntitledAtEdge(`${list}/MLN-2026-W42-000017/extra`, signed, reads, now);
  ok("4.8c · another owner's serial, an unknown serial and a malformed nested path all get the same deny decision",
    !noOwn && !noMissing && !noMalformed && listReads === 5 && detailReads === 3);
  const noCookie = await millioneaTicketEntitledAtEdge(list, null, reads, now);
  const expired = await millioneaTicketEntitledAtEdge(list, { ...signed, exp: now - 1 }, reads, now);
  const idle = await millioneaTicketEntitledAtEdge(list, { ...signed, lastSeenAt: now - 25 * 3_600_000 }, reads, now);
  const absent = await millioneaTicketEntitledAtEdge(list, signed, { ...reads, activeSession: async () => ({ state: "absent" as const }) }, now);
  const displaced = await millioneaTicketEntitledAtEdge(list, signed, { ...reads, activeSession: async () => ({ state: "active" as const, sessionId: "newer" }) }, now);
  const registryError = await millioneaTicketEntitledAtEdge(list, signed, { ...reads, activeSession: async () => { throw new Error("registry read failed"); } }, now);
  ok("4.8d · a missing, expired, idle, revoked, displaced or unexpectedly failed session never reaches a holding read",
    !noCookie && !expired && !idle && !absent && !displaced && !registryError && listReads === 5);
  const unread = await millioneaTicketEntitledAtEdge(list, signed, { ...reads, activeSession: async () => ({ state: "unavailable" as const }) }, now);
  const listDenied = await millioneaTicketEntitledAtEdge(list, signed, { ...reads, holdsAny: async () => { throw new Error("read failed"); } }, now);
  const detailDenied = await millioneaTicketEntitledAtEdge(own, signed, { ...reads, holdsAny: async () => { throw new Error("read failed"); } }, now);
  let detailFailed = false;
  try { await millioneaTicketEntitledAtEdge(own, signed, { ...reads, ownerOf: async () => { throw new Error("read failed"); } }, now); }
  catch { detailFailed = true; }
  ok("4.8e · an unreadable registry follows getSessionState; a failed holding admission denies both routes privately, while a later detail read surfaces its error (B-1)",
    unread && !listDenied && !detailDenied && detailFailed);
}
const edgeTicketDefects = (src: string) => {
  const s = squash(code(src));
  const d: string[] = [];
  if (!s.includes('activeSession: readActiveSession') || !s.includes('ticketStore.listForUser(userId, { limit: 1 })')) d.push("the list does not check this session and its own held ticket");
  if (!s.includes('ticketStore.getBySerial(serial)') || !s.includes('(await reads.ownerOf(serial)) === session.userId')) d.push("the detail does not compare the serial's owner to the signed account");
  if (!s.includes('const serial = normalizeMillioneaSerial(decoded);') || !s.includes('try { decoded = decodeURIComponent(tail); } catch { return false; }') || !s.includes('if (!tail || tail.includes("/")) return false;')) d.push("the detail does not parse one minted serial like the page");
  if (!s.includes('try { active = await reads.activeSession(session.userId, session.sessionId); } catch { return false; }')
    || !s.includes('if (active.state === "absent" || (active.state === "active" && active.sessionId !== session.sessionId)) return false;')) d.push("an ended session is not denied before the ticket read");
  if (!s.includes('now - lastSeen > SESSION_IDLE_TIMEOUT_MS') || !s.includes('now > session.exp')) d.push("an expired or idle cookie is not denied before the ticket read");
  if (!s.includes('try { holds = await reads.holdsAny(session.userId); } catch { return false; }')
    || !s.includes('if (!holds) return false;')
    || !s.includes('return serial !== null && (await reads.ownerOf(serial)) === session.userId;')) d.push("the holding admission or later detail-read error policy differs from the page");
  return d;
};
{
  const src = read("src/lib/server/millionea-edge-entitlement.ts");
  ok("4.8f · the production proxy entitlement uses the active-session registry, bounded own-list lookup and serial owner lookup, and fails closed",
    edgeTicketDefects(src).length === 0, edgeTicketDefects(src).join(" | "));
}
const darkDriveStatusDefects = (src: string) => {
  const s = squash(code(src));
  const from = s.indexOf('for (const route of ["/millionea/tickets", "/millionea/tickets/NO-SUCH-SERIAL"])');
  const to = s.indexOf('await tile(rp, "W-nonholder-tickets-360")', from);
  const block = from >= 0 && to > from ? s.slice(from, to) : "";
  return block.includes('res?.status() === 404 && (await notFoundShown(rp))') ? [] : ["the signed-in dark drive does not assert the real 404 before its not-found body"];
};
{
  const d = darkDriveStatusDefects(read("scripts/maswali-player-drive.mjs"));
  ok("4.8g · the hard-request dark drive asserts 404 status for a signed-in non-holder's list and unknown detail", d.length === 0, d.join(" | "));
}
{
  // qa:live's dark section, driven against a served site of its own (a stubbed fetch): both ways a dark route answers.
  const dark = (await import("./live/millionea-dark.mjs")) as unknown as {
    NOT_FOUND_EN: string;
    millioneaDarkSection: (o: { base: string; ok: (label: string, cond: boolean) => void; log?: (...a: unknown[]) => void }) => Promise<string | null>;
  };
  const { NOT_FOUND_WORDS } = await import("../src/components/ui/not-found-words.ts");
  ok("4.9 · qa:live's dark section reads the platform's own not-found words (English, as it asks for them)", dark.NOT_FOUND_EN === NOT_FOUND_WORDS.en.notFound, j(dark.NOT_FOUND_EN));
  const NOT_FOUND_PAGE = `<title>${NOT_FOUND_WORDS.en.notFound} · 404 · 50pick</title><h1>${NOT_FOUND_WORDS.en.notFound}</h1><a href="/markets">Markets</a>`;
  const HUB_PAGE = '<h1>Maswali Millionea</h1><a data-testid="millionea-hub-fill" href="/millionea/slip">Fill a ticket</a>';
  const routeChecks = async (health: { ceiling: string; state: string }, answer: (route: string) => { status: number; body: string }) => {
    const real = globalThis.fetch;
    const seen: Array<{ label: string; cond: boolean }> = [];
    globalThis.fetch = (async (url: string | URL) => {
      const path = new URL(String(url)).pathname;
      if (path === "/api/health") return new Response(JSON.stringify({ millionea: health }), { status: 200, headers: { "content-type": "application/json" } });
      if ((MILLIONEA_ROUTES as readonly string[]).includes(path)) { const a = answer(path); return new Response(a.body, { status: a.status }); }
      return new Response('<a href="/markets">Markets</a>', { status: 200 });
    }) as typeof fetch;
    try {
      await dark.millioneaDarkSection({ base: "http://site.test", ok: (label, cond) => { seen.push({ label, cond }); }, log: () => {} });
    } finally {
      globalThis.fetch = real;
    }
    return seen.filter((x) => (MILLIONEA_ROUTES as readonly string[]).some((r) => x.label.startsWith(`${r} `)));
  };
  const allPass = (xs: Array<{ cond: boolean }>) => xs.length === MILLIONEA_ROUTES.length && xs.every((x) => x.cond);
  const W = { ceiling: "WITHDRAWN", state: "WITHDRAWN" }, K = { ceiling: "ACTIVE", state: "WITHDRAWN" };
  const wDark = await routeChecks(W, () => ({ status: 404, body: NOT_FOUND_PAGE }));
  const wLeak = await routeChecks(W, (r) => (r === "/millionea" ? { status: 200, body: NOT_FOUND_PAGE } : { status: 404, body: NOT_FOUND_PAGE }));
  ok("4.10 · at a WITHDRAWN ceiling every route must answer the 404 STATUS (the edge's rewrite) — and a 200 is red even with the not-found words",
    allPass(wDark) && wLeak.filter((x) => !x.cond).length === 1, j({ dark: wDark.map((x) => x.cond), leak: wLeak.map((x) => x.cond) }));
  const kDark = await routeChecks(K, () => ({ status: 200, body: NOT_FOUND_PAGE }));
  const kLeak = await routeChecks(K, (r) => (r === "/millionea" ? { status: 200, body: HUB_PAGE } : { status: 200, body: NOT_FOUND_PAGE }));
  ok("4.11 · the Owner's kill under an ACTIVE ceiling: every route must answer the not-found PAGE (its words, no trace) under the streamed 200 — and the product's own page is red",
    allPass(kDark) && kLeak.filter((x) => !x.cond).length === 1 && kDark.every((x) => x.label.includes("not-found page")), j({ dark: kDark.map((x) => x.cond), leak: kLeak.map((x) => x.cond) }));
  const live = await routeChecks({ ceiling: "ACTIVE", state: "ACTIVE" }, () => ({ status: 200, body: HUB_PAGE }));
  ok("4.12 · CONTROL · at ACTIVE the dark checks do not run", live.length === 0, j(live));
}


// ── §5 · the doors on other pages ──────────────────────────────────────────────────────────────────────────────────
console.log("\n§5 · the doors: the card, the bar's core link and the rail's More row, the journey's tab, the /positions row — and none but these");
const doorDefects = (src: (rel: string) => string) => {
  const d: string[] = [];
  const bar = squash(code(src("src/components/layout/top-app-bar.tsx")));
  const rail = squash(code(src("src/components/layout/bottom-nav.tsx")));
  const shell = squash(code(src("src/components/layout/app-shell.tsx")));
  // ⭐ S5-TAB (Ali, 2026-10-19; DESIGN_AUTHORITY §M8a item 11): the bar's door is a CORE LINK right after Up & Down, for a
  // player and a guest alike, on the shell's answer alone — no longer More's first row — and it pays with Results, which is
  // More's first row instead of a core link while Millionea shows, at every width (measured: the bar's room is capped at
  // `--w-board`, and with both inline the Swahili bar loses its account menu at 1280). Withdrawn, both lists are today's.
  if (!bar.includes('const MILLIONEA_LINK: NavItem[] = millionea ? [{ href: "/millionea", label: t.millionea.productLabel, ink: true }] : [];')) d.push("the bar's core link is not drawn on the shell's answer alone");
  if (count(bar, 'accent: true }, ...MILLIONEA_LINK, { href: "/live",') !== 2 || count(bar, 'href: "/millionea"') !== 1) d.push("the bar's core link does not stand right after Up & Down for a player and a guest, or the bar draws Millionea elsewhere too");
  if (!bar.includes('const RESULTS_LINK: NavItem[] = millionea ? [] : [{ href: "/results", label: t.common.results }];')
    || !bar.includes('const RESULTS_ROW: NavItem[] = millionea ? [{ href: "/results", label: t.common.results }] : [];')
    || count(bar, "...RESULTS_LINK,") !== 2 || !/const MORE_ITEMS: NavItem\[\] = user\.isAuthed \? \[ \.\.\.RESULTS_ROW,/.test(bar) || !bar.includes(": RESULTS_ROW;")
    || count(bar, 'href: "/results"') !== 2) d.push("the bar's Results does not move into More (its first row, player and guest) while Millionea shows, and back while it does not");
  if (count(bar, "<NavMore items={MORE_ITEMS} label={t.common.more} />") !== 1 || count(bar, "<NavMore") !== 1) d.push("the bar's More is not one menu over MORE_ITEMS");
  if (count(rail, "...millioneaRow,") !== 2 || !rail.includes('millionea ? [{ href: "/millionea", label: t.millionea.productLabel,')) d.push("the rail's More: Millionea is not the first row for a player and a guest, on the shell's answer");
  const items = rail.slice(rail.indexOf("const items = ["), rail.indexOf("];", rail.indexOf("const items = [")));
  if (items.includes("/millionea")) d.push("⛔ Millionea took a rail slot");
  if (count(shell, "const millioneaRow = !promoSuppressed && (await resolveMillionea()).visible;") !== 1) d.push("the shell does not answer the row from the rollout and the break, once");
  if (count(shell, "millionea={millioneaRow}") !== 4 || !/<LazyJourneyTopBar [^>]*millionea=\{millioneaRow\}/.test(shell) || !/<LazyJourneyTabs [^>]*millionea=\{millioneaRow\}/.test(shell)) d.push("the shell's one answer is not handed to all four navs (both bars, both rails)");
  const card = squash(code(src("src/components/maswali/maswali-home-card-door.tsx")));
  const steps = ["if (!door.visible) return null;", "if (onBreak) return null;", "if (!hub) return null;", "if (!model) return null;", 'data-testid="millionea-home-card"'].map((x) => card.indexOf(x));
  if (steps.some((n, i) => n < 0 || (i > 0 && n < steps[i - 1]))) d.push(`the card's door: hidden, on a break, unread or unmodelled must draw nothing, in that order: ${j(steps)}`);
  const board = squash(code(src("src/app/markets/page.tsx")));
  const boardCard = board.indexOf("{millionea}"), search = board.indexOf("<SearchBox");
  if (!(boardCard > 0 && search > boardCard) || count(board, "{millionea}") !== 1) d.push("the board's card is not once, above the search");
  const positions = squash(code(src("src/app/positions/page.tsx")));
  const journeyAt = positions.indexOf("if (journey) {"), heldAt = positions.indexOf("const millioneaHeld = (await millioneaHeldNow) ?? 0;");
  const startAt = positions.indexOf("const millioneaHeldNow = journey ? null : millioneaHeldThisWeek(session.userId);");
  const firstRead = positions.indexOf('await listPositionsForUser(session.userId, 5_000, "MARKET")');
  if (!(journeyAt > 0 && heldAt > journeyAt)) d.push("the /positions row is read outside the classic arm (the journey has its third kind)");
  if (!(startAt > 0 && firstRead > startAt)) d.push("the /positions row's read is not started beside the page's own reads (LOW 10)");
  if (!/\{millioneaHeld > 0 && \( <Link href=\{"\/millionea\/tickets" as never\} data-testid="positions-millionea-row"/.test(positions)) d.push("the /positions row is not drawn only for a holder, to Tiketi zangu's Millionea list");
  return d;
};
{
  const d = doorDefects(read);
  // ⭐ RE-PINNED OPENLY, S5-TAB (Ali, 2026-10-19): was "More's first row in the bar and the rail … handed to the classic bars
  // alone". The bar's door is now its core link after Up & Down (Results folding into More meanwhile, at every width), the
  // classic phone rail keeps More's first row, and the one answer reaches all four navs — the journey's tab and link too.
  ok("5.1 · the classic bar's core link right after Up & Down (Results moving into More's first row while it shows) and the classic phone rail's first More row, for a player and a guest alike, on the shell's one answer — the rollout and the break — handed to all four navs; no classic rail slot",
    d.filter((x) => /bar|rail|shell|row's answer/.test(x)).length === 0, d.join(" | "));
  ok("5.2 · the card's door draws nothing when hidden, on a break, unread or unmodelled, and carries the test id qa:live's dark section looks for; the board draws it once above its search",
    d.filter((x) => /card/.test(x)).length === 0, d.join(" | "));
  ok("5.3 · /positions' row: read only in the classic arm, drawn only while the reader holds this week's tickets, linking Tiketi zangu's Millionea list",
    d.filter((x) => /positions/.test(x)).length === 0, d.join(" | "));
  const doors = squash(code(read("src/lib/server/millionea-doors.ts")));
  const heldDefects = (doorsSrc: string) => {
    const fn = doorsSrc.slice(doorsSrc.indexOf("export const millioneaHeldThisWeek"));
    const door = doorsSrc.slice(doorsSrc.indexOf("export const millioneaTicketsDoor"), doorsSrc.indexOf("export const millioneaHeldThisWeek"));
    const d: string[] = [];
    const read1 = fn.indexOf("listForUser(userId, { limit: 1 })");
    if (!(read1 > 0 && read1 < fn.indexOf("millioneaHubNow("))) d.push("the count does not ask one indexed read before the hub's week");
    const skip = 'if (millioneaCeiling().ceiling === "WITHDRAWN") return 0;';
    if (!(fn.indexOf(skip) > 0 && fn.indexOf(skip) < read1)) d.push("the count reads at a WITHDRAWN ceiling");
    const skipDoor = 'if (millioneaCeiling().ceiling === "WITHDRAWN") return false;';
    if (!(door.indexOf(skipDoor) > 0 && door.indexOf(skipDoor) < door.indexOf("listForUser(id, { limit: 1 })"))) d.push("the switch's door reads at a WITHDRAWN ceiling");
    return d;
  };
  const h = heldDefects(doors);
  ok("5.4 · the /positions count asks one indexed read of a reader who holds no ticket, and the hub's week only for a holder — and neither it nor the switch's door reads anything at a WITHDRAWN ceiling (LOW 10)",
    h.length === 0, h.join(" | "));
  const plantedRead = heldDefects(doors.replace('if (millioneaCeiling().ceiling === "WITHDRAWN") return 0;', ""));
  ok("5.4′ CONTROL · a count that reads at a WITHDRAWN ceiling is reported", plantedRead.some((x) => x.includes("count reads")));
  const history = squash(code(read("src/app/updown/history/page.tsx")));
  // 2026-10-18 (S5 integration): each page awaits its own door read and hands the answer down — the journey's Tiketi
  // files read nothing (`test:journey-tickets` §8), so the switch takes `millionea` as a prop instead of awaiting the door.
  const START = "const millioneaKindNow = journey ? millioneaTicketsDoor() : null;";
  const AWAIT = "const millionea = (await millioneaKindNow) === true;";
  const asked = history.indexOf("const { journey } = await resolveSimpleJourney();"), warm = history.indexOf(START);
  const handsDown = (s: string, head: string) => s.indexOf(START) > 0 && s.indexOf(AWAIT) > s.indexOf(START) && count(s, head) === 1;
  ok("5.5 · the journey's two Tiketi zangu pages start the switch's door beside their own reads and await it themselves, handing the answer down (one cached read)",
    warm > asked && asked > 0 && warm < history.indexOf("await getMyUpDownHistory(")
      && handsDown(history, '<TicketsHead current="updown" millionea={millionea} t={t} />')
      && handsDown(squash(code(read("src/app/positions/page.tsx"))), "millionea={millionea} />"));
  const switchSrc = squash(code(read("src/components/journey/tickets/ticket-switch.tsx")));
  const thirdGated = (s: string) => s.includes('...(millionea ? [{ value: "millionea", labelEn: t.millionea.productLabel, href: "/millionea/tickets" }] : []),')
    && s.includes("export function TicketSwitch({ current, millionea, t }: { current: TicketKind; millionea: boolean; t: Dict })")
    && !s.includes("millioneaTicketsDoor") && count(s, 'value: "millionea"') === 1;
  ok("5.6 · Tiketi zangu's third kind sits inside its `millionea ? [...] : []` gate, on the answer its page hands down (the switch reads nothing)", thirdGated(switchSrc));
  ok("5.6′ CONTROL · the third kind drawn outside its gate is reported",
    !thirdGated(switchSrc.replace('...(millionea ? [{ value: "millionea", labelEn: t.millionea.productLabel, href: "/millionea/tickets" }] : []),', '{ value: "millionea", labelEn: t.millionea.productLabel, href: "/millionea/tickets" },')));
}

// ── §5b · S5-TAB: Millionea's ink (Ali, 2026-10-19; DESIGN_AUTHORITY §M8a item 11) ─────────────────────────────────
console.log("\n§5b · the ink: one class of tokens alone, a still gradient that never moves, plain under forced colours, worn by every nav");
/** Every nav that draws Millionea and the exact markup it wears the ink with (`n` times). Each S5-TAB item adds its nav. */
const INK_WEARERS: ReadonlyArray<{ rel: string; at: string; n: number }> = [
  { rel: "src/components/layout/nav-more.tsx", at: '{it.ink ? <span className="kp-millionea-ink">{it.label}</span> : it.label}', n: 2 },
  // RE-PINNED OPENLY, S5-TAB (the lead's tile read, 2026-10-19): the classic phone rail's More row dropped its mark (§5c) —
  // was `ink: true, glyph: <MillioneaGlyph name="millionea" s={16} … kp-millionea-glyph" />`. Its words keep the ink.
  { rel: "src/components/layout/bottom-nav.tsx", at: 'millionea ? [{ href: "/millionea", label: t.millionea.productLabel, ink: true }]', n: 1 },
  // S5-TAB B: the classic bar's core link (no mark: its siblings carry none), its words in the ink.
  { rel: "src/components/layout/top-app-bar.tsx", at: 'const MILLIONEA_LINK: NavItem[] = millionea ? [{ href: "/millionea", label: t.millionea.productLabel, ink: true }] : [];', n: 1 },
  { rel: "src/components/layout/top-app-bar.tsx", at: '{it.ink ? <span className="kp-millionea-ink">{it.label}</span> : it.label}', n: 1 },
  // S5-TAB A: the journey rail's tab (the word in the ink, the pip's glyph resting in gold) and the journey's desktop link.
  { rel: "src/components/journey/journey-tabs.tsx", at: 'const ink = d.key === "millionea";', n: 1 },
  { rel: "src/components/journey/journey-tabs.tsx", at: '<span className="kp-rail__label kp-jtab__label">{ink ? <span className="kp-millionea-ink">{label}</span> : label}</span>', n: 1 },
  { rel: "src/components/journey/journey-tabs.tsx", at: '<span className={ink ? "kp-rail__pip kp-millionea-glyph" : "kp-rail__pip"}>', n: 1 },
  { rel: "src/components/journey/journey-top-bar.tsx", at: '{d.key === "millionea" ? <span className="kp-millionea-ink">{tabLabel(t, d.label)}</span> : tabLabel(t, d.label)}', n: 1 },
];
const cssCode = (s: string) => squash(s.replace(/\/\*[\s\S]*?\*\//g, ""));
const RAW_COLOUR = /#[0-9a-f]{3,8}\b|\b(?:oklch|oklab|rgba?|hsla?|lab|lch|hwb)\(|\b(?:red|green|gold|yellow|orange|white|black)\b/i;
const INK_VAR = /^--(?:yes|gold|no)-\d{2,3}$/;
const inkDefects = (src: (rel: string) => string) => {
  const d: string[] = [];
  const css = cssCode(src("src/app/globals.css"));
  const rules = [...css.matchAll(/([^{}]*kp-millionea-[^{}]*)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
  if (rules.length === 0) d.push("the ink: no rule names it");
  for (const r of rules) {
    const vars = [...r.body.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
    if (RAW_COLOUR.test(r.body.replace(/var\([^)]*\)/g, ""))) d.push(`the ink: a raw colour in "${r.sel}"`);
    for (const v of vars) if (!INK_VAR.test(v)) d.push(`the ink: "${r.sel}" reads ${v}, which is not a money colour token`);
    if (/\b(?:animation|transition)(?:-[a-z-]+)?\s*:/.test(r.body) && !/\b(?:animation|transition)\s*:\s*none\b/.test(r.body)) d.push(`the ink: "${r.sel}" moves (an animation or a transition)`);
  }
  if (/@keyframes kp-millionea|kp-millionea-[a-z-]*\s*\{[^}]*\b(?:animation|transition)\b/.test(css)) d.push("the ink: a keyframe or a motion rule names it");
  if (count(css, ".kp-millionea-ink { color: var(--gold-300); }") !== 1) d.push("the ink: not defined once");
  const sup = css.slice(css.indexOf("@supports ((-webkit-background-clip: text) or (background-clip: text)) { .kp-millionea-ink {"));
  const fill = sup.slice(0, sup.indexOf("}"));
  if (!sup || !/background-image: linear-gradient\(90deg, var\(--yes-\d+\), var\(--gold-\d+\), var\(--no-\d+\)\);/.test(fill)
    || !fill.includes("background-clip: text;") || !fill.includes("-webkit-text-fill-color: transparent;")) d.push("the ink: the fill is not green to gold to red clipped to the word, behind @supports");
  if (!/filter: drop-shadow\(0 0 \dpx color-mix\(in oklab, var\(--gold-\d+\) \d+%, transparent\)\);/.test(fill) || /text-shadow/.test(sup.slice(0, sup.indexOf("} }")))) d.push("the ink: the halo is not a faint gold drop-shadow (and never a text-shadow)");
  if (!css.includes("@media (forced-colors: active) { .kp-millionea-ink, :is(a, button):hover .kp-millionea-ink, [aria-current] .kp-millionea-ink { background-image: none; color: inherit; -webkit-text-fill-color: currentColor; filter: none; }")) d.push("the ink: forced colours do not draw it as plain system text");
  // S5-TAB · lit, the word steps up one tint as its siblings' ink steps up to --text (the -200s, 6.85:1 on the destination
  // pill) and the rail's glyph takes the siblings' Fill-on-pill ink; a not-found page's first paint puts both back.
  if (!sup.slice(0, sup.indexOf("} }") + 1).includes(":is(a, button):hover .kp-millionea-ink, [aria-current] .kp-millionea-ink { background-image: linear-gradient(90deg, var(--yes-200), var(--gold-200), var(--no-200)); }")) d.push("the ink: a lit door (aria-current) and a hover do not brighten the word to the -200s, behind @supports");
  if (!css.includes(".kp-millionea-glyph { color: var(--gold-300); } .kp-rail__item[data-on] .kp-millionea-glyph { color: inherit; }")) d.push("the ink: the glyph does not rest in gold and take the siblings' ink when its tab is lit");
  if (!css.includes('@supports ((-webkit-background-clip: text) or (background-clip: text)) { :root:is([data-not-found], #kp-not-found) :is(.kp-rail--journey, .kp-jnav) [aria-current] .kp-millionea-ink { background-image: linear-gradient(90deg, var(--yes-300), var(--gold-300), var(--no-300)); } }')
    || !css.includes(":root:is([data-not-found], #kp-not-found) .kp-rail--journey .kp-rail__item[data-on] .kp-millionea-glyph { color: var(--gold-300); }")) d.push("the ink: a not-found page's first paint does not put the lit tab's word and glyph back (the -300s, the gold)");
  for (const w of INK_WEARERS) {
    const n = count(squash(code(src(w.rel))), w.at);
    if (n !== w.n) d.push(`the ink: ${w.rel} wears it ${n} times, not ${w.n}`);
  }
  return d;
};
{
  const plant = (rel: string, from: string, to: string) => (r: string) => (r === rel ? read(r).replace(from, to) : read(r));
  const d = inkDefects(read);
  ok("5b.1 · one ink class: green to gold to red clipped to the word, a faint gold drop-shadow — tokens alone", d.filter((x) => !/moves|motion rule|forced|wears|lit|not-found/.test(x)).length === 0, d.join(" | "));
  ok("5b.2 · the ink never moves (no animation, no transition, no keyframe); forced colours draw plain system text", d.filter((x) => /moves|motion rule|forced/.test(x)).length === 0, d.join(" | "));
  // ⭐ RE-PINNED OPENLY, S5-TAB (2026-10-19): was "More's rows: the classic rail's and the top bar's". Every nav that draws
  // Millionea now: the classic rail's More row, the classic bar's core link, the journey's tab and its desktop link.
  ok("5b.3 · every nav that draws Millionea wears the one class — the classic rail's More row, the classic bar's core link, the journey rail's tab (its glyph resting in gold) and the journey's desktop link", d.filter((x) => /wears/.test(x)).length === 0, d.join(" | "));
  ok("5b.8 · lit, a door's word steps up to the -200s (aria-current, as a hover does; 6.85:1 on the destination pill) and the rail tab's glyph takes the siblings' Fill-on-pill ink; a not-found page's first paint puts both back, the -300s and the gold",
    d.filter((x) => /lit|not-found/.test(x)).length === 0, d.join(" | "));
  const rawColour = inkDefects(plant("src/app/globals.css", "var(--yes-300), var(--gold-300), var(--no-300));", "var(--yes-300), var(--gold-300), oklch(70% 0.2 22));"));
  ok("5b.4 · CONTROL · a raw colour in the class is reported", rawColour.some((x) => x.includes("raw colour")), j(rawColour));
  const moving = inkDefects(plant("src/app/globals.css", "    -webkit-text-fill-color: transparent;\n", "    -webkit-text-fill-color: transparent;\n    animation: kp-millionea-drift 9s ease-in-out infinite alternate;\n"));
  ok("5b.5 · CONTROL · an animation planted in the class is reported", moving.some((x) => x.includes("moves")), j(moving));
  const plainGone = inkDefects(plant("src/app/globals.css", "  .kp-millionea-ink, :is(a, button):hover .kp-millionea-ink, [aria-current] .kp-millionea-ink { background-image: none; color: inherit;", "  .kp-millionea-x { background-image: none; color: inherit;"));
  ok("5b.6 · CONTROL · the forced-colours rule removed is reported", plainGone.some((x) => x.includes("forced colours")), j(plainGone));
  const inkDropped = inkDefects(plant("src/components/layout/nav-more.tsx", '{it.ink ? <span className="kp-millionea-ink">{it.label}</span> : it.label}', "{it.label}"));
  ok("5b.7 · CONTROL · the ink dropped from one nav is reported", inkDropped.some((x) => x.includes("nav-more.tsx wears it 1 times")), j(inkDropped));
  const tabBare = inkDefects(plant("src/components/journey/journey-tabs.tsx", '{ink ? <span className="kp-millionea-ink">{label}</span> : label}', "{label}"));
  ok("5b.7′ · CONTROL · the journey tab's word without the ink is reported", tabBare.some((x) => x.includes("journey-tabs.tsx wears it 0 times")), j(tabBare));
  const litFlat = inkDefects(plant("src/app/globals.css", ":is(a, button):hover .kp-millionea-ink, [aria-current] .kp-millionea-ink { background-image:", ":is(a, button):hover .kp-millionea-ink { background-image:"));
  ok("5b.9 · CONTROL · a lit door that keeps the resting -300s is reported", litFlat.some((x) => x.includes("lit door")), j(litFlat));
  const nfLit = inkDefects(plant("src/app/globals.css", ":root:is([data-not-found], #kp-not-found) .kp-rail--journey .kp-rail__item[data-on] .kp-millionea-glyph { color: var(--gold-300); }", ""));
  ok("5b.10 · CONTROL · a not-found page's first paint that leaves the lit tab's glyph in the siblings' ink is reported", nfLit.some((x) => x.includes("not-found")), j(nfLit));
}

// ── §5c · S5-TAB: More's panels (the lead's tile read, 2026-10-19; DESIGN_AUTHORITY §M8a item 11) ─────────────────────
console.log("\n§5c · More's panels: every row's words start at one x (no row carries a mark), and both panels are opaque");
/** Both panels' paint: the kit's elevated surface whole (the language menu's), border and radius as they were. */
const PANEL_PAINT = ["rounded-modal", "border", "border-border-strong", "bg-bg-elevated"];
const morePanelDefects = (src: (rel: string) => string) => {
  const d: string[] = [];
  const more = squash(code(src("src/components/layout/nav-more.tsx")));
  const rail = squash(code(src("src/components/layout/bottom-nav.tsx")));
  // One x: a mark before one row's words set them ~28px right of every other row's (the 16px glyph, its 6px margin, the
  // row's 6px gap). Millionea's row is its words in the ink alone, as the classic bar's core link, and More keeps no slot.
  const at = more.indexOf("items: readonly {");
  const itemsType = at < 0 ? "" : more.slice(at, more.indexOf("}[];", at));
  if (!itemsType || /\bglyph\b|ReactNode/.test(itemsType) || /\{it\.glyph\}/.test(more)) d.push("one x: More's rows keep a slot for a mark before their words");
  const row = rail.slice(rail.indexOf("const millioneaRow"), rail.indexOf("const moreItems"));
  if (!row.includes('millionea ? [{ href: "/millionea", label: t.millionea.productLabel, ink: true }] : [];') || /glyph/i.test(row) || rail.includes("MillioneaGlyph")) d.push("one x: the phone rail's Millionea row carries a mark");
  // Opaque: no page reads through either panel — the surface whole (no alpha step), no backdrop blur.
  const panels = [...more.matchAll(/role="menu" className="([^"]*)"/g)].map((m) => m[1].split(" "));
  const named = panels.map((cls) => ({ cls, which: cls.includes("top-[calc(100%+6px)]") ? "the bar's" : cls.includes("bottom-[calc(100%+8px)]") ? "the rail's" : "an unknown" }));
  if (named.map((p) => p.which).sort().join() !== "the bar's,the rail's") d.push(`opaque: the More panels found are ${j(named.map((p) => p.which))}, not the bar's and the rail's`);
  for (const { cls, which } of named) {
    const bg = cls.filter((c) => c.startsWith("bg-"));
    if (bg.some((c) => /\/\d+$/.test(c))) d.push(`opaque: ${which} panel paints a see-through surface (${bg.join(" ")})`);
    if (cls.some((c) => c.startsWith("backdrop-"))) d.push(`opaque: ${which} panel blurs what is behind it`);
    for (const c of PANEL_PAINT) if (!cls.includes(c)) d.push(`opaque: ${which} panel lost "${c}"`);
  }
  return d;
};
{
  const plant = (rel: string, from: string, to: string) => (r: string) => (r === rel ? read(r).replace(from, to) : read(r));
  const d = morePanelDefects(read);
  ok("5c.1 · every row of a More list starts its words at one x: no row carries a mark — the phone rail's Millionea row is its words in the ink alone, as the bar's core link is, and More keeps no slot for one",
    d.filter((x) => x.startsWith("one x")).length === 0, d.join(" | "));
  ok("5c.2 · both More panels are opaque — the kit's elevated surface whole (bg-bg-elevated, the language menu's), no alpha step, no backdrop blur — border and radius unchanged: no page reads through a menu",
    d.filter((x) => x.startsWith("opaque")).length === 0, d.join(" | "));
  const marked = morePanelDefects(plant("src/components/layout/bottom-nav.tsx", "label: t.millionea.productLabel, ink: true }]", 'label: t.millionea.productLabel, ink: true, glyph: <MillioneaGlyph name="millionea" s={16} className="mr-1.5 shrink-0" /> }]'));
  ok("5c.1′ CONTROL · the mark put back on the phone rail's Millionea row is reported", marked.some((x) => x.includes("phone rail's Millionea row")), j(marked));
  const slot = morePanelDefects(plant("src/components/layout/nav-more.tsx", '{it.ink ? <span className="kp-millionea-ink">{it.label}</span> : it.label}', '{it.glyph}{it.ink ? <span className="kp-millionea-ink">{it.label}</span> : it.label}'));
  ok("5c.1″ CONTROL · a slot for a mark put back into More's rows is reported", slot.some((x) => x.includes("keep a slot")), j(slot));
  const barSeen = morePanelDefects(plant("src/components/layout/nav-more.tsx", "top-[calc(100%+6px)] z-[50] min-w-[190px] rounded-modal border border-border-strong bg-bg-elevated p-1 shadow-overlay", "top-[calc(100%+6px)] z-[50] min-w-[190px] rounded-modal border border-border-strong bg-bg-elevated/95 p-1 backdrop-blur-xl shadow-overlay"));
  ok("5c.2′ CONTROL · the bar's panel back at 95% under a backdrop blur (the tile read's see-through panel) is reported",
    barSeen.some((x) => x.includes("the bar's panel paints a see-through")) && barSeen.some((x) => x.includes("the bar's panel blurs")), j(barSeen));
  const railSeen = morePanelDefects(plant("src/components/layout/nav-more.tsx", "bg-bg-elevated p-1 shadow-overlay max-h-[70dvh]", "bg-bg-elevated/90 p-1 shadow-overlay max-h-[70dvh]"));
  ok("5c.2″ CONTROL · the rail's panel at a see-through step is reported", railSeen.some((x) => x.includes("the rail's panel paints a see-through")), j(railSeen));
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
  // The three overlays a slip stands down — and, on its not-found page (a dark slip is a missing page, the S5 review of
  // 24ec0d33, LOW 11), lets back: the Needle, the chat bubble, and the consent card's commit-surface rule.
  const overlayDefects = (needleSrc: string, chatSrc: string, consentSrc: string) => {
    const needle = squash(code(needleSrc)), chat = squash(code(chatSrc)), consent = squash(code(consentSrc));
    const d: string[] = [];
    if (!needle.includes("const standDown = suppressed || (isSlipSurface(pathname) && !notFoundShown); wantSuppressed.current = standDown; apiRef.current?.setSuppressed(standDown);")) d.push("needle: the slip's stand-down is not beside its pinned line, lifted on the not-found page");
    if (!chat.includes("if (journeyOn && isJourneySurface(pathname) && !notFoundShown) return null; if (isSlipSurface(pathname) && !notFoundShown) return null;")) d.push("chat: the slip's stand-down is not straight after the journey's guard, lifted on the not-found page");
    if (!consent.includes("const overMoney = isCommitSurface(pathname) && !notFoundShown;") || !consent.includes("!gaExcluded(pathname) && !overMoney;")) d.push("consent: the commit-surface rule holds on a not-found page");
    return d;
  };
  const NEEDLE = "src/components/layout/needle.tsx", CHAT = "src/components/chat/ChatRoot.tsx", CONSENT = "src/components/analytics/consent-prompt.tsx";
  const ov = overlayDefects(read(NEEDLE), read(CHAT), read(CONSENT));
  ok("6.4 · the Needle stands down on the slip — joined beside its pinned line, which stays today's — and comes back on its not-found page",
    !ov.some((x) => x.startsWith("needle")), ov.join(" | "));
  ok("6.5 · the chat bubble stands down on the slip, straight after the journey's guard, closing and clearing nothing — and comes back on its not-found page",
    !ov.some((x) => x.startsWith("chat")), ov.join(" | "));
  ok("6.6 · the consent card keeps off a money control, and a not-found page at a commit address carries none: it may ask there",
    !ov.some((x) => x.startsWith("consent")), ov.join(" | "));
  const stuckNeedle = overlayDefects(read(NEEDLE).replace("(isSlipSurface(pathname) && !notFoundShown)", "isSlipSurface(pathname)"), read(CHAT), read(CONSENT));
  const stuckChat = overlayDefects(read(NEEDLE), read(CHAT).replace("if (isSlipSurface(pathname) && !notFoundShown) return null;", "if (isSlipSurface(pathname)) return null;"), read(CONSENT));
  const goneChat = overlayDefects(read(NEEDLE), read(CHAT).replace("if (isSlipSurface(pathname) && !notFoundShown) return null;", ""), read(CONSENT));
  ok("6.4′ CONTROL · a Needle that stays down on the slip's not-found page is reported", stuckNeedle.some((x) => x.startsWith("needle")));
  ok("6.5′ CONTROL · a bubble that stays down on the slip's not-found page, or does not stand down on the slip at all, is reported",
    stuckChat.some((x) => x.startsWith("chat")) && goneChat.some((x) => x.startsWith("chat")));
}

// ── §7 · a ticket's address ────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · a ticket's address: one spelling");
{
  const serials = ["1043", "MLN-2026-W42-000017", "a b/c?d#e"];
  /** The serials the pages' `ticketPageHref` (its literal, run) spells otherwise than the permalink's own spelling. */
  const spellingDefects = (partsSrc: string) => {
    const m = /export function ticketPageHref\(serial: string\): string \{\s*return (`[^`]*`);/.exec(code(partsSrc));
    const own = m ? (new Function("serial", `return ${m[1]};`) as (s: string) => string) : null;
    return own ? serials.filter((s) => own(s) !== millioneaTicketHref(s)) : ["(no ticketPageHref literal)"];
  };
  const PARTS = `${APP}/millionea-parts.tsx`;
  const d = spellingDefects(read(PARTS));
  ok("7.1 · the pages' ticketPageHref names a ticket exactly as the permalink's millioneaTicketHref does, for every serial (the census reads the pages' literal)",
    d.length === 0, j(d));
  const unescaped = read(PARTS).replace("encodeURIComponent(serial)", "serial");
  ok("7.1′ CONTROL · a page spelling that stops escaping the serial is reported", unescaped !== read(PARTS) && spellingDefects(unescaped).includes("a b/c?d#e"));
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
  const proxy = read("src/proxy.ts"), entitlement = read("src/lib/server/millionea-edge-entitlement.ts");
  const noPreflight = proxy.replace("await millioneaTicketEntitledAtEdge(pathname, session)", "true");
  ok("8.4a · a proxy that lets every signed non-holder stream a not-found page is reported",
    noPreflight !== proxy && proxyDefects(noPreflight).length > 0);
  const verifier = read("src/lib/proxy-session.ts");
  const noUserClaim = verifier.replace("userId: payload.userId,", "");
  ok("8.4a′ · a verifier that signs off on a cookie but returns no account claim is reported",
    noUserClaim !== verifier && verifiedClaimsDefects(noUserClaim).includes("userId"));
  const noOwner = entitlement.replace('(await reads.ownerOf(serial)) === session.userId', 'true');
  ok("8.4b · a detail read that admits another account's serial is reported",
    noOwner !== entitlement && edgeTicketDefects(noOwner).some((x) => x.includes("owner")));
  const noRegistry = entitlement.replace('activeSession: readActiveSession', 'activeSession: async () => ({ state: "unavailable" })');
  ok("8.4c · a pre-render check that no longer reads session revocation is reported",
    noRegistry !== entitlement && edgeTicketDefects(noRegistry).some((x) => x.includes("session")));
  const thrownAdmission = entitlement.replace('try { holds = await reads.holdsAny(session.userId); } catch { return false; }',
    'holds = await reads.holdsAny(session.userId);');
  ok("8.4d · a failed holding admission leaked as an error instead of a private 404 is reported",
    thrownAdmission !== entitlement && edgeTicketDefects(thrownAdmission).some((x) => x.includes("holding admission")));
  const drive = read("scripts/maswali-player-drive.mjs");
  const softStatus = drive.replace('res?.status() === 404 && (await notFoundShown(rp))', '(await notFoundShown(rp))');
  ok("8.4e · a signed-in dark drive that accepts a streamed 200 with not-found words is reported",
    softStatus !== drive && darkDriveStatusDefects(softStatus).length > 0);
  const railSlot = doorDefects(plant("src/components/layout/bottom-nav.tsx", "const items = [", 'const items = [{ href: "/millionea", label: "M", icon: null },'));
  ok("8.5 · Millionea in a classic rail slot is reported (the classic phone rail keeps it as More's first row)", railSlot.some((x) => x.includes("rail slot")));
  // S5-TAB B's controls: the bar's core link never drawn; Results kept inline beside it (the Swahili bar then loses its
  // account menu at 1280); Results dropped from More instead of moved there (a destination unreachable from the bar).
  const BAR = "src/components/layout/top-app-bar.tsx";
  const noLink = doorDefects(plant(BAR, 'const MILLIONEA_LINK: NavItem[] = millionea ? [{ href: "/millionea", label: t.millionea.productLabel, ink: true }] : [];', "const MILLIONEA_LINK: NavItem[] = [];"));
  ok("8.5′ · the bar's core link never drawn is reported", noLink.some((x) => x.includes("core link is not drawn")), j(noLink));
  const resultsStays = doorDefects(plant(BAR, 'const RESULTS_LINK: NavItem[] = millionea ? [] : [{ href: "/results", label: t.common.results }];', 'const RESULTS_LINK: NavItem[] = [{ href: "/results", label: t.common.results }];'));
  ok("8.5″ · Results kept inline beside Millionea's link is reported", resultsStays.some((x) => x.includes("does not move into More")), j(resultsStays));
  const resultsGone = doorDefects(plant(BAR, 'const RESULTS_ROW: NavItem[] = millionea ? [{ href: "/results", label: t.common.results }] : [];', "const RESULTS_ROW: NavItem[] = [];"));
  ok("8.5‴ · Results dropped from More instead of moved there is reported", resultsGone.some((x) => x.includes("does not move into More")), j(resultsGone));
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

// ── §10 · P14: the root 404 hint belongs to every product ──────────────────────────────────────────────────────────
console.log("\n§10 · the owner-approved 404 hint in every language, with its dictionary twin");
const HINT_LOCALES = ["en", "sw", "zh"] as const satisfies readonly Locale[];
type Hints = Record<Locale, string>;
const EXPECTED_HINT: Hints = {
  en: "The link may be out of date, or the address was typed slightly off. Pick a destination below to keep going.",
  sw: "Kiungo kinaweza kuwa kimepitwa na wakati, au anwani imeandikwa vibaya kidogo. Chagua mahali pa kwenda hapa chini.",
  zh: "链接可能已过期，或网址输入有误。请从下方选择一个页面继续。",
};
const PRODUCT_IN_HINT = /\b(?:markets?|resolved|soko|masoko|limetatuliwa|millionea|50pick|url)\b|市场|赛事|Up\s*(?:&|and)\s*Down/i;
const hintDefects = (shown: Hints, twin: Hints) => HINT_LOCALES.flatMap((locale) => {
  const d: string[] = [];
  if (shown[locale] !== EXPECTED_HINT[locale]) d.push(`${locale}: the root hint differs from the owner's words`);
  if (twin[locale] !== EXPECTED_HINT[locale]) d.push(`${locale}: the dictionary hint differs from the owner's words`);
  if (shown[locale] !== twin[locale]) d.push(`${locale}: the root and dictionary hints differ`);
  if (PRODUCT_IN_HINT.test(shown[locale]) || PRODUCT_IN_HINT.test(twin[locale])) d.push(`${locale}: the hint names a product or the old URL wording`);
  return d;
});
{
  const shown = Object.fromEntries(HINT_LOCALES.map((locale) => [locale, NOT_FOUND_WORDS[locale].notFoundHint])) as Hints;
  const twin = Object.fromEntries(HINT_LOCALES.map((locale) => [locale, dict[locale].error.notFoundHint])) as Hints;
  const d = hintDefects(shown, twin);
  ok("10.1 · P14: root and dictionary hints use the exact approved, product-neutral words in en/sw/zh", d.length === 0, d.join(" | "));
  const old: Hints = {
    en: "The market may have resolved, or the URL was typed in slightly off.",
    sw: "Soko huenda limetatuliwa, au URL iliandikwa vibaya kidogo.",
    zh: "市场可能已结束，或URL输入有误。",
  };
  for (const locale of HINT_LOCALES) {
    // Move both copies together: mere parity between them must not bless the old product-specific wording.
    const planted = hintDefects({ ...shown, [locale]: old[locale] }, { ...twin, [locale]: old[locale] });
    ok(`10.2 · CONTROL · the old ${locale} hint is rejected even when both copies agree`,
      planted.some((x) => x.startsWith(`${locale}: the root hint differs`))
      && planted.some((x) => x.startsWith(`${locale}: the hint names a product`)), planted.join(" | "));
  }
  const reworded = "The link may be stale, or the address was typed incorrectly. Choose a destination below.";
  const exact = hintDefects({ ...shown, en: reworded }, { ...twin, en: reworded });
  ok("10.3 · CONTROL · a product-neutral paraphrase still fails the owner's exact-word pin",
    exact.some((x) => x.startsWith("en: the root hint differs"))
    && !exact.some((x) => x.startsWith("en: the hint names a product")), exact.join(" | "));
}

// ── §11 · the player-drive tile must show its settled state ─────────────────────────────────────────────────────────
console.log("\n§11 · the player drive settles each tile and lifts the pointer after the fifteenth pick");
const DRIVE = "scripts/maswali-player-drive.mjs";
const driveDefects = (src: string) => {
  const d: string[] = [];
  const whole = squash(code(src));
  const openStart = whole.indexOf("async function open(page, path) {");
  const openEnd = whole.indexOf("const tile =", openStart);
  const open = openStart < 0 || openEnd < 0 ? "" : whole.slice(openStart, openEnd);
  if (!open.includes('await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});')) {
    d.push("open has no bounded quiet attempt before state reads");
  }
  const tileStart = whole.indexOf("const tile = async (page, name) => {");
  const tileEnd = whole.indexOf("const notFoundShown", tileStart);
  const tile = tileStart < 0 || tileEnd < 0 ? "" : whole.slice(tileStart, tileEnd);
  const steps = [
    ["evaluates the page before capture", "await page.evaluate(async () => {"],
    ["waits for fonts", "await document.fonts.ready;"],
    ["keeps only finite animations", "document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity)"],
    ["awaits their finished promises", "await Promise.all(oneShot.map((a) => a.finished.catch(() => {})))"],
    ["waits for two animation frames", "await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))"],
    ["takes the screenshot after settling", "return page.screenshot("],
  ] as const;
  let last = -1;
  for (const [label, needle] of steps) {
    const at = tile.indexOf(needle, last + 1);
    if (at < 0) d.push(`tile ${label}`);
    else last = at;
  }
  if (/\}\)\.catch\s*\(/.test(tile)) d.push("tile swallows a settle error before screenshot");
  const pickStart = whole.indexOf("async function buyOne(label) {");
  const pickEnd = whole.indexOf("const first = await buyOne", pickStart);
  const pick = pickStart < 0 || pickEnd < 0 ? "" : whole.slice(pickStart, pickEnd);
  const click = pick.indexOf('for (let i = 0; i < 15; i++) await groups.nth(i).getByRole("radio").first().click();');
  const lift = pick.indexOf("await p.mouse.move(2, 400);", click + 1);
  const answeredTile = pick.indexOf('await tile(p, `${label}-slip-answered-360`);', lift + 1);
  if (!(click >= 0 && lift > click && answeredTile > lift)) d.push("the pointer does not leave the fifteenth pick before the answered-slip tile");
  return d;
};
const plantDrive = (from: string, to: string) => {
  const src = read(DRIVE);
  if (count(src, from) !== 1) throw new Error(`drive plant premise absent or ambiguous: ${from}`);
  return src.replace(from, to);
};
{
  const d = driveDefects(read(DRIVE));
  ok("11.1 · every tile waits for fonts, finite animations, their completion and two frames before capture; pick 15 loses hover", d.length === 0, d.join(" | "));
  const slowOpen = driveDefects(plantDrive('await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});', 'await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});'));
  ok("11.1a · CONTROL · a minute-long quiet wait before each state read is reported", slowOpen.includes("open has no bounded quiet attempt before state reads"), slowOpen.join(" | "));
  const noFonts = driveDefects(plantDrive("    await document.fonts.ready;", "    void document.fonts.ready;"));
  ok("11.2 · CONTROL · a tile that does not await fonts is reported", noFonts.includes("tile waits for fonts"), noFonts.join(" | "));
  const looping = driveDefects(plantDrive("document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity)", "document.getAnimations()"));
  ok("11.3 · CONTROL · waiting on ambient infinite animations is reported", looping.includes("tile keeps only finite animations"), looping.join(" | "));
  const unfinished = driveDefects(plantDrive("await Promise.all(oneShot.map((a) => a.finished.catch(() => {})))", "void Promise.all(oneShot.map((a) => a.finished.catch(() => {})))"));
  ok("11.4 · CONTROL · not awaiting finite animation completion is reported", unfinished.includes("tile awaits their finished promises"), unfinished.join(" | "));
  const oneFrame = driveDefects(plantDrive("requestAnimationFrame(() => requestAnimationFrame(() => done(true)))", "requestAnimationFrame(() => done(true))"));
  ok("11.5 · CONTROL · a single frame before capture is reported", oneFrame.includes("tile waits for two animation frames"), oneFrame.join(" | "));
  const hover = driveDefects(plantDrive("  await p.mouse.move(2, 400);\n  await tile(p, `${label}-slip-answered-360`);", "  await tile(p, `${label}-slip-answered-360`);\n  await p.mouse.move(2, 400);"));
  ok("11.6 · CONTROL · lifting the pointer after the answered-slip tile is reported",
    hover.includes("the pointer does not leave the fifteenth pick before the answered-slip tile"), hover.join(" | "));
  const swallowed = driveDefects(plantDrive("  });\n  return page.screenshot", "  }).catch(() => {});\n  return page.screenshot"));
  ok("11.7 · CONTROL · swallowing a failed tile settle before screenshot is reported",
    swallowed.includes("tile swallows a settle error before screenshot"), swallowed.join(" | "));
}

console.log("\n§12 · the full player screenshot sweep settles quickly without skipping the loaded page");
const SHOTS = "scripts/maswali-player-shots.mjs";
const shotsOpenDefects = (src: string) => {
  const s = squash(code(src));
  const from = s.indexOf("async function open(page, path) {");
  const to = s.indexOf("const owner = await browser.newContext();", from);
  const open = from < 0 || to < 0 ? "" : s.slice(from, to);
  const steps = [
    'await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 180_000 })',
    'await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {})',
    'await document.fonts.ready',
    'requestAnimationFrame(() => requestAnimationFrame(() => done(true)))',
    'await page.waitForTimeout(500)',
  ];
  let last = -1;
  for (const step of steps) {
    const at = open.indexOf(step, last + 1);
    if (at < 0) return [`the screenshot open does not keep its loaded page, bounded quiet attempt, fonts, frames and settle beat in order: ${step}`];
    last = at;
  }
  return [];
};
{
  const d = shotsOpenDefects(read(SHOTS));
  ok("12.1 · the full screenshot sweep reads load, a bounded quiet attempt, fonts, two frames and a settle beat", d.length === 0, d.join(" | "));
  const src = read(SHOTS);
  const from = 'await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {})';
  if (count(src, from) !== 1) throw new Error("screenshot wait plant premise absent or ambiguous");
  const slow = shotsOpenDefects(src.replace(from, 'await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {})'));
  ok("12.2 · CONTROL · a minute-long quiet wait before every screenshot is reported", slow.length === 1, slow.join(" | "));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI UI: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run PRINTS; it only rises, to a printed number. §3.1 and §4.3 each run a small case table. */
const MIN_ASSERTIONS = 133; // 2026-10-19 green run, through §12
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
