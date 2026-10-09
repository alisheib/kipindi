import { edit } from "./edit-lib.mjs";
edit("scripts/ghost-landing.mjs", [
  [` *   RED_STACK=1 npm run qa:ghost-landing -- <base>   §B AND §C's fix is served back out
`, ` *   RED_STACK=1 npm run qa:ghost-landing -- <base>   §B AND §C's fix is served back out
 *   RED_R5K=1 npm run qa:ghost-landing -- <base>     §D's ghosts are served back short (their bands collapsed)
`],
  [`const RED_STACK = process.env.RED_STACK === "1";
const RED = RED_GHOST || RED_STACK;
`, `const RED_STACK = process.env.RED_STACK === "1";
const RED_R5K = process.env.RED_R5K === "1";
const RED = RED_GHOST || RED_STACK || RED_R5K;
`],
  [`const SECTION = { RED_GHOST: ["A"], RED_STACK: ["B", "C"] };
`, `const SECTION = { RED_GHOST: ["A"], RED_STACK: ["B", "C"], RED_R5K: ["D"] };
`],
  [`await b.close();

const label = RED_GHOST ? "RED_GHOST (§A's fix served back out)" : RED_STACK ? "RED_STACK (§B and §C's fix served back out)" : "GREEN";`,
   `/* ── §D ─────────────────────────────────────────────────────────────────────────────────── */
/* ⭐ THE SIGNED-IN GHOSTS (round 5 of the visual pass, follow-up R5-K, 2026-10-09): the money pages, the receipt, the
   profile and the classic portfolio and its performance page. Each was rebuilt band for band from its page; §D measures
   the LANDING the way §A does — the last frame a ghost stood on the target, then the page — on two anchors per page: one
   just under the head, one far below it, so a wrong band anywhere above the second shows as its distance.
   ⛔ IT SIGNS IN THROUGH THE DEV SERVER'S DEMO DOOR (\`/auth/demo\`, as qa-classic-shell-parity does), so it runs against a
   LOCAL server only: a scripted sign-in to production is not something this drive may do. Against any other target §D is
   skipped and says so. ⚠️ The demo player's data are not every player's: each ghost draws its page's commonest case (the
   ghost's own header says which), so a few pixels' difference on the second anchor can be the data — the deltas are
   printed for a person to read, and only a miss past LAND_TOL (the old ghosts missed by 130–1,400px) fails. */
const LOOPBACK = /^https?:\\/\\/(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?(?:\\/|$)/.test(BASE);
if (!LOOPBACK) {
  console.log("\\n§D · SKIPPED — it signs in through a local server's demo door; " + BASE + " is not one (no scripted sign-in to production)");
} else {
  console.log("\\n§D · the signed-in ghosts: does each page land where its ghost promised?");
  const sc = await b.newContext({ viewport: { width: 390, height: 844 } });
  const sp = await sc.newPage();
  await sp.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded", timeout: 180000 });
  await sp.locator("main").first().waitFor({ timeout: 120000 });
  const jar = (await sc.cookies(BASE)).filter((c) => c.name === "kp_session");
  await sc.close();
  /** [from, the link to press there, target, anchors — [name, selector] — each present in the ghost AND the page]. */
  const CASES = [
    ["/wallet", 'a[href="/wallet/deposit"]:visible', "/wallet/deposit", [["form card", "main .glass-panel"], ["trust strip", "main .rounded-xl.border.bg-bg-elevated\\\\/60.px-4.py-3"]]],
    ["/wallet", 'a[href="/wallet/withdraw"]:visible', "/wallet/withdraw", [["hero end", "main header.relative.overflow-hidden"], ["form card", "main .glass-panel"]]],
    ["/wallet/receipts", 'main a[href^="/wallet/receipt/"]', null, [["details", "main dl.glass-panel"], ["footnote", "main p.leading-relaxed:last-child"]]],
    ["/profile/activity", "main button.font-mono.uppercase", "/profile", [["achievements", "main .glass-panel"], ["settings grid", "main .grid.grid-cols-1.gap-3"]]],
    ["/wallet", 'a[href="/positions"]:visible', "/positions", [["query bar", "main .kp-discovery-bar"], ["first card", "main .grid.items-start > *"]]],
    ["/positions", 'a[href="/positions/performance"]:visible', "/positions/performance", [["P&L panel", "main .glass-panel"], ["stake tiles", "main section.grid.gap-3:not(.grid-cols-1)"]]],
  ];
  if (jar.length !== 1) failures.push("D the demo door signed nobody in — §D measured nothing");
  else for (const [from, linkSel, target0, anchors] of CASES) for (const width of [360, 1280]) {
    const ctx = await localisedContext(b, { locale: "sw", width, height: 900, baseUrl: BASE, reducedMotion: "reduce" });
    await ctx.addCookies(jar);
    const p = await ctx.newPage();
    if (RED_R5K) {
      // Serve §D's fix back out: collapse the ghosts' bands (their cards, their sections, their shimmering boxes), so each
      // ghost is the short drawing it used to be and its second anchor stands far above where the page puts it.
      await p.route(/\\/_next\\/static\\/.*\\.css(\\?.*)?$/, async (route) => {
        const res = await route.fetch();
        const css = (await res.text()) + "\\nmain [aria-hidden].glass-panel,main section[aria-hidden],main dl[aria-hidden]>*:nth-child(n+3){display:none!important}\\n";
        await route.fulfill({ response: res, body: css, headers: { ...res.headers(), "content-length": String(Buffer.byteLength(css)) } });
      });
    }
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await p.goto(BASE + from, { waitUntil: "load", timeout: 180000 });
    await p.waitForTimeout(6000);
    const link = p.locator(linkSel).first();
    if (!(await link.count())) { failures.push(\`D \${from} → \${target0 ?? "a receipt"} @\${width}: no link to press — nothing measured\`); await ctx.close(); continue; }
    const target = target0 ?? new URL(await link.getAttribute("href"), BASE).pathname;
    await p.evaluate(([t, sels]) => {
      window.__snapD = null;
      const probe = () => {
        if (location.pathname === t && document.querySelector(".kp-shimmer-track")) {
          window.__snapD = sels.map((s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; });
        }
        requestAnimationFrame(probe);
      };
      requestAnimationFrame(probe);
    }, [target, anchors.map((a) => a[1])]);
    await link.click();
    await p.waitForURL(\`**\${target}\`, { timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(9000);
    const r = await p.evaluate((sels) => ({ snap: window.__snapD, real: sels.map((s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; }) }), anchors.map((a) => a[1]));
    // ⛔ VACUITY, as §A: no ghost frame caught, or an anchor missing on either side, measured nothing.
    if (!r.snap) { failures.push(\`D \${target} @\${width}: no skeleton frame was ever captured — this route proved nothing\`); await ctx.close(); continue; }
    anchors.forEach(([name], i) => {
      const g = r.snap[i], real = r.real[i];
      if (g == null || real == null) { failures.push(\`D \${target} @\${width} \${name}: missing in the \${g == null ? "ghost" : "page"} — nothing measured\`); return; }
      const delta = real - g;
      const bad = Math.abs(delta) > LAND_TOL;
      if (bad) failures.push(\`D \${target} @\${width} \${name}: the ghost promised y=\${g}, the page put it at y=\${real} — out by \${delta}px (tolerance \${LAND_TOL})\`);
      console.log(\`   \${target.padEnd(24)} @\${String(width).padStart(4)}  \${name.padEnd(14)} ghost y=\${String(g).padStart(5)}  real y=\${String(real).padStart(5)}  out by \${String(delta).padStart(5)}px  \${bad ? "FAIL" : "ok"}\`);
    });
    await ctx.close();
  }
}

await b.close();

const label = RED_GHOST ? "RED_GHOST (§A's fix served back out)" : RED_STACK ? "RED_STACK (§B and §C's fix served back out)" : RED_R5K ? "RED_R5K (§D's ghosts served back short)" : "GREEN";`],
  [`  const want = SECTION[RED_GHOST ? "RED_GHOST" : "RED_STACK"];`, `  const want = SECTION[RED_GHOST ? "RED_GHOST" : RED_STACK ? "RED_STACK" : "RED_R5K"];`],
]);
