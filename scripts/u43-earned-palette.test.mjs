/** U43 B5: a stake is not a win; reserve won-money and side inks for their facts. */
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const panel = read("src/components/updown/round-stake-panel.tsx");
const journey = read("src/components/journey/updown/jud-arm.tsx");
const hook = read("src/components/updown/use-quick-bet.ts");
const kit = read("src/components/ui/toast.tsx");
const sharedSheet = read("src/components/journey/bet-sheet/bet-sheet.tsx");
const css = read("src/app/globals.css");
const authority = read("docs/DESIGN_AUTHORITY.md");
const betConfirm = read("src/components/markets/bet-confirm-modal.tsx");
const sellConfirm = read("src/components/markets/sell-confirm-modal.tsx");
const registration = read("src/app/auth/register/page.tsx");
const receipt = read("src/components/updown/updown-bet-receipt-modal.tsx");
const blocked = read("src/components/updown/updown-bet-blocked-modal.tsx");
const resultModal = read("src/components/markets/operation-result-modal.tsx");
const sellResult = read("src/components/markets/sell-result.tsx");
const dictionary = read("src/lib/i18n-dict.ts");

function fragments(p, j, h, k) {
  const button = p.match(/<button\s+type="button" onClick=\{\(\) => bet\.place\(lockedSide\)\}[\s\S]*?<\/button>/)?.[0] ?? "";
  const journeyButton = j.match(/<Button\s+type="button"[^>]*data-testid="jud-place"[\s\S]*?<\/Button>/)?.[0] ?? "";
  const toast = h.match(/toast\(\{\s*title: copy\.placed,[\s\S]*?\}\);/)?.[0] ?? "";
  const start = k.lastIndexOf("  factual: {");
  const end = start < 0 ? -1 : k.indexOf("\n  },", start);
  const factual = start < 0 || end < 0 ? "" : k.slice(start, end);
  return { button, journeyButton, toast, factual };
}

function issues(p, j, h, k) {
  const { button, journeyButton, toast, factual } = fragments(p, j, h, k);
  const found = [];
  const need = (ok, description) => { if (!ok) found.push(description); };
  need(button.length > 200 && button.includes("bet.place(lockedSide)"), "detail bet button is located");
  need(button.includes('className="btn btn-primary btn-lg mt-3 w-full justify-center"'),
    "detail bet confirm uses the kit's brand action, not unearned gold");
  need(!/btn-(?:gold|yes|no)|(?:--gold-|--yes-|--no-)/.test(button),
    "detail bet confirm borrows neither won-money nor side ink");
  need(journeyButton.length > 200 && journeyButton.includes("bet.place(side)"), "Journey bet confirm is located");
  need(journeyButton.includes('variant="primary"') && !/variant="(?:gold|yes|no)"/.test(journeyButton),
    "Journey bet confirm uses the kit's brand action, not unearned gold or side ink");
  need(toast.length > 120 && toast.includes("formatTzs(amount)") && toast.includes("copy.up") && toast.includes("copy.down"),
    "placed-bet toast names the actual side and formatted stake");
  need(toast.includes('variant: "factual"') && !/variant: "(?:success|danger|gold|default)"/.test(toast),
    "placed-bet toast selects the neutral factual variant");
  need(factual.includes('bar: "bg-text-muted"') && factual.includes('<I.info s={18} />')
    && factual.includes('rail: "bg-text-muted"') && factual.includes('surface: ""'),
    "factual toast draws a neutral bar and information glyph without coloured tint");
  return found;
}

function assertClean(label, p, j, h, k) {
  const found = issues(p, j, h, k);
  if (found.length) throw new Error(`${label}: ${found.join("; ")}`);
  console.log(`PASS ${label}`);
}

assertClean("U43 earned-money palette and placed-bet feedback", panel, journey, hook, kit);
const original = fragments(panel, journey, hook, kit);
const mutants = [
  ["gold classic detail commit", panel.replace(original.button, original.button.replace("btn-primary", "btn-gold")), journey, hook, kit],
  ["side-coloured classic detail commit", panel.replace(original.button, original.button.replace("btn-primary", "btn-yes")), journey, hook, kit],
  ["gold Journey detail commit", panel, journey.replace(original.journeyButton, original.journeyButton.replace('variant="primary"', 'variant="gold"')), hook, kit],
  ["side-coloured Journey detail commit", panel, journey.replace(original.journeyButton, original.journeyButton.replace('variant="primary"', 'variant="yes"')), hook, kit],
  ["green placed-bet toast", panel, journey, hook.replace(original.toast, original.toast.replace('variant: "factual"', 'variant: "success"')), kit],
  ["brand placed-bet toast", panel, journey, hook.replace(original.toast, original.toast.replace('variant: "factual"', 'variant: "default"')), kit],
  ["green factual kit tint", panel, journey, hook, kit.replace(original.factual, original.factual.replace('bar: "bg-text-muted"', 'bar: "bg-success"'))],
];
let rejected = 0;
for (const [label, p, j, h, k] of mutants) {
  if (p === panel && j === journey && h === hook && k === kit) throw new Error(`mutation did not alter source: ${label}`);
  if (issues(p, j, h, k).length === 0) throw new Error(`guard missed mutation: ${label}`);
  rejected++;
  console.log(`RED caught ${label}`);
}
console.log(`U43 earned palette: guard passed, ${rejected}/${mutants.length} in-memory mutations rejected`);

// The shared low-balance block is mounted by Journey Up & Down as well as the
// question sheet. Its deposit is an action to add money, never earned money.
function lowBlockIssues(sheetSource, cssSource) {
  const start = sheetSource.indexOf("export function LowBlock(");
  const end = sheetSource.indexOf("export function BetSheetBody(", start);
  const lowBlock = start < 0 || end < 0 ? "" : sheetSource.slice(start, end);
  const door = lowBlock.match(/<Button\s+type="button"[^>]*data-testid="journey-sheet-deposit"[\s\S]*?<\/Button>/)?.[0] ?? "";
  const rails = cssSource.match(/\.kp-bsheet__rails \{([^}]*)\}/)?.[1] ?? "";
  const found = [];
  if (!door.includes("onDeposit(selectedDeposit)")) found.push("shared deposit door is located");
  if (!door.includes('variant="primary"') || !door.includes('className="kp-bsheet__deposit"')
    || /variant="(?:gold|yes|no)"|\bgilt-metal\b|\bbtn-gold\b/.test(door))
    found.push("shared deposit door uses the brand action without unearned gold or side ink");
  if (!/color:\s*var\(--pearl-50\)/.test(rails) || /var\(--(?:gold|gilt)/.test(rails))
    found.push("rail names keep readable pearl ink on the brand door");
  return found;
}
const lowProblems = lowBlockIssues(sharedSheet, css);
if (lowProblems.length) throw new Error(`shared low-balance palette: ${lowProblems.join("; ")}`);
console.log("PASS shared LowBlock deposit door and rail ink");
const lowMutants = [
  ["gold shared deposit door", sharedSheet.replace('variant="primary" size="xl" fullWidth className="kp-bsheet__deposit"', 'variant="gold" size="xl" fullWidth className="kp-bsheet__deposit"'), css],
  ["gilt shared deposit door", sharedSheet.replace('className="kp-bsheet__deposit"', 'className="kp-bsheet__deposit gilt-metal"'), css],
  ["dark gold rail names", sharedSheet, css.replace(/(\.kp-bsheet__rails \{[^}]*color:\s*)var\(--pearl-50\)/, "$1var(--gold-fg)")],
];
for (const [label, sheetSource, cssSource] of lowMutants) {
  if (sheetSource === sharedSheet && cssSource === css) throw new Error(`mutation did not alter source: ${label}`);
  if (lowBlockIssues(sheetSource, cssSource).length === 0) throw new Error(`guard missed mutation: ${label}`);
  console.log(`RED caught ${label}`);
}
console.log(`U43 shared deposit palette: guard passed, ${lowMutants.length}/${lowMutants.length} in-memory mutations rejected`);

// Keep the owning design law current: legacy D1 prose remains as history, but
// the first M3a paragraph is the binding rule for these player controls.
function lawIssues(source) {
  const start = source.indexOf("### M3a — Player money actions and earned gold");
  const end = source.indexOf("### M4 — Money is mono", start);
  const law = start < 0 || end < 0 ? "" : source.slice(start, end);
  const found = [];
  if (!law.includes("**Current player rule (Ali, 2026-10-19): gold marks only money the player has won.**"))
    found.push("M3a reserves player gold for money won");
  if (!law.includes("Bet, sell, deposit and withdrawal controls use their approved brand or side treatment;"))
    found.push("M3a names the player money controls");
  if (!law.includes("moving or committing a stake is not a win."))
    found.push("M3a says a stake commit is not a win");
  if (!law.includes("Its Continue action, crest and eyebrow use neutral or brand ink."))
    found.push("M3a keeps receipt Continue out of the side colours");
  return found;
}
const lawProblems = lawIssues(authority);
if (lawProblems.length) throw new Error(`design law: ${lawProblems.join("; ")}`);
console.log("PASS DESIGN_AUTHORITY M3a current player law");
const wrongLaw = authority.replace("gold marks only money the player has won.", "gold marks money the player has moved.");
if (wrongLaw === authority || lawIssues(wrongLaw).length === 0) throw new Error("guard missed mutation: unearned gold rule restored");
console.log("RED caught unearned gold rule restored");
const wrongReceiptLaw = authority.replace("Its Continue action, crest and eyebrow use neutral or brand ink.", "Its Continue action borrows the side colour.");
if (wrongReceiptLaw === authority || lawIssues(wrongReceiptLaw).length === 0) throw new Error("guard missed mutation: side-coloured Continue rule restored");
console.log("RED caught side-coloured Continue rule restored");

// The question market reached from the U43 market card has the same rule at
// its final confirm. The shared Journey question sheet and exit dialog do too.
function commitIssues(betSource, sellSource, sheetSource, cssSource) {
  const confirm = (source) => {
    const start = source.indexOf("ref={confirmRef}");
    const end = start < 0 ? -1 : source.indexOf("</button>", start);
    return start < 0 || end < 0 ? "" : source.slice(start, end);
  };
  const bet = confirm(betSource);
  const sell = confirm(sellSource);
  const sheet = sheetSource.match(/\{footerLine && <Button[\s\S]*?<\/Button>\}/)?.[0] ?? "";
  const found = [];
  if (!bet.includes("onConfirm()") || !bet.includes('className="btn btn-primary btn-lg w-full"') || /btn-(?:gold|yes|no)/.test(bet))
    found.push("question bet confirm uses brand, not unearned gold or a side");
  if (!sell.includes("onConfirm()") || !sell.includes('className="btn btn-primary btn-lg w-full"') || /btn-(?:gold|yes|no)/.test(sell))
    found.push("sell confirm uses brand, not unearned gold or a side");
  if (!sheet.includes("onClick={onPlace}") || !sheet.includes('variant="primary"') || /variant="(?:gold|yes|no)"/.test(sheet))
    found.push("Journey question bet commit uses brand");
  if (!/\.kp-bsheet \.btn-primary:disabled \{/.test(cssSource) || /\.kp-bsheet \.btn-gold:disabled \{/.test(cssSource))
    found.push("shared disabled bet commit styling follows the brand button");
  return found;
}
const commitProblems = commitIssues(betConfirm, sellConfirm, sharedSheet, css);
if (commitProblems.length) throw new Error(`money commit palette: ${commitProblems.join("; ")}`);
console.log("PASS question bet, sell and Journey commits use brand");
const commitMutants = [
  ["gold question bet confirm", betConfirm.replace('className="btn btn-primary btn-lg w-full"', 'className="btn btn-gold btn-lg w-full"'), sellConfirm, sharedSheet, css],
  ["gold sell confirm", betConfirm, sellConfirm.replace('className="btn btn-primary btn-lg w-full"', 'className="btn btn-gold btn-lg w-full"'), sharedSheet, css],
  ["gold Journey stake commit", betConfirm, sellConfirm, sharedSheet.replace('variant="primary" size="xl" fullWidth className="kp-bsheet__commit"', 'variant="gold" size="xl" fullWidth className="kp-bsheet__commit"'), css],
  ["gold-only disabled commit style", betConfirm, sellConfirm, sharedSheet, css.replace('.kp-bsheet .btn-primary:disabled {', '.kp-bsheet .btn-gold:disabled {')],
];
for (const [label, b, s, sh, c] of commitMutants) {
  if (b === betConfirm && s === sellConfirm && sh === sharedSheet && c === css) throw new Error(`mutation did not alter source: ${label}`);
  if (commitIssues(b, s, sh, c).length === 0) throw new Error(`guard missed mutation: ${label}`);
  console.log(`RED caught ${label}`);
}
console.log(`U43 shared commit palette: guard passed, ${commitMutants.length}/${commitMutants.length} in-memory mutations rejected`);

// These registration ribbons show an offer before the player has won it.
// Keep the real amounts and their three-language copy, but use neutral ink.
function registrationIssues(source) {
  const found = [];
  for (const field of ["referral.newPlayerBonusTzs", "invite.bonusAmountTzs"]) {
    const exact = `<span className="amount text-text">{formatTzs(${field})}</span>`;
    if (source.split(exact).length !== 2) found.push(`${field} is a formatted neutral offer, exactly once`);
  }
  if (/className="[^"]*(?:gold|gilt)[^"]*"/.test(source))
    found.push("registration offers and their cards carry no gold or gilt classes");
  return found;
}
const registrationProblems = registrationIssues(registration);
if (registrationProblems.length) throw new Error(`registration palette: ${registrationProblems.join("; ")}`);
console.log("PASS registration offers use factual amounts and neutral ink");
const registrationMutants = [
  ["gold referral offer", "referral.newPlayerBonusTzs"],
  ["gold invitation offer", "invite.bonusAmountTzs"],
];
for (const [label, field] of registrationMutants) {
  const exact = `<span className="amount text-text">{formatTzs(${field})}</span>`;
  const mutant = registration.replace(exact, exact.replace("text-text", "text-gold-300"));
  if (mutant === registration || registrationIssues(mutant).length === 0)
    throw new Error(`guard missed mutation: ${label}`);
  console.log(`RED caught ${label}`);
}
console.log(`U43 registration offer palette: guard passed, ${registrationMutants.length}/${registrationMutants.length} in-memory mutations rejected`);

// A placed bet has a side, but no win. Its receipt keeps the shared success
// lifecycle and side strip while Continue, crest and eyebrow are neutral/brand.
// Refusals stay until acknowledged or dismissed, and a free exit returns stake.
function feedbackIssues(r, b, modal, h, sell) {
  const found = [];
  const receiptStart = r.indexOf("<OperationResultModal");
  const receiptCall = receiptStart < 0 ? "" : r.slice(receiptStart, r.indexOf("/>", receiptStart) + 2);
  if (!receiptCall.includes('variant="success"') || !receiptCall.includes('successCrestTone="neutral"')
    || !receiptCall.includes('stripTone={placed.side === "UP" ? "yes" : "no"}')
    || !receiptCall.includes('primaryLabel={t.market.udRcKeepPlaying}') || /autoCloseMs=/.test(receiptCall))
    found.push("placed-bet receipt uses a neutral crest, actual side strip, localized Continue and shared timer");
  if (!modal.includes('successCrestTone?: "neutral"')
    || !modal.includes('const tone = variant === "success" && successCrestTone === "neutral" ? TONE.neutral : TONE[variant];'))
    found.push("shared result modal actually applies neutral crest and eyebrow ink");
  if (!modal.includes('if (open && variant === "success")')
    || !modal.includes('{variant === "success" && (')
    || !modal.includes('background: STRIP_GRADIENTS[stripTone] ?? STRIP_GRADIENTS.brand')
    || !modal.includes('const effectiveBtn = variant === "success"\n    ? (stripTone === "gold" ? "btn-gold" : "btn-primary")\n    : tone.primaryBtn;')
    || !modal.includes('className={`btn ${effectiveBtn} btn-lg w-full`}')
    || !modal.includes('{primaryLabel ?? t.common.doneSawa}'))
    found.push("success auto-close and actual side strip remain; localized Continue renders as brand");
  const blockedStart = b.indexOf("<OperationResultModal");
  const blockedCall = blockedStart < 0 ? "" : b.slice(blockedStart, b.indexOf("/>", blockedStart) + 2);
  if (!blockedCall.includes('open={!!blocked}') || !blockedCall.includes('variant="neutral"')
    || !blockedCall.includes('title={blocked?.title ?? ""}') || !blockedCall.includes('subtitle={blocked?.body}')
    || /autoCloseMs=/.test(blockedCall))
    found.push("blocked bet stays a neutral acknowledgement with its actual localized reason");
  if (!h.includes('toast({ title: copy.failed, description: fail.description, variant: "factual", durationMs: 0 });')
    || !h.includes('toast({ title: copy.failed, description: errCopy.udErrBusy, variant: "factual", durationMs: 0 });'))
    found.push("both refused-bet toast paths are factual and sticky");
  if (!sell.includes('borderColor: isFree ? "var(--border)"')
    || !sell.includes('background:  isFree ? "var(--bg-elevated)"')
    || !sell.includes('style={{ color: "var(--text)" }}')
    || !sell.includes('{isFree ? t.dialog.noFee : `−${formatTzs(fee)}`}'))
    found.push("free-exit panel reports no fee with neutral border, wash and ink");
  return found;
}
const feedbackProblems = feedbackIssues(receipt, blocked, resultModal, hook, sellConfirm);
if (feedbackProblems.length) throw new Error(`U43 receipt/refusal/exit palette: ${feedbackProblems.join("; ")}`);
console.log("PASS placed receipt, blocked refusal, sticky toasts and free exit use their factual palette");
const feedbackMutants = [
  ["green receipt crest", receipt.replace('successCrestTone="neutral"', 'successCrestTone="success"'), blocked, resultModal, hook, sellConfirm],
  ["brand strip instead of actual side", receipt.replace('stripTone={placed.side === "UP" ? "yes" : "no"}', 'stripTone="brand"'), blocked, resultModal, hook, sellConfirm],
  ["side-coloured Continue", receipt, blocked, resultModal.replace('stripTone === "gold" ? "btn-gold" : "btn-primary"', 'stripTone === "gold" ? "btn-gold" : stripTone === "yes" ? "btn-yes" : stripTone === "no" ? "btn-no" : "btn-primary"'), hook, sellConfirm],
  ["unlocalized Continue", receipt.replace('primaryLabel={t.market.udRcKeepPlaying}', 'primaryLabel="Continue"'), blocked, resultModal, hook, sellConfirm],
  ["green shared crest override", receipt, blocked, resultModal.replace('successCrestTone === "neutral" ? TONE.neutral', 'successCrestTone === "neutral" ? TONE.success'), hook, sellConfirm],
  ["lost success-only timer", receipt, blocked, resultModal.replace('if (open && variant === "success")', 'if (open)'), hook, sellConfirm],
  ["red blocked refusal", receipt, blocked.replace('variant="neutral"', 'variant="danger"'), resultModal, hook, sellConfirm],
  ["red server refusal toast", receipt, blocked, resultModal, hook.replace('description: fail.description, variant: "factual"', 'description: fail.description, variant: "danger"'), sellConfirm],
  ["red transport refusal toast", receipt, blocked, resultModal, hook.replace('description: errCopy.udErrBusy, variant: "factual"', 'description: errCopy.udErrBusy, variant: "danger"'), sellConfirm],
  ["green free-exit border", receipt, blocked, resultModal, hook, sellConfirm.replace('borderColor: isFree ? "var(--border)"', 'borderColor: isFree ? "var(--success-500)"')],
  ["green free-exit wash", receipt, blocked, resultModal, hook, sellConfirm.replace('background:  isFree ? "var(--bg-elevated)"', 'background:  isFree ? "var(--success-bg)"')],
  ["green free-exit fee ink", receipt, blocked, resultModal, hook, sellConfirm.replace('style={{ color: "var(--text)" }}', 'style={{ color: isFree ? "var(--success-fg)" : "var(--text)" }}')],
];
for (const [label, r, b, modal, h, sell] of feedbackMutants) {
  if (r === receipt && b === blocked && modal === resultModal && h === hook && sell === sellConfirm)
    throw new Error(`mutation did not alter source: ${label}`);
  if (feedbackIssues(r, b, modal, h, sell).length === 0) throw new Error(`guard missed mutation: ${label}`);
  console.log(`RED caught ${label}`);
}
console.log(`U43 receipt/refusal/exit palette: guard passed, ${feedbackMutants.length}/${feedbackMutants.length} in-memory mutations rejected`);

function continueWordsIssue(src) {
  const words = [...src.matchAll(/udRcKeepPlaying:\s*"([^"]+)"/g)].map((m) => m[1]);
  return words.length !== 3 || words[0] !== "Keep playing" || words[1] !== "Endelea kucheza" || words[2] !== "继续游戏";
}
if (continueWordsIssue(dictionary)) throw new Error("receipt Continue must have its current EN/SW/ZH words");
console.log("PASS receipt Continue uses its EN, SW and ZH words");
for (const [language, word] of [["English", "Keep playing"], ["Swahili", "Endelea kucheza"], ["Chinese", "继续游戏"]]) {
  const mutant = dictionary.replace(`udRcKeepPlaying: "${word}"`, 'udRcKeepPlaying: "Continue"');
  if (mutant === dictionary || !continueWordsIssue(mutant)) throw new Error(`guard missed ${language} Continue word mutation`);
  console.log(`RED caught ${language} Continue word mutation`);
}

function sellResultIssues(source) {
  const start = source.indexOf("<OperationResultModal");
  const call = start < 0 ? "" : source.slice(start, source.indexOf("/>", start) + 2);
  const found = [];
  if (!call.includes('variant={resultData.variant === "success" ? "success" : "neutral"}')
    || !call.includes('successCrestTone="neutral"') || !call.includes('stripTone="brand"'))
    found.push("sale success keeps its timer but both sale outcomes use neutral crest ink");
  if (!call.includes('resultData.net >= 0') || !call.includes('t.common.fullStakeReturned')
    || !call.includes('t.common.stakeReturnedMinusFee'))
    found.push("sale result still distinguishes full stake from fee-reduced return");
  return found;
}
const saleProblems = sellResultIssues(sellResult);
if (saleProblems.length) throw new Error(`U43 sale result palette: ${saleProblems.join("; ")}`);
console.log("PASS sale result keeps factual return wording and neutral crest");
for (const [label, mutant] of [
  ["green sale success crest", sellResult.replace('successCrestTone="neutral"', 'successCrestTone="success"')],
  ["red failed sale crest", sellResult.replace('variant={resultData.variant === "success" ? "success" : "neutral"}', 'variant={resultData.variant}')],
  ["gold sale progress strip", sellResult.replace('stripTone="brand"', 'stripTone="gold"')],
]) {
  if (mutant === sellResult || sellResultIssues(mutant).length === 0) throw new Error(`guard missed mutation: ${label}`);
  console.log(`RED caught ${label}`);
}
console.log("U43 sale result palette: guard passed, 3/3 in-memory mutations rejected");
