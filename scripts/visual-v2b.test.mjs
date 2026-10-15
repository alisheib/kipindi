/**
 * V2b source fences. These check that the fixed controls still use the shared
 * kit shapes and that the full population of affected call sites remains wired.
 * They do not certify painted geometry: the local 320–1920 × en/sw/zh browser
 * read is the release gate. --prove-red plants each regression in memory only.
 */
import { readFileSync } from "node:fs";

const files = {
  top: "src/components/layout/top-app-bar.tsx",
  footer: "src/components/layout/public-footer.tsx",
  shell: "src/components/layout/app-shell.tsx",
  nf: "src/components/ui/not-found-view.tsx",
  auth: "src/components/auth/auth-shell.tsx",
  date: "src/components/ui/date-select.tsx",
  register: "src/app/auth/register/register-form.tsx",
  login: "src/components/auth/login-identifier.tsx",
  legal: "src/app/legal/_components.tsx",
  rules: "src/app/legal/rules/page.tsx",
  help: "src/app/help/page.tsx",
  question: "src/app/markets/[id]/page.tsx",
  countdown: "src/components/markets/countdown.tsx",
  chart: "src/components/charts/chart-toggle.tsx",
  comments: "src/components/markets/comments-thread.tsx",
  leader: "src/app/leaderboard/page.tsx",
  hint: "src/app/leaderboard/tier-hint.tsx",
  ribbon: "src/components/layout/page-ribbon.tsx",
  css: "src/app/globals.css",
  law: "docs/DESIGN_AUTHORITY.md",
};
const source = Object.fromEntries(Object.entries(files).map(([k, p]) => [k, readFileSync(p, "utf8").replace(/\r\n/g, "\n")]));
const has = (s, x) => s.includes(x);
const count = (s, x) => s.split(x).length - 1;
const gate = (id, check, file, from, to = "") => ({ id, check, file, from, to });
const gates = [
  gate("F03 header home reach", s => /min-w-\[var\(--tap-min\)\].*justify-center.*xl:mx-0/.test(s.top) && /-mx-\[7px\]/.test(s.top), "top", "min-w-[var(--tap-min)]"),
  gate("F04 404 exit reach", s => /href=\{out\.href as never\}[\s\S]{0,170}min-h-\[var\(--tap-min\)\]/.test(s.nf), "nf", "min-h-[var(--tap-min)]"),
  gate("F07 auth mark reach", s => /aria-label=\{t\.auth\.brandHomeAria\}[^>]*min-h-\[var\(--tap-min\)\]/.test(s.auth), "auth", "min-h-[var(--tap-min)]"),
  gate("F08 date segment and field reach", s => has(s.date, "onPointerDown={(e) =>") && has(s.date, 'minWidth: "var(--tap-min)"') && has(s.date, 'className="h-full bg-transparent'), "date", 'minWidth: "var(--tap-min)"'),
  gate("F09 footer rhythm rung", s => has(s.footer, "lg:mt-[var(--rh-close)]") && has(s.shell, "lg:mt-[var(--rh-close)]"), "footer", "lg:mt-[var(--rh-close)]"),
  gate("F13 header/page gutters", s => has(s.top, "sm:px-3 lg:gap-2 lg:px-6"), "top", "sm:px-3 lg:gap-2 lg:px-6"),
  gate("F19 legal heading number column", s => has(s.legal, "grid-cols-[3ch_minmax(0,1fr)]") && has(s.legal, '<span className="text-balance">{keepConnectives(title)}</span>'), "legal", "grid-cols-[3ch_minmax(0,1fr)]"),
  gate("F21 footer row and tablet columns", s => has(s.footer, "md:grid-cols-2 lg:grid-cols-4") && /<li className="flex min-h-\[var\(--tap-min\)\][^>]*>\s*\{t\.footer\.stopGambling\}/.test(s.footer), "footer", "md:grid-cols-2 lg:grid-cols-4"),
  gate("F22 DOB matches form height", s => /<DateSelect[\s\S]{0,100}id="dob"\s+size="lg"/.test(s.register), "register", 'id="dob"\n            size="lg"', 'id="dob"'),
  gate("F23 guest controls one height", s => count(s.top, "btn btn-ghost btn-md btn-pill kp-auth-cta") === 1 && count(s.top, "btn btn-primary btn-md btn-pill kp-auth-cta") === 1 && has(s.css, ".kp-auth-cta { height: var(--h-control-md)"), "css", ".kp-auth-cta { height: var(--h-control-md)"),
  gate("F24 identifier label stays whole", s => /h-\[44px\].*gap-1\.5 whitespace-nowrap.*text-body-sm/.test(s.login), "login", "gap-1.5 whitespace-nowrap"),
  gate("F25 help phrases use DotSeq", s => has(s.help, "<DotSeq text={sub} />") && /className="flex items-start gap-3 rounded-xl glass-panel/.test(s.help), "help", "<DotSeq text={sub} />"),
  gate("F26 support phone stays mono", s => has(s.help, 'href?.startsWith("tel:") ? "font-mono tabular-nums') && has(s.footer, "whitespace-nowrap font-mono tabular-nums"), "help", 'href?.startsWith("tel:") ? "font-mono tabular-nums'),
  gate("F27 all consent links reachable", s => (s.register.match(/href=\{\"\/legal\/(?:terms|privacy|responsible-gambling)\" as never\} className="inline-flex min-h-\[var\(--tap-min\)\]/g) ?? []).length === 3, "register", 'href={"/legal/terms" as never} className="inline-flex min-h-[var(--tap-min)]', 'href={"/legal/terms" as never} className="inline-flex'),
  gate("F28 rule cards align tops", s => /className="flex items-start gap-3 rounded-xl glass-panel p-4/.test(s.rules) && has(s.rules, "text-balance break-keep"), "rules", "flex items-start gap-3 rounded-xl glass-panel p-4"),
  gate("F40 countdown fits four cells", s => has(s.countdown, 'className="flex gap-1 sm:gap-2"') && has(s.countdown, "flex min-w-0 flex-1 flex-col items-center") && has(s.countdown, "w-full min-w-0 rounded-md"), "countdown", "flex min-w-0 flex-1 flex-col items-center"),
  gate("F42 main column panel edges", s => has(s.question, 'className="glass-panel p-5 space-y-2.5"') && has(s.chart, 'className="px-5 pb-4') && has(s.comments, 'bg-bg-elevated p-5"'), "question", 'className="glass-panel p-5 space-y-2.5"'),
  gate("F45 tier info in flow", s => has(s.leader, "<TierHint tier={tier} description={desc} />") && !has(s.leader, "<Tooltip") && has(s.hint, "<InfoHintPanel id={panelId} open={open}"), "hint", "<InfoHintPanel id={panelId} open={open}"),
  gate("F46 leaderboard lens scrolls", s => has(s.leader, "data-filter-rail data-strip-autoscroll") && has(s.leader, "<StripAutoScroll />") && has(s.leader, "whitespace-nowrap rounded-pill border"), "leader", "data-filter-rail data-strip-autoscroll"),
  gate("F46 summary pairs form grid", s => has(s.ribbon, "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3") && has(s.ribbon, "flex min-w-0 flex-col items-start"), "ribbon", "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3"),
  gate("F51 radius law matches filter kit", s => has(s.law, "tabs take `--r-sm`; filter pills, chips") && has(s.css, ".kp-fchip"), "law", "filter pills, chips"),
];

let failures = 0;
for (const g of gates) {
  const green = g.check(source);
  if (!green) { console.error(`FAIL ${g.id}`); failures++; }
  if (process.argv.includes("--prove-red")) {
    const original = source[g.file];
    if (count(original, g.from) !== 1) { console.error(`PLANT ${g.id}: anchor count ${count(original, g.from)}`); failures++; continue; }
    const planted = { ...source, [g.file]: original.replace(g.from, g.to) };
    if (g.check(planted)) { console.error(`MISS ${g.id}`); failures++; }
  }
}
console.log(`visual-v2b source fences: ${gates.length - failures}/${gates.length} green${process.argv.includes("--prove-red") ? ", in-memory plants checked" : ""}`);
if (failures) process.exitCode = 1;
