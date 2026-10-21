/**
 * test:millionea-dark-edge — A DARK MILLIONEA ADDRESS IS AN UNKNOWN ADDRESS, AND NOTHING ELSE MOVES FOR A CLASSIC READER
 * (MASWALI-BUILD S5-FIX-PLATFORM; the S5 dark-release reviews D1–D8).
 *
 *   npx tsx scripts/millionea-dark-edge.test.mts     (npm run test:millionea-dark-edge)
 *
 *   §1 D2 (not reproduced) · the edge reads an address as typed, as Next routes it: an encoded spelling is an unknown address
 *   §2 D1 · the dark answer is the router's own 404: the REAL proxy marks the request, writes no rewrite header, and drops
 *      a client's forged mark; next.config's one rewrite is conditioned on that mark, goes where no route stands, carries no
 *      named param, and applies only where the proxy runs (both compiled with Next's own matchers)
 *   §3 D4 · the share image is a Millionea address
 *   §4 D5 · the ticket entitlement is loaded late and never throws: a failed read is private absence before admission
 *      and the page's own error path after it (B-1); the real proxy runs the late load for a signed request
 *   §5 D3 · the shell hands the navs `millionea` only while it is true
 *   §6 D6 · the journey's route ghost draws Millionea's ghosts only for a reader Millionea is visible to (rendered on
 *      React's server renderer at each address, in sw, en and zh), and the home's ghost holds the Millionea card's slot
 *      for that reader alone; the root loading file hands the answer only while true
 *   §7 D7 · the leaderboard makes ONE positions read per row, tickets left out by the read (both stores' behaviour:
 *      `test:maswali-player` §11)
 *   §8 D8 · the rulebook names the bar's More panel, opaque for every reader, as the one ruled classic change
 * Every section carries its PLANT: the check run on a copy with the fix undone, seen to fail.
 * The HTTP proof — `next start`, a dark address beside its unknown twin, status, header set and body — is qa:live's
 * dark section (`scripts/live/millionea-dark.mjs`) and the lane's probe, reported with the commit.
 * Reads sources and runs the real modules in memory (no server, no database, no network); writes nothing.
 */
// The Node environment Next's own server sets up before any of its modules run (AsyncLocalStorage on globalThis among
// it), as `test:bet-sheet-host` boots it: the proxy and Next's matchers below run as the server runs them.
import "next/dist/server/node-environment.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import ts from "typescript";
import { NextRequest } from "next/server";
import { decomment } from "./lib/decomment.mts";

const req = createRequire(import.meta.url);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);

/** A module compiled from a (planted) source, at the real file's place, so its relative and `@/` imports resolve. */
function fromSource<T>(rel: string, source: string): T {
  const filename = req.resolve(`../${rel}`);
  req(filename); // the real module first, so its own imports are loaded and its paths known
  const live = (req.cache as Record<string, NodeModule>)[filename];
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const m = new NodeModule(filename);
  m.filename = filename;
  m.paths = live.paths;
  (m as NodeModule & { _compile(s: string, f: string): void })._compile(compiled, filename);
  return m.exports as T;
}
/** `source` with `from` replaced once; refuses a plant whose anchor is not there exactly once. */
const plant = (source: string, from: string, to: string) => {
  if (count(source, from) !== 1) throw new Error(`plant anchor found ${count(source, from)} times: ${from.slice(0, 80)}`);
  return source.replace(from, to);
};

type Edge = typeof import("../src/lib/millionea-edge.ts");
const edge = req("../src/lib/millionea-edge.ts") as Edge;
const { UNROUTED_HEADER, UNROUTED_PATH, UNROUTED_REWRITE } = req("../src/lib/unrouted.ts") as typeof import("../src/lib/unrouted.ts");
const { proxy } = req("../src/proxy.ts") as typeof import("../src/proxy.ts");
const EDGE = "src/lib/millionea-edge.ts";
const GUEST = { signedIn: false, staff: false, holder: false };

/* ══ §1 · D2 · AS TYPED, AS NEXT ROUTES IT ═════════════════════════════════════════════════════════════════════════════ */
section("1 · D2 (not reproduced) · the edge reads an address as typed: Next answers an encoded spelling as an unknown address, so the edge adds nothing of its own there");
/** Encoded spellings: Next 16.4 routes none of them to a page — a 404 identical to its unknown twin's, on `next start` and
 *  `next dev` alike (the lane's HTTP probe, 2026-10-21; qa:live keeps fetching them beside their twins). */
const SPELLINGS = ["/%6Dillionea", "/%6dillionea/how", "/%6Dillionea/slip", "/%6Dillionea/tickets", "/millionea%2Fslip",
  "/legal/rules/%6Dillionea", "/api/og/%6Dillionea/2026-W42"];
const CANONICAL = ["/millionea", "/millionea/how", "/millionea/slip", "/millionea/tickets", "/millionea/tickets/1043", "/millionea/register",
  "/millionea/register/2026-W42", "/legal/rules/millionea", "/api/og/millionea/2026-W42"];
/** Not Millionea addresses: Next does not route them to its pages (encoded spellings; case kept; look-alikes). */
const NOT = [...SPELLINGS, "/Millionea", "/MILLIONEA/slip", "/%256Dillionea", "/millioneas", "/millionea-x", "/api/og/millioneas/x",
  "/legal/rules/millioneax", "/%ZZillionea", "/markets", "/", "/_kp-404", "/positions/pos_1"];
const edgeDefects = (e: Pick<Edge, "isMillioneaPath" | "isMillioneaTicketsPath" | "millioneaDarkAtEdge">) => [
  ...CANONICAL.filter((p) => !e.isMillioneaPath(p) || !e.millioneaDarkAtEdge(p, GUEST, "WITHDRAWN")).map((p) => `missed ${p}`),
  ...NOT.filter((p) => e.isMillioneaPath(p)).map((p) => `caught ${p}`),
  ...["/millionea/tickets", "/millionea/tickets/1043"].filter((p) => !e.isMillioneaTicketsPath(p)).map((p) => `tickets missed ${p}`),
  ...["/millionea/ticketsx", "/millionea", "/Millionea/tickets", "/millionea/%74ickets", "/%6Dillionea/tickets"].filter((p) => e.isMillioneaTicketsPath(p)).map((p) => `tickets caught ${p}`),
];
{
  const d = edgeDefects(edge);
  ok(`1.1 · every Millionea address (${CANONICAL.length}: its pages, its rules, its share image) is dark for a guest at WITHDRAWN; the tickets are the list and one ticket`,
    d.filter((x) => x.includes("missed")).length === 0, j(d));
  ok(`1.2 · and nothing else (${NOT.length}): an encoded spelling, a case variant, a look-alike or a malformed escape is an unknown address to Next, so the edge leaves it as Next answers it`,
    d.filter((x) => x.includes("caught")).length === 0, j(d));
  const AS_TYPED = "return MILLIONEA_ROOTS.some((root) => isAtOrUnder(pathname, root));";
  const decoding = fromSource<Edge>(EDGE, plant(raw(EDGE), AS_TYPED,
    "return [pathname, (() => { try { return decodeURIComponent(pathname); } catch { return pathname; } })()].some((p) => MILLIONEA_ROOTS.some((root) => isAtOrUnder(p, root)));"));
  ok("1.1′ PLANT · the review's proposed decode is reported: it darkens encoded spellings Next answers natively (their flights would carry a rewrite header their twins lack)",
    SPELLINGS.every((p) => edgeDefects(decoding).includes(`caught ${p}`)), j(edgeDefects(decoding)));
  const folded = fromSource<Edge>(EDGE, plant(raw(EDGE), AS_TYPED, "return MILLIONEA_ROOTS.some((root) => isAtOrUnder(pathname.toLowerCase(), root));"));
  ok("1.2′ PLANT · an edge that folds case (darkening addresses Next never routes to Millionea) is reported", edgeDefects(folded).includes("caught /Millionea"), j(edgeDefects(folded)));
}

/* ══ §2 · D1 · THE ROUTER'S OWN 404, WITH NOTHING OF ITS OWN ══════════════════════════════════════════════════════════ */
section("2 · D1 · the real proxy marks a dark request (no rewrite header), drops a forged mark; next.config's one rewrite answers it");
type Answer = { status: number; headers: Record<string, string> };
const ask = async (path: string, headers: Record<string, string> = {}): Promise<Answer> => {
  const res = await proxy(new NextRequest(`http://localhost:3500${path}`, { headers }));
  const h: Record<string, string> = {};
  res.headers.forEach((v, k) => { h[k] = v; });
  return { status: res.status, headers: h };
};
const marked = (a: Answer) => a.headers[`x-middleware-request-${UNROUTED_HEADER}`] === "1"
  && (a.headers["x-middleware-override-headers"] ?? "").split(",").includes(UNROUTED_HEADER);
/** The response's own headers — what Next copies to the browser — less the proxy's request bookkeeping (never sent on). */
const responseSide = (a: Answer) => Object.keys(a.headers).filter((k) => !k.startsWith("x-middleware-")).sort();
{
  delete process.env.FEATURE_MILLIONEA;
  const dark = await Promise.all(CANONICAL.map((p) => ask(p)));
  const unknown = await ask("/kpzzzzzzz");
  ok(`2.1 · at the shipped ceiling every dark address (${dark.length}) is a pass-through marked UNROUTED on the REQUEST — never \`x-middleware-rewrite\` (Next copies a proxy rewrite's target into the response)`,
    dark.every((a) => a.status === 200 && a.headers["x-middleware-next"] === "1" && marked(a) && !("x-middleware-rewrite" in a.headers)),
    j(dark.map((a, i) => [CANONICAL[i], a.status, marked(a), a.headers["x-middleware-rewrite"] ?? null])));
  const spelled = await Promise.all(SPELLINGS.map((p) => ask(p)));
  ok(`2.1a · an encoded spelling (${SPELLINGS.length}) passes unmarked, as an unknown address does — Next answers it as one (D2)`,
    spelled.every((a) => a.status === 200 && !marked(a) && !("x-middleware-rewrite" in a.headers)), j(spelled.map((a, i) => [SPELLINGS[i], marked(a)])));
  ok("2.2 · an unknown address is not marked, and a dark answer's response-side headers are the unknown address's set, value for value",
    !marked(unknown) && dark.every((a) => j(responseSide(a)) === j(responseSide(unknown)) && responseSide(a).every((k) => a.headers[k] === unknown.headers[k])),
    j({ dark: responseSide(dark[0]), unknown: responseSide(unknown) }));
  const forged = await Promise.all(["/markets", "/kpzzzzzzz", "/"].map((p) => ask(p, { [UNROUTED_HEADER]: "1" })));
  ok("2.3 · ⛔ a client's own mark is dropped: absent from the request headers the proxy hands on, so Next deletes it before the rewrite is asked",
    forged.every((a) => !marked(a) && !(`x-middleware-request-${UNROUTED_HEADER}` in a.headers)), j(forged.map((a) => a.headers["x-middleware-override-headers"])));
  process.env.FEATURE_MILLIONEA = "ACTIVE";
  const live = await ask("/millionea");
  process.env.FEATURE_MILLIONEA = "STAFF_PREVIEW";
  const preview = await ask("/millionea");
  delete process.env.FEATURE_MILLIONEA;
  ok("2.4 · an ACTIVE ceiling marks nothing (the page's gate answers the Owner's switch); a guest at STAFF_PREVIEW is marked", !marked(live) && marked(preview));
  // The S5 proxy, planted back: a rewrite of the request to the private segment.
  const PROXY = "src/proxy.ts";
  const rewriting = fromSource<typeof import("../src/proxy.ts")>(PROXY, plant(raw(PROXY), "      requestHeaders.set(UNROUTED_HEADER, \"1\");",
    "      const url = req.nextUrl.clone();\n      url.pathname = \"/_millionea-dark\";\n      url.search = \"\";\n      return withSecurityHeaders(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), secure);"));
  const res = await rewriting.proxy(new NextRequest("http://localhost:3500/millionea"));
  ok("2.1′ PLANT · the S5 proxy rewrite is reported: its answer carries `x-middleware-rewrite` naming the product, and no mark",
    res.headers.has("x-middleware-rewrite") && /millionea/.test(res.headers.get("x-middleware-rewrite") ?? "") && !res.headers.has(`x-middleware-request-${UNROUTED_HEADER}`));
  const trusting = fromSource<typeof import("../src/proxy.ts")>(PROXY, plant(raw(PROXY), "  requestHeaders.delete(UNROUTED_HEADER);\n", ""));
  const f = await trusting.proxy(new NextRequest("http://localhost:3500/markets", { headers: { [UNROUTED_HEADER]: "1" } }));
  ok("2.3′ PLANT · a proxy that forwards a client's mark is reported (the forged mark reaches the rewrite)", f.headers.get(`x-middleware-request-${UNROUTED_HEADER}`) === "1");
}
{
  const config = ((await import("../next.config.ts")) as { default: { rewrites?: () => Promise<unknown> } }).default;
  const rewrites = (await config.rewrites?.()) as { beforeFiles?: unknown[]; afterFiles?: unknown[]; fallback?: unknown[] } | undefined;
  ok("2.5 · next.config.ts has exactly ONE rewrite, before the file system, conditioned on the proxy's mark, to UNROUTED_PATH",
    !!rewrites && j(rewrites.beforeFiles) === j([UNROUTED_REWRITE]) && (rewrites.afterFiles ?? []).length === 0 && (rewrites.fallback ?? []).length === 0
      && j(UNROUTED_REWRITE.has) === j([{ type: "header", key: UNROUTED_HEADER, value: "1" }]) && UNROUTED_REWRITE.destination === UNROUTED_PATH, j(rewrites));
  ok(`2.6 · UNROUTED_PATH (${UNROUTED_PATH}) is a private segment no route can answer, and it names nothing of the product`,
    UNROUTED_PATH.startsWith("/_") && !existsSync(join("src/app", UNROUTED_PATH.slice(1))) && !/millionea|maswali/i.test(UNROUTED_PATH + UNROUTED_HEADER));
}
{
  // Next's own matchers: the proxy's (the build's middleware analysis) and a custom route's (path-match, as resolve-routes
  // builds it: strict, unnamed params removed, case-insensitive).
  const { getMiddlewareMatchers } = req("next/dist/build/analysis/get-page-static-info.js") as { getMiddlewareMatchers: (m: string[], c: object) => { regexp: string }[] };
  const { getPathMatch } = req("next/dist/shared/lib/router/utils/path-match.js") as { getPathMatch: (p: string, o: object) => (path: string) => false | Record<string, unknown> };
  const m = /export const config = \{[\s\S]*?matcher:\s*\[\s*("(?:[^"\\]|\\.)*")\s*,?\s*\]/.exec(raw("src/proxy.ts"));
  const MATCHER: string = m ? JSON.parse(m[1]) : "";
  const proxyRe = getMiddlewareMatchers([MATCHER], {}).map((x) => new RegExp(x.regexp));
  const decoded = (p: string) => { try { return decodeURIComponent(p); } catch { return p; } };
  /** Next runs the proxy when its matcher takes the address as typed OR decoded (resolve-routes.js). */
  const proxyRuns = (p: string) => proxyRe.some((r) => r.test(p) || r.test(decoded(p)));
  const rewriteOf = (source: string) => getPathMatch(source, { strict: true, removeUnnamedParams: true, sensitive: false });
  const applies = rewriteOf(UNROUTED_REWRITE.source);
  const STATIC = ["/_next/static/chunks/main-abc.js", "/_next/static/media/sora.woff2", "/_next/image", "/favicon.ico", "/favicon.svg", "/icons/g/app.svg",
    "/brand/mark.png", "/pay/mpesa.png", "/og/card.png", "/screenshots/a.png", "/email-signatures/b.png", "/ICONS/g/app.svg", "/_NEXT/static/x.js"];
  const PAGES = ["/millionea", "/millionea/slip", "/%6Dillionea", "/millionea%2Fslip", "/legal/rules/millionea", "/api/og/millionea/2026-W42", "/markets",
    "/", "/fonts/sora.woff2", "/iconsx/a.png", "/%69cons/a.png", "/favicon.ico/x", "/markets/x.png", "/wallet"];
  const everywhere = [...STATIC, ...PAGES];
  const leaks = everywhere.filter((p) => applies(p) !== false && !proxyRuns(p));
  ok(`2.7 · ⛔ the rewrite applies only where the proxy runs (${everywhere.length} addresses through both of Next's matchers): never on a static file the proxy skips, so a forged mark cannot reach one; on every page address`,
    MATCHER !== "" && leaks.length === 0 && STATIC.filter((p) => !/[A-Z]/.test(p)).every((p) => applies(p) === false) && PAGES.every((p) => applies(p) !== false && proxyRuns(p)),
    j({ leaks, missedPages: PAGES.filter((p) => applies(p) === false || !proxyRuns(p)) }));
  const wide = rewriteOf("/(.*)");
  ok("2.7′ PLANT · a rewrite source without the proxy's static skip list is reported: it applies to Next's static output, which the proxy never sees",
    everywhere.filter((p) => wide(p) !== false && !proxyRuns(p)).includes("/_next/static/chunks/main-abc.js"));
  const params = applies("/millionea/slip");
  const named = rewriteOf(UNROUTED_REWRITE.source.replace("/((?!", "/:path((?!"))("/millionea/slip");
  ok("2.8 · its group is unnamed, so Next appends no param to the target's query (the address never rides along to /_kp-404)",
    params !== false && Object.keys(params).length === 0, j(params));
  ok("2.8′ CONTROL · the same source with a NAMED group hands Next a `path` param to append", named !== false && named.path === "millionea/slip", j(named));
}

/* ══ §3 · D4 · THE SHARE IMAGE ════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · D4 · the share image's address is Millionea's: dark at the edge like its pages, so it answers an unknown /api address's 404");
{
  const OG = ["/api/og/millionea/2026-W42", "/api/og/millionea/MLN-2026-W42"];
  ok("3.1 · each share-image address is a Millionea address, dark for a guest below ACTIVE and passed at ACTIVE (the route's own door decides there)",
    OG.every((p) => edge.isMillioneaPath(p) && edge.millioneaDarkAtEdge(p, GUEST, "WITHDRAWN") && edge.millioneaDarkAtEdge(p, GUEST, "STAFF_PREVIEW") && !edge.millioneaDarkAtEdge(p, GUEST, "ACTIVE")));
  const withoutOg = fromSource<Edge>(EDGE, plant(raw(EDGE), 'const MILLIONEA_ROOTS = ["/millionea", "/legal/rules/millionea", "/api/og/millionea"] as const;',
    'const MILLIONEA_ROOTS = ["/millionea", "/legal/rules/millionea"] as const;'));
  ok("3.1′ PLANT · the S5 list (pages and rules only) is reported: the share image answers its own plain-text 404", OG.every((p) => !withoutOg.isMillioneaPath(p)));
}

/* ══ §4 · D5 · LOADED LATE, NEVER THROWING ════════════════════════════════════════════════════════════════════════════ */
section("4 · D5 · the ticket entitlement is loaded on a signed dark ticket request alone, and no read failure becomes a 500");
type Ent = typeof import("../src/lib/server/millionea-edge-entitlement.ts");
const ENT = "src/lib/server/millionea-edge-entitlement.ts";
{
  const p = squash(code("src/proxy.ts"));
  const statics = [...code("src/proxy.ts").matchAll(/^\s*import\s+(?!type\s)[\s\S]*?\s+from\s+["']([^"']+)["']/gm)].map((x) => x[1]);
  ok("4.1 · the proxy imports no store module at load: its static imports are next/server and pure modules, and the entitlement is a dynamic import inside `ticketHolderAtEdge`'s try, asked only for a signed request at a tickets address",
    !statics.some((s) => s.includes("millionea-edge-entitlement")) && statics.filter((s) => s.startsWith("@/lib/server/")).every((s) => s === "@/lib/server/roles")
      && p.includes('async function ticketHolderAtEdge(pathname: string, session: VerifiedProxySession): Promise<boolean> { try { const { millioneaTicketEntitledAtEdge } = await import("@/lib/server/millionea-edge-entitlement"); return await millioneaTicketEntitledAtEdge(pathname, session); } catch { return false; } }')
      && p.includes("const holder = session !== null && isMillioneaTicketsPath(pathname) ? await ticketHolderAtEdge(pathname, session) : false;"), j(statics));
  const { millioneaTicketEntitledAtEdge } = req(`../${ENT}`) as Ent;
  const now = Date.UTC(2026, 9, 21, 12);
  const session = { userId: "u_holder", sessionId: "s_1", exp: now + 3_600_000, iat: now - 1000, lastSeenAt: now - 1000 };
  const boom = async () => { throw new Error("database unreachable"); };
  const reads = (o: Partial<Parameters<typeof millioneaTicketEntitledAtEdge>[2]> = {}) => ({
    activeSession: async () => ({ state: "active" as const, sessionId: "s_1" }),
    holdsAny: async () => true,
    ownerOf: async (serial: string) => (serial === "MLN-2026-W42-000017" ? "u_holder" : "u_other"),
    ...o,
  }) as Parameters<typeof millioneaTicketEntitledAtEdge>[2];
  const SERIAL = "/millionea/tickets/MLN-2026-W42-000017";
  const cases: Array<[string, Promise<boolean>, boolean]> = [
    ["the owner's ticket", millioneaTicketEntitledAtEdge(SERIAL, session, reads(), now), true],
    ["another account's ticket", millioneaTicketEntitledAtEdge("/millionea/tickets/MLN-2026-W42-000018", session, reads(), now), false],
    ["the list", millioneaTicketEntitledAtEdge("/millionea/tickets", session, reads(), now), true],
    ["an encoded spelling of the list (an unknown address to Next)", millioneaTicketEntitledAtEdge("/millionea/%74ickets", session, reads(), now), false],
    ["a registry read that throws", millioneaTicketEntitledAtEdge(SERIAL, session, reads({ activeSession: boom as never }), now), false],
    ["a holding read that throws", millioneaTicketEntitledAtEdge(SERIAL, session, reads({ holdsAny: boom }), now), false],
    ["a detail read that throws, after admission (B-1)", millioneaTicketEntitledAtEdge(SERIAL, session, reads({ ownerOf: boom }), now), true],
    ["a non-holder whose detail read would throw", millioneaTicketEntitledAtEdge(SERIAL, session, reads({ holdsAny: async () => false, ownerOf: boom }), now), false],
  ];
  const got = await Promise.all(cases.map(async ([, p]) => { try { return await p; } catch (e) { return `THREW ${String((e as Error).message)}`; } }));
  ok("4.2 · ⛔ never a throw: a failed session or holding read is private absence (404); a failed detail read after admission goes on to the page's own error path (B-1: never a not-found drawn over a holder's ticket); the list is matched as typed, as Next routes it",
    cases.every(([, , want], i) => got[i] === want), j(cases.map(([name], i) => [name, got[i]])));
  const old = fromSource<Ent>(ENT, plant(raw(ENT), "  let owner: string | null;\n  try { owner = await reads.ownerOf(serial); } catch { return true; }\n  return owner === session.userId;",
    "  return (await reads.ownerOf(serial)) === session.userId;"));
  let threw = "";
  try { await old.millioneaTicketEntitledAtEdge(SERIAL, session, reads({ ownerOf: boom }), now); } catch (e) { threw = String((e as Error).message); }
  ok("4.2′ PLANT · the S5 detail read (no catch) is reported: it throws into the proxy, a 500", threw === "database unreachable", threw);
  // The real proxy, a validly signed cookie for an account no registry knows, at a tickets address: the late load runs.
  const { signSession } = req("../src/lib/server/crypto.ts") as { signSession: (o: object) => string };
  const t = Date.now();
  const cookie = signSession({ userId: "u_nobody", sessionId: "s_nobody", role: "PLAYER", exp: t + 3_600_000, iat: t - 1000, lastSeenAt: t - 1000 });
  const signed = await Promise.all(["/millionea/tickets", "/millionea/tickets/MLN-2026-W42-000017"].map((p) => ask(p, { cookie: `kp_session=${cookie}` })));
  ok("4.3 · the real proxy, signed in with no registry row, at both tickets addresses: the entitlement loads late, answers no, and the request is marked dark — no throw",
    signed.every((a) => a.status === 200 && marked(a)), j(signed.map((a) => [a.status, marked(a)])));
}

/* ══ §5 · D3 · THE SHELL'S PROP, ONLY WHEN TRUE ══════════════════════════════════════════════════════════════════════ */
section("5 · D3 · the shell hands the four navs `millionea` only while it is true, so a classic page's payload carries none");
const shellDefects = (shellSrc: string, navs: Record<string, string>) => {
  const s = squash(decomment(shellSrc));
  const d: string[] = [];
  if (!s.includes("const millioneaProp: { millionea?: true } = millioneaRow ? { millionea: true } : {};")) d.push("no prop object that is empty while Millionea is hidden");
  if (count(s, "{...millioneaProp}") !== 4) d.push(`the prop object reaches ${count(s, "{...millioneaProp}")} navs, not the four`);
  if (/millionea=\{/.test(s)) d.push("a nav is still handed millionea={…}: false is written into every payload");
  for (const [file, sig] of Object.entries(navs)) if (!squash(decomment(raw(file))).includes(sig)) d.push(`${file} does not default the prop to false`);
  return d;
};
{
  const NAVS = {
    "src/components/layout/top-app-bar.tsx": "invitePaid = false, millionea = false }",
    "src/components/layout/bottom-nav.tsx": "walletHeld = false, millionea = false }",
    "src/components/journey/journey-tabs.tsx": "export function JourneyTabs({ userId, millionea = false }",
    "src/components/journey/journey-top-bar.tsx": "millionea = false,",
  };
  const SHELL = "src/components/layout/app-shell.tsx";
  const d = shellDefects(raw(SHELL), NAVS);
  ok("5.1 · `millioneaProp` is `{}` while Millionea is hidden and is spread into exactly the four navs, each of which defaults the prop to false", d.length === 0, d.join(" | "));
  const s5 = raw(SHELL).split("{...millioneaProp}").join("millionea={millioneaRow}");
  ok("5.1′ PLANT · the S5 shell (`millionea={millioneaRow}` on each nav) is reported", shellDefects(s5, NAVS).some((x) => x.includes("still handed")));
}

/* ══ §6 · D6 · THE ROUTE GHOST ════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · D6 · a Millionea address draws Millionea's ghost only for a reader Millionea is visible to; to anyone else it is the unknown page's");
{
  type Locale = "sw" | "en" | "zh";
  const React = req("react") as typeof import("react");
  const h = React.createElement;
  const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
  const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
  const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
  const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Locale; children: unknown }) => unknown };
  const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
  const GHOST = "src/components/journey/route-ghost.tsx";
  type Ghost = (p: { rails: readonly string[]; millionea?: boolean }) => unknown;
  const real = (req(`../${GHOST}`) as { JourneyRouteGhost: Ghost }).JourneyRouteGhost;
  const at = (G: Ghost, path: string, l: Locale, millionea?: boolean) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER },
    h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l }, h(G as never, { rails: [], ...(millionea ? { millionea } : {}) } as never)))));
  const MLN = ["/millionea", "/millionea/slip", "/millionea/tickets", "/millionea/tickets/MLN-2026-W42-000017"];
  const LOCALES: Locale[] = ["sw", "en", "zh"];
  const hiddenDefects = (G: Ghost) => LOCALES.flatMap((l) => MLN.filter((p) => at(G, p, l) !== at(G, "/kpzzzzzzz", l)).map((p) => `${l} ${p}`));
  const shownDefects = (G: Ghost) => LOCALES.flatMap((l) => MLN.filter((p) => at(G, p, l, true) === at(G, "/kpzzzzzzz", l, true)).map((p) => `${l} ${p}`));
  ok(`6.1 · Millionea hidden from the reader: each of its ${MLN.length} addresses draws the unknown page's ghost, byte for byte, in sw, en and zh`, hiddenDefects(real).length === 0, j(hiddenDefects(real)));
  ok("6.2 · Millionea visible to the reader: each draws its own Millionea ghost (the S5 drawings), in sw, en and zh", shownDefects(real).length === 0, j(shownDefects(real)));
  const ignoring = fromSource<{ JourneyRouteGhost: Ghost }>(GHOST, plant(plant(raw(GHOST), "    ...(millionea ? {\n", "    ...(true ? {\n"),
    '...(millionea ? [["^/millionea/tickets/[^/]+$", <MillioneaTicketGhost />] as const] : [])', '["^/millionea/tickets/[^/]+$", <MillioneaTicketGhost />] as const')).JourneyRouteGhost;
  ok("6.1′ PLANT · the S5 ghost (picked by the address alone) is reported: a hidden reader sees Millionea-shaped ghosts", hiddenDefects(ignoring).length === MLN.length * LOCALES.length, j(hiddenDefects(ignoring)));
  const loading = squash(code("src/app/loading.tsx"));
  ok("6.3 · the root loading file hands the ghost the rollout's per-request answer, and only while it is true",
    loading.includes("const millionea = (await resolveMillionea()).visible; return <LazyJourneyRouteGhost rails={heroRailNames(null)} {...(millionea ? { millionea } : {})} />;")
      && loading.includes('import { resolveMillionea } from "@/lib/server/millionea-preview";'));
  // The doors lane's H1: the home's ghost keeps the Millionea card's slot for a reader it is visible to, and only for one.
  const SLOT = 'data-ghost-part="millionea"';
  const slotDefects = (G: Ghost) => LOCALES.flatMap((l) => [...(at(G, "/", l).includes(SLOT) ? [`${l} hidden reader has the slot`] : []), ...(at(G, "/", l, true).includes(SLOT) ? [] : [`${l} visible reader lacks the slot`])]);
  ok("6.4 · \"/\": the journey home's ghost holds the Millionea card's slot for a reader Millionea is visible to, and draws none for anyone else (sw, en, zh)",
    slotDefects(real).length === 0, j(slotDefects(real)));
  const unhanded = fromSource<{ JourneyRouteGhost: Ghost }>(GHOST, plant(raw(GHOST), '"/": <JourneyHomeGhost t={t} millionea={millionea} />,', '"/": <JourneyHomeGhost t={t} />,')).JourneyRouteGhost;
  ok("6.4′ PLANT · a home ghost not handed the answer (the slot never held: the card would push the page down as it lands) is reported",
    slotDefects(unhanded).some((x) => x.includes("lacks")));
}

/* ══ §7 · D7 · ONE READ PER ROW ══════════════════════════════════════════════════════════════════════════════════════ */
section("7 · D7 · the leaderboard decorates each row from ONE bounded read, tickets left out by the read itself");
const boardDefects = (src: string) => {
  const s = squash(decomment(src));
  const d: string[] = [];
  const READ = "positions: await Promise.resolve(lens === \"ALL\" ? positionStore.listScoredForUser(r.userId, ROW_RECENT) : listPositionsForUser(r.userId, ROW_RECENT, lens)).catch(() => null),";
  if (count(s, READ) !== 1) d.push("the per-row read is not the one scored read (all) or the lens's line, at ROW_RECENT");
  if ((s.match(/listScoredForUser\(|listPositionsForUser\(/g) ?? []).length !== 2) d.push("more than one positions read per row");
  if (/Promise\.all\(\s*lines\.map|SCORED_LINES|scoredPositions\(|"MASWALI"/.test(s)) d.push("a read per scored line (or a ticket read) is back");
  if (!s.includes("const ROW_RECENT = 200;")) d.push("the bound is not main's 200");
  if (!s.includes("const positions = detail[i].positions ?? [];")) d.push("a failed read does not leave the row undecorated");
  return d;
};
{
  const PAGE = "src/app/leaderboard/page.tsx";
  ok("7.1 · each of the board's rows makes ONE positions read: on \"all\" `listScoredForUser` (every line but Millionea's, excluded in the read, before its bound), on a lens that line — each at main's 200",
    boardDefects(raw(PAGE)).length === 0, boardDefects(raw(PAGE)).join(" | "));
  const s5 = plant(raw(PAGE), "positions: await Promise.resolve(lens === \"ALL\" ? positionStore.listScoredForUser(r.userId, ROW_RECENT) : listPositionsForUser(r.userId, ROW_RECENT, lens)).catch(() => null),",
    "positions: await Promise.all(SCORED_LINES.map((l) => Promise.resolve(listPositionsForUser(r.userId, ROW_RECENT, l)).catch(() => null))),");
  ok("7.1′ PLANT · the S5 read (one per scored line: up to twice main's rows for every row) is reported", boardDefects(s5).some((x) => x.includes("per scored line")));
  const dal = squash(decomment(raw("src/lib/server/market-dal.ts")));
  ok("7.2 · both stores answer it: the memory twin leaves out what `storedProductLine` reads as MASWALI before its slice, the SQL twin `productLine <> 'MASWALI'` before `take`",
    dal.includes("listScoredForUser(userId: string, limit?: number): Promise<StoredPosition[]>;")
      && dal.includes('.filter((p) => p.userId === userId && storedProductLine(markets.get(p.marketId)?.productLine) !== "MASWALI") .sort((a, b) => b.placedAt.localeCompare(a.placedAt)) .slice(0, limit);')
      && dal.includes('where: { userId, market: { productLine: { not: "MASWALI" } } }, orderBy: { placedAt: "desc" }, take: limit,'));
}

/* ══ §8 · D8 · THE RULEBOOK TELLS THE TRUTH ══════════════════════════════════════════════════════════════════════════ */
section("8 · D8 · §M8a item 11 names the bar's More panel, opaque for every reader, as the one change it rules for classic chrome");
const daDefects = (da: string, navMore: string) => {
  const d: string[] = [];
  const at = da.indexOf("11. **Placement: Millionea's own tab");
  const item = squash(at < 0 ? "" : da.slice(at, da.indexOf("12. **Icons are Phosphor", at)));
  if (!item) d.push("item 11 not found");
  if (/every nav is byte-identical/.test(item)) d.push("item 11 still says every nav is byte-identical while WITHDRAWN");
  if (!item.includes("with one ruled change that every reader gets: the classic bar's More panel is opaque")) d.push("item 11 does not name the ruled classic change where it speaks of WITHDRAWN");
  if (!item.includes("The bar's panel is opaque for EVERY reader, Millionea shown or not: the one change to the classic chrome this item rules")) d.push("item 11's panel sentence does not say it applies to every reader");
  const bar = squash(decomment(navMore));
  if (!bar.includes('className="absolute right-0 top-[calc(100%+6px)] z-[50] min-w-[190px] rounded-modal border border-border-strong bg-bg-elevated p-1 shadow-overlay"')) d.push("premise: the bar's More panel is not the opaque surface");
  return d;
};
{
  const DA = raw("docs/DESIGN_AUTHORITY.md"), NAV = raw("src/components/layout/nav-more.tsx");
  ok("8.1 · item 11 no longer calls every nav byte-identical; it names the bar's More panel, opaque for every reader, as the ruled classic change (and the panel is opaque)",
    daDefects(DA, NAV).length === 0, daDefects(DA, NAV).join(" | "));
  const before = DA.replace("while WITHDRAWN every nav draws what it drew before Millionea, with\n    one ruled change that every reader gets: the classic bar's More panel is opaque, below)", "while WITHDRAWN every nav is byte-identical to before)");
  ok("8.1′ PLANT · the S5 sentence (\"while WITHDRAWN every nav is byte-identical to before\") is reported", before !== DA && daDefects(before, NAV).some((x) => x.includes("byte-identical")));
}

console.log(`\nmillionea-dark-edge: ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exitCode = 1; }
