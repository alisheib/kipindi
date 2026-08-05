/**
 * RED PROOF for E-64 — the bet-placed toast.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. A harness in this repo once printed "✓ RED" for three
 * mutations the guard silently passed, because it only checked that the bytes moved. Every
 * mutation here must make the suite EXIT NON-ZERO *and* report ≥1 failure, and every mutation
 * is a REVERT verified byte-for-byte.
 *
 * ⚠️ `use-quick-bet.ts` IS CRLF, and CRLF has broken an anchor in this repo seven times. Every
 * anchor below is tried as written and then in its CRLF form; an anchor that matches NEITHER is
 * reported as proving nothing rather than passing quietly.
 *
 * ⭐ MUTATION 4 IS THE ONE THAT MATTERS. It restores the EXACT pre-fix code — the three quiet
 * channels with no toast — which is the state the tree was in for two sessions while the
 * finding sat "fix written, not shipped". If that mutation is ever MISSED, this guard has
 * stopped guarding E-64 whatever else it reports.
 *
 *   npm run red:updown-bet-feedback
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const FILE = "src/components/updown/use-quick-bet.ts";
const SUITE = "scripts/updown-bet-feedback.test.mts";

const TOAST_CALL = `          toast({
            title: copy.placed,
            description: \`\${side === "UP" ? copy.up : copy.down} · \${formatTzs(amount)}\`,
            variant: "success",
            durationMs: 3000,
          });`;

const MUTATIONS = [
  {
    name: "⭐ no-toast — the EXACT tree E-64 was filed against (the whole toast deleted)",
    find: TOAST_CALL,
    with: `          // Deliberately NOT a toast.`,
  },
  {
    name: "wrong-variant — it announces, but as a neutral/default chip",
    find: `            variant: "success",`,
    with: `            variant: "default",`,
  },
  {
    name: "hardcoded-english — invisible to test:i18n, ships English to SW and ZH players",
    find: `            title: copy.placed,`,
    with: `            title: "Bet placed",`,
  },
  {
    name: "no-duration — the pile-up on rapid taps returns, which is what removed it originally",
    find: `            durationMs: 3000,`,
    with: ``,
  },
  {
    name: "toast-replaces-aria-live — the sighted fix deletes the screen-reader one",
    find: `          setLiveMessage(\`\${copy.placed} · \${side === "UP" ? copy.up : copy.down} · \${formatTzs(amount)}\`);`,
    with: ``,
  },
  {
    name: "amount-dropped — the toast fires but never says how much left the wallet",
    find: `            description: \`\${side === "UP" ? copy.up : copy.down} · \${formatTzs(amount)}\`,`,
    with: `            description: side === "UP" ? copy.up : copy.down,`,
  },
  {
    name: "moved-out-of-the-success-branch — a toast on EVERY tap, success or not",
    // The precise defect a file-level `includes("toast(")` check cannot see: the symbol is
    // present, the file compiles, and the success branch is silent again.
    find: TOAST_CALL,
    with: ``,
    also: {
      find: `      } catch {`,
      with: `        toast({ title: copy.placed, description: \`\${side === "UP" ? copy.up : copy.down} · \${formatTzs(amount)}\`, variant: "success", durationMs: 3000 });
      } catch {`,
    },
  },
];

/** Try the anchor as written, then its CRLF form. Returns the form that is actually present. */
function resolve(text, needle) {
  if (text.includes(needle)) return needle;
  const crlf = needle.replace(/\n/g, "\r\n");
  if (text.includes(crlf)) return crlf;
  return null;
}

const original = readFileSync(FILE, "utf8");
const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green, or nothing below proves anything) ──");
const before = run();
console.log(`   exit=${before.status}  ${before.stdout.match(/\d+ passed, \d+ failed/)?.[0] ?? ""}`);
if (before.status !== 0) { console.error("   ✗ the suite is not green to begin with"); process.exit(2); }

let proven = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const find = resolve(original, m.find);
  if (!find) { console.error(`   ✗ ANCHOR NOT FOUND (neither LF nor CRLF) — THIS MUTATION PROVES NOTHING.`); continue; }
  let mutated = original.replace(find, m.with.replace(/\n/g, find.includes("\r\n") ? "\r\n" : "\n"));
  if (m.also) {
    const find2 = resolve(mutated, m.also.find);
    if (!find2) { console.error(`   ✗ SECOND ANCHOR NOT FOUND — THIS MUTATION PROVES NOTHING.`); writeFileSync(FILE, original, "utf8"); continue; }
    mutated = mutated.replace(find2, m.also.with.replace(/\n/g, find2.includes("\r\n") ? "\r\n" : "\n"));
  }
  if (mutated === original) { console.error(`   ✗ THE FILE DID NOT CHANGE — THIS MUTATION PROVES NOTHING.`); continue; }
  writeFileSync(FILE, mutated, "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const failed = Number(out.match(/^updown-bet-feedback: (\d+) passed, (\d+) failed$/m)?.[2] ?? 0);
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const line of out.split(/\r?\n/).filter((l) => l.includes("FAIL")).slice(0, 3)) console.log(`     ${line.trim()}`);
  writeFileSync(FILE, original, "utf8");
  if (readFileSync(FILE, "utf8") !== original) { console.error("   🔴 REVERT FAILED — stop and restore by hand"); process.exit(2); }
  if (caught) proven++;
}

console.log(`\n${proven}/${MUTATIONS.length} mutations caught — file restored byte-for-byte.`);
process.exit(proven === MUTATIONS.length ? 0 : 1);
