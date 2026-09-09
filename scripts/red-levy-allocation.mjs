/**
 * red:levy-allocation — proving `test:levy-allocation` can actually fail.
 *
 * ⭐ A GUARD THAT HAS NEVER GONE RED IS A GREEN LIGHT OVER AN UNREAD ROAD. Mutation 1 is the
 * PRE-FIX SOURCE VERBATIM — the arithmetic that booked a statutory levy the ledger and
 * `levySplit` disagreed about on 43 of production's 203 fee-bearing settlements. Mutations
 * 4-6 are OVER-CORRECTIONS: ways a "fix" could drift into reversing something `RULES.md`
 * records as decided (a levy is charged on OUR fee only — §2.2; a player is charged the pool
 * fee and the withdrawal fee and NOTHING else — §2.8). Mutation 7 attacks the gate's own
 * positive control: if §3 stops failing, §1 is asserting nothing and the gate has gone blind.
 *
 * ⛔ MUTATES A COPY OF `src/`, NEVER THIS CHECKOUT. Sessions share this working tree, and a
 * harness that edited files in place would leave a deliberately broken money file under
 * another session's editor — one `git add -A` away from a live real-money deploy. The copy
 * lives INSIDE the repo so `@prisma/client` still resolves, and is removed in `finally`.
 *
 * npm run red:levy-allocation
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "levy-allocation.test.mts");

const LEDGER = "src/lib/server/ledger.ts";
const PAYOUT = "src/lib/payout.ts";

/** The post-fix lines this gate exists to protect. */
const TRA_PICK = `  const traLevyAmt = opts.traLevyAmount != null
    ? Math.max(0, Math.round(opts.traLevyAmount))
    : Math.round(commAmt * opts.rates.traTaxOnCommissionRate);`;
const GBT_PICK = `  const gbtLevyAmt = opts.gbtLevyAmount != null
    ? Math.max(0, Math.round(opts.gbtLevyAmount))
    : Math.round(commAmt * opts.rates.gbtLevyOnCommissionRate);`;

const MUTATIONS = [
  {
    id: 1,
    name: "THE DEFECT, VERBATIM · ignore both pre-allocated levies and derive per winner",
    file: LEDGER,
    from: [TRA_PICK, GBT_PICK],
    to: [
      "  const traLevyAmt = Math.round(commAmt * opts.rates.traTaxOnCommissionRate);",
      "  const gbtLevyAmt = Math.round(commAmt * opts.rates.gbtLevyOnCommissionRate);",
    ],
  },
  {
    id: 2,
    name: "HALF FIX · honour the TRA share but still derive GBT (the levy that books zero)",
    file: LEDGER,
    from: [GBT_PICK],
    to: ["  const gbtLevyAmt = Math.round(commAmt * opts.rates.gbtLevyOnCommissionRate);"],
  },
  {
    id: 3,
    name: "HALF FIX · honour the GBT share but still derive TRA",
    file: LEDGER,
    from: [TRA_PICK],
    to: ["  const traLevyAmt = Math.round(commAmt * opts.rates.traTaxOnCommissionRate);"],
  },
  {
    id: 4,
    name: "OVER-CORRECTION · book a levy even when the rate is ZERO (§2.2 — levied on our fee, or not at all)",
    file: LEDGER,
    from: ["    if (traLevyAmt > 0) {"],
    to: ["    if (traLevyAmt >= 0) {"],
  },
  {
    id: 5,
    name: "OVER-CORRECTION · take the levy out of the PLAYER's payout (§2.8 — never from a player)",
    file: LEDGER,
    from: ["  const netPayout = opts.payout;"],
    to: ["  const netPayout = opts.payout - traLevyAmt - gbtLevyAmt;"],
  },
  {
    id: 6,
    name: "OVER-CORRECTION · round the allocated share UP, inventing a fraction of a shilling (§2.10 rounding)",
    file: LEDGER,
    from: ["    ? Math.max(0, Math.round(opts.gbtLevyAmount))"],
    to: ["    ? Math.max(0, Math.ceil(opts.gbtLevyAmount + 0.4))"],
  },
  {
    id: 7,
    name: "VACUITY · make largest-remainder allocation exact-by-luck, so §3's control cannot fail",
    file: PAYOUT,
    from: ["  let remainder = total - allocated; // in [0, winners.length)"],
    to: ["  let remainder = 0; // in [0, winners.length)"],
  },
];

function runGate(rootDir) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO,
    encoding: "utf8",
    env: { ...process.env, LEVY_ROOT: rootDir },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

/** ⚠️ The gate prints verdicts INDENTED (`  FAIL 2.2 · …`). `.trim()` is load-bearing —
 *  a flush-left `startsWith("FAIL")` matches nothing and reports every mutation as
 *  UNCAUGHT, which accuses a working guard of being blind. */
function failedSections(out) {
  return out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("FAIL "))
    .map((l) => l.slice(5).trim().split(/[\s·]/)[0]);
}

let tmp;
try {
  // ── The control: the gate must PASS on unmutated source, or every RED below is noise.
  const clean = runGate(REPO);
  if (clean.code !== 0) {
    console.error("CONTROL FAILED — the gate does not pass on this checkout. Fix that first.\n");
    console.error(clean.out);
    process.exit(1);
  }
  console.log("control · gate PASSES on unmutated source\n");

  let caught = 0;
  for (const m of MUTATIONS) {
    tmp = mkdtempSync(join(REPO, ".red-levy-"));
    cpSync(join(REPO, "src"), join(tmp, "src"), { recursive: true });
    const target = join(tmp, m.file);
    // ⚠️ THE SOURCE IS CRLF AND THE ANCHORS ARE LF. A multi-line needle written with `\n`
    // matches NOTHING against a CRLF file, and this harness's own "ANCHOR MISSED" line then
    // reports a live mutation as proving nothing — a red harness lying about its own reach.
    // Normalise both sides before matching; the copy is a throwaway, so rewriting it as LF
    // costs nothing and `tsx` does not care.
    let src = readFileSync(target, "utf8").split("\r\n").join("\n");
    let applied = true;
    m.from.forEach((needle, i) => {
      if (!src.includes(needle)) { applied = false; return; }
      src = src.split(needle).join(m.to[i]);
    });
    if (!applied) {
      console.log(`  ⚠️  ${m.id} · ANCHOR MISSED — the source moved; this mutation proved nothing`);
      rmSync(tmp, { recursive: true, force: true }); tmp = undefined;
      continue;
    }
    writeFileSync(target, src);
    const r = runGate(tmp);
    const red = r.code !== 0;
    if (red) caught++;
    console.log(`  ${red ? "RED " : "MISS"} ${m.id} · ${m.name}`);
    if (red) console.log(`         caught by: ${[...new Set(failedSections(r.out))].join(", ")}`);
    rmSync(tmp, { recursive: true, force: true }); tmp = undefined;
  }

  console.log(`\n${caught}/${MUTATIONS.length} mutations caught`);
  process.exit(caught === MUTATIONS.length ? 0 : 1);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
