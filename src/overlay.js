/* the overlay: a transparent, click-through layer where the body appears */
(function () {
  const canvas = document.getElementById('stage');
  let stage = null, endTimer = null, finished = false;

  const finish = () => { if (finished) return; finished = true; window.wvw.done(); };
  const leave = () => { clearTimeout(endTimer); if (stage) stage.exit(finish); else finish(); };

  window.wvw.onStart((cfg) => {
    stage = new WVW.Stage(canvas, {
      style: cfg.style, figures: cfg.figures, size: cfg.size, moods: cfg.moods, bursts: cfg.bursts,
    });
    stage.start();
    if (cfg.seconds > 0) endTimer = setTimeout(leave, cfg.seconds * 1000);
  });
  window.wvw.onStop(leave);
  window.addEventListener('resize', () => stage && stage.resize());
})();
