/**
 * THE UP & DOWN GAME RULES — binding player rules for the short-horizon product.
 *
 * ⛔ WHAT WAS CORRECTED FROM MARKETING'S SOURCE PDF, measured against live production
 * config on 2026-09-10:
 *
 *  §6 *"A stake cannot be withdrawn, edited or cancelled once placed."* — FALSE, and it removed
 *     a right `/legal/terms` §4 GRANTS. `freeExitGraceMinutes` is live. All three conditions are
 *     stated, including the one that makes cash-out unreachable on the shortest rounds — which is
 *     the honest version of what marketing was reaching for.
 *  §4 The buffer was described as *"± $0.02 on crypto quotes"*. Nothing in the engine works that
 *     way: the margin is in BASIS POINTS and the two targets are FROZEN AT OPEN per round
 *     (`UpDownRound.marginBps` / `upTarget` / `downTarget`). A fabricated fixed figure in a
 *     binding document is worse than a general description, because a player can check it.
 *  §2 The worked question was *"Will it rain…"* with *"Up = Yes it rains"* — that is YES/NO
 *     semantics wearing Up & Down's name, and it blurs two products that settle differently.
 *  §9 Disputes *"within 48 hours"* — the platform's objection window is configured and shorter.
 *     Both windows are now named as the different things they are.
 *  §3 *"in all cases within 24 hours"* — an unconditional promise the platform does not make;
 *     large withdrawals route to two-officer review by design.
 *  Durations, the withdrawal fee, stake bounds and the licence number all read from source.
 */
import type { Locale } from "@/lib/i18n-server";
import { LegalSection } from "../_components";
import { LICENCE_NUMBER } from "@/lib/server/support-config";
import { sideWordIn } from "@/lib/side-label";
import { ALLOWED_DURATIONS } from "@/lib/updown-durations";
import {
  EXAMPLE_WIN_POOL,
  EXAMPLE_LOSE_POOL,
  RulesTable,
  workedRow,
  tzs,
  type RulesRates,
} from "./_shared";

/**
 * ⛔ THE TWO DIRECTIONS COME FROM THE PRODUCT, for the same reason the sides do in the YES/NO
 * document. `t.market.udUp` and `t.market.udDown` are what every board, card and notification
 * already say; a rulebook that names them differently is the one document a player will trust
 * and be wrong about.
 */
const dirs = (l: Locale) => ({ up: sideWordIn(l, "YES", "UPDOWN"), down: sideWordIn(l, "NO", "UPDOWN") });

export function upDownContent(r: RulesRates): Record<Locale, React.ReactNode> {
  const d = { en: dirs("en"), sw: dirs("sw"), zh: dirs("zh") };
  const a = workedRow(EXAMPLE_WIN_POOL, r.commissionRate);   // DOWN wins → the Up pool is the losing one
  const b = workedRow(EXAMPLE_LOSE_POOL, r.commissionRate);  // UP wins → the Down pool is the losing one

  // ⛔ READ FROM THE ONE LIST, NEVER TYPED. `ALLOWED_DURATIONS` is deliberately import-free so
  // both the server and the browser share it; three hand-copied `const DURATIONS = [...]` is the
  // exact defect that module exists to prevent (E-62). A rules document is a fourth copy waiting
  // to happen — a duration added in code would otherwise leave this page quietly lying.
  const durations = ALLOWED_DURATIONS.join(" · ");
  // ⭐ DERIVED, NOT ASSERTED: which rounds can never reach the cash-out runway falls out of
  // comparing the duration list against the live grace window. If either moves, this moves.
  const unreachable = ALLOWED_DURATIONS.filter((mins) => mins <= r.freeExitMinutes).join(" · ");

  return {
    en: (
      <>
        <LegalSection n="1" title="Introduction and scope">
          <p>
            Up &amp; Down is a short-horizon prediction format: you forecast whether a measurable real-world value
            will finish <strong className="text-text">Up</strong> (higher) or <strong className="text-text">Down</strong>{" "}
            (lower) against its opening reference when the round clock runs out. It is a game of forecasting and
            conviction — it is not sports betting and it is not a casino product.
          </p>
          <p>
            The service is operated by 50pick Ltd, under licence from the Gaming Board of Tanzania, licence number{" "}
            <span className="font-mono tabular-nums text-text">{LICENCE_NUMBER()}</span>. All questions, assets,
            reference values and round schedules are created and managed exclusively by 50pick Management. Rounds run
            over several timeframes — <span className="font-mono tabular-nums text-text">{durations}</span> minutes —
            across the tracked values listed on the platform.
          </p>
          <p>
            These rules may be updated at any time; the version published here at the moment a round locks applies to
            that round, and a change never applies retroactively to a round already locked.
          </p>
        </LegalSection>

        <LegalSection n="2" title="How a round works">
          <p>
            Each round asks one question with exactly two answers — for example,{" "}
            <em>&ldquo;Will Bitcoin be higher or lower than its opening reference when the 5-minute clock runs out?&rdquo;</em>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-text">Opening reference.</strong> Every round opens with a published reference value, recorded with its source and a timestamp.</li>
            <li>
              <strong className="text-text">Two targets, frozen at open.</strong> A margin is applied to the reference
              to fix an upper and a lower target for that round. Both are frozen when the round opens and are shown to
              you; settlement compares the closing value against them. An operator editing an asset afterwards can
              never move the line under money already staked.
            </li>
            <li><strong className="text-text">Two pools.</strong> You stake into the Up pool or the Down pool. Pool totals are visible live.</li>
            <li><strong className="text-text">The multiplier moves.</strong> The displayed multiplier reflects the live pools, not fixed odds. It is not a promise until betting closes.</li>
            <li><strong className="text-text">Round lock.</strong> Betting closes at the published lock time. No stake is accepted afterwards.</li>
            <li><strong className="text-text">Settlement.</strong> At expiry the closing value is read from the named public source and compared against the frozen targets.</li>
          </ul>
        </LegalSection>

        <LegalSection n="3" title="Pools, our fee and payouts">
          <p>
            The winning side receives the entire opposing pool, less our commission of{" "}
            <strong className="text-text">
              <span className="font-mono tabular-nums">{r.commissionPct}%</span> of the losing side
            </strong>. The remainder is shared among winning players in proportion to their stakes, and each
            winner&apos;s own stake is returned in full. The commission is never taken from a winner&apos;s own stake.
          </p>
          <p>
            <strong className="text-text">Stakes are bounded:</strong> minimum{" "}
            <span className="font-mono tabular-nums text-text">{tzs(r.minStake)}</span>, maximum{" "}
            <span className="font-mono tabular-nums text-text">{tzs(r.maxStake)}</span> per position. Winnings are
            rounded to the nearest shilling.
          </p>
          <p>
            <strong className="text-text">Payouts</strong> are credited to your wallet once the round is settled and
            signed off, normally within seconds. Withdrawing from your wallet carries a fee of{" "}
            <span className="font-mono tabular-nums text-text">{r.withdrawalFeePct}%</span>, charged on withdrawals only —
            never on a stake, a win or a refund. Withdrawals at or above{" "}
            <span className="font-mono tabular-nums text-text">{tzs(1_000_000)}</span> are held for review by two
            compliance officers before release, so those take longer by design.
          </p>
        </LegalSection>

        <LegalSection n="4" title="Worked example">
          <p>
            A round with an Up pool of <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_WIN_POOL)}</span>{" "}
            and a Down pool of <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_LOSE_POOL)}</span>:
          </p>
          <RulesTable
            label="Worked example — Up and Down settlement"
            head={["Result", "Losing pool", `Fee (${r.commissionPct}%)`, "Shared by winners"]}
            rows={[
              [`${d.en.down} wins`, tzs(a.losingPool), tzs(a.fee), tzs(a.net)],
              [`${d.en.up} wins`, tzs(b.losingPool), tzs(b.fee), tzs(b.net)],
            ]}
          />
          <p>
            A player holding a tenth of the winning pool receives a tenth of the net winnings, plus their stake back.
          </p>
        </LegalSection>

        <LegalSection n="5" title="Result determination and settlement">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-text">Named public source.</strong> Every round settles against a source named before betting opens, and pinned to that round at open.</li>
            <li><strong className="text-text">Officer sign-off.</strong> A settlement officer records the evidence justifying the verdict; where two-officer authorisation is enabled, a second officer countersigns. Evidence is written to an append-only audit chain.</li>
            <li>
              <strong className="text-text">No-change protection.</strong> A closing value that lands inside the round&apos;s
              frozen margin — neither above the upper target nor below the lower one — is treated as no change, and the
              round is void with every stake refunded in full.
            </li>
            <li><strong className="text-text">Publication.</strong> The result, the opening and closing values, the source and the settlement timestamp are published for every round.</li>
            <li><strong className="text-text">Correction.</strong> A settlement confirmed to be erroneous is corrected or voided, and affected players are refunded or re-credited.</li>
          </ul>
        </LegalSection>

        <LegalSection n="6" title="Refunds, voids and cancellations">
          <p>Each of the following results in a full refund of every stake in the affected round:</p>
          <RulesTable
            label="Refund and void cases"
            head={["Case", "Treatment"]}
            rows={[
              ["One-sided round", "Only one side holds any stake at lock — no pool forms, every stake refunded"],
              ["Ambiguity", "The question, source or wording was open to more than one reading"],
              ["Technical error", "Any system, pricing, settlement or display error voids the round"],
              ["Source failure", "The named source is unavailable, delayed, or gives contradictory values"],
              ["No change", "The closing value lands inside the round's frozen margin"],
              ["Event abandoned", "The underlying event is cancelled, abandoned or materially altered"],
              ["Force majeure", "Circumstances beyond our reasonable control"],
            ]}
          />
          <p>
            A refund returns the exact stake paid; <strong className="text-text">no fee is charged on a refunded stake</strong>.
          </p>
        </LegalSection>

        <LegalSection n="7" title="Stakes, cash-out and wallets">
          <p>
            Players must be <strong className="text-text">18 or older</strong>, resident in Tanzania, and verified —
            identity verification is required before you can deposit, bet or withdraw. Deposits and withdrawals move
            through the mobile-money channels published on the deposit and withdrawal screens, to the wallet registered
            on your account. We never ask for card details.
          </p>
          <p>
            <strong className="text-text">Cash-out.</strong> Within the first{" "}
            <span className="font-mono tabular-nums text-text">{r.freeExitMinutes}</span> minutes after placing a bet you
            may sell it back for a full refund at no charge — <strong>provided that, at the moment you placed it, at
            least {r.freeExitMinutes} minutes of betting time still remained on that round</strong>, and provided the
            position was not funded by a bonus.
          </p>
          <p>
            ⚠️ <strong className="text-text">On the shortest rounds that condition can never be met.</strong> A round of{" "}
            <span className="font-mono tabular-nums text-text">{unreachable}</span> minutes is shorter than, or equal
            to, the {r.freeExitMinutes}-minute runway the right requires — so{" "}
            <strong className="text-text">cash-out is not available on those rounds at all</strong>. This is stated
            plainly rather than left to be discovered: a right that cannot be reached is not a right.
          </p>
          <p>
            Stakes are debited when a position is confirmed. Outside the cash-out window a position cannot be edited,
            cancelled or transferred, and rides to settlement. You are responsible for your own wallet credentials.
          </p>
        </LegalSection>

        <LegalSection n="8" title="Fair play and prohibited conduct">
          <ul className="list-disc pl-5 space-y-1">
            <li>Operating multiple accounts, or colluding with other players to move either side of a pool.</li>
            <li>Exploiting, or attempting to exploit, any pricing, latency or settlement error.</li>
            <li>Using bots, scripts or automated tools to place stakes or scrape the platform.</li>
            <li>Abusing refunds or payment reversals after settlement.</li>
            <li>Fraud, identity misrepresentation or money laundering.</li>
          </ul>
          <p>
            These may lead to stakes being withheld, winnings forfeited, accounts suspended and — where applicable —
            referral to the authorities.
          </p>
        </LegalSection>

        <LegalSection n="9" title="Disputes, amendments and responsible play">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Two different windows, and they are not the same thing.</strong> The{" "}
              <em>objection window</em> is{" "}
              <span className="font-mono tabular-nums text-text">{r.objectionHours}</span> hour
              {r.objectionHours === 1 ? "" : "s"} from resolution: within it, while the payout is still on hold, a
              result can still be corrected or a round voided. Once a round has settled and the money has moved, that
              is no longer possible. Separately, you may <em>raise a dispute</em> with support about a settled round;
              it is reviewed against the recorded evidence and the audit chain, and the outcome is given to you in
              writing.
            </li>
            <li><strong className="text-text">Amendments.</strong> Material changes are announced before taking effect and never apply retroactively to rounds already locked.</li>
            <li>
              <strong className="text-text">Responsible play.</strong> Up &amp; Down is entertainment, not an income
              source, and its short rounds make it easy to play for longer than intended. Deposit limits, time limits,
              cooling-off and self-exclusion are on your profile; the national problem-gambling helpline is in the
              footer of every page. If play stops being fun, stop. 18+.
            </li>
            <li><strong className="text-text">Acceptance.</strong> Entering a round is full acceptance of these rules as published at lock time.</li>
          </ul>
        </LegalSection>
      </>
    ),

    sw: (
      <>
        <LegalSection n="1" title="Utangulizi na upeo">
          <p>
            Juu &amp; Chini ni mtindo wa utabiri wa muda mfupi: unatabiri kama thamani halisi inayopimika itamalizia{" "}
            <strong className="text-text">Juu</strong> (zaidi) au <strong className="text-text">Chini</strong> (pungufu)
            ikilinganishwa na rejea yake ya kufungua saa ya raundi inapoisha. Ni mchezo wa utabiri na msimamo — si
            kubashiri michezo wala si mchezo wa kasino.
          </p>
          <p>
            Huduma inaendeshwa na 50pick Ltd, chini ya leseni kutoka Bodi ya Michezo ya Kubahatisha Tanzania, namba ya
            leseni <span className="font-mono tabular-nums text-text">{LICENCE_NUMBER()}</span>. Maswali yote, mali,
            thamani za rejea na ratiba za raundi huundwa na kusimamiwa na Uongozi wa 50pick pekee. Raundi hufanyika kwa
            vipindi kadhaa — dakika <span className="font-mono tabular-nums text-text">{durations}</span> — kwa thamani
            zilizoorodheshwa kwenye jukwaa.
          </p>
          <p>
            Kanuni hizi zinaweza kusasishwa wakati wowote; toleo lililopo hapa wakati raundi inafungwa ndilo
            linalotumika kwa raundi hiyo, na mabadiliko hayarudi nyuma kwa raundi zilizokwisha fungwa.
          </p>
        </LegalSection>

        <LegalSection n="2" title="Jinsi raundi inavyofanya kazi">
          <p>
            Kila raundi ina swali moja lenye majibu mawili — kwa mfano,{" "}
            <em>&ldquo;Je, Bitcoin itakuwa juu au chini ya rejea yake saa ya dakika 5 itakapoisha?&rdquo;</em>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-text">Rejea ya kufungua.</strong> Kila raundi hufunguliwa kwa thamani ya rejea iliyochapishwa, ikirekodiwa na chanzo chake na muda.</li>
            <li>
              <strong className="text-text">Malengo mawili, yamefungwa wakati wa kufungua.</strong> Kiasi cha ukingo
              huwekwa kwenye rejea kupanga lengo la juu na la chini kwa raundi hiyo. Yote mawili hufungwa raundi
              inapofunguliwa na huonyeshwa kwako. Mtu anayebadilisha mali baadaye hawezi kamwe kuhamisha mstari chini
              ya pesa zilizokwisha wekwa.
            </li>
            <li><strong className="text-text">Mabwawa mawili.</strong> Unaweka dau kwenye bwawa la Juu au la Chini. Jumla za mabwawa huonekana moja kwa moja.</li>
            <li><strong className="text-text">Kizidishi hubadilika.</strong> Kizidishi kinachoonyeshwa hutokana na mabwawa yaliyopo, si odds zisizobadilika. Si ahadi hadi dau zitakapofungwa.</li>
            <li><strong className="text-text">Kufunga raundi.</strong> Dau hufungwa kwa muda uliochapishwa. Hakuna dau linalokubaliwa baadaye.</li>
            <li><strong className="text-text">Utatuzi.</strong> Mwisho wa raundi, thamani ya kufunga husomwa kutoka chanzo rasmi kilichotajwa na kulinganishwa na malengo yaliyofungwa.</li>
          </ul>
        </LegalSection>

        <LegalSection n="3" title="Mabwawa, ada yetu na malipo">
          <p>
            Upande ulioshinda hupokea bwawa lote la upande mwingine, ukiondoa kamisheni yetu ya{" "}
            <strong className="text-text">
              <span className="font-mono tabular-nums">{r.commissionPct}%</span> ya upande ulioshindwa
            </strong>. Kilichobaki hugawanywa kwa uwiano wa dau, na dau la kila mshindi hurudishwa kamili. Kamisheni
            haichukuliwi kamwe kutoka dau la mshindi.
          </p>
          <p>
            <strong className="text-text">Dau lina mipaka:</strong> kiwango cha chini{" "}
            <span className="font-mono tabular-nums text-text">{tzs(r.minStake)}</span>, cha juu{" "}
            <span className="font-mono tabular-nums text-text">{tzs(r.maxStake)}</span>. Ushindi hukadiriwa hadi
            shilingi ya karibu.
          </p>
          <p>
            <strong className="text-text">Malipo</strong> huingizwa kwenye pochi yako baada ya raundi kutatuliwa na
            kuidhinishwa, kwa kawaida ndani ya sekunde. Kutoa pesa kuna ada ya{" "}
            <span className="font-mono tabular-nums text-text">{r.withdrawalFeePct}%</span>, inayotozwa wakati wa kutoa
            pesa pekee. Utoaji wa{" "}
            <span className="font-mono tabular-nums text-text">{tzs(1_000_000)}</span> au zaidi hukaguliwa na maafisa
            wawili kabla ya kuachiliwa, hivyo huchukua muda mrefu zaidi kwa makusudi.
          </p>
        </LegalSection>

        <LegalSection n="4" title="Mfano wa hesabu">
          <p>
            Raundi yenye bwawa la Juu la{" "}
            <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_WIN_POOL)}</span> na bwawa la Chini la{" "}
            <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_LOSE_POOL)}</span>:
          </p>
          <RulesTable
            label="Mfano wa hesabu — Juu na Chini"
            head={["Matokeo", "Bwawa lililoshindwa", `Ada (${r.commissionPct}%)`, "Kwa washindi"]}
            rows={[
              [`${d.sw.down} yashinda`, tzs(a.losingPool), tzs(a.fee), tzs(a.net)],
              [`${d.sw.up} yashinda`, tzs(b.losingPool), tzs(b.fee), tzs(b.net)],
            ]}
          />
          <p>Mchezaji mwenye sehemu ya kumi ya bwawa lililoshinda hupata sehemu ya kumi ya ushindi, pamoja na dau lake.</p>
        </LegalSection>

        <LegalSection n="5" title="Kubaini matokeo na utatuzi">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-text">Chanzo rasmi kilichotajwa.</strong> Kila raundi hutatuliwa kwa chanzo kilichotajwa kabla ya dau kufunguliwa, na kikafungwa kwa raundi hiyo.</li>
            <li><strong className="text-text">Idhini ya afisa.</strong> Afisa wa utatuzi huandika ushahidi; pale idhini ya maafisa wawili imewashwa, afisa wa pili husaini. Ushahidi huandikwa kwenye mnyororo wa ukaguzi usiofutika.</li>
            <li>
              <strong className="text-text">Kinga ya kutobadilika.</strong> Thamani ya kufunga inayoangukia ndani ya
              ukingo uliofungwa wa raundi huhesabiwa kuwa hakuna mabadiliko, raundi hubatilishwa na kila dau hurudishwa
              kamili.
            </li>
            <li><strong className="text-text">Kuchapisha.</strong> Matokeo, thamani za kufungua na kufunga, chanzo na muda wa utatuzi huchapishwa kwa kila raundi.</li>
            <li><strong className="text-text">Marekebisho.</strong> Utatuzi uliothibitishwa kuwa na hitilafu hurekebishwa au kubatilishwa, na wachezaji walioathirika hurudishiwa.</li>
          </ul>
        </LegalSection>

        <LegalSection n="6" title="Marejesho, kubatilisha na kughairi">
          <p>Kila mojawapo ya haya husababisha marejesho kamili ya kila dau kwenye raundi husika:</p>
          <RulesTable
            label="Sababu za marejesho na kubatilisha"
            head={["Sababu", "Utaratibu"]}
            rows={[
              ["Raundi ya upande mmoja", "Upande mmoja tu una dau wakati wa kufunga — hakuna bwawa, kila dau hurudishwa"],
              ["Utata", "Swali, chanzo au maneno yaliweza kueleweka kwa njia zaidi ya moja"],
              ["Hitilafu ya kiufundi", "Hitilafu yoyote ya mfumo, bei, utatuzi au maonyesho hubatilisha raundi"],
              ["Chanzo kushindwa", "Chanzo kilichotajwa hakipatikani, kimechelewa, au kinatoa thamani zinazokinzana"],
              ["Hakuna mabadiliko", "Thamani ya kufunga inaangukia ndani ya ukingo uliofungwa wa raundi"],
              ["Tukio kughairiwa", "Tukio husika limeghairiwa, limeachwa au limebadilishwa kwa kiasi kikubwa"],
              ["Nguvu zisizozuilika", "Mazingira yaliyo nje ya uwezo wetu wa kawaida"],
            ]}
          />
          <p>
            Marejesho ni kiasi kamili kilichowekwa; <strong className="text-text">hakuna ada kwa dau lililorudishwa</strong>.
          </p>
        </LegalSection>

        <LegalSection n="7" title="Dau, kuuza mapema na pochi">
          <p>
            Wachezaji lazima wawe na <strong className="text-text">umri wa miaka 18 au zaidi</strong>, wakazi wa
            Tanzania, na waliothibitishwa — uthibitisho wa utambulisho unahitajika kabla ya kuweka pesa, kuweka dau au
            kutoa pesa. Kuweka na kutoa pesa hufanyika kupitia njia za pesa za simu zilizoorodheshwa kwenye kurasa za
            malipo. Hatuombi kamwe taarifa za kadi.
          </p>
          <p>
            <strong className="text-text">Kuuza dau mapema.</strong> Ndani ya dakika{" "}
            <span className="font-mono tabular-nums text-text">{r.freeExitMinutes}</span> za kwanza baada ya kuweka dau
            unaweza kuliuza na kurudishiwa kamili bila gharama — <strong>ikiwa, wakati ulipoliweka, kulikuwa bado na
            angalau dakika {r.freeExitMinutes} za kuweka dau kwenye raundi hiyo</strong>, na ikiwa nafasi hiyo
            haikugharamiwa na bonasi.
          </p>
          <p>
            ⚠️ <strong className="text-text">Kwenye raundi fupi zaidi sharti hilo haliwezi kutimia kamwe.</strong>{" "}
            Raundi ya dakika <span className="font-mono tabular-nums text-text">{unreachable}</span> ni fupi kuliko, au
            sawa na, dakika {r.freeExitMinutes} zinazohitajika — hivyo{" "}
            <strong className="text-text">kuuza mapema hakupatikani kabisa kwenye raundi hizo</strong>. Tunasema wazi
            badala ya kuacha ugundue: haki isiyoweza kufikiwa si haki.
          </p>
          <p>
            Dau hukatwa nafasi inapothibitishwa. Nje ya dirisha la kuuza, nafasi haiwezi kubadilishwa, kughairiwa wala
            kuhamishwa. Wewe ndiye mwenye jukumu la siri za pochi yako.
          </p>
        </LegalSection>

        <LegalSection n="8" title="Mchezo wa haki na tabia zilizokatazwa">
          <ul className="list-disc pl-5 space-y-1">
            <li>Kuendesha akaunti nyingi, au kushirikiana na wachezaji wengine kuhamisha upande wowote wa bwawa.</li>
            <li>Kutumia, au kujaribu kutumia, hitilafu yoyote ya bei, ucheleweshaji au utatuzi.</li>
            <li>Kutumia roboti, skripti au zana za kiotomatiki kuweka dau au kuchukua data ya jukwaa.</li>
            <li>Kutumia vibaya marejesho au kubatilisha malipo baada ya utatuzi.</li>
            <li>Udanganyifu, kujifanya mtu mwingine au utakatishaji fedha.</li>
          </ul>
          <p>
            Haya yanaweza kusababisha dau kuzuiliwa, ushindi kupotea, akaunti kusimamishwa na — inapohitajika —
            kupelekwa kwa mamlaka.
          </p>
        </LegalSection>

        <LegalSection n="9" title="Malalamiko, marekebisho na mchezo salama">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">Madirisha mawili tofauti, si kitu kimoja.</strong>{" "}
              <em>Dirisha la pingamizi</em> ni saa{" "}
              <span className="font-mono tabular-nums text-text">{r.objectionHours}</span> baada ya utatuzi: ndani yake,
              wakati malipo bado yamesitishwa, matokeo yanaweza kurekebishwa au raundi kubatilishwa. Raundi ikishatatuliwa
              na pesa kuhama, hilo haliwezekani tena. Kando na hilo, unaweza <em>kuwasilisha malalamiko</em> kwa msaada
              kuhusu raundi iliyotatuliwa; hukaguliwa dhidi ya ushahidi na mnyororo wa ukaguzi, na jibu hutolewa kwa maandishi.
            </li>
            <li><strong className="text-text">Marekebisho.</strong> Mabadiliko makubwa hutangazwa kabla ya kuanza kutumika na hayarudi nyuma kwa raundi zilizokwisha fungwa.</li>
            <li>
              <strong className="text-text">Mchezo salama.</strong> Juu &amp; Chini ni burudani, si chanzo cha mapato, na
              raundi zake fupi hurahisisha kucheza muda mrefu kuliko ulivyokusudia. Vikomo vya amana, vikomo vya muda,
              mapumziko na kujitenga vipo kwenye wasifu wako; simu ya msaada ya kitaifa ipo chini ya kila ukurasa.
              Mchezo ukiacha kuwa wa kufurahisha, acha. Miaka 18+.
            </li>
            <li><strong className="text-text">Kukubali.</strong> Kuingia kwenye raundi ni kukubali kanuni hizi kama zilivyochapishwa wakati wa kufunga.</li>
          </ul>
        </LegalSection>
      </>
    ),

    zh: (
      <>
        <LegalSection n="1" title="导言与适用范围">
          <p>
            涨跌（Up &amp; Down）是一种短周期预测玩法：您预测某个可衡量的现实世界数值，在回合计时结束时相对其开盘参考值是{" "}
            <strong className="text-text">涨</strong>（更高）还是<strong className="text-text">跌</strong>（更低）。这是一种基于预测与判断的玩法，既非体育博彩，也非赌场产品。
          </p>
          <p>
            本服务由 50pick Ltd 运营，持有坦桑尼亚博彩委员会颁发的牌照，牌照号{" "}
            <span className="font-mono tabular-nums text-text">{LICENCE_NUMBER()}</span>。所有问题、标的、参考值与回合排期均由
            50pick 管理层独家创建与管理。回合设有多种时长——{" "}
            <span className="font-mono tabular-nums text-text">{durations}</span> 分钟——覆盖平台所列的各项标的。
          </p>
          <p>本规则可随时更新；以回合锁定时此处公布的版本为准，且变更绝不追溯适用于已锁定的回合。</p>
        </LegalSection>

        <LegalSection n="2" title="一个回合如何运作">
          <p>
            每个回合提出一个问题，仅有两个答案——例如，
            <em>&ldquo;5 分钟计时结束时，比特币会高于还是低于其开盘参考值？&rdquo;</em>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-text">开盘参考值。</strong>每个回合以公布的参考值开盘，并连同来源与时间戳一并记录。</li>
            <li>
              <strong className="text-text">两个目标价，开盘即冻结。</strong>系统在参考值上施加一个幅度，确定该回合的上下目标价。两者在回合开盘时即冻结并向您展示；结算时以收盘值与之比较。此后运营人员即便修改标的，也绝无法移动已投入资金所依据的界线。
            </li>
            <li><strong className="text-text">两个奖池。</strong>您将赌注投入涨池或跌池，池内总额实时可见。</li>
            <li><strong className="text-text">倍数会变动。</strong>所显示的倍数反映当前奖池状况，而非固定赔率；在下注截止前它不构成承诺。</li>
            <li><strong className="text-text">回合锁定。</strong>下注在公布的锁定时间关闭，其后不再接受任何下注。</li>
            <li><strong className="text-text">结算。</strong>到期时从具名公开来源读取收盘值，并与冻结的目标价比较。</li>
          </ul>
        </LegalSection>

        <LegalSection n="3" title="奖池、佣金与赔付">
          <p>
            获胜方获得对方的全部奖池，扣除我们的佣金：
            <strong className="text-text">
              失败方的 <span className="font-mono tabular-nums">{r.commissionPct}%</span>
            </strong>
            。余额按下注比例分配给获胜玩家，且每位获胜者的本金全额退回。佣金绝不从获胜者本金中扣取。
          </p>
          <p>
            <strong className="text-text">下注设有上下限：</strong>最低{" "}
            <span className="font-mono tabular-nums text-text">{tzs(r.minStake)}</span>，最高{" "}
            <span className="font-mono tabular-nums text-text">{tzs(r.maxStake)}</span>。奖金四舍五入至最接近的先令。
          </p>
          <p>
            回合结算并签核后，<strong className="text-text">奖金</strong>将计入您的钱包，通常在数秒内完成。从钱包提现收取{" "}
            <span className="font-mono tabular-nums text-text">{r.withdrawalFeePct}%</span>{" "}
            手续费，仅在提现时收取。金额达到或超过{" "}
            <span className="font-mono tabular-nums text-text">{tzs(1_000_000)}</span>{" "}
            的提现，须经两位合规专员审核后放行，因此按设计会更慢。
          </p>
        </LegalSection>

        <LegalSection n="4" title="计算示例">
          <p>
            某回合涨池为 <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_WIN_POOL)}</span>，跌池为{" "}
            <span className="font-mono tabular-nums text-text">{tzs(EXAMPLE_LOSE_POOL)}</span>：
          </p>
          <RulesTable
            label="计算示例 —— 涨跌结算"
            head={["结果", "失败方奖池", `佣金（${r.commissionPct}%）`, "获胜方分得"]}
            rows={[
              [`${d.zh.down}方获胜`, tzs(a.losingPool), tzs(a.fee), tzs(a.net)],
              [`${d.zh.up}方获胜`, tzs(b.losingPool), tzs(b.fee), tzs(b.net)],
            ]}
          />
          <p>持有获胜池十分之一的玩家，获得净奖金的十分之一，另加本金退回。</p>
        </LegalSection>

        <LegalSection n="5" title="结果判定与结算">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-text">具名公开来源。</strong>每个回合依据下注开放前即已具名、并在开盘时锁定至该回合的来源结算。</li>
            <li><strong className="text-text">专员签核。</strong>结算专员记录支持判定的证据；启用双人授权时由第二位专员会签。证据写入仅可追加的审计链。</li>
            <li>
              <strong className="text-text">无变动保护。</strong>收盘值若落在该回合冻结的幅度之内——既未高于上目标价，也未低于下目标价——视为无变动，回合作废，全部下注全额退还。
            </li>
            <li><strong className="text-text">公布。</strong>每个回合的结果、开盘与收盘值、来源及结算时间戳均予公布。</li>
            <li><strong className="text-text">更正。</strong>经确认有误的结算将被更正或作废，受影响玩家获退款或补记。</li>
          </ul>
        </LegalSection>

        <LegalSection n="6" title="退款、作废与取消">
          <p>以下情形均导致该回合全部下注全额退还：</p>
          <RulesTable
            label="退款与作废情形"
            head={["情形", "处理方式"]}
            rows={[
              ["单边回合", "锁定时仅一方持有下注——不形成奖池，全部退还"],
              ["含义不清", "问题、来源或措辞存在多种解读"],
              ["技术错误", "任何系统、定价、结算或显示错误均使回合作废"],
              ["来源失效", "具名来源不可用、延迟，或给出相互矛盾的数值"],
              ["无变动", "收盘值落在该回合冻结的幅度之内"],
              ["赛事中止", "相关事件被取消、中止或发生实质性变更"],
              ["不可抗力", "超出我们合理控制范围的情形"],
            ]}
          />
          <p>
            退款金额与所付下注完全一致；<strong className="text-text">退款不收取任何费用</strong>。
          </p>
        </LegalSection>

        <LegalSection n="7" title="下注、提前卖出与钱包">
          <p>
            玩家须<strong className="text-text">年满 18 周岁</strong>、居住于坦桑尼亚并完成验证——在充值、下注或提现之前须完成身份验证。充值与提现通过充值/提现页面公布的移动支付渠道进行。我们绝不索取银行卡信息。
          </p>
          <p>
            <strong className="text-text">提前卖出。</strong>下注后的前{" "}
            <span className="font-mono tabular-nums text-text">{r.freeExitMinutes}</span>{" "}
            分钟内，您可以全额免费卖出——<strong>前提是您下注的当时，该回合仍剩余至少 {r.freeExitMinutes} 分钟的下注时间</strong>，且该仓位并非由奖金资助。
          </p>
          <p>
            ⚠️ <strong className="text-text">在最短的回合中，该前提永远无法满足。</strong>{" "}
            <span className="font-mono tabular-nums text-text">{unreachable}</span> 分钟的回合短于或等于所需的{" "}
            {r.freeExitMinutes} 分钟余量，因此
            <strong className="text-text">这些回合完全不提供提前卖出</strong>。我们明确说明而非让您自行发现：无法行使的权利不是权利。
          </p>
          <p>仓位确认时即扣除赌注。在卖出窗口之外，仓位不可修改、取消或转让，将持有至结算。您应自行保管钱包凭证。</p>
        </LegalSection>

        <LegalSection n="8" title="公平游戏与禁止行为">
          <ul className="list-disc pl-5 space-y-1">
            <li>操作多个账户，或与其他玩家串通以影响奖池任何一方。</li>
            <li>利用或试图利用任何定价、延迟或结算错误。</li>
            <li>使用机器人、脚本或自动化工具下注或抓取平台数据。</li>
            <li>结算后滥用退款或支付撤销。</li>
            <li>欺诈、身份冒用或洗钱。</li>
          </ul>
          <p>上述行为可能导致下注被扣留、奖金被没收、账户被停用，并在适用情形下移交主管机关。</p>
        </LegalSection>

        <LegalSection n="9" title="争议、修订与理性游戏">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-text">两个不同的窗口，并非同一回事。</strong>
              <em>异议窗口</em>为结算后{" "}
              <span className="font-mono tabular-nums text-text">{r.objectionHours}</span>{" "}
              小时：在此期间且赔付仍处于暂缓时，结果仍可更正、回合仍可作废。一旦回合完成结算且资金已发放，即不再可能。另外，您可就已结算的回合向客服<em>提出争议</em>；我们将对照所记录的证据与审计链进行复核，并以书面形式告知结果。
            </li>
            <li><strong className="text-text">修订。</strong>重大变更在生效前公告，且绝不追溯适用于已锁定的回合。</li>
            <li>
              <strong className="text-text">理性游戏。</strong>涨跌是娱乐而非收入来源，且其回合短促，容易让人玩得比原本打算的更久。个人资料页提供充值限额、时间限额、冷静期与自我排除工具；每页页脚载有国家问题赌博求助热线。若游戏不再令人愉快，请停止。18+。
            </li>
            <li><strong className="text-text">接受。</strong>进入回合即表示完全接受锁定时所公布的本规则。</li>
          </ul>
        </LegalSection>
      </>
    ),
  };
}
