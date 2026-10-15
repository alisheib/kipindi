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
    frame: sheet?.getAttribute('data-frame') ?? null, title: sheet?.querySelector('h2')?.textContent?.trim() ?? null,
    signUp: signUp?.getAttribute('href') ?? null, signIn: signIn?.getAttribute('href') ?? null,
    signUpText: signUp?.textContent?.trim() ?? null, signInText: signIn?.textContent?.trim() ?? null,
    stake: stake?.value ?? null, balance: !!sheet?.querySelector('.kp-bsheet__balance'),
    place: !!sheet?.querySelector('[data-testid="journey-sheet-place"]'),
    marker, seed, dialog: rect(dialog), signUpRect: rect(signUp), signInRect: rect(signIn),
    toast: rect(toast), close: rect(sheet?.querySelector('.kp-bsheet__close')),
    chips: rect(sheet?.querySelector('.kp-bsheet__chips')),
    viewport: { width: innerWidth, height: innerHeight },
    scrollWidth: document.documentElement.scrollWidth, tapMin, controls,
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
  check('guest.no-money', !facts.balance && !facts.place);
  check('guest.doors', href(facts.signUp, '/auth/register') && href(facts.signIn, '/auth/login')
    && !!facts.signUpText && !!facts.signInText);
  if (min !== undefined) check('guest.minimum', Number(facts.stake) === min);
  check('visual.width', facts.scrollWidth <= facts.viewport.width + 1);
  check('visual.font', facts.fontLoaded);
  check('visual.targets', facts.tapMin > 0 && facts.controls.every(control => control.rect.height + 0.5 >= facts.tapMin));
  check('visual.doors-fit', !!facts.dialog && [facts.signUpRect, facts.signInRect].every(r => r
    && r.left >= facts.dialog.left - 1 && r.right <= facts.dialog.right + 1
    && r.top >= facts.dialog.top - 1 && r.bottom <= facts.dialog.bottom + 1));
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
    ['drop next on a door', { ...facts, signUp: without(facts.signUp, 'next') }],
    ...(expected.ref ? [['drop referral on a door', { ...facts, signUp: without(facts.signUp, 'ref') }]] : []),
    ['show a money action to a guest', { ...facts, place: true }],
    ['clip a door on the phone', { ...facts, signUpRect: facts.signUpRect && { ...facts.signUpRect, right: facts.dialog?.right + 12 } }],
    ['copy a forwarded stake', { ...facts, stake: String((expected.min ?? 500) + 1) }],
  ];
  return plants.map(([name, altered]) => ({ name, caught: visitorFaceErrors(altered, expected).length > 0 }));
}
