// R5-L · §D's data-case rule made general: each route names the DATA_BANDS above its element (row 2, /results' carousel,
// /live's hero); the probe records their heights in the last ghost frame, the page's are read once it lands, and the
// element is held only when every band is as tall in both. /live joins (its hero's stack is the tallest contested
// question; its dots one per slide) — today's QA board shows four slides and two-line questions at 1280.
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => {
  s = once(s,
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
    "/** The bands a ghost draws in ONE case of the data (its note says which), found the same way in the ghost and on the\n"
    + " *  page: a bar's row 2, whose lines the counts' digits set (the ghosts hold two, \"00\"); the band over /results' grid,\n"
    + " *  its notable carousel — arrows and dots only for an archive of eight or more (`results/page.tsx`; one notable below\n"
    + " *  that), the card as tall as its title; and /live's hero — its stack as tall as the tallest contested question, a dot\n"
    + " *  per slide. */\n"
    + "const DATA_BANDS = {\n"
    + "  row2: { name: \"row 2\", sel: \".kp-discovery-bar .kp-qbar-row\", why: \"the counts' digits set its lines; the ghost holds two\" },\n"
    + "  overGrid: { name: \"the carousel\", sel: \".market-grid\", prev: true, why: \"arrows and dots for an archive of eight or more; the card as tall as its title\" },\n"
    + "  hero: { name: \"the hero\", sel: \"main header.overflow-hidden\", why: \"the tallest contested question's lines; a dot per slide\" },\n"
    + "};\n"
    + "/** Each route: where it is reached from (a page that links to it), the element measured in BOTH the ghost and the page\n"
    + " *  (`el`, the first match, or the last with `last`), and whether it needs a player.\n"
    + " *  ⚠️ `drawn`: the DATA_BANDS above the element. It is held only when the page IS the case its ghost drew — each of\n"
    + " *  those bands as tall as the ghost's; otherwise its delta is printed as the data's, not held. /results' row 2 is held\n"
    + " *  always: its top stands above every band the data sets. */\n"
    + "const D_ROUTES = [\n"
    + "  { target: \"/live\", from: \"/\", el: \".market-grid > *\", drawn: [\"hero\"] },\n"
    + "  { target: \"/markets\", from: \"/\", el: \".market-grid > *\", drawn: [\"row2\"] },\n"
    + "  { target: \"/results\", name: \"/results row 2\", from: \"/\", el: \".kp-discovery-bar .kp-qbar-row\" },\n"
    + "  { target: \"/results\", from: \"/\", el: \".market-grid > *\", drawn: [\"row2\", \"overGrid\"] },\n",
    "routes");
  s = once(s,
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
    + "};\n",
    "/** The heights of `bands` (DATA_BANDS entries) on the landed page — run in the page; the probes measure the ghost frame\n"
    + " *  the same way. */\n"
    + "const bandHeights = (bands) => bands.map((b) => {\n"
    + "  const x = document.querySelector(b.sel);\n"
    + "  const e = b.prev ? x?.previousElementSibling : x;\n"
    + "  return e ? Math.round(e.getBoundingClientRect().height) : null;\n"
    + "});\n"
    + "/** Why the page is not the case its ghost drew, or \"\" when it is: each band of `keys` as tall in both, within 1px. */\n"
    + "function dataCase(keys, ghost, page) {\n"
    + "  const why = (keys ?? []).map((k, i) => (ghost?.[i] != null && page?.[i] != null && Math.abs(page[i] - ghost[i]) <= 1 ? \"\"\n"
    + "    : `${DATA_BANDS[k].name} is ${page?.[i]}px, the ghost's ${ghost?.[i]} (${DATA_BANDS[k].why})`)).filter(Boolean);\n"
    + "  return why.length ? `not the drawn case: ${why.join(\"; \")}` : \"\";\n"
    + "}\n",
    "helpers");
  // §D (client moves)
  s = once(s,
    "      await p.evaluate(({ t, sel, last }) => {\n"
    + "        window.__dsnap = null;\n"
    + "        window.__drow2 = null;\n"
    + "        const probe = () => {\n"
    + "          if (location.pathname === t && document.querySelector(\".kp-shimmer-track\")) {\n"
    + "            const all = document.querySelectorAll(sel);\n"
    + "            const e = last ? all[all.length - 1] : all[0];\n"
    + "            if (e) {\n"
    + "              window.__dsnap = Math.round(e.getBoundingClientRect().top + scrollY);\n"
    + "              const r2 = document.querySelector(\".kp-discovery-bar .kp-qbar-row\");\n"
    + "              window.__drow2 = r2 ? Math.round(r2.getBoundingClientRect().height) : null;\n"
    + "            }\n"
    + "          }\n"
    + "          requestAnimationFrame(probe);\n"
    + "        };\n"
    + "        requestAnimationFrame(probe);\n"
    + "      }, { t: r.target, sel: r.el, last: !!r.last });\n",
    "      const bands = (r.drawn ?? []).map((k) => DATA_BANDS[k]);\n"
    + "      await p.evaluate(({ t, sel, last, bands }) => {\n"
    + "        window.__dsnap = null;\n"
    + "        window.__dbands = null;\n"
    + "        const probe = () => {\n"
    + "          if (location.pathname === t && document.querySelector(\".kp-shimmer-track\")) {\n"
    + "            const all = document.querySelectorAll(sel);\n"
    + "            const e = last ? all[all.length - 1] : all[0];\n"
    + "            if (e) {\n"
    + "              window.__dsnap = Math.round(e.getBoundingClientRect().top + scrollY);\n"
    + "              window.__dbands = bands.map((b) => {\n"
    + "                const x = document.querySelector(b.sel);\n"
    + "                const y = b.prev ? x?.previousElementSibling : x;\n"
    + "                return y ? Math.round(y.getBoundingClientRect().height) : null;\n"
    + "              });\n"
    + "            }\n"
    + "          }\n"
    + "          requestAnimationFrame(probe);\n"
    + "        };\n"
    + "        requestAnimationFrame(probe);\n"
    + "      }, { t: r.target, sel: r.el, last: !!r.last, bands });\n",
    "d probe");
  s = once(s,
    "        return { snap: window.__dsnap, real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null, row2Ghost: window.__drow2 };\n"
    + "      }, { sel: r.el, last: !!r.last });\n"
    + "      Object.assign(got, await p.evaluate(pageCase));\n",
    "        return { snap: window.__dsnap, real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null, bands: window.__dbands };\n"
    + "      }, { sel: r.el, last: !!r.last });\n"
    + "      const pageBands = await p.evaluate(bandHeights, bands);\n",
    "d got");
  s = once(s,
    "      const other = dataCase(r.drawn, got);\n",
    "      const other = dataCase(r.drawn, got.bands, pageBands);\n",
    "d assert");
  // §D2 (document loads)
  s = once(s,
    "      await p.addInitScript((t) => {\n"
    + "        window.__dsnap = null;\n"
    + "        window.__drow2 = null;\n"
    + "        const probe = () => {\n"
    + "          if (location.pathname === t && document.querySelector(\".kp-shimmer-track\")) {\n"
    + "            const e = document.querySelector(\".market-grid > *\");\n"
    + "            if (e) {\n"
    + "              window.__dsnap = Math.round(e.getBoundingClientRect().top + scrollY);\n"
    + "              const r2 = document.querySelector(\".kp-discovery-bar .kp-qbar-row\");\n"
    + "              window.__drow2 = r2 ? Math.round(r2.getBoundingClientRect().height) : null;\n"
    + "            }\n"
    + "          }\n"
    + "          requestAnimationFrame(probe);\n"
    + "        };\n"
    + "        requestAnimationFrame(probe);\n"
    + "      }, target);\n",
    "      const keys = target === \"/results\" ? [\"row2\", \"overGrid\"] : [\"row2\"], bands = keys.map((k) => DATA_BANDS[k]);\n"
    + "      await p.addInitScript(({ t, bands }) => {\n"
    + "        window.__dsnap = null;\n"
    + "        window.__dbands = null;\n"
    + "        const probe = () => {\n"
    + "          if (location.pathname === t && document.querySelector(\".kp-shimmer-track\")) {\n"
    + "            const e = document.querySelector(\".market-grid > *\");\n"
    + "            if (e) {\n"
    + "              window.__dsnap = Math.round(e.getBoundingClientRect().top + scrollY);\n"
    + "              window.__dbands = bands.map((b) => {\n"
    + "                const x = document.querySelector(b.sel);\n"
    + "                const y = b.prev ? x?.previousElementSibling : x;\n"
    + "                return y ? Math.round(y.getBoundingClientRect().height) : null;\n"
    + "              });\n"
    + "            }\n"
    + "          }\n"
    + "          requestAnimationFrame(probe);\n"
    + "        };\n"
    + "        requestAnimationFrame(probe);\n"
    + "      }, { t: target, bands });\n",
    "d2 probe");
  s = once(s,
    "        return { snap: window.__dsnap, real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null, row2Ghost: window.__drow2 };\n"
    + "      });\n"
    + "      Object.assign(got, await p.evaluate(pageCase));\n",
    "        return { snap: window.__dsnap, real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null, bands: window.__dbands };\n"
    + "      });\n"
    + "      const pageBands = await p.evaluate(bandHeights, bands);\n",
    "d2 got");
  s = once(s,
    "      const other = dataCase({ row2: true, carousel: target === \"/results\" }, got);\n",
    "      const other = dataCase(keys, got.bands, pageBands);\n",
    "d2 assert");
  s = once(s,
    " * ⚠️ And an element below a band the DATA sets (a bar's row 2, /results' carousel) is held only when the page is the\n"
    + " * case its ghost drew; else its delta is printed, not held — `D_ROUTES`' note. Today's QA board is not /results' case\n"
    + " * (six results: one notable, no arrows, one-digit counts), so there §D holds /results' row 2 and prints the grid's\n"
    + " * delta.\n",
    " * ⚠️ And an element below a band the DATA sets (a bar's row 2, /results' carousel, /live's hero) is held only when the\n"
    + " * page is the case its ghost drew; else its delta is printed, not held — `DATA_BANDS`. Today's QA board is not\n"
    + " * /results' case (six results: one notable, no arrows, one-digit counts), nor /live's on a phone (four slides, its\n"
    + " * questions two lines where the ghost holds three): there §D holds /results' row 2 and prints those grids' deltas.\n",
    "header");
  return s;
});
