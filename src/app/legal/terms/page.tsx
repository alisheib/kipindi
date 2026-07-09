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
          All stakes — YES and NO — are pooled. After applying the published platform tax and operator commission,
          the remaining net pool is distributed to the winning side, pro-rata to each correct stake&apos;s share of
          the winning side&apos;s pool. The current rates are displayed on every market, in your placement preview,
          and on the public <a href="/fairness" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">market config</a>.
        </p>
        <p>
          The probabilities shown on the dial are <em>implied</em> by the current pool composition and update with
          every new bet — they are not guaranteed odds. Cash-out is available before resolution at a value derived
          from the same pool maths plus a small slippage buffer.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Settlement and payout">
        <p>
          Payouts are credited to your wallet immediately on market resolution. Withdrawals to mobile money or
          bank complete within 60 seconds for amounts under TZS 1,000,000; larger amounts may be held for AML
          review for up to 24 hours. A withholding tax applies to gross winnings at the rate prescribed by the
          Income Tax Act (Cap 332). The current rate is shown on the withdrawal screen at the time of withdrawal.
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
          Dau zote — NDIYO na HAPANA — zinakusanywa kwenye bwawa moja. Baada ya kutoza kodi ya jukwaa na komisheni ya
          mwendeshaji iliyotangazwa, salio la bwawa linagawanywa kwa upande ulioshinda, kwa uwiano wa mchango wa kila
          dau sahihi katika bwawa la upande ulioshinda. Viwango vya sasa vinaonyeshwa kwenye kila soko, kwenye onyesho la
          awali la uwekaji wako wa dau, na kwenye <a href="/fairness" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">usanidi wa soko</a> wa umma.
        </p>
        <p>
          Uwezekano unaoonyeshwa kwenye kipima-dau <em>unadokezwa</em> na muundo wa sasa wa bwawa na hubadilika kila
          linapowekwa dau jipya — si bei (odds) za uhakika. Kutoa fedha kabla ya kufungwa kwa soko (cash-out) kunapatikana
          kwa thamani inayotokana na hesabu zile zile za bwawa pamoja na buffer ndogo ya mteremko (slippage).
        </p>
      </LegalSection>

      <LegalSection n="5" title="Ufungaji na malipo">
        <p>
          Malipo huingizwa kwenye pochi yako mara moja soko linapofungwa. Utoaji wa fedha kwenda kwenye pesa za simu au
          benki hukamilika ndani ya sekunde 60 kwa kiasi chini ya TZS 1,000,000; kiasi kikubwa zaidi kinaweza kushikiliwa
          kwa ukaguzi wa AML kwa hadi saa 24. Kodi ya zuio (withholding tax) hutozwa kwenye jumla ya fedha ulizoshinda kwa
          kiwango kilichowekwa na Income Tax Act (Cap 332). Kiwango cha sasa kinaonyeshwa kwenye skrini ya kutoa fedha wakati
          wa kutoa.
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
          所有注金——YES 与 NO——汇入同一资金池。在扣除已公布的平台税与运营方佣金后，剩余的净资金池按各正确注金在获胜方资金池中
          所占份额，按比例分配给获胜方。当前费率显示在每个市场、您的下注预览以及公开的
          <a href="/fairness" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">市场配置</a>页面中。
        </p>
        <p>
          转盘上显示的概率是由当前资金池构成所<em>隐含</em>的，并随每一笔新下注而更新——它们并非保证的赔率。在结算前可进行兑现
          （cash-out），其价值依据相同的资金池算法并加上少量滑点（slippage）缓冲得出。
        </p>
      </LegalSection>

      <LegalSection n="5" title="结算与派彩">
        <p>
          市场结算后，派彩立即记入您的钱包。提现至移动货币或银行账户，金额低于 TZS 1,000,000 的将在 60 秒内完成；金额较大者
          可能因 AML 审查而被暂扣最长 24 小时。对总奖金按 Income Tax Act (Cap 332) 规定的税率征收预扣税。当前税率在提现时显示
          于提现界面。
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
