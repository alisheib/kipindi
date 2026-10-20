/**
 * test:agent-rules — ONE SET OF WORKING RULES FOR EVERY AGENT, AND IT STAYS ONE.
 *
 * Why this guard exists (2026-10-16, Ali: "clean all … mixed ai tools documentation until we have 1 final rule").
 * Thirty-odd files addressed an agent — CLAUDE.md (1,086 lines, half of it a status log), three Claude skills, a
 * Codex takeover prompt, a Codex handoff, paste-in prompts in operational docs — and they disagreed with each other
 * on things that decide outcomes: who pushes `main` (three answers), how a migration reaches production (two), whether
 * `git add -A` is allowed, the commission formula (a retired one, in the public README), whether the repository is
 * private (it is public), and a light theme that does not exist. A session obeys whichever file it read first.
 *
 * The consolidation: AGENTS.md is the one rules file (Codex reads it natively); CLAUDE.md only imports it; each skill
 * is a pointer; the old prompts and handoffs are records with a banner. This guard holds that shape and keeps the
 * replaced contradictions from coming back. Every check is a pure function of text, so each has an in-process plant
 * (§6) that proves it can fail.
 *
 *   npm run test:agent-rules
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

let failed = 0;
const ok = (m: string) => console.log(`  ok   ${m}`);
const bad = (m: string) => { console.log(`  FAIL ${m}`); failed++; };
const check = (cond: boolean, m: string, detail = "") => (cond ? ok(m) : bad(detail ? `${m} — ${detail}` : m));
const read = (p: string): string | null => (existsSync(p) ? readFileSync(p, "utf8") : null);
const must = (p: string): string => { const t = read(p); if (t === null) { bad(`${p} is missing`); return ""; } return t; };

/* ─── The checks, as pure functions of text ─────────────────────────────────────────────────────────── */

/** The rules AGENTS.md must state — each one replaced a contradiction between two files. */
const REQUIRED_RULES: Array<[string, RegExp]> = [
  ["one release owner pushes main", /One release owner at a time pushes `main`/],
  ["stage by name, never git add -A", /never `git add -A`/],
  ["schema only through the deploy's migrate", /only through the deploy's own `prisma migrate deploy`/],
  ["the repository is public", /The repository is public/],
  ["never waive a failed check", /Never waive a failed check/],
  ["never fabricate", /Never fabricate/],
  ["never use Ali's personal credentials", /Never use Ali's personal credentials/],
  ["responsiveness is a rule", /Responsiveness is a rule/],
  ["assert the value, not the symbol", /Assert the value, not the symbol/],
  ["the current state lives in NEXT-PLAN, not here", /current state[\s\S]{0,120}docs\/NEXT-PLAN\.md/],
];
const missingRules = (agents: string) => REQUIRED_RULES.filter(([, re]) => !re.test(agents)).map(([name]) => name);

/** Next.js 16.4's `next dev` writes its own block into AGENTS.md unless `agentRules: false` — one author, not two. */
const nextBlockIn = (agents: string) => /BEGIN:nextjs-agent-rules|NEXT-AGENTS-MD-START/.test(agents);
const nextAgentRulesOff = (config: string) => /^\s*agentRules:\s*false\s*,/m.test(config);

/** CLAUDE.md is the import line and nothing else (HTML comments and blank lines aside). */
const claudeIsImport = (claude: string) =>
  claude.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join("\n") === "@AGENTS.md";

/** A skill is a pointer: front matter, a short body that names AGENTS.md, no rule of its own. */
const SKILL_MAX_LINES = 20;
const skillProblems = (text: string) => {
  const p: string[] = [];
  if (!/^---\r?\n[\s\S]*?\bname:\s*\S+[\s\S]*?\bdescription:\s*\S[\s\S]*?\r?\n---/.test(text)) p.push("no front matter");
  if (text.split(/\r?\n/).length > SKILL_MAX_LINES) p.push(`more than ${SKILL_MAX_LINES} lines`);
  if (!/AGENTS\.md/.test(text)) p.push("does not point to AGENTS.md");
  if (/\d+(\.\d+)?\s*%|⅓|feeCeilingRate|git push origin|apply them from your machine/.test(text)) p.push("restates a rule");
  return p;
};

/** The replaced contradictions. */
const addAllInstruction = (text: string) => /git add (-A|\.)\s*&&/.test(text);
const restatesARate = (text: string) => /\d+(\.\d+)?\s*%|⅓|one[- ]third of the smaller/i.test(text);
const callsRepoPrivate = (text: string) => /\(private\)|private repo|repository is private/i.test(text);
const asksForLightTheme = (text: string) => /dark (and|\/|×|x) light|light mode screenshots?/i.test(text);
const hasPastePrompt = (text: string) => /Paste the prompt below into a fresh Claude Code session/i.test(text);

/** The access guide may describe old login failures, but cannot authorize an agent to reuse Ali's login. */
const safeGitHubAccess = (text: string) => {
  const github = text.split("### 2.1 GitHub")[1]?.split("### 2.2 Cloudflare")[0] ?? "";
  return /50pick-owned GitHub App installation or dedicated bot\s+account/.test(github) &&
    /not a token from Ali's personal account/.test(github) &&
    /that the Git command will use it rather than the saved personal Windows login/.test(github) &&
    /If the only available credential is personal, Ali performs the push himself/.test(github) &&
    !/Create a token at \*\*https:\/\/github\.com\/settings\/tokens\/new/.test(github);
};

/** A record says so in its first lines, and names the file that replaced it. */
const isBannerRecord = (text: string) => {
  const head = text.split(/\r?\n/).slice(0, 15).join("\n");
  return /\bRECORD\b/.test(head) && /AGENTS\.md/.test(head);
};

/* ─── 1 · AGENTS.md is the one rules file ───────────────────────────────────────────────────────────── */
console.log("\n§1 · AGENTS.md is the one rules file");
const agents = must("AGENTS.md");
const missing = missingRules(agents);
check(missing.length === 0, "1.1 · AGENTS.md states every rule that replaced a contradiction", `missing: ${missing.join(", ")}`);
check(!nextBlockIn(agents), "1.2 · AGENTS.md carries no Next.js managed block — one author");
check(nextAgentRulesOff(must("next.config.ts")), "1.3 · next.config.ts sets `agentRules: false`, so `next dev` never writes into AGENTS.md");
const rivals = ["GEMINI.md", ".cursorrules", ".windsurfrules", ".github/copilot-instructions.md", "CODEX.md"].filter((f) => existsSync(f));
check(rivals.length === 0, "1.4 · no second rules file for another tool", rivals.join(", "));

/* ─── 2 · CLAUDE.md only imports it ─────────────────────────────────────────────────────────────────── */
console.log("\n§2 · CLAUDE.md only imports AGENTS.md");
check(claudeIsImport(must("CLAUDE.md")), "2.1 · CLAUDE.md is `@AGENTS.md` and nothing else");

/* ─── 3 · the skills are pointers ───────────────────────────────────────────────────────────────────── */
console.log("\n§3 · every Claude skill is a pointer");
const SKILLS = ".claude/skills";
for (const s of existsSync(SKILLS) ? readdirSync(SKILLS) : []) {
  const files = readdirSync(join(SKILLS, s));
  const probs = skillProblems(must(join(SKILLS, s, "SKILL.md")));
  check(probs.length === 0 && files.length === 1, `3 · skill ${s} is a pointer (one file, names AGENTS.md, states no rule)`, [...probs, ...(files.length === 1 ? [] : [`files: ${files.join(", ")}`])].join("; "));
}

/* ─── 4 · the contradictions it replaced do not come back ───────────────────────────────────────────── */
console.log("\n§4 · the replaced contradictions stay gone");
const SURFACES = ["AGENTS.md", "README.md", "CLAUDE.md", "docs/SETUP.md", "docs/README.md", "docs/RAILWAY-LIVE.md", "docs/LIVE-QA-CAMPAIGN.md", "docs/MODULE-CERTIFICATION-PROGRAM.md"];
for (const f of SURFACES) check(!addAllInstruction(must(f)), `4.1 · ${f} never tells a session to \`git add -A\` or \`git add .\``);
for (const f of ["AGENTS.md", "README.md"]) check(!restatesARate(must(f)), `4.2 · ${f} states no rate — rates live in docs/RULES.md`);
for (const f of ["AGENTS.md", "README.md", "docs/SETUP.md", "docs/RAILWAY-LIVE.md"]) check(!callsRepoPrivate(must(f)), `4.3 · ${f} does not call the (public) repository private`);
check(!asksForLightTheme(must("docs/MODULE-CERTIFICATION-PROGRAM.md")), "4.4 · no certification step asks for light-theme screenshots (there is one theme)");
check(!hasPastePrompt(must("docs/RAILWAY-LIVE.md")), "4.5 · docs/RAILWAY-LIVE.md carries no paste-in session prompt");
const agentAccess = must("docs/AGENT-ACCESS.md");
check(safeGitHubAccess(agentAccess), "4.6 · access guide requires a project or bot credential for GitHub writes");

/* ─── 5 · the old prompts and handoffs say they are records ─────────────────────────────────────────── */
console.log("\n§5 · old prompts and handoffs are banner records");
const RECORDS = ["docs/qa/claude-vodacom-continuation-20261014.md", "plans/house-bots/HANDOFF-CODEX-2026-10-15.md", "docs/PARALLEL-SESSION-COORDINATION.md"];
for (const f of RECORDS) check(isBannerRecord(must(f)), `5 · ${f} opens with a RECORD banner that names AGENTS.md`);

/* ─── 6 · plants: every check can fail ──────────────────────────────────────────────────────────────── */
console.log("\n§6 · plants — each check reports its defect");
check(missingRules(agents.replace(/One release owner at a time pushes `main`/, "Push main when ready")).includes("one release owner pushes main"), "6.1 PLANT · AGENTS.md without the release-owner rule is reported");
check(nextBlockIn("<!-- BEGIN:nextjs-agent-rules -->\nx\n<!-- END:nextjs-agent-rules -->"), "6.2 PLANT · a Next.js managed block is reported");
check(!nextAgentRulesOff("const config = { reactStrictMode: true };"), "6.3 PLANT · a config without `agentRules: false` is reported");
check(!claudeIsImport("@AGENTS.md\n\n## Deploy\nPush to main."), "6.4 PLANT · a CLAUDE.md that adds a rule is reported");
check(skillProblems("---\nname: x\ndescription: y\n---\nSee AGENTS.md. The fee is 10% of the pool.").includes("restates a rule"), "6.5 PLANT · a skill that restates a rate is reported");
check(skillProblems("---\nname: x\ndescription: y\n---\n" + "line\n".repeat(30) + "AGENTS.md").some((p) => p.startsWith("more than")), "6.6 PLANT · a long skill is reported");
check(addAllInstruction("git add -A && git commit -m wip"), "6.7 PLANT · a `git add -A &&` instruction is reported");
check(restatesARate("Our commission is min(10% of the pool, ⅓ of the smaller side)"), "6.8 PLANT · the retired fee formula is reported");
check(callsRepoPrivate("GitHub: https://github.com/alisheib/kipindi.git (private)"), "6.9 PLANT · calling the repository private is reported");
check(asksForLightTheme("screenshots × dark and light"), "6.10 PLANT · a light-theme screenshot step is reported");
check(hasPastePrompt("Paste the prompt below into a fresh Claude Code session, with this file present"), "6.11 PLANT · a paste-in session prompt is reported");
check(!isBannerRecord("# Codex takeover prompt\n\nYou are Codex."), "6.12 PLANT · a handoff without its RECORD banner is reported");
check(!safeGitHubAccess(agentAccess.replace("If the only available credential is personal, Ali performs the push himself", "If the only available credential is personal, the agent performs the push")), "6.13 PLANT · an access guide telling the agent to use a personal login is reported");

console.log(failed === 0 ? "\nALL PASS — test:agent-rules" : `\n${failed} FAILED — test:agent-rules`);
process.exit(failed === 0 ? 0 : 1);
