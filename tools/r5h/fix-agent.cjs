const { once, edit } = require("./lib.cjs");
edit("src/app/agent/loading.tsx", (s) => {
  s = once(s, "      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} />\n"
    + "      <div className=\"space-y-1.5\" aria-hidden>\n"
    + "        <div className=\"h-3 w-full max-w-[46ch] rounded bg-bg-overlay/40 kp-shimmer-track\" />\n"
    + "        <div className=\"h-3 w-4/5 max-w-[38ch] rounded bg-bg-overlay/40\" />\n"
    + "      </div>\n",
    "      {/* ⭐ THE PAGE'S OWN HEADER, SAME PROPS (R5-H · G-2b): `subtitle={t.agent.heroSub}`, 4px under the title as the page\n"
    + "          draws it, so it wraps where the page's does in every language. */}\n"
    + "      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} subtitle={t.agent.heroSub} />\n", "agent.sub");
  s = once(s, " * terms link. ⭐ The subtitle is ghosted rather than PRINTED because `heroSub` wraps to a\n"
    + " * different number of lines in each locale, and a real sentence here would settle at one\n"
    + " * height in English and another in Swahili.\n",
    " * terms link. ⭐ The subtitle is PRINTED since round 5's follow-up (R5-H · G-2b): `heroSub` wraps to a different number\n"
    + " * of lines in each locale, and the page's own sentence in the page's own `PageHeader` wraps exactly as the page's does —\n"
    + " * the two bars it replaced stood on the container's 32px rung instead of 4px under the title, and drew two lines where\n"
    + " * a phone has four (the subtitle 28px low at 1280).\n", "agent.doc");
  return s;
});
