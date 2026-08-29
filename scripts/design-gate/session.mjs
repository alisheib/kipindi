/**
 * ONE SIGN-IN, SHARED ACROSS EVERY DESIGN-GATE INSTRUMENT.
 *
 * 🔴 WHY. `loginOnce()` returns a `storageState` that lives in MEMORY, and every instrument
 * here is a separate Node process with its own browser — so a session that runs the measure
 * drive, the shell seal and a probe signs in three times. On 2026-08-29 one session's checks
 * produced about ten admin sign-ins, and Ali got ten "new login" emails asking whether that
 * was normal. It was normal. It was also unnecessary.
 *
 * ⛔ AND THE NOISE IS THE SMALLER HALF. 50pick keeps ONE live session per account, so each new
 * login REVOKES the previous one. That is the same revocation this programme has been fighting
 * all along: "the admin session dies mid-drive, non-deterministically", two wrong diagnoses,
 * a 44-route drive that recorded the sign-in page as data and lost 30 of 44 records. Every
 * extra login is another chance for a drive still running to lose its session — so a second
 * instrument started while the first is mid-flight does not just send an email, it can corrupt
 * the run. Reusing one session removes the cause instead of detecting the symptom.
 *
 * ⚠️ THE CACHE IS A REAL CREDENTIAL. It holds a live session cookie, so it is written inside
 * `.qa-design-gate/` — gitignored by the `.qa-design-` prefix rule, and deleted with the
 * evidence when the programme closes. ⛔ Never move it anywhere tracked.
 *
 * ⭐ It is VALIDATED, not trusted: a cached state is proved against a gated route before it is
 * handed back, because a stale cookie that renders the sign-in page at HTTP 200 is exactly the
 * failure mode this whole rig exists to catch. If it fails, it signs in once and rewrites.
 *
 * Usage:  import { loginShared } from "./session.mjs";
 *         const state = await loginShared(browser, "admin");
 *         FORCE_LOGIN=1  bypasses the cache and takes a fresh session.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loginOnce, BASE } from "../live/harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, "..", "..", ".qa-design-gate");
/** A session older than this is re-taken rather than validated — cheap insurance against a
 *  cookie that is technically alive but close to whatever the server's own expiry is. */
const MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS || 25 * 60 * 1000);
/** The route a cached session is PROVED against, per persona. */
const PROBE = { admin: "/admin/system" };

const file = (who) => path.join(DIR, `.session-${who}.json`);

/** Is this state still a real session? ⛔ HTTP 200 proves nothing — a revoked request lands
 *  on /auth/ and renders perfectly. Only the final URL tells the truth. */
async function stillValid(browser, state, who) {
  const route = PROBE[who] || "/admin/system";
  const ctx = await browser.newContext({ storageState: state });
  try {
    const page = await ctx.newPage();
    const resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const ok = Boolean(resp) && !/\/auth\//.test(page.url());
    return ok;
  } catch {
    return false;
  } finally {
    await ctx.close();
  }
}

export async function loginShared(browser, who = "admin") {
  mkdirSync(DIR, { recursive: true });
  const f = file(who);
  if (!process.env.FORCE_LOGIN && existsSync(f)) {
    const ageMs = Date.now() - statSync(f).mtimeMs;
    if (ageMs < MAX_AGE_MS) {
      try {
        const state = JSON.parse(readFileSync(f, "utf8"));
        if (await stillValid(browser, state, who)) {
          console.log(`  ↻ reusing the cached ${who} session (${Math.round(ageMs / 1000)}s old) — no new sign-in, no email`);
          return state;
        }
        console.log(`  ⚠️  cached ${who} session was REVOKED — signing in again`);
      } catch {
        console.log(`  ⚠️  cached ${who} session unreadable — signing in again`);
      }
    } else {
      console.log(`  ⚠️  cached ${who} session is ${Math.round(ageMs / 60000)}min old — taking a fresh one`);
    }
  }
  const state = await loginOnce(browser, who);
  writeFileSync(f, JSON.stringify(state));
  console.log(`  ✚ signed in as ${who} once; cached for the next instrument`);
  return state;
}
