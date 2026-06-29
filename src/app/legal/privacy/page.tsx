import { LegalHeader, LegalSection } from "../_components";
import { SUPPORT_EMAIL } from "@/lib/support-config";
import { getServerT, type Locale } from "@/lib/i18n-server";

export const metadata = { title: "Privacy Policy" };

const EYEBROW: Record<Locale, string> = { en: "Legal", sw: "Kisheria", zh: "法律" };
const TITLE: Record<Locale, string> = {
  en: "Privacy Policy",
  sw: "Sera ya Faragha",
  zh: "隐私政策",
};
const META: Record<Locale, string> = {
  en: "Aligned with the Tanzania Personal Data Protection Act 2022 and EU GDPR principles.",
  sw: "Imeoanishwa na Tanzania Personal Data Protection Act 2022 na kanuni za EU GDPR.",
  zh: "符合 Tanzania Personal Data Protection Act 2022 及 EU GDPR 原则。",
};
const BINDING: Record<Locale, string> = {
  en: "The English version of this document is the legally binding text; translations are provided for convenience.",
  sw: "Toleo la Kiingereza la waraka huu ndilo lenye nguvu ya kisheria; tafsiri zimetolewa kwa ajili ya urahisi tu.",
  zh: "本文件的英文版本为具有法律约束力的文本；其他语言译本仅供参考之便。",
};

const CONTENT: Record<Locale, React.ReactNode> = {
  en: (
    <>
      <LegalSection n="1" title="Data controller">
        <p>
          50pick Ltd, Dar es Salaam, Tanzania. Contact:{" "}
          <span className="font-mono text-text-muted">{SUPPORT_EMAIL()}</span>. Our data protection
          officer (DPO) is reachable at the same address.
        </p>
      </LegalSection>

      <LegalSection n="2" title="What we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Identity</strong>: full name, date of birth, NIDA number, photographic ID</li>
          <li><strong className="text-text">Contact</strong>: phone number (E.164), region</li>
          <li><strong className="text-text">Financial</strong>: deposit and withdrawal records, mobile-money MSISDN, prediction activity</li>
          <li><strong className="text-text">Technical</strong>: IP address, device and browser fingerprint, session timestamps</li>
          <li><strong className="text-text">Behavioural</strong>: time on platform, reality-check responses, limit changes</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="Lawful basis">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Performance of contract</strong>: account, wallet, bet placement, settlement</li>
          <li><strong className="text-text">Legal obligation</strong>: KYC under the Gaming Act, AML/CFT under POCA, tax under the Income Tax Act</li>
          <li><strong className="text-text">Legitimate interest</strong>: fraud prevention, market-integrity monitoring, security alerting</li>
          <li><strong className="text-text">Consent</strong>: marketing communications (revocable any time)</li>
        </ul>
      </LegalSection>

      <LegalSection n="4" title="Sharing">
        <p>We share data with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>NIDA (identity verification, mTLS)</li>
          <li>Mobile-money aggregator (Selcom or Azampay) for payment routing</li>
          <li>Source registry partners for resolution data</li>
          <li>Gaming Board of Tanzania, Tanzania Revenue Authority, FIU when legally compelled</li>
          <li>Cloud infrastructure (encrypted at rest, TZ region preferred; failover in EU AWS Frankfurt)</li>
        </ul>
        <p className="text-text">We never sell personal data.</p>
      </LegalSection>

      <LegalSection n="5" title="Retention">
        <ul className="list-disc pl-5 space-y-1">
          <li>Account + KYC records: 7 years after closure (AML statutory)</li>
          <li>Prediction and transaction history: 7 years</li>
          <li>Audit log entries: 7 years</li>
          <li>Marketing preferences: until withdrawn or 2 years of inactivity</li>
        </ul>
      </LegalSection>

      <LegalSection n="6" title="Your rights">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Access</strong>: request a copy of your data (delivered within 30 days)</li>
          <li><strong className="text-text">Rectification</strong>: correct inaccurate data</li>
          <li><strong className="text-text">Erasure</strong>: subject to AML retention requirements</li>
          <li><strong className="text-text">Portability</strong>: receive your data in a machine-readable format</li>
          <li><strong className="text-text">Objection</strong>: opt out of profiling for marketing</li>
          <li><strong className="text-text">Complaint</strong>: with the Personal Data Protection Commission of Tanzania</li>
        </ul>
      </LegalSection>

      <LegalSection n="7" title="Cookies">
        <p>
          We use a minimum-necessary set: session authentication (HMAC-signed HttpOnly cookies, 7-day TTL),
          theme preference, language preference. No third-party advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection n="8" title="Security">
        <p>
          Sessions signed with HMAC-SHA-256. OTP codes hashed with scrypt + per-OTP salt + global pepper.
          Passwords (when introduced) will use Argon2id. All data in transit over TLS 1.2+. At-rest
          encryption via AES-256 in the database tier. Annual ISO 27001 audit cadence; pentest twice a year.
        </p>
      </LegalSection>
    </>
  ),
  sw: (
    <>
      <LegalSection n="1" title="Msimamizi wa data">
        <p>
          50pick Ltd, Dar es Salaam, Tanzania. Mawasiliano:{" "}
          <span className="font-mono text-text-muted">{SUPPORT_EMAIL()}</span>. Afisa wetu wa ulinzi wa data
          (DPO) anapatikana kupitia anwani hiyo hiyo.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Tunachokusanya">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Utambulisho</strong>: jina kamili, tarehe ya kuzaliwa, namba ya NIDA, kitambulisho chenye picha</li>
          <li><strong className="text-text">Mawasiliano</strong>: namba ya simu (E.164), mkoa</li>
          <li><strong className="text-text">Fedha</strong>: kumbukumbu za kuweka na kutoa fedha, MSISDN ya pesa za simu, shughuli za utabiri</li>
          <li><strong className="text-text">Kiufundi</strong>: anwani ya IP, alama ya kifaa na kivinjari, alama za muda za vipindi (session)</li>
          <li><strong className="text-text">Kitabia</strong>: muda kwenye jukwaa, majibu ya ukaguzi wa uhalisia (reality check), mabadiliko ya mipaka</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="Msingi wa kisheria">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Utekelezaji wa mkataba</strong>: akaunti, pochi, uwekaji wa dau, ufungaji</li>
          <li><strong className="text-text">Wajibu wa kisheria</strong>: KYC chini ya Gaming Act, AML/CFT chini ya POCA, kodi chini ya Income Tax Act</li>
          <li><strong className="text-text">Maslahi halali</strong>: kuzuia udanganyifu, ufuatiliaji wa uadilifu wa soko, tahadhari za usalama</li>
          <li><strong className="text-text">Ridhaa</strong>: mawasiliano ya matangazo (yanaweza kufutwa wakati wowote)</li>
        </ul>
      </LegalSection>

      <LegalSection n="4" title="Kushiriki data">
        <p>Tunashiriki data na:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>NIDA (uthibitisho wa utambulisho, mTLS)</li>
          <li>Mkusanyaji wa pesa za simu (Selcom au Azampay) kwa ajili ya uelekezaji wa malipo</li>
          <li>Washirika wa rejista za chanzo kwa ajili ya data ya ufungaji</li>
          <li>Bodi ya Michezo ya Kubahatisha Tanzania, Mamlaka ya Mapato Tanzania (Tanzania Revenue Authority), FIU pale tunapolazimishwa kisheria</li>
          <li>Miundombinu ya wingu (imefichwa ikiwa imehifadhiwa, kanda ya TZ inapendelewa; mbadala katika EU AWS Frankfurt)</li>
        </ul>
        <p className="text-text">Kamwe hatuuzi data binafsi.</p>
      </LegalSection>

      <LegalSection n="5" title="Uhifadhi">
        <ul className="list-disc pl-5 space-y-1">
          <li>Kumbukumbu za akaunti na KYC: miaka 7 baada ya kufungwa (sharti la kisheria la AML)</li>
          <li>Historia ya utabiri na miamala: miaka 7</li>
          <li>Maingizo ya kumbukumbu za ukaguzi (audit log): miaka 7</li>
          <li>Mapendeleo ya matangazo: hadi yatakapofutwa au miaka 2 ya kutokuwa na shughuli</li>
        </ul>
      </LegalSection>

      <LegalSection n="6" title="Haki zako">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Kupata</strong>: kuomba nakala ya data yako (hutolewa ndani ya siku 30)</li>
          <li><strong className="text-text">Kurekebisha</strong>: kusahihisha data isiyo sahihi</li>
          <li><strong className="text-text">Kufuta</strong>: kwa kuzingatia masharti ya uhifadhi ya AML</li>
          <li><strong className="text-text">Kubebeka</strong>: kupokea data yako katika muundo unaosomeka na mashine</li>
          <li><strong className="text-text">Kupinga</strong>: kujitoa kwenye uchambuzi wa wasifu kwa ajili ya matangazo</li>
          <li><strong className="text-text">Malalamiko</strong>: kwa Tume ya Ulinzi wa Data Binafsi ya Tanzania</li>
        </ul>
      </LegalSection>

      <LegalSection n="7" title="Vidakuzi (Cookies)">
        <p>
          Tunatumia seti ya chini kabisa inayohitajika: uthibitishaji wa kipindi (vidakuzi vya HttpOnly vilivyosainiwa kwa
          HMAC, TTL ya siku 7), mapendeleo ya mandhari, mapendeleo ya lugha. Hakuna vidakuzi vya matangazo au ufuatiliaji vya watu wengine.
        </p>
      </LegalSection>

      <LegalSection n="8" title="Usalama">
        <p>
          Vipindi vinasainiwa kwa HMAC-SHA-256. Misimbo ya OTP inafichwa kwa scrypt + chumvi (salt) ya kila OTP + pilipili
          (pepper) ya jumla. Nywila (zitakapoanzishwa) zitatumia Argon2id. Data yote inayosafirishwa hupita kwenye TLS 1.2+.
          Ufichaji wa data iliyohifadhiwa kupitia AES-256 katika tabaka la hifadhidata. Mzunguko wa ukaguzi wa ISO 27001 kila
          mwaka; pentest mara mbili kwa mwaka.
        </p>
      </LegalSection>
    </>
  ),
  zh: (
    <>
      <LegalSection n="1" title="数据控制者">
        <p>
          50pick Ltd，坦桑尼亚达累斯萨拉姆。联系方式：{" "}
          <span className="font-mono text-text-muted">{SUPPORT_EMAIL()}</span>。我们的数据保护官（DPO）
          可通过同一地址联系。
        </p>
      </LegalSection>

      <LegalSection n="2" title="我们收集的信息">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">身份</strong>：全名、出生日期、NIDA 号码、带照片的身份证件</li>
          <li><strong className="text-text">联系方式</strong>：电话号码（E.164）、地区</li>
          <li><strong className="text-text">财务</strong>：存款与提现记录、移动货币 MSISDN、预测活动</li>
          <li><strong className="text-text">技术</strong>：IP 地址、设备及浏览器指纹、会话时间戳</li>
          <li><strong className="text-text">行为</strong>：在平台的停留时间、现实核查（reality check）响应、限额变更</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="法律依据">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">合同履行</strong>：账户、钱包、下注、结算</li>
          <li><strong className="text-text">法律义务</strong>：依据 Gaming Act 的 KYC、依据 POCA 的 AML/CFT、依据 Income Tax Act 的税务</li>
          <li><strong className="text-text">合法利益</strong>：欺诈防范、市场完整性监控、安全告警</li>
          <li><strong className="text-text">同意</strong>：营销通讯（可随时撤回）</li>
        </ul>
      </LegalSection>

      <LegalSection n="4" title="信息共享">
        <p>我们与以下各方共享数据：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>NIDA（身份验证，mTLS）</li>
          <li>移动货币聚合方（Selcom 或 Azampay），用于支付路由</li>
          <li>来源登记合作方，用于结算数据</li>
          <li>在依法被强制要求时，向坦桑尼亚博彩委员会、Tanzania Revenue Authority、FIU 提供</li>
          <li>云基础设施（静态加密，优先 TZ 区域；故障转移至 EU AWS Frankfurt）</li>
        </ul>
        <p className="text-text">我们绝不出售个人数据。</p>
      </LegalSection>

      <LegalSection n="5" title="保留期限">
        <ul className="list-disc pl-5 space-y-1">
          <li>账户与 KYC 记录：注销后 7 年（AML 法定要求）</li>
          <li>预测与交易历史：7 年</li>
          <li>审计日志条目：7 年</li>
          <li>营销偏好：直至撤回或连续 2 年无活动</li>
        </ul>
      </LegalSection>

      <LegalSection n="6" title="您的权利">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">访问权</strong>：索取您数据的副本（30 天内提供）</li>
          <li><strong className="text-text">更正权</strong>：更正不准确的数据</li>
          <li><strong className="text-text">删除权</strong>：受 AML 保留要求约束</li>
          <li><strong className="text-text">可携权</strong>：以机器可读格式接收您的数据</li>
          <li><strong className="text-text">反对权</strong>：选择退出用于营销的画像分析</li>
          <li><strong className="text-text">投诉权</strong>：向坦桑尼亚个人数据保护委员会投诉</li>
        </ul>
      </LegalSection>

      <LegalSection n="7" title="Cookie">
        <p>
          我们仅使用必要的最小集合：会话认证（HMAC 签名的 HttpOnly cookie，7 天 TTL）、主题偏好、语言偏好。不使用任何
          第三方广告或追踪 cookie。
        </p>
      </LegalSection>

      <LegalSection n="8" title="安全">
        <p>
          会话以 HMAC-SHA-256 签名。OTP 验证码采用 scrypt + 每个 OTP 独立盐值（salt）+ 全局胡椒值（pepper）进行哈希。
          密码（引入后）将使用 Argon2id。所有传输中的数据均通过 TLS 1.2+ 传输。数据库层静态数据通过 AES-256 加密。每年进行
          一次 ISO 27001 审计；每年进行两次渗透测试。
        </p>
      </LegalSection>
    </>
  ),
};

export default async function PrivacyPage() {
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
