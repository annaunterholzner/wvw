/* wvw — ten ways to draw a body
 * every style receives the same skeleton (d.J) and its recent memory (d.hist).
 */
(function () {
  const V = window.WVW;
  const { J } = V;
  const { clamp, lerp, hash, mulberry32, vnoise, TAU, PI } = V.math;

  const INK = '#0b0b0b', PAPER = '#f9f9f5', LIME = '#d7ff3a', TEAL = '#5fd3a5', VIOLET = '#9b8cff', CORAL = '#ff6b4a', COBALT = '#2b4bff';

  const X = (A, i) => A[i * 2], Y = (A, i) => A[i * 2 + 1];
  function bonesPath(ctx, A) {
    ctx.beginPath();
    for (const [a, b] of J.BONES) { ctx.moveTo(X(A, a), Y(A, a)); ctx.lineTo(X(A, b), Y(A, b)); }
  }
  function headPath(ctx, A, k = 1) {
    ctx.moveTo(X(A, J.HEAD) + A[J.S] * J.HEAD_R * k, Y(A, J.HEAD));
    ctx.arc(X(A, J.HEAD), Y(A, J.HEAD), A[J.S] * J.HEAD_R * k, 0, TAU);
  }
  function stick(ctx, A, width, color, headFill) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = width; ctx.strokeStyle = color;
    bonesPath(ctx, A); headPath(ctx, A); ctx.stroke();
    if (headFill) { ctx.beginPath(); headPath(ctx, A); ctx.fillStyle = headFill; ctx.fill(); }
  }
  // pose from `age` seconds ago
  function past(d, age) {
    const h = d.hist; if (!h.length) return d.J;
    const target = d.J[J.S + 1] - age;
    for (let i = h.length - 1; i >= 0; i--) if (h[i][J.S + 1] <= target) return h[i];
    return h[0];
  }
  function shadow(ctx, d, a = 0.13) {
    const S = d.J[J.S]; if (S < 2) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(X(d.J, J.PELVIS), d.floorY + S * 0.012, S * 0.22, S * 0.03, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  const lw = (S, k, min) => Math.max(min, S * k);

  const styles = [];
  const add = (s) => styles.push(s);

  // 01 — ink: the quiet stick figure
  add({
    id: 'ink', name: 'ink', blurb: 'a thin line, almost nothing', fps: 24,
    draw(ctx, d) {
      const S = d.J[J.S], w = lw(S, 0.016, 1.6);
      shadow(ctx, d);
      for (const [age, a] of [[0.36, 0.06], [0.24, 0.1], [0.12, 0.18]]) {
        ctx.save(); ctx.globalAlpha *= a; stick(ctx, past(d, age), w, INK); ctx.restore();
      }
      stick(ctx, d.J, w + 4, 'rgba(249,249,245,0.8)');
      stick(ctx, d.J, w, INK);
    },
  });

  // 02 — marey: chronophotography, white lines and joint-dots on a black suit
  add({
    id: 'marey', name: 'marey', blurb: 'chronophotograph, 1882', fps: 0,
    draw(ctx, d) {
      const S = d.J[J.S], w = lw(S, 0.011, 1.2);
      const n = 12;
      for (let i = n; i >= 0; i--) {
        const A = i === 0 ? d.J : past(d, i * 0.11);
        const a = i === 0 ? 1 : Math.pow(1 - i / (n + 1), 1.6) * 0.75;
        ctx.save(); ctx.globalAlpha *= a;
        stick(ctx, A, w + 3.5, 'rgba(11,11,11,0.75)');
        stick(ctx, A, w, '#ffffff');
        ctx.fillStyle = '#ffffff';
        for (let j = 1; j < J.COUNT; j++) { ctx.beginPath(); ctx.arc(X(A, j), Y(A, j), w * 1.25, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    },
  });

  // 03 — ribbon: hands and feet write luminous trails
  add({
    id: 'ribbon', name: 'ribbon', blurb: 'limbs leave light behind', fps: 0,
    draw(ctx, d) {
      const S = d.J[J.S], h = d.hist, n = h.length;
      const ends = [[J.HAND_L, LIME], [J.HAND_R, LIME], [J.FOOT_L, TEAL], [J.FOOT_R, TEAL], [J.HEAD, VIOLET]];
      const span = Math.min(n, 48);
      ctx.lineCap = 'round';
      for (const [j, col] of ends) {
        for (let pass = 0; pass < 2; pass++) {
          for (let k = n - span + 1; k < n; k++) {
            const p = (k - (n - span)) / span;
            const A = h[k - 1], B = h[k];
            const wd = Math.max(1, S * 0.05 * p) * (pass ? 1 : 1.35) + (pass ? 0 : 2);
            ctx.globalAlpha = (pass ? 0.85 : 0.22) * p * d.alpha;
            ctx.strokeStyle = pass ? col : INK;
            ctx.lineWidth = wd;
            ctx.beginPath(); ctx.moveTo(X(A, j), Y(A, j)); ctx.lineTo(X(B, j), Y(B, j)); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = d.alpha * 0.9;
      stick(ctx, d.J, lw(S, 0.008, 1.2), INK);
    },
  });

  // 04 — scribble: boiling pencil, redrawn on threes
  add({
    id: 'scribble', name: 'scribble', blurb: 'pencil, boiling on threes', fps: 8,
    draw(ctx, d, env) {
      const S = d.J[J.S], A = d.J, seed = env.frame * 977 + d.o.seed;
      const jit = S * 0.018;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // both passes replay the same random stream so the halo matches the line
      const pass = (col, wmul) => {
        const rnd = mulberry32(seed), g = () => (rnd() * 2 - 1) * jit;
        for (const [a, b] of J.BONES) {
          const ax = X(A, a), ay = Y(A, a), bx = X(A, b), by = Y(A, b);
          for (let s = 0; s < 3; s++) {
            ctx.strokeStyle = col; ctx.lineWidth = (0.9 + rnd() * 1.1) * wmul;
            ctx.beginPath();
            ctx.moveTo(ax + g(), ay + g());
            ctx.quadraticCurveTo((ax + bx) / 2 + g() * 1.6, (ay + by) / 2 + g() * 1.6, bx + g(), by + g());
            ctx.stroke();
          }
        }
        const hx = X(A, J.HEAD), hy = Y(A, J.HEAD), R = S * J.HEAD_R;
        ctx.beginPath();
        const turns = 2.2 + rnd(), a0 = rnd() * TAU;
        for (let k = 0; k <= 40; k++) {
          const t = k / 40, a = a0 + t * TAU * turns, rr = R * (0.85 + 0.3 * vnoise(t * 6 + env.frame * 3.1));
          k ? ctx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr) : ctx.moveTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr);
        }
        ctx.lineWidth = 1.1 * wmul; ctx.stroke();
      };
      ctx.save(); ctx.globalAlpha *= 0.55; pass('rgba(249,249,245,1)', 3.2); ctx.restore();
      pass('rgba(28,28,34,0.88)', 1);
    },
  });

  // 05 — pixel: a body of large square pixels
  add({
    id: 'pixel', name: 'pixel', blurb: 'low resolution, high spirit', fps: 12,
    draw(ctx, d, env) {
      const S = d.J[J.S]; if (S < 4) return;
      const A = d.J, px = Math.max(3, Math.round(S / 34));
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < J.COUNT; i++) { x0 = Math.min(x0, X(A, i)); x1 = Math.max(x1, X(A, i)); y0 = Math.min(y0, Y(A, i)); y1 = Math.max(y1, Y(A, i)); }
      const pad = S * 0.12; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
      x0 = Math.floor(x0 / px) * px; y0 = Math.floor(y0 / px) * px;
      const w = Math.ceil((x1 - x0) / px) + 2, h = Math.ceil((y1 - y0) / px) + 2;
      const st = env.cache.pixel || (env.cache.pixel = { a: document.createElement('canvas'), b: document.createElement('canvas') });
      const a = st.a, b = st.b;
      a.width = b.width = w; a.height = b.height = h;
      const c = a.getContext('2d', { willReadFrequently: true });
      c.clearRect(0, 0, w, h);
      c.save(); c.translate(-x0 / px, -y0 / px); c.scale(1 / px, 1 / px);
      c.lineCap = 'square'; c.lineJoin = 'miter';
      c.strokeStyle = '#000'; c.lineWidth = S * 0.06; bonesPath(c, A); c.stroke();
      c.beginPath(); headPath(c, A, 1.25); c.fillStyle = '#000'; c.fill();
      c.restore();
      const img = c.getImageData(0, 0, w, h), D = img.data;
      for (let i = 3; i < D.length; i += 4) D[i] = D[i] > 90 ? 255 : 0;
      c.putImageData(img, 0, 0);
      const cb = b.getContext('2d');
      const tint = (col) => { cb.globalCompositeOperation = 'source-over'; cb.clearRect(0, 0, w, h); cb.drawImage(a, 0, 0); cb.globalCompositeOperation = 'source-in'; cb.fillStyle = col; cb.fillRect(0, 0, w, h); cb.globalCompositeOperation = 'source-over'; };
      ctx.imageSmoothingEnabled = false;
      tint(INK);
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) ctx.drawImage(b, x0 + ox * px, y0 + oy * px, w * px, h * px);
      tint(LIME);
      ctx.drawImage(b, x0, y0, w * px, h * px);
      // a single dark eye pixel, because it is alive
      ctx.fillStyle = INK;
      ctx.fillRect(Math.round((X(A, J.HEAD)) / px) * px, Math.round((Y(A, J.HEAD) - px * 0.5) / px) * px, px, px);
      ctx.imageSmoothingEnabled = true;
    },
  });

  // 06 — ascii: a body typed out of characters
  add({
    id: 'ascii', name: 'ascii', blurb: 'a body typed, not drawn', fps: 10,
    draw(ctx, d) {
      const S = d.J[J.S]; if (S < 6) return;
      const fs = Math.max(11, Math.round(S * 0.075)), cw = fs * 0.62, ch = fs * 0.92;
      ctx.font = `bold ${fs}px "Courier New", Courier, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const cells = new Map();
      const putc = (x, y, c, pri) => {
        const gx = Math.round(x / cw), gy = Math.round(y / ch), k = gx + ',' + gy;
        const cur = cells.get(k); if (!cur || cur.p < pri) cells.set(k, { gx, gy, c, p: pri });
      };
      const glyph = (dx, dy) => {
        let a = (Math.atan2(dy, dx) * 180) / PI; if (a < 0) a += 180;
        return a < 22.5 || a >= 157.5 ? '-' : a < 67.5 ? '\\' : a < 112.5 ? '|' : '/';
      };
      const body = (A, pri, chars) => {
        for (const [a, b] of J.BONES) {
          const ax = X(A, a), ay = Y(A, a), bx = X(A, b), by = Y(A, b);
          const len = Math.hypot(bx - ax, by - ay), steps = Math.max(1, Math.ceil(len / (Math.min(cw, ch) * 0.8)));
          const g = chars || glyph(bx - ax, by - ay);
          for (let s = 0; s <= steps; s++) putc(lerp(ax, bx, s / steps), lerp(ay, by, s / steps), g, pri);
        }
      };
      body(past(d, 0.5), 1, '.');
      body(past(d, 0.25), 2, ':');
      body(d.J, 5);
      const A = d.J;
      for (const j of [J.HAND_L, J.HAND_R]) putc(X(A, j), Y(A, j), '*', 8);
      for (const j of [J.FOOT_L, J.FOOT_R]) putc(X(A, j), Y(A, j), '_', 8);
      putc(X(A, J.HEAD), Y(A, J.HEAD), '@', 9);
      const headKey = Math.round(X(A, J.HEAD) / cw) + ',' + Math.round(Y(A, J.HEAD) / ch);
      for (const [k, c] of cells) {
        const x = c.gx * cw, y = c.gy * ch;
        if (k === headKey) { ctx.fillStyle = LIME; ctx.fillRect(x - cw / 2, y - ch / 2, cw, ch); }
        ctx.globalAlpha = d.alpha * (c.p >= 5 ? 1 : c.p === 2 ? 0.55 : 0.3);
        if (c.p >= 5) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(249,249,245,0.85)'; ctx.strokeText(c.c, x, y); }
        ctx.fillStyle = INK; ctx.fillText(c.c, x, y);
      }
      ctx.globalAlpha = d.alpha;
    },
  });

  // 07 — dust: a body of particles that lag behind the movement
  add({
    id: 'dust', name: 'dust', blurb: 'a body that arrives late', fps: 0,
    draw(ctx, d, env) {
      const S = d.J[J.S], A = d.J, dt = Math.min(0.05, env.dt);
      let st = d.state.dust;
      if (!st) {
        const r = mulberry32(d.o.seed + 3), N = 760, P = [];
        const lens = J.BONES.map(([a, b]) => Math.hypot(X(A, b) - X(A, a), Y(A, b) - Y(A, a)) + 1);
        const tot = lens.reduce((x, y) => x + y, 0) + 60;
        for (let i = 0; i < N; i++) {
          let pick = r() * tot, bi = -1;
          for (let k = 0; k < lens.length; k++) { pick -= lens[k]; if (pick < 0) { bi = k; break; } }
          const g = () => (r() + r() + r() - 1.5) / 1.5;
          P.push({ b: bi, u: r(), ox: g(), oy: g(), x: X(A, J.PELVIS), y: Y(A, J.PELVIS), k: 1.5 + r() * r() * 16, s: 0.8 + r() * 2.2, c: r() < 0.55 ? 0 : r() < 0.6 ? 1 : 2, ph: r() * TAU });
        }
        st = d.state.dust = { P };
      }
      const cols = ['rgba(42,36,64,0.85)', 'rgba(215,255,58,0.95)', 'rgba(255,255,255,0.9)'];
      const spread = S * 0.035;
      for (const p of st.P) {
        let tx, ty;
        if (p.b < 0) { const a = p.u * TAU; tx = X(A, J.HEAD) + Math.cos(a) * S * J.HEAD_R * (0.6 + 0.4 * p.ox); ty = Y(A, J.HEAD) + Math.sin(a) * S * J.HEAD_R * (0.6 + 0.4 * p.oy); }
        else { const [a, b] = J.BONES[p.b]; tx = lerp(X(A, a), X(A, b), p.u) + p.ox * spread; ty = lerp(Y(A, a), Y(A, b), p.u) + p.oy * spread; }
        const f = 1 - Math.exp(-dt * p.k);
        p.x += (tx - p.x) * f + Math.sin(env.t * 2 + p.ph) * 0.15;
        p.y += (ty - p.y) * f + Math.cos(env.t * 1.7 + p.ph) * 0.15;
      }
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = cols[c];
        ctx.beginPath();
        for (const p of st.P) if (p.c === c) { const s = p.s * Math.max(0.7, S / 170); ctx.rect(p.x - s / 2, p.y - s / 2, s, s); }
        ctx.fill();
      }
    },
  });

  // 08 — cutout: paper shapes, jazz, a little shadow
  add({
    id: 'cutout', name: 'cutout', blurb: 'cut paper, pinned and unpinned', fps: 10,
    draw(ctx, d, env) {
      const S = d.J[J.S], A = d.J, rnd = mulberry32(env.frame * 131 + d.o.seed);
      const j = () => (rnd() * 2 - 1) * S * 0.006;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowOffsetX = Math.max(1.5, S * 0.008); ctx.shadowOffsetY = Math.max(2, S * 0.012); ctx.shadowBlur = 0;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const limb = (a, b, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(X(A, a) + j(), Y(A, a) + j()); ctx.lineTo(X(A, b) + j(), Y(A, b) + j()); ctx.stroke(); };
      // legs behind
      limb(J.PELVIS, J.KNEE_L, S * 0.075, LIME); limb(J.KNEE_L, J.FOOT_L, S * 0.06, LIME);
      limb(J.PELVIS, J.KNEE_R, S * 0.075, LIME); limb(J.KNEE_R, J.FOOT_R, S * 0.06, LIME);
      // torso as a tapered paper shape
      const nx = X(A, J.NECK), ny = Y(A, J.NECK), px = X(A, J.PELVIS), py = Y(A, J.PELVIS);
      const L = Math.hypot(nx - px, ny - py) || 1, ux = (nx - px) / L, uy = (ny - py) / L, vx = -uy, vy = ux;
      const ws = S * 0.085, wh = S * 0.06;
      ctx.fillStyle = COBALT; ctx.beginPath();
      ctx.moveTo(nx + vx * ws + j(), ny + vy * ws + j());
      ctx.lineTo(nx - vx * ws + j(), ny - vy * ws + j());
      ctx.quadraticCurveTo((nx + px) / 2 - vx * wh * 0.6, (ny + py) / 2 - vy * wh * 0.6, px - vx * wh + j(), py - vy * wh + j());
      ctx.lineTo(px + vx * wh + j(), py + vy * wh + j());
      ctx.quadraticCurveTo((nx + px) / 2 + vx * wh * 0.6, (ny + py) / 2 + vy * wh * 0.6, nx + vx * ws, ny + vy * ws);
      ctx.fill();
      // arms
      limb(J.CHEST, J.ELBOW_L, S * 0.05, CORAL); limb(J.ELBOW_L, J.HAND_L, S * 0.042, CORAL);
      limb(J.CHEST, J.ELBOW_R, S * 0.05, CORAL); limb(J.ELBOW_R, J.HAND_R, S * 0.042, CORAL);
      // hair whipping against the direction of travel
      const hx = X(A, J.HEAD), hy = Y(A, J.HEAD), R = S * J.HEAD_R * 1.1;
      const prev = past(d, 0.15), mvx = hx - X(prev, J.HEAD), mvy = hy - Y(prev, J.HEAD);
      const ang = Math.atan2(-(mvy) - S * 0.02, -(mvx)) ;
      ctx.fillStyle = INK; ctx.beginPath();
      for (let k = -3; k <= 3; k++) {
        const a = ang + k * 0.28 + (rnd() - 0.5) * 0.15, len = R * (1.4 + rnd() * 1.4);
        ctx.moveTo(hx + Math.cos(a + 0.18) * R * 0.8, hy + Math.sin(a + 0.18) * R * 0.8);
        ctx.lineTo(hx + Math.cos(a) * (R + len), hy + Math.sin(a) * (R + len));
        ctx.lineTo(hx + Math.cos(a - 0.18) * R * 0.8, hy + Math.sin(a - 0.18) * R * 0.8);
      }
      ctx.fill();
      ctx.fillStyle = '#f2efe6'; ctx.beginPath(); ctx.arc(hx + j(), hy + j(), R, 0, TAU); ctx.fill();
      ctx.restore();
    },
  });

  // 09 — sumi: calligraphic brush, an ensō for a head, ink that splatters
  add({
    id: 'sumi', name: 'sumi', blurb: 'brush and ink, one breath', fps: 12,
    draw(ctx, d, env) {
      const S = d.J[J.S], A = d.J, rnd = mulberry32(env.frame * 53 + d.o.seed);
      const W = Math.max(2.5, S * 0.048);
      const stroke = (pts, wmax, col) => {
        // centripetal-ish smoothing through the chain, then a swelling width
        const P = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
          for (let s = 0; s < 8; s++) P.push([lerp(ax, bx, s / 8), lerp(ay, by, s / 8)]);
        }
        P.push(pts[pts.length - 1]);
        const left = [], right = [], n = P.length;
        for (let i = 0; i < n; i++) {
          const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
          let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
          const t = i / (n - 1), w = wmax * Math.pow(Math.sin(PI * clamp(t * 0.92 + 0.06, 0, 1)), 0.7) * (0.75 + 0.35 * vnoise(i * 0.7 + env.frame));
          left.push([P[i][0] - ty * w, P[i][1] + tx * w]); right.push([P[i][0] + ty * w, P[i][1] - tx * w]);
        }
        ctx.fillStyle = col; ctx.beginPath();
        ctx.moveTo(left[0][0], left[0][1]);
        for (const p of left) ctx.lineTo(p[0], p[1]);
        for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
        ctx.closePath(); ctx.fill();
      };
      const chain = (A2, ids) => ids.map((i) => [X(A2, i), Y(A2, i)]);
      const body = (A2, col, k) => {
        stroke(chain(A2, [J.HEAD, J.NECK, J.PELVIS]).slice(1), W * 1.15 * k, col);
        stroke(chain(A2, [J.CHEST, J.ELBOW_L, J.HAND_L]), W * k, col);
        stroke(chain(A2, [J.CHEST, J.ELBOW_R, J.HAND_R]), W * k, col);
        stroke(chain(A2, [J.PELVIS, J.KNEE_L, J.FOOT_L]), W * 1.1 * k, col);
        stroke(chain(A2, [J.PELVIS, J.KNEE_R, J.FOOT_R]), W * 1.1 * k, col);
        // ensō
        const hx = X(A2, J.HEAD), hy = Y(A2, J.HEAD), R = S * J.HEAD_R, a0 = 1.9 + hash(d.o.seed) * 2;
        ctx.beginPath();
        const segs = 36;
        for (let s = 0; s <= segs; s++) { const t = s / segs, a = a0 + t * TAU * 0.9, rr = R * (1 + 0.06 * Math.sin(t * 9)); s ? ctx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr) : ctx.moveTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr); }
        for (let s = segs; s >= 0; s--) { const t = s / segs, a = a0 + t * TAU * 0.9, rr = R * (1 + 0.06 * Math.sin(t * 9)) - W * 0.9 * k * Math.pow(Math.sin(PI * t), 0.5); ctx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr); }
        ctx.fillStyle = col; ctx.fill();
      };
      // ink bleed of the last breath
      ctx.save(); ctx.globalAlpha *= 0.12; body(past(d, 0.18), INK, 1.5); ctx.restore();
      ctx.save(); ctx.shadowColor = 'rgba(249,249,245,0.7)'; ctx.shadowBlur = 6; body(A, 'rgba(12,12,12,0.94)', 1); ctx.restore();
      // splatter when hands move fast
      const st = d.state.sumi || (d.state.sumi = { drops: [] });
      const prev = past(d, 0.1);
      for (const h of [J.HAND_L, J.HAND_R, J.FOOT_L, J.FOOT_R]) {
        const v = Math.hypot(X(A, h) - X(prev, h), Y(A, h) - Y(prev, h)) / Math.max(1, S);
        if (v > 0.12 && rnd() < 0.7) for (let k = 0; k < 3; k++) st.drops.push({ x: X(A, h) + (rnd() - 0.5) * S * 0.12, y: Y(A, h) + (rnd() - 0.5) * S * 0.12, r: Math.max(1, S * (0.004 + rnd() * 0.012)), t: env.t });
      }
      st.drops = st.drops.filter((p) => env.t - p.t < 2.2).slice(-160);
      ctx.fillStyle = INK;
      for (const p of st.drops) { ctx.globalAlpha = d.alpha * (1 - (env.t - p.t) / 2.2) * 0.85; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = d.alpha;
    },
  });

  // 10 — smear: the gesture as a blurred mass, like paint dragged across glass
  add({
    id: 'smear', name: 'smear', blurb: 'the gesture, dragged through glass', fps: 30,
    draw(ctx, d, env) {
      const S = d.J[J.S], k = 6;
      const st = env.cache.smear || (env.cache.smear = { c: document.createElement('canvas') });
      const cw = Math.ceil(env.w / k), ch = Math.ceil(env.h / k);
      if (st.c.width !== cw || st.c.height !== ch) { st.c.width = cw; st.c.height = ch; }
      const c = st.c.getContext('2d');
      c.clearRect(0, 0, cw, ch);
      c.save(); c.scale(1 / k, 1 / k);
      c.filter = `blur(${Math.max(1, S * 0.012)}px)`;
      c.lineCap = 'round'; c.lineJoin = 'round';
      const h = d.hist, n = h.length;
      for (let i = Math.max(0, n - 60); i < n; i += 3) {
        const A = h[i], p = (i - (n - 60)) / 60;
        c.globalAlpha = 0.07 + 0.1 * clamp(p, 0, 1);
        c.strokeStyle = 'rgb(118,110,138)'; c.lineWidth = S * 0.16;
        bonesPath(c, A); c.stroke();
        c.beginPath(); headPath(c, A, 1.6); c.fillStyle = 'rgb(118,110,138)'; c.fill();
      }
      c.globalAlpha = 0.55; c.strokeStyle = 'rgb(190,240,90)'; c.lineWidth = S * 0.07;
      for (const j of [J.HAND_L, J.HAND_R]) {
        c.beginPath();
        for (let i = Math.max(0, n - 30); i < n; i++) i === Math.max(0, n - 30) ? c.moveTo(X(h[i], j), Y(h[i], j)) : c.lineTo(X(h[i], j), Y(h[i], j));
        c.stroke();
      }
      c.restore();
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(st.c, 0, 0, cw * k, ch * k);
      stick(ctx, d.J, Math.max(1, S * 0.007), 'rgba(11,11,11,0.85)');
    },
  });

  V.styles = styles;
  V.styleById = (id) => styles.find((s) => s.id === id) || styles[0];
})();
