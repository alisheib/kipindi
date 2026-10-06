import { LegalHeader, LegalSection, LEGAL_BINDING_LANGUAGE as BINDING } from "../_components";
import { SUPPORT_EMAIL } from "@/lib/server/support-config";
import { getServerT, type Locale } from "@/lib/i18n-server";
// ⭐ U33p · §4's first bullet is an admin-edited line (Admin → System → Public policy lines): `PolicyLine` prints the saved
// words once an admin saves new words, and the literal bullet below until then; `policyMeta` prints the page's version.
import { PolicyLine, policyMeta } from "@/lib/server/legal/policy-lines";

export async function generateMetadata() {
  const { locale } = await getServerT();
  return { title: TITLE[locale] };
}

const EYEBROW: Record<Locale, string> = { en: "Legal", sw: "Kisheria", zh: "法律" };
const TITLE: Record<Locale, string> = {
  en: "Responsible Gambling Policy",
  sw: "Sera ya Mchezo Salama",
  zh: "负责任博彩政策",
};
/**
 * ⛔ DATED FROM 2026-09-14, like every other document under `/legal` — this was the one policy with no version at
 * all, so a reader could not tell which revision bound them. Move the date in the same commit as any change to the
 * binding English text (docs/COMPLIANCE-DECISIONS.md 2026-09-14, third).
 * ⭐ 2026-09-14.2 — §2 checked against the code (COMPLIANCE-DECISIONS 2026-09-14, fifth). A second version on
 * one date takes a `.2` suffix, as Privacy does.
 * ⭐ 2026-09-14.3 — every limit (not only deposit limits) waits 24 hours to loosen, and the session limit survives a new
 * sign-in (COMPLIANCE-DECISIONS 2026-09-14, eighth).
 * ⭐ 2026-09-26 — §4 says only what the code does (COMPLIANCE-DECISIONS § "2026-09-26 · RG Policy v2026-09-26"). The marketing promise names the
 * exclusions the marketing gate actually runs, the under-25 promise is BUILT (a self-exclusion or a break ever on
 * record), and "no sign-up nudges in the late-night window" is CUT — no such window exists in code. ⛔ Do not restore
 * it until one does; `test:rg-policy` refuses a §4 bullet with no control behind it.
 * ⭐ U33p (2026-10-04) · §4's FIRST bullet is an admin-edited line (`legal.policy_lines`, the "Public policy lines" card on
 * /admin/system). NEW WORDS saved for it stamp this page's version with that day's EAT date (`.2` for a second that day),
 * recorded with the date below as the stamp's base; a review of today's words stamps nothing. The header prints the version
 * `printedPolicyVersion` decides from that stamp, its base and the date below (`policyMeta`) — the factory's audit row
 * `config.policy_lines_updated` is the decision record. ⛔ This constant stays a literal, and moves only with a change to
 * the code's own English (test:rg-policy pins it with the English hash; `POLICY_PAGES.rg.codeVersion` in
 * `src/lib/legal/policy-lines.ts` moves with it — test:policy-lines L0). A saved line is held to `KEPT_PROMISES` at the
 * save, so it can no more promise an uncontrolled exclusion than a commit can.
 * ⭐ 2026-10-06 — no helpline: §4's "free helpline on every page footer" and §5's national helpline line are gone with the
 * helpline itself (COMPLIANCE-DECISIONS § "2026-10-06 · … RG Policy v2026-10-06", the owner's ruling).
 */
const META: Record<Locale, string> = {
  en: "Version 2026-10-06 · Aligned with the UK Gambling Commission LCCP and CEN Workshop Agreement 16221.",
  sw: "Toleo 2026-10-06 · Imeoanishwa na UK Gambling Commission LCCP na CEN Workshop Agreement 16221.",
  zh: "版本 2026-10-06 · 符合 UK Gambling Commission LCCP 及 CEN Workshop Agreement 16221。",
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
 *
 * ⭐ EXPORTED (U33p), as Terms' is: `test:policy-lines` L2 renders it in-process to prove §4 prints a saved line in place of
 * the default — and today's text before any save. The saved line is read per request too, by `PolicyLine`.
 */
export function content(): Record<Locale, React.ReactNode> { return {
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
          <li><strong className="text-text">Deposit limits</strong> — daily, weekly, monthly.</li>
          <li><strong className="text-text">Loss limit</strong> — daily.</li>
          <li><strong className="text-text">Session time limit</strong> — once your play session reaches the time you chose <span className="whitespace-nowrap">(15–480 minutes)</span>, new bets are refused. You stay signed in, and you can still deposit and withdraw. Signing out and back in does not restart it.</li>
          <li><strong className="text-text">Reality check</strong> — a reminder every 30 minutes (configurable 5–120 min) showing how long you have been playing, with a clear path to set limits, take a break or self-exclude.</li>
          <li><strong className="text-text">Take a break</strong> (cooling-off): 1 hour, 24 hours, or 1 week. One-way until expiry.</li>
          <li><strong className="text-text">Self-exclusion</strong>: 24h, 1 week, 1 month, 6 months, or permanent. It cannot be shortened or cancelled, and the account does not reopen by itself: once the period has ended you must ask us to reopen it. A permanent self-exclusion cannot be reopened.</li>
        </ul>
        <p>
          For every limit above, setting or lowering it takes effect immediately; raising or removing it takes effect after 24 hours.
          All controls are accessible from your{" "}
          <a href="/profile/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">
            Responsible Gambling settings
          </a>.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Markers of harm">
        <p>
          Our systems look for three signs of harm in how an account is used: several deposits within
          an hour, or a day&apos;s deposits far above the account&apos;s recent daily average; repeated
          deposits made shortly after placing a bet; and repeated betting late at night (00:00–06:00
          EAT). An account showing one of these signs is listed for our compliance team. The limits,
          breaks and self-exclusion in section 2 are yours to use at any time, whether or not a sign has
          been seen.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Operator responsibilities">
        <ul className="list-disc pl-5 space-y-1">
          <PolicyLine line="rg.marketing" locale="en" /* ⛔ prints only until saved */><li>No marketing messages to a self-excluded player, to a player on a break until they opt in again after it ends, to a player showing a sign of harm (section 3), or to anyone under 18 or whose age we cannot confirm</li></PolicyLine>
          <li>No marketing messages, ever, to a player under 25 who has self-excluded or taken a break</li>
          <li>No bonus offers tied to deposit increases</li>
        </ul>
      </LegalSection>

      <LegalSection n="5" title="Get help">
        <ul className="list-disc pl-5 space-y-1">
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
          <li><strong className="text-text">Mipaka ya kuweka fedha</strong> — ya kila siku, kila wiki, kila mwezi.</li>
          <li><strong className="text-text">Mpaka wa hasara</strong> — wa kila siku.</li>
          <li><strong className="text-text">Mpaka wa muda wa kipindi</strong> — kipindi chako cha kucheza kikifikia muda uliouchagua <span className="whitespace-nowrap">(dakika&nbsp;15–480)</span>, dau mpya hukataliwa. Unabaki umeingia, na bado unaweza kuweka na kutoa fedha. Kutoka na kuingia tena hakuanzishi muda upya.</li>
          <li><strong className="text-text">Ukaguzi wa uhalisia (reality check)</strong> — ukumbusho kila baada ya dakika&nbsp;30 (unaweza kupangwa <span className="whitespace-nowrap">dakika&nbsp;5–120</span>) unaoonyesha muda uliocheza, pamoja na njia wazi ya kuweka mipaka, kupumzika au kujizuia.</li>
          <li><strong className="text-text">Chukua mapumziko</strong> (cooling-off): saa&nbsp;1, saa&nbsp;24, au wiki&nbsp;1. Ni ya njia moja hadi muda utakapoisha.</li>
          <li><strong className="text-text">Kujizuia mwenyewe</strong>: saa&nbsp;24, wiki&nbsp;1, mwezi&nbsp;1, miezi&nbsp;6, au ya kudumu. Hakuwezi kufupishwa wala kufutwa, na akaunti haifunguki yenyewe: kipindi kikiisha, lazima utuombe tuifungue. Kujizuia kwa kudumu hakuwezi kufunguliwa.</li>
        </ul>
        <p>
          Kwa kila mpaka ulio juu, kuuweka au kuupunguza huanza kutumika mara moja; kuuongeza au kuuondoa huanza kutumika baada ya saa&nbsp;24.
          Vidhibiti vyote vinapatikana kutoka kwenye{" "}
          <a href="/profile/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">
            mipangilio yako ya Mchezo Salama
          </a>.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Viashiria vya madhara">
        <p>
          Mifumo yetu hutafuta dalili tatu za madhara katika jinsi akaunti inavyotumika: kuweka fedha mara kadhaa ndani ya
          saa moja, au fedha zilizowekwa kwa siku moja kuzidi sana wastani wa kila siku wa hivi karibuni wa akaunti; kuweka
          fedha mara kwa mara muda mfupi baada ya kuweka dau; na kuweka dau mara kwa mara usiku wa manane <span className="whitespace-nowrap">(00:00–06:00&nbsp;EAT)</span>.
          Akaunti inayoonyesha mojawapo ya dalili hizi huorodheshwa kwa timu yetu ya uzingatiaji. Mipaka, mapumziko na
          kujizuia vilivyo katika sehemu ya&nbsp;2 ni vyako kutumia wakati wowote, iwe dalili imeonekana au la.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Wajibu wa mwendeshaji">
        <ul className="list-disc pl-5 space-y-1">
          <PolicyLine line="rg.marketing" locale="sw" /* ⛔ prints only until saved */><li>Hakuna matangazo kwa mchezaji aliyejizuia, kwa mchezaji aliye kwenye mapumziko hadi atakapokubali tena baada ya mapumziko kuisha, kwa mchezaji anayeonyesha dalili ya madhara (sehemu ya&nbsp;3), wala kwa mtu yeyote aliye chini ya umri wa miaka&nbsp;18 au ambaye umri wake hatuwezi kuuthibitisha</li></PolicyLine>
          <li>Kamwe hakuna matangazo kwa mchezaji aliye chini ya umri wa miaka&nbsp;25 aliyewahi kujizuia au kuchukua mapumziko</li>
          <li>Hakuna ofa za bonasi zinazohusishwa na ongezeko la fedha zinazowekwa</li>
        </ul>
      </LegalSection>

      <LegalSection n="5" title="Pata msaada">
        <ul className="list-disc pl-5 space-y-1">
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
          <li><strong className="text-text">充值限额</strong>：每日、每周、每月。</li>
          <li><strong className="text-text">亏损限额</strong>：每日。</li>
          <li><strong className="text-text">会话时长限制</strong>：本次游戏会话达到您所选的时长<span className="whitespace-nowrap">（15–480&nbsp;分钟）</span>后，将拒绝新的投注。您仍保持登录，仍可充值和提现。退出后重新登录不会重新计时。</li>
          <li><strong className="text-text">现实核查（reality check）</strong>：每 30&nbsp;分钟（可在 <span className="whitespace-nowrap">5–120&nbsp;分钟</span>之间设置）弹出提醒，显示您已游戏的时长，并提供设置限额、暂停或自我排除的清晰入口。</li>
          <li><strong className="text-text">暂停一下</strong>（冷静期）：1&nbsp;小时、24&nbsp;小时或 1&nbsp;周。到期前不可撤销。</li>
          <li><strong className="text-text">自我排除</strong>：24&nbsp;小时、1&nbsp;周、1&nbsp;个月、6&nbsp;个月或永久。不可缩短或撤销，账户也不会自动恢复：期满后须向我们申请重新开通。永久自我排除不可重新开通。</li>
        </ul>
        {/* zh: a number keeps its unit (&nbsp;), and the two sentences sit on ONE source line — a JSX line break
            is a space, and it printed "生效。 所有控制项". No {" "} before the link either: Chinese takes no space there.
            The link names one settings page, so it stays on one line (whitespace-nowrap, 7 characters): at 360 it
            broke "负责任博彩设" / "置" (2026-09-27). `test:rg-policy` §3.4. */}
        <p>
          以上每项限额：设置或下调立即生效；上调或取消 24&nbsp;小时后生效。所有控制项均可在您的
          <a href="/profile/responsible-gambling" className="whitespace-nowrap text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">
            负责任博彩设置
          </a>中访问。
        </p>
      </LegalSection>

      <LegalSection n="3" title="伤害的标志">
        {/* zh + sw: a number range sits whole in a whitespace-nowrap span. The en dash is a break point, and at 360 the
            line broke "（00:00–" / "06:00 EAT）" (2026-09-27). `test:rg-policy` §3.3. */}
        <p>
          我们的系统会留意账户使用中的三种伤害迹象：一小时内多次充值，或单日充值额远高于该账户近期的日均水平；下注后不久反复充值；以及在深夜<span className="whitespace-nowrap">（00:00–06:00&nbsp;EAT）</span>反复下注。出现其中任一迹象的账户，会列示给我们的合规团队。无论是否出现迹象，您随时都可以使用第&nbsp;2&nbsp;节中的限额、暂停和自我排除工具。
        </p>
      </LegalSection>

      <LegalSection n="4" title="运营方责任">
        <ul className="list-disc pl-5 space-y-1">
          <PolicyLine line="rg.marketing" locale="zh" /* ⛔ prints only until saved */><li>不向已自我排除的玩家、处于冷静期的玩家（直至其在冷静期结束后重新同意）、出现伤害迹象的玩家（见第&nbsp;3&nbsp;节），以及未满 18&nbsp;岁或无法确认年龄的人发送营销信息</li></PolicyLine>
          <li>绝不向曾经自我排除或进入冷静期、且年龄低于 25&nbsp;岁的玩家发送营销信息</li>
          <li>不提供与提高充值挂钩的奖金优惠</li>
        </ul>
      </LegalSection>

      <LegalSection n="5" title="获取帮助">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">国际</strong>：<a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="font-mono text-brand-300 underline-offset-2 hover:underline">begambleaware.org</a>、<a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="font-mono text-brand-300 underline-offset-2 hover:underline">gamcare.org.uk</a></li>
          <li><strong className="text-text">发送邮件给我们</strong>：<a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-brand-300 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a></li>
        </ul>
      </LegalSection>
    </>
  ),
}; }

export default async function ResponsibleGamblingPolicyPage() {
  const { locale } = await getServerT();
  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE[locale]}
        meta={policyMeta(META[locale], "rg")}
        glyph="shield"
      />
      <p className="text-body-sm italic text-text-subtle">{BINDING[locale]}</p>
      {content()[locale]}
    </>
  );
}
