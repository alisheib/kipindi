/**
 * BUILD THE CLAUDE DESIGN HANDOFF PACKAGE.
 *
 *   node scripts/build-design-brief.mjs
 *
 * Produces `design-brief/` + `design-brief.zip` — everything an external design partner needs
 * to extend this system WITHOUT drifting from it, and nothing they should not have.
 *
 * ⛔ WHAT IS DELIBERATELY EXCLUDED, and why it must stay excluded if this is ever re-run:
 * anything under `src/lib/server/**` (money logic, settlement, payout, the audit chain),
 * `prisma/schema.prisma`, any `.env*`, and any script that touches the live database. A design
 * partner needs the surface, the tokens and the law — never the ledger.
 *
 * ⚠️ ONE JUDGEMENT CALL LEFT TO ALI, NOT MADE SILENTLY: `shots/podium.png` shows leaderboard
 * display names. They are QA personas plus one real team member (Jaykishan). It is included
 * because the podium hierarchy is the single clearest piece of evidence in the critique — but
 * it is named in the README so the decision to share it is explicit and reversible.
 */
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";

const OUT = "design-brief";
rmSync(OUT, { recursive: true, force: true });
for (const d of ["law", "components", "shots"]) mkdirSync(`${OUT}/${d}`, { recursive: true });

const read = (p) => readFileSync(p, "utf8");

/* ── 0 · the authored brief — versioned in docs/design-brief/, copied in here ───────── */
copyFileSync("docs/design-brief/README.md", `${OUT}/README.md`);
copyFileSync("docs/design-brief/CURRENT-STATE.md", `${OUT}/CURRENT-STATE.md`);
copyFileSync("docs/design-brief/AUDIT.txt", `${OUT}/AUDIT.txt`);

/* ── 1 · the law ────────────────────────────────────────────────────────────────────── */
copyFileSync("docs/DESIGN_AUTHORITY.md", `${OUT}/law/DESIGN_AUTHORITY.md`);
copyFileSync("src/app/motion.css", `${OUT}/law/motion.css`);

/* ── 2 · tokens + keyframes, EXTRACTED from a 2,603-line globals.css ─────────────────
   The whole file would bury the signal. What a design partner needs is the palette (so
   nothing is invented in hex) and the existing keyframe vocabulary (so nothing is
   duplicated under a new name). */
const g = read("src/app/globals.css");
const tokenLines = g.split("\n").filter((l) => /^\s+--[a-z0-9-]+:\s*(oklch|#|rgb|var|[\d.]+(px|ms|deg|s)?|cubic-bezier)/i.test(l));
writeFileSync(`${OUT}/law/tokens.css`,
  `/* Extracted from src/app/globals.css — the DESIGN TOKENS only.\n` +
  `   ⛔ The palette is oklch(). Never emit hex or rgb; extend by adding a token here. */\n\n` +
  `:root {\n${tokenLines.join("\n")}\n}\n`);

const kf = [...g.matchAll(/@keyframes\s+([a-z0-9-]+)\s*\{[\s\S]*?\n\}/gi)].map((m) => m[0]);
writeFileSync(`${OUT}/law/keyframes.css`,
  `/* Every keyframe already defined in the product — ${kf.length} of them.\n` +
  `   ⛔ Do not introduce a new name for a motion that already exists here.\n` +
  `   ⭐ Note \`seal-impress\`, \`seal-place\` and \`badge-seal-rays\`: the "struck seal" language\n` +
  `      the brief asks for is ALREADY NAMED in this system and never built out. */\n\n` +
  kf.join("\n\n") + "\n");

/* ── 3 · the components under critique ──────────────────────────────────────────────── */
const COMPONENTS = [
  // the celebration + identity
  ["src/components/markets/win-celebration.tsx", "win-celebration.tsx"],
  ["src/components/brand/reward-burst.tsx", "reward-burst.tsx"],
  ["src/components/ui/identity-avatar.tsx", "identity-avatar.tsx"],
  ["src/components/ui/avatar.tsx", "avatar.tsx"],
  // the OVERLAY family — dropdown, modal, dialog, toast, tooltip
  ["src/components/ui/modal.tsx", "modal.tsx"],
  ["src/components/ui/confirm-dialog.tsx", "confirm-dialog.tsx"],
  ["src/components/ui/toast.tsx", "toast.tsx"],
  ["src/components/ui/tooltip.tsx", "tooltip.tsx"],
  ["src/components/ui/select.tsx", "select.tsx"],
  ["src/components/layout/avatar-menu.tsx", "avatar-menu.tsx"],
  // the CARD family — what a player looks at all day
  ["src/components/markets/market-card.tsx", "market-card.tsx"],
  ["src/components/updown/updown-card.tsx", "updown-card.tsx"],
  ["src/components/ui/stat.tsx", "stat.tsx"],
  ["src/components/ui/chip.tsx", "chip.tsx"],
  ["src/components/ui/button.tsx", "button.tsx"],
];
for (const [src, dst] of COMPONENTS) if (existsSync(src)) copyFileSync(src, `${OUT}/components/${dst}`);

/* Icons: the first ~60 lines only. 185 glyphs is noise; the QUESTION is the house style. */
const glyphs = read("src/components/ui/glyphs.tsx").split("\n");
writeFileSync(`${OUT}/components/glyphs-excerpt.tsx`,
  `/* EXCERPT of src/components/ui/glyphs.tsx — 185 icons live here.\n` +
  `   Included to show the house drawing style, stroke weight and viewBox convention.\n` +
  `   ⛔ NOT ONE of the 185 has any transition, animation or state morph. That is the ask. */\n\n` +
  glyphs.slice(0, 70).join("\n") + "\n\n/* … 185 glyphs total, same construction … */\n");

/* ── 4 · the evidence ───────────────────────────────────────────────────────────────── */
const SHOTS = [
  [".qa-s31/win/win-en-1280.png", "win-celebration-en-1280.png"],
  [".qa-s31/win/win-sw-360.png", "win-celebration-sw-360.png"],
  [".qa-s31/win/win-zh-360.png", "win-celebration-zh-360.png"],
  [".qa-s31/design/2-board-card.png", "board-card-settled.png"],
  [".qa-s31/design/3-board-full.png", "board-full-1280.png"],
  [".qa-s31/design/1-leaderboard-avatars.png", "podium-and-avatars.png"],
  [".qa-s31/design/4-avatar-menu.png", "avatar-menu-open.png"],
];
let shots = 0;
for (const [src, dst] of SHOTS) if (existsSync(src)) { copyFileSync(src, `${OUT}/shots/${dst}`); shots++; }

console.log(`built ${OUT}/  ·  ${tokenLines.length} tokens · ${kf.length} keyframes · ${COMPONENTS.length} components · ${shots} shots`);

/* ── 5 · zip it ─────────────────────────────────────────────────────────────────────── */
try {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${OUT}/*' -DestinationPath '${OUT}.zip' -Force"`, { stdio: "inherit" });
  console.log(`zipped → ${OUT}.zip`);
} catch { console.log("(zip step skipped — folder is ready)"); }
