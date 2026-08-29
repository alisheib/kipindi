/**
 * `npm run qa:dg-redo <surface>` — find and DELETE poisoned records, then print the routes to
 * re-drive. Run it after every drive, before believing the data.
 *
 * 🔴 IT USED TO MISS THE OFFLINE PAGE, AND ON 2026-08-29 IT MISSED EIGHT.
 * A drive of 44 admin routes returned HTTP 200 everywhere and `0 unrecoverable`; eight
 * consecutive routes had actually rendered the app's OFFLINE page after the network dropped
 * (`ERR_INTERNET_DISCONNECTED`, h1 "You're offline", 16-20 console errors each). This file
 * reported **"OK 48"** over them, because its only poison test was `/auth/(admin|login)`.
 * ⛔ It is the sign-in-page failure exactly, one page over: an offline page is HTTP 200, it
 * renders, it has a `<main>` and an `<h1>`, and it passes every structural check there is.
 * ⭐ A drive can be wrong in more than one way, and a detector that knows ONE of them reports
 * a clean run for the others. The tests below are now: the sign-in page · the offline page ·
 * a shell with no content · a record carrying network errors.
 *
 * 🔴 AND IT HELD A SECOND COPY OF THE ROUTE POPULATION. Two hard-coded arrays lived here,
 * already drifted from `routes.mjs` (stale discovered ids that no longer exist), while
 * `routes.mjs`'s own header says copying the list into a second file "would re-create the
 * divergence (DESIGN_AUTHORITY §0a — one fact, one home)". It imports the list now.
 * ⚠️ Discovered detail routes are NOT in that list by nature, so they are judged on their own
 * record and never demanded back.
 */
const fs = require("fs");
const path = require("path");

const surface = process.argv[2];
if (!surface) { console.error("usage: redo.cjs admin|player"); process.exit(2); }
const dir = path.join(__dirname, "..", "..", ".qa-design-gate", `out-${surface}`);

/** ⛔ Every way a record can be a lie, not just the one that was found first. */
const SIGNIN = /auth\/(admin|login)/;
const OFFLINE_H1 = /you['’]re offline|offline/i;
const NETWORK_ERR = /ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|net::ERR_/i;

function verdict(r) {
  if (!r.m1440) return "no measurement";
  if (r.error) return `record error: ${String(r.error).slice(0, 60)}`;
  /* ⚠️ …but NOT when the sign-in page is the route we asked for. `/auth/login`,
     `/auth/register` and `/auth/forgot-password` are three of the sixteen declared PUBLIC
     player routes — landing on the sign-in page is the correct outcome there, not a
     revocation. The first version of this check deleted `/auth/login`'s record on sight,
     which is the same class of error it was written to catch: a detector that reads a
     legitimate page as poison silently shrinks the population it is protecting. */
  if (!/^\/auth\//.test(r.route || "") && SIGNIN.test(r.finalUrl || "")) return "the SIGN-IN page (session revoked)";
  const h1 = (r.m1440.h1 || "").trim();
  if (h1 && OFFLINE_H1.test(h1)) return `the OFFLINE page (h1 "${h1}")`;
  const errs = r.errors || [];
  if (errs.some((e) => NETWORK_ERR.test(String(e)))) return `${errs.length} network error(s) — the page did not fully load`;
  return null;
}

/** ⚠️ WARNED ABOUT, NEVER DELETED — and that restraint is deliberate. A "bare shell" heuristic
 *  (0 cards, 0 tables, few controls) would have caught the same eight, but it also fits a
 *  genuinely sparse page: `/proposals` measures 15 controls and ONE card, and an empty queue
 *  is a real state this product renders on purpose. The two decisive tests above — the offline
 *  h1 and the network errors — caught all eight on their own, so this adds deletion RISK
 *  without adding detection. It prints, so a human can look; it does not destroy evidence. */
function suspicious(r) {
  if (!r.m1440) return null;
  const c = (r.m1440.cards || []).length, t = (r.m1440.tables || []).length, n = (r.m1440.controls || []).length;
  return c === 0 && t === 0 && n <= 20 ? `${n} controls, 0 cards, 0 tables — thin, look at it` : null;
}

(async () => {
  const { ADMIN_ROUTES, PLAYER_PUBLIC, PLAYER_AUTHED } = await import("./routes.mjs");
  const declared = surface === "admin" ? ADMIN_ROUTES : [...PLAYER_PUBLIC, ...PLAYER_AUTHED];

  const ok = new Set();
  const killed = [], thin = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".json") && !n.startsWith("_"))) {
    const p = path.join(dir, f);
    const r = JSON.parse(fs.readFileSync(p, "utf8"));
    const why = verdict(r);
    if (why) { killed.push(`${r.route || f} — ${why}`); fs.unlinkSync(p); continue; }
    const odd = suspicious(r);
    if (odd) thin.push(`${r.route || f} — ${odd}`);
    ok.add(r.route);
  }
  const redo = declared.filter((r) => !ok.has(r));

  if (killed.length) console.error(`\n⛔ DELETED ${killed.length} poisoned record(s):\n${killed.map((k) => "   " + k).join("\n")}`);
  if (thin.length) console.error(`\n⚠️  ${thin.length} thin record(s) KEPT — not deleted, but worth a look:\n${thin.map((k) => "   " + k).join("\n")}`);
  console.error(`${surface}: OK ${ok.size} REDO ${redo.length}${redo.length ? `: ${redo.join(" ")}` : ""}`);
  process.stdout.write(redo.join(","));
})();
