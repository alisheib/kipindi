/**
 * blackball-drive — the LIVE verification of the SMS rail. ⚠️ THIS SPENDS REAL MONEY.
 *
 *   npm run live:blackball                                    list the steps
 *   npm run live:blackball -- --step 1                        dry run, sends nothing
 *   npm run live:blackball -- --step 1 --balance-before 250 --confirm
 *
 * `npm run live:blackball` loads the gitignored `.env.local` (BLACKBALL_CLIENT_ID,
 * BLACKBALL_CLIENT_SECRET, SMS_SENDER_ID). ⛔ Credentials are never printed.
 *
 * ⭐ IT DRIVES THE REAL ADAPTER. `blackballSend` is imported from
 * `src/lib/server/sms-blackball.ts`, not re-implemented here, so what this proves is the
 * code production runs. A drive script that builds its own request proves only that the
 * script can talk to the gateway.
 *
 * ── THE BUDGET IS ENFORCED, NOT DESCRIBED ────────────────────────────────────
 * The account opened with TZS 250 — roughly ten messages. So: ONE hard-coded destination,
 * `--confirm` required on every run, and a ceiling of SIX chargeable sends across the whole
 * drive that is COUNTED in a gitignored ledger (`.blackball-drive-ledger.json`) and refused
 * past, rather than stated in a comment. Nothing here loops.
 *
 * ── ⛔ WHY THERE IS NO "FREE BALANCE PROBE" ──────────────────────────────────
 * An earlier draft priced each step by first sending a request that fails validation, on
 * the belief that the gateway answers it with the account balance for free. It does not:
 * validation runs BEFORE authentication (measured 2026-09-16), so that request never
 * identifies the account and answers `balance: 0.0`. The draft would have read TZS 0,
 * compared it to the abort floor, and refused every step — or, with a lower floor, printed
 * a "spent" figure that was pure fiction. The balance before a step now comes from the
 * portal header (`--balance-before`), and the balance after comes from the gateway's own
 * authenticated reply, which is the only reply that can carry it.
 *
 * ── WHAT EACH STEP IS FOR ────────────────────────────────────────────────────
 *  1  one send            · proves the wire and the credentials; captures the UNDOCUMENTED
 *                           success body; with --balance-before, the real per-message price
 *  2  batch of two        · proves one envelope covers several messages (the invite path)
 *  3  one bad msisdn      · ⭐ the question the vendor has not answered: is a per-message
 *                           fault reported per message, or does it fail the whole batch?
 *  4  final end-to-end    · run AFTER a receipt from an earlier step was seen on production
 *
 * ── WHERE THE RECEIPTS GO ────────────────────────────────────────────────────
 * To PRODUCTION, via the Status callback registered in the portal — not here. This drive
 * writes NO production SmsMessage row (a local process writing production audit rows would
 * fork the HMAC chain), so its receipts land as `sms.dlr.unknown_reference`, carrying the
 * vendor's raw status AND description verbatim. That is where the vocabulary `mapDlrStatus()`
 * must be extended from. A `webhook.blackball.rejected` instead means the callback token does
 * not match BLACKBALL_WEBHOOK_SECRET in Railway.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { blackballEnv, blackballSend, describeBlackball, type BlackballMessage } from "../../src/lib/server/sms-blackball.ts";

/** ⛔ ONE destination, hard-coded — Ali, 2026-09-16. A drive that can be pointed anywhere is
 *  a drive that can bill a stranger. */
const TO = "+255772619619";
/** Across the WHOLE drive, enforced through the ledger below. */
const TOTAL_SEND_CEILING = 6;
/** After any step, a reported balance under this is a loud stop: the float belongs to login codes. */
const STOP_BELOW_TZS = 100;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER = join(ROOT, ".blackball-drive-ledger.json");

type Ledger = { sends: number; runs: { at: string; step: number; sends: number; ok: boolean; balanceAfter: number | null; references: string[] }[] };
const readLedger = (): Ledger => (existsSync(LEDGER) ? (JSON.parse(readFileSync(LEDGER, "utf8")) as Ledger) : { sends: 0, runs: [] });

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const has = (flag: string) => process.argv.includes(flag);

const step = Number(arg("--step") ?? 0);
const balanceBeforeRaw = arg("--balance-before");
const balanceBefore = balanceBeforeRaw === undefined ? null : Number(balanceBeforeRaw);
const ref = () => `sms_${randomBytes(12).toString("hex")}`;
const body = (n: string) => `50pick: test message from Ali (${n}). Ujumbe wa majaribio kutoka kwa Ali.`;

function die(msg: string): never {
  console.error(`\n⛔ ${msg}\n`);
  process.exit(1);
}

const PLAN: Record<number, { label: string; sends: number; build: () => BlackballMessage[]; note: string }> = {
  1: {
    label: "one message",
    sends: 1,
    build: () => [{ msisdn: TO, text: body("1"), reference: ref() }],
    note: "Proves the wire and the credentials. Capture the SUCCESS body verbatim — its shape is undocumented.",
  },
  2: {
    label: "batch of two in ONE request",
    sends: 2,
    build: () => [
      { msisdn: TO, text: body("2a"), reference: ref() },
      { msisdn: TO, text: body("2b"), reference: ref() },
    ],
    note: "Two messages, one envelope — the shape the invite campaign relies on.",
  },
  3: {
    label: "one good + one deliberately invalid msisdn",
    sends: 2,
    build: () => [
      { msisdn: TO, text: body("3"), reference: ref() },
      { msisdn: "255700000000", text: body("3x"), reference: ref() },
    ],
    note: "⭐ THE OPEN QUESTION: does a per-message fault fail only that message, or the whole batch?",
  },
  4: {
    label: "final end-to-end",
    sends: 1,
    build: () => [{ msisdn: TO, text: body("4"), reference: ref() }],
    note: "Run only AFTER a delivery receipt from an earlier step has been seen on production.",
  },
};

const ledger = readLedger();
const plan = PLAN[step];

if (!plan) {
  console.log("Steps:");
  for (const [n, p] of Object.entries(PLAN)) console.log(`  ${n}  ${p.label}  (${p.sends} send${p.sends > 1 ? "s" : ""})`);
  console.log(`\nSends used so far: ${ledger.sends} of ${TOTAL_SEND_CEILING}.`);
  console.log("Run:  npm run live:blackball -- --step 1 --balance-before <portal balance> --confirm\n");
  process.exit(0);
}

const env = blackballEnv();
if (!env) {
  die("BLACKBALL_CLIENT_ID / BLACKBALL_CLIENT_SECRET are not set. Put them in .env.local (gitignored). They are never printed.");
}
if (!env.senderId) die("SMS_SENDER_ID is not set. It must be the approved sender ID from the portal, max 12 characters.");
if (env.senderId.length > 12) die(`SMS_SENDER_ID is ${env.senderId.length} characters. The gateway refuses anything over 12.`);
if (balanceBefore !== null && !Number.isFinite(balanceBefore)) die(`--balance-before must be a number, got "${balanceBeforeRaw}".`);

console.log(`endpoint     ${env.endpoint}`);
console.log(`sender       ${env.senderId} (${env.senderId.length}/12 chars)`);
console.log(`clientId     ${env.clientId.slice(0, 4)}…${env.clientId.slice(-2)}`);
console.log(`to           ${TO}`);
console.log(`budget       ${ledger.sends} of ${TOTAL_SEND_CEILING} sends used`);
console.log("");
console.log(`STEP ${step} · ${plan.label} — ${plan.sends} chargeable send(s)`);
console.log(`${plan.note}\n`);

if (ledger.sends + plan.sends > TOTAL_SEND_CEILING) {
  die(`this step needs ${plan.sends} send(s) and ${ledger.sends} of ${TOTAL_SEND_CEILING} are already used. Refusing.`);
}
if (balanceBefore !== null && balanceBefore < STOP_BELOW_TZS) {
  die(`the portal balance TZS ${balanceBefore} is under the TZS ${STOP_BELOW_TZS} stop line. Top up first.`);
}
if (!has("--confirm")) {
  console.log("Dry run. Nothing was sent. Add --confirm to actually send.\n");
  process.exit(0);
}

const messages = plan.build();

/**
 * ⭐ TEE THE RAW REPLY, WITHOUT TOUCHING THE ADAPTER. `blackballSend` parses the reply into an
 * outcome and flattens `data` — correct for production, but the success body is exactly what the
 * vendor never documented, and whether `data` carries per-message ids is the open question. So
 * `fetch` is wrapped here to keep a verbatim copy of the RESPONSE. ⛔ Only the response is
 * captured: the request body carries `clientSecret` and is never read or printed.
 */
let rawReply: { status: number; body: string } | null = null;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const res = await realFetch(input, init);
  rawReply = { status: res.status, body: await res.clone().text() };
  return res;
}) as typeof fetch;

const startedAt = new Date().toISOString();
const result = await blackballSend(env, messages);
globalThis.fetch = realFetch;

// ⭐ LEDGER FIRST, before any printing that could throw. A send that happened must be counted
// even if the rest of this run fails — otherwise the ceiling under-counts exactly when it matters.
// A transport failure is counted too: the gateway may have accepted and billed the batch.
ledger.sends += plan.sends;
ledger.runs.push({ at: startedAt, step, sends: plan.sends, ok: result.ok, balanceAfter: result.balance, references: messages.map((m) => m.reference), rawReply } as Ledger["runs"][number]);
writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + "\n", "utf8");

console.log(`sent at      ${startedAt}`);
console.log(`raw reply    ${rawReply ? `HTTP ${(rawReply as { status: number }).status} ${(rawReply as { body: string }).body.slice(0, 600)}` : "(no response — transport failure)"}`);
console.log(`result       ${describeBlackball(result)}`);
console.log(`verdict      ${result.ok ? "ACCEPTED by the gateway" : result.transport ? "UNKNOWN — no reply; the gateway may still have it" : "REFUSED"}`);
console.log(`balance      ${result.balance === null ? "(not reported)" : `TZS ${result.balance}`}`);
if (balanceBefore !== null && result.balance !== null && result.ok) {
  const spent = balanceBefore - result.balance;
  console.log(`spent        TZS ${spent}  →  TZS ${(spent / plan.sends).toFixed(2)} per message`);
}
console.log(`budget       ${ledger.sends} of ${TOTAL_SEND_CEILING} sends used`);
console.log(`\nreferences:`);
for (const m of messages) console.log(`  ${m.reference}  →  ${m.msisdn}`);
console.log(
  `\n▶ NEXT: the delivery receipt goes to PRODUCTION. Look for these references as\n` +
    `  sms.dlr.unknown_reference (raw status + description, verbatim). A webhook.blackball.rejected\n` +
    `  instead means the portal's callback token does not match BLACKBALL_WEBHOOK_SECRET in Railway.\n`,
);
if (result.balance !== null && result.balance < STOP_BELOW_TZS) {
  console.log(`⛔ STOP: balance TZS ${result.balance} is under TZS ${STOP_BELOW_TZS}. Top up before any further step.\n`);
}
if (!result.ok) process.exit(1);
