/**
 * A4 · THE CAPTION BESIDE THE MONEY — executed, and tied back to a fee really charged.
 *
 *   npx tsx scripts/fee-model-caption.test.mts     (npm run test:fee-model-caption)
 *
 * ⭐ THE DEFECT THIS EXISTS FOR. `/admin/updown` priced its "Fee · balanced 10,000" tile
 * through the real `poolFee` and captioned it with the LITERAL string
 * `"capped-commission 13%"`. When A2 moved Up & Down to `loser-share` on 2026-08-14 the
 * VALUE moved (1,300 → 650) and the caption could not. The tile then showed a correct
 * number under a retired law — the worse of the two lies, because an operator who checks
 * the arithmetic finds it sound and trusts the label.
 *
 * A second, quieter half: the tile read `cfg.defaultRateProfile`, which is what a NEW
 * chain would freeze. All 16 live chains carry their OWN `rateProfile` and do NOT inherit,
 * so a console reading the default alone cannot see the exact half-migrated state A2 had
 * to be driven out of — default moved, chains not.
 *
 *   §1 `describeFeeModel` resolves the model by the SAME rule `poolFee` does, including
 *      the absent-field case every pre-2026-07-23 snapshot carries
 *   §2 the rate the caption QUOTES is the rate `poolFee` actually charged — computed
 *      independently here from a fee that really came out of the fee function
 *   §3 a chain does NOT inherit the default, so a split board is visible
 *   §4 the live admin tile derives its caption rather than stating one
 *   §5 ⚠️ POSITIVE CONTROL, same run — the §4 checker REJECTS the exact pre-fix source
 *
 * ⚠️ §4 fails loudly when its anchor is gone. A guard whose anchor has gone stale is an
 * ABSENT guard, not a failing one; it must never be able to pass by finding nothing.
 *
 * RED harness: `node scripts/fee-model-caption-red.mjs`.
 */
import { readFileSync } from "node:fs";
import { poolFee, describeFeeModel, resolveFeeModel, MAX_LOSER_SHARE_RATE, FEE_CAPTION_MAX_CHARS } from "../src/lib/payout.ts";
import { rateProfileOf, boardFeeSummary, DEFAULT_UPDOWN_CONFIG } from "../src/lib/server/updown-config.ts";
import type { UpDownConfig } from "../src/lib/server/updown-config.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

// The two profiles that exist on this platform, written out rather than imported, so a
// change to the shipped default cannot quietly redefine what this file is testing.
const LOSER_SHARE = { feeModel: "loser-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, feeCeilingRate: 1 / 3 };
const CAPPED = { feeModel: "capped-commission" as const, commissionRate: 0.13, feeCeilingRate: 1 / 3 };
/** A pre-2026-07-23 snapshot: no `feeModel` field at all. */
const LEGACY_BARE = { commissionRate: 0.10, feeCeilingRate: 1 / 3 };

// ── §1 · the caption resolves the model exactly as the arithmetic does ────────
console.log("\n§1 · the model named is the model charged");

for (const [name, rates, expected] of [
  ["loser-share profile", LOSER_SHARE, "loser-share"],
  ["capped-commission profile", CAPPED, "capped-commission"],
  ["a bare legacy snapshot with NO feeModel", LEGACY_BARE, "capped-commission"],
  ["undefined rates", undefined, "capped-commission"],
] as const) {
  const d = describeFeeModel(rates);
  ok(`1.${name} → ${expected}`, d.model === expected, d.model);
  ok(`1.${name} · resolveFeeModel agrees`, resolveFeeModel(rates) === d.model, `${resolveFeeModel(rates)} vs ${d.model}`);
}

// ⛔ The one that matters: an absent `feeModel` must NOT be read as "no model". A call
// site testing `rates.feeModel === "loser-share"` gets `false` here and is right by luck;
// one testing `rates.feeModel === "capped-commission"` gets `false` and is WRONG. The
// caption must name the legacy model for a snapshot that never carried a name.
ok("1.★ a legacy snapshot is CAPTIONED, not left blank",
   describeFeeModel(LEGACY_BARE).caption.includes("capped"), describeFeeModel(LEGACY_BARE).caption);

// ── §2 · the quoted rate ties out to a fee poolFee really charged ─────────────
console.log("\n§2 · the caption's percentage is the money");

/** Pull every percentage out of a caption, as fractions. */
const quoted = (caption: string) => [...caption.matchAll(/([\d.]+)%/g)].map((m) => Number(m[1]) / 100);

{
  // A deliberately UNBALANCED pool, so a caption that happened to be right only on a
  // balanced one is caught. YES wins ⇒ NO (30,000) is the losing pool.
  const yes = 70_000, no = 30_000;
  const f = poolFee(yes, no, LOSER_SHARE, "YES");
  const [rate] = quoted(describeFeeModel(LOSER_SHARE).caption);
  ok("2.1 · loser-share caption quotes ONE rate", quoted(describeFeeModel(LOSER_SHARE).caption).length === 1,
     describeFeeModel(LOSER_SHARE).caption);
  ok("2.2 · ★ quoted rate × the LOSING pool == the fee poolFee charged",
     Math.abs(rate * no - f.fee) < 1e-9, `${rate} × ${no} = ${rate * no} vs fee ${f.fee}`);
  ok("2.3 · …and it is not accidentally the rate on the whole pool",
     Math.abs(rate * (yes + no) - f.fee) > 1, `${rate * (yes + no)} vs ${f.fee}`);
  ok("2.4 · the caption NAMES the model — the half that was hardcoded and wrong",
     describeFeeModel(LOSER_SHARE).caption.includes("loser-share"),
     describeFeeModel(LOSER_SHARE).caption);
}

{
  const yes = 70_000, no = 30_000;
  const f = poolFee(yes, no, CAPPED, "YES");
  const [commissionRate, ceilingRate] = quoted(describeFeeModel(CAPPED).caption);
  ok("2.5 · capped caption quotes TWO rates — the commission and the cap",
     quoted(describeFeeModel(CAPPED).caption).length === 2, describeFeeModel(CAPPED).caption);
  ok("2.6 · ★ quoted commission × pool == the commission poolFee computed — EXACTLY",
     Math.abs(commissionRate * (yes + no) - f.commission) < 1e-9, `${commissionRate * (yes + no)} vs ${f.commission}`);

  // ⚠️ THE CEILING IS ⅓, AND NO DECIMAL CAPTION CAN STATE ⅓ EXACTLY. The caption rounds
  // to two decimal places, so it promises the reader a figure good to ±0.005 percentage
  // points and no better — on a 30,000 smaller side that is ±1.5 TZS ("33.33%" gives
  // 9,999 against a true ceiling of 10,000). The tolerance below IS that promise written
  // down; it is not slack. ⛔ It must never be widened to cover a rate that is exactly
  // representable — 2.6 and 2.2 are held to 1e-9 for precisely that reason, and the rates
  // this platform actually charges (13%, 3% + 10%) are all in that exact set.
  const CAPTION_PRECISION = 5e-5; // half of the last printed decimal place, as a fraction
  const smaller = Math.min(yes, no);
  ok("2.7 · ★ quoted cap × the smaller side == the ceiling, to the caption's own precision",
     Math.abs(ceilingRate * smaller - f.ceiling) <= CAPTION_PRECISION * smaller,
     `${ceilingRate * smaller} vs ${f.ceiling} (tolerance ${CAPTION_PRECISION * smaller})`);
  ok("2.7b · …and that tolerance is TIGHT — a 1% drift in the quoted cap would be caught",
     Math.abs((ceilingRate + 0.01) * smaller - f.ceiling) > CAPTION_PRECISION * smaller,
     `${(ceilingRate + 0.01) * smaller} vs ${f.ceiling}`);
}

{
  // The clamp is part of the arithmetic, so it must be part of the caption. An operator
  // typing 60% + 60% is charged 100% of the losing side, and must be told 100%.
  const over = { feeModel: "loser-share" as const, platformFeeRate: 0.6, operatorFeeRate: 0.6, feeCeilingRate: 1 / 3 };
  const f = poolFee(50_000, 50_000, over, "YES");
  const [rate] = quoted(describeFeeModel(over).caption);
  ok("2.8 · ★ the caption is clamped exactly as the fee is",
     Math.abs(rate * 50_000 - f.fee) < 1e-9 && rate === MAX_LOSER_SHARE_RATE,
     `caption ${rate} · fee ${f.fee} · max ${MAX_LOSER_SHARE_RATE}`);
}

// ── §3 · a chain does NOT inherit the default ────────────────────────────────
console.log("\n§3 · the split a default-only console cannot see");

{
  const cfg = { ...DEFAULT_UPDOWN_CONFIG, defaultRateProfile: { ...LOSER_SHARE } } as UpDownConfig;
  const migrated = { rateProfile: { ...LOSER_SHARE } as Record<string, unknown> };
  const stranded = { rateProfile: { ...CAPPED } as Record<string, unknown> };
  const inheriting = { rateProfile: null };

  ok("3.1 · a chain with its own profile keeps it",
     resolveFeeModel(rateProfileOf(stranded, cfg)) === "capped-commission",
     resolveFeeModel(rateProfileOf(stranded, cfg)));
  ok("3.2 · …even though the DEFAULT has already moved",
     resolveFeeModel(cfg.defaultRateProfile) === "loser-share",
     resolveFeeModel(cfg.defaultRateProfile));
  ok("3.3 · a NULL profile inherits the default",
     resolveFeeModel(rateProfileOf(inheriting, cfg)) === "loser-share",
     resolveFeeModel(rateProfileOf(inheriting, cfg)));

  // ★ The exact half-migrated state A2 had to be driven out of: default moved, one chain
  // not. This is what the console must be able to SEE — the tile that read the default
  // alone rendered it as a clean, single-law board.
  const half = boardFeeSummary([migrated, stranded], cfg);
  ok("3.4 · ★ default moved + one chain stranded == a SPLIT board", half.split === true, half.caption);
  ok("3.5 · …and the caption NAMES both laws", half.caption.includes("loser-share") && half.caption.includes("capped"), half.caption);
  ok("3.6 · …and a split prices through the DEFAULT — the one profile that can be named",
     resolveFeeModel(half.profile) === "loser-share", resolveFeeModel(half.profile));

  const done = boardFeeSummary([migrated, inheriting], cfg);
  ok("3.7 · a fully migrated board is NOT flagged as split", done.split === false, done.caption);
  ok("3.8 · …and captions the live law and its rate", done.caption === "loser-share 13%", done.caption);

  // ⚠️ THE LATENT SPLIT. A STOPPED chain still carries its profile and freezes it onto
  // the first round an operator restarts it with. It counts.
  const beforeA2 = { ...DEFAULT_UPDOWN_CONFIG, defaultRateProfile: { ...CAPPED } } as UpDownConfig;
  ok("3.9 · a board entirely on the old model reads as capped, not as split",
     boardFeeSummary([stranded, stranded], beforeA2).split === false,
     boardFeeSummary([stranded, stranded], beforeA2).caption);

  // ⛔ AND THE OTHER HALF-DONE ORDER: chains migrated, default left behind. The next
  // chain an operator creates would freeze the retired model. Also a split.
  const chainsAhead = boardFeeSummary([migrated, migrated], beforeA2);
  ok("3.10 · ★ chains migrated but the DEFAULT left behind is a split too", chainsAhead.split === true, chainsAhead.caption);

  ok("3.11 · a board with no chains at all falls back to the default, without claiming a split",
     boardFeeSummary([], cfg).split === false && boardFeeSummary([], cfg).caption === "loser-share 13%",
     boardFeeSummary([], cfg).caption);
}

// ── §4 · the live admin tile derives its caption ─────────────────────────────
console.log("\n§4 · the tile on /admin/updown");

const FEE_TILE_LABEL = 'label="Fee · balanced 10,000"';

/**
 * Read the fee tile's `delta` prop out of a page source.
 * Returns `null` when the tile cannot be found — which §4 treats as a FAILURE, never as
 * a pass. A checker that reports "clean" because it found nothing to check is the
 * absent-guard shape this suite exists to avoid.
 */
function feeTileDelta(src: string): string | null {
  const at = src.indexOf(FEE_TILE_LABEL);
  if (at < 0) return null;
  const open = src.lastIndexOf("<AdminKpi", at);
  if (open < 0) return null;
  const close = src.indexOf("/>", at);
  if (close < 0) return null;
  const el = src.slice(open, close);
  const m = el.match(/delta=(\{[^}]*\}|"[^"]*")/);
  return m ? m[1] : null;
}

/** The rule: a fee caption may not be a string sitting in the JSX. */
function captionIsDerived(delta: string): boolean {
  if (!delta.startsWith("{")) return false;            // delta="…"  — a bare literal
  const inner = delta.slice(1, -1).trim();
  if (/^["'`]/.test(inner)) return false;              // delta={"…"} — the obvious dodge
  return true;
}

{
  const src = readFileSync(new URL("../src/app/admin/updown/page.tsx", import.meta.url), "utf8");
  const delta = feeTileDelta(src);
  ok("4.1 · the fee tile is still findable — ⚠️ a red here means RE-ANCHOR, not relax",
     delta !== null, delta === null ? `anchor ${FEE_TILE_LABEL} not found in /admin/updown/page.tsx` : delta);
  if (delta !== null) {
    ok("4.2 · ★ its caption is DERIVED, not stated", captionIsDerived(delta), delta);

    // ⛔ THE SECOND HALF OF THE DEFECT. "Derived" is not enough: the pre-A4 tile derived
    // its VALUE too, from `cfg.defaultRateProfile` — a profile no live chain reads. Follow
    // the identifier in the delta prop back to the tested reducer, and check the fee
    // preview is priced through the SAME summary. ⚠️ A red here means the wiring was
    // renamed: RE-ANCHOR it, never delete the assertion.
    const root = delta.slice(1, -1).trim().split(/[.\s([]/)[0];
    ok("4.4 · …by the tested reducer, from every chain — not by arithmetic in the JSX",
       new RegExp(`const\\s+${root}\\s*=\\s*boardFeeSummary\\(\\s*chains\\s*,`).test(src), `${root} = boardFeeSummary(chains, …) ?`);
    ok("4.5 · ★ and the FEE PREVIEW is priced through that same summary, not the bare default",
       new RegExp(`poolFee\\([^;]*\\b${root}\\.profile\\b`).test(src), `poolFee(… ${root}.profile …) ?`);
  }
  ok("4.3 · the retired model name appears nowhere as a rendered literal",
     !/delta=("[^"]*(capped-commission|loser-share)[^"]*"|\{\s*["'`][^"'`]*(capped-commission|loser-share)[^"'`]*["'`]\s*\})/.test(src),
     "a delta prop states a fee model as a literal");
}

// ── §5 · POSITIVE CONTROL, in the same run ───────────────────────────────────
console.log("\n§5 · the checker can say no");

{
  // Verbatim, as it stood at ba851514 — the line this whole file exists because of.
  const PRE_FIX = `          <AdminKpi label="Fee · balanced 10,000" sw="Ada" value={formatTzs(Math.round(feePreview.fee))} delta="capped-commission 13%" spark={false} />`;
  const d = feeTileDelta(PRE_FIX);
  ok("5.1 · the checker FINDS the tile in the pre-fix source", d !== null, String(d));
  ok("5.2 · ★ …and REJECTS it", d !== null && !captionIsDerived(d), String(d));

  const DODGE = `<AdminKpi label="Fee · balanced 10,000" delta={"capped-commission 13%"} />`;
  const d2 = feeTileDelta(DODGE);
  ok("5.3 · ★ a braced string literal is rejected too", d2 !== null && !captionIsDerived(d2), String(d2));

  const GOOD = `<AdminKpi label="Fee · balanced 10,000" delta={feeCaption} />`;
  const d3 = feeTileDelta(GOOD);
  ok("5.4 · …and a derived caption is ACCEPTED — so 4.2 is not passing by never accepting",
     d3 !== null && captionIsDerived(d3), String(d3));

  ok("5.5 · a source with no tile at all returns null, never a silent pass",
     feeTileDelta("const x = 1;") === null, String(feeTileDelta("const x = 1;")));
}

// ── §6 · the caption has to FIT, not merely be right ────────────────────────
console.log("\n§6 · a correct caption an operator cannot read is still a defect");

{
  // 🔴 MEASURED ON PRODUCTION, NOT CHOSEN. `loser-share · 13% of losers` (27 chars) shipped
  // and was ELLIPSISED at exactly 1024px — the `lg` breakpoint where the KPI row goes 4-up.
  // `qa:admin-updown-widths` read the chip: a 144px box against 210px of content, 7.24px per
  // character, so ~19 rendered characters fit and `AdminKpi` spends 2 on its direction glyph.
  // ⛔ Clipping INSIDE a card never reaches `document.scrollWidth`, so no page-level overflow
  // check can ever see this. Only a per-element read finds it — which is why it is asserted
  // here, on the string, where it costs nothing to keep checking.
  for (const [name, rates] of [
    ["loser-share", LOSER_SHARE],
    ["capped-commission", CAPPED],
    ["a bare legacy snapshot", LEGACY_BARE],
    ["undefined rates", undefined],
  ] as const) {
    const c = describeFeeModel(rates).caption;
    ok(`6.${name} fits the 1024px tile (≤ ${FEE_CAPTION_MAX_CHARS} chars)`,
       c.length <= FEE_CAPTION_MAX_CHARS, `${c.length} chars: "${c}"`);
  }

  // ⭐ AND THE BUDGET IS NOT VACUOUS. The string this replaced must still fail it, or a
  // future edit could restore the prose and this section would wave it through.
  ok("6.★ the ELLIPSISED original would still be rejected",
     "loser-share · 13% of losers".length > FEE_CAPTION_MAX_CHARS,
     `${"loser-share · 13% of losers".length} > ${FEE_CAPTION_MAX_CHARS}`);

  // A pathological operator rate must not blow the budget either — 100% is the clamp.
  const maxed = { feeModel: "loser-share" as const, platformFeeRate: 0.6, operatorFeeRate: 0.6, feeCeilingRate: 1 / 3 };
  ok("6.★★ …and it still fits at the maximum rate an operator can configure",
     describeFeeModel(maxed).caption.length <= FEE_CAPTION_MAX_CHARS,
     `"${describeFeeModel(maxed).caption}"`);
}

console.log(`\nfee-model-caption: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
