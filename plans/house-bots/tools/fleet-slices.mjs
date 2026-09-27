// The whole-fleet slice list (RESUME-HERE §0b): console, engine and money+seam by name PREFIX — each prefix is the
// mutation's name up to its first comma, because the harnesses split `--only` on commas — and c5 by `--slice` over its
// primaries. Every mutation must be selected by at least one slice, or this refuses. c5 comes FIRST: a c5 slice
// holding a disclosure mutation baselines 5.1 against the LIVE origin/main, so it must run while the tree still
// equals main. Prints "harness<TAB>flag<TAB>args" lines; notes go to stderr.
//   Run from the tree being driven:  node plans/house-bots/tools/fleet-slices.mjs > slices.tsv
import { pathToFileURL } from "node:url";

const load = async (f) => {
  const m = await import(pathToFileURL(`${process.cwd()}/scripts/anchors/${f}`).href);
  return m.MUTATIONS ?? m.default ?? Object.values(m).find(Array.isArray);
};
const SIZE = 45;
const out = [];
const byPrefix = (harness, names) => {
  const prefixes = [...new Set(names.map((n) => n.split(",")[0].trim()))];
  const hits = names.map((n) => prefixes.filter((p) => n.startsWith(p)).length);
  const unmatched = names.filter((_, i) => hits[i] === 0);
  if (unmatched.length) throw new Error(`${harness}: ${unmatched.length} mutations no prefix selects`);
  const multi = names.filter((_, i) => hits[i] > 1);
  if (multi.length) console.error(`# ${harness}: ${multi.length} selected by more than one prefix (driven twice, harmless)`);
  for (let i = 0; i < prefixes.length; i += SIZE) out.push(`${harness}\t--only\t${prefixes.slice(i, i + SIZE).join(",")}`);
  console.error(`# ${harness}: ${names.length} mutations, ${Math.ceil(prefixes.length / SIZE)} slices`);
};
byPrefix("scripts/red-house-bot-console.mjs", (await load("house-bot-console.anchors.mjs")).map((m) => m.name));
byPrefix("scripts/red-house-bot-engine.mjs", (await load("house-bot-engine.anchors.mjs")).map((m) => m.name));
byPrefix("scripts/red-house-bot-money.mjs",
  [...(await load("house-bot-money.anchors.mjs")), ...(await load("house-bot-seam.anchors.mjs"))].map((m) => m.name));
// The c5 harness's own rule (`PRIMARY_ALL`): a partner (`combineInto`) rides with its primary and is never driven alone.
const c5 = await load("house-bot-c5.anchors.mjs");
const primaries = c5.filter((m) => !m.combineInto).length;
console.error(`# c5: ${c5.length} declared, ${primaries} primaries`);
const c5Slices = [];
for (let i = 0; i < primaries; i += SIZE) c5Slices.push(`scripts/red-house-bot-c5.mjs\t--slice\t${i}:${Math.min(i + SIZE, primaries)}`);
console.log([...c5Slices, ...out].join("\n"));
