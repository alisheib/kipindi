/** The bell's thirty-row window must ring for a new unread row even when the
 * visible unread count stays thirty. Run actual production logic on adversarial
 * pages, then mutate that logic in memory for the red proof. */
import { readFileSync } from "node:fs";
import ts from "typescript";
import { advanceNotificationArrival } from "../src/lib/notification-arrival.ts";

type Row = { id: string; readAt: string | null; createdAt: string };
type Advance = typeof advanceNotificationArrival;
const at = (minute: number) => new Date(Date.UTC(2026, 9, 20, 8, minute)).toISOString();
const row = (id: string, minute: number, readAt: string | null = null): Row => ({ id, createdAt: at(minute), readAt });
const first = Array.from({ length: 30 }, (_, i) => row(`n${i}`, i));

function failures(advance: Advance): string[] {
  const bad: string[] = [];
  const check = (name: string, ok: boolean) => { if (!ok) bad.push(name); };
  const base = advance(null, first);
  check("page load is a baseline", !base.ring);
  const full = advance(base.state, [row("new", 30), ...first.slice(1)]);
  check("a fresh unread rings at the thirty-row cap", full.ring);
  check("the same row rings only once", !advance(full.state, [row("new", 30), ...first.slice(1)]).ring);
  check("reordering does not ring", !advance(base.state, [...first].reverse()).ring);
  check("a revised timestamp on an existing row does not ring", !advance(base.state, [row("n29", 30), ...first.slice(0, 29)]).ring);
  check("reading a row does not ring", !advance(base.state, first.map((r, i) => i === 1 ? { ...r, readAt: at(31) } : r)).ring);
  check("an older row exposed after dismissing another does not ring", !advance(base.state, [...first.slice(1), row("old", -1)]).ring);
  const newRead = advance(base.state, [row("read", 30, at(30)), ...first.slice(1)]);
  check("a newly arrived read row does not ring", !newRead.ring);
  check("a later read-state change does not ring", !advance(newRead.state, [row("read", 30), ...first.slice(1)]).ring);
  check("a later new unread still rings", advance(newRead.state, [row("later", 31), row("read", 30), ...first.slice(2)]).ring);
  return bad;
}

const panel = readFileSync("src/components/layout/notifications-panel.tsx", "utf8");
const wiredFor = (text: string) => {
  const seq = text.indexOf("if (seq !== refreshSeq.current) return true");
  const arrival = text.indexOf("advanceNotificationArrival(arrivalRef.current, r.items)");
  return seq >= 0 && arrival > seq && text.includes("arrivalRef.current = arrival.state")
    && text.includes("if (arrival.ring) setRingSeq((s) => s + 1)");
};
const wired = wiredFor(panel);
const baseline = failures(advanceNotificationArrival);
if (!wired || baseline.length) {
  console.error(`Notification arrival: ${!wired ? "stale-response/arrival wiring; " : ""}${baseline.join("; ")}`);
  process.exit(1);
}

if (!process.argv.includes("--prove-red")) {
  console.log("Notification arrival: 10/10 behavior cases and stale-response wiring pass");
  process.exit(0);
}

const source = readFileSync("src/lib/notification-arrival.ts", "utf8");
function mutated(find: string, replacement: string): Advance {
  if (!source.includes(find)) throw new Error(`red plant anchor missing: ${find}`);
  const code = ts.transpileModule(source.replace(find, replacement), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: Record<string, unknown> = {};
  new Function("exports", code)(exports);
  return exports.advanceNotificationArrival as Advance;
}

const plants: Array<[string, Advance, string]> = [
  ["count-only cap regression", (previous, rows) => {
    const current = advanceNotificationArrival(previous, rows);
    return { ...current, ring: previous !== null && rows.filter((r) => !r.readAt).length > previous.ids.size };
  }, "a fresh unread rings at the thirty-row cap"],
  ["drop new-ID check", mutated("!previous.ids.has(row.id)", "false"), "a fresh unread rings at the thirty-row cap"],
  ["ring for an existing row's revised timestamp", mutated("!previous.ids.has(row.id)", "true"), "a revised timestamp on an existing row does not ring"],
  ["ring for an old row exposed by the cap", mutated("createdAtMs > previous.newestAtMs", "true"), "an older row exposed after dismissing another does not ring"],
  ["ring for an already-read arrival", mutated("!row.readAt", "true"), "a newly arrived read row does not ring"],
];
let caught = 0;
for (const [name, plant, target] of plants) {
  const misses = failures(plant);
  if (!misses.includes(target)) throw new Error(`${name}: expected ${target}; got ${misses.join("; ")}`);
  caught++;
}
const unwired = panel.replace("if (arrival.ring) setRingSeq((s) => s + 1)", "if (!arrival.ring) setRingSeq((s) => s + 1)");
if (wiredFor(unwired)) throw new Error("wiring red plant escaped");
console.log(`Notification arrival: ${caught + 1}/${plants.length + 1} red plants caught`);
