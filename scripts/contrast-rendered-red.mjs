/**
 * RED harness for `scripts/contrast-rendered.mjs` (E-118).
 *
 *   node scripts/contrast-rendered-red.mjs
 *
 * ⭐ IT SERVES ITS OWN FIXTURES. The sweep's two defects are both about what it
 * does when it CANNOT see something, and neither is reproducible on demand
 * against production — you would have to break the live site to prove them. So
 * this harness starts a throwaway HTTP server on a free port and points the
 * sweep at pages built to contain exactly one hazard each. Nothing here touches
 * the product, the shared tree, or the network.
 *
 * The two defects, both measured before they were fixed:
 *
 *   ① `PASS — no AA contrast failures` over **0 text nodes measured**, exit 0.
 *      Reproducible from Git Bash, where MSYS rewrites `ONLY=/results` into
 *      `C:/Program Files/Git/results`, every route SKIPs, and the sweep reports
 *      success. A check that would still pass if every surface it names had been
 *      deleted is not a check.
 *
 *   ② A gradient-painted surface read as transparent. `.chip-resolved` is a gold
 *      pill with dark ink; the sweep scored its label against the page canvas
 *      behind it and reported **1.08:1**, eleven times, on production.
 *      ⛔ The direction of that lie is not fixed — on light text over a light
 *      gradient the same bug HIDES a failure instead of inventing one, which is
 *      why §4 below exists and is the more important of the two.
 */
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// ⛔ `execFileSync` BLOCKS THE EVENT LOOP OF THE PROCESS SERVING THE FIXTURES.
// The first version of this harness used it, so every `page.goto` against the
// fixture server timed out at 60s and all five checks reported the sweep's
// coverage failure — including two that then "passed" for entirely the wrong
// reason, because a page that never loads produces the same zero-node exit as a
// page that loaded and was empty. A guard and its own RED proof agreeing with
// each other is not agreement. Async `execFile` keeps the loop free to serve.
const run = promisify(execFile);

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

// Enough body text to clear the sweep's own 200-char "THIN page" floor, so a
// fixture is never rejected for being a skeleton instead of for its hazard.
const FILLER =
  "<p style='color:#fff;background:#000;font-size:16px'>" +
  "This paragraph exists only to give the page enough text that the sweep does not " +
  "class it as a skeleton. It is white on black and clears AA comfortably, so it can " +
  "never be the thing that decides any of the checks below. ".repeat(2) +
  "</p>";

const page = (body) =>
  `<!doctype html><html style="background:#07045a"><head><meta charset="utf-8"><title>fixture</title></head>` +
  `<body style="background:#07045a;margin:0;font-family:sans-serif">${body}${FILLER}</body></html>`;

/**
 * ⚠️ THE GOLD PILL IS THE REAL ONE. These are `.chip-resolved`'s own values,
 * read off production: ink `lab(11.8 7.08 20.13)` on a ramp from
 * `lab(83.85 12.44 55.34)` to `lab(67.48 16.41 64.08)`. The dark stop scores
 * 6.54 in the token gate, so a correct sweep must PASS this page.
 */
const GOLD_PILL =
  `<span style="display:inline-block;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:700;` +
  `color:lab(11.8 7.08 20.13);background:linear-gradient(180deg, lab(83.85 12.44 55.34), lab(67.48 16.41 64.08))">RESOLVED</span>`;

/** Dark ink on a DARK gradient — genuinely illegible. Must still FAIL. */
const BAD_GRADIENT =
  `<span style="display:inline-block;padding:4px 9px;font-size:12px;` +
  `color:rgb(46,27,0);background:linear-gradient(180deg, rgb(40,30,10), rgb(30,20,5))">UNREADABLE</span>`;

/**
 * ⭐ THE HIDDEN-FAILURE DIRECTION. Near-white text on a NEAR-WHITE gradient,
 * sitting inside a black panel. The old code walked past the gradient, scored
 * the text against the black panel and called it ~18:1 — a real failure turned
 * green. This is the check that would have caught the bug pointing the other way.
 */
const HIDDEN_FAIL =
  `<div style="background:#000;padding:20px">` +
  `<span style="display:inline-block;padding:4px 9px;font-size:12px;` +
  `color:rgb(250,250,250);background:linear-gradient(180deg, rgb(240,240,240), rgb(230,230,230))">INVISIBLE</span></div>`;

const FIXTURES = {
  "/gold": page(GOLD_PILL),
  "/bad-gradient": page(BAD_GRADIENT),
  "/hidden": page(HIDDEN_FAIL),
  "/empty": `<!doctype html><html style="background:#07045a"><head><title>e</title></head><body></body></html>`,
};

const server = createServer((req, res) => {
  const body = FIXTURES[req.url.split("?")[0]];
  if (!body) { res.writeHead(404, { "content-type": "text/html" }); res.end("<html><body>no</body></html>"); return; }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

async function sweep(only) {
  try {
    const { stdout } = await run(process.execPath, ["scripts/contrast-rendered.mjs"], {
      cwd, encoding: "utf8", maxBuffer: 8 << 20,
      env: { ...process.env, BASE, ONLY: only, WIDTHS: "1280", LOCALES: "en" },
    });
    return { code: 0, out: stdout };
  } catch (e) {
    return { code: e.code ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/**
 * ⛔ EVERY CHECK ASSERTS THE FIXTURE ACTUALLY LOADED — `loaded(r)`.
 *
 * Without it, two of these five passed for entirely the wrong reason while the
 * event loop was blocked: a page that never loads reports zero measured nodes
 * and exits 2, which is byte-for-byte what "a page that loaded and was empty"
 * reports. The check and the failure it was aimed at had the same signature, so
 * it was green over a harness that was measuring nothing at all.
 */
const loaded = (r) => /cells measured: ([1-9]\d*)\/\1\b/.test(r.out) && !/cells never loaded/.test(r.out);

const CHECKS = [
  {
    name: "the gold pill is NOT scored against the page canvas behind it",
    only: "/gold",
    // 6.54 against the dark stop — the same figure the token gate computes.
    want: (r) => loaded(r) && r.code === 0 && /PASS — no AA contrast failures/.test(r.out) && /text nodes measured: [1-9]/.test(r.out),
    why: "a correct sweep passes a gold pill with dark ink; the old one reported 1.08:1",
  },
  {
    name: "a genuinely illegible gradient still FAILS — the fix must not mute gradients",
    only: "/bad-gradient",
    want: (r) => loaded(r) && r.code === 1 && /FAIL — \d+ AA failures/.test(r.out) && /UNREADABLE/.test(r.out),
    why: "scoring the WORST stop is the point; ignoring gradients would trade one lie for another",
  },
  {
    name: "⭐ light-on-light gradient FAILS — the direction the old bug HID",
    only: "/hidden",
    want: (r) => loaded(r) && r.code === 1 && /FAIL — \d+ AA failures/.test(r.out) && /INVISIBLE/.test(r.out),
    why: "walking past the gradient scored this against the black panel and called it ~18:1",
  },
  {
    name: "a page that LOADS but has no text is INCONCLUSIVE, not a PASS",
    only: "/empty",
    // ⭐ `loaded(r)` is what makes this check mean what its name says.
    want: (r) => loaded(r) && r.code === 2 && /measured ZERO text nodes/.test(r.out) && !/PASS/.test(r.out),
    why: "the shipped behaviour was `PASS — no AA contrast failures`, exit 0, over 0 nodes",
  },
  {
    name: "a route that never loads makes the run INCONCLUSIVE, and SAYS WHY",
    // An unroutable port: `goto()` throws a real navigation error.
    only: "/gold,http://127.0.0.1:1/never",
    want: (r) => r.code === 2 && /cells never loaded/.test(r.out) && /did not load: \S/.test(r.out),
    why: "a cell that vanished from the arithmetic is how a 4-route run reported success over nothing",
  },
];

let caught = 0;
const missed = [];
for (const c of CHECKS) {
  const r = await sweep(c.only);
  const ok = c.want(r);
  if (ok) {
    caught++;
    console.log(`  ✓ RED  ${c.name}\n         → exit ${r.code} · ${c.why}`);
  } else {
    missed.push(c.name);
    const verdict = /(PASS|FAIL|INCONCLUSIVE)[^\n]*/.exec(r.out)?.[0] ?? "(no verdict line)";
    const nodes = /text nodes measured: \d+/.exec(r.out)?.[0] ?? "(no node count)";
    console.log(`  ✗ MISS ${c.name}\n         → exit ${r.code} · ${nodes} · ${verdict}`);
  }
}

server.close();
console.log(`\nRED HARNESS (contrast-rendered) — ${caught}/${CHECKS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
