// Hand-made captures for proving --compare without a server. Written by hand, not by the tool's synth().
import { writeFileSync, rmSync } from "node:fs";
const dir = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/s7a9a/";
const page = ({ hash, rid, seg, extraBailout = false, port }) =>
  `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/>` +
  `<link rel="stylesheet" href="/_next/static/css/app/layout.css?v=${Date.now() + Math.floor(Math.random() * 1000)}" data-precedence="next_static/css/app/layout.css"/>` +
  `<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/app/page-${hash}.js"/>` +
  `<script src="/_next/static/chunks/main-app-${hash}.js" async=""></script>` +
  `<meta property="og:url" content="https://www.50pick.tz/"/><meta property="og:image" content="http://localhost:${port}/og.png"/></head>` +
  `<body class="font-sans"><header class="app-topbar" id="${rid}"><span>50pick</span></header>` +
  `<main id="main-content" class="flex-1"><!--$?--><template id="B:${seg}"></template><div class="kp-loading">…</div><!--/$--></main>` +
  `<!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template><!--/$-->` +
  `<!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template><!--/$-->` +
  (extraBailout ? `<!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template><!--/$-->` : "") +
  `<div hidden id="S:${seg}"><section class="kp-board"><h1>Markets</h1></section></div><script>$RC("B:${seg}","S:${seg}")</script></body></html>`;
const cap = (name, opts) => ({
  kind: "kp-served-skeleton", version: 1, takenAt: new Date().toISOString(), base: `http://localhost:${opts.port}`,
  tree: { path: "F:/kipindi-s7a9a", head: "c37b5e47" + "0".repeat(32), dirty: [] }, rollout: "WITHDRAWN", locale: "en",
  viewers: ["guest", "player"], routes: ["home", "watchlist"], ua: "hand-made", market: { title: "Simba SC wins the NBC Premier League 2026-27", id: "mkt_x" },
  cells: [
    { key: "guest|en|/", viewer: "guest", locale: "en", name: "home", route: "/", path: "/", status: 200, location: null, html: page(opts) },
    { key: "guest|en|/watchlist", viewer: "guest", locale: "en", name: "watchlist", route: "/watchlist", path: "/watchlist", status: 307, location: `http://localhost:${opts.port}/auth/login?next=%2Fwatchlist`, html: "" },
    { key: "player|en|/", viewer: "player", locale: "en", name: "home", route: "/", path: "/", status: 200, location: null, html: page({ ...opts, rid: opts.rid + "p" }) },
  ],
});
for (const f of ["cap-a.json", "cap-b-same.json", "cap-b-extra-bailout.json"]) rmSync(dir + f, { force: true });
writeFileSync(dir + "cap-a.json", JSON.stringify(cap("a", { hash: "0123456789abcdef", rid: "_R_1a_", seg: "0", port: 3041 })));
// Same tree, a second server: other hashes? no — same tree, same hashes; other port, other React ids, other segment ids, another ?v=.
writeFileSync(dir + "cap-b-same.json", JSON.stringify(cap("b", { hash: "0123456789abcdef", rid: "_R_7q_", seg: "2", port: 3052 })));
// The same, with ONE more client-rendered boundary in the guest's /.
const extra = cap("b", { hash: "0123456789abcdef", rid: "_R_7q_", seg: "2", port: 3052 });
extra.cells[0].html = page({ hash: "0123456789abcdef", rid: "_R_7q_", seg: "2", port: 3052, extraBailout: true });
writeFileSync(dir + "cap-b-extra-bailout.json", JSON.stringify(extra));
console.log("wrote cap-a.json, cap-b-same.json, cap-b-extra-bailout.json");
