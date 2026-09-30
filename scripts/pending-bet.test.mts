/**
 * test:pending-bet — the journey's `?bet=` link and the shared same-origin rule (the Vodacom plan S3, §3.1).
 *
 *   npm run test:pending-bet     (in predeploy)
 *   npm run red:pending-bet      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * What it holds `src/lib/journey/pending-bet.ts` and `src/lib/safe-next.ts` to:
 *   1. THE GRAMMAR — `mkt_x.YES.5000`, `udr_x.UP.5000`, a stake-less form; every malformed variant is null, and
 *      formatting inverts parsing exactly.
 *   2. THE LEGACY `?side=` — on a market's own page only; side locked, stake null (the minimum); `?bet=` wins.
 *   3. THE REBUILT URL — path + bet only; a path that is not same-origin becomes "/".
 *   4. ⭐ A SHARED LINK NEVER SETS A STAKE — the URL's stake is used only with a matching marker under 24 hours old.
 *   5. THE MARKER'S ATTRIBUTION — `ref`, `invite` and the five `utm_*` survive, in their safe shapes; nothing else does.
 *   6. THE SAME-ORIGIN RULE — `sanitizeNext` refuses "//evil", "/" + backslash + "evil", absolute URLs and `/auth/` pages.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written.
 */
import * as PB from "../src/lib/journey/pending-bet.ts";
import * as SN from "../src/lib/safe-next.ts";

const PROVE_RED = process.argv.includes("--prove-red");
type Impl = {
  parse: typeof PB.parseBetParam; format: typeof PB.formatBetParam; from: typeof PB.pendingBetFrom; url: typeof PB.pendingBetUrl;
  stake: typeof PB.stakeFromUrl; write: typeof PB.writeMarker; read: typeof PB.readMarker; attribution: typeof PB.attributionFrom;
  sanitize: typeof SN.sanitizeNext;
};
const REAL: Impl = {
  parse: PB.parseBetParam, format: PB.formatBetParam, from: PB.pendingBetFrom, url: PB.pendingBetUrl, stake: PB.stakeFromUrl,
  write: PB.writeMarker, read: PB.readMarker, attribution: PB.attributionFrom, sanitize: SN.sanitizeNext,
};
const BS = String.fromCharCode(92);
const NOW = Date.UTC(2026, 9, 1, 9, 0);
const HOUR = 60 * 60 * 1000;
const M = "mkt_b040971a5824517186c3";

function run(impl: Impl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const j = (v: unknown) => JSON.stringify(v);
  const safe = <T,>(f: () => T): T | "threw" => { try { return f(); } catch { return "threw"; } };

  /* 1 · the grammar */
  const good = [`${M}.YES.5000`, `${M}.NO.1000`, "udr_4f1c09aa2d.UP.5000", "udr_4f1c09aa2d.DOWN.250000", `${M}.YES`, `${M}.NO.999999999`];
  const parsed = good.map((g) => safe(() => impl.parse(g)));
  ok("1.valid · a market (YES/NO), a round (UP/DOWN), a stake-less form and a 9-digit stake all parse",
    j(parsed[0]) === j({ kind: "market", id: M, side: "YES", stake: 5000 }) && j(parsed[2]) === j({ kind: "round", id: "udr_4f1c09aa2d", side: "UP", stake: 5000 })
      && j(parsed[4]) === j({ kind: "market", id: M, side: "YES", stake: null }) && parsed.every((p) => p && p !== "threw"), j(parsed));
  ok("1.round-trip · formatting inverts parsing exactly", good.every((g) => { const p = safe(() => impl.parse(g)); return p && p !== "threw" && impl.format(p) === g; }));
  const bad = [
    `${M}.UP.5000`, "udr_4f1c09aa2d.YES.5000", `${M}.yes.5000`, `${M}.YES.0`, `${M}.YES.05000`, `${M}.YES.1234567890`,
    `${M}.YES.-5`, `${M}.YES.5e3`, `${M}.YES.50.5`, `${M}.YES.5000.1`, "evil.YES.5000", "mkt_a b.YES.1", "mkt_.YES.1",
    `mkt_${"a".repeat(65)}.YES.1`, "", ".", "YES", `${M}`, `${M}..5000`,
  ];
  const badOut = bad.map((b) => safe(() => impl.parse(b)));
  ok("1.malformed · a wrong side for the kind, lowercase, zero, a leading zero, ten digits, a sign, an exponent, a decimal, extra parts, a foreign or empty id — all null",
    badOut.every((b) => b === null), j(bad.filter((_, i) => badOut[i] !== null)));
  ok("1.types · a non-string is null, never a throw", [null, undefined, 5000, {}, ["x"]].every((v) => safe(() => impl.parse(v)) === null));

  /* 2 · the legacy ?side= */
  const legacy = safe(() => impl.from(`/markets/${M}`, new URLSearchParams("side=NO")));
  const legacyObj = safe(() => impl.from(`/markets/${M}`, { side: "YES" }));
  const betWins = safe(() => impl.from(`/markets/${M}`, new URLSearchParams(`side=NO&bet=${M}.YES.2000`)));
  const offPage = safe(() => impl.from("/", new URLSearchParams("side=YES")));
  const badSide = safe(() => impl.from(`/markets/${M}`, new URLSearchParams("side=MAYBE")));
  const badBet = safe(() => impl.from(`/markets/${M}`, new URLSearchParams(`bet=nonsense&side=YES`)));
  ok("2.legacy · ?side= on a market's own page locks the side at the minimum; ?bet= wins over it; off the page, an unknown side, or a malformed ?bet= is nothing",
    j(legacy) === j({ kind: "market", id: M, side: "NO", stake: null }) && j(legacyObj) === j({ kind: "market", id: M, side: "YES", stake: null })
      && j(betWins) === j({ kind: "market", id: M, side: "YES", stake: 2000 }) && offPage === null && badSide === null && badBet === null,
    j({ legacy, legacyObj, betWins, offPage, badSide, badBet }));

  /* 3 · the rebuilt URL */
  const bet = { kind: "market" as const, id: M, side: "YES" as const, stake: 5000 };
  const u1 = safe(() => impl.url(`/markets/${M}?utm_source=x&ref=abc&side=NO#top`, bet));
  const u2 = safe(() => impl.url("//evil.example/markets", bet));
  const u3 = safe(() => impl.url(`/${BS}evil.example`, bet));
  const u4 = safe(() => impl.url("https://evil.example/", bet));
  ok("3.url · rebuilt from the path and the bet only; a protocol-relative, backslash or absolute path becomes \"/\"",
    u1 === `/markets/${M}?bet=${M}.YES.5000` && u2 === `/?bet=${M}.YES.5000` && u3 === `/?bet=${M}.YES.5000` && u4 === `/?bet=${M}.YES.5000`, j({ u1, u2, u3, u4 }));

  /* 4 · a shared link never sets a stake */
  const mine = impl.write(bet, NOW - HOUR);
  const own = safe(() => impl.stake(bet, mine, NOW));
  const noMarker = safe(() => impl.stake(bet, null, NOW));
  const otherStake = safe(() => impl.stake({ ...bet, stake: 500_000 }, mine, NOW));
  const otherSide = safe(() => impl.stake({ ...bet, side: "NO" }, mine, NOW));
  const stale = safe(() => impl.stake(bet, impl.write(bet, NOW - 24 * HOUR), NOW));
  const future = safe(() => impl.stake(bet, impl.write(bet, NOW + HOUR), NOW));
  const junk = safe(() => impl.stake(bet, "{not json", NOW));
  const forged = safe(() => impl.stake(bet, JSON.stringify({ bet: `${M}.YES.5000`, at: "yesterday" }), NOW));
  ok("4.own · this browser's own marker (1 h old, same bet) lets the URL's stake prefill", own === 5000, j(own));
  ok("4.shared · no marker, a different stake, a different side, a marker 24 h old, one stamped in the future, junk, or a forged timestamp — the stake is NOT prefilled",
    [noMarker, otherStake, otherSide, stale, future, junk, forged].every((v) => v === null), j({ noMarker, otherStake, otherSide, stale, future, junk, forged }));

  /* 5 · the marker's attribution */
  const attr = safe(() => impl.attribution(new URLSearchParams(
    `ref=abc_123&invite=INV-9&utm_source=facebook&utm_medium=cpc&utm_campaign=launch week&utm_term=x&utm_content=y&utm_evil=1&gclid=zz&ref2=q`)));
  const hostile = safe(() => impl.attribution(new URLSearchParams(`ref=<script>&invite=${"a".repeat(65)}&utm_source=a"b&utm_medium=${"m".repeat(101)}`)));
  const round = safe(() => impl.read(impl.write(bet, NOW, attr === "threw" ? {} : attr), NOW));
  ok("5.attribution · ref, invite and the five utm_* are kept; utm_evil, gclid and ref2 are not",
    j(attr) === j({ ref: "abc_123", invite: "INV-9", utm: { utm_source: "facebook", utm_medium: "cpc", utm_campaign: "launch week", utm_term: "x", utm_content: "y" } }), j(attr));
  ok("5.hostile · a script tag, an over-long code, a quote and an over-long utm value are all dropped", j(hostile) === j({}), j(hostile));
  ok("5.round-trip · the attribution survives the marker's write and read", round !== "threw" && round !== null && j(round.utm) === j(attr === "threw" ? null : attr.utm) && round.ref === "abc_123", j(round));

  /* 6 · the same-origin rule */
  const cases: Array<[unknown, string]> = [
    ["/markets", "/markets"], [`/markets/${M}?bet=x`, `/markets/${M}?bet=x`], ["//evil.example", ""], [`/${BS}evil.example`, ""],
    ["https://evil.example", ""], ["javascript:alert(1)", ""], ["/auth/login", ""], ["", ""], [null, ""], ["markets", ""],
  ];
  const outs = cases.map(([i]) => safe(() => impl.sanitize(i)));
  ok("6.next · a same-origin path passes; //evil, a backslash path, an absolute or javascript: URL, an /auth/ page, a relative or empty value do not",
    cases.every(([, want], i) => outs[i] === want), j(cases.map(([i], k) => [i, outs[k]])));
  return failed;
}

if (!PROVE_RED) {
  console.log("pending-bet — the Vodacom plan S3 (pure)");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`\nPENDING BET — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const plants: Plant[] = [
    { name: "a side from the wrong kind is accepted (a market bet on UP)", expect: /^1\.malformed /,
      impl: { ...REAL, parse: (r) => REAL.parse(typeof r === "string" ? r.replace(".UP.", ".YES.") : r) } },
    { name: "a leading-zero or ten-digit stake is accepted", expect: /^1\.malformed /,
      impl: { ...REAL, parse: (r) => { if (typeof r === "string") { const p = r.split("."); if (p.length === 3 && /^[0-9]+$/.test(p[2])) return REAL.parse(`${p[0]}.${p[1]}.${Number(p[2]) || 1}`.slice(0, 90)); } return REAL.parse(r); } } },
    { name: "?side= honoured on any page", expect: /^2\.legacy /,
      impl: { ...REAL, from: (path, s) => { const r = REAL.from(path, s); if (r) return r; const side = s instanceof URLSearchParams ? s.get("side") : s.side; return side === "YES" || side === "NO" ? { kind: "market", id: M, side, stake: null } : null; } } },
    { name: "the rebuilt URL keeps the original query", expect: /^3\.url /,
      impl: { ...REAL, url: (path, b) => `${path}&bet=${REAL.format(b)}` } },
    { name: "the URL's stake is used without a marker (a shared link sets the stake)", expect: /^4\.shared /,
      impl: { ...REAL, stake: (b) => (b ? b.stake : null) } },
    { name: "the marker never expires", expect: /^4\.shared /,
      impl: { ...REAL, stake: (b, raw, now) => REAL.stake(b, raw, now - 0) ?? (() => { try { const m = JSON.parse(String(raw)); return m && m.bet === (b && REAL.format(b)) ? b?.stake ?? null : null; } catch { return null; } })() } },
    { name: "attribution passes any parameter through", expect: /^5\.attribution /,
      impl: { ...REAL, attribution: (s) => ({ ...REAL.attribution(s), utm: Object.fromEntries([...s.entries()].filter(([k]) => k.startsWith("utm_"))) }) } },
    { name: "attribution keeps a hostile value", expect: /^5\.hostile /,
      impl: { ...REAL, attribution: (s) => ({ ...REAL.attribution(s), ...(s.get("ref") ? { ref: s.get("ref") as string } : {}) }) } },
    { name: "the same-origin rule forgets the backslash", expect: /^6\.next /,
      impl: { ...REAL, sanitize: (r) => (typeof r === "string" && r.startsWith("/") && !r.startsWith("//") && !r.startsWith("/auth/") ? r : "") } },
    { name: "the same-origin rule lets a sign-in land on /auth/", expect: /^6\.next /,
      impl: { ...REAL, sanitize: (r) => (SN.isSafePath(r) ? r : "") } },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = run(REAL, quiet);
  ok("the REAL module passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = run(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
