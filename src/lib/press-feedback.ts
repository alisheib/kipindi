/** Play the kit's actual press-pop without leaving a class on React-owned markup. */
const presses = new WeakMap<HTMLElement, Animation>();

export function playPressPop(element: HTMLElement): void {
  presses.get(element)?.cancel();
  presses.delete(element);
  let frames: Keyframe[] | null = null;
  let timing: EffectTiming | null = null;
  try {
    element.classList.remove("press-pop");
    element.classList.add("press-pop");
    const animation = element.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === "press-pop");
    const effect = animation?.effect as KeyframeEffect | null;
    if (effect) { frames = effect.getKeyframes(); timing = effect.getTiming(); }
  } catch { /* The button's normal pressed state still works where animation APIs are unavailable. */ }
  finally { element.classList.remove("press-pop"); }
  // The temporary class is gone before another render/hydration can observe the node. Both the keyframes and
  // timing came from the stylesheet, including its reduced-motion gates; no second motion definition lives here.
  if (!frames || !timing) return;
  try {
    const animation = element.animate(frames, timing);
    presses.set(element, animation);
    const root = element.ownerDocument.documentElement;
    const media = element.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
    const stopForCalm = () => {
      if (media?.matches || root.classList.contains("kp-reduce-motion") || root.getAttribute("data-motion") === "minimal") animation.cancel();
    };
    let observer: MutationObserver | null = null;
    void animation.finished.catch(() => undefined).then(() => {
      observer?.disconnect();
      media?.removeEventListener("change", stopForCalm);
      if (presses.get(element) === animation) presses.delete(element);
    });
    // CSS clamps cannot reach a copied WAAPI effect. Stop an existing pulse when the reader changes either gate.
    // The throttled "reduced" tier still permits the kit's discrete feedback, as it does for CSS press-pop.
    if (typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(stopForCalm);
      observer.observe(root, { attributes: true, attributeFilter: ["class", "data-motion"] });
    }
    media?.addEventListener("change", stopForCalm);
  } catch { /* A motion failure never delays opening the question or sheet. */ }
}
