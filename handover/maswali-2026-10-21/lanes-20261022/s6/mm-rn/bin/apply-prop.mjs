// Scratch: apply the PROPOSED R-merge resolutions to a dump dir, so the H.10e replica can read them. Not repo code.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const ROOT = process.argv[2];
const rd = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const wr = (p, s) => writeFileSync(join(ROOT, p), s);
const must = (s, from, to, label) => {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${label}: expected once, found ${n}`);
  return s.replace(from, to);
};
const dropMarkers = (s) => s.split("\n").filter((l) => !/^(<<<<<<< |=======$|>>>>>>> )/.test(l)).join("\n");

// 1 · COMPLIANCE-DECISIONS.md — the int×T markers dropped (union, the lead's call), then the rewordings.
{
  let s = dropMarkers(rd("docs/COMPLIANCE-DECISIONS.md"));
  s = must(s,
    "A read-only production check showed both\nof the officer's ADMIN accounts ACTIVE, 25 or over, with no self-exclusion and no break: the refusal was the automatic\nharm marker `LATE_NIGHT_PLAY` (5 and 9 bets between 00:00 and 06:00 EAT in seven days, from staff testing). The marker",
    "A read-only production check showed both\nof the officer's ADMIN accounts ACTIVE, 25 or over, with no self-exclusion and no break. The refusal was the automatic\nharm marker `LATE_NIGHT_PLAY`, which flags repeated betting in the late-night band the published policy names\n(`/legal/responsible-gambling` §3). Staff testing had placed 5 and 9 such bets on the two accounts. The marker",
    "mute: why it came up");
  s = must(s,
    "⟶ superseded in part on 2026-10-21 by § \"2026-10-21 · Harm markers muted for marketing SMS (owner ruling)\" — item 2's \"a sign of harm\" only: the automatic harm markers do not stop a marketing SMS while that ruling stands.",
    "⟶ superseded in part on 2026-10-21 by § \"2026-10-21 · Harm markers muted for marketing SMS (owner ruling)\". What it supersedes is item 2's \"a sign of harm\" only. While that ruling stands, the automatic harm markers do not stop a marketing SMS.",
    "mute: superseded line");
  s = must(s,
    "## 2026-10-18 · S16's \"in bounds\" amended for Maswali Millionea — its tickets leave the five measures, and harm markers are reported twice (OD-22)",
    "## 2026-10-18 · S16's \"in bounds\" amended for Maswali Millionea — its tickets leave the measures, and harm markers gain a count over the players without a ticket (OD-22)",
    "OD-22 heading");
  s = must(s,
    "the five measures at or above its 14-day pre-launch baseline, and no harm marker (RAPID_DEPOSIT_ESCALATION,\nCHASING_LOSSES daily counts) above its own. Under OD-22:",
    "the five measures at or above its 14-day pre-launch baseline, and neither harm count above its own baseline. The\nharm counts are S13's two. They are the counts of RAPID_DEPOSIT_ESCALATION and CHASING_LOSSES. Under OD-22:",
    "OD-22 item 8");
  s = must(s,
    "3. **From the first PUBLIC week's opening (`publicAt`) — never a drive week's — the harm markers are reported twice**:\n   over every player, as before, and over the players who had bought no Millionea ticket by the time that day was counted (any week, the\n   private drive's included; a cancelled ticket counts) — the harm watch's second row, `journey.harm.noTicket.daily`.",
    "3. **The harm markers gain a count over the players with no Millionea ticket**, beside the count over every player, as\n   before. That count starts when the first PUBLIC week opens (`publicAt`), never a drive week's, and reads the players\n   who had bought no Millionea ticket by the time that day was counted (any week, the private drive's included; a\n   cancelled ticket counts) — the harm watch's second row, `journey.harm.noTicket.daily`.",
    "OD-22 point 3");
  s = must(s,
    "**What does not change.** The five measures' definitions, their 14-day baselines and the seven-day window; the harm\ndetector itself; the count over every player, which is still reported.",
    "**What does not change.** The five measures' definitions, their 14-day baselines and the seven-day window stay as they\nwere. So does the count over every player, which is still reported. And so does the harm detector itself.",
    "OD-22 what does not change");
  wr("docs/COMPLIANCE-DECISIONS.md", s);
}

// 2 · rg-doors.test.mts — S5's mute semantics, in R's words.
{
  let s = rd("scripts/rg-doors.test.mts");
  const start = s.indexOf("<<<<<<< "), end = s.indexOf("\n", s.indexOf(">>>>>>> ", start));
  const merged = [
    "  // 2026-10-21 · Ali's ruling: the harm markers are MUTED for marketing SMS (`MARKETING_HARM_MARKERS_MUTED`,",
    "  // COMPLIANCE-DECISIONS § \"2026-10-21 · Harm markers muted for marketing SMS\"). The detector still flags this player —",
    "  // the rapid-deposit pattern — and the DEFAULT dependency lets them through; 8.11 and 8.12 keep proving that the harm",
    "  // step refuses whatever flags it is handed. Reactivating (the constant `false`) turns this back into `rg_harm_marker`.",
    "  const { detectHarmMarkers } = await import(\"../src/lib/server/responsible-gambling.ts\");",
    "  const realFlags = await detectHarmMarkers(\"mk_harm_real\");",
    "  ok(\"8.11b′ the detector itself still flags the player: the rapid-deposit pattern\",",
    "    realFlags.some((f) => f.marker === \"RAPID_DEPOSIT_ESCALATION\"), JSON.stringify(realFlags.map((f) => f.marker)));",
    "  await expect(\"8.11b ⏸ the DEFAULT dependency is MUTED (2026-10-21) — the same flagged player is ALLOWED for marketing\",",
    "    marketingRgStanding({ id: \"mk_harm_real\", status: \"ACTIVE\" }, idHarmReal, T), \"ALLOWED\");",
  ].join("\n");
  s = s.slice(0, start) + merged + s.slice(end);
  wr("scripts/rg-doors.test.mts", s);
}

// 3 · campaign-audience.test.mts — the pa10 line and S5's U33r note.
{
  let s = rd("scripts/campaign-audience.test.mts");
  const start = s.indexOf("<<<<<<< "), end = s.indexOf("\n", s.indexOf(">>>>>>> ", start));
  s = s.slice(0, start)
    + "await consenting(\"pa10\", \"+255681000010\", 10);                                                   // a harm marker: a burst of deposits — MUTED for marketing since 2026-10-21, so this player RECEIVES"
    + s.slice(end);
  s = must(s,
    "   2026-10-21 · the harm markers are MUTED for marketing (Ali; COMPLIANCE-DECISIONS § \"2026-10-21 · Harm markers muted for\n   marketing SMS (owner ruling)\"): pa10 moves from protected to will receive — 4→5, 7→6, 17→16 (players 4→5, 7→6, 13→12). */",
    "   2026-10-21 · the harm markers are MUTED for marketing (Ali; COMPLIANCE-DECISIONS § \"2026-10-21 · Harm markers muted for\n   marketing SMS (owner ruling)\"). So pa10 moves from protected to will receive — 4→5, 7→6, 17→16 (players 4→5, 7→6, 13→12). */",
    "U33r block");
  wr("scripts/campaign-audience.test.mts", s);
}

// 4 · rg.ts — the mute kept, R's word; "step 3" named by what it is (R dropped the section numbers).
{
  let s = rd("src/lib/server/marketing/rg.ts");
  const start = s.indexOf("<<<<<<< "), end = s.indexOf("\n", s.indexOf(">>>>>>> ", start));
  s = s.slice(0, start)
    + "  // ⛔ NO OPTIONS. Passing `sessionStartedAt` switches on the only detector that calls `getRgSettings`.\n"
    + "  harmFlags: (userId) => (MARKETING_HARM_MARKERS_MUTED ? Promise.resolve([]) : detectHarmMarkers(userId)),"
    + s.slice(end);
  s = must(s, "so step 3\n * below never refuses a send for one.", "so the harm\n * step below never refuses a send for one.", "rg.ts step 3 (a)");
  s = must(s, "Step 3 still refuses whatever flags\n * it is handed", "The harm step still refuses whatever\n * flags it is handed", "rg.ts step 3 (b)");
  wr("src/lib/server/marketing/rg.ts", s);
}
console.log("applied");
