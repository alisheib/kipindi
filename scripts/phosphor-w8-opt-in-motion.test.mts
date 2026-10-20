/**
 * W8: an opt-in's Fill glyph settles after a confirmed change, never on load or
 * during an optimistic request. The source check reads the two real controls;
 * its red plants undo each timing condition in memory.
 */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

const watch = decomment(readFileSync("src/components/markets/watch-star.tsx", "utf8")).replace(/\r\n/g, "\n");
const notify = decomment(readFileSync("src/components/markets/notify-prompt.tsx", "utf8")).replace(/\r\n/g, "\n");
const sidePicker = decomment(readFileSync("src/components/markets/side-picker.tsx", "utf8")).replace(/\r\n/g, "\n");
const detailPage = decomment(readFileSync("src/app/markets/[id]/page.tsx", "utf8")).replace(/\r\n/g, "\n");

function fiftyFirstOptInPersists(bell: string): boolean {
  const source = bell.match(/function writeWatchlist\([\s\S]*?\n\}\n\nexport function NotifyPrompt/)?.[0]
    .replace(/\n\nexport function NotifyPrompt$/, "")
    .replace("ids: string[]", "ids")
    .replace("): boolean", ")");
  if (!source) return false;
  let stored = "";
  const localStorage = { setItem: (_key: string, value: string) => { stored = value; } };
  try {
    const write = new Function("localStorage", "KEY", `${source}; return writeWatchlist;`)(localStorage, "50pick-notify-markets") as (ids: string[]) => boolean;
    const ids = Array.from({ length: 51 }, (_, i) => `market-${i}`);
    return write(ids) && JSON.parse(stored).includes("market-50") && JSON.parse(stored).length === 51;
  } catch {
    return false;
  }
}

function blockedConfirmationKeepsWatch(bell: string): boolean {
  if (!/if \(!writeWatchlist\(next\)\) return;\s*setWatching\(true\);\s*setSettledOn\(true\);\s*try \{\s*new Notification/.test(bell)) return false;
  const source = bell.match(/try \{\s*new Notification\(t\.market\.watchingTitle,[\s\S]*?\);\s*\} catch \{\s*\}/)?.[0];
  if (!source) return false;
  const Notification = class { constructor() { throw new Error("browser blocked confirmation"); } };
  try {
    new Function("Notification", "t", "marketTitle", "marketId", source)(Notification, { market: { watchingTitle: "Watching" } }, "Market", "m-1");
    return true;
  } catch {
    return false;
  }
}

function claims(star: string, bell: string, side = sidePicker, detail = detailPage): string[] {
  const missing: string[] = [];
  const hold = (name: string, ok: boolean) => { if (!ok) missing.push(name); };

  hold("star starts static", /const \[settledOn, setSettledOn\] = useState\(false\)/.test(star));
  hold("star resets for another market", /useEffect\(\(\) => \{\s*setSettledOn\(false\);\s*const sync =/.test(star));
  hold("star waits for confirmation", /if \(d\?\.marketId === marketId\) \{\s*setOn\(d\.watching\);\s*setSettledOn\(d\.watching\);\s*\}/.test(star)
    && /if \(!r\.ok\)[\s\S]*?return;\s*\}\s*setOn\(r\.watching\);\s*window\.dispatchEvent\(new CustomEvent\("50pick:watch"/.test(star));
  hold("star resets before optimism", /const prev = on;\s*setSettledOn\(false\);\s*setOn\(!prev\);/.test(star));
  hold("star settles only when confirmed on", /<I\.star s=\{size\} tier=\{on \? "fill" : undefined\} className=\{on && settledOn \? "g-settle" : undefined\} \/>/.test(star));

  hold("bell starts static", /const \[settledOn, setSettledOn\] = useState\(false\)/.test(bell));
  hold("bell resets for another market", /useEffect\(\(\) => \{\s*setSettledOn\(false\);\s*if \(typeof Notification/.test(bell));
  hold("bell waits for opt-in", /if \(!writeWatchlist\(next\)\) return;\s*setWatching\(true\);\s*setSettledOn\(true\);/.test(bell)
    && /if \(Notification\.permission !== "granted"\) \{\s*setPending\(false\);\s*return;\s*\}/.test(bell));
  hold("bell requires a stored opt-in", /function writeWatchlist\(ids: string\[\]\): boolean/.test(bell)
    && /localStorage\.setItem\(KEY, JSON\.stringify\(ids\)\);\s*return true;\s*\} catch \{[\s\S]*?return false;/.test(bell));
  hold("bell persists the accepted market even after fifty watches", fiftyFirstOptInPersists(bell));
  hold("bell survives a refused permission request", /let r: NotificationPermission;\s*try \{\s*r = await Notification\.requestPermission\(\);\s*\} catch \{\s*setPermission\(Notification\.permission\);\s*return;\s*\}/.test(bell));
  hold("bell keeps a stored watch when the optional confirmation is blocked", blockedConfirmationKeepsWatch(bell));
  hold("bell resets on opt-out", /if \(!writeWatchlist\(next\)\) return;\s*setWatching\(false\);\s*setSettledOn\(false\);/.test(bell));
  hold("bell settles only its Fill", /watching \? <I\.bell s=\{14\} tier="fill" className=\{settledOn \? "g-settle" : undefined\} \/> : <I\.bell s=\{14\} \/>/.test(bell));
  hold("bell remounts for another market", /<NotifyPrompt key=\{marketId\} marketId=\{marketId\} marketTitle=\{marketTitle\} \/>/.test(side));
  hold("star remounts for another market", /<WatchStar key=\{m\.id\} marketId=\{m\.id\} initial=\{watching\} signedIn=\{!!session\} \/>/.test(detail));
  return missing;
}

const baseline = claims(watch, notify);
if (baseline.length) {
  console.error(`W8 opt-in motion: ${baseline.join("; ")}`);
  process.exit(1);
}

if (!process.argv.includes("--prove-red")) {
  console.log("W8 opt-in motion: 16/16 claims pass");
  process.exit(0);
}

const plants: Array<[name: string, target: string, star: string, bell: string]> = [
  ["star animates on load", "star starts static", watch.replace("const [settledOn, setSettledOn] = useState(false)", "const [settledOn, setSettledOn] = useState(true)"), notify],
  ["star carries motion into another market", "star resets for another market", watch.replace("useEffect(() => {\n    setSettledOn(false);\n    const sync =", "useEffect(() => {\n    const sync ="), notify],
  ["star animates before confirmation", "star waits for confirmation", watch.replace("setSettledOn(d.watching)", "setSettledOn(true)"), notify],
  ["star carries a previous confirmation into optimism", "star resets before optimism", watch.replace("setSettledOn(false);\n    setOn(!prev)", "setOn(!prev)"), notify],
  ["star settles when off too", "star settles only when confirmed on", watch.replace('className={on && settledOn ? "g-settle" : undefined}', 'className="g-settle"'), notify],
  ["bell animates on load", "bell starts static", watch, notify.replace("const [settledOn, setSettledOn] = useState(false)", "const [settledOn, setSettledOn] = useState(true)")],
  ["bell carries motion into another market", "bell resets for another market", watch, notify.replace("useEffect(() => {\n    setSettledOn(false);\n    if (typeof Notification", "useEffect(() => {\n    if (typeof Notification")],
  ["bell settles before storing the opt-in", "bell waits for opt-in", watch, notify.replace("if (!writeWatchlist(next)) return;\n        setWatching(true);\n        setSettledOn(true);", "setSettledOn(true);\n        writeWatchlist(next);\n        setWatching(true);")],
  ["bell treats refused storage as success", "bell requires a stored opt-in", watch, notify.replace("    return false;\n  }\n}\n\nexport function NotifyPrompt", "    return true;\n  }\n}\n\nexport function NotifyPrompt")],
  ["bell accepts a truncated fifty-first market", "bell persists the accepted market even after fifty watches", watch, notify.replace("JSON.stringify(ids)", "JSON.stringify(ids.slice(0, 50))")],
  ["bell throws when permission request is refused", "bell survives a refused permission request", watch, notify.replace(/try \{\s*r = await Notification\.requestPermission\(\);\s*\} catch \{\s*setPermission\(Notification\.permission\);\s*return;\s*\}/, "r = await Notification.requestPermission();")],
  ["bell throws after saving a watch when the confirmation is blocked", "bell keeps a stored watch when the optional confirmation is blocked", watch, notify.replace(/try \{\s*new Notification\(t\.market\.watchingTitle,[\s\S]*?\);\s*\} catch \{\s*\}/, "new Notification(t.market.watchingTitle, { body: marketTitle.slice(0, 80), tag: `50pick-${marketId}` });")],
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
const remountPlants: Array<[string, string[], string]> = [
  ["bell keeps the old market's motion", claims(watch, notify, sidePicker.replace("<NotifyPrompt key={marketId}", "<NotifyPrompt"), detailPage), "bell remounts for another market"],
  ["star keeps the old market's motion", claims(watch, notify, sidePicker, detailPage.replace("<WatchStar key={m.id}", "<WatchStar")), "star remounts for another market"],
];
for (const [name, failures, target] of remountPlants) {
  if (!failures.includes(target)) throw new Error(`${name}: expected ${target}; got ${failures.join("; ")}`);
  caught++;
}
console.log(`W8 opt-in motion: ${caught}/${plants.length + remountPlants.length} red plants caught`);
