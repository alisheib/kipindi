#!/usr/bin/env bash
# Diagnose the ticket page's refresh loop at ACTIVE, version 2: the product drive EXACTLY as written (its tile after 3a.5
# included, where the loop showed), with browser-side hooks on the classic player's context — every server-sent event,
# every `50pick:*` window event (with the dispatching stack) and every RSC fetch (with its stack) — and every main-frame
# navigation. The drive stops itself 40 s after the ticket page is drawn.
. "$CI_RUN/lib.sh"
cat > "$OUT/patch.mjs" <<'JS'
import { readFileSync, writeFileSync } from "node:fs";
const NL = String.fromCharCode(10);
let s = readFileSync("scripts/maswali-player-drive.mjs", "utf8");
const anchor = "const p = await classic.newPage();";
if (s.split(anchor).length !== 2) throw new Error("anchor 1 not unique");
const hook = `await classic.addInitScript(() => {
  const NLc = String.fromCharCode(10);
  const D = (...a) => console.log("DIAG", ...a);
  const stack = () => (new Error().stack || "").split(NLc).slice(2, 9).map((x) => x.trim()).join(" | ");
  const oDispatch = window.dispatchEvent.bind(window);
  window.dispatchEvent = (e) => { try { const ty = String((e && e.type) || ""); if (ty.startsWith("50pick")) D("dispatch", ty, stack()); } catch (x) {} return oDispatch(e); };
  const OES = window.EventSource;
  if (OES) {
    const W = function (url, opts) {
      const es = new OES(url, opts);
      D("eventsource open", String(url));
      const oAdd = es.addEventListener.bind(es);
      es.addEventListener = (type, fn, o) => oAdd(type, (ev) => { D("sse", type, String((ev && ev.data) || "").slice(0, 160)); return fn(ev); }, o);
      return es;
    };
    W.prototype = OES.prototype; W.CONNECTING = 0; W.OPEN = 1; W.CLOSED = 2;
    window.EventSource = W;
  }
  const oFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      const u = String(typeof input === "string" ? input : (input && input.url) || "");
      const h = (init && init.headers) || {};
      const rsc = typeof h.get === "function" ? h.get("RSC") || h.get("rsc") : h.RSC || h.rsc;
      if (rsc) D("rsc", u.slice(0, 100), stack());
    } catch (x) {}
    return oFetch(input, init);
  };
});`;
const listen = [
  'p.on("console", (m) => { const tx = m.text(); if (tx.startsWith("DIAG") || m.type() === "error") console.log("PAGE", new Date().toISOString().slice(11, 23), m.type(), tx.slice(0, 700)); });',
  'p.on("framenavigated", (f) => { if (f === p.mainFrame()) console.log("PAGE nav", new Date().toISOString().slice(11, 23), f.url()); });',
  'p.on("pageerror", (e) => console.log("PAGE pageerror", String(e).slice(0, 500)));',
  'p.on("crash", () => console.log("PAGE crash"));', 'p.on("close", () => console.log("PAGE close"));',
].join(NL);
s = s.replace(anchor, hook + NL + anchor + NL + listen);
const tileAnchor = "await tile(p, `${label}-ticket-360`);";
if (s.split(tileAnchor).length !== 2) throw new Error("anchor 2 not unique");
s = s.replace(tileAnchor, tileAnchor.replace("await tile", 'console.log("PAGE ticket drawn", new Date().toISOString()); setTimeout(() => { console.log("PAGE stop after 420s"); process.exit(0); }, 420000); await new Promise((r) => setTimeout(r, 430000)); await tile'));
writeFileSync("scripts/diag-drive2.tmp.mjs", s);
console.log("patched");
JS
node "$OUT/patch.mjs" || { echo "PATCH FAILED"; exit 1; }
date -u
step diag serve 3599 FEATURE_MILLIONEA=ACTIVE FEATURE_SIMPLEJOURNEY=STAFF_PREVIEW -- timeout 2400 node scripts/diag-drive2.tmp.mjs
rm -f scripts/diag-drive2.tmp.mjs
L=$(ls "$OUT"/server-3599-*.log | head -1)
echo "==== server: ticket GETs $(grep -a -c 'GET /millionea/tickets/MLN' "$L"), ticket POSTs $(grep -a -c 'POST /millionea/tickets/MLN' "$L"), session/status $(grep -a -c '/api/session/status' "$L"), events $(grep -a -c '/api/events' "$L")"
echo "==== the drive's PAGE lines from the ticket on"; awk '/PAGE ticket drawn/{f=1} f' "$OUT/diag.log" | grep -a "PAGE" | head -400
echo "==== before the ticket (last 25 PAGE lines)"; awk '/PAGE ticket drawn/{exit} 1' "$OUT/diag.log" | grep -a "PAGE" | tail -25
finish
