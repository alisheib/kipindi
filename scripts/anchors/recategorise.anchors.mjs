/**
 * THE ANCHORS `red:recategorise` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Jay (Gaming Board) item #14 — a mis-filed market can be corrected, and the licence-excluded
 * category cannot be reached by that path. `MARKET_CATEGORIES` excludes politics BY LICENCE:
 * *"operators caught listing political markets risk the licence."*
 *
 * ⭐ `coercer-swallows-it` IS THE ONE TO READ, and it is why §2 pins the coercer by name.
 * `resolvePublishCategory` maps anything unrecognised to `other` — correct when publishing a
 * generated poll, catastrophic here: a typed `politics` would come back as a SUCCESSFUL
 * re-categorisation to `other`. The operator is told yes, the market moves, and nothing
 * anywhere says the forbidden category was asked for. **Being quietly given something else is
 * not the same as being told no.**
 *
 * ⭐ AND `control-refuses-everything` is the positive control: a validator that rejects every
 * category keeps the licence perfectly safe while the control Jay asked for does not work.
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree); no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const SVC = "src/lib/server/market-service.ts";
const ACT = "src/app/markets/actions.ts";
const PAGE = "src/app/admin/markets/[id]/page.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "coercer-swallows-it",
    why: "⭐ the validator is replaced by `resolvePublishCategory`, which maps anything unrecognised to `other`. A typed `politics` then comes back as a SUCCESSFUL re-categorisation to `other`: the operator is told yes, the market moves, and nothing records that the licence-excluded category was asked for. Being quietly given something else is not being told no",
    file: SVC,
    suite: "recategorise",
    from: `  if (!MARKET_CATEGORY_SET.has(raw)) {`,
    to: `  if (false) {`,
    expect: "2: 🔴 \"politics\" is refused",
  },
  {
    name: "refusal-hides-the-permitted-list",
    why: "the refusal stops naming which categories the licence permits, so a typo and a licence refusal become indistinguishable and an operator has no way to tell 'you spelled it wrong' from 'you may never file it there'",
    file: SVC,
    suite: "recategorise",
    from: `      error: \`"\${opts.category}" is not a category this licence permits. Choose one of: \${MARKET_CATEGORIES.join(", ")}.\`,`,
    to: `      error: "Invalid category.",`,
    expect: "2: the refusal names the permitted categories",
  },
  {
    name: "write-touches-more-than-the-label",
    why: "🔴 the write stops being a spread plus the category and starts resetting the pools. A filing correction must never move money — this is the shape that would silently zero a market's stakes while reporting a successful re-categorisation",
    file: SVC,
    suite: "recategorise",
    from: `  await marketStore.set({ ...m, category: after });`,
    to: `  await marketStore.set({ ...m, category: after, yesPool: 0, noPool: 0 });`,
    expect: "4: ⛔ the write is the spread plus the category, and nothing else",
  },
  {
    name: "not-audited",
    why: "the correction stops being recorded, so the audit chain no longer shows who re-filed a market or what it was before — and the acceptance asks for the change to be IN the audit chain, because a correction nobody can review is indistinguishable from a mistake",
    file: SVC,
    suite: "recategorise",
    from: `    action: "market.recategorised",`,
    to: `    action: "market.touched",`,
    expect: "4: the change is audited with before and after",
  },
  {
    name: "ungated-action",
    why: "the action drops its admin gate, so any signed-in player could re-file any market — including moving a market out of the category its trusted price source was approved under",
    file: ACT,
    suite: "recategorise",
    from: `  await requireAdminOrThrow(session.userId, "recategoriseMarketAction");`,
    to: `  void session;`,
    expect: "4: the action is admin-gated",
  },
  {
    name: "control-refuses-everything",
    why: "⭐ POSITIVE CONTROL — the validator rejects EVERY category, including the seven the licence permits. The licence is perfectly safe, every refusal assertion passes harder, and the control Jay asked for does not work at all",
    file: SVC,
    suite: "recategorise",
    from: `  const raw = (opts.category ?? "").trim().toLowerCase();`,
    to: `  const raw = "__never__";`,
    expect: "1: ⭐ a mis-filed market can be corrected",
  },
  {
    name: "results-goes-static",
    why: "⚠️ A × H — `/results` stops being force-dynamic, so it can serve a cached page that still groups a re-filed market under its OLD category. The correction succeeds, the audit row is written, and the one page the Board reads keeps showing the market where it never belonged",
    file: "src/app/results/page.tsx",
    suite: "recategorise",
    from: `export const dynamic = "force-dynamic";`,
    to: `export const revalidate = 300;`,
    expect: "5: ⭐ `/results` is force-dynamic",
  },
  {
    name: "results-not-revalidated",
    why: "the action stops naming `/results`, so the belt to the force-dynamic braces is gone — the day the page is made static nothing anywhere refreshes its grouping",
    file: "src/app/markets/actions.ts",
    suite: "recategorise",
    from: `    revalidatePath("/results");`,
    to: `    void 0;`,
    expect: "5: …and the action names `/results` anyway",
  },
];
