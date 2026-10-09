// IN FLIGHT, 2026-10-08 ~20:30 EAT (cwd = the docs tree).
const fs = require("fs");
const p = "docs/VODACOM-PLAN.md";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const rep = (a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`anchor ×${n}: ${a.slice(0, 90)}`);
  s = s.replace(a, b);
};
rep("**⏳ IN FLIGHT (updated 2026-10-08 ~19:30 EAT)", "**⏳ IN FLIGHT (updated 2026-10-08 ~20:30 EAT)");
rep("`qa:journey-preview` 33/33 twice (§5's one stop in C was a click before hydration: the drive now waits for React),",
  "`qa:journey-preview` 33/33 twice (§5's one stop in C was the kit Modal taking focus back from a field already chosen, below — not a click before hydration, as this line first said; the drive's new wait for React is a precondition, not that stop's cause),");
rep("fixed on `vodacom-modal-focus`, its browser proof running (turn L).",
  "**LIVE: `e16f9353`** (turn L: the preview drive 33/33 three times with the button armed after the fills each time, `qa:enter-where-pressed` 24/0 in Chromium — WebKit's only failure its dev server's HMR chunk, as on main — and `qa:implicit-submit` 15/0).");
rep("S6 closes after that pass (§0h point 64).",
  "S6 closes after that pass (§0h point 64). " +
  "**The pass so far, on branch `vodacom-visual` (on main `e16f9353`), each commit with its measurements and suites:** " +
  "G1 — the featured card's top row in Swahili, Chinese titles that split \"200 / 毫米\" (`keepUnits`), the filter strips' fades, " +
  "a divider stranded at a row's end, the Needle resting over text, a state pill 2px taller, the carousel caption cut; " +
  "G4 — the money forms' extra 24px at the top (a hidden input without `hidden`), the legal nav's active label 2px off, a " +
  "held wallet's figure gold in the journey's Wallet, the chat bubble on a notched iPhone's rail; G5 — **the owner's rule " +
  "that the header's edge is the page's edge at every width**: the journey header pads 16 below 1024 and 32 from it, " +
  "like every page (design call 10 and A5 amended; the least header slack is now 10.7px, sw at 320); `/`'s hero and bands " +
  "follow in the journey only, by the shell's server-rendered mark, so classic viewers are served what they were; and " +
  "**one logic bug the edge-scenario plan found: the journey's Wallet offered Weka pesa to a player on a break**, which " +
  "`/wallet/deposit` refuses — it now offers Toa pesa alone. G2 (the hub and profile) and G3 (tickets and empty states) " +
  "are still working. Then three lock turns on the combined branch: **M1** typecheck, `test:all` with the database " +
  "suites, the journey header fit and its red, the landmark seal in both shells, needle-rest, the preview drive, local " +
  "`qa:live`; **M2** the 335 journey tiles and the classic parity, a baseline at main against the branch; **M3** 532 " +
  "edge-scenario tiles (a break, self-exclusion, a 40-character name, the longest title, slow 3G, not-found, odd " +
  "viewports, 130% text, offline, TZS 0). Every tile is read and measured before anything goes live.");
rep("did not end well): L — the Modal fix: the preview drive three times, `qa:enter-where-pressed` in Chromium and WebKit,\n`qa:implicit-submit`; I — S7 WP1's calibration (once WP1 is committed: parity v3 `--prove-red`, baseline and a null\ncompare, the served-skeleton null pair, the first-load build); then the visual pass's tiles.",
  "did not end well): I — S7 WP1's calibration, running (parity v3 `--prove-red` 114/122: the ticker strip moved between\ntwo captures of one cell — frozen for the capture in `9bcb22f7`; then the baseline and a null compare, the\nserved-skeleton null pair, the first-load build); then the visual pass's M1–M3 (above), then I2, WP1's second\ncalibration on `9bcb22f7`.");
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok", crlf ? "CRLF" : "LF");
