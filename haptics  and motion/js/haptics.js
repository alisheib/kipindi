/* 50pick — haptics runtime (browser port of src/lib/haptics.ts)
   Powers the live Lab demo. The canonical TS version is shown verbatim in the
   "Code to ship" drawer; this keeps parity with it.

   Principles:
   - Restraint. Haptics are punctuation, not a drumbeat.
   - Feature-detect navigator.vibrate; no-op silently where unsupported (iOS).
   - User-disablable + respects reduced-motion-adjacent "reduce" intent.
   - Default ON for money/outcome moments, OFF for routine taps. */

(function () {
  "use strict";

  // ---- Haptic tokens — exact vibrate() patterns (ms) ----------------------
  // A coherent family. Light → heavy; celebrate is a restrained heraldic
  // flourish (a "seal stamp" cadence), never an arcade buzz.
  var PATTERNS = {
    tap:       [10],                          // routine, OFF by default
    select:    [14],                          // chip / toggle / segmented
    confirm:   [18, 28, 18],                  // a definite double-knock "done"
    success:   [22, 36, 60],                  // settling, rising
    warning:   [30, 50, 30],                  // even, "pay attention"
    error:     [60, 40, 60],                  // blunt, twice
    celebrate: [16, 28, 22, 28, 36, 28, 80],  // building flourish — the peak
  };

  // Which tokens are ON by default. Routine taps/selects stay quiet.
  var DEFAULT_ENABLED = {
    tap: false, select: false,
    confirm: true, success: true, warning: true, error: true, celebrate: true,
  };

  var STORE_KEY = "50pick:feedback";

  function loadPrefs() {
    var d = { haptics: true, motion: "system", perToken: Object.assign({}, DEFAULT_ENABLED) };
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        d.haptics = p.haptics !== false;
        d.motion = p.motion || "system";
        if (p.perToken) d.perToken = Object.assign(d.perToken, p.perToken);
      }
    } catch (e) {}
    return d;
  }

  var prefs = loadPrefs();

  function savePrefs() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch (e) {}
    apply();
  }

  // Reduced motion: explicit setting wins; else fall back to the OS query.
  function motionReduced() {
    if (prefs.motion === "off") return true;        // "off" = reduce motion
    if (prefs.motion === "on") return false;
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  function supported() {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  }

  // ---- Core fire --------------------------------------------------------
  function fire(token) {
    var pattern = PATTERNS[token];
    if (!pattern) return { fired: false, reason: "unknown" };
    if (!prefs.haptics) return { fired: false, reason: "haptics-off" };
    if (prefs.perToken[token] === false) return { fired: false, reason: "token-off" };
    if (!supported()) return { fired: false, reason: "unsupported" };
    try {
      navigator.vibrate(pattern);
      return { fired: true, pattern: pattern };
    } catch (e) {
      return { fired: false, reason: "error" };
    }
  }

  // Named sugar — what product code calls.
  var haptics = {
    tap:       function () { return fire("tap"); },
    select:    function () { return fire("select"); },
    confirm:   function () { return fire("confirm"); },
    success:   function () { return fire("success"); },
    warning:   function () { return fire("warning"); },
    error:     function () { return fire("error"); },
    celebrate: function () { return fire("celebrate"); },
    // utility
    fire: fire,
    patterns: PATTERNS,
    supported: supported,
    isOn: function (token) {
      if (!prefs.haptics) return false;
      return prefs.perToken[token] !== false;
    },
  };

  // ---- Prefs surface (the Lab + the real Settings card both use this) ----
  function apply() {
    // Reflect "reduce motion" by toggling a root attribute the page honors
    // (the CSS @media query still governs OS-level; this is the in-app switch).
    document.documentElement.toggleAttribute("data-reduce-motion", motionReduced());
    document.documentElement.toggleAttribute("data-haptics-off", !prefs.haptics);
    window.dispatchEvent(new CustomEvent("50pick:prefs", { detail: prefs }));
  }

  window.haptics = haptics;
  window.feedbackPrefs = {
    get: function () { return JSON.parse(JSON.stringify(prefs)); },
    setHaptics: function (v) { prefs.haptics = !!v; savePrefs(); },
    setMotion: function (v) { prefs.motion = v; savePrefs(); },           // "system" | "on" | "off"
    setToken: function (token, v) { prefs.perToken[token] = !!v; savePrefs(); },
    motionReduced: motionReduced,
    apply: apply,
    PATTERNS: PATTERNS,
  };

  // Apply on load.
  if (document.readyState !== "loading") apply();
  else document.addEventListener("DOMContentLoaded", apply);
})();
