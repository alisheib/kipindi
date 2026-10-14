/** Exact approved S9 payment-truth delta; all other published bytes still use the immutable pre-S8 main golden. */
import ts from "typescript";
import { sameS8PublishedWords } from "./s8-published-words.mts";

const LOCALES = ["en", "sw", "zh"] as const;
const PRIOR = {
  en: { returnReversedTitle: "Payment reversed", returnReversedBody: "Your account can't take deposits right now, so this payment wasn't added to your wallet. It goes back to the card it came from." },
  sw: { returnReversedTitle: "Malipo yamerudishwa", returnReversedBody: "Akaunti yako haiwezi kupokea amana kwa sasa, hivyo malipo haya hayakuongezwa kwenye pochi yako. Yanarudishwa kwenye kadi yaliyotoka." },
  zh: { returnReversedTitle: "付款已退回", returnReversedBody: "您的账户目前无法接收充值，此笔付款未计入钱包，将退回原银行卡。" },
};
// The card-return TITLE is the owner's label for a held deposit — "Reversed" on every player surface
// (docs/COMPLIANCE-DECISIONS.md, 2026-10-07, item 6) — so it is unchanged from PRIOR; only the body and the review keys move.
const APPROVED = {
  en: {
    returnReversedTitle: "Payment reversed",
    returnReversedBody: "Your account could not accept this deposit, so it was not added to your wallet. The money is held for return; contact support using this receipt.",
    returnReviewTitle: "Payment under review",
    returnReviewBody: "We need to review this payment's result. Don't pay again. Open the receipt for its references, or contact support.",
  },
  sw: {
    returnReversedTitle: "Malipo yamerudishwa",
    returnReversedBody: "Akaunti yako haikuweza kupokea amana hii, hivyo haikuongezwa kwenye pochi yako. Pesa zinashikiliwa ili zirudishwe; wasiliana na usaidizi ukitumia risiti hii.",
    returnReviewTitle: "Malipo yanakaguliwa",
    returnReviewBody: "Tunahitaji kukagua matokeo ya malipo haya. Usilipe tena. Fungua risiti kuona kumbukumbu zake, au wasiliana na usaidizi.",
  },
  zh: {
    returnReversedTitle: "付款已退回",
    returnReversedBody: "您的账户当时无法接收此笔充值，款项未计入钱包，现正保留待退还。请凭此收据联系支持。",
    returnReviewTitle: "付款待核查",
    returnReviewBody: "我们需要核查此笔付款的结果。请勿重复支付。可打开凭据查看参考编号，或联系支持。",
  },
};
type Key = keyof typeof APPROVED.en;
const EXISTING = ["returnReversedTitle", "returnReversedBody"] as const;
const ADDED = ["returnReviewTitle", "returnReviewBody"] as const;

export function s9PublishedWords(rel: string, source: string, requireDelta = true) {
  const text = source.replace(/\r\n/g, "\n");
  if (rel !== "src/lib/i18n-dict.ts") return { legacy: text, accepted: true, count: 0 };
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true);
  const initializer = sf.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations])
    .find(d => d.name.getText(sf) === "dict")?.initializer;
  const dict = initializer && ts.isAsExpression(initializer) ? initializer.expression : initializer;
  const properties = (obj: ts.Expression | undefined, name: string) => obj && ts.isObjectLiteralExpression(obj)
    ? obj.properties.filter((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText(sf) === name) : [];
  const changes: Array<{ start: number; end: number; to: string }> = [];
  let accepted = true, count = 0;
  for (const locale of LOCALES) {
    const wallet = properties(properties(dict, locale)[0]?.initializer, "wallet")[0]?.initializer;
    const additions = ADDED.flatMap(key => properties(wallet, key));
    accepted &&= requireDelta ? additions.length === 2 : additions.length === 0 || additions.length === 2;
    for (const key of [...EXISTING, ...ADDED] as Key[]) {
      const found = properties(wallet, key);
      if (!requireDelta && ADDED.includes(key as typeof ADDED[number]) && found.length === 0) continue;
      const p = found[0], value = p && ts.isStringLiteral(p.initializer) ? p.initializer.text : null;
      const prior = EXISTING.includes(key as typeof EXISTING[number]) ? PRIOR[locale][key as typeof EXISTING[number]] : null;
      accepted &&= found.length === 1 && (value === APPROVED[locale][key] || (!requireDelta && value === prior));
      count += found.length;
      if (!p) continue;
      if (prior !== null) changes.push({ start: p.initializer.getStart(sf), end: p.initializer.end, to: JSON.stringify(prior) });
      else changes.push({ start: p.getFullStart(), end: p.end + (text[p.end] === "," ? 1 : 0), to: "" });
    }
  }
  let legacy = text;
  for (const c of changes.sort((a, b) => b.start - a.start)) legacy = legacy.slice(0, c.start) + c.to + legacy.slice(c.end);
  return { legacy, accepted, count };
}

export function sameS8S9PublishedWords(rel: string, source: string, golden: string): boolean {
  const current = s9PublishedWords(rel, source), prior = s9PublishedWords(rel, golden, false);
  return current.accepted && prior.accepted && sameS8PublishedWords(rel, current.legacy, prior.legacy);
}
