/**
 * test:maswali-rollout — MILLIONEA IS DARK UNTIL ALI DECIDES, AND EVERY SURPRISE KEEPS IT DARK (MASWALI-BUILD S1).
 *
 *   npx tsx scripts/maswali-rollout.test.mts     (npm run test:maswali-rollout)
 *
 *   §1 it ships WITHDRAWN in code; the env ceiling takes exactly the three words and nothing else
 *   §2 the truth table: ABSENT → the ceiling; SET → the lower; UNREAD and MALFORMED → WITHDRAWN
 *   §3 the Owner's sealed switch: written, read back, and a hand edit or a forged row is MALFORMED
 *   §4 who sees it: WITHDRAWN nobody; STAFF_PREVIEW a STORED staff role on an open account; ACTIVE everyone
 *   §5 ⛔ the rollout lives in its own module — `feature-state.ts` (the Vodacom flip's file) never names Millionea
 *
 * In-memory: no DATABASE_URL, so the switch row lives in process memory.
 */
import { readFileSync } from "node:fs";
import { MILLIONEA_ENV, MILLIONEA_SHIPPED, composeMillionea, millioneaCeiling, millioneaVisibleFor } from "../src/lib/millionea-rollout.ts";
import {
  MILLIONEA_SWITCH_PURPOSE, __setMillioneaSwitchStoreForTests, millioneaStateNow, parseStoredMillioneaSwitch, readMillioneaSwitchFresh,
  sealMillioneaSwitch, writeMillioneaSwitchVerified,
} from "../src/lib/server/millionea-switch.ts";
import { resolveMillioneaFor } from "../src/lib/server/millionea-preview.ts";
import { signSession } from "../src/lib/server/crypto.ts";

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const WORDS = ["WITHDRAWN", "STAFF_PREVIEW", "ACTIVE"] as const;
const setEnv = (v: string | undefined) => { if (v === undefined) delete process.env[MILLIONEA_ENV]; else process.env[MILLIONEA_ENV] = v; };
const record = (cap: (typeof WORDS)[number], seq = 1) => ({ cap, seq, changedAt: "2026-10-20T09:00:00.000Z", changedBy: "usr_owner", reason: "Staff preview for the owner's look" });

// ── §1 · the ceiling ────────────────────────────────────────────────────────
console.log("\n§1 · it ships WITHDRAWN; the env takes the three words exactly");
{
  ok("1.1 · the shipped constant is WITHDRAWN", MILLIONEA_SHIPPED === "WITHDRAWN");
  setEnv(undefined);
  ok("1.2 · no env → the code's WITHDRAWN", JSON.stringify(millioneaCeiling()) === JSON.stringify({ ceiling: "WITHDRAWN", source: "CODE" }));
  for (const w of WORDS) { setEnv(w); ok(`1.3 · env ${w} → ${w}`, millioneaCeiling().ceiling === w && millioneaCeiling().source === "ENV"); }
  for (const typo of ["active", "ACTIVE ", "STAFF-PREVIEW", "", "1", "true"]) {
    setEnv(typo);
    ok(`1.4 · ⛔ env ${JSON.stringify(typo)} is not a word — the code's WITHDRAWN`, millioneaCeiling().ceiling === "WITHDRAWN" && millioneaCeiling().source === "CODE");
  }
  setEnv(undefined);
}

// ── §2 · the truth table ────────────────────────────────────────────────────
console.log("\n§2 · the truth table");
{
  for (const c of WORDS) {
    ok(`2.1 · ABSENT under ${c} → ${c} (no cap)`, composeMillionea(c, { kind: "ABSENT" }) === c);
    ok(`2.2 · ⛔ UNREAD under ${c} → WITHDRAWN`, composeMillionea(c, { kind: "UNREAD" }) === "WITHDRAWN");
    ok(`2.3 · ⛔ MALFORMED under ${c} → WITHDRAWN`, composeMillionea(c, { kind: "MALFORMED" }) === "WITHDRAWN");
    for (const s of WORDS) {
      const want = WORDS[Math.min(WORDS.indexOf(c), WORDS.indexOf(s))];
      ok(`2.4 · SET ${s} under ${c} → ${want} (the lower)`, composeMillionea(c, { kind: "SET", cap: s }) === want);
    }
  }
  ok("2.5 · ⛔ a ceiling that is not a word → WITHDRAWN", composeMillionea("LIVE" as never, { kind: "ABSENT" }) === "WITHDRAWN");
}

// ── §3 · the sealed switch ──────────────────────────────────────────────────
console.log("\n§3 · the Owner's sealed switch");
{
  __setMillioneaSwitchStoreForTests(null);
  ok("3.1 · an empty store is ABSENT", (await readMillioneaSwitchFresh()).kind === "ABSENT");
  setEnv("ACTIVE");
  ok("3.2 · …so under an ACTIVE ceiling the state is the ceiling", (await millioneaStateNow(0)) === "ACTIVE");
  const w = await writeMillioneaSwitchVerified(record("STAFF_PREVIEW"));
  ok("3.3 · a write is read back field by field", w.ok && w.stored.cap === "STAFF_PREVIEW" && w.stored.seq === 1, JSON.stringify(w));
  ok("3.4 · the Owner's cap lowers an ACTIVE ceiling to STAFF_PREVIEW", (await millioneaStateNow(0)) === "STAFF_PREVIEW");
  setEnv("STAFF_PREVIEW");
  await writeMillioneaSwitchVerified(record("ACTIVE", 2));
  ok("3.5 · ⛔ the Owner's ACTIVE cannot lift a STAFF_PREVIEW ceiling", (await millioneaStateNow(0)) === "STAFF_PREVIEW");
  setEnv(undefined);
  ok("3.6 · ⛔ under the shipped ceiling NOTHING stored shows Millionea", (await millioneaStateNow(0)) === "WITHDRAWN");
  // Hand edits and forgeries.
  // Sealed at WITHDRAWN, so the tamper below (to ACTIVE) really changes the payload.
  const sealed = sealMillioneaSwitch(record("WITHDRAWN"));
  ok("3.7 · a sealed record parses", parseStoredMillioneaSwitch(sealed).kind === "SET");
  ok("3.8 · ⛔ a row with an extra field is MALFORMED", parseStoredMillioneaSwitch({ ...sealed, cap: "ACTIVE" }).kind === "MALFORMED");
  ok("3.9 · ⛔ a hand-written plain object is MALFORMED", parseStoredMillioneaSwitch({ cap: "ACTIVE" }).kind === "MALFORMED");
  const [b64, mac] = sealed.token.split(".");
  const flipped = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b64, "base64url").toString()), cap: "ACTIVE" })).toString("base64url");
  ok("3.10 · ⛔ an edited payload under the old signature is MALFORMED", parseStoredMillioneaSwitch({ token: `${flipped}.${mac}` }).kind === "MALFORMED");
  const other = signSession({ purpose: "journey.rollout.switch", v: 1, cap: "ACTIVE", seq: 1, changedAt: "2026-10-20T09:00:00.000Z", changedBy: "usr_owner", reason: "Journey record" });
  ok("3.11 · ⛔ another switch's genuine record (the journey's purpose) is MALFORMED here", parseStoredMillioneaSwitch({ token: other }).kind === "MALFORMED");
  ok("3.12 · the purpose sealed in is Millionea's own", MILLIONEA_SWITCH_PURPOSE === "millionea.rollout.switch");
  ok("3.13 · ⛔ a reason under 5 characters is MALFORMED", parseStoredMillioneaSwitch(sealMillioneaSwitch({ ...record("ACTIVE"), reason: "ok" })).kind === "MALFORMED");
  ok("3.14 · ⛔ a cap that is not a word is MALFORMED", parseStoredMillioneaSwitch(sealMillioneaSwitch({ ...record("ACTIVE"), cap: "LIVE" as never })).kind === "MALFORMED");
  // A store that throws on read is UNREAD, and UNREAD is WITHDRAWN even under ACTIVE.
  setEnv("ACTIVE");
  __setMillioneaSwitchStoreForTests({ hasDatabase: () => true, loadConfigResult: async () => { throw new Error("db down"); }, saveConfig: async () => {} });
  ok("3.15 · ⛔ an unreadable store under an ACTIVE ceiling is WITHDRAWN", (await millioneaStateNow(0)) === "WITHDRAWN");
  __setMillioneaSwitchStoreForTests({ hasDatabase: () => true, loadConfigResult: async () => ({ ok: false, error: "timeout" }), saveConfig: async () => {} });
  ok("3.16 · ⛔ a store that answers 'could not read' is WITHDRAWN", (await millioneaStateNow(0)) === "WITHDRAWN");
  __setMillioneaSwitchStoreForTests(null);
  setEnv(undefined);
}

// ── §4 · who sees it ────────────────────────────────────────────────────────
console.log("\n§4 · who sees it");
{
  const users: Record<string, { role: string; status: string }> = {
    staff: { role: "SUPPORT", status: "ACTIVE" },
    owner: { role: "ADMIN", status: "ACTIVE" },
    player: { role: "PLAYER", status: "ACTIVE" },
    suspendedStaff: { role: "MODERATOR", status: "SUSPENDED" },
  };
  const findUser = async (id: string) => users[id] ?? null;
  const at = (state: (typeof WORDS)[number]) => ({ findUser, stateNow: async () => state });
  for (const who of ["staff", "owner", "player", "suspendedStaff", null] as const) {
    const r = await resolveMillioneaFor({ sessionUserId: who }, at("WITHDRAWN"));
    ok(`4.1 · ⛔ WITHDRAWN hides it from ${who ?? "a signed-out visitor"}`, !r.visible && !r.preview && r.state === "WITHDRAWN");
  }
  const s = await resolveMillioneaFor({ sessionUserId: "staff" }, at("STAFF_PREVIEW"));
  ok("4.2 · STAFF_PREVIEW shows it to a staff session, wearing the Preview mark", s.visible && s.preview);
  ok("4.3 · …and to the Owner", (await resolveMillioneaFor({ sessionUserId: "owner" }, at("STAFF_PREVIEW"))).visible);
  ok("4.4 · ⛔ …never to a player", !(await resolveMillioneaFor({ sessionUserId: "player" }, at("STAFF_PREVIEW"))).visible);
  ok("4.5 · ⛔ …never to a signed-out visitor", !(await resolveMillioneaFor({ sessionUserId: null }, at("STAFF_PREVIEW"))).visible);
  ok("4.6 · ⛔ …never to a SUSPENDED staff account (the stored row decides, not the cookie)", !(await resolveMillioneaFor({ sessionUserId: "suspendedStaff" }, at("STAFF_PREVIEW"))).visible);
  ok("4.7 · ⛔ …never to an id the store cannot find", !(await resolveMillioneaFor({ sessionUserId: "ghost" }, at("STAFF_PREVIEW"))).visible);
  ok("4.8 · ⛔ a lookup that throws is not staff", !(await resolveMillioneaFor({ sessionUserId: "staff" }, { findUser: async () => { throw new Error("db"); }, stateNow: async () => "STAFF_PREVIEW" })).visible);
  ok("4.9 · a verified pass (S4) shows it to a player at STAFF_PREVIEW", (await resolveMillioneaFor({ sessionUserId: "player", pass: true }, at("STAFF_PREVIEW"))).visible);
  ok("4.10 · ⛔ …but a pass means nothing at WITHDRAWN", !(await resolveMillioneaFor({ sessionUserId: "player", pass: true }, at("WITHDRAWN"))).visible);
  const a = await resolveMillioneaFor({ sessionUserId: null }, at("ACTIVE"));
  ok("4.11 · ACTIVE shows it to everyone, with no Preview mark", a.visible && !a.preview);
  ok("4.12 · ⛔ a switch read that throws hides it", !(await resolveMillioneaFor({ sessionUserId: "staff" }, { findUser, stateNow: async () => { throw new Error("x"); } })).visible);
  ok("4.13 · the pure rule agrees: STAFF_PREVIEW + nobody → hidden", JSON.stringify(millioneaVisibleFor("STAFF_PREVIEW", { staff: false, pass: false })) === JSON.stringify({ visible: false, preview: false }));
}

// ── §5 · its own module ─────────────────────────────────────────────────────
console.log("\n§5 · ⛔ the rollout lives outside feature-state.ts");
{
  const fs = readFileSync(new URL("../src/lib/feature-state.ts", import.meta.url), "utf8");
  ok("5.1 · feature-state.ts never names Millionea (the Vodacom S15 flip edits that file)", !/millionea|maswali/i.test(fs));
  const mod = readFileSync(new URL("../src/lib/millionea-rollout.ts", import.meta.url), "utf8");
  const imports = [...mod.matchAll(/^import\s+[^;]+from\s+"([^"]+)";/gm)].map((m) => m[1]);
  ok("5.2 · millionea-rollout.ts imports only the journey's rollout primitives", JSON.stringify(imports) === JSON.stringify(["@/lib/feature-state"]), JSON.stringify(imports));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI ROLLOUT: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run PRINTED (MASWALI-BUILD S1, the first run); it only rises, to a printed number. */
const MIN_ASSERTIONS = 1;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
