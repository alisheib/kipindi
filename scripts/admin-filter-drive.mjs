/**
 * `npm run qa:admin-filters` — do the admin grid filters actually FILTER?
 *
 * ⛔ WHY THIS IS NOT OBVIOUS, AND WHY IT NEEDS DRIVING. This campaign has already shipped
 * `regex-advertised-never-executed` (F5): three admin surfaces advertised regex search, echoed
 * *"pattern"* under the box as the operator typed, and then matched the pattern as **literal
 * characters** — returning **zero rows and reporting that as the answer**. Three independent
 * signals said the filter had run. It never had. A filter that silently does nothing looks
 * exactly like a filter over data that genuinely has no matches.
 *
 * THE INVARIANT — and it has TWO arms, because each alone is satisfied by a broken filter:
 *   1. **SUBSET**   — the filtered rows must be a subset of the unfiltered rows.
 *                     A filter that is IGNORED passes this trivially, which is why 2 exists.
 *   2. **MATCHING** — every row still visible must actually satisfy the filter.
 *                     A filter that returns NOTHING passes this vacuously, which is why the
 *                     count is checked too.
 *
 * ⭐ AND THE VALUE IS CHOSEN FROM THE DATA, NOT INVENTED. The driver reads the unfiltered grid
 * first and picks a value that is **present but not universal** — so a correct filter MUST
 * reduce the count. Hard-coding a status that happens to be absent would make "0 rows" the
 * expected answer and the check could never fail; hard-coding one that happens to be on every
 * row would make "no reduction" expected. Both are [[checks-that-lie]].
 *
 * ⛔ LOCALHOST ONLY.
 * Prereqs: npm run db:seed-admin-local ; next build && next start
 */
import { browser, loginOnce, recorder } from "./live/harness.mjs";

const BASE = process.env.LIVE_BASE ?? "http://localhost:3001";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE)) {
  console.error(`REFUSED — localhost-only, got BASE=${BASE}`);
  process.exit(1);
}

const r = recorder("qa:admin-filters — a filter must narrow the rows, and the survivors must match");

/**
 * Each grid: the page, the URL param its filter uses, and which table column carries the
 * value that param filters on (0-indexed).
 *
 * ⚠️ The column index is asserted, not assumed — §0 checks the header at that index names
 * the thing being filtered, so a column re-order turns into a loud failure instead of a
 * silent comparison against the wrong cell.
 */
const GRIDS = [
  { path: "/admin/transactions", param: "status", column: "status", label: "Transactions · status" },
  { path: "/admin/transactions", param: "type", column: "type", label: "Transactions · type" },
  { path: "/admin/players", param: "status", column: "status", label: "Players · status" },
  { path: "/admin/audit", param: "category", column: "category", label: "Audit · category" },
];

/**
 * The grid: its headers, its VISIBLE rows, and — the important one — the TOTAL.
 *
 * 🔴 COMPARING VISIBLE ROWS IS WRONG ON A PAGED GRID, and it produced a false finding on the
 * first run: `/admin/players` went `20 → 20` under `?status=ACTIVE` and was reported as "the
 * filter does not reduce the rows". It does. `PER_PAGE` is 20, and both the filtered and
 * unfiltered sets are longer than one page, so the visible count is 20 either way. The
 * §2 arm — every survivor matches — passed throughout, which is what exposed it.
 *
 * ⚠️ The kit's `Pagination` prints `1–20 of 137` and returns **null** when there is only one
 * page, so the total falls back to the row count. Both cases are handled and the source of
 * the number is reported, because "137" and "20" mean different things.
 */
async function readGrid(page) {
  return page.evaluate(() => {
    const tables = [...document.querySelectorAll("main table")];
    const t = tables.find((x) => x.querySelectorAll("tbody tr").length > 0);
    const headers = t ? [...t.querySelectorAll("thead th")].map((h) => (h.textContent || "").replace(/\s+/g, " ").trim().toLowerCase()) : [];
    const rows = t
      ? [...t.querySelectorAll("tbody tr")]
          .map((tr) => [...tr.querySelectorAll("td")].map((td) => (td.textContent || "").replace(/\s+/g, " ").trim()))
          .filter((cells) => cells.length > 1) // skip the "no rows" placeholder row
      : [];
    // "1–20 of 137" (the `of` word is localised, so anchor on the shape, not the word).
    let total = null;
    for (const el of document.querySelectorAll("main *")) {
      if (el.children.length) continue;
      const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
      const m = /^[\d,]+[–-][\d,]+\s+\S+\s+([\d,]+)$/.exec(txt);
      if (m) { total = Number(m[1].replace(/,/g, "")); break; }
    }
    return { headers, rows, total, totalFrom: total === null ? "row count" : "pagination" };
  });
}
const totalOf = (g) => (g.total ?? g.rows.length);

const { b } = await browser();
try {
  const state = await loginOnce(b, "local:ADMIN"); // the Owner sees every grid — this is about filtering, not RBAC
  const ctx = await b.newContext({ storageState: state, viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();

  for (const g of GRIDS) {
    await page.goto(`${BASE}${g.path}`, { waitUntil: "networkidle" });
    const before = await readGrid(page);

    // ⛔ NO ROWS IS A SKIP, NOT A FAILURE. An empty grid on the disposable cluster is a gap in
    // the FIXTURE, not a defect in the filter — reporting it as a failure would be the
    // instrument blaming the product ([[an-instrument-reports-its-own-staleness]]).
    if (before.rows.length <= 1) {
      r.note(`§0 ${g.label}: SKIP — the unfiltered grid has ${before.rows.length} row(s) on this database, so there is nothing to narrow. Not a pass.`);
      continue;
    }
    r.check(`§0 ${g.label}: the unfiltered grid has rows to filter`, true);

    // ⚠️ Headers are ABBREVIATED in this console — /admin/audit renders "cat.↓", not
    // "category" — so match on a prefix and report what was actually found.
    const col = before.headers.findIndex((h) => h.startsWith(g.column.slice(0, 3)));
    if (!r.check(`§0 ${g.label}: a "${g.column}" column was located (index asserted, not assumed)`,
      col >= 0, `headers=[${before.headers.join(" | ")}]`)) continue;

    // ⭐ PICK A VALUE FROM THE DATA — present, but not on every row.
    const counts = new Map();
    for (const row of before.rows) {
      const v = (row[col] ?? "").split(/\s+/)[0];
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const candidate = [...counts.entries()].find(([, n]) => n > 0 && n < before.rows.length);
    if (!candidate) {
      // ⛔ NOT A PASS. Every row shares one value, so no filter could reduce the set and this
      // grid cannot answer the question today. Saying so beats scoring a green tick.
      r.note(`§1 ${g.label}: SKIP — every row has the same ${g.column} (${[...counts.keys()].join(",")}), so no value can narrow it. Not a pass.`);
      continue;
    }
    const [value, expected] = candidate;

    const url = `${BASE}${g.path}?${g.param}=${encodeURIComponent(value)}`;
    await page.goto(url, { waitUntil: "networkidle" });
    const after = await readGrid(page);

    // ARM 1 — it narrowed. (A filter that is IGNORED fails here.)
    // ⛔ TOTALS, NOT VISIBLE ROWS — see readGrid. On a paged grid both sides show PER_PAGE.
    const tBefore = totalOf(before), tAfter = totalOf(after);
    r.check(`§1 ${g.label}: ?${g.param}=${value} REDUCES the total`,
      tAfter < tBefore && tAfter > 0,
      `${tBefore} → ${tAfter} (from ${after.totalFrom}; expected ≈${expected} on page 1)`);

    // ARM 2 — every survivor matches. (A filter that returns junk fails here.)
    const mismatched = after.rows.filter((row) => !(row[col] ?? "").toLowerCase().includes(value.toLowerCase()));
    r.check(`§2 ${g.label}: EVERY remaining row actually has ${g.column}=${value}`,
      mismatched.length === 0,
      `${mismatched.length} row(s) do not match, e.g. "${mismatched[0]?.[col] ?? ""}"`);

    // ⛔ THE VACUITY CONTROL. Both arms above are satisfied by a filter that returns nothing.
    r.check(`§3 ${g.label}: the filtered grid is not EMPTY (zero rows is not an answer)`,
      after.rows.length > 0, `rows=${after.rows.length}`);

    r.note(`   ${g.label}: total ${totalOf(before)} → ${totalOf(after)} on ${g.param}=${value} (page shows ${before.rows.length} → ${after.rows.length})`);
  }

  // ── §4 · pagination must move the window, not re-render page 1 ───────────────────
  await page.goto(`${BASE}/admin/audit`, { waitUntil: "networkidle" });
  const p1 = await readGrid(page);
  await page.goto(`${BASE}/admin/audit?page=2`, { waitUntil: "networkidle" });
  const p2 = await readGrid(page);
  if (p1.rows.length > 0 && p2.rows.length > 0) {
    // ⚠️ Compare the ROWS, not the count — two pages of a full grid have identical counts,
    // so a `length` check would pass over a pagination that always renders page 1.
    r.check("§4 /admin/audit: ?page=2 shows a DIFFERENT window, not page 1 again",
      JSON.stringify(p1.rows[0]) !== JSON.stringify(p2.rows[0]),
      `first row identical on both pages: ${JSON.stringify(p1.rows[0] ?? []).slice(0, 90)}`);
  } else {
    r.note(`§4 SKIP — not enough audit rows to paginate (p1=${p1.rows.length} p2=${p2.rows.length}). Not a pass.`);
  }

  await ctx.close();
} finally {
  await b.close();
}

process.exit(r.done() > 0 ? 1 : 0);
