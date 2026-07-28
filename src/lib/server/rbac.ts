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
  type AdminDomain,
  type Grant,
  type Role,
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
