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
 *   §1 · the page and the registration stamp read ONE version — the one of the rendering in force,
 *        `termsVersionFor(millioneaWordingPublished())` — and no literal date remains.
 *   §2 · each rendering's binding bodies are pinned by a hash beside its version — below the Millionea ceiling
 *        `TERMS_TEXT_SHA` (v`TERMS_VERSION`), above it `TERMS_TEXT_SHA_WITH_MILLIONEA` — so the text cannot move without
 *        the editor facing the version, with a ratchet on the extraction and discrimination controls, because an
 *        extractor that finds nothing hashes "" and agrees with itself forever.
 *   §3 · (2026-10-23, OD-18) §4's Maswali Millionea paragraph: one per language, inside §4, inside the
 *        `MillioneaWording` wrapper, linking the binding rules — and below the ceiling the Terms name Millionea nowhere.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { decomment } from "./lib/decomment.mts";
import { TERMS_VERSION, TERMS_TEXT_SHA, TERMS_VERSION_WITH_MILLIONEA, TERMS_TEXT_SHA_WITH_MILLIONEA, termsVersionFor } from "../src/lib/terms-version.ts";
import { millioneaDarkSource, millioneaPublishedSource, millioneaWordingBlocks } from "./lib/millionea-wording-source.mts";

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

/** §1's predicate, as a function, so its controls drive the SAME code the real check runs. Since 2026-10-23 the Terms
 *  have two renderings (§4's Maswali Millionea paragraph prints only above the product's ceiling), so the page and the
 *  stamp both read the version of the rendering in force — `termsVersionFor(millioneaWordingPublished())` — never a
 *  constant on its own, never a literal. */
export function stampsShared(page: string, auth: string): { page: boolean; auth: boolean; stamps: number; literals: string[] } {
  const p = decomment(page);
  const a = decomment(auth);
  const metaAt = p.indexOf("const META");
  const metaBlock = metaAt >= 0 ? p.slice(metaAt, p.indexOf("});", metaAt) + 3) : "";
  const importsFn = (s: string) => /import\s*\{[^}]*\btermsVersionFor\b[^}]*\}\s*from\s*"@\/lib\/terms-version"/.test(s);
  const importsCeiling = (s: string) => /import\s*\{[^}]*\bmillioneaWordingPublished\b[^}]*\}\s*from\s*"@\/lib\/millionea-rollout"/.test(s);
  const pageOk = importsFn(p) && importsCeiling(p)
    && (metaBlock.match(/\$\{version\}/g) ?? []).length === 3
    && !/20\d\d-\d\d-\d\d/.test(metaBlock)
    && /const version = termsVersionFor\(millioneaWordingPublished\(\)\);/.test(p)
    && /meta=\{META\(version\)\[locale\]\}/.test(p);
  const stamps = (a.match(/acceptedTermsVersion:\s*termsVersionFor\(millioneaWordingPublished\(\)\)/g) ?? []).length;
  const literals = a.match(/acceptedTermsVersion:\s*["'`][^"'`]*["'`]/g) ?? [];
  const authOk = importsFn(a) && importsCeiling(a)
    && !/const\s+TERMS_VERSION(?:_WITH_MILLIONEA)?\s*=/.test(a)
    && !/(?:function|const)\s+termsVersionFor\b/.test(a)
    && literals.length === 0;
  return { page: pageOk, auth: authOk, stamps, literals };
}

const pageSrc = read(TERMS);
const authSrc = read(AUTH);

// ═══ §1 · WHAT A PERSON READ AND WHAT WAS RECORDED CANNOT DIVERGE ═════════════════════════
section("§1 · the page and the registration stamp read one version, of the rendering in force");
{
  const r = stampsShared(pageSrc, authSrc);
  ok("1.1 ⛔ /legal/terms prints termsVersionFor(millioneaWordingPublished()) in all three META lines, with no literal date",
    r.page, "the page's META carries a hard-coded date, or does not read the version of the rendering in force");
  ok("1.2 ⛔ auth-service stamps termsVersionFor(millioneaWordingPublished()), defines no local copy, and stamps no literal",
    r.auth, `literals=${JSON.stringify(r.literals)}`);
  // ONE registration door writes a new user since 2026-10-06: the password form. The one-time-code sign-up (the second
  // door, which created accounts with no email and no password) is deleted, so the ratchet's floor is that one stamp.
  ok("1.3 ⛔ RATCHET · the registration path stamps the version in force (≥ 1 site)", r.stamps >= 1, `stamps=${r.stamps}`);
  // Every `db.user.create` in auth-service must be one of the stamped paths — a third door with no stamp
  // would record nothing at all.
  const creates = (decomment(authSrc).match(/db\.user\.create\(/g) ?? []).length;
  ok("1.4 ⛔ every user this service creates is stamped (creates ≤ stamps)", creates > 0 && creates <= r.stamps, `creates=${creates} stamps=${r.stamps}`);
  ok("1.5 ⛔ both versions are ISO dates", /^\d{4}-\d{2}-\d{2}$/.test(TERMS_VERSION) && /^\d{4}-\d{2}-\d{2}$/.test(TERMS_VERSION_WITH_MILLIONEA),
    `${TERMS_VERSION} · ${TERMS_VERSION_WITH_MILLIONEA}`);
  ok("1.5b ⛔ the rendering decides the version: above the ceiling the later one (with §4's Millionea paragraph), below it the other",
    termsVersionFor(true) === TERMS_VERSION_WITH_MILLIONEA && termsVersionFor(false) === TERMS_VERSION && TERMS_VERSION_WITH_MILLIONEA > TERMS_VERSION,
    `${termsVersionFor(true)} · ${termsVersionFor(false)}`);
  ok("1.6 ⛔ …and neither is the stamp that was live while the page published 2026-09-13",
    TERMS_VERSION !== "2026-09-09" && TERMS_VERSION_WITH_MILLIONEA !== "2026-09-09", TERMS_VERSION);

  // ⭐ CONTROLS — the predicate must FAIL on each shape of the defect, or §1 proves nothing.
  const literalMeta = pageSrc.replace(/\$\{version\}/, "2026-09-13");
  ok("1.7 ⭐ CONTROL · a literal date back in one META line is caught", !stampsShared(literalMeta, authSrc).page);
  const localConst = authSrc.replace(/import\s*\{\s*termsVersionFor\s*\}\s*from\s*"@\/lib\/terms-version";?/, 'const termsVersionFor = (_: boolean) => "2026-09-09";');
  ok("1.8 ⭐ CONTROL · a local copy of the version function in auth-service is caught", localConst !== authSrc && !stampsShared(pageSrc, localConst).auth);
  const literalStamp = authSrc.replace(/acceptedTermsVersion:\s*termsVersionFor\(millioneaWordingPublished\(\)\)/, 'acceptedTermsVersion: "2026-09-13"');
  ok("1.9 ⭐ CONTROL · one registration path stamping a literal is caught", literalStamp !== authSrc && !stampsShared(pageSrc, literalStamp).auth);
  const darkStamp = authSrc.replace(/acceptedTermsVersion:\s*termsVersionFor\(millioneaWordingPublished\(\)\)/, "acceptedTermsVersion: TERMS_VERSION");
  ok("1.9b ⭐ CONTROL · a stamp of the version below the ceiling, whatever the page showed, is caught (it stamps nothing in force)",
    darkStamp !== authSrc && stampsShared(pageSrc, darkStamp).stamps === 0);
  const darkPage = pageSrc.replace("const version = termsVersionFor(millioneaWordingPublished());", "const version = TERMS_VERSION;");
  ok("1.9c ⭐ CONTROL · a page printing one version whatever it renders is caught", darkPage !== pageSrc && !stampsShared(darkPage, authSrc).page);
}

// ═══ §2 · THE VERSION MOVES WHEN THE BINDING TEXT MOVES ══════════════════════════════════
section("§2 · neither version can lag the binding text it names");
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
  const darkPinned = millioneaDarkSource(bodies) + "\n" + binding;
  const pubPinned = millioneaPublishedSource(bodies) + "\n" + binding;
  const darkSha = hashBodies(darkPinned), pubSha = hashBodies(pubPinned);
  ok("2.1 🔴 below the ceiling the bodies hash to TERMS_TEXT_SHA — if this fails, MOVE TERMS_VERSION TOO",
    darkSha === TERMS_TEXT_SHA,
    `the rendering below the ceiling hashes to ${darkSha}, terms-version.ts pins ${TERMS_TEXT_SHA}\n` +
    `       ⛔ Do NOT just paste the new hash. The text changed, so TERMS_VERSION must move in the SAME commit\n` +
    `          (or a same-day player-favourable amendment is recorded in COMPLIANCE-DECISIONS.md).`);
  ok("2.1b 🔴 above the ceiling the bodies hash to TERMS_TEXT_SHA_WITH_MILLIONEA — if this fails, MOVE TERMS_VERSION_WITH_MILLIONEA TOO",
    pubSha === TERMS_TEXT_SHA_WITH_MILLIONEA,
    `the rendering above the ceiling hashes to ${pubSha}, terms-version.ts pins ${TERMS_TEXT_SHA_WITH_MILLIONEA}`);
  ok("2.1c CONTROL · the two renderings differ — the wrappers hold words, so the second hash pins something",
    millioneaWordingBlocks(bodies).length === 3 && darkSha !== pubSha, `blocks=${millioneaWordingBlocks(bodies).length}`);

  const mutated = hashBodies(darkPinned.replace("If we cannot verify you", "If we can not verify you"));
  ok("2.2 ⭐ CONTROL · a one-word change to the binding bodies produces a DIFFERENT hash", mutated !== darkSha, `both ${darkSha}`);
  ok("2.2b ⭐ CONTROL · …and so does a one-word change to the binding-language sentence",
    hashBodies(darkPinned.replace("legally binding text", "legally binding version")) !== darkSha);
  ok("2.2c ⭐ CONTROL · …and so does a one-word change inside a wrapper, above the ceiling only",
    hashBodies(pubPinned.replace("not a price-competition market", "not a price competition market")) !== pubSha
      && hashBodies(millioneaDarkSource(bodies.replace("not a price-competition market", "not a price competition market")) + "\n" + binding) === darkSha);
  ok("2.3 ⭐ CONTROL · a whitespace-only reformat does NOT move the hash",
    hashBodies(darkPinned.replace(/\n/g, "\n  ")) === darkSha);
}

// ═══ §3 · §4'S MASWALI MILLIONEA PARAGRAPH PRINTS ONLY WITH THE PRODUCT ══════════════════
section("§3 · the Millionea paragraph: one per language, inside §4, inside the wrapper");
{
  /** §3's predicate over a source, so its controls drive the same code. */
  const millioneaCheck = (src: string) => {
    const bodies = extractBodies(src);
    const blocks = millioneaWordingBlocks(bodies);
    const sec4 = (title: string) => { const at = bodies.indexOf(`<LegalSection n="4" title="${title}">`); return at >= 0 ? bodies.slice(at, bodies.indexOf("</LegalSection>", at)) : ""; };
    const inSec4 = [sec4("How price-competition markets work"), sec4("Jinsi masoko ya ushindani wa bei yanavyofanya kazi"), sec4("价格竞争市场的运作方式")]
      .map((s) => millioneaWordingBlocks(s).length);
    const said = [
      "Maswali Millionea is not a price-competition market", "Maswali Millionea si soko la ushindani wa bei", "Maswali Millionea 并非价格竞争市场",
    ].map((s) => blocks.some((b) => b.includes(s)));
    return {
      blocks: blocks.length,
      inSec4,
      linked: blocks.every((b) => b.includes('data-terms-addition="millionea"') && b.includes('href="/legal/rules/millionea"')),
      said,
      darkNames: /Millionea/.test(millioneaDarkSource(bodies)),
      wrapperFromServer: /import\s*\{\s*MillioneaWording\s*\}\s*from\s*"@\/lib\/server\/legal\/millionea-wording"/.test(src),
    };
  };
  const m = millioneaCheck(pageSrc);
  ok("3.1 ⛔ OD-18 · exactly one wrapped Millionea paragraph in each language's §4, each marked and linking the binding rules",
    m.blocks === 3 && m.inSec4.every((n) => n === 1) && m.linked, JSON.stringify(m));
  ok("3.2 ⛔ above the ceiling it says, in each language, that Maswali Millionea is not a price-competition market",
    m.said.every(Boolean), JSON.stringify(m.said));
  ok("3.3 ⛔ below the ceiling the Terms name Millionea nowhere — the wrapper is the paragraph's only way onto the page",
    !m.darkNames && m.wrapperFromServer);

  // ⭐ CONTROLS — a paragraph moved out of its wrapper, and a wrapper lost, must each be caught.
  const enOpen = pageSrc.indexOf("<MillioneaWording>");
  const unwrapped = enOpen >= 0 ? pageSrc.slice(0, enOpen) + pageSrc.slice(enOpen).replace("<MillioneaWording>", "").replace("</MillioneaWording>", "") : pageSrc;
  const u = millioneaCheck(unwrapped);
  ok("3.c1 ⭐ CONTROL · the English paragraph out of its wrapper is caught (two blocks left, and the dark rendering names Millionea)",
    unwrapped !== pageSrc && u.blocks === 2 && u.darkNames);
  const twice = pageSrc.replace('<LegalSection n="5" title="Settlement and payout">', '<MillioneaWording><p>Maswali Millionea</p></MillioneaWording><LegalSection n="5" title="Settlement and payout">');
  const t = millioneaCheck(twice);
  ok("3.c2 ⭐ CONTROL · a fourth wrapper outside §4 is caught by the count", twice !== pageSrc && t.blocks === 4);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
