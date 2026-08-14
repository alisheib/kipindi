/**
 * A4 · RED HARNESS — the caption beside the money, and the two ways it lied.
 *
 *   node scripts/fee-model-caption-red.mjs      (npm run red:fee-model-caption)
 *
 * ⭐ MUTATION 1 IS THE PRODUCTION STATE AT `8c06517f`, verbatim: `/admin/updown` priced its
 * fee tile through the real `poolFee` and captioned it `"capped-commission 13%"` — a right
 * number under a retired law. If mutation 1 ever stops going red, the guard has drifted
 * back to checking that the tile exists rather than that its caption is derived.
 *
 * ⚠️ MUTATION 8 IS THE OTHER SHAPE. It does not introduce a defect at all — it renames the
 * tile's label, so the guard's ANCHOR goes stale. A guard whose anchor is gone is an
 * ABSENT guard, not a failing one, and it must go RED rather than quietly find nothing and
 * report clean. That is why §4.1 asserts the anchor was found before it asserts anything
 * about what it found.
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies,
 * and the harness reports "defect not caught" as guard weakness. Every mutation matches
 * both line endings AND re-reads the file to confirm the anchor is gone from disk.
 *
 * ⚠️ POSITIVE CONTROL FIRST. A refusal check needs one in the same run, or fixing the
 * defect turns the check red and nobody can tell the two apart.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const PAGE = new URL("../src/app/admin/updown/page.tsx", import.meta.url);
const UD = new URL("../src/lib/server/updown-config.ts", import.meta.url);
const PAY = new URL("../src/lib/payout.ts", import.meta.url);
const originals = new Map([[PAGE, readFileSync(PAGE, "utf8")], [UD, readFileSync(UD, "utf8")], [PAY, readFileSync(PAY, "utf8")]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try { execSync("npx tsx scripts/fee-model-caption.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
  catch { return true; }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const MUTATIONS = [
  {
    name: "caption-hardcoded",
    why: "⭐ THE ACTUAL 2026-08-14 STATE — the tile prices loser-share and captions it 'capped-commission 13%'. A correct number under a retired law",
    file: PAGE,
    from: "            delta={boardFee.caption}",
    to: '            delta="capped-commission 13%"',
  },
  {
    name: "caption-braced-string-literal",
    why: "the obvious dodge — the literal moves inside braces and a naive check for `delta={` passes it",
    file: PAGE,
    from: "            delta={boardFee.caption}",
    to: '            delta={"capped-commission 13%"}',
  },
  {
    name: "preview-priced-off-the-bare-default",
    why: "★ THE SECOND HALF. The caption stays derived but the FIGURE goes back to the default profile — which no live chain reads, and which cannot show a half-migrated board",
    file: PAGE,
    from: "  const feePreview = poolFee(FEE_PREVIEW_POOL / 2, FEE_PREVIEW_POOL / 2, boardFee.profile, \"YES\");",
    to: "  const feePreview = poolFee(FEE_PREVIEW_POOL / 2, FEE_PREVIEW_POOL / 2, cfg.defaultRateProfile, \"YES\");",
  },
  {
    name: "reducer-ignores-the-chains",
    why: "the reducer reads only the default, so a chain stranded on capped-commission is invisible — exactly what A2 had to be driven out of by hand",
    file: UD,
    from: "  const models = [...new Set([...profiles, cfg.defaultRateProfile].map(resolveFeeModel))];",
    to: "  const models = [...new Set([cfg.defaultRateProfile].map(resolveFeeModel))];",
  },
  {
    name: "reducer-ignores-the-default",
    why: "the mirror: chains migrated, default left behind. The NEXT chain an operator creates freezes the retired model and nothing says so",
    file: UD,
    from: "  const models = [...new Set([...profiles, cfg.defaultRateProfile].map(resolveFeeModel))];",
    to: "  const models = [...new Set([...profiles].map(resolveFeeModel))];",
  },
  {
    name: "caption-drops-the-clamp",
    why: "the caption quotes the raw sum while `poolFee` clamps it — an operator on 60%+60% is charged 100% of the losing side and told 120%",
    file: PAY,
    from: "    const loserRate = clamp(r.platformFeeRate + r.operatorFeeRate, 0, MAX_LOSER_SHARE_RATE);\n    return { model: r.feeModel, caption: `loser-share · ${pct(loserRate)} of losers` };",
    to: "    return { model: r.feeModel, caption: `loser-share · ${pct(r.platformFeeRate + r.operatorFeeRate)} of losers` };",
  },
  {
    name: "legacy-snapshot-captioned-as-loser-share",
    why: "the no-mix guarantee broken at the CAPTION layer — a pre-2026-07-23 snapshot with no `feeModel` gets labelled with the new law while settling by the old one",
    file: PAY,
    from: '    feeModel: rates?.feeModel === "loser-share" ? "loser-share" : "capped-commission",',
    to: '    feeModel: rates?.feeModel === "capped-commission" ? "capped-commission" : "loser-share",',
  },
  {
    name: "anchor-renamed-so-the-guard-finds-nothing",
    why: "⚠️ NOT A DEFECT — the tile's label changes and the guard's anchor goes stale. It must go RED and say RE-ANCHOR, never find nothing and report clean",
    file: PAGE,
    from: '            label="Fee · balanced 10,000"',
    to: '            label="Fee preview"',
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");
  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) { problems.push(`${m.name} — HARNESS ERROR: anchor not found`); continue; }

  writeFileSync(m.file, src.replace(anchor, anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to));
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`); continue;
  }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
