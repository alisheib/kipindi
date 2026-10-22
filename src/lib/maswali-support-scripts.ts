/**
 * MASWALI MILLIONEA — WHAT THE SUPPORT DESK SAYS (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 9, MB-64, MB-86, MB-91).
 *
 * The desk's scripts for a Millionea ticket holder, in English and Swahili, with the steps the desk takes first. Each
 * script says what the product enforces, or what an Owner ruling accepted on 2026-10-16 binds the operator to
 * (MASWALI-PLAN §9: OD-07, OD-09, OD-27) — and nothing else. ⛔ The desk's steps say WHO does each thing, never what the
 * platform does not do (S6 review R2-17): a script is read aloud and the repository is public, so a gap written into one
 * is a gap advertised. The gaps themselves are the plan's to track.
 *
 * ⭐ ONE SOURCE. The platform kept no DESK scripts before Millionea — the chat helper's intent table
 *    (`src/lib/chat/send-message.ts`) answers players, not the desk, and names no Millionea topic while the product is
 *    withdrawn. These live here and are read on the desk's own page (`/admin/maswali/lookup`), beside the one ticket a
 *    player is asking about. The operator guide MB-64 asks for is not written yet; when it is, it points at that page
 *    rather than copying them.
 * ⛔ NO FIGURE IS TYPED. Every number is a placeholder filled at the moment the desk reads it (`fillSupportScript`), from
 *    the ticket's week's frozen rules or the live configuration: the check window and its earliest close, the
 *    withdrawal limit and its fee, the support address, and the written answer's target (`maswali.config`'s
 *    `complaintAnswerDays`, a support promise no week freezes).
 * ⛔ WHAT A SCRIPT NEVER SAYS: why a share is held (the holder learns THAT it is reviewed, never why), a next jackpot
 *    figure (MB-44), a review step on a payout (MB-11), or an answer for a coming week (MB-71: the desk never suggests
 *    picks).
 * ⚠️ The Swahili is reviewed by a native reader at Gate B, with the rest of Millionea's copy (S6-BRIEF, "New strings").
 * Pure and import-light: one phrase helper, so the server page and any later client read the same words.
 */
import { durationHours } from "@/lib/duration-phrase";

export type SupportScriptKey =
  | "win" | "heldShare" | "loss" | "questionVoid" | "weekVoid" | "reversal" | "death" | "holiday" | "wrongQuestion" | "complaint";

export type SupportScript = {
  key: SupportScriptKey;
  /** The situation as the desk names it (admin copy, English). */
  title: string;
  /** What the desk does first (admin copy, English). */
  steps: readonly string[];
  /** What the desk says, in the player's language. Placeholders in braces: {window} {notBefore} {cap} {fee} {email} {days}. */
  en: string;
  sw: string;
};

/** The figures a script needs, read when the desk opens it — never typed into a script. */
export type SupportFigures = {
  /** The week's check window (OD-05), and the EAT time it never closes before. */
  objectionHours: number;
  objectionNotBefore: string;
  /** The most one withdrawal may be (`WITHDRAW_MAX_TZS`) and its fee (RULES §2.7), already formatted. */
  withdrawalCap: string;
  withdrawalFee: string;
  supportEmail: string;
  /** How many working days a written complaint usually waits for Compliance's answer (MB-91): `maswali.config`'s
   *  `complaintAnswerDays`, read live, said as "usually" the way `KYC_REVIEW_SLA_HOURS` states the identity review's. */
  answerDays: number;
};

export const MILLIONEA_SUPPORT_SCRIPTS: readonly SupportScript[] = [
  {
    key: "win",
    title: "Win — the ticket won, and its share is paid",
    steps: [
      "Look the ticket up: its share reads Paid.",
      "Tell the player how a share becomes cash. Never a next jackpot figure, and never a review that is not happening.",
    ],
    en: "Congratulations — your ticket won this week, and its share is in your 50pick wallet now. To withdraw it: confirm your email address, give your identity details once, then withdraw up to {cap} at a time, always to the number registered on your account. Each withdrawal carries the {fee} fee, shown before you confirm.",
    sw: "Hongera — tiketi yako imeshinda wiki hii, na mgao wake uko kwenye pochi yako ya 50pick sasa. Ili kuutoa: thibitisha barua pepe yako, weka taarifa za utambulisho wako mara moja, kisha toa hadi {cap} kwa wakati mmoja, kila mara kwenda namba iliyosajiliwa kwenye akaunti yako. Kila utoaji una ada ya {fee}, inayoonyeshwa kabla hujathibitisha.",
  },
  {
    key: "heldShare",
    title: "Win — the share is held for review",
    steps: [
      "Look the ticket up: its share reads Held for review.",
      "Say only that it is being reviewed — never why, and never a date the review has not set.",
      "Compliance decides it on the Integrity page (Held shares), and tells the player the decision in writing.",
    ],
    en: "Your ticket won, and its share has been credited to your account. Our compliance team is reviewing it before it can be withdrawn, and you will be told as soon as the review is complete.",
    sw: "Tiketi yako imeshinda, na mgao wake umewekwa kwenye akaunti yako. Timu yetu ya uzingatiaji inaukagua kabla haujaweza kutolewa, na utajulishwa mara tu ukaguzi utakapokamilika.",
  },
  {
    key: "loss",
    title: "Loss — the results are final and the ticket missed",
    steps: [
      "Look the ticket up once the week has settled: each answer shows beside its result.",
      "Never suggest answers for a coming week.",
    ],
    en: "This week's results are final, and your ticket is not one of the winning tickets this time. Your ticket page shows each of your answers beside its result, and the week's public register shows every result with its source.",
    sw: "Matokeo ya wiki hii ni ya mwisho, na tiketi yako si mojawapo ya tiketi zilizoshinda safari hii. Ukurasa wa tiketi yako unaonyesha kila jibu lako kando ya matokeo yake, na Daftari la Wiki linaonyesha kila matokeo pamoja na chanzo chake.",
  },
  {
    key: "questionVoid",
    title: "A question was voided",
    steps: [
      "The question's ground is printed on the week's public register.",
      "Explain the reserve rule. Nothing is refunded for one voided question.",
    ],
    en: "One of the week's main questions was voided on one of the published grounds — for example, its event was not played by its deadline. When that happens, the first reserve question not yet used, in order (A1, then A2…), counts in its place, with the answer you gave it when you bought. You answered all fifteen questions, so your ticket is complete and still counts.",
    sw: "Moja ya maswali makuu ya wiki limebatilishwa kwa mojawapo ya sababu zilizochapishwa — kwa mfano, tukio lake halikuchezwa kufikia muda wake wa mwisho. Hilo likitokea, swali la akiba la kwanza ambalo bado halijatumika, kwa mpangilio (A1, kisha A2…), linahesabiwa mahali pake, pamoja na jibu ulilolitoa ulipokata tiketi. Ulijibu maswali yote kumi na tano, kwa hiyo tiketi yako imekamilika na bado inahesabiwa.",
  },
  {
    key: "weekVoid",
    title: "The week voided whole",
    steps: [
      "Look the ticket up: Refunded, or Refund pending while the system retries it.",
      "The jackpot is untouched and carries on to the next week.",
    ],
    en: "This week was voided as a whole — for example because more main questions were voided than the reserves could replace. Every ticket is refunded in full to the wallet that paid for it, and the jackpot carries on to the next week untouched. If your refund is not showing yet, it is on its way — the system keeps retrying it until it lands.",
    sw: "Wiki hii imebatilishwa yote — kwa mfano kwa sababu maswali makuu mengi zaidi yalibatilishwa kuliko akiba zilizoweza kuyachukua nafasi. Kila tiketi inarejeshewa kiasi chake kamili kwenye pochi iliyoilipia, na jackpot inaendelea hadi wiki ijayo bila kuguswa. Kama marejesho yako bado hayajaonekana, yako njiani — mfumo unaendelea kujaribu hadi yafike.",
  },
  {
    key: "reversal",
    title: "A deposit that paid for a ticket was reversed",
    steps: [
      "The ticket stays in the week: the commitment published at the close includes it, and it is graded like any other.",
      "Tell Compliance now, naming the serial. If the ticket wins, Compliance holds its share (the Integrity page: Winners, Hold the share) and decides it under Held shares (OD-07). Say nothing beyond the script.",
    ],
    en: "The deposit that paid for this ticket was reversed by the payment provider. The ticket stays in the week and is graded like every other ticket. If it wins, our compliance team reviews its share together with the payment before deciding it, and you will be told the outcome.",
    sw: "Amana iliyolipia tiketi hii ilirudishwa na mtoa huduma wa malipo. Tiketi inabaki kwenye wiki na inapimwa kama tiketi nyingine zote. Ikishinda, timu yetu ya uzingatiaji itakagua mgao wake pamoja na malipo hayo kabla ya kuuamua, na utajulishwa matokeo.",
  },
  {
    key: "death",
    title: "A ticket holder has died (MB-86)",
    steps: [
      "Suspend the account on its player page, giving the reason \"deceased — estate claim\": it is signed out and cannot sign in, so nothing can be withdrawn, and a share it wins later is credited and held. Only an active account can be suspended: for any other, ask Compliance to freeze its wallet on the same page.",
      "Ask Compliance to hold any Millionea share already paid to it (the Integrity page: Winners, Hold the share).",
      "Compliance checks the death certificate and the letters of administration, then pays what the account holds — any share included — to the estate, and records the payment. This wording awaits legal review.",
    ],
    en: "We are very sorry for your loss. Please send us the death certificate and the letters of administration (or the court order naming the estate's administrator) at {email}. We will hold the account so that nothing can be withdrawn from it. Once our compliance team has checked the documents, it pays what the account holds — including any Millionea winnings — to the estate, and confirms this to you in writing.",
    sw: "Tunasikitika sana kwa msiba wako. Tafadhali tutumie cheti cha kifo na barua za usimamizi wa mirathi (au amri ya mahakama inayomtaja msimamizi wa mirathi) kupitia {email}. Tutazuia akaunti ili hakuna kinachoweza kutolewa. Timu yetu ya uzingatiaji ikishakagua nyaraka hizo, italipa kilichopo kwenye akaunti — pamoja na ushindi wowote wa Millionea — kwa mirathi, na itakuthibitishia kwa maandishi.",
  },
  {
    key: "holiday",
    title: "A holiday week",
    steps: [
      "A holiday changes no rule: each question keeps the void deadline printed on it, and a void brings in the reserve.",
      "The trading officer reviews each week's events against public holidays before it opens, and a skipped week is announced in advance (OD-27).",
    ],
    en: "Millionea runs every week, holidays included. Before a week opens, our team checks its events against the public holidays. A week may be skipped with notice, and then the jackpot simply waits for the next week. If a holiday moves an event, the question's own rule decides: if it is not played by its deadline it is voided, and a reserve counts in its place.",
    sw: "Millionea inaendeshwa kila wiki, ikiwemo wiki za sikukuu. Kabla wiki haijafunguliwa, timu yetu hukagua matukio yake dhidi ya sikukuu za umma. Wiki inaweza kurukwa baada ya kutoa taarifa, na hapo jackpot husubiri wiki inayofuata. Sikukuu ikihamisha tukio, kanuni ya swali lenyewe ndiyo huamua: kama halitachezwa kufikia muda wake wa mwisho, linabatilishwa na swali la akiba linahesabiwa mahali pake.",
  },
  {
    key: "wrongQuestion",
    title: "A question was published with a mistake",
    steps: [
      "While the week sells: tell the trading officer at once — a question found wrong before the close is voided on its own ground.",
      "After the close: pass it to Compliance inside the week's check window, before the week is released.",
    ],
    en: "If a question was published with a mistake — a wrong date or figure, or Swahili that says something different from the English — it is voided on the ground that its wording is wrong: before the close if we find it, or after the close if a challenge to that question is upheld. The first unused reserve then counts in its place. Tell us now, naming the question, and please do it before the week's check window ends.",
    sw: "Kama swali lilichapishwa likiwa na kosa — tarehe au namba isiyo sahihi, au Kiswahili kinachosema kitu tofauti na Kiingereza — linabatilishwa kwa sababu maneno yake si sahihi: kabla ya kufunga mauzo tukiligundua, au baada ya kufunga iwapo pingamizi kuhusu swali hilo litakubaliwa. Kisha swali la akiba la kwanza ambalo halijatumika linahesabiwa mahali pake. Tuambie sasa, ukilitaja swali hilo, na tafadhali fanya hivyo kabla muda wa ukaguzi wa wiki haujaisha.",
  },
  {
    key: "complaint",
    title: "A complaint — the path, and how soon it is answered (MB-91)",
    steps: [
      "Write down the serial, the week and the question, word for word.",
      "Inside the week's check window: take the challenge down word for word and tell Compliance at once, before accounting releases the week (OD-06). Compliance rules on it.",
      "Otherwise: Compliance answers in writing from the week's evidence pack (the Millionea Evidence page).",
      "A result proven wrong after payment is never clawed back; Compliance compensates the tickets it wronged from operator funds, never the jackpot (OD-09).",
    ],
    en: "Here is how to raise it. If the week's results are still in their check window — it opens when the results are final, lasts {window} and never closes before {notBefore} EAT — tell us straight away, naming the question. At any other time, write to us at {email}, within the time our Terms allow (their section “Voids and disputes”). Our compliance team answers in writing, usually within {days} working days. A result proven wrong after payment is never taken back from the winners; tickets it wronged are compensated by 50pick. If you are not satisfied with our answer, you may take it to the Gaming Board of Tanzania.",
    sw: "Hivi ndivyo unavyoweza kuliwasilisha. Kama matokeo ya wiki bado yako kwenye muda wake wa ukaguzi — unaanza matokeo yanapokuwa ya mwisho, unadumu {window}, na haufungwi kabla ya {notBefore} EAT — tuambie mara moja, ukilitaja swali. Wakati mwingine wowote, tuandikie kupitia {email}, ndani ya muda unaoruhusiwa na Masharti yetu (sehemu yake ya “Kufuta dau na migogoro”). Timu yetu ya uzingatiaji itakujibu kwa maandishi, kwa kawaida ndani ya siku {days} za kazi. Matokeo yakithibitika kuwa si sahihi baada ya malipo, hayachukuliwi tena kutoka kwa washindi; tiketi zilizoathirika zinafidiwa na 50pick. Kama hujaridhika na jibu letu, unaweza kulipeleka kwa Bodi ya Michezo ya Kubahatisha Tanzania.",
  },
];

/** One script's words with its figures filled in, in the player's language. An unknown placeholder is left as written. */
export function fillSupportScript(text: string, locale: "en" | "sw", f: SupportFigures): string {
  const values: Record<string, string> = {
    window: durationHours(locale, f.objectionHours),
    notBefore: f.objectionNotBefore,
    cap: f.withdrawalCap,
    fee: f.withdrawalFee,
    email: f.supportEmail,
    days: String(f.answerDays),
  };
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/**
 * The script that fits a ticket as the desk sees it, or null when no single script does: a ticket still running, a
 * cancelled one (its price came back at the cancel, so not even a voided week's refund is its story), and a FORFEITED
 * share — Compliance's own decision, which Compliance explains (never "under review").
 */
export function scriptForTicket(t: { shown: string; share: string | null; weekState: string }): SupportScriptKey | null {
  if (t.shown === "cancelled") return null;
  if (t.weekState === "VOIDED" || t.shown === "refunded") return "weekVoid";
  if (t.shown === "won") return t.share === "paid" ? "win" : t.share === "held" ? "heldShare" : null;
  if (t.shown === "lost") return "loss";
  return null;
}
