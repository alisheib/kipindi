/**
 * THE HERO SAYS ONLY WHAT IS TRUE — the landing hero's copy gate (specs/hero-v3.md §8–§9;
 * INHERIT-MANIFEST R7, R8(6), R9).
 *
 *   npm run test:hero-copy       (npx tsx scripts/hero-copy.test.mts)
 *   npm run red:hero-copy        (the same file with --prove-red: every section must CATCH its plant)
 *
 * §1 · "FIRST" IS GATED. `home.heroClaimFirst` is read in exactly one place in `src/`, inside the
 *      `FIRST_LICENSED_EVIDENCE()` branch; no other string anywhere claims a first; "licensed" is in
 *      both claim states in every language; and while the evidence is set, COMPLIANCE-DECISIONS carries
 *      a dated entry citing it (R9 — the owner's attestation + the Board's licence-fee acknowledgement).
 * §2 · THE QUESTION. `home.heroAsk` holds `{yes}` then `{no}`, each exactly once, in every language, and
 *      the hero fills them with `sideWord(…, "MARKET")` — so the h1 reads "YES or NO?", "NDIO au HAPANA?"
 *      and "是还是否？", the buttons' own words, with no `lang` of its own.
 * §3 · THE WALLETS. "{rails}" names exactly the mobile-money rails whose payout path is live (R8(6)):
 *      the payment catalogue ∩ `WithdrawSchema` ∩ `DepositSchema` ∩ a wallet-cashin code, cross-checked
 *      against the withdraw page's own tiles and the withdraw action's allow-list; a paused rail drops
 *      out; the output is pinned exactly in all three languages; no wallet name is typed into the dict.
 * §4 · NO WARNING SENTENCE, ONE `lang`. `footer.stopGambling` is not read by the hero (R7(2) — the
 *      footer keeps it), and the only `lang` attribute in the hero is `lang="en"` on the sign-off.
 * §5 · NO CLAIM THE FACTS CAN'T CARRY. No string the hero's first screen reads — in any language —
 *      says official / rasmi / 官方, machine / mashine, crowd / umati, or chance / bahati (spec §8).
 * §6 · POSITIVE CONTROLS. `--prove-red` plants one lie per check on IN-MEMORY copies and requires the
 *      check to catch it; the run fails on any MISSED. A check that cannot be shown to fail is decoration.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: this file writes no file, so a red run cannot leave a defect planted.
 * ⛔ WHAT IT CANNOT SEE: whether a sentence is well-written, or whether a payout really succeeded on a
 * network last week — only that the code's own definitions agree with what the hero prints.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/* Line endings are normalised on read: this machine checks files out as CRLF. */
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const { dict } = await import("../src/lib/i18n-dict.ts");
const { FIRST_LICENSED_EVIDENCE } = await import("../src/lib/support-config.ts");
const { railListText } = await import("../src/lib/rail-list.ts");
const { payoutCapableRails, heroRailNames } = await import("../src/lib/server/payout-rails.ts");
const { mnoToSelcomCashin } = await import("../src/lib/server/selcom.ts");

type Locale = "en" | "sw" | "zh";
const LOCALES: Locale[] = ["en", "sw", "zh"];
type Flat = Map<string, string>;
type Pauses = Record<string, { deposits: boolean; withdrawals: boolean }> | null;
type Evidence = { date: string; ruling: string; basis: string } | null;

function flatten(o: Record<string, unknown>, prefix = "", out: Flat = new Map()): Flat {
  for (const [k, v] of Object.entries(o)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v as Record<string, unknown>, path, out);
    else out.set(path, String(v));
  }
  return out;
}
const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

/** Every .ts/.tsx under src/, decommented, keyed by repo-relative path (forward slashes). */
function srcFiles(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) out.set(relative(ROOT, p).replace(/\\/g, "/"), decomment(read(relative(ROOT, p))));
    }
  };
  walk(join(ROOT, "src"));
  return out;
}

/** Everything the checks read. The red run plants on copies of it. */
type World = {
  dict: Record<Locale, Flat>;
  src: Map<string, string>;
  hero: string;               // decommented landing-hero.tsx
  page: string;               // decommented app/page.tsx
  evidence: Evidence;
  compliance: string;
  payoutRails: { id: string; name: string }[];
  railNames: (p: Pauses) => string[];
  withdrawPageIds: string[];
  withdrawActionIds: string[];
  cashin: (id: string) => string | null;
};

const HERO = "src/components/home/landing-hero.tsx";
const DICT = "src/lib/i18n-dict.ts";

function load(): World {
  const src = srcFiles();
  const wpage = src.get("src/app/wallet/withdraw/page.tsx") ?? "";
  const provBlock = wpage.slice(wpage.indexOf("const PROVIDERS = ["), wpage.indexOf("] as const;", wpage.indexOf("const PROVIDERS = [")));
  const waction = src.get("src/app/wallet/withdraw/actions.ts") ?? "";
  const setBlock = (waction.match(/const WITHDRAW_PROVIDERS = new Set\(\[([^\]]*)\]\)/) ?? [])[1] ?? "";
  return {
    dict: { en: flatten(dict.en as never), sw: flatten(dict.sw as never), zh: flatten(dict.zh as never) },
    src,
    hero: src.get(HERO) ?? "",
    page: src.get("src/app/page.tsx") ?? "",
    evidence: FIRST_LICENSED_EVIDENCE(),
    compliance: read("docs/COMPLIANCE-DECISIONS.md"),
    payoutRails: payoutCapableRails().map((m) => ({ id: m.id, name: m.name })),
    railNames: (p) => heroRailNames(p),
    withdrawPageIds: [...provBlock.matchAll(/id: "([A-Z_]+)"/g)].map((m) => m[1]),
    withdrawActionIds: [...setBlock.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]),
    cashin: (id) => mnoToSelcomCashin(id as never),
  };
}

/* ── the patterns ─────────────────────────────────────────────────────────────────────────── */
/** The claim's "first" wording in each language — R9's own word order included. */
const FIRST_RE = /first licen[cs]ed|la kwanza (?:la utabiri )?lenye leseni|首家持牌|首个持牌/i;
/** ANY first-of-kind claim about the product, qualified or not. Only the gated key may match it. */
const FIRST_ANY = /\bfirst\b[^.]{0,40}\bprediction market|\bsoko la kwanza\b|首家|首个[^。]{0,12}预测/i;
const LICENSED = { en: /licen[cs]ed/i, sw: /\bleseni\b/i, zh: /持牌/ } as const;
/* Word-bounded in the Latin scripts: the Board's own Swahili name, "Michezo ya Kuba-HATI-sha", holds
   "bahati" inside a word, and naming the regulator is not a claim that play is chance. */
const OVERCLAIM = /\bofficial|\brasmi\b|官方|\bmachine|\bmashine\b|机器|\bcrowd|\bumati\b|群众|\bchance\b|\bbahati\b|运气/i;
const WALLET_NAME = /M-?Pesa|Airtel|Halo ?Pesa|Mixx|Tigo|TTCL/i;

/** The rails that were payout-live when this gate was written (2026-09-27, R8(6)) — see §3a. */
const EXPECT_RAILS = ["M-Pesa", "Airtel Money", "HaloPesa", "Mixx by Yas"];
const EXPECT_RAILS_TEXT: Record<Locale, string> = {
  en: "Deposit and withdraw with M-Pesa, Airtel Money, HaloPesa or Mixx by Yas.",
  sw: "Weka na toa pesa kwa M-Pesa, Airtel Money, HaloPesa au Mixx by Yas.",
  zh: "可通过 M-Pesa、Airtel Money、HaloPesa或Mixx by Yas 充值和提现。",
};
const EXPECT_ASK: Record<Locale, string> = { en: "YES or NO?", sw: "NDIO au HAPANA?", zh: "是还是否？" };

/* ── the checks: each returns its defects, [] is the only pass ────────────────────────────── */
type Check = { id: string; label: string; run: (w: World) => string[] };

/** The hero's first-screen code: Claim → Ask → TrustLines, and LandingHero itself (not the player's
 *  block, the board rows or the proof section, which have their own guards). */
function firstScreen(hero: string): string {
  const a = hero.slice(hero.indexOf("function Claim("), hero.indexOf("function QuestionRow("));
  const b = hero.slice(hero.indexOf("export function LandingHero("), hero.indexOf("function SignedInAct("));
  return a + "\n" + b;
}

const CHECKS: Check[] = [
  /* §1 · "first" is gated */
  { id: "1a", label: "`heroClaimFirst` is read in ONE place in src/, inside the FIRST_LICENSED_EVIDENCE() branch", run: (w) => {
    const d: string[] = [];
    let reads = 0;
    for (const [f, s] of w.src) {
      if (f === DICT) continue;
      const n = (s.match(/heroClaimFirst/g) ?? []).length;
      if (n && f !== HERO) d.push(`${f} reads heroClaimFirst ×${n}`);
      reads += n;
    }
    if (reads !== 1) d.push(`heroClaimFirst is read ${reads} time(s) in src/, not once`);
    if (!/FIRST_LICENSED_EVIDENCE\(\) \? t\.home\.heroClaimFirst : t\.home\.heroClaim\b/.test(w.hero)) d.push("the read is not `FIRST_LICENSED_EVIDENCE() ? t.home.heroClaimFirst : t.home.heroClaim`");
    const homes = [...w.src].filter(([, s]) => /export function FIRST_LICENSED_EVIDENCE\b/.test(s)).map(([f]) => f);
    if (homes.join() !== "src/lib/support-config.ts") d.push(`FIRST_LICENSED_EVIDENCE is defined in [${homes.join(", ")}], not only support-config.ts`);
    return d;
  } },
  { id: "1b", label: "no other string — dict or source, any language — claims a first", run: (w) => {
    const d: string[] = [];
    for (const loc of LOCALES) for (const [k, v] of w.dict[loc]) {
      if (k === "home.heroClaimFirst") continue;
      if (FIRST_RE.test(v) || FIRST_ANY.test(v)) d.push(`${loc}.${k}: ${JSON.stringify(v.slice(0, 70))}`);
    }
    for (const [f, s] of w.src) {
      if (f === DICT) continue;
      const m = s.match(FIRST_RE) ?? s.match(FIRST_ANY);
      if (m) d.push(`${f}: a literal "${m[0]}" outside the dictionary`);
    }
    return d;
  } },
  { id: "1c", label: "both claim states say \"licensed\" in every language; only state P says \"first\"", run: (w) => {
    const d: string[] = [];
    for (const loc of LOCALES) {
      const n = w.dict[loc].get("home.heroClaim") ?? "", p = w.dict[loc].get("home.heroClaimFirst") ?? "";
      if (!LICENSED[loc].test(n)) d.push(`${loc} heroClaim drops "licensed": ${JSON.stringify(n)}`);
      if (!LICENSED[loc].test(p)) d.push(`${loc} heroClaimFirst drops "licensed": ${JSON.stringify(p)}`);
      if (FIRST_ANY.test(n) || FIRST_RE.test(n)) d.push(`${loc} heroClaim (state N) claims a first: ${JSON.stringify(n)}`);
      if (!FIRST_RE.test(p)) d.push(`${loc} heroClaimFirst does not read as "first licensed": ${JSON.stringify(p)}`);
    }
    return d;
  } },
  { id: "1d", label: "the evidence is set → COMPLIANCE-DECISIONS has a dated entry citing it", run: (w) => {
    const e = w.evidence;
    if (!e) return [];
    const d: string[] = [];
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(e.date)) d.push(`evidence.date "${e.date}" is not a date`);
    if (!e.ruling.trim() || !e.basis.trim()) d.push("evidence carries no ruling or no basis");
    const sections = w.compliance.split(/\n(?=## )/).filter((s) => s.startsWith(`## ${e.date} `));
    const cites = sections.filter((s) => s.includes("FIRST_LICENSED_EVIDENCE") && s.includes(e.ruling));
    if (!cites.length) d.push(`no "## ${e.date} ·" entry in COMPLIANCE-DECISIONS names FIRST_LICENSED_EVIDENCE and "${e.ruling}"`);
    return d;
  } },

  /* §2 · the question */
  { id: "2a", label: "heroAsk: {yes} then {no}, each exactly once, nothing else to fill — in every language", run: (w) => {
    const d: string[] = [];
    for (const loc of LOCALES) {
      const s = w.dict[loc].get("home.heroAsk") ?? "";
      const ph = [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (ph.join(",") !== "yes,no") d.push(`${loc}: placeholders [${ph.join(",")}] in ${JSON.stringify(s)}`);
      const q = fill(s, { yes: w.dict[loc].get("common.yes") ?? "?", no: w.dict[loc].get("common.no") ?? "?" });
      if (q !== EXPECT_ASK[loc]) d.push(`${loc}: reads ${JSON.stringify(q)}, R7(3) rules ${JSON.stringify(EXPECT_ASK[loc])}`);
    }
    return d;
  } },
  { id: "2b", label: "the h1 is filled by sideWord(…, \"MARKET\") and carries no lang of its own", run: (w) => {
    const d: string[] = [];
    const ask = w.hero.slice(w.hero.indexOf("function Ask("), w.hero.indexOf("function TrustLines("));
    if (!/sideWord\(t, "YES", "MARKET"\)/.test(ask) || !/sideWord\(t, "NO", "MARKET"\)/.test(ask)) d.push("Ask does not take its side words from sideWord(t, …, \"MARKET\")");
    if (!/t\.home\.heroAsk/.test(ask)) d.push("Ask does not read home.heroAsk");
    for (const m of ask.matchAll(/<h1\b[^>]*>/g)) if (/\blang=/.test(m[0])) d.push(`the h1 carries a lang: ${m[0]}`);
    if (!/<h1 className="kp-hero__headline">/.test(ask)) d.push("no h1.kp-hero__headline in Ask");
    return d;
  } },

  /* §3 · the wallets */
  { id: "3a", label: "the payout-capable rails agree with the withdraw page, the withdraw action and the payout ladder", run: (w) => {
    const d: string[] = [];
    const names = w.payoutRails.map((r) => r.name), ids = w.payoutRails.map((r) => r.id);
    if (names.join("|") !== EXPECT_RAILS.join("|")) d.push(`payout-capable rails are [${names.join(", ")}]; this gate was written for [${EXPECT_RAILS.join(", ")}] — read server/payout-rails.ts and the withdraw path, then update EXPECT_RAILS with the evidence`);
    if (ids.join("|") !== w.withdrawPageIds.join("|")) d.push(`the withdraw page offers [${w.withdrawPageIds.join(", ")}], the hero would name [${ids.join(", ")}]`);
    if ([...ids].sort().join("|") !== [...w.withdrawActionIds].sort().join("|")) d.push(`the withdraw action allows [${w.withdrawActionIds.join(", ")}], the hero would name [${ids.join(", ")}]`);
    for (const id of ids) if (!w.cashin(id)) d.push(`${id} has no wallet-cashin code — the payout ladder's first rung skips it`);
    return d;
  } },
  { id: "3b", label: "\"{rails}\" renders exactly, in all three languages", run: (w) => {
    const d: string[] = [];
    const names = w.railNames(null);
    for (const loc of LOCALES) {
      const s = fill(w.dict[loc].get("home.heroRails") ?? "", { rails: railListText(loc, names) });
      if (s !== EXPECT_RAILS_TEXT[loc]) d.push(`${loc}: ${JSON.stringify(s)} ≠ ${JSON.stringify(EXPECT_RAILS_TEXT[loc])}`);
    }
    return d;
  } },
  { id: "3c", label: "a rail paused for withdrawals OR deposits is not named; an unreadable switch names the static list", run: (w) => {
    const d: string[] = [];
    const all = w.railNames(null);
    const wd = w.railNames({ HALO_PESA: { deposits: false, withdrawals: true } });
    const dep = w.railNames({ AIRTEL_MONEY: { deposits: true, withdrawals: false } });
    if (wd.includes("HaloPesa") || wd.length !== all.length - 1) d.push(`withdrawals paused on HALO_PESA → [${wd.join(", ")}]`);
    if (dep.includes("Airtel Money") || dep.length !== all.length - 1) d.push(`deposits paused on AIRTEL_MONEY → [${dep.join(", ")}]`);
    if (all.join("|") !== w.payoutRails.map((r) => r.name).join("|")) d.push("a null kill-switch map does not name the static list");
    return d;
  } },
  { id: "3d", label: "no wallet name is typed into the dict's hero sentence; the page passes heroRailNames and the hero joins with railListParts", run: (w) => {
    const d: string[] = [];
    for (const loc of LOCALES) {
      const s = w.dict[loc].get("home.heroRails") ?? "";
      if (WALLET_NAME.test(s)) d.push(`${loc}.home.heroRails types a wallet name: ${JSON.stringify(s)}`);
      if ((s.match(/\{rails\}/g) ?? []).length !== 1) d.push(`${loc}.home.heroRails has no single {rails}`);
    }
    if (!/rails=\{heroRailNames\(railPauses\)\}/.test(w.page)) d.push("page.tsx does not pass rails={heroRailNames(railPauses)}");
    if (!/railListParts\(locale, rails\)/.test(w.hero)) d.push("the hero does not join the names with railListParts(locale, rails)");
    return d;
  } },

  /* §4 · no warning sentence, one lang */
  { id: "4a", label: "the hero does not read footer.stopGambling (the footer keeps it, R7(2))", run: (w) =>
    /stopGambling/.test(w.hero) ? ["landing-hero.tsx reads footer.stopGambling"] : [] },
  { id: "4b", label: "the only lang in the hero is lang=\"en\" on the sign-off", run: (w) => {
    const d: string[] = [];
    const langs = [...w.hero.matchAll(/\blang=(?:"[^"]*"|\{[^}]*\})/g)].map((m) => m[0]);
    if (langs.length !== 1 || langs[0] !== 'lang="en"') d.push(`lang attributes in the hero: [${langs.join(", ")}]`);
    const so = w.hero.indexOf('<p className="kp-hero__signoff">');
    const at = w.hero.indexOf('lang="en"');
    if (so < 0 || at < so || at > w.hero.indexOf("</p>", so)) d.push('lang="en" is not inside p.kp-hero__signoff');
    return d;
  } },

  /* §5 · no claim the facts can't carry */
  { id: "5a", label: "no string on the hero's first screen says official / machine / crowd / chance, in any language", run: (w) => {
    const d: string[] = [];
    const keys = new Set([...firstScreen(w.hero).matchAll(/\bt\.(\w+)\.(\w+)\b/g)].map((m) => `${m[1]}.${m[2]}`));
    if (keys.size < 8) d.push(`only ${keys.size} dict reads found on the first screen — the slice is wrong`);
    for (const k of keys) for (const loc of LOCALES) {
      const v = w.dict[loc].get(k);
      if (v === undefined) { d.push(`${loc}.${k} does not exist`); continue; }
      const m = v.match(OVERCLAIM);
      if (m) d.push(`${loc}.${k} says "${m[0]}": ${JSON.stringify(v.slice(0, 70))}`);
    }
    return d;
  } },
];

/* ── §6 · the plants — one per check, each on a COPY of the world ─────────────────────────── */
const cloneDict = (w: World) => ({ en: new Map(w.dict.en), sw: new Map(w.dict.sw), zh: new Map(w.dict.zh) });
const withDict = (w: World, loc: Locale, k: string, v: string): World => { const dd = cloneDict(w); dd[loc].set(k, v); return { ...w, dict: dd }; };
const withHero = (w: World, hero: string): World => { const src = new Map(w.src); src.set(HERO, hero); return { ...w, hero, src }; };
const inTrust = (w: World, jsx: string) => withHero(w, w.hero.replace('<ul className="kp-hero__trust" role="list">', `<ul className="kp-hero__trust" role="list">${jsx}`));

const PLANTS: Record<string, { note: string; plant: (w: World) => World }[]> = {
  "1a": [
    { note: "a second, ungated read of heroClaimFirst in the trust rows", plant: (w) => inTrust(w, "<li>{t.home.heroClaimFirst}</li>") },
    { note: "the gate removed: the claim always reads heroClaimFirst", plant: (w) => withHero(w, w.hero.replace("FIRST_LICENSED_EVIDENCE() ? t.home.heroClaimFirst : t.home.heroClaim", "t.home.heroClaimFirst")) },
  ],
  "1b": [
    { note: "an unqualified first in another key", plant: (w) => withDict(w, "en", "home.heroCta", "Tanzania's first prediction market") },
    { note: "R9's Swahili order in another key", plant: (w) => withDict(w, "sw", "footer.license", "Soko la kwanza la utabiri lenye leseni") },
  ],
  "1c": [
    { note: "\"leseni\" dropped from the sw state-P claim", plant: (w) => withDict(w, "sw", "home.heroClaimFirst", "Soko la kwanza la utabiri Tanzania") },
    { note: "\"first\" written into state N", plant: (w) => withDict(w, "zh", "home.heroClaim", "坦桑尼亚首家持牌预测市场") },
  ],
  "1d": [
    { note: "the evidence set, the COMPLIANCE entry gone", plant: (w) => ({ ...w, evidence: w.evidence ?? { date: "2026-09-27", ruling: "INHERIT-MANIFEST R9", basis: "x" }, compliance: "# nothing\n" }) },
  ],
  "2a": [{ note: "{yes} twice in sw", plant: (w) => withDict(w, "sw", "home.heroAsk", "{yes} au {yes}?") }],
  "2b": [{ note: "the English lang back on the h1", plant: (w) => withHero(w, w.hero.replace('<h1 className="kp-hero__headline">', '<h1 className="kp-hero__headline" lang="en">')) }],
  "3a": [{ note: "a rail the withdraw path does not pay out on", plant: (w) => ({ ...w, payoutRails: [...w.payoutRails, { id: "TTCL_PESA", name: "TTCL Pesa" }] }) }],
  "3b": [{ note: "an extra name in the rendered list", plant: (w) => ({ ...w, railNames: (p) => [...w.railNames(p), "Tigo Pesa"] }) }],
  "3c": [{ note: "a filter that ignores the kill switch", plant: (w) => ({ ...w, railNames: () => w.railNames(null) }) }],
  "3d": [
    { note: "a wallet name typed into the sw sentence", plant: (w) => withDict(w, "sw", "home.heroRails", "Weka na toa pesa kwa M-Pesa na {rails}.") },
    { note: "the page passes a typed list", plant: (w) => ({ ...w, page: w.page.replace("rails={heroRailNames(railPauses)}", 'rails={["M-Pesa"]}') }) },
  ],
  "4a": [{ note: "the warning sentence back in the trust rows", plant: (w) => inTrust(w, "<li>{t.footer.stopGambling}</li>") }],
  "4b": [{ note: "a second lang in the hero", plant: (w) => inTrust(w, '<li lang="sw">x</li>') }],
  "5a": [
    { note: "官方 in the zh lede", plant: (w) => withDict(w, "zh", "home.heroLedePay", "官方结算，即获赔付。") },
    { note: "the named-sources cell back on the first screen (sw says \"rasmi\")", plant: (w) => inTrust(w, "<li>{t.home.trustCell1H}</li>") },
  ],
};

/* ── run ──────────────────────────────────────────────────────────────────────────────────── */
const world = load();
const PROVE_RED = process.argv.includes("--prove-red");
let fail = 0;

if (!PROVE_RED) {
  console.log("hero-copy — the hero says only what is true\n");
  for (const c of CHECKS) {
    const d = c.run(world);
    if (d.length) fail++;
    console.log(`${d.length ? "FAIL" : "PASS"} §${c.id} ${c.label}${d.length ? "\n       " + d.join("\n       ") : ""}`);
  }
  console.log(`\nstate: claim ${world.evidence ? `P ("first", evidence ${world.evidence.date} · ${world.evidence.ruling})` : "N (licensed, no \"first\")"} · rails [${world.railNames(null).join(", ")}]`);
  console.log(`hero-copy: ${CHECKS.length - fail} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

// --prove-red: the clean world must pass every check, and every plant must be caught by ITS check.
console.log("red:hero-copy — every check must catch its own planted lie (in memory; no file is written)\n");
let caught = 0, missed = 0, dirty = 0;
for (const c of CHECKS) {
  if (c.run(world).length) { dirty++; console.log(`⛔ §${c.id} is already failing on the clean tree — a control means nothing over a red check`); }
  const plants = PLANTS[c.id] ?? [];
  if (!plants.length) { missed++; console.log(`MISSED §${c.id} has no planted control`); continue; }
  for (const p of plants) {
    const d = c.run(p.plant(world));
    if (d.length) { caught++; console.log(`CAUGHT §${c.id} ${p.note} → ${d[0].slice(0, 110)}`); }
    else { missed++; console.log(`MISSED §${c.id} ${p.note}`); }
  }
}
console.log(`\nred:hero-copy: ${caught} caught, MISSED = ${missed}${dirty ? `, ${dirty} check(s) red on the clean tree` : ""}`);
process.exit(missed || dirty ? 1 : 0);
