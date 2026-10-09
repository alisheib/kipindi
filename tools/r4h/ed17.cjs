const { edit } = require('./ed1.cjs');
edit('scripts/journey-tickets.test.mts', [
  [` * \`keepUnits\` (2026-10-08 · G1): the same words, with a number and its Chinese unit ("200毫米") kept on one line.
 */
const TITLE_WORDS = \`hover:underline">{keepUnits(title.text)}</Link>\`;`, ` * \`keepUnits\` (2026-10-08 · G1): the same words, with a number and its Chinese unit ("200毫米") kept on one line.
 * ⚠️ \`keepFigures\` since round 4 of the visual pass (2026-10-09, edges 197 255): keep-words.tsx's title rule, which keeps
 * \`keepUnits\`' ideograph unit and adds a season ("2026-27") and a unit word ("dakika 28:00") — the same words, every
 * title surface on one rule (visual-pass-r4h §5 holds it).
 */
const TITLE_WORDS = \`hover:underline">{keepFigures(title.text)}</Link>\`;`],
  [`const titleClamped = swap(CARD, "{keepUnits(title.text)}</Link>", \`<span className={title.short ? undefined : "line-clamp-2"}>{keepUnits(title.text)}</span></Link>\`);`,
   `const titleClamped = swap(CARD, "{keepFigures(title.text)}</Link>", \`<span className={title.short ? undefined : "line-clamp-2"}>{keepFigures(title.text)}</span></Link>\`);`],
]);
edit('scripts/landing-mine.test.mts', [
  [`  ok("3: a signed-in player gets SignedInAct where a visitor gets the CTAs",
     /\\{isAuthed \\? \\(\\s*<SignedInAct t=\\{t\\} mine=\\{mine \\?\\? null\\} \\/>/.test(hero));`,
   `  // ⚠️ \`journey={journey}\` since round 4 of the visual pass (2026-10-09, edges E4): in the journey the block's link to
  // /positions takes the tab's own name; the rest of the block is the same for both (visual-pass-r4h §8 holds the switch).
  ok("3: a signed-in player gets SignedInAct where a visitor gets the CTAs",
     /\\{isAuthed \\? \\(\\s*<SignedInAct t=\\{t\\} mine=\\{mine \\?\\? null\\} journey=\\{journey\\} \\/>/.test(hero));`],
]);
