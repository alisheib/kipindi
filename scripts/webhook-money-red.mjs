/**
 * RED HARNESS — the two silent doors on money-in.
 *
 *   node scripts/webhook-money-red.mjs        (npm run red:webhook-money)
 *
 * ⭐ MUTATIONS 1 AND 3 ARE THE PRODUCTION STATE AT `adc3718f`, VERBATIM:
 *   1 · every non-PROCESSING transaction acked as `already-<status>`, so a card
 *       chargeback or a mobile-money REVERSAL of a deposit we had already credited
 *       was indistinguishable from a provider's at-least-once retry — no audit, no
 *       ledger entry, nothing in front of an officer, repeatable.
 *   3 · `selcom` present in the generic lane's provider map, so a callback that
 *       simply omitted the `Authorization: SELCOM` header skipped the authoritative
 *       order-status re-query and settled from its own request body.
 *
 * ⚠️ MUTATION 2 IS THE OVER-CORRECTION and must go red just as loudly. If EVERY
 * terminal transaction starts returning `handled: false`, an honest provider retry
 * is answered as an error and the provider retries for ever. A guard that only fails
 * in one direction turns the next fix into an outage.
 *
 * ⚠️ CRLF-aware, and the landed-check does not demand the anchor be gone when the
 * replacement deliberately contains it.
 * ⚠️ POSITIVE CONTROL FIRST — a refusal check needs one in the same run.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const WS = new URL("../src/lib/server/wallet-service.ts", import.meta.url);
const ROUTE = new URL("../src/app/api/webhooks/payments/route.ts", import.meta.url);
const originals = new Map([[WS, readFileSync(WS, "utf8")], [ROUTE, readFileSync(ROUTE, "utf8")]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try {
    const out = execSync("npx tsx scripts/webhook-security.test.mts", { cwd: CWD, stdio: "pipe" }).toString();
    return /(?:^|\n)webhook-security: \d+ passed, [1-9]\d* failed/.test(out);
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    return /[1-9]\d* failed/.test(out) || /Error|error TS/.test(out);
  }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const MUTATIONS = [
  {
    name: "reversal-acked-as-a-duplicate",
    why: "⭐ THE ACTUAL PRE-2026-09-08 STATE — a chargeback of already-credited money returns `already-confirmed` and disappears. No audit, no needs-review row, no officer",
    file: WS,
    from: `    const contradicted =
      (txn.status === "CONFIRMED" && input.status === "FAILED") ||
      ((txn.status === "FAILED" || txn.status === "REVERSED") && input.status === "CONFIRMED");`,
    to: `    const contradicted = false;`,
  },
  {
    name: "over-correction-every-terminal-txn-refused",
    why: "⚠️ NOT THE OLD DEFECT — the mirror. An honest at-least-once retry is answered `handled:false`, so the provider never stops retrying. The positive control must catch it",
    file: WS,
    from: `    return { handled: true, reason: \`already-\${txn.status.toLowerCase()}\` };
  }`,
    to: `    return { handled: false, reason: \`already-\${txn.status.toLowerCase()}\` };
  }`,
  },
  {
    name: "selcom-restored-to-the-generic-lane",
    why: "⭐ THE OTHER PRE-FIX STATE — `X-Provider: selcom` settles a deposit from the callback body, skipping the signed order-status re-query that is the whole authority of the money-in path",
    file: ROUTE,
    from: `const KNOWN_PROVIDERS: Record<string, string> = {
  azampay: "AZAMPAY_WEBHOOK_SECRET",`,
    to: `const KNOWN_PROVIDERS: Record<string, string> = {
  selcom:  "SELCOM_WEBHOOK_SECRET",
  azampay: "AZAMPAY_WEBHOOK_SECRET",`,
  },
  {
    name: "explicit-refusal-removed",
    why: "★ the map is clean but the guard is gone — a selcom callback falls through to `unknown-provider` with no SECURITY row, so nobody learns the weaker door is being tried",
    file: ROUTE,
    from: `  if (AUTHORITATIVE_ONLY.has(provider)) {`,
    to: `  if (false && AUTHORITATIVE_ONLY.has(provider)) {`,
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
  const after = readFileSync(m.file, "utf8");
  if (after === src) { problems.push(`${m.name} — HARNESS ERROR: file unchanged after write`); continue; }
  const reinserted = m.to.replace(/\r\n/g, "\n").includes(m.from.replace(/\r\n/g, "\n"));
  if (!reinserted && after.includes(anchor)) { problems.push(`${m.name} — HARNESS ERROR: anchor still present`); continue; }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
