/**
 * RBAC runtime — the SERVER-ONLY half of role-based admin access. The pure model
 * (domains, roles, the route→domain map, the default matrix) lives in `roles.ts`;
 * this file is the DB-backed grant loader + the action guards that read it.
 *
 * Grant resolution:
 *   • ADMIN (Owner)  → bypasses the table entirely: all view + all act. Can never
 *                      be locked out by a bad grant edit.
 *   • other staff    → the DB `RoleDomainGrant` row for (role, domain) if present,
 *                      else the code `DEFAULT_GRANTS` fallback (`defaultGrant`).
 *
 * The in-memory `overrides` map is, in production (DATABASE_URL set), a cache of the
 * table hydrated on first read and updated in place on every write; with no DB (unit
 * tests, local dev) it is the AUTHORITATIVE store, so an edit still takes effect for
 * the process without a redeploy — the same contract the live cache provides.
 *
 * Kept dependency-light on purpose (only `./prisma` + `./roles`) so the model is unit-
 * testable under tsx with no Next runtime. The action GUARDS that read this
 * (`requireStaff`/`requireOwner`) live in `rbac-guard.ts` with the Next/session deps.
 */
import { hasDatabase, prisma } from "./prisma";
import {
  ADMIN_DOMAINS,
  EDITABLE_ROLES,
  STAFF_ROLES,
  DOMAIN_LABEL,
  DOMAIN_SUMMARY,
  ROLE_LABEL,
  defaultGrant,
  isStaffRole,
  READ_CLASSES,
  canRead,
  isMaskable,
  type AdminDomain,
  type Grant,
  type Role,
  type ReadClass,
  type ReadCell,
} from "./roles";

type GrantKey = `${Role}:${AdminDomain}`;

/** See the file header: cache in DB mode, authoritative store in no-DB mode. */
let overrides: Map<GrantKey, Grant> | null = null;

async function loadOverrides(): Promise<Map<GrantKey, Grant>> {
  if (overrides) return overrides;
  const m = new Map<GrantKey, Grant>();
  if (hasDatabase()) {
    const client = prisma();
    if (client) {
      try {
        const rows = await client.roleDomainGrant.findMany();
        for (const r of rows) {
          m.set(`${r.role}:${r.domain}` as GrantKey, { canView: r.canView, canAct: r.canAct });
        }
      } catch (err) {
        // A load failure must not open the gate — an empty map means every role
        // falls back to DEFAULT_GRANTS, which is the safe seed matrix.
        console.error("[rbac] load grants failed:", (err as Error)?.message ?? err);
      }
    }
  }
  overrides = m;
  return m;
}

/** Drop the cache so the next read re-hydrates from the DB. In no-DB mode this is
 *  a NO-OP — the in-memory overrides are the store and must survive. */
export function invalidateGrantsCache(): void {
  if (hasDatabase()) overrides = null;
}

/** Test-only reset (no-DB): clears the in-memory store back to pure defaults. */
export function __resetGrantsForTest(): void {
  overrides = new Map();
}

function effectiveGrant(store: Map<GrantKey, Grant>, role: Role, domain: AdminDomain): Grant {
  if (role === "ADMIN") return { canView: true, canAct: true };
  return store.get(`${role}:${domain}` as GrantKey) ?? defaultGrant(role, domain);
}

/** The full grant map for a role. ADMIN ⇒ all-true (bypass). */
export async function roleGrants(role: Role): Promise<Record<AdminDomain, Grant>> {
  const store = await loadOverrides();
  const out = {} as Record<AdminDomain, Grant>;
  for (const d of ADMIN_DOMAINS) out[d] = effectiveGrant(store, role, d);
  return out;
}

export async function canView(role: Role, domain: AdminDomain): Promise<boolean> {
  if (role === "ADMIN") return true;
  return effectiveGrant(await loadOverrides(), role, domain).canView;
}

export async function canAct(role: Role, domain: AdminDomain): Promise<boolean> {
  if (role === "ADMIN") return true;
  return effectiveGrant(await loadOverrides(), role, domain).canAct;
}

/** The set of domains a role may VIEW — feeds the nav filter. */
export async function viewableDomains(role: Role): Promise<Set<AdminDomain>> {
  const store = await loadOverrides();
  const s = new Set<AdminDomain>();
  for (const d of ADMIN_DOMAINS) if (effectiveGrant(store, role, d).canView) s.add(d);
  return s;
}

/** Plain-language "what each staff role can see/do" — computed from the LIVE grants
 *  (so it reflects any /admin/roles edits). Feeds the consequence highlighting on
 *  /admin/staff. Keyed by role; includes ADMIN (Owner = everything). */
export async function staffRoleInfos(): Promise<
  Record<string, { role: string; label: string; view: string[]; act: { label: string; act: string }[]; sensitive: boolean }>
> {
  const store = await loadOverrides();
  const out: Record<string, { role: string; label: string; view: string[]; act: { label: string; act: string }[]; sensitive: boolean }> = {};
  for (const role of STAFF_ROLES) {
    const view: string[] = [];
    const act: { label: string; act: string }[] = [];
    let sensitive = false;
    for (const d of ADMIN_DOMAINS) {
      const g = effectiveGrant(store, role, d);
      if (g.canView) view.push(DOMAIN_LABEL[d]);
      if (g.canAct) {
        act.push({ label: DOMAIN_LABEL[d], act: DOMAIN_SUMMARY[d].act });
        if (d === "accounting" || d === "compliance") sensitive = true;
      }
    }
    out[role] = { role, label: ROLE_LABEL[role], view, act, sensitive };
  }
  return out;
}

/** The effective matrix for the editable (non-Owner) staff roles — feeds /admin/roles. */
export async function getGrantMatrix(): Promise<Record<string, Record<AdminDomain, Grant>>> {
  const store = await loadOverrides();
  const out: Record<string, Record<AdminDomain, Grant>> = {};
  for (const role of EDITABLE_ROLES) {
    const row = {} as Record<AdminDomain, Grant>;
    for (const d of ADMIN_DOMAINS) row[d] = effectiveGrant(store, role, d);
    out[role] = row;
  }
  return out;
}

/** Persist one (role, domain) grant. Refuses ADMIN (never stored — Owner bypasses). */
export async function setRoleGrant(
  role: Role,
  domain: AdminDomain,
  canViewNext: boolean,
  canActNext: boolean,
  actorId: string,
): Promise<void> {
  if (role === "ADMIN") throw new Error("The Owner's access is fixed and cannot be edited.");
  const store = await loadOverrides();
  store.set(`${role}:${domain}` as GrantKey, { canView: canViewNext, canAct: canActNext });
  if (hasDatabase()) {
    const client = prisma();
    if (client) {
      await client.roleDomainGrant.upsert({
        where: { role_domain: { role, domain } },
        create: { role, domain, canView: canViewNext, canAct: canActNext, updatedBy: actorId },
        update: { canView: canViewNext, canAct: canActNext, updatedBy: actorId },
      });
    }
  }
}

/** Reset the whole matrix to code defaults (delete every override row). */
export async function resetRoleGrantsToDefaults(): Promise<void> {
  const store = await loadOverrides();
  store.clear();
  if (hasDatabase()) {
    const client = prisma();
    if (client) {
      try {
        await client.roleDomainGrant.deleteMany({});
      } catch (err) {
        console.error("[rbac] reset grants failed:", (err as Error)?.message ?? err);
      }
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * READ_TIERS runtime — the DB-backed half of the SECOND axis (docs/READ-TIERS.md).
 *
 * ⭐ IT LIVES HERE, BESIDE THE DOMAIN GRANTS, AND NOT IN A MODULE OF ITS OWN. The
 * design's §6 says two permission SCREENS is how two permission MODELS are born; the
 * same is true of two permission modules. One loader, one cache, one invalidation
 * path — so `rbac-census.cjs` can print both matrices and neither can drift.
 *
 * ⛔ THE ONE DELIBERATE DIFFERENCE FROM `roleGrants` ABOVE: there is NO ADMIN
 * short-circuit. `roleGrants` bypasses the table for ADMIN so a bad grant edit can
 * never lock the Owner out of the console — correct, because that is about REACHING a
 * route. Ruling D3 makes the READ axis the opposite: ADMIN resolves through the table
 * like everyone else, because ADMIN is the only account that exists on production and a
 * masking rule ADMIN skipped would have no possible witness. ⚠️ An ADMIN cannot lock
 * itself out with a bad READ edit either — the worst case is dots where a figure was,
 * and `/admin/roles` is reached through the DOMAIN axis, which still bypasses.
 * ──────────────────────────────────────────────────────────────────────────── */

type ReadKey = `${Role}:${ReadClass}`;

/** See the file header: cache in DB mode, authoritative store in no-DB mode. */
let readOverrides: Map<ReadKey, ReadCell> | null = null;

const READ_CLASS_SET = new Set<string>(READ_CLASSES);
const READ_CELL_SET = new Set<string>(["read", "masked", "none"]);

/**
 * Is this (readClass, cell) pair one the axis recognises?
 *
 * ⭐ ONE DEFINITION, TWO CALL SITES — the DB loader and the writer. They must agree: a value
 * the writer refuses but the loader accepts would let a row written by any other means (a
 * migration, a console, a future importer) grant a read the code would never have stored.
 * ⛔ Exported so it can be TESTED DIRECTLY. The loader's copy of this decision only runs when
 * DATABASE_URL is set, so a suite that could not reach it would leave the DB path unguarded —
 * and the DB path is the one an attacker or a bad migration actually reaches.
 */
export function isStorableReadOverride(readClass: string, cell: string): boolean {
  return READ_CLASS_SET.has(readClass) && READ_CELL_SET.has(cell);
}

async function loadReadOverrides(): Promise<Map<ReadKey, ReadCell>> {
  if (readOverrides) return readOverrides;
  const m = new Map<ReadKey, ReadCell>();
  if (hasDatabase()) {
    const client = prisma();
    if (client) {
      try {
        const rows = await client.roleReadGrant.findMany();
        for (const r of rows) {
          // ⛔ FAIL CLOSED ON ANYTHING UNRECOGNISED. `readClass` and `cell` are TEXT
          // columns (see the schema comment for why they are not enums), so the DB
          // cannot reject a typo for us. A row naming a class we do not know, or a cell
          // value we do not know, is DISCARDED — the role then falls back to the code
          // default for that class. ⚠️ Discarding is the safe direction: keeping it
          // would mean an unrecognised string decided whether a balance is readable.
          if (!isStorableReadOverride(r.readClass, r.cell)) continue;
          m.set(`${r.role}:${r.readClass}` as ReadKey, r.cell as ReadCell);
        }
      } catch (err) {
        // A load failure must not open the axis — an empty map means every role falls
        // back to DEFAULT_READ_GRANTS, which is the safe seed matrix.
        console.error("[rbac] load read grants failed:", (err as Error)?.message ?? err);
      }
    }
  }
  readOverrides = m;
  return m;
}

/** Drop the read-grant cache so the next read re-hydrates from the DB. NO-OP with no
 *  DB, where the in-memory map is the store and must survive. */
export function invalidateReadGrantsCache(): void {
  if (hasDatabase()) readOverrides = null;
}

/** Test-only reset (no-DB): clears the in-memory read store back to pure defaults. */
export function __resetReadGrantsForTest(): void {
  readOverrides = new Map();
}

/** The resolved row for a role: every class, override-or-default. */
export async function roleReadGrants(role: Role): Promise<Record<ReadClass, ReadCell>> {
  const store = await loadReadOverrides();
  const out = {} as Record<ReadClass, ReadCell>;
  for (const cls of READ_CLASSES) {
    out[cls] = canRead(role, cls, store.get(`${role}:${cls}` as ReadKey) ?? null);
  }
  return out;
}

/** THE question a surface asks. ⚠️ Async because it may hydrate the cache — the pure
 *  `canRead` in roles.ts is the same decision without the DB, for unit tests and for
 *  a caller that has already loaded the row. */
export async function readCell(role: Role, cls: ReadClass): Promise<ReadCell> {
  const store = await loadReadOverrides();
  return canRead(role, cls, store.get(`${role}:${cls}` as ReadKey) ?? null);
}

/** May this role reveal the raw value? ⭐ The property that actually separates roles —
 *  at rest they all render the same dots (§4c). */
export async function mayReveal(role: Role, cls: ReadClass): Promise<boolean> {
  return (await readCell(role, cls)) === "read";
}

/** The whole matrix for the /admin/roles editor. */
export async function getReadMatrix(): Promise<Record<string, Record<ReadClass, ReadCell>>> {
  const out: Record<string, Record<ReadClass, ReadCell>> = {};
  for (const role of STAFF_ROLES) out[role] = await roleReadGrants(role);
  return out;
}

/**
 * Set one cell. ⚠️ ADMIN IS EDITABLE HERE, unlike the domain matrix (`EDITABLE_ROLES`
 * excludes it). That is ruling D3 again: if ADMIN's read row could not be changed, the
 * axis would have a permanently-exempt role and §4c's "masked at rest for everyone"
 * would be untrue for the one account that exists.
 */
export async function setRoleReadGrant(
  role: Role,
  cls: ReadClass,
  cell: ReadCell,
  actorId?: string,
): Promise<void> {
  // ⚠️ `isStaffRole` rather than `STAFF_ROLES.includes` — tsc rejected the latter because
  // `Role` is wider than the staff tuple, and the narrowing helper already exists in roles.ts.
  // A hand-rolled cast here would have silenced a correct complaint.
  if (!isStaffRole(role)) throw new Error(`not a staff role: ${role}`);
  if (!isStorableReadOverride(cls, cell)) throw new Error(`not a storable read grant: ${cls}=${cell}`);
  // ⛔ A class with no masked form cannot be set to `masked` — that cell would be legal,
  // mean nothing, and hide a support agent's own working data behind dots.
  if (cell === "masked" && !isMaskable(cls)) {
    throw new Error(`"${cls}" has no masked form — use "read" or "none"`);
  }
  const store = await loadReadOverrides();
  store.set(`${role}:${cls}` as ReadKey, cell);
  if (hasDatabase()) {
    const client = prisma();
    if (client) {
      await client.roleReadGrant.upsert({
        where: { role_readClass: { role, readClass: cls } },
        create: { role, readClass: cls, cell, updatedBy: actorId },
        update: { cell, updatedBy: actorId },
      });
    }
  }
}

/** Reset the read matrix to code defaults (delete every override row). */
export async function resetRoleReadGrantsToDefaults(): Promise<void> {
  const store = await loadReadOverrides();
  store.clear();
  if (hasDatabase()) {
    const client = prisma();
    if (client) await client.roleReadGrant.deleteMany({});
  }
}
