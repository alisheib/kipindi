/**
 * blackball-drive — the LIVE verification of the SMS rail. ⚠️ STEPS WITH --confirm SPEND REAL MONEY.
 *
 *   npm run live:blackball                        list the steps and the budget used
 *   npm run live:blackball -- --step 2            dry run: reads the balance (free), sends nothing
 *   npm run live:blackball -- --step 2 --confirm  SENDS
 *
 * `npm run live:blackball` loads the gitignored `.env.local` (BLACKBALL_CLIENT_ID,
 * BLACKBALL_CLIENT_SECRET, SMS_SENDER_ID). ⛔ Credentials are never printed.
 *
 * ⭐ IT DRIVES THE REAL ADAPTER. `blackballSend` and `blackballBalance` are imported from
 * `src/lib/server/sms-blackball.ts`, not re-implemented here, so what this proves is the code
 * production runs. A drive script that builds its own request proves only that the script can
 * talk to the gateway.
 *
 * ── THE BUDGET IS ENFORCED, NOT DESCRIBED ────────────────────────────────────
 * The account opened with TZS 250 and a delivered SMS costs TZS 6 (measured on the first live
 * send, 2026-09-16: Tigo Tz, balance 250 → 244). So: ONE hard-coded destination, `--confirm`
 * required on every run, and a ceiling of SIX chargeable sends across the whole drive, COUNTED in
 * a gitignored ledger (`.blackball-drive-ledger.json`) and refused past. Nothing here loops.
 *
 * ── THE BALANCE, AND THE TWO WAYS OF READING IT THAT DO NOT WORK ─────────────
 *  ⛔ A request that fails validation is NOT a free balance probe. Blackball validates BEFORE it
 *     authenticates, so that request never identifies the account and answers `balance: 0.0`.
 *  ⛔ A send reply's `balance` is PRE-CHARGE. The first send was answered with 250.0; the TZS 6
 *     landed afterwards.
 *  ⭐ `POST /api/account/balance` (found in Blackball's Swagger) is authenticated, free, and read
 *     244.0 — the true figure after the charge. The drive reads it before a step, to enforce the
 *     stop line, and again a few seconds after, to report what the step cost. The portal's Out SMS
 *     "Price" column stays authoritative: a charge can land after the second read.
 *
 * ── WHAT EACH STEP IS FOR ────────────────────────────────────────────────────
 *  1  one send          · the wire and the credentials; the UNDOCUMENTED success body.
 *                         ✅ DONE 2026-09-16: ACCEPTED, `data: null`, DELIVRD / Success in 2 seconds
 *  2  batch of two      · one envelope covering several messages (the invite path)
 *  3  one bad msisdn    · ⭐ the vendor's open question: does a per-message fault fail only that
 *                         message, or the whole batch?
 *  4  final end-to-end  · only AFTER a receipt from an earlier step was seen on production
 *
 * ── WHERE THE RECEIPTS GO ────────────────────────────────────────────────────
 * To PRODUCTION, via the Status callback registered in the portal — not here. This drive writes
 * NO production SmsMessage row (a local process writing production audit rows would fork the HMAC
 * chain), so its receipts land as `sms.dlr.unknown_reference`, carrying the vendor's raw status and
 * description verbatim; read them with `node scripts/live/ops/sms-receipts.cjs <reference>`.
 * ⚠️ If NOTHING arrives, check Cloudflare before anything else: on 2026-09-16 the zone answered
 * `403 error 1010` to any `Java/1.x` User-Agent, which blocks the request before the app sees it.
 *
 * ⛔ NO `process.exit()`. On Windows, exiting while an HTTP keep-alive socket is still closing
 * crashes Node with a libuv assertion (`UV_HANDLE_CLOSING`) and a wrong exit code. The script sets
 * `process.exitCode` and lets the event loop drain instead.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  blackballBalance,
  blackballEnv,
  blackballSend,
  describeBlackball,
  type BlackballEnv,
  type BlackballMessage,
} from "../../src/lib/server/sms-blackball.ts";

/** ⛔ ONE destination, hard-coded — Ali, 2026-09-16. A drive that can be pointed anywhere is a
 *  drive that can bill a stranger. */
const TO = "+255772619619";
/** Across the WHOLE drive, enforced through the ledger.
 *  ⭐ 6 → 7 on 2026-09-21: Ali, *"do any test needed to validate, you have full access"* and then
 *  *"they said the URLs we sent them are whitelisted so now just validate if whitelist worked"*.
 *  The seventh send exists to answer exactly that one question — a callback cannot be provoked
 *  without a message. ⛔ Raise this only on an owner instruction, and record the instruction here.
 *  ⭐ 7 → 8 on 2026-09-22: Ali, *"they said please retest now, they changed things"*. One send, to see
 *  whether the change they made produces a callback. */
const TOTAL_SEND_CEILING = 8;
/** A balance under this is a stop: the float belongs to login codes. */
const STOP_BELOW_TZS = 100;
/** How long to let a charge land before re-reading the balance. */
const CHARGE_SETTLE_MS = 6_000;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER = join(ROOT, ".blackball-drive-ledger.json");

type Ledger = {
  sends: number;
  runs: {
    at: string;
    step: number;
    sends: number;
    ok: boolean;
    /** The send reply's figure — PRE-CHARGE, kept as evidence, never used as a price. */
    balanceInReply: number | null;
    references: string[];
    rawReply: { status: number; body: string } | null;
  }[];
};
const readLedger = (): Ledger =>
  existsSync(LEDGER) ? (JSON.parse(readFileSync(LEDGER, "utf8")) as Ledger) : { sends: 0, runs: [] };

/** A deliberate, explained stop. Thrown rather than exiting, so sockets can close first. */
class DriveStop extends Error {}
const stop = (msg: string): never => {
  throw new DriveStop(msg);
};

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const has = (flag: string) => process.argv.includes(flag);
const ref = () => `sms_${randomBytes(12).toString("hex")}`;
const body = (n: string) => `50pick: test message from Ali (${n}). Ujumbe wa majaribio kutoka kwa Ali.`;

const PLAN: Record<number, { label: string; sends: number; build: () => BlackballMessage[]; note: string }> = {
  1: {
    label: "one message",
    sends: 1,
    build: () => [{ msisdn: TO, text: body("1"), reference: ref() }],
    note: "Proves the wire and the credentials, and captures the undocumented success body.",
  },
  2: {
    label: "batch of two in ONE request",
    sends: 2,
    build: () => [
      { msisdn: TO, text: body("2a"), reference: ref() },
      { msisdn: TO, text: body("2b"), reference: ref() },
    ],
    note: "Two messages, one envelope: the shape the invite campaign relies on.",
  },
  3: {
    label: "one good + one deliberately unroutable msisdn",
    sends: 2,
    build: () => [
      { msisdn: TO, text: body("3"), reference: ref() },
      // ⛔ UNROUTABLE BY CONSTRUCTION, NOT MERELY "PROBABLY UNUSED". A well-formed 12-digit number
      // like 255700000000 can belong to a real subscriber, and billing a stranger is exactly what
      // the hard-coded destination exists to prevent. Five digits cannot reach a handset on any
      // network, and Blackball does not validate msisdn, so this still reaches its router.
      { msisdn: "25577", text: body("3x"), reference: ref() },
    ],
    note: "⭐ The vendor's open question: does a per-message fault fail only that message, or the whole batch?",
  },
  4: {
    label: "final end-to-end",
    sends: 1,
    build: () => [{ msisdn: TO, text: body("4"), reference: ref() }],
    note: "Run only AFTER a delivery receipt from an earlier step has been seen on production.",
  },
};

/** The account's true balance via the free, authenticated endpoint — or a stop saying why not. */
async function readBalance(env: BlackballEnv, label: string): Promise<number> {
  const r = await blackballBalance(env);
  if (!r.ok || r.balance === null) stop(`could not read the ${label} balance: ${describeBlackball(r)}`);
  return r.balance as number;
}

async function main(): Promise<number> {
  const ledger = readLedger();
  const step = Number(arg("--step") ?? 0);
  const plan = PLAN[step];

  if (!plan) {
    console.log("Steps:");
    for (const [n, p] of Object.entries(PLAN)) console.log(`  ${n}  ${p.label}  (${p.sends} send${p.sends > 1 ? "s" : ""})`);
    console.log(`\nSends used so far: ${ledger.sends} of ${TOTAL_SEND_CEILING}.`);
    console.log("Run:  npm run live:blackball -- --step <n> --confirm\n");
    return 0;
  }

  const env = blackballEnv() ?? stop("BLACKBALL_CLIENT_ID / BLACKBALL_CLIENT_SECRET are not set. Put them in .env.local (gitignored).");
  if (!env.senderId) stop("SMS_SENDER_ID is not set. It must be the approved sender ID from the portal, max 12 characters.");
  if (env.senderId.length > 12) stop(`SMS_SENDER_ID is ${env.senderId.length} characters. The gateway refuses anything over 12.`);

  const balanceBefore = await readBalance(env, "current");

  console.log(`endpoint     ${env.endpoint}`);
  console.log(`sender       ${env.senderId} (${env.senderId.length}/12 chars)`);
  console.log(`clientId     ${env.clientId.slice(0, 4)}…${env.clientId.slice(-2)}`);
  console.log(`to           ${TO}`);
  console.log(`budget       ${ledger.sends} of ${TOTAL_SEND_CEILING} sends used`);
  console.log(`balance      TZS ${balanceBefore} (read from /api/account/balance)`);
  console.log("");
  console.log(`STEP ${step} · ${plan.label} — ${plan.sends} chargeable send(s)`);
  console.log(`${plan.note}\n`);

  if (ledger.sends + plan.sends > TOTAL_SEND_CEILING) {
    stop(`this step needs ${plan.sends} send(s) and ${ledger.sends} of ${TOTAL_SEND_CEILING} are already used. Refusing.`);
  }
  if (balanceBefore < STOP_BELOW_TZS) {
    stop(`the balance TZS ${balanceBefore} is under the TZS ${STOP_BELOW_TZS} stop line. Top up first.`);
  }
  if (!has("--confirm")) {
    console.log("Dry run. Nothing was sent. Add --confirm to actually send.\n");
    return 0;
  }

  const messages = plan.build();

  /**
   * ⭐ TEE THE RAW REPLY WITHOUT TOUCHING THE ADAPTER. `blackballSend` parses the reply and flattens
   * `data` — right for production, but the success body is what the vendor never documented. So
   * `fetch` is wrapped to keep a verbatim copy of the RESPONSE. ⛔ Only the response: the request
   * body carries `clientSecret` and is never read or printed.
   */
  let rawReply: { status: number; body: string } | null = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await realFetch(input, init);
    rawReply = { status: res.status, body: await res.clone().text() };
    return res;
  }) as typeof fetch;

  const startedAt = new Date().toISOString();
  let result;
  try {
    result = await blackballSend(env, messages);
  } finally {
    globalThis.fetch = realFetch;
  }

  // ⭐ LEDGER FIRST, before anything that could throw. A send that happened must be counted even if
  // the rest of this run fails. A transport failure counts too: the gateway may have billed it.
  ledger.sends += plan.sends;
  ledger.runs.push({
    at: startedAt,
    step,
    sends: plan.sends,
    ok: result.ok,
    balanceInReply: result.ok ? result.balance : null,
    references: messages.map((m) => m.reference),
    rawReply,
  });
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + "\n", "utf8");

  const captured = rawReply as { status: number; body: string } | null;
  console.log(`sent at      ${startedAt}`);
  console.log(`raw reply    ${captured ? `HTTP ${captured.status} ${captured.body.slice(0, 600)}` : "(no response: transport failure)"}`);
  console.log(`result       ${describeBlackball(result)}`);
  console.log(`verdict      ${result.ok ? "ACCEPTED by the gateway" : result.transport ? "UNKNOWN: no reply, the gateway may still have it" : "REFUSED"}`);

  // Never priced from the send reply (pre-charge on success, 0.0 on a refusal): re-read the true
  // balance once the charge has had a moment to land.
  await new Promise((r) => setTimeout(r, CHARGE_SETTLE_MS));
  const balanceAfter = await readBalance(env, "post-send");
  console.log(`balance      TZS ${balanceBefore} → TZS ${balanceAfter}  (charged so far TZS ${balanceBefore - balanceAfter}; the portal's Out SMS "Price" is authoritative)`);
  console.log(`budget       ${ledger.sends} of ${TOTAL_SEND_CEILING} sends used`);
  console.log(`\nreferences:`);
  for (const m of messages) console.log(`  ${m.reference}  →  ${m.msisdn}`);
  console.log(
    `\n▶ NEXT: the delivery receipt goes to PRODUCTION. Read it with\n` +
      `  node scripts/live/ops/sms-receipts.cjs <reference>\n` +
      `  It lands as sms.dlr.unknown_reference (raw status + description). webhook.blackball.rejected means\n` +
      `  the callback token is wrong; NOTHING at all usually means Cloudflare blocked the callback (error 1010).\n`,
  );
  if (balanceAfter < STOP_BELOW_TZS) {
    console.log(`⛔ STOP: balance TZS ${balanceAfter} is under TZS ${STOP_BELOW_TZS}. Top up before any further step.\n`);
  }
  return result.ok ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(`\n⛔ ${err instanceof DriveStop ? err.message : String((err as Error)?.stack ?? err)}\n`);
    process.exitCode = 1;
  },
);
