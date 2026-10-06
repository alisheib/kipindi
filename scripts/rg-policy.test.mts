/**
 * test:rg-policy — EVERY PROMISE ON /legal/responsible-gambling §4 HAS A CONTROL BEHIND IT (marketing U12, D12).
 *
 * 🔴 WHY. §4 ("Operator responsibilities") was written at the baseline commit (2026-06-05) and never checked
 * against the code. Two of its four bullets had nothing behind them: "no marketing to … players under 25 in
 * vulnerability segments" (no age band, no segment) and "no sign-up nudges in the late-night window" (no window).
 * The page had no version pin and no text hash, so it could be edited — or left promising — without anyone
 * noticing. Re-versioned 2026-09-26 on Ali's delegation (docs/COMPLIANCE-DECISIONS.md § "2026-09-26 · RG Policy v2026-09-26"): the under-25
 * promise BUILT, the late-night bullet CUT. Re-versioned 2026-10-06 on the owner's ruling (§ "… RG Policy v2026-10-06"): the
 * "free helpline displayed on every page footer" bullet CUT with the helpline itself, and §5's national helpline line with it.
 *
 * WHAT IT HOLDS:
 *   §1 · the version: the same date on all three META labels, a hash of the binding ENGLISH block (so a change to
 *        the binding text without a new version is red), and a COMPLIANCE-DECISIONS heading for that version.
 *   §2 · every English §4 bullet maps to at least one NAMED control, and each control is present in the code it
 *        names — ⛔ a bullet that maps to nothing is a promise with no control, which is D12 exactly. Swahili and
 *        Chinese carry the same number of bullets.
 *   ⭐ Mapping by the PROMISE's words, not the bullet's position: reordering the list cannot move a control onto
 *      the wrong promise, and adding a promise without a control cannot pass.
 *   §3 · zh/sw typography (2026-09-26 visual audit, prod-rg-s4-zh-360.png): a number keeps its unit (`&nbsp;`), and no
 *        Chinese sentence runs across a source line break — JSX prints that break as a space ("生效。 所有控制项").
 *        3.3 (2026-09-27 re-review, local-rg-zh-360.png): a number RANGE sits whole in a whitespace-nowrap span — the
 *        en dash is a break point, and the late-night window broke "（00:00–" / "06:00 EAT）" at 360.
 *        3.4 (2026-09-27 final visual review, local-rg-s3-zh-360.png): the zh §2 settings link is whitespace-nowrap —
 *        it broke "负责任博彩设" / "置", the underlined label split mid-term.
 *        Translations only, so the binding-English hash does not move.
 *   §4 · KEPT_PROMISES (marketing U33p, 2026-10-04) — §4's first bullet is an ADMIN-EDITED line now (`legal.policy_lines`),
 *        and the save refuses a promise the code does not keep by reading `src/lib/legal/kept-promises.ts`. So that map
 *        is held here, against the same source the controls above read:
 *        K1 · every `KEPT_PROMISES` value equals its control's presence in the code (a map that says "kept" for a window
 *             nobody built would let the save publish it) — the two age promises held APART (review F13): "anyone whose
 *             age we cannot confirm" by the gate's PLAYER branch, "a non-player only after staff confirm in writing" by
 *             its CONTACT branch; the frequency cap (F2) by U14's module or the gate's own refusal;
 *        K2 · the save's validator, run on every promise word — the English phrases, a clock time, a frequency, and the
 *             Swahili and Chinese words in their own boxes (F3): refused when the promise is unkept, accepted when kept.
 *   ⭐ The page is read with its `PolicyLine` tags stripped (`scripts/lib/policy-line-source.mts`): the wrapper prints a
 *      SAVED line, and its children — the literal bullet, byte for byte the page before U33p — until then. So §1-§3 read
 *      exactly the text the page prints while nothing is saved, and the English hash pin holds untouched; a SAVED line is
 *      held at the save by K1's map and the validator K2 exercises.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: `--prove-red` plants every defect IN MEMORY; this file makes no file-writing call.
 *
 * Run:  npm run test:rg-policy        Red:  npm run red:rg-policy
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { stripPolicyLineTags } from "./lib/policy-line-source.mts";
import { KEPT_PROMISES, PROMISE_KEYS, type KeptPromise, type PromiseKey } from "../src/lib/legal/kept-promises.ts";
import { POLICY_LINE_DEFAULTS, policyLineProblems } from "../src/lib/legal/policy-lines.ts";

process.exitCode = 1;
const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

/** Move BOTH in the same commit as any change to the binding English text, with a COMPLIANCE-DECISIONS entry. */
export const RG_POLICY_VERSION = "2026-10-06";
export const RG_EN_SHA = "b9897a0ebf5d";

type World = {
  page: string; consent: string; rg: string; featureState: string; footer: string; compliance: string;
  windowExists: boolean;
  /** U33p (F2) · U14's per-person frequency cap — its module, when it exists. */
  capExists: boolean;
  /** U33p · the map the policy-line save reads, and the save's validator — each swappable, so a red case plants one. */
  kept: Readonly<Record<PromiseKey, KeptPromise>>;
  validate: typeof policyLineProblems;
};
const REAL: World = {
  // ⭐ U33p · read with the `PolicyLine` tags stripped — today's text, byte for byte (see the header's §4 note).
  page: stripPolicyLineTags(read("src/app/legal/responsible-gambling/page.tsx")),
  consent: decomment(read("src/lib/server/marketing/consent.ts")),
  rg: decomment(read("src/lib/server/marketing/rg.ts")),
  featureState: decomment(read("src/lib/feature-state.ts")),
  footer: read("src/components/layout/public-footer.tsx"),
  compliance: read("docs/COMPLIANCE-DECISIONS.md"),
  windowExists: existsSync(join(ROOT, "src/lib/marketing/window.ts")),
  capExists: existsSync(join(ROOT, "src/lib/server/marketing/frequency-cap.ts")),
  kept: KEPT_PROMISES,
  validate: policyLineProblems,
};

/* ══ THE CONTROLS — each §4 promise, found by its words, and what must exist in code for it to be true ══ */
type Control = { id: string; when: RegExp; holds: (w: World) => boolean; where: string };
const CONTROLS: Control[] = [
  { id: "self-excluded", when: /self-excluded/i, where: "marketing/rg.ts refuses rg_self_excluded",
    holds: (w) => /refuse\("rg_self_excluded"/.test(w.rg) },
  { id: "break", when: /on a break/i, where: "marketing/rg.ts refuses rg_cooling_off",
    holds: (w) => /refuse\("rg_cooling_off"/.test(w.rg) },
  { id: "harm", when: /sign of harm/i, where: "marketing/rg.ts refuses rg_harm_marker",
    holds: (w) => /refuse\("rg_harm_marker"/.test(w.rg) },
  { id: "age", when: /under 18|age we cannot confirm/i, where: "marketing/consent.ts refuses age_minor AND age_unknown",
    holds: (w) => /refuse\("age_minor"/.test(w.consent) && /refuse\("age_unknown"/.test(w.consent) },
  { id: "under-25", when: /under 25/i, where: "marketing/consent.ts: MARKETING_YOUNG_ADULT_AGE = 25 and refuse(\"rg_under25_history\")",
    holds: (w) => /MARKETING_YOUNG_ADULT_AGE\s*=\s*25\b/.test(w.consent) && /refuse\("rg_under25_history"/.test(w.consent) },
  { id: "bonus", when: /bonus/i, where: "feature-state.ts: bonus WITHDRAWN (if the bonus returns, re-check this promise)",
    holds: (w) => /bonus:\s*"WITHDRAWN"/.test(w.featureState) },
  // ⛔ Since the owner's ruling of 2026-10-06 the footer renders no helpline, so this control does NOT hold — a helpline
  // promise put back on the page is a promise with nothing behind it, and §2.2 refuses it.
  { id: "helpline", when: /helpline/i, where: "public-footer.tsx renders {HELPLINE()}",
    holds: (w) => /\{HELPLINE\(\)\}/.test(w.footer) },
  { id: "late-night", when: /late[- ]night/i, where: "src/lib/marketing/window.ts (U13) — it does not exist, so the promise may not either",
    holds: (w) => w.windowExists },
];

/* ══ THE PAGE ═══════════════════════════════════════════════════════════════════════════════════════ */
function blocks(page: string): { en: string; sw: string; zh: string } {
  const at = (k: string) => page.indexOf(`\n  ${k}: (`);
  const end = page.indexOf("\n}; }");
  return { en: page.slice(at("en"), at("sw")), sw: page.slice(at("sw"), at("zh")), zh: page.slice(at("zh"), end) };
}
const section4 = (block: string) => {
  const i = block.indexOf('<LegalSection n="4"');
  return i === -1 ? "" : block.slice(i, block.indexOf("</LegalSection>", i));
};
const bullets = (sec: string) => [...sec.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
const enSha = (en: string) => createHash("sha256").update(en.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);

/* ══ §4 · KEPT_PROMISES, HELD TO THE CODE (U33p) ════════════════════════════════════════════════════ */
const LF = String.fromCharCode(10);
/** A named control above holds in this world. */
const controlHolds = (id: string, w: World): boolean => CONTROLS.find((c) => c.id === id)?.holds(w) === true;
/** The gate's contact branch — everything in `mayReceiveMarketingSms` from its LAST ledger read (the branch for a number no
 *  account holds) to the function's end. Today it ends `refuse("age_unknown", …)`; U33a-G keeps that line's refusal. */
function contactBranch(consent: string): string {
  const at = consent.indexOf("export async function mayReceiveMarketingSms(");
  if (at < 0) return "";
  const end = consent.indexOf(`${LF}}${LF}`, at);
  const body = consent.slice(at, end < 0 ? consent.length : end);
  const from = body.lastIndexOf("const latest = await Promise.resolve(reads.latestConsent(key));");
  return from < 0 ? "" : body.slice(from);
}
/** The gate's PLAYER branch — everything in `mayReceiveMarketingSms` BEFORE its contact branch: an account's own checks.
 *  Today it refuses `age_unknown` when the identity record or the date of birth cannot be read (review F13). */
function playerBranch(consent: string): string {
  const at = consent.indexOf("export async function mayReceiveMarketingSms(");
  if (at < 0) return "";
  const end = consent.indexOf(`${LF}}${LF}`, at);
  const body = consent.slice(at, end < 0 ? consent.length : end);
  const from = body.lastIndexOf("const latest = await Promise.resolve(reads.latestConsent(key));");
  return from < 0 ? "" : body.slice(0, from);
}
/** ⛔ What each promise's control IS in the code — the same reads as §2's controls, split where one control holds two. */
const KEPT_CONTROL: Record<PromiseKey, (w: World) => boolean> = {
  selfExcluded: (w) => controlHolds("self-excluded", w),
  onBreak: (w) => controlHolds("break", w),
  harmSign: (w) => controlHolds("harm", w),
  under18: (w) => w.consent.includes('refuse("age_minor"'),
  // ⭐ F13 · two promises, two controls: the player branch's age refusal, and the contact branch's.
  ageUnconfirmed: (w) => playerBranch(w.consent).includes('refuse("age_unknown"'),
  staffConfirmedAge: (w) => contactBranch(w.consent).includes('refuse("age_unknown"'),
  under25: (w) => controlHolds("under-25", w),
  lateNight: (w) => controlHolds("late-night", w),
  // F2 · U14 builds it: its module, or the gate refusing on it.
  frequencyCap: (w) => w.capExists || w.consent.includes('refuse("frequency_cap"'),
};
/** A clock time stands for a window too (the late-night promise's other spelling) — read in every language. */
const CLOCK_SAMPLE = "between 22:00 and 06:00";
/** A frequency is the cap's own spelling of its promise — in English, Swahili and Chinese. */
const FREQUENCY_SAMPLE = "at most two messages a week";
const SW_FREQUENCY_SAMPLE = "mara 2 kwa wiki";
const ZH_FREQUENCY_SAMPLE = "每周最多两条";

type Result = { label: string; ok: boolean; extra?: string };
function check(w: World): Result[] {
  const out: Result[] = [];
  const b = blocks(w.page);
  out.push({ label: "0.1 · ⚠️ CONTROL — the en, sw and zh blocks were found", ok: b.en.length > 500 && b.sw.length > 500 && b.zh.length > 500 });
  // §1 · the version
  const meta = /const META[\s\S]*?\n\};/.exec(w.page)?.[0] ?? "";
  out.push({ label: `1.1 · the page is dated ${RG_POLICY_VERSION} in all three languages`,
    ok: [`Version ${RG_POLICY_VERSION} `, `Toleo ${RG_POLICY_VERSION} `, `版本 ${RG_POLICY_VERSION} `].every((s) => meta.includes(s)), extra: meta.slice(0, 200) });
  out.push({ label: "1.2 · ⭐ the binding English is the text that version was issued for — a change needs a new version",
    ok: enSha(b.en) === RG_EN_SHA, extra: `sha ${enSha(b.en)} ≠ pinned ${RG_EN_SHA}` });
  out.push({ label: `1.3 · docs/COMPLIANCE-DECISIONS.md records RG Policy v${RG_POLICY_VERSION}`,
    ok: new RegExp(`^## .*RG Policy v${RG_POLICY_VERSION.replace(/\./g, "\\.")}\\b`, "m").test(w.compliance) });
  // §2 · every promise has a control
  const en = bullets(section4(b.en));
  out.push({ label: `2.0 · ⚠️ CONTROL — §4's English bullets were read (${en.length})`, ok: en.length >= 3 });
  for (const text of en) {
    const matched = CONTROLS.filter((c) => c.when.test(text));
    out.push({ label: `2.1 · ⛔ every §4 promise maps to a named control — "${text.slice(0, 60)}…"`, ok: matched.length > 0,
      extra: "a promise with no control behind it (D12)" });
    for (const c of matched) {
      out.push({ label: `2.2 · the "${c.id}" control holds — ${c.where}`, ok: c.holds(w) });
    }
  }
  out.push({ label: "2.3 · Swahili and Chinese carry the same number of §4 bullets as the binding English",
    ok: bullets(section4(b.sw)).length === en.length && bullets(section4(b.zh)).length === en.length,
    extra: `en ${en.length} · sw ${bullets(section4(b.sw)).length} · zh ${bullets(section4(b.zh)).length}` });
  // §3 · zh/sw typography — read with comments removed, so a note ABOUT the rule cannot trip it
  const zh = decomment(b.zh), sw = decomment(b.sw);
  const split = [
    ...[...zh.matchAll(/第[ \t]+\d|\d[ \t]+(?:小时|分钟|岁|节|周|个月|天|EAT)/g)].map((m) => `zh "${m[0]}"`),
    ...[...sw.matchAll(/\b(?:miaka|sehemu ya|saa|dakika|wiki|mwezi|miezi|siku) \d|\d[ \t]+EAT/g)].map((m) => `sw "${m[0]}"`),
  ];
  out.push({ label: "3.1 · zh and sw keep each number with its unit (&nbsp;), so a line never ends on the bare number",
    ok: split.length === 0, extra: split.join(" | ") });
  const breaks = [...zh.matchAll(/(?:\p{Script=Han}|[。，、；：）])[ \t]*\n[ \t]*(?:\p{Script=Han}|[（])/gu)].map((m) => m[0].replace(/\s+/g, "⏎"));
  out.push({ label: "3.2 · zh: no Chinese sentence runs across a source line break (JSX prints it as a space)",
    ok: breaks.length === 0, extra: breaks.join(" | ") });
  // A range outside a nowrap span can break after its en dash. The count is the control: a reader that finds no
  // range at all (zh and sw carry three each) must not pass.
  const NOWRAP = /<span className="whitespace-nowrap">[^<]*<\/span>/g;
  const RANGE = /\d[\d:]*–\d[\d:]*/g;
  const ranges = [...zh.matchAll(RANGE), ...sw.matchAll(RANGE)].length;
  const loose = [
    ...[...zh.replace(NOWRAP, "").matchAll(RANGE)].map((m) => `zh "${m[0]}"`),
    ...[...sw.replace(NOWRAP, "").matchAll(RANGE)].map((m) => `sw "${m[0]}"`),
  ];
  out.push({ label: "3.3 · zh and sw keep every number range whole in a whitespace-nowrap span (the en dash is a break point)",
    ok: ranges >= 4 && loose.length === 0, extra: loose.length ? `outside a span: ${loose.join(" | ")}` : `only ${ranges} ranges found` });
  // The §2 settings link names one page; underlined in gold and split mid-term it reads as two. zh only: the en block is
  // the hashed binding text, and sw wraps between words. A missing link fails too, so the check cannot pass on nothing.
  const zhLink = /<a href="\/profile\/responsible-gambling" className="([^"]*)"/.exec(zh)?.[1];
  out.push({ label: "3.4 · zh: the Responsible Gambling settings link stays on one line (whitespace-nowrap)",
    ok: zhLink !== undefined && zhLink.split(/\s+/).includes("whitespace-nowrap"),
    extra: zhLink === undefined ? "the zh settings link was not found" : `className="${zhLink}"` });
  // §4 · KEPT_PROMISES (U33p) — the map the policy-line save trusts, held to the code it describes
  const drift = PROMISE_KEYS.filter((k) => w.kept[k].kept !== KEPT_CONTROL[k](w));
  out.push({ label: "4.0 · ⚠️ CONTROL — every promise has a control reader, and the player and contact branches of the gate were found",
    ok: PROMISE_KEYS.every((k) => typeof KEPT_CONTROL[k] === "function") && contactBranch(w.consent).length > 0
      && playerBranch(w.consent).includes("mayReceiveMarketingSms"),
    extra: `player branch ${playerBranch(w.consent).length} · contact branch ${contactBranch(w.consent).length} characters` });
  out.push({ label: "4.1 · K1 · ⛔ every KEPT_PROMISES value equals its control's presence in the code — the policy-line save never trusts a promise nothing enforces",
    ok: drift.length === 0,
    extra: drift.map((k) => `${k}: the map says ${w.kept[k].kept}, the code says ${KEPT_CONTROL[k](w)}`).join(" | ") });
  const misjudged: string[] = [];
  let judged = 0;
  const RG_TODAY = POLICY_LINE_DEFAULTS["rg.marketing"];
  for (const k of PROMISE_KEYS) {
    const p = w.kept[k];
    // Every word of the promise, in the box of the language it is written in (F3: Swahili and Chinese too).
    const samples: Array<{ locale: "en" | "sw" | "zh"; word: string }> = [
      ...p.phrases.map((word) => ({ locale: "en" as const, word })),
      ...(p.anyLanguage.length > 0 ? [{ locale: "en" as const, word: CLOCK_SAMPLE }] : []),
      ...(p.patterns.length > 0 ? [{ locale: "en" as const, word: FREQUENCY_SAMPLE }] : []),
      ...p.sw.map((word) => ({ locale: "sw" as const, word })),
      ...p.zh.map((word) => ({ locale: "zh" as const, word })),
      ...(p.swPatterns.length > 0 ? [{ locale: "sw" as const, word: SW_FREQUENCY_SAMPLE }] : []),
      ...(p.zhPatterns.length > 0 ? [{ locale: "zh" as const, word: ZH_FREQUENCY_SAMPLE }] : []),
    ];
    for (const { locale, word } of samples) {
      judged++;
      const texts = {
        en: locale === "en" ? `No marketing messages to ${word}, at any time.` : RG_TODAY.en,
        sw: locale === "sw" ? `${RG_TODAY.sw} ${word}` : RG_TODAY.sw,
        zh: locale === "zh" ? `${RG_TODAY.zh}${word}` : RG_TODAY.zh,
      };
      const verdict = w.validate("rg.marketing", texts);
      const refused = verdict.problems[locale].some((x) => x.code === "promise_unkept");
      if (refused === p.kept) misjudged.push(`"${word}" (${k}, ${locale}, ${p.kept ? "kept" : "unkept"}) was ${refused ? "refused" : "accepted"}`);
    }
  }
  out.push({ label: "4.2 · K2 · the policy-line save refuses every word of an unkept promise and accepts every word of a kept one",
    ok: misjudged.length === 0 && judged >= PROMISE_KEYS.length,
    extra: misjudged.length > 0 ? misjudged.join(" | ") : `only ${judged} words judged` });
  return out;
}

if (!PROVE_RED) {
  let fails = 0;
  for (const r of check(REAL)) {
    if (!r.ok) fails++;
    console.log(`${r.ok ? "PASS" : "FAIL"} ${r.label}${!r.ok && r.extra ? ` — ${r.extra}` : ""}`);
  }
  const n = check(REAL).length;
  console.log(`\nrg-policy: ${n - fails} passed, ${fails} failed`);
  process.exitCode = fails === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  const base = check(REAL).filter((r) => !r.ok);
  if (base.length) problems.push(`BASELINE is already red: ${base.map((r) => r.label).join(" | ")}`);
  console.log(`§0 baseline · the real page and code: ${base.length === 0 ? "clean" : "RED"}\n`);
  const enBlock = blocks(REAL.page).en;
  const withEn = (en: string): string => REAL.page.replace(enBlock, en);
  const firstLi = "<li>No bonus offers tied to deposit increases</li>";
  // U33p · K1's plants: the age clause for a number no account holds removed from the gate (its LAST age_unknown refusal).
  const lastAgeUnknown = REAL.consent.lastIndexOf('refuse("age_unknown"');
  const contactAgeDropped = lastAgeUnknown < 0 ? REAL.consent
    : `${REAL.consent.slice(0, lastAgeUnknown)}refuse("account_status"${REAL.consent.slice(lastAgeUnknown + 'refuse("age_unknown"'.length)}`;
  if (contactAgeDropped === REAL.consent) problems.push("K1 plant: the contact branch's age refusal was not found");
  // F13 · the PLAYER branch's age refusals removed (every age_unknown in the gate before its contact branch), the contact
  // branch's kept — so the "whose age we cannot confirm" promise loses its control while the staff promise keeps its own.
  const gateAt = REAL.consent.indexOf("export async function mayReceiveMarketingSms(");
  const contactAt = REAL.consent.lastIndexOf("const latest = await Promise.resolve(reads.latestConsent(key));");
  const playerAgeDropped = gateAt < 0 || contactAt < gateAt ? REAL.consent
    : REAL.consent.slice(0, gateAt) + REAL.consent.slice(gateAt, contactAt).split('refuse("age_unknown"').join('refuse("account_status"')
      + REAL.consent.slice(contactAt);
  if (playerAgeDropped === REAL.consent) problems.push("K1 plant: the player branch's age refusals were not found");
  const CASES: Array<{ name: string; world: World; expect: RegExp }> = [
    { name: "a new §4 promise with NO control behind it (the D12 shape)",
      world: { ...REAL, page: withEn(enBlock.replace(firstLi, `${firstLi}\n          <li>No marketing messages between 22:00 and 06:00 EAT</li>`)) }, expect: /^2\.1 /},
    { name: "the under-25 rule removed from the gate while the page still promises it",
      world: { ...REAL, consent: REAL.consent.replace(/refuse\("rg_under25_history"/g, 'refuse("account_status"') }, expect: /"under-25" control holds/ },
    { name: "the binding English edited without a new version",
      world: { ...REAL, page: withEn(enBlock.replace("No marketing messages, ever,", "No marketing messages")) }, expect: /^1\.2 / },
    { name: "the late-night bullet restored with no window in code",
      world: { ...REAL, page: withEn(enBlock.replace(firstLi, `${firstLi}\n          <li>No sign-up nudges in the late-night window</li>`)) }, expect: /"late-night" control holds/ },
    { name: "the bonus comes back while the page still says no deposit-linked bonuses",
      world: { ...REAL, featureState: REAL.featureState.replace(/bonus:\s*"WITHDRAWN"/, 'bonus: "ACTIVE"') }, expect: /"bonus" control holds/ },
    { name: "a translation drops a §4 bullet",
      world: { ...REAL, page: REAL.page.replace("<li>Hakuna ofa za bonasi zinazohusishwa na ongezeko la fedha zinazowekwa</li>", "") }, expect: /^2\.3 / },
    { name: "the version bumped with no COMPLIANCE-DECISIONS record",
      world: { ...REAL, compliance: REAL.compliance.replace(/RG Policy v2026-10-06/g, "RG Policy vXXXX") }, expect: /^1\.3 / },
    { name: "the helpline bullet restored while no page footer shows a helpline (the owner's ruling, 2026-10-06)",
      world: { ...REAL, page: withEn(enBlock.replace(firstLi, `${firstLi}\n          <li>Free helpline displayed on every page footer</li>`)) }, expect: /"helpline" control holds/ },
    { name: "zh: an age split from its unit again ('低于 25' / '岁' at 360)",
      world: { ...REAL, page: REAL.page.replace("低于 25&nbsp;岁", "低于 25 岁") }, expect: /^3\.1 / },
    { name: "sw: 'miaka 18' back to a plain space",
      world: { ...REAL, page: REAL.page.replace("miaka&nbsp;18", "miaka 18") }, expect: /^3\.1 / },
    { name: "zh: the §2 sentences split across two source lines again ('生效。 所有控制项')",
      world: { ...REAL, page: REAL.page.replace("小时后生效。所有控制项", "小时后生效。\n          所有控制项") }, expect: /^3\.2 / },
    { name: "zh: the late-night range out of its span again ('（00:00–' / '06:00 EAT）' at 360)",
      world: { ...REAL, page: REAL.page.replace('<span className="whitespace-nowrap">（00:00–06:00&nbsp;EAT）</span>', "（00:00–06:00&nbsp;EAT）") }, expect: /^3\.3 / },
    { name: "sw: 'dakika 5–120' out of its span again",
      world: { ...REAL, page: REAL.page.replace('<span className="whitespace-nowrap">dakika&nbsp;5–120</span>', "dakika&nbsp;5–120") }, expect: /^3\.3 / },
    { name: "zh: the settings link can break mid-term again ('负责任博彩设' / '置' at 360)",
      world: { ...REAL, page: REAL.page.replace('className="whitespace-nowrap text-gold-300 hover:text-gold-200', 'className="text-gold-300 hover:text-gold-200') }, expect: /^3\.4 / },
    { name: "K1 · KEPT_PROMISES says the late-night window is kept while src/lib/marketing/window.ts does not exist",
      world: { ...REAL, kept: { ...REAL.kept, lateNight: { ...REAL.kept.lateNight, kept: true } } }, expect: /^4[.]1 / },
    { name: "K1 · the gate stops refusing a number no account holds on age, while KEPT_PROMISES still says the promise is kept",
      world: { ...REAL, consent: contactAgeDropped }, expect: /^4[.]1 / },
    { name: "K1 · F13 · the gate stops refusing a player whose age cannot be read, while KEPT_PROMISES still says that promise is kept",
      world: { ...REAL, consent: playerAgeDropped }, expect: /^4[.]1 / },
    { name: "K1 · F2 · KEPT_PROMISES says the frequency cap is kept while no cap exists in code",
      world: { ...REAL, kept: { ...REAL.kept, frequencyCap: { ...REAL.kept.frequencyCap, kept: true } } }, expect: /^4[.]1 / },
    { name: "K1 · F2 · U14 builds the cap while KEPT_PROMISES still says it is unkept (the map must flip in the same commit)",
      world: { ...REAL, capExists: true }, expect: /^4[.]1 / },
    { name: "K2 · F3 · the policy-line save reads only the English — a Swahili or Chinese late-night promise is published",
      world: { ...REAL, validate: (key, raw) => {
        const v = policyLineProblems(key, raw);
        return { ...v, problems: { ...v.problems, sw: v.problems.sw.filter((x) => x.code !== "promise_unkept"), zh: v.problems.zh.filter((x) => x.code !== "promise_unkept") } };
      } }, expect: /^4[.]2 / },
    { name: "K2 · the policy-line save lets a late-night promise through (its unkept-promise rule removed)",
      world: { ...REAL, validate: (key, raw) => {
        const v = policyLineProblems(key, raw);
        return { ...v, problems: { ...v.problems, en: v.problems.en.filter((p) => p.code !== "promise_unkept") } };
      } }, expect: /^4[.]2 / },
  ];
  let caught = 0;
  for (const [i, c] of CASES.entries()) {
    const failed = check(c.world).filter((r) => !r.ok).map((r) => r.label);
    const hit = failed.some((l) => c.expect.test(l));
    if (hit) caught++; else problems.push(`case ${i + 1} (${c.name}): not caught — failed: ${failed.join(" | ") || "nothing"}`);
    console.log(`${hit ? "CAUGHT" : "MISSED"}  ${c.name}`);
  }
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) { console.log("\nPROBLEMS:"); for (const p of problems) console.log(`  ✗ ${p}`); process.exitCode = 1; }
  else { console.log("RED PROOF COMPLETE"); process.exitCode = 0; }
}
