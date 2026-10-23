/** Ali's 2026-10-20 restoration of named house gold, with LIVE/HOT still neutral. */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { STATUS_TONE, TONE_CHIP } from "../src/lib/status-tone.ts";
import { InstagramMark, TikTokMark, WhatsAppMark } from "../src/components/ui/social-marks.tsx";
import { decomment } from "./lib/decomment.mts";

let failed = 0;
const check = (id: string, yes: boolean) => {
  console.log(`${yes ? "PASS" : "FAIL"} ${id}`);
  if (!yes) failed++;
};
const read = (file: string) => decomment(readFileSync(file, "utf8"));
const rule = (css: string, selector: string) => {
  const at = css.indexOf(`${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};
const css = read("src/app/globals.css");
const classic = read("src/components/layout/wallet-balance-pill.tsx");
const bar = read("src/components/layout/top-app-bar.tsx");
const journey = read("src/components/journey/journey-top-bar.tsx");
const sheet = read("src/components/layout/wallet-sheet.tsx");
const rail = read("src/components/layout/bottom-nav.tsx");
const market = read("src/components/markets/market-card.tsx");
const ticker = read("src/components/layout/live-ticker.tsx");
const bell = read("src/components/layout/notifications-panel.tsx");
const menu = read("src/components/layout/avatar-menu.tsx");
const languageMenu = read("src/components/ui/language-menu.tsx");
const footer = read("src/components/layout/public-footer.tsx");
const socialMarks = read("src/components/ui/social-marks.tsx");
const channels = read("src/components/social/channels-panel.tsx");
const shareButton = read("src/components/markets/share-button.tsx");
const positionShare = read("src/components/markets/position-share.tsx");
const invite = read("src/app/profile/invite/invite-client.tsx");
const needleCss = read("src/components/layout/needle.css");
const globalError = read("src/app/global-error.tsx");

check("1.1 LIVE is slate for players and the kit renders it neutral; console health keeps its own tone",
  STATUS_TONE.LIVE.player === "slate" && TONE_CHIP[STATUS_TONE.LIVE.player] === "neutral"
  && STATUS_TONE.LIVE.admin === "green");
check("1.2 the market status consumes the dictionary and HOT uses neutral",
  market.includes('variant={TONE_CHIP[STATUS_TONE[statusWord].player]}')
  && market.includes('signal.kind === "hot" ? "neutral"'));

check("2.1 classic wallet balance, flash and eye restore gold",
  classic.includes('"cursor-pointer text-gold-300 hover:text-gold-200"')
  && classic.includes('var(--gold-300) 22%, transparent')
  && classic.includes('rounded-r-pill text-[var(--gold-300)] transition-colors'));
check("2.2 Wallet sheet's available amount restores gold; held or masked stays plain",
  /color:\s*var\(--gold-300\)/.test(rule(css, ".kp-wsheet__amt"))
  && /color:\s*var\(--text\)/.test(rule(css, ".kp-wsheet__amt:is([data-held], [data-masked])")));
check("2.3 journey balance and flash restore gold; held or masked stays plain",
  /color:\s*var\(--gold-300\)/.test(rule(css, ".kp-jbal__fig"))
  && /var\(--gold-300\)/.test(rule(css, ".kp-jbal[data-flash]"))
  && /color:\s*var\(--text\)/.test(rule(css, ".kp-jbal:is([data-held], [data-masked]) .kp-jbal__fig")));
check("2.4 classic balance delta retains its older directional signs; Journey stays neutral",
  classic.includes('style={{ color: delta > 0 ? "var(--yes-300)" : "var(--no-300)" }}')
  && /color:\s*var\(--text\)/.test(rule(css, ".kp-jbal__delta[data-sign]")));

check("3.1 classic header deposit restores the gilt material",
  bar.includes('data-testid="deposit-header"') && bar.includes('className="btn gilt-metal btn-md btn-pill"'));
check("3.2 journey header deposit restores the gilt material",
  journey.includes('data-testid="journey-deposit"') && journey.includes('className="btn gilt-metal btn-md btn-pill kp-jhdr__pill"'));
check("3.3 Wallet sheet deposit restores the gilt material",
  sheet.includes('data-testid="wallet-sheet-deposit"') && sheet.includes('className="btn gilt-metal btn-lg kp-wsheet__act"'));

const coin = [".kp-coin", ".kp-coin__needle", ".kp-coin__face", ".kp-coin__verb", ".kp-coin__hub", ".kp-rail__item--coin .kp-rail__label"].map((s) => rule(css, s)).join(" ");
check("4.1 classic rail deposit restores mark-split ring and gilt face",
  rail.includes('data-testid="deposit-rail"')
  && ['MARK.green', 'MARK.red', 'MARK.gold', 'MARK.pivot'].every((ink) => rail.includes(ink))
  && /conic-gradient\(from -14deg/.test(rule(css, ".kp-coin"))
  && /var\(--kp-coin-green\)/.test(rule(css, ".kp-coin"))
  && /background-image:\s*var\(--gilt-sheen\), var\(--gilt-metal\)/.test(rule(css, ".kp-coin__face"))
  && /background:\s*var\(--kp-coin-gold\)/.test(rule(css, ".kp-coin__needle"))
  && /color:\s*var\(--gilt\)/.test(rule(css, ".kp-rail__item--coin .kp-rail__label"))
  && !/--brand-(?:300|500)/.test(coin));

check("5.1 player live dots use neutral ink",
  [".live-dot", ".kp-proof__pip", ".mcardp-live-dot"].every((s) =>
    /background:\s*var\(--text-subtle\)/.test(rule(css, s))
    && !/--live-400|--yes-|--no-/.test(rule(css, s))));
check("5.2 ticker LIVE pip, label and separator use neutral ink",
  ticker.includes('<Dot tone="neutral" size={6} pulse />')
  && ticker.includes('tracking-[0.1em] text-text-subtle')
  && ticker.includes('<Dot color="var(--text-subtle)" size={3}')
  && !/--live-400|--gold-/.test(ticker));
check("5.3 ticker controls reserve brand for keyboard focus and use neutral pressed ink",
  /color:\s*var\(--text\)/.test(rule(css, '.ticker-pause[aria-pressed="true"]'))
  && /var\(--brand-300\)/.test(rule(css, '.ticker-pause:focus-visible'))
  && /var\(--brand-300\)/.test(rule(css, '.ticker-viewport:focus-visible')));
check("5.4 classic unread bell restores gold while Journey stays brand; count and Clear all are neutral",
  bell.includes('const unreadDot = journey ? "brand" : "gold";')
  && bell.includes('const unreadWash = journey ? "bg-brand-500/[0.04]" : "bg-gold-500/[0.04]";')
  && bell.includes('const countTone = "brand";')
  && bell.includes('const clearAllHover = "hover:text-text";'));
const emptyBellStart = bell.indexOf("{items.length === 0 && (");
const emptyBellEnd = bell.indexOf("{t.notif.noNotificationsHint}", emptyBellStart);
const emptyBell = emptyBellStart >= 0 && emptyBellEnd > emptyBellStart ? bell.slice(emptyBellStart, emptyBellEnd) : "";
check("5.5 empty bell uses its Duotone identity plate, never earned-money gold",
  emptyBell.includes('<IconPlate size={56} variant="empty" className="mx-auto mb-3" aria-hidden>')
  && emptyBell.includes('<I.bell s={plateGlyph(56)} tier="duo" />')
  && !/variant="gold"|var\(--gold-|text-gold|bg-gold/.test(emptyBell));
 check("5.6 avatar staff destination keeps its separate brand identity plate",
  menu.includes('hover:bg-brand-500/10')
  && menu.includes('text-brand-300/80 leading-tight')
  && menu.includes('className="text-brand-300/70 transition-colors group-hover:text-brand-300"')
  && !/--gold-|text-gold|bg-gold/.test(menu.slice(menu.indexOf('{isAdmin && ('), menu.indexOf('</a>', menu.indexOf('{isAdmin && (')))));
check("5.7 classic avatar accent restores gold; sign out stays plain",
  menu.includes('accent ? "hover:bg-gold-500/10"')
  && menu.includes('accent ? "text-gold-300"')
  && menu.includes('text-text-muted hover:text-text hover:bg-bg-overlay')
  && !/text-danger-fg|bg-danger-/.test(menu.slice(menu.indexOf('role="menuitem"', menu.indexOf('Sign-out')), menu.indexOf('{t.common.signOut}'))));
// ⭐ FLIPPED BY THE OWNER (Ali, 2026-10-23: "please remove the golden dot, make it like other tabs please"; DESIGN_AUTHORITY
// §K 3, "Every nav tab alike"): the restored house gold never reaches a destination — Up & Down's product-line dot is
// deleted from the header and the rail, with the header's own ink for it. `test:nav-tabs-alike` reads the drawn bars.
check("5.8 header and rail draw no product-line dot and no destination's own ink (every nav tab alike)",
  !bar.includes('background: "var(--gilt)"') && !/data-accent|accent:\s*true|it\.accent/.test(bar)
  && !/kp-rail__dot|accent:\s*true/.test(rail)
  && rule(css, '.kp-rail__dot') === "" && !/\[data-accent\]/.test(css));
check("5.9 classic Coming soon flag and footer midpoint restore house gold; page-body flag stays neutral",
  /var\(--gold-500\) 9%/.test(rule(css, '.cs-badge'))
  && /var\(--gold-500\) 22%/.test(rule(css, '.cs-badge'))
  && /#main-content \.cs-badge,\s*:root:is\(\[data-shell="journey"\], #kp-journey-shell\) \.cs-badge\s*\{\s*background:\s*var\(--bg-inset\)/.test(css)
  && /var\(--gilt\) 50%/.test(rule(css, '.claret-rule')));
check("5.10 selected language tick restores classic gilt while Journey keeps brand",
  languageMenu.includes('const tickInk = journey ? "var(--brand-300)" : "var(--gilt)";'));
const socialBranded = (marks: string) =>
  !/PLAYER_MARK_STYLE|grayscale\(|brightness\(/.test(marks)
  && marks.includes('fill={`url(#${IG_GRADIENT_ID})`}')
  && marks.includes('<path fill="#25D366" d={WHATSAPP_BUBBLE_D} />')
  && marks.includes('<use href={`#${TT_NOTE_ID}`} fill="#25F4EE"')
  && !/style=\{/.test(marks.slice(marks.indexOf('export function InstagramMark')));
const instagramMarkup = renderToStaticMarkup(createElement(InstagramMark));
const tiktokMarkup = renderToStaticMarkup(createElement(TikTokMark));
const whatsAppMarkup = renderToStaticMarkup(createElement(WhatsAppMark));
check("5.11 all mounted social marks render their original vendor colours",
  socialBranded(socialMarks)
  && instagramMarkup.includes('stop-color="#FD5949"')
  && instagramMarkup.includes('stop-color="#D6249F"')
  && tiktokMarkup.includes('fill="#25F4EE"')
  && tiktokMarkup.includes('fill="#FE2C55"')
  && whatsAppMarkup.includes('fill="#25D366"')
  && ![instagramMarkup, tiktokMarkup, whatsAppMarkup].some((mark) => /filter:|filter=/.test(mark))
  && footer.includes('<Mark s={16} />')
  && channels.includes('<Mark s={24} />')
  && shareButton.includes('<WhatsAppMark s={18} />')
  && positionShare.includes('<WhatsAppMark s={14} />')
  && invite.includes('<WhatsAppMark s={14} />'));
check("5.11′ PLANT · borrowing YES green for WhatsApp makes the social guard red",
  !socialBranded(socialMarks.replace('<path fill="#25D366" d={WHATSAPP_BUBBLE_D} />', '<path fill="var(--yes-500)" d={WHATSAPP_BUBBLE_D} />')));
check("6.1 earned WIN retains gold and the YES/NO logo regains delivered gilt centre",
  STATUS_TONE.WIN.player === "gilt"
  && read("src/lib/brand-mark.ts").includes('green: "#1EA362"')
  && read("src/lib/brand-mark.ts").includes('red: "#B03A3E"')
  && read("src/lib/brand-mark.ts").includes('gold: "#E3BC66"')
  && read("src/lib/brand-mark.ts").includes('needle: mono ? ink : MARK.gold')
  && read("src/lib/brand-mark.ts").includes('hub: mono ? ink : MARK.gold'));
const houseNeedle = rule(needleCss, ':where(#needle-root, [data-needle-theme])');
check("6.2 player instrument restores gilt seam, hub, rim and aura",
  houseNeedle.includes('--ndl-seam:        #FFE7B0;')
  && houseNeedle.includes('--ndl-hub-0: #FFF3D4; --ndl-hub-1: #EFCC7C;')
  && houseNeedle.includes('--ndl-rim-warm: #E3BC66;')
  && houseNeedle.includes('--ndl-aura:   var(--gilt);'));
check("6.3 last-resort mark also restores its gilt needle",
  globalError.includes('const NEEDLE = "oklch(86% 0.13 82)";')
  && globalError.includes('stroke={NEEDLE}')
  && !globalError.includes('const NEEDLE = TEXT;'));
const authority = readFileSync("docs/DESIGN_AUTHORITY.md", "utf8");
check("7.1 design law records Ali's 2026-10-20 gold restoration and side rulings",
  authority.includes("Current player rule (Ali, 2026-10-20): restore the full earlier house-gold treatment")
  && authority.includes("Current mark ink (Ali, 2026-10-20)")
  && authority.includes("U43 2026-10-19 gold-only-winnings")
  && authority.includes("Green and red name only the two betting sides")
  && authority.includes("external social marks' original vendor colours")
  && !authority.includes("external social marks\nretain their shape with neutral player ink"));

console.log(`U43 shell palette: ${failed ? `${failed} failed` : "all checks passed"}`);
process.exit(failed ? 1 : 0);
