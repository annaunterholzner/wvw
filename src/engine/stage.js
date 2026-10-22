/* wvw — stage: runs dancers on a canvas in one style */
(function () {
  const V = window.WVW;

  class Stage {
    constructor(canvas, opts) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.o = Object.assign({ style: 'ink', figures: 1, size: 220, moods: Object.keys(V.MOODS), bursts: true, preview: false }, opts);
      this.style = V.styleById(this.o.style);
      this.cache = {};
      this.dancers = [];
      this.running = false;
      this.ending = false;
      this.onDone = null;
      this.t = 0; this.lastStep = -1;
      this.resize();
      this._loop = this.loop.bind(this);
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      this.w = Math.max(1, Math.round(r.width || this.c.clientWidth || 300));
      this.h = Math.max(1, Math.round(r.height || this.c.clientHeight || 300));
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.c.width = Math.round(this.w * this.dpr);
      this.c.height = Math.round(this.h * this.dpr);
      for (const d of this.dancers) { d.o.W = this.w; d.o.H = this.h; }
    }
    spawn() {
      const n = this.o.figures;
      for (let i = 0; i < n; i++) {
        const x = n > 1 ? this.w * (0.2 + (0.6 * i) / (n - 1)) : null;
        this.dancers.push(new V.Dancer({ W: this.w, H: this.h, size: this.o.size * (n > 1 ? 0.85 : 1), moods: this.o.moods, bursts: this.o.bursts, preview: this.o.preview, x }));
      }
    }
    setStyle(id) { this.style = V.styleById(id); this.cache = {}; for (const d of this.dancers) d.state = {}; }
    start() {
      if (this.running) return;
      if (!this.dancers.length) this.spawn();
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this._loop);
    }
    pause() { this.running = false; }
    exit(cb) {
      this.ending = true; this.onDone = cb || this.onDone;
      for (const d of this.dancers) d.exit();
    }
    // advance the simulation without drawing (used by tests and previews)
    step(dt) { this.t += dt; for (const d of this.dancers) d.update(dt); }
    loop(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      this.step(dt);
      this.dancers = this.dancers.filter((d) => !d.dead);
      const fps = this.style.fps;
      const stepIdx = fps ? Math.floor(this.t * fps) : Math.floor(this.t * 120);
      if (stepIdx !== this.lastStep) {
        this.render(fps ? 1 / fps : dt, stepIdx);
        this.lastStep = stepIdx;
      }
      if (this.ending && !this.dancers.length) {
        this.running = false;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.c.width, this.c.height);
        if (this.onDone) this.onDone();
        return;
      }
      requestAnimationFrame(this._loop);
    }
    render(dt = 1 / 60, frame = 0) {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.c.width, this.c.height);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const env = { w: this.w, h: this.h, t: this.t, dt, frame, cache: this.cache };
      for (const d of this.dancers) {
        if (d.Sk < 0.5) continue;
        ctx.save();
        ctx.globalAlpha = d.alpha;
        this.style.draw(ctx, d, env);
        ctx.restore();
      }
    }
  }
  V.Stage = Stage;
})();
