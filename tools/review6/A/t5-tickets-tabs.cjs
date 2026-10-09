// Review A · t5: Tiketi zangu's two tabs during a break — Maswali (TicketsView) vs Juu/Chini (/updown/history). Read-only.
const fs = require("node:fs");
const R = "F:/kipindi-rev/";
const show = (file, re) => {
  const lines = fs.readFileSync(R + file, "utf8").split("\n");
  console.log("== " + file);
  lines.forEach((l, i) => { if (re.test(l)) console.log(String(i + 1).padStart(5), l.trim().slice(0, 140)); });
};
show("src/components/journey/tickets/tickets-view.tsx", /breakBody|breakNow|ticketsBrowse/);
show("src/app/updown/history/page.tsx", /resolveSimpleJourney|TicketsHead|isLockedOut|breakEnd|breakBody|udNoHistoryBody|href="\/updown" className/);
const dict = fs.readFileSync(R + "src/lib/i18n-dict.ts", "utf8").split("\n");
dict.forEach((l, i) => { if (/udNoHistoryBody|ticketsBrowse:/.test(l)) console.log("dict", String(i + 1).padStart(5), l.trim()); });
