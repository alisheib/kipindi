/** U43 B5: Ali's 2026-10-19 player palette rule in the shared shell. */
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

check("2.1 classic wallet balance and pulse use neutral or brand, never gold",
  classic.includes('"cursor-pointer text-text hover:text-brand-200"')
  && classic.includes('var(--brand-300) 22%, transparent')
  && !/gold|gilt/.test(classic.slice(classic.indexOf('data-testid="wallet-balance-capsule"') - 500, classic.indexOf('data-testid="wallet-balance-pill"') + 100))
  && classic.includes('rounded-r-pill text-text-muted transition-colors'));
check("2.2 Wallet sheet's available amount is neutral",
  /color:\s*var\(--text\)/.test(rule(css, ".kp-wsheet__amt"))
  && !/gold|gilt/.test(rule(css, ".kp-wsheet__amt")));
check("2.3 journey balance and flash are neutral or brand",
  /color:\s*var\(--text\)/.test(rule(css, ".kp-jbal__fig"))
  && /var\(--brand-300\)/.test(rule(css, ".kp-jbal[data-flash]"))
  && !/gold|gilt|--yes-|--no-/.test([".kp-jbal", ".kp-jbal[data-flash]", ".kp-jbal__fig", ".kp-jbal:hover .kp-jbal__fig"].map((s) => rule(css, s)).join(" ")));
check("2.4 classic balance delta uses its signed number, not a betting side",
  classic.includes('style={{ color: "var(--text)" }}')
  && !/--yes-|--no-|gold|gilt/.test(classic.slice(classic.indexOf('className="wbp-delta'), classic.indexOf('</span>', classic.indexOf('className="wbp-delta')))));

check("3.1 classic header deposit is a brand button",
  bar.includes('data-testid="deposit-header"') && bar.includes('className="btn btn-primary btn-md btn-pill"'));
check("3.2 journey header deposit is a brand button",
  journey.includes('data-testid="journey-deposit"') && journey.includes('className="btn btn-primary btn-md btn-pill kp-jhdr__pill"'));
check("3.3 Wallet sheet deposit is a brand button",
  sheet.includes('data-testid="wallet-sheet-deposit"') && sheet.includes('className="btn btn-primary btn-lg kp-wsheet__act"'));

const coin = [".kp-coin", ".kp-coin__needle", ".kp-coin__face", ".kp-coin__verb", ".kp-coin__hub", ".kp-rail__item--coin .kp-rail__label"].map((s) => rule(css, s)).join(" ");
check("4.1 classic rail deposit uses brand and neutral, not betting or earned-money paint",
  rail.includes('data-testid="deposit-rail"') && !rail.includes("MARK.green")
  && /background:\s*var\(--brand-500\)/.test(rule(css, ".kp-coin"))
  && /color:\s*var\(--brand-300\)/.test(rule(css, ".kp-rail__item--coin .kp-rail__label"))
  && !/gold|gilt|--yes-|--no-|--kp-coin-red|--kp-coin-green/.test(coin));

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
check("5.4 unread bell and count use brand, and Clear all is neutral",
  bell.includes('const unreadDot = "brand";')
  && bell.includes('const unreadWash = "bg-brand-500/[0.04]";')
  && bell.includes('const countTone = "brand";')
  && bell.includes('const clearAllHover = "hover:text-text";'));
check("5.5 empty bell illustration has no earned-money gold",
  bell.includes('<circle cx="42" cy="14" r="4" fill="var(--brand-400)" stroke="none" />'));
check("5.6 avatar staff destination uses brand in both shells",
  menu.includes('hover:bg-brand-500/10')
  && menu.includes('text-brand-300/80 leading-tight')
  && menu.includes('className="text-brand-300/70 transition-colors group-hover:text-brand-300"')
  && !/--gold-|text-gold|bg-gold/.test(menu.slice(menu.indexOf('{isAdmin && ('), menu.indexOf('{/* ⛔ THE DUPLICATE LANGUAGE PICKER'))));
check("5.7 avatar menu accent and sign out keep side colours for sides only",
  menu.includes('accent ? "hover:bg-brand-500/10"')
  && menu.includes('accent ? "text-brand-300"')
  && menu.includes('text-text-muted hover:text-text hover:bg-bg-overlay')
  && !/text-danger-fg|bg-danger-|text-gold|bg-gold/.test(menu.slice(menu.indexOf('role="menuitem"', menu.indexOf('Sign-out')), menu.indexOf('{t.common.signOut}'))));
check("5.8 header and rail destination dots use the brand",
  bar.includes('background: "var(--brand-300)"')
  && /background:\s*var\(--brand-300\)/.test(rule(css, '.kp-rail__dot'))
  && !/gilt|gold|--yes-|--no-/.test(rule(css, '.kp-rail__dot')));
check("5.9 Coming soon flag and footer rule contain no money or side ink",
  /background:\s*var\(--bg-inset\)/.test(rule(css, '.cs-badge'))
  && /border:\s*1px solid var\(--border\)/.test(rule(css, '.cs-badge'))
  && /var\(--brand-300\)/.test(rule(css, '.claret-rule'))
  && !/gilt|gold|claret|--yes-|--no-/.test([rule(css, '.cs-badge'), rule(css, '.claret-rule')].map((r) => r.slice(r.indexOf('{') + 1)).join(' ')));
check("5.10 selected language tick uses brand in both player shells",
  languageMenu.includes('const tickInk = "var(--brand-300)";')
  && !/gilt|gold|--yes-|--no-/.test(languageMenu));
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
check("6.1 earned WIN retains gold while the YES/NO logo halves and neutral needle remain defined",
  STATUS_TONE.WIN.player === "gilt"
  && read("src/lib/brand-mark.ts").includes('green: "#1EA362"')
  && read("src/lib/brand-mark.ts").includes('red: "#B03A3E"')
  && read("src/lib/brand-mark.ts").includes('needle: mono ? ink : MARK.whiteInk')
  && read("src/lib/brand-mark.ts").includes('hub: mono ? ink : MARK.whiteInk')
  && !read("src/lib/brand-mark.ts").includes('gold: "#E3BC66"'));
const houseNeedle = rule(needleCss, ':where(#needle-root, [data-needle-theme])');
check("6.2 player instrument has neutral seam, hub, rim and aura",
  houseNeedle.includes('--ndl-seam:        #F7F8FC;')
  && houseNeedle.includes('--ndl-hub-0: #F7F8FC; --ndl-hub-1: #D8DAE4;')
  && houseNeedle.includes('--ndl-rim-warm: #D5D5EB;')
  && houseNeedle.includes('--ndl-aura:   #DCDCF2;')
  && !/--gilt|--gold-|#E3BC66|#FFE7B0|#EFCC7C/.test(houseNeedle));
check("6.3 last-resort error mark also keeps its needle neutral",
  globalError.includes('const NEEDLE = TEXT;')
  && globalError.includes('stroke={NEEDLE}')
  && !globalError.includes('const GOLD ='));
const authority = readFileSync("docs/DESIGN_AUTHORITY.md", "utf8");
check("7.1 design law records Ali's later gold and side rulings",
  authority.includes("Current player rule (Ali, 2026-10-19): gold marks only money the player has won")
  && !authority.includes("Bet and sell keep gold")
  && !authority.includes('The bet commit "Weka dau · TZS {x}" keeps gold')
  && authority.includes("Green and red name only the two betting sides")
  && authority.includes("external social marks' original vendor colours")
  && !authority.includes("external social marks\nretain their shape with neutral player ink"));

console.log(`U43 shell palette: ${failed ? `${failed} failed` : "all checks passed"}`);
process.exit(failed ? 1 : 0);
