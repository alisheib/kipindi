// R4-I onto vodacom-visual (R4-H's journeyUser, R4-J's bare arms): keep OURS in both conflicted hunks and hand the
// journey bar the break's end (`breakEnd={journeyBreak}`, R4-I) — app-shell and simple-journey-flag's SWAP_HEADER.
const fs = require("fs");
const R = "F:/kipindi-vis/";
function resolve(p, fix) {
  let s = fs.readFileSync(R + p, "utf8");
  const re = /<<<<<<< ours\r?\n([\s\S]*?)=======\r?\n[\s\S]*?>>>>>>> theirs\r?\n/;
  if (!re.test(s)) throw new Error("no conflict in " + p);
  s = s.replace(re, (_, ours) => fix(ours));
  if (/<<<<<<<|>>>>>>>|^=======/m.test(s)) throw new Error("still conflicted: " + p);
  fs.writeFileSync(R + p, s);
}
const A = "<LazyJourneyTopBar user={journeyUser} onBreak={promoSuppressed} proposalsState=";
const B = "<LazyJourneyTopBar user={journeyUser} onBreak={promoSuppressed} breakEnd={journeyBreak} proposalsState=";
resolve("src/components/layout/app-shell.tsx", (ours) => {
  if (!ours.includes(A)) throw new Error("app-shell anchor");
  return ours.split(A).join(B);
});
resolve("scripts/simple-journey-flag.test.mts", (ours) => {
  if (!ours.includes(A)) throw new Error("test anchor");
  const note = "  // R4-I (2026-10-09): the journey bar is also handed the break's end (`breakEnd={journeyBreak}`, for its Wallet's notice); the\r\n  // classic arm is unchanged.\r\n";
  const at = "  const SWAP_HEADER = ";
  if (!ours.includes(at)) throw new Error("SWAP_HEADER anchor");
  return ours.split(A).join(B).replace(at, note + at);
});
console.log("resolved");
