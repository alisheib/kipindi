const fs = require("fs");
const F = "F:/kipindi-r3a/scripts/hero-copy.test.mts";
let s = fs.readFileSync(F, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const rep = (from, to) => { const n = s.split(from).length - 1; if (n !== 1) throw new Error(`anchor x${n}: ${from.slice(0, 80)}`); s = s.replace(from, to); };

rep(` *      and "是还是否？", the buttons' own words, with no \`lang\` of its own.
`, ` *      and "是还是否？", the buttons' own words, with no \`lang\` of its own. §2c: a line that opens on a straight stem
 *      (H, N) is set back by the stem's measured side bearing, decided from those side words and never the locale.
`);
rep(`  hero: string;               // decommented landing-hero.tsx
`, `  hero: string;               // decommented landing-hero.tsx
  css: string;                // globals.css (line endings normalised) — §2c reads the headline's set-back rules
`);
rep(`    hero: src.get(HERO) ?? "",
`, `    hero: src.get(HERO) ?? "",
    css: read("src/app/globals.css"),
`);
rep(`    if (!/<h1 className="kp-hero__headline">/.test(ask)) d.push("no h1.kp-hero__headline in Ask");
    return d;
  } },
`, `    if (!/<h1 className="kp-hero__headline">/.test(ask)) d.push("no h1.kp-hero__headline in Ask");
    return d;
  } },
  /* §2c · round 3 (2026-10-08): "NDIO au / HAPANA?" began 3px (44px type), 4px (60px) and 5px (72px) right of the page's
     edge — Sora's side bearing on N and H, 0.068–0.073em measured off the tiles' first inked column — where "YES or NO?"
     and 是 sit on it. The set-back is decided from the SIDE WORDS (the buttons' own, \`sideWord\`), so it follows them
     into any locale, and the group before a set-back one gives the width back, so a one-line headline is unchanged. */
  { id: "2c", label: "a headline line that opens on a straight stem (H, N) is set back by the measured bearing — from the side words, never the locale — and a one-line headline keeps its gap", run: (w) => {
    const d: string[] = [];
    const ask = w.hero.slice(w.hero.indexOf("function Ask("), w.hero.indexOf("function TrustLines("));
    const stem = w.hero.match(/const STEM_START = (\/[^;\n]*);/)?.[1];
    if (stem !== "/^[HN]/u") d.push(\`STEM_START is \${stem ?? "missing"} — only H and N were measured; measure a letter's bearing on a tile before adding it\`);
    if (!/const lead = s\.slice\(0, a\)\.trim\(\) === "" && STEM_START\.test\(yes\);/.test(ask)) d.push("the first group's set-back is not decided by the YES side word opening the h1");
    if (!/const next = STEM_START\.test\(no\);/.test(ask)) d.push("the second group's set-back is not decided by the NO side word");
    if (!/<span className="kp-hero__grp" data-stem=\{lead \? "" : undefined\} data-stem-next=\{next \? "" : undefined\}>/.test(ask)) d.push("the first group does not carry data-stem={lead} and data-stem-next={next}");
    if (!/<span className="kp-hero__grp" data-stem=\{next \? "" : undefined\}>/.test(ask)) d.push("the second group does not carry data-stem={next}");
    if (/\blocale\b|\bLocale\b/.test(ask)) d.push("Ask reads the locale — the set-back follows the side words");
    const headline = w.css.slice(w.css.indexOf("\n.kp-hero__headline {"), w.css.indexOf("}", w.css.indexOf("\n.kp-hero__headline {")));
    if (!headline.includes("--hero-stem: 0.07em;")) d.push("the bearing is not .kp-hero__headline's --hero-stem: 0.07em");
    if ((w.css.match(/\.kp-hero__grp\[data-stem\] \{ margin-inline-start: calc\(-1 \* var\(--hero-stem\)\); \}/g) ?? []).length !== 1) d.push("no single rule sets a [data-stem] group back by --hero-stem");
    if ((w.css.match(/\.kp-hero__grp\[data-stem-next\] \{ margin-inline-end: var\(--hero-stem\); \}/g) ?? []).length !== 1) d.push("no single rule gives the width back before a set-back group — a one-line headline's gap would shrink");
    // The rule, applied to the shipped side words: Swahili opens both lines on a stem, English only "NO" (mid-line on its
    // one line, so nothing moves), Chinese neither.
    const re = new RegExp(stem && stem.startsWith("/") ? stem.slice(1, stem.lastIndexOf("/")) : "$^", "u");
    const got = LOCALES.map((loc) => \`\${loc}:\${re.test(w.dict[loc].get("common.yes") ?? "") ? "Y" : "-"}\${re.test(w.dict[loc].get("common.no") ?? "") ? "N" : "-"}\`).join(" ");
    if (got !== "en:-N sw:YN zh:--") d.push(\`the side words set back as [\${got}], measured as [en:-N sw:YN zh:--]\`);
    return d;
  } },
`);
rep(`  "2b": [{ note: "the English lang back on the h1", plant: (w) => withHero(w, w.hero.replace('<h1 className="kp-hero__headline">', '<h1 className="kp-hero__headline" lang="en">')) }],
`, `  "2b": [{ note: "the English lang back on the h1", plant: (w) => withHero(w, w.hero.replace('<h1 className="kp-hero__headline">', '<h1 className="kp-hero__headline" lang="en">')) }],
  "2c": [
    { note: "every headline is set back, the English Y too", plant: (w) => withHero(w, w.hero.replace('const lead = s.slice(0, a).trim() === "" && STEM_START.test(yes);', "const lead = true;")) },
    { note: "the group before a set-back one stops giving the width back (the one-line gap shrinks by 0.07em)", plant: (w) => ({ ...w, css: w.css.replace(".kp-hero__grp[data-stem-next] { margin-inline-end: var(--hero-stem); }", "") }) },
    { note: "a letter nobody measured joins the stems", plant: (w) => withHero(w, w.hero.replace("const STEM_START = /^[HN]/u;", "const STEM_START = /^[A-Z]/u;")) },
    { note: "the set-back keyed on the locale", plant: (w) => withHero(w, w.hero.replace("function Ask({ t }: { t: Dict }) {", "function Ask({ t, locale }: { t: Dict; locale: Locale }) {")) },
  ],
`);
if (crlf) s = s.replace(/\n/g, "\r\n");
fs.writeFileSync(F, s);
console.log("ok");
