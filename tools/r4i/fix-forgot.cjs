const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/app/auth/forgot-password/page.tsx", [
  ["          {sp.error === \"rate_limited\" && (\n            {/* R4-I (2026-10-09, R4-K's gold audit): the sentence in the muted ink, not gold — a wait earns nothing (F3, §M3). */}\n            <div role=\"alert\"",
   "          {/* R4-I (2026-10-09, R4-K's gold audit): the sentence in the muted ink, not gold — a wait earns nothing (F3, §M3). */}\n          {sp.error === \"rate_limited\" && (\n            <div role=\"alert\""],
]);
