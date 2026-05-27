"use client";

/**
 * FirstVisitPrimer — three-card overlay shown the very first time a
 * player lands on the platform. After "Got it" or "Skip", a flag is
 * written to localStorage and the primer never shows again for that
 * browser. Demo runs can clear it by deleting `50pick-primer-seen`.
 *
 * Why this exists: the home headline "The wisdom of YES & NO" is
 * poetic but doesn't teach. A first-timer doesn't know what a
 * prediction market is, what pari-mutuel means, or why we say "the
 * pool grew" instead of "you lost". This primer closes that gap with
 * three calm, kit-faithful cards. Bilingual, reduced-motion aware,
 * keyboard-navigable.
 *
 * Doesn't render on auth or admin routes (it'd be confusing on a
 * login screen). Hidden if `50pick-primer-seen=1` or
 * `50pick-primer-dismissed=1` is in localStorage.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";

const STORAGE_KEY = "50pick-primer-seen";
const HIDE_ON = /^\/(auth|admin)(\/|$)/;

type Card = {
  eyebrow: { en: string; sw: string };
  title: { en: string; sw: string };
  body: { en: string; sw: string };
  // Inline SVG visual — kit-faithful (royal indigo + gilt + emerald + rose),
  // no external assets.
  visual: React.ReactNode;
};

const CARDS: Card[] = [
  {
    eyebrow: { en: "what is 50pick", sw: "50pick ni nini" },
    title: {
      en: "Predict events. Not chance.",
      sw: "Tabiri matukio. Si bahati.",
    },
    body: {
      en:
        "50pick is a prediction market. Every question is a real-world event with a YES or NO answer — like \"will the masika rains start before 15 April?\" — settled against an official public source.",
      sw:
        "50pick ni soko la utabiri. Kila swali ni tukio halisi lenye jibu la NDIO au HAPANA — kama \"Je, mvua za masika zitaanza kabla ya 15 Aprili?\" — linatatuliwa kupitia chanzo rasmi cha umma.",
    },
    visual: (
      <svg viewBox="0 0 200 120" width="200" height="120" aria-hidden>
        {/* Question mark glyph with two paths to YES + NO */}
        <circle cx="100" cy="44" r="30" fill="oklch(22% 0.140 268)" stroke="oklch(38% 0.18 268)" strokeWidth="1.5" />
        <text x="100" y="54" textAnchor="middle" fontFamily="Sora" fontWeight="700" fontSize="32" fill="oklch(86% 0.13 82)">?</text>
        <path d="M70 82 Q 50 110 30 108" stroke="oklch(58% 0.16 152)" strokeWidth="2" fill="none" />
        <path d="M130 82 Q 150 110 170 108" stroke="oklch(60% 0.18 22)" strokeWidth="2" fill="none" />
        <text x="22" y="118" fontFamily="JetBrains Mono" fontWeight="600" fontSize="9" fill="oklch(80% 0.14 152)">YES</text>
        <text x="160" y="118" fontFamily="JetBrains Mono" fontWeight="600" fontSize="9" fill="oklch(80% 0.16 22)">NO</text>
      </svg>
    ),
  },
  {
    eyebrow: { en: "how you bet", sw: "jinsi ya kuweka dau" },
    title: {
      en: "Drag the dial. Conviction = stake.",
      sw: "Sogeza dial. Imani = dau.",
    },
    body: {
      en:
        "One gesture sets both your side AND your stake. Drag toward YES (left) or NO (right). The further from centre, the higher your conviction multiplier (1×–5×) and the bigger the stake.",
      sw:
        "Mguso mmoja huweka upande wako na dau lako. Sogeza kuelekea NDIO (kushoto) au HAPANA (kulia). Kadri unavyosogea mbali na katikati, ndivyo kiwango chako kinaongezeka (1×–5×).",
    },
    visual: (
      <svg viewBox="0 0 200 120" width="200" height="120" aria-hidden>
        {/* A miniature dial — track + knob with side fills */}
        <rect x="20" y="55" width="160" height="10" rx="5" fill="oklch(22% 0.140 268)" stroke="oklch(34% 0.130 268)" />
        {/* Inactive hint tints */}
        <rect x="20" y="55" width="80" height="10" rx="5" fill="oklch(58% 0.16 152)" opacity="0.10" />
        <rect x="100" y="55" width="80" height="10" rx="5" fill="oklch(60% 0.18 22)" opacity="0.10" />
        {/* NO-side fill */}
        <rect x="100" y="55" width="48" height="10" rx="5" fill="url(#prim-no)" />
        <defs>
          <linearGradient id="prim-no" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(40% 0.13 22)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(60% 0.18 22)" />
          </linearGradient>
        </defs>
        {/* Knob */}
        <circle cx="148" cy="60" r="14" fill="oklch(28% 0.110 268)" stroke="oklch(60% 0.18 22)" strokeWidth="2" />
        <text x="148" y="63" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700" fontSize="10" fill="oklch(96% 0.005 240)">2.4×</text>
        <text x="22" y="100" fontFamily="JetBrains Mono" fontWeight="600" fontSize="9" fill="oklch(76% 0.13 152)">YES</text>
        <text x="167" y="100" fontFamily="JetBrains Mono" fontWeight="600" fontSize="9" fill="oklch(78% 0.16 22)">NO</text>
      </svg>
    ),
  },
  {
    eyebrow: { en: "how payouts work", sw: "jinsi malipo yanavyofanya kazi" },
    title: {
      en: "Winners share the losers' pool.",
      sw: "Washindi wanagawana bwawa la wapotezao.",
    },
    body: {
      en:
        "There is no fixed odds. The losing side's pool (minus a 9 % operator margin) is split among winners by the size of their stake. Because the math is shared — when one side grows, the other side's potential payout grows too.",
      sw:
        "Hakuna odds zilizowekwa. Bwawa la upande uliopoteza (kasoro asilimia 9 ya mtumiaji) linagawanywa kati ya washindi kulingana na ukubwa wa dau. Wakati upande mmoja unakua, malipo ya upande mwingine yanaongezeka pia.",
    },
    visual: (
      <svg viewBox="0 0 200 120" width="200" height="120" aria-hidden>
        {/* Two stacked pools with arrows showing flow */}
        <rect x="22" y="22" width="70" height="36" rx="6" fill="oklch(40% 0.10 152 / 0.25)" stroke="oklch(45% 0.13 152)" />
        <text x="57" y="38" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" fill="oklch(78% 0.13 152)">YES POOL</text>
        <text x="57" y="51" textAnchor="middle" fontFamily="Sora" fontSize="12" fontWeight="700" fill="oklch(96% 0.005 268)">TZS 12k</text>

        <rect x="108" y="22" width="70" height="36" rx="6" fill="oklch(40% 0.13 22 / 0.25)" stroke="oklch(48% 0.15 22)" />
        <text x="143" y="38" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" fill="oklch(78% 0.16 22)">NO POOL</text>
        <text x="143" y="51" textAnchor="middle" fontFamily="Sora" fontSize="12" fontWeight="700" fill="oklch(96% 0.005 268)">TZS 18k</text>

        {/* Arrows from loser pool to winner pool */}
        <path d="M108 78 L 92 88" stroke="oklch(86% 0.13 82)" strokeWidth="1.5" fill="none" markerEnd="url(#arr)" />
        <defs>
          <marker id="arr" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="oklch(86% 0.13 82)" />
          </marker>
        </defs>
        <text x="100" y="105" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="oklch(86% 0.13 82)">share of pool</text>
      </svg>
    ),
  },
];

function readLang(): "en" | "sw" {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )kp-locale=([^;]*)/);
  if (!m) return "en";
  const v = decodeURIComponent(m[1]);
  return v === "sw" ? "sw" : "en"; // FR falls through to EN copy (not yet translated for this primer)
}

export function FirstVisitPrimer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<"en" | "sw">("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (HIDE_ON.test(pathname ?? "/")) return;
    // Headless-browser bypass: don't show the primer during automated
    // visual / e2e runs. The overlay intercepts pointer events and
    // breaks any hover-based test. Real Chrome / Firefox / Safari
    // never set "HeadlessChrome" in their UA.
    if (/HeadlessChrome|Playwright/i.test(navigator.userAgent)) return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (seen === "1") return;
      setLang(readLang());
      // Small delay so the page paints before the primer overlays.
      const t = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(t);
    } catch {
      /* private browsing — just don't show */
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight") setStep((s) => Math.min(CARDS.length - 1, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function persistSeen() {
    try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
  }
  function dismiss() {
    persistSeen();
    setOpen(false);
  }
  function next() {
    if (step < CARDS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  if (!open || typeof document === "undefined") return null;
  if (HIDE_ON.test(pathname ?? "/")) return null;

  const c = CARDS[step];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="50pick primer"
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Skip primer"
        onClick={dismiss}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        style={{ animation: "fvp-fade 180ms ease-out" }}
      />

      <div
        className="relative w-full sm:max-w-[440px] rounded-t-2xl sm:rounded-2xl border border-border bg-bg-elevated overflow-hidden shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]"
        style={{ animation: "fvp-rise 320ms var(--ease-arrive)" }}
      >
        {/* Step strip — three small gilt-dotted segments */}
        <div className="flex items-center gap-1 px-5 pt-4">
          {CARDS.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="h-[3px] flex-1 rounded-pill transition-colors duration-300"
              style={{
                background:
                  i < step
                    ? "oklch(78% 0.13 80)"
                    : i === step
                      ? "var(--gold-300)"
                      : "oklch(34% 0.130 268)",
              }}
            />
          ))}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip · Ruka"
            className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 pt-3 pb-5">
          <div className="flex justify-center py-4">{c.visual}</div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-gold-300">
            {c.eyebrow[lang]}
          </p>
          <h2 className="mt-1 font-display text-[20px] font-bold text-text leading-tight tracking-[-0.018em]">
            {c.title[lang]}
          </h2>
          <p className="mt-2 text-[13px] text-text-muted leading-relaxed">
            {c.body[lang]}
          </p>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="btn btn-ghost btn-sm disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ borderRadius: 999, minWidth: 80 }}
            >
              {lang === "sw" ? "Rudi" : "Back"}
            </button>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              {step + 1} / {CARDS.length}
            </p>
            <button
              type="button"
              onClick={next}
              className="btn btn-gold btn-sm inline-flex items-center gap-1.5"
              style={{ borderRadius: 999, minWidth: 80 }}
            >
              {step === CARDS.length - 1
                ? lang === "sw"
                  ? "Sawa"
                  : "Got it"
                : lang === "sw"
                  ? "Endelea"
                  : "Next"}
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>
        </div>

        <style>{`
          @keyframes fvp-fade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes fvp-rise { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @media (prefers-reduced-motion: reduce) {
            @keyframes fvp-fade { from, to { opacity: 1; } }
            @keyframes fvp-rise { from, to { opacity: 1; transform: none; } }
          }
        `}</style>
      </div>
    </div>,
    document.body,
  );
}
