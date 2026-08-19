/**
 * E-57 · UP & DOWN PER-EVENT PUSH — every terminal outcome reaches the device, or none does.
 *
 *   npm run test:updown-push
 *
 * WHY THIS SUITE IS SHAPED THE WAY IT IS. The defect it guards against is not "push is
 * broken"; it is **push that announces only some outcomes**. That has already happened once
 * on this platform, in the inbox channel, and it took production measurement to see it:
 * E-43 found that 0 of 13 winning and 0 of 11 losing Up & Down positions were ever
 * notified while 56 of 56 REFUNDED ones were — so the only outcome a player heard about was
 * the one where their money came back unchanged. The policy was not incomplete, it was
 * INVERTED, and every unit test passed throughout.
 *
 * So the assertions below are about COVERAGE and SYMMETRY, not about whether a push sends:
 * for each of the five suppressed call sites, the `else` branch must exist and must push.
 * A future edit that adds a sixth outcome, or removes one, fails here.
 *
 * ⚠️ This reads the SOURCE. That is deliberate and it is the weaker half of the guard —
 * `scripts/updown-push-red.mjs` is what proves the assertions can actually fail.
 */
import { readFileSync } from "node:fs";

// ⚠️ NORMALIZED TO LF AT THE DOOR. §2's old gate check matched `\n      }\n` literally, so on
// a CRLF checkout (Ali's machine) it matched NOTHING and passed vacuously, while on an LF
// checkout it matched the else-block's own closing brace and failed a CORRECT tree — the same
// suite reporting opposite verdicts about one commit depending on the machine. Every regex
// below now reads one canonical text.
const lf = (s: string) => s.replace(/\r\n/g, "\n");
const MS = lf(readFileSync(new URL("../src/lib/server/market-service.ts", import.meta.url), "utf8"));
const NS = lf(readFileSync(new URL("../src/lib/server/notification-service.ts", import.meta.url), "utf8"));
const SW = lf(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"));

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; return; }
  fails.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

// ── §1 · the push-only path exists and cannot write an inbox row ────────────────
{
  ok("§1 pushOnly is exported", /export function pushOnly\(/.test(NS));

  const body = NS.slice(NS.indexOf("export function pushOnly("), NS.indexOf("export function notifyBetPlaced("));
  ok("§1 it goes through the shared sender", /sendPushToUser/.test(body));
  // ⛔ If it called notify() it would write the very inbox row the digest exists to avoid.
  ok("§1 ⭐ it does NOT create a notification row", !/\bnotify\(\{/.test(body) && !/db\.notification\.create/.test(body));
  // The reader's language, not ours.
  ok("§1 it resolves the reader's locale", /user\?\.locale/.test(body) && /"SW"/.test(body) && /"ZH"/.test(body));
  ok("§1 it never throws (courtesy channel)", /catch \{/.test(body));
}

// ── §2 · ⭐ COVERAGE — every suppressed outcome pushes ───────────────────────────
//
// The five places `perEventNotificationsSuppressed` silences a player message. Each one
// must have a push on the other side of the branch. This is the E-43 assertion.
{
  // ⚠️ Count the GATES, not every mention — the definition and the prose around it also
  // contain the name, and an over-broad count made this assertion fail on a correct tree.
  const gates = (MS.match(/if \(!perEventNotificationsSuppressed\(/g) ?? []).length;
  ok("§2 the suppression predicate gates exactly 5 player messages", gates === 5, `found ${gates}`);

  // ⭐ AND EVERY GATE MUST HAVE AN `else`, AND THE ELSE MUST PUSH. Consistency is the
  // assertion: a gate without one is an outcome the device never hears about, which is
  // E-43's shape exactly.
  //
  // ⛔ REWRITTEN 2026-08-07. The old form scanned a 1,400-char window for `\n      }\n` not
  // followed by `else` — a shape that (a) matched the else-block's OWN closing brace on any
  // gate compact enough to fit the window, failing a correct tree, and (b) never matched at
  // all on CRLF, passing vacuously. It asserted a distance, not a structure. This walks the
  // braces: from each gate, match the if-block's closing brace, require `else` immediately
  // after it, then require a reachable `pushOnly(` STATEMENT inside that else block.
  const bareGates: string[] = [];
  {
    const gateRe = /if \(!perEventNotificationsSuppressed\(/g;
    let g: RegExpExecArray | null;
    const matchBlock = (openBrace: number): number => {
      let depth = 0;
      for (let i = openBrace; i < MS.length; i++) {
        if (MS[i] === "{") depth++;
        else if (MS[i] === "}" && --depth === 0) return i;
      }
      return -1;
    };
    while ((g = gateRe.exec(MS))) {
      const line = MS.slice(0, g.index).split("\n").length;
      const ifOpen = MS.indexOf("{", g.index);
      const ifClose = matchBlock(ifOpen);
      const afterIf = MS.slice(ifClose + 1);
      if (ifClose < 0 || !/^\s*else\s*\{/.test(afterIf)) {
        bareGates.push(`line ${line}: no else branch`);
        continue;
      }
      const elseOpen = ifClose + 1 + afterIf.indexOf("{");
      const elseClose = matchBlock(elseOpen);
      const elseBody = MS.slice(elseOpen + 1, elseClose);
      if (!/^[ \t]*pushOnly\(/m.test(elseBody)) {
        bareGates.push(`line ${line}: else branch has no reachable pushOnly statement`);
      }
    }
  }
  ok("§2 ⭐ no suppression gate is missing its push branch", bareGates.length === 0, bareGates.join(" · "));

  // ⭐⭐ COUNT CALLS THAT CAN ACTUALLY RUN, NOT OCCURRENCES OF THE NAME.
  // The first version of this counted `pushOnly(` anywhere in the file, and the RED
  // harness walked straight through it: prefixing ONE call with `void 0 &&` disables it
  // while leaving every character of the name in place, so the count stayed at 5 and the
  // suite stayed green while the LOSS push was dead code — E-43's exact shape, undetected.
  // Anchoring on statement position (start of line) is what makes the assertion about
  // reachability. Same lesson as E-56 earlier today: assert the value, not the symbol.
  const pushes = (MS.match(/^[ \t]*pushOnly\(/gm) ?? []).length;
  const mentions = MS.split("pushOnly(").length - 1;
  ok("§2 ⭐ every suppressed outcome has a push — bet, win, loss, refund, one-sided refund",
     pushes === 5, `found ${pushes} pushOnly STATEMENT(s), expected 5`);
  // Every mention must BE a statement. A mention that is not one is a call sitting behind
  // an expression — reachable-looking, never reached. (The import names `pushOnly` without
  // a paren, so it does not count here.)
  ok("§2 ⭐ …and none of them is short-circuited into dead code",
     mentions === pushes, `${mentions} mention(s) vs ${pushes} statement(s) — one is guarded by an expression`);

  // Name each outcome explicitly, so a removal says WHICH one went missing.
  for (const [outcome, needle] of [
    // ⚠️ RE-ANCHORED 2026-08-15. This needle was `Bet placed · ${opts.side}` — the STORED
    // token — and that expression was itself the defect (§L1): `opts.side` is `YES | NO` on
    // both product lines, so this push told an Up & Down player "Bet placed · YES". The
    // needle now pins the CORRECTED form, which is strictly stronger: it still proves the
    // bet-placed outcome pushes, and it additionally fails if anyone puts the poll's
    // vocabulary back on a round. ⛔ Do not relax it to just `Bet placed ·`.
    ["bet placed",        /titleEn: `Bet placed · \$\{sideWordIn\("en", opts\.side, "UPDOWN"\)\}/],
    ["win",               /titleEn: `You won \$\{formatTzs\(payout\)\}`/],
    ["loss",              /titleEn: `Bet lost · \$\{formatTzs\(p\.stake\)\}`/],
    ["refund",            /the round was voided and your stake came back in full/],
    ["one-sided refund",  /only one side had bets, so your stake came back in full/],
  ] as const) {
    ok(`§2 the ${outcome} outcome pushes`, needle.test(MS));
  }
}

// ── §3 · the loss is not softened, and the good news is not privileged ──────────
{
  // LCCP harm-prevention: a loss names the amount outright, in all three languages.
  ok("§3 the loss push names the stake in EN", /titleEn: `Bet lost · \$\{formatTzs\(p\.stake\)\}`/.test(MS));
  ok("§3 …in SW", /titleSw: `Dau limepotea · \$\{formatTzs\(p\.stake\)\}`/.test(MS));
  ok("§3 …and in ZH", /titleZh: `投注失败 · \$\{formatTzs\(p\.stake\)\}`/.test(MS));

  // ⭐ Symmetry: as many result-tagged pushes as there are money outcomes (win, loss,
  // refund, one-sided refund). A push channel that carried only wins would be E-43 again.
  const results = MS.split("updownResultPushTag(m.id)").length - 1;
  ok("§3 ⭐ all four MONEY outcomes carry a result tag", results === 4, `found ${results}`);
}

// ── §4 · the collapse keys, which are what make per-event push safe ─────────────
{
  ok("§4 the bet tag is a single shared key", /export const UPDOWN_PUSH_TAG_BET = "updown-bet"/.test(MS));
  ok("§4 the result tag is PER ROUND", /updownResultPushTag = \(marketId: string\) => `updown-result-\$\{marketId\}`/.test(MS));

  // ⭐ THE ONE THAT MATTERS. If results shared one key, a win would be silently replaced
  // by a later loss on the same device — money news overwritten by other money news.
  ok("§4 ⭐ results do NOT share the bet's collapse key",
     !/tag: UPDOWN_PUSH_TAG_BET[\s\S]{0,400}?You won/.test(MS));

  // The service worker must actually honour the tag, or coalescing is a comment.
  ok("§4 the service worker uses the tag", /tag: payload\.tag/.test(SW));
  ok("§4 …and renotifies so a replacement is still noticed", /renotify: !!payload\.tag/.test(SW));
}

const label = "E-57 · Up & Down push";
if (fails.length) {
  console.error(`\n${label} — ${pass} passed, ${fails.length} FAILED\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${label} — ${pass} passed, 0 failed`);
