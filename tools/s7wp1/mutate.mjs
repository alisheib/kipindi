// Throwaway mutation run (outside the repo): copies qa-classic-shell-parity.mjs here with ONE deliberate defect at a
// time, runs its stubbed --prove-red, and checks that the named check FAILS (and that the clean copy passes it).
// The copy reads the real worktree through KP_TREE; the browser is stubbed (preload.mjs), so only in-memory checks run.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = "F:/kipindi-s7wp1/scripts/qa-classic-shell-parity.mjs";
const original = readFileSync(SRC, "utf8");
const PRELOAD = pathToFileURL(join(HERE, "preload.mjs")).href;

const MUTANTS = [
  { check: "P.8h", why: "the head reader reads og:* only from `property` written before `content`",
    from: 'const key = attrs.property ?? attrs.name ?? "";', to: 'const key = /^\\s*property=/.test(m[2]) ? attrs.property : "";' },
  { check: "P.8h", why: "the head reader drops the canonical link",
    from: 'if (/(?:^|\\s)canonical(?:\\s|$)/i.test(attrs.rel ?? "")) lines.push', to: 'if (false) lines.push' },
  { check: "P.8n", why: "time-left's Swahili half is lost",
    from: '.replace(/\\b(?:siku|masaa|dakika) \\d+ (?:zimebaki|yamebaki)\\b/g, "~ zimebaki")', to: "" },
  { check: "P.8n", why: "a normaliser ignores its switch (avatar-ids always applied)",
    from: 'const BOOK_TEXT = BOOK_NORMALISERS.filter((n) => n.kind === "text" && BOOK.normalise.includes(n.id));', to: 'const BOOK_TEXT = BOOK_NORMALISERS.filter((n) => n.kind === "text" && (BOOK.normalise.includes(n.id) || n.id === "avatar-ids"));' },
  { check: "P.8n", why: "market-ids eats a short id it must keep",
    from: 'apply: (s) => s.replace(/\\b(mkt|udr)_[A-Za-z0-9]{6,}/g, "$1_~"),', to: 'apply: (s) => s.replace(/\\b(mkt|udr)_[A-Za-z0-9]{2,}/g, "$1_~"),' },
  { check: "P.8s", why: "the verdict forgets byStatus.LOSS",
    from: 'for (const s of ["VOID", "WIN", "LOSS"])', to: 'for (const s of ["VOID", "WIN"])' },
  { check: "P.8s", why: "a refused settlement is only recorded",
    from: "if (/^updown\\b/.test(s)) recorded.push(s);", to: "if (/^(?:updown|settle)\\b/.test(s)) recorded.push(s);" },
  { check: "P.8p", why: "the classifier reads a NO verdict as YES",
    from: ': pct.includes("mcardp-pct--no") ? "resolved-no" : "resolved-yes";', to: ': "resolved-yes";' },
  { check: "P.8p", why: "the probe stops asking /watchlist for a selection-closed card",
    from: 'if (!has(probe.watchlist, "closed")) watchlist.push("no selection-closed card on /watchlist");', to: "" },
  { check: "P.8t", why: "the trace forgets kp-howto",
    from: 'const JOURNEY_CLASS_PARTS = ["journey", "kp-jcard", "kp-jhome", "kp-jhowto", "kp-howto"];', to: 'const JOURNEY_CLASS_PARTS = ["journey", "kp-jcard", "kp-jhome", "kp-jhowto"];' },
  { check: "P.check B.5", why: "B.5 reads <main> where it means the strip",
    from: "fails: bad((r, c) => BOOK.lobby.includes(r) && c.regions?.ticker?.count !== 1) },", to: "fails: bad((r, c) => BOOK.lobby.includes(r) && c.regions?.main?.count !== 1) }," },
  { check: "P.check B.7", why: "B.7 forgets one-sided",
    from: "fails: CARD_STATES.filter((s) => !((tally.get(s) ?? 0) > 0))", to: 'fails: CARD_STATES.filter((s) => s !== "one-sided" && !((tally.get(s) ?? 0) > 0))' },
  { check: "P.check B.6", why: "B.6 forgets the bytes",
    from: "fails: bad((r, c) => (c.journey ?? []).length > 0 || !c.raw || !c.raw.shell || c.raw.trace.length > 0) },", to: "fails: bad((r, c) => (c.journey ?? []).length > 0) }," },
];

const run = (file) => {
  const r = spawnSync(process.execPath, ["--import", PRELOAD, file, "--prove-red"], {
    encoding: "utf8", env: { ...process.env, KP_TREE: "F:/kipindi-s7wp1" }, maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};
const lineOf = (out, check) => out.split(/\r?\n/).filter((l) => l.includes(` ${check} `) || l.includes(` ${check}—`) || l.includes(` ${check} —`));

let bad = 0;
const clean = run(SRC);
for (const m of MUTANTS) {
  if (!original.includes(m.from)) { console.log(`ANCHOR MISSING  ${m.check} — ${m.why}`); bad++; continue; }
  const file = join(HERE, "mutant.mjs");
  writeFileSync(file, original.split(m.from).join(m.to), "utf8");
  const res = run(file);
  const fails = lineOf(res.out, m.check).filter((l) => l.includes("FAIL"));
  const cleanPass = lineOf(clean.out, m.check).length > 0 && lineOf(clean.out, m.check).every((l) => l.includes("PASS"));
  const ok = fails.length > 0 && cleanPass;
  if (!ok) bad++;
  console.log(`${ok ? "CAUGHT " : "MISSED "} ${m.check} — ${m.why}${ok ? "" : `  (clean passes: ${cleanPass}; mutant lines: ${lineOf(res.out, m.check).map((l) => l.trim().slice(0, 90)).join(" | ") || "none"}; exit ${res.code})`}`);
}
console.log(`${MUTANTS.length - bad}/${MUTANTS.length} mutants caught`);
process.exit(bad ? 1 : 0);
