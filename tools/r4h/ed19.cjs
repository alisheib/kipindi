const { edit } = require('./ed1.cjs');
const SPAN = `<span className="font-mono text-micro uppercase tracking-[0.12em] text-text-subtle">{shownLabel}</span>`;
const PATH = `<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />`;
edit('src/components/layout/needle-drawer.tsx', [
  [`  const trigger =\n`, `  /* The account menu's two rows end alike — the state word, then the chevron — so they are drawn once (round 4 of the
     visual pass, 2026-10-09): the recipe is not written twice. \`overhang\` is the journey's row (\`menu-item\`), whose
     chevron hangs its 4.6px side bearing past the row's edge (-mr-1); the classic row's is exactly as it was. */
  const menuTail = (overhang: boolean) => (
    <>
        ${SPAN}
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className={overhang ? "-mr-1 text-text-subtle" : "text-text-subtle"}>${PATH}</svg>
    </>
  );

  const trigger =\n`],
  [`        <span className="flex-1">{t("The Needle", "Sindano", "指针玩具")}</span>
        ${SPAN}
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="text-text-subtle">${PATH}</svg>
      </button>
    ) : variant === "menu-item" ? (`, `        <span className="flex-1">{t("The Needle", "Sindano", "指针玩具")}</span>
        {menuTail(false)}
      </button>
    ) : variant === "menu-item" ? (`],
  [`        <span className="flex-1">{t("The Needle", "Sindano", "指针玩具")}</span>
        ${SPAN}
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="-mr-1 text-text-subtle">${PATH}</svg>
      </button>
    ) : variant === "hub-row" ? (`, `        <span className="flex-1">{t("The Needle", "Sindano", "指针玩具")}</span>
        {menuTail(true)}
      </button>
    ) : variant === "hub-row" ? (`],
]);
edit('scripts/design-gate/eyebrow-roles.mjs', [
  [`  // ⚠️ TWICE since round 4 of the visual pass (2026-10-09, edges E31): the journey's account menu draws the Needle row as a
  // \`menu-item\` (needle-drawer.tsx), beside the classic \`menu-row\`; the same state label in the same recipe, read the same way.
`, ``],
  [`aria-hidden=\\"tru", ["OTHER", 2]],`, `aria-hidden=\\"tru", "OTHER"],`],
]);
edit('scripts/visual-pass-r4h.test.mts', [
  [`  const svg = /<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="([^"]*)"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2\\.2"/.exec(branch);`,
   `  // The chevron is drawn once for both menu rows (\`menuTail\`); the journey's row asks for the overhang.
  const tail = /<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className=\\{overhang \\? "([^"]*)" : "([^"]*)"\\}><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2\\.2"/.exec(drawer);
  const svg = tail && /\\{menuTail\\(true\\)\\}/.test(branch) ? [tail[0], tail[1]] : null;
  ok("6.4.locate · both menu rows end with \`menuTail\`, the classic one without the overhang, its chevron's class exactly as before",
    !!tail && tail[2] === "text-text-subtle" && /variant === "menu-row" \\? \\([\\s\\S]*?\\{menuTail\\(false\\)\\}[\\s\\S]*?\\) : variant === "menu-item"/.test(drawer));`],
]);
