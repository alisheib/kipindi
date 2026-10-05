/**
 * /api/dev-test/marketing-typed-test-seed — the typed test's world, for U37c-2's visual drive of the Test card.
 *
 * ⛔ 404 IN PRODUCTION, before anything else, like every route under `dev-test/` (`test:cert-devroutes`). It is reachable
 * only where `NODE_ENV` is not `production`, which on this platform means a developer's own machine.
 *
 * ⭐ WHY THIS EXISTS. A test to a typed number is offered only once licence outreach is OPEN, `adult.test` is SAVED and the
 * draft carries a source line — three owner acts. A drive cannot reach any of the Test card's typed states without them,
 * and each of the three "disabled, because …" states needs the world one step short of open. ⭐ EVERY STEP GOES THROUGH
 * THE PLATFORM'S OWN WRITER — `savePolicyLines`, `saveMarketingWordings`, `openLicenceOutreach` / `closeLicenceOutreach`,
 * `ensureOptOutToken` + `stopMarketing` — never a hand-built row, so the card reads exactly what an owner's saves leave.
 *
 *   POST ?lines=1              — save the four policy lines with Appendix B's words (`test:policy-lines` B2–B5), which pass
 *                                both the card's save rules and the opening checks
 *   POST ?open=1 | ?open=0     — open (the four checks must pass) or close the licence-outreach record
 *   POST ?adult=1              — save `adult.test` (its suggested wording, approved on purpose)
 *   POST ?adult=2              — save a REWORDING of `adult.test` (a new version) — the drive's "reworded while the
 *                                page was open" state (§18.32)
 *   POST ?source=1             — save the source line G5 chose, "Namba yako ipo orodhani kwetu."
 *   POST ?stop=<phone>         — a real stop on that number: its token as the send path gets it (`ensureOptOutToken`,
 *                                the one it already has, else a new one), then the stop itself
 * Each is idempotent: a wording or line already saved with the same text writes nothing new.
 */
import { NextResponse } from "next/server";
import {
  POLICY_LOCALES, policyTextFieldName, policyBaseFieldName, type PolicyLineKey,
} from "@/lib/legal/policy-lines";
import { savePolicyLines, savedPolicyHistory } from "@/lib/server/legal/policy-lines";
import { saveMarketingWordings, wordingHistory } from "@/lib/server/marketing/wordings";
import { WORDING_DEFAULTS, type WordingKey } from "@/lib/marketing/marketing-wordings";
import { licenceOutreach, openLicenceOutreach, closeLicenceOutreach } from "@/lib/server/marketing/outreach-record";
import { ensureOptOutToken, stopMarketing } from "@/lib/server/marketing/optout-service";

const OFFICER = "usr_dev_typed_test_seed";

/** Words that pass BOTH the save card's rules (each line's required words) AND the three public opening checks — Appendix B's
 *  lines, verbatim from `test:policy-lines` (B2–B5), which saves them through the same writer (L6) and opens on them (L5). */
const PASSING_LINES: Readonly<Partial<Record<PolicyLineKey, Record<(typeof POLICY_LOCALES)[number], string>>>> = {
  "rg.marketing": {
    en: "No marketing messages to a self-excluded player, to a player on a break until they opt in again after it ends, to a player showing a sign of harm (section 3), or to anyone under 18. A player's age is the date of birth they gave us, checked against our identity check; for anyone who is not a 50pick player, we send only after a member of our staff has confirmed in writing that the person is 18 or older, and never without that confirmation.",
    sw: "Hakuna matangazo kwa mchezaji aliyejizuia, kwa mchezaji aliye kwenye mapumziko hadi atakapokubali tena baada ya mapumziko kuisha, kwa mchezaji anayeonyesha dalili ya madhara (sehemu ya 3), wala kwa mtu yeyote aliye chini ya umri wa miaka 18. Umri wa mchezaji ni tarehe ya kuzaliwa aliyotupa, ikilinganishwa na ukaguzi wetu wa utambulisho; kwa mtu ambaye si mchezaji wa 50pick, tunatuma tu baada ya mfanyakazi wetu kuthibitisha kwa maandishi kwamba mtu huyo ana umri wa miaka 18 au zaidi, na kamwe bila uthibitisho huo.",
    zh: "不向已自我排除的玩家、处于冷静期的玩家（直至其在冷静期结束后重新同意）、出现伤害迹象的玩家（见第 3 节），以及未满 18 岁的人发送营销信息。玩家的年龄以其向我们提供并经身份核验比对的出生日期为准；对于非 50pick 玩家，只有在我们的工作人员以书面形式确认此人已年满 18 岁后，我们才会发送，没有该确认绝不发送。",
  },
  "privacy.smsGateway": {
    en: "Blackball, our SMS gateway in Tanzania, which sends our text messages, such as one-time codes and 50pick offers and news, which you can stop at any time with the stop link in every offer or under Profile → Notifications: it receives your phone number and the text of each message, and tells us whether each message was delivered",
    sw: "Blackball, lango letu la SMS nchini Tanzania, linalotuma ujumbe wetu mfupi (SMS), kama misimbo ya matumizi ya mara moja na ofa na habari za 50pick, ambazo unaweza kuzisimamisha wakati wowote kwa kiungo cha kusimamisha kilicho katika kila ofa au kwenye Wasifu → Arifa: hupokea namba yako ya simu na maandishi ya kila ujumbe, na hutuambia kama kila ujumbe umefika",
    zh: "Blackball（坦桑尼亚），我们的短信网关：发送我们的短信，例如一次性验证码以及 50pick 的优惠和资讯——您可随时通过每条优惠短信中的退订链接或在“个人资料 → 通知”中停止接收；接收您的电话号码和每条短信的内容，并告知我们每条短信是否已送达",
  },
  "privacy.lawfulLicence": {
    en: "Our Gaming Board of Tanzania licence: 50pick offers and news by SMS, sent to adult Tanzanian mobile numbers under our licence — you can stop them at any time with the stop link in every offer or under Profile → Notifications, and once you stop we do not send them again unless you ask",
    sw: "Leseni yetu ya Bodi ya Michezo ya Kubahatisha Tanzania: ofa na habari za 50pick kwa SMS, zinazotumwa kwa namba za simu za Tanzania za watu wazima chini ya leseni yetu — unaweza kuzisimamisha wakati wowote kwa kiungo cha kusimamisha kilicho katika kila ofa au kwenye Wasifu → Arifa, na ukishasimamisha hatutumi tena isipokuwa ukiomba",
    zh: "我们的坦桑尼亚博彩委员会牌照：50pick 短信优惠与资讯，依据我们的牌照发送至坦桑尼亚成年人的手机号码——您可随时通过每条优惠短信中的退订链接或在“个人资料 → 通知”中停止接收；一旦停止，除非您要求，我们不会再次发送",
  },
  "privacy.lawfulConsent": {
    en: "Consent: 50pick offers and news by SMS for anyone who asks for them, which you can withdraw at any time under Profile → Notifications; and Google Analytics — only if you allow it when first asked, and you can change that at any time in §7 of this policy",
    sw: "Ridhaa: ofa na habari za 50pick kwa SMS kwa yeyote anayeziomba, ambazo unaweza kuziondoa wakati wowote kwenye Wasifu → Arifa; na Google Analytics — ikiwa tu utairuhusu unapoulizwa mara ya kwanza, na unaweza kubadilisha uamuzi huo wakati wowote katika §7 ya sera hii",
    zh: "同意：向提出要求的任何人发送 50pick 短信优惠与资讯，您可随时在“个人资料 → 通知”中撤回；以及 Google Analytics——仅在首次询问时您同意后才会开启，您可随时在本政策第 7 条中更改",
  },
};

/** A second wording of `adult.test`, for the rewording state — the same promise, other words. */
const ADULT_REWORDED = "I confirm that the person who uses this number is aged 18 or older.";

/** G5 · the source line Ali chose on 2026-10-05 (30 septets — the limit). */
const SOURCE_LINE = "Namba yako ipo orodhani kwetu.";

async function saveLines() {
  const patch: Record<string, string> = {};
  for (const [key, words] of Object.entries(PASSING_LINES) as [PolicyLineKey, Record<string, string>][]) {
    const history = savedPolicyHistory(key);
    const latest = history[history.length - 1];
    if (latest && POLICY_LOCALES.every((l) => (latest as unknown as Record<string, string>)[l] === words[l])) continue;
    for (const l of POLICY_LOCALES) patch[policyTextFieldName(key, l)] = words[l];
    patch[policyBaseFieldName(key)] = String(history.length);
  }
  if (Object.keys(patch).length === 0) return { ok: true, changed: [] as string[] };
  return savePolicyLines(patch, OFFICER);
}

async function saveWording(key: WordingKey, text: string) {
  const history = wordingHistory(key);
  if (history.length > 0 && history[history.length - 1].text === text) return { ok: true, changed: [] as string[] };
  return saveMarketingWordings({ [key]: text, [`approve.${key}`]: "1", [`base.${key}`]: String(history.length) }, OFFICER);
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const url = new URL(req.url);
  const out: Record<string, unknown> = {};
  if (url.searchParams.get("lines") !== null) out.lines = await saveLines();
  const adult = url.searchParams.get("adult");
  if (adult === "1") out.adult = await saveWording("adult.test", WORDING_DEFAULTS["adult.test"]);
  if (adult === "2") out.adult = await saveWording("adult.test", ADULT_REWORDED);
  if (url.searchParams.get("source") !== null) out.source = await saveWording("source.phrase", SOURCE_LINE);
  const open = url.searchParams.get("open");
  if (open === "1") out.open = await openLicenceOutreach(OFFICER);
  if (open === "0") out.close = await closeLicenceOutreach(OFFICER);
  const stop = url.searchParams.get("stop");
  if (stop !== null) {
    const token = await ensureOptOutToken(stop);
    out.stop = token === null ? { ok: false, error: "no token for that number" } : await stopMarketing(token, "SW");
  }
  out.outreach = licenceOutreach().state;
  return NextResponse.json({ ok: true, ...out });
}
