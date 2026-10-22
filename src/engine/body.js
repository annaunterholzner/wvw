/* wvw — body engine
 * one skeleton, many vocabularies. the body is computed here;
 * how it looks is decided by the styles.
 */
(function () {
  const V = (window.WVW = window.WVW || {});
  const PI = Math.PI, TAU = PI * 2, HALF = PI / 2;

  // ---------- small math ----------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const wrap = (a) => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
  const lerpAngle = (a, b, t) => a + wrap(b - a) * t;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const NT = new Float32Array(1024);
  { const r = mulberry32(1986); for (let i = 0; i < NT.length; i++) NT[i] = r() * 2 - 1; }
  function vnoise(x) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(NT[i & 1023], NT[(i + 1) & 1023], u);
  }
  const hash = (n) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

  V.math = { clamp, lerp, smooth, wrap, mulberry32, vnoise, hash, PI, TAU, HALF };

  // ---------- skeleton ----------
  // joint indices into a flat Float32Array (x,y pairs)
  const J = { HEAD: 0, NECK: 1, PELVIS: 2, ELBOW_L: 3, HAND_L: 4, ELBOW_R: 5, HAND_R: 6, KNEE_L: 7, FOOT_L: 8, KNEE_R: 9, FOOT_R: 10, CHEST: 11 };
  const NJ = 12;
  J.COUNT = NJ;
  J.S = NJ * 2;         // px per body unit
  J.HEAD_R = 0.07;      // head radius in body units
  J.BONES = [[1, 2], [11, 3], [3, 4], [11, 5], [5, 6], [2, 7], [7, 8], [2, 9], [9, 10]];
  J.CHAINS = [[11, 3, 4], [11, 5, 6], [2, 7, 8], [2, 9, 10], [1, 2]];
  V.J = J;

  const LEN = { torso: 0.30, neck: 0.10, chest: 0.035, upper: 0.15, fore: 0.14, thigh: 0.22, shin: 0.23 };
  const BODY_H = 0.92;

  const ANG = ['torso', 'head', 'uaL', 'faL', 'uaR', 'faR', 'thL', 'shL', 'thR', 'shR', 'rot'];
  const LIN = ['lift', 'vx'];

  function neutral() {
    const P = { torso: 0, head: 0, rot: 0, lift: 0, vx: 0 };
    arms(P, 0.15, -0.15, 0.15, -0.15);
    legs(P, 0.1, 0, 0.1, 0);
    return P;
  }
  // spread: 0 = hanging down, π/2 = straight out, π = overhead. bend > 0 lifts forearm outward.
  function arms(P, aL, bL, aR, bR) { P.uaL = PI + aL; P.faL = bL; P.uaR = PI - aR; P.faR = -bR; }
  // spread outward from straight-down; k folds the knee outward (frog), shin back to centre
  function legs(P, lL, kL, lR, kR) { P.thL = PI + lL; P.shL = -kL; P.thR = PI - lR; P.shR = kR; }

  function mirror(P) { for (const k of ANG) P[k] = -P[k]; P.vx = -P.vx; return P; }
  function blendPose(A, B, w) {
    const P = {};
    for (const k of ANG) P[k] = lerpAngle(A[k], B[k], w);
    for (const k of LIN) P[k] = lerp(A[k], B[k], w);
    return P;
  }

  // forward kinematics into body units (pelvis at origin, y down)
  const L = new Float32Array(NJ * 2);
  function put(i, x, y) { L[i * 2] = x; L[i * 2 + 1] = y; }
  function fk(P) {
    const tA = P.rot + P.torso;
    const dx = (a) => Math.sin(a), dy = (a) => -Math.cos(a);
    put(J.PELVIS, 0, 0);
    const nx = dx(tA) * LEN.torso, ny = dy(tA) * LEN.torso;
    put(J.NECK, nx, ny);
    const cx = nx - dx(tA) * LEN.chest, cy = ny - dy(tA) * LEN.chest;
    put(J.CHEST, cx, cy);
    const hA = tA + P.head;
    put(J.HEAD, nx + dx(hA) * LEN.neck, ny + dy(hA) * LEN.neck);
    let a = tA + P.uaL;
    const exL = cx + dx(a) * LEN.upper, eyL = cy + dy(a) * LEN.upper;
    put(J.ELBOW_L, exL, eyL); a += P.faL; put(J.HAND_L, exL + dx(a) * LEN.fore, eyL + dy(a) * LEN.fore);
    a = tA + P.uaR;
    const exR = cx + dx(a) * LEN.upper, eyR = cy + dy(a) * LEN.upper;
    put(J.ELBOW_R, exR, eyR); a += P.faR; put(J.HAND_R, exR + dx(a) * LEN.fore, eyR + dy(a) * LEN.fore);
    a = P.rot + P.thL;
    const kxL = dx(a) * LEN.thigh, kyL = dy(a) * LEN.thigh;
    put(J.KNEE_L, kxL, kyL); a += P.shL; put(J.FOOT_L, kxL + dx(a) * LEN.shin, kyL + dy(a) * LEN.shin);
    a = P.rot + P.thR;
    const kxR = dx(a) * LEN.thigh, kyR = dy(a) * LEN.thigh;
    put(J.KNEE_R, kxR, kyR); a += P.shR; put(J.FOOT_R, kxR + dx(a) * LEN.shin, kyR + dy(a) * LEN.shin);
    // gravity: whatever is lowest touches the floor
    let maxY = L[J.HEAD * 2 + 1] + J.HEAD_R;
    for (let i = 1; i < NJ; i++) if (L[i * 2 + 1] > maxY) maxY = L[i * 2 + 1];
    return maxY;
  }

  // ---------- movement vocabularies ----------
  const MOVES = {};
  const mv = (id, mood, dur, weight, f, extra) => (MOVES[id] = Object.assign({ id, mood, dur, weight, f }, extra || {}));

  // — expansive —
  mv('sway', 'expansive', [6, 10], 1, (P, t, I) => {
    const ph = I.r[0] * TAU, s = Math.sin(t * 1.7 + ph);
    P.torso = 0.18 * s + 0.06 * I.n(1, t * 0.6);
    P.head = -0.15 * s + 0.1 * I.n(2, t * 0.5);
    const w = (o) => Math.sin(t * 1.7 + ph + o);
    arms(P, 2.0 + 0.7 * w(0.8), 0.9 * w(2.2), 2.0 + 0.7 * w(0.8 + 2.2), 0.9 * w(2.2 + 2.2));
    legs(P, 0.14 + 0.08 * s, 0.35 * Math.max(0, s), 0.14 - 0.08 * s, 0.35 * Math.max(0, -s));
    P.vx = 0.18 * Math.sin(t * 0.45 + ph);
  });
  mv('reach', 'expansive', [6, 9], 1, (P, t, I) => {
    const c = (1 - Math.cos(t * TAU / 4.5)) / 2, c2 = (1 - Math.cos(t * TAU / 4.5 - 0.7)) / 2;
    arms(P, 0.3 + 2.6 * c, -0.25 * (1 - c), 0.3 + 2.6 * c2, -0.25 * (1 - c2));
    P.torso = 0.42 * Math.sin(t * TAU / 9 + I.r[0] * 6) * c;
    P.head = -0.5 * P.torso;
    legs(P, 0.1 + 0.1 * c, 0, 0.1 + 0.1 * c, 0);
    P.lift = 0.035 * c;
  });
  mv('float', 'expansive', [7, 12], 0.9, (P, t, I) => {
    P.lift = 0.38 + 0.14 * Math.sin(t * 0.9);
    P.rot = 0.7 * I.n(1, t * 0.22);
    P.torso = 0.25 * I.n(2, t * 0.4);
    P.head = 0.3 * I.n(3, t * 0.35);
    arms(P, 1.3 + 1.2 * I.n(4, t * 0.45), 0.9 * I.n(5, t * 0.5), 1.3 + 1.2 * I.n(6, t * 0.45), 0.9 * I.n(7, t * 0.5));
    legs(P, 0.35 + 0.3 * I.n(8, t * 0.4), 0.6 + 0.6 * I.n(9, t * 0.5), 0.35 + 0.3 * I.n(10, t * 0.4), 0.6 + 0.6 * I.n(11, t * 0.5));
    P.vx = 0.15 * I.n(12, t * 0.2);
  }, { airborne: true });

  // — playful —
  mv('bounce', 'playful', [4, 7], 1.1, (P, t, I) => {
    const f = 1.7, j = Math.abs(Math.sin(PI * f * t)), g = 1 - j;
    P.lift = 0.26 * Math.pow(j, 0.7);
    const k = 1.1 * g * g * g + 0.6 * j * j;
    legs(P, 0.22 + 0.15 * j, k, 0.22 + 0.15 * j, k);
    arms(P, 0.5 + 2.3 * j, 0.4 * g, 0.5 + 2.3 * j, 0.4 * g);
    P.torso = 0.12 * Math.sin(PI * f * t * 0.5);
    P.head = 0.25 * I.n(1, t * 2);
    P.vx = 0.22 * I.n(2, t * 0.35);
  });
  mv('jitter', 'playful', [3, 6], 1, (P, t, I) => {
    const q = Math.floor(t * 11), h = (k) => I.h(q * 13 + k) * 2 - 1;
    P.torso = 0.15 * I.n(1, t * 0.5) + 0.18 * h(1);
    P.head = 0.4 * h(2);
    arms(P, 1.4 + 1.0 * I.n(3, t * 0.4) + 0.6 * h(3), 1.0 * h(4), 1.4 + 1.0 * I.n(5, t * 0.4) + 0.6 * h(5), 1.0 * h(6));
    legs(P, 0.25 + 0.2 * h(7), 0.5 + 0.5 * h(8), 0.25 + 0.2 * h(9), 0.5 + 0.5 * h(10));
    P.lift = 0.03 * (h(11) + 1);
    P.rot = 0.08 * h(12);
  });
  mv('shake', 'playful', [4, 7], 1, (P, t, I) => {
    const idx = (Math.floor(t / 1.15) + I.ri(0, 4)) % 5, w = Math.sin(t * 36), w2 = Math.sin(t * 41 + 1);
    arms(P, 0.25, -0.15, 0.25, -0.15);
    legs(P, 0.12, 0.05, 0.12, 0.05);
    if (idx === 0) { arms(P, 1.3 + 0.5 * w, 0.9 * w2, 0.3, -0.2); P.torso = -0.08; }
    if (idx === 1) { arms(P, 0.3, -0.2, 1.3 + 0.5 * w, 0.9 * w2); P.torso = 0.08; }
    if (idx === 2) { legs(P, 0.55 + 0.25 * w, 0.7 + 0.5 * w2, 0.08, 0.05); P.torso = 0.2; arms(P, 1.0, 0.4, 1.4, 0.4); }
    if (idx === 3) { legs(P, 0.08, 0.05, 0.55 + 0.25 * w, 0.7 + 0.5 * w2); P.torso = -0.2; arms(P, 1.4, 0.4, 1.0, 0.4); }
    if (idx === 4) { P.head = 0.5 * w; P.torso = 0.12 * w2; arms(P, 0.5 + 0.3 * w, 0.6 * w2, 0.5 - 0.3 * w, -0.6 * w2); legs(P, 0.2, 0.3 + 0.2 * w, 0.2, 0.3 - 0.2 * w); }
  });
  mv('sillywalk', 'playful', [5, 8], 1, (P, t) => {
    const ph = t * TAU * 0.85, s = Math.sin(ph), up = Math.max(0, s), dn = Math.max(0, -s);
    legs(P, 0.15 + 1.2 * up, 2.0 * up, 0.15 + 1.2 * dn, 2.0 * dn);
    arms(P, 0.5 + 1.2 * dn, 1.4 * dn + 0.2, 0.5 + 1.2 * up, 1.4 * up + 0.2);
    P.torso = 0.14 * s; P.head = -0.2 * s;
    P.lift = 0.04 * Math.abs(Math.cos(ph));
    P.vx = 0.32;
  }, { travels: true });

  // — upside-down / disorientation —
  mv('spin', 'upside', [3, 6], 1, (P, t, I) => {
    const p = clamp(t / I.d, 0, 1), e = (1 - Math.cos(PI * p)) / 2;
    P.rot = I.rot0 + TAU * I.revs * e;
    arms(P, 1.5, 0.2, 1.5, 0.2);
    legs(P, 0.15, 0.1, 0.9, 0.0);
    P.lift = 0.12 * Math.sin(PI * p);
  }, { init: (I) => { I.revs = I.ri(1, 3); } });
  mv('handstand', 'upside', [4, 7], 1, (P, t, I) => {
    P.rot = I.rot0 + PI + 0.12 * Math.sin(t * 1.4);
    P.torso = 0.06 * I.n(1, t * 0.6);
    P.head = 0.15 * Math.sin(t);
    P.uaL = 0.2; P.uaR = -0.2; P.faL = 0; P.faR = 0;
    const s = Math.sin(t * 2);
    legs(P, 0.5 + 0.4 * s, 0.7 * Math.max(0, Math.sin(t * 2 + 1)), 0.5 - 0.4 * s, 0.7 * Math.max(0, Math.sin(t * 2 + 2.5)));
    P.vx = 0.04 * Math.sin(t * 0.9);
  });
  mv('cartwheel', 'upside', [3, 5], 1, (P, t, I) => {
    P.rot = I.rot0 + TAU * I.revs * (t / I.d);
    arms(P, 2.25, 0, 2.25, 0);
    legs(P, 0.75, 0, 0.75, 0);
    P.vx = (TAU * I.revs / I.d) * 0.42;
  }, { travels: true, init: (I) => { I.revs = I.ri(1, 2); } });

  // — grounded: falling / rolling / lying / weight —
  mv('fall', 'grounded', [2.4, 3.2], 1.1, (P, t, I) => {
    const p = t / I.d, q = clamp((p - 0.3) / 0.32, 0, 1), fallen = q * q;
    P.rot = I.side * HALF * fallen;
    const wob = (1 - fallen) * Math.min(1, p / 0.3);
    P.torso = I.side * 0.3 * wob * Math.sin(t * 8);
    P.head = -I.side * 0.4 * wob * Math.sin(t * 8 + 1);
    arms(P, 0.6 + 1.6 * q + 0.4 * Math.sin(t * 11) * wob, 0.5 * Math.sin(t * 9), 0.6 + 1.6 * q + 0.4 * Math.sin(t * 11 + 2) * wob, 0.5 * Math.sin(t * 9 + 1));
    const buckle = Math.sin(PI * q) * 1.3;
    legs(P, 0.12 + 0.2 * q, buckle, 0.12 + 0.1 * q, buckle * 0.7);
    P.vx = I.side * 0.25 * Math.sin(PI * q);
  }, { upright: true, follow: ['lie', 'roll', 'curl', 'crawl'], init: (I) => { I.side = I.r[1] < 0.5 ? -1 : 1; } });
  mv('lie', 'grounded', [6, 12], 1.4, (P, t, I) => {
    const side = I.side;
    P.rot = side * HALF + 0.03 * Math.sin(t * 1.1);
    const kick = (1 - Math.cos(t * TAU / 5.5)) / 2, big = Math.max(0, I.n(1, t * 0.18 + 2)) * 1.6;
    const up = { l: 0.4 + 1.1 * Math.min(1, big), k: 1.6 * (1 - Math.min(1, big)) * (0.4 + 0.6 * kick) };
    const lo = { l: 0.05, k: 0.12 * kick };
    const ua = { a: 2.7, b: 1.2 + 0.4 * Math.sin(t * 0.7) };
    const la = { a: 0.35 + 0.6 * Math.min(1, big), b: 0.2 };
    if (side > 0) { legs(P, up.l, up.k, lo.l, lo.k); arms(P, ua.a, ua.b, la.a, la.b); }
    else { legs(P, lo.l, lo.k, up.l, up.k); arms(P, la.a, la.b, ua.a, ua.b); }
    P.torso = 0.03 * Math.sin(t * 1.3);
    P.head = -side * 0.3 * (0.5 + 0.5 * Math.sin(t * 0.4));
  }, { lying: true, init: (I) => { const r = wrap(I.s0rot); I.side = Math.abs(r) > 0.6 ? Math.sign(r) : I.r[1] < 0.5 ? -1 : 1; } });
  mv('roll', 'grounded', [3, 5], 1, (P, t, I) => {
    P.rot = I.s0rot + TAU * I.revs * (t / I.d);
    legs(P, 0.9, 2.4, 0.9, 2.4);
    arms(P, 0.7, -1.9, 0.7, -1.9);
    P.torso = 0.1; P.head = 0.3;
    P.vx = (TAU * I.revs / I.d) * 0.24;
  }, { travels: true, lying: true, init: (I) => { I.revs = I.ri(1, 2); } });
  mv('crawl', 'grounded', [5, 8], 0.9, (P, t, I) => {
    const s = Math.sin(t * TAU * 0.7);
    P.rot = I.rot0 + HALF * 0.95;
    P.torso = -0.05 + 0.04 * s;
    P.head = -0.35;
    P.uaL = HALF + 0.35 * s; P.faL = -0.15; P.uaR = HALF - 0.35 * s; P.faR = -0.15;
    P.thL = HALF + 0.3 * Math.sin(t * TAU * 0.7 + PI); P.shL = HALF;
    P.thR = HALF - 0.3 * Math.sin(t * TAU * 0.7 + PI); P.shR = HALF;
    P.vx = 0.2;
  }, { travels: true, lying: true });
  mv('lean', 'grounded', [5, 8], 0.9, (P, t, I) => {
    const side = I.side;
    P.rot = side * (0.42 + 0.08 * Math.sin(t * 0.8));
    P.torso = side * 0.1 * Math.sin(t * 0.6);
    const want = side * HALF - (P.rot + P.torso);
    P.uaL = want + 0.1 * Math.sin(t * 0.9); P.faL = 0.05; P.uaR = want - 0.15; P.faR = -0.05;
    if (side > 0) legs(P, 0.6, 0, 0.05, 0.25); else legs(P, 0.05, 0.25, 0.6, 0);
    P.head = side * 0.2;
    P.vx = side * 0.02;
  }, { upright: true, init: (I) => { I.side = I.r[1] < 0.5 ? -1 : 1; } });
  mv('curl', 'grounded', [4, 8], 0.9, (P, t, I) => {
    const p = t / I.d, unf = smooth(0.72, 1, p), br = Math.sin(t * 1.2);
    legs(P, 0.55, 2.7 - 1.5 * unf, 0.55, 2.7 - 1.5 * unf);
    arms(P, 0.35 + 2.2 * unf, -2.0 * (1 - unf), 0.35 + 2.2 * unf, -2.0 * (1 - unf));
    P.torso = 0.04 * br; P.head = 0.15 * (1 - unf);
    P.rot = 0.15 * I.side * (1 - unf);
  }, { init: (I) => { I.side = I.r[1] < 0.5 ? -1 : 1; } });

  V.MOVES = MOVES;
  V.MOODS = {
    grounded: { label: 'grounded', words: 'falling / rolling / lying / crawling / leaning' },
    playful: { label: 'playful', words: 'jitter / bounce / shake / silly walk' },
    upside: { label: 'upside-down', words: 'spin / handstand / cartwheel' },
    expansive: { label: 'expansive', words: 'sway / reach / float' },
  };

  // ---------- a dancer ----------
  let SEED = (Date.now() & 0xffff) ^ 0x5eed;

  class Dancer {
    constructor(o) {
      this.o = Object.assign({ W: 800, H: 600, size: 220, moods: ['grounded', 'playful', 'upside', 'expansive'], bursts: true, preview: false, seed: SEED++ }, o);
      this.rand = mulberry32(this.o.seed * 7919 + 13);
      const r = this.rand, W = this.o.W, H = this.o.H;
      this.S = this.o.size / BODY_H;
      this.t = 0;
      this.x = this.o.preview ? W / 2 : lerp(0.18, 0.82, r()) * W;
      if (this.o.x != null) this.x = this.o.x;
      this.floor = this.floorT = this.o.preview ? H * 0.9 : lerp(0.5, 0.9, r()) * H;
      this.scaleMul = 1; this.scaleT = 1;
      this.nextBurst = 6 + r() * 10; this.burstEnd = 0;
      this.appear = 0; this.life = 'in'; this.lifeT = 0; this.dead = false;
      this.J = new Float32Array(NJ * 2 + 2);
      this.hist = []; this.histClock = 0;
      this.state = {};
      this.pose = neutral();
      this.cur = null; this.prev = null;
      this.lastId = null;
      this.update(0);
    }
    get Sk() { return this.S * this.scaleMul * this.appear; }
    get floorY() { return this.floor; }
    get alpha() { return clamp(this.appear * 1.4, 0, 1); }
    get moveId() { return this.cur ? this.cur.m.id : ''; }

    pickMove() {
      const r = this.rand, o = this.o;
      const rotLocal = this.pose.rot;
      const upright = Math.abs(wrap(rotLocal)) < 0.5;
      const prev = this.cur && this.cur.m;
      let pool = Object.values(MOVES).filter((m) => o.moods.includes(m.mood) && m.id !== this.lastId);
      if (!upright) pool = pool.filter((m) => !m.upright);
      if (!pool.length) pool = Object.values(MOVES).filter((m) => o.moods.includes(m.mood));
      if (!pool.length) pool = [MOVES.sway];
      const weights = pool.map((m) => m.weight * (prev && prev.follow && prev.follow.includes(m.id) ? 5 : 1));
      let sum = weights.reduce((a, b) => a + b, 0), k = r() * sum;
      for (let i = 0; i < pool.length; i++) { k -= weights[i]; if (k <= 0) return pool[i]; }
      return pool[pool.length - 1];
    }

    nextMove(m) {
      const r = this.rand, o = this.o, W = o.W;
      m = m || this.pickMove();
      // direction: travel toward the middle when near an edge
      let dir = r() < 0.5 ? -1 : 1;
      if (this.x < W * 0.3) dir = 1; else if (this.x > W * 0.7) dir = -1;
      const s0rot = dir * this.pose.rot;
      const seed = Math.floor(r() * 1e6);
      const I = {
        m, dir, age: 0, seed,
        d: lerp(m.dur[0], m.dur[1], r()),
        r: [r(), r(), r(), r()],
        s0rot, rot0: Math.round(s0rot / TAU) * TAU,
        n: (k, x) => vnoise(x + k * 37.13 + seed * 0.0173),
        h: (k) => hash(k + seed),
        ri: (a, b) => a + Math.floor(hash(seed + 99) * (b - a + 1)),
      };
      if (m.init) m.init(I);
      const prevPose = this.pose;
      this.prev = this.cur;
      this.cur = I;
      this.lastId = m.id;
      const Pn = this.evalInst(I);
      const drot = Math.abs(wrap(Pn.rot - prevPose.rot));
      this.blendDur = this.prev ? (drot > 1 ? 1.3 : 0.75) : 0;
      this.blendAge = 0;
      if (!o.preview && r() < 0.35) this.floorT = lerp(0.42, 0.92, r()) * o.H;
    }

    evalInst(I) {
      const P = neutral();
      I.m.f(P, I.age, I);
      return I.dir < 0 ? mirror(P) : P;
    }

    exit() { if (this.life !== 'out') { this.life = 'out'; this.lifeT = 0; } }

    update(dt) {
      const o = this.o, W = o.W, H = o.H, r = this.rand;
      this.t += dt;
      // life
      this.lifeT += dt;
      if (this.life === 'in') {
        const p = clamp(this.lifeT / 1.0, 0, 1), c = 1.70158;
        this.appear = 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
        if (p >= 1) { this.life = 'on'; this.appear = 1; }
      } else if (this.life === 'out') {
        const p = clamp(this.lifeT / 0.8, 0, 1);
        this.appear = 1 - p * p;
        if (p >= 1) { this.dead = true; this.appear = 0; }
      }
      // choreography
      if (!this.cur || this.cur.age >= this.cur.d) this.nextMove();
      this.cur.age += dt;
      let P = this.evalInst(this.cur);
      if (this.prev && this.blendAge < this.blendDur) {
        this.prev.age += dt; this.blendAge += dt;
        const w = smooth(0, 1, this.blendAge / this.blendDur);
        P = blendPose(this.evalInst(this.prev), P, w);
      }
      this.pose = P;
      // bursts
      if (o.bursts && !o.preview) {
        if (this.t > this.nextBurst && this.scaleT === 1) { this.scaleT = 1.6 + r() * 1.5; this.burstEnd = this.t + 2.5 + r() * 2; }
        if (this.scaleT !== 1 && this.t > this.burstEnd) { this.scaleT = 1; this.nextBurst = this.t + 9 + r() * 14; }
      }
      this.scaleMul += (this.scaleT - this.scaleMul) * (1 - Math.exp(-dt * 2.6));
      const Sk = this.Sk;
      // travel
      this.x += P.vx * Sk * (o.preview ? 0.5 : 1) * dt;
      const margin = o.preview ? W * 0.28 : Math.max(40, Sk * 0.55);
      if (this.x < margin) this.x += (margin - this.x) * Math.min(1, dt * 3);
      if (this.x > W - margin) this.x -= (this.x - (W - margin)) * Math.min(1, dt * 3);
      // floor
      const minFloor = this.S * this.scaleMul * (1.0 + 0.55) + 12;
      this.floorT = clamp(this.floorT, Math.min(minFloor, H - 8), H - 8);
      this.floor += (this.floorT - this.floor) * (1 - Math.exp(-dt * 1.1));
      if (!o.preview) this.floor = clamp(this.floor, Math.min(minFloor, H - 8), H - 8);
      // body → world
      const maxY = fk(P);
      const Jw = this.J, oy = this.floor - P.lift * Sk;
      for (let i = 0; i < NJ; i++) {
        Jw[i * 2] = this.x + L[i * 2] * Sk;
        Jw[i * 2 + 1] = oy + (L[i * 2 + 1] - maxY) * Sk;
      }
      Jw[J.S] = Sk; Jw[J.S + 1] = this.t;
      // memory for trails
      this.histClock += dt;
      if (this.histClock >= 1 / 30 || !this.hist.length) {
        this.histClock = 0;
        this.hist.push(Float32Array.from(Jw));
        const keep = 3.2;
        while (this.hist.length > 2 && this.t - this.hist[0][J.S + 1] > keep) this.hist.shift();
      }
    }
  }
  V.Dancer = Dancer;
})();
