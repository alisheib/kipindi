"use client";

/**
 * ChatRoot — mounts the FAB + panel, owns conversation state.
 *
 * Responsibilities:
 *   • Route guard — hide on /auth/* and /admin/* (the surface is for
 *     authenticated players, not the auth funnel or operators).
 *   • Open/close state.
 *   • ESC key closes; click outside the panel closes (desktop only).
 *   • Mobile vs desktop variant based on viewport width.
 *   • Send/receive message lifecycle around the stub (later: live SDK).
 *
 * Mounted once in layout.tsx so the bubble follows the player across
 * every page.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChatBubble } from "./ChatBubble";
import { ChatPanel } from "./ChatPanel";
import type { Message } from "./types";
import { buildUserMessage, sendMessage } from "@/lib/chat/send-message";

const HIDE_ON = /^\/(auth|admin)(\/|$)/;
const MOBILE_BREAKPOINT = 768;

export function ChatRoot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lang, setLang] = useState<"en" | "sw">("en");

  // Mobile detection — recomputed on resize. Initialised on mount
  // (server-render falls back to desktop, which is fine since the
  // bubble isn't visible until interaction).
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ESC closes (when open).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /** Last reply was an unresolved AI text? Track in a ref so we don't
   *  re-render every time it changes — the only consumer is the
   *  auto-escalate decision below, which fires inside `handleSend`. */
  const unresolvedRunRef = useRef(0);

  const handleSend = useCallback(
    async (text: string) => {
      const user = buildUserMessage(text);
      setMessages((prev) => [...prev, user]);
      setLang(user.lang);
      setPending(true);
      try {
        const reply = await sendMessage([...messages, user], text);
        // Per the design spec, surface the escalate-to-support card
        // after 2 consecutive unresolved AI text replies — at that
        // point the bot is clearly not helping and we should hand the
        // user over to the support team.
        // A reply with `unresolved: true` increments the run; any other
        // reply (text_with_citations, rg_redirect, an already-escalate
        // card, even a confident plain-text refusal) resets it.
        const isUnresolved = reply.role === "ai" && reply.kind === "text" && reply.unresolved === true;
        unresolvedRunRef.current = isUnresolved ? unresolvedRunRef.current + 1 : 0;
        const autoEscalate = unresolvedRunRef.current >= 2;
        setMessages((prev) =>
          autoEscalate
            ? [
                ...prev,
                reply,
                {
                  id: `m_esc_${Date.now().toString(36)}`,
                  role: "ai",
                  kind: "escalate",
                  lang: user.lang,
                  ticketId: "HC-" + Math.floor(1000 + Math.random() * 9000),
                  etaMinutes: 4,
                },
              ]
            : [...prev, reply],
        );
        if (autoEscalate) unresolvedRunRef.current = 0;
      } catch {
        // Even on local failures the panel should keep working; surface
        // a benign reply instead of crashing.
        setMessages((prev) => [
          ...prev,
          {
            id: `m_err_${Date.now().toString(36)}`,
            role: "ai",
            kind: "text",
            lang: user.lang,
            text:
              user.lang === "sw"
                ? "Samahani — kuna tatizo dogo. Jaribu tena baada ya muda kidogo."
                : "Sorry — something hiccupped on my end. Try again in a moment.",
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [messages],
  );

  if (pathname && HIDE_ON.test(pathname)) return null;

  // Desktop card click-outside: capture clicks on the backdrop area
  // (we don't render an explicit scrim on desktop, so we attach a
  // window-level listener while open and close on any click that's
  // NOT inside the panel or the bubble).
  return (
    <ChatRootInner
      open={open}
      onToggle={() => setOpen((x) => !x)}
      onClose={() => setOpen(false)}
      isMobile={isMobile}
      lang={lang}
      messages={messages}
      pending={pending}
      onSend={handleSend}
    />
  );
}

function ChatRootInner({
  open,
  onToggle,
  onClose,
  isMobile,
  lang,
  messages,
  pending,
  onSend,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  isMobile: boolean;
  lang: "en" | "sw";
  messages: Message[];
  pending: boolean;
  onSend: (text: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Desktop click-outside (mobile uses a scrim with explicit onClick).
  useEffect(() => {
    if (!open || isMobile) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (bubbleRef.current?.contains(t)) return;
      onClose();
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open, isMobile, onClose]);

  return (
    <>
      {/* Bubble — always rendered when ChatRoot mounts. Positioning
          via fixed coordinates: 16 px from edges, 80 px from bottom
          on mobile (clears the 64 px bottom-nav + 16 px gap). */}
      <div
        ref={bubbleRef}
        style={{
          position: "fixed",
          right: 16,
          bottom: isMobile ? 80 : 16,
          zIndex: 60,
        }}
      >
        <ChatBubble isMobile={isMobile} open={open} onClick={onToggle} />
      </div>

      {/* Mobile sheet scrim — click closes. Desktop has no scrim. */}
      {open && isMobile && (
        <div
          className="cm-scrim"
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 79 }}
          aria-hidden
        />
      )}

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          style={
            isMobile
              ? {
                  position: "fixed",
                  inset: "40px 0 0 0",
                  zIndex: 80,
                }
              : {
                  position: "fixed",
                  right: 32,
                  bottom: 32,
                  zIndex: 70,
                }
          }
        >
          <ChatPanel
            lang={lang}
            messages={messages}
            pending={pending}
            onClose={onClose}
            onSend={onSend}
            variant={isMobile ? "sheet" : "desktop"}
          />
        </div>
      )}
    </>
  );
}
