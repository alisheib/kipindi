/**
 * U41 · `/fairness` ON A PHONE — the page the footer's `Uthibitisho wa utatuzi` link sends a
 * player to when they suspect a resolution.
 *
 *   npm run qa:fairness-phone -- https://www.50pick.tz
 *   RED_TABLE=1 npm run qa:fairness-phone -- <base>    the five-column table is served back
 *
 * This is U41's own accept line, made checkable: *"at 320/360 sw, every row's source link must be
 * inside the scroller's client box at `scrollLeft = 0`, and no two rows may paint identical title
 * text."*
 *
 * ── WHAT IT IS GUARDING AGAINST ──────────────────────────────────────────────────────────────
 * D60 · The SOURCE (CHANZO) column IS the page's purpose, and it started **157px outside its own
 * scroller** with no at-rest affordance: `clientWidth 326` against `scrollWidth 559` at 360, so
 * 41.7% of the table was off-screen, 48.8% at 320. All 12 `Chanzo` anchors sat at x=501 against an
 * x=344 edge. The hrefs were real (wikipedia.org, premierleague.com, accuweather.com) — a player
 * who doubted a resolution simply could not reach the proof.
 *
 * D61 · Every market title was clamped to 2 of up to 16 lines in a column that never grew. The
 * title box measured **91.8px at 320, 360 AND 412** — width-invariant, because the five columns'
 * content minimums (558.7px) beat `.admin-tbl { width: 100% }`. A 103-character Swahili question
 * painted as 14 characters, and ⛔ **two different markets painted identical rows**. That is the
 * assertion below that matters most: a table where two rows are indistinguishable is worse than
 * one that scrolls, because nothing on screen says you are looking at the wrong market.
 *
 * ⚠️ THE TWO ARE ONE FIX, WHICH IS WHY ONE CONTROL BREAKS BOTH SECTIONS. Raising the clamp alone
 * could not work — the column never grew. Below 640 the table stops being a table: each row
 * becomes a stacked block and `td[data-th]::before { content: attr(data-th) }` carries the column
 * name that the header row used to. `RED_TABLE` serves `display: revert` back onto those rules.
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || process.env.BASE || "https://www.50pick.tz";
const RED = process.env.RED_TABLE === "1";
const failures = [];
const b = await chromium.launch();

for (const w of [320, 360, 412]) {
  const ctx = await localisedContext(b, { locale: "sw", width: w, height: 780, baseUrl: BASE, reducedMotion: "reduce" });
  const p = await ctx.newPage();

  if (RED) {
    await p.route(/\/_next\/static\/.*\.css(\?.*)?$/, async (route) => {
      const res = await route.fetch();
      const css =
        (await res.text()) +
        "\n@media (max-width:639.98px){.fairness-tbl,.fairness-tbl thead,.fairness-tbl tbody,.fairness-tbl tr,.fairness-tbl td{display:revert}.fairness-tbl td[data-th]::before{content:none}}\n";
      await route.fulfill({ response: res, body: css, headers: { ...res.headers(), "content-length": String(Buffer.byteLength(css)) } });
    });
  }

  await p.goto(BASE + "/fairness", { waitUntil: "load", timeout: 180000 });
  await p.waitForTimeout(5000);
  await assertLang(p, "sw");

  const r = await p.evaluate(() => {
    const tbl = document.querySelector(".fairness-tbl");
    if (!tbl) return { none: true };
    // the nearest ancestor that scrolls horizontally — the box a link must be inside
    let sc = tbl.parentElement;
    while (sc && sc !== document.body) {
      if (/auto|scroll/.test(getComputedStyle(sc).overflowX)) break;
      sc = sc.parentElement;
    }
    const scoped = sc && sc !== document.body;
    const scBox = scoped ? sc.getBoundingClientRect() : null;
    const rows = [...tbl.querySelectorAll("tbody tr")];
    const links = [...tbl.querySelectorAll('a[href^="http"]')];
    const outside = links
      .map((a) => ({ a, q: a.getBoundingClientRect() }))
      .filter(({ q }) => (scBox ? q.right > scBox.right + 0.5 || q.left < scBox.left - 0.5 : q.right > innerWidth + 0.5))
      .map(({ q }) => Math.round(q.right));
    // ⛔ the TITLE text a reader actually sees, not the DOM text: two rows clamped to the same
    //    14 characters are indistinguishable on screen however different their markup is.
    const titles = rows.map((tr) => {
      const c = tr.querySelector("td");
      return c ? (c.innerText || "").trim().replace(/\s+/g, " ") : "";
    }).filter(Boolean);
    const seen = new Map();
    for (const t of titles) seen.set(t, (seen.get(t) || 0) + 1);
    const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([t, n]) => `${n}× "${t.slice(0, 40)}"`);
    return {
      rows: rows.length, links: links.length, outside, dups,
      client: scoped ? Math.round(sc.clientWidth) : Math.round(document.documentElement.clientWidth),
      scroll: scoped ? Math.round(sc.scrollWidth) : Math.round(document.documentElement.scrollWidth),
      scoped,
    };
  });

  if (r.none) {
    failures.push(`${w} /fairness has no .fairness-tbl — the guard lost its subject`);
    await ctx.close();
    continue;
  }
  // ⛔ VACUITY: an empty or one-row attestation table cannot fail either assertion below.
  if (r.rows < 2) failures.push(`${w} only ${r.rows} attestation row(s) — this width proved nothing; re-run when the board has settled markets`);
  if (r.links < 1) failures.push(`${w} not one source link in the table — the column this page exists for is absent, so §1 proved nothing`);

  if (r.outside.length) failures.push(`${w} ${r.outside.length} of ${r.links} source links start outside the scroller at scrollLeft 0 (right edges ${r.outside.slice(0, 3).join(", ")} vs a ${r.client}px box)`);
  if (r.dups.length) failures.push(`${w} two or more rows paint IDENTICAL title text — ${r.dups.join(" · ")}`);
  if (r.scroll > r.client + 1) failures.push(`${w} the table still scrolls sideways: client ${r.client} vs scroll ${r.scroll} (${Math.round(((r.scroll - r.client) / r.scroll) * 100)}% off-screen)`);

  console.log(`   ${String(w).padStart(3)}px  ${r.rows} rows · ${r.links} source links · ${r.outside.length} outside · ${r.dups.length} duplicate titles · box ${r.client}/${r.scroll}`);
  await ctx.close();
}

await b.close();

console.log(`\nfairness on a phone — ${RED ? "RED (the five-column table served back)" : "GREEN"} — ${BASE}`);
if (failures.length) for (const f of failures) console.log("  FAIL " + f);
else console.log("  no failures");

if (RED) {
  if (!failures.length) {
    console.error("\n🔴 BROKEN HARNESS — the table layout was served back and the guard still PASSED.\n   This check proves nothing; fix the check before trusting any green run of it.");
    process.exit(2);
  }
  console.log(`\nRED control behaved: ${failures.length} failure(s), as required.`);
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
