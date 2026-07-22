/**
 * Trusted-source registry cleanup: normalise every domain to its registrable
 * form (strip scheme/path/leading "www.") and merge duplicate (category+domain)
 * rows into ONE, preserving enabled state (a group stays enabled if ANY member
 * was enabled). Read-only DRY RUN by default — set APPLY=1 to write, inside a
 * transaction. Connects via DATABASE_URL (point it at the Railway public proxy).
 *
 * Matches src/lib/server/source-registry.ts normalizeDomain() exactly.
 */
import { PrismaClient } from "@prisma/client";

const APPLY = process.env.APPLY === "1";
const norm = (s) => (s ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

const prisma = new PrismaClient();
try {
  const rows = await prisma.trustedSource.findMany();
  // Group by category + normalised domain.
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.category}::${norm(r.domain)}`;
    (groups.get(key) ?? groups.set(key, []).get(key)).push(r);
  }

  const updates = []; // { id, from, to, enabledFrom, enabledTo }
  const deletes = []; // { id, domain, category, label }
  let finalCount = 0;

  for (const [key, list] of groups) {
    finalCount++;
    const [category, ndomain] = key.split("::");
    const anyEnabled = list.some((r) => r.enabled);
    // Survivor: prefer enabled, then earliest addedAt, then lowest id.
    const survivor = [...list].sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      const at = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      return at !== 0 ? at : String(a.id).localeCompare(String(b.id));
    })[0];
    if (survivor.domain !== ndomain || survivor.enabled !== anyEnabled) {
      updates.push({ id: survivor.id, from: survivor.domain, to: ndomain, category, enabledFrom: survivor.enabled, enabledTo: anyEnabled });
    }
    for (const r of list) if (r.id !== survivor.id) deletes.push({ id: r.id, domain: r.domain, category, label: r.label });
  }

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${rows.length} rows → ${finalCount} after cleanup\n`);
  console.log(`Domain/enabled updates (${updates.length}):`);
  for (const u of updates) console.log(`   [${u.category}] ${u.from}  →  ${u.to}${u.enabledFrom !== u.enabledTo ? `  (enabled ${u.enabledFrom}→${u.enabledTo})` : ""}`);
  console.log(`\nDuplicate rows to delete (${deletes.length}):`);
  for (const d of deletes) console.log(`   [${d.category}] ${d.domain}  · ${d.label}`);

  if (APPLY) {
    await prisma.$transaction([
      ...updates.map((u) => prisma.trustedSource.update({ where: { id: u.id }, data: { domain: u.to, enabled: u.enabledTo } })),
      ...deletes.map((d) => prisma.trustedSource.delete({ where: { id: d.id } })),
    ]);
    const after = await prisma.trustedSource.count();
    console.log(`\n✓ Applied. TrustedSource now has ${after} rows.`);
  } else {
    console.log(`\n(dry run — no changes written. Re-run with APPLY=1 to commit.)`);
  }
} finally {
  await prisma.$disconnect();
}
