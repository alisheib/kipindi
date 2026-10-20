/** Source guard and in-process mutations for consequential Maswali week actions. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const controls = readFileSync(join("src", "app", "admin", "maswali", "[weekId]", "week-controls.tsx"), "utf8");
const page = readFileSync(join("src", "app", "admin", "maswali", "[weekId]", "page.tsx"), "utf8");
const actions = readFileSync(join("src", "app", "admin", "maswali", "actions.ts"), "utf8");
const selectKit = readFileSync(join("src", "components", "ui", "select.tsx"), "utf8");
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
function pendingResultReadable(source: string, kit = selectKit) {
  const s = seal(source);
  return s.includes('<Select size="md" className="min-w-[100px]" value={p.outcome}')
    && kit.includes('const h = size === "xs" ? "min-h-[32px]" : size === "sm" ? "min-h-[36px]" : "min-h-[44px]";')
    && s.includes('ariaLabel={`${r.label} result`}')
    && s.includes('<Button size="sm" variant="ghost" onClick={() => { setVoidRow(r)')
    && s.includes('<Button size="sm" variant="ghost" disabled={!r.sealedAtIso} onClick={() => { setError(null); setCorrectRow(r)')
    && s.includes('<Button size="sm" variant="ghost" disabled={pending || !r.sealedAtIso} onClick={() => { setError(null); setConfirmRow(r); }}');
}

function correctionReviewed(source: string, actionSource: string) {
  const s = seal(source);
  const correction = s.slice(s.indexOf('<ConfirmModal open={!!correctRow}'));
  const action = actionSource.slice(actionSource.indexOf('export async function correctMaswaliSealAction'));
  return s.includes('const expectedOutcome = correctRow.outcome;')
    && s.includes('const expectedSealedAt = correctRow.sealedAtIso;')
    && s.includes('if (!expectedOutcome || !expectedSealedAt)')
    && s.includes('expectedOutcome, expectedSealedAt }')
    && correction.includes('error={correctTried && correction.evidence.trim().length < 10')
    && correction.includes('correction.outcome === "VOID" && !isMaswaliVoidReason(correction.voidReason)')
    && correction.includes('if (!correctRow || correction.evidence.trim().length < 10')
    && action.includes('expectedOutcome: str(formData, "expectedOutcome") as MaswaliOutcome')
    && action.includes('expectedSealedAt: str(formData, "expectedSealedAt")');
}

function voidReviewed(source: string) {
  const s = seal(source);
  const open = s.indexOf('<ConfirmModal open={!!voidRow}');
  const end = s.indexOf('<ConfirmModal open={!!correctRow}', open);
  const dialog = s.slice(open, end);
  return open >= 0 && end > open
    && dialog.includes('error={voidTried && !isMaswaliVoidReason(voidReason)')
    && dialog.includes('error={voidTried && voidEvidence.trim().length < 10')
    && dialog.includes('if (!voidRow || !isMaswaliVoidReason(voidReason) || voidEvidence.trim().length < 10) return;');
}

ok("language signoff opens a hard kit review naming the week before its action", attestReviewed(controls));
ok("sales-close review freezes code and old/new EAT values before its action", moveReviewed(controls));
ok("second officer reviews week, slot and outcome and submits both stale guards", secondReviewed(controls));
ok("each seal-row evidence input has its own slot-specific accessible name", evidenceNamed(controls));
ok("pending results retain a readable trigger when a second-officer action widens the table", pendingResultReadable(controls));
ok("a correction reviews the exact seal and requires evidence and a valid VOID ground", correctionReviewed(controls, actions));
ok("the VOID review requires its ground and evidence before submitting", voidReviewed(controls));
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
  const narrowResult = controls.replace('<Select size="md" className="min-w-[100px]" value={p.outcome}', '<Select size="md" value={p.outcome}');
  if (narrowResult === controls) throw new Error("Pending-result width plant target missing");
  ok("red: removing the pending-result width permits vertical wrapping", !pendingResultReadable(narrowResult));
  const shortResult = controls.replace('<Select size="md" className="min-w-[100px]" value={p.outcome}', '<Select size="xs" className="min-w-[100px]" value={p.outcome}');
  if (shortResult === controls) throw new Error("Pending-result height plant target missing");
  ok("red: removing the pending-result height permits a 32px tap target", !pendingResultReadable(shortResult));
  const shortKit = selectKit.replace(': "min-h-[44px]";', ': "min-h-[36px]";');
  if (shortKit === selectKit) throw new Error("Select kit height plant target missing");
  ok("red: shrinking the shared md Select floor below 40px is reported", !pendingResultReadable(controls, shortKit));
  const shortVoid = controls.replace('<Button size="sm" variant="ghost" onClick={() => { setVoidRow(r)', '<Button size="xs" variant="ghost" onClick={() => { setVoidRow(r)');
  if (shortVoid === controls) throw new Error("Void target size plant missing");
  ok("red: shrinking the consequential Void target to 32px turns the guard red", !pendingResultReadable(shortVoid));
  const shortCorrect = controls.replace('<Button size="sm" variant="ghost" disabled={!r.sealedAtIso} onClick={() => { setError(null); setCorrectRow(r)', '<Button size="xs" variant="ghost" disabled={!r.sealedAtIso} onClick={() => { setError(null); setCorrectRow(r)');
  if (shortCorrect === controls) throw new Error("Correct target size plant missing");
  ok("red: shrinking the consequential Correct target to 32px turns the guard red", !pendingResultReadable(shortCorrect));
  const staleCorrection = controls.replace('const expectedSealedAt = correctRow.sealedAtIso;', 'const expectedSealedAt = "";');
  if (staleCorrection === controls) throw new Error("Correction seal-version plant target missing");
  ok("red: a correction without the reviewed seal version is reported", !correctionReviewed(staleCorrection, actions));
  const blankCorrection = controls.replace('if (!correctRow || correction.evidence.trim().length < 10', 'if (!correctRow || false');
  if (blankCorrection === controls) throw new Error("Correction evidence plant target missing");
  ok("red: blank correction evidence reaching the action is reported", !correctionReviewed(blankCorrection, actions));
  const missingVoidGround = controls.replace('if (!voidRow || !isMaswaliVoidReason(voidReason) || voidEvidence.trim().length < 10) return;', 'if (!voidRow || voidEvidence.trim().length < 10) return;');
  if (missingVoidGround === controls) throw new Error("VOID ground plant target missing");
  ok("red: a VOID without a closed-list ground reaching the action is reported", !voidReviewed(missingVoidGround));
  const shortConfirm = controls.replace('<Button size="sm" variant="ghost" disabled={pending || !r.sealedAtIso}', '<Button size="xs" variant="ghost" disabled={pending || !r.sealedAtIso}');
  if (shortConfirm === controls) throw new Error("Second-officer target size plant missing");
  ok("red: shrinking the second-officer target to 32px turns the guard red", !pendingResultReadable(shortConfirm));
}

console.log(`maswali week controls: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
