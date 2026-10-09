// keepText's call sites: does any of their strings put a CJK character, or a word with a break inside it (a hyphen),
// before a spaced dash — where `\S+` glues more than the one word the rule means?
import { dict } from "file:///F:/kipindi-r5e/src/lib/i18n-dict.ts";
const D = dict as unknown as Record<string, Record<string, Record<string, string>>>;
const KEYS: Array<[string, string]> = [
  ["auth", "selfExclusionEndedBody"], ["auth", "selfExclusionPermanentBody"], ["auth", "selfExclusionUntilBody"], ["auth", "selfExclusionBody"],
  ["rg", "breakActive"], ["rg", "exclusionActive"], ["auth", "coolingOffBody"], ["common", "stakeHasntMoved"], ["market", "crowdedWarning"],
  ["market", "thinUpsideNote"], ["dialog", "poolSharePayout"], ["dialog", "estimateDisclaimer"], ["common", "phoneInputTitle"], ["market", "noPoolYet"],
  ["dialog", "freeExitBody"], ["market", "freeExitBody"],
];
for (const l of ["en", "sw", "zh"]) for (const [g, k] of KEYS) {
  const s = D[l]?.[g]?.[k];
  if (typeof s !== "string") continue;
  for (const m of s.matchAll(/\S+\s+[\u2014\u2013](?=\s|$)/g)) {
    const word = m[0].replace(/\s+[\u2014\u2013]$/, "");
    const odd = /[\u3400-\u9fff]/.test(word) ? (Array.from(word).length > 1 ? "CJK-CLAUSE" : "cjk-1") : /[-\u2013\/]/.test(word) ? "HYPHENATED" : "latin";
    console.log(`${l}.${g}.${k}: [${m[0]}] ${odd}`);
  }
}
// and every zh string anywhere through keepText? (the call sites above are the ones R4-I measured)
