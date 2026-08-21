import Link from "next/link";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { I } from "@/components/ui/glyphs";

export default function PollNotFound() {
  return (
    <>
      <AdminPageHead
        title="Poll not found"
        sw="Kura haikupatikana"
        actions={
          <Link
            href="/admin/ai-polls"
            className="btn btn-ghost btn-sm rounded-pill inline-flex items-center gap-1.5"
          >
            <I.chevronLeft s={14} />
            Back to polls
          </Link>
        }
      />
      <div className="px-4 lg:px-6 py-5">
        <AdminCard>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            {/* ⚠️ LITERALS, not `h-12 w-12` — spacing is overridden (tailwind.config.ts:200-215)
                so `h-12` rendered a 128px disc round a 22px glyph. */}
            <div className="h-[48px] w-[48px] rounded-pill bg-bg-overlay flex items-center justify-center">
              <I.search size={22} className="text-text-subtle" />
            </div>
            <div>
              <p className="font-display text-[16px] font-bold text-text">Poll not found</p>
              <p className="text-[13px] italic text-text-tertiary mt-1">Kura haikupatikana</p>
            </div>
            <p className="text-[13px] text-text-muted max-w-[380px]">
              This poll may have been deleted, or the ID in the URL is invalid.
              Go back to the poll list to find what you need.
            </p>
            <Link
              href="/admin/ai-polls"
              className="btn btn-primary btn-sm rounded-pill inline-flex items-center gap-1.5 mt-2"
            >
              <I.chevronLeft s={14} />
              View all polls
            </Link>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
