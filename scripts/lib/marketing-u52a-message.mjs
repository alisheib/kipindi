/**
 * U52a · THE DRIVE'S MESSAGE — the words of every REAL SMS of the live drive, in ONE place. Ali, 2026-10-09, in the session:
 * "make the test SMS say something not like we are live — soon big things will be out and what's hidden will be revealed, stay
 * tuned", and then, for the same words, "in a nice way" (the greeting by name).
 *
 * ⭐ WHO READS IT, and why nothing else may hold a copy:
 *   · the RUN SHEET (`docs/marketing-specs/ENGINE-SPEC.md` §4.18, "AS BUILT — the run sheet") quotes both bodies, both words and
 *     the campaign names, and `test:marketing-preflight` P9 holds every quote to these strings, character for character;
 *   · the shared core (`marketing-u52a.mjs`) re-exports it; the evidence's standing check DRIVE'S MESSAGE holds every campaign's four
 *     stored fields to these words (compared in SQL, the words bound as values), and SENT AS WRITTEN holds every message the drive
 *     put on the wire to the lengths these bodies can have (`driveLengthWindows`);
 *   · the stand-in world (`marketing-u52a-world.mts`) and the scratch-Postgres probe (`marketing-u52a-pg-probe.mts`) build their
 *     campaign and message rows from it;
 *   · the admin guide (`scripts/live/admin-guide.mjs`): its main example campaign IS this message, so the guide's pictures show
 *     the owner the very first test he will send.
 * ⛔ PLAIN DATA, NO IMPORT — the admin guide runs under plain `node`, which cannot load the core's `.ts` imports.
 *
 * ⛔ THE WORDS ARE THE OFFICER'S, SENT EXACTLY AS WRITTEN (the owner's ruling of 2026-10-09): nothing is appended to them — no
 * stop link, no "18+", no helpline, no source line. `{jina}` is the composer's one placeholder: the account's own first name, or,
 * for a contact-book number (or a name the renderer will not print), the word below. Plain GSM-7 only — straight apostrophes,
 * commas, no dash, no curly quote, no emoji — and ONE SMS each with the name's 12-character reserve: `test:marketing-preflight`
 * D1 runs them through the composer's own verdict and renderer, and refuses any other words.
 * ⛔ THE DRIVE'S CAMPAIGNS ARE TOLD APART BY THEIR NAME (staff-only, never sent), never by these words: every campaign of the
 * drive — A, B, C and a retry — carries this same message.
 */

/** The message every real SMS of the drive carries — the composer's own four fields, as the officer types them. */
export const DRIVE_MESSAGE = Object.freeze({
  bodySw: "50pick: Habari {jina}! Mambo makubwa yanakuja hivi karibuni, na kilichofichwa kitafichuka. Kaa nasi, hutataka kukosa!",
  bodyEn: "50pick: Hello {jina}! Big things are coming soon, and what's hidden will be revealed. Stay tuned, you won't want to miss it!",
  nameFallbackSw: "Rafiki",
  nameFallbackEn: "Friend",
});

/** The drive's campaign names — one per step that makes a campaign, D the one retry the spare allows. Staff-only, never sent. */
export const DRIVE_CAMPAIGN_NAMES = Object.freeze({ A: "U52a drive A", B: "U52a drive B", C: "U52a drive C", D: "U52a drive D" });
