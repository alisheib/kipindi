/**
 * MUTATIONS for `npm run red:webhook-money` — the RED proof of `scripts/webhook-security.test.mts`.
 *
 * ⛔ WHY THIS FILE EXISTS. `test:red-anchors` §4 is an equality ratchet on how many red harnesses
 * do NOT declare their anchors, and its own header states that raising it is the one edit that
 * file forbids. This harness arrived undeclared on 2026-09-08 and pushed the count past the
 * ceiling; the answer is a declaration, not a bump. Moving the cases here puts every anchor under
 * §3's static audit, which is the only thing that notices a `from` string rotting out from under a
 * harness that still prints a cheerful verdict.
 *
 * ⚠️ `file` WAS A `URL` AND IS NOW A REPO-RELATIVE STRING. That is not cosmetic: the auditor
 * resolves `${ROOT}/${m.file}`, and a `URL` stringifies to `file:///F:/…`, which resolves to
 * nothing on any machine. The harness converts back to a `URL` at its one call site. The audit's
 * own header names this exact drift — *"four different shapes (`from`/`to`, `find`/`with`, `file`
 * as a `URL`, `file` as a string)"* — as the reason it refuses to guess at undeclared harnesses.
 *
 * ⛔ THESE ANCHORS POINT INTO `src/lib/server/wallet-service.ts`, THE PLATFORM'S MOST ACTIVE MONEY
 * FILE. On 2026-09-09 a sibling harness's anchor into that file rotted TWICE IN ONE HOUR while the
 * MONEY GATE work threaded a transaction through it. If a case here stops resolving, the fix is to
 * re-anchor it against the current source — never to weaken the anchor into something short enough
 * that it cannot rot, because a short anchor matches twice and injects into the wrong site.
 */
export const MUTATIONS = [
  {
    name: "reversal-acked-as-a-duplicate",
    why: "⭐ THE ACTUAL PRE-2026-09-08 STATE — a chargeback of already-credited money returns `already-confirmed` and disappears. No audit, no needs-review row, no officer",
    file: "src/lib/server/wallet-service.ts",
    from: `    const contradicted =
      (txn.status === "CONFIRMED" && input.status === "FAILED") ||
      ((txn.status === "FAILED" || txn.status === "REVERSED") && input.status === "CONFIRMED");`,
    to: `    const contradicted = false;`,
  },
  {
    name: "over-correction-every-terminal-txn-refused",
    why: "⚠️ NOT THE OLD DEFECT — the mirror. An honest at-least-once retry is answered `handled:false`, so the provider never stops retrying. The positive control must catch it",
    file: "src/lib/server/wallet-service.ts",
    from: `    return { handled: true, reason: \`already-\${txn.status.toLowerCase()}\` };
  }`,
    to: `    return { handled: false, reason: \`already-\${txn.status.toLowerCase()}\` };
  }`,
  },
  {
    name: "selcom-restored-to-the-generic-lane",
    why: "⭐ THE OTHER PRE-FIX STATE — `X-Provider: selcom` settles a deposit from the callback body, skipping the signed order-status re-query that is the whole authority of the money-in path",
    file: "src/app/api/webhooks/payments/route.ts",
    from: `const KNOWN_PROVIDERS: Record<string, string> = {
  azampay: "AZAMPAY_WEBHOOK_SECRET",`,
    to: `const KNOWN_PROVIDERS: Record<string, string> = {
  selcom:  "SELCOM_WEBHOOK_SECRET",
  azampay: "AZAMPAY_WEBHOOK_SECRET",`,
  },
  {
    name: "explicit-refusal-removed",
    why: "★ the map is clean but the guard is gone — a selcom callback falls through to `unknown-provider` with no SECURITY row, so nobody learns the weaker door is being tried",
    file: "src/app/api/webhooks/payments/route.ts",
    from: `  if (AUTHORITATIVE_ONLY.has(provider)) {`,
    to: `  if (false && AUTHORITATIVE_ONLY.has(provider)) {`,
  },
];
