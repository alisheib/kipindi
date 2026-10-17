/**
 * qa:live · [M] MASWALI MILLIONEA STAYS DARK BELOW ITS ROLLOUT (MASWALI-BUILD S1; MASWALI-PLAN §7b, the "Corrections of
 * 2026-10-17"). One module, one call line in `pre-deploy-live-check.mjs`, so the Millionea lane never edits the body of
 * the gate other lanes edit.
 *
 * What it proves, against whatever BASE points at (production after every push):
 *   1. `/api/health` states Millionea's rollout as exactly `{ ceiling, state }`, three words, state never above ceiling.
 *   2. Below ACTIVE, a SIGNED-OUT visitor gets a 404 from every Millionea route — the product's pages and its rules —
 *      and no Millionea trace in the served documents of the pages where an entry will live (the journey home's card,
 *      the classic board's card, the More row). A signed-out visitor is never staff, so STAFF_PREVIEW changes nothing
 *      for this reader; only ACTIVE may show them.
 *   3. Its own controls: the trace matcher is seen to catch every trace and to pass a page without one.
 *
 * ⏳ The LOCAL positive control (a staff session at STAFF_PREVIEW sees the card and the routes) arrives with the first
 *    surface that can show one (S5); until then there is nothing to see, and the matcher's controls stand in for it.
 * ⛔ Read-only and signed-out: safe against production, as AGENTS.md §4 requires of every `qa:live` read.
 */

const ROLLOUT_WORDS = ["WITHDRAWN", "STAFF_PREVIEW", "ACTIVE"];

/** Every route Millionea owns or will own, by the plan's route table (MASWALI-PLAN §0) — each must 404 while dark. */
export const MILLIONEA_ROUTES = [
  "/millionea",
  "/millionea/how",
  "/millionea/slip",
  "/millionea/tickets",
  "/millionea/register",
  "/legal/rules/millionea",
];

/** The pages that will carry a Millionea entry (the home card, the board card, the More row) — read for traces. */
export const MILLIONEA_ENTRY_PAGES = ["/", "/markets"];

const BS = String.fromCharCode(92);

/**
 * Every Millionea trace a served document can carry: a `millionea-*` test id (element or RSC JSON, escaped or not) or a
 * link into `/millionea`. ⛔ The bare word is NOT a trace — a help article may name the product before it launches.
 */
export function millioneaTracesIn(html) {
  const s = String(html ?? "");
  const found = [];
  const id = new RegExp(`data-testid(?:=|${BS}${BS}?":)${BS}${BS}?"(millionea[-][a-z0-9-]+)${BS}${BS}?"`, "g");
  for (const m of s.matchAll(id)) found.push(`testid:${m[1]}`);
  const href = new RegExp(`href(?:=|${BS}${BS}?":)${BS}${BS}?"(/millionea(?:[/?#][^"${BS}${BS}]*)?)${BS}${BS}?"`, "g");
  for (const m of s.matchAll(href)) found.push(`href:${m[1]}`);
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
  want("a page with none", `<p>Maswali Millionea is coming.</p><a href="/markets">Markets</a>`, 0);
  want("look-alikes", `<a href="/millioneas"><div data-testid="millioneax">`, 0);
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
  ok(`control · the Millionea trace matcher catches test ids and links (element and RSC payload) and passes look-alikes`,
    problems.length === 0, problems.slice(0, 2).join(" | "));

  const state = agrees ? ml.state : null;
  if (state === "ACTIVE") {
    log("  · Millionea is ACTIVE — every reader may see it; the dark checks do not apply.");
    return state;
  }
  for (const route of MILLIONEA_ROUTES) {
    let code = 0, why = "";
    try {
      const r = await fetch(base + route, { redirect: "manual", headers: { accept: "text/html" } });
      code = r.status;
      await r.arrayBuffer().catch(() => null);
    } catch (e) { why = String(e?.message ?? e); }
    ok(`${route} is a 404 for a signed-out visitor while Millionea is ${state ?? "unreadable"}`, code === 404,
      why ? `(fetch failed: ${why})` : `(HTTP ${code})`);
  }
  for (const page of MILLIONEA_ENTRY_PAGES) {
    let html = "", code = 0, why = "";
    try {
      const r = await fetch(base + page, { headers: { accept: "text/html", cookie: "kp-locale=en" } });
      code = r.status;
      html = await r.text();
    } catch (e) { why = String(e?.message ?? e); }
    const traces = millioneaTracesIn(html);
    ok(`${page} carries no Millionea entry for a signed-out visitor while Millionea is ${state ?? "unreadable"}`,
      code === 200 && traces.length === 0, why ? `(fetch failed: ${why})` : `(HTTP ${code}; traces ${traces.join(", ") || "none"})`);
  }
  return state;
}
