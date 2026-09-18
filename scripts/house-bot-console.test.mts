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
 * ⛔ AND THE PAIR IS NOW THE MEASURED COUNT (replan ruling 515, 2026-09-18). It stood at `{ memory: 60, postgres: 28 }`
 * — the value the suite was BORN with at `a897e47a` — while the run printed memory 153 / Postgres 86 at `98b5a2be`,
 * so the floor would not have noticed 93 memory cases and 58 Postgres cases vanishing. A floor that has never risen
 * is itself a finding, which is what 515 is. Raised to what `npm run test:house-bot-console` PRINTED at `d2f20795`:
 * **memory 154, Postgres 86** (ruling 513 added 4.453.c2, hence 154 rather than 153), and RAISED AGAIN at C7
 * step 3 to what this run PRINTED with the limits tab, the caption pair and the live trigger in it:
 * **memory 210, Postgres 117**, and again at step 2 with the D19 §5 and 398's roll-call in it: **memory 238,
 * Postgres 121**, and once more with the limits list's money/count face pinned: **memory 240, Postgres 122**,
 * and again at replan ruling 539's fixes — the widened counter stem, the derived override population, the swept
 * top-level copy and 513's raised floor: **memory 242, Postgres 124**, and again with ruling 348's own Proof
 * written for the first time (1.348): **memory 248, Postgres 128**, and again at ruling 541's four dead
 * mutations: **memory 250, Postgres 129**, and again with 306's sentence, 474's two clamps and 421's schema
 * state: **memory 262, Postgres 140**.
 * ⭐ RAISED AGAIN at replan ruling 537 — the limits SAVE, its refusal, its audit row, its CAS conflict under two
 * real writers, its neutral keys and the rendered field list — to what `npm run test:house-bot-console` PRINTED
 * on this run: **memory 307, Postgres 169** (303/166 before the served drive found the audit-failure lie and the card's doubled heading).
 * ⭐ RAISED AGAIN by C7 step 3's VISUAL pass (ruling 544 and 432(n)'s placeholder), to what
 * `npm run test:house-bot-console` PRINTED on that run: **memory 311, Postgres 171**. Both new assertions came
 * off a served tile, not off the source: `limits-at-1280.png` and `limits-over-1280.png` are pixel-identical in
 * the meter, and `form-dirty-360.png` showed one field saying "Not set" twice.
 * ⛔ A floor only ever rises, and
 * only to a count a run printed — never to an arithmetic guess.
 *
 * ⚠️ `red:house-bot-console` carries the mutations for every assertion here; it is run once at the commit close.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:house-bot-console",
  casesFile: "scripts/lib/house-bot-console-cases.mts",
  minPass: { memory: 311, postgres: 171 },
  dbPrefix: "hb_console",
});
