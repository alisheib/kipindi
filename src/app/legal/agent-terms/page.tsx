import { LegalHeader, LegalSection, LEGAL_BINDING_LANGUAGE as BINDING } from "../_components";
import { SUPPORT_EMAIL } from "@/lib/server/support-config";
import { getServerT, type Locale } from "@/lib/i18n-server";
import { getAgentConfig } from "@/lib/server/agent-config";
import { feeBreakdown, AGENT_REFEREE_DOC_HOLD_DAYS } from "@/lib/server/agent-application-service";
import { AGENT_TERMS_VERSION } from "@/lib/agent-terms-version";
import { formatTzs } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: `${t.agent.termsLink} · 50pick` };
}

/**
 * /legal/agent-terms — what an applicant ACCEPTS at submission, in the shape of its three
 * siblings: inline `Record<Locale, ReactNode>`, `LegalHeader` / `LegalSection`, the BINDING
 * banner and a version META. ⭐ The version is `AGENT_TERMS_VERSION`, the SAME constant
 * `submitForReview` stamps on the application, so what was read and what was recorded cannot
 * diverge. ⛔ Every number is read from `agent-config`; none is typed here.
 */
const EYEBROW: Record<Locale, string> = { en: "Legal", sw: "Kisheria", zh: "法律" };
const META: Record<Locale, string> = {
  en: `Version ${AGENT_TERMS_VERSION} · Accepted when an agent application is submitted.`,
  sw: `Toleo ${AGENT_TERMS_VERSION} · Yanakubaliwa wakati maombi ya uwakala yanapowasilishwa.`,
  zh: `版本 ${AGENT_TERMS_VERSION} · 提交代理申请时即视为接受。`,
};

/**
 * ⛔ NO VAT COMPONENT, NO VAT SENTENCE. When the computed VAT is 0 the clause is EMPTY in
 * all three languages — the fee is simply the published figure.
 *
 * 🔴 THE DEFECT THIS CLOSES. `feeVatTreatment` is still `EXCLUSIVE` while the rate went to
 * 0 (Ali, 2026-09-09), and the unconditional form rendered the BINDING contract as
 * "(TZS 100,000 plus TZS 0 VAT)" — literally true, absurd to read, and asserting a VAT
 * treatment on a fee that bears none. Under `INCLUSIVE` at rate 0 it was worse: a flat
 * "(VAT inclusive)" claiming a tax sits inside a price that contains none.
 *
 * ⭐ The condition is on the COMPUTED component, not on the rate or the treatment, so it is
 * right for every combination of the two rather than for the one in force today.
 * `npm run test:agent-fee-copy` holds it — and ⚠️ that guard did NOT exist until 2026-09-09,
 * although this very docblock claimed it did.
 */
export function agentFeeVatClause(
  fee: { netTzs: number; vatTzs: number },
  treatment: "INCLUSIVE" | "EXCLUSIVE",
): Record<Locale, string> {
  const exclusive = treatment === "EXCLUSIVE";
  const full: Record<Locale, string> = {
    en: exclusive ? `(${formatTzs(fee.netTzs)} plus ${formatTzs(fee.vatTzs)} VAT)` : "(VAT inclusive)",
    sw: exclusive ? `(${formatTzs(fee.netTzs)} pamoja na VAT ${formatTzs(fee.vatTzs)})` : "(ikijumuisha VAT)",
    zh: exclusive ? `\uff08${formatTzs(fee.netTzs)} \u52a0 ${formatTzs(fee.vatTzs)} \u589e\u503c\u7a0e\uff09` : "\uff08\u542b\u589e\u503c\u7a0e\uff09",
  };
  return fee.vatTzs === 0 ? { en: "", sw: "", zh: "" } : full;
}

export default async function AgentTermsPage() {
  const { t, locale } = await getServerT();
  const cfg = getAgentConfig();
  const fee = feeBreakdown(cfg);
  const feeStr = formatTzs(fee.totalTzs);
  /**
   * ⭐ THE VAT CLAUSE, DERIVED. Under EXCLUSIVE the published price is the net and VAT sits
   * on top, so the clause must read "TZS 100,000 plus TZS 18,000 VAT"; under INCLUSIVE the
   * total IS the price. ⛔ Never a fixed parenthetical — this is the document an applicant is
   * held to, and `test:agent-fee-copy` refuses a locale that states a treatment the config
   * does not have.
   */
  /** ⭐ Management's withholding line (2026-09-08) is a term of the contract, so §3 states it. */
  const whtPct = String(cfg.agentWithholdingTaxPct);
  const exclusive = cfg.feeVatTreatment === "EXCLUSIVE";
  const vatClause = agentFeeVatClause(fee, cfg.feeVatTreatment);
  const rate = String(cfg.defaultCommissionPct);
  const cap = String(cfg.maxCommissionPct);
  const refundDays = String(cfg.refundDeadlineDays);
  const cooldown = String(cfg.reapplyCooldownDays);
  const refereeDays = String(AGENT_REFEREE_DOC_HOLD_DAYS);
  const window = cfg.commissionWindowMonths === 0 ? null : String(cfg.commissionWindowMonths);

  const content: Record<Locale, React.ReactNode> = {
    en: (
      <>
        <LegalSection n="1" title="What an agent is, and is not">
          <p>A Verified 50pick Agent is a vetted business partner who introduces new players to 50pick and earns commission on the revenue those players generate. An agent is an ordinary player account with agent standing; it is not staff.</p>
          <p>An agent <strong>never holds players' money</strong>. Agents do not take deposits, do not pay out winnings and do not top up accounts. Players deposit and withdraw themselves, exactly as every other player does.</p>
        </LegalSection>
        <LegalSection n="2" title="Applying">
          <p>To apply you must hold a 50pick account whose identity has been verified, and you must not be a member of 50pick staff. You submit seven documents — a CV, a formal request letter, a Serikali ya Mtaa letter, and letters and national-ID copies from two referees — and pay the registration fee of <strong>{feeStr}</strong> {vatClause.en} to {cfg.feeDestinationName}, account {cfg.feeDestinationAccount}, uploading the receipt. A compliance officer reviews the application and approves or declines it; the decision is the officer's alone.</p>
          <p>If your application is not approved and the fee was received, it is <strong>refunded in full within {refundDays} days</strong> to the account it was paid from. Unless the decision is final, you may apply again after {cooldown} days.</p>
        </LegalSection>
        <LegalSection n="3" title="Commission">
          <p>You earn a commission of <strong>{rate}%</strong> (or the rate your approval states, never more than {cap}%) of the <strong>net operator fee</strong> 50pick actually keeps from each settled position your recruits play — that is, after the TRA and GBT levies. It is calculated on revenue 50pick received, never on turnover, and it is priced at settlement, when the fee exists. Local withholding tax of {whtPct}% is deducted from your commission and remitted on your behalf; the amount credited to your wallet is the balance after that deduction. Where 50pick earns nothing on a market — a voided or one-sided market — you earn nothing on it. If a settled market is later voided, commission paid on it is reversed.</p>
          <p>Commission is paid into your 50pick wallet as <strong>real, withdrawable cash</strong>. It carries no wagering requirement and no expiry. {window ? `You earn for ${window} months after each recruit joins.` : "You earn for as long as your recruits play."} There is no sign-up prize: you earn only when your recruits generate revenue.</p>
          <p><strong>One level only.</strong> You earn on the players you introduce. You never earn on players they introduce. The platform's rule set fixes the ceiling on any agent's rate at {cap}%, and no officer may set more.</p>
        </LegalSection>
        <LegalSection n="4" title="Your recruits">
          <p>A player is your recruit when they register through your 50PICK-AG code or link. Players who registered through your ordinary player link before your approval are not part of your agent book and do not earn you commission. An attribution is made once and is never moved.</p>
          <p>You may not recruit yourself, a member of 50pick staff, or anyone under 18. You may not induce anyone to gamble beyond their means, and you must observe the responsible-gambling rules stated on this site.</p>
        </LegalSection>
        <LegalSection n="5" title="Standing">
          <p>A compliance officer may <strong>pause</strong> your agent standing at any time. While paused, your code no longer recruits and no new commission accrues; commission already paid stays in your wallet. A paused standing may be restored by an officer. An officer may also <strong>end</strong> the partnership; the same rules apply, and your account returns to an ordinary player account.</p>
          <p>If your account is closed, suspended or self-excluded, your code stops recruiting and no new commission accrues. Commission accrued while you are on a responsible-gambling break is recorded and settled to you outside the wallet.</p>
        </LegalSection>
        <LegalSection n="6" title="Your referees' information">
          <p>You confirm that each referee knows you have named them and has agreed to 50pick holding a copy of their national ID for this application. Referee ID copies are held for <strong>{refereeDays} days</strong> after the decision and then destroyed; they are destroyed immediately if the application is not approved. A referee who wishes their copy destroyed sooner may write to {SUPPORT_EMAIL()}.</p>
        </LegalSection>
        <LegalSection n="7" title="General">
          <p>These terms sit alongside the 50pick Terms of Service, which continue to apply to your account. 50pick may change these terms; a change that reduces what you earn takes effect only for commission accrued after you are notified. Questions: {SUPPORT_EMAIL()}.</p>
        </LegalSection>
      </>
    ),
    sw: (
      <>
        <LegalSection n="1" title="Wakala ni nani, na si nani">
          <p>Wakala Aliyethibitishwa wa 50pick ni mshirika wa biashara aliyekaguliwa anayetambulisha wachezaji wapya kwa 50pick na kupata kamisheni kwenye mapato wanayozalisha. Wakala ni akaunti ya kawaida ya mchezaji yenye hadhi ya uwakala; si mfanyakazi.</p>
          <p>Wakala <strong>hashiki kamwe pesa za wachezaji</strong>. Mawakala hawapokei amana, hawalipi ushindi wala hawajazi akaunti. Wachezaji huweka na kutoa pesa wenyewe, kama kila mchezaji mwingine.</p>
        </LegalSection>
        <LegalSection n="2" title="Kuomba">
          <p>Ili kuomba lazima uwe na akaunti ya 50pick ambayo utambulisho wake umethibitishwa, na usiwe mfanyakazi wa 50pick. Unawasilisha nyaraka saba — CV, barua rasmi ya maombi, barua ya Serikali ya Mtaa, na barua na nakala za vitambulisho vya taifa vya wadhamini wawili — na kulipa ada ya usajili ya <strong>{feeStr}</strong> {vatClause.sw} kwa {cfg.feeDestinationName}, akaunti {cfg.feeDestinationAccount}, ukipakia risiti. Afisa wa uzingatiaji hukagua maombi na kuidhinisha au kukataa; uamuzi ni wa afisa peke yake.</p>
          <p>Kama maombi yako hayajaidhinishwa na ada ilipokelewa, <strong>hurejeshwa kamili ndani ya siku {refundDays}</strong> kwenye akaunti iliyolipa. Isipokuwa uamuzi ni wa mwisho, unaweza kuomba tena baada ya siku {cooldown}.</p>
        </LegalSection>
        <LegalSection n="3" title="Kamisheni">
          <p>Unapata kamisheni ya <strong>{rate}%</strong> (au kiwango kilichotajwa kwenye idhini yako, kisichozidi {cap}%) ya <strong>ada halisi ya uendeshaji</strong> ambayo 50pick inabaki nayo kutoka kila dau lililofungwa la wateja wako — yaani baada ya tozo za TRA na GBT. Huhesabiwa kwenye mapato ambayo 50pick ilipokea, si mauzo, na hupangwa wakati wa kufunga, wakati ada inapokuwepo. Kodi ya zuio la ndani ya {whtPct}% inakatwa kwenye kamisheni yako na kupelekwa kwa niaba yako; kiasi kinachowekwa kwenye pochi yako ni salio baada ya makato hayo. Pale 50pick haipati chochote kwenye soko — soko lililobatilishwa au la upande mmoja — hupati chochote. Kama soko lililofungwa litabatilishwa baadaye, kamisheni iliyolipwa kwalo hurejeshwa.</p>
          <p>Kamisheni hulipwa kwenye pochi yako ya 50pick kama <strong>pesa halisi unayoweza kutoa</strong>. Haina sharti la kucheza wala muda wa kuisha. {window ? `Unapata kwa miezi ${window} baada ya kila mteja kujiunga.` : "Unapata kwa muda wote wateja wako wanaocheza."} Hakuna zawadi ya kujisajili: unapata tu wateja wako wanapozalisha mapato.</p>
          <p><strong>Ngazi moja tu.</strong> Unapata kutoka kwa wachezaji unaowatambulisha. Hupati kamwe kutoka kwa wachezaji wanaowatambulisha. Kanuni za jukwaa zinaweka kikomo cha kiwango cha wakala yeyote kuwa {cap}%, na hakuna afisa anayeweza kuweka zaidi.</p>
        </LegalSection>
        <LegalSection n="4" title="Wateja wako">
          <p>Mchezaji ni mteja wako anapojisajili kupitia msimbo au kiungo chako cha 50PICK-AG. Wachezaji waliojisajili kupitia kiungo chako cha kawaida cha mchezaji kabla ya idhini yako si sehemu ya kitabu chako cha uwakala na hawakupatii kamisheni. Utambulisho hufanywa mara moja na hauhamishwi kamwe.</p>
          <p>Huwezi kujitambulisha mwenyewe, mfanyakazi wa 50pick, au mtu yeyote aliye chini ya miaka 18. Huwezi kumshawishi mtu yeyote kucheza kamari zaidi ya uwezo wake, na lazima uzingatie kanuni za uchezaji wa kuwajibika zilizoelezwa kwenye tovuti hii.</p>
        </LegalSection>
        <LegalSection n="5" title="Hadhi">
          <p>Afisa wa uzingatiaji anaweza <strong>kusitisha</strong> hadhi yako ya uwakala wakati wowote. Ukiwa umesitishwa, msimbo wako hauandikishi tena na hakuna kamisheni mpya; kamisheni iliyokwisha lipwa inabaki kwenye pochi yako. Hadhi iliyositishwa inaweza kurejeshwa na afisa. Afisa pia anaweza <strong>kumaliza</strong> ushirikiano; kanuni zile zile zinatumika, na akaunti yako inarudi kuwa akaunti ya kawaida ya mchezaji.</p>
          <p>Kama akaunti yako imefungwa, imesimamishwa au umejizuia mwenyewe, msimbo wako unaacha kuandikisha na hakuna kamisheni mpya. Kamisheni iliyokusanywa ukiwa kwenye mapumziko ya uchezaji wa kuwajibika hurekodiwa na kulipwa kwako nje ya pochi.</p>
        </LegalSection>
        <LegalSection n="6" title="Taarifa za wadhamini wako">
          <p>Unathibitisha kwamba kila mdhamini anajua umemtaja na amekubali 50pick kuhifadhi nakala ya kitambulisho chake cha taifa kwa maombi haya. Nakala za vitambulisho vya wadhamini huhifadhiwa kwa <strong>siku {refereeDays}</strong> baada ya uamuzi kisha huharibiwa; huharibiwa mara moja kama maombi hayajaidhinishwa. Mdhamini anayetaka nakala yake iharibiwe mapema anaweza kuandika kwa {SUPPORT_EMAIL()}.</p>
        </LegalSection>
        <LegalSection n="7" title="Jumla">
          <p>Masharti haya yanaenda sambamba na Masharti ya Huduma ya 50pick, ambayo yanaendelea kutumika kwenye akaunti yako. 50pick inaweza kubadilisha masharti haya; mabadiliko yanayopunguza unachopata yanaanza kutumika tu kwa kamisheni iliyokusanywa baada ya kujulishwa. Maswali: {SUPPORT_EMAIL()}.</p>
        </LegalSection>
      </>
    ),
    zh: (
      <>
        <LegalSection n="1" title="代理是什么，不是什么">
          <p>50pick 认证代理是经过审核的业务合作伙伴，负责向 50pick 推荐新玩家，并从这些玩家产生的收入中获得佣金。代理是具有代理资格的普通玩家账户，不是员工。</p>
          <p>代理<strong>绝不持有玩家资金</strong>。代理不接受存款、不支付奖金、不为账户充值。玩家自行存取款，与其他所有玩家完全相同。</p>
        </LegalSection>
        <LegalSection n="2" title="申请">
          <p>申请须持有已完成身份验证的 50pick 账户，且不得为 50pick 员工。您需提交七份文件——简历、正式申请信、Serikali ya Mtaa 信函，以及两位推荐人的信函和身份证副本——并向 {cfg.feeDestinationName}（账户 {cfg.feeDestinationAccount}）支付 <strong>{feeStr}</strong>{vatClause.zh}的注册费并上传收据。合规官审核申请后批准或拒绝；决定权仅属于该合规官。</p>
          <p>若申请未获批准且费用已收到，将在 <strong>{refundDays} 天内全额退还</strong>至原付款账户。除非决定为最终决定，您可在 {cooldown} 天后再次申请。</p>
        </LegalSection>
        <LegalSection n="3" title="佣金">
          <p>您可获得 <strong>{rate}%</strong>（或批准时载明的费率，最高不超过 {cap}%）的佣金，基数为 50pick 从您推荐玩家每笔结算仓位中实际保留的<strong>净运营手续费</strong>——即扣除 TRA 和 GBT 税费之后。佣金按 50pick 实际收到的收入计算，绝不按流水计算，并在结算时（手续费产生时）定价。我们将从您的佣金中扣除 {whtPct}% 的地方预扣税并代为上缴；存入您钱包的金额为扣除后的余额。若 50pick 在某市场未获收益——作废或单边市场——您在该市场亦无收益。若已结算市场随后被作废，就该市场支付的佣金将被冲回。</p>
          <p>佣金以<strong>真实、可提现的现金</strong>存入您的 50pick 钱包，无投注要求，无有效期。{window ? `每位玩家加入后 ${window} 个月内您均可获得收益。` : "只要您推荐的玩家持续投注，您就持续获得收益。"}没有注册奖励：只有当您推荐的玩家产生收入时您才有收益。</p>
          <p><strong>仅一个层级。</strong>您仅从自己推荐的玩家获得收益，绝不从他们推荐的玩家获得收益。平台规则将任何代理的费率上限固定为 {cap}%，任何合规官均不得设置更高。</p>
        </LegalSection>
        <LegalSection n="4" title="您推荐的玩家">
          <p>玩家通过您的 50PICK-AG 代理码或链接注册即为您推荐的玩家。在您获批之前通过您普通玩家链接注册的玩家不属于您的代理名册，不为您产生佣金。归属关系一经确立即不可转移。</p>
          <p>您不得推荐自己、50pick 员工或任何未满 18 岁者。您不得诱导任何人超出其承受能力投注，并须遵守本站所述的负责任博彩规则。</p>
        </LegalSection>
        <LegalSection n="5" title="资格状态">
          <p>合规官可随时<strong>暂停</strong>您的代理资格。暂停期间，您的代理码不再招募，也不再累积新佣金；已支付的佣金仍在您的钱包中。暂停的资格可由合规官恢复。合规官也可<strong>终止</strong>合作关系；适用相同规则，您的账户将恢复为普通玩家账户。</p>
          <p>若您的账户被关闭、暂停或自我排除，您的代理码将停止招募，也不再累积新佣金。在负责任博彩休息期间累积的佣金将被记录，并在钱包之外向您结算。</p>
        </LegalSection>
        <LegalSection n="6" title="您推荐人的信息">
          <p>您确认每位推荐人均知晓您提名了他们，并同意 50pick 为本次申请保留其身份证副本。推荐人身份证副本在决定后保留 <strong>{refereeDays} 天</strong>后销毁；若申请未获批准则立即销毁。希望提前销毁副本的推荐人可致函 {SUPPORT_EMAIL()}。</p>
        </LegalSection>
        <LegalSection n="7" title="一般条款">
          <p>本条款与 50pick 服务条款并行适用，后者继续适用于您的账户。50pick 可修改本条款；减少您收益的修改仅对通知您之后累积的佣金生效。如有疑问：{SUPPORT_EMAIL()}。</p>
        </LegalSection>
      </>
    ),
  };

  return (
    <>
      <LegalHeader eyebrow={EYEBROW[locale]} title={t.agent.termsTitle} subtitle={t.agent.heroSub} meta={`${META[locale]} · ${BINDING[locale]}`} />
      {content[locale]}
    </>
  );
}
