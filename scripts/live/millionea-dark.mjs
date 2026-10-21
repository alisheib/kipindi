/**
 * qa:live · [M] MASWALI MILLIONEA STAYS DARK BELOW ITS ROLLOUT (MASWALI-BUILD S1; MASWALI-PLAN §7b, the "Corrections of
 * 2026-10-17"). One module, one call line in `pre-deploy-live-check.mjs`, so the Millionea lane never edits the body of
 * the gate other lanes edit.
 *
 * What it proves, against whatever BASE points at (production after every push):
 *   1. `/api/health` states Millionea's rollout as exactly `{ ceiling, state }`, three words, state never above ceiling.
 *   2. Below ACTIVE, a SIGNED-OUT visitor gets a 404 from every Millionea route — the product's pages, its rules, its share
 *      image, and their percent-encoded spellings — and no Millionea trace in the served documents of the pages where
 *      an entry will live (the journey home's card, the classic board's card, the More row). A signed-out visitor is
 *      never staff, so STAFF_PREVIEW changes nothing for this reader; only ACTIVE may show them.
 *      ⭐ HOW the route answers depends on the CEILING, because the edge reads only the ceiling (`millionea-edge.ts`):
 *        · a ceiling below ACTIVE — the edge marks a dark address unrouted and next.config's rewrite answers it where no
 *          route stands (`src/lib/unrouted.ts`): the router's own 404, AS AN UNKNOWN ADDRESS ANSWERS. So each is fetched
 *          beside its unknown twin (the same address with the product's word swapped for nonsense) and must match it:
 *          the 404 status, the same response-header SET and content type, and no header naming the product (S5-FIX-
 *          PLATFORM D1: a proxy rewrite had put `x-middleware-rewrite: /_millionea-dark` on every dark answer; D4: the
 *          share image answered its own plain-text 404 where an unknown /api address gets the platform's page);
 *        · an ACTIVE ceiling with a lower state — the Owner's kill, during an incident — the edge lets the address through
 *          and the page's own gate answers, after the root loading state has sent its 200: so the proof is the CONTENT —
 *          the platform's not-found words, and no Millionea trace (the S5 review of 24ec0d33, MEDIUM 7).
 *   3. Its own controls: the trace matcher is seen to catch every trace and to pass a page without one.
 *
 * ⏳ The LOCAL positive control (a staff session at STAFF_PREVIEW sees the card and the routes) arrives with the first
 *    surface that can show one (S5); until then there is nothing to see, and the matcher's controls stand in for it.
 * ⛔ Read-only and signed-out: safe against production, as AGENTS.md §4 requires of every `qa:live` read.
 */

const ROLLOUT_WORDS = ["WITHDRAWN", "STAFF_PREVIEW", "ACTIVE"];

/** The platform's not-found words in English, the language `kp-locale=en` asks for — `NOT_FOUND_WORDS.en.notFound`
 *  (`src/components/ui/not-found-words.ts`); `test:maswali-ui` 4.9 holds the two equal. */
export const NOT_FOUND_EN = "Page not found";

/**
 * ⭐ IS THIS THE ANSWER OF A DARK ROUTE? Below an ACTIVE ceiling, the router's 404 status; under an ACTIVE ceiling with a
 * lower state, the not-found page itself — its words, and no Millionea trace — whatever status a streamed page sent.
 */
export function darkAnswerOk(killUnderActive, status, html) {
  if (!killUnderActive) return status === 404;
  return (status === 200 || status === 404) && String(html ?? "").includes(NOT_FOUND_EN) && millioneaTracesIn(html).length === 0;
}

/**
 * Every route Millionea owns or will own, by the plan's route table (MASWALI-PLAN §0) — each must 404 while dark — and its
 * share image (S5-FIX-PLATFORM D4), each answered as its unknown twin is.
 */
export const MILLIONEA_ROUTES = [
  "/millionea",
  "/millionea/how",
  "/millionea/slip",
  "/millionea/tickets",
  "/millionea/register",
  "/legal/rules/millionea",
  "/api/og/millionea/2026-W42",
];

/**
 * Percent-encoded spellings of those routes (an encoded letter). Next 16.4 answers each as an UNKNOWN address — the edge
 * leaves them to it (S5-FIX-PLATFORM D2, not reproduced: measured on `next start` and `next dev`, 2026-10-21) — so each is
 * held to its twin the same way, and a Next that starts routing them to a page is seen here at once.
 */
export const MILLIONEA_SPELLINGS = [
  "/%6Dillionea",
  "/%6Dillionea/slip",
  "/%6Dillionea/tickets",
];

/** A dark route's unknown twin: the same address with the product's word (as typed, or letter-encoded) swapped for a word
 *  of the same length that no route answers. */
export function unknownTwinOf(route) {
  return String(route).replace(/%6[Dd]illionea|millionea/g, "kpzzzzzzz");
}

/** Response headers that differ between any two answers (the clock, the CDN's and the host's per-request stamps, a
 *  body's length): left out of the SET a dark answer must share with its twin. */
export const VOLATILE_HEADERS = ["date", "age", "cf-ray", "cf-cache-status", "server-timing", "nel", "report-to", "alt-svc", "x-railway-request-id",
  "x-railway-edge", "x-railway-fallback", "via", "server", "content-length", "etag", "transfer-encoding", "connection", "keep-alive"];

/** What a dark answer's headers must not be beside its unknown twin's: an empty list is the twin's answer, header for header. */
export function headerDefects(dark, twin) {
  const names = (h) => [...h.keys()].map((k) => k.toLowerCase()).filter((k) => !VOLATILE_HEADERS.includes(k)).sort();
  const d = [];
  for (const [k, v] of dark.entries()) if (/millionea/i.test(`${k}: ${v}`)) d.push(`names the product: ${k}: ${v}`);
  const a = names(dark), b = names(twin);
  const onlyDark = a.filter((k) => !b.includes(k)), onlyTwin = b.filter((k) => !a.includes(k));
  if (onlyDark.length || onlyTwin.length) d.push(`header set differs: only dark ${JSON.stringify(onlyDark)}, only twin ${JSON.stringify(onlyTwin)}`);
  if ((dark.get("content-type") ?? "") !== (twin.get("content-type") ?? "")) d.push(`content type ${dark.get("content-type")} vs ${twin.get("content-type")}`);
  return d;
}

/** The pages that will carry a Millionea entry (the home card, the board card, the More row) — read for traces. */
export const MILLIONEA_ENTRY_PAGES = ["/", "/markets"];

const BS = String.fromCharCode(92);

/**
 * Every Millionea trace a served document can carry: a `millionea-*` test id (element or RSC JSON, escaped or not), a
 * link into `/millionea`, or a prop of that name in the page's payload (S5-FIX-PLATFORM D3: the shell handed every nav
 * `millionea={false}`, which wrote `"millionea":false` into every page). ⛔ The bare word is NOT a trace — a help article
 * may name the product before it launches.
 */
export function millioneaTracesIn(html) {
  const s = String(html ?? "");
  const found = [];
  const id = new RegExp(`data-testid(?:=|${BS}${BS}?":)${BS}${BS}?"(millionea[-][a-z0-9-]+)${BS}${BS}?"`, "g");
  for (const m of s.matchAll(id)) found.push(`testid:${m[1]}`);
  const href = new RegExp(`href(?:=|${BS}${BS}?":)${BS}${BS}?"(/millionea(?:[/?#][^"${BS}${BS}]*)?)${BS}${BS}?"`, "g");
  for (const m of s.matchAll(href)) found.push(`href:${m[1]}`);
  const prop = new RegExp(`${BS}${BS}?"millionea${BS}${BS}?":`, "g");
  for (const m of s.matchAll(prop)) found.push(`prop:${m[0].replace(/[^a-z:"]/g, "")}`);
  return [...new Set(found)];
}

/** The matcher's own control: each trace caught as HTML and as RSC JSON; a page without them, and look-alikes, passed. */
export function millioneaTracesControl() {
  const problems = [];
  const want = (label, html, n) => { const got = millioneaTracesIn(html); if (got.length !== n) problems.push(`${label}: wanted ${n}, got ${JSON.stringify(got)}`); };
  want("element test id", `<a data-testid="millionea-home-card" href="/x">`, 1);
  want("RSC test id, escaped", `self.__next_f.push([1,"{${BS}"data-testid${BS}":${BS}"millionea-more-row${BS}"}"])`, 1);
  want("element link", `<a href="/millionea">`, 1);
  want("link with a path", `<a href="/millionea/tickets#t1">`, 1);
  want("RSC link, escaped", `[${BS}"$${BS}",${BS}"a${BS}",null,{${BS}"href${BS}":${BS}"/millionea${BS}"}]`, 1);
  want("RSC prop, escaped in a document", `self.__next_f.push([1,"{${BS}"invitePaid${BS}":false,${BS}"millionea${BS}":false}"])`, 1);
  want("prop in a flight", `{"inviteVisible":false,"millionea":false}`, 1);
  want("a page with none", `<p>Maswali Millionea is coming.</p><a href="/markets">Markets</a>`, 0);
  want("look-alikes", `<a href="/millioneas"><div data-testid="millioneax"><span>"millioneas":1</span>`, 0);
  return problems;
}

/**
 * Run the section. `ok` and `base` are qa:live's own; nothing here exits or throws — a failure is an `ok(false)`.
 * Returns the Millionea state it read (or null), for any later section that needs it.
 */
export async function millioneaDarkSection({ base, ok, log = console.log }) {
  log("\n[M] Maswali Millionea — dark below its rollout (signed out)");
  let status = 0, body = null, err = "";
  try {
    const r = await fetch(base + "/api/health", { headers: { accept: "application/json" } });
    status = r.status;
    body = await r.json().catch(() => null);
  } catch (e) { err = String(e?.message ?? e); }
  const ml = body && typeof body === "object" ? body.millionea : undefined;
  const isObj = !!ml && typeof ml === "object" && !Array.isArray(ml);
  const shapeOk = isObj && Object.keys(ml).sort().join(",") === "ceiling,state"
    && ROLLOUT_WORDS.includes(ml.ceiling) && ROLLOUT_WORDS.includes(ml.state);
  const agrees = shapeOk && ROLLOUT_WORDS.indexOf(ml.state) <= ROLLOUT_WORDS.indexOf(ml.ceiling);
  ok(`/api/health states Millionea's rollout (millionea.ceiling, .state; state never above its ceiling)`, agrees,
    err ? `(GET /api/health failed: ${err})` : `(HTTP ${status}; millionea = ${JSON.stringify(ml ?? null)})`);

  const problems = millioneaTracesControl();
  ok(`control · the Millionea trace matcher catches test ids, links and the prop (element and RSC payload) and passes look-alikes`,
    problems.length === 0, problems.slice(0, 2).join(" | "));

  const state = agrees ? ml.state : null;
  if (state === "ACTIVE") {
    log("  · Millionea is ACTIVE — every reader may see it; the dark checks do not apply.");
    return state;
  }
  // The Owner's kill under an ACTIVE ceiling: the edge lets the address through, and the not-found page is the proof.
  const killUnderActive = agrees && ml.ceiling === "ACTIVE";
  const ask = async (path) => {
    const r = await fetch(base + path, { redirect: "manual", headers: { accept: "text/html", cookie: "kp-locale=en" } });
    const html = await r.text();
    return { status: r.status, headers: r.headers, html };
  };
  for (const route of [...MILLIONEA_ROUTES, ...MILLIONEA_SPELLINGS]) {
    let dark = null, twin = null, why = "";
    try {
      dark = await ask(route);
      if (!killUnderActive) twin = await ask(unknownTwinOf(route));
    } catch (e) { why = String(e?.message ?? e); }
    const hd = dark ? headerDefects(dark.headers, twin ? twin.headers : dark.headers) : [];
    if (dark && killUnderActive) hd.splice(0, hd.length, ...hd.filter((x) => x.startsWith("names the product")));
    // ⚠️ Under the Owner's kill the edge stands aside, and an /api route answers its own refusal (the share image: a plain
    // 404, no page to carry the not-found words) — so there it must be a 404 with no trace, and no more.
    const api = route.startsWith("/api/");
    const label = killUnderActive
      ? `${route} answers ${api ? "a 404 with no Millionea trace" : "the platform's not-found page"} for a signed-out visitor while the Owner holds Millionea at ${state} under an ACTIVE ceiling (the edge reads the ceiling alone, so the ${api ? "route" : "page's gate"} answers), and no header names the product`
      : `${route} is a 404 for a signed-out visitor while Millionea is ${state ?? "unreadable"}, answered as its unknown twin ${unknownTwinOf(route)} is (the header set, the content type, no header naming the product)`;
    const answered = !!dark && (killUnderActive && api
      ? dark.status === 404 && millioneaTracesIn(dark.html).length === 0
      : darkAnswerOk(killUnderActive, dark.status, dark.html));
    const pass = answered && hd.length === 0 && (killUnderActive || twin?.status === 404);
    ok(label, pass,
      why ? `(fetch failed: ${why})` : killUnderActive
        ? `(HTTP ${dark.status}; ${dark.html.includes(NOT_FOUND_EN) ? "the not-found words" : "NOT the not-found words"}; traces ${millioneaTracesIn(dark.html).join(", ") || "none"}${hd.length ? `; ${hd.join("; ")}` : ""})`
        : `(HTTP ${dark.status}, twin HTTP ${twin?.status}${hd.length ? `; ${hd.join("; ")}` : ""})`);
  }
  for (const page of MILLIONEA_ENTRY_PAGES) {
    let html = "", code = 0, why = "";
    try {
      const r = await fetch(base + page, { headers: { accept: "text/html", cookie: "kp-locale=en" } });
      code = r.status;
      html = await r.text();
    } catch (e) { why = String(e?.message ?? e); }
    const traces = millioneaTracesIn(html);
    ok(`${page} carries no Millionea entry, and no Millionea prop in its payload, for a signed-out visitor while Millionea is ${state ?? "unreadable"}`,
      code === 200 && traces.length === 0, why ? `(fetch failed: ${why})` : `(HTTP ${code}; traces ${traces.join(", ") || "none"})`);
  }
  return state;
}
