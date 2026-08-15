"use client";

/**
 * PushSettings (F4) — explicit opt-in to browser push.
 *
 * COMPLIANCE: push is only ever enabled by a deliberate user action here. We ask
 * the browser for permission ONLY on that click (never on page load — an
 * unprompted permission dialog is a dark pattern). Opting out removes the
 * subscription server-side, so we stop sending immediately.
 *
 * Honest states: unsupported browser, permission blocked, and "not configured"
 * (no VAPID key on this deploy) are each surfaced truthfully rather than showing
 * a toggle that silently does nothing.
 */
import { useEffect, useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { registerServiceWorker, subscribeToPush } from "@/lib/register-sw";
import { savePushSubscriptionAction, deletePushSubscriptionAction, pushStatusAction } from "@/app/_actions/notifications";

type State = "loading" | "unsupported" | "blocked" | "unconfigured" | "off" | "on";

export function PushSettings() {
  const { t } = useT();
  const { toast } = useToast();
  const [state, setState] = useState<State>("loading");
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) { setState("unconfigured"); return; }
      if (Notification.permission === "denied") { setState("blocked"); return; }
      const status = await pushStatusAction().catch(() => ({ ok: false, devices: 0 }));
      setState(status.devices > 0 ? "on" : "off");
    })();
  }, []);

  function enable() {
    start(async () => {
      try {
        const reg = await registerServiceWorker();
        if (!reg) { setState("unsupported"); return; }
        const sub = await subscribeToPush(reg);
        if (!sub) {
          // Either permission was refused, or no VAPID key is configured.
          setState(Notification.permission === "denied" ? "blocked" : "unconfigured");
          return;
        }
        const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) { setState("off"); return; }
        const r = await savePushSubscriptionAction({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
        // FEEDBACK LAW (DESIGN_AUTHORITY §F) — warning severity, in the FACTUAL register:
        // the switch did not take, nothing else changed, and re-flicking it is the remedy.
        // The body is what "Couldn't update push notifications." never said.
        if (!r.ok) { toast({ title: t.push.errOnTitle, description: t.push.errOnBody, variant: "factual" }); setState("off"); return; }
        setState("on");
        toast({ title: t.push.enabledToast, variant: "success" });
      } catch {
        toast({ title: t.push.errOnTitle, description: t.push.errOnBody, variant: "factual" });
        setState("off");
      }
    });
  }

  function disable() {
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          // 🔴 THE SERVER'S ANSWER USED TO BE THROWN AWAY. This was
          // `deletePushSubscriptionAction(...).catch(() => {})` with no read of `r.ok`,
          // and the action returns `{ ok: false }` on a lapsed session or an empty
          // endpoint. So a player whose session had expired tapped OFF, the row stayed
          // in the database, and the panel told them "Push notifications off" while the
          // server went on pushing to this device. That is a false statement on a CONSENT
          // surface — the one place the product promises it will stop.
          const r = await deletePushSubscriptionAction(sub.endpoint).catch(() => ({ ok: false as const }));
          await sub.unsubscribe().catch(() => {});
          if (!r.ok) {
            // Stay ON: the subscription is still live server-side, and showing the switch
            // off would repeat the lie one render later.
            setState("on");
            toast({ title: t.push.errOffTitle, description: t.push.errOffBody, variant: "factual" });
            return;
          }
        }
        setState("off");
        toast({ title: t.push.disabledToast, variant: "success" });
      } catch {
        toast({ title: t.push.errOffTitle, description: t.push.errOffBody, variant: "factual" });
      }
    });
  }

  const hint =
    state === "unsupported" ? t.push.unsupported
    : state === "blocked" ? t.push.blocked
    : state === "unconfigured" ? t.push.unconfigured
    : t.push.body;

  const interactive = state === "on" || state === "off";

  return (
    <section className="rounded-xl glass-panel p-5">
      <p className="gilt-eyebrow mb-1">{t.push.eyebrow}</p>
      <p className="mb-4 text-[12.5px] text-text-subtle">{t.push.sectionHint}</p>
      <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-brand-300">
            <I.bellRing s={17} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[14px] font-semibold text-text leading-tight">{t.push.title}</p>
            <p className="mt-0.5 text-[12px] text-text-subtle leading-snug">{hint}</p>
          </div>
        </div>
        {interactive ? (
          <Toggle
            on={state === "on"}
            disabled={pending}
            onClick={() => (state === "on" ? disable() : enable())}
            aria-label={t.push.title}
          />
        ) : (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint">
            {state === "loading" ? "…" : t.push.na}
          </span>
        )}
      </div>
    </section>
  );
}
