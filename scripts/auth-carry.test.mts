/** S10's auth continuity, executed from the real source in memory. No server, store, storage write or money action.
 * Pages use the real dictionary with inert component exports; actions use a named wrong-password refusal and a
 * throwing redirect seam. Negative controls replace real source, then rerun the identical verdict population.
 */
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as SN from "../src/lib/safe-next.ts";
import * as RC from "../src/lib/referral-code.ts";
import { dict } from "../src/lib/i18n-dict.ts";

const files = {
  invite: "src/lib/invite-code.ts", landing: "src/lib/auth-landing.ts", pending: "src/lib/journey/pending-bet.ts",
  loginPage: "src/app/auth/login/page.tsx", loginAction: "src/app/auth/login/actions.ts",
  registerPage: "src/app/auth/register/page.tsx", registerForm: "src/app/auth/register/register-form.tsx",
  registerAction: "src/app/auth/register/actions.ts",
};
type World = Record<keyof typeof files, string>;
const clean = Object.fromEntries(Object.entries(files).map(([k, p]) => [k, readFileSync(p, "utf8")])) as World;
const inert = Object.assign(() => null, { displayName: "inert" });
const fallback = new Proxy({}, { get: () => inert });
type Node = { type: unknown; props: Record<string, unknown> };
const jsx = (type: unknown, props: Record<string, unknown>): Node => ({ type, props });
function compile(source: string, imports: Record<string, unknown> = {}, hooks: Record<string, unknown> = {}) {
  const module = { exports: {} as Record<string, any> };
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const require = (name: string) => name === "react/jsx-runtime" ? { jsx, jsxs: jsx, Fragment: "fragment" }
    : name === "react" ? { useRef: () => ({ current: null }), useEffect: () => {}, useState: (v: unknown) => [v, inert], startTransition: inert, ...hooks }
    : name === "next/navigation" ? { redirect: (url: string) => { throw { redirect: url }; } }
    : name === "next/headers" ? { cookies: async () => ({ get: () => undefined }) }
    : name === "@/lib/i18n-server" ? { getServerT: async () => ({ t: dict.en, locale: "en" }) }
    : name === "../bounce-authed" ? { bounceIfAuthed: async () => {} }
    : name === "@/lib/server/session" ? { sessionEndedThisRequest: () => null }
    : name === "./refusal" ? imports[name] ?? { REGISTER_INVALID_REASONS: [], refusalField: () => null }
    : imports[name] ?? fallback;
  new Function("require", "module", "exports", js)(require, module, module.exports);
  return module.exports;
}
function values(tree: unknown, key: string): unknown[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((n) => values(n, key));
  const obj = tree as Record<string, unknown>;
  return [...(Object.hasOwn(obj, key) ? [obj[key]] : []), ...Object.values(obj).flatMap((n) => values(n, key))];
}
function hidden(tree: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const visit = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(visit); return; }
    const node = n as Node;
    if (node.type === "input" && node.props?.type === "hidden") out[String(node.props.name)] = String(node.props.value);
    Object.values(n).forEach(visit);
  };
  visit(tree); return out;
}
const M = "mkt_0123456789abcdef0123";
const NEXT = `/markets/${M}?bet=${M}.YES.5000`;
const ref = "50PICK-AG-ABC123", invite = "INV-9";
const search = { next: NEXT, ref: " 50pick-ag-abc123 ", invite: " inv-9 " };
const queryOf = (href: unknown) => new URL(String(href), "https://same.invalid").searchParams;
function carries(href: unknown) {
  const q = queryOf(href);
  return q.get("next") === NEXT && q.get("ref") === ref && q.get("invite") === invite;
}
async function verdict(w: World): Promise<string[]> {
  const failures: string[] = [];
  const ok = (label: string, cond: unknown) => { if (!cond) failures.push(label); };
  const IC = compile(w.invite);
  const imports = { "@/lib/safe-next": SN, "@/lib/referral-code": RC, "@/lib/invite-code": IC };
  const AL = compile(w.landing, imports), PB = compile(w.pending, imports);
  ok("invite.canonical", IC.normalizeInviteCode(" inv-9 ") === invite && IC.normalizeInviteCode("camp_1") === "CAMP_1"
    && IC.normalizeInviteCode("a b") === "A B" && IC.normalizeInviteCode("A".repeat(24)) === "A".repeat(24));
  ok("invite.refuse", IC.normalizeInviteCode("A".repeat(25)) === null && IC.normalizeInviteCode("") === null);
  ok("invite.controls", [0, 9, 10, 13, 31, 127].every((c) => IC.normalizeInviteCode(`A${String.fromCharCode(c)}B`) === null));
  const doors = AL.authDoorHrefs(`/markets/${M}`, new URLSearchParams({ bet: `${M}.YES.5000`, ref: search.ref, invite: search.invite }));
  ok("doors.origin", carries(doors.signIn) && carries(doors.signUp));
  const authDoors = AL.authDoorHrefs("/auth/login", new URLSearchParams({ ...search, token: "PRIVATE_RESET_TOKEN" }));
  ok("doors.auth", carries(authDoors.signIn) && carries(authDoors.signUp) && !authDoors.signIn.includes("PRIVATE_RESET_TOKEN"));
  const hostile = AL.authDoorHrefs("/auth/login", new URLSearchParams({ next: "//evil.example", ref: "abc_123", invite: "X".repeat(25) }));
  ok("doors.hostile", hostile.signIn === "/auth/login" && hostile.signUp === "/auth/register");
  const attr = PB.attributionFrom(new URLSearchParams({ ref: search.ref, invite: search.invite, utm_source: "friend" }));
  ok("marker.new-attribution", attr.ref === ref && attr.invite === invite && attr.utm?.utm_source === "friend");
  ok("marker.invalid-ref", !PB.attributionFrom(new URLSearchParams("ref=abc_123")).ref);
  // A named limitation, not a universal-campaign claim: auth accepts the real store's space-containing form;
  // the historic pending envelope cannot carry it yet. Do not broaden that disclosed storage format silently.
  ok("marker.invite-envelope", IC.normalizeInviteCode("a b") === "A B" && !PB.attributionFrom(new URLSearchParams("invite=a b")).invite);
  const bet = PB.parseBetParam(`${M}.YES.5000`), now = 100000, key = "12345678-1234-1234-1234-123456789abc";
  const legacy = JSON.stringify({ bet: `${M}.YES.5000`, at: now, k: key, ref: "abc_123", invite: "x".repeat(30), utm: { utm_source: "friend" } });
  const old = PB.readMarker(legacy, now);
  ok("marker.old-readable", old?.bet === `${M}.YES.5000` && old.k === key && old.ref === "abc_123" && old.invite === "x".repeat(30)
    && PB.stakeFromUrl(bet, legacy, now) === null);
  const rewritten = PB.readMarker(PB.writeMarker(bet, now, old, key), now);
  ok("marker.new-write", rewritten?.bet === old.bet && rewritten.k === key && rewritten.utm?.utm_source === "friend"
    && !rewritten.ref && !rewritten.invite);
  ok("landing.intent", AL.landingAfterAuth({ role: "PLAYER", next: NEXT, kind: "new" }) === `${NEXT}&welcome=new`
    && AL.landingAfterAuth({ role: "PLAYER", next: "", kind: "new" }) === "/?welcome=new");

  const pageImports = { ...imports, "@/lib/auth-landing": AL };
  const login = await compile(w.loginPage, pageImports).default({ searchParams: Promise.resolve(search) });
  const loginFields = hidden(login);
  ok("login.hidden", loginFields.next === NEXT && loginFields.ref === ref && loginFields.invite === invite);
  const registerLinks = values(login, "href").filter((v) => String(v).startsWith("/auth/register"));
  ok("login.cross-link", registerLinks.length >= 1 && registerLinks.every(carries));
  const formData = new FormData(); for (const [k, v] of Object.entries({ ...search, identifier: "player@example.test", password: "wrong" })) formData.set(k, v);
  let redirected = "";
  const action = compile(w.loginAction, { ...pageImports, "@/lib/server/auth-service": { loginWithPassword: async () => ({ ok: false, code: "NOT_FOUND", error: "no account" }) } });
  try { await action.startLoginAction(formData); } catch (e) { redirected = String((e as { redirect?: string }).redirect ?? ""); }
  ok("login.failure", carries(redirected) && queryOf(redirected).get("identifier") === "player@example.test");
  const register = await compile(w.registerPage, { ...pageImports, "@/lib/server/affiliate-service": { resolveReferralPreview: async () => ({ referrerName: "Peer", newPlayerBonusTzs: 0 }) },
    "@/lib/server/invite-service": { getInvitePreview: async () => ({ name: "Campaign", bonusAmountTzs: 0 }) } }).default({ searchParams: Promise.resolve(search) });
  const regFields = hidden(register);
  ok("register.hidden", regFields.next === NEXT && regFields.ref === ref && regFields.invite === invite);
  const signInLinks = values(register, "href").filter((v) => String(v).startsWith("/auth/login"));
  ok("register.cross-link", signInLinks.length >= 1 && signInLinks.every(carries));
  const formProps = values(register, "props").find((v) => v && typeof v === "object" && "phoneDefault" in v) as Record<string, unknown>;
  ok("register.form-carry", formProps?.refCode === ref && formProps?.inviteCode === invite && formProps?.nextOk === NEXT);
  let previewCalls = 0;
  const malformedPage = await compile(w.registerPage, { ...pageImports,
    "@/lib/server/affiliate-service": { resolveReferralPreview: async () => null },
    "@/lib/server/invite-service": { getInvitePreview: async () => { previewCalls++; return null; } } }).default({ searchParams: Promise.resolve({ invite: "A\u0000B" }) });
  ok("register.preview-controls", previewCalls === 0 && !hidden(malformedPage).invite);
  for (const code of ["exists", "email_exists"]) {
    const form = compile(w.registerForm, pageImports, { useActionState: () => [{ code, phone: "712345678", email: "player@example.test", at: 1 }, inert, false] });
    const rendered = form.RegisterForm({ copy: dict.en.auth, phoneDefault: "", emailDefault: "", nextOk: NEXT, refCode: ref, inviteCode: invite, dobMax: "2000-01-01" });
    const links = values(rendered, "href").filter((v) => String(v).startsWith("/auth/login"));
    ok(`register.panel-${code}`, links.length === 1 && carries(links[0]));
  }
  // Invoke the full actual action: the service's INPUT is the proof, not merely a nearby normalized declaration.
  // Registration refuses in this seam, so no account/session/binding is created; the same mounted-form refusal returns.
  const inputs: Record<string, unknown>[] = [], refusals: unknown[] = [];
  const registerAction = compile(w.registerAction, { ...pageImports, "@/lib/server/affiliate-service": RC,
    "@/lib/server/auth-service": { registerWithPassword: async (input: Record<string, unknown>) => { inputs.push(input); return { ok: false, code: "INVALID", error: "fixture refusal" }; } },
    "@/lib/server/marketing/consent-ledger": { renderedLocaleOf: () => "en", messagingLocaleOf: () => "EN" },
    "./refusal": { registerRefusalOf: () => "mounted-form-refusal" } });
  for (const raw of [" inv-9 ", "X".repeat(25), "A\u0000B"]) {
    const data = new FormData(); data.set("invite", raw); data.set("ref", search.ref); data.set("next", NEXT);
    refusals.push(await registerAction.startRegisterAction(null, data));
  }
  ok("register.action-canonical", inputs.length === 3 && inputs[0].inviteCode === invite && inputs[1].inviteCode === undefined && inputs[2].inviteCode === undefined
    && inputs.every((i) => i.referralCode === ref) && refusals.every((r) => r === "mounted-form-refusal"));
  return failures;
}
const initial = await verdict(clean);
console.log(`auth-carry: ${initial.length ? initial.join(", ") : "all 22 executed verdicts passed"}`);
let bad = initial.length;
if (process.argv.includes("--prove-red")) {
  const plants: Array<[keyof World, string, string, string]> = [
    ["invite", "code.length <= MAX_INVITE_CODE_LEN", "true", "invite.refuse"],
    ["invite", 'const code = (raw ?? "").trim().toUpperCase();', 'const code = (raw ?? "").trim();', "invite.canonical"],
    ["invite", 'if (c < 0x20 || c === 0x7f) return null;', '', "invite.controls"],
    ["pending", 'if (invite && CODE.test(invite)) out.invite = invite;', 'if (invite) out.invite = invite;', "marker.invite-envelope"],
    ["registerPage", 'normalizeInviteCode(sp.invite) ?? ""', '(sp.invite ?? "").trim().slice(0, 24)', "register.preview-controls"],
    ["landing", 'if (invite) qs.set("invite", invite);', '', "doors.origin"],
    ["landing", 'k !== "ref" && k !== "invite"', 'k !== "ref"', "doors.origin"],
    ["landing", 'boundedNext((search.get("next") ?? "").trim())', '(search.get("next") ?? "").trim()', "doors.hostile"],
    ["pending", 'normalizeReferralCode(search.get("ref"))', 'search.get("ref")', "marker.invalid-ref"],
    ["pending", '...attributionFrom(search)', '...attribution', "marker.new-write"],
    ["pending", 'if (typeof m.ref === "string" && CODE.test(m.ref)) out.ref = m.ref;', '', "marker.old-readable"],
    ["loginPage", '{inviteCode && <input type="hidden" name="invite" value={inviteCode} />}', '', "login.hidden"],
    ["loginPage", 'if (inviteCode) keepQs.set("invite", inviteCode);', '', "login.cross-link"],
    ["loginAction", 'if (invite) params.set("invite", invite);', '', "login.failure"],
    ["registerPage", 'if (inviteCode) signInQs.set("invite", inviteCode);', '', "register.cross-link"],
    ["registerPage", 'inviteCode={inviteCode}', 'inviteCode=""', "register.form-carry"],
    ["registerForm", '${nextQs}${codeQs}', '${nextQs}', "register.panel-exists"],
    ["registerForm", 'if (ref) codes.set("ref", ref);', '', "register.panel-email_exists"],
    ["registerAction", 'normalizeInviteCode(String(formData.get("invite") ?? "")) ?? undefined', 'String(formData.get("invite") ?? "").trim().slice(0, 24) || undefined', "register.action-canonical"],
    ["registerAction", 'acceptTerms, acceptAge, referralCode, inviteCode,', 'acceptTerms, acceptAge, referralCode, inviteCode: undefined,', "register.action-canonical"],
  ];
  for (const [file, before, after, wanted] of plants) {
    const occurrences = clean[file].split(before).length - 1;
    if (occurrences < 1) throw new Error(`missing live mutation anchor: ${file} ${wanted}`);
    const world = { ...clean, [file]: clean[file].replace(before, after) };
    const failures = await verdict(world);
    const hit = failures.includes(wanted);
    console.log(`${hit ? "PROVED" : "MISSED"} ${file}: ${wanted}`);
    if (!hit) bad++;
  }
  console.log(`auth-carry red: ${plants.length} actual-source plants`);
}
process.exitCode = bad ? 1 : 0;
