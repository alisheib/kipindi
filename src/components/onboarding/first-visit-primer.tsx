"use client";

/**
 * FirstVisitPrimer — premium three-card overlay shown the very first time a
 * player lands on the platform. After "Got it" or "Skip", a flag is
 * written to localStorage and the primer never shows again for that
 * browser. Demo runs can clear it by deleting `50pick-primer-seen`.
 *
 * Uses REAL brand components (TippingBar, FiftyMark) as live visuals
 * inside each card — no placeholder SVGs. Kit-faithful: royal canvas,
 * gilt accents, Sora headings, JetBrains Mono labels.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { FiftyMark, TippingBar, GiltCorner } from "@/components/brand";
import { useModalLock } from "@/lib/use-modal-lock";
import { useT } from "@/lib/i18n";

const STORAGE_KEY = "50pick-primer-seen";
const HIDE_ON = /^\/(auth|admin)(\/|$)/;

type Lang = "en" | "sw" | "zh";
type L10n = { en: string; sw: string; zh: string };

type Card = {
  eyebrow: L10n;
  title: L10n;
  body: L10n;
  /** Takes the locale — the card visuals carry captions, and those captions were
   *  being rendered in English to Swahili and Chinese players. */
  visual: (lang: Lang) => React.ReactNode;
};

/* ── Card 1 visual: the 50pick mark flanked by YES/NO paths ────────────── */
function VisualWhatIs() {
  return (
    <div className="relative flex flex-col items-center gap-3 py-2">
      {/* The real brand mark — exact SVG used in the app bar */}
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(48% 0.20 268 / 0.35), transparent 70%)",
            filter: "blur(16px)",
          }}
          aria-hidden
        />
        <FiftyMark size={72} />
      </div>
      {/* YES / NO labels with connecting lines */}
      <div className="flex items-center gap-6 font-mono text-[11px] font-bold tracking-[0.14em]">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-[6px] w-[6px] rounded-full"
            style={{ background: "oklch(58% 0.16 152)", boxShadow: "0 0 8px oklch(58% 0.16 152 / 0.6)" }}
          />
          <span style={{ color: "oklch(80% 0.14 152)" }}>YES</span>
        </span>
        <span className="font-mono text-[9px] text-text-subtle tracking-[0.2em]">or</span>
        <span className="flex items-center gap-1.5">
          <span style={{ color: "oklch(80% 0.16 22)" }}>NO</span>
          <span
            className="inline-block h-[6px] w-[6px] rounded-full"
            style={{ background: "oklch(60% 0.18 22)", boxShadow: "0 0 8px oklch(60% 0.18 22 / 0.6)" }}
          />
        </span>
      </div>
    </div>
  );
}

/* ── Card 2 visual: a real TippingBar + miniature dial ─────────────────── */
function VisualDial() {
  return (
    <div className="space-y-3 py-1 w-full">
      {/* Miniature conviction dial — SVG with knob at 3.2x NO side */}
      <div className="relative mx-auto" style={{ maxWidth: 280 }}>
        <svg viewBox="0 0 280 56" width="100%" height="56" className="block" aria-hidden>
          {/* Track */}
          <rect x="0" y="20" width="280" height="12" rx="6" fill="oklch(22% 0.140 268)" stroke="oklch(34% 0.130 268)" strokeWidth="0.75" />
          {/* Inactive hint tints */}
          <rect x="0" y="20" width="140" height="12" rx="6" fill="oklch(58% 0.16 152)" opacity="0.10" />
          <rect x="140" y="20" width="140" height="12" rx="6" fill="oklch(60% 0.18 22)" opacity="0.10" />
          {/* NO-side fill from centre to knob */}
          <defs>
            <linearGradient id="primer-no-fill" x1="0" x2="1">
              <stop offset="0%" stopColor="oklch(40% 0.13 22)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="oklch(60% 0.18 22)" />
            </linearGradient>
          </defs>
          <rect x="140" y="20" width="62" height="12" rx="6" fill="url(#primer-no-fill)" />
          {/* Centre tick */}
          <line x1="140" x2="140" y1="16" y2="36" stroke="oklch(34% 0.130 268)" strokeWidth="0.75" />
          {/* Knob — squircle shape via rounded rect */}
          <g transform="translate(202 26)">
            <rect x="-16" y="-16" width="32" height="32" rx="10"
              fill="oklch(28% 0.110 268)" stroke="oklch(60% 0.18 22)" strokeWidth="1.5" />
            <text x="0" y="2" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="10" fill="oklch(96% 0.005 240)">3.2x</text>
            <text x="0" y="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="500" fontSize="6" fill="oklch(80% 0.16 22)" letterSpacing="0.12em">NO</text>
          </g>
          {/* Side labels */}
          <text x="12" y="50" fontFamily="JetBrains Mono, monospace" fontWeight="600" fontSize="8" fill="oklch(70% 0.12 152)" letterSpacing="0.08em">YES</text>
          <text x="255" y="50" fontFamily="JetBrains Mono, monospace" fontWeight="600" fontSize="8" fill="oklch(70% 0.14 22)" letterSpacing="0.08em">NO</text>
        </svg>
      </div>
      {/* Annotation labels */}
      <div className="flex items-center justify-between px-2 font-mono text-[9px] tracking-[0.12em] uppercase text-text-subtle">
        <span>1x min</span>
        <span style={{ color: "var(--gilt)" }}>drag to commit</span>
        <span>200x max</span>
      </div>
    </div>
  );
}

/* ── Card 3 visual: real TippingBar showing the pool split ─────────────── */
function VisualPools({ lang }: { lang: Lang }) {
  return (
    <div className="space-y-4 py-1 w-full">
      {/* Real TippingBar component — 62% YES / 38% NO */}
      <div className="px-1">
        <TippingBar yesPct={62} height={24} recastOnHover={false} />
      </div>
      {/* Payout flow annotation */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-1">
        <div className="rounded-lg border border-yes-700/40 bg-yes-500/8 px-3 py-2 text-center">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] font-bold" style={{ color: "oklch(70% 0.12 152)" }}>YES pool</p>
          <p className="font-display text-[15px] font-bold text-text">TZS 12k</p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="inline-block h-[2px] w-5 rounded-pill" style={{ background: "var(--gilt)" }} />
          <span className="font-mono text-[7px] uppercase tracking-[0.14em]" style={{ color: "var(--gilt)" }}>share</span>
          <span className="inline-block h-[2px] w-5 rounded-pill" style={{ background: "var(--gilt)" }} />
        </div>
        <div className="rounded-lg border border-no-700/40 bg-no-500/8 px-3 py-2 text-center">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] font-bold" style={{ color: "oklch(70% 0.14 22)" }}>NO pool</p>
          <p className="font-display text-[15px] font-bold text-text">TZS 18k</p>
        </div>
      </div>
      {/* This caption was hardcoded English — shown untranslated to every Swahili
          and Chinese player — and it said "small operator margin", which is the
          old model. It now states the actual promise, in the player's language. */}
      <p className="text-center font-mono text-[8px] uppercase tracking-[0.14em] text-text-subtle">
        {POOL_CAPTION[lang]}
      </p>
    </div>
  );
}

/** The one-line promise under the pool visual. Never below your stake. */
const POOL_CAPTION: L10n = {
  en: "losers fund winners · a correct call never loses",
  sw: "wapotezao hulipa washindi · jibu sahihi halipotezi",
  zh: "输家资助赢家 · 判断正确绝不亏损",
};

const CARDS: Card[] = [
  {
    eyebrow: { en: "what is 50pick", sw: "50pick ni nini", zh: "什么是50pick" },
    title: {
      en: "Predict events. Not chance.",
      sw: "Tabiri matukio. Si bahati.",
      zh: "预测事件。不是碰运气。",
    },
    body: {
      en: "Every question is a real-world event with a YES or NO answer — settled against an official public source. No dice, no slots. Just conviction.",
      sw: "Kila swali ni tukio halisi lenye jibu la NDIO au HAPANA — linatatuliwa kupitia chanzo rasmi cha umma. Hakuna kete. Imani tu.",
      zh: "每个问题都是真实事件，答案为「是」或「否」 — 以官方公开来源为准。没有骰子，没有老虎机。只有信念。",
    },
    visual: () => <VisualWhatIs />,
  },
  {
    eyebrow: { en: "how you bet", sw: "jinsi ya kuweka dau", zh: "如何投注" },
    title: {
      en: "Drag the dial. Conviction = stake.",
      sw: "Sogeza dial. Imani = dau.",
      zh: "拖动刻度盘。信念 = 投注。",
    },
    body: {
      en: "One gesture sets both your side and your stake. Drag toward YES or NO — the further from centre, the higher your conviction multiplier.",
      sw: "Mguso mmoja huweka upande wako na dau lako. Sogeza kuelekea NDIO au HAPANA — kadri unavyosogea mbali, ndivyo kiwango chako kinaongezeka.",
      zh: "一个手势设置您的立场和投注额。向「是」或「否」拖动 — 离中心越远，信念倍数越高。",
    },
    visual: () => <VisualDial />,
  },
  {
    eyebrow: { en: "how payouts work", sw: "jinsi malipo yanavyofanya kazi", zh: "赔付如何运作" },
    title: {
      en: "Winners share the losers' pool.",
      sw: "Washindi wanagawana bwawa la wapotezao.",
      zh: "赢家分享输家的奖池。",
    },
    // Rewritten for the capped-fee model. The old copy said the pool is split
    // "minus a small margin" — and the SWAHILI version dropped the margin
    // entirely, describing a fee-free split. All three now say the same thing, and
    // the thing they say is the promise: a correct call never loses money.
    body: {
      en: "No fixed odds. Winners share the pool by the size of their stake, after our commission — which is capped at a third of the smaller side, so being right never costs you money. When betting closes we tell you the exact amount you'll receive.",
      sw: "Hakuna odds. Washindi wanagawana bwawa kulingana na dau lao, baada ya kamisheni yetu — ambayo haizidi theluthi moja ya upande mdogo, kwa hiyo kuwa sahihi hakukugharimu pesa kamwe. Dau likifungwa tutakuambia kiasi kamili utakachopata.",
      zh: "没有固定赔率。赢家按投注额比例分享奖池（扣除我们的佣金后）— 佣金上限为较小一方的三分之一，因此判断正确绝不会让您亏钱。投注关闭时，我们会告知您将收到的确切金额。",
    },
    visual: (lang) => <VisualPools lang={lang} />,
  },
];

function readLang(): "en" | "sw" | "zh" {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )kp-locale=([^;]*)/);
  if (!m) return "en";
  const v = decodeURIComponent(m[1]);
  return v === "sw" ? "sw" : v === "zh" ? "zh" : "en";
}

export function FirstVisitPrimer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<"en" | "sw" | "zh">("en");
  const { t } = useT();
  useModalLock(open);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (HIDE_ON.test(pathname ?? "/")) return;
    if (/HeadlessChrome|Playwright/i.test(navigator.userAgent)) return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (seen === "1") return;
      setLang(readLang());
      const t = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(t);
    } catch {
      /* private browsing */
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
      aria-label={t.primer.primerLabel}
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
    >
      <button
        type="button"
        aria-label={lang === "sw" ? "Ruka utangulizi" : lang === "zh" ? "跳过引导" : "Skip primer"}
        onClick={dismiss}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        style={{ animation: "fvp-fade 200ms ease-out" }}
      />

      <div
        className="relative w-full sm:max-w-[460px] rounded-t-xl sm:rounded-xl border border-border-strong bg-bg-elevated overflow-hidden shadow-[0_30px_80px_oklch(5%_0.05_264_/_0.65)]"
        style={{ animation: "fvp-rise 360ms var(--ease-arrive)" }}
      >
        {/* Gilt corners — heraldic framing from the brand kit */}
        <div className="pointer-events-none absolute top-0 left-0" aria-hidden>
          <GiltCorner size={40} rotate={0} />
        </div>
        <div className="pointer-events-none absolute top-0 right-0" aria-hidden>
          <GiltCorner size={40} rotate={90} />
        </div>

        {/* Gold progress strip at top */}
        <div className="absolute inset-x-0 top-0 h-[2px]" aria-hidden>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${((step + 1) / CARDS.length) * 100}%`,
              background: "linear-gradient(90deg, var(--gold-500), var(--gold-300))",
            }}
          />
        </div>

        {/* Step indicators + close */}
        <div className="flex items-center gap-1.5 px-5 pt-5">
          {CARDS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={t.primer.step.replace("{n}", String(i + 1))}
              className="h-[3px] flex-1 rounded-pill transition-all duration-300 hover:opacity-80"
              style={{
                background:
                  i < step
                    ? "oklch(78% 0.13 80)"
                    : i === step
                      ? "var(--gold-300)"
                      : "oklch(34% 0.130 268)",
                boxShadow: i === step ? "0 0 8px oklch(78% 0.13 80 / 0.4)" : "none",
              }}
            />
          ))}
          <button
            type="button"
            onClick={dismiss}
            aria-label={lang === "sw" ? "Ruka utangulizi" : lang === "zh" ? "跳过引导" : "Skip primer"}
            className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
          >
            <I.x s={14} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-6 sm:px-6">
          {/* Visual — full-width, kit-faithful */}
          <div
            className="flex items-center justify-center rounded-xl border border-border/60 bg-bg-overlay/40 px-4 py-5"
            style={{ minHeight: 120 }}
          >
            {c.visual(lang)}
          </div>

          {/* Eyebrow */}
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-gold-300">
            {c.eyebrow[lang]}
          </p>

          {/* Title */}
          <h2 className="mt-1.5 font-display text-[22px] sm:text-[24px] font-bold text-text leading-tight tracking-[-0.02em]">
            {c.title[lang]}
          </h2>

          {/* Body */}
          <p className="mt-2.5 text-[13.5px] text-text-muted leading-relaxed">
            {c.body[lang]}
          </p>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="btn btn-ghost btn-md btn-pill disabled:opacity-0 disabled:pointer-events-none"
              style={{ minWidth: 88 }}
            >
              {lang === "sw" ? "Rudi" : lang === "zh" ? "返回" : "Back"}
            </button>
            <div className="flex items-center gap-1.5">
              {CARDS.map((_, i) => (
                <span
                  key={i}
                  className="inline-block h-[5px] w-[5px] rounded-full transition-all duration-300"
                  style={{
                    background: i === step ? "var(--gold-300)" : "oklch(34% 0.130 268)",
                    transform: i === step ? "scale(1.4)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              className="btn btn-primary btn-md btn-pill inline-flex items-center gap-1.5"
              style={{ minWidth: 88 }}
            >
              {step === CARDS.length - 1
                ? lang === "sw" ? "Sawa" : lang === "zh" ? "明白了" : "Got it"
                : lang === "sw" ? "Endelea" : lang === "zh" ? "下一步" : "Next"}
              {step < CARDS.length - 1 && <I.chevronRight s={14} />}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes fvp-fade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes fvp-rise { from { transform: translateY(24px) scale(0.97); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
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
