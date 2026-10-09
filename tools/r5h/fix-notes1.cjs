const { once, edit } = require("./lib.cjs");
edit("src/app/positions/loading.tsx", (s) => {
  s = once(s, "and the shell read, asked beside the words: a journey reader is drawn Tiketi zangu's ghost, everybody else the ghost\n"
    + "     below — today's, unchanged — and neither is sent the other's.",
    "and the shell read: a journey reader is drawn Tiketi zangu's ghost, everybody else today's, unchanged — and neither\n"
    + "     is drawn the other's.", "pos.asked");
  return s;
});
edit("src/app/wallet/wallet-ghost.tsx", (s) => once(s,
  "          bar — 141px on a phone (row 1 10 + 44 + 8 + 17.25 − 4, row 2 12 + 44 + 10), 120 to 168px from 1024 — appeared\n",
  "          bar — 141px on a phone (row 1 10 + 44 + 8 + 17.25 − 4, row 2 12 + 44 + 10), 120 to 224px from 1024 — appeared\n", "w.range"));
