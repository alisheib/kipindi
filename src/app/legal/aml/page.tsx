import { LegalHeader, LegalSection } from "../_components";
import { SUPPORT_EMAIL } from "@/lib/server/support-config";
import { getServerT, type Locale } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { locale } = await getServerT();
  return { title: TITLE[locale] };
}

const EYEBROW: Record<Locale, string> = { en: "Legal", sw: "Kisheria", zh: "法律" };
const TITLE: Record<Locale, string> = {
  en: "AML & KYC Policy",
  sw: "Sera ya Kuzuia Uoshaji wa Fedha na KYC",
  zh: "反洗钱与 KYC 政策",
};
const META: Record<Locale, string> = {
  en: "Version 2026-09-07 · Aligned with Tanzania AML Act (Cap 423) and the FATF Recommendations.",
  sw: "Toleo 2026-09-07 · Imeoanishwa na Tanzania AML Act (Cap 423) na Mapendekezo ya FATF.",
  zh: "版本 2026-09-07 · 符合 Tanzania AML Act (Cap 423) 及 FATF 建议。",
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
          Identity verification is <strong>required</strong> of every player before they
          deposit, bet or withdraw. A player verifies with any one of four documents — a
          20-digit National ID (NIDA) number, a passport, a driving licence or a voter&apos;s
          card. We check the number against that document&apos;s format rule, enforce that the
          document is unique to a single account, and our compliance team reviews the
          photographic evidence together with a selfie. We capture: full name, date of birth,
          region, the document type and number, and photographic evidence. Even once identity
          is verified, withdrawals of TZS 1,000,000 or more are held for two-officer review.
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

      <LegalSection n="4" title="Sanctions and politically exposed persons (PEP)">
        <p>
          We do <strong>not</strong> run an automated screening feed against the UN, OFAC, EU or
          UK HMT sanctions lists. Sanctions and PEP exposure are assessed by a compliance officer
          as a checklist item during every identity review and every enhanced due diligence
          review, using the name, date of birth and document details collected under §1. Where
          an officer records a concern, the account may be suspended — which stops deposits,
          bets and withdrawals — and a suspicious-activity report is filed with the Financial
          Intelligence Unit where the law requires it. This policy states only the screening we
          actually perform; it will be re-versioned before any automated list screening is
          introduced.
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

      <LegalSection n="7" title="Contact + reporting">
        <p>
          To raise an AML/KYC concern or ask about your records, contact our compliance team at{" "}
          <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>.
        </p>
      </LegalSection>
    </>
  ),
  sw: (
    <>
      <LegalSection n="1" title="Uchunguzi wa kina wa mteja (CDD)">
        <p>
          Uthibitisho wa utambulisho <strong>unahitajika</strong> kwa kila mchezaji kabla ya
          kuweka fedha, kuweka dau au kutoa fedha. Mchezaji anathibitisha kwa kutumia mojawapo
          ya nyaraka nne — namba ya NIDA yenye tarakimu 20, pasipoti, leseni ya udereva au kadi
          ya mpiga kura. Tunakagua namba kwa kanuni ya nyaraka hiyo, tunahakikisha nyaraka
          inatumika kwenye akaunti moja pekee, na timu yetu ya uzingatiaji hukagua ushahidi wa
          picha pamoja na selfie. Tunakusanya: jina kamili, tarehe ya kuzaliwa, mkoa, aina na
          namba ya nyaraka, na ushahidi wa picha. Hata utambulisho ukishathibitishwa, kutoa
          TZS 1,000,000 au zaidi kunashikiliwa kwa ukaguzi wa maafisa wawili.
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

      <LegalSection n="4" title="Vikwazo na watu wanaojulikana kisiasa (PEP)">
        <p>
          <strong>Hatuendeshi</strong> mfumo wa kiotomatiki wa kuchunguza orodha za vikwazo za UN,
          OFAC, EU au UK HMT. Hatari ya vikwazo na ya PEP hukaguliwa na afisa wa uzingatiaji kama
          kipengele cha orodha ya ukaguzi katika kila ukaguzi wa utambulisho na kila ukaguzi wa
          kina wa mteja (EDD), kwa kutumia jina, tarehe ya kuzaliwa na taarifa za nyaraka
          zilizokusanywa chini ya §1. Afisa akirekodi wasiwasi, akaunti inaweza kusimamishwa —
          jambo linalozuia kuweka fedha, kuweka dau na kutoa fedha — na ripoti ya shughuli za
          kutiliwa shaka huwasilishwa kwa Kitengo cha Intelijensia ya Fedha (FIU) pale sheria
          inapohitaji. Sera hii inataja tu uchunguzi tunaoufanya kweli; itatolewa toleo jipya
          kabla ya uchunguzi wowote wa kiotomatiki wa orodha kuanzishwa.
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

      <LegalSection n="7" title="Mawasiliano na kuripoti">
        <p>
          Kuwasilisha wasiwasi wa AML/KYC au kuuliza kuhusu kumbukumbu zako, wasiliana na timu yetu ya uzingatiaji kupitia{" "}
          <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>.
        </p>
      </LegalSection>
    </>
  ),
  zh: (
    <>
      <LegalSection n="1" title="客户尽职调查（CDD）">
        <p>
          每位玩家在充值、投注或提现之前均<strong>必须</strong>完成身份验证。玩家可使用四种证件
          之一进行验证——20 位国民身份证（NIDA）号码、护照、驾驶证或选民证。我们按该证件的格式
          规则核对号码，确保一份证件仅绑定一个账户，并由我们的合规团队审核照片证据及自拍照。
          我们采集：全名、出生日期、地区、证件类型与号码以及照片证据。
          即使身份已验证，TZS 1,000,000 及以上的提现仍须经两名合规专员审核。
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

      <LegalSection n="4" title="制裁与政治公众人物（PEP）">
        <p>
          我们<strong>不</strong>运行对照 UN、OFAC、EU 或 UK HMT 制裁名单的自动筛查系统。制裁与 PEP
          风险由合规专员在每次身份审核及每次强化尽职调查（EDD）中，依据第 1 条采集的姓名、出生日期
          及证件信息，作为核查清单项目进行人工评估。若专员记录了疑虑，该账户可被暂停——暂停后无法
          充值、投注或提现——并在法律要求时向金融情报单位（FIU）提交可疑活动报告。本政策仅陈述我们
          实际执行的筛查；在引入任何自动名单筛查之前，本政策将先行更新版本。
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

      <LegalSection n="7" title="联系与举报">
        <p>
          如需提出反洗钱/KYC 相关问题或查询您的记录，请通过{" "}
          <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a> 联系我们的合规团队。
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
        glyph="shieldcheck"
      />
      <p className="text-body-sm italic text-text-subtle">{BINDING[locale]}</p>
      {CONTENT[locale]}
    </>
  );
}
