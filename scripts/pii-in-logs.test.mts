/**
 * PII IN LOGS — a player's identifier must never reach the platform log stream raw.
 *
 *   npx tsx scripts/pii-in-logs.test.mts   (npm run test:pii-logs)
 *
 * ⚠️ WHY THIS TEST EXISTS (audit F-06, 2026-08-20). Phone numbers were masked everywhere
 * that mattered — `maskPhoneForAudit` before an audit payload, `maskPhone` on the KYC and
 * diagnostic surfaces, and the console SMS provider flatly refuses to print a message body
 * in production so an OTP can never land in a log. Every one of those was a deliberate,
 * commented decision.
 *
 * Email addresses had none of it. `email.ts` printed the full address on six lines — every
 * suppression, every stub, every send, every failure — straight into Railway's log stream,
 * whose retention is not ours to control. Under PDPA 2022 an email identifies a person
 * exactly as a phone number does. The asymmetry was not a decision; it was an oversight,
 * and an oversight repeats.
 *
 * So this suite does not check one file. It scans the whole server tree for the SHAPE of the
 * mistake — a console line interpolating an identifier-bearing expression — and requires
 * every hit to be masked, or to be listed below with a reason. A new leak fails the build
 * instead of shipping quietly.
 *
 * ⛔ Every negative assertion here has been broken on purpose and observed to go red.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
/** Read CODE, not prose. A guard that matches comments reports the explanation as the bug —
 *  the exact mistake the DISABLE_ADMIN_TOTP guard had to be corrected for. */
import { decomment as stripComments } from "./lib/decomment.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const e of readdirSync(join(root, dir))) {
    const rel = `${dir}/${e}`;
    if (e === "node_modules" || e === ".next") continue;
    if (statSync(join(root, rel)).isDirectory()) out.push(...walk(rel));
    else if (/\.(ts|tsx)$/.test(e)) out.push(rel);
  }
  return out;
};

// ── 1 · The masker exists and is honest ──────────────────────────────────────────────────
section("1 · maskEmail exists and reveals nothing identifying");

const emailSrc = read("src/lib/server/email.ts");
ok("email.ts exports maskEmail()", /export function maskEmail\(/.test(emailSrc),
  "The masker must be exported so other modules mask the same way instead of inventing a 5th copy.");

const { maskEmail } = await import("../src/lib/server/email.ts");
ok("it keeps one character of the local part and the domain",
  maskEmail("alisheib@gmail.com") === "a***@gmail.com",
  `got ${JSON.stringify(maskEmail("alisheib@gmail.com"))}`);
ok("⛔ the local part is not recoverable from the output",
  !maskEmail("alisheib@gmail.com").includes("lisheib"));
ok("a plus-addressed inbox does not leak the tag",
  maskEmail("ali+50pick-signups@gmail.com") === "a***@gmail.com",
  `got ${JSON.stringify(maskEmail("ali+50pick-signups@gmail.com"))}`);
ok("an address with an @ in the local part masks on the LAST @",
  maskEmail('"weird@local"@example.tz') === '"***@example.tz',
  `got ${JSON.stringify(maskEmail('"weird@local"@example.tz'))}`);
ok("empty and null are safe, and say so rather than printing nothing",
  maskEmail("") === "(none)" && maskEmail(null) === "(none)" && maskEmail(undefined) === "(none)");
ok("⛔ malformed input reveals nothing rather than falling through",
  maskEmail("not-an-address") === "***" && maskEmail("@nolocal.tz") === "***",
  `got ${JSON.stringify(maskEmail("not-an-address"))} / ${JSON.stringify(maskEmail("@nolocal.tz"))}`);
ok("the domain IS kept — diagnosing 'are Gmail addresses bouncing?' is why these lines exist",
  maskEmail("player@yahoo.co.tz").endsWith("@yahoo.co.tz"));

// ── 2 · No console line interpolates a raw identifier ────────────────────────────────────
section("2 · no console line prints an identifier raw");

/**
 * Files allowed to interpolate an identifier-bearing expression into a console line, each
 * with the reason it is safe. A new entry needs a deliberate edit and a justification.
 */
const ALLOWED = new Set<string>([
  // Masks inline: `${to.slice(0, 4)}***${to.slice(-2)}`, and the body — which carries the
  // OTP — is NEVER printed in production. See the NODE_ENV branch in consoleSms.
  "src/lib/server/sms.ts",
]);

/**
 * The shape of the mistake: a console call whose template interpolates something named like
 * an identifier. Deliberately catches the VARIABLE name, not a string literal, so
 * `console.log("set SMS_PROVIDER")` and `(user.email=null)` prose do not trip it.
 */
//
// Two refinements, each earned by a false positive this guard produced on its first run:
//
//  1. The identifier must not be followed by another word character. Without that,
//     `${emailResult.error}` — a rejection REASON with no address in it — read as a leak. A
//     guard that cries wolf gets an ALLOWED entry added to silence it, and then it is
//     guarding nothing.
//  2. An interpolation that slices is accepted, exactly as a `mask…()` call is. Truncating to
//     a country code (`${to.slice(0, 4)}`) or an id prefix is how this codebase already masks
//     in several places, and it leaves nothing identifying behind.
const IDENT = "(?:e-?mail|address|phoneE164|phone|msisdn|recipient|\\bto\\b)(?![A-Za-z0-9_])";
const SAFE = "(?![^}]*(?:mask|\\.slice\\())";
const LEAK = new RegExp(
  // console.<fn>( ... ${ <ident-ish expression that is neither masked nor sliced> } ...
  "console\\.(?:log|warn|error|info|debug)\\([^;]*?\\$\\{" + SAFE + "[^}]*" + IDENT + "[^}]*\\}",
  "i",
);

const offenders: string[] = [];
for (const f of walk("src")) {
  if (ALLOWED.has(f)) continue;
  const code = stripComments(read(f));
  for (const line of code.split("\n")) {
    if (LEAK.test(line)) { offenders.push(`${f} :: ${line.trim().slice(0, 120)}`); break; }
  }
}
ok(`no unmasked identifier reaches a console line (scanned ${walk("src").length} files)`,
  offenders.length === 0,
  offenders.length
    ? `Mask it with maskEmail()/maskPhone…, or add the file to ALLOWED with a reason:\n       ` +
      offenders.join("\n       ")
    : undefined);

// ── 3 · email.ts specifically — the six lines F-06 found ─────────────────────────────────
section("3 · every address-printing line in email.ts is masked");

const emailCode = stripComments(emailSrc);
const printedAddresses = [...emailCode.matchAll(/console\.(?:log|warn|error)\([^;]*/g)].map((m) => m[0]);
ok(`email.ts has console lines to check (found ${printedAddresses.length})`, printedAddresses.length >= 5,
  "If this dropped to zero the scan below proves nothing — the CONTROL for section 3.");
const rawInEmail = printedAddresses.filter((l) =>
  /\$\{(?![^}]*maskEmail)[^}]*(?:\bto\b|email|address)[^}]*\}/i.test(l));
ok("⛔ no line in email.ts interpolates an address without maskEmail()",
  rawInEmail.length === 0,
  rawInEmail.length ? rawInEmail.map((l) => l.trim().slice(0, 120)).join("\n       ") : undefined);

// ── 3b · No TEST asserts a recipient by scraping the log ─────────────────────────────────
section("3b · tests read recipients from the outbox, not from stdout");

/**
 * ⚠️ WHY THIS IS A GUARD AND NOT JUST A CLEANUP. Masking the address broke NINE assertions
 * across four suites, every one of the shape
 * `logs.some(l => l.includes("[email-stub]") && l.includes("jay@example.com"))`.
 *
 * The cheap repair was to match the masked form — `j***@example.com`. That keeps a suite
 * green while destroying what it measured: "an email went to somebody at example.com" is not
 * the claim any of those tests were making. "The approval email went to THIS player", "the
 * REFUNDED player was mailed", "the player was NOT mailed" — those are the claims, and on a
 * KYC decision or a void refund the distinction is the entire point.
 *
 * They all moved onto `emailOutbox()`, which existed for this and is stricter (`to === addr`
 * is exact; a log scrape matched the fragment anywhere in the line, subject and URL
 * included). This assertion stops the log-scraping shape coming back — the next person to
 * write one gets a red build and a pointer, instead of a passing test that proves less than
 * they think.
 */
const testFiles = walk("scripts").length ? [] : [];  // scripts/ is not under src/; walk it directly
const scriptDir = readdirSync(join(root, "scripts"))
  .filter((f) => /\.(mts|mjs)$/.test(f))
  .map((f) => `scripts/${f}`);
void testFiles;

// A log line that carries an email address AND is being matched for one — the shape that
// silently became unfalsifiable when the address started being masked.
const SCRAPES = /\.includes\(\s*["'][^"']*@[^"']*["']\s*\)/;
const offendingTests: string[] = [];
for (const f of scriptDir) {
  const code = stripComments(read(f));
  // Only lines that look at LOG output. A test may legitimately compare an address it
  // pulled from the outbox or the database.
  for (const line of code.split("\n")) {
    if (!/\blogs?\d*\b|\[email-stub\]/.test(line)) continue;
    if (SCRAPES.test(line)) { offendingTests.push(`${f} :: ${line.trim().slice(0, 110)}`); break; }
  }
}
ok(`no test scrapes an email address out of a log line (scanned ${scriptDir.length} scripts)`,
  offendingTests.length === 0,
  offendingTests.length
    ? `Read the recipient from emailOutbox() instead — arm it with EMAIL_OUTBOX_CAPTURE=1:\n       ` +
      offendingTests.join("\n       ")
    : undefined);
ok(`CONTROL: the scan actually looked at files (${scriptDir.length} found)`, scriptDir.length > 50,
  "If scripts/ came back near-empty the assertion above proves nothing.");

// ── 4 · The SMS body is still never printed in production ────────────────────────────────
section("4 · the OTP-bearing SMS body stays out of production logs");

const smsSrc = stripComments(read("src/lib/server/sms.ts"));
ok("consoleSms branches on NODE_ENV before printing anything",
  /NODE_ENV\s*===\s*["'`]production["'`]/.test(smsSrc),
  "Without the branch, the console provider prints the message body — which contains the OTP.");
ok("the production branch masks the destination and does NOT include the body",
  /console\.error\(`\[SMS\][^`]*\$\{to\.slice\(0, 4\)\}[^`]*`\)/.test(smsSrc)
  && !/console\.error\(`\[SMS\][^`]*\$\{body\}/.test(smsSrc),
  "Production must log a code-free warning, never the message.");

console.log("");
console.log("─".repeat(64));
console.log(`  PII IN LOGS (F-06): ${pass} passed, ${fail} failed`);
console.log(`  Railway log retention is not ours to control, so an identifier printed once`);
console.log(`  is an identifier retained indefinitely. Mask at the call site, every time.`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
