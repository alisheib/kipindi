/**
 * THE PLAYER TERMS, AND THE VERSION THAT HAS TO MOVE WITH THEM.
 *
 * 🔴 WHAT THIS CLOSES, AND IT WAS LIVE (found 2026-09-13, audit session 95). `/legal/terms` printed
 * "Version 2026-09-13" from the moment `1699c17a` deployed, while `auth-service.ts` went on stamping
 * `acceptedTermsVersion = "2026-09-09"` on every registration. Production held a player registered
 * at 19:14 UTC — two hours after the deploy — recorded as accepting 2026-09-09. They were shown §3a
 * (what happens if we cannot verify you), the clause the whole identity-at-withdrawal ruling rests on,
 * and the record says they accepted a text without it.
 *
 * ⭐ WHY NOTHING CAUGHT IT: the page and the stamp were two string literals in two files, and the only
 * control was a comment ("MOVE THIS WHENEVER THE BINDING TEXT MOVES"). The agent terms had already paid
 * for exactly this (`agent-terms-version.ts`, `test:agent-terms-binding` §3/§4) and the player terms
 * never got the same control. Before the release the two literals disagreed in the OTHER direction
 * (page 2026-09-07, stamp 2026-09-09) — so this is not a one-off slip but a structure that drifts.
 *
 * WHAT IT ASSERTS
 *   §1 · the page and BOTH registration stamps read ONE shared constant, and no literal date remains.
 *   §2 · the binding bodies are pinned by a hash beside the version, so the text cannot move without
 *        the editor facing the version — with a ratchet on the extraction and a discrimination control,
 *        because an extractor that finds nothing hashes "" and agrees with itself forever.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { decomment } from "./lib/decomment.mts";
import { TERMS_VERSION, TERMS_TEXT_SHA } from "../src/lib/terms-version.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 60 - s.length))}`);

const TERMS = "src/app/legal/terms/page.tsx";
const AUTH = "src/lib/server/auth-service.ts";

/** The binding bodies: `content()` from its signature to the page component. Exported for the controls. */
export function extractBodies(raw: string): string {
  const start = raw.indexOf("export function content(");
  const end = raw.indexOf("export default async function TermsPage");
  return start >= 0 && end > start ? raw.slice(start, end) : "";
}
/**
 * ⭐ AND THE BINDING-LANGUAGE SENTENCE the page renders above the bodies ("The English version … is the legally
 * binding text"), which lives in `_components.tsx` and is shared by every legal page (P0 adversarial review,
 * 2026-09-13). An edit there changes what a Terms signatory accepts, so it must move this hash too.
 * ⚠️ Values filled in at RUNTIME — the §6 objection window and the §6 dispute address — are officer config, not
 * text: they are rebuilt for any date from the `config.*` audit trail, and are deliberately not hashed.
 */
export function extractBinding(raw: string): string {
  const start = raw.indexOf("export const LEGAL_BINDING_LANGUAGE");
  const end = start >= 0 ? raw.indexOf("};", start) : -1;
  return start >= 0 && end > start ? raw.slice(start, end + 2) : "";
}
export const hashBodies = (bodies: string) =>
  createHash("sha256").update(bodies.replace(/\s+/g, " ").trim(), "utf8").digest("hex").slice(0, 12);

/** §1's predicate, as a function, so its controls drive the SAME code the real check runs. */
export function stampsShared(page: string, auth: string): { page: boolean; auth: boolean; stamps: number; literals: string[] } {
  const p = decomment(page);
  const a = decomment(auth);
  const metaBlock = p.slice(p.indexOf("const META"), p.indexOf("};", p.indexOf("const META")) + 2);
  const pageOk = /import\s*\{[^}]*\bTERMS_VERSION\b[^}]*\}\s*from\s*"@\/lib\/terms-version"/.test(p)
    && (metaBlock.match(/\$\{TERMS_VERSION\}/g) ?? []).length === 3
    && !/20\d\d-\d\d-\d\d/.test(metaBlock);
  const stamps = (a.match(/acceptedTermsVersion:\s*TERMS_VERSION\b/g) ?? []).length;
  const literals = a.match(/acceptedTermsVersion:\s*["'`][^"'`]*["'`]/g) ?? [];
  const authOk = /import\s*\{[^}]*\bTERMS_VERSION\b[^}]*\}\s*from\s*"@\/lib\/terms-version"/.test(a)
    && !/const\s+TERMS_VERSION\s*=/.test(a)
    && literals.length === 0;
  return { page: pageOk, auth: authOk, stamps, literals };
}

const pageSrc = read(TERMS);
const authSrc = read(AUTH);

// ═══ §1 · WHAT A PERSON READ AND WHAT WAS RECORDED CANNOT DIVERGE ═════════════════════════
section("§1 · the page and the registration stamp read one constant");
{
  const r = stampsShared(pageSrc, authSrc);
  ok("1.1 ⛔ /legal/terms imports TERMS_VERSION and prints it in all three META lines, with no literal date",
    r.page, "the page's META carries a hard-coded date or does not read the shared constant");
  ok("1.2 ⛔ auth-service imports TERMS_VERSION, defines no local copy, and stamps no literal",
    r.auth, `literals=${JSON.stringify(r.literals)}`);
  // Both registration doors — the password form and the one-time-code path — write a new user.
  ok("1.3 ⛔ RATCHET · both registration paths stamp the shared constant (≥ 2 sites)", r.stamps >= 2, `stamps=${r.stamps}`);
  // Every `db.user.create` in auth-service must be one of the stamped paths — a third door with no stamp
  // would record nothing at all.
  const creates = (decomment(authSrc).match(/db\.user\.create\(/g) ?? []).length;
  ok("1.4 ⛔ every user this service creates is stamped (creates ≤ stamps)", creates > 0 && creates <= r.stamps, `creates=${creates} stamps=${r.stamps}`);
  ok("1.5 ⛔ the version is an ISO date", /^\d{4}-\d{2}-\d{2}$/.test(TERMS_VERSION), TERMS_VERSION);
  ok("1.6 ⛔ …and it is not the stamp that was live while the page published 2026-09-13",
    TERMS_VERSION !== "2026-09-09", TERMS_VERSION);

  // ⭐ CONTROLS — the predicate must FAIL on each shape of the defect, or §1 proves nothing.
  const literalMeta = pageSrc.replace(/\$\{TERMS_VERSION\}/, "2026-09-13");
  ok("1.7 ⭐ CONTROL · a literal date back in one META line is caught", !stampsShared(literalMeta, authSrc).page);
  const localConst = authSrc.replace(/import\s*\{\s*TERMS_VERSION\s*\}\s*from\s*"@\/lib\/terms-version";?/, 'const TERMS_VERSION = "2026-09-09";');
  ok("1.8 ⭐ CONTROL · a local copy of the constant in auth-service is caught", !stampsShared(pageSrc, localConst).auth);
  const literalStamp = authSrc.replace(/acceptedTermsVersion:\s*TERMS_VERSION\b/, 'acceptedTermsVersion: "2026-09-13"');
  ok("1.9 ⭐ CONTROL · one registration path stamping a literal is caught", !stampsShared(pageSrc, literalStamp).auth);
}

// ═══ §2 · THE VERSION MOVES WHEN THE BINDING TEXT MOVES ══════════════════════════════════
section("§2 · the version cannot lag the binding text");
{
  const bodies = extractBodies(pageSrc);
  ok("2.0 ⛔ RATCHET · the binding bodies were extracted (a short slice is not a document)",
    bodies.length > 20000, `len=${bodies.length}`);
  ok("2.0b CONTROL · …and the slice spans all THREE locales, §3a included in each",
    /If we cannot verify you/.test(bodies) && /Tusipoweza kukuthibitisha/.test(bodies) && /如果我们无法验证您的身份/.test(bodies),
    "an anchor heading is missing from the slice — the extractor is blind and §2.1 is vacuous");
  ok("2.0c CONTROL · …and it holds the payout clause (§5) in each locale, the text most likely to move",
    /Settlement and payout/.test(bodies) && /Ufungaji na malipo/.test(bodies) && /结算与派彩/.test(bodies));

  const binding = extractBinding(read("src/app/legal/_components.tsx"));
  ok("2.0d CONTROL · …and the binding-language sentence the page renders above them was extracted, in all three locales",
    /legally binding text/.test(binding) && /nguvu ya kisheria/.test(binding) && /具有法律约束力/.test(binding), `len=${binding.length}`);
  const pinned = bodies + "\n" + binding;
  const sha = hashBodies(pinned);
  ok("2.1 🔴 the pinned hash matches the binding text — if this fails, MOVE THE VERSION TOO",
    sha === TERMS_TEXT_SHA,
    `binding text hashes to ${sha}, terms-version.ts pins ${TERMS_TEXT_SHA}\n` +
    `       ⛔ Do NOT just paste the new hash. The text changed, so TERMS_VERSION must move in the SAME commit\n` +
    `          (or a same-day player-favourable amendment is recorded in COMPLIANCE-DECISIONS.md).`);

  const mutated = hashBodies(pinned.replace("If we cannot verify you", "If we can not verify you"));
  ok("2.2 ⭐ CONTROL · a one-word change to the binding bodies produces a DIFFERENT hash", mutated !== sha, `both ${sha}`);
  ok("2.2b ⭐ CONTROL · …and so does a one-word change to the binding-language sentence",
    hashBodies(pinned.replace("legally binding text", "legally binding version")) !== sha);
  ok("2.3 ⭐ CONTROL · a whitespace-only reformat does NOT move the hash",
    hashBodies(pinned.replace(/\n/g, "\n  ")) === sha);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
