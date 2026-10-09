// Scratch proof of hubColumnCut / wideRowCount on the real hubRowsFor output for each kind of reader.
const ROWS = await import("file:///F:/kipindi-v2/src/components/journey/account/hub-rows.ts");
const DOORS = await import("file:///F:/kipindi-v2/src/lib/journey/viewer-doors.ts");

const card = (n: number) => 57 * n + 1;
const col = (ns: number[]) => ns.reduce((h, n) => h + card(n), 0) + 16 * Math.max(0, ns.length - 1);

function show(name: string, groups: any[], staff: boolean) {
  const weights = groups.map((g: any) => ROWS.wideRowCount(g.rows));
  if (staff) weights.push(1);
  const cut = ROWS.hubColumnCut(weights);
  const keys = [...groups.map((g: any) => g.key), ...(staff ? ["staff"] : [])];
  console.log(`${name}: weights=${JSON.stringify(weights)} cut=${cut}`);
  console.log(`   left  ${keys.slice(0, cut).join(", ")}  ~${col(weights.slice(0, cut))}px`);
  console.log(`   right ${keys.slice(cut).join(", ")}  ~${col(weights.slice(cut))}px`);
}

function member(o: { role?: string; kyc?: boolean; proposals?: string; agentEnabled?: boolean; standing?: boolean; held?: boolean } = {}) {
  const role = o.role ?? "PLAYER";
  const inviteViewer = { role, agentInGoodStanding: !!o.standing, playerInviteEligible: !o.standing };
  const proposalsState = o.proposals ?? "COMING_SOON";
  return {
    signedIn: true, userId: "u", name: "N", initials: "N", phone: "x", balance: 1, walletHeld: !!o.held,
    kycOffered: o.kyc ?? false, agentInStanding: !!o.standing, proposalsState,
    doors: DOORS.viewerDoorsFor({ inviteViewer, invitePayable: false, agentEnabled: o.agentEnabled ?? true, proposalsState, role } as any),
  } as any;
}

show("guest", ROWS.hubRowsFor({ signedIn: false }), false);
const p = member();
show("player (demo: invite, proposals, agent door, no kyc)", ROWS.hubRowsFor(p), !!p.doors.staffConsole);
const pk = member({ kyc: true });
show("player + kyc row", ROWS.hubRowsFor(pk), !!pk.doors.staffConsole);
const st = member({ role: "ADMIN" });
show(`staff ADMIN (staffConsole=${st.doors.staffConsole})`, ROWS.hubRowsFor(st), !!st.doors.staffConsole);
const held = member({ held: true, agentEnabled: false, proposals: "DISABLED" });
show("held wallet, no agent, proposals off", ROWS.hubRowsFor(held), !!held.doors.staffConsole);
console.log("edge: [] ->", ROWS.hubColumnCut([]), " [3] ->", ROWS.hubColumnCut([3]), " [2,2] ->", ROWS.hubColumnCut([2, 2]), " [3,1,3] ->", ROWS.hubColumnCut([3, 1, 3]));
