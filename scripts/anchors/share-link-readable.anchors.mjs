/**
 * THE ANCHORS `red:share-link-readable` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────────────
 * Ali found this one on the live product: the invite page's referral field held
 * `https://50pick.tz/auth/register?ref=QAFLC8R2` at scrollWidth 454 against clientWidth 255
 * on a phone — 44% of the link unreachable, and the unreachable 44% was the `?ref=` code.
 *
 * ⭐ THE TWO WORTH READING:
 *
 *   `back-to-a-single-line-input` — the field returns to `<Input readOnly>`. It is the
 *     tidier, more consistent-looking control, it matches every other field on the page, and
 *     an `<input>` CANNOT WRAP at any class list. The element is the bug, not the styling.
 *
 *   `fit-without-collapsing` — the auto-size drops its `height = 0` reset. `scrollHeight`
 *     never reports less than the current height, so the field grows on every observation and
 *     never comes back. It LOOKS fine on first paint and drifts taller as the window is
 *     resized — a defect no single screenshot can catch.
 *
 * ⭐ AND `control-field-renders-nothing` IS THE POSITIVE CONTROL: the field stops being fed
 *   the link. An empty control is never clipped, so every geometry assertion passes HARDER
 *   over a referral box with no referral link in it.
 *
 * ⚠️ SINGLE-LINE ANCHORS where possible (CRLF tree); no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const INVITE = "src/app/profile/invite/invite-client.tsx";
const SHARE = "src/components/markets/share-button.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "back-to-a-single-line-input",
    why: "⭐ THE TIDY-LOOKING REGRESSION. The field returns to the shared single-line control, matching every other field on the page — and an `<input>` cannot wrap at any class list, so the link is clipped again with nothing in the markup looking wrong",
    file: INVITE,
    suite: "share-link-readable",
    from: `    <textarea\n      ref={ref}\n      readOnly`,
    to: `    <input\n      ref={ref as never}\n      readOnly`,
    expect: "1: ⛔ the referral link is a <textarea>, not a single-line <input>",
  },
  {
    name: "word-wrap-instead-of-break-all",
    why: "`break-all` is dropped for the default wrap. A URL contains no spaces, so the browser keeps the whole string on one line and the textarea SCROLLS instead of wrapping — the identical defect inside a taller box",
    file: INVITE,
    suite: "share-link-readable",
    from: `text-text break-all brand-focus`,
    to: `text-text brand-focus`,
    expect: "1: ⛔ …and it breaks a URL, which has no spaces to wrap at",
  },
  {
    name: "fit-without-collapsing",
    why: "⭐ the auto-size loses its `height = 0` reset. `scrollHeight` never reports less than the current height, so every observation grows the field and none ever shrinks it. First paint looks perfect and the box creeps taller as the window is resized — a defect no single screenshot can catch",
    file: INVITE,
    suite: "share-link-readable",
    from: `      el.style.height = "0px";\n      el.style.height = \`\${el.scrollHeight}px\`;`,
    to: `      el.style.height = \`\${el.scrollHeight}px\`;`,
    expect: "2: ⛔ …and it collapses before measuring, or the field can only ever grow",
  },
  {
    name: "measured-once-on-mount",
    why: "the ResizeObserver goes and the field is sized once. It is correct at the width it first rendered at and wrong at every other — rotate a phone, or open the drawer that narrows the column, and the link is clipped again",
    file: INVITE,
    suite: "share-link-readable",
    from: `    const ro = new ResizeObserver(fit);`,
    to: `    const ro = { observe() {}, disconnect() {} };`,
    expect: "2: …re-measuring on every width change, not once on mount",
  },
  {
    name: "dialog-truncates-again",
    why: "the share dialog's link line goes back to `truncate` — a clipped link wearing an ellipsis. It measured NOT clipped at 393/768/1440 today, which is exactly why a guard is the only thing that will notice when a longer URL arrives",
    file: SHARE,
    suite: "share-link-readable",
    from: `<span className="block font-mono text-[11px] text-text-subtle break-all">`,
    to: `<span className="block font-mono text-[11px] text-text-subtle truncate max-w-full">`,
    expect: "3: ⛔ the dialog's link line no longer truncates",
  },
  {
    name: "flex-column-floor-restored",
    why: "`min-w-0` is dropped from the text column. A flex child defaults to `min-width: auto`, so an unbreakable URL becomes the column's FLOOR and pushes the tile wider than the dialog it lives in — the mechanism, rather than the symptom",
    file: SHARE,
    suite: "share-link-readable",
    from: `                <span className="min-w-0">`,
    to: `                <span>`,
    expect: "3: ⚠️ the text column may shrink below its content (min-w-0)",
  },
  {
    name: "plate-yields-instead",
    why: "`shrink-0` is dropped from the 36px plate, so the icon squashes instead of the text column wrapping. The link fits, the guard about the link passes, and the control beside it is silently deformed",
    file: SHARE,
    suite: "share-link-readable",
    // ⚠️ IT DELETES `shrink-0`. A first version APPENDED a class instead and the gate stayed
    // green — correctly, because the declaration it asserts was still there. §5 trap: a
    // mutation must remove what it claims to remove, or it proves nothing and says so.
    from: `h-[36px] w-[36px] shrink-0 items-center justify-center rounded-md bg-bg-overlay`,
    to: `h-[36px] w-[36px] items-center justify-center rounded-md bg-bg-overlay`,
    expect: "3: ⚠️ …and the 36px plate beside it may not (shrink-0)",
  },
  {
    name: "control-field-renders-nothing",
    why: "⭐ THE POSITIVE CONTROL. The field stops being fed the link. An empty control is never clipped, so every geometry assertion — offline and on production — passes HARDER over a referral box with no referral link in it",
    file: INVITE,
    suite: "share-link-readable",
    from: `<LinkField value={link} label={t.profile.yourReferralLink} />`,
    to: `<LinkField value="" label={t.profile.yourReferralLink} />`,
    expect: "1: ⭐ POSITIVE CONTROL — the control is fed the real link",
  },
];
