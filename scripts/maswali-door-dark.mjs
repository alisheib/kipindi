/**
 * qa:maswali-door-dark — NO MILLIONEA ANSWER IN THE PAYLOAD OF A READER IT IS HIDDEN FROM (MASWALI-BUILD S5-DESIGN-DOORS
 * round 2, the dark-safety blocker found by S5-FIX-PLATFORM: /markets' loading file handed its client drawing
 * `millionea={false}` on every visitor's board). `test:maswali-doors` §5 holds the source side; this reads the real bytes.
 *
 *   A FRESH in-memory `next dev` with FEATURE_MILLIONEA=WITHDRAWN (or STAFF_PREVIEW) and DISABLE_ADMIN_TOTP=true, then:
 *   BASE=http://localhost:3530 node scripts/maswali-door-dark.mjs          (DOOR_DARK_PLANT=1 adds the plant below)
 *
 * Every page a door's code renders on, read the two ways its payload reaches a browser — the document (its inline Flight,
 * decoded as the browser decodes it) and the flight of a soft navigation (`RSC: 1`) — for each reader Millionea is hidden
 * from at this rollout:
 *   · a signed-out visitor: /, /markets, a question under it, /results, /updown, /live;
 *   · the demo player on the classic shell: those and /positions, /updown/history (Tiketi zangu's doors);
 *   · the same player on the journey (the JOURNEY's staff preview pass beside the session — Millionea's own preview reads
 *     the session's stored role, so the player stays a reader it is hidden from) on the same pages.
 * Each read must carry no Millionea trace by qa:live's own matcher (`millioneaTracesIn`: a test id, a link, a
 * `"millionea":` prop), and no client element in it may be handed a rollout answer (`millionea`, `millioneaOnBreak`; the
 * board's drawing `preview`) — every client element's props read out of the Flight rows, as the browser receives them.
 * ⭐ ITS CONTROLS, so an absence means something:
 *   · every read is a real page — HTTP 200 and Flight in it; a classic reader's board and question carry the board's
 *     loading picture (markets-ghost.tsx's default export, a client reference) with its props `{}`, the element main
 *     serves; every journey payload carries the root loading's route ghost, handed no `millionea`;
 *   · STAFF_PREVIEW: a staff session's board DOES hand its drawing `{"millionea":true,"preview":true}` and its navs
 *     `"millionea":true` — the reader sees the answers where they are handed;
 *   · WITHDRAWN with DOOR_DARK_PLANT=1: round 1's line is written back into `src/app/markets/loading.tsx` on this running
 *     dev server; the signed-out board must then hand `{"millionea":false,"preview":false}` and trip the matcher — caught —
 *     and the file is restored byte for byte (also on an interrupt) and the board seen clean again.
 *   · THE LANDING'S LINE (MASWALI-BUILD S5 landing door): every hidden reader's / above carries none of it (its test id and
 *     its link are the matcher's traces); with the plant, its answer is planted open in `millionea-doors.ts` — the signed-out
 *     / then draws it and is caught — and restored the same way; at STAFF_PREVIEW, staff (Millionea visible to them) are
 *     drawn no line while no week is sold to them.
 * ⛔ LOCAL ONLY: an in-memory http://localhost server (`premise`). It writes nothing but the dev endpoints' fixtures (the
 *    demo and staff accounts, the market catalogue's seed) and, with the plant, the one source file it restores.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { millioneaTracesIn } from "./live/millionea-dark.mjs";
import { clientElements, flightOfDocument } from "./lib/flight-elements.mjs";

const BASE = process.env.BASE || "http://localhost:3530";
const PLANT = process.env.DOOR_DARK_PLANT === "1";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`  ok   ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };

const pre = await premise(BASE);
if (pre.refuse) die(pre.refuse);
const STATE = pre.health?.millionea?.state;
if (STATE !== "WITHDRAWN" && STATE !== "STAFF_PREVIEW") die(`/api/health says millionea = ${JSON.stringify(pre.health?.millionea)}: start next dev with FEATURE_MILLIONEA=WITHDRAWN or STAFF_PREVIEW`);
if (PLANT && STATE !== "WITHDRAWN") die("the plant runs on a WITHDRAWN server only");
console.log(`maswali-door-dark · Millionea ${STATE} at ${BASE}${PLANT ? " · with the plant" : ""}`);

/** The rollout's answers a door is handed (test:maswali-doors §5's ANSWERS); `preview` is held on the board's drawing. */
const ANSWERS = ["millionea", "millioneaOnBreak"];
/** The board's loading picture: markets-ghost.tsx's default export (its `MarketsBoardGhost` is the page's own fallback). */
const BOARD_DRAWING = "markets-ghost.tsx#default";
const isBoardDrawing = (e) => e.module.includes("/src/app/markets/markets-ghost.tsx") && e.name === "default";
const nameOf = (e) => `${e.module.replace(/^.*\/src\//, "src/").replace(/ \[app-client\].*$/, "")}#${e.name}`;

const cookieHeader = (cookies) => [`${LOCALE_COOKIE}=en`, ...cookies.map((c) => `${c.name}=${c.value}`)].join("; ");
/** One page, read as a document or as a soft navigation's flight (the 307 to its cache-busting address followed). */
async function readPage(path, cookies, form) {
  const headers = { cookie: cookieHeader(cookies), ...(form === "flight" ? { RSC: "1" } : { accept: "text/html" }) };
  const r = await fetch(BASE + path, { headers, redirect: "follow" });
  const body = await r.text();
  const flight = form === "flight" ? body : flightOfDocument(body);
  return { status: r.status, url: r.url, body, flight, type: r.headers.get("content-type") ?? "" };
}
/** What a read hands that a reader Millionea is hidden from must never be handed. */
function hiddenDefects(read, { board }) {
  const d = [];
  const traces = [...new Set([...millioneaTracesIn(read.body), ...millioneaTracesIn(read.flight)])];
  if (traces.length) d.push(`traces ${traces.join(", ")}`);
  const els = clientElements(read.flight);
  for (const e of els) {
    if (e.props === null) { d.push(`unread props of ${nameOf(e)}: ${String(e.text).slice(0, 60)}`); continue; }
    const keys = Object.keys(e.props).filter((k) => ANSWERS.includes(k) || (k === "preview" && isBoardDrawing(e)));
    if (keys.length) d.push(`${nameOf(e)} handed ${keys.map((k) => `${k}:${JSON.stringify(e.props[k])}`).join(", ")}`);
  }
  const drawings = els.filter(isBoardDrawing);
  if (board && drawings.length === 0) d.push(`PREMISE: no board drawing (${BOARD_DRAWING}) in the payload — ${els.length} client elements read`);
  return { d, els: els.length, drawings: drawings.map((e) => e.text) };
}

const browser = await chromium.launch();
const restore = { file: "src/app/markets/loading.tsx", original: null };
// MASWALI-BUILD S5 landing door: the landing line's answer, planted open (`DOOR_DARK_PLANT=1`) and restored the same way.
const restoreLanding = { file: "src/lib/server/millionea-doors.ts", original: null };
const putBack = () => {
  for (const r of [restore, restoreLanding]) if (r.original !== null) { writeFileSync(r.file, r.original); r.original = null; }
};
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { putBack(); process.exit(130); });
try {
  // ── the readers ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const player = await demoSession(browser, BASE);
  const journeyPass = await mintStaffPass(browser, BASE);
  const READERS = [
    { who: "signed out", cookies: [], pages: ["/", "/markets", "QUESTION", "/results", "/updown", "/live"] },
    { who: "the player, classic", cookies: [player], pages: ["/", "/markets", "QUESTION", "/results", "/positions", "/updown/history"] },
    { who: "the player, journey", cookies: [player, journeyPass], pages: ["/", "/markets", "QUESTION", "/results", "/positions", "/updown/history"] },
  ];
  // A question under the board: the catalogue's own seed (`/api/dev-test/seed-markets`, dev only, idempotent — a fresh
  // in-memory server lists no question for its first minutes), else the first link to one on the board, the archive or /live.
  let question = null, asked = [];
  const seeded = await fetch(`${BASE}/api/dev-test/seed-markets`, { method: "POST" }).then((r) => r.json()).catch(() => null);
  question = typeof seeded?.ids?.[0]?.id === "string" ? seeded.ids[0].id : null;
  asked.push(`seed-markets ${seeded?.ok === true ? `${seeded.live} live` : "refused"}`);
  for (let i = 0; i < 12 && question === null; i++) {
    for (const where of ["/markets", "/results", "/live"]) {
      const read = await readPage(where, [], "document");
      asked.push(`${where} ${read.status}`);
      const link = read.flight.match(/"href":"\/markets\/[A-Za-z0-9_-]+"/)?.[0] ?? read.body.match(/href="\/markets\/[A-Za-z0-9_-]+"/)?.[0] ?? "";
      question = /\/markets\/([A-Za-z0-9_-]+)/.exec(link)?.[1] ?? null;
      if (question !== null) break;
    }
    if (question === null) await new Promise((done) => setTimeout(done, 5_000));
  }
  ok(`PREMISE · a question to read under the board (${question ?? "none"})`, question !== null, asked.slice(-3).join(", "));

  for (const r of READERS) {
    // The journey reader must be ON the journey (the shell's mark), and the classic reader not — else a check reads the wrong shell.
    const home = await readPage("/", r.cookies, "document");
    const onJourney = home.body.includes('data-testid="journey-top-bar"') || home.body.includes('\\"data-testid\\":\\"journey-top-bar\\"') || home.flight.includes('"data-testid":"journey-top-bar"');
    ok(`PREMISE · ${r.who} reads ${r.who.endsWith("journey") ? "the journey shell" : "the classic shell"}`, onJourney === r.who.endsWith("journey"));
    for (const p of r.pages) {
      const path = p === "QUESTION" ? (question ? `/markets/${question}` : null) : p;
      if (path === null) continue;
      for (const form of ["document", "flight"]) {
        const read = await readPage(path, r.cookies, form);
        const real = read.status === 200 && read.flight.length > 200 && (form === "document" ? read.body.includes("self.__next_f") : /text\/x-component/.test(read.type));
        // A classic reader: the board's own loading picture stands on the board and every page under it. A journey reader:
        // the root loading's picture (the journey's route ghost) stands in every payload — and the board is not theirs (a
        // document of /markets is the journey home: AppShell's `journeyMarketsTarget`), its question drawn by the route ghost.
        const classic = !r.who.endsWith("journey");
        const boardPage = classic && (path === "/markets" || path.startsWith("/markets/"));
        const h = hiddenDefects(read, { board: boardPage });
        const routeGhosts = clientElements(read.flight).filter((e) => e.module.includes("/src/components/journey/route-ghost-lazy.tsx")).map((e) => e.text);
        const drawn = boardPage ? ` · the board's drawing handed ${[...new Set(h.drawings)].join(" ") || "—"}` : classic ? "" : ` · the route ghost handed ${[...new Set(routeGhosts)].join(" ") || "—"}`;
        const landed = new URL(read.url).pathname;
        ok(`${STATE} · ${r.who} · ${path} (${form}${landed !== path ? `, answered at ${landed}` : ""}) · no Millionea answer in the payload (${h.els} client elements read)${drawn}`,
          real && h.d.length === 0 && (!boardPage || h.drawings.every((t) => t === "{}")) && (classic || routeGhosts.length > 0),
          real ? [...h.d.slice(0, 3), ...(classic || routeGhosts.length > 0 ? [] : ["PREMISE: no route ghost in a journey payload"])].join(" | ") : `NOT A PAGE: HTTP ${read.status} ${read.type} ${read.url}`);
      }
    }
  }

  // ── CONTROL: a reader Millionea is visible to (STAFF_PREVIEW staff) is handed the answers ───────────────────────────────
  if (STATE === "STAFF_PREVIEW") {
    const ctx = await browser.newContext();
    const seeded = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: {}, timeout: 240_000 });
    const staff = await ctx.cookies(BASE);
    await ctx.close();
    ok("PREMISE · a staff session (seed-admin)", seeded.ok(), `${seeded.status()}`);
    for (const form of ["document", "flight"]) {
      const read = await readPage("/markets", staff, form);
      const els = clientElements(read.flight);
      const drawing = els.filter(isBoardDrawing).map((e) => e.text);
      const navs = els.filter((e) => e.props && e.props.millionea === true).map(nameOf);
      const traces = millioneaTracesIn(read.body);
      ok(`CONTROL · STAFF_PREVIEW · staff · /markets (${form}) · the board's drawing (${BOARD_DRAWING}) is handed {"millionea":true,"preview":true} and the navs "millionea":true — the reader sees the answers where they are handed (${drawing.join(" ")}; millionea:true on ${navs.join(", ")}; matcher ${traces.length} traces)`,
        read.status === 200 && drawing.length > 0 && drawing.every((t) => t === '{"millionea":true,"preview":true}') && navs.length >= 2 && traces.some((t) => t.startsWith("prop:")));
    }
    // MASWALI-BUILD S5 landing door: the landing's line is an INVITATION, so even staff, to whom Millionea is visible here,
    // are drawn none while no week is sold to them (at STAFF_PREVIEW only a staff drive week sells; this server has none).
    for (const form of ["document", "flight"]) {
      const read = await readPage("/", staff, form);
      const navs = clientElements(read.flight).filter((e) => e.props && e.props.millionea === true).map(nameOf);
      const lines = (read.body.match(/millionea-landing-line/g) ?? []).length + (read.flight.match(/millionea-landing-line/g) ?? []).length;
      ok(`CONTROL · STAFF_PREVIEW · staff · / (${form}) · Millionea is visible to them (the navs handed "millionea":true: ${navs.join(", ") || "none"}) yet no landing line is drawn — no week is sold to them`,
        read.status === 200 && navs.length >= 1 && lines === 0, `lines ${lines}`);
    }
  }

  // ── PLANT (WITHDRAWN, DOOR_DARK_PLANT=1): round 1's line back in the running server's source ─────────────────────────────
  if (PLANT) {
    const NOW_LINES = "  const preview = millionea && (await millioneaDoor()).preview;\n  return <MarketsGhost {...(millionea ? { millionea: true as const, ...(preview ? { preview: true as const } : {}) } : {})} />;";
    const OLD_LINE = "  return <MarketsGhost millionea={millionea} preview={millionea && (await millioneaDoor()).preview} />;";
    const src = readFileSync(restore.file, "utf8");
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    const anchor = NOW_LINES.replaceAll("\n", eol);
    ok("PLANT · the anchor stands once in markets/loading.tsx", src.split(anchor).length === 2);
    if (src.split(anchor).length === 2) {
      restore.original = src;
      writeFileSync(restore.file, src.replace(anchor, OLD_LINE));
      // The dev server recompiles on its next request; read the signed-out board until the drawing's props change (≤ 120 s).
      let seen = null;
      for (let i = 0; i < 40 && seen === null; i++) {
        const read = await readPage("/markets", [], "document");
        const h = hiddenDefects(read, { board: true });
        if (h.drawings.some((t) => t !== "{}")) seen = { h, traces: millioneaTracesIn(read.body) };
        else await new Promise((done) => setTimeout(done, 3_000));
      }
      ok(`PLANT · round 1's line written back: the signed-out board hands ${seen ? seen.h.drawings.join(" ") : "(no change seen)"} and is caught — qa:live's matcher (${seen ? seen.traces.join(", ") : "—"}) and the element check`,
        !!seen && seen.h.drawings.includes('{"millionea":false,"preview":false}') && seen.traces.some((t) => t.startsWith("prop:")) && seen.h.d.length > 0);
      putBack();
      ok("PLANT · the file restored byte for byte", readFileSync(restore.file, "utf8") === src);
      let clean = false;
      for (let i = 0; i < 40 && !clean; i++) {
        const h = hiddenDefects(await readPage("/markets", [], "document"), { board: true });
        clean = h.d.length === 0 && h.drawings.length > 0 && h.drawings.every((t) => t === "{}");
        if (!clean) await new Promise((done) => setTimeout(done, 3_000));
      }
      ok("PLANT · restored, the signed-out board is clean again (its drawing handed {})", clean);
    }
    // MASWALI-BUILD S5 landing door: the line's answer planted open — the signed-out landing must then carry the line's
    // traces (its test id, its link into /millionea) and be caught by qa:live's matcher; restored, it is clean again.
    const OFFER = "  if (!(await millioneaCardShown())) return false;\n  const door = await millioneaDoor();\n  return (await millioneaHubNow(door.userId, door.state))?.week?.selling === true;";
    const dsrc = readFileSync(restoreLanding.file, "utf8");
    const deol = dsrc.includes("\r\n") ? "\r\n" : "\n";
    const offerAnchor = OFFER.replaceAll("\n", deol);
    ok("PLANT · the landing line's answer stands once in millionea-doors.ts", dsrc.split(offerAnchor).length === 2);
    if (dsrc.split(offerAnchor).length === 2) {
      restoreLanding.original = dsrc;
      writeFileSync(restoreLanding.file, dsrc.replace(offerAnchor, "  return true;"));
      let seen = null;
      for (let i = 0; i < 40 && seen === null; i++) {
        const read = await readPage("/", [], "document");
        const traces = millioneaTracesIn(read.body);
        if (traces.some((t) => t === "testid:millionea-landing-line")) seen = traces;
        else await new Promise((done) => setTimeout(done, 3_000));
      }
      ok(`PLANT · the landing line's answer planted open: a signed-out / draws the line and is caught by qa:live's matcher (${seen ? seen.join(", ") : "no change seen"})`,
        !!seen && seen.includes("testid:millionea-landing-line") && seen.some((t) => t.startsWith("href:/millionea")));
      putBack();
      ok("PLANT · millionea-doors.ts restored byte for byte", readFileSync(restoreLanding.file, "utf8") === dsrc);
      let clean = false;
      for (let i = 0; i < 40 && !clean; i++) {
        const read = await readPage("/", [], "document");
        clean = read.status === 200 && millioneaTracesIn(read.body).length === 0;
        if (!clean) await new Promise((done) => setTimeout(done, 3_000));
      }
      ok("PLANT · restored, the signed-out landing carries no Millionea trace again", clean);
    }
  }
} finally {
  putBack();
  await browser.close();
}
console.log(`\nmaswali-door-dark: ${pass} passed, ${fail} failed (Millionea ${STATE})`);
process.exit(fail === 0 ? 0 : 1);
