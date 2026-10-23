/**
 * test:millionea-titles — EVERY MILLIONEA BELL TITLE LEADS WITH ITS EVENT (MASWALI-BUILD FLOW 15; the lead's ruling of
 * 2026-10-23 on FLOW's N1: "Every Millionea bell title leads with its event: 'Tiketi imekatwa · Millionea Wiki 49' … the same
 * order in en and zh, as the bell's other notices do. One rule across every Millionea emitter").
 *
 *   npx tsx scripts/millionea-titles.test.mts               (npm run test:millionea-titles)
 *   npx tsx scripts/millionea-titles.test.mts --prove-red   (npm run red:millionea-titles — each plant on disk, restored)
 *
 * THE DEFECT: the classic bell draws a title on ONE truncated line, and every Millionea title put the week first, so at
 * phone width the event was the part cut ("Millionea Wiki 47 · Tike…", "Millionea Wiki 46 · Pin…"; the receipt's body never
 * says "bought").
 * §1 THE RULE (`millioneaTitle`, notification-service.ts): the event, " · ", then the week, in all three languages.
 * §2 THE CENSUS: every Millionea emitter (each `notify…Millionea…` function) titles through the rule, and none writes a
 *    title of its own; the receipt alone keeps a bare week for a dictionary that cannot be read.
 * The exact titles each emitter writes, on both stores, are test:maswali-notify's (re-pinned at FLOW 15); the drawn bell is
 * FLOW 15's recorded walk. Pure and static: it reads one file; no server, no database.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { MUTATIONS } from "./anchors/millionea-titles.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SELF = "scripts/millionea-titles.test.mts";

if (process.argv.includes("--prove-red")) {
  let caught = 0, missed = 0;
  for (const plant of MUTATIONS) {
    const target = resolve(ROOT, plant.file);
    const before = readFileSync(target, "utf8");
    try {
      writeFileSync(target, injectDefect(before, plant.from, plant.to));
      const run = spawnSync(process.execPath, ["--import", "tsx", SELF], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
      const out = `${run.stdout}\n${run.stderr}`;
      const red = run.status !== 0 && plant.failure.test(out);
      if (red) caught++; else missed++;
      console.log(`${red ? "RED caught" : "MISSED"}: ${plant.name}${red ? "" : ` — exit ${run.status}; ${out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 3).join(" | ")}`}`);
    } finally {
      writeFileSync(target, before);
    }
    if (readFileSync(target, "utf8") !== before) { console.log(`FILE LEFT DIRTY: ${plant.file}`); missed++; }
  }
  console.log(`\nmillionea-titles RED: ${caught}/${MUTATIONS.length} caught, ${missed} missed`);
  process.exit(missed === 0 && caught === MUTATIONS.length ? 0 : 1);
}

let passed = 0, failed = 0;
const ok = (name: string, condition: boolean, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (condition) passed++; else failed++;
};
const src = decomment(readFileSync(resolve(ROOT, "src/lib/server/notification-service.ts"), "utf8").replace(/\r\n/g, "\n"));
const flat = (s: string) => s.replace(/\s+/g, " ");

/** Each top-level function whose name names Millionea's notices — its name and its body, by brace matching. */
function emitters(text: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  for (const m of text.matchAll(/^export (?:async )?function (notify(?:Admin)?Millionea\w*)\(/gm)) {
    let i = text.indexOf("{", text.indexOf(")", m.index ?? 0)), depth = 0, q: string | null = null;
    const start = i;
    for (; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === "\\") { i++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === "`") { q = c; continue; }
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) break; }
    }
    out.push({ name: m[1], body: text.slice(start, i + 1) });
  }
  return out;
}

// ── §1 · the rule ───────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the rule");
ok("1.1 · ⭐ `millioneaTitle` writes the event first, then \" · \", then the week — in en, sw and zh",
  flat(src).includes("function millioneaTitle(event: LocalizedText, w: LocalizedText): { titleEn: string; titleSw: string; titleZh: string } { return { titleEn: `${event.en} · ${w.en}`, titleSw: `${event.sw} · ${w.sw}`, titleZh: `${event.zh} · ${w.zh}` }; }"));

// ── §2 · the census ─────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · the census of Millionea's emitters");
const all = emitters(src);
const notifying = all.filter((e) => e.body.includes("millioneaNotify({"));
const titled = notifying.filter((e) => e.body.includes("millioneaTitle("));
const ownTitle = notifying.filter((e) => {
  const literal = (e.body.match(/titleEn: [^,\n]+/g) ?? []).filter((t) => t !== "titleEn: w.en");
  return literal.length > 0;
});
ok("2.1 · ⭐ every Millionea emitter titles through the one rule — none writes a title of its own",
  notifying.length >= 12 && titled.length === notifying.length && ownTitle.length === 0,
  JSON.stringify({ emitters: notifying.length, titled: titled.length, own: ownTitle.map((e) => e.name) }));
const weekFirst = /title(?:En|Sw|Zh): (?:[^,\n]*\? )?`\$\{w\.(?:en|sw|zh)\}/;
ok("2.2 · ⛔ no Millionea title starts with the week (`${w.en} · …`, `${w.en} voided`)",
  !notifying.some((e) => weekFirst.test(e.body)), notifying.filter((e) => weekFirst.test(e.body)).map((e) => e.name).join(", "));
ok("2.3 · the receipt alone keeps the bare week, and only when the slip's word cannot be read",
  flat(src).includes("...(bought ? millioneaTitle(bought, w) : { titleEn: w.en, titleSw: w.sw, titleZh: w.zh }),")
    && notifying.filter((e) => e.body.includes("titleEn: w.en")).map((e) => e.name).join() === "notifyMillioneaTicketsCut");
const NAMES = ["notifyMillioneaTicketsCut", "notifyMillioneaTicketCancelled", "notifyMillioneaSalesClosed", "notifyMillioneaQuestionVoided",
  "notifyMillioneaQuestionCorrected", "notifyMillioneaCloseMoved", "notifyMillioneaWon", "notifyMillioneaWonHeld", "notifyMillioneaNotWon",
  "notifyMillioneaWeekRefunded", "notifyMillioneaObjectionDecided", "notifyAdminMillioneaObjectionFiled"];
const missing = NAMES.filter((n) => !titled.some((e) => e.name === n));
ok("2.4 · the twelve emitters the ruling names — purchase, cancel, sales closed, close moved, void, correction, won, held, not won, week void, objection decided and filed — are each in the census",
  missing.length === 0, missing.join(", "));

const FLOOR = 5;
ok(`floor · at least ${FLOOR} checks ran before this one`, passed + failed >= FLOOR, `${passed + failed} ran`);
console.log(`\nmillionea-titles: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
