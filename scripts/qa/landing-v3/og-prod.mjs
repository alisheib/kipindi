// Landing v3 · WP14b (K50) — does a shared market link preview truthfully on PRODUCTION?
//   BASE=https://www.50pick.tz OUT=.qa-shots/landing-v3/<label> node scripts/qa/landing-v3/og-prod.mjs
// Fetch only — no browser, no dev server. For the markets on / (featured, board rows, grid) and two on
// /results it reads each market page's <head> AS WHATSAPP DOES and fetches the og:image:
//   · og:image = <BASE>/api/og/market/<id>, 1200×630, og:type/og:site_name/og:locale present (the root
//     openGraph spread — a bare object drops them), twitter:image the same URL;
//   · og:description states no 0%/100% price, and no percentage at all on a card without a price;
//   · the image: 200, image/png, a real PNG of 1200×630; its bytes are saved to <OUT>/og/ to look at.
// ⚠️ THE USER AGENT MATTERS: Next streams metadata into <body> for ordinary UAs but blocks it into <head>
// for the bots it lists (WhatsApp among them) — a default-UA curl can read a different document.
// Controls: a nonexistent market page and image must 404. Exit 1 on any finding.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// NO PRODUCTION DEFAULT (live-target-safe.test.mjs §1b). This used to fall back to the live site, so a run with no
// target read production without anyone choosing it. Loopback is the default now (a local run also needs OG_HOST,
// below); production is reached by NAMING it, as the example at the top does.
const BASE = (process.env.BASE || "http://localhost:3001").replace(/\/$/, "");
const OUT = process.env.OUT || ".qa-shots/landing-v3/og";
const UA = "WhatsApp/2.23.20.0 A";
// The absolute host the tags carry: `metadataBase` is the app's own URL, so a LOCAL run reads production's
// host in og:image — pass OG_HOST=https://www.50pick.tz there. Production: the same as BASE.
const OG_HOST = (process.env.OG_HOST || BASE).replace(/\/$/, "");
mkdirSync(join(OUT, "og"), { recursive: true });

const findings = [];
const bad = (what) => { findings.push(what); console.log(`  ✗ ${what}`); };
const get = (url, ua = UA) => fetch(url, { headers: { "user-agent": ua }, redirect: "follow" });

// ── the markets to read, and the state each card shows ────────────────────────────────────────
const home = await (await get(`${BASE}/`, "Mozilla/5.0")).text();
const results = await (await get(`${BASE}/results`, "Mozilla/5.0")).text();
// ⚠️ The slice ends at the NEXT card (landing v3 C1): a fixed 6,000 characters ran into the neighbouring card on
// a dense page, so a priced card beside a one-sided one was read as one-sided.
const stateOf = (html, id) => {
  const at = html.indexOf(`data-row-id="${id}"`);
  const next = at >= 0 ? html.indexOf("data-row-id=", at + 12) : -1;
  const slice = at >= 0 ? html.slice(at, next > at ? next : at + 6000) : "";
  return slice.includes("mcardp-oneside") ? "oneSided" : slice.includes("mcardp-pct--empty") ? "none" : "priced";
};
const ids = new Map();
for (const m of home.matchAll(/data-row-id="([^"]+)"/g)) ids.set(m[1], stateOf(home, m[1]));
for (const m of home.matchAll(/href="\/markets\/(mkt_[A-Za-z0-9_]+)"/g)) if (!ids.has(m[1])) ids.set(m[1], "row");
let fromResults = 0;
for (const m of results.matchAll(/data-row-id="([^"]+)"/g)) {
  if (ids.has(m[1]) || fromResults >= 2) continue;
  ids.set(m[1], stateOf(results, m[1])); fromResults++;
}
console.log(`og-prod: ${ids.size} markets against ${BASE}`);
if (ids.size === 0) bad("no market ids found on / or /results — nothing was measured");

const meta = (head, prop) => [...head.matchAll(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]*>`, "g"))]
  .map((m) => (m[0].match(/content="([^"]*)"/) || [])[1]);
const report = [];
for (const [id, state] of ids) {
  const r = await get(`${BASE}/markets/${id}`);
  const html = await r.text();
  const head = html.split("</head>")[0];
  const row = { id, state, status: r.status };
  if (r.status !== 200) { bad(`${id}: market page HTTP ${r.status}`); report.push(row); continue; }
  const img = meta(head, "og:image");
  const want = `${OG_HOST}/api/og/market/${id}`;
  row.ogImage = img;
  if (img.length !== 1 || img[0] !== want) bad(`${id}: og:image ${JSON.stringify(img)} (want exactly ${want})`);
  if (meta(head, "og:image:width")[0] !== "1200" || meta(head, "og:image:height")[0] !== "630") bad(`${id}: og:image size tags`);
  for (const [p, v] of [["og:type", "website"], ["og:site_name", "50pick"]]) if (meta(head, p)[0] !== v) bad(`${id}: ${p}=${meta(head, p)[0]} (want ${v})`);
  if (!meta(head, "og:locale")[0]) bad(`${id}: no og:locale`);
  if (meta(head, "twitter:image")[0] !== want) bad(`${id}: twitter:image ${meta(head, "twitter:image")[0]}`);
  const desc = meta(head, "og:description")[0] || "";
  row.description = desc;
  if (/(?:^|[^\d.])(?:0|100)\s?%/.test(desc)) bad(`${id}: og:description states a 0%/100% price: "${desc}"`);
  if ((state === "oneSided" || state === "none") && /%/.test(desc)) bad(`${id}: ${state} card, but og:description prints a price: "${desc}"`);
  // the image
  const ir = await get(`${BASE}/api/og/market/${id}`);
  const buf = Buffer.from(await ir.arrayBuffer());
  row.image = { status: ir.status, type: ir.headers.get("content-type"), bytes: buf.length, cache: ir.headers.get("cache-control") };
  const png = buf.length > 24 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (ir.status !== 200 || !String(row.image.type).startsWith("image/png") || !png) bad(`${id}: og image HTTP ${ir.status} ${row.image.type} png=${png}`);
  else {
    row.image.w = buf.readUInt32BE(16); row.image.h = buf.readUInt32BE(20);
    if (row.image.w !== 1200 || row.image.h !== 630) bad(`${id}: og image is ${row.image.w}×${row.image.h}`);
    if (buf.length < 5_000) bad(`${id}: og image only ${buf.length} bytes — blank?`);
    writeFileSync(join(OUT, "og", `${state}-${id}.png`), buf);
  }
  report.push(row);
  console.log(`  ${state.padEnd(8)} ${id}  "${desc.slice(0, 60)}"  image ${row.image.status} ${row.image.bytes}B`);
}
// ── controls: an unknown market mints no preview ────────────────────────────────────────────────
// The IMAGE route answers 404. The PAGE answers HTTP 200 with Next's streamed not-found fallback
// (`NEXT_HTTP_ERROR_FALLBACK;404`) — the route's loading skeleton opens the stream before `notFound()`
// runs, the same cause as the gate's V14 (INHERIT-MANIFEST R4(8)). So the page control asserts what a
// preview needs: the not-found fallback, and no og:image for that market. The status is recorded.
{
  const NX = "mkt_nonexistent_0000";
  const ir = await get(`${BASE}/api/og/market/${NX}`);
  if (ir.status !== 404) bad(`control: /api/og/market/${NX} → HTTP ${ir.status} (want 404)`);
  const pr = await get(`${BASE}/markets/${NX}`);
  const ph = await pr.text();
  if (!ph.includes("NEXT_HTTP_ERROR_FALLBACK;404")) bad(`control: /markets/${NX} did not render the not-found fallback`);
  if (ph.includes(`/api/og/market/${NX}`)) bad(`control: /markets/${NX} minted a market preview`);
  console.log(`  (info) unknown market page answers HTTP ${pr.status} with the not-found fallback`);
}
writeFileSync(join(OUT, "og-prod.json"), JSON.stringify({ base: BASE, findings, report }, null, 2));
console.log(`\nog-prod: ${findings.length === 0 ? "CLEAN" : `${findings.length} finding(s)`} — ${ids.size} markets`);
process.exit(findings.length === 0 ? 0 : 1);
