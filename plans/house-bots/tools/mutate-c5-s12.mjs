// ⛔ RECORD ONLY (2026-09-17): the C5 steps 1-2 harness, already run (75/75 red). Its paths name Ali-Blade15 and a removed
// worktree. Commit 5's closing batch (C5-D20-REPLAN.md §3, C5-8) builds its own harness and runs only surviving mutations.
// Mutation runner for house-bots C5 steps 1-2. Runs against a TEMPORARY worktree only (never the main worktree).
//   node mutate-c5-s12.mjs check                 validate every mutation's anchors (apply + restore, no suite)
//   node mutate-c5-s12.mjs show M10              apply one mutation, print the changed lines, restore
//   node mutate-c5-s12.mjs baseline reportsMem,dsar   run unmutated baselines for those runs
//   node mutate-c5-s12.mjs run M1,M2             run mutations (their baselines must already be recorded green)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const WT = process.env.MUT_WT ?? "C:/kipindi-hb-mut5a";
const SCR = "C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/7d164087-6ebf-48ed-9538-2d18bae5d991/scratchpad/mut5";
const TAG = process.env.MUT_TAG ?? "a";
fs.mkdirSync(SCR, { recursive: true });
const BASH = "C:/Program Files/Git/bin/bash.exe";
const LOCK = "/c/Users/Ali/heavy-node-lock.sh";

const RUNS = {
  reportsMem: { cmd: ["npx", "tsx", "scripts/lib/house-bot-reports-cases.mts"], env: { HB_MONEY_STORE: "memory", DATABASE_URL: "", USE_PRISMA_DAL: "false" }, green: (r) => r.exit === 0 && r.fails.length === 0 },
  reportsNoPg: { cmd: ["npx", "tsx", "scripts/house-bot-reports.test.mts"], env: { VERIFY_DATABASE_URL: "" }, green: (r) => r.exit === 3 && r.fails.length === 0 && /PASS 0\.mem · /.test(r.out) },
  reports: { cmd: ["npm", "run", "--silent", "test:house-bot-reports"], env: {}, green: (r) => r.exit === 0 && r.fails.length === 0 && /ALL PASS — test:house-bot-reports/.test(r.out) },
  money: { cmd: ["npm", "run", "--silent", "test:house-bot-money"], env: {}, green: (r) => r.exit === 0 && r.fails.length === 0 && /ALL PASS — test:house-bot-money/.test(r.out) },
  moneyMem: { cmd: ["npx", "tsx", "scripts/lib/house-bot-money-cases.mts"], env: { HB_MONEY_STORE: "memory", DATABASE_URL: "", USE_PRISMA_DAL: "false" }, green: (r) => r.exit === 0 && r.fails.length === 0 },
  // Sections 10 and 11 only: the suite's floor lines (0.mem / 0.pg) fail by design on a filtered run; nothing else may.
  engine: { cmd: ["npm", "run", "--silent", "test:house-bot-engine"], env: { HB_ENGINE_SECTIONS: "10,11" }, green: (r) => r.fails.every((l) => /^FAIL 0\.(mem|pg) · /.test(l)) && /PASS \[postgres\] 10\.10 · /.test(r.out) && /PASS \[memory\] 11\.17b · /.test(r.out) },
  dsar: { cmd: ["npm", "run", "--silent", "test:dsar-secrets"], env: {}, green: (r) => r.exit === 0 && r.fails.length === 0 && /DSAR EXPORT SECRETS: \d+ passed, 0 failed/.test(r.out) },
  dal: { cmd: ["npm", "run", "--silent", "test:dal-parity"], env: {}, green: (r) => r.exit === 0 && r.fails.length === 0 && /dal-parity: \d+ passed, 0 failed/.test(r.out) },
  disclosure: { cmd: ["npm", "run", "--silent", "test:house-bot-disclosure"], env: {}, green: (r) => r.exit === 0 && r.fails.length === 0 && /ALL PASS — house-bot-disclosure/.test(r.out) },
  // No build exists in the temporary worktree: the controls run first, then NOT MEASURED (exit 2). Only the control is read.
  bundle: { cmd: ["node", "scripts/verify-house-bot-bundle.mjs"], env: {}, green: (r) => r.exit === 2 && /^PASS control · /m.test(r.out) && r.fails.length === 0 },
};

const ENGINE_H = "src/lib/server/house-bot/engine-health.ts";
const US = "src/lib/server/user-service.ts";
const PRIV = "src/lib/server/privacy.ts";
const ROUTE = "src/app/api/health/route.ts";
const VOC = "scripts/lib/house-bot-vocabulary.mjs";
const BUNDLE = "scripts/verify-house-bot-bundle.mjs";
const DISC = "scripts/house-bot-disclosure.test.mts";
const HV = "scripts/house-bot-holder-view-shots.mts";
const DSAR = "scripts/dsar-export-secrets.test.mts";
const RC = "scripts/lib/house-bot-reports-cases.mts";
const STRIPPED = `["houseBotId", "intentId", "houseStake", "houseStakes", "houseBots", "houseBotNotificationsRedacted"]`;
const strippedWithout = (k) => STRIPPED.replace(`"${k}", `, "").replace(`, "${k}"]`, "]");

const both = (run, id) => [{ run, id, store: "memory" }, { run, id, store: "postgres" }];
const mem = (run, id) => ({ run, id, store: "memory" });
const pg = (run, id) => ({ run, id, store: "postgres" });
const one = (run, id) => ({ run, id });
const txt = (run, text) => ({ run, text });

const M = {
  M1: { edits: [{ file: "src/lib/server/house-bot/designation.ts", from: `  return voidHouseConsent({ userId: holderUserId, cause: "HOLDER_WITHDREW", actorId: holderUserId });\n}`, to: `  return voidHouseConsent({ userId: holderUserId, cause: "HOLDER_WITHDREW", actorId: holderUserId });\n}\nexport function stopForHolder(bot: { userId: string }) { return voidHouseConsent({ userId: bot.userId, cause: "HOLDER_WITHDREW", actorId: bot.userId }); }` }],
    expect: [mem("reportsMem", "0.170.1")] },
  M2: { edits: [{ file: "src/app/profile/account/actions.ts", from: `import { audit } from "@/lib/server/audit";`, to: `import { audit } from "@/lib/server/audit";\nimport { withdrawHouseConsent } from "@/lib/server/house-bot/designation";` },
    { file: "src/app/profile/account/actions.ts", append: `export async function stopAction() { const s = await currentSession(); return withdrawHouseConsent(s!.userId); }\n` }],
    expect: [mem("reportsMem", "0.170.2")] },
  M3: { edits: [{ file: "src/lib/server/house-bot/designation.ts", from: `cause: "HOLDER_WITHDREW", actorId: holderUserId });`, to: `cause: "HOLDER_WITHDREW", actorId: null });` }],
    expect: [mem("reportsMem", "0.170.3"), ...both("money", "1.14d")] },
  M4: { edits: [{ file: PRIV, from: `    transactions: txns.map(dsarTxnView),`, to: `    transactions: txns,` }],
    expect: [mem("reportsMem", "0.169.privacy.ts"), ...both("money", "1.14b"), pg("money", "1.14c"),
      txt("dsar", "⛔ the officer bundle carries the row but not the future column"), txt("dsar", "⛔ D19 · the officer bundle carries no house marker")] },
  M5: { edits: [{ file: US, from: `(await db.txn.findByUser(userId, 1000)).map(dsarTxnView),`, to: `(await db.txn.findByUser(userId, 1000)).map(({ houseBotId: _m, ...row }) => row),` }],
    expect: [mem("reportsMem", "0.169.user-service.ts"), txt("dsar", "⛔ the player export carries the row but not the future column"), txt("dsar", "the player export and the officer bundle expose an IDENTICAL transaction field set")] },
  M6: { edits: [{ file: PRIV, from: `    pendingNotifiedAt: t.pendingNotifiedAt,\n`, to: `` }],
    expect: [...both("money", "1.14"), ...both("money", "1.14b"), txt("dsar", "the player export and the officer bundle expose an IDENTICAL transaction field set")] },
  M7: { edits: [{ file: PRIV, from: `    pendingNotifiedAt: t.pendingNotifiedAt,\n  };`, to: `    pendingNotifiedAt: t.pendingNotifiedAt,\n    houseBotId: t.houseBotId,\n  };` }],
    expect: [...both("money", "1.14"), ...both("money", "1.14b"), pg("money", "1.14c"), txt("dsar", "⛔ D19 · the player export carries no house marker"), txt("dsar", "⛔ D19 · the officer bundle carries no house marker")] },
  M8: { edits: [{ file: PRIV, from: `    providerStatus: t.providerStatus,`, to: `    providerStatus: t.providerStatus ?? null,` }],
    expect: [mem("moneyMem", "1.14.eq")] },
  M9: { edits: [{ file: PRIV, from: `export function dsarTxnView(t: StoredTxn) {\n  return {\n`, to: `export function dsarTxnView(t: StoredTxn) {\n  return { ...t, id: t.id };\n  return {\n` }],
    expect: [txt("dsar", "⛔ dsarTxnView itself drops a column it has never heard of"), ...both("money", "1.14")] },
  M10: { edits: [{ file: PRIV, from: `"completedAt", "idempotencyKey", "pendingNotifiedAt",\n] as const;`, to: `"completedAt", "idempotencyKey", "pendingNotifiedAt", "ledgerGroupId",\n] as const;` },
    { file: PRIV, from: `    pendingNotifiedAt: t.pendingNotifiedAt,\n  };`, to: `    pendingNotifiedAt: t.pendingNotifiedAt,\n    ledgerGroupId: (t as { ledgerGroupId?: string }).ledgerGroupId,\n  };` }],
    expect: [...both("money", "1.14.keys"), ...both("money", "1.14"), txt("dsar", "DSAR_TXN_KEYS is exactly origin/main's 23 transaction keys"), txt("dsar", "the player export and the officer bundle expose an IDENTICAL transaction field set")] },
  M11: { edits: [{ file: US, from: `getAuditForActorDurable(userId, { limit: 1000, excludeActions: OWN_AUDIT_EXCLUDED_ACTIONS })`, to: `getAuditForActorDurable(userId, { limit: 1000 })` }],
    expect: [...both("money", "1.14d.1")] },
  M12: { edits: [{ file: US, from: `getAuditForActorDurable(userId, { limit, excludeActions: OWN_AUDIT_EXCLUDED_ACTIONS })`, to: `getAuditForActorDurable(userId, { limit })` }],
    expect: [...both("money", "1.14d.1"), ...both("money", "1.14f.1"), ...both("money", "1.14f.2")] },
  M13: { edits: [{ file: US, from: `[...Object.keys(HOUSE_AUDIT), ...HOUSE_REPORT_AUDIT_ACTIONS];`, to: `[...Object.keys(HOUSE_AUDIT)];` }],
    expect: [...both("money", "1.14f.1"), ...both("money", "1.14f.2")] },
  M14: { edits: [{ file: "src/lib/server/reports/house-report-ids.ts", from: `["house-liquidity", "house-market-statement"]`, to: `["house-liquidity-report", "house-market-statement"]` }],
    expect: [...both("money", "1.14f.1"), ...both("money", "1.14f.2")] },
  M15: { edits: [{ file: "src/lib/server/audit.ts",
    from: `    const all = [...ring].filter((e) => e.actorId === actorId && !excluded.has(e.action)).reverse();\n    return { entries: all.slice(0, limit), total: all.length, truncated: all.length > limit };`,
    to: `    const all = [...ring].filter((e) => e.actorId === actorId).reverse();\n    return { entries: all.slice(0, limit).filter((e) => !excluded.has(e.action)), total: all.length, truncated: all.length > limit };` }],
    expect: [mem("moneyMem", "1.14f.1"), one("dal", "14.ring")] },
  M16: { edits: [{ file: "src/lib/server/audit.ts", from: `: { actorId };\n  const total = await db.auditLog.count({ where });`, to: `: { actorId };\n  const total = await db.auditLog.count({ where: { actorId } });` }],
    expect: [pg("money", "1.14f.1"), one("dal", "14.prisma")] },
  M17: { edits: [{ file: "src/lib/server/audit.ts", from: `NOT: { action: { in: [...excluded] } } }`, to: `NOT: { action: { startsWith: "house_bot." } } }` }],
    expect: [one("dal", "14.exact"), one("dal", "14.prisma"), pg("money", "1.14f.1"), pg("money", "1.14f.2")] },
  M18: { edits: [{ file: US, from: STRIPPED, to: strippedWithout("houseStake") }], expect: [...both("money", "1.14e")] },
  M19: { edits: [{ file: US, from: STRIPPED, to: strippedWithout("houseStakes") }], expect: [...both("money", "1.14e")] },
  M20: { edits: [{ file: US, from: STRIPPED, to: strippedWithout("intentId") }], expect: [...both("money", "1.14.audit")] },
  M21: { edits: [{ file: US, from: STRIPPED, to: strippedWithout("houseBots") }], expect: [...both("reports", "3.2")] },
  M22: { edits: [{ file: US, from: STRIPPED, to: strippedWithout("houseBotNotificationsRedacted") }], expect: [...both("reports", "3.2")] },
  M23: { edits: [{ file: US, from: `const exportedReason = (reason: unknown): unknown =>\n  typeof reason === "string" && reason.startsWith("house_") ? (HOUSE_REASON_EXPORTED_AS[reason] ?? "refused") : reason;`, to: `const exportedReason = (reason: unknown): unknown => reason;` }],
    expect: [...both("reports", "3.2")] },
  M24: { edits: [{ file: US, from: `HOUSE_REASON_EXPORTED_AS: Readonly<Record<string, string>> = { house_bot_live: "not_erasable" };`, to: `HOUSE_REASON_EXPORTED_AS: Readonly<Record<string, string>> = {};` }],
    expect: [...both("reports", "3.2")] },
  M25: { edits: [{ file: US, from: `  return withoutHouseAuditKeys(await getAuditForActorDurable(userId, { limit, excludeActions: OWN_AUDIT_EXCLUDED_ACTIONS }));`, to: `  return getAuditForActorDurable(userId, { limit, excludeActions: OWN_AUDIT_EXCLUDED_ACTIONS });` }],
    expect: [...both("reports", "3.3")] },
  M26: { edits: [{ file: ROUTE, from: `import { houseBotSchemaReady } from "@/lib/server/house-bot/schema-ready";`, to: `import { houseBotSchemaReady } from "@/lib/server/house-bot/schema-ready";\nimport { houseBotEngineHealth } from "@/lib/server/house-bot/engine";` },
    { file: ROUTE, from: `        ok: ready,\n        uptimeSec,`, to: `        ok: ready,\n        houseBots: { schemaReady: true, engine: houseBotEngineHealth() },\n        uptimeSec,` }],
    expect: [...both("engine", "10.7a"), pg("engine", "10.10")] },
  M27: { edits: [{ file: ROUTE, from: `leadership: publicLeadership(),`, to: `leadership: leadershipSnapshot(),` }], expect: [...both("engine", "10.7a"), ...both("engine", "10.7b")] },
  M28: { edits: [{ file: ROUTE, from: `const PUBLIC_LEASE_TASKS: readonly string[] = [LIFECYCLE_TASK];`, to: `const PUBLIC_LEASE_TASKS: readonly string[] = [];` }], expect: [...both("engine", "10.7b")] },
  M29: { edits: [{ file: ROUTE, from: `{ ok: false, error: "health-check-failed" },`, to: `{ ok: false, error: "health-check-failed", message: String(err) },` }], expect: [...both("reports", "11.171.4")] },
  M30: { edits: [{ file: ROUTE, from: `import { emailHealthPublic } from "@/lib/server/email";`, to: `import { emailHealth } from "@/lib/server/email";` }, { file: ROUTE, from: `email: emailHealthPublic(),`, to: `email: emailHealth(),` }],
    expect: [...both("reports", "11.171.2")] },
  M31: { edits: [{ file: "src/lib/server/email.ts", from: `export function publicFailureReason(reason: string | null): string | null {\n`, to: `export function publicFailureReason(reason: string | null): string | null {\n  return reason;\n` }],
    expect: [...both("reports", "11.171.2")] },
  M32: { edits: [{ file: "src/lib/server/email.ts", from: `const OWN_FAILURE_TEXT = ["email send timed out after ", "provider returned 2xx with no MessageID"] as const;`, to: `const OWN_FAILURE_TEXT = [] as const;` }],
    expect: [...both("reports", "11.171.3")] },
  M33: { edits: [{ file: ENGINE_H, from: `if (!viewer || !inHouseAlertAudience(viewer.role)) return null;`, to: `if (!viewer) return null;` }], expect: [...both("engine", "10.8c"), ...both("engine", "11.17c")] },
  M34: { edits: [{ file: "src/lib/server/house-bot/alerts.ts", from: `  return role === "ADMIN";`, to: `  return role === "ADMIN" || role === "COMPLIANCE";` }],
    expect: [...both("engine", "10.8c"), ...both("engine", "10.8d"), ...both("engine", "11.17c")] },
  M35: { edits: [{ file: ENGINE_H, from: `schema: await houseBotSchemaReady(),`, to: `schema: { ...(await houseBotSchemaReady()), ready: true },` }], expect: [pg("engine", "10.10")] },
  M36: { edits: [{ file: "src/lib/server/house-bot/engine.ts", from: `hookDropped: state.hook.dropped,`, to: `hookDropped: 0,` }], expect: [...both("engine", "11.17b")] },
  M37: { edits: [{ file: "src/app/admin/system/page.tsx", from: `{houseEngine && <HouseEngineCard view={houseEngine} />}`, to: `<HouseEngineCard view={houseEngine ?? { readable: false }} />` }], expect: [mem("reportsMem", "0.172.1")] },
  M38: { edits: [{ file: "src/app/admin/system/page.tsx", from: `.catch((): HouseEngineHealthView | null => null)`, to: `.catch((): HouseEngineHealthView | null => ({ readable: false }))` }], expect: [mem("reportsMem", "0.172.1")] },
  M39: { edits: [{ file: "src/app/admin/system/system-client.tsx", append: `export const ENGINE_TITLE = "House bot engine";\n` }], expect: [one("disclosure", "1.1")] },
  M40: { edits: [{ file: "src/lib/status-tone.ts", from: `export const STATUS_TONE = {\n`, to: `export const STATUS_TONE = {\n  HOUSE_BOT_ACTIVE: "success",\n` }], expect: [one("disclosure", "1.1")] },
  M41: { edits: [{ file: "src/lib/search/fields.ts", from: `    type: { columns: ["type"], kind: "exact" },\n  },\n  // Mirrors prisma-dal.ts txn.search exactly`, to: `    type: { columns: ["type"], kind: "exact" },\n    house: { columns: ["houseBotId"], kind: "exact" },\n  },\n  // Mirrors prisma-dal.ts txn.search exactly` }],
    expect: [one("disclosure", "4.1"), one("disclosure", "1.1")] },
  M42: { edits: [{ file: "src/components/ui/back-link.tsx", from: `import { I } from "@/components/ui/glyphs";\n`, to: `import { I } from "@/components/ui/glyphs";\nimport { HOUSE_REPORT_IDS } from "@/lib/server/reports/house-report-ids";\nexport const REPORT_IDS = HOUSE_REPORT_IDS;\n` }],
    expect: [one("disclosure", "4.2"), one("disclosure", "1.1")] },
  M43: { edits: [{ file: DISC, from: `.flatMap((x) => x.columns), ...(s.default ?? [])]`, to: `.flatMap((x) => x.columns)]` }], expect: [one("disclosure", "4.c5")] },
  M44: { edits: [{ file: DISC, from: `target: "es2022", charset: "utf8" }`, to: `target: "es2022" }` }], expect: [txt("disclosure", "2.v · ruling 175 · CONTROL · every planted words sample")] },
  M45: { edits: [{ file: VOC, from: `liquidity|ukwasi|流动性|house`, to: `liquidity|ukwasi|house` }],
    expect: [txt("disclosure", "2.v · ruling 175 · CONTROL · every planted words sample"), txt("bundle", "control · "), mem("reportsMem", "0.175.subset.module")] },
  M46: { edits: [{ file: VOC, from: String.raw`\bhb[iethp]?_[0-9a-f]{24}\b|\bhb:hbi_[0-9a-f]{24}\b`, to: String.raw`hb[iethp]?_[0-9a-f]{24}|hb:hbi_[0-9a-f]{24}` }],
    expect: [one("disclosure", "2.v.b"), txt("bundle", "control · ")] },
  M47: { edits: [{ file: VOC, from: String.raw`HOUSE_(?!FEE\b)[A-Z_]+`, to: `HOUSE_[A-Z_]+` }], expect: [one("disclosure", "2.v.b"), txt("bundle", "control · ")] },
  M48: { edits: [{ file: BUNDLE, from: `    ...houseHitsByFamily(relPath).map((h) => ({ where: "path", family: h.family, word: h.word, ctx: relPath })),\n`, to: `` }], expect: [txt("bundle", "control · ")] },
  M49: { edits: [{ file: BUNDLE, from: String.raw`const PRERENDERED = /\.(html|rsc|meta|body)$/;`, to: String.raw`const PRERENDERED = /\.(html|rsc|body)$/;` }], expect: [txt("bundle", "control · ")] },
  M50: { edits: [{ file: BUNDLE, from: `    { name: "public/", base: root, files: filesUnder(path.join(root, "public")) },\n`, to: `` }], expect: [txt("bundle", "control · ")] },
  M51: { edits: [{ file: BUNDLE, from: `filesUnder(path.join(next, "server", "app"), (p) => PRERENDERED.test(p))`, to: `filesUnder(path.join(next, "server", "app"), () => true)` }], expect: [txt("bundle", "control · ")] },
  M52: { edits: [{ file: BUNDLE, append: `const extra = /liquidity/gi;\n` }], expect: [mem("reportsMem", "0.175.verify-house-bot-bundle.mjs")] },
  M53: { edits: [{ file: HV, from: `import { houseHits } from "./lib/house-bot-vocabulary.mjs";`, to: `const WORDS = /liquidity|ukwasi|流动性|house[ -]?bots?|boti (?:za|ya) nyumba|平台机器人/gi;\n` + String.raw`const IDENTIFIERS = /\bhouse_[a-z]+|HOUSE_(?!FEE\b)[A-Z_]+|houseStake|houseOnly|houseBotId|HouseBot\w*/g;` },
    { file: HV, from: `    const out = houseHits(html);`, to: `    const out = [...html.matchAll(WORDS), ...html.matchAll(IDENTIFIERS)].map((m) => m[0]);` }],
    expect: [mem("reportsMem", "0.175.house-bot-holder-view-shots.mts")] },
  M54: { edits: [{ file: DSAR, from: `import { houseHits } from "./lib/house-bot-vocabulary.mjs";`, to: `const houseHits = (s: string) => [...s.matchAll(/liquidity|house[ -]?bots?/gi)].map((m) => m[0]);` }],
    expect: [mem("reportsMem", "0.175.dsar-export-secrets.test.mts"), txt("dsar", "CONTROL: houseHits finds a planted word, identifier and bounded id")] },
  M55: { edits: [{ file: DSAR, append: `const W = /dau la nyumba/i;\n` }], expect: [mem("reportsMem", "0.175.dsar-export-secrets.test.mts")] },
  M56: { edits: [{ file: HV, append: String.raw`const W = /liquidity|\w+/;` + "\n" }], expect: [mem("reportsMem", "0.175.house-bot-holder-view-shots.mts")] },
  M57: { edits: [{ file: "scripts/lib/house-bot-money-cases.mts", from: `extendHouseWords(["house", "50pick"])`, to: `/liquidity|ukwasi|house|50pick/i` }], expect: [mem("reportsMem", "0.175.subset.house-bot-money-cases.mts")] },
  M58: { edits: [{ file: "scripts/lib/house-bot-money-cases.mts", append: `const SPARE = extendHouseWords(["x"]);\n` }], expect: [mem("reportsMem", "0.175.subset.house-bot-money-cases.mts")] },
  M59: { edits: [{ file: "scripts/house-bot-seam.test.mts", from: `extendHouseWords(["houseStake", "LIQUIDITY_LINE", "liquidityLine"])`, to: `/houseStake|LIQUIDITY_LINE|liquidity|ukwasi|流动性/` }], expect: [mem("reportsMem", "0.175.subset.house-bot-seam.test.mts")] },
  M60: { edits: [{ file: RC, from: String.raw`[String.raw` + "`" + String.raw`/[\\/]house-bot[\\/]|house-bot-dal/` + "`" + "]", to: String.raw`[String.raw` + "`" + String.raw`/[\\/]house-bot[\\/]/` + "`" + "]" }],
    expect: [mem("reportsMem", "0.175.house-bot-disclosure.test.mts"), mem("reportsMem", "0.175.allow")] },
  M61: { edits: [{ file: "src/lib/server/house-bot/holder-hook.ts", append: `export const stopFor = (actorId: string) => voidHouseConsent({ userId: actorId, cause: "HOLDER_WITHDREW", actorId });\n` }], expect: [mem("reportsMem", "0.170.1")] },
  M62: { edits: [{ file: "src/lib/server/house-bot/kill-switch.ts", from: `actorId: byId,`, to: `actorId: null,` }], expect: [mem("reportsMem", "0.170.4")] },
  M63: { edits: [{ file: ENGINE_H, append: `export { withdrawHouseConsent } from "./designation";\n` }], expect: [mem("reportsMem", "0.170.2")] },
  M64: { edits: [{ file: "src/lib/server/house-bot/planner.ts", from: `engineAudit("house_bot.poison", { type: "HouseBotControl", id: HOUSE_CONTROL_ID }, `, to: `engineAudit("house_bot.poison", userId, ` }], expect: [mem("reportsMem", "0.170.1")] },
  M65: { edits: [{ file: "src/lib/server/market-service.ts", from: `{ houseBotId: ctx.botId, intentId: ctx.intentId }`, to: `{ houseBotId: ctx.botId }` }],
    expect: [...both("money", "1.14.audit.c")], alsoGreen: [...both("money", "1.14.audit")] },
  M66: { edits: [{ file: "src/lib/server/market-service.ts", from: `{ houseBotId: ctx.botId, intentId: ctx.intentId }`, to: `{ houseBotId: ctx.botId, intentId: ctx.intentId, ref: ctx.intentId }` }], expect: [...both("money", "1.14.audit")] },
  M67: { edits: [{ file: RC, from: `if (STORE === "memory") {\n  section("§0 · ruling 175`, to: `if (STORE === "none") {\n  section("§0 · ruling 175` }], expect: [one("reportsNoPg", "0.mem")] },
  M68: { edits: [{ file: RC, from: `        if (allowed) { allowedSeen.add(site.actor); continue; }`, to: `        if (site.fn && (HOLDER_ACTOR_DEBT as readonly string[]).includes(site.fn)) { debtSeen.add(site.fn); continue; }\n        if (allowed) { allowedSeen.add(site.actor); continue; }` }],
    expect: [mem("reportsMem", "0.170.c11")] },
  M69: { edits: [{ file: "src/lib/server/wallet-service.ts", from: `const priorTxn = (await db.txn.findByUser(userId, 200, { excludeHouseBets: true }))`, to: `const priorTxn = (await db.txn.findByUser(userId, 200))` }], expect: [...both("money", "11.2")] },
  M70: { edits: [{ file: "src/lib/server/wallet-service.ts", from: `const prior = (await db.txn.findByUser(userId, 200, { excludeHouseBets: true }))`, to: `const prior = (await db.txn.findByUser(userId, 200))` }], expect: [...both("money", "11.4")] },
  M71: { edits: [{ file: "src/lib/server/wallet-service.ts", from: `(await db.txn.findByUser(t.userId, 1000, { excludeHouseBets: true }))`, to: `(await db.txn.findByUser(t.userId, 1000))` }], expect: [...both("money", "11.6")] },
  M72: { edits: [{ file: "src/lib/server/affiliate-service.ts", from: `db.txn.findByUser(recruitUserId, 1000, { excludeHouseBets: true })`, to: `db.txn.findByUser(recruitUserId, 1000)` }], expect: [...both("money", "11.8")] },
  M73: { edits: [{ file: "src/lib/server/store.ts", from: `.filter((t) => t.userId === userId && (!opts?.excludeHouseBets || t.houseBotId == null)).slice(-limit).reverse(),`, to: `.filter((t) => t.userId === userId).slice(-limit).filter((t) => !opts?.excludeHouseBets || t.houseBotId == null).reverse(),` }],
    expect: ["11.5", "11.9", "11.2", "11.4", "11.6", "11.8"].map((id) => mem("moneyMem", id)).concat([one("dal", "15.memory")]) },
  M74: { edits: [{ file: "src/lib/server/prisma-dal.ts", from: `where: opts?.excludeHouseBets ? { userId, houseBotId: null } : { userId },`, to: `where: { userId },` }],
    expect: ["11.5", "11.9", "11.2", "11.4", "11.6", "11.8"].map((id) => pg("money", id)).concat([one("dal", "15.prisma")]) },
  M75: { edits: [{ file: "src/lib/server/store.ts", from: `(!opts?.excludeHouseBets || t.houseBotId == null)).slice(-limit)`, to: `(!opts?.excludeHouseBets || t.houseBotId != null)).slice(-limit)` }],
    expect: [mem("moneyMem", "11.9"), mem("moneyMem", "11.10")] },
};

const git = (...args) => spawnSync("git", ["-C", WT, ...args], { encoding: "utf8" });
function treeClean() {
  const d = git("diff", "--quiet");
  return d.status === 0;
}

function applyMutation(id) {
  const spec = M[id];
  const originals = new Map();
  const problems = [];
  for (const e of spec.edits) {
    const abs = path.join(WT, e.file);
    if (!originals.has(abs)) originals.set(abs, fs.readFileSync(abs));
    let text = fs.readFileSync(abs, "utf8");
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const conv = (s) => (eol === "\r\n" ? s.replace(/\r?\n/g, "\r\n") : s);
    if (e.append != null) {
      text = text + (text.endsWith("\n") ? "" : eol) + conv(e.append);
    } else {
      const from = conv(e.from), to = conv(e.to);
      const n = text.split(from).length - 1;
      if (n !== 1) { problems.push(`${e.file}: 'from' occurs ${n} times: ${JSON.stringify(e.from).slice(0, 120)}`); continue; }
      text = text.replace(from, () => to);
    }
    fs.writeFileSync(abs, text, "utf8");
  }
  return { originals, problems };
}
function restore(originals) {
  for (const [abs, buf] of originals) fs.writeFileSync(abs, buf);
}

function runSuite(key, label) {
  const r = RUNS[key];
  const started = Date.now();
  const res = spawnSync(BASH, [LOCK, "run", "hb-s9", ...r.cmd], {
    cwd: WT, env: { ...process.env, MSYS_NO_PATHCONV: "1", ...r.env }, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: 90 * 60_000,
  });
  const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  const secs = Math.round((Date.now() - started) / 1000);
  const logFile = path.join(SCR, `${TAG}-${label}-${key}.log`);
  fs.writeFileSync(logFile, out);
  const fails = out.split(/\r?\n/).filter((l) => /^FAIL /.test(l));
  return { key, exit: res.status, signal: res.signal, error: res.error ? String(res.error) : null, out, fails, secs, logFile };
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function lookup(run, exp) {
  const hits = [];
  for (const l of run.out.split(/\r?\n/)) {
    const m = /^(PASS|FAIL) (?:\[(memory|postgres)\] )?(.*)$/.exec(l);
    if (!m) continue;
    const [, verdict, store, rest] = m;
    if (exp.id != null && !new RegExp(`^${esc(exp.id)} · `).test(rest)) continue;
    if (exp.text != null && !rest.startsWith(exp.text)) continue;
    if (exp.store && store !== exp.store) continue;
    hits.push({ verdict, line: l.slice(0, 600) });
  }
  if (hits.length === 0) {
    const storeReached = exp.store ? new RegExp(`^(PASS|FAIL) \\[${exp.store}\\] `, "m").test(run.out) : /^(PASS|FAIL) /m.test(run.out);
    const threw = run.out.split(/\r?\n/).filter((l) => / · threw/.test(l) && (!exp.store || l.includes(`[${exp.store}]`))).map((l) => l.slice(0, 400));
    return { status: "NOT MEASURED", why: storeReached ? `store reached, assertion not printed${threw.length ? `; threw: ${threw.join(" | ")}` : ""}` : "store never reached", exit: run.exit };
  }
  const red = hits.filter((h) => h.verdict === "FAIL");
  return red.length ? { status: "RED", line: red[0].line } : { status: "GREEN", line: hits[0].line };
}
const expLabel = (e) => `${e.run}:${e.id ?? e.text}${e.store ? `[${e.store}]` : ""}`;

const BASE_FILE = path.join(SCR, `baselines-${TAG}.json`);
const RESULTS = path.join(SCR, `results-${TAG}.jsonl`);
const loadBaselines = () => (fs.existsSync(BASE_FILE) ? JSON.parse(fs.readFileSync(BASE_FILE, "utf8")) : {});

const [mode, arg = ""] = process.argv.slice(2);
if (!treeClean()) { console.log("ABORT: the temporary worktree is not clean before the run"); process.exit(9); }

if (mode === "check") {
  for (const id of Object.keys(M)) {
    const { originals, problems } = applyMutation(id);
    restore(originals);
    const clean = treeClean();
    console.log(`${id} · ${problems.length ? `ANCHOR PROBLEM: ${problems.join(" ; ")}` : "anchors ok"} · restored clean=${clean}`);
    if (!clean) { console.log("ABORT: tree dirty after restore"); process.exit(9); }
  }
} else if (mode === "show") {
  for (const id of arg.split(",")) {
    const { originals, problems } = applyMutation(id);
    const d = git("diff", "-U0");
    restore(originals);
    console.log(`== ${id} ${problems.join(" ; ")}\n${d.stdout}`);
    console.log(`restored clean=${treeClean()}`);
  }
} else if (mode === "baseline") {
  const base = loadBaselines();
  for (const key of arg.split(",")) {
    const r = runSuite(key, "baseline");
    const green = RUNS[key].green(r);
    base[key] = { green, exit: r.exit, secs: r.secs, fails: r.fails.slice(0, 20), logFile: r.logFile, at: new Date().toISOString(), head: git("rev-parse", "HEAD").stdout.trim() };
    // Every expectation of every mutation that reads this run: its line must PASS on the baseline.
    const expects = Object.entries(M).flatMap(([id, s]) => [...s.expect, ...(s.alsoGreen ?? [])].filter((e) => e.run === key).map((e) => ({ id, e })));
    base[key].targets = expects.map(({ id, e }) => ({ id, exp: expLabel(e), ...lookup(r, e) }));
    const badTargets = base[key].targets.filter((t) => t.status !== "GREEN");
    base[key].targetsGreen = badTargets.length === 0;
    fs.writeFileSync(BASE_FILE, JSON.stringify(base, null, 2));
    console.log(`BASELINE ${key} · green=${green} · exit ${r.exit} · ${r.secs}s · fails ${r.fails.length} · targets ${expects.length}, not-green ${badTargets.length} ${badTargets.map((t) => `${t.id} ${t.exp} ${t.status} ${t.why ?? ""}`).join(" ; ")} · ${r.logFile}`);
    if (!treeClean()) { console.log("ABORT: tree dirty after a baseline run"); process.exit(9); }
  }
} else if (mode === "run") {
  const base = loadBaselines();
  for (const id of arg.split(",")) {
    const spec = M[id];
    const runs = [...new Set([...spec.expect, ...(spec.alsoGreen ?? [])].map((e) => e.run))];
    const unbased = runs.filter((k) => !base[k]?.green);
    const { originals, problems } = applyMutation(id);
    let rec;
    try {
      if (problems.length) {
        rec = { id, verdict: "NOT MEASURED", why: `anchor: ${problems.join(" ; ")}` };
      } else {
        const results = {};
        for (const k of runs) results[k] = runSuite(k, id);
        const exps = spec.expect.map((e) => {
          const b = base[e.run]?.targets?.find((t) => t.id === id && t.exp === expLabel(e));
          const bOk = base[e.run]?.green && b?.status === "GREEN";
          const r = lookup(results[e.run], e);
          return { exp: expLabel(e), ...(bOk ? r : { status: "NOT MEASURED", why: `baseline not green (${base[e.run]?.green}, target ${b?.status})` }), secs: results[e.run].secs, exit: results[e.run].exit };
        });
        const also = (spec.alsoGreen ?? []).map((e) => ({ exp: expLabel(e), ...lookup(results[e.run], e) }));
        const red = exps.filter((x) => x.status === "RED");
        const green = exps.filter((x) => x.status === "GREEN");
        const verdict = red.length > 0 ? "RED" : green.length > 0 ? "MISSED" : "NOT MEASURED";
        const otherFails = Object.fromEntries(Object.entries(results).map(([k, r]) => [k, r.fails.filter((l) => !(k === "engine" && (l.startsWith("FAIL 0.mem · ") || l.startsWith("FAIL 0.pg · ")))).slice(0, 12).map((l) => l.slice(0, 300))]));
        rec = { id, verdict, expects: exps, alsoGreen: also, unbased, otherFails, logs: Object.fromEntries(Object.entries(results).map(([k, r]) => [k, r.logFile])) };
      }
    } finally {
      restore(originals);
    }
    rec.cleanAfter = treeClean();
    rec.at = new Date().toISOString();
    fs.appendFileSync(RESULTS, JSON.stringify(rec) + "\n");
    console.log(`${id} · ${rec.verdict} · ${(rec.expects ?? []).map((x) => `${x.exp} ${x.status}`).join(" ; ")}${rec.why ? ` · ${rec.why}` : ""} · clean=${rec.cleanAfter}`);
    if (!rec.cleanAfter) { console.log("ABORT: tree dirty after restore"); process.exit(9); }
  }
} else {
  console.log("usage: check | show M1,M2 | baseline run1,run2 | run M1,M2");
}
