/**
 * U52a · WHAT A LIVE TOOL DOES BEFORE ANYTHING IS LOADED (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.18, "AS BUILT - the run
 * sheet"). Both tools (`marketing-preflight.mjs`, `marketing-campaign-evidence.mjs`) call `boot()` FIRST and load the shared core
 * (and with it the repo's `.ts` modules) only after it, by a DYNAMIC import — a static import is evaluated before the file's first
 * line, which is the bug the marketing referee-keys door had on production (70e9ba96) and `ops:provision-staff` never had.
 *
 *   · THE PUBLIC PROXY. `railway run` hands this PC the app's PRIVATE database host (`postgres.railway.internal`), which resolves
 *     only inside Railway. `DATABASE_URL` is rewritten to the public proxy FIRST, exactly as `scripts/ops-provision-staff.mts`
 *     does, so whatever builds a database client afterwards builds it on a host this PC can reach. The URL is never printed.
 *   · THE CHECKOUT. The repo's `.ts` modules reach each other through `@/…` aliases that tsx resolves from the tsconfig.json of the
 *     WORKING directory. Run from anywhere else they fail with a stack from inside the module graph; here it is ONE friendly line
 *     and exit 2, said before a single import is attempted.
 *
 * ⛔ THIS FILE IMPORTS NOTHING BUT NODE'S OWN MODULES: it must load in any directory, with no tsconfig and no database.
 * ⛔ NOTHING HERE PRINTS A DATABASE ADDRESS OR A NUMBER.
 */
import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The Postgres service's PUBLIC proxy — the same host and port `ops-provision-staff.mts` and the referee-keys door use. */
export const PUBLIC_PROXY_HOST = "turntable.proxy.rlwy.net:40357";

/** The private Railway host rewritten to the public proxy; any other address comes back untouched. */
export function publicProxyUrl(url) {
  return typeof url === "string" ? url.replace(/@postgres[.]railway[.]internal(:[0-9]+)?/, `@${PUBLIC_PROXY_HOST}`) : url;
}

/**
 * Is this the checkout the tool belongs to? `toolUrl` is the tool's own `import.meta.url` (scripts/live/<tool>.mjs, two levels
 * under the repository root). A sentence when it is not, `null` when it is. Never the typed arguments, never an address.
 */
export function checkoutProblem(cwd, toolUrl, exists = existsSync) {
  const toolPath = fileURLToPath(toolUrl);
  const root = resolve(toolPath, "..", "..", "..");
  const rel = relative(resolve(cwd), toolPath);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    return `run it from the checkout it belongs to - the working directory is not inside it. cd to ${root} and run it again (npm run -s does that for you)`;
  }
  if (!exists(join(resolve(cwd), "tsconfig.json"))) {
    return `this working directory has no tsconfig.json, and the repo's imports resolve through it. cd to the repository root (${root}) and run it again`;
  }
  return null;
}

/**
 * Rewrite the database address to the public proxy and check the checkout — in that order, before anything is loaded. Returns
 * `{ ok: true }`, or `{ ok: false, problem }` for the caller to say in one line and leave with exit 2.
 */
export function boot(toolUrl, env = process.env, cwd = process.cwd(), exists = existsSync) {
  if (env.DATABASE_URL) env.DATABASE_URL = publicProxyUrl(env.DATABASE_URL);
  const problem = checkoutProblem(cwd, toolUrl, exists);
  return problem === null ? { ok: true } : { ok: false, problem };
}
