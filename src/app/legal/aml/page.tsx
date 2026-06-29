import { LegalHeader, LegalSection } from "../_components";
import { getServerT, type Locale } from "@/lib/i18n-server";

export const metadata = { title: "AML / KYC Policy" };

const EYEBROW: Record<Locale, string> = { en: "Legal", sw: "Kisheria", zh: "法律" };
const TITLE: Record<Locale, string> = {
  en: "AML & KYC Policy",
  sw: "Sera ya Kuzuia Uoshaji wa Fedha na KYC",
  zh: "反洗钱与 KYC 政策",
};
const META: Record<Locale, string> = {
  en: "Aligned with Tanzania AML Act (Cap 423) and the FATF Recommendations.",
  sw: "Imeoanishwa na Tanzania AML Act (Cap 423) na Mapendekezo ya FATF.",
  zh: "符合 Tanzania AML Act (Cap 423) 及 FATF 建议。",
};
const BINDING: Record<Locale, string> = {
  en: "The English version of this document is the legally binding text; translations are provided for convenience.",
  sw: "Toleo la Kiingereza la waraka huu ndilo lenye nguvu ya kisheria; tafsiri zimetolewa kwa ajili ya urahisi tu.",
  zh: "本文件的英文版本为具有法律约束力的文本；其他语言译本仅供参考之便。",
};

const CONTENT: Record<Locale, React.ReactNode> = {
  en: (
    <>
      <LegalSection n="1" title="Customer due diligence (CDD)">
        <p>
          Identity is verified at registration via the National Identification Authority (NIDA) using
          a 20-digit national ID number, supported by photographic ID and selfie. Withdrawals are
          blocked until KYC status is <span className="font-mono text-yes-300">APPROVED</span>.
          We capture: full name, date of birth, region, NIDA number, and photographic evidence.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Enhanced due diligence (EDD)">
        <p>EDD is triggered automatically when:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>A single transaction exceeds <strong className="text-text">TZS 1,000,000</strong> (deposit or withdrawal)</li>
          <li>Cumulative deposits in 30 days exceed TZS 5,000,000</li>
          <li>The player profile flags as a Politically Exposed Person (PEP) or is on a sanctions list</li>
          <li>Behavioural anomalies are detected (rapid deposit-then-withdraw, multiple MSISDN sources, structuring)</li>
        </ul>
        <p>
          EDD requires a source-of-funds declaration and may require supporting documentation
          (bank statement, salary slip, business registration). Withdrawals are placed in
          <span className="font-mono text-warning-fg mx-1">AML_REVIEW</span> status until cleared.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Suspicious-activity reporting (SAR)">
        <p>
          Designated AML officers review flagged activity within 1 business day. SARs are filed with
          the Financial Intelligence Unit (FIU) of Tanzania within 7 days of identification, regardless
          of customer relationship. We do not tip off players that an SAR has been filed.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Sanctions screening">
        <p>
          All registered users and beneficial owners are screened against the UN consolidated list,
          OFAC SDN list, the EU sanctions list, and the UK HMT list at registration and weekly
          thereafter. Matches block transactions and trigger immediate review.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Record retention">
        <p>
          CDD, transaction, and audit-trail records are retained for 7 years from account closure
          or transaction date, whichever is later. Logs are immutable, append-only, and signed.
        </p>
      </LegalSection>

      <LegalSection n="6" title="Training + governance">
        <p>
          All staff complete AML training annually with a refresher course every 6 months. The AML
          Officer reports directly to the Board. The Board reviews the AML risk register quarterly.
        </p>
      </LegalSection>
    </>
  ),
  sw: (
    <>
      <LegalSection n="1" title="Uchunguzi wa kina wa mteja (CDD)">
        <p>
          Utambulisho huthibitishwa wakati wa kusajili kupitia Mamlaka ya Vitambulisho vya Taifa (NIDA) kwa kutumia
          namba ya kitambulisho cha taifa yenye tarakimu 20, ikiungwa mkono na kitambulisho chenye picha na selfie.
          Utoaji wa fedha umezuiwa hadi hadhi ya KYC iwe <span className="font-mono text-yes-300">APPROVED</span>.
          Tunakusanya: jina kamili, tarehe ya kuzaliwa, mkoa, namba ya NIDA, na ushahidi wa picha.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Uchunguzi ulioimarishwa (EDD)">
        <p>EDD huanzishwa kiotomatiki pale:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Muamala mmoja unapozidi <strong className="text-text">TZS 1,000,000</strong> (kuweka au kutoa fedha)</li>
          <li>Jumla ya fedha zilizowekwa ndani ya siku 30 zinapozidi TZS 5,000,000</li>
          <li>Wasifu wa mchezaji unapoonyesha kuwa ni Mtu Anayejulikana Kisiasa (PEP) au yumo kwenye orodha ya vikwazo</li>
          <li>Tabia zisizo za kawaida zinapogundulika (kuweka-kisha-kutoa kwa haraka, vyanzo vingi vya MSISDN, kugawa miamala kwa makusudi/structuring)</li>
        </ul>
        <p>
          EDD inahitaji tamko la chanzo cha fedha na inaweza kuhitaji nyaraka za uthibitisho
          (taarifa ya benki, slipu ya mshahara, usajili wa biashara). Utoaji wa fedha huwekwa katika hadhi ya
          <span className="font-mono text-warning-fg mx-1">AML_REVIEW</span> hadi utakapoidhinishwa.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Kuripoti shughuli za kutiliwa shaka (SAR)">
        <p>
          Maafisa maalum wa AML hukagua shughuli zilizotiliwa shaka ndani ya siku 1 ya kazi. SAR huwasilishwa kwa
          Kitengo cha Ujasusi wa Kifedha (FIU) cha Tanzania ndani ya siku 7 tangu kubainika, bila kujali uhusiano
          na mteja. Hatumtaarifu mchezaji kuwa SAR imewasilishwa.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Uchunguzi wa orodha za vikwazo">
        <p>
          Watumiaji wote waliosajiliwa na wamiliki wenye manufaa huchunguzwa dhidi ya orodha ya pamoja ya UN,
          orodha ya OFAC SDN, orodha ya vikwazo ya EU, na orodha ya UK HMT wakati wa kusajili na kila wiki baada ya
          hapo. Mlinganisho wowote huzuia miamala na kusababisha ukaguzi wa papo hapo.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Uhifadhi wa kumbukumbu">
        <p>
          Kumbukumbu za CDD, miamala, na njia za ukaguzi (audit trail) huhifadhiwa kwa miaka 7 tangu kufungwa kwa
          akaunti au tarehe ya muamala, kulingana na kipi kitakachokuja baadaye. Kumbukumbu (logs) haziwezi kubadilishwa,
          ni za kuongeza-tu, na zimesainiwa.
        </p>
      </LegalSection>

      <LegalSection n="6" title="Mafunzo na utawala">
        <p>
          Wafanyakazi wote hukamilisha mafunzo ya AML kila mwaka pamoja na kozi ya ukumbusho kila baada ya miezi 6.
          Afisa wa AML huripoti moja kwa moja kwa Bodi. Bodi hukagua rejista ya hatari za AML kila robo mwaka.
        </p>
      </LegalSection>
    </>
  ),
  zh: (
    <>
      <LegalSection n="1" title="客户尽职调查（CDD）">
        <p>
          身份在注册时通过国民身份管理局（NIDA）使用 20 位国民身份号码进行验证，并辅以带照片的身份证件和自拍照。
          在 KYC 状态变为 <span className="font-mono text-yes-300">APPROVED</span> 之前，提现将被阻止。
          我们采集：全名、出生日期、地区、NIDA 号码以及照片证据。
        </p>
      </LegalSection>

      <LegalSection n="2" title="强化尽职调查（EDD）">
        <p>在以下情况下将自动触发 EDD：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>单笔交易超过 <strong className="text-text">TZS 1,000,000</strong>（存款或提现）</li>
          <li>30 天内累计存款超过 TZS 5,000,000</li>
          <li>玩家资料被标记为政治公众人物（PEP）或列于制裁名单</li>
          <li>检测到行为异常（快速存入后即提现、多个 MSISDN 来源、拆分交易/structuring）</li>
        </ul>
        <p>
          EDD 需要提供资金来源声明，并可能需要佐证文件（银行对账单、工资单、营业执照）。在通过审核之前，提现将被置于
          <span className="font-mono text-warning-fg mx-1">AML_REVIEW</span> 状态。
        </p>
      </LegalSection>

      <LegalSection n="3" title="可疑活动报告（SAR）">
        <p>
          指定的 AML 官员将在 1 个工作日内审查被标记的活动。无论客户关系如何，SAR 均会在识别后 7 天内提交至坦桑尼亚
          金融情报局（FIU）。我们不会向玩家透露已就其提交 SAR 的情况。
        </p>
      </LegalSection>

      <LegalSection n="4" title="制裁名单筛查">
        <p>
          所有注册用户及受益所有人在注册时及其后每周，都会对照 UN 综合名单、OFAC SDN 名单、EU 制裁名单以及 UK HMT
          名单进行筛查。命中者将被阻止交易并触发即时审查。
        </p>
      </LegalSection>

      <LegalSection n="5" title="记录保留">
        <p>
          CDD、交易及审计轨迹记录自账户注销或交易日期（以较晚者为准）起保留 7 年。日志不可篡改、仅可追加且经过签名。
        </p>
      </LegalSection>

      <LegalSection n="6" title="培训与治理">
        <p>
          全体员工每年完成 AML 培训，并每 6 个月参加一次复训课程。AML 官员直接向董事会汇报。董事会每季度审查一次 AML
          风险登记册。
        </p>
      </LegalSection>
    </>
  ),
};

export default async function AmlPage() {
  const { locale } = await getServerT();
  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE[locale]}
        meta={META[locale]}
      />
      <p className="text-[12.5px] italic text-text-subtle">{BINDING[locale]}</p>
      {CONTENT[locale]}
    </>
  );
}
