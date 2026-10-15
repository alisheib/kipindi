/** S10 WP7: execute the real auth success actions with inert services. No account, session, wallet or browser I/O. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import * as safe from "../src/lib/safe-next.ts";
import * as referral from "../src/lib/referral-code.ts";
import * as invite from "../src/lib/invite-code.ts";
import * as breakEnd from "../src/lib/break-end.ts";
import * as bet from "../src/lib/journey/pending-bet.ts";
import { sheetOpensOn } from "../src/lib/journey/sheet-state.ts";
import { simpleJourneyFor } from "../src/lib/feature-state.ts";
import { guestOpensFrom } from "../src/lib/journey/guest-sheet.ts";
import { decomment } from "./lib/decomment.mts";

type World = { register: string; login: string; landing: string; proxy: string; host: string; shell: string; auth: Record<string, string> };
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
function authSources(dir: string, prefix = dir): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) Object.assign(out, authSources(path, prefix));
    else if (/\.(ts|tsx)$/.test(entry)) out[path.slice(prefix.length + 1).replace(/\\/g, "/")] = read(path);
  }
  return out;
}
const REAL: World = {
  register: read("src/app/auth/register/actions.ts"), login: read("src/app/auth/login/actions.ts"),
  landing: read("src/lib/auth-landing.ts"), proxy: read("src/proxy.ts"),
  host: read("src/components/journey/bet-sheet/bet-sheet-host.tsx"), shell: read("src/components/layout/app-shell.tsx"),
  auth: authSources("src/app/auth"),
};
const inert = new Proxy({}, { get: () => () => null });
function compile(source: string, imports: Record<string, unknown>): Record<string, any> {
  const mod = { exports: {} as Record<string, any> };
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", js)((name: string) => imports[name] ?? inert, mod, mod.exports);
  return mod.exports;
}
const redirect = (url: string) => { throw { redirect: url }; };
async function destination(run: () => Promise<unknown>): Promise<string> {
  try { await run(); return "NO_REDIRECT"; }
  catch (error) { return String((error as { redirect?: unknown }).redirect ?? "THREW_OTHER_ERROR"); }
}
function data(fields: Record<string, string>): FormData {
  const fd = new FormData(); for (const [key, value] of Object.entries(fields)) fd.set(key, value); return fd;
}
const MARKET = "mkt_0123456789abcdef0123";
const BET = `${MARKET}.YES.5000`;
const cases: ReadonlyArray<{ name: string; next: string; expected: string }> = [
  { name: "home", next: "", expected: "/" },
  { name: "home-bet", next: `/?bet=${BET}`, expected: `/?bet=${BET}&welcome=` },
  { name: "question", next: `/markets/${MARKET}?bet=${BET}`, expected: `/markets/${MARKET}?bet=${BET}&welcome=` },
  { name: "live", next: `/live?bet=${BET}`, expected: `/live?bet=${BET}&welcome=` },
  { name: "deposit", next: `/wallet/deposit?amount=5000&bet=${BET}&from=low-balance`, expected: `/wallet/deposit?amount=5000&bet=${BET}&from=low-balance&welcome=` },
  { name: "external", next: "//evil.example", expected: "/" },
  { name: "tab-hostile", next: "/\t/evil.example", expected: "/" },
  { name: "auth-loop", next: "/auth/login", expected: "/" },
  // A door caps its own next at 512; the auth actions preserve an already-safe one of any length (S10-PLAN A6).
  { name: "long-safe", next: `/${"a".repeat(600)}`, expected: `/${"a".repeat(600)}?welcome=` },
];
const expected = (row: (typeof cases)[number], kind: "new" | "back") =>
  row.expected === "/" ? `/?welcome=${kind}` : `${row.expected}${kind}`;
function services(role: string) {
  const captures: Record<string, unknown>[] = [];
  return { captures, auth: {
    registerWithPassword: async (input: Record<string, unknown>) => { captures.push(input); return { ok: true, data: { role } }; },
    loginWithPassword: async () => ({ ok: true, data: { role } }),
    completeTwoFactorLogin: async () => ({ ok: true, data: { role } }),
  } };
}
function actionModules(w: World, role: string) {
  const s = services(role);
  const landing = compile(w.landing, {
    "@/lib/safe-next": safe, "@/lib/referral-code": referral, "@/lib/invite-code": invite,
    "@/lib/break-end": breakEnd,
  });
  const jar = { get: () => ({ value: "signed-fixture" }), set: () => {}, delete: () => {} };
  const shared = {
    "next/navigation": { redirect }, "next/headers": { cookies: async () => jar },
    "@/lib/server/auth-service": s.auth, "@/lib/auth-landing": landing, "@/lib/safe-next": safe,
    "@/lib/referral-code": referral, "@/lib/server/affiliate-service": referral,
    "@/lib/invite-code": invite, "@/lib/break-end": breakEnd,
    "@/lib/server/marketing/consent-ledger": { renderedLocaleOf: (v: unknown) => v === "sw" ? "sw" : null, messagingLocaleOf: () => "sw" },
    "@/lib/i18n-server": { getServerT: async () => ({ locale: "sw" }) },
    "@/lib/server/crypto": { verifySession: () => ({ p: "login-2fa", uid: "usr_test" }), signSession: () => "signed-fixture" },
    "@/lib/server/rate-limit": { rateCheckAsync: async () => ({ allowed: true }) },
    "@/lib/server/player-2fa": { verifyPlayer2faChallenge: async () => true },
    "@/lib/server/otp-door": { phoneCodeSignInEnabled: () => false },
  };
  return { register: compile(w.register, shared), login: compile(w.login, shared), captures: s.captures };
}

async function verdict(w: World): Promise<string[]> {
  const misses: string[] = [];
  const ok = (name: string, pass: boolean) => { if (!pass) misses.push(name); };
  const forbidden = /resolveSimpleJourney|simpleJourneyFor|journey-preview|kp_preview|journey-on/;
  ok("flag.census", !Object.values(w.auth).some(source => forbidden.test(decomment(source))) && !forbidden.test(decomment(w.landing))
    && !forbidden.test(decomment(read("src/lib/safe-next.ts"))));
  const flags = ["WITHDRAWN", "STAFF_PREVIEW", "ACTIVE"] as const;
  for (const flag of flags) for (const pass of [false, true]) {
    const shown = simpleJourneyFor(flag, pass ? { valid: true } : null);
    ok(`flag.${flag}.${pass}`, shown.journey === (flag === "ACTIVE" || flag === "STAFF_PREVIEW" && pass));
    for (const row of cases) {
      const { register, login, captures } = actionModules(w, "PLAYER");
      const code = { ref: " 50pick-ag-abc123 ", invite: " inv-9 " };
      const registered = await destination(() => register.startRegisterAction(null, data({ phone: "712345678", password: "p", passwordConfirm: "p", shownLocale: "sw", next: row.next, ...code })));
      const signedIn = await destination(() => login.startLoginAction(data({ identifier: "712345678", password: "p", next: row.next, ...code })));
      const twoFactor = await destination(() => login.verifyLogin2faAction(data({ code: "123456", next: row.next })));
      ok(`register.${flag}.${pass}.${row.name}`, registered === expected(row, "new"));
      ok(`login.${flag}.${pass}.${row.name}`, signedIn === expected(row, "back"));
      ok(`twofactor.${flag}.${pass}.${row.name}`, twoFactor === expected(row, "back"));
      ok(`codes.${flag}.${pass}.${row.name}`, captures.length === 1 && captures[0].referralCode === "50PICK-AG-ABC123" && captures[0].inviteCode === "INV-9");
    }
  }
  const staff = actionModules(w, "ADMIN");
  ok("staff", await destination(() => staff.register.startRegisterAction(null, data({ next: "/markets", shownLocale: "sw" }))) === "/admin"
    && await destination(() => staff.login.startLoginAction(data({ next: "/admin" }))) === "/admin");
  const marker = bet.writeMarker({ kind: "market", id: MARKET, side: "YES", stake: 5000 }, 100_000);
  const url = `?bet=${BET}`;
  const landed = bet.pendingBetFrom("/", new URLSearchParams(url));
  ok("return.ownerless", sheetOpensOn("/") && landed?.kind === "market" && bet.stakeFromUrl(landed, marker, 100_001, "usr_new") === 5000);
  ok("return.forwarded", bet.stakeFromUrl(landed, null, 100_001, "usr_new") === null);
  ok("return.foreign", bet.stakeFromUrl(landed, bet.writeMarker({ kind: "market", id: MARKET, side: "YES", stake: 5000 }, 100_000, undefined, undefined, "usr_other"), 100_001, "usr_new") === null);
  ok("return.expired", bet.stakeFromUrl(landed, marker, 100_000 + 24 * 60 * 60_000, "usr_new") === null);
  ok("return.round", bet.pendingBetFrom("/", new URLSearchParams("bet=udr_1.UP.5000"))?.kind === "round"
    && guestOpensFrom("/", "?bet=udr_1.UP.5000", null, 100_001) === null
    && w.host.includes('bet.kind !== "market"'));
  ok("host.owner", w.host.includes("stakeFromUrl(bet, raw, stamp, viewerId)"));
  ok("return.stopped", w.host.includes("response.status === 404) return options.key ? failed : { ...failed, bareNotFound: true }")
    && w.host.includes("truth.bareNotFound || truth.reread.state === \"read\""));
  ok("edge.query", (w.proxy.match(/url\.search = `\?next=\$\{encodeURIComponent\(pathname \+ search\)\}`;/g) ?? []).length === 2);
  return misses;
}

const baseline = await verdict(REAL);
if (!process.argv.includes("--prove-red")) {
  console.log(`post-register-landing: ${baseline.length ? `FAILED ${baseline.join(", ")}` : "all checks passed"}`);
  process.exitCode = baseline.length ? 1 : 0;
} else {
  const plants: ReadonlyArray<{ name: string; world: World; expect: string }> = [
    { name: "register sends new players straight to deposit", world: { ...REAL, register: REAL.register.replace('redirect(landingAfterAuth({ role: result.data?.role, next: safeNext, kind: "new" }) as never);', 'redirect("/wallet/deposit?welcome=new");') }, expect: "register." },
    { name: "login loses its welcome", world: { ...REAL, landing: REAL.landing.replace('return withWelcome(next || "/", opts.kind);', 'return next || "/";') }, expect: "login." },
    { name: "auth action reads the rollout", world: { ...REAL, auth: { ...REAL.auth, "register/actions.ts": `${REAL.auth["register/actions.ts"]}\nimport { resolveSimpleJourney } from "@/lib/server/journey-preview";` } }, expect: "flag.census" },
    { name: "new account's stake is not adopted", world: { ...REAL, host: REAL.host.replace("stakeFromUrl(bet, raw, stamp, viewerId)", "stakeFromUrl(bet, raw, stamp)") }, expect: "host.owner" },
    { name: "bare 404 keeps stale return bet", world: { ...REAL, host: REAL.host.replace("truth.bareNotFound || ", "") }, expect: "return.stopped" },
    { name: "edge strips deposit query", world: { ...REAL, proxy: REAL.proxy.replaceAll("encodeURIComponent(pathname + search)", "encodeURIComponent(pathname)") }, expect: "edge.query" },
  ];
  let caught = 0;
  for (const plant of plants) {
    const changed = plant.world !== REAL && Object.keys(REAL).some(key => JSON.stringify(plant.world[key as keyof World]) !== JSON.stringify(REAL[key as keyof World]));
    const misses = changed ? await verdict(plant.world) : [];
    if (changed && misses.some(name => name.startsWith(plant.expect))) { caught++; console.log(`CAUGHT ${plant.name}`); }
    else console.log(`MISSED ${plant.name}: ${misses.join(", ")}`);
  }
  console.log(`post-register-landing red: ${caught}/${plants.length} caught`);
  process.exitCode = baseline.length || caught !== plants.length ? 1 : 0;
}
