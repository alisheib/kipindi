// IN FLIGHT ~17:00 EAT: amend the ~16:45 paragraph (unpushed) to the state at the push.
const fs = require("fs");
const p = "F:/kipindi-vdocs/docs/VODACOM-PLAN.md";
let s = fs.readFileSync(p, "utf8");
const pairs = [
  ["**⏳ IN FLIGHT (updated 2026-10-09 ~16:45 EAT)", "**⏳ IN FLIGHT (updated 2026-10-09 ~17:00 EAT)"],
  ["— merged and green (`95ff793b`: 226 suites, its 59-plant mutation proof). R5-A (home card, one page one name, every close ✕ on its title, counts, the regulator's name, legal titles) is finishing one consistency item (the bet dialog's ✕); R5-E (text wrapping) one pin.",
   "— merged and green (226 suites, its 59-plant mutation proof); the branch is rebased onto main `118fc75c` (S14's STEP 56 and the hotfix under it, no conflict; 273 suites green, the reds main's own or the shared Prisma client's). R5-A (home card, one page one name, every close ✕ on its title and withheld in flight, counts, the regulator's name, legal titles) and R5-E (every market title balanced with its figures whole, Chinese units kept with their numbers, no invisible character inserted) are finished and merging."],
];
for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error("anchor: " + a.slice(0, 60)); s = s.replace(a, b); }
fs.writeFileSync(p, s);
console.log("ok");
