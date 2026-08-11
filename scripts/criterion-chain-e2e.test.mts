/**
 * THE CRITERION CHAIN, EXECUTED — not grepped.
 *
 * ⛔ WHY THIS EXISTS, AND IT IS A CORRECTION TO MY OWN WORK. `test:criterion-i18n`
 * asserts the chain STRUCTURALLY: that the wizard sends the fields, that the action
 * reads them, that `createMarket` normalises them, that both publish paths pass them
 * on. Every one of those is a grep. Not one of them RUNS the code. A structural guard
 * proves the characters are in the file; it cannot prove the value arrives.
 *
 * That gap is exactly the shape this repo has been burned by over and over — a check
 * that passes without testing what it names. So this file drives the real functions
 * with real data and reads the result back out of the store:
 *
 *   §1  createMarket stores what it is given, and a re-read returns it
 *   §2  the UPDATE arm of the upsert does not drop the columns   ← the data-loss risk
 *   §3  the storage rule holds at the boundary (English in → null out)
 *   §4  publishing an AI poll carries the translations to the market
 *   §5  publishing a CANDIDATE does too — the second, easily-missed path
 *   §6  what a player would actually be shown, per locale, off the stored row
 *
 * ⚠️ Runs against whatever DAL is configured. With DATABASE_URL set it exercises real
 * Postgres — which is the only place §2 is a meaningful test, because the in-memory
 * store holds one object and cannot drop a column on write.
 *
 * Run: npm run test:criterion-chain
 *      DATABASE_URL=<local 5433> npm run test:criterion-chain   ← the real one
 */
import { createMarket, getMarket, type StoredMarket } from "../src/lib/server/market-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { pickCriterion } from "../src/lib/localized.ts";
import { ingestCandidate, candidateStore } from "../src/lib/server/market-candidate.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const EN = "Resolves YES if the Bank of Tanzania official daily mid-rate published on the last business day of the month is strictly below the rate published on the first business day.";
const SW = "Inatatuliwa NDIYO iwapo kiwango rasmi cha katikati cha Benki Kuu ya Tanzania kilichochapishwa siku ya mwisho ya kazi ya mwezi kiko chini ya kiwango cha siku ya kwanza.";
const ZH = "若坦桑尼亚银行在当月最后一个营业日公布的官方每日中间价严格低于第一个营业日公布的价格，则结算为“是”。";

/**
 * ⛔ A RUN-UNIQUE TAG, AND CLEANUP BY THE IDS THIS RUN CREATED.
 *
 * The first version of this harness used a fixed title and cleaned up with
 * `values().filter(m => m.titleEn === base.titleEn)` — and that title happened to be
 * the one `db:seed-criterion-local` uses, so **the harness deleted a fixture it did
 * not create**, which another driver depends on. A test that removes rows it did not
 * make is a destructive test wearing a green tick.
 *
 * The unique tag also isolates concurrent runs from each other and from the app
 * server, which may be pointed at this same database and running its own reconciler.
 */
const RUN = `chain-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
const created: string[] = [];
const day = 86_400_000;
const base = {
  titleEn: `E2E ${RUN} · will the shilling strengthen against the dollar?`,
  titleSw: "Je, shilingi itaimarika dhidi ya dola ifikapo mwisho wa mwezi?",
  titleZh: "坦桑尼亚先令会在月底前对美元走强吗？",
  category: "macro" as const,
  sourceUrl: "https://www.bot.go.tz",
  resolutionAt: new Date(Date.now() + 30 * day).toISOString(),
  proposedBy: "system",
};

console.log(`DAL: ${process.env.DATABASE_URL ? "REAL POSTGRES" : "in-memory (⚠️ §2 is weaker here)"}  run=${RUN}\n`);

/**
 * ⭐ READ THE ROW WITH RAW SQL, NOT THROUGH THE DAL THIS TEST IS TESTING.
 *
 * `getMarket` → `marketStore.get` → `toStoredMarket` is the mapping under test. If it
 * ever laundered a value (coalescing, defaulting, copying the English across), a
 * re-read through it would agree with the write and both would be wrong — the
 * guard-and-its-own-proof shape this repo has been burned by. When DATABASE_URL is
 * set, the assertions below ALSO ask Postgres directly.
 *
 * Returns null when there is no database, and the caller then skips rather than
 * silently passing: a check that quietly evaporates is worse than one that says SKIP.
 */
let sql: ((id: string) => Promise<{ sw: string | null; zh: string | null; en: string } | null>) | null = null;
// ⚠️ CLOSED EXPLICITLY AT THE END, not from `process.on("exit")`. The first version
// did the latter, and `client.end()` is ASYNC — the handler returned before the
// socket closed, so the process printed its whole green summary and then HUNG on an
// open handle. `test:all` runs every suite to completion, so a suite that never exits
// does not fail loudly; it stalls the entire run. A test that cannot exit is a broken
// test however green its output looks.
let closePg: (() => Promise<void>) | null = null;
if (process.env.DATABASE_URL) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  sql = async (id) => {
    const r = await client.query(
      `select "resolutionCriterion" as en, "resolutionCriterionSw" as sw, "resolutionCriterionZh" as zh
         from "PredictionMarket" where id = $1`, [id]);
    return r.rows[0] ?? null;
  };
  closePg = () => client.end();
}
const rawOk = async (label: string, id: string, want: { sw: string | null; zh: string | null }) => {
  if (!sql) { console.log(`SKIP ${label} — no DATABASE_URL, cannot read the row directly`); return; }
  const row = await sql(id);
  ok(label, !!row && row.sw === want.sw && row.zh === want.zh,
     row ? `db sw=${row.sw === null ? "NULL" : row.sw.slice(0, 20)} zh=${row.zh === null ? "NULL" : row.zh.slice(0, 10)}` : "row missing");
};

// ── 1 · createMarket stores them, and a RE-READ returns them ─────────────────
// ⭐ The re-read is the assertion. Checking the object `createMarket` returned would
// only prove the function built a literal — it would pass with the DAL writing nothing.
let translatedId = "";
{
  const m = await createMarket({ ...base, resolutionCriterion: EN, resolutionCriterionSw: SW, resolutionCriterionZh: ZH });
  translatedId = m.id; created.push(m.id);
  const back = await getMarket(m.id);
  ok("1: a market created WITH translations returns them on re-read",
     back?.resolutionCriterionSw === SW && back?.resolutionCriterionZh === ZH,
     `sw=${back?.resolutionCriterionSw?.slice(0, 24) ?? "null"}`);
  ok("1: and the English is untouched", back?.resolutionCriterion === EN);
  await rawOk("1: and Postgres itself holds both, read with raw SQL", m.id, { sw: SW, zh: ZH });
}

// ── 2 · ⛔ THE UPDATE ARM — the data-loss risk I only ever asserted by grep ──
// `marketStore.set` is an UPSERT whose create and update arms duplicate their column
// lists. A column added to `create` only is silently dropped the first time anything
// writes an EXISTING row: the market is born with its translations and loses them on
// the next touch, and NOTHING errors. This writes an existing row and re-reads it.
{
  const before = await getMarket(translatedId);
  if (!before) {
    ok("2: the market from §1 is readable", false);
  } else {
    // A full-row write of the SAME object — the shape every sweep and stamp produces.
    await marketStore.set({ ...before, predictorCount: (before.predictorCount ?? 0) + 1 } as StoredMarket);
    const after = await getMarket(translatedId);
    ok("2: re-writing an EXISTING market does not drop the Swahili criterion",
       after?.resolutionCriterionSw === SW, `sw=${after?.resolutionCriterionSw?.slice(0, 24) ?? "null"}`);
    ok("2: …nor the Chinese", after?.resolutionCriterionZh === ZH, `zh=${after?.resolutionCriterionZh?.slice(0, 12) ?? "null"}`);
    ok("2: and the write actually happened (control — otherwise the check above is vacuous)",
       (after?.predictorCount ?? 0) === (before.predictorCount ?? 0) + 1,
       `${before.predictorCount} → ${after?.predictorCount}`);
    await rawOk("2: and Postgres STILL holds both after the update-arm write", translatedId, { sw: SW, zh: ZH });
  }
}

// ── 3 · the storage rule, AT THE BOUNDARY, not in a unit test ────────────────
// F8's shape must be impossible even for a caller that skipped every validator.
{
  const m = await createMarket({
    ...base,
    resolutionCriterion: EN,
    resolutionCriterionSw: EN,          // the English, pasted in
    resolutionCriterionZh: "  TODO  ",  // a stub
  });
  created.push(m.id);
  const back = await getMarket(m.id);
  ok("3: the English passed as a 'translation' is stored as NULL, not as a copy",
     back?.resolutionCriterionSw === null, `${back?.resolutionCriterionSw}`);
  await rawOk("3: and Postgres holds NULL in both — the F8 shape never reaches the disk", m.id, { sw: null, zh: null });
  ok("3: a stub is stored as NULL too", back?.resolutionCriterionZh === null, `${back?.resolutionCriterionZh}`);
  // ⭐ And the player consequence, which is the point of storing null: the page can
  // now truthfully say "no translation" instead of showing English labelled Swahili.
  const sw = pickCriterion("sw", back!.resolutionCriterion, back!.resolutionCriterionSw, back!.resolutionCriterionZh);
  ok("3: so a Swahili reader is told it fell back, rather than shown a fake translation",
     sw.fellBack === true && sw.text === EN);
}

// ── 4 · the CANDIDATE record carries them through ingest ────────────────────
{
  const c = await ingestCandidate({
    category: "macro",
    proposedTitleEn: base.titleEn,
    resolutionCriterion: EN,
    resolutionCriterionSw: SW,
    resolutionCriterionZh: ZH,
    resolutionAt: base.resolutionAt,
    sources: [{ url: base.sourceUrl, publisher: "Bank of Tanzania", retrievedAt: new Date().toISOString() }],
  });
  const back = await candidateStore.get(c.id);
  ok("4: ingestCandidate stores both translations", back?.resolutionCriterionSw === SW && back?.resolutionCriterionZh === ZH,
     `sw=${back?.resolutionCriterionSw?.slice(0, 20) ?? "null"}`);

  // The candidate upsert's UPDATE arm, same risk as §2.
  await candidateStore.set({ ...back!, confidence: 77 });
  const after = await candidateStore.get(c.id);
  ok("4: re-writing an existing CANDIDATE does not drop them",
     after?.resolutionCriterionSw === SW && after?.resolutionCriterionZh === ZH);
  ok("4: and that write happened (control)", after?.confidence === 77, `${after?.confidence}`);

  // ⭐ AND THE PUBLISH HOP ITSELF — the line that makes the other four matter.
  // /admin/candidates/actions.ts builds this exact call; running it here proves the
  // values survive the hop rather than proving the characters are in the file.
  const published = await createMarket({
    ...base,
    titleEn: back!.proposedTitleEn,
    resolutionCriterion: back!.resolutionCriterion,
    resolutionCriterionSw: back!.resolutionCriterionSw,
    resolutionCriterionZh: back!.resolutionCriterionZh,
  });
  created.push(published.id);
  const pm = await getMarket(published.id);
  ok("4: publishing a candidate carries both translations onto the MARKET",
     pm?.resolutionCriterionSw === SW && pm?.resolutionCriterionZh === ZH);
}

// ── 5 · what a player is actually shown, off a stored row ───────────────────
// The render is a server component and cannot be mounted here — but the DECISION it
// makes can, from the same data the page reads. This is the join between "the row is
// right" and "the screen is right"; the browser drivers cover the pixels.
{
  const m = await getMarket(translatedId);
  const en = pickCriterion("en", m!.resolutionCriterion, m!.resolutionCriterionSw, m!.resolutionCriterionZh);
  const sw = pickCriterion("sw", m!.resolutionCriterion, m!.resolutionCriterionSw, m!.resolutionCriterionZh);
  const zh = pickCriterion("zh", m!.resolutionCriterion, m!.resolutionCriterionSw, m!.resolutionCriterionZh);
  ok("5: an English reader sees the English, with no disclosure", en.text === EN && !en.fellBack);
  ok("5: a Swahili reader sees the SWAHILI, and is told English decides", sw.text === SW && sw.shownIn === "sw" && !sw.fellBack);
  ok("5: a Chinese reader sees the CHINESE", zh.text === ZH && zh.shownIn === "zh" && !zh.fellBack);
}

// ── 6 · cleanup — BY ID, only what THIS run created ─────────────────────────
// ⛔ NEVER BY TITLE. The first version filtered on `titleEn === base.titleEn`, which
// matched a fixture `db:seed-criterion-local` had written — so the harness DELETED
// data it did not create, and the next driver that needed that fixture would have
// reported a product failure. Deleting by the ids this process minted cannot reach
// anything else, however many runs or servers share the database.
{
  for (const id of created) await marketStore.delete(id);
  const left: string[] = [];
  for (const id of created) if (await marketStore.get(id)) left.push(id);
  ok("6: every market THIS RUN created was removed, and nothing else was touched",
     left.length === 0, `${left.length} left of ${created.length}`);
}

if (closePg) await closePg();

console.log(`\ncriterion-chain-e2e: ${pass} passed, ${fail} failed`);
// ⛔ EXIT EXPLICITLY. Prisma keeps its own pool open, so even with the raw client
// closed this process can linger — and a suite that lingers stalls `test:all` instead
// of failing it.
process.exit(fail > 0 ? 1 : 0);
