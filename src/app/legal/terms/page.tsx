import { LegalHeader, LegalSection } from "../_components";
import { SUPPORT_EMAIL } from "@/lib/support-config";
import { getServerT, type Locale } from "@/lib/i18n-server";

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
const META: Record<Locale, string> = {
  en: "Version 2026-04-01 · Effective on account registration.",
  sw: "Toleo 2026-04-01 · Yanaanza kutumika unaposajili akaunti.",
  zh: "版本 2026-04-01 · 自账户注册时生效。",
};
const BINDING: Record<Locale, string> = {
  en: "The English version of this document is the legally binding text; translations are provided for convenience.",
  sw: "Toleo la Kiingereza la waraka huu ndilo lenye nguvu ya kisheria; tafsiri zimetolewa kwa ajili ya urahisi tu.",
  zh: "本文件的英文版本为具有法律约束力的文本；其他语言译本仅供参考之便。",
};

const CONTENT: Record<Locale, React.ReactNode> = {
  en: (
    <>
      <LegalSection n="1" title="Operator + licence">
        <p>
          The 50pick service is operated by 50pick Ltd, registered in the United Republic of Tanzania
          (TIN pending), under licence from the Gaming Board of Tanzania (licence number to be confirmed
          at launch). Players must be 18 years or older and physically present in Tanzania at the time of play.
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
          Before withdrawing winnings you must complete identity verification against the National Identification
          Authority (NIDA). We may request additional documents (proof of address, source-of-funds declaration) if
          your activity triggers anti-money-laundering thresholds.
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
          <strong className="text-text">Our commission is 10% of the pool, but never more than a third of the
          smaller side.</strong> The smaller side is the prize — it is all the money the winning side can win —
          so capping our commission below it means that{" "}
          <strong className="text-text">a winning bet is never paid less than it staked</strong>. We never take
          more than a third of what you win.
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
          Cash-out is available while betting is open. Within the free-exit window after placing a bet you may
          sell for a full refund at no charge; after that an early-exit fee applies. If no bets are placed on the
          opposing side, there is no prize to pay from and every stake is refunded in full, at no charge.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Settlement and payout">
        <p>
          Payouts are credited to your wallet immediately on market settlement. Withdrawals to mobile money or
          bank complete within 60 seconds for amounts under TZS 1,000,000; larger amounts may be held for AML
          review for up to 24 hours.
        </p>
        <p>
          <strong className="text-text">A withdrawal is charged a 1% fee, and nothing else. No tax is withheld
          from your money.</strong> Taxes and statutory levies are paid by 50pick out of its own commission —
          they are never deducted from your balance or your winnings. The fee is shown on the withdrawal screen
          before you confirm.
        </p>
      </LegalSection>

      <LegalSection n="6" title="Voids and disputes">
        <p>
          Bets may be voided where the underlying event is abandoned, the wrong outcome is initially settled,
          or the result is corrected by the source authority within 24 hours of resolution. Disputes must be
          raised in writing to <span className="font-mono text-text-muted">{SUPPORT_EMAIL()}</span> within
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
          Tanzania) (namba ya leseni itathibitishwa wakati wa uzinduzi). Wachezaji lazima wawe na umri wa miaka
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
          Kabla ya kutoa fedha ulizoshinda, ni lazima ukamilishe uthibitisho wa utambulisho kupitia Mamlaka ya
          Vitambulisho vya Taifa (NIDA). Tunaweza kuomba nyaraka za ziada (uthibitisho wa anwani, tamko la chanzo
          cha fedha) iwapo shughuli zako zitavuka viwango vya kuzuia uoshaji wa fedha.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Jinsi masoko ya ushindani wa bei yanavyofanya kazi">
        <p>
          50pick inaendesha mfumo wa soko wa <strong className="text-text">Ushindani wa Bei wa kibwawa-kizima (whole-pool)</strong>.
          Dau zote — NDIYO na HAPANA — zinakusanywa kwenye bwawa moja. Tunatoza kamisheni yetu, na salio la bwawa
          linagawanywa kwa upande ulioshinda, kwa uwiano wa mchango wa kila dau sahihi katika bwawa la upande ulioshinda.
        </p>
        <p>
          <strong className="text-text">Kamisheni yetu ni 10% ya bwawa, lakini kamwe si zaidi ya theluthi moja ya upande
          mdogo.</strong> Upande mdogo ndiyo zawadi — ndiyo pesa zote ambazo upande ulioshinda unaweza kushinda — kwa hiyo
          kuweka kikomo cha kamisheni chini yake kunamaanisha kwamba{" "}
          <strong className="text-text">dau lililoshinda halilipwi chini ya dau lake kamwe</strong>. Hatuchukui zaidi ya
          theluthi moja ya unachoshinda.
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
          Kuuza dau (cash-out) kunapatikana wakati dau liko wazi. Ndani ya dirisha la kutoka bila gharama baada ya kuweka
          dau, unaweza kuuza na kurudishiwa dau lako kamili bila malipo; baada ya hapo ada ya kutoka mapema itatumika.
          Kama hakuna dau lililowekwa upande mwingine, hakuna zawadi ya kulipa na kila dau litarudishwa kamili, bila gharama.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Ufungaji na malipo">
        <p>
          Malipo huingizwa kwenye pochi yako mara moja soko linapofungwa. Utoaji wa fedha kwenda kwenye pesa za simu au
          benki hukamilika ndani ya sekunde 60 kwa kiasi chini ya TZS 1,000,000; kiasi kikubwa zaidi kinaweza kushikiliwa
          kwa ukaguzi wa AML kwa hadi saa 24.
        </p>
        <p>
          <strong className="text-text">Utoaji wa fedha hutozwa ada ya 1%, na si kitu kingine. Hakuna kodi inayokatwa
          kwenye pesa zako.</strong> Kodi na tozo za kisheria hulipwa na 50pick kutoka kamisheni yake yenyewe — hazikatwi
          kamwe kwenye salio lako wala kwenye ushindi wako. Ada inaonyeshwa kwenye skrini ya kutoa fedha kabla
          hujathibitisha.
        </p>
      </LegalSection>

      <LegalSection n="6" title="Kufuta dau na migogoro">
        <p>
          Dau zinaweza kufutwa endapo tukio husika litaachwa, matokeo yasiyo sahihi yatakuwa yamefungwa awali, au matokeo
          yatarekebishwa na mamlaka ya chanzo ndani ya saa 24 baada ya kufungwa. Migogoro ni lazima iwasilishwe kwa maandishi
          kwenda <span className="font-mono text-text-muted">{SUPPORT_EMAIL()}</span> ndani ya siku 30 tangu kuwekwa kwa dau.
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
          （Gaming Board of Tanzania）颁发的牌照（牌照号将于上线时确认）。玩家须年满 18 周岁，且在下注时身处坦桑尼亚境内。
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
          在提取奖金之前，您必须通过国民身份管理局（NIDA）完成身份验证。如果您的活动触发反洗钱阈值，我们可能会要求
          提供额外文件（地址证明、资金来源声明）。
        </p>
      </LegalSection>

      <LegalSection n="4" title="价格竞争市场的运作方式">
        <p>
          50pick 采用 <strong className="text-text">全资金池价格竞争（whole-pool Price Competition）</strong> 市场模型。
          所有注金——YES 与 NO——汇入同一资金池。我们扣除佣金后，剩余的净资金池按各正确注金在获胜方资金池中所占份额，
          按比例分配给获胜方。
        </p>
        <p>
          <strong className="text-text">我们的佣金为资金池的 10%，但绝不超过较小一方的三分之一。</strong>
          较小一方就是奖金——它是获胜方所能赢得的全部金额——因此将佣金上限设在其之下，就意味着
          <strong className="text-text">获胜的投注绝不会拿到低于本金的金额</strong>。我们收取的绝不超过您赢得金额的三分之一。
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
          投注开放期间可进行兑现（cash-out）。在下注后的免费退出窗口内，您可全额取回本金且不收取任何费用；此后提前退出将
          收取手续费。若无人投注对方，则没有奖金可供支付，所有注金将全额退还，不收取任何费用。
        </p>
      </LegalSection>

      <LegalSection n="5" title="结算与派彩">
        <p>
          市场结算后，派彩立即记入您的钱包。提现至移动货币或银行账户，金额低于 TZS 1,000,000 的将在 60 秒内完成；金额较大者
          可能因 AML 审查而被暂扣最长 24 小时。
        </p>
        <p>
          <strong className="text-text">提现收取 1% 手续费，除此之外别无其他。我们不会从您的资金中预扣任何税款。</strong>
          税款及法定征费由 50pick 从自己的佣金中缴纳——绝不会从您的余额或奖金中扣除。手续费会在您确认提现前显示于提现界面。
        </p>
      </LegalSection>

      <LegalSection n="6" title="作废与争议">
        <p>
          在相关赛事被取消、最初结算了错误结果，或来源主管机构在结算后 24 小时内更正结果的情况下，下注可被作废。争议须于下注后
          30 天内以书面形式提交至 <span className="font-mono text-text-muted">{SUPPORT_EMAIL()}</span>。
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
};

export default async function TermsPage() {
  const { locale } = await getServerT();
  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE[locale]}
        meta={META[locale]}
        glyph="scrollText"
      />
      <p className="text-[12.5px] italic text-text-subtle">{BINDING[locale]}</p>
      {CONTENT[locale]}
    </>
  );
}
