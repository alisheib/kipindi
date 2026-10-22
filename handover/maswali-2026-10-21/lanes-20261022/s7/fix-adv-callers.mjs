// Gives S7's adversarial child the reviewed fields S5-FIX-SRV's API requires (the merge's caller sweep).
// Each edit names its line, the exact text that must be there, and the text it becomes; any mismatch aborts unwritten.
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
const src = readFileSync(file, "utf8");
const eol = src.includes("\r\n") ? "\r\n" : "\n";
const lines = src.split(eol);

const HELPERS = [
  "/**",
  " * S5-FIX-SRV's reviewed fields, read as the console reads them (the S7 × S5 merge's caller sweep): a correction and a",
  " * confirmation name the seal they reviewed (A4/A5), a move the close it reviewed (A3), a draft edit the row it read (A5)",
  " * and an attestation the draft it read (3+A4) — each the state as it stands, so every case here meets the check it was",
  " * written for, never a stale-review refusal in its place.",
  " */",
  "const reviewedSeal = async (weekId: string, slot: number) => {",
  "  const q = (await dal.questionStore.listForWeek(weekId)).find((x: any) => x.slot === slot);",
  "  return { expectedOutcome: q?.outcome, expectedSealedAt: q?.sealedAt };",
  "};",
  "const reviewedClose = async (weekId: string) => ({ expectedClosesAt: (await dal.weekStore.get(weekId))?.closesAt });",
  "const rowVersion = async (weekId: string, slot: number) =>",
  "  ({ version: W.svc.draftRowVersion((await dal.questionStore.listForWeek(weekId)).find((x: any) => x.slot === slot)) });",
  "const readVersion = async (weekId: string) => ({ readVersion: await W.svc.readDraftVersion(weekId) });",
];

// [1-based line, needle that must occur once on that line, replacement]
const EDITS = [
  [160, "W.svc.attestParity({ weekId: c.week.id,", "W.svc.attestParity({ ...(await readVersion(c.week.id)), weekId: c.week.id,"],
  [266, "W.svc.moveClose({ weekId: wk.id,", "W.svc.moveClose({ ...(await reviewedClose(wk.id)), weekId: wk.id,"],
  [280, "W.svc.moveClose({ weekId: wk.id,", "W.svc.moveClose({ ...(await reviewedClose(wk.id)), weekId: wk.id,"],
  [308, "W.svc.moveClose({ weekId: fw.id,", "W.svc.moveClose({ ...(await reviewedClose(fw.id)), weekId: fw.id,"],
  [452, "W.svc.correctSeal({ weekId: wk.id, slot: 8,", "W.svc.correctSeal({ ...(await reviewedSeal(wk.id, 8)), weekId: wk.id, slot: 8,"],
  [455, "W.svc.correctSeal({ weekId: wk.id, slot: 8,", "W.svc.correctSeal({ ...(await reviewedSeal(wk.id, 8)), weekId: wk.id, slot: 8,"],
  [458, "W.svc.correctSeal({ weekId: wk.id, slot: 8,", "W.svc.correctSeal({ ...(await reviewedSeal(wk.id, 8)), weekId: wk.id, slot: 8,"],
  [459, "W.svc.correctSeal({ weekId: wk.id, slot: 8,", "W.svc.correctSeal({ ...(await reviewedSeal(wk.id, 8)), weekId: wk.id, slot: 8,"],
  [505, "W.svc.correctSeal({ weekId: wk.id, slot: 11,", "W.svc.correctSeal({ ...(await reviewedSeal(wk.id, 11)), weekId: wk.id, slot: 11,"],
  [535, "W.svc.correctSeal({ weekId: wk.id, slot: 7,", "W.svc.correctSeal({ ...(await reviewedSeal(wk.id, 7)), weekId: wk.id, slot: 7,"],
  [561, "W.svc.correctSeal({ weekId: wk.id, slot: 6,", "W.svc.correctSeal({ ...(await reviewedSeal(wk.id, 6)), weekId: wk.id, slot: 6,"],
  [1054, "W.svc.confirmSeal({ weekId: wk.id, slot: 11,", "W.svc.confirmSeal({ ...(await reviewedSeal(wk.id, 11)), weekId: wk.id, slot: 11,"],
  [1055, "W.svc.confirmSeal({ weekId: wk.id, slot: 11,", "W.svc.confirmSeal({ ...(await reviewedSeal(wk.id, 11)), weekId: wk.id, slot: 11,"],
  [1101, "W.svc.confirmSeal({ weekId: wk.id, slot: 1,", "W.svc.confirmSeal({ ...(await reviewedSeal(wk.id, 1)), weekId: wk.id, slot: 1,"],
  [1224, "W.svc.editDraftQuestion({ weekId: uk.id, slot: 1,", "W.svc.editDraftQuestion({ ...(await rowVersion(uk.id, 1)), weekId: uk.id, slot: 1,"],
  [1225, "W.svc.attestParity({ weekId: uk.id,", "W.svc.attestParity({ ...(await readVersion(uk.id)), weekId: uk.id,"],
  [1238, "W.svc.editDraftQuestion({ weekId: us.id, slot: 1,", "W.svc.editDraftQuestion({ ...(await rowVersion(us.id, 1)), weekId: us.id, slot: 1,"],
  [1239, "W.svc.editDraftQuestion({ weekId: us.id, slot: 2,", "W.svc.editDraftQuestion({ ...(await rowVersion(us.id, 2)), weekId: us.id, slot: 2,"],
  [1242, "W.svc.attestParity({ weekId: us.id,", "W.svc.attestParity({ ...(await readVersion(us.id)), weekId: us.id,"],
  [1306, "W.svc.moveClose({ weekId: wk.id,", "W.svc.moveClose({ ...(await reviewedClose(wk.id)), weekId: wk.id,"],
  [1314, "W.svc.moveClose({ weekId: wk.id,", "W.svc.moveClose({ ...(await reviewedClose(wk.id)), weekId: wk.id,"],
];

const bad = [];
for (const [n, needle, repl] of EDITS) {
  const l = lines[n - 1];
  if (l === undefined || l.split(needle).length !== 2) { bad.push(`${n}: ${JSON.stringify(needle)} not exactly once in ${JSON.stringify(l?.slice(0, 120))}`); continue; }
  lines[n - 1] = l.replace(needle, repl);
}
// The helpers go after `owedOnceAfterCommit`'s closing line.
const anchor = lines.findIndex((l, i) => l === "};" && lines[i - 1]?.includes("return mine.length === 1 && (STORE !== \"postgres\" || !mine[0].underLock);"));
if (anchor < 0) bad.push("the helpers' anchor (owedOnceAfterCommit's end) was not found");
if (bad.length) { console.error("ABORTED, nothing written:\n" + bad.join("\n")); process.exit(1); }
lines.splice(anchor + 1, 0, ...HELPERS);
writeFileSync(file, lines.join(eol));
console.log(`${EDITS.length} calls given their reviewed fields; ${HELPERS.length} helper lines added after line ${anchor + 1}`);
