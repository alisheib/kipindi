// Draft (to merge into scripts/maswali-register-shots.mjs after the data): the register's two drawings, band by band.
// ── The register's two loading drawings, caught on the way in (S5-R2-REGISTER 21) ───────────────────────────────────────
// The index from How (its own drawing, `[data-ghost-page="register"]`, comes after the hub's until the hub's loading file
// picks — `qa:millionea-ghost-hops` judges WHICH drawing is up), and a week's from the index (the register segment's loading
// picks it, commit 18). Each band where the page puts it and as tall, within 1px — the head, the first section's top, its
// first row; a week's back link, head, the ledger's heading and its card's top. The rows' and the ledger's own heights
// depend on what each week holds, which a wordless drawing cannot know: printed for the record.
const REG_BANDS = (which, drawing) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), h: Math.round(r.height * 10) / 10 }; };
  if (which === "index") {
    if (drawing) {
      const g = document.querySelector('[aria-busy="true"][data-ghost-page="register"]');
      return { head: box(g?.querySelector('[data-ghost="head"]')), running: box(g?.querySelector('[data-ghost="running"]')),
        row: box(g?.querySelector('[data-ghost="running"] > div > div:first-child')) };
    }
    const p = document.querySelector('[data-testid="millionea-register"]');
    return { head: box(p?.querySelector(":scope > div:first-child")), running: box(document.querySelector('[data-testid="millionea-register-running"]')),
      row: box(document.querySelector('[data-testid="millionea-register-running"] li:first-child')) };
  }
  if (drawing) {
    const g = document.querySelector('[aria-busy="true"][data-ghost-page="week"]');
    return { back: box(g?.children[0]), head: box(g?.children[1]), ledger: box(g?.querySelector('[data-ghost="ledger"]')),
      card: box(g?.querySelector('[data-ghost="ledger"] > :last-child')) };
  }
  const p = document.querySelector('[data-testid="millionea-register-week"]');
  return { back: box(p?.children[0]), head: box(p?.children[1]), ledger: box(document.querySelector('section[aria-labelledby="mln-reg-ledger"]')),
    card: box(document.querySelector('section[aria-labelledby="mln-reg-ledger"] > div')) };
};
