/**
 * test:maswali-register — THE WEEK REGISTER, AS THE TILE READ ASKED (MASWALI-BUILD S5 VIS-R, 2026-10-19: the consolidated
 * findings' §B R1–R11 and §A on the register's two pages; MASWALI-PLAN §7b S5 item 1; DESIGN_AUTHORITY §M8a).
 *
 *   npx tsx scripts/maswali-register.test.mts               (npm run test:maswali-register)
 *   npx tsx scripts/maswali-register.test.mts --prove-red   (npm run red:maswali-register)
 *
 *   §1 R3 · the outcome stamp says "Result ·" once: its default text is unchanged wherever it is drawn, `label={false}`
 *      says the outcome alone, and the component passes the choice through
 *   §2 R11 · the officer beside an attested time: every real seal is a staff officer's (`requireStaff` on `trading`), so
 *      the dev seed seals as a real staff account — a MODERATOR, created before the first seal — and the register reads
 *      its role ("Results officer"), never "—"
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect in an IN-MEMORY copy — a source string, a dictionary
 *    value or a helper — and requires the check it targets to fail; a plant whose text is not in its file exactly once is
 *    INCONCLUSIVE, never a pass. No file is written.
 * Pure: it reads source files and runs the pure helpers. No server, no database, no network.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dict } from "../src/lib/i18n-dict.ts";
import { outcomeWord } from "../src/lib/side-label.ts";
import { outcomeStampText } from "../src/components/maswali/maswali-outcome-stamp.tsx";
import { DEFAULT_GRANTS } from "../src/lib/server/roles.ts";
import { decomment } from "./lib/decomment.mts";

process.exitCode = 1;
const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const raw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const squash = (s: string) => s.replace(/\s+/g, " ");
const j = (v: unknown) => JSON.stringify(v);
const LOCALES = ["en", "sw", "zh"] as const;
const OUTCOMES = ["YES", "NO", "VOID"] as const;

/** The files the checks read, as written (comments are stripped per check, through the one shared scanner). */
const FILES = {
  stamp: "src/components/maswali/maswali-outcome-stamp.tsx",
  seed: "src/app/api/dev-test/seed-maswali/route.ts",
  gates: "src/lib/server/control-gates.ts",
  week: "src/app/millionea/register/[week]/page.tsx",
} as const;
type FileKey = keyof typeof FILES;

/** Everything a check may look at — the real one, or a copy with one defect planted. */
type World = {
  src: Record<FileKey, string>;
  dict: typeof dict;
  stampText: typeof outcomeStampText;
};
const REAL: World = {
  src: Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, raw(f)])) as Record<FileKey, string>,
  dict,
  stampText: outcomeStampText,
};
const code = (w: World, k: FileKey) => squash(decomment(w.src[k]));

type Check = { id: string; label: string; run: (w: World) => [boolean, string] };
const CHECKS: Check[] = [];
const check = (id: string, label: string, run: (w: World) => [boolean, string]) => CHECKS.push({ id, label, run });

// ── §1 · R3 · the outcome stamp says "Result ·" once ────────────────────────────────────────────────────────────────
check("1.1", "the stamp's default text is unchanged — \"Result · <the platform's outcome word>\" in every language, for YES, NO and VOID (en \"Result · Void\")", (w) => {
  const off = LOCALES.flatMap((l) => OUTCOMES.filter((o) => w.stampText(w.dict[l] as never, o) !== `${w.dict[l].millionea.stampResult} · ${outcomeWord(w.dict[l] as never, o, "MASWALI")}`).map((o) => `${l}/${o}`));
  const en = w.stampText(w.dict.en as never, "VOID");
  return [off.length === 0 && en === "Result · Void", j({ off, en })];
});
check("1.2", "`label = false` says the outcome alone — the platform's own word, nothing before it (en \"Void\", sw \"Batili\", zh \"已作废\")", (w) => {
  const off = LOCALES.flatMap((l) => OUTCOMES.filter((o) => w.stampText(w.dict[l] as never, o, false) !== outcomeWord(w.dict[l] as never, o, "MASWALI")).map((o) => `${l}/${o}`));
  const got = LOCALES.map((l) => w.stampText(w.dict[l] as never, "VOID", false));
  return [off.length === 0 && j(got) === j(["Void", "Batili", "已作废"]), j({ off, got })];
});
check("1.3", "the component defaults to the label and hands its `label` prop to the text — every existing call site draws exactly what it did", (w) => {
  const s = code(w, "stamp");
  const sig = s.includes('export function MaswaliOutcomeStamp({ t, outcome, press, index = 0, size = "caption", label = true, className }: {');
  const pass = s.includes("const stampText = outcomeStampText(t, outcome, label);");
  return [sig && pass, j({ sig, pass })];
});

// ── §2 · R11 · the officer beside an attested time ──────────────────────────────────────────────────────────────────
check("2.1", "a seal needs the `trading` act grant, and a MODERATOR holds it by default (the seed's sealer is a role the product lets seal)", (w) => {
  const domain = /sealMaswaliQuestion:\s*"(\w+)"/.exec(decomment(w.src.gates))?.[1];
  const grant = (DEFAULT_GRANTS as Record<string, Record<string, { canAct: boolean } | undefined>>).MODERATOR?.[domain ?? ""];
  return [domain === "trading" && grant?.canAct === true, j({ domain, grant })];
});
check("2.2", "the dev seed creates its sealer as a MODERATOR account (role written to the user row) BEFORE the first seal, and every seal is made by that account", (w) => {
  const s = code(w, "seed");
  const id = s.includes('const SEALER = "usr_dev_sealer";');
  const roleWritten = s.includes('async function player(balance: number, role: "PLAYER" | "MODERATOR" = "PLAYER", id = `usr_${randomId(12)}`): Promise<string> {')
    && s.includes("failedLoginCount: 0, lockedUntil: null, role, status:");
  const made = s.indexOf('await player(0, "MODERATOR", SEALER);');
  const firstSeal = s.indexOf("await closeAndSeal(");
  const sealsBy = s.includes("officerId: SEALER,") && !s.includes('officerId: "usr_dev_sealer"');
  return [id && roleWritten && made > 0 && firstSeal > made && sealsBy, j({ id, roleWritten, made, firstSeal, sealsBy })];
});
check("2.3", "the register prints the officer's ROLE for every sealed question whose sealer has one — never a name, \"—\" only when no role can be read", (w) => {
  const s = code(w, "week");
  return [s.includes('const role = (q: Q) => (q.sealerRole ? t.millionea.officerRole : "—");'), "the role line"];
});

// ── the run ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function runAll(w: World, quiet: boolean): { pass: number; fail: number; failed: string[] } {
  let pass = 0, fail = 0;
  const failed: string[] = [];
  for (const c of CHECKS) {
    let ok = false, detail = "";
    try { [ok, detail] = c.run(w); } catch (e) { detail = `threw: ${String((e as Error).message ?? e)}`; }
    if (ok) pass++; else { fail++; failed.push(c.id); }
    if (!quiet) console.log(`${ok ? "PASS" : "FAIL"} ${c.id} · ${c.label}${ok ? "" : ` — ${detail}`}`);
  }
  return { pass, fail, failed };
}

if (!PROVE_RED) {
  const { pass, fail } = runAll(REAL, false);
  console.log(`\n${"═".repeat(70)}\n  MASWALI REGISTER: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
  /** The floor is the count a green run PRINTS; it only rises, to a printed number. */
  const MIN_ASSERTIONS = 6;
  if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
  process.exit(fail === 0 ? 0 : 1);
}

// ── --prove-red: every check must be able to fail. Each plant lives on an in-memory copy. ─────────────────────────────
const base = runAll(REAL, true);
if (base.fail !== 0) { console.log(`INCONCLUSIVE: the real tree already fails ${base.failed.join(", ")}`); process.exit(1); }
const problems: string[] = [];
/** A copy of the world with `from` replaced by `to` in one file — inconclusive unless `from` is there exactly once. */
const plantSrc = (k: FileKey, from: string, to: string): World | null => {
  const n = REAL.src[k].split(from).length - 1;
  if (n !== 1) { problems.push(`PLANT MISSED in ${FILES[k]}: ${j(from.slice(0, 80))} is there ${n} times, not once`); return null; }
  return { ...REAL, src: { ...REAL.src, [k]: REAL.src[k].replace(from, to) } };
};
const oldStampText: typeof outcomeStampText = (t, o) => `${t.millionea.stampResult} · ${outcomeWord(t, o, "MASWALI")}`;
const PLANTS: Array<[string, string, World | null]> = [
  ["the stamp before R3 — the label always said (`label` ignored)", "1.2", { ...REAL, stampText: oldStampText }],
  ["the label dropped by default — every existing stamp loses \"Result ·\"", "1.1", { ...REAL, stampText: (t, o, label = false) => oldStampText(t, o).slice(label ? 0 : `${t.millionea.stampResult} · `.length) }],
  ["the component no longer hands its prop to the text", "1.3", plantSrc("stamp", "const stampText = outcomeStampText(t, outcome, label);", "const stampText = outcomeStampText(t, outcome);")],
  ["the component's default flipped to no label", "1.3", plantSrc("stamp", 'size = "caption", label = true, className }', 'size = "caption", label = false, className }')],
  ["the seed before R11 — it seals as an id with no account behind it", "2.2", plantSrc("seed", '    await player(0, "MODERATOR", SEALER);\n', "")],
  ["the sealer made after the weeks were sealed", "2.2", (() => {
    const w = plantSrc("seed", '    await player(0, "MODERATOR", SEALER);\n', "");
    return w && { ...w, src: { ...w.src, seed: w.src.seed.replace("    const w4 = await draft(", '    await player(0, "MODERATOR", SEALER);\n    const w4 = await draft(') } };
  })()],
  ["the sealer created as a player (the role never written)", "2.2", plantSrc("seed", "failedLoginCount: 0, lockedUntil: null, role, status:", 'failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status:')],
  ["a seal that no longer needs the trading grant", "2.1", plantSrc("gates", 'sealMaswaliQuestion: "trading"', 'sealMaswaliQuestion: "compliance"')],
  ["the register naming every sealer \"—\"", "2.3", plantSrc("week", '(q.sealerRole ? t.millionea.officerRole : "—")', '(q.sealerRole ? "—" : "—")')],
];
let caught = 0;
for (const [name, target, world] of PLANTS) {
  if (!world) { console.log(`INCONCLUSIVE (plant did not apply)  ${name}`); continue; }
  const r = runAll(world, true);
  const hit = r.failed.includes(target);
  if (hit) caught++; else problems.push(`BLIND: ${target} stayed green with "${name}" planted`);
  console.log(`${(hit ? "PROVED" : "BLIND").padEnd(36)} ${target} · ${name}`);
}
for (const p of problems) console.log(`!! ${p}`);
console.log(`\n${caught}/${PLANTS.length} caught`);
process.exit(caught === PLANTS.length && problems.length === 0 ? 0 : 1);
