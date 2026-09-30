/**
 * test:card-close-label — the card's "Inafungwa leo" / "Siku {n}" (the Vodacom plan S3, §3.1).
 *
 *   npm run test:card-close-label     (in predeploy)
 *   npm run red:card-close-label      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * What it holds `src/lib/markets/card-close-label.ts` to — every instant written in East Africa Time (UTC+3):
 *   1. THE MIDNIGHT CROSSING — a market closing at 00:30 reads "Siku 1" at 23:59 the evening before and "leo" at 00:01.
 *   2. NOT "LEO" ON TIME LEFT — closing tomorrow at 01:00 with three hours to go is "Siku 1".
 *   3. THE UTC TRAP — 22:30 → 02:00 is the same UTC day and two EAT days: "Siku 1", never "leo".
 *   4. EXACTLY 11 DAYS — "Siku 11" / "11 days" / "11 天".
 *   5. BETTING, NOT RESOLUTION — `selectionClosedAt` decides; a closed selection is "closed" (no label) even when the
 *      market resolves days later.
 *   6. THE WORDS — singular and plural from the dictionary in en/sw/zh.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written.
 */
import * as CL from "../src/lib/markets/card-close-label.ts";
import { dict } from "../src/lib/i18n-dict.ts";

const PROVE_RED = process.argv.includes("--prove-red");
type Impl = { label: typeof CL.cardCloseLabel; text: typeof CL.cardCloseText };
const REAL: Impl = { label: CL.cardCloseLabel, text: CL.cardCloseText };

/** An instant written in East Africa Time. */
const eat = (y: number, mo: number, d: number, h: number, mi = 0) => Date.UTC(y, mo - 1, d, h - 3, mi);
const iso = (t: number) => new Date(t).toISOString();
const DAY = 24 * 60 * 60 * 1000;

function run(impl: Impl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const j = (v: unknown) => JSON.stringify(v);
  const L = (m: Parameters<typeof CL.cardCloseLabel>[0], now: number) => { try { return impl.label(m, now); } catch (e) { return { threw: String(e) } as never; } };

  const half = { resolutionAt: iso(eat(2026, 10, 2, 0, 30)) };
  const before = L(half, eat(2026, 10, 1, 23, 59)), after = L(half, eat(2026, 10, 2, 0, 1));
  ok("1.crossing · closing at 00:30: \"Siku 1\" at 23:59 the evening before, \"leo\" at 00:01",
    j(before) === j({ kind: "days", n: 1 }) && j(after) === j({ kind: "today" }), j({ before, after }));

  const soon = L({ resolutionAt: iso(eat(2026, 10, 2, 1)) }, eat(2026, 10, 1, 22));
  ok("2.not-leo · closing tomorrow at 01:00 with three hours left is \"Siku 1\", not \"leo\"", j(soon) === j({ kind: "days", n: 1 }), j(soon));

  const utc = L({ resolutionAt: iso(eat(2026, 10, 2, 2)) }, eat(2026, 10, 1, 22, 30));
  ok("3.utc-trap · 22:30 → 02:00 EAT is one UTC day but two EAT days: \"Siku 1\"", j(utc) === j({ kind: "days", n: 1 }), j(utc));

  const now11 = eat(2026, 10, 1, 10);
  const eleven = L({ resolutionAt: iso(now11 + 11 * DAY) }, now11);
  ok("4.eleven · exactly 11 days ahead is \"Siku 11\"", j(eleven) === j({ kind: "days", n: 11 }), j(eleven));

  const selClosed = L({ selectionClosedAt: iso(eat(2026, 10, 1, 9)), resolutionAt: iso(eat(2026, 10, 6, 12)) }, eat(2026, 10, 1, 10));
  const selToday = L({ selectionClosedAt: iso(eat(2026, 10, 1, 18)), resolutionAt: iso(eat(2026, 10, 6, 12)) }, eat(2026, 10, 1, 10));
  const atClose = L({ resolutionAt: iso(eat(2026, 10, 1, 10)) }, eat(2026, 10, 1, 10));
  ok("5.selection · a closed selection is \"closed\" though the market resolves in five days; one closing at 18:00 is \"leo\"; the closing instant itself is closed",
    j(selClosed) === j({ kind: "closed" }) && j(selToday) === j({ kind: "today" }) && j(atClose) === j({ kind: "closed" }), j({ selClosed, selToday, atClose }));

  const none = L({ selectionClosedAt: null, resolutionAt: "not a date" }, eat(2026, 10, 1, 10));
  ok("5.none · no closing instant at all is null (the card prints nothing, never \"NaN\")", none === null, j(none));

  const words = (loc: "en" | "sw" | "zh") => {
    const t = dict[loc].journey;
    return [impl.text({ kind: "today" }, t), impl.text({ kind: "days", n: 1 }, t), impl.text({ kind: "days", n: 11 }, t), impl.text({ kind: "closed" }, t)];
  };
  const en = words("en"), sw = words("sw"), zh = words("zh");
  ok("6.words · en \"Closes today\" / \"1 day\" / \"11 days\"; sw \"Inafungwa leo\" / \"Siku 1\" / \"Siku 11\"; zh \"今天截止\" / \"1 天\" / \"11 天\"; closed prints nothing",
    j(en) === j(["Closes today", "1 day", "11 days", null]) && j(sw) === j(["Inafungwa leo", "Siku 1", "Siku 11", null]) && j(zh) === j(["今天截止", "1 天", "11 天", null]),
    j({ en, sw, zh }));
  return failed;
}

if (!PROVE_RED) {
  console.log("card-close-label — the Vodacom plan S3 (pure)");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`\nCARD CLOSE LABEL — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  const DAY_MS = 24 * 60 * 60 * 1000;
  const closesAt = (m: Parameters<typeof CL.cardCloseLabel>[0]) => CL.cardClosesAtMs(m);
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const plants: Plant[] = [
    { name: "the resolution instant decides instead of the selection's close", expect: /^5\.selection /,
      impl: { ...REAL, label: (m, now) => REAL.label({ resolutionAt: m.resolutionAt }, now) } },
    { name: "days compared in UTC", expect: /^3\.utc-trap /,
      impl: { ...REAL, label: (m, now) => {
        const c = closesAt(m); if (c === null) return null; if (c <= now) return { kind: "closed" };
        const d = (t: number) => new Date(t).toISOString().slice(0, 10);
        if (d(c) === d(now)) return { kind: "today" };
        return { kind: "days", n: Math.round((Date.parse(d(c)) - Date.parse(d(now))) / DAY_MS) };
      } } },
    { name: "\"leo\" whenever less than 24 hours are left", expect: /^2\.not-leo /,
      impl: { ...REAL, label: (m, now) => {
        const c = closesAt(m); if (c === null) return null; if (c <= now) return { kind: "closed" };
        return c - now < DAY_MS ? { kind: "today" } : { kind: "days", n: Math.ceil((c - now) / DAY_MS) };
      } } },
    { name: "days counted from the time left (floor), not the calendar", expect: /^1\.crossing /,
      impl: { ...REAL, label: (m, now) => {
        const r = REAL.label(m, now); const c = closesAt(m);
        return r && r.kind === "days" && c !== null ? { kind: "days", n: Math.floor((c - now) / DAY_MS) } : r;
      } } },
    { name: "a closed market still labelled", expect: /^5\.selection /,
      impl: { ...REAL, label: (m, now) => { const r = REAL.label(m, now); return r && r.kind === "closed" ? { kind: "today" } : r; } } },
    { name: "the singular ignored (\"1 days\")", expect: /^6\.words /,
      impl: { ...REAL, text: (l, t) => REAL.text(l, { ...t, cardDaysLeftOne: t.cardDaysLeft.replace("{n}", "1") }) } },
    { name: "a missing instant printed as a label", expect: /^5\.none /,
      impl: { ...REAL, label: (m, now) => REAL.label(m, now) ?? { kind: "days", n: Number.NaN } } },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = run(REAL, quiet);
  ok("the REAL label passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = run(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
