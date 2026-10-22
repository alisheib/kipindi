// Lane DOORS: the flight parser read on a real dumped /markets flight (taken while the plant was live).
import { readFileSync } from "node:fs";
import { clientElements } from "file:///C:/50pick-ssd/kipindi-mln-ddoor/scripts/lib/flight-elements.mjs";

const flight = readFileSync(process.argv[2], "utf8");
const els = clientElements(flight);
const unread = els.filter((e) => e.props === null);
console.log(`client elements: ${els.length}; props unread: ${unread.length}`);
for (const e of els.filter((x) => /markets-ghost|route-ghost|shell-lazy|top-app-bar|bottom-nav/.test(x.module))) {
  console.log(`  ${e.module.replace(/^.*\/src\//, "src/").replace(/ \[app-client\] \(ecmascript\)/, "")}#${e.name} ${String(e.text).slice(0, 110)}`);
}
for (const e of unread.slice(0, 5)) console.log(`  UNREAD ${e.module.slice(-60)} ${String(e.text).slice(0, 80)}`);
const withKey = els.filter((e) => e.props && Object.keys(e.props).some((k) => k === "millionea" || k === "millioneaOnBreak"));
console.log(`elements handed millionea / millioneaOnBreak: ${withKey.length}`);
