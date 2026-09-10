import Link from "next/link";
import { LegalHeader, LegalSection } from "../_components";
import { getServerT, type Locale } from "@/lib/i18n-server";
import { sideWordIn } from "@/lib/side-label";
import { getGlobalConfig } from "@/lib/server/market-config";
import { I } from "@/components/ui/glyphs";
import { ratesFrom } from "./_shared";

/**
 * GAME RULES — the chooser, and the ONLY one of these three routes in `LEGAL_NAV`.
 *
 * ⭐ WHY THE PARENT IS THE NAV ENTRY AND THE CHILDREN ARE NOT. `legal-nav.tsx:47` decides the
 * active tab with `pathname.startsWith(n.href)`, deliberately loose so a `#section` anchor stays
 * current. One entry at `/legal/rules` therefore stays highlighted while the reader is on either
 * child — which is the wanted behaviour — and the sidebar stays at five items.
 * ⛔ Listing the parent AND the children would light up two tabs at once, because the same
 * predicate matches both.
 *
 * ⚠️ It also means `/legal/rules` RESOLVES rather than 404s. There is no redirect mechanism in
 * this repo at all — `next.config.ts` declares no `redirects()` and no legacy→new redirect exists
 * anywhere — so a real page is the only clean way to make the parent path work.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await getServerT();
  return { title: TITLE[locale] };
}

const EYEBROW: Record<Locale, string> = { en: "Legal", sw: "Kisheria", zh: "法律" };
const TITLE: Record<Locale, string> = { en: "Game Rules", sw: "Kanuni za Michezo", zh: "游戏规则" };
const SUBTITLE: Record<Locale, string> = {
  en: "The binding rules for each product on 50pick.",
  sw: "Kanuni zenye nguvu kwa kila mchezo wa 50pick.",
  zh: "50pick 各产品适用的具约束力规则。",
};
const META: Record<Locale, string> = {
  en: "Version 2026-09-10 · Issued by 50pick Management.",
  sw: "Toleo 2026-09-10 · Imetolewa na Uongozi wa 50pick.",
  zh: "版本 2026-09-10 · 由 50pick 管理层发布。",
};

const INTRO: Record<Locale, string> = {
  en: "50pick runs two products, and they settle differently — so each has its own binding rules. Both share the same account, the same wallet and the same commission, and both are settled against named public sources rather than chance.",
  sw: "50pick inaendesha michezo miwili, na hutatuliwa kwa njia tofauti — hivyo kila mmoja una kanuni zake zenye nguvu. Wote wanatumia akaunti moja, pochi moja na kamisheni moja, na wote hutatuliwa kwa vyanzo rasmi vilivyotajwa, si kwa bahati.",
  zh: "50pick 提供两种产品，其结算方式不同——因此各有其具约束力的规则。两者共用同一账户、同一钱包与同一佣金比例，且均依据具名公开来源结算，而非依赖运气。",
};

/**
 * ⛔ THE CARD LABELS NAME BOTH PRODUCTS' SIDES, SO THEY READ THEM FROM THE PRODUCT.
 *
 * ⚠️ AND THESE WERE INVISIBLE TO `test:labels` §3b, which is the point worth keeping. That
 * scanner reads the JSX render tree; a `Record<Locale, string>` of plain strings is beyond it.
 * So the Chinese card said `YES/NO 市场` and the Swahili said `NDIYO` (the dictionary says
 * **NDIO**) and nothing would ever have complained. The gate caught the same mistake one file
 * over, in JSX — here it had to be caught by reading the dictionary.
 */
const CARDS = (l: Locale): { yesNo: [string, string]; upDown: [string, string]; common: string } => {
  const yes = sideWordIn(l, "YES", "MARKET");
  const no = sideWordIn(l, "NO", "MARKET");
  const up = sideWordIn(l, "YES", "UPDOWN");
  const down = sideWordIn(l, "NO", "UPDOWN");
  switch (l) {
    case "sw":
      return {
        yesNo: [`Masoko ya ${yes}/${no}`, `Jibu swali la tukio halisi kwa ${yes} au ${no}.`],
        upDown: [`${up} & ${down}`, "Tabiri kama thamani inayofuatiliwa itamalizia juu au chini."],
        common: "Yanayoshirikiwa na michezo yote miwili",
      };
    case "zh":
      return {
        yesNo: [`${yes}/${no} 市场`, `以 ${yes} 或 ${no} 回答一个现实世界的问题。`],
        upDown: [`${up}${down}`, "预测所追踪的数值最终是更高还是更低。"],
        common: "两种产品的共同之处",
      };
    default:
      return {
        yesNo: [`${yes}/${no} markets`, `Answer a real-world question with ${yes} or ${no}.`],
        upDown: [`${up} & ${down}`, "Forecast whether a tracked value finishes higher or lower."],
        common: "What both products share",
      };
  }
};

const COMMON: Record<Locale, readonly string[]> = {
  en: [
    "One account per person, 18 or older, resident in Tanzania, and verified before you deposit, bet or withdraw.",
    "Our commission is taken only from the losing side, so a winning bet is never paid less than it staked.",
    "A one-sided market or round is refunded in full, and no fee is ever charged on a refunded stake.",
    "Every result is settled against a named public source and written to an append-only audit chain.",
  ],
  sw: [
    "Akaunti moja kwa kila mtu, miaka 18 au zaidi, mkazi wa Tanzania, na uthibitisho kabla ya kuweka pesa, kuweka dau au kutoa pesa.",
    "Kamisheni yetu huchukuliwa kutoka upande ulioshindwa pekee, hivyo dau lililoshinda halilipwi pungufu ya kilichowekwa.",
    "Soko au raundi ya upande mmoja hurudishwa kamili, na hakuna ada kwa dau lililorudishwa.",
    "Kila matokeo hutatuliwa kwa chanzo rasmi kilichotajwa na huandikwa kwenye mnyororo wa ukaguzi usiofutika.",
  ],
  zh: [
    "每人限一个账户，须年满 18 周岁、居住于坦桑尼亚，并在充值、下注或提现前完成验证。",
    "我们的佣金仅从失败方扣取，因此获胜的下注所得永不低于本金。",
    "单边市场或回合全额退还，且退款绝不收取任何费用。",
    "每项结果均依据具名公开来源结算，并写入仅可追加的审计链。",
  ],
};

export default async function GameRulesIndexPage() {
  const { locale } = await getServerT();
  /* The commission is quoted below, so this page reads it live for the same reason
     `/legal/terms` does — a rate typed into a binding document goes stale silently. */
  const r = ratesFrom(await getGlobalConfig());
  const c = CARDS(locale);

  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE[locale]}
        subtitle={SUBTITLE[locale]}
        meta={META[locale]}
        glyph="tippingScales"
      />

      <p className="text-body-sm text-text-muted leading-relaxed">{INTRO[locale]}</p>

      {/* Two doors. Same recipe as `/help`'s QuickLinkCard — kit classes only, tone never gold
          (gold is money on this platform, and a rulebook is not money). */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <RuleCard
          href="/legal/rules/yes-no"
          icon={<I.listChecks s={20} />}
          title={c.yesNo[0]}
          sub={c.yesNo[1]}
          tone="info"
        />
        <RuleCard
          href="/legal/rules/up-down"
          icon={<I.trendingUp s={20} />}
          title={c.upDown[0]}
          sub={c.upDown[1]}
          tone="aqua"
        />
      </div>

      <LegalSection n="1" title={c.common}>
        <ul className="list-disc pl-5 space-y-1">
          {COMMON[locale].map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p>
          {locale === "en" && (
            <>
              Our commission is{" "}
              <strong className="text-text">
                <span className="font-mono tabular-nums">{r.commissionPct}%</span> of the losing side
              </strong>{" "}
              on both products.
            </>
          )}
          {locale === "sw" && (
            <>
              Kamisheni yetu ni{" "}
              <strong className="text-text">
                <span className="font-mono tabular-nums">{r.commissionPct}%</span> ya upande ulioshindwa
              </strong>{" "}
              kwa michezo yote miwili.
            </>
          )}
          {locale === "zh" && (
            <>
              两种产品的佣金均为
              <strong className="text-text">
                失败方的 <span className="font-mono tabular-nums">{r.commissionPct}%</span>
              </strong>
              。
            </>
          )}
        </p>
      </LegalSection>
    </>
  );
}

function RuleCard({
  href, icon, title, sub, tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone: "info" | "aqua";
}) {
  const tint = tone === "info" ? "bg-info-bg text-info-fg" : "bg-aqua-500/10 text-aqua-300";
  return (
    <Link
      href={href as never}
      className="flex items-center gap-3 rounded-xl glass-panel p-4 hover:border-brand-400 transition-colors"
    >
      {/* ⚠️ LITERALS, not `h-10 w-10` — the spacing scale is overridden, so `h-10` is 80px. */}
      <span className={`inline-flex h-[40px] w-[40px] items-center justify-center rounded-md shrink-0 ${tint}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-body-sm font-semibold text-text">{title}</p>
        <p className="mt-0.5 text-body-sm text-text-subtle">{sub}</p>
      </div>
      <I.chevronRight s={14} className="shrink-0 text-text-subtle" />
    </Link>
  );
}
