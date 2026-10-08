/**
 * A MINIMAL HOOKS HOST, AND A FAKE CLOCK — what `test:campaign-visuals` V13–V15 run the live page's REAL hooks on.
 *
 * ⭐ WHY (the U47b-2 review's MINOR 3: "execute the hook wiring, not greps"). `renderToStaticMarkup` runs a component once, on
 * the server's dispatcher: effects never run, state never changes, so `useLiveDriver`'s cleanup, its `live` flag, its wake-ups and
 * the presses' double-click guard could only be GREPPED — and a grep cannot tell a guard that works from a comment about one.
 * This host gives React's own `useState` / `useRef` / `useEffect` / `useCallback` / `useMemo` / `useContext` / `useTransition` a
 * dispatcher of its own (React 19 resolves every hook through `ReactSharedInternals.H`), re-renders on a state change, runs an
 * effect's cleanup before its next run and on unmount, compares deps as React does, and — on request — runs React's DEVELOPMENT
 * double-run (mount, clean up, mount again: StrictMode, which the app runs in). It is not React: no reconciler, no DOM, no
 * transitions, no suspense. It is enough to call a hook the way React does and watch what it does.
 * ⛔ A STATE SETTER CALLED AFTER UNMOUNT IS COUNTED (`staleSets`), never applied: a hook that sets state after its page left is a
 * leak React would have warned about, and V13 requires zero.
 *
 * `fakeClock()` replaces `setTimeout`, `clearTimeout` and `Date.now` for the span of a claim, and `advance(ms)` runs the due
 * timers in order, letting every promise they started settle between them — so a 30-second wait costs no time and its length is
 * measured, not slept. `restore()` MUST be called (a `try/finally` in the claim): the rest of the suite runs on the real clock.
 * ⛔ No backslash in this file (an editing tool decodes them).
 */
import React from "react";

type Dispatcher = Record<string, unknown>;
const INTERNALS = (React as unknown as Record<string, { H: Dispatcher | null }>).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

type EffectSlot = { kind: "effect"; deps: readonly unknown[] | undefined; create: () => void | (() => void); cleanup: void | (() => void); pending: boolean };
type Slot =
  | { kind: "state"; value: unknown }
  | { kind: "ref"; ref: { current: unknown } }
  | { kind: "memo"; deps: readonly unknown[] | undefined; value: unknown }
  | EffectSlot;

const sameDeps = (a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean =>
  a !== undefined && b !== undefined && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

/** What a mounted hook gives the test. */
export type MountedHook<R> = {
  /** The hook's latest return value. */
  result: () => R;
  /** How many times it has rendered. */
  renders: () => number;
  /** Render again with new props (an effect whose deps changed runs its cleanup, then again). */
  rerender: (props: unknown) => void;
  /** Leave the page: every effect's cleanup runs; a setter called afterwards is counted, never applied. */
  unmount: () => void;
  /** Let queued re-renders and their effects run. */
  flush: () => Promise<void>;
  /** State setters called after unmount (the leak React warns about). */
  staleSets: () => number;
};

export type HostOptions = {
  /** React's development double-run of effects on mount: run, clean up, run again. */
  strict?: boolean;
  /** What `useContext(ctx)` answers for a context; any other answers the context's own default. */
  contexts?: Map<unknown, unknown>;
};

/** Mount `use` (a hook, or a component's function) on the host. */
export function mountHook<P, R>(use: (props: P) => R, initialProps: P, o: HostOptions = {}): MountedHook<R> {
  const slots: Slot[] = [];
  let props = initialProps;
  let cursor = 0;
  let last: R;
  let renders = 0;
  let mounted = true;
  let dirty = false;
  let queued = false;
  let stale = 0;
  let first = true;

  const dispatcher: Dispatcher = {
    useState: (init: unknown) => {
      const i = cursor++;
      if (slots[i] === undefined) slots[i] = { kind: "state", value: typeof init === "function" ? (init as () => unknown)() : init };
      const slot = slots[i] as { kind: "state"; value: unknown };
      const set = (v: unknown) => {
        if (!mounted) { stale++; return; }
        const next = typeof v === "function" ? (v as (p: unknown) => unknown)(slot.value) : v;
        if (Object.is(next, slot.value)) return;
        slot.value = next;
        schedule();
      };
      return [slot.value, set];
    },
    useRef: (init: unknown) => {
      const i = cursor++;
      if (slots[i] === undefined) slots[i] = { kind: "ref", ref: { current: init } };
      return (slots[i] as { kind: "ref"; ref: { current: unknown } }).ref;
    },
    useMemo: (make: () => unknown, deps?: readonly unknown[]) => {
      const i = cursor++;
      const slot = slots[i] as { kind: "memo"; deps: readonly unknown[] | undefined; value: unknown } | undefined;
      if (slot !== undefined && sameDeps(slot.deps, deps)) return slot.value;
      const value = make();
      slots[i] = { kind: "memo", deps, value };
      return value;
    },
    useCallback: (fn: unknown, deps?: readonly unknown[]) => {
      const i = cursor++;
      const slot = slots[i] as { kind: "memo"; deps: readonly unknown[] | undefined; value: unknown } | undefined;
      if (slot !== undefined && sameDeps(slot.deps, deps)) return slot.value;
      slots[i] = { kind: "memo", deps, value: fn };
      return fn;
    },
    useEffect: (create: () => void | (() => void), deps?: readonly unknown[]) => {
      const i = cursor++;
      const slot = slots[i] as EffectSlot | undefined;
      if (slot === undefined) {
        slots[i] = { kind: "effect", deps, create, cleanup: undefined, pending: true };
      } else if (!sameDeps(slot.deps, deps)) {
        slot.deps = deps;
        slot.create = create;
        slot.pending = true;
      }
    },
    useContext: (ctx: { _currentValue?: unknown }) => (o.contexts?.has(ctx) ? o.contexts.get(ctx) : ctx._currentValue),
    useTransition: () => [false, (fn: () => unknown) => { void fn(); }],
    useDebugValue: () => undefined,
  };

  const commit = () => {
    const pending = slots.filter((s): s is EffectSlot => s.kind === "effect" && s.pending);
    for (const e of pending) { if (typeof e.cleanup === "function") e.cleanup(); e.cleanup = undefined; }
    for (const e of pending) { e.pending = false; e.cleanup = e.create(); }
    if (first) {
      first = false;
      if (o.strict) {
        // React's development double-run: every effect is cleaned up and run again, with the same closures.
        const all = slots.filter((s): s is EffectSlot => s.kind === "effect");
        for (const e of all) { if (typeof e.cleanup === "function") e.cleanup(); e.cleanup = undefined; }
        for (const e of all) e.cleanup = e.create();
      }
    }
  };

  const render = () => {
    const was = INTERNALS.H;
    INTERNALS.H = dispatcher;
    cursor = 0;
    try {
      last = use(props);
      renders++;
    } finally {
      INTERNALS.H = was;
    }
    commit();
  };

  function schedule() {
    dirty = true;
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (dirty && mounted) { dirty = false; render(); }
    });
  }

  render();

  return {
    result: () => last,
    renders: () => renders,
    rerender: (p) => { props = p as P; render(); },
    unmount: () => {
      if (!mounted) return;
      mounted = false;
      for (const s of slots) {
        if (s.kind === "effect" && typeof s.cleanup === "function") s.cleanup();
        if (s.kind === "effect") s.cleanup = undefined;
      }
    },
    flush: async () => {
      for (let i = 0; i < 6; i++) await new Promise<void>((resolve) => setImmediate(resolve));
    },
    staleSets: () => stale,
  };
}

/* ══ THE FAKE CLOCK ═════════════════════════════════════════════════════════════════════════════════════════════════ */

export type FakeClock = {
  /** The clock's now, in ms (what `Date.now()` answers while it is installed). */
  now: () => number;
  /** Timers still waiting (a hook that left must leave none). */
  pending: () => number;
  /** Move time forward, running every timer that comes due in order and letting what each started settle. */
  advance: (ms: number) => Promise<void>;
  /** Put the real clock back. ⛔ Always in a `finally`. */
  restore: () => void;
};

const real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, now: Date.now };

export function fakeClock(start = 1_000_000_000_000): FakeClock {
  let t = start;
  let seq = 1;
  const timers = new Map<number, { at: number; fn: () => void; seq: number }>();
  const settle = async () => {
    for (let i = 0; i < 4; i++) await new Promise<void>((resolve) => setImmediate(resolve));
  };
  globalThis.setTimeout = ((fn: () => void, ms?: number) => {
    const id = seq++;
    timers.set(id, { at: t + Math.max(0, Number(ms) || 0), fn, seq: id });
    return id as unknown as ReturnType<typeof setTimeout>;
  }) as unknown as typeof setTimeout;
  globalThis.clearTimeout = ((id: unknown) => { timers.delete(id as number); }) as unknown as typeof clearTimeout;
  Date.now = () => t;
  return {
    now: () => t,
    pending: () => timers.size,
    advance: async (ms: number) => {
      const target = t + ms;
      await settle();
      for (;;) {
        let next: { id: number; at: number; fn: () => void; seq: number } | null = null;
        for (const [id, tm] of timers) {
          if (tm.at <= target && (next === null || tm.at < next.at || (tm.at === next.at && tm.seq < next.seq))) next = { id, ...tm };
        }
        if (next === null) break;
        timers.delete(next.id);
        t = Math.max(t, next.at);
        next.fn();
        await settle();
      }
      t = target;
      await settle();
    },
    restore: () => {
      globalThis.setTimeout = real.setTimeout;
      globalThis.clearTimeout = real.clearTimeout;
      Date.now = real.now;
    },
  };
}
