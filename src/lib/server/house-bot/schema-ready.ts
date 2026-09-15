/**
 * IS THE HOUSE-BOT SCHEMA HERE? — the release gate the engine and `/api/health` share (04 A23, PLAN §18 A23 row).
 *
 * ⛔ WHY A GATE. Every Position and Transaction create writes `houseBotId` (build commit 2). A build that boots
 * against a database without the marker columns or the house tables would fail every bet, and an engine started
 * against half a schema would write rows nobody can read. So the build asks the database, and when the answer
 * is no, the engine does not start and `/api/health` answers 503 with `houseBots.schemaReady=false` — the deploy
 * gate stops a broken release taking over from a working one.
 *
 * What "ready" means: the 8 house tables, the 7 marker columns, and the two seeded rows (`HouseBotControl` id
 * `global`, `HouseBotRuntime` key `global`). `test:house-bot-migrations` pins the same lists against the
 * migration files.
 *
 * ⛔ FAILS CLOSED. A probe that throws is "not ready". A "ready" answer is kept for the process's life on
 * `globalThis` (a schema cannot un-migrate under a running container); a "not ready" answer is asked again on
 * the next call, so a container that booted mid-migration recovers without a restart.
 *
 * Without a database (the memory store) there is nothing to migrate: ready.
 */
import { hasDatabase, prisma } from "../prisma";

export const HOUSE_SCHEMA_TABLES = [
  "HouseBot",
  "HouseBotControl",
  "HouseBotRuntime",
  "HouseBotAlertOnce",
  "HouseBotEvent",
  "HouseBotIntent",
  "HouseBotTarget",
  "HouseBotPress",
] as const;

export const HOUSE_SCHEMA_COLUMNS: ReadonlyArray<readonly [table: string, column: string]> = [
  ["User", "passwordSetAt"],
  ["User", "passwordSetVia"],
  ["User", "emailSetByOfficerAt"],
  ["Position", "houseBotId"],
  ["Transaction", "houseBotId"],
  ["PredictionMarket", "reopenedAt"],
  ["PredictionMarket", "reopenCount"],
];

export type HouseSchemaState = {
  ready: boolean;
  missingTables: string[];
  missingColumns: string[];
  seeded: boolean;
  /** The probe itself failed — "not ready" because nobody could tell. */
  probeFailed: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_HOUSE_SCHEMA_READY: HouseSchemaState | undefined;
}

type Probe = () => Promise<{ tables: string[]; columns: Array<{ table: string; column: string }>; seeds: { control: number; runtime: number } | null }>;

async function probeDatabase(): ReturnType<Probe> {
  const db = prisma();
  if (!db) throw new Error("house schema probe: no database client");
  const tables = ((await db.$queryRawUnsafe(
    `SELECT table_name::text AS "t" FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1::text[])`,
    [...HOUSE_SCHEMA_TABLES],
  )) as Array<{ t: string }>).map((r) => r.t);
  const columns = ((await db.$queryRawUnsafe(
    `SELECT table_name::text AS "t", column_name::text AS "c" FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = ANY($1::text[]) AND column_name = ANY($2::text[])`,
    [...new Set(HOUSE_SCHEMA_COLUMNS.map(([t]) => t))],
    [...new Set(HOUSE_SCHEMA_COLUMNS.map(([, c]) => c))],
  )) as Array<{ t: string; c: string }>).map((r) => ({ table: r.t, column: r.c }));
  let seeds: { control: number; runtime: number } | null = null;
  if (tables.includes("HouseBotControl") && tables.includes("HouseBotRuntime")) {
    const row = ((await db.$queryRawUnsafe(
      `SELECT (SELECT count(*) FROM "HouseBotControl" WHERE "id" = 'global')::int AS "control",
              (SELECT count(*) FROM "HouseBotRuntime" WHERE "key" = 'global')::int AS "runtime"`,
    )) as Array<{ control: number; runtime: number }>)[0];
    seeds = { control: Number(row?.control ?? 0), runtime: Number(row?.runtime ?? 0) };
  }
  return { tables, columns, seeds };
}

/** Pure: the state a probe answer means. */
export function schemaStateFrom(answer: Awaited<ReturnType<Probe>>): HouseSchemaState {
  const missingTables = HOUSE_SCHEMA_TABLES.filter((t) => !answer.tables.includes(t));
  const missingColumns = HOUSE_SCHEMA_COLUMNS.filter(([t, c]) => !answer.columns.some((x) => x.table === t && x.column === c)).map(([t, c]) => `${t}.${c}`);
  const seeded = !!answer.seeds && answer.seeds.control === 1 && answer.seeds.runtime === 1;
  return { ready: missingTables.length === 0 && missingColumns.length === 0 && seeded, missingTables, missingColumns, seeded, probeFailed: false };
}

export async function houseBotSchemaReady(opts: { probe?: Probe } = {}): Promise<HouseSchemaState> {
  if (!opts.probe && !hasDatabase()) return { ready: true, missingTables: [], missingColumns: [], seeded: true, probeFailed: false };
  if (!opts.probe && globalThis.__50PICK_HOUSE_SCHEMA_READY?.ready) return globalThis.__50PICK_HOUSE_SCHEMA_READY;
  let state: HouseSchemaState;
  try {
    state = schemaStateFrom(await (opts.probe ?? probeDatabase)());
  } catch (e) {
    console.error("[house-bot] schema probe failed — treating the house schema as NOT ready:", (e as Error)?.message ?? e);
    state = { ready: false, missingTables: [], missingColumns: [], seeded: false, probeFailed: true };
  }
  if (!opts.probe) globalThis.__50PICK_HOUSE_SCHEMA_READY = state;
  return state;
}
