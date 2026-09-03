/**
 * INVITE & EARN IS COMING SOON — and every surface that says so must say so from ONE switch.
 *
 *   npm run test:invite-coming-soon
 *
 * Ali's call, 2026-09-03: the referral programme is not open yet and must read as "coming soon"
 * wherever it appears, in the same language Propose & Earn already uses.
 *
 * ⛔ THE FAILURE THIS EXISTS TO PREVENT is not "a badge is missing" — it is **one surface left
 * behind when the switch flips.** Six player surfaces mention Invite. A feature toggled by six
 * independent edits is a feature that will be half-on the day it opens, and the half that stays
 * wrong is always the one nobody was looking at. So the rule is positional and mechanical:
 * *a surface that links a player to `/profile/invite` must consult `inviteIsLive()`.*
 *
 * ⚠️ WHY THAT RULE AND NOT "CONTAINS A ComingSoonBadge": a surface may legitimately render the
 * flag, hide the row, change a label, or (like the page itself) return a different body. What
 * they cannot do is decide on their own. Keying on the SWITCH catches all four shapes and
 * survives any of them being rewritten — keying on the badge would pass a surface that renders
 * the badge unconditionally and then keeps rendering it after the programme opens.
 *
 * ⭐ §3 IS THE ONE THAT MATTERS MOST, and it is a POSITION, not a mention. The invite page's live
 * body mints a real referral CODE, a shareable LINK and a QR that encodes it. Consulting the
 * switch *after* fetching those would still print them. §3 asserts the guard sits ABOVE
 * `getPlayerReferralSummary` in the file, which is the only arrangement that cannot leak a code.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
// ⛔ ONE HOME FOR COMMENT-STRIPPING — see the note below where it is used.
import { decomment } from "./lib/decomment.mts";

/** `KP_SRC` re-aims the gate at a scratch tree, so a RED harness never mutates `src/`. */
const SRC = (process.env.KP_SRC ?? "src").replace(/\\/g, "/").replace(/\/$/, "");

/**
 * NOT player-facing entry points, each with the reason it is out of scope. ⛔ These are exempt
 * from §2 only; none of them is exempt from being correct.
 *
 * 📌 `chat/send-message.ts` — an AI answer's CITATION href. It sends the reader to the page,
 *    which §3 already guarantees renders the coming-soon state. Making the chat repeat the flag
 *    would be a second place the copy lives.
 * 📌 `server/email.ts` and `server/notification-service.ts` — TRANSACTIONAL messages that fire on
 *    a referral EVENT ("someone you invited just joined"). No such event can occur while the
 *    programme is closed, so these are dormant rather than wrong. ⚠️ They are listed rather than
 *    pattern-excluded so that whoever opens the programme sees them and checks their copy.
 * 📌 `admin/affiliate/actions.ts` — a `revalidatePath("/profile/invite")` after an operator edits
 *    the affiliate config. A CACHE INVALIDATION is not a link: it names the route to re-render,
 *    and it must keep naming it whether the programme is open or closed. ⭐ Found by this guard
 *    on its first run, over a file the hand sweep had filtered out as "admin" — which is exactly
 *    the difference between a rule and a recollection.
 */
const NOT_ENTRY_POINTS = new Set<string>([
  "src/lib/chat/send-message.ts",
  "src/lib/server/email.ts",
  "src/lib/server/notification-service.ts",
  "src/app/admin/affiliate/actions.ts",
]);

let pass = 0; const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e)) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}

/* Comments are blanked so a note ABOUT a link is never read as a link.
   ⛔ THIS FILE SHIPPED A PRIVATE FOUR-LINE STRIPPER AND `test:decomment` §2.1 CAUGHT IT — in the
   same run that caught the identical thing in `chip-contract.test.mts`, and after this file's
   own author had just fixed that one. ⭐ That is the ratchet earning its place: the rule is
   obvious, the violation is convenient, and the guard is the only thing that notices. One home:
   `scripts/lib/decomment.mts`. */

const files = walk(SRC).map((p) => `src/${p.slice(SRC.length + 1)}`);
const read = (rel: string) => readFileSync(`${SRC}/${rel.slice(4)}`, "utf8");

console.log(`\n── ${files.length} source files scanned under ${SRC} ──\n`);

/* ── §0 · CONTROL. A scan that reached nothing reports "0 offenders" in the same words as a
   clean sweep. Every section below is meaningless without this line. */
console.log("§0 · control — the probe reached a real tree");
ok("0.1 the walk read a plausible source tree", files.length > 300, `${files.length} files`);

/* ── §1 · ONE SWITCH. */
console.log("\n§1 · the switch has exactly one definition site");
const declarers = files.filter((f) => /^\s*export const INVITE_STATE\b/m.test(decomment(read(f))));
ok("1.1 ⭐ exactly ONE file declares INVITE_STATE (§0a: one fact, one home)",
   declarers.length === 1, declarers.length ? declarers.join(", ") : "NONE — the switch is gone");
ok("1.2 …and it is src/lib/invite-feature.ts",
   declarers[0] === "src/lib/invite-feature.ts", declarers[0] ?? "none");

/* ── §2 · COVERAGE. Every player-facing surface that links to the page consults the switch. */
console.log("\n§2 · every entry point consults the switch");
const linkers = files.filter((f) => decomment(read(f)).includes('"/profile/invite"'));
ok("2.0 the population is non-empty (a rule over zero surfaces proves nothing)",
   linkers.length >= 4, `${linkers.length} file(s) link to /profile/invite`);

/**
 * ⛔ §2.1 JUDGES A POSITION, NOT A FILE-LEVEL MENTION — AND THE RED PROOF IS WHY.
 *
 * The first version of this rule asked "does this file reference `inviteIsLive`?". It passed
 * over BOTH realistic mutations: severing the wallet card's `!inviteIsLive() &&` and deleting
 * the top bar's `comingSoon:` left the file's IMPORT untouched, so the mention was still there
 * and the gate stayed green while the surface had gone silently live. That is the same defect
 * `test:labels` §3 shipped — **a guard that reads the source's vocabulary cannot see a defect
 * that leaves the vocabulary in place.**
 *
 * So each `/profile/invite` link must carry a switch marker WITHIN ITS OWN NEIGHBOURHOOD (±8
 * lines — measured against the five real call sites, the widest of which is the wallet card's
 * badge five lines under its `<Link>`). Two conditions together, and the file-level check stays
 * as the second: a file must consult the switch AND every link must sit beside the consultation.
 *
 * ⚠️ `ComingSoonBadge` IS DELIBERATELY NOT A MARKER. A surface that renders the badge
 * unconditionally satisfies "shows coming soon" today and keeps showing it forever after the
 * programme opens — the failure this rule exists to prevent, wearing the costume of the fix.
 * The markers are the SWITCH (`inviteIsLive` / `INVITE_STATE`), the prop that carries its result
 * (`comingSoon`), and the row flag that routes to it (`invite:` in a menu-row record).
 */
const MARKER = /inviteIsLive|INVITE_STATE|comingSoon|(^|[^a-zA-Z])invite\s*:/;
const WINDOW = 8;
const uncovered: string[] = [];
for (const f of linkers) {
  if (NOT_ENTRY_POINTS.has(f)) continue;
  const lines = decomment(read(f)).split("\n");
  const consultsSomewhere = /inviteIsLive|INVITE_STATE/.test(lines.join("\n"));
  lines.forEach((line, i) => {
    if (!line.includes('"/profile/invite"')) return;
    const near = lines.slice(Math.max(0, i - WINDOW), i + WINDOW + 1).join("\n");
    if (!MARKER.test(near) || !consultsSomewhere) uncovered.push(`${f}:${i + 1}`);
  });
}
ok("2.1 ⭐ every /profile/invite link sits WITHIN 8 lines of the switch being consulted (not merely in a file that imports it)",
   uncovered.length === 0, uncovered.join(" · "));

// ⛔ A stale exemption is how a coverage rule quietly stops covering: the file drops the link,
// the entry stays, and the next uncovered surface hides behind it.
const staleExempt = [...NOT_ENTRY_POINTS].filter((f) => !linkers.includes(f));
ok("2.2 the exemption list holds nothing stale", staleExempt.length === 0, staleExempt.join(", "));

/* ── §3 · THE PAGE GUARDS BEFORE IT READS. */
console.log("\n§3 · the page returns before minting a referral code");
{
  const PAGE = "src/app/profile/invite/page.tsx";
  const body = decomment(read(PAGE));
  const guardAt = body.search(/\binviteIsLive\s*\(/);
  const readAt = body.search(/\bgetPlayerReferralSummary\s*\(/);
  ok("3.1 the page consults the switch at all", guardAt >= 0, "no inviteIsLive() in the page");
  ok("3.2 the page still has a live body to guard (the read exists)", readAt >= 0,
     "no getPlayerReferralSummary — the premise is gone, so 3.3 would pass vacuously");
  ok("3.3 ⭐ the switch is consulted BEFORE the referral summary is fetched — a code is never minted while closed",
     guardAt >= 0 && readAt >= 0 && guardAt < readAt,
     `inviteIsLive at ${guardAt}, getPlayerReferralSummary at ${readAt}`);
}

/* ── §4 · THE WORDS EXIST IN EVERY LOCALE. A missing key renders `undefined` on a live surface,
   and §L4's whole point is that SW and ZH are not afterthoughts. */
console.log("\n§4 · all three locales carry the coming-soon copy");
{
  const dict = readFileSync(`${SRC}/lib/i18n-dict.ts`, "utf8");
  for (const key of ["inviteComingSoonTag", "inviteComingSoonTitle", "inviteComingSoonBody"]) {
    const n = dict.split(`${key}:`).length - 1;
    ok(`4.${key} · declared in all three locale blocks (EN/SW/ZH)`, n === 3, `found ${n}, want 3`);
  }
}

console.log(`\n  (not entry points, exempt with reasons: ${[...NOT_ENTRY_POINTS].join(", ")})`);
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
