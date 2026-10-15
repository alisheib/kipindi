/** S10 WP8a: browser facts and page-only red controls for the visitor's guest sheet. */

/** Serializable into Playwright's page.evaluate; reads the actual drawn face and tab marker. */
export function visitorFaceFacts() {
  const sheet = document.querySelector('[data-testid="journey-bet-sheet"]');
  const dialog = sheet?.closest('[role="dialog"]');
  const signUp = sheet?.querySelector('[data-testid="journey-sheet-signup"]');
  const signIn = sheet?.querySelector('[data-testid="journey-sheet-signin"]');
  const stake = sheet?.querySelector('[data-testid="journey-sheet-stake"]');
  const box = document.querySelector('[data-sheet] a[data-bet-side]')?.closest('[data-sheet]');
  const seed = (() => { try { return JSON.parse(box?.getAttribute('data-sheet') ?? 'null'); } catch { return null; } })();
  const rect = node => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  };
  const roots = getComputedStyle(document.documentElement);
  const tapMin = Number.parseFloat(roots.getPropertyValue('--tap-min')) || 0;
  const token = name => Number.parseFloat(roots.getPropertyValue(name)) || 0;
  const style = node => node ? getComputedStyle(node) : null;
  const panel = sheet?.closest('.kp-bsheet');
  const shell = sheet?.querySelector('.kp-bsheet__shell') ?? sheet;
  const header = sheet?.querySelector('.kp-bsheet__header');
  const scroll = sheet?.querySelector('.kp-bsheet__scroll');
  const footer = sheet?.querySelector('.kp-bsheet__footer');
  const titleNode = sheet?.querySelector('.kp-bsheet__title');
  const estimate = sheet?.querySelector('.kp-bsheet__estimate');
  const chip = sheet?.querySelector('.kp-bsheet__chosen, .kp-bsheet__header .chip');
  const controls = [...(sheet?.querySelectorAll('a,button,input') ?? [])].filter(node => {
    const style = getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden' && rect(node)?.width > 0;
  }).map(node => ({ name: node.getAttribute('data-testid') ?? node.getAttribute('aria-label') ?? node.tagName,
    rect: rect(node), font: getComputedStyle(node).fontFamily }));
  const toast = [...document.querySelectorAll('.mat-toast')].find(node => rect(node)?.height > 0);
  let marker = null;
  try { marker = sessionStorage.getItem('kp-pending-bet'); } catch {}
  return {
    path: location.pathname + location.search, guest: sheet?.hasAttribute('data-guest') ?? false,
    sheetCount: document.querySelectorAll('[data-testid="journey-bet-sheet"]').length,
    frame: sheet?.getAttribute('data-frame') ?? null, title: sheet?.querySelector('h2')?.textContent?.trim() ?? null,
    signUp: signUp?.getAttribute('href') ?? null, signIn: signIn?.getAttribute('href') ?? null,
    signUpText: signUp?.textContent?.trim() ?? null, signInText: signIn?.textContent?.trim() ?? null,
    stake: stake?.value ?? null, balance: !!sheet?.querySelector('.kp-bsheet__balance'),
    place: !!sheet?.querySelector('[data-testid="journey-sheet-place"]'),
    marker, seed, dialog: rect(dialog), signUpRect: rect(signUp), signInRect: rect(signIn),
    toast: rect(toast), close: rect(sheet?.querySelector('.kp-bsheet__close')),
    chips: rect(sheet?.querySelector('.kp-bsheet__chips')),
    viewport: { width: innerWidth, height: innerHeight },
    scrollWidth: document.documentElement.scrollWidth, sheetOverflow: sheet ? sheet.scrollWidth - sheet.clientWidth : null,
    tapMin, controls, chip: chip ? { text: chip.textContent?.trim(), variant: chip.getAttribute('data-kit-chip-variant') } : null,
    labelClipped: !!signUp && (signUp.scrollWidth > signUp.clientWidth + 1 || signUp.scrollHeight > signUp.clientHeight + 1),
    tokens: {
      sp1: token('--sp-1'), sp2: token('--sp-2'), sp3: token('--sp-3'), sp4: token('--sp-4'), sp5: token('--sp-5'),
      h3: token('--type-h3'), controlLg: token('--h-control-lg'), controlXl: token('--h-control-xl'),
    },
    geometry: {
      panelTop: Number.parseFloat(style(panel)?.paddingTop), panelInline: Number.parseFloat(style(panel)?.paddingLeft),
      shellGap: Number.parseFloat(style(shell)?.gap), headerGap: Number.parseFloat(style(header)?.gap),
      scrollGap: Number.parseFloat(style(scroll)?.gap), scrollPad: Number.parseFloat(style(scroll)?.paddingTop),
      footerGap: Number.parseFloat(style(footer)?.gap), chipsGap: Number.parseFloat(style(sheet?.querySelector('.kp-bsheet__chips'))?.gap),
      estimatePadding: Number.parseFloat(style(estimate)?.paddingTop),
      titleSize: Number.parseFloat(style(titleNode)?.fontSize),
      titleFont: style(titleNode)?.fontFamily ?? null, stakeFont: style(stake)?.fontFamily ?? null,
      signUpFont: style(signUp)?.fontFamily ?? null, signUpMin: Number.parseFloat(style(signUp)?.minHeight),
      signInMin: Number.parseFloat(style(signIn)?.minHeight),
    },
    fontLoaded: document.fonts.status === 'loaded',
  };
}

export function visitorFaceErrors(facts, { min, next, ref, invite } = {}) {
  const errors = [];
  const check = (name, pass) => { if (!pass) errors.push(name); };
  const href = (value, route) => {
    try {
      const url = new URL(value, 'http://localhost');
      return url.origin === 'http://localhost' && url.pathname === route && url.searchParams.get('next') === next
        && (ref === undefined || url.searchParams.get('ref') === ref)
        && (invite === undefined || url.searchParams.get('invite') === invite);
    } catch { return false; }
  };
  check('guest.frame', facts.guest && facts.frame !== null);
  check('guest.one-sheet', facts.sheetCount === 1);
  check('guest.no-money', !facts.balance && !facts.place);
  check('guest.doors', href(facts.signUp, '/auth/register') && href(facts.signIn, '/auth/login')
    && !!facts.signUpText && !!facts.signInText);
  if (min !== undefined) check('guest.minimum', Number(facts.stake) === min);
  check('visual.width', facts.scrollWidth <= facts.viewport.width + 1);
  check('visual.sheet-width', facts.sheetOverflow !== null && facts.sheetOverflow <= 1);
  check('visual.font', facts.fontLoaded);
  check('visual.side', !!facts.chip?.text && ['yes', 'no'].includes(facts.chip.variant));
  check('visual.label', !facts.labelClipped);
  check('visual.targets', facts.tapMin > 0 && facts.controls.every(control => control.rect.height + 0.5 >= facts.tapMin));
  check('visual.doors-fit', !!facts.dialog && [facts.signUpRect, facts.signInRect].every(r => r
    && r.left >= facts.dialog.left - 1 && r.right <= facts.dialog.right + 1
    && r.top >= facts.dialog.top - 1 && r.bottom <= facts.dialog.bottom + 1));
  const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1;
  const t = facts.tokens ?? {}, g = facts.geometry ?? {};
  check('visual.tokens', near(g.panelTop, facts.viewport.width >= 1024 ? t.sp5 : t.sp3)
    && near(g.panelInline, t.sp5) && near(g.shellGap, t.sp3) && near(g.headerGap, t.sp2)
    && near(g.scrollGap, t.sp3) && near(g.scrollPad, t.sp1) && near(g.footerGap, t.sp2)
    && near(g.chipsGap, t.sp2) && (!Number.isFinite(g.estimatePadding) || near(g.estimatePadding, t.sp4))
    && near(g.titleSize, t.h3)
    && facts.signUpRect?.height + 1 >= t.controlXl && facts.signInRect?.height + 1 >= t.controlLg);
  check('visual.faces', /Sora/i.test(g.titleFont ?? '') && /JetBrains Mono/i.test(g.stakeFont ?? '')
    && /Inter/i.test(g.signUpFont ?? ''));
  return errors;
}

export function overlaps(a, b) {
  return !!a && !!b && Math.min(a.right, b.right) > Math.max(a.left, b.left)
    && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
}

/** The controls mutate a browser fact, never a source file, and must make the real verdict red. */
export function visitorPageControls(facts, expected) {
  const without = (value, key) => {
    const url = new URL(value, 'http://localhost');
    url.searchParams.delete(key);
    return url.pathname + url.search;
  };
  const plants = [
    ['drop next on a door', { ...facts, signUp: without(facts.signUp, 'next') }, 'guest.doors'],
    ...(expected.ref ? [['drop referral on a door', { ...facts, signUp: without(facts.signUp, 'ref') }, 'guest.doors']] : []),
    ['show a money action to a guest', { ...facts, place: true }, 'guest.no-money'],
    ['clip a door on the phone', { ...facts, signUpRect: facts.signUpRect && { ...facts.signUpRect, right: facts.dialog?.right + 12 } }, 'visual.doors-fit'],
    ['copy a forwarded stake', { ...facts, stake: String((expected.min ?? 500) + 1) }, 'guest.minimum'],
    ['open a second sheet', { ...facts, sheetCount: 2 }, 'guest.one-sheet'],
  ];
  // A broken baseline must never let unrelated defects make every red plant appear caught.
  const baseline = visitorFaceErrors(facts, expected);
  return plants.map(([name, altered, error]) => ({
    name, caught: baseline.length === 0 && visitorFaceErrors(altered, expected).includes(error),
  }));
}
