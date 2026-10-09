// C1: the names each journey door gives /profile/invite, per reader, against the page's own <title> and h1.
// Runs the real hubRowsFor; quotes the avatar menu's and footer's source lines (their labels are inline expressions).
import { readFileSync } from "node:fs";
import { dict } from "file:///F:/kipindi-rev/src/lib/i18n-dict.ts";
import { hubRowsFor, hubWord } from "file:///F:/kipindi-rev/src/components/journey/account/hub-rows.ts";
const R = "F:/kipindi-rev/";
const base = {
  signedIn: true as const, userId: "u1", name: "Neema", initials: "N", phone: "+255••••84", balance: 1000, walletHeld: false,
  kycOffered: false, proposalsState: "ACTIVE" as const,
  doors: { inviteVisible: true, proposalsVisible: true, agentDoorVisible: true } as never,
};
const inviteLabel = (agentInStanding: boolean) =>
  hubRowsFor({ ...base, agentInStanding } as never).flatMap((g) => g.rows).find((r: any) => r.id === "invite") as any;
const menu = readFileSync(R + "src/components/layout/avatar-menu.tsx", "utf8").split(/\r?\n/);
const footer = readFileSync(R + "src/components/layout/public-footer.tsx", "utf8").split(/\r?\n/);
const page = readFileSync(R + "src/app/profile/invite/page.tsx", "utf8").split(/\r?\n/);
const dash = readFileSync(R + "src/app/profile/invite/agent-dashboard.tsx", "utf8").split(/\r?\n/);
const shell = readFileSync(R + "src/components/layout/app-shell.tsx", "utf8").split(/\r?\n/);
const show = (name: string, lines: string[], n: number) => console.log(`  ${name}:${n}  ${lines[n - 1].trim().slice(0, 170)}`);
console.log("SOURCE");
show("app-shell.tsx", shell, 338);
show("avatar-menu.tsx", menu, 152); show("avatar-menu.tsx", menu, 153); show("avatar-menu.tsx", menu, 411);
show("public-footer.tsx", footer, 277);
show("invite/page.tsx", page, 51); show("invite/page.tsx", page, 265); show("invite/page.tsx", page, 268);
show("agent-dashboard.tsx", dash, 101); show("agent-dashboard.tsx", dash, 104);
for (const loc of ["sw", "en", "zh"] as const) {
  const t = (dict as any)[loc];
  const w = (k: string) => hubWord(t, k as never);
  console.log(`\n[${loc}]`);
  console.log(`  APPROVED AGENT  hub="${w(inviteLabel(true).label)}"  menu(invitePaid)="${w("profile.inviteEarn")}"  footer="${w("profile.inviteFriends")}"  <title>="${w("profile.inviteEarn")}"  h1="${w("agent.dashTitle")}"`);
  console.log(`  PAID PLAYER     hub="${w(inviteLabel(false).label)}"  menu(invitePaid)="${w("profile.inviteEarn")}"  footer="${w("profile.inviteFriends")}"  <title>="${w("profile.inviteEarn")}"  h1="${w("profile.inviteEarn")}"`);
  console.log(`  UNPAID PLAYER   hub="${w(inviteLabel(false).label)}"  menu="${w("profile.inviteFriends")}"  footer="${w("profile.inviteFriends")}"  <title>="${w("profile.inviteFriends")}"  h1="${w("profile.inviteFriends")}"`);
}
// The menu's literal equals profile.inviteEarn in every language (so the menu says the page's PAID name).
const lit = /en: "([^"]+)",\s*sw: "([^"]+)",\s*zh: "([^"]+)"/.exec(menu[410])!;
console.log(`\nmenu literal (avatar-menu.tsx:411) en/sw/zh = ${lit.slice(1).join(" | ")}; equals profile.inviteEarn: ${lit[1] === dict.en.profile.inviteEarn && lit[2] === dict.sw.profile.inviteEarn && lit[3] === dict.zh.profile.inviteEarn}`);
