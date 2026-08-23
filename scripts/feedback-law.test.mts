/**
 * THE FEEDBACK LAW — the guard for `docs/DESIGN_AUTHORITY.md` §F.
 *
 * §F states which CHANNELS a consequential action answers on, and at which SEVERITY. This
 * asserts the parts of that law a file can be held to. What it deliberately does NOT do is
 * count surfaces: a check that passes by never growing is the "ratchet at zero" failure this
 * repo has already paid for twice.
 *
 * ⛔ ASSERT THE VALUE, NOT THE SYMBOL (`50pick-standards` §5b). Every check below either
 *   · counts calls in STATEMENT position and asserts `mentions === statements`, so a
 *     short-circuited call (`void 0 && fn()`) is a failure rather than a green name — that is
 *     E-57, which killed a loss notification while leaving every character of `pushOnly(` in
 *     place; or
 *   · pins a client rule against the SERVER STRING it mirrors, so the two cannot drift
 *     silently — the §8-of-`test:failure-reasons` idiom; or
 *   · scopes itself to a function/JSX body, because a file-level `includes()` is green over
 *     the exact defect it exists to catch (E-64).
 *
 * ⭐ AND EVERY REFUSAL CHECK CARRIES A POSITIVE CONTROL IN THE SAME RUN. A pattern that has
 * gone blind reports "no violations" in exactly the same words as a clean tree, so each
 * scanner is first shown a string it MUST reject.
 *
 *   npm run test:feedback-law      ·      npm run red:feedback-law
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
/** Source with comments removed — a comment cannot fire a haptic or open a dialog. */
import { decomment as stripComments } from "./lib/decomment.mts";

let pass = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = ""): boolean {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
}
/** CRLF-normalised read. Anchors below are written with `\n` only. */
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/**
 * The substring from `open` to the brace that closes it, brace-matched.
 * ⛔ Returns null rather than "" when the anchor is missing, so a caller cannot mistake
 * "I found nothing" for "I found nothing wrong".
 */
function sliceBraces(text: string, open: string): string | null {
  const at = text.indexOf(open);
  if (at < 0) return null;
  let i = at + open.length - 1;
  if (text[i] !== "{") { const j = text.indexOf("{", i); if (j < 0) return null; i = j; }
  let depth = 0;
  for (let k = i; k < text.length; k++) {
    if (text[k] === "{") depth++;
    else if (text[k] === "}") { depth--; if (depth === 0) return text.slice(at, k + 1); }
  }
  return null;
}

const DICT = read("src/lib/i18n-dict.ts");

/**
 * Every value of `<section>.<key>` across the three language blocks.
 *
 * ⛔ SCOPED TO THE SECTION, and that is not pedantry — a bare `\bkey:` sweep returned SIX
 * values for `errGenericBody` because `share` and `security` each legitimately define one,
 * and "6 ≠ 3" is indistinguishable from a missing translation. A key name is only unique
 * inside its section, so the lookup has to be too.
 */
function dictValues(section: string, key: string): string[] {
  const out: string[] = [];
  const marker = `\n    ${section}: {`;
  let at = DICT.indexOf(marker);
  while (at >= 0) {
    const block = sliceBraces(DICT.slice(at), `${section}: {`);
    if (block) {
      const m = block.match(new RegExp(`\\b${key}:\\s*"([^"]*)"`));
      if (m) out.push(m[1]);
    }
    at = DICT.indexOf(marker, at + marker.length);
  }
  return out;
}
const TOAST = read("src/components/ui/toast.tsx");
const HAPTICS = read("src/lib/haptics.ts");

// ───────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · No native browser dialog reaches a player, on any surface");
// ───────────────────────────────────────────────────────────────────────────────
//
// The kit rule (CLAUDE.md, "UX commitments"): never `confirm()`/`alert()` — always a
// portalled kit modal. The scan must not be fooled by the many legitimate `.confirm(`
// METHODS in this tree (`haptics.confirm()`, `observationStore.confirm(...)`, the DAL's
// `confirm(id, fields)`), which is why it requires the call to be a BARE global.
const NATIVE_DIALOG = /(?<![.\w$])(?:window\s*\.\s*)?(?:confirm|alert)\s*\(/g;

// ⭐ POSITIVE CONTROL — the scanner is shown what it must reject, in the same run. Without
// this, "0 violations" and "the regex stopped matching" print identically.
const CONTROL_BAD = `if (confirm("really?")) { window.alert("done"); }`;
const CONTROL_GOOD = `haptics.confirm(); await observationStore.confirm(id, f); obj.alert(x);`;
ok("1.0a · positive control — the scanner REJECTS a real native dialog",
  (CONTROL_BAD.match(NATIVE_DIALOG) ?? []).length === 2,
  `matched ${(CONTROL_BAD.match(NATIVE_DIALOG) ?? []).length}, expected 2`);
ok("1.0b · …and does NOT reject a method named confirm/alert",
  (CONTROL_GOOD.match(NATIVE_DIALOG) ?? []).length === 0,
  `matched ${(CONTROL_GOOD.match(NATIVE_DIALOG) ?? []).length}, expected 0`);

const SCAN_FILES = [
  "src/components/markets/watch-star.tsx",
  "src/components/markets/position-share.tsx",
  "src/components/settings/push-settings.tsx",
  "src/app/profile/security/security-client.tsx",
  "src/components/profile/password-section.tsx",
  "src/components/updown/use-quick-bet.ts",
  "src/components/updown/updown-stake-controls.tsx",
  "src/components/updown/updown-bet-receipt-modal.tsx",
  "src/components/updown/updown-bet-blocked-modal.tsx",
  "src/components/layout/notifications-panel.tsx",
  "src/components/markets/conviction-dial.tsx",
  "src/components/markets/sell-button.tsx",
];
for (const f of SCAN_FILES) {
  const src = read(f);
  // Strip line comments so a comment ABOUT `confirm()` (updown-controls.tsx has one) is
  // not read as a call. Block comments are stripped too.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const hits = code.match(NATIVE_DIALOG) ?? [];
  ok(`1.1 · ${f.split("/").pop()} uses no native confirm()/alert()`, hits.length === 0, hits.join(" "));
}

// ───────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · The premise the severity rule rests on: warning is GOLD, factual is not");
// ───────────────────────────────────────────────────────────────────────────────
//
// §F routes a WARNING-severity refusal to the `factual` toast and never to `warning`. The
// reason is a paint fact, not a preference: `warning` is struck in gold, and gold on this
// platform means money that was EARNED (§M3). Pin the premise — if someone re-inks the
// warning variant, the law's rationale has changed and this must be re-decided, not drift.
const warnStyle = sliceBraces(TOAST, "  warning: {");
const factualStyle = sliceBraces(TOAST, "  factual: {");
if (ok("2.0 · the toast variant table is readable", !!warnStyle && !!factualStyle)) {
  // ⛔ BOTH SLOTS, NAMED. `/bg-gold-500/` over the whole block was too loose to be a test:
  // the red proof re-inked `bar` to brand and the check stayed green off the `rail` alone.
  // Assert the VALUE at each slot, which is the §5b rule the looser form was breaking.
  ok("2.1a · `warning`'s BAR is still gold (why a refusal may not wear it)",
    /bar:\s*"bg-gold-500"/.test(warnStyle!), "warning is no longer gold — §F's channel rule needs re-deciding");
  ok("2.1b · …and so is its RAIL",
    /rail:\s*"bg-gold-500"/.test(warnStyle!), "warning is no longer gold — §F's channel rule needs re-deciding");
  ok("2.2 · `factual` carries NO tint — the plain rung is the distinction",
    /surface:\s*""/.test(factualStyle!));
  ok("2.3 · `factual` uses the INFO glyph, never a tick",
    /I\.info/.test(factualStyle!) && !/checkCircle/.test(factualStyle!),
    "a confirmation tick over a failure is the euphemism `factual` was added to remove");
}
// The haptic ladder the toast dispatches on — a `factual` toast must stay SILENT, because a
// fixable slip is not a physical event landing (§H.1).
const hapticSwitch = TOAST.slice(TOAST.indexOf("switch (next.variant)"), TOAST.indexOf("switch (next.variant)") + 400);
ok("2.4 · a `factual` toast fires NO haptic", !/case "factual"/.test(hapticSwitch));
ok("2.5 · `danger` still fires the error haptic (the alarm register still exists)",
  /case "danger":\s*haptics\.error\(\)/.test(hapticSwitch));

// ───────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · Every refusal states a REASON and a NEXT STEP, in three languages");
// ───────────────────────────────────────────────────────────────────────────────
//
// `docs/FAILURE-INVENTORY.md` §1.5 counted EIGHT surfaces that said only that something
// failed. Each row below is one of them: the toast must carry a `description`, and that
// description key must resolve in EN, SW and ZH.
const REFUSALS: Array<{ file: string; title: string; body: string; variant: string }> = [
  { file: "src/components/markets/watch-star.tsx", title: "t.watchlist.toggleFailed", body: "t.watchlist.toggleFailedBody", variant: "factual" },
  { file: "src/components/markets/position-share.tsx", title: "t.share.errGeneric", body: "t.share.errGenericBody", variant: "factual" },
  { file: "src/components/settings/push-settings.tsx", title: "t.push.errOnTitle", body: "t.push.errOnBody", variant: "factual" },
  { file: "src/components/settings/push-settings.tsx", title: "t.push.errOffTitle", body: "t.push.errOffBody", variant: "factual" },
  { file: "src/components/profile/password-section.tsx", title: "t.toast.passwordFailed", body: "errorCopy(t, r)", variant: "danger" },
];
for (const r of REFUSALS) {
  const src = read(r.file);
  const name = `${r.file.split("/").pop()}:${r.title.split(".").pop()}`;
  // The title and its body must appear in the SAME toast call — a body defined elsewhere in
  // the file proves nothing about the branch the player actually reaches.
  const callWithTitle = src.split(/toast\(\{/).find((chunk) => chunk.includes(r.title));
  if (!ok(`3.1 · ${name} — the refusal toast exists`, !!callWithTitle)) continue;
  const call = callWithTitle!.slice(0, callWithTitle!.indexOf("})") + 2);
  ok(`3.2 · ${name} — it carries a description (the NEXT STEP)`, /description:/.test(call), call.trim().slice(0, 90));
  ok(`3.3 · ${name} — at the severity §F assigns it`, call.includes(`variant: "${r.variant}"`), call.trim().slice(0, 90));
  if (r.body.startsWith("t.")) {
    const [, section, key] = r.body.split(".");
    // Present three times = once per language block, and no two byte-identical (which is
    // how an untranslated paste reaches a Swahili or Chinese player looking translated).
    const values = dictValues(section, key);
    ok(`3.4 · ${name} — its body resolves in EN, SW and ZH`, values.length === 3, `found ${values.length}`);
    ok(`3.5 · ${name} — none is empty`, values.length === 3 && values.every((v) => v.trim().length > 0));
    ok(`3.6 · ${name} — no two languages are byte-identical`, new Set(values).size === values.length);
  }
}

// ── The 2FA rail answers through a PAIR, so it is checked as one ──────────────
//
// `security-client.tsx` does not inline its copy: `errFor` maps the server's reason to a
// {title, body} and `errToast` renders the pair. Asserting a `description:` beside a title
// literal here would find the file's own head and pass over anything — so the shape itself
// is what gets held.
{
  const SEC = read("src/app/profile/security/security-client.tsx");
  const errFor = sliceBraces(SEC, "const errToast = (e?: string) => {");
  ok("3.7 · security-client — every 2FA branch carries a body, not just a title",
    /errRateLimitedBody/.test(SEC) && /errInvalidBody/.test(SEC) && /errGenericBody/.test(SEC));
  ok("3.8 · security-client — the toast renders the PAIR",
    !!errFor && /title: c\.title/.test(errFor) && /description: c\.body/.test(errFor));
  ok("3.9 · security-client — at the severity §F assigns the account-guarding rail",
    !!errFor && /variant: "danger"/.test(errFor));
  ok("3.10 · security-client — no call site renders a bare title any more",
    !/toast\(\{ title: errFor\(/.test(SEC));
  for (const key of ["errGenericBody", "errInvalidBody", "errRateLimitedBody"]) {
    const values = dictValues("security", key);
    ok(`3.11 · security.${key} resolves in EN, SW and ZH`, values.length === 3, `found ${values.length}`);
    ok(`3.12 · security.${key} — no two languages are byte-identical`, new Set(values).size === values.length);
  }
}
// ⛔ AND THE BARE WORD IS GONE FOR GOOD. `t.toast.failed` was the literal title "Failed".
ok("3.7 · the bare-word `failed:` title key is deleted, not merely unused",
  !/^\s*failed:\s*"/m.test(DICT), "a title that says only that something failed is §F's own counter-example");

// ───────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · Nothing vibrates on a non-action");
// ───────────────────────────────────────────────────────────────────────────────
//
// §H.1: physical events only — "⛔ never to pull attention back to the app". A poll, a
// render and a background refresh are none of the player's doing.
const POLLERS = [
  "src/components/layout/notifications-panel.tsx",
  "src/components/markets/notify-poller.tsx",
];
for (const f of POLLERS) {
  // ⚠️ COMMENTS STRIPPED FIRST, and the reason is worth stating: the notifications panel
  // now carries a paragraph explaining WHY its `haptics.success()` was removed, and that
  // paragraph names the call. A prose mention cannot vibrate, and a rule that forbade
  // explaining a removal would push the next reader to delete the explanation instead.
  // §1 strips for the same reason.
  const src = stripComments(read(f));
  // E-57 · MENTIONS vs STATEMENTS. Both must be zero: a `haptics.` left in the CODE and
  // short-circuited would read as removed while the import still proves intent.
  const mentions = (src.match(/haptics\s*\./g) ?? []).length;
  const statements = (src.match(/^\s*haptics\s*\.\s*\w+\(\)/gm) ?? []).length;
  ok(`4.1 · ${f.split("/").pop()} fires no haptic (mentions=${mentions}, statements=${statements})`,
    mentions === 0 && statements === 0,
    "a background poll is not a physical event; the bell's `.g-ring` is the signal");
}
// The whole call-site population, declared. A NEW file that starts vibrating must be a
// deliberate edit to this list, not a silent arrival.
const HAPTIC_CALLERS = [
  "src/components/markets/bet-confirm-modal.tsx",
  "src/components/markets/comments-thread.tsx",
  "src/components/markets/conviction-dial.tsx",
  "src/components/markets/sell-confirm-modal.tsx",
  "src/components/markets/win-celebration.tsx",
  "src/components/settings/feedback-settings.tsx",
  "src/components/ui/modal.tsx",
  "src/components/ui/toast.tsx",
  "src/components/updown/use-quick-bet.ts",
];
for (const f of HAPTIC_CALLERS) {
  const src = stripComments(read(f));
  const mentions = (src.match(/haptics\s*\.\s*(?:tap|select|confirm|success|warning|error|celebrate)/g) ?? []).length;
  const statements = (src.match(/haptics\s*\.\s*(?:tap|select|confirm|success|warning|error|celebrate)\(\)/g) ?? []).length;
  ok(`4.2 · ${f.split("/").pop()} — every haptic mention is a real call (${statements}/${mentions})`,
    mentions > 0 && mentions === statements,
    "a mention that is not a call is E-57: the name survives, the feedback does not");
  // ⛔ AND `mentions === statements` IS NOT ENOUGH ON ITS OWN — the red proof proved it.
  // `void 0 && haptics.confirm();` keeps the name AND the parentheses, so both counts move
  // together and the check stays green over a haptic that can never fire. THAT is E-57's
  // actual shape: the guard counted `pushOnly(` occurrences and a `void 0 &&` prefix killed
  // a loss notification with every character of the name still in place. Test the dead
  // guard directly rather than inferring liveness from a count.
  const dead = src.match(/(?:void\s+0|false|null|undefined|0)\s*&&\s*haptics\s*\./g) ?? [];
  ok(`4.2b · ${f.split("/").pop()} — no haptic sits behind a falsy short-circuit`,
    dead.length === 0, dead.join(" "));
}
// `celebrate` stays retired — a reward buzz on a licensed money product is a dark pattern.
ok("4.3 · `celebrate` still has ZERO callers (the physical-only rule holds)",
  HAPTIC_CALLERS.every((f) => !/haptics\s*\.\s*celebrate\(\)/.test(read(f))));
ok("4.4 · …and it is still DEFINED, so restoring it stays a one-line owner decision",
  /celebrate:\s*\(\)\s*=>\s*fire\("celebrate"\)/.test(HAPTICS));

// ───────────────────────────────────────────────────────────────────────────────
console.log("\n§5 · Every consequential mutation ends in the SHARED result modal");
// ───────────────────────────────────────────────────────────────────────────────
const CONTROLS = read("src/components/updown/updown-stake-controls.tsx");
const RECEIPT = read("src/components/updown/updown-bet-receipt-modal.tsx");
const BLOCKED = read("src/components/updown/updown-bet-blocked-modal.tsx");

// Scoped to the RETURNED JSX, not the file: the import alone proves nothing about whether
// the surface actually renders it (E-64's lesson, applied to a component instead of a call).
const jsx = CONTROLS.slice(CONTROLS.indexOf("return ("));
ok("5.1 · the Up & Down bet surface RENDERS the receipt modal", /<UpDownBetReceiptModal/.test(jsx));
ok("5.2 · …and still renders its refusal sibling", /<UpDownBetBlockedModal/.test(jsx));
ok("5.3 · …keyed on the receipt nonce, so a burst coalesces instead of inheriting a stale timer",
  /key=\{bet\.placedReceipt\?\.nonce/.test(jsx));
// ⛔ NEVER A NEW PRIMITIVE. Both halves must sit on `OperationResultModal`.
for (const [n, src] of [["receipt", RECEIPT], ["blocked", BLOCKED]] as const) {
  ok(`5.4 · the ${n} modal is built on the shared OperationResultModal`,
    /import \{[^}]*OperationResultModal/.test(src));
  ok(`5.5 · …and rolls no portal of its own`, !/createPortal/.test(src));
}
ok("5.6 · the receipt takes the SIDE tone, never gold (a projection is not earned money)",
  /stripTone=\{placed\.side === "UP" \? "yes" : "no"\}/.test(RECEIPT) && !/stripTone=\{?"gold"/.test(RECEIPT));
ok("5.7 · success auto-dismisses on the SHARED default (no bespoke timer)",
  !/autoCloseMs/.test(RECEIPT), "an autoCloseMs here would be a second definition of the 5s");
ok("5.8 · the refusal does NOT auto-dismiss (LCCP informed consent)",
  /variant="danger"/.test(BLOCKED));
// The projection disclaimer is REUSED, never restated — one sentence, one home.
ok("5.9 · the receipt reuses `udEstimateNote` rather than writing its own disclaimer",
  /t\.market\.udEstimateNote/.test(RECEIPT));

// ───────────────────────────────────────────────────────────────────────────────
console.log("\n§6 · The receipt's 'way out' row is COMPUTED per bet, never a constant");
// ───────────────────────────────────────────────────────────────────────────────
const RULE = read("src/lib/updown-receipt.ts");
const SERVICE = read("src/lib/server/market-service.ts");

ok("6.1 · the modal asks the shared rule", /freeExitMinutesFor\(info, placed\)/.test(RECEIPT));
ok("6.2 · …and offers BOTH answers, because the row has two truthful ones",
  /udRcExitLabel/.test(RECEIPT) && /udRcNoExitLabel/.test(RECEIPT));
ok("6.3 · the minutes are interpolated, never a literal",
  /udRcExitValue\.replace\("\{mins\}", String\(exitMinutes\)\)/.test(RECEIPT));
// ⛔ THE PLACEHOLDER MUST SURVIVE INTO THE DICTIONARY. `docs/RULES.md` §2.9 records a
// shipped defect where `String.replace` left a literal `{min}` on a money screen and every
// "does it name the figure" assertion stayed green.
const exitValues = [...DICT.matchAll(/\budRcExitValue:\s*"([^"]*)"/g)].map((m) => m[1]);
ok("6.4 · `udRcExitValue` exists in three languages", exitValues.length === 3, `found ${exitValues.length}`);
ok("6.5 · …and every one carries the {mins} placeholder the code substitutes",
  exitValues.length === 3 && exitValues.every((v) => v.includes("{mins}")));

// ⭐ THE CLIENT RULE IS PINNED AGAINST THE SERVER EXPRESSION IT MIRRORS. This is the check
// that actually matters: `freeExitMinutesFor` is a restatement of `cashOutValue`'s gate, and
// a restatement with nothing binding it is the two-definitions defect this repo keeps paying
// for. If the server's runway test is reworded, this goes red and the client must follow.
ok("6.6 · the SERVER still gates free exit on runway, in the form the client mirrors",
  /const hadRunway = graceMs > 0 && closesAt - placedAt >= graceMs;/.test(SERVICE),
  "cashOutValue's runway test changed — src/lib/updown-receipt.ts must be re-derived, not patched");
ok("6.7 · …measured to the LOCK instant, not the round's close",
  /const closesAt = market\.selectionClosedAt \? Date\.parse\(market\.selectionClosedAt\) : Date\.parse\(market\.resolutionAt\);/.test(SERVICE));
ok("6.8 · …and the client measures to the same instant",
  /Date\.parse\(info\.selectionClosedAt \?\? info\.closesAt\)/.test(RULE));
ok("6.9 · the SERVER still refuses a bonus-funded exit outright",
  /const bonusFunded = \(position\.bonusStakeTzs \?\? 0\) > 0;/.test(SERVICE));
ok("6.10 · …and the client refuses it FIRST, before consulting runway",
  RULE.indexOf("bonusStakeTzs") < RULE.indexOf("graceMinutes"),
  "checking runway first would promise an exit on a bonus-funded bet the server always refuses");

// The facts the receipt states must come from the server, not the handset.
ok("6.11 · `placedAt` and `bonusStakeTzs` are carried on the server's own bet result",
  /placedAt: string;\n\s*bonusStakeTzs: number;/.test(read("src/lib/server/market-service.ts").replace(/\r\n/g, "\n")));
ok("6.12 · the hook reads them from the reply rather than stamping its own clock",
  /placedAt: placed\.placedAt/.test(read("src/components/updown/use-quick-bet.ts")) &&
  !/placedAt: new Date\(\)/.test(read("src/components/updown/use-quick-bet.ts")));

// ───────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · A dialog that states a problem offers a way out");
// ───────────────────────────────────────────────────────────────────────────────
const ORM = read("src/components/markets/operation-result-modal.tsx");
ok("7.1 · the shared modal always renders a primary action", /primaryLabel \?\? t\.common\.doneSawa/.test(ORM));
ok("7.2 · a failure stays until dismissed", /if \(variant !== "success"\)/.test(ORM));
ok("7.3 · the ghost CTA owns its own dismissal (it used to fight the primary's navigation)",
  /if \(onSecondary\) onSecondary\(\); else onClose\(\)/.test(ORM));
ok("7.4 · the receipt's ghost CTA is omitted when it would navigate to the current page",
  /onWatchRound \? t\.market\.udRcWatchRound : undefined/.test(RECEIPT));
// The twin of 7.3. The primary had the SAME defect the ghost CTA was fixed for — and the
// Enter handler had always been `(onPrimary ?? closeRef.current)()`, so click and keyboard
// disagreed on what "Keep predicting" does. Both halves are ratcheted here.
ok("7.5 · the primary CTA owns its own dismissal, and click agrees with Enter",
  /if \(onPrimary\) onPrimary\(\); else onClose\(\)/.test(ORM) &&
  /\(onPrimary \?\? closeRef\.current\)\(\)/.test(ORM));

// ───────────────────────────────────────────────────────────────────────────────
console.log("\n§8 · The OTHER raw-server-string channel — a ratchet on the banners");
// ───────────────────────────────────────────────────────────────────────────────
//
// 🔴 `test:failure-reasons` §10 reports **0** raw server strings in front of a player, and
// that number is TRUE OF THE CHANNEL IT SCANS AND ONLY THAT ONE. Its pattern is
//
//     /\b(?:title|description):\s*(?!t\.)[A-Za-z_$][\w$]*\.error\b(?!\.)/
//
// — an object PROPERTY, i.e. a toast or modal argument. A form-action page does not report
// that way: it `redirect(...?error=<the server's English sentence>)` and the server component
// renders `{sp.error}` as JSX TEXT inside a `Callout` or a `role="alert"` div. That form
// matches nothing in §10's regex, so the whole channel is outside its denominator — which is
// §5b's "a check adjacent to the truth" exactly, and it is why §10's ceiling of zero must not
// be read as "no player ever sees English prose".
//
// ⛔ FIVE DO TODAY, and one of them is a COMPLIANCE surface: a Swahili or Chinese player who
// trips `setLimits` validation reads *"Invalid value for dailyLossLimit."* Fixing them means
// teaching those services to emit a machine `reason` and routing it through the redirect —
// that is `docs/FAILURE-INVENTORY.md` §2.3's wallet/KYC/auth tranche, an open programme this
// session deliberately does not open. What this ratchet does is stop the number GROWING while
// that tail is worked, and record the honest figure instead of inheriting a zero measured
// somewhere else.
{
  const RAW_BANNER = /\{\s*(?:sp|searchParams|params|q)\s*\.\s*error\s*\}/g;
  // ⭐ POSITIVE CONTROL FIRST — a ratchet whose pattern has gone blind prints "0" in exactly
  // the same words as a clean tree.
  ok("8.0a · control · the pattern CATCHES a banner rendering the server's own sentence",
    new RegExp(RAW_BANNER.source).test(`<Callout tone="danger" live>{sp.error}</Callout>`));
  ok("8.0b · control · …and IGNORES a banner rendering the dictionary",
    !new RegExp(RAW_BANNER.source).test(`<Callout tone="danger" live>{t.error.somethingDidntWork}</Callout>`));

  const seen: string[] = [];
  let count = 0;
  const walk = (d: string): string[] => {
    const out: string[] = [];
    for (const e of readdirSync(d)) {
      const p = `${d}/${e}`;
      if (statSync(p).isDirectory()) out.push(...walk(p));
      else if (p.endsWith(".tsx")) out.push(p);
    }
    return out;
  };
  const files = [...walk("src/app"), ...walk("src/components")].filter((f) => !f.includes("/admin/"));
  for (const f of files) {
    const n = (readFileSync(f, "utf8").match(RAW_BANNER) ?? []).length;
    if (n) { count += n; seen.push(`${f.replace("src/", "")}×${n}`); }
  }
  // The measured population. ⛔ THIS NUMBER MAY ONLY GO DOWN. Lower it in the same commit that
  // fixes one — a ceiling nobody lowers is a budget, not a ratchet.
  //
  // ⭐ 5 → 0 on 2026-08-15. All five surfaces now carry a reason KEY on the redirect and render
  // it through `renderFailure` — the same registry every toast and modal already used — via
  // `src/lib/failure-banner.ts`. The compliance one is the reason this mattered: a Swahili or
  // Chinese player who mistyped a limit read *"Invalid value for dailyLossLimit."*
  //
  // 🔴 AND KEYING THE CHANNEL CLOSED A REFLECTION HOLE. `?error=` rendered whatever the query
  // string said, so a link could put ANY sentence in a styled, first-party alert box in front
  // of a signed-in player on the operator's own domain. React escaped it, so it was never
  // script injection — it was a phishing surface on a licensed money platform. An unrecognised
  // `?reason=` now renders nothing at all.
  const CEILING = 0;
  ok("8.1 · the banner channel has not grown", count <= CEILING, `${count} > ${CEILING} — ${seen.join(" ")}`);
  ok("8.2 · …and if it has SHRUNK, lower the ceiling in the same commit",
    count >= CEILING, `${count} < ${CEILING} — a fix landed; drop CEILING to ${count}`);
  ok("8.3 · control · the tree really was walked", files.length > 40, `${files.length} player .tsx files`);
  console.log(`     (the five, recorded rather than hidden: ${seen.join(" · ")})`);
}

// ───────────────────────────────────────────────────────────────────────────────
console.log("\n§9 · How long a moment stays — one definition site, and the intrusion rule");
// ───────────────────────────────────────────────────────────────────────────────
//
// Ali, 2026-08-15: *"for winning and losing popups … more time … find the most perfect
// amount of time for users to feel excited … not to annoy … keep placing bets popups
// normal … always keep the ability to hide instantly as it is now."*
//
// ⛔ THE NUMBERS ARE PARSED FROM THE MODULE, NOT RESTATED HERE. A guard that hard-codes
// `7_000` is a second definition site of the very value it is protecting — it would go red
// on a deliberate retune and green on a drift at the call sites, which is backwards.
{
  const TIMING = read("src/lib/feedback-timing.ts");
  const num = (name: string): number | null => {
    const m = TIMING.match(new RegExp(`export const ${name} = ([\\d_]+);`));
    return m ? Number(m[1].replace(/_/g, "")) : null;
  };
  const celebration = num("DWELL_CELEBRATION_MS");
  const result = num("DWELL_RESULT_MS");

  if (ok("9.0 · both dwell constants are defined in one module", celebration != null && result != null)) {
    // ⭐ THE INTRUSION RULE, and it reads backwards until you see what it measures. A
    // celebration is a centred modal behind a scrim — it takes the screen, so it may not
    // linger uninvited. A result toast blocks nothing. The ordering is about COST TO THE
    // PLAYER, not importance.
    ok("9.1 · the blocking celebration gets LESS unattended time than the corner toast",
      celebration! < result!, `celebration ${celebration} !< result ${result}`);
    // A moment, not an obstruction. Below ~5s the count-up (~900ms) eats the dwell; past
    // ~10s an undismissed overlay stops being a beat and becomes the "annoy" half.
    ok("9.2 · the celebration is a beat, not an obstruction (5s–8s)",
      celebration! >= 5_000 && celebration! <= 8_000, `${celebration}ms`);
    ok("9.3 · the result announcement is readable but not parked (6s–10s)",
      result! >= 6_000 && result! <= 10_000, `${result}ms`);
    // ⛔ AND IT MUST BE LONGER THAN IT WAS. The whole instruction was "more time".
    ok("9.4 · both are longer than the values they replaced (4.5s / 6s)",
      celebration! > 4_500 && result! > 6_000, `${celebration} / ${result}`);
  }

  // ⛔ NO LITERAL SURVIVES AT A CALL SITE. `6000` was written out FOUR times before this.
  const DWELL_CALLERS = [
    ["src/components/markets/win-celebration.tsx", "DWELL_CELEBRATION_MS"],
    ["src/components/updown/updown-result-announcer.tsx", "DWELL_RESULT_MS"],
    ["src/components/markets/notify-poller.tsx", "DWELL_RESULT_MS"],
  ] as const;
  for (const [f, konst] of DWELL_CALLERS) {
    const src = stripComments(read(f));
    ok(`9.5 · ${f.split("/").pop()} reads ${konst}`, src.includes(konst));
    // The old literals, in either spelling, must be gone from the code (comments may
    // still narrate them — that is history, and stripComments is why it is allowed).
    const literals = src.match(/(?:durationMs:\s*|setTimeout\([^,]+,\s*)(?:6_?000|4_?500)\b/g) ?? [];
    ok(`9.6 · …and carries no hard-coded dwell literal`, literals.length === 0, literals.join(" "));
  }

  // ⭐ A WIN AND A LOSS ARE TIMED IDENTICALLY, DELIBERATELY. They are one channel and one
  // class, and §F exists to stop two actions of the same kind answering differently. Giving
  // a win longer than a loss would be the platform leaning on the outcome it prefers —
  // which §C4 ("losses are calm, factual, final") forbids in as many words.
  for (const f of ["src/components/updown/updown-result-announcer.tsx", "src/components/markets/notify-poller.tsx"]) {
    const src = stripComments(read(f));
    const uses = (src.match(/durationMs:\s*DWELL_RESULT_MS/g) ?? []).length;
    ok(`9.7 · ${f.split("/").pop()} times its win, loss and void the same`, uses >= 2, `${uses} sites`);
  }

  // ⛔ "KEEP PLACING BETS POPUPS NORMAL" — the bet path must NOT have moved.
  const QUICK = stripComments(read("src/components/updown/use-quick-bet.ts"));
  // ⭐ THE RULING IS ABOUT THE DURATION, NOT ABOUT WHERE THE 3000 IS TYPED. This required a
  // numeric LITERAL at the call site, so it went red when the dwell moved into
  // `feedback-timing.ts` — which is the module §F8 created to own dwells, and which 9.7 four
  // lines up ALREADY reads constants from. Resolve the value the same way 9.7 does, so Ali's
  // "keep it normal" is still enforced as 3 seconds however it is spelled.
  // Reuses `num()` from 9.0 above — the same reader that already resolves the other dwell
  // constants, so there is one way to read this module in this file and not two.
  const betDwellExpr = QUICK.match(/durationMs:\s*([A-Za-z_$][\w$]*|\d+)/)?.[1] ?? "";
  const betDwellMs = /^\d+$/.test(betDwellExpr) ? Number(betDwellExpr) : (num(betDwellExpr) ?? 0);
  ok("9.8 · the bet-placed toast is untouched at 3s (Ali: keep it normal)",
    betDwellMs === 3000, `${betDwellExpr || "no durationMs"} → ${betDwellMs}ms`);
  ok("9.9 · the shared modal's 5s default is untouched",
    /const DEFAULT_AUTO_CLOSE_MS = 5_000;/.test(read("src/components/markets/operation-result-modal.tsx")));

  // ⛔ INSTANT DISMISSAL IS UNCHANGED — the ceiling is on WAITING, never a floor on watching.
  const CELEB = read("src/components/markets/win-celebration.tsx");
  ok("9.10 · the celebration still closes on ✕ / click-outside / Esc",
    /onClose=\{dismiss\}/.test(CELEB) && /onClick=\{dismiss\}/.test(CELEB),
    "a longer dwell is only acceptable because leaving is instant");
  // And a FAILURE is still sticky — a dwell change must never have swept one up.
  ok("9.11 · money-path failures are still sticky (durationMs: 0), not merely long",
    /durationMs:\s*0/.test(QUICK));
}

// ───────────────────────────────────────────────────────────────────────────────
console.log("\n§10 · The secondary stands down while the primary is up — and NOTHING is dropped");
// ───────────────────────────────────────────────────────────────────────────────
//
// ⭐ §F1 says the popup is the PRIMARY signal on a consequential mutation and the corner toast
// is the SECONDARY one. At 360px the toast stack covered the bet receipt's CREST for the
// toast's first 3 seconds; at 768 and above there is room for both, which is exactly why it
// survived — the two fire together by design and only the narrowest viewport collides.
//
// ⛔ THE TWO WAYS OF GETTING THIS WRONG, BOTH ASSERTED AGAINST:
//
//   ① RESTACK Z-INDEX GLOBALLY. Toasts sit ABOVE modals on purpose, so a failure fired while a
//      CONFIRM dialog is open stays readable. That ordering is a safety property; trading it
//      for a 360px overlap would swap a cosmetic collision for a lost failure message.
//   ② DROP THE HELD TOAST. A sticky money-path failure (`durationMs: 0`, the shape UD-3
//      requires so a refusal stays until read) swallowed because a modal happened to be open
//      is a refusal the player NEVER SAW — strictly worse than the overlap being fixed.
{
  const PRESENCE = read("src/lib/result-modal-presence.ts");

  ok("10.1 · the result modal registers its presence — one place, so every result popup counts",
    /useResultModalPresence\(open\)/.test(ORM),
    "OperationResultModal is the bet receipt, the block, the wallet result and the sell result");
  ok("10.2 · the toast provider SUBSCRIBES, rather than the modal reaching up to hide it",
    /subscribeResultModal\(setResultModalOpen\)/.test(TOAST));

  // ⛔ ① — no z-index anywhere in the suppression. The mechanism is presence, not stacking.
  // ⚠️ COMMENTS STRIPPED FIRST. The first version of this line searched the raw file and failed
  // on the module's OWN header, which explains at length why this is NOT a z-index change — a
  // guard tripping over the prose that documents it is a false positive, and one that would
  // have been "fixed" by deleting the explanation.
  ok("10.3 · ⛔ the fix touches NO z-index — a confirm-dialog failure must stay readable",
    !/z-?index/i.test(stripComments(PRESENCE)) && !/zIndex/.test(stripComments(PRESENCE)),
    "restacking toasts under modals would trade a cosmetic overlap for a lost failure message");

  // ⛔ ② — NOTHING IS DROPPED, and the mechanism is what guarantees it.
  //
  // 🔴 THE FIRST IMPLEMENTATION ASKED `isResultModalOpen()` INSIDE `toast()` and pushed to a
  // queue. Every assertion here passed, `red:feedback-law` caught all three of its mutations,
  // and driving a real bet at 360 in three languages showed the toast ON SCREEN over the
  // receipt anyway: the quick-bet fires its toast in the same commit that mounts the modal, and
  // presence is registered from an EFFECT, so at that instant the modal was not open yet.
  // ⛔ A check whose answer depends on which effect ran first is a coin flip — and it landed
  // the same way every time, which is exactly what made it look like a working fix.
  //
  // ⭐ So the assertions below pin the REACTIVE shape, which has no such instant: the toast is
  // stacked normally and the VIEWPORT holds it, with countdowns paused meanwhile.
  ok("10.4 · ⭐ the viewport HOLDS rather than the arrival path deciding",
    /if \(held\) return null;/.test(TOAST) && /held=\{resultModalOpen\}/.test(TOAST),
    "a decision taken when the toast arrives races the effect that registers the modal");
  ok("10.5 · ⛔ …and a held toast is never removed from the stack — nothing to re-queue, nothing to lose",
    !/heldRef/.test(TOAST),
    "a side queue is a second place a money-path refusal can be dropped from");
  ok("10.6 · ⭐ countdowns PAUSE while held and resume after, so nothing expires unseen",
    /if \(resultModalOpen\) \{\s*if \(!prevModalOpenRef\.current\) userPausedRef\.current\.clear\(\);\s*for \(const id of ids\) pause\(id\);/.test(TOAST) &&
    /\} else if \(prevModalOpenRef\.current\) \{\s*for \(const id of ids\) if \(!userPausedRef\.current\.has\(id\)\) resume\(id\);/.test(TOAST),
    "reusing the hover machinery gives a held toast its full dwell once it is actually on screen");
  // 🔴 THE RELEASE IS AN EDGE, AND IT RESPECTS WHO IS HOLDING. The first version of this
  // effect resumed on every `toasts` change — an ARRIVAL, not a modal closing — so a burst
  // re-armed the real dismiss timer under a toast the pointer was resting on while
  // `ToastItem`'s own `paused` state kept its bar frozen. The player watched a half-full bar
  // and the toast disappeared mid-sentence. Both halves are load-bearing: without the edge a
  // stack change wakes everything; without the set, the modal closing overrules a hover.
  // ⚠️ The third clause bans the unconditional release in BOTH its spellings — the original
  // one-liner AND a braced `} else {` block. A ban on only the shape that happened to ship
  // is a ban a re-formatter walks straight through.
  ok("10.6b · ⛔ …and the release is EDGE-driven and never wakes a toast the POINTER is holding",
    /prevModalOpenRef/.test(TOAST) && /userPausedRef/.test(TOAST) &&
    !/else\s*\{?\s*for \(const id of ids\) resume\(id\);/.test(TOAST),
    "resuming on every `toasts` change restarts a hover-paused timer while its bar stays frozen");
  ok("10.6c · ⛔ the viewport is handed the ATTRIBUTED callbacks, not the raw primitives",
    /onPause=\{userPause\}/.test(TOAST) && /onResume=\{userResume\}/.test(TOAST),
    "if the provider cannot tell a pointer-hold from a modal-hold, it cannot honour either");
  ok("10.7 · ⛔ a STICKY money-path failure has no countdown to lose in the first place",
    /Sticky \(durationMs 0\): no countdown at all/.test(TOAST));

  // ⚠️ THE CLEANUP IS THE LOAD-BEARING HALF. A modal that unmounts while open — a route change
  // during the 5s auto-close, an ordinary thing for a player to do — must still release its
  // count. A leaked count silences EVERY toast on the site until reload: total, and silent.
  ok("10.8 · ⚠️ presence is released on unmount, not only on a close prop",
    /return \(\) => \{\s*openCount = Math\.max\(0, openCount - 1\);/.test(PRESENCE),
    "a leaked count would silence every toast on the site until reload");
  ok("10.9 · …and it COUNTS rather than flags, so overlapping modals cannot clear each other",
    /let openCount = 0;/.test(PRESENCE) && /openCount \+\+|openCount\+\+/.test(PRESENCE));
}

// ⛔ COUNTED AFTER THE LAST ASSERTION, NOT BEFORE. Appending §10 below this line once put the
// total — and `process.exit` — ahead of nine checks, so they printed after the verdict and
// could not fail the run.
const total = pass + fails.length;

console.log(`\nfeedback-law: ${pass} passed, ${fails.length} failed  (of ${total})`);
if (fails.length) {
  console.log("\nFAILURES:");
  for (const f of fails) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("feedback-law: OK — one answer per class of action, and every refusal names its way out.");
