/**
 * C5 · RED HARNESS — the refusals that explained nothing, and the ways of over-explaining.
 *
 *   node scripts/failure-reasons-red.mjs      (npm run red:failure-reasons)
 *
 * ⭐ MUTATION 1 IS THE SHIPPED SOURCE AT d175cd01, VERBATIM: the stake-bounds refusal with
 * no `reason` and no `detail`. Against it, `docs/RULES.md` §2.3 is unmet on BOTH products —
 * a poll player who typed 999 read "That didn't go through" and an Up & Down player read
 * "The bet was refused — check the amount and your balance". Neither named the minimum,
 * although the SERVER's own sentence did.
 *
 * ⭐ MUTATION 4 IS THE DEFECT ONLY READING THE OUTPUT FOUND. `String.replace` with a STRING
 * pattern substitutes the FIRST occurrence only, and the copy uses `{min}` twice — so the
 * sentence rendered "Minimum bet is TZS 1,000. Enter {min} or more and try again.", with a
 * literal placeholder in front of the player. Every "does it name the minimum" assertion was
 * GREEN in all three languages. §1.5b and §2.render are what see it.
 *
 * ⚠️ MUTATIONS 6 AND 7 ARE THE OPPOSITE FAILURE — a refusal that is louder than it should
 * be. A fixable problem shown as a red error, or a gold toast on a money refusal, are both
 * regressions, and a suite that only checks "a sentence appeared" is green on them.
 *
 * ⚠️ CRLF-aware, anchors re-read from disk after writing, positive control first.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const MARKET = new URL("../src/lib/server/market-service.ts", import.meta.url);
const REASONS = new URL("../src/lib/failure-reasons.ts", import.meta.url);
const DICT = new URL("../src/lib/i18n-dict.ts", import.meta.url);
const PAGE = new URL("../src/app/markets/[id]/page.tsx", import.meta.url);
// C2 second tranche · §8 pins the phrase tests to the SERVER's own wording, so the harness
// has to be able to reword a server sentence and watch the guard notice.
const KYC = new URL("../src/lib/server/kyc-service.ts", import.meta.url);
const COPY = new URL("../src/lib/error-copy.ts", import.meta.url);
// C2 third tranche · the BANNER channel.
const BANNER = new URL("../src/lib/failure-banner.ts", import.meta.url);
const RG_PAGE = new URL("../src/app/profile/responsible-gambling/page.tsx", import.meta.url);

// 🔴 THE SNAPSHOT IS LAZY, AND IT HAS TO BE — 2026-08-15.
//
// This was a HARD-CODED LIST OF SIX FILES, and `restore()` rewrote exactly those six. Add a
// mutation against a seventh file and the harness would write it, never restore it, and then
// print **"tree restored"** and exit 0. That is what happened the first time the two banner
// mutations below were run: both defects were left ON DISK in a green tree, and a commit at
// that moment would have shipped a compliance surface rendering `{sp.error}` again plus a
// `bannerFor` that no longer validates the query string.
//
// ⛔ A restore list maintained by hand beside a mutation list is a second definition of the
// same fact — `docs/RULES.md` §7's "a number written twice" applied to file paths. Snapshot on
// first touch instead, so the set restored is BY CONSTRUCTION the set mutated.
const originals = new Map();
const snapshot = (f) => { if (!originals.has(f)) originals.set(f, readFileSync(f, "utf8")); };
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try { execSync("npx tsx scripts/failure-reasons.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
  catch { return true; }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const MUTATIONS = [
  {
    name: "bounds-refusal-carries-no-reason",
    why: "⭐ THE SHIPPED SOURCE — the stake-bounds refusal with no reason and no detail. RULES.md §2.3 is unmet on BOTH products: the server names the minimum and neither surface shows it",
    file: MARKET,
    from: `      reason: !Number.isInteger(opts.stake) ? "stake_not_whole" : opts.stake < minStake ? "stake_below_min" : "stake_above_max",\n      detail: { min: minStake, max: maxStake },`,
    to: `      // no reason`,
  },
  {
    name: "bounds-refusal-carries-a-reason-but-no-figures",
    why: "the reason is there and the FIGURES are not, so the copy interpolates a literal dash — the modern form of a message that does not name the minimum",
    file: MARKET,
    from: `      detail: { min: minStake, max: maxStake },`,
    to: `      detail: {},`,
  },
  {
    name: "always-the-below-min-reason",
    why: "⚠️ the reason stops branching, so an OVER-max stake is refused with the MINIMUM's sentence — a right-shaped message about the wrong bound",
    file: MARKET,
    from: `      reason: !Number.isInteger(opts.stake) ? "stake_not_whole" : opts.stake < minStake ? "stake_below_min" : "stake_above_max",`,
    to: `      reason: "stake_below_min" as const,`,
  },
  {
    name: "first-occurrence-only-substitution",
    why: "⭐ THE DEFECT ONLY READING THE OUTPUT FOUND — String.replace on a STRING pattern fills the FIRST {min} and leaves the second as a literal placeholder in front of the player. Every 'names the minimum' assertion stays GREEN",
    file: REASONS,
    from: `  const body = template.replace(/\\{(\\w+)\\}/g, (whole, key: string) =>\n    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : whole);`,
    to: `  const body = Object.entries(values).reduce((acc, [k, v]) => acc.replace(\`{\${k}}\`, v), template);`,
  },
  {
    name: "renderer-falls-back-to-the-server-string",
    why: "the unreasoned case renders `r.error` — English audit prose as a headline, which is how a Swahili or Chinese player got an English sentence at the moment their money was refused",
    file: REASONS,
    from: `    return { severity: "warning", channel: "toast", body: fallback, reason: null };`,
    to: `    return { severity: "warning", channel: "toast", body: (r as { error?: string })?.error || fallback, reason: null };`,
  },
  {
    name: "a-fixable-problem-becomes-an-error",
    why: "⚠️ THE OPPOSITE FAILURE — a stake below the minimum is rendered as a red ERROR. The player can fix it in two seconds; shouting at them for it is a regression a 'a sentence appeared' check cannot see",
    file: REASONS,
    from: `  stake_below_min:      { severity: "warning", channel: "inline", key: "failStakeBelowMin", needs: ["min"] },`,
    to: `  stake_below_min:      { severity: "error", channel: "modal", key: "failStakeBelowMin", needs: ["min"] },`,
  },
  {
    name: "busy-and-broken-say-the-same-thing",
    why: "⭐ C4 RESTORED — an unexpected throw claims the stake did not move, which nobody checked. A genuine server crash reads to the player as ordinary load",
    file: DICT,
    from: `      failSystemError: "Something went wrong at our end. Check your wallet before retrying — if the bet is there, it went through.",`,
    to: `      failSystemError: "We’re busy right now. Your stake has NOT moved — try again in a moment.",`,
  },
  {
    name: "max-stake-copy-implies-a-cap-on-total-exposure",
    why: "⚠️ the sentence drops 'you can place more than one bet' — docs/RULES.md §1 records that no surface may state the maximum in words implying it bounds TOTAL exposure on a market",
    file: DICT,
    from: `      failStakeAboveMax: "Maximum for a single bet is {max}. You can place more than one bet on this market.",`,
    to: `      failStakeAboveMax: "Maximum stake on this market is {max}.",`,
  },
  {
    name: "a-reason-loses-its-copy",
    why: "a reason ships with no dictionary entry — the guard must fail the BUILD rather than let a blank screen reach a player",
    file: DICT,
    from: `      failCashoutValueZero: "There’s nothing on the other side yet, so this bet has no sell value.",`,
    to: `      // copy removed`,
  },
  {
    name: "bonus-warning-shown-to-everyone-who-hedges",
    why: "⚠️ B2 · the warning loses its grant gate, so every player taking the other side is told their bonus will not advance — most of them have no bonus. A warning shown to people it does not apply to is noise, and noise is how a real warning stops being read",
    file: PAGE,
    from: "      if (b.activeCount > 0 && b.activeWagerRemainingTzs > 0) {",
    to: "      if (true) {",
  },
  {
    name: "bonus-warning-loses-the-figure",
    why: "⭐ B2 · the {remaining} detail goes, so the sentence tells a player only one side counts toward \"—\". The rule the copy exists to explain is the AMOUNT they still owe",
    file: PAGE,
    from: "          { ok: false, error: \"\", reason: \"bonus_wagering_one_side\", detail: { remaining: b.activeWagerRemainingTzs } },",
    to: "          { ok: false, error: \"\", reason: \"bonus_wagering_one_side\" },",
  },

  // ── C2 SECOND TRANCHE · §8 and §9 ────────────────────────────────────────
  {
    // 🔴 THE DEFECT §8 EXISTS FOR, AND IT IS SILENT. Reword one server sentence and the
    // phrase test stops matching: nothing throws, nothing logs, the refusal simply falls
    // through to "That didn't go through" and the player is no longer told what to do.
    // `docs/FAILURE-INVENTORY.md` §1.6 calls this "the single largest risk any new mapper
    // inherits" — and until now literally nothing in the tree would have noticed.
    // ⭐ RE-POINTED 2026-08-15. This used to reword the KYC sentence and expect §8 to notice
    // the phrase test had stopped matching. That defect is now STRUCTURALLY IMPOSSIBLE for this
    // family: `kyc-service.ts` emits `reason: "id_taken"`, the phrase test is deleted, and the
    // sentence can be reworded — or translated — with no effect on what the player reads. The
    // risk did not vanish though, it MOVED: the new silent failure is the service dropping the
    // reason. That is what this mutation models now, and §8c is what catches it.
    name: "service-stops-saying-why",
    why: "🔴 §1.6's risk, relocated: kyc-service stops emitting `id_taken`, so the one-document-one-account block falls through to the generic line and nothing goes red — the deleted phrase test is no longer there to catch it",
    file: KYC,
    // ⚠️ BOTH SITES, for the same reason the reworded version needed `all` — the reason is
    // returned from TWO places, and mutating one would leave the other satisfying §8c.
    all: true,
    from: ', code: "INVALID", reason: "id_taken" }',
    to: ', code: "INVALID" }',
  },
  {
    // ⭐ THE MUTATION THAT REPLACED `phrase-test-drifts-from-the-server` (2026-08-15).
    //
    // ⛔ THAT CASE MUTATED THE LAST SURVIVING PHRASE TEST — `/loss limit/i` in `error-copy.ts`
    // — and it went with the test itself when `buyPosition`'s `reason: "loss_limit_daily"`
    // made prose recovery dead code. Deleting a mutation without replacing it silently drops
    // a whole refusal family out of RED coverage, which is §3.9's lesson in a different key.
    //
    // ⚠️ AND IT MISFIRED ONCE BEFORE IT WAS REPLACED, WHICH IS WORTH THE LINE. The commit that
    // deleted the phrase test quoted the deleted `if (…)` inside the explanatory comment above
    // it. The anchor therefore still resolved — UNIQUELY, so `red-anchor.mjs` was satisfied —
    // and the harness mutated a COMMENT, changed nothing, and reported the guard as having
    // missed. A harness anchored on source text cannot tell code from prose about code.
    //
    // The new risk this pins is the one §8c names: the SERVICE quietly stops saying why. The
    // daily-loss cap is the only refusal on the betting path routed to an acknowledge-modal by
    // LCCP informed consent, so losing its reason demotes a compliance dialog to a toast.
    name: "loss-limit-service-stops-saying-why",
    why: "⭐ RULES.md §2.9's last ⏳, in reverse — `buyPosition` drops `loss_limit_daily`, so the RG daily-loss cap falls to the generic line and the LCCP acknowledge-modal quietly becomes a toast",
    file: MARKET,
    from: `code: "INVALID" as const, reason: "loss_limit_daily" as const`,
    to: `code: "INVALID" as const`,
  },
  {
    // 🔴 THE CHANNEL NOBODY WAS SCANNING, PROVEN. A page reverts to rendering the query string
    // as text. Before 2026-08-15 this scored as a MISS by both guards: §10's pattern matches an
    // object property and could not see JSX text at all.
    name: "banner-renders-the-server-string-again",
    why: "🔴 a compliance surface goes back to printing whatever `?error=` says — English prose to a SW/ZH player, and any sentence an attacker puts in a link",
    file: RG_PAGE,
    from: "<Callout tone={banner.tone} live>{banner.body}</Callout>",
    to: "<Callout tone=\"danger\" live>{sp.error}</Callout>",
  },
  {
    // ⛔ THE REFLECTION GUARD. If `bannerFor` stops validating, an unrecognised `?reason=`
    // renders through the generic fallback and the query string is a content-injection surface
    // on a signed-in money page again.
    name: "banner-stops-validating-the-query-string",
    why: "⛔ `bannerFor` renders an unknown `?reason=` instead of returning null — a styled, first-party alert box saying anything an attacker chose",
    file: BANNER,
    from: "if (!hasReason({ reason: key })) return null;",
    to: "if (!key) return null;",
  },
  {
    // ⛔ OVER-CORRECTION. Mapping an OVERLOADED code picks ONE meaning for a token that has
    // four — precisely the mistranslation the registry retires ("Wallet unavailable." reading
    // as an empty balance). §9's control is the only thing that says no.
    name: "overloaded-code-mapped",
    why: "⛔ INVALID is mapped to a single reason, so bad input, RG limits, source-of-funds and four KYC families all render as the same sentence",
    file: REASONS,
    // ⚠️ The `to` REPLACES the anchor rather than wrapping it — the harness verifies the
    // anchor is gone after the write, so a mutation whose replacement contains its own anchor
    // scores as a harness error rather than as a red.
    // ⚠️ RE-ANCHORED 2026-08-15: this pointed at `MAINTENANCE: "maintenance",`, one of the six
    // rows deleted for mapping a code no service emits. `VOTING_CLOSED` is a row with a real
    // emitter, so it cannot go the same way without §9b failing first.
    from: "  VOTING_CLOSED: \"voting_closed\",",
    to: "  INVALID: \"stake_below_min\",",
  },
  {
    // ⭐ THE DEAD-ROW DEFECT, RE-INJECTED. `REASON_BY_CODE` carried six rows for codes NO
    // service emitted — five KYC families and `MAINTENANCE`. §9 proved each of them "worked"
    // by synthesising the code itself, so the suite was green on six routes the product cannot
    // take, and a session reading that table concluded those refusals were handled while every
    // one was arriving through a phrase test. §9b is the only thing that says no.
    name: "a-dead-code-row-returns",
    why: "⛔ a row is added for a code nothing emits — §9 would prove it 'works' by minting the code itself, which is how five KYC families looked handled while they were not",
    file: REASONS,
    // ⚠️ The anchor CARRIES ITS NEWLINE, and that is not cosmetic: the harness verifies the
    // anchor is gone after the write, so a `to` that merely prepends to its own `from` scores
    // as a harness error rather than as a red. Appending on the same line consumes it.
    from: "  VOTING_CLOSED: \"voting_closed\",\n",
    to: "  VOTING_CLOSED: \"voting_closed\", DOC_IMAGE: \"doc_image_type\",\n",
  },
  {
    // ⚠️ A severity is a promise about how alarmed to be. An identity already linked to
    // another account is a fraud-shaped fact, not a typo to fix in place.
    name: "id-taken-demoted-to-a-nudge",
    why: "the National-ID-already-linked block is demoted from an error modal to a quiet inline warning",
    file: REASONS,
    from: "  id_taken:             { severity: \"error\",   channel: \"modal\",  key: \"errIdTaken\" },",
    to: "  id_taken:             { severity: \"info\",    channel: \"inline\", key: \"errIdTaken\" },",
  },
  {
    // ⚠️ The code must never outrank an explicit reason, or a service taught to emit its own
    // reason would be silently overridden by its legacy code.
    name: "code-outranks-an-explicit-reason",
    why: "the code is consulted BEFORE the reason, so a service that learned to say why is ignored",
    file: REASONS,
    from: "  const reason: FailureReason | null = hasReason(r) ? r.reason : reasonForCode(r?.code);",
    to: "  const reason: FailureReason | null = reasonForCode(r?.code) ?? (hasReason(r) ? r.reason : null);",
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  // ⛔ BEFORE THE FIRST BYTE IS WRITTEN. `restore()` has just put every previously-touched file
  // back, so what is read here is the pristine content — snapshot it now and this file is in
  // the restore set for the rest of the run, whether or not anyone remembered to list it.
  snapshot(m.file);
  const src = readFileSync(m.file, "utf8");
  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) { problems.push(`${m.name} — HARNESS ERROR: anchor not found`); continue; }

  // ⚠️ `all: true` for a sentence the server returns from MORE THAN ONE site. Rewording only
  // the first leaves the phrase test still matching the second, and the harness would then
  // score its own half-mutation as a guard that missed. `kyc-service` returns the
  // National-ID-already-linked sentence from two places.
  const replacement = anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to;
  writeFileSync(m.file, m.all ? src.split(anchor).join(replacement) : src.replace(anchor, replacement));
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`); continue;
  }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
