"use client";

/**
 * THE DESIGNATE WIZARD'S TWO TYPED SURFACES — the account picker, and the consent/review form
 * (C7-SPEC rulings 387, 388, 412; owner rulings D5, D19).
 *
 * ⛔ **NOT ONE SENTENCE ABOUT THE FEATURE IS WRITTEN HERE** (ruling 388, whose Proof is "no console client file
 * contains a string literal of 25+ characters that is not a prop name, class name, aria string or event name").
 * Every word the server can say about an account arrives as a prop or as a returned string. Ruling 385 measured
 * why that is not a style: most of the sentences this console can emit carry NO vocabulary word at all, so one
 * typed into a client component would ship to every visitor with `test:house-bot-disclosure` 1.1 and
 * `verify:house-bot-bundle` both reporting clean. 🔴 AND THE FIRST DRAFT OF THIS FILE DID EXACTLY THAT: the
 * consent step typed its four sentences here, and they went verbatim into a publicly downloadable chunk. The one
 * sentence this file still owns is the TRANSPORT failure, which the server could not word because the request
 * never reached it.
 *
 * ⛔ **NOTHING HOUSE REACHES THIS FILE** (rulings 384, 401): no import from `@/lib/house-bot/**`,
 * `@/lib/server/house-bot/**`, the DAL or the gate module — by value OR by type — and none from `@/lib/utils`,
 * whose date helpers pull server platform config into a chunk (trap E-322). Both actions arrive as PROPS, because
 * `test:admin-act-gate`'s population is every client file under `src/app/admin` that imports an actions module, and
 * on an Owner-only route a `useMayAct()` consultation would be a branch that can never be false.
 *
 * ⛔ **THE HOLDER'S PASSWORD IS TYPED HERE AND KEPT NOWHERE** (owner ruling D5; 02 §2.7). It lives in React state
 * while the review step is open, goes into one request, and is cleared on every exit — including the refusal path,
 * where a wrong password must not sit on screen waiting to be sent again by a stray Enter. It is never part of
 * `dirty`, so it is never what an unsaved-changes prompt is protecting.
 *
 * @see src/app/admin/desk/new/actions.ts · src/lib/server/house-console-read.ts
 */
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useDeferredToast } from "@/components/ui/toast";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";

/**
 * One option the picker can offer. ⛔ Declared HERE, structurally, rather than imported from the gate module: a type
 * import's SPECIFIER survives in this file's source, and ruling 384 refuses a house-module specifier in a client
 * file in ANY import form. The page passes the server's own objects, so `tsc` still ties the two together.
 */
export type DeskPickerRow = { userId: string; handle: string; href: string; reason: string | null };
export type DeskPickerAnswer = { rows: DeskPickerRow[]; note: string | null; count: string };

/** Every sentence the two typed steps paint, built on the server (ruling 388). Declared structurally, as above. */
export type DeskWizardCopy = {
  consentTitle: string;
  consentBullets: readonly string[];
  labelLabel: string;
  labelHint: string;
  noteLabel: string;
  noteHint: string;
  reviewTitle: string;
  passwordLabel: string;
  passwordHint: string;
  refusedTitle: string;
  wayOut: string;
};

/** ⛔ THE ONE SENTENCE ABOUT THE TRANSPORT, and it names no state, no figure and no feature: the server cannot word
 *  a failure that never reached it. */
const TRANSPORT_FAILURE = "That did not reach the server. Nothing changed — try again.";

/**
 * A fresh idempotency nonce for ONE submission attempt.
 *
 * 🔴 THE DEFECT THIS EXISTS FOR, AND IT BRICKED THE CONTROL (C7 step 6 review, the blocker both lenses found).
 * The wizard sent `${userId}:${label}` — a value the officer RETYPES, identical on every attempt — and the service
 * claims a `submitId` ONCE, durably, in a table with a 30-day retention, BEFORE the password is checked and with no
 * failure path that gives it back. So the first wrong password (the expected outcome when a holder is reading their
 * password out loud) burned the key for good: every later attempt for that account and that name answered
 * DUPLICATE_SUBMIT — "That was already sent — wait for its answer." — for an answer that could never come, on a
 * live money platform's admission control. The claim exists to stop a DOUBLE TAP of one press, which is a property
 * of the press and not of what was typed into it.
 * ⚠️ `randomUUID` needs a secure context (https, or localhost); the fallback is not a security value, it is an
 * idempotency key, so a time-plus-random string is exactly as good where the API is absent.
 */
const newAttemptNonce = (): string => {
  const c = typeof globalThis.crypto === "object" ? globalThis.crypto : null;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

/**
 * THE ACCOUNT PICKER (ruling 412's UserPicker clause, and ruling 387's gated lookup).
 *
 * ⛔ AN IN-FLOW LISTBOX: no portal, no scroll box of its own, at most the ten options the server sends, each at
 * least 44px tall, and an option that cannot be chosen carries `aria-disabled` with its reason wrapped beneath it
 * rather than a tooltip nobody on a phone can open.
 * ⛔ AND IT IS THE WHOLE PATTERN, NOT ITS ROLES (C7 step 6 review, d19-hunt-09). It declared a combobox owning a
 * listbox and implemented neither half: the options CONTAINED an interactive `<button>` (an `option` may not hold
 * interactive content), the input carried no `aria-activedescendant` and no arrow keys, and `aria-controls` pointed
 * at an id that left the DOM whenever there were no rows. A screen-reader user was announced a listbox whose
 * options could not be traversed. The options are now the controls — focus stays in the field, the active option is
 * named by id, and Arrow/Enter/Escape do what the pattern says they do.
 * ⛔ THE EMPTY ANSWER IS THE SERVER'S OWN SENTENCE, and it is the SAME sentence a refused caller receives (387(c)) —
 * so this file cannot reveal, by what it paints, whether a query matched anything.
 * ⛔ NO PHONE AND NO EMAIL IN AN OPTION. The phone belongs to the check card, where the platform's own SERVER gate
 * decides whether this viewer may see it at all (359).
 */
export function DeskAccountPicker({
  find,
  searchLabel,
  searchHint,
  listLabel,
}: {
  find: (query: string) => Promise<DeskPickerAnswer>;
  searchLabel: string;
  searchHint: string;
  listLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<DeskPickerAnswer | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, start] = useTransition();
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  /* ⛔ THE LOOKUP IS DEBOUNCED, AND THE BUCKET IS ON THE CALLER (387(e)): a request per keystroke would spend an
     officer's own allowance on their own typing. ⚠️ The latest answer wins — an earlier, slower reply must never
     overwrite a later one, so each run checks that its own query is still the one on screen. */
  useEffect(() => {
    const q = query;
    const t = setTimeout(() => {
      start(async () => {
        try {
          const got = await find(q);
          setFailed(false);
          setAnswer(q === "" ? null : got);
        } catch {
          setFailed(true);
          setAnswer(null);
        }
        setActive(-1);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query, find]);

  const rows = answer?.rows ?? [];
  const optionId = (i: number) => `${listId}-o${i}`;
  const choosable = rows.map((r, i) => (r.reason === null ? i : -1)).filter((i) => i >= 0);

  /* ⛔ THE KEYBOARD MOVES BETWEEN THE OPTIONS THAT CAN BE CHOSEN, and never lands on one that cannot: an active
     descendant a reader is told about but cannot act on is the same dead end as a disabled control with no reason. */
  const step = useCallback((dir: 1 | -1) => {
    if (choosable.length === 0) return;
    const at = choosable.indexOf(active);
    const next = at < 0 ? (dir === 1 ? 0 : choosable.length - 1) : (at + dir + choosable.length) % choosable.length;
    setActive(choosable[next]);
  }, [active, choosable]);

  const choose = (r: DeskPickerRow) => { if (r.reason === null) router.push(r.href as never); };

  return (
    <div className="space-y-3">
      <Field label={searchLabel} hint={searchHint}>
        <Input
          ref={inputRef}
          size="md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          role="combobox"
          aria-expanded={rows.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 && rows[active] ? optionId(active) : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); step(1); }
            else if (e.key === "ArrowUp") { e.preventDefault(); step(-1); }
            else if (e.key === "Enter" && active >= 0 && rows[active]) { e.preventDefault(); choose(rows[active]); }
            else if (e.key === "Escape") { setActive(-1); }
          }}
          trailing={pending ? <Spinner /> : undefined}
        />
      </Field>

      {/* 412 · a polite live count, and it says the one fact a reader cannot get by counting the rows: how many of
          what is on screen cannot be chosen, and whether there are more than the ten it may show.
          ⛔ Empty for a refused caller AND for a search that found nothing.
          ⛔ AND IT OCCUPIES NO SPACE WHEN IT SAYS NOTHING (C7 step 6 review, visual-12) — the node stays mounted,
          because a live region that is added to the DOM does not announce. */}
      <p className={`text-body-sm text-text-subtle ${answer?.count ? "" : "sr-only"}`} aria-live="polite">{answer?.count ?? ""}</p>

      {failed && (
        <p className="text-body-sm text-danger-fg" role="alert">{TRANSPORT_FAILURE}</p>
      )}

      {answer?.note != null && rows.length === 0 && (
        <p className="text-body-sm text-text-secondary">{answer.note}</p>
      )}

      {/* ⛔ THE LIST IS ALWAYS IN THE DOM so `aria-controls` never dangles — it is hidden when it is empty. */}
      <ul
        id={listId}
        role="listbox"
        aria-label={listLabel}
        hidden={rows.length === 0}
        className="rounded-md border border-border-subtle divide-y divide-border-subtle"
      >
        {rows.map((r, i) => {
          const blocked = r.reason !== null;
          return (
            <li
              key={r.userId}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              aria-disabled={blocked || undefined}
              onClick={() => choose(r)}
              /* ⛔ THE 44px RUNG, NOT THE 40px TAP FLOOR (ruling 412 names 44 for this option by number). It sat on
                 the tap token and rendered ≥44 only by accident of its padding, which is not a declared floor. */
              className={`min-h-[var(--h-control-md)] px-3 py-2 flex flex-col justify-center ${blocked ? "text-text-subtle" : "cursor-pointer hover:bg-bg-overlay hover:text-brand-300"}`}
            >
              <span className={`block font-mono text-body-sm tabular-nums ${blocked ? "" : "text-text"}`}>{r.handle}</span>
              {blocked && (
                /* ⛔ THE REASON WRAPS BENEATH THE OPTION, never a `title` — the select atom's own hint rule.
                   ⛔ `text-body-sm` (13px), NOT `text-caption` (11px): §T4's reading floor is 12.5px and
                   `test:type-scale` §3 counts every sub-floor prose site into a ratchet that may only shrink.
                   ⛔ AND ONE STEP DOWN IN INK from the handle it explains (C7 step 6 review, visual-14): both
                   lines were the same size AND the same ink, so the pair read as one two-line label rather than
                   as a value and the gloss under it. */
                <span className="block text-body-sm text-text-faint">{r.reason}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** What the designation posts and what it gets back — declared structurally, for ruling 384's reason above. */
type DesignateResult =
  | { ok: true; href: string; note: string; warn?: boolean }
  | { ok: false; error: string; field?: "label" | "note" | "password"; href?: string };

/**
 * THE CONSENT AND REVIEW STEPS (rulings 388, 412).
 *
 * ⛔ ONE COMPONENT FOR BOTH, AND IT IS LOAD-BEARING. The step lives in the URL so Back steps back, and the name and
 * purpose live in this component's own state; two separate mount points would throw away what the officer typed on
 * the push between them.
 * ⛔ THE PASSWORD IS ASKED FOR ON THE SCREEN THAT SUBMITS, and nowhere else. Carrying it across a navigation would
 * mean holding somebody else's password in a component that outlives the decision to use it.
 * ⛔ A REFUSAL LANDS ON THE FIELD THAT CAUSED IT, ON THE STEP THAT OWNS IT (ruling 412, and its `focusFirstInvalid`
 * result union). 🔴 It did neither: a name of one character armed Continue (the server floor is two), and the
 * refusal came back on the REVIEW step naming `label` — a field that step does not render — so the officer got a
 * toast and an otherwise unchanged screen with nothing to correct.
 * ⛔ `UnsavedChangesGuard` GUARDS THE TYPED WORK, not the password: the guard exists so a click on the sidebar does
 * not silently discard a name and a purpose, and a password is worth nothing once the page is left.
 */
export function DeskDesignateForm({
  phase,
  userId,
  handle,
  consentHref,
  reviewHref,
  checkHref,
  labelMin,
  labelMax,
  noteMax,
  copy,
  designate,
}: {
  phase: "consent" | "review";
  userId: string;
  handle: string;
  consentHref: string;
  reviewHref: string;
  checkHref: string;
  labelMin: number;
  labelMax: number;
  noteMax: number;
  copy: DeskWizardCopy;
  designate: (input: { userId: string; label: string; note?: string; password: string; submitId?: string }) => Promise<DesignateResult>;
}) {
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [wayOut, setWayOut] = useState<string | null>(null);
  const [focusWanted, setFocusWanted] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const headingId = useId();
  const panelRef = useRef<HTMLElement>(null);
  /** ⛔ ONE NONCE PER ARMED ATTEMPT — see `newAttemptNonce` for the defect it closes. */
  const attempt = useRef<string>("");

  /* ⛔ THE PASSWORD NEVER SURVIVES A STEP CHANGE. Stepping back to the consent screen drops it, so it cannot sit in
     memory behind a screen that is not asking for it. */
  useEffect(() => {
    if (phase !== "review") setPassword("");
  }, [phase]);

  /* ⛔ AND THE REFUSAL FOLLOWS THE OFFICER TO THE FIELD (412's result union, handled). When the field the server
     named is not rendered yet — the push to the consent step has been asked for but has not landed — the want is
     KEPT and the effect runs again when the phase changes. A helper that returns `not-rendered` and is ignored is
     the historical defect its own header names. */
  useEffect(() => {
    if (focusWanted === null) return;
    const landed = focusFirstInvalid(panelRef.current, [focusWanted]);
    if (landed.ok || landed.reason !== "not-rendered") setFocusWanted(null);
  }, [focusWanted, phase]);

  const dirty = label.trim().length > 0 || note.trim().length > 0;
  const named = label.trim().length >= labelMin;
  const armed = named && (phase !== "review" || password.length > 0);

  const submit = () => {
    if (pending || !armed) return;
    setError(null);
    setField(null);
    setWayOut(null);
    if (attempt.current === "") attempt.current = newAttemptNonce();
    start(async () => {
      let result: DesignateResult;
      try {
        result = await designate({ userId, label, note, password, submitId: attempt.current });
      } catch {
        result = { ok: false, error: TRANSPORT_FAILURE };
      }
      if (!result.ok) {
        /* ⛔ THE REFUSAL STAYS ON THE SCREEN THAT CAUSED IT — closing or navigating would throw away what the
           officer typed and leave them to write it again to find out whether the second attempt is refused too.
           The PASSWORD still goes, every time.
           ⛔ AND THE NONCE IS SPENT: a refusal wrote nothing, so the next attempt is a NEW press and must not be
           refused as a repeat of this one. */
        attempt.current = "";
        setError(result.error);
        setField(result.field ?? null);
        setWayOut(result.href ?? null);
        setPassword("");
        if (result.field === "label" || result.field === "note") router.push(consentHref as never);
        setFocusWanted(result.field ?? null);
        toast({ title: copy.refusedTitle, description: result.error, variant: "danger" });
        return;
      }
      setPassword("");
      /* ⛔ A DESIGNATION THAT LANDED WITHOUT ITS COMPLIANCE ROW SAYS BOTH (replan rulings 537, 543). The account IS on
         the desk, so it is never a failure; the server owns the sentence and whether it is a warning. */
      deferToast({ title: "On the desk", description: result.note, variant: result.warn ? "warning" : "success" });
      router.push(result.href as never);
    });
  };

  /* ⛔ A SENTENCE WITH NO FIELD TO SIT ON IS STILL SAID (C7 step 6 review, conformance-412). It renders whenever the
     step that owns the named field is not the step on screen — otherwise a `label` refusal arriving on the review
     step changed nothing an officer could see. ⚠️ `href` is painted where it is sent (d19-hunt-11): the designation
     door returns the way to the account already on the desk, and a record id crossing the boundary for a control
     that ignores it is a leak with no reader. */
  const ownedHere = field === null
    ? false
    : phase === "review" ? field === "password" : field === "label" || field === "note";
  const loose = error !== null && !ownedHere;

  const looseNotice = loose ? (
    <p className="text-body-sm text-danger-fg" role="alert">
      {error}
      {wayOut !== null && (
        <>
          {" "}
          <Link href={wayOut as never} className="underline underline-offset-2 hover:text-brand-200">{copy.wayOut}</Link>
        </>
      )}
    </p>
  ) : null;

  return (
    <>
      <UnsavedChangesGuard dirty={dirty && !pending} />

      {phase === "consent" && (
        /* ⛔ THE CARD'S OWN HEADING RUNG, NOT THE KIT'S DIALOG RUNG (C7 step 6 review, visual-4). These two panels
           were hand-rolled with the display size every MODAL title in this section uses, so the heading visibly
           changed size halfway through a four-step flow — and the give-away was a heading id that nothing pointed
           at. The section labels the panel now, and the rung is `AdminCard`'s own. */
        <section ref={panelRef} aria-labelledby={headingId} className="glass-panel p-4 space-y-4">
          <h2 id={headingId} className="font-display font-semibold text-body-sm text-text leading-tight">{copy.consentTitle}</h2>
          {/* ⛔ EVERY SENTENCE HERE IS THE SERVER'S (388). */}
          <ul className="space-y-2 text-body-sm text-text-secondary max-w-[60ch] list-disc pl-5">
            {copy.consentBullets.map((line) => <li key={line}>{line}</li>)}
          </ul>
          {/* ⛔ ONE LABEL, ONE LOOK — AND IT TOOK A TILE TO SEE IT (ops-lane visual pass, 2026-09-20, read at all
              six mandatory widths). This step painted `Account <handle>` as one line of sentence-case prose while
              the step BEFORE it (`page.tsx`'s check panel, the same eyebrow pair) and the step AFTER it (the review
              `<dl>` below, line-for-line identical markup) both paint the IDENTICAL label and value as the kit's
              term/definition pair. Three consecutive steps of one wizard, one label, two looks — the exact defect
              this section was pulled up on once already, and no suite could see it: §5.6 reads the words, §5.4 the
              tap targets, and neither reads which RUNG a label is set on. The value's own treatment is unchanged
              (`font-mono`, body-sm); only the label joins the two steps around it. */}
          <dl>
            <div>
              <dt className="font-mono text-micro eyebrow uppercase text-text-tertiary">Account</dt>
              <dd className="font-mono text-body-sm text-text">{handle}</dd>
            </div>
          </dl>

          <Field label={copy.labelLabel} hint={copy.labelHint} dataField="label" error={field === "label" ? error ?? undefined : undefined}>
            <Input
              size="md"
              value={label}
              maxLength={labelMax}
              onChange={(e) => setLabel(e.target.value)}
              autoComplete="off"
              disabled={pending}
            />
          </Field>

          <Field label={copy.noteLabel} hint={copy.noteHint} dataField="note" error={field === "note" ? error ?? undefined : undefined}>
            <Textarea
              value={note}
              rows={3}
              maxLength={noteMax}
              onChange={(e) => setNote(e.target.value)}
              disabled={pending}
            />
          </Field>

          {looseNotice}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button type="button" size="md" variant="ghost" onClick={() => router.push(checkHref as never)}>Back</Button>
            {/* ⛔ ARMED ON THE SERVER'S OWN FLOOR, not on "anything at all" (412). It armed at one character while
                `validateLabel` refuses below two, so the only way to learn the rule was to be refused by it on a
                later step. */}
            <Button type="button" size="md" variant="primary" disabled={!named} onClick={() => router.push(reviewHref as never)}>Continue</Button>
          </div>
        </section>
      )}

      {phase === "review" && (
        <section ref={panelRef} aria-labelledby={headingId} className="glass-panel p-4 space-y-4">
          <h2 id={headingId} className="font-display font-semibold text-body-sm text-text leading-tight">{copy.reviewTitle}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <dt className="font-mono text-micro eyebrow uppercase text-text-tertiary">Account</dt>
              <dd className="font-mono text-body-sm text-text">{handle}</dd>
            </div>
            <div>
              <dt className="font-mono text-micro eyebrow uppercase text-text-tertiary">Name on the desk</dt>
              <dd className="text-body-sm text-text">{label.trim() || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-mono text-micro eyebrow uppercase text-text-tertiary">Why</dt>
              <dd className="text-body-sm text-text">{note.trim() || "—"}</dd>
            </div>
          </dl>

          <Field
            label={copy.passwordLabel}
            hint={copy.passwordHint}
            dataField="password"
            error={field === "password" ? error ?? undefined : undefined}
          >
            <Input
              type="password"
              size="md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              disabled={pending}
            />
          </Field>

          {looseNotice}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button type="button" size="md" variant="ghost" disabled={pending} onClick={() => router.push(consentHref as never)}>Back</Button>
            <Button type="button" size="md" variant="primary" disabled={!armed} loading={pending} onClick={submit}>Designate</Button>
          </div>
        </section>
      )}
    </>
  );
}
