"use client";

/**
 * Inline display-name editor for the profile hero. Tap the name to edit;
 * Enter or blur saves; Esc cancels. Backed by updateProfileBasicsAction.
 */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { updateProfileBasicsAction } from "@/app/profile/actions";

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
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useT();

  const enter = () => {
    setValue(currentName ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const save = () => {
    const v = value.trim();
    if (v === "") {
      toast({ title: t.toast.nameEmpty, variant: "danger" });
      return;
    }
    if (v === (currentName ?? "")) {
      setEditing(false);
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("displayName", v);
      const r = await updateProfileBasicsAction(fd);
      if (!r.ok) {
        toast({ title: t.toast.nameFailed, description: r.error, variant: "danger" });
        return;
      }
      toast({ title: t.toast.nameUpdated, variant: "success" });
      setEditing(false);
      router.refresh();
    });
  };

  if (editing) {
    return (
      <div className="mt-1.5 flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); save(); }
            if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
          }}
          onBlur={save}
          maxLength={40}
          aria-label="Display name"
          placeholder={t.common.yourName}
          className="font-display text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em] text-text bg-transparent border-b border-gold-500 focus:outline-none px-0 min-w-0 max-w-full flex-1"
        />
        {pending && <span className="inline-flex text-text-subtle"><Spinner size={16} /></span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={enter}
      className="mt-1.5 inline-flex items-center gap-2 group text-left"
      aria-label="Edit display name"
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
