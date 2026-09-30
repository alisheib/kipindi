/**
 * test:journey-funnel — the §3.10 counters' store and allow-list (the Vodacom plan S3b, §0f).
 *
 *   npm run test:journey-funnel     (in predeploy)
 *   npm run red:journey-funnel      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 *   1. THE BODY — `POST /api/funnel` accepts exactly what the beacon builds for a BROWSER step (sheet_open,
 *      low_balance) and nothing else: a server step (bet, deposit_confirmed) from a browser, an origin the step does not
 *      allow, an unknown variant, an extra or missing key, a tag outside the safe shape, junk — all refused.
 *   2. THE SERVER EVENT — the server steps pass the same allow-list; campaign tags are stored lowercased; anything the
 *      list does not name is dropped.
 *   3. THE TOTALS — counted on the EAST AFRICA day (23:30 EAT is not the UTC day), aggregated per dimension, read back by
 *      an inclusive day range, and pruned after exactly 400 days.
 *   4. NO IDENTIFIER — the model's columns are exactly the day, the five tags and the count (no user, session, IP,
 *      market or amount), and its migration only creates.
 *   5. RETENTION — `retention.purge.daily` prunes it and reports how many rows went.
 *   6. THE CAMPAIGN TAGS — the visit's first-touch `utm_source` / `utm_campaign`, safe shapes only.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written (the store is in memory).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as F from "../src/lib/journey/funnel.ts";
import * as S from "../src/lib/server/journey-funnel.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const SCHEMA = read("prisma/schema.prisma");
const MIGRATION = read("prisma/migrations/20261001120000_journey_funnel/migration.sql");
const RETENTION = read("src/lib/server/retention.ts");
const PROVE_RED = process.argv.includes("--prove-red");

type Impl = {
  parse: typeof F.parseFunnelBody; body: typeof F.funnelBody; norm: typeof S.normaliseFunnelEvent;
  record: typeof S.recordFunnel; rows: typeof S.funnelRows; prune: typeof S.pruneJourneyFunnel;
  utm: typeof F.utmFromSearch; readUtm: typeof F.readUtm; schema: string; migration: string; retention: string;
};
const REAL: Impl = {
  parse: F.parseFunnelBody, body: F.funnelBody, norm: S.normaliseFunnelEvent, record: S.recordFunnel, rows: S.funnelRows,
  prune: S.pruneJourneyFunnel, utm: F.utmFromSearch, readUtm: F.readUtm, schema: SCHEMA, migration: MIGRATION, retention: RETENTION,
};
const DAY = 86_400_000;
/** An instant written in East Africa Time (UTC+3). */
const eat = (y: number, mo: number, d: number, h: number, mi = 0) => Date.UTC(y, mo - 1, d, h - 3, mi);

async function run(impl: Impl, log: (l: string) => void, tag: string): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const j = (v: unknown) => JSON.stringify(v);
  // Each run writes its OWN campaign tag, so a planted run never reads another run's totals.
  const T = `run${tag}`;

  /* 1 · the body */
  const good = impl.body({ step: "sheet_open", origin: "home", variant: "old", utmSource: "facebook", utmCampaign: "launch" });
  const lowBal = impl.body({ step: "low_balance", origin: "updown", variant: "new", utmSource: "", utmCampaign: "" });
  ok("1.valid · the beacon's own bodies for the two browser steps are accepted, exactly as built",
    j(impl.parse(good)) === j({ step: "sheet_open", origin: "home", variant: "old", utmSource: "facebook", utmCampaign: "launch" })
      && impl.parse(lowBal)?.step === "low_balance", j({ good: impl.parse(good), lowBal: impl.parse(lowBal) }));
  const refuse = [
    JSON.stringify({ s: "bet", o: "dial", v: "old", us: "", uc: "" }),
    JSON.stringify({ s: "deposit_confirmed", o: "direct", v: "old", us: "", uc: "" }),
    JSON.stringify({ s: "sheet_open", o: "dial", v: "old", us: "", uc: "" }),
    JSON.stringify({ s: "sheet_open", o: "home", v: "beta", us: "", uc: "" }),
    JSON.stringify({ s: "sheet_open", o: "home", v: "old", us: "", uc: "", u: "usr_1" }),
    JSON.stringify({ s: "sheet_open", o: "home", v: "old", us: "" }),
    JSON.stringify({ s: "sheet_open", o: "home", v: "old", us: "Facebook", uc: "" }),
    JSON.stringify({ s: "sheet_open", o: "home", v: "old", us: "a\"b", uc: "" }),
    JSON.stringify({ s: "sheet_open", o: "home", v: "old", us: "x".repeat(65), uc: "" }),
    "not json", "[]", "", JSON.stringify({ s: "sheet_open", o: "home", v: "old", us: "", uc: "", pad: "x".repeat(600) }),
  ];
  const got = refuse.map((b) => { try { return impl.parse(b); } catch { return "threw"; } });
  ok("1.refused · a server step from a browser, a foreign origin, an unknown variant, an extra key (an id), a missing key, an uppercase or unsafe or long tag, junk, an array, empty, oversized — all null, never a throw",
    got.every((g) => g === null), j(got));

  /* 2 · the server event */
  const bet = impl.norm({ step: "bet", origin: "dial", variant: "old", utmSource: "Facebook ", utmCampaign: "LAUNCH" });
  const dep = impl.norm({ step: "deposit_confirmed", origin: "low_balance", variant: "old" });
  const badOrigin = impl.norm({ step: "bet", origin: "home", variant: "old" });
  const badStep = impl.norm({ step: "withdraw" as never, origin: "x", variant: "old" });
  ok("2.server · the server steps pass the same list (tags stored lowercased); an origin or step the list does not name is dropped",
    j(bet) === j({ step: "bet", origin: "dial", variant: "old", utmSource: "facebook", utmCampaign: "launch" })
      && dep?.origin === "low_balance" && dep.utmSource === "" && badOrigin === null && badStep === null, j({ bet, dep, badOrigin, badStep }));

  /* 3 · the totals */
  const late = eat(2026, 10, 1, 23, 30);              // 20:30 UTC on 1 Oct — still 1 Oct in EAT
  const after = eat(2026, 10, 2, 0, 30);              // 21:30 UTC on 1 Oct — 2 Oct in EAT
  for (const t of [late, late, after]) await impl.record({ step: "sheet_open", origin: "home", variant: "old", utmSource: T, utmCampaign: "" }, t);
  await impl.record({ step: "sheet_open", origin: "board", variant: "old", utmSource: T, utmCampaign: "" }, late);
  await impl.record({ step: "bet", origin: "home" as never, variant: "old", utmSource: T, utmCampaign: "" }, late); // refused
  const rows = (await impl.rows("2026-10-01", "2026-10-02")).filter((r) => r.utmSource === T);
  const find = (day: string, origin: string) => rows.find((r) => r.day === day && r.origin === origin)?.count ?? 0;
  ok("3.day · counted on the EAST AFRICA day: two opens at 23:30 EAT on 1 Oct, one at 00:30 EAT on 2 Oct (the same UTC day), one board open; the refused bet counted nowhere",
    find("2026-10-01", "home") === 2 && find("2026-10-02", "home") === 1 && find("2026-10-01", "board") === 1 && rows.length === 3,
    j(rows.map((r) => [r.day, r.step, r.origin, r.count])));
  const one = (await impl.rows("2026-10-02", "2026-10-02")).filter((r) => r.utmSource === T);
  ok("3.range · a range reads its days inclusively and nothing else", one.length === 1 && one[0].day === "2026-10-02", j(one));
  const old = eat(2025, 6, 1, 12);
  await impl.record({ step: "low_balance", origin: "dial", variant: "old", utmSource: T, utmCampaign: "" }, old);
  const now = old + 400 * DAY;                         // exactly 400 days later: the row's day is the cut-off day — kept
  await impl.prune(now);
  const kept = (await impl.rows("2025-06-01", "2025-06-01")).filter((r) => r.utmSource === T).length;
  await impl.prune(now + DAY);                         // a day later it is past the period — pruned
  const gone = (await impl.rows("2025-06-01", "2025-06-01")).filter((r) => r.utmSource === T).length;
  ok("3.prune · totals are kept 400 days and pruned the day after", kept === 1 && gone === 0 && S.JOURNEY_FUNNEL_RETENTION_DAYS === 400, j({ kept, gone }));

  /* 4 · no identifier */
  const block = /model JourneyFunnelDay \{([\s\S]*?)\n\}/.exec(impl.schema)?.[1] ?? "";
  const fields = block.split("\n").map((l) => l.trim()).filter((l) => /^[a-zA-Z]\w*\s/.test(l)).map((l) => l.split(/\s+/)[0]);
  ok("4.columns · the model's columns are exactly the day, the five tags and the count — no user, session, IP, market or amount",
    j(fields) === j(["id", "day", "step", "origin", "variant", "utmSource", "utmCampaign", "count"]), j(fields));
  const sql = impl.migration.replace(/--[^\n]*/g, "");
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  ok("4.migration · it only CREATEs, IF NOT EXISTS (no DROP, ALTER, UPDATE or DELETE)",
    statements.length === 3 && statements.every((s) => /^CREATE (?:TABLE|UNIQUE INDEX|INDEX) IF NOT EXISTS "JourneyFunnelDay/.test(s))
      && !/\b(DROP|ALTER|UPDATE|DELETE)\b/i.test(sql), j(statements.map((s) => s.slice(0, 50))));

  /* 5 · retention */
  ok("5.retention · retention.purge.daily prunes the funnel totals, best-effort, and reports the rows",
    /const journeyFunnelRows = await pruneJourneyFunnel\(now\)/.test(impl.retention) && /journeyFunnelRows, journeyFunnelRetentionDays: JOURNEY_FUNNEL_RETENTION_DAYS/.test(impl.retention)
      && /\|\| journeyFunnelRows > 0 \|\|/.test(impl.retention));

  /* 6 · the campaign tags */
  const u1 = impl.utm(new URLSearchParams("utm_source=Facebook&utm_campaign=Vodacom Launch&utm_medium=cpc"));
  const u2 = impl.utm(new URLSearchParams("utm_source=<x>&ref=abc"));
  const r1 = impl.readUtm(JSON.stringify({ s: "facebook", c: "launch" })), r2 = impl.readUtm("{junk"), r3 = impl.readUtm(JSON.stringify({ s: "<b>", c: 5 }));
  ok("6.utm · the first touch keeps utm_source and utm_campaign lowercased; an unsafe value is dropped; a stored value is read defensively",
    j(u1) === j({ s: "facebook", c: "vodacom launch" }) && u2 === null && j(r1) === j({ s: "facebook", c: "launch" }) && j(r2) === j({ s: "", c: "" }) && j(r3) === j({ s: "", c: "" }),
    j({ u1, u2, r1, r2, r3 }));
  return failed;
}

if (!PROVE_RED) {
  console.log("journey-funnel — the Vodacom plan S3b counters (in-memory store)");
  const failed = await run(REAL, (l) => console.log(l), "0");
  console.log(`\nJOURNEY FUNNEL — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const plants: Plant[] = [
    { name: "a browser may report a bet", expect: /^1\.refused /,
      impl: { ...REAL, parse: (t) => { try { const o = JSON.parse(String(t)); if (o && o.s === "bet") return { step: "bet", origin: o.o, variant: o.v, utmSource: o.us, utmCampaign: o.uc }; } catch { /* */ } return REAL.parse(t); } } },
    { name: "extra keys pass (an id could ride along)", expect: /^1\.refused /,
      impl: { ...REAL, parse: (t) => { try { const o = JSON.parse(String(t)); if (o && typeof o === "object" && "u" in o) { const { u: _u, ...rest } = o; return REAL.parse(JSON.stringify(rest)); } } catch { /* */ } return REAL.parse(t); } } },
    { name: "any origin accepted by the server", expect: /^2\.server /,
      impl: { ...REAL, norm: (e) => (e && e.step && e.variant ? { step: e.step, origin: String(e.origin), variant: e.variant, utmSource: F.funnelTag(e.utmSource), utmCampaign: F.funnelTag(e.utmCampaign) } : null) } },
    { name: "tags stored as sent (not lowercased)", expect: /^2\.server /,
      impl: { ...REAL, norm: (e) => { const r = REAL.norm(e); return r && { ...r, utmSource: String(e?.utmSource ?? "") }; } } },
    { name: "counted on the UTC day", expect: /^3\.day /,
      impl: { ...REAL, record: (e, now) => REAL.record(e, now - 3 * 3600_000) } },   // eatDayKey(t − 3 h) is the UTC day of t
    { name: "pruned a day early (399 days)", expect: /^3\.prune /, impl: { ...REAL, prune: (now) => REAL.prune(now + DAY) } },
    { name: "a userId column added to the model", expect: /^4\.columns /,
      impl: { ...REAL, schema: REAL.schema.replace("  count       Int    @default(0)\n", "  count       Int    @default(0)\n  userId      String?\n") } },
    { name: "the migration alters an existing table", expect: /^4\.migration /,
      impl: { ...REAL, migration: `${REAL.migration}\nALTER TABLE "User" ADD COLUMN "x" TEXT;` } },
    { name: "retention no longer prunes the funnel", expect: /^5\.retention /,
      impl: { ...REAL, retention: REAL.retention.replace("const journeyFunnelRows = await pruneJourneyFunnel(now)", "const journeyFunnelRows = await Promise.resolve(0)") } },
    { name: "an unsafe utm value kept", expect: /^6\.utm /,
      impl: { ...REAL, utm: (s) => ({ s: String(s.get("utm_source") ?? ""), c: String(s.get("utm_campaign") ?? "").toLowerCase() }) } },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(REAL, quiet, "r0");
  ok("the REAL counters pass every check", clean.length === 0, clean.join(" | "));
  for (const [n, p] of plants.entries()) {
    const failures = await run(p.impl, quiet, `r${n + 1}`);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
