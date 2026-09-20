/**
 * THE NEVER LIST, MADE OF CODE — what a purge may never reach, and why prose was not enough.
 *
 * ═══ 🔴 THE DEFECT THIS MODULE EXISTS FOR, MEASURED 2026-09-20 ═══
 *
 * `chain-purge.ts` opened with a NEVER list naming fourteen tables, eight of them the house-bot
 * tables (04 A20: *"The house tables go on the chain-purge NEVER list"*). `grep -c "HouseBot"
 * src/lib/server/chain-purge.ts` returned **1** — the comment itself was the only occurrence in
 * the file. Nothing in the code enforced it. The only thing that bit at all was
 * `chain-purge.test.mts` §5, a source scan over a HAND-WRITTEN array of six model names:
 * `position`, `transaction`, `ledgerEntry`, `housePoolLedger`, `auditLog`, `upDownObservation`.
 * The eight house names were in the docblock, in the register and in nothing else.
 *
 * ⛔ AND A HAND-WRITTEN ARRAY WOULD HAVE BEEN THE WEAKER FIX. Adding eight strings to that array
 * closes today's gap and hands tomorrow's to the next table: the ninth house table is added to
 * the schema, nobody remembers this file, and the purge can reach it while every suite is green.
 * `docs/FAILURE-INVENTORY.md`'s recurring shape — a list that must be hand-extended is an
 * instrument that reports on itself.
 *
 * ═══ ⭐ SO THE POPULATION IS DERIVED, BY ONE RULE READ BY TWO INSTRUMENTS ═══
 *
 * `deriveHouseFamily()` is the rule, and it is a pure function of a model list. A model is in the
 * house family when ANY of these holds:
 *
 *   ① its NAME begins with `HouseBot` — the family as it is named today;
 *   ② it declares the soft foreign key `houseBotId`. ⭐ THIS IS THE ONE THAT MATTERS, because it
 *     is the idiom this schema actually uses: `HouseBotEvent`, `HouseBotIntent`, `HouseBotTarget`
 *     and `HouseBotPress` all carry `houseBotId` as a bare `String` with NO Prisma relation
 *     (`schema.prisma:2157` states it outright — *"houseBotId is a soft reference with no FK"*),
 *     and so do `Position` and `Transaction`, which carry the house marker on every money row.
 *     A rule that looked only for relations would have seen almost none of this subsystem;
 *   ③ it declares a relation field whose TYPE is already in the family — iterated to a fixed
 *     point, so a table hanging off a house table is caught at any depth.
 *
 * Two instruments read that one rule:
 *
 *   · **At runtime** — `Prisma.dmmf.datamodel.models`, the generated client's own model list.
 *     A new house table is protected the moment the client is regenerated, with no edit here.
 *   · **In the gate** — `parsePrismaModels(readFileSync("prisma/schema.prisma"))`, the file a
 *     developer actually edits. This one bites BEFORE `prisma generate` has run, which is the
 *     whole window in which a new table would otherwise slip through.
 *
 * ⛔ THE UNION ONLY EVER GROWS, so no derivation can silently lower the floor. `isProtectedModel`
 * is `STATUTORY_MODELS ∪ HOUSE_FAMILY_FLOOR ∪ /^HouseBot/ ∪ dmmfHouseFamily()`. If the DMMF is
 * absent or shaped differently in a future client, protection falls back on the pinned floor and
 * the prefix — never below them — and `test:chain-purge` §10 asserts the floor is still a SUBSET
 * of what the schema derives, so a floor that went stale is a failing assertion, not a quiet hole.
 *
 * ═══ ⚠️ SCOPE — THIS IS THE PURGE'S NEVER LIST, NOT A GLOBAL BAN ═══
 *
 * `HouseBotAlertOnce` is on the list AND is deleted every night by `retention.purge.daily`, and
 * both are correct: 04 A20 keeps bots, events and intents for 7 years and gives the alert
 * THROTTLE rows 30 days, *"deleted by `retention.purge.daily` in batches of 5,000"*. A reader who
 * meets the two facts without this paragraph concludes one of them is a bug. The NEVER list means
 * *no chain purge may destroy these*; retention's own published, audited schedule is a different
 * authority, and `guardProtectedModels` is applied to the purge's client only.
 *
 * ═══ WHAT THE GUARD ACTUALLY STOPS ═══
 *
 * `guardProtectedModels(client)` returns a proxy that REFUSES every mutating call on a protected
 * model — `create`, `createMany`, `update`, `updateMany`, `upsert`, `delete`, `deleteMany` — and
 * allows every read, because a purge is entitled to COUNT the statutory record it must not touch.
 * It also refuses raw execution outright (`$executeRaw*`, `$queryRaw*`, `$runCommandRaw`): raw SQL
 * names tables as strings and would walk straight past a per-model proxy, and the purge uses none.
 * `$transaction(fn)` re-wraps the interactive client it hands the callback, so the bypass is not
 * one refactor away.
 */
import { Prisma } from "@prisma/client";

/**
 * The six statutory singletons. ⛔ NOT A FAMILY AND NOT DERIVABLE: they are named one at a time
 * because each is on the list for its own reason — POCA Cap 423 §16 for the money rows, the HMAC
 * chain for `AuditLog`, and `@@unique([assetId, boundaryAt])` sharing across the 5/15/30-minute
 * chains for `UpDownObservation`. There is no property of the schema that picks out exactly these
 * six, so inventing one would be a derivation that looked principled and was a coincidence.
 */
export const STATUTORY_MODELS = [
  "Position",
  "Transaction",
  "LedgerEntry",
  "HousePoolLedger",
  "AuditLog",
  "UpDownObservation",
] as const;

/** The name prefix the house family uses today (rule ①). */
export const HOUSE_MODEL_PREFIX = "HouseBot";

/** The soft foreign key the house subsystem hangs off, with no Prisma relation (rule ②). */
export const HOUSE_SOFT_KEY = "houseBotId";

/**
 * ⭐ A FLOOR, NOT A LIST. These eight are what the rule derives from `prisma/schema.prisma` today;
 * they are pinned so that a DMMF that ever comes back empty cannot silently narrow the guard to
 * nothing. §10 asserts this set is a SUBSET of what the schema derives — so it can never be a
 * stale, wrong answer standing in for a live one. Growth happens through the two derivations; this
 * only stops a collapse.
 */
export const HOUSE_FAMILY_FLOOR = [
  "HouseBot",
  "HouseBotControl",
  "HouseBotRuntime",
  "HouseBotAlertOnce",
  "HouseBotEvent",
  "HouseBotIntent",
  "HouseBotTarget",
  "HouseBotPress",
] as const;

/** The shape both readers reduce to, so ONE rule can be applied to a generated client and to text. */
export type ModelShape = {
  name: string;
  /**
   * Every field's name and declared type (a scalar, or another model's name), plus the two
   * properties clause ③ turns on: whether it is a LIST, and whether this model OWNS the relation
   * (it carries the foreign key — `@relation(fields: […])` in the schema, `relationFromFields` in
   * the DMMF).
   */
  fields: ReadonlyArray<{ name: string; type: string; isList?: boolean; ownsRelation?: boolean }>;
};

/**
 * THE RULE. Pure, total, and the only place the three clauses are written down.
 *
 * 🔴 CLAUSE ③ FOLLOWS ONLY A SINGULAR RELATION THE MODEL OWNS, AND THAT WAS LEARNED BY WATCHING
 * IT FAIL. The first version followed any field whose type was in the family, and the DMMF adds
 * the BACK-relation of every relation: `User` carries `houseBots HouseBot[]`, so `User` joined the
 * family, and then every model with a `user User` field joined — `Comment` included. The guard
 * would have refused the purge's OWN `comment.deleteMany`, which is to say it would have refused
 * the purge. ⭐ §9's positive control is what caught it; the thirteen "this table is refused"
 * assertions above it all passed HARDER while the feature was broken. A back-relation is the
 * schema saying *"something else points at me"*, which is the opposite of belonging to it.
 *
 * ⚠️ THE FIXED POINT IS BOUNDED BY THE MODEL COUNT, not by a magic number: each pass can only add
 * models, so at most `models.length` passes can change anything. A `while (changed)` with no bound
 * would hang on a malformed input; a hard-coded `for (i < 3)` would silently stop deriving at
 * depth 4. The bound is the population itself.
 */
export function deriveHouseFamily(models: ReadonlyArray<ModelShape>): string[] {
  const family = new Set<string>();
  for (const m of models) {
    if (m.name.startsWith(HOUSE_MODEL_PREFIX)) family.add(m.name);
    else if (m.fields.some((f) => f.name === HOUSE_SOFT_KEY)) family.add(m.name);
  }
  for (let pass = 0; pass < models.length; pass++) {
    let grew = false;
    for (const m of models) {
      if (family.has(m.name)) continue;
      if (m.fields.some((f) => f.ownsRelation === true && f.isList !== true && family.has(f.type))) {
        family.add(m.name);
        grew = true;
      }
    }
    if (!grew) break;
  }
  return [...family].sort();
}

/**
 * A minimal `schema.prisma` reader — model blocks and their `<name> <Type>` field lines.
 *
 * ⛔ IT IGNORES `///` AND `//` LINES. Every house model documents its own soft keys in prose
 * (`/// COUNTER → trigger position id · FILL/OPENER → marketId …`), so a parser that read comments
 * would find `marketId` and `houseBotId` inside sentences and derive a family out of paragraphs —
 * `reference_tailwind_scans_comments`'s shape, arriving through a schema instead of a class name.
 */
export function parsePrismaModels(schema: string): ModelShape[] {
  const models: ModelShape[] = [];
  let current: ModelShape | null = null;
  for (const raw of schema.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("//")) continue;
    if (current === null) {
      const open = /^model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/.exec(line);
      if (open) current = { name: open[1], fields: [] };
      continue;
    }
    if (line === "}") { models.push(current); current = null; continue; }
    if (line.startsWith("@@")) continue;
    // `label String`, `bot HouseBot @relation(fields: [botId], …)`, `note String?`, `pools Json[]`.
    const field = /^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)(\[\])?/.exec(line);
    if (field) {
      (current.fields as { name: string; type: string; isList: boolean; ownsRelation: boolean }[]).push({
        name: field[1],
        type: field[2],
        isList: field[3] === "[]",
        // ⛔ `@relation(` ALONE IS NOT OWNERSHIP. The back-relation side may carry a NAMED
        // `@relation("x")` with no `fields:`, and following it is exactly the sweep that clause ③
        // was fixed for. The foreign key is what makes a model belong to what it points at.
        ownsRelation: /@relation\(\s*[^)]*\bfields\s*:/.test(line),
      });
    }
  }
  return models;
}

/**
 * The house family as the GENERATED CLIENT sees it. Memoised, and it never throws: a client
 * without a `dmmf` (a future `--no-engine` build, a mocked module in a unit test) yields an empty
 * array, and the union in `isProtectedModel` keeps the floor and the prefix. ⛔ It can only ever
 * ADD to the protection; there is no path by which this returning `[]` removes a table.
 */
let dmmfFamily: string[] | null = null;
export function dmmfHouseFamily(): string[] {
  if (dmmfFamily) return dmmfFamily;
  try {
    type DmmfField = { name: string; type: string; isList?: boolean; relationFromFields?: readonly string[] };
    const models: ReadonlyArray<{ name: string; fields?: ReadonlyArray<DmmfField> }> | undefined = (Prisma as unknown as {
      dmmf?: { datamodel?: { models?: ReadonlyArray<{ name: string; fields?: ReadonlyArray<DmmfField> }> } };
    }).dmmf?.datamodel?.models;
    dmmfFamily = models
      ? deriveHouseFamily(models.map((m) => ({
          name: m.name,
          fields: (m.fields ?? []).map((f) => ({
            name: f.name,
            type: f.type,
            isList: f.isList === true,
            // The owning side is the only one the DMMF gives a non-empty `relationFromFields`.
            ownsRelation: Array.isArray(f.relationFromFields) && f.relationFromFields.length > 0,
          })),
        })))
      : [];
  } catch {
    dmmfFamily = [];
  }
  return dmmfFamily;
}

/** ⚠️ Test-only: the memo is process-lifetime, and a case that feeds a fixture must be able to clear it. */
export function __resetDmmfFamilyMemo(): void { dmmfFamily = null; }

/**
 * The NEVER list, rendered from the code rather than typed into a comment. `test:chain-purge` §12
 * holds `chain-purge.ts`'s docblock to this exact set, so the prose cannot drift from the guard
 * again — which is the defect this whole module was written for.
 */
export function neverList(): string[] {
  return [...new Set<string>([...STATUTORY_MODELS, ...HOUSE_FAMILY_FLOOR, ...dmmfHouseFamily()])].sort();
}

/** `houseBotIntent` → `HouseBotIntent`. Prisma lower-cases only the first character of a model name. */
function modelOfAccessor(accessor: string): string {
  return accessor.charAt(0).toUpperCase() + accessor.slice(1);
}

/**
 * ⭐ THE PREDICATE, and it is a RULE rather than a membership test against one array. Accepts
 * either spelling — the model name (`HouseBotIntent`) or the client accessor (`houseBotIntent`).
 */
export function isProtectedModel(name: string): boolean {
  const model = modelOfAccessor(name);
  const lower = model.toLowerCase();
  if (model.startsWith(HOUSE_MODEL_PREFIX)) return true;
  if ((STATUTORY_MODELS as readonly string[]).some((m) => m.toLowerCase() === lower)) return true;
  if ((HOUSE_FAMILY_FLOOR as readonly string[]).some((m) => m.toLowerCase() === lower)) return true;
  return dmmfHouseFamily().some((m) => m.toLowerCase() === lower);
}

/**
 * Every Prisma delegate method that CHANGES a row. ⚠️ `createManyAndReturn` and
 * `updateManyAndReturn` are here because they exist on current clients and a reader scanning for
 * "the delete methods" would leave two writes open.
 */
export const MUTATING_METHODS: readonly string[] = [
  "create", "createMany", "createManyAndReturn",
  "update", "updateMany", "updateManyAndReturn",
  "upsert", "delete", "deleteMany",
];

/**
 * ⛔ RAW EXECUTION IS REFUSED OUTRIGHT, not filtered. A per-model proxy cannot see a table named
 * inside a SQL string, and `$queryRawUnsafe("DELETE FROM \"HouseBotIntent\"")` is a perfectly
 * ordinary thing for a future edit to reach for. The purge calls none of these, so refusing the
 * whole class costs nothing and closes the only bypass the proxy structurally cannot police.
 */
export const RAW_METHODS: readonly string[] = [
  "$executeRaw", "$executeRawUnsafe", "$queryRaw", "$queryRawUnsafe", "$runCommandRaw",
];

export class PurgeProtectedTableError extends Error {
  constructor(message: string) { super(message); this.name = "PurgeProtectedTableError"; }
}

function refuseModel(model: string, method: string): never {
  throw new PurgeProtectedTableError(
    `chain-purge: ${model}.${method}() is refused — ${model} is on the purge's NEVER list ` +
    `(the statutory record and the house tables, 04 A20 / POCA Cap 423 §16). The purge may READ ` +
    `these tables and may never write them. If a new house table belongs outside this rule, that ` +
    `is an owner decision, not a code change.`,
  );
}

function refuseRaw(method: string): never {
  throw new PurgeProtectedTableError(
    `chain-purge: ${method}() is refused — raw SQL names tables as strings and walks past the ` +
    `per-model guard. Use the typed delegates, which the guard can see.`,
  );
}

/**
 * Wrap a Prisma client so the purge CANNOT reach a protected table, whatever anyone writes next.
 *
 * ⚠️ THE RETURNED PROMISE IS THE REAL ONE. The proxy binds and calls the original method and
 * returns its result untouched, so a delegate call is still a genuine `PrismaPromise` and
 * `$transaction([...])` — which inspects them — keeps working. Wrapping the result would have
 * broken every batch in this file while every unit assertion still passed.
 */
export function guardProtectedModels<T>(client: T): T {
  if (client === null || typeof client !== "object") return client;
  const target = client as unknown as Record<string, unknown>;
  const delegateCache = new Map<string, unknown>();

  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop !== "string") return Reflect.get(obj, prop, receiver);

      if (RAW_METHODS.includes(prop)) return () => refuseRaw(prop);

      if (prop === "$transaction") {
        const original = Reflect.get(obj, prop, receiver);
        if (typeof original !== "function") return original;
        return (...args: unknown[]) => {
          const [first, ...rest] = args;
          if (typeof first === "function") {
            const fn = first as (tx: unknown) => unknown;
            // ⛔ The interactive client is wrapped too. Without this, one refactor from the array
            // form to `$transaction(async (tx) => …)` hands back an unguarded client and the whole
            // guard is gone with no assertion able to see it.
            return (original as (...a: unknown[]) => unknown).call(obj, (tx: unknown) => fn(guardProtectedModels(tx)), ...rest);
          }
          return (original as (...a: unknown[]) => unknown).apply(obj, args);
        };
      }

      const value = Reflect.get(obj, prop, receiver);
      if (prop.startsWith("$") || prop.startsWith("_") || value === null || typeof value !== "object") return value;
      if (!isProtectedModel(prop)) return value;

      const cached = delegateCache.get(prop);
      if (cached) return cached;
      const model = modelOfAccessor(prop);
      const guardedDelegate = new Proxy(value as Record<string, unknown>, {
        get(deleg, method, delegReceiver) {
          if (typeof method === "string" && MUTATING_METHODS.includes(method)) {
            return () => refuseModel(model, method);
          }
          const m = Reflect.get(deleg, method, delegReceiver);
          return typeof m === "function" ? (m as (...a: unknown[]) => unknown).bind(deleg) : m;
        },
      });
      delegateCache.set(prop, guardedDelegate);
      return guardedDelegate;
    },
  }) as unknown as T;
}
