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
 * ⭐ `admin-exempted` IS THE ONE THAT MATTERS MOST, and it is ruling D3 made executable. ADMIN
 * is the ONLY account that exists on production. A masking rule ADMIN skipped could never be
 * witnessed by any session anyone can open — it would be a rule with no possible observer. The
 * mutation re-introduces exactly the short-circuit `defaultGrant` (the DOMAIN axis) legitimately
 * has, and the suite must reject it HERE.
 *
 * ⭐ AND `nothing-is-readable` IS THE POSITIVE CONTROL, in mutation form. A tier where no role
 * can read anything satisfies every refusal in the suite. If §2's same-role controls were ever
 * deleted, this mutation would sail through and the axis would be indistinguishable from a
 * feature that simply broke the page.
 *
 * ⚠️ `fails-open` is the one that is invisible in review: `?? "none"` and `?? "read"` differ by
 * one word, and the second turns an unknown role into a fully-privileged one.
 *
 * ⚠️ SINGLE-LINE ANCHORS; no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const ROLES = "src/lib/server/roles.ts";

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
];
