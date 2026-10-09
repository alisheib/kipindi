// Adds 7.home-edge and its plants to scripts/journey-shell.test.mts (run with cwd = the tree).
const fs = require("fs");
const p = "scripts/journey-shell.test.mts";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const once = (hay, needle, what) => { if (hay.split(needle).length !== 2) throw new Error(`anchor ${what}: ${hay.split(needle).length - 1}`); };

// 1. the check, right after 7.gutter's ok(…)
const gutterEnd = `    show({ row, row360, ...edge, sp4: tokenValue(css, "sp-4"), sp8: tokenValue(css, "sp-8") }));\n`;
once(s, gutterEnd, "7.gutter end");
const check = `  // The same rule on \`/\` (2026-10-08): the hero and every band there are \`.kp-hero__inner\` and \`.kp-band__inner\`,
  // which step to 24px at 768 for the classic shell — 8px inside the header from 768 and 8px outside it from 1024. In
  // the journey, by the shell's server-rendered mark (\`shell-mark.ts\`, in the HTML before any script, so nothing moves
  // on hydration), they keep the header's edge: the base rules' 16px to 1023 and 32px from 1024. Classic viewers keep
  // their 24 (VODACOM-PLAN §0i: served what they were).
  const SHELL_SCOPE = ":root:has(#kp-journey-shell)";
  const journeyEdge = (px: number) => mediaBlocks(css)
    .filter((b) => b.cond === \`(min-width: \${px}px)\` && b.body.includes(SHELL_SCOPE))
    .map((b) => b.body.replace(/\\s+/g, " ").trim());
  const homeEdge = (sp: string) => \`\${SHELL_SCOPE} .kp-hero__inner, \${SHELL_SCOPE} .kp-band__inner { padding-inline: var(--sp-\${sp}); }\`;
  const home = {
    hero: baseRule(css, ".kp-hero__inner"), band: baseRule(css, ".kp-band__inner"),
    at768: journeyEdge(768), at1024: journeyEdge(1024),
    mark: text(W, "src/lib/journey/shell-mark.ts").includes(\`export const JOURNEY_SHELL_MARK = "kp-journey-shell";\`),
  };
  ok("7.home-edge · on \`/\` the journey's hero and bands keep the header's edge — the base rules' 16px to 1023 and 32px from 1024, one block per step, scoped by the shell's server-rendered mark so classic viewers keep their 24 (the owner's rule, 2026-10-08)",
    home.hero.includes("padding: var(--sp-5) var(--sp-4) var(--sp-8)") && home.band.includes("padding-inline: var(--sp-4)")
      && home.at768.length === 1 && home.at768[0] === homeEdge("4")
      && home.at1024.length === 1 && home.at1024[0] === homeEdge("8") && home.mark,
    show(home));
`;
s = s.replace(gutterEnd, gutterEnd + check);

// 2. the plant worlds, after pageGutterMoves
const worldAnchor = "    const pageGutterMoves = withFile(WORLD, PAGE_CONTAINER, (s) => s.replace(`\"px-3 lg:px-6 py-6\"`, `\"px-3 lg:px-5 py-6\"`));\n";
once(s, worldAnchor, "pageGutterMoves");
const worlds = `    // 7.home-edge's plants: the journey's \`/\` back on the classic 24 from 768, its 32 step lost, its scope dropped (the
    // classic home would move), and the mark renamed under the rule that reads it.
    const HOME_SCOPE = ":root:has(#kp-journey-shell)";
    const homeAt24 = withCss((s) => s.replace(\`\${HOME_SCOPE} .kp-band__inner { padding-inline: var(--sp-4); }\`, \`\${HOME_SCOPE} .kp-band__inner { padding-inline: var(--sp-6); }\`));
    const homeEdgeLost = withCss((s) => s.replace(\`\${HOME_SCOPE} .kp-band__inner { padding-inline: var(--sp-8); }\`, \`\${HOME_SCOPE} .kp-band__inner { padding-inline: var(--sp-6); }\`));
    const homeUnscoped = withCss((s) => s.replace(\`\${HOME_SCOPE} .kp-hero__inner,\`, ".kp-hero__inner,"));
    const SHELL_MARK = "src/lib/journey/shell-mark.ts";
    const markRenamed = withFile(WORLD, SHELL_MARK, (s) => s.replace(\`= "kp-journey-shell";\`, \`= "kp-journey-mark";\`));
`;
s = s.replace(worldAnchor, worldAnchor + worlds);

// 3. the plant rows, after "the pages move their edge…"
const rowAnchor = `        world: pageGutterMoves, landed: changed(pageGutterMoves, PAGE_CONTAINER), landedAs: "one screen, two edges" },\n`;
once(s, rowAnchor, "pageGutterMoves row");
const rows = `      { name: "the journey's home steps to the classic 24 at 768", expect: at("7.home-edge ·"),
        world: homeAt24, landed: cssChanged(homeAt24), landedAs: "the bands 8px inside the header from 768 to 1023" },
      { name: "the journey's home loses its 32px step from 1024", expect: at("7.home-edge ·"),
        world: homeEdgeLost, landed: cssChanged(homeEdgeLost), landedAs: "the bands 8px outside the header on a desktop" },
      { name: "the home's edge rule loses its journey scope", expect: at("7.home-edge ·"),
        world: homeUnscoped, landed: cssChanged(homeUnscoped), landedAs: "the classic hero moves for every player" },
      { name: "the shell's mark is renamed under the rule that reads it", expect: at("7.home-edge ·"),
        world: markRenamed, landed: changed(markRenamed, SHELL_MARK), landedAs: "the rule waits for a span no page writes" },
`;
s = s.replace(rowAnchor, rowAnchor + rows);

fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok", crlf ? "CRLF" : "LF");
