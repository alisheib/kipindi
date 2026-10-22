/**
 * A SEEDED WEEK OPENS AND CLOSES ON THE CONFIG'S OWN TIME — the dev seeds (`src/app/api/dev-test/**`; DESIGN_AUTHORITY §M8a
 * item 24). MASWALI-BUILD S5 round 2, the lead's read of the integrated tiles.
 *
 *   npx tsx scripts/maswali-seed-clock.test.mts        (npm run test:maswali-seed-clock)
 *
 * 🔴 The seeds opened each week a minute after its drafted open and closed it a minute after its close, so the tiles read
 * "Jumatatu 00:01" on the strip beside the no-week body's "Jumatatu 00:00" (the config's template), and "18:01" for a
 * close the product makes at 18:00 — times the product would not draw.
 *   §1 EVERY SEED: each `openWeek` a dev route calls opens at the drafted week's own `opensAt`, and each `closeWeek` (but an
 *      early one) closes at its own `closesAt` — nothing added (read from each route's syntax tree).
 *   §2 AS SEEDED (the value): `seed-maswali` run in memory on a fresh store — every week it opened carries the config's
 *      open, every week it closed the config's close, and each reads in Swahili as the no-week body reads the template.
 *   §3 PLANT: a route's minute put back is caught by §1.
 * ⛔ Production is untouched: each route still answers 404 there before anything else (`test:cert-devroutes`). This
 *    suite runs the seed in THIS process's in-memory store (no database, no server) and writes nothing to disk.
 */
// ⛔ IMPORT ORDER IS THE CONTRACT: the stores pick memory or Postgres on first import, so the environment comes first and
// every server module is imported after it.
delete process.env.DATABASE_URL;
delete process.env.USE_PRISMA_DAL;
process.env.FEATURE_MILLIONEA = "ACTIVE";
process.env.MASWALI_SCHEDULER = "false";
process.env.LIFECYCLE_TICKER = "false";
const { readFileSync, readdirSync, statSync } = await import("node:fs");
const { join, relative } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const ts = (await import("typescript")).default;

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const raw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const j = (v: unknown) => JSON.stringify(v);
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s}`);

/* ══ §1 · EVERY SEED ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§1 · every dev route opens a week at its drafted open and closes it at its drafted close");
const DEV = "src/app/api/dev-test";
const routes = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((e) => {
  const rel = `${dir}/${e}`;
  return statSync(join(ROOT, rel)).isDirectory() ? routes(rel) : e === "route.ts" ? [rel] : [];
});
const ROUTES = routes(DEV);
/** Each `openWeek(…)` / `closeWeek(…)` call with a `now`, and whether that `now` is exactly the drafted time. */
const clockCalls = (rel: string, src: string) => {
  const out: Array<{ rel: string; call: string; now: string; exact: boolean }> = [];
  const tree = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (n: import("typescript").Node) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === "openWeek" || n.expression.text === "closeWeek")) {
      const arg = n.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        const prop = (name: string) => arg.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === name) as import("typescript").PropertyAssignment | undefined;
        const now = prop("now"), early = prop("early");
        const field = n.expression.text === "openWeek" ? "opensAt" : "closesAt";
        if (now && !(early && early.initializer.kind === ts.SyntaxKind.TrueKeyword)) {
          const text = now.initializer.getText(tree);
          out.push({ rel, call: n.expression.text, now: text, exact: new RegExp(`^new Date\\(Date\\.parse\\([\\w.]+\\.${field}\\)\\)$`).test(text) });
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(tree);
  return out;
};
const census = (readAt: (rel: string) => string) => ROUTES.flatMap((r) => clockCalls(r, readAt(r)));
const calls = census(raw);
const opens = calls.filter((c) => c.call === "openWeek"), closes = calls.filter((c) => c.call === "closeWeek");
const off = calls.filter((c) => !c.exact).map((c) => `${c.rel}: ${c.call} at ${c.now}`);
console.log(`  ${ROUTES.length} dev routes; ${opens.length} opens in ${new Set(opens.map((c) => c.rel)).size} routes, ${closes.length} closes`);
ok(`1.1 · every open a dev seed makes is at the drafted week's own open, every close at its own close — nothing added (${opens.length} opens, ${closes.length} closes)`,
  opens.length >= 4 && closes.length >= 5 && off.length === 0, off.join(" | "));

/* ══ §2 · AS SEEDED ════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§2 · seed-maswali, run in memory: every week opens on the config's open and closes on its close");
type Week = { code: string; state: string; opensAt: string; closesAt: string; closedAt: string | null; visibility: string };
const quiet = console.log;
console.log = (...a: unknown[]) => { if (typeof a[0] === "string" && a[0].startsWith("[audit]")) return; quiet(...a); };
const route = await import("../src/app/api/dev-test/seed-maswali/route.ts");
const res = await route.POST();
console.log = quiet;
const body = await res.json() as { ok?: boolean; error?: string };
if (!body.ok) throw new Error(`PREMISE ABSENT — seed-maswali answered ${res.status}: ${body.error}`);
const { weekStore } = await import("../src/lib/server/maswali-dal.ts");
const { getMaswaliConfig } = await import("../src/lib/server/maswali-config.ts");
const { eatWeekAt, eatWeekStartMs } = await import("../src/lib/eat-day.ts");
const { eatWeekdayClock } = await import("../src/components/maswali/maswali-format.ts");
const { dict } = await import("../src/lib/i18n-dict.ts");
const cfg = getMaswaliConfig();
const weeks = (await weekStore.list({ visibility: "PUBLIC" })) as unknown as Week[];
const sw = dict.sw;
const rows = weeks.map((w) => {
  const start = eatWeekStartMs(Date.parse(w.closesAt));
  const open = eatWeekAt(start, cfg.openWeekday, cfg.openAt), close = eatWeekAt(start, cfg.closeWeekday, cfg.closeAt);
  return { code: w.code, state: w.state, opens: Date.parse(w.opensAt), open, closed: w.closedAt ? Date.parse(w.closedAt) : null, close,
    reads: eatWeekdayClock(sw, Date.parse(w.opensAt)), template: eatWeekdayClock(sw, open), closeReads: w.closedAt ? eatWeekdayClock(sw, Date.parse(w.closedAt)) : null };
});
for (const r of rows) console.log(`  ${r.code} ${r.state}: opens "${r.reads}" (the template's "${r.template}")${r.closeReads ? `, closed "${r.closeReads}"` : ""}`);
const opened = rows.filter((r) => r.state !== "DRAFT"), closed = rows.filter((r) => r.closed !== null);
ok(`2.1 · every week the seed opened (${opened.length}) carries the config's open, and reads as the no-week body reads the template ("${opened[0]?.template}")`,
  opened.length >= 5 && opened.every((r) => r.opens === r.open && r.reads === r.template), j(opened.filter((r) => r.opens !== r.open)));
ok(`2.2 · every week the seed closed (${closed.length}) carries the config's close ("${closed[0]?.closeReads}")`,
  closed.length >= 4 && closed.every((r) => r.closed === r.close), j(closed.filter((r) => r.closed !== r.close)));

/* ══ §3 · PLANT ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§3 · a route's minute put back is caught");
const SEED = `${DEV}/seed-maswali/route.ts`;
const minuteBack = (rel: string) => rel === SEED ? raw(rel).replace("now: new Date(Date.parse(w.opensAt)) });", "now: new Date(Date.parse(w.opensAt) + 60_000) });") : raw(rel);
ok("3.1 PLANT · seed-maswali's open a minute late again: §1 reports it",
  minuteBack(SEED) !== raw(SEED) && census(minuteBack).some((c) => c.rel === SEED && !c.exact));

console.log(`\n${"═".repeat(70)}\n  MASWALI SEED CLOCK: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run printed. */
const MIN_ASSERTIONS = 4;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
