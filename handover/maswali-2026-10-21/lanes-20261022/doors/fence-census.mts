// Lane DOORS: the fence's §5.1/5.2 census, run alone (it reads source only — no store, no database).
// Run from the tree: npx tsx <this file>
import { CENSUS, censusCounts } from "file:///C:/50pick-ssd/kipindi-mln-ddoor/scripts/lib/maswali-fence-cases.mts";

const counts = censusCounts();
const unlisted = [...counts].filter(([f]) => !(f in CENSUS)).map(([f, n]) => `${f} (${n})`);
const moved = Object.entries(CENSUS).filter(([f, c]) => (counts.get(f) ?? 0) !== c.n).map(([f, c]) => `${f}: ${counts.get(f) ?? 0} ≠ ${c.n}`);
console.log(`files with a "UPDOWN" branch: ${counts.size}; census entries: ${Object.keys(CENSUS).length}`);
console.log(`5.1 unlisted: ${unlisted.length ? unlisted.join(" · ") : "none"}`);
console.log(`5.2 moved: ${moved.length ? moved.join(" · ") : "none"}`);
