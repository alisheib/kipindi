"use client";

/**
 * Inline display-name editor for the profile hero. Tap the name to edit;
 * Enter or blur saves; Esc cancels. Backed by updateProfileBasicsAction.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { updateProfileBasicsAction } from "@/app/profile/actions";
import { errorCopy } from "@/lib/error-copy";

export function ProfileNameEditor({
  currentName,
  fallbackPlaceholder,
}: {
  currentName: string | null;
  fallbackPlaceholder: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName ?? "");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // `save()` is reachable from Enter AND from blur, so pressing Enter and then
  // clicking away fired the server action TWICE — the second call still read the
  // pre-refresh `currentName`, so the "unchanged" early return did not catch it.
  // A ref rather than `pending`: useTransition's flag only flips on the NEXT
  // render, so a second call raised before that render still reads `false`.
  const savingRef = useRef(false);
  // §A3 — leaving edit mode unmounts the input and focus falls to <body>, so a
  // keyboard user has to tab from the top of the page again. Focus goes back to
  // the trigger, but ONLY when the close was deliberate (Enter / Escape). Never
  // on blur: that would yank focus out of whatever the player just tabbed to.
  const returnFocusRef = useRef(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useT();

  const enter = () => {
    savingRef.current = false;
    setValue(currentName ?? "");
    setEditing(true);
    // `autoFocus` on the input owns FOCUS (deterministic, at mount); this deferred
    // call owns only the SELECTION, so tapping the name replaces it in one gesture.
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const close = (returnFocus: boolean) => {
    returnFocusRef.current = returnFocus;
    setEditing(false);
  };

  useEffect(() => {
    if (editing || !returnFocusRef.current) return;
    returnFocusRef.current = false;
    triggerRef.current?.focus();
  }, [editing]);

  const save = (returnFocus: boolean) => {
    if (savingRef.current) return;
    const v = value.trim();
    if (v === "") {
      toast({ title: t.toast.nameEmpty, variant: "danger" });
      return;
    }
    if (v === (currentName ?? "")) {
      close(returnFocus);
      return;
    }
    // Stays true through the success path: `currentName` only refreshes on the
    // next server render, so a late blur would otherwise re-fire the same save.
    // `enter()` clears it, and so does every refusal below.
    savingRef.current = true;
    start(async () => {
      const fd = new FormData();
      fd.set("displayName", v);
      // B-12 — a flaky network mid-action throws inside the transition; uncaught,
      // React swaps the whole page for error.tsx. Same handling as a refusal.
      let r: Awaited<ReturnType<typeof updateProfileBasicsAction>>;
      try {
        r = await updateProfileBasicsAction(fd);
      } catch {
        r = { ok: false, error: t.error.somethingDidntWork };
      }
      if (!r.ok) {
        savingRef.current = false;
        toast({ title: t.toast.nameFailed, description: errorCopy(t, r), variant: "danger" });
        return;
      }
      toast({ title: t.toast.nameUpdated, variant: "success" });
      close(returnFocus);
      router.refresh();
    });
  };

  if (editing) {
    return (
      <div className="mt-1.5 flex items-center gap-2">
        {/* §A3 — this field carried `focus:outline-none` with NO replacement, and a
            Tailwind `:focus` rule outranks the `:where(…)` catch-all in globals.css,
            so a keyboard user got NO focus change at all on the field that holds their
            own name. The constant underline is not a focus indicator: a decoration that
            never changes carries no state. So the ring is the §A3 recipe (2px
            --brand-500 outline at offset 2 + the 4px 25% halo), and the underline is
            re-toned off gold — §M3 reserves gold for earned money and status, which a
            preference editor is not — onto `--border-control`, the token `.input`
            already uses precisely because a control's only boundary must clear 3:1
            (WCAG 1.4.11). It now MOVES to brand on focus instead of standing still. */}
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); save(true); }
            if (e.key === "Escape") { e.preventDefault(); close(true); }
          }}
          onBlur={() => save(false)}
          maxLength={40}
          aria-label={t.common.yourName}
          placeholder={t.common.yourName}
          className="font-display text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em] text-text bg-transparent border-b border-border-control transition-colors focus:border-brand-500 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[color:var(--brand-500)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-500)_25%,transparent)] px-0 min-w-0 max-w-full flex-1"
        />
        {pending && <span className="inline-flex text-text-subtle"><Spinner size={16} /></span>}
      </div>
    );
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={enter}
      className="mt-1.5 inline-flex items-center gap-2 group text-left"
      aria-label={t.common.editDisplayName}
    >
      <span className="font-display text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em] text-text">
        {currentName && currentName.trim() !== "" ? currentName : (
          <span className="text-text-subtle italic">{fallbackPlaceholder}</span>
        )}
      </span>
      <I.edit s={13} />
    </button>
  );
}
