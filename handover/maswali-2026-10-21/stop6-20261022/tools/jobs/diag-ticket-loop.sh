#!/usr/bin/env bash
# Diagnose the ticket page's reload loop at ACTIVE: the product drive up to its first bought ticket (3a.5), then 25 s of
# observation on the ticket page — every main-frame navigation, every Document request WITH ITS INITIATOR (the browser's
# own record: a script stack, a redirect, a reload), every requested navigation's reason, console errors and page errors.
. "$CI_RUN/lib.sh"
cat > "$OUT/patch.mjs" <<'JS'
import { readFileSync, writeFileSync } from "node:fs";
const NL = String.fromCharCode(10);
let s = readFileSync("scripts/maswali-player-drive.mjs", "utf8");
const anchor = 'p.on("pageerror", (e) => errs.push(String(e)));';
if (!s.includes(anchor)) throw new Error("anchor 1 absent");
const instr = [
  anchor,
  'p.on("pageerror", (e) => console.log("DIAG pageerror", String(e).slice(0, 600)));',
  'p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("DIAG console", m.type(), m.text().slice(0, 400)); });',
  'p.on("crash", () => console.log("DIAG crash"));',
  'p.on("close", () => console.log("DIAG close"));',
  'p.on("framenavigated", (f) => { if (f === p.mainFrame()) console.log("DIAG nav", new Date().toISOString(), f.url()); });',
  'const cdp = await classic.newCDPSession(p);',
  'await cdp.send("Network.enable"); await cdp.send("Page.enable");',
  'cdp.on("Network.requestWillBeSent", (e) => { if (e.type === "Document") console.log("DIAG doc", new Date().toISOString(), e.request.url, JSON.stringify(e.initiator).slice(0, 3000)); });',
  'cdp.on("Page.frameRequestedNavigation", (e) => console.log("DIAG requested", e.reason, e.disposition, e.url));',
  'cdp.on("Page.frameScheduledNavigation", (e) => console.log("DIAG scheduled", e.reason, e.url));',
].join(NL);
s = s.replace(anchor, instr);
const tileAnchor = "await tile(p, `${label}-ticket-360`);";
if (!s.includes(tileAnchor)) throw new Error("anchor 2 absent");
s = s.replace(tileAnchor, 'console.log("DIAG observing 25s"); await p.waitForTimeout(25000).catch((e) => console.log("DIAG wait failed", String(e))); console.log("DIAG done"); process.exit(0);');
writeFileSync("scripts/diag-drive.tmp.mjs", s);
console.log("patched");
JS
node "$OUT/patch.mjs" || { echo "PATCH FAILED"; exit 1; }
step diag serve 3599 FEATURE_MILLIONEA=ACTIVE FEATURE_SIMPLEJOURNEY=STAFF_PREVIEW -- timeout 1500 node scripts/diag-drive.tmp.mjs
rm -f scripts/diag-drive.tmp.mjs
echo "==== DIAG lines"; grep -a "DIAG\|PASS 3a\|FAIL" "$OUT/diag.log" | head -250
finish
