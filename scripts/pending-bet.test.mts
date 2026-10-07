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
 *   6. THE SAME-ORIGIN RULE — `sanitizeNext` refuses "//evil", "/" + backslash + "evil", absolute URLs and `/auth/` pages;
 *      since 2026-10-06 also a control character anywhere ("/\t/evil" is read as "//evil") and a bare `/auth` — and no
 *      file under src/ keeps a private copy of the rule (6.one-rule).
 *   7. THE DOORS KEEP INTENT - boundedNext, returnPathFrom, withWelcome, authDoorHrefs, landingAfterAuth,
 *      accountRefusalPath (route audit 2026-10-06).
 *      The census, src only (route audit B2/B6/B-E1/F2; each check runs its own control, none is planted by --prove-red):
 *      7.no-bare-door - no Server Action under src/app sends a lost session to a bare /auth/login;
 *      7.action-door - the seven action files ask signInPathForAction, markets/actions.ts at least 8 times;
 *      7.deposit-door - the deposit action's email-door hop keeps the player's choices and drops the number;
 *      7.auth-code - every no-session refusal in markets/actions.ts carries code AUTH;
 *      7.rg-landing - a permanent self-exclusion lands on excluded=permanent, asked through selfExclusionStandingOf.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as PB from "../src/lib/journey/pending-bet.ts";
import * as SN from "../src/lib/safe-next.ts";
import * as AL from "../src/lib/auth-landing.ts";
import { decomment } from "./lib/decomment.mts";
import { isDirective } from "./lib/is-directive.mts";

const PROVE_RED = process.argv.includes("--prove-red");
type Impl = {
  parse: typeof PB.parseBetParam; format: typeof PB.formatBetParam; from: typeof PB.pendingBetFrom; url: typeof PB.pendingBetUrl;
  stake: typeof PB.stakeFromUrl; write: typeof PB.writeMarker; read: typeof PB.readMarker; attribution: typeof PB.attributionFrom;
  sanitize: typeof SN.sanitizeNext;
  bounded: typeof SN.boundedNext; returnPath: typeof SN.returnPathFrom; welcome: typeof SN.withWelcome;
  doors: typeof AL.authDoorHrefs; landing: typeof AL.landingAfterAuth; refusal: typeof AL.accountRefusalPath;
};
const REAL: Impl = {
  parse: PB.parseBetParam, format: PB.formatBetParam, from: PB.pendingBetFrom, url: PB.pendingBetUrl, stake: PB.stakeFromUrl,
  write: PB.writeMarker, read: PB.readMarker, attribution: PB.attributionFrom, sanitize: SN.sanitizeNext,
  bounded: SN.boundedNext, returnPath: SN.returnPathFrom, welcome: SN.withWelcome,
  doors: AL.authDoorHrefs, landing: AL.landingAfterAuth, refusal: AL.accountRefusalPath,
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

  // 🔴 2026-10-06 · the browser's URL parser STRIPS tab, CR and LF, so "/\t/evil.example" is read as "//evil.example".
  // The old one-regex rule passed it (its second character is a tab, not "/"), on every sign-in and sign-up door.
  const tricks = ["/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/\u0000/evil.example", "/\u007f/x", `/markets${BS}x`];
  const tricksOut = tricks.map((v) => safe(() => impl.sanitize(v)));
  ok("6.control-chars · a tab, CR, LF, NUL, DEL or a backslash anywhere is refused", tricksOut.every((o) => o === ""), j(tricks.map((v, k) => [v, tricksOut[k]])));
  ok("6.control-chars · control: the tab, LF and CR forms really are read as another site by the URL parser",
    tricks.slice(0, 3).every((v) => new URL(v, "https://www.50pick.tz/auth/login").host === "evil.example"));
  const bare = ["/auth", "/auth?x=1", "/auth#top"].map((v) => safe(() => impl.sanitize(v)));
  ok("6.auth-bare · /auth with no slash, a query or a fragment is an /auth page too", bare.every((o) => o === ""), j(bare));

  /* 7 · THE DOORS KEEP INTENT (route audit 2026-10-06) — where every door sends someone, as pure tables. Each row is
   *     [input, wanted]; a failure prints [input, wanted, got] with long strings shortened. */
  const TAB = String.fromCharCode(9);
  const as = (n: number) => "a".repeat(n);
  const brief = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(brief) : typeof v === "string" && v.length > 48 ? `${v.slice(0, 24)}...(${v.length} chars)` : v;
  const table = <I,>(label: string, rows: Array<[I, string]>, f: (i: I) => string) => {
    const got = rows.map(([i]) => safe(() => f(i)));
    const bad = rows.flatMap(([i, want], k) => (got[k] === want ? [] : [[brief(i), want, brief(got[k])]]));
    ok(label, bad.length === 0, `[input, wanted, got]: ${j(bad)}`);
  };

  table<string>("7.bounded · boundedNext keeps a safe path; one longer than 512 characters is REFUSED, never cut (512 pass, 513 do not); an /auth page and //evil are refused",
    [["/markets/mkt_x?side=YES", "/markets/mkt_x?side=YES"], ["/" + as(600), ""], ["/auth/login", ""], ["//evil.example", ""],
      ["/" + as(511), "/" + as(511)], ["/" + as(512), ""]],
    (i) => impl.bounded(i));

  table<string>("7.return · returnPathFrom drops welcome and the #fragment; an /auth page, //evil, a tab trick or nothing gives \"\"; an over-long query falls back to the bare path",
    [["/markets/mkt_a1?side=YES&welcome=back", "/markets/mkt_a1?side=YES"], ["/auth/login?next=/x", ""], ["//evil.example", ""],
      ["/" + TAB + "/evil.example", ""], ["/markets?q=" + as(600), "/markets"], ["", ""],
      ["/updown/udr_1?side=UP", "/updown/udr_1?side=UP"], ["/positions#pos_1", "/positions"]],
    (i) => impl.returnPath(i));

  table<[string, "new" | "back"]>("7.welcome · withWelcome sets the greeting in the QUERY, before any #fragment, replacing an old one in place",
    [[["/", "new"], "/?welcome=new"], [["/markets/mkt_a1?side=YES", "new"], "/markets/mkt_a1?side=YES&welcome=new"],
      [["/positions#pos_q1", "back"], "/positions?welcome=back#pos_q1"], [["/x?welcome=new&a=1#h", "back"], "/x?welcome=back&a=1#h"]],
    ([p, k]) => impl.welcome(p, k));

  // Both hrefs, compared exactly, as "<sign in> | <sign up>".
  const both = (tail: string) => `/auth/login${tail} | /auth/register${tail}`;
  const doorsOf = ([p, q]: [string, string]) => { const d = impl.doors(p, new URLSearchParams(q)); return `${d.signIn} | ${d.signUp}`; };
  table<[string, string]>("7.doors · the guest header's doors: this page (less ref and welcome) is the next and a bare / is none; on an /auth page only its own next and ref travel; ref is normalised or dropped",
    [[["/", ""], both("")],
      [["/", "ref=ab12cd"], both("?ref=AB12CD")],
      [["/markets/mkt_x", "ref=50pick-ag-abc123&side=YES"], both("?next=%2Fmarkets%2Fmkt_x%3Fside%3DYES&ref=50PICK-AG-ABC123")],
      [["/auth/login", "next=/markets/mkt_x&ref=AB12CD"], both("?next=%2Fmarkets%2Fmkt_x&ref=AB12CD")],
      [["/auth/reset-password", "token=SECRET"], both("")],
      [["/markets", "ref=<script>"], both("?next=%2Fmarkets")],
      [["/markets", "welcome=back&topic=sports"], both("?next=%2Fmarkets%3Ftopic%3Dsports")],
      [["/", "bet=mkt_x.YES"], both("?next=%2F%3Fbet%3Dmkt_x.YES")]],
    doorsOf);
  const resetDoors = safe(() => doorsOf(["/auth/reset-password", "token=SECRET"]));
  ok("7.doors · a reset link's token never leaves its page: SECRET is in neither door", resetDoors !== "threw" && !resetDoors.includes("SECRET"), j(resetDoors));

  table<[string | undefined, string, "new" | "back"]>("7.landing · a player or agent lands on the safe next (never an /admin one) or home, greeted before any #fragment; staff land on an /admin next, else /admin",
    [[["PLAYER", "", "new"], "/?welcome=new"], [["PLAYER", "", "back"], "/?welcome=back"],
      [["PLAYER", "/markets/mkt_a1?side=YES", "back"], "/markets/mkt_a1?side=YES&welcome=back"],
      [["PLAYER", "/positions#pos_q1", "back"], "/positions?welcome=back#pos_q1"],
      [["AGENT", "/agent", "new"], "/agent?welcome=new"],
      [[undefined, "/wallet/deposit?from=low-balance", "new"], "/wallet/deposit?from=low-balance&welcome=new"],
      [["PLAYER", "/admin/kyc", "back"], "/?welcome=back"], [["ADMIN", "/admin/kyc", "back"], "/admin/kyc"],
      [["COMPLIANCE", "/markets/mkt_a1", "back"], "/admin"], [["SUPPORT", "", "new"], "/admin"]],
    ([role, next, kind]) => impl.landing({ role, next, kind }));

  table<[Parameters<Impl["refusal"]>[0], string]>("7.refusal · a CLOSED account gets the closed=1 panel; the three exclusion standings their own (serving carries its date); anything else error=blocked; only a safe next is kept",
    [[[{ accountClosed: true }, "/markets/mkt_a1"], "/auth/login?closed=1&next=%2Fmarkets%2Fmkt_a1"],
      [[{ standing: "serving", until: "2026-12-01T09:00:00.000Z" }, ""], "/auth/login?excluded=serving&until=2026-12-01"],
      [[{ standing: "minimum_served", until: "2026-01-01T00:00:00.000Z" }, ""], "/auth/login?excluded=minimum_served"],
      [[{ standing: "permanent" }, ""], "/auth/login?excluded=permanent"],
      [[{ standing: "diverged" }, ""], "/auth/login?error=blocked"],
      [[undefined, "/wallet"], "/auth/login?error=blocked&next=%2Fwallet"],
      [[undefined, "//evil.example"], "/auth/login?error=blocked"]],
    ([d, n]) => impl.refusal(d, n));
  return failed;
}

if (!PROVE_RED) {
  console.log("pending-bet — the Vodacom plan S3 (pure)");
  const failed = run(REAL, (l) => console.log(l));

  // 6.one-rule · EVERY DOOR ASKS safe-next.ts. Thirteen private copies of the regex are how the tab hole reached every
  // sign-in and sign-up door at once (2026-10-06). Reads src/ only; writes nothing.
  {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
    });
    const COPY = /\/\^\\\/\(\?!/; // the text `/^\/(?!` — a hand-rolled leading-slash rule
    const hits = walk("src").map((f) => f.replace(/\\/g, "/")).filter((f) => COPY.test(readFileSync(f, "utf8")));
    const control = hits.includes("src/lib/safe-next.ts");
    const strays = hits.filter((f) => f !== "src/lib/safe-next.ts");
    console.log(`     hand-rolled leading-slash rules: ${hits.join(" · ") || "(none)"}`);
    const line = (cond: boolean, label: string, extra = "") => { console.log(`  ${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`); if (!cond) failed.push(label); };
    line(control, "6.one-rule · control: the scanner finds the rule in safe-next.ts itself");
    line(strays.length === 0, "6.one-rule · no other file keeps a private copy — every door imports isSafePath / sanitizeNext", strays.join(", "));
  }

  // 7 · THE CENSUS · THE ACTION DOORS (route audit 2026-10-06: B2, B6, B-E1, F2). Reads src/ only; writes nothing. Not
  // planted by --prove-red: each check runs its own control here, beside it, and prints the population it read.
  {
    const LF = String.fromCharCode(10);
    const BT = String.fromCharCode(96);
    const read = (f: string) => decomment(readFileSync(f, "utf8"));
    const check = (cond: boolean, label: string, extra = "") => {
      console.log(`  ${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
      if (!cond) failed.push(label);
    };
    // Directory entries carry their own type, so a file another process renames mid-walk is never stat-ed.
    const tsUnder = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? tsUnder(`${dir}/${d.name}`) : d.name.endsWith(".ts") ? [`${dir}/${d.name}`] : []);

    // 7.no-bare-door · a Server Action is POSTed to its page's address, so a lost session signs in back to THAT page
    // (signInPathForAction). A bare /auth/login, in any quote and with or without a cast, signs a bet on a stale tab in to
    // the board instead (B2).
    const bareDoor = (s: string) => ['"', "'", BT].some((q) => s.includes(`redirect(${q}/auth/login${q}`));
    const serverFiles = tsUnder("src/app").filter((f) => isDirective(readFileSync(f, "utf8"), "use server"));
    const bare = serverFiles.filter((f) => bareDoor(read(f)));
    console.log(`     "use server" files under src/app: ${serverFiles.length}`);
    check(bareDoor(`if (!session) redirect("/auth/login");`) && bareDoor(`if (!s) redirect('/auth/login' as never);`)
        && !bareDoor("if (!session) redirect((await signInPathForAction()) as never);") && !bareDoor(`redirect("/auth/login?closed=1");`),
      "7.no-bare-door · control: the matcher fires on the pre-fix guard (either quote, with a cast), not on the named door or a door with a query");
    check(serverFiles.length >= 10 && bare.length === 0,
      "7.no-bare-door · no Server Action under src/app sends a lost session to a bare /auth/login",
      `${serverFiles.length} files${bare.length > 0 ? `; bare: ${bare.join(", ")}` : ""}`);

    // 7.action-door · the seven files B2 moved import the ONE helper, markets/actions.ts asks it at each of its 8 doors, and
    // the wallet actions no longer hard-code their own path (which dropped the page's query).
    const DOOR_FILES = ["markets", "profile/account", "profile/kyc", "profile/responsible-gambling", "profile/source-of-funds",
      "wallet/deposit", "wallet/withdraw"].map((d) => `src/app/${d}/actions.ts`);
    const importsDoor = (s: string) => s.split(LF).some((l) => l.startsWith("import ") && l.includes("signInPathForAction")
      && l.includes(`from "@/lib/server/sign-in-path"`));
    const calls = (s: string) => s.split("signInPathForAction()").length - 1;
    const WALLET_NEXT = "/auth/login?next=/wallet/";
    const MARKETS = read("src/app/markets/actions.ts");
    const notImporting = DOOR_FILES.filter((f) => !importsDoor(read(f)));
    const walletLiteral = DOOR_FILES.filter((f) => f.startsWith("src/app/wallet/") && read(f).includes(WALLET_NEXT));
    console.log(`     signInPathForAction() calls in markets/actions.ts: ${calls(MARKETS)} · files importing it: ${DOOR_FILES.length - notImporting.length}/${DOOR_FILES.length}`);
    check(calls(`import { signInPathForAction } from "@/lib/server/sign-in-path";`) === 0 && calls(`if (!session) redirect("/auth/login");`) === 0
        && calls("if (!session) redirect((await signInPathForAction()) as never);") === 1
        && importsDoor(`import { signInPathForAction } from "@/lib/server/sign-in-path";`) && !importsDoor(`import { currentSession } from "@/lib/server/auth-service";`)
        && `if (!session) redirect("/auth/login?next=/wallet/deposit");`.includes(WALLET_NEXT),
      "7.action-door · control: the counter counts calls, never the import; the import reader tells the helper from another module; the old wallet door carries the literal");
    check(calls(MARKETS) >= 8 && notImporting.length === 0 && walletLiteral.length === 0,
      "7.action-door · markets/actions.ts asks signInPathForAction at least 8 times; all seven action files import it from @/lib/server/sign-in-path; no wallet action hard-codes /auth/login?next=/wallet/",
      JSON.stringify({ calls: calls(MARKETS), notImporting, walletLiteral }));

    // 7.deposit-door · the email-door hop goes back to the page WITH the player's choices, never with the number (B6).
    const DEPOSIT = read("src/app/wallet/deposit/actions.ts");
    const OLD_HOP = `redirect("/wallet/deposit" as never)`;
    const NEW_HOP = "redirect(" + BT + "/wallet/deposit?${";
    /** The email gate's consequent: its braced block, or its one statement up to the ";". */
    const emailHop = (s: string): string => {
      const at = s.indexOf(`result.code === "EMAIL_UNVERIFIED"`);
      if (at < 0) return "";
      let i = s.indexOf(")", at) + 1;
      while (s[i] === " ") i++;
      if (s[i] !== "{") return s.slice(at, s.indexOf(";", i) + 1);
      for (let depth = 0, k = i; k < s.length; k++) {
        if (s[k] === "{") depth++;
        else if (s[k] === "}" && --depth === 0) return s.slice(at, k + 1);
      }
      return "";
    };
    const keepsChoices = (s: string) => {
      const hop = emailHop(s);
      const drop = hop.indexOf(`.delete("msisdn")`);
      return hop.includes("new URLSearchParams(carry)") && drop > 0 && drop < hop.indexOf(NEW_HOP) && !s.includes(OLD_HOP);
    };
    console.log(`     the email gate's hop: ${emailHop(DEPOSIT).split(LF).map((l) => l.trim()).join(" ") || "(not found)"}`);
    check(!keepsChoices(`    if (result.code === "EMAIL_UNVERIFIED") redirect("/wallet/deposit" as never);`)
        && !keepsChoices(DEPOSIT.split(`.delete("msisdn")`).join("")),
      "7.deposit-door · control: the pre-fix hop (the bare page, every choice lost) is flagged, and so is a hop that keeps the number");
    check(keepsChoices(DEPOSIT),
      "7.deposit-door · on EMAIL_UNVERIFIED the deposit action goes back to /wallet/deposit with new URLSearchParams(carry), less the msisdn, and the bare hop is gone");

    // 7.auth-code · a lost session on a comment, a report, a deletion, a restore or an objection answers with code AUTH, so
    // errorCopy renders t.error.errSignIn in the player's own language rather than the English prose (B-E1).
    const GUARD = "if (!session) return { ok: false";
    const AUTH_CODE = `code: "AUTH"`;
    const unlabelled = (s: string) => s.split(LF).filter((l) => l.includes(GUARD) && !l.includes(AUTH_CODE));
    const refusals = MARKETS.split(LF).filter((l) => l.includes(GUARD));
    console.log(`     no-session refusals in markets/actions.ts: ${refusals.length}`);
    check(unlabelled(`  if (!session) return { ok: false as const, error: "Sign in first." };`).length === 1
        && unlabelled(`  if (!session) return { ok: false as const, error: "Sign in first.", code: "AUTH" as const };`).length === 0,
      "7.auth-code · control: the pre-fix refusal (prose, no code) is flagged; the fixed one is not");
    check(refusals.length >= 5 && unlabelled(MARKETS).length === 0,
      "7.auth-code · every no-session refusal in markets/actions.ts carries code AUTH",
      JSON.stringify({ refusals: refusals.length, unlabelled: unlabelled(MARKETS).map((l) => l.trim()) }));

    // 7.rg-landing · choosing a PERMANENT self-exclusion lands on the permanent panel every later sign-in shows, asked through
    // selfExclusionStandingOf (the one definition of permanent), never by the period's name (F2). Every other period still
    // lands on excluded=serving with its until= date (test:rg-doors 6.9 reads those two).
    const RG = read("src/app/profile/responsible-gambling/actions.ts");
    const from = RG.indexOf("export async function selfExcludeAction(");
    const to = from < 0 ? -1 : RG.indexOf(LF + "export ", from + 1);
    const SELF_EXCLUDE = from < 0 ? "" : RG.slice(from, to < 0 ? RG.length : to);
    const landsRight = (b: string) => b.includes("selfExclusionStandingOf(") && !b.includes(`"perm"`)
      && b.includes("excluded=permanent") && b.includes("excluded=serving") && b.includes("until=")
      && b.indexOf("excluded=permanent") < b.indexOf("excluded=serving");
    const servingOnly = SELF_EXCLUDE.split(LF).filter((l) => !l.includes("excluded=permanent") && !l.includes("selfExclusionStandingOf(")).join(LF);
    console.log(`     selfExcludeAction lands on: ${["excluded=permanent", "excluded=serving"].filter((x) => SELF_EXCLUDE.includes(x)).join(" · ") || "(nothing found)"}`);
    check(!landsRight(servingOnly) && !landsRight(SELF_EXCLUDE + LF + `if (period === "perm") redirect("/auth/login?excluded=permanent");`),
      "7.rg-landing · control: the pre-fix landing (serving for every period) is flagged, and so is one that asks the period's name");
    check(landsRight(SELF_EXCLUDE),
      "7.rg-landing · a PERMANENT self-exclusion lands on excluded=permanent through selfExclusionStandingOf, before the serving landing, which keeps until=",
      SELF_EXCLUDE ? "" : "selfExcludeAction not found");
  }
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
    { name: "the pre-2026-10-06 one-regex rule — a tab after the first slash passes", expect: /^6\.control-chars /,
      impl: { ...REAL, sanitize: (r) => (typeof r === "string" && /^\/(?![/\\])/.test(r) && !r.startsWith("/auth/") ? r : "") } },
    { name: "the rule forgets that a bare /auth is an /auth page", expect: /^6\.auth-bare /,
      impl: { ...REAL, sanitize: (r) => (SN.isSafePath(r) && !r.startsWith("/auth/") ? r : "") } },
    // 7 · the doors keep intent (route audit 2026-10-06)
    { name: "returnPathFrom keeps welcome", expect: /^7\.return /,
      impl: { ...REAL, returnPath: (h) => SN.boundedNext(String(h).split("#")[0]) } },
    { name: "boundedNext cuts instead of refusing", expect: /^7\.bounded /,
      impl: { ...REAL, bounded: (r) => SN.sanitizeNext(r).slice(0, 512) } },
    { name: "the greeting is appended after the #fragment", expect: /^7\.welcome /,
      impl: { ...REAL, welcome: (p, k) => p + (p.includes("?") ? "&" : "?") + "welcome=" + k } },
    { name: "the header copies an /auth page's whole query", expect: /^7\.doors /,
      impl: { ...REAL, doors: (_p, s) => ({ signIn: "/auth/login?" + s, signUp: "/auth/register?" + s }) } },
    { name: "the header passes ref un-normalised", expect: /^7\.doors /,
      impl: { ...REAL, doors: (p, s) => {
        const real = AL.authDoorHrefs(p, s);
        const raw = s.get("ref");
        if (raw === null) return real;
        const swap = (href: string) => {
          const at = href.indexOf("?");
          const qs = new URLSearchParams(at < 0 ? "" : href.slice(at + 1));
          qs.set("ref", raw);
          return `${at < 0 ? href : href.slice(0, at)}?${qs.toString()}`;
        };
        return { signIn: swap(real.signIn), signUp: swap(real.signUp) };
      } } },
    { name: "a player keeps an /admin next", expect: /^7\.landing /,
      impl: { ...REAL, landing: (o) => SN.withWelcome(o.next || "/", o.kind) } },
    { name: "a CLOSED account is told it is blocked", expect: /^7\.refusal /,
      impl: { ...REAL, refusal: (d, n) => AL.accountRefusalPath(d?.accountClosed ? undefined : d, n) } },
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
