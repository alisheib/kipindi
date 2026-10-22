// S5-R2-HUB commit 2's mutation proof: four plants applied to the tree at once (each must turn its own drive check red),
// then restored from the drafts. Usage: node plants.mjs apply | restore
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
const TREE = "C:/50pick-ssd/kipindi-mln-dhub";
const DRAFT = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/hub/draft";
const FILES = {
  "src/app/millionea/page.tsx": "page.tsx",
  "src/components/maswali/maswali-pool-figure.tsx": "maswali-pool-figure.tsx",
  "src/app/millionea/hub-ghost.tsx": "hub-ghost.tsx",
};
const PLANTS = [
  // A · the reader's tickets back between the door and the ledger (round 1's order): the ghost state's frame must fail.
  ["src/app/millionea/page.tsx",
    "      {w.pool && <HubPoolLedger carryFrom={carries ? CARRIED_FIGURE_ID : undefined} carryPlay={carries} className={hubCell(twoUp, \"ledger\")} />}\n      <MineBlock t={t} locale={locale} w={w} nowMs={nowMs} cancelEnds={cancelEnds} className={hubCell(twoUp, \"mine\")} />\n",
    "      <MineBlock t={t} locale={locale} w={w} nowMs={nowMs} cancelEnds={cancelEnds} className={hubCell(twoUp, \"mine\")} />\n      {w.pool && <HubPoolLedger carryFrom={carries ? CARRIED_FIGURE_ID : undefined} carryPlay={carries} className={hubCell(twoUp, \"ledger\")} />}\n"],
  // B · the rule's facts wrapping greedily again: the rule check must fail at sw 320.
  ["src/components/maswali/maswali-pool-figure.tsx",
    "  const facts = (line: string) => <MaswaliFacts facts={factsOf(line).map((f) => keepFact(locale, f))} className={HUB_POOL_HEAD.facts} />;",
    "  const facts = (line: string) => <MaswaliFacts facts={factsOf(line).map((f) => keepFact(locale, f))} />;"],
  // C · the drawing's ledger standing still: the ghost state's sweep check must fail.
  ["src/app/millionea/hub-ghost.tsx",
    "<div className={cn(HUB_LEDGER, SWEEP, hubCell(true, \"ledger\"))} data-ghost=\"ledger\">",
    "<div className={cn(HUB_LEDGER, hubCell(true, \"ledger\"))} data-ghost=\"ledger\">"],
  // D · a numeral of the hub's own line in the body face: the §T5 census must fail.
  ["src/app/millionea/page.tsx",
    "{onSale && <p className={HUB_MINE.count}>{keepFact(locale, fill(t.millionea.yourTicketsThisWeek, { n: formatNumber(w.mine.held), cap: formatNumber(w.mine.cap) }))}</p>}",
    "{onSale && <p className={HUB_MINE.count}>{fill(t.millionea.yourTicketsThisWeek, { n: formatNumber(w.mine.held), cap: formatNumber(w.mine.cap) })}</p>}"],
];
const mode = process.argv[2];
if (mode === "apply") {
  for (const [rel, from, to] of PLANTS) {
    const p = `${TREE}/${rel}`;
    const crlf = readFileSync(p, "utf8").includes("\r\n");
    const s = readFileSync(p, "utf8").replace(/\r\n/g, "\n");
    if (!s.includes(from)) throw new Error(`plant not found in ${rel}: ${from.slice(0, 80)}`);
    writeFileSync(p, (crlf ? s.replace(from, to).replace(/\n/g, "\r\n") : s.replace(from, to)));
    console.log(`planted ${rel}`);
  }
} else if (mode === "restore") {
  for (const [rel, name] of Object.entries(FILES)) { copyFileSync(`${DRAFT}/${name}`, `${TREE}/${rel}`); console.log(`restored ${rel}`); }
} else throw new Error("apply | restore");
