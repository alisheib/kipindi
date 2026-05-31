/* 50pick — achievement badge line-art icons.
   Same line-art language as EmptyState: viewBox 0 0 56 56, stroke=currentColor
   (the coin tints it gilt / ghosted), single --gold-400 accent via the
   `.badge-gold-accent` class so locked state can desaturate it. No fills
   except the gold accent. */

(function () {
  "use strict";

  // Inner markup only — the renderer wraps it in the <svg> with shared attrs.
  var ICONS = {
    // — Ship-now set —
    "first-prediction":
      '<circle cx="28" cy="28" r="18"/>' +
      '<line x1="20" y1="12" x2="36" y2="44"/>' +
      '<circle class="badge-gold-accent" cx="28" cy="28" r="2.4" stroke="none" fill="var(--gold-400)"/>',

    "first-win":
      '<circle cx="28" cy="23" r="13"/>' +
      '<path class="badge-gold-accent" d="M22 23 l4.5 5 l9 -11" stroke="var(--gold-400)"/>' +
      '<line x1="23" y1="35" x2="20" y2="47"/>' +
      '<line x1="33" y1="35" x2="36" y2="47"/>' +
      '<line x1="20" y1="47" x2="28" y2="42"/>' +
      '<line x1="36" y1="47" x2="28" y2="42"/>',

    "sharp":
      '<circle cx="28" cy="28" r="18"/>' +
      '<circle cx="28" cy="28" r="10.5"/>' +
      '<line x1="28" y1="6" x2="28" y2="13"/>' +
      '<line x1="28" y1="43" x2="28" y2="50"/>' +
      '<line x1="6" y1="28" x2="13" y2="28"/>' +
      '<line x1="43" y1="28" x2="50" y2="28"/>' +
      '<circle class="badge-gold-accent" cx="28" cy="28" r="3" stroke="none" fill="var(--gold-400)"/>',

    "market-maker":
      '<g transform="rotate(-32 28 26)">' +
        '<rect x="15" y="11" width="23" height="9" rx="2.5"/>' +
        '<line x1="26.5" y1="20" x2="26.5" y2="41"/>' +
      '</g>' +
      '<line class="badge-gold-accent" x1="13" y1="47" x2="40" y2="47" stroke="var(--gold-400)"/>',

    "connector":
      '<line x1="18" y1="20" x2="38" y2="20"/>' +
      '<line x1="19" y1="23" x2="26" y2="38"/>' +
      '<line x1="37" y1="23" x2="30" y2="38"/>' +
      '<circle cx="16" cy="19" r="4.5"/>' +
      '<circle cx="28" cy="41" r="4.5"/>' +
      '<circle class="badge-gold-accent" cx="40" cy="19" r="4.5" stroke="var(--gold-400)"/>',

    "verified":
      '<path d="M28 7 L44 13 V27 C44 37 37 44 28 48 C19 44 12 37 12 27 V13 Z"/>' +
      '<path class="badge-gold-accent" d="M21 27 l5 6 l11 -13" stroke="var(--gold-400)"/>',

    // — Coming-soon set —
    "hot-streak":
      '<path d="M16 40 L28 30 L40 40"/>' +
      '<path d="M16 31 L28 21 L40 31"/>' +
      '<path class="badge-gold-accent" d="M16 22 L28 12 L40 22" stroke="var(--gold-400)"/>',

    "oracle":
      '<path d="M9 28 Q28 13 47 28 Q28 43 9 28 Z"/>' +
      '<circle cx="28" cy="28" r="6"/>' +
      '<circle class="badge-gold-accent" cx="28" cy="28" r="2.4" stroke="none" fill="var(--gold-400)"/>',

    "high-roller":
      '<ellipse cx="28" cy="40" rx="13" ry="4.5"/>' +
      '<ellipse cx="28" cy="32" rx="13" ry="4.5"/>' +
      '<line x1="15" y1="32" x2="15" y2="40"/>' +
      '<line x1="41" y1="32" x2="41" y2="40"/>' +
      '<ellipse class="badge-gold-accent" cx="28" cy="22" rx="13" ry="4.5" stroke="var(--gold-400)"/>',

    "day-one":
      '<line x1="9" y1="39" x2="47" y2="39"/>' +
      '<path class="badge-gold-accent" d="M18 39 A10 10 0 0 1 38 39" stroke="var(--gold-400)"/>' +
      '<line x1="28" y1="14" x2="28" y2="19"/>' +
      '<line x1="14" y1="22" x2="17" y2="25"/>' +
      '<line x1="42" y1="22" x2="39" y2="25"/>',

    "default":
      '<circle cx="28" cy="28" r="18"/>' +
      '<path d="M22 24 q6 -8 12 0"/>' +
      '<circle class="badge-gold-accent" cx="38" cy="20" r="2.2" stroke="none" fill="var(--gold-400)"/>',
  };

  function iconSvg(id) {
    var inner = ICONS[id] || ICONS["default"];
    return (
      '<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>"
    );
  }

  window.BadgeIcons = { ICONS: ICONS, iconSvg: iconSvg };
})();
