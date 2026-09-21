/**
 * §0-pipe, §5, §8 and §docs of `test:house-bot-disclosure` — THE ABSENCE SUITE (Commit 6, owner rulings D19/D20 and
 * the owner ruling of 2026-09-20).
 *
 * ⛔ ITS SUBJECT IS WHAT MUST NOT EXIST, so its first duty is to say what already holds and to build only the space
 * between. Measured on this tree on 2026-09-20, guard by guard:
 *
 *   | what is covered                                            | by which guard, today                                   |
 *   |------------------------------------------------------------|---------------------------------------------------------|
 *   | a house word in any CLIENT-reachable module                 | this suite §1/§4 (the import graph, types and comments  |
 *   |                                                             | stripped as the bundler does)                           |
 *   | a house word in the real BUILD — every chunk, every         | `verify:house-bot-bundle` — but it needs `next build`,  |
 *   | prerendered document, `public/`                             | and until §0-pipe below it ran in NO pipeline           |
 *   | a house word in the CHATBOT's four player-read channels     | this suite §6 (the D19d guard)                          |
 *   | a house read module IMPORTED by a player surface            | `test:house-bot-reports` 0.198.1 — whole population     |
 *   | a house word PRINTED by a player surface                    | `test:house-bot-reports` 0.198.3 — TWO files            |
 *   | a house word in a public API BODY                           | `test:house-bot-reports` §11 (11.171, 11.247) — executed|
 *   | a house word in a player's own export / DSAR                | `test:erasure`, `test:dsar-secrets`, rulings 154/170    |
 *   | ONE word list for all of them                               | `scripts/lib/house-bot-vocabulary.mjs` (ruling 175)     |
 *   | a player identifier in the log stream                       | `test:pii-logs` — which knows NOTHING of house words    |
 *
 * ⭐ THE GAPS THIS SECTION BUILDS, AND NOTHING ELSE:
 *   §0-pipe · neither the disclosure suite nor the bundle scan was named in `predeploy`. A gate not in the pipeline is
 *             not a gate, and the bundle scan is the SOLE authority over server-rendered player pages.
 *   §5.1    · the published legal text is not pinned to `origin/main` anywhere. D19a's whole claim is "this lane changed
 *             none of those words", and no instrument said so.
 *   §5.2    · 0.198.3's print measure over the WHOLE player-rendered population (394 files, 585,817 printed characters)
 *             instead of two files. A house sentence typed into a rulebook, the home page or the leaderboard was held
 *             between builds by nothing at all.
 *   §8      · the Gaming Board draft is STRUCK (owner ruling, 2026-09-20). Its absence, the dated note on each of the
 *             nine citations, and the dormant `BOARD_DISCLOSURE_RECORDED` value being declared-but-unreachable.
 *   §docs   · accepted risk 21 in BOTH registers, verbatim; its PREMISE measured live in the published rulebooks; and
 *             F6 §5 condition 1 still unsatisfied.
 *
 * ⛔ WHAT IS DELIBERATELY NOT BUILT HERE is in `plans/house-bots/DEFERRED-TESTS.md` §1L with its reason, never dropped.
 *
 * Pure: `node:fs`, `node:child_process` (git, read-only) and the shared modules. No database, no build, no network.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { decomment } from "./decomment.mts";
import { srcFiles } from "./tracked-files.mts";
import { printedTexts, playerRenderedFiles, isPlayerRendered } from "./player-surface-text.mts";
import { houseHitsByFamily, HOUSE_BENIGN_SAMPLES } from "./house-bot-vocabulary.mjs";

type Ok = (label: string, cond: boolean, detail?: string) => void;
type Section = (title: string) => void;

const j = (v: unknown) => JSON.stringify(v);
/** LF on both sides. The checkout has `core.autocrlf=true`, so a raw byte pin would be red on day one for a reason
 *  that is not a change — exactly the shape a pin is supposed to distinguish from a real one. */
const lf = (s: string) => s.replace(/\r\n/g, "\n");

/**
 * ⛔ THE REGISTER — ONE FILE, ONE EXACT STRING. NOT A SHAPE.
 *
 * ⚠️ **A SHAPE EXEMPTION STOOD HERE FOR ONE COMMIT (247e5913) AND WAS WRONG. It is recorded, not quietly
 * removed, because the reasoning that produced it is the reasoning most likely to produce it again.**
 * That version filtered out any hit sitting inside a SCREAMING_SNAKE token, justified by `HOUSE_STAKE_ONLY`
 * at `src/app/markets/[id]/page.tsx:226` being a COMPARISON OPERAND rather than printed text.
 * ⛔ THE JUSTIFICATION NAMED A PROPERTY THIS INSTRUMENT CANNOT OBSERVE. `printedTexts` walks the AST and then
 * destroys it — it pushes every `isStringLiteral` and `isJsxText` node and returns `out.join(" ")`. By the time
 * any filter here runs there is no parent node and no operator: only characters. So a filter keyed on token
 * SPELLING exempts the operand and a RENDERED string identically, and the exemption was not one string in one
 * file but a SHAPE across all ~394 player-rendered files — `HOUSE_BOT`, `HOUSE_STAKES`, `STAFF_CHOSEN`,
 * `DAU_LA_NYUMBA`, a printed `LIQUIDITY`. That re-opened, by shape and across the whole population, exactly the
 * blindness `§2J · THE JOIN` had just closed.
 * ⛔ AND ITS CONTROL COULD NOT ARBITRATE: `5.2.c6` varied case, separator and spacing — never POSITION, the one
 * axis the justification rested on. A narrowness control blind to the axis of the claim proves nothing.
 *
 * ⭐ THE REMEDY IS THE ONE THIS REPO ALREADY USES TWICE — `house-bot-reports-cases.mts`'s
 * `PLAYER_SURFACE_TEXT_REGISTER` and `house-bot-surfaces.test.mts`'s `coveredByRegister`: a register keyed by
 * FILE and EXACT STRING, held SHRINK-ONLY, so an exemption covers what was ruled on and nothing else. A third
 * spelling of one idea is how two guards come to disagree, so this is the same shape as those two.
 *
 * WHY THIS ONE STRING IS RULED BENIGN (D19c, ruling 146): `objections-service.ts:116` returns
 * `why: "HOUSE_STAKE_ONLY"` and `:114` records that it "never leaves the server — the page shows
 * `NOT_ELIGIBLE`"; `page.tsx:226` is `elig.why === "HOUSE_STAKE_ONLY" ? { state: "NOT_ELIGIBLE" }`, an operand
 * whose selected branch is a literal. `house-bot-surfaces.test.mts` `4.words.4` is the assertion that PROVES
 * that claim, and `0.198.3b` holds this register to it rather than re-proving it here.
 * ⛔ NOT RENAMED, and that was weighed: `0.198.3` requires the market page to still yield >= 1 word so the
 * register's own subject stays visible to the measure, and `0.198.3b` requires the string to still be printed.
 * A rename would redden both — the two assertions that exist to keep this exemption honest.
 */
const PLAYER_TEXT_REGISTER: Readonly<Record<string, readonly string[]>> = {
  "src/app/markets/[id]/page.tsx": ["HOUSE_STAKE_ONLY"],
};

/** The words a player READS, and the bounded ids no player text can ever legitimately carry. This is 0.198.3's
 *  family filter, widened by `ids` only. ⛔ NO shape filter: see `PLAYER_TEXT_REGISTER` above for why. */
const readableHits = (s: string) => houseHitsByFamily(s)
  .filter((h) => h.family === "words" || h.family === "ids")
  .map((h) => `${h.family}:${h.word}`);

/**
 * The hits of ONE file, minus only what the register names FOR THAT FILE.
 * ⛔ `rel` is part of the key. The same token in any other file is still reported — which is the whole
 * difference between this and the shape exemption it replaces, and `5.2.c6` now plants exactly that.
 * ⛔ SUBSTRING-COVERED, for the reason §2J gives and for the reason `house-bot-reports-cases.mts` gives: one
 * literal yields a hit per family that can match it, so a register of exact strings is silently a claim about
 * the PATTERN. `includes` keeps it case- and separator-sensitive, so `house stake` on this page is still reported.
 */
const readableHitsFor = (rel: string, s: string): string[] => {
  const allowed = PLAYER_TEXT_REGISTER[rel] ?? [];
  return readableHits(s).filter((h) => {
    const word = h.slice(h.indexOf(":") + 1);
    return !allowed.some((a) => a.includes(word));
  });
};

export async function runAbsenceCases(ok: Ok, section: Section, ROOT: string): Promise<void> {
  const git = (...args: string[]) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
  const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
  const tracked = git("ls-files").split("\n").map((s) => s.trim()).filter(Boolean);

  // ══ §0-pipe · the two gates that ran in no chain ═══════════════════════════════════════════════════════
  section("§0-pipe · a gate not in the pipeline is not a gate");
  {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const chain = pkg.scripts.predeploy ?? "";
    const segments = chain.split("&&").map((s) => s.trim()).filter(Boolean);
    ok("0.pipe.0 · POPULATION · the predeploy chain was found and is the real one: over 2,000 characters and more than 100 `npm run` segments — so a renamed, emptied or truncated chain fails HERE and not as two index tests that quietly compare −1 with −1",
      chain.length > 2_000 && segments.filter((s) => s.startsWith("npm run")).length > 100,
      j({ chars: chain.length, segments: segments.length, npmRun: segments.filter((s) => s.startsWith("npm run")).length }));
    const idx = (key: string) => segments.findIndex((s) => s === `npm run ${key}`);
    const disclosure = idx("test:house-bot-disclosure"), privacy = idx("test:privacy-notice");
    ok("0.pipe.1 · T15 · `predeploy` runs `test:house-bot-disclosure`, after `test:privacy-notice` — it ran today only through `test:all`'s auto-discovery of `test:*` keys, so a deploy could never have been stopped by it",
      disclosure >= 0 && privacy >= 0 && disclosure > privacy, j({ disclosure, privacy }));
    const bundle = idx("verify:house-bot-bundle"), build = idx("build");
    ok("0.pipe.2 · …and `verify:house-bot-bundle` runs immediately after `npm run build` — it is the SOLE authority over server-rendered player pages and `public/`, it is not a `test:*` key so `test:all` never discovered it, and it refuses a build older than any `src` file, which is why its place is right after the build and nowhere else",
      bundle >= 0 && build >= 0 && bundle === build + 1, j({ bundle, build, after: segments[build + 1] }));
    // ⛔ CONTROLS · the same two index measures over SYNTHETIC chains. Nothing on disk is touched.
    const synth = (s: string[]) => {
      const seg = s.map((x) => x.trim()).filter(Boolean);
      const at = (k: string) => seg.findIndex((y) => y === `npm run ${k}`);
      return { pipe1: at("test:house-bot-disclosure") >= 0 && at("test:privacy-notice") >= 0 && at("test:house-bot-disclosure") > at("test:privacy-notice"), pipe2: at("verify:house-bot-bundle") >= 0 && at("build") >= 0 && at("verify:house-bot-bundle") === at("build") + 1, pop: seg.filter((y) => y.startsWith("npm run")).length > 100 };
    };
    const removed = synth(segments.filter((s) => s !== "npm run test:house-bot-disclosure"));
    const before = synth(segments.flatMap((s) => (s === "npm run build" ? ["npm run verify:house-bot-bundle", "npm run build"] : s === "npm run verify:house-bot-bundle" ? [] : [s])));
    const emptied = synth([]);
    ok("0.pipe.c1 · CONTROL · the key deleted from a synthetic copy of the chain is reported, and a chain in which `verify:house-bot-bundle` is moved to BEFORE the build is reported too — the ordering is asserted, not only the presence",
      removed.pipe1 === false && before.pipe2 === false, j({ removed, before }));
    ok("0.pipe.c2 · CONTROL · an EMPTY chain fails the population floor rather than passing two vacuous index tests — a `findIndex` of −1 compared with another −1 is the shape that reads green over nothing",
      emptied.pop === false, j(emptied));
    ok("0.pipe.c3 · POSITIVE CONTROL · the chain still carries the gates it had before this commit (`test:privacy-notice`, `test:chat-safety`, `test:house-bot-rules`, `test:i18n`, `npm run build`) — an insertion that displaced or replaced one of them would be a weakening dressed as a wiring",
      ["test:privacy-notice", "test:chat-safety", "test:house-bot-rules", "test:i18n", "build"].every((k) => idx(k) >= 0),
      j(["test:privacy-notice", "test:chat-safety", "test:house-bot-rules", "test:i18n", "build"].map((k) => `${k}@${idx(k)}`)));
  }

  // ══ §5 · the published words, and what a player's page prints ══════════════════════════════════════════
  section("§5 · D19a · the published words are `main`'s own, and no player surface prints a house word");
  const mainSha = (() => { try { return git("rev-parse", "--short", "origin/main").trim(); } catch { return ""; } })();
  {
    /**
     * ⭐ THE POPULATION IS DERIVED, NOT TYPED. The published legal text is whatever is tracked under `src/app/legal/`,
     * so a NEW rulebook page joins this pin the day it is added; a hand list is exactly what goes blind to the next
     * file. `terms-version.ts` and the dictionary are named because they are not under that tree and carry the same
     * words (the version stamp a Terms bump moves, and every player sentence in three locales).
     *
     * ⛔ `src/app/_actions/chat.ts` IS NOT RE-PINNED HERE. §6.6 already holds it byte-identical to `origin/main` and
     * that is the assertion D19a's chatbot half turns on; a second copy of the same pin is a second thing to drift.
     */
    const legal = tracked.filter((p) => p.startsWith("src/app/legal/"));
    const PUBLIC_TEXT = [...legal, "src/lib/terms-version.ts", "src/lib/i18n-dict.ts"];
    const blobOf = (rel: string) => { try { return lf(git("cat-file", "blob", `origin/main:${rel}`)); } catch { return null; } };
    const compare = (paths: string[]) => {
      const missing: string[] = [], differs: string[] = [];
      let compared = 0;
      for (const rel of paths) {
        const blob = blobOf(rel);
        if (blob === null || !existsSync(join(ROOT, rel))) { missing.push(rel); continue; }
        compared++;
        if (lf(read(rel)) !== blob) differs.push(rel);
      }
      return { compared, missing, differs };
    };
    ok("5.0 · POPULATION · `origin/main` resolves and is PRINTED, the published legal text derives to at least 14 tracked files, and the two named carriers are in the list — a pin whose ref is missing or whose path list resolves to nothing must fail LOUDLY, never skip",
      mainSha.length >= 7 && legal.length >= 14 && PUBLIC_TEXT.includes("src/lib/i18n-dict.ts") && PUBLIC_TEXT.includes("src/lib/terms-version.ts"),
      j({ originMain: mainSha, legalFiles: legal.length, pinned: PUBLIC_TEXT.length }));
    const real = compare(PUBLIC_TEXT);
    ok(`5.1 · ⛔ D19a · every published word is \`origin/main\`'s own — the two rulebooks, Terms, the privacy notice, the AML and responsible-gambling pages, the agent terms, the legal chrome, the Terms version stamp and the whole dictionary, all identical to ${mainSha || "(unresolved)"}`,
      real.compared === PUBLIC_TEXT.length && real.differs.length === 0 && real.missing.length === 0,
      j({ comparedAgainst: mainSha, compared: real.compared, differs: real.differs, missing: real.missing }));
    // ⛔ CONTROLS · mutated COPIES in memory. The repository is never written to.
    const RULEBOOK = "src/app/legal/rules/_content-up-down.tsx";
    const mutated = lf(read(RULEBOOK)).replace("</li>", "</li> ");
    ok("5.1.c1 · CONTROL · a ONE-CHARACTER change to a copy of the up-down rulebook, compared by the same measure against the same blob, is reported — and the unmutated copy is not",
      mutated !== blobOf(RULEBOOK) && lf(read(RULEBOOK)) === blobOf(RULEBOOK), j({ file: RULEBOOK, mutatedLen: mutated.length }));
    const wrongList = compare(["src/app/legal-does-not-exist/page.tsx", "src/lib/terms-version.tsx"]);
    ok("5.1.c2 · CONTROL · a deliberately WRONG path list compares ZERO files and reports every one as missing — a clean tree and a blind pin print the same green, and this is the difference between them",
      wrongList.compared === 0 && wrongList.missing.length === 2, j(wrongList));
    const branchChanged = git("diff", "--name-only", "origin/main").split("\n").map((s) => s.trim()).filter(Boolean);
    const sweptIn = branchChanged.filter((p) => PUBLIC_TEXT.includes(p));
    /**
     * ⛔ THIS ASSERTED `branchChanged.length >= 10`, AND THAT MEASURED THE WORKING TREE, NOT THE CLAIM
     * (repaired 2026-09-21).
     *
     * `git diff --name-only origin/main` counts UNCOMMITTED files as well as committed ones, so the case
     * passed or failed on how much happened to be unstaged at that moment. It was green all afternoon with
     * seventeen files in flight and went RED on a two-file commit — same tree, same pins, same published
     * words, and a verdict that flipped on a number that has nothing to do with any of them. ⛔ And once a
     * lane is MERGED the count is 0 for ever, so on `main` it could never pass again.
     * ⚠️ THE THRESHOLD ALSO NEVER SERVED 5.1. What makes 5.1 non-vacuous is that the comparison really
     * happened over a real population — 5.0 and 5.1.c2 assert exactly that — and that a real difference is
     * detected, which 5.1.c1 proves with a one-character mutation. How many OTHER files a lane touched says
     * nothing about whether a published legal file moved.
     * ⭐ WHAT IS KEPT IS THE HALF THAT WAS ALWAYS THE POINT: not one changed file is inside the pinned
     * population, so the pin holds the published words without refusing the lane's own work. ⭐ AND IT IS NOW
     * FALSIFIABLE WITHOUT DEPENDING ON THE TREE: the same filter runs over a list with a pinned file PLANTED
     * in it and must catch exactly that one. A detector that cannot be shown to fire is not a control.
     */
    const plantedSweep = [...branchChanged, PUBLIC_TEXT[0]].filter((p) => PUBLIC_TEXT.includes(p));
    ok("5.1.c3 · POSITIVE CONTROL · not one changed file is inside the pinned population — the pin holds the published words without refusing the lane's own work, which is the failure mode a protection guard actually has — and the detector that says so is PROVED to fire, by running it over a list with a pinned file planted in it",
      sweptIn.length === 0 && plantedSweep.length === 1 && plantedSweep[0] === PUBLIC_TEXT[0] && PUBLIC_TEXT.length >= 16,
      j({ changedVsMain: branchChanged.length, sweptIn, planted: plantedSweep, pinned: PUBLIC_TEXT.length }));
  }
  {
    const population = playerRenderedFiles();
    const textOf = (rel: string, code?: string) => printedTexts(rel, decomment(code ?? read(rel)));
    let chars = 0;
    const printing: string[] = [];
    for (const rel of population) {
      const t = textOf(rel);
      chars += t.length;
      /* ⛔ PER FILE, so the register covers the ruled string in the ruled file and nothing else anywhere. */
      const h = readableHitsFor(rel, t);
      if (h.length) printing.push(`${rel} :: ${[...new Set(h)].join(", ")}`);
    }
    const NAMED = ["src/app/legal/rules/_content-up-down.tsx", "src/app/legal/rules/_content-yes-no.tsx", "src/app/legal/terms/page.tsx", "src/app/legal/privacy/page.tsx", "src/app/page.tsx", "src/app/leaderboard/page.tsx", "src/components/markets/resolution-panel.tsx", "src/app/markets/[id]/page.tsx"];
    const absent = NAMED.filter((p) => !population.includes(p));
    ok("5.2.0 · POPULATION · every player-rendered file is read from disk — `src/app/` outside `admin/` and `api/`, `src/components/` outside `admin/` — and the rulebooks, Terms, the privacy notice, the home page, the leaderboard and BOTH surfaces 0.198.3 already reads are in it BY NAME. A sweep over zero files passes, so the count and the printed characters are printed here",
      population.length >= 350 && chars > 400_000 && absent.length === 0,
      j({ files: population.length, printedChars: chars, missingNamed: absent }));
    ok("5.2 · ⛔ D19 · nothing a player's page PRINTS is a house word or a bounded house id — every string literal, template part and JSX text of all " + population.length + " files, comments stripped first. Until this commit the same measure read exactly two of them (`test:house-bot-reports` 0.198.3), and §1 cannot see a server component at all",
      printing.length === 0, j(printing.slice(0, 8)));
    /** The route handlers this population excludes are not uncovered: their BODIES are swept by an executed guard. */
    const apiFiles = srcFiles().filter((p) => p.startsWith("src/app/api/"));
    const reportsCases = read("scripts/lib/house-bot-reports-cases.mts");
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    ok("5.2b · …and the ONE exclusion carries its own proof: `src/app/api/` is a real, non-empty population, and the guard that covers it exists and reads what those routes RETURN rather than what their source says — `test:house-bot-reports` calls `/api/fairness/recent` and `/api/health` and runs the vocabulary over the bodies (11.171, 11.247). An exclusion whose covering guard is not asserted is a silent hole",
      apiFiles.length >= 20 && typeof pkg.scripts["test:house-bot-reports"] === "string"
        && reportsCases.includes("src/app/api/fairness/recent/route.ts") && reportsCases.includes("11.171.2") && reportsCases.includes("11.247"),
      j({ apiFiles: apiFiles.length, key: pkg.scripts["test:house-bot-reports"] }));
    // ⛔ CONTROLS · every plant goes into a COPY in memory. Nothing on disk is written.
    const rulebook = read("src/app/legal/rules/_content-up-down.tsx");
    const yesNo = read("src/app/legal/rules/_content-yes-no.tsx");
    const home = read("src/app/page.tsx");
    const plantEn = textOf("src/app/legal/rules/_content-up-down.tsx", rulebook + "\nexport const P = () => <li>50pick may place house stakes to add liquidity to a market.</li>;\n");
    const plantSw = textOf("src/app/legal/rules/_content-yes-no.tsx", yesNo + "\nexport const P = () => <li>Dau la nyumba linaweza kuwekwa na jukwaa.</li>;\n");
    const plantZh = textOf("src/app/legal/rules/_content-yes-no.tsx", yesNo + "\nexport const P = () => <li>平台投注由平台机器人下单。</li>;\n");
    ok("5.2.c1 · CONTROL · a house sentence planted as JSX text into a copy of the real up-down rulebook is reported, and the Kiswahili and Chinese renderings planted into the yes-no rulebook are each reported on their own line — an English-only list run over three locales is the failure this names rather than hides in an aggregate",
      readableHits(plantEn).length >= 1 && readableHits(plantSw).length >= 1 && readableHits(plantZh).length >= 1,
      j({ en: readableHits(plantEn), sw: readableHits(plantSw), zh: readableHits(plantZh) }));
    const plantId = textOf("src/app/page.tsx", home + '\nexport const P = () => <p>hb_0123456789abcdef01234567</p>;\n');
    ok("5.2.c2 · CONTROL · a BOUNDED house id planted as JSX text into a copy of the home page is reported — the id family is in this sweep because no player sentence can carry one legitimately",
      readableHits(plantId).some((h) => h.startsWith("ids:")), j(readableHits(plantId)));
    const benign = textOf("src/app/page.tsx", home + `\nexport const B = () => <p>{${j(HOUSE_BENIGN_SAMPLES.join(" · "))}}</p>;\n`);
    const marketPage = textOf("src/app/markets/[id]/page.tsx");
    ok("5.2.c3 · POSITIVE CONTROL · the benign look-alikes are NOT reported — `HOUSE_FEE`, the `/admin/house` owner book `main` already ships, a raw `hb_` prefix and a 28-hex tail — and neither is the market page's own `HOUSE_STAKE_ONLY`, which the register names for THAT FILE. A sweep that refused those would refuse the platform's own vocabulary and be turned off within a week",
      readableHits(benign).length === 0 && readableHitsFor("src/app/markets/[id]/page.tsx", marketPage).length === 0,
      j({ benign: readableHits(benign), marketPage: readableHitsFor("src/app/markets/[id]/page.tsx", marketPage), raw: readableHits(marketPage), benignSamples: HOUSE_BENIGN_SAMPLES.length }));
    /* ⛔ THE REGISTER IS HELD TO ITS OWN SUBJECT. An exemption that outlives the string it was ruled for is a
     * hole with a paragraph over it, and it is the shape `0.198.3b` already refuses one suite over. */
    const staleRegister = Object.entries(PLAYER_TEXT_REGISTER).flatMap(([rel, ws]) => {
      if (!population.includes(rel)) return [`${rel}: no longer a player-rendered file`];
      const printed = textOf(rel);
      return ws.filter((w) => !printed.includes(w)).map((w) => `${rel}: "${w}" is registered but no longer printed`);
    });
    ok("5.2.c3b · ⛔ SHRINK-ONLY · every string the register names is STILL printed by the file it was named for, and that file is still in the population — an exemption whose subject has gone is a hole nobody is watching",
      staleRegister.length === 0 && Object.keys(PLAYER_TEXT_REGISTER).length >= 1,
      j({ stale: staleRegister, register: PLAYER_TEXT_REGISTER }));
    const specOnly = textOf("src/app/page.tsx", 'import { x } from "@/lib/house-bot/exposure-copy";\n' + home);
    const specAndText = textOf("src/app/page.tsx", 'import { x } from "@/lib/house-bot/exposure-copy";\n' + home + "\nexport const P = () => <p>house bots</p>;\n");
    ok("5.2.c4 · POSITIVE CONTROL · the module-specifier exclusion is EXACTLY that: a planted `from \"@/lib/house-bot/exposure-copy\"` alone is not a print hit (an import path is not a character a player reads, and what a player surface may IMPORT is 0.198.1's separate claim over this same population), while the same words in a JSX line in the same copy ARE",
      readableHits(specOnly).length === 0 && readableHits(specAndText).length >= 1,
      j({ specifierOnly: readableHits(specOnly), withText: readableHits(specAndText) }));
    const emptyPop = srcFiles().filter((p) => isPlayerRendered(p) && p.startsWith("src/app/does-not-exist/"));
    ok("5.2.c5 · CONTROL · a population that resolves to zero files is distinguishable from a clean one: the floor in 5.2.0 is what separates them, and it is asserted BEFORE 5.2 runs",
      emptyPop.length === 0 && population.length >= 350, j({ emptyPopulation: emptyPop.length, realPopulation: population.length }));
    /**
     * ⛔ THE REGISTER POLICES WHAT IT EXEMPTS, ON THE AXIS THAT MATTERS — **THE FILE**.
     *
     * ⚠️ THIS CONTROL REPLACES ONE THAT COULD NOT ARBITRATE. The version at 247e5913 varied case, separator and
     * spacing (`house stake` / `House stakes` / `house_stakes`) and never varied WHERE the token sat — while the
     * exemption it was proving was justified entirely by position. A narrowness control blind to the axis of its
     * own claim proves nothing, and it passed while the exemption was swallowing a whole shape class.
     * ⛔ SO THE PLANT THAT DECIDES IT IS `c6b`: the SAME token, in a file the register does NOT name. Under the
     * shape exemption that plant was invisible. Under a file-keyed register it is REPORTED, and the difference
     * between the two designs is exactly one assertion wide.
     */
    const registeredFile = "src/app/markets/[id]/page.tsx";
    const marketRaw = textOf(registeredFile);
    ok("5.2.c6 · POSITIVE CONTROL · the register covers the ruled string IN THE RULED FILE: the market page's own `HOUSE_STAKE_ONLY` is not reported, and the raw sweep of that same file DOES see it — so the register is doing the work, not a blind spot in the vocabulary",
      readableHitsFor(registeredFile, marketRaw).length === 0 && readableHits(marketRaw).length >= 1,
      j({ afterRegister: readableHitsFor(registeredFile, marketRaw), rawHits: readableHits(marketRaw) }));
    const elsewhere = textOf("src/app/page.tsx", home
      + '\nexport const Q = () => { const s = "HOUSE_STAKE_ONLY"; return <p>{s === "HOUSE_STAKE_ONLY" ? "Haifai" : ""}</p>; };\n');
    ok("5.2.c6b · ⛔ CONTROL · THE SAME TOKEN IN AN UNREGISTERED FILE IS REPORTED — planted into a copy of the home page, `HOUSE_STAKE_ONLY` is a hit, because the register is keyed by FILE and not by SHAPE. ⚠️ The shape exemption this replaces returned ZERO here, across all ~394 player-rendered files, which is the defect this line exists to make impossible to reintroduce silently",
      readableHitsFor("src/app/page.tsx", elsewhere).length >= 1,
      j({ hits: readableHitsFor("src/app/page.tsx", elsewhere) }));
    const printedForm = textOf("src/app/page.tsx", home
      + '\nexport const W = () => <li aria-label="HOUSE_BOT">HOUSE_STAKES may be placed by the platform.</li>;\n');
    ok("5.2.c6c · ⛔ CONTROL · a SCREAMING_SNAKE house token in a genuinely PRINTED position — JSX text and an `aria-label` a screen reader speaks — is reported. This is the axis `printedTexts` cannot distinguish from an operand (it joins every string literal and JSX text and discards the AST), which is precisely why the exemption must be keyed by file rather than by the shape of the token",
      readableHitsFor("src/app/page.tsx", printedForm).length >= 1,
      j({ hits: readableHitsFor("src/app/page.tsx", printedForm) }));
    const spelled = textOf("src/app/page.tsx", home
      + "\nexport const R = () => <p>house stake</p>;\n"
      + "\nexport const S = () => <p>House stakes</p>;\n"
      + "\nexport const T = () => <p>house_stakes</p>;\n");
    ok("5.2.c6d · CONTROL · every readable spelling is still reported in an unregistered file — `house stake`, `House stakes` and the lower-case `house_stakes` — so closing the shape hole did not cost the case-and-separator coverage `§2J · THE JOIN` bought",
      readableHitsFor("src/app/page.tsx", spelled).length >= 3,
      j({ hits: readableHitsFor("src/app/page.tsx", spelled) }));
    /**
     * ⚠️ REPORTED, NOT ASSERTED — and it is DEFERRED row 79's finding, reproduced here by a SECOND instrument
     * that did not know about it. This control was first written to also require `pos_house_ae493df558086e93cc54fd5b`
     * to be reported. IT IS NOT, and the exclusion above is NOT the reason: that token is not a hit of this
     * measure AT ALL. The shared words family carries no bare `house` (only `house<join>bots?`/`house<join>stakes?`,
     * and there is no "stake" in it), and the id family is `hb[iethp]?_` + 24 hex, which `pos_house_…` is not.
     * ⛔ SO THE GAP IS REAL AND IT IS NOT MINE TO CLOSE HERE: widening this family to bare `house` would refuse
     * `/admin/house`, `HOUSE_FEE` and the owner book `main` already ships — `5.2.c3` exists to stop exactly that.
     * Row 79 records the same conclusion from the served side ("the GUARD is still one composite identifier away
     * from being blind") and records why it is not exploited today: `buyPositionInner` mints `pos_${randomId(10)}`
     * and `placeHouseBet` runs that same function, so a real house position's id carries no marking — the only
     * token exploiting the gap was a fixture's own. This line prints the probe every run so the gap stays visible
     * instead of being rediscovered a third time.
     */
    const composite = textOf("src/app/page.tsx", home + "\nexport const V = () => <p>pos_house_ae493df558086e93cc54fd5b</p>;\n");
    console.log(`  note  5.2.n1 · the composite-id gap (DEFERRED row 79) is STILL OPEN and is reported, not asserted: a planted "pos_house_<24hex>" printed as JSX text yields ${j(readableHits(composite))} — no words hit (the family has no bare "house") and no ids hit (the family needs an "hb_" prefix)`);
  }

  // ══ §8 · the struck Board draft, and the dormant recorder ══════════════════════════════════════════════
  section("§8 · the Gaming Board draft is STRUCK (owner ruling 2026-09-20), and the dormant recorder stays dormant");
  {
    /**
     * 🔴 THE NAME IS ASSEMBLED, NOT TYPED, AND THAT IS NOT A STYLE CHOICE. 8.2's claim is over every TRACKED file, and
     * a guard that spells its own subject is a tenth citation of it — the first green run of this section reported four
     * hits inside THIS module and would have forced either a folder exclusion (the defect this lane repaired: a house
     * word sat live on an admin page because the lexicon guard scanned one folder and the string lived in another) or a
     * marker comment in source, which is prose standing in for enforcement. Assembling it keeps the population whole:
     * no file is excluded, and the count below is every real citation there is.
     */
    const DRAFT = ["BOARD", "DISCLOSURE", "HOUSE", "BOTS"].join("-");
    /** The marker every surviving citation must carry, so no future session rebuilds the file from a stale plan. */
    const MARKER = "STRUCK 2026-09-20";
    ok(`8.1 · ⛔ \`docs/${DRAFT}.md\` does not exist and is not tracked — the owner ruled on 2026-09-20 that the Gaming Board needs nothing, and under D20 the statutory figures the Board receives are identical whichever account placed the stake`,
      !existsSync(join(ROOT, "docs", `${DRAFT}.md`)) && !tracked.some((p) => p.includes(DRAFT) && p.endsWith(".md") && p.split("/").pop() === `${DRAFT}.md`),
      j({ onDisk: existsSync(join(ROOT, "docs", `${DRAFT}.md`)), tracked: tracked.filter((p) => p.includes(DRAFT)) }));
    const citations: Array<{ file: string; line: number; text: string }> = [];
    for (const rel of tracked) {
      let c: string;
      try { if (!statSync(join(ROOT, rel)).isFile()) continue; c = read(rel); } catch { continue; }
      if (!c.includes(DRAFT)) continue;
      lf(c).split("\n").forEach((text, i) => { if (text.includes(DRAFT)) citations.push({ file: rel, line: i + 1, text }); });
    }
    /** 8.2's ONE measure, used by 8.2 and by its controls alike: which citing lines lack the dated strike note. */
    const unmarkedIn = (rows: Array<{ file: string; line: number; text: string }>) => rows.filter((c) => !c.text.includes(MARKER));
    const files = [...new Set(citations.map((c) => c.file))];
    ok("8.2.0 · POPULATION · every tracked file was read and the citations were FOUND: at least 9 files and at least 14 lines name the struck draft. A scan that found none would pass 8.2 over nothing",
      files.length >= 9 && citations.length >= 14, j({ files: files.length, lines: citations.length, where: files }));
    const unmarked = unmarkedIn(citations);
    ok(`8.2 · ⛔ every one of the ${citations.length} citations across ${files.length} files carries the dated strike note \`${MARKER}\` ON THE CITING LINE — nine documents named this draft as a live authority, and a reader who meets any one of them without the note rebuilds a file the owner struck`,
      unmarked.length === 0, j(unmarked.slice(0, 6).map((c) => `${c.file}:${c.line}`)));
    /** ⭐ POSITIVE CONTROL · the three REAL Gaming Board documents. A strike guard that swept them in would demand a
     *  "struck" note on live papers of record — the shape that refused this lane's own purge cleanup two runs ago. */
    const OTHERS = ["BOARD-DISCLOSURE-KYC-AT-WITHDRAWAL", "BOARD-DISCLOSURE-B-E", "BOARD-DISCLOSURE-KYC-FIRST"];
    const othersState = OTHERS.map((name) => ({
      name,
      exists: existsSync(join(ROOT, "docs", `${name}.md`)),
      citingFiles: tracked.filter((p) => { try { return statSync(join(ROOT, p)).isFile() && read(p).includes(name); } catch { return false; } }).length,
      reported: citations.filter((c) => c.text.includes(name) && !c.text.includes(DRAFT)).length,
    }));
    ok("8.2b · POSITIVE CONTROL · the three REAL Board documents are untouched by this strike: each is on disk, each is cited in live documents of record, and NONE of those citations is reported or asked for a strike note. The guard is scoped to the struck draft's own name, not to the words \"board disclosure\"",
      othersState.every((o) => o.exists && o.citingFiles >= 5 && o.reported === 0), j(othersState));
    /**
     * ⛔ CONTROLS RUN 8.2's OWN MEASURE over mutated COPIES of the citation list. A control that only re-checks its own
     * mutation ("I removed the marker, and look, the marker is gone") proves the mutation, not the guard.
     */
    const stripOne = citations.map((c, i) => (i === 0 ? { ...c, text: c.text.split(MARKER).join("") } : c));
    const plantedNew = citations.concat({ file: "plans/house-bots/NEXT-SESSION.md", line: 1, text: `Write \`docs/${DRAFT}.md\` from §3.4 before the push.` });
    const plantedMarked = citations.concat({ file: "plans/house-bots/NEXT-SESSION.md", line: 1, text: `~~Write \`docs/${DRAFT}.md\`~~ ⛔ ${MARKER} (D21).` });
    ok("8.2.c1 · CONTROL · the SAME measure over a copy of the citation list with the note stripped from one real line reports exactly that line; a NEWLY planted citation with no note — the shape a future session actually produces, an instruction to write the file — is reported; and the same planted citation WITH the note is not",
      unmarkedIn(stripOne).length === 1 && unmarkedIn(stripOne)[0].file === citations[0].file
        && unmarkedIn(plantedNew).length === 1 && unmarkedIn(plantedMarked).length === 0,
      j({ stripped: unmarkedIn(stripOne).map((c) => `${c.file}:${c.line}`), planted: unmarkedIn(plantedNew).map((c) => c.file), plantedMarked: unmarkedIn(plantedMarked).length }));
    const src = srcFiles();
    /** 8.3's and 8.4's ONE measure each, over a list of {rel, code} — so the controls feed a MUTATED list to the
     *  same function rather than re-checking their own plant. */
    const sectionSitesIn = (files: Array<{ rel: string; code: string }>) => files.filter((f) => f.code.includes("BOARD_DISCLOSURE_SECTIONS")).map((f) => f.rel);
    const realFiles = src.map((rel) => ({ rel, code: read(rel) }));
    const sectionsIn = sectionSitesIn(realFiles);
    ok("8.3 · ⛔ `BOARD_DISCLOSURE_SECTIONS` exists nowhere under `src/` — the constant existed only to be checked against the draft's section headings, and the owner ruling that struck the draft struck it with the draft. `plans/house-bots/C6-SPEC-EXTRACT.md` still instructs a builder to add it, which is what this pin is for",
      sectionsIn.length === 0, j({ src: src.length, found: sectionsIn }));
    const REC = () => /BOARD_DISCLOSURE_RECORDED|board_disclosure_recorded/g;
    const recSitesIn = (files: Array<{ rel: string; code: string }>) =>
      files.map((f) => ({ rel: f.rel, n: (decomment(f.code).match(REC()) ?? []).length })).filter((x) => x.n > 0);
    const recSites = recSitesIn(realFiles);
    const constants = "src/lib/house-bot/constants.ts";
    /** The owner console's kind→sentence table (`CONSOLE_EVENT_WORD`), added for every kind at once by
     *  C7 step 5 (`5deb1e81`). Pinned and proved a non-writer at 8.4a below. */
    const CONSOLE_READ = "src/lib/server/house-console-read.ts";
    /**
     * ⛔ THE SENTENCE DRIFTED; THE SUBJECT DID NOT. Until C7 step 5 the name really did occur in ONE
     * file, and this assertion said so. `5deb1e81` then added the console's label table and the
     * recorder got a sentence with every other kind. The invariant D20 struck the draft to protect —
     * that nothing can EMIT a board disclosure — never moved. So the SENTENCE is corrected and the
     * MEASUREMENT kept: `constants.ts` is still pinned at exactly two, and the only other file that
     * may contain the name at all is the console, which 8.4a pins at exactly one AND proves is a
     * label rather than a writer. A THIRD file is still a failure, which is where a writer would land.
     * ⛔ This is not "at most two files": both are named, both counts are exact.
     */
    const recElsewhere = recSites.filter((s) => s.rel !== constants && s.rel !== CONSOLE_READ);
    ok("8.4 · ⛔ the dormant recorder is DECLARED and UNWRITTEN: with comments stripped first, `BOARD_DISCLOSURE_RECORDED` occurs exactly TWICE in `constants.ts` (the event kind and its audit classification) and in NO source file anywhere under `src/` except the console label pinned at 8.4a — so nothing writes such an event and no action can emit one",
      recSites.find((s) => s.rel === constants)?.n === 2 && recElsewhere.length === 0,
      j({ src: src.length, sites: recSites, elsewhere: recElsewhere }));
    /**
     * ⛔ 8.4a · THE LABEL C7 STEP 5 ADDED, PINNED SEPARATELY AND PROVED NOT TO BE A WRITER.
     * `5deb1e81` gave every event kind a sentence in the owner console's `CONSOLE_EVENT_WORD`
     * table, and the dormant recorder got one with the rest. ⭐ A LABEL IS NOT A WRITER — what
     * D20 protects is that nothing can EMIT a board disclosure. So the occurrence is allowed only
     * as a `KIND: "sentence"` map value, and ONLY while no write shape exists anywhere in that
     * file. This is an extra assertion, not a relaxation: it pins a count of exactly one and adds
     * a shape proof the old count alone never made.
     */
    const labelShapeIn = (code: string) => decomment(code).includes('BOARD_DISCLOSURE_RECORDED: "');
    const noWriteShapeIn = (code: string) => {
      const c = decomment(code);
      return !c.includes('kind: "BOARD_DISCLOSURE_RECORDED"')
        && !c.includes("kind: 'BOARD_DISCLOSURE_RECORDED'")
        && !/createEvent[^;]{0,200}BOARD_DISCLOSURE_RECORDED/.test(c);
    };
    const consoleCode = realFiles.find((f) => f.rel === CONSOLE_READ)?.code ?? "";
    ok("8.4a · ⛔ the ONE occurrence outside `constants.ts` is the owner console's `CONSOLE_EVENT_WORD` label and nothing else: exactly once in `house-console-read.ts`, of the shape `KIND: \"sentence\"`, with no `kind:` argument and no `createEvent` naming the recorder anywhere in that file. A label is not a writer",
      consoleCode.length > 1_000
        && (recSitesIn([{ rel: CONSOLE_READ, code: consoleCode }])[0]?.n ?? 0) === 1
        && labelShapeIn(consoleCode) && noWriteShapeIn(consoleCode),
      j({ label: labelShapeIn(consoleCode), noWrite: noWriteShapeIn(consoleCode) }));
    const migration = "prisma/migrations/20260916150000_house_bot_tables/migration.sql";
    const eventKinds = read(constants);
    ok("8.4b · POSITIVE CONTROL · …and it is STILL DECLARED where production needs it. The migration is APPLIED on production, so the Postgres enum holds the value; `constants.ts` mirrors it, and the table's CHECK is built from that list. A guard that demanded the NAME be absent would push the next session to delete a value the live database has, and the table's CHECK would stop matching the code",
      existsSync(join(ROOT, migration)) && read(migration).includes("'BOARD_DISCLOSURE_RECORDED'")
        && eventKinds.includes('"BOARD_DISCLOSURE_RECORDED"') && eventKinds.includes('"house_bot.board_disclosure_recorded"'),
      j({ migration: existsSync(join(ROOT, migration)), inMigration: read(migration).includes("'BOARD_DISCLOSURE_RECORDED'") }));
    /** ⛔ THE PLANTS GO THROUGH THE SAME TWO FUNCTIONS, over a copy of the real file list. The shapes are the ones the
     *  un-built recorder would actually take: a writer emitting the event, and the struck constant re-declared. */
    const SEAM = "src/lib/server/house-bot/seam.ts";
    const seamCode = realFiles.find((f) => f.rel === SEAM)?.code ?? "";
    const withWrite = realFiles.map((f) => (f.rel === SEAM ? { ...f, code: `${f.code}\nexport async function recordDisclosure(id: string) { return dal.createEvent({ kind: "BOARD_DISCLOSURE_RECORDED", houseBotId: id }); }\n` } : f));
    const withComment = realFiles.map((f) => (f.rel === SEAM ? { ...f, code: `${f.code}\n// BOARD_DISCLOSURE_RECORDED was never built (ruling 273(a)).\n` } : f));
    const withConst = realFiles.map((f) => (f.rel === constants ? { ...f, code: `${f.code}\nexport const BOARD_DISCLOSURE_SECTIONS = ["1 · What 50pick does"] as const;\n` } : f));
    ok("8.4.c1 · CONTROL · an event WRITE planted into a copy of the real house seam is reported by 8.4's own measure as a SECOND file, a planted `BOARD_DISCLOSURE_SECTIONS` declaration is reported by 8.3's, and a COMMENT naming the recorder in the same place is reported by NEITHER — documentation standing in for enforcement is the defect this lane just repaired, and three guards here have been fooled by prose about code",
      seamCode.length > 1_000
        && recSitesIn(withWrite).length === recSites.length + 1 && recSitesIn(withWrite).some((x) => x.rel === SEAM)
        && recSitesIn(withComment).length === recSites.length
        /* ⛔ …and the plant must actually turn 8.4 RED, not merely appear in a list: the seam is neither
           named site, so 8.4's own `recElsewhere` measure reports it. A control that stops at "the count
           changed" would survive 8.4 being rewritten into something that no longer fails. */
        && recSitesIn(withWrite).filter((s) => s.rel !== constants && s.rel !== CONSOLE_READ).length === 1
        && recSitesIn(withComment).filter((s) => s.rel !== constants && s.rel !== CONSOLE_READ).length === 0
        /* ⛔ …and the console's label pin is falsifiable in BOTH directions: a write planted into a copy
           of the console file breaks the no-write proof, and a copy with the label line gone breaks the
           label proof. 8.4a asserts both on the real file. */
        && !noWriteShapeIn(`${consoleCode}\nawait dal.createEvent({ kind: "BOARD_DISCLOSURE_RECORDED" });\n`)
        && !labelShapeIn(consoleCode.split('BOARD_DISCLOSURE_RECORDED: "').join('SOMETHING_ELSE: "'))
        && sectionSitesIn(withConst).length === 1 && sectionSitesIn(withConst)[0] === constants,
      j({ write: recSitesIn(withWrite).map((x) => `${x.rel}×${x.n}`), comment: recSitesIn(withComment).map((x) => x.rel), sections: sectionSitesIn(withConst) }));
  }

  // ══ §docs · the registers of record ════════════════════════════════════════════════════════════════════
  section("§docs · accepted risk 21 in both registers, its premise measured live, and the condition still unsatisfied");
  {
    const CD = lf(read("docs/COMPLIANCE-DECISIONS.md"));
    const HB = lf(read("docs/HOUSE-BOTS.md"));
    const slice = (text: string, from: RegExp, to: RegExp) => {
      const a = text.search(from);
      if (a < 0) return "";
      const rest = text.slice(a);
      const b = rest.slice(1).search(to);
      return b < 0 ? rest : rest.slice(0, b + 1);
    };
    const cdRisks = slice(CD, /^### Accepted risks$/m, /^### Accountability$/m);
    const hbRisks = slice(HB, /^## 13\. Accepted risks$/m, /^## 14\./m);
    ok("§docs.0 · POPULATION · both registers were read and both accepted-risk slices were located and are substantial — the previous pass that 'discovered' risk 21 missing had read the numbered LIST only, and a slice that resolved to nothing would let every assertion below pass over an empty string",
      cdRisks.length > 4_000 && hbRisks.length > 3_000, j({ compliance: cdRisks.length, houseBots: hbRisks.length }));
    /**
     * Risk 21's lead paragraph, located by its own opening — never by a line number, which is how every anchor in the
     * commit-6 plan rotted. It ends at the next numbered risk, the next `###` heading or the "Risks 8–12" line,
     * because the two registers place it DIFFERENTLY: in `COMPLIANCE-DECISIONS.md` it leads the section, above the
     * numbered list; in `HOUSE-BOTS.md` §13 it follows risk 20 and is followed by its evidence heading. An end anchored
     * to one register's neighbour would silently swallow the other's evidence block into the comparison.
     */
    const risk21 = (text: string) => slice(text, /^\*\*21 \(added 2026-09-16 with D19\)\.\*\*/m, /^(?:\d+\. |### |Risks 8)/m).trim();
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    const cd21 = risk21(cdRisks), hb21 = risk21(hbRisks);
    ok("d.1 · ⛔ accepted risk 21 is in BOTH registers and the two copies are the SAME TEXT (whitespace normalised) — it existed in full in `COMPLIANCE-DECISIONS.md` with its dated ruling-503 correction and nowhere in `HOUSE-BOTS.md` §13, while §13's own preamble claimed the two files carry the same text",
      cd21.length > 800 && hb21.length > 800 && norm(cd21) === norm(hb21),
      j({ complianceChars: cd21.length, houseBotsChars: hb21.length, equal: norm(cd21) === norm(hb21), firstDivergence: norm(cd21) === norm(hb21) ? null : norm(hb21).slice(0, 120) }));
    const numbers = (text: string) => [13, 14, 15, 16, 17, 18, 19, 20].filter((n) => new RegExp(`^${n}\\. `, "m").test(text));
    ok("d.2 · risks 13–20 are present by number in both registers — risk 21 arrived beside them and displaced none",
      numbers(cdRisks).length === 8 && numbers(hbRisks).length === 8, j({ compliance: numbers(cdRisks), houseBots: numbers(hbRisks) }));
    const DNR = ["No human-typed side.", "No human-typed amount.", "No sizing against cancellable money"];
    ok("d.3 · the three do-not-restore lines are in `HOUSE-BOTS.md` §13's own section and are not weakened by risk 21's insertion",
      DNR.every((s) => HB.includes(s)) && HB.includes("### Do not restore"), j(DNR.filter((s) => !HB.includes(s))));
    /**
     * ⭐ d.4 · RISK 21'S PREMISE, MEASURED LIVE. The risk says the published rulebooks prohibit what the platform does.
     * Nobody had ever quoted them. These are the exact sentences, read from the files a player reads, and pinning them
     * makes the premise a live fact: if a future session "solves" risk 21 by carving house accounts out of the rules,
     * this goes RED — and that carve-out is precisely what D19 forbids, because a player can read it.
     */
    const RULE_SENTENCES: Array<[string, string]> = [
      ["src/app/legal/rules/_content-yes-no.tsx", "One account per person. Multiple accounts, shared accounts and account sales are prohibited and may lead to forfeiture of winnings."],
      ["src/app/legal/rules/_content-yes-no.tsx", "Bots, scripts and automated tools may not be used to place stakes or scrape the platform."],
      ["src/app/legal/rules/_content-up-down.tsx", "Using bots, scripts or automated tools to place stakes or scrape the platform."],
    ];
    const printedOf = new Map<string, string>();
    for (const [file] of RULE_SENTENCES) if (!printedOf.has(file)) printedOf.set(file, printedTexts(file, decomment(read(file))));
    const missingSentences = RULE_SENTENCES.filter(([file, s]) => !printedOf.get(file)!.includes(s));
    ok("d.4 · ⛔ risk 21's PREMISE is true TODAY, read out of the published rulebooks rather than recalled: all three sentences are present in what those pages PRINT — the one-account-per-person rule with its forfeiture clause, the yes/no rulebook's bots prohibition, and the up-down rulebook's prohibited-conduct line. A carve-out for house accounts would turn this red, and a carve-out a player can read is what D19 forbids",
      missingSentences.length === 0 && [...printedOf.values()].every((t) => t.length > 2_000),
      j({ files: [...printedOf.keys()].map((f) => `${f}:${printedOf.get(f)!.length}`), missing: missingSentences.map(([f, s]) => `${f} :: ${s.slice(0, 40)}…`) }));
    ok("d.4.c1 · CONTROL · the same measure over a COPY of the yes-no rulebook with the bots sentence deleted reports it, and a copy with the sentence reworded (\"may be used\") reports it too — presence is asserted on the WORDS, so a reversal that keeps the shape is caught",
      !printedTexts(RULE_SENTENCES[1][0], decomment(read(RULE_SENTENCES[1][0]).split(RULE_SENTENCES[1][1]).join(""))).includes(RULE_SENTENCES[1][1])
        && !printedTexts(RULE_SENTENCES[1][0], decomment(read(RULE_SENTENCES[1][0]).split(RULE_SENTENCES[1][1]).join("Bots, scripts and automated tools may be used to place stakes or scrape the platform."))).includes(RULE_SENTENCES[1][1]),
      "the deleted and the reworded copies are both reported");
    const CONDITION = "condition 1 (written GBT approval) is waived by owner ruling D1, not satisfied";
    ok("d.5 · ⛔ F6 §5 condition 1 is UNCHANGED and still reads \"waived by owner ruling D1, not satisfied\". The 2026-09-20 ruling is the owner reporting what a regulator told him; it satisfies no condition that asks for WRITTEN approval, and the one sentence a later reader could misread is pinned here word for word",
      CD.includes(CONDITION), j({ found: CD.includes(CONDITION), condition: CONDITION }));
    const flipped = CD.split(CONDITION).join("condition 1 (written GBT approval) is waived by owner ruling D1, satisfied");
    ok("d.5.c1 · CONTROL · a copy of that line with \"not satisfied\" changed to \"satisfied\" no longer contains the pinned sentence, while it still contains \"condition 1 (written GBT approval)\" — so the pin is shown to be on the WHOLE clause and not on a prefix that survives the flip, which is the only version of this control worth having",
      !flipped.includes(CONDITION) && flipped.includes("condition 1 (written GBT approval)") && CD.includes("condition 1 (written GBT approval)"),
      j({ flippedStillHasPrefix: flipped.includes("condition 1 (written GBT approval)"), flippedHasClause: flipped.includes(CONDITION) }));
    /**
     * d.6 · THE 2026-09-20 RULING IS RECORDED AS A VERBAL OWNER REPORT, NEVER AS A REGULATOR DOCUMENT. The register
     * already carries one of that kind (D19a: "Ali reports that the Gaming Board of Tanzania told him his answers are
     * legally valid; no document is on file"), and the new entry is held to THAT form rather than to one invented here.
     */
    const D19A_FORM = "Ali reports that the Gaming Board of Tanzania told him his answers are legally valid; no document is on file";
    const verbalShape = (text: string) => /Ali reports/.test(text) && /no document/i.test(text) && !/attached|enclosed|signed by the (?:Board|Gaming Board)|letter from the (?:Board|Gaming Board)/i.test(text);
    const d20Entry = slice(CD, /^### Owner ruling D21 \(Ali, 2026-09-20\)/m, /^### /m);
    ok("d.6 · the 2026-09-20 ruling is written in the register's OWN verbal-report form — it says Ali reports what he was told, says no document is on file, and never implies a paper from the regulator. A stranger reading it in a year cannot mistake it for a document the Board issued",
      d20Entry.length > 400 && verbalShape(d20Entry), j({ chars: d20Entry.length, shape: verbalShape(d20Entry), head: d20Entry.slice(0, 90) }));
    ok("d.6.c1 · POSITIVE CONTROL · the shape test is the register's own, not one invented for this entry: D19a's existing sentence passes it unchanged, and a fabricated \"a signed letter from the Gaming Board is attached\" fails it",
      verbalShape(D19A_FORM) && CD.includes(D19A_FORM) && !verbalShape("Ali reports that a signed letter from the Gaming Board is attached; no document is on file"),
      j({ d19a: verbalShape(D19A_FORM), fabricated: verbalShape("Ali reports that a signed letter from the Gaming Board is attached; no document is on file") }));
    ok("d.1.c1 · CONTROL · risk 21 DELETED from a copy of §13 is reported, and so is a copy in which one word of it is changed — d.1 is a text equality, not a presence check, so a paraphrase that drifts from the register is caught too",
      risk21(hbRisks.split(hb21).join("")).length === 0 && norm(cd21) !== norm(hb21.replace("misleading", "unfair")),
      j({ deleted: risk21(hbRisks.split(hb21).join("")).length, reworded: norm(cd21) !== norm(hb21.replace("misleading", "unfair")) }));
    ok("d.2.c1 · CONTROL · one risk number deleted from a copy of either slice is reported by d.2's measure",
      numbers(cdRisks.replace(/^15\. /m, "xx. ")).length === 7 && numbers(hbRisks.replace(/^20\. /m, "xx. ")).length === 7,
      j({ compliance: numbers(cdRisks.replace(/^15\. /m, "xx. ")).length, houseBots: numbers(hbRisks.replace(/^20\. /m, "xx. ")).length }));
  }
}
