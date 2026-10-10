/**
 * ⭐ THE OFFLINE DOCUMENT — what `/offline` answers (`src/app/offline/route.ts`), and so what the service worker shows
 * a player whose connection is gone (`public/sw.js` precaches it and serves it to any navigation the network could not
 * answer). Built here, as one string, from the dictionary, the brand mark's one geometry and the design tokens.
 *
 * 🔴 WHY IT IS NOT A PAGE ANY MORE (R4-G, the Vodacom visual pass, 2026-10-09 — edge scenario 9, tiles 453–485).
 * `/offline` was `src/app/offline/page.tsx`, so it rendered inside the ROOT LAYOUT: AppShell around it, for whoever
 * asked. The service worker precached it at install with `cache.add("/offline")` — a same-origin request, so the
 * session cookie and the `kp-locale` cookie rode along — and kept that HTML for the life of the cache. Three defects
 * came out of that one fact, and the tiles show all three:
 *   1. THE WRONG LANGUAGE. The cached copy was the server's render in the language of the moment it was cached (the
 *      drive installed it in Swahili), so every English and Chinese tile read "Hauko mtandaoni" with `<html lang="sw">`.
 *      The page claimed to "localise from the kp-locale cookie even when served from cache"; it could only do that
 *      once React hydrated, and hydration needs the page's script chunks — which the worker never caches (offline:
 *      `net::ERR_INTERNET_DISCONNECTED` on each). And even hydrated, the provider changes its STATE from the cookie,
 *      never `<html lang>` (`i18n.tsx`: only `setLocale` writes it).
 *   2. A PERSON'S PAGE, KEPT. The cached copy was the WHOLE SHELL rendered for the person signed in at install: the
 *      journey header with "Salio TZS 100,000" on every tile, the staff preview strip, the avatar — or the classic
 *      bar with the balance and the name. Offline, anybody on that phone later (after sign-out, a shared handset) was
 *      shown that player's header and balance, and the player a balance that was days old.
 *   3. A HYDRATION MISMATCH BACK ONLINE (tile 455). That HTML was rendered for the URL `/offline` and is shown at the
 *      URL the player asked for (`/positions`): when its chunks did load, React hydrated a tree whose path-, time- and
 *      session-derived attributes no longer matched the client's, and the Next.js error dialog opened.
 *
 * ⭐ SO THE DOCUMENT IS NOW THIS STRING, AND EACH DEFECT IS IMPOSSIBLE BY CONSTRUCTION, NOT BY CARE:
 *   · NO PERSON. It is built from no request: no cookie, no header, no session is read (`route.ts` reads only the
 *     public licence number), and the worker fetches it with `credentials: "omit"` besides. It has no header, no
 *     balance, no name, no sign-in state, no preview strip — nothing of the shell at all.
 *   · THE LANGUAGE OF NOW. Every phrase is here in every language the dictionary holds, each in a `lang` span; the
 *     script in the head reads `kp-locale` from `document.cookie` (then the saved choice, as the provider does) when
 *     the page is SHOWN, sets `<html lang>` and the title, and the stylesheet shows only that language's spans. The
 *     words are the dictionary's own (`common.offline`, `common.offlineHint`, `error.tryAgain`, the footer's
 *     regulator lines) — no sentence is written here.
 *   · NOTHING TO HYDRATE. No React, no Next.js runtime, no script but its own two: there is no tree to mismatch, and
 *     nothing it needs can be missing offline — the mark, the glyphs, the backdrop and the styles are all inline.
 *   · IT RECOVERS. "Jaribu tena" reloads the address the player asked for; the browser's `online` event does the
 *     same by itself; on `/offline` itself (nothing there to retry) both go home.
 *
 * ⭐ ONE LOOK, FOR THE CLASSIC AND THE JOURNEY ALIKE — decided, and why. The page's body was already the same in both
 * (the mark, the wifi-off disc, the title, the hint, the pill retry on the topographic backdrop); only the chrome
 * around it differed, and the chrome is exactly what carried the person. Which of the two a phone is shown is decided
 * on the server from the session and the preview pass; a document that must read neither cannot know it, and a guess
 * would be wrong for one of them. So both get the body they already had, drawn from the same tokens, with the
 * regulator lines a page must carry (18+, the Gaming Board licence, the stop line — `public-footer.tsx`: LCCP SR 5.1.5)
 * below the fold, as `OptOutShell` carries them.
 * ⚠️ THE ONE THING IT CANNOT CARRY: the brand faces. next/font self-hosts Sora and Inter under build-hashed names that
 * only the app's own stylesheet knows, so this document names them first and falls back to the system face, exactly
 * as `global-error.tsx` does for the same reason.
 * ⛔ Every token, the primary button's paint, the backdrop, the two glyphs and the dictionary words are held to their
 * sources by `test:offline-neutral` — a copy here that drifts fails there.
 */
import { dict, DEFAULT_LOCALE, type Dict, type Locale } from "@/lib/i18n-dict";
import { markInnerSvg } from "@/lib/brand-mark";
import { regulatorSplit } from "@/lib/regulator-name";
import { connectiveRanges, splitLeadConnective } from "@/lib/connectives";

/** The path the document is served at — the service worker's `OFFLINE_URL` names the same. */
export const OFFLINE_PATH = "/offline";
/** The language cookie the language menu writes and the root layout reads (`layout.tsx`, `i18n.tsx` COOKIE_NAME). */
export const OFFLINE_LOCALE_COOKIE = "kp-locale";
/** Every language the dictionary holds, in its own order: the document carries all of them and shows one. */
export const OFFLINE_LOCALES = Object.keys(dict) as Locale[];
/** The retry button, which the document's own script answers. */
export const OFFLINE_RETRY_ID = "kp-offline-retry";

/**
 * The design tokens the document paints with, each exactly as `src/app/globals.css` declares it (its one site — E-117).
 * The document cannot load that stylesheet offline, so it declares them itself; `test:offline-neutral` §5 compares each.
 */
export const OFFLINE_TOKENS = {
  "--bg": "oklch(6.5% 0.130 268)",
  "--bg-elevated": "oklch(22% 0.140 268)",
  "--bg-overlay": "oklch(11% 0.110 268)",
  "--border": "oklch(36% 0.130 268)",
  "--text": "oklch(98% 0.012 268)",
  "--text-muted": "oklch(86% 0.040 268)",
  "--text-subtle": "oklch(70% 0.080 268)",
  "--pearl-50": "oklch(99% 0.006 268)",
  "--brand-500": "oklch(63% 0.180 262)",
  "--claret-400": "oklch(60% 0.160 15)",
  "--gold-300": "oklch(86% 0.110 84)",
  "--gilt": "var(--gold-300)",
  "--font-cjk": "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Noto Sans SC', 'Source Han Sans SC'",
  "--font-display": "'Sora', system-ui, var(--font-cjk), sans-serif",
  "--font-body": "'Inter', system-ui, var(--font-cjk), sans-serif",
  "--font-mono": "'JetBrains Mono', ui-monospace, var(--font-cjk), monospace",
  "--type-body": "15px",
  "--type-micro": "11px",
  "--h-control-md": "44px",
  "--r-pill": "999px",
  "--w-board": "1280px",
} as const;

/** `.btn-primary`'s paint, property for property as `globals.css` writes it (`test:offline-neutral` §5). */
export const OFFLINE_PRIMARY = {
  background: "linear-gradient(180deg, oklch(53% 0.20 268) 0%, oklch(48% 0.20 268) 100%)",
  color: "var(--pearl-50)",
  "border-color": "oklch(40% 0.20 268)",
  "box-shadow": "inset 0 0 0 1px oklch(74% 0.16 268 / 0.32), 0 2px 8px -2px oklch(20% 0.10 268 / 0.50), 0 8px 22px -10px oklch(48% 0.20 268 / 0.55)",
  "letter-spacing": "0.005em",
  "text-shadow": "0 1px 0 oklch(20% 0.10 268 / 0.40)",
} as const;

/** `BrandTopo` (`src/components/brand-topo.tsx`) at the opacity the offline page drew it: its tile, ink and four contours. */
export const OFFLINE_TOPO = {
  opacity: 0.09,
  width: 240,
  height: 180,
  stroke: "oklch(96% 0.005 240)",
  strokeWidth: "0.6",
  paths: [
    "M 0 90 Q 60 60 120 90 T 240 90",
    "M 0 60 Q 60 30 120 60 T 240 60",
    "M 0 120 Q 60 100 120 120 T 240 120",
    "M 0 150 Q 60 130 120 150 T 240 150",
  ],
} as const;

/** The two line glyphs the page drew (`I.wifiOff`, `I.rotateCcw` in `src/components/ui/glyphs.tsx`), as their inner SVG. */
export const OFFLINE_GLYPHS = {
  wifiOff: '<path d="M8.5 13.2a6.3 6.3 0 0 1 7 0"/><path d="M5 10a10.6 10.6 0 0 1 4.2-2.3M14.8 7.7A10.6 10.6 0 0 1 19 10"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/><path d="M4 4l16 16"/>',
  rotateCcw: '<path d="M3 12a9 9 0 1 0 2.6-6.3L3 8"/><path d="M3 3.5V8h4.5"/>',
} as const;

/**
 * ⭐ THE REGULATOR'S NAME IS ONE NAME HERE TOO (R5-G, 2026-10-09, G-5 — R5-A's F18 rule, as the journey's footer and the
 * opt-out shell's footer keep it). The licence line is the row less the 18+ roundel and its gap (vw − 70 below 1024), so
 * at en 320–334 it read "Licensed by the Gaming" / "Board of Tanzania." and at sw 333–390 "Leseni ya Bodi ya Michezo" /
 * "ya Kubahatisha Tanzania." (in Inter's widths). Each language's name is now a `.kp-gbt-name` span (`regulator-name.ts`,
 * the pattern `keepRegulator` reads), the line is a size container, and the name is `nowrap` only from these widths —
 * globals.css's own for `.kp-gbt` (the name and its full stop in Inter 13px, plus 3px; `test:visual-pass-r5g` §4 holds
 * the two equal).
 * A line narrower than the name (sw under 333) wraps as before, so it never overflows. CSS only: the document's two
 * scripts are untouched. The document names Inter first and falls back to the system face; Roboto, Segoe UI, Helvetica
 * and Noto Sans all set Latin narrower than Inter (Next's capsize table: average widths 0.445, 0.443, 0.450, 0.474 of an
 * em against Inter's 0.478), so a width that holds the name in Inter holds it in each of them.
 * ⭐ ROUND 7 (2026-10-10, the owner's item 37 — a line never ends on a connective): the sw name carries the "ya" that
 * introduces it ("Leseni" / "ya Bodi ya Michezo ya Kubahatisha Tanzania.", as `keepRegulator` draws it), so its width is
 * that run's, 277.4px in Inter 13px: 281 with the 3px; and inside the name each connective keeps the space after it
 * (`.kp-nw`), so a line too narrow for the name never ends on "ya" either.
 */
export const OFFLINE_GBT_FROM: Readonly<Record<Locale, number>> = { en: 168, sw: 281, zh: 120 };

const esc =(s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** A value for an inline script: JSON, with every `<` escaped so no string can close the element it sits in. */
const js = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const tFor = (l: Locale) => dict[l] as Dict;
/** One phrase in every language, each in a span the stylesheet shows only under its own `<html lang>`. */
const say = (pick: (t: Dict) => string) => OFFLINE_LOCALES.map((l) => `<span class="l" lang="${l}">${esc(pick(tFor(l)))}</span>`).join("");
/** …and the licence sentence, its words the same, with the regulator's name in a `.kp-gbt-name` span in each language —
 *  the connective before it inside the span, and each connective inside it held to the word after it (`.kp-nw`). */
const heldConnectives = (s: string) => {
  let out = "", from = 0;
  for (const [a, b] of connectiveRanges(s)) { out += `${esc(s.slice(from, a))}<span class="kp-nw">${esc(s.slice(a, b))}</span>`; from = b; }
  return out + esc(s.slice(from));
};
const sayLicence = (pick: (t: Dict) => string) => OFFLINE_LOCALES.map((l) => {
  const s = pick(tFor(l));
  const cut = regulatorSplit(s);
  if (!cut) return `<span class="l" lang="${l}">${esc(s)}</span>`;
  const [before, lead] = splitLeadConnective(cut[0]);
  return `<span class="l" lang="${l}">${esc(before)}<span class="kp-gbt-name">${heldConnectives(lead + cut[1])}</span>${esc(cut[2])}</span>`;
}).join("");
/** A 24-grid line glyph, drawn as `glyphs.tsx`'s `G` draws it. */
const glyph = (inner: string, s: number) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
/** The tab title in each language: the app's title template, `%s · 50pick`. */
const titleOf = (l: Locale) => `${tFor(l).common.offline} · 50pick`;

/**
 * The head script: the language the player has NOW — `kp-locale` from the cookie, else the saved choice (the
 * provider's own order, `i18n.tsx`), else the platform default — onto `<html lang>` and the title, before first paint.
 */
function localiser(): string {
  const titles = Object.fromEntries(OFFLINE_LOCALES.map((l) => [l, titleOf(l)]));
  return `(function(){var L=${js(OFFLINE_LOCALES)},T=${js(titles)},N=${js(OFFLINE_LOCALE_COOKIE)},l=${js(DEFAULT_LOCALE)},v=null;`
    + `try{var m=document.cookie.match(new RegExp("(?:^|; )"+N+"=([^;]*)"));if(m)v=decodeURIComponent(m[1])}catch(e){}`
    + `if(L.indexOf(v)<0){try{v=localStorage.getItem(N)}catch(e){v=null}}`
    + `if(L.indexOf(v)>=0)l=v;document.documentElement.lang=l;document.title=T[l]})();`;
}

/** The body script: the retry reloads the address the player asked for, and so does the connection coming back. */
function recovery(): string {
  return `(function(){function again(){if(location.pathname===${js(OFFLINE_PATH)})location.replace("/");else location.reload()}`
    + `var b=document.getElementById(${js(OFFLINE_RETRY_ID)});if(b)b.addEventListener("click",again);`
    + `window.addEventListener("online",again)})();`;
}

function stylesheet(): string {
  const tokens = Object.entries(OFFLINE_TOKENS).map(([k, v]) => `${k}:${v}`).join(";");
  const primary = Object.entries(OFFLINE_PRIMARY).map(([k, v]) => `${k}:${v}`).join(";");
  const hide = OFFLINE_LOCALES.map((l) => `html:not([lang="${l}"]) .l[lang="${l}"]`).join(",");
  return [
    `:root{${tokens};color-scheme:dark}`,
    `*,*::before,*::after{box-sizing:border-box}`,
    `html{-webkit-text-size-adjust:100%;text-size-adjust:100%}`,
    `body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:var(--type-body);line-height:1.5;-webkit-font-smoothing:antialiased;font-feature-settings:"ss01","cv11";-webkit-tap-highlight-color:transparent}`,
    `svg{display:block}`,
    `${hide}{display:none}`,
    `.kp-off{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100svh;padding:32px 16px}`,
    `.kp-off__topo{position:absolute;inset:0;width:100%;height:100%;opacity:${OFFLINE_TOPO.opacity};pointer-events:none}`,
    `.kp-off__col{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;max-width:400px;text-align:center}`,
    `.kp-off__disc{margin-top:32px;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:var(--r-pill);border:1px solid var(--border);background:var(--bg-overlay);color:var(--text-subtle)}`,
    `.kp-off__title{margin:20px 0 0;font-family:var(--font-display);font-size:28px;line-height:1.25;letter-spacing:-0.85px;font-weight:700;color:var(--text)}`,
    `.kp-off__hint{margin:12px 0 0;font-size:13px;line-height:1.375;color:var(--text-muted)}`,
    `.kp-off__retry{margin:32px 0 0;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:var(--h-control-md);padding:0 16px;border:1px solid transparent;border-radius:var(--r-pill);font-family:var(--font-body);font-size:14px;font-weight:600;line-height:inherit;white-space:nowrap;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-appearance:none;appearance:none;${primary}}`,
    `.kp-off__retry:focus-visible{outline:2px solid var(--brand-500);outline-offset:2px;box-shadow:0 0 0 4px oklch(63% 0.18 262 / 0.25)}`,
    `.kp-off__rg{background:color-mix(in oklab,var(--bg-elevated) 40%,transparent)}`,
    `.kp-off__rule{height:1px;max-width:var(--w-board);margin:0 auto;background:linear-gradient(90deg,transparent,var(--claret-400) 18%,var(--gilt) 50%,var(--claret-400) 82%,transparent);opacity:.95}`,
    `.kp-off__rg-in{max-width:var(--w-board);margin:0 auto;padding:20px 16px 40px;display:flex;flex-direction:column;gap:12px}`,
    `.kp-off__rg-row{display:flex;align-items:center;gap:10px}`,
    `.kp-off__18{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:2px solid var(--text-subtle);border-radius:var(--r-pill);font-family:var(--font-display);font-weight:700;font-size:var(--type-micro);color:var(--text)}`,
    `.kp-off__rg p{margin:0;font-size:13px;line-height:18px;letter-spacing:-0.05px;text-wrap:balance;word-break:keep-all}`,
    // The licence line takes the row's remainder (a size container has no width of its own to give a flex row).
    `.kp-off__rg .kp-off__gbt{color:var(--text-muted);line-height:1.625;flex:1 1 0%;min-width:0;container:kp-gbt/inline-size}`,
    ...OFFLINE_LOCALES.map((l) => `@container kp-gbt (min-width:${OFFLINE_GBT_FROM[l]}px){.kp-gbt-name:lang(${l}){white-space:nowrap}}`),
    `.kp-nw{white-space:nowrap}`,
    `.kp-off__lic{font-family:var(--font-mono);font-variant-numeric:tabular-nums;color:var(--text-subtle)}`,
    `.kp-off__stop{font-style:italic;color:var(--text-subtle)}`,
    `@media (min-width:1024px){.kp-off__rg-in{padding-left:32px;padding-right:32px}}`,
  ].join("");
}

/**
 * The whole document. ⛔ Its only input is the licence number, a public fact (`/admin/system`): nothing about the
 * person asking can reach it, because nothing about the request is read.
 */
export function offlineDocument({ licenceNumber }: { licenceNumber: string }): string {
  const topo = OFFLINE_TOPO.paths
    .map((d) => `<path d="${d}" fill="none" stroke="${OFFLINE_TOPO.stroke}" stroke-width="${OFFLINE_TOPO.strokeWidth}"/>`)
    .join("");
  return "<!doctype html>"
    + `<html lang="${DEFAULT_LOCALE}" translate="no" class="notranslate">`
    + "<head>"
    + `<meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover">`
    + `<meta name="theme-color" content="#0a0e33">`
    + `<meta name="google" content="notranslate">`
    + `<meta name="robots" content="noindex">`
    + `<title>${esc(titleOf(DEFAULT_LOCALE))}</title>`
    + `<script>${localiser()}</script>`
    + `<style>${stylesheet()}</style>`
    + "</head>"
    + "<body>"
    + `<main id="main-content" class="kp-off">`
    + `<svg class="kp-off__topo" aria-hidden="true"><defs><pattern id="kp-off-topo" x="0" y="0" width="${OFFLINE_TOPO.width}" height="${OFFLINE_TOPO.height}" patternUnits="userSpaceOnUse">${topo}</pattern></defs><rect width="100%" height="100%" fill="url(#kp-off-topo)"/></svg>`
    + `<div class="kp-off__col">`
    + `<svg class="kp-off__mark" viewBox="0 0 100 100" width="64" height="64" role="img" aria-label="50pick">${markInnerSvg("color", false)}</svg>`
    + `<span class="kp-off__disc" aria-hidden="true">${glyph(OFFLINE_GLYPHS.wifiOff, 18)}</span>`
    + `<h1 class="kp-off__title">${say((t) => t.common.offline)}</h1>`
    + `<p class="kp-off__hint">${say((t) => t.common.offlineHint)}</p>`
    + `<button type="button" id="${OFFLINE_RETRY_ID}" class="kp-off__retry">${glyph(OFFLINE_GLYPHS.rotateCcw, 14)}<span>${say((t) => t.error.tryAgain)}</span></button>`
    + "</div>"
    + "</main>"
    + `<footer class="kp-off__rg">`
    + `<div class="kp-off__rule" aria-hidden="true"></div>`
    + `<div class="kp-off__rg-in">`
    + `<div class="kp-off__rg-row"><span class="kp-off__18">${say((t) => t.footer.eighteenPlus)}</span><p class="kp-off__gbt">${sayLicence((t) => t.footer.licensedByGbt)}</p></div>`
    + `<p class="kp-off__lic">${say((t) => t.footer.license)}: ${esc(licenceNumber)}</p>`
    + `<p class="kp-off__stop">${say((t) => t.footer.stopGambling)}</p>`
    + "</div>"
    + "</footer>"
    + `<script>${recovery()}</script>`
    + "</body>"
    + "</html>";
}
