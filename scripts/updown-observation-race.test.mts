/**
 * The real PostgreSQL half of the Up & Down observation write-once control.
 * Two child processes have separate Prisma clients, as two app instances do.
 * Run only through db:scratch: this creates and drops its own loopback database.
 */
import { fork, spawnSync, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

type Message = { type: string; n?: number; assetId?: string; boundaryAt?: string; id?: string; state?: string; price?: number | null; code?: string };

if (process.argv.includes("--worker")) {
  process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
  const { observationStore } = await import("../src/lib/server/updown-dal.ts");
  const { prisma } = await import("../src/lib/server/prisma.ts");
  process.on("message", async (raw: Message) => {
    if (raw.type === "stop") {
      await prisma()?.$disconnect();
      process.exit(0);
    }
    if (raw.type !== "ensure" || typeof raw.n !== "number") return;
    try {
      const assetId = raw.assetId;
      const boundaryAt = raw.boundaryAt;
      if (!assetId || !boundaryAt) throw new Error("missing worker fixture");
      const row = await observationStore.ensure(assetId, boundaryAt);
      process.send?.({ type: "result", n: raw.n, id: row.id, state: row.state, price: row.price });
    } catch (error) {
      process.send?.({ type: "failure", n: raw.n, code: (error as { code?: string }).code ?? "THREW" });
    }
  });
  process.send?.({ type: "ready" });
} else {
  const scratch = process.env.VERIFY_DATABASE_URL ?? "";
  let url: URL;
  try { url = new URL(scratch); } catch { throw new Error("test:updown-observation-race needs db:scratch --run"); }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)) {
    throw new Error("test:updown-observation-race refuses a non-loopback database");
  }

  const database = `ud_obs_race_${process.pid}_${Date.now()}`;
  const testUrl = new URL(url);
  testUrl.pathname = `/${database}`;
  testUrl.searchParams.set("connect_timeout", "30");
  const admin = new pg.Client({ connectionString: scratch });
  const workers: ChildProcess[] = [];
  const stderr = ["", ""];
  let client: import("@prisma/client").PrismaClient | null = null;
  let assetId: string | null = null;
  let adminConnected = false;
  let passed = 0;
  let failed = 0;
  const check = (name: string, good: boolean) => {
    console.log(`${good ? "PASS" : "FAIL"} ${name}`);
    good ? passed++ : failed++;
  };
  const waitFor = (child: ChildProcess, match: (message: Message) => boolean, timeoutMs = 30_000) =>
    new Promise<Message>((resolve, reject) => {
      const done = () => { clearTimeout(timer); child.off("message", onMessage); child.off("exit", onExit); };
      const onMessage = (raw: unknown) => {
        const message = raw as Message;
        if (!match(message) && message.type !== "failure") return;
        done();
        message.type === "failure" ? reject(new Error(`worker ${message.code}`)) : resolve(message);
      };
      const onExit = (code: number | null) => { done(); reject(new Error(`worker exited ${code}`)); };
      const timer = setTimeout(() => { done(); reject(new Error("worker timed out")); }, timeoutMs);
      child.on("message", onMessage);
      child.on("exit", onExit);
    });
  try {
    await admin.connect();
    adminConnected = true;
    await admin.query(`CREATE DATABASE "${database}"`);
    const migrated = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: testUrl.toString() }, encoding: "utf8",
      shell: process.platform === "win32", timeout: 10 * 60_000,
    });
    check("0 · scratch database migrated", migrated.status === 0);
    if (migrated.status !== 0) throw new Error("scratch migration failed");

    const { PrismaClient } = await import("@prisma/client");
    client = new PrismaClient({ datasources: { db: { url: testUrl.toString() } }, log: ["error"] });
    const asset = await client.upDownAsset.create({ data: {
      key: `OBS${process.pid}${Date.now()}`, symbol: "XAU/USD", nameEn: "Race test",
      nameSw: "Jaribio", iconKey: "gold", priceSourceUrl: "https://example.test/price",
      sourceDomain: "example.test", createdBy: "s12-observation-race-test",
    } });
    assetId = asset.id;

    const file = fileURLToPath(import.meta.url);
    for (let i = 0; i < 2; i++) {
      const child = fork(file, ["--worker"], {
        execArgv: ["--import", "tsx"],
        env: { ...process.env, DATABASE_URL: testUrl.toString(), USE_PRISMA_DAL: "true" },
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      });
      workers.push(child);
      child.stderr?.on("data", (data: Buffer) => { stderr[i] += data.toString(); });
      child.stdout?.resume();
    }
    await Promise.all(workers.map((child) => waitFor(child, (message) => message.type === "ready")));

    // Fresh boundaries make both instances enter the insert path repeatedly.
    // Each pair must converge to one row without any Prisma P2002 error log.
    let allOne = true;
    let allPending = true;
    let firstId = "";
    for (let n = 1; n <= 8; n++) {
      const boundaryAt = new Date(Date.parse("2026-10-15T00:00:00.000Z") + n * 60_000).toISOString();
      const answers = await Promise.all(workers.map((child) => {
        const answer = waitFor(child, (message) => message.type === "result" && message.n === n);
        child.send({ type: "ensure", n, assetId, boundaryAt });
        return answer;
      }));
      const rows = await client.upDownObservation.findMany({ where: { assetId, boundaryAt: new Date(boundaryAt) } });
      allOne &&= answers[0].id === answers[1].id && rows.length === 1 && rows[0]?.id === answers[0].id;
      allPending &&= rows[0]?.state === "PENDING" && rows[0]?.price === null;
      if (n === 1) firstId = rows[0]?.id ?? "";
    }
    check("1 · two app instances converge to one observation at 8 boundaries", allOne);
    check("2 · each initial row is pending and has no price", allPending);
    check("3 · a normal unique race emits no P2002", stderr.every((line) => !line.includes("P2002") && !line.includes("prisma:error")));

    const confirmed = await client.upDownObservation.update({
      where: { id: firstId }, data: { state: "CONFIRMED", price: 2417.6, confirmedAt: new Date() },
    });
    const skipped = await client.upDownObservation.createMany({
      data: [{ assetId, boundaryAt: new Date("2026-10-15T00:01:00.000Z"), state: "PENDING" }], skipDuplicates: true,
    });
    const after = await client.upDownObservation.findUnique({ where: { id: confirmed.id } });
    check("4 · conflict skip cannot rewrite a confirmed price", skipped.count === 0 && after?.state === "CONFIRMED" && after.price?.toNumber() === 2417.6);
    check("5 · the unique pair still has exactly one row", await client.upDownObservation.count({ where: { assetId, boundaryAt: new Date("2026-10-15T00:01:00.000Z") } }) === 1);
    console.log(`updown-observation-race: ${passed} passed, ${failed} failed`);
  } catch (error) {
    failed++;
    console.error(`FAIL updown-observation-race: ${(error as Error).message}`);
  } finally {
    for (const child of workers) child.send?.({ type: "stop" });
    await Promise.all(workers.map((child) => new Promise<void>((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", () => resolve());
      setTimeout(() => { if (child.exitCode === null) child.kill(); resolve(); }, 5_000).unref();
    })));
    if (client) {
      if (assetId) await client.upDownAsset.delete({ where: { id: assetId } }).catch(() => { failed++; });
      await client.$disconnect();
    }
    if (adminConnected) {
      await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`).catch(() => { failed++; });
      await admin.end();
    }
    if (failed) process.exitCode = 1;
  }
}
