// R5-L · qa:ghost-landing: R5-K's §D (the signed-in K ghosts, on the tip) and R5-L's section were both "§D". R5-L's is
// §E now (ONLY=E, E_WIDTHS, E_LOCALES, RED_BOXES owns §E), and it signs in on R5-K's rule: only through a LOCAL server's
// demo door (no scripted sign-in to a preview or to production). The RED control also reaches a word bar that carries
// its own aria-hidden (R5-K's GhostText does).
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => {
  const all = (from, to, label) => { if (!s.includes(from)) throw new Error(`${label}: missing`); s = s.split(from).join(to); };
  s = once(s,
    " *   ONLY=D npm run qa:ghost-landing -- <base>        §D alone (R5-L): every rebuilt ghost, box for box\n"
    + " *   RED_BOXES=1 ONLY=D npm run qa:ghost-landing -- <base>   §D's ghosts' word boxes broken back out\n"
    + " *   D_WIDTHS=360,390,1280 D_LOCALES=sw,en,zh …       §D's grid (default 390 and 1280, Swahili)\n",
    " *   ONLY=E npm run qa:ghost-landing -- <base>        §E alone (R5-L): every rebuilt ghost, box for box\n"
    + " *   RED_BOXES=1 ONLY=E npm run qa:ghost-landing -- <base>   §E's ghosts' word boxes broken back out\n"
    + " *   E_WIDTHS=360,390,1280 E_LOCALES=sw,en,zh …       §E's grid (default 390 and 1280, Swahili)\n",
    "usage");
  s = once(s, " * ── §D · EVERY REBUILT GHOST, BOX FOR BOX (round 5's follow-up, R5-L) ───", " * ── §E · EVERY REBUILT GHOST, BOX FOR BOX (round 5's follow-up, R5-L) ───", "header title");
  s = once(s, "the page's pixel: §D hops to each route", "the page's pixel: §E hops to each route", "header hops");
  s = once(s, "BOX_TOL apart. §D2 does the same for", "BOX_TOL apart. §E2 does the same for", "header E2");
  s = once(s,
    " * files' drawings). Signed in through the dev door (`/auth/demo`) where the route needs a player; the page a route is\n"
    + " * reached from is one that links to it.",
    " * files' drawings). Signed in through a LOCAL server's dev door (`/auth/demo` — R5-K's rule in §D: no scripted sign-in\n"
    + " * to a preview or to production) where the route needs a player; the page a route is reached from is one that links\n"
    + " * to it.",
    "header sign-in");
  s = once(s, "there §D holds /results' row 2 and prints those grids' deltas.", "there §E holds /results' row 2 and prints those grids' deltas.", "header QA");
  s = once(s,
    "/** `ONLY=D` runs §D alone (a lock turn's budget); otherwise §A–§C run and §D after them. */",
    "/** `ONLY=E` runs §E alone (a lock turn's budget); otherwise §A–§C run and §E after them. */",
    "ONLY doc");
  s = once(s, "RED_BOXES: [\"D\"] };", "RED_BOXES: [\"E\"] };", "SECTION");
  all("ONLY !== \"D\"", "ONLY !== \"E\"", "gates");
  all("ONLY === \"D\" ?", "ONLY === \"E\" ?", "skips");
  s = once(s, "/* ── §D ──", "/* ── §E ──", "section rule");
  all("D_WIDTHS", "E_WIDTHS", "widths");
  all("D_LOCALES", "E_LOCALES", "locales");
  all("D_ROUTES", "E_ROUTES", "routes");
  s = once(s, "/** Serve §D's fix back out:", "/** Serve §E's fix back out:", "red doc");
  s = once(s,
    "\"\\n[aria-hidden] .box-decoration-clone,[aria-busy] .box-decoration-clone{display:block;min-height:40px}\\n\"",
    "\"\\n[aria-hidden] .box-decoration-clone,[aria-busy] .box-decoration-clone,.box-decoration-clone[aria-hidden]{display:block;min-height:40px}\\n\"",
    "red css");
  s = once(s, "if (ONLY === \"D\" || RED_BOXES || !RED) {", "if (ONLY === \"E\" || RED_BOXES || !RED) {", "section gate");
  s = once(s, "console.log(`\\n§D · every rebuilt ghost lands box for box", "console.log(`\\n§E · every rebuilt ghost lands box for box", "section title");
  s = once(s,
    "  const jar = BASE.includes(\"50pick.tz\") ? [] : await demoSession();\n"
    + "  if (!jar.length && !BASE.includes(\"50pick.tz\")) failures.push(\"D no player session (the dev door answers on local and preview only) — the routes that need one were not measured\");\n"
    + "  if (!jar.length && BASE.includes(\"50pick.tz\")) console.log(\"   (production: no dev door — the routes that need a player are not measured here)\");\n",
    "  // R5-K's rule (§D): a scripted sign-in only through a LOCAL server's demo door — never a preview, never production.\n"
    + "  const LOOPBACK = /^https?:\\/\\/(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?(?:\\/|$)/.test(BASE);\n"
    + "  const jar = LOOPBACK ? await demoSession() : [];\n"
    + "  if (LOOPBACK && !jar.length) failures.push(\"E no player session (the local demo door signed nobody in) — the routes that need one were not measured\");\n"
    + "  if (!LOOPBACK) console.log(`   (${BASE} is not a local server: no scripted sign-in — the routes that need a player are not measured here)`);\n",
    "sign-in");
  s = once(s, "    const tag = `D ${r.name ?? r.target} @${width} ${locale}`;", "    const tag = `E ${r.name ?? r.target} @${width} ${locale}`;", "tag");
  s = once(s, "  // §D2 — the in-page skeletons, on a DOCUMENT load:", "  // §E2 — the in-page skeletons, on a DOCUMENT load:", "E2 comment");
  s = once(s, "    const tag = `D ${target} (document) @${width} ${locale}`;", "    const tag = `E ${target} (document) @${width} ${locale}`;", "E2 tag");
  s = once(s, "RED_BOXES ? \"RED_BOXES (§D's word boxes broken back out)\"", "RED_BOXES ? \"RED_BOXES (§E's word boxes broken back out)\"", "label");
  return s;
});
