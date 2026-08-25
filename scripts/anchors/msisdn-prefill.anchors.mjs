/**
 * THE ANCHORS `red:msisdn-prefill` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Jay (Gaming Board) item #8 — the deposit and withdraw number fields open with the player's
 * own registered number instead of an empty box behind a placeholder.
 *
 * ⭐ THE FIRST IS THE ONE WORTH READING. `naive-nullish` restores `sp.msisdn ?? account`,
 * which LOOKS like the same rule and is not: both actions omit an EMPTY msisdn from their
 * carry params, so a field the player deliberately CLEARED comes back silently refilled with
 * their account number — on the screen that decides where their money is sent. Every "the
 * field is prefilled" assertion still passes.
 *
 * ⭐ AND THE LAST IS THE POSITIVE CONTROL: it makes the page ignore the rule entirely and go
 * back to an empty field. Nothing in §1 or §2 notices, because those drive the pure function,
 * which is untouched — only the call-site assertions stand between that and a green report on
 * a form that prefills nothing.
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree); no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const NORM = "src/lib/phone-normalize.ts";
const WPAGE = "src/app/wallet/withdraw/page.tsx";
const WACT = "src/app/wallet/withdraw/actions.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "naive-nullish",
    why: "⭐ the rule becomes `submitted ?? account`, which reads identically and is not: the actions DROP an empty msisdn from their carry params, so a deliberately CLEARED payout destination comes back refilled with the account number. Every 'the field is prefilled' assertion still passes",
    file: NORM,
    suite: "msisdn-prefill",
    from: `  if (hadError) return normalizeTzLocalDigits(submitted ?? "");`,
    to: `  if (hadError && submitted) return normalizeTzLocalDigits(submitted);`,
    expect: "2: 🔴 a CLEARED field stays cleared after an error",
  },
  {
    name: "prefill-not-normalised",
    why: "the account number is passed through raw, so a player whose phone is stored as `+255712000101` sees `+255712000101` in a field capped at 9 digits and patterned `\d{9}` — the form opens already invalid, which is worse than opening empty",
    file: NORM,
    suite: "msisdn-prefill",
    from: `  return normalizeTzLocalDigits(accountPhoneE164);`,
    to: `  return accountPhoneE164;`,
    expect: "1: a fresh visit shows the account's own number",
  },
  {
    name: "action-trusts-the-session",
    why: "🔴 the withdraw action reads the destination from the SESSION instead of the form, so the prefill stops being a convenience and becomes an assumption: a player who edits the field is ignored and the money goes to the registered number regardless of what they typed",
    file: WACT,
    suite: "msisdn-prefill",
    from: `  const msisdn = formData.get("msisdn") ? String(formData.get("msisdn")) : undefined;`,
    to: `  const msisdn = session.phoneE164 ? String(session.phoneE164) : undefined;`,
    expect: "5: ⛔ the action takes the destination from the FORM, never from the session",
  },
  {
    name: "control-page-ignores-the-rule",
    why: "⭐ POSITIVE CONTROL — the withdraw page goes back to an empty field. §1 and §2 drive the pure function and are untouched, so they all still pass; only the CALL-SITE assertions stand between that and a green report on a form that prefills nothing",
    file: WPAGE,
    suite: "msisdn-prefill",
    from: `  const prevMsisdn = moneyFormMsisdn(session.phoneE164, sp.msisdn, errorMsg != null);`,
    to: `  const prevMsisdn = sp.msisdn ?? "";`,
    expect: "3: withdraw seeds the field through the shared rule",
  },
];
