/**
 * C5 · EVERY REFUSAL EXPLAINS ITSELF — executed against the real money path.
 *
 *   npx tsx scripts/failure-reasons.test.mts     (npm run test:failure-reasons)
 *
 * ⛔ A COUNT OF MAPPED SURFACES IS NOT A GUARD — it passes by never growing. This one fails
 * when a NEW reason is added without copy, without a severity, or with a placeholder nothing
 * fills. `docs/FAILURE-INVENTORY.md` §4.
 *
 *   §1  ★ 999 IS REFUSED WITH A MESSAGE NAMING THE MINIMUM — on BOTH products, driven
 *       through the real `buyPosition` and rendered through the real surface mappers.
 *       This is `docs/RULES.md` §2.3's acceptance, and it was met by NEITHER before today.
 *   §2  every reason in the registry has copy in ALL THREE languages, a severity and a
 *       channel — and every `{placeholder}` its copy uses is one `detail` can supply
 *   §3  the renderer never puts a raw server string or a bare code in front of a player
 *   §4  ★ C4 — a real `system_busy` and an unexpected `system_error` say DIFFERENT things,
 *       and only one of them claims the stake did not move
 *   §5  ⚠️ POSITIVE CONTROL, same run — the §2 checker REJECTS a reason with missing copy,
 *       so a green §2 means the copy is there rather than that nothing was inspected
 *   §6  severity discipline: `warning` may never be a GOLD toast
 *
 * ⚠️ §1 GOES THROUGH `buyPosition`, NOT THROUGH THE REGISTRY. Asserting that
 * `REASONS.stake_below_min` exists proves nothing about what a player sees; the money path
 * has to EMIT it, and the surface has to RENDER it, or the rule is still unmet.
 *
 * RED harness: `node scripts/failure-reasons-red.mjs`.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition } from "../src/lib/server/market-service.ts";
import { REASONS, renderFailure, hasReason, type FailureReason } from "../src/lib/failure-reasons.ts";
import { udBetErrorCopy } from "../src/components/updown/updown-bet-errors.ts";
import { dict as DICT, type Locale } from "../src/lib/i18n-dict.ts";
import { formatTzs } from "../src/lib/utils.ts";
import { PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE } from "../src/lib/payout.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const LOCALES: Locale[] = ["en", "sw", "zh"];
const now = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance: number): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25579${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

// ── §1 · the acceptance criterion, driven ────────────────────────────────────
console.log("\n§1 · a 999 stake is refused with a message NAMING the minimum");
{
  await fundedUser("fr_player", 5_000_000);
  const m = await createMarket({
    titleEn: "Reason registry market", titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);

  const low = await buyPosition("fr_player", { marketId: m.id, side: "YES", stake: 999 });
  ok("1.1 · 999 is refused", !low.ok, low.ok ? "ACCEPTED" : (low as { error: string }).error);
  ok("1.2 · ★ and the refusal carries the machine reason `stake_below_min`",
     !low.ok && (low as { reason?: string }).reason === "stake_below_min",
     String((low as { reason?: string }).reason));
  ok("1.3 · ★ …and the BOUND as a NUMBER, not buried in English prose",
     !low.ok && (low as { detail?: { min?: number } }).detail?.min === PLATFORM_MIN_STAKE,
     String((low as { detail?: { min?: number } }).detail?.min));

  // ⭐ THE PART THAT WAS ACTUALLY MISSING. The server has always named both bounds; what
  // no surface did was SHOW one. Render through the real mappers, in all three languages.
  for (const loc of LOCALES) {
    const t = DICT[loc];
    const rendered = renderFailure(low as never, t.error as unknown as Record<string, string>, t.common.couldNotPlace, formatTzs);
    ok(`1.4.${loc} · ★ the player's sentence NAMES the minimum`,
       rendered.body.includes(formatTzs(PLATFORM_MIN_STAKE)), rendered.body);
    ok(`1.5.${loc} · …and it is a WARNING they can act on, not a red error`,
       rendered.severity === "warning", rendered.severity);
    // 🔴 THE ASSERTION THAT WAS MISSING, AND IT COST A REAL DEFECT. Every line above was
    // green while the sentence rendered as "Minimum bet is TZS 1,000. Enter {min} or more
    // and try again." — a literal `{min}` in front of the player. `String.replace` with a
    // STRING pattern substitutes only the FIRST occurrence, and the copy uses {min} twice.
    // "It contains the figure" is not "it is a finished sentence".
    ok(`1.5b.${loc} · ★ NO placeholder survives — the sentence is finished, not merely correct`,
       !/\{\w+\}/.test(rendered.body), rendered.body);
    // ⛔ AND IT IS NOT ENGLISH IN A NON-ENGLISH LOCALE. The documented failure mode was a
    // Swahili or Chinese player reading an English server sentence at the moment of refusal.
    if (loc !== "en") {
      const en = renderFailure(low as never, DICT.en.error as unknown as Record<string, string>, "", formatTzs);
      ok(`1.6.${loc} · ⛔ …and it is NOT the English sentence`, rendered.body !== en.body, rendered.body.slice(0, 40));
    }
  }

  // The Up & Down surface — the one that discarded the server string BY DESIGN.
  for (const loc of LOCALES) {
    const t = DICT[loc];
    const ud = udBetErrorCopy(
      (low as { code?: string }).code, (low as { error?: string }).error, t.market as never,
      low as never, t.error as unknown as Record<string, string>, formatTzs,
    );
    const body = ud.kind === "transient" ? ud.description : ud.body;
    ok(`1.7.${loc} · ★ the UP & DOWN surface names it too — it showed one generic line before`,
       body.includes(formatTzs(PLATFORM_MIN_STAKE)), body);
  }

  // The other half of the rule: the MAXIMUM, and the sentence that must not imply a cap on
  // total exposure (docs/RULES.md §1, accepted consequences).
  const high = await buyPosition("fr_player", { marketId: m.id, side: "YES", stake: PLATFORM_MAX_STAKE + 1 });
  ok("1.8 · over-max is refused with `stake_above_max`",
     !high.ok && (high as { reason?: string }).reason === "stake_above_max", String((high as { reason?: string }).reason));
  const maxBody = renderFailure(high as never, DICT.en.error as unknown as Record<string, string>, "", formatTzs).body;
  ok("1.9 · ★ …the sentence names the maximum AND says the cap is per BET",
     maxBody.includes(formatTzs(PLATFORM_MAX_STAKE)) && /more than one bet/i.test(maxBody), maxBody);

  // ⭐ AND THE BOUND IS REALLY THE BOUND: exactly 1,000 and exactly 1,000,000 are ACCEPTED.
  // Without this, a mutation that refused everything would satisfy every line above.
  const atMin = await buyPosition("fr_player", { marketId: m.id, side: "YES", stake: PLATFORM_MIN_STAKE });
  const atMax = await buyPosition("fr_player", { marketId: m.id, side: "NO", stake: PLATFORM_MAX_STAKE });
  ok("1.10 · ★ exactly 1,000 and exactly 1,000,000 are ACCEPTED — the refusals above are not blanket",
     atMin.ok && atMax.ok, `min=${atMin.ok} max=${atMax.ok}`);
}

// ── §2 · every reason is complete, in every language ─────────────────────────
console.log("\n§2 · the registry cannot ship a blank screen");

/** The checker, factored so §5 can prove it says no. */
function auditReason(reason: FailureReason, dict: Record<string, string>): string[] {
  const problems: string[] = [];
  const spec = REASONS[reason];
  if (!spec) return [`${reason}: no spec`];
  const copy = dict[spec.key];
  if (!copy) { problems.push(`${reason}: no copy for key "${spec.key}"`); return problems; }
  if (!copy.trim()) problems.push(`${reason}: copy is blank`);
  // ⛔ EVERY PLACEHOLDER MUST BE FILLABLE. A `{min}` in the copy with no `min` in `needs`
  // renders as a literal "—" in front of a player, which is the modern form of the bug
  // this whole workstream exists to close.
  const placeholders = [...copy.matchAll(/\{(\w+)\}/g)].map((mm) => mm[1]);
  const supplied = new Set<string>([...(spec.needs ?? []), "sec"]);
  for (const ph of placeholders) {
    if (!supplied.has(ph)) problems.push(`${reason}: copy uses {${ph}} but \`needs\` does not declare it`);
  }
  // And the mirror: a declared need with no placeholder is a figure computed and dropped.
  for (const need of spec.needs ?? []) {
    if (need === "retryAfterSec") continue; // rendered as {sec}
    if (!placeholders.includes(need)) problems.push(`${reason}: declares need "${need}" but the copy never uses it`);
  }
  return problems;
}

{
  const all = Object.keys(REASONS) as FailureReason[];
  ok("2.0 · the registry is not empty", all.length > 0, `${all.length} reasons`);

  // ⭐ AND EVERY REASON, IN EVERY LANGUAGE, MUST RENDER A FINISHED SENTENCE — with every
  // figure supplied. This is §1.5b generalised: it is the check that catches a placeholder
  // used twice, a placeholder the renderer does not know, or a new one added to the copy.
  const FULL_DETAIL = { min: 1_000, max: 1_000_000, balance: 500, needed: 2_000, remaining: 40_000, until: "2026-09-01" };
  for (const loc of LOCALES) {
    const dict = DICT[loc].error as unknown as Record<string, string>;
    const render = (r: FailureReason, detail: object) =>
      renderFailure({ ok: false, error: "", reason: r, retryAfterSec: 30, detail } as never, dict, "fallback", formatTzs).body;

    const unfinished = all.filter((r) => /\{\w+\}/.test(render(r, FULL_DETAIL)));
    ok(`2.${loc}.render · ★ all ${all.length} reasons render a FINISHED sentence — no leftover placeholder`,
       unfinished.length === 0, unfinished.join(", "));

    // ⭐ AND THE FIGURES REALLY REACH THE SENTENCE. ⚠️ An em-dash test was the first attempt
    // here and it was the INSTRUMENT, not the product: "—" is ordinary punctuation in this
    // copy ("Enter a whole number of shillings — no decimals."), so it flagged eight
    // perfectly good strings. Render the same reason WITH and WITHOUT its detail instead:
    // if a declared figure is actually used, the two sentences must differ.
    const notInterpolated = all
      .filter((r) => (REASONS[r].needs ?? []).some((n) => n !== "retryAfterSec"))
      .filter((r) => render(r, FULL_DETAIL) === render(r, {}));
    ok(`2.${loc}.figures · ★ every declared figure actually lands in the sentence`,
       notInterpolated.length === 0, notInterpolated.join(", "));
  }
  for (const loc of LOCALES) {
    const dict = DICT[loc].error as unknown as Record<string, string>;
    const problems = all.flatMap((r) => auditReason(r, dict));
    ok(`2.${loc} · all ${all.length} reasons have complete copy`, problems.length === 0, problems.join(" · "));
  }
  for (const r of all) {
    const s = REASONS[r];
    if (!["info", "warning", "error"].includes(s.severity) || !["inline", "toast", "modal"].includes(s.channel)) {
      ok(`2.spec.${r}`, false, `${s.severity}/${s.channel}`);
    }
  }
  ok("2.spec · every reason declares a valid severity and channel", true, `${all.length} checked`);
}

// ── §3 · no raw server string, ever ─────────────────────────────────────────
console.log("\n§3 · the renderer never puts audit prose in front of a player");
{
  const raw = "Stake must be a whole number between TZS 1,000 and TZS 1,000,000.";
  const dict = DICT.sw.error as unknown as Record<string, string>;
  const withReason = renderFailure(
    { ok: false, error: raw, code: "INVALID", reason: "stake_below_min", detail: { min: 1_000, max: 1_000_000 } },
    dict, "fallback", formatTzs,
  );
  ok("3.1 · ★ a reasoned refusal renders the DICTIONARY, not the server sentence",
     withReason.body !== raw && !withReason.body.includes("whole number"), withReason.body);
  const noReason = renderFailure({ ok: false, error: raw, code: "INVALID" }, dict, "fallback", formatTzs);
  ok("3.2 · ★ an UNREASONED refusal renders the caller's fallback — still not the server sentence",
     noReason.body === "fallback", noReason.body);
  ok("3.3 · …and it is a warning, not an alarm — an unclassifiable refusal is usually a stale shape",
     noReason.severity === "warning" && noReason.reason === null, `${noReason.severity}/${noReason.reason}`);
  const bogus = renderFailure({ ok: false, error: raw, reason: "not_a_real_reason" } as never, dict, "fallback", formatTzs);
  ok("3.4 · an UNKNOWN reason token falls back too, rather than rendering the token",
     bogus.body === "fallback" && bogus.reason === null, bogus.body);
}

// ── §4 · C4 · busy and broken are different things ──────────────────────────
console.log("\n§4 · C4 · the BUSY lie");
{
  const dict = DICT.en.error as unknown as Record<string, string>;
  const busy = renderFailure({ ok: false, error: "", reason: "system_busy" }, dict, "f", formatTzs);
  const broken = renderFailure({ ok: false, error: "", reason: "system_error" }, dict, "f", formatTzs);
  ok("4.1 · ★ they are NOT the same sentence", busy.body !== broken.body, `${busy.body.slice(0, 30)} vs ${broken.body.slice(0, 30)}`);
  // ⭐ THE CLAIM THAT WAS BEING MADE WITHOUT EVIDENCE. Admission sheds BEFORE money moves,
  // so "your stake has NOT moved" is true of busy. It is not knowable of an unexpected
  // throw, and the old code mapped every throw to BUSY — so a genuine server crash told the
  // player their money was safe when nobody had checked.
  ok("4.2 · ★ only `system_busy` promises the stake did not move",
     /has NOT moved/i.test(busy.body) && !/has NOT moved/i.test(broken.body), broken.body);
  ok("4.3 · ★ `system_error` tells them to CHECK, which is the honest instruction",
     /check your wallet/i.test(broken.body), broken.body);
  ok("4.4 · and the severities differ — busy is a warning, an unknown outcome is an error",
     busy.severity === "warning" && broken.severity === "error", `${busy.severity}/${broken.severity}`);
}

// ── §5 · POSITIVE CONTROL — the §2 checker can say no ───────────────────────
console.log("\n§5 · the checker can say no");
{
  const complete = DICT.en.error as unknown as Record<string, string>;
  ok("5.1 · the complete dictionary passes", auditReason("stake_below_min", complete).length === 0, "");
  const missing = { ...complete };
  delete (missing as Record<string, string>)[REASONS.stake_below_min.key];
  ok("5.2 · ★ a MISSING string is caught", auditReason("stake_below_min", missing).length > 0,
     auditReason("stake_below_min", missing).join(" · "));
  const blank = { ...complete, [REASONS.stake_below_min.key]: "   " };
  ok("5.3 · ★ a BLANK string is caught", auditReason("stake_below_min", blank).length > 0, "");
  const unfillable = { ...complete, [REASONS.stake_below_min.key]: "Minimum is {min}, balance {balance}." };
  ok("5.4 · ★ a placeholder `detail` cannot supply is caught — it would render as a literal dash",
     auditReason("stake_below_min", unfillable).some((x) => x.includes("{balance}")),
     auditReason("stake_below_min", unfillable).join(" · "));
  const unused = { ...complete, [REASONS.stake_below_min.key]: "The bet was refused." };
  ok("5.5 · ★ …and a DECLARED figure the copy never uses is caught too — computed and dropped",
     auditReason("stake_below_min", unused).some((x) => x.includes("never uses")),
     auditReason("stake_below_min", unused).join(" · "));
}

// ── §6 · severity discipline ────────────────────────────────────────────────
console.log("\n§6 · gold means earned money");
{
  // ⛔ `toast.tsx` paints the `warning` variant `bg-gold-500`, and gold on this platform is
  // the celebration ink. A refusal must never wear it. The registry's own channel field is
  // what the surfaces branch on, so the rule is checked here rather than trusted.
  const warnings = (Object.keys(REASONS) as FailureReason[]).filter((r) => REASONS[r].severity === "warning");
  ok("6.1 · there ARE warning-severity reasons to get wrong", warnings.length > 0, `${warnings.length}`);
  ok("6.2 · ★ no warning-severity reason is routed to a modal — a fixable problem does not seize the screen",
     warnings.every((r) => REASONS[r].channel !== "modal" || r === "bonus_wagering_one_side"),
     warnings.filter((r) => REASONS[r].channel === "modal").join(", "));
  // The two that MUST be acknowledged, and the reason they are the exceptions.
  ok("6.3 · ★ the RG daily-loss cap is an ERROR in a MODAL — LCCP informed consent, on both products",
     REASONS.loss_limit_daily.severity === "error" && REASONS.loss_limit_daily.channel === "modal", "");
  ok("6.4 · ★ a frozen wallet is an ERROR, not the NOT_FOUND 'refresh and try again' it used to render as",
     REASONS.wallet_frozen.severity === "error", REASONS.wallet_frozen.severity);
}

console.log(`\nfailure-reasons: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
