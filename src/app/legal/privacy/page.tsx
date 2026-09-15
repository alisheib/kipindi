import { LegalHeader, LegalSection, LEGAL_BINDING_LANGUAGE as BINDING } from "../_components";
import { SUPPORT_EMAIL } from "@/lib/server/support-config";
import { getServerT, type Locale } from "@/lib/i18n-server";
// ⭐ The referee clock is the service's constant — §9 states the number the purge actually runs on.
import { AGENT_REFEREE_DOC_HOLD_DAYS } from "@/lib/server/agent-application-service";

export async function generateMetadata() {
  const { locale } = await getServerT();
  return { title: TITLE[locale] };
}

const EYEBROW: Record<Locale, string> = { en: "Legal", sw: "Kisheria", zh: "法律" };
const TITLE: Record<Locale, string> = {
  en: "Privacy Policy",
  sw: "Sera ya Faragha",
  zh: "隐私政策",
};
// The notice carries a version like the other /legal documents (since 2026-09-14): move it in the SAME commit as any
// change to its English text, with a dated COMPLIANCE-DECISIONS.md entry. A second version published on the same date
// carries a `.2` suffix (the first is the bare date). `test:privacy-notice` pins the version with the English body's hash.
// 2026-09-14.2 (session 96, register E-404): §4 names the processors the code sends personal data to; §7 and §8 say only
// what runs.
// 2026-09-14.3 (session 97, register E-409): §2–§6 checked against the code — the payment gateway named with what it
// receives, the source-registry "partners" line removed (nothing is sent to them), retention periods stated as minimums,
// marketing consent withdrawable from the profile (the control is new), no marketing profiling claimed.
// 2026-09-15: Google Analytics added (`src/components/analytics/google-tag.tsx`) — §2 technical data, §3 legitimate
// interest, §4 the processor with what it receives and where it does not run, §7 its two cookies replace "no third-party
// tracking cookies". Every clause is tied to `src/lib/google-tag.ts` by `test:privacy-notice` §4e.
const META: Record<Locale, string> = {
  en: "Version 2026-09-15 · Aligned with the Tanzania Personal Data Protection Act 2022 and EU GDPR principles.",
  sw: "Toleo 2026-09-15 · Imeoanishwa na Tanzania Personal Data Protection Act 2022 na kanuni za EU GDPR.",
  zh: "版本 2026-09-15 · 符合 Tanzania Personal Data Protection Act 2022 及 EU GDPR 原则。",
};

/**
 * 🔴 A FUNCTION, NOT A MODULE-SCOPE CONST — AND THE REASON IS THE SAME ONE `chat.ts` CARRIED.
 *
 * This was `const CONTENT: Record<Locale, React.ReactNode> = { … }`, evaluated ONCE at import,
 * with `SUPPORT_EMAIL()` called inside it. Config hydration is fire-and-forget, so that capture
 * was always `SUPPORT_DEFAULTS` — frozen for the life of the process — while every other reader
 * on the platform saw the operator's real inbox. A statutory page telling a data subject where
 * to write is the worst place on the site for a stale address.
 *
 * ⭐ `legal/terms/page.tsx` already had the correct shape one directory away: `export function
 * content(...)`. This is that shape, so the address is read per request.
 */
function content(): Record<Locale, React.ReactNode> { return {
  en: (
    <>
      <LegalSection n="1" title="Data controller">
        <p>
          50pick Ltd, Dar es Salaam, Tanzania. Contact:{" "}
          <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>. Our data protection
          officer (DPO) is reachable at the same address.
        </p>
      </LegalSection>

      <LegalSection n="2" title="What we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Identity</strong>: full name and date of birth; the type and number of one of four documents — a National ID (NIDA), a passport, a driving licence or a voter&apos;s card — and its expiry date where the document has one; photographs of that document; and a selfie</li>
          <li><strong className="text-text">Contact</strong>: phone number (E.164), email address, region</li>
          <li><strong className="text-text">Financial</strong>: deposit and withdrawal records, mobile-money MSISDN, prediction activity; for a card deposit, the billing name and address you enter; and the name registered to a mobile-money number you withdraw to</li>
          <li><strong className="text-text">Technical</strong>: IP address and browser user-agent string, recorded on sign-in and security events; session issue and expiry times; and, through Google Analytics, the pages you open, your device and browser type, and your approximate location</li>
          <li><strong className="text-text">Behavioural</strong>: deposit and loss limit changes, self-exclusion and cooling-off periods</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="Lawful basis">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Performance of contract</strong>: account, wallet, bet placement, settlement</li>
          <li><strong className="text-text">Legal obligation</strong>: identity verification (KYC) and AML/CFT under the Anti-Money Laundering Act and POCA, tax under the Income Tax Act</li>
          <li><strong className="text-text">Legitimate interest</strong>: fraud prevention, market-integrity monitoring, security alerting, measuring how the website is used</li>
          <li><strong className="text-text">Consent</strong>: marketing communications — you can withdraw it at any time under Profile → Notifications</li>
        </ul>
      </LegalSection>

      <LegalSection n="4" title="Sharing">
        <p>We share data with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Selcom, our payment gateway, which processes deposits and withdrawals: it receives the mobile-money number and the amount; for a card deposit, also your email address, your account name, your phone number and the billing name and address you enter; and before a withdrawal it tells us the name registered to the receiving number</li>
          <li>Gaming Board of Tanzania, Tanzania Revenue Authority, FIU when legally compelled</li>
          <li>Cloud hosting providers: Railway, in the United States (region us-west2), which runs the app, holds its databases and keeps backups of them; and Cloudflare R2, in Western Europe, which stores identity documents, selfies and encrypted database backups; and GitHub Actions, in the United States, which creates the nightly database backup and test-restores it before it is encrypted and stored</li>
          <li>Cloudflare&apos;s network, which carries every connection to www.50pick.tz: each request is decrypted at the Cloudflare data centre nearest to you and encrypted again on its way to our servers</li>
          <li>Postmark, in the United States, which sends our emails: it keeps a record of each email, and records when an email is opened and which link in it is clicked</li>
          <li>Anthropic, which writes the answers in the 50pick Help chat: it receives the messages of that conversation, not your account details; it stores data in the United States and may process a request in the United States, Europe, Asia or Australia</li>
          <li>Sentry, in the European Union, which receives error reports from our servers: Tanzanian phone numbers, email addresses and long numbers such as a NIDA number are removed from a report before it is sent</li>
          <li>Google Analytics, run by Google, which measures how the website is used: it receives the address and title of each page you open, with any part that could identify you removed; your browser and device type; an approximate location derived from your IP address; and a random identifier kept in a cookie. It does not receive your name, phone number, email address or account details, and it is not used for advertising. It does not run on staff pages or on a page opened from a password-reset, email-verification or agent-invitation link. Google may process this data in the United States and other countries</li>
          <li>If you turn on notifications, the push service of your browser, run by the company that makes it, delivers them; the content of each notification is encrypted</li>
        </ul>
        <p className="text-text">We never sell personal data.</p>
      </LegalSection>

      <LegalSection n="5" title="Retention">
        <ul className="list-disc pl-5 space-y-1">
          <li>Account and identity (KYC) records: at least 7 years after the account is closed (AML statutory). If you ask us to erase a closed account, your contact details, password and the name and number on your identity record are removed at once; the images of your identity documents are kept until at least 7 years after closure</li>
          <li>Prediction and transaction history: at least 7 years</li>
          <li>Audit log entries: at least 7 years</li>
          <li>Marketing consent: until you withdraw it, close your account, or 2 years pass without you signing in</li>
        </ul>
      </LegalSection>

      <LegalSection n="6" title="Your rights">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Access</strong>: request a copy of your data (delivered within 30 days)</li>
          <li><strong className="text-text">Rectification</strong>: correct inaccurate data</li>
          <li><strong className="text-text">Erasure</strong>: subject to AML retention requirements</li>
          <li><strong className="text-text">Portability</strong>: receive your data in a machine-readable format</li>
          <li><strong className="text-text">Objection</strong>: object to how we use your data by writing to us; we do not profile you for marketing</li>
          <li><strong className="text-text">Complaint</strong>: with the Personal Data Protection Commission of Tanzania</li>
        </ul>
      </LegalSection>

      <LegalSection n="7" title="Cookies">
        <p>
          We use a minimum-necessary set of cookies: your sign-in session (HMAC-signed HttpOnly cookies that end at most 7 days after you sign in),
          your language, a note kept for 30 seconds that explains why you were signed out, a record that you dismissed the identity notice on your wallet,
          and, on staff accounts only, the two-factor sign-in cookies. Google Analytics sets two cookies, _ga and _ga_W66WRL67MQ, holding a random
          identifier used to count visits; they last 395 days. No advertising cookies. You can refuse or delete cookies in your browser&apos;s settings;
          refusing the Google Analytics cookies does not change how 50pick works.
          Some display choices, such as hiding your balance or dismissing a prompt, are kept in your browser&apos;s own storage on your device.
        </p>
      </LegalSection>

      <LegalSection n="8" title="Security">
        <p>
          Sessions signed with HMAC-SHA-256. OTP codes hashed with scrypt + per-OTP salt + global pepper.
          Passwords: scrypt with a per-user salt. Connections to our website and app are encrypted in transit with TLS (HTTPS).
          Two-factor authentication keys are encrypted in the database with AES-256-GCM, and database backups are encrypted with AES-256-GCM before they are stored.
          Annual ISO 27001 audit cadence; pentest twice a year.
        </p>
      </LegalSection>

      <LegalSection n="9" title="People who are not our customers (referees)">
        <p>
          When someone applies to become a 50pick agent, they give us the names, contact details
          and national-ID scans of two referees, and attest that each referee agreed to this. If
          you are such a referee: we hold your details only to verify that application; the ID
          scan is destroyed {AGENT_REFEREE_DOC_HOLD_DAYS} days after the decision, and
          immediately if the application is refused; we never contact you for marketing; and you
          may ask us to destroy your information sooner by writing to the data controller named
          in §1 — you do not need an account to do so.
        </p>
      </LegalSection>
    </>
  ),
  sw: (
    <>
      <LegalSection n="1" title="Msimamizi wa data">
        <p>
          50pick Ltd, Dar es Salaam, Tanzania. Mawasiliano:{" "}
          <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>. Afisa wetu wa ulinzi wa data
          (DPO) anapatikana kupitia anwani hiyo hiyo.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Tunachokusanya">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Utambulisho</strong>: jina kamili na tarehe ya kuzaliwa; aina na namba ya mojawapo ya nyaraka nne — Kitambulisho cha Taifa (NIDA), pasipoti, leseni ya udereva au kadi ya mpiga kura — pamoja na tarehe ya kuisha muda wake pale nyaraka inapokuwa nayo; picha za nyaraka hiyo; na selfie</li>
          <li><strong className="text-text">Mawasiliano</strong>: namba ya simu (E.164), anwani ya barua pepe, mkoa</li>
          <li><strong className="text-text">Fedha</strong>: kumbukumbu za kuweka na kutoa fedha, MSISDN ya pesa za simu, shughuli za utabiri; kwa kuweka fedha kwa kadi, jina na anwani ya bili unayoandika; na jina lililosajiliwa kwa namba ya pesa za simu unayotolea fedha</li>
          <li><strong className="text-text">Kiufundi</strong>: anwani ya IP na maandishi ya user-agent ya kivinjari, huhifadhiwa unapoingia na kwenye matukio ya usalama; muda wa kuanza na wa kuisha wa kipindi; na, kupitia Google Analytics, kurasa unazofungua, aina ya kifaa na kivinjari chako, na eneo lako la takriban</li>
          <li><strong className="text-text">Kitabia</strong>: mabadiliko ya mipaka ya kuweka fedha na hasara, vipindi vya kujiondoa na kupumzika</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="Msingi wa kisheria">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Utekelezaji wa mkataba</strong>: akaunti, pochi, uwekaji wa dau, utatuzi wa masoko</li>
          <li><strong className="text-text">Wajibu wa kisheria</strong>: uthibitisho wa utambulisho (KYC) na AML/CFT chini ya Anti-Money Laundering Act na POCA, kodi chini ya Income Tax Act</li>
          <li><strong className="text-text">Maslahi halali</strong>: kuzuia udanganyifu, ufuatiliaji wa uadilifu wa soko, tahadhari za usalama, kupima jinsi tovuti inavyotumika</li>
          <li><strong className="text-text">Ridhaa</strong>: mawasiliano ya matangazo — unaweza kuiondoa wakati wowote kwenye Wasifu → Arifa</li>
        </ul>
      </LegalSection>

      <LegalSection n="4" title="Kushiriki data">
        <p>Tunashiriki data na:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Selcom, lango letu la malipo, linaloshughulikia kuweka na kutoa fedha: hupokea namba ya pesa za simu na kiasi; kwa kuweka fedha kwa kadi, pia anwani yako ya barua pepe, jina la akaunti yako, namba yako ya simu na jina na anwani ya bili unayoandika; na kabla ya kutoa fedha hutuambia jina lililosajiliwa kwa namba inayopokea</li>
          <li>Bodi ya Michezo ya Kubahatisha Tanzania, Mamlaka ya Mapato Tanzania (Tanzania Revenue Authority), FIU pale tunapolazimishwa kisheria</li>
          <li>Watoa huduma za wingu: Railway, nchini Marekani (kanda us-west2), inayoendesha programu, kuhifadhi hifadhidata zake na nakala rudufu zake; na Cloudflare R2, barani Ulaya Magharibi, inayohifadhi nyaraka za utambulisho, selfie na nakala rudufu za hifadhidata zilizosimbwa; na GitHub Actions, nchini Marekani, inayotengeneza nakala rudufu ya kila usiku ya hifadhidata na kuijaribu kabla ya kusimbwa na kuhifadhiwa</li>
          <li>Mtandao wa Cloudflare, unaopitisha kila muunganisho wa www.50pick.tz: kila ombi husimbuliwa katika kituo cha data cha Cloudflare kilicho karibu nawe na kusimbwa tena linapoelekea kwenye seva zetu</li>
          <li>Postmark, nchini Marekani, inayotuma barua pepe zetu: huhifadhi kumbukumbu ya kila barua pepe, na hurekodi barua pepe inapofunguliwa na kiungo kinachobofywa ndani yake</li>
          <li>Anthropic, inayoandika majibu katika gumzo la Msaada wa 50pick: hupokea ujumbe wa mazungumzo hayo, si taarifa za akaunti yako; huhifadhi data nchini Marekani na inaweza kuchakata ombi nchini Marekani, Ulaya, Asia au Australia</li>
          <li>Sentry, katika Umoja wa Ulaya, inayopokea ripoti za hitilafu kutoka kwenye seva zetu: namba za simu za Tanzania, anwani za barua pepe na namba ndefu kama namba ya NIDA huondolewa kwenye ripoti kabla haijatumwa</li>
          <li>Google Analytics, inayoendeshwa na Google, inayopima jinsi tovuti inavyotumika: hupokea anwani na kichwa cha kila ukurasa unaofungua, sehemu yoyote inayoweza kukutambulisha ikiwa imeondolewa; aina ya kivinjari na kifaa chako; eneo la takriban linalotokana na anwani yako ya IP; na kitambulisho cha nasibu kinachohifadhiwa kwenye kidakuzi. Haipokei jina lako, namba ya simu, anwani ya barua pepe wala taarifa za akaunti yako, na haitumiki kwa matangazo. Haiendeshwi kwenye kurasa za wafanyakazi wala kwenye ukurasa uliofunguliwa kutoka kiungo cha kubadilisha nenosiri, cha kuthibitisha barua pepe au cha mwaliko wa wakala. Google inaweza kuchakata data hii nchini Marekani na nchi nyingine</li>
          <li>Ukiwasha arifa, huduma ya arifa ya kivinjari chako, inayoendeshwa na kampuni iliyokitengeneza, huziwasilisha; maudhui ya kila arifa husimbwa</li>
        </ul>
        <p className="text-text">Kamwe hatuuzi data binafsi.</p>
      </LegalSection>

      <LegalSection n="5" title="Uhifadhi">
        <ul className="list-disc pl-5 space-y-1">
          <li>Kumbukumbu za akaunti na utambulisho (KYC): angalau miaka 7 baada ya akaunti kufungwa (sharti la kisheria la AML). Ukituomba kufuta akaunti iliyofungwa, taarifa zako za mawasiliano, nenosiri, na jina na namba kwenye rekodi yako ya utambulisho huondolewa mara moja; picha za nyaraka zako za utambulisho huhifadhiwa hadi angalau miaka 7 baada ya kufungwa</li>
          <li>Historia ya utabiri na miamala: angalau miaka 7</li>
          <li>Maingizo ya kumbukumbu za ukaguzi (audit log): angalau miaka 7</li>
          <li>Ridhaa ya matangazo: hadi utakapoiondoa, kufunga akaunti yako, au miaka 2 ipite bila kuingia</li>
        </ul>
      </LegalSection>

      <LegalSection n="6" title="Haki zako">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Kupata</strong>: kuomba nakala ya data yako (hutolewa ndani ya siku 30)</li>
          <li><strong className="text-text">Kurekebisha</strong>: kusahihisha data isiyo sahihi</li>
          <li><strong className="text-text">Kufuta</strong>: kwa kuzingatia masharti ya uhifadhi ya AML</li>
          <li><strong className="text-text">Kubebeka</strong>: kupokea data yako katika muundo unaosomeka na mashine</li>
          <li><strong className="text-text">Kupinga</strong>: kupinga jinsi tunavyotumia data yako kwa kutuandikia; hatuchambui wasifu wako kwa ajili ya matangazo</li>
          <li><strong className="text-text">Malalamiko</strong>: kwa Tume ya Ulinzi wa Data Binafsi ya Tanzania</li>
        </ul>
      </LegalSection>

      <LegalSection n="7" title="Vidakuzi (Cookies)">
        <p>
          Tunatumia seti ya chini kabisa ya vidakuzi inayohitajika: kipindi chako cha kuingia (vidakuzi vya HttpOnly vilivyosainiwa kwa HMAC, vinavyoisha si zaidi ya siku 7 baada ya kuingia),
          lugha yako, ujumbe unaohifadhiwa kwa sekunde 30 unaoeleza kwa nini ulitolewa kwenye akaunti, kumbukumbu kwamba ulifunga taarifa ya utambulisho kwenye pochi yako,
          na, kwa akaunti za wafanyakazi pekee, vidakuzi vya kuingia kwa uthibitishaji wa hatua mbili. Google Analytics huweka vidakuzi viwili, _ga na _ga_W66WRL67MQ, vyenye kitambulisho
          cha nasibu kinachotumika kuhesabu matembeleo; vinadumu siku 395. Hakuna vidakuzi vya matangazo. Unaweza kukataa au kufuta vidakuzi kwenye mipangilio
          ya kivinjari chako; kukataa vidakuzi vya Google Analytics hakubadilishi jinsi 50pick inavyofanya kazi.
          Baadhi ya machaguo ya maonyesho, kama kuficha salio lako au kufunga ujumbe, huhifadhiwa kwenye hifadhi ya kivinjari chako ndani ya kifaa chako.
        </p>
      </LegalSection>

      <LegalSection n="8" title="Usalama">
        <p>
          Vipindi vinasainiwa kwa HMAC-SHA-256. Misimbo ya OTP inafichwa kwa scrypt + chumvi (salt) ya kila OTP + pilipili
          (pepper) ya jumla. Nywila: scrypt pamoja na chumvi (salt) ya kila mtumiaji. Miunganisho na tovuti na programu yetu husimbwa inaposafirishwa kwa TLS (HTTPS).
          Funguo za uthibitishaji wa hatua mbili husimbwa ndani ya hifadhidata kwa AES-256-GCM, na nakala rudufu za hifadhidata husimbwa kwa AES-256-GCM kabla ya kuhifadhiwa.
          Mzunguko wa ukaguzi wa ISO 27001 kila mwaka; pentest mara mbili kwa mwaka.
        </p>
      </LegalSection>

      <LegalSection n="9" title="Watu ambao si wateja wetu (wadhamini)">
        <p>
          Mtu anapoomba kuwa wakala wa 50pick, hutupatia majina, mawasiliano na nakala za
          vitambulisho vya taifa vya wadhamini wawili, na anathibitisha kuwa kila mdhamini
          amekubali. Kama wewe ni mdhamini wa aina hiyo: tunahifadhi taarifa zako kwa ajili ya
          kuhakiki maombi hayo pekee; nakala ya kitambulisho huharibiwa siku {AGENT_REFEREE_DOC_HOLD_DAYS}{" "}
          baada ya uamuzi, na mara moja maombi yakikataliwa; hatuwasiliani nawe kamwe kwa
          matangazo; na unaweza kutuomba tuharibu taarifa zako mapema zaidi kwa kumwandikia
          msimamizi wa data aliyetajwa katika §1 — huhitaji kuwa na akaunti.
        </p>
      </LegalSection>
    </>
  ),
  zh: (
    <>
      <LegalSection n="1" title="数据控制者">
        <p>
          50pick Ltd，坦桑尼亚达累斯萨拉姆。联系方式：{" "}
          <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a>。我们的数据保护官（DPO）可通过同一地址联系。
        </p>
      </LegalSection>

      <LegalSection n="2" title="我们收集的信息">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">身份</strong>：全名与出生日期；所提交证件的类型与号码（国民身份证（NIDA）、护照、驾驶证或选民证四者之一），以及证件载明的有效期（如有）；该证件的照片；以及一张自拍照</li>
          <li><strong className="text-text">联系方式</strong>：电话号码（E.164）、电子邮箱地址、地区</li>
          <li><strong className="text-text">财务</strong>：存款与提现记录、移动货币 MSISDN、预测活动；银行卡充值时您填写的账单姓名与地址；以及您提现至的移动货币号码的注册姓名</li>
          <li><strong className="text-text">技术</strong>：IP 地址与浏览器 user-agent 字符串（在登录及安全事件时记录）；会话签发与到期时间；以及通过 Google Analytics 收集的您打开的页面、设备与浏览器类型和大致位置</li>
          <li><strong className="text-text">行为</strong>：存款与亏损限额变更、自我排除与冷静期</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="法律依据">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">合同履行</strong>：账户、钱包、下注、结算</li>
          <li><strong className="text-text">法律义务</strong>：依据 Anti-Money Laundering Act 与 POCA 的身份验证（KYC）及 AML/CFT、依据 Income Tax Act 的税务</li>
          <li><strong className="text-text">合法利益</strong>：欺诈防范、市场完整性监控、安全告警、衡量网站的使用情况</li>
          <li><strong className="text-text">同意</strong>：营销通讯——您可随时在“个人资料 → 通知”中撤回</li>
        </ul>
      </LegalSection>

      <LegalSection n="4" title="信息共享">
        <p>我们与以下各方共享数据：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Selcom，我们的支付网关，处理充值与提现：接收移动货币号码和金额；银行卡充值时，还接收您的电子邮箱、账户名称、电话号码以及您填写的账单姓名与地址；提现前，它会告诉我们收款号码的注册姓名</li>
          <li>在依法被强制要求时，向坦桑尼亚博彩委员会、Tanzania Revenue Authority、FIU 提供</li>
          <li>云托管服务商：Railway（美国，us-west2 区域），运行本应用、存放其数据库并保存数据库备份；Cloudflare R2（西欧），存放身份证件、自拍照及加密的数据库备份；以及 GitHub Actions（美国），负责生成每晚的数据库备份，并在加密存储前进行恢复验证</li>
          <li>Cloudflare 网络：承载所有访问 www.50pick.tz 的连接；每个请求在离您最近的 Cloudflare 数据中心解密，并在发往我们服务器的途中重新加密</li>
          <li>Postmark（美国）：发送我们的电子邮件；保存每封邮件的记录，并记录邮件何时被打开以及其中哪个链接被点击</li>
          <li>Anthropic：为“50pick 帮助”聊天撰写回答；接收该对话中的消息，不含您的账户信息；数据存储于美国，请求可能在美国、欧洲、亚洲或澳大利亚处理</li>
          <li>Sentry（欧盟）：接收我们服务器的错误报告；报告发送前，会删除其中的坦桑尼亚电话号码、电子邮箱地址以及 NIDA 号码等长数字</li>
          <li>Google Analytics（由 Google 运营）：衡量网站的使用情况；接收您打开的每个页面的地址与标题（已删除任何可能识别您身份的部分）、您的浏览器与设备类型、根据您的 IP 地址推断的大致位置，以及保存在 cookie 中的随机标识符。不接收您的姓名、电话号码、电子邮箱地址或账户信息，也不用于广告。不在员工页面上运行，也不在通过重置密码、验证邮箱或代理邀请链接打开的页面上运行。Google 可能在美国及其他国家处理这些数据</li>
          <li>如您开启通知，通知由您浏览器的推送服务（由该浏览器的开发公司运营）送达；每条通知的内容均经过加密</li>
        </ul>
        <p className="text-text">我们绝不出售个人数据。</p>
      </LegalSection>

      <LegalSection n="5" title="保留期限">
        <ul className="list-disc pl-5 space-y-1">
          <li>账户与身份（KYC）记录：账户注销后至少 7 年（AML 法定要求）。如您要求删除已注销的账户，您的联系方式、密码以及身份记录上的姓名与证件号码将立即删除；身份证件图片保留至注销后至少 7 年</li>
          <li>预测与交易历史：至少 7 年</li>
          <li>审计日志条目：至少 7 年</li>
          <li>营销同意：直至您撤回、注销账户，或连续 2 年未登录</li>
        </ul>
      </LegalSection>

      <LegalSection n="6" title="您的权利">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">访问权</strong>：索取您数据的副本（30 天内提供）</li>
          <li><strong className="text-text">更正权</strong>：更正不准确的数据</li>
          <li><strong className="text-text">删除权</strong>：受 AML 保留要求约束</li>
          <li><strong className="text-text">可携权</strong>：以机器可读格式接收您的数据</li>
          <li><strong className="text-text">反对权</strong>：可来信反对我们使用您数据的方式；我们不会为营销目的对您进行画像分析</li>
          <li><strong className="text-text">投诉权</strong>：向坦桑尼亚个人数据保护委员会投诉</li>
        </ul>
      </LegalSection>

      <LegalSection n="7" title="Cookie">
        <p>
          我们仅使用必要的最小 cookie 集合：您的登录会话（HMAC 签名的 HttpOnly cookie，登录后最长 7 天失效）、您的语言、一条保留 30 秒、说明您为何被退出登录的提示、您已关闭钱包身份提示的记录，以及仅限员工账户的双重验证登录 cookie。Google Analytics 设置两个 cookie：_ga 和 _ga_W66WRL67MQ，保存用于统计访问的随机标识符，有效期 395 天。不使用任何广告 cookie。您可以在浏览器设置中拒绝或删除 cookie；拒绝 Google Analytics 的 cookie 不会改变 50pick 的正常使用。部分显示选择（例如隐藏余额或关闭提示）保存在您设备上的浏览器存储中。
        </p>
      </LegalSection>

      <LegalSection n="8" title="安全">
        <p>
          会话以 HMAC-SHA-256 签名。OTP 验证码采用 scrypt + 每个 OTP 独立盐值（salt）+ 全局胡椒值（pepper）进行哈希。密码：采用 scrypt 与每位用户独立盐值。与我们网站及应用之间的连接在传输中通过 TLS（HTTPS）加密。双重验证密钥在数据库中以 AES-256-GCM 加密，数据库备份在存储前以 AES-256-GCM 加密。每年进行一次 ISO 27001 审计；每年进行两次渗透测试。
        </p>
      </LegalSection>

      <LegalSection n="9" title="非客户人士（推荐人）">
        <p>
          当有人申请成为 50pick 代理时，会向我们提供两位推荐人的姓名、联系方式及国民身份证扫描件，并确认每位推荐人均已同意。若您是此类推荐人：我们仅为核实该申请而保存您的信息；身份证扫描件在决定作出后 {AGENT_REFEREE_DOC_HOLD_DAYS} 天销毁，申请被拒绝时立即销毁；我们绝不会为营销目的联系您；您也可以写信给第 1 条所列的数据控制者，要求提前销毁您的信息——无需拥有账户。
        </p>
      </LegalSection>
    </>
  ),
}; }

export default async function PrivacyPage() {
  const { locale } = await getServerT();
  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE[locale]}
        meta={META[locale]}
        glyph="lock"
      />
      <p className="text-body-sm italic text-text-subtle">{BINDING[locale]}</p>
      {content()[locale]}
    </>
  );
}
