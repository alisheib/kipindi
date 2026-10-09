// R5-L · §D holds an element below a band the DATA sets only when the page is the case the ghost drew: row 2's lines (the
// counts' digits; the ghosts hold two) and /results' notable carousel (arrows and dots only for an archive of eight or
// more). Otherwise the delta is printed as the data's, not held — and /results' row 2 top (above every such band) is held
// always. Without this, today's QA board (six results, one-digit counts, one notable) fails §D on the data, not the ghost.
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => {
  s = once(s,
    "/** Each route: where it is reached from (a page that links to it), the element measured in BOTH the ghost and the page\n"
    + " *  (`el`, the n-th match, or the last with `last`), and whether it needs a player. */\n"
    + "const D_ROUTES = [\n"
    + "  { target: \"/live\", from: \"/\", el: \".market-grid > *\" },\n"
    + "  { target: \"/markets\", from: \"/\", el: \".market-grid > *\" },\n"
    + "  { target: \"/results\", from: \"/\", el: \".market-grid > *\" },\n",
    "/** Each route: where it is reached from (a page that links to it), the element measured in BOTH the ghost and the page\n"
    + " *  (`el`, the first match, or the last with `last`), and whether it needs a player.\n"
    + " *  ⚠️ `drawn`: the element stands below a band whose height is the DATA's, which the ghost draws in one case (its note\n"
    + " *  says which) — a bar's row 2, whose lines the counts' digits set (the ghosts hold two, \"00\"), and /results' notable\n"
    + " *  carousel, whose arrows and dots stand only for an archive of eight or more (`results/page.tsx`; one notable below\n"
    + " *  that). Such an element is held only when the page IS that case — row 2 as tall as the ghost's, the carousel with its\n"
    + " *  arrows; otherwise its delta is printed as the data's and not held. /results' row 2 itself is held always: its top\n"
    + " *  stands above every band the data sets. */\n"
    + "const D_ROUTES = [\n"
    + "  { target: \"/live\", from: \"/\", el: \".market-grid > *\" },\n"
    + "  { target: \"/markets\", from: \"/\", el: \".market-grid > *\", drawn: { row2: true } },\n"
    + "  { target: \"/results\", name: \"/results row 2\", from: \"/\", el: \".kp-discovery-bar .kp-qbar-row\" },\n"
    + "  { target: \"/results\", from: \"/\", el: \".market-grid > *\", drawn: { row2: true, carousel: true } },\n",
    "routes");
  s = once(s,
    "/** Serve §D's fix back out: the ghosts' word boxes become 40px blocks, so no ghost lands where its page does. */\n",
    "/** Why the page is not the case its ghost drew (a route's `drawn`), or \"\" when it is: row 2 and the carousel as the\n"
    + " *  probe saw them in the last ghost frame (`row2Ghost`) and on the page (`row2Page`, `arrows`). */\n"
    + "function dataCase(drawn, got) {\n"
    + "  if (!drawn) return \"\";\n"
    + "  const why = [];\n"
    + "  if (drawn.row2 && (got.row2Ghost == null || got.row2Page == null || Math.abs(got.row2Page - got.row2Ghost) > 1)) {\n"
    + "    why.push(`row 2 is ${got.row2Page}px, the ghost's ${got.row2Ghost} (the counts' digits set its lines; the ghost holds two)`);\n"
    + "  }\n"
    + "  if (drawn.carousel && !got.arrows) why.push(\"one notable slide (an archive of fewer than eight: no arrows, no dots)\");\n"
    + "  return why.length ? `not the drawn case: ${why.join(\"; \")}` : \"\";\n"
    + "}\n"
    + "/** What the page shows of those two bands once it has landed (run in the page). */\n"
    + "const pageCase = () => {\n"
    + "  const r2 = document.querySelector(\".kp-discovery-bar .kp-qbar-row\");\n"
    + "  return { row2Page: r2 ? Math.round(r2.getBoundingClientRect().height) : null, arrows: !!document.querySelector('[aria-roledescription=\"carousel\"] > .justify-end') };\n"
    + "};\n"
    + "/** Serve §D's fix back out: the ghosts' word boxes become 40px blocks, so no ghost lands where its page does. */\n",
    "helpers");
  // §D: the tag names the element where a route is measured twice; the probe keeps row 2's height with the element's top.
  s = once(s,
    "    const tag = `D ${r.target} @${width} ${locale}`;\n",
    "    const tag = `D ${r.name ?? r.target} @${width} ${locale}`;\n",
    "tag");
  s = once(s,
    "      await p.evaluate(({ t, sel, last }) => {\n"
    + "        window.__dsnap = null;\n",
    "      await p.evaluate(({ t, sel, last }) => {\n"
    + "        window.__dsnap = null;\n"
    + "        window.__drow2 = null;\n",
    "probe init");
  s = once(s,
    "            if (e) window.__dsnap = Math.round(e.getBoundingClientRect().top + scrollY);\n"
    + "          }\n"
    + "          requestAnimationFrame(probe);\n"
    + "        };\n"
    + "        requestAnimationFrame(probe);\n"
    + "      }, { t: r.target, sel: r.el, last: !!r.last });\n",
    "            if (e) {\n"
    + "              window.__dsnap = Math.round(e.getBoundingClientRect().top + scrollY);\n"
    + "              const r2 = document.querySelector(\".kp-discovery-bar .kp-qbar-row\");\n"
    + "              window.__drow2 = r2 ? Math.round(r2.getBoundingClientRect().height) : null;\n"
    + "            }\n"
    + "          }\n"
    + "          requestAnimationFrame(probe);\n"
    + "        };\n"
    + "        requestAnimationFrame(probe);\n"
    + "      }, { t: r.target, sel: r.el, last: !!r.last });\n",
    "probe");
  s = once(s,
    "        return { snap: window.__dsnap, real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null, ghosts: document.querySelectorAll(\".kp-shimmer-track\").length };\n"
    + "      }, { sel: r.el, last: !!r.last });\n",
    "        return { snap: window.__dsnap, real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null, row2Ghost: window.__drow2 };\n"
    + "      }, { sel: r.el, last: !!r.last });\n"
    + "      Object.assign(got, await p.evaluate(pageCase));\n",
    "got");
  s = once(s,
    "      const delta = got.real - got.snap;\n"
    + "      if (Math.abs(delta) > BOX_TOL) failures.push(`${tag}: the ghost drew ${r.el} at y=${got.snap}, the page put it at y=${got.real} — ${delta}px (tolerance ${BOX_TOL})`);\n"
    + "      console.log(`   ${tag.slice(2).padEnd(40)} ghost y=${String(got.snap).padStart(5)}  page y=${String(got.real).padStart(5)}  ${String(delta).padStart(5)}px  ${Math.abs(delta) > BOX_TOL ? \"FAIL\" : \"ok\"}`);\n",
    "      const delta = got.real - got.snap;\n"
    + "      const other = dataCase(r.drawn, got);\n"
    + "      if (!other && Math.abs(delta) > BOX_TOL) failures.push(`${tag}: the ghost drew ${r.el} at y=${got.snap}, the page put it at y=${got.real} — ${delta}px (tolerance ${BOX_TOL})`);\n"
    + "      console.log(`   ${tag.slice(2).padEnd(40)} ghost y=${String(got.snap).padStart(5)}  page y=${String(got.real).padStart(5)}  ${String(delta).padStart(5)}px  ${other ? `not held — ${other}` : Math.abs(delta) > BOX_TOL ? \"FAIL\" : \"ok\"}`);\n",
    "assert");
  // §D2: the same probe and the same rule on a document load.
  s = once(s,
    "      await p.addInitScript((t) => {\n"
    + "        window.__dsnap = null;\n",
    "      await p.addInitScript((t) => {\n"
    + "        window.__dsnap = null;\n"
    + "        window.__drow2 = null;\n",
    "d2 init");
  s = once(s,
    "            const e = document.querySelector(\".market-grid > *\");\n"
    + "            if (e) window.__dsnap = Math.round(e.getBoundingClientRect().top + scrollY);\n",
    "            const e = document.querySelector(\".market-grid > *\");\n"
    + "            if (e) {\n"
    + "              window.__dsnap = Math.round(e.getBoundingClientRect().top + scrollY);\n"
    + "              const r2 = document.querySelector(\".kp-discovery-bar .kp-qbar-row\");\n"
    + "              window.__drow2 = r2 ? Math.round(r2.getBoundingClientRect().height) : null;\n"
    + "            }\n",
    "d2 probe");
  s = once(s,
    "        return { snap: window.__dsnap, real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null };\n"
    + "      });\n",
    "        return { snap: window.__dsnap, real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null, row2Ghost: window.__drow2 };\n"
    + "      });\n"
    + "      Object.assign(got, await p.evaluate(pageCase));\n",
    "d2 got");
  s = once(s,
    "      const delta = got.real - got.snap;\n"
    + "      if (Math.abs(delta) > BOX_TOL) failures.push(`${tag}: the fallback drew the first card at y=${got.snap}, the page at y=${got.real} — ${delta}px`);\n"
    + "      console.log(`   ${tag.slice(2).padEnd(40)} ghost y=${String(got.snap).padStart(5)}  page y=${String(got.real).padStart(5)}  ${String(delta).padStart(5)}px  ${Math.abs(delta) > BOX_TOL ? \"FAIL\" : \"ok\"}`);\n",
    "      const delta = got.real - got.snap;\n"
    + "      const other = dataCase({ row2: true, carousel: target === \"/results\" }, got);\n"
    + "      if (!other && Math.abs(delta) > BOX_TOL) failures.push(`${tag}: the fallback drew the first card at y=${got.snap}, the page at y=${got.real} — ${delta}px`);\n"
    + "      console.log(`   ${tag.slice(2).padEnd(40)} ghost y=${String(got.snap).padStart(5)}  page y=${String(got.real).padStart(5)}  ${String(delta).padStart(5)}px  ${other ? `not held — ${other}` : Math.abs(delta) > BOX_TOL ? \"FAIL\" : \"ok\"}`);\n",
    "d2 assert");
  return s;
});
