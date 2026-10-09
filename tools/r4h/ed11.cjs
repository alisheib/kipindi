const { edit } = require('./ed1.cjs');
edit('src/components/layout/avatar-menu.tsx', [
  [`import { NeedleControlsDrawer } from "@/components/layout/needle-drawer";\n`, `import { NeedleControlsDrawer } from "@/components/layout/needle-drawer";\nimport { keepLastWords } from "@/components/ui/keep-words";\n`],
  [`  inviteVisible = false,
  invitePaid = false,
}: {`, `  inviteVisible = false,
  invitePaid = false,
  journey = false,
}: {`],
  [`  invitePaid?: boolean;
}) {
  const [open, setOpen] = useState(false);`, `  invitePaid?: boolean;
  /**
   * ⭐ THE JOURNEY'S MENU (round 4 of the visual pass, 2026-10-09, edges E31 E33), passed by \`JourneyTopBar\` alone:
   *   · /positions is "Tiketi zangu / My tickets / 我的注单" with the tab's ticket glyph — the journey's tab, the page's h1
   *     and the hub call it that, and this menu said "Nafasi / Positions / 持仓" (one page, one name: the tab's own key);
   *   · a label that wraps keeps its last two words together ("Pendekeza na" / "upate zawadi" beside INAKUJA, never
   *     "Pendekeza na upate" / "zawadi");
   *   · the Needle's row is a row of this menu (\`variant="menu-item"\`): its glyph, label and value on the rows' own 16px
   *     inset and 10px gap, its chevron's ink on their right edge, where a padded wrapper set it 8px in and 12px short.
   * ⛔ Omitted — the classic bar — everything renders as it did: the classic avatar menu is frozen chrome for S6/S7.
   */
  journey?: boolean;
}) {
  const [open, setOpen] = useState(false);`],
  [`  const rows = MENU_ROWS
    .filter((r) => (!r.proposals || proposalsState !== "DISABLED") && (!r.invite || inviteVisible))
    .map((r) =>
      r.invite && !invitePaid
        ? { ...r, en: t.profile.inviteFriends, sw: t.profile.inviteFriends, zh: t.profile.inviteFriends, accent: false }
        : r,
    );`, `  const rows = MENU_ROWS
    .filter((r) => (!r.proposals || proposalsState !== "DISABLED") && (!r.invite || inviteVisible))
    .map((r) =>
      r.invite && !invitePaid
        ? { ...r, en: t.profile.inviteFriends, sw: t.profile.inviteFriends, zh: t.profile.inviteFriends, accent: false }
        : journey && r.href === "/positions"
          ? { ...r, icon: I.ticket, en: t.journey.tabTickets, sw: t.journey.tabTickets, zh: t.journey.tabTickets }
          : r,
    );`],
  [`                  proposalsBadge={r.proposals ? proposalsState : undefined}
                />`, `                  proposalsBadge={r.proposals ? proposalsState : undefined}
                  journey={journey}
                />`],
  [`            <div className="border-t border-border px-2 py-2">
              <NeedleControlsDrawer variant="menu-row" />
            </div>`, `            {journey ? (
              <div className="border-t border-border py-1">
                <NeedleControlsDrawer variant="menu-item" />
              </div>
            ) : (
              <div className="border-t border-border px-2 py-2">
                <NeedleControlsDrawer variant="menu-row" />
              </div>
            )}`],
  [`function Item({ href, icon: Ico, en, sw, zh, accent, current, proposalsBadge }: { href: string; icon: (p: { s?: number; className?: string }) => React.ReactElement; en: string; sw: string; zh: string; accent?: boolean; current?: boolean; proposalsBadge?: ProposalsState }) {`,
   `function Item({ href, icon: Ico, en, sw, zh, accent, current, proposalsBadge, journey = false }: { href: string; icon: (p: { s?: number; className?: string }) => React.ReactElement; en: string; sw: string; zh: string; accent?: boolean; current?: boolean; proposalsBadge?: ProposalsState; journey?: boolean }) {`],
  [`        <span className={accent ? "text-gold-300" : "text-text-subtle"}><Ico s={15} /></span>
        {primary}`, `        <span className={accent ? "text-gold-300" : "text-text-subtle"}><Ico s={15} /></span>
        {/* The journey's label keeps its last two words together (\`keepLastWords\`: a two-word end of at most ~110px at
            Sora 14px, inside the row's 146px beside INAKUJA); one span, so the words stay one flex item. */}
        {journey ? <span className="min-w-0">{keepLastWords(primary)}</span> : primary}`],
]);
edit('src/components/journey/journey-top-bar.tsx', [
  [`                  invitePaid={invitePaid}
                />`, `                  invitePaid={invitePaid}
                  journey
                />`],
]);
