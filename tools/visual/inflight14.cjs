// IN FLIGHT, 2026-10-09 ~00:30 EAT (cwd = the docs tree).
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
rep("**⏳ IN FLIGHT (updated 2026-10-08 ~20:30 EAT)", "**⏳ IN FLIGHT (updated 2026-10-09 ~00:30 EAT)");

const a = s.indexOf("**The pass so far, on branch");
const endMark = "Every tile is read and measured before anything goes live.";
const b = s.indexOf(endMark, a);
if (a < 0 || b < 0) throw new Error("pass paragraph");
const pass =
  "**The pass, on branch `vodacom-visual` (rebased on main `d9b7a5b6`), each commit with its measurements and suites:** " +
  "G1 (the featured card's Swahili top row, Chinese \"200 / 毫米\", the strips' fades, a stranded divider, the Needle " +
  "over text, a pill 2px tall, the carousel caption); G4 (the legal nav's active label, a held wallet's gold figure in " +
  "the journey's Wallet, the chat bubble on a notched iPhone); G5 and **the owner's rule that the header's edge is the " +
  "page's edge** (16 below 1024, 32 from it; `/` follows in the journey only, so classic viewers are served what they " +
  "were); G3 (Tiketi zangu's cards whole and level, empty states without widows); G2 (the Akaunti hub without bands " +
  "or orphans, the invite page's spacing, the footer pill, the channels panel's ×); the journey's Wallet offers no Weka " +
  "pesa during a break (a logic bug the edge plan found). **Proved in lock turn M1:** typecheck 0; `test:all` with the " +
  "database suites 468/474 — five failures main's own, the sixth `test:house-bot-disclosure`'s D19a pin, which holds " +
  "every file under `src/app/legal/` byte-identical to main and reads red on any branch touching that tree until it is " +
  "main (G4's legal-nav change is one class, no word); the journey header fit 6/6 over 66 cells (least slack 10.7px) " +
  "and its red 10/10; the landmark seal 504 + 276 cells, 0 problems; needle-rest 20/20; the preview drive 33/33. " +
  "**M2:** 1645 checks over 333 tiles, 0 failed. **Round 3's read (nine readers, every tile measured) found two " +
  "regressions of this pass, both fixed:** G1 had hung its divider rule on a `kp-qrow` class that is the landing " +
  "board's question row, so every filter bar was laid out as a board row (`a94e6229`, with a guard); and G4's money-form " +
  "fix never reached the browser — React writes its own `$ACTION_ID_` hidden input first in every server-action form " +
  "(`329d1ad7`: the form's rhythm on an inner wrapper). Four helpers are fixing the rest of round 3's findings (the " +
  "home hero's Chinese word breaks and widows, the Swahili headline's optical edge, the ticker's cut edge; the Needle's " +
  "rest; lists, notifications, the hub and sheets; the header bell, money faces and the market and ticket pages). Then " +
  "everything is re-tiled and read again. Queued under the lock: marketing's STEP 54 now, then M3 (the 532 " +
  "edge-scenario tiles), M4 (local `qa:live` again — M1's stopped once on a page-load timeout), M5 (the classic parity " +
  "compare against main's baseline). Every tile is read and measured before anything goes live.";
s = s.slice(0, a) + pass + s.slice(b + endMark.length);

rep("did not end well): I — S7 WP1's calibration, running (parity v3 `--prove-red` 114/122: the ticker strip moved between\ntwo captures of one cell — frozen for the capture in `9bcb22f7`; then the baseline and a null compare, the\nserved-skeleton null pair, the first-load build); then the visual pass's M1–M3 (above), then I2, WP1's second\ncalibration on `9bcb22f7`.",
  "did not end well): S7 WP1's calibration turn I ran on `b644717d`: parity v3's `--prove-red` 114/122 and its baseline\nrefused (B.1: every lobby cell carried the moving LIVE strip — the cells without it all settled), as `9bcb22f7`\npredicts by capturing the strip still; the served-skeleton null pair differed only in Turbopack's dev chunk hashes and\na per-server market id — `qa:served-skeleton` now reads that hash as noise, and the pair is IDENTICAL under\n`--main --norm store-ids` (`9ad1f6d9`, self-test 78/78); `qa:first-load` PASS, 10 routes. I2 (parity v3 on\n`9ad1f6d9`) waits for a lock turn.");
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok", crlf ? "CRLF" : "LF");
