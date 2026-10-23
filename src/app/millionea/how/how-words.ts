/**
 * HOW TO PLAY'S STATIC WORDS, SAID ONCE (MASWALI-BUILD S5-R3-FIX 8; the lead's ruling of 2026-10-23, DESIGN_AUTHORITY §M4a
 * rule 5 and §M8a item 22). The second and fourth steps and the example's caption hold no datum — the dictionary's words,
 * and the example's own record — so the page sets them from here (`page.tsx`, `how-example.tsx`) and its loading drawing
 * sets the very same words unseen (`how-ghost.tsx`, through the kit's `GhostWords`): the drawing breaks each where the page
 * does, in any engine, by construction. The first and third steps say the week's price, floor and fee, which admins set
 * (L2): data, so the drawing keeps their measured table.
 * ⛔ Pure, with no word and no dictionary of its own: each recipe reads only what it is handed (`test:maswali-ui` 1.3b). No
 *    directive: the server page reads it as the client drawing does.
 */
import type { GhostWordsIn } from "@/components/maswali/maswali-ghost-words";
import { joinList, reserveLabel } from "@/components/maswali/maswali-format";
import { gradedSet, MAIN_COUNT, RESERVE_COUNT, slotOf, type GradableQuestion, type MaswaliPick } from "@/lib/maswali-score";
import { fill } from "@/lib/utils";

/** The example's voided main, as §10 §3.4 draws it ("4 → A1"). An illustration's place, not a rule. */
export const EXAMPLE_VOIDED_MAIN = 4;

/** The example's record (L9): every main matched but main 4, voided; every pick YES — an illustrative record the one
 *  grader reads, never a hand-made socket. The page draws its two frames from it (`sealLineOf`); the caption reads it here. */
export function exampleRecord(): { questions: GradableQuestion[]; picks: MaswaliPick[] } {
  const questions: GradableQuestion[] = [
    ...Array.from({ length: MAIN_COUNT }, (_, i) => ({ role: "MAIN" as const, ordinal: i + 1, outcome: i + 1 === EXAMPLE_VOIDED_MAIN ? "VOID" as const : "YES" as const })),
    ...Array.from({ length: RESERVE_COUNT }, (_, i) => ({ role: "RESERVE" as const, ordinal: i + 1, outcome: "YES" as const })),
  ];
  return { questions, picks: Array.from({ length: MAIN_COUNT + RESERVE_COUNT }, () => "YES" as const) };
}

/** The second step — the reserves, in order — kept as the page keeps a fact. */
export function howStepTwo({ t }: GhostWordsIn): { text: string } {
  return { text: t.millionea.howTwo };
}

/** The fourth step — no 10/10, and the whole pool carries forward — kept as the page keeps a fact. */
export function howStepFour({ t }: GhostWordsIn): { text: string } {
  return { text: t.millionea.howFour };
}

/** The example's caption, set bare as `how-example.tsx` sets it: the voided main, the reserve the one grader put in its
 *  place, and the reserves the final set leaves unused (L9), in the reader's own list form. */
export function howCaption({ t, locale }: GhostWordsIn): { text: string; keep: "bare" } {
  const set = gradedSet(exampleRecord().questions);
  const pairs = set.kind === "SET" ? set.pairs : [];
  const ordinalOf = (slot: number) => slot - slotOf("RESERVE", 1) + 1;
  const stand = pairs.find((p) => p.main === EXAMPLE_VOIDED_MAIN);
  const carried = new Set(pairs.map((p) => ordinalOf(p.reserve)));
  const unused = Array.from({ length: RESERVE_COUNT }, (_, i) => i + 1).filter((o) => !carried.has(o)).map(reserveLabel);
  return {
    text: fill(t.millionea.exampleCaption, { n: EXAMPLE_VOIDED_MAIN, r: reserveLabel(stand ? ordinalOf(stand.reserve) : 1), unused: joinList(locale, unused) }),
    keep: "bare",
  };
}
