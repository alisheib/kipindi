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
 *   §6 the caption has to FIT the tile it is rendered in — a measured character budget
 *   §7 ⭐ the /admin/config FEE SIMULATOR, RENDERED under both models — no retired
 *      `capped-commission` vocabulary may reach an officer on a `loser-share` platform
 *
 * ⚠️ §4 fails loudly when its anchor is gone. A guard whose anchor has gone stale is an
 * ABSENT guard, not a failing one; it must never be able to pass by finding nothing.
 *
 * RED harness: `node scripts/fee-model-caption-red.mjs`.
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FeeSimulator, SIM_PRESETS, simulateStakeShare } from "../src/app/admin/config/fee-simulator.tsx";
import { formatTzs } from "../src/lib/utils.ts";
import { poolFee, describeFeeModel, resolveFeeModel, settledPayoutFor, worstCaseWinnerRatio, MAX_LOSER_SHARE_RATE, FEE_CAPTION_MAX_CHARS } from "../src/lib/payout.ts";
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
/** FEE-TAX-2026-10 · the decided law (not in force until release R5): 3% + 10% of EVERY stake, a 15% winnings tax. */
const STAKE_SHARE = { feeModel: "stake-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15, feeCeilingRate: 1 / 3 };
/** …and as an Up & Down profile carries it: no tax (a round takes the platform's when it is stamped). */
const STAKE_SHARE_PROFILE = { feeModel: "stake-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, feeCeilingRate: 1 / 3 };

// ── §1 · the caption resolves the model exactly as the arithmetic does ────────
console.log("\n§1 · the model named is the model charged");

for (const [name, rates, expected] of [
  ["loser-share profile", LOSER_SHARE, "loser-share"],
  ["capped-commission profile", CAPPED, "capped-commission"],
  ["a bare legacy snapshot with NO feeModel", LEGACY_BARE, "capped-commission"],
  ["undefined rates", undefined, "capped-commission"],
  ["stake-share rates (FEE-TAX-2026-10)", STAKE_SHARE, "stake-share"],
  ["a stake-share PROFILE, which carries no tax", STAKE_SHARE_PROFILE, "stake-share"],
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

{
  // FEE-TAX-2026-10 · the stake-share caption's rate is a share of EVERY stake — on an unbalanced book, so a caption that
  // quoted the losing side's rate (or a loser-share caption over the new law) is caught. The tax is NOT in the fee.
  const yes = 70_000, no = 30_000;
  const f = poolFee(yes, no, STAKE_SHARE, "YES");
  const caption = describeFeeModel(STAKE_SHARE).caption;
  const [rate] = quoted(caption);
  ok("2.9 · stake-share caption quotes ONE rate, and says of what: \"13% of stakes\"", quoted(caption).length === 1 && caption === "13% of stakes", caption);
  ok("2.10 · ★ quoted rate × EVERY stake == the fee poolFee charged — 13% of 100,000 = 13,000 — and the tax stands beside it",
     Math.abs(rate * (yes + no) - f.fee) < 1e-9 && typeof f.winningsTax === "number" && f.winningsTax > 0, `${rate * (yes + no)} vs fee ${f.fee} · tax ${f.winningsTax}`);
  ok("2.11 · …and it is not the rate of the losing side alone", Math.abs(rate * no - f.fee) > 1, `${rate * no} vs ${f.fee}`);
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

  // ⛔ FEE-TAX-2026-10 · the split caption used to map every model that was not loser-share to "capped" — so a board
  // half-moved to stake-share would have been captioned with a law no chain runs.
  const moving = boardFeeSummary([migrated, { rateProfile: { ...STAKE_SHARE_PROFILE } as Record<string, unknown> }], cfg);
  ok("3.12 · ★ a board split between loser-share and stake-share NAMES both — never \"capped\"",
     moving.split && moving.caption.includes("loser-share") && moving.caption.includes("stake-share") && !moving.caption.includes("capped"), moving.caption);
  const ssCfg = { ...DEFAULT_UPDOWN_CONFIG, defaultRateProfile: { ...STAKE_SHARE_PROFILE } } as UpDownConfig;
  const ssChains = [{ rateProfile: { ...STAKE_SHARE_PROFILE } as Record<string, unknown> }];
  const moved = boardFeeSummary(ssChains, ssCfg);
  ok("3.13 · a board entirely on stake-share captions its rate of every stake", !moved.split && moved.caption === "13% of stakes", moved.caption);
  // The tile prices its preview WITH a side, which needs the tax — and a profile never carries one (a round takes the
  // platform's when it is stamped). So the console lays the platform's saved tax beside it, and invents none.
  const priced = boardFeeSummary(ssChains, ssCfg, { winningsTaxRate: 0.15 });
  ok("3.14 · the priced preview of a stake-share board takes the PLATFORM's tax — 13% of a balanced 10,000 is 1,300",
     priced.profile.winningsTaxRate === 0.15 && poolFee(5_000, 5_000, priced.profile, "YES").fee === 1_300 && priced.caption === "13% of stakes",
     JSON.stringify(priced.profile));
  ok("3.15 · …and with no tax saved none is invented: the profile stays without one",
     boardFeeSummary(ssChains, ssCfg, {}).profile.winningsTaxRate === undefined && boardFeeSummary([migrated], cfg, { winningsTaxRate: 0.15 }).profile.winningsTaxRate === undefined);
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
    ["stake-share", STAKE_SHARE],
    // The longest a basis point can write: 12.75% of stakes, 16 characters.
    ["stake-share at 12.75%", { ...STAKE_SHARE, platformFeeRate: 0.0275 }],
    // The highest fee any save may freeze (MAX_STAKE_FEE_RATE).
    ["stake-share at its 30% bound", { ...STAKE_SHARE, platformFeeRate: 0.10, operatorFeeRate: 0.20 }],
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

// ── §7 · THE FEE SIMULATOR ON /admin/config — RENDERED ───────────────────────
console.log("\n§7 · the simulator an officer reads before saving a rate");

/**
 * 🔴 THE DEFECT (2026-09-08). `fee-simulator.tsx` branched its FIRST tile grid and its
 * closing paragraph on `isLoserShare` — and not the grid between them. Under the live
 * model that grid rendered two `capped-commission` sentences beside correct figures:
 *
 *   "Fee charged · min() picked the commission"
 *        `poolFee`'s loser-share arm returns `capped: false` ALWAYS, so the hint could
 *        only ever choose that half of its ternary — describing a `min()` that is not
 *        in the code path at all.
 *   "Our share of the losers' money · never exceeds 33.3%"
 *        quoting `feeCeilingRate`, which this model never reads. The real share is a
 *        FLAT 13% of the losing side.
 *
 * ⛔ Values right, law retired — §2.1's recorded class, on the one screen whose whole
 * job is to show an officer what a rate does before they save it.
 *
 * ⭐ RENDERED, NOT GREPPED, for the reason `test:admin-charts` gives: what an officer
 * reads is the output, not the characters of the source. §7.3 is the positive control
 * in the same run — the SAME sentences must still appear under `capped-commission`, or
 * §7.2 would pass by rendering nothing.
 */
{
  const cfgFor = (model: "loser-share" | "capped-commission") => ({
    feeModel: model,
    platformFeeRate: 0.03,
    operatorFeeRate: 0.10,
    commissionRate: 0.13,
    feeCeilingRate: 1 / 3,
    traTaxOnCommissionRate: 0.10,
    gbtLevyOnCommissionRate: 0.05,
  }) as unknown as Parameters<typeof FeeSimulator>[0]["config"];

  /** The vocabulary of the RETIRED model. None of it may reach a loser-share officer. */
  const CAPPED_ONLY = ["min() picked", "never exceeds", "capped — not charged", "capped at"];

  let loser = "", capped = "";
  try {
    loser = renderToStaticMarkup(createElement(FeeSimulator, { config: cfgFor("loser-share") }));
    capped = renderToStaticMarkup(createElement(FeeSimulator, { config: cfgFor("capped-commission") }));
  } catch (err) {
    // ⚠️ A render that throws must FAIL, never skip. A guard that cannot run is an
    // absent guard.
    ok("7.1 · the simulator renders — ⚠️ a red here means RE-ANCHOR, not relax", false, String((err as Error)?.message ?? err));
  }
  ok("7.1 · the simulator renders under both models", loser.length > 500 && capped.length > 500, `${loser.length} / ${capped.length} chars`);

  for (const phrase of CAPPED_ONLY) {
    ok(`7.2 · ★ loser-share render does NOT say "${phrase}"`, !loser.includes(phrase),
       loser.includes(phrase) ? "present — an officer is reading a retired law" : "absent");
  }
  // ⭐ POSITIVE CONTROL — the same strings under the model that DOES have a ceiling.
  ok("7.3 · ⭐ …and capped-commission still says them (so 7.2 is not vacuous)",
     CAPPED_ONLY.some((p) => capped.includes(p)), CAPPED_ONLY.filter((p) => capped.includes(p)).join(" · "));

  // ⛔ THE SPECIFIC RETIRED NUMBER. `feeCeilingRate` is ⅓ and this model never reads it.
  ok("7.4 · ★ the retired ⅓ ceiling figure is absent from the loser-share render",
     !loser.includes("33.3%"), "33.3% present in a loser-share render");
  ok("7.4b · ⭐ …and present under capped-commission, where it IS the law",
     capped.includes("33.3%"), "33.3% absent under capped-commission");

  // ── The caption's percentage is the money, on THIS screen too ───────────────
  // The simulator's own defaults are the reported poll: YES 300,000 / NO 10,500, YES wins,
  // so the LOSING pool is 10,500 and the fee is a flat slice of it.
  const f = poolFee(300_000, 10_500, LOSER_SHARE, "YES");
  const quotedRate = `${Number(((f.fee / 10_500) * 100).toFixed(2))}% of the losing pool`;
  ok("7.5 · ★★ the rate quoted beside the fee is fee ÷ losing pool, derived not stated",
     loser.includes(quotedRate), `expected "${quotedRate}"`);
  ok("7.6 · …and that phrase is absent under capped-commission (the branch is a branch)",
     !capped.includes("of the losing pool"), "loser-share copy leaked into the capped render");

  // ⛔ AND THE RATE MUST FOLLOW THE CONFIG, NOT THE FIXTURE. Every assertion above would
  // still pass if the hint were the LITERAL string "13% of the losing pool" — which is
  // precisely the defect §4 exists for, one screen along. Render a DIFFERENT rate and
  // require the caption to move with it.
  const OTHER = {
    feeModel: "loser-share", platformFeeRate: 0.05, operatorFeeRate: 0.20, commissionRate: 0.13,
    feeCeilingRate: 1 / 3, traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05,
  } as unknown as Parameters<typeof FeeSimulator>[0]["config"];
  const otherHtml = renderToStaticMarkup(createElement(FeeSimulator, { config: OTHER }));
  const g = poolFee(300_000, 10_500, { feeModel: "loser-share", platformFeeRate: 0.05, operatorFeeRate: 0.20, feeCeilingRate: 1 / 3 }, "YES");
  ok("7.7 · ★★ at 5%+20% the caption reads 25%, so it is DERIVED and not a literal",
     otherHtml.includes(`${Number(((g.fee / 10_500) * 100).toFixed(2))}% of the losing pool`) && !otherHtml.includes("13% of the losing pool"),
     `expected ${Number(((g.fee / 10_500) * 100).toFixed(2))}%`);

  // ── FEE-TAX-2026-10 (R2c) · the simulator under stake-share prices the law, and speaks NEITHER older law ─────────────
  // Its own arm (`simulateStakeShare`, every figure a call into the engine): F, P, T, TRA, GBT, what we keep, the winners'
  // multiple, this stake's payout, the worst case over every split and the break-even lean — the below-stake winner a
  // WARNING, never a refusal. The defect this still guards is the 2026-09-08 one, one model on: a correct-looking grid of
  // capped (or loser-share) sentences beside a law that charges neither.
  const SS_CFG = {
    feeModel: "stake-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15, commissionRate: 0.13,
    feeCeilingRate: 1 / 3, traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05,
  } as unknown as Parameters<typeof FeeSimulator>[0]["config"];
  const SS_RATES = { feeModel: "stake-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15, commissionRate: 0.13, feeCeilingRate: 1 / 3 };
  const LEVIES = { traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 };
  let ssHtml = "";
  try { ssHtml = renderToStaticMarkup(createElement(FeeSimulator, { config: SS_CFG })); }
  catch (err) { ok("7.8 · the simulator renders under stake-share", false, String((err as Error)?.message ?? err)); }
  // Its own defaults are the reported poll: YES 300,000 / NO 10,500, a 100,000 stake on YES.
  const def = simulateStakeShare({ yesPool: 300_000, noPool: 10_500, stake: 100_000, side: "YES", rates: SS_RATES, levies: LEVIES });
  ok("7.8 · ★ under stake-share it PRICES its own defaults — F, P, T, TRA, GBT, what we keep and the payout, each the engine's",
     def.ok && ssHtml.length > 500 && [def.fee, def.prizeFund, def.tax ?? -1, def.tra, def.gbt, def.netGgr, def.payout ?? -1].every((n) => ssHtml.includes(formatTzs(n))),
     def.ok ? JSON.stringify({ fee: def.fee, P: def.prizeFund, T: def.tax, tra: def.tra, gbt: def.gbt, ggr: def.netGgr, payout: def.payout }) : JSON.stringify(def));
  ok("7.9 · ★ …with NONE of the older laws' vocabulary: no min(), no ceiling, no 33.3%, no \"of the losing pool\"",
     CAPPED_ONLY.every((p) => !ssHtml.includes(p)) && !ssHtml.includes("33.3%") && !ssHtml.includes("of the losing pool"),
     CAPPED_ONLY.filter((p) => ssHtml.includes(p)).join(" · "));
  ok("7.10 · ★ the reported poll's winner is paid back less than they staked — said as a WARNING (the law), never the capped arm's \"must be impossible\"",
     def.ok && (def.ratio ?? 2) < 1 && ssHtml.includes("paid back less than they staked") && !ssHtml.includes("This must be impossible"),
     def.ok ? `ratio ${def.ratio}` : "");
  const be = 0.13 / (0.13 + 0.87 * 0.85);
  ok("7.11 · ★ the break-even lean (~14.95% of the pool on the small side) and the worst case are the engine's, and printed",
     def.ok && def.breakEven !== null && Math.abs(def.breakEven - be) < 1e-9 && ssHtml.includes(`${Number((be * 100).toFixed(2))}%`)
       && def.worst !== null && def.worst === worstCaseWinnerRatio(SS_RATES).ratio && def.worst < 1 && ssHtml.includes(`${def.worst.toFixed(3)}×`),
     def.ok ? JSON.stringify({ be: def.breakEven, worst: def.worst }) : "");

  // The document's own example (FEE-TAX-PLAN §3): YES 1,000 + 3,000 + 5,000 against NO 10,000 + 20,000 + 5,000, YES wins.
  const doc = simulateStakeShare({ yesPool: 9_000, noPool: 35_000, stake: 1_000, side: "YES", rates: SS_RATES, levies: LEVIES });
  ok("7.12 · ★★ the document's example: fee 5,720 · tax 4,568 · TRA 572 · GBT 286 · net GGR 4,862, and the prize 30,450",
     doc.ok && doc.fee === 5_720 && doc.tax === 4_568 && doc.tra === 572 && doc.gbt === 286 && doc.netGgr === 4_862 && doc.prizeFund === 30_450, JSON.stringify(doc));
  ok("7.13 · ★ …its first YES player's 1,000 is paid what the engine pays it (3,746 in the document's table), above the stake",
     doc.ok && doc.payout === settledPayoutFor({ yesPool: 9_000, noPool: 35_000, side: "YES", stake: 1_000 }, SS_RATES).payout && doc.payout === 3_746 && (doc.ratio ?? 0) > 1,
     doc.ok ? String(doc.payout) : "");
  const lop = simulateStakeShare({ yesPool: 100_000, noPool: 10_000, stake: 100_000, side: "YES", rates: SS_RATES, levies: LEVIES });
  ok("7.14 · ★ the lopsided preset (100,000 vs 10,000) pays the whole YES side 94,395 — below its stake (FEE-TAX-PLAN §3)",
     lop.ok && lop.payout === 94_395 && (lop.ratio ?? 2) < 1 && lop.winnersGet === 94_395, JSON.stringify(lop));
  ok("7.15 · the presets ARE those books (the screen's buttons set them)",
     JSON.stringify(SIM_PRESETS.map((p) => [p.yes, p.no, p.stake, p.side])) === JSON.stringify([[300_000, 10_500, 100_000, "YES"], [9_000, 35_000, 1_000, "YES"], [100_000, 10_000, 100_000, "YES"]]));
  const oneSided = simulateStakeShare({ yesPool: 50_000, noPool: 0, stake: 1_000, side: "YES", rates: SS_RATES, levies: LEVIES });
  ok("7.16 · a one-sided book under stake-share refunds: no fee, no tax, the stake back",
     oneSided.ok && oneSided.oneSided && oneSided.fee === 0 && oneSided.tax === 0 && oneSided.payout === 1_000, JSON.stringify(oneSided));
  // ⛔ No winning tax is invented: without one, the figures it decides are absent, and the fee alone is priced.
  const noTax = simulateStakeShare({ yesPool: 9_000, noPool: 35_000, stake: 1_000, side: "YES", rates: { ...SS_RATES, winningsTaxRate: undefined }, levies: LEVIES });
  ok("7.17 · ★ with no winning tax set it prices F and P, and leaves T, the payout and the worst case EMPTY (no default tax)",
     noTax.ok && noTax.fee === 5_720 && noTax.prizeFund === 30_450 && noTax.tax === null && noTax.payout === null && noTax.worst === null && noTax.breakEven === null, JSON.stringify(noTax));
  // ⛔ Never throws — the brief's line: the simulator must not fall over on its own defaults, or on anything typed.
  const odd = [
    simulateStakeShare({ yesPool: 300_000.7, noPool: 10_500.2, stake: 100_000.9, side: "YES", rates: SS_RATES, levies: LEVIES }),
    simulateStakeShare({ yesPool: 0, noPool: 0, stake: 0, side: "NO", rates: SS_RATES, levies: LEVIES }),
    simulateStakeShare({ yesPool: 1_000, noPool: 1_000, stake: 1_000, side: "YES", rates: { ...SS_RATES, platformFeeRate: 0.6, operatorFeeRate: 0.6 }, levies: LEVIES }),
    simulateStakeShare({ yesPool: 1_000, noPool: 1_000, stake: 1_000, side: "YES", rates: LOSER_SHARE, levies: LEVIES }),
  ];
  ok("7.18 · ★ typed decimals are taken to the shilling, an empty book prices zero, and rates the engine refuses come back REFUSED — nothing throws",
     odd[0].ok && odd[0].yesPool === 300_000 && odd[1].ok && odd[1].fee === 0 && !odd[2].ok && !odd[3].ok, JSON.stringify(odd));
  const noTaxCfg = { ...(SS_CFG as object), winningsTaxRate: undefined } as unknown as Parameters<typeof FeeSimulator>[0]["config"];
  let noTaxHtml = "";
  try { noTaxHtml = renderToStaticMarkup(createElement(FeeSimulator, { config: noTaxCfg })); }
  catch (err) { noTaxHtml = `THREW ${String((err as Error)?.message ?? err)}`; }
  ok("7.19 · ★ a stake-share config with NO tax saved renders (never throws) and says the payout needs one — inventing none",
     !noTaxHtml.startsWith("THREW") && noTaxHtml.includes("The payout needs a winning tax") && !noTaxHtml.includes("15%"), noTaxHtml.slice(0, 160));
  // Every law renders from the same screen, and a law other than the saved one is said to be a what-if.
  ok("7.20 · the simulator names the law it prices — the saved one — under each of the three models",
     loser.includes("Loser-share — % of the losing pool") && capped.includes("Capped commission — % of the pool, capped") && ssHtml.includes("Stake-share — % of every stake")
       && [loser, capped, ssHtml].every((h) => h.includes("The saved model.")));
}

// ── §8 · THE CAPTIONS ON THE CONFIG SCREENS — derived through describeFeeModel ───────────────────────────────
console.log("\n§8 · every fee caption on the config screens is describeFeeModel's");
{
  const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const cfg = src("src/app/admin/config/page.tsx");
  ok("8.1 · /admin/config's chip and fee-model KPI read ONE caption, from describeFeeModel — no model typed in either",
     /const feeCaption = \(\(\) => \{ try \{ return describeFeeModel\(config\)\.caption;/.test(cfg) && cfg.includes("Pari-mutuel · {feeCaption}") && /delta=\{feeCaption\}/.test(cfg)
       && !cfg.includes('"Pari-mutuel · loser-share"') && !cfg.includes('"Pari-mutuel · capped fee"'));
  const neu = src("src/app/admin/markets/new/page.tsx"), wiz = src("src/app/admin/markets/new/wizard.tsx");
  ok("8.2 · the new-market page hands the wizard describeFeeModel's caption for every model, and the wizard draws it",
     /describeFeeModel\(config\)\.caption/.test(neu) && (neu.match(/\bcaption,/g) ?? []).length === 3 && wiz.includes("{feeInfo.caption}"));
  const mkt = src("src/app/admin/markets/[id]/page.tsx");
  ok("8.3 · the market page's stake-share fee is captioned by describeFeeModel from THIS poll's frozen rates, and shows the winners' share",
     /describeFeeModel\(marketRates\)\.caption/.test(mkt) && mkt.includes("Winners share if YES wins") && mkt.includes("Winners share if NO wins"));
  const sim = src("src/app/admin/config/fee-simulator.tsx");
  ok("8.4 · the simulator prices stake-share through the engine alone (poolFee, settledPayoutFor, levySplit, the engine's sweeps) — no formula of its own",
     /export function simulateStakeShare\(/.test(sim) && ["poolFee(", "settledPayoutFor(", "levySplit(", "worstCaseWinnerRatio(", "stakeShareBreakEvenShare("].every((k) => sim.includes(k)));
  for (const [name, rates] of [["stake-share", STAKE_SHARE], ["loser-share", LOSER_SHARE], ["capped", CAPPED]] as const) {
    const c = describeFeeModel(rates).caption;
    ok(`8.5 · the ${name} caption the card's KPI shows fits it (≤ ${FEE_CAPTION_MAX_CHARS} chars)`, c.length <= FEE_CAPTION_MAX_CHARS, `${c.length}: "${c}"`);
  }
}

console.log(`\nfee-model-caption: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
