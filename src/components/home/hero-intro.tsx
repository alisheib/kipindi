/**
 * THE HERO'S STATIC INTRO — the claim, the question (the h1) and the trust rows, the part of the landing hero that
 * reads no market and no session: only the words, the locale and the wallets that pay out. Moved here VERBATIM from
 * `landing-hero.tsx` (2026-10-09, the visual pass round 4, R4-J) so that the journey's loading ghost for `/`
 * (`components/journey/route-ghost.tsx`) can draw the very same claim, h1 and rows the page lands with, and so lands
 * where it promised in every language: the h1 is two lines in sw and en and one in zh, the claim one line or two.
 * ⛔ WHY A MODULE OF ITS OWN. The ghost is drawn by the ROOT loading file, and every client module a root-segment
 * server file reaches joins the scripts EVERY page loads first (VODACOM-PLAN §0h point 20, the WP6c lesson).
 * `landing-hero.tsx` imports the market card, the filter pill and the tipping bar; this file imports only what the
 * three parts draw with: its one client module is `brand.tsx` (the wordmark), which every page already loads first;
 * the rest (the glyphs, the words, the rail list) is drawn on the server.
 * `landing-hero.tsx` renders all three exactly where it did, with the same props. `test:hero-copy` reads the two files
 * as one hero (§1 `heroClaimFirst` is read in this file alone), and `test:visual-pass-r4j` §3 holds the imports.
 */
import { I } from "@/components/ui/glyphs";
import { FiftyWordmark } from "@/components/brand";
import { fill } from "@/lib/utils";
import { FIRST_LICENSED_EVIDENCE } from "@/lib/support-config";
import { railListParts } from "@/lib/rail-list";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { sideWord } from "@/lib/side-label";

/**
 * The claim — "50pick │ Tanzania's first licensed prediction market" (spec §4; R9).
 *
 * ⭐ A CLASS OF ITS OWN, NOT THE SHARED EYEBROW: `.kp-hero__eyebrow` also styles the section labels
 * further down the page, and the claim is the brightest small text on the first screen (`--text`,
 * mono 600), where those are quiet labels. Its tracking joins the one 0.14em list in globals.css.
 * ⭐ THE WORDMARK IS THE LOGO USED AS A LOGO — below 1280 the header shows only the mark, so the name
 * "50pick" reaches the first screen here. From 1280 the header carries the wordmark and this one is
 * hidden (CSS), with its rule.
 * ⛔ "FIRST" IS READ ONLY INSIDE THE EVIDENCE BRANCH BELOW. `test:hero-copy` §1 fails if
 * `heroClaimFirst` is read anywhere else, or if any other string claims a first.
 * The text is stored in sentence case; CSS does the capitals.
 */
export function Claim({ t }: { t: Dict }) {
  return (
    <p className="kp-hero__claim">
      <span className="kp-hero__claim-mark"><FiftyWordmark size={15} tz={false} /></span>{" "}
      <span className="kp-hero__claim-rule" aria-hidden />{" "}
      <span className="kp-hero__claim-text">{FIRST_LICENSED_EVIDENCE() ? t.home.heroClaimFirst : t.home.heroClaim}</span>
    </p>
  );
}

/**
 * The h1 — the question in the reader's language: "NDIO au HAPANA?" · "YES or NO?" · "是还是否？"
 * (INHERIT-MANIFEST R7(3)).
 *
 * ⭐ THE SIDE WORDS ARE THE BUTTONS' OWN WORDS BY CONSTRUCTION: `sideWord(t, …, "MARKET")` fills them,
 * so the headline cannot say "NDIYO" while the buttons say "NDIO". Each wears its outcome ink (§B2);
 * the connective ("au" / "or" / "还是") is the quiet word, one weight of the same face.
 * ⭐ TWO GROUPS THAT DO NOT BREAK INSIDE: "NDIO au" and "HAPANA?". The only break is the dict string's
 * own space after the connective (none in zh, which fits one line), so a narrow screen reads two
 * designed lines, never "NDIO" alone over "au HAPANA?".
 * ⛔ No `lang` attribute: since R7(3) the h1 IS in the page's language.
 * ⭐ A LINE THAT OPENS ON A STRAIGHT STEM IS SET BACK BY ITS SIDE BEARING (round 3, 2026-10-08): "NDIO" and "HAPANA"
 * began 3–5px right of the page's edge (0.07em of Sora 800, measured — `.kp-hero__grp[data-stem]` in globals.css), where
 * "YES" and 是 sit on it. Decided from the SIDE WORDS, so it follows the buttons' words and never a locale: a group
 * that can open a line and starts on a measured stem takes `data-stem`, and the group before a set-back one takes
 * `data-stem-next`, which gives the width back at its end — so on one line nothing between the groups moves.
 * `test:hero-copy` §2 pins `{yes}` before `{no}`, each exactly once, in every locale, and §2c the set-back; the
 * fallback below only keeps a malformed string readable.
 */
/** Capitals whose left edge is a straight stem with the bearing measured on the tiles. ⛔ Measure before adding one. */
const STEM_START = /^[HN]/u;

export function Ask({ t }: { t: Dict }) {
  const yes = sideWord(t, "YES", "MARKET");
  const no = sideWord(t, "NO", "MARKET");
  const s = t.home.heroAsk;
  const a = s.indexOf("{yes}");
  const b = s.indexOf("{no}");
  if (a < 0 || b < a) return <h1 className="kp-hero__headline">{fill(s, { yes, no })}</h1>;
  const between = s.slice(a + "{yes}".length, b);
  const conn = between.trimEnd();
  const gap = between.slice(conn.length);
  // The first group opens the h1's first line only when nothing is written before it; the second opens a line
  // whenever the h1 wraps at its gap, so it is set back whenever its word starts on a stem.
  const lead = s.slice(0, a).trim() === "" && STEM_START.test(yes);
  const next = STEM_START.test(no);
  return (
    <h1 className="kp-hero__headline">
      {s.slice(0, a)}
      <span className="kp-hero__grp" data-stem={lead ? "" : undefined} data-stem-next={next ? "" : undefined}>
        <span className="kp-hero__side" data-side="yes">{yes}</span>
        <span className="kp-hero__conn">{conn}</span>
      </span>
      {gap}
      <span className="kp-hero__grp" data-stem={next ? "" : undefined}>
        <span className="kp-hero__side" data-side="no">{no}</span>
        <span className="kp-hero__q">{s.slice(b + "{no}".length)}</span>
      </span>
    </h1>
  );
}

/**
 * The trust rows — ONE list, the same for a visitor and a player, above the featured card.
 *
 *   row 1 · 18+ · "Licensed by the Gaming Board of Tanzania."
 *   row 2 · "Deposit and withdraw with M-Pesa, Airtel Money, HaloPesa or Mixx by Yas."
 *
 * ⭐ ROW 1 IS THE FOOTER'S OWN WORDS. `footer.eighteenPlus` and `footer.licensedByGbt` are assessed
 * keys, reused verbatim. ⛔ No helpline (the owner's ruling of 2026-10-06). The gambling-warning
 * SENTENCE is not here (R7(2)): the footer keeps it on every page. The licence NUMBER stays in the
 * footer too (K39).
 * ⭐ ROW 2 NAMES ONLY WALLETS THAT PAY OUT (R8(6)). `rails` is computed on the server from the money
 * path's own definitions (`server/payout-rails.ts`) and joined by `Intl.ListFormat` in the reader's
 * language (`rail-list.ts`): the names are never typed into the dictionary, and a rail an officer has
 * paused is not named while it is paused. No rails → no row, never "Deposit and withdraw with ."
 * ⭐ WHY ABOVE THE CARD: on a phone the rows after the card and the CTAs began below the first screen,
 * so 18+ and the licence never reached it (K29, P15). In the SOURCE, not by CSS
 * `order` — keyboard and screen-reader order must match the screen (WCAG 1.3.2).
 * ⛔ No `aria-label` on the roundel: "18+" is its text, and ARIA prohibits a label on a generic span.
 * `role="list"`: WebKit drops the list role from a `ul` styled `list-style: none` (VoiceOver on iPhone).
 * ⚠️ `ul.kp-hero__trust` is read by the landing gate (V8's text map, V21) and by capture.mjs.
 */
export function TrustLines({ t, locale, rails }: { t: Dict; locale: Locale; rails: readonly string[] }) {
  const parts = railListParts(locale, rails);
  const at = t.home.heroRails.indexOf("{rails}");
  const before = at < 0 ? t.home.heroRails : t.home.heroRails.slice(0, at);
  const after = at < 0 ? "" : t.home.heroRails.slice(at + "{rails}".length);
  return (
    <ul className="kp-hero__trust" role="list">
      <li>
        <span className="kp-rg__18">{t.footer.eighteenPlus}</span>
        <span>{t.footer.licensedByGbt}</span>
      </li>
      {parts.length > 0 && (
        <li>
          <span className="kp-hero__trust-glyph" aria-hidden><I.mobileMoney s={16} /></span>
          <span>
            {before}
            {parts.map((p, i) => (p.rail ? <span key={i} className="kp-hero__rail">{p.text}</span> : p.text))}
            {after}
          </span>
        </li>
      )}
    </ul>
  );
}
