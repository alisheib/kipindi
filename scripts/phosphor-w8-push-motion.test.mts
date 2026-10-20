/** W8: the browser-push bell fills when on, but settles only after this mount's confirmed save. */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
type World = { push: string; map: string; registry: string; sprite: string };
const registry = read("src/components/ui/glyph-registry.generated.ts");
const spriteName = /GLYPH_SPRITES = \{ app: "\/icons\/g\/(app\.[a-f0-9]{8}\.svg)"/.exec(registry)?.[1];
if (!spriteName) throw new Error("generated app sprite premise absent");
const world: World = {
  push: decomment(read("src/components/settings/push-settings.tsx")),
  map: decomment(read("scripts/glyphs/map.ts")),
  registry,
  sprite: read(`public/icons/g/${spriteName}`),
};
const vendor = read("node_modules/@phosphor-icons/core/assets/fill/bell-ringing-fill.svg");
const vendorPath = /<path d="([^"]+)"\s*\/>/.exec(vendor)?.[1];
if (!vendorPath) throw new Error("pinned Phosphor Fill asset premise absent");

function appearance(push: string, state: string, settledOn: boolean): { tier: string; className?: string } | null {
  const pair = /<I\.bellRing[^>]*tier=\{([^}]+)\}\s+className=\{([^}]+)\}/.exec(push);
  if (!pair) return null;
  try {
    return new Function("state", "settledOn", `return { tier: ${pair[1]}, className: ${pair[2]} };`)(state, settledOn) as { tier: string; className?: string };
  } catch {
    return null;
  }
}

function claims(w: World): string[] {
  const bad: string[] = [];
  const hold = (name: string, ok: boolean) => { if (!ok) bad.push(name); };
  const fillList = w.map.split("export const FILL_KEYS:")[1]?.split("export const DUO_KEYS:")[0] ?? "";
  hold("bellRing ships a Fill key", /"bellRing"/.test(fillList));
  hold("generated registry exposes bellRing Fill", /"bellRing": \{[^\n]*fill: \[[^\]]+\]/.test(w.registry));
  hold("Fill drawing is the pinned Phosphor path", w.sprite.includes(`<symbol id="p-bell-ringing-fill" viewBox="0 0 256 256"><path d="${vendorPath}" fill="currentColor"/></symbol>`));
  const visual = (state: string, settled: boolean) => appearance(w.push, state, settled);
  hold("loaded subscription is Fill at rest", visual("on", false)?.tier === "fill" && visual("on", false)?.className === undefined);
  hold("new confirmed subscription settles its Fill", visual("on", true)?.tier === "fill" && visual("on", true)?.className === "g-settle");
  hold("off and loading states stay Duotone at rest", ["off", "loading", "blocked"].every((state) =>
    visual(state, true)?.tier === "duo" && visual(state, true)?.className === undefined));
  hold("subscription starts static", /const \[settledOn, setSettledOn\] = useState\(false\)/.test(w.push));
  const saved = w.push.slice(w.push.indexOf("const r = await savePushSubscriptionAction"), w.push.indexOf("function disable()"));
  hold("only confirmed save arms settle", saved.startsWith("const r = await savePushSubscriptionAction")
    && /if \(!r\.ok\) \{[\s\S]*?setState\("off"\); return; \}\s*setState\("on"\);\s*setSettledOn\(true\);/.test(saved)
    && (w.push.match(/setSettledOn\(true\)/g) ?? []).length === 1);
  hold("disable disarms before work starts", /function disable\(\) \{\s*setSettledOn\(false\);\s*start\(async \(\) => \{/.test(w.push));
  return bad;
}

const baseline = claims(world);
if (baseline.length) throw new Error(`W8 push motion: ${baseline.join("; ")}`);
if (!process.argv.includes("--prove-red")) {
  console.log("W8 push motion: 9/9 claims pass");
  process.exit(0);
}

const plants: Array<[string, keyof World, string, string, string]> = [
  ["drop generated Fill", "registry", 'fill: [27.71, 228.32], duo:', 'duo:', "generated registry exposes bellRing Fill"],
  ["replace pinned Fill path", "sprite", `<symbol id="p-bell-ringing-fill" viewBox="0 0 256 256"><path d="${vendorPath}"`, `<symbol id="p-bell-ringing-fill" viewBox="0 0 256 256"><path d="${vendorPath.replace("M224,71.1", "M223,71.1")}"`, "Fill drawing is the pinned Phosphor path"],
  ["animate a loaded subscription", "push", "useState(false);", "useState(true);", "subscription starts static"],
  ["use Duo while on", "push", 'state === "on" ? "fill" : "duo"', 'state === "on" ? "duo" : "fill"', "loaded subscription is Fill at rest"],
  ["animate on initial loaded on", "push", 'state === "on" && settledOn ? "g-settle"', 'state === "on" ? "g-settle"', "loaded subscription is Fill at rest"],
  ["never animate confirmed enable", "push", 'state === "on" && settledOn ? "g-settle"', 'state === "off" && settledOn ? "g-settle"', "new confirmed subscription settles its Fill"],
  ["settle a failed save", "push", 'setState("off"); return; }', 'setState("off"); setSettledOn(true); return; }', "only confirmed save arms settle"],
  ["settle before save returns", "push", 'const r = await savePushSubscriptionAction', 'setSettledOn(true); const r = await savePushSubscriptionAction', "only confirmed save arms settle"],
  ["leave settle armed on disable", "push", 'function disable() {\n    setSettledOn(false);', 'function disable() {', "disable disarms before work starts"],
];
for (const [name, key, from, to, target] of plants) {
  if (!world[key].includes(from)) throw new Error(`plant premise absent: ${name}`);
  const changed = { ...world, [key]: world[key].replace(from, to) };
  if (!claims(changed).includes(target)) throw new Error(`plant survived: ${name}`);
}
const mapWithoutFill = world.map.replace(/(export const FILL_KEYS:[\s\S]*?)"bellRing"/, '$1"bellRingRetired"');
if (mapWithoutFill === world.map || !claims({ ...world, map: mapWithoutFill }).includes("bellRing ships a Fill key")) {
  throw new Error("plant survived: drop Fill key");
}
console.log(`W8 push motion: ${plants.length + 1}/${plants.length + 1} red plants caught`);
