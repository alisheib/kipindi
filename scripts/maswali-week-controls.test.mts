/** Source guard and in-process mutations for consequential Maswali week actions. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const controls = readFileSync(join("src", "app", "admin", "maswali", "[weekId]", "week-controls.tsx"), "utf8");
const page = readFileSync(join("src", "app", "admin", "maswali", "[weekId]", "page.tsx"), "utf8");
let passed = 0;
let failed = 0;
function ok(name: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
  condition ? passed++ : failed++;
}
function section(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`Missing week control section: ${start}`);
  return source.slice(from, to);
}
const attest = (source: string) => section(source, "export function AttestOpenControls", "// ── Move the close");
const move = (source: string) => section(source, "export function MoveCloseForm", "// ── The seal console");
const seal = (source: string) => source.slice(source.indexOf("export function SealConsole"));

function attestReviewed(source: string) {
  const s = attest(source);
  return s.includes("setAttestConfirm(true)") && s.includes("<ConfirmModal open={attestConfirm}")
    && s.includes("title={`Attest ${weekCode}'s three languages?`}")
    && s.includes("typedWord=\"ATTEST\"")
    && s.includes("onConfirm={() => run(() => attestMaswaliParityAction(fd({ weekId }))");
}
function moveReviewed(source: string) {
  const s = move(source);
  return s.includes('setReview({ fromEat: currentEat, toEat: `${date} ${time}`, closeAt: `${date}T${time}` })')
    && s.includes("<ConfirmModal open={review !== null}")
    && s.includes("title={`Move ${weekCode}'s sales close?`}")
    && s.includes("{review?.fromEat} (EAT)") && s.includes("{review?.toEat} (EAT)")
    && s.includes("moveMaswaliCloseAction(fd({ weekId, closeAt: review.closeAt }))");
}
function secondReviewed(source: string) {
  const s = seal(source);
  return s.includes("<ConfirmModal open={confirmRow !== null}")
    && s.includes('title={`Confirm ${weekCode} ${confirmRow?.label ?? ""} as second officer?`}')
    && s.includes("Sealed result: <strong>{confirmRow?.outcome}</strong>")
    && s.includes("setConfirmRow(r)")
    && s.includes("fd({ weekId, slot: String(row.slot), expectedOutcome, expectedSealedAt })")
    && s.includes("const expectedOutcome = row.outcome")
    && s.includes("const expectedSealedAt = row.sealedAtIso");
}
function evidenceNamed(source: string) {
  return seal(source).includes('aria-label={`${r.label} seal evidence`}');
}

ok("language signoff opens a hard kit review naming the week before its action", attestReviewed(controls));
ok("sales-close review freezes code and old/new EAT values before its action", moveReviewed(controls));
ok("second officer reviews week, slot and outcome and submits both stale guards", secondReviewed(controls));
ok("each seal-row evidence input has its own slot-specific accessible name", evidenceNamed(controls));
ok("server page passes week code and raw seal version into the reviews",
  page.includes("<AttestOpenControls weekId={week.id} weekCode={week.code}")
  && page.includes("<MoveCloseForm weekId={week.id} weekCode={week.code}")
  && page.includes("<SealConsole weekId={week.id} weekCode={week.code}")
  && page.includes("sealedAtIso: q.sealedAt"));

if (process.argv.includes("--prove-red")) {
  const directAttest = controls.replace("setAttestConfirm(true)", "run(() => attestMaswaliParityAction(fd({ weekId })))");
  if (directAttest === controls) throw new Error("Attestation review plant target missing");
  ok("red: direct attestation loses the week review", !attestReviewed(directAttest));
  const liveClose = controls.replace("moveMaswaliCloseAction(fd({ weekId, closeAt: review.closeAt }))", "moveMaswaliCloseAction(fd({ weekId, closeAt: `${date}T${time}` }))");
  if (liveClose === controls) throw new Error("Close snapshot plant target missing");
  ok("red: live draft values can diverge from the reviewed close", !moveReviewed(liveClose));
  const staleSeal = controls.replace("expectedOutcome, expectedSealedAt }", "expectedOutcome, expectedSealedAt: \"\" }");
  if (staleSeal === controls) throw new Error("Second-officer stale guard plant target missing");
  ok("red: missing seal version permits a stale second-officer signoff", !secondReviewed(staleSeal));
  const nameless = controls.replace('aria-label={`${r.label} seal evidence`}', "");
  if (nameless === controls) throw new Error("Seal evidence name plant target missing");
  ok("red: nameless evidence cannot identify its row to an officer", !evidenceNamed(nameless));
}

console.log(`maswali week controls: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
