/**
 * WHAT AN ADMIN ALERT SAYS — one home for every house-bot alert code's words (PLAN §7, 04 C13, C4-SPEC ruling 141).
 *
 * ⭐ ONE TABLE, THREE LANGUAGES. `notifyAdminsHouseBotAlert` renders exactly what is here; a code with no row would
 * otherwise reach an admin as a bare machine token, which is how "UNMAPPED_REFUSAL" once read to a human. The
 * fallback row keeps that from ever being empty, and names the code so the console can still be searched.
 *
 * ⛔ NEVER A NAME, A PHONE OR AN OFFICER'S REASON (04 R6, INT-10, 04:3299). A player is `{holder}` =
 * `playerHandle(userId)` — "Player #A3F2K8" — and the caller passes it; this module never reads a store.
 *
 * ⛔ EVERY TITLE CARRIES ITS SECOND (04:1076). The bell dedupes identical titles inside 90 s, so two real
 * transitions a minute apart must not share a title: every row ends `· HH:MM:SS`.
 *
 * ⛔ NO EMOJI, NO UNREPLACED PLACEHOLDER, EVERY `href` STARTS `/` (`test:cert-c3` §2).
 *
 * ⛔ PURE, AND IT STAYS PURE. The house module law (`test:house-bot-rules` 0.*) allows a small, deliberate set of
 * value imports, and the platform's money formatter is not one of them — so the CALLER injects it as `money`.
 * Formatting shillings still has one home; this module just never reaches for it.
 *
 * ⚠️ Swahili and Chinese are drafted here and marked for native review, like every other house-bot string.
 */

/* ── Ruling 142 · a caller's verb or sentence never enters a translated body ───────────────────── */

/** The holder-money events F7's hooks report. A closed list, because each one is a word in three languages. */
export const MONEY_EVENT_CODES = ["deposited", "withdrew", "cashed_out", "adjusted", "paid_out"] as const;
export type MoneyEventCode = (typeof MONEY_EVENT_CODES)[number];
export const isMoneyEventCode = (v: string): v is MoneyEventCode => (MONEY_EVENT_CODES as readonly string[]).includes(v);

/** What the holder DID, in each language. The subject is always a handle, never a name (04 R6). */
export const MONEY_EVENT_WORD: Record<MoneyEventCode, { en: string; sw: string; zh: string }> = {
  deposited: { en: "deposited", sw: "ameweka", zh: "存入了" },
  withdrew: { en: "withdrew", sw: "ametoa", zh: "提取了" },
  cashed_out: { en: "cashed out", sw: "amechukua mapema", zh: "提前结清了" },
  adjusted: { en: "had an adjustment of", sw: "amerekebishiwa", zh: "被调整了" },
  paid_out: { en: "was paid", sw: "amelipwa", zh: "已获支付" },
};

/** The roster changes C13 announces. `TARGET_*` are N2's; the rest are the bot's own life. */
export const ROSTER_EVENT_CODES = [
  "DESIGNATED", "VERIFIED", "STARTED", "PAUSED", "REMOVED", "RULES_SAVED", "LIMITS_SAVED",
  "TARGET_ADDED", "TARGET_CHANGED", "TARGET_REMOVED", "TARGET_STOPPED",
] as const;
export type RosterEventCode = (typeof ROSTER_EVENT_CODES)[number];
export const isRosterEventCode = (v: string): v is RosterEventCode => (ROSTER_EVENT_CODES as readonly string[]).includes(v);

/** The parts a roster sentence is built from. Values are language-neutral: a name, a field, a figure, a title. */
export type RosterDetail = {
  byName?: string | null;
  /** RULES_SAVED / LIMITS_SAVED: which field moved, and from what to what (already formatted by the caller). */
  field?: string | null;
  from?: string | null;
  to?: string | null;
  /** TARGET_*: the poll's title, and what the target does — as PARTS, so each language says it itself. */
  marketTitle?: string | null;
  timing?: { delaySec?: number | null; from?: "STAKE" | "EXIT" | null; heldToExit?: boolean | null } | null;
  /** TARGET_STOPPED: how many queued reactions the veto cancelled. */
  cancelled?: number | null;
};

/** ⛔ A name may already end in a period ("Juma M."): the render showed "Juma M..". Trim before the sentence's own. */
const by = (d: RosterDetail, lang: "en" | "sw" | "zh"): string => {
  const name = (d.byName ?? "").trim().replace(/\.$/, "");
  if (!name) return "";
  return lang === "en" ? ` by ${name}` : lang === "sw" ? ` na ${name}` : `（${name}）`;
};

/** A target's timing, said in each language from its parts (N2 §5's shape: a delay, what it counts from, a hold). */
const timing = (d: RosterDetail, lang: "en" | "sw" | "zh"): string => {
  const tm = d.timing;
  if (!tm || tm.delaySec == null) return "";
  const from = tm.from ?? "STAKE";
  if (lang === "en") {
    return ` — ${tm.delaySec} s after each ${from === "STAKE" ? "stake" : "exit closing"}${tm.heldToExit ? ", held to the player's exit" : ""}`;
  }
  if (lang === "sw") {
    return ` — sekunde ${tm.delaySec} baada ya kila ${from === "STAKE" ? "dau" : "kufungwa kwa dirisha la kutoka"}${tm.heldToExit ? ", limezuiliwa hadi mchezaji atoke" : ""}`;
  }
  return `——每笔${from === "STAKE" ? "投注" : "退出窗口关闭"}后 ${tm.delaySec} 秒${tm.heldToExit ? "，并保留至玩家退出" : ""}`;
};
const diff = (d: RosterDetail): string => (d.field && d.to ? `${d.field}: ${d.from ?? "—"} → ${d.to}` : (d.field ?? ""));

/**
 * One sentence per roster change, in each language. Every moving part is a value — a name, a field with its two
 * figures, a poll title — so nothing here is an English sentence pasted into Swahili or Chinese (ruling 142).
 */
export const ROSTER_SENTENCE: Record<RosterEventCode, (d: RosterDetail) => { en: string; sw: string; zh: string }> = {
  DESIGNATED: (d) => ({
    en: `The bot was designated${by(d, "en")}.`,
    sw: `Boti imeteuliwa${by(d, "sw")}.`,
    zh: `该机器人已被指定${by(d, "zh")}。`,
  }),
  VERIFIED: (d) => ({
    en: `The holder's permission was confirmed with their current password${by(d, "en")}.`,
    sw: `Ruhusa ya mwenye akaunti imethibitishwa kwa nenosiri lake la sasa${by(d, "sw")}.`,
    zh: `已用持有人当前的密码确认其授权${by(d, "zh")}。`,
  }),
  STARTED: (d) => ({
    en: `The bot was started${by(d, "en")}.`,
    sw: `Boti imeanzishwa${by(d, "sw")}.`,
    zh: `该机器人已启动${by(d, "zh")}。`,
  }),
  PAUSED: (d) => ({
    en: `The bot was paused by hand${by(d, "en")}.`,
    sw: `Boti imesimamishwa kwa mkono${by(d, "sw")}.`,
    zh: `该机器人已被手动暂停${by(d, "zh")}。`,
  }),
  REMOVED: (d) => ({
    en: `The bot was removed${by(d, "en")}. Open stakes settle to the holder's wallet as normal.`,
    sw: `Boti imeondolewa${by(d, "sw")}. Dau zilizo wazi zitalipwa kwenye pochi ya mwenye akaunti kama kawaida.`,
    zh: `该机器人已被移除${by(d, "zh")}。未结算投注将照常结算到持有人的钱包。`,
  }),
  RULES_SAVED: (d) => ({
    en: `Its rules changed — ${diff(d)}${by(d, "en")}.`,
    sw: `Kanuni zake zimebadilika — ${diff(d)}${by(d, "sw")}.`,
    zh: `其规则已更改——${diff(d)}${by(d, "zh")}。`,
  }),
  LIMITS_SAVED: (d) => ({
    en: `The global limits changed — ${diff(d)}${by(d, "en")}.`,
    sw: `Vikomo vya jumla vimebadilika — ${diff(d)}${by(d, "sw")}.`,
    zh: `全局限额已更改——${diff(d)}${by(d, "zh")}。`,
  }),
  TARGET_ADDED: (d) => ({
    en: `A target was added on "${d.marketTitle ?? "a poll"}"${timing(d, "en")}${by(d, "en")}.`,
    sw: `Lengo limeongezwa kwenye "${d.marketTitle ?? "soko"}"${timing(d, "sw")}${by(d, "sw")}.`,
    zh: `已在“${d.marketTitle ?? "一个投票"}”上添加目标${timing(d, "zh")}${by(d, "zh")}。`,
  }),
  TARGET_CHANGED: (d) => ({
    en: `A target on "${d.marketTitle ?? "a poll"}" changed${timing(d, "en")}${by(d, "en")}.`,
    sw: `Lengo kwenye "${d.marketTitle ?? "soko"}" limebadilika${timing(d, "sw")}${by(d, "sw")}.`,
    zh: `“${d.marketTitle ?? "一个投票"}”上的目标已更改${timing(d, "zh")}${by(d, "zh")}。`,
  }),
  TARGET_REMOVED: (d) => ({
    en: `A target on "${d.marketTitle ?? "a poll"}" was removed${by(d, "en")}.`,
    sw: `Lengo kwenye "${d.marketTitle ?? "soko"}" limeondolewa${by(d, "sw")}.`,
    zh: `“${d.marketTitle ?? "一个投票"}”上的目标已移除${by(d, "zh")}。`,
  }),
  TARGET_STOPPED: (d) => ({
    en: `A target on "${d.marketTitle ?? "a poll"}" was stopped with ${d.cancelled ?? 0} queued reaction(s) cancelled${by(d, "en")}.`,
    sw: `Lengo kwenye "${d.marketTitle ?? "soko"}" limesimamishwa na majibu ${d.cancelled ?? 0} yaliyokuwa foleni yamefutwa${by(d, "sw")}.`,
    zh: `“${d.marketTitle ?? "一个投票"}”上的目标已停止，并取消了 ${d.cancelled ?? 0} 个排队中的反应${by(d, "zh")}。`,
  }),
};

/** The severity the console renders the bell with. */
export type AlertSeverity = "info" | "warning" | "danger";

/** Everything the copy may use. The caller resolves ids to a label and a handle; this module stays pure. */
export type AlertContext = {
  code: string;
  botId?: string | null;
  intentId?: string | null;
  marketId?: string | null;
  detail?: Record<string, unknown>;
  /** The bot's label, when the alert names one. */
  label?: string | null;
  /** `playerHandle(userId)`, when the alert names a player. Never a name, never a phone. */
  handle?: string | null;
  /** HH:MM:SS EAT — what makes the title unique. */
  at: string;
  /** The platform's shilling formatter, injected (see the header). */
  money: (n: number) => string;
};

export type AlertRow = {
  titleEn: string; titleSw: string; titleZh: string;
  bodyEn: string; bodySw: string; bodyZh: string;
  href: string;
  severity: AlertSeverity;
};

const num = (v: unknown, dflt = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : dflt);
const str = (v: unknown, dflt = ""): string => (typeof v === "string" && v.length > 0 ? v : dflt);
const tzs = (c: AlertContext, v: unknown): string => c.money(num(v));
/** A bot with no label (a removed row read late) still reads as something a human can search for. */
const botName = (c: AlertContext): string => (c.label ? `"${c.label}"` : c.botId ? `#${c.botId}` : "");
const who = (c: AlertContext): string => c.handle ?? "a player";

/* ── Where each alert sends the reader (04:1065, ruling 14; every link must still resolve 60 days later) ── */
const feed = (c: AlertContext): string => {
  const base = c.botId ? `/admin/house-bots/${c.botId}?tab=activity&range=all` : "/admin/house-bots?tab=activity&range=all";
  return c.intentId ? `${base}&outcome=failed&intent=${c.intentId}` : base;
};
const market = (c: AlertContext): string => (c.marketId ? `/admin/markets/${c.marketId}` : feed(c));
const rulesTab = (c: AlertContext): string => (c.botId ? `/admin/house-bots/${c.botId}?tab=rules` : "/admin/house-bots?tab=limits");
const moneyTab = (c: AlertContext): string => (c.botId ? `/admin/house-bots/${c.botId}?tab=money` : "/admin/house-bots");

type Row = (c: AlertContext) => Omit<AlertRow, "href" | "severity"> & { href?: string; severity?: AlertSeverity };

/**
 * One row per code the engine and the holder hook raise. Derived from the call sites, not from a document:
 * `alertOnce(…)`, `alerts.once(…)`, `alerts.security(…)` in `server/house-bot/*`, plus the holder hook's own claims.
 */
const ROWS = {
  ENGINE_DB_TRANSIENT: (c) => ({
    titleEn: `House bots: the database has been failing for 2 minutes · ${c.at}`,
    titleSw: `Boti za nyumba: hifadhidata imekuwa ikishindwa kwa dakika 2 · ${c.at}`,
    titleZh: `平台机器人：数据库已持续故障 2 分钟 · ${c.at}`,
    bodyEn: "Stakes are being retried, not lost. If this does not clear, switch house bots off and check the database.",
    bodySw: "Dau zinajaribiwa upya, hazijapotea. Kama hali haitaisha, zima boti za nyumba na ukague hifadhidata.",
    bodyZh: "投注正在重试，并未丢失。若情况持续，请关闭平台机器人并检查数据库。",
    severity: "warning" as const,
  }),
  HOLDER_CONTENTION: (c) => ({
    titleEn: `House bot ${botName(c)}: the holder is using the account · ${c.at}`,
    titleSw: `Boti ${botName(c)}: mwenye akaunti anaitumia · ${c.at}`,
    titleZh: `平台机器人 ${botName(c)}：账户持有人正在使用该账户 · ${c.at}`,
    bodyEn: "Two of its stakes were refused because the account was busy within the hour. Nothing is wrong; the bot will try again.",
    bodySw: "Dau zake mbili zilikataliwa kwa sababu akaunti ilikuwa ikitumika ndani ya saa hiyo. Hakuna tatizo; boti itajaribu tena.",
    bodyZh: "该账户在一小时内处于使用中，导致其两笔投注被拒。这并非故障；机器人将再次尝试。",
  }),
  UNMAPPED_REFUSAL: (c) => ({
    titleEn: `House bot ${botName(c)} paused — an answer nobody has mapped · ${c.at}`,
    titleSw: `Boti ${botName(c)} imesimamishwa — jibu ambalo halijaorodheshwa · ${c.at}`,
    titleZh: `平台机器人 ${botName(c)} 已暂停——出现未归类的答复 · ${c.at}`,
    bodyEn: `The bet path answered "${str(c.detail?.reason, "no reason")}", which the engine has no rule for, so the bot stopped rather than guess.`,
    bodySw: `Njia ya dau ilijibu "${str(c.detail?.reason, "hakuna sababu")}", ambalo injini haina kanuni yake, kwa hiyo boti ilisimama badala ya kubahatisha.`,
    bodyZh: `下注流程返回了“${str(c.detail?.reason, "无原因")}”，引擎没有对应规则，因此机器人选择停止而非猜测。`,
    severity: "warning" as const,
  }),
  PENALTY_BOXED: (c) => ({
    titleEn: `${who(c)} is in the penalty box for today · ${c.at}`,
    titleSw: `${who(c)} yuko kwenye kizuizi cha leo · ${c.at}`,
    titleZh: `${who(c)} 今日已被列入处罚名单 · ${c.at}`,
    bodyEn: `Cause: ${str(c.detail?.cause, "unknown")}. House bots will not react to their stakes for the rest of the EAT day. Their own betting is untouched.`,
    bodySw: `Sababu: ${str(c.detail?.cause, "haijulikani")}. Boti za nyumba hazitajibu dau zao kwa siku iliyobaki (EAT). Kubeti kwao wenyewe hakujaguswa.`,
    bodyZh: `原因：${str(c.detail?.cause, "未知")}。在东非时间当日剩余时间内，平台机器人不会对其投注作出反应。其本人投注不受影响。`,
    href: market(c),
    severity: "warning" as const,
  }),
  STAKE_NOT_WHOLE: (c) => ({
    titleEn: `House bot ${botName(c)}: a stake was not a whole shilling · ${c.at}`,
    titleSw: `Boti ${botName(c)}: dau halikuwa shilingi nzima · ${c.at}`,
    titleZh: `平台机器人 ${botName(c)}：投注额不是整先令 · ${c.at}`,
    bodyEn: "The stake was rounded before it was placed. Check the bot's rounding rule if this repeats.",
    bodySw: "Dau lilizungushwa kabla halijawekwa. Kagua kanuni ya kuzungusha ya boti kama hili litajirudia.",
    bodyZh: "该投注在下注前已被取整。若反复出现，请检查该机器人的取整规则。",
  }),
  ANOMALY: (c) => ({
    titleEn: `House bot ${botName(c)}: something does not add up · ${c.at}`,
    titleSw: `Boti ${botName(c)}: kuna kitu hakiendani · ${c.at}`,
    titleZh: `平台机器人 ${botName(c)}：出现异常 · ${c.at}`,
    bodyEn: `The engine found "${str(c.detail?.reason, "an anomaly")}" and recorded it rather than acting on it.`,
    bodySw: `Injini iligundua "${str(c.detail?.reason, "hitilafu")}" na ikaiandika badala ya kuichukulia hatua.`,
    bodyZh: `引擎发现“${str(c.detail?.reason, "异常")}”，并作了记录而未据此行动。`,
    severity: "warning" as const,
  }),
  POISON: (c) => ({
    titleEn: `A house stake failed too many times and was stopped · ${c.at}`,
    titleSw: `Dau la nyumba lilishindwa mara nyingi mno na likasimamishwa · ${c.at}`,
    titleZh: `一笔平台投注失败次数过多，已被停止 · ${c.at}`,
    bodyEn: "The engine stopped retrying it so it cannot block the queue. Open the row to see every attempt.",
    bodySw: "Injini iliacha kulijaribu ili lisizuie foleni. Fungua safu kuona kila jaribio.",
    bodyZh: "引擎已停止重试，以免其阻塞队列。打开该记录可查看每一次尝试。",
    severity: "warning" as const,
  }),
  RULES_FROM_FUTURE: (c) => ({
    titleEn: `House bot ${botName(c)}: its rules come from a newer build · ${c.at}`,
    titleSw: `Boti ${botName(c)}: kanuni zake zimetoka toleo jipya zaidi · ${c.at}`,
    titleZh: `平台机器人 ${botName(c)}：其规则来自更新的版本 · ${c.at}`,
    bodyEn: `Rules version ${num(c.detail?.version)} is newer than this container understands, so the bot places nothing until every container is on the new build.`,
    bodySw: `Toleo la kanuni ${num(c.detail?.version)} ni jipya kuliko kontena hili linavyoelewa, kwa hiyo boti haitaweka dau hadi kila kontena liwe kwenye toleo jipya.`,
    bodyZh: `规则版本 ${num(c.detail?.version)} 比本容器所能理解的更新，因此在所有容器升级前该机器人不会下注。`,
    href: rulesTab(c),
    severity: "warning" as const,
  }),
  LIMITS_FROM_FUTURE: (c) => ({
    titleEn: `House bot limits come from a newer build · ${c.at}`,
    titleSw: `Vikomo vya boti za nyumba vimetoka toleo jipya zaidi · ${c.at}`,
    titleZh: `平台机器人限额来自更新的版本 · ${c.at}`,
    bodyEn: `Limits version ${num(c.detail?.version)} is newer than this container understands. No house stake is placed until every container is on the new build.`,
    bodySw: `Toleo la vikomo ${num(c.detail?.version)} ni jipya kuliko kontena hili linavyoelewa. Hakuna dau la nyumba litakalowekwa hadi kila kontena liwe kwenye toleo jipya.`,
    bodyZh: `限额版本 ${num(c.detail?.version)} 比本容器所能理解的更新。在所有容器升级前不会下任何平台投注。`,
    href: "/admin/house-bots?tab=limits",
    severity: "warning" as const,
  }),
  BOUNDS_CLAMP: (c) => ({
    titleEn: `House bot ${botName(c)}: the platform's maximum stake now clamps it · ${c.at}`,
    titleSw: `Boti ${botName(c)}: kikomo cha juu cha jukwaa sasa kinaidhibiti · ${c.at}`,
    titleZh: `平台机器人 ${botName(c)}：平台最高投注额现在限制了它 · ${c.at}`,
    bodyEn: `Its maximum is ${tzs(c, c.detail?.stakeMaxTzs)} but the platform now allows ${tzs(c, c.detail?.liveMaxTzs)}, so its stakes are cut to the platform's figure. Review its rules.`,
    bodySw: `Kiwango chake cha juu ni ${tzs(c, c.detail?.stakeMaxTzs)} lakini jukwaa sasa linaruhusu ${tzs(c, c.detail?.liveMaxTzs)}, kwa hiyo dau zake zinapunguzwa hadi kiwango cha jukwaa. Kagua kanuni zake.`,
    bodyZh: `其上限为 ${tzs(c, c.detail?.stakeMaxTzs)}，但平台当前允许 ${tzs(c, c.detail?.liveMaxTzs)}，因此其投注被压低至平台数值。请检查其规则。`,
    href: rulesTab(c),
    severity: "warning" as const,
  }),
  BOUNDS_CANT_FIT: (c) => ({
    titleEn: `House bot ${botName(c)} paused — its ${str(c.detail?.field, "stake")} no longer fits the platform's limits · ${c.at}`,
    titleSw: `Boti ${botName(c)} imesimamishwa — ${str(c.detail?.field, "dau")} lake haliingii tena katika vikomo vya jukwaa · ${c.at}`,
    titleZh: `平台机器人 ${botName(c)} 已暂停——其${str(c.detail?.field, "投注额")}不再符合平台限额 · ${c.at}`,
    bodyEn: `It asks for ${tzs(c, c.detail?.valueTzs)} while the platform's smallest stake is ${tzs(c, c.detail?.liveMinTzs)}. Change the rule, then start it again.`,
    bodySw: `Linaomba ${tzs(c, c.detail?.valueTzs)} wakati dau dogo zaidi la jukwaa ni ${tzs(c, c.detail?.liveMinTzs)}. Badilisha kanuni, kisha ianzishe tena.`,
    bodyZh: `它要求 ${tzs(c, c.detail?.valueTzs)}，而平台最小投注额为 ${tzs(c, c.detail?.liveMinTzs)}。请修改规则后重新启动。`,
    href: rulesTab(c),
    severity: "warning" as const,
  }),
  SETTLE_BLOCKED: (c) => ({
    titleEn: `Settlement is blocked: house bot ${botName(c)} has no holder wallet · ${c.at}`,
    titleSw: `Malipo yamezuiwa: boti ${botName(c)} haina pochi ya mwenye akaunti · ${c.at}`,
    titleZh: `结算受阻：平台机器人 ${botName(c)} 没有持有人钱包 · ${c.at}`,
    bodyEn: `${tzs(c, c.detail?.openStakeTzs)} of open house stakes cannot settle, which holds up every player on those markets. Restore the wallet, or remove the bot and settle by hand.`,
    bodySw: `Dau za nyumba zilizo wazi za ${tzs(c, c.detail?.openStakeTzs)} haziwezi kulipwa, jambo linalowazuia wachezaji wote kwenye masoko hayo. Rudisha pochi, au ondoa boti na ulipe kwa mkono.`,
    bodyZh: `${tzs(c, c.detail?.openStakeTzs)} 的未结算平台投注无法结算，这会拖住相关市场上的所有玩家。请恢复该钱包，或移除机器人并手动结算。`,
    href: moneyTab(c),
    severity: "danger" as const,
  }),
  STAFF_STAKE_VOIDED: (c) => ({
    titleEn: `A market holding a staff-chosen house stake was ${str(c.detail?.action, "changed")} · ${c.at}`,
    titleSw: `Soko lenye dau la nyumba lililochaguliwa na wafanyakazi li${str(c.detail?.action, "mebadilishwa")} · ${c.at}`,
    titleZh: `一个持有员工选择的平台投注的市场已被${str(c.detail?.action, "更改")} · ${c.at}`,
    bodyEn: `"${str(c.detail?.titleEn, "the market")}" held ${str(c.detail?.side, "a")} stake of ${tzs(c, c.detail?.stakeTzs)} from house bot ${botName(c)}. This is a record only; nothing was refused.`,
    bodySw: `"${str(c.detail?.titleEn, "soko")}" lilikuwa na dau la ${str(c.detail?.side, "")} la ${tzs(c, c.detail?.stakeTzs)} kutoka boti ${botName(c)}. Hii ni kumbukumbu tu; hakuna kilichokataliwa.`,
    bodyZh: `“${str(c.detail?.titleEn, "该市场")}”持有来自平台机器人 ${botName(c)} 的 ${str(c.detail?.side, "")} 投注 ${tzs(c, c.detail?.stakeTzs)}。此为记录，未拒绝任何操作。`,
    href: market(c),
    severity: "warning" as const,
  }),
  STAFF_STAKE_SELF_DECIDED: (c) => ({
    titleEn: `A market holding a house stake was ${str(c.detail?.action, "decided")} by the officer who chose it · ${c.at}`,
    titleSw: `Soko lenye dau la nyumba li${str(c.detail?.action, "meamuliwa")} na afisa aliyelichagua · ${c.at}`,
    titleZh: `持有平台投注的市场由选择它的工作人员${str(c.detail?.action, "裁定")} · ${c.at}`,
    bodyEn: `"${str(c.detail?.titleEn, "the market")}" was decided by the same officer who asked for the house stake. This is a record only; nothing was refused.`,
    bodySw: `"${str(c.detail?.titleEn, "soko")}" liliamuliwa na afisa yule yule aliyeomba dau la nyumba. Hii ni kumbukumbu tu; hakuna kilichokataliwa.`,
    bodyZh: `“${str(c.detail?.titleEn, "该市场")}”由请求该平台投注的同一名工作人员裁定。此为记录，未拒绝任何操作。`,
    href: market(c),
    severity: "warning" as const,
  }),
  HOLDER_AGAINST_BOT: (c) => ({
    titleEn: `A holder staked against their own house bot · ${c.at}`,
    titleSw: `Mwenye akaunti aliweka dau dhidi ya boti yake mwenyewe · ${c.at}`,
    titleZh: `一位持有人对自己的平台机器人下了反向注 · ${c.at}`,
    bodyEn: `The holder of house bot ${botName(c)} staked ${tzs(c, c.detail?.stakeTzs)} ${str(c.detail?.side, "")} against its ${tzs(c, c.detail?.botStakeTzs)} ${str(c.detail?.botSide, "")} on this market. Nothing was refused; this is a record.`,
    bodySw: `Mwenye boti ${botName(c)} aliweka dau la ${tzs(c, c.detail?.stakeTzs)} ${str(c.detail?.side, "")} dhidi ya dau lake la ${tzs(c, c.detail?.botStakeTzs)} ${str(c.detail?.botSide, "")} kwenye soko hili. Hakuna kilichokataliwa; hii ni kumbukumbu.`,
    bodyZh: `平台机器人 ${botName(c)} 的持有人在该市场以 ${tzs(c, c.detail?.stakeTzs)} ${str(c.detail?.side, "")} 对其 ${tzs(c, c.detail?.botStakeTzs)} ${str(c.detail?.botSide, "")} 下了反向注。未拒绝任何操作；此为记录。`,
    href: market(c),
    severity: "warning" as const,
  }),
  UD_ORPHAN_MARKET: (c) => ({
    titleEn: `An Up & Down market has no round behind it · ${c.at}`,
    titleSw: `Soko la Juu na Chini halina raundi nyuma yake · ${c.at}`,
    titleZh: `一个涨跌市场没有对应的回合 · ${c.at}`,
    bodyEn: "House bots skip it. It is a platform gap, not a house-bot one, and it is recorded once.",
    bodySw: "Boti za nyumba zinaliruka. Ni pengo la jukwaa, si la boti, na limeandikwa mara moja.",
    bodyZh: "平台机器人会跳过它。这是平台的缺口，而非机器人问题，已记录一次。",
    href: market(c),
  }),
  PRODUCT_DENIED: (c) => ({
    titleEn: `House bots met a product they are not allowed on · ${c.at}`,
    titleSw: `Boti za nyumba zilikutana na bidhaa zisizoruhusiwa kwao · ${c.at}`,
    titleZh: `平台机器人遇到了不被允许参与的产品 · ${c.at}`,
    bodyEn: `"${str(c.detail?.productLine, "unknown")}" is outside the product policy, so nothing was placed.`,
    bodySw: `"${str(c.detail?.productLine, "haijulikani")}" iko nje ya sera ya bidhaa, kwa hiyo hakuna dau lililowekwa.`,
    bodyZh: `“${str(c.detail?.productLine, "未知")}”不在产品政策范围内，因此未下注。`,
    href: "/admin/house-bots?tab=limits",
  }),
  UD_BORN_UNLOCKED: (c) => ({
    titleEn: `An Up & Down round opened unlocked · ${c.at}`,
    titleSw: `Raundi ya Juu na Chini ilifunguliwa bila kufungwa · ${c.at}`,
    titleZh: `一个涨跌回合以未锁定状态开启 · ${c.at}`,
    bodyEn: "House bots skip the round. It is a platform gap, recorded once per round.",
    bodySw: "Boti za nyumba zinairuka raundi hiyo. Ni pengo la jukwaa, linaandikwa mara moja kwa kila raundi.",
    bodyZh: "平台机器人会跳过该回合。这是平台缺口，每回合记录一次。",
    href: market(c),
  }),
  CAUSE_CLEARED: (c) => ({
    titleEn: `House bot ${botName(c)}: ${str(c.detail?.cause, "a reason it was stopped")} no longer applies · ${c.at}`,
    titleSw: `Boti ${botName(c)}: ${str(c.detail?.cause, "sababu iliyoisimamisha")} haitumiki tena · ${c.at}`,
    titleZh: `平台机器人 ${botName(c)}：${str(c.detail?.cause, "此前的停止原因")}已不再适用 · ${c.at}`,
    bodyEn: "It is still stopped: a bot never starts itself. Check what is left, then start it when you are ready.",
    bodySw: "Bado imesimama: boti haijianzishi yenyewe. Kagua kilichobaki, kisha ianzishe utakapokuwa tayari.",
    bodyZh: "它仍处于停止状态：机器人不会自行启动。请检查剩余原因，准备好后再启动。",
  }),
  HOLDER_LOCKED_OUT: (c) => ({
    titleEn: `The holder of house bot ${botName(c)} is locked out of sign-in · ${c.at}`,
    titleSw: `Mwenye boti ${botName(c)} amefungiwa kuingia · ${c.at}`,
    titleZh: `平台机器人 ${botName(c)} 的持有人登录已被锁定 · ${c.at}`,
    bodyEn: `Too many wrong sign-ins${str(c.detail?.until) ? `; it ends ${str(c.detail?.until)} EAT` : ""}. The bot keeps running: anyone could lock an account out, so a lockout never stops it.`,
    bodySw: `Majaribio mengi ya kuingia yasiyo sahihi${str(c.detail?.until) ? `; yataisha ${str(c.detail?.until)} EAT` : ""}. Boti inaendelea: mtu yeyote angeweza kufunga akaunti, kwa hiyo kufungwa hakuisimamishi.`,
    bodyZh: `登录失败次数过多${str(c.detail?.until) ? `；将于东非时间 ${str(c.detail?.until)} 解除` : ""}。机器人继续运行：任何人都可能导致账户被锁定，因此锁定不会使其停止。`,
    severity: "warning" as const,
  }),
  OFFICER_SET_EMAIL: (c) => ({
    titleEn: `An officer set the email on house bot ${botName(c)}'s holder account · ${c.at}`,
    titleSw: `Afisa aliweka barua pepe kwenye akaunti ya mwenye boti ${botName(c)} · ${c.at}`,
    titleZh: `工作人员为平台机器人 ${botName(c)} 的持有人账户设置了邮箱 · ${c.at}`,
    bodyEn: "The bot keeps running. An officer-set email cannot confirm the holder's permission: only the holder's own password does.",
    bodySw: "Boti inaendelea. Barua pepe iliyowekwa na afisa haiwezi kuthibitisha ruhusa ya mwenye akaunti: ni nenosiri lake mwenyewe pekee linalofanya hivyo.",
    bodyZh: "机器人继续运行。由工作人员设置的邮箱无法确认持有人的授权：只有持有人本人的密码可以。",
    severity: "warning" as const,
  }),
  RG_ENDED: (c) => ({
    titleEn: `The break taken by house bot ${botName(c)}'s holder has ended · ${c.at}`,
    titleSw: `Mapumziko ya mwenye boti ${botName(c)} yamekwisha · ${c.at}`,
    titleZh: `平台机器人 ${botName(c)} 持有人的休息期已结束 · ${c.at}`,
    bodyEn: "Their permission was voided when the break began, so it must be confirmed again with their current password before the bot can start.",
    bodySw: "Ruhusa yao ilibatilishwa mapumziko yalipoanza, kwa hiyo lazima ithibitishwe tena kwa nenosiri lao la sasa kabla boti haijaanza.",
    bodyZh: "休息开始时其授权已作废，因此必须用其当前密码重新确认后机器人才能启动。",
  }),
} satisfies Record<string, Row>;

export type AlertCode = keyof typeof ROWS;
export const ALERT_CODES = Object.keys(ROWS) as AlertCode[];
export const isAlertCode = (v: string): v is AlertCode => Object.prototype.hasOwnProperty.call(ROWS, v);

/**
 * The row for a code. An unknown code — a bet-path refusal handed to `alerts.security`, or a code a newer build
 * raises — still reads as a sentence, and names itself so the console can be searched for it.
 */
export function alertRow(c: AlertContext): AlertRow {
  const build = isAlertCode(c.code) ? (ROWS[c.code] as Row) : null;
  if (!build) {
    const name = botName(c);
    return {
      titleEn: `House bots: ${c.code} · ${c.at}`,
      titleSw: `Boti za nyumba: ${c.code} · ${c.at}`,
      titleZh: `平台机器人：${c.code} · ${c.at}`,
      bodyEn: `The engine raised ${c.code}${name ? ` on house bot ${name}` : ""}. Open the activity feed for the row behind it.`,
      bodySw: `Injini ilitoa ${c.code}${name ? ` kwenye boti ${name}` : ""}. Fungua mkondo wa shughuli kuona safu iliyosababisha.`,
      bodyZh: `引擎触发了 ${c.code}${name ? `（平台机器人 ${name}）` : ""}。请打开活动记录查看相应条目。`,
      href: feed(c),
      severity: "warning",
    };
  }
  const row = build(c);
  return { ...row, href: row.href ?? feed(c), severity: row.severity ?? "info" };
}
