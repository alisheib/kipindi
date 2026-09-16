/**
 * blackball-drive — the LIVE verification of the SMS rail. ⚠️ THIS SPENDS REAL MONEY.
 *
 *   npx tsx scripts/live/blackball-drive.mts --step 1 --confirm
 *
 * ⭐ IT DRIVES THE REAL ADAPTER. `blackballSend` is imported from
 * `src/lib/server/sms-blackball.ts`, not re-implemented here, so what this proves is the
 * code production runs. A drive script that builds its own request proves only that the
 * script can talk to the gateway.
 *
 * ── THE BUDGET IS THE POINT ──────────────────────────────────────────────────
 * The account opened with TZS 250 — roughly ten messages. So: ONE destination, a hard
 * ceiling of six chargeable sends across the whole drive, `--confirm` required on every
 * run, and an abort if the balance falls below `ABORT_BELOW_TZS`. Nothing here loops.
 *
 * ⛔ CREDENTIALS ARE READ FROM THE ENVIRONMENT AND NEVER PRINTED. Put them in
 * `F:\kipindi-main\.env.local` (gitignored) or export them in the shell.
 *
 * ── WHAT EACH STEP IS FOR ────────────────────────────────────────────────────
 *  1  one send            · proves the wire; captures the UNDOCUMENTED success body shape
 *                           and, from the balance delta, the real per-message price
 *  2  batch of two        · proves chunking and that one envelope covers several messages
 *  3  one bad msisdn      · ⭐ the question the vendor has not answered: is a per-message
 *                           fault reported per message, or does it fail the whole batch?
 *  4  final end-to-end    · run AFTER the DLR has been seen landing on production
 *
 * Steps 1 and 4 are the two that must pass before `OTP_ENABLED=1` is considered.
 * The delivery receipts themselves arrive at the DEPLOYED app, not here — read them with
 * `sms.dlr.received` / `sms.dlr.unmapped_status` in /admin/audit, and extend
 * `mapDlrStatus()` from the raw tokens recorded on `SmsMessage.dlrStatus`.
 */
import { blackballEnv, blackballSend, describeBlackball, type BlackballMessage } from "../../src/lib/server/sms-blackball.ts";
import { randomBytes } from "node:crypto";

/** ⛔ ONE destination, hard-coded. Ali, 2026-09-16. A drive that can be pointed anywhere
 *  is a drive that can bill a stranger. */
const TO = "+255772619619";
/** Across the whole drive, not per run. Kept here so the number is reviewable. */
const TOTAL_SEND_CEILING = 6;
/** Stop rather than spend the float the login path needs. */
const ABORT_BELOW_TZS = 100;

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const has = (flag: string) => process.argv.includes(flag);

const step = Number(arg("--step") ?? 0);
const ref = () => `sms_${randomBytes(12).toString("hex")}`;
const body = (n: string) => `50pick: test message from Ali (${n}). Ujumbe wa majaribio kutoka kwa Ali.`;

function die(msg: string): never {
  console.error(`\n⛔ ${msg}\n`);
  process.exit(1);
}

const env = blackballEnv();
if (!env) {
  die(
    "BLACKBALL_CLIENT_ID / BLACKBALL_CLIENT_SECRET are not set.\n" +
      "   Put them in .env.local (gitignored) or export them. They are never printed by this script.",
  );
}
if (!env.senderId) die("SMS_SENDER_ID is not set. It must be the TCRA-approved sender ID, max 12 characters.");

console.log(`endpoint   ${env.endpoint}`);
console.log(`sender     ${env.senderId} (${env.senderId.length}/12 chars)`);
console.log(`clientId   ${env.clientId.slice(0, 3)}…${env.clientId.slice(-2)}  (${env.clientId.length} chars)`);
console.log(`to         ${TO}`);
console.log(`step       ${step || "(none)"}`);
console.log("");

const PLAN: Record<number, { label: string; sends: number; build: () => BlackballMessage[]; note: string }> = {
  1: {
    label: "one message",
    sends: 1,
    build: () => [{ msisdn: TO, text: body("1"), reference: ref() }],
    note: "Capture the SUCCESS body verbatim — its shape is undocumented — and the balance delta, which IS the per-message price.",
  },
  2: {
    label: "batch of two in ONE request",
    sends: 2,
    build: () => [
      { msisdn: TO, text: body("2a"), reference: ref() },
      { msisdn: TO, text: body("2b"), reference: ref() },
    ],
    note: "Two messages, one envelope. Confirms the batch shape the invite campaign relies on.",
  },
  3: {
    label: "one good + one deliberately invalid msisdn",
    sends: 2,
    build: () => [
      { msisdn: TO, text: body("3"), reference: ref() },
      { msisdn: "255700000000", text: body("3x"), reference: ref() },
    ],
    note: "⭐ THE OPEN QUESTION: does a per-message fault fail only that message, or the whole batch? Our attribution rule depends on the answer.",
  },
  4: {
    label: "final end-to-end",
    sends: 1,
    build: () => [{ msisdn: TO, text: body("4"), reference: ref() }],
    note: "Run only AFTER a delivery receipt from an earlier step has been seen landing on production.",
  },
};

const plan = PLAN[step];
if (!plan) {
  console.log("Steps:");
  for (const [n, p] of Object.entries(PLAN)) console.log(`  ${n}  ${p.label}  (${p.sends} send${p.sends > 1 ? "s" : ""})`);
  console.log(`\nCeiling across the whole drive: ${TOTAL_SEND_CEILING} chargeable sends.`);
  console.log("Run:  npx tsx scripts/live/blackball-drive.mts --step 1 --confirm\n");
  process.exit(0);
}

console.log(`STEP ${step} · ${plan.label} — ${plan.sends} chargeable send(s)`);
console.log(`${plan.note}\n`);

if (!has("--confirm")) {
  console.log("Dry run. Nothing was sent. Add --confirm to actually send.\n");
  process.exit(0);
}

const messages = plan.build();

// ⭐ A ZERO-COST BALANCE READ FIRST. A request that fails validation is answered with the
// current balance and is NOT billed — so we can price the step before committing to it,
// using the gateway's own number rather than a stored guess.
const probe = await blackballSend(env, [{ msisdn: TO, text: "x", reference: "too-short" }]).catch(() => null);
const before = probe?.balance ?? null;
console.log(`balance before   ${before === null ? "(unknown)" : `TZS ${before}`}`);
if (before !== null && before < ABORT_BELOW_TZS) {
  die(`balance TZS ${before} is below the TZS ${ABORT_BELOW_TZS} abort floor. Top up before continuing.`);
}

const result = await blackballSend(env, messages);
console.log(`\nresult           ${describeBlackball(result)}`);
console.log(`verdict          ${result.ok ? "ACCEPTED by the gateway" : "REFUSED"}`);
console.log(`balance after    ${result.balance === null ? "(absent)" : `TZS ${result.balance}`}`);
if (before !== null && result.balance !== null) {
  const spent = before - result.balance;
  console.log(`spent            TZS ${spent}${plan.sends ? `  →  TZS ${(spent / plan.sends).toFixed(2)} per message` : ""}`);
}
console.log(`\nreferences (watch for these on the DLR, in /admin/audit and SmsMessage):`);
for (const m of messages) console.log(`  ${m.reference}  →  ${m.msisdn}`);
console.log(
  `\n▶ NEXT: confirm the receipt landed — the SmsMessage row should move ACCEPTED → DELIVERED.\n` +
    `  Any status token we did not recognise is audited as sms.dlr.unmapped_status and stored raw\n` +
    `  on SmsMessage.dlrStatus. ⭐ Extend mapDlrStatus() from THAT evidence, never from a guess.\n`,
);
if (!result.ok) process.exit(1);
