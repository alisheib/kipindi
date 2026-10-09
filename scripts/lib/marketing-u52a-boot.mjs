/**
 * U52a · WHAT A LIVE TOOL DOES BEFORE ANYTHING IS LOADED (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.18, "AS BUILT - the run
 * sheet"). Both tools (`marketing-preflight.mjs`, `marketing-campaign-evidence.mjs`) call `boot()` FIRST and load the shared core
 * (and with it the repo's `.ts` modules) only after it, by a DYNAMIC import — a static import is evaluated before the file's first
 * line, which is the bug the marketing referee-keys door had on production (70e9ba96) and `ops:provision-staff` never had.
 *
 *   · THE PUBLIC PROXY. `railway run` hands this PC the app's PRIVATE database host (`postgres.railway.internal`), which resolves
 *     only inside Railway. `DATABASE_URL` is rewritten to the public proxy FIRST, exactly as `scripts/ops-provision-staff.mts`
 *     does, so whatever builds a database client afterwards builds it on a host this PC can reach. The URL is never printed.
 *     The host is matched in any letter case and with or without a trailing dot (`POSTGRES.Railway.Internal.` is the same host).
 *   · THE CHECKOUT. The repo's `.ts` modules reach each other through `@/…` aliases that tsx resolves from the tsconfig.json of the
 *     WORKING directory. Run from anywhere else they fail with a stack from inside the module graph; here it is ONE friendly line
 *     and exit 2, said before a single import is attempted. A junction or a symlink to the checkout is "somewhere else": the
 *     tool's own path is the real one, so the working directory must be the real checkout too.
 *   · WHETHER THIS FILE IS THE PROGRAM. `isMain` compares REAL paths (`realpathSync.native`): Node's main URL is the real path of the
 *     script, while `process.argv[1]` keeps the path as it was typed, so through a junction or a symlink the two differ and a plain
 *     comparison would make the tool a silent no-op - exit 0 and not one line printed, which on a tool whose exit 0 means "GO" is
 *     the worst thing it could do.
 *
 * ⛔ THIS FILE IMPORTS NOTHING BUT NODE'S OWN MODULES: it must load in any directory, with no tsconfig and no database.
 * ⛔ NOTHING HERE PRINTS A DATABASE ADDRESS OR A NUMBER.
 */
import { existsSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The Postgres service's PUBLIC proxy — the same host and port `ops-provision-staff.mts` and the referee-keys door use. */
export const PUBLIC_PROXY_HOSTNAME = "turntable.proxy.rlwy.net";
export const PUBLIC_PROXY_PORT = "40357";
export const PUBLIC_PROXY_HOST = `${PUBLIC_PROXY_HOSTNAME}:${PUBLIC_PROXY_PORT}`;

/**
 * The private Railway host rewritten to the public proxy; any other address comes back untouched. The host is the Postgres service's
 * (`postgres.railway.internal`), matched in any letter case, with or without a trailing dot and with or without a port, and only as
 * the WHOLE host (a longer name that merely starts with it is another host).
 */
export function publicProxyUrl(url) {
  return typeof url === "string" ? url.replace(/@postgres[.]railway[.]internal[.]?(?::[0-9]+)?(?=[/?#]|$)/i, `@${PUBLIC_PROXY_HOST}`) : url;
}

/** The host of a connection string, lower-cased, without brackets or a trailing dot - or null when the text is not a URL. Never printed. */
export function hostOf(url) {
  try {
    return new URL(String(url)).hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/[.]$/, "");
  } catch {
    return null;
  }
}

/**
 * Is this connection string on Railway's PRIVATE network (any `*.railway.internal` host, in any letter case, with or without a trailing
 * dot)? Such a host does not resolve off Railway, so a tool that still holds one after `boot` refuses with a word rather than hang.
 */
export function isPrivateHost(url) {
  const host = hostOf(url);
  if (host !== null) return host === "railway.internal" || host.endsWith(".railway.internal");
  return /[.]railway[.]internal[.]?(?::|[/]|$)/i.test(String(url));
}

/** ONE word for the database a run read, never its address: `proxy` (the production proxy), `loopback` (a scratch cluster) or `other`. */
export function databaseClass(url) {
  const host = hostOf(url);
  if (host === PUBLIC_PROXY_HOSTNAME) return "proxy";
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "loopback";
  return "other";
}

/**
 * Is `toolUrl` (the tool's own `import.meta.url`) the program being run? Compared by REAL path, so a junction or a symlink on the way
 * to the script does not turn the tool into a silent no-op (see the header). False when `argv1` is missing or either path cannot be read.
 */
export function isMain(toolUrl, argv1 = process.argv[1], real = realpathSync.native) {
  if (typeof argv1 !== "string" || argv1 === "") return false;
  try {
    return real(fileURLToPath(toolUrl)) === real(resolve(argv1));
  } catch {
    return false;
  }
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
    return `run it from the checkout it belongs to - the working directory is not inside it (a junction or a symlink to the checkout does not count). cd to ${root} and run the same command again`;
  }
  if (!exists(join(resolve(cwd), "tsconfig.json"))) {
    return `this working directory has no tsconfig.json, and the repo's imports resolve through it. cd to the repository root (${root}) and run the same command again`;
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
