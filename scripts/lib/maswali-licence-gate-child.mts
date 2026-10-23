/**
 * test:maswali-licence-gate — ONE STORE'S RUN. The two-store runner (`scripts/maswali-licence-gate.test.mts`) starts this
 * file once on the memory store and once on a fresh migrated scratch Postgres; HB_MONEY_STORE names the store.
 *
 * MILLIONEA'S LICENCE BASIS: THE OWNER'S RECORD, OR HIS RULING OF 2026-10-23 (MASWALI-BUILD LICBASIS; OD-01, MB-39 —
 * the suite MB-39 named; `src/lib/server/maswali-licence.ts`; COMPLIANCE-DECISIONS § "2026-10-23 · Maswali Millionea —
 * the licence basis is 50pick's GBT licence …").
 *
 *   §1 the rule, pure: every case of `licenceStandingOf`, the ruling's basis, the three refusals, the console's words
 *   §2 a fresh store holds NO record: the ruling stands in on the platform's licence number, and no read writes one
 *   §3 ⛔ no record and no valid licence number → no default: the open, the checklist, the alert and the console say why
 *   §4 ⭐ no record and a licence number → a week OPENS: the checklist passes, the console shows the ruling, the open's
 *      audit row names the basis it sold under — and still nothing is recorded
 *   §5 ⛔ a recorded NONE → refused: the ruling never overrides a withdrawal
 *   §6 ⭐ a recorded GBT_WRITTEN decides, and a week opens on it
 *   §7 ⭐ a recorded OWNER_RULING decides over the ruling's default: its own reference
 *   §8 ⛔ a stored record that does not validate reads closed — never as "nothing recorded"
 *
 * Plants (`red:maswali-licence-gate`, `scripts/anchors/maswali-licence-gate.anchors.mjs`): the default applied over a
 * recorded NONE; the default applied with no licence number; the stored record ignored; a kindless row read as nothing
 * recorded; the ruling written as a record at boot.
 *
 * ⛔ IMPORT ORDER IS THE CONTRACT: the stores pick Postgres or memory on first import, so the environment is set first.
 * ⛔ The platform's own licence number is never written here (`test:support-contact` §12.2 keeps it in one file): the
 *    suite reads it from the System page's setting, and plants other values.
 */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-licence-gate-secret-0123456789abcdef0123";
process.env.MARKET_SCHEDULER = "false";

const lic = await import("../../src/lib/server/maswali-licence.ts");
const support = await import("../../src/lib/server/support-config.ts");
const configStore = await import("../../src/lib/server/config-store.ts");
const svc = await import("../../src/lib/server/maswali-service.ts");
const consoleRead = await import("../../src/lib/server/maswali-console.ts");
const money = await import("../../src/lib/server/maswali-money-service.ts");
const { seedDefaultSources } = await import("../../src/lib/server/source-registry.ts");
const { auditFlush, getAuditByActionsDurable } = await import("../../src/lib/server/audit.ts");
const { eatWeekStartMs } = await import("../../src/lib/eat-day.ts");
const { utcToZonedLocal } = await import("../../src/lib/maswali-time.ts");
const { checkOpenChecklist } = await import("../maswali-admin-checklist.mjs");

type LicenceBasis = import("../../src/lib/server/maswali-licence.ts").LicenceBasis;
type LicenceStanding = import("../../src/lib/server/maswali-licence.ts").LicenceStanding;

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const errOf = (r: { ok: boolean; error?: string }) => (r.ok ? "" : String(r.error));
/** Equal by value, whatever the key order: a payload's round trip through Postgres `Json` does not promise it. */
const canon = (v: unknown): unknown => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])])) : v);
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const onPostgres = STORE === "postgres";
const registry = (globalThis as unknown as { __50PICK_CONFIGS?: Map<string, unknown> }).__50PICK_CONFIGS!;
const DAY = 86_400_000;
/** A licence refusal names "licence basis"; no other line of the open's checklist does (the admin drive reads it so). */
const LICENCE_ITEM = /licence basis/;
/** The programme's codes, as the S6 plain-words census reads them (DESIGN_AUTHORITY §M8a item 29): never on a console. */
const PROGRAMME_CODE = /\b(?:MB|OD|MR|OPEN)-\d+[a-z]?\b|\bR-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*\b/;

const { LICENCE_WITHDRAWN, LICENCE_NO_NUMBER, LICENCE_RECORD_INVALID, LICENCE_BASIS_NONE } = lic;
const DRAFTER = "usr_lic_drafter", READER = "usr_lic_reader", OWNER = "usr_lic_owner";

// ── the weeks (the engine suite's template: events on the Saturday after the Friday close) ──────────────────────────
const SOURCES = [
  { category: "sports", url: "https://www.nbc.co.tz/results" }, { category: "sports", url: "https://www.tff.or.tz/fixtures" },
  { category: "macro", url: "https://www.bot.go.tz/rates" }, { category: "weather", url: "https://www.meteo.go.tz/bulletin" },
  { category: "crypto", url: "https://www.coingecko.com/en/coins/bitcoin" },
];
const weekStartAhead = (weeks: number) => eatWeekStartMs(Date.now()) + weeks * 7 * DAY;
function questions(weekStart: number) {
  return Array.from({ length: 15 }, (_, i) => {
    const main = i < 10;
    const src = SOURCES[i % SOURCES.length];
    const at = weekStart + 5 * DAY + (main ? 9 : 14) * 3_600_000 + i * 60 * 60_000;
    return {
      role: main ? "MAIN" : "RESERVE", ordinal: main ? i + 1 : i - 9, category: src.category,
      textEn: `Will event ${i + 1} happen?`, textSw: `Je, tukio la ${i + 1} litatokea?`, textZh: `第 ${i + 1} 个事件会发生吗？`,
      criterionEn: `YES if event ${i + 1} is confirmed by the source.`, criterionSw: `NDIO ikiwa tukio la ${i + 1} litathibitishwa.`,
      criterionZh: `如果第 ${i + 1} 个事件得到确认则为是。`,
      sourceUrl: src.url, eventKind: "SPORT", eventLocalStart: utcToZonedLocal(at, "Africa/Dar_es_Salaam"), eventZone: "Africa/Dar_es_Salaam",
      probabilityEstimate: 0.5, probabilitySource: "officer estimate from the source's form table",
    };
  });
}
/** A week drafted and attested by a second reader: everything the open asks of the week itself is in place. */
async function draft(weeksAhead: number, visibility: "PUBLIC" | "DRIVE") {
  const start = weekStartAhead(weeksAhead);
  const c = await svc.createWeek({ weekStartMs: start, visibility, questions: questions(start) as never, officerId: DRAFTER, now: new Date(start - 3 * DAY) });
  if (!c.ok) throw new Error(`draft refused: ${c.error}`);
  const a = await svc.attestParity({ weekId: c.week.id, officerId: READER, readVersion: await svc.readDraftVersion(c.week.id) });
  if (!a.ok) throw new Error(`attest refused: ${a.error}`);
  return { id: c.week.id, code: c.week.code, opensAt: new Date(start + 60_000) };
}

// ── the store, read and planted as it really holds things ──────────────────────────────────────────────────────────
/** "Nothing recorded": on Postgres no row exists; in memory the factory's copy is still its marker. */
async function nothingStored(): Promise<boolean> {
  if (onPostgres) {
    const r = await configStore.loadConfigResult<Record<string, unknown>>(lic.MASWALI_LICENCE_KEY);
    return r.ok && r.value === null;
  }
  return (registry.get(lic.MASWALI_LICENCE_KEY) as { kind?: string } | undefined)?.kind === "NOTHING_RECORDED";
}
/** The kind the store holds, read the way the store holds it. */
async function storedKind(): Promise<string | null> {
  if (onPostgres) {
    const r = await configStore.loadConfigResult<Record<string, unknown>>(lic.MASWALI_LICENCE_KEY);
    return r.ok && r.value ? String(r.value.kind) : null;
  }
  return String((registry.get(lic.MASWALI_LICENCE_KEY) as { kind?: string } | undefined)?.kind);
}
/** A licence-number setting as a hand-edited row would hold it — the System page refuses these, the store does not. */
async function plantLicenceNumber(value: string): Promise<void> {
  const row = { ...support.getSupportConfig(), licenceNumber: value };
  if (onPostgres) {
    await configStore.saveConfig(support.SUPPORT_CONFIG_KEY, row);
    const r = await support.readSupportConfigFresh(); // the screens read this container's copy: bring it up to the row
    if (!r.ok) throw new Error(`the planted setting could not be read back: ${r.error}`);
  } else {
    registry.set(support.SUPPORT_CONFIG_KEY, row);
  }
}
async function restoreLicenceNumber(original: ReturnType<typeof support.getSupportConfig>): Promise<void> {
  if (onPostgres) {
    await configStore.deleteConfig(support.SUPPORT_CONFIG_KEY);
    const r = await support.readSupportConfigFresh();
    if (!r.ok) throw new Error(`the setting could not be re-read: ${r.error}`);
  } else {
    registry.set(support.SUPPORT_CONFIG_KEY, original);
  }
}
/** A licence row the Owner's ceremony could never write (it validates first): the store answers it as it is. */
async function plantLicenceRow(row: Record<string, unknown>): Promise<void> {
  if (onPostgres) {
    await configStore.saveConfig(lic.MASWALI_LICENCE_KEY, row);
    const r = await lic.readLicenceStandingFresh(); // reloads this container's copy too
    if (!r.ok) throw new Error(`the planted record could not be read back: ${r.error}`);
  } else {
    registry.set(lic.MASWALI_LICENCE_KEY, row);
  }
}
/** The open's audit row for a week — its `licence` part. */
async function openedLicence(weekId: string): Promise<unknown> {
  await auditFlush();
  const rows = (await getAuditByActionsDurable(["maswali.week.opened"], { limit: 500 })).entries.filter((e) => e.targetId === weekId);
  return rows.length === 1 ? (rows[0].payload as Record<string, unknown> | undefined)?.licence : `rows: ${rows.length}`;
}
const tileOf = async () => lic.licenceTile((await consoleRead.consoleStanding()).licence);
const nowLineOf = async () => lic.licenceNowLine((await consoleRead.consoleStanding()).licence);
const problemsOf = async (weekId: string, at: Date) => (await consoleRead.consoleWeekDetail(weekId, at))?.problems ?? [];

// ── §1 · the rule, pure ──────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the rule, pure: the Owner's record, else the ruling of 2026-10-23 on the licence number, else nothing");
{
  const N = "GBT/LIC/2026/77";
  const RULED = lic.rulingLicenceBasis(N);
  const OWN: LicenceBasis = { kind: "OWNER_RULING", ref: "The Owner's dated ruling of 2026-10-16, kept in the compliance binder", recordedAt: "2026-10-20T09:00:00.000Z", recordedBy: "usr_owner" };
  const LETTER: LicenceBasis = { kind: "GBT_WRITTEN", ref: "GBT/2026/001, the Board's letter of 2026-10-20", recordedAt: "2026-10-20T09:00:00.000Z", recordedBy: "usr_owner" };
  const NONE = LICENCE_BASIS_NONE;
  const closedBy = (source: LicenceStanding["source"], holds: string): LicenceStanding => ({ basis: { ...NONE }, source, licenceNumber: null, holds });
  const CASES: Array<[string, LicenceBasis | null, string | null, LicenceStanding]> = [
    ["1.1 · ⭐ no record + a licence number → the ruling's basis, on that number", null, N, { basis: RULED, source: "RULING", licenceNumber: N, holds: null }],
    ["1.2 · ⛔ no record + an EMPTY licence number → no default, and the reason", null, "", closedBy("RULING", LICENCE_NO_NUMBER)],
    ["1.2b · ⛔ no record + a blank licence number → no default", null, "   ", closedBy("RULING", LICENCE_NO_NUMBER)],
    ["1.2c · ⛔ no record + no licence number read at all → no default", null, null, closedBy("RULING", LICENCE_NO_NUMBER)],
    ["1.3 · ⛔ no record + a licence number carrying markup → no default", null, "<b>GBT/1</b>", closedBy("RULING", LICENCE_NO_NUMBER)],
    ["1.3b · ⛔ no record + a licence number over 80 characters → no default", null, "G".repeat(81), closedBy("RULING", LICENCE_NO_NUMBER)],
    ["1.3c · ⛔ no record + a licence number with a line break → no default", null, "GBT/1\nGBT/2", closedBy("RULING", LICENCE_NO_NUMBER)],
    ["1.4 · the longest licence number the System page saves (80 characters) still makes a valid basis", null, "G".repeat(80),
      { basis: lic.rulingLicenceBasis("G".repeat(80)), source: "RULING", licenceNumber: "G".repeat(80), holds: null }],
    ["1.5 · ⛔ a recorded NONE → closed, whatever the licence number: the ruling never overrides a withdrawal", NONE, N, closedBy("RECORD", LICENCE_WITHDRAWN)],
    ["1.6 · ⭐ a recorded OWNER_RULING decides: its own reference, not the ruling's", OWN, N, { basis: OWN, source: "RECORD", licenceNumber: null, holds: null }],
    ["1.7 · ⭐ a recorded GBT_WRITTEN decides", LETTER, N, { basis: LETTER, source: "RECORD", licenceNumber: null, holds: null }],
    ["1.7b · ⭐ …and a record decides with no licence number at all", LETTER, "", { basis: LETTER, source: "RECORD", licenceNumber: null, holds: null }],
    ["1.8 · ⛔ a record that does not validate (no author) → closed, never the ruling's default", { ...LETTER, recordedBy: null }, N, closedBy("RECORD", LICENCE_RECORD_INVALID)],
    ["1.8b · ⛔ a record of a kind the platform does not know → closed", { ...OWN, kind: "VERBAL" as never }, N, closedBy("RECORD", LICENCE_RECORD_INVALID)],
    ["1.8c · ⛔ a NONE that carries a reference → closed as not valid", { ...NONE, ref: "a stray reference" }, N, closedBy("RECORD", LICENCE_RECORD_INVALID)],
  ];
  for (const [label, record, number, want] of CASES) {
    const got = lic.licenceStandingOf(record, number);
    ok(label, same(got, want), JSON.stringify(got));
  }
  const all = CASES.map(([, record, number]) => lic.licenceStandingOf(record, number));
  ok("1.9 · the gate's two answers agree in every case: no reason to hold ⇔ a basis that opens", all.every((s) => (s.holds === null) === lic.licenceBasisAllowsOpen(s.basis)));
  ok("1.10 · ⭐ the ruling's basis: OWNER_RULING; its reference names 50pick's GBT licence number, the ruling and its COMPLIANCE entry; dated the ruling's day; signed by the ruling, not an account; valid",
    RULED.kind === "OWNER_RULING" && RULED.ref === `50pick's Gaming Board of Tanzania licence no. ${N}, by the Owner's ruling of 2026-10-23: the Board needs nothing further in writing for Millionea (COMPLIANCE-DECISIONS § "2026-10-23 · Maswali Millionea — the licence basis is 50pick's GBT licence …")`
      && RULED.recordedAt === "2026-10-23" && RULED.recordedBy === "the Owner's ruling of 2026-10-23" && !/^usr_/.test(RULED.recordedBy ?? "") && lic.licenceBasisProblem(RULED) === null,
    JSON.stringify(RULED));
  const reasons = [LICENCE_WITHDRAWN, LICENCE_NO_NUMBER, LICENCE_RECORD_INVALID];
  ok("1.11 · the three refusals are three different sentences, each naming the licence basis", new Set(reasons).size === 3 && reasons.every((r) => LICENCE_ITEM.test(r)));
  // The admin drive's checker (`maswali-admin-checklist.mjs`) must read each refusal as the licence item, and must fail
  // when the standing reads None but no licence item is listed (its positive control).
  const ATTEST = "A second reader has not attested that English, Swahili and Chinese agree (MB-79).";
  const none = { licence: "None", guarantee: "TZS 2,000,000", requirement: "TZS 1,000,000" };
  ok("1.12 · the admin drive's checker reads each refusal as the licence item — and fails a None standing that lists none",
    reasons.every((r) => checkOpenChecklist(none, [r, ATTEST]).ok) && !checkOpenChecklist(none, [ATTEST]).ok);
  // The console's words, one place (`licenceTile`, `licenceNowLine`), for each standing.
  const ruling = lic.licenceStandingOf(null, N), letter = lic.licenceStandingOf(LETTER, N), own = lic.licenceStandingOf(OWN, N), withdrawn = lic.licenceStandingOf(NONE, N);
  ok("1.13 · the console head: the ruling reads Owner ruling on the GBT licence number; a record reads its own kind and reference; a held gate reads None",
    same(lic.licenceTile(ruling), { value: "Owner ruling", note: `GBT licence no. ${N} · the ruling of 23 October 2026` })
      && same(lic.licenceTile(letter), { value: "Board letter", note: LETTER.ref }) && same(lic.licenceTile(own), { value: "Owner ruling", note: OWN.ref })
      && same(lic.licenceTile(withdrawn), { value: "None", note: "No week can open" }));
  ok("1.14 · the Pools card says where the basis comes from, and that a record replaces it; a record shows its own reference; a held gate says why",
    lic.licenceNowLine(ruling) === `50pick's Gaming Board licence no. ${N}, by the Owner's ruling of 23 October 2026 — the Board needs nothing further in writing. It stands while no basis is recorded here: recording one below replaces it, and recording None closes every week.`
      && lic.licenceNowLine(letter) === `the Board's letter · ${LETTER.ref}` && lic.licenceNowLine(own) === `the Owner's ruling · ${OWN.ref}`
      && lic.licenceNowLine(withdrawn) === `none. ${LICENCE_WITHDRAWN}`);
  // ⛔ Plain words (DESIGN_AUTHORITY §M8a item 29): nothing the console draws from this module carries a programme code.
  const drawn = [...reasons, ...[ruling, letter, own, withdrawn, lic.licenceStandingOf(null, ""), lic.licenceStandingOf({ ...LETTER, recordedBy: null }, N)]
    .flatMap((s) => [lic.licenceNowLine(s), lic.licenceTile(s).value, lic.licenceTile(s).note])];
  const coded = drawn.filter((t) => PROGRAMME_CODE.test(t));
  ok("1.15 · ⛔ plain words: no refusal, tile or card line carries a programme code (the code stays in a comment)", coded.length === 0, coded.join(" | "));
  ok("1.15b · control: the census reads a code where one stands", PROGRAMME_CODE.test("No week opens until the Owner records a basis (OD-01).") && !PROGRAMME_CODE.test(LICENCE_WITHDRAWN));
}

// ── §0 · the house's side: trusted sources, the guarantee (OD-02), three attested drafts ─────────────────────────────
await seedDefaultSources();
const funded = await money.fundMaswaliGuarantee({ amount: 2_000_000, reference: "LICBASIS-TEST-0001", typed: money.GUARANTEE_FUND_WORD, ownerId: OWNER });
if (!funded.ok) throw new Error(`the guarantee could not be funded: ${funded.error}`);
const W = await draft(2, "PUBLIC");   // opens under the ruling (§4)
const D = await draft(2, "DRIVE");    // refused under a recorded None (§5), opens on the Board's letter (§6)
const X = await draft(3, "PUBLIC");   // the checklist under a recorded ruling (§7), refused on bad records (§8)
const RICH = { balance: async () => 5_000_000 };

// ── §2 · a fresh store holds no record ───────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · a fresh store holds NO record: the ruling stands in on the platform's licence number");
const NUMBER = support.getSupportConfig().licenceNumber;
{
  const s = lic.getLicenceStanding();
  ok("2.1 · ⭐ nothing is recorded, so the ruling stands in on the platform's licence number — the System page's setting, the number the footer prints",
    s.source === "RULING" && s.holds === null && s.licenceNumber === NUMBER && same(s.basis, lic.rulingLicenceBasis(NUMBER)) && support.LICENCE_NUMBER() === NUMBER,
    JSON.stringify(s));
  const f = await lic.readLicenceStandingFresh();
  ok("2.2 · the open's fresh read answers the same standing", f.ok && same(f.standing, s), JSON.stringify(f));
  ok("2.3 · ⛔ no read wrote a record: the store still holds nothing", await nothingStored(), String(await storedKind()));
}

// ── §3 · no record and no valid licence number: no default ───────────────────────────────────────────────────────────
console.log("\n§3 · ⛔ no record and no valid licence number → no default, and every surface says why");
{
  const original = support.getSupportConfig();
  // ⚠️ A blank value cannot reach a Postgres container: the setting's own `migrate` drops it and the default stands.
  const BAD: Array<[string, string]> = [
    ...(onPostgres ? [] : [["empty", ""] as [string, string]]),
    ["carrying markup", "<b>GBT/1</b>"],
    ["over 80 characters", "G".repeat(81)],
  ];
  for (const [what, value] of BAD) {
    await plantLicenceNumber(value);
    const opened = await svc.openWeek({ weekId: W.id, officerId: DRAFTER, guarantee: RICH, now: W.opensAt });
    ok(`3.1 · ⛔ [${what}] the open refuses, in its reason`, !opened.ok && errOf(opened) === LICENCE_NO_NUMBER, errOf(opened));
    const problems = await problemsOf(W.id, W.opensAt);
    ok(`3.2 · ⛔ [${what}] the builder's checklist names it first, in the same words`, problems[0] === LICENCE_NO_NUMBER, JSON.stringify(problems));
    const alerts = await consoleRead.consoleAlerts(W.opensAt);
    ok(`3.3 · ⛔ [${what}] the console's alert says it`, alerts.some((a) => a.level === "warning" && a.text === LICENCE_NO_NUMBER), JSON.stringify(alerts));
    ok(`3.4 · ⛔ [${what}] the console head reads None and the Pools card says why`,
      same(await tileOf(), { value: "None", note: "No week can open" }) && (await nowLineOf()) === `none. ${LICENCE_NO_NUMBER}`, await nowLineOf());
  }
  await restoreLicenceNumber(original);
  ok("3.5 · the licence number is back, and with it the ruling's basis", lic.getLicenceStanding().holds === null && support.getSupportConfig().licenceNumber === NUMBER);
  ok("3.6 · ⛔ and still nothing is recorded", await nothingStored(), String(await storedKind()));
}

// ── §4 · no record and a licence number: a week opens ────────────────────────────────────────────────────────────────
console.log("\n§4 · ⭐ no record and a licence number → a week OPENS on the ruling, with no Owner click");
{
  const problems = await problemsOf(W.id, W.opensAt);
  ok("4.1 · ⭐ the open checklist passes: not one problem, the licence basis among them", problems.length === 0, JSON.stringify(problems));
  ok("4.2 · the console head shows the ruling's basis on the licence number",
    same(await tileOf(), { value: "Owner ruling", note: `GBT licence no. ${NUMBER} · the ruling of 23 October 2026` }), JSON.stringify(await tileOf()));
  const line = await nowLineOf();
  ok("4.3 · the Pools card says where it comes from, and that the Owner can still record another",
    line.startsWith(`50pick's Gaming Board licence no. ${NUMBER}, by the Owner's ruling of 23 October 2026 — the Board needs nothing further in writing.`)
      && line.includes("recording one below replaces it, and recording None closes every week."), line);
  const alerts = await consoleRead.consoleAlerts(W.opensAt);
  ok("4.4 · no licence alert", !alerts.some((a) => LICENCE_ITEM.test(a.text)), JSON.stringify(alerts));
  const opened = await svc.openWeek({ weekId: W.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: W.opensAt });
  ok("4.5 · ⭐ the week OPENS, against the real guarantee", opened.ok && opened.week.state === "OPEN", errOf(opened));
  const row = await openedLicence(W.id);
  ok("4.6 · ⭐ the open's audit row names the basis it sold under: the ruling's, on the licence number",
    same(row, { kind: "OWNER_RULING", source: "RULING", ref: lic.rulingLicenceBasis(NUMBER).ref }), JSON.stringify(row));
  ok("4.7 · ⛔ and still nothing is recorded: the ruling lives in code, never in the store", await nothingStored(), String(await storedKind()));
}

// ── §5 · a recorded NONE ─────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§5 · ⛔ a recorded NONE → refused: the ruling never overrides a withdrawal");
{
  const rec = await lic.recordLicenceBasis({ kind: "NONE", ref: null }, OWNER);
  ok("5.0 · the Owner records None", rec.ok && same(rec.basis, LICENCE_BASIS_NONE), JSON.stringify(rec));
  const s = lic.getLicenceStanding();
  ok("5.1 · ⛔ a recorded None keeps the gate shut, with the licence number in place: the record decides", s.source === "RECORD" && s.holds === LICENCE_WITHDRAWN
    && same(s.basis, LICENCE_BASIS_NONE) && support.getSupportConfig().licenceNumber === NUMBER, JSON.stringify(s));
  const f = await lic.readLicenceStandingFresh();
  ok("5.2 · the open's fresh read answers the same", f.ok && same(f.standing, s), JSON.stringify(f));
  const opened = await svc.openWeek({ weekId: D.id, officerId: DRAFTER, guarantee: RICH, now: D.opensAt });
  ok("5.3 · ⛔ the open refuses, in the withdrawal's words", !opened.ok && errOf(opened) === LICENCE_WITHDRAWN, errOf(opened));
  const problems = await problemsOf(D.id, D.opensAt);
  ok("5.4 · the builder's checklist names the withdrawal first", problems[0] === LICENCE_WITHDRAWN, JSON.stringify(problems));
  const alerts = await consoleRead.consoleAlerts(D.opensAt);
  ok("5.5 · the console's alert says it", alerts.some((a) => a.level === "warning" && a.text === LICENCE_WITHDRAWN), JSON.stringify(alerts));
  ok("5.6 · the console head reads None and the Pools card says why", same(await tileOf(), { value: "None", note: "No week can open" })
    && (await nowLineOf()) === `none. ${LICENCE_WITHDRAWN}`, await nowLineOf());
  ok("5.7 · the store holds the Owner's None — a record, not nothing", (await storedKind()) === "NONE" && !(await nothingStored()));
}

// ── §6 · a recorded GBT_WRITTEN ──────────────────────────────────────────────────────────────────────────────────────
console.log("\n§6 · ⭐ a recorded GBT_WRITTEN decides, and a week opens on it");
{
  const REF = "GBT/2026/001, the Board's letter of 2026-10-20, kept in the compliance binder";
  const rec = await lic.recordLicenceBasis({ kind: "GBT_WRITTEN", ref: REF }, OWNER, new Date("2026-10-24T09:00:00.000Z"));
  ok("6.0 · the Owner records the Board's letter", rec.ok, JSON.stringify(rec));
  const s = lic.getLicenceStanding();
  ok("6.1 · ⭐ the record decides: the Board's letter, its reference, its date, its Owner", s.source === "RECORD" && s.holds === null && s.basis.kind === "GBT_WRITTEN"
    && s.basis.ref === REF && s.basis.recordedAt === "2026-10-24T09:00:00.000Z" && s.basis.recordedBy === OWNER, JSON.stringify(s));
  ok("6.2 · the console head and the Pools card show the record", same(await tileOf(), { value: "Board letter", note: REF }) && (await nowLineOf()) === `the Board's letter · ${REF}`);
  const problems = await problemsOf(D.id, D.opensAt);
  ok("6.3 · the builder's checklist names no licence item", !problems.some((p) => LICENCE_ITEM.test(p)), JSON.stringify(problems));
  const opened = await svc.openWeek({ weekId: D.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: D.opensAt });
  ok("6.4 · ⭐ the week opens on the Board's letter", opened.ok && opened.week.state === "OPEN", errOf(opened));
  const row = await openedLicence(D.id);
  ok("6.5 · its audit row names the record it sold under", same(row, { kind: "GBT_WRITTEN", source: "RECORD", ref: REF }), JSON.stringify(row));
}

// ── §7 · a recorded OWNER_RULING ─────────────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · ⭐ a recorded OWNER_RULING decides over the ruling's default: its own reference");
{
  const REF = "The Owner's dated ruling of 2026-10-16, kept in the compliance binder";
  const rec = await lic.recordLicenceBasis({ kind: "OWNER_RULING", ref: REF }, OWNER, new Date("2026-10-25T09:00:00.000Z"));
  ok("7.0 · the Owner records a ruling of his own", rec.ok, JSON.stringify(rec));
  const s = lic.getLicenceStanding();
  ok("7.1 · ⭐ the stored record decides — its reference and its Owner, not the ruling's default", s.source === "RECORD" && s.holds === null && s.basis.ref === REF
    && s.basis.recordedBy === OWNER && !same(s.basis, lic.rulingLicenceBasis(NUMBER)), JSON.stringify(s));
  const f = await lic.readLicenceStandingFresh();
  ok("7.2 · the open's fresh read answers the same", f.ok && same(f.standing, s), JSON.stringify(f));
  ok("7.3 · the console head and the Pools card show the Owner's own reference", same(await tileOf(), { value: "Owner ruling", note: REF })
    && (await nowLineOf()) === `the Owner's ruling · ${REF}`);
  const problems = await problemsOf(X.id, X.opensAt);
  ok("7.4 · the builder's checklist names no licence item", !problems.some((p) => LICENCE_ITEM.test(p)), JSON.stringify(problems));
}

// ── §8 · a stored record that does not validate ──────────────────────────────────────────────────────────────────────
console.log("\n§8 · ⛔ a stored record that does not validate reads closed — never as \"nothing recorded\"");
{
  const ROWS: Array<[string, Record<string, unknown>, boolean]> = [
    ["8.1 · ⛔ a stored Board letter that names no Owner", { kind: "GBT_WRITTEN", ref: "GBT/2026/001", recordedAt: "2026-10-20T09:00:00.000Z", recordedBy: null }, true],
    ["8.2 · ⛔ a stored row with no kind at all", { ref: "GBT/2026/001", recordedAt: "2026-10-20T09:00:00.000Z", recordedBy: "usr_owner" }, true],
    // The memory store's copy IS the store, so a row naming the marker exists only on Postgres.
    ["8.3 · ⛔ a stored row that names the \"nothing recorded\" marker itself", { kind: "NOTHING_RECORDED", ref: null, recordedAt: null, recordedBy: null }, onPostgres],
  ];
  for (const [label, row, runs] of ROWS) {
    if (!runs) continue;
    await plantLicenceRow(row);
    const s = lic.getLicenceStanding();
    const opened = await svc.openWeek({ weekId: X.id, officerId: DRAFTER, guarantee: RICH, now: X.opensAt });
    const problems = await problemsOf(X.id, X.opensAt);
    ok(`${label} → closed as not valid, never the ruling's default; the open refuses and the checklist says so`,
      s.source === "RECORD" && s.holds === LICENCE_RECORD_INVALID && same(s.basis, LICENCE_BASIS_NONE)
        && !opened.ok && errOf(opened) === LICENCE_RECORD_INVALID && problems[0] === LICENCE_RECORD_INVALID,
      JSON.stringify({ s, open: errOf(opened), first: problems[0] }));
  }
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
