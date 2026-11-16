/* Тренажер дієслів: інфінітив → претеритум → перфект (має/har + форма). Форми з js/data/verbs.js, власні підказки.
   Невдалі дієслова повертаються частіше; лічильники лежать у state.verbtr (n, bad) і не містять тексту відповідей. */
(function () {
  var O = window.ORD;
  var ALT = { stå: { past: ['stod'] }, lage: { past: ['lagte'] }, hete: { past: ['hette'] }, være: {}, spørre: {}, skjære: {}, tro: {}, snø: {}, dø: {} };
  var CLS = { si: 'Сильні й неправильні', w: 'Слабкі', all: 'Усі' };
  function pool(f) { return (O.verbs || []).filter(function (v) { return f === 'all' ? true : f === 'w' ? v.g === 'w' : v.g !== 'w'; }); }
  function stat() { return O.state.verbtr = O.state.verbtr || {}; }
  function weight(v) { var s = stat()[v.inf]; return !s ? 2 : 1 + 3 * ((s.bad || 0) / Math.max(1, s.n || 1)); }
  function drawN(arr, n) {
    var left = arr.slice(), out = [];
    while (out.length < n && left.length) {
      var tot = left.reduce(function (a, v) { return a + weight(v); }, 0), r = Math.random() * tot, i = 0;
      for (; i < left.length - 1; i++) { r -= weight(left[i]); if (r <= 0) break; }
      out.push(left.splice(i, 1)[0]);
    }
    return out;
  }
  function strip(s) { return O.norm(s).replace(/^(har|hadde|er|var)\s+/, ''); }
  function judge(guess, right, alts, tolerant) {
    var g = strip(guess), r = O.norm(right);
    if (g === r || (alts || []).some(function (a) { return g === O.norm(a); })) return 2;
    if (tolerant && O.fold(g) === O.fold(r)) return 1;
    return 0;
  }
  function table(box, f) {
    var all = pool(f);
    box.innerHTML = '<div class="row"><input id="vq" placeholder="Знайти дієслово…" autocomplete="off" autocapitalize="off"></div><div class="vtabw"><table class="vtab"><thead><tr><th>Інф.</th><th>Теперішній</th><th>Минулий</th><th>Перфект (har …)</th><th></th></tr></thead><tbody></tbody></table></div>';
    var tb = box.querySelector('tbody');
    function draw() {
      var q = O.norm(box.querySelector('#vq').value);
      tb.innerHTML = all.filter(function (v) { return !q || [v.inf, v.pres, v.past, v.perf, v.ua].join(' ').toLowerCase().indexOf(q) >= 0; }).map(function (v) {
        return '<tr><td><b class="no">' + O.esc(v.inf) + '</b><div class="dim small">' + O.esc(v.ua) + '</div></td><td class="no">' + O.esc(v.pres) + '</td><td class="no">' + O.esc(v.past) + '</td><td class="no">' + O.esc(v.perf) + '</td><td><button class="btn ghost" data-vs="' + O.esc(v.inf) + '" aria-label="Озвучити">🔊</button></td></tr>';
      }).join('') || '<tr><td colspan="5" class="dim">Нічого не знайдено</td></tr>';
      O.$$('[data-vs]', tb).forEach(function (b) { b.onclick = function () { O.speak(b.getAttribute('data-vs')); }; });
    }
    box.querySelector('#vq').oninput = draw; draw();
  }
  function run(box, f) {
    var qs = drawN(pool(f), 10), i = 0, good = 0, bad = [];
    function next() {
      if (i >= qs.length) {
        box.innerHTML = '<h3>Дієслова</h3><div class="stage center"><div class="big">' + good + ' / ' + qs.length + '</div><p class="dim">Невдалі повернуться частіше.</p></div>' +
          (bad.length ? '<div class="feedback bad"><b>Повтори:</b>' + bad.map(function (v) { return '<div class="no">' + O.esc(v.inf) + ' – ' + O.esc(v.pres) + ' – ' + O.esc(v.past) + ' – har ' + O.esc(v.perf) + '</div>'; }).join('') + '</div>' : '') +
          '<div class="row"><button class="btn" id="va">Ще 10</button><button class="btn ghost" id="vt">Таблиця</button></div>';
        box.querySelector('#va').onclick = function () { run(box, f); }; box.querySelector('#vt').onclick = function () { box.innerHTML = '<h3>Усі форми</h3>'; var t = O.el('div'); box.appendChild(t); table(t, f); };
        O.sfx('done'); return;
      }
      var v = qs[i], alt = ALT[v.inf] || {};
      box.innerHTML = '<h3>Дієслова <small class="dim">' + (i + 1) + ' / ' + qs.length + '</small></h3><div class="stage center"><div class="no big">å ' + O.esc(v.inf) + '</div><div class="dim">' + O.esc(v.ua) + ' · зараз: <span class="no">' + O.esc(v.pres) + '</span></div></div>' +
        '<form class="vin"><label>Минулий <input id="vp" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="i går jeg …"></label><label>Перфект <input id="vf" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="jeg har …"></label>' +
        '<div class="row"><button class="btn" type="submit">Перевірити</button><button class="btn ghost" type="button" id="vd">Не знаю</button></div></form><div id="vr"></div>';
      var p = box.querySelector('#vp'), pf = box.querySelector('#vf'), t0 = Date.now(); p.focus();
      p.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); pf.focus(); } };
      function done(rp, rf) {
        O.$$('input,button', box).forEach(function (x) { x.disabled = true; });
        var ok = rp > 0 && rf > 0, s = stat()[v.inf] = stat()[v.inf] || { n: 0, bad: 0 }; s.n++; if (!ok) s.bad++; if (ok) good++; else bad.push(v);
        if (O.practiceLog) O.practiceLog('verbs', ok ? 1 : 0); if (O.tele) O.tele.ev('verbs'); O.sfx(ok ? 'ok' : 'bad'); O.save();
        var m = function (r) { return r === 2 ? '✓' : r === 1 ? '≈ (æ/ø/å!)' : '✗'; };
        box.querySelector('#vr').innerHTML = '<div class="feedback ' + (ok ? 'good' : 'bad') + '"><div class="no big">' + O.esc(v.inf) + ' – ' + O.esc(v.pres) + ' – ' + O.esc(v.past) + ' – har ' + O.esc(v.perf) + '</div>' +
          '<div class="dim small">минулий ' + m(rp) + ' · перфект ' + m(rf) + ' · ' + Math.round((Date.now() - t0) / 1000) + ' с</div><div class="row"><button class="btn ghost" id="vs">🔊</button><button class="btn" id="vn">' + (i + 1 < qs.length ? 'Далі' : 'Підсумок') + '</button></div></div>';
        box.querySelector('#vs').onclick = function () { O.speak(v.inf + '. ' + v.past + '. ' + v.perf); };
        var nb = box.querySelector('#vn'); nb.disabled = false; nb.focus(); nb.onclick = function () { i++; next(); };
      }
      box.querySelector('form').onsubmit = function (e) { e.preventDefault(); if (!p.value.trim() && !pf.value.trim()) return; done(judge(p.value, v.past, alt.past, true), judge(pf.value, v.perf, alt.perf, true)); };
      box.querySelector('#vd').onclick = function () { done(0, 0); };
    }
    next();
  }
  O.renderVerbs = function (root) {
    var f = O.state.settings.vbCls || 'si';
    root.innerHTML = '<h2>Дієслова</h2><div id="vsp"></div><p class="dim small">Три форми: інфінітив → минулий (претеритум) → перфект. Сильні й неправильні дієслова треба знати напам’ять; у слабких форми будуються за зразком (-et, -te, -de). ' + (O.verbs || []).length + ' дієслів.</p>' +
      '<div class="chips" id="vcl">' + Object.keys(CLS).map(function (k) { return '<button class="chip' + (k === f ? ' on' : '') + '" data-c="' + k + '">' + CLS[k] + '</button>'; }).join('') + '</div>' +
      '<div class="row"><button class="btn big" id="vgo">▶ 10 дієслів</button><button class="btn ghost" id="vtb">Таблиця форм</button></div><div id="vbox" class="panel" hidden></div>';
    if (O.vsrs) O.vsrs.panel(root.querySelector('#vsp'));
    var box = root.querySelector('#vbox');
    O.$$('[data-c]', root).forEach(function (b) { b.onclick = function () { f = b.getAttribute('data-c'); O.state.settings.vbCls = f; O.save(); O.$$('[data-c]', root).forEach(function (x) { x.classList.toggle('on', x === b); }); box.hidden = true; }; });
    root.querySelector('#vgo').onclick = function () { box.hidden = false; run(box, f); box.scrollIntoView({ behavior: 'smooth' }); };
    root.querySelector('#vtb').onclick = function () { box.hidden = false; table(box, f); box.scrollIntoView({ behavior: 'smooth' }); };
  };
  O.verbtr = { judge: judge, pool: pool };
})();
