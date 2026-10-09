// End-to-end proof of --capture without a dev server: an in-process STUB on an ephemeral 127.0.0.1 port answers the
// seven endpoints the capture uses, and records what it was sent. Two stubs (two "servers", two ports) are captured,
// then compared; a third stub serves one more client-rendered boundary on /. Nothing here touches the repository.
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { rmSync, readFileSync } from "node:fs";
const dir = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/s7a9a/";
const TOOL = "F:/kipindi-s7a9a/scripts/qa-served-skeleton.mjs";

function stub({ rid, seg, extraBailout = false }) {
  const seen = { pages: [], navigate: 0, cors: 0, previewSite: null, cookiesOnPlayerPage: null, coldServed: 0 };
  const hits = new Map();
  const srv = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://x");
      const cookie = req.headers.cookie ?? "";
      const port = srv.address().port;
      const json = (o, extra = {}) => { res.writeHead(200, { "content-type": "application/json", ...extra }); res.end(JSON.stringify(o)); };
      if (url.pathname === "/api/health") return json({ database: { configured: false }, simpleJourney: { state: "STAFF_PREVIEW" } });
      if (url.pathname === "/api/dev-test/seed-real-markets" && req.method === "POST") return json({ ok: true, created: 6, live: [{ id: `mkt_${port}abcdef`, title: "Simba SC wins the NBC Premier League 2026-27" }] });
      if (url.pathname === "/auth/demo") { res.writeHead(307, { location: `http://localhost:${port}/`, "set-cookie": [`kp_session=demo${port}; Path=/; HttpOnly`] }); return res.end(); }
      if (url.pathname === "/api/dev-test/seed-admin" && req.method === "POST") {
        if (JSON.parse(body).role !== "SUPPORT") { res.writeHead(400); return res.end(); }
        return json({ ok: true }, { "set-cookie": [`kp_session=officer${port}; Path=/; HttpOnly`] });
      }
      if (url.pathname === "/preview" && req.method === "POST") {
        seen.previewSite = req.headers["sec-fetch-site"] ?? null;
        const okSite = !req.headers["sec-fetch-site"] || req.headers["sec-fetch-site"] === "same-origin";
        if (cookie.includes(`kp_session=officer${port}`) && body === "intent=on" && okSite) {
          res.writeHead(303, { location: `http://localhost:${port}/`, "set-cookie": [`kp_preview=pass${port}; Path=/; HttpOnly`] });
        } else res.writeHead(303, { location: `http://localhost:${port}/admin/journey?refused=1` });
        return res.end();
      }
      // Pages. The FIRST request to each path+cookie serves a "cold" marker, so a capture that kept it would show it.
      const k = `${url.pathname}|${/kp_session=[^;]+/.exec(cookie)?.[0] ?? "guest"}|${cookie.includes("kp_preview=")}`;
      const n = (hits.get(k) ?? 0) + 1; hits.set(k, n);
      if (n === 1) seen.coldServed++;
      if (req.headers["sec-fetch-mode"] === "navigate") seen.navigate++; else seen.cors++;
      seen.pages.push(url.pathname);
      const signedIn = cookie.includes("kp_session=demo");
      if (url.pathname === "/" && signedIn) seen.cookiesOnPlayerPage = cookie;
      if (url.pathname === "/watchlist" && !signedIn) { res.writeHead(307, { location: `http://localhost:${port}/auth/login?next=%2Fwatchlist` }); return res.end(); }
      const journey = cookie.includes("kp_preview=");
      const status = url.pathname === "/account" && !journey ? 404 : 200;
      res.writeHead(status, { "content-type": "text/html; charset=utf-8", "set-cookie": [`kp_seen=1; Path=/`] });
      res.end(`<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=${Date.now()}"/>` +
        `<meta property="og:url" content="http://localhost:${port}${url.pathname}"/></head><body class="font-sans">` +
        `<header class="app-topbar" id="${rid}">${signedIn ? `<span class="crest-holder"><svg><defs><radialGradient id="cm${port}"></radialGradient></defs></svg></span>` : ""}</header>` +
        (n === 1 ? `<div class="cold-compile-banner"></div>` : "") +
        `<main id="main-content" class="flex-1"><!--$?--><template id="B:${seg}"></template><div class="kp-loading">…</div><!--/$--></main>` +
        `<!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template><!--/$-->` +
        (extraBailout && url.pathname === "/" ? `<!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template><!--/$-->` : "") +
        `<div hidden id="S:${seg}"><section class="kp-page ${journey ? "kp-journey" : "kp-classic"}" data-testid="page-${url.pathname.split("/")[1] || "home"}"></section></div>` +
        `<script>$RC("B:${seg}","S:${seg}")</script></body></html>`);
    });
  });
  return { srv, seen };
}

const run = (args, env = {}) => spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
async function captureFrom(opts, file) {
  rmSync(dir + file, { force: true });
  const { srv, seen } = stub(opts);
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  // spawnSync would block this process's event loop, and with it the stub: run the tool asynchronously.
  const { spawn } = await import("node:child_process");
  const child = spawn(process.execPath, [TOOL, "--capture", dir + file, "--viewers", "guest,player,journey"], { env: { ...process.env, KP_BASE: base } });
  let out = "";
  child.stdout.on("data", (c) => (out += c)); child.stderr.on("data", (c) => (out += c));
  const code = await new Promise((r) => child.on("close", r));
  srv.close();
  return { code, out, seen };
}

const a = await captureFrom({ rid: "_R_1a_", seg: "0" }, "stub-a.json");
console.log(a.out.trim().split(/\r?\n/).map((l) => "  " + l).join("\n"));
console.log(`capture a EXIT=${a.code}`);
console.log(`  stub saw: ${a.seen.pages.length} page requests (${a.seen.navigate} navigate, ${a.seen.cors} not) · cold answers ${a.seen.coldServed} · /preview Sec-Fetch-Site ${a.seen.previewSite} · player's cookies on /: ${a.seen.cookiesOnPlayerPage}`);
const b = await captureFrom({ rid: "_R_8x_", seg: "3" }, "stub-b.json");
console.log(`capture b EXIT=${b.code}`);
const c = await captureFrom({ rid: "_R_8x_", seg: "3", extraBailout: true }, "stub-c.json");
console.log(`capture c (one more bail-out on /) EXIT=${c.code}`);
const capA = JSON.parse(readFileSync(dir + "stub-a.json", "utf8"));
const kept = capA.cells.filter((x) => x.html?.includes("cold-compile-banner")).length;
console.log(`cells in a: ${capA.cells.length} · cells that kept the COLD answer: ${kept} · statuses: ${capA.cells.map((x) => `${x.key}=${x.status}${x.location ? "→" + x.location : ""}`).join(" ")}`);
const ab = run(["--compare", dir + "stub-a.json", dir + "stub-b.json", "--main"]);
console.log(ab.stdout.trim().split(/\r?\n/).slice(-2).join("\n"));
console.log(`compare a b --main EXIT=${ab.status}`);
const abn = run(["--compare", dir + "stub-a.json", dir + "stub-b.json", "--main", "--norm", "store-ids"]);
console.log(abn.stdout.trim().split(/\r?\n/).slice(-1).join("\n"));
console.log(`compare a b --main --norm store-ids EXIT=${abn.status}`);
const abd = run(["--compare", dir + "stub-a.json", dir + "stub-b.json"]);
console.log(abd.stdout.trim().split(/\r?\n/).filter((l) => /^✗|^\s+[-+] [ab]:/.test(l)).slice(0, 3).join("\n"));
console.log(`compare a b (default) EXIT=${abd.status}`);
const ac = run(["--compare", dir + "stub-a.json", dir + "stub-c.json", "--main"]);
console.log(ac.stdout.trim().split(/\r?\n/).filter((l) => /^(✗|FAIL|IDENT|DIFF)/.test(l) || l.includes("GREW")).join("\n"));
console.log(`compare a c --main EXIT=${ac.status}`);
const again = run(["--capture", dir + "stub-a.json"], { KP_BASE: "http://127.0.0.1:1" });
console.log(`capture onto an existing file → EXIT=${again.status}: ${again.stderr.trim()}`);
