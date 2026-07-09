import { LegalHeader, LegalSection } from "../_components";
import { SUPPORT_EMAIL, HELPLINE, HELPLINE_TEL } from "@/lib/support-config";
import { getServerT, type Locale } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { locale } = await getServerT();
  return { title: TITLE[locale] };
}

const EYEBROW: Record<Locale, string> = { en: "Legal", sw: "Kisheria", zh: "法律" };
const TITLE: Record<Locale, string> = {
  en: "Responsible Gambling Policy",
  sw: "Sera ya Mchezo Salama",
  zh: "责任博彩政策",
};
const META: Record<Locale, string> = {
  en: "Aligned with the UK Gambling Commission LCCP and CEN Workshop Agreement 16221.",
  sw: "Imeoanishwa na UK Gambling Commission LCCP na CEN Workshop Agreement 16221.",
  zh: "符合 UK Gambling Commission LCCP 及 CEN Workshop Agreement 16221。",
};
const BINDING: Record<Locale, string> = {
  en: "The English version of this document is the legally binding text; translations are provided for convenience.",
  sw: "Toleo la Kiingereza la waraka huu ndilo lenye nguvu ya kisheria; tafsiri zimetolewa kwa ajili ya urahisi tu.",
  zh: "本文件的英文版本为具有法律约束力的文本；其他语言译本仅供参考之便。",
};

const CONTENT: Record<Locale, React.ReactNode> = {
  en: (
    <>
      <LegalSection n="1" title="Our commitment">
        <p>
          Most people gamble for fun. A small minority experience harm. 50pick designs the product,
          the marketing, and the customer journey to keep play recreational and to spot harm early.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Tools we provide">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Deposit limits</strong> — daily, weekly, monthly. Decreases take effect immediately. Increases to the daily limit are deferred 24 hours.</li>
          <li><strong className="text-text">Loss limit</strong> — daily.</li>
          <li><strong className="text-text">Session time limit</strong> — automatic logout after the chosen duration.</li>
          <li><strong className="text-text">Reality check</strong> — a banner every 30 minutes (configurable 5–120 min) showing time on platform, net win/loss for the session, and a clear path to break or self-exclude.</li>
          <li><strong className="text-text">Take a break</strong> (cooling-off): 1 hour, 24 hours, or 1 week. One-way until expiry.</li>
          <li><strong className="text-text">Self-exclusion</strong>: 24h, 1 week, 1 month, 6 months, or permanent. One-way; permanent requires documented review to reopen.</li>
        </ul>
        <p>
          All controls are accessible from your{" "}
          <a href="/profile/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">
            Responsible Gambling settings
          </a>.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Markers of harm">
        <p>
          We monitor for: rapid deposit escalation, chasing losses (multiple deposits within a losing
          session), late-night extended play (00:00–06:00 EAT), declined card cycling, breaching
          previous self-imposed limits, and unusual transaction patterns. Any single marker triggers
          an in-app prompt; multiple markers trigger a contact from our Player Safety team within 24 hours.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Operator responsibilities">
        <ul className="list-disc pl-5 space-y-1">
          <li>No marketing to self-excluded players or players under 25 in vulnerability segments</li>
          <li>No bonus offers tied to deposit increases</li>
          <li>No sign-up nudges in the late-night window</li>
          <li>Free helpline displayed on every page footer</li>
        </ul>
      </LegalSection>

      <LegalSection n="5" title="Get help">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Tanzania</strong>: National Helpline <a href={`tel:${HELPLINE_TEL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{HELPLINE()}</a> (free)</li>
          <li><strong className="text-text">International</strong>: <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="font-mono text-brand-300 underline-offset-2 hover:underline">begambleaware.org</a>, <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="font-mono text-brand-300 underline-offset-2 hover:underline">gamcare.org.uk</a></li>
          <li><strong className="text-text">Email us</strong>: <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a></li>
        </ul>
      </LegalSection>
    </>
  ),
  sw: (
    <>
      <LegalSection n="1" title="Ahadi yetu">
        <p>
          Watu wengi hucheza kamari kwa burudani. Wachache hupata madhara. 50pick imeundaa bidhaa, matangazo, na safari
          ya mteja kwa namna ya kuufanya mchezo ubaki wa burudani na kubaini madhara mapema.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Zana tunazotoa">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Mipaka ya kuweka fedha</strong> — ya kila siku, kila wiki, kila mwezi. Upunguzaji huanza kutumika mara moja. Ongezeko la mpaka wa kila siku huahirishwa kwa saa 24.</li>
          <li><strong className="text-text">Mpaka wa hasara</strong> — wa kila siku.</li>
          <li><strong className="text-text">Mpaka wa muda wa kipindi</strong> — kutoka nje kiotomatiki baada ya muda uliochaguliwa.</li>
          <li><strong className="text-text">Ukaguzi wa uhalisia (reality check)</strong> — bango kila baada ya dakika 30 (linaweza kupangwa dakika 5–120) linaloonyesha muda kwenye jukwaa, faida/hasara halisi ya kipindi, na njia wazi ya kupumzika au kujizuia.</li>
          <li><strong className="text-text">Chukua mapumziko</strong> (cooling-off): saa 1, saa 24, au wiki 1. Ni ya njia moja hadi muda utakapoisha.</li>
          <li><strong className="text-text">Kujizuia mwenyewe</strong>: saa 24, wiki 1, mwezi 1, miezi 6, au ya kudumu. Ni ya njia moja; ya kudumu inahitaji ukaguzi ulioandikwa ili kufunguliwa upya.</li>
        </ul>
        <p>
          Vidhibiti vyote vinapatikana kutoka kwenye{" "}
          <a href="/profile/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">
            mipangilio yako ya Mchezo Salama
          </a>.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Viashiria vya madhara">
        <p>
          Tunafuatilia: kupanda kwa kasi kwa fedha zinazowekwa, kufukuzia hasara (kuweka fedha mara nyingi ndani ya kipindi
          cha kupoteza), kucheza muda mrefu usiku wa manane (00:00–06:00 EAT), kujaribu kadi zilizokataliwa mara kwa mara,
          kuvunja mipaka uliyojiwekea awali, na mwenendo usio wa kawaida wa miamala. Kiashiria chochote kimoja husababisha
          ujumbe ndani ya programu; viashiria vingi husababisha mawasiliano kutoka timu yetu ya Usalama wa Mchezaji ndani ya saa 24.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Wajibu wa mwendeshaji">
        <ul className="list-disc pl-5 space-y-1">
          <li>Hakuna matangazo kwa wachezaji waliojizuia au wachezaji chini ya umri wa miaka 25 walio katika makundi yenye uangalifu maalum</li>
          <li>Hakuna ofa za bonasi zinazohusishwa na ongezeko la fedha zinazowekwa</li>
          <li>Hakuna ushawishi wa kujisajili katika kipindi cha usiku wa manane</li>
          <li>Namba ya msaada ya bure inaonyeshwa kwenye sehemu ya chini ya kila ukurasa</li>
        </ul>
      </LegalSection>

      <LegalSection n="5" title="Pata msaada">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Tanzania</strong>: Namba ya Msaada ya Taifa <a href={`tel:${HELPLINE_TEL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{HELPLINE()}</a> (bure)</li>
          <li><strong className="text-text">Kimataifa</strong>: <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="font-mono text-brand-300 underline-offset-2 hover:underline">begambleaware.org</a>, <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="font-mono text-brand-300 underline-offset-2 hover:underline">gamcare.org.uk</a></li>
          <li><strong className="text-text">Tutumie barua pepe</strong>: <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a></li>
        </ul>
      </LegalSection>
    </>
  ),
  zh: (
    <>
      <LegalSection n="1" title="我们的承诺">
        <p>
          大多数人博彩是为了娱乐。少数人会因此受到伤害。50pick 在产品、营销和客户旅程的设计上力求让游戏保持娱乐性，并及早发现伤害迹象。
        </p>
      </LegalSection>

      <LegalSection n="2" title="我们提供的工具">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">存款限额</strong> — 每日、每周、每月。下调立即生效。每日限额的上调延迟 24 小时生效。</li>
          <li><strong className="text-text">亏损限额</strong> — 每日。</li>
          <li><strong className="text-text">会话时长限制</strong> — 达到所选时长后自动登出。</li>
          <li><strong className="text-text">现实核查（reality check）</strong> — 每 30 分钟（可在 5–120 分钟之间设置）弹出横幅，显示在平台的停留时间、本会话的净盈亏，以及暂停或自我排除的清晰入口。</li>
          <li><strong className="text-text">暂停一下</strong>（冷静期）：1 小时、24 小时或 1 周。到期前不可撤销。</li>
          <li><strong className="text-text">自我排除</strong>：24 小时、1 周、1 个月、6 个月或永久。不可撤销；永久排除需经书面审查方可重新开通。</li>
        </ul>
        <p>
          所有控制项均可在您的{" "}
          <a href="/profile/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">
            责任博彩设置
          </a>中访问。
        </p>
      </LegalSection>

      <LegalSection n="3" title="伤害的标志">
        <p>
          我们监测：存款额快速攀升、追损（在亏损会话中多次存款）、深夜长时间游戏（00:00–06:00 EAT）、被拒卡片反复尝试、突破先前
          自设限额，以及异常交易模式。任一单项标志将触发应用内提示；多项标志将触发我们的玩家安全团队在 24 小时内主动联系。
        </p>
      </LegalSection>

      <LegalSection n="4" title="运营方责任">
        <ul className="list-disc pl-5 space-y-1">
          <li>不向已自我排除的玩家，或处于脆弱群体细分中、年龄低于 25 岁的玩家进行营销</li>
          <li>不提供与提高存款挂钩的奖金优惠</li>
          <li>不在深夜时段进行注册诱导</li>
          <li>在每个页面的页脚显示免费求助热线</li>
        </ul>
      </LegalSection>

      <LegalSection n="5" title="获取帮助">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">坦桑尼亚</strong>：全国求助热线 <a href={`tel:${HELPLINE_TEL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{HELPLINE()}</a>（免费）</li>
          <li><strong className="text-text">国际</strong>：<a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="font-mono text-brand-300 underline-offset-2 hover:underline">begambleaware.org</a>、<a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="font-mono text-brand-300 underline-offset-2 hover:underline">gamcare.org.uk</a></li>
          <li><strong className="text-text">发送邮件给我们</strong>：<a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a></li>
        </ul>
      </LegalSection>
    </>
  ),
};

export default async function ResponsibleGamblingPolicyPage() {
  const { locale } = await getServerT();
  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE[locale]}
        meta={META[locale]}
        glyph="shield"
      />
      <p className="text-[12.5px] italic text-text-subtle">{BINDING[locale]}</p>
      {CONTENT[locale]}
    </>
  );
}
