// R5-L · 4.3 holds the GHOSTS' headers to the pages' (it read only the pages).
const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r5l.test.mts", (s) => once(s,
  "  const headers = { status: REAL(ST).includes(\"<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.statusTitle} />\"), invite: REAL(IV).includes(\"<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.inviteTitle} subtitle={t.agent.inviteBody} />\") };\n",
  "  const both = (page: string, ghost: string, el: string) => REAL(page).includes(el) && REAL(ghost).includes(el);\n"
  + "  const headers = { status: both(ST, STG, \"<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.statusTitle} />\"), invite: both(IV, IVG, \"<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.inviteTitle} subtitle={t.agent.inviteBody} />\") };\n",
  "4.3"));
