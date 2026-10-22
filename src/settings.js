/* settings: a personal ritual, on your terms */
(async function () {
  const $ = (s) => document.querySelector(s);
  const SESSION = [10, 20, 45, 60, 120, 300, 600, 0];
  const sessionLabel = (s) => (s === 0 ? 'until ESC' : s < 60 ? `${s} sec` : `${s / 60} min`);
  const minLabel = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`);

  let { settings: S, status, version } = await window.vvw.get();
  $('#version').textContent = `a desktop ritual · v${version}`;
  const save = async (patch) => { const r = await window.vvw.set(patch); S = r.settings; status = r.status; renderStatus(); };

  // ---------- status ----------
  function renderStatus() {
    const now = Date.now();
    let line;
    if (status.dancing) line = 'dancing now — press ESC to reclaim your screen';
    else if (!S.running) line = 'interruptions are off. the body waits.';
    else if (status.pausedUntil > now) line = `paused until ${new Date(status.pausedUntil).toTimeString().slice(0, 5)}`;
    else if (status.resting) line = `resting — the creature sleeps until ${String(S.rest.to).padStart(2, '0')}:00`;
    else {
      const m = Math.max(0, Math.round((status.nextAt - now) / 60000));
      line = m < 1 ? 'the next body arrives any moment now' : `the next body arrives in ~${minLabel(m)}`;
    }
    $('#statusLine').textContent = line;
    $('#running').checked = S.running;
    $('#danceNow').disabled = status.dancing;
    $('#pause').textContent = status.pausedUntil > now ? 'resume' : 'pause 1 h';
  }
  window.vvw.onStatus((s) => { status = s; renderStatus(); });
  setInterval(() => { status.now = Date.now(); renderStatus(); }, 20000);
  $('#running').addEventListener('change', (e) => save({ running: e.target.checked }));
  $('#danceNow').addEventListener('click', () => window.vvw.dance());
  $('#pause').addEventListener('click', async () => { status = await window.vvw.pause(status.pausedUntil > Date.now() ? 0 : 60); renderStatus(); });

  // ---------- styles (live previews) ----------
  const grid = $('#styles');
  const stages = [];
  VVW.styles.forEach((st, i) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.innerHTML = `<canvas></canvas><div class="blurb"></div><button class="try" title="try on desktop">▶</button>
      <div class="cap"><span><span class="n">${String(i + 1).padStart(2, '0')}</span><b>${st.name}</b></span><span class="dot"></span></div>`;
    tile.querySelector('.blurb').textContent = st.blurb;
    grid.appendChild(tile);
    const sync = () => tile.classList.toggle('on', !!S.styles[st.id]);
    sync();
    tile.addEventListener('click', (e) => {
      if (e.target.closest('.try')) return;
      const next = !S.styles[st.id];
      const count = Object.values(S.styles).filter(Boolean).length;
      if (!next && count <= 1) return; // at least one body must remain
      save({ styles: { [st.id]: next } }).then(sync);
    });
    tile.querySelector('.try').addEventListener('click', () => window.vvw.dance({ style: st.id }));
    requestAnimationFrame(() => {
      const cv = tile.querySelector('canvas');
      const h = cv.getBoundingClientRect().height || 140;
      const stage = new VVW.Stage(cv, { style: st.id, size: h * 0.5, preview: true, bursts: false, moods: moodList() });
      stage.start();
      stages.push(stage);
    });
  });
  window.addEventListener('resize', () => stages.forEach((s) => s.resize()));
  document.addEventListener('visibilitychange', () => stages.forEach((s) => (document.hidden ? s.pause() : s.start())));

  // ---------- rhythm ----------
  const minI = $('#minMin'), maxI = $('#maxMin');
  function renderRhythm() {
    minI.value = S.minMinutes; maxI.value = S.maxMinutes;
    $('#minOut').textContent = `from ${minLabel(+S.minMinutes)}`;
    $('#maxOut').textContent = `to ${minLabel(+S.maxMinutes)}`;
    document.querySelectorAll('#rhythmChips button').forEach((b) => b.classList.toggle('on', +b.dataset.min === +S.minMinutes && +b.dataset.max === +S.maxMinutes));
  }
  minI.addEventListener('input', () => { S.minMinutes = +minI.value; if (S.maxMinutes < S.minMinutes) S.maxMinutes = S.minMinutes; renderRhythm(); });
  maxI.addEventListener('input', () => { S.maxMinutes = +maxI.value; if (S.minMinutes > S.maxMinutes) S.minMinutes = S.maxMinutes; renderRhythm(); });
  for (const el of [minI, maxI]) el.addEventListener('change', () => save({ minMinutes: S.minMinutes, maxMinutes: S.maxMinutes }));
  document.querySelectorAll('#rhythmChips button').forEach((b) => b.addEventListener('click', () => {
    S.minMinutes = +b.dataset.min; S.maxMinutes = +b.dataset.max; renderRhythm();
    save({ minMinutes: S.minMinutes, maxMinutes: S.maxMinutes });
  }));
  renderRhythm();

  // ---------- session ----------
  const ses = $('#session');
  const idx = SESSION.indexOf(S.sessionSeconds);
  ses.value = idx >= 0 ? idx : 2;
  const renderSession = () => ($('#sessionOut').textContent = sessionLabel(SESSION[+ses.value]));
  ses.addEventListener('input', renderSession);
  ses.addEventListener('change', () => save({ sessionSeconds: SESSION[+ses.value] }));
  renderSession();

  // ---------- moods ----------
  function moodList() { const on = Object.keys(S.moods).filter((k) => S.moods[k]); return on.length ? on : Object.keys(VVW.MOODS); }
  const moodsEl = $('#moods');
  Object.entries(VVW.MOODS).forEach(([id, m]) => {
    const el = document.createElement('div');
    el.className = 'mood';
    el.innerHTML = `<b></b><span></span>`;
    el.querySelector('b').textContent = m.label;
    el.querySelector('span').textContent = m.words;
    const sync = () => el.classList.toggle('on', !!S.moods[id]);
    sync();
    el.addEventListener('click', async () => {
      const next = !S.moods[id];
      if (!next && moodList().length <= 1) return;
      await save({ moods: { [id]: next } });
      sync();
      stages.forEach((s) => s.dancers.forEach((d) => (d.o.moods = moodList())));
    });
    moodsEl.appendChild(el);
  });

  // ---------- body ----------
  const segs = document.querySelectorAll('#size button');
  const renderSize = () => segs.forEach((b) => b.classList.toggle('on', b.dataset.v === S.size));
  segs.forEach((b) => b.addEventListener('click', () => { S.size = b.dataset.v; renderSize(); save({ size: S.size }); }));
  renderSize();
  const bindCheck = (sel, get, set) => { const el = $(sel); el.checked = get(); el.addEventListener('change', () => save(set(el.checked))); };
  bindCheck('#bursts', () => S.bursts, (v) => ({ bursts: v }));
  bindCheck('#chorus', () => S.chorus, (v) => ({ chorus: v }));
  bindCheck('#login', () => S.openAtLogin, (v) => ({ openAtLogin: v }));
  bindCheck('#restOn', () => S.rest.enabled, (v) => ({ rest: { enabled: v } }));

  // ---------- rest ----------
  for (const [sel, key] of [['#restFrom', 'from'], ['#restTo', 'to']]) {
    const el = $(sel);
    for (let h = 0; h < 24; h++) { const o = document.createElement('option'); o.value = h; o.textContent = `${String(h).padStart(2, '0')}:00`; el.appendChild(o); }
    el.value = S.rest[key];
    el.addEventListener('change', () => save({ rest: { [key]: +el.value } }));
  }

  $('#site').addEventListener('click', (e) => { e.preventDefault(); window.vvw.link('https://aarruu.com'); });
  renderStatus();
})();
