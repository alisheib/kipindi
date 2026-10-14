"use client";

/** S8's controller. The sheet draws pure frames; only an explicit commit tap calls the existing money action. */
import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition, type ErrorInfo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { flushSync } from "react-dom";
import { buyPositionAction } from "@/app/markets/actions";
import { useT } from "@/lib/i18n";
import { isActionRedirect } from "@/lib/action-redirect";
import { playPressPop } from "@/lib/press-feedback";
import { attributionFrom, pendingBetFrom, readMarker, writeMarker, stakeFromUrl, PENDING_BET_KEY, type PendingBetMarker } from "@/lib/journey/pending-bet";
import { pendingIntents, pendingStorage, PENDING_STORAGE_MAX_BYTES } from "@/lib/journey/sheet-storage";
import { parseSheetSeed } from "@/lib/journey/sheet-seed";
import { sendFunnel } from "@/lib/journey/funnel-beacon";
import { answerOf, refusalOutcome, settleRefusal, type Reread } from "@/lib/journey/sheet-refusal";
import {
  afterKeyRead, afterSettle, clockOffset, estimateMoved, keyReadDelay, nextKey, quoteAt, reopenInDoubt,
  requestFor, sheetEstimate, sheetFrame, sheetOpensOn, sheetPreset, watchdog, withBet, withoutBet,
  type Quote, type Settled, type SheetFrame, type SheetIntent, type SheetSeed, type SheetSide, type SheetViewer, type SheetViewerRead,
} from "@/lib/journey/sheet-state";
import { BetSheet } from "./bet-sheet";
import { VisibleCardRefresh } from "./visible-card-refresh";
import { useExitPhase } from "@/components/ui/modal";

type Active = {
  seed: SheetSeed; side: SheetSide; title: string; stakeText: string; viewer: SheetViewerRead;
  offset: number; serial: number; pathname: string; pushed: boolean; dropSide: boolean;
  settled: Settled | null; estimateUpdated: boolean; lowCounted: boolean;
};
type Pending = { intent: SheetIntent; seed: SheetSeed | null; at: number; everDoubt: boolean; lastRead: number };
type Truth = { reread: Reread; seed: SheetSeed | null; viewer: SheetViewer | null; keyPosition: { positionId: string } | null; title: string | null };
const identity = (q: Pick<Quote, "marketId" | "side">) => `${q.marketId}.${q.side}`;
const activeIdentity = (a: Active) => identity({ marketId: a.seed.id, side: a.side });

/** A render failure reports once and closes the dialog; it cannot take the root layout down or replay an action. */
class SheetBoundary extends Component<{ children: ReactNode; onFailed: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      const body = JSON.stringify({ message: error.message.slice(0, 1_000), stack: `${error.stack ?? ""}\n${info.componentStack ?? ""}`.slice(0, 4_000), path: window.location.pathname, digest: null, build: String((globalThis as { NEXT_DEPLOYMENT_ID?: string }).NEXT_DEPLOYMENT_ID ?? "") || null });
      if (typeof navigator.sendBeacon === "function") navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
      else void fetch("/api/client-error", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
    } catch { /* the page stays usable even when reporting fails */ }
    this.props.onFailed();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

export function BetSheetHost() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { t } = useT();
  const [, startTransition] = useTransition();
  const [active, setActive] = useState<Active | null>(null);
  const { present } = useExitPhase(active !== null);
  const lastView = useRef<{ active: Active; frame: SheetFrame } | null>(null);
  const [now, setNow] = useState(0);
  const [, setRevision] = useState(0);
  const current = useRef<Active | null>(null);
  const pending = useRef(new Map<string, Pending>());
  const closedReceipts = useRef(new Map<string, Settled>());
  const requests = useRef(new Set<string>());
  const readingKeys = useRef(new Set<string>());
  const selected = useRef<PendingBetMarker | null>(null);
  const serial = useRef(0);
  const generation = useRef(0);
  const readSequences = useRef(new Map<string, number>());
  const mounted = useRef(true);
  const lastOdds = useRef(0);
  const pageLoadedAt = useRef(0);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const revise = useCallback(() => { if (mounted.current) setRevision((v) => v + 1); }, []);
  const show = useCallback((value: Active | null) => { current.current = value; if (mounted.current) setActive(value); }, []);
  const save = useCallback(() => {
    if (!mounted.current) return false;
    try {
      const items = [...pending.current.values()].filter((p) => p.intent.phase !== "retry").map((p) => ({ quote: p.intent.quote, key: p.intent.key, at: p.at }));
      const value = pendingStorage(selected.current, items);
      if (value !== null && value.length > PENDING_STORAGE_MAX_BYTES) return false;
      if (value === null) window.sessionStorage.removeItem(PENDING_BET_KEY);
      else window.sessionStorage.setItem(PENDING_BET_KEY, value);
      return true;
    } catch { return false; /* the caller refuses a new commit unless its identity survives a reload */ }
  }, []);
  const stripAddress = useCallback((dropSide: boolean) => {
    if (!mounted.current) return;
    window.history.replaceState(window.history.state, "", window.location.pathname + withoutBet(window.location.search, dropSide) + window.location.hash);
  }, []);

  const readTruth = useCallback(async (quote: Pick<Quote, "marketId" | "side">, options: { key?: string; open?: boolean } = {}): Promise<Truth> => {
    const query = new URLSearchParams({ me: "1", side: quote.side });
    if (options.key) query.set("key", options.key);
    if (options.open) query.set("open", "1");
    const failed: Truth = { reread: { state: "failed" }, seed: null, viewer: null, keyPosition: null, title: null };
    try {
      const response = await fetch(`/api/markets/${encodeURIComponent(quote.marketId)}/sheet?${query}`, { cache: "no-store" });
      if (response.status === 404) return { ...failed, reread: { state: "read", market: { found: false }, viewer: null } };
      if (response.status === 401) {
        if (mounted.current && options.open && current.current?.seed.id === quote.marketId) router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}` as never);
        return failed;
      }
      if (!response.ok) return failed;
      const body = await response.json();
      if (options.key && (!body?.me || !Object.prototype.hasOwnProperty.call(body.me, "keyPosition"))) return failed;
      if (options.key && body.me.keyPosition !== null && !(typeof body.me.keyPosition?.positionId === "string" && body.me.keyPosition.positionId.length > 0 && body.me.keyPosition.positionId.length <= 128)) return failed;
      const keyPosition = typeof body?.me?.keyPosition?.positionId === "string" && body.me.keyPosition.positionId ? { positionId: body.me.keyPosition.positionId } : null;
      // A terminal question still answers a scoped key lookup; it never becomes a new bettable seed.
      if (body?.public === null) return { ...failed, keyPosition, reread: { state: "read", market: { found: false }, viewer: null } };
      const seed = parseSheetSeed({ ...body, v: 1 });
      if (!seed || seed.id !== quote.marketId || !body.me || typeof body.me !== "object") return failed;
      const viewer: SheetViewer = { spendable: typeof body.me.spendable === "number" && Number.isFinite(body.me.spendable) ? body.me.spendable : null, heldSides: Array.isArray(body.me.heldSides) ? body.me.heldSides.filter((s: unknown) => s === "YES" || s === "NO") : [], bonusWager: body.me.bonusWager ?? null, facts: body.me.facts ?? null };
      return { seed, viewer, keyPosition, title: typeof body.title === "string" ? body.title : null, reread: { state: "read", market: { found: true, bettable: seed.bettable }, viewer } };
    } catch { return failed; }
  }, [router]);

  const refreshed = useCallback(async (open = false) => {
    const before = current.current;
    if (!before) return;
    const id = activeIdentity(before);
    const seq = (readSequences.current.get(id) ?? 0) + 1;
    readSequences.current.set(id, seq);
    const truth = await readTruth({ marketId: before.seed.id, side: before.side }, { open });
    const after = current.current;
    if (!mounted.current || !after || after.serial !== before.serial || readSequences.current.get(id) !== seq) return;
    if (truth.seed && truth.viewer) {
      const parsedStake = Number(after.stakeText);
      const moved = estimateMoved({ stake: parsedStake, estimate: sheetEstimate(after.seed, after.side, parsedStake) }, { stake: parsedStake, estimate: sheetEstimate(truth.seed, after.side, parsedStake) });
      const transient = after.settled && ["lowNoRead", "plan", "lossRoom"].includes(after.settled.view.kind);
      show({ ...after, seed: truth.seed, title: truth.title ?? after.title, offset: clockOffset(truth.seed.serverNow, Date.now()), viewer: { state: "read", viewer: truth.viewer }, estimateUpdated: after.estimateUpdated || moved,
        ...(transient && truth.viewer.facts ? { settled: null } : {}) });
    } else if (truth.reread.state === "read" && !truth.reread.market.found) {
      show({ ...after, seed: { ...after.seed, bettable: false } });
    } else show({ ...after, viewer: { state: "failed" } });
  }, [readTruth, show]);

  const receipt = useCallback((record: Pending, positionId: string, replayed: boolean) => {
    if (!mounted.current) return;
    const id = identity(record.intent.quote);
    if (pending.current.get(id)?.intent.key !== record.intent.key) return;
    pending.current.delete(id);
    const a = current.current;
    if (selected.current?.k === record.intent.key) selected.current = null;
    const settled: Settled = { row: replayed ? 24 : 25, reason: null, view: { kind: "receipt", positionId, replayed, quote: record.intent.quote }, retry: "none", doubt: "end", marker: "clear" };
    if (a && activeIdentity(a) === id) {
      stripAddress(a.dropSide);
      show({ ...a, settled, pushed: false, viewer: { state: "loading" } });
    } else {
      // A7: a request can land after its doubtful dialog was closed. The next explicit open shows that receipt
      // once, without retaining its key/address or turning a late answer into another unplaced bet.
      closedReceipts.current.set(id, settled);
    }
    if (!a) {
      // Closing a doubtful sheet may have left its entry in Forward. Retire that entry too: a receipt can never
      // reopen as an unplaced bet, including when its answer arrived while the dialog was closed.
      const bet = pendingBetFrom(window.location.pathname, new URLSearchParams(window.location.search));
      if (bet?.kind === "market" && identity({ marketId: bet.id, side: bet.side }) === id) stripAddress(true);
      window.history.pushState(window.history.state, "", window.location.pathname + window.location.search + window.location.hash);
    }
    save();
    try {
      const watches: unknown = JSON.parse(window.localStorage.getItem("50pick-notify-markets") ?? "[]");
      const ids = Array.isArray(watches) ? watches.filter((v) => typeof v === "string") : [];
      if (!ids.includes(record.intent.quote.marketId)) window.localStorage.setItem("50pick-notify-markets", JSON.stringify([...ids, record.intent.quote.marketId]));
    } catch { /* a display preference never changes a placed bet */ }
    window.dispatchEvent(new Event("50pick:refresh"));
    window.dispatchEvent(new Event("50pick:refresh-notifications"));
    void refreshed();
    revise();
  }, [refreshed, revise, save, show, stripAddress]);

  const readKey = useCallback(async (record: Pending) => {
    if (!mounted.current) return;
    const key = record.intent.key;
    if (readingKeys.current.has(key)) return;
    readingKeys.current.add(key);
    const readAtMs = Date.now();
    record.lastRead = readAtMs;
    try {
      const truth = await readTruth(record.intent.quote, { key });
      if (!mounted.current || pending.current.get(identity(record.intent.quote))?.intent.key !== key || truth.reread.state !== "read") return;
      if (truth.keyPosition) { receipt(record, truth.keyPosition.positionId, true); return; }
      // Only a successful, scoped null lookup after the settle window can retire a lost answer.
      if (afterKeyRead(record.intent, null, readAtMs) === "ended") {
        pending.current.delete(identity(record.intent.quote));
        if (selected.current?.k === key) delete selected.current.k;
        const a = current.current;
        if (a && activeIdentity(a) === identity(record.intent.quote)) show({ ...a, settled: null });
        save(); revise(); void refreshed();
      }
    } finally { readingKeys.current.delete(key); }
  }, [readTruth, receipt, refreshed, revise, save, show]);

  const open = useCallback((seed: SheetSeed, side: SheetSide, title: string, pushed: boolean, dropSide: boolean, origin: string) => {
    const stamp = Date.now();
    const raw = (() => { try { return window.sessionStorage.getItem(PENDING_BET_KEY); } catch { return null; } })();
    const bet = { kind: "market" as const, id: seed.id, side, stake: pendingBetFrom(window.location.pathname, new URLSearchParams(window.location.search))?.stake ?? null };
    const remembered = pending.current.get(identity({ marketId: seed.id, side }));
    const id = identity({ marketId: seed.id, side });
    const received = closedReceipts.current.get(id) ?? null;
    closedReceipts.current.delete(id);
    const stake = received?.view.kind === "receipt" ? received.view.quote.stake : remembered?.intent.quote.stake ?? sheetPreset(seed, stakeFromUrl(bet, raw, stamp));
    if (received) stripAddress(dropSide);
    show({ seed, side, title, stakeText: String(stake), viewer: { state: "loading" }, offset: clockOffset(seed.serverNow, stamp), serial: ++serial.current, pathname: window.location.pathname, pushed: received ? false : pushed, dropSide, settled: received, estimateUpdated: false, lowCounted: false });
    setNow(stamp);
    sendFunnel("sheet_open", origin);
    void refreshed(true);
    if (remembered?.intent.phase === "inDoubt") void readKey(remembered);
  }, [readKey, refreshed, show, stripAddress]);

  const close = useCallback(() => {
    if (!mounted.current) return;
    const a = current.current;
    if (!a) return;
    const record = pending.current.get(activeIdentity(a));
    if (record?.intent.phase === "placing") return;
    show(null); ++generation.current;
    if (a.pushed && a.settled?.view.kind !== "receipt") window.history.back();
    else stripAddress(a.dropSide);
  }, [show, stripAddress]);

  const openAddress = useCallback(async () => {
    const path = window.location.pathname;
    if (!sheetOpensOn(path)) return;
    const q = new URLSearchParams(window.location.search);
    const bet = pendingBetFrom(path, q);
    if (!bet || bet.kind !== "market") return;
    const id = identity({ marketId: bet.id, side: bet.side });
    const shown = current.current;
    if (shown && activeIdentity(shown) === id) {
      // Next may restore the action's canonical address after the receipt first replaced it. Retire that
      // matching entry again when the router commits it; another question's new sheet keeps its address.
      if (shown.settled?.view.kind === "receipt") stripAddress(shown.dropSide);
      return;
    }
    const token = ++generation.current;
    const element = [...document.querySelectorAll<HTMLElement>("[data-sheet]")].find((e) => parseSheetSeed(e.getAttribute("data-sheet"))?.id === bet.id);
    const seed = element ? parseSheetSeed(element.getAttribute("data-sheet")) : null;
    if (seed) { open(seed, bet.side, element?.dataset.sheetTitle ?? "", false, !q.has("bet"), q.get("from") === "home" ? "home" : "board"); return; }
    const truth = await readTruth({ marketId: bet.id, side: bet.side });
    if (!mounted.current || token !== generation.current || path !== window.location.pathname) return;
    if (truth.seed && truth.title) open(truth.seed, bet.side, truth.title, false, !q.has("bet"), q.get("from") === "home" ? "home" : "board");
    else if (truth.reread.state === "read" && !truth.reread.market.found) stripAddress(!q.has("bet"));
  }, [open, readTruth, stripAddress]);

  const commit = useCallback((which: "cta" | "betInstead") => {
    if (!mounted.current) return;
    const a = current.current;
    if (!a) return;
    const old = pending.current.get(activeIdentity(a));
    if (old && requests.current.has(old.intent.key)) return;
    const frame = sheetFrame({ seed: a.seed, side: a.side, stakeText: a.stakeText, viewer: a.viewer, nowMs: Date.now(), offsetMs: a.offset, intent: old?.intent ?? null, settled: a.settled });
    const quote = quoteAt(frame, which);
    if (!quote) return;
    const chosen = nextKey(old?.intent ?? null, quote);
    const fd = requestFor(chosen.quote, chosen.key);
    if (!fd) return;
    const stamp = Date.now();
    const alreadyDoubt = old?.everDoubt === true || old?.intent.phase === "inDoubt";
    const priorSettledAt = alreadyDoubt ? old?.intent.settledAt ?? null : null;
    const record: Pending = { intent: { quote: chosen.quote, key: chosen.key, phase: "placing", sentAt: stamp, settledAt: null }, seed: a.seed, at: old?.at ?? stamp, everDoubt: alreadyDoubt, lastRead: 0 };
    const oldSelected = selected.current;
    pending.current.set(identity(chosen.quote), record);
    requests.current.add(chosen.key); // synchronous: two taps before React's commit still send one action
    const bet = { kind: "market" as const, id: chosen.quote.marketId, side: chosen.quote.side, stake: chosen.quote.stake };
    selected.current = readMarker(writeMarker(bet, stamp, attributionFrom(new URLSearchParams(window.location.search)), chosen.key), stamp);
    if (!save()) {
      requests.current.delete(chosen.key);
      if (old) pending.current.set(identity(chosen.quote), old); else pending.current.delete(identity(chosen.quote));
      selected.current = oldSelected;
      show({ ...a, settled: { row: 3, reason: null, view: { kind: "inline", line: { key: "common.temporarilyUnavailable" } }, retry: "new", doubt: "none", marker: "dropKey" } });
      return;
    }
    window.history.replaceState(window.history.state, "", window.location.pathname + withBet(window.location.search, bet) + window.location.hash);
    show({ ...a, settled: null, stakeText: String(chosen.quote.stake), estimateUpdated: false }); revise();
    startTransition(async () => {
      const answer = await answerOf(() => buyPositionAction(fd));
      if (!mounted.current) return;
      requests.current.delete(chosen.key);
      if (pending.current.get(identity(chosen.quote))?.intent.key !== chosen.key) return;
      const outcome = refusalOutcome(answer);
      const truth = outcome.reread ? await readTruth(chosen.quote) : null;
      if (!mounted.current) return;
      const build = String((globalThis as { NEXT_DEPLOYMENT_ID?: string }).NEXT_DEPLOYMENT_ID ?? "");
      const recoveryKey = `kp:recovered:${window.location.pathname}`;
      let reloadSpent = true;
      try { reloadSpent = !build || window.sessionStorage.getItem(recoveryKey) === build; } catch { /* no durable guard, no reload loop */ }
      const settled = settleRefusal(outcome, truth?.reread ?? { state: "none" }, { inDoubt: record.everDoubt || record.intent.phase === "inDoubt", priorSettledAt, seed: a.seed, quote: chosen.quote, nowMs: Date.now(), offsetMs: a.offset, reloadSpent });
      if (settled.view.kind === "receipt") { receipt(record, settled.view.positionId, settled.view.replayed); return; }
      const next = afterSettle(record.intent, settled, Date.now());
      if (next) { record.intent = next; record.everDoubt ||= next.phase === "inDoubt"; }
      else pending.current.delete(identity(chosen.quote));
      if (settled.marker === "dropKey" && selected.current?.k === chosen.key) delete selected.current.k;
      save();
      const live = current.current;
      if (live && activeIdentity(live) === identity(chosen.quote)) {
        show({ ...live, settled, ...(truth?.seed ? { seed: truth.seed } : {}), ...(truth?.viewer ? { viewer: { state: "read" as const, viewer: truth.viewer } } : {}) });
      }
      revise();
      if (outcome.frame === "redirect" && answer.kind === "rejected" && isActionRedirect(answer.error)) { show(null); return; }
      if (outcome.frame === "skew" && !reloadSpent) {
        try { window.sessionStorage.setItem(recoveryKey, build); window.location.reload(); } catch { /* the unavailable frame stays on screen */ }
        return;
      }
      if (next?.phase === "inDoubt") void readKey(record);
    });
  }, [readKey, readTruth, receipt, revise, save, show]);

  const deposit = useCallback((amount?: number) => {
    if (!mounted.current) return;
    const a = current.current;
    if (!a) return;
    const frame = sheetFrame({ seed: a.seed, side: a.side, stakeText: a.stakeText, viewer: a.viewer, nowMs: Date.now(), offsetMs: a.offset, intent: pending.current.get(activeIdentity(a))?.intent ?? null, settled: a.settled });
    const offer = frame.low?.deposit;
    if (!offer || frame.stake === null || frame.stakeLocked) return;
    const chosen = amount ?? offer.amount;
    // Only amounts the engine offered may be chosen by a rendered deposit row.
    if (chosen !== offer.amount && !offer.chips?.includes(chosen)) return;
    const bet = { kind: "market" as const, id: a.seed.id, side: a.side, stake: frame.stake };
    const stamp = Date.now();
    selected.current = readMarker(writeMarker(bet, stamp, attributionFrom(new URLSearchParams(window.location.search))), stamp);
    window.history.replaceState(window.history.state, "", window.location.pathname + withBet(window.location.search, bet) + window.location.hash);
    save(); show(null);
    const query = new URLSearchParams({ amount: String(chosen), bet: `${bet.id}.${bet.side}.${bet.stake}`, from: "low-balance" });
    router.push(`/wallet/deposit?${query}` as never);
  }, [router, save, show]);

  useEffect(() => {
    mounted.current = true; pageLoadedAt.current = Date.now();
    try {
      const raw = window.sessionStorage.getItem(PENDING_BET_KEY);
      selected.current = readMarker(raw, pageLoadedAt.current);
      for (const stored of pendingIntents(raw, pageLoadedAt.current)) pending.current.set(identity(stored.quote), { intent: reopenInDoubt(stored.quote, stored.key, pageLoadedAt.current), seed: null, at: stored.at, everDoubt: true, lastRead: 0 });
    } catch { /* tab storage can be disabled */ }
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-bet-side]") : null;
      const box = anchor?.closest<HTMLElement>("[data-sheet]");
      const side = anchor?.dataset.betSide;
      const seed = box && parseSheetSeed(box.getAttribute("data-sheet"));
      if (!anchor || !box || !seed || !seed.bettable || (side !== "YES" && side !== "NO") || anchor.target && anchor.target !== "_self" || !sheetOpensOn(window.location.pathname)) return;
      const href = new URL(anchor.href, window.location.href);
      if (href.origin !== window.location.origin) return;
      event.preventDefault();
      playPressPop(anchor);
      const bet = { kind: "market" as const, id: seed.id, side: side as SheetSide, stake: null };
      window.history.pushState(window.history.state, "", window.location.pathname + withBet(window.location.search, bet) + window.location.hash);
      // The native capture listener supplies the public frame before downstream click work resumes.
      flushSync(() => open(seed, side, box.dataset.sheetTitle ?? "", true, false, box.dataset.sheetOrigin ?? "card"));
    };
    const pop = () => {
      const a = current.current;
      const record = a && pending.current.get(activeIdentity(a));
      const bet = pendingBetFrom(window.location.pathname, new URLSearchParams(window.location.search));
      if (a && !bet) {
        if (record?.intent.phase === "placing") {
          const quote = record.intent.quote;
          window.history.pushState(window.history.state, "", window.location.pathname + withBet(window.location.search, { kind: "market", id: quote.marketId, side: quote.side, stake: quote.stake }));
        } else show(null);
      } else void openAddress();
    };
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void refreshed();
      for (const record of pending.current.values()) if (record.intent.phase === "inDoubt") void readKey(record);
    };
    const odds = (event: Event) => {
      const a = current.current;
      const marketId = (event as CustomEvent<{ marketId?: string }>).detail?.marketId;
      if (!a || marketId !== a.seed.id || Date.now() - lastOdds.current < 2_000) return;
      lastOdds.current = Date.now(); void refreshed();
    };
    let lastTruth = 0;
    const interval = setInterval(() => {
      const stamp = Date.now();
      if (current.current) setNow(stamp);
      for (const record of pending.current.values()) {
        const next = watchdog(record.intent, stamp);
        if (next !== record.intent) { record.intent = next; record.everDoubt = true; save(); revise(); }
        if (document.visibilityState === "visible" && record.intent.phase === "inDoubt" && stamp - record.lastRead >= keyReadDelay(record.intent.settledAt ?? record.intent.sentAt ?? pageLoadedAt.current, stamp)) void readKey(record);
      }
      if (document.visibilityState === "visible" && current.current && stamp - lastTruth >= 10_000) { lastTruth = stamp; void refreshed(); }
    }, 250);
    window.addEventListener("click", click, true);
    window.addEventListener("popstate", pop);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("50pick:sse:market-odds", odds);
    window.addEventListener("50pick:sse:wallet-balance", refresh);
    void openAddress(); refresh();
    return () => {
      mounted.current = false; ++generation.current; clearInterval(interval);
      window.removeEventListener("click", click, true); window.removeEventListener("popstate", pop);
      window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("50pick:sse:market-odds", odds); window.removeEventListener("50pick:sse:wallet-balance", refresh);
    };
  }, [open, openAddress, readKey, refreshed, revise, save, show]);

  useEffect(() => {
    const a = current.current;
    if (a && a.pathname !== pathname) { show(null); ++generation.current; }
    if (sheetOpensOn(pathname)) void openAddress();
  }, [pathname, search, openAddress, show]);

  const record = active ? pending.current.get(activeIdentity(active)) : null;
  const frame = active ? sheetFrame({ seed: active.seed, side: active.side, stakeText: active.stakeText, viewer: active.viewer, nowMs: now, offsetMs: active.offset, intent: record?.intent ?? null, settled: active.settled }) : null;
  if (active && frame) lastView.current = { active, frame };
  // Only a drawing survives the kit's exit beat. Current intent, address and focus close immediately.
  const view = active && frame ? { active, frame } : present ? lastView.current : null;
  useEffect(() => {
    const a = current.current;
    if (a && frame?.frame === "low" && !a.lowCounted) {
      show({ ...a, lowCounted: true }); sendFunnel("low_balance", "sheet"); void refreshed();
    }
  }, [frame?.frame, refreshed, show]);

  return <>
    <VisibleCardRefresh sheetOpen={active !== null} />
    {view && <SheetBoundary key={view.active.serial} onFailed={() => { if (current.current?.serial === view.active.serial) { stripAddress(view.active.dropSide); show(null); } }}>
      <BetSheet open={active !== null} seed={view.active.seed} side={view.active.side} title={view.active.title || t.common.temporarilyUnavailable} frame={view.frame}
        stakeText={view.active.stakeText} estimateUpdated={view.active.estimateUpdated}
        railNames={view.active.viewer.state === "read" ? view.active.viewer.viewer.facts?.deposit.railNames ?? [] : []}
        onStakeChange={(value) => { const a = current.current; const intent = a && pending.current.get(activeIdentity(a))?.intent; if (a && a.serial === view.active.serial && intent?.phase !== "placing" && intent?.phase !== "inDoubt") show({ ...a, stakeText: value, settled: null, estimateUpdated: false }); }}
        onPlace={() => { if (current.current?.serial === view.active.serial) commit("cta"); }}
        onBetInstead={() => { if (current.current?.serial === view.active.serial) commit("betInstead"); }}
        onDeposit={(amount) => { if (current.current?.serial === view.active.serial) deposit(amount); }}
        onClose={() => { if (current.current?.serial === view.active.serial) close(); }} />
    </SheetBoundary>}
  </>;
}
