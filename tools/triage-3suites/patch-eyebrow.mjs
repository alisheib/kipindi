// Patches scripts/design-gate/eyebrow-roles.mjs: re-keys the two declarations whose element text was edited, and declares
// the five sites nobody had read. Keys come from the gate's own census (never typed by hand). CRLF-preserving.
import { readFileSync, writeFileSync } from "node:fs";
import { census } from "./eyebrow-census-lib.mjs";

const ROOT = "F:/kipindi-rot2";
const FILE = `${ROOT}/scripts/design-gate/eyebrow-roles.mjs`;
const DRY = process.argv.includes("--dry");

const raw = readFileSync(FILE, "utf8");
const NL = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(NL);

const before = await census(ROOT, FILE);
console.log(`before: ${before.undeclared.length} undeclared, ${before.missNot.length} stale`);

const ENTRY = /^ {2}\[("(?:[^"\\]|\\.)*"),\s*("[A-Z_]+"|\["[A-Z_]+",\s*\d+\])\],?\s*$/;
const parse = (l) => { const m = ENTRY.exec(l); return m ? { key: JSON.parse(m[1]), role: m[2] } : null; };
const entryLine = (key, role) => `  [${JSON.stringify(key)}, ${role}],`;
const head = (key) => key.split(" ↵ ")[0];

// what each undeclared site is, READ (see the report): where -> role, and the note that goes above it
const READ = {
  "app/admin/compliance/page.tsx:440": { rekey: true, note: [
    "  // ⚠️ RE-KEYED 2026-10-08. Same element, same role: the readout under the reality-check bar. The key carries the element's",
    "  // text, and b151d874 (2026-09-20) took the dead `{continued}` term out of it — this gate went red on that edit, as designed.",
  ] },
  "app/api/og/market/[id]/route.tsx:200": { rekey: true, note: [
    "  // ⚠️ RE-KEYED 2026-10-08. Same element, same role: the lean word between the YES and NO figures. 871b0844 (2026-09-27)",
    "  // made its text `{settled ? settled.poolCaption : price.lean}` — a settled card says \"Final pool\", an open one still leans.",
  ] },
  "app/admin/finance/page.tsx:253": { role: '"OTHER"', note: [] },
  "app/admin/finance/page.tsx:262": { role: '"OTHER"', note: [
    "  // 2026-10-08 · READ, not guessed (64d0ee80, 2026-09-25). \"Statutory\" and \"This view\" caption the two exports beside them —",
    "  // the fixed statutory month, or the window on screen. A caption beside a control, not the label over a block: OTHER.",
  ] },
  "app/admin/finance/page.tsx:650": { role: '"OTHER"', note: [
    "  // 2026-10-08 · READ, not guessed (24dca6aa, 2026-09-25). A capped view says so in the card's action slot: a count annotation.",
  ] },
  "app/admin/finance/page.tsx:668": { role: '"OTHER"', note: [
    "  // 2026-10-08 · READ, not guessed (24dca6aa, 2026-09-25). This card is all-time under a window picker and says so in its",
    "  // action slot — a count annotation, like `{recent.length} entries` on the config page. OTHER, not §T3's section eyebrow.",
  ] },
  "app/api/og/market/[id]/route.tsx:222": { role: '"STATUS_CHIP"', note: [
    "  // 2026-10-08 · READ, not guessed (871b0844, 2026-09-27). The share card's state in words where there is no price to draw:",
    "  // \"One side only\" · \"No bets yet\" · \"No pool yet\". A status word, as the lean word beside it is: STATUS_CHIP.",
  ] },
};

const undeclared = before.undeclared;
for (const u of undeclared) if (!READ[u.where]) throw new Error(`unread site ${u.where} — this patch only covers the seven it was written for`);
if (undeclared.length !== Object.keys(READ).length) throw new Error(`expected ${Object.keys(READ).length} undeclared, found ${undeclared.length}`);

// 1 · re-keys: pair each stale declaration with the undeclared site of the same file and the same first line
for (const u of undeclared.filter((x) => READ[x.where].rekey)) {
  const stale = before.missNot.filter((s) => s.seen === 0 && s.key.startsWith(u.rel + " :: ") && head(s.key) === head(u.key));
  if (stale.length !== 1) throw new Error(`${u.where}: expected exactly one stale declaration with the same head, found ${stale.length}`);
  const idx = lines.findIndex((l) => parse(l)?.key === stale[0].key);
  if (idx < 0) throw new Error(`${u.where}: stale declaration not found as a table line`);
  const role = parse(lines[idx]).role;
  lines.splice(idx, 1, ...READ[u.where].note, entryLine(u.key, role));
  console.log(`re-keyed ${u.where}  (role ${role} kept)`);
}

// 2 · new declarations, each at its sorted place (the table is sorted by key), above any note that belongs to the next entry
for (const u of undeclared.filter((x) => !READ[x.where].rekey)) {
  const j = lines.findIndex((l) => { const p = parse(l); return p && p.key > u.key; });
  if (j < 0) throw new Error(`${u.where}: no later entry to sort before`);
  let at = j;
  while (at > 0 && /^ {2}\/\//.test(lines[at - 1])) at--;
  lines.splice(at, 0, ...READ[u.where].note, entryLine(u.key, READ[u.where].role));
  console.log(`declared  ${u.where}  as ${READ[u.where].role}`);
}

const out = lines.join(NL);
if (DRY) { console.log("(dry run — nothing written)"); process.exit(0); }
writeFileSync(FILE, out, "utf8");

const after = await census(ROOT, FILE);
console.log(`after:  ${after.undeclared.length} undeclared, ${after.missNot.length} stale, ${after.missInl.length} stale-inline, ${after.badInline.length} bad-inline`);
