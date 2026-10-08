/**
 * test:marketing-dry-fire — the SMS campaign engine's DRY-FIRE STRESS HARNESS, held to account
 * (`scripts/live/marketing-dry-fire.mts`, `npm run qa:marketing-dry-fire`; the harness drives the REAL start / step / pause / resume /
 * stop services, the real enqueue, the real slice, the real reaper and the real receipt door over a seeded world and a FAKE Blackball).
 *
 * ── THE SUITE (always) ───────────────────────────────────────────────────────────────────────────────────────────────────────
 *   B1  the real engine passes its own dry-fire at N=200: seven scenarios × six invariants, every claim holds
 *   B2  the report has the shape the lead reads — the SCALE figures, the summary table, the six invariants by name
 *   B3  the only known findings are the two reported to the lead (F-1, F-2), pinned to claims that exist
 *   D1  deterministic: one seed twice gives one fingerprint, another seed another
 *   G1  the guard's refusal matrix (production · Railway · a real rail · Redis · a remote database · --pg off loopback …)
 *   G2  a run in an unsafe shell refuses BEFORE it touches anything
 *   G3  the rail is the fake: `fetch` and the environment are put back, nothing real was called, a stray address is refused
 *   G4  no real SMS can leave: the harness names no gateway host and imports no socket, http or process module
 *   P1  no phone number in the report, the table or the SCALE block
 *   L1  the `--pg` lock: only the repo's `.pgscratch` cluster, and only while it is empty (a stub client answers)
 *   L2  the `--pg` reader maps Prisma's rows and pages (a stub client answers)
 *   C1  the command line · W1 the scripts (and NOT the predeploy chain) · W2 no backslash in the harness
 *
 * ── THE RED CONTROL (`--prove-red`) ──────────────────────────────────────────────────────────────────────────────────────────
 * The baseline is proved green first, then each defect is PLANTED IN MEMORY through the harness's dependency seams (a wrapper of one
 * engine, service, view or enqueue dependency, of the gate, the carrier's plan, the receipt door or one store door) and the dry-fire
 * is run again over the scenarios that defect lives in. Each plant must fail EXACTLY the invariants and the scenario claims it names —
 * a failure anywhere else is reported, never counted as a catch. Every invariant must be bitten by at least one plant.
 * ⛔ IN-PROCESS: no file is written, no database is touched (the database variables are removed below, before the first server module
 * loads), no SMS can leave (the rail is the harness's fake carrier at an address that cannot resolve).
 * ⛔ HEAVY JOBS: none. `--plant=R3,R7` runs the named plants only; `--detail` prints what each failing invariant and claim said;
 * `--explore` skips the suite baseline (for building a plant — it never exits 0).
 * ⛔ This file holds no backslash (an editing tool decodes them): line breaks and patterns are built from codes and classes.
 *
 * Run: `npm run test:marketing-dry-fire` · Red: `npm run red:marketing-dry-fire`
 */
delete process.env.DATABASE_URL;
delete process.env.VERIFY_DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.REDIS_ENABLED;
for (const k of ["BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET", "BLACKBALL_API_URL", "BLACKBALL_WEBHOOK_SECRET", "BLACKBALL_WEBHOOK_SECRET_PREVIOUS"]) delete process.env[k];
process.env.SMS_PROVIDER = "console";
if ((process.env.SESSION_SECRET ?? "").length < 32) process.env.SESSION_SECRET = "dry-fire-suite-session-secret-0123456789abcdef";
if ((process.env.OTP_PEPPER ?? "").length < 16) process.env.OTP_PEPPER = "dry-fire-suite-pepper-0123456789";
process.exitCode = 1;

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const PROVE_RED = process.argv.includes("--prove-red");
const DETAIL = process.argv.includes("--detail");
/** Exploring a plant: the suite baseline is skipped (each plant still demands the green baseline of its own scenarios). Never for a verdict. */
const EXPLORE = process.argv.includes("--explore");
const plantArg = process.argv.find((a) => a.startsWith("--plant="));
const ONLY_PLANTS: string[] | null = plantArg === undefined ? null : plantArg.slice("--plant=".length).split(",").map((x) => x.trim()).filter((x) => x !== "");

const H = await import("./live/marketing-dry-fire.mts");
const IO = await import("./live/dry-fire/store-io.mts");
const CAR = await import("./live/dry-fire/carrier.mts");
const CORE = await import("./live/dry-fire/core.mts");

type Report = import("./live/marketing-dry-fire.mts").Report;
type RunOptions = import("./live/dry-fire/core.mts").RunOptions;
type Seams = import("./live/dry-fire/core.mts").Seams;
type InvId = "INV1" | "INV2" | "INV3" | "INV4" | "INV5" | "INV6";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const json = (v: unknown): string => JSON.stringify(v);
const SUITE_N = 200;
const SEED = 1;

/** The options of one run of the harness: silent, the memory twin, the real engine unless `seams` say otherwise. */
const run = (o: Partial<RunOptions> = {}): RunOptions => ({ seed: SEED, n: SUITE_N, pg: false, only: null, log: () => undefined, seams: {}, ...o });

/* ══ THE CLAIMS ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

let pass = 0;
let fail = 0;
let quiet = false;
const failed: string[] = [];
const say = (line: string): void => { if (!quiet) console.log(line); };

async function claim(id: string, label: string, body: () => Promise<[boolean, string]> | [boolean, string]): Promise<void> {
  let ok = false;
  let detail = "";
  try {
    [ok, detail] = await body();
  } catch (err) {
    detail = `threw: ${String((err as Error)?.stack ?? err).split(NL).slice(0, 3).join(" | ").slice(0, 300)}`;
  }
  if (ok) pass += 1;
  else { fail += 1; failed.push(id); }
  say(`  ${ok ? "PASS" : "FAIL"} ${id} — ${label}${detail ? ` · ${detail}` : ""}`);
}

const pg = (host: string): string => `postgresql://scratch:scratch@${host}/scratch`;

/** Everything the harness prints that a reader could take a phone number from. */
function textOf(r: Report): string {
  return [json(r), ...H.summaryTable(r), ...H.scaleBlock(r)].join(NL);
}

/* ══ THE SUITE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

async function runSuite(): Promise<void> {
  // what the process looked like before any run: the rail's restoration is judged against it
  const fetchBefore = globalThis.fetch;
  const envNames = ["SMS_PROVIDER", "BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET", "BLACKBALL_API_URL", "BLACKBALL_WEBHOOK_SECRET", "SESSION_SECRET", "OTP_PEPPER", "REDIS_URL", "REDIS_ENABLED", "DATABASE_URL"];
  const envBefore = json(envNames.map((k) => [k, process.env[k] ?? null]));
  let realFetchCalls = 0;
  const watched = ((...args: Parameters<typeof fetch>) => { realFetchCalls += 1; return fetchBefore(...args); }) as typeof fetch;
  globalThis.fetch = watched;

  const base = await H.runDryFire(run());
  const fetchAfter = globalThis.fetch;
  const envAfter = json(envNames.map((k) => [k, process.env[k] ?? null]));
  globalThis.fetch = fetchBefore;

  /* ── B · THE REAL ENGINE PASSES ITS OWN DRY-FIRE ── */
  await claim("B1", `the real engine passes its dry-fire at N=${SUITE_N}, seed ${SEED}: seven scenarios × six invariants, every claim holds`, () => {
    const badInv = base.scenarios.flatMap((s) => s.invariants.filter((i) => !i.ok).map((i) => `S${s.n} ${i.id}: ${i.detail.slice(0, 80)}`));
    const crashed = base.scenarios.filter((s) => s.crashed !== null).map((s) => `S${s.n}`);
    const claims = base.scenarios.reduce((n, s) => n + s.claims.length, 0);
    return [base.passed && badInv.length === 0 && crashed.length === 0 && base.failedClaims.length === 0 && base.scenarios.length === 7
      && base.scenarios.every((s) => s.invariants.length === 6) && claims >= 80,
    `${base.scenarios.length} scenarios, ${claims} claims (${base.knownFindings.length} pinned to a known finding), invariants failing [${badInv.join("; ")}], claims failing [${base.failedClaims.join(", ")}], crashed [${crashed.join(",")}]`];
  });

  await claim("B2", "the report is what the lead reads: the six invariants by name, the seven scenarios in order, the SCALE figures and a summary table with a row for each", () => {
    const names = base.scenarios.map((s) => s.name).join(" | ");
    const scale = H.scaleBlock(base);
    const table = H.summaryTable(base);
    const m = base.scenarios[0]?.metrics as Record<string, { count?: number } | number | undefined> | undefined;
    const figures = m !== undefined && typeof m.slices === "number" && m.slices > 0
      && typeof m.sizes === "object" && (m.sizes?.count ?? 0) > 0 && typeof m.gateMs === "object" && (m.gateMs?.count ?? 0) > 0
      && typeof m.sendMs === "object" && (m.sendMs?.count ?? 0) > 0 && typeof m.totalMs === "number";
    const ids = H.INV_IDS.join(",");
    const sixNamed = H.INV_IDS.length === 6 && H.INV_IDS.every((id) => H.INV_NAMES[id].length > 3) && base.scenarios.every((s) => s.invariants.map((i) => i.id).join(",") === ids);
    const inOrder = base.scenarios.map((s) => s.n).join(",") === "1,2,3,4,5,6,7";
    const words = ["SCALE", "TWO DRIVERS", "PAUSE", "FAULTS", "CRASH", "RECEIPTS", "CREDIT"].every((w, i) => (base.scenarios[i]?.name ?? "").includes(w));
    return [figures && sixNamed && inOrder && words && scale.length >= 6 && /slice size/.test(scale.join(NL)) && /gate time/.test(scale.join(NL)) && /send time/.test(scale.join(NL))
      && table.length === 2 + 7 && table[0].includes("INV6"),
    `scenarios [${names}] · SCALE block ${scale.length} lines · table ${table.length} lines · invariants ${ids} · per-slice figures ${figures}`];
  });

  await claim("B3", "the only findings the run reports as known are the two the lead was told about (F-1, F-2), each pinned to a claim of Scenario 7 — and they fail nothing else", () => {
    const pinned: Record<string, string> = { "S7.credit.edge.done": "F-1", "S7.credit.edge.resume": "F-1", "S7.credit.mid.strict": "F-2" };
    const wrong = base.knownFindings.filter((f) => pinned[f.id] !== f.finding);
    return [wrong.length === 0 && base.failedClaims.length === 0 && base.failedInvariants.length === 0,
      `${base.knownFindings.length} known finding(s): ${base.knownFindings.map((f) => `${f.finding} ${f.id}`).join(", ") || "none (the engine was fixed — then delete the pins)"}`];
  });

  /* ── D · DETERMINISM ── */
  await claim("D1", "one seed twice gives the same fingerprint (the people, the rows, the messages the carrier saw, the audit rows); another seed another", async () => {
    const again = await H.runDryFire(run());
    const other = await H.runDryFire(run({ seed: SEED + 1 }));
    const a = H.digestOf(base);
    const same = H.digestOf(again) === a;
    const differs = H.digestOf(other) !== a;
    const short = (t: string): string => createHash("sha1").update(t).digest("hex").slice(0, 10);
    return [same && differs && other.passed && again.passed, `seed ${SEED}: ${short(a)} then ${short(H.digestOf(again))}; seed ${SEED + 1}: ${short(H.digestOf(other))} (also passes: ${other.passed})`];
  });

  /* ── G · THE GUARD ── */
  await claim("G1", "the guard refuses every unsafe shell — production · Railway · a real rail or key · Redis · a database in memory mode · --pg off loopback or unparsable — and says every reason", () => {
    type Case = [string, NodeJS.ProcessEnv, boolean, boolean, string];
    const cases: Case[] = [
      ["a clean shell, memory", {}, false, true, ""],
      ["the console rail named", { SMS_PROVIDER: "console" }, false, true, ""],
      ["NODE_ENV=production", { NODE_ENV: "production" }, false, false, "NODE_ENV is production"],
      ["a Railway shell", { RAILWAY_ENVIRONMENT: "production" }, false, false, "Railway"],
      ["the Blackball rail selected", { SMS_PROVIDER: "blackball" }, false, false, "SMS_PROVIDER"],
      ["a gateway client id", { BLACKBALL_CLIENT_ID: "key" }, false, false, "BLACKBALL_CLIENT_ID"],
      ["a gateway client secret", { BLACKBALL_CLIENT_SECRET: "key" }, false, false, "BLACKBALL_CLIENT_SECRET"],
      ["a gateway endpoint", { BLACKBALL_API_URL: "http://gateway.example/send" }, false, false, "BLACKBALL_API_URL"],
      ["the webhook secret", { BLACKBALL_WEBHOOK_SECRET: "0123456789abcdef" }, false, false, "BLACKBALL_WEBHOOK_SECRET"],
      ["Redis", { REDIS_URL: "redis://cache.example" }, false, false, "REDIS_URL"],
      ["a database URL in memory mode", { DATABASE_URL: pg("db.example.com") }, false, false, "DATABASE_URL is set"],
      ["--pg with no database named", {}, true, false, "--pg needs a scratch database"],
      ["--pg to a remote host", { DATABASE_URL: pg("monorail.proxy.example.net") }, true, false, "not loopback"],
      ["--pg to a host that only STARTS like loopback", { DATABASE_URL: pg("127.0.0.1.evil.example.com") }, true, false, "not loopback"],
      ["--pg to a host that only starts like localhost", { DATABASE_URL: pg("localhost.evil.example.com") }, true, false, "not loopback"],
      ["--pg with loopback only in the user name", { DATABASE_URL: "postgresql://127.0.0.1@evil.example.com/scratch" }, true, false, "not loopback"],
      ["--pg with loopback only in the path", { DATABASE_URL: "postgresql://evil.example.com/127.0.0.1" }, true, false, "not loopback"],
      ["--pg with an unparsable URL", { DATABASE_URL: "this is not a url" }, true, false, "does not parse"],
      ["--pg to 127.0.0.1", { DATABASE_URL: pg("127.0.0.1") }, true, true, ""],
      ["--pg to localhost", { DATABASE_URL: pg("localhost") }, true, true, ""],
      ["--pg to ::1", { DATABASE_URL: pg("[::1]") }, true, true, ""],
      ["--pg through the scratch cluster's own variable", { VERIFY_DATABASE_URL: pg("127.0.0.1") }, true, true, ""],
      ["--pg over a real rail", { DATABASE_URL: pg("127.0.0.1"), SMS_PROVIDER: "blackball" }, true, false, "SMS_PROVIDER"],
    ];
    const wrong: string[] = [];
    for (const [name, env, usePg, wantOk, words] of cases) {
      const v = IO.guardEnvironment(env, usePg);
      const text = v.ok ? "" : v.reasons.join(" | ");
      if (v.ok !== wantOk || (!wantOk && words !== "" && !text.includes(words)) || (v.ok && v.mode !== (usePg ? "pg" : "memory"))) wrong.push(`${name}: ${v.ok ? "allowed" : text.slice(0, 80)}`);
    }
    const many = IO.guardEnvironment({ NODE_ENV: "production", SMS_PROVIDER: "blackball", REDIS_URL: "redis://x", DATABASE_URL: pg("db.example.com") }, false);
    const allSaid = !many.ok && many.reasons.length >= 4;
    return [wrong.length === 0 && allSaid, `${cases.length} shells judged, wrong [${wrong.join("; ")}] · four faults at once said ${many.ok ? 0 : many.reasons.length} times`];
  });

  await claim("G2", "a run started in an unsafe shell is REFUSED before anything is installed — no fetch replaced, no variable changed, no scenario run", async () => {
    const unsafe: [string, Record<string, string>, boolean][] = [
      ["a remote database", { DATABASE_URL: pg("db.example.com") }, false],
      ["a remote database with --pg", { DATABASE_URL: pg("db.example.com") }, true],
      ["the Blackball rail", { SMS_PROVIDER: "blackball", BLACKBALL_CLIENT_ID: "key", BLACKBALL_CLIENT_SECRET: "key" }, false],
      ["production", { NODE_ENV: "production" }, false],
      ["Redis", { REDIS_URL: "redis://cache.example" }, false],
    ];
    const wrong: string[] = [];
    for (const [name, env, usePg] of unsafe) {
      const names = [...envNames, ...Object.keys(env)];
      const snapshot = (): string => json(names.map((k) => [k, process.env[k] ?? null]));
      const saved = Object.keys(env).map((k) => [k, process.env[k]] as const);
      const fetchWas = globalThis.fetch;
      const before = snapshot();
      Object.assign(process.env, env);
      const armed = Object.entries(env).every(([k, v]) => process.env[k] === v);
      let refused = false;
      let reasons = 0;
      let ran = false;
      try {
        await H.runDryFire(run({ pg: usePg, only: [1] }));
        ran = true;
      } catch (err) {
        refused = err instanceof H.RefusedError && String((err as Error).message).startsWith("REFUSED");
        reasons = err instanceof H.RefusedError ? err.reasons.length : 0;
      } finally {
        for (const [k, v] of saved) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
      }
      if (!armed || ran || !refused || reasons === 0 || globalThis.fetch !== fetchWas || snapshot() !== before) wrong.push(`${name}: armed ${armed}, ran ${ran}, refused ${refused}, reasons ${reasons}, fetch moved ${globalThis.fetch !== fetchWas}`);
    }
    return [wrong.length === 0, `${unsafe.length} unsafe shells, wrong [${wrong.join("; ")}]`];
  });

  await claim("G3", "the rail is the fake and is put back: nothing but the fake carrier was asked, the real fetch and the environment come back, a stray address is refused, a fetch that is not the fake stops the run", async () => {
    const restored = fetchAfter === watched && envBefore === envAfter;
    const c = CAR.makeCarrier({ attribute: async () => null });
    let strayRefused = false;
    try { await c.fetch("https://gateway.example/api/sms/send", { method: "POST", body: "{}" }); } catch { strayRefused = true; }
    const wrongKey = await c.fetch(CAR.FAKE_ENDPOINT, { method: "POST", body: json({ auth: { clientId: "a-real-looking-key", clientSecret: "x" }, messages: [] }) });
    const refusedKey = wrongKey.status === 400 && c.requests.length === 0;
    // a stand-in for the real fetch (no network is touched): the rail check must see it is not the fake
    const keep = globalThis.fetch;
    globalThis.fetch = (async () => new Response("{}", { status: 200 })) as typeof fetch;
    let stopped = false;
    try { await CORE.assertRailIsFake(); } catch (err) { stopped = String((err as Error).message).includes("REFUSED"); }
    globalThis.fetch = keep;
    return [restored && realFetchCalls === 0 && base.carrier.stray.length === 0 && strayRefused && c.stray.length === 1 && refusedKey && stopped && base.carrier.requests > 0,
      `fetch and ${envNames.length} variables restored ${restored} · the real fetch was called ${realFetchCalls} times in a run of ${base.carrier.requests} fake requests (${base.carrier.messages} messages) · a stray address refused ${strayRefused} (${c.stray.length} counted) · a foreign key refused ${refusedKey} · a non-fake fetch stops the run ${stopped}`];
  });

  await claim("G4", "no real SMS can leave from the harness: its sources name no gateway host and no URL but the unresolvable `.invalid` one, and import no socket, http, tls, dgram or process module", () => {
    const dir = join(ROOT, "scripts", "live", "dry-fire");
    const files = [...readdirSync(dir).filter((f) => f.endsWith(".mts")).map((f) => join(dir, f)), join(ROOT, "scripts", "live", "marketing-dry-fire.mts")];
    const FORBIDDEN_IMPORT = new RegExp(`from "node:(net|http|https|http2|tls|dgram|child_process|cluster|worker_threads|dns)"|require[(]"(net|http|https)"[)]|from "(undici|axios|node-fetch|ws|nodemailer)"`);
    const urls: string[] = [];
    const imports: string[] = [];
    let gateway = 0;
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/https?:[/][/][a-zA-Z0-9.-]+/g)) if (!m[0].endsWith("dry-fire.invalid")) urls.push(`${f.slice(ROOT.length + 1)}: ${m[0]}`);
      if (FORBIDDEN_IMPORT.test(text)) imports.push(f.slice(ROOT.length + 1));
      if (/blackballgw/i.test(text)) gateway += 1;
    }
    return [urls.length === 0 && imports.length === 0 && gateway === 0 && files.length >= 15, `${files.length} files read · stray URLs [${urls.join(", ")}] · forbidden imports [${imports.join(", ")}] · gateway host named in ${gateway}`];
  });

  /* ── P · NO PHONE NUMBER IN WHAT THE HARNESS HANDS ON ── */
  await claim("P1", "no phone number in the report, the summary table or the SCALE block — nothing a screenshot or a paste could carry out", () => {
    // a long fraction (9.333333333333334) is a measurement, not a number: only whole digit runs are phone-shaped
    const text = textOf(base).replace(/[0-9]+[.][0-9]+/g, " ");
    const digits = text.match(/[0-9]{9,}/g) ?? [];
    const longRuns = digits.filter((d) => /^255[0-9]{9,}$/.test(d) || /^0[67][0-9]{8}$/.test(d));
    return [longRuns.length === 0 && !/[+]255/.test(text) && text.length > 5000, `${num(text.length)} characters read, ${digits.length} digit runs of nine or more (none a number: ${longRuns.length === 0})`];
  });

  /* ── L · THE --pg LOCK AND READER, ANSWERED BY STUBS ── */
  await claim("L1", "the `--pg` lock: only the repo's .pgscratch cluster passes, and only while it holds no campaign and no user — a shared data directory, a populated database or a silent server stop the run", async () => {
    const client = (dir: string | null, campaigns = 0, users = 0): import("./live/dry-fire/store-io.mts").ScratchClient => ({
      $queryRawUnsafe: async () => (dir === null ? [] : [{ data_directory: dir }]),
      smsCampaign: { count: async () => campaigns },
      user: { count: async () => users },
    });
    const winDir = ["F:", "kipindi-m14t", ".pgscratch", "pgdata"].join(BS);
    const verdicts: [string, boolean, string][] = [];
    const ask = async (name: string, c: import("./live/dry-fire/store-io.mts").ScratchClient, ok: boolean, words: string): Promise<void> => {
      let got = "allowed";
      try { await IO.assertScratchDatabase(c); } catch (err) { got = String((err as Error).message); }
      verdicts.push([name, (got === "allowed") === ok && (ok || got.includes(words)), got.slice(0, 90)]);
    };
    await ask("the repo's scratch cluster, posix path", client("/repo/.pgscratch/pgdata"), true, "");
    await ask("the repo's scratch cluster, windows path", client(winDir), true, "");
    await ask("a system cluster", client("/var/lib/postgresql/16/main"), false, "not the repo's .pgscratch");
    await ask("a windows system cluster", client(["C:", "Program Files", "PostgreSQL", "16", "data"].join(BS)), false, "not the repo's .pgscratch");
    await ask("a managed server (no data directory)", client(null), false, "not the repo's .pgscratch");
    await ask("a scratch cluster that holds a campaign", client("/repo/.pgscratch/pgdata", 1, 0), false, "not empty");
    await ask("a scratch cluster that holds a user", client("/repo/.pgscratch/pgdata", 0, 3), false, "not empty");
    const wrong = verdicts.filter((v) => !v[1]);
    return [wrong.length === 0, `${verdicts.length} servers judged, wrong [${wrong.map((w) => `${w[0]} → ${w[2]}`).join("; ")}]`];
  });

  await claim("L2", "the `--pg` reader maps Prisma's rows to the store's, in id order, across pages; its message, token and audit reads map the same way", async () => {
    const at = (i: number): Date => new Date(Date.UTC(2026, 9, 8, 8, 0, i));
    const rows = Array.from({ length: 5 }, (_, i) => ({
      id: `rcp_${i}`, campaignId: "cmp_1", msisdn: `25571100000${i}`, contactId: null, userId: i === 0 ? "usr_1" : null, status: i % 2 === 0 ? "SENT" : "SKIPPED",
      smsReference: i % 2 === 0 ? `sms_ref${i}` : null, optOutToken: null, locale: "SW", failureClass: null, error: null, skipReason: i % 2 === 0 ? null : "suppressed",
      skipDetail: null, claimToken: `slc_${i}`, claimedAt: at(i), attempts: i, segments: 1, bodyLen: 90, costTzs: { valueOf: () => 6 }, gateTrail: [{ check: "gate", verdict: "ok", wording: null, source: null }],
      createdAt: at(0), updatedAt: at(i), sentAt: i % 2 === 0 ? at(i) : null, deliveredAt: null, failedAt: null,
    }));
    const calls: string[] = [];
    const stub = {
      smsCampaignRecipient: {
        findMany: async (q: { where: { campaignId: string; id?: { gt: string } }; take: number }) => {
          calls.push(`recipients after ${q.where.id?.gt ?? "-"}`);
          return rows.filter((r) => r.campaignId === q.where.campaignId && (q.where.id === undefined || r.id > q.where.id.gt)).slice(0, q.take);
        },
      },
      smsMessage: {
        findMany: async (q: { where: { targetType: string; targetId: { in: string[] } } }) => rows
          .filter((r) => q.where.targetId.in.includes(r.id) && r.smsReference !== null)
          .map((r) => ({ reference: r.smsReference, msisdn: r.msisdn, purpose: "MARKETING", provider: "blackball", senderId: "50PICK", bodyLen: 90, status: "ACCEPTED", providerMsg: null, dlrStatus: null, dlrDesc: null, balanceTzs: { valueOf: () => 1000 }, attempts: 1, targetType: "SmsCampaignRecipient", targetId: r.id, createdAt: at(1), sentAt: at(2), deliveredAt: null, failedAt: null })),
      },
      marketingOptOutToken: { groupBy: async () => [{ identifier: "255711000000", _count: { _all: 2 } }] },
      auditLog: {
        findMany: async () => [{ id: "a1", category: "SYSTEM", action: "marketing.campaign_paused", actorId: null, targetType: "SmsCampaign", targetId: "cmp_1", payload: { reason: "gateway_refused" }, ip: null, userAgent: null, createdAt: at(3), prevHash: "GENESIS", entryHash: "h1" }],
      },
    };
    const reader = await IO.pgReader(stub, 2);
    const got = await reader.recipients("cmp_1");
    const msgs = await reader.messagesOf(got.map((r) => r.id));
    const tokens = await reader.tokenCounts(["255711000000"]);
    const audit = await reader.audit(0);
    const ok = got.length === 5 && got.map((r) => r.id).join(",") === rows.map((r) => r.id).join(",") && calls.length === 3
      && got[0].claimedAt === at(0).toISOString() && got[0].costTzs === 6 && got[1].status === "SKIPPED" && got[1].skipReason === "suppressed" && got[2].sentAt === at(2).toISOString()
      && Array.isArray(got[0].gateTrail) && msgs.length === 3 && msgs[0].balanceTzs === 1000 && msgs[0].createdAt === at(1).toISOString()
      && tokens.get("255711000000") === 2 && audit.length === 1 && audit[0].action === "marketing.campaign_paused" && audit[0].createdAt === at(3).toISOString() && audit[0].actorId === null;
    return [ok, `${got.length} rows in ${calls.length} pages (${calls.join("; ")}), ${msgs.length} messages, token count ${tokens.get("255711000000")}, ${audit.length} audit row`];
  });

  /* ── C · THE COMMAND LINE · W · THE WIRING ── */
  await claim("C1", "the command line: --seed --n --only --pg --json/--no-json --quiet --help; a number that is not a whole number is refused", () => {
    const log = (): void => undefined;
    const a = H.parseArgs(["--seed=7", "--n=1000"], log);
    const b = H.parseArgs(["--only=3,4", "--pg", "--no-json", "--quiet", "--help"], log);
    const c = H.parseArgs([], log);
    const refuse = (arg: string): boolean => { try { H.parseArgs([arg], log); return false; } catch { return true; } };
    const ok = a.opts.seed === 7 && a.opts.n === 1000 && !a.opts.pg && a.opts.only === null && a.json === ".qa-shots/marketing-setup/dry-fire/report.json"
      && json(b.opts.only) === "[3,4]" && b.opts.pg && b.json === null && b.help && c.opts.seed === 1 && c.opts.n === 3000 && !c.help
      && refuse("--n=abc") && refuse("--seed=-4") && refuse("--n=1.5");
    return [ok, `defaults seed ${c.opts.seed} · n ${c.opts.n} · report ${a.json}`];
  });

  await claim("W1", "the scripts: qa:marketing-dry-fire, test:marketing-dry-fire and red:marketing-dry-fire exist as written and none is in the predeploy chain; the report's folder is ignored by git", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
    const s = pkg.scripts;
    const chain = (s.predeploy ?? "").split("&&").map((x) => x.trim());
    const wired = s["qa:marketing-dry-fire"] === "tsx scripts/live/marketing-dry-fire.mts" && s["test:marketing-dry-fire"] === "tsx scripts/marketing-dry-fire.test.mts"
      && s["red:marketing-dry-fire"] === "tsx scripts/marketing-dry-fire.test.mts --prove-red";
    const offChain = !chain.some((x) => x.includes("marketing-dry-fire"));
    const ignored = readFileSync(join(ROOT, ".gitignore"), "utf8").split(NL).some((l) => l.trim().startsWith(".qa-shots"));
    return [wired && offChain && ignored, `scripts wired ${wired} · off the predeploy chain ${offChain} · .qa-shots ignored ${ignored}`];
  });

  await claim("W2", "the harness and this suite hold no backslash and no control character (an editing tool decodes them): fifteen files read", () => {
    const dir = join(ROOT, "scripts", "live", "dry-fire");
    const files = [...readdirSync(dir).filter((f) => f.endsWith(".mts")).map((f) => join(dir, f)), join(ROOT, "scripts", "live", "marketing-dry-fire.mts"), join(ROOT, "scripts", "marketing-dry-fire.test.mts")];
    const bad: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code === 92 || (code < 32 && code !== 10 && code !== 13 && code !== 9)) { bad.push(`${f.slice(ROOT.length + 1)} at ${i} (code ${code})`); break; }
      }
    }
    return [bad.length === 0 && files.length >= 16, `${files.length} files read, offending [${bad.join(", ")}]`];
  });
}

function num(n: number): string {
  return n.toLocaleString("en-US");
}

/* ══ THE PLANTS ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** A defect, planted through the harness's seams for the scenarios it lives in. It must fail EXACTLY `inv` (the invariants) and
 *  `claims` (the scenario claims) — nothing else, nothing less. */
type Plant = {
  id: string;
  name: string;
  only: number[];
  seams: () => Seams;
  expect: { inv: InvId[]; claims: string[] };
};

/** A cleared verdict, for a gate that lets somebody through who should have been refused. */
const CLEARED = { ok: true as const, basis: "CONSENT" as const, basisRef: "dry-fire-plant" };
/** A send window that is always open, as the engine and the slice read it. */
const ALWAYS_OPEN = () => ({ open: true, opensAt: "", closesAt: new Date(Date.now() + 365 * 86_400_000).toISOString(), label: "always open", opensAtTime: "", reason: null, judgedAt: new Date().toISOString() });
const FUTURE = (): string => new Date(Date.now() + 86_400_000).toISOString();

const PLANTS: Plant[] = [
  /* ── INV1 · NO DOUBLE SEND ── */
  {
    id: "R1", name: "the engine's send reaches the wire twice (a retry wrapper that sends the batch again after every reply)", only: [1],
    seams: () => ({ engine: (d) => ({ ...d, send: async (messages, opts) => { await d.send(messages, opts); return d.send(messages, opts); } }) }),
    expect: { inv: ["INV1"], claims: ["S1.wire"] },
  },
  {
    id: "R2", name: "the transport delivers every request to the carrier twice (a proxy that retries the POST; the engine sees one reply)", only: [1],
    seams: () => ({
      store: () => {
        const inner = globalThis.fetch;
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
          const first = await inner(input, init);
          const url = String(input instanceof Request ? input.url : input);
          if (url === CAR.FAKE_ENDPOINT) await inner(input, init).catch(() => undefined);
          return first;
        }) as typeof fetch;
        return () => { globalThis.fetch = inner; };
      },
    }),
    expect: { inv: ["INV1"], claims: ["S1.wire"] },
  },
  {
    id: "R3", name: "the reaper releases a row whose message exists (it settles from 'no message' whatever the evidence says)", only: [5],
    seams: () => ({ engine: (d) => ({ ...d, rules: { ...d.rules, reapVerdict: (row, _evidence, at) => d.rules.reapVerdict(row, null, at) } }) }),
    expect: { inv: ["INV1"], claims: ["S5.once", "S5.reap"] },
  },
  {
    id: "R4", name: "the claim is not exclusive (a second process re-takes rows another holds even once their messages are on the wire — each row once, so the run still ends)", only: [2],
    seams: () => {
      const taken = new Set<string>();
      return {
        engine: (d) => ({
          ...d,
          recipients: {
            ...d.recipients,
            claim: async (campaignId, limit, token, at) => {
              const held = (await d.recipients.findStranded(campaignId, FUTURE(), limit)).filter((r) => !taken.has(r.id));
              const onWire = new Set((await d.messages.findByTargets("SmsCampaignRecipient", held.map((r) => r.id))).map((m) => m.targetId));
              const steal = held.filter((r) => onWire.has(r.id));
              for (const r of steal) taken.add(r.id);
              if (steal.length > 0) await d.recipients.settle(steal.map((r) => ({ id: r.id, claimToken: r.claimToken as string, to: "PENDING" as const, attemptsDelta: 0 as const })), at);
              return d.recipients.claim(campaignId, limit, token, at);
            },
          },
        }),
      };
    },
    expect: { inv: ["INV1"], claims: ["S2.procs.once", "S2.procs.overlap"] },
  },
  {
    id: "R5", name: "a lost reply is settled as 'not sent' (UNCONFIRMED rows are released back to PENDING and go again after Resume)", only: [4],
    seams: () => ({
      engine: (d) => ({
        ...d,
        rules: {
          ...d.rules,
          settlementFor: (o, row, ctx) => (o.outcome === "unconfirmed" ? { id: o.ref, claimToken: ctx.claimToken, to: "PENDING" as const, attemptsDelta: 1 as const } : d.rules.settlementFor(o, row, ctx)),
        },
      }),
    }),
    expect: { inv: ["INV1"], claims: ["S4.lost.never", "S4.lost.unconfirmed", "S4.throw.after", "S4.throw.after.resume"] },
  },
  {
    id: "R22", name: "a send that threw cannot find its own messages (the evidence read answers 'none', so a row that reached the wire is released)", only: [4],
    seams: () => ({ engine: (d) => ({ ...d, messages: { findByTargets: async () => [] } }) }),
    expect: { inv: ["INV1"], claims: ["S4.throw.after", "S4.throw.after.resume"] },
  },
  {
    id: "R29", name: "the unique key is gone (the list keeps every seed, so a duplicate contact row is a second recipient of the same number)", only: [1],
    seams: () => ({
      store: (h) => {
        const dal = h.S.db.smsCampaignRecipient as unknown as { createMany: (seeds: Array<Record<string, unknown>>) => { inserted: number; duplicates: number } };
        const real = dal.createMany;
        dal.createMany = (seeds) => {
          const rows = IO.memStore().smsCampaignRecipients;
          for (const s of seeds) {
            rows.set(s.id as string, {
              id: s.id, campaignId: s.campaignId, msisdn: s.msisdn, contactId: s.contactId, userId: s.userId, status: "PENDING", smsReference: null,
              optOutToken: s.optOutToken, locale: null, failureClass: null, error: null, skipReason: null, skipDetail: null, claimToken: null,
              claimedAt: null, attempts: 0, segments: null, bodyLen: null, costTzs: null, gateTrail: null, createdAt: s.createdAt, updatedAt: s.createdAt,
              sentAt: null, deliveredAt: null, failedAt: null,
            } as never);
          }
          return { inserted: seeds.length, duplicates: 0 };
        };
        return () => { dal.createMany = real; };
      },
    }),
    expect: { inv: ["INV1", "INV2"], claims: ["S1.enqueue", "S1.wire"] },
  },
  /* ── INV2 · EVERY ROW TERMINAL ── */
  {
    id: "R6", name: "HELD rows are not counted when the campaign is finished (the count drops the status, so the campaign ends DONE with people parked)", only: [4],
    seams: () => ({ engine: (d) => ({ ...d, recipients: { ...d.recipients, countByStatus: async (id) => (await d.recipients.countByStatus(id)).map((c) => (c.status === "HELD" ? { ...c, count: 0 } : c)) } }) }),
    expect: { inv: ["INV2"], claims: ["S4.held.pause", "S4.held.resume"] },
  },
  {
    id: "R7", name: "the reaper never finds a stranded claim (its question answers 'nobody'), so a dead step's rows stay claimed for ever", only: [5],
    seams: () => ({ engine: (d) => ({ ...d, recipients: { ...d.recipients, findStranded: async () => [] } }) }),
    expect: { inv: ["INV2"], claims: ["S5.once", "S5.reap"] },
  },
  /* ── INV3 · NOBODY PROTECTED IS SENT ── */
  {
    id: "R8", name: "the gate skips the stop list (a suppressed number is cleared)", only: [1],
    seams: () => ({ gate: (real) => async (msisdn) => { const v = await real(msisdn); return !v.ok && v.skipReason === "suppressed" ? CLEARED : v; } }),
    expect: { inv: ["INV3"], claims: ["S1.outcomes", "S1.stops", "S1.wire"] },
  },
  {
    id: "R9", name: "the gate lets a self-excluded or cooling-off player through (a responsible-gambling refusal is cleared)", only: [1],
    seams: () => ({ gate: (real) => async (msisdn) => { const v = await real(msisdn); return !v.ok && v.skipReason.startsWith("rg_") ? CLEARED : v; } }),
    expect: { inv: ["INV3"], claims: ["S1.outcomes", "S1.wire"] },
  },
  /* ── INV4 · COUNTS ADD UP ── */
  {
    id: "R10", name: "the live page counts HELD as done (the plan's own red: people parked read as finished)", only: [4],
    seams: () => ({ view: (d) => ({ ...d, rules: { ...d.rules, progress: (c, counts) => d.rules.progress(c, { ...counts, SENT: counts.SENT + counts.HELD, HELD: 0 }) } }) }),
    expect: { inv: ["INV4"], claims: ["S4.held.bar"] },
  },
  {
    id: "R11", name: "the live page's groupBy loses a status (SKIPPED), so its figures no longer add up to the rows", only: [1],
    seams: () => ({ view: (d) => ({ ...d, recipients: { ...d.recipients, countByOutcome: async (id) => (await d.recipients.countByOutcome(id)).filter((g) => g.status !== "SKIPPED") } }) }),
    expect: { inv: ["INV4"], claims: [] },
  },
  {
    id: "R12", name: "the bar forgets DELIVERED (a receipt takes a person OUT of the done count, so the bar steps back)", only: [6],
    seams: () => ({ view: (d) => ({ ...d, rules: { ...d.rules, progress: (c, counts) => d.rules.progress(c, { ...counts, DELIVERED: 0 }) } }) }),
    expect: { inv: ["INV4"], claims: [] },
  },
  /* ── INV5 · AUDIT ── */
  {
    id: "R13", name: "an engine pause writes no audit row", only: [4],
    seams: () => ({ engine: (d) => ({ ...d, audit: async (e) => (e.action === "marketing.campaign_paused" ? { recorded: true } : d.audit(e)) }) }),
    expect: { inv: ["INV5"], claims: ["S4.refuse.pause", "S4.slow.gate", "S4.throw.before"] },
  },
  {
    id: "R14", name: "every officer act is audited twice (Start, Pause, Resume and Stop each write their row two times)", only: [3],
    seams: () => ({ control: (d) => ({ ...d, audit: async (e) => { await d.audit(e); return d.audit(e); } }) }),
    expect: { inv: ["INV5"], claims: ["S3.stop.books"] },
  },
  {
    id: "R15", name: "the gate prints the number it is checking (a log line carries a phone number)", only: [1],
    seams: () => ({ gate: (real) => async (msisdn) => { console.log(`gate checking ${msisdn}`); return real(msisdn); } }),
    expect: { inv: ["INV5"], claims: [] },
  },
  {
    id: "R16", name: "a pause's audit detail carries a phone number (the gateway's words, unscrubbed)", only: [4],
    seams: () => ({ engine: (d) => ({ ...d, audit: async (e) => d.audit(e.action === "marketing.campaign_paused" ? { ...e, payload: { ...(e.payload ?? {}), detail: "the gateway said no to 255712345678" } } : e) }) }),
    expect: { inv: ["INV5"], claims: ["S4.refuse.pause"] },
  },
  {
    id: "R17", name: "a batch the gateway refused whole is settled row by row (E7 forgotten: N rows FAILED, no pause)", only: [4],
    seams: () => ({
      engine: (d) => ({
        ...d,
        rules: {
          ...d.rules,
          isShopWide: (outcomes) => (outcomes.length > 0 && outcomes.every((o) => o.outcome === "failed" && o.code !== "BAD_MSISDN" && o.code !== "DEADLINE_PASSED") ? { shopWide: false as const } : d.rules.isShopWide(outcomes)),
        },
      }),
    }),
    expect: { inv: ["INV5"], claims: ["S4.refuse.pause", "S4.refuse.resume", "S4.refuse.rows"] },
  },
  /* ── INV6 · TIME ── */
  {
    id: "R18", name: "the send-age bound is gone (every claim reads as young, and the send carries no deadline)", only: [4],
    seams: () => ({
      engine: (d) => ({
        ...d,
        recipients: { ...d.recipients, claimedBy: async (id, token) => (await d.recipients.claimedBy(id, token)).map((r) => ({ ...r, claimedAt: new Date().toISOString() })) },
        send: (messages, opts) => d.send(messages, { ...opts, notAfter: undefined }),
      }),
    }),
    expect: { inv: ["INV6"], claims: ["S4.slow.gate", "S4.slow.send", "S4.slow.write"] },
  },
  {
    id: "R23", name: "the send window is ignored (the engine reads every hour as open)", only: [4],
    seams: () => ({ engine: (d) => ({ ...d, window: async () => ALWAYS_OPEN() }) }),
    expect: { inv: ["INV6"], claims: ["S4.window.closed", "S4.window.edge"] },
  },
  /* ── SCENARIO CLAIMS THE SIX INVARIANTS DO NOT SEE ── */
  {
    id: "R19", name: "Pause does not veto a new claim (a paused campaign is still handed to the slice, whose first read of it says RUNNING; only the re-read before the wire stops the send)", only: [3],
    seams: () => ({
      control: (d) => ({ ...d, reap: async (id) => { const reaped = await d.reap(id); await d.slice(id); return reaped; } }),
      engine: (d) => {
        let first = true;
        return {
          ...d,
          campaigns: {
            ...d.campaigns,
            find: async (id) => {
              const c = await d.campaigns.find(id);
              if (!first) return c;
              first = false;
              return c !== null && c.status === "PAUSED" ? { ...c, status: "RUNNING" as const } : c;
            },
          },
        };
      },
    }),
    expect: { inv: [], claims: ["S3.pause.veto"] },
  },
  {
    id: "R20", name: "a later receipt moves a decided row (neither door remembers the first verdict: the message takes the second and the recipient follows it)", only: [6],
    seams: () => ({
      store: (h) => {
        const recipients = h.S.db.smsCampaignRecipient as unknown as { recordReceipt: (id: string, r: unknown) => unknown };
        const messages = h.S.db.smsMessage as unknown as {
          recordDlr: (reference: string, o: { status: string | null }) => { changed: boolean; row: unknown };
          findByReference: (reference: string) => unknown;
        };
        const realReceipt = recipients.recordReceipt;
        const realDlr = messages.recordDlr;
        recipients.recordReceipt = (id, r) => {
          const row = IO.memStore().smsCampaignRecipients.get(id);
          if (row !== undefined && (row.status === "DELIVERED" || row.status === "FAILED")) row.status = "SENT";
          return realReceipt.call(recipients, id, r);
        };
        messages.recordDlr = (reference, o) => {
          const out = realDlr.call(messages, reference, o);
          return !out.changed && (o.status === "DELIVERED" || o.status === "FAILED") ? { changed: true, row: messages.findByReference(reference) } : out;
        };
        return () => { recipients.recordReceipt = realReceipt; messages.recordDlr = realDlr; };
      },
    }),
    expect: { inv: [], claims: ["S6.forward", "S6.order"] },
  },
  {
    id: "R21", name: "the receipt door accepts any secret (a forged callback is taken for the carrier's)", only: [6],
    seams: () => ({
      receipt: (post) => async (req) => {
        const body = await req.text();
        const url = new URL(req.url);
        url.searchParams.set("token", CORE.WEBHOOK_SECRET);
        return post(new Request(url.toString(), { method: "POST", headers: { "content-type": "application/json" }, body }));
      },
    }),
    expect: { inv: [], claims: ["S6.audit", "S6.auth"] },
  },
  {
    id: "R24", name: "money first is forgotten (a slice goes ahead while a deposit or a settlement is running)", only: [4],
    seams: () => ({ engine: (d) => ({ ...d, moneyBusy: () => ({ busy: false, why: null, stale: [] }) as ReturnType<typeof d.moneyBusy> }) }),
    expect: { inv: [], claims: ["S4.money.waits"] },
  },
  {
    id: "R25", name: "a login code that just failed is ignored (marketing does not step aside)", only: [4],
    seams: () => ({ engine: (d) => ({ ...d, otpLastFailureAt: () => null }) }),
    expect: { inv: [], claims: ["S4.otp.waits"] },
  },
  {
    id: "R26", name: "Start ignores the per-campaign limit (an over-budget refusal is waved through)", only: [7],
    seams: () => ({
      control: (d) => ({
        ...d,
        check: async (c) => {
          const r = await d.check(c);
          return !r.ok && r.refusal.reason === "over_budget" ? { ok: true as const, freshCount: c.audienceCount ?? 0, shrunkBy: 0, costTzs: 0 } : r;
        },
      }),
    }),
    expect: { inv: [], claims: ["S7.limit.edge", "S7.limit.over"] },
  },
  {
    id: "R27", name: "the slice has no gentle start (the first group is the ceiling, 50 people, not 20)", only: [1],
    seams: () => ({ engine: (d) => ({ ...d, rules: { ...d.rules, adaptSliceSize: () => 50 } }) }),
    expect: { inv: [], claims: ["S1.slices"] },
  },
  {
    id: "R28", name: "the credit kept for login codes is not asked (every slice reads as affordable)", only: [7],
    seams: () => ({ engine: (d) => ({ ...d, credit: (() => ({ ok: true })) as unknown as typeof d.credit }) }),
    expect: { inv: [], claims: ["S7.credit.mid.done", "S7.credit.mid.pause", "S7.credit.unread.run"] },
  },
];

/* ══ THE RED CONTROL ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

async function proveRed(): Promise<void> {
  quiet = true;
  if (!EXPLORE) await runSuite();
  quiet = false;
  if (fail > 0) {
    console.log(`RED CONTROL — NOT RUN: the baseline is not green (${fail} claim(s) fail for the REAL code):${NL}  ${failed.join(`${NL}  `)}`);
    process.exit(1);
  }
  console.log(EXPLORE ? `RED CONTROL — EXPLORING: the suite baseline was skipped; this run proves nothing${NL}` : `RED CONTROL — baseline green (${pass} claims pass for the real code)${NL}`);
  console.log(`RED CONTROL — each defect planted in memory must fail EXACTLY the invariants and scenario claims it names${NL}`);

  const chosen = ONLY_PLANTS === null ? PLANTS : PLANTS.filter((p) => ONLY_PLANTS.includes(p.id));
  const baselines = new Map<string, string | null>();
  const baselineOf = async (only: number[]): Promise<string | null> => {
    const key = only.join(",");
    if (!baselines.has(key)) {
      const r = await H.runDryFire(run({ only }));
      baselines.set(key, r.passed && r.scenarios.length === only.length ? null : `scenario(s) ${key} are not green for the REAL code: invariants [${r.failedInvariants.join(",")}] claims [${r.failedClaims.join(",")}]`);
    }
    return baselines.get(key) ?? null;
  };

  let held = 0;
  const missed: string[] = [];
  const bitten = new Map<string, string[]>();
  const guarded = new Set<number>();
  for (const p of chosen) {
    const bad = await baselineOf(p.only);
    if (bad !== null) { missed.push(p.id); console.log(`  FAIL  ${p.id} · ${p.name}${NL}        ${bad}`); continue; }
    let got: Report;
    try {
      got = await H.runDryFire(run({ only: p.only, seams: p.seams() }));
    } catch (err) {
      missed.push(p.id);
      console.log(`  FAIL  ${p.id} · ${p.name}${NL}        the plant could not be run: ${String((err as Error)?.stack ?? err).split(NL).slice(0, 3).join(" | ")}`);
      continue;
    }
    const gotInv = [...new Set(got.failedInvariants)].sort();
    const gotClaims = [...new Set(got.failedClaims)].sort();
    const wantInv = [...new Set<string>(p.expect.inv)].sort();
    const wantClaims = [...new Set<string>(p.expect.claims)].sort();
    const seen = `${gotInv.length ? gotInv.join(",") : "no invariant"} · ${gotClaims.length ? gotClaims.join(", ") : "no claim"}`;
    if (DETAIL) {
      for (const s of got.scenarios) {
        for (const i of s.invariants.filter((x) => !x.ok)) console.log(`          [S${s.n} ${i.id}] ${i.failures.slice(0, 4).join(" ;; ").slice(0, 700)}`);
        for (const c of s.claims.filter((x) => !x.ok && x.known === undefined)) console.log(`          [${c.id}] ${c.detail.slice(0, 400)}`);
      }
    }
    if (json(gotInv) === json(wantInv) && json(gotClaims) === json(wantClaims)) {
      held += 1;
      for (const i of gotInv) bitten.set(i, [...(bitten.get(i) ?? []), p.id]);
      for (const s of p.only) guarded.add(s);
      console.log(`  held  ${p.id} · ${p.name}${NL}          → ${seen}`);
    } else {
      missed.push(p.id);
      const extraI = gotInv.filter((x) => !wantInv.includes(x));
      const absentI = wantInv.filter((x) => !gotInv.includes(x));
      const extraC = gotClaims.filter((x) => !wantClaims.includes(x));
      const absentC = wantClaims.filter((x) => !gotClaims.includes(x));
      console.log(`  FAIL  ${p.id} · ${p.name}${NL}        saw: ${seen}`
        + `${absentI.length || absentC.length ? `${NL}        did not fail: ${[...absentI, ...absentC].join(" | ")}` : ""}`
        + `${extraI.length || extraC.length ? `${NL}        also failed: ${[...extraI, ...extraC].join(" | ")}` : ""}`);
    }
  }

  console.log(`${NL}RED CONTROL — ${held} of ${chosen.length} proofs held${missed.length ? `; ${missed.length} FAILED (${missed.join(", ")})` : ""}`);
  if (ONLY_PLANTS === null) {
    const ids: InvId[] = ["INV1", "INV2", "INV3", "INV4", "INV5", "INV6"];
    const unbitten = ids.filter((i) => !(bitten.get(i) ?? []).length);
    for (const i of ids) console.log(`  ${i} ${H.INV_NAMES[i]}: bitten by ${(bitten.get(i) ?? []).join(", ") || "NOTHING"}`);
    const unguarded = [1, 2, 3, 4, 5, 6, 7].filter((s) => !guarded.has(s));
    console.log(`  scenarios guarded by a plant: ${[...guarded].sort().join(",")}${unguarded.length ? ` — NOT guarded: ${unguarded.join(",")}` : ""}`);
    if (unbitten.length > 0 || unguarded.length > 0) missed.push(...unbitten.map((i) => `${i} never bitten`), ...unguarded.map((s) => `scenario ${s} unguarded`));
  }
  process.exitCode = missed.length === 0 && !EXPLORE ? 0 : 1;
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runSuite();
  console.log(`${NL}marketing-dry-fire: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  await proveRed();
}
