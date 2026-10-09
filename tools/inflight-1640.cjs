// IN FLIGHT ~16:45 EAT (2026-10-09). Run in F:/kipindi-vdocs at origin/main. CRLF kept (the paragraph is one line).
const fs = require("fs");
const p = "F:/kipindi-vdocs/docs/VODACOM-PLAN.md";
let s = fs.readFileSync(p, "utf8");
const start = "**⏳ IN FLIGHT (updated 2026-10-09 ~14:40 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane** ▶ ";
const end = "  (the other sessions on";
const i = s.indexOf(start), j = s.indexOf(end, i);
if (i < 0 || j < 0 || s.split(start).length !== 2) throw new Error("anchors");
const next = "**⏳ IN FLIGHT (updated 2026-10-09 ~16:45 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane** ▶ " +
  "**Round 5's fixes are merging (resumed at Ali's word ~14:25 EAT).** On `vodacom-visual` (not live): R5-F (the " +
  "bar-geometry instrument repaired), R5-D (the loading ghosts and the not-found view out of every document — 31 KB → " +
  "138 B; a real market never served as \"not found\"; the worker caches only images and fonts), R5-B (the Wallet's " +
  "footer, tabs and docked sheets; notices dated in the reader's language and cut at a word; one name per money action), " +
  "and R5-C (the second gold audit: gold only where money was earned, every other highlight in the brand's blue, a census " +
  "that fails on any new gold use) — merged and green (`95ff793b`: 226 suites, its 59-plant mutation proof). R5-A (home card, one page " +
  "one name, every close ✕ on its title, counts, the regulator's name, legal titles) is finishing one consistency item " +
  "(the bet dialog's ✕); R5-E (text wrapping) one pin. The follow-up round runs: R5-H (the loading ghosts out of " +
  "every refresh, the journey flag before the first paint) and R5-I (the state inks — the betting colours only for " +
  "betting, one way to refuse) started; R5-G (names, counts, the regulator's name) starts once R5-A is merged. Then the " +
  "final proof " +
  "(M16a–d), round 6's read — and it goes live only when a read finds nothing. **A second security hotfix is LIVE: `118fc75c` (2026-10-09 13:31Z):** " +
  "pages at addresses ending like an image (`/markets/x.png`) skipped the proxy, so they went out without " +
  "X-Frame-Options/CSP/HSTS/nosniff — now only public/'s static folders, the favicons and `_next` skip it " +
  "(`test:proxy-scope`; proved under the lock: typecheck 0, headers 9/9 on a dev server; production read back: the " +
  "image-like page DENY + CSP + HSTS + nosniff, the static files still immutable). " +
  "The owner questions gathered so far (37, plus the S12 word list) go " +
  "to Ali in one plain list at S6's close.";
s = s.slice(0, i) + next + s.slice(j);
fs.writeFileSync(p, s);
console.log("ok");
