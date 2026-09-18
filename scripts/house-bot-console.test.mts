/**
 * THE DESK'S CONSOLE — its audience, its one read door, its painted copy and its source law, on Postgres AND memory
 * (C7-SPEC §4; rulings 300–341, 346–356, 361, 373, 403–422, and owner-delegated 453).
 *
 *   npm run test:house-bot-console
 *
 * ⛔ WHAT THIS GUARDS, AND WHY IT IS NOT A LAYOUT'S JOB. Ruling 259 MEASURED it: every page, route handler and server
 * action under `src/app/admin` streams its payload to ANY signed-in account, a PLAYER included — the layout's redirect
 * and `AdminSectionGate` change what is PAINTED, not what is SENT, and a flight request whose router state names the
 * admin layouts skips them altogether. Ruling 260 then measured 72 of 606 non-staff responses carrying house audit
 * rows. So the desk's page decides its own audience, first statement, on the viewer's STORED role, and every figure it
 * renders comes from a NAMED reader inside `house-console-read.ts` that resolves that audience before it reads
 * anything. This suite proves both halves — behaviourally with a spy store, and at source level over the section.
 *
 * ⛔ AND IT GUARDS THE WORDS. Owner-delegated ruling 453: nothing the desk renders names the feature, not even behind
 * the gate, because a screenshot is the likeliest accidental disclosure channel this project has and the repository is
 * public. §3 and §4's `4.453` are that guard, over the painted view model AND over every string literal of the section
 * that can reach the DOM, with planted controls that put the original words back and must fire.
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED). The source pins run in the memory child only, so the
 * floor is a PER-STORE pair: a suite whose static half runs in one child must not let the other child's lower count
 * hide it.
 *
 * ⚠️ `red:house-bot-console` carries the mutations for every assertion here; it is run once at the commit close.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:house-bot-console",
  casesFile: "scripts/lib/house-bot-console-cases.mts",
  minPass: { memory: 60, postgres: 28 },
  dbPrefix: "hb_console",
});
