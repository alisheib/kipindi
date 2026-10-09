const fs = require("fs");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const p = S + "/visual/owner-items.md";
let s = fs.readFileSync(p, "utf8");
if (s.includes("\n52. ")) { console.log("already there"); process.exit(0); }
const add = `52. (R5-G) Sign-up has two names in both shells: the header's "Jisajili / Sign up / 注册" vs the page's eyebrow, tab and
    submit "Fungua akaunti / Create account / 创建账户". One name — which? (Growing the header pill re-measures S4's fit.)
53. (R5-G) Where may "earn" stand (D5)? The agent's avatar menu says "Invite & Earn" while the hub and page say "Agent
    dashboard"; a paid player's page and menu say "Alika na upate zawadi" while the hub and footer say "Alika marafiki".
54. (R5-G) The licence line's wording differs by surface (regulator copy, not reworded): en email lacks "the"; sw footer
    "Leseni ya…" vs global-error "Imepewa leseni na…"; zh 获得…许可 vs 由…发照; the auth shell uses "GBT".
55. (R5-G) "Kuwa wakala" vs "Kuwa Wakala wa 50pick" — R5-A ruled them one name; strict would use \`agent.title\`.
56. (Review A) During a break the invite and proposals doors stay open (no break gate) — close them too?
57. (Review A) The CLASSIC chrome's deposit doors stay during a break (frozen until launch) — fix at launch?
`;
const anchor = "\n## S12 (live-word corrections";
if (!s.includes(anchor)) throw new Error("anchor");
s = s.replace(anchor, add + anchor);
const s12 = `- (R5-G) "Thibitisha amana" (common.confirmDeposit, the submit and dialog title) on a journey screen named "Weka pesa" —
  suggest "Thibitisha kuweka pesa" for native review.
- (R5-G) The push-settings page and the inbox share one name, "Arifa / Notifications / 通知" — the settings page needs its own.
- (R5-G) auth.licensedByGbt uses the acronym "GBT".
`;
const anchor2 = "\n\n## S8 (the journey bet sheet)";
if (!s.includes(anchor2)) throw new Error("anchor2");
s = s.replace(anchor2, "\n" + s12.replace(/\n$/, "") + anchor2);
fs.writeFileSync(p, s);
// the plain list
const q = S + "/visual/owner-plain.md";
let t = fs.readFileSync(q, "utf8");
const plainAdd = `52. Sign-up is called "Jisajili" in the header but "Fungua akaunti" on its page. Which one?
53. Where may the word "earn" appear (invite and agent doors use it in some places, not others)?
54. The licence line is worded differently on different screens (regulator copy — we didn't change it). Align it?
55. "Kuwa wakala" vs "Kuwa Wakala wa 50pick" — the same name, or make them identical?
56. During a break, should the Invite and Propose doors close too?
57. The old (classic) header's Deposit buttons still show during a break (frozen until launch). Fix at launch?
`;
const pa = "\n## Process";
if (!t.includes(pa)) throw new Error("plain anchor");
t = t.replace(pa, "\n## From the last helpers and reviewers\n" + plainAdd + pa);
fs.writeFileSync(q, t);
console.log("ok");
