/**
 * THE YES/NO GAME RULES — binding player rules for the prediction-market product.
 *
 * ⭐ EXPORTED AS A FUNCTION OF ITS LIVE INPUTS, for the reason `legal/terms/page.tsx:52-56`
 * gives: binding prose inside a page component is beyond every scanner's reach, so the map is
 * exported and `scripts/rules-copy.test.mts` RENDERS it instead. Every rate arrives in `r`.
 *
 * ⛔ WHAT WAS CORRECTED FROM MARKETING'S SOURCE PDF, AND WHY — each was measured against live
 * production config on 2026-09-10, not assumed:
 *
 *  §3 *"Players do not submit markets."* — the platform links `/proposals` from the public
 *     footer as "Propose markets & get paid". The rule is now written so it is TRUE IN EVERY
 *     FEATURE STATE: Management lists every market, and a proposal is a suggestion rather than
 *     a market. It therefore never needs rewriting when the flag flips.
 *  §4 The cash-out right was MISSING and its Up/Down twin denied it outright. `/legal/terms` §4
 *     GRANTS it, so the rules document may not withdraw it. All three conditions are stated.
 *  §2 *"M-Pesa … only"* — `payments.control.provider` is `selcom`, an aggregator serving several
 *     networks. Naming one network as exclusive is wrong AND excludes players who are not on it.
 *  §4 The withdrawal fee was absent while the fee schedule read complete. Now stated.
 *  §2 Stake bounds were absent. Now stated, from config.
 *  §2 KYC was *"may request … at any time"*; Terms §3 makes it REQUIRED before depositing,
 *     betting or withdrawing. Understating a mandatory requirement is the wrong direction.
 *  §1 The licence number was absent. It reads from the pinned constant.
 */
import type { Locale } from "@/lib/i18n-server";
import { LegalSection } from "../_components";
import { LICENCE_NUMBER } from "@/lib/server/support-config";
import { sideWordIn } from "@/lib/side-label";
import {
  EXAMPLE_WIN_POOL,
  EXAMPLE_LOSE_POOL,
  RulesTable,
  workedRow,
  tzs,
  type RulesRates,
} from "./_shared";

/**
 * ⛔ THE TWO SIDES ARE NAMED BY THE PRODUCT, NEVER TYPED HERE — and my first draft got this
 * wrong in two languages at once, which is the whole argument for the helper.
 *
 * `side-label.ts:103-107` records the original defect verbatim: `notifySelectionClosed`
 * hard-wrote the ASCII token `YES` into its Swahili and Chinese sentences, so a Chinese player
 * read *"若 YES 获胜"* in a product whose dictionary says **是**. This document had reproduced it
 * exactly — the Chinese blocks said `YES`/`NO`, and `test:labels` §3b caught them.
 *
 * ⚠️ AND THE SWAHILI DRIFT WAS INVISIBLE TO THAT GUARD. It scans for the ASCII tokens, so it had
 * nothing to say about my writing **NDIYO** where `t.common.yes` is **NDIO** — a one-letter
 * difference that still means the rulebook names the side differently from every screen a player
 * has already seen. Found by reading the dictionary, not by the gate. Both are now one lookup.
 */
const words = (l: Locale) => ({
  yes: sideWordIn(l, "YES", "MARKET"),
  no: sideWordIn(l, "NO", "MARKET"),
});

export function yesNoContent(r: RulesRates): Record<Locale, React.ReactNode> {
  const w = { en: words("en"), sw: words("sw"), zh: words("zh") };
  // ⛔ COMPUTED, NOT TYPED. Marketing's PDF states 130,000 / 870,000 / 65,000 / 435,000 as
  // literals; at any other commission rate those four numbers agree with each other and with
  // nothing else — the most convincing way for a document to be wrong.
  const a = workedRow(EXAMPLE_WIN_POOL, r.commissionRate);   // NO wins → the YES pool is the losing one
  const b = workedRow(EXAMPLE_LOSE_POOL, r.commissionRate);  // YES wins → the NO pool is the losing one

  return {
    en: (
      <>
        <LegalSection n="1" title="About 50pick and the scope of these rules">
          <p>
            50pick.tz is a prediction-market platform where players answer real-world questions with a
            simple <strong className="text-text">{w.en.yes}</strong> or <strong className="text-text">{w.en.no}</strong> and
            stake Tanzanian Shillings on their conviction. Outcomes are settled against named, publicly
            verifiable official sources — never against random chance.
          </p>
          <p>
            The service is operated by 50pick Ltd, registered in the United Republic of Tanzania, under
            licence from the Gaming Board of Tanzania, licence number{" "}
            <span className="font-mono tabular-nums text-text">{LICENCE_NUMBER()}</span>. These rules govern every
            YES/NO market on the platform and form a binding agreement between 50pick Management and every
            player. They sit alongside the Terms of Service and the Privacy Notice; where a general term and
            these rules describe the same thing, they are written to agree.
          </p>
        </LegalSection>

        <LegalSection n="2" title="Eligibility, accounts and wallets">
          <ul className="list-disc pl-5 space-y-1">
            <li>Players must be <strong className="text-text">18 years or older</strong> and resident in Tanzania.</li>
            <li>One account per person. Multiple accounts, shared accounts and account sales are prohibited and may lead to forfeiture of winnings.</li>
            <li>
              <strong className="text-text">Identity verification (KYC) is required</strong> before you can deposit, place a
              bet or withdraw — not merely on request. You verify once, and an account verified once keeps the right
              to withdraw the money it holds even if we later ask it to verify again.
            </li>
            <li>
              Deposits and withdrawals move through the mobile-money channels published on the deposit and
              withdrawal screens, to the wallet registered on your account. We never ask for card details.
            </li>
            <li>
              Stakes are bounded: minimum <span className="font-mono tabular-nums text-text">{tzs(r.minStake)}</span>,
              maximum <span className="font-mono tabular-nums text-text">{tzs(r.maxStake)}</span> per position.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="3" title="Markets and questions — ownership">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Every market on 50pick is created, owned and listed by 50pick
              Management</strong>, which decides what is listed, when it closes and how it settles.
            </li>
            <li>
              Where the platform invites players to <em>propose</em> a question, a proposal is a suggestion and
              not a market. It becomes a market only if Management lists it, and Management keeps ownership and
              settlement authority over it exactly as over any other market. Whether proposals are open at any
              given time is shown on the platform.
            </li>
            <li>Every market is one question with exactly two possible answers: {w.en.yes} or {w.en.no}.</li>
            <li>
              Every market carries a <strong className="text-text">named public source</strong> it will be settled
              against and a clear closing deadline, both displayed before you stake.
            </li>
            <li>The conviction indicator shows where the crowd&apos;s money sits. It is information, not advice.</li>
          </ul>
        </LegalSection>

        <LegalSection n="4" title="How the pools work">
          <p>
            Each answer has its own pool. You stake into the pool of the answer you believe is correct. When the
            market settles, the winning side receives the losing side&apos;s pool, less our commission of{" "}
            <strong className="text-text">
              <span className="font-mono tabular-nums">{r.commissionPct}%</span> of the losing side
            </strong>. Net winnings are shared among winning players in proportion to their stake, and every
            winner&apos;s own stake is returned in full.
          </p>
          <p>
            The commission is taken <strong className="text-text">only from the losing side</strong>, so a winning
            bet is never paid less than it staked. If every stake is on one side there is no losing side, so we
            charge nothing and every stake is refunded in full. The same applies to a voided market.
          </p>
          <p>
            <strong className="text-text">Cash-out.</strong> Within the first{" "}
            <span className="font-mono tabular-nums text-text">{r.freeExitMinutes}</span> minutes after placing a bet you
            may sell it back for a full refund at no charge — <strong>provided that, at the moment you placed it, at
            least {r.freeExitMinutes} minutes of betting time still remained on that market</strong>, and provided the
            position was not funded by a bonus. After that window the position is locked and rides to settlement.
          </p>
          <p>
            <strong className="text-text">Withdrawal fee.</strong> Withdrawing from your wallet carries a fee of{" "}
            <span className="font-mono tabular-nums text-text">{r.withdrawalFeePct}%</span>. It is charged on withdrawals
            only — never on a stake, a win or a refund.
          </p>
          <p>
            The rates that apply to a market are <strong className="text-text">fixed when that market is created</strong>{" "}
            and cannot be changed afterwards. A later change to our rates affects future markets only; it can never
            re-price a bet you have already placed.
          </p>
        </LegalSection>

        <LegalSection n="5" title="Worked example">
          <p>
            A market with a {w.en.yes} pool of <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_WIN_POOL)}</span>{" "}
            and a {w.en.no} pool of <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_LOSE_POOL)}</span>:
          </p>
          <RulesTable
            label={`Worked example — ${w.en.yes}/${w.en.no} settlement`}
            head={["Result", "Losing pool", `Fee (${r.commissionPct}%)`, "Shared by winners"]}
            rows={[
              [`${w.en.no} wins`, tzs(a.losingPool), tzs(a.fee), tzs(a.net)],
              [`${w.en.yes} wins`, tzs(b.losingPool), tzs(b.fee), tzs(b.net)],
            ]}
          />
          <p>
            Net winnings are divided pro-rata: a player holding a tenth of the winning pool receives a tenth of
            the net winnings, plus their own stake back.
          </p>
        </LegalSection>

        <LegalSection n="6" title="Deadlines, settlement and verification">
          <ul className="list-disc pl-5 space-y-1">
            <li>Each market closes at the deadline shown on the market. Stakes are not accepted after closing.</li>
            <li>A market may close early if the outcome becomes publicly known before the deadline.</li>
            <li>
              Every result is settled against the <strong className="text-text">named public source</strong> stated on
              the market — never by opinion. A settlement officer records the evidence that justifies the verdict, and
              where two-officer authorisation is enabled a second officer countersigns.
            </li>
            <li>
              Each settlement is written to an <strong className="text-text">append-only audit chain</strong>, a
              permanent, tamper-evident record.
            </li>
            <li>
              Payouts are credited to your wallet once the result is settled. Withdrawals at or above{" "}
              <span className="font-mono tabular-nums text-text">{tzs(1_000_000)}</span> are held for review by two
              compliance officers before they are released.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="7" title="Refunds, voids and cancellations">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-text">One-sided market:</strong> if only one side holds any stake at closing, every stake is refunded in full.</li>
            <li><strong className="text-text">Ambiguity:</strong> Management may refund any market whose question, source or deadline was unclear or open to more than one reading.</li>
            <li><strong className="text-text">Error:</strong> any technical, operational, data or settlement error voids the market and refunds every stake.</li>
            <li>A cancelled, postponed or materially altered event, and a named source that fails to report, void the market and refund in full.</li>
            <li>
              A settled result may be corrected where the source authority itself corrects it within{" "}
              <span className="font-mono tabular-nums text-text">{r.objectionHours}</span> hour
              {r.objectionHours === 1 ? "" : "s"} of resolution, while the payout is still on hold.
            </li>
            <li><strong className="text-text">No fee is charged on a refunded stake.</strong> Refunds return the exact amount staked.</li>
          </ul>
        </LegalSection>

        <LegalSection n="8" title="Fair play and prohibited conduct">
          <ul className="list-disc pl-5 space-y-1">
            <li>Do not manipulate markets, exploit errors, use inside information unavailable to the public, or coordinate stakes with other players.</li>
            <li>Fraudulent deposits, payment reversals after settlement, and misuse of the payment integration lead to suspension and forfeiture of winnings.</li>
            <li>Bots, scripts and automated tools may not be used to place stakes or scrape the platform.</li>
            <li>Management monitors activity and may suspend or close any account suspected of prohibited conduct.</li>
          </ul>
        </LegalSection>

        <LegalSection n="9" title="Responsible play">
          <p>
            50pick is entertainment built on knowledge and conviction, not a source of income. Stake only what you
            can comfortably afford to lose, take breaks, and use the deposit limits, time limits, cooling-off and
            self-exclusion tools on your profile. If play stops being fun, stop. Help is available on the platform
            and through the national problem-gambling helpline shown in the footer of every page. 18+.
          </p>
        </LegalSection>

        <LegalSection n="10" title="Management rights and amendments">
          <ul className="list-disc pl-5 space-y-1">
            <li>Management owns all questions, markets, results, settlement records and audit data on the platform.</li>
            <li>These rules may be amended at any time. The version published here applies, material changes are announced on the platform, and a change never applies retroactively to a bet already placed.</li>
            <li>In any matter these rules do not cover, the decision of Management — made in good faith and recorded in the audit chain — is final.</li>
            <li>These rules are governed by the laws of the United Republic of Tanzania.</li>
          </ul>
        </LegalSection>
      </>
    ),

    sw: (
      <>
        <LegalSection n="1" title="Kuhusu 50pick na upeo wa kanuni hizi">
          <p>
            50pick.tz ni jukwaa la masoko ya utabiri ambapo wachezaji hujibu maswali ya matukio halisi kwa{" "}
            <strong className="text-text">{w.sw.yes}</strong> au <strong className="text-text">{w.sw.no}</strong> na kuweka
            Shilingi za Tanzania kwa msimamo wao. Matokeo hutatuliwa kwa vyanzo rasmi vilivyotajwa na vinavyoweza
            kuthibitishwa hadharani — kamwe si kwa bahati nasibu.
          </p>
          <p>
            Huduma inaendeshwa na 50pick Ltd, iliyosajiliwa katika Jamhuri ya Muungano wa Tanzania, chini ya leseni
            kutoka Bodi ya Michezo ya Kubahatisha Tanzania, namba ya leseni{" "}
            <span className="font-mono tabular-nums text-text">{LICENCE_NUMBER()}</span>. Kanuni hizi zinasimamia kila
            soko la NDIYO/HAPANA na ni makubaliano yenye nguvu kati ya Uongozi wa 50pick na kila mchezaji.
          </p>
        </LegalSection>

        <LegalSection n="2" title="Ustahiki, akaunti na pochi">
          <ul className="list-disc pl-5 space-y-1">
            <li>Wachezaji lazima wawe na <strong className="text-text">umri wa miaka 18 au zaidi</strong> na wakazi wa Tanzania.</li>
            <li>Akaunti moja kwa kila mtu. Akaunti nyingi, za kushirikiana au kuuzwa ni marufuku na zinaweza kusababisha kupoteza ushindi.</li>
            <li>
              <strong className="text-text">Uthibitisho wa utambulisho (KYC) unahitajika</strong> kabla ya kuweka pesa,
              kuweka dau au kutoa pesa — si tu unapoombwa. Unathibitisha mara moja, na akaunti iliyokwisha thibitishwa
              inabaki na haki ya kutoa pesa ilizonazo hata tukiomba uthibitisho tena baadaye.
            </li>
            <li>
              Kuweka na kutoa pesa hufanyika kupitia njia za pesa za simu zilizoorodheshwa kwenye kurasa za malipo,
              kwenda kwenye pochi iliyosajiliwa kwenye akaunti yako. Hatuombi kamwe taarifa za kadi.
            </li>
            <li>
              Dau lina mipaka: kiwango cha chini{" "}
              <span className="font-mono tabular-nums text-text">{tzs(r.minStake)}</span>, cha juu{" "}
              <span className="font-mono tabular-nums text-text">{tzs(r.maxStake)}</span> kwa kila nafasi.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="3" title="Masoko na maswali — umiliki">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Kila soko la 50pick linaundwa, linamilikiwa na linaorodheshwa na Uongozi wa
              50pick</strong>, ambao huamua linaloorodheshwa, linapofungwa na jinsi linavyotatuliwa.
            </li>
            <li>
              Pale jukwaa linapowaalika wachezaji <em>kupendekeza</em> swali, pendekezo ni wazo tu, si soko. Linakuwa
              soko endapo tu Uongozi utaliorodhesha, na Uongozi hubaki na umiliki na mamlaka ya kutatua kama ilivyo
              kwa soko lingine lolote. Iwapo mapendekezo yamefunguliwa kwa wakati fulani huonyeshwa kwenye jukwaa.
            </li>
            <li>Kila soko ni swali moja lenye majibu mawili tu: {w.sw.yes} au {w.sw.no}.</li>
            <li>
              Kila soko lina <strong className="text-text">chanzo rasmi kilichotajwa</strong> na muda wa kufunga, vyote
              vikionyeshwa kabla hujaweka dau.
            </li>
            <li>Kipimo cha msimamo huonyesha pesa za umati zilipo. Ni taarifa, si ushauri.</li>
          </ul>
        </LegalSection>

        <LegalSection n="4" title="Jinsi mabwawa yanavyofanya kazi">
          <p>
            Kila jibu lina bwawa lake. Unaweka dau kwenye bwawa la jibu unaloamini ni sahihi. Soko linapotatuliwa,
            upande ulioshinda hupokea bwawa la upande ulioshindwa, ukiondoa kamisheni yetu ya{" "}
            <strong className="text-text">
              <span className="font-mono tabular-nums">{r.commissionPct}%</span> ya upande ulioshindwa
            </strong>. Ushindi halisi hugawanywa kwa uwiano wa dau, na dau la kila mshindi hurudishwa kamili.
          </p>
          <p>
            Kamisheni huchukuliwa <strong className="text-text">kutoka upande ulioshindwa pekee</strong>, hivyo dau
            lililoshinda halilipwi pungufu ya kilichowekwa. Kama dau zote zipo upande mmoja, hakuna upande ulioshindwa,
            hivyo hatutozi chochote na kila dau hurudishwa kamili. Vivyo hivyo kwa soko lililobatilishwa.
          </p>
          <p>
            <strong className="text-text">Kuuza dau mapema.</strong> Ndani ya dakika{" "}
            <span className="font-mono tabular-nums text-text">{r.freeExitMinutes}</span> za kwanza baada ya kuweka dau
            unaweza kuliuza na kurudishiwa kamili bila gharama — <strong>ikiwa, wakati ulipoliweka, kulikuwa bado na
            angalau dakika {r.freeExitMinutes} za kuweka dau kwenye soko hilo</strong>, na ikiwa nafasi hiyo
            haikugharamiwa na bonasi. Baada ya muda huo dau linafungwa hadi kutatuliwa.
          </p>
          <p>
            <strong className="text-text">Ada ya kutoa pesa.</strong> Kutoa pesa kwenye pochi yako kuna ada ya{" "}
            <span className="font-mono tabular-nums text-text">{r.withdrawalFeePct}%</span>. Hutozwa wakati wa kutoa
            pesa pekee — kamwe si kwa dau, ushindi au marejesho.
          </p>
          <p>
            Viwango vinavyotumika kwa soko <strong className="text-text">hufungwa soko linapoundwa</strong> na haviwezi
            kubadilishwa baadaye. Mabadiliko ya baadaye yanahusu masoko yajayo pekee.
          </p>
        </LegalSection>

        <LegalSection n="5" title="Mfano wa hesabu">
          <p>
            Soko lenye bwawa la {w.sw.yes} la{" "}
            <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_WIN_POOL)}</span> na bwawa la {w.sw.no} la{" "}
            <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_LOSE_POOL)}</span>:
          </p>
          <RulesTable
            label={`Mfano wa hesabu — ${w.sw.yes}/${w.sw.no}`}
            head={["Matokeo", "Bwawa lililoshindwa", `Ada (${r.commissionPct}%)`, "Kwa washindi"]}
            rows={[
              [`${w.sw.no} yashinda`, tzs(a.losingPool), tzs(a.fee), tzs(a.net)],
              [`${w.sw.yes} yashinda`, tzs(b.losingPool), tzs(b.fee), tzs(b.net)],
            ]}
          />
          <p>
            Ushindi hugawanywa kwa uwiano: mchezaji mwenye sehemu ya kumi ya bwawa lililoshinda hupata sehemu ya kumi
            ya ushindi halisi, pamoja na dau lake.
          </p>
        </LegalSection>

        <LegalSection n="6" title="Mida ya kufunga, utatuzi na uthibitisho">
          <ul className="list-disc pl-5 space-y-1">
            <li>Kila soko hufungwa kwa muda ulioonyeshwa. Dau hazikubaliwi baada ya kufungwa.</li>
            <li>Soko linaweza kufungwa mapema iwapo matokeo yatajulikana hadharani kabla ya muda.</li>
            <li>
              Kila matokeo hutatuliwa kwa <strong className="text-text">chanzo rasmi kilichotajwa</strong> — kamwe si
              kwa maoni. Afisa wa utatuzi huandika ushahidi unaothibitisha uamuzi, na pale idhini ya maafisa wawili
              imewashwa, afisa wa pili husaini.
            </li>
            <li>
              Kila utatuzi huandikwa kwenye <strong className="text-text">mnyororo wa ukaguzi usiofutika</strong>, rekodi
              ya kudumu inayoonyesha mabadiliko yoyote.
            </li>
            <li>
              Malipo huingizwa kwenye pochi yako baada ya matokeo kutatuliwa. Utoaji wa{" "}
              <span className="font-mono tabular-nums text-text">{tzs(1_000_000)}</span> au zaidi hukaguliwa na maafisa
              wawili wa uzingatiaji kabla ya kuachiliwa.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="7" title="Marejesho, kubatilisha na kughairi">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-text">Soko la upande mmoja:</strong> kama upande mmoja tu una dau wakati wa kufunga, kila dau hurudishwa kamili.</li>
            <li><strong className="text-text">Utata:</strong> Uongozi unaweza kurudisha dau za soko lolote ambalo swali, chanzo au muda wake haukuwa wazi.</li>
            <li><strong className="text-text">Hitilafu:</strong> hitilafu yoyote ya kiufundi, kiutendaji, data au utatuzi hubatilisha soko na kurudisha kila dau.</li>
            <li>Tukio lililoghairiwa, kuahirishwa au kubadilishwa kwa kiasi kikubwa, na chanzo kilichoshindwa kutoa taarifa, hubatilisha soko na kurudisha kamili.</li>
            <li>
              Matokeo yaliyotatuliwa yanaweza kurekebishwa endapo chanzo chenyewe kitayarekebisha ndani ya saa{" "}
              <span className="font-mono tabular-nums text-text">{r.objectionHours}</span> baada ya utatuzi, wakati
              malipo bado yamesitishwa.
            </li>
            <li><strong className="text-text">Hakuna ada kwa dau lililorudishwa.</strong> Marejesho ni kiasi kamili kilichowekwa.</li>
          </ul>
        </LegalSection>

        <LegalSection n="8" title="Mchezo wa haki na tabia zilizokatazwa">
          <ul className="list-disc pl-5 space-y-1">
            <li>Usibadilishe masoko kwa hila, usitumie hitilafu, taarifa za ndani zisizopatikana hadharani, wala kushirikiana na wachezaji wengine kupanga dau.</li>
            <li>Amana za udanganyifu, kubatilisha malipo baada ya utatuzi, na matumizi mabaya ya mfumo wa malipo husababisha kusimamishwa na kupoteza ushindi.</li>
            <li>Roboti, skripti na zana za kiotomatiki haziruhusiwi kuweka dau wala kuchukua data ya jukwaa.</li>
            <li>Uongozi hufuatilia shughuli zote na unaweza kusimamisha au kufunga akaunti yoyote inayoshukiwa.</li>
          </ul>
        </LegalSection>

        <LegalSection n="9" title="Mchezo salama">
          <p>
            50pick ni burudani inayojengwa kwa maarifa na msimamo, si chanzo cha mapato. Weka dau unaloweza kumudu
            kupoteza tu, pumzika, na tumia vikomo vya amana, vikomo vya muda, mapumziko na kujitenga vilivyopo kwenye
            wasifu wako. Mchezo ukiacha kuwa wa kufurahisha, acha. Msaada unapatikana kwenye jukwaa na kwa simu ya
            msaada ya kitaifa inayoonyeshwa chini ya kila ukurasa. Miaka 18+.
          </p>
        </LegalSection>

        <LegalSection n="10" title="Haki za Uongozi na marekebisho">
          <ul className="list-disc pl-5 space-y-1">
            <li>Uongozi unamiliki maswali yote, masoko, matokeo, kumbukumbu za utatuzi na data ya ukaguzi.</li>
            <li>Kanuni hizi zinaweza kurekebishwa wakati wowote. Toleo lililochapishwa hapa ndilo linalotumika, mabadiliko makubwa hutangazwa, na hayarudi nyuma kwa dau lililokwisha wekwa.</li>
            <li>Katika jambo lolote lisilofunikwa hapa, uamuzi wa Uongozi — uliofanywa kwa nia njema na kuandikwa kwenye mnyororo wa ukaguzi — ni wa mwisho.</li>
            <li>Kanuni hizi zinaongozwa na sheria za Jamhuri ya Muungano wa Tanzania.</li>
          </ul>
        </LegalSection>
      </>
    ),

    zh: (
      <>
        <LegalSection n="1" title="关于 50pick 及本规则的适用范围">
          <p>
            50pick.tz 是一个预测市场平台，玩家以简单的 <strong className="text-text">{w.zh.yes}</strong>或{" "}
            <strong className="text-text">{w.zh.no}</strong>回答现实世界的问题，并以坦桑尼亚先令表达自己的判断。结果依据具名、可公开核实的官方来源结算，绝不依赖随机运气。
          </p>
          <p>
            本服务由在坦桑尼亚联合共和国注册的 50pick Ltd 运营，并持有坦桑尼亚博彩委员会颁发的牌照，牌照号{" "}
            <span className="font-mono tabular-nums text-text">{LICENCE_NUMBER()}</span>。本规则适用于平台上每一个
            {w.zh.yes}/{w.zh.no} 市场，构成 50pick 管理层与每位玩家之间具有约束力的协议。
          </p>
        </LegalSection>

        <LegalSection n="2" title="参与资格、账户与钱包">
          <ul className="list-disc pl-5 space-y-1">
            <li>玩家须<strong className="text-text">年满 18 周岁</strong>并居住于坦桑尼亚。</li>
            <li>每人限一个账户。多开账户、共用账户及账户买卖均被禁止，并可能导致奖金被没收。</li>
            <li>
              <strong className="text-text">身份验证（KYC）为必办事项</strong>，须在充值、下注或提现之前完成，而非仅在被要求时办理。您只需验证一次；已验证的账户即使日后再次被要求验证，仍保留提取账户内资金的权利。
            </li>
            <li>充值与提现通过充值/提现页面公布的移动支付渠道进行，资金进出您账户上登记的钱包。我们绝不索取银行卡信息。</li>
            <li>
              下注设有上下限：最低{" "}
              <span className="font-mono tabular-nums text-text">{tzs(r.minStake)}</span>，最高{" "}
              <span className="font-mono tabular-nums text-text">{tzs(r.maxStake)}</span>。
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="3" title="市场与问题 —— 所有权">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">平台上的每一个市场均由 50pick 管理层创建、拥有并上架</strong>，由其决定上架内容、截止时间与结算方式。
            </li>
            <li>
              当平台邀请玩家<em>提议</em>问题时，提议只是建议而非市场。只有经管理层上架后才成为市场，且管理层对其保留与其他市场完全相同的所有权与结算权。提议功能在某一时点是否开放，以平台显示为准。
            </li>
            <li>每个市场为一个问题，仅有两个答案：{w.zh.yes} 或 {w.zh.no}。</li>
            <li>每个市场都载明<strong className="text-text">具名的公开来源</strong>与明确的截止时间，两者均在您下注前展示。</li>
            <li>信心指示器显示资金分布，仅供参考，不构成建议。</li>
          </ul>
        </LegalSection>

        <LegalSection n="4" title="奖池如何运作">
          <p>
            每个答案各有奖池。您将赌注投入您认为正确的一方。市场结算时，获胜方获得失败方的奖池，扣除我们的佣金：
            <strong className="text-text">
              失败方的 <span className="font-mono tabular-nums">{r.commissionPct}%</span>
            </strong>
            。净奖金按各人下注比例分配给获胜玩家，且每位获胜者的本金全额退回。
          </p>
          <p>
            佣金<strong className="text-text">仅从失败方扣取</strong>，因此获胜的下注所得永不低于本金。若全部资金都在同一方，则不存在失败方，我们不收取任何费用，所有下注全额退还。市场作废时亦同。
          </p>
          <p>
            <strong className="text-text">提前卖出。</strong>下注后的前{" "}
            <span className="font-mono tabular-nums text-text">{r.freeExitMinutes}</span>{" "}
            分钟内，您可以全额免费卖出——<strong>前提是您下注的当时，该市场仍剩余至少 {r.freeExitMinutes} 分钟的下注时间</strong>，且该仓位并非由奖金资助。超过该窗口后，仓位锁定直至结算。
          </p>
          <p>
            <strong className="text-text">提现手续费。</strong>从钱包提现收取{" "}
            <span className="font-mono tabular-nums text-text">{r.withdrawalFeePct}%</span>{" "}
            的手续费。该费用仅在提现时收取——绝不针对下注、奖金或退款收取。
          </p>
          <p>
            适用于某一市场的费率<strong className="text-text">在该市场创建时即已固定</strong>，其后不可更改。日后的费率调整仅影响新市场，绝不会重新计价已下的注。
          </p>
        </LegalSection>

        <LegalSection n="5" title="计算示例">
          <p>
            某市场 {w.zh.yes} 池为 <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_WIN_POOL)}</span>，{w.zh.no} 池为{" "}
            <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_LOSE_POOL)}</span>：
          </p>
          <RulesTable
            label={`计算示例 —— ${w.zh.yes}/${w.zh.no} 结算`}
            head={["结果", "失败方奖池", `佣金（${r.commissionPct}%）`, "获胜方分得"]}
            rows={[
              [`${w.zh.no} 获胜`, tzs(a.losingPool), tzs(a.fee), tzs(a.net)],
              [`${w.zh.yes} 获胜`, tzs(b.losingPool), tzs(b.fee), tzs(b.net)],
            ]}
          />
          <p>净奖金按比例分配：持有获胜池十分之一的玩家，获得净奖金的十分之一，另加本金退回。</p>
        </LegalSection>

        <LegalSection n="6" title="截止、结算与结果核验">
          <ul className="list-disc pl-5 space-y-1">
            <li>每个市场在其显示的截止时间关闭。关闭后不再接受下注。</li>
            <li>若结果在截止前已公开知悉，市场可提前关闭。</li>
            <li>
              每项结果均依据市场上载明的<strong className="text-text">具名公开来源</strong>结算，绝不依据主观意见。结算专员记录支持该判定的证据；在启用双人授权时，由第二位专员会签。
            </li>
            <li>每次结算都写入<strong className="text-text">仅可追加的审计链</strong>，形成永久且可察觉篡改的记录。</li>
            <li>
              结算完成后奖金将计入您的钱包。金额达到或超过{" "}
              <span className="font-mono tabular-nums text-text">{tzs(1_000_000)}</span>{" "}
              的提现，须经两位合规专员审核后放行。
            </li>
          </ul>
        </LegalSection>

        <LegalSection n="7" title="退款、作废与取消">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-text">单边市场：</strong>若截止时仅有一方持有下注，则全部下注全额退还。</li>
            <li><strong className="text-text">含义不清：</strong>凡问题、来源或截止时间表述不清或存在多种解读的市场，管理层均可退款。</li>
            <li><strong className="text-text">错误：</strong>任何技术、运营、数据或结算错误，均导致市场作废并全额退还下注。</li>
            <li>赛事被取消、延期或发生实质性变更，以及具名来源未能发布数据，市场作废并全额退款。</li>
            <li>
              若来源主管机构在结算后{" "}
              <span className="font-mono tabular-nums text-text">{r.objectionHours}</span>{" "}
              小时内自行更正结果，且赔付仍处于暂缓期间，已结算的结果可被更正。
            </li>
            <li><strong className="text-text">退款不收取任何费用。</strong>退还金额与下注金额完全一致。</li>
          </ul>
        </LegalSection>

        <LegalSection n="8" title="公平游戏与禁止行为">
          <ul className="list-disc pl-5 space-y-1">
            <li>不得操纵市场、利用错误牟利、使用未公开的内幕信息，或与其他玩家串通下注。</li>
            <li>欺诈性充值、结算后的支付撤销，以及滥用支付通道，将导致账户停用并没收奖金。</li>
            <li>不得使用机器人、脚本或自动化工具下注或抓取平台数据。</li>
            <li>管理层监控所有活动，并可停用或关闭任何涉嫌违规的账户。</li>
          </ul>
        </LegalSection>

        <LegalSection n="9" title="理性游戏">
          <p>
            50pick 是建立在知识与判断之上的娱乐，而非收入来源。请只投入您能够承受损失的金额，注意休息，并使用个人资料页中的充值限额、时间限额、冷静期与自我排除工具。若游戏不再令人愉快，请停止。平台内提供帮助，每页页脚亦载有国家问题赌博求助热线。18+。
          </p>
        </LegalSection>

        <LegalSection n="10" title="管理层权利与修订">
          <ul className="list-disc pl-5 space-y-1">
            <li>平台上的所有问题、市场、结果、结算记录与审计数据均归管理层所有。</li>
            <li>本规则可随时修订。以此处公布的版本为准，重大变更将在平台公告，且绝不追溯适用于已下的注。</li>
            <li>本规则未涵盖的事项，以管理层本着诚信作出并记录于审计链的决定为最终决定。</li>
            <li>本规则受坦桑尼亚联合共和国法律管辖。</li>
          </ul>
        </LegalSection>
      </>
    ),
  };
}
