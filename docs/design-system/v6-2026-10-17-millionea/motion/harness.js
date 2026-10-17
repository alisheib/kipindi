/* Maswali Millionea · motion prototype harness.
   This script ONLY: adds or removes classes · sets the runtime custom properties from one measurement before a run ·
   forces a restart with one layout read · listens for animationend. The locale switch toggles the HTML `hidden`
   attribute (a UA state, no stylesheet rule and no timing) — see DECISIONS.md D-M5.
   No requestAnimationFrame, setInterval, setTimeout or Web Animations API anywhere. */
(function () {
  var html = document.documentElement;
  function setOn(b, on) { b.classList.toggle('btn-primary', on); b.classList.toggle('btn-ghost', !on); }
  function restart(el, classes) {
    classes.forEach(function (c) { el.classList.remove(c); });
    void el.offsetWidth; /* the one layout read that forces the restart */
    classes.forEach(function (c) { el.classList.add(c); });
  }
  function measureCarry(token, from) {
    /* FLIP: the token is laid out at its END position; one measurement gives the offset back to where it came from */
    var a = from.getBoundingClientRect(), b = token.getBoundingClientRect();
    token.style.setProperty('--carry-dx', (a.left + a.width / 2 - (b.left + b.width / 2)) + 'px');
    token.style.setProperty('--carry-dy', (a.top + a.height / 2 - (b.top + b.height / 2)) + 'px');
    token.style.setProperty('--carry-s', (a.width / b.width).toFixed(3));
  }
  /* "#id:class" adds class to #id · "#id:show" / "#id:hide" toggle the UA hidden attribute · a bare token acts on the element itself */
  function applyThen(el) {
    el.getAttribute('data-then').split(/\s+/).forEach(function (pair) { if (!pair) return; var i = pair.indexOf(':'); var tgt = i > 0 ? document.querySelector(pair.slice(0, i)) : el; var c = i > 0 ? pair.slice(i + 1) : pair; if (!tgt || !c) return; if (c === 'show') tgt.hidden = false; else if (c === 'hide') tgt.hidden = true; else tgt.classList.add(c); });
  }
  function clamped() { return html.classList.contains('kp-reduce-motion') || html.getAttribute('data-motion') === 'minimal'; }
  function arm(scope) {
    /* elements that change state when their animation ends */
    scope.querySelectorAll('[data-then]').forEach(function (el) {
      if (el.__armed) return; el.__armed = true;
      el.addEventListener('animationend', function (e) {
        if (e.target !== el) return;
        applyThen(el);
      });
    });
  }
  function run() {
    document.querySelectorAll('[data-reset]').forEach(function (el) { el.getAttribute('data-reset').split(/\s+/).forEach(function (c) { if (c) el.classList.remove(c); }); });
    document.querySelectorAll('[data-reset-on]').forEach(function (el) { el.getAttribute('data-reset-on').split(/\s+/).forEach(function (c) { if (c) el.classList.add(c); }); });
    var carriers = document.querySelectorAll('[data-carry-from]');
    carriers.forEach(function (tok) { var from = document.querySelector(tok.getAttribute('data-carry-from')); if (from) measureCarry(tok, from); });
    document.querySelectorAll('[data-init-hidden]').forEach(function (el) { el.hidden = true; });
    document.querySelectorAll('[data-init-shown]').forEach(function (el) { el.hidden = false; });
    document.querySelectorAll('[data-anim]').forEach(function (el) { restart(el, el.getAttribute('data-anim').split(/\s+/)); });
    /* under either clamp no animationend will fire, so the end states are applied directly: the last frame is the layout */
    if (clamped()) document.querySelectorAll('[data-then]').forEach(applyThen);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-replay')) { run(); }
    if (b.hasAttribute('data-reduce')) { var on = html.classList.toggle('kp-reduce-motion'); if (on) html.setAttribute('data-motion', 'minimal'); else html.removeAttribute('data-motion'); setOn(b, on); run(); }
    if (b.hasAttribute('data-lowend')) { var low = html.getAttribute('data-motion') === 'reduced'; if (low) html.removeAttribute('data-motion'); else { html.classList.remove('kp-reduce-motion'); html.setAttribute('data-motion', 'reduced'); } setOn(b, !low); run(); }
    if (b.hasAttribute('data-loc')) { var L = b.getAttribute('data-loc'); document.querySelectorAll('[data-loc-text]').forEach(function (el) { el.hidden = el.getAttribute('data-loc-text') !== L; }); document.querySelectorAll('button[data-loc]').forEach(function (x) { setOn(x, x === b); }); }
    if (b.hasAttribute('data-play-once')) { run(); }
  });
  arm(document);
  document.querySelectorAll('[data-loc-text]').forEach(function (el) { el.hidden = el.getAttribute('data-loc-text') !== 'sw'; });
  if (!document.body.hasAttribute('data-no-autoplay')) run();
})();
