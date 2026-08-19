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

import { readFileSync, readdirSync } from "node:fs";
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

// ── §7 · B2 · the bonus warning, shown before confirming ────────────────────
console.log("\n§7 · B2 · the warning a grant-holder gets before taking the other side");
{
  const dict = DICT.en.error as unknown as Record<string, string>;
  const w = renderFailure(
    { ok: false, error: "", reason: "bonus_wagering_one_side", detail: { remaining: 40_000 } },
    dict, "fallback", formatTzs,
  );
  ok("7.1 · ★ it is a WARNING, never an error — the bet still goes through if they choose",
     w.severity === "warning", w.severity);
  ok("7.2 · ★ …and it names the amount they still have to wager, as a figure",
     w.body.includes(formatTzs(40_000)), w.body);
  ok("7.3 · …and says WHY: they already hold the other side of this market",
     /other side of this market/i.test(w.body), w.body);
  // ⛔ INLINE, not a modal. It is information before a decision, not a block on one — a
  // modal would read as a refusal and this is explicitly not one (docs/RULES.md §2.5).
  ok("7.4 · ★ it renders INLINE, beside the control — a modal would read as a refusal",
     REASONS.bonus_wagering_one_side.channel === "inline", REASONS.bonus_wagering_one_side.channel);
  for (const loc of LOCALES) {
    const body = renderFailure(
      { ok: false, error: "", reason: "bonus_wagering_one_side", detail: { remaining: 40_000 } },
      DICT[loc].error as unknown as Record<string, string>, "fallback", formatTzs,
    ).body;
    ok(`7.5.${loc} · a finished sentence, with the figure`,
       !/\{\w+\}/.test(body) && body.includes(formatTzs(40_000)) && body !== "fallback", body.slice(0, 60));
  }

  // ⭐ AND THE SURFACE ONLY SHOWS IT TO SOMEONE WHO HOLDS A GRANT. The market page gates on
  // `activeCount > 0 && activeWagerRemainingTzs > 0`; asserted here as the RULE it is,
  // because production has ZERO grants and the branch is therefore unreachable live today.
  const page = readFileSync(new URL("../src/app/markets/[id]/page.tsx", import.meta.url), "utf8");
  ok("7.6 · ★ the market page gates the warning on an UNFULFILLED grant, not on merely hedging",
     /activeCount > 0 && b\.activeWagerRemainingTzs > 0/.test(page), "");
  // ⚠️ ASSERT THE CALL SITE, NOT THE SYMBOL. A first version tested that the string
  // "getBonusSummary" was ABSENT from market-service.ts — and it is present there, in the
  // COMMENT explaining why the call must not be made. The check went red over the
  // documentation of the very rule it was checking.
  const svc = readFileSync(new URL("../src/lib/server/market-service.ts", import.meta.url), "utf8");
  const callsIt = (src: string) => /(?<!\/\/[^\n]*)\bawait\s+getBonusSummary\s*\(/.test(src)
    || src.split("\n").some((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && /\bgetBonusSummary\s*\(/.test(l));
  ok("7.7 · ★ …computed on the READ path, and NOT called inside the bet transaction (P2028)",
     callsIt(page) && !callsIt(svc), `page=${callsIt(page)} market-service=${callsIt(svc)}`);
  // ⛔ AND THE PAGE MUST ACTUALLY PASS THE FIGURE. §7.2 proves the RENDERER interpolates
  // `remaining` when given it; nothing above proves the CALL SITE supplies it, and without
  // it the player is told only one side counts toward "—". ⚠️ A red here means the call was
  // renamed or reshaped: RE-ANCHOR it, never delete the assertion.
  ok("7.8 · ★ …and the page passes the remaining wagering as `detail.remaining`",
     /reason:\s*"bonus_wagering_one_side"[\s\S]{0,120}?remaining:\s*b\.activeWagerRemainingTzs/.test(page),
     "renderFailure({ … reason: \"bonus_wagering_one_side\", detail: { remaining: … } }) ?");
}


// ═══════════════════════════════════════════════════════════════════════════
// §8 · ⭐ THE PHRASE TESTS ARE PINNED TO THE STRINGS THEY MATCH
// ═══════════════════════════════════════════════════════════════════════════
// 🔴 `docs/FAILURE-INVENTORY.md` §1.5's last row and §1.6 name this as **the single largest
// risk any new mapper inherits**: `error-copy.ts` carries fifteen phrase tests matched against
// service strings that live in OTHER FILES, and *"no check anywhere asserts those strings
// still contain those phrases."* `conviction-dial.tsx` records what that already cost —
// `RATE_LIMITED` never matched because the server says "Slow down.", and "Wallet unavailable."
// matched the BALANCE branch and told the player to top up.
//
// ⛔ A REWORDING IS SILENT. Nothing throws, nothing logs; the refusal simply falls through to
// the generic line and the player stops being told what to do. That is invisible in review, in
// production logs, and in every existing suite.
//
// So each phrase test below is pinned two ways:
//   ① the pattern still matches at least one real STRING LITERAL in `src/lib/server/**`, and
//   ② feeding that literal through `errorCopy` returns the SPECIFIC line it was written for —
//      never the generic `errInvalid` / `errSuspended` fallback.
// ② is the one that matters: ① alone would pass on a match in an unrelated sentence.
console.log("\n§8 · the phrase tests still match the server's own words");
{
  const { errorCopy } = await import("../src/lib/error-copy.ts");
  const t = DICT.en;

  // ⛔ THE WHOLE SERVER TREE, WALKED — never a hand-written file list. §7 of the work order is
  // a list of times a hard-coded inventory went stale and the CHECK then reported the PRODUCT
  // as broken. The first draft of this section named eight files, THREE OF WHICH DO NOT EXIST,
  // and duly reported all fourteen phrases as "moved" on a codebase where every one of them
  // was present. Ask "is this the product, or my list?" — and then delete the list.
  // ⚠️ Comments are stripped first, so a phrase surviving only in a code comment cannot hold
  // the guard up.
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p, out);
      else if (e.name.endsWith(".ts")) out.push(p);
    }
    return out;
  };
  const files = walk("src/lib/server");
  const literals: string[] = [];
  for (const f of files) {
    const stripped = readFileSync(f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const m of stripped.matchAll(/"([^"\n]{8,400})"|`([^`\n]{8,400})`/g)) {
      const raw = m[1] ?? m[2] ?? "";
      literals.push(raw);
      // ⚠️ AND THE RUNTIME SHAPE OF A TEMPLATE LITERAL, which is what the mapper actually
      // sees. `kyc-service.ts` returns
      //     `Please upload the ${n} requested document${n > 1 ? "s" : ""} before submitting.`
      // and the phrase test /requested document(s)? before submitting/ matches the SENTENCE,
      // not the source — the `${…}` sits between "document" and " before". Comparing the
      // pattern against source text reported that branch as dead on a codebase where it works
      // perfectly. Strip the interpolations and the sentence reappears.
      if (raw.includes("${")) literals.push(raw.replace(/\$\{[^}]*\}/g, ""));
    }
  }
  ok("8.0 · fixture · the server tree was walked and read",
     files.length > 20 && literals.length > 500, `${files.length} files, ${literals.length} literals`);

  /** A phrase test, the code it lives under, and the line it must produce. */
  const PINS: Array<{ name: string; code: string; re: RegExp; expect: string }> = [
    // ⛔ `deposit limit`, `source of funds` and `smallest amount we can send` USED TO BE PINNED
    // HERE. Their services now emit a machine `reason`, the phrase tests are deleted, and §8b
    // below proves the replacement. A pin left beside its replacement is two routes to one
    // refusal — exactly what drifts apart.
    // ⛔ TWELVE PINS WERE DELETED HERE, each in the commit that gave its refusal a real reason.
    // ⭐ `loss limit` WAS THE TWELFTH, and it went on 2026-08-15 — the LAST INVALID family
    // recovered from prose, which `docs/RULES.md` §2.9 carried a ⏳ for. Its pin is replaced by
    // §8c's `loss_limit_daily` emitter pin and §8b's render assertions, and the dictionary line
    // it expected (`errLossLimit`) is deleted in all three languages rather than left as a
    // second wording for a refusal the registry already words better.
    // ⛔ What is LEFT is the honest remainder, and it is NOT an INVALID: both survivors sit under
    // `SUSPENDED`, which is deliberately unmapped because it means four different things.
    { name: "self-exclusion",       code: "SUSPENDED", re: /self-exclusion|cooling-off/i,       expect: t.error.errBreakActive },
    { name: "wallet frozen",        code: "SUSPENDED", re: /frozen/i,                           expect: t.error.errWalletFrozen },
  ];

  // ⛔ A CANDIDATE MAY NOT CONTAIN "·", AND THAT IS NOT A CONVENIENCE. `errorCopy`'s INVALID
  // branch passes any string containing "·" through UNCHANGED — deliberate bilingual EN·SW
  // gateway copy, documented in its header. The first run of this guard picked the notification
  // title "Action needed · Please re-verify your identity" as its witness for the identity
  // phrase, watched it pass straight through, and reported the mapper as broken. The decoy is
  // excluded here, and the passthrough it relies on is asserted below rather than assumed.
  for (const p of PINS) {
    const hits = literals.filter((s) => p.re.test(s) && !s.includes("·"));
    ok(`8.${p.name} · a real server string still matches`, hits.length > 0,
       hits.length ? `${hits.length} candidate(s), e.g. "${hits[0].slice(0, 58)}"`
                   : `NO server literal matches ${p.re} — the phrase moved, and the mapper is now silently generic`);
    if (hits.length) {
      const got = errorCopy(t, { code: p.code, error: hits[0] });
      ok(`8.${p.name} · …and it still maps to its OWN line, not the generic fallback`,
         got === p.expect, `got "${got.slice(0, 60)}" — expected "${p.expect.slice(0, 60)}"`);
    }
  }

  // The passthrough the exclusion above depends on — asserted, not assumed.
  const bilingual = "Payment declined by your provider · Malipo yamekataliwa na mtoa huduma wako";
  ok("8.passthrough · ⚠️ a bilingual EN·SW gateway line passes through untranslated, BY DESIGN",
     errorCopy(t, { code: "INVALID", error: bilingual }) === bilingual);

  // ⭐ THE POSITIVE CONTROL, in the same run. If a reworded string mapped to its own line
  // anyway, every assertion above would be vacuous — so prove the fallback really is reachable.
  const bogus = errorCopy(t, { code: "INVALID", error: "Something entirely reworded happened." });
  ok("8.control · ⚠️ an unrecognised INVALID string DOES fall through to the generic line",
     bogus === t.error.errInvalid, `got "${bogus.slice(0, 60)}"`);
  const bogus2 = errorCopy(t, { code: "SUSPENDED", error: "Reworded suspension sentence." });
  ok("8.control · …and so does an unrecognised SUSPENDED string",
     bogus2 === t.error.errSuspended, `got "${bogus2.slice(0, 60)}"`);

}

// ═══════════════════════════════════════════════════════════════════════════
// §8b · THE REPLACEMENT — a machine reason beats every phrase test above
// ═══════════════════════════════════════════════════════════════════════════
// ⭐ THIS SECTION IS THE OTHER HALF OF DELETING A PHRASE TEST. §8 proves the tests that REMAIN
// still match; this proves the ones that were REMOVED were replaced by something exact rather
// than simply dropped. Each case feeds `errorCopy` the shape the SERVICE now returns — reason
// plus numeric `detail` — and asserts the player's own line comes back.
//
// ⛔ AND IT ASSERTS THE FIGURES CAME FROM `detail`, NOT FROM THE PROSE. The `error` string in
// each fixture below is deliberately WRONG or empty: if any figure still leaked out of the
// sentence, these would render it and fail.
console.log("\n§8b · the reasons that replaced the deleted phrase tests");
{
  const { errorCopy } = await import("../src/lib/error-copy.ts");

  for (const [lang, t] of [["en", DICT.en], ["sw", DICT.sw], ["zh", DICT.zh]] as const) {
    // ── withdraw_below_min · the one that retired `tzsFigures` ────────────────
    const w = errorCopy(t, {
      code: "INVALID",
      // ⚠️ Prose that names DIFFERENT figures on purpose. If the mapper ever reads the sentence
      // again, 7,777 shows up in the output and this fails.
      error: "The smallest amount we can send is TZS 7,777 after the fee. Withdraw at least TZS 8,888.",
      reason: "withdraw_below_min",
      detail: { net: 1000, min: 1016 },
    });
    ok(`8b.withdraw-min.${lang} · renders its OWN line, not the generic fallback`,
       w !== t.error.somethingDidntWork && w !== t.error.errInvalid, w.slice(0, 70));
    ok(`8b.withdraw-min.${lang} · ⛔ NO placeholder survives — the {min}-twice defect`,
       !/\{\w+\}/.test(w), w.slice(0, 70));
    ok(`8b.withdraw-min.${lang} · both figures come from detail, as numbers`,
       w.includes("1,000") && w.includes("1,016"), w.slice(0, 90));
    ok(`8b.withdraw-min.${lang} · ⛔ and NOTHING was scraped out of the prose`,
       !w.includes("7,777") && !w.includes("8,888"), w.slice(0, 90));

    // ── deposit_limit / sof_required / email_unverified ───────────────────────
    for (const [reason, key] of [
      ["deposit_limit", "errDepositLimit"],
      ["sof_required", "errSofRequired"],
      ["email_unverified", "errEmailUnverified"],
      ["kyc_required", "errVerifyIdentity"],
      // ── the KYC family · every one of these was reachable ONLY through a phrase test ──
      ["id_taken", "errIdTaken"],
      ["id_not_verified", "errIdNotVerified"],
      ["id_number_format", "errIdNumberFormat"],
      ["id_expired", "errIdExpired"],
      ["id_expiry_required", "errIdExpiryRequired"],
      ["doc_image_type", "errDocImage"],
      ["doc_too_large", "errDocTooLarge"],
      ["docs_locked", "errDocsLocked"],
      ["docs_required", "errDocsRequired"],
      ["extra_docs_required", "errExtraDocsRequired"],
      ["no_extra_request", "errNoExtraRequest"],
    ] as const) {
      const got = errorCopy(t, { code: "INVALID", error: "Something entirely reworded happened.", reason });
      ok(`8b.${reason}.${lang} · the reason wins over the prose`,
         got === (t.error as unknown as Record<string, string>)[key], got.slice(0, 70));
    }
  }

  // ⭐ THE POSITIVE CONTROL. Without it, a `hasReason` that always returned false would leave
  // every assertion above passing through the OLD path — and on `en` several of them would
  // still look right. Prove an unknown reason really does fall through.
  const t = DICT.en;
  const bogus = errorCopy(t, { code: "INVALID", error: "Something entirely reworded happened.", reason: "not_a_real_reason" });
  ok("8b.control · ⚠️ an UNKNOWN reason falls through to the phrase tests, not to a blank",
     bogus === t.error.errInvalid, bogus.slice(0, 70));
  // ⛔ And the deleted phrase tests are really gone — feeding the old sentences with NO reason
  // must now reach the generic line. If any still mapped, the deletion was cosmetic.
  for (const [name, sentence] of [
    ["deposit limit", "Daily deposit limit of TZS 50,000 would be exceeded."],
    ["source of funds", "Deposits of TZS 1,000,000 or more require a Source of Funds declaration on file."],
    ["withdraw min", "The smallest amount we can send is TZS 1,000 after the fee. Withdraw at least TZS 1,016."],
    ["verify identity", "Verify your identity to withdraw."],
    ["NIDA already linked", "This National ID is already linked to another account. If this is a mistake, contact support."],
    ["doc image type", "Document must be a JPG, PNG, or WebP image."],
    ["doc too large", "Image too large. Use a photo under 3 MB."],
    ["docs locked", "Documents are locked while your submission is under review."],
    ["no extra request", "No extra documents are being requested right now."],
    ["NIDA not verified", "NIDA not yet verified."],
    ["all three documents", "All three documents required."],
    ["extra docs required", "Please upload the 2 requested documents before submitting."],
  ] as const) {
    ok(`8b.deleted · "${name}" no longer has a phrase test`,
       errorCopy(t, { code: "INVALID", error: sentence }) === t.error.errInvalid);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// §8c · THE SERVICES STILL SAY WHY — the pin that replaces the deleted phrase pins
// ═══════════════════════════════════════════════════════════════════════════
// ⭐ §8 EXISTS BECAUSE A PHRASE TEST CAN ROT SILENTLY. Deleting a phrase test does not delete
// that risk — it MOVES it. The new failure mode is not "the sentence was reworded"; it is
// **the service quietly stops emitting its reason**, at which point the refusal falls to the
// generic line and nothing anywhere goes red. §8's own header says a rewording is invisible in
// review, in production logs, and in every existing suite. So is a deleted `reason:`.
//
// ⛔ SO EACH RETIRED PHRASE TEST IS REPLACED BY A PIN ON ITS SERVICE, NOT BY NOTHING. This
// reads the service source and asserts the token is still there — the same shape as §8, which
// reads the service source and asserts the sentence is still there.
console.log("\n§8c · the services still emit the reasons that replaced the phrase tests");
{
  const EMITTERS: Array<{ file: string; reasons: string[] }> = [
    // ⭐ `nida_taken` / `nida_not_verified` became `id_taken` / `id_not_verified` on
    // 2026-08-20, when identity stopped meaning "a NIDA" and started meaning "any ONE
    // of four documents". ⛔ Leaving `nida_taken` firing for a rejected PASSPORT would
    // be a lie in the audit trail — the record a regulator asks for — so the union
    // member, the registry row, the dictionary key and this pin moved together.
    // `id_number_format` / `id_expired` / `id_expiry_required` are the three new
    // refusals that come with a document that has a rule and a document that expires.
    { file: "src/lib/server/kyc-service.ts", reasons: [
      "id_taken", "id_not_verified", "id_number_format", "id_expired", "id_expiry_required",
      "docs_required", "extra_docs_required",
      "docs_locked", "no_extra_request", "doc_image_type", "doc_too_large",
    ] },
    { file: "src/lib/server/wallet-service.ts", reasons: [
      "deposit_limit", "sof_required", "withdraw_below_min", "kyc_required",
    ] },
    // ⭐ THE ONE THAT CLOSED `docs/RULES.md` §2.9's ⏳. `checkLossLimit` has exactly ONE caller
    // — `buyPosition` — and it is the sole route by which an RG daily-loss refusal can reach a
    // player on either product. If this token goes, both surfaces fall to their generic line
    // and the LCCP acknowledge-modal silently becomes a toast.
    { file: "src/lib/server/market-service.ts", reasons: ["loss_limit_daily"] },
  ];
  for (const e of EMITTERS) {
    const src = readFileSync(e.file, "utf8");
    for (const r of e.reasons) {
      ok(`8c.${r} · ${e.file.split("/").pop()} still says why`,
         new RegExp(`reason:\\s*"${r}"`).test(src),
         `no \`reason: "${r}"\` — the refusal now falls to the generic line, silently`);
    }
  }
  // ⭐ CONTROL · the pin must be capable of failing. A reason that is NOT emitted anywhere must
  // read as absent, or every assertion above would pass on an empty file.
  const kyc = readFileSync("src/lib/server/kyc-service.ts", "utf8");
  ok("8c.control · the pin can fail — an unemitted reason reads as absent",
     !/reason:\s*"stake_below_min"/.test(kyc));

  // ⭐ 8c.loss-limit · AND THE ONE-CALLER CLAIM IS ASSERTED, NOT ASSUMED.
  // ⛔ The pin above proves `buyPosition` still says why. It does NOT prove that `buyPosition`
  // is the ONLY way to be refused by the daily-loss cap — and that is the claim the ⏳ was
  // deleted on. A second caller added tomorrow (a cash-out gate, an Up & Down pre-flight)
  // would refuse a player with no `reason` at all, fall to the generic line, and every
  // assertion above would stay green because the first caller is untouched.
  // So: walk the server tree and count the call sites. One, and it is the one that says why.
  {
    // ⛔ Its own walker: §8's lives inside §8's block. A hand-written file list here would be
    // the exact staleness §8's own header records paying for three times.
    const walkServer = (dir: string, out: string[] = []): string[] => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) walkServer(p, out);
        else if (e.name.endsWith(".ts")) out.push(p);
      }
      return out;
    };
    const callers = walkServer("src/lib/server")
      .filter((f) => !f.endsWith("responsible-gambling.ts"))
      .filter((f) => /\bcheckLossLimit\s*\(/.test(
        readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1")));
    ok("8c.loss-limit · ⛔ `checkLossLimit` still has exactly ONE caller, and it is the one that says why",
       callers.length === 1 && callers[0].endsWith("market-service.ts"),
       callers.length ? callers.join(", ") : "NO caller — the daily-loss cap is not enforced at all");
  }

  // ⛔ AND THE BANNER CHANNEL MUST REJECT WHAT IT DOES NOT KNOW. `?reason=` is attacker-supplied
  // text on a signed-in money surface. If `bannerFor` ever rendered an unknown key through the
  // caller's generic fallback instead of returning null, the query string would be back to
  // putting a real-looking first-party alert box in front of a player.
  const { bannerFor } = await import("../src/lib/failure-banner.ts");
  const dict = DICT.en.error as unknown as Record<string, string>;
  ok("8c.banner · a known reason renders", !!bannerFor("rg_limit_invalid", dict));
  ok("8c.banner · ⛔ an UNKNOWN reason renders NOTHING, rather than echoing itself",
     bannerFor("Your account is suspended, call +255000000", dict) === null);
  ok("8c.banner · …and an absent reason renders nothing", bannerFor(undefined, dict) === null);
  ok("8c.banner · severity drives the tone", bannerFor("kyc_required", dict)?.tone === "danger");
}

// ═══════════════════════════════════════════════════════════════════════════
// §9 · C2 SECOND TRANCHE — every coded refusal now knows HOW LOUD to be
// ═══════════════════════════════════════════════════════════════════════════
// `docs/FAILURE-INVENTORY.md` §1.4 counts the actual gap: *"five tone vocabularies, and no
// shared `Severity` type"*. Each of these refusals already carries a distinct machine CODE —
// the services were never the problem here. What no surface had was a rule for how loud to be,
// so one refusal was a red toast on one screen and a grey line on another.
//
// ⛔ MAPPING A CODE IS NOT PHRASE-MATCHING, and the difference is the whole point. A code is a
// token the service commits to; a sentence is prose that gets reworded. §8 pins the prose that
// is still unavoidable; this pins the part that never needed prose at all.
console.log("\n§9 · a coded refusal knows how loud to be");
{
  const t = DICT.en;
  const dict = t.error as unknown as Record<string, string>;
  const CASES: Array<[string, FailureReason, "info" | "warning" | "error"]> = [
    ["EMAIL_INVALID", "email_invalid", "warning"],
    ["EMAIL_TAKEN", "email_taken", "warning"],
    ["NAME_INVALID", "name_invalid", "warning"],
    ["AVATAR_TYPE", "avatar_type", "warning"],
    ["AVATAR_SIZE", "avatar_size", "warning"],
    // ⛔ DOC_IMAGE, DOC_TOO_LARGE, DOCS_LOCKED, NO_EXTRA_REQUEST, NIDA_TAKEN and MAINTENANCE
    // were listed here and are gone with their `REASON_BY_CODE` rows — no service emitted any
    // of those six codes, so every case above proved a route nothing could take. §9b below is
    // what replaced them: it walks the tree and fails on any mapped code with no emitter.
    ["PW_CURRENT_WRONG", "password_wrong", "warning"],
    ["PW_WEAK", "password_weak", "warning"],
    ["VOTING_CLOSED", "voting_closed", "info"],
    ["PAUSED", "proposals_paused", "info"],
    ["AUTH", "signin_required", "warning"],
    ["NOT_FOUND", "not_found", "info"],
    ["BUSY", "system_busy", "warning"],
  ];
  for (const [code, reason, severity] of CASES) {
    // ⚠️ NO `reason` ON THE OBJECT — the whole point is that the CODE alone is enough.
    const r = renderFailure(
      { ok: false, error: "English audit prose nobody should read", code } as never,
      dict, "GENERIC", formatTzs);
    ok(`9.${code} · resolves to ${reason}`, r.reason === reason, String(r.reason));
    ok(`9.${code} · …at severity ${severity}`, r.severity === severity, r.severity);
    ok(`9.${code} · …and shows neither the server prose nor the generic line`,
       r.body !== "GENERIC" && !r.body.includes("audit prose"), r.body.slice(0, 50));
  }

  // ⭐ POSITIVE CONTROL, SAME RUN. An OVERLOADED code must NOT be mapped: `INVALID` covers bad
  // input, RG limits, source-of-funds and four KYC families, so picking one meaning for it
  // would be exactly the mistranslation this registry exists to retire. Without this, a
  // mutation that mapped everything would satisfy every assertion above.
  for (const overloaded of ["INVALID", "SUSPENDED"]) {
    const r = renderFailure({ ok: false, error: "x", code: overloaded } as never, dict, "GENERIC", formatTzs);
    ok(`9.control · ${overloaded} is deliberately NOT mapped — it means four different things`,
       r.reason === null && r.body === "GENERIC", `${r.reason} / ${r.body.slice(0, 30)}`);
  }
  const unknown = renderFailure({ ok: false, error: "x", code: "NEVER_SEEN_BEFORE" } as never, dict, "GENERIC", formatTzs);
  ok("9.control · an unknown code falls back to the caller's own generic line",
     unknown.reason === null && unknown.body === "GENERIC");

  // ⛔ And an explicit `reason` still WINS over the code — the code is the fallback, not the
  // authority, or a service that learns to emit its own reason would be silently overridden.
  const both = renderFailure({ ok: false, error: "x", code: "BUSY", reason: "maintenance" } as never, dict, "GENERIC", formatTzs);
  ok("9.precedence · an explicit reason beats the code", both.reason === "maintenance", String(both.reason));
}

// ═══════════════════════════════════════════════════════════════════════════
// §9b · ⛔ EVERY MAPPED CODE IS ACTUALLY EMITTED — no row for a code nobody sends
// ═══════════════════════════════════════════════════════════════════════════
// 🔴 THE DEFECT THIS EXISTS FOR, MEASURED 2026-08-15. `REASON_BY_CODE` carried rows for
// `DOC_IMAGE`, `DOC_TOO_LARGE`, `DOCS_LOCKED`, `NO_EXTRA_REQUEST`, `NIDA_TAKEN` and
// `MAINTENANCE`. **No service or action anywhere emitted any of those six codes** — not on the
// day they were added, not since. `error-copy.ts` carried five matching dead switch arms.
//
// ⛔ AND THAT IS NOT A HARMLESS SPARE TYRE. §9 above proved each of those rows "worked" by
// synthesising the code itself, so the suite was GREEN on six routes the product cannot take —
// and the previous session read the same table and concluded those KYC refusals were handled,
// while every one of them was in fact arriving through a phrase test.
//
// ⭐ THE RULE: a code may be mapped here only if something really sends it. Walked from
// `REASON_BY_CODE` itself — never a hand-list, which is what went stale in the first place.
console.log("\n§9b · every mapped code is emitted by something");
{
  const { REASON_BY_CODE_KEYS } = await import("../src/lib/failure-reasons.ts");
  const walkCode = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walkCode(p, out);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
  };
  // ⛔ The registry's OWN file is excluded, and so is the mapper's: a row citing itself, or a
  // `case "X":` in `error-copy.ts`, is not an emitter. An emitter is something that RETURNS it.
  const sources = [...walkCode("src/lib/server"), ...walkCode("src/app")]
    .filter((f) => !f.endsWith("failure-reasons.ts") && !f.endsWith("error-copy.ts"))
    .map((f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1"));

  ok("9b.0 · fixture · the emitting tree was walked and read", sources.length > 100, `${sources.length} files`);

  /**
   * Does anything RETURN this code?
   *
   * ⛔ NOT a bare search for the quoted token, and the first draft of this guard was exactly
   * that — which would have passed `MAINTENANCE`, one of the six dead rows, because
   * `proposals-config.ts` declares `ProposalsState = "ACTIVE" | "COMING_SOON" | "MAINTENANCE"
   * | "DISABLED"`. An unrelated enum member spelled the same way is not an emitter, and a
   * guard that cannot tell the difference would have reported the defect it exists to catch
   * as already fixed.
   *
   * So: the token must sit in a `code:` position — which admits `code: "X"` and the ternary
   * form `code: a ? "X" : "Y"` that `profile/actions.ts` really uses — and must NOT be a
   * member of a TYPE UNION (`code: "A" | "B"`), which declares what a code may be rather than
   * sending one.
   */
  const emits = (code: string) => sources.some((s) => {
    const re = new RegExp(`\\bcode:\\s*[^;\\n]{0,200}?["']${code}["']([^\\n]*)`, "g");
    for (const m of s.matchAll(re)) {
      const before = m[0].slice(0, m[0].length - (m[1]?.length ?? 0));
      const after = m[1] ?? "";
      if (/\|\s*$/.test(before.slice(0, before.lastIndexOf(code) - 1))) continue; // "A" | "X"
      if (/^\s*\|/.test(after)) continue;                                          // "X" | "B"
      return true;
    }
    return false;
  });
  for (const code of REASON_BY_CODE_KEYS) {
    ok(`9b.${code} · something really returns this code`, emits(code),
       `no emitter for "${code}" — the row maps a refusal the product never sends, and §9 would still pass by synthesising it`);
  }
  // ⭐ CONTROL · the walk must be capable of saying NO, or every line above passes vacuously.
  ok("9b.control · a code nothing emits reads as absent", !emits("NEVER_EMITTED_ANYWHERE_XYZ"));
  // ⭐ AND THE SIX DELETED ROWS ARE PINNED AS STILL-UNEMITTED — the live control, on the real
  // finding. ⛔ If one of these ever gains an emitter, this line fails and the answer is to
  // put its row BACK, not to relax the assertion.
  for (const dead of ["DOC_IMAGE", "DOC_TOO_LARGE", "DOCS_LOCKED", "NO_EXTRA_REQUEST", "NIDA_TAKEN", "MAINTENANCE"]) {
    ok(`9b.deleted.${dead} · still emitted by nothing — which is why its row is gone`, !emits(dead),
       `something now returns "${dead}" — restore its REASON_BY_CODE row`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// §9c · THE SAME PROMISE, ON THE ROUTE THESE REFUSALS ACTUALLY TAKE
// ═══════════════════════════════════════════════════════════════════════════
// ⛔ DELETING A DEAD ROW MUST NOT DELETE ITS COVERAGE. §9 used to assert the loudness of the
// six KYC/maintenance families by feeding their CODE in — a route the product never takes. The
// rows are gone; the refusals are not. They arrive as a `reason`, so their severity and channel
// are pinned here, on the route that is real.
//
// ⚠️ Caught by `red:failure-reasons`, not by reading: removing §9's rows silently un-guarded
// `nida_taken`, and the harness's `nida-taken-demoted-to-a-nudge` mutation — which demotes a
// fraud-shaped block to a quiet inline nudge — stopped being caught by anything.
console.log("\n§9c · loudness is pinned on the reason route, not only the code route");
{
  const dict = DICT.en.error as unknown as Record<string, string>;
  const CASES: Array<[FailureReason, "info" | "warning" | "error", "inline" | "toast" | "modal"]> = [
    // ⛔ An identity already linked to another account is a fraud-shaped fact, not a typo to
    // fix in place — error, and it must be acknowledged. ⭐ It covers all FOUR document
    // types from 2026-08-20: a DUPLICATE_IDENTITY block a passport could walk around
    // would not be a uniqueness rule at all.
    ["id_taken", "error", "modal"],
    // ⭐ The player can fix all three of these and their money did not move — warning,
    // inline, beside the field. ⛔ The copy is type-NEUTRAL on purpose: /profile/kyc
    // knows which document was chosen and prints THAT document's rule under the field,
    // so the player reads the real rule rather than the word "invalid" (§F4).
    ["id_number_format", "warning", "inline"],
    ["id_expired", "warning", "inline"],
    ["id_expiry_required", "warning", "inline"],
    ["doc_image_type", "warning", "inline"],
    ["doc_too_large", "warning", "inline"],
    // Nothing is wrong; a state the player cannot change and need not act on.
    ["docs_locked", "info", "inline"],
    ["no_extra_request", "info", "inline"],
    // ⭐ The row a service reached for the first time today — and the sentence is the point:
    // "Nothing has been charged", on a refusal that happens mid-stake.
    ["maintenance", "error", "toast"],
  ];
  for (const [reason, severity, channel] of CASES) {
    const r = renderFailure({ ok: false, error: "English audit prose nobody should read", reason } as never,
                            dict, "GENERIC", formatTzs);
    ok(`9c.${reason} · resolves through the REASON`, r.reason === reason, String(r.reason));
    ok(`9c.${reason} · …at severity ${severity}`, r.severity === severity, r.severity);
    ok(`9c.${reason} · …on the ${channel} channel`, r.channel === channel, r.channel);
    ok(`9c.${reason} · …and shows neither the server prose nor the generic line`,
       r.body !== "GENERIC" && !r.body.includes("audit prose"), r.body.slice(0, 50));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// §10 · THE RAW-SERVER-STRING RATCHET — the count may only go down
// ═══════════════════════════════════════════════════════════════════════════
// `docs/FAILURE-INVENTORY.md` §1.5 counts the surfaces that put `r.error` — the server's
// ENGLISH audit prose — straight in front of the player. Fixing every one of them is a long
// tail across two dozen files; letting NEW ones appear while that tail is worked is how the
// list grew in the first place.
//
// ⛔ A RATCHET, NOT A TARGET. It fails when the number goes UP, and it fails when the number
// goes DOWN without the ceiling being lowered — because a ceiling nobody lowers is a ceiling
// nobody reads. ⚠️ `docs/` records unwindowed ratchets crying wolf: this one is scoped to
// exactly one pattern in exactly two directories, and prints the files, so a red says WHERE.
console.log("\n§10 · raw server strings in front of a player — the ratchet");
{
  // ⭐ THE CEILING IS **ZERO**, and it got there by fixing the tail rather than by managing it.
  // Once the population was measured correctly — player surfaces only, and `t.error.…`
  // excluded as the DICTIONARY it is — the real count was six, not the 73 the first two
  // spellings of this check reported. All six are converted:
  //     comments-thread.tsx ×3 · objection-dialog.tsx ×1  (the dispute dialog: a player
  //     formally contesting money was reading English audit prose as the failure's TITLE)
  //     export-data-button.tsx ×1 · create-form.tsx ×1
  // ⛔ It may never go up. A new surface that renders `r.error` fails this suite.
  const CEILING = 0;

  // ⛔ PLAYER SURFACES ONLY, AND THE EXCLUSION IS THE POINT OF THE MEASUREMENT. The defect
  // §1.5 counts is *"a Swahili or Chinese player got an English sentence"*. The ADMIN console
  // is an English-only staff surface by design, so counting its toasts here would have made
  // this ratchet fail on 30-odd non-defects — a guard that cries wolf, which is how a real
  // finding stops being read. The first run of this section did exactly that.
  const isAdmin = (p: string) => /(^|\/)admin(\/|$)/.test(p);
  const walkTsx = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) { if (!isAdmin(p)) walkTsx(p, out); }
      else if (e.name.endsWith(".tsx") && !isAdmin(p)) out.push(p);
    }
    return out;
  };
  // ⚠️ `t.error.…` IS THE DICTIONARY, NOT A SERVER STRING, and the first version of this
  // pattern counted it. `description: t.error.somethingDidntWork` is exactly the RIGHT thing
  // to render — a localized line — and flagging it made two of the four "offenders" fixes that
  // would have made the product worse. The negative lookahead is what tells the two apart.
  // ⛔ The trailing `\b(?!\.)` matters too: `r.error` is the raw string, `t.error.foo` is not.
  const RAW = /\b(?:title|description):\s*(?!t\.)[A-Za-z_$][\w$]*\.error\b(?!\.)/g;

  // 🔴 AND THE SECOND CHANNEL, WHICH THIS SECTION WAS STRUCTURALLY BLIND TO UNTIL 2026-08-15.
  // `RAW` matches an object PROPERTY — a toast or modal argument. A form-action page does not
  // report that way: it `redirect(...?error=<the server's English sentence>)` and the server
  // component renders `{sp.error}` as JSX TEXT inside a `Callout` or a `role="alert"` div. That
  // form matches nothing in `RAW`, so FIVE surfaces — one of them the responsible-gambling
  // console — sat outside this denominator while it printed a confident **0**. That is §5b's
  // "a check adjacent to the truth": the number was correct about the channel it measured and
  // said nothing about the one it did not.
  //
  // ⛔ ONE DENOMINATOR, NOT TWO. Both patterns are counted into the same `count` against the
  // same ceiling, because the player-facing defect is identical — a Swahili or Chinese player
  // reading English audit prose — and a defect that can hide by moving between two scoreboards
  // is a defect with somewhere to hide.
  // ⚠️ `test:feedback-law` §8 still ratchets the banner channel on its own. That is deliberate
  // duplication of a MEASUREMENT, not of a rule: it is the guard that found this blindness, and
  // it fails independently if either half regresses.
  const RAW_BANNER = /\{\s*(?:sp|searchParams|params|q)\s*\.\s*error\s*\}/g;
  const offenders: string[] = [];
  let count = 0;
  const files0 = [...walkTsx("src/app"), ...walkTsx("src/components")];
  for (const f of files0) {
    const src = readFileSync(f, "utf8");
    const nToast = (src.match(RAW) ?? []).length;
    const nBanner = (src.match(RAW_BANNER) ?? []).length;
    const n = nToast + nBanner;
    if (n) {
      count += n;
      const which = [nToast ? `toast×${nToast}` : "", nBanner ? `banner×${nBanner}` : ""].filter(Boolean).join("+");
      offenders.push(`${f.replace("src/", "")}(${which})`);
    }
  }
  // The excluded population, counted for the record (see the note by `isAdmin`).
  const walkAll = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walkAll(p, out);
      else if (e.name.endsWith(".tsx")) out.push(p);
    }
    return out;
  };
  const adminCount = walkAll("src/app").concat(walkAll("src/components"))
    .filter((p) => isAdmin(p))
    .reduce((n, f) => n + (readFileSync(f, "utf8").match(RAW) ?? []).length, 0);
  ok(`10.1 · ★ NO player surface renders a raw server string (${count} ≤ ${CEILING})`,
     count <= CEILING, offenders.slice(0, 8).join(" · "));
  ok(`10.2 · ⛔ …and if the count ever drops below the ceiling, LOWER IT (${count} vs ${CEILING})`,
     count === CEILING,
     count < CEILING ? `${CEILING - count} were fixed — set CEILING = ${count} in this file` : "");

  // ⭐ THE POSITIVE CONTROL, AND AT ZERO IT HAS TO CHANGE SHAPE. "The pattern found something"
  // is the usual proof that a scanner is alive — but the whole point of this section is that
  // there is nothing left to find, so that control would now fail on success. Instead, prove
  // the pattern still DISCRIMINATES: it must catch a raw render and must NOT catch the
  // dictionary. Without this, deleting the regex body would leave §10.1 permanently green.
  const probe = (line: string) => new RegExp(RAW.source).test(line);
  ok("10.3 · control · the pattern still CATCHES a raw server string",
     probe('toast({ title: t.toast.oops, description: r.error, variant: "danger" });'));
  ok("10.4 · control · …and still IGNORES the dictionary, which is the correct thing to render",
     !probe('toast({ title: t.toast.oops, description: t.error.somethingDidntWork, variant: "danger" });'));
  ok("10.5 · control · …and the tree really was walked", files0.length > 40, `${files0.length} player .tsx files`);

  // ⭐ THE BANNER HALF NEEDS ITS OWN CONTROLS, OR ADDING IT TO THE DENOMINATOR IS DECORATION.
  // A scanner that has gone blind prints "0" in exactly the same words as a clean tree, so
  // prove this pattern discriminates too — it must catch a banner rendering the query string,
  // and must NOT catch one rendering the registry.
  const probeB = (line: string) => new RegExp(RAW_BANNER.source).test(line);
  ok("10.6 · control · the BANNER pattern catches a page rendering the server's own sentence",
     probeB('<Callout tone="danger" live>{sp.error}</Callout>'));
  ok("10.7 · control · …and ignores one rendering the registry",
     !probeB('<Callout tone={banner.tone} live>{banner.body}</Callout>'));
  // ⛔ AND THE TWO PATTERNS MUST NOT BE THE SAME PATTERN. If a refactor ever collapsed them,
  // the denominator would silently halve and this section would go back to measuring one
  // channel while claiming both.
  ok("10.8 · control · the two channels really are two different patterns",
     RAW.source !== RAW_BANNER.source && !probe('<Callout tone="danger">{sp.error}</Callout>'));
  // ℹ️ Recorded, not asserted: the ADMIN console is an English-only staff surface by design,
  // so its raw renders are excluded above. Printing the number keeps that decision visible
  // rather than hidden inside a filter.
  console.log(`     (admin surfaces, excluded by design: ${adminCount} raw renders across the staff console)`);
}

console.log(`\nfailure-reasons (with §8 + §9 + §10): ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
