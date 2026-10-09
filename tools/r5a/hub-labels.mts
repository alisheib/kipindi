const { dict } = await import("file:///F:/kipindi-r5a/src/lib/i18n-dict.ts");
const { hubRowsFor } = await import("file:///F:/kipindi-r5a/src/components/journey/account/hub-rows.ts");
const at = (t: any, p: string) => p.split(".").reduce((v, k) => (v == null ? v : v[k]), t);
const member = { signedIn: true, userId: "u", name: "n", initials: "N", phone: "p", balance: 1, walletHeld: false, kycOffered: true, agentInStanding: false, proposalsState: "OPEN", doors: { inviteVisible: true, proposalsVisible: true, agentDoorVisible: true, staffConsole: false } };
const rows = new Map<string, any>();
for (const v of [{ signedIn: false }, member]) for (const g of hubRowsFor(v as any)) for (const r of g.rows) if ("href" in r) rows.set(`${r.id}|${r.href}|${r.label}`, r);
for (const r of rows.values()) console.log(`${r.id.padEnd(13)} ${r.href.padEnd(38)} ${r.label.padEnd(30)} sw="${at(dict.sw, r.label)}" en="${at(dict.en, r.label)}" zh="${at(dict.zh, r.label)}"`);
