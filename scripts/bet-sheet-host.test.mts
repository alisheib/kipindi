/** S8 WP7: defensive seeds, durable unfinished keys and controller safety. In-process mutations; no files written. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSheetSeed } from "../src/lib/journey/sheet-seed.ts";
import { pendingIntents, pendingStorage, PENDING_STORAGE_MAX_BYTES, type StoredIntent } from "../src/lib/journey/sheet-storage.ts";
import { readMarker, stakeFromUrl } from "../src/lib/journey/pending-bet.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n"));
const HOST = read("src/components/journey/bet-sheet/bet-sheet-host.tsx");
const SHELL = read("src/components/layout/app-shell.tsx");
const LAZY = read("src/components/layout/shell-lazy.tsx");
const BOOTSTRAP = read("scripts/live/bet-sheet-prod-bootstrap.mts");
const NOW = Date.UTC(2026, 9, 13, 12);
const SEED = { v: 1, id: "mkt_sheet01", yesPool: 24_825, noPool: 50_462, rates: { feeModel: "loser-share", platformFeeRate: .03, operatorFeeRate: .1 }, feePct: 13, min: 500, max: 1_000_000, closesAt: new Date(NOW + 60_000).toISOString(), serverNow: NOW, bettable: true };
const key = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const stored = (i: number): StoredIntent => ({ quote: { marketId: `mkt_sheet${i}`, side: i % 2 ? "YES" : "NO", stake: 500 + i }, key: key(i), at: NOW - 1_000 });
type Impl = { parse: typeof parseSheetSeed; restore: typeof pendingIntents; pack: typeof pendingStorage; host: string; shell: string; lazy: string; bootstrap: string };
const REAL: Impl = { parse: parseSheetSeed, restore: pendingIntents, pack: pendingStorage, host: HOST, shell: SHELL, lazy: LAZY, bootstrap: BOOTSTRAP };
type Check = { name: string; pass: boolean };
function checks(x: Impl): Check[] {
  const result: Check[] = [];
  const ok = (name: string, pass: boolean) => result.push({ name, pass });
  ok("seed.valid", x.parse(JSON.stringify(SEED))?.id === SEED.id && x.parse({ ...SEED, rates: null, closesAt: null }) !== null);
  const bad = [null, "{", " ".repeat(4_001), { ...SEED, v: 2 }, { ...SEED, id: "round_123" }, { ...SEED, min: 0 }, { ...SEED, min: 500.1 }, { ...SEED, max: 499 }, { ...SEED, max: Number.MAX_SAFE_INTEGER + 1 }, { ...SEED, yesPool: NaN }, { ...SEED, noPool: -1 }, { ...SEED, serverNow: Infinity }, { ...SEED, bettable: "true" }, { ...SEED, closesAt: "never" }, { ...SEED, feePct: -1 }, { ...SEED, rates: { feeModel: "invented" } }, { ...SEED, rates: { feeModel: "loser-share", platformFeeRate: 1.1 } }, { ...SEED, rates: { feeModel: "loser-share", showEstimatedWinnings: "yes" } }];
  ok("seed.bad", bad.every((s) => x.parse(s) === null));

  const all = Array.from({ length: 20 }, (_, i) => stored(i + 1));
  const selected = { bet: "mkt_selected.YES.5000", at: NOW, ref: "friend", invite: "code", utm: { utm_source: "qa" } };
  const raw = x.pack(selected, all);
  const got = x.restore(raw, NOW);
  ok("storage.all-keys", got.length === 20 && all.every((s) => got.some((g) => g.key === s.key && JSON.stringify(g.quote) === JSON.stringify(s.quote))));
  ok("storage.selected", raw !== null && readMarker(raw, NOW)?.ref === "friend" && stakeFromUrl({ kind: "market", id: "mkt_selected", side: "YES", stake: 5000 }, raw, NOW) === 5000 && stakeFromUrl({ kind: "market", id: "mkt_selected", side: "YES", stake: 6000 }, raw, NOW) === null);
  const retired = x.restore(x.pack(selected, all.filter((s) => s.key !== key(4))), NOW);
  ok("storage.retire-one", retired.length === 19 && !retired.some((s) => s.key === key(4)) && retired.some((s) => s.key === key(20)));
  ok("storage.empty", x.pack(null, []) === null && x.restore(null, NOW).length === 0);
  const candidate = (overrides = {}) => ({ bet: "mkt_sheet1.YES.501", at: NOW - 1000, k: key(1), ...overrides });
  const corrupt = JSON.stringify({ ...candidate(), pending: [candidate(), candidate({ k: key(2), at: NOW - 24 * 3600_000 }), candidate({ k: key(3), at: NOW + 61_000 }), candidate({ k: "invalid" }), candidate({ k: key(5), bet: "round_123.YES.500" }), candidate({ k: key(6), bet: "mkt_sheet1.NO" }), null, {}] });
  const valid = x.restore(corrupt, NOW);
  ok("storage.validate", valid.length === 1 && valid[0].key === key(1) && x.restore("{", NOW).length === 0 && x.restore("x".repeat(PENDING_STORAGE_MAX_BYTES + 1), NOW).length === 0);
  const huge = Array.from({ length: 700 }, (_, i) => stored(i + 1));
  const full = x.pack(null, huge);
  ok("storage.no-truncation", full !== null && full.length > PENDING_STORAGE_MAX_BYTES && (JSON.parse(full).pending as unknown[]).length === huge.length);

  const h = x.host;
  const commit = h.slice(h.indexOf("const commit ="), h.indexOf("const deposit ="));
  const readKey = h.slice(h.indexOf("const readKey ="), h.indexOf("const open ="));
  const save = h.slice(h.indexOf("const save ="), h.indexOf("const stripAddress ="));
  ok("host.durable-before-send", /if \(!save\(\)\)/.test(commit) && commit.indexOf("if (!save())") < commit.indexOf("buyPositionAction(fd)") && /if \(!save\(\)\)\s*\{[\s\S]*?selected\.current = oldSelected;[\s\S]*?return;/.test(commit) && /value\.length > PENDING_STORAGE_MAX_BYTES\) return false/.test(save));
  ok("host.double-tap", /requests\.current\.has\(old\.intent\.key\)/.test(commit) && commit.indexOf("requests.current.add(chosen.key)") < commit.indexOf("startTransition") && /if \(!quote\) return/.test(commit));
  ok("host.key-read-send-time", readKey.indexOf("const readAtMs = Date.now()") >= 0 && readKey.indexOf("const readAtMs = Date.now()") < readKey.indexOf("await readTruth") && /afterKeyRead\(record\.intent, null, readAtMs\)/.test(readKey));
  ok("host.key-shape", /Object\.prototype\.hasOwnProperty\.call\(body\.me, "keyPosition"\)/.test(h) && /options\.key && body\.me\.keyPosition !== null/.test(h) && /truth\.reread\.state !== "read"\) return/.test(readKey));
  ok("host.close-and-stake-lock", /record\?\.intent\.phase === "placing"\) return/.test(h) && /intent\?\.phase !== "placing" && intent\?\.phase !== "inDoubt"/.test(h));
  ok("host.closed-receipt", /closedReceipts\.current\.set\(id, settled\)/.test(h) && /const received = closedReceipts\.current\.get\(id\)/.test(h) && /closedReceipts\.current\.delete\(id\)/.test(h) && /if \(received\) stripAddress\(dropSide\)/.test(h) && /settled: received/.test(h));
  ok("host.boundary", /class SheetBoundary extends Component/.test(h) && /<SheetBoundary[\s\S]*?<BetSheet[\s\S]*?<\/SheetBoundary>/.test(h) && /componentDidCatch/.test(h) && /\/api\/client-error/.test(h) && !/\bthrow\s+/.test(h));
  ok("host.capture-safe", /event\.defaultPrevented \|\| event\.button !== 0 \|\| event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey/.test(h) && /!seed\.bettable/.test(h) && /href\.origin !== window\.location\.origin/.test(h) && /addEventListener\("click", click, true\)/.test(h));
  ok("host.conditional-mount", /journeyShown && session && <Suspense fallback=\{null\}><LazyBetSheetHost\s*\/><\/Suspense>/.test(x.shell) && /export const LazyBetSheetHost = dynamic\(\(\) => import\("@\/components\/journey\/bet-sheet\/bet-sheet-host"\)\.then\(\(m\) => m\.BetSheetHost\)\.catch\(nothingIfLost\)\)/.test(x.lazy));
  ok("bootstrap.local-only", x.bootstrap.includes('process.env.KP_QA_MEMORY_BOOTSTRAP !== "bet-sheet-local-production"') && x.bootstrap.includes('process.env.NODE_ENV !== "production"') && x.bootstrap.includes('process.env.DATABASE_URL') && x.bootstrap.includes('!process.argv.includes("127.0.0.1")') && x.bootstrap.indexOf("throw new Error") < x.bootstrap.indexOf("await import"));
  return result;
}

const results = checks(REAL);
for (const c of results) console.log(`${c.pass ? "PASS" : "FAIL"} ${c.name}`);
let failures = results.filter((c) => !c.pass).length;
if (process.argv.includes("--prove-red")) {
  const mutants: { name: string; check: string; impl: Impl }[] = [
    { name: "invalid seed accepted", check: "seed.bad", impl: { ...REAL, parse: (v) => parseSheetSeed(v) ?? parseSheetSeed(SEED) } },
    { name: "seventeenth doubt lost", check: "storage.all-keys", impl: { ...REAL, pack: (s, items) => pendingStorage(s, items.slice(0, 16)) } },
    { name: "expired or malformed key retained", check: "storage.validate", impl: { ...REAL, restore: (raw, now) => raw === corruptFixture() ? [stored(1), stored(2)] : pendingIntents(raw, now) } },
    { name: "selection authorizes changed URL stake", check: "storage.selected", impl: { ...REAL, pack: (s, items) => pendingStorage(s && { ...s, bet: "mkt_selected.YES.6000" }, items) } },
    { name: "resolved key retained", check: "storage.retire-one", impl: { ...REAL, pack: (s, items) => pendingStorage(s, [...items, stored(4)]) } },
    ...[
      ["host.durable-before-send", "if (!save())", "if (false)"],
      ["host.durable-before-send", "value.length > PENDING_STORAGE_MAX_BYTES) return false", "false) return false"],
      ["host.double-tap", "requests.current.has(old.intent.key)", "false"],
      ["host.key-read-send-time", "afterKeyRead(record.intent, null, readAtMs)", "afterKeyRead(record.intent, null, Date.now())"],
      ["host.key-shape", 'Object.prototype.hasOwnProperty.call(body.me, "keyPosition")', "true"],
      ["host.close-and-stake-lock", 'record?.intent.phase === "placing") return', 'false) return'],
      ["host.closed-receipt", "closedReceipts.current.set(id, settled)", "void settled"],
      ["host.boundary", "<SheetBoundary key={active.serial}", "<div key={active.serial}"],
      ["host.capture-safe", 'addEventListener("click", click, true)', 'addEventListener("click", click, false)'],
    ].map(([check, from, to]) => ({ name: `${check}: ${from}`, check, impl: { ...REAL, host: REAL.host.replace(from, to) } })),
    { name: "guest receives money host", check: "host.conditional-mount", impl: { ...REAL, shell: REAL.shell.replace("journeyShown && session && <Suspense fallback={null}><LazyBetSheetHost", "journeyShown && <Suspense fallback={null}><LazyBetSheetHost") } },
    { name: "render fixture may connect to a configured database", check: "bootstrap.local-only", impl: { ...REAL, bootstrap: REAL.bootstrap.replace("process.env.DATABASE_URL", "false") } },
    { name: "render fixture may listen externally", check: "bootstrap.local-only", impl: { ...REAL, bootstrap: REAL.bootstrap.replace('!process.argv.includes("127.0.0.1")', "false") } },
  ];
  for (const m of mutants) {
    const caught = checks(m.impl).some((c) => c.name === m.check && !c.pass);
    console.log(`${caught ? "PASS" : "FAIL"} PLANT ${m.name}`);
    if (!caught) failures++;
  }
  console.log(`${mutants.length} in-process controls executed`);
}
console.log(`${results.length} controls; ${failures} failures`);
process.exitCode = failures ? 1 : 0;

function corruptFixture(): string {
  const c = (overrides = {}) => ({ bet: "mkt_sheet1.YES.501", at: NOW - 1000, k: key(1), ...overrides });
  return JSON.stringify({ ...c(), pending: [c(), c({ k: key(2), at: NOW - 24 * 3600_000 }), c({ k: key(3), at: NOW + 61_000 }), c({ k: "invalid" }), c({ k: key(5), bet: "round_123.YES.500" }), c({ k: key(6), bet: "mkt_sheet1.NO" }), null, {}] });
}
