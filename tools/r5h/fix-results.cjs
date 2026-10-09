const { once, edit } = require("./lib.cjs");
edit("src/app/results/loading.tsx", (s) => {
  s = once(s, '"use client";\n\nimport { useT } from "@/lib/i18n";\n', '"use client";\n\n', "import");
  s = once(s, " * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so\n"
    + " * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —\n"
    + " * `components/ui/page-loader.tsx` has the convention.\n",
    " * ⭐ CLIENT CODE THAT READS NOTHING (round 5's follow-up, R5-H · G-2): it asked the server for the words and drew none of\n"
    + " * them (R5-D found the same read in the question's skeleton) — so the read is gone, and a refresh of /results carries\n"
    + " * this drawing's reference, not its tree. `components/ui/page-loader.tsx` has the convention.\n", "note");
  s = once(s, "export default function ResultsLoading() {\n  const { t } = useT();\n", "export default function ResultsLoading() {\n", "read");
  return s;
});
edit("scripts/visual-pass-r5h.test.mts", (s) => {
  s = once(s, '  const WORDLESS = new Set(["src/app/markets/[id]/loading.tsx", "src/app/wallet/deposit/return/loading.tsx", "src/app/agent/apply/loading.tsx", "src/app/agent/invite/[token]/loading.tsx", "src/app/agent/status/loading.tsx"]);\n',
    "  // A ghost has words when one of its drawings reads the dictionary (`t.<section>.<key>`); the others draw none.\n"
    + "  const WORDLESS = new Set(PLAYER.filter((f) => !drawingsOf(f).some((d) => /\\bt\\.[a-z]\\w*\\.\\w+/.test(code(d)))));\n", "wordless");
  s = once(s, "  const pinned = PLAYER.filter((f) => !WORDLESS.has(f)).map((f) => new Set(LOCALES.map(() => inApp(routeOf(f), \"sw\", h(mods.get(f) as never)))).size);\n"
    + "  ok(\"1.6′ CONTROL · the same ghosts with the provider held at one language draw one render each — so 1.6's difference is the provider's doing\", pinned.every((n) => n === 1));\n",
    "  const pinned: number[] = [];\n"
    + "  for (const f of PLAYER.filter((x) => !WORDLESS.has(x))) {\n"
    + "    const html = new Set<string>();\n"
    + "    for (const l of LOCALES) { REQ.locale = l; REQ.path = routeOf(f); REQ.journey = false; html.add(inApp(routeOf(f), \"sw\", await runServer(h(mods.get(f) as never)))); }\n"
    + "    pinned.push(html.size);\n"
    + "  }\n"
    + "  ok(`1.6′ CONTROL · the same ${pinned.length} ghosts with the provider held at one language, whatever the server's cookie says, draw one render each — so 1.6's difference is the provider's doing, not the server's`, pinned.length > 20 && pinned.every((n) => n === 1), j(pinned));\n", "control");
  s = once(s, "  ok(`1.6 · RUN on React's server renderer, every player ghost renders in sw, en and zh for both readers: the ${PLAYER.length - WORDLESS.size} with words draw them in the provider's language, the ${WORDLESS.size} without draw the same bytes in all three`,\n",
    "  ok(`1.6 · RUN on React's server renderer, every player ghost renders in sw, en and zh for both readers: the ${PLAYER.length - WORDLESS.size} with words draw them in the provider's language, the ${WORDLESS.size} without (${[...WORDLESS].map((f) => f.slice(8, -12)).join(\", \")}) draw the same bytes in all three`,\n", "label");
  return s;
});
