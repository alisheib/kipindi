// R5-L · qa:ghost-landing §D — the rebuilt ghosts land box for box (a lock turn's drive; written here, not run).
const { once, edit } = require("./lib.cjs");
const D_SECTION = require("fs").readFileSync(require("path").join(__dirname, "ghost-landing-D.txt"), "utf8");
edit("scripts/ghost-landing.mjs", (s) => {
  s = once(s,
    " *   RED_STACK=1 npm run qa:ghost-landing -- <base>   §B AND §C's fix is served back out\n *\n",
    " *   RED_STACK=1 npm run qa:ghost-landing -- <base>   §B AND §C's fix is served back out\n"
    + " *   ONLY=D npm run qa:ghost-landing -- <base>        §D alone (R5-L): every rebuilt ghost, box for box\n"
    + " *   RED_BOXES=1 ONLY=D npm run qa:ghost-landing -- <base>   §D's ghosts' word boxes broken back out\n"
    + " *   D_WIDTHS=360,390,1280 D_LOCALES=sw,en,zh …       §D's grid (default 390 and 1280, Swahili)\n *\n",
    "usage");
  s = once(s,
    " * of 0.0000 from an excluded shift is indistinguishable from a number of 0.0000 from a page that\n * held still, and only one of those is the product working.\n */\n",
    " * of 0.0000 from an excluded shift is indistinguishable from a number of 0.0000 from a page that\n * held still, and only one of those is the product working.\n"
    + " *\n"
    + " * ── §D · EVERY REBUILT GHOST, BOX FOR BOX (round 5's follow-up, R5-L) ──────────────────────────\n"
    + " * §A's 120px tolerance was set for ghosts that were typed boxes. Since R5-L the ghosts on /agent, /agent/apply,\n"
    + " * /agent/status, /leaderboard, /results, /markets, /live and the sixteen generic loaders are built of their pages' own\n"
    + " * boxes with the pages' own words set and not shown, so the element each one promises lands on the page's pixel: §D\n"
    + " * hops to each route (a client move, so the loading file paints), records where the ghost drew a shared element —\n"
    + " * the first grid card, the table's first row, the last glass panel, the page's h1 — and where the page puts it, and\n"
    + " * fails anything more than BOX_TOL apart. §D2 does the same for the two in-page Suspense skeletons on a DOCUMENT load\n"
    + " * (/results and /markets: their fallbacks are their loading files' drawings). Signed in through the dev door\n"
    + " * (`/auth/demo`) where the route needs a player; the page a route is reached from is one that links to it.\n"
    + " * ⚠️ A route whose element never shows in a ghost frame, or never arrives, proved nothing and is reported as such.\n"
    + " */\n",
    "doc");
  s = once(s,
    "const RED_STACK = process.env.RED_STACK === \"1\";\nconst RED = RED_GHOST || RED_STACK;\n",
    "const RED_STACK = process.env.RED_STACK === \"1\";\nconst RED_BOXES = process.env.RED_BOXES === \"1\";\nconst RED = RED_GHOST || RED_STACK || RED_BOXES;\n"
    + "/** `ONLY=D` runs §D alone (a lock turn's budget); otherwise §A–§C run and §D after them. */\nconst ONLY = (process.env.ONLY ?? \"\").toUpperCase();\n",
    "flags");
  s = once(s,
    "const SECTION = { RED_GHOST: [\"A\"], RED_STACK: [\"B\", \"C\"] };\n",
    "const SECTION = { RED_GHOST: [\"A\"], RED_STACK: [\"B\", \"C\"], RED_BOXES: [\"D\"] };\n",
    "section map");
  // §A–§C are skipped when ONLY=D.
  s = once(s,
    "/* ── §A ─────────────────────────────────────────────────────────────────────────────────── */\nconsole.log(\"\\n§A · does the content land where the ghost promised?\");\nfor (const target of [\"/live\", \"/markets\", \"/results\"]) {\n",
    "/* ── §A ─────────────────────────────────────────────────────────────────────────────────── */\nif (ONLY !== \"D\") console.log(\"\\n§A · does the content land where the ghost promised?\");\nfor (const target of ONLY === \"D\" ? [] : [\"/live\", \"/markets\", \"/results\"]) {\n",
    "A gate");
  s = once(s,
    "console.log(`\\n§B · /live with MOTION ON — what moves over ${DWELL_MS / 1000}s of sitting still?`);\n{\n",
    "if (ONLY !== \"D\") console.log(`\\n§B · /live with MOTION ON — what moves over ${DWELL_MS / 1000}s of sitting still?`);\nif (ONLY !== \"D\") {\n",
    "B gate");
  s = once(s,
    "console.log(\"\\n§C · tapping a carousel dot must not move the board below it\");\nfor (const surface of [\n",
    "if (ONLY !== \"D\") console.log(\"\\n§C · tapping a carousel dot must not move the board below it\");\nfor (const surface of ONLY === \"D\" ? [] : [\n",
    "C gate");
  s = once(s,
    "await b.close();\n\nconst label = RED_GHOST ? \"RED_GHOST (§A's fix served back out)\" : RED_STACK ? \"RED_STACK (§B and §C's fix served back out)\" : \"GREEN\";\n",
    D_SECTION + "\nawait b.close();\n\nconst label = RED_GHOST ? \"RED_GHOST (§A's fix served back out)\" : RED_STACK ? \"RED_STACK (§B and §C's fix served back out)\" : RED_BOXES ? \"RED_BOXES (§D's word boxes broken back out)\" : \"GREEN\";\n",
    "D section");
  s = once(s,
    "  const want = SECTION[RED_GHOST ? \"RED_GHOST\" : \"RED_STACK\"];\n",
    "  const want = SECTION[RED_GHOST ? \"RED_GHOST\" : RED_STACK ? \"RED_STACK\" : \"RED_BOXES\"];\n",
    "red want");
  return s;
});

