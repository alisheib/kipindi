/**
 * THE AI PUBLISH HOP AND THE SERVER-SIDE REFUSAL — executed, not grepped.
 *
 * ⛔ TWO THINGS `test:criterion-i18n` ONLY ASSERTS BY REGEX, and this file runs:
 *
 *   §1 publishing an AI POLL carries its translations onto the market. §8 of the
 *      structural guard greps `resolutionCriterionSw: poll.resolutionCriterionSw` in
 *      the action. That proves the characters are in the file. It does not prove the
 *      value survives — and if it did not, the poll would hold a real translation
 *      while the player was told there is none. A write-only field.
 *
 *   §2 the SERVER refuses a bad translation. The wizard refuses in the browser, which
 *      is where an officer sees it — but the browser is not the guarantee. A stale
 *      tab, a replayed action or a hand-rolled POST reaches the action directly, and
 *      the whole F8 lesson is that the copy must never reach the disk.
 *
 * ⚠️ Exercises the SERVICE layer (editAIPoll / the publish mapping / createMarket).
 * `createMarketAction` itself cannot be called here — it is a "use server" action
 * behind session + TOTP + RBAC — so its refusal is proven at the shared rule it calls
 * and in the browser by `qa:criterion-publish`, and its wiring by the structural §7.
 * Saying which layer each check covers is the point; a check that implies more than
 * it tests is the defect this whole session is about.
 *
 * Run: DATABASE_URL=<local 5433> npm run test:criterion-ai-publish
 */
import { editAIPoll, getAIPoll, type StoredAIPoll } from "../src/lib/server/ai-poll-generation.ts";
import { createMarket, getMarket } from "../src/lib/server/market-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { criterionTranslationIssue, normaliseCriterionTranslation, pickCriterion } from "../src/lib/localized.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const EN = "Resolves YES if the Bank of Tanzania official daily mid-rate published on the last business day of the month is strictly below the rate published on the first business day.";
const SW = "Inatatuliwa NDIYO iwapo kiwango rasmi cha katikati cha Benki Kuu ya Tanzania kilichochapishwa siku ya mwisho ya kazi ya mwezi kiko chini ya kiwango cha siku ya kwanza.";
const ZH = "若坦桑尼亚银行在当月最后一个营业日公布的官方每日中间价严格低于第一个营业日公布的价格，则结算为“是”。";
const RUN = `aipub-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
const createdMarkets: string[] = [];

console.log(`DAL: ${process.env.DATABASE_URL ? "REAL POSTGRES" : "in-memory"}  run=${RUN}\n`);

// Raw SQL, only for creating and destroying THIS run's own AIPoll row. There is no
// test factory for one, and borrowing a fixture is how the first draft of this file
// left a poll it could not repair.
let sql: ((q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>) | null = null;
let closePg: (() => Promise<void>) | null = null;
if (process.env.DATABASE_URL) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  sql = async (q, p) => (await client.query(q, p as never[])).rows;
  closePg = () => client.end();
}

// ── 1 · THE PUBLISH HOP, with the exact mapping the action performs ─────────
// The action builds this call from a StoredAIPoll. Building the same call from the
// same shape and running it is the difference between "the line exists" and "the
// value arrives".
{
  const poll = {
    resolutionCriterion: EN,
    resolutionCriterionSw: SW,
    resolutionCriterionZh: ZH,
    titleEn: `AI ${RUN} will the shilling strengthen?`,
    titleSw: "AI sw", titleZh: "AI zh",
    selectionClosedAt: new Date(Date.now() + 25 * 86400000).toISOString(),
    resolutionAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    sources: [{ url: "https://www.bot.go.tz", publisher: "BoT" }],
  } as unknown as StoredAIPoll;

  const market = await createMarket({
    titleEn: poll.titleEn,
    titleSw: poll.titleSw || poll.titleEn,
    titleZh: poll.titleZh || null,
    category: "macro",
    sourceUrl: poll.sources[0]?.url ?? "",
    resolutionCriterion: poll.resolutionCriterion,
    resolutionCriterionSw: poll.resolutionCriterionSw,
    resolutionCriterionZh: poll.resolutionCriterionZh,
    resolutionAt: poll.resolutionAt,
    selectionClosedAt: poll.selectionClosedAt,
    proposedBy: "officer-test",
  });
  createdMarkets.push(market.id);

  const back = await getMarket(market.id);
  ok("1: publishing an AI poll puts its Swahili criterion on the MARKET",
     back?.resolutionCriterionSw === SW, back?.resolutionCriterionSw?.slice(0, 24) ?? "null");
  ok("1: …and its Chinese", back?.resolutionCriterionZh === ZH);

  // ⭐ And the consequence a player would actually experience.
  const sw = pickCriterion("sw", back!.resolutionCriterion, back!.resolutionCriterionSw, back!.resolutionCriterionZh);
  ok("1: so a Swahili player reads the AI's Swahili, not an English fallback",
     sw.text === SW && sw.shownIn === "sw" && sw.fellBack === false);
}

// ── 2 · THE SERVER-SIDE REFUSAL, at the shared rule every writer calls ──────
// ⛔ The browser is where the officer SEES the refusal; it is not the guarantee.
{
  ok("2: the English pasted as a translation is refused",
     criterionTranslationIssue(EN, EN) === "SAME_AS_ENGLISH");
  ok("2: a stub is refused", criterionTranslationIssue("n/a", EN) === "TOO_SHORT");
  ok("2: a real translation is accepted", criterionTranslationIssue(SW, EN) === null);

  // The storage guarantee: even a caller that ignored the refusal cannot write it.
  const m = await createMarket({
    titleEn: `AI ${RUN} refusal probe`,
    titleSw: "x", titleZh: null,
    category: "macro",
    sourceUrl: "https://www.bot.go.tz",
    resolutionCriterion: EN,
    resolutionCriterionSw: EN.toUpperCase(),   // the English, re-cased — the paste-and-tweak case
    resolutionCriterionZh: "  ",               // whitespace only
    resolutionAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    proposedBy: "officer-test",
  });
  createdMarkets.push(m.id);
  const back = await getMarket(m.id);
  ok("2: a re-cased copy of the English is NOT stored as a translation",
     back?.resolutionCriterionSw === null, `${back?.resolutionCriterionSw}`);
  ok("2: whitespace is not stored either", back?.resolutionCriterionZh === null, `${back?.resolutionCriterionZh}`);
}

// ── 3 · the OFFICER's edit path — editAIPoll applies the same rule ──────────
// The admin edit panel posts through `editAIPoll`. If the rule were not applied
// there, an officer could paste the English into the Swahili box and store it,
// which is F8 arriving by a third route.
// ⚠️ There is no test factory for an AIPoll, so this uses the product's OWN fixture
// seeder and an EXISTING editable poll. The first draft of this file imported a
// `createAIPollForTest` that does not exist — which would have crashed the suite on
// import rather than failing an assertion. Asserting against a symbol you have not
// read is the same mistake as asserting against a file you have not read.
{
  // ⛔ THIS SECTION CREATES ITS OWN POLL. It must not borrow one, and the first draft
  // did — with a consequence I only saw by running it: `editAIPoll` re-validates and
  // sets `state = FILTERED` when the verdict fails, while its own entry guard admits
  // only PENDING_REVIEW / EDITING. So one edit can make a poll permanently uneditable,
  // and the borrowed fixture could NOT BE PUT BACK. A harness that damages state it
  // did not create is destructive however green it prints.
  // ⭐ That behaviour is a real finding in its own right — filed as F11/E-152 — and it
  // is demonstrated deterministically below rather than tripped over.
  if (!sql) {
    console.log("SKIP 3 — needs DATABASE_URL to create an isolated AI poll; the officer edit wiring stays covered by §7 of test:criterion-i18n");
  } else {
    const id = `aip_${RUN.replace(/[^a-z0-9]/gi, "")}`;
    await sql(
      `insert into "AIPoll"
        (id, state, "requestCategory", "requestPrompt", "filterReasons", "qualityIndicators",
         "overallQuality", "titleEn", "titleSw", "titleZh", category, "resolutionCriterion",
         "resolutionAt", options, sources, confidence, reasoning, "rejectReasons", "createdAt", "updatedAt")
       values ($1,'PENDING_REVIEW','macro','e2e','[]'::jsonb,'[]'::jsonb,90,$2,$3,$4,'macro',$5,
               now() + interval '30 days', '[]'::jsonb, $6::jsonb, 80, 'e2e', '[]'::jsonb, now(), now())`,
      [id, `AI ${RUN} edit probe`, "AI sw", "AI zh", EN,
       JSON.stringify([{ url: "https://www.bot.go.tz", publisher: "BoT" }])]);

    const seeded = await getAIPoll(id);
    ok("3: an isolated AI poll was created for the edit test", !!seeded && seeded.state === "PENDING_REVIEW",
       seeded ? `state=${seeded.state}` : "not created");

    const good = await editAIPoll(id, { officerId: "officer-test", resolutionCriterionSw: SW });
    ok("3: editAIPoll stores a real Swahili criterion", good?.resolutionCriterionSw === SW,
       good ? `${good.resolutionCriterionSw?.slice(0, 20)} state=${good.state}` : "editAIPoll returned null");

    // ⭐ F11/E-152, ASSERTED RATHER THAN SUFFERED. Editing ONLY the Swahili criterion —
    // a field `validateAndFilter` is never even passed — can still flip the poll to
    // FILTERED, and `editAIPoll` then refuses every further edit. This records the
    // behaviour so a future change to it is a deliberate decision, not a surprise.
    const stateAfter = good?.state ?? "null";
    const second = await editAIPoll(id, { officerId: "officer-test", resolutionCriterionSw: EN });
    if (stateAfter === "FILTERED") {
      ok("3: ⚠️ F11 — one edit moved the poll to FILTERED, and a second edit is then REFUSED",
         second === null, `second=${second === null ? "null (refused)" : second.state}`);
    } else {
      ok("3: …and refuses the English pasted in as a translation",
         second?.resolutionCriterionSw === null, `${second?.resolutionCriterionSw}`);
    }

    await sql(`delete from "AIPoll" where id = $1`, [id]);
    ok("3: the poll this run created was deleted", (await getAIPoll(id)) === null);
  }
}

// ── 4 · cleanup, by id ─────────────────────────────────────────────────────
{
  for (const id of createdMarkets) await marketStore.delete(id);
  const left: string[] = [];
  for (const id of createdMarkets) if (await marketStore.get(id)) left.push(id);
  ok("4: every market this run created was removed", left.length === 0, `${left.length} left`);
}

console.log(`\ncriterion-ai-publish-e2e: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
