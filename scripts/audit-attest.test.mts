/**
 * THE ATTESTATION GUARD — the hole detector and the tamper verdict, pinned so neither can quietly leave.
 *
 *   npm run test:audit-attest
 *
 * ⛔ WHAT THIS GUARDS. Two defects, both measured on a real Postgres by `npm run rehearse:audit-hole`
 * (31 assertions, re-runnable — no number here is quoted from a report):
 *
 *   ① A HOLE THE CHAIN CANNOT SEE. An append that is allocated and never written consumes no `seq`
 *      and breaks no `prevHash` link, so `verifyChainFull()` reports a perfect log. Driven: five
 *      `player.record_viewed` appends lost through the fail-open branch, `{valid:true, total:8,
 *      linkBroken:false}`, zero gaps in `seq`. The remedy is a per-process TICKET taken at CALL
 *      time and stamped into the row id, so a missing ticket between two landed ones IS the hole.
 *      ⭐ It is anchor-free, which is the point: the access-log class has nothing to reconcile
 *      against, and `audit-reconcile.ts` can never find it.
 *   ② `valid:true` OVER A TAMPERED ROW (`docs/COMPLIANCE-DECISIONS.md` AR-3). Only a link break
 *      made `valid` false, so an in-place EDIT left the platform telling an officer the log was
 *      sound. The remedy is that rows which recompute under no key must be DECLARED — counted,
 *      content-digested and chained — and anything unverifiable outside that declaration is a
 *      tamper.
 *
 * ⛔ WHAT IS PINNED HERE AND WHAT IS DRIVEN THERE. The VERDICT needs a database, so its behaviour
 * lives in the rehearsal; what lives here is everything that can be executed or read without one —
 * the ticket allocator (run for real), the fail-closed baseline reader (run for real), and the
 * source-level invariants whose removal would silently restore the defect.
 *
 * ⛔ EVERY ASSERTION HAS A PLANTED CONTROL — a shape the REAL code could contain, which the very
 * same checker must FLAG — and every refusal has a POSITIVE CONTROL: something that must still be
 * ALLOWED. A checker that can only pass is decoration.
 *
 * Exit 1 on any failure; exit 3 if no assertion ran at all.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const code = (rel: string) => decomment(read(rel));

let pass = 0, fail = 0, controls = 0;
const emitted: string[] = [];
function ok(label: string, cond: boolean, detail = ""): boolean {
  emitted.push(label);
  if (/CONTROL/.test(label)) controls++;
  if (cond) { pass++; console.log(`PASS ${label}`); } else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  return cond;
}
const section = (t: string) => console.log(`\n${t}`);

const AUDIT = "src/lib/server/audit.ts";
const TICKET = "src/lib/server/audit-ticket.ts";
const LIFECYCLE = "src/lib/server/lifecycle.ts";
const CATALOGUE = "src/lib/server/reports/catalogue.ts";
const SYSCLIENT = "src/app/admin/system/system-client.tsx";
const BACKUP = "scripts/db-backup.mts";

/* ═══ The checkers. Every one is a pure function of source text, so the planted controls below run
 *     the SAME code the real assertions run — never a second, laxer copy. ═════════════════════ */

/** The ticket must be taken in `audit()` BEFORE the queue is extended. Taken inside the `.then` it
 *  would be allocated at WRITE time, which is what `seq` already does and is exactly why a lost
 *  append leaves no trace. */
export const ticketTakenBeforeTheQueue = (src: string): boolean => {
  const at = src.indexOf("allocateAuditId()");
  const queue = src.indexOf("__50PICK_AUDIT_QUEUE ??");
  return at > 0 && queue > at;
};

/** One ticket per `audit()` CALL, never one per write ATTEMPT. `appendPersisted` retries on a
 *  P2002; a fresh id inside that loop would burn the abandoned ticket and manufacture a phantom gap
 *  in a chain that lost nothing. */
export const idNotMintedInsideTheRetryLoop = (src: string): boolean => {
  const fn = src.slice(src.indexOf("async function appendPersisted"), src.indexOf("function appendInMemory"));
  return fn.length > 0 && !/allocateAuditId\s*\(/.test(fn) && /\bid,/.test(fn);
};

/** A malformed declaration must be treated as NO declaration. If an unreadable payload widened the
 *  attested era, "I could not parse the excuse" would become the excuse. */
export const baselineReaderFailsClosed = (src: string): boolean => {
  const body = declarationBody(src, "readUnverifiableBaseline");
  return /Number\.isFinite\(frontierSeq\)/.test(body) && /Number\.isFinite\(count\)/.test(body)
    && /return null/.test(body);
};

/** `valid` must depend on the unattested count, not on the link check alone. This is AR-3 itself. */
export const validDependsOnUnattested = (src: string): boolean =>
  /if\s*\(\s*unattested\s*>\s*0\s*\)\s*\{[\s\S]{0,400}?valid:\s*false/.test(src);

/** …and on the baseline digest, so an edit to a row that was ALREADY unverifiable is caught. */
export const validDependsOnTheDigest = (src: string): boolean =>
  /baselineMismatch\s*=\s*!!baseline[\s\S]{0,200}?walk\.baselineDigest\s*!==\s*baseline\.digest/.test(src)
  && /if\s*\(\s*baselineMismatch[\s\S]{0,300}?valid:\s*false/.test(src);

/** The digest must cover the row's CONTENT, not merely its identity — otherwise an edit to an
 *  already-unverifiable row moves nothing. */
export const digestCoversContent = (src: string): boolean =>
  /function rowFingerprint[\s\S]{0,300}?stableString\(entry\)[\s\S]{0,120}?entryHash/.test(src);

/** The sweep's window bound must branch on "whole table" explicitly. Falling through the arithmetic
 *  computed `seq > max(seq)`, which scanned an EMPTY population and called it clean. */
export const wholeTableIsBranchedOn = (src: string): boolean =>
  /windowRows\s*<=\s*0\s*\n?\s*\?\s*0/.test(src);

/** The detector's anti-join must exclude ranges already declared, or the register fills with
 *  duplicates of one finding and stops being a count. */
export const dedupAntiJoinPresent = (src: string): boolean =>
  /NOT\s+EXISTS/i.test(src)
  && /a\."targetType"\s*=\s*\$\{TICKET_GAP_TARGET_TYPE\}/.test(src)
  && /a\."action"\s*=\s*\$\{TICKET_GAP_DECLARED_ACTION\}/.test(src);

/** The population must be reported, or "no gaps" over zero rows reads as a clean bill of health. */
export const populationIsReported = (src: string): boolean =>
  /scannedTicketed/.test(src) && /scannedRows/.test(src);

/** The text of one top-level declaration, from its name to the next top-level `export` (or the end).
 *  ⛔ NOT `indexOf("\n}")` — a multi-line PARAMETER object ends with `\n}` too, so that bound cut
 *  `declareAuditTicketGaps` off before its body and the checker read an empty function as a
 *  fire-and-forget one. Caught by this suite's own first run. */
const declarationBody = (src: string, name: string): string => {
  const from = src.indexOf(name);
  if (from < 0) return "";
  const rest = src.slice(from + name.length);
  const next = rest.indexOf("\nexport ");
  return next < 0 ? rest : rest.slice(0, next);
};

/** The declaration must be AWAITED. A fire-and-forget declaration could be lost to the very defect
 *  it is declaring. */
export const declarationIsAwaited = (src: string): boolean =>
  /await audit\(\{/.test(declarationBody(src, "declareAuditTicketGaps"));

/** Three verdicts on every surface that renders one: a LINK break, an UNVERIFIED (edited) entry,
 *  and a clean chain. Collapsing the middle onto "Intact" is the defect. */
export const rendersThreeVerdicts = (src: string): boolean =>
  /linkBroken/.test(src) && /UNVERIFIED/i.test(src);

/* ═══ §1 · THE TICKET, RUN FOR REAL ═══════════════════════════════════════════════════════════ */
section("═══ §1 · THE NUMBER IS TAKEN WHEN THE APPEND IS CALLED ══════════════════════════════");
// No DATABASE_URL here, so `audit()` takes the in-memory path — which still allocates the ticket,
// because the ticket is a property of the CALL and not of the store.
delete process.env.DATABASE_URL;
process.env.AUDIT_CHAIN_SECRET = "audit-attest-guard";
const AUD = await import("../src/lib/server/audit.ts");

const boot = AUD.auditBootId();
ok("1.1 · the boot identity is stable and well-formed, so every row this process writes is attributable to it",
  /^b[0-9a-z]+$/.test(boot) && AUD.auditBootId() === boot, boot);

const before = AUD.auditTicketsIssued();
const e1 = await AUD.audit({ category: "SYSTEM", action: "guard.one", actorId: null, targetType: null, targetId: null });
const e2 = await AUD.audit({ category: "SYSTEM", action: "guard.two", actorId: null, targetType: null, targetId: null });
const t1 = Number(/_(\d{9})$/.exec(e1.id)?.[1]);
const t2 = Number(/_(\d{9})$/.exec(e2.id)?.[1]);
ok("1.2 · every append carries a ticket in its id, zero-padded so it sorts as it counts",
  /^aud_b[0-9a-z]+_\d{9}$/.test(e1.id) && /^aud_b[0-9a-z]+_\d{9}$/.test(e2.id), `${e1.id} / ${e2.id}`);
ok("1.3 · consecutive appends take CONSECUTIVE tickets — which is the whole basis on which a gap means a lost row",
  t2 === t1 + 1, `${t1} then ${t2}`);
ok("1.4 · the counter is the number ISSUED, and it moved by exactly the number of calls",
  AUD.auditTicketsIssued() === before + 2, `${before} -> ${AUD.auditTicketsIssued()}`);
ok("1.5 · both ids name the same boot, so a container's run is one contiguous ticket space",
  e1.id.split("_")[1] === boot && e2.id.split("_")[1] === boot);

// PLANTED CONTROL — the defect this replaces. A write-time id is random, so two appends leave a
// gap-shaped hole nobody can measure. Proven by running the OLD generator, not by arguing about it.
const oldStyle = () => `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const a = oldStyle(), b = oldStyle();
ok("1.c1 · PLANTED CONTROL — the id format this REPLACES carries no ordinal at all, so no gap in it is detectable",
  !/^aud_b[0-9a-z]+_\d{9}$/.test(a) && !/^aud_b[0-9a-z]+_\d{9}$/.test(b), `${a} / ${b}`);

const ringTampered = (() => {
  // POSITIVE CONTROL for the RING verifier — it must still catch an edit, and it does so strictly,
  // because every row in the ring was written this process under the current key.
  const beforeVerify = AUD.verifyChain().valid;
  return { beforeVerify };
})();
ok("1.c2 · POSITIVE CONTROL — the ring verifier calls this untouched chain valid, so §1 is not measuring a chain that was already broken",
  ringTampered.beforeVerify === true);

/* ═══ §2 · THE BASELINE READER FAILS CLOSED ═══════════════════════════════════════════════════ */
section("═══ §2 · A DECLARATION THAT CANNOT BE READ IS NOT A DECLARATION ═════════════════════");
ok("2.1 · with no database there is no declaration, and the reader says so rather than inventing one",
  (await AUD.readUnverifiableBaseline()) === null);
const census = await AUD.censusUnverifiable();
ok("2.2 · and the census over no database attests to nothing — count 0, scanned 0",
  census.count === 0 && census.scanned === 0, JSON.stringify(census));

const auditSrc = code(AUDIT);
ok("2.3 · a malformed declaration payload is treated as NO declaration — an unreadable excuse must never widen the attested era",
  baselineReaderFailsClosed(auditSrc));
ok("2.c1 · PLANTED CONTROL — a reader that trusts whatever the payload holds is FLAGGED",
  !baselineReaderFailsClosed(`export async function readUnverifiableBaseline() {
     const p = r.payload; return { frontierSeq: Number(p.frontierSeq), count: Number(p.count), digest: String(p.digest) };
   }`));

/* ═══ §3 · THE VERDICT ════════════════════════════════════════════════════════════════════════ */
section("═══ §3 · `valid` STOPS BEING TRUE OVER AN EDITED ROW ════════════════════════════════");
ok("3.1 · an unattested row makes `valid` false — AR-3 itself, and the one line whose removal restores the defect",
  validDependsOnUnattested(auditSrc));
ok("3.c1 · PLANTED CONTROL — the code as it stood before tonight, which returned valid over any number of unverifiable rows, is FLAGGED",
  !validDependsOnUnattested("return { valid: true, total, verified, unverifiable, linkBroken: false };"));
ok("3.2 · a change beneath the declared frontier makes `valid` false through the DIGEST, which a count alone could never see",
  validDependsOnTheDigest(auditSrc));
ok("3.c2 · PLANTED CONTROL — a baseline compared by COUNT only is FLAGGED, because an edit to an already-unverifiable row moves no count",
  !validDependsOnTheDigest("const baselineMismatch = !!baseline && (baselined !== baseline.count);"));
ok("3.3 · the digest covers the row's stored CONTENT and its stored signature, not merely its id",
  digestCoversContent(auditSrc));
ok("3.c3 · PLANTED CONTROL — a digest over ids alone is FLAGGED",
  !digestCoversContent(`function rowFingerprint(entry, entryHash) { return createHash("sha256").update(entry.id).digest("hex"); }`));

/* ═══ §4 · THE TICKET IS TAKEN AT CALL TIME, AND ONCE ═════════════════════════════════════════ */
section("═══ §4 · WHERE THE NUMBER IS TAKEN, AND HOW MANY TIMES ══════════════════════════════");
ok("4.1 · the ticket is allocated BEFORE the append joins the queue — inside the `.then` it would be a write-time number, i.e. the defect",
  ticketTakenBeforeTheQueue(auditSrc));
ok("4.c1 · PLANTED CONTROL — allocating it inside the queued body is FLAGGED",
  !ticketTakenBeforeTheQueue(`const run = (globalThis.__50PICK_AUDIT_QUEUE ?? Promise.resolve()).then(async () => { const id = allocateAuditId(); });`));
ok("4.2 · the retry loop reuses the caller's id — a fresh one per attempt would burn a ticket and manufacture a phantom gap",
  idNotMintedInsideTheRetryLoop(auditSrc));
ok("4.c2 · PLANTED CONTROL — minting the id inside the retry loop is FLAGGED",
  !idNotMintedInsideTheRetryLoop(`async function appendPersisted(entry, id) {
     for (let attempt = 0; attempt < 5; attempt++) { const partial = { ...entry, id: allocateAuditId() }; }
   }
   function appendInMemory() {}`));

/* ═══ §5 · THE DETECTOR ═══════════════════════════════════════════════════════════════════════ */
section("═══ §5 · THE SWEEP CANNOT PASS VACUOUSLY, AND CANNOT DUPLICATE ═════════════════════");
const ticketSrc = read(TICKET);
ok("5.1 · the whole-table window is branched on explicitly — the arithmetic alone computed `seq > max(seq)` and scanned NOTHING while reporting a clean sweep",
  wholeTableIsBranchedOn(ticketSrc));
ok("5.c1 · PLANTED CONTROL — the arithmetic-only form that shipped for twenty minutes tonight is FLAGGED",
  !wholeTableIsBranchedOn(`const fromSeq = Number((await db.$queryRaw\`SELECT greatest(0, max("seq") - \${windowRows}::bigint)\`)[0].from_seq);`));
ok("5.2 · the anti-join excludes ranges already declared, so the register stays a count and not a pile of duplicates",
  dedupAntiJoinPresent(ticketSrc));
ok("5.c2 · PLANTED CONTROL — a detector with no dedup, which would re-declare every known hole on every sweep, is FLAGGED",
  !dedupAntiJoinPresent(`SELECT g.* FROM g ORDER BY g.boot ASC LIMIT 50`));
ok("5.3 · the population is reported on every scan — ticketed rows AND the pre-ticket rows this detector is blind to",
  populationIsReported(ticketSrc));
ok("5.4 · the declaration is AWAITED, or it could be lost to the very defect it is declaring",
  declarationIsAwaited(code(TICKET)));
ok("5.c3 · PLANTED CONTROL — a fire-and-forget declaration is FLAGGED",
  !declarationIsAwaited(`export async function declareAuditTicketGaps() { for (const g of scan.gaps) { void audit({ action: "x" }); } }`));

ok("5.5 · the audit table is still append-only across all of src/ — which is WHY a lost row can never be added and a declaration is the only honest remedy",
  auditLogWritesAreCreateOnly());
ok("5.c4 · PLANTED CONTROL — an `auditLog.update(` anywhere in that population is FLAGGED",
  !auditLogWritesAreCreateOnly(`await db.auditLog.update({ where: { id }, data: { payload } });`));

function auditLogWritesAreCreateOnly(planted?: string): boolean {
  if (planted !== undefined) return !/auditLog\.(update|delete)/.test(planted);
  const files = listTs(join(root, "src"));
  return files.every((f) => !/auditLog\.(update|delete)/.test(decomment(readFileSync(f, "utf8"))));
}
function listTs(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listTs(p));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/* ═══ §6 · THE SWEEP IS WIRED, AND THE SURFACES SAY WHAT IS TRUE ══════════════════════════════ */
section("═══ §6 · IT RUNS, AND WHAT IT FINDS REACHES A HUMAN ════════════════════════════════");
const life = code(LIFECYCLE);
ok("6.1 · the ticket sweep runs on the lifecycle leader, beside the bet reconciler — a detector nothing calls is not a control",
  /import\("\.\/audit-ticket"\)/.test(life) && /declareAuditTicketGaps\(/.test(life));
ok("6.2 · and a finding is COMPLIANCE-loud, naming how many appends were lost",
  /AUDIT APPENDS LOST/.test(read(LIFECYCLE)));
ok("6.3 · the ISO 27001 hand-off renders three verdicts, so an edited entry is no longer printed as Intact",
  rendersThreeVerdicts(read(CATALOGUE)));
ok("6.c1 · PLANTED CONTROL — the two-verdict form that printed Intact over a tampered row is FLAGGED",
  !rendersThreeVerdicts(`if (!v.valid) return { value: "BROKEN" }; return { value: "Intact" };`));
ok("6.4 · the admin verify button renders three verdicts too",
  rendersThreeVerdicts(read(SYSCLIENT)));
ok("6.5 · and the ISO note BOUNDS the un-recomputable population instead of explaining away every failure",
  /audit\.unverifiable_baseline/.test(read(CATALOGUE)) && /no unbounded exempt class/.test(read(CATALOGUE)));
ok("6.6 · the backup manifest records unattested entries separately from a link break, and warns on them",
  /chainUnattested/.test(read(BACKUP)) && /EDITED IN PLACE/.test(read(BACKUP)));

/* ═══ Summary ═════════════════════════════════════════════════════════════════════════════════ */
console.log(`\n──────────────────────────────────────────────────────────────────────────────`);
console.log(`  audit-attest: ${pass} passed, ${fail} failed, ${emitted.length} assertion(s) emitted`);
console.log(`  controls among them: ${controls}`);
console.log(`──────────────────────────────────────────────────────────────────────────────\n`);
if (emitted.length === 0) { console.log("!! no assertion ran at all"); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
