// Scratch probe (PLATFORM r2, item 5): under each hard clamp, what does Chromium paint in the FIRST frame of a kit motion
// class?   node rm-probe.mjs <tree> <motion.css to load> [out.json]
// The page carries ONE stylesheet: the route entrance's own rule (it lives in globals.css, which is Tailwind-processed and
// not loadable raw), then the given motion.css (imported last in the app, as here). Two ways a class lands, as the app
// lands them:
//   mount   — the element is created WITH its class (and, for `.m-draw`, its caller's inline dash), then inserted: every
//             component that renders a motion class (a dialog, a sheet, a moment's line, the closed band);
//   restart — the class is taken off a standing element, a reflow, and put back: RouteTransition's route change.
// For each: opacity / transform / clip-path / stroke-dashoffset read in the first three animation frames, and the
// animations the element runs. Gates: none (control), the OS preference (emulated), the in-app class (html.kp-reduce-motion
// + data-motion=minimal, as theme-provider sets them).
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const [tree, cssFile, out] = process.argv.slice(2);
const { chromium } = createRequire(`${tree}/package.json`)("playwright");
const css = ".route-enter { animation: m-settle-in var(--t-move) var(--m-settle) both; }\n" + readFileSync(cssFile, "utf8");
const CLASSES = (process.env.CLASSES || "route-enter,m-seal,m-axis-reveal,m-draw,m-tick,m-in,m-in-lift,m-dialog-in,m-sheet-in,m-scrim,m-float-in,m-out,maswali-attest,maswali-cut").split(",");
const browser = await chromium.launch();
const rows = [];
let hidden = 0;
try {
  for (const gate of ["none", "os", "class"]) {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, reducedMotion: gate === "os" ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    await page.setContent(`<!doctype html><html${gate === "class" ? ' class="kp-reduce-motion" data-motion="minimal"' : ""}><head><style>${css}</style></head><body style="margin:0;background:#000;color:#fff"><div id="h"></div></body></html>`);
    for (const mode of ["mount", "restart"]) {
      for (const cls of CLASSES) {
        const r = await page.evaluate(async ([cls, mode]) => {
          const host = document.getElementById("h");
          host.innerHTML = "";
          const svg = cls === "m-draw";
          let el;
          const make = (withClass) => {
            if (svg) {
              const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
              s.setAttribute("width", "200"); s.setAttribute("height", "20");
              const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
              p.setAttribute("d", "M0 10 H200"); p.setAttribute("stroke", "#fff"); p.setAttribute("pathLength", "100");
              if (withClass) { p.setAttribute("class", cls); p.style.strokeDasharray = "100"; p.style.strokeDashoffset = "100"; }
              s.appendChild(p);
              return [s, p];
            }
            const d = document.createElement("div");
            d.textContent = "TZS 1,000"; d.style.cssText = "width:200px;height:40px;background:#fff;color:#000";
            if (withClass) d.className = cls;
            return [d, d];
          };
          if (mode === "mount") { const [box, e] = make(true); el = e; host.appendChild(box); }
          else {
            const [box, e] = make(false); el = e; host.appendChild(box);
            if (svg) { el.setAttribute("class", cls); el.style.strokeDasharray = "100"; el.style.strokeDashoffset = "100"; }
            else el.classList.add(cls);
            // let the first run end, then restart it as RouteTransition does
            await new Promise((d) => setTimeout(d, 1300));
            el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls);
          }
          const read = () => { const c = getComputedStyle(el); return { o: c.opacity, tf: c.transform, clip: c.clipPath, dash: c.strokeDashoffset }; };
          const frames = [];
          await new Promise((done) => { let n = 0; const tick = () => { frames.push(read()); if (++n < 3) requestAnimationFrame(tick); else done(); }; requestAnimationFrame(tick); });
          return { frames, anims: el.getAnimations().map((a) => a.animationName ?? a.transitionProperty) };
        }, [cls, mode]);
        const f1 = r.frames[0];
        const exit = cls === "m-out";
        // A first frame that hides or displaces an ENTRANCE (exits open on the surface as it stands).
        const bad = !exit && (Number(f1.o) < 1 || (f1.tf !== "none" && f1.tf !== "matrix(1, 0, 0, 1, 0, 0)") || f1.clip !== "none" || (svg(cls) && f1.dash !== "0px"));
        if (bad && gate !== "none") hidden++;
        rows.push({ gate, mode, cls, ...r, bad });
        console.log(`${bad ? (gate === "none" ? "ctrl" : "HIDE") : "ok  "} ${gate.padEnd(5)} ${mode.padEnd(7)} ${cls.padEnd(15)} f1 o=${f1.o} tf=${f1.tf.slice(0, 24)} clip=${f1.clip.slice(0, 20)} dash=${f1.dash} | f3 o=${r.frames[2].o} dash=${r.frames[2].dash} | ${JSON.stringify(r.anims)}`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
function svg(c) { return c === "m-draw"; }
console.log(`\nrm-probe ${cssFile}: ${hidden} clamped first frame(s) that hide or displace an entrance`);
if (out) writeFileSync(out, JSON.stringify(rows, null, 1));
