/** U43: settlement and emergency-void chart points exist only after their money transaction commits. */
import { readFileSync } from "node:fs";

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.MARKET_SCHEDULER = "false";
process.env.UPDOWN_SCHEDULER = "false";
process.env.HOUSE_BOT_ENGINE = "false";
process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.SMS_PROVIDER = "console";

const onPostgres = process.env.HB_MONEY_STORE === "postgres";
if (process.env.NODE_ENV === "production") throw new Error("snapshot fixture refuses production mode");
if (onPostgres) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)
    || !url.pathname.startsWith("/u43_snapshot_commit_")) throw new Error("snapshot fixture requires its disposable loopback database");
} else if (process.env.DATABASE_URL) throw new Error("snapshot memory fixture refuses a database URL");

const { db } = await import("../../src/lib/server/store.ts");
const { marketStore } = await import("../../src/lib/server/market-dal.ts");
const { withLock } = await import("../../src/lib/server/locks.ts");
const { getHistory } = await import("../../src/lib/server/market-history.ts");
const { createMarket, resolveMarket, settleMarket, emergencyVoidMarket } = await import("../../src/lib/server/market-service.ts");

let pass = 0, fail = 0;
const ok = (label: string, yes: boolean, detail = "") => {
  if (yes) pass++; else fail++;
  console.log(`${yes ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const count = async (id: string) => (await getHistory(id)).length;
async function waitForAtLeast(id: string, minimum: number, ms = 3000): Promise<number> {
  const until = Date.now() + ms;
  let seen = await count(id);
  while (seen < minimum && Date.now() < until) { await sleep(50); seen = await count(id); }
  return seen;
}
async function observeExtra(id: string, baseline: number, ms = 3000): Promise<number> {
  const until = Date.now() + ms;
  let seen = await count(id);
  while (seen <= baseline && Date.now() < until) { await sleep(50); seen = await count(id); }
  return seen;
}

const source = readFileSync(new URL("../../src/lib/server/market-service.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const settlement = source.slice(source.indexOf("const persistResolution = async () => {"), source.indexOf("const settleCfg = ratesFor(m);"));
// 2026-10-21 · U43 Release B (c29cb7526) put both chart points behind the post-commit queues their services drain:
// settlement's `persistResolution` writes the stamp on `lockTx`, then hands the point to `queueSettlementEffect`, whose
// only body is `afterCommit(lockTx, …)`; the emergency void registers its point with `afterCommit(lockTx, …)` into
// `committedNotices` after the refunds, the round and the market row are written on that same transaction (no longer
// the line after the market write). The point still waits for the lock's own transaction, so the pins follow the queues.
// Each function body runs to its closing brace at column 0 and holds exactly ONE snapshot call: an eager second one
// beside the queued one would publish before the money commits.
const fnBody = (head: string) => { const at = source.indexOf(head); return at < 0 ? "" : source.slice(at, source.indexOf("\n}\n", at)); };
const settleFn = fnBody("export async function settleMarket(");
const emergency = fnBody("export async function emergencyVoidMarket(");
const snapshotCalls = (body: string) => body.split("recordSnapshot(").length - 1;
const STAMP_ON_LOCK = "await marketStore.set(m, lockTx ?? undefined);";
// 2026-10-21 · U43 CI repair: each queued point RETURNS its promise and both queues await it after commit, so the S.commit /
// E.commit reads below find the point the moment the money call returns (a `void` point was still being written then).
const SETTLE_POINT = "queueSettlementEffect(() => recordSnapshot(m.id, m.yesPool, m.noPool));";
const SETTLE_QUEUE = "const queueSettlementEffect = (fn: () => void | Promise<unknown>) => {\n    afterCommit(lockTx, () => { committedSettlementEffects.push(fn); });\n  };";
const VOID_POINT = "afterCommit(lockTx, () => { committedNotices.push(() => recordSnapshot(m.id, 0, 0)); });";
const VOID_RETURN = "return { ok: true as const, data: { refundedCount, refundedTzs } };";
ok("S.source · settlement snapshot waits for its own lock transaction",
  settlement.includes(STAMP_ON_LOCK) && settlement.indexOf(STAMP_ON_LOCK) < settlement.indexOf(SETTLE_POINT)
  && settleFn.split(SETTLE_QUEUE).length === 2 && settleFn.indexOf(SETTLE_QUEUE) < settleFn.indexOf(SETTLE_POINT)
  && snapshotCalls(settleFn) === 1,
  `point queued ${settlement.includes(SETTLE_POINT)} · queue on lockTx ${settleFn.split(SETTLE_QUEUE).length - 1} · snapshot calls ${snapshotCalls(settleFn)}`);
ok("E.source · emergency-void snapshot waits for its own lock transaction",
  emergency.split(STAMP_ON_LOCK).length === 2 && emergency.split(VOID_POINT).length === 2
  && emergency.indexOf(STAMP_ON_LOCK) < emergency.indexOf(VOID_POINT) && emergency.indexOf(VOID_POINT) < emergency.indexOf(VOID_RETURN)
  && snapshotCalls(emergency) === 1,
  `point on lockTx ${emergency.split(VOID_POINT).length - 1} · snapshot calls ${snapshotCalls(emergency)}`);

let seq = 0;
const id = (prefix: string) => `u43snap_${prefix}_${process.pid}_${++seq}`;
async function officer(role: "ADMIN" | "COMPLIANCE"): Promise<string> {
  const userId = id(role.toLowerCase());
  const now = new Date().toISOString();
  await db.user.create({
    id: userId, phoneE164: `+2557${String(process.pid % 1_000_000).padStart(6, "0")}${String(seq).padStart(2, "0")}`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, email: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  } as never);
  return userId;
}
const admin = await officer("ADMIN");
const confirmer = await officer("COMPLIANCE");
async function market(tag: string) {
  return createMarket({
    titleEn: `Snapshot commit ${tag}`, titleSw: `Jaribio la soko ${tag}`, category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Disposable snapshot commit fixture.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: admin,
  } as never);
}
async function resolved(tag: string) {
  const m = await market(tag);
  const first = await resolveMarket({ marketId: m.id, outcome: "YES", officerId: admin, evidence: "Fixture verdict." });
  if (first.ok && first.data?.stage === "stage1") {
    await resolveMarket({ marketId: m.id, outcome: "YES", officerId: confirmer, evidence: "Fixture verdict." });
  }
  const row = await marketStore.get(m.id);
  const baseline = await waitForAtLeast(m.id, 1);
  ok(`${tag}.premise · adjudicated market has its prior factual snapshot`, row?.status === "RESOLVED" && baseline >= 1,
    `status ${row?.status ?? "missing"} · points ${baseline}`);
  return { m, baseline };
}

async function probe(kind: "S" | "E", rollback: boolean) {
  const tag = `${kind}${rollback ? "rollback" : "commit"}`;
  const fixture = kind === "S" ? await resolved(tag) : { m: await market(tag), baseline: 0 };
  const { m, baseline } = fixture;
  const call = kind === "S"
    ? () => settleMarket(m.id, { force: true, actorId: admin })
    : () => emergencyVoidMarket({ marketId: m.id, officerId: admin, reason: "Disposable void fixture." });
  let innerOk = false, inside = -1, threw = false;
  try {
    await withLock(`market:${m.id}`, async () => {
      const result = await call();
      innerOk = result.ok;
      await sleep(100); // Give an erroneously eager async callback a chance to publish inside the open transaction.
      inside = await count(m.id);
      if (rollback) throw new Error("planned snapshot rollback");
    });
  } catch (error) { threw = String(error).includes("planned snapshot rollback"); }
  ok(`${kind}.${rollback ? "rollback" : "commit"}.service · real service reached its final write`, innerOk && threw === rollback,
    `service ${innerOk} · planned throw ${threw}`);
  ok(`${kind}.${rollback ? "rollback" : "commit"}.inside · snapshot visibility matches store transaction semantics`,
    onPostgres ? inside === baseline : inside === baseline + 1, `before ${baseline} · inside ${inside}`);

  const after = rollback && onPostgres
    ? await observeExtra(m.id, baseline) // A queued fire-and-forget append would appear during this bounded window.
    : await waitForAtLeast(m.id, baseline + 1);
  const row = await marketStore.get(m.id);
  if (rollback) {
    ok(`${kind}.rollback · ${onPostgres ? "failed transaction leaves no chart point" : "memory keeps market and chart write together"}`,
      onPostgres ? after === baseline && row?.settledAt == null && row?.status === (kind === "S" ? "RESOLVED" : "LIVE")
        : after === baseline + 1 && row?.settledAt != null && row?.status === (kind === "S" ? "RESOLVED" : "VOIDED"),
      `before ${baseline} · after ${after} · status ${row?.status ?? "missing"} · settled ${row?.settledAt != null}`);
  } else {
    ok(`${kind}.commit · successful money transaction publishes exactly one chart point`,
      after === baseline + 1 && row?.settledAt != null && row?.status === (kind === "S" ? "RESOLVED" : "VOIDED"),
      `before ${baseline} · after ${after} · status ${row?.status ?? "missing"} · settled ${row?.settledAt != null}`);
  }
}

try {
  await probe("S", true);
  await probe("S", false);
  await probe("E", true);
  await probe("E", false);
} catch (error) {
  ok("fixture completed all four real service paths", false, String(error).slice(0, 240));
}
console.log(`@@SUMMARY ${JSON.stringify({ pass, fail })}`);
process.exitCode = fail ? 1 : 0;
