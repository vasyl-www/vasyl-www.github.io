/* Нижнє меню: пункти висять у повітрі без панелі. Над натиснутим пунктом злітає скляна крапля, падає і вгинає «водну поверхню»
   (фізика пружин і профіль меніска з готового прототипу). Працює лише на вузькому екрані; на комп'ютері лишається бічна панель. */
(function () {
  var O = window.ORD, SVGNS = 'http://www.w3.org/2000/svg';
  var mq = window.matchMedia ? matchMedia('(max-width: 760px)') : { matches: true, addListener: function () {} };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAD_TOP = 64, PAD_BOTTOM = 18, SURF = 6;
  var PH = { launchVy: -385, gravity: 1460, launchPull: -175, impact: 310, dentK: 68, dentC: 8.2, recK: 9.2, recC: 4.15, spread: 1.25 };
  var IC = {
    translate: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
    home: '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5z"/><path d="M9.5 20.5v-5.2a2.5 2.5 0 0 1 5 0v5.2"/>',
    read: '<path d="M3 5.5C5.5 4.5 9 4.5 12 6.5c3-2 6.5-2 9-1v13c-2.5-1-6-1-9 1-3-2-6.5-2-9-1z"/><path d="M12 6.5v13"/>',
    learn: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    practice: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.6"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6"/>',
    profile: '<circle cx="12" cy="8.2" r="3.6"/><path d="M5.2 19.6c.8-3.4 3.4-5.4 6.8-5.4s6 2 6.8 5.4"/>',
    forum: '<path d="M4 5h16v11H9l-5 4z"/>', community: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18"/>', pins: '<path d="M12 21s6-5.4 6-10a6 6 0 0 0-12 0c0 4.6 6 10 6 10z"/><circle cx="12" cy="11" r="2"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + '</svg>'; }
  var nav, S = null, raf = 0, last = 0, T = 0, dot = { x: 0, v: 0, t: 0 };
  function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
  function spring(p, k, c, dt) { p.v += (p.t - p.x) * k * dt; p.v *= Math.exp(-c * dt); p.x += p.v * dt; if (Math.abs(p.t - p.x) < .001 && Math.abs(p.v) < .001) { p.x = p.t; p.v = 0; } }
  function themeIcon() { var b = document.getElementById('themeBtn'); if (!b) return; var w = b.querySelector('.nav-icon-wrap'); if (w) { var h = w.querySelector('.nic'); if (h) h.innerHTML = svg(isLight() ? 'moon' : 'sun'); } }
  function iconKey(b) { var v = b.getAttribute('data-v'); if (v && IC[v]) return v; if (b.id === 'themeBtn') return isLight() ? 'moon' : 'sun'; return null; }
  function decorate() {
    Array.prototype.forEach.call(nav.querySelectorAll(':scope > button'), function (b, i) {
      if (b._nfx) return; b._nfx = 1; var sp = b.querySelector(':scope > span'), sm = b.querySelector(':scope > small'), body = document.createElement('span'), au = document.createElement('span'), w = document.createElement('span'); body.className = 'nav-float-body'; au.className = 'nav-press-aura'; au.setAttribute('aria-hidden', 'true'); w.className = 'nav-icon-wrap';
      var k = iconKey(b); if (k) { var h = document.createElement('span'); h.className = 'nic'; h.innerHTML = svg(k); w.classList.add('has-svg'); w.appendChild(h); }
      if (sp) w.appendChild(sp); body.appendChild(au); body.appendChild(w); if (sm) body.appendChild(sm); b.appendChild(body);
      b.addEventListener('pointerdown', function () { var it = item(b); if (it) it.held = true; }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (e) { b.addEventListener(e, function () { var it = item(b); if (it) it.held = false; }); });
      b.addEventListener('click', function () { if (mq.matches && !reduce) press(b); });
    });
    if (!nav.querySelector(':scope > .nfx-svg')) {
      var sv = document.createElementNS(SVGNS, 'svg'); sv.setAttribute('class', 'nfx-svg'); sv.setAttribute('aria-hidden', 'true'); sv.innerHTML = '<defs class="nfx-defs"><filter id="nfxBlur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4.5"/></filter></defs><g class="nfx-g"></g>'; nav.insertBefore(sv, nav.firstChild);
      var dr = document.createElement('div'); dr.className = 'nfx-drops'; dr.setAttribute('aria-hidden', 'true'); nav.appendChild(dr);
      var dt = document.createElement('div'); dt.className = 'active-dot'; dt.setAttribute('aria-hidden', 'true'); nav.appendChild(dt);
    }
    S = { svg: nav.querySelector('.nfx-svg'), defs: nav.querySelector('.nfx-defs'), g: nav.querySelector('.nfx-g'), drops: nav.querySelector('.nfx-drops'), dot: nav.querySelector('.active-dot'), splashes: [], uid: 0, items: [] };
    S.btns = Array.prototype.slice.call(nav.querySelectorAll(':scope > button')); S.items = S.btns.map(function (b, i) { b._it = { b: b, body: b.querySelector('.nav-float-body'), aura: b.querySelector('.nav-press-aura'), phase: i * 1.28, held: false, press: { x: 0, v: 0, t: 0 }, hold: 0, lastF: '' }; return b._it; });
    measure(true); themeIcon();
  }
  function item(b) { return b._it; }
  function measure(snap) {
    if (!S) return; var r = nav.getBoundingClientRect(); S.w = Math.max(240, r.width); S.h = r.height; S.row = (S.btns[0] && S.btns[0].getBoundingClientRect().height) || 68; S.top = S.h - PAD_BOTTOM - S.row;
    S.svg.setAttribute('viewBox', '0 0 ' + S.w + ' ' + S.h); S.centers = S.btns.map(function (b) { var q = b.getBoundingClientRect(); return q.left - r.left + q.width / 2; });
    var on = nav.querySelector('button.on'), ix = S.btns.indexOf(on); S.active = ix; dot.t = ix >= 0 ? S.centers[ix] : S.w / 2; if (snap || !dot.x) { dot.x = dot.t; dot.v = 0; } S.dot.style.opacity = ix >= 0 ? 1 : 0;
    S.btns.forEach(function (b, i) { b.setAttribute('aria-current', i === ix ? 'page' : 'false'); });
  }
  function press(b) { var it = item(b); if (!it || !S) return; it.hold = .14; it.press.v = Math.max(it.press.v, 5.2); spawn(S.btns.indexOf(b)); start(); }
  function mk(tag, attrs) { var e = document.createElementNS(SVGNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function tone() { return isLight() ? '62,78,140' : '255,250,244'; }
  function spawn(idx) {
    var cx = S.centers[idx]; if (cx == null) return; var ys = S.top - SURF, uid = ++S.uid, id = function (n) { return 'nfx' + n + uid; }, c = tone(), lightK = isLight() ? 1.15 : 1;
    if (S.splashes.length >= 6) clean(S.splashes.shift());
    var drop = document.createElement('div'); drop.className = 'liquid-droplet'; drop.style.opacity = 0; S.drops.appendChild(drop);
    var sg = mk('linearGradient', { id: id('s'), gradientUnits: 'userSpaceOnUse' }); sg.innerHTML = '<stop offset="0" stop-color="rgb(' + c + ')" stop-opacity="0"/><stop offset=".22" stop-color="rgb(' + c + ')" stop-opacity="' + (.34 * lightK) + '"/><stop offset=".5" stop-color="rgb(' + c + ')" stop-opacity="' + Math.min(1, .92 * lightK) + '"/><stop offset=".78" stop-color="rgb(' + c + ')" stop-opacity="' + (.34 * lightK) + '"/><stop offset="1" stop-color="rgb(' + c + ')" stop-opacity="0"/>';
    var fg = mk('linearGradient', { id: id('f'), gradientUnits: 'userSpaceOnUse', x1: cx, y1: ys - 16, x2: cx, y2: ys + 56 }); fg.innerHTML = '<stop offset="0" stop-color="rgb(' + c + ')" stop-opacity=".30"/><stop offset=".45" stop-color="rgb(' + c + ')" stop-opacity=".11"/><stop offset="1" stop-color="rgb(' + c + ')" stop-opacity="0"/>';
    var mg = mk('linearGradient', { id: id('mg'), gradientUnits: 'userSpaceOnUse' }); mg.innerHTML = '<stop offset="0" stop-color="black"/><stop offset=".24" stop-color="white"/><stop offset=".76" stop-color="white"/><stop offset="1" stop-color="black"/>';
    var mk2 = mk('mask', { id: id('m') }), mr = mk('rect', { y: ys - 60, height: 160, fill: 'url(#' + id('mg') + ')' }); mk2.appendChild(mr);
    [sg, fg, mg, mk2].forEach(function (e) { S.defs.appendChild(e); });
    var grp = mk('g', { opacity: 0 }), body = mk('path', { fill: 'url(#' + id('f') + ')', mask: 'url(#' + id('m') + ')' }), glow = mk('ellipse', { cx: cx, cy: ys + 6, rx: 22, ry: 5, fill: 'rgba(' + c + ',.35)', filter: 'url(#nfxBlur)' }), rim = mk('path', { fill: 'none', stroke: 'url(#' + id('s') + ')', 'stroke-width': 1.85, 'stroke-linecap': 'round' });
    grp.appendChild(body); grp.appendChild(glow); grp.appendChild(rim); S.g.appendChild(grp);
    var narrow = S.w < 440; S.splashes.push({ cx: cx, idx: idx, age: 0, disp: 0, vel: PH.launchPull, sigma: narrow ? 24 : 30, tsig: narrow ? 44 : 54, dy: -2, dvy: PH.launchVy, hit: false, peak: false, ia: 0, drop: drop, rip: null, el: { grp: grp, body: body, glow: glow, rim: rim, sg: sg, fg: fg, mg: mg, mk: mk2, mr: mr } });
  }
  function clean(s) { if (s.drop) s.drop.remove(); if (s.rip) s.rip.remove(); var e = s.el; ['grp', 'sg', 'fg', 'mg', 'mk'].forEach(function (k) { e[k].remove(); }); }
  function surf(s) {
    var ys = S.top - SURF, half = s.sigma * 3.1, xl = s.cx - half, xr = s.cx + half, N = 36, sh = s.disp > 0 ? .36 : .16, pts = [], i;
    for (i = 0; i <= N; i++) { var x = xl + (xr - xl) * i / N, u = (x - s.cx) / s.sigma; pts.push([x, ys + s.disp * (1 - sh * u * u) * Math.exp(-.54 * u * u)]); }
    var rd = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1); for (i = 1; i < N; i++) rd += 'Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ',' + ((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1) + ' ' + ((pts[i][1] + pts[i + 1][1]) / 2).toFixed(1); rd += 'L' + pts[N][0].toFixed(1) + ' ' + pts[N][1].toFixed(1);
    var by = ys + 48, e = s.el; [e.sg, e.mg].forEach(function (g) { g.setAttribute('x1', xl); g.setAttribute('y1', ys); g.setAttribute('x2', xr); g.setAttribute('y2', ys); }); e.mr.setAttribute('x', xl); e.mr.setAttribute('width', xr - xl);
    e.rim.setAttribute('d', rd); e.body.setAttribute('d', rd + 'L' + xr.toFixed(1) + ' ' + by + 'L' + xl.toFixed(1) + ' ' + by + 'Z');
    e.glow.setAttribute('cy', ys + s.disp * .85 + 3); e.glow.setAttribute('rx', s.sigma * .62); e.glow.setAttribute('opacity', s.disp > 0 ? Math.min(.85, s.disp / 18) : 0); e.grp.setAttribute('opacity', Math.min(1, Math.pow(Math.abs(s.disp) / 9.5, .58)).toFixed(3));
  }
  function splashes(dt) {
    var ys = S.top - SURF;
    for (var i = S.splashes.length - 1; i >= 0; i--) {
      var s = S.splashes[i]; s.age += dt;
      if (!s.hit) { s.dvy += PH.gravity * dt; s.dy += s.dvy * dt; if (s.dvy > 0 && s.dy >= -2) { s.hit = true; s.ia = 0; s.vel += PH.impact; var it = S.items[s.idx]; if (it) it.press.v += 3.6; var r = document.createElement('div'); r.className = 'impact-ripple'; S.drops.appendChild(r); s.rip = r; } } else s.ia += dt;
      var k, c; if (!s.hit) { k = 130; c = 14; } else if (!s.peak && s.vel > 0) { k = PH.dentK; c = PH.dentC; } else { s.peak = true; k = PH.recK; c = PH.recC; s.sigma += (s.tsig - s.sigma) * PH.spread * dt; }
      s.vel += (-k * s.disp - c * s.vel) * dt; s.disp += s.vel * dt;
      if (s.drop) {
        var st;
        if (!s.hit) { var et = Math.min(1, s.age / .05), sk = Math.min(.25, Math.abs(s.dvy) / 1450); st = [s.cx, ys + s.dy, Math.min(1, s.age / .04), (.6 + .4 * et) * (1 - sk * .52), (.74 + .26 * et) * (1 + sk)]; }
        else { var mt = Math.min(1, s.ia / .095); st = [s.cx, ys + Math.max(0, s.disp * .48) + mt * 4, Math.max(0, 1 - mt * 1.15), 1 + mt * .9, Math.max(.2, 1 - mt * .76)]; if (s.ia > .11) { s.drop.remove(); s.drop = null; } }
        if (s.drop) { s.drop.style.left = st[0].toFixed(1) + 'px'; s.drop.style.top = st[1].toFixed(1) + 'px'; s.drop.style.opacity = st[2].toFixed(3); s.drop.style.transform = 'translate(-50%,-50%) scale(' + st[3].toFixed(3) + ',' + st[4].toFixed(3) + ')'; }
      }
      if (s.rip) { var rt = Math.min(1, s.ia / .44), eo = 1 - Math.pow(1 - rt, 3); s.rip.style.left = s.cx.toFixed(1) + 'px'; s.rip.style.top = (ys + Math.max(0, s.disp * .78)).toFixed(1) + 'px'; s.rip.style.opacity = Math.max(0, (1 - rt) * .85).toFixed(3); s.rip.style.transform = 'translate(-50%,-50%) scale(' + (.55 + eo * 2.35).toFixed(3) + ',' + (1 - eo * .45).toFixed(3) + ')'; if (s.ia > .46) { s.rip.remove(); s.rip = null; } }
      surf(s);
      if (s.hit && s.ia > .5 && Math.abs(s.disp) < .045 && Math.abs(s.vel) < .08) { clean(s); S.splashes.splice(i, 1); }
    }
  }
  function dentAt(i) { var cx = S.centers[i] || 0, t = 0; S.splashes.forEach(function (s) { var u = (cx - s.cx) / s.sigma; if (Math.abs(u) <= 3.5) t += s.disp * Math.exp(-.65 * u * u); }); return t; }
  function items(dt) {
    var busy = S.splashes.length > 0;
    S.items.forEach(function (it, i) {
      if (it.hold > 0) it.hold = Math.max(0, it.hold - dt); it.press.t = it.held || it.hold > 0 ? 1 : 0; spring(it.press, it.press.t > .5 ? 240 : 46, it.press.t > .5 ? 20 : 10.5, dt);
      var dent = busy ? dentAt(i) : 0, dpf = dent > 0 ? Math.min(.65, dent / 26) : 0, cp = Math.max(0, Math.min(1.25, it.press.x + dpf * .72)), fa = 1 - Math.min(1, cp) * .82;
      var fy = reduce ? 0 : Math.sin(T * 1.45 + it.phase) * 3.6 * fa, fs = reduce ? 1 : 1 + Math.sin(T * 1.45 + it.phase) * .014 * fa, sc = fs * (1 - cp * .135), py = cp * 6.5 + (dent > 0 ? dent * .36 : dent * .14);
      it.body.style.transform = 'translate3d(0,' + (fy + py).toFixed(2) + 'px,0) scale(' + sc.toFixed(3) + ')';
      var f = cp > .004 ? 'drop-shadow(0 ' + Math.max(1.5, 6 - cp * 4).toFixed(1) + 'px ' + Math.max(3, 8 - cp * 5).toFixed(1) + 'px rgba(8,10,20,' + Math.min(.5, .28 + cp * .16).toFixed(2) + ')) brightness(' + Math.max(.86, 1 - cp * .1).toFixed(3) + ')' : '';
      if (f !== it.lastF) { it.body.style.filter = f; it.lastF = f; }
      it.aura.style.opacity = Math.max(0, Math.min(1, cp * .5)).toFixed(3);
    });
    var ai = S.active, it2 = ai >= 0 ? S.items[ai] : null, fy2 = it2 && !reduce ? Math.sin(T * 1.45 + it2.phase) * 2.6 : 0;
    S.dot.style.left = dot.x.toFixed(1) + 'px'; S.dot.style.top = (S.top + S.row + 4 + fy2 + (ai >= 0 ? Math.max(0, dentAt(ai) * .25) : 0)).toFixed(1) + 'px';
  }
  function frame(now) {
    raf = 0; if (!S || !mq.matches || document.hidden) return; var dt = Math.min((now - last) / 1000, .035); last = now; T += dt; spring(dot, 220, 20, dt); splashes(dt); items(dt);
    if (!reduce || S.splashes.length || Math.abs(dot.t - dot.x) > .1) raf = requestAnimationFrame(frame); else items(0);
  }
  function start() { if (!raf && S && mq.matches) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; if (S) { S.splashes.forEach(clean); S.splashes = []; S.items.forEach(function (it) { it.body.style.transform = ''; it.body.style.filter = ''; it.aura.style.opacity = ''; it.lastF = ''; }); } }
  function sync() { if (!S) return; measure(false); start(); }
  function init() {
    nav = document.getElementById('nav'); if (!nav) return; decorate();
    new MutationObserver(function (m) { if (!nav.querySelector(':scope > .nfx-svg') || nav.querySelector(':scope > button:not(.x)') && Array.prototype.some.call(nav.querySelectorAll(':scope > button'), function (b) { return !b._nfx; })) { var old = S && S.splashes; if (old) old.forEach(clean); decorate(); } sync(); }).observe(nav, { childList: true, subtree: false });
    new MutationObserver(sync).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'], });
    new MutationObserver(function () { themeIcon(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.ResizeObserver) new ResizeObserver(function () { measure(false); }).observe(nav);
    var onq = function () { if (mq.matches) { measure(true); start(); } else stop(); }; if (mq.addEventListener) mq.addEventListener('change', onq); else mq.addListener(onq);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(true); });
    start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  O.navfx = { spawn: function (i) { if (S) { spawn(i); start(); } } };
})();
