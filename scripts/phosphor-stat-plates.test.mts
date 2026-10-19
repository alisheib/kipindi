/** W5: boxed player stats use one Duotone identity plate at the kit's derived glyph size. */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatIcon } from "../src/components/ui/stat";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (path: string) => readFileSync(`${ROOT}/${path}`, "utf8");
const files = {
  atom: read("src/components/ui/stat.tsx"),
  market: read("src/app/markets/[id]/page.tsx"),
  profile: read("src/app/profile/page.tsx"),
  profileLoading: read("src/app/profile/loading.tsx"),
  activity: read("src/app/profile/activity/page.tsx"),
  agent: read("src/app/agent/page.tsx"),
  agentLoading: read("src/app/agent/loading.tsx"),
  invite: read("src/app/profile/invite/page.tsx"),
  dashboard: read("src/app/profile/invite/agent-dashboard.tsx"),
};

function contracts(s: typeof files): string[] {
  const bad: string[] = [];
  if (!s.atom.includes('variant="identity"') || !s.atom.includes('tier="duo"') || !s.atom.includes("plateGlyph(26)"))
    bad.push("the stat atom lost its identity material, Duotone tier or derived size");
  if (!s.atom.includes("stat-label min-w-0 break-words"))
    bad.push("a long translated stat label can paint over its neighbouring tile");
  const expected = { market: 3, profile: 3, activity: 6, agent: 3, invite: 2, dashboard: 2 } as const;
  for (const key of Object.keys(expected) as Array<keyof typeof expected>)
    if ((s[key].match(/<StatIcon glyph=/g) ?? []).length !== expected[key])
      bad.push(`${key} lost a shared stat plate`);
  for (const key of ["profileLoading", "agentLoading"] as const)
    if ((s[key].match(/<StatIcon glyph=/g) ?? []).length !== 3 || (s[key].match(/ ghost \/>/g) ?? []).length !== 3)
      bad.push(`${key} no longer reserves the stat plate's dimensions`);
  for (const key of ["profile", "profileLoading", "activity"] as const) {
    const expectedStack = key === "activity" ? 6 : 3;
    if ((s[key].match(/iconAlign="stack"/g) ?? []).length !== expectedStack)
      bad.push(`${key} no longer gives translated labels the full tile width`);
  }
  if (!s.activity.includes("grid-cols-1 gap-3 min-[360px]:grid-cols-2") ||
      (s.activity.match(/labelStyle="activity"/g) ?? []).length !== 6)
    bad.push("activity tiles lose their narrow-phone layout or compact translated labels");
  return bad;
}

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

if (process.argv.includes("--prove-red")) {
  check("green control", contracts(files).length === 0, contracts(files).join("; "));
  const plants: Array<[string, keyof typeof files, string, string]> = [
    ["glyph shrinks to a bare size", "atom", "plateGlyph(26)", "14"],
    ["glyph loses Duotone", "atom", 'tier="duo"', 'tier="line"'],
    ["plate loses royal identity", "atom", 'variant="identity"', 'variant="quiet"'],
    ["translated label regains its overflow", "atom", "stat-label min-w-0 break-words", "stat-label"],
    ["market tiles lose their shared plate", "market", "<StatIcon glyph=", "<RetiredStatIcon glyph="],
    ["loading strip loses its reserved plate", "profileLoading", " ghost />", " />"],
    ["translated profile label loses its full-width line", "profile", 'iconAlign="stack"', 'iconAlign="label"'],
    ["activity returns to two cramped columns at 320", "activity", "grid-cols-1 gap-3 min-[360px]:grid-cols-2", "grid-cols-2 gap-3"],
  ];
  for (const [label, key, from, to] of plants) {
    if (!files[key].includes(from)) { check(label, false, "plant anchor absent"); continue; }
    const mutant = { ...files, [key]: files[key].replace(from, to) };
    check(label, contracts(mutant).length > 0, contracts(mutant).join("; "));
  }
} else {
  check("all chosen stat surfaces use the one plate", contracts(files).length === 0, contracts(files).join("; "));
  const html = renderToStaticMarkup(createElement(StatIcon, { glyph: "coins" }));
  check("rendered stat icon is a 26px Duotone identity plate",
    html.includes('class="grid shrink-0 place-items-center rounded-control kp-plate--identity')
    && html.includes('style="width:26px;height:26px"')
    && html.includes('data-g="coins.duo"') && html.includes('width="14"'));
  const ghost = renderToStaticMarkup(createElement(StatIcon, { glyph: "coins", ghost: true }));
  check("loading ghost keeps plate dimensions without painting it",
    ghost.includes("opacity-0") && ghost.includes('style="width:26px;height:26px"'));
}

console.log(`stat plates: ${failures} failure(s)`);
if (failures) process.exit(1);
