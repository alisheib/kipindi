// End-to-end controls for the five social red harnesses. Runs the REAL harness code against a SCRATCH copy of src/,
// doctoring either the product (a regression) or the guard (a toothless guard) in the copy. Nothing here touches
// F:\kipindi-rot3 except to read it.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/ctl-social";
const REAL = "F:/kipindi-rot3";
const CLI = `${REAL}/node_modules/tsx/dist/cli.mjs`;

// every file any scenario edits, restored from the real tree before each scenario
const FILES = [
  "src/components/layout/public-footer.tsx",
  "src/components/ui/pull-to-refresh.tsx",
  "src/components/social/channels-panel.tsx",
  "scripts/social-links.test.mts",
  "scripts/social-panel.test.mts",
  "scripts/lib/red-judge.mts",
];
for (const n of ["social-links", "social-panel"]) {
  const r = spawnSync("git", ["show", `HEAD:scripts/${n}.test.mts`], { cwd: REAL, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error("git show failed for " + n);
  fs.writeFileSync(`${S}/orig/${n}.old.mts`, r.stdout);
}
const restore = () => {
  for (const f of FILES) fs.copyFileSync(`${REAL}/${f}`, `${S}/${f}`);
  for (const n of ["social-links", "social-panel"]) fs.copyFileSync(`${S}/orig/${n}.old.mts`, `${S}/scripts/${n}.old.mts`);
};

const edit = (file, from, to) => {
  let t = fs.readFileSync(`${S}/${file}`, "utf8");
  const eol = t.includes("\r\n") ? "\r\n" : "\n";
  const needle = from.replace(/\r?\n/g, eol);
  const n = t.split(needle).length - 1;
  if (n !== 1) throw new Error(`SCENARIO SETUP BROKEN: ${file}: anchor matched ${n}x: ${from.slice(0, 80)}`);
  fs.writeFileSync(`${S}/${file}`, t.replace(needle, () => to.replace(/\r?\n/g, eol)));
};
const append = (file, text) => fs.appendFileSync(`${S}/${file}`, text);

const run = (script, flags = []) => {
  const r = spawnSync(process.execPath, [CLI, script, ...flags], { cwd: S, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
};
const verdictLines = (out) => {
  const lines = out.split(/\r?\n/);
  const at = lines.findIndex((l) => l.includes("RED PROOF"));
  return (at >= 0 ? lines.slice(at + 1) : lines.slice(-6)).filter((l) => l.trim()).map((l) => "     " + l.slice(0, 250));
};
const oldTail = (out) => out.split(/\r?\n/).filter((l) => l.trim()).slice(-2).map((l) => "     " + l.slice(0, 200));

let broken = 0;
const scenario = (title, want, setup, script, flags, show = verdictLines) => {
  restore();
  setup();
  const { code, out } = run(script, flags);
  const verdict = code === want ? "as expected" : "UNEXPECTED";
  if (code !== want) broken++;
  console.log(`\n## ${title}\n   ${script} ${flags.join(" ")}  ->  exit ${code} (wanted ${want}: ${verdict})`);
  console.log(show(out).join("\n"));
};

// an unrelated regression in the panel: 5.2 (no focus trap or scroll lock) reads code(panel), so a comment cannot hide it
const breakAria = () => append("src/components/social/channels-panel.tsx", "\nconst KP_LOCK = useModalLock;\n");
const L = "scripts/social-links.test.mts";
const P = "scripts/social-panel.test.mts";
const FOOT = "src/components/layout/public-footer.tsx";
const PANEL = "src/components/social/channels-panel.tsx";

console.log("================ GREEN BASELINE (real code, untouched copy)");
for (const f of ["--prove-red-home", "--prove-red-token", "--prove-red-rel", "--prove-red-promo"]) scenario(`healthy ${f}`, 0, () => {}, L, [f]);
scenario("healthy --prove-red", 0, () => {}, P, ["--prove-red"]);

console.log("\n================ social-links: the harness must FAIL when it should");
scenario("STALE: the footer spells the attribute differently, so the rel plant removes nothing", 2,
  () => edit(FOOT, 'rel="noopener noreferrer"', 'rel="noreferrer noopener"'), L, ["--prove-red-rel"]);
scenario("BASELINE RED: a real stray instagram literal in src/ (the plant is 'caught' but the proof is void)", 1,
  () => append("src/components/ui/pull-to-refresh.tsx", '\nexport const KP_STRAY = "https://www.instagram.com/strayhandle";\n'), L, ["--prove-red-home"]);
scenario("MISSED home: the guard's §1 check made toothless (cond forced true)", 2,
  () => edit(L, "    TRIPS.home,\n    strays.length === 0,", "    TRIPS.home,\n    true,"), L, ["--prove-red-home"]);
scenario("MISSED token: the guard's §2 check made toothless", 2,
  () => edit(L, "    TRIPS.token,\n    dirty.length === 0,", "    TRIPS.token,\n    true,"), L, ["--prove-red-token"]);
scenario("MISSED rel: the guard's §3 rel check made toothless", 2,
  () => edit(L, "check(TRIPS.rel, body.includes('rel=\"noopener noreferrer\"'));", "check(TRIPS.rel, true);"), L, ["--prove-red-rel"]);
scenario("MISSED promo: the guard's §4 allow-list check made toothless", 2,
  () => edit(L, "check(TRIPS.promo, unlisted.length === 0, unlisted.join(\", \"));", "check(TRIPS.promo, true, unlisted.join(\", \"));"), L, ["--prove-red-promo"]);
scenario("STRAY: the rel plant also strips target=_blank, so a second assertion fails", 1,
  () => edit(L, 'src.replace(/rel="noopener noreferrer"\\s*/g, "")', 'src.replace(/(?:rel="noopener noreferrer"|target="_blank")\\s*/g, "")'), L, ["--prove-red-rel"]);
scenario("TYPO: an unknown --prove-red flag must not run the plain suite and read green", 2, () => {}, L, ["--prove-red-hom"],
  (out) => out.split(/\r?\n/).filter((l) => l.trim()).slice(-2).map((l) => "     " + l.slice(0, 250)));
scenario("COMBINED: two flags at once, each on its own assertion", 0, () => {}, L, ["--prove-red-home", "--prove-red-token"]);
scenario("KNOWN LIMIT (left alone): the §1 scanner regex neutered - the home plant is pushed past the scanner, so the harness still reads 1/1", 0,
  () => edit(L, "const SOCIAL_HOST = /(?:instagram|tiktok|whatsapp)\\.com/;", "const SOCIAL_HOST = /(?!)/;"), L, ["--prove-red-home"]);

console.log("\n================ social-panel: the harness must FAIL when it should");
scenario("STALE: MIN_DWELL_MS is no longer 45_000, so the dwell plant's anchor is gone", 2,
  () => edit(PANEL, "const MIN_DWELL_MS = 45_000;", "const MIN_DWELL_MS = 46_000;"), P, ["--prove-red"]);
scenario("STALE (ambiguous): the eligible anchor now matches twice", 2,
  () => append(PANEL, "\n// const eligible = open && !promoSuppressed\n"), P, ["--prove-red"]);
scenario("MISSED commit-gate: 2.1 back to the old import-line hole (/isCommitSurface/)", 2,
  () => edit(P, "/isCommitSurface\\(path\\)/.test(c)", "/isCommitSurface/.test(c)"), P, ["--prove-red"]);
scenario("MISSED shell-inverted: 3.1 back to the old hole (/promoSuppressed\\s*=/)", 2,
  () => edit(P, "/until\\(rg\\?\\.selfExclusionUntil\\) > now/.test(s)\n     && /until\\(rg\\?\\.coolingOffUntil\\) > now/.test(s),", "/promoSuppressed\\s*=/.test(s),"), P, ["--prove-red"]);
scenario("KNOWN LIMIT (left alone): 6.1's elision regex neutered - the elision plant is pushed past the regex, so the harness still reads 8/8", 0,
  () => edit(P, "const ARBITRARY_WITH_ELISION = /\\b[a-z][a-z0-9-]*-\\[[^\\]\\s]*\\.\\.\\.[^\\]\\s]*\\]/g;", "const ARBITRARY_WITH_ELISION = /(?!)/g;"), P, ["--prove-red"]);
scenario("BASELINE RED + STRAY: the panel gained a scroll lock (5.2 fails with and without the plants)", 1,
  () => breakAria(), P, ["--prove-red"]);
scenario("TYPO: --prove-red-all", 2, () => {}, P, ["--prove-red-all"],
  (out) => out.split(/\r?\n/).filter((l) => l.trim()).slice(-2).map((l) => "     " + l.slice(0, 250)));

console.log("\n================ THE OLD HARNESSES (HEAD), same scenarios: what the polarity hid");
// old social-links: a toothless guard (plant NOT caught) used to exit 0 - a PASS in red:all
scenario("OLD social-links, healthy guard: exits 1, which red:all reads as FAIL", 1, () => {}, "scripts/social-links.old.mts", ["--prove-red-home"], oldTail);
scenario("OLD social-links, toothless guard (plant NOT caught): exits 0, which red:all reads as PASS", 0,
  () => edit("scripts/social-links.old.mts", "strays.length === 0,", "true,"), "scripts/social-links.old.mts", ["--prove-red-home"], oldTail);
scenario("OLD social-panel, toothless 2.1 plus an unrelated 5.1 failure: the count (>= 8) is still met, exit 1", 1, () => {
  edit("scripts/social-panel.old.mts", "/isCommitSurface\\(path\\)/.test(c)", "/isCommitSurface/.test(c)");
  breakAria();
}, "scripts/social-panel.old.mts", ["--prove-red"], oldTail);
scenario("NEW social-panel, the very same doctoring: MISSED + STRAY, exit 2", 2, () => {
  edit(P, "/isCommitSurface\\(path\\)/.test(c)", "/isCommitSurface/.test(c)");
  breakAria();
}, P, ["--prove-red"]);

restore();
console.log(`\n${broken === 0 ? "ALL SCENARIOS BEHAVED AS EXPECTED" : `${broken} SCENARIO(S) UNEXPECTED`}`);
