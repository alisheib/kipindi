/* 50pick — Motion & Reward Lab: render + interaction engine. */
(function () {
  "use strict";
  var D = window.LabData, H = window.haptics, P = window.feedbackPrefs, BI = window.BadgeIcons;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function retrigger(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }

  /* ---------- Brand mark (port of FiftyMark) ---------- */
  function fiftyMark(size) {
    var tilt = -14, r = 50, cx = 50, cy = 50;
    var rad = (tilt * Math.PI) / 180, dx = Math.sin(rad) * 80, dy = Math.cos(rad) * 80;
    var top = { x: cx + dx, y: cy - dy }, bot = { x: cx - dx, y: cy + dy };
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" style="display:block" aria-label="50pick">' +
      '<defs><clipPath id="fcM"><circle cx="50" cy="50" r="49"/></clipPath></defs>' +
      '<g clip-path="url(#fcM)">' +
        '<path d="M ' + top.x + ' ' + top.y + ' A 50 50 0 0 0 ' + bot.x + ' ' + bot.y + ' L ' + top.x + ' ' + top.y + ' Z" fill="oklch(58% 0.16 152)"/>' +
        '<path d="M ' + top.x + ' ' + top.y + ' A 50 50 0 0 1 ' + bot.x + ' ' + bot.y + ' L ' + top.x + ' ' + top.y + ' Z" fill="oklch(60% 0.18 22)"/>' +
        '<line x1="' + top.x + '" y1="' + top.y + '" x2="' + bot.x + '" y2="' + bot.y + '" stroke="oklch(78% 0.13 86)" stroke-width="2" stroke-linecap="round"/>' +
        '<text x="50" y="52" text-anchor="middle" dominant-baseline="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="30" fill="oklch(99% 0.006 268)" style="letter-spacing:-0.04em">50</text>' +
        '<circle cx="50" cy="50" r="1.6" fill="oklch(85% 0.13 86)"/>' +
      '</g>' +
      '<circle cx="50" cy="50" r="49" fill="none" stroke="oklch(48% 0.20 268)" stroke-width="2"/>' +
      '<circle cx="50" cy="50" r="47.6" fill="none" stroke="oklch(78% 0.13 86)" stroke-width="0.5" opacity="0.55"/>' +
      '</svg>';
  }
  function wordmark(size) {
    return '<span style="display:inline-flex;align-items:baseline;font-family:Sora,sans-serif;font-weight:700;font-size:' + size + 'px;letter-spacing:-0.025em;color:var(--pearl-50);line-height:1;border-bottom:2px solid oklch(78% 0.13 86);padding-bottom:3px;">' +
      '50pick<span style="font-family:JetBrains Mono,monospace;font-weight:500;font-size:' + (size * 0.52) + 'px;margin-left:' + (size * 0.08) + 'px;opacity:0.62;">.tz</span></span>';
  }

  /* ---------- Badge coin ---------- */
  function badgeCoin(id, state, opts) {
    opts = opts || {};
    var size = opts.size || "md";
    var wrap = el("div", "badge-coin-wrap");
    var coin = el("div", "badge badge--" + state + " badge-" + size);
    if (state === "progress" && opts.progress) {
      var pct = Math.min(1, opts.progress.value / opts.progress.max);
      var R = 30, C = 2 * Math.PI * R;
      var ring = el("div");
      ring.innerHTML = '<svg class="badge-progress-ring" viewBox="0 0 64 64" aria-hidden="true">' +
        '<circle class="badge-ring-track" cx="32" cy="32" r="' + R + '" stroke-width="2.5"/>' +
        '<circle class="badge-ring-arc" cx="32" cy="32" r="' + R + '" stroke-width="2.5" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct)) + '"/></svg>';
      coin.appendChild(ring.firstChild);
    }
    var icon = el("div");
    icon.innerHTML = BI.iconSvg(id);
    icon.style.cssText = "width:58%;height:58%;display:grid;place-items:center;";
    coin.appendChild(icon);
    if (opts.progress && opts.progress.tier) {
      coin.appendChild(el("span", "badge-tier-pip", opts.progress.tier));
    }
    wrap.appendChild(coin);
    return wrap;
  }

  /* ===================== 01 · HAPTICS ===================== */
  function renderHaptics() {
    var host = $("#hapticRows");
    D.HAPTIC_TOKENS.forEach(function (t) {
      var pat = H.patterns[t.token];
      var row = el("div", "hrow");
      // name
      var name = el("div");
      name.innerHTML = '<div class="hrow-name">' + t.label + '<span class="sw">' + t.sw + '</span></div>' +
        '<div class="hrow-desc">' + t.desc + '</div>' +
        '<div class="hrow-pattern">vibrate([' + pat.join(", ") + '])' + (t.defaultOn ? '' : ' · OFF by default') + '</div>';
      // visualizer
      var vizCell = el("div");
      var viz = el("div", "hviz");
      var track = el("div", "hviz-track");
      var total = sum(pat), acc = 0;
      var bars = [];
      pat.forEach(function (seg, i) {
        var leftPct = (acc / total) * 100, wPct = (seg / total) * 100;
        if (i % 2 === 0) { // buzz
          var b = el("div", "hviz-bar");
          b.style.left = leftPct + "%";
          b.style.width = Math.max(2.5, wPct) + "%";
          track.appendChild(b); bars.push({ el: b, start: acc, end: acc + seg });
        }
        acc += seg;
      });
      var playhead = el("div", "hviz-playhead");
      var dot = el("div", "hviz-dot");
      track.appendChild(playhead); track.appendChild(dot);
      viz.appendChild(track); vizCell.appendChild(viz);
      // fire button
      var btnCell = el("div");
      var btn = el("button", "btn btn-ghost btn-sm", "Feel it");
      btn.addEventListener("click", function () {
        playViz(t.token, pat, total, bars, dot, playhead);
        retrigger(btn, "press-pop");
      });
      btnCell.appendChild(btn);
      row.appendChild(name); row.appendChild(vizCell); row.appendChild(btnCell);
      host.appendChild(row);
    });
  }

  var vizRaf = null;
  function playViz(token, pat, total, bars, dot, playhead) {
    if (H[token]) H[token]();                 // actually vibrate if enabled + supported
    if (vizRaf) cancelAnimationFrame(vizRaf);
    var reduce = P.motionReduced();
    if (reduce) {                              // flash whole pattern once, no scrub
      bars.forEach(function (b) { b.el.classList.add("buzz"); });
      dot.classList.add("beat");
      setTimeout(function () { bars.forEach(function (b) { b.el.classList.remove("buzz"); }); dot.classList.remove("beat"); }, 220);
      return;
    }
    playhead.style.opacity = "1";
    var start = performance.now();
    function frame(now) {
      var t = now - start, x = Math.min(1, t / total);
      playhead.style.left = (x * 100) + "%";
      var inBuzz = false;
      bars.forEach(function (b) {
        var on = t >= b.start && t <= b.end;
        b.el.classList.toggle("buzz", on);
        if (on) inBuzz = true;
      });
      dot.classList.toggle("beat", inBuzz);
      if (t < total) { vizRaf = requestAnimationFrame(frame); }
      else {
        playhead.style.opacity = "0";
        bars.forEach(function (b) { b.el.classList.remove("buzz"); });
        dot.classList.remove("beat");
      }
    }
    vizRaf = requestAnimationFrame(frame);
  }

  function renderEventMap() {
    var tb = $("#eventMap");
    tb.innerHTML = "<thead><tr><th>Area</th><th>Event</th><th>Pattern</th><th>Note</th></tr></thead>";
    var body = el("tbody");
    D.EVENT_MAP.forEach(function (r) {
      var tr = el("tr");
      tr.innerHTML =
        '<td><span class="grp">' + r.group + '</span></td>' +
        '<td><span class="ev">' + r.event + '</span><span class="ev-sw">' + r.sw + '</span></td>' +
        '<td><span class="token-pill" data-t="' + r.token + '">' + r.token + '</span></td>' +
        '<td>' + (r.note || "") + '</td>';
      body.appendChild(tr);
    });
    tb.appendChild(body);
  }

  /* ===================== 02 · MICRO-MOTION ===================== */
  function tween(from, to, ms, cb, done) {
    var start = performance.now();
    function f(now) {
      var t = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - t, 4);
      cb(Math.round(from + (to - from) * e));
      if (t < 1) requestAnimationFrame(f); else if (done) done();
    }
    requestAnimationFrame(f);
  }

  var demoBuilders = {
    press: function (stage) {
      stage.innerHTML = '<div style="display:flex;gap:10px;align-items:center;"><button class="btn btn-primary btn-md">Place · Weka</button><span class="chip chip-yes">YES 62%</span></div>';
      var b = $(".btn", stage), c = $(".chip", stage);
      return function () { retrigger(b, "press-pop"); retrigger(c, "press-pop"); H.tap(); };
    },
    stagger: function (stage) {
      var rows = ["Bunge passes the bill?", "TZS hits 2,400/USD?", "Simba win the league?", "Rain in Dodoma Friday?"];
      var list = el("div"); list.style.cssText = "display:flex;flex-direction:column;gap:7px;width:100%;max-width:240px;";
      rows.forEach(function (r) {
        var it = el("div"); it.style.cssText = "padding:8px 11px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-elevated);font-size:12px;color:var(--text-muted);";
        it.textContent = r; list.appendChild(it);
      });
      stage.appendChild(list);
      function run() { $$("div", list).forEach(function (it, i) { it.style.setProperty("--i", i); retrigger(it, "stagger-item"); }); }
      run(); return run;
    },
    tabs: function (stage) {
      var wrap = el("div"); wrap.style.cssText = "position:relative;width:100%;max-width:260px;";
      wrap.innerHTML = '<div class="tabset"><button class="active">Open</button><button>Live</button><button>Resolved</button><span class="tab-indicator"></span></div>';
      stage.appendChild(wrap);
      var tabs = $$(".tabset button", wrap), ind = $(".tab-indicator", wrap);
      function move(t) {
        tabs.forEach(function (x) { x.classList.remove("active"); }); t.classList.add("active");
        ind.style.setProperty("--x", t.offsetLeft + "px");
        ind.style.setProperty("--w", t.offsetWidth + "px");
        H.select();
      }
      tabs.forEach(function (t) { t.addEventListener("click", function () { move(t); }); });
      setTimeout(function () { move(tabs[0]); }, 60);
      var idx = 0;
      return function () { idx = (idx + 1) % tabs.length; move(tabs[idx]); };
    },
    vote: function (stage) {
      var n = 128;
      var w = el("div"); w.style.cssText = "display:flex;align-items:center;gap:14px;";
      w.innerHTML = '<button class="btn btn-ghost btn-sm" data-v="up" aria-label="Upvote">▲</button>' +
        '<span class="value-roll" style="font-size:20px;color:var(--text);min-width:46px;text-align:center;">' + n + '</span>' +
        '<button class="btn btn-ghost btn-sm" data-v="down" aria-label="Downvote">▼</button>';
      stage.appendChild(w);
      var count = $(".value-roll", w);
      function vote(dir, arrow) { n += dir; count.textContent = n; retrigger(count, "value-flash"); retrigger(arrow, "vote-pop"); H.select(); }
      $$("button", w).forEach(function (a) { a.addEventListener("click", function () { vote(a.dataset.v === "up" ? 1 : -1, a); }); });
      return function () { var a = $('[data-v="up"]', w); vote(1, a); };
    },
    toggle: function (stage) {
      var sw = el("div", "kp-switch"); sw.setAttribute("role", "switch"); sw.setAttribute("aria-checked", "false"); sw.setAttribute("tabindex", "0");
      sw.innerHTML = '<span class="kp-thumb"></span>';
      var lbl = el("span"); lbl.style.cssText = "margin-left:12px;font-size:13px;color:var(--text-muted);";
      lbl.textContent = "Notify on resolve";
      var w = el("div"); w.style.cssText = "display:flex;align-items:center;"; w.appendChild(sw); w.appendChild(lbl);
      stage.appendChild(w);
      function toggle() { var on = sw.getAttribute("aria-checked") === "true"; sw.setAttribute("aria-checked", String(!on)); H.select(); }
      sw.addEventListener("click", toggle);
      sw.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } });
      return function () { toggle(); };
    },
    value: function (stage) {
      var pool = 1840000;
      var w = el("div"); w.style.cssText = "text-align:center;";
      w.innerHTML = '<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-subtle);">Pool · Dimbwi</div>' +
        '<div class="value-roll" style="font-size:26px;font-weight:700;color:var(--text);margin-top:4px;">TZS <span class="num">' + fmt(pool) + '</span></div>';
      stage.appendChild(w);
      var numEl = $(".num", w), rollEl = $(".value-roll", w);
      return function () {
        var from = pool, delta = Math.round((40000 + Math.random() * 90000));
        pool += delta;
        tween(from, pool, 600, function (v) { numEl.textContent = fmt(v); });
        retrigger(rollEl, "value-flash");
        var d = el("span", "value-delta"); d.textContent = "+" + fmt(delta);
        d.style.cssText = "margin-left:8px;font-family:var(--font-mono);font-size:11px;color:var(--yes-300);";
        rollEl.appendChild(d); setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 850);
      };
    },
    check: function (stage) {
      var len = 24;
      var w = el("div"); w.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:8px;";
      w.innerHTML = '<div class="check-draw" style="--len:' + len + ';"><svg width="60" height="60" viewBox="0 0 48 48" fill="none">' +
        '<circle class="check-ring" cx="24" cy="24" r="20" stroke="var(--gilt)" stroke-width="2.5" opacity="0.5"/>' +
        '<path class="check-tick" d="M15 24 l6 7 l12 -15" stroke="var(--gilt)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg></div><span style="font-size:12px;color:var(--text-muted);">Proposal submitted · Imewasilishwa</span>';
      stage.appendChild(w);
      return function () { var c = $(".check-draw", w); retrigger($(".check-ring", c), "_"); c.classList.remove("check-draw"); void c.offsetWidth; c.classList.add("check-draw"); H.success(); };
    },
    route: function (stage) {
      var w = el("div", "route-enter"); w.style.cssText = "width:100%;max-width:230px;display:flex;flex-direction:column;gap:7px;";
      w.innerHTML = '<div style="height:13px;border-radius:5px;background:var(--bg-elevated);border:1px solid var(--border);width:60%;"></div>' +
        '<div style="height:36px;border-radius:8px;background:var(--bg-elevated);border:1px solid var(--border);"></div>' +
        '<div style="height:36px;border-radius:8px;background:var(--bg-elevated);border:1px solid var(--border);"></div>';
      stage.appendChild(w);
      return function () { retrigger(w, "route-enter"); };
    },
    skeleton: function (stage) {
      var w = el("div", "demo-skel"); w.style.cssText = "width:80%;";
      function showSkel() {
        w.innerHTML = '<div class="skeleton" style="height:13px;width:55%;margin-bottom:8px;"></div>' +
          '<div class="skeleton" style="height:34px;width:100%;border-radius:8px;"></div>';
      }
      function showContent() {
        w.innerHTML = '<div class="content-fade-in"><div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Mwanza derby · 18:00</div>' +
          '<div style="padding:8px 11px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);font-size:12px;color:var(--text);">YES 58% · NO 42%</div></div>';
      }
      stage.appendChild(w); showContent();
      return function () { showSkel(); setTimeout(showContent, 900); };
    },
  };

  function renderAnimGallery() {
    var host = $("#animGallery");
    D.ANIMATIONS.forEach(function (a) {
      var tile = el("div", "demo-tile");
      var stage = el("div", "demo-stage");
      var replayBtn = el("button", "btn btn-ghost btn-sm replay-btn", "↻ Replay");
      stage.appendChild(replayBtn);
      tile.appendChild(stage);
      var meta = el("div", "demo-meta");
      meta.innerHTML = '<div class="demo-title"><span class="n">' + (a.n < 10 ? "0" + a.n : a.n) + '</span>' + a.title + '</div>' +
        '<dl class="demo-spec">' +
        '<dt>Keyframe</dt><dd><code>' + a.keyframe + '</code></dd>' +
        '<dt>Tokens</dt><dd>' + a.tokens + '</dd>' +
        '<dt>Trigger</dt><dd>' + a.trigger + '</dd>' +
        '<dt>Haptic</dt><dd>' + (a.haptic === "—" ? "—" : '<span class="token-pill" data-t="' + a.haptic + '">' + a.haptic + '</span>') + '</dd>' +
        '</dl>';
      tile.appendChild(meta);
      host.appendChild(tile);
      var run = demoBuilders[a.demo](stage);
      replayBtn.addEventListener("click", function () { run(); retrigger(replayBtn, "press-pop"); });
    });
  }

  /* ===================== 03 · BADGES ===================== */
  function badgeById(id) { for (var i = 0; i < D.BADGES.length; i++) if (D.BADGES[i].id === id) return D.BADGES[i]; }

  function renderBadgeStates() {
    var host = $("#badgeStates");
    host.style.cssText += "display:flex;gap:36px;flex-wrap:wrap;align-items:flex-start;justify-content:center;";
    var states = [
      { state: "locked", title: "Locked", sw: "Imefungwa", desc: "Ghosted outline. The goal is visible, not hidden.", opts: {} },
      { state: "progress", title: "In progress", sw: "Inaendelea", desc: "Gilt ring fills; count shows below.", opts: { progress: { value: 14, max: 20 } } },
      { state: "unlocked", title: "Unlocked", sw: "Imefunguliwa", desc: "Full gilt, earned glow.", opts: {} },
    ];
    states.forEach(function (s) {
      var cell = el("div"); cell.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;max-width:150px;";
      var coin = badgeCoin("sharp", s.state, Object.assign({ size: "lg" }, s.opts));
      cell.appendChild(coin);
      if (s.opts.progress) { var c = el("div", "badge-count", s.opts.progress.value + " / " + s.opts.progress.max); cell.appendChild(c); }
      cell.appendChild(el("div", "settings-label", s.title + '<span class="sw" style="font-weight:400">' + s.sw + "</span>"));
      cell.appendChild(el("div", "settings-desc", s.desc));
      host.appendChild(cell);
    });
  }

  function shelfCell(b, override) {
    var state = override ? override.state : "unlocked";
    var cell = el("div", "badge-cell");
    var coin = badgeCoin(b.id, state, { size: "md", progress: override && override.progress });
    cell.appendChild(coin);
    if (override && override.progress && !override.progress.tier) {
      cell.appendChild(el("div", "badge-count", override.progress.value + "/" + override.progress.max));
    }
    cell.appendChild(el("div", "badge-cap", b.name + '<span class="sw">' + b.sw + "</span>"));
    cell.appendChild(el("div", "badge-rarity", b.rarity));
    cell.addEventListener("click", function () { if (state === "unlocked") fireUnlock(b.id); });
    return cell;
  }

  function renderShelves() {
    var ship = $("#shipShelf"), soon = $("#soonShelf");
    D.BADGES.filter(function (b) { return b.ship; }).forEach(function (b) {
      var ov = b.tiered ? { state: "unlocked" } : { state: "unlocked" };
      ship.appendChild(shelfCell(b, ov));
    });
    D.BADGES.filter(function (b) { return !b.ship; }).forEach(function (b) {
      soon.appendChild(shelfCell(b, { state: "locked" }));
    });
  }

  function renderProfile() {
    var p = D.PROFILE, host = $("#profileMock");
    var head = el("div", "profile-head");
    head.innerHTML =
      '<span class="avatar avatar-lg" style="background:linear-gradient(135deg,oklch(54% 0.18 258),oklch(28% 0.15 258));box-shadow:0 0 0 1px color-mix(in oklab,var(--gilt) 30%,transparent) inset;">' + p.initials + '</span>' +
      '<div class="profile-meta" style="flex:1;min-width:200px;">' +
        '<div style="display:flex;align-items:center;gap:8px;"><span class="settings-label" style="font-size:18px;">' + p.name + '</span><span class="tier-badge tier-' + p.tier + '">G</span></div>' +
        '<div style="font-size:12px;color:var(--text-subtle);font-family:var(--font-mono);">' + p.handle + ' · Lvl ' + p.level + ' ' + p.levelLabel + '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-top:10px;">' +
          '<div class="xp-rail" style="flex:1;max-width:260px;"><div class="xp-fill" style="width:0%"></div></div>' +
          '<span class="badge-count">' + p.xp + ' / ' + p.xpMax + ' XP</span>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">' +
        '<span class="streak-rail"><span class="streak-flame">⟁</span> ' + p.streak + '-day streak</span>' +
        '<span class="badge-count">Accuracy ' + p.accuracy + '%</span>' +
      '</div>';
    host.appendChild(head);
    host.appendChild(el("div", "gilt-rule"));
    var shelfWrap = el("div"); shelfWrap.innerHTML = '<p class="gilt-eyebrow" style="margin-bottom:14px;">Achievements · Mafanikio</p>';
    var shelf = el("div", "badge-shelf");
    p.shelf.forEach(function (it) { shelf.appendChild(shelfCell(badgeById(it.id), it)); });
    shelfWrap.appendChild(shelf); host.appendChild(shelfWrap);
    setTimeout(function () { $(".xp-fill", host).style.width = (p.xp / p.xpMax * 100) + "%"; }, 200);
  }

  function renderLeaderboard() {
    var host = $("#lbRow"), p = D.PROFILE;
    var row = el("div", "lb-row");
    row.innerHTML = '<span class="badge-count" style="font-size:13px;">#3</span>' +
      '<span class="avatar avatar-sm" style="background:linear-gradient(135deg,oklch(54% 0.18 248),oklch(28% 0.15 248));">' + p.initials + '</span>' +
      '<span style="flex:1;min-width:0;font-size:13px;color:var(--text);">' + p.name + '</span>' +
      '<span class="tier-badge tier-gold">G</span>' +
      '<span class="lb-badges"></span>' +
      '<span class="badge-count">' + p.accuracy + '%</span>';
    var cluster = $(".lb-badges", row);
    ["first-win", "sharp", "verified"].forEach(function (id) { cluster.appendChild(badgeCoin(id, "unlocked", { size: "sm" }).firstChild); });
    host.appendChild(row);
  }

  /* ----- Achievement unlock toast ----- */
  function fireUnlock(id) {
    var b = badgeById(id); if (!b) return;
    H.celebrate();
    var mount = $("#toastMount");
    var card = el("div", "badge-unlock-card toast");
    card.style.cssText = "display:flex;align-items:center;gap:16px;border-color:var(--border-gold);pointer-events:auto;background:var(--bg-elevated);box-shadow:var(--shadow-royal);";
    var coinWrap = el("div"); coinWrap.style.cssText = "position:relative;display:grid;place-items:center;";
    if (!P.motionReduced()) {
      var rays = el("span", "badge-unlock-rays");
      rays.style.cssText = "position:absolute;inset:-10px;border-radius:50%;background:conic-gradient(from 0deg, transparent, color-mix(in oklab, var(--gilt) 45%, transparent), transparent 40%);";
      coinWrap.appendChild(rays);
    }
    var coinAnim = el("span", "badge-unlock-coin");
    coinAnim.appendChild(badgeCoin(id, "unlocked", { size: "md" }));
    coinWrap.appendChild(coinAnim);
    var txt = el("div");
    txt.innerHTML = '<p class="gilt-eyebrow">Achievement unlocked · Beji imefunguliwa</p>' +
      '<p class="font-display" style="font-size:var(--type-h4);font-weight:600;color:var(--text);margin:2px 0 0;">' + b.name + '</p>' +
      '<p style="font-size:12px;font-style:italic;color:var(--text-subtle);margin:0;">' + b.sw + '</p>';
    card.appendChild(coinWrap); card.appendChild(txt);
    mount.appendChild(card);
    setTimeout(function () {
      card.style.transition = "opacity 320ms, transform 320ms";
      card.style.opacity = "0"; card.style.transform = "translateY(-8px)";
      setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 340);
    }, 4000);
  }

  /* ===================== 04 · WIN CELEBRATION ===================== */
  var CONFETTI_COLORS = ["oklch(80% 0.14 78)", "oklch(72% 0.16 152)", "oklch(72% 0.18 22)"];
  function celebrate(tier) {
    var stage = $("#celebrateStage");
    stage.innerHTML = "";
    var reduce = P.motionReduced();

    // soft gilt aura (standard + rare) — heraldic, calm, breathes, no rotation
    if (tier === "standard" || tier === "rare") {
      var aura = el("div", "win-aura" + (reduce ? "" : " win-aura-anim"));
      if (tier === "rare") { aura.style.width = aura.style.height = "600px"; aura.style.margin = "-300px 0 0 -300px"; }
      stage.appendChild(aura);
    }

    // win card
    var card = el("div", "win-card-el " + (tier === "rare" ? "win-card-rare" : "win-card"));
    var payout = tier === "micro" ? 4200 : tier === "standard" ? 38500 : 1240000;
    var stake = tier === "micro" ? 2000 : tier === "standard" ? 5000 : 20000;
    var crestHalo = (tier === "rare" && !reduce) ? "win-trophy-halo" : "";
    card.innerHTML =
      '<div class="win-crest ' + crestHalo + '" style="background:radial-gradient(circle at 50% 35%, oklch(30% 0.165 268), oklch(18% 0.13 268));border:1.5px solid var(--border-gold);box-shadow:0 0 0 1px color-mix(in oklab,var(--gilt) 30%,transparent) inset;">' +
        '<span class="' + (tier === "micro" ? "" : "win-seal") + '" style="display:grid;place-items:center;">' + fiftyMark(56) + '</span>' +
      '</div>' +
      '<p class="gilt-eyebrow">' + (tier === "rare" ? "Jackpot · Tuzo kuu" : "Settled · Imetatuliwa") + '</p>' +
      '<p class="display" style="font-size:22px;font-weight:700;color:var(--text);margin:4px 0 2px;">Won · Umeshinda</p>' +
      '<div class="win-payout"><span style="font-size:18px;color:var(--text-muted);font-weight:600;">TZS </span><span class="win-num">0</span></div>' +
      '<p style="font-family:var(--font-mono);font-size:11px;color:var(--text-subtle);margin:10px 0 0;">Stake TZS ' + fmt(stake) + ' · ' + (payout / stake).toFixed(1) + '×</p>' +
      '<div style="display:flex;gap:8px;justify-content:center;margin-top:18px;">' +
        '<button class="btn btn-ghost btn-sm">View positions</button>' +
        '<button class="btn btn-gold btn-sm">Share · Shiriki</button>' +
      '</div>';
    stage.appendChild(card);

    // payout count up + haptic + flash
    var numEl = $(".win-num", card);
    if (tier === "micro") { H.success(); } else { H.celebrate(); }
    if (reduce) { numEl.textContent = fmt(payout); numEl.parentNode.classList.add("value-flash"); }
    else { tween(0, payout, tier === "rare" ? 1100 : 700, function (v) { numEl.textContent = fmt(v); }, function () { numEl.parentNode.classList.add("value-flash"); }); }

    // confetti (rare only)
    if (tier === "rare" && !reduce) {
      var layer = el("div", "win-confetti-layer");
      stage.appendChild(layer);
      for (var c = 0; c < 46; c++) {
        var f = el("div", "confetti-fleck");
        f.style.left = (Math.random() * 100) + "%";
        f.style.background = CONFETTI_COLORS[c % 3];
        f.style.setProperty("--cx", ((Math.random() - 0.5) * 220) + "px");
        f.style.setProperty("--cr", (360 + Math.random() * 540) + "deg");
        f.style.setProperty("--cd", (Math.random() * 400) + "ms");
        layer.appendChild(f);
      }
      setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 2200);
    }
  }

  function renderLadder() {
    var host = $("#ladderGrid");
    D.CELEBRATION.forEach(function (c) {
      var card = el("div", "ladder-card");
      card.innerHTML =
        '<div class="ladder-head"><span class="ladder-tier">' + c.label + '</span><span class="settings-desc" style="margin:0;">' + c.sub + '</span></div>' +
        '<div class="ladder-body">' +
          '<p class="settings-desc" style="margin:0 0 6px;">' + c.blurb + '</p>' +
          '<dl class="ladder-row"><dt>Threshold</dt><dd>' + c.threshold + '</dd>' +
          '<dt>Assets</dt><dd><code style="font-family:var(--font-mono);font-size:10.5px;color:var(--gilt);">' + c.assets + '</code></dd>' +
          '<dt>Haptic</dt><dd><span class="token-pill" data-t="' + c.haptic + '">' + c.haptic + '</span></dd></dl>' +
        '</div>';
      host.appendChild(card);
    });
  }

  /* ===================== 05 · SETTINGS ===================== */
  function renderSettings() {
    var host = $("#settingsCard"), prefs = P.get();
    // haptics
    var r1 = el("div", "settings-row");
    r1.innerHTML = '<div><div class="settings-label">Haptic feedback<span class="sw">Mtetemo</span></div><div class="settings-desc">Vibration on key money &amp; outcome moments. Android/Chrome only.</div></div>';
    var sw1 = el("div", "kp-switch"); sw1.setAttribute("role", "switch"); sw1.setAttribute("tabindex", "0"); sw1.setAttribute("aria-checked", String(prefs.haptics));
    sw1.innerHTML = '<span class="kp-thumb"></span>';
    function tHaptics() { var on = sw1.getAttribute("aria-checked") === "true"; sw1.setAttribute("aria-checked", String(!on)); P.setHaptics(!on); H.select(); }
    sw1.addEventListener("click", tHaptics);
    sw1.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); tHaptics(); } });
    r1.appendChild(sw1);

    // motion
    var r2 = el("div", "settings-row");
    r2.innerHTML = '<div><div class="settings-label">Motion<span class="sw">Mwendo</span></div><div class="settings-desc">Reduce animation. "System" follows your device\'s reduced-motion setting.</div></div>';
    var seg = el("div", "seg");
    [["system", "System"], ["on", "Full"], ["off", "Reduced"]].forEach(function (o) {
      var b = el("button", null, o[1]); b.setAttribute("aria-pressed", String(prefs.motion === o[0]));
      b.addEventListener("click", function () {
        P.setMotion(o[0]); H.select();
        $$("button", seg).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
      });
      seg.appendChild(b);
    });
    r2.appendChild(seg);

    // sound (future)
    var r3 = el("div", "settings-row");
    r3.innerHTML = '<div><div class="settings-label">Sound<span class="sw">Sauti</span></div><div class="settings-desc">Audio cues on wins &amp; alerts.</div></div>';
    var soonWrap = el("div"); soonWrap.style.cssText = "display:flex;align-items:center;gap:10px;";
    soonWrap.innerHTML = '<span class="chip chip-pending">Coming soon</span>';
    var sw3 = el("div", "kp-switch"); sw3.setAttribute("aria-checked", "false"); sw3.style.cssText = "opacity:0.4;pointer-events:none;"; sw3.innerHTML = '<span class="kp-thumb"></span>';
    soonWrap.appendChild(sw3); r3.appendChild(soonWrap);

    host.appendChild(r1); host.appendChild(r2); host.appendChild(r3);
  }

  /* ----- nav status + scrollspy ----- */
  function updateStatus() {
    var prefs = P.get(), reduced = P.motionReduced();
    var s = $("#navStatus");
    s.innerHTML =
      '<div style="margin-bottom:6px;"><span class="lab-status-dot ' + (prefs.haptics ? "lab-status-on" : "lab-status-off") + '"></span>Haptics <b>' + (prefs.haptics ? "On" : "Off") + '</b></div>' +
      '<div><span class="lab-status-dot ' + (reduced ? "lab-status-off" : "lab-status-on") + '"></span>Motion <b>' + (reduced ? "Reduced" : (prefs.motion === "on" ? "Full" : "System")) + '</b></div>';
  }
  window.addEventListener("50pick:prefs", updateStatus);

  function scrollspy() {
    var links = $$(".lab-nav-link");
    var map = {};
    links.forEach(function (l) { map[l.getAttribute("href").slice(1)] = l; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("active"); });
          if (map[e.target.id]) map[e.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    $$(".lab-section").forEach(function (s) { obs.observe(s); });
  }

  /* ----- code drawers ----- */
  var CODE_SOURCES = {
    haptics: [{ label: "haptics.ts", file: "ship/haptics.ts" }],
    motion: [{ label: "globals.css · additions", file: "styles/additions.css" }],
    badges: [
      { label: "Badge.tsx", file: "ship/Badge.tsx" },
      { label: "AchievementToast.tsx", file: "ship/AchievementToast.tsx" },
      { label: "badge icons", file: "js/svg-badges.js" },
    ],
  };
  function renderCodeDrawer(drawer) {
    var key = drawer.getAttribute("data-code"), sources = CODE_SOURCES[key];
    var tabs = el("div", "code-tabs");
    var head = el("div", "code-head");
    var pre = el("pre", "code-pre"); var code = document.createElement("code"); pre.appendChild(code);
    var copyBtn = el("button", "copy-btn", "Copy");
    head.innerHTML = '<span>Code to ship</span>'; head.appendChild(copyBtn);
    drawer.appendChild(tabs); drawer.appendChild(head); drawer.appendChild(pre);
    var current = "";
    function load(src, tabEl) {
      $$(".code-tab", tabs).forEach(function (t) { t.classList.remove("active"); });
      tabEl.classList.add("active");
      code.textContent = "Loading " + src.file + " …";
      fetch(src.file).then(function (r) { return r.text(); }).then(function (txt) { current = txt; code.textContent = txt; })
        .catch(function () { code.textContent = "// " + src.file + " — open the file in the project to view."; });
    }
    sources.forEach(function (src, i) {
      var t = el("button", "code-tab", src.label);
      t.addEventListener("click", function () { load(src, t); });
      tabs.appendChild(t);
      if (i === 0) load(src, t);
    });
    copyBtn.addEventListener("click", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(current);
      copyBtn.textContent = "Copied ✓"; setTimeout(function () { copyBtn.textContent = "Copy"; }, 1400);
    });
  }

  /* ----- init ----- */
  document.addEventListener("DOMContentLoaded", function () {
    $("#navBrand").innerHTML = '<span style="display:inline-flex;">' + fiftyMark(30) + '</span>' + wordmark(17);
    $("#heroMark").innerHTML = fiftyMark(260);
    renderHaptics();
    renderEventMap();
    renderAnimGallery();
    renderBadgeStates();
    renderShelves();
    renderProfile();
    renderLeaderboard();
    renderLadder();
    renderSettings();
    updateStatus();
    scrollspy();
    $$(".code-drawer").forEach(renderCodeDrawer);
    $("#fireUnlock").addEventListener("click", function () { fireUnlock("first-win"); });
    $$("[data-celebrate]").forEach(function (b) { b.addEventListener("click", function () { celebrate(b.getAttribute("data-celebrate")); retrigger(b, "press-pop"); }); });
    setTimeout(function () { celebrate("standard"); }, 500);
  });
})();
