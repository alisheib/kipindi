"use client";

/**
 * "Download a sample sheet" — the button beside every file entrance in the contact book (§F21, §F22 · S15 C3, 2026-10-09).
 *
 * ⭐ IT HANDS THE BROWSER EXACTLY WHAT THE SUITE TESTED: `contactSampleFile("csv")` — the file name, the MIME type and the
 * text (the byte-order mark included, so Excel opens it as UTF-8) — as a Blob, never a second rendering of the samples.
 * Its title names the columns from `CONTACT_FIELDS` itself (`fileColumns`), never a hand-typed list (§F20).
 * ⛔ Imports nothing from src/lib/server and nothing from exceljs: a sample is a CSV, which opens in Excel.
 */
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { CONTACT_FIELDS, fileColumns } from "@/lib/contacts/contact-fields";
import { contactSampleFile } from "@/lib/contacts/sample-sheet";

const SAMPLE_LABEL = "Download a sample sheet";
const SAMPLE_TITLE = `A CSV file with the columns ${fileColumns(CONTACT_FIELDS).map((f) => f.label).join(", ")} and three example rows to copy.`;

export function SampleSheetButton() {
  const download = () => {
    const sample = contactSampleFile("csv");
    const blob = new Blob([sample.content], { type: sample.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = sample.filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    // The download has started from the object URL by now; it is released on the next turn.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      leading={<I.download s={16} />}
      title={SAMPLE_TITLE}
      onClick={download}
      data-block="import-sample"
    >
      {SAMPLE_LABEL}
    </Button>
  );
}
