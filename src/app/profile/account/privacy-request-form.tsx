"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldLegend } from "@/components/ui/field-legend";
import { useToast } from "@/components/ui/toast";
// ⛔ NEVER THE RAW SERVER STRING — `docs/FAILURE-INVENTORY.md` §1.5/§1.6: the server's English
// audit prose reaching a Swahili or Chinese player at the moment something failed.
import { errorCopy } from "@/lib/error-copy";
import { I } from "@/components/ui/glyphs";
import { filePrivacyRequestAction } from "./actions";
import { useT } from "@/lib/i18n";

type Kind = "ERASURE" | "CORRECTION";

/**
 * The player's own door into the DSAR register (E-33).
 *
 * ⭐ TWO CHOICES, NOT FOUR. Access and portability are already served — instantly, and with no
 * 30-day clock — by the Export button directly above this on the page. See
 * `filePrivacyRequestAction` for why offering them here would be worse than not.
 *
 * ⚠️ THE ERASURE NOTE IS SHOWN BEFORE THE REQUEST, NOT AFTER IT. What erasure actually does is
 * partial — contact details and profile go, the financial and identity record is held for seven
 * years under AML law — and a player who learns that only in the officer's reply has been told
 * something the form could have told them. It is also the one place this flow can set an
 * expectation it will actually meet.
 */
export function PrivacyRequestForm() {
  const { t } = useT();
  const [kind, setKind] = useState<Kind>("CORRECTION");
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    setSending(true);
    try {
      const fd = new FormData();
      fd.set("type", kind);
      fd.set("detail", detail);
      const result = await filePrivacyRequestAction(fd);
      if (!result.ok) {
        toast({ title: t.error.somethingWentWrong, description: errorCopy(t, result), variant: "danger" });
        return;
      }
      // ⛔ A DUPLICATE IS A SUCCESS FROM HERE. The player asked; a request of this kind is
      // already open and being worked on. Telling them it "failed" would invite them to try
      // again, which is exactly the behaviour the server-side cap exists to stop.
      toast({
        title: t.profile.privacyRequestTitle,
        description: result.duplicate ? t.profile.privacyRequestOpen : t.profile.privacyRequestFiled,
        variant: "success",
      });
      setSent(true);
      setDetail("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <FieldLegend>{t.profile.privacyRequestKind}</FieldLegend>
        <div className="flex flex-wrap gap-2">
          {([
            ["CORRECTION", t.profile.privacyRequestCorrection],
            ["ERASURE", t.profile.privacyRequestErasure],
          ] as const).map(([value, label]) => (
            <label
              key={value}
              className={[
                "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-body-sm cursor-pointer transition-colors",
                kind === value
                  ? "border-royal-700 bg-royal-500/[0.10] text-text"
                  : "border-border bg-bg-overlay/40 text-text-muted hover:text-text",
              ].join(" ")}
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={kind === value}
                onChange={() => { setKind(value); setSent(false); }}
                className="accent-[var(--royal-500)]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "ERASURE" && (
        <p className="rounded-md border border-warning-border bg-warning-bg/15 px-3 py-2 text-label text-text-secondary">
          {t.profile.privacyRequestErasureNote}
        </p>
      )}

      <label className="block">
        <FieldLegend className="block mb-1.5">{t.profile.privacyRequestDetail}</FieldLegend>
        <Textarea
          name="detail"
          rows={3}
          maxLength={1000}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </label>

      <Button
        variant="secondary"
        size="lg"
        leading={<I.shield s={14} />}
        onClick={submit}
        loading={sending}
        disabled={sent}
      >
        {t.profile.privacyRequestSubmit}
      </Button>
    </div>
  );
}
