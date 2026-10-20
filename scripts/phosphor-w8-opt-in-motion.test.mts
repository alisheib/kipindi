/**
 * W8: an opt-in's Fill glyph settles after a confirmed change, never on load or
 * during an optimistic request. The source check reads the two real controls;
 * its red plants undo each timing condition in memory.
 */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

const watch = decomment(readFileSync("src/components/markets/watch-star.tsx", "utf8")).replace(/\r\n/g, "\n");
const notify = decomment(readFileSync("src/components/markets/notify-prompt.tsx", "utf8")).replace(/\r\n/g, "\n");

function claims(star: string, bell: string): string[] {
  const missing: string[] = [];
  const hold = (name: string, ok: boolean) => { if (!ok) missing.push(name); };

  hold("star starts static", /const \[settledOn, setSettledOn\] = useState\(false\)/.test(star));
  hold("star waits for confirmation", /if \(d\?\.marketId === marketId\) \{\s*setOn\(d\.watching\);\s*setSettledOn\(d\.watching\);\s*\}/.test(star)
    && /if \(!r\.ok\)[\s\S]*?return;\s*\}\s*setOn\(r\.watching\);\s*window\.dispatchEvent\(new CustomEvent\("50pick:watch"/.test(star));
  hold("star resets before optimism", /const prev = on;\s*setSettledOn\(false\);\s*setOn\(!prev\);/.test(star));
  hold("star settles only when confirmed on", /<I\.star s=\{size\} tier=\{on \? "fill" : undefined\} className=\{on && settledOn \? "g-settle" : undefined\} \/>/.test(star));

  hold("bell starts static", /const \[settledOn, setSettledOn\] = useState\(false\)/.test(bell));
  hold("bell waits for opt-in", /writeWatchlist\(next\);\s*setWatching\(true\);\s*setSettledOn\(true\);/.test(bell)
    && /if \(Notification\.permission !== "granted"\) \{\s*setPending\(false\);\s*return;\s*\}/.test(bell));
  hold("bell resets on opt-out", /writeWatchlist\(next\);\s*setWatching\(false\);\s*setSettledOn\(false\);/.test(bell));
  hold("bell settles only its Fill", /watching \? <I\.bell s=\{14\} tier="fill" className=\{settledOn \? "g-settle" : undefined\} \/> : <I\.bell s=\{14\} \/>/.test(bell));
  return missing;
}

const baseline = claims(watch, notify);
if (baseline.length) {
  console.error(`W8 opt-in motion: ${baseline.join("; ")}`);
  process.exit(1);
}

if (!process.argv.includes("--prove-red")) {
  console.log("W8 opt-in motion: 8/8 claims pass");
  process.exit(0);
}

const plants: Array<[name: string, target: string, star: string, bell: string]> = [
  ["star animates on load", "star starts static", watch.replace("const [settledOn, setSettledOn] = useState(false)", "const [settledOn, setSettledOn] = useState(true)"), notify],
  ["star animates before confirmation", "star waits for confirmation", watch.replace("setSettledOn(d.watching)", "setSettledOn(true)"), notify],
  ["star carries a previous confirmation into optimism", "star resets before optimism", watch.replace("setSettledOn(false);\n    setOn(!prev)", "setOn(!prev)"), notify],
  ["star settles when off too", "star settles only when confirmed on", watch.replace('className={on && settledOn ? "g-settle" : undefined}', 'className="g-settle"'), notify],
  ["bell animates on load", "bell starts static", watch, notify.replace("const [settledOn, setSettledOn] = useState(false)", "const [settledOn, setSettledOn] = useState(true)")],
  ["bell settles before storing the opt-in", "bell waits for opt-in", watch, notify.replace("writeWatchlist(next);\n        setWatching(true);\n        setSettledOn(true);", "setSettledOn(true);\n        writeWatchlist(next);\n        setWatching(true);")],
  ["bell carries a previous activation through opt-out", "bell resets on opt-out", watch, notify.replace("setWatching(false);\n        setSettledOn(false);", "setWatching(false);")],
  ["bell settles without a successful opt-in", "bell settles only its Fill", watch, notify.replace('className={settledOn ? "g-settle" : undefined}', 'className="g-settle"')],
];
let caught = 0;
for (const [name, target, star, bell] of plants) {
  if (star === watch && bell === notify) throw new Error(`plant did not alter source: ${name}`);
  const failures = claims(star, bell);
  if (!failures.includes(target)) throw new Error(`${name}: expected ${target}; got ${failures.join("; ")}`);
  caught++;
}
console.log(`W8 opt-in motion: ${caught}/${plants.length} red plants caught`);
