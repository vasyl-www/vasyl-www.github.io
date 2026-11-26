/* Струшування телефона: кнопки «🌐 швидкий переклад» і «🤖 ШІ» не висять на екрані, а випадають, коли струсити телефон.
   Світяться 10–15 с і розчиняються, якщо їх не торкнулися. Працює лише коли датчик руху справді віддає дані
   (Android Chrome — одразу; iPhone/iPad — після дозволу). Інакше кнопки лишаються на екрані як раніше. */
(function () {
  var O = window.ORD, S = { sensor: false, perm: 'unknown', spikes: [], last: 0, icons: [], raf: 0, cool: 0, life: [10000, 15000] };
  var T = { 1: 17, 2: 13, 3: 10 }, FIRST = !!window.DeviceMotionEvent;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cfg() { var s = O.state.settings; return { mode: s.shake === 'off' ? 'off' : 'auto', sens: T[s.shakeSens] ? s.shakeSens : 2 }; }
  function fabs() { return { tr: document.querySelector('.qtfab'), ai: document.querySelector('.aifab:not(.qtfab)') }; }
  function apply() { document.body.classList.toggle('shake-on', cfg().mode === 'auto' && S.sensor); }
  function onMotion(e) {
    var g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
    if (!S.sensor) { S.sensor = true; apply(); }
    if (cfg().mode === 'off') return;
    var now = Date.now(), m = Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z), lin = Math.abs(m - 9.81);
    if (lin > T[cfg().sens] && now - S.last > 90) { S.last = now; S.spikes.push(now); }
    S.spikes = S.spikes.filter(function (t) { return now - t < 800; });
    if (S.spikes.length >= 4 && now > S.cool) { S.spikes = []; S.cool = now + 1500; drop(); }
  }
  function layer() { var l = document.querySelector('.shk-layer'); if (!l) { l = document.createElement('div'); l.className = 'shk-layer'; document.body.appendChild(l); } return l; }
  function clear() { S.icons.forEach(function (i) { i.el.remove(); clearTimeout(i.t1); clearTimeout(i.t2); }); S.icons = []; }
  function drop() {
    clear(); if (navigator.vibrate) { try { navigator.vibrate(35); } catch (e) {} }
    var l = layer(), W = innerWidth, nb = document.querySelector('#nav > button'), floor = (nb ? nb.getBoundingClientRect().top : innerHeight - 100) - 64, sz = 56;
    [['🌐', 'tr', 'Швидкий переклад', 'tr'], ['🤖', 'ai', 'Запитай ШІ', 'ai']].forEach(function (d, i) {
      var el = document.createElement('button'); el.className = 'shk ' + d[3]; el.textContent = d[0]; el.setAttribute('aria-label', d[2]); l.appendChild(el);
      var f = fabs()[d[1]], cs = f && getComputedStyle(f), w = (cs && parseFloat(cs.width)) || 52, bt = cs ? parseFloat(cs.bottom) : NaN, home = i ? W - 14 - w / 2 : 14 + w / 2, hy = isNaN(bt) ? floor : innerHeight - bt - w / 2;
      var x = home + (i ? -1 : 1) * (30 + Math.random() * W * .22), o = { el: el, kind: d[1], x: x, y: -70 - i * 50, vx: (i ? 1 : -1) * (80 + Math.random() * 120), vy: 0, floor: hy, home: home, touched: false };
      if (reduce) { o.y = o.floor; o.x = o.home; o.vy = 0; place(o); }
      el.addEventListener('pointerdown', function (ev) { ev.preventDefault(); use(o); });
      var life = S.life[0] + Math.random() * (S.life[1] - S.life[0]);
      o.t1 = setTimeout(function () { if (!o.touched) el.classList.add('out'); }, life); o.t2 = setTimeout(function () { if (!o.touched) kill(o); }, life + 1700);
      S.icons.push(o); place(o);
    });
    start();
  }
  function place(o) { o.el.style.transform = 'translate(' + (o.x - 28).toFixed(1) + 'px,' + (o.y - 28).toFixed(1) + 'px)'; }
  function kill(o) { clearTimeout(o.t1); clearTimeout(o.t2); o.el.remove(); S.icons = S.icons.filter(function (x) { return x !== o; }); }
  function use(o) {
    if (o.touched) return; o.touched = true; clearTimeout(o.t1); clearTimeout(o.t2); o.el.classList.remove('out'); o.el.classList.add('pop'); var f = fabs()[o.kind]; if (f) f.click();
    setTimeout(function () { kill(o); }, 320);
  }
  function frame(now) {
    S.raf = 0; var dt = Math.min((now - (S.t || now)) / 1000, .035); S.t = now; var moving = false;
    S.icons.forEach(function (o) {
      if (reduce) return; o.vy += 1900 * dt; o.y += o.vy * dt; o.x += o.vx * dt; if (o.x < 30) { o.x = 30; o.vx = Math.abs(o.vx) * .6; } if (o.x > innerWidth - 30) { o.x = innerWidth - 30; o.vx = -Math.abs(o.vx) * .6; }
      if (o.y >= o.floor) { o.y = o.floor; if (Math.abs(o.vy) > 120) { o.vy = -o.vy * .45; } else o.vy = 0; o.vx *= .86; o.x += (o.home - o.x) * Math.min(1, dt * 5); }
      if (o.y < o.floor - .5 || Math.abs(o.vy) > 1 || Math.abs(o.vx) > 2 || Math.abs(o.home - o.x) > .5) moving = true; place(o);
    });
    if (moving) S.raf = requestAnimationFrame(frame);
  }
  function start() { if (!S.raf) { S.t = 0; S.raf = requestAnimationFrame(frame); } }
  function needPerm() { return window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function'; }
  function ask() { if (!needPerm()) return Promise.resolve('granted'); return DeviceMotionEvent.requestPermission().then(function (r) { S.perm = r; return r; }, function () { S.perm = 'denied'; return 'denied'; }); }
  function status() { return !FIRST ? 'Датчик руху недоступний у цьому браузері, кнопки лишаються на екрані.' : S.sensor ? 'Датчик працює: струсни телефон, і 🌐 та 🤖 випадуть.' : needPerm() && S.perm !== 'granted' ? 'Потрібен дозвіл на рух (iPhone/iPad): обери «Струшування» ще раз і дозволь.' : 'Датчик ще не відповів (на комп’ютері його нема): кнопки лишаються на екрані.'; }
  function wrapSettings() {
  var rs = O.renderSettings; O.renderSettings = function (root) {
    rs && rs(root); var c = cfg(), d = O.el('div', 'form', '<h3>📳 Струшування</h3><label>Режим <select id="shm"><option value="auto">Струсити → випадають 🌐 і 🤖</option><option value="off">Кнопки завжди на екрані</option></select></label><label>Чутливість <select id="shs"><option value="1">Низька (сильна тряска)</option><option value="2">Середня</option><option value="3">Висока</option></select></label><div class="dim small" id="shst"></div><div class="row"><button class="btn" id="shgo">Спробувати</button></div>'); d.setAttribute('data-notr', ''); root.appendChild(d);
    var m = d.querySelector('#shm'), s = d.querySelector('#shs'), st = d.querySelector('#shst'); m.value = c.mode; s.value = String(c.sens); st.textContent = status();
    m.onchange = function () { O.state.settings.shake = m.value; O.save(); if (m.value === 'auto') ask().then(function () { listen(); setTimeout(function () { st.textContent = status(); apply(); }, 700); }); apply(); st.textContent = status(); };
    s.onchange = function () { O.state.settings.shakeSens = +s.value; O.save(); };
    d.querySelector('#shgo').onclick = function () { drop(); };
  };
  }

  var on = false; function listen() { if (on) return; on = true; window.addEventListener('devicemotion', onMotion); }
  function init() { wrapSettings(); apply(); if (FIRST) listen(); /* iOS без дозволу подій просто не шле; Android шле одразу */ }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  O.shake = { drop: drop, clear: clear, listen: listen, onMotion: onMotion, state: S, apply: apply };
})();
