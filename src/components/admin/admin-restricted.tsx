/**
 * AdminRestricted — shown when a console user's ROLE does not permit a surface.
 *
 * Deliberately a rendered panel, not a redirect: `redirect()` from inside a page
 * body fires after the shell has begun streaming, which bounces the client
 * mid-render (and produced a "Rendered more hooks" error on the blocked path).
 * A clean 200 with no data is both safer and more honest — it tells the operator
 * WHY they can't see this, instead of silently teleporting them.
 *
 * The important property: the caller must return this BEFORE computing or
 * fetching any of the restricted data.
 */
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { I } from "@/components/ui/glyphs";

export function AdminRestricted({
  title,
  sw,
  need,
}: {
  title: string;
  sw?: string;
  /** Human name of the tier required, e.g. "Admin or Compliance". */
  need: string;
}) {
  return (
    <>
      <AdminPageHead title={title} sw={sw} />
      <div className="px-4 lg:px-6 py-5">
        <AdminCard title="Restricted" sw="Imezuiliwa">
          <div className="flex items-start gap-3">
            {/* ⛔ LITERALS, NOT `h-10 w-10` — the spacing scale is overridden
                (tailwind.config.ts:200-215) and that pair is 80×80px beside 13.5px body
                copy. 40px = --tap-min, the kit's glyph-tile size. */}
            <span className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-md bg-no-500/10 text-no-300">
              <I.lock s={17} />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-text">Your role cannot view this page.</p>
              <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
                This surface exposes regulator-grade financial data and is limited to{" "}
                <strong className="text-text">{need}</strong>. Moderators are excluded by policy — see
                the role tiers in <code className="font-mono text-[11.5px]">roles.ts</code>.
              </p>
            </div>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
