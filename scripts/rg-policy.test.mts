/**
 * test:rg-policy — EVERY PROMISE ON /legal/responsible-gambling §4 HAS A CONTROL BEHIND IT (marketing U12, D12).
 *
 * 🔴 WHY. §4 ("Operator responsibilities") was written at the baseline commit (2026-06-05) and never checked
 * against the code. Two of its four bullets had nothing behind them: "no marketing to … players under 25 in
 * vulnerability segments" (no age band, no segment) and "no sign-up nudges in the late-night window" (no window).
 * The page had no version pin and no text hash, so it could be edited — or left promising — without anyone
 * noticing. Re-versioned 2026-09-26 on Ali's delegation (docs/COMPLIANCE-DECISIONS.md 2026-09-26): the under-25
 * promise BUILT, the late-night bullet CUT.
 *
 * WHAT IT HOLDS:
 *   §1 · the version: the same date on all three META labels, a hash of the binding ENGLISH block (so a change to
 *        the binding text without a new version is red), and a COMPLIANCE-DECISIONS heading for that version.
 *   §2 · every English §4 bullet maps to at least one NAMED control, and each control is present in the code it
 *        names — ⛔ a bullet that maps to nothing is a promise with no control, which is D12 exactly. Swahili and
 *        Chinese carry the same number of bullets.
 *   ⭐ Mapping by the PROMISE's words, not the bullet's position: reordering the list cannot move a control onto
 *      the wrong promise, and adding a promise without a control cannot pass.
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

process.exitCode = 1;
const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

/** Move BOTH in the same commit as any change to the binding English text, with a COMPLIANCE-DECISIONS entry. */
export const RG_POLICY_VERSION = "2026-09-26";
export const RG_EN_SHA = "f16606e75d46";

type World = {
  page: string; consent: string; rg: string; featureState: string; footer: string; compliance: string;
  windowExists: boolean;
};
const REAL: World = {
  page: read("src/app/legal/responsible-gambling/page.tsx"),
  consent: decomment(read("src/lib/server/marketing/consent.ts")),
  rg: decomment(read("src/lib/server/marketing/rg.ts")),
  featureState: decomment(read("src/lib/feature-state.ts")),
  footer: read("src/components/layout/public-footer.tsx"),
  compliance: read("docs/COMPLIANCE-DECISIONS.md"),
  windowExists: existsSync(join(ROOT, "src/lib/marketing/window.ts")),
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
      world: { ...REAL, compliance: REAL.compliance.replace(/RG Policy v2026-09-26/g, "RG Policy vXXXX") }, expect: /^1\.3 / },
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
