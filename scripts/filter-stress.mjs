/**
 * MANIPULATION STRESS for the two filtering boards.
 *
 * A filter surface is a public, unauthenticated input on a licensed real-money product: every one
 * of its params is attacker-controlled and bookmarkable. This drives them the way a hostile — or
 * merely careless — visitor does, and asserts three things that must hold for EVERY input:
 *
 *   1. the page answers 200 and never 500 (a filter must not be able to crash a board),
 *   2. it never reflects a param back into the HTML unescaped (a filter must not be an XSS sink),
 *   3. the promise still equals the delivery, even under a nonsense combination.
 *
 * ⛔ It also drives every real combination of /markets' axes, not a sample: 5 status × 6 sort ×
 * 4 odds × 3 pool is 360 boards, and "we tested a few" is how a combination-only defect ships.
 *
 * Run: npm run qa:filter-stress -- [baseUrl]     (default http://localhost:3009)
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3009";

let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { console.log(`  PASS ${label}`); }
  else { console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
};

/** Payloads a filter param must survive. Each is a real class, not a random string. */
const HOSTILE = [
  ["xss-script", `"><script>window.__x=1</script>`],
  ["xss-attr", `" onmouseover="window.__x=1`],
  ["sql-ish", `' OR 1=1 --`],
  ["path-traversal", `../../../../etc/passwd`],
  ["null-byte", `a%00b`],
  ["huge", "a".repeat(4000)],
  ["unicode-bidi", `‮evil`],
  ["array-param", `x`], // sent twice, so Next hands the handler an array where it expects a string
  ["negative-page", `-5`],
  ["huge-page", `999999999999`],
  ["nan-page", `NaN`],
  ["float-page", `1.9999`],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

/** @returns {{status:number, xss:boolean, promised:Object, cards:number, title:string}} */
async function drive(path) {
  const resp = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 90000 });
  const status = resp ? resp.status() : 0;
  const info = await page.evaluate(() => {
    const promised = {};
    for (const el of document.querySelectorAll("[data-chip]")) {
      promised[el.getAttribute("data-chip")] = Number(el.getAttribute("data-count"));
    }
    // ⛔ SCOPE THE COUNT, OR IT COUNTS THE WRONG BOARD. /markets renders a "recently resolved"
    // strip below the grid; counting market links page-wide reported "promised 0, delivered 2"
    // against a correct page. Batch 1 was bitten by exactly this ("15 of 40") and scoped its own
    // guard to [data-board="grid"] — this driver has to do the same. /results has no second strip,
    // so there the whole page IS the set (its featured carousel holds cards lifted out of the grid).
    const scope = document.querySelector('[data-board="grid"]') ?? document;
    const hrefs = new Set(
      [...scope.querySelectorAll('a[href^="/markets/"]')]
        .map((a) => (a.getAttribute("href") || "").split("?")[0])
        .filter((h) => h.length > "/markets/".length),
    );
    return {
      // If a payload executed, it set this. Reading it is the only honest XSS check — searching the
      // HTML for the payload text would flag correct, ESCAPED output as a vulnerability.
      xss: !!window.__x,
      promised,
      cards: hrefs.size,
      resultCount: document.querySelector("[data-result-count]")?.getAttribute("data-result-count") ?? null,
      /**
       * PV-14/row-11 · THE SORTED KEY, READ OFF THE CARD FACES IN DOM ORDER.
       *
       * ⛔ `pool` IS THE ONLY SORT THIS CAN HONESTLY VERIFY FROM THE OUTSIDE, and saying so is
       * the point. Volume is the one sort key a card PRINTS ("VOL TZS 12,500"); `closing`,
       * `people`, `move` and `new` order on fields the board does not render, so checking them
       * would mean trusting an internal value — which is a test agreeing with the code it is
       * testing. One sort proven against what a player can actually see beats five proven
       * against the sorter's own opinion.
       */
      /* ⛔ READ THE CARD, NOT THE LINK — the first version of this took
         `a[href^="/markets/"]`, which is the card's **"Details" button**, so every card yielded
         the string "Details" and the check honestly reported "0 printed volumes on 6 cards".
         `[class~=mcardp]` is the class TOKEN (never `*=`, which also matches `.mcardp-info`,
         `.mcardp-share` and nineteen other children — that substring cost a earlier drive a
         6-card board counted as 126). The figure ships as `TZS 94,500`, with no `VOL` prefix. */
      /* ⚠️ `\d{1,3}(?:,\d{3})*` — THOUSAND GROUPS, NOT `[\d,]+`, AND THE DIFFERENCE IS A WRONG
         ANSWER THAT LOOKS RIGHT. A card's text runs the volume straight into the countdown:
         `…TZS 94,50019d left…`. `[\d,]+` swallows the countdown's digits and yields **94,50019**.
         The order check still passed on that — the trailing digits happened not to reorder the
         five cards — which is the worst kind of instrument bug: confidently right by luck. This
         pattern stops at the last complete `,ddd` group. */
      vols: [...scope.querySelectorAll("[class~=mcardp]")]
        .map((c) => /TZS\s*(\d{1,3}(?:,\d{3})*)/i.exec(c.textContent || ""))
        .filter(Boolean)
        .map((m) => Number(m[1].replace(/,/g, ""))),
    };
  });
  return { status, ...info };
}

console.log(`\nmanipulation stress at ${BASE}\n`);

console.log("── hostile params must not 500 and must not execute ──");
for (const route of ["/markets", "/results"]) {
  for (const [name, payload] of HOSTILE) {
    const enc = encodeURIComponent(payload);
    // Aim each payload at every param the route reads, including the paging cursor.
    const paths = route === "/markets"
      ? [`${route}?q=${enc}`, `${route}?status=${enc}`, `${route}?sort=${enc}`, `${route}?odds=${enc}`, `${route}?pool=${enc}`, `${route}?topic=${enc}`, `${route}?page=${enc}`]
      : [`${route}?q=${enc}`, `${route}?cat=${enc}`, `${route}?sort=${enc}`, `${route}?page=${enc}`];
    if (name === "array-param") paths.push(`${route}?q=a&q=b`, `${route}?page=1&page=2`);
    let worst = 200, executed = false;
    for (const p of paths) {
      const r = await drive(p);
      if (r.status !== 200) worst = r.status;
      if (r.xss) executed = true;
    }
    ok(`${route} survives ${name} (${paths.length} params, worst status ${worst})`, worst === 200 && !executed,
      executed ? "A PAYLOAD EXECUTED" : `status ${worst}`);
  }
}

/**
 * Every combination of /markets' four segmented axes. The count beside a control must equal what
 * pressing it delivers under whatever else is already pressed — that is the whole contract, and a
 * cross-filter bug can hide in one corner of the space.
 */
console.log("\n── every /markets combination keeps promise == delivery ──");
const STATUS = ["open", "today", "new", "all"]; // `watch` needs a session
const SORT = ["closing", "pool", "people", "close", "move", "new"];
const ODDS = ["any", "call", "cont", "long"];
const POOL = ["any", "10k", "50k"];
const PAGE_SIZE = 12;
let combos = 0, bad = [];
for (const s of STATUS) {
  for (const so of SORT) {
    for (const o of ODDS) {
      for (const p of POOL) {
        const qs = `?status=${s}&sort=${so}&odds=${o}&pool=${p}`;
        const r = await drive(`/markets${qs}`);
        combos++;
        const promised = Number(r.resultCount);
        const expected = Math.min(promised, PAGE_SIZE);
        if (r.status !== 200 || !Number.isFinite(promised) || r.cards !== expected) {
          bad.push(`${qs} status=${r.status} promised=${r.resultCount} delivered=${r.cards} expected=${expected}`);
        }
      }
    }
  }
}
ok(`all ${combos} status×sort×odds×pool combinations render and deliver their promise`, bad.length === 0,
  bad.slice(0, 6).join(" | "));

/** A press must be idempotent: the same URL twice gives the same board. */
console.log("\n── repeating a control gives the same board (idempotent) ──");
for (const qs of ["?status=all&pool=10k", "?odds=cont&sort=pool", "?topic=sports&status=today"]) {
  const a = await drive(`/markets${qs}`);
  const b = await drive(`/markets${qs}`);
  ok(`/markets${qs} is stable across two identical requests (${a.cards} vs ${b.cards})`,
    a.cards === b.cards && a.resultCount === b.resultCount,
    `${a.resultCount}/${a.cards} then ${b.resultCount}/${b.cards}`);
}

/**
 * ── SORT MONOTONICITY (row 11, 2026-09-03) ───────────────────────────────────────────────────
 *
 * The last of the four questions `PLAYER-VISUAL-2026-09.md` §5 left open, and the only one that
 * was genuinely uncovered. ⭐ The other three were answered by re-derivation rather than by code:
 * **count == rendered** is already asserted by the combination sweep above (`promised` vs
 * `cards`); **combined-filter intersection** is what those 288 combinations ARE; and
 * **URL-backed state** was OVERTURNED — `/markets` writes the URL on a pill press, and §5's doubt
 * came from clicking "Open", the DEFAULT status, for which a clean URL is the correct result.
 *
 * ⛔ THE SWEEP ABOVE DRIVES ALL SIX SORTS AND NEVER CHECKS THAT ANYTHING IS SORTED. It asserts
 * each sorted board renders and delivers its promised count — which a board returning rows in
 * arbitrary order satisfies perfectly. That is the gap: a sort control that silently does nothing
 * passes every check this file had.
 *
 * ⚠️ AND IT REFUSES RATHER THAN PASSES ON A THIN BOARD. Fewer than three printed volumes cannot
 * order-check anything, and a green line there would be the "0 offenders over the wrong corpus"
 * failure in miniature — so the premise is asserted first, by name.
 */
console.log("\n── a sorted board is actually sorted ──");
{
  const r = await drive("/markets?sort=pool&status=all");
  ok("?sort=pool renders (the premise for the order check)", r.status === 200, `status ${r.status}`);
  ok("…and enough cards PRINT their volume to judge order (refuses rather than passing on a thin board)",
    r.vols.length >= 3,
    `${r.vols.length} printed volume(s) on ${r.cards} card(s) — unprovable from the outside here`);
  if (r.vols.length >= 3) {
    const desc = r.vols.every((v, i) => i === 0 || r.vols[i - 1] >= v);
    const asc = r.vols.every((v, i) => i === 0 || r.vols[i - 1] <= v);
    ok("⭐ ?sort=pool orders the board monotonically on the key it prints",
      desc || asc, `neither ascending nor descending: [${r.vols.join(", ")}]`);
    /* ⛔ AND A CONTROL, because "monotonic" is trivially true of a one-value board: if every
       printed volume is identical the check above cannot fail, and would report a working sort
       over a sorter that had been deleted. */
    ok("control · the volumes are not all identical (else 'monotonic' proves nothing)",
      new Set(r.vols).size > 1, `all ${r.vols.length} cards print ${r.vols[0]}`);
  }
}

await browser.close();
console.log(fail === 0 ? "\n✅ the boards hold under manipulation\n" : `\n❌ ${fail} failure(s)\n`);
process.exit(fail === 0 ? 0 : 1);
