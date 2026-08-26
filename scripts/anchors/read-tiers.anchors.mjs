/**
 * THE ANCHORS `red:read-tiers` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * READ_TIERS (docs/READ-TIERS.md) is the second permission axis: "may this role read this
 * FIELD?" Its whole value is that it REFUSES things, and a refusal is the easiest property in
 * software to assert vacuously — so each mutation below is a way the axis could look correct
 * and protect nothing.
 *
 * ⭐ RULING D3 IS ATTACKED TWICE, ON PURPOSE, BECAUSE IT CAN BE UNDONE AT TWO LAYERS.
 * `admin-exempted` puts the bypass in the pure model (`roles.ts`); `runtime-admin-bypass` puts
 * it in the DB-backed resolver (`rbac.ts`). ⚠️ The second is the likelier accident: the DOMAIN
 * resolver a few lines above it legitimately DOES short-circuit ADMIN — so a bad reviewer would
 * see the read resolver "missing" that line and helpfully add it. ADMIN is the only account that
 * exists on production, so either version leaves the masking rule with no possible observer.
 *
 * ⭐ AND `nothing-is-readable` IS THE POSITIVE CONTROL, in mutation form. A tier where no role
 * can read anything satisfies every refusal in the suite. If §2's same-role controls were ever
 * deleted, this mutation would sail through and the axis would be indistinguishable from a
 * feature that simply broke the page.
 *
 * ⚠️ `fails-open` is the one that is invisible in review: `?? "none"` and `?? "read"` differ by
 * one word, and the second turns an unknown role into a fully-privileged one.
 *
 * ⚠️ `validator-accepts-anything` guards the path nothing else can reach. `readClass` and `cell`
 * are TEXT columns — a Prisma enum cannot hold the dot in `money.figures`, and inventing
 * MONEY_FIGURES beside it would give one class two names — so the DATABASE cannot reject a typo.
 * One function stands between a bad row (a migration, a console edit, an importer) and a granted
 * read, and it is shared by the loader and the writer so the two can never disagree.
 *
 * ── THE FOURTEEN, BY LAYER ─────────────────────────────────────────
 * ⚠️ This list said EIGHT while the file carried fourteen — a header that counts its own data
 * and then stops being maintained. Keep it in step or delete it; a stale census is worse than none.
 *
 *   roles.ts (pure model)   support-reads-money · admin-exempted · nothing-is-readable ·
 *                           fails-open · everything-is-maskable
 *   rbac.ts  (runtime)      runtime-admin-bypass · validator-accepts-anything ·
 *                           masked-on-unmaskable-allowed
 *   player page (surface)   email-rendered-raw · region-rendered-raw
 *   roles editor            read-action-refuses-admin · editor-forgets-player-revalidate ·
 *                           server-trusts-the-greying
 *   reveal action (D4)      reveal-is-not-audited
 *
 * ⚠️ SINGLE-LINE ANCHORS; no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const ROLES = "src/lib/server/roles.ts";
const RBAC = "src/lib/server/rbac.ts";
const PLAYER_PAGE = "src/app/admin/players/[id]/page.tsx";
const ROLES_ACTIONS = "src/app/admin/roles/actions.ts";
const PLAYER_ACTIONS = "src/app/admin/players/actions.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "support-reads-money",
    why: "⭐ the single cell the whole design turns on. SUPPORT's `money.figures` goes from `masked` to `read`, so a support agent may reveal any player's standing balance — the exact shape of the audit finding this unit cites: a role scoped to one domain handed another domain's facts because they share a route",
    file: ROLES,
    suite: "read-tiers",
    from: `    "money.figures": "masked",`,
    to: `    "money.figures": "read",`,
    expect: "2.4 D1 · ⭐ SUPPORT reads `money.figures` as `masked`",
  },
  {
    name: "admin-exempted",
    why: "🔴 ruling D3 undone. `canRead` short-circuits ADMIN to `read` before consulting the table or any override — the same bypass the DOMAIN axis legitimately has. The masking rule then has no possible witness, because ADMIN is the only account on production",
    file: ROLES,
    suite: "read-tiers",
    from: `  return override ?? defaultReadGrant(role, cls);`,
    to: `  if (role === "ADMIN") return "read";\n  return override ?? defaultReadGrant(role, cls);`,
    expect: "2.1 D3 · ADMIN resolves through the TABLE",
  },
  {
    name: "nothing-is-readable",
    why: "⛔ THE OVER-CORRECTION, and the reason the suite carries same-role positive controls. `isReadable` always returns false, so no role can read any field. Every refusal assertion in §2 is satisfied and the axis protects everything by breaking everything",
    file: ROLES,
    suite: "read-tiers",
    from: `  return canRead(role, cls, override) !== "none";`,
    to: `  return false;`,
    expect: "2.6 ⭐ POSITIVE CONTROL (same role) · SUPPORT still reads `history.activity` IN FULL",
  },
  {
    name: "fails-open",
    why: "⚠️ one word. An unrecognised role falls back to `read` instead of `none`, so any future role — or a typo in a role string — is born fully privileged rather than blind. A permission axis must fail closed",
    file: ROLES,
    suite: "read-tiers",
    from: `  return row?.[cls] ?? "none";`,
    to: `  return row?.[cls] ?? "read";`,
    expect: "3.1 an unknown role reads NOTHING",
  },
  {
    name: "everything-is-maskable",
    why: "`isMaskable` returns true for every class, so `history.activity` acquires a masked form it has no useful definition for. A cell of `masked` on it would then be legal, mean nothing, and hide a support agent's own working data behind dots",
    file: ROLES,
    suite: "read-tiers",
    from: `export function isMaskable(cls: ReadClass): boolean {`,
    to: `export function isMaskable(cls: ReadClass): boolean {\n  if (cls) return true;`,
    expect: "1.4 `history.activity` is NOT maskable",
  },
  {
    name: "runtime-admin-bypass",
    why: "🔴 ruling D3 undone at the RUNTIME layer rather than the model layer, which is the likelier place for it to be reintroduced by accident — the DOMAIN resolver a few lines above legitimately DOES short-circuit ADMIN, so copying that pattern down looks like consistency. It makes ADMIN's read row unreachable and the masking rule unwitnessable by the only account on production",
    file: RBAC,
    suite: "read-tiers",
    from: `  return canRead(role, cls, store.get(\`\${role}:\${cls}\` as ReadKey) ?? null);`,
    to: `  if (role === "ADMIN") return "read";\n  return canRead(role, cls, store.get(\`\${role}:\${cls}\` as ReadKey) ?? null);`,
    expect: "5.3 D3 · ⭐ ADMIN's read row is EDITABLE",
  },
  {
    name: "validator-accepts-anything",
    why: "⛔ the shared validator returns true for every pair, so a `readClass` of any string at all is loaded from the DB and honoured. `readClass` and `cell` are TEXT columns — a Prisma enum cannot hold a dot — so nothing between a bad row and a granted read except this function",
    file: RBAC,
    suite: "read-tiers",
    from: `  return READ_CLASS_SET.has(readClass) && READ_CELL_SET.has(cell);`,
    to: `  return true;`,
    expect: "5.12 ⛔ the DB-row validator accepts every legal pair and NOTHING else",
  },
  {
    name: "masked-on-unmaskable-allowed",
    why: "the guard that refuses `masked` on a class with no masked form is disabled, so `history.activity` can be set to a value that is legal, means nothing, and hides a support agent's own working data behind dots — the over-correction arriving one cell at a time instead of all at once",
    file: RBAC,
    suite: "read-tiers",
    from: `  if (cell === "masked" && !isMaskable(cls)) {`,
    to: `  if (false) {`,
    expect: "5.9 ⛔ `masked` is refused on a class with NO masked form",
  },
  {
    name: "email-rendered-raw",
    why: "\u26d4 the header goes back to rendering the address itself. This is the ONLY exposure unit K actually closes on this page (\u00a71a: three of \u00a71's five claims were already gated by the DOMAIN axis), so if this mutation is not caught, the unit's entire delivered value is unguarded",
    file: PLAYER_PAGE,
    suite: "player-page-reads",
    from: `                  <Sensitive field="email" subjectId={id} value={user.email} />`,
    to: `                  {user.email}`,
    expect: "1.8 \u2b50 the header's email resolves through <Sensitive>",
  },
  {
    name: "region-rendered-raw",
    why: "the region goes back to a bare render. \u26a0\ufe0f It is the quieter of the two and the likelier to be reintroduced by someone tidying a ternary they read as noise \u2014 and for SUPPORT the cell is 'none', so the correct behaviour is that the field VANISHES rather than being masked",
    file: PLAYER_PAGE,
    suite: "player-page-reads",
    from: `{user.region ? <Sensitive field="region" subjectId={id} value={user.region} /> : "\u2014"}`,
    to: `{user.region ?? "\u2014"}`,
    expect: "1.9 \u2b50 \u2026and so does the region",
  },
  {
    name: "read-action-refuses-admin",
    why: "\ud83d\udd34 ruling D3 undone at the THIRD layer \u2014 the editor. The model and the runtime are both guarded, but an author looking only at this file sees the DOMAIN action a few lines above refusing ADMIN and adds the same line here \u201cfor consistency\u201d. The Owner's read row then becomes uneditable, the matrix acquires a permanently exempt role, and \u00a74c's \u201cmasked at rest for everyone\u201d is untrue for the only account on production",
    file: ROLES_ACTIONS,
    suite: "read-tiers",
    from: `  const cell = String(formData.get("cell") ?? "");`,
    to: `  const cell = String(formData.get("cell") ?? "");\n  if (role === "ADMIN") return { ok: false, error: "The Owner's reads are fixed." };`,
    expect: "6.2 \u2b50 D3 \u00b7 the DOMAIN action refuses ADMIN and the READ action does NOT",
  },
  {
    name: "editor-forgets-player-revalidate",
    why: "\u26a0\ufe0f the save stops revalidating the surface it governs. The officer flips a cell, opens a player, sees the OLD masking from the router cache, and concludes the feature does not work \u2014 a bug that presents as a broken permission model and is really a stale route. The editor and the page it controls are different routes",
    file: ROLES_ACTIONS,
    suite: "read-tiers",
    from: `    // concludes the matrix does not work.\n    revalidatePath("/admin/players/[id]", "page");`,
    to: `    // concludes the matrix does not work.`,
    expect: "6.4 \u26a0\ufe0f saving a read cell revalidates the PLAYER page too",
  },
  {
    name: "server-trusts-the-greying",
    why: "the server stops refusing \u2018masked\u2019 on a class with no masked form, leaving only the greyed-out option in the UI to prevent it. A control that greys what the server would still accept is the defect, not the fix \u2014 and a modified client reaches the server directly",
    file: ROLES_ACTIONS,
    suite: "read-tiers",
    from: `  if (cell === "masked" && !isMaskable(readClass as ReadClass)) {`,
    to: `  if (false) {`,
    expect: "6.6 \u26d4 the SERVER refuses `masked` on a class with no masked form",
  },
  {
    name: "reveal-is-not-audited",
    why: "\ud83d\udd34 ruling D4 deleted. The reveal still returns the address and every other assertion stays green \u2014 this is the mutation \u00a75 named and nobody wrote, so until now the ONLY thing standing behind D4 was a live query with no run boundary, which passed on a row an earlier run had written",
    file: PLAYER_ACTIONS,
    suite: "read-tiers",
    from: `  await audit({`,
    to: `  if (false) await audit({`,
    expect: "6.9 \u26d4 D4 \u00b7 the reveal AWAITS an audit row",
  },
];
