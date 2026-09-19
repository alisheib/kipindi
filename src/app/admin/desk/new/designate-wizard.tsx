"use client";

/**
 * THE DESIGNATE WIZARD'S TWO TYPED SURFACES — the account picker, and the consent/review form
 * (C7-SPEC rulings 387, 388, 412; owner rulings D5, D19).
 *
 * ⛔ **NOT ONE SENTENCE ABOUT THE FEATURE IS WRITTEN HERE** (ruling 388). Every word the server can say about an
 * account arrives as a prop or as a returned string. Ruling 385 measured why that is not a style: most of the
 * sentences this console can emit carry NO vocabulary word at all, so one typed into a client component would ship
 * to every visitor with `test:house-bot-disclosure` 1.1 and `verify:house-bot-bundle` both reporting clean. The
 * handful of sentences this file DOES own are about the FORM — a field's own label, and a transport failure the
 * server could not word because the request never reached it.
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
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useDeferredToast } from "@/components/ui/toast";

/**
 * One option the picker can offer. ⛔ Declared HERE, structurally, rather than imported from the gate module: a type
 * import's SPECIFIER survives in this file's source, and ruling 384 refuses a house-module specifier in a client
 * file in ANY import form. The page passes the server's own objects, so `tsc` still ties the two together.
 */
export type DeskPickerRow = { userId: string; handle: string; href: string; reason: string | null };
export type DeskPickerAnswer = { rows: DeskPickerRow[]; note: string | null; count: string };

/** ⛔ THE ONE SENTENCE ABOUT THE TRANSPORT, and it names no state, no figure and no feature: the server cannot word
 *  a failure that never reached it. */
const TRANSPORT_FAILURE = "That did not reach the server. Nothing changed — try again.";

/**
 * THE ACCOUNT PICKER (ruling 412's UserPicker clause, and ruling 387's gated lookup).
 *
 * ⛔ AN IN-FLOW LISTBOX: no portal, no scroll box of its own, at most the ten options the server sends, each at
 * least 44px tall, and an option that cannot be chosen carries `aria-disabled` with its reason wrapped beneath it
 * rather than a tooltip nobody on a phone can open.
 * ⛔ THE EMPTY ANSWER IS THE SERVER'S OWN SENTENCE, and it is the SAME sentence a refused caller receives (387(c)) —
 * so this file cannot reveal, by what it paints, whether a query matched anything.
 * ⛔ NO PHONE AND NO EMAIL IN AN OPTION. The phone belongs to the check card, where the platform's own SERVER gate
 * decides whether this viewer may see it at all (359).
 */
export function DeskAccountPicker({
  find,
}: {
  find: (query: string) => Promise<DeskPickerAnswer>;
}) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<DeskPickerAnswer | null>(null);
  const [failed, setFailed] = useState(false);
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
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query, find]);

  const rows = answer?.rows ?? [];

  return (
    <div className="space-y-3">
      <Field label="Search for an account" hint="A handle, a phone number, or an account ID.">
        <Input
          ref={inputRef}
          size="md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          role="combobox"
          aria-expanded={rows.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          trailing={pending ? <Spinner /> : undefined}
        />
      </Field>

      {/* 412 · a polite live count, and it says the one fact a reader cannot get by counting the rows: how many of
          what is on screen cannot be chosen. ⛔ Empty for a refused caller AND for a search that found nothing. */}
      <p className="text-body-sm text-text-subtle" aria-live="polite">{answer?.count ?? ""}</p>

      {failed && (
        <p className="text-body-sm text-danger-fg" role="alert">{TRANSPORT_FAILURE}</p>
      )}

      {answer?.note != null && rows.length === 0 && (
        <p className="text-body-sm text-text-secondary">{answer.note}</p>
      )}

      {rows.length > 0 && (
        <ul id={listId} role="listbox" aria-label="Accounts" className="rounded-md border border-border-subtle divide-y divide-border-subtle">
          {rows.map((r) => {
            const blocked = r.reason !== null;
            return (
              <li
                key={r.userId}
                role="option"
                aria-selected={false}
                aria-disabled={blocked || undefined}
                className={`min-h-[var(--tap-min)] px-3 py-2 ${blocked ? "text-text-subtle" : ""}`}
              >
                {blocked ? (
                  <span className="block">
                    <span className="block font-mono text-body-sm tabular-nums">{r.handle}</span>
                    {/* ⛔ THE REASON WRAPS BENEATH THE OPTION, never a `title` — the select atom's own hint rule.
                        ⛔ `text-body-sm` (13px), NOT `text-caption` (11px): §T4's reading floor is 12.5px and
                        `test:type-scale` §3 counts every sub-floor prose site into a ratchet that may only shrink.
                        This is a sentence an officer must read to know why a row cannot be chosen. */}
                    <span className="block text-body-sm">{r.reason}</span>
                  </span>
                ) : (
                  /* ⛔ AN OPTION IS PAINTED, NOT JUST TYPED (`test:ui-consistency`'s `bare-text-button`, E-91). A
                     control whose whole appearance is its text reads as a label; the hover ground is what tells a
                     reader the row is pressable, and it is the same treatment every other row list in the console
                     carries. */
                  <button
                    type="button"
                    className="block w-full text-left min-h-[var(--tap-min)] rounded-md bg-transparent hover:bg-bg-overlay hover:text-brand-300"
                    onClick={() => router.push(r.href as never)}
                  >
                    <span className="block font-mono text-body-sm text-text tabular-nums">{r.handle}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** What the designation posts and what it gets back — declared structurally, for ruling 384's reason above. */
type DesignateResult =
  | { ok: true; href: string; note: string }
  | { ok: false; error: string; field?: "label" | "note" | "password"; href?: string };

/**
 * THE CONSENT AND REVIEW STEPS (rulings 388, 412).
 *
 * ⛔ ONE COMPONENT FOR BOTH, AND IT IS LOAD-BEARING. The step lives in the URL so Back steps back, and the name and
 * purpose live in this component's own state; two separate mount points would throw away what the officer typed on
 * the push between them.
 * ⛔ THE PASSWORD IS ASKED FOR ON THE SCREEN THAT SUBMITS, and nowhere else. Carrying it across a navigation would
 * mean holding somebody else's password in a component that outlives the decision to use it.
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
  labelMax,
  noteMax,
  designate,
}: {
  phase: "consent" | "review";
  userId: string;
  handle: string;
  consentHref: string;
  reviewHref: string;
  checkHref: string;
  labelMax: number;
  noteMax: number;
  designate: (input: { userId: string; label: string; note?: string; password: string; submitId?: string }) => Promise<DesignateResult>;
}) {
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const headingId = useId();

  /* ⛔ THE PASSWORD NEVER SURVIVES A STEP CHANGE. Stepping back to the consent screen drops it, so it cannot sit in
     memory behind a screen that is not asking for it. */
  useEffect(() => {
    if (phase !== "review") setPassword("");
  }, [phase]);

  const dirty = label.trim().length > 0 || note.trim().length > 0;
  const armed = label.trim().length > 0 && (phase !== "review" || password.length > 0);

  const submit = () => {
    if (pending || !armed) return;
    setError(null);
    setField(null);
    start(async () => {
      let result: DesignateResult;
      try {
        result = await designate({ userId, label, note, password, submitId: `${userId}:${label}` });
      } catch {
        result = { ok: false, error: TRANSPORT_FAILURE };
      }
      if (!result.ok) {
        /* ⛔ THE REFUSAL STAYS ON THE SCREEN THAT CAUSED IT — closing or navigating would throw away what the
           officer typed and leave them to write it again to find out whether the second attempt is refused too.
           The PASSWORD still goes, every time. */
        setError(result.error);
        setField(result.field ?? null);
        setPassword("");
        toast({ title: "It was not designated", description: result.error, variant: "danger" });
        return;
      }
      setPassword("");
      deferToast({ title: "On the desk", description: result.note, variant: "success" });
      router.push(result.href as never);
    });
  };

  return (
    <>
      <UnsavedChangesGuard dirty={dirty && !pending} />

      {phase === "consent" && (
        <div className="glass-panel p-4 space-y-4">
          <h2 id={headingId} className="font-display text-body-lg font-semibold text-text">What the holder agrees to</h2>
          {/* ⛔ EVERY SENTENCE HERE IS ABOUT THE PERMISSION AND THE FORM, not about the feature (453, 388). */}
          <ul className="space-y-2 text-body-sm text-text-secondary max-w-[60ch] list-disc pl-5">
            <li>Stakes are placed from this account, out of the money in its own wallet, within the limits set for it and for the desk.</li>
            <li>Their permission is confirmed with their own password, checked once and never kept. It creates no sign-in and no session.</li>
            <li>They can end it at any time from their own account, and it ends by itself if they take a break, self-exclude, close the account or ask for their data to be erased.</li>
            <li>Nothing is staked until an officer starts this account and the desk&apos;s master switch is on.</li>
          </ul>
          <p className="text-body-sm text-text-subtle">
            Account <span className="font-mono">{handle}</span>
          </p>

          <Field label="A name for this account on the desk" hint={`Up to ${labelMax} characters. It is shown to officers only.`} dataField="label" error={field === "label" ? error ?? undefined : undefined}>
            <Input
              size="md"
              value={label}
              maxLength={labelMax}
              onChange={(e) => setLabel(e.target.value)}
              autoComplete="off"
              disabled={pending}
            />
          </Field>

          <Field label="Why (optional)" hint={`Up to ${noteMax} characters. Kept with the record.`} dataField="note" error={field === "note" ? error ?? undefined : undefined}>
            <Textarea
              value={note}
              rows={3}
              maxLength={noteMax}
              onChange={(e) => setNote(e.target.value)}
              disabled={pending}
            />
          </Field>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button type="button" size="md" variant="ghost" onClick={() => router.push(checkHref as never)}>Back</Button>
            <Button type="button" size="md" variant="primary" disabled={label.trim().length === 0} onClick={() => router.push(reviewHref as never)}>Continue</Button>
          </div>
        </div>
      )}

      {phase === "review" && (
        <div className="glass-panel p-4 space-y-4">
          <h2 id={headingId} className="font-display text-body-lg font-semibold text-text">Confirm with the holder</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <dt className="font-mono text-micro eyebrow uppercase text-text-tertiary">Account</dt>
              <dd className="font-mono text-body-sm text-text-subtle">{handle}</dd>
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
            label="The holder's password"
            hint="Ask them for it. It is checked once and never kept, and the last two attempts are always held for them so this can never lock them out."
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

          {error !== null && field === null && <p className="text-body-sm text-danger-fg" role="alert">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button type="button" size="md" variant="ghost" disabled={pending} onClick={() => router.push(consentHref as never)}>Back</Button>
            <Button type="button" size="md" variant="primary" disabled={!armed} loading={pending} onClick={submit}>Designate</Button>
          </div>
        </div>
      )}
    </>
  );
}
