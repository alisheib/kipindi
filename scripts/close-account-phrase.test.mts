/**
 * THE CLOSE-ACCOUNT PHRASE IS IN THE PLAYER'S LANGUAGE — `npm run test:close-account-phrase` (in `predeploy`).
 *
 * ⭐ WHY (2026-09-14, session 96, register E-400 ⑦c). The account-closure form asked Swahili and Chinese players to type
 * the English phrase "CLOSE MY ACCOUNT" inside a sentence in their own language, because the server action compared the
 * input with that one literal. And the form trimmed the input while the action did not, so a phrase with a trailing
 * space enabled the button and was then refused. One module now owns the phrase per locale and the rule
 * (`src/lib/close-account-phrase.ts`); this suite proves the rule, the wiring and the words.
 *
 *   §1 · the rule, EXECUTED: every locale's phrase is accepted, whitespace-tolerant, and near misses are refused
 *   §2 · the words: each locale's error sentence names that locale's phrase, and the dictionary keeps the three apart
 *   §3 · the wiring: the form and the action both ask the rule; no English literal is compared anywhere in src
 *   §4 · planted controls: the shipped defects, re-planted into copies, must be reported
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { CLOSE_ACCOUNT_PHRASE, isCloseAccountConfirmation } from "../src/lib/close-account-phrase.ts";
import { dict } from "../src/lib/i18n-dict.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, why = "", evidence = "") => {
  cond ? pass++ : fail++;
  const tail = evidence ? ` — ${evidence}` : (!cond && why ? ` — ${why}` : "");
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${tail}`);
};
const code = (src: string) => src.replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
type Loc = "en" | "sw" | "zh";
const LOCS: Loc[] = ["en", "sw", "zh"];

/* §1 · the rule, executed ─────────────────────────────────────────────────── */
console.log("\n§1 · the rule");
ok("§1a each locale has its own, distinct phrase", new Set(LOCS.map((l) => CLOSE_ACCOUNT_PHRASE[l])).size === 3,
  "", LOCS.map((l) => `${l}=${CLOSE_ACCOUNT_PHRASE[l]}`).join(" · "));
ok("§1b every locale's phrase is accepted", LOCS.every((l) => isCloseAccountConfirmation(CLOSE_ACCOUNT_PHRASE[l])));
ok("§1c …with the spaces a phone keyboard adds around it or inside it",
  LOCS.every((l) => isCloseAccountConfirmation(`  ${CLOSE_ACCOUNT_PHRASE[l].replace(/ /g, "  ")} `)));
ok("§1d near misses are refused: empty, partial, lowercase Latin, a different sentence",
  !isCloseAccountConfirmation("") && !isCloseAccountConfirmation("CLOSE MY") && !isCloseAccountConfirmation("close my account")
  && !isCloseAccountConfirmation("funga akaunti yangu") && !isCloseAccountConfirmation("关闭账户") && !isCloseAccountConfirmation("DELETE MY ACCOUNT"));

/* §2 · the words ──────────────────────────────────────────────────────────── */
console.log("\n§2 · each locale's refusal names its own phrase");
const errs = Object.fromEntries(LOCS.map((l) => [l, (dict as unknown as Record<Loc, { error: { errCloseConfirm: string } }>)[l].error.errCloseConfirm])) as Record<Loc, string>;
function wordDefects(e: Record<Loc, string>): string[] {
  const d: string[] = [];
  for (const l of LOCS) {
    if (!e[l]?.includes(CLOSE_ACCOUNT_PHRASE[l])) d.push(`${l} errCloseConfirm does not name "${CLOSE_ACCOUNT_PHRASE[l]}": ${e[l]}`);
    for (const other of LOCS) if (other !== l && e[l]?.includes(CLOSE_ACCOUNT_PHRASE[other])) d.push(`${l} errCloseConfirm names the ${other} phrase`);
  }
  return d;
}
ok("§2a en/sw/zh errCloseConfirm each carry their own phrase and no other", wordDefects(errs).length === 0, wordDefects(errs).join("; "));

/* §3 · the wiring ─────────────────────────────────────────────────────────── */
console.log("\n§3 · the form and the action ask one rule");
const FORM = "src/app/profile/account/close-account-form.tsx";
const ACTION = "src/app/profile/account/actions.ts";
function wiringDefects(form: string, action: string): string[] {
  const d: string[] = [];
  const f = code(form), a = code(action);
  if (!/const canSubmit = isCloseAccountConfirmation\(confirm\);/.test(f)) d.push("the form's button does not ask isCloseAccountConfirmation");
  if (!/const phrase = CLOSE_ACCOUNT_PHRASE\[locale\] \?\? CLOSE_ACCOUNT_PHRASE\.en;/.test(f) || !/>\{phrase\}<\/span>/.test(f)) d.push("the form does not show the locale's phrase");
  if (!/if \(!isCloseAccountConfirmation\(confirm\)\) \{/.test(a)) d.push("the action does not ask isCloseAccountConfirmation");
  if (/CLOSE MY ACCOUNT/.test(f) || /CLOSE MY ACCOUNT/.test(a)) d.push("an English literal is still compared or shown in the form or the action");
  return d;
}
ok("§3a the form's button and the server action both use the one rule, and the form shows the locale's phrase",
  wiringDefects(read(FORM), read(ACTION)).length === 0, wiringDefects(read(FORM), read(ACTION)).join("; "));
function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}
const literalSites = walk(join(ROOT, "src"))
  .filter((p) => /CLOSE MY ACCOUNT/.test(code(readFileSync(p, "utf8"))))
  .map((p) => relative(ROOT, p).replace(/\\/g, "/"))
  .sort();
ok("§3b the English phrase appears in exactly two source files: the phrase module and the English dictionary",
  JSON.stringify(literalSites) === JSON.stringify(["src/lib/close-account-phrase.ts", "src/lib/i18n-dict.ts"]), "", literalSites.join(", "));

/* §4 · planted controls ───────────────────────────────────────────────────── */
console.log("\n§4 · planted controls");
const form = read(FORM), action = read(ACTION);
const plantedAction = action.replace("if (!isCloseAccountConfirmation(confirm)) {", 'if (confirm !== "CLOSE MY ACCOUNT") {');
const plantedForm = form.replace("const canSubmit = isCloseAccountConfirmation(confirm);", 'const canSubmit = confirm.trim() === "CLOSE MY ACCOUNT";');
ok("§4a control · the planted copies found their targets", plantedAction !== action && plantedForm !== form);
ok("§4b control · the shipped action (an English literal compare) is reported", wiringDefects(form, plantedAction).length > 0,
  "", wiringDefects(form, plantedAction).join("; "));
ok("§4c control · the shipped form (trim + English literal) is reported", wiringDefects(plantedForm, action).length > 0,
  "", wiringDefects(plantedForm, action).join("; "));
ok("§4d control · a Swahili sentence still naming the English phrase is reported",
  wordDefects({ ...errs, sw: "Andika CLOSE MY ACCOUNT kama ilivyoonyeshwa ili kuthibitisha." }).length > 0);

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 10) { console.error(`!! only ${pass + fail} assertions ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
