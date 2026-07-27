/* ===========================================================================
   50pick — Needle physics engine  ·  v3.0
   ---------------------------------------------------------------------------
   Deterministic rigid-disc simulator for the Needle: the persistent pause
   object that lives on the edge of the 50pick app shell.

   Behaviour
     · Always present. When not in your hand it magnetically parks against the
       nearest safe edge, half-tucked, out of the way.
     · Grab it anywhere, carry it anywhere, throw it corner to corner. Honest
       wall impulses, glancing hits impart spin, it coasts, then glides back to
       an edge and tucks itself.
     · However many turns you put in, it comes to rest as the logo, exactly.
     · Its prominence tracks session length (see presence / setSession).

   v3 changes
     · SAFE AREAS. Bounds accept insets, so it never parks under a notch, a
       home indicator, or a fixed app bar.
     · RESPONSIVE SIZE. setSize() re-derives geometry at runtime; the tuck pose
       follows immediately.
     · VIEWPORT-NORMALISED MOMENTUM. Speed limits scale with the screen
       diagonal, so a flick feels the same on a 360px phone and a 1440px
       desktop instead of crossing a phone in 80ms.

   Units: px, milliseconds, degrees.   (deg/ms × 166.67 = rpm)
   =========================================================================== */

export const CONST = {
  SUBSTEP: 1000 / 120,
  MAX_SUBSTEPS: 6,
  MAX_FRAME_DT: 50,

  TAU_LIN: 520,
  TAU_ANG: 1420,
  MU_LIN: 0.00026,
  MU_ANG: 0.00015,

  RESTITUTION: 0.58,
  WALL_FRICTION: 0.88,
  SPIN_COUPLING: 0.014,
  ROLL_COUPLING: 0.00012,
  MIN_BOUNCE: 0.20,

  /* Reference diagonal the tuning was authored against (a 1440x900 desktop).
     Linear limits scale by diagonal/REF so the object crosses roughly the same
     fraction of any screen in the same time. Angular limits do NOT scale —
     a spin looks identical regardless of how big the screen is. */
  REF_DIAG: 1700,
  MAX_LIN: 4.2,
  MIN_LIN_SCALE: 0.42,
  MAX_ANG: 2.8,

  SETTLE_ENTER: 0.06,
  SPRING_K: 0.0000165,
  SPRING_Z: 0.88,
  SNAP_DEG: 0.10,

  PARK_K: 0.000042,
  PARK_Z: 0.92,
  PARK_SNAP: 0.6,
  PARK_DELAY: 260,
  WAKE_LINGER: 2600,
  PEEK: 0.50,          // 0.50 of the disc = the design system's 40px tap floor at 80px
  EDGE_MARGIN: 14,

  SLEEP_LIN: 0.010,
  SLEEP_ANG: 0.004,
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const finite = (v, f = 0) => (Number.isFinite(v) ? v : f);
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

export class NeedleBody {
  /**
   * @param {object} o
   *   size     – diameter, px
   *   bounds   – () => ({ w, h, insets? }) live viewport + safe-area insets
   *   onImpact – ({speed, nx, ny, x, y}) => void
   *   onCross  – () => void
   *   onPark   – (edge) => void
   *   onSleep  – () => void
   */
  constructor(o) {
    this.size = o.size || 80;
    this.getBounds = o.bounds;
    this.onImpact = o.onImpact || (() => {});
    this.onCross = o.onCross || (() => {});
    this.onPark = o.onPark || (() => {});
    this.onSleep = o.onSleep || (() => {});

    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.a = 0; this.w = 0;

    this.held = null;
    this.settling = false;
    this.parking = false;
    this.parked = false;
    this.edge = "right";
    this.target = null;
    this.contact = 0;
    this.acc = 0;
    this.stillFor = 0;
    this.calm = 1;
    this.trueLock = 1;
    this.presence = 0;
    this.autoPark = true;
  }

  get radius() { return this.size / 2; }
  get cx() { return this.x + this.radius; }
  get cy() { return this.y + this.radius; }
  get rpm() { return Math.abs(this.w) * 1000 * 60 / 360; }
  get speed() { return Math.hypot(this.vx, this.vy) * 1000; }
  get moving() { return Math.abs(this.vx) > CONST.SLEEP_LIN || Math.abs(this.vy) > CONST.SLEEP_LIN; }

  get awake() {
    if (this.parked && !this.held) return Math.abs(this.w) > CONST.SLEEP_ANG || this.settling;
    if (!this.autoPark) {
      return !!this.held || this.parking || this.settling || this.moving || Math.abs(this.w) > CONST.SLEEP_ANG;
    }
    return !!this.held || this.parking || this.settling || this.moving ||
      Math.abs(this.w) > CONST.SLEEP_ANG || this.stillFor < CONST.PARK_DELAY;
  }

  /* ── geometry, safe-area aware ─────────────────────────────────────── */

  /** Live travel box. Every clamp in the engine goes through this. */
  limits() {
    const b = this.getBounds();
    const i = b.insets || NO_INSETS;
    const minX = i.left, minY = i.top;
    return {
      minX, minY,
      maxX: Math.max(minX, b.w - this.size - i.right),
      maxY: Math.max(minY, b.h - this.size - i.bottom),
      w: b.w, h: b.h, i,
    };
  }

  /** Linear speed limit for THIS screen. A flick should feel the same everywhere. */
  linScale() {
    const b = this.getBounds();
    const diag = Math.hypot(b.w || CONST.REF_DIAG, b.h || CONST.REF_DIAG);
    return Math.max(CONST.MIN_LIN_SCALE, diag / CONST.REF_DIAG);
  }
  maxLin() { return CONST.MAX_LIN * this.linScale(); }

  /** Change diameter at runtime (breakpoint change, orientation flip). */
  setSize(next) {
    const n = Math.round(next);
    if (!n || n === this.size) return false;
    const wasParked = this.parked, edge = this.edge;
    // keep the centre stable so it does not appear to jump
    const cx = this.cx, cy = this.cy;
    this.size = n;
    this.x = cx - this.radius;
    this.y = cy - this.radius;
    if (wasParked) this.snapPark(edge); else this.reclamp();
    return true;
  }

  place(x, y) {
    const L = this.limits();
    this.x = clamp(finite(x), L.minX, L.maxX);
    this.y = clamp(finite(y), L.minY, L.maxY);
  }

  trueAngle() { return Math.round(this.a / 360) * 360; }

  /**
   * Visible fraction when tucked. The floor is expressed in PIXELS, not as a
   * fraction: at 64px diameter a flat 50% would leave a 32px sliver, under the
   * design system's 40px tap floor. 44px guarantees the floor with margin at
   * every diameter, and presence only ever adds to it.
   */
  peek() {
    const floorPx = 44 / this.size;
    return Math.min(0.82, Math.max(CONST.PEEK, floorPx) + this.presence * 0.18);
  }

  /** Width (or height) in px of the grab pad while tucked. Never below 44. */
  padPx() { return Math.max(44, Math.round(this.size * this.peek())); }

  /**
   * Session length in minutes drives presence: the object is a responsible-play
   * surface, so its prominence tracks how long the player has been going.
   */
  setSession(minutes) {
    const next = clamp((minutes || 0) / 60, 0, 1);
    if (Math.abs(next - this.presence) < 0.01) return false;
    this.presence = next;
    if (this.parked) this.snapPark(this.edge);
    return true;
  }

  /** Platform hook: one quarter-turn back to true. An acknowledgement, not a party. */
  acknowledge() {
    if (this.held) return false;
    this.settling = false;
    this.w = this.calm < 1 ? 0.22 : 0.62;
    this.stillFor = -CONST.WAKE_LINGER * 0.5;
    return true;
  }

  nearestEdge() {
    const L = this.limits();
    const d = {
      left: this.cx - L.minX,
      right: (L.maxX + this.size) - this.cx,
      // sides win ties: a disc on the top or bottom edge eats the reading column
      top: (this.cy - L.minY) * 1.35,
      bottom: ((L.maxY + this.size) - this.cy) * 1.35,
    };
    return Object.keys(d).reduce((best, k) => (d[k] < d[best] ? k : best), "left");
  }

  parkPose(edge) {
    const L = this.limits();
    const hidden = this.size * (1 - this.peek());
    const m = CONST.EDGE_MARGIN;
    const yFree = clamp(this.y, L.minY + m, Math.max(L.minY + m, L.maxY - m));
    const xFree = clamp(this.x, L.minX + m, Math.max(L.minX + m, L.maxX - m));
    switch (edge) {
      case "left":  return { x: L.minX - hidden, y: yFree };
      case "right": return { x: L.maxX + hidden, y: yFree };
      case "top":   return { x: xFree, y: L.minY - hidden };
      default:      return { x: xFree, y: L.maxY + hidden };
    }
  }

  wakePose(edge) {
    const L = this.limits();
    const m = CONST.EDGE_MARGIN;
    const yFree = clamp(this.y, L.minY + m, Math.max(L.minY + m, L.maxY - m));
    const xFree = clamp(this.x, L.minX + m, Math.max(L.minX + m, L.maxX - m));
    switch (edge) {
      case "left":  return { x: L.minX + m, y: yFree };
      case "right": return { x: Math.max(L.minX, L.maxX - m), y: yFree };
      case "top":   return { x: xFree, y: L.minY + m };
      default:      return { x: xFree, y: Math.max(L.minY, L.maxY - m) };
    }
  }

  parkTo(edge) {
    this.edge = edge || this.nearestEdge();
    this.target = this.parkPose(this.edge);
    this.parking = true;
    this.parked = false;
  }

  /** `force` skips the guard: hold() clears the parked flags before a tap is judged. */
  wake(force) {
    if (!force && !this.parked && !this.parking) return false;
    this.held = null;
    this.target = this.wakePose(this.edge);
    this.parking = true;
    this.parked = false;
    this.stillFor = -CONST.WAKE_LINGER;
    return true;
  }

  unpark() {
    this.parking = false;
    this.parked = false;
    this.target = null;
    this.stillFor = 0;
  }

  snapPark(edge) {
    this.edge = edge || this.edge;
    const p = this.parkPose(this.edge);
    this.x = p.x; this.y = p.y;
    this.vx = this.vy = this.w = 0;
    this.a = this.trueAngle();
    this.parking = false;
    this.parked = true;
    this.target = null;
    this.stillFor = CONST.PARK_DELAY;
  }

  /** Resize, rotation, or mobile browser chrome collapsing. */
  reclamp() {
    if (this.parked) { this.snapPark(this.edge); return; }
    const L = this.limits();
    this.x = clamp(this.x, L.minX, L.maxX);
    this.y = clamp(this.y, L.minY, L.maxY);
  }

  /* ── loop ──────────────────────────────────────────────────────────── */

  advance(frameDt) {
    if (this.held) { this.acc = 0; this.stillFor = 0; return; }
    this.acc += clamp(finite(frameDt, 16), 0, CONST.MAX_FRAME_DT);
    let n = 0;
    while (this.acc >= CONST.SUBSTEP && n < CONST.MAX_SUBSTEPS) {
      this.integrate(CONST.SUBSTEP);
      this.acc -= CONST.SUBSTEP;
      n++;
    }
    if (n === CONST.MAX_SUBSTEPS) this.acc = 0;
    if (!this.awake) this.sleep();
  }

  integrate(dt) {
    const C = CONST;
    if (this.parking && this.target) this.stepPark(dt);
    else this.stepFree(dt);

    if (!this.settling) {
      const prev = this.a;
      this.a += this.w * dt;
      this.w *= Math.exp(-dt / C.TAU_ANG);
      const drop = C.MU_ANG * dt;
      this.w = Math.abs(this.w) > drop ? this.w - Math.sign(this.w) * drop : 0;
      const t = Math.round(prev / 360) * 360;
      if (Math.abs(this.w) > 0.35 && Math.sign(prev - t) !== Math.sign(this.a - t)) this.onCross();
      // Only hand over if there is a correction to make: otherwise an at-rest body
      // re-enters settling every substep and the loop never sleeps.
      if (Math.abs(this.w) < C.SETTLE_ENTER) {
        const work = Math.abs(this.trueAngle() - this.a) > C.SNAP_DEG || Math.abs(this.w) > C.SLEEP_ANG;
        if (work) this.settling = true;
        else { this.w = 0; if (this.trueLock > 0) this.a = this.trueAngle(); }
      }
    } else {
      const lock = this.trueLock;
      if (lock <= 0) {
        this.w *= Math.exp(-dt / 240);
        if (Math.abs(this.w) < C.SLEEP_ANG) { this.w = 0; this.settling = false; }
      } else {
        const target = this.trueAngle();
        const d = target - this.a;
        const k = C.SPRING_K * lock;
        const omega = Math.sqrt(k);
        this.w += (k * d - 2 * C.SPRING_Z * omega * this.w) * dt;
        this.a += this.w * dt;
        if (Math.abs(d) < C.SNAP_DEG && Math.abs(this.w) < C.SLEEP_ANG) {
          this.a = target; this.w = 0; this.settling = false;
        }
      }
    }
    this.guard();
  }

  stepFree(dt) {
    const C = CONST;
    const L = this.limits();

    // A tucked body sits deliberately outside the travel box — never clamp it back.
    if (this.parked) { this.vx = this.vy = 0; return; }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    let hit = false;
    if (this.x < L.minX) { this.x = L.minX; hit = this.collide(1, 0) || hit; }
    else if (this.x > L.maxX) { this.x = L.maxX; hit = this.collide(-1, 0) || hit; }
    if (this.y < L.minY) { this.y = L.minY; hit = this.collide(0, 1) || hit; }
    else if (this.y > L.maxY) { this.y = L.maxY; hit = this.collide(0, -1) || hit; }
    this.contact = hit ? 3 : Math.max(0, this.contact - 1);

    const decay = Math.exp(-dt / C.TAU_LIN);
    this.vx *= decay; this.vy *= decay;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 0) {
      const drop = C.MU_LIN * dt;
      const k = sp > drop ? (sp - drop) / sp : 0;
      this.vx *= k; this.vy *= k;
    }
    if (Math.abs(this.vx) < C.SLEEP_LIN) this.vx = 0;
    if (Math.abs(this.vy) < C.SLEEP_LIN) this.vy = 0;

    // a disc spinning against a surface walks along it
    if (this.contact > 0 && Math.abs(this.w) > 0.25) {
      const walk = this.w * C.ROLL_COUPLING * dt;
      if (this.y <= L.minY || this.y >= L.maxY) this.vx += walk;
      if (this.x <= L.minX || this.x >= L.maxX) this.vy -= walk;
    }

    if (!this.moving && Math.abs(this.w) < 0.35) {
      this.stillFor += dt;
      if (this.autoPark && this.stillFor >= C.PARK_DELAY) this.parkTo(this.nearestEdge());
    } else {
      this.stillFor = 0;
    }
  }

  stepPark(dt) {
    const C = CONST;
    const omega = Math.sqrt(C.PARK_K);
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    this.vx += (C.PARK_K * dx - 2 * C.PARK_Z * omega * this.vx) * dt;
    this.vy += (C.PARK_K * dy - 2 * C.PARK_Z * omega * this.vy) * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.hypot(dx, dy) < C.PARK_SNAP * 6 && Math.hypot(this.vx, this.vy) < 0.06) {
      this.x = this.target.x; this.y = this.target.y;
      this.vx = this.vy = 0;
      this.parking = false;
      const pose = this.parkPose(this.edge);
      const tucked = Math.abs(this.x - pose.x) < 1 && Math.abs(this.y - pose.y) < 1;
      this.parked = tucked;
      this.target = null;
      // preserve a pending wake grace period
      this.stillFor = tucked ? C.PARK_DELAY : Math.min(0, this.stillFor);
      this.onPark(this.edge);
    }
  }

  collide(nx, ny) {
    const C = CONST;
    const vn = this.vx * nx + this.vy * ny;
    if (vn >= 0) return false;
    const impact = Math.abs(vn);
    const tx = -ny, ty = nx;
    const vt = this.vx * tx + this.vy * ty;
    const bounce = impact < C.MIN_BOUNCE ? 0 : C.RESTITUTION;
    const vnNew = impact * bounce;
    const vtNew = vt * C.WALL_FRICTION;
    // tangential momentum lost to friction becomes angular momentum
    const lost = vt - vtNew;
    this.w = clamp(this.w + lost * C.SPIN_COUPLING * this.radius, -C.MAX_ANG, C.MAX_ANG);
    if (Math.abs(this.w) > C.SETTLE_ENTER) this.settling = false;
    this.vx = nx * vnNew + tx * vtNew;
    this.vy = ny * vnNew + ty * vtNew;
    this.stillFor = 0;
    if (impact > 0.06) this.onImpact({ speed: impact, nx, ny, x: this.cx, y: this.cy });
    return true;
  }

  guard() {
    const lim = this.maxLin();
    this.x = finite(this.x); this.y = finite(this.y); this.a = finite(this.a);
    this.w = clamp(finite(this.w), -CONST.MAX_ANG, CONST.MAX_ANG);
    this.vx = clamp(finite(this.vx), -lim, lim);
    this.vy = clamp(finite(this.vy), -lim, lim);
    if (Math.abs(this.a) > 1e6) this.a = ((this.a % 360) + 360) % 360;
  }

  sleep() {
    this.vx = this.vy = this.w = 0;
    if (this.trueLock > 0) this.a = this.trueAngle();
    this.settling = false;
    this.acc = 0;
    this.onSleep();
  }

  /* ── input ─────────────────────────────────────────────────────────── */

  grabKind(px, py) {
    return Math.hypot(px - this.cx, py - this.cy) < this.radius * 0.34 ? "move" : "spin";
  }

  hold(kind) {
    this.held = kind;
    this.unpark();
    this.vx = this.vy = 0;
    this.settling = false;
    if (kind === "spin") this.w = 0;
  }

  /** Free drag. Allowed slightly past the edge so a throw can start off-screen. */
  dragBy(dx, dy) {
    const L = this.limits();
    this.x = clamp(this.x + dx, L.minX - this.radius, L.maxX + this.radius);
    this.y = clamp(this.y + dy, L.minY - this.radius, L.maxY + this.radius);
  }

  turnTo(px, py, lastAngle) {
    const ang = Math.atan2(py - this.cy, px - this.cx) * 180 / Math.PI;
    let d = ang - lastAngle;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    this.a += d;
    return ang;
  }

  /** Recency-weighted momentum over the last 110ms: the flick you actually made. */
  release(samples, kind) {
    const C = CONST;
    const lim = this.maxLin();
    this.held = null;
    this.stillFor = 0;
    const list = samples || [];
    const now = list.length ? list[list.length - 1].t : 0;
    const win = list.filter((s) => now - s.t <= 110);
    if (win.length >= 2) {
      let wx = 0, wy = 0, wa = 0, sum = 0;
      for (let i = 1; i < win.length; i++) {
        const p = win[i - 1], c = win[i];
        const dt = Math.max(4, c.t - p.t);
        const weight = i;
        wx += ((c.x - p.x) / dt) * weight;
        wy += ((c.y - p.y) / dt) * weight;
        let da = c.a - p.a;
        while (da > 180) da -= 360;
        while (da < -180) da += 360;
        wa += (da / dt) * weight;
        sum += weight;
      }
      if (sum > 0) {
        if (kind === "move") {
          this.vx = clamp(wx / sum, -lim, lim);
          this.vy = clamp(wy / sum, -lim, lim);
          this.w = clamp(this.w + this.vx * 0.05, -C.MAX_ANG, C.MAX_ANG);
        } else {
          this.w = clamp(wa / sum, -C.MAX_ANG, C.MAX_ANG);
        }
      }
    }
    if (this.calm < 1) {
      this.vx *= this.calm; this.vy *= this.calm;
      this.w = Math.sign(this.w) * Math.min(Math.abs(this.w), 0.34);
    }
    this.settling = Math.abs(this.w) < C.SETTLE_ENTER;
    this.guard();
  }

  flick(strength = 1.9) {
    this.unpark();
    this.settling = false;
    this.w = clamp(this.calm < 1 ? 0.34 : strength, -CONST.MAX_ANG, CONST.MAX_ANG);
  }
}

export default NeedleBody;
