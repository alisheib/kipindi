/**
 * DATA RETENTION — the purge deletes what has aged out, and nothing else.
 *
 *   npx tsx scripts/retention.test.mts   (npm run test:retention)
 *
 * ⚠️ WHY THIS EXISTS (audit F-01, 2026-08-20). `/admin/retention` published a nightly chore
 * called `retention.purge.daily` to whoever reads that page — while admitting in smaller
 * type that "This job is not wired in the current build." Nothing pruned anything;
 * `Notification` held 2,450 rows going back to 2026-05-30 on production with no upper bound.
 *
 * A published schedule no code enforces is the same defect as a privacy policy describing
 * collection that does not happen. So the chore is real now, and this suite exists to hold
 * two lines that are easy to cross in opposite directions:
 *
 *   ① it must actually DELETE the aged rows — or the schedule is still a promise;
 *   ② it must delete NOTHING ELSE — money, ledger, positions and the audit chain are kept
 *      for 7 years under POCA Cap 423 §16, and the chain physically cannot be pruned
 *      without breaking the HMAC links that make it evidence.
 *
 * ⛔ And one coupling that is not obvious from either side: the notification period is
 * bounded from BELOW by the Up & Down digest's idempotency key. See section 4.
 *
 * Every assertion here has been broken on purpose and observed to go red.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-pepper";

import { readFileSync } from "node:fs";
import { db } from "../src/lib/server/store.ts";
import {
  runRetentionPass, NOTIFICATION_RETENTION_DAYS, OTP_RETENTION_DAYS, MAX_DIGEST_REPLAY_DAYS,
  AIPOLL_PAYLOAD_RETENTION_DAYS,
} from "../src/lib/server/retention.ts";
import { aiPollStore, AIPOLL_PAYLOAD_PRUNED } from "../src/lib/server/ai-poll-generation.ts";
import { verifyChain, getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  if (c) { pass++; console.log(`PASS ${l}${x ? ` — ${x}` : ""}`); }
  else { fail++; console.log(`FAIL ${l}${x ? ` — ${x}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 56 - s.length))}`);

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

// ── Fixtures: one aged and one young row of each class, plus money that must survive ──
await db.user.create({
  id: "u_ret", phoneE164: "+255700009001", passwordHash: "h", passwordSalt: "s",
  failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
  displayName: "Retention Probe", dob: null, region: null, acceptedTermsVersion: null,
  acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
} as never);

const mkNote = async (id: string, ageDays: number, href: string | null) =>
  db.notification.create({
    id, userId: "u_ret", kind: "SYSTEM", titleEn: id, titleSw: id, bodyEn: id, bodySw: id,
    href, readAt: null, dismissedAt: null, createdAt: iso(now - ageDays * DAY),
  } as never);

await mkNote("ntf_aged", NOTIFICATION_RETENTION_DAYS + 30, "/updown/history?day=2026-01-01");
await mkNote("ntf_young", 1, "/updown/history?day=2026-08-19");
await mkNote("ntf_edge", NOTIFICATION_RETENTION_DAYS - 1, null); // just inside the window

/**
 * `ageMs` is how long ago the code was ISSUED. Expiry is five minutes after issue, which is
 * what the product actually does — so anything but a just-issued OTP is expired, and only a
 * just-issued one is visible to `findActive`. That is why the "young" fixture below is fresh
 * rather than a day old: a day-old OTP is legitimately unreadable, so seeding one and then
 * asserting it is findable would have been a test of the fixture, not of the purge.
 */
const mkOtp = async (id: string, ageMs: number) =>
  db.otp.create({
    id, phoneE164: "+255700009001", hashedCode: "x", salt: "y", purpose: "login",
    attempts: 0, consumedAt: null,
    expiresAt: iso(now - ageMs + 5 * 60 * 1000),
    createdAt: iso(now - ageMs),
  } as never);

await mkOtp("otp_aged", (OTP_RETENTION_DAYS + 5) * DAY);
await mkOtp("otp_young", 0); // just issued — inside the window and still readable

// Money that must be byte-identical afterwards.
const wallet = await db.wallet.create({
  id: "wal_ret", userId: "u_ret", balance: 250_000, pending: 0, hold: 0, currency: "TZS",
  status: "ACTIVE", createdAt: iso(now - 400 * DAY), updatedAt: iso(now - 400 * DAY),
} as never);
await db.txn.create({
  id: "txn_ret_old", walletId: "wal_ret", userId: "u_ret", type: "DEPOSIT", status: "CONFIRMED",
  amount: 250_000, fee: 0, currency: "TZS", positionId: null,
  // Deliberately FAR older than every retention period in the schedule.
  createdAt: iso(now - 400 * DAY), updatedAt: iso(now - 400 * DAY),
} as never);

const auditBefore = getAuditPage({ limit: 10_000 }).length;

// ── 1 · CONTROL — the fixtures exist before we measure a deletion ─────────────────────
section("1 · CONTROL: the fixtures are actually there");
// ⚠️ This assertion was written as
//     `(...).length === 3 && !!(...) === false || true`
// — the trailing `|| true` made it unfalsifiable, which is the exact defect the rest of
// this session has been closing in other people's tests. Precedence made it worse: `&&`
// binds tighter than `||`, so the whole left side was discarded. It now checks the one
// thing it was trying to: that both OTP fixtures are on the store before anything is
// deleted, because section 2 measures a deletion COUNT and a missing fixture would make
// that count right for the wrong reason.
// The young OTP is directly checkable (it is still unexpired). The aged one is not — it is
// expired by construction, so no reader returns it — and its existence is instead proven by
// section 2's deletion count being exactly 1, plus section 5's second pass deleting 0.
ok("the young OTP fixture is on the store before the purge",
  !!(await db.otp.findActive("+255700009001", "login")));
const notesBefore = (await db.notification.findByUser("u_ret", 50)).length;
ok("notifications before the purge", notesBefore === 3, `got ${notesBefore}`);
ok("the old deposit is on the books", (await db.txn.findByUser("u_ret", 10)).length === 1);
ok("wallet holds its balance", (await db.wallet.findByUserId("u_ret"))?.balance === 250_000);

// ── 2 · The purge deletes what has aged out ──────────────────────────────────────────
section("2 · aged rows go");

const result = await runRetentionPass(now);
ok("it reports what it deleted", result.notifications === 1 && result.otps === 1,
  `notifications=${result.notifications}, otps=${result.otps}`);

const notesAfter = await db.notification.findByUser("u_ret", 50);
const ids = notesAfter.map((n) => n.id);
ok("⛔ the AGED notification is gone", !ids.includes("ntf_aged"), ids.join(","));
ok("the YOUNG notification survives", ids.includes("ntf_young"));
ok("a row one day INSIDE the window survives — the boundary is not off by one",
  ids.includes("ntf_edge"), `remaining: ${ids.join(",")}`);

// ── 3 · It deletes NOTHING ELSE ──────────────────────────────────────────────────────
section("3 · money, ledger and the audit chain are untouched");

ok("🔴 the 400-day-old DEPOSIT is still there — money is kept 7 years (POCA Cap 423 §16)",
  (await db.txn.findByUser("u_ret", 10)).some((t) => t.id === "txn_ret_old"),
  "A retention pass that can reach a transaction is a retention pass that can lose money.");
ok("the wallet balance is unchanged", (await db.wallet.findByUserId("u_ret"))?.balance === 250_000);
ok("the user row survives (FKs and audit traceability depend on it)",
  !!(await db.user.findById("u_ret")));
ok("🔴 the audit chain still verifies end to end", verifyChain().valid,
  "Pruning anything the chain covers would break the HMAC links that make it evidence.");
ok("the chain GREW (the purge is recorded), it did not shrink",
  getAuditPage({ limit: 10_000 }).length > auditBefore,
  `${auditBefore} -> ${getAuditPage({ limit: 10_000 }).length}`);
ok("and the entry is under the name the product already published",
  getAuditPage({ limit: 10_000 }).some((e) => e.action === "retention.purge.daily"));

// ── 4 · ⛔ THE COUPLING — the notification period is bounded from BELOW ───────────────
section("4 · the period cannot be tightened past the digest's replay window");

/**
 * `db.notification.existsWithHref()` is deliberately unbounded in time — its own comment
 * says the answer "must not become false again simply because time passed" — because it is
 * the ONLY idempotency key for the Up & Down daily digest (E-37). The digest keys on
 * `/updown/history?day=YYYY-MM-DD`.
 *
 * A prune deletes exactly the rows that answer is read from. `runUpDownDailyDigest` defaults
 * to `daysBack = 1`, but that parameter exists precisely so a missed day can be replayed
 * after an outage — and if the notification for that day has been pruned, the replay tells
 * every affected player about their day a second time.
 *
 * So this is not a style assertion. It is the reason the period is 180 days and not the 90
 * the audit proposed, and it fails loudly if someone tightens it for disk.
 */
ok("🔴 NOTIFICATION_RETENTION_DAYS exceeds the largest digest replay window",
  NOTIFICATION_RETENTION_DAYS > MAX_DIGEST_REPLAY_DAYS,
  `retention ${NOTIFICATION_RETENTION_DAYS}d vs replay ${MAX_DIGEST_REPLAY_DAYS}d — ` +
  "tighten this and a replayed Up & Down digest double-notifies every affected player.");
ok("and it does so with real headroom, not by one day",
  NOTIFICATION_RETENTION_DAYS - MAX_DIGEST_REPLAY_DAYS >= 30,
  `${NOTIFICATION_RETENTION_DAYS - MAX_DIGEST_REPLAY_DAYS}d of headroom (>= 30d required)`);
ok("a digest notification INSIDE the replay window is still answerable after a purge",
  await db.notification.existsWithHref("u_ret", "/updown/history?day=2026-08-19"),
  "If this is false the digest would re-send for that day.");
ok("CONTROL: and one OUTSIDE it is genuinely gone, so the purge really ran",
  !(await db.notification.existsWithHref("u_ret", "/updown/history?day=2026-01-01")));

// ── 5b · AI POLL PAYLOADS — the class that blanks columns and deletes no row ──────────
section("5b · AI poll payloads: two columns go, the decision stays");

/**
 * 🔴 F-09. `AIPoll` is 621 rows / 8,432 kB on production, of which `rawResponse` is 4.45 MB
 * and `generation` 1.19 MB — and 494 rows are already older than 30 days, carrying 4.41 MB
 * between them (measured read-only 2026-08-21). Half the table, for two columns nobody reads
 * about a month-old generation.
 *
 * ⛔ AND THIS PASS MUST NOT BEHAVE LIKE THE OTHER TWO. An `AIPoll` row is a DECISION record —
 * what was asked for, what an officer approved or rejected and why, what it cost, whether it
 * became a live market. Deleting rows here would destroy the record of every AI-generated
 * market the platform has ever published. So the assertions below come in pairs: the payload
 * is gone AND the decision is intact AND the row count did not move.
 */
const mkPoll = async (id: string, ageDays: number, raw: string | null) =>
  aiPollStore.set({
    id, state: "FILTERED", requestCategory: "sports", requestPrompt: "p",
    generation: { ideas: [{ titleEn: id }] } as never,
    rawResponse: raw,
    filterReasons: [], qualityIndicators: [], overallQuality: 50,
    titleEn: `Title ${id}`, titleSw: `Kichwa ${id}`, titleZh: "",
    category: "sports", resolutionCriterion: "criterion",
    resolutionCriterionSw: null, resolutionCriterionZh: null,
    resolutionAt: iso(now + 10 * DAY), selectionClosedAt: null,
    options: [], sources: [], confidence: 70, reasoning: "because",
    reviewedBy: "usr_officer", reviewedAt: iso(now - ageDays * DAY), reviewNote: "seen",
    rejectReasons: [], publishedMarketId: "mkt_from_poll", publishedCandidateId: null,
    tokensUsed: 1234, costUsd: 0.0456, latencyMs: 900,
    regenerationOf: null, regenerationCount: 0,
    createdAt: iso(now - ageDays * DAY), updatedAt: iso(now - ageDays * DAY),
  } as never);

await mkPoll("aip_aged", AIPOLL_PAYLOAD_RETENTION_DAYS + 10, "THE-VERBATIM-PROVIDER-REPLY");
await mkPoll("aip_young", 1, "STILL-NEEDED-FOR-REVIEW");
// ⭐ A row that never had a raw response. It must keep its NULL, not gain a tombstone saying
// something was pruned — that would be a false statement, the same defect facing the other way.
await mkPoll("aip_aged_no_raw", AIPOLL_PAYLOAD_RETENTION_DAYS + 10, null);

const pollsBefore = await aiPollStore.size();
ok("5b.0 CONTROL: the three poll fixtures are on the store", pollsBefore >= 3, `${pollsBefore}`);

const pollPass = await runRetentionPass(now);
// ⭐ THE TWO NUMBERS DISAGREE ON PURPOSE, and that is the assertion. Three fixtures:
//   · aip_aged          — aged, has a raw response  → counts in BOTH
//   · aip_aged_no_raw   — aged, raw response NULL   → counts in GENERATIONS ONLY
//   · aip_young         — inside the window          → counts in neither
// So raw=1 and gen=2. A single "payloads pruned" total would have to pick one of those and be
// wrong about the other, which is exactly why the result carries two.
// ⚠️ This assertion first read `raw === 2 && gen === 3` — my own miscount, caught on the first
// run. The code was right; the expectation was not.
ok("5b.1 it reports what it blanked — TWO numbers, because they are two columns",
  pollPass.aiPollRawResponses === 1 && pollPass.aiPollGenerations === 2,
  `raw=${pollPass.aiPollRawResponses}, gen=${pollPass.aiPollGenerations}`);

const aged = await aiPollStore.get("aip_aged");
const young = await aiPollStore.get("aip_young");
const noRaw = await aiPollStore.get("aip_aged_no_raw");
ok("5b.2 🔴 the AGED payload is gone", aged?.rawResponse === AIPOLL_PAYLOAD_PRUNED && aged?.generation == null,
  `raw=${String(aged?.rawResponse).slice(0, 40)}, gen=${JSON.stringify(aged?.generation)}`);
ok("5b.3 …and it left a SENTENCE, not a null — a reviewer must be able to tell 'pruned' from " +
   "'there never was one'",
  (aged?.rawResponse ?? "").includes("pruned"), String(aged?.rawResponse));
ok("5b.4 the YOUNG payload survives untouched",
  young?.rawResponse === "STILL-NEEDED-FOR-REVIEW" && young?.generation != null);
ok("5b.5 ⭐ a row that never HAD a raw response keeps its null rather than gaining a tombstone",
  noRaw?.rawResponse === null, String(noRaw?.rawResponse));

ok("5b.6 🔴 EVERY DECISION FIELD SURVIVES on the pruned row — this table is the record of " +
   "every AI market the platform published",
  aged?.state === "FILTERED" && aged?.titleEn === "Title aip_aged"
    && aged?.reviewedBy === "usr_officer" && aged?.publishedMarketId === "mkt_from_poll"
    && aged?.costUsd === 0.0456 && aged?.tokensUsed === 1234
    && aged?.resolutionCriterion === "criterion" && aged?.confidence === 70,
  JSON.stringify({ state: aged?.state, title: aged?.titleEn, by: aged?.reviewedBy,
    mkt: aged?.publishedMarketId, cost: aged?.costUsd }));
ok("5b.7 🔴 and NOT ONE ROW was deleted", (await aiPollStore.size()) === pollsBefore,
  `${pollsBefore} -> ${await aiPollStore.size()}`);

/**
 * ⛔ THE HALF THIS SUITE CANNOT EXECUTE. Everything above runs against the in-memory store; the
 * PRISMA implementation is the one production uses and there is no database here. So it is read,
 * for the two properties that cannot be inferred from behaviour — the same approach
 * `test:erasure` §11 takes for the partial unique index.
 */
{
  const src = readFileSync("src/lib/server/ai-poll-generation.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  ok("5b.9 CONTROL · the store module was read", src.includes("const prismaStore: AIPollStore"));
  const prismaHalf = src.slice(src.indexOf("const prismaStore: AIPollStore"));
  const updateManys = (prismaHalf.match(/aIPoll\.updateMany/g) ?? []).length;
  ok("5b.10 🔴 the Prisma half uses TWO separate updateMany passes, one per column",
    updateManys === 2,
    `found ${updateManys}. ⛔ A single statement with OR: [raw not pruned, generation not null]\n` +
    "       qualifies a row on the GENERATION arm and then stamps the tombstone over a\n" +
    "       rawResponse that was always null — telling a reviewer a payload was pruned when\n" +
    "       there never was one. That is 5b.5's defect, and the in-memory half cannot show it.");
  ok("5b.11 🔴 …and it writes `Prisma.DbNull`, not a bare null",
    /generation:\s*Prisma\.DbNull/.test(prismaHalf),
    "A bare `null` into a nullable Json column is stored by Prisma as the JSON VALUE null —\n" +
    "       a 4-byte payload, not an absent one. The prune would report success and free nothing.");
}

const blankEntry = getAuditPage({ limit: 10_000 }).find(
  (e) => e.action === "retention.purge.daily"
    && (e.payload as Record<string, unknown> | null)?.aiPollRawResponsesBlanked !== undefined);
ok("5b.8 the audit row says BLANKED, and carries no field named for a deletion",
  !!blankEntry && !JSON.stringify(blankEntry.payload ?? {}).includes("aiPollsDeleted"),
  JSON.stringify(blankEntry?.payload ?? {}));

// ── 5 · Idempotent — a second pass is a no-op ────────────────────────────────────────
section("5 · running it twice deletes nothing more");

const second = await runRetentionPass(now);
ok("second pass deletes nothing", second.notifications === 0 && second.otps === 0,
  `notifications=${second.notifications}, otps=${second.otps}`);
ok("…and blanks no further payload — the prune is idempotent",
  second.aiPollRawResponses === 0 && second.aiPollGenerations === 0,
  `raw=${second.aiPollRawResponses}, gen=${second.aiPollGenerations}`);
// ⚠️ TWO passes in this run did real work — §2 (notifications + OTPs) and §5b (AI payloads) —
// so the chain holds exactly TWO rows, not one. What F-10 forbids is a row for a pass that did
// NOTHING, and the assertion below measures that directly: the count does not move across the
// no-op pass above. (It read `=== 1` until §5b existed, which made it an assertion about how
// many sections the suite happened to have.)
const purgeRows = getAuditPage({ limit: 10_000 }).filter((e) => e.action === "retention.purge.daily").length;
ok("and writes no audit row for a no-op — a daily 'nothing happened' entry in an " +
   "unprunable chain is 365 rows a year of noise (F-10)",
  purgeRows === 2, `${purgeRows} rows for 2 passes that did work + 1 that did not`);
const afterAnotherNoop = await runRetentionPass(now);
ok("…proven by running it a THIRD time and watching the count stay put",
  getAuditPage({ limit: 10_000 }).filter((e) => e.action === "retention.purge.daily").length === purgeRows
    && afterAnotherNoop.notifications === 0 && afterAnotherNoop.aiPollRawResponses === 0);

console.log("");
console.log("─".repeat(64));
console.log(`  DATA RETENTION: ${pass} passed, ${fail} failed`);
console.log(`  What is kept is kept because a statute says so. What is deleted is deleted`);
console.log(`  because we told someone we would. Both halves have to be true.`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
