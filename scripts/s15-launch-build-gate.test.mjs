/** Source-only controls for the ACTUAL S15 build/start paths. No browser or DB. */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { s15LaunchBuildDecision } from "./lib/s15-launch-build-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const pkg = JSON.parse(read("package.json"));
const config = read("next.config.ts");
const source = read("src/lib/feature-state.ts");
const previewSource = source.replace(
  'const SIMPLE_JOURNEY_SHIPPED: RolloutState = "ACTIVE";',
  'const SIMPLE_JOURNEY_SHIPPED: RolloutState = "STAFF_PREVIEW";',
);
const minimalEnv = {
  PATH: process.env.PATH,
  Path: process.env.Path,
  SystemRoot: process.env.SystemRoot,
  windir: process.env.windir,
};
const run = (script, extra = {}) => spawnSync(process.execPath, [resolve(root, script)], {
  cwd: root,
  env: { ...minimalEnv, ...extra },
  encoding: "utf8",
});
const lines = [];
const ok = (name, good) => lines.push({ name, good: Boolean(good) });

const wired = (scripts, nextConfig) => [
  scripts.prebuild === "node scripts/s15-launch-build-gate.mjs",
  scripts.start?.startsWith("node scripts/s15-launch-build-gate.mjs && "),
  /execFileSync\(process\.execPath, \[resolve\(process\.cwd\(\), "scripts\/s15-launch-build-gate\.mjs"\)\]/.test(nextConfig),
];
const wiring = wired(pkg.scripts, config);
ok("npm build executes the gate before Next", wiring[0]);
ok("npm start executes the gate before migration and serving", wiring[1]);
ok("direct next build/start executes the gate from Next config", wiring[2]);
ok("ordinary predeploy still runs the publication gate", pkg.scripts.predeploy?.startsWith("npm run gate:s15-release && "));
ok("missing npm prebuild is a caught red plant", wired({ ...pkg.scripts, prebuild: undefined }, config)[0] === false);
ok("missing npm start guard is a caught red plant", wired({ ...pkg.scripts, start: "prisma migrate deploy && next start" }, config)[1] === false);
ok("missing direct Next guard is a caught red plant", wired(pkg.scripts, config.replace("execFileSync(process.execPath", "removed(process.execPath"))[2] === false);

ok("preview source still permits its normal build", s15LaunchBuildDecision(previewSource, {}).kind === "preview");
ok("an ACTIVE environment override on preview source requires release proof", s15LaunchBuildDecision(previewSource, { FEATURE_SIMPLEJOURNEY: "ACTIVE" }).kind === "release");
ok("ACTIVE source requires the publication preflight", s15LaunchBuildDecision(source, {}).kind === "release");
ok("an unknown shipped ceiling fails closed", s15LaunchBuildDecision(source.replace(
  'const SIMPLE_JOURNEY_SHIPPED: RolloutState = "ACTIVE";',
  'const SIMPLE_JOURNEY_SHIPPED: RolloutState = "UNKNOWN";',
), {}).kind === "refuse");
ok("an explicit in-memory local review may build", s15LaunchBuildDecision(source, { S15_PRELAUNCH_LOCAL: "1" }).kind === "candidate");
ok("a pull-request CI review may build", s15LaunchBuildDecision(source, { S15_PRELAUNCH_LOCAL: "1", CI: "true", GITHUB_EVENT_NAME: "pull_request", GITHUB_REF: "refs/pull/3/merge" }).kind === "candidate");
for (const [name, env] of [
  ["Railway production", { RAILWAY_ENVIRONMENT_NAME: "production" }],
  ["Railway build", { RAILWAY_PROJECT_ID: "project" }],
  ["production DB", { DATABASE_URL: "postgresql://example" }],
  ["public production DB", { PROD_DATABASE_PUBLIC_URL: "postgresql://example" }],
  ["GitHub main push", { CI: "true", GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/main" }],
  ["non-PR CI", { CI: "true" }],
]) {
  ok(`${name} refuses the review bypass`, s15LaunchBuildDecision(source, { S15_PRELAUNCH_LOCAL: "1", ...env }).kind === "refuse");
}

const preflight = run("scripts/s15-release-preflight.mjs");
const guarded = run("scripts/s15-launch-build-gate.mjs");
const publication = JSON.parse(read("docs/qa/s15-publication.json"));
ok("the actual no-bypass gate follows the publication preflight", guarded.status === preflight.status
  && (guarded.stdout + guarded.stderr).includes("S15 release gate"));
if (publication.publicationDate === null) {
  ok("the parked ACTIVE tree cannot build or boot", preflight.status !== 0 && guarded.status !== 0);
}
const local = run("scripts/s15-launch-build-gate.mjs", { S15_PRELAUNCH_LOCAL: "1" });
const railway = run("scripts/s15-launch-build-gate.mjs", { S15_PRELAUNCH_LOCAL: "1", RAILWAY_ENVIRONMENT_NAME: "production" });
ok("the actual isolated local review gate opens", local.status === 0 && local.stdout.includes("isolated prelaunch candidate"));
ok("the actual Railway bypass is refused", railway.status !== 0 && railway.stderr.includes("REFUSED"));

for (const row of lines) console.log(`${row.good ? "PASS" : "FAIL"} ${row.name}`);
console.log(`test:s15-launch-guard ${lines.filter((row) => row.good).length}/${lines.length}`);
process.exit(lines.every((row) => row.good) ? 0 : 1);
