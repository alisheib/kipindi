import { LegalHeader, LegalSection, LEGAL_BINDING_LANGUAGE as BINDING } from "../_components";
import { SUPPORT_EMAIL, LICENCE_NUMBER } from "@/lib/server/support-config";
import { getServerT, type Locale } from "@/lib/i18n-server";
import { getGlobalConfig } from "@/lib/server/market-config";

// The void ground in §6 tracks a LIVE setting, so this page cannot be statically baked — it
// would freeze a legal promise at whatever the window was on the day of the last build.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await getServerT();
  return { title: TITLE[locale] };
}

const EYEBROW: Record<Locale, string> = { en: "Legal", sw: "Kisheria", zh: "法律" };
const TITLE: Record<Locale, string> = {
  en: "Terms of Service",
  sw: "Masharti ya Huduma",
  zh: "服务条款",
};
/**
 * ⛔ BUMPED 2026-09-05, AND THE BUMP IS THE POINT. §6's void ground narrowed from a flat 24
 * hours to the objection window actually in force (Ali's ruling ④). That is a change to the
 * BINDING English text — a player protection got shorter — so it cannot ride in on a version
 * that still claims 2026-04-01. `COMPLIANCE-DECISIONS.md` carries the reasoning.
 */
const META: Record<Locale, string> = {
  en: "Version 2026-09-07 · Effective on account registration.",
  sw: "Toleo 2026-09-07 · Yanaanza kutumika unaposajili akaunti.",
  zh: "版本 2026-09-07 · 自账户注册时生效。",
};

/**
 * ⛔ A FUNCTION OF THE CONFIGURED WINDOW, NOT A CONSTANT — and the reason is §6, not §5.
 *
 * §6 is a VOID GROUND, and it is a DIFFERENT promise from the objection window: it says a bet
 * may be voided when the source authority CORRECTS a result within a stated time of resolution.
 * It was written as a flat 24 hours while the objection window happened to be 24 hours too, so
 * the two read as one rule. They never were one rule.
 *
 * 🔴 THE PLATFORM CANNOT KEEP THE 24-HOUR FORM ONCE THE WINDOW IS SHORTER. After `settledAt` is
 * stamped the money is in players' wallets: `emergencyVoidMarket` refuses a settled market and
 * `objectionEligibility` returns `ALREADY_SETTLED` by design. So a source correction arriving at
 * hour two could not be honoured, and a public promise the code refuses is worse than a shorter
 * one it keeps. Ali ruled ④ (2026-09-05) to narrow it to the window actually in force, and the
 * META version below is bumped in the same change because the binding English text moved.
 *
 * ⚠️ THE OTHER THREE "24 hours" IN THIS FILE ARE NOT THIS. §5 and its SW/ZH twins are the AML
 * review hold on large withdrawals — unrelated, unchanged, and they must stay 24.
 */
/**
 * ⭐ EXPORTED so `scripts/terms-cancellation.test.mts` can RENDER it. §4 is binding prose that
 * no guard could reach — `test:rate-copy` scans the i18n dictionaries and this text is JSX in a
 * page. §6.12 had to narrow it in all three languages and nothing would have caught one being
 * left behind. Exporting the content map is what makes it executable.
 */
export function content(objectionHours: number): Record<Locale, React.ReactNode> { return {
  en: (
    <>
      <LegalSection n="1" title="Operator + licence">
        <p>
          The 50pick service is operated by 50pick Ltd, registered in the United Republic of Tanzania
          (TIN pending), under licence from the Gaming Board of Tanzania, licence number{" "}
          {LICENCE_NUMBER()}. Players must be 18 years or older and physically present in Tanzania at
          the time of play.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Account eligibility">
        <ul className="list-disc pl-5 space-y-1">
          <li>Tanzanian resident with a valid NIDA national identification number</li>
          <li>Aged 18 or older at the time of registration</li>
          <li>One account per natural person; duplicate accounts will be closed and balances forfeited per AML rules</li>
          <li>You must keep your registered phone number, email, and address up to date</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="Identity verification (KYC)">
        <p>
          Identity verification is <strong>required</strong> before you can deposit, place a
          bet or withdraw. You verify once, with any one of four documents — a National ID (NIDA)
          number, a passport, a driving licence or a voter&apos;s card — with photographic
          evidence reviewed by our compliance team. One document may only be used on one
          account. An account that has been verified once keeps the right to withdraw the money
          it holds even if we later ask it to verify again. We may request additional documents
          (proof of address, source-of-funds declaration) if your activity triggers
          anti-money-laundering thresholds, and withdrawals of TZS 1,000,000 or more are held
          for review by two compliance officers.
        </p>
      </LegalSection>

      <LegalSection n="4" title="How price-competition markets work">
        <p>
          50pick operates a <strong className="text-text">whole-pool Price Competition</strong> market model.
          All stakes — YES and NO — are pooled. We deduct our commission, and the remaining net pool is
          distributed to the winning side, pro-rata to each correct stake&apos;s share of the winning
          side&apos;s pool.
        </p>
        <p>
          <strong className="text-text">Our commission is 13% of the losing side.</strong> The winning side&apos;s
          stakes are returned in full and are never touched; our commission comes only out of the money staked on
          the outcome that did not happen. It follows that{" "}
          <strong className="text-text">a winning bet is never paid less than it staked</strong>.
        </p>
        <p>
          If every stake is on one side, there is no losing side, so we charge nothing and every stake is
          returned in full. The same applies to a market that is voided.
        </p>
        <p>
          The rates that apply to a market are <strong className="text-text">fixed when that market is
          created</strong> and cannot be changed afterwards. A later change to our rates affects future markets
          only; it can never re-price a bet you have already placed. The exact commission taken from a settled
          pool is shown, in shillings, on that market&apos;s resolution panel.
        </p>
        <p>
          The probabilities shown on the dial are <em>implied</em> by the current pool composition and update with
          every new bet — they are not guaranteed odds. While betting is open your final payout is not yet
          determined, because the pools are still moving. <strong className="text-text">The moment betting closes,
          the pools are final and we notify you of the exact amount you will receive if your side wins.</strong>
        </p>
        <p>
          Cash-out is available for a short window after placing a bet: within the first 5 minutes you may sell for
          a full refund at no charge — <strong>provided that, at the moment you placed the bet, at least 5 minutes
          of betting time still remained on that market</strong>. On Up &amp; Down 3-minute and 5-minute rounds that
          condition can never be met, so <strong>cash-out is not available on those rounds at all</strong>. A
          bonus-funded position can never be sold. After the window the position is locked and rides to settlement —
          it cannot be sold. If no bets are placed on the opposing side, there is no prize to pay from and every
          stake is refunded in full, at no charge.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Settlement and payout">
        <p>
          Payouts are credited to your wallet immediately on market settlement. Withdrawals to mobile money or
          bank complete within 60 seconds for amounts under TZS 1,000,000; larger amounts may be held for AML
          review for up to 24 hours.
        </p>
        <p>
          <strong className="text-text">A withdrawal is charged a 1.5% fee, and nothing else. No tax is withheld
          from your money.</strong> Taxes and statutory levies are paid by 50pick out of its own commission —
          they are never deducted from your balance or your winnings. The fee is shown on the withdrawal screen
          before you confirm.
        </p>
      </LegalSection>

      <LegalSection n="6" title="Voids and disputes">
        <p>
          Bets may be voided where the underlying event is abandoned, the wrong outcome is initially settled,
          or the result is corrected by the source authority within {objectionHours} hour
          {objectionHours === 1 ? "" : "s"} of resolution, while the payout is still on hold. Disputes must be
          raised in writing to <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a> within
          30 days of placement.
        </p>
      </LegalSection>

      <LegalSection n="7" title="Responsible gambling">
        <p>
          You can set deposit limits, take a break, or self-exclude in
          <a href="/profile/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline ml-1">Responsible Gambling</a>.
          See the dedicated <a href="/legal/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">Responsible Gambling Policy</a>.
        </p>
      </LegalSection>

      <LegalSection n="8" title="Account closure">
        <p>
          You may close your account at any time. We retain transaction history for the period required by
          law (currently 7 years for AML records).
        </p>
      </LegalSection>

      <LegalSection n="9" title="Liability">
        <p>
          To the maximum extent permitted by law, our liability is limited to the balance held in your wallet
          at the time of any disputed event. We are not liable for losses arising from match fixing or third-party
          fraud, which are handled per the Match Integrity Annex (B).
        </p>
      </LegalSection>

      <LegalSection n="10" title="Changes">
        <p>
          We will notify you in writing (in-app + SMS) at least 14 days before any material change to these
          Terms. Continued use after the change constitutes acceptance.
        </p>
      </LegalSection>
    </>
  ),
  sw: (
    <>
      <LegalSection n="1" title="Mwendeshaji na leseni">
        <p>
          Huduma ya 50pick inaendeshwa na 50pick Ltd, iliyosajiliwa katika Jamhuri ya Muungano wa Tanzania
          (TIN inasubiriwa), chini ya leseni kutoka Bodi ya Michezo ya Kubahatisha Tanzania (Gaming Board of
          Tanzania), namba ya leseni {LICENCE_NUMBER()}. Wachezaji lazima wawe na umri wa miaka
          18 au zaidi na wawepo Tanzania wakati wa kucheza.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Sifa za kustahili kufungua akaunti">
        <ul className="list-disc pl-5 space-y-1">
          <li>Mkazi wa Tanzania mwenye namba halali ya kitambulisho cha taifa cha NIDA</li>
          <li>Mwenye umri wa miaka 18 au zaidi wakati wa kusajili</li>
          <li>Akaunti moja kwa kila mtu; akaunti za nakala zitafungwa na salio kupotea kwa mujibu wa kanuni za AML</li>
          <li>Ni lazima usasishe namba yako ya simu, barua pepe, na anwani uliyosajili</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="Uthibitisho wa utambulisho (KYC)">
        <p>
          Uthibitisho wa utambulisho <strong>unahitajika</strong> kabla ya kuweka fedha, kuweka
          dau au kutoa fedha. Unathibitisha mara moja, kwa kutumia mojawapo ya nyaraka nne —
          namba ya NIDA, pasipoti, leseni ya udereva au kadi ya mpiga kura — pamoja na ushahidi
          wa picha unaokaguliwa na timu yetu ya uzingatiaji. Nyaraka moja inaweza kutumika
          kwenye akaunti moja pekee. Akaunti iliyothibitishwa mara moja inabaki na haki ya kutoa
          fedha ilizonazo hata tukiomba baadaye ithibitishwe upya. Tunaweza kuomba nyaraka za
          ziada (uthibitisho wa anwani, tamko la chanzo cha fedha) iwapo shughuli zako zitavuka
          viwango vya kuzuia uoshaji wa fedha, na kutoa TZS 1,000,000 au zaidi kunashikiliwa kwa
          ukaguzi wa maafisa wawili.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Jinsi masoko ya ushindani wa bei yanavyofanya kazi">
        <p>
          50pick inaendesha mfumo wa soko wa <strong className="text-text">Ushindani wa Bei wa kibwawa-kizima (whole-pool)</strong>.
          Dau zote — NDIYO na HAPANA — zinakusanywa kwenye bwawa moja. Tunatoza kamisheni yetu, na salio la bwawa
          linagawanywa kwa upande ulioshinda, kwa uwiano wa mchango wa kila dau sahihi katika bwawa la upande ulioshinda.
        </p>
        <p>
          <strong className="text-text">Kamisheni yetu ni 13% ya upande ulioshindwa.</strong> Dau za upande ulioshinda
          zinarudishwa zote na haziguswi kamwe; kamisheni yetu inatoka tu kwenye fedha zilizowekwa kwenye matokeo
          yasiyotokea. Kwa hiyo{" "}
          <strong className="text-text">dau lililoshinda halilipwi chini ya dau lake kamwe</strong>.
        </p>
        <p>
          Kama dau zote ziko upande mmoja, hakuna upande ulioshindwa, kwa hiyo hatutozi chochote na kila dau
          linarudishwa lote. Vivyo hivyo kwa soko lililofutwa.
        </p>
        <p>
          Viwango vinavyotumika kwenye soko <strong className="text-text">vinawekwa soko linapoundwa</strong> na haviwezi
          kubadilishwa baadaye. Mabadiliko ya viwango vyetu yataathiri masoko yajayo pekee; hayawezi kubadilisha bei ya dau
          ulilokwisha weka. Kamisheni kamili iliyochukuliwa kwenye bwawa lililotatuliwa inaonyeshwa, kwa shilingi, kwenye
          paneli ya matokeo ya soko hilo.
        </p>
        <p>
          Uwezekano unaoonyeshwa kwenye kipima-dau <em>unadokezwa</em> na muundo wa sasa wa bwawa na hubadilika kila
          linapowekwa dau jipya — si bei (odds) za uhakika. Wakati dau bado liko wazi, malipo yako ya mwisho bado
          hayajapangwa kwa sababu bwawa bado linabadilika.{" "}
          <strong className="text-text">Mara dau litakapofungwa, bwawa litakuwa la mwisho na tutakujulisha kiasi kamili
          utakachopata iwapo upande wako utashinda.</strong>
        </p>
        <p>
          Kuuza dau (cash-out) kunapatikana kwa muda mfupi baada ya kuweka dau: ndani ya dakika 5 za kwanza unaweza
          kuuza na kurudishiwa dau lako kamili bila malipo — <strong>ilimradi wakati ulipoweka dau, soko hilo lilikuwa
          bado na angalau dakika 5 za muda wa kuweka dau</strong>. Katika raundi za Up &amp; Down za dakika 3 na dakika 5
          sharti hilo haliwezi kutimia kamwe, hivyo <strong>kuuza dau hakupatikani kabisa katika raundi hizo</strong>.
          Dau lililowekwa kwa bonasi haliwezi kuuzwa wakati wowote. Baada ya muda huo dau linafungwa na linaenda hadi
          malipo — haliwezi kuuzwa. Kama hakuna dau lililowekwa upande mwingine, hakuna zawadi ya kulipa na kila dau
          litarudishwa kamili, bila gharama.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Ufungaji na malipo">
        <p>
          Malipo huingizwa kwenye pochi yako mara moja soko linapofungwa. Utoaji wa fedha kwenda kwenye pesa za simu au
          benki hukamilika ndani ya sekunde 60 kwa kiasi chini ya TZS 1,000,000; kiasi kikubwa zaidi kinaweza kushikiliwa
          kwa ukaguzi wa AML kwa hadi saa 24.
        </p>
        <p>
          <strong className="text-text">Utoaji wa fedha hutozwa ada ya 1.5%, na si kitu kingine. Hakuna kodi inayokatwa
          kwenye pesa zako.</strong> Kodi na tozo za kisheria hulipwa na 50pick kutoka kamisheni yake yenyewe — hazikatwi
          kamwe kwenye salio lako wala kwenye ushindi wako. Ada inaonyeshwa kwenye skrini ya kutoa fedha kabla
          hujathibitisha.
        </p>
      </LegalSection>

      <LegalSection n="6" title="Kufuta dau na migogoro">
        <p>
          Dau zinaweza kufutwa endapo tukio husika litaachwa, matokeo yasiyo sahihi yatakuwa yamefungwa awali, au matokeo
          yatarekebishwa na mamlaka ya chanzo ndani ya saa {objectionHours} baada ya kufungwa, wakati malipo bado
          yamesimamishwa. Migogoro ni lazima iwasilishwe kwa maandishi
          kwenda <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a> ndani ya siku 30 tangu kuwekwa kwa dau.
        </p>
      </LegalSection>

      <LegalSection n="7" title="Mchezo salama wa kubahatisha">
        <p>
          Unaweza kuweka mipaka ya kuweka fedha, kuchukua mapumziko, au kujizuia mwenyewe katika
          <a href="/profile/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline ml-1">Mchezo Salama</a>.
          Angalia <a href="/legal/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">Sera ya Mchezo Salama</a> maalum.
        </p>
      </LegalSection>

      <LegalSection n="8" title="Kufunga akaunti">
        <p>
          Unaweza kufunga akaunti yako wakati wowote. Tunahifadhi historia ya miamala kwa muda unaotakiwa kisheria
          (kwa sasa miaka 7 kwa kumbukumbu za AML).
        </p>
      </LegalSection>

      <LegalSection n="9" title="Dhima">
        <p>
          Kwa kiwango cha juu kinachoruhusiwa na sheria, dhima yetu inakomea kwenye salio lililopo kwenye pochi yako
          wakati wa tukio lolote lenye mgogoro. Hatuwajibiki kwa hasara zinazotokana na uchakachuaji wa mechi au udanganyifu
          wa watu wengine, ambao hushughulikiwa kwa mujibu wa Match Integrity Annex (B).
        </p>
      </LegalSection>

      <LegalSection n="10" title="Mabadiliko">
        <p>
          Tutakuarifu kwa maandishi (ndani ya programu + SMS) angalau siku 14 kabla ya mabadiliko yoyote muhimu ya Masharti
          haya. Kuendelea kutumia huduma baada ya mabadiliko ni kukubali.
        </p>
      </LegalSection>
    </>
  ),
  zh: (
    <>
      <LegalSection n="1" title="运营方与牌照">
        <p>
          50pick 服务由在坦桑尼亚联合共和国注册的 50pick Ltd 运营（TIN 待定），并持有坦桑尼亚博彩委员会
          （Gaming Board of Tanzania）颁发的牌照，牌照号 {LICENCE_NUMBER()}。玩家须年满 18 周岁，且在下注时身处坦桑尼亚境内。
        </p>
      </LegalSection>

      <LegalSection n="2" title="账户资格">
        <ul className="list-disc pl-5 space-y-1">
          <li>持有有效 NIDA 国民身份号码的坦桑尼亚居民</li>
          <li>注册时年满 18 周岁</li>
          <li>每位自然人仅限一个账户；重复账户将被关闭，余额按 AML 规定予以没收</li>
          <li>您必须及时更新所登记的电话号码、电子邮箱和地址</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="身份验证（KYC）">
        <p>
          在充值、投注或提现之前，<strong>必须</strong>先完成身份验证。您只需验证一次，可使用四种
          证件之一——国民身份证（NIDA）号码、护照、驾驶证或选民证——并提交由我们的合规团队审核的
          照片证据。一份证件仅可用于一个账户。已完成一次验证的账户，即使我们此后要求重新验证，仍
          保留提取其账户内资金的权利。如果您的活动触发反洗钱阈值，我们可能会要求提供额外文件
          （地址证明、资金来源声明）；TZS 1,000,000 及以上的提现须经两名合规专员审核。
        </p>
      </LegalSection>

      <LegalSection n="4" title="价格竞争市场的运作方式">
        <p>
          50pick 采用 <strong className="text-text">全资金池价格竞争（whole-pool Price Competition）</strong> 市场模型。
          所有注金——YES 与 NO——汇入同一资金池。我们扣除佣金后，剩余的净资金池按各正确注金在获胜方资金池中所占份额，
          按比例分配给获胜方。
        </p>
        <p>
          <strong className="text-text">我们的佣金为失败一方的 13%。</strong>
          获胜一方的本金全额退回，永不被动；我们的佣金仅从未发生结果一方的投注中扣取。因此
          <strong className="text-text">获胜的投注绝不会拿到低于本金的金额</strong>。
        </p>
        <p>
          若所有投注都在同一方，则不存在失败一方，我们不收取任何费用，所有注金全额退还。市场被作废时同理。
        </p>
        <p>
          适用于某个市场的费率<strong className="text-text">在该市场创建时即已固定</strong>，此后不可更改。我们日后调整费率
          仅影响未来的市场；绝不会重新计价您已下的注。已结算奖池实际收取的佣金，会以先令金额显示在该市场的结算面板上。
        </p>
        <p>
          转盘上显示的概率是由当前资金池构成所<em>隐含</em>的，并随每一笔新下注而更新——它们并非保证的赔率。在投注开放期间，
          由于资金池仍在变动，您的最终赔付尚未确定。
          <strong className="text-text">投注一经关闭，资金池即告最终确定，我们会通知您：若您所选一方获胜，您将收到的确切金额。</strong>
        </p>
        <p>
          下注后有一小段兑现（cash-out）窗口：前 5 分钟内您可全额取回本金且不收取任何费用——
          <strong>前提是您下注时，该市场仍剩余至少 5 分钟的投注时间</strong>。在 Up &amp; Down 的 3 分钟与 5 分钟场次中，
          该条件永远无法满足，因此<strong>这些场次完全不提供兑现</strong>。以奖金资助的持仓在任何时候均不可卖出。
          此后持仓将被锁定并保留至结算 — 无法卖出。若无人投注对方，则没有奖金可供支付，所有注金将全额退还，不收取任何费用。
        </p>
      </LegalSection>

      <LegalSection n="5" title="结算与派彩">
        <p>
          市场结算后，派彩立即记入您的钱包。提现至移动货币或银行账户，金额低于 TZS 1,000,000 的将在 60 秒内完成；金额较大者
          可能因 AML 审查而被暂扣最长 24 小时。
        </p>
        <p>
          <strong className="text-text">提现收取 1.5% 手续费，除此之外别无其他。我们不会从您的资金中预扣任何税款。</strong>
          税款及法定征费由 50pick 从自己的佣金中缴纳——绝不会从您的余额或奖金中扣除。手续费会在您确认提现前显示于提现界面。
        </p>
      </LegalSection>

      <LegalSection n="6" title="作废与争议">
        <p>
          在相关赛事被取消、最初结算了错误结果，或来源主管机构在结算后 {objectionHours} 小时内（赔付仍处于暂缓期间）更正结果的情况下，下注可被作废。争议须于下注后
          30 天内以书面形式提交至 <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>。
        </p>
      </LegalSection>

      <LegalSection n="7" title="责任博彩">
        <p>
          您可以在
          <a href="/profile/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline ml-1">责任博彩</a>
          中设置存款限额、暂停游戏或自我排除。
          另请参阅专门的<a href="/legal/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">责任博彩政策</a>。
        </p>
      </LegalSection>

      <LegalSection n="8" title="账户注销">
        <p>
          您可随时注销账户。我们会按法律要求的期限保留交易记录（目前 AML 记录为 7 年）。
        </p>
      </LegalSection>

      <LegalSection n="9" title="责任">
        <p>
          在法律允许的最大范围内，我方责任以发生任何争议事件时您钱包中持有的余额为限。对于因操纵比赛或第三方欺诈造成的损失，
          我方不承担责任，此类情形按 Match Integrity Annex (B) 处理。
        </p>
      </LegalSection>

      <LegalSection n="10" title="变更">
        <p>
          在对本条款作出任何重大变更前，我们将至少提前 14 天以书面形式（应用内 + 短信）通知您。变更后继续使用即视为接受。
        </p>
      </LegalSection>
    </>
  ),
}; }

export default async function TermsPage() {
  const { locale } = await getServerT();
  // ⛔ THE LIVE VALUE, NOT A LITERAL. `getGlobalConfig()` merges the persisted production
  // snapshot over the code defaults, so this page states the window that is actually in force —
  // including on the day it changes, and without a second definition of the number living in a
  // legal document. `dynamic = "force-dynamic"` below is what stops it being baked at build time.
  const { objectionWindowHours } = await getGlobalConfig();
  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE[locale]}
        meta={META[locale]}
        glyph="scrollText"
      />
      <p className="text-body-sm italic text-text-subtle">{BINDING[locale]}</p>
      {content(objectionWindowHours)[locale]}
    </>
  );
}
