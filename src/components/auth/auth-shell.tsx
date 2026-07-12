import Link from "next/link";
import { FiftyLockup, TippingBar } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { getServerT } from "@/lib/i18n-server";
import { HELPLINE } from "@/lib/support-config";

/**
 * Shared shell for the six /auth/* routes (login, register, otp,
 * forgot-password, reset-password, verify-email). The form card sits on the
 * right; an `lg:`-only brand side-rail on the left brings brand warmth to the
 * coldest screens a new player sees. It also unifies what used to be six
 * hand-rolled centered cards + two banner styles into one surface.
 *
 * Colour discipline: NO gold anywhere — nothing is earned on the auth surface
 * (brand rule "gold = earned-money only"). The rail is royal `--bg-overlay`
 * with BrandTopo at 0.09 and a live TippingBar specimen (aqua pip pulses).
 *
 * Admin auth (/auth/admin) keeps its own bespoke lockup and does NOT adopt
 * this shell.
 */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = await getServerT();
  return (
    <main className="relative min-h-[calc(100vh-44px)] overflow-hidden">
      <div className="mx-auto grid min-h-[calc(100vh-44px)] w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Brand side-rail — lg+ only. */}
        <aside
          className="relative hidden overflow-hidden px-10 py-12 lg:flex lg:flex-col lg:justify-between"
          style={{ background: "var(--bg-overlay)" }}
        >
          <BrandTopo id="auth-rail-topo" opacity={0.09} />
          <div className="relative">
            <Link href="/" aria-label="50pick home" className="inline-block">
              <FiftyLockup size={26} />
            </Link>
          </div>

          <div className="relative max-w-sm">
            <p className="font-display text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-text">
              {t.auth.railTagline}
            </p>
            <div className="mt-7 rounded-xl border border-border/60 bg-bg-elevated/40 p-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
                <span className="text-yes-300">{t.common.yes} 64%</span>
                <span className="text-no-300">36% {t.common.no}</span>
              </div>
              <TippingBar yesPct={64} height={14} showLabels={false} recastOnHover={false} />
            </div>
          </div>

          <div className="relative font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
            {t.auth.licensedByGbt} {HELPLINE()} · EN · SW · 中文
          </div>
        </aside>

        {/* Form column. Uses flex (not `grid place-items-center`): a centered grid
            track auto-sizes to the form's max-content width (~398px from the big
            heading) and, with `overflow:clip` on <main>, silently clips the form
            off a 320px phone. Flex sizes the child to the column width instead. */}
        <div className="relative flex items-center justify-center px-3 py-8">
          <BrandTopo id="auth-form-topo" opacity={0.09} />
          <div className="relative w-full min-w-0 max-w-md">
            {/* Mobile lockup — the rail carries it on lg. */}
            <Link href="/" aria-label="50pick home" className="mb-6 inline-block lg:hidden">
              <FiftyLockup size={22} />
            </Link>
            {children}
            {/* Mobile trust strip — the rail carries it on lg. */}
            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle lg:hidden">
              {t.auth.licensedByGbt} {HELPLINE()}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
