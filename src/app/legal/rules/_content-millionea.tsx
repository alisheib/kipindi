/**
 * THE MASWALI MILLIONEA GAME RULES — the binding player rules of the weekly ticket (MASWALI-BUILD S6 item 10; MASWALI-PLAN
 * §3 MR-1…MR-32, §8 MB-69 and MB-70; the law is `docs/RULES.md` §2.12).
 *
 * ⛔ RENDERED FROM THE LAW, NEVER FROM A HAND-OUT. `docs/RULES.md` §2.12 states the rule set; this document says the
 *    same things to a player, in the order a player meets them. Where the August proposal and the management PDF differ
 *    from the law, the law wins: the PDF's rule 3 ("reserves are not answered") is false (R-RESERVES: all fifteen are
 *    answered), so this text states the opposite in §3, and `test:terms-cancellation` §4 refuses its return (MB-70).
 * ⛔ EVERY FIGURE IS A PARAMETER (L2: admins can change everything). The page hands in the reader's week as its own record
 *    holds it — the rules it froze at its open, its open and close from its row, the void hours its questions carry
 *    (`millionea-legal.ts`, review #8) — or, with no week current, the rules the next will freeze (`millioneaHowTo`); the
 *    two worked examples are the settlement's own arithmetic over those rules (`millioneaExamplesFor`). An example the
 *    rules cannot show truthfully arrives as null and is left out, never bent.
 * ⛔ IT STATES ONLY WHAT THE SYSTEM DOES (the lead, round 2). A rule of the plan that is not built yet — the per-question
 *    objection (MB-23), the regulator's stop and a Compliance week void for a fault (OD-26) — is left out until it is,
 *    and `test:maswali-fairness` L.13 refuses its words in every language.
 * ⛔ THE ANSWERS ARE THE PRODUCT'S OWN WORDS (`sideWordIn(…, "MASWALI")`: NDIO/HAPANA, 是/否) and the weekdays the
 *    dictionary's (`millionea.weekdays`), so this text and every Millionea screen cannot name them differently.
 * ⛔ BINDING TEXT. `MILLIONEA_RULES_TEXT_SHA` (`src/lib/millionea-rules-version.ts`) pins a hash of `millioneaContent` below
 *    and of the binding-language sentence; the text cannot move without the version moving with it.
 * ⛔ OF THE ACCOUNTS BARRED FROM BUYING (MR-10), THIS TEXT NAMES THE STAFF ROLE ONLY (D19, `docs/HOUSE-BOTS.md`).
 */
import type { Locale } from "@/lib/i18n-server";
import type { MillioneaRulesFigures } from "@/lib/server/millionea-legal";
import { dict } from "@/lib/i18n-dict";
import { sideWordIn } from "@/lib/side-label";
import { LegalSection } from "../_components";
import { RulesTable, tzs } from "./_shared";

export type { MillioneaRulesFigures };

/** A weekday in the reader's language, from the one list every Millionea screen reads. */
const dayOf = (l: Locale, weekday: number): string => dict[l].millionea.weekdays[weekday - 1] ?? "";

/**
 * Money in legal prose: the one money format, set as a figure that never breaks. ⚠️ A FUNCTION RETURNING THE SPAN, NOT A
 * COMPONENT: `LegalSection`'s figure pass (`legalFigures`, `_components.tsx`) leaves an element alone only when its own
 * `className` carries `font-mono`, so a component's span would be re-split figure by figure inside it.
 */
const m = (v: number) => <span className="font-mono tabular-nums text-text whitespace-nowrap">{tzs(v)}</span>;
/** A bare figure (a count, a time, a percentage, a code) in the prose's figure face — the same reason as `m`. */
const n = (x: React.ReactNode) => <span className="font-mono tabular-nums text-text">{x}</span>;

export function millioneaContent(r: MillioneaRulesFigures): Record<Locale, React.ReactNode> {
  const yes = { en: sideWordIn("en", "YES", "MASWALI"), sw: sideWordIn("sw", "YES", "MASWALI"), zh: sideWordIn("zh", "YES", "MASWALI") };
  const no = { en: sideWordIn("en", "NO", "MASWALI"), sw: sideWordIn("sw", "NO", "MASWALI"), zh: sideWordIn("zh", "NO", "MASWALI") };
  const shared = r.examples.shared, floorWeek = r.examples.floorWeek;
  const sf = shared?.figures, ff = floorWeek?.figures;
  const day = {
    en: { open: dayOf("en", r.openWeekday), close: dayOf("en", r.closeWeekday), final: dayOf("en", r.finalDeadlineWeekday) },
    sw: { open: dayOf("sw", r.openWeekday), close: dayOf("sw", r.closeWeekday), final: dayOf("sw", r.finalDeadlineWeekday) },
    zh: { open: dayOf("zh", r.openWeekday), close: dayOf("zh", r.closeWeekday), final: dayOf("zh", r.finalDeadlineWeekday) },
  };

  return {
    en: (
      <>
        <LegalSection n="1" title="Introduction and scope">
          <p>
            Maswali Millionea (&ldquo;Millionea&rdquo;) is a weekly game of fifteen questions. You buy a ticket at a fixed
            price and answer all fifteen {yes.en} or {no.en}; every ticket with all ten counted answers right shares that
            week&apos;s jackpot equally (in a final week that no ticket wins, the highest score shares it — section 11). It is
            not a market with two sides, and it is not a casino product.
          </p>
          <p>
            The service is operated by 50pick Ltd, under licence from the Gaming Board of Tanzania, licence number{" "}
            {n(r.licence)}. The questions, their sources and each week&apos;s schedule are set by 50pick Management.
          </p>
          <p>
            These rules bind a ticket from the moment it is bought: the version published here when you buy a ticket
            applies to that ticket. A week&apos;s figures are frozen when the week opens, so a change applies from the next
            week, never to a week already running. The Terms of Service govern your account, your wallet and everything
            these rules do not cover.
          </p>
          <p>
            {r.source === "WEEK"
              ? <>The week&apos;s own figures in these rules are those Week {n(r.weekCode)} froze when it opened, with its open and close as they stand now (section 2); the withdrawal fee is the platform&apos;s current one (section 7).</>
              : <>No week is on sale or being graded right now: the figures in these rules are today&apos;s settings, and a week&apos;s own figures are fixed when it opens, its close excepted (section 2).</>}
          </p>
        </LegalSection>

        <LegalSection n="2" title="The week">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Sales.</strong>{" "}
              {r.source === "WEEK"
                ? <>Week {n(r.weekCode)} went on sale on {day.en.open} {n(r.openAt)} EAT, when an officer opened it, and its close is {day.en.close} {n(r.closeAt)} EAT.</>
                : <>A week sells from the moment an officer opens it — by default {day.en.open} {n(r.openAt)} EAT — to its close, by default {day.en.close} {n(r.closeAt)} EAT.</>}{" "}
              Each week&apos;s own page shows its close, and that close applies. The close is always at least{" "}
              {n(r.minLockBufferMinutes)} minutes before the earliest of the week&apos;s fifteen events. An officer may move it
              only while the week is on sale, never past the start of an event and never once it has passed.
            </li>
            <li>
              <strong className="text-text">The close is absolute.</strong> After it, no ticket can be bought and no ticket
              can be cancelled.
            </li>
            <li>
              <strong className="text-text">The questions are fixed when sales open.</strong> Their wording in English,
              Swahili and Chinese, their criteria, sources and times cannot change afterwards, and a fingerprint of the
              whole set is published at that moment (section 10). Each question names its source, a fallback source where
              it has one, and its void deadline (section 5).
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="3" title="The ticket">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Price.</strong> A ticket costs {m(r.ticketPrice)}, paid from your main
              balance only: bonus money never buys a ticket.
            </li>
            <li>
              <strong className="text-text">All fifteen are answered.</strong> Before you pay, you answer all fifteen
              questions {yes.en} or {no.en} — ten main questions and five reserves, A1 to A5, in a fixed order. A ticket
              with any question unanswered cannot be bought, and its answers cannot be changed once it is bought.
            </li>
            <li>
              <strong className="text-text">The cap.</strong> You may hold at most {n(r.ticketCap)} tickets in one
              week; a cancelled ticket does not count. Two of your tickets may carry the same answers.
            </li>
            <li>
              <strong className="text-text">Who may buy.</strong> Players must be 18 or older and resident in Tanzania.
              Accounts that hold a staff role may not buy tickets. Every responsible-gambling control on your account
              applies to a purchase, and a ticket bought before a self-exclusion still settles.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="4" title="How a ticket is graded">
          <p>
            Each question is settled {yes.en}, {no.en} or void. A ticket scores the counted questions it answered
            correctly.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">The counted questions.</strong> They are the ten main questions that did not
              void. For each main question that voids, the first reserve that has not voided and has not already been used
              counts instead, in order from A1 to A5; a voided reserve is skipped. Which reserve stands in for which main
              question is shown on the week&apos;s register; the set of counted questions depends only on which questions
              voided.
            </li>
            <li>
              <strong className="text-text">The win.</strong> A ticket wins only when all ten counted answers are right
              — 10 of 10 — except in a final week that no ticket wins (section 11).
            </li>
            <li>
              <strong className="text-text">The week void.</strong> If more main questions void than there are valid
              reserves to replace them, the whole week is voided and every ticket is refunded in full, {m(r.ticketPrice)}.
              No fee is taken, and the jackpot carried in is untouched: it waits for the next week.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="5" title="Void grounds and void deadlines">
          <p>A question is voided only on one of these grounds, published on the register with its evidence:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>it was not played, or not finished, by its void deadline;</li>
            <li>it was abandoned, with no official result;</li>
            <li>neither its source nor its named fallback gave a reading by the deadline;</li>
            <li>its outcome was settled in public, or its event had begun, before the sales close;</li>
            <li>it was materially wrong, or its English and Swahili texts differed; found before the close, or after it and before the check window ends (section 6).</li>
          </ul>
          <p>
            {r.voidDeadlineHours !== null
              ? <>A question&apos;s void deadline is {n(r.voidDeadlineHours)} hours after its scheduled start, and never later than {day.en.final} {n(r.finalDeadlineAt)} EAT of the week after the close.</>
              : <>A question&apos;s void deadline is never later than {day.en.final} {n(r.finalDeadlineAt)} EAT of the week after the close.</>}{" "}
            It is printed on the question, and the deadline printed there applies. A voided question is voided for every
            ticket, and the reserves apply.
          </p>
        </LegalSection>

        <LegalSection n="6" title="Results, the check window and settlement">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Results.</strong> An officer sets each question&apos;s result from its named
              source and records the evidence; where two-officer authorisation is switched on when the result is set, a
              second officer confirms it. A computer may suggest a result, never set one.
            </li>
            <li>
              <strong className="text-text">The check window.</strong> Once the counted questions are final, a check
              window of {n(r.objectionWindowHours)} hours opens, and it never closes before {n(r.objectionNotBeforeAt)}{" "}
              EAT. No payout is made while it is open. During it, a holder of an uncancelled ticket in the week who believes a
              result is wrong may raise it with support, naming the question. Until the window closes, the officer who set a
              result may correct it, recording the evidence; the corrected result is confirmed by a second officer whenever
              the original seal needed one. The window then starts again once the corrected results are final.
            </li>
            <li>
              <strong className="text-text">Settlement.</strong> After the window an accounting officer releases the
              payout, and each winning ticket&apos;s share is credited to its owner&apos;s main balance. Every figure is
              published on the week&apos;s register. A settled week is final.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="7" title="The money">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">The jackpot</strong> is the week&apos;s ticket sales plus the jackpot carried
              in from earlier weeks.
              {r.floor > 0 && (
                <>
                  {" "}In a week with a 10 of 10 ticket it is never less than {m(r.floor)}, counted before the fee:
                  50pick tops it up to that floor from its own guarantee. The top-up is paid only in such a week, and it
                  never carries forward.
                </>
              )}
            </li>
            <li>
              <strong className="text-text">Our fee</strong> is {n(<>{r.feePct}%</>)} of the jackpot, taken only in a week
              with at least one winning ticket. TRA&apos;s {n(<>{r.traPct}%</>)} and GBT&apos;s {n(<>{r.gbtPct}%</>)} come out of
              our fee, never out of a winner&apos;s share.
            </li>
            <li>
              <strong className="text-text">Equal shares.</strong> Each winning ticket receives the same share: the
              jackpot less our fee, divided by the number of winning tickets, rounded down to the shilling. The rounding
              remainder — always less than one shilling per winning ticket — joins the next jackpot
              {r.floor > 0 && <> as far as the week&apos;s own money covers it</>} (in a final week it stays in the jackpot
              account, section 11){r.floor > 0 && <>; the rest stays with the guarantee, whose top-up covers only the fee and the shares — so in a week the guarantee tops up, the whole remainder stays with it</>}.
            </li>
            <li>
              <strong className="text-text">No winner.</strong> If no ticket wins, nothing is charged: the whole of the
              week&apos;s sales and the jackpot carried in go forward to the next week&apos;s jackpot, with no limit on how
              far it can grow — except in a final week (section 11).
            </li>
            <li>
              <strong className="text-text">A share is not a return on a stake.</strong> When many tickets win, a share
              can be smaller than the ticket price.
            </li>
            <li>
              <strong className="text-text">Withdrawing</strong> winnings follows the platform&apos;s usual steps and limits
              and carries its withdrawal fee of {n(<>{r.withdrawalFeePct}%</>)}. Nothing else is charged.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="8" title="Worked examples">
          {shared && sf?.kind === "PAYOUT" && (
            <>
              <p>
                A fresh week, nothing carried in: {n(shared.tickets)} tickets are sold and {n(shared.winners)} of
                them reach 10 of 10.
              </p>
              <RulesTable
                label="Worked example — a shared jackpot"
                head={["Line", "Amount"]}
                rows={[
                  [`Ticket sales (${shared.tickets} × ${tzs(r.ticketPrice)})`, tzs(shared.sales)],
                  ["Jackpot", tzs(sf.J)],
                  [`Our fee (${r.feePct}%)`, tzs(sf.F)],
                  ["…of which TRA · GBT", `${tzs(sf.tra)} · ${tzs(sf.gbt)}`],
                  [`Shared by ${shared.winners} winning tickets`, tzs(sf.J - sf.F)],
                  ["Each winning ticket", tzs(sf.share)],
                  ["Rounding remainder, to the next jackpot", tzs(sf.dust)],
                ]}
              />
              <p>
                Had no ticket reached 10 of 10, nothing would have been charged, and the whole {m(shared.sales)} would
                have gone forward to the next week&apos;s jackpot.
              </p>
            </>
          )}
          {floorWeek && ff?.kind === "PAYOUT" && (
            <>
              <p>
                A quiet week, nothing carried in: {n(floorWeek.tickets)} tickets are sold and one of them reaches 10 of
                10, so the floor applies.
              </p>
              <RulesTable
                label="Worked example — a floor week"
                head={["Line", "Amount"]}
                rows={[
                  [`Ticket sales (${floorWeek.tickets} × ${tzs(r.ticketPrice)})`, tzs(floorWeek.sales)],
                  ["Floor top-up, from 50pick's guarantee", tzs(ff.U)],
                  ["Jackpot (the floor)", tzs(ff.J)],
                  [`Our fee (${r.feePct}%)`, tzs(ff.F)],
                  ["The one winning ticket", tzs(ff.share)],
                ]}
              />
            </>
          )}
          {!(shared && sf?.kind === "PAYOUT") && !(floorWeek && ff?.kind === "PAYOUT") && (
            <p>Every week&apos;s figures, to the shilling, are on its register once its results are final.</p>
          )}
        </LegalSection>

        <LegalSection n="9" title="Cancelling a ticket">
          <p>
            You may cancel a ticket for a full refund of {m(r.ticketPrice)} within {n(r.freeCancelMinutes)} minutes
            of buying it, provided at least {n(r.freeCancelMinutes)} minutes of sales remained when you bought it. So a
            ticket bought in the last {n(r.freeCancelMinutes)} minutes before the close can never be cancelled, and no
            ticket can be cancelled after the close.
          </p>
          <p>
            A cancelled ticket leaves the week&apos;s count, its commitment and its grading. There is no paid exit: a ticket
            cannot be sold back in any other way.
          </p>
        </LegalSection>

        <LegalSection n="10" title="Fairness and checking your ticket">
          <p>
            When sales open, a fingerprint (an SHA-256 hash) of the fifteen questions is published. When they close, one
            root over the fingerprints of every ticket still standing is published with their count and the close time;
            after that no ticket can be added, removed or changed without the root changing. A ticket&apos;s fingerprint is
            made from its week id and its ticket id (both shown on its proof), a secret salt
            and its fifteen answers. The salt is shown only to the
            ticket&apos;s owner, so nobody can work out anyone&apos;s answers from what is published.
          </p>
          <p>
            The owner of a ticket can see the proof that their ticket is inside that root and check it themselves; the
            Fairness page explains how.
          </p>
        </LegalSection>

        <LegalSection n="11" title="If Millionea ends">
          <p>50pick retires Millionea through a final week, named in one of three ways:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              a planned final week, named at least a full week before its sales open: from then on the Millionea page and
              its card on the home page name it, and its sales open no earlier than the time announced;
            </li>
            <li>a stop ordered while a week is on sale: that week becomes the final week;</li>
            <li>
              a stop ordered while no week is on sale and a week&apos;s results are being decided — its sales closed, the
              week not yet settled: that week settles under its own rules — a week without a 10 of 10 rolls over as always — and the next week to
              open becomes the final week; its buyers are told when they buy.
            </li>
          </ul>
          <p>
            A stop ordered between weeks, while no week is on sale or being decided, is a planned final week: it is named
            at least a full week before its sales open.
          </p>
          <p>
            The final week runs normally and everything the jackpot holds goes into it. If no ticket reaches 10 of 10, the
            jackpot is shared equally among the tickets with the highest score; our fee applies to that payout, and the
            floor top-up only if a ticket reaches 10 of 10. If the final week voids or sells nothing, the next week to open
            becomes the final one. After a final week that ran, no public week opens again, and what the jackpot account
            still holds — a rounding remainder, or a share forfeited after review — stays in it.
          </p>
        </LegalSection>

        <LegalSection n="12" title="Fair play, disputes and responsible play">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Fair play.</strong> Buying through more than one account, acting with others
              to get round the cap, or using bots or scripts to buy, is prohibited. It may lead to a winning share being
              held and, after review, forfeited, to accounts being suspended and — where applicable — to referral to the
              authorities. A forfeited share goes back to the jackpot, never to 50pick.
            </li>
            <li>
              <strong className="text-text">Disputes.</strong> A result you believe is wrong is raised with support in the
              check window (section 6). You may also raise any other dispute with support at any time; it is reviewed against the recorded
              evidence and the audit chain, and the outcome is given to you in writing.
            </li>
            <li>
              <strong className="text-text">Responsible play.</strong> Millionea is entertainment, not an income source.
              Deposit limits, time limits, cooling-off and self-exclusion are on your profile. If play stops being fun,
              stop. 18+.
            </li>
            <li>
              <strong className="text-text">Acceptance.</strong> Buying a ticket is full acceptance of these rules as
              published at the moment you buy it.
            </li>
          </ul>
        </LegalSection>
      </>
    ),

    sw: (
      <>
        <LegalSection n="1" title="Utangulizi na upeo">
          <p>
            Maswali Millionea (&ldquo;Millionea&rdquo;) ni mchezo wa kila wiki wa maswali kumi na tano. Unanunua tiketi kwa
            bei isiyobadilika na kujibu maswali yote kumi na tano {yes.sw} au {no.sw}; kila tiketi yenye majibu yote kumi
            yanayohesabiwa sahihi inagawana sawa jackpot ya wiki hiyo (katika wiki ya mwisho ambayo hakuna tiketi
            inayoshinda, tiketi zenye alama za juu zaidi zinagawana jackpot — kifungu cha 11). Si soko lenye pande mbili, na
            si mchezo wa kasino.
          </p>
          <p>
            Huduma inaendeshwa na 50pick Ltd, chini ya leseni kutoka Bodi ya Michezo ya Kubahatisha Tanzania, namba ya
            leseni {n(r.licence)}. Maswali, vyanzo vyake na ratiba ya kila wiki huwekwa na Uongozi wa 50pick.
          </p>
          <p>
            Kanuni hizi zinaifunga tiketi tangu inaponunuliwa: toleo lililochapishwa hapa unaponunua tiketi ndilo
            linalotumika kwa tiketi hiyo. Takwimu za wiki hufungwa wiki inapofunguliwa, hivyo mabadiliko yanaanza wiki
            inayofuata, kamwe si kwa wiki inayoendelea. Masharti ya Huduma yanasimamia akaunti yako, pochi yako na kila
            jambo ambalo kanuni hizi hazilielezi.
          </p>
          <p>
            {r.source === "WEEK"
              ? <>Takwimu za wiki yenyewe katika kanuni hizi ni zile ambazo Wiki {n(r.weekCode)} ilifunga ilipofunguliwa, pamoja na muda wake wa kufunguliwa na wa kufunga kama ulivyo sasa (kifungu cha 2); ada ya kutoa pesa ni ile ya sasa ya jukwaa (kifungu cha 7).</>
              : <>Hakuna wiki inayouzwa wala inayopimwa sasa hivi: takwimu za kanuni hizi ni mipangilio ya leo, na takwimu za wiki yenyewe hufungwa inapofunguliwa, isipokuwa muda wake wa kufunga (kifungu cha 2).</>}
          </p>
        </LegalSection>

        <LegalSection n="2" title="Wiki">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Mauzo.</strong>{" "}
              {r.source === "WEEK"
                ? <>Wiki {n(r.weekCode)} ilianza kuuzwa {day.sw.open} {n(r.openAt)} EAT, afisa alipoifungua, na muda wake wa kufunga ni {day.sw.close} {n(r.closeAt)} EAT.</>
                : <>Wiki inauza tangu afisa anapoifungua — kwa kawaida {day.sw.open} {n(r.openAt)} EAT — hadi inapofungwa, kwa kawaida {day.sw.close} {n(r.closeAt)} EAT.</>}{" "}
              Ukurasa wa kila wiki unaonyesha muda wake wa kufunga, na huo unatumika. Kufunga huwa angalau dakika{" "}
              {n(r.minLockBufferMinutes)} kabla ya tukio la mapema zaidi kati ya matukio kumi na tano ya wiki. Afisa anaweza
              kusogeza muda wa kufunga tu wakati wiki bado inauzwa, kamwe usipite mwanzo wa tukio lolote na kamwe baada ya
              muda huo kupita.
            </li>
            <li>
              <strong className="text-text">Kufungwa kwa mauzo ni kwa mwisho.</strong> Baada yake, hakuna tiketi inayoweza
              kununuliwa na hakuna tiketi inayoweza kughairiwa.
            </li>
            <li>
              <strong className="text-text">Maswali yanafungwa mauzo yanapofunguliwa.</strong> Maneno, vigezo, vyanzo na
              nyakati za maswali — kwa Kiingereza, Kiswahili na Kichina — hayabadiliki baada ya hapo, na alama ya kidijitali
              (hash) ya seti nzima inachapishwa wakati huo (kifungu cha 10). Kila swali linataja chanzo chake, chanzo
              mbadala pale kilipo, na muda wake wa mwisho wa kubatilisha (kifungu cha 5).
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="3" title="Tiketi">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Bei.</strong> Tiketi ni {m(r.ticketPrice)}, inayolipwa kutoka salio lako
              kuu pekee: fedha za bonasi haziwezi kamwe kununua tiketi.
            </li>
            <li>
              <strong className="text-text">Maswali yote kumi na tano yanajibiwa.</strong> Kabla ya kulipa, unajibu maswali
              yote kumi na tano {yes.sw} au {no.sw} — maswali makuu kumi na akiba tano, A1 hadi A5, kwa mpangilio maalum.
              Tiketi yenye swali lolote ambalo halijajibiwa haiwezi kununuliwa, na majibu yake hayawezi kubadilishwa
              baada ya kununuliwa.
            </li>
            <li>
              <strong className="text-text">Kikomo.</strong> Unaweza kuwa na tiketi zisizozidi {n(r.ticketCap)} katika
              wiki moja; tiketi iliyoghairiwa haihesabiwi. Tiketi zako mbili zinaweza kuwa na majibu yale yale.
            </li>
            <li>
              <strong className="text-text">Nani anaweza kununua.</strong> Wachezaji lazima wawe na umri wa miaka 18 au
              zaidi na wakazi wa Tanzania. Akaunti zenye nafasi ya mtumishi haziwezi kununua tiketi. Kila kidhibiti cha
              mchezo salama kwenye akaunti yako kinatumika kwa ununuzi, na tiketi iliyonunuliwa kabla ya kujitenga bado
              inakamilishwa.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="4" title="Jinsi tiketi inavyopimwa">
          <p>
            Kila swali hutatuliwa {yes.sw}, {no.sw} au batili. Tiketi inapata alama kwa maswali yanayohesabiwa iliyoyajibu
            sahihi.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Maswali yanayohesabiwa.</strong> Ni maswali makuu kumi ambayo hayakubatilishwa.
              Kwa kila swali kuu linalobatilishwa, akiba ya kwanza ambayo haijabatilishwa na haijatumika inahesabiwa
              badala yake, kwa mpangilio kuanzia A1 hadi A5; akiba batili inarukwa. Akiba ipi inasimama badala ya swali
              kuu lipi inaonyeshwa kwenye daftari la wiki; seti ya maswali yanayohesabiwa inategemea tu maswali yapi
              yalibatilishwa.
            </li>
            <li>
              <strong className="text-text">Ushindi.</strong> Tiketi inashinda tu majibu yote kumi yanayohesabiwa
              yakiwa sahihi — 10 kati ya 10 — isipokuwa katika wiki ya mwisho ambayo hakuna tiketi inayoshinda (kifungu
              cha 11).
            </li>
            <li>
              <strong className="text-text">Kubatilishwa kwa wiki.</strong> Maswali makuu yaliyobatilishwa yakizidi akiba
              halali zinazoweza kuchukua nafasi zao, wiki nzima inabatilishwa na kila tiketi inarejeshwa kamili, {m(r.ticketPrice)}.
              Hakuna ada inayotozwa, na jackpot iliyoletwa mbele haiguswi: inasubiri wiki inayofuata.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="5" title="Sababu za ubatili na muda wa mwisho wa kubatilisha">
          <p>Swali hubatilishwa tu kwa mojawapo ya sababu hizi, inayochapishwa kwenye daftari pamoja na ushahidi wake:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>halikuchezwa, au halikumalizika, kufikia muda wake wa mwisho wa kubatilisha;</li>
            <li>lilisitishwa, bila matokeo rasmi;</li>
            <li>chanzo chake wala chanzo mbadala kilichotajwa hakikutoa usomaji kufikia muda wa mwisho;</li>
            <li>matokeo yake yalijulikana hadharani, au tukio lake lilianza, kabla ya mauzo kufungwa;</li>
            <li>lilikuwa na kosa kubwa, au maandishi yake ya Kiingereza na Kiswahili yalitofautiana; ikagundulika kabla ya kufunga, au baada yake na kabla ya muda wa ukaguzi kuisha (kifungu cha 6).</li>
          </ul>
          <p>
            {r.voidDeadlineHours !== null
              ? <>Muda wa mwisho wa kubatilisha swali ni saa {n(r.voidDeadlineHours)} baada ya mwanzo wake uliopangwa, na kamwe si baada ya {day.sw.final} {n(r.finalDeadlineAt)} EAT ya wiki inayofuata baada ya kufunga.</>
              : <>Muda wa mwisho wa kubatilisha swali kamwe si baada ya {day.sw.final} {n(r.finalDeadlineAt)} EAT ya wiki inayofuata baada ya kufunga.</>}{" "}
            Unachapishwa kwenye swali, na muda uliochapishwa hapo unatumika. Swali lililobatilishwa linabatilishwa kwa kila
            tiketi, na akiba zinatumika.
          </p>
        </LegalSection>

        <LegalSection n="6" title="Matokeo, muda wa ukaguzi na ukamilishaji">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Matokeo.</strong> Afisa huweka matokeo ya kila swali kutoka chanzo chake
              kilichotajwa na kuandika ushahidi; pale idhini ya maafisa wawili imewashwa wakati matokeo yanapowekwa, afisa
              wa pili huyathibitisha.
              Kompyuta inaweza kupendekeza matokeo, lakini kamwe haiyaweki.
            </li>
            <li>
              <strong className="text-text">Muda wa ukaguzi.</strong> Maswali yanayohesabiwa yakishakuwa ya mwisho, muda wa
              ukaguzi wa saa {n(r.objectionWindowHours)} unafunguliwa, na kamwe haufungwi kabla ya{" "}
              {n(r.objectionNotBeforeAt)} EAT. Hakuna malipo yanayofanywa muda huo ukiwa wazi. Katika muda huo, mwenye
              tiketi ya wiki hiyo ambayo haijaghairiwa, anayeamini kwamba matokeo ni makosa, anaweza kuwasilisha suala hilo
              kwa msaada, akitaja swali husika. Hadi muda huo unapofungwa, afisa aliyeweka matokeo anaweza kuyarekebisha,
              akiandika ushahidi; matokeo yaliyorekebishwa yanahitaji idhini ya afisa wa pili kila mara muhuri wa awali
              ulipoihitaji. Kisha muda huo unaanza upya matokeo yaliyorekebishwa yakishakuwa ya mwisho.
            </li>
            <li>
              <strong className="text-text">Ukamilishaji.</strong> Baada ya muda huo afisa wa uhasibu huidhinisha malipo, na
              sehemu ya kila tiketi iliyoshinda inaingizwa kwenye salio kuu la mwenye tiketi. Kila takwimu inachapishwa
              kwenye daftari la wiki. Wiki iliyokamilika ni ya mwisho.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="7" title="Fedha">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Jackpot</strong> ni mauzo ya tiketi ya wiki pamoja na jackpot iliyoletwa mbele
              kutoka wiki zilizopita.
              {r.floor > 0 && (
                <>
                  {" "}Katika wiki yenye tiketi ya 10 kati ya 10 haipungui kamwe {m(r.floor)}, ikihesabiwa kabla ya
                  ada: 50pick huiongeza hadi kiwango hicho kutoka dhamana yake. Nyongeza ya dhamana hulipwa tu katika wiki
                  kama hiyo, na kamwe hailetwi mbele.
                </>
              )}
            </li>
            <li>
              <strong className="text-text">Ada yetu</strong> ni {n(<>{r.feePct}%</>)} ya jackpot, inayochukuliwa tu katika
              wiki yenye angalau tiketi moja iliyoshinda. {n(<>{r.traPct}%</>)} ya TRA na {n(<>{r.gbtPct}%</>)} ya GBT
              hutolewa kutoka ada yetu, kamwe si kutoka sehemu ya mshindi.
            </li>
            <li>
              <strong className="text-text">Sehemu sawa.</strong> Kila tiketi iliyoshinda inapata sehemu ile ile: jackpot
              ukiondoa ada yetu, ikigawanywa kwa idadi ya tiketi zilizoshinda, ikishushwa hadi shilingi kamili. Salio la
              mgawanyo — daima chini ya shilingi moja kwa kila tiketi iliyoshinda — linaongezwa kwenye jackpot inayofuata
              {r.floor > 0 && <> kadiri fedha za wiki yenyewe zinavyolifikia</>} (katika wiki ya mwisho linabaki kwenye akaunti
              ya jackpot, kifungu cha 11){r.floor > 0 && <>; kinachobaki kinabaki kwenye dhamana, ambayo nyongeza yake hulipa ada na sehemu tu — hivyo katika wiki ambayo dhamana inaiongezea, salio lote linabaki kwenye dhamana</>}.
            </li>
            <li>
              <strong className="text-text">Hakuna mshindi.</strong> Hakuna tiketi ikishinda, hakuna kinachotozwa: mauzo
              yote ya wiki na jackpot iliyoletwa mbele vinaenda kwenye jackpot ya wiki inayofuata, bila kikomo cha
              kukua kwake — isipokuwa katika wiki ya mwisho (kifungu cha 11).
            </li>
            <li>
              <strong className="text-text">Sehemu si marejesho ya dau.</strong> Tiketi nyingi zikishinda, sehemu moja
              inaweza kuwa ndogo kuliko bei ya tiketi.
            </li>
            <li>
              <strong className="text-text">Kutoa</strong> ushindi kunafuata hatua na mipaka ya kawaida ya jukwaa na kuna
              ada yake ya kutoa pesa ya {n(<>{r.withdrawalFeePct}%</>)}. Hakuna kingine kinachotozwa.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="8" title="Mifano ya hesabu">
          {shared && sf?.kind === "PAYOUT" && (
            <>
              <p>
                Wiki mpya, bila kitu kilicholetwa mbele: tiketi {n(shared.tickets)} zinauzwa na {n(shared.winners)}{" "}
                kati yake zinafikia 10 kati ya 10.
              </p>
              <RulesTable
                label="Mfano wa hesabu — jackpot inayogawanywa"
                head={["Mstari", "Kiasi"]}
                rows={[
                  [`Mauzo ya tiketi (${shared.tickets} × ${tzs(r.ticketPrice)})`, tzs(shared.sales)],
                  ["Jackpot", tzs(sf.J)],
                  [`Ada yetu (${r.feePct}%)`, tzs(sf.F)],
                  ["…ambapo TRA · GBT", `${tzs(sf.tra)} · ${tzs(sf.gbt)}`],
                  [`Inagawanywa na tiketi ${shared.winners} zilizoshinda`, tzs(sf.J - sf.F)],
                  ["Kila tiketi iliyoshinda", tzs(sf.share)],
                  ["Salio la mgawanyo, kwenda jackpot inayofuata", tzs(sf.dust)],
                ]}
              />
              <p>
                Kama hakuna tiketi iliyofikia 10 kati ya 10, hakuna kingetozwa, na {m(shared.sales)} yote ingeenda
                kwenye jackpot ya wiki inayofuata.
              </p>
            </>
          )}
          {floorWeek && ff?.kind === "PAYOUT" && (
            <>
              <p>
                Wiki tulivu, bila kitu kilicholetwa mbele: tiketi {n(floorWeek.tickets)} zinauzwa na moja kati yake
                inafikia 10 kati ya 10, hivyo dhamana ya chini inatumika.
              </p>
              <RulesTable
                label="Mfano wa hesabu — wiki ya dhamana ya chini"
                head={["Mstari", "Kiasi"]}
                rows={[
                  [`Mauzo ya tiketi (${floorWeek.tickets} × ${tzs(r.ticketPrice)})`, tzs(floorWeek.sales)],
                  ["Nyongeza ya dhamana, kutoka dhamana ya 50pick", tzs(ff.U)],
                  ["Jackpot (dhamana ya chini)", tzs(ff.J)],
                  [`Ada yetu (${r.feePct}%)`, tzs(ff.F)],
                  ["Tiketi moja iliyoshinda", tzs(ff.share)],
                ]}
              />
            </>
          )}
          {!(shared && sf?.kind === "PAYOUT") && !(floorWeek && ff?.kind === "PAYOUT") && (
            <p>Takwimu za kila wiki, hadi shilingi, ziko kwenye daftari lake matokeo yake yakishakuwa ya mwisho.</p>
          )}
        </LegalSection>

        <LegalSection n="9" title="Kughairi tiketi">
          <p>
            Unaweza kughairi tiketi na kurejeshewa kamili {m(r.ticketPrice)} ndani ya dakika {n(r.freeCancelMinutes)}{" "}
            baada ya kuinunua, ikiwa zilibaki angalau dakika {n(r.freeCancelMinutes)} za mauzo ulipoinunua. Hivyo tiketi
            iliyonunuliwa katika dakika {n(r.freeCancelMinutes)} za mwisho kabla ya kufunga haiwezi kamwe kughairiwa, na
            hakuna tiketi inayoweza kughairiwa baada ya kufunga.
          </p>
          <p>
            Tiketi iliyoghairiwa inaondoka kwenye hesabu ya wiki, kwenye uthibitisho wake na kwenye upimaji wake. Hakuna
            njia ya kutoka kwa malipo: tiketi haiwezi kuuzwa tena kwa njia nyingine yoyote.
          </p>
        </LegalSection>

        <LegalSection n="10" title="Uadilifu na kuthibitisha tiketi yako">
          <p>
            Mauzo yanapofunguliwa, alama ya kidijitali (hash ya SHA-256) ya maswali kumi na tano inachapishwa. Yanapofungwa,
            mzizi mmoja (root) wa alama za kidijitali za kila tiketi iliyobaki unachapishwa pamoja na idadi yake na muda wa
            kufunga; baada ya hapo hakuna tiketi inayoweza kuongezwa, kuondolewa au kubadilishwa bila mzizi kubadilika.
            Alama ya kidijitali ya tiketi inatengenezwa kutoka msimbo wa wiki yake na msimbo wa tiketi
            (yote miwili inaonyeshwa kwenye uthibitisho wake), nambari ya siri (salt) na majibu yake kumi na tano. Nambari ya siri inaonyeshwa kwa mwenye tiketi pekee, hivyo hakuna anayeweza kujua majibu ya
            mtu yeyote kutokana na kilichochapishwa.
          </p>
          <p>
            Mwenye tiketi anaweza kuona uthibitisho kwamba tiketi yake imo ndani ya mzizi huo na kuukagua mwenyewe; ukurasa
            wa Uadilifu unaeleza jinsi ya kufanya hivyo.
          </p>
        </LegalSection>

        <LegalSection n="11" title="Millionea ikifungwa">
          <p>50pick inaifunga Millionea kupitia wiki ya mwisho, inayotajwa kwa mojawapo ya njia tatu:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              wiki ya mwisho iliyopangwa, inayotajwa angalau wiki nzima kabla ya mauzo yake kufunguliwa: tangu hapo ukurasa
              wa Millionea na kadi yake kwenye ukurasa wa mwanzo huitaja, na mauzo yake hayafunguliwi kabla ya muda
              uliotangazwa;
            </li>
            <li>usimamishaji unaoamriwa wakati wiki inauzwa: wiki hiyo inakuwa wiki ya mwisho;</li>
            <li>
              usimamishaji unaoamriwa wakati hakuna wiki inayouzwa na matokeo ya wiki yanaamuliwa — mauzo yake
              yamefungwa, na wiki bado haijakamilika: wiki hiyo inakamilishwa kwa kanuni zake yenyewe — wiki isiyo na 10 kati ya 10 inaleta jackpot
              mbele kama kawaida — na wiki inayofuata kufunguliwa inakuwa wiki ya mwisho; wanunuzi wake wanaambiwa
              wanaponunua.
            </li>
          </ul>
          <p>
            Usimamishaji unaoamriwa kati ya wiki, wakati hakuna wiki inayouzwa wala ambayo matokeo yake yanaamuliwa, ni
            wiki ya mwisho iliyopangwa: inatajwa angalau wiki nzima kabla ya mauzo yake kufunguliwa.
          </p>
          <p>
            Wiki ya mwisho inaendeshwa kama kawaida na kila kitu kilicho kwenye jackpot kinaingia ndani yake. Hakuna tiketi
            ikifikia 10 kati ya 10, jackpot inagawanywa sawa kati ya tiketi zenye alama za juu zaidi; ada yetu inatumika
            kwa malipo hayo, na nyongeza ya dhamana tu ikiwa tiketi itafikia 10 kati ya 10. Wiki ya mwisho ikibatilishwa
            au isipouza chochote, wiki inayofuata kufunguliwa inakuwa ya mwisho. Baada ya wiki ya mwisho iliyoendeshwa,
            hakuna wiki ya umma inayofunguliwa tena, na kinachobaki kwenye akaunti ya jackpot — salio la mgawanyo, au sehemu
            iliyonyang&apos;anywa baada ya ukaguzi — kinabaki humo.
          </p>
        </LegalSection>

        <LegalSection n="12" title="Mchezo wa haki, malalamiko na mchezo salama">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Mchezo wa haki.</strong> Kununua kupitia akaunti zaidi ya moja, kushirikiana na
              wengine kukwepa kikomo, au kutumia roboti au skripti kununua, ni marufuku. Kunaweza kusababisha sehemu ya ushindi
              kushikiliwa na, baada ya ukaguzi, kunyang&apos;anywa, akaunti kusimamishwa na — inapohitajika — kupelekwa kwa
              mamlaka. Sehemu iliyonyang&apos;anywa inarudi kwenye jackpot, kamwe si kwa 50pick.
            </li>
            <li>
              <strong className="text-text">Malalamiko.</strong> Matokeo unayoamini kuwa ni makosa huwasilishwa kwa msaada
              katika muda wa ukaguzi (kifungu cha 6). Unaweza pia kuwasilisha malalamiko mengine yoyote kwa msaada wakati
              wowote; hukaguliwa dhidi ya
              ushahidi uliorekodiwa na mnyororo wa ukaguzi, na jibu hutolewa kwako kwa maandishi.
            </li>
            <li>
              <strong className="text-text">Mchezo salama.</strong> Millionea ni burudani, si chanzo cha mapato. Vikomo
              vya amana, vikomo vya muda, mapumziko na kujitenga vipo kwenye wasifu wako. Mchezo ukiacha kuwa wa
              kufurahisha, acha. Miaka 18+.
            </li>
            <li>
              <strong className="text-text">Kukubali.</strong> Kununua tiketi ni kukubali kikamilifu kanuni hizi kama
              zilivyochapishwa wakati unaponunua.
            </li>
          </ul>
        </LegalSection>
      </>
    ),

    zh: (
      <>
        <LegalSection n="1" title="导言与适用范围">
          <p>
            Maswali Millionea（&ldquo;Millionea&rdquo;）是每周一期、共十五道题的游戏。您以固定价格购买彩票，并以{yes.zh}或{no.zh}
            回答全部十五道题；凡十道计分题全部答对的彩票，平分该周的大奖（若最后一周无彩票中奖，则由得分最高的彩票平分——见第 11 条）。它不是双边市场，也不是赌场产品。
          </p>
          <p>
            本服务由 50pick Ltd 运营，持有坦桑尼亚博彩委员会颁发的牌照，牌照号 {n(r.licence)}。题目、其来源及每周的排期均由
            50pick 管理层设定。
          </p>
          <p>
            本规则自彩票购买之时起对该彩票具有约束力：您购买彩票时此处公布的版本适用于该彩票。每周的各项数值在该周开放时冻结，因此任何变更自下一周起适用，绝不适用于正在进行的一周。您的账户、钱包以及本规则未涉及的一切事项，均受《服务条款》约束。
          </p>
          <p>
            {r.source === "WEEK"
              ? <>本规则中该周自身的数值为第 {n(r.weekCode)} 周开放时冻结的数值，以及其当前的开放与截止时间（第 2 条）；提现手续费为平台当前的费率（第 7 条）。</>
              : <>目前没有正在销售或正在计分的周：本规则中的数值为当前设置；每周自身的数值在该周开放时确定，截止时间除外（第 2 条）。</>}
          </p>
        </LegalSection>

        <LegalSection n="2" title="每周安排">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">销售。</strong>
              {r.source === "WEEK"
                ? <>第 {n(r.weekCode)} 周于{day.zh.open} {n(r.openAt)} EAT 由官员开放并开始销售，其截止时间为{day.zh.close} {n(r.closeAt)} EAT。</>
                : <>每周自官员开放之时起销售——默认为{day.zh.open} {n(r.openAt)} EAT——至截止时止，默认截止时间为{day.zh.close} {n(r.closeAt)} EAT。</>}
              每周页面显示其截止时间，并以该时间为准。截止时间始终至少早于该周十五个赛事中最早一个赛事
              {n(r.minLockBufferMinutes)} 分钟。官员仅可在该周仍在销售时调整截止时间，绝不晚于任何赛事的开始，也绝不在截止时间过后调整。
            </li>
            <li>
              <strong className="text-text">截止即为终止。</strong>截止之后，任何彩票既不能购买，也不能取消。
            </li>
            <li>
              <strong className="text-text">题目在销售开放时固定。</strong>其英文、斯瓦希里文和中文表述、判定标准、来源与时间此后均不可更改，整套题目的指纹（哈希值）在该时刻公布（第 10 条）。每道题均写明其来源、如有则写明备用来源，以及其作废截止时间（第 5 条）。
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="3" title="彩票">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">价格。</strong>每张彩票 {m(r.ticketPrice)}，仅从您的主余额支付：奖金绝不能用于购买彩票。
            </li>
            <li>
              <strong className="text-text">十五道题全部作答。</strong>付款前，您须以{yes.zh}或{no.zh}回答全部十五道题——十道主题和五道备选题（A1 至 A5），顺序固定。任何一道题未作答的彩票不能购买，彩票一经购买，其答案不可更改。
            </li>
            <li>
              <strong className="text-text">上限。</strong>每周您最多持有 {n(r.ticketCap)} 张彩票；已取消的彩票不计入。您的两张彩票可以填写相同的答案。
            </li>
            <li>
              <strong className="text-text">谁可以购买。</strong>玩家须年满 18 周岁并居住于坦桑尼亚。持有员工角色的账户不得购买彩票。您账户上的每一项负责任博彩控制均适用于购买，在自我排除之前购买的彩票仍将结算。
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="4" title="彩票如何计分">
          <p>每道题以{yes.zh}、{no.zh}或作废结算。彩票的得分为其答对的计分题数量。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">计分题。</strong>即未作废的十道主题。每有一道主题作废，就由第一道既未作废、也尚未被使用的备选题替补计分，按 A1 至 A5 的顺序；作废的备选题跳过。哪道备选题替补哪道主题，显示在该周的登记册上；计分题的集合仅取决于哪些题目作废。
            </li>
            <li>
              <strong className="text-text">中奖。</strong>只有十道计分题全部答对——10/10——的彩票才中奖（无彩票中奖的最后一周除外，见第 11 条）。
            </li>
            <li>
              <strong className="text-text">整周作废。</strong>若作废的主题多于可替补的有效备选题，则整周作废，每张彩票全额退款 {m(r.ticketPrice)}。不收取任何费用，滚存而来的大奖不受影响，留待下一周。
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="5" title="作废理由与作废截止时间">
          <p>题目仅在以下理由之一成立时作废，作废理由连同证据公布于登记册：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>在其作废截止时间前未进行或未完成；</li>
            <li>已中止，且无官方结果；</li>
            <li>截止时间前，其来源及指定的备用来源均未给出读数；</li>
            <li>其结果在销售截止前已公开，或其赛事在销售截止前已开始；</li>
            <li>题目存在实质性错误，或其英文与斯瓦希里文表述不一致——于截止前发现，或于截止后、复核期结束前发现（第 6 条）。</li>
          </ul>
          <p>
            {r.voidDeadlineHours !== null
              ? <>题目的作废截止时间为其预定开始后 {n(r.voidDeadlineHours)} 小时，且绝不晚于截止后一周的{day.zh.final} {n(r.finalDeadlineAt)} EAT。</>
              : <>题目的作废截止时间绝不晚于截止后一周的{day.zh.final} {n(r.finalDeadlineAt)} EAT。</>}
            该时间印在题目上，并以印在题目上的时间为准。作废的题目对每张彩票均作废，并适用备选题。
          </p>
        </LegalSection>

        <LegalSection n="6" title="结果、复核期与结算">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">结果。</strong>官员依据题目指定的来源设定每道题的结果并记录证据；设定结果时若已启用双人授权，则由第二位官员确认。计算机可以建议结果，但绝不能设定结果。
            </li>
            <li>
              <strong className="text-text">复核期。</strong>计分题全部确定后，开放 {n(r.objectionWindowHours)} 小时的复核期，且绝不在 EAT{" "}
              {n(r.objectionNotBeforeAt)} 之前结束。复核期内不进行任何赔付。在此期间，持有该周未取消彩票的玩家如认为某题结果有误，可向客服提出并注明该题。复核期结束前，设定结果的官员可更正该结果并记录证据；原始结果需经第二位官员确认的，更正后的结果同样须由第二位官员确认。更正后的结果确定后，复核期重新开始。
            </li>
            <li>
              <strong className="text-text">结算。</strong>复核期结束后，由会计官员发放赔付，每张中奖彩票的份额计入其持有人的主余额。每一项数值均公布于该周的登记册。已结算的一周即为最终结果。
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="7" title="资金">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">大奖</strong>为该周的彩票销售额加上此前各周滚存而来的大奖。
              {r.floor > 0 && (
                <>
                  在有 10/10 彩票的一周，大奖绝不低于 {m(r.floor)}（在扣除费用前计算）：50pick 从其保底资金中补足至该金额。保底补足仅在这样的一周支付，且绝不滚存。
                </>
              )}
            </li>
            <li>
              <strong className="text-text">我们的费用</strong>为大奖的 {n(<>{r.feePct}%</>)}，仅在至少有一张中奖彩票的一周收取。TRA 的{" "}
              {n(<>{r.traPct}%</>)} 与 GBT 的 {n(<>{r.gbtPct}%</>)} 从我们的费用中扣除，绝不从中奖者的份额中扣除。
            </li>
            <li>
              <strong className="text-text">平均分配。</strong>每张中奖彩票获得相同的份额：大奖扣除我们的费用后，除以中奖彩票数，向下取整至先令。分配余数——每张中奖彩票始终不足一先令——{r.floor > 0 ? <>在该周自身资金所及的范围内并入下一期大奖（最后一周则留存于大奖账户，见第 11 条）；其余部分留在保底资金中，因为保底补足只支付费用与份额——因此在由保底资金补足的一周，全部余数留在保底资金中</> : <>并入下一期大奖（最后一周则留存于大奖账户，见第 11 条）</>}。
            </li>
            <li>
              <strong className="text-text">无人中奖。</strong>若无彩票中奖，则不收取任何费用：该周全部销售额及滚存而来的大奖全部滚存至下一周的大奖，增长不设上限（最后一周除外，见第 11 条）。
            </li>
            <li>
              <strong className="text-text">份额并非投注本金的回报。</strong>中奖彩票较多时，一份份额可能低于彩票价格。
            </li>
            <li>
              <strong className="text-text">提取</strong>奖金遵循平台的常规步骤与限额，并收取 {n(<>{r.withdrawalFeePct}%</>)}{" "}
              的提现手续费。不收取任何其他费用。
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="8" title="计算示例">
          {shared && sf?.kind === "PAYOUT" && (
            <>
              <p>
                全新的一周，无滚存：售出 {n(shared.tickets)} 张彩票，其中 {n(shared.winners)} 张达到 10/10。
              </p>
              <RulesTable
                label="计算示例——平分大奖"
                head={["项目", "金额"]}
                rows={[
                  [`彩票销售额（${shared.tickets} × ${tzs(r.ticketPrice)}）`, tzs(shared.sales)],
                  ["大奖", tzs(sf.J)],
                  [`我们的费用（${r.feePct}%）`, tzs(sf.F)],
                  ["……其中 TRA · GBT", `${tzs(sf.tra)} · ${tzs(sf.gbt)}`],
                  [`由 ${shared.winners} 张中奖彩票平分`, tzs(sf.J - sf.F)],
                  ["每张中奖彩票", tzs(sf.share)],
                  ["分配余数，并入下一期大奖", tzs(sf.dust)],
                ]}
              />
              <p>
                若没有彩票达到 10/10，则不收取任何费用，全部 {m(shared.sales)} 将滚存至下一周的大奖。
              </p>
            </>
          )}
          {floorWeek && ff?.kind === "PAYOUT" && (
            <>
              <p>
                较冷清的一周，无滚存：售出 {n(floorWeek.tickets)} 张彩票，其中一张达到 10/10，因此适用保底金额。
              </p>
              <RulesTable
                label="计算示例——保底周"
                head={["项目", "金额"]}
                rows={[
                  [`彩票销售额（${floorWeek.tickets} × ${tzs(r.ticketPrice)}）`, tzs(floorWeek.sales)],
                  ["保底补足，来自 50pick 的保底资金", tzs(ff.U)],
                  ["大奖（保底金额）", tzs(ff.J)],
                  [`我们的费用（${r.feePct}%）`, tzs(ff.F)],
                  ["唯一一张中奖彩票", tzs(ff.share)],
                ]}
              />
            </>
          )}
          {!(shared && sf?.kind === "PAYOUT") && !(floorWeek && ff?.kind === "PAYOUT") && (
            <p>每周的各项数值（精确到先令）在其结果确定后公布于该周的登记册。</p>
          )}
        </LegalSection>

        <LegalSection n="9" title="取消彩票">
          <p>
            您可以在购买彩票后 {n(r.freeCancelMinutes)} 分钟内取消并获全额退款 {m(r.ticketPrice)}，前提是购买时距销售截止至少还有{" "}
            {n(r.freeCancelMinutes)} 分钟。因此，在截止前最后 {n(r.freeCancelMinutes)} 分钟内购买的彩票永远不能取消，截止之后任何彩票都不能取消。
          </p>
          <p>已取消的彩票退出该周的计数、承诺与计分。不设付费退出：彩票不能以任何其他方式卖回。</p>
        </LegalSection>

        <LegalSection n="10" title="公平性与核验您的彩票">
          <p>
            销售开放时，十五道题的指纹（SHA-256 哈希值）即予公布。销售截止时，公布覆盖所有仍有效彩票指纹的一个根哈希，连同其数量与截止时间；此后，任何彩票的增加、删除或更改都必然导致根哈希改变。每张彩票的指纹由周编号与彩票编号（两者均显示在其证明页面上）、一个秘密盐值及其十五个答案生成。盐值仅向彩票持有人显示，因此任何人都无法从公布的信息推算出他人的答案。
          </p>
          <p>彩票持有人可以查看其彩票包含在该根哈希之内的证明并自行核验；公平性页面说明了核验方法。</p>
        </LegalSection>

        <LegalSection n="11" title="若 Millionea 停办">
          <p>50pick 通过最后一周停办 Millionea，最后一周以下列三种方式之一确定：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>计划中的最后一周，至少在其销售开放前一整周指定：自那时起，Millionea 页面及首页上的 Millionea 卡片即标明该周，且其销售不早于所公布的时间开放；</li>
            <li>在某周销售期间下令停办：该周即成为最后一周；</li>
            <li>在无周正在销售、且某周结果正在确定期间（其销售已截止、尚未结算）下令停办：该周按其自身规则结算——无 10/10 彩票的一周照常滚存——下一个开放的周成为最后一周，其购买者在购买时即获告知。</li>
          </ul>
          <p>在两周之间（既无正在销售的周，也无结果正在确定的周）下令停办，即为计划中的最后一周：须至少在其销售开放前一整周指定。</p>
          <p>
            最后一周照常进行，大奖中的全部资金均投入其中。若没有彩票达到 10/10，大奖由得分最高的彩票平分；该次赔付收取我们的费用，仅在有彩票达到 10/10 时才进行保底补足。若最后一周作废或未售出任何彩票，则下一个开放的周成为最后一周。最后一周进行完毕后，不再开放任何公开的周；大奖账户中剩余的资金——分配余数，或经审核后被没收的份额——留存于该账户中。
          </p>
        </LegalSection>

        <LegalSection n="12" title="公平游戏、争议与理性游戏">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">公平游戏。</strong>通过多个账户购买、与他人合谋规避上限，或使用机器人或脚本购买，均被禁止。上述行为可能导致中奖份额被暂扣并经审核后被没收、账户被停用，并在适用情形下移交主管机关。被没收的份额回归大奖，绝不归 50pick 所有。
            </li>
            <li>
              <strong className="text-text">争议。</strong>如您认为某题结果有误，请在复核期内向客服提出（第 6 条）。您也可随时就其他事项向客服提出争议；我们将对照所记录的证据与审计链进行复核，并以书面形式告知结果。
            </li>
            <li>
              <strong className="text-text">理性游戏。</strong>Millionea 是娱乐而非收入来源。个人资料页提供充值限额、时间限额、冷静期与自我排除工具。若游戏不再令人愉快，请停止。18+。
            </li>
            <li>
              <strong className="text-text">接受。</strong>购买彩票即表示完全接受您购买时所公布的本规则。
            </li>
          </ul>
        </LegalSection>
      </>
    ),
  };
}
