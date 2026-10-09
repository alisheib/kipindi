// docsize — what a journey (and a classic) page's FIRST DOCUMENT weighs: raw, gzip and brotli bytes, per route, as the
// demo player (with a staff preview pass for the journey, without for classic). R4-J's route ghosts ride in every journey
// document (the root loading's fallback), so the visual pass measures that cost against main.
//   LIVE_BASE=http://localhost:3074 node docsize.mjs <label> <out.json>
import { pathToFileURL } from "node:url";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { writeFileSync } from "node:fs";
const [label = "tree", out] = process.argv.slice(2);
const R = "F:/kipindi-a8i2-ctl/scripts/live/";
const { browser, BASE } = await import(pathToFileURL(R + "harness.mjs").href);
const kit = await import(pathToFileURL(R + "journey-pass.mjs").href);
const ROUTES = ["/", "/markets", "/positions", "/account", "/results", "/wallet", "/profile"];
const { b } = await browser();
const pass = await kit.mintStaffPass(b, BASE);
const rows = [];
for (const shell of ["journey", "classic"]) {
  for (const locale of ["sw", "en"]) {
    const ctx = await b.newContext();
    await ctx.request.get(`${BASE}/auth/demo`);
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }, ...(shell === "journey" ? [pass] : [])]);
    for (const r of ROUTES) {
      if (shell === "classic" && r === "/account") continue;
      // twice: the first may compile on a dev server; the second is the measured one
      await ctx.request.get(BASE + r).catch(() => null);
      const res = await ctx.request.get(BASE + r).catch(() => null);
      if (!res) { rows.push({ shell, locale, route: r, error: "no response" }); continue; }
      const body = await res.body();
      const gz = gzipSync(body, { level: 9 }).length;
      const br = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
      const html = body.toString("utf8");
      rows.push({ shell, locale, route: r, status: res.status(), raw: body.length, gzip: gz, brotli: br, journeyMark: html.includes("kp-journey-shell") });
    }
    await ctx.close();
  }
}
await b.close();
console.log(`docsize · ${label} · ${BASE}`);
for (const x of rows) console.log(`  ${x.shell.padEnd(7)} ${x.locale} ${x.route.padEnd(10)} ${x.error ?? `${x.status} raw ${x.raw} · gzip ${x.gzip} · br ${x.brotli}${x.shell === "journey" && !x.journeyMark ? " · ⚠ NO JOURNEY MARK" : ""}`}`);
if (out) writeFileSync(out, JSON.stringify({ label, base: BASE, rows }, null, 2));
process.exit(0);
