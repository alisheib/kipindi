import { LegalHeader, LegalSection, LEGAL_BINDING_LANGUAGE as BINDING } from "../_components";
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
/**
 * ⛔ BUMPED 2026-09-13 (owner ruling, Ali — docs/COMPLIANCE-DECISIONS.md). Identity is verified before
 * an account's first WITHDRAWAL and before nothing else, so §1 moved; §2 stopped describing controls by
 * a mechanism the code does not have; §4 now says when the officer's screening happens.
 *
 * ⛔ HOW §1 IS WORDED, AND WHY. It states what IS required ("before their first withdrawal") and never
 * what is not. That is `IDENTITY-POLICY.md`'s copy rule, and it is also what lets `test:kyc-copy-truth`
 * tell a true paragraph from a false one mechanically in three languages. It says "account holder",
 * the word this policy uses for the person identity is verified for.
 *
 * 🔴 §2 WAS FALSE IN THREE PLACES, found while re-versioning (2026-09-13):
 *   · "EDD is triggered automatically" — the deposit thresholds are real, but the mechanism is a
 *     REFUSAL: `wallet-service.deposit()` refuses a deposit of TZS 1,000,000 or more, or one taking the
 *     rolling 30-day total to TZS 5,000,000, until a source-of-funds declaration is accepted.
 *   · "The player profile flags as a PEP or is on a sanctions list" — nothing flags a profile; §4 has
 *     always said an officer assesses it.
 *   · "Behavioural anomalies are detected (rapid deposit-then-withdraw, multiple MSISDN sources,
 *     structuring)" — no detector for any of the three exists. Deleted, not softened.
 *
 * ⛔ 2026-09-13 (evening), SAME VERSION DATE — player-favourable, owner ruling (Ali): withdrawals are no
 * longer held for officer review. §1 lost "even once identity is verified, withdrawals of TZS 1,000,000 or
 * more are held for two-officer review" and §2 lost its withdrawal item, in all three languages.
 * `WITHDRAWAL_AML_HOLD` is false in payments.ts, so nothing reviews a withdrawal before it is sent; do not
 * restore either sentence. The §2 DEPOSIT source-of-funds item is unchanged — that refusal is still real.
 *
 * ⛔ BUMPED 2026-09-14 (docs/COMPLIANCE-DECISIONS.md 2026-09-14, second). The Swahili and Chinese texts changed
 * after 2026-09-13 was published: each had used two names for the Financial Intelligence Unit and now uses one,
 * and zh §1 lost a stray space after its dash. The English words did not change, but a text that moved must not
 * go on printing the date of a text it no longer is.
 *
 * ⛔ BUMPED 2026-10-10 (owner ruling, Ali — docs/COMPLIANCE-DECISIONS.md 2026-10-10; player-favourable, no notice owed,
 * the 2026-09-13 precedent). An account holder verifies with the typed DETAILS of one document and is verified at once
 * when the checks pass; an agent applicant keeps photographs and a selfie reviewed by an officer.
 *   · §1 says what is captured and checked now, and that an identity verified automatically is checked by an officer
 *     afterwards. ⛔ Its FIRST sentence is byte for byte what it was — `red:kyc-copy-truth` case 4 resolves its anchor
 *     on it, so never quote that sentence in a comment here: the anchor must match exactly once in this file.
 *   · §2 no longer says a source-of-funds declaration "may require supporting documentation": the declaration is a typed
 *     form (`SourceOfFunds` holds no file), and an enhanced review asks for corrections or a declaration.
 *   · §4 says the officer's sanctions/PEP assessment happens when an officer checks an identity — for one verified
 *     automatically that can be after a withdrawal. It is the consequence the ruling accepts, stated rather than hidden.
 *     ⭐ The sentence naming a withdrawal names no review, and the officer's check has a sentence of its own:
 *     `test:kyc-copy-truth` rule 4 reads a sentence (a clause in Chinese).
 */
const META: Record<Locale, string> = {
  en: "Version 2026-10-10 · Aligned with Tanzania AML Act (Cap 423) and the FATF Recommendations.",
  sw: "Toleo 2026-10-10 · Imeoanishwa na Tanzania AML Act (Cap 423) na Mapendekezo ya FATF.",
  zh: "版本 2026-10-10 · 符合 Tanzania AML Act (Cap 423) 及 FATF 建议。",
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
      <LegalSection n="1" title="Customer due diligence (CDD)">
        <p>
          We verify the identity of every account holder before their first withdrawal. An
          account holder verifies with the details of any one of four documents — a National ID
          (NIDA), a passport, a driving licence or a voter&apos;s card: the document&apos;s number
          (20 digits for a NIDA), its expiry date where it has one, and the full name printed on
          it, with the date of birth recorded on the account. We check the number against that
          document&apos;s format rule, check that a document with an expiry date has not expired,
          enforce that the document is unique to a single account, and check from that date of
          birth that the holder is 18 or older. Where these checks pass, the identity is verified
          at once, unless something about the account or the document calls for a closer look,
          in which case a compliance officer decides it. An identity verified automatically is
          checked afterwards by a compliance officer. We capture: full name, date of birth,
          region, the document type and number, and the document&apos;s expiry date where it has
          one.
        </p>
        <p>
          An applicant to become a 50pick agent verifies their identity with photographs of the
          document and a selfie, reviewed by a compliance officer, and we capture those
          photographs as well.
        </p>
        <p>
          Where we refuse an identity because the holder is under 18, because of a sanctions
          concern, or because the document is already used on another account, the account is
          frozen and a compliance officer decides what happens to its balance, case by case and
          with a recorded reason, as set out in section 3a of our Terms of Service.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Enhanced due diligence (EDD)">
        <p>Enhanced due diligence applies in these cases:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>A single deposit of <strong className="text-text">TZS 1,000,000</strong> or more, or deposits of TZS 5,000,000 or more within 30 days — the deposit is refused until our compliance team has accepted a source-of-funds declaration</li>
          <li>A compliance officer records a politically exposed person (PEP) or sanctions concern during an identity review or an enhanced due diligence review</li>
        </ul>
        <p>
          In an enhanced due diligence review we may ask the account holder to correct their
          identity details or to make a source-of-funds declaration. Where an account&apos;s
          identity has not yet been verified, the officer reviewing its declaration is shown that
          it is unverified.
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
          as a checklist item whenever an officer checks an identity and during every enhanced due
          diligence review, using the name, date of birth and document details collected under §1.
          Where an officer records a concern, the account may be suspended — which stops deposits,
          bets and withdrawals — and a suspicious-activity report is filed with the Financial
          Intelligence Unit where the law requires it. This policy states only the screening we
          actually perform; it will be re-versioned before any automated list screening is
          introduced.
        </p>
        <p>
          Identity is verified before an account&apos;s first withdrawal. An identity verified
          automatically is checked by a compliance officer afterwards. For such an account, the
          sanctions and PEP assessment can therefore take place after a withdrawal.
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
          Tunathibitisha utambulisho wa kila mwenye akaunti kabla ya kutoa fedha kwa mara ya
          kwanza. Mwenye akaunti anathibitisha kwa taarifa za mojawapo ya nyaraka nne — Kitambulisho
          cha Taifa (NIDA), pasipoti, leseni ya udereva au kadi ya mpiga kura: namba ya nyaraka
          hiyo (tarakimu 20 kwa NIDA), tarehe yake ya kuisha muda pale inapokuwa nayo, na jina
          kamili lililoandikwa kwenye nyaraka hiyo, pamoja na tarehe ya kuzaliwa iliyorekodiwa
          kwenye akaunti. Tunakagua namba kwa kanuni ya nyaraka hiyo, tunahakikisha kuwa nyaraka
          yenye tarehe ya kuisha muda bado haijaisha muda wake, tunahakikisha nyaraka inatumika
          kwenye akaunti moja pekee, na tunahakikisha kwa tarehe hiyo ya kuzaliwa kuwa mwenye
          akaunti ana umri wa miaka 18 au zaidi. Ukaguzi huu ukifaulu, utambulisho unathibitishwa
          papo hapo, isipokuwa jambo fulani kuhusu akaunti au nyaraka linahitaji uchunguzi zaidi,
          ambapo afisa wa uzingatiaji ndiye huamua. Utambulisho uliothibitishwa kiotomatiki
          hukaguliwa baadaye na afisa wa uzingatiaji. Tunakusanya: jina kamili, tarehe ya kuzaliwa,
          mkoa, aina na namba ya nyaraka, na tarehe ya kuisha muda wa nyaraka pale inapokuwa nayo.
        </p>
        <p>
          Mwombaji wa uwakala wa 50pick anathibitisha utambulisho wake kwa picha za nyaraka yake na
          selfie, zinazokaguliwa na afisa wa uzingatiaji, na tunakusanya picha hizo pia.
        </p>
        <p>
          Tukikataa utambulisho kwa sababu mwenye akaunti yuko chini ya miaka 18, kwa sababu ya
          wasiwasi wa vikwazo, au kwa sababu nyaraka tayari inatumika kwenye akaunti nyingine,
          akaunti hufungiwa na afisa wa uzingatiaji huamua kitakachofanyika kwa salio lake, kesi
          kwa kesi na kwa sababu iliyorekodiwa, kama ilivyoelezwa katika kifungu cha 3a cha
          Masharti ya Huduma.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Uchunguzi ulioimarishwa (EDD)">
        <p>Uchunguzi ulioimarishwa hutumika katika hali hizi:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kuweka <strong className="text-text">TZS 1,000,000</strong> au zaidi kwa muamala mmoja, au TZS 5,000,000 au zaidi ndani ya siku 30 — muamala huo haupokelewi hadi timu yetu ya uzingatiaji ikubali tamko la chanzo cha fedha</li>
          <li>Afisa wa uzingatiaji anaporekodi wasiwasi wa Mtu Anayejulikana Kisiasa (PEP) au wa vikwazo wakati wa ukaguzi wa utambulisho au wa uchunguzi ulioimarishwa</li>
        </ul>
        <p>
          Katika uchunguzi ulioimarishwa, tunaweza kumwomba mwenye akaunti asahihishe taarifa zake
          za utambulisho au atoe tamko la chanzo cha fedha. Pale utambulisho wa akaunti bado
          haujathibitishwa, afisa anayekagua tamko lake huonyeshwa hivyo.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Kuripoti shughuli za kutiliwa shaka (SAR)">
        <p>
          Maafisa maalum wa AML hukagua shughuli zilizotiliwa shaka ndani ya siku 1 ya kazi. SAR huwasilishwa kwa
          Kitengo cha Intelijensia ya Fedha (FIU) cha Tanzania ndani ya siku 7 tangu kubainika, bila kujali uhusiano
          na mteja. Hatumtaarifu mchezaji kuwa SAR imewasilishwa.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Vikwazo na watu wanaojulikana kisiasa (PEP)">
        <p>
          <strong>Hatuendeshi</strong> mfumo wa kiotomatiki wa kuchunguza orodha za vikwazo za UN,
          OFAC, EU au UK HMT. Hatari ya vikwazo na ya PEP hukaguliwa na afisa wa uzingatiaji kama
          kipengele cha orodha ya ukaguzi kila afisa anapokagua utambulisho, na katika kila
          ukaguzi wa kina wa mteja (EDD), kwa kutumia jina, tarehe ya kuzaliwa na taarifa za
          nyaraka zilizokusanywa chini ya §1. Afisa akirekodi wasiwasi, akaunti inaweza kusimamishwa —
          jambo linalozuia kuweka fedha, kuweka dau na kutoa fedha — na ripoti ya shughuli za
          kutiliwa shaka huwasilishwa kwa Kitengo cha Intelijensia ya Fedha (FIU) pale sheria
          inapohitaji. Sera hii inataja tu uchunguzi tunaoufanya kweli; itatolewa toleo jipya
          kabla ya uchunguzi wowote wa kiotomatiki wa orodha kuanzishwa.
        </p>
        <p>
          Utambulisho unathibitishwa kabla ya kutoa fedha kwa mara ya kwanza. Utambulisho
          uliothibitishwa kiotomatiki hukaguliwa baadaye na afisa wa uzingatiaji. Kwa akaunti ya
          aina hiyo, tathmini ya vikwazo na ya PEP inaweza kwa hiyo kufanyika baada ya kutoa fedha.
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
          我们会在每位账户持有人首次提现之前验证其身份。账户持有人使用四种证件之一的信息进行验证——国民身份证（NIDA）、护照、驾驶证或选民证：证件号码（NIDA 为 20 位）、证件载明的有效期（如有）及证件上所印的全名，并结合账户中登记的出生日期。我们按该证件的格式规则核对号码，确认有有效期的证件尚未过期，确保一份证件仅绑定一个账户，并依据该出生日期确认持有人年满 18 周岁。上述核对通过后，身份即时完成验证，除非账户或证件的某些情况需要进一步审查，此时由合规专员作出决定。自动完成验证的身份，事后由合规专员复核。我们采集：全名、出生日期、地区、证件类型与号码，以及证件载明的有效期（如有）。
        </p>
        <p>
          代理申请人以证件照片和一张自拍照验证其身份，由合规专员审核；我们也会采集这些照片。
        </p>
        <p>
          若因持有人未满 18 周岁、存在制裁疑虑或证件已被其他账户使用而拒绝其身份，该账户将被冻结，其余额由合规专员逐案决定并记录理由，详见服务条款第 3a 条。
        </p>
      </LegalSection>

      <LegalSection n="2" title="强化尽职调查（EDD）">
        <p>以下情况适用强化尽职调查：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>单笔存款达 <strong className="text-text">TZS 1,000,000</strong> 或以上，或 30 天内累计存款达 TZS 5,000,000 或以上——在合规团队接受资金来源声明之前，该笔存款不予受理</li>
          <li>合规专员在身份审核或强化尽职调查中记录了政治公众人物（PEP）或制裁疑虑</li>
        </ul>
        <p>
          在强化尽职调查中，我们可能会请账户持有人更正其身份信息，或提交资金来源声明。若账户身份尚未验证，审核其声明的专员会看到这一情况。
        </p>
      </LegalSection>

      <LegalSection n="3" title="可疑活动报告（SAR）">
        <p>
          指定的 AML 官员将在 1 个工作日内审查被标记的活动。无论客户关系如何，SAR 均会在识别后 7 天内提交至坦桑尼亚金融情报单位（FIU）。我们不会向玩家透露已就其提交 SAR 的情况。
        </p>
      </LegalSection>

      <LegalSection n="4" title="制裁与政治公众人物（PEP）">
        <p>
          我们<strong>不</strong>运行对照 UN、OFAC、EU 或 UK HMT 制裁名单的自动筛查系统。制裁与 PEP
          风险由合规专员在每次核查身份时及每次强化尽职调查（EDD）中，依据第 1 条采集的姓名、出生日期及证件信息，作为核查清单项目进行人工评估。若专员记录了疑虑，该账户可被暂停——暂停后无法充值、投注或提现——并在法律要求时向金融情报单位（FIU）提交可疑活动报告。本政策仅陈述我们实际执行的筛查；在引入任何自动名单筛查之前，本政策将先行更新版本。
        </p>
        <p>
          身份验证在账户首次提现之前进行。自动完成验证的身份，事后由合规专员复核；因此，对于此类账户，制裁与 PEP 评估可能在提现之后进行。
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
}; }

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
      {content()[locale]}
    </>
  );
}
