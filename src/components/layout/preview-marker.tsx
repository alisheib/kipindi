/**
 * THE "PREVIEW" MARKER — what a browser holding a valid preview pass wears on every page while the new journey
 * is in STAFF_PREVIEW (the Vodacom plan S1; Done-when: "staff see a preview marker on production and nobody
 * else sees anything").
 *
 * ⛔ RENDERED ONLY WHEN `resolveSimpleJourney().preview` IS TRUE — AppShell decides, this only paints. For every
 * other request it is not in the DOM at all: no hidden element, no attribute, nothing a player could find.
 * ⭐ Its one control is "Exit preview", a native form POST to `/preview` answered by a 303 — a document
 * navigation, so the root layout re-runs and the marker leaves with the pass (E-70).
 * Server component: it receives the finished words, and the kit's `NoticeBar` does the rest.
 */
import { NoticeBar, NoticeBarAction } from "@/components/ui/notice-bar";

export function PreviewMarker({ label, exit }: { label: string; exit: string }) {
  return (
    <NoticeBar
      tone="info"
      glyph="eye"
      testId="journey-preview-marker"
      action={
        <NoticeBarAction tone="info" glyph="eyeOff" post={{ action: "/preview", fields: { intent: "off" } }} testId="journey-preview-exit">
          {exit}
        </NoticeBarAction>
      }
    >
      {label}
    </NoticeBar>
  );
}
