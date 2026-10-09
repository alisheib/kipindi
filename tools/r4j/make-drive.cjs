// Builds S/r4j/qa-journey-edges-r4j.mjs: the integrator's edges drive (S/edges/qa-journey-edges.mjs) with R4-J's two
// additions for the lock turn — every viewport tile waits for the Needle to be AT REST (R3-B's `window.needle.resting()`,
// E40), and every tile records what stands outside the page (the not-found mark, the chat bubble, the Needle, the tab
// title) for `r4j-verdict.mjs`. Counted, exact replacements; the original file is not touched.
const fs = require("fs");
const path = require("path");
const S = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(S, "edges", "qa-journey-edges.mjs"), "utf8");
const NL = src.includes("\r\n") ? "\r\n" : "\n";
let out = src.replace(/\r\n/g, "\n");
const edits = [
  [
    "    await parkPointer(p);\n    await settle(p, 260);\n  }\n  const facts = await readFacts(p);\n",
    "    await parkPointer(p);\n    await settle(p, 260);\n"
      + "    // ⭐ R4-J (E40): a tile shows the Needle AT REST, never on its way there — R3-B's read for drives\n"
      + "    // (`window.needle.resting()`), which qa-journey-shell already waits on. Tile 269 was shot ~560 ms after the drive's\n"
      + "    // own scrollIntoView: inside the host's post-scroll check (180 ms) and the glide that follows it.\n"
      + "    await p.waitForFunction(() => { const n = window.needle; return !n || typeof n.resting !== 'function' || n.resting(); }, null, { timeout: 5_000 }).catch(() => {});\n"
      + "    await settle(p, 120);\n"
      + "  }\n  const facts = await readFacts(p);\n"
      + "  // R4-J: what stands outside the page — the not-found mark, the chat bubble, the Needle — and the tab's title.\n"
      + "  const outside = await p.evaluate(() => {\n"
      + "    const root = document.getElementById('needle-root');\n"
      + "    return {\n"
      + "      notFoundMark: !!document.getElementById('kp-not-found'),\n"
      + "      chat: !!document.querySelector('.cm-fab'),\n"
      + "      needle: !!root && !root.classList.contains('needle-suppressed') && root.childElementCount > 0,\n"
      + "      needleResting: window.needle && typeof window.needle.resting === 'function' ? window.needle.resting() : null,\n"
      + "      title: document.title,\n"
      + "    };\n"
      + "  }).catch(() => null);\n",
  ],
  ["    failedRequests: errs.failed,\n    probe,\n", "    failedRequests: errs.failed,\n    outside,\n    probe,\n"],
  // The expectations R4-J changed (E38's ghosts; the not-found mark: no tab lit, the overlays shown, no 404 polls).
  ["(loading.tsx: the root SectionLoader on / and /account, TicketsGhost on /positions) before any content; the header should already be drawn.",
    "(R4-J: the page’s own ghost in its own column — the hero’s intro as bars on /, TicketsGhost on /positions, the hub’s column and cards on /account) before any content; the header (logo, 18+, capsule, pill; at 1280 the links, language, bell, avatar) and the rail already drawn."],
  ["inside the journey shell: header and tabs, Maswali lit (the /markets section).",
    "inside the journey shell: header and tabs, NO tab lit, the chat bubble and the Needle shown (R4-J: a not-found page is no journey page and no tab’s page — outside.notFoundMark), the console clean."],
  ["the global not-found page inside the journey shell, Juu/Chini lit. HTTP 404 expected.",
    "the global not-found page inside the journey shell, no tab lit (R4-J). HTTP 404 expected."],
];
for (const [from, to] of edits) {
  const n = out.split(from).length - 1;
  if (n !== 1) { console.error(`REFUSED: anchor found ${n}x: ${JSON.stringify(from).slice(0, 80)}`); process.exit(1); }
  out = out.replace(from, to);
}
fs.writeFileSync(path.join(__dirname, "qa-journey-edges-r4j.mjs"), out.replace(/\n/g, NL));
console.log("wrote qa-journey-edges-r4j.mjs");
