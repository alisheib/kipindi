/**
 * THE ONE COMPACTION GRAMMAR FOR MONEY — asserted at its SEAMS.
 *
 * 🔴 THE DEFECT (S-01, scan #1, 2026-08-28). `formatTzsCompact` chose its magnitude band
 * against the RAW value and rounded afterwards, so every band boundary had a window where the
 * mantissa rounded up out of its own band:
 *     999,500      → "TZS 1000K"   (should be "TZS 1.0M")
 *     999,500,000  → "TZS 1000M"   (should be "TZS 1.0B")
 *       9,999,999  → "TZS 10.0M"   (should be "TZS 10M" — the 0-dp step is at 10M)
 * "TZS 1000K" is a grammar this platform does not have, and the two most-seen numbers we
 * publish go through this helper: the landing hero's sum of open pools and /markets' open
 * volume. A sum of open pools crossing one million is an ordinary Tuesday.
 *
 * ⛔ DO NOT ASSERT THE SHAPE. `/^TZS \d+(\.\d)?[KMB]$/` matches "TZS 1000K" perfectly — the
 * defect is well-formed, which is exactly why it survived. Every check here asserts an EXACT
 * STRING at a boundary, plus a sweep that proves no mantissa can reach 1000 anywhere.
 *
 * ⚠️ AND THE DOC'S WIDTH CONTRACT WAS FALSE BEFORE THE FIX TOO (S-02). It claimed the widest
 * output is "TZS 999.9M" — a string this function cannot emit in either version, because a
 * ".9" mantissa in the M band only exists below 10M ("TZS 9.9M") and the B band is where a
 * 999.9 lands. §3 measures the real maximum instead of restating a remembered one.
 *
 * Run: npm run test:money-format
 */
const { formatTzsCompact, formatCompactNumber } = await import("../src/lib/utils.ts");

/** ⛔ The point at which the LAST band's own mantissa rounds to 1000.0 and the width contract
 *  stops holding: 999.95e9. Not 1e12 — B is unbounded above, and the honest ceiling is where
 *  the string starts growing, not a round number that happens to be near it. */
const CONTRACT_CEILING = 999_950_000_000;

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const eq = (input: number, want: string) => {
  const got = formatTzsCompact(input);
  ok(`formatTzsCompact(${input.toLocaleString("en-US")}) === ${JSON.stringify(want)}`, got === want, got === want ? "" : `got ${JSON.stringify(got)}`);
};

console.log("Money compaction grammar\n");

// ── 1 · THE SEAMS — every band boundary, both sides ──────────────────────────
{
  eq(0, "TZS 0");
  eq(999, "TZS 999");
  eq(1_000, "TZS 1K");
  eq(1_499, "TZS 1K");
  eq(1_500, "TZS 2K");

  // 🔴 K → M. The window that printed "TZS 1000K".
  eq(999_499, "TZS 999K");
  eq(999_500, "TZS 1.0M");
  eq(999_999, "TZS 1.0M");
  eq(1_000_000, "TZS 1.0M");

  // 🔴 The 1-dp → 0-dp step inside M. The scan did not name this one; it is the same
  // defect at a third seam, because `toFixed(abs >= 10_000_000 ? 0 : 1)` also asked the
  // RAW value. 9,999,999 printed "TZS 10.0M" while 10,000,000 printed "TZS 10M".
  eq(9_949_999, "TZS 9.9M");
  eq(9_950_000, "TZS 10M");
  eq(9_999_999, "TZS 10M");
  eq(10_000_000, "TZS 10M");

  // 🔴 M → B. The window that printed "TZS 1000M".
  eq(999_499_999, "TZS 999M");
  eq(999_500_000, "TZS 1.0B");
  eq(999_999_999, "TZS 1.0B");
  eq(1_000_000_000, "TZS 1.0B");

  // Negatives carry U+2212, and promote at the same magnitudes.
  eq(-999_500, "TZS −1.0M");
  eq(-999_500_000, "TZS −1.0B");
  ok("the minus is U+2212, never a hyphen", formatTzsCompact(-5_000) === "TZS −5K", formatTzsCompact(-5_000));
}

// ── 2 · THE SWEEP — no mantissa may reach 1000, anywhere ─────────────────────
/**
 * ⭐ THE CHECK THAT WOULD HAVE CAUGHT THIS WITHOUT KNOWING WHERE TO LOOK. The seam tests
 * above encode the three windows someone already found; this one states the INVARIANT — a
 * compaction whose mantissa reaches 1000 has failed to compact — and holds it over the whole
 * reachable range. It is what makes a fourth seam, if one is ever introduced, fail loudly.
 */
{
  const offenders: string[] = [];
  const probe = (n: number) => {
    const s = formatTzsCompact(n);
    const m = s.match(/^TZS −?(\d+(?:\.\d)?)([KMB])?$/);
    if (!m) { offenders.push(`${n} → ${s} (not the grammar)`); return; }
    if (m[2] && Number(m[1]) >= 1000) offenders.push(`${n} → ${s}`);
  };
  // Every band edge ±, plus a decade walk, plus the exact rounding windows.
  let probed = 0;
  const sweep = (n: number) => { if (Math.abs(n) < CONTRACT_CEILING) { probed++; probe(n); } };
  for (const base of [1e3, 1e6, 1e9]) {
    for (let d = -600; d <= 600; d++) { sweep(base + d); sweep(base * 999 + d); sweep(-(base + d)); }
  }
  for (let e = 0; e <= 12; e++) for (const k of [1, 1.5, 2, 5, 9, 9.9, 9.99, 9.999]) sweep(Math.round(10 ** e * k));
  ok("2: ⭐ no value in the contract's domain compacts to a mantissa of 1000 or more",
     offenders.length === 0, offenders.slice(0, 5).join(" · "));
  ok("2: …and the sweep actually probed something", probed > 5_000, `${probed} values`);

  /* ⛔ THE CEILING IS ASSERTED, NOT ASSUMED. B is the last band, so past the point where its
   * own mantissa rounds to 1000.0 the string grows a character per decade. Leaving that
   * undocumented would make §2 look like a universal law that a big enough number quietly
   * breaks; asserting it turns the edge into a recorded fact with a named boundary. */
  ok("2: ⛔ …and the last band's ceiling is where the doc says it is",
     formatTzsCompact(CONTRACT_CEILING - 50_000_000) === "TZS 999.9B" &&
     formatTzsCompact(CONTRACT_CEILING) === "TZS 1000.0B",
     `${formatTzsCompact(CONTRACT_CEILING - 50_000_000)} then ${formatTzsCompact(CONTRACT_CEILING)}`);
}

// ── 3 · THE WIDTH CONTRACT — MEASURED, not remembered (S-02) ─────────────────
/**
 * globals.css sizes `.kp-proof__num`'s type ladder against a hardcoded character count, and
 * ⛔ forbids `white-space: nowrap` as a remedy — so a string wider than the assumed maximum
 * does not clip, it WRAPS the money figure onto two lines on the landing hero. The doc block
 * in utils.ts states the maximum; if the two disagree the type ladder is sized against a
 * fiction. This measures it rather than trusting either.
 */
{
  let widest = "", widestNeg = "";
  const consider = (n: number) => {
    const s = formatTzsCompact(n);
    if (n >= 0 && s.length > widest.length) widest = s;
    if (n < 0 && s.length > widestNeg.length) widestNeg = s;
  };
  // ⛔ Bounded to the DOMAIN THE CONTRACT CLAIMS (|v| < 1e12). B is the last band, so above
  // 999.5e9 it keeps growing — stated in the doc block rather than hidden, and asserted below
  // so the boundary is recorded instead of discovered.
  for (let e = 0; e <= 12; e++) {
    for (const k of [1, 1.1, 2, 5, 9, 9.9, 9.99, 9.999, 9.9999]) {
      const v = Math.round(10 ** e * k);
      if (v >= CONTRACT_CEILING) continue;
      consider(v); consider(-v);
    }
  }
  ok("3: the widest POSITIVE output is 10 characters", widest.length === 10, `${JSON.stringify(widest)} (${widest.length})`);
  ok("3: …and it is a B-band figure, not the M-band string the doc used to claim",
     /B$/.test(widest), widest);
  ok("3: the widest SIGNED output is 11 characters", widestNeg.length === 11, `${JSON.stringify(widestNeg)} (${widestNeg.length})`);

  /* ⛔ THE DOC AND THE FUNCTION ARE RECONCILED, not spot-checked for a forbidden string.
   *
   * The obvious check — "the doc must not contain 'TZS 999.9M'" — is the wrong shape twice
   * over: it would forbid RECORDING the old false claim (which is worth keeping, since the
   * type ladder in globals.css was sized against it), and it would pass over any OTHER
   * unemittable exemplar someone writes next.
   *
   * ⭐ SO THE TEST IS EMITTABILITY. The doc names two exemplar strings; each must be a string
   * this function can actually produce, and its length must equal the measured maximum. That
   * is precisely what the old contract failed — "TZS 999.9M" was well-formed, plausible, and
   * unreachable in every version of this function.
   */
  const { readFileSync } = await import("node:fs");
  const utils = readFileSync(new URL("../src/lib/utils.ts", import.meta.url), "utf8");
  const claimed = [...utils.matchAll(/widest (positive|signed)\s+—\s+"([^"]+)"\s+(\d+) characters/g)]
    .map((m) => ({ kind: m[1], text: m[2], count: Number(m[3]) }));

  ok("3: the doc block states both maxima in the form this check reads",
     claimed.length === 2, `${claimed.length} found — the contract lines have drifted from the doc`);

  // Is each claimed exemplar a string this function can actually emit?
  const emittable = new Set<string>();
  for (let e = 0; e <= 12; e++) {
    for (let k = 1; k < 10; k += 0.0001) {
      const v = Math.round(10 ** e * k);
      if (v >= CONTRACT_CEILING) break;
      emittable.add(formatTzsCompact(v));
      emittable.add(formatTzsCompact(-v));
    }
  }
  for (const c of claimed) {
    ok(`3: ⭐ the doc's ${c.kind} exemplar ${JSON.stringify(c.text)} is a string this function can EMIT`,
       emittable.has(c.text),
       "unreachable — exactly the defect the old 'TZS 999.9M' contract had");
    ok(`3: …and its stated character count is right`, c.text.length === c.count,
       `${c.text.length} vs ${c.count}`);
    const measured = c.kind === "signed" ? widestNeg.length : widest.length;
    ok(`3: …and it matches the MEASURED ${c.kind} maximum`, c.count === measured,
       `doc says ${c.count}, measured ${measured}`);
  }
}

// ── 4 · THE UNIT-FREE SIBLING — same bands, no currency (S-14) ───────────────
/**
 * utils.ts's own doc asked for this rather than a quiet edit: four other sites compacted
 * numbers with their own thresholds and two were lowercase "k". They render axis ticks and
 * dial detents, not money, so they must NOT gain a "TZS " prefix — but they must not disagree
 * about where a thousand becomes a K either. Same bands, same rounding, no unit.
 */
{
  const f = formatCompactNumber;
  ok("4: the sibling shares the K→M seam", f(999_500) === "1.0M", f(999_500));
  ok("4: …and the M→B seam", f(999_500_000) === "1.0B", f(999_500_000));
  ok("4: …and the 0-dp step at 10M", f(9_999_999) === "10M", f(9_999_999));
  ok("4: it emits NO currency prefix", !f(1_500_000).includes("TZS"), f(1_500_000));
  ok("4: ⛔ K is UPPERCASE — lowercase 'k' is not this grammar", f(17_000) === "17K", f(17_000));
  ok("4: negatives carry U+2212, not an ASCII hyphen", f(-17_000) === "−17K", f(-17_000));
  ok("4: small values keep their digits instead of collapsing to '0k'", f(400) === "400", f(400));
  ok("4: an explicit plus is available for signed axes", f(400, { explicitPlus: true }) === "+400", f(400, { explicitPlus: true }));
  ok("4: …and zero takes no sign", f(0, { explicitPlus: true }) === "0", f(0, { explicitPlus: true }));
  // The sub-1 tick precision branch (finding A4) must survive the promotion out of admin-charts.
  ok("4: sub-1 ticks keep enough decimals that two ticks cannot collapse",
     f(0.25, { step: 0.05 }) === "0.25", f(0.25, { step: 0.05 }));
  ok("4: …and a step of 0 or more than 1 does not trigger it", f(2, { step: 5 }) === "2", f(2, { step: 5 }));
}

console.log(`\nmoney-format: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
