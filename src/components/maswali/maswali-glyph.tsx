import { cn } from "@/lib/utils";
import { I } from "@/components/ui/glyphs";

/**
 * MILLIONEA'S OWN ICONS, THROUGH THE ONE FAMILY (MASWALI-BUILD S5; MASWALI-PLAN §10c; AGENTS.md §7, R-ONE-SOURCE).
 *
 * ⭐ WHY A DOOR AND NOT `I.markPending`. §10c's thirteen new keys are in `scripts/glyphs/map.ts` (`NEW_KEYS`), and the
 * Phosphor lane's codegen draws them into the family; until that swap (PHOSPHOR-MIGRATION W2) lands on `main`, the family
 * a build compiles against does not hold them, so a static `I.markPending` would not compile. This reads the family by key
 * and draws the key the moment the family holds it. ⛔ It never draws a stand-in: §10c says a key the family does not yet
 * hold WAITS for it rather than being drawn here, so until then the slot keeps its box (the line's geometry holds) and the
 * word beside every mark carries the meaning (glyph + ink + word, Phosphor W4). Once W2 is on `main`, a call site may name
 * `I.<key>` directly and this door can go.
 *
 * Where the platform's lexicon already owns a meaning, Millionea calls that key straight through `I` and adds none
 * (`checkCircle`, `xCircle`, `void`, `ticket`, `coins`, `hourglassHalf`, `clock`, `sealCheck`, `trophy`, `rotateCcw`,
 * `lock`, `flag`, `externalLink`, `eye`).
 */
export const MILLIONEA_GLYPHS = [
  "millionea", "markPending", "reserve", "standIn", "carry", "floor", "register",
  "commitment", "refund", "salesPaused", "howTo", "cap", "finalWeek",
] as const;
export type MillioneaGlyphKey = (typeof MILLIONEA_GLYPHS)[number];

/** A family glyph, as the family draws one (every key of `I` takes the same props). */
type FamilyGlyph = (typeof I)["check"];
type FamilyGlyphProps = Parameters<FamilyGlyph>[0];

/** The family read by key. ⛔ Read-only, and only for the thirteen keys above. */
const FAMILY = I as unknown as Readonly<Partial<Record<string, FamilyGlyph>>>;

export function MillioneaGlyph({ name, ...props }: { name: MillioneaGlyphKey } & FamilyGlyphProps) {
  const Glyph = FAMILY[name];
  if (Glyph) return <Glyph {...props} />;
  // The box the glyph will draw in, empty until the family holds the key: a line of sockets keeps its geometry.
  const edge = props.s ?? 24;
  return <span aria-hidden className={cn("inline-block shrink-0", props.className)} style={{ width: edge, height: edge }} />;
}
