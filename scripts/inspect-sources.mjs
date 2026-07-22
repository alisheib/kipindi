/**
 * READ-ONLY inspection of the live trusted-source registry. Prints every
 * TrustedSource row grouped by category (domain · enabled) and flags anything
 * matching "african". No writes. Connects via DATABASE_URL (injected by the
 * caller — point it at the Railway Postgres public proxy).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const rows = await prisma.trustedSource.findMany({ orderBy: [{ category: "asc" }, { domain: "asc" }] });
  const byCat = {};
  for (const r of rows) (byCat[r.category] ??= []).push(r);
  console.log(`\nTrustedSource rows: ${rows.length}\n`);
  for (const cat of Object.keys(byCat).sort()) {
    const list = byCat[cat];
    const enabledCount = list.filter((r) => r.enabled).length;
    console.log(`■ ${cat}  (${enabledCount}/${list.length} enabled)`);
    for (const r of list) {
      console.log(`   ${r.enabled ? "✓ ON " : "✗ OFF"}  ${r.domain.padEnd(28)}  ${r.label}`);
    }
  }
  const africa = rows.filter((r) => /african/i.test(r.domain) || /african/i.test(r.label));
  console.log(`\nafrican-markets matches: ${africa.length}`);
  for (const r of africa) console.log(`   category=${r.category} domain=${r.domain} enabled=${r.enabled}`);
} finally {
  await prisma.$disconnect();
}
