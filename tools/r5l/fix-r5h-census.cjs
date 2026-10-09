// R5-L · r5h 5.1's census: the agent programme's shared ghost (`loading-shared.tsx`, `back={false}`) is gone — each agent
// route draws its own bands now — so its branch is dead; the note says what the census holds today.
const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r5h.test.mts", (s) => {
  s = once(s,
    "  // ⭐ THE BACK LINK: every ghost whose page opens on `BackLink` draws `BackLinkGhost`, the link's own 44px box. A census:\n"
    + "  // each player loading file's drawings (since R5-L a generic PageLoader route's own file draws its page's opening bands,\n"
    + "  // so it is held here too; a server file that only hands PageLoader numbers — /proposals/[id], whose first band is its\n"
    + "  // data — is passed over) against\n"
    + "  // the page beside it; the agent programme's shared ghost draws one unless its route says `back={false}`.\n",
    "  // ⭐ THE BACK LINK: every ghost whose page opens on `BackLink` draws `BackLinkGhost`, the link's own 44px box. A census:\n"
    + "  // each player loading file's drawings against the page beside it. Since R5-L a generic PageLoader route's own file draws\n"
    + "  // its page's opening bands, so it is held here too (a server file that only hands PageLoader numbers — /proposals/[id],\n"
    + "  // whose first band is its data — is passed over), and each agent route draws its own bands (the shared `AgentGhost`\n"
    + "  // and its `back={false}` are gone).\n",
    "census note");
  s = once(s,
    "      const agent = draws.some((d) => d.endsWith(\"app/agent/loading-shared.tsx\"));\n"
    + "      const ghostHas = agent ? !/back=\\{false\\}/.test(decomment(text(f))) : draws.some((d) => /<BackLinkGhost \\/>/.test(decomment(text(d))));\n",
    "      const ghostHas = draws.some((d) => /<BackLinkGhost \\/>/.test(decomment(text(d))));\n",
    "census code");
  return s;
});
